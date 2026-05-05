import { test, expect, Page } from "@playwright/test";
import { BASE_URL } from "../constants";

// Helper function for common flow
async function forgotPasswordFlow(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("link", { name: "Forgot Password?" }).click();

  // Wait for the URL to navigate to /forgot-password
  await page.waitForURL(`${BASE_URL}/forgot-password`);
  await expect(page).toHaveURL(`${BASE_URL}/forgot-password`);

  // Verify the page loaded correctly
  await expect(page.getByText(/Forgot Password/i)).toBeVisible();

  // Fill in the email field
  await page.getByRole("textbox", { name: "Enter your registered email" }).fill(email);

  // Click the "Send Reset Email" button
  await page.getByRole("button", { name: "Send Reset Email" }).click();
}

test("Forgot Password - Correct Email", async ({ page }) => {
  // Using the helper with the correct email
  await forgotPasswordFlow(page, "abp437@gmail.com");

  // Assert success message (assuming success message is shown for a valid email)
  await expect(page.getByText(/If an active account exists for that email, a reset link has been sent./)).toBeVisible();
});

test("Forgot Password - Incorrect Email", async ({ page }) => {
  // Using the helper with the incorrect email
  await forgotPasswordFlow(page, "adskjvfds@asdifyf.com");

  // Assert error or validation message
  await expect(page.getByText(/If an active account exists for that email, a reset link has been sent./)).toBeVisible();
});
