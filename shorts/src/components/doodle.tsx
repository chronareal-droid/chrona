// SVG building blocks for the flat doodle look: silhouettes with a soft grey rim, glows, a static
// hand-drawn wobble filter. Shapes only; no images.
import React from 'react';
import { COLORS } from '../style/theme';

export type Part =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'path'; d: string }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; w: number };

const draw = (p: Part, color: string, extra: number, key: number) => {
  switch (p.kind) {
    case 'circle':
      return <circle key={key} cx={p.cx} cy={p.cy} r={p.r} fill={color} stroke={color} strokeWidth={extra * 2} />;
    case 'path':
      return <path key={key} d={p.d} fill={color} stroke={color} strokeWidth={extra * 2} strokeLinejoin="round" />;
    case 'line':
      return (
        <line key={key} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={color} strokeWidth={p.w + extra * 2} strokeLinecap="round" />
      );
  }
};

/** A quiet silhouette: ink shapes over a slightly larger grey copy, so only a thin rim of line colour shows. */
export const Silhouette: React.FC<{ parts: Part[]; rim?: number; rimOpacity?: number; fill?: string }> = ({
  parts,
  rim = 2.5,
  rimOpacity = 0.55,
  fill = COLORS.ink,
}) => (
  <g>
    <g opacity={rimOpacity}>{parts.map((p, i) => draw(p, COLORS.line, rim, i))}</g>
    <g>{parts.map((p, i) => draw(p, fill, 0, i))}</g>
  </g>
);

/**
 * A standing person, feet at (x, y), `h` tall. Symmetric, so it reads as front or back view.
 * Pass `walk` for a side-on walking pose instead (see walkingParts).
 */
export function personParts(x: number, y: number, h: number, walk?: { phase: number; stride: number }): Part[] {
  if (walk) return walkingParts(x, y, h, walk.phase, walk.stride);
  const headR = h * 0.085;
  const top = y - h;
  const sy = top + h * 0.2; // shoulders
  const hipY = y - h * 0.45;
  return [
    { kind: 'line', x1: x - h * 0.035, y1: hipY, x2: x - h * 0.035, y2: y - h * 0.01, w: h * 0.075 },
    { kind: 'line', x1: x + h * 0.035, y1: hipY, x2: x + h * 0.035, y2: y - h * 0.01, w: h * 0.075 },
    { kind: 'line', x1: x - h * 0.09, y1: sy + h * 0.035, x2: x - h * 0.11, y2: sy + h * 0.36, w: h * 0.055 },
    { kind: 'line', x1: x + h * 0.09, y1: sy + h * 0.035, x2: x + h * 0.11, y2: sy + h * 0.36, w: h * 0.055 },
    torso(x, sy, hipY, h, 0.1, 0.085),
    { kind: 'circle', cx: x, cy: top + headR, r: headR },
  ];
}

const torso = (x: number, sy: number, hipY: number, h: number, shoulderHalf: number, hipHalf: number): Part => ({
  kind: 'path',
  d: `M ${x - h * shoulderHalf} ${sy + h * 0.03} Q ${x - h * (shoulderHalf + 0.015)} ${sy - h * 0.01} ${x - h * 0.05} ${sy - h * 0.02}
      L ${x + h * 0.05} ${sy - h * 0.02} Q ${x + h * (shoulderHalf + 0.015)} ${sy - h * 0.01} ${x + h * shoulderHalf} ${sy + h * 0.03}
      L ${x + h * hipHalf} ${hipY + h * 0.02} Q ${x} ${hipY + h * 0.045} ${x - h * hipHalf} ${hipY + h * 0.02} Z`,
});

/** Leg length of a person `h` tall (hip to sole). Use it to size a stride that matches walking speed. */
export const legLength = (h: number) => h * 0.45;

/**
 * Side-on walk, facing right: both legs swing from one hip with opposite angles (±stride radians), the arms
 * counter-swing from one shoulder, and the hip rides on the legs (it dips at full stride). For planted feet,
 * use stride ≈ asin(speed · period / (4 · legLength)).
 */
export function walkingParts(x: number, y: number, h: number, phase: number, stride: number): Part[] {
  const swing = Math.sin(phase);
  const legLen = legLength(h);
  const theta = stride * swing;
  const hipY = y - legLen * Math.cos(theta);
  const dip = y - legLen - hipY; // ≤ 0: the body drops a little at full stride
  const top = y - h - dip;
  const headR = h * 0.085;
  const sy = top + h * 0.2;
  const lean = h * 0.02; // slight forward lean toward the direction of travel
  const leg = (t: number): Part => ({
    kind: 'line',
    x1: x,
    y1: hipY,
    x2: x + legLen * Math.sin(t),
    y2: hipY + legLen * Math.cos(t),
    w: h * 0.075,
  });
  const arm = (t: number): Part => ({
    kind: 'line',
    x1: x + lean,
    y1: sy + h * 0.035,
    x2: x + lean + h * 0.32 * Math.sin(t),
    y2: sy + h * 0.035 + h * 0.32 * Math.cos(t),
    w: h * 0.05,
  });
  return [
    leg(-theta),
    arm(1.6 * theta), // far arm swings with the near leg
    leg(theta),
    torso(x + lean * 0.5, sy, hipY, h, 0.07, 0.065),
    arm(-1.6 * theta),
    { kind: 'circle', cx: x + lean * 1.4, cy: top + headR, r: headR },
  ];
}

/**
 * Static displacement for a slightly hand-drawn edge. Static seed, so lines never "boil".
 * sRGB interpolation keeps near-black ink exact (the default linearRGB rounds it up to the background's level).
 */
export const RoughFilter: React.FC<{ id: string; scale?: number }> = ({ id, scale = 3 }) => (
  <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

/** Radial glow: a gradient definition plus the circle that uses it. */
export const Glow: React.FC<{ id: string; cx: number; cy: number; r: number; color: string; opacity?: number; rx?: number }> = ({
  id,
  cx,
  cy,
  r,
  color,
  opacity = 1,
  rx,
}) => (
  <>
    <defs>
      <radialGradient id={id}>
        <stop offset="0%" stopColor={color} stopOpacity={1} />
        <stop offset="45%" stopColor={color} stopOpacity={0.35} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <ellipse cx={cx} cy={cy} rx={rx ?? r} ry={r} fill={`url(#${id})`} opacity={opacity} />
  </>
);

/** A doodle stroke in the soft grey line colour; `fill` defaults to none (an outline). */
export const lineStyle = (width = 4, opacity = 0.7, fill = 'none') =>
  ({ stroke: COLORS.line, strokeWidth: width, strokeOpacity: opacity, strokeLinecap: 'round', strokeLinejoin: 'round', fill }) as const;
