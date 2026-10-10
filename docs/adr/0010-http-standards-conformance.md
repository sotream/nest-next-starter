# 0010. HTTP and token standards

- Status: accepted
- Date: 2026-10-10

## Context

An API that follows the published standards is easier to consume, test and review, and most of the
rules are cheap to follow. An audit of the HTTP surface against RFC 9110, RFC 9457, RFC 6750,
RFC 8725, RFC 6265bis, the Fetch standard and the OWASP Password Storage cheat sheet found several
gaps (plain Nest error bodies, a 401 without a challenge, JWT algorithm and claims left to library
defaults, a password limit counted in characters instead of bytes) and several places where following
the standard literally costs more than it is worth.

## Decision

### What the API follows

| Area                    | Rule                                                                                                      | Source                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------- |
| Error format            | Every error is `application/problem+json` with `type`, `title`, `status`, `detail` and a `code` extension | RFC 9457 s3, s3.2         |
| Problem `type`          | Always `about:blank`, so `title` is the HTTP status phrase                                                | RFC 9457 s4.2.1           |
| Validation errors       | `errors: [{ pointer: "#/email", detail: "..." }]`, `code: VALIDATION_FAILED`                              | RFC 9457 s3 example       |
| Unexpected errors       | Generic 500, details only in the server log                                                               | OWASP error handling      |
| 401                     | `WWW-Authenticate: Bearer realm="api"`, plus `error="invalid_token"` when a token was sent and rejected   | RFC 9110 s11.6.1, 6750 s3 |
| Authorization scheme    | `Bearer` is matched case-insensitively                                                                    | RFC 9110 s11.1            |
| 201                     | `Location` names the created vehicle                                                                      | RFC 9110 s10.2.2          |
| Unsupported body        | A body that is not JSON gets 415                                                                          | RFC 9110 s15.5.16         |
| 429                     | `Retry-After` in seconds                                                                                  | RFC 6585 s4, RFC 9110     |
| CORS                    | `Vary: Origin`, preflight cached 10 minutes, `Retry-After`, `Location`, `X-Request-Id` exposed            | Fetch standard            |
| Early errors            | Helmet and CORS run before the body parser, so a 400 or 413 for a bad body carries them too               | Fetch standard            |
| Token responses         | `Cache-Control: no-store` where the body holds an access token                                            | OWASP session management  |
| JWT algorithm           | Signing and verification are pinned to `HS256`                                                            | RFC 8725 s3.1, s3.2       |
| JWT issuer and audience | `iss` and `aud` are set and checked on every request                                                      | RFC 8725 s3.8, s3.9       |
| Passwords               | Sign-up accepts at most 72 **bytes**; sign-in is limited to 128 characters                                | OWASP Password Storage    |

The code is small and has no dependency on the rest of the app, so it can be copied to another service:
`common/problem-details/` (filter and validation mapping), `common/http/bearer-token.ts`,
`common/http/require-json-body.ts`, `common/validators/max-bytes.ts` and `modules/auth/jwt-options.ts`.

### Problem codes

`code` is derived from the status phrase (`NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`) unless the
exception sets its own. Clients branch on `status` and `code`, never on the text of `detail`
(RFC 9457 s3.1.4). Only `VALIDATION_FAILED` is set explicitly. No problem `type` URIs are defined, so
nothing needs to be dereferenceable. If a specific type is introduced later, use
`urn:starter:problem:<slug>` and list it here.

### Deliberate deviations

- **Sign-in and refresh answer 401 without `WWW-Authenticate`.** Their credentials are a JSON body and
  a cookie, not an HTTP authentication scheme. A `Bearer` challenge would be wrong, and `Basic` would make
  browsers show a login dialog. The message in `detail` says what failed.
- **No 405 with `Allow`.** A known path with an unsupported method answers 404, where RFC 9110 s15.5.6
  asks for 405 and an `Allow` list. Nest has no hook for it, and building one means reading Express
  router internals that change between versions. The cost is a less precise status for a client that
  calls a route with the wrong method.
- **`X-RateLimit-*` headers instead of `RateLimit`.** The IETF `RateLimit` and `RateLimit-Policy` fields
  are still an Internet-Draft (`draft-ietf-httpapi-ratelimit-headers`). The de-facto names stay until
  the draft is published.
- **The refresh cookie has no `__Host-` prefix.** The prefix requires `Path=/` (RFC 6265bis s4.1.3.2),
  which would send the cookie to every route and undo the `Path=/api/v1/auth` scoping from
  [ADR 0002](0002-auth-refresh-rotation.md). `__Secure-` would work, but the name would differ
  between local `http` and production `https`. RFC 6265bis is also still a draft.
- **No `typ: at+jwt` header** (RFC 8725 s3.11 is a recommendation). There is one token type, so
  nothing can be confused with it.
- **The HMAC secret is checked for length, not entropy.** `APP_ENV=prod` requires at least 32
  characters and rejects the dev default. RFC 8725 s3.5 forbids using a memorable password as the
  key, which a length check cannot prove; generate the secret randomly.
- **bcrypt instead of Argon2id.** OWASP lists Argon2id first and bcrypt as the legacy choice, with a
  minimum work factor of 10. `bcryptjs` at cost 10 stays because it has no native build; see ADR 0002.
- **Offset pagination without `Link` headers.** The page body carries `total`, `limit` and `offset`.
  RFC 8288 links would add nothing the clients need.
- **OAuth 2.0 and OpenID Connect do not apply.** There is no authorization server; the API issues its own
  session tokens. Only the `Bearer` presentation rules of RFC 6750 are used.

## Consequences

- The error body changed from `{ message, error, statusCode }` to a problem document, so every client
  must read `detail` and `errors`. The web client does; other consumers need the same change.
- Access tokens issued before this change have no `iss` or `aud` and are rejected. They live at most 15
  minutes, and the web app refreshes its session silently.
- Passwords longer than 72 bytes can no longer be created. Existing accounts keep working, because sign-in
  does not apply the byte limit; bcrypt already compared only the first 72 bytes for them.
- The deviations above are the only places where behaviour knowingly differs from a standard. A new
  one needs an entry here.
