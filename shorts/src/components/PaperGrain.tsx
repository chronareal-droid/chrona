import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';

/**
 * Static paper grain + a soft vignette, laid over the whole video once (not per scene, so crossfades
 * don't double it). The noise seed never changes, so the grain doesn't shimmer.
 */
export const PaperGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.09 }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="paper-fibre" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="11" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-fibre)" opacity={opacity * 0.45} />
        <rect width="100%" height="100%" filter="url(#paper-grain)" opacity={opacity} />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 60% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)' }} />
    </AbsoluteFill>
  );
};
