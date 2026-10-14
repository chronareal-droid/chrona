import { measureText } from '@remotion/layout-utils';
import { CAPTION } from '../style/theme';

export interface CaptionLayout {
  fontSize: number;
  lines: string[][];
  /** Width of each word in px at fontSize, per line. */
  widths: number[][];
}

/**
 * Fits a caption on at most 2 lines, as large as possible (capped at maxFontSize).
 * - "\n" in the text forces the line break (use it for semantic breaks: "16 channels.\n35M subscribers. Gone.").
 * - Otherwise one line is used if it fits at full size, else the most balanced 2-line split.
 * Widths are measured once at 100px and scaled (text width is linear in font size).
 */
export function layoutCaption(
  text: string,
  font: { fontFamily: string; fontWeight: number },
  opts: { maxWidth?: number; maxFontSize?: number; minFontSize?: number } = {},
): CaptionLayout {
  const maxWidth = (opts.maxWidth ?? CAPTION.maxWidth) * 0.97; // margin for rounding / kerning differences
  const maxSize = opts.maxFontSize ?? CAPTION.maxFontSize;
  const minSize = opts.minFontSize ?? CAPTION.minFontSize;

  const widthAt100 = (word: string) =>
    measureText({
      text: word,
      fontFamily: font.fontFamily,
      fontWeight: font.fontWeight,
      fontSize: 100,
      letterSpacing: CAPTION.letterSpacing,
      validateFontIsLoaded: true,
    }).width / 100;
  // Width of a line at font size 1.
  const lineWidth = (ws: string[]) => ws.reduce((a, w) => a + widthAt100(w), 0) + (ws.length - 1) * CAPTION.wordGapEm;
  const sizeFor = (lines: string[][]) => Math.min(maxSize, maxWidth / Math.max(...lines.map(lineWidth)));
  const clamp = (s: number) => Math.max(minSize, Math.floor(s));

  const withWidths = (fontSize: number, lines: string[][]): CaptionLayout => ({
    fontSize,
    lines,
    widths: lines.map((l) => l.map((w) => widthAt100(w) * fontSize)),
  });

  const forced = text.split('\n').map((l) => l.trim().split(/\s+/).filter(Boolean)).filter((l) => l.length);
  if (forced.length > 2) throw new Error(`Caption has more than 2 lines: "${text}"`);
  if (forced.length === 2) return withWidths(clamp(sizeFor(forced)), forced);

  const words = forced[0] ?? [];
  const single = sizeFor([words]);
  if (words.length < 2 || single >= maxSize) return withWidths(clamp(single), [words]);

  let best: string[][] = [words];
  let bestSize = single;
  for (let k = 1; k < words.length; k++) {
    const split = [words.slice(0, k), words.slice(k)];
    const s = sizeFor(split);
    if (s > bestSize) [best, bestSize] = [split, s];
  }
  return withWidths(clamp(bestSize), best);
}
