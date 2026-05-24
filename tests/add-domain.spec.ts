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

test.describe("Allowed Registration Domains CRUD", () => {
  test("creates, updates, and deletes an allowed registration domain", async ({ page }) => {
    const token = uniqueToken();
    const initialDomain = `playwright-${token}.example.com`;
    const updatedDomain = `playwright-${token}.example.net`;

    await loginAsAdmin(page);
    await openAdminSettings(page);

    await page.locator('[data-playwright-selector="domain-add-button"]').click();
    await page.locator('[data-playwright-selector="domain-input"]').fill(initialDomain);
    await page.locator('[data-playwright-selector="domain-save"]').click();

    const createdDomainCard = page
      .locator('[data-playwright-selector^="domain-card-"]')
      .filter({ hasText: initialDomain });

    await expect(createdDomainCard.getByText(initialDomain, { exact: true })).toBeVisible();

    await createdDomainCard.locator('[data-playwright-selector^="domain-edit-"]').click();
    await expect(page.getByRole("heading", { name: "Update Allowed Domain" })).toBeVisible();
    await page.locator('[data-playwright-selector="domain-input"]').fill(updatedDomain);
    await page.locator('[data-playwright-selector="domain-save"]').click();

    await expect(page.getByText(updatedDomain, { exact: true })).toBeVisible();
    await expect(page.getByText(initialDomain, { exact: true })).toHaveCount(0);

    const updatedDomainCard = page
      .locator('[data-playwright-selector^="domain-card-"]')
      .filter({ hasText: updatedDomain });

    await updatedDomainCard.locator('[data-playwright-selector^="domain-delete-"]').click();

    await expect(page.getByText(updatedDomain, { exact: true })).toHaveCount(0);
    await expect(page.getByText("gmail.com", { exact: true })).toBeVisible();
  });
});
