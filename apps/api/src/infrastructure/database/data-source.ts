import { DataSource } from 'typeorm';
import { loadRootEnv } from '../config/load-env.js';
import { validateEnv } from '../config/env.validation.js';
import { ENTITIES_GLOB, MIGRATIONS_GLOB, buildBaseOptions } from './data-source-options.js';

loadRootEnv();

/**
 * Entry point for the TypeORM CLI (`pnpm db:migrate*`) and the seed script. Entities are found by
 * glob here; the running app registers them through `forFeature` instead (`autoLoadEntities`).
 */
export default new DataSource({
  ...buildBaseOptions(validateEnv(process.env).DATABASE_URL),
  entities: [ENTITIES_GLOB],
  migrations: [MIGRATIONS_GLOB],
});
