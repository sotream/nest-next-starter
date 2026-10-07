import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/setup-app.js';
import { prepareDatabase } from './prepare-database.js';

export interface TestApp {
  app: NestExpressApplication;
  dataSource: DataSource;
  /** Empties all tables and rate-limit counters so each test starts from a clean slate. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  await prepareDatabase();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  return {
    app,
    dataSource,
    reset: async () => {
      await dataSource.query('TRUNCATE users, vehicles, refresh_tokens CASCADE');
      const keys = await redis.keys('throttle:*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
    },
    close: async () => {
      await redis.quit();
      await app.close();
    },
  };
}
