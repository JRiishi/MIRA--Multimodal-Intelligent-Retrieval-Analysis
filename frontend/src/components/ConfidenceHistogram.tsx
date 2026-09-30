import { useMemo } from 'react';
import { clsx } from 'clsx';
import { AUTO_ASSIGN_THRESHOLD, REVIEW_THRESHOLD, confidenceBand } from '../lib/presentation';
import type { MediaAsset } from '../types';

const BANDS = [
  { key: 'auto', label: 'AUTO-ASSIGN', range: `>= ${AUTO_ASSIGN_THRESHOLD * 100}%`, min: AUTO_ASSIGN_THRESHOLD, max: 1.0001 },
  { key: 'review', label: 'REVIEW BAND', range: `${REVIEW_THRESHOLD * 100}-${AUTO_ASSIGN_THRESHOLD * 100}%`, min: REVIEW_THRESHOLD, max: AUTO_ASSIGN_THRESHOLD },
  { key: 'reject', label: 'REJECTED', range: `< ${REVIEW_THRESHOLD * 100}%`, min: 0, max: REVIEW_THRESHOLD },
] as const;

const BINS = 20;

export default function ConfidenceHistogram({
  assets,
  className,
}: {
  assets: MediaAsset[];
  className?: string;
}) {
  const model = useMemo(() => {
    const scores = assets
      .map((a) => a.routing_confidence)
      .filter((c): c is number => typeof c === 'number' && Number.isFinite(c));

    const bins = new Array<number>(BINS).fill(0);
    for (const score of scores) {
      const idx = Math.min(BINS - 1, Math.max(0, Math.floor(score * BINS)));
      bins[idx]++;
    }

    const bandCounts = {
      auto: scores.filter((s) => confidenceBand(s) === 'auto').length,
      review: scores.filter((s) => confidenceBand(s) === 'review').length,
      reject: scores.filter((s) => confidenceBand(s) === 'reject').length,
    };

    const peak = Math.max(1, ...bins);
    const scored = scores.length;

    return { scores, bins, bandCounts, peak, scored, unscored: assets.length - scored };
  }, [assets]);

  if (model.scored === 0) {
    return (
      <div className={clsx('p-4 border border-white/[0.08]', className)}>
        <p className="text-xs text-neutral-500 font-mono">No confidence readings scored yet.</p>
      </div>
    );
  }

  return (
    <div className={clsx('p-4 border border-white/[0.08]', className)}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <span className="text-[10.5px] font-mono tracking-widest text-neutral-500 uppercase">
          ROUTING CONFIDENCE PROFILE
        </span>
        <span className="text-xs font-mono text-neutral-400">{model.scored} SCORED</span>
      </div>

      <div
        className="flex items-end gap-[3px] h-16 mb-2"
        role="img"
        aria-label={BANDS.map((b) => `${b.label}: ${model.bandCounts[b.key]}`).join(', ')}
      >
        {model.bins.map((count, i) => {
          const lower = i / BINS;
          const band = confidenceBand(lower + 0.001);
          const height = count === 0 ? 0 : Math.max(3, (count / model.peak) * 64);
          return (
            <span
              key={i}
              className={clsx(
                'flex-1 transition-[height] duration-200',
                band === 'auto'
                  ? 'bg-white'
                  : band === 'review'
                    ? 'bg-neutral-400'
                    : 'bg-neutral-700',
                count === 0 && 'bg-transparent',
              )}
              style={{ height }}
            />
          );
        })}
      </div>

      {/* Threshold axis */}
      <div className="relative h-3 mb-4 border-t border-white/[0.08]" aria-hidden="true">
        <span
          className="absolute top-0 w-px h-2 bg-white/40"
          style={{ left: `${AUTO_ASSIGN_THRESHOLD * 100}%` }}
        />
        <span
          className="absolute top-0 w-px h-2 bg-white/40"
          style={{ left: `${REVIEW_THRESHOLD * 100}%` }}
        />
        <span className="text-[9.5px] font-mono text-neutral-600 absolute left-0 top-1">0%</span>
        <span className="text-[9.5px] font-mono text-neutral-600 absolute right-0 top-1">100%</span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.08] text-xs font-mono">
        {BANDS.map((band) => {
          const count = model.bandCounts[band.key];
          return (
            <div key={band.key}>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white font-medium">{count}</span>
                <span className="text-[10px] text-neutral-500">{band.range}</span>
              </div>
              <p className="text-[10px] text-neutral-500 uppercase mt-0.5 truncate">{band.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
