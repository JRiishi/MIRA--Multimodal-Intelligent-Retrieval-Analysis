import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Images,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useProjects } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import {
  EmptyState,
  ErrorState,
  SkeletonMetrics,
  Coordinate,
} from '../components/ui';
import ConfidenceHistogram from '../components/ConfidenceHistogram';
import ActivityDensity from '../components/ActivityDensity';
import {
  AUTO_ASSIGN_THRESHOLD,
  STATUS_ORDER,
  relativeTime,
  statusOf,
} from '../lib/presentation';
import type { MediaAsset } from '../types';

function DashboardSkeleton() {
  return (
    <div className="p-6 lg:p-12 space-y-12 max-w-6xl mx-auto" aria-busy="true" aria-label="Loading overview">
      <div className="space-y-3">
        <div className="h-4 w-24 bg-white/[0.04] animate-pulse" />
        <div className="h-12 w-96 bg-white/[0.04] animate-pulse" />
      </div>
      <SkeletonMetrics count={4} />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function Thumb({ asset, className }: { asset: MediaAsset; className?: string }) {
  if (!asset.cloudinary_url) {
    return (
      <span className={`${className} bg-white/[0.03] border border-white/[0.08] flex items-center justify-center flex-shrink-0`}>
        <Images className="w-3.5 h-3.5 text-neutral-600" aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={asset.cloudinary_url}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${className} object-cover bg-black border border-white/[0.08] flex-shrink-0`}
    />
  );
}

export default function Dashboard() {
  const { data: projects, isLoading: pLoading, error: pError } = useProjects();
  const { data: media, isLoading: mLoading, error: mError } = useMediaLibrary();

  const isLoading = pLoading || mLoading;
  const error = pError ?? mError;

  const stats = useMemo(() => {
    const assets = media ?? [];
    const counts = new Map<string, number>();
    for (const status of STATUS_ORDER) counts.set(status, 0);
    for (const asset of assets) {
      counts.set(asset.processing_status, (counts.get(asset.processing_status) ?? 0) + 1);
    }

    const scored = assets
      .map((a) => a.routing_confidence)
      .filter((c): c is number => typeof c === 'number' && c > 0);
    const avg = scored.length ? scored.reduce((x, y) => x + y, 0) / scored.length : null;

    const exceptions = assets.filter((a) => statusOf(a).needsHuman);
    const inFlight = assets.filter((a) => statusOf(a).inFlight);
    const autoRouted = assets.filter(
      (a) => typeof a.routing_confidence === 'number' && a.routing_confidence >= AUTO_ASSIGN_THRESHOLD,
    );
    const geoTagged = assets.filter((a) => a.image_latitude != null && a.image_longitude != null);

    return {
      assets,
      counts,
      avg,
      exceptions,
      inFlight,
      autoRouted,
      geoTagged,
      ready: counts.get('READY') ?? 0,
    };
  }, [media]);

  const recent = useMemo(
    () =>
      [...stats.assets]
        .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
        .slice(0, 6),
    [stats.assets],
  );

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <ErrorState
          title="Corpus data unavailable"
          detail="Failed to connect to the backend server. Please verify the API is running on port 8000 and try again."
        />
      </div>
    );
  }

  const total = stats.assets.length;

  return (
    <div className="p-6 sm:p-10 lg:p-14 space-y-16 max-w-6xl mx-auto">
      {/* Editorial Header */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
              00 // MULTIMODAL INTELLIGENCE PLATFORM
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mt-1">
              Field Intelligence
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/search" className="btn btn-sm btn-secondary font-mono text-xs">
              SEARCH
            </Link>
            <Link to="/media" className="btn btn-sm btn-primary font-mono text-xs">
              UPLOAD MEDIA →
            </Link>
          </div>
        </div>

        {/* Integrated Typographic Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-6 border-t border-white/[0.08]">
          <div>
            <div className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans">
              {total}
            </div>
            <div className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-1">
              TOTAL CAPTURES
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans">
              {projects?.length ?? 0}
            </div>
            <div className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-1">
              ACTIVE WORKSPACES
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans">
              {stats.ready}
            </div>
            <div className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase mt-1 font-bold">
              VERIFIED EVIDENCE
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans">
              {stats.exceptions.length}
            </div>
            <div className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-1">
              {stats.exceptions.length > 0 ? 'PENDING DECISION' : 'TRIAGE CLEAR'}
            </div>
          </div>
        </div>
      </section>

      {/* Review Banner if items need human decision */}
      {stats.exceptions.length > 0 && (
        <section className="border-y border-[#ff6a00]/30 py-4 bg-[#ff6a00]/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-[#ff6a00]" />
            <span className="text-[13.5px] text-neutral-200">
              <strong className="text-white font-bold">{stats.exceptions.length} capture(s)</strong> require spatial attribution & human-in-the-loop review.
            </span>
          </div>
          <Link
            to="/review"
            className="text-[12px] font-mono text-[#ff6a00] hover:text-white transition-colors flex items-center gap-1.5 flex-shrink-0 font-bold uppercase"
          >
            <span>REVIEW QUEUE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* Section: Project Workspaces Ledger */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] font-bold">
              01 // PROJECT WORKSPACES
            </h2>
          </div>
          <Link to="/projects" className="text-xs font-mono text-neutral-500 hover:text-white transition-colors">
            ALL PROJECTS ({projects?.length ?? 0}) →
          </Link>
        </div>

        {(projects?.length ?? 0) === 0 ? (
          <EmptyState
            title="No project workspaces"
            description="Create a project target with coordinates to begin routing field captures."
            action={
              <Link to="/projects" className="btn btn-sm btn-primary font-mono text-xs">
                CREATE PROJECT →
              </Link>
            }
          />
        ) : (
          <div className="border-t border-white/[0.08] divide-y divide-white/[0.08]">
            {projects?.map((project, idx) => {
              const owned = stats.assets.filter((a) => a.project_id === project.id);
              const verified = owned.filter((a) => a.processing_status === 'READY').length;
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between py-5 hover:bg-white/[0.015] px-2 transition-colors gap-3"
                >
                  <div className="flex items-baseline gap-4 min-w-0">
                    <span className="font-mono text-xs text-neutral-600">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xl font-bold uppercase tracking-tight text-white group-hover:text-[#ff6a00] transition-colors">
                        {project.name}
                      </span>
                      {project.location_name && (
                        <p className="text-xs text-neutral-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#ff6a00]" />
                          <span>{project.location_name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs font-mono text-neutral-400">
                    <span><span className="text-white font-medium">{owned.length}</span> CAPTURES</span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-neutral-300">{verified} VERIFIED</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-[#ff6a00] group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Section: Recent Captures Chronology */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] font-bold">
              02 // RECENT EVIDENCE CAPTURES
            </h2>
          </div>
          <Link to="/media" className="text-xs font-mono text-neutral-500 hover:text-white transition-colors">
            VIEW MEDIA LIBRARY ({total}) →
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState title="No field media ingested yet" />
        ) : (
          <div className="border-t border-white/[0.08] divide-y divide-white/[0.08]">
            {recent.map((asset) => {
              const s = statusOf(asset);
              return (
                <div
                  key={asset.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-2 hover:bg-white/[0.015] transition-colors gap-3"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Thumb asset={asset} className="w-12 h-12" />
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-white font-normal truncate">
                        {asset.description || 'Observed field capture'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono mt-0.5">
                        <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                        <span>·</span>
                        <span>{relativeTime(asset.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
                    <span className="border border-white/[0.1] px-2 py-0.5 text-neutral-300 uppercase">
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section: Pipeline Distribution Analysis */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] font-bold">
            03 // PIPELINE TELEMETRY
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-3">
            <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              CONFIDENCE DISTRIBUTION
            </h3>
            <ConfidenceHistogram assets={stats.assets} />
          </div>
          <div className="space-y-3">
            <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              TEMPORAL ACTIVITY
            </h3>
            <ActivityDensity assets={stats.assets} />
          </div>
        </div>
      </section>

      {/* Subtle Footer */}
      <footer className="pt-8 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-neutral-600">
        <span>MIRA MULTIMODAL INTELLIGENCE</span>
        <span>AUTO-ASSIGN THRESHOLD: {AUTO_ASSIGN_THRESHOLD * 100}%</span>
      </footer>
    </div>
  );
}
