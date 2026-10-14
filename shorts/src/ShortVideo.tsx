import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { PaperGrain } from './components/PaperGrain';
import { Soundtrack } from './components/Soundtrack';
import {
  Cliff,
  type CliffProps,
  Desk,
  type DeskProps,
  Doors,
  type DoorsProps,
  Scanner,
  type ScannerProps,
  Screens,
  type ScreensProps,
  Sunrise,
  type SunriseProps,
} from './scenes';
import { COLORS } from './style/theme';

/** One scene in a script. Plain data, so a whole video can live in a JSON file or be passed with --props. */
export type SceneSpec = {
  seconds: number;
  /** How this scene comes in. Default "crossfade" (6 frames, centred on the cut). */
  transition?: 'crossfade' | 'cut';
} & (
  | { scene: 'desk'; props: DeskProps }
  | { scene: 'screens'; props: ScreensProps }
  | { scene: 'doors'; props: DoorsProps }
  | { scene: 'cliff'; props: CliffProps }
  | { scene: 'scanner'; props: ScannerProps }
  | { scene: 'sunrise'; props: SunriseProps }
);

export type ShortVideoProps = {
  scenes: SceneSpec[];
  /** File names in public/. Missing files are skipped. Defaults voice.mp3 / music.mp3. */
  voice?: string | null;
  music?: string | null;
  musicVolume?: number;
  crossfadeFrames?: number;
  grain?: number;
};

export const CROSSFADE_FRAMES = 6;

export const totalFrames = (scenes: SceneSpec[], fps: number) =>
  scenes.reduce((sum, s) => sum + Math.round(s.seconds * fps), 0);

export interface SceneSlot {
  /** First frame of the scene's Sequence (half a crossfade before its cut). */
  from: number;
  durationInFrames: number;
  /** Frame of the scene's cut in the script (where its `seconds` start counting). */
  cut: number;
  fade: number;
}

/**
 * Where each scene sits on the timeline. A crossfade overlaps the incoming scene by half the fade on each side of
 * the cut, so cuts stay exactly where the script puts them (3 s, 7 s, ...). Scene-relative frames (captions,
 * animations) count from `from`.
 */
export function sceneLayout(scenes: SceneSpec[], fps: number, crossfadeFrames = CROSSFADE_FRAMES): SceneSlot[] {
  const fadeOf = (s: SceneSpec | undefined, i: number) =>
    s && i > 0 && (s.transition ?? 'crossfade') === 'crossfade' ? crossfadeFrames : 0;
  let cut = 0;
  return scenes.map((s, i) => {
    const len = Math.round(s.seconds * fps);
    const fade = fadeOf(s, i);
    const pre = Math.floor(fade / 2);
    const post = Math.ceil(fadeOf(scenes[i + 1], i + 1) / 2);
    const slot = { from: cut - pre, durationInFrames: len + pre + post, cut, fade };
    cut += len;
    return slot;
  });
}

const renderScene = (s: SceneSpec) => {
  switch (s.scene) {
    case 'desk':
      return <Desk {...s.props} />;
    case 'screens':
      return <Screens {...s.props} />;
    case 'doors':
      return <Doors {...s.props} />;
    case 'cliff':
      return <Cliff {...s.props} />;
    case 'scanner':
      return <Scanner {...s.props} />;
    case 'sunrise':
      return <Sunrise {...s.props} />;
  }
};

const FadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const opacity = frames ? interpolate(frame, [0, frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Plays scenes back to back (see sceneLayout), with the grain over everything and the optional soundtrack. */
export const ShortVideo: React.FC<ShortVideoProps> = ({
  scenes,
  voice,
  music,
  musicVolume,
  crossfadeFrames = CROSSFADE_FRAMES,
  grain,
}) => {
  const { fps } = useVideoConfig();
  const layout = sceneLayout(scenes, fps, crossfadeFrames);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {scenes.map((s, i) => (
        <Sequence key={i} from={layout[i].from} durationInFrames={layout[i].durationInFrames} name={`${i + 1}. ${s.scene}`}>
          <FadeIn frames={layout[i].fade}>{renderScene(s)}</FadeIn>
        </Sequence>
      ))}
      <PaperGrain opacity={grain} />
      <Soundtrack voice={voice} music={music} musicVolume={musicVolume} />
    </AbsoluteFill>
  );
};
