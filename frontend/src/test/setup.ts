import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Медленный раннер CI не успевает отрисовать Mantine за 1 с, которую Testing Library ждёт по умолчанию.
configure({ asyncUtilTimeout: 5000 });

// Mantine использует matchMedia и ResizeObserver, которых нет в jsdom.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
  onchange: null,
})) as typeof window.matchMedia;

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
