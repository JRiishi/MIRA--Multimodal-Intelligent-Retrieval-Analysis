import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useMediaLibrary, useAssignMedia, useDeleteMedia } from '../hooks/media';
import { useProjects } from '../hooks/projects';
import {
  EmptyState,
  ErrorState,
  Coordinate,
  ScoreReadout,
  AssetId,
} from '../components/ui';
import { humanizeToken, statusOf, shortDate } from '../lib/presentation';
import type { MediaAsset } from '../types';

export default function NeedsReview() {
  const { data: media, isLoading, error, refetch } = useMediaLibrary();
  const { data: projects } = useProjects();
  const assignMutation = useAssignMedia();
  const deleteMutation = useDeleteMedia();

  const [chosen, setChosen] = useState<Record<string, string>>({});

  const queue = (media ?? []).filter(
    (a) =>
      a.processing_status === 'NEEDS_REVIEW' ||
      a.processing_status === 'UNASSIGNED' ||
      a.project_id == null,
  );

  const ordered = [...queue].sort((a, b) => {
    const rank = (asset: MediaAsset) => (asset.processing_status === 'NEEDS_REVIEW' ? 0 : 1);
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : b.uploaded_at.localeCompare(a.uploaded_at);
  });

  const assign = (asset: MediaAsset) => {
    const target = chosen[asset.id] ?? asset.project_id;
    if (!target) return;
    assignMutation.mutate({ assetId: asset.id, projectId: target });
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-12 space-y-8 max-w-6xl mx-auto" aria-busy="true" aria-label="Loading review queue">
        <div className="h-4 w-32 bg-white/[0.04] animate-pulse" />
        <div className="h-12 w-64 bg-white/[0.04] animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 bg-white/[0.02] border-b border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <ErrorState
          title="Triage Queue Unavailable"
          detail="Could not retrieve media assets for human-in-the-loop review."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 lg:p-14 space-y-12 max-w-6xl mx-auto">
      {/* Editorial Header */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
              03 // HUMAN-IN-THE-LOOP ROUTING
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mt-1">
              Triage Queue
            </h1>
          </div>
          <div className="text-xs font-mono text-neutral-400">
            <span className="text-[#ff6a00] font-bold">{ordered.length}</span> OF {media?.length ?? 0} REQUIRE DECISION
          </div>
        </div>

        <p className="text-xs font-mono text-neutral-400 pt-4 border-t border-white/[0.08] max-w-2xl leading-relaxed">
          MIRA automatically attributes captures above 40% confidence. Items here landed in the review band (28%–40%) or require manual workspace routing.
        </p>
      </section>

      {ordered.length === 0 ? (
        <EmptyState
          title="Triage Queue Clear"
          description="Every ingested field capture has been verified and attributed to its target workspace."
          action={
            <Link to="/media" className="btn btn-secondary font-mono text-xs">
              VIEW MEDIA LIBRARY →
            </Link>
          }
        />
      ) : (
        <div className="border-t border-white/[0.08] divide-y divide-white/[0.08]">
          {ordered.map((asset) => {
            const status = statusOf(asset);
            const suggested = asset.project_id;
            const selected = chosen[asset.id] ?? suggested ?? '';
            const needsChoice = !suggested;

            return (
              <div
                key={asset.id}
                className="py-8 flex flex-col lg:flex-row items-start justify-between gap-8 hover:bg-white/[0.015] transition-colors"
              >
                {/* Visual Preview */}
                <div className="w-full lg:w-80 aspect-[16/10] bg-black border border-white/[0.12] overflow-hidden flex-shrink-0 relative group">
                  {asset.cloudinary_url ? (
                    <img
                      src={asset.cloudinary_url}
                      alt={asset.description ?? 'Capture'}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-neutral-600">
                      NO PREVIEW
                    </div>
                  )}

                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/90 text-[9.5px] font-mono text-[#ff6a00] border border-[#ff6a00]/40 uppercase">
                    {status.label}
                  </span>

                  {asset.cloudinary_url && (
                    <a
                      href={asset.cloudinary_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open full resolution photograph"
                      className="absolute bottom-2 right-2 p-1.5 bg-black text-neutral-400 hover:text-white border border-white/20 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Information */}
                <div className="flex-1 min-w-0 space-y-4">
                  <h3 className="text-base font-normal text-white leading-snug">
                    {asset.description || 'Observed field capture awaiting verification.'}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-white/[0.06] text-xs font-mono">
                    <div>
                      <span className="text-[9.5px] text-neutral-500 uppercase block tracking-wider">CONFIDENCE</span>
                      <ScoreReadout score={asset.routing_confidence} className="mt-1" />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-neutral-500 uppercase block tracking-wider">ACTIVITY</span>
                      <span className="text-neutral-300 mt-1 block truncate">
                        {humanizeToken(asset.activity) || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-neutral-500 uppercase block tracking-wider">GPS DISTANCE</span>
                      <span className="text-neutral-300 mt-1 block">
                        {asset.location_match_distance != null
                          ? `${asset.location_match_distance.toFixed(2)} km`
                          : 'No Anchor'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-neutral-500 uppercase block tracking-wider">COORDINATES</span>
                      <div className="mt-1">
                        <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-neutral-500">
                    <AssetId id={asset.id} />
                    <span>·</span>
                    <span>{shortDate(asset.uploaded_at)}</span>
                  </div>
                </div>

                {/* Routing Assignment Action */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-3 border-t lg:border-t-0 lg:border-l border-white/[0.08] lg:pl-8 pt-4 lg:pt-0">
                  <div>
                    <label htmlFor={`assign-${asset.id}`} className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">
                      {needsChoice ? 'Target Workspace' : 'Router Suggestion'}
                    </label>
                    <select
                      id={`assign-${asset.id}`}
                      className="field w-full text-xs"
                      value={selected}
                      disabled={!needsChoice}
                      onChange={(e) => setChosen((c) => ({ ...c, [asset.id]: e.target.value }))}
                    >
                      {(projects?.length ?? 0) === 0 && <option value="">No projects</option>}
                      {projects?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => assign(asset)}
                    disabled={!selected || assignMutation.isPending}
                    className="btn btn-primary w-full font-mono text-xs"
                  >
                    {needsChoice ? 'ASSIGN TO PROJECT →' : 'CONFIRM ASSIGNMENT →'}
                  </button>

                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    {asset.project_id ? (
                      <Link
                        to={`/projects/${asset.project_id}`}
                        className="text-neutral-400 hover:text-white transition-colors"
                      >
                        VIEW WORKSPACE →
                      </Link>
                    ) : (
                      <span className="text-neutral-600">UNASSIGNED</span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(asset.id)}
                      disabled={deleteMutation.isPending}
                      className="text-neutral-600 hover:text-red-400 transition-colors"
                      title="Discard capture"
                    >
                      DISCARD
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
