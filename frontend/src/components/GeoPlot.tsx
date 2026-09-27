import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Crosshair, Layers } from 'lucide-react';
import type { MediaAsset, Project } from '../types';
import { KM_PER_DEG_LAT, paddedBounds } from '../lib/geo';

/**
 * Geographic plot of project anchors and capture positions.
 *
 * Why this exists: the routing decision is fundamentally geographic. The
 * backend narrows candidates with a Haversine radius around each project
 * anchor, then reports `location_match_distance`. Rendering that as a number in
 * a table cell hides the one thing a reviewer needs to judge: *how far is this
 * photo from the site it was assigned to?* A reviewer who can see the offset
 * can reject a bad match instantly, without reading anything.
 *
 * No mapping library. This is an equirectangular projection of the local
 * bounding box, which is accurate enough at project scale (tens of km) and
 * costs one SVG element set. It also means the view works with no network, no
 * tile server, and no API key, which matters for field deployments.
 */

const VIEW_W = 100;
const VIEW_H = 62;
const VIEW_PAD = 7;

interface GeoPlotProps {
  projects: Project[];
  assets: MediaAsset[];
  /** Routing radius in km. Defaults to the documented 15 km. */
  radiusKm?: number;
  /** Highlight and centre on this project. */
  focusProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  onSelectAsset?: (assetId: string) => void;
  className?: string;
}

