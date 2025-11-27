import { defineConfig, devices } from '@playwright/test'

/**
 * Read https://playwright.dev/docs/test-configuration for more information
 */
export default defineConfig({
  testDir: './__webtests__',
  /* TypeScript Configuration */
  // Use dedicated TypeScript configuration file
  // @ts-ignore
  // Playwright automatically looks for tsconfig.json, but we can specify via env var
  /* Maximum number of tests to run in parallel */
  fullyParallel: true,
  /* Retry in CI if test fails */
  retries: process.env.CI ? 2 : 0,
  /* Disable parallel execution in CI */
  workers: process.env.CI ? 1 : undefined,
  /* Test reporter configuration */
  // Use list reporter for detailed console output, suitable for CI/CD
  // Use dot reporter (concise) in CI, list reporter (detailed) locally
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'test-results/results.json' }]] : [['list'], ['html', { open: 'never' }]],
  /* Shared test configuration */
  use: {
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    /* Screenshot configuration */
    screenshot: 'only-on-failure',
    /* Video configuration */
    video: 'retain-on-failure',
    /* Base URL, allows using relative paths in tests */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
  },

  /* Configure test projects */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use headless mode in CI environment
        headless: true,
      },
    },

    // Test against other browsers during local development
    // Only test chromium in CI to save time
    ...(process.env.CI
      ? []
      : [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]),
  ],

  /* Run local development server - E2E Demo */
  webServer: {
    command: 'pnpm dev:e2e',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
