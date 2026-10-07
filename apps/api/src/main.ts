import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './infrastructure/config/env.validation.js';
import { configureApp, setupSwagger } from './setup-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  configureApp(app);
  setupSwagger(app);

  const port = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService).get('PORT', {
    infer: true,
  });
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  // Logger may not exist yet (e.g. env validation failed), so print the message plainly.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
