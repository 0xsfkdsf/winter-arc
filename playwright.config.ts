import { defineConfig } from '@playwright/test';

// Drives the real installed-Chrome against the local production build.
// Server is expected on :5173 (vite preview of dist/); start it with:
//   npx vite preview --port 5173 --strictPort
export default defineConfig({
  testDir: './e2e',
  timeout: 90000,
  expect: { timeout: 8000 },
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1360, height: 900 },
  },
  reporter: [['list']],
});
