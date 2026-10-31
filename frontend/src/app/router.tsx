import { createBrowserRouter, type RouteObject } from 'react-router';
import { Layout } from '../components/Layout';
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
