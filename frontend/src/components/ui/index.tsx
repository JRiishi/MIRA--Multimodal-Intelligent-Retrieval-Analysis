import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { clsx } from 'clsx';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

/* ================================================================== */
/* Skeletons & Loaders                                                */
/* ================================================================== */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden bg-white/[0.04] rounded-none animate-pulse',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={clsx('divide-y divide-white/[0.06]', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 px-1">
          <Skeleton className="w-12 h-12 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-2.5 w-1/5" />
          </div>
          <Skeleton className="h-4 w-16 flex-shrink-0" />
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
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 pb-4 border-b border-white/[0.08]">
          <Skeleton className="aspect-[16/10] w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-4 border-y border-white/[0.08]" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2 w-32" />
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24" role="status" aria-live="polite">
      <div className="w-5 h-5 border border-white/20 border-t-white animate-spin rounded-full" />
      <span className="text-[11px] font-mono tracking-widest text-neutral-500 uppercase">{label}</span>
    </div>
  );
}

export function EmptyState({
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
    <div className="py-20 px-4 text-center max-w-lg mx-auto">
      <p className="text-[11px] font-mono uppercase tracking-widest text-neutral-600 mb-2">00 / EMPTY</p>
      <h3 className="text-xl font-normal text-white tracking-tight">{title}</h3>
      {description && <p className="text-[13.5px] text-neutral-400 mt-2 leading-relaxed">{description}</p>}
      {action && <div className="mt-6 flex items-center justify-center">{action}</div>}
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
    <div role="alert" className="p-4 border border-red-500/20 bg-red-950/10 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-medium text-red-300">{title}</p>
          {detail && <p className="text-[11.5px] text-red-400/80 mt-1 font-mono">{detail}</p>}
        </div>
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
/* Layout & Typographic Metrics                                       */
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
    <div className={clsx('py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[13px] font-medium text-white tracking-tight flex items-center gap-2">{title}</h2>
        {meta && <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

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
      ? 'text-amber-300'
      : tone === 'ok'
        ? 'text-emerald-400'
        : tone === 'danger'
          ? 'text-red-400'
          : 'text-white';

  return (
    <div className="flex flex-col justify-between gap-1 py-1">
      <span className="text-[10.5px] font-mono tracking-widest uppercase text-neutral-500">{label}</span>
      <div className="flex items-baseline gap-1.5 my-0.5">
        <span className={clsx('text-3xl lg:text-4xl font-light tracking-tight font-sans', toneClass)}>
          {value}
        </span>
        {unit && <span className="text-[12px] font-mono text-neutral-500">{unit}</span>}
      </div>
      {foot && <div className="text-[11px] text-neutral-500 font-mono">{foot}</div>}
    </div>
  );
}

/* ================================================================== */
/* Chips & Readouts                                                   */
/* ================================================================== */

export function Chip({
  children,
  className = '',
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={clsx('chip', className)} title={title}>
      {children}
    </span>
  );
}

export function DataPair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[12px] text-neutral-400 flex-shrink-0">{label}</span>
      <span className="font-mono text-[12px] text-neutral-200 text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

export function Meter({
  value,
  tone = 'brand',
  label,
}: {
  value: number;
  tone?: 'brand' | 'signal' | 'ok' | 'danger';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const toneBg =
    tone === 'signal'
      ? 'bg-amber-400'
      : tone === 'ok'
        ? 'bg-emerald-400'
        : tone === 'danger'
          ? 'bg-red-400'
          : 'bg-white';

  return (
    <div
      className="w-full bg-white/[0.08] h-[2px] overflow-hidden flex"
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${Math.round(pct * 100)}%`}
    >
      <div
        className={clsx('h-full transition-all duration-300', toneBg)}
        style={{ width: `${Math.round(pct * 100)}%` }}
      />
    </div>
  );
}

export function ScoreReadout({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  if (score == null || !Number.isFinite(score)) {
    return <span className={clsx('text-[11px] font-mono text-neutral-600', className)}>no score</span>;
  }
  const pct = Math.max(0, Math.min(1, score));

  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span className="font-mono text-[11.5px] font-medium text-neutral-300">
        {(pct * 100).toFixed(1)}%
      </span>
      <div className="w-10 h-[2px] bg-white/[0.1]">
        <div
          className="h-full bg-white"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
    </span>
  );
}

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
    return <span className={clsx('text-[11px] font-mono text-neutral-600', className)}>No GPS</span>;
  }
  return (
    <span className={clsx('font-mono text-[11px] text-neutral-400', className)}>
      {Math.abs(lat).toFixed(4)}°{lat >= 0 ? 'N' : 'S'}, {Math.abs(lng).toFixed(4)}°{lng >= 0 ? 'E' : 'W'}
    </span>
  );
}

export function AssetId({ id, className }: { id: string; className?: string }) {
  const short = id.length > 14 ? `${id.slice(0, 5)}...${id.slice(-4)}` : id;
  return (
    <span className={clsx('font-mono text-[11px] text-neutral-500 select-all hover:text-neutral-300 transition-colors', className)} title={id}>
      {short}
    </span>
  );
}

/* ================================================================== */
/* Segmented Control & Architectural Modal                            */
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
      className="inline-flex items-center gap-1 border-b border-white/[0.08]"
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
              'font-medium text-[12.5px] transition-colors whitespace-nowrap relative pb-2 px-3',
              size === 'sm' && 'text-[11.5px] px-2 pb-1.5',
              selected
                ? 'text-white font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-white'
                : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      if (panelRef.current) {
        const firstInput = panelRef.current.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus();
        } else {
          closeRef.current?.focus();
        }
      }
    }, 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
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
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/85 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'relative w-full bg-[#0d0d0d] border border-white/[0.12] rounded-none shadow-2xl flex flex-col max-h-[90vh] z-10 anim-fade overflow-hidden',
          width,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08] flex-shrink-0">
          <h2 id={titleId} className="text-[14px] font-medium text-white tracking-tight uppercase tracking-wider font-mono">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="p-1 text-neutral-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0a0a0a] flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

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
      <label htmlFor={id} className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {(hint || error) && (
        <p
          id={describedBy}
          className={clsx('text-[11px] leading-snug font-mono', error ? 'text-red-400' : 'text-neutral-500')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
