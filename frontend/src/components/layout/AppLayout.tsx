import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, RefreshCw, Check, Command } from 'lucide-react';
import { clsx } from 'clsx';
import { navigation } from './navigation';
import { useProjects } from '../../hooks/projects';
import { useMediaLibrary } from '../../hooks/media';
import { statusOf } from '../../lib/presentation';
import AmbientField from '../AmbientField';
import CommandPalette from '../CommandPalette';
import RefetchBar from '../RefetchBar';

/** Geometric reticle mark. Built from primitives, not an imported glyph. */
function Mark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 border border-brand-300/70 rounded-[1px]"
        style={{ transform: 'rotate(45deg)' }}
      />
      <span className="w-[3px] h-[3px] bg-brand-300 rounded-[1px]" />
    </span>
  );
}

function RailNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-control)] transition-colors duration-100',
              isActive
                ? 'bg-rail-3 text-rail-ink'
                : 'text-rail-ink-2 hover:bg-rail-2 hover:text-rail-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Active marker is a shape, not a coloured dot. */}
              <span
                className={clsx(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4',
                  isActive ? 'bg-brand-300' : 'bg-transparent',
                )}
                aria-hidden="true"
              />
              <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-medium leading-none truncate">{item.name}</span>
              {isActive && <span className="sr-only">(current page)</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const { data: projects } = useProjects();
  const { data: media, isFetching, refetch } = useMediaLibrary();

  // Close the drawer on navigation. Adjusting during render avoids a
  // cascading extra render.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !menuOpen) toggleRef.current?.focus();
    wasOpenRef.current = menuOpen;
  }, [menuOpen]);

  const assets = media ?? [];
  const ready = assets.filter((a) => a.processing_status === 'READY').length;
  const review = assets.filter((a) => statusOf(a).needsHuman).length;
  const active = navigation.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="flex h-[100dvh] bg-canvas overflow-hidden">
      <AmbientField />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* Instrument rail */}
      <aside
        aria-label="Primary"
        className="hidden md:flex w-[212px] flex-shrink-0 bg-rail flex-col z-[var(--z-rail)]"
      >
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-rail-2 flex-shrink-0">
          <Mark />
          <div className="min-w-0">
            <div className="font-label text-[13px] tracking-[0.16em] text-rail-ink uppercase leading-none">
              Mira
            </div>
            <div className="font-mono text-[9px] text-rail-ink-2/70 tracking-[0.08em] mt-1 leading-none">
              field intelligence
            </div>
          </div>
        </div>

        <RailNav />

        <div className="px-4 py-3 border-t border-rail-2 flex-shrink-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-label text-[9px] uppercase tracking-[0.16em] text-rail-ink-2/60">
              Corpus
            </span>
            <span className="font-mono text-[10px] text-rail-ink-2 tabular-nums">
              {assets.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label text-[9px] uppercase tracking-[0.16em] text-rail-ink-2/60">
              Targets
            </span>
            <span className="font-mono text-[10px] text-rail-ink-2 tabular-nums">
              {projects?.length ?? 0}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)] md:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-[248px] max-w-[82vw] bg-rail flex flex-col"
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-rail-2 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Mark size={20} />
                <span className="font-label text-[13px] tracking-[0.16em] text-rail-ink uppercase">
                  Mira
                </span>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 -mr-1.5 rounded-[var(--radius-control)] text-rail-ink-2 hover:bg-rail-3 hover:text-rail-ink transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <RailNav onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Workspace. z-10 lifts content above the fixed AmbientField canvas. */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Status strip: real operational state, not a decorative header. */}
        <header className="h-14 flex-shrink-0 bg-surface/92 backdrop-blur-[2px] border-b border-line flex items-center gap-3 px-4 z-[var(--z-strip)] no-print relative">
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label="Open navigation"
            className="md:hidden btn btn-icon btn-ghost -ml-1"
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 flex items-baseline gap-2.5">
            <h1 className="font-label text-[13px] uppercase tracking-[0.14em] text-ink truncate">
              {active?.name ?? 'Not found'}
            </h1>
            <span className="label hidden sm:inline truncate">{active?.hint}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <dl className="hidden sm:flex items-center gap-4 pr-3 mr-1 border-r border-line">
              <div className="flex items-center gap-1.5">
                <dt className="label">Ready</dt>
                <dd className="value text-[12px] font-semibold text-ok-600">{ready}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="label">Queue</dt>
                <dd
                  className={clsx(
                    'value text-[12px] font-semibold',
                    review > 0 ? 'text-signal-700' : 'text-ink-3',
                  )}
                >
                  {review}
                </dd>
              </div>
            </dl>

            {/* Command palette is the primary fast path, so it is discoverable
                here rather than hidden in a menu. */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="btn btn-sm btn-secondary hidden md:inline-flex"
              aria-label="Open command palette"
            >
              <Command className="w-3 h-3" aria-hidden="true" />
              <span className="label">Jump</span>
              <kbd className="label border border-line rounded-[2px] px-1 ml-0.5">K</kbd>
            </button>

            <button
              type="button"
              onClick={() => void refetch()}
              className="btn btn-sm btn-secondary"
              aria-label="Refresh corpus"
            >
              {isFetching ? (
                <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="w-3 h-3" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto print-reset relative">
          <RefetchBar />
          {/* Keyed on pathname so each view animates in once, rather than
              replaying on every unrelated re-render. */}
          <div key={location.pathname} className="anim-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
