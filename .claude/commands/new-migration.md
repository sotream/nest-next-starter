---
description: Generate a migration from entity changes, review it, and apply it
argument-hint: <DescriptiveName, e.g. AddInvoices>
allowed-tools: Read, Bash(pnpm *), Bash(git *), Bash(docker compose *)
---

Create the migration `$ARGUMENTS`. Follow `.claude/rules/database.md`.

1. Make sure Postgres is up (`docker compose ps`; start with `pnpm infra:up` if not) and migrated:
   `pnpm db:migrate`.
2. Generate: `pnpm db:migrate:generate src/infrastructure/database/migrations/$ARGUMENTS`.
   If it reports no changes, stop and tell the user.
3. Read the generated file. Delegate to the `migration-reviewer` agent and fix anything it flags in
   the migration or the entity (regenerate rather than hand-editing when the cause is the entity).
4. Apply with `pnpm db:migrate`, then `pnpm db:migrate:revert` and `pnpm db:migrate` again to prove
   the `down` works.
5. Run `pnpm test:e2e` and report the migration name, what it changes, and the reviewer's verdict.
