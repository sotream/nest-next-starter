import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { EnvironmentVariables } from '../../infrastructure/config/env.validation.js';
import { User } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { buildJwtOptions } from './jwt-options.js';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildJwtOptions(
          config.get('JWT_ACCESS_SECRET', { infer: true }),
          config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
        ),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenCleanupService,
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
