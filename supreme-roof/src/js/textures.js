// Procedural roofing materials, rendered once to canvas and used as backgrounds.
// They stand in for photography until Supreme's own project photos are supplied:
// see README "Photography". Every texture is deterministic (seeded) so it looks
// the same on every visit.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h, k) => { const [r, g, b] = hex(h); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };

function grain(c, w, h, r, amount = 0.08, size = 1.4) {
  const n = Math.round((w * h) / 18);
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? 0 : 255;
    c.fillStyle = `rgba(${v},${v},${v},${r() * amount})`;
    c.fillRect(r() * w, r() * h, size, size);
  }
}
function light(c, w, h, x = 0.8, y = -0.1, strength = 0.35) {
  const g = c.createRadialGradient(w * x, h * y, 0, w * x, h * y, Math.max(w, h) * 1.1);
  g.addColorStop(0, `rgba(255,236,210,${strength})`); g.addColorStop(0.45, 'rgba(255,236,210,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function crack(c, r, x, y, len, width = 1.4) {
  c.strokeStyle = 'rgba(8,8,8,.75)'; c.lineWidth = width; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y);
  let a = r() * Math.PI * 2;
  for (let i = 0; i < len; i++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * 6; y += Math.sin(a) * 6; c.lineTo(x, y); if (r() < 0.12) crack(c, r, x, y, Math.floor(len / 3), width * 0.6); }
  c.stroke();
}
function stain(c, r, x, y, rad, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rad, rad * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2); c.fill();
}

/* concrete roof tiles: courses of rolled (double-roman) tiles with scalloped lower edges */
function tiles(c, w, h, r, o = {}) {
  const base = o.color || '#3a3d40';
  c.fillStyle = shade(base, 0.45); c.fillRect(0, 0, w, h);
  const tw = o.tw || 72;          // tile width
  const roll = tw / 2;            // two rolls per tile
  const step = o.step || 34;      // exposed course height
  const courses = Math.ceil(h / step) + 2;
  // draw from the bottom course up: each course's lip overlaps the one below it
  for (let row = courses - 1; row >= 0; row--) {
    const y = (row - 1) * step;
    const off = (row % 2) * (tw / 2);
    // shadow this course's lip casts onto the course below
    const sy = y + step + 4;
    const sg = c.createLinearGradient(0, sy, 0, sy + 22);
    sg.addColorStop(0, 'rgba(0,0,0,.7)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.fillRect(0, sy, w, 22);
    // tile faces: horizontal gradient repeating per roll gives the curved profile
    for (let x = -tw + off; x < w + tw; x += tw) {
      const k = (0.85 + r() * 0.3) * (o.aged && r() < 0.3 ? 0.82 : 1);
      for (let q = 0; q < 2; q++) {
        const rx = x + q * roll;
        const g = c.createLinearGradient(rx, 0, rx + roll, 0);
        const b0 = base;
        g.addColorStop(0, shade(b0, k * 0.55)); g.addColorStop(0.35, shade(b0, k * 1.05)); g.addColorStop(0.55, shade(b0, k * 1.35)); g.addColorStop(0.8, shade(b0, k * 0.95)); g.addColorStop(1, shade(b0, k * 0.5));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(rx, y);
        c.lineTo(rx + roll, y);
        c.lineTo(rx + roll, y + step + 6);
        c.quadraticCurveTo(rx + roll / 2, y + step + 16, rx, y + step + 6);
        c.closePath(); c.fill();
      }
      // vertical joint between tiles
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 1, y, 2, step + 8);
      if (o.cracked && r() < 0.08) crack(c, r, x + tw / 2, y + step / 2, 6, 1.6);
      if (o.aged && r() < 0.14) stain(c, r, x + r() * tw, y + r() * step, 14 + r() * 16, 'rgba(90,110,60,.38)');
      if (o.slipped && r() < 0.035) { c.fillStyle = 'rgba(0,0,0,.85)'; c.fillRect(x + 2, y + 4, tw - 4, step * 0.8); c.fillStyle = 'rgba(120,100,80,.35)'; c.fillRect(x + 2, y + step * 0.8, tw - 4, 3); }
    }
    // light catching the scalloped lip
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1.2;
    for (let x = -tw + off; x < w + tw; x += roll) { c.beginPath(); c.moveTo(x + 3, y + step + 7); c.quadraticCurveTo(x + roll / 2, y + step + 15, x + roll - 3, y + step + 7); c.stroke(); }
  }
  if (o.valley) {
    c.save(); c.translate(w * 0.62, 0); c.rotate(0.18);
    const vg = c.createLinearGradient(-40, 0, 40, 0);
    vg.addColorStop(0, 'rgba(0,0,0,.6)'); vg.addColorStop(0.3, '#7d858c'); vg.addColorStop(0.5, '#b6bcc1'); vg.addColorStop(0.7, '#7d858c'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
    c.fillStyle = vg; c.fillRect(-40, -40, 80, h + 120); c.restore();
  }
  grain(c, w, h, r, 0.1);
  if (o.wet) {
    c.fillStyle = 'rgba(20,30,40,.25)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(210,225,235,${0.15 + r() * 0.35})`; c.beginPath(); c.ellipse(r() * w, r() * h, 1 + r() * 2.2, 1 + r() * 1.6, 0, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 18; i++) { const x = r() * w; c.strokeStyle = 'rgba(200,220,235,.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, r() * h * 0.5); c.lineTo(x + (r() - 0.5) * 8, h); c.stroke(); }
  }
}

