import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useProjects } from '../hooks/projects';
import { useGenerateProjectReport, useProjectTimeline } from '../hooks/chat';
import {
  EmptyState,
  ErrorState,
  AssetId,
} from '../components/ui';
import { humanizeToken, stamp, shortDate } from '../lib/presentation';

export default function Reports() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selection, setSelection] = useState('');

  const projectId =
    selection && projects?.some((p) => p.id === selection) ? selection : (projects?.[0]?.id ?? '');

  const reportMutation = useGenerateProjectReport(projectId);
  const { data: timeline } = useProjectTimeline(
    projectId || undefined,
  );
  const report = reportMutation.data;

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
    link.download = `mira-audit-report-${report.project_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (projectsLoading) {
    return (
      <div className="p-6 lg:p-12 space-y-8 max-w-6xl mx-auto" aria-busy="true" aria-label="Loading report">
        <div className="h-4 w-32 bg-white/[0.04] animate-pulse" />
        <div className="h-12 w-96 bg-white/[0.04] animate-pulse" />
        <div className="h-96 w-full bg-white/[0.03] animate-pulse" />
      </div>
    );
  }

  const isOnTrack = report?.current_status.startsWith('ON TRACK') ?? true;

  return (
    <div className="p-6 sm:p-10 lg:p-14 space-y-12 max-w-6xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Control Console */}
      <section className="space-y-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
              06 // AUDIT & GOVERNANCE
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mt-1">
              Executive Dossier
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              type="button"
              onClick={downloadJson}
              disabled={!report}
              className="btn btn-secondary font-mono text-xs"
            >
              EXPORT JSON
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!report}
              className="btn btn-primary font-mono text-xs"
            >
              PRINT / PDF →
            </button>
          </div>
        </div>

        {/* Target Workspace Selector */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center gap-4">
          <label htmlFor="report-target" className="text-xs font-mono uppercase tracking-widest text-neutral-400 flex-shrink-0">
            TARGET WORKSPACE:
          </label>
          <select
            id="report-target"
            value={projectId}
            onChange={(e) => setSelection(e.target.value)}
            className="field max-w-md text-xs font-mono"
          >
            {(projects?.length ?? 0) === 0 && <option value="">No projects defined</option>}
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {reportMutation.isError && (
        <ErrorState
          title="Report Generation Failed"
          detail="The audit request could not be completed for this project target."
          onRetry={() => reportMutation.mutate()}
        />
      )}

      {reportMutation.isPending ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3" aria-busy="true">
          <div className="w-5 h-5 border border-[#ff6a00] border-t-transparent animate-spin rounded-full" />
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Synthesizing evidence & generating audit record...
          </span>
        </div>
      ) : !report ? (
        <EmptyState
          title="Select a Target Project"
          description="Select a workspace project above to generate a verified impact and audit dossier."
        />
      ) : (
        <article className="space-y-12 print:space-y-8 report-document">
          {/* Dossier Header */}
          <header className="space-y-6 pt-6 border-t border-white/[0.08] print:border-black/20">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#ff6a00] print:text-black uppercase block mb-1 font-bold">
                  OFFICIAL AUDIT STATEMENT
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white print:text-black uppercase tracking-tight">
                  {report.project_name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 print:text-neutral-700 mt-2">
                  {report.location_name && (
                    <span className="text-neutral-200 print:text-black flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#ff6a00] print:text-black" />
                      <span>{report.location_name}</span>
                    </span>
                  )}
                  <span>SYNTHESIZED {stamp(report.generated_at)}</span>
                  <span>·</span>
                  <span>SCOPE: {report.project_id.slice(0, 12)}</span>
                </div>
              </div>

              <span
                className={`px-3 py-1 font-mono text-xs uppercase border ${
                  isOnTrack
                    ? 'border-white/40 bg-white/[0.06] text-white print:border-black print:text-black'
                    : 'border-[#ff6a00]/50 bg-[#ff6a00]/10 text-[#ff6a00] font-bold'
                }`}
              >
                {isOnTrack ? '● STATUS: ON TRACK' : '▲ STATUS: REVIEW REQUIRED'}
              </span>
            </div>

            {report.project_description && (
              <p className="text-[14px] text-neutral-200 print:text-neutral-800 leading-relaxed max-w-3xl font-light">
                {report.project_description}
              </p>
            )}

            {/* Readouts Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-white/[0.08] print:border-black/20 bg-[#080808]/60 print:bg-transparent p-4">
              <div>
                <div className="text-3xl font-bold font-sans text-white print:text-black font-mono">
                  {report.total_evidence_count}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 print:text-neutral-600 mt-1">
                  TOTAL EVIDENCE
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold font-sans text-white print:text-black font-mono">
                  {report.timeline_summary.length}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 print:text-neutral-600 mt-1">
                  MILESTONES LOGGED
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold font-sans text-white print:text-black font-mono">
                  {report.change_score != null ? `${(report.change_score * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff6a00] print:text-black mt-1 font-bold">
                  STRUCTURAL DELTA (SSIM)
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold font-sans text-white print:text-black font-mono">
                  {report.key_evidence.length}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 print:text-neutral-600 mt-1">
                  CITED PRIMARY CAPTURES
                </div>
              </div>
            </div>
          </header>

          {/* Section: Observation Statement */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] print:text-black font-bold">
              01 // FIELD OBSERVATION STATEMENT
            </h3>
            <div className="p-6 bg-[#0a0a0a] print:bg-transparent border border-white/[0.12] print:border-black/30 text-[14px] text-white print:text-black leading-relaxed max-w-3xl">
              {report.current_status}
            </div>
          </section>

          {/* Section: Progression Comparison */}
          {report.before_asset_url && report.after_asset_url && (
            <section className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] print:text-black font-bold">
                02 // VISUAL PROGRESSION ANCHOR
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="border border-white/[0.12] print:border-black/30 overflow-hidden bg-[#080808]">
                    <div className="p-2.5 border-b border-white/[0.08] print:border-black/20 text-xs font-mono text-neutral-300 print:text-black uppercase">
                      BASELINE ANCHOR
                    </div>
                    <div className="aspect-[16/10] bg-black">
                      <img src={report.before_asset_url} alt="Baseline capture" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="border border-white/[0.12] print:border-black/30 overflow-hidden bg-[#080808]">
                    <div className="p-2.5 border-b border-white/[0.08] print:border-black/20 text-xs font-mono text-[#ff6a00] print:text-black uppercase font-bold">
                      CURRENT CAPTURE
                    </div>
                    <div className="aspect-[16/10] bg-black">
                      <img src={report.after_asset_url} alt="Current capture" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
              {report.before_after_summary && (
                <p className="text-[13px] text-neutral-300 print:text-neutral-800 mt-2 font-mono leading-relaxed">
                  {report.before_after_summary}
                </p>
              )}
            </section>
          )}

          {/* Section: Key Cited Evidence */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] print:text-black font-bold">
              03 // CITED PRIMARY EVIDENCE ({report.key_evidence.length})
            </h3>
            {report.key_evidence.length === 0 ? (
              <p className="text-xs font-mono text-neutral-400 print:text-neutral-600">No primary evidence captures cited in this synthesis.</p>
            ) : (
              <div className="border-t border-white/[0.08] print:border-black/20 divide-y divide-white/[0.08] print:divide-black/20">
                {report.key_evidence.map((item, index) => (
                  <div key={item.asset_id} className="py-4 px-2 flex items-start gap-6 hover:bg-white/[0.015] transition-colors">
                    <span className="font-mono text-xs text-neutral-400 print:text-neutral-600 w-8 pt-1">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <img
                      src={item.cloudinary_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 object-cover border border-white/[0.12] print:border-black/20 bg-black flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[13.5px] text-white print:text-black leading-snug font-normal">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 print:text-neutral-700">
                        {item.activity && <span>ACTIVITY: {humanizeToken(item.activity)}</span>}
                        {item.timestamp && <span>{shortDate(item.timestamp)}</span>}
                        <AssetId id={item.asset_id} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Milestone Chronology */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#ff6a00] print:text-black font-bold">
              04 // MILESTONE ACTIVITY CHRONOLOGY
            </h3>
            {(timeline?.length ?? 0) === 0 ? (
              <p className="text-xs font-mono text-neutral-400 print:text-neutral-600">No milestones logged.</p>
            ) : (
              <div className="border-t border-white/[0.08] print:border-black/20 divide-y divide-white/[0.08] print:divide-black/20">
                {timeline?.map((item, index) => (
                  <div key={item.asset_id ?? index} className="py-4 px-2 flex items-baseline gap-6">
                    <span className="font-mono text-xs text-neutral-400 print:text-neutral-600 w-24 flex-shrink-0">
                      {shortDate(item.date)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white print:text-black font-medium uppercase font-mono">{humanizeToken(item.activity)}</span>
                      {item.description && (
                        <p className="text-xs text-neutral-300 print:text-neutral-800 mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Dossier Footer */}
          <footer className="pt-8 border-t border-white/[0.08] print:border-black/20 flex items-center justify-between text-xs font-mono text-neutral-400 print:text-neutral-600">
            <span>OFFICIAL MIRA VERIFICATION DOSSIER</span>
            <span>TARGET UUID: {report.project_id}</span>
          </footer>
        </article>
      )}
    </div>
  );
}
