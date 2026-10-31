import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import i18n from '../app/i18n';
import { Header } from './Header';

function renderHeader(path = '/') {
  return render(
    <MantineProvider>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[path]}>
          <Header />
        </MemoryRouter>
      </I18nextProvider>
    </MantineProvider>,
  );
}

it('показывает ссылки и переключает язык', async () => {
  await i18n.changeLanguage('ru');
  renderHeader();

  expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Админка' })).toHaveAttribute('href', '/admin');

  await userEvent.click(screen.getByText('EN'));

  expect(await screen.findByRole('link', { name: 'Admin' })).toBeInTheDocument();
});

it('подсвечивает ссылку текущего раздела', async () => {
  await i18n.changeLanguage('ru');
  renderHeader('/admin');

  expect(screen.getByRole('link', { name: 'Админка' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Записаться' })).not.toHaveAttribute('aria-current');
});
