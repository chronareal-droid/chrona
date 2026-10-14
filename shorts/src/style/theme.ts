// The visual language for every video in this style. Change it here, not in scenes.

export const COLORS = {
  bg: '#0f1115',
  slate: '#2a2f3a',
  navy: '#1c2540',
  line: '#9aa3b2', // soft grey doodle lines
  amber: '#f2a33a', // the ONE accent: use sparingly
  ink: '#07080b', // silhouettes (darker than bg, read through their grey rim)
  text: '#f6f7f9',
  signal: '#b5463b', // dim red, only for small warning lights (Doors)
} as const;

export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/** Platform UI covers these; keep text (and anything important) out of them. */
export const SAFE = { top: 150, bottom: 350 } as const;

/** Captions sit centered in the middle third of the frame. */
export const CAPTION = {
  centerY: VIDEO.height / 2,
  maxWidth: 900,
  maxFontSize: 120,
  minFontSize: 44,
  lineHeight: 1.12,
  letterSpacing: '-0.02em',
  wordGapEm: 0.28,
} as const;

export const withAlpha = (hex: string, alpha: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
