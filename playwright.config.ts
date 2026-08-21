import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: [
    ['html', { outputFolder: './test-results', open: 'never' }],
    ['json', { outputFile: './test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },

  projects: [
    // Default headless project (for CI / fast runs)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Headed project – opens a real browser so you can watch the tests live
    {
      name: 'chromium-headed',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: {
          // Slow down each action so you can follow along (ms). Override with SLOWMO=800
          slowMo: parseInt(process.env.SLOWMO || '700'),
        },
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
