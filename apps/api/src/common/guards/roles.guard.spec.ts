import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum.js';
import { RolesGuard } from './roles.guard.js';

function createContext(user?: { id: string; role: Role }): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function createGuard(required?: Role[]): RolesGuard {
  return new RolesGuard({ getAllAndOverride: () => required } as unknown as Reflector);
}

describe('RolesGuard', () => {
  it('allows any authenticated user when no roles are required', () => {
    expect(createGuard().canActivate(createContext({ id: '1', role: Role.USER }))).toBe(true);
  });

  it('allows a user holding a required role', () => {
    const guard = createGuard([Role.ADMIN]);

    expect(guard.canActivate(createContext({ id: '1', role: Role.ADMIN }))).toBe(true);
  });

  it('forbids a user without the required role, and anonymous requests', () => {
    const guard = createGuard([Role.ADMIN]);

    expect(() => guard.canActivate(createContext({ id: '1', role: Role.USER }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });
});
