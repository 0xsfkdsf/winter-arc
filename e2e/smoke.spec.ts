import { test, expect, Page } from '@playwright/test';

// Full user-journey suite: every run starts with a clean profile,
// completes onboarding, and then exercises one area. Any page error
// or console error fails the test it appears in.
let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200));
  });
  await page.goto('/');
  await page.locator('.veil').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
});

test.afterEach(async () => {
  expect(errors, JSON.stringify(errors.slice(0, 5))).toEqual([]);
});

async function onboard(page: Page) {
  // 6 chapters: Season → Dates → Identity → Practices → Study & Focus → Begin
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /continue/i }).click();
  }
  await page.getByRole('button', { name: /start day 1/i }).click();
  await expect(page.getByText('Day 1', { exact: false }).first()).toBeVisible();
}

test('onboarding completes and Today hero renders', async ({ page }) => {
  await onboard(page);
  await expect(page.locator('.hero-day')).toContainText('Day 1');
  await expect(page.getByText('Who are you becoming?')).toBeVisible();
  await expect(page.getByText('SPIRITUAL')).toBeVisible();
  await expect(page.getByText('QUIET RESISTANCE')).toBeVisible();
});

test('habit toggle updates progress and survives reload', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: /qur'an/i }).click();
  await expect(page.locator('.today-stats .hstat .v').first()).toContainText('1/');
  await page.reload();
  await page.locator('.veil').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  await expect(page.locator('.today-stats .hstat .v').first()).toContainText('1/');
});

test('breaking habit cycles Maintained then Slip', async ({ page }) => {
  await onboard(page);
  const row = page.getByRole('button', { name: /social media/i });
  await row.click();
  await expect(row).toContainText('Maintained');
  await row.click();
  await expect(row).toContainText('Slip');
});

test('study: subject add, task lifecycle, subject delete', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: /^study$/i }).click();
  // add subject
  await page.getByRole('button', { name: /subject/i }).click();
  await page.getByPlaceholder('Subject name').fill('Biology');
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByRole('button', { name: /^biology/i })).toBeVisible();
  // add task to Mathematics
  await page.getByRole('button', { name: /mathematics/i }).first().click();
  await page.getByRole('button', { name: /new task/i }).click();
  await page.getByPlaceholder(/lecture 4/i).fill('Lecture 4');
  await page.getByRole('button', { name: /^create task$/i }).click();
  await expect(page.getByText('Lecture 4')).toBeVisible();
  // edit task title
  const card = page.locator('.task', { hasText: 'Lecture 4' });
  await card.hover();
  await card.getByLabel('Edit task').click();
  await page.getByPlaceholder(/lecture 4/i).fill('Lecture 4 revised');
  await page.getByRole('button', { name: /save changes/i }).click();
  await expect(page.getByText('Lecture 4 revised')).toBeVisible();
  // delete task (two-tap confirm)
  const card2 = page.locator('.task', { hasText: 'Lecture 4 revised' });
  await card2.hover();
  await card2.getByLabel('Delete task').click();
  await card2.getByRole('button', { name: /sure/i }).click();
  await expect(page.getByText('Lecture 4 revised')).toHaveCount(0);
  // delete the Biology subject (confirm modal)
  const subjRow = page.locator('.subj-row', { hasText: 'Biology' });
  await subjRow.hover();
  await subjRow.getByLabel(/delete biology/i).click();
  await page.getByRole('button', { name: /delete subject/i }).click();
  await expect(page.getByRole('button', { name: /biology/i })).toHaveCount(0);
});

test('focus: quick session pause, resume, finish lands in timeline', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: /^focus$/i }).first().click();
  await expect(page.locator('.focus-timer')).toBeVisible();
  await expect(page.getByText('Overview')).toBeVisible();
  await expect(page.getByText('Focus Record')).toBeVisible();
  await page.getByRole('button', { name: /^pause$/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: /^continue$/i })).toBeVisible();
  await dialog.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /finish early/i }).click();
  await expect(page.locator('.focus-wrap')).toHaveCount(0);
  await page.getByRole('button', { name: /^timeline$/i }).click();
  await expect(page.locator('.tl-item').first()).toBeVisible();
});

test('timeline shows five prayer anchors with arabic names', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: /^timeline$/i }).click();
  await expect(page.locator('.prayer-mark')).toHaveCount(5);
  for (const ar of ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء']) {
    await expect(page.locator('.prayer-mark', { hasText: ar })).toBeVisible();
  }
});

test('progress, review and settings render and save', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: /^progress$/i }).click();
  await expect(page.getByText('ARC PROGRESS')).toBeVisible();
  await expect(page.getByText(/consistency/i).first()).toBeVisible();
  await page.getByRole('button', { name: /^review$/i }).click();
  await expect(page.getByText('WEEKLY REVIEW')).toBeVisible();
  await page.getByPlaceholder(/actually worked/i).fill('Deep work mornings');
  await page.getByRole('button', { name: /save review/i }).click();
  await page.getByRole('button', { name: /^settings$/i }).click();
  await expect(page.getByText('Quiet preferences')).toBeVisible();
  await page.getByRole('button', { name: /preview/i }).click();
  await page.getByLabel(/asr time/i).fill('15:45');
});

test('command palette opens and jumps to study', async ({ page }) => {
  await onboard(page);
  await page.keyboard.press('Control+k');
  await expect(page.locator('.cmd-input')).toBeVisible();
  await page.locator('.cmd-input').fill('study');
  await page.getByRole('button', { name: /open study/i }).click();
  await expect(page.getByText('STUDY WORKSPACE')).toBeVisible();
});
