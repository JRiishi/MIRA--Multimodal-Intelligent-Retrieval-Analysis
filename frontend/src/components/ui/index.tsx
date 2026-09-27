import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { clsx } from 'clsx';
import { X, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';

/* ================================================================== */
/* Primitives                                                          */
/* ================================================================== */

/**
 * Shimmer placeholder.
 *
 * The highlight sweeps across rather than pulsing, because a sweeping
 * highlight reads as "work in progress" while a pulse reads as "disabled".
 * Implemented with a pseudo-element on overflow, and the sweep itself is
 * declared behind `prefers-reduced-motion: no-preference` in index.css, so
 * this collapses to a static block under reduced motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden bg-sunken rounded-[var(--radius-control)]',
        'anim-shimmer',
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-surface/70 to-transparent" />
    </div>
  );
}

/**
 * Placeholder shaped like the content it replaces. Matching the final layout
 * is what prevents the jump when data lands, so these are not generic bars.
 */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={clsx('divide-y divide-line', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="w-9 h-9 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2.5 w-3/5" />
            <Skeleton className="h-2 w-2/5" />
          </div>
          <Skeleton className="h-4 w-14 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3',
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel overflow-hidden">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="p-2.5 space-y-2">
            <Skeleton className="h-2.5 w-4/5" />
            <Skeleton className="h-2 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetrics({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel px-4 py-3.5 space-y-2.5">
          <Skeleton className="h-2.5 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-2 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder matching the GeoPlot frame, so the panel does not resize. */
export function SkeletonPlot({ className }: { className?: string }) {
  return (
    <div className={clsx('panel overflow-hidden', className)} aria-hidden="true">
      <div className="px-3.5 py-2.5 rule-b">
        <Skeleton className="h-2.5 w-32" />
      </div>
      <Skeleton className="aspect-[100/62] rounded-none" />
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24" role="status" aria-live="polite">
      <span
        className="w-4 h-4 border-2 border-line-strong border-t-brand-600 rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="label">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ElementType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-10 h-10 border border-line rounded-[var(--radius-control)] flex items-center justify-center mb-4">
        <Icon className="w-4 h-4 text-ink-3" aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="text-[13px] text-ink-2 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Request failed',
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="panel border-danger-100 bg-danger-50 p-4 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-danger-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-danger-700">{title}</p>
        {detail && <p className="text-[12px] text-danger-600/90 mt-1 break-words">{detail}</p>}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-sm btn-secondary flex-shrink-0">
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

/* ================================================================== */
/* Structure                                                           */
/* ================================================================== */

export function PanelHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('px-4 py-3 rule-b flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="label-strong">{title}</h2>
        {meta && <p className="meta mt-1">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * Primary metric readout. Values are monospace and tabular so a column of
 * them aligns without per-cell tweaking.
 */
export function Metric({
  label,
  value,
  unit,
  foot,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  foot?: ReactNode;
  tone?: 'default' | 'signal' | 'ok' | 'danger';
}) {
  const toneClass =
    tone === 'signal'
      ? 'text-signal-700'
      : tone === 'ok'
        ? 'text-ok-600'
        : tone === 'danger'
          ? 'text-danger-600'
          : 'text-ink';

  return (
    <div className="panel px-4 py-3.5 flex flex-col gap-2">
      <span className="label">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={clsx('value text-[26px] font-semibold leading-none tracking-tight', toneClass)}>
          {value}
        </span>
        {unit && <span className="label text-ink-3">{unit}</span>}
      </div>
      {foot && <div className="meta leading-snug">{foot}</div>}
    </div>
  );
}

/* ================================================================== */
/* Chips                                                               */
/* ================================================================== */

/**
 * Status chip. `className` supplies the semantic variant (chip-ok,
 * chip-signal, ...) and callers pass the label as children, so a status is
 * never re-derived per page.
 */
export function Chip({
  children,
  className = 'chip-neutral',
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`chip ${className}`} title={title}>
      {children}
    </span>
  );
}

/* ================================================================== */
/* Data display                                                        */
/* ================================================================== */

/** Label / value pair used in dense specification blocks. */
export function DataPair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="label flex-shrink-0">{label}</span>
      <span className="value text-[12px] text-ink-2 text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

/**
 * Proportional meter drawn as discrete ticks. Reads as an instrument gauge
 * rather than a rounded progress bar.
 */
export function Meter({ value, tone = 'brand', label }: { value: number; tone?: 'brand' | 'signal' | 'ok' | 'danger'; label?: string }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const filled = Math.round(pct * 20);
  const toneClass =
    tone === 'signal'
      ? 'bg-signal-500'
      : tone === 'ok'
        ? 'bg-ok-500'
        : tone === 'danger'
          ? 'bg-danger-500'
          : 'bg-brand-500';
  return (
    <div
      className="flex items-center gap-[2px] h-2"
      role="img"
      aria-label={label ?? `${Math.round(pct * 100)} percent`}
    >
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className={clsx('h-2 flex-1 rounded-[1px]', i < filled ? toneClass : 'bg-sunken')}
        />
      ))}
    </div>
  );
}

/** Confidence score rendered the way a device would: number plus ticks. */
export function ScoreReadout({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score == null || !Number.isFinite(score)) {
    return <span className={clsx('meta', className)}>no reading</span>;
  }
  const pct = Math.max(0, Math.min(1, score));
  const tone = pct >= 0.4 ? 'ok' : pct >= 0.28 ? 'caution' : 'danger';
  const toneClass =
    tone === 'ok' ? 'text-ok-600' : tone === 'caution' ? 'text-caution-600' : 'text-danger-600';
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span className={clsx('value text-[12px] font-semibold', toneClass)}>
        {(pct * 100).toFixed(1)}%
      </span>
      <span className="flex items-center gap-[2px]" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={clsx(
              'w-[3px] h-3 rounded-[1px]',
              pct >= (i + 1) * 0.2
                ? pct >= 0.4
                  ? 'bg-ok-500'
                  : pct >= 0.28
                    ? 'bg-caution-500'
                    : 'bg-danger-500'
                : 'bg-sunken',
            )}
          />
        ))}
      </span>
    </span>
  );
}

