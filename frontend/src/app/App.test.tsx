import { render, screen } from '@testing-library/react';
import { App } from './App';

it('рендерит главную страницу внутри провайдеров и роутера', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument();
});