export default function GeoPlot({
  projects,
  assets,
  radiusKm = 15,
  focusProjectId = null,
  onSelectProject,
  onSelectAsset,
  className,
}: GeoPlotProps) {
  const [hover, setHover] = useState<{ kind: 'project' | 'asset'; id: string } | null>(null);

  const model = useMemo(() => {
    const anchors = projects
      .filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
      .map((p) => ({ id: p.id, name: p.name, lat: p.latitude!, lng: p.longitude! }));

    const shots = assets
      .filter((a) => typeof a.image_latitude === 'number' && typeof a.image_longitude === 'number')
      .map((a) => ({
        id: a.id,
        lat: a.image_latitude!,
        lng: a.image_longitude!,
        projectId: a.project_id,
        distanceKm: a.location_match_distance,
        status: a.processing_status,
        activity: a.activity,
      }));

    const all = [...anchors, ...shots];
    if (all.length === 0) return null;

    const bounds = paddedBounds(all);
    const midLat = (bounds.minLat + bounds.maxLat) / 2;
    // Longitude degrees are narrower than latitude degrees, so scale by the
    // cosine of latitude. This is the equirectangular approximation and is
    // accurate to well under a percent at project scale.
    const kx = Math.cos((midLat * Math.PI) / 180);
    const widthKm = (bounds.maxLng - bounds.minLng) * KM_PER_DEG_LAT * kx;
    const heightKm = (bounds.maxLat - bounds.minLat) * KM_PER_DEG_LAT;

    const scale = Math.min(
      (VIEW_W - VIEW_PAD * 2) / Math.max(widthKm, 0.001),
      (VIEW_H - VIEW_PAD * 2) / Math.max(heightKm, 0.001),
    );

    const toXY = (p: { lat: number; lng: number }) => ({
      x: VIEW_W / 2 + (p.lng - bounds.minLng) * kx * scale - (widthKm * scale) / 2,
      y: VIEW_H / 2 + (bounds.maxLat - p.lat) * scale - (heightKm * scale) / 2,
    });

    const anchorXY = anchors.map((a) => {
      const xy = toXY(a);
      return { ...a, ...xy, r: Math.min(11, radiusKm * scale || 3) };
    });

    const shotXY = shots.map((s) => {
      const xy = toXY(s);
      const anchor = s.projectId ? anchorXY.find((a) => a.id === s.projectId) : undefined;
      return { ...s, ...xy, anchor };
    });

    return { VW: VIEW_W, VH: VIEW_H, anchors: anchorXY, shots: shotXY };
  }, [projects, assets, radiusKm]);

  if (!model) {
    return (
      <div
        className={clsx(
          'panel flex flex-col items-center justify-center text-center py-12 px-6',
          className,
        )}
      >
        <Layers className="w-5 h-5 text-ink-3 mb-3" aria-hidden="true" />
        <p className="text-[13px] text-ink-2">No coordinates in the corpus yet</p>
        <p className="text-[11.5px] text-ink-3 mt-1 max-w-xs">
          The plot appears once captures carry EXIF or manual GPS. Project anchors are already
          plotted.
        </p>
      </div>
    );
  }

  const focused = focusProjectId
    ? model.anchors.find((a) => a.id === focusProjectId) ?? null
    : null;

  const label = (() => {
    if (hover?.kind === 'project') {
      const a = model.anchors.find((x) => x.id === hover.id);
      if (a) return { title: a.name, sub: 'routing anchor' };
    }
    if (hover?.kind === 'asset') {
      const s = model.shots.find((x) => x.id === hover.id);
      if (s) {
        return {
          title: (s.activity ?? 'unclassified').replace(/_/g, ' '),
          sub:
            s.distanceKm != null
              ? `${s.distanceKm.toFixed(2)} km from anchor`
              : 'no anchor within radius',
        };
      }
    }
    if (focused) return { title: focused.name, sub: 'focused anchor' };
    return {
      title: `${model.anchors.length} anchors`,
      sub: `${model.shots.length} positioned captures`,
    };
  })();

  return (
    <figure className={clsx('panel overflow-hidden', className)}>
      <figcaption className="px-3.5 py-2.5 rule-b flex items-center gap-2.5">
        <Crosshair className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" aria-hidden="true" />
        <span className="label-strong truncate">{label.title}</span>
        <span className="meta truncate ml-auto flex-shrink-0">{label.sub}</span>
      </figcaption>

      <div className="relative bg-sunken/40">
        <svg
          viewBox={`0 0 ${model.VW} ${model.VH}`}
          className="w-full block"
          role="img"
          aria-label={`Geographic plot: ${model.anchors.length} project anchors and ${model.shots.length} positioned captures, with ${radiusKm} km routing radius`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="geo-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.12" />
            </pattern>
            <radialGradient id="geo-focus">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Graticule. Ticks only: this organises real data, it is not
              decorative line work. */}
          <g style={{ color: 'var(--color-line)' }} className="text-line">
            <rect width={model.VW} height={model.VH} fill="url(#geo-grid)" opacity="0.5" />
          </g>

          {focused && (
            <circle
              cx={focused.x}
              cy={focused.y}
              r={Math.max(focused.r * 1.8, 8)}
              fill="url(#geo-focus)"
            />
          )}

          {/* Routing radius rings per anchor. */}
          {model.anchors.map((a) => (
            <circle
              key={`ring-${a.id}`}
              cx={a.x}
              cy={a.y}
              r={a.r}
              fill="none"
              stroke="var(--color-brand-400)"
              strokeWidth="0.22"
              strokeDasharray="1.1 0.9"
              opacity={focused && focused.id !== a.id ? 0.3 : 0.65}
            />
          ))}

          {/* Leader lines from each capture to the anchor it was assigned to.
              The visual length of this line is the routing decision. */}
          {model.shots.map((s) =>
            s.anchor ? (
              <line
                key={`lead-${s.id}`}
                x1={s.x}
                y1={s.y}
                x2={s.anchor.x}
                y2={s.anchor.y}
                stroke={
                  s.status === 'NEEDS_REVIEW' || s.status === 'UNASSIGNED'
                    ? 'var(--color-signal-400)'
                    : 'var(--color-line-strong)'
                }
                strokeWidth="0.2"
                strokeDasharray={s.status === 'NEEDS_REVIEW' ? '0.9 0.8' : undefined}
              />
            ) : null,
          )}

          {/* Anchors last so they sit above the shots. */}
          {model.anchors.map((a) => {
            const isFocus = focused?.id === a.id;
            const isHover = hover?.kind === 'project' && hover.id === a.id;
            return (
              <g key={`anchor-${a.id}`}>
                <rect
                  x={a.x - 2.6}
                  y={a.y - 2.6}
                  width="5.2"
                  height="5.2"
                  transform={`rotate(45 ${a.x} ${a.y})`}
                  fill={isFocus || isHover ? 'var(--color-brand-600)' : 'var(--color-rail)'}
                  stroke="var(--color-surface)"
                  strokeWidth="0.4"
                />
                <circle
                  cx={a.x}
                  cy={a.y}
                  r="8"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({ kind: 'project', id: a.id })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelectProject?.(a.id)}
                >
                  <title>{`${a.name} (anchor)`}</title>
                </circle>
              </g>
            );
          })}

          {/* Captures. Square for unattributed, circle for attributed: shape
              carries the distinction so colour is not the only channel. */}
          {model.shots.map((s) => {
            const isHover = hover?.kind === 'asset' && hover.id === s.id;
            const needsHuman = s.status === 'NEEDS_REVIEW' || s.status === 'UNASSIGNED';
            const fill = needsHuman ? 'var(--color-signal-500)' : 'var(--color-ok-500)';
            const r = isHover ? 1.5 : 1.1;
            return (
              <g key={`shot-${s.id}`}>
                {s.projectId ? (
                  <circle cx={s.x} cy={s.y} r={r} fill={fill} opacity={isHover ? 1 : 0.8} />
                ) : (
                  <rect
                    x={s.x - r}
                    y={s.y - r}
                    width={r * 2}
                    height={r * 2}
                    fill="var(--color-surface)"
                    stroke={fill}
                    strokeWidth="0.35"
                    opacity={isHover ? 1 : 0.85}
                  />
                )}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r="6"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({ kind: 'asset', id: s.id })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelectAsset?.(s.id)}
                >
                  <title>
                    {`${(s.activity ?? 'unclassified').replace(/_/g, ' ')}` +
                      (s.distanceKm != null ? ` - ${s.distanceKm.toFixed(2)} km from anchor` : '')}
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend. Meaningful only: it decodes shape and the two fills. */}
      <div className="px-3.5 py-2 rule-t flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rotate-45 bg-rail border border-surface"
            aria-hidden="true"
          />
          <span className="label">anchor</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ok-500" aria-hidden="true" />
          <span className="label">routed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 border border-signal-500 bg-surface"
            aria-hidden="true"
          />
          <span className="label">needs decision</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-brand-400" aria-hidden="true" />
          <span className="label">{radiusKm} km radius</span>
        </span>
        <span className="meta ml-auto">{model.shots.length} plotted</span>
      </div>
    </figure>
  );
}
