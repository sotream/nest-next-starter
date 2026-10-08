# apps/web

Next.js 16 App Router, React 19, Tailwind 4. Rules: [web-nextjs](../../.claude/rules/web-nextjs.md),
[typescript](../../.claude/rules/typescript.md).

## Layout

```
src/app/         routes: (auth)/sign-in, (auth)/sign-up, (app)/vehicles, layout, globals.css
src/components/  small presentational and form components
src/lib/         api-client (typed, token in memory, one retry after refresh), auth-context, types, hooks
```

## Conventions

- Private pages live in `src/app/(app)/`. Its layout renders `AppShell` (session guard, sidebar, burger
  drawer on phones). A new page is a folder there plus one entry in `src/lib/nav.ts`.
- API access only through `src/lib/api-client.ts`. It retries once after a refresh and shares one
  in-flight refresh (queued across tabs with a Web Lock), because refresh tokens rotate (parallel
  refreshes look like theft).
- Types in `src/lib/types.ts` mirror the API by hand; update both sides together.
- Styling: Tailwind utilities, tokens in `globals.css` (`accent`, `paper`, `ink`), `zinc` neutrals, one
  font family. Keep the UI small; it is meant to be replaced.
- Every data view handles loading, empty and error states with plain-language text.
- This Next.js version differs from older ones. Check `node_modules/next/dist/docs/` before relying on
  remembered APIs.
- Security headers and the CSP come from `src/lib/security-headers.ts` (wired in `next.config.ts`). The `'unsafe-inline'` trade-off is
  [ADR 0009](../../docs/adr/0009-csp-unsafe-inline.md). A new
  external origin the browser must reach (API, analytics) goes into `connect-src` there. No HSTS: the proxy
  that terminates TLS sets it.
- Env: `NEXT_PUBLIC_API_URL` only, read from `apps/web/.env.local` (default `http://localhost:4000`).

## Checks

`pnpm --filter web lint | typecheck | test | build`.
