# 0006. Toolchain choices that differ from the defaults

- Status: accepted
- Date: 2026-10-07

## Context

Versions were chosen by checking peer ranges and running the result, not by taking the newest tag.

## Decision

| Choice                                         | Reason                                                                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS 12 in ESM with Vitest                   | Nest 12 packages are ESM-only, which rules out the CommonJS setup Jest relies on. Vitest is the test runner Nest 12 itself scaffolds.  |
| TypeScript 6.x, not 7                          | `typescript-eslint` supports `<6.1` and `@nestjs/swagger` supports `^5.5 \|\| ^6`.                                                     |
| ESLint 10 with flat config                     | `eslint-config-next` 16.4 declares peers up to ESLint 9, but its React, hooks and a11y rules were verified to run under ESLint 10.     |
| `ioredis` 5, not 6                             | TypeORM's declared optional peer is `^5`; avoiding an unmet peer keeps `pnpm install` quiet.                                           |
| Own `ThrottlerStorage` on `ioredis`            | `@nest-lab/throttler-storage-redis` only declares support up to Nest 11. The adapter is about 50 lines, atomic through one Lua script. |
| `gen_random_uuid()` and no Postgres extensions | Built into Postgres 13+, so the migration runs on an empty database without superuser setup.                                           |
| Entities registered with `forFeature`          | The running app never imports TypeScript files by glob; the glob is only used by the TypeORM CLI.                                      |
| Tailwind through `@tailwindcss/turbopack`      | The setup `create-next-app` generates for Next 16.4.                                                                                   |

## Consequences

- Imports of relative files in the API end in `.js`, as ESM requires.
- Revisit this table when Nest, TypeScript tooling or Next publish newer peer ranges.
