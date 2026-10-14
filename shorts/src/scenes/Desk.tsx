import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Canvas, SceneFrame, type SceneCaptionProps } from '../components/SceneFrame';
import { Glow, lineStyle, type Part, RoughFilter, Silhouette } from '../components/doodle';
import { breathe, pushIn } from '../components/motion';
import { COLORS } from '../style/theme';

const FLOOR = 1560;
const DESK_TOP = 1380;
const HIP: [number, number] = [360, 1430];
const MONITOR = { x: 640, y: 1170, w: 270, h: 175 };

/** Seated figure facing right, hands on the keyboard. `typing` (0–1) sets how fast the hands move. */
function seatedParts(frame: number, typing: number): { lower: Part[]; upper: Part[] } {
  const [hx, hy] = HIP;
  // Fast but tiny, smooth key taps: two hands out of phase.
  const tapA = typing ? Math.sin(frame * 0.9 * typing) * 3.5 : 0;
  const tapB = typing ? Math.sin(frame * 0.9 * typing + 2.1) * 3.5 : 0;
  const leanFwd = typing ? 6 : 0;
  return {
    lower: [
      { kind: 'line', x1: hx, y1: hy - 8, x2: hx + 110, y2: hy - 2, w: 34 },
      { kind: 'line', x1: hx + 110, y1: hy - 2, x2: hx + 118, y2: FLOOR - 6, w: 26 },
      { kind: 'line', x1: hx + 118, y1: FLOOR - 6, x2: hx + 150, y2: FLOOR - 4, w: 15 },
    ],
    upper: [
      // far arm (slightly offset), torso, near arm, head
      { kind: 'line', x1: hx + 18, y1: hy - 146, x2: hx + 92 + leanFwd, y2: hy - 66, w: 22 },
      { kind: 'line', x1: hx + 92 + leanFwd, y1: hy - 66, x2: hx + 178 + leanFwd, y2: hy - 52 + tapB, w: 19 },
      {
        kind: 'path',
        d: `M ${hx - 40} ${hy - 150} Q ${hx - 52} ${hy - 60} ${hx - 32} ${hy + 2} L ${hx + 42} ${hy + 2}
            Q ${hx + 48} ${hy - 72} ${hx + 26 + leanFwd} ${hy - 160} Q ${hx - 4} ${hy - 182} ${hx - 40} ${hy - 150} Z`,
      },
      { kind: 'line', x1: hx + 8, y1: hy - 140, x2: hx + 82 + leanFwd, y2: hy - 58, w: 26 },
      { kind: 'line', x1: hx + 82 + leanFwd, y1: hy - 58, x2: hx + 166 + leanFwd, y2: hy - 44 + tapA, w: 22 },
      { kind: 'circle', cx: hx + 14 + leanFwd, cy: hy - 210, r: 40 },
    ],
  };
}

/**
 * The desk, chair, glowing monitor and seated figure, in frame coordinates (lower part of the frame).
 * Reused by Desk and Scanner.
 */
