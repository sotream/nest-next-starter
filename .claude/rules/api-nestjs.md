---
paths:
  - 'apps/api/**'
---

# NestJS API

Layout and rationale: [architecture](../../docs/architecture/overview.md), [ADR 0001](../../docs/adr/0001-modular-monolith.md).

- A feature lives in `src/modules/<feature>/` with `controller`, `service`, `dto/`, `entities/`.
  Cross-cutting technical code goes in `src/infrastructure/`, shared helpers in `src/common/`.
- Controllers translate HTTP only; rules live in services. Use TypeORM repositories directly.
- Every input is a DTO with `class-validator` decorators. The global pipe whitelists and rejects
  unknown fields, so never accept `ownerId` or `role` from a body.
- Every route is protected unless marked `@Public()`. Use `@Roles()` for role limits and
  `@CurrentUser()` for the caller.
- Throw Nest HTTP exceptions with a message a client can act on. Map unique-constraint errors to 409
  with `isUniqueViolation`. Report someone else's resource as 404, not 403.
- Document each route: `@ApiTags`, `@ApiOperation`, response decorators, `@ApiBearerAuth` where needed.
  Give DTO fields `@ApiProperty`.
- New settings go in `env.validation.ts` with a default that works locally (`APP_ENV` is the one required variable), and in `.env.example`.
- Register entities with `TypeOrmModule.forFeature` in their module.
