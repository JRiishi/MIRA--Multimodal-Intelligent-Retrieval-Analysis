/**
 * DEV-ONLY MOCK API — DELETED ENTIRELY WHEN THE MOCK LAYER IS TORN DOWN.
 *
 * Transport-agnostic request router for the local mock API. It is consumed by
 * the Vite dev server in `vite.config.ts` and served on the SAME ORIGIN under
 * `/api/*`, so the browser never makes a cross-origin request.
 *
 * Why not a service worker: MSW's `setupWorker` fetches `/mockServiceWorker.js`
 * from the origin to register itself. Without that generated file the
 * registration silently fails, every request passes through to the real
 * backend, and you get a CORS error instead of fixture data. Serving mocks from
 * the dev server removes the failure mode entirely:
 *
 *   - no service worker to install, go stale, or scope to a single port
 *   - same origin, so CORS is structurally impossible
 *   - works on any dev port without re-registering anything
 *   - `apply: 'serve'`, so it cannot exist in a production build at all
 *
 * One route per FastAPI endpoint the frontend calls, with the same status codes
 * and `{ "detail": ... }` error bodies the real API returns.
 */
import type {
  AssetTransformations,
  ChatHistoryItem,
  ChatMessageResponse,
  ChangeAnalysisResult,
  MediaAsset,
  MediaDetail,
  ProcessingStatus,
  Project,
  ProjectCreate,
  ProjectReportResponse,
  ProjectTimelineItem,
  SearchResponse,
} from '../types';
import {
  chatEvidenceFor,
  chatHistory as seededChatHistory,
  changeAnalysisFor,
  mediaAssets,
  mediaDetails,
  projects,
  reportFor,
  searchFixtures,
  timelineFor,
  transformations,
} from './fixtures';

const PIPELINE: Partial<Record<ProcessingStatus, ProcessingStatus>> = {
  UPLOADED: 'ANALYZING',
  ANALYZING: 'ROUTING',
  ROUTING: 'INDEXING',
  INDEXING: 'READY',
};

export interface MockRequest {
  method: string;
  /** Path only, without the `/api` prefix. */
  path: string;
  query: URLSearchParams;
  /** Parsed JSON body, or undefined for form/multipart or empty bodies. */
  json?: unknown;
}

export interface MockResponse {
  status: number;
  body: unknown;
}

const ok = (body: unknown): MockResponse => ({ status: 200, body });
const fail = (status: number, detail: string): MockResponse => ({ status, body: { detail } });
const notFound = (detail: string) => fail(404, detail);
const unprocessable = (detail: string) => fail(422, detail);
const badRequest = (detail: string) => fail(400, detail);

/**
 * Creates an isolated mock API instance.
 *
 * A factory rather than a module-level singleton so each dev server has its own
 * state and a hot reload cannot leak state between sessions.
 */
