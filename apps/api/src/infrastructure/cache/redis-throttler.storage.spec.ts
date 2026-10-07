import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

/** A client pointed at a closed port: the real failure mode, not a hand-written rejection. */
function unreachableRedis(): Redis {
  const redis = new Redis('redis://127.0.0.1:1', {
    commandTimeout: 200,
    maxRetriesPerRequest: 1,
    retryStrategy: () => 100,
  });
  redis.on('error', () => undefined);
  return redis;
}

describe('RedisThrottlerStorage when Redis is down', () => {
  let redis: Redis;
  beforeEach(() => {
    redis = unreachableRedis();
  });
  afterEach(() => redis.disconnect());

  it('allows the request instead of throwing, within a bounded time', async () => {
    const started = Date.now();

    const record = await new RedisThrottlerStorage(redis).increment('k', 60_000, 10, 0, 'default');

    expect(record).toMatchObject({ totalHits: 0, isBlocked: false });
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('logs the failure at error level, once per interval', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const storage = new RedisThrottlerStorage(redis);

    await storage.increment('k', 60_000, 10, 0, 'default');
    await storage.increment('k', 60_000, 10, 0, 'default');

    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0]?.[0]).toMatch(/Rate limiting is OFF/);
    error.mockRestore();
  });
});
