import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 60000, // Tăng timeout cho test
  expect: {
    timeout: 10000, // Tăng timeout cho assertions
  },
  // Global setup để login một lần
  globalSetup: require.resolve('./global-setup'),
  reporter: [
    ['line'],
    ['junit', { outputFile: '/artifacts/results.xml' }],
    ['html', { 
      outputFolder: 'playwright-report', 
      open: 'never',
      // Không attach trace vào HTML report để tránh lộ credentials
      attachments: false 
    }],
  ],
  use: {
    trace: 'off', // Tắt trace để không ghi lại sensitive data
    screenshot: 'only-on-failure',
    video: 'on',
    navigationTimeout: 30000, // Timeout cho navigation
  },
  projects: [
    {
        name: 'pvi-chrome',
        use: { 
          baseURL: process.env.PVI_BASE_URL || 'http://localhost:3000', 
          ...devices['Desktop Chrome'],
          // Sử dụng storage state đã lưu
          storageState: '.auth/pvi-user.json',
        },
        testDir: 'tests/pvi',
    },
    {   
        name: 'tpa-chrome',
        use: { 
          baseURL: process.env.TPA_BASE_URL || 'http://localhost:3000', 
          ...devices['Desktop Chrome'],
          // Sử dụng storage state đã lưu
          storageState: '.auth/tpa-user.json',
        },
        testDir: 'tests/tpa',
    },
    {   
        name: 'diginotes-chrome',
        use: { 
          baseURL: process.env.DIGINOTES_BASE_URL || 'http://localhost:3000', 
          ...devices['Desktop Chrome'],
          // Sử dụng storage state đã lưu
          storageState: '.auth/diginotes-user.json',
        },
        testDir: 'tests/diginotes',
        fullyParallel: false,
        workers: 1
    },
  ],
});