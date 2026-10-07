# Database and migrations

PostgreSQL through TypeORM. `synchronize` is off everywhere: the schema changes only through
committed migrations in `apps/api/src/infrastructure/database/migrations`.

## Changing the schema

1. Edit or add an entity under `src/modules/<feature>/entities/`.
2. Make sure the database is migrated to the current state: `pnpm db:migrate`.
3. Generate the migration from the difference:
   `pnpm db:migrate:generate src/infrastructure/database/migrations/<DescriptiveName>`
4. Read the generated SQL. Check it for data loss, long locks and a working `down`
   (the `/new-migration` command and the migration-reviewer agent do this).
5. Apply it with `pnpm db:migrate`, then run `pnpm test:e2e`.

Roll back the latest migration with `pnpm db:migrate:revert`.

## Rules

- Never edit a migration that has been applied anywhere shared. Add a new one instead.
- Do not add Postgres extensions. UUIDs use the built-in `gen_random_uuid()`.
- Column names are camelCase, matching the entity properties. Table names are plural snake_case.
- Register every new entity with `TypeOrmModule.forFeature([...])` in its module.

## Seed data

`pnpm db:seed` refuses to run when `APP_ENV=prod`. It upserts two users and three vehicles by email and plate number, so it can run any number
of times. The credentials are documented in [Getting started](getting-started.md) and are for local use
only.

## Test database

`pnpm test:e2e` uses a separate database named `<your database>_test` (for example `app_test`). It is
created if missing and migrated with `pnpm db:migrate`, so e2e also proves the migrations work on an
empty database. Development data is never touched.
