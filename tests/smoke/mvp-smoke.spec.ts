import { expect, test } from '@playwright/test';

async function openMvp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.locator('body')).toBeVisible();
}

async function startDefaultCheck(page: import('@playwright/test').Page) {
  await openMvp(page);
  await page.locator('.type-card button.primary').first().click();
  await expect(page.getByRole('button', { name: '검진 운영', exact: true })).toBeVisible();
}

test('loads the first screen', async ({ page }) => {
  await openMvp(page);
  await expect(page.locator('.type-select-screen')).toBeVisible();
  await expect(page.locator('.type-card')).not.toHaveCount(0);
});

test('shows core MVP navigation after selecting a check type', async ({ page }) => {
  await startDefaultCheck(page);

  await expect(page.getByRole('button', { name: /세션 관리/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '검진 운영', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '교사용 현황판' })).toBeVisible();
  await expect(page.getByRole('button', { name: '교무실 현황판' })).toBeVisible();
  await expect(page.getByRole('button', { name: '운영 보고서' })).toBeVisible();
});

test('opens the session management panel', async ({ page }) => {
  await startDefaultCheck(page);

  await page.getByRole('button', { name: /세션 관리/ }).click();
  await expect(page.locator('.session-manager')).toBeVisible();
});

test('opens the operation center', async ({ page }) => {
  await startDefaultCheck(page);

  await page.getByRole('button', { name: '검진 운영', exact: true }).click();
  await expect(page.locator('.operation-center')).toBeVisible();
});

test('opens the teacher dashboard', async ({ page }) => {
  await startDefaultCheck(page);

  await page.getByRole('button', { name: '교사용 현황판' }).click();
  await expect(page.locator('.teacher-dashboard-page')).toBeVisible();
});

test('opens the admin dashboard', async ({ page }) => {
  await startDefaultCheck(page);

  await page.getByRole('button', { name: '교무실 현황판' }).click();
  await expect(page.locator('.admin-dashboard-page')).toBeVisible();
});

test('opens the operation report', async ({ page }) => {
  await startDefaultCheck(page);

  await page.getByRole('button', { name: '운영 보고서' }).click();
  await expect(page.locator('.operation-report-page')).toBeVisible();
});
