import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '../../test/renderRoute';

const owner = {
  name: 'Анна Иванова',
  title: 'Разработчик',
  avatarUrl: null,
  timezone: 'Asia/Almaty',
};
const types = [
  { id: 'a1', title: 'Знакомство', description: 'Короткий звонок', durationMinutes: 45 },
];
// Almaty = UTC+5. 3 ноября: 09:00 и 17:00 по Алматы; 4 ноября: 09:30.
const slots = [
  { start: '2026-11-03T04:00:00Z', end: '2026-11-03T04:45:00Z' },
  { start: '2026-11-03T12:00:00Z', end: '2026-11-03T12:45:00Z' },
  { start: '2026-11-04T04:30:00Z', end: '2026-11-04T05:15:00Z' },
];
const api = {
  'GET /api/owner': { body: owner },
  'GET /api/meeting-types': { body: types },
  'GET /api/meeting-types/a1/slots': { body: slots },
};
const noSlots = { ...api, 'GET /api/meeting-types/a1/slots': { body: [] } };

beforeEach(() => {
  // Понедельник 2026-11-02 10:00 по Алматы: окно записи 3–16 ноября.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-02T05:00:00Z') });
});
afterEach(() => vi.useRealTimers());

const day = (name: RegExp) => screen.findByRole('button', { name });

it('показывает сводку и дни со счётчиками, неактивные дни отключены', async () => {
  await renderRoute('/book/a1', { api });

  expect(await screen.findByText('Знакомство')).toBeInTheDocument();
  expect(screen.getByText('45 мин')).toBeInTheDocument();
  expect(await day(/^3 ноября.*2/)).toBeEnabled();
  expect(await day(/^4 ноября.*1/)).toBeEnabled();
  // день окна без слотов и день вне окна
  expect(await day(/^5 ноября/)).toBeDisabled();
  expect(await day(/^2 ноября/)).toBeDisabled();
});

it('показывает слоты выбранного дня в поясе владельца', async () => {
  const user = userEvent.setup();
  await renderRoute('/book/a1', { api });

  await user.click(await day(/^3 ноября/));

  expect(await screen.findByRole('button', { name: '09:00' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '17:00' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '09:30' })).not.toBeInTheDocument();
});

it('«Продолжить» активна после выбора слота и ведёт на подтверждение', async () => {
  const user = userEvent.setup();
  const { router } = await renderRoute('/book/a1', { api });
  await user.click(await day(/^3 ноября/));
  expect(screen.getByRole('button', { name: 'Продолжить' })).toBeDisabled();

  await user.click(await screen.findByRole('button', { name: '17:00' }));
  expect(within(screen.getByTestId('booking-summary')).getByText(/17:00/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Продолжить' }));

  await waitFor(() =>
    expect(router.state.location.pathname + router.state.location.search).toBe(
      '/book/a1/confirm?start=2026-11-03T12%3A00%3A00.000Z',
    ),
  );
});

it('«Назад» ведёт на /book', async () => {
  const user = userEvent.setup();
  const { router } = await renderRoute('/book/a1', { api: noSlots });

  await user.click(await screen.findByRole('button', { name: 'Назад' }));

  expect(router.state.location.pathname).toBe('/book');
});

it('без слотов все дни отключены, просят выбрать дату', async () => {
  await renderRoute('/book/a1', { api: noSlots });

  expect(await day(/^3 ноября/)).toBeDisabled();
  expect(screen.getAllByText('Выберите дату')).not.toHaveLength(0);
});

it('листает месяц только в пределах окна записи', async () => {
  // Среда 2026-11-25: окно 26 ноября – 9 декабря, оба месяца доступны.
  vi.setSystemTime(new Date('2026-11-25T05:00:00Z'));
  const user = userEvent.setup();
  await renderRoute('/book/a1', { api });
  await day(/^26 ноября/);

  expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Следующий месяц' }));
  expect(await day(/^9 декабря/)).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Следующий месяц' })).toBeDisabled();
});

it('неизвестный тип встречи: сообщение и кнопка возврата', async () => {
  const user = userEvent.setup();
  const { router } = await renderRoute('/book/zzz', { api });

  expect(await screen.findByText('Тип встречи не найден')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'К выбору встречи' }));

  expect(router.state.location.pathname).toBe('/book');
});
