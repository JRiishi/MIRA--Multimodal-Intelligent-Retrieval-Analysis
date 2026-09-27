import axios from 'axios';

/**
 * Base URL resolution, in priority order:
 *
 * 1. `VITE_USE_MOCK === 'true'`  -> `/api`, the dev server's same-origin mock.
 *    Served by the dev-only plugin in `vite.config.ts`. Same origin means the
 *    browser never makes a cross-origin request, so CORS cannot be a factor
 *    and no Python process is required.
 * 2. `VITE_API_URL`             -> an explicit backend origin, for pointing the
 *    app at a running API or a deployed environment.
 * 3. `http://127.0.0.1:8000`    -> the documented local default.
 */
function resolveBaseUrl(): string {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    // Relative: resolved against the dev server origin at request time.
    return '/api';
  }
  return import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
