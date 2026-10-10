import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { requireJsonBody } from './common/http/require-json-body.js';
import { ProblemDetailsFilter } from './common/problem-details/problem-details.filter.js';
import { validationExceptionFactory } from './common/problem-details/validation-errors.js';
import type { EnvironmentVariables } from './infrastructure/config/env.validation.js';

/** Every JSON body in this API is a few hundred bytes; the express default (100kb) is already generous. */
const JSON_BODY_LIMIT = '100kb';

/** Browsers cap this at a few minutes to hours anyway; ten minutes saves a preflight per request. */
const PREFLIGHT_MAX_AGE_SECONDS = 600;

/** HTTP-level setup shared by the real server and e2e tests, so tests exercise the same behaviour. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.disable('x-powered-by');
  // Security headers and CORS come first so that errors raised by the body parser carry them too.
  app.use(helmet());
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
    // Headers outside the CORS safelist are invisible to browser scripts unless exposed.
    exposedHeaders: ['Retry-After', 'Location', 'X-Request-Id'],
    maxAge: PREFLIGHT_MAX_AGE_SECONDS,
  });
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(requireJsonBody);
  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
}

/** Swagger UI documents every route, so it is a dev tool only. */
export function setupSwagger(app: INestApplication): void {
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  if (config.get('APP_ENV', { infer: true }) !== 'dev') return;
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('nest-next-starter API').setVersion('1').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
