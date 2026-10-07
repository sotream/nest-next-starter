import { execFileSync } from 'node:child_process';
import pg from 'pg';

async function ensureDatabaseExists(url: string): Promise<void> {
  const name = new URL(url).pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!rowCount) {
      // Identifier comes from our own config, not user input; CREATE DATABASE cannot be parameterised.
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Creates the test database if needed and applies migrations with the same command developers run,
 * so e2e also verifies that migrations work on an empty database.
 */
export async function prepareDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set for e2e');
  }
  await ensureDatabaseExists(url);
  execFileSync('pnpm', ['db:migrate'], { env: process.env, stdio: 'pipe' });
}
