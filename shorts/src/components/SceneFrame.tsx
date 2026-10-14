import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../style/theme';
import { Caption, type CaptionTiming } from './Caption';

/** Every scene: flat background, the scene's art, and its caption on top. */
export const SceneFrame: React.FC<{ caption: string; captionTiming?: CaptionTiming; children: React.ReactNode }> = ({
  caption,
  captionTiming,
  children,
}) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
    {children}
    <Caption text={caption} timing={captionTiming} />
  </AbsoluteFill>
);

/** Full-frame SVG canvas in video pixels (1080×1920), optionally pushed in around a focal point. */
export const Canvas: React.FC<{
  scale?: number;
  origin?: [number, number];
  translate?: [number, number];
  children: React.ReactNode;
}> = ({ scale = 1, origin = [540, 960], translate = [0, 0], children }) => (
  <AbsoluteFill
    style={{
      transform: `translate(${translate[0]}px, ${translate[1]}px) scale(${scale})`,
      transformOrigin: `${origin[0]}px ${origin[1]}px`,
    }}
  >
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ overflow: 'visible' }}>
      {children}
    </svg>
  </AbsoluteFill>
);

export interface SceneCaptionProps {
  caption: string;
  captionTiming?: CaptionTiming;
}
