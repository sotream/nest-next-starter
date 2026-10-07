---
paths:
  - '**/*.spec.ts'
  - '**/*.test.ts'
  - 'apps/api/test/**'
---

# Testing

Details: [testing guide](../../docs/guides/testing.md).

- Unit tests (`*.spec.ts` in the API, `*.test.ts` in web) run without I/O. Replace repositories with
  small in-memory fakes that behave like the real ones; construct services directly.
- E2E tests (`apps/api/test`) use the real app, PostgreSQL and Redis. Mock nothing.
- Mock only what you do not own (network, broker). Never mock the unit under test.
- Test names state a behaviour: `it('revokes the whole family when a rotated token is replayed')`.
- One behaviour per test, arrange-act-assert, no logic in tests (loops are fine for table cases).
- Security paths (auth, ownership, rate limits) need a test for the denied case, not only the allowed one.
- A bug fix starts with a failing test that reproduces it.
