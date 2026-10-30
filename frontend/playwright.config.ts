import { defineConfig } from '@playwright/test';

// Сервер разработки поднимается снаружи: `mise daemons start`.
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173' },
});
