# nest-next-starter

Fullstack starter: NestJS API (`apps/api`) and Next.js web app (`apps/web`) in a pnpm and Turborepo
monorepo. People clone it to start projects, so favour clarity and small, easy-to-replace code.

## Stack

Node 22, pnpm, Turborepo, TypeScript strict. API: NestJS 12 (ESM), TypeORM, PostgreSQL, Redis, optional
Kafka, Vitest. Web: Next.js App Router, React, Tailwind. Infra in `docker-compose.yml` only.

## Commands

```bash
pnpm install && pnpm infra:up && pnpm db:migrate && pnpm db:seed && pnpm dev
pnpm lint | typecheck | test | test:e2e | build     # test:e2e needs pnpm infra:up
pnpm db:migrate:generate src/infrastructure/database/migrations/<Name>   # path is relative to apps/api
```

## Architecture in five lines

1. Modular monolith: `apps/api/src/modules/<feature>/` (controller, service, `dto/`, `entities/`).
2. Technical concerns in `src/infrastructure/`, shared helpers in `src/common/`.
3. TypeORM repositories are used directly; the only port is `EventPublisher` (Kafka adapter, no-op default).
4. Auth: short JWT access token in memory, rotating httpOnly refresh cookie with reuse detection.
5. Everything requires a token unless `@Public()`; services enforce ownership.

More: [architecture](docs/architecture/overview.md), [ADRs](docs/adr), [guides](docs/guides).

## Hard rules

- No `any`. Use interfaces, generics, or `unknown` with narrowing.
- Before finishing any task run `pnpm lint`, `pnpm typecheck` and `pnpm test` (and `pnpm build` when
  you changed build-affecting code). Use `/verify`. Do not claim something works without running it.
- Never read or print `.env` files or secrets. Schema changes only through generated migrations.
- Conventional Commits, small changes. Do not commit `docs/private/` or `docs/notes/`.
- Comments explain why, not what. Delete unused code. No abstraction without a second use.

## Where the rules are

`.claude/rules/` (typescript, api-nestjs, web-nextjs, database, testing, security, git-and-commits).
Subagents in `.claude/agents/`, slash commands in `.claude/commands/`. Area guides:
[api](apps/api/CLAUDE.md), [web](apps/web/CLAUDE.md). How to work with them:
[AI agent workflow](docs/guides/ai-agent-workflow.md).
