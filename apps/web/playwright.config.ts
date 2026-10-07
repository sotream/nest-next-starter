import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

/**
 * Browser tests run against the built apps (`pnpm build` first) and a migrated, seeded database
 * (`pnpm infra:up && pnpm db:migrate && pnpm db:seed`). Locally, already running servers are reused.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter api start:prod',
      url: 'http://localhost:4000/api/health/ready',
      cwd: '../..',
      env: { APP_ENV: 'dev' },
      reuseExistingServer: !isCi,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter web start',
      url: 'http://localhost:3000/sign-in',
      cwd: '../..',
      reuseExistingServer: !isCi,
      timeout: 60_000,
    },
  ],
});
