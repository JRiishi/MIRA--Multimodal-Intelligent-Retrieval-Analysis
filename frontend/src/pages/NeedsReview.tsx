import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Trash2, MapPin, ExternalLink, CornerDownLeft } from 'lucide-react';
import { useMediaLibrary, useAssignMedia, useDeleteMedia } from '../hooks/media';
import { useProjects } from '../hooks/projects';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Chip,
  Coordinate,
  ScoreReadout,
  AssetId,
} from '../components/ui';
import { humanizeToken, stamp, statusOf, relativeTime } from '../lib/presentation';
import type { MediaAsset } from '../types';

export default function NeedsReview() {
  const { data: media, isLoading, error, refetch } = useMediaLibrary();
  const { data: projects } = useProjects();
  const assignMutation = useAssignMedia();
  const deleteMutation = useDeleteMedia();

  const [chosen, setChosen] = useState<Record<string, string>>({});

  /**
   * Three backend behaviours create work for a reviewer: routing landed in the
   * review band, routing could not attribute the capture, or the owning project
   * was deleted and the capture was unlinked.
   */
  const queue = (media ?? []).filter(
    (a) =>
      a.processing_status === 'NEEDS_REVIEW' ||
      a.processing_status === 'UNASSIGNED' ||
      a.project_id == null,
  );

  // Review band first (needs a yes/no), then the rest by newest first.
  const ordered = [...queue].sort((a, b) => {
    const rank = (asset: MediaAsset) => (asset.processing_status === 'NEEDS_REVIEW' ? 0 : 1);
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : b.uploaded_at.localeCompare(a.uploaded_at);
  });

  const projectName = (id: string | null) =>
    id ? projects?.find((p) => p.id === id)?.name ?? 'unknown target' : null;

  const assign = (asset: MediaAsset) => {
    const target = chosen[asset.id] ?? asset.project_id;
    if (!target) return;
    assignMutation.mutate({ assetId: asset.id, projectId: target });
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-4" aria-busy="true" aria-label="Loading review queue">
        <Skeleton className="h-14" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="Queue unavailable"
          detail="The media request failed."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Triage header */}
      <div className="panel px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <span className="label">Awaiting decision</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="value text-[26px] font-semibold leading-none text-signal-700">
              {ordered.length}
            </span>
            <span className="meta">of {media?.length ?? 0} captures</span>
          </div>
        </div>
        <div className="h-8 w-px bg-line hidden sm:block" aria-hidden="true" />
        <p className="text-[12.5px] text-ink-2 max-w-xl leading-relaxed flex-1 min-w-[240px]">
          The router auto-assigns above 40 percent confidence. Everything here fell below that line
          or could not be attributed, so a person decides the destination.
        </p>
      </div>

      {ordered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={CheckCircle2}
            title="Nothing to adjudicate"
            description="Every ingested capture has been attributed to a project and cleared for indexing."
            action={
              <Link to="/media" className="btn btn-secondary">
                Open media library
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {ordered.map((asset) => {
            const status = statusOf(asset);
            const suggested = asset.project_id;
            const selected = chosen[asset.id] ?? suggested ?? '';
            const needsChoice = !suggested;

            return (
              <li key={asset.id} className="panel">
                <div className="flex flex-col lg:flex-row">
                  {/* Evidence */}
                  <div className="lg:w-[300px] flex-shrink-0 rule-b lg:rule-b-0 lg:rule-r bg-sunken/40">
                    <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[220px]">
                      {asset.cloudinary_url ? (
                        <img
                          src={asset.cloudinary_url}
                          alt={asset.description ?? 'Field capture awaiting assignment'}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="meta">no preview</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <Chip className={status.chip}>{status.label}</Chip>
                      </div>
                      {asset.cloudinary_url && (
                        <a
                          href={asset.cloudinary_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open full resolution capture"
                          className="absolute bottom-2 right-2 btn btn-icon bg-ink/70 text-white border-ink/50 hover:bg-ink/85"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="flex-1 min-w-0 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-ink leading-snug">
                          {asset.description || 'No visual description was produced for this capture.'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <AssetId id={asset.id} />
                          <span className="meta">{relativeTime(asset.uploaded_at)}</span>
                          <span className="meta">{stamp(asset.uploaded_at)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="label block mb-1">Confidence</span>
                        <ScoreReadout score={asset.routing_confidence} />
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <dt className="label">Activity</dt>
                        <dd className="value text-[12px] text-ink-2 mt-1">
                          {humanizeToken(asset.activity)}
                        </dd>
                      </div>
                      <div>
                        <dt className="label">Scene</dt>
                        <dd className="value text-[12px] text-ink-2 mt-1 truncate">
                          {humanizeToken(asset.scene)}
                        </dd>
                      </div>
                      <div>
                        <dt className="label">Position</dt>
                        <dd className="mt-1">
                          <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                        </dd>
                      </div>
                      <div>
                        <dt className="label">Distance to anchor</dt>
                        <dd className="value text-[12px] text-ink-2 mt-1">
                          {asset.location_match_distance != null
                            ? `${asset.location_match_distance.toFixed(2)} km`
                            : 'n/a'}
                        </dd>
                      </div>
                    </dl>

                    {asset.description && (
                      <p className="text-[12.5px] text-ink-2 leading-relaxed border-l-2 border-line pl-3">
                        {asset.location_match_distance != null
                          ? `Matched ${asset.location_match_distance.toFixed(2)} km from the anchor using ${
                              asset.location_source === 'EXIF' ? 'EXIF' : 'manual'
                            } coordinates.`
                          : 'No anchor was within radius, so no candidate project was scored.'}
                      </p>
                    )}
                  </div>

                  {/* Decision */}
                  <div className="lg:w-[268px] flex-shrink-0 rule-t lg:rule-t-0 lg:rule-l bg-sunken/30 p-4 flex flex-col gap-3">
                    <div>
                      <span className="label">
                        {needsChoice ? 'Assign to' : 'Router suggested'}
                      </span>
                      {needsChoice && (
                        <label htmlFor={`assign-${asset.id}`} className="sr-only">
                          Choose a project for capture {asset.id}
                        </label>
                      )}
                      <select
                        id={`assign-${asset.id}`}
                        className="field field-sm mt-1.5 w-full"
                        value={selected}
                        disabled={!needsChoice}
                        onChange={(e) => setChosen((c) => ({ ...c, [asset.id]: e.target.value }))}
                      >
                        {(projects?.length ?? 0) === 0 && <option value="">no projects available</option>}
                        {projects?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!needsChoice && projectName(asset.project_id) && (
                      <p className="flex items-start gap-1.5 text-[12px] text-ink-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-ink-3" aria-hidden="true" />
                        <span className="truncate">{projectName(asset.project_id)}</span>
                      </p>
                    )}

                    <div className="flex flex-col gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => assign(asset)}
                        disabled={!selected || assignMutation.isPending}
                        className="btn btn-primary w-full"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        {needsChoice ? 'Assign capture' : 'Confirm assignment'}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/projects/${asset.project_id}`}
                          className="btn btn-secondary btn-sm flex-1"
                          aria-disabled={!asset.project_id}
                          onClick={(e) => {
                            if (!asset.project_id) e.preventDefault();
                          }}
                        >
                          Open target
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(asset.id)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Discard capture ${asset.id}`}
                          className="btn btn-sm btn-danger"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
