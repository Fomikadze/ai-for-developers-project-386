import { expect, test } from '@playwright/test';

const cases = [
  { lng: 'ru', badge: 'Быстрая запись на звонок', book: 'Записаться' },
  { lng: 'en', badge: 'Quick call booking', book: 'Book a call' },
];

for (const { lng, badge, book } of cases) {
  test(`главная (${lng}) ведёт на выбор типа встречи`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('i18nextLng', value), lng);
    await page.goto('/');

    await expect(page.getByText(badge)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calendar');

    await page.getByRole('main').getByRole('link', { name: book }).click();
    await expect(page).toHaveURL('/book');
  });
}
