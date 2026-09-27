import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

/**
 * The mock API is served by the dev server on the same origin under `/api`, so
 * there is nothing to start here and no service worker to register.
 *
 * That is deliberate. A service worker has to be registered from a script served
 * at the origin root; when that script is missing, registration fails silently,
 * every request falls through to the real backend, and the symptom is a CORS
 * error rather than an obvious failure. Serving mocks from the dev server makes
 * that failure mode impossible, and it works on any port.
 *
 * The mock layer is dev-only: it lives in a Vite plugin with `apply: 'serve'`,
 * which never runs during `vite build`. `npm run build` additionally runs
 * `scripts/verify-no-mocks.mjs`, which fails if any mock marker reaches `dist/`.
 *
 * To remove mocks permanently: delete `src/mocks/`, delete the plugin import and
 * `mockApiPlugin()` from `vite.config.ts`, and set `VITE_USE_MOCK=false` in
 * `.env.local`. See frontend/README.md.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Must sit above <App />: React unmounts the whole tree on an uncaught
        render error, so a boundary nested inside a route could not catch a
        failure thrown by the router or the shell itself. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
