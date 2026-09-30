import { useMemo } from 'react';
import { clsx } from 'clsx';
import { statusOf } from '../lib/presentation';
import type { MediaAsset } from '../types';

type Bucket = 'hour' | 'day' | 'month';

const DAY_MS = 86_400_000;

function pickBucket(spanMs: number): Bucket {
  if (spanMs < 7 * DAY_MS) return 'hour';
  if (spanMs < 400 * DAY_MS) return 'day';
  return 'month';
}

function bucketKey(date: Date, bucket: Bucket): number {
  if (bucket === 'hour') return Math.floor(date.getTime() / 3_600_000);
  if (bucket === 'day') return Math.floor(date.getTime() / DAY_MS);
  return date.getFullYear() * 12 + date.getMonth();
}

function bucketLabel(key: number, bucket: Bucket): string {
  if (bucket === 'hour') return `${new Date(key * 3_600_000).toLocaleTimeString(undefined, { hour: '2-digit' })}`;
  if (bucket === 'day') {
    return new Date(key * DAY_MS).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  }
  return new Date(key, 0, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export default function ActivityDensity({
  assets,
  onSelectDate,
  className,
}: {
  assets: MediaAsset[];
  onSelectDate?: (iso: string) => void;
  className?: string;
}) {
  const model = useMemo(() => {
    const dated = assets
      .map((a) => ({ asset: a, time: new Date(a.uploaded_at).getTime() }))
      .filter((d) => Number.isFinite(d.time))
      .sort((a, b) => a.time - b.time);

    if (dated.length === 0) return null;

    const first = dated[0].time;
    const last = dated[dated.length - 1].time;
    const span = Math.max(last - first, DAY_MS);
    const bucket = pickBucket(span);

    const counts = new Map<number, { total: number; ready: number; needsHuman: number }>();
    for (const { asset, time } of dated) {
      const key = bucketKey(new Date(time), bucket);
      const entry = counts.get(key) ?? { total: 0, ready: 0, needsHuman: 0 };
      entry.total += 1;
      const status = statusOf(asset);
      if (status.inFlight) {
        /* in flight */
      } else if (status.needsHuman) {
        entry.needsHuman += 1;
      } else {
        entry.ready += 1;
      }
      counts.set(key, entry);
    }

    const keys = [...counts.keys()].sort((a, b) => a - b);
    const minKey = keys[0];
    const maxKey = keys[keys.length - 1];
    const slots: (typeof keys)[number][] = [];
    for (let k = minKey; k <= maxKey; k += 1) slots.push(k);

    const peak = Math.max(1, ...[...counts.values()].map((v) => v.total));

    let longestGap = 0;
    let run = 0;
    for (const k of slots) {
      if (!counts.has(k)) {
        run += 1;
        longestGap = Math.max(longestGap, run);
      } else {
        run = 0;
      }
    }

    return { dated, bucket, slots, counts, peak, span, longestGap, minKey, maxKey };
  }, [assets]);

  if (!model) {
    return (
      <div className={clsx('p-4 border border-white/[0.08]', className)}>
        <p className="text-xs text-neutral-500 font-mono">No dated captures available.</p>
      </div>
    );
  }

  const { slots, counts, peak, bucket } = model;
  const step = slots.length > 400 ? Math.ceil(slots.length / 400) : 1;
  const visible = slots.filter((_, i) => i % step === 0);

  return (
    <div className={clsx('p-4 border border-white/[0.08]', className)}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <span className="text-[10.5px] font-mono tracking-widest text-neutral-500 uppercase">
          TEMPORAL COLLECTION CADENCE
        </span>
        <span className="text-xs font-mono text-neutral-400 uppercase">
          {bucket === 'hour' ? 'HOURLY' : bucket === 'day' ? 'DAILY' : 'MONTHLY'}
        </span>
      </div>

      <div
        className="flex items-end gap-[1.5px] h-14 mb-2"
        role="img"
        aria-label={`Capture density by ${bucket}: ${model.dated.length} captures`}
      >
        {visible.map((key) => {
          const entry = counts.get(key);
          const total = entry?.total ?? 0;
          const h = total === 0 ? 2 : Math.max(4, (total / peak) * 56);
          const readyH = entry && total > 0 ? (entry.ready / total) * h : 0;
          const humanH = entry && total > 0 ? (entry.needsHuman / total) * h : 0;
          const inFlightH = Math.max(0, h - readyH - humanH);

          return (
            <button
              key={key}
              type="button"
              disabled={!entry}
              onClick={() =>
                entry &&
                onSelectDate?.(
                  bucket === 'hour'
                    ? new Date(key * 3_600_000).toISOString()
                    : bucket === 'day'
                      ? new Date(key * DAY_MS).toISOString()
                      : new Date(key, 0, 1).toISOString(),
                )
              }
              className={clsx(
                'flex-1 min-w-[2px] flex flex-col justify-end overflow-hidden transition-opacity',
                !entry && 'opacity-20',
                entry && 'hover:opacity-100 opacity-80 cursor-pointer',
              )}
              style={{ height: h }}
              title={
                entry
                  ? `${bucketLabel(key, bucket)}: ${total} capture${total === 1 ? '' : 's'}`
                  : `${bucketLabel(key, bucket)}: no captures`
              }
            >
              <span className="block w-full bg-neutral-400" style={{ height: humanH }} />
              <span className="block w-full bg-neutral-600" style={{ height: inFlightH }} />
              <span className="block w-full bg-white" style={{ height: readyH }} />
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between pt-1 border-t border-white/[0.08] text-[10px] font-mono text-neutral-500">
        <span>{bucketLabel(model.minKey, bucket)}</span>
        <span>{bucketLabel(model.maxKey, bucket)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-white/[0.08] text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-white" />
          <span>VERIFIED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-neutral-600" />
          <span>IN PIPELINE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-neutral-400" />
          <span>NEEDS DECISION</span>
        </div>
        <span className="ml-auto text-neutral-500">PEAK: {peak} / {bucket.toUpperCase()}</span>
      </div>
    </div>
  );
}
