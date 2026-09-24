// How it works: one mixed stream leaves your site, enters the Bekabee facility, is sorted,
// separates into material streams, is removed and goes on to recovery.
// Scroll reveals the path; particles keep flowing along whatever has been revealed.
import { STREAMS } from './hero.js';

const NODES = [0.05, 0.23, 0.41, 0.6, 0.79, 0.95];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smoothstep = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const SPREAD = [-2, -1, 0, 1, 2];
const LABEL_W = 104;

// lateral offset (−1..1) of lane i at position u along the path
function laneV(i, u) {
  const v = SPREAD[i] / 2;
  if (u < NODES[2]) return 0;
  if (u < NODES[3]) return v * smoothstep((u - NODES[2]) / (NODES[3] - NODES[2]));
  if (u < 0.82) return v;
  return v * (1 - smoothstep((u - 0.82) / (NODES[5] - 0.82)));
}

export function initHow({ ScrollTrigger, reduced }) {
  const section = document.querySelector('[data-how]');
  const canvas = section.querySelector('[data-how-canvas]');
  const nodeEls = [...section.querySelectorAll('[data-how-nodes] li')];
  const c = canvas.getContext('2d');
  let W = 0, H = 0, vertical = false, reveal = reduced ? 1.05 : 0, visible = false;
  const parts = [];
  for (let i = 0; i < 260; i++) {
    parts.push({ type: Math.floor(Math.random() * 5), seed: Math.random(), jit: Math.random() * 2 - 1, speed: 0.6 + Math.random() * 0.8, s: 3 + Math.random() * 3 });
  }

  const pad = () => (vertical ? 28 : Math.max(60, W * 0.06));
  function map(u, v) {
    if (vertical) {
      const left = LABEL_W + 24, half = (W - left - 16) / 2 - 12;
      return { x: left + (W - left - 16) / 2 + v * half, y: pad() + u * (H - pad() * 2) };
    }
    const span = H * 0.17;
    return { x: pad() + u * (W - pad() * 2), y: H * 0.5 + v * span * 2 };
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    vertical = W < 700;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodeEls.forEach((li, i) => {
      const pt = map(NODES[i], 0);
      if (vertical) {
        li.style.left = '16px'; li.style.top = `${pt.y - 14}px`; li.style.transform = 'none';
        li.style.textAlign = 'left'; li.style.width = `${LABEL_W}px`;
      } else {
        const below = i % 2 === 0;
        li.style.left = `${pt.x}px`; li.style.textAlign = 'center'; li.style.width = '140px';
        li.style.top = below ? `${pt.y + H * 0.17 * 2 + 18}px` : `${pt.y - H * 0.17 * 2 - 50}px`;
        li.style.transform = 'translate(-50%, 0)';
      }
    });
  }

  function roundRect(x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function draw(time) {
    c.clearRect(0, 0, W, H);
    const maxU = reveal;

    // guide paths (faint), then the revealed trunk and lanes
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      for (let u = 0; u <= 1.0001; u += 0.01) { const pt = map(u, laneV(i, u)); u === 0 ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y); }
      c.strokeStyle = 'rgba(16,19,19,.08)'; c.lineWidth = 1.5; c.stroke();
    }
    c.lineWidth = 2.5; c.strokeStyle = '#101313'; c.beginPath();
    for (let u = 0; u <= Math.min(NODES[2], maxU); u += 0.01) { const pt = map(u, 0); u === 0 ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y); }
    c.stroke();
    if (maxU > NODES[2]) {
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        for (let u = NODES[2]; u <= Math.min(1, maxU); u += 0.01) { const pt = map(u, laneV(i, u)); u === NODES[2] ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y); }
        c.strokeStyle = STREAMS[i].color; c.lineWidth = 2; c.stroke();
      }
    }

    // node markers
    NODES.forEach((u, i) => {
      const on = maxU >= u - 0.01;
      const pt = map(u, 0);
      if (i === 0) { // your site: a building block
        c.fillStyle = on ? '#101313' : 'rgba(16,19,19,.15)';
        roundRect(pt.x - 16, pt.y - 16, 32, 32, 6); c.fill();
        c.fillStyle = on ? '#F2C230' : 'transparent'; c.fillRect(pt.x - 8, pt.y - 6, 5, 5); c.fillRect(pt.x + 3, pt.y - 6, 5, 5); c.fillRect(pt.x - 3, pt.y + 4, 6, 12);
      } else if (i === 1) { // facility: roofed bay
        c.fillStyle = on ? '#15803D' : 'rgba(16,19,19,.15)';
        c.beginPath(); c.moveTo(pt.x - 22, pt.y - 8); c.lineTo(pt.x, pt.y - 22); c.lineTo(pt.x + 22, pt.y - 8); c.closePath(); c.fill();
        roundRect(pt.x - 18, pt.y - 8, 36, 26, 3); c.fill();
      } else if (i === 2) { // sorting: hands / funnel
        c.fillStyle = on ? '#F2C230' : 'rgba(16,19,19,.15)';
        c.beginPath(); c.arc(pt.x, pt.y, 16, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#101313'; c.lineWidth = 2; c.beginPath(); c.moveTo(pt.x - 8, pt.y - 5); c.lineTo(pt.x, pt.y + 6); c.lineTo(pt.x + 8, pt.y - 5); c.stroke();
      } else if (i === 3) { // streams: a gate across lanes
        const a = map(u, -1.1), b = map(u, 1.1);
        c.strokeStyle = on ? 'rgba(16,19,19,.5)' : 'rgba(16,19,19,.1)'; c.setLineDash([4, 6]); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.setLineDash([]);
      } else if (i === 4) { // removal: containers per stream
        for (let k = 0; k < 5; k++) {
          const q = map(u, laneV(k, u));
          c.fillStyle = on ? STREAMS[k].color : 'rgba(16,19,19,.12)';
          roundRect(q.x - 11, q.y - 9, 22, 18, 3); c.fill();
        }
      } else { // recovery: circular arrows
        c.strokeStyle = on ? '#15803D' : 'rgba(16,19,19,.15)'; c.lineWidth = 4;
        c.beginPath(); c.arc(pt.x, pt.y, 18, 0.3, Math.PI * 1.6); c.stroke();
        c.fillStyle = c.strokeStyle; const ex = pt.x + Math.cos(Math.PI * 1.6) * 18, ey = pt.y + Math.sin(Math.PI * 1.6) * 18;
        c.beginPath(); c.moveTo(ex + 7, ey - 1); c.lineTo(ex - 2, ey - 8); c.lineTo(ex - 3, ey + 6); c.fill();
      }
    });

    // particles flowing along revealed path
    parts.forEach((q) => {
      const u = (q.seed + time * 0.000045 * q.speed) % 1;
      if (u > maxU || u > 0.97) return;
      const mixed = u < NODES[2] + 0.02;
      const jitter = q.jit * (mixed ? 0.13 : 0.035) * (u > 0.82 ? 1 - smoothstep((u - 0.82) / 0.13) : 1);
      const pt = map(u, laneV(q.type, u) + jitter);
      let alpha = 1;
      if (u > 0.9) alpha = 1 - (u - 0.9) / 0.07;
      c.globalAlpha = clamp(alpha);
      c.fillStyle = STREAMS[q.type].color;
      if (mixed) { c.save(); c.translate(pt.x, pt.y); c.rotate(q.seed * 6 + time * 0.001); c.fillRect(-q.s / 2, -q.s / 2, q.s, q.s); c.restore(); }
      else { c.beginPath(); c.arc(pt.x, pt.y, q.s / 2 + 0.5, 0, Math.PI * 2); c.fill(); }
    });
    c.globalAlpha = 1;
  }

  function setNodes() { nodeEls.forEach((li, i) => li.classList.toggle('is-on', reveal >= NODES[i] - 0.01)); }

  layout(); setNodes();
  window.addEventListener('resize', () => { layout(); if (reduced) draw(4e4); });

  if (reduced) { draw(4e4); document.fonts?.ready.then(() => draw(4e4)); return; }

  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(section);
  const loop = (t) => { requestAnimationFrame(loop); if (visible) draw(t); };
  requestAnimationFrame(loop);

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6,
    onUpdate(self) { reveal = clamp(self.progress * 1.25, 0, 1.05); setNodes(); },
    onRefresh: layout,
  });
}
