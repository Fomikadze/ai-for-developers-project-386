import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider, createMemoryRouter } from 'react-router';
import i18n from '../../app/i18n';
import { routes } from '../../app/router';

it('показывает 404 с шапкой на неизвестном пути', async () => {
  await i18n.changeLanguage('ru');
  render(
    <MantineProvider>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/book'] })} />
      </I18nextProvider>
    </MantineProvider>,
  );

  expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
});
