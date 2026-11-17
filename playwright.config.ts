import { existsSync } from 'node:fs';
import { defineConfig, devices, type Project } from '@playwright/test';

// Default: tests run against the test build (`npm run build:test`) served by `astro preview`.
// BASE_URL=https://mindsecurity.org npm run test:live runs the same suite against a deployed site.
const live = process.env.BASE_URL;
// Sandboxed runners reach the internet only through an HTTPS proxy; hand it to the browser explicitly.
const proxyServer = live ? process.env.HTTPS_PROXY || process.env.https_proxy : undefined;

// Browsers installed on this machine but not in CI: the real Brave, and Chromium on the real GPU.
function localBrowsers(): Project[] {
  if (process.env.CI) return [];
  const out: Project[] = [];
  const gpu = ['--use-angle=vulkan', '--ignore-gpu-blocklist', '--enable-gpu'];
  if (existsSync('/usr/bin/brave')) {
    out.push({ name: 'brave', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { executablePath: '/usr/bin/brave' } } });
    out.push({ name: 'brave-gpu', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { executablePath: '/usr/bin/brave', args: gpu } } });
  }
  out.push({ name: 'chrome-gpu', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, launchOptions: { args: gpu } } });
  return out;
}

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
    // Chromium (Chrome, Edge, Brave, Opera, Samsung Internet), Gecko (Firefox) and WebKit (Safari, every iOS browser).
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'tablet', use: { ...devices['iPad Pro 11'] } },
    ...localBrowsers(),
  ],
  webServer: live ? undefined : {
    command: 'npx astro preview --port 4321 --host 127.0.0.1 --ignore-lock',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
