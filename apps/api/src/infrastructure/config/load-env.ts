import { resolve } from 'node:path';

/**
 * Loads the repo-root `.env` for entry points that run outside Nest (TypeORM CLI, seed).
 * Variables already in the environment win; a missing file is fine because defaults apply.
 */
export function loadRootEnv(): void {
  try {
    process.loadEnvFile(resolve(import.meta.dirname, '../../../../../.env'));
  } catch {
    // No .env file: validation defaults are used.
  }
}
