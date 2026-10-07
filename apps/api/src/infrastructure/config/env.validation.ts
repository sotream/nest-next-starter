import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  MinLength,
  Min,
  validateSync,
} from 'class-validator';
import type { ValidationError } from 'class-validator';
import { validateCronExpression } from 'cron';

import { DEFAULT_DATABASE_URL } from './defaults.js';

const APP_ENVS = ['dev', 'prod'] as const;
export type AppEnv = (typeof APP_ENVS)[number];
const MIN_PROD_SECRET_LENGTH = 32;
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEV_ACCESS_SECRET = 'dev-only-access-secret-change-me-before-deploying';
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/**
 * Typed, validated environment. Defaults match docker-compose; `APP_ENV=prod` rejects them (see
 * `productionProblems`). `NODE_ENV` is deliberately absent: it only belongs to Node and Next builds.
 */
export class EnvironmentVariables {
  /** No default on purpose: an unset environment must not silently behave as dev or prod. */
  @IsIn(APP_ENVS)
  APP_ENV!: AppEnv;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @IsUrl({ require_tld: false })
  WEB_ORIGIN = 'http://localhost:3000';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL = DEFAULT_DATABASE_URL;

  @IsString()
  @IsNotEmpty()
  REDIS_URL = DEFAULT_REDIS_URL;

  @IsIn(LOG_LEVELS)
  LOG_LEVEL: (typeof LOG_LEVELS)[number] = 'info';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_TTL_MS = 60_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 100;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET = DEV_ACCESS_SECRET;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  ACCESS_TOKEN_TTL_SECONDS = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS = 7;

  /** Cron expression for the refresh-token cleanup job (default: daily at 03:00 server time). */
  @IsString()
  @IsNotEmpty()
  REFRESH_CLEANUP_CRON = '0 3 * * *';

  /**
   * How long revoked refresh tokens are kept. Must be at least REFRESH_TOKEN_TTL_DAYS: a revoked token is
   * what lets reuse detection recognise a replay while the token could still be valid.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_REVOKED_RETENTION_DAYS = 14;

  /** Off by default: the app boots without a broker unless this is "true". */
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  KAFKA_ENABLED = false;

  /** Comma-separated host:port list. */
  @IsString()
  @IsNotEmpty()
  KAFKA_BROKERS = 'localhost:9092';

  @IsString()
  @IsNotEmpty()
  KAFKA_CLIENT_ID = 'nest-next-starter-api';

  @IsString()
  @IsNotEmpty()
  KAFKA_GROUP_ID = 'nest-next-starter-api';
}

function formatErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => `  - ${error.property}: ${Object.values(error.constraints ?? {}).join('; ')}`)
    .join('\n');
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Rules that span several variables, so decorators cannot express them. */
export function consistencyProblems(env: EnvironmentVariables): string[] {
  const problems: string[] = [];
  if (!validateCronExpression(env.REFRESH_CLEANUP_CRON).valid) {
    problems.push('REFRESH_CLEANUP_CRON must be a valid cron expression');
  }
  if (env.REFRESH_REVOKED_RETENTION_DAYS < env.REFRESH_TOKEN_TTL_DAYS) {
    problems.push('REFRESH_REVOKED_RETENTION_DAYS must be at least REFRESH_TOKEN_TTL_DAYS');
  }
  return problems;
}

/** Settings that are fine on a laptop but unsafe once reachable from the internet. */
export function productionProblems(env: EnvironmentVariables): string[] {
  const problems: string[] = [];
  if (
    env.JWT_ACCESS_SECRET === DEV_ACCESS_SECRET ||
    env.JWT_ACCESS_SECRET.length < MIN_PROD_SECRET_LENGTH
  ) {
    problems.push(
      `JWT_ACCESS_SECRET must be a non-default value of at least ${MIN_PROD_SECRET_LENGTH} characters`,
    );
  }
  if (safeUrl(env.WEB_ORIGIN)?.protocol !== 'https:') {
    problems.push('WEB_ORIGIN must be an https origin');
  }
  const db = safeUrl(env.DATABASE_URL);
  if (!db?.password || db.password === 'app' || env.DATABASE_URL === DEFAULT_DATABASE_URL) {
    problems.push('DATABASE_URL must not use the default credentials');
  }
  const redis = safeUrl(env.REDIS_URL);
  if (!redis?.password || env.REDIS_URL === DEFAULT_REDIS_URL) {
    problems.push('REDIS_URL must include a password');
  }
  return problems;
}

/** Fails fast at startup with a readable list of every invalid variable. */
export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, raw);
  const errors = validateSync(env);
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${formatErrors(errors)}`);
  }
  const problems = [
    ...consistencyProblems(env),
    ...(env.APP_ENV === 'prod' ? productionProblems(env) : []),
  ];
  if (problems.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
    );
  }
  return env;
}
