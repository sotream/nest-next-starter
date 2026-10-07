# Deployment

This starter does not choose a platform. It gives you images, a production configuration check and a
reference compose file; where and how you run them is your decision. Read [Limitations](#limitations)
before the first deployment.

## What `APP_ENV=prod` changes

`APP_ENV` is required (`dev` or `prod`, no default). With `prod`:

- The API refuses to start unless `JWT_ACCESS_SECRET` is a non-default value of 32+ characters,
  `WEB_ORIGIN` is an `https` origin, `DATABASE_URL` has a password other than the dev one, and
  `REDIS_URL` has a password.
- The refresh cookie is `Secure`.
- Swagger UI is off and `pnpm db:seed` refuses to run.
- The `WebOriginGuard` accepts only `WEB_ORIGIN` on refresh and logout (in dev the API's own origin is
  allowed too, for Swagger).
- Logs are JSON.

`NODE_ENV` is not used by our code. It stays `production` in the images because Node and Next expect it.

## Same-site requirement

Web and API must share a registrable domain, for example `app.example.com` and `api.example.com`.

- The refresh cookie is `SameSite=Lax`, host-only (no `Domain`), `Path=/api/v1/auth`, so the browser
  sends it only to the API host and only to auth routes.
- `WEB_ORIGIN` must be the exact https origin of the web app (scheme, host, port; no path). It drives CORS
  and the origin check.
- Build the web image with `NEXT_PUBLIC_API_URL` set to the API's public https URL. It is inlined at
  build time, so a different API address means a rebuild.
- **Cross-site does not work.** If the web app and API sit on unrelated domains, the browser does not send
  the `Lax` cookie on the API's fetch calls: refresh fails with 401 and users are signed out on every
  reload. Fixing that needs `SameSite=None; Secure` and a fresh security review, which this starter does
  not ship.

## TLS and the Secure cookie

The Node processes do not terminate TLS. `Secure` is `true` whenever `APP_ENV=prod`, and browsers only
store and send `Secure` cookies over https (Chrome and Firefox treat `http://localhost` as an exception).
An http-only environment, such as a staging box without TLS, must use `APP_ENV=dev`. That is deliberate:
there is no separate `COOKIE_SECURE` switch to forget.

## Images and the reference compose file

```bash
docker build -f apps/api/Dockerfile -t nest-next-starter-api .
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  -t nest-next-starter-web .
```

Both images are multi-stage, run as the unprivileged `node` user and define a `HEALTHCHECK`.

`docker-compose.prod.yml` wires api, web, Postgres and Redis together without a proxy. It is a reference,
not a recommendation. Required variables are listed at the top of the file; the stack will not start
without them. Migrations run as a separate one-shot `migrate` service, never during API startup. To run
them elsewhere: `node node_modules/typeorm/cli.js migration:run -d dist/infrastructure/database/data-source.js`
inside the API image, with the same environment as the API.

**Changing the database password.** Postgres applies `POSTGRES_PASSWORD` only when it creates the data
volume. Starting the stack against an existing volume with a different value makes `migrate` and the API
fail with `password authentication failed for user "app"`. Either change the password inside the database
(`ALTER USER app PASSWORD '...'`, then put the new password in `POSTGRES_PASSWORD` and in `DATABASE_URL`,
and restart the API) or start from a new volume
(`docker compose -f docker-compose.prod.yml down -v`, which **deletes the data**).

Health endpoints: `GET /api/health/live` (process; used by the image `HEALTHCHECK`) and
`GET /api/health/ready` (database and Redis; for routing decisions).

## Limitations

- **Behind a reverse proxy or a PaaS router, review [ADR 0007](../adr/0007-no-trust-proxy.md) first.** The
  API does not trust `X-Forwarded-For`, so rate limits count the proxy instead of clients, and IPs in the
  logs are wrong. TLS termination on a proxy in front of the API is not supported until that is done.
- If Redis is down, rate limits are off while requests keep working
  ([ADR 0008](../adr/0008-throttler-redis-fail-open.md)).
- An access token stays valid until it expires, up to 15 minutes after logout
  ([ADR 0002](../adr/0002-auth-refresh-rotation.md)).
- No HSTS header is sent; set it where TLS terminates.
- Kafka is not part of `docker-compose.prod.yml`. Enable it deliberately with `KAFKA_ENABLED` and a broker
  you operate.
- The seed users do not exist in prod. Create the first admin through your own, reviewed process.

## Open questions

- Target platform (VPS, PaaS, something else). It decides whether a reverse proxy is needed, and then
  ADR 0007 must be revisited before the first deployment.
- Where secrets come from (platform secret store, a manager, files).
- How migrations are run in your pipeline, and who is allowed to run them.
- Log shipping and alerting. Alert on the "Rate limiting is OFF" error line.
