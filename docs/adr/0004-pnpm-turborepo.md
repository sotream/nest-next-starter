# 0004. pnpm workspaces and Turborepo

- Status: accepted
- Date: 2026-10-07

## Context

Two applications share tooling (lint rules, TypeScript settings, formatting) and are developed
together. We want one install, one command to run everything, and cached task runs.

## Decision

- pnpm workspaces (`apps/*`) with the version pinned in `packageManager` and Node pinned in `.nvmrc`
  and `engines`. Strict `node_modules` means each app declares what it imports.
- Turborepo runs `lint`, `typecheck`, `test`, `build` and `dev` across apps and caches results.
- Shared configuration lives at the root: `tsconfig.base.json`, the ESLint flat config, Prettier.
- Dependency install scripts are not run unless reviewed. `allowBuilds` in `pnpm-workspace.yaml`
  records the two packages that have one and are skipped on purpose (`@scarf/scarf` is analytics only,
  `unrs-resolver` ships prebuilt binaries). A new dependency with an install script fails the install
  until someone decides.
- pnpm's release-age policy is left on. `minimumReleaseAgeExclude` lists the versions that were
  pinned while brand new.

## Consequences

- Only two apps exist, so there are no shared packages. Add `packages/*` when code is genuinely shared.
- Contributors need Node 24 or newer and pnpm (via Corepack).
