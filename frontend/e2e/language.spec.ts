import { expect, test } from '@playwright/test';

test('переключатель языка меняет тексты, выбор сохраняется после перезагрузки', async ({
  page,
}) => {
  // Начальный язык задаём один раз за вкладку, чтобы перезагрузка не затирала выбор гостя.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('i18nextLng', 'ru');
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(page.getByText('Быстрая запись на звонок')).toBeVisible();
  await expect(header.getByRole('link', { name: 'Админка' })).toBeVisible();

  await header.getByText('EN', { exact: true }).click();
  await expect(page.getByText('Quick call booking')).toBeVisible();
  await expect(header.getByRole('link', { name: 'Admin' })).toBeVisible();

  await page.reload();
  await expect(page.getByText('Quick call booking')).toBeVisible();

  await header.getByText('RU', { exact: true }).click();
  await expect(page.getByText('Быстрая запись на звонок')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Быстрая запись на звонок')).toBeVisible();
});
