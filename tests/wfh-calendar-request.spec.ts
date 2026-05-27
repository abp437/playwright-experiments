import { expect, Page, test } from "@playwright/test";
import { BASE_URL } from "../constants";

test.describe.configure({ mode: "serial" });
test.setTimeout(30 * 1000);
const TEST_BASE_URL = BASE_URL.replace("localhost", "127.0.0.1");

const employeeUser = {
  userId: 126,
  firstName: "Test",
  lastName: "Employee",
  email: "employee@example.com",
  employeeCode: "0126",
  role: "EMPLOYEE",
  gender: "MALE",
  managerName: "Test Manager",
};

async function seedAuthenticatedEmployee(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem("token", "playwright-token");
    window.localStorage.setItem(
      "auth-store",
      JSON.stringify({
        state: { user, isWorking: false },
        version: 0,
      }),
    );
  }, employeeUser);
}

async function mockCalendarApis(page: Page) {
  let submittedWfhPayload: unknown = null;

  await page.route("**/attendance/monthly-attendance**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        result: {
          days: [],
          teamWeekends: [
            { day: "SATURDAY", endDate: null },
            { day: "SUNDAY", endDate: null },
          ],
          holidays: [{ date: "2026-05-27T00:00:00.000Z", name: "Mock Holiday" }],
          overtimeRequests: [],
        },
      }),
    });
  });

  await page.route("**/users/holidays**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{ id: 1, date: "2026-05-27T00:00:00.000Z", name: "Mock Holiday" }],
      }),
    });
  });

  await page.route("**/users/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: employeeUser.userId,
          email: employeeUser.email,
          employeeCode: employeeUser.employeeCode,
          role: employeeUser.role,
          isActive: true,
          managerName: employeeUser.managerName,
          userInfo: {
            firstName: employeeUser.firstName,
            lastName: employeeUser.lastName,
            gender: employeeUser.gender,
          },
        },
      }),
    });
  });

  await page.route("**/leave-requests/my-weekends**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ weekends: ["SATURDAY", "SUNDAY"] }),
    });
  });

  await page.route("**/work-mode-settings**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          wfhFeatureEnabled: true,
          officeDays: ["MONDAY", "WEDNESDAY", "THURSDAY"],
          defaultWfhDays: ["TUESDAY", "FRIDAY"],
        },
      }),
    });
  });

  await page.route("**/leave-requests?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route("**/overtime-requests**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route("**/wfh-requests**", async (route) => {
    if (route.request().method() === "POST") {
      submittedWfhPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 99,
            status: "PENDING",
            reason: "WFH from test",
            startDate: "2026-05-28T00:00:00.000Z",
            endDate: "2026-05-28T00:00:00.000Z",
            createdAt: "2026-05-26T00:00:00.000Z",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: 10,
            status: "PENDING",
            reason: "WFH policy test",
            startDate: "2026-05-28T00:00:00.000Z",
            endDate: "2026-05-28T00:00:00.000Z",
            createdAt: "2026-05-21T00:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.route("**/leave-balances/current**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { month: 5, year: 2026, finalBalance: 3.5 } }),
    });
  });

  await page.route("**/leave-balances**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          initialBalance: 3.5,
          earnedBalance: 1.75,
          used: 0,
          finalBalance: 3.5,
        },
      }),
    });
  });

  return {
    getSubmittedWfhPayload: () => submittedWfhPayload,
  };
}

async function openCalendarWithMocks(page: Page) {
  await seedAuthenticatedEmployee(page);
  const api = await mockCalendarApis(page);
  await page.goto(`${TEST_BASE_URL}/calendar`);
  await expect(page.getByRole("heading", { name: "Requests" })).toBeVisible({
    timeout: 20000,
  });
  return api;
}

test("WFH request appears in Calendar request controls and list", async ({ page }) => {
  await openCalendarWithMocks(page);

  await page.getByRole("button", { name: "Filter requests" }).click();
  await expect(page.getByText("WFH Requests")).toBeVisible();
  await page.getByText("WFH Requests").click();

  await expect(page.getByText("WFH policy test")).toBeVisible();
  await expect(page.getByText("WFH").first()).toBeVisible();

  await page.getByRole("button", { name: "Apply request" }).click();
  await expect(page.getByRole("menuitem", { name: "Apply for WFH" })).toBeVisible();
});

test("WFH dialog matches compact popup layout and submits eligible office day", async ({
  page,
}) => {
  const api = await openCalendarWithMocks(page);

  await page.getByRole("button", { name: "Apply request" }).click();
  await page.getByRole("menuitem", { name: "Apply for WFH" }).click();

  const dialog = page.locator('[data-test-selector="apply-wfh-dialog"]');
  const policy = page.locator('[data-test-selector="wfh-policy-summary"]');
  const calendar = dialog.locator('[data-slot="calendar"]');

  await expect(dialog).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apply for Work From Home" })).toBeVisible();
  await expect(policy).toContainText("Enabled");
  await expect(policy).toContainText("Mon, Wed, Thu");
  await expect(policy).toContainText("Tue, Fri");
  await expect(dialog.getByText("June 2026")).toBeVisible();

  const calendarBox = await calendar.boundingBox();
  const policyBox = await policy.boundingBox();
  expect(calendarBox).not.toBeNull();
  expect(policyBox).not.toBeNull();
  expect(calendarBox!.x + calendarBox!.width).toBeLessThanOrEqual(policyBox!.x + 1);

  await expect(dialog.getByRole("button", { name: "26" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "27" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "29" })).toBeDisabled();

  await dialog.getByRole("button", { name: "28" }).click();
  await dialog
    .getByPlaceholder("Why are you requesting work from home?")
    .fill("WFH from test");
  await dialog.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("WFH request submitted")).toBeVisible();
  expect(api.getSubmittedWfhPayload()).toEqual({
    startDate: "2026-05-28",
    endDate: "2026-05-28",
    reason: "WFH from test",
  });
});
