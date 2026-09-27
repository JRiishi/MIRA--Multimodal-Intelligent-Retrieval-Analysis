import { useMemo } from 'react';
import { clsx } from 'clsx';
import { statusOf } from '../lib/presentation';
import type { MediaAsset } from '../types';

/**
 * Activity density over time.
 *
 * A timeline rendered as a vertical list answers "what happened" but not "how
 * often". Field oversight needs the second question: are captures arriving
 * steadily, did collection stop for a fortnight, is work bunching at the end
 * of the month. This is a stacked day-density strip, which answers it in one
 * glance and costs one SVG.
 *
 * Bucketing adapts to the span: hourly for under a week, daily for under a
 * year, monthly beyond that. A fixed day bucket would render a two-year project
 * as a single crowded column.
 */

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
        /* in flight: neither ready nor needing a human */
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

    // Gap detection: consecutive empty buckets longer than a third of the
    // window mean a collection stop, which is exactly what oversight looks for.
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
      <div className={clsx('panel p-4', className)}>
        <span className="label">Collection cadence</span>
        <p className="text-[12.5px] text-ink-3 mt-2">No dated captures yet.</p>
      </div>
    );
  }

  const { slots, counts, peak, bucket, longestGap } = model;
  // Never render more bars than can carry a pixel, so long spans stay cheap.
  const step = slots.length > 400 ? Math.ceil(slots.length / 400) : 1;
  const visible = slots.filter((_, i) => i % step === 0);

  return (
    <div className={clsx('panel p-4', className)}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="label">Collection cadence</span>
        <span className="meta">
          {bucket === 'hour' ? 'hourly' : bucket === 'day' ? 'daily' : 'monthly'}
        </span>
      </div>

      <div
        className="flex items-end gap-[1px] h-14 mb-2"
        role="img"
        aria-label={`Capture density by ${bucket}: ${model.dated.length} captures, longest gap ${longestGap} ${bucket}s`}
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
                'flex-1 min-w-[2px] rounded-[1px] flex flex-col justify-end overflow-hidden',
                'transition-opacity duration-150',
                !entry && 'opacity-40',
                entry && 'hover:opacity-100 opacity-85 cursor-pointer',
              )}
              style={{ height: h }}
              title={
                entry
                  ? `${bucketLabel(key, bucket)}: ${total} capture${total === 1 ? '' : 's'}`
                  : `${bucketLabel(key, bucket)}: no captures`
              }
              aria-label={
                entry
                  ? `${bucketLabel(key, bucket)}: ${total} captures`
                  : `${bucketLabel(key, bucket)}: no captures`
              }
            >
              <span className="block w-full bg-signal-400" style={{ height: humanH }} />
              <span className="block w-full bg-brand-300" style={{ height: inFlightH }} />
              <span className="block w-full bg-ok-500" style={{ height: readyH }} />
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <span className="label">{bucketLabel(model.minKey, bucket)}</span>
        <span className="label">{bucketLabel(model.maxKey, bucket)}</span>
      </div>

      {longestGap >= 3 && (
        <p className="meta mb-3 px-2.5 py-1.5 bg-caution-50 border border-caution-100 text-caution-700">
          Longest gap without a capture: {longestGap} {bucket}
          {longestGap === 1 ? '' : 's'}. Collection may have paused.
        </p>
      )}

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 rule-t">
        <li className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-ok-500" aria-hidden="true" />
          <span className="label">settled</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-brand-300" aria-hidden="true" />
          <span className="label">in pipeline</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-signal-400" aria-hidden="true" />
          <span className="label">needs decision</span>
        </li>
        <li className="meta ml-auto">peak {peak} per {bucket}</li>
      </ul>
    </div>
  );
}
