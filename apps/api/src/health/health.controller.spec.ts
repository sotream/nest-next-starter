import { Test } from '@nestjs/testing';
import { TerminusModule, TypeOrmHealthIndicator } from '@nestjs/terminus';
import request from 'supertest';
import { HealthController } from './health.controller.js';
import { RedisHealthIndicator } from './redis.health.js';

async function createApp(redisUp: boolean) {
  const moduleRef = await Test.createTestingModule({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [
      {
        provide: TypeOrmHealthIndicator,
        useValue: { pingCheck: () => ({ database: { status: 'up' } }) },
      },
      {
        provide: RedisHealthIndicator,
        useValue: { ping: () => ({ redis: { status: redisUp ? 'up' : 'down' } }) },
      },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('health endpoints', () => {
  it('liveness stays 200 while a dependency is down', async () => {
    const app = await createApp(false);

    await request(app.getHttpServer()).get('/health/live').expect(200);
    await app.close();
  });

  it('readiness is 200 when dependencies are up', async () => {
    const app = await createApp(true);

    await request(app.getHttpServer()).get('/health/ready').expect(200);
    await app.close();
  });

  it('readiness is 503 when Redis is down', async () => {
    const app = await createApp(false);

    const res = await request(app.getHttpServer()).get('/health/ready').expect(503);

    expect(res.body.error).toMatchObject({ redis: { status: 'down' } });
    await app.close();
  });
});
