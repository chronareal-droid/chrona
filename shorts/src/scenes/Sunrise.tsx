import React from 'react';
import { interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { Canvas, SceneFrame, type SceneCaptionProps } from '../components/SceneFrame';
import { Glow, lineStyle, RoughFilter } from '../components/doodle';
import { drift, gentle, pushIn, ramp } from '../components/motion';
import { COLORS, withAlpha } from '../style/theme';

export interface SunriseProps extends SceneCaptionProps {
  /** Fraction of the scene the sun takes to rise. Default 0.85. */
  riseFraction?: number;
}

type Kind = 'monitor' | 'phone' | 'tower' | 'tv';
interface Building {
  x: number;
  w: number;
  h: number;
  kind: Kind;
}

const BASE = 1640;

// Hand-placed so the skyline reads as screens of different kinds. Tall at the sides, low in the middle,
// leaving a notch around x ≈ 540 for the sun to crest through.
const NEAR: Building[] = [
  { x: -20, w: 150, h: 360, kind: 'tower' },
  { x: 140, w: 120, h: 280, kind: 'phone' },
  { x: 270, w: 200, h: 200, kind: 'monitor' },
  { x: 480, w: 120, h: 150, kind: 'tv' },
  { x: 615, w: 175, h: 230, kind: 'tower' },
  { x: 800, w: 120, h: 330, kind: 'phone' },
  { x: 935, w: 165, h: 400, kind: 'tower' },
];
const FAR: Building[] = [
  { x: 30, w: 140, h: 470, kind: 'tower' },
  { x: 190, w: 130, h: 400, kind: 'phone' },
  { x: 340, w: 130, h: 260, kind: 'tower' },
  { x: 610, w: 150, h: 250, kind: 'monitor' },
  { x: 770, w: 120, h: 450, kind: 'tower' },
  { x: 900, w: 150, h: 520, kind: 'phone' },
];

const Screen: React.FC<{ b: Building; fill: string; warm: number; layer: string }> = ({ b, fill, warm, layer }) => {
  const top = BASE - b.h;
  const windows: React.ReactNode[] = [];
  const win = (x: number, y: number, w: number, h: number, i: number) => {
    const catches = random(`${layer}-win-${b.x}-${i}`) < 0.45;
    windows.push(
      <rect key={i} x={x} y={y} width={w} height={h} rx={4} fill={catches ? COLORS.amber : COLORS.line} opacity={catches ? 0.08 + 0.4 * warm : 0.1} />,
    );
  };
  let body: React.ReactNode;
  if (b.kind === 'tower') {
    // a video wall: a stack of 16:9 screens, each with its own bezel
    const pw = b.w - 28;
    const ph = (pw * 9) / 16;
    const bezels: React.ReactNode[] = [];
    for (let r = 0; r < Math.floor((b.h - 14) / (ph + 14)); r++) {
      const py = top + 14 + r * (ph + 14);
      bezels.push(<rect key={`bz${r}`} x={b.x + 10} y={py - 4} width={pw + 8} height={ph + 8} rx={7} {...lineStyle(2.5, 0.35)} />);
      win(b.x + 14, py, pw, ph, r);
    }
    body = (
      <>
        <rect x={b.x} y={top} width={b.w} height={b.h + 40} rx={10} {...lineStyle(3, 0.45, fill)} />
        {bezels}
      </>
    );
  } else if (b.kind === 'phone') {
    body = (
      <>
        <rect x={b.x} y={top} width={b.w} height={b.h + 40} rx={26} {...lineStyle(3, 0.45, fill)} />
        <line x1={b.x + b.w / 2 - 14} y1={top + 18} x2={b.x + b.w / 2 + 14} y2={top + 18} {...lineStyle(4, 0.4)} />
      </>
    );
    win(b.x + 14, top + 36, b.w - 28, b.h - 60, 0);
  } else if (b.kind === 'monitor') {
    const sh = b.h * 0.7;
    body = (
      <>
        {/* a solid plinth under the screen, so no glow shows through at street level */}
        <rect x={b.x + b.w * 0.12} y={top + sh - 6} width={b.w * 0.76} height={b.h - sh + 46} rx={8} {...lineStyle(3, 0.4, fill)} />
        <rect x={b.x} y={top} width={b.w} height={sh} rx={12} {...lineStyle(3, 0.45, fill)} />
      </>
    );
    win(b.x + 14, top + 14, b.w - 28, sh - 28, 0);
  } else {
    body = (
      <>
        <path d={`M ${b.x + b.w / 2 - 30} ${top - 40} L ${b.x + b.w / 2} ${top} L ${b.x + b.w / 2 + 34} ${top - 34}`} {...lineStyle(3, 0.4)} />
        <rect x={b.x} y={top} width={b.w} height={b.h + 40} rx={16} {...lineStyle(3, 0.45, fill)} />
      </>
    );
    win(b.x + 16, top + 16, b.w - 32, b.h * 0.55, 0);
  }
  return (
    <g>
      {body}
      {windows}
    </g>
  );
};

/** An amber sunrise glowing up from behind a skyline made of screens. */
export const Sunrise: React.FC<SunriseProps> = ({ caption, captionTiming, riseFraction = 0.85 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const rise = ramp(frame, 0, d * riseFraction, gentle);
  const sunY = interpolate(rise, [0, 1], [1760, 1300]);

  return (
    <SceneFrame caption={caption} captionTiming={captionTiming}>
      <Canvas scale={pushIn(frame, d, 0.05)} origin={[540, 1360]}>
        <defs>
          <RoughFilter id="sunrise-rough" />
          <linearGradient id="sunrise-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.amber} stopOpacity={0} />
            <stop offset="55%" stopColor={COLORS.amber} stopOpacity={0.05} />
            <stop offset="100%" stopColor={COLORS.amber} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        {/* the sky warms from the horizon up */}
        <rect x={0} y={0} width={1080} height={1920} fill="url(#sunrise-sky)" opacity={rise} />
        <Glow id="sunrise-halo" cx={540} cy={sunY} r={760} rx={900} color={COLORS.amber} opacity={0.12 + 0.4 * rise} />
        <circle cx={540} cy={sunY} r={170} fill={COLORS.amber} opacity={0.18 + 0.55 * rise} />
        <circle cx={540} cy={sunY} r={170} fill="none" stroke={withAlpha(COLORS.amber, 0.6)} strokeWidth={4} opacity={rise} />

        <g filter="url(#sunrise-rough)">
          <g transform={`translate(0 ${drift(frame, d, -10)})`}>
            {FAR.map((b, i) => (
              <Screen key={i} b={b} fill={COLORS.navy} warm={rise * 0.6} layer="far" />
            ))}
          </g>
          <g transform={`translate(0 ${drift(frame, d, -24)})`}>
            {NEAR.map((b, i) => (
              <Screen key={i} b={b} fill={COLORS.slate} warm={rise} layer="near" />
            ))}
            <rect x={-40} y={BASE + 30} width={1160} height={400} fill={COLORS.bg} />
            <line x1={-40} y1={BASE + 30} x2={1120} y2={BASE + 30} {...lineStyle(3, 0.35)} />
          </g>
        </g>
      </Canvas>
    </SceneFrame>
  );
};
