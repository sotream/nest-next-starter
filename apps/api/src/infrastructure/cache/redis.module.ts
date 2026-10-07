import { Global, Inject, Injectable, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { EnvironmentVariables } from '../config/env.validation.js';

export const REDIS = Symbol('REDIS');
const REDIS_COMMAND_TIMEOUT_MS = 1000;

@Injectable()
class RedisShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}

/** Single shared Redis connection, used by rate limiting and health checks. */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        // Bounded waits: without these ioredis queues commands while offline and requests would hang.
        new Redis(config.get('REDIS_URL', { infer: true }), {
          commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
          maxRetriesPerRequest: 1,
        }),
    },
    RedisShutdown,
  ],
  exports: [REDIS],
})
export class RedisModule {}
