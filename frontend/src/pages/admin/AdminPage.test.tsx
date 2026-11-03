import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '../../test/renderRoute';

const owner = { name: 'Анна', title: 'Разработчик', avatarUrl: null, timezone: 'Asia/Almaty' };
const existing = { id: 'a1', title: 'Знакомство', description: 'Звонок', durationMinutes: 30 };

async function fill(title: string, description: string, duration: string) {
  const user = userEvent.setup();
  const durationField = await screen.findByLabelText('Длительность, мин');
  if (title) await user.type(screen.getByLabelText('Название'), title);
  if (description) await user.type(screen.getByLabelText('Описание'), description);
  await user.clear(durationField);
  await user.type(durationField, duration);
  return user;
}

it('показывает список типов встреч на вкладке «Типы встреч»', async () => {
  await renderRoute('/admin', { api: { 'GET /api/meeting-types': { body: [existing] } } });

  expect(await screen.findByRole('tab', { name: 'Типы встреч' })).toBeInTheDocument();
  expect(await screen.findByText('Знакомство')).toBeInTheDocument();
  expect(screen.getByText('30 мин')).toBeInTheDocument();
});

it('показывает пустое состояние списка', async () => {
  await renderRoute('/admin', { api: { 'GET /api/meeting-types': { body: [] } } });

  expect(await screen.findByText('Типов встреч пока нет.')).toBeInTheDocument();
});

it('создаёт тип, перезапрашивает список и показывает тип в каталоге', async () => {
  const list = [existing];
  const created = { id: 'c3', title: 'Разбор', description: 'Подробно', durationMinutes: 60 };
  let postedBody: unknown;
  const { router } = await renderRoute('/admin', {
    api: {
      'GET /api/owner': { body: owner },
      'GET /api/meeting-types': () => ({ body: list }),
      'POST /api/meeting-types': ({ body }) => {
        postedBody = body;
        list.push(created);
        return { status: 201, body: created };
      },
    },
  });

  const user = await fill('Разбор', 'Подробно', '60');
  await user.click(screen.getByRole('button', { name: 'Создать' }));

  expect(await screen.findByText('Разбор')).toBeInTheDocument();
  expect(postedBody).toEqual({ title: 'Разбор', description: 'Подробно', durationMinutes: 60 });
  await waitFor(() => expect(screen.getByLabelText('Название')).toHaveValue(''));

  await router.navigate('/book');
  expect(await screen.findByRole('link', { name: /Разбор/ })).toHaveAttribute('href', '/book/c3');
});

it('проверяет границы на клиенте и не отправляет запрос', async () => {
  const post = vi.fn(() => ({ status: 201, body: existing }));
  await renderRoute('/admin', {
    api: { 'GET /api/meeting-types': { body: [] }, 'POST /api/meeting-types': post },
  });

  const user = await fill('', '', '10');
  await user.click(screen.getByRole('button', { name: 'Создать' }));

  expect(await screen.findByText('Введите название до 100 символов.')).toBeInTheDocument();
  expect(screen.getByText('Длительность: от 15 до 540 минут.')).toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});

it('показывает ошибку сервера уведомлением', async () => {
  await renderRoute('/admin', {
    api: {
      'GET /api/meeting-types': { body: [] },
      'POST /api/meeting-types': {
        status: 400,
        body: { code: 'VALIDATION_ERROR', message: 'bad' },
      },
    },
  });

  const user = await fill('Разбор', '', '60');
  await user.click(screen.getByRole('button', { name: 'Создать' }));

  expect(await screen.findByText('Проверьте введённые данные.')).toBeInTheDocument();
  expect(screen.getByLabelText('Название')).toHaveValue('Разбор');
});
