import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  CornerDownLeft,
  ArrowRight,
  FolderKanban,
  Image as ImageIcon,
  UserCheck,
  ScanSearch,
} from 'lucide-react';
import { clsx } from 'clsx';
import { navigation } from './layout/navigation';
import { useProjects } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import { humanizeToken, statusOf } from '../lib/presentation';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: 'Go to' | 'Project' | 'Capture' | 'Action';
  icon: React.ElementType<{ className?: string }>;
  run: () => void;
  keywords: string;
}

function score(haystack: string, needle: string): number {
  if (!needle) return 1;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();

  const direct = h.indexOf(n);
  if (direct === 0) return 1000;
  if (direct > 0) return 700 - direct;

  let hi = 0;
  let hits = 0;
  for (const ch of n) {
    const found = h.indexOf(ch, hi);
    if (found === -1) return 0;
    hi = found + 1;
    hits++;
  }
  return hits === n.length ? 200 : 0;
}

export default function CommandPalette({
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects } = useProjects();
  const { data: media } = useMediaLibrary();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteKey =
        (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
      if (isPaletteKey) {
        event.preventDefault();
        setOpen(!open);
        return;
      }
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const commands: Command[] = useMemo(() => {
    const list: Command[] = [];

    for (const item of navigation) {
      list.push({
        id: `nav-${item.to}`,
        label: item.name,
        hint: item.hint,
        group: 'Go to',
        icon: item.icon,
        run: () => {
          navigate(item.to);
          setOpen(false);
        },
        keywords: `${item.name} ${item.hint} navigation view`,
      });
    }

    if (projects) {
      for (const p of projects) {
        const place = p.location_name ? ` · ${p.location_name}` : '';
        list.push({
          id: `project-${p.id}`,
          label: p.name,
          hint: `Workspace${place}`,
          group: 'Project',
          icon: FolderKanban,
          run: () => {
            navigate(`/projects/${p.id}`);
            setOpen(false);
          },
          keywords: `${p.name} ${p.location_name ?? ''} ${(p.tags ?? []).join(' ')} project workspace`,
        });
      }
    }

    if (media) {
      const reviewFirst = [...media].sort((a, b) => {
        const ra = statusOf(a).needsHuman ? 0 : 1;
        const rb = statusOf(b).needsHuman ? 0 : 1;
        return ra - rb;
      });

      for (const a of reviewFirst.slice(0, 30)) {
        const place = a.location_source ? ` · ${a.location_source}` : '';
        const title = a.description
          ? a.description.slice(0, 48)
          : humanizeToken(a.activity ?? a.id);
        list.push({
          id: `media-${a.id}`,
          label: title,
          hint: `${humanizeToken(a.processing_status)}${place}`,
          group: 'Capture',
          icon: ImageIcon,
          run: () => {
            if (a.project_id) {
              navigate(`/projects/${a.project_id}?asset=${a.id}`);
            } else {
              navigate('/media');
            }
            setOpen(false);
          },
          keywords: `${a.id} ${a.description ?? ''} ${a.activity ?? ''} capture photo`,
        });
      }
    }

    list.push({
      id: 'action-quick-search',
      label: 'Open Semantic Search',
      hint: 'Natural language search query',
      group: 'Action',
      icon: ScanSearch,
      run: () => {
        navigate('/search');
        setOpen(false);
      },
      keywords: 'search semantic query find filter',
    });

    list.push({
      id: 'action-triage',
      label: 'Review Pending Exceptions',
      hint: 'Routing review queue',
      group: 'Action',
      icon: UserCheck,
      run: () => {
        navigate('/review');
        setOpen(false);
      },
      keywords: 'review triage unassigned needs review decision',
    });

    return list;
  }, [projects, media, navigate, setOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 16);
    return commands
      .map((cmd) => ({ cmd, s: score(`${cmd.label} ${cmd.keywords} ${cmd.hint ?? ''}`, query) }))
      .filter((entry) => entry.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 20)
      .map((entry) => entry.cmd);
  }, [commands, query]);

  useEffect(() => {
    if (results.length === 0) {
      setCursor(0);
      return;
    }
    setCursor((c) => Math.min(c, results.length - 1));
  }, [results]);

  const rows = useMemo(() => {
    let lastGroup: string | null = null;
    return results.map((command) => {
      const showGroup = command.group !== lastGroup;
      lastGroup = command.group;
      return { command, showGroup };
    });
  }, [results]);

  const commit = (command: Command | undefined) => {
    if (!command) return;
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c + 1) % results.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c - 1 + results.length) % results.length));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(results[cursor]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-overlay)] flex items-start justify-center pt-[10vh] px-4">
      <div
        className="absolute inset-0 bg-black/80 transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/[0.12] rounded-none shadow-2xl flex flex-col overflow-hidden anim-fade"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.08] flex-shrink-0">
          <SearchIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" aria-hidden="true" />
          <label htmlFor="palette-input" className="sr-only">
            Search views, projects and captures
          </label>
          <input
            id="palette-input"
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Type a command, project name, or search keyword..."
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-neutral-500 outline-none font-sans"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="font-mono text-[10px] text-neutral-500 border border-white/[0.1] px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {results.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13.5px] text-neutral-400 font-medium">No results for “{query}”</p>
            <p className="text-[12px] text-neutral-600 mt-1 font-mono">
              Search by project name, location, or tag.
            </p>
          </div>
        ) : (
          <ul ref={listRef} className="max-h-[55vh] overflow-y-auto p-2 space-y-0.5">
            {rows.map(({ command, showGroup }, index) => {
              const active = index === cursor;
              return (
                <li key={command.id}>
                  {showGroup && (
                    <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 px-3 pt-3 pb-1">
                      {command.group}
                    </div>
                  )}
                  <button
                    type="button"
                    data-active={active}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => commit(command)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      active
                        ? 'bg-white text-black'
                        : 'text-neutral-300 hover:text-white hover:bg-white/[0.03]',
                    )}
                  >
                    <div
                      className={clsx(
                        'w-5 h-5 flex items-center justify-center flex-shrink-0',
                        active ? 'text-black' : 'text-neutral-500',
                      )}
                    >
                      <command.icon className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <span className="text-[13px] font-medium truncate flex-1">
                      {command.label}
                    </span>
                    {command.hint && (
                      <span
                        className={clsx(
                          'font-mono text-[11px] truncate max-w-[40%] flex-shrink-0',
                          active ? 'text-neutral-700' : 'text-neutral-500',
                        )}
                      >
                        {command.hint}
                      </span>
                    )}
                    {active ? (
                      <CornerDownLeft className="w-3 h-3 text-black flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-100" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-5 py-2.5 border-t border-white/[0.08] bg-[#0a0a0a] flex items-center gap-4 flex-shrink-0 text-neutral-500 font-mono text-[11px]">
          <span>↑↓ NAVIGATE</span>
          <span>↵ SELECT</span>
          <span className="ml-auto">
            {results.length} ITEM{results.length === 1 ? '' : 'S'}
          </span>
        </div>
      </div>
    </div>
  );
}
