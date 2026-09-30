import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, RefreshCw, Command } from 'lucide-react';
import { clsx } from 'clsx';
import { navigation } from './navigation';
import { useMediaLibrary } from '../../hooks/media';
import { statusOf } from '../../lib/presentation';
import AmbientField from '../AmbientField';
import CommandPalette from '../CommandPalette';
import RefetchBar from '../RefetchBar';

/** Architectural Minimalist MIRA Emblem */
function MiraLogo({ size = 18 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="w-full h-full border border-white/60 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-[#ff6a00]" />
      </div>
    </div>
  );
}

function RailNav({ reviewCount = 0, onNavigate }: { reviewCount?: number; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main Navigation" className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
      <div className="text-[9.5px] font-mono tracking-widest text-neutral-500 uppercase mb-3 px-3">
        SYSTEM // WORKSPACE
      </div>
      {navigation.map((item) => {
        const isReview = item.to === '/review';
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'group flex items-center justify-between px-3 py-2.5 transition-colors text-[12px] font-mono tracking-tight',
                isActive
                  ? 'text-white font-medium bg-white/[0.05] border-l-2 border-[#ff6a00]'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.02] border-l-2 border-transparent',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 transition-colors',
                      isActive ? 'bg-[#ff6a00]' : 'bg-neutral-700 group-hover:bg-neutral-400',
                    )}
                    aria-hidden="true"
                  />
                  <span className="uppercase truncate">{item.name}</span>
                </div>

                {isReview && reviewCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[9.5px] font-mono border border-[#ff6a00]/40 text-[#ff6a00] bg-[#ff6a00]/10">
                    {reviewCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
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

  const { data: media, isFetching, refetch } = useMediaLibrary();

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
    <div className="flex h-[100dvh] bg-[#050505] text-[#ffffff] overflow-hidden selection:bg-[#ff6a00] selection:text-black">
      <AmbientField />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* Desktop Architectural Sidebar */}
      <aside
        aria-label="Primary Navigation"
        className="hidden md:flex w-[220px] flex-shrink-0 bg-[#080808] border-r border-white/[0.08] flex-col z-[var(--z-rail)] select-none"
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-white/[0.08] flex-shrink-0">
          <Link to="/landing" className="flex items-center gap-2.5 group">
            <MiraLogo />
            <span className="font-mono text-[13px] font-bold tracking-widest text-white uppercase group-hover:text-[#ff6a00] transition-colors">
              MIRA
            </span>
          </Link>
          <span className="text-[9px] font-mono text-neutral-500 border border-white/[0.1] px-1 py-0.5 uppercase">v2.4</span>
        </div>

        {/* Navigation Items */}
        <RailNav reviewCount={review} />

        {/* Telemetry Summary in Footer */}
        <div className="p-4 border-t border-white/[0.08] flex-shrink-0 space-y-2 text-[10px] font-mono text-neutral-500">
          <div className="flex items-center justify-between">
            <span className="tracking-wider">INDEXED</span>
            <span className="text-white font-medium">{assets.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="tracking-wider">VERIFIED</span>
            <span className="text-neutral-300">{ready}</span>
          </div>
          {review > 0 && (
            <div className="flex items-center justify-between text-[#ff6a00]">
              <span className="tracking-wider">ATTENTION</span>
              <span className="font-bold">{review}</span>
            </div>
          )}
          <div className="pt-2 border-t border-white/[0.06]">
            <Link
              to="/landing"
              className="text-[10px] font-mono text-neutral-400 hover:text-[#ff6a00] flex items-center justify-between transition-colors uppercase"
            >
              <span>SYSTEM SPEC</span>
              <span>LANDING →</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {menuOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)] md:hidden">
          <div
            className="absolute inset-0 bg-black/85 transition-opacity"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-[250px] max-w-[85vw] bg-[#080808] border-r border-white/[0.12] flex flex-col shadow-2xl"
          >
            <div className="h-14 flex items-center justify-between px-5 border-b border-white/[0.08] flex-shrink-0">
              <Link to="/landing" className="flex items-center gap-2.5">
                <MiraLogo />
                <span className="font-mono text-[13px] font-bold tracking-widest text-white uppercase">
                  MIRA
                </span>
              </Link>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <RailNav reviewCount={review} onNavigate={() => setMenuOpen(false)} />
            <div className="p-4 border-t border-white/[0.08]">
              <Link
                to="/landing"
                onClick={() => setMenuOpen(false)}
                className="text-[11px] font-mono text-neutral-400 hover:text-[#ff6a00] flex items-center justify-between transition-colors uppercase"
              >
                <span>SYSTEM SPECIFICATION</span>
                <span>LANDING →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Minimal Header */}
        <header className="h-14 flex-shrink-0 bg-[#080808]/90 backdrop-blur-sm border-b border-white/[0.08] flex items-center justify-between px-6 z-[var(--z-strip)] no-print relative">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label="Open navigation"
              className="md:hidden p-1 text-neutral-400 hover:text-white"
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-white uppercase font-mono tracking-wider">
                {active?.name ?? 'WORKSPACE'}
              </span>
              <span className="text-neutral-600 font-mono text-xs">/</span>
              <span className="text-[11px] text-neutral-400 truncate font-mono">
                {active?.hint}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Quick Link to Landing */}
            <Link
              to="/landing"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-neutral-400 hover:text-[#ff6a00] border border-white/[0.08] hover:border-[#ff6a00]/40 transition-all uppercase"
            >
              <span>SPECIFICATION</span>
            </Link>

            {/* Quick Command Palette Button */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 text-[11px] font-mono text-neutral-400 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all"
              aria-label="Open command palette (Press ⌘K or /)"
              title="Search & commands (⌘K or /)"
            >
              <Command className="w-3 h-3" aria-hidden="true" />
              <span>⌘K</span>
            </button>

            {/* Manual Refetch Trigger */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              aria-label="Refresh workspace data"
              title="Refresh workspace data"
            >
              <RefreshCw
                className={clsx('w-3.5 h-3.5', isFetching && 'animate-spin text-[#ff6a00]')}
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        {/* Live sync banner */}
        <RefetchBar />

        {/* Continuous Workspace Body */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none bg-[#050505]">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
