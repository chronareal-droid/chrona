import React from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { Canvas, SceneFrame, type SceneCaptionProps } from '../components/SceneFrame';
import { Glow, lineStyle, personParts, RoughFilter, Silhouette } from '../components/doodle';
import { drift, pushIn, ramp } from '../components/motion';
import { COLORS } from '../style/theme';

export interface ScreensProps extends SceneCaptionProps {
  /** Number of TVs. Default 12. */
  count?: number;
  /** TVs per row. Default 4. */
  columns?: number;
  /** When the first and last TV go dark, as fractions of the scene. Defaults 0.12 and 0.8. */
  darkFrom?: number;
  darkTo?: number;
  /** Changes the (deterministic) order the TVs go dark in. */
  seed?: string;
}

const GRID = { left: 100, right: 980, top: 205, bottom: 800, gap: 34, antenna: 34 };
const FLOOR = 1500;
const FADE = 8;

const Tv: React.FC<{ x: number; y: number; w: number; h: number; lit: number }> = ({ x, y, w, h, lit }) => {
  const sx = x + 12;
  const sy = y + 12;
  const sw = w - 24;
  const sh = h - 40;
  return (
    <g>
      {/* antenna */}
      <path d={`M ${x + w / 2 - 22} ${y - GRID.antenna} L ${x + w / 2} ${y - 2} L ${x + w / 2 + 26} ${y - GRID.antenna + 4}`} {...lineStyle(3, 0.45)} />
      <rect x={x} y={y} width={w} height={h} rx={14} {...lineStyle(3.5, 0.6, COLORS.slate)} />
      <rect x={sx} y={sy} width={sw} height={sh} rx={9} fill={COLORS.navy} />
      {/* the picture: a soft grey glow with a couple of doodle bars */}
      <rect x={sx} y={sy} width={sw} height={sh} rx={9} fill={COLORS.line} opacity={0.42 * lit} />
      <g opacity={0.55 * lit}>
        <line x1={sx + 16} y1={sy + 22} x2={sx + sw * 0.55} y2={sy + 22} stroke={COLORS.bg} strokeWidth={7} strokeLinecap="round" />
        <line x1={sx + 16} y1={sy + 42} x2={sx + sw * 0.75} y2={sy + 42} stroke={COLORS.bg} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
      </g>
      {/* once dark, only a faint reflection remains */}
      <line x1={sx + sw * 0.62} y1={sy + 10} x2={sx + sw * 0.86} y2={sy + sh * 0.42} stroke={COLORS.line} strokeWidth={3} strokeLinecap="round" opacity={0.14 * (1 - lit)} />
      {/* knobs on the chin */}
      <circle cx={x + w - 26} cy={y + h - 14} r={4} fill={COLORS.line} opacity={0.4} />
      <circle cx={x + w - 42} cy={y + h - 14} r={4} fill={COLORS.line} opacity={0.25} />
    </g>
  );
};

/** A wall of small TVs going dark one by one, watched by a lone figure. */
export const Screens: React.FC<ScreensProps> = ({
  caption,
  captionTiming,
  count = 12,
  columns = 4,
  darkFrom = 0.12,
  darkTo = 0.8,
  seed = 'screens',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const rows = Math.ceil(count / columns);
  // As large as fits in the box above the caption band, centred.
  const w = Math.min(
    (GRID.right - GRID.left - (columns - 1) * GRID.gap) / columns,
    (GRID.bottom - GRID.top - rows * GRID.antenna - (rows - 1) * GRID.gap) / rows / 0.74,
  );
  const h = w * 0.74;
  const pitch = h + GRID.antenna + GRID.gap;
  const left = (GRID.left + GRID.right) / 2 - (columns * w + (columns - 1) * GRID.gap) / 2;

  // Deterministic shuffle: the k-th TV in `order` goes dark k-th.
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => random(`${seed}-${a}`) - random(`${seed}-${b}`));
  const darkAt = (i: number) => {
    const k = order.indexOf(i);
    const t0 = darkFrom * d;
    const t1 = darkTo * d - FADE;
    return t0 + (count > 1 ? (k * (t1 - t0)) / (count - 1) : 0);
  };
  const lit = Array.from({ length: count }, (_, i) => 1 - ramp(frame, darkAt(i), darkAt(i) + FADE));
  const light = lit.reduce((a, b) => a + b, 0) / count;

  return (
    <SceneFrame caption={caption} captionTiming={captionTiming}>
      <Canvas scale={pushIn(frame, d, 0.04)} origin={[540, 700]}>
        <defs>
          <RoughFilter id="screens-rough" />
        </defs>
        <Glow id="screens-glow" cx={540} cy={GRID.top + (rows * pitch) / 2} r={620} rx={760} color={COLORS.line} opacity={0.2 * light} />
        <g transform={`translate(0 ${drift(frame, d, -6)})`} filter="url(#screens-rough)">
          {lit.map((l, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            return <Tv key={i} x={left + col * (w + GRID.gap)} y={GRID.top + GRID.antenna + row * pitch} w={w} h={h} lit={l} />;
          })}
        </g>
        <g transform={`translate(0 ${drift(frame, d, -16)})`} filter="url(#screens-rough)">
          <line x1={120} y1={FLOOR} x2={960} y2={FLOOR} {...lineStyle(3, 0.3)} />
          <ellipse cx={540} cy={FLOOR + 4} rx={70} ry={9} fill={COLORS.ink} opacity={0.8} />
          <Silhouette parts={personParts(540, FLOOR, 250)} rimOpacity={0.2 + 0.4 * light} />
        </g>
      </Canvas>
    </SceneFrame>
  );
};
