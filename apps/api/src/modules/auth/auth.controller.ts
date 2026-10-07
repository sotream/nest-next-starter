import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { WebOriginGuard } from '../../common/guards/web-origin.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { EnvironmentVariables } from '../../infrastructure/config/env.validation.js';
import { AuthService } from './auth.service.js';
import type { AuthResult } from './auth.service.js';
import {
  AUTH_THROTTLE,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_THROTTLE,
} from './auth.constants.js';
import { AuthResponseDto, SignInDto, SignUpDto, UserResponseDto } from './dto/auth.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('sign-up')
  @ApiOperation({ summary: 'Create an account and start a session' })
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.signUp(dto));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in with email and password' })
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.signIn(dto));
  }

  @Public()
  @Throttle(REFRESH_THROTTLE)
  @UseGuards(WebOriginGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({ summary: 'Rotate the refresh cookie and get a new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.refresh(this.readRefreshCookie(req)));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @UseGuards(WebOriginGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({ summary: 'End the session and clear the refresh cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current user' })
  async me(@CurrentUser() current: AuthenticatedUser): Promise<UserResponseDto> {
    return this.toUserDto(await this.auth.getProfile(current.id));
  }

  private respond(res: Response, { user, accessToken, refreshToken }: AuthResult): AuthResponseDto {
    const maxAge = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * DAY_MS;
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...this.cookieOptions(), maxAge });
    return { accessToken, user: this.toUserDto(user) };
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('APP_ENV', { infer: true }) === 'prod',
      path: REFRESH_COOKIE_PATH,
    };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const value: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
    return typeof value === 'string' ? value : undefined;
  }

  private toUserDto({ id, email, role }: UserResponseDto): UserResponseDto {
    return { id, email, role };
  }
}
