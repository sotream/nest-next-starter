import type { AuthResponse, Page, User, Vehicle, VehicleInput } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_PREFIX = `${API_URL}/api/v1`;

/** Non-2xx response. `messages` holds the API's validation or error text, ready to show. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages.join(' '));
  }
}

// The access token lives in memory only, so a page reload restores the session via the refresh cookie.
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let inFlightRefresh: Promise<AuthResponse | null> | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

function extractMessages(body: unknown, fallback: string): string[] {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body;
    if (typeof message === 'string') return [message];
    if (Array.isArray(message)) return message.filter((m): m is string => typeof m === 'string');
  }
  return [fallback];
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(`${API_PREFIX}${path}`, { ...init, headers, credentials: 'include' });
}

async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null);
  return new ApiError(res.status, extractMessages(body, 'Something went wrong. Please try again.'));
}

/**
 * The in-memory single flight below only covers one tab. Tabs share the refresh cookie, so a Web Lock
 * queues their refreshes: the second tab then sends the already rotated cookie instead of a stale one.
 * Browsers without Web Locks keep the per-tab behaviour.
 */
function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('starter-refresh', task)
    : task();
}

/**
 * Refresh tokens rotate, so two parallel refreshes would look like token theft to the server.
 * Every caller therefore shares one in-flight request.
 *
 * Resolves to null only when the server says there is no session (401). A network failure, 429 or 5xx
 * rejects instead, so callers can offer a retry rather than treat a valid session as signed out.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  inFlightRefresh ??= (async () => {
    try {
      const res = await withCrossTabLock(() => send('/auth/refresh', { method: 'POST' }));
      if (res.status === 401) {
        accessToken = null;
        return null;
      }
      if (!res.ok) throw await toApiError(res);
      const session = (await res.json()) as AuthResponse;
      accessToken = session.accessToken;
      return session;
    } finally {
      inFlightRefresh = null;
    }
  })();
  return inFlightRefresh;
}

/** Retries once after a refresh when the access token has expired, then gives up and signs out. */
async function request(path: string, init?: RequestInit): Promise<Response> {
  let res = await send(path, init);
  if (res.status === 401 && (await refreshSession())) {
    res = await send(path, init);
  }
  if (res.status === 401) {
    accessToken = null;
    onSessionExpired?.();
  }
  if (!res.ok) throw await toApiError(res);
  return res;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return (await (await request(path, init)).json()) as T;
}

async function startSession(path: string, body: unknown): Promise<User> {
  const res = await send(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw await toApiError(res);
  const session = (await res.json()) as AuthResponse;
  accessToken = session.accessToken;
  return session.user;
}

export const api = {
  signIn: (email: string, password: string) => startSession('/auth/sign-in', { email, password }),
  signUp: (email: string, password: string) => startSession('/auth/sign-up', { email, password }),
  /**
   * Rejects when the server could not revoke the session, so the UI never claims a sign-out that did not
   * happen. A 401 counts as success: the session is already gone on the server.
   */
  async signOut(): Promise<void> {
    const res = await send('/auth/logout', { method: 'POST' });
    if (!res.ok && res.status !== 401) throw await toApiError(res);
    accessToken = null;
  },
  vehicles: {
    list: (limit: number, offset: number) =>
      requestJson<Page<Vehicle>>(`/vehicles?limit=${limit}&offset=${offset}`),
    create: (input: VehicleInput) =>
      requestJson<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: VehicleInput) =>
      requestJson<Vehicle>(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    async remove(id: string): Promise<void> {
      await request(`/vehicles/${id}`, { method: 'DELETE' });
    },
  },
};
