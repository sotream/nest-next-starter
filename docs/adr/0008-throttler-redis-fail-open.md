# 0008. Rate limiting on Redis fails open

- Status: accepted
- Date: 2026-10-07

## Context

Rate limits must be shared by every API instance, so counters live in Redis. `@nestjs/throttler` ships
only an in-memory store, and the Redis storage packages we looked at pin a different `ioredis` major than
TypeORM's peer range. If Redis is unreachable, the storage call throws and, by default, the request
fails with a 500: a cache outage would take the whole API down.

## Decision

- A small custom `ThrottlerStorage` on `ioredis` (`RedisThrottlerStorage`): one Lua script keeps the
  counter, the window and the optional block atomic.
- It **fails open**. When Redis errors or times out, the request is allowed and an error is logged, at most
  once every 10 seconds so an outage does not flood the logs.
- The Redis client uses a 1 second command timeout and one retry per command. Without bounds, ioredis queues
  commands while offline and requests would hang instead of failing.
- Redis is also in the readiness check, so an orchestrator sees the outage even though requests still work.

## Consequences

- While Redis is down, rate limits do not apply: credential stuffing is not slowed during the outage. The
  error log line ("Rate limiting is OFF") is the signal to alert on.
- Requests keep working with at most about a second of added latency per throttled route during the outage.
- Counters are lost when Redis restarts; a window simply starts over.
- Fixed-window counting allows a short burst around a window boundary.

## When to revisit

- If the service handles credentials where a few minutes without limits is unacceptable: switch to fail
  closed for the auth routes only, or add a local in-memory fallback limiter.
- If Redis gains other critical uses, review the shared connection and its timeouts.
- If a maintained Redis storage for `@nestjs/throttler` supports our `ioredis` version, drop the custom one.
