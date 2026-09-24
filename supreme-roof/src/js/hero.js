// Hero: a dark tiled roof in a Highveld storm. Rain falls and splashes on the tiles;
// as you scroll, a protective sheen sweeps across and the rain starts beading and
// running off instead of soaking in. The final CTA reuses the rain on its own.
import { paint } from './textures.js';

export function rain(canvas, { reduced, density = 1, roof = true, getProtect = () => 0 } = {}) {
  const c = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, bg = null, visible = false, drops = [], splashes = [], beads = [];

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (roof) {
      bg = document.createElement('canvas');
      bg.width = Math.ceil(W * 1.1); bg.height = Math.ceil(H * 1.1);
      paint('tiles-new-dark', bg.getContext('2d'), bg.width, bg.height, 11);
    }
    const n = Math.round((W * H) / 5200 * density);
    drops = Array.from({ length: n }, () => newDrop(true));
  }
  function newDrop(anywhere) {
    const z = Math.random();
    return { x: Math.random() * (W + 200) - 100, y: anywhere ? Math.random() * H : -20 - Math.random() * 200, z, len: 10 + z * 22, v: 9 + z * 12, stop: H * (0.35 + Math.random() * 0.7) };
  }

  function frame(t) {
    const protect = getProtect();
    c.clearRect(0, 0, W, H);
    if (roof && bg) {
      const zoom = 1.04 + Math.sin(t * 0.00005) * 0.02;
      c.save(); c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.drawImage(bg, -bg.width / 2, -bg.height / 2); c.restore();
      // wet darkening fades as protection arrives
      c.fillStyle = `rgba(8,12,18,${0.28 * (1 - protect)})`; c.fillRect(0, 0, W, H);
      // protective sheen sweeping diagonally
      if (protect > 0.01) {
        const x = -W * 0.4 + ((t * 0.00012) % 1) * W * 1.8;
        const g = c.createLinearGradient(x - 220, 0, x + 220, H * 0.4);
        g.addColorStop(0, 'rgba(217,119,43,0)'); g.addColorStop(0.5, `rgba(255,214,170,${0.12 * protect})`); g.addColorStop(1, 'rgba(217,119,43,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
    }
    // rain
    c.lineCap = 'round';
    for (const d of drops) {
      d.y += d.v; d.x += d.v * 0.18;
      if (d.y > d.stop) {
        if (roof) {
          if (Math.random() < 0.5) splashes.push({ x: d.x, y: d.stop, r: 0, a: 0.5 * (0.4 + d.z) });
          if (protect > 0.3 && Math.random() < 0.08 * protect && beads.length < 140) beads.push({ x: d.x, y: d.stop, r: 1.2 + Math.random() * 2.2, v: 0, life: 1 });
        }
        Object.assign(d, newDrop(false));
      }
      c.strokeStyle = `rgba(210,222,232,${0.12 + d.z * 0.35})`;
      c.lineWidth = 0.6 + d.z * 1.1;
      c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - d.len * 0.18, d.y - d.len); c.stroke();
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]; s.r += 0.9; s.a *= 0.86;
      c.strokeStyle = `rgba(220,230,240,${s.a})`; c.lineWidth = 1;
      c.beginPath(); c.ellipse(s.x, s.y, s.r * 1.6, s.r * 0.5, 0, Math.PI, Math.PI * 2); c.stroke();
      if (s.a < 0.03) splashes.splice(i, 1);
    }
    // beads roll off the protected roof
    for (let i = beads.length - 1; i >= 0; i--) {
      const b = beads[i]; b.v += 0.06; b.y += b.v; b.x += 0.3; b.life -= 0.006;
      const g = c.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.4, 0, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * b.life})`); g.addColorStop(1, `rgba(160,190,210,${0.25 * b.life})`);
      c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill();
      if (b.life <= 0 || b.y > H) beads.splice(i, 1);
    }
  }

  size();
  let raf;
  const onResize = () => { size(); if (reduced) frame(0); };
  window.addEventListener('resize', onResize);
  if (reduced) { frame(0); return; }
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(canvas);
  const loop = (t) => { raf = requestAnimationFrame(loop); if (visible && !document.hidden) frame(t); };
  raf = requestAnimationFrame(loop);
}

export function initHero({ gsap, ScrollTrigger, reduced }) {
  const hero = document.querySelector('[data-hero]');
  let protect = reduced ? 1 : 0;
  rain(hero.querySelector('[data-hero-canvas]'), { reduced, getProtect: () => protect });
  rain(document.querySelector('[data-final-rain]'), { reduced, roof: false, density: 0.7 });
  if (reduced) return;

  gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
  gsap.from(['.hero .eyebrow', '.hero__lede', '.hero__ctas', '.hero__trust', '.hero__meta'], { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.5 });
  // protection builds as you begin to scroll; the copy lifts away with parallax
  ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { protect = Math.min(1, 0.25 + s.progress * 2.2); } });
  gsap.to('.hero__inner', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  protect = 0.25;
}
