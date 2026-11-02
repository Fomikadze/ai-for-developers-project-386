import { expect, test } from '@playwright/test';

test('тип встречи, созданный в админке, виден гостю в каталоге', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'));
  const title = `Консультация ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const description = `Описание для ${title}`;

  await page.goto('/admin');
  await page.getByLabel('Название').fill(title);
  await page.getByLabel('Описание').fill(description);
  await page.getByLabel('Длительность, мин').fill('45');
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.goto('/book');
  const card = page.getByRole('link').filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card).toContainText(description);
  await expect(card).toContainText('45 мин');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Иван Иванов');
});
