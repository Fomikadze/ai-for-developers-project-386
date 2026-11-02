import { createBrowserRouter, type RouteObject } from 'react-router';
import { Layout } from '../components/Layout';
import { AdminPage } from '../pages/admin/AdminPage';
import { BookCatalogPage } from '../pages/book-catalog/BookCatalogPage';
import { BookSlotPage } from '../pages/book-slot/BookSlotPage';
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
      { path: '/book/:meetingTypeId', element: <BookSlotPage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
