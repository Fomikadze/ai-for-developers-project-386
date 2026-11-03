import { expect, test } from '@playwright/test';
import { pickFreeSlot } from './slots-helper';

test('бронь гостя видна владельцу во вкладке «Предстоящие встречи»', async ({ page, request }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = `Звонок ${stamp}`;
  const guestName = `Гость ${stamp.replace(/[\d-]/g, 'а')}`;
  const guestEmail = `guest-${stamp}@example.com`;
  const guestPhone = '+77001234567';
  const notes = `Заметки ${stamp}`;

  const created = await request.post('/api/meeting-types', {
    data: { title, description: 'E2E предстоящие', durationMinutes: 30 },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'));
  await page.goto(`/book/${id}`);

  // Случайный день и своё время суток: бэкенд живёт между прогонами, другие тесты занимают другое время.
  const picked = await pickFreeSlot(request, id, '15:00');
  await page
    .getByRole('button', { name: /свободных слотов/ })
    .nth(picked.dayIndex)
    .click();
  await page.getByRole('button', { name: picked.time, exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить' }).click();

  await page.getByLabel('Имя').fill(guestName);
  await page.getByLabel('Email').fill(guestEmail);
  await page.getByLabel('Телефон').fill(guestPhone);
  await page.getByLabel('Заметки (необязательно)').fill(notes);
  await page.getByRole('button', { name: 'Записаться' }).click();
  await expect(page).toHaveURL('/book/success');

  await page.goto('/admin');
  await page.getByRole('tab', { name: 'Предстоящие встречи' }).click();

  const meeting = page.getByRole('listitem').filter({ hasText: title });
  await expect(meeting).toBeVisible();
  await expect(meeting).toContainText(guestName);
  await expect(meeting).toContainText(guestEmail);
  await expect(meeting).toContainText(guestPhone);
  await expect(meeting).toContainText(notes);
});
