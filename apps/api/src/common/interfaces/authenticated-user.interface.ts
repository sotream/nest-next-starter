import type { Request } from 'express';
import type { Role } from '../enums/role.enum.js';

/** Identity extracted from a verified access token. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
