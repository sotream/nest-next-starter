---
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# TypeScript

- Strict mode is on. `any` is a lint error: use interfaces, generics, or `unknown` plus narrowing.
  A cast through `unknown` at a boundary you cannot type (a mocked repository) is acceptable; say why.
- SOLID, DRY, KISS, YAGNI. Add an abstraction when the second use appears, not before. The only port
  in the codebase is `EventPublisher`.
- Keep functions small. `sonarjs/cognitive-complexity` fails above 10: split into named helpers
  instead of nesting.
- Delete unused code, imports and exports. Do not leave commented-out code.
- Comments explain why, never what. Public services and exported APIs get a short JSDoc.
- Name by intent (`findAccessible`, not `getData`). Booleans read as questions (`isPublic`).
- API relative imports end in `.js` (ESM). Use `import type` for type-only imports.
