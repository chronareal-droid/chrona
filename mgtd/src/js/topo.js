// Decorative contour linework derived from the logo's circle: concentric, gently warped rings.
// Procedural and purely ornamental. It does not represent any real terrain or survey data.
const rand = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

export function drawTopo(group, { w, h, lines = 14, seed = 1 } = {}) {
  if (!group) return;
  const r = rand(seed);
  const cx = w * (0.55 + r() * 0.2);
  const cy = h * (0.35 + r() * 0.2);
  const phases = [r() * 6.28, r() * 6.28, r() * 6.28];
  const maxR = Math.hypot(w, h) * 0.75;
  let d = '';
  for (let i = 1; i <= lines; i++) {
    const base = (i / lines) * maxR;
    const pts = [];
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      const wob = 1 + 0.12 * Math.sin(3 * t + phases[0] + i * 0.25) + 0.07 * Math.sin(5 * t + phases[1] - i * 0.18) + 0.04 * Math.sin(9 * t + phases[2]);
      pts.push([cx + Math.cos(t) * base * wob, cy + Math.sin(t) * base * wob * 0.72]);
    }
    d += `<path d="M${pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L')}Z" opacity="${(1 - i / (lines + 2)).toFixed(2)}"/>`;
  }
  group.innerHTML = d;
}
