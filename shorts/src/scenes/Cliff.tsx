import React from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { Canvas, SceneFrame, type SceneCaptionProps } from '../components/SceneFrame';
import { lineStyle, personParts, RoughFilter, Silhouette } from '../components/doodle';
import { breathe, drift, pushIn } from '../components/motion';
import { COLORS } from '../style/theme';

export interface CliffProps extends SceneCaptionProps {
  /** Number of walkers in the line. Default 5. */
  walkers?: number;
  /** x of the cliff edge. Default 790. */
  edgeX?: number;
  /** Walking speed in px per frame. Default 1.1 (slow). */
  speed?: number;
}

const GROUND = 1380;
const WALKER_H = 200;
const STRIDE_PERIOD = 42; // frames per step cycle

/** A line of silhouettes walking slowly toward a cliff edge. */
export const Cliff: React.FC<CliffProps> = ({ caption, captionTiming, walkers = 5, edgeX = 790, speed = 1.1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  // The leader ends the scene a little short of the edge.
  const leaderStart = edgeX - 90 - speed * d;
  const stars = Array.from({ length: 26 }, (_, i) => ({
    x: random(`star-x-${i}`) * 1080,
    y: 190 + random(`star-y-${i}`) * 560,
    r: 1.4 + random(`star-r-${i}`) * 1.6,
    o: 0.12 + random(`star-o-${i}`) * 0.3,
  }));

  return (
    <SceneFrame caption={caption} captionTiming={captionTiming}>
      <Canvas scale={pushIn(frame, d, 0.04)} origin={[edgeX - 80, GROUND - 100]}>
        <defs>
          <RoughFilter id="cliff-rough" />
        </defs>
        {/* sky: faint stars and a thin crescent, drifting very slowly */}
        <g transform={`translate(${drift(frame, d, -8)} 0)`}>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={COLORS.line} opacity={s.o * breathe(frame, 80, 0.7, 1, i)} />
          ))}
          <path d="M 868 372 A 46 46 0 1 1 822 326 A 34 34 0 1 0 868 372 Z" {...lineStyle(3, 0.4)} />
        </g>

        {/* far hills beyond the drop (slow parallax) */}
        <g transform={`translate(${drift(frame, d, -22)} 0)`} filter="url(#cliff-rough)">
          <path d={`M 640 1640 Q 760 1520 880 1590 Q 980 1500 1120 1580 L 1160 1920 L 640 1920 Z`} opacity={0.7} {...lineStyle(2.5, 0.18, COLORS.navy)} />
        </g>
        {/* mist far below */}
        <g transform={`translate(${drift(frame, d, -40)} 0)`} {...lineStyle(3, 0.12)}>
          <line x1={760} y1={1700} x2={1060} y2={1700} />
          <line x1={840} y1={1748} x2={1140} y2={1748} />
        </g>

        <g filter="url(#cliff-rough)">
          {/* ground and cliff face */}
          <path
            d={`M -60 ${GROUND} L ${edgeX} ${GROUND} L ${edgeX - 18} ${GROUND + 90} L ${edgeX + 6} ${GROUND + 170}
                L ${edgeX - 30} ${GROUND + 300} L ${edgeX - 12} ${GROUND + 420} L ${edgeX - 50} 1960 L -60 1960 Z`}
            fill={COLORS.slate}
          />
          <path
            d={`M -60 ${GROUND} L ${edgeX} ${GROUND} L ${edgeX - 18} ${GROUND + 90} L ${edgeX + 6} ${GROUND + 170}
                L ${edgeX - 30} ${GROUND + 300} L ${edgeX - 12} ${GROUND + 420} L ${edgeX - 50} 1960`}
            {...lineStyle(4, 0.6)}
          />
          {/* a few pebbles near the edge */}
          <circle cx={edgeX - 40} cy={GROUND - 4} r={5} fill={COLORS.line} opacity={0.35} />
          <circle cx={edgeX - 120} cy={GROUND - 3} r={3.5} fill={COLORS.line} opacity={0.25} />

          {Array.from({ length: walkers }, (_, i) => {
            const h = WALKER_H * (0.92 + 0.14 * random(`walker-h-${i}`));
            const x = leaderStart - i * 105 + speed * frame;
            const phase = (frame / STRIDE_PERIOD) * Math.PI * 2 + i * 1.3;
            return <Silhouette key={i} parts={personParts(x, GROUND, h, phase)} rimOpacity={0.5} />;
          })}
        </g>
      </Canvas>
    </SceneFrame>
  );
};
