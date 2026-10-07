---
description: Run lint, typecheck, tests and build, and summarise any failures
allowed-tools: Bash(pnpm *), Bash(docker compose *), Read
---

Run these in order and stop at the first failing step: `pnpm lint`, `pnpm typecheck`, `pnpm test`,
`pnpm build`. If Postgres and Redis are running (`docker compose ps`), also run `pnpm test:e2e`;
otherwise say e2e was skipped and why.

Report one line per step (pass or fail). For a failure give the shortest decisive error line, the file
and line, and the likely cause. Fix it only if the user asked you to.
