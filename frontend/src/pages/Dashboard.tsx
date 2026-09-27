import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Images, FolderKanban, CheckCircle2, ArrowUpRight, ScanLine } from 'lucide-react';
import { useProjects } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import {
  Metric,
  PanelHeader,
  EmptyState,
  ErrorState,
  SkeletonMetrics,
  SkeletonRows,
  SkeletonPlot,
  Chip,
  Coordinate,
  Meter,
} from '../components/ui';
import GeoPlot from '../components/GeoPlot';
import ConfidenceHistogram from '../components/ConfidenceHistogram';
import ActivityDensity from '../components/ActivityDensity';
import {
  AUTO_ASSIGN_THRESHOLD,
  STATUS_ORDER,
  humanizeToken,
  relativeTime,
  statusOf,
} from '../lib/presentation';
import type { MediaAsset } from '../types';

function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-4" aria-busy="true" aria-label="Loading overview">
      <SkeletonMetrics />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SkeletonPlot className="xl:col-span-2" />
        <div className="panel h-[300px]" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel">
          <SkeletonRows rows={4} />
        </div>
        <div className="panel h-[240px]" />
      </div>
    </div>
  );
}

function Thumb({ asset, className }: { asset: MediaAsset; className?: string }) {
  if (!asset.cloudinary_url) {
    return (
      <span className={`${className} bg-sunken border border-line flex items-center justify-center`}>
        <Images className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={asset.cloudinary_url}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${className} object-cover bg-sunken border border-line`}
    />
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
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
    const gpsSource = assets.filter((a) => a.location_source && a.location_source !== 'NONE');

    return {
      assets,
      counts,
      avg,
      exceptions,
      inFlight,
      autoRouted,
      geoTagged,
      gpsSource,
      ready: counts.get('READY') ?? 0,
    };
  }, [media]);

  const recent = useMemo(
    () =>
      [...stats.assets]
        .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
        .slice(0, 7),
    [stats.assets],
  );

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="Corpus unavailable"
          detail="The media request failed. Confirm the API is reachable, then retry."
        />
      </div>
    );
  }

  const total = stats.assets.length;
  const coverage = total ? (stats.autoRouted.length / total) * 100 : 0;
  const gpsCoverage = total ? (stats.geoTagged.length / total) * 100 : 0;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Metric
          label="Corpus"
          value={total}
          unit="assets"
          foot={`${stats.inFlight.length} in pipeline`}
        />
        <Metric
          label="Targets"
          value={projects?.length ?? 0}
          unit="projects"
          foot={
            stats.gpsSource.length > 0
              ? `${stats.gpsSource.length} captures geo-tagged`
              : 'no EXIF yet'
          }
        />
        <Metric
          label="Verified"
          value={stats.ready}
          foot={`${coverage.toFixed(0)}% above ${(AUTO_ASSIGN_THRESHOLD * 100).toFixed(0)}% threshold`}
          tone="ok"
        />
        <Metric
          label="Exceptions"
          value={stats.exceptions.length}
          foot={stats.exceptions.length > 0 ? 'awaiting a decision' : 'queue is clear'}
          tone={stats.exceptions.length > 0 ? 'signal' : 'default'}
        />
        <Metric
          label="Mean confidence"
          value={stats.avg != null ? (stats.avg * 100).toFixed(1) : 'n/a'}
          unit={stats.avg != null ? '%' : undefined}
          foot={`${gpsCoverage.toFixed(0)}% carry coordinates`}
        />
      </div>

      {/* Pipeline as a single dense line, not a panel. It is a status readout,
          not something that needs its own surface. */}
      {total > 0 && (
        <div className="panel px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 mb-2.5">
            <span className="label-strong">Pipeline</span>
            {STATUS_ORDER.filter((s) => (stats.counts.get(s) ?? 0) > 0).map((status) => (
              <span key={status} className="flex items-baseline gap-1.5">
                <span className="label">
                  {statusOf({ processing_status: status, project_id: 'p' }).label}
                </span>
                <span className="value text-[12px] font-semibold">{stats.counts.get(status)}</span>
              </span>
            ))}
            <span className="meta ml-auto">{total} total</span>
          </div>
          <div
            className="flex h-2 gap-px"
            role="img"
            aria-label={STATUS_ORDER.filter((s) => (stats.counts.get(s) ?? 0) > 0)
              .map(
                (s) =>
                  `${statusOf({ processing_status: s, project_id: 'p' }).label} ${
                    stats.counts.get(s)
                  }`,
              )
              .join(', ')}
          >
            {STATUS_ORDER.map((status) => {
              const n = stats.counts.get(status) ?? 0;
              if (n === 0) return null;
              return (
                <span
                  key={status}
                  style={{ flexGrow: n }}
                  className={
                    status === 'READY'
                      ? 'bg-ok-500'
                      : status === 'FAILED'
                        ? 'bg-danger-500'
                        : statusOf({ processing_status: status, project_id: 'p' }).inFlight
                          ? 'bg-signal-400'
                          : 'bg-line-strong'
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Geography. This is the product's actual subject, so it leads. */}
        <div className="xl:col-span-2">
          <GeoPlot
            projects={projects ?? []}
            assets={stats.assets}
            onSelectProject={(id) => navigate(`/projects/${id}`)}
            onSelectAsset={(id) => {
              const asset = stats.assets.find((a) => a.id === id);
              if (asset?.project_id) navigate(`/projects/${asset.project_id}`);
            }}
          />
        </div>

        {/* Exception queue: the primary action surface. */}
        <section className="panel flex flex-col max-h-[420px]" aria-labelledby="queue-h">
          <PanelHeader
            title={<span id="queue-h">Exception queue</span>}
            meta={stats.exceptions.length > 0 ? 'routing needs a human' : 'nothing waiting'}
            actions={
              stats.exceptions.length > 0 ? (
                <Link to="/review" className="btn btn-sm btn-signal">
                  Resolve
                  <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />

          {stats.exceptions.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Queue clear"
              description="Every ingested capture is routed and verified."
            />
          ) : (
            <ul className="overflow-y-auto flex-1">
              {stats.exceptions.slice(0, 8).map((asset) => {
                const s = statusOf(asset);
                return (
                  <li key={asset.id}>
                    <Link
                      to="/review"
                      className="flex items-start gap-3 px-4 py-2.5 rule-b last:border-b-0 row-hover"
                    >
                      <Thumb asset={asset} className="w-10 h-10 rounded-[var(--radius-control)]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Chip className={s.chip}>{s.label}</Chip>
                          <span className="meta truncate">{humanizeToken(asset.activity)}</span>
                        </div>
                        <p className="meta mt-1">
                          {asset.routing_confidence != null
                            ? `${(asset.routing_confidence * 100).toFixed(1)}% confidence`
                            : 'awaiting analysis'}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Distributions: how the corpus is actually behaving. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfidenceHistogram assets={stats.assets} />
        <ActivityDensity assets={stats.assets} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent captures */}
        <section className="panel" aria-labelledby="recent-h">
          <PanelHeader
            title={<span id="recent-h">Latest captures</span>}
            actions={
              <Link to="/media" className="btn btn-sm btn-ghost">
                All media
                <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState icon={Images} title="Nothing ingested yet" />
          ) : (
            <ul>
              {recent.map((asset) => {
                const s = statusOf(asset);
                return (
                  <li
                    key={asset.id}
                    className="flex items-center gap-3 px-4 py-2.5 rule-b last:border-b-0 row-hover"
                  >
                    <Thumb asset={asset} className="w-9 h-9 rounded-[var(--radius-control)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-ink truncate">
                        {asset.description || 'Awaiting visual analysis'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                        {asset.location_source && asset.location_source !== 'NONE' && (
                          <span className="meta">{asset.location_source.toLowerCase()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Chip className={s.chip}>{s.label}</Chip>
                      <p className="meta mt-1">{relativeTime(asset.uploaded_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Target coverage */}
        <section className="panel" aria-labelledby="targets-h">
          <PanelHeader
            title={<span id="targets-h">Target coverage</span>}
            meta="verified share of each project"
            actions={
              <Link to="/projects" className="btn btn-sm btn-ghost">
                Manage
                <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            }
          />
          {(projects?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No routing targets"
              description="Define a project with a coordinate so the router has somewhere to send captures."
              action={
                <Link to="/projects" className="btn btn-primary">
                  Create project
                </Link>
              }
            />
          ) : (
            <ul>
              {projects?.map((project) => {
                const owned = stats.assets.filter((a) => a.project_id === project.id);
                const verified = owned.filter((a) => a.processing_status === 'READY').length;
                const share = owned.length ? verified / owned.length : 0;
                return (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="block px-4 py-3 rule-b last:border-b-0 row-hover"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-medium text-ink truncate group-hover:text-brand-700">
                          {project.name}
                        </span>
                        <span className="value text-[12px] text-ink-2 flex-shrink-0">
                          {verified}
                          <span className="text-ink-3">/{owned.length}</span>
                        </span>
                      </div>
                      <div className="mt-2">
                        <Meter
                          value={share}
                          tone={share >= 0.6 ? 'ok' : share > 0 ? 'brand' : 'signal'}
                          label={`${project.name}: ${Math.round(share * 100)} percent verified`}
                        />
                      </div>
                      <p className="meta mt-1.5 truncate">
                        {project.location_name ?? 'no location'}
                        {project.latitude != null && (
                          <Coordinate lat={project.latitude} lng={project.longitude} className="ml-2" />
                        )}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="label flex items-center gap-1.5 pt-1">
        <ScanLine className="w-3 h-3" aria-hidden="true" />
        routing auto-assigns at {AUTO_ASSIGN_THRESHOLD * 100}% confidence and above
      </p>
    </div>
  );
}