/* natural slate, staggered courses */
function slate(c, w, h, r, o = {}) {
  c.fillStyle = '#1b1f24'; c.fillRect(0, 0, w, h);
  const sw = 46, sh = 30;
  for (let row = 0, y = -6; y < h + sh; row++, y += sh * 0.62) {
    const off = row % 2 ? sw / 2 : 0;
    for (let x = -sw + off; x < w + sw; x += sw) {
      const k = 0.75 + r() * 0.5;
      const hue = r() < 0.5 ? '#3a4452' : '#434a55';
      c.fillStyle = shade(hue, k);
      c.beginPath(); c.moveTo(x + 1, y); c.lineTo(x + sw - 1, y); c.lineTo(x + sw - 1 - r() * 2, y + sh); c.lineTo(x + 1 + r() * 2, y + sh); c.fill();
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x + 1, y, sw - 2, 4);
      c.fillStyle = `rgba(190,205,225,${0.03 + r() * 0.06})`; c.fillRect(x + 2, y + 6, sw - 4, sh - 10);
      if (o.old && r() < 0.1) stain(c, r, x + sw / 2, y + sh / 2, 18, 'rgba(120,130,70,.4)');
      if (o.old && r() < 0.05) crack(c, r, x + sw / 2, y + 8, 4, 1.2);
    }
  }
  grain(c, w, h, r, 0.09);
}

