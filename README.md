# nest-next-starter

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

> Replace `OWNER/REPO` in the badge above with the GitHub path of your repository.

A fullstack monorepo to start new projects from: a NestJS API with auth, a database and an optional
message broker, and a Next.js web app. Clone it, run four commands, and you have a working sign-in and
a vehicles CRUD with tests, CI and conventions that are easy for people and AI agents to extend.

## What's included

| Area      | Choice                                                                                  |
| --------- | --------------------------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces, Turborepo, Node 22                                                     |
| API       | NestJS 12, TypeORM with migrations, PostgreSQL, Redis, Swagger, Terminus health checks  |
| Auth      | JWT access token, rotating httpOnly refresh cookie with reuse detection, roles          |
| Safety    | Env validation, Helmet, CORS, validation pipe, Redis rate limiting, pino with redaction |
| Messaging | Optional Kafka (KRaft) behind an `EventPublisher` port, Kafka UI                        |
| Web       | Next.js App Router, React, Tailwind CSS                                                 |
| Quality   | TypeScript strict, ESLint flat config, Prettier, Husky, lint-staged, commitlint         |
| Testing   | Vitest, Supertest, Playwright, e2e against real Postgres and Redis, GitHub Actions      |
| AI agents | Claude Code rules, subagents and commands in `.claude/`                                 |

## Prerequisites

- Node 22.13+ (`nvm install && nvm use` reads `.nvmrc`)
- pnpm via Corepack (`corepack enable`)
- Docker with Compose v2

## Quick start

```bash
pnpm install
cp .env.example .env   # APP_ENV is required
pnpm infra:up
pnpm db:migrate && pnpm db:seed
pnpm dev
```

`APP_ENV=dev` in `.env` is required. If port 5432 or 8080 is already used on your machine, see
[Getting started](docs/guides/getting-started.md#when-a-port-is-already-taken).

## Local URLs and seed users

| What       | URL                                    |
| ---------- | -------------------------------------- |
| Web app    | http://localhost:3000                  |
| API        | http://localhost:4000/api/v1           |
| Swagger UI | http://localhost:4000/api/docs         |
| Health     | http://localhost:4000/api/health/ready |
| Kafka UI   | http://localhost:8080                  |

| Role  | Email               | Password         |
| ----- | ------------------- | ---------------- |
| Admin | `admin@example.com` | `Admin123!local` |
| User  | `user@example.com`  | `User123!local`  |

These credentials exist for local development only. Never seed them anywhere reachable from the internet.

## Scripts

| Script                              | What it does                                     |
| ----------------------------------- | ------------------------------------------------ |
| `pnpm dev`                          | API and web in watch mode                        |
| `pnpm build`                        | Production build of both apps                    |
| `pnpm lint` / `pnpm typecheck`      | ESLint and TypeScript checks                     |
| `pnpm test` / `pnpm test:e2e`       | Unit tests / API end-to-end tests                |
| `pnpm test:browser`                 | Playwright browser tests (build and seed first)  |
| `pnpm format` / `pnpm format:check` | Prettier write / check                           |
| `pnpm infra:up` / `pnpm infra:down` | Start or stop PostgreSQL, Redis, Kafka, Kafka UI |
| `pnpm db:migrate`                   | Apply migrations                                 |
| `pnpm db:migrate:generate <path>`   | Generate a migration from entity changes         |
| `pnpm db:migrate:revert`            | Revert the latest migration                      |
| `pnpm db:seed`                      | Insert sample users and vehicles (idempotent)    |

## Project structure

```
apps/
  api/   NestJS: src/modules, src/infrastructure, src/common, test/
  web/   Next.js: src/app, src/components, src/lib
docs/    architecture, ADRs, guides
.claude/ rules, subagents and commands for Claude Code
```

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- Decisions: [0001 Modular monolith](docs/adr/0001-modular-monolith.md),
  [0002 Refresh rotation](docs/adr/0002-auth-refresh-rotation.md),
  [0003 Logging](docs/adr/0003-pino-logging.md),
  [0004 pnpm and Turborepo](docs/adr/0004-pnpm-turborepo.md),
  [0005 Optional Kafka](docs/adr/0005-kafka-optional.md),
  [0006 Toolchain choices](docs/adr/0006-toolchain-choices.md),
  [0007 No trust proxy](docs/adr/0007-no-trust-proxy.md),
  [0008 Rate limiting fails open](docs/adr/0008-throttler-redis-fail-open.md),
  [0009 CSP allows inline scripts](docs/adr/0009-csp-unsafe-inline.md)
- Guides: [Getting started](docs/guides/getting-started.md),
  [Database and migrations](docs/guides/database-and-migrations.md),
  [Authentication](docs/guides/authentication.md),
  [Kafka walkthrough](docs/guides/kafka-exercise.md),
  [Testing](docs/guides/testing.md),
  [Working with Claude Code](docs/guides/ai-agent-workflow.md)

## Using this as a template

On GitHub choose **Use this template**, or clone and reset the history. Then:

- [ ] Replace `nest-next-starter` in the root `package.json`, `docker-compose.yml` (`name`), the CI badge
      in this file, the Swagger title in `apps/api/src/setup-app.ts` and the metadata in
      `apps/web/src/app/layout.tsx`.
- [ ] Update the copyright holder in `LICENSE`.
- [ ] Change `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID` and the database name if you do not want the defaults.
- [ ] Set a real `JWT_ACCESS_SECRET` for every deployed environment.
- [ ] Delete the example `vehicles` module when you no longer need it (module, entity, migration, seed rows).
- [ ] Keep or remove the docs you do not need, and update the ADRs you change.

## Deployment

The starter ships Dockerfiles for both apps and a reference `docker-compose.prod.yml`, but picks no
platform. Read the [deployment guide](docs/guides/deployment.md) and
[ADR 0007](docs/adr/0007-no-trust-proxy.md) before deploying behind a proxy.

## Open questions

- **Target platform** (VPS, PaaS, other). It decides whether a reverse proxy is needed; if so, revisit
  [ADR 0007](docs/adr/0007-no-trust-proxy.md) before the first deployment.
- **Repository path** for the CI badge (`OWNER/REPO` above).
- **Making the repository public.** gitleaks found nothing in the history when this was written, but run it
  again and rotate anything it reports before publishing.
- **Review the audit ignore** (`GHSA-vfj7-8cjw-p6xm`, braces) by 2026-12-07; see `auditConfig` in
  `pnpm-workspace.yaml` and the `audit` job in `.github/workflows/ci.yml`.
- **Not yet verified on real infrastructure:** CI on GitHub (nothing has run there), the production images
  behind real TLS, and Kafka outside local Docker.

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org) and are checked by a
`commit-msg` hook: `feat(api): add vehicle search`, `fix(web): keep form values on error`. Keep changes
small. Before opening a pull request run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## License

[MIT](LICENSE)
