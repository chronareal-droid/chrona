// Scroll-driven scenes: the on-site recycling centre assembling, the skip arriving / filling /
// leaving, the four giant "why" words and the rubble texture.

/* ── On-site recycling centre: blueprint → built ─────────────── */
export function initFacility({ gsap, reduced }) {
  const section = document.querySelector('[data-facility]');
  const svg = section.querySelector('[data-facility-svg]');
  const legend = [...section.querySelectorAll('[data-facility-legend] li')];
  const groups = [0, 1, 2, 3, 4, 5].map((i) => svg.querySelector(`[data-f="${i}"]`));

  if (reduced) { legend.forEach((l) => l.classList.add('is-on')); return; }

  // every shape starts as a blueprint outline, then fills in when its phase arrives
  const shapes = groups.slice(0, 5).map((g) => [...g.querySelectorAll('rect, polygon, ellipse, circle, path')]);
  shapes.flat().forEach((el) => {
    const len = el.getTotalLength ? el.getTotalLength() : 400;
    el.dataset.len = len;
    gsap.set(el, { attr: { 'stroke-dasharray': len, 'stroke-dashoffset': len }, stroke: '#48B84A', strokeWidth: 1.2, fillOpacity: 0 });
  });
  const texts = svg.querySelectorAll('text:not(.f-dimtext)');
  gsap.set(texts, { opacity: 0 });
  gsap.set(groups[5], { opacity: 0 });

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.8,
      onUpdate(self) { legend.forEach((l, i) => l.classList.toggle('is-on', self.progress >= 0.1 + i * 0.18)); },
    },
  });
  // plan drawn
  tl.to(shapes.flat(), { attr: { 'stroke-dashoffset': 0 }, duration: 1.2, stagger: 0.02 }, 0);
  // build phase by phase
  shapes.forEach((set, i) => {
    const at = 1.2 + i * 0.9;
    tl.to(set, { fillOpacity: 1, strokeOpacity: (k, el) => (el.classList.contains('bp') ? 1 : 0), duration: 0.7, stagger: 0.03 }, at);
    if (i === 2) tl.from(groups[2].querySelectorAll('.bay'), { y: -80, duration: 0.7, stagger: 0.08, ease: 'back.out(1.6)' }, at);
    if (i === 4) tl.from(groups[4], { x: -60, duration: 0.8 }, at);
  });
  tl.to(texts, { opacity: 1, duration: 0.5 }, 3.2);
  tl.to(groups[5], { opacity: 1, duration: 1 }, 5);
  tl.to({}, { duration: 0.6 });
}

