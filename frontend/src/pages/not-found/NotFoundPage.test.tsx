import { screen } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute';

it('показывает 404 с шапкой на неизвестном пути', async () => {
  await renderRoute('/book');

  expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
});
