import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Copy,
  Check,
  MapPin,
  ChevronsLeftRight,
  Trash2,
} from 'lucide-react';
import { useProject, useDeleteProject } from '../hooks/projects';
import { useMediaLibrary, useAssetTransformations, useDeleteMedia } from '../hooks/media';
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
  Modal,
  Coordinate,
  SegmentedControl,
} from '../components/ui';
import ActivityDensity from '../components/ActivityDensity';
import { ChatMessageRenderer } from '../components/ChatMessageRenderer';
import { humanizeToken, relativeTime, shortDate, stamp, statusOf } from '../lib/presentation';
import { UploadDialog } from './MediaLibrary';
import type { ChatEvidenceItem, MediaAsset } from '../types';

type TabId = 'overview' | 'media' | 'timeline' | 'change' | 'ask' | 'report';

const TABS: { id: TabId; label: string; number: string }[] = [
  { id: 'overview', label: 'OVERVIEW', number: '01' },
  { id: 'media', label: 'EVIDENCE', number: '02' },
  { id: 'change', label: 'PROGRESSION', number: '03' },
  { id: 'ask', label: 'INTELLIGENCE', number: '04' },
  { id: 'timeline', label: 'TIMELINE', number: '05' },
  { id: 'report', label: 'AUDIT', number: '06' },
];

/* ------------------------------------------------------------------ */
/* Evidence Dialog                                                    */
/* ------------------------------------------------------------------ */

type DetailTab = 'original' | 'provenance' | 'campaign';

