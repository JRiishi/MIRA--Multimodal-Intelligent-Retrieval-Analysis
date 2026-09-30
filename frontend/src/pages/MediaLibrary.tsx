import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  RefreshCw,
  Check,
  Trash2,
} from 'lucide-react';
import {
  useMediaLibrary,
  useAssetTransformations,
  useUploadMedia,
  useDeleteMedia,
} from '../hooks/media';
import { useProjects } from '../hooks/projects';
import { useUploadSignature, directUpload as directUploadToCdn, type UploadSignature } from '../hooks/upload';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Coordinate,
  Modal,
  SegmentedControl,
  Field,
} from '../components/ui';
import { humanizeToken, shortDate, statusOf } from '../lib/presentation';
import type { MediaAsset } from '../types';

type Filter = 'all' | 'exceptions' | 'ready' | 'geo';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'ALL CAPTURES' },
  { value: 'ready', label: 'VERIFIED' },
  { value: 'exceptions', label: 'EXCEPTIONS' },
  { value: 'geo', label: 'GEO-TAGGED' },
];

/* ------------------------------------------------------------------ */
/* Upload Dialog (Multi-Photo Batch Upload)                           */
/* ------------------------------------------------------------------ */

export function UploadDialog({
  open,
  onClose,
  signatureData,
  signatureUnavailable = false,
  initialLat,
  initialLng,
}: {
  open: boolean;
  onClose: () => void;
  signatureData?: UploadSignature | null;
  signatureUnavailable?: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
}) {
  const queryClient = useQueryClient();
  const uploadMutation = useUploadMedia();
  const [files, setFiles] = useState<File[]>([]);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentName: string;
    errors: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      if (initialLat != null && !isNaN(initialLat)) setLat(initialLat.toFixed(6));
      if (initialLng != null && !isNaN(initialLng)) setLng(initialLng.toFixed(6));
    }
  }, [open, initialLat, initialLng]);

  const [geoStatus, setGeoStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
    accuracy?: number;
  }>({ type: 'idle', message: '' });

  const latNum = lat.trim() === '' ? null : Number(lat);
  const lngNum = lng.trim() === '' ? null : Number(lng);
  const coordError =
    (latNum == null) !== (lngNum == null)
      ? 'Enter both coordinates or leave both blank to extract individual EXIF from each photograph.'
      : undefined;

  const totalBytes = useMemo(() => files.reduce((acc, f) => acc + f.size, 0), [files]);

  const filePreviews = useMemo(() => {
    return files.map((f, idx) => ({
      id: `${f.name}-${f.size}-${idx}`,
      file: f,
      url: URL.createObjectURL(f),
      sizeKb: Math.round(f.size / 1024),
    }));
  }, [files]);

  const close = () => {
    if (isUploading) return;
    setFiles([]);
    setFileStatuses({});
    setUploadProgress(null);
    setLat('');
    setLng('');
    setIsLocating(false);
    setGeoStatus({ type: 'idle', message: '' });
    onClose();
  };

  const addFiles = (newFiles: FileList | File[] | null) => {
    if (!newFiles) return;
    const array = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => {
      // deduplicate by name & size
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const filtered = array.filter((f) => !existing.has(`${f.name}-${f.size}`));
      return [...prev, ...filtered];
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchLiveLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus({
        type: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsLocating(true);
    setGeoStatus({ type: 'idle', message: '' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);

        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        setIsLocating(false);
        setGeoStatus({
          type: 'success',
          message: `Live GPS acquired (±${accuracy}m accuracy)`,
          accuracy,
        });
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Failed to fetch live location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied in browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS location unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        setGeoStatus({
          type: 'error',
          message: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const clearLocation = () => {
    setLat('');
    setLng('');
    setGeoStatus({ type: 'idle', message: '' });
  };

  const handleStartBatchUpload = async () => {
    if (files.length === 0 || coordError || isUploading) return;
    setIsUploading(true);

    const initialStatuses: Record<string, 'pending' | 'uploading' | 'success' | 'error'> = {};
    files.forEach((f) => {
      initialStatuses[f.name] = 'pending';
    });
    setFileStatuses(initialStatuses);

    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      setFileStatuses((prev) => ({ ...prev, [currentFile.name]: 'uploading' }));
      setUploadProgress({
        current: i + 1,
        total: files.length,
        currentName: currentFile.name,
        errors: errorCount,
      });

      try {
        if (signatureUnavailable || latNum != null || !signatureData) {
          await uploadMutation.mutateAsync({
            file: currentFile,
            latitude: latNum,
            longitude: lngNum,
          });
        } else {
          await directUploadToCdn(signatureData, currentFile);
        }
        setFileStatuses((prev) => ({ ...prev, [currentFile.name]: 'success' }));
      } catch (err) {
        errorCount++;
        setFileStatuses((prev) => ({ ...prev, [currentFile.name]: 'error' }));
      }
    }

    queryClient.invalidateQueries({ queryKey: ['media'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project'] });

    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(null);
      close();
    }, 1200);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Batch Photographic Ingestion"
      width="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="font-mono text-xs text-neutral-500">
            {files.length > 0 && (
              <span>
                {files.length} {files.length === 1 ? 'PHOTOGRAPH' : 'PHOTOGRAPHS'} (
                {Math.round(totalBytes / 1024)} KB)
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              disabled={isUploading}
              className="btn btn-secondary font-mono text-xs"
            >
              CANCEL
            </button>
            <button
              type="button"
              disabled={files.length === 0 || Boolean(coordError) || isUploading}
              onClick={handleStartBatchUpload}
              className="btn btn-primary font-mono text-xs"
            >
              {isUploading
                ? `UPLOADING ${uploadProgress?.current ?? 1}/${uploadProgress?.total ?? files.length}...`
                : files.length <= 1
                  ? 'UPLOAD MEDIA →'
                  : `UPLOAD ${files.length} CAPTURES →`}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Drag & Drop Multi-file Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10.5px] uppercase tracking-wider text-neutral-400 block">
              Field Photographs (Multi-Select Supported)
            </label>
            {files.length > 0 && !isUploading && (
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-[10px] font-mono text-neutral-500 hover:text-red-400 transition-colors uppercase"
              >
                CLEAR ALL
              </button>
            )}
          </div>

          <div
            className="relative border border-dashed border-white/[0.18] bg-[#080808] p-6 text-center hover:border-white/40 transition-colors"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addFiles(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
              <Upload className="w-6 h-6 text-neutral-400" />
              <div>
                <p className="text-xs font-medium text-white">
                  Click to select multiple photographs or drag & drop here
                </p>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  JPEG, PNG, WEBP. Select multiple files at once. EXIF GPS extracted per photograph.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Files Gallery List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10.5px] text-neutral-400 uppercase">
              <span>Selected Batch Queue ({files.length})</span>
              <span>Total: {Math.round(totalBytes / 1024)} kB</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 border border-white/[0.08] bg-black p-2 divide-y divide-white/[0.04]">
              {filePreviews.map((item, idx) => {
                const status = fileStatuses[item.file.name] || 'pending';
                return (
                  <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={item.url}
                        alt=""
                        className="w-9 h-9 object-cover border border-white/[0.1] bg-neutral-900 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs truncate">{item.file.name}</p>
                        <p className="text-[10px] text-neutral-500">{item.sizeKb} kB</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status === 'pending' && (
                        <span className="px-1.5 py-0.5 text-[9.5px] font-mono border border-white/20 text-neutral-400 uppercase">
                          QUEUED
                        </span>
                      )}
                      {status === 'uploading' && (
                        <span className="px-1.5 py-0.5 text-[9.5px] font-mono border border-[#ff6a00] text-[#ff6a00] uppercase flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>UPLOADING</span>
                        </span>
                      )}
                      {status === 'success' && (
                        <span className="px-1.5 py-0.5 text-[9.5px] font-mono border border-white/40 bg-white/[0.08] text-white uppercase flex items-center gap-1 font-bold">
                          <Check className="w-2.5 h-2.5 text-[#ff6a00]" />
                          <span>DONE</span>
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="px-1.5 py-0.5 text-[9.5px] font-mono border border-red-500/50 text-red-400 uppercase">
                          FAILED
                        </span>
                      )}

                      {!isUploading && (
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Upload Progress Bar */}
        {isUploading && uploadProgress && (
          <div className="space-y-2 p-3 bg-[#0a0a0a] border border-white/[0.1]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white font-medium">
                UPLOADING {uploadProgress.current} OF {uploadProgress.total}
              </span>
              <span className="text-[#ff6a00] font-bold">
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-900 border border-white/[0.1] overflow-hidden">
              <div
                className="h-full bg-[#ff6a00] transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-neutral-400 truncate">
              Active: {uploadProgress.currentName}
            </p>
          </div>
        )}

        {/* Spatial Coordinates Option */}
        <div className="space-y-2 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Spatial Coordinates (Optional Batch Override)
            </span>
            <div className="flex items-center gap-2">
              {(lat || lng) && (
                <button
                  type="button"
                  onClick={clearLocation}
                  disabled={isUploading}
                  className="text-[10px] font-mono text-neutral-500 hover:text-white transition-colors"
                >
                  CLEAR (USE INDIVIDUAL EXIF)
                </button>
              )}
              <button
                type="button"
                onClick={fetchLiveLocation}
                disabled={isLocating || isUploading}
                className="text-[10.5px] font-mono text-white hover:bg-white/[0.08] flex items-center gap-1.5 border border-white/[0.2] px-2 py-1 transition-all"
                title="Fetch live GPS coordinates from device"
              >
                {isLocating ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-[#ff6a00]" aria-hidden="true" />
                    <span>ACQUIRING GPS...</span>
                  </>
                ) : (
                  <span>FETCH GPS COORDINATES</span>
                )}
              </button>
            </div>
          </div>

          {geoStatus.type === 'success' && (
            <div className="p-2 border border-[#ff6a00]/30 bg-[#ff6a00]/10 text-[11px] font-mono text-[#ff6a00] flex items-center gap-2">
              <Check className="w-3 h-3 text-[#ff6a00]" aria-hidden="true" />
              <span>{geoStatus.message}</span>
            </div>
          )}

          {geoStatus.type === 'error' && (
            <div className="p-2 border border-red-500/20 text-[11px] font-mono text-red-400">
              {geoStatus.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" error={coordError}>
              {(p) => (
                <input
                  {...p}
                  type="number"
                  step="0.000001"
                  disabled={isUploading}
                  className="field"
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                    if (geoStatus.type !== 'idle') setGeoStatus({ type: 'idle', message: '' });
                  }}
                  placeholder="Leave empty for auto-EXIF"
                />
              )}
            </Field>
            <Field label="Longitude">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  step="0.000001"
                  disabled={isUploading}
                  className="field"
                  value={lng}
                  onChange={(e) => {
                    setLng(e.target.value);
                    if (geoStatus.type !== 'idle') setGeoStatus({ type: 'idle', message: '' });
                  }}
                  placeholder="Leave empty for auto-EXIF"
                />
              )}
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Transformation & Provenance Dialog                                 */
/* ------------------------------------------------------------------ */

type DetailTab = 'original' | 'provenance' | 'campaign';

function TransformationDialog({
  asset,
  onClose,
  onDelete,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onDelete?: (asset: MediaAsset) => void;
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
      title="Dynamic Image Delivery & Evidence"
      width="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(asset)}
                className="btn btn-danger font-mono text-xs"
              >
                DELETE CAPTURE
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary font-mono text-xs">
              CLOSE
            </button>
            {current && (
              <a
                href={current}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary font-mono text-xs"
              >
                OPEN CDN URL →
              </a>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <SegmentedControl<DetailTab>
          ariaLabel="Transformation view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'original', label: 'Optimized CDN' },
            { value: 'provenance', label: 'Provenance Badge' },
            { value: 'campaign', label: 'Campaign Aspects' },
          ]}
        />

        <div className="aspect-[16/10] flex items-center justify-center overflow-hidden bg-black border border-white/[0.08]">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : current ? (
            <img
              src={current}
              alt={`${tab} transformation`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs font-mono text-neutral-600">No delivery URL available</span>
          )}
        </div>

        {tab === 'campaign' && aspectUrls.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {aspectUrls.map((aspect) => (
              <a
                key={aspect.label}
                href={aspect.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-white/[0.08] hover:border-white/30 transition-colors"
              >
                <div className="aspect-square bg-black">
                  <img
                    src={aspect.url}
                    alt={`${aspect.label} export`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 border-t border-white/[0.08] text-center font-mono text-[10px] text-neutral-400">
                  {aspect.label}
                </div>
              </a>
            ))}
          </div>
        )}

        {current && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block mb-1">
              DYNAMIC CDN ENDPOINT
            </span>
            <code className="block p-2.5 bg-black border border-white/[0.08] font-mono text-[11px] break-all text-neutral-300 select-all">
              {current}
            </code>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Main MediaLibrary Component                                        */
/* ------------------------------------------------------------------ */

export default function MediaLibrary() {
  const { data: media, isLoading, error, refetch } = useMediaLibrary();
  const { data: projects } = useProjects();

  const [filter, setFilter] = useState<Filter>('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<MediaAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);

  const deleteMutation = useDeleteMedia();
  const signature = useUploadSignature(uploadOpen);

  const nameByProject = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p.name])),
    [projects],
  );

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
    <div className="p-6 sm:p-10 lg:p-14 space-y-12 max-w-6xl mx-auto">
      {/* Editorial Header */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
              02 // PHOTOGRAPHIC CORPUS
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mt-1">
              Media Library
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-neutral-400">
              <span className="text-white font-bold">{total}</span> ITEMS
            </span>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="btn btn-sm btn-primary font-mono text-xs"
            >
              UPLOAD MEDIA →
            </button>
          </div>
        </div>

        {/* Minimal Search & Filter Bar */}
        <div className="pt-6 border-t border-white/[0.08] space-y-4">
          <input
            id="media-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="⌕  Filter evidence by scene, activity tag, description, or project..."
            className="w-full bg-transparent text-[13px] text-white placeholder:text-neutral-500 outline-none pb-2 border-b border-white/[0.08] focus:border-[#ff6a00] transition-colors font-sans"
          />

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-4">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`transition-colors uppercase ${filter === f.value ? 'text-[#ff6a00] font-bold underline underline-offset-4' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {projects && projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-black text-neutral-300 border border-white/[0.12] px-2.5 py-1 text-xs outline-none"
              >
                <option value="">ALL PROJECTS</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* Media Gallery Masonry/Editorial Layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[16/10] bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load media"
          detail="Could not retrieve media assets from the backend."
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={query || filter !== 'all' ? 'No matching media' : 'No media uploaded yet'}
          description="Field photographs stream into the decision router for project assignment and evidence extraction."
          action={
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="btn btn-primary font-mono text-xs"
            >
              UPLOAD MEDIA →
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rows.map((asset) => {
            const s = statusOf(asset);
            const pName = asset.project_id ? nameByProject.get(asset.project_id) : null;

            return (
              <div key={asset.id} className="space-y-3 group">
                <div
                  className="relative aspect-[16/10] bg-black border border-white/[0.1] overflow-hidden cursor-pointer"
                  onClick={() => setDetail(asset)}
                >
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
                    {s.label}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[13.5px] text-white font-normal line-clamp-2 leading-snug">
                    {asset.description || humanizeToken(asset.activity)}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-neutral-500 pt-1">
                    {pName ? (
                      <span className="text-neutral-300 truncate max-w-[160px]">{pName}</span>
                    ) : (
                      <span className="text-[#ff6a00]">UNASSIGNED</span>
                    )}
                    <span>{shortDate(asset.uploaded_at)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs font-mono">
                    <Coordinate lat={asset.image_latitude} lng={asset.image_longitude} />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setDetail(asset)}
                        className="text-neutral-400 hover:text-white transition-colors"
                      >
                        INSPECT →
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssetToDelete(asset);
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

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        signatureData={signature.data}
        signatureUnavailable={!signature.data}
      />

      {/* Transformation & Provenance Modal */}
      <TransformationDialog
        key={detail?.id ?? 'none'}
        asset={detail}
        onClose={() => setDetail(null)}
        onDelete={(a) => setAssetToDelete(a)}
      />

      {/* Delete Confirmation Modal */}
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
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!assetToDelete) return;
                deleteMutation.mutate(assetToDelete.id, {
                  onSuccess: () => {
                    if (detail?.id === assetToDelete.id) {
                      setDetail(null);
                    }
                    setAssetToDelete(null);
                  },
                });
              }}
              className="btn btn-danger font-mono text-xs"
            >
              {deleteMutation.isPending ? 'DELETING...' : 'CONFIRM DELETE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {assetToDelete && (
            <div className="flex gap-4 items-start">
              {assetToDelete.cloudinary_url && (
                <img
                  src={assetToDelete.cloudinary_url}
                  alt=""
                  className="w-20 h-20 object-cover border border-white/[0.12] bg-black flex-shrink-0"
                />
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-mono text-white break-all">ID: {assetToDelete.id}</p>
                <p className="text-xs text-neutral-300 line-clamp-2">
                  {assetToDelete.description || humanizeToken(assetToDelete.activity)}
                </p>
                <p className="text-[11px] font-mono text-neutral-500">
                  Uploaded: {shortDate(assetToDelete.uploaded_at)}
                </p>
              </div>
            </div>
          )}
          <p className="text-xs text-neutral-400 leading-relaxed border-t border-white/[0.08] pt-3">
            Are you sure you want to permanently delete this media capture? This will remove the visual asset, AI description embeddings from vector index, and all associated project records.
          </p>
        </div>
      </Modal>
    </div>
  );
}
