import { Easing, interpolate } from 'remotion';

/** Slow, symmetric ease used for every camera move. */
export const gentle = Easing.bezier(0.45, 0, 0.55, 1);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0→1 over [from, to] frames, eased. */
export const ramp = (frame: number, from: number, to: number, easing = gentle) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

/** Camera push-in scale across the whole scene. */
export const pushIn = (frame: number, duration: number, amount = 0.08) => 1 + amount * ramp(frame, 0, duration);

/** Linear drift in px across the whole scene (for parallax layers). */
export const drift = (frame: number, duration: number, px: number) =>
  interpolate(frame, [0, duration], [0, px], clamp);

/** Slow sine "breathing" between lo and hi with the given period in frames. */
export const breathe = (frame: number, period: number, lo: number, hi: number, phase = 0) =>
  lo + (hi - lo) * (0.5 + 0.5 * Math.sin((frame / period) * Math.PI * 2 + phase));
