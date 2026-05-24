import { expect, Page, test } from "@playwright/test";
import { BASE_URL, isQaEnv } from "../constants";
import { qa, local } from "../credentials.json";

const creds = isQaEnv() ? qa : local;

test.describe.configure({ mode: "serial" });
test.setTimeout(30000);

const ipAddressPlaceholder = "IPv4: 192.168.0.1 | IPv6: 2001:db8::1";

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
  await expect(page.getByRole("heading", { name: "Allowed IP Addresses" })).toBeVisible();
}

async function openIpDialog(page: Page) {
  await page.locator('[data-playwright-selector="ip-add-button"]').click();
  await expect(page.getByRole("heading", { name: "Add Allowed IP address" })).toBeVisible();
}

async function ensureIpAddress(page: Page, ip: string) {
  if ((await page.getByText(ip, { exact: true }).count()) > 0) {
    return;
  }

  await openIpDialog(page);
  await page.locator('[data-playwright-selector="ip-input"]').fill(ip);
  await page.locator('[data-playwright-selector="ip-save"]').click();
  await expect(page.getByText(ip, { exact: true })).toBeVisible();
}

async function deleteIpAddress(page: Page, ip: string) {
  const ipCard = page
    .locator('[data-playwright-selector^="ip-card-"]')
    .filter({ hasText: ip })
    .first();

  await expect(ipCard).toBeVisible();
  await ipCard.locator('[data-playwright-selector^="ip-delete-"]').click();
  await expect(page.getByText(ip, { exact: true })).toHaveCount(0);
}

test.describe("Allowed IP Addresses", () => {
  test("validates IPv4 and IPv6 values", async ({ page }) => {
    test.setTimeout(60000);

    const validIps = [
      "192.168.0.1",
      "255.255.255.255",
      "0.0.0.0",
      "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      "2001:db8::8a2e:370:7334",
      "::ffff:192.168.0.1",
    ];

    const invalidIps = [
      "192.168.01.1",
      "256.100.50.25",
      "192.168.1",
      "192.168.1.1.1",
      "abc.def.1.1",
      "2001:db8:::8a2e:370:7334",
      "2001:db8::8a2e:370:99999",
    ];

    await loginAsAdmin(page);
    await openAdminSettings(page);

    for (const ip of validIps) {
      await ensureIpAddress(page, ip);
    }

    for (const ip of invalidIps) {
      await openIpDialog(page);
      await page.locator('[data-playwright-selector="ip-input"]').fill(ip);
      await page.locator('[data-playwright-selector="ip-save"]').click();
      await expect(page.getByRole("heading", { name: "Add Allowed IP address" })).toBeVisible();
      await expect(page.getByText(ip, { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Cancel" }).click();
    }

    for (const ip of validIps) {
      await deleteIpAddress(page, ip);
    }
  });
});
