import React from 'react';
import { getStaticFiles, Html5Audio, interpolate, staticFile, useVideoConfig } from 'remotion';

export interface SoundtrackProps {
  /** File names in public/. A file that isn't there is skipped, so the video renders silent. */
  voice?: string | null;
  music?: string | null;
  /** Music level when nobody is speaking (0–1). */
  musicVolume?: number;
  /** Spans (seconds) where the voice speaks: the music dips under them. */
  duck?: [number, number][];
  /** Music level while ducked, as a fraction of musicVolume. */
  duckTo?: number;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 1 outside the spans, `to` inside them, with short ramps (down 0.15 s before speech, back up 0.35 s after). */
export function duckGain(t: number, spans: [number, number][], to: number): number {
  let g = 1;
  for (const [a, b] of spans) {
    const w = Math.min(interpolate(t, [a - 0.15, a], [0, 1], clamp), interpolate(t, [b, b + 0.35], [1, 0], clamp));
    g = Math.min(g, 1 - (1 - to) * w);
  }
  return g;
}

/**
 * Optional voice-over and music from public/. The music loops if it's shorter than the video, fades in and out
 * once, and ducks under the voice.
 */
export const Soundtrack: React.FC<SoundtrackProps> = ({
  voice = 'voice.mp3',
  music = 'music.mp3',
  musicVolume = 0.15,
  duck = [],
  duckTo = 0.55,
}) => {
  const { durationInFrames, fps } = useVideoConfig();
  const available = new Set(getStaticFiles().map((f) => f.name));
  const has = (name: string | null | undefined): name is string => !!name && available.has(name);
  return (
    <>
      {has(voice) && <Html5Audio src={staticFile(voice)} />}
      {has(music) && (
        <Html5Audio
          src={staticFile(music)}
          loop
          // the fade curve counts frames across loops, so it fades in once and out at the very end
          loopVolumeCurveBehavior="extend"
          volume={(f) =>
            musicVolume *
            duckGain(f / fps, duck, duckTo) *
            interpolate(f, [0, fps * 0.3, durationInFrames - fps, durationInFrames - 1], [0, 1, 1, 0], clamp)
          }
        />
      )}
    </>
  );
};
