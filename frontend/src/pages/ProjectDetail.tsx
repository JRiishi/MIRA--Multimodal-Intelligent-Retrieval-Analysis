import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Images,
  Clock,
  GitCompare,
  MessageSquare,
  FileText,
  Send,
  Eraser,
  Copy,
  Check,
  MapPin,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useProject, useDeleteProject } from '../hooks/projects';
import { useMediaLibrary, useAssetTransformations } from '../hooks/media';
import {
  useProjectTimeline,
  useProjectChat,
  useProjectChatHistory,
  useClearProjectChat,
  useProjectChangeAnalysis,
  useGenerateProjectReport,
} from '../hooks/chat';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  PanelHeader,
  Chip,
  Modal,
  Meter,
  ScoreReadout,
  Coordinate,
  AssetId,
  SegmentedControl,
} from '../components/ui';
import GeoPlot from '../components/GeoPlot';
import ActivityDensity from '../components/ActivityDensity';
import { ChatMessageRenderer } from '../components/ChatMessageRenderer';
import { humanizeToken, relativeTime, shortDate, stamp, statusOf } from '../lib/presentation';
import type { ChatEvidenceItem, MediaAsset, Project } from '../types';

type TabId = 'overview' | 'media' | 'timeline' | 'change' | 'ask' | 'report';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'media', label: 'Media' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'change', label: 'Progression' },
  { id: 'ask', label: 'Ask' },
  { id: 'report', label: 'Report' },
];

/* ------------------------------------------------------------------ */
/* Evidence dialog                                                     */
/* ------------------------------------------------------------------ */

type DetailTab = 'original' | 'provenance' | 'campaign';

