# Testing

Both apps use [Vitest](https://vitest.dev). The API also uses Supertest.

## Layers

| Kind    | Where                                              | Runs with           | Real dependencies                        |
| ------- | -------------------------------------------------- | ------------------- | ---------------------------------------- |
| Unit    | `src/**/*.spec.ts` (API), `src/**/*.test.ts` (web) | `pnpm test`         | none                                     |
| E2E     | `apps/api/test/*.e2e-spec.ts`                      | `pnpm test:e2e`     | PostgreSQL and Redis (`pnpm infra:up`)   |
| Browser | `apps/web/e2e/*.spec.ts` (Playwright)              | `pnpm test:browser` | Built apps, migrated and seeded database |

## What to mock

- Unit tests of services replace the repositories with small in-memory fakes that implement only the
  calls the service makes, and construct the service directly (`new AuthService(...)`). Prefer a fake
  that behaves over a chain of `vi.fn()` stubs: the rotation and reuse tests rely on that.
- Mock only at boundaries you do not own (network, broker). Never mock the code under test.
- E2E tests mock nothing. They boot the real `AppModule` with the same `configureApp()` as production.

## Naming

Describe behaviour, not methods: `it('revokes the whole family when a rotated token is replayed')`.
One behaviour per test. Group with `describe` by feature.

## E2E details

- `test/helpers/test-app.ts` prepares the `<db>_test` database, applies migrations, boots the app and
  offers `reset()`, which truncates tables and clears rate-limit counters. Call it in `beforeEach`.
- Logging is silent in e2e (`LOG_LEVEL=silent`).
- Auth endpoints are rate limited to 10 per minute; `reset()` clears the counters so tests do not
  interfere. One test checks the 429 behaviour on purpose.

## Browser tests

Playwright drives Chromium against the built apps. Prepare once: `pnpm infra:up`, `pnpm db:migrate`,
`pnpm db:seed`, `pnpm build`, and `pnpm --filter web exec playwright install chromium`. Then
`pnpm test:browser`. Playwright starts the API and web servers itself and reuses ones already running.
The tests sign in as the seed user, so more than a few runs within a minute hit the sign-in rate limit
(10 per minute): wait a minute or clear the `throttle:*` keys in Redis.

## CI

`.github/workflows/ci.yml` runs these jobs in parallel: `quality` (lint, typecheck, unit tests, build),
`e2e-api` and `browser` (Postgres and Redis service containers), `docker` (builds both images),
`audit` (`pnpm audit`; production dependencies gate the build, dev-only advisories do not) and `secrets`
(gitleaks over the whole commit history). Dependabot proposes weekly updates for npm, Actions and Docker.
