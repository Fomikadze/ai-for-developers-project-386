import { screen, waitFor } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute';

it('прямой заход без брони ведёт на /book', async () => {
  const { router } = await renderRoute('/book/success', {
    api: { 'GET /api/owner': { body: {} }, 'GET /api/meeting-types': { body: [] } },
  });
  await waitFor(() => expect(router.state.location.pathname).toBe('/book'));
  expect(screen.queryByText('Запись подтверждена')).not.toBeInTheDocument();
});