/* flat roof membranes */
function membrane(c, w, h, r, o = {}) {
  const base = o.color || '#9aa0a4';
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  // mineral granules
  const n = Math.round((w * h) / 14);
  for (let i = 0; i < n; i++) { const v = 120 + Math.floor(r() * 120); c.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + r() * 0.4})`; c.fillRect(r() * w, r() * h, 1.8, 1.8); }
  // overlapping sheet seams
  const sheet = o.sheet || 110;
  for (let y = sheet * 0.6; y < h; y += sheet) {
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(0, y, w, 3);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, y - 2, w, 1.5);
    if (o.failed) {
      for (let x = 0; x < w; x += 40 + r() * 80) if (r() < 0.45) { c.fillStyle = 'rgba(20,20,20,.55)'; c.beginPath(); c.ellipse(x, y + 4, 18 + r() * 24, 5 + r() * 5, 0, 0, Math.PI * 2); c.fill(); }
    }
  }
  if (o.failed) {
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, rr = 8 + r() * 14; const g = c.createRadialGradient(x - rr / 3, y - rr / 3, 0, x, y, rr); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 5; i++) crack(c, r, r() * w, r() * h, 10, 1.6);
  }
  if (o.ponding) {
    for (let i = 0; i < 3; i++) {
      const x = w * (0.2 + r() * 0.6), y = h * (0.3 + r() * 0.5), rx = w * (0.18 + r() * 0.16);
      const g = c.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, 'rgba(38,52,64,.85)'); g.addColorStop(0.75, 'rgba(38,52,64,.6)'); g.addColorStop(1, 'rgba(38,52,64,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, rx * 0.45, r() - 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(210,225,235,.35)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x - rx * 0.2, y - rx * 0.1, rx * 0.4, rx * 0.08, -0.2, 0, Math.PI); c.stroke();
      stain(c, r, x, y, rx * 1.2, 'rgba(90,80,60,.25)');
    }
  }
  if (o.torch) {
    // fresh torch-on: slightly silver sheen and crisp laps
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,255,.15)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.1)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  grain(c, w, h, r, 0.06);
}

/* IBR / corrugated metal sheeting */
function metal(c, w, h, r, o = {}) {
  const base = o.color || '#5c6369';
  const pitch = 38;
  for (let x = 0; x < w + pitch; x += pitch) {
    const g = c.createLinearGradient(x, 0, x + pitch, 0);
    g.addColorStop(0, shade(base, 0.6)); g.addColorStop(0.18, shade(base, 1.45)); g.addColorStop(0.3, shade(base, 0.95)); g.addColorStop(0.75, shade(base, 1.05)); g.addColorStop(1, shade(base, 0.6));
    c.fillStyle = g; c.fillRect(x, 0, pitch, h);
  }
  for (let y = 70; y < h; y += 140 + r() * 60) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y, w, 2); for (let x = 12; x < w; x += pitch) { c.fillStyle = 'rgba(230,230,230,.5)'; c.beginPath(); c.arc(x, y + 8, 2, 0, Math.PI * 2); c.fill(); } }
  if (o.rust) for (let i = 0; i < 40; i++) stain(c, r, r() * w, r() * h, 10 + r() * 40, `rgba(${140 + r() * 40},${60 + r() * 20},20,${0.25 + r() * 0.35})`);
  grain(c, w, h, r, 0.07);
}

/* concrete slab / damp ceiling */
function concrete(c, w, h, r, o = {}) {
  c.fillStyle = o.color || '#c9c6bf'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) stain(c, r, r() * w, r() * h, 20 + r() * 60, `rgba(${100 + r() * 60},${100 + r() * 60},${95 + r() * 50},.08)`);
  if (o.damp) {
    const x = w * 0.55, y = h * 0.45;
    for (let k = 4; k > 0; k--) { c.strokeStyle = `rgba(120,90,50,${0.12 + k * 0.05})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, w * 0.08 * k, h * 0.07 * k, 0.3, 0, Math.PI * 2); c.stroke(); }
    stain(c, r, x, y, w * 0.3, 'rgba(110,85,50,.35)');
    for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(200,220,235,.8)'; c.beginPath(); c.ellipse(x + (r() - 0.5) * 60, y + 30 + r() * 30, 2.5, 3.5, 0, 0, Math.PI * 2); c.fill(); }
  }
  if (o.peel) {
    for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h; c.fillStyle = 'rgba(80,78,72,.8)'; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 7; k++) c.lineTo(x + (r() - 0.3) * 34, y + (r() - 0.3) * 24); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.stroke(); }
    for (let i = 0; i < 6; i++) crack(c, r, r() * w, r() * h, 8, 1);
  }
  grain(c, w, h, r, 0.08);
}

