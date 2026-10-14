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
 * A standing / walking person, feet at (x, y), `h` tall. `walkPhase` in radians animates a gentle stride
 * (pass undefined to stand still). Symmetric, so it reads as front or back view.
 */
export function personParts(x: number, y: number, h: number, walkPhase?: number): Part[] {
  const walking = walkPhase !== undefined;
  const swing = walking ? Math.sin(walkPhase) : 0;
  const bob = walking ? -Math.abs(Math.cos(walkPhase)) * h * 0.012 : 0;
  const top = y - h + bob;
  const headR = h * 0.085;
  const sy = top + h * 0.2; // shoulders
  const hipY = y - h * 0.45 + bob;
  const legLen = y - hipY;
  const leg = (dx: number, theta: number): Part => ({
    kind: 'line',
    x1: x + dx,
    y1: hipY,
    x2: x + dx + legLen * Math.sin(theta),
    y2: hipY + legLen * Math.cos(theta) * 0.98,
    w: h * 0.075,
  });
  const arm = (dx: number, theta: number): Part => ({
    kind: 'line',
    x1: x + dx,
    y1: sy + h * 0.035,
    x2: x + dx + h * 0.33 * Math.sin(theta),
    y2: sy + h * 0.035 + h * 0.33 * Math.cos(theta),
    w: h * 0.055,
  });
  return [
    leg(-h * 0.035, 0.3 * swing),
    leg(h * 0.035, -0.3 * swing),
    arm(-h * 0.09, -0.06 - 0.18 * swing),
    arm(h * 0.09, 0.06 + 0.18 * swing),
    {
      kind: 'path',
      d: `M ${x - h * 0.1} ${sy + h * 0.03} Q ${x - h * 0.115} ${sy - h * 0.01} ${x - h * 0.05} ${sy - h * 0.02}
          L ${x + h * 0.05} ${sy - h * 0.02} Q ${x + h * 0.115} ${sy - h * 0.01} ${x + h * 0.1} ${sy + h * 0.03}
          L ${x + h * 0.085} ${hipY + h * 0.02} Q ${x} ${hipY + h * 0.045} ${x - h * 0.085} ${hipY + h * 0.02} Z`,
    },
    { kind: 'circle', cx: x, cy: top + headR, r: headR },
  ];
}

/** Static displacement for a slightly hand-drawn edge. Static seed, so lines never "boil". */
export const RoughFilter: React.FC<{ id: string; scale?: number }> = ({ id, scale = 3 }) => (
  <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
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
