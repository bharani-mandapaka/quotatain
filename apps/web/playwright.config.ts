import { defineConfig, devices } from '@playwright/test'

// Switch to localhost while Vercel preview protection is active
// Change back to Vercel URL once protection is disabled or bypass secret is configured
const BASE_URL = process.env.TEST_BASE_URL ??
  'https://quotatain-web-git-feat-new-design-meetbharani91-5980s-projects.vercel.app'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,         // Run sequentially — tests share session state
  forbidOnly: false,
  retries: 1,
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: true,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': 'xkCH9Ghmp5NQFDeB1edd8TlLIFBkPiBD',
    },
  },

  projects: [
    // Auth setup runs first, saves session to file
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // All other tests reuse the saved session
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/session.json',
      },
      dependencies: ['setup'],
    },
  ],
})
