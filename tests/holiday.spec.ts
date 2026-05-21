import { expect, Page, test } from "@playwright/test";
import { BASE_URL } from "../constants";
import creds from "../credentials.json";

test.describe.configure({ mode: "serial" });
test.setTimeout(30000);

async function loginAsAdmin(page: Page) {
  await page.goto(new URL("login", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await page.getByLabel("Email *").fill(creds.admin.email);
  await page.getByLabel("Password *").fill(creds.admin.password);
  await page.getByRole("button", { name: "Login" }).click();
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

    await page.getByRole("button").nth(3).click();

    await page.getByPlaceholder("Enter holiday name").fill(holidayName);
    await page.getByPlaceholder("DD/MM/YYYY").fill("20062026");
    await page.getByPlaceholder("Optional description").fill(initialDescription);
    await page.getByRole("button", { name: "Save" }).click();

    const createdHolidayCard = page
      .locator("div.border.rounded-lg.p-4.shadow-sm.relative.flex.flex-col.justify-between")
      .filter({ hasText: holidayName });

    await expect(createdHolidayCard.getByText(holidayName, { exact: true })).toBeVisible();
    await expect(createdHolidayCard.getByText(initialDescription, { exact: true })).toBeVisible();

    await createdHolidayCard.locator("svg.lucide-pencil").click();
    await expect(page.getByRole("heading", { name: "Update" })).toBeVisible();
    await page.getByPlaceholder("Enter holiday name").fill(updatedHolidayName);
    await page.getByPlaceholder("DD/MM/YYYY").fill("21062026");
    await page.getByPlaceholder("Optional description").fill(updatedDescription);
    await page.getByRole("button", { name: "Update" }).click();

    await expect(page.getByText(updatedHolidayName, { exact: true })).toBeVisible();
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible();
    await expect(page.getByText(holidayName, { exact: true })).toHaveCount(0);

    const updatedHolidayCard = page
      .locator("div.border.rounded-lg.p-4.shadow-sm.relative.flex.flex-col.justify-between")
      .filter({ hasText: updatedHolidayName });
    await updatedHolidayCard.locator("svg.lucide-trash-2").click();

    await expect(page.getByText(updatedHolidayName, { exact: true })).toHaveCount(0);
  });
});

test.describe("Allowed Registration Domains CRUD", () => {
  test("creates, updates, and deletes an allowed registration domain", async ({ page }) => {
    const token = uniqueToken();
    const initialDomain = `playwright-${token}.example.com`;
    const updatedDomain = `playwright-${token}.example.net`;

    await loginAsAdmin(page);
    await openAdminSettings(page);

    await page.getByRole("button").nth(4).click();
    await page.getByPlaceholder("example.com").fill(initialDomain);
    await page.getByRole("button", { name: "Save" }).click();

    const createdDomainCard = page
      .locator("div.border.rounded-lg.p-4.shadow-sm.relative.flex.flex-col.justify-between")
      .filter({ hasText: initialDomain });

    await expect(createdDomainCard.getByText(initialDomain, { exact: true })).toBeVisible();

    await createdDomainCard.locator("svg.lucide-pencil").click();
    await expect(page.getByRole("heading", { name: "Update Allowed Domain" })).toBeVisible();
    await page.getByPlaceholder("example.com").fill(updatedDomain);
    await page.getByRole("button", { name: "Update" }).click();

    await expect(page.getByText(updatedDomain, { exact: true })).toBeVisible();
    await expect(page.getByText(initialDomain, { exact: true })).toHaveCount(0);

    const updatedDomainCard = page
      .locator("div.border.rounded-lg.p-4.shadow-sm.relative.flex.flex-col.justify-between")
      .filter({ hasText: updatedDomain });

    await updatedDomainCard.locator("svg.lucide-trash-2").click();

    await expect(page.getByText(updatedDomain, { exact: true })).toHaveCount(0);
    await expect(page.getByText("gmail.com", { exact: true })).toBeVisible();
  });
});
