import { screen, within } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute';

const owner = {
  name: 'Анна Иванова',
  title: 'Разработчик',
  avatarUrl: null,
  timezone: 'Asia/Almaty',
};
const types = [
  { id: 'a1', title: 'Знакомство', description: 'Короткий звонок', durationMinutes: 30 },
  { id: 'b2', title: 'Разбор', description: 'Подробный разбор', durationMinutes: 90 },
];

it('показывает владельца и карточки типов со ссылками на выбор слота', async () => {
  await renderRoute('/book', {
    api: { 'GET /api/owner': { body: owner }, 'GET /api/meeting-types': { body: types } },
  });

  expect(await screen.findByText('Анна Иванова')).toBeInTheDocument();
  expect(screen.getByText('Разработчик')).toBeInTheDocument();
  const card = await screen.findByRole('link', { name: /Знакомство/ });
  expect(card).toHaveAttribute('href', '/book/a1');
  expect(within(card).getByText('Короткий звонок')).toBeInTheDocument();
  expect(within(card).getByText('30 мин')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Разбор/ })).toHaveAttribute('href', '/book/b2');
});

it('показывает аватар владельца, если он задан', async () => {
  await renderRoute('/book', {
    api: {
      'GET /api/owner': { body: { ...owner, avatarUrl: 'http://localhost/a.png' } },
      'GET /api/meeting-types': { body: [] },
    },
  });

  expect(await screen.findByRole('img', { name: 'Анна Иванова' })).toHaveAttribute(
    'src',
    'http://localhost/a.png',
  );
});

it('показывает пустое состояние без типов встреч', async () => {
  await renderRoute('/book', {
    api: { 'GET /api/owner': { body: owner }, 'GET /api/meeting-types': { body: [] } },
  });

  expect(await screen.findByText('Пока нет доступных типов встреч.')).toBeInTheDocument();
});

it('показывает ошибку загрузки по errors.<code>', async () => {
  await renderRoute('/book', {
    api: {
      'GET /api/owner': { body: owner },
      'GET /api/meeting-types': { status: 500, body: { code: 'SOMETHING_NEW', message: 'x' } },
    },
  });

  expect(await screen.findByText('Что-то пошло не так. Попробуйте ещё раз.')).toBeInTheDocument();
});

it('показывает тексты на английском', async () => {
  await renderRoute('/book', {
    language: 'en',
    api: { 'GET /api/owner': { body: owner }, 'GET /api/meeting-types': { body: types } },
  });

  expect(await screen.findByText('30 min')).toBeInTheDocument();
});
