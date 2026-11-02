import { screen, within } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute';

it('показывает бейдж, заголовок, возможности и ссылку на запись', async () => {
  await renderRoute('/');

  expect(screen.getByText('Быстрая запись на звонок')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calendar');
  const book = screen.getAllByRole('link', { name: 'Записаться' });
  expect(book.at(-1)).toHaveAttribute('href', '/book');

  const features = screen.getByRole('heading', { name: 'Возможности' }).parentElement!;
  expect(within(features).getAllByRole('listitem')).toHaveLength(3);
});
