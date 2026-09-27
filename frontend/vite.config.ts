import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * DEV-ONLY mock API.
 *
 * Serves the fixtures in `src/mocks/` on the SAME ORIGIN as the app, under
 * `/api/*`. Because the app is loaded from the dev server, requests to `/api`
 * are same-origin and CORS is structurally impossible. That is the whole point:
 * the backend cannot be started in this environment, and a cross-origin
 * request to 127.0.0.1:8000 would fail on both CORS and connection.
 *
 * Guarantees that this cannot reach a production build:
 *   1. `apply: 'serve'` — the hook only runs for `vite dev`. `configureServer`
 *      is never invoked by `vite build`, so none of this code is reachable.
 *   2. The module is loaded with `ssrLoadModule`, which exists only on the dev
 *      server. There is no static import from application code, so the bundler
 *      has no edge to follow.
 *   3. `npm run build` runs `scripts/verify-no-mocks.mjs`, which fails the
 *      build if any mock marker appears in `dist/`.
 */
interface MockApi {
  handle(request: {
    method: string;
    path: string;
    query: URLSearchParams;
    json?: unknown;
  }): { status: number; body: unknown };
}

function mockApiPlugin(): Plugin {
  return {
    name: 'mira-mock-api',
    apply: 'serve',
    async configureServer(server: ViteDevServer) {
      // Loaded at runtime rather than statically imported: this keeps the mock
      // module out of the module graph entirely, so `vite build` has no edge to
      // it and no bundler warning about an unused import.
      const { createMockApi } = (await server.ssrLoadModule('/src/mocks/store.ts')) as {
        createMockApi: () => MockApi;
      };
      const api = createMockApi();

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        const rawUrl = req.url ?? '/'
        if (!rawUrl.startsWith('/api/')) return next()

        const url = new URL(rawUrl, 'http://localhost')
        // `/api/media/` -> `media/`
        const path = url.pathname.replace(/^\/api\/?/, '')

        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          let json: unknown
          const raw = Buffer.concat(chunks).toString('utf8')
          if (raw) {
            // Multipart uploads are not parsed: the route only needs to know a
            // file arrived, and the real backend re-reads EXIF server-side.
            if (!raw.startsWith('--') && !raw.includes('multipart/form-data')) {
              try {
                json = JSON.parse(raw)
              } catch {
                json = undefined
              }
            }
          }

          const result = api.handle({
            method: req.method ?? 'GET',
            path,
            query: url.searchParams,
            json,
          })

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('X-Mock-Source', 'mira-dev-middleware')
          res.end(JSON.stringify(result.body))
        })
      })

      server.config.logger.info(
        '\n  MIRA mock API active on /api  (development only, no backend required)\n',
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  build: {
    // Vite 8 is backed by Rolldown, so `rollupOptions` is deprecated in favour of
    // `rolldownOptions`. Splitting the three largest dependencies into their own
    // long-cached chunks keeps the application chunk small and lets a change in
    // app code be re-downloaded without invalidating React itself.
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/ },
            { name: 'vendor-query', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/ },
          ],
        },
      },
    },
  },
})
