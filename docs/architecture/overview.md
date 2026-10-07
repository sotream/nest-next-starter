# Architecture overview

A pnpm monorepo with two apps and local infrastructure. Decisions are recorded in [../adr](../adr).

```mermaid
flowchart LR
  Browser["Browser<br/>Next.js :3000"] -->|"HTTPS JSON + cookie"| API["NestJS API :4000"]
  API --> PG[("PostgreSQL")]
  API --> Redis[("Redis<br/>rate limits")]
  API -. "optional" .-> Kafka[["Kafka"]]
  Kafka -. "optional" .-> API
  KafkaUI["Kafka UI :8080"] --> Kafka
```

Apps run on the host; Docker Compose only runs PostgreSQL, Redis, Kafka and Kafka UI.

## API modules

```
apps/api/src
├── main.ts, setup-app.ts      bootstrap and HTTP setup shared with e2e tests
├── app.module.ts              wires modules and global guards
├── common/                    guards, decorators, pagination, db error helper
├── infrastructure/
│   ├── config/                env validation (fails fast), root .env loader
│   ├── database/              TypeORM options, CLI data source, migrations, seed
│   ├── cache/                 Redis client, Redis-backed throttler storage
│   ├── logging/               pino setup and redaction list
│   └── messaging/             EventPublisher port, Kafka and no-op adapters
├── health/                    /api/health/live, /api/health/ready (database, Redis)
└── modules/
    ├── auth/                  sign-up, sign-in, refresh, logout, me
    ├── users/entities/        User entity (owned by auth for now)
    └── vehicles/              example CRUD, publishes vehicle.created
```

## Request flow

```mermaid
sequenceDiagram
  participant C as Client
  participant H as Helmet / CORS / cookie-parser
  participant T as ThrottlerGuard
  participant J as JwtAuthGuard
  participant R as RolesGuard
  participant P as ValidationPipe
  participant S as Controller and Service
  C->>H: HTTP request
  H->>T: count hit in Redis
  T-->>C: 429 when over the limit
  T->>J: verify Bearer token (skipped for @Public)
  J-->>C: 401 when missing or invalid
  J->>R: check @Roles
  R-->>C: 403 when role is missing
  R->>P: validate and transform body
  P-->>C: 400 on unknown or invalid fields
  P->>S: handler
  S-->>C: JSON response
```

Routes live under `/api` with URI version `v1` (for example `/api/v1/vehicles`). `/api/health/live` and `/api/health/ready` are
version neutral. Swagger UI is at `/api/docs`.

## Authentication flow

```mermaid
sequenceDiagram
  participant W as Web app
  participant A as API
  participant D as Database
  W->>A: POST /auth/sign-in
  A->>D: store hash of refresh token (new family)
  A-->>W: access token in body, refresh token in httpOnly cookie
  W->>A: GET /vehicles with Bearer access token
  A-->>W: 401 once the access token expires
  W->>A: POST /auth/refresh (cookie sent automatically)
  A->>D: revoke old token, insert new token in same family
  A-->>W: new access token and rotated cookie
  W->>A: retry the original request once
  Note over A,D: A revoked token presented again revokes the whole family
```

See [ADR 0002](../adr/0002-auth-refresh-rotation.md) for the reasoning and its limits.

## Web app

`apps/web` is a Next.js App Router app. Pages are client components behind an `AuthProvider`; the
access token lives in memory inside `lib/api-client.ts`, which also retries a request once after a
refresh and shares a single refresh between parallel requests.
