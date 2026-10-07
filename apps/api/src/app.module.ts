import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { REDIS, RedisModule } from './infrastructure/cache/redis.module.js';
import { RedisThrottlerStorage } from './infrastructure/cache/redis-throttler.storage.js';
import { validateEnv } from './infrastructure/config/env.validation.js';
import type { EnvironmentVariables } from './infrastructure/config/env.validation.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { AppLoggerModule } from './infrastructure/logging/logging.module.js';
import { MessagingModule } from './infrastructure/messaging/messaging.module.js';

@Module({
  imports: [
    // First match wins, so a local apps/api/.env overrides the repo-root one.
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env', '../../.env'],
    }),
    AppLoggerModule,
    RedisModule,
    DatabaseModule,
    MessagingModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, REDIS],
      useFactory: (config: ConfigService<EnvironmentVariables, true>, redis: Redis) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    HealthModule,
    AuthModule,
    VehiclesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
