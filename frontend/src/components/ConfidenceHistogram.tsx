import { useMemo } from 'react';
import { clsx } from 'clsx';
import { AUTO_ASSIGN_THRESHOLD, REVIEW_THRESHOLD, confidenceBand } from '../lib/presentation';
import type { MediaAsset } from '../types';

/**
 * Distribution of routing confidence across the corpus.
 *
 * A mean confidence number hides the thing that matters. What a reviewer needs
 * to know is *how much of the corpus sits in each decision band*, because the
 * bands are the system's actual contract: at or above 40 percent it auto
 * assigns, 28 to 40 goes to a person, below 28 is rejected. Plotting the
 * distribution against those thresholds makes misrouting visible at a glance
 * in a way an average cannot.
 */

const BANDS = [
  { key: 'auto', label: 'auto-assign', range: `>= ${AUTO_ASSIGN_THRESHOLD * 100}%`, min: AUTO_ASSIGN_THRESHOLD, max: 1.0001 },
  { key: 'review', label: 'review band', range: `${REVIEW_THRESHOLD * 100}-${AUTO_ASSIGN_THRESHOLD * 100}%`, min: REVIEW_THRESHOLD, max: AUTO_ASSIGN_THRESHOLD },
  { key: 'reject', label: 'rejected', range: `< ${REVIEW_THRESHOLD * 100}%`, min: 0, max: REVIEW_THRESHOLD },
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
      <div className={clsx('panel p-4', className)}>
        <span className="label">Confidence distribution</span>
        <p className="text-[12.5px] text-ink-3 mt-2">
          No confidence readings yet. The distribution appears once the router has scored the corpus.
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('panel p-4', className)}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="label">Confidence distribution</span>
        <span className="meta">{model.scored} scored</span>
      </div>

      <div className="flex items-end gap-[2px] h-16 mb-2" role="img" aria-label={
        BANDS.map((b) => `${b.label}: ${model.bandCounts[b.key]}`).join(', ')
      }>
        {model.bins.map((count, i) => {
          const lower = i / BINS;
          const band = confidenceBand(lower + 0.001);
          const height = count === 0 ? 0 : Math.max(3, (count / model.peak) * 64);
          return (
            <span
              key={i}
              className={clsx(
                'flex-1 rounded-[1px] transition-[height,background-color] duration-200',
                band === 'auto'
                  ? 'bg-ok-500'
                  : band === 'review'
                    ? 'bg-caution-500'
                    : 'bg-danger-500',
                count === 0 && 'bg-transparent',
              )}
              style={{ height }}
            />
          );
        })}
      </div>

      {/* Threshold axis. Positions are derived, not hardcoded. */}
      <div className="relative h-3 mb-3" aria-hidden="true">
        <span
          className="absolute top-0 w-px h-2 bg-line-strong"
          style={{ left: `${AUTO_ASSIGN_THRESHOLD * 100}%` }}
        />
        <span
          className="absolute top-0 w-px h-2 bg-line-strong"
          style={{ left: `${REVIEW_THRESHOLD * 100}%` }}
        />
        <span className="label absolute left-0 bottom-0">0%</span>
        <span className="label absolute right-0 bottom-0">100%</span>
      </div>

      <ul className="grid grid-cols-3 gap-2 pt-3 rule-t">
        {BANDS.map((band) => {
          const count = model.bandCounts[band.key];
          return (
            <li key={band.key}>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={clsx(
                    'w-2 h-2 flex-shrink-0',
                    band.key === 'auto'
                      ? 'bg-ok-500'
                      : band.key === 'review'
                        ? 'bg-caution-500'
                        : 'bg-danger-500',
                  )}
                  aria-hidden="true"
                />
                <span className="value text-[15px] font-semibold">{count}</span>
                <span className="label">{band.range}</span>
              </div>
              <p className="label mt-0.5 truncate">{band.label}</p>
            </li>
          );
        })}
      </ul>

      {model.unscored > 0 && (
        <p className="meta mt-3 pt-2.5 rule-t">
          {model.unscored} capture{model.unscored === 1 ? '' : 's'} not yet scored
        </p>
      )}
    </div>
  );
}
