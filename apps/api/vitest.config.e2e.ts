import { defineConfig } from 'vitest/config';
import { loadRootEnv } from './src/infrastructure/config/load-env.js';
import { DEFAULT_DATABASE_URL } from './src/infrastructure/config/defaults.js';
import { toTestDatabaseUrl } from './test/helpers/test-database-url.js';

loadRootEnv();

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['reflect-metadata'],
    fileParallelism: false,
    // Separate database so e2e runs never touch development data.
    env: {
      DATABASE_URL: toTestDatabaseUrl(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL),
      APP_ENV: 'dev',
      LOG_LEVEL: 'silent',
    },
  },
});
