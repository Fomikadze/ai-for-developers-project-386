import { expect, test, type APIRequestContext } from '@playwright/test';

async function createType(request: APIRequestContext, title: string): Promise<string> {
  const created = await request.post('/api/meeting-types', {
    data: { title, description: 'E2E конфликт', durationMinutes: 30 },
  });
  expect(created.status()).toBe(201);
  return ((await created.json()) as { id: string }).id;
}

test('слот заняли между выбором и отправкой: гость выбирает другой с сохранёнными данными', async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const typeId = await createType(request, `Конфликт ${suffix}`);
  const otherTypeId = await createType(request, `Занято ${suffix}`);

  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'));
  await page.goto(`/book/${typeId}`);

  const times = page.getByRole('button', { name: /^\d{2}:\d{2}$/ });
  await page
    .getByRole('button', { name: /свободных слотов/ })
    .first()
    .click();
  await times.first().click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page).toHaveURL(/\/confirm\?start=/);
  const takenStart = new URL(page.url()).searchParams.get('start')!;

  await page.getByLabel('Имя').fill('Анна Гостева');
  await page.getByLabel('Email').fill('anna@example.com');
  await page.getByLabel('Телефон').fill('+7 700 123 45 67');
  await page.getByLabel('Заметки (необязательно)').fill('Обсудить проект');

  // Тот же старт занимают другим типом встречи, пока гость заполняет форму.
  const taken = await request.post('/api/bookings', {
    data: {
      meetingTypeId: otherTypeId,
      start: takenStart,
      guestName: 'Другой Гость',
      guestEmail: 'other@example.com',
      guestPhone: '+77001234568',
    },
  });
  expect(taken.status()).toBe(201);

  await page.getByRole('button', { name: 'Записаться' }).click();

  await expect(page.getByText('Это время уже заняли, выберите другое')).toBeVisible();
  await expect(page).toHaveURL(`/book/${typeId}`);

  await page
    .getByRole('button', { name: /свободных слотов/ })
    .first()
    .click();
  await times.first().click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page).toHaveURL(/\/confirm\?start=/);
  expect(new URL(page.url()).searchParams.get('start')).not.toBe(takenStart);

  await expect(page.getByLabel('Имя')).toHaveValue('Анна Гостева');
  await expect(page.getByLabel('Email')).toHaveValue('anna@example.com');
  await expect(page.getByLabel('Телефон')).toHaveValue('+7 700 123 45 67');
  await expect(page.getByLabel('Заметки (необязательно)')).toHaveValue('Обсудить проект');

  await page.getByRole('button', { name: 'Записаться' }).click();
  await expect(page).toHaveURL('/book/success');
  await expect(page.getByText('Запись подтверждена')).toBeVisible();
});
