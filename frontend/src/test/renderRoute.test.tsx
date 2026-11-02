import { screen } from '@testing-library/react';
import { getOwner } from '../api/generated';
import { renderRoute } from './renderRoute';

it('рендерит страницу по маршруту на выбранном языке', async () => {
  await renderRoute('/', { language: 'en' });

  expect(await screen.findByRole('link', { name: 'Admin' })).toBeInTheDocument();
});

it('подменяет ответы API на уровне fetch SDK', async () => {
  const owner = { name: 'Анна', title: 'Разработчик', avatarUrl: null, timezone: 'Asia/Almaty' };
  const { fetchMock } = await renderRoute('/', { api: { 'GET /api/owner': { body: owner } } });

  const { data } = await getOwner();

  expect(data).toEqual(owner);
  expect(fetchMock).toHaveBeenCalledOnce();
});

it('передаёт тело ответа с ошибкой как есть', async () => {
  await renderRoute('/', {
    api: {
      'GET /api/owner': { status: 404, body: { code: 'MEETING_TYPE_NOT_FOUND', message: 'x' } },
    },
  });

  const { error } = await getOwner();

  expect(error).toEqual({ code: 'MEETING_TYPE_NOT_FOUND', message: 'x' });
});
