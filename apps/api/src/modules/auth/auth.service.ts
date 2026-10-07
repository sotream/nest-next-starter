import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash, hashSync } from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { isUniqueViolation } from '../../common/utils/db-errors.js';
import type { EnvironmentVariables } from '../../infrastructure/config/env.validation.js';
import { User } from '../users/entities/user.entity.js';
import type { SignInDto, SignUpDto } from './dto/auth.dto.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

const BCRYPT_COST = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = hashSync(randomUUID(), BCRYPT_COST);

export interface AuthResult {
  user: User;
  accessToken: string;
  /** Raw opaque token for the httpOnly cookie. Only its hash is persisted. */
  refreshToken: string;
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * Credentials and session lifecycle. Refresh tokens rotate on every use; presenting an
 * already-rotated token revokes its whole family (see docs/adr/0002-auth-refresh-rotation.md).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async signUp({ email, password }: SignUpDto): Promise<AuthResult> {
    const passwordHash = await hash(password, BCRYPT_COST);
    const user = await this.createUser(email, passwordHash);
    return this.issueTokens(user, randomUUID());
  }

  async signIn({ email, password }: SignInDto): Promise<AuthResult> {
    const user = await this.users.findOneBy({ email });
    const passwordMatches = await compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user, randomUUID());
  }

  async refresh(rawToken: string | undefined): Promise<AuthResult> {
    const stored = await this.findStoredToken(rawToken);
    if (stored.revokedAt) {
      return this.rejectReuse(stored);
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired');
    }
    // Conditional update is atomic, so of two concurrent refreshes with one token only one wins.
    const { affected } = await this.tokens.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!affected) {
      return this.rejectReuse(stored);
    }
    const user = await this.users.findOneBy({ id: stored.userId });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(user, stored.familyId);
  }

  /** Idempotent: unknown or missing tokens are ignored. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    const stored = await this.tokens.findOneBy({ tokenHash: hashToken(rawToken) });
    if (stored) {
      await this.revokeFamily(stored.familyId);
    }
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private async createUser(email: string, passwordHash: string): Promise<User> {
    try {
      return await this.users.save(this.users.create({ email, passwordHash, role: Role.USER }));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  private async findStoredToken(rawToken: string | undefined): Promise<RefreshToken> {
    const stored = rawToken
      ? await this.tokens.findOneBy({ tokenHash: hashToken(rawToken) })
      : null;
    if (!stored) {
      throw new UnauthorizedException('Invalid session');
    }
    return stored;
  }

  private async rejectReuse(stored: RefreshToken): Promise<never> {
    this.logger.warn(
      `Refresh token reuse detected; revoking family ${stored.familyId} of user ${stored.userId}`,
    );
    await this.revokeFamily(stored.familyId);
    throw new UnauthorizedException('Invalid session');
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.tokens.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private async issueTokens(user: User, familyId: string): Promise<AuthResult> {
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.tokens.save(
      this.tokens.create({
        tokenHash: hashToken(refreshToken),
        familyId,
        userId: user.id,
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
        revokedAt: null,
      }),
    );
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { user, accessToken, refreshToken };
  }
}
