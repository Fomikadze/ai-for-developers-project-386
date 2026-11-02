import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '../../test/renderRoute';

const owner = { name: 'Анна', title: 'Разработчик', avatarUrl: null, timezone: 'Asia/Almaty' };
const first = {
  id: 'b1',
  meetingType: { id: 'a1', title: 'Знакомство' },
  start: '2026-11-02T04:00:00Z',
  end: '2026-11-02T04:30:00Z',
  guestName: 'Иван Петров',
  guestEmail: 'ivan@example.com',
  guestPhone: '+77001234567',
  notes: 'Обсудить проект',
};
const second = {
  ...first,
  id: 'b2',
  meetingType: { id: 'a2', title: 'Разбор' },
  start: '2026-11-01T04:00:00Z',
  end: '2026-11-01T05:00:00Z',
  guestName: 'Мария Ким',
  guestEmail: 'maria@example.com',
  notes: null,
};

async function openTab(upcoming: { status?: number; body: unknown }) {
  await renderRoute('/admin', {
    api: {
      'GET /api/owner': { body: owner },
      'GET /api/meeting-types': { body: [] },
      'GET /api/bookings/upcoming': upcoming,
    },
  });
  await userEvent.setup().click(await screen.findByRole('tab', { name: 'Предстоящие встречи' }));
}

it('показывает брони в порядке ответа API с данными гостя, временем в поясе владельца и заметками', async () => {
  await openTab({ body: [first, second] });

  const items = await screen.findAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(within(items[0]!).getByText('Знакомство')).toBeInTheDocument();
  expect(within(items[0]!).getByText(/2 ноября 2026 г\..*09:00/)).toBeInTheDocument();
  expect(within(items[0]!).getByText('Иван Петров')).toBeInTheDocument();
  expect(within(items[0]!).getByText('ivan@example.com')).toBeInTheDocument();
  expect(within(items[0]!).getByText('+77001234567')).toBeInTheDocument();
  expect(within(items[0]!).getByText('Обсудить проект')).toBeInTheDocument();
  expect(within(items[1]!).getByText('Разбор')).toBeInTheDocument();
  expect(within(items[1]!).queryByText('Обсудить проект')).not.toBeInTheDocument();
});

it('показывает пустое состояние', async () => {
  await openTab({ body: [] });

  expect(await screen.findByText('Предстоящих встреч пока нет.')).toBeInTheDocument();
});

it('показывает ошибку загрузки', async () => {
  await openTab({ status: 500, body: { code: 'UNKNOWN', message: 'x' } });

  expect(await screen.findByRole('alert')).toHaveTextContent('Что-то пошло не так');
});
