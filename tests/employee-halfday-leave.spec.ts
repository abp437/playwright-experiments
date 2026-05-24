import { test, expect, Locator, Page } from '@playwright/test';
import { BASE_URL, isQaEnv } from "../constants";
import { qa, local } from "../credentials.json";

const creds = isQaEnv() ? qa : local;

const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const getOrdinalSuffix = (value: number) => {
    const mod10 = value % 10;
    const mod100 = value % 100;

    if (mod10 === 1 && mod100 !== 11) return "st";
    if (mod10 === 2 && mod100 !== 12) return "nd";
    if (mod10 === 3 && mod100 !== 13) return "rd";
    return "th";
};

const buildCalendarLabelRegex = (date: Date) => {
    const dayName = DAY_NAMES[date.getDay()];
    const monthName = MONTH_NAMES[date.getMonth()];
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);

    return new RegExp(`${dayName}, ${monthName} ${day}${suffix},`);
};

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getNextWeekdays = (count: number) => {
    const result: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    const nextMonthStart = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    const nextMonth = nextMonthStart.getMonth();

    let offset = 0;
    while (result.length < count && offset < 40) {
        const candidate = new Date(nextMonthStart);
        candidate.setDate(nextMonthStart.getDate() + offset);
        if (candidate.getMonth() !== nextMonth) {
            break;
        }
        const day = candidate.getDay();
        if (day !== 0 && day !== 6) {
            result.push(candidate);
        }
        offset += 1;
    }

    return result;
};

const getLeaveDateLabels = (startIndex = 0) => {
    const dates = getNextWeekdays(startIndex + 2);
    const startDate = dates[startIndex];
    const endDate = dates[startIndex + 1];

    if (!startDate || !endDate) {
        throw new Error("Unable to find enough weekdays in the next month.");
    }

    return {
        startLabel: buildCalendarLabelRegex(startDate),
        endLabel: buildCalendarLabelRegex(endDate),
        startMonthName: MONTH_NAMES[startDate.getMonth()],
        endMonthName: MONTH_NAMES[endDate.getMonth()],
    };
};

type LoginOptions = { email: string; password: string; landingPath: string };

async function login(page: Page, { email, password, landingPath }: LoginOptions) {
    await page.goto(new URL("login", BASE_URL).toString(), {
        waitUntil: "domcontentloaded",
    });
    await page.locator('[data-playwright-selector="signin-email-input"]').fill(email);
    await page
        .locator('[data-playwright-selector="signin-password-input"]')
        .fill(password);
    await page.locator('[data-playwright-selector="signin-submit"]').click();
    await expect(page).toHaveURL(new RegExp(`${landingPath}$`), { timeout: 10000 });
}

async function logout(page: Page) {
    await page.locator('[data-playwright-selector="user-navbar-popover"]').click();
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL(new RegExp("/congrats$"));
}

test('Employee can submit a leave request for half day leave', async ({ page }) => {
    test.setTimeout(30_000);
    const reason = `HalfDay-${Date.now()}`;
    const dates = getNextWeekdays(2);
    const startDate = dates[0];
    const endDate = dates[1];

    if (!startDate || !endDate) {
        throw new Error("Unable to find weekdays for half-day leave test.");
    }

    const startLabel = buildCalendarLabelRegex(startDate);
    const endLabel = buildCalendarLabelRegex(endDate);
    const startMonthName = MONTH_NAMES[startDate.getMonth()];
    const endMonthName = MONTH_NAMES[endDate.getMonth()];
    const dateKey = formatDateKey(startDate);

    await login(page, {
        email: creds.employee.email,
        password: creds.employee.password,
        landingPath: "/calendar",
    });

    await expect(page.getByRole('heading', { name: 'Requests' })).toBeVisible();
    await page.locator('[data-playwright-selector="requests-apply-trigger"]').click();
    await page.locator('[data-playwright-selector="requests-apply-leave"]').click();
    await expect(page.getByRole('heading', { name: 'Apply for Leave' })).toBeVisible();

    const calendar = page.locator('[data-playwright-selector="apply-leave-calendar"]');
    await calendar
        .getByRole('grid', { name: startMonthName })
        .getByRole('button', { name: startLabel })
        .click();
    await calendar
        .getByRole('grid', { name: endMonthName })
        .getByRole('button', { name: endLabel })
        .click();

    // wait for the days list to render and show the half-day controls
    const dayEntry = page.locator(`[data-playwright-selector="apply-leave-day-${dateKey}"]`);
    await expect(dayEntry).toBeVisible({ timeout: 20000 });

    const halfdayCheckbox = dayEntry.locator(`[data-playwright-selector="apply-leave-halfday-${dateKey}"]`);
    await expect(halfdayCheckbox).toBeVisible({ timeout: 10000 });
    await halfdayCheckbox.click();

    const halfdayTrigger = dayEntry.locator(`[data-playwright-selector="apply-leave-halfday-trigger-${dateKey}"]`);
    await expect(halfdayTrigger).toBeVisible({ timeout: 10000 });
    await halfdayTrigger.click();

    // select the first half option - fall back to text locator if role lookup fails
    const firstHalfOption = page.getByRole('option', { name: 'First half' });
    if (await firstHalfOption.count()) {
        await firstHalfOption.click();
    } else {
        await page.locator('text=First half').first().click();
    }

    await page.locator('[data-playwright-selector="apply-leave-reason-input"]').fill(reason);
    await page.locator('[data-playwright-selector="apply-leave-submit"]').click();
    await expect(page.getByText('Leave request submitted')).toBeVisible();
    await logout(page);
});