/** Coordinate pair. Always monospace, always with hemisphere letters. */
export function Coordinate({
  lat,
  lng,
  className,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  className?: string;
}) {
  if (lat == null || lng == null) {
    return <span className={clsx('meta', className)}>no GPS</span>;
  }
  return (
    <span className={clsx('value text-[11px] text-ink-2', className)}>
      {Math.abs(lat).toFixed(4)}
      {lat >= 0 ? 'N' : 'S'}
      {' '}
      {Math.abs(lng).toFixed(4)}
      {lng >= 0 ? 'E' : 'W'}
    </span>
  );
}

/** Identifiers, truncated in the middle where the distinguishing part lives. */
export function AssetId({ id, className }: { id: string; className?: string }) {
  const short = id.length > 14 ? `${id.slice(0, 5)}...${id.slice(-4)}` : id;
  return (
    <span className={clsx('meta', className)} title={id}>
      {short}
    </span>
  );
}

/* ================================================================== */
/* Layout helpers                                                      */
/* ================================================================== */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-stretch border border-line rounded-[var(--radius-control)] bg-surface overflow-hidden"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={clsx(
              'label transition-colors duration-100 whitespace-nowrap',
              size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5',
              selected
                ? 'bg-brand-600 text-white'
                : 'text-ink-2 hover:bg-sunken hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* Modal                                                               */
/* ================================================================== */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-xl',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      // Contain focus inside the dialog.
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/55"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'relative w-full bg-surface border border-line-strong rounded-[var(--radius-panel)] shadow-[var(--shadow-pop)] flex flex-col max-h-[88vh]',
          width,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 rule-b flex-shrink-0">
          <h2 id={titleId} className="label-strong">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="btn btn-icon btn-ghost -mr-1"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="px-4 py-3 rule-t flex justify-end gap-2 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Form field wrapper                                                  */
/* ================================================================== */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = hint || error ? `${id}-desc` : undefined;
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {(hint || error) && (
        <p
          id={describedBy}
          className={clsx('text-[11px] leading-snug', error ? 'text-danger-600' : 'text-ink-3')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
