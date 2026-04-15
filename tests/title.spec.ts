import { test, expect } from "@playwright/test";

test("Attendance App title", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await expect(page).toHaveTitle("IDS Attendance Tracker");
});
