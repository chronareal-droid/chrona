import React from 'react';
import { getStaticFiles, Html5Audio, interpolate, staticFile, useVideoConfig } from 'remotion';

/**
 * Optional voice-over and music from public/. A file that isn't there is skipped, so the video renders silent.
 * Music sits under the voice at `musicVolume` (default 15%) with short fades at both ends.
 */
export const Soundtrack: React.FC<{ voice?: string | null; music?: string | null; musicVolume?: number }> = ({
  voice = 'voice.mp3',
  music = 'music.mp3',
  musicVolume = 0.15,
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
          volume={(f) =>
            musicVolume *
            interpolate(f, [0, fps * 0.5, durationInFrames - fps, durationInFrames - 1], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      )}
    </>
  );
};
