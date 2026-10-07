# 0007. No trust proxy

- Status: accepted
- Date: 2026-10-07

## Context

The rate limiter and the request logs identify a client by `req.ip`. Behind a reverse proxy or a PaaS
router, Express reports the proxy's address for every request unless `trust proxy` is configured, so all
clients appear to share one IP.

## Decision

The API does not enable `trust proxy`. The starter is built for direct access to the API, which is also
what `docker-compose.prod.yml` assumes. This is a deliberate YAGNI choice: the correct setting depends on
the network in front of the API, and a wrong one is worse than none.

## Consequences

- Behind a proxy, limits become global: sign-in (10 per minute) and refresh (60 per minute, see
  [ADR 0002](0002-auth-refresh-rotation.md)) are counted per proxy address, so one client can lock everyone
  out of signing in.
- IP addresses in logs are unreliable behind a proxy.
- TLS termination on a proxy in front of the API is not supported by this starter.
- Do not "fix" this with `trust proxy: true`. It trusts any `X-Forwarded-For`, so a forged header gives
  every request a fresh identity and bypasses the limits.

## When to revisit

Before the first deployment behind a proxy or PaaS. Then add a `TRUST_PROXY` setting (`false`, a number of
hops, or a CIDR list), refuse to start in `APP_ENV=prod` without an explicit value, and make sure the proxy
overwrites `X-Forwarded-For` instead of appending to a client-supplied one.
