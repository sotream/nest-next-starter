import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { EnvironmentVariables } from '../config/env.validation.js';

// Secrets must never reach log sinks; see docs/adr/0003-pino-logging.md.
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.refreshToken',
  'req.body.accessToken',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
];

const REQUEST_ID_HEADER = 'x-request-id';

// The id is echoed in a response header and written to logs, so only accept a short, plain value.
const SAFE_REQUEST_ID = /^[\w.-]{1,64}$/;

export function resolveRequestId(req: IncomingMessage): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}

export const AppLoggerModule = LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
    const isProduction = config.get('APP_ENV', { infer: true }) === 'prod';
    return {
      pinoHttp: {
        level: config.get('LOG_LEVEL', { infer: true }),
        genReqId: (req, res) => {
          const id = resolveRequestId(req);
          res.setHeader(REQUEST_ID_HEADER, id);
          return id;
        },
        // Bound to the per-request child logger, so every line logged during a request carries it.
        customProps: (req) => ({ requestId: req.id }),
        redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
        transport: isProduction
          ? undefined
          : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
      },
    };
  },
});
