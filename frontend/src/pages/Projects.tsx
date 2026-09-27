import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Trash2,
  MapPin,
  ScanSearch,
} from 'lucide-react';
import { useProjects, useCreateProject, useDeleteProject } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Modal,
  Field,
  Chip,
  Coordinate,
  Meter,
} from '../components/ui';
import { shortDate, humanizeToken } from '../lib/presentation';
import type { ProjectCreate } from '../types';

const BLANK: ProjectCreate = {
  name: '',
  description: '',
  tags: [],
  latitude: null,
  longitude: null,
  location_name: '',
};

/** Free-text search over name, description, location and tags. */
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
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof ProjectCreate>(key: K, value: ProjectCreate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const nameError = touched && !form.name.trim() ? 'A project name is required.' : undefined;
  const lat = form.latitude;
  const lng = form.longitude;
  const coordsIncomplete = (lat == null) !== (lng == null);
  const coordError =
    touched && coordsIncomplete ? 'Provide both latitude and longitude, or leave both empty.' : undefined;

  const close = () => {
    setForm(BLANK);
    setTouched(false);
    onClose();
  };

  const submit = () => {
    setTouched(true);
    if (!form.name.trim() || coordsIncomplete) return;
    onCreate({
      ...form,
      name: form.name.trim(),
      tags: (form.tags ?? [])
        .map((t) => t.trim())
        .filter(Boolean),
      latitude: lat ?? null,
      longitude: lng ?? null,
      location_name: form.location_name?.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New routing target"
      width="max-w-lg"
      footer={
        <>
          <button type="button" onClick={close} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="btn btn-primary"
          >
            {pending ? 'Creating' : 'Create target'}
          </button>
        </>
      }
    >
      <form
        className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Project name" error={nameError} className="sm:col-span-2">
          {(p) => (
            <input
              {...p}
              type="text"
              className="field"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Bhadla Solar Park Expansion"
            />
          )}
        </Field>

        <Field label="Location label" hint="Shown to reviewers during assignment" className="sm:col-span-2">
          {(p) => (
            <input
              {...p}
              type="text"
              className="field"
              value={form.location_name ?? ''}
              onChange={(e) => set('location_name', e.target.value)}
              placeholder="Bhadla, Rajasthan"
            />
          )}
        </Field>

        <Field label="Latitude" hint="Decimal degrees, -90 to 90" error={coordError}>
          {(p) => (
            <input
              {...p}
              type="number"
              step="0.0001"
              className="field value"
              value={form.latitude ?? ''}
              onChange={(e) => set('latitude', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="27.5412"
            />
          )}
        </Field>

        <Field label="Longitude" hint="Decimal degrees, -180 to 180">
          {(p) => (
            <input
              {...p}
              type="number"
              step="0.0001"
              className="field value"
              value={form.longitude ?? ''}
              onChange={(e) => set('longitude', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="72.2913"
            />
          )}
        </Field>

        <Field
          label="Description"
          hint="Scope of works. The router reads this when matching captures."
          className="sm:col-span-2"
        >
          {(p) => (
            <textarea
              {...p}
              rows={3}
              className="field resize-y"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Phase 2 ground-mount photovoltaic array across 1,200 hectares."
            />
          )}
        </Field>

        <Field label="Tags" hint="Comma separated" className="sm:col-span-2">
          {(p) => (
            <input
              {...p}
              type="text"
              className="field"
              value={(form.tags ?? []).join(', ')}
              onChange={(e) =>
                set(
                  'tags',
                  e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                )
              }
              placeholder="solar, renewable, civil"
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
    <div className="p-4 lg:p-6 space-y-4">
      <div className="panel px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <ScanSearch
            className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <input
            id="project-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, place, tag"
            className="field pl-8"
          />
        </div>

        <div className="sm:ml-auto flex items-center gap-2">
          <span className="meta">
            {rows.length} of {projects?.length ?? 0} shown
          </span>
          <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New target
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="panel" aria-busy="true" aria-label="Loading projects">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3.5 rule-b last:border-b-0 flex items-center gap-4">
              <Skeleton className="h-9 w-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2.5 w-2/3" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Projects unavailable"
          detail="The project request failed."
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={query ? Search : FolderKanban}
            title={query ? 'No target matches' : 'No routing targets yet'}
            description={
              query
                ? 'Loosen the filter or search a different place or tag.'
                : 'A project supplies the coordinate and criteria the routing engine needs to attribute a capture.'
            }
            action={
              query ? (
                <button type="button" onClick={() => setQuery('')} className="btn btn-secondary">
                  Clear filter
                </button>
              ) : (
                <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary">
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  New target
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <caption className="sr-only">Routing targets with evidence coverage</caption>
            <thead>
              <tr className="rule-b">
                <th scope="col" className="label px-4 py-2.5">Target</th>
                <th scope="col" className="label px-3 py-2.5">Anchor</th>
                <th scope="col" className="label px-3 py-2.5 w-[190px]">Verified</th>
                <th scope="col" className="label px-3 py-2.5 w-[92px] text-right">Created</th>
                <th scope="col" className="label px-3 py-2.5 w-[52px]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((project) => {
                const total = assetCount(project.id);
                const verified = verifiedCount(project.id);
                const share = total ? verified / total : 0;
                return (
                  <tr key={project.id} className="rule-b last:border-b-0 row-hover group">
                    <td className="px-4 py-3 align-top">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-[13.5px] font-medium text-ink hover:text-brand-700 transition-colors"
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="text-[12px] text-ink-2 mt-1 line-clamp-1 max-w-md">
                          {project.description}
                        </p>
                      )}
                      {project.tags.length > 0 && (
                        <ul className="flex flex-wrap gap-1 mt-1.5">
                          {project.tags.slice(0, 4).map((tag) => (
                            <li key={tag}>
                              <Chip>{humanizeToken(tag)}</Chip>
                            </li>
                          ))}
                          {project.tags.length > 4 && (
                            <li>
                              <Chip>+{project.tags.length - 4}</Chip>
                            </li>
                          )}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {project.location_name ? (
                        <span className="flex items-center gap-1 text-[12px] text-ink-2">
                          <MapPin className="w-3 h-3 text-ink-3 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{project.location_name}</span>
                        </span>
                      ) : (
                        <span className="meta">no anchor</span>
                      )}
                      {project.latitude != null && (
                        <Coordinate lat={project.latitude} lng={project.longitude} className="mt-0.5 block" />
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {total === 0 ? (
                        <span className="meta">no evidence</span>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span className="value text-[12px] font-semibold">{verified}</span>
                            <span className="meta">of {total}</span>
                          </div>
                          <div className="mt-1.5">
                            <Meter
                              value={share}
                              tone={share >= 0.6 ? 'ok' : share > 0 ? 'brand' : 'signal'}
                              label={`${project.name}: ${Math.round(share * 100)} percent verified`}
                            />
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <span className="meta">{shortDate(project.created_at)}</span>
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ id: project.id, name: project.name })}
                        aria-label={`Delete ${project.name}`}
                        className="btn btn-icon btn-ghost text-ink-3 hover:text-danger-600 hover:bg-danger-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        pending={createMutation.isPending}
        onCreate={(input) => {
          createMutation.mutate(input, { onSuccess: () => setCreateOpen(false) });
        }}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete routing target"
        width="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setPendingDelete(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!pendingDelete) return;
                deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
              }}
            >
              {deleteMutation.isPending ? 'Deleting' : 'Delete target'}
            </button>
          </>
        }
      >
        <div className="p-4 space-y-3">
          <p className="text-[13px] text-ink-2">
            <span className="value text-ink">{pendingDelete?.name}</span> will be removed. Captures
            attributed to it become unassigned and return to the review queue.
          </p>
          {pendingDelete && assetCount(pendingDelete.id) > 0 && (
            <div className="panel-sunken px-3 py-2">
              <span className="meta">
                {assetCount(pendingDelete.id)} capture
                {assetCount(pendingDelete.id) === 1 ? '' : 's'} will need reassignment
              </span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
