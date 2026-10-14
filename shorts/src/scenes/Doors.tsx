import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Canvas, SceneFrame, type SceneCaptionProps } from '../components/SceneFrame';
import { Glow, lineStyle, personParts, RoughFilter, Silhouette } from '../components/doodle';
import { breathe, pushIn } from '../components/motion';
import { COLORS } from '../style/theme';

export interface DoorsProps extends SceneCaptionProps {
  /** Number of doors on the back wall. Default 3. */
  count?: number;
}

// One-point perspective hallway. The back wall holds the doors; the floor runs toward the camera.
const WALL = { left: 110, right: 970, top: 170, bottom: 800 };
const DOOR = { top: 255, width: 186 };
const NEAR = { left: -260, right: 1340, bottom: 1920, top: -80 };
const FIGURE_FEET = 1460;

/** A dark hallway of tall doors, each with a small red light above it, and a tiny figure in front. */
export const Doors: React.FC<DoorsProps> = ({ caption, captionTiming, count = 3 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const spacing = (WALL.right - WALL.left) / count;
  const doorW = Math.min(DOOR.width, spacing * 0.72);
  const floorY = (k: number, n: number) => WALL.bottom + (NEAR.bottom - WALL.bottom) * (k / n) ** 2;
  const wallW = WALL.right - WALL.left;

  return (
    <SceneFrame caption={caption} captionTiming={captionTiming}>
      <Canvas scale={pushIn(frame, d, 0.07)} origin={[540, 520]}>
        <defs>
          <RoughFilter id="doors-rough" />
          <linearGradient id="doors-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.navy} stopOpacity={0.5} />
            <stop offset="100%" stopColor={COLORS.bg} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* walls, ceiling and floor planes */}
        <polygon points={`${WALL.left},${WALL.top} ${WALL.right},${WALL.top} ${WALL.right},${WALL.bottom} ${WALL.left},${WALL.bottom}`} fill={COLORS.slate} opacity={0.32} />
        <polygon points={`${NEAR.left},${NEAR.top} ${WALL.left},${WALL.top} ${WALL.left},${WALL.bottom} ${NEAR.left},${NEAR.bottom}`} fill={COLORS.navy} opacity={0.28} />
        <polygon points={`${NEAR.right},${NEAR.top} ${WALL.right},${WALL.top} ${WALL.right},${WALL.bottom} ${NEAR.right},${NEAR.bottom}`} fill={COLORS.navy} opacity={0.28} />
        <polygon points={`${WALL.left},${WALL.bottom} ${WALL.right},${WALL.bottom} ${NEAR.right},${NEAR.bottom} ${NEAR.left},${NEAR.bottom}`} fill="url(#doors-floor)" />

        <g filter="url(#doors-rough)">
          {/* hallway edges */}
          <g {...lineStyle(3, 0.32)}>
            <line x1={WALL.left} y1={WALL.top} x2={NEAR.left} y2={NEAR.top} />
            <line x1={WALL.right} y1={WALL.top} x2={NEAR.right} y2={NEAR.top} />
            <line x1={WALL.left} y1={WALL.bottom} x2={NEAR.left} y2={NEAR.bottom} />
            <line x1={WALL.right} y1={WALL.bottom} x2={NEAR.right} y2={NEAR.bottom} />
            <rect x={WALL.left} y={WALL.top} width={wallW} height={WALL.bottom - WALL.top} />
          </g>
          {/* floor boards: perspective-spaced cross lines and lines converging on the back wall */}
          <g {...lineStyle(2.5, 0.13)}>
            {[1, 2, 3, 4].map((k) => {
              const y = floorY(k, 5);
              const t = (y - WALL.bottom) / (NEAR.bottom - WALL.bottom);
              return <line key={`h${k}`} x1={WALL.left + (NEAR.left - WALL.left) * t} y1={y} x2={WALL.right + (NEAR.right - WALL.right) * t} y2={y} />;
            })}
            {[1, 2, 3, 4, 5].map((j) => {
              const xTop = WALL.left + (wallW * j) / 6;
              const xBottom = NEAR.left + ((NEAR.right - NEAR.left) * j) / 6;
              return <line key={`v${j}`} x1={xTop} y1={WALL.bottom} x2={xBottom} y2={NEAR.bottom} />;
            })}
          </g>

          {Array.from({ length: count }, (_, i) => {
            const cx = WALL.left + spacing * (i + 0.5);
            const x = cx - doorW / 2;
            const glow = breathe(frame, 54, 0.55, 1, i * 1.7);
            return (
              <g key={i}>
                {/* door */}
                <rect x={x} y={DOOR.top} width={doorW} height={WALL.bottom - DOOR.top} rx={5} {...lineStyle(3.5, 0.55, COLORS.ink)} />
                <rect x={x + 22} y={DOOR.top + 26} width={doorW - 44} height={190} rx={4} {...lineStyle(2.5, 0.2)} />
                <rect x={x + 22} y={DOOR.top + 246} width={doorW - 44} height={240} rx={4} {...lineStyle(2.5, 0.2)} />
                <circle cx={x + doorW * 0.84} cy={DOOR.top + 290} r={6} fill={COLORS.line} opacity={0.5} />
                {/* light leaking under the door */}
                <line x1={x + 14} y1={WALL.bottom - 3} x2={x + doorW - 14} y2={WALL.bottom - 3} stroke={COLORS.line} strokeWidth={3} opacity={0.3} />
                {/* small red light above */}
                <rect x={cx - 16} y={DOOR.top - 44} width={32} height={16} rx={5} {...lineStyle(2.5, 0.4, COLORS.slate)} />
                <Glow id={`doors-light-${i}`} cx={cx} cy={DOOR.top - 36} r={60} color={COLORS.signal} opacity={0.55 * glow} />
                <circle cx={cx} cy={DOOR.top - 36} r={7} fill={COLORS.signal} opacity={0.65 + 0.35 * glow} />
              </g>
            );
          })}

          {/* tiny figure facing the doors */}
          <ellipse cx={540} cy={FIGURE_FEET + 4} rx={46} ry={7} fill={COLORS.ink} opacity={0.8} />
          <Silhouette parts={personParts(540, FIGURE_FEET, 165)} rimOpacity={0.45} />
        </g>
      </Canvas>
    </SceneFrame>
  );
};
