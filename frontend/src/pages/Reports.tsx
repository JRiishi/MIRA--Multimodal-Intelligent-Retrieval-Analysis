import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Download, Printer, MapPin, Images, GitCompare } from 'lucide-react';
import { useProjects } from '../hooks/projects';
import { useGenerateProjectReport, useProjectTimeline } from '../hooks/chat';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  PanelHeader,
  Chip,
  ScoreReadout,
} from '../components/ui';
import { humanizeToken, stamp, shortDate } from '../lib/presentation';

export default function Reports() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selection, setSelection] = useState('');

  // Derived rather than stored, so the page never renders empty on arrival and
  // avoids a setState-in-effect cascade.
  const projectId =
    selection && projects?.some((p) => p.id === selection) ? selection : (projects?.[0]?.id ?? '');

  const reportMutation = useGenerateProjectReport(projectId);
  const { data: timeline, isLoading: timelineLoading } = useProjectTimeline(
    projectId || undefined,
  );
  const report = reportMutation.data;

  /**
   * Health is derived from signals this app controls, never parsed out of the
   * backend's prose. `current_status` is free text shaped like
   * "Active - observed '<activity>' on <date> (...)" and is shown verbatim.
   */
  const derived = useMemo(() => {
    if (!report) return null;
    const evidence = report.total_evidence_count;
    const cited = report.key_evidence.length;
    const hasProgression = report.before_asset_url != null && report.after_asset_url != null;
    const sparse = evidence === 0;
    const lowCitation = evidence > 0 && cited / evidence < 0.5;
    const noProgression = evidence >= 2 && !hasProgression;

    const level = sparse ? 'insufficient' : lowCitation ? 'thin' : noProgression ? 'partial' : 'solid';
    const note =
      level === 'insufficient'
        ? 'No described evidence has been routed to this target.'
        : level === 'thin'
          ? `Only ${cited} of ${evidence} captures are cited in this report.`
          : level === 'partial'
            ? 'Enough evidence to report, but no visual progression pair is available yet.'
            : `${evidence} captures cited with a comparable baseline and current pair.`;

    return { level, note, cited, evidence, hasProgression };
  }, [report]);

  // The endpoint is a POST, so it is a mutation. The ref guard stops
  // StrictMode's double effect invocation from requesting twice.
  const requested = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId) return;
    if (requested.current === projectId) return;
    requested.current = projectId;
    reportMutation.mutate();
  }, [projectId, reportMutation]);

  const downloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mira-report-${report.project_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (projectsLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-4" aria-busy="true" aria-label="Loading report">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const onTrack = derived?.level === 'solid';
  const citationShare = report
    ? Math.min(1, report.key_evidence.length / Math.max(report.total_evidence_count, 1))
    : 0;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Target selector */}
      <div className="panel px-4 py-3 flex flex-col sm:flex-row sm:items-end gap-3 no-print">
        <div className="flex-1 min-w-0">
          <label htmlFor="report-target" className="label block mb-1.5">
            Audit target
          </label>
          <select
            id="report-target"
            value={projectId}
            onChange={(e) => setSelection(e.target.value)}
            className="field"
          >
            {(projects?.length ?? 0) === 0 && <option value="">no targets defined</option>}
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadJson}
            disabled={!report}
            className="btn btn-secondary"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!report}
            className="btn btn-primary"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      {reportMutation.isError && (
        <ErrorState
          title="Report could not be generated"
          detail="The audit request failed for this target."
        />
      )}

      {reportMutation.isPending ? (
        <div className="panel p-16 flex flex-col items-center gap-3" aria-busy="true">
          <span
            className="w-4 h-4 border-2 border-line-strong border-t-brand-600 rounded-full animate-spin"
            aria-hidden="true"
          />
          <span className="label">Synthesising evidence</span>
        </div>
      ) : !report ? (
        <div className="panel">
          <EmptyState
            icon={FileText}
            title={projects?.length ? 'Select a target' : 'No audit targets'}
            description={
              projects?.length
                ? 'Choose a project to synthesise its evidence into an impact and audit report.'
                : 'A report is generated from routed evidence, so a project has to exist first.'
            }
          />
        </div>
      ) : (
        <article className="space-y-4">
          {/* Document header */}
          <header className="panel px-5 py-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="min-w-0">
                <span className="label">Impact and audit report</span>
                <h2 className="text-[22px] font-semibold tracking-tight text-ink mt-1.5 leading-tight">
                  {report.project_name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
                  {report.location_name && (
                    <span className="flex items-center gap-1.5 text-[12px] text-ink-2">
                      <MapPin className="w-3 h-3 text-ink-3" aria-hidden="true" />
                      {report.location_name}
                    </span>
                  )}
                  <span className="meta">generated {stamp(report.generated_at)}</span>
                </div>
                {report.project_description && (
                  <p className="text-[13px] text-ink-2 leading-relaxed mt-3 max-w-3xl">
                    {report.project_description}
                  </p>
                )}
              </div>
              <Chip
                className={
                  derived?.level === 'solid'
                    ? 'chip-ok'
                    : derived?.level === 'insufficient'
                      ? 'chip-neutral'
                      : 'chip-caution'
                }
                title="Derived from citation density and progression availability"
              >
                {derived?.level === 'solid'
                  ? 'well evidenced'
                  : derived?.level === 'insufficient'
                    ? 'no evidence'
                    : derived?.level === 'thin'
                      ? 'thin citation'
                      : 'partial'}
              </Chip>
            </div>
          </header>

          {/* Readouts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="panel px-4 py-3.5">
              <span className="label">Evidence items</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="value text-[26px] font-semibold leading-none">
                  {report.total_evidence_count}
                </span>
                <Images className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
              </div>
            </div>
            <div className="panel px-4 py-3.5">
              <span className="label">Timeline entries</span>
              <div className="value text-[26px] font-semibold leading-none mt-2">
                {report.timeline_summary.length}
              </div>
            </div>
            <div className="panel px-4 py-3.5">
              <span className="label">Change score</span>
              <div className="value text-[26px] font-semibold leading-none mt-2">
                {report.change_score != null ? report.change_score.toFixed(3) : 'n/a'}
              </div>
            </div>
            <div className="panel px-4 py-3.5">
              <span className="label">Citation density</span>
              <div className="mt-2">
                <ScoreReadout score={citationShare} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="panel">
              <PanelHeader
                title="Latest observation"
                meta="verbatim from the report generator"
              />
              <div className="p-4 space-y-3">
                <p className="text-[13px] text-ink-2 leading-relaxed font-mono text-[12px] break-words">
                  {report.current_status}
                </p>

                <div className="rule-t pt-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="label">Latest activity</span>
                    <span className="value text-[12px] text-ink-2 text-right">
                      {report.recent_activity && report.recent_activity !== 'None'
                        ? humanizeToken(report.recent_activity)
                        : 'none recorded'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="label">Evidence quality</span>
                    <span
                      className={`value text-[12px] text-right ${
                        onTrack ? 'text-ok-600' : 'text-caution-600'
                      }`}
                    >
                      {derived?.note}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Structural progression */}
            <section className="panel">
              <PanelHeader
                title="Structural progression"
                meta={
                  report.change_score != null
                    ? `SSIM change score ${report.change_score.toFixed(3)}`
                    : 'insufficient evidence'
                }
              />
              {report.before_asset_url && report.after_asset_url ? (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <figure>
                      <div className="aspect-[4/3] bg-sunken border border-line overflow-hidden">
                        <img
                          src={report.before_asset_url}
                          alt="Baseline capture"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <figcaption className="label mt-1.5">Baseline</figcaption>
                    </figure>
                    <figure>
                      <div className="aspect-[4/3] bg-sunken border border-line overflow-hidden">
                        <img
                          src={report.after_asset_url}
                          alt="Most recent capture"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <figcaption className="label mt-1.5">Current</figcaption>
                    </figure>
                  </div>
                  {report.before_after_summary && (
                    <p className="text-[12.5px] text-ink-2 leading-relaxed flex items-start gap-2">
                      <GitCompare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-ink-3" aria-hidden="true" />
                      {report.before_after_summary}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-[12.5px] text-ink-3 leading-relaxed">
                    At least two dated captures are required before visual progression can be
                    computed for this target.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Cited evidence */}
          <section className="panel">
            <PanelHeader
              title="Cited evidence"
              meta="every claim in this report traces to a capture below"
            />
            {report.key_evidence.length === 0 ? (
              <EmptyState
                icon={Images}
                title="No cited evidence"
                description="Nothing has been routed to this target yet."
              />
            ) : (
              <ul>
                {report.key_evidence.map((item, index) => (
                  <li
                    key={item.asset_id}
                    className="flex gap-3.5 px-4 py-3 rule-b last:border-b-0"
                  >
                    <span className="value text-[11px] text-ink-3 w-6 flex-shrink-0 pt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <img
                      src={item.cloudinary_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 object-cover border border-line bg-sunken flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-ink-2 leading-relaxed">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        {item.activity && <Chip>{humanizeToken(item.activity)}</Chip>}
                        {item.location && <span className="meta">{item.location}</span>}
                        {item.timestamp && (
                          <span className="meta">{shortDate(item.timestamp)}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Timeline */}
          <section className="panel">
            <PanelHeader
              title="Evidence timeline"
              meta={timelineLoading ? 'loading' : `${timeline?.length ?? 0} entries`}
            />
            {(timeline?.length ?? 0) === 0 ? (
              <EmptyState icon={FileText} title="No timeline entries" />
            ) : (
              <ol className="px-4 py-4">
                {timeline?.map((item, index) => (
                  <li key={item.asset_id ?? index} className="flex gap-3.5 pb-4 last:pb-0">
                    <div className="flex flex-col items-center flex-shrink-0 w-[68px]">
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
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.activity && <Chip className="chip-brand">{humanizeToken(item.activity)}</Chip>}
                        {item.location && <span className="meta">{item.location}</span>}
                      </div>
                      {item.description && (
                        <p className="text-[12.5px] text-ink-2 leading-relaxed mt-1.5">
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
                        className="w-16 h-16 object-cover border border-line bg-sunken flex-shrink-0"
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <footer className="panel px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="label">Provenance</span>
            <span className="meta">
              generated by MIRA from {report.total_evidence_count} routed capture
              {report.total_evidence_count === 1 ? '' : 's'}
            </span>
            <span className="meta ml-auto">{report.project_id}</span>
          </footer>
        </article>
      )}
    </div>
  );
}
