# apps/api

NestJS 12, ESM, TypeORM, Vitest. Rules: [api-nestjs](../../.claude/rules/api-nestjs.md),
[database](../../.claude/rules/database.md), [testing](../../.claude/rules/testing.md),
[security](../../.claude/rules/security.md).

## Layout

```
src/modules/<feature>/   controller, service, dto/, entities/, <feature>.module.ts, specs
src/infrastructure/      config, database (+ migrations, seeds), cache, logging, messaging
src/common/              guards, decorators, enums, interfaces, pagination, utils
src/setup-app.ts         HTTP setup shared by main.ts and e2e tests
test/                    e2e specs and helpers
```

## Conventions

- Relative imports end in `.js` (ESM) and type-only imports use `import type`.
- Routes are under `/api/v1`; `/api/health/live` (process) and `/api/health/ready` (database, Redis) are version neutral. Swagger is at `/api/docs`.
- Config comes from `ConfigService<EnvironmentVariables, true>`; add new variables to
  `env.validation.ts` (with a local default) and `.env.example`.
- `vehicles` is the reference module: copy its shape for new features (`/new-module`).

## Add a module

Use `/new-module <name>`, or by hand: create the folder files, add the entity to the module's
`TypeOrmModule.forFeature`, import the module in `app.module.ts`, add a service spec and an e2e case.

## Add a migration

Change the entity, run `pnpm db:migrate` first, then
`pnpm db:migrate:generate src/infrastructure/database/migrations/<Name>` from the repo root. Read the SQL,
apply it, revert and re-apply to prove `down`. Never edit an applied migration. Use `/new-migration`.

## Tests

`pnpm --filter api test` (unit, no I/O) and `pnpm --filter api test:e2e` (real Postgres and Redis,
database `<name>_test`). Guide: [testing](../../docs/guides/testing.md).
