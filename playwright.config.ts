import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 60000, // Tăng timeout cho test
  expect: {
    timeout: 10000, // Tăng timeout cho assertions
  },
  reporter: [
    ['line'],
    ['junit', { outputFile: '/artifacts/results.xml' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000, // Timeout cho navigation
  },
  projects: [
    {
        name: 'pvi-chrome',
        use: { baseURL: process.env.PVI_BASE_URL || 'http://localhost:3000', ...devices['Desktop Chrome'] },
        testDir: 'tests/pvi',
    },
    {   
        name: 'tpa-chrome',
        use: { baseURL: process.env.TPA_BASE_URL || 'http://localhost:3000', ...devices['Desktop Chrome'] },
        testDir: 'tests/tpa',
    },
  ],
});