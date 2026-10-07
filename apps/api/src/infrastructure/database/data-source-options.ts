import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

export const ENTITIES_GLOB = join(
  import.meta.dirname,
  '../../modules/**/entities/*.entity.{ts,js}',
);
export const MIGRATIONS_GLOB = join(import.meta.dirname, 'migrations/*.{ts,js}');

/**
 * Shared connection settings, identical in dev and prod. Schema changes go through migrations only: never
 * `synchronize`, and no `migrationsRun` either, so migrating is its own deploy step (`pnpm db:migrate`).
 */
export function buildBaseOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    synchronize: false,
    // Built-in gen_random_uuid() (Postgres 13+) keeps migrations free of extension setup.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  };
}
