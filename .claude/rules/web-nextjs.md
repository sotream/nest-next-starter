---
paths:
  - 'apps/web/**'
---

# Next.js web app

- App Router. Pages in `src/app` stay thin and export `metadata`; behaviour lives in components that
  are `'use client'` only when they need state or effects.
- All API calls go through `src/lib/api-client.ts`. Never call `fetch` for the API from a component,
  and never store the access token anywhere but that module's memory.
- Data fetching is plain hooks (`useVehiclePage`). Add a data library only when caching becomes a
  real need.
- Tailwind utilities only. Colors come from the theme tokens in `globals.css` (`accent`, `paper`,
  `ink`) and the `zinc` scale. One accent color, one font family.
- Accessibility: every input has a visible `<label>`, errors use `role="alert"`, controls keep the
  global `:focus-visible` outline, icon-less buttons say what they do ("Save vehicle", not "Submit").
- Every list has loading, empty and error states with plain-language text that says what to do next.
- Env: only `NEXT_PUBLIC_API_URL`, read in `api-client.ts`.
