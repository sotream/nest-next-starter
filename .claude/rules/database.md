---
paths:
  - 'apps/api/src/infrastructure/database/**'
  - 'apps/api/src/modules/**/entities/**'
---

# Database

Workflow and commands: [database guide](../../docs/guides/database-and-migrations.md).

- `synchronize` stays `false`. Schema changes are migrations, generated from entities against a real
  database (`pnpm db:migrate:generate`), then read and committed.
- Never edit a migration that has been applied outside your machine. Add a new one.
- A migration must have a working `down`, avoid long locks on big tables (add nullable column, then
  backfill, then constrain) and never drop data without an explicit decision.
- No Postgres extensions: use `gen_random_uuid()`.
- Table names are plural snake_case (`refresh_tokens`); columns follow entity property names (camelCase).
- Index every foreign key column. Mark deletion behaviour explicitly (`onDelete`).
- Keep the seed idempotent: look up by a natural key before inserting.
