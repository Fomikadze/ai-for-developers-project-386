import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearDraft } from '../../lib/draft';
import { renderRoute } from '../../test/renderRoute';

const owner = { name: 'Анна', title: 'Разработчик', avatarUrl: null, timezone: 'Asia/Almaty' };
const types = [
  { id: 'a1', title: 'Знакомство', description: 'Короткий звонок', durationMinutes: 45 },
];
const start = '2026-11-03T04:00:00Z'; // 09:00 по Алматы
const path = `/book/a1/confirm?start=${encodeURIComponent(start)}`;
const booking = {
  id: 'b1',
  meetingType: { id: 'a1', title: 'Знакомство' },
  start,
  end: '2026-11-03T04:45:00Z',
  guestName: 'Иван Петров',
  guestEmail: 'ivan@example.com',
  guestPhone: '+77001234567',
  notes: null,
};
const base = {
  'GET /api/owner': { body: owner },
  'GET /api/meeting-types': { body: types },
  'GET /api/meeting-types/a1/slots': { body: [] },
};

beforeEach(() => clearDraft());

async function fill(user: ReturnType<typeof userEvent.setup>, values: Record<string, string>) {
  const labels: Record<string, RegExp> = {
    name: /^Имя/,
    email: /^Email/,
    phone: /^Телефон/,
    notes: /^Заметки/,
  };
  for (const [key, value] of Object.entries(values)) {
    await user.type(await screen.findByLabelText(labels[key]), value);
  }
}

it('показывает сводку слота и форму', async () => {
  await renderRoute(path, { api: base });
  expect(await screen.findByText('Знакомство')).toBeInTheDocument();
  expect(screen.getByText(/09:00/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Записаться' })).toBeInTheDocument();
});

it('без start или с неразбираемым start перенаправляет на выбор времени', async () => {
  const first = await renderRoute('/book/a1/confirm', { api: base });
  await waitFor(() => expect(first.router.state.location.pathname).toBe('/book/a1'));
  first.unmount();
  const second = await renderRoute('/book/a1/confirm?start=abc', { api: base });
  await waitFor(() => expect(second.router.state.location.pathname).toBe('/book/a1'));
});

it('показывает «Тип встречи не найден» для неизвестного типа', async () => {
  await renderRoute(`/book/zzz/confirm?start=${encodeURIComponent(start)}`, { api: base });
  expect(await screen.findByText('Тип встречи не найден')).toBeInTheDocument();
});

it('проверяет поля до отправки и не шлёт запрос', async () => {
  const user = userEvent.setup();
  const api = { ...base, 'POST /api/bookings': { status: 201, body: booking } };
  const { fetchMock } = await renderRoute(path, { api });
  await fill(user, { name: 'Иван1', email: 'bad', phone: '123' });
  await user.click(screen.getByRole('button', { name: 'Записаться' }));

  expect(await screen.findByText(/Введите имя/)).toBeInTheDocument();
  expect(screen.getByText(/Введите корректный email/)).toBeInTheDocument();
  expect(screen.getByText(/Введите телефон/)).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([r]) => (r as Request).method === 'POST')).toBe(false);
});

it('ошибка при заметке длиннее 500 символов', async () => {
  const user = userEvent.setup();
  await renderRoute(path, { api: base });
  await fill(user, { name: 'Иван', email: 'a@b.co', phone: '+77001234567' });
  await user.click(await screen.findByLabelText(/^Заметки/));
  await user.paste('x'.repeat(501));
  await user.click(screen.getByRole('button', { name: 'Записаться' }));
  expect(await screen.findByText(/Проверьте введённые данные/)).toBeInTheDocument();
});

it('отправляет имя без пробелов и телефон в E.164, затем показывает подтверждение', async () => {
  const user = userEvent.setup();
  let sent: unknown;
  const api = {
    ...base,
    'POST /api/bookings': ({ body }: { body: unknown }) => {
      sent = body;
      return { status: 201, body: booking };
    },
  };
  const { router } = await renderRoute(path, { api });
  await fill(user, {
    name: '  Иван Петров  ',
    email: 'ivan@example.com',
    phone: '8 (700) 123-45-67',
  });
  await user.click(screen.getByRole('button', { name: 'Записаться' }));

  expect(await screen.findByText('Запись подтверждена')).toBeInTheDocument();
  expect(sent).toMatchObject({
    meetingTypeId: 'a1',
    start: '2026-11-03T04:00:00.000Z',
    guestName: 'Иван Петров',
    guestEmail: 'ivan@example.com',
    guestPhone: '+77001234567',
  });
  expect(router.state.location.pathname).toBe('/book/success');
  expect(screen.getByText('Знакомство')).toBeInTheDocument();
  expect(screen.getByText(/09:00/)).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'На главную' }));
  expect(router.state.location.pathname).toBe('/');
});

