import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import i18n from '../../app/i18n';
import { HomePage } from './HomePage';

it('показывает бейдж, заголовок, возможности и ссылку на запись', async () => {
  await i18n.changeLanguage('ru');
  render(
    <MantineProvider>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </I18nextProvider>
    </MantineProvider>,
  );

  expect(screen.getByText('Быстрая запись на звонок')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calendar');
  expect(screen.getByRole('link', { name: 'Записаться' })).toHaveAttribute('href', '/book');

  const features = screen.getByRole('heading', { name: 'Возможности' }).parentElement!;
  expect(within(features).getAllByRole('listitem')).toHaveLength(3);
});
