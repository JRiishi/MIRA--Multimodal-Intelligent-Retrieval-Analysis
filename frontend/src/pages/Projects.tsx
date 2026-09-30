import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  MapPin,
  RefreshCw,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useProjects, useCreateProject, useDeleteProject } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import {
  EmptyState,
  ErrorState,
  Modal,
  Field,
  Coordinate,
} from '../components/ui';
import { shortDate } from '../lib/presentation';
import type { ProjectCreate } from '../types';

const BLANK: ProjectCreate = {
  name: '',
  description: '',
  tags: [],
  latitude: null,
  longitude: null,
  location_name: '',
};

function matches(query: string, fields: (string | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function CreateProjectDialog({
  open,
  onClose,
  onCreate,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: ProjectCreate) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<ProjectCreate>(BLANK);
  const [latStr, setLatStr] = useState('');
  const [lngStr, setLngStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoStatus, setGeoStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
    accuracy?: number;
  }>({ type: 'idle', message: '' });

  const set = <K extends keyof ProjectCreate>(key: K, value: ProjectCreate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const latNum = latStr.trim() === '' ? null : Number(latStr);
  const lngNum = lngStr.trim() === '' ? null : Number(lngStr);
  const coordsIncomplete = (latNum == null) !== (lngNum == null);
  const coordError =
    touched && coordsIncomplete
      ? 'Provide both latitude and longitude, or leave both empty.'
      : undefined;

  const nameError = touched && !form.name.trim() ? 'A project name is required.' : undefined;

  const close = () => {
    setForm(BLANK);
    setLatStr('');
    setLngStr('');
    setTagsStr('');
    setTouched(false);
    setIsLocating(false);
    setGeoStatus({ type: 'idle', message: '' });
    onClose();
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

        setLatStr(latitude.toFixed(6));
        setLngStr(longitude.toFixed(6));
        set('latitude', Number(latitude.toFixed(6)));
        set('longitude', Number(longitude.toFixed(6)));
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
          msg = 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS / Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location acquisition timed out. Please try again.';
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
    setLatStr('');
    setLngStr('');
    set('latitude', null);
    set('longitude', null);
    setGeoStatus({ type: 'idle', message: '' });
  };

  const submit = () => {
    setTouched(true);
    if (!form.name.trim() || coordsIncomplete) return;

    const parsedTags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onCreate({
      ...form,
      name: form.name.trim(),
      tags: parsedTags,
      latitude: latNum,
      longitude: lngNum,
      location_name: form.location_name?.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create Project Workspace"
      width="max-w-lg"
      footer={
        <>
          <button type="button" onClick={close} className="btn btn-secondary font-mono text-xs">
            CANCEL
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="btn btn-primary font-mono text-xs"
          >
            {pending ? 'CREATING...' : 'CREATE PROJECT →'}
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Project Name" error={nameError}>
          {(p) => (
            <input
              {...p}
              type="text"
              className="field"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Mayur Vihar Road Development"
            />
          )}
        </Field>

        <Field label="Location Name" hint="Descriptive regional name (e.g. city, district, site)">
          {(p) => (
            <input
              {...p}
              type="text"
              className="field"
              value={form.location_name ?? ''}
              onChange={(e) => set('location_name', e.target.value)}
              placeholder="e.g. Mayur Vihar Phase 1, Delhi"
            />
          )}
        </Field>

        {/* GPS Coordinates Section with Live Fetch */}
        <div className="space-y-2 pt-2 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Spatial Geofence Coordinates
            </span>
            <div className="flex items-center gap-2">
              {(latStr || lngStr) && (
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-[10px] font-mono text-neutral-500 hover:text-white transition-colors"
                >
                  CLEAR
                </button>
              )}
              <button
                type="button"
                onClick={fetchLiveLocation}
                disabled={isLocating || pending}
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
            <div className="flex items-center gap-1.5 p-2 bg-[#ff6a00]/10 border border-[#ff6a00]/30 text-[11px] font-mono text-[#ff6a00]">
              <Check className="w-3 h-3 text-[#ff6a00]" aria-hidden="true" />
              <span>{geoStatus.message}</span>
            </div>
          )}

          {geoStatus.type === 'error' && (
            <div className="p-2 border border-red-500/20 text-[11px] font-mono text-red-400">
              {geoStatus.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label="Latitude" hint="-90 to 90" error={coordError}>
              {(p) => (
                <input
                  {...p}
                  type="number"
                  step="0.000001"
                  className="field"
                  value={latStr}
                  onChange={(e) => {
                    setLatStr(e.target.value);
                    if (geoStatus.type !== 'idle') setGeoStatus({ type: 'idle', message: '' });
                  }}
                  placeholder="28.6010"
                />
              )}
            </Field>
            <Field label="Longitude" hint="-180 to 180">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  step="0.000001"
                  className="field"
                  value={lngStr}
                  onChange={(e) => {
                    setLngStr(e.target.value);
                    if (geoStatus.type !== 'idle') setGeoStatus({ type: 'idle', message: '' });
                  }}
                  placeholder="77.2990"
                />
              )}
            </Field>
          </div>
        </div>

        <Field
          label="Project Scope & Visual Context"
          hint="AI decision router matches scene visual content against this description"
        >
          {(p) => (
            <textarea
              {...p}
              rows={3}
              className="field resize-y"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Urban road resurfacing, asphalt paving, drainage trenches, and heavy machinery."
            />
          )}
        </Field>

        <Field label="Activity Tags" hint="Comma-separated keywords for filtering">
          {(p) => (
            <input
              {...p}
              type="text"
              className="field"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. road, asphalt, excavation, infrastructure"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

export default function Projects() {
  const { data: projects, isLoading, error, refetch } = useProjects();
  const { data: media } = useMediaLibrary();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const rows = (projects ?? []).filter((p) =>
    matches(query, [p.name, p.description, p.location_name, ...p.tags]),
  );

  const assetCount = (projectId: string) =>
    (media ?? []).filter((a) => a.project_id === projectId).length;
  const verifiedCount = (projectId: string) =>
    (media ?? []).filter((a) => a.project_id === projectId && a.processing_status === 'READY').length;

  return (
    <div className="p-6 sm:p-10 lg:p-14 space-y-12 max-w-6xl mx-auto">
      {/* Editorial Header */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
              01 // TARGET WORKSPACES
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mt-1">
              Projects
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="btn btn-sm btn-primary font-mono text-xs"
          >
            CREATE PROJECT →
          </button>
        </div>

        {/* Minimal Search Line */}
        <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between gap-4">
          <input
            id="project-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="⌕  Filter projects by name, place, or tag..."
            className="w-full bg-transparent text-[13px] text-white placeholder:text-neutral-500 outline-none pb-2 border-b border-white/[0.08] focus:border-[#ff6a00] transition-colors font-sans"
          />
          <span className="text-[11px] font-mono text-neutral-500 flex-shrink-0">
            {rows.length} OF {projects?.length ?? 0}
          </span>
        </div>
      </section>

      {/* Projects Directory List */}
      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/[0.02] border-b border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load project targets"
          detail="Could not retrieve workspace list from backend."
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={query ? 'No matching projects' : 'No project workspaces yet'}
          description={
            query
              ? 'Try a different search term or clear the filter.'
              : 'Create a project with GPS coordinates to activate automated AI vision routing and evidence tracking.'
          }
          action={
            query ? (
              <button type="button" onClick={() => setQuery('')} className="btn btn-secondary font-mono text-xs">
                CLEAR FILTER
              </button>
            ) : (
              <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary font-mono text-xs">
                CREATE PROJECT →
              </button>
            )
          }
        />
      ) : (
        <div className="border-t border-white/[0.08] divide-y divide-white/[0.08]">
          {rows.map((project, idx) => {
            const total = assetCount(project.id);
            const verified = verifiedCount(project.id);

            return (
              <div
                key={project.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between py-6 px-2 hover:bg-white/[0.015] transition-colors gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <span className="font-mono text-xs text-neutral-600 mt-1">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-2xl font-bold uppercase tracking-tight text-white group-hover:text-[#ff6a00] transition-colors"
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-[13px] text-neutral-400 mt-1 line-clamp-2 max-w-2xl leading-relaxed">
                        {project.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 font-mono mt-2">
                      {project.location_name && (
                        <span className="flex items-center gap-1 text-neutral-400">
                          <MapPin className="w-3 h-3 text-[#ff6a00]" />
                          <span>{project.location_name}</span>
                        </span>
                      )}
                      <Coordinate lat={project.latitude} lng={project.longitude} />
                      {project.created_at && (
                        <span>Created {shortDate(project.created_at)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0 self-end sm:self-center">
                  <div className="text-right font-mono text-xs text-neutral-400">
                    <div><span className="text-white font-medium">{total}</span> CAPTURES</div>
                    <div className="text-[11px] text-neutral-500">{verified} VERIFIED</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPendingDelete({ id: project.id, name: project.name })}
                    className="p-1.5 text-neutral-600 hover:text-red-400 transition-colors"
                    aria-label={`Delete ${project.name}`}
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link
                    to={`/projects/${project.id}`}
                    className="p-1.5 text-neutral-500 group-hover:text-[#ff6a00] group-hover:translate-x-1 transition-all"
                    aria-label={`Open ${project.name}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: Create Project */}
      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => {
          createMutation.mutate(input, {
            onSuccess: () => setCreateOpen(false),
          });
        }}
        pending={createMutation.isPending}
      />

      {/* Dialog: Delete Confirmation */}
      <Modal
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Delete Project Workspace"
        width="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="btn btn-secondary font-mono text-xs"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingDelete) {
                  deleteMutation.mutate(pendingDelete.id, {
                    onSuccess: () => setPendingDelete(null),
                  });
                }
              }}
              disabled={deleteMutation.isPending}
              className="btn btn-danger font-mono text-xs"
            >
              {deleteMutation.isPending ? 'DELETING...' : 'CONFIRM DELETE'}
            </button>
          </>
        }
      >
        <div className="space-y-2 text-[13.5px] text-neutral-300">
          <p>
            Are you sure you want to delete <strong className="text-white font-medium">{pendingDelete?.name}</strong>?
          </p>
          <p className="text-xs text-neutral-500 font-mono">
            Associated media captures will not be destroyed; they will be unlinked and moved to the Triage Review Queue.
          </p>
        </div>
      </Modal>
    </div>
  );
}
