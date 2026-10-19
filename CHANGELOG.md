# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-19

### Breaking changes and migration notes

- **Error bodies are RFC 9457 problem documents.** Every error is now `application/problem+json` with
  `type`, `title`, `status`, `detail` and a `code` extension, instead of `{ message, error, statusCode }`.
  Validation failures add `errors: [{ pointer: "#/email", detail: "..." }]` and `code: VALIDATION_FAILED`.
  Clients must read `detail` and `errors`, and branch on `status` and `code`, never on the text of
  `detail`. The bundled web client is updated; any other consumer needs the same change.
- **Access tokens issued before the update are rejected once.** They carry no `iss` or `aud`, which are
  now checked together with a pinned `HS256` algorithm. Tokens live at most 15 minutes and the web app
  refreshes its session silently, so users see nothing; API clients should request a new token.
- **Sign-up passwords are capped at 72 bytes**, not 72 characters, so multi-byte characters count more.
  Existing accounts keep working because sign-in only limits the password to 128 characters.
- **A request body that is not JSON gets 415** instead of a misleading 400 from validation.
- **Helmet and CORS now run before the body parser**, so errors for a bad or oversized body carry their
  headers. Browser scripts can now read `Retry-After`, `Location` and `X-Request-Id` (CORS
  `Access-Control-Expose-Headers`), and preflight responses are cached for 10 minutes.
- Deliberate deviations from the standards are listed in
  [ADR 0010](docs/adr/0010-http-standards-conformance.md).

### Added

- `ProblemDetailsFilter` and a validation error mapper (`common/problem-details/`); unexpected errors
  return a generic 500 and are logged on the server only.
- `WWW-Authenticate: Bearer realm="api"` on 401 responses from protected routes, with
  `error="invalid_token"` when a token was sent and rejected. The `Bearer` scheme is matched
  case-insensitively.
- `Location` header on `201 Created` for `POST /vehicles`.
- `Cache-Control: no-store` on auth responses whose body holds an access token.
- 415 check for non-JSON bodies (`requireJsonBody`) and a `MaxBytes` validator.
- `iss` (`nest-next-starter`) and `aud` (`nest-next-starter-api`) claims in access tokens, set in
  `auth.constants.ts`.
- [ADR 0010](docs/adr/0010-http-standards-conformance.md), a section in the authentication guide and
  an e2e suite for the HTTP behaviour (`http-standards.e2e-spec.ts`).
- `CHANGELOG.md`.

### Changed

- The web API client reads `detail` and `errors` from problem documents.
- Access-token signing and verification are pinned to `HS256` through `buildJwtOptions`.
- Container images (Compose files, Dockerfiles, CI service containers) are pinned by tag and digest.
- CI pins every action by commit SHA, runs with a read-only token and no persisted checkout
  credentials, and runs gitleaks from a pinned image (`v8.30.1` with digest).
- [ADR 0002](docs/adr/0002-auth-refresh-rotation.md), the README, the docs index, `apps/api/CLAUDE.md`
  and the `api-nestjs` and `security` rules describe the new behaviour.

### Fixed

- Errors for a malformed or oversized body (400, 413) were sent without Helmet and CORS headers.

### Security

- Access tokens are accepted only with `HS256` and the expected `iss` and `aud` (RFC 8725).
- Passwords longer than 72 bytes can no longer be created, so bcrypt never silently ignores the tail.
- Pinned container images and CI actions mean a moved tag cannot change what runs.

## [0.1.0] - 2026-10-08

First release: NestJS API with JWT auth (rotating httpOnly refresh cookie with reuse detection),
TypeORM and PostgreSQL, Redis rate limiting, optional Kafka, a Next.js web app with a vehicles CRUD
and a private layout, tests, CI and Claude Code rules.

[unreleased]: https://github.com/sotream/nest-next-starter/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/sotream/nest-next-starter/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sotream/nest-next-starter/releases/tag/v0.1.0
