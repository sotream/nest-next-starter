# Git and commits

- Conventional Commits: `type(scope): summary` in the imperative, under 72 characters. Types: `feat`,
  `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`. Scopes: `api`, `web`, `infra`, `docs`,
  `auth`, `vehicles`, `messaging`. The `commit-msg` hook enforces the format.
- One logical change per commit and per pull request; keep pull requests small enough to review in
  one sitting. Do not mix refactoring with behaviour changes.
- Commit messages and docs describe what changed and why for the project. Keep them neutral and factual.
- Before committing run `/verify` (lint, typecheck, test, build). Never skip hooks with `--no-verify`.
- Do not commit files from `docs/private/` or `docs/notes/`, `.env*` (except `.env.example`), or local
  runtime data. They are git-ignored; do not force-add them.
