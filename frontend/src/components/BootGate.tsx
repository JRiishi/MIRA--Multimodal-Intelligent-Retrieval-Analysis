import { useEffect, useState } from 'react';

/**
 * Boot gate.
 *
 * On a cold load the app has to do three things before anything is meaningful:
 * start the mock worker (development only), build the query client, and fetch
 * projects plus the media corpus. Rendering any of that half-formed produces a
 * flash of empty panels and a layout that jumps twice.
 *
 * This holds a deliberate, labelled progress readout until the two blocking
 * queries settle. It is a real wait indicator, not a decorative delay: the
 * minimum display time below exists only to stop it flickering on a fast cache
 * hit, and it is skipped entirely under reduced motion so assistive tech is
 * never held for animation.
 */
export default function BootGate({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const [minElapsed, setMinElapsed] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => setMinElapsed(true), 420);
    return () => window.clearTimeout(id);
  }, [reduced]);

  const showBoot = !ready || !minElapsed;

  if (!showBoot) return <>{children}</>;

  const phase = !minElapsed
    ? 'starting'
    : !ready
      ? 'indexing corpus'
      : 'ready';

  return (
    <div className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center gap-5 px-6">
      <div className="flex items-center gap-3">
        {/* Reticle mark, same geometry as the rail, rendered large. */}
        <span className="relative inline-flex items-center justify-center w-9 h-9" aria-hidden="true">
          <span
            className="absolute inset-0 border border-brand-400 rounded-[1px]"
            style={{ transform: 'rotate(45deg)' }}
          />
          <span className="w-1 h-1 bg-brand-500 rounded-[1px]" />
        </span>
        <div>
          <div className="font-label text-[15px] tracking-[0.2em] text-ink uppercase leading-none">
            Mira
          </div>
          <div className="font-mono text-[10px] text-ink-3 mt-1.5 leading-none">
            multimodal field intelligence
          </div>
        </div>
      </div>

      <div className="w-full max-w-[220px]">
        <div className="h-px w-full bg-line overflow-hidden relative">
          {reduced ? (
            <span className="absolute inset-0 bg-brand-500" />
          ) : (
            <span
              className="absolute inset-y-0 w-1/2 bg-brand-500 origin-left"
              style={{ animation: 'mira-indeterminate 1.1s cubic-bezier(0.65,0,0.35,1) infinite' }}
            />
          )}
        </div>
        <p className="label mt-2.5 text-center" role="status" aria-live="polite">
          {phase}
        </p>
      </div>

      {/* Screen-reader-only context: the visual line carries no information. */}
      <p className="sr-only">
        MIRA is loading the project index and media corpus. Content appears once both are ready.
      </p>
    </div>
  );
}