/* gutter full of debris */
function gutter(c, w, h, r) {
  tiles(c, w, h * 0.6, r, { color: '#3a3d40', aged: true });
  const gy = h * 0.55;
  const g = c.createLinearGradient(0, gy, 0, h);
  g.addColorStop(0, '#6f757a'); g.addColorStop(0.2, '#aab0b4'); g.addColorStop(0.5, '#555b60'); g.addColorStop(1, '#202326');
  c.fillStyle = g; c.fillRect(0, gy, w, h - gy);
  for (let i = 0; i < 160; i++) { c.fillStyle = r() < 0.5 ? `rgba(${90 + r() * 50},${70 + r() * 40},30,.9)` : `rgba(60,${80 + r() * 50},40,.9)`; c.beginPath(); c.ellipse(r() * w, gy + 6 + r() * 26, 3 + r() * 7, 2 + r() * 3, r() * 3, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(38,52,64,.6)'; c.fillRect(0, gy + 26, w, 12);
  grain(c, w, h, r, 0.06);
}

/* storm: displaced tiles under dark sky light */
function storm(c, w, h, r) {
  tiles(c, w, h, r, { color: '#34373a', cracked: true, slipped: true, wet: true });
  c.fillStyle = 'rgba(10,14,22,.35)'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) { c.save(); c.translate(r() * w, r() * h); c.rotate((r() - 0.5) * 1.2); c.fillStyle = '#4a4e52'; c.fillRect(-30, -20, 60, 40); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(-30, 16, 60, 6); c.restore(); }
}

const RECIPES = {
  'tiles-new': (c, w, h, r) => { tiles(c, w, h, r, { color: '#3b3f43' }); light(c, w, h); },
  'tiles-new-dark': (c, w, h, r) => { tiles(c, w, h, r, { color: '#2c2f33' }); light(c, w, h, 0.2, -0.1, 0.3); },
  'tiles-wet': (c, w, h, r) => { tiles(c, w, h, r, { color: '#363a3e', wet: true }); light(c, w, h, 0.3, -0.2, 0.25); },
  'tiles-cracked': (c, w, h, r) => { tiles(c, w, h, r, { color: '#5a4a42', cracked: true, aged: true, slipped: true }); light(c, w, h); },
  'tiles-valley': (c, w, h, r) => { tiles(c, w, h, r, { color: '#3b3f43', valley: true }); light(c, w, h, 0.6, -0.2); },
  'tiles-aged': (c, w, h, r) => { tiles(c, w, h, r, { color: '#4d4843', aged: true, cracked: true }); light(c, w, h, 0.5, -0.2, 0.2); },
  slate: (c, w, h, r) => { slate(c, w, h, r); light(c, w, h, 0.75, -0.15, 0.3); },
  'slate-old': (c, w, h, r) => { slate(c, w, h, r, { old: true }); light(c, w, h, 0.4, -0.2, 0.2); },
  'membrane-new': (c, w, h, r) => { membrane(c, w, h, r, { torch: true }); light(c, w, h, 0.8, -0.2, 0.25); },
  torchon: (c, w, h, r) => { membrane(c, w, h, r, { torch: true, color: '#a9aeb1', sheet: 90 }); light(c, w, h, 0.3, -0.3, 0.3); },
  'membrane-failed': (c, w, h, r) => { membrane(c, w, h, r, { failed: true, color: '#7e8184' }); light(c, w, h, 0.5, -0.2, 0.15); },
  'membrane-ponding': (c, w, h, r) => { membrane(c, w, h, r, { ponding: true, color: '#8c9194' }); light(c, w, h, 0.5, -0.2, 0.18); },
  'metal-new': (c, w, h, r) => { metal(c, w, h, r, { color: '#5b6268' }); light(c, w, h, 0.85, -0.1, 0.3); },
  'metal-rust': (c, w, h, r) => { metal(c, w, h, r, { color: '#595d60', rust: true }); light(c, w, h, 0.5, -0.2, 0.2); },
  'concrete-damp': (c, w, h, r) => { concrete(c, w, h, r, { damp: true }); },
  'coating-peel': (c, w, h, r) => { concrete(c, w, h, r, { peel: true, color: '#a9a39a' }); light(c, w, h, 0.6, -0.2, 0.15); },
  gutter: (c, w, h, r) => { gutter(c, w, h, r); light(c, w, h, 0.5, -0.2, 0.2); },
  storm: (c, w, h, r) => { storm(c, w, h, r); },
};

const cache = new Map();
/** Returns an object URL for a texture; generated once per key+size. */
export async function texture(key, w = 900, h = 600, seed = 7) {
  const id = `${key}:${w}x${h}:${seed}`;
  if (cache.has(id)) return cache.get(id);
  const p = new Promise((resolve) => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    (RECIPES[key] || RECIPES['tiles-new'])(c, w, h, rng(seed + key.length * 131));
    cv.toBlob((b) => resolve(URL.createObjectURL(b)), 'image/webp', 0.82);
  });
  cache.set(id, p);
  return p;
}

/** Draw a texture straight onto a canvas context (used by the hero). */
export function paint(key, c, w, h, seed = 7) { (RECIPES[key] || RECIPES['tiles-new'])(c, w, h, rng(seed + key.length * 131)); }

/** Lazily apply textures to every [data-tex] element as it nears the viewport. */
export function applyTextures(root = document) {
  const els = [...root.querySelectorAll('[data-tex]')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach(async (en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const el = en.target;
      const target = el.querySelector('.pcard__img, .svc__img') || el;
      const url = await texture(el.dataset.tex, 900, 640, Number(el.dataset.seed || 7));
      target.style.backgroundImage = `url(${url})`;
      target.classList.add('is-loaded');
    });
  }, { rootMargin: '400px 0px' });
  els.forEach((el) => io.observe(el));
}
