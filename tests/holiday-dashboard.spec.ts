import { test, expect, Page } from "@playwright/test";
import { BASE_URL } from "../constants";
import creds from "../credentials.json";

async function loginAsEmployee(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("textbox", { name: "Email" }).fill(creds.employee.email);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(creds.employee.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/calendar/, { timeout: 5000 });
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;

  const [dayText, monthText, yearText] = parts;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (!day || !month || !year) return null;

  return new Date(year, month - 1, day);
}

test("Holiday popup shows current-year holidays", async ({ page }) => {
  await loginAsEmployee(page);

  const holidaysButton = page.getByRole("button", { name: "Holidays" });
  await expect(holidaysButton).toBeVisible();

  await holidaysButton.click();

  const currentYear = new Date().getFullYear();
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`Company Holidays ${currentYear}`),
    })
  ).toBeVisible();

  const table = page.locator("table");
  const emptyState = page.getByText(
    `No holidays found for ${currentYear}.`,
  );

  await Promise.race([
    table.waitFor({ state: "visible", timeout: 5000 }),
    emptyState.waitFor({ state: "visible", timeout: 5000 }),
  ]);

  if (await emptyState.isVisible()) {
    return;
  }

  await expect(table.getByRole("columnheader", { name: "Date" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Name" })).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Description" })
  ).toBeVisible();

  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);

  for (let i = 0; i < rowCount; i += 1) {
    const dateCell = rows.nth(i).locator("td").first();
    const dateText = await dateCell.innerText();
    const parsed = parseDate(dateText);
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(currentYear);
  }

  const fadedRows = table.locator("tbody tr.text-gray-500\\/70");
  const fadedCount = await fadedRows.count();
  expect(fadedCount).toBeGreaterThan(0);
});
