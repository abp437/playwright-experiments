import { test, expect } from "@playwright/test";
import { BASE_URL } from "../constants";

test("Attendance App title", async ({ page }) => {
  await page.goto(BASE_URL);

  // Check page title
  await expect(page).toHaveTitle("IDS Attendance Tracker");

  // Fill email
  await page.getByRole("textbox", { name: "Email" }).fill("abp437@gmail.com");

  // Fill password
  await page.getByRole("textbox", { name: "Password" }).fill("SecurePass!333!");

  // Click login
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for navigation to /dashboard
  await page.waitForURL("**/dashboard"); // matches any protocol + host with /dashboard

  // Optionally, assert URL is correct
  await expect(page).toHaveURL(/.*\/dashboard/);

  await page.pause();
});
