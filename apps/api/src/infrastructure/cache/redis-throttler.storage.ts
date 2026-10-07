import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

// Atomic fixed window: count hits, start the window on the first hit, optionally block once over limit.
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then return {hits, ttl, 1, blockTtl} end
if hits > tonumber(ARGV[2]) then
  if tonumber(ARGV[3]) > 0 then
    redis.call('SET', KEYS[2], 1, 'PX', ARGV[3])
    return {hits, ttl, 1, tonumber(ARGV[3])}
  end
  return {hits, ttl, 1, ttl}
end
return {hits, ttl, 0, 0}
`;

// The record type is not exported by @nestjs/throttler, so derive it from the interface.
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

type ScriptResult = [hits: number, ttlMs: number, blocked: number, blockTtlMs: number];

const toSeconds = (ms: number): number => Math.ceil(ms / 1000);

/** What the guard sees when Redis cannot count: zero hits, so the request is allowed. */
const ALLOW: ThrottlerStorageRecord = {
  totalHits: 0,
  timeToExpire: 0,
  isBlocked: false,
  timeToBlockExpire: 0,
};

const ERROR_LOG_INTERVAL_MS = 10_000;

/**
 * Redis-backed storage so rate limits are shared across API instances. Fails open: when Redis is
 * unreachable the request is allowed and the error is logged (at most once per interval), so a Redis
 * outage degrades rate limiting instead of taking the API down. See ADR 0008.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private lastErrorLogAt = 0;

  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await this.count(key, ttl, limit, blockDuration, throttlerName);
    } catch (error) {
      this.logFailure(error);
      return ALLOW;
    }
  }

  private logFailure(error: unknown): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt < ERROR_LOG_INTERVAL_MS) return;
    this.lastErrorLogAt = now;
    this.logger.error(
      `Rate limiting is OFF: Redis is unavailable (${error instanceof Error ? error.message : 'unknown error'})`,
    );
  }

  private async count(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const [totalHits, ttlMs, blocked, blockTtlMs] = (await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      hitsKey,
      `${hitsKey}:block`,
      ttl,
      limit,
      blockDuration,
    )) as ScriptResult;

    return {
      totalHits,
      timeToExpire: toSeconds(ttlMs),
      isBlocked: blocked === 1,
      timeToBlockExpire: toSeconds(blockTtlMs),
    };
  }
}
