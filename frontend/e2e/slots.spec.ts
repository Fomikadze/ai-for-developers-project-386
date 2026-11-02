import { expect, test } from '@playwright/test';

test('гость выбирает день и слот и переходит к форме с start в адресе', async ({
  page,
  request,
}) => {
  const title = `Разбор ${Date.now()}`;
  const created = await request.post('/api/meeting-types', {
    data: { title, description: 'E2E слоты', durationMinutes: 45 },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'));
  await page.goto('/book');
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(`/book/${id}`);

  const firstDay = page.getByRole('button', { name: /свободных слотов/ }).first();
  const dayName = (await firstDay.getAttribute('aria-label'))!.split(',')[0];
  await firstDay.click();

  // У типа на 45 минут последний старт дня — 17:00 по Алматы.
  await expect(page.getByRole('button', { name: '17:00' })).toBeVisible();
  await expect(page.getByRole('button', { name: '17:30' })).toHaveCount(0);
  await page.getByRole('button', { name: '17:00' }).click();

  await expect(page.getByTestId('booking-summary')).toContainText(`${dayName}, 17:00`);

  await page.getByRole('button', { name: 'Продолжить' }).click();
  // 17:00 Asia/Almaty (UTC+5) = 12:00 UTC.
  await expect(page).toHaveURL(
    new RegExp(`/book/${id}/confirm\\?start=\\d{4}-\\d{2}-\\d{2}T12%3A00%3A00\\.000Z$`),
  );
});
