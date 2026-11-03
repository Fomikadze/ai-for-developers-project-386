import { createBrowserRouter, type RouteObject } from 'react-router';
import { Layout } from '../components/Layout';
import { AdminPage } from '../pages/admin/AdminPage';
import { BookCatalogPage } from '../pages/book-catalog/BookCatalogPage';
import { BookConfirmPage } from '../pages/book-confirm/BookConfirmPage';
import { BookSlotPage } from '../pages/book-slot/BookSlotPage';
import { BookSuccessPage } from '../pages/book-success/BookSuccessPage';
import { HomePage } from '../pages/home/HomePage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: (
      <Layout>
        <NotFoundPage />
      </Layout>
    ),
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/book', element: <BookCatalogPage /> },
      { path: '/book/success', element: <BookSuccessPage /> },
      { path: '/book/:meetingTypeId', element: <BookSlotPage /> },
      { path: '/book/:meetingTypeId/confirm', element: <BookConfirmPage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
