import { Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupSwagger } from './setup-app.js';

@Controller()
class PingController {
  @Get('ping')
  ping(): string {
    return 'pong';
  }
}

async function docsStatus(appEnv: 'dev' | 'prod'): Promise<number> {
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ ignoreEnvFile: true, load: [() => ({ APP_ENV: appEnv })] })],
    controllers: [PingController],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  setupSwagger(app);
  await app.init();
  try {
    return (await request(app.getHttpServer()).get('/api/docs')).status;
  } finally {
    await app.close();
  }
}

describe('setupSwagger', () => {
  it('serves Swagger UI in dev', async () => {
    expect(await docsStatus('dev')).toBe(200);
  });

  it('is off in prod', async () => {
    expect(await docsStatus('prod')).toBe(404);
  });
});
