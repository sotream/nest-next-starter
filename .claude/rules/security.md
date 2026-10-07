# Security

Design: [ADR 0002](../../docs/adr/0002-auth-refresh-rotation.md), [ADR 0003](../../docs/adr/0003-pino-logging.md).

- Never read, print or commit `.env` files or secrets. `.env.example` holds placeholders only.
- Validate all input at the edge with DTOs; never trust ids or roles from a request body.
- Authorize in the service: filter by owner unless the caller is an admin, and answer 404 for others'
  data. Do not rely on the client hiding things.
- Passwords: `bcryptjs`. Refresh tokens: random, stored only as a SHA-256 hash, rotated on use.
- Never log tokens, cookies, passwords or full request bodies. Add new secret-bearing keys to
  `REDACTED_PATHS`.
- Use parameterised queries through TypeORM. Do not build SQL with string concatenation.
- Rate limiting is on globally; keep auth routes stricter. Do not add routes that bypass it.
- `APP_ENV=prod` fails fast on dev defaults, a short secret, a non-https `WEB_ORIGIN` and default DB or
  Redis credentials. Decide on `APP_ENV`, never on `NODE_ENV`.
- Do not add a dependency for something small; each package is attack surface. Check install scripts.
