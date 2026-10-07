import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS } from '../infrastructure/cache/redis.module.js';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async ping<Key extends string>(key: Key): Promise<HealthIndicatorResult<Key>> {
    const session = this.indicator.check(key);
    try {
      await this.redis.ping();
      return session.up();
    } catch (error) {
      return session.down(error instanceof Error ? error.message : 'Redis unreachable');
    }
  }
}
