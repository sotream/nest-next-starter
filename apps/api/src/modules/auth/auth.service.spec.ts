import { randomUUID } from 'node:crypto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import type { EnvironmentVariables } from '../../infrastructure/config/env.validation.js';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

/** Minimal in-memory stand-ins for the two repositories, covering only what AuthService calls. */
function createFakeUsers(): Repository<User> {
  const rows: User[] = [];
  const fake = {
    create: (data: Partial<User>) => Object.assign(new User(), data),
    save: (user: User) => {
      if (rows.some((row) => row.email === user.email)) {
        const driverError = Object.assign(new Error('duplicate key'), { code: '23505' });
        return Promise.reject(new QueryFailedError('INSERT', [], driverError));
      }
      user.id = randomUUID();
      rows.push(user);
      return Promise.resolve(user);
    },
    findOneBy: (where: Partial<User>) =>
      Promise.resolve(rows.find((row) => row.email === where.email || row.id === where.id) ?? null),
  };
  return fake as unknown as Repository<User>;
}

function createFakeTokens(): { repo: Repository<RefreshToken>; rows: RefreshToken[] } {
  const rows: RefreshToken[] = [];
  const matches = (row: RefreshToken, where: Partial<RefreshToken>): boolean =>
    (where.id === undefined || row.id === where.id) &&
    (where.familyId === undefined || row.familyId === where.familyId) &&
    // AuthService only ever filters revokedAt with IsNull(), i.e. "still active".
    (where.revokedAt === undefined || row.revokedAt === null);
  const fake = {
    create: (data: Partial<RefreshToken>) => Object.assign(new RefreshToken(), data),
    save: (token: RefreshToken) => {
      token.id = randomUUID();
      rows.push(token);
      return Promise.resolve(token);
    },
    findOneBy: (where: Partial<RefreshToken>) =>
      Promise.resolve(rows.find((row) => row.tokenHash === where.tokenHash) ?? null),
    update: (where: Partial<RefreshToken>, patch: Partial<RefreshToken>) => {
      const hit = rows.filter((row) => matches(row, where));
      hit.forEach((row) => Object.assign(row, patch));
      return Promise.resolve({ affected: hit.length });
    },
  };
  return { repo: fake as unknown as Repository<RefreshToken>, rows };
}

function createService() {
  const tokens = createFakeTokens();
  const config = { get: () => 7 } as unknown as ConfigService<EnvironmentVariables, true>;
  const service = new AuthService(
    createFakeUsers(),
    tokens.repo,
    new JwtService({
      secret: 'test-secret-test-secret-test-secret',
      signOptions: { expiresIn: 60 },
    }),
    config,
  );
  return { service, tokenRows: tokens.rows };
}

const CREDENTIALS = { email: 'a@example.com', password: 'Password123!' };

describe('AuthService', () => {
  describe('signUp / signIn', () => {
    it('stores only hashes: never the password or the raw refresh token', async () => {
      const { service, tokenRows } = createService();

      const result = await service.signUp(CREDENTIALS);

      expect(result.user.passwordHash).not.toContain(CREDENTIALS.password);
      expect(tokenRows).toHaveLength(1);
      expect(tokenRows[0]?.tokenHash).not.toBe(result.refreshToken);
    });

    it('rejects a duplicate email with 409', async () => {
      const { service } = createService();
      await service.signUp(CREDENTIALS);

      await expect(service.signUp(CREDENTIALS)).rejects.toBeInstanceOf(ConflictException);
    });

    it('signs in with the right password only', async () => {
      const { service } = createService();
      await service.signUp(CREDENTIALS);

      await expect(service.signIn(CREDENTIALS)).resolves.toHaveProperty('accessToken');
      await expect(
        service.signIn({ ...CREDENTIALS, password: 'nope-nope' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('gives the same error for an unknown email as for a wrong password', async () => {
      const { service } = createService();

      await expect(service.signIn(CREDENTIALS)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh rotation', () => {
    it('issues a new token in the same family and revokes the old one', async () => {
      const { service, tokenRows } = createService();
      const first = await service.signUp(CREDENTIALS);

      const second = await service.refresh(first.refreshToken);

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(tokenRows[0]?.revokedAt).toBeInstanceOf(Date);
      expect(tokenRows[1]?.familyId).toBe(tokenRows[0]?.familyId);
      expect(tokenRows[1]?.revokedAt).toBeNull();
    });

    it('revokes the whole family when a rotated token is replayed', async () => {
      const { service } = createService();
      const first = await service.signUp(CREDENTIALS);
      const second = await service.refresh(first.refreshToken);

      await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      // The legitimate holder of `second` is logged out too: we cannot tell who replayed.
      await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lets only one of two concurrent refreshes with the same token succeed', async () => {
      const { service } = createService();
      const { refreshToken } = await service.signUp(CREDENTIALS);

      const outcomes = await Promise.allSettled([
        service.refresh(refreshToken),
        service.refresh(refreshToken),
      ]);

      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    });

    it('rejects expired, unknown and missing tokens', async () => {
      const { service, tokenRows } = createService();
      const { refreshToken } = await service.signUp(CREDENTIALS);
      tokenRows[0]!.expiresAt = new Date(Date.now() - 1000);

      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.refresh('unknown')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the session so its token can no longer refresh', async () => {
      const { service } = createService();
      const { refreshToken } = await service.signUp(CREDENTIALS);

      await service.logout(refreshToken);

      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('is a no-op without a token', async () => {
      const { service } = createService();

      await expect(service.logout(undefined)).resolves.toBeUndefined();
    });
  });
});
