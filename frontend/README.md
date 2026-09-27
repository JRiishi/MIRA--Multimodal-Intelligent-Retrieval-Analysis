# MIRA Frontend

React 19 + TypeScript + Vite 8 + Tailwind v4 UI for MIRA — Multimodal Intelligent Retrieval & Analysis.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script                  | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Vite dev server with HMR                                    |
| `npm run build`         | Typecheck, bundle, **then run the production leak gate**     |
| `npm run lint`          | Oxlint                                                       |
| `npm run preview`       | Serve the production build locally                           |
| `npm run verify:no-mocks` | Standalone mock-leak scan of `dist/`                       |

## Environment

Copy `.env.example` to `.env.local` and edit. `.env.local` is git-ignored.

| Variable           | Default                 | Purpose                                  |
| ------------------ | ----------------------- | ---------------------------------------- |
| `VITE_API_URL`     | `http://127.0.0.1:8000` | FastAPI backend origin                   |
| `VITE_USE_MOCK`    | `false`                 | Serve fixtures instead of the backend   |

---

## Mock data (development only)

The UI can be built and reviewed end to end with **no Python process running**.

### How it works

The dev server serves fixture data on its **own origin** under `/api`, and the
app's axios base URL becomes the relative path `/api`. Because the request is
same-origin, the browser never issues a cross-origin call, so **CORS cannot be a
factor** and nothing needs to be listening on port 8000.

This works on **any dev port** without re-registering anything.

```bash
# frontend/.env.local
VITE_USE_MOCK=true
```

Then `npm run dev`.

### Why not a service worker

The obvious approach is MSW's `setupWorker`, which registers a service worker to
intercept requests. That was tried first and it is a footgun: `setupWorker`
fetches `/mockServiceWorker.js` from the origin root to register itself, and if
that generated file is absent, **registration fails silently**. Every request
then falls through to the real backend, and the symptom is a CORS error plus a
404 rather than anything that points at the missing worker.

Serving mocks from the dev server removes the failure mode entirely: no worker to
install, go stale, or scope to a single port. The mock module is loaded with
`ssrLoadModule`, so it is not in the module graph at all.

### What is in the fixtures

`src/mocks/fixtures.ts` mirrors the real Pydantic schemas in
`backend/app/schemas/*`: 4 projects, 15 media assets spanning the processing
states, evidence, search results, chat history, timelines and reports. Responses
use the same status codes and `{ "detail": ... }` error bodies as the real API.
Assignments, uploads, deletes and project deletion mutate in-memory state, so
the UI behaves as if the API were real.

### Why the production build can never use it

| # | Layer | Mechanism |
|---|---|---|
| 1 | `apply: 'serve'` | The plugin's `configureServer` hook only runs for `vite dev`. `vite build` never invokes it. |
| 2 | No static import | The mock module is loaded via `ssrLoadModule`, which exists only on the dev server, so the bundler has no edge to follow. |
| 3 | Default off | `VITE_USE_MOCK` defaults to `false`; unset means "call the real backend". |
| 4 | No dependency | The mock layer uses no runtime and no dev dependencies. |
| 5 | **Build-time leak gate** | `npm run build` runs `scripts/verify-no-mocks.mjs`, which scans `dist/` and **exits non-zero** on any mock marker. |

Confirm at any time:

```bash
npm run build
# [verify:no-mocks] PASS — N files scanned in dist/, 0 mock artefacts found.
```

The gate also still greps for the old MSW markers, so a regression back to a
service worker is caught too.

### Tearing it down

Three steps, fully reversible:

1. Delete `src/mocks/`
2. In `vite.config.ts`, delete the `mockApiPlugin` function, its `import type`
   lines, and its entry in the `plugins` array
3. Set `VITE_USE_MOCK=false` in `.env.local`

Keep `scripts/verify-no-mocks.mjs` and the `verify:no-mocks` script: they are
harmless and worth keeping as a regression guard.

`dist/` and `node_modules/` are git-ignored, so nothing here is ever committed
or deployed.

### If you ever run a real backend

Set `VITE_USE_MOCK=false`. The app then targets `VITE_API_URL` and the backend's
own CORS middleware applies. Nothing else changes.

---

## Project structure

```text
src/
  components/
    layout/AppLayout.tsx    Shell: sidebar, nav landmarks
    ChatMessageRenderer.tsx Renders grounded LLM answers + evidence
  hooks/                    TanStack Query hooks (projects, media, search, chat)
  pages/                    Dashboard, Projects, ProjectDetail,
                            MediaLibrary, Search, NeedsReview, Reports
  services/api.ts           Axios instance (env-driven baseURL)
  types/index.ts            Wire types mirroring backend/app/schemas/*
  mocks/                    DEV-ONLY fixtures + request router
                            (loaded by the Vite plugin, delete on teardown)
scripts/
  verify-no-mocks.mjs       Production leak gate
```

## Type contract

`src/types/index.ts` is a hand-maintained mirror of the backend Pydantic schemas.
When a backend schema changes, update the matching interface here — TypeScript
will then flag every call site that needs attention.

Note: `ProcessingStatus` is deliberately **wider** than the `ProcessingStatus`
Pydantic enum in `backend/app/schemas/media.py`, because that enum is out of
sync with the pipeline code. Ten values are actually written to
`media_assets.processing_status` across `api/media.py`, `api/projects.py` and the
column default in `models/media.py`, and `GET /media/` returns the raw DB string
rather than the enum. All ten are listed in `src/types/index.ts` with the exact
writer for each.

`UNASSIGNED` is a real processing status — `api/media.py:93` writes it when
routing cannot attribute an asset, and `api/projects.py:79` writes it when a
project is deleted.

`TERMINAL_STATUSES` (READY, FAILED, NEEDS_REVIEW, UNASSIGNED) is the single
source of truth for "the pipeline has settled", used to stop the 3-second
polling in `hooks/media.ts`. Adding a status means deciding whether it is
terminal.
