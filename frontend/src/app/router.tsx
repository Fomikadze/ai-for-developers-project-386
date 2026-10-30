import { Outlet, createBrowserRouter } from 'react-router';
import { Header } from '../components/Header';
import { HomePage } from '../pages/home/HomePage';

function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  { element: <Layout />, children: [{ path: '/', element: <HomePage /> }] },
]);
