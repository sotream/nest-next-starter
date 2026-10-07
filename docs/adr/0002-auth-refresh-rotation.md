# 0002. Refresh token rotation with reuse detection

- Status: accepted
- Date: 2026-10-07

## Context

A browser app needs sessions that last days but must limit the damage of a stolen token. Keeping a
long-lived token in `localStorage` exposes it to any script on the page.

## Decision

- **Access token:** short-lived JWT (15 minutes), returned in the response body, kept in memory by the web
  app and sent as a Bearer token.
- **Refresh token:** a random opaque string in an `httpOnly`, `SameSite=Lax` cookie, `Secure` in
  production, scoped to `Path=/api/v1/auth` so it is only sent to auth endpoints.
- **Storage:** only the SHA-256 of each refresh token is stored. A fast hash is correct here because the
  token has 384 bits of entropy; a slow password hash would only add latency.
- **Rotation:** every refresh revokes the presented token and issues a new one in the same _family_
  (one family per sign-in).
- **Reuse detection:** presenting an already-revoked token means it was copied or replayed, so the whole
  family is revoked. The legitimate holder is signed out too, which is the safe outcome.
- **Atomic revoke:** rotation uses `UPDATE ... WHERE id = ? AND revoked_at IS NULL`. Of two concurrent
  requests with the same token only one affects a row, so a race cannot mint two valid children.
- **Passwords:** `bcryptjs` (pure JavaScript, no native build), cost 10, inputs capped at 72 characters
  because bcrypt ignores the rest. Unknown emails are compared against a dummy hash so sign-in time does
  not reveal which emails exist.

## Consequences

- Logout and theft response are server-side and immediate for refresh tokens. An access token stays
  valid until it expires (at most 15 minutes); there is no access-token deny list.
- This is a deliberate trade-off. Access tokens are verified from the signature alone, with no database
  or Redis lookup per request. The cost: after logout, a role change or a deleted user, an already issued
  access token keeps working until it expires, and the role inside it can be up to 15 minutes stale.
  Shorten `ACCESS_TOKEN_TTL_SECONDS` to narrow that window, or add a deny list or per-request user check
  if immediate revocation becomes a requirement.
- Two browser tabs refreshing at the same instant with the same cookie would look like reuse and sign
  the user out. The web client shares one in-flight refresh per tab and queues refreshes across tabs with
  a Web Lock (`navigator.locks`). Browsers without Web Locks fall back to per-tab coordination only.
- The cookie flow assumes the web app and API are same-site (for example `localhost` ports, or sibling
  subdomains). Cross-site deployment needs `SameSite=None; Secure` and a deliberate review.
- Auth limits (sign-in 10 per minute, refresh 60 per minute) are counted per client IP. Without a trusted
  proxy setting they become global behind a reverse proxy; see [ADR 0007](0007-no-trust-proxy.md). If
  Redis is down, limits are off ([ADR 0008](0008-throttler-redis-fail-open.md)).
- Rows are removed by a scheduled job (`RefreshTokenCleanupService`, `REFRESH_CLEANUP_CRON`). It deletes
  expired tokens and revoked tokens older than `REFRESH_REVOKED_RETENTION_DAYS`, which must not be below
  `REFRESH_TOKEN_TTL_DAYS`: reuse detection needs the revoked row for as long as the token could still be
  presented. Deletes run in batches with `FOR UPDATE SKIP LOCKED`, so replicas can run the job together.
