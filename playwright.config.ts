import { defineConfig, devices } from '@playwright/test';

// Default: tests run against the test build (`npm run build:test`) served by `astro preview`.
// BASE_URL=https://mindsecurity.org npm run test:live runs the same suite against a deployed site.
const live = process.env.BASE_URL;
// Sandboxed runners reach the internet only through an HTTPS proxy; hand it to the browser explicitly.
const proxyServer = live ? process.env.HTTPS_PROXY || process.env.https_proxy : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: live ?? 'http://localhost:4321',
    trace: 'off',
    proxy: proxyServer ? { server: proxyServer } : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: live ? undefined : {
    command: 'npx astro preview --port 4321 --host 127.0.0.1 --ignore-lock',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
