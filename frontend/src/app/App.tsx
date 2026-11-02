import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router';
import i18n from './i18n';
import { router } from './router';
import { theme } from './theme';

const queryClient = new QueryClient();

/** Провайдеры приложения без роутера: Mantine, уведомления, Query, i18n. */
export function AppProviders({
  children,
  client = queryClient,
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
