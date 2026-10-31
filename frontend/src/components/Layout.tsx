import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header';
import classes from './Layout.module.css';

// children нужен для errorElement: там Outlet пустой.
export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className={classes.root}>
      <Header />
      <main>{children ?? <Outlet />}</main>
    </div>
  );
}
