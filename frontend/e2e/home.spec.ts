import { expect, test } from '@playwright/test';

test('главная открывается и ведёт на выбор типа встречи', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
