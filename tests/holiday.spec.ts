import { expect, Page, test } from "@playwright/test";
import { BASE_URL, isQaEnv } from "../constants";
import { qa, local } from "../credentials.json";

const creds = isQaEnv() ? qa : local;

test.describe.configure({ mode: "serial" });
test.setTimeout(30000);

async function loginAsAdmin(page: Page) {
  await page.goto(new URL("login", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await page.locator('[data-playwright-selector="signin-email-input"]').fill(creds.admin.email);
  await page
    .locator('[data-playwright-selector="signin-password-input"]')
    .fill(creds.admin.password);
  await page.locator('[data-playwright-selector="signin-submit"]').click();
  await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
}

async function openAdminSettings(page: Page) {
  await page.goto(new URL("settings", BASE_URL).toString());
  await expect(page.getByRole("heading", { name: "Company Holidays" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Allowed Registration Domains" })).toBeVisible();
}

function uniqueToken() {
  return (
    Math.random()
      .toString(36)
      .slice(2)
      .replace(/[^a-z]/g, "")
      .slice(0, 6) || "alpha"
  );
}

test.describe("Company Holidays CRUD", () => {
  test("creates, updates, and deletes a company holiday", async ({ page }) => {
    const token = uniqueToken();
    const holidayName = `Playwright Holiday ${token}`;
    const updatedHolidayName = `Playwright Revised ${token}`;
    const initialDescription = `Created by Playwright ${token}`;
    const updatedDescription = `Updated by Playwright ${token}`;

    await loginAsAdmin(page);
    await openAdminSettings(page);

    await page.locator('[data-playwright-selector="holiday-add-button"]').click();

    await page.locator('[data-playwright-selector="holiday-name-input"]').fill(holidayName);
    await page.locator('[data-playwright-selector="holiday-date-input"]').fill("20062026");
    await page
      .locator('[data-playwright-selector="holiday-description-input"]')
      .fill(initialDescription);
    await page.locator('[data-playwright-selector="holiday-dialog-save"]').click();

    const createdHolidayCard = page
      .locator('[data-playwright-selector^="holiday-card-"]')
      .filter({ hasText: holidayName });

    await expect(createdHolidayCard.getByText(holidayName, { exact: true })).toBeVisible();
    await expect(createdHolidayCard.getByText(initialDescription, { exact: true })).toBeVisible();

    await createdHolidayCard.locator('[data-playwright-selector^="holiday-edit-"]').click();
    await expect(page.getByRole("heading", { name: "Update" })).toBeVisible();
    await page.locator('[data-playwright-selector="holiday-name-input"]').fill(updatedHolidayName);
    await page.locator('[data-playwright-selector="holiday-date-input"]').fill("21062026");
    await page
      .locator('[data-playwright-selector="holiday-description-input"]')
      .fill(updatedDescription);
    await page.locator('[data-playwright-selector="holiday-dialog-save"]').click();

    await expect(page.getByText(updatedHolidayName, { exact: true })).toBeVisible();
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible();
    await expect(page.getByText(holidayName, { exact: true })).toHaveCount(0);

    const updatedHolidayCard = page
      .locator('[data-playwright-selector^="holiday-card-"]')
      .filter({ hasText: updatedHolidayName });
    await updatedHolidayCard
      .locator('[data-playwright-selector^="holiday-delete-"]')
      .click();

    await expect(page.getByText(updatedHolidayName, { exact: true })).toHaveCount(0);
  });
});