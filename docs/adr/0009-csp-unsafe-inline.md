# 0009. CSP allows inline scripts

- Status: accepted
- Date: 2026-10-07

## Context

Next.js injects inline scripts into every page (bootstrap and hydration data). A Content Security Policy
without `'unsafe-inline'` in `script-src` blocks them and the app does not start. Inline scripts can
only be allowed safely with a per-request nonce, and Next adds that nonce only to pages rendered on each
request.

## Decision

`script-src` is `'self' 'unsafe-inline'` (plus `'unsafe-eval'` in dev only). The rest of the policy stays
strict: `default-src 'self'`, `connect-src` limited to this origin and the API, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'none'`. The policy lives in
`apps/web/src/lib/security-headers.ts`.

## Consequences

- The CSP gives weaker protection against XSS: injected inline script is not blocked by the policy. The
  other directives still limit where data can be sent and who can frame the app.
- React escaping, the in-memory access token and the `httpOnly` refresh cookie remain the main defences.
  The refresh cookie cannot be read by script even if XSS happens.
- Pages stay statically rendered and cheap to serve.

## Alternative

Nonce-based CSP through Next middleware (`proxy`): drop `'unsafe-inline'` and add `'nonce-...'` and
`'strict-dynamic'`. The cost is that every page becomes dynamically rendered, so no static output or CDN
caching, and a small per-request overhead.

## When to revisit

- The app starts rendering user-generated HTML or loads third-party scripts.
- Pages are already rendered dynamically for another reason, which makes the nonce free.
- A compliance requirement or a security review asks for a strict `script-src`.
