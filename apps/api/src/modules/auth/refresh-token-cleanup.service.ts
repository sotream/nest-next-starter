import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { Repository } from 'typeorm';
import type { EnvironmentVariables } from '../../infrastructure/config/env.validation.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 1000;
const JOB_NAME = 'refresh-token-cleanup';

/**
 * Deletes refresh tokens that can no longer matter: expired ones, and revoked ones kept past the
 * retention window (revoked rows are what reuse detection relies on, so they outlive the token itself).
 */
@Injectable()
export class RefreshTokenCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  /** The schedule comes from config, which decorators cannot read, so the job is registered here. */
  onApplicationBootstrap(): void {
    const job = CronJob.from({
      cronTime: this.config.get('REFRESH_CLEANUP_CRON', { infer: true }),
      onTick: () => void this.runSafely(),
      start: true,
    });
    this.scheduler.addCronJob(JOB_NAME, job);
  }

  /**
   * Deletes in batches of `batchSize`. `FOR UPDATE SKIP LOCKED` lets several replicas run the job at the
   * same time without blocking each other or deleting the same row twice. Returns the rows deleted.
   */
  async cleanup(now = new Date(), batchSize = BATCH_SIZE): Promise<number> {
    const revokedBefore = new Date(
      now.getTime() - this.config.get('REFRESH_REVOKED_RETENTION_DAYS', { infer: true }) * DAY_MS,
    );
    let total = 0;
    let deleted: number;
    do {
      deleted = await this.deleteBatch(now, revokedBefore, batchSize);
      total += deleted;
    } while (deleted === batchSize);
    return total;
  }

  private async deleteBatch(now: Date, revokedBefore: Date, limit: number): Promise<number> {
    // The Postgres driver answers a DELETE with [returnedRows, affectedCount].
    const [, affected]: [unknown, number] = await this.tokens.query(
      `DELETE FROM refresh_tokens WHERE id IN (
         SELECT id FROM refresh_tokens
         WHERE "expiresAt" < $1 OR "revokedAt" < $2
         LIMIT $3 FOR UPDATE SKIP LOCKED
       )`,
      [now, revokedBefore, limit],
    );
    return affected;
  }

  private async runSafely(): Promise<void> {
    try {
      const removed = await this.cleanup();
      if (removed > 0) this.logger.log(`Removed ${removed} stale refresh tokens`);
    } catch (error) {
      this.logger.error(
        `Refresh token cleanup failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