function EvidenceDialog({
  item,
  onClose,
  onDelete,
}: {
  item: ChatEvidenceItem | null;
  onClose: () => void;
  onDelete?: (assetId: string) => void;
}) {
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
      open={item != null}
      onClose={onClose}
      title="Evidence Inspection"
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {onDelete && item.asset_id && (
              <button
                type="button"
                onClick={() => onDelete(item.asset_id)}
                className="btn btn-danger font-mono text-xs"
              >
                DELETE EVIDENCE
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary font-mono text-xs">
              CLOSE
            </button>
            {current && (
              <button
                type="button"
                onClick={copy}
                className="btn btn-primary font-mono text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#ff6a00]" />
                    <span>COPIED CDN URL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY CDN URL</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex border-b border-white/[0.08] text-xs font-mono">
          <button
            type="button"
            onClick={() => setTab('original')}
            className={`pb-2 px-3 border-b-2 transition-colors ${tab === 'original' ? 'border-[#ff6a00] text-white font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            ORIGINAL
          </button>
          <button
            type="button"
            onClick={() => setTab('provenance')}
            className={`pb-2 px-3 border-b-2 transition-colors ${tab === 'provenance' ? 'border-[#ff6a00] text-white font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            SIGNED PROVENANCE
          </button>
          <button
            type="button"
            onClick={() => setTab('campaign')}
            className={`pb-2 px-3 border-b-2 transition-colors ${tab === 'campaign' ? 'border-[#ff6a00] text-white font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            CAMPAIGN CROPS
          </button>
        </div>

        <div className="aspect-[16/10] bg-black border border-white/[0.08] flex items-center justify-center overflow-hidden">
          {current ? (
            <img
              src={current}
              alt={item.description}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs font-mono text-neutral-600">PREVIEW UNAVAILABLE</span>
          )}
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="text-neutral-400">DESCRIPTION:</div>
          <div className="text-white text-sm font-sans">{item.description}</div>
          <div className="pt-2 flex items-center justify-between text-neutral-500">
            <span>ASSET ID: {item.asset_id}</span>
            <span>ACTIVITY: {humanizeToken(item.activity)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Progression Comparison Panel                                       */
/* ------------------------------------------------------------------ */

type CompareMode = 'slider' | 'split' | 'composite';

function ProgressionPanel({
  projectId,
  assets,
  assetCount,
}: {
  projectId: string;
  assets: MediaAsset[];
  assetCount: number;
}) {
  const [mode, setMode] = useState<CompareMode>('slider');
  const [position, setPosition] = useState(50);
  const mutation = useProjectChangeAnalysis(projectId);

  const [picking, setPicking] = useState(false);
  const [pair, setPair] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  });
  const result = mutation.data;

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
      <EmptyState
        title="Insufficient Evidence for Progression"
        description="Visual progression requires at least two dated captures from this workspace target. Ingest more captures to compute change detection."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Action Line */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <SegmentedControl<CompareMode>
          ariaLabel="Comparison mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'slider', label: 'Interactive Slider' },
            { value: 'split', label: 'Side-by-Side Split' },
            { value: 'composite', label: 'Cloudinary Composite' },
          ]}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPicking(true)}
            disabled={comparable.length < 2}
            className="btn btn-sm btn-secondary font-mono text-xs"
          >
            CUSTOM PAIR
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate({})}
            disabled={mutation.isPending}
            className="btn btn-sm btn-primary font-mono text-xs"
          >
            {mutation.isPending ? 'COMPUTING...' : 'RECOMPUTE CHANGE →'}
          </button>
        </div>
      </div>

      {mutation.isError && (
        <ErrorState
          title="Progression Analysis Failed"
          detail="Could not compute structural change analysis for this target."
          onRetry={() => mutation.mutate({})}
        />
      )}

      {!result && !mutation.isPending && !mutation.isError && (
        <EmptyState
          title="Progression Not Computed Yet"
          description="Run structural change analysis to compute before/after difference."
          action={
            <button type="button" onClick={() => mutation.mutate({})} className="btn btn-primary font-mono text-xs">
              RUN PROGRESSION ANALYSIS →
            </button>
          }
        />
      )}

      {mutation.isPending && (
        <div className="py-20 flex flex-col items-center justify-center gap-3" aria-busy="true">
          <div className="w-5 h-5 border border-[#ff6a00] border-t-transparent animate-spin rounded-full" />
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Computing structural difference (SSIM)...
          </span>
        </div>
      )}

      {result && (() => {
        const beforeAsset = comparable.find((a) => a.id === result.before_asset_id);
        const afterAsset = comparable.find((a) => a.id === result.after_asset_id);

        return (
          <div className="space-y-8">
            {/* Typographic Change Readout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-white/[0.08]">
              <div>
                <div className="text-3xl font-light font-sans text-white">
                  {(result.change_score * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff6a00] mt-1 font-bold">
                  STRUCTURAL CHANGE DELTA (SSIM)
                </div>
              </div>

              <div>
                <div className="text-sm font-mono text-white mt-1 uppercase">
                  {result.change_detected ? 'MATERIAL CHANGE DETECTED' : 'NOMINAL VARIATION'}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-1">
                  STATUS
                </div>
              </div>

              {result.summary && (
                <div className="md:col-span-1 text-[13px] text-neutral-300 leading-relaxed">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block mb-1">
                    SYNTHESIS
                  </span>
                  <p>{result.summary}</p>
                </div>
              )}
            </div>

            {/* Slider Comparison View */}
            {mode === 'slider' && (
              <div className="space-y-4">
                <div className="relative aspect-[16/10] max-h-[540px] bg-black border border-white/[0.12] overflow-hidden select-none group">
                  <img
                    src={result.after_url}
                    alt="Current capture"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                  >
                    <img
                      src={result.before_url}
                      alt="Baseline capture"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  {/* Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-[#ff6a00] pointer-events-none"
                    style={{ left: `${position}%` }}
                    aria-hidden="true"
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-black border border-[#ff6a00] flex items-center justify-center text-white pointer-events-none">
                      <ChevronsLeftRight className="w-3.5 h-3.5 text-[#ff6a00]" />
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-4 left-4 pointer-events-none">
                    <span className="px-2.5 py-1 bg-black/90 text-white border border-white/20 text-[11px] font-mono">
                      BEFORE {beforeAsset?.uploaded_at ? `· ${shortDate(beforeAsset.uploaded_at).replace(/,.*/, '')}` : ''}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 pointer-events-none">
                    <span className="px-2.5 py-1 bg-black/90 text-[#ff6a00] border border-[#ff6a00]/40 text-[11px] font-mono">
                      AFTER {afterAsset?.uploaded_at ? `· ${shortDate(afterAsset.uploaded_at).replace(/,.*/, '')}` : ''}
                    </span>
                  </div>

                  <input
                    id="progression-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={position}
                    onChange={(e) => setPosition(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                    aria-label="Drag slider to compare baseline and recent captures"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-neutral-500 pt-2">
                  <div className="flex items-center gap-2">
                    <span>PRESETS:</span>
                    <button type="button" onClick={() => setPosition(0)} className="hover:text-white transition-colors">
                      0% (BEFORE)
                    </button>
                    <span>·</span>
                    <button type="button" onClick={() => setPosition(50)} className="hover:text-white transition-colors">
                      50% (SPLIT)
                    </button>
                    <span>·</span>
                    <button type="button" onClick={() => setPosition(100)} className="hover:text-white transition-colors">
                      100% (AFTER)
                    </button>
                  </div>
                  <span>POSITION: {position}%</span>
                </div>
              </div>
            )}

            {/* Side by side split view */}
            {mode === 'split' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="border border-white/[0.08] overflow-hidden">
                    <div className="p-3 border-b border-white/[0.08] flex items-center justify-between text-xs font-mono text-neutral-400">
                      <span>BASELINE ANCHOR</span>
                      {beforeAsset?.uploaded_at && <span>{shortDate(beforeAsset.uploaded_at)}</span>}
                    </div>
                    <div className="aspect-[16/10] bg-black">
                      <img src={result.before_url} alt="Baseline capture" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="border border-white/[0.08] overflow-hidden">
                    <div className="p-3 border-b border-white/[0.08] flex items-center justify-between text-xs font-mono text-neutral-400">
                      <span className="text-[#ff6a00]">LATEST CAPTURE</span>
                      {afterAsset?.uploaded_at && <span>{shortDate(afterAsset.uploaded_at)}</span>}
                    </div>
                    <div className="aspect-[16/10] bg-black">
                      <img src={result.after_url} alt="Latest capture" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Composite View */}
            {mode === 'composite' && (
              <div className="space-y-2 border border-white/[0.08] p-4 bg-black">
                <div className="aspect-[16/10] flex items-center justify-center">
                  {result.composite_url ? (
                    <img src={result.composite_url} alt="Cloudinary composite overlay" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs font-mono text-neutral-600">Composite layer overlay not available</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        title="Custom Comparison Pair"
        width="max-w-xl"
        footer={
          <>
            <button type="button" onClick={() => setPicking(false)} className="btn btn-secondary font-mono text-xs">
              CANCEL
            </button>
            <button
              type="button"
              disabled={!pair.before || !pair.after || pair.before === pair.after}
              className="btn btn-primary font-mono text-xs"
              onClick={() => {
                mutation.mutate({
                  before_asset_id: pair.before ?? undefined,
                  after_asset_id: pair.after ?? undefined,
                });
                setPicking(false);
              }}
            >
              COMPARE PAIR →
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            Select two specific captures to isolate a specific progression milestone.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pair-before" className="font-mono text-[10.5px] uppercase tracking-wider text-neutral-400 block mb-1">
                Baseline Capture
              </label>
              <select
                id="pair-before"
                className="field"
                value={pair.before ?? ''}
                onChange={(e) => setPair((p) => ({ ...p, before: e.target.value || null }))}
              >
                <option value="">Automatic (Earliest)</option>
                {comparable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {shortDate(a.uploaded_at)} - {humanizeToken(a.activity)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pair-after" className="font-mono text-[10.5px] uppercase tracking-wider text-neutral-400 block mb-1">
                Current Capture
              </label>
              <select
                id="pair-after"
                className="field"
                value={pair.after ?? ''}
                onChange={(e) => setPair((p) => ({ ...p, after: e.target.value || null }))}
              >
                <option value="">Automatic (Latest)</option>
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
/* Project Detail Main Component                                      */
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
  const deleteMediaMutation = useDeleteMedia();

  const [tab, setTab] = useState<TabId>('overview');
  const [draft, setDraft] = useState('');
  const [detail, setDetail] = useState<ChatEvidenceItem | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; url?: string; description?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const assets = (media ?? []).filter((a) => a.project_id === projectId);
  const described = assets.filter((a) => a.description);
  const scored = described
    .map((a) => a.routing_confidence)
    .filter((c): c is number => typeof c === 'number' && c > 0);
  const meanConfidence = scored.length ? scored.reduce((x, y) => x + y, 0) / scored.length : null;
  const readyCount = assets.filter((a) => a.processing_status === 'READY').length;

  useEffect(() => {
    if (tab === 'ask' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tab, history?.length, chatMutation.isPending]);

  if (pLoading) {
    return (
      <div className="p-6 lg:p-12 space-y-8 max-w-6xl mx-auto" aria-busy="true" aria-label="Loading workspace">
        <div className="h-4 w-32 bg-white/[0.04] animate-pulse" />
        <div className="h-16 w-3/4 bg-white/[0.04] animate-pulse" />
        <div className="h-96 w-full bg-white/[0.03] animate-pulse" />
      </div>
    );
  }

  if (pError || !project) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <ErrorState
          title="Project Workspace Not Found"
          detail="This project workspace could not be loaded or may have been deleted."
        />
        <Link to="/projects" className="btn btn-secondary font-mono text-xs">
          ← BACK TO PROJECTS
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
    <div className="p-6 sm:p-10 lg:p-14 space-y-12 max-w-6xl mx-auto">
      {/* Editorial Header */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <Link
            to="/projects"
            className="text-xs font-mono text-neutral-500 hover:text-white transition-colors"
          >
            ← ALL PROJECTS
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-mono text-neutral-600 hover:text-red-400 transition-colors"
            title="Delete workspace"
          >
            DELETE WORKSPACE
          </button>
        </div>

        <div>
          <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
            01 // WORKSPACE TARGET
          </p>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mt-1">
            {project.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 mt-3">
            {project.location_name && (
              <span className="flex items-center gap-1.5 text-neutral-300">
                <MapPin className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>{project.location_name}</span>
              </span>
            )}
            <Coordinate lat={project.latitude} lng={project.longitude} />
            <span>·</span>
            <span>{assets.length} CAPTURES ({readyCount} VERIFIED)</span>
          </div>

          {project.description && (
            <p className="text-[14px] text-neutral-300 leading-relaxed mt-4 max-w-3xl">
              {project.description}
            </p>
          )}

          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {project.tags.map((tag) => (
                <span key={tag} className="text-xs font-mono border border-white/[0.12] px-2 py-0.5 text-neutral-300 uppercase">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Minimal Typographic Tabs Rail */}
        <div className="flex items-center gap-6 border-b border-white/[0.08] overflow-x-auto pt-4">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={clsx(
                  'pb-3 font-mono text-xs tracking-wider transition-colors whitespace-nowrap relative uppercase',
                  active
                    ? 'text-white font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#ff6a00]'
                    : 'text-neutral-500 hover:text-neutral-300',
                )}
              >
                <span>{item.number} / {item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-12">
          {/* Typographic Telemetry */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-white/[0.08]">
            <div>
              <div className="text-3xl font-light font-sans text-white">{assets.length}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-1">
                INDEXED CAPTURES
              </div>
            </div>
            <div>
              <div className="text-3xl font-light font-sans text-white">{readyCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff6a00] mt-1 font-bold">
                VERIFIED EVIDENCE
              </div>
            </div>
            <div>
              <div className="text-3xl font-light font-sans text-white">
                {meanConfidence != null ? `${(meanConfidence * 100).toFixed(1)}%` : '—'}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-1">
                MEAN CONFIDENCE
              </div>
            </div>
            <div>
              <div className="text-3xl font-light font-sans text-white">
                {timeline?.length ?? 0}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-1">
                CHRONOLOGY MILESTONES
              </div>
            </div>
          </div>

          {/* Temporal Density Analysis */}
          <section className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400">
              ACTIVITY DENSITY
            </h2>
            <ActivityDensity assets={assets} />
          </section>

          {/* Featured Evidence Peeks */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-2">
              <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                RECENT EVIDENCE
              </h2>
              <button
                type="button"
                onClick={() => setTab('media')}
                className="text-xs font-mono text-neutral-500 hover:text-white transition-colors"
              >
                OPEN EVIDENCE GALLERY →
              </button>
            </div>

            {described.length === 0 ? (
              <EmptyState title="No evidence captures yet" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {described.slice(0, 3).map((asset) => (
                  <div key={asset.id} className="space-y-2 group">
                    <div className="aspect-[16/10] bg-black border border-white/[0.08] overflow-hidden">
                      <img
                        src={asset.cloudinary_url ?? ''}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <p className="text-[13px] text-neutral-300 truncate">
                      {asset.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
                      <span>{relativeTime(asset.uploaded_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* MEDIA TAB */}
      {tab === 'media' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] font-bold">
                02 // WORKSPACE EVIDENCE CORPUS ({assets.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="btn btn-sm btn-primary font-mono text-xs"
            >
              UPLOAD PHOTOS →
            </button>
          </div>

          {mLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[16/10] bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              title="No Captures Routed to Workspace"
              description="No field evidence has been attributed to this project yet."
              action={
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="btn btn-primary font-mono text-xs"
                >
                  UPLOAD PHOTOS →
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {assets.map((asset) => {
                const s = statusOf(asset);
                return (
                  <div key={asset.id} className="space-y-2.5 group">
                    <div
                      className="relative aspect-[16/10] bg-black border border-white/[0.08] overflow-hidden cursor-pointer"
                      onClick={() => setDetail({
                        asset_id: asset.id,
                        cloudinary_url: asset.cloudinary_url ?? '',
                        description: asset.description ?? '',
                        activity: asset.activity,
                      })}
                    >
                      {asset.cloudinary_url ? (
                        <img
                          src={asset.cloudinary_url}
                          alt={asset.description ?? 'Capture'}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-mono text-xs text-neutral-600">
                          NO PREVIEW
                        </div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/90 text-[9.5px] font-mono text-[#ff6a00] border border-[#ff6a00]/40 uppercase">
                        {s.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] text-white leading-snug line-clamp-2">
                        {asset.description || humanizeToken(asset.activity)}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-1">
                        <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                        <span>{shortDate(asset.uploaded_at)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/[0.06] text-xs font-mono">
                        <span className="text-[10px] text-neutral-600 truncate max-w-[100px]">{asset.id.slice(0, 8)}...</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setDetail({
                              asset_id: asset.id,
                              cloudinary_url: asset.cloudinary_url ?? '',
                              description: asset.description ?? '',
                              activity: asset.activity,
                            })}
                            className="text-neutral-400 hover:text-white transition-colors"
                          >
                            INSPECT →
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssetToDelete({
                                id: asset.id,
                                url: asset.cloudinary_url ?? undefined,
                                description: asset.description || asset.activity || undefined,
                              });
                            }}
                            className="text-neutral-600 hover:text-red-400 transition-colors flex items-center gap-1"
                            title="Delete media capture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>DELETE</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PROGRESSION TAB */}
      {tab === 'change' && (
        <ProgressionPanel
          projectId={projectId!}
          assets={assets}
          assetCount={assets.length}
        />
      )}

      {/* INTELLIGENCE / RAG CHAT TAB */}
      {tab === 'ask' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] font-bold">
                04 // LOCAL LLM RAG ASSISTANT
              </h2>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Strict project-isolated visual evidence synthesis
              </p>
            </div>
            {(history?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => clearChat.mutate()}
                disabled={clearChat.isPending}
                className="text-xs font-mono text-neutral-500 hover:text-white transition-colors"
              >
                CLEAR SESSION
              </button>
            )}
          </div>

          <div ref={scrollRef} className="space-y-6 max-h-[600px] overflow-y-auto">
            {hLoading ? (
              <div className="space-y-4" aria-busy="true">
                <div className="h-16 bg-white/[0.02] animate-pulse" />
                <div className="h-24 bg-white/[0.02] animate-pulse" />
              </div>
            ) : (history?.length ?? 0) === 0 ? (
              <div className="py-16 text-center text-neutral-500 font-mono text-xs">
                Inquire about construction progress, equipment, materials, or safety.
              </div>
            ) : (
              history!.map((message) => (
                <div key={message.id} className="space-y-2">
                  <ChatMessageRenderer message={message.message} role={message.role} />
                  {message.evidence && message.evidence.length > 0 && (
                    <div className="pl-4 space-y-1.5 pt-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#ff6a00] block">
                        CITED EVIDENCE ({message.evidence.length})
                      </span>
                      <div className="flex flex-wrap gap-3">
                        {message.evidence.map((item) => (
                          <button
                            key={item.asset_id}
                            type="button"
                            onClick={() => setDetail(item)}
                            className="flex items-center gap-2.5 p-2 bg-black border border-white/[0.1] hover:border-white/40 transition-colors text-left group"
                          >
                            <img
                              src={item.cloudinary_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 object-cover bg-black"
                            />
                            <span className="text-xs font-mono text-neutral-300 group-hover:text-white truncate max-w-[180px]">
                              {item.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {chatMutation.isPending && (
              <div className="flex items-center gap-3 py-4 text-xs font-mono text-neutral-400" aria-live="polite">
                <div className="w-4 h-4 border border-[#ff6a00] border-t-transparent animate-spin rounded-full" />
                <span>Reasoning over project evidence records...</span>
              </div>
            )}

            {chatMutation.isError && (
              <ErrorState title="Inference request failed" detail="Please check local LLM status." />
            )}
          </div>

          {/* Clean Prompt Input */}
          <form
            className="pt-4 border-t border-white/[0.08] flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything about this project workspace..."
              className="field flex-1 resize-none text-[13.5px]"
            />
            <button
              type="submit"
              disabled={!draft.trim() || chatMutation.isPending}
              className="btn btn-primary h-11 px-6 font-mono text-xs"
            >
              ASK →
            </button>
          </form>
        </div>
      )}

      {/* TIMELINE TAB */}
      {tab === 'timeline' && (
        <div className="space-y-6">
          <div className="border-b border-white/[0.08] pb-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] font-bold">
              05 // CHRONOLOGY LEDGER
            </h2>
          </div>

          {tLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : (timeline?.length ?? 0) === 0 ? (
            <EmptyState title="No timeline entries logged yet" />
          ) : (
            <div className="border-t border-white/[0.08] divide-y divide-white/[0.08]">
              {timeline?.map((item, index) => (
                <div key={item.asset_id ?? index} className="flex items-baseline py-4 px-2 hover:bg-white/[0.015] transition-colors gap-6">
                  <span className="font-mono text-xs text-neutral-500 w-24 flex-shrink-0">
                    {shortDate(item.date)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-base text-white font-normal uppercase font-mono">
                      {humanizeToken(item.activity)}
                    </span>
                    {item.description && (
                      <p className="text-[13px] text-neutral-400 mt-0.5 leading-relaxed font-sans">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.cloudinary_url && (
                    <img
                      src={item.cloudinary_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 object-cover border border-white/[0.08] flex-shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REPORT TAB */}
      {tab === 'report' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] font-bold">
                06 // EXECUTIVE IMPACT STATEMENT
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/reports"
                className="btn btn-sm btn-secondary font-mono text-xs"
              >
                FULL DOSSIER VIEW ↗
              </Link>
              <button
                type="button"
                onClick={() => reportMutation.mutate()}
                disabled={reportMutation.isPending}
                className="btn btn-sm btn-primary font-mono text-xs"
              >
                {reportMutation.isPending ? 'GENERATING...' : 'GENERATE DOSSIER →'}
              </button>
            </div>
          </div>

          {reportMutation.isError && (
            <ErrorState
              title="Report synthesis failed"
              detail="The audit statement request could not be completed."
              onRetry={() => reportMutation.mutate()}
            />
          )}

          {reportMutation.isPending && (
            <div className="py-16 flex flex-col items-center justify-center gap-3" aria-busy="true">
              <div className="w-5 h-5 border border-[#ff6a00] border-t-transparent animate-spin rounded-full" />
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
                Synthesizing multi-modal evidence & generating audit record...
              </span>
            </div>
          )}

          {!reportMutation.isPending && reportMutation.data && (() => {
            const r = reportMutation.data;
            const isOnTrack = r.current_status.startsWith('ON TRACK');
            return (
              <div className="space-y-8 border border-white/[0.12] p-6 sm:p-8 bg-[#0a0a0a]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/[0.08] pb-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white font-sans uppercase tracking-tight">
                      {r.project_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-neutral-400 mt-1">
                      {r.location_name && (
                        <span className="text-neutral-200 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#ff6a00]" />
                          <span>{r.location_name}</span>
                        </span>
                      )}
                      <span>GENERATED {stamp(r.generated_at)}</span>
                      <span>·</span>
                      <span>SCOPE: {r.project_id.slice(0, 12)}</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 font-mono text-xs uppercase border ${
                      isOnTrack
                        ? 'border-white/40 bg-white/[0.06] text-white'
                        : 'border-[#ff6a00]/50 bg-[#ff6a00]/10 text-[#ff6a00] font-bold'
                    }`}
                  >
                    {isOnTrack ? '● STATUS: ON TRACK' : '▲ STATUS: REVIEW REQUIRED'}
                  </span>
                </div>

                {/* Section: Observation Statement */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                    FIELD OBSERVATION STATEMENT
                  </span>
                  <div className="p-5 bg-[#111111] border border-white/[0.1] text-[14px] text-white leading-relaxed">
                    {r.current_status}
                  </div>
                </div>

                {/* Readouts Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#050505] border border-white/[0.08]">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                      {r.total_evidence_count}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-1">
                      TOTAL EVIDENCE
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                      {r.timeline_summary.length}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-1">
                      MILESTONES
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-[#ff6a00]">
                      {r.change_score != null ? `${(r.change_score * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-1">
                      STRUCTURAL DELTA
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                      {r.key_evidence.length}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-1">
                      CITED CAPTURES
                    </div>
                  </div>
                </div>

                {/* Progression Preview */}
                {r.before_asset_url && r.after_asset_url && (
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                      VISUAL PROGRESSION ANCHOR
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-white/[0.12] bg-[#080808] overflow-hidden">
                        <div className="p-2 border-b border-white/[0.08] text-[10px] font-mono text-neutral-300 uppercase">
                          BASELINE ANCHOR
                        </div>
                        <div className="aspect-[16/10] bg-black">
                          <img src={r.before_asset_url} alt="Baseline capture" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="border border-white/[0.12] bg-[#080808] overflow-hidden">
                        <div className="p-2 border-b border-white/[0.08] text-[10px] font-mono text-[#ff6a00] uppercase font-bold">
                          CURRENT CAPTURE
                        </div>
                        <div className="aspect-[16/10] bg-black">
                          <img src={r.after_asset_url} alt="Current capture" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                    {r.before_after_summary && (
                      <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                        {r.before_after_summary}
                      </p>
                    )}
                  </div>
                )}

                {/* Key Cited Evidence */}
                {r.key_evidence.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                      CITED PRIMARY EVIDENCE ({r.key_evidence.length})
                    </span>
                    <div className="border-t border-white/[0.08] divide-y divide-white/[0.08]">
                      {r.key_evidence.map((item, index) => (
                        <div key={item.asset_id} className="py-3 px-1 flex items-start gap-4 hover:bg-white/[0.02] transition-colors">
                          <span className="font-mono text-xs text-neutral-500 w-6 pt-0.5">
                            #{String(index + 1).padStart(2, '0')}
                          </span>
                          <img
                            src={item.cloudinary_url}
                            alt=""
                            loading="lazy"
                            className="w-14 h-14 object-cover border border-white/[0.12] bg-black flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs text-white leading-snug">{item.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-neutral-400">
                              {item.activity && <span>ACTIVITY: {humanizeToken(item.activity)}</span>}
                              {item.timestamp && <span>{shortDate(item.timestamp)}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Detail Dialog */}
      <EvidenceDialog
        key={detail?.asset_id ?? 'none'}
        item={detail}
        onClose={() => setDetail(null)}
        onDelete={(id) => {
          setAssetToDelete({
            id,
            url: detail?.cloudinary_url,
            description: detail?.description,
          });
        }}
      />

      {/* Media Delete Confirmation Modal */}
      <Modal
        open={assetToDelete != null}
        onClose={() => setAssetToDelete(null)}
        title="Delete Media Capture"
        width="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAssetToDelete(null)}
              className="btn btn-secondary font-mono text-xs"
            >
              CANCEL
            </button>
            <button
              type="button"
              disabled={deleteMediaMutation.isPending}
              onClick={() => {
                if (!assetToDelete) return;
                deleteMediaMutation.mutate(assetToDelete.id, {
                  onSuccess: () => {
                    if (detail?.asset_id === assetToDelete.id) {
                      setDetail(null);
                    }
                    setAssetToDelete(null);
                  },
                });
              }}
              className="btn btn-danger font-mono text-xs"
            >
              {deleteMediaMutation.isPending ? 'DELETING...' : 'CONFIRM DELETE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {assetToDelete && (
            <div className="flex gap-4 items-start">
              {assetToDelete.url && (
                <img
                  src={assetToDelete.url}
                  alt=""
                  className="w-20 h-20 object-cover border border-white/[0.12] bg-black flex-shrink-0"
                />
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-mono text-white break-all">ID: {assetToDelete.id}</p>
                {assetToDelete.description && (
                  <p className="text-xs text-neutral-300 line-clamp-2">
                    {assetToDelete.description}
                  </p>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-neutral-400 leading-relaxed border-t border-white/[0.08] pt-3">
            Are you sure you want to permanently delete this media capture? This will remove the visual asset and its AI embeddings from the project workspace.
          </p>
        </div>
      </Modal>

      {/* Delete Project Workspace Confirmation Modal */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Project Workspace"
        width="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="btn btn-secondary font-mono text-xs"
            >
              CANCEL
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              className="btn btn-danger font-mono text-xs"
              onClick={() =>
                deleteMutation.mutate(projectId!, { onSuccess: () => navigate('/projects') })
              }
            >
              {deleteMutation.isPending ? 'DELETING...' : 'CONFIRM DELETE'}
            </button>
          </>
        }
      >
        <p className="text-xs text-neutral-400 leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-white">{project.name}</span>?
          {assets.length > 0
            ? ` ${assets.length} capture${assets.length === 1 ? '' : 's'} will return to the review queue as unassigned.`
            : ' No captures are currently attributed to this project.'}
        </p>
      </Modal>

      {/* Multi-Photo Upload Dialog for Project */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        initialLat={project.latitude}
        initialLng={project.longitude}
      />
    </div>
  );
}
