# Build from the repository root: docker build -f apps/api/Dockerfile -t nest-next-starter-api .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Manifests first so the dependency layer is cached until they change. Scripts are skipped: no package
# here needs a build step, and the root `prepare` hook (husky) must not run without git.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter api...
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN pnpm --filter api build \
    && pnpm --filter api deploy --prod --ignore-scripts /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/package.json ./
USER node
EXPOSE 4000
# Liveness only: a database or Redis outage must not make the orchestrator restart a healthy process.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]
