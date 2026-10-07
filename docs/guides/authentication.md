# Authentication

Design and trade-offs are in [ADR 0002](../adr/0002-auth-refresh-rotation.md). This page is the
practical side.

## Endpoints

Base path `/api/v1`. Open the [Swagger UI](http://localhost:4000/api/docs) to try them.

| Method and path      | Auth                | Result                                        |
| -------------------- | ------------------- | --------------------------------------------- |
| `POST /auth/sign-up` | public              | 201, access token in body, refresh cookie set |
| `POST /auth/sign-in` | public              | 200, access token in body, refresh cookie set |
| `POST /auth/refresh` | refresh cookie      | 200, new access token, rotated cookie         |
| `POST /auth/logout`  | refresh cookie      | 204, session revoked, cookie cleared          |
| `GET /auth/me`       | Bearer access token | 200, current user                             |

The refresh cookie is named `starter_rt` (`REFRESH_COOKIE_NAME`), `httpOnly`, `SameSite=Lax`, scoped to
`/api/v1/auth`. The prefix avoids clashes with other apps on `localhost`, since cookies ignore ports.

`POST /auth/refresh` and `POST /auth/logout` also reject a browser `Origin` that is not `WEB_ORIGIN` (403),
because `SameSite=Lax` alone does not stop requests from sibling subdomains. Requests without an `Origin`
header, such as curl, pass. With `APP_ENV=dev` the API's own origin is allowed too, so Swagger UI works;
in prod Swagger is off.

Auth routes allow 10 requests per minute per IP (`AUTH_THROTTLE` in `auth.constants.ts`); everything
else uses `THROTTLE_LIMIT`. `POST /auth/refresh` has its own, looser bucket (`REFRESH_THROTTLE`, 60 per
minute) because the web app calls it on every page load. If the session check fails with a network
error, 429 or 5xx, the web app shows a retry button instead of signing the user out. Over the limit the API answers 429 with a `Retry-After` header.

## Trying it with curl

```bash
curl -s -c jar.txt -X POST localhost:4000/api/v1/auth/sign-in \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"User123!local"}'

TOKEN=...   # accessToken from the response
curl -s localhost:4000/api/v1/vehicles -H "Authorization: Bearer $TOKEN"

curl -s -b jar.txt -c jar.txt -X POST localhost:4000/api/v1/auth/refresh
```

## Protecting routes

Every route requires a valid access token by default (`JwtAuthGuard` is global).

- Open a route with `@Public()`.
- Restrict to roles with `@Roles(Role.ADMIN)`; `RolesGuard` runs after authentication.
- Read the caller with `@CurrentUser()`, which gives `{ id, role }`.

## Configuration

| Variable                         | Default     | Notes                                                                    |
| -------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `JWT_ACCESS_SECRET`              | dev value   | At least 32 characters. The dev default is rejected when `APP_ENV=prod`. |
| `ACCESS_TOKEN_TTL_SECONDS`       | 900         | Access token lifetime                                                    |
| `REFRESH_TOKEN_TTL_DAYS`         | 7           | Refresh token and cookie lifetime                                        |
| `REFRESH_CLEANUP_CRON`           | `0 3 * * *` | Schedule of the job that deletes stale refresh tokens                    |
| `REFRESH_REVOKED_RETENTION_DAYS` | 14          | Keep revoked tokens this long (at least `REFRESH_TOKEN_TTL_DAYS`)        |

## Not included

Password reset and email verification are out of scope. Add them as new modules rather than extending
`AuthService`.