it.each([
  ['INVALID_NAME', /Введите имя/],
  ['INVALID_EMAIL', /Введите корректный email/],
  ['INVALID_PHONE', /Введите телефон/],
])('%s с сервера ставится на поле формы', async (code, text) => {
  const user = userEvent.setup();
  const api = {
    ...base,
    'POST /api/bookings': { status: 400, body: { code, message: 'x' } },
  };
  const { router } = await renderRoute(path, { api });
  await fill(user, { name: 'Иван', email: 'ivan@example.com', phone: '+77001234567' });
  await user.click(screen.getByRole('button', { name: 'Записаться' }));

  expect(await screen.findByText(text)).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/book/a1/confirm');
});

it.each([
  ['SLOT_OUT_OF_RANGE', /недоступно для записи/],
  ['SOMETHING_NEW', /Что-то пошло не так/],
])('код %s показывается уведомлением', async (code, text) => {
  const user = userEvent.setup();
  const api = { ...base, 'POST /api/bookings': { status: 400, body: { code, message: 'x' } } };
  await renderRoute(path, { api });
  await fill(user, { name: 'Иван', email: 'ivan@example.com', phone: '+77001234567' });
  await user.click(screen.getByRole('button', { name: 'Записаться' }));
  expect(await screen.findByText(text)).toBeInTheDocument();
});

it('SLOT_TAKEN возвращает к выбору времени, обновляет слоты и сохраняет данные формы', async () => {
  const user = userEvent.setup();
  const api = {
    ...base,
    'POST /api/bookings': { status: 409, body: { code: 'SLOT_TAKEN', message: 'x' } },
  };
  const { router } = await renderRoute(path, { api });
  await fill(user, { name: 'Иван', email: 'ivan@example.com', phone: '+77001234567' });
  await user.click(screen.getByRole('button', { name: 'Записаться' }));

  expect(await screen.findByText('Это время уже заняли, выберите другое')).toBeInTheDocument();
  await waitFor(() => expect(router.state.location.pathname).toBe('/book/a1'));

  await router.navigate(path);
  expect(await screen.findByLabelText(/^Имя/)).toHaveValue('Иван');
  expect(screen.getByLabelText(/^Email/)).toHaveValue('ivan@example.com');
});

describe('конфликт слота в полном сценарии', () => {
  const slotA = { start, end: '2026-11-03T04:45:00Z' };
  const slotB = { start: '2026-11-03T04:30:00Z', end: '2026-11-03T05:15:00Z' }; // 09:30
  const conflict = (slots: () => unknown[]) => ({
    ...base,
    'GET /api/meeting-types/a1/slots': () => ({ body: slots() }),
    'POST /api/bookings': { status: 409, body: { code: 'SLOT_TAKEN', message: 'x' } },
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-02T05:00:00Z') });
  });
  afterEach(() => vi.useRealTimers());

  it('занятый слот пропадает после перезапроса, данные формы подставляются при выборе другого', async () => {
    const user = userEvent.setup();
    let taken = false;
    const api = conflict(() => (taken ? [slotB] : [slotA, slotB]));
    const { router } = await renderRoute('/book/a1', { api });

    await user.click(await screen.findByRole('button', { name: /^3 ноября/ }));
    await user.click(await screen.findByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    await fill(user, { name: 'Иван', email: 'ivan@example.com', phone: '+77001234567' });
    taken = true;
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/book/a1'));
    await user.click(await screen.findByRole('button', { name: /^3 ноября/ }));
    expect(await screen.findByRole('button', { name: '09:30' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '09:30' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(await screen.findByLabelText(/^Имя/)).toHaveValue('Иван');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('ivan@example.com');
    expect(screen.getByLabelText(/^Телефон/)).toHaveValue('+77001234567');
  });

  it('уведомление приходит на выбранном языке', async () => {
    const user = userEvent.setup();
    await renderRoute(path, { api: conflict(() => []), language: 'en' });
    await user.type(await screen.findByLabelText(/^Name/), 'Ivan');
    await user.type(screen.getByLabelText(/^Email/), 'ivan@example.com');
    await user.type(screen.getByLabelText(/^Phone/), '+77001234567');
    await user.click(screen.getByRole('button', { name: /^(Book|Confirm)/ }));
    expect(
      await screen.findByText('This time is already taken, pick another one'),
    ).toBeInTheDocument();
  });
});