export const DeskSetup: React.FC<{ frame: number; typing?: number; glow?: number; window?: boolean; idPrefix: string }> = ({
  frame,
  typing = 0,
  glow = 1,
  window = true,
  idPrefix,
}) => {
  const { lower, upper } = seatedParts(frame, typing);
  const m = MONITOR;
  const screenGlow = glow * breathe(frame, 70, 0.9, 1);
  return (
    <g>
      <defs>
        <RoughFilter id={`${idPrefix}-rough`} />
        <linearGradient id={`${idPrefix}-screen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.line} stopOpacity={0.55} />
          <stop offset="100%" stopColor={COLORS.line} stopOpacity={0.25} />
        </linearGradient>
      </defs>
      {/* light spilling from the monitor onto the wall, desk and figure */}
      <Glow id={`${idPrefix}-spill`} cx={m.x + m.w / 2 - 40} cy={m.y + m.h / 2} r={460} rx={560} color={COLORS.line} opacity={0.2 * screenGlow} />

      <g filter={`url(#${idPrefix}-rough)`}>
        {/* a faint night window on the back wall */}
        {window && (
          <>
            <g {...lineStyle(3, 0.22)}>
              <rect x={150} y={330} width={250} height={360} rx={6} />
              <line x1={275} y1={330} x2={275} y2={690} />
              <line x1={150} y1={510} x2={400} y2={510} />
              <path d="M 352 392 A 26 26 0 1 1 326 366 A 19 19 0 1 0 352 392 Z" strokeOpacity={0.3} />
            </g>
            <line x1={130} y1={698} x2={420} y2={698} {...lineStyle(4, 0.2)} />
          </>
        )}
        {/* floor */}
        <line x1={90} y1={FLOOR} x2={990} y2={FLOOR} {...lineStyle(3, 0.35)} />
        {/* chair */}
        <line x1={HIP[0] - 58} y1={HIP[1] + 10} x2={HIP[0] - 80} y2={HIP[1] - 150} {...lineStyle(9, 0.5)} />
        <rect x={HIP[0] - 70} y={HIP[1] + 4} width={122} height={14} rx={7} {...lineStyle(3, 0.5, COLORS.slate)} />
        <line x1={HIP[0] - 8} y1={HIP[1] + 18} x2={HIP[0] - 8} y2={FLOOR - 14} {...lineStyle(7, 0.45)} />
        <line x1={HIP[0] - 60} y1={FLOOR - 10} x2={HIP[0] + 44} y2={FLOOR - 10} {...lineStyle(6, 0.45)} />

        <Silhouette parts={lower} />

        {/* desk */}
        <rect x={470} y={DESK_TOP} width={520} height={16} rx={6} {...lineStyle(3, 0.6, COLORS.slate)} />
        <line x1={500} y1={DESK_TOP + 16} x2={500} y2={FLOOR} {...lineStyle(6, 0.5)} />
        <line x1={960} y1={DESK_TOP + 16} x2={960} y2={FLOOR} {...lineStyle(6, 0.5)} />

        {/* monitor */}
        <rect x={m.x + m.w / 2 - 12} y={m.y + m.h} width={24} height={DESK_TOP - m.y - m.h} {...lineStyle(3, 0.5, COLORS.slate)} />
        <rect x={m.x + m.w / 2 - 55} y={DESK_TOP - 7} width={110} height={8} rx={4} {...lineStyle(3, 0.5, COLORS.slate)} />
        <rect x={m.x} y={m.y} width={m.w} height={m.h} rx={14} {...lineStyle(4, 0.75, COLORS.navy)} />
        <rect x={m.x + 14} y={m.y + 14} width={m.w - 28} height={m.h - 28} rx={8} fill={`url(#${idPrefix}-screen)`} opacity={screenGlow} />
        <g opacity={0.6 * screenGlow}>
          <line x1={m.x + 34} y1={m.y + 48} x2={m.x + 150} y2={m.y + 48} stroke={COLORS.bg} strokeWidth={8} strokeLinecap="round" />
          <line x1={m.x + 34} y1={m.y + 78} x2={m.x + 210} y2={m.y + 78} stroke={COLORS.bg} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
          <line x1={m.x + 34} y1={m.y + 104} x2={m.x + 180} y2={m.y + 104} stroke={COLORS.bg} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
        </g>
        {/* keyboard */}
        <rect x={510} y={DESK_TOP - 9} width={150} height={9} rx={4} {...lineStyle(2.5, 0.6, COLORS.slate)} />

        <Silhouette parts={upper} />
      </g>
    </g>
  );
};

export interface DeskProps extends SceneCaptionProps {
  /** Hands typing speed, 0 (still) to ~1.5 (fast). Default 0. */
  typing?: number;
  /** Camera push-in amount over the scene. Default 0.1. */
  pushAmount?: number;
}

/** A lone silhouette at a desk, lit by a monitor; slow push-in toward the screen. */
export const Desk: React.FC<DeskProps> = ({ caption, captionTiming, typing = 0, pushAmount = 0.1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <SceneFrame caption={caption} captionTiming={captionTiming}>
      <Canvas scale={pushIn(frame, durationInFrames, pushAmount)} origin={[MONITOR.x + MONITOR.w / 2, MONITOR.y + MONITOR.h / 2]}>
        <DeskSetup frame={frame} typing={typing} idPrefix="desk" />
      </Canvas>
    </SceneFrame>
  );
};
