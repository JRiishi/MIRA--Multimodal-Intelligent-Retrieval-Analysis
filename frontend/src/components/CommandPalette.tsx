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
  MapPin,
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

/**
 * Command palette.
 *
 * The brief for this product is that a reviewer should never have to look
 * around to find a control. The navigation rail covers six destinations, but a
 * field team with forty projects and thousands of captures cannot use a rail to
 * reach "the capture from Kayalapuram last Tuesday". This is the fast path:
 * one keystroke from anywhere, fuzzy over views, projects and captures.
 *
 * Deliberately no fuzzy-match library. The corpus is small enough that a
 * subsequence scorer over a few thousand rows is instant, and it keeps the
 * bundle lean.
 */
function score(haystack: string, needle: string): number {
  if (!needle) return 1;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();

  const direct = h.indexOf(n);
  if (direct === 0) return 1000;
  if (direct > 0) return 700 - direct;

  // Subsequence fallback: every needle char appears in order.
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

  // Cmd/Ctrl+K toggles. Guarded so it does not fire inside a text field where
  // the user might be selecting with the keyboard.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteKey =
        (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
      if (isPaletteKey) {
        event.preventDefault();
        setOpen(!open);
        return;
      }
      // "/" as a single-key shortcut, the convention reviewers already know.
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  // Reset the query and cursor when the palette opens, adjusted during render
  // rather than in an effect so it does not cost an extra render pass.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setCursor(0);
    }
  }

  // Focus after the dialog paints, otherwise the mount steals it.
  const focusRaf = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    focusRaf.current = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      if (focusRaf.current !== null) cancelAnimationFrame(focusRaf.current);
    };
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const goTo = (to: string) => (): void => {
      navigate(to);
      setOpen(false);
    };

    const list: Command[] = navigation.map((item) => ({
      id: `nav-${item.to}`,
      label: item.name,
      hint: item.hint,
      group: 'Go to' as const,
      icon: item.icon,
      run: goTo(item.to),
      keywords: `${item.name} ${item.hint}`,
    }));

    for (const project of projects ?? []) {
      list.push({
        id: `project-${project.id}`,
        label: project.name,
        hint: project.location_name ?? undefined,
        group: 'Project',
        icon: FolderKanban,
        run: () => {
          navigate(`/projects/${project.id}`);
          setOpen(false);
        },
        keywords: `${project.name} ${project.description ?? ''} ${(project.tags ?? []).join(' ')} ${
          project.location_name ?? ''
        }`,
      });
    }

    for (const asset of media ?? []) {
      const status = statusOf(asset);
      list.push({
        id: `asset-${asset.id}`,
        label: asset.description || humanizeToken(asset.activity) || asset.id,
        hint: status.label,
        group: 'Capture',
        icon: ImageIcon,
        run: () => {
          if (asset.project_id) navigate(`/projects/${asset.project_id}`);
          setOpen(false);
        },
        keywords: `${asset.description ?? ''} ${asset.activity ?? ''} ${asset.scene ?? ''} ${
          asset.id
        } ${asset.location_source ?? ''}`,
      });
    }

    list.push(
      {
        id: 'action-search',
        label: 'Search the corpus',
        hint: 'natural language, hybrid index',
        group: 'Action',
        icon: ScanSearch,
        run: () => {
          navigate('/search');
          setOpen(false);
        },
        keywords: 'search find query evidence retrieve',
      },
      {
        id: 'action-review',
        label: 'Go to review queue',
        hint: 'captures awaiting a decision',
        group: 'Action',
        icon: UserCheck,
        run: () => {
          navigate('/review');
          setOpen(false);
        },
        keywords: 'review queue unassigned assign decision',
      },
      {
        id: 'action-geo',
        label: 'Show geographic plot',
        hint: 'overview',
        group: 'Action',
        icon: MapPin,
        run: () => {
          navigate('/dashboard');
          setOpen(false);
        },
        keywords: 'map geo gps plot coordinates radius',
      },
    );

    return list;
  }, [navigate, projects, media, setOpen]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Without a query, surface the navigation and the two most urgent
      // actions rather than an arbitrary prefix of the corpus.
      return commands.filter((c) => c.group === 'Go to' || c.group === 'Action').slice(0, 10);
    }
    return commands
      .map((command) => ({ command, s: score(`${command.label} ${command.keywords}`, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 24)
      .map((r) => r.command);
  }, [commands, query]);

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  /**
   * Group headers are derived by comparing neighbours, so no mutable state is
   * left behind if render is interrupted.
   */
  const rows = useMemo(
    () =>
      results.map((command, i) => ({
        command,
        showGroup: i === 0 || results[i - 1].group !== command.group,
      })),
    [results],
  );

  if (!open) return null;

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

  return (
    <div className="fixed inset-0 z-[var(--z-overlay)] flex items-start justify-center pt-[12vh] px-4">
      <div
        className="absolute inset-0 bg-ink/50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl panel shadow-[var(--shadow-pop)] flex flex-col overflow-hidden anim-enter"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 px-3.5 h-12 rule-b flex-shrink-0">
          <SearchIcon className="w-4 h-4 text-ink-3 flex-shrink-0" aria-hidden="true" />
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
            placeholder="Jump to a view, project or capture"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-3 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="label border border-line rounded-[2px] px-1.5 py-1 flex-shrink-0">esc</kbd>
        </div>

        {results.length === 0 ? (
          <div className="px-3.5 py-10 text-center">
            <p className="text-[13px] text-ink-2">Nothing matches “{query}”</p>
            <p className="text-[11.5px] text-ink-3 mt-1">
              Try a project name, a place, or words that would appear in a capture description.
            </p>
          </div>
        ) : (
          <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
            {rows.map(({ command, showGroup }, index) => {
              const active = index === cursor;
              return (
                <li key={command.id}>
                  {showGroup && (
                    <div className="label px-3.5 pt-2.5 pb-1.5 border-b border-line mb-1 first:border-b-0 first:pt-1.5">
                      {command.group}
                    </div>
                  )}
                  <button
                    type="button"
                    data-active={active}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => commit(command)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors duration-100',
                      active ? 'bg-brand-50' : 'hover:bg-sunken',
                    )}
                  >
                    <command.icon
                      className={clsx('w-3.5 h-3.5 flex-shrink-0', active ? 'text-brand-700' : 'text-ink-3')}
                      aria-hidden="true"
                    />
                    <span
                      className={clsx(
                        'text-[13px] truncate flex-1',
                        active ? 'text-brand-800' : 'text-ink',
                      )}
                    >
                      {command.label}
                    </span>
                    {command.hint && (
                      <span className="meta truncate max-w-[42%] flex-shrink-0">{command.hint}</span>
                    )}
                    {active ? (
                      <CornerDownLeft
                        className="w-3 h-3 text-brand-600 flex-shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-ink-3 opacity-0" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-3.5 py-2 rule-t flex items-center gap-4 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <kbd className="label border border-line rounded-[2px] px-1">up</kbd>
            <kbd className="label border border-line rounded-[2px] px-1">down</kbd>
            <span className="label">navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="label border border-line rounded-[2px] px-1">enter</kbd>
            <span className="label">open</span>
          </span>
          <span className="label ml-auto hidden sm:inline">{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
