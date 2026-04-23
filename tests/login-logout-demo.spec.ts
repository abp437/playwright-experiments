import { test, expect, Page } from "@playwright/test";
import { BASE_URL } from "../constants";

// Helper function for filling out the login form
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#emailAddress").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
}

// Helper function to verify that a user is logged out
async function logout(page: Page) {
  await page.locator("button#radix-_r_4_").click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(`${BASE_URL}/login`);
}

// Test for non-existent user login
test("Non-existent user login", async ({ page }) => {
  await login(page, "dafsdf@gmail.com", "sdfdsafjhjv!Sd!1!");
  await expect(page.getByText("Email or password not recognized.")).toBeVisible();
});

// Test for invalid credentials login
test("Invalid credentials login", async ({ page }) => {
  await login(page, "jambhaleprajkta@gmail.com", "SecurePass!1!");
  await expect(
    page.getByText(
      "An unexpected problem on our end prevented you from logging in. Please refresh the page and try again.",
    ),
  ).toBeVisible();
});

// Test for Super Admin login
test("Super admin login", async ({ page }) => {
  await login(page, "akshaypawar@doodle-blue.com", "SecurePass!1!");
  await expect(page).toHaveURL(`${BASE_URL}/analytics`, { timeout: 30000 });
  await expect(page.getByText("Product Metrics")).toBeVisible();
  await logout(page); // Use the helper function for logging out
});

// Test for Admin login
test("Admin login", async ({ page }) => {
  await login(page, "abp9834@gmail.com", "SecurePass!1!");
  await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 30000 });
  await expect(page.getByText("Today's Sites")).toBeVisible();
  await logout(page);
});

// Test for Support professional login
test("Support professional login", async ({ page }) => {
  await login(page, "jambhaleprajkta@gmail.com", "SecurePass!1!");
  await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 30000 });
  await expect(page.getByText("Today's Sites")).toBeVisible();
  await logout(page);
});
