import { test, expect, Page } from "@playwright/test";
import { BASE_URL } from "../constants";

// Helper function for filling out the login form
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

// Helper function to verify that a user is logged out
async function logout(page: Page) {
  await page.locator('[data-test-selector="user-navbar-popover"]').click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(`${BASE_URL}/congrats`);
}

test("Non-existent user login", async ({ page }) => {
  await login(page, "dafsdf@gmail.com", "sdfdsafjhjv!Sd!1!");
  await expect(page.getByText("Login failed")).toBeVisible();
});

test("Invalid credentials login", async ({ page }) => {
  await login(page, "abp437@gmail.com", "SecurePass!1!");
  await expect(page.getByText("Login failed")).toBeVisible();
});

test("Admin login", async ({ page }) => {
  await login(page, "abp437@gmail.com", "SecurePass!333!");
  await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 3000 });
  await expect(page.getByText("Today's All Teams Summary")).toBeVisible();
  await logout(page);
});

test("Manager login", async ({ page }) => {
  await login(page, "akashshelar@gmail.com", "SecurePass!333!");
  await expect(page).toHaveURL(`${BASE_URL}/my-team`, { timeout: 3000 });
  await expect(page.getByText("Today's Team Summary")).toBeVisible();
  await logout(page);
});

test("Employee login", async ({ page }) => {
  await login(page, "drprajktajambhale99@gmail.com", "Emp@333!");
  await expect(page).toHaveURL(`${BASE_URL}/calendar`, { timeout: 3000 });
  await expect(page.getByText("Current Leave Stats")).toBeVisible();
  await logout(page);
});
