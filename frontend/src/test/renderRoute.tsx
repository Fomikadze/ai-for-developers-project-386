import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { AppProviders } from '../app/App';
import i18n from '../app/i18n';
import { routes } from '../app/router';
import { mockApi, type ApiHandlers } from './mockApi';

/**
 * Рендерит приложение по маршруту в провайдерах приложения (роутер, Query, Mantine, i18n).
 * Ответы API подменяются на уровне `fetch`, который вызывает SDK.
 */
export async function renderRoute(
  path: string,
  { api = {}, language = 'ru' }: { api?: ApiHandlers; language?: 'ru' | 'en' } = {},
) {
  await i18n.changeLanguage(language);
  const fetchMock = mockApi(api);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <AppProviders client={client}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...view, router, fetchMock };
}
