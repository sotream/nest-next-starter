import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import type { HealthCheckResult } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator.js';
import { RedisHealthIndicator } from './redis.health.js';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /** Process only, no dependencies: an orchestrator restarts the container when this fails. */
  @Public()
  @SkipThrottle()
  @Get('live')
  @ApiOperation({ summary: 'Liveness: the process is up' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Dependencies: an orchestrator stops routing traffic here when this fails, without restarting. */
  @Public()
  @SkipThrottle()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness: database and Redis are reachable' })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck('database'), () => this.redis.ping('redis')]);
  }
}