function EvidenceDialog({ item, onClose }: { item: ChatEvidenceItem | null; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('original');
  const [copied, setCopied] = useState(false);
  const { data } = useAssetTransformations(item?.asset_id ?? null);

  if (!item) return null;

  const aspects = data
    ? [
        { label: 'Square 1:1', url: data.campaign_aspects.square_1_1 },
        { label: 'Landscape 16:9', url: data.campaign_aspects.landscape_16_9 },
        { label: 'Story 9:16', url: data.campaign_aspects.story_9_16 },
      ]
    : [];

  const current =
    tab === 'original'
      ? (data?.optimized_url ?? item.cloudinary_url)
      : tab === 'provenance'
        ? (data?.verified_badge_url ?? item.cloudinary_url)
        : (aspects[0]?.url ?? item.cloudinary_url);

  const copy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Evidence detail"
      width="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={copy} className="btn btn-secondary">
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy URL
              </>
            )}
          </button>
          <button type="button" onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </>
      }
    >
      <div className="px-4 pt-3">
        <SegmentedControl<DetailTab>
          ariaLabel="Transformation view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'original', label: 'Optimised' },
            { value: 'provenance', label: 'Provenance' },
            { value: 'campaign', label: 'Campaign' },
          ]}
        />
      </div>

      <div className="p-4 space-y-4">
        <div className="panel-sunken aspect-[16/9] flex items-center justify-center overflow-hidden">
          <img src={current} alt={item.description} className="max-h-full max-w-full object-contain" />
        </div>

        <p className="text-[13px] text-ink-2 leading-relaxed">{item.description}</p>

        {current && (
          <div>
            <span className="label">Delivery URL</span>
            <code className="block mt-1.5 p-2.5 panel-sunken text-[10.5px] leading-relaxed break-all text-ink-2">
              {current}
            </code>
          </div>
        )}

        {tab === 'campaign' && aspects.length > 0 && (
          <ul className="grid grid-cols-3 gap-3">
            {aspects.map((aspect) => (
              <li key={aspect.label} className="panel overflow-hidden">
                <img
                  src={aspect.url}
                  alt={`${aspect.label} campaign export`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover bg-sunken"
                />
                <div className="px-2 py-1.5 rule-t">
                  <span className="label">{aspect.label}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Progression comparison                                              */
/* ------------------------------------------------------------------ */

type CompareMode = 'slider' | 'split' | 'composite';

function ProgressionPanel({
  projectId,
  project,
  assets,
  assetCount,
}: {
  projectId: string;
  project: Project;
  assets: MediaAsset[];
  assetCount: number;
}) {
  const mutation = useProjectChangeAnalysis(projectId);
  const [mode, setMode] = useState<CompareMode>('slider');
  const [position, setPosition] = useState(50);
  const [picking, setPicking] = useState(false);
  const [pair, setPair] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  });
  const result = mutation.data;

  // Endpoints must be dated, because a progression pair is chronological.
  const comparable = useMemo(
    () =>
      assets
        .filter((a) => a.cloudinary_url && a.uploaded_at)
        .slice()
        .sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at)),
    [assets],
  );

  if (assetCount < 2) {
    return (
      <div className="space-y-4">
        <div className="panel">
          <EmptyState
            icon={GitCompare}
            title="Not enough evidence"
            description="Visual progression needs at least two captures from this target. Ingest more field media to unlock the comparison."
          />
        </div>
        <GeoPlot projects={[project]} assets={assets} radiusKm={15} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="panel p-3 flex flex-wrap items-center gap-3">
        <SegmentedControl<CompareMode>
          ariaLabel="Comparison mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'slider', label: 'Slider' },
            { value: 'split', label: 'Split' },
            { value: 'composite', label: 'Composite' },
          ]}
        />
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={comparable.length < 2}
          className="btn btn-sm btn-secondary"
          title="Compare any two dates instead of the earliest and latest"
        >
          <GitCompare className="w-3 h-3" aria-hidden="true" />
          Choose pair
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate({})}
          disabled={mutation.isPending}
          className="btn btn-secondary btn-sm ml-auto"
        >
          {mutation.isPending ? 'Computing' : 'Recompute'}
        </button>
      </div>

      {mutation.isError && (
        <ErrorState
          title="Comparison failed"
          detail="The progression request did not complete."
          onRetry={() => mutation.mutate({})}
        />
      )}

      {!result && !mutation.isPending && !mutation.isError && (
        <div className="panel">
          <EmptyState
            icon={GitCompare}
            title="Comparison not run yet"
            description="Compute a structural comparison between the baseline and the most recent capture."
            action={
              <button type="button" onClick={() => mutation.mutate({})} className="btn btn-primary">
                Run comparison
              </button>
            }
          />
        </div>
      )}

      {mutation.isPending && (
        <div className="panel p-12 flex flex-col items-center gap-3" aria-busy="true">
          <span
            className="w-4 h-4 border-2 border-line-strong border-t-brand-600 rounded-full animate-spin"
            aria-hidden="true"
          />
          <span className="label">Measuring visual change</span>
        </div>
      )}

      {result && (
        <>
          <div className="panel p-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <span className="label">Change score</span>
              <span className="value text-[18px] font-semibold ml-2">
                {result.change_score.toFixed(3)}
              </span>
            </div>
            <Chip className={result.change_detected ? 'chip-caution' : 'chip-neutral'}>
              {result.change_detected ? 'change detected' : 'no material change'}
            </Chip>
            <p className="text-[12.5px] text-ink-2 flex-1 min-w-[220px] leading-relaxed">
              {result.summary}
            </p>
          </div>

          <div className="panel p-3">
            {mode === 'slider' && (
              <div className="relative aspect-[16/9] bg-sunken overflow-hidden select-none">
                <img
                  src={result.after_url}
                  alt="Most recent capture"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                >
                  <img
                    src={result.before_url}
                    alt="Baseline capture"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <span
                  className="absolute top-0 bottom-0 w-px bg-white/90 pointer-events-none"
                  style={{ left: `${position}%` }}
                  aria-hidden="true"
                />
                <span
                  className="absolute top-2 left-2 px-1.5 py-0.5 bg-ink/75 text-white label"
                  aria-hidden="true"
                >
                  Before
                </span>
                <span
                  className="absolute top-2 right-2 px-1.5 py-0.5 bg-ink/75 text-white label"
                  aria-hidden="true"
                >
                  After
                </span>
                <label htmlFor="progression-slider" className="sr-only">
                  Reveal baseline capture
                </label>
                <input
                  id="progression-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />
              </div>
            )}

            {mode === 'split' && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Before', url: result.before_url, id: result.before_asset_id },
                  { label: 'After', url: result.after_url, id: result.after_asset_id },
                ].map((side) => (
                  <figure key={side.label}>
                    <div className="aspect-[16/9] bg-sunken border border-line overflow-hidden">
                      <img
                        src={side.url}
                        alt={`${side.label} capture`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <figcaption className="flex items-baseline gap-2 mt-1.5">
                      <span className="label">{side.label}</span>
                      <AssetId id={side.id} />
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            {mode === 'composite' && (
              <div className="aspect-[2/1] bg-sunken border border-line overflow-hidden flex items-center justify-center">
                {result.composite_url ? (
                  <img
                    src={result.composite_url}
                    alt="Cloudinary composite of baseline and current capture"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="meta">composite not available for this pair</span>
                )}
              </div>
            )}
          </div>

          <p className="label">
            composite built with <span className="value normal-case">Cloudinary layer transforms</span>
          </p>
        </>
      )}

      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        title="Choose comparison pair"
        width="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!pair.before || !pair.after || pair.before === pair.after}
              className="btn btn-primary"
              onClick={() => {
                mutation.mutate({
                  before_asset_id: pair.before ?? undefined,
                  after_asset_id: pair.after ?? undefined,
                });
                setPicking(false);
              }}
            >
              Compare pair
            </button>
          </>
        }
      >
        <div className="p-4 space-y-4">
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            Leave a side empty to fall back to the earliest and latest capture. Picking an explicit
            pair is how you isolate a single stage of works.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pair-before" className="label block mb-1.5">
                Baseline
              </label>
              <select
                id="pair-before"
                className="field field-sm"
                value={pair.before ?? ''}
                onChange={(e) => setPair((p) => ({ ...p, before: e.target.value || null }))}
              >
                <option value="">automatic (earliest)</option>
                {comparable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {shortDate(a.uploaded_at)} - {humanizeToken(a.activity)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pair-after" className="label block mb-1.5">
                Current
              </label>
              <select
                id="pair-after"
                className="field field-sm"
                value={pair.after ?? ''}
                onChange={(e) => setPair((p) => ({ ...p, after: e.target.value || null }))}
              >
                <option value="">automatic (latest)</option>
                {comparable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {shortDate(a.uploaded_at)} - {humanizeToken(a.activity)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: pLoading, error: pError } = useProject(projectId);
  const { data: media, isLoading: mLoading } = useMediaLibrary();
  const { data: timeline, isLoading: tLoading } = useProjectTimeline(projectId);
  const { data: history, isLoading: hLoading } = useProjectChatHistory(projectId);

  const chatMutation = useProjectChat(projectId);
  const clearChat = useClearProjectChat(projectId);
  const reportMutation = useGenerateProjectReport(projectId);
  const deleteMutation = useDeleteProject();

  const [tab, setTab] = useState<TabId>('overview');
  const [draft, setDraft] = useState('');
  const [detail, setDetail] = useState<ChatEvidenceItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const assets = (media ?? []).filter((a) => a.project_id === projectId);
  const described = assets.filter((a) => a.description);
  const scored = described
    .map((a) => a.routing_confidence)
    .filter((c): c is number => typeof c === 'number' && c > 0);
  const meanConfidence = scored.length ? scored.reduce((x, y) => x + y, 0) / scored.length : null;
  const readyCount = assets.filter((a) => a.processing_status === 'READY').length;
  const verifiedShare = assets.length ? readyCount / assets.length : 0;

  useEffect(() => {
    if (tab === 'ask' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tab, history?.length, chatMutation.isPending]);

  if (pLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-4" aria-busy="true" aria-label="Loading project">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (pError || !project) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <ErrorState
          title="Target not found"
          detail="This project could not be loaded. It may have been deleted."
        />
        <Link to="/projects" className="btn btn-secondary">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to targets
        </Link>
      </div>
    );
  }

  const send = () => {
    const message = draft.trim();
    if (!message) return;
    chatMutation.mutate(message, { onSuccess: () => setDraft('') });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
        <Link to="/projects" className="btn btn-sm btn-ghost -ml-2">
          <ArrowLeft className="w-3 h-3" aria-hidden="true" />
          Targets
        </Link>
      </nav>

      {/* Identity */}
      <header className="panel px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink leading-tight">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
              {project.location_name && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                  <MapPin className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                  {project.location_name}
                </span>
              )}
              {project.latitude != null && (
                <Coordinate lat={project.latitude} lng={project.longitude} />
              )}
            </div>
            {project.description && (
              <p className="text-[13px] text-ink-2 leading-relaxed mt-3 max-w-3xl">
                {project.description}
              </p>
            )}
            {project.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1 mt-3">
                {project.tags.map((tag) => (
                  <li key={tag}>
                    <Chip>{humanizeToken(tag)}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn btn-danger flex-shrink-0 self-start"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Delete target
          </button>
        </div>

        {/* Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 rule-t">
          <div>
            <span className="label">Captures</span>
            <div className="value text-[20px] font-semibold mt-1">{assets.length}</div>
          </div>
          <div>
            <span className="label">Verified</span>
            <div className="value text-[20px] font-semibold text-ok-600 mt-1">{readyCount}</div>
          </div>
          <div>
            <span className="label">Mean confidence</span>
            <div className="mt-1">
              <ScoreReadout score={meanConfidence} />
            </div>
          </div>
          <div>
            <span className="label">Coverage</span>
            <div className="mt-2">
              <Meter
                value={verifiedShare}
                tone={verifiedShare >= 0.6 ? 'ok' : 'brand'}
                label={`${Math.round(verifiedShare * 100)} percent verified`}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="panel px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`label px-2.5 py-1.5 rounded-[var(--radius-control)] whitespace-nowrap transition-colors ${
              tab === item.id
                ? 'bg-brand-600 text-white'
                : 'text-ink-2 hover:bg-sunken hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Geography first. The offset between each capture and this
              project's anchor is the fastest way to spot a bad route. */}
          <GeoPlot
            projects={[project]}
            assets={assets}
            radiusKm={15}
            focusProjectId={project.id}
          />

          <ActivityDensity assets={assets} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="panel">
              <PanelHeader
                title="Recent evidence"
                meta={`${described.length} described of ${assets.length} captures`}
                actions={
                  <button type="button" onClick={() => setTab('media')} className="btn btn-sm btn-ghost">
                    Open library
                  </button>
                }
              />
              {mLoading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : described.length === 0 ? (
                <EmptyState
                  icon={Images}
                  title="No evidence yet"
                  description="Uploads routed to this target will appear here."
                />
              ) : (
                <ul>
                  {described.slice(0, 5).map((asset) => {
                    const s = statusOf(asset);
                    return (
                      <li
                        key={asset.id}
                        className="flex items-center gap-3 px-4 py-2.5 rule-b last:border-b-0 row-hover"
                      >
                        <img
                          src={asset.cloudinary_url ?? ''}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 object-cover border border-line bg-sunken flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] text-ink truncate">{asset.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Chip className={s.chip}>{s.label}</Chip>
                            <span className="meta">{relativeTime(asset.uploaded_at)}</span>
                          </div>
                        </div>
                        <ScoreReadout score={asset.routing_confidence} className="flex-shrink-0" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="panel">
              <PanelHeader title="Milestone timeline" meta={`${timeline?.length ?? 0} entries`} />
              {tLoading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : (timeline?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Timeline is empty"
                  description="Milestones appear automatically as evidence is ingested."
                />
              ) : (
                <ul>
                  {timeline?.slice(0, 5).map((item, index) => (
                    <li
                      key={item.asset_id ?? index}
                      className="flex items-baseline gap-3 px-4 py-2.5 rule-b last:border-b-0"
                    >
                      <span className="value text-[11px] text-ink-3 w-[68px] flex-shrink-0">
                        {shortDate(item.date).replace(/,.*/, '')}
                      </span>
                      <span className="text-[12.5px] text-ink-2 truncate flex-1">
                        {humanizeToken(item.activity)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="panel p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button type="button" onClick={() => setTab('change')} className="text-left group">
              <span className="label">Progression</span>
              <p className="text-[13px] text-ink mt-1.5 group-hover:text-brand-700 transition-colors">
                Compare baseline against the most recent capture.
              </p>
            </button>
            <button type="button" onClick={() => setTab('ask')} className="text-left group">
              <span className="label">Ask</span>
              <p className="text-[13px] text-ink mt-1.5 group-hover:text-brand-700 transition-colors">
                Query this project's evidence with grounded reasoning.
              </p>
            </button>
            <button type="button" onClick={() => setTab('report')} className="text-left group">
              <span className="label">Report</span>
              <p className="text-[13px] text-ink mt-1.5 group-hover:text-brand-700 transition-colors">
                Generate a printable impact and audit record.
              </p>
            </button>
          </section>
        </div>
      )}

      {/* MEDIA */}
      {tab === 'media' && (
        <div className="space-y-3">
          {mLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3]" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={Images}
                title="No captures routed here"
                description="Nothing has been attributed to this target yet. Pending captures sit in the review queue."
                action={
                  <Link to="/review" className="btn btn-secondary">
                    Open review queue
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {assets.map((asset) => {
                const s = statusOf(asset);
                return (
                  <li key={asset.id} className="panel overflow-hidden flex flex-col">
                    <div className="relative aspect-[4/3] bg-sunken">
                      {asset.cloudinary_url && (
                        <img
                          src={asset.cloudinary_url}
                          alt={asset.description ?? 'Routed capture'}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute top-1.5 left-1.5">
                        <Chip className={s.chip}>{s.label}</Chip>
                      </span>
                    </div>
                    <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                      <p className="text-[12px] text-ink leading-snug line-clamp-2 min-h-[2.1em]">
                        {asset.description || humanizeToken(asset.activity)}
                      </p>
                      <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                      <div className="flex items-center justify-between gap-2 mt-auto pt-1.5 rule-t">
                        <ScoreReadout score={asset.routing_confidence} />
                        <span className="meta">{shortDate(asset.uploaded_at)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* TIMELINE */}
      {tab === 'timeline' && (
        <div className="panel">
          <PanelHeader
            title="Evidence timeline"
            meta="ordered by capture date, oldest first"
            actions={
              <Link to="/reports" className="btn btn-sm btn-ghost">
                <FileText className="w-3 h-3" aria-hidden="true" />
                Full report
              </Link>
            }
          />
          {tLoading ? (
            <div className="p-4 space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (timeline?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Clock}
              title="No milestones recorded"
              description="Milestones are generated automatically from routed evidence."
            />
          ) : (
            <ol className="px-4 py-4">
              {timeline?.map((item, index) => (
                <li key={item.asset_id ?? index} className="flex gap-3.5 pb-4 last:pb-0">
                  <div className="flex flex-col items-center flex-shrink-0 w-[72px]">
                    <span className="value text-[11px] text-ink-2">
                      {shortDate(item.date).replace(/,.*/, '')}
                    </span>
                    <span className="value text-[10px] text-ink-3">
                      {new Date(item.date).getFullYear()}
                    </span>
                    {index !== (timeline?.length ?? 0) - 1 && (
                      <span className="w-px flex-1 bg-line mt-1.5" aria-hidden="true" />
                    )}
                  </div>
                  {item.cloudinary_url && (
                    <img
                      src={item.cloudinary_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 object-cover border border-line bg-sunken flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {item.activity && <Chip className="chip-brand">{humanizeToken(item.activity)}</Chip>}
                    {item.description && (
                      <p className="text-[12.5px] text-ink-2 leading-relaxed mt-1.5">
                        {item.description}
                      </p>
                    )}
                    {item.location && <p className="meta mt-1">{item.location}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* CHANGE */}
      {tab === 'change' && (
        <ProgressionPanel
          projectId={projectId!}
          project={project}
          assets={assets}
          assetCount={assets.length}
        />
      )}

      {/* ASK */}
      {tab === 'ask' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 panel flex flex-col min-h-[520px]">
            <PanelHeader
              title="Grounded question answering"
              meta="answers cite the captures they were derived from"
              actions={
                (history?.length ?? 0) > 0 ? (
                  <button
                    type="button"
                    onClick={() => clearChat.mutate()}
                    disabled={clearChat.isPending}
                    className="btn btn-sm btn-ghost"
                  >
                    <Eraser className="w-3 h-3" aria-hidden="true" />
                    Clear
                  </button>
                ) : undefined
              }
            />

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {hLoading ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-12 w-2/3" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (history?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversation yet"
                  description="Ask about progress, safety or site conditions. Every answer is grounded in this project's captures only."
                />
              ) : (
                history!.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <ChatMessageRenderer message={message.message} role={message.role} />
                    {message.evidence && message.evidence.length > 0 && (
                      <ul className="flex flex-wrap gap-2 pl-1">
                        {message.evidence.map((item) => (
                          <li key={item.asset_id}>
                            <button
                              type="button"
                              onClick={() => setDetail(item)}
                              className="flex items-center gap-2 panel px-2 py-1.5 hover:border-brand-300 transition-colors text-left"
                            >
                              <img
                                src={item.cloudinary_url}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="w-8 h-8 object-cover border border-line bg-sunken"
                              />
                              <span className="text-[11px] text-ink-2 line-clamp-1 max-w-[160px]">
                                {item.description}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}

              {chatMutation.isPending && (
                <div className="flex items-center gap-2" aria-live="polite">
                  <span
                    className="w-3.5 h-3.5 border-2 border-line-strong border-t-brand-600 rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span className="label">Reasoning over evidence</span>
                </div>
              )}

              {chatMutation.isError && (
                <ErrorState title="Question failed" detail="The assistant request did not complete." />
              )}
            </div>

            <form
              className="p-3 rule-t flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <div className="flex-1">
                <label htmlFor="chat-input" className="sr-only">
                  Ask about this project
                </label>
                <textarea
                  id="chat-input"
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="What safety controls are visible on site?"
                  className="field resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || chatMutation.isPending}
                className="btn btn-primary h-[38px]"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                Ask
              </button>
            </form>
          </div>

          <aside className="space-y-4">
            <section className="panel">
              <PanelHeader title="Grounding" meta="what the answer can draw on" />
              <dl className="p-4 space-y-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="label">Citable captures</dt>
                  <dd className="value text-[13px]">{described.length}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="label">Mean confidence</dt>
                  <dd>
                    <ScoreReadout score={meanConfidence} />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="label">Scope</dt>
                  <dd className="value text-[12px] text-ink-2 text-right">
                    this target only
                  </dd>
                </div>
              </dl>
            </section>

            <p className="flex items-start gap-2 text-[11.5px] text-ink-3 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Answers are generated locally from retrieved evidence. When the record is thin the
                model says so rather than guessing.
              </span>
            </p>
          </aside>
        </div>
      )}

      {/* REPORT */}
      {tab === 'report' && (
        <div className="space-y-3">
          <div className="panel p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <span className="label">Audit record</span>
              <p className="text-[12.5px] text-ink-2 mt-1">
                Synthesises every routed capture into a printable impact statement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
              className="btn btn-primary"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              {reportMutation.isPending ? 'Generating' : 'Generate report'}
            </button>
            <Link to="/reports" className="btn btn-secondary">
              Open reports
            </Link>
          </div>

          {reportMutation.isError && (
            <ErrorState
              title="Report failed"
              detail="The audit request did not complete."
              onRetry={() => reportMutation.mutate()}
            />
          )}

          {reportMutation.data && (
            <div className="panel p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[17px] font-semibold text-ink">
                    {reportMutation.data.project_name}
                  </h3>
                  <p className="meta mt-1">generated {stamp(reportMutation.data.generated_at)}</p>
                </div>
                <Chip
                  className={
                    reportMutation.data.current_status.startsWith('ON TRACK')
                      ? 'chip-ok'
                      : 'chip-caution'
                  }
                >
                  {reportMutation.data.current_status.startsWith('ON TRACK') ? 'on track' : 'at risk'}
                </Chip>
              </div>

              <p className="text-[13px] text-ink-2 leading-relaxed">
                {reportMutation.data.current_status}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 rule-t">
                <div>
                  <span className="label">Evidence</span>
                  <div className="value text-[18px] font-semibold mt-1">
                    {reportMutation.data.total_evidence_count}
                  </div>
                </div>
                <div>
                  <span className="label">Timeline</span>
                  <div className="value text-[18px] font-semibold mt-1">
                    {reportMutation.data.timeline_summary.length}
                  </div>
                </div>
                <div>
                  <span className="label">Change</span>
                  <div className="value text-[18px] font-semibold mt-1">
                    {reportMutation.data.change_score?.toFixed(3) ?? 'n/a'}
                  </div>
                </div>
                <div>
                  <span className="label">Cited</span>
                  <div className="value text-[18px] font-semibold mt-1">
                    {reportMutation.data.key_evidence.length}
                  </div>
                </div>
              </div>

              {reportMutation.data.key_evidence.length > 0 && (
                <div className="pt-3 rule-t">
                  <span className="label">Cited evidence</span>
                  <ul className="mt-2 space-y-1.5">
                    {reportMutation.data.key_evidence.map((item) => (
                      <li key={item.asset_id} className="flex items-baseline gap-2">
                        <AssetId id={item.asset_id} className="flex-shrink-0" />
                        <span className="text-[12px] text-ink-2 line-clamp-1">{item.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {described.length === 0 && (
                <p className="flex items-start gap-2 text-[12px] text-caution-700 bg-caution-50 border border-caution-100 p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  This report is based on no described captures. Treat it as provisional.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Keyed so switching evidence remounts the dialog with fresh tab and
          clipboard state, instead of resetting it in an effect. */}
      <EvidenceDialog
        key={detail?.asset_id ?? 'none'}
        item={detail}
        onClose={() => setDetail(null)}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete routing target"
        width="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              className="btn btn-danger"
              onClick={() =>
                deleteMutation.mutate(projectId!, { onSuccess: () => navigate('/projects') })
              }
            >
              {deleteMutation.isPending ? 'Deleting' : 'Delete target'}
            </button>
          </>
        }
      >
        <div className="p-4 space-y-3">
          <p className="text-[13px] text-ink-2">
            <span className="value text-ink">{project.name}</span> will be removed.{' '}
            {assets.length > 0
              ? `${assets.length} capture${assets.length === 1 ? '' : 's'} will return to the review queue as unassigned.`
              : 'No captures are currently attributed to this target.'}
          </p>
        </div>
      </Modal>
    </div>
  );
}
