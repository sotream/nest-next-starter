# 0003. Structured logging with pino

- Status: accepted
- Date: 2026-10-07

## Context

Logs are read by humans while developing and by machines in production. They also tend to leak secrets
through request headers and bodies.

## Decision

- Use `nestjs-pino` (pino with pino-http). Output is JSON in production and pretty-printed in
  development through `pino-pretty`.
- Every request gets an id: the incoming `x-request-id` if it is 1 to 64 characters of `A-Za-z0-9_.-`, otherwise a UUID. It is returned in
  the response header and attached to every log line written while handling the request.
- Redact at the logger, not at call sites, so nobody has to remember: `authorization`, `cookie` and
  `set-cookie` headers, and any `password`, `token`, `accessToken` or `refreshToken` field.
- The log level is configuration (`LOG_LEVEL`), and tests run silent.

## Consequences

- Redaction is path based. A secret under a new, unexpected key is not covered, so new secret-bearing
  fields must be added to `REDACTED_PATHS` in `infrastructure/logging/logging.module.ts`.
- Request bodies are not logged by default, which is the safest default.
- `kafkajs` logs through its own JSON logger rather than pino, so its lines do not carry the request id
  or go through pino redaction.
