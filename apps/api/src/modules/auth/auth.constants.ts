/** Prefixed because cookies are not port-scoped: other apps on localhost can set a generic name. */
export const REFRESH_COOKIE_NAME = 'starter_rt';

/** Scoped so the browser only sends the refresh cookie to auth endpoints. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Stricter than the global limit to slow down credential stuffing. Per IP, per window. */
export const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

/**
 * Refresh runs on every page load without a live token, so it gets its own, looser bucket (throttler
 * keys are per route handler). Rotation and reuse detection already protect it from guessing.
 */
export const REFRESH_THROTTLE = { default: { limit: 60, ttl: 60_000 } };
