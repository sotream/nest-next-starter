import type { AppEnv } from '../../config/env.validation.js';

/** Seed users have publicly documented passwords, so they must never be created in prod. */
export function assertSeedAllowed(appEnv: AppEnv): void {
  if (appEnv === 'prod') {
    throw new Error('Refusing to seed: APP_ENV=prod. The seed creates users with known passwords.');
  }
}