export function createMockApi() {
  const projectStore: Project[] = projects.map((p) => ({ ...p, tags: [...p.tags] }));
  const assetStore: MediaAsset[] = mediaAssets.map((a) => ({ ...a }));
  const detailStore: Record<string, MediaDetail> = Object.fromEntries(
    Object.entries(mediaDetails).map(([id, d]) => [id, { ...d }]),
  );
  const transformStore: Record<string, AssetTransformations> = {
    ...transformations,
  };
  const chatStore = new Map<string, ChatHistoryItem[]>();
  chatStore.set('prj-solar-01', seededChatHistory.map((m) => ({ ...m })));

  const newId = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

  /** Advances in-flight assets one step per read so the polling UI is real. */
  const advancePipeline = () => {
    for (const asset of assetStore) {
      const next = PIPELINE[asset.processing_status];
      if (!next) continue;
      asset.processing_status = next;
      if (next === 'READY' && asset.routing_confidence == null) {
        asset.routing_confidence = 0.64;
      }
    }
  };

  const asBody = <T,>(value: unknown): T => value as T;

  function handle(req: MockRequest): MockResponse {
    const { method, path, query } = req;
    const segments = path.split('/').filter(Boolean);

    /* ----------------------------- PROJECTS ---------------------------- */

    if (segments[0] === 'projects' && segments.length === 1) {
      if (method === 'GET') return ok(projectStore);
      if (method === 'POST') {
        const body = asBody<ProjectCreate>(req.json ?? {});
        if (!body.name?.trim()) return unprocessable('name is required');
        const project: Project = {
          id: newId('prj'),
          name: body.name.trim(),
          description: body.description ?? null,
          tags: body.tags ?? [],
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          location_name: body.location_name ?? null,
          created_at: new Date().toISOString(),
        };
        projectStore.unshift(project);
        return ok(project);
      }
    }

    if (segments[0] === 'projects' && segments.length >= 2) {
      const projectId = segments[1];
      const tail = segments.slice(2);

      if (tail.length === 0) {
        if (method === 'GET') {
          const project = projectStore.find((p) => p.id === projectId);
          return project ? ok(project) : notFound('Project not found');
        }
        if (method === 'DELETE') {
          const index = projectStore.findIndex((p) => p.id === projectId);
          if (index === -1) return notFound('Project not found');
          projectStore.splice(index, 1);
          // Mirrors api/projects.py:78-79, which unlinks media and marks it.
          for (const asset of assetStore) {
            if (asset.project_id === projectId) {
              asset.project_id = null;
              asset.processing_status = 'UNASSIGNED';
            }
          }
          return ok({ deleted: true });
        }
      }

      /* chat */
      if (tail[0] === 'chat' && tail[1] === 'history') {
        if (method === 'GET') return ok(chatStore.get(projectId) ?? []);
        if (method === 'DELETE') {
          chatStore.set(projectId, []);
          return ok({ message: 'Chat history cleared', project_id: projectId });
        }
      }

      if (tail[0] === 'chat' && tail.length === 1 && method === 'POST') {
        if (!projectStore.some((p) => p.id === projectId)) return notFound('Project not found');
        const message = asBody<{ message?: string }>(req.json ?? {}).message ?? '';
        const history = chatStore.get(projectId) ?? [];
        const now = new Date().toISOString();
        history.push({
          id: newId('msg'),
          role: 'user',
          message,
          intent: null,
          evidence: null,
          created_at: now,
        });

        const project = projectStore.find((p) => p.id === projectId)!;
        const evidence = chatEvidenceFor(projectId, 3);
        const answer =
          evidence.length === 0
            ? `No visual evidence has been routed to ${project.name} yet, so there is nothing to ground an answer in. Upload field captures to the Media Library to begin.`
            : `Based on ${evidence.length} verified capture${evidence.length === 1 ? '' : 's'} from ${project.name}, the most recent activity is "${evidence[0].activity ?? 'field_capture'}". The evidence spans ${evidence.length} distinct site condition${evidence.length === 1 ? '' : 's'} and no contradicting records were found. Visual coverage is limited to those captures, so treat this as indicative rather than exhaustive.`;

        history.push({
          id: newId('msg'),
          role: 'assistant',
          message: answer,
          intent: 'STATUS_SUMMARY',
          evidence,
          created_at: new Date().toISOString(),
        });
        chatStore.set(projectId, history);

        const reply: ChatMessageResponse = {
          answer,
          project_id: projectId,
          intent: 'STATUS_SUMMARY',
          evidence,
        };
        return ok(reply);
      }

      if (tail[0] === 'timeline' && method === 'GET') {
        return ok(timelineFor(projectId) as ProjectTimelineItem[]);
      }

      if (tail[0] === 'report' && method === 'POST') {
        if (!projectStore.some((p) => p.id === projectId)) return notFound('Project not found');
        return ok(reportFor(projectId) as ProjectReportResponse);
      }

      if (tail[0] === 'change' && method === 'POST') {
        if (!projectStore.some((p) => p.id === projectId)) return notFound('Project not found');
        return ok(changeAnalysisFor(projectId) as ChangeAnalysisResult);
      }
    }

    /* ------------------------------ MEDIA ------------------------------ */

    if (segments[0] === 'media' && segments.length === 1) {
      if (method === 'GET') {
        advancePipeline();
        const projectId = query.get('project_id');
        return ok(projectId ? assetStore.filter((a) => a.project_id === projectId) : assetStore);
      }
    }

    if (segments[0] === 'media' && segments[1] === 'process' && method === 'POST') {
      const id = newId('ast');
      const asset: MediaAsset = {
        id,
        cloudinary_url: 'https://res.cloudinary.com/demo/image/upload/sample/f_auto,q_auto',
        project_id: null,
        processing_status: 'UPLOADED',
        uploaded_at: new Date().toISOString(),
        mime_type: 'image/jpeg',
        image_latitude: null,
        image_longitude: null,
        location_source: 'NONE',
        location_match_distance: null,
        description: null,
        activity: null,
        scene: null,
        routing_confidence: null,
      };
      assetStore.unshift(asset);
      return ok({
        asset_id: id,
        status: asset.processing_status,
        message: 'Processing started in background.',
      });
    }

    if (segments[0] === 'media' && segments[1] === 'sync-all-metadata' && method === 'POST') {
      // Mirrors api/media.py:571-576.
      const eligible = assetStore.filter((a) => a.cloudinary_url).length;
      return ok({
        status: 'success',
        synced_count: eligible,
        total_assets: assetStore.length,
        errors: [],
      });
    }

    if (segments[0] === 'media' && segments[1] === 'upload' && segments[2] === 'signature') {
      // Shape mirrors CloudinaryService.generate_upload_signature.
      return ok({
        signature: 'mock-signature-not-for-production',
        api_key: '000000000000000',
        cloud_name: 'demo',
        timestamp: Math.floor(Date.now() / 1000),
      });
    }

    if (segments[0] === 'media' && segments.length >= 2) {
      const assetId = segments[1];
      const tail = segments.slice(2);

      if (tail.length === 0) {
        const live = assetStore.find((a) => a.id === assetId);
        if (!live) return notFound('Media asset not found');
        if (method === 'GET') {
          const base = detailStore[live.id] ?? ({ ...live, evidence: null } as MediaDetail);
          return ok({
            ...base,
            project_id: live.project_id,
            processing_status: live.processing_status,
          });
        }
        if (method === 'DELETE') {
          const index = assetStore.findIndex((a) => a.id === assetId);
          if (index === -1) return notFound('Media asset not found');
          assetStore.splice(index, 1);
          delete detailStore[assetId];
          delete transformStore[assetId];
          return ok({ deleted: true });
        }
      }

      if (tail[0] === 'assign' && method === 'POST') {
        const asset = assetStore.find((a) => a.id === assetId);
        if (!asset) return notFound('Media asset not found');
        const projectId = asBody<{ project_id?: string }>(req.json ?? {}).project_id;
        if (!projectId || !projectStore.some((p) => p.id === projectId)) {
          return notFound('Project not found');
        }
        // Mirrors api/media.py:339-345.
        asset.project_id = projectId;
        asset.processing_status = 'READY';
        asset.routing_confidence = 1.0;
        const detail = detailStore[asset.id];
        if (detail?.evidence) detail.evidence.routing_confidence = 1.0;
        return ok({
          status: 'success',
          message: 'Assigned successfully',
          asset_id: asset.id,
          project_id: projectId,
          processing_status: asset.processing_status,
        });
      }

      if (tail[0] === 'transformations' && method === 'GET') {
        const result = transformStore[assetId];
        if (!result) return notFound('Media asset not found');
        return ok(result);
      }
    }

    /* ----------------------------- SEARCH ------------------------------ */

    if (segments[0] === 'search' && method === 'POST') {
      const body = asBody<{
        query?: string;
        top_k?: number;
        min_score?: number;
        use_cloudinary_hybrid?: boolean;
        project_id?: string | null;
        cloudinary_tag?: string | null;
      }>(req.json ?? {});

      const topK = body.top_k ?? 10;
      const minScore = body.min_score ?? 0.35;
      let results = searchFixtures(body.query ?? '', topK, minScore);

      if (body.project_id) {
        results = results.filter((r) => r.project_id === body.project_id);
      }
      if (body.cloudinary_tag && body.cloudinary_tag.trim()) {
        const tag = body.cloudinary_tag.trim().toLowerCase();
        results = results.filter((r) =>
          [r.project_name, r.activity, r.scene, ...(r.objects ?? [])]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().replace(/_/g, ' ').includes(tag)),
        );
      }
      if (body.use_cloudinary_hybrid) {
        results = results.map((r, i) => ({
          ...r,
          search_source: i % 2 === 0 ? 'HYBRID' : 'CLOUDINARY_SEARCH',
          score: Number(Math.min(r.score + 0.04, 0.99).toFixed(3)),
        }));
      }

      const payload: SearchResponse = {
        query: body.query ?? '',
        results,
        count: results.length,
        hybrid_mode: Boolean(body.use_cloudinary_hybrid),
      };
      return ok(payload);
    }

    /* ------------------------- GLOBAL CHANGE --------------------------- */

    if (segments[0] === 'change' && segments[1] === 'analyze' && method === 'POST') {
      const body = asBody<{ before_asset_id?: string; after_asset_id?: string }>(req.json ?? {});
      if (!body.before_asset_id || !body.after_asset_id) {
        return badRequest('before_asset_id and after_asset_id are required');
      }
      const before = assetStore.find((a) => a.id === body.before_asset_id);
      const after = assetStore.find((a) => a.id === body.after_asset_id);
      if (!before || !after) return notFound('Assets not found');
      const beforeId = before.project_id ?? 'prj-solar-01';
      const result = changeAnalysisFor(beforeId);
      return ok({
        ...result,
        before_asset_id: before.id,
        after_asset_id: after.id,
        before_url: before.cloudinary_url,
        after_url: after.cloudinary_url,
      });
    }

    return notFound(`No mock route for ${method} ${path}`);
  }

  return { handle };
}
