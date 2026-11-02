import { expect, test } from '@playwright/test';

const cases = [
  { lng: 'ru', next: 'Продолжить', submit: 'Записаться', done: 'Запись подтверждена' },
  { lng: 'en', next: 'Continue', submit: 'Book', done: 'Booking confirmed' },
];

const dayButton = /(слотов|slots): \d+/;

for (const { lng, next, submit, done } of cases) {
  test(`гость записывается на свободный слот (${lng})`, async ({ page, request }) => {
    const title = `E2E ${lng} ${Date.now()}`;
    const created = await request.post('/api/meeting-types', {
      data: { title, description: 'Тест записи гостя', durationMinutes: 30 },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = (await created.json()) as { id: string };

    await page.addInitScript((value) => localStorage.setItem('i18nextLng', value), lng);
    await page.goto('/book');
    await page.getByRole('link', { name: new RegExp(title) }).click();
    await expect(page).toHaveURL(`/book/${id}`);

    // Первый доступный день и первый слот; время запоминаем, чтобы проверить его исчезновение.
    await page.getByRole('button', { name: dayButton }).first().click();
    const slot = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
    const time = (await slot.textContent())!;
    await slot.click();
    await page.getByRole('button', { name: next, exact: true }).click();
    await expect(page).toHaveURL(/\/confirm\?start=/);
    const start = new Date(new URL(page.url()).searchParams.get('start')!).toISOString();

    await page.getByLabel(/^(Имя|Name)/).fill('Анна Смирнова');
    await page.getByLabel('Email').fill('anna@example.com');
    await page.getByLabel(/^(Телефон|Phone)/).fill('+77001234567');
    await page.getByRole('button', { name: submit, exact: true }).click();

    await expect(page.getByRole('heading', { name: done })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    // Занятый слот пропал из свободных (API отдаёт только свободные).
    const slots = await request.get(`/api/meeting-types/${id}/slots`);
    const free = (await slots.json()) as { start: string }[];
    expect(free.map((s) => new Date(s.start).toISOString())).not.toContain(start);

    // И в интерфейсе: в том же дне этого времени больше нет.
    await page.goto(`/book/${id}`);
    await page.getByRole('button', { name: dayButton }).first().click();
    await expect(page.getByRole('button', { name: time, exact: true })).toHaveCount(0);
  });
}
