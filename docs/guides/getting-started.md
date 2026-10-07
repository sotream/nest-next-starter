# Getting started

## Prerequisites

- Node 24 or newer (the current LTS). With nvm: `nvm install && nvm use` (reads `.nvmrc`).
- pnpm through Corepack: `corepack enable`. The version comes from `packageManager`.
- Docker with Compose v2.

## First run

```bash
pnpm install
cp .env.example .env        # APP_ENV is required and has no default
pnpm infra:up               # Postgres, Redis, Kafka, Kafka UI; waits until healthy
pnpm db:migrate && pnpm db:seed
pnpm dev                    # API on :4000, web on :3000
```

`APP_ENV` (`dev` or `prod`) must be set or the API refuses to start; `.env.example` sets `dev`. Every
other default in `apps/api/src/infrastructure/config/env.validation.ts` matches `docker-compose.yml`.
See `.env.example` for every variable. `APP_ENV=prod` enforces strong secrets, see
the [deployment guide](deployment.md).

## URLs

| What       | URL                                    |
| ---------- | -------------------------------------- |
| Web app    | http://localhost:3000                  |
| API        | http://localhost:4000/api/v1           |
| Swagger UI | http://localhost:4000/api/docs         |
| Health     | http://localhost:4000/api/health/ready |
| Kafka UI   | http://localhost:8080                  |

Swagger UI is served only when `APP_ENV=dev`.

## Seed users (local development only)

| Role  | Email             | Password         |
| ----- | ----------------- | ---------------- |
| Admin | admin@example.com | `Admin123!local` |
| User  | user@example.com  | `User123!local`  |

## When a port is already taken

Another project may already use 5432 or 8080. Edit your root `.env` (git-ignored) and override the host
port; set `DATABASE_URL` to match when you change Postgres:

```bash
POSTGRES_PORT=5433
DATABASE_URL=postgres://app:app@localhost:5433/app
KAFKA_UI_PORT=8081
```

## Web app configuration

The web app calls `http://localhost:4000` by default. To change it, set `NEXT_PUBLIC_API_URL` in
`apps/web/.env.local` (Next.js reads env files from the app folder, not the repo root).

## Everyday commands

| Command           | What it does                                         |
| ----------------- | ---------------------------------------------------- |
| `pnpm dev`        | API and web in watch mode                            |
| `pnpm lint`       | ESLint in every app                                  |
| `pnpm typecheck`  | TypeScript without emitting                          |
| `pnpm test`       | Unit tests                                           |
| `pnpm test:e2e`   | API end-to-end tests (needs `pnpm infra:up`)         |
| `pnpm build`      | Production builds                                    |
| `pnpm infra:down` | Stop the containers (data is kept in Docker volumes) |
