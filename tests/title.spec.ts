import { test, expect } from "@playwright/test";
import { BASE_URL } from "../constants";

test("Attendance App title", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle("IDS Attendance Tracker");
});
