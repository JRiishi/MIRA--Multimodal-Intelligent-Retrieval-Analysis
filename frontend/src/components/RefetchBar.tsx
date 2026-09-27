import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { usePrefersReducedMotion } from '../lib/motion';

/**
 * Thin indeterminate bar pinned to the top of the workspace.
 *
 * Background refetches fire constantly in this app: the corpus polls while
 * assets are in flight, and every mutation invalidates queries. Without a
 * persistent cue, a reviewer cannot tell whether the number in front of them is
 * current or three seconds stale, and they re-click to find out. This makes
 * background activity visible without stealing focus or shifting layout.
 */
export default function RefetchBar() {
  const queryClient = useQueryClient();
  const reduced = usePrefersReducedMotion();

  if (reduced) return null;

  return (
    <div className="absolute top-0 left-0 right-0 h-px overflow-hidden pointer-events-none z-[var(--z-strip)]">
      <div
        className={clsx(
          'h-px w-1/3 bg-brand-500',
          queryClient.isFetching() ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          transition: 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          animation: queryClient.isFetching()
            ? 'mira-indeterminate 1.05s cubic-bezier(0.65,0,0.35,1) infinite'
            : undefined,
        }}
      />
    </div>
  );
}
