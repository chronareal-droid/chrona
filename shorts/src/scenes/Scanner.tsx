import React from 'react';
import { interpolateColors, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { Canvas, SceneFrame, type SceneCaptionProps } from '../components/SceneFrame';
import { Glow, RoughFilter } from '../components/doodle';
import { drift, gentle, pushIn, ramp } from '../components/motion';
import { COLORS } from '../style/theme';
import { DeskSetup } from './Desk';

export interface ScannerProps extends SceneCaptionProps {
  /** Thumbnail grid size. Defaults 4 × 4. */
  columns?: number;
  rows?: number;
  /** Indices (row-major) of the thumbnails that turn amber as the lens passes. */
  flagged?: number[];
  /** Typing speed of the figure at the desk. Default 1.4 (fast). */
  typing?: number;
}

const GRID = { left: 110, right: 970, top: 200, gap: 22 };
const LENS_R = 104;
const SWEEP = { start: 16, endBeforeSceneEnd: 34 };

/** Serpentine path: across the top half of the grid, a half-loop on the right, back across the bottom half. */
function lensPath(u: number, yA: number, yB: number): [number, number] {
  const xL = GRID.left + 40;
  const xR = GRID.right - 40;
  const r = (yB - yA) / 2;
  const lA = xR - xL;
  const lB = Math.PI * r;
  const s = u * (lA + lB + lA);
  if (s <= lA) return [xL + s, yA];
  if (s <= lA + lB) {
    const a = -Math.PI / 2 + (s - lA) / r; // clockwise round the right side
    return [xR + r * Math.cos(a), yA + r + r * Math.sin(a)];
  }
  return [xR - (s - lA - lB), yB];
}

const Thumb: React.FC<{ x: number; y: number; w: number; h: number; variant: number; flag: number; checked: number }> = ({
  x,
  y,
  w,
  h,
  variant,
  flag,
  checked,
}) => {
  const stroke = interpolateColors(flag, [0, 1], [COLORS.line, COLORS.amber]);
  const ink = interpolateColors(flag, [0, 1], [COLORS.line, COLORS.amber]);
  const dim = 1 - 0.4 * checked * (1 - flag);
  return (
    <g opacity={dim}>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={COLORS.navy} stroke={stroke} strokeWidth={3} strokeOpacity={0.55 + 0.45 * flag} />
      <rect x={x} y={y} width={w} height={h} rx={10} fill={COLORS.amber} opacity={0.16 * flag} />
      <g opacity={0.45 + 0.4 * flag} stroke={ink} strokeLinecap="round" fill="none">
        {variant === 0 && (
          <>
            <circle cx={x + w * 0.25} cy={y + h * 0.48} r={h * 0.15} fill={ink} stroke="none" />
            <path d={`M ${x + w * 0.12} ${y + h * 0.9} Q ${x + w * 0.25} ${y + h * 0.58} ${x + w * 0.38} ${y + h * 0.9}`} strokeWidth={4} />
            <line x1={x + w * 0.5} y1={y + h * 0.35} x2={x + w * 0.85} y2={y + h * 0.35} strokeWidth={7} />
            <line x1={x + w * 0.5} y1={y + h * 0.58} x2={x + w * 0.75} y2={y + h * 0.58} strokeWidth={5} />
          </>
        )}
        {variant === 1 && (
          <>
            <circle cx={x + w * 0.68} cy={y + h * 0.42} r={h * 0.2} strokeWidth={4} />
            <line x1={x + w * 0.1} y1={y + h * 0.78} x2={x + w * 0.9} y2={y + h * 0.78} strokeWidth={4} />
            <line x1={x + w * 0.12} y1={y + h * 0.28} x2={x + w * 0.4} y2={y + h * 0.28} strokeWidth={7} />
          </>
        )}
        {variant === 2 && (
          <>
            <line x1={x + w * 0.12} y1={y + h * 0.3} x2={x + w * 0.88} y2={y + h * 0.3} strokeWidth={7} />
            <line x1={x + w * 0.12} y1={y + h * 0.52} x2={x + w * 0.7} y2={y + h * 0.52} strokeWidth={5} />
            <line x1={x + w * 0.12} y1={y + h * 0.72} x2={x + w * 0.55} y2={y + h * 0.72} strokeWidth={5} />
          </>
        )}
      </g>
    </g>
  );
};

/**
 * The desk figure typing fast while an amber magnifying glass sweeps a grid of thumbnails;
 * the flagged ones turn amber as the lens passes, the rest dim once checked.
 */
export const Scanner: React.FC<ScannerProps> = ({
  caption,
  captionTiming,
  columns = 4,
  rows = 4,
  flagged = [1, 6, 8, 15],
  typing = 1.4,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const w = (GRID.right - GRID.left - (columns - 1) * GRID.gap) / columns;
  const h = (w * 9) / 16;
  const centers = Array.from({ length: columns * rows }, (_, i) => [
    GRID.left + (i % columns) * (w + GRID.gap) + w / 2,
    GRID.top + Math.floor(i / columns) * (h + GRID.gap) + h / 2,
  ]);
  const gridBottom = GRID.top + rows * h + (rows - 1) * GRID.gap;
  // Two passes, each between a pair of rows, so the lens covers every thumbnail.
  const yA = GRID.top + (gridBottom - GRID.top) * 0.25;
  const yB = GRID.top + (gridBottom - GRID.top) * 0.75;
  const sweepEnd = d - SWEEP.endBeforeSceneEnd;
  const lensAt = (f: number) => lensPath(ramp(f, SWEEP.start, sweepEnd, gentle), yA, yB);

  // When the lens comes closest to each thumbnail (deterministic, from the path itself).
  const closest = centers.map(([cx, cy]) => {
    let best = Infinity;
    let at = 0;
    for (let f = SWEEP.start; f <= sweepEnd; f++) {
      const [lx, ly] = lensAt(f);
      const dist = Math.hypot(lx - cx, ly - cy);
      if (dist < best) [best, at] = [dist, f];
    }
    return best <= LENS_R + 10 ? at : Infinity;
  });

  const [lx, ly] = lensAt(frame);
  const lensIn = ramp(frame, SWEEP.start - 12, SWEEP.start + 4);
  const lensOut = 1 - ramp(frame, sweepEnd + 6, sweepEnd + 22);
  const hits = flagged.filter((i) => frame >= closest[i]).length;

  return (
    <SceneFrame caption={caption} captionTiming={captionTiming}>
      <Canvas scale={pushIn(frame, d, 0.03)} origin={[540, 760]}>
        <defs>
          <RoughFilter id="scanner-rough" />
        </defs>
        <g transform={`translate(0 ${drift(frame, d, -12)})`}>
          <g filter="url(#scanner-rough)">
            {centers.map(([cx, cy], i) => (
              <Thumb
                key={i}
                x={cx - w / 2}
                y={cy - h / 2}
                w={w}
                h={h}
                variant={Math.floor(random(`thumb-${i}`) * 3)}
                flag={flagged.includes(i) ? ramp(frame, closest[i] - 2, closest[i] + 10) : 0}
                checked={ramp(frame, closest[i] + 4, closest[i] + 16)}
              />
            ))}
          </g>
          {/* magnifying glass */}
          <g opacity={lensIn * lensOut}>
            <Glow id="scanner-lens-glow" cx={lx} cy={ly} r={LENS_R * 1.9} color={COLORS.amber} opacity={0.16} />
            <circle cx={lx} cy={ly} r={LENS_R} fill={COLORS.amber} opacity={0.07} />
            <circle cx={lx} cy={ly} r={LENS_R} fill="none" stroke={COLORS.amber} strokeWidth={9} />
            <path
              d={`M ${lx - LENS_R * 0.62} ${ly - LENS_R * 0.3} A ${LENS_R * 0.7} ${LENS_R * 0.7} 0 0 1 ${lx - LENS_R * 0.2} ${ly - LENS_R * 0.66}`}
              fill="none"
              stroke={COLORS.amber}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.55}
            />
            <line
              x1={lx + LENS_R * 0.72}
              y1={ly + LENS_R * 0.72}
              x2={lx + LENS_R * 1.72}
              y2={ly + LENS_R * 1.72}
              stroke={COLORS.amber}
              strokeWidth={20}
              strokeLinecap="round"
            />
          </g>
        </g>
        {/* the monitor picks up a little amber with each hit */}
        <Glow id="scanner-monitor-amber" cx={775} cy={1257} r={240} rx={300} color={COLORS.amber} opacity={0.05 * hits} />
        <DeskSetup frame={frame} typing={typing} window={false} idPrefix="scanner" />
      </Canvas>
    </SceneFrame>
  );
};
