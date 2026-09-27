import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Images, Upload, RefreshCw, ExternalLink, X, Layers, Crop, Zap } from 'lucide-react';
import {
  useMediaLibrary,
  useDeleteMedia,
  useSyncAllCloudinaryMetadata,
  useAssetTransformations,
  useUploadMedia,
} from '../hooks/media';
import { useProjects } from '../hooks/projects';
import { useUploadSignature, directUpload as directUploadToCdn } from '../hooks/upload';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCards,
  SkeletonRows,
  Chip,
  Coordinate,
  ScoreReadout,
  Modal,
  SegmentedControl,
  Field,
  AssetId,
} from '../components/ui';
import { humanizeToken, relativeTime, statusOf } from '../lib/presentation';
import type { MediaAsset } from '../types';

type Filter = 'all' | 'exceptions' | 'ready' | 'geo';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'exceptions', label: 'Exceptions' },
  { value: 'ready', label: 'Verified' },
  { value: 'geo', label: 'Geo-tagged' },
];

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

function UploadDialog({
  open,
  onClose,
  onUpload,
  onDirectUpload,
  pending,
  directPending,
  signatureUnavailable,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, lat: number | null, lng: number | null) => void;
  onDirectUpload: (file: File) => void;
  pending: boolean;
  directPending: boolean;
  signatureUnavailable: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const latNum = lat === '' ? null : Number(lat);
  const lngNum = lng === '' ? null : Number(lng);
  const coordError =
    (latNum == null) !== (lngNum == null)
      ? 'Enter both coordinates or leave both blank to rely on EXIF.'
      : undefined;

  const busy = pending || directPending;

  const close = () => {
    setFile(null);
    setLat('');
    setLng('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Ingest field capture"
      width="max-w-md"
      footer={
        <>
          <button type="button" onClick={close} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || Boolean(coordError) || busy}
            onClick={() => {
              if (!file) return;
              if (signatureUnavailable) onUpload(file, latNum, lngNum);
              else onDirectUpload(file);
            }}
            className="btn btn-primary"
          >
            {directPending ? 'Sending to CDN' : pending ? 'Uploading' : 'Ingest capture'}
          </button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <Field label="Photograph" hint="JPEG or PNG. EXIF coordinates are read automatically.">
          {() => (
            <div className="flex items-center gap-3">
              <label className="btn btn-secondary cursor-pointer">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file ? (
                <span className="meta truncate">
                  {file.name} ({Math.round(file.size / 1024)} kB)
                </span>
              ) : (
                <span className="meta">no file selected</span>
              )}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" error={coordError}>
            {(p) => (
              <input
                {...p}
                type="number"
                step="0.0001"
                className="field value"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="27.5412"
              />
            )}
          </Field>
          <Field label="Longitude">
            {(p) => (
              <input
                {...p}
                type="number"
                step="0.0001"
                className="field value"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="72.2913"
              />
            )}
          </Field>
        </div>

        {/* Transport is an implementation detail of one action, so it is
            stated rather than hidden, and it always has a working fallback. */}
        <p className="text-[11.5px] text-ink-3 leading-relaxed flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            {signatureUnavailable
              ? 'No upload signature available, so the file is routed through the API server.'
              : 'The file goes straight to the Cloudinary CDN, so a large photograph does not hold an API worker. Analysis starts from the upload webhook.'}
          </span>
        </p>

        {file && !signatureUnavailable && (
          <button
            type="button"
            onClick={() => onUpload(file, latNum, lngNum)}
            disabled={Boolean(coordError) || busy}
            className="btn btn-sm btn-ghost w-full"
          >
            Send through the API server instead
          </button>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Cloudinary detail                                                   */
/* ------------------------------------------------------------------ */

type DetailTab = 'original' | 'provenance' | 'campaign';

function TransformationDialog({
  asset,
  onClose,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>('original');
  const { data, isLoading } = useAssetTransformations(asset?.id ?? null);

  if (!asset) return null;

  const aspectUrls = data
    ? [
        { label: 'Square 1:1', url: data.campaign_aspects.square_1_1 },
        { label: 'Landscape 16:9', url: data.campaign_aspects.landscape_16_9 },
        { label: 'Story 9:16', url: data.campaign_aspects.story_9_16 },
      ]
    : [];

  const current =
    tab === 'original'
      ? (data?.optimized_url ?? asset.cloudinary_url)
      : tab === 'provenance'
        ? (data?.verified_badge_url ?? asset.cloudinary_url)
        : (aspectUrls.find((a) => a.label === 'Square 1:1')?.url ?? asset.cloudinary_url);

  return (
    <Modal
      open
      onClose={onClose}
      title="Delivery transformations"
      width="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          {current && (
            <a
              href={current}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Open delivery URL
            </a>
          )}
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
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : current ? (
            <img
              src={current}
              alt={`${tab} delivery transformation`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="meta">no delivery URL available</span>
          )}
        </div>

        {tab === 'campaign' && aspectUrls.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {aspectUrls.map((aspect) => (
              <li key={aspect.label}>
                <a
                  href={aspect.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block panel overflow-hidden hover:border-brand-300 transition-colors"
                >
                  <div className="aspect-square bg-sunken">
                    <img
                      src={aspect.url}
                      alt={`${aspect.label} campaign export`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="px-2.5 py-2 rule-t flex items-center gap-1.5">
                    <Crop className="w-3 h-3 text-ink-3" aria-hidden="true" />
                    <span className="label">{aspect.label}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        {current && (
          <div>
            <span className="label">Delivery URL</span>
            <code className="block mt-1.5 p-2.5 panel-sunken text-[10.5px] leading-relaxed break-all text-ink-2">
              {current}
            </code>
          </div>
        )}

        {data && (
          <p className="flex items-start gap-1.5 text-[11.5px] text-ink-3">
            <Layers className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Variants are produced by Cloudinary URL transformation. Format and quality are
              negotiated per request with <span className="value">f_auto,q_auto</span>; crops use the
              detected focal point via <span className="value">g_auto</span>.
            </span>
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MediaLibrary() {
  const { data: media, isLoading, error, refetch } = useMediaLibrary();
  const { data: projects } = useProjects();
  const deleteMutation = useDeleteMedia();
  const syncMutation = useSyncAllCloudinaryMetadata();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<Filter>('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<MediaAsset | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const uploadMutation = useUploadMedia();
  const signature = useUploadSignature(uploadOpen);
  const [directResult, setDirectResult] = useState<string | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);

  /**
   * Direct CDN upload, with the proxied path as the fallback.
   *
   * A direct upload does not create an asset record on its own: the asset is
   * created by the backend's upload webhook. So this reports "the bytes landed"
   * and leaves the pipeline polling to pick up the new asset, rather than
   * pretending the asset is ready.
   */
  const directUpload = useMutation({
    mutationFn: async (file: File) => {
      if (!signature.data) throw new Error('No upload signature available');
      const result = await directUploadToCdn(signature.data, file);
      return result;
    },
    onSuccess: (result) => {
      setDirectError(null);
      setDirectResult(
        `Sent to the CDN (${Math.round(result.bytes / 1024)} kB). The asset appears once the upload webhook has processed it.`,
      );
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (error: Error) => {
      setDirectResult(null);
      setDirectError(error.message);
    },
  });

  // Lookup map rather than a find() helper, so the memo below has a stable
  // dependency and does not re-derive names on every keystroke.
  const nameByProject = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p.name])),
    [projects],
  );
  const projectName = (id: string | null) => (id ? (nameByProject.get(id) ?? 'unknown') : null);

  const rows = useMemo(() => {
    let list = media ?? [];
    if (filter === 'exceptions') list = list.filter((a) => statusOf(a).needsHuman);
    if (filter === 'ready') list = list.filter((a) => a.processing_status === 'READY');
    if (filter === 'geo') list = list.filter((a) => a.image_latitude != null);
    if (projectFilter) list = list.filter((a) => a.project_id === projectFilter);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const haystack = [
          a.description,
          a.activity,
          a.scene,
          a.project_id ? nameByProject.get(a.project_id) : null,
        ];
        return haystack.some((v) => v?.toLowerCase().includes(q));
      });
    }
    return [...list].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  }, [media, filter, projectFilter, query, nameByProject]);

  const total = media?.length ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Control bar */}
      <div className="panel p-3 flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <SegmentedControl<Filter>
            ariaLabel="Filter captures"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={FILTERS}
          />

          <label htmlFor="media-project" className="sr-only">
            Filter by project
          </label>
          <select
            id="media-project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="field field-sm w-auto min-w-[150px]"
          >
            <option value="">All projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label htmlFor="media-search" className="sr-only">
            Search captures
          </label>
          <input
            id="media-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search descriptions"
            className="field field-sm w-auto min-w-[180px] flex-1"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="meta">
            {rows.length} of {total}
          </span>
          {/* Two representations of the same set. Photographs are reviewed as
              images; audits and handovers are read as numbers. Forcing one
              layout makes one of those two jobs worse. */}
          <SegmentedControl<'grid' | 'table'>
            ariaLabel="Result layout"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'table', label: 'Table' },
            ]}
          />
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="btn btn-sm btn-secondary"
            title="Write evidence metadata back to Cloudinary context and tags"
          >
            <RefreshCw
              className={syncMutation.isPending ? 'w-3 h-3 animate-spin' : 'w-3 h-3'}
              aria-hidden="true"
            />
            {syncMutation.isPending ? 'Syncing' : 'Sync CDN'}
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="btn btn-sm btn-primary"
          >
            <Upload className="w-3 h-3" aria-hidden="true" />
            Ingest
          </button>
        </div>
      </div>

      {syncMutation.isSuccess && syncMutation.data && (
        <div
          role="status"
          className="panel border-ok-100 bg-ok-50 px-3 py-2 flex items-center gap-2 flex-wrap"
        >
          <span className="text-[12px] text-ok-700">
            Cloudinary context and tags rewritten for {syncMutation.data.synced_count} of{' '}
            {syncMutation.data.total_assets} assets.
          </span>
          <button
            type="button"
            onClick={() => syncMutation.reset()}
            aria-label="Dismiss sync summary"
            className="btn btn-icon btn-ghost ml-auto -mr-1 text-ok-700"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {uploadMutation.isError && (
        <div
          role="alert"
          className="panel border-danger-100 bg-danger-50 px-3 py-2 flex items-start gap-2"
        >
          <span className="text-[12px] text-danger-700">
            The API server rejected the upload. Check that the backend is reachable, or retry
            through the CDN path.
          </span>
        </div>
      )}

      {directError && (
        <div
          role="alert"
          className="panel border-danger-100 bg-danger-50 px-3 py-2 flex items-start gap-2"
        >
          <span className="text-[12px] text-danger-700 break-words">
            Direct upload failed: {directError}
          </span>
          <button
            type="button"
            onClick={() => setDirectError(null)}
            aria-label="Dismiss upload error"
            className="btn btn-icon btn-ghost ml-auto -mr-1 text-danger-700"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {directResult && (
        <div
          role="status"
          className="panel border-ok-100 bg-ok-50 px-3 py-2 flex items-center gap-2 flex-wrap"
        >
          <span className="text-[12px] text-ok-700">{directResult}</span>
          <button
            type="button"
            onClick={() => setDirectResult(null)}
            aria-label="Dismiss upload summary"
            className="btn btn-icon btn-ghost ml-auto -mr-1 text-ok-700"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {isLoading ? (
        view === 'grid' ? (
          <SkeletonCards count={8} />
        ) : (
          <div className="panel" aria-busy="true" aria-label="Loading media">
            <div className="px-4 py-2.5 rule-b">
              <Skeleton className="h-2.5 w-32" />
            </div>
            <SkeletonRows rows={8} />
          </div>
        )
      ) : error ? (
        <ErrorState
          title="Media library unavailable"
          detail="The media request failed."
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Images}
            title={total === 0 ? 'Corpus is empty' : 'No capture matches'}
            description={
              total === 0
                ? 'Ingest a field photograph to start visual analysis, geographic routing and vector indexing.'
                : 'Adjust the filters or clear the search to see the rest of the corpus.'
            }
            action={
              total === 0 ? (
                <button type="button" onClick={() => setUploadOpen(true)} className="btn btn-primary">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  Ingest capture
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setProjectFilter('');
                    setQuery('');
                  }}
                  className="btn btn-secondary"
                >
                  Reset filters
                </button>
              )
            }
          />
        </div>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((asset) => {
            const status = statusOf(asset);
            return (
              <li key={asset.id} className="panel group flex flex-col">
                <button
                  type="button"
                  onClick={() => setDetail(asset)}
                  aria-label={`Open delivery transformations for capture ${asset.id}`}
                  className="relative block aspect-[4/3] bg-sunken overflow-hidden text-left"
                >
                  {asset.cloudinary_url ? (
                    <img
                      src={asset.cloudinary_url}
                      alt={asset.description ?? 'Field capture'}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Images className="w-5 h-5 text-ink-3" aria-hidden="true" />
                    </span>
                  )}
                  <span className="absolute top-1.5 left-1.5">
                    <Chip className={status.chip}>{status.label}</Chip>
                  </span>
                </button>

                <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                  <p className="text-[12px] text-ink leading-snug line-clamp-2 min-h-[2.1em]">
                    {asset.description || humanizeToken(asset.activity) || 'Awaiting analysis'}
                  </p>
                  <p className="meta truncate">{projectName(asset.project_id) ?? 'unassigned'}</p>
                  <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                    <span className="meta">{relativeTime(asset.uploaded_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-1.5 rule-t mt-1">
                    <AssetId id={asset.id} className="flex-1" />
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(asset.id)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Delete capture ${asset.id}`}
                      className="btn btn-icon btn-ghost text-ink-3 hover:text-danger-600 hover:bg-danger-50"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        /* Dense table. Same data, ordered for auditing: position, offset from
           anchor, confidence, recency. This is the layout a reviewer exports
           from, and it fits 3x more rows on the same screen. */
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse">
            <caption className="sr-only">Captures with position, anchor offset and confidence</caption>
            <thead>
              <tr className="rule-b">
                <th scope="col" className="label px-3 py-2.5 w-[54px]">
                  <span className="sr-only">Preview</span>
                </th>
                <th scope="col" className="label px-2 py-2.5">Capture</th>
                <th scope="col" className="label px-2 py-2.5">State</th>
                <th scope="col" className="label px-2 py-2.5">Project</th>
                <th scope="col" className="label px-2 py-2.5 w-[136px]">Position</th>
                <th scope="col" className="label px-2 py-2.5 w-[80px] text-right">Offset</th>
                <th scope="col" className="label px-2 py-2.5 w-[104px]">Confidence</th>
                <th scope="col" className="label px-2 py-2.5 w-[88px] text-right">Ingested</th>
                <th scope="col" className="label px-2 py-2.5 w-[44px]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((asset) => {
                const status = statusOf(asset);
                return (
                  <tr key={asset.id} className="rule-b last:border-b-0 row-hover group">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setDetail(asset)}
                        aria-label={`Open transformations for ${asset.id}`}
                        className="block w-9 h-9 bg-sunken border border-line overflow-hidden"
                      >
                        {asset.cloudinary_url && (
                          <img
                            src={asset.cloudinary_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-2 max-w-[320px]">
                      <p className="text-[12px] text-ink truncate">
                        {asset.description || humanizeToken(asset.activity) || 'Awaiting analysis'}
                      </p>
                      <AssetId id={asset.id} />
                    </td>
                    <td className="px-2 py-2">
                      <Chip className={status.chip}>{status.label}</Chip>
                    </td>
                    <td className="px-2 py-2 max-w-[180px]">
                      <span className="text-[12px] text-ink-2 truncate block">
                        {projectName(asset.project_id) ?? 'unassigned'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="value text-[12px]">
                        {asset.location_match_distance != null
                          ? `${asset.location_match_distance.toFixed(2)}`
                          : '--'}
                      </span>
                      {asset.location_match_distance != null && (
                        <span className="label ml-0.5">km</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <ScoreReadout score={asset.routing_confidence} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="meta">{relativeTime(asset.uploaded_at)}</span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(asset.id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete capture ${asset.id}`}
                        className="btn btn-icon btn-ghost text-ink-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger-600"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        pending={uploadMutation.isPending}
        directPending={directUpload.isPending}
        signatureUnavailable={!signature.data}
        onUpload={(file, lat, lng) => {
          uploadMutation.mutate(
            lat != null && lng != null ? { file, latitude: lat, longitude: lng } : file,
            { onSuccess: () => setUploadOpen(false) },
          );
        }}
        onDirectUpload={(file) => {
          directUpload.mutate(file, { onSuccess: () => setUploadOpen(false) });
        }}
      />

      <TransformationDialog asset={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