/* ── Skip hire: truck delivers, skip fills, truck collects ─────── */
export function initSkip({ gsap, reduced }) {
  const section = document.querySelector('[data-skip]');
  const svg = section.querySelector('[data-skip-svg]');
  const truck = svg.querySelector('[data-skip-truck]');
  const bin = svg.querySelector('[data-skip-bin]');
  const fill = svg.querySelector('[data-skip-fill]');
  const road = svg.querySelector('[data-skip-road]');
  const arm = svg.querySelector('[data-skip-arm]');
  const steps = [...section.querySelectorAll('[data-skip-steps] li')];
  const lines = [...section.querySelectorAll('[data-skip-line]')];

  // load: rubble, boxes, planks, cuttings
  const colors = ['#9b8a74', '#7C8584', '#F2C230', '#48B84A', '#c9b79c', '#2a2f2f', '#15803D'];
  const ns = 'http://www.w3.org/2000/svg';
  const pieces = [];
  for (let i = 0; i < 34; i++) {
    const r = document.createElementNS(ns, 'rect');
    const w = 10 + Math.random() * 22, h = 8 + Math.random() * 14;
    const row = Math.floor(i / 9), x = 262 + (i % 9) * 13 + Math.random() * 8 - w / 4;
    const y = 290 - row * 15 - h;
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('rx', 2);
    r.setAttribute('fill', colors[i % colors.length]);
    r.setAttribute('transform', `rotate(${(Math.random() - 0.5) * 30} ${x + w / 2} ${y + h / 2})`);
    fill.append(r); pieces.push(r);
  }

  // truck x = 325 when it delivers / collects
  const T = { x: -150 };
  const B = { x: -375, y: -48 };
  const apply = () => {
    truck.setAttribute('transform', `translate(${T.x} 0)`);
    bin.setAttribute('transform', `translate(${B.x} ${B.y})`);
    road.setAttribute('stroke-dashoffset', -T.x * 0.5);
  };
  apply();

  const setStep = (p) => {
    const idx = p < 0.2 ? 0 : p < 0.34 ? 1 : p < 0.66 ? 2 : p < 0.88 ? 3 : 4;
    steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
    lines.forEach((l, i) => l.classList.toggle('is-on', i === 0 ? true : i === 1 ? p >= 0.34 : p >= 0.66));
  };

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' }, onUpdate: apply });
  // the skip rides the bed at B.x = T.x − 225; the arm swings it back and down behind the truck
  tl.to([T, B], { x: (i) => (i === 0 ? 325 : 100), duration: 2 }, 0)                // delivery
    .to(arm, { rotation: -22, svgOrigin: '60 252', duration: 1, ease: 'power1.inOut' }, 2.1)
    .to(B, { x: 0, duration: 1, ease: 'power1.inOut' }, 2.1)                          // placement
    .to(B, { y: 0, duration: 1, ease: 'power2.in' }, 2.1)
    .to(arm, { rotation: 0, svgOrigin: '60 252', duration: 0.4 }, 3.1)
    .to(T, { x: 760, duration: 1.1, ease: 'power2.in' }, 3.5)
    .from(pieces, { y: -220, opacity: 0, duration: 0.5, stagger: 0.07, ease: 'bounce.out' }, 4.4) // filling
    .to(T, { x: 325, duration: 1.2, ease: 'power2.out' }, 7)                         // collection
    .to(arm, { rotation: -22, svgOrigin: '60 252', duration: 0.3 }, 8.2)
    .to(B, { x: 100, duration: 0.9, ease: 'power1.inOut' }, 8.3)
    .to(B, { y: -48, duration: 0.9, ease: 'power2.out' }, 8.3)
    .to(arm, { rotation: 0, svgOrigin: '60 252', duration: 0.9, ease: 'power1.inOut' }, 8.3)
    .to([T, B], { x: (i) => (i === 0 ? 900 : 675), duration: 1.4, ease: 'power2.in' }, 9.3); // disposal

  if (reduced) { tl.progress(0.66); setStep(0.66); lines.forEach((l) => l.classList.add('is-on')); return; }

  gsap.to(tl, {
    progress: 1, ease: 'none',
    scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: (self) => setStep(self.progress) },
  });
  setStep(0);
}

/* ── Why Bekabee: each word fills the screen in turn ───────────── */
export function initWhy({ gsap, reduced }) {
  const section = document.querySelector('[data-why]');
  const pin = section.querySelector('[data-why-pin]');
  const words = [...section.querySelectorAll('[data-why-word]')];

  const fit = () => {
    words.forEach((w) => {
      w.style.fontSize = '100px';
      const target = Math.min(window.innerWidth * (reduced ? 0.84 : 0.9), window.innerWidth - 32);
      const size = Math.min(100 * (target / w.scrollWidth), window.innerHeight * 0.42);
      w.style.fontSize = `${size}px`;
    });
  };
  fit();
  window.addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
  if (reduced) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate(self) { pin.style.setProperty('--s', (0.25 + self.progress * 2.2).toFixed(3)); },
    },
  });
  words.forEach((w, i) => {
    const last = i === words.length - 1;
    tl.fromTo(w, { opacity: 0, scale: 0.35, yPercent: 30 }, { opacity: 1, scale: 1, yPercent: 0, duration: 1, ease: 'power3.out' });
    if (!last) tl.to(w, { opacity: 0, scale: 1.5, duration: 0.8, ease: 'power2.in' }, '+=0.5');
    else tl.to({}, { duration: 0.8 });
  });
}

/* ── Rubble: a scattered, slowly drifting texture of chunks ───── */
export function initRubble({ gsap, reduced }) {
  const bg = document.querySelector('[data-rubble-bg]');
  if (!bg) return;
  const tones = ['#2c302e', '#353a37', '#3d3a33', '#2a2f2f', '#433f37'];
  for (let i = 0; i < 38; i++) {
    const el = document.createElement('i');
    const s = 10 + Math.random() * 46;
    el.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${s}px;height:${s * (0.5 + Math.random() * 0.6)}px;background:${tones[i % tones.length]};transform:rotate(${Math.random() * 90}deg)`;
    el.dataset.depth = (0.2 + Math.random()).toFixed(2);
    bg.append(el);
  }
  if (reduced) return;
  gsap.utils.toArray(bg.children).forEach((el) => {
    gsap.to(el, { yPercent: -160 * Number(el.dataset.depth), ease: 'none', scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}
