import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CAPTION_WEIGHT, INTER, useFontReady } from '../style/fonts';
import { CAPTION, COLORS, withAlpha } from '../style/theme';
import { layoutCaption } from './captionLayout';

export interface CaptionTiming {
  /** Frame (relative to the scene) the first word pops in. Default 6, i.e. just after a crossfade. */
  start?: number;
  /** Frames between words. Default 4. */
  stagger?: number;
  /** Show every word fully from the first frame (use for the hook / cover frame). */
  instant?: boolean;
  /**
   * Explicit pop-in frame for each word (scene-relative), e.g. to land a word on a beat or a voice-over.
   * Words beyond the list follow on at `stagger`. While later words wait, each line stays centred on the
   * words already shown, gliding over as new ones arrive.
   */
  at?: number[];
}

export const Caption: React.FC<{ text: string; timing?: CaptionTiming }> = ({ text, timing = {} }) => {
  const ready = useFontReady();
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const layout = useMemo(
    () => (ready ? layoutCaption(text, { fontFamily: INTER, fontWeight: CAPTION_WEIGHT }) : null),
    [ready, text],
  );
  if (!layout) return null;

  const start = timing.start ?? 6;
  const stagger = timing.stagger ?? 4;
  const wordStart = (i: number) => {
    const at = timing.at ?? [];
    if (i < at.length) return at[i];
    return (at.length ? at[at.length - 1] + stagger * (i - at.length + 1) : start + stagger * i);
  };
  const { fontSize, lines, widths } = layout;
  const gap = fontSize * CAPTION.wordGapEm;
  const recentre = !timing.instant && !!timing.at?.length;
  const lineHeightPx = fontSize * CAPTION.lineHeight;
  const blockHeight = lineHeightPx * lines.length;
  const firstWordAt = timing.instant ? 0 : wordStart(0);
  const backdrop = timing.instant ? 1 : interpolate(frame, [firstWordAt, firstWordAt + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Per word: pop progress (0–1). Computed up front so a line can centre on its visible words.
  const progress: number[] = [];
  lines.flat().forEach((_, i) => {
    progress.push(timing.instant ? 1 : spring({ frame: frame - wordStart(i), fps, config: { damping: 15, stiffness: 190, mass: 0.6 } }));
  });
  let offset = 0;
  const lineShift = lines.map((line, li) => {
    const full = widths[li].reduce((a, w) => a + w, 0) + gap * (line.length - 1);
    const shown = widths[li].reduce((a, w, k) => a + (w + (k ? gap : 0)) * Math.min(1, progress[offset + k]), 0);
    offset += line.length;
    return recentre ? (full - shown) / 2 : 0;
  });

  let wordIndex = 0;
  return (
    <div style={{ position: 'absolute', left: 0, width, top: CAPTION.centerY - blockHeight / 2, height: blockHeight }}>
      {/* Soft dark pool behind the text so it reads over any illustration. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: CAPTION.maxWidth * 1.25,
          height: blockHeight + fontSize * 2.4,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(closest-side, ${withAlpha(COLORS.bg, 0.72)}, ${withAlpha(COLORS.bg, 0)})`,
          opacity: backdrop,
        }}
      />
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            columnGap: gap,
            height: lineHeightPx,
            alignItems: 'center',
            transform: `translateX(${lineShift[li]}px)`,
          }}
        >
          {line.map((word) => {
            const i = wordIndex++;
            const t = frame - wordStart(i);
            const p = progress[i];
            const opacity = timing.instant ? 1 : interpolate(t, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <span
                key={i}
                style={{
                  fontFamily: INTER,
                  fontWeight: CAPTION_WEIGHT,
                  fontSize,
                  letterSpacing: CAPTION.letterSpacing,
                  lineHeight: 1,
                  color: COLORS.text,
                  whiteSpace: 'pre',
                  display: 'inline-block',
                  opacity,
                  transform: `translateY(${(1 - p) * fontSize * 0.18}px) scale(${0.72 + 0.28 * p})`,
                  textShadow: `0 ${fontSize * 0.06}px ${fontSize * 0.3}px ${withAlpha('#000000', 0.55)}`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
