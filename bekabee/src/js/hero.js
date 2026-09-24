// Hero: a pile of mixed waste that, as you scroll, sorts itself into material streams,
// packs neatly into five bays, leaves for recycling and leaves the site clean.
// MESS → SORTED → ORGANISED → RECYCLED → CLEAN

export const STREAMS = [
  { key: 'paper', name: 'PAPER', color: '#F2C230', weight: 0.3 },
  { key: 'plastic', name: 'PLASTIC', color: '#48B84A', weight: 0.24 },
  { key: 'glass', name: 'GLASS', color: '#15803D', weight: 0.15 },
  { key: 'metal', name: 'METAL', color: '#7C8584', weight: 0.13 },
  { key: 'general', name: 'GENERAL', color: '#2a2f2f', weight: 0.18 },
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function mulberry(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function initHero({ gsap, ScrollTrigger, reduced }) {
  const section = document.querySelector('[data-hero]');
  const canvas = section.querySelector('[data-hero-canvas]');
  const stageEls = [...section.querySelectorAll('[data-hero-stages] li')];
  const c = canvas.getContext('2d');
  const rand = mulberry(7);

  let W = 0, H = 0, dpr = 1, scene = null, parts = [], bins = [];
  let progress = reduced ? 2 : 0; // 0..4
  let intro = reduced ? 1 : 0;
  let visible = true;

  function pickType() {
    let r = rand(), acc = 0;
    for (let i = 0; i < STREAMS.length; i++) { acc += STREAMS[i].weight; if (r <= acc) return i; }
    return STREAMS.length - 1;
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mobile = W <= 820;
    const g = Math.max(16, Math.min(56, W * 0.04));
    scene = mobile
      ? { x: g, y: H * 0.56, w: W - g * 2, h: H * 0.44 - 150 }
      : { x: W * 0.5, y: 110, w: W * 0.5 - g, h: H - 200 };
    if (mobile && scene.h < 150) { scene.y = H - 300; scene.h = 150; }

    const count = mobile ? 240 : Math.round(clamp(W * 0.36, 380, 620));
    const size = mobile ? 7 : clamp(W / 190, 7, 11);

    // five bays along the bottom of the scene
    const gap = scene.w * 0.025;
    const bw = (scene.w - gap * 4) / 5;
    const bh = scene.h * 0.5;
    bins = STREAMS.map((s, i) => ({ ...s, x: scene.x + i * (bw + gap), y: scene.y + scene.h - bh, w: bw, h: bh }));

    parts = [];
    const perType = STREAMS.map(() => 0);
    for (let i = 0; i < count; i++) {
      const type = pickType();
      const k = perType[type]++;
      parts.push({ type, k, size: size * (0.65 + rand() * 0.6), shape: Math.floor(rand() * 3), rot: rand() * Math.PI * 2, spin: (rand() - 0.5) * 0.02, seed: rand(), delay: rand() * 0.35, lane: rand() });
    }
    // pile positions (stage 0)
    const pcx = scene.x + scene.w * 0.52, pbot = scene.y + scene.h, halfW = scene.w * 0.48, pileH = scene.h * 0.78;
    parts.forEach((p) => {
      const u = (rand() * 2 - 1) * (0.4 + 0.6 * rand());
      const maxH = pileH * (1 - u * u) * (0.9 + rand() * 0.1);
      p.pile = { x: pcx + u * halfW, y: pbot - Math.sqrt(rand()) * maxH - p.size * 0.5 };
      p.drop = { x: p.pile.x + (rand() - 0.5) * 80, y: -40 - rand() * H * 0.8 };
    });
    // packed positions (stage 2)
    STREAMS.forEach((s, t) => {
      const group = parts.filter((p) => p.type === t);
      const b = bins[t];
      const inner = { x: b.x + 6, w: b.w - 12, bottom: b.y + b.h - 6 };
      const cell = Math.max(3, Math.min(size * 1.7, Math.sqrt((inner.w * (b.h * 0.8)) / group.length)));
      const cols = Math.max(1, Math.floor(inner.w / cell));
      group.forEach((p, i) => {
        p.pack = { x: inner.x + (i % cols) * cell + cell / 2, y: inner.bottom - Math.floor(i / cols) * cell - cell / 2 };
        p.cell = cell * 0.86;
      });
    });
    // departure positions (stage 3): out to the right, in lanes
    parts.forEach((p) => {
      const laneY = scene.y + scene.h * 0.12 + (p.type / 4) * scene.h * 0.5;
      p.away = { x: W + 40 + p.seed * W * 0.4, y: laneY + (p.lane - 0.5) * 10 };
    });
  }

  function streamPos(p, time) {
    const laneH = scene.h * 0.62 / 5;
    const y = scene.y + scene.h * 0.08 + p.type * laneH + laneH / 2 + (p.lane - 0.5) * laneH * 0.5;
    const span = scene.w + 120;
    const x = scene.x - 60 + ((p.seed + time * 0.00004 * (0.7 + p.lane * 0.6)) % 1) * span;
    return { x, y };
  }

  function target(p, stage, time) {
    if (stage <= 0) return { ...p.pile, r: p.rot, s: p.size };
    if (stage === 1) { const q = streamPos(p, time); return { ...q, r: p.rot + time * p.spin * 0.05, s: p.size * 0.9 }; }
    if (stage === 2) return { ...p.pack, r: 0, s: p.cell };
    if (stage === 3) return { ...p.away, r: 0, s: p.cell };
    return { ...p.away, r: 0, s: p.cell };
  }

  function drawShape(x, y, s, r, shape, color) {
    c.save(); c.translate(x, y); c.rotate(r); c.fillStyle = color;
    if (shape === 0) c.fillRect(-s / 2, -s / 2, s, s);
    else if (shape === 1) { c.beginPath(); c.arc(0, 0, s / 2, 0, Math.PI * 2); c.fill(); }
    else { c.fillRect(-s / 2, -s * 0.3, s, s * 0.6); }
    c.restore();
  }

  function roundRect(x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function draw(time) {
    c.clearRect(0, 0, W, H);
    const p = progress;

    // soft light
    const grd = c.createRadialGradient(W * 0.78, -H * 0.1, 0, W * 0.78, -H * 0.1, W * 0.7);
    grd.addColorStop(0, 'rgba(242,194,48,.16)'); grd.addColorStop(1, 'rgba(242,194,48,0)');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);

    // ground line
    c.strokeStyle = 'rgba(16,19,19,.12)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(scene.x - 20, scene.y + scene.h + 0.5); c.lineTo(scene.x + scene.w + 20, scene.y + scene.h + 0.5); c.stroke();

    // sorting lanes
    const laneA = smooth(0.4, 1, p) * (1 - smooth(1.3, 1.9, p));
    if (laneA > 0.01) {
      const laneH = scene.h * 0.62 / 5;
      STREAMS.forEach((s, i) => {
        const y = scene.y + scene.h * 0.08 + i * laneH + laneH / 2;
        c.strokeStyle = s.color; c.globalAlpha = laneA * 0.35; c.lineWidth = laneH * 0.62; c.lineCap = 'round';
        c.beginPath(); c.moveTo(scene.x, y); c.lineTo(scene.x + scene.w, y); c.stroke();
        c.globalAlpha = laneA; c.fillStyle = '#101313'; c.font = '600 11px "Barlow Condensed", sans-serif'; c.textBaseline = 'middle';
        c.fillText(s.name, scene.x + 6, y);
      });
      c.globalAlpha = 1; c.lineCap = 'butt';
    }

    // bays
    const binA = smooth(1.35, 1.9, p);
    if (binA > 0.01) {
      bins.forEach((b, i) => {
        const lift = (1 - binA) * 30;
        c.globalAlpha = binA;
        c.fillStyle = 'rgba(255,255,255,.9)'; roundRect(b.x, b.y + lift, b.w, b.h, 8); c.fill();
        c.strokeStyle = b.color; c.lineWidth = 2; c.stroke();
        c.fillStyle = b.color; roundRect(b.x, b.y + lift - 10, b.w, 12, 4); c.fill();
        c.fillStyle = '#101313'; c.font = `600 ${Math.max(10, Math.min(13, b.w / 7))}px "Barlow Condensed", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText(b.name, b.x + b.w / 2, b.y + lift - 18);
        // clean tick at the end
        const done = smooth(3.4, 3.9, p);
        if (done > 0.01) {
          c.globalAlpha = binA * done;
          c.strokeStyle = '#15803D'; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2, s = Math.min(b.w, 40) * 0.3;
          c.beginPath(); c.moveTo(cx - s, cy); c.lineTo(cx - s * 0.2, cy + s * 0.8); c.lineTo(cx + s, cy - s * 0.7); c.stroke();
          c.lineCap = 'butt';
        }
        c.textAlign = 'start'; c.globalAlpha = 1;
      });
    }

    // particles
    const stage = Math.floor(p);
    const frac = p - stage;
    parts.forEach((q) => {
      let a = target(q, stage, time);
      let b = target(q, Math.min(4, stage + 1), time);
      const t = ease(clamp((frac - q.delay) / 0.65));
      let x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t), r = lerp(a.r, b.r, t), s = lerp(a.s, b.s, t);
      if (stage === 0 && frac < 0.02) { // idle breathing in the pile
        y += Math.sin(time * 0.0015 + q.seed * 20) * 0.6;
      }
      if (intro < 1) {
        const it = ease(clamp((intro - q.delay * 0.8) / 0.6));
        x = lerp(q.drop.x, x, it); y = lerp(q.drop.y, y, it); r += (1 - it) * 3;
      }
      if (x < -20 || x > W + 20) return;
      drawShape(x, y, s, r, stage >= 2 || (stage === 1 && t > 0.9) ? 0 : q.shape, STREAMS[q.type].color);
    });
  }

  let raf = 0;
  function loop(time) {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    draw(time);
  }

  function setStage(p) {
    const idx = Math.round(clamp(p, 0, 4));
    stageEls.forEach((el, i) => { el.classList.toggle('is-on', i === idx); el.classList.toggle('is-done', i < idx); });
  }

  build();
  window.addEventListener('resize', () => { build(); if (reduced) draw(0); });

  if (reduced) {
    setStage(2);
    document.fonts?.ready.then(() => draw(0));
    draw(0);
    return;
  }

  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(section);
  raf = requestAnimationFrame(loop);

  gsap.to({ v: 0 }, { v: 1, duration: 2.2, ease: 'power2.out', delay: 0.2, onUpdate() { intro = this.targets()[0].v; } });
  gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.09, delay: 0.1 });
  gsap.from(['.hero .eyebrow', '.hero__lede', '.hero__ctas', '.hero__stages'], { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.5 });

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.8,
    onUpdate(self) { progress = clamp(self.progress * 4.3, 0, 4); setStage(progress); },
  });
}
