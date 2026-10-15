// Arc-length paths for props that travel (the scanner lens): straight runs joined by half-circle turns,
// sampled by distance so speed is under our control, not the geometry's.

export type Segment =
  | { kind: 'line'; x0: number; y0: number; x1: number; y1: number }
  | { kind: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number };

const segLength = (s: Segment) =>
  s.kind === 'line' ? Math.hypot(s.x1 - s.x0, s.y1 - s.y0) : Math.abs(s.a1 - s.a0) * s.r;

const segPoint = (s: Segment, t: number): [number, number] => {
  if (s.kind === 'line') return [s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t];
  const a = s.a0 + (s.a1 - s.a0) * t;
  return [s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)];
};

export const pathLength = (segs: Segment[]) => segs.reduce((a, s) => a + segLength(s), 0);

/** Point at fraction `u` (0–1) of the path's total length. */
export function pointAt(segs: Segment[], u: number): [number, number] {
  let left = Math.min(1, Math.max(0, u)) * pathLength(segs);
  for (const s of segs) {
    const l = segLength(s);
    if (left <= l || s === segs[segs.length - 1]) return segPoint(s, l ? Math.min(1, left / l) : 0);
    left -= l;
  }
  return [0, 0];
}

/**
 * Distance fraction for a "cruise" speed profile over T frames: eases up to a constant speed over `accel` frames,
 * holds it, eases back down. Peak speed is only ~T/(T-accel) times the average (a bezier ease peaks at ~1.8×).
 */
export function cruise(t: number, T: number, accel: number): number {
  if (t <= 0) return 0;
  if (t >= T) return 1;
  const a = Math.min(accel, T / 2);
  const ramp = (tau: number) => tau / 2 - (a / (2 * Math.PI)) * Math.sin((Math.PI * tau) / a);
  let d: number;
  if (t < a) d = ramp(t);
  else if (t > T - a) d = T - a - ramp(T - t);
  else d = a / 2 + (t - a);
  return d / (T - a);
}

/**
 * Serpentine through a grid: one horizontal pass per group of rows the travelling lens can cover at once
 * (rows within `reach` of the pass), alternating direction, joined by half-circle turns that keep the
 * travelling point inside `bounds` (x). A short scene with a big lens can be a single slow pass.
 */
export function serpentine(
  rowCentres: number[],
  colCentres: number[],
  bounds: { min: number; max: number },
  reach = 70,
): Segment[] {
  const passes: number[] = [];
  for (let r = 0; r < rowCentres.length; ) {
    let k = 1;
    while (r + k < rowCentres.length && (rowCentres[r + k] - rowCentres[r]) / 2 <= reach) k++;
    passes.push((rowCentres[r] + rowCentres[r + k - 1]) / 2);
    r += k;
  }
  const radii = passes.slice(1).map((y, k) => (y - passes[k]) / 2);
  const rRight = Math.max(0, ...radii.filter((_, k) => k % 2 === 0));
  const rLeft = Math.max(0, ...radii.filter((_, k) => k % 2 === 1));
  let xL = Math.max(colCentres[0], bounds.min + rLeft);
  let xR = Math.min(colCentres[colCentres.length - 1], bounds.max - rRight);
  if (xL > xR) xL = xR = (xL + xR) / 2;

  const segs: Segment[] = [];
  passes.forEach((y, k) => {
    const ltr = k % 2 === 0;
    segs.push({ kind: 'line', x0: ltr ? xL : xR, y0: y, x1: ltr ? xR : xL, y1: y });
    const r = radii[k];
    if (r === undefined) return;
    segs.push(
      ltr
        ? { kind: 'arc', cx: xR, cy: y + r, r, a0: -Math.PI / 2, a1: Math.PI / 2 } // bulges right
        : { kind: 'arc', cx: xL, cy: y + r, r, a0: -Math.PI / 2, a1: (-3 * Math.PI) / 2 }, // bulges left
    );
  });
  return segs;
}
