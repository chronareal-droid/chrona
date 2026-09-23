import '../styles.css';
import 'leaflet/dist/leaflet.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { loadLocalManifest, attachVideo } from './media.js';
import { renderAll, renderTreatments, content } from './render.js';
import { grain, cursor, magnetic, splitWords, lazyImages, lazyVideos, hoverVideo, isTouch } from './effects.js';
import { booking } from './booking.js';

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = mqReduced.matches || new URLSearchParams(location.search).has('reduced');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, a, b) => clamp((p - a) / (b - a));

let lenis = null;

async function init() {
  document.body.classList.add('is-loading');
  if (reduced) document.documentElement.classList.add('reduced');

  await loadLocalManifest();
  renderAll();
  splitWords();
  const rescanImages = lazyImages();
  lazyVideos(reduced);
  grain(reduced);
  cursor(gsap);
  magnetic(gsap);
  booking(gsap, reduced);

  if (!reduced) {
    lenis = new Lenis({ duration: 1.35, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, touchMultiplier: 1.2 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    if (import.meta.env.DEV) window.__lenis = lenis;
  }

  const heroVideo = $('.hero__video');
  attachVideo(heroVideo);
  heroVideo.load();

  anchors();
  stickyCta();
  treatments(rescanImages);
  packagesRail();
  groups();
  team();
  gift();
  mapWhenNear();
  distortion();

  await loader(heroVideo);

  if (reduced) {
    reducedMode(heroVideo);
  } else {
    hero(heroVideo);
    story();
    gsap.matchMedia().add('(min-width: 769px)', () => { ritualHorizontal(); galleryHorizontal(); });
    gsap.matchMedia().add('(max-width: 768px)', () => { mobileRails(); });
    reveals();
    counters();
    couples();
    night();
    location_();
    velocity();
    ScrollTrigger.sort();
  }
  ScrollTrigger.refresh();
}

/* =========================================================
   LOADER → curtain lifts → L'ABRI punches in
   ========================================================= */
function loader(video) {
  return new Promise((resolve) => {
    const count = $('.loader__count');
    const o = { v: 0 };
    let ready = false;
    const markReady = () => { ready = true; };
    if (video.readyState >= 2) markReady();
    video.addEventListener('loadeddata', markReady, { once: true });
    video.addEventListener('error', markReady, { once: true });
    video.querySelector('source:last-child')?.addEventListener('error', markReady, { once: true });
    setTimeout(markReady, reduced ? 200 : 3200); // never hold the page hostage

    const tick = () => {
      const cap = ready ? 100 : 86;
      o.v += (cap - o.v) * (ready ? 0.14 : 0.03);
      count.textContent = String(Math.round(o.v)).padStart(3, '0');
      if (ready && o.v > 99.4) {
        count.textContent = '100';
        $('.loader').classList.add('is-done');
        document.body.classList.remove('is-loading');
        intro();
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function intro() {
  if (reduced) return;
  const glyphs = $$('.hero__glyph');
  const tl = gsap.timeline({ delay: 0.55 });
  tl.from('.hero__media', { scale: 1.25, duration: 2.6, ease: 'expo.out' }, 0)
    .fromTo(glyphs,
      { scale: 2.6, yPercent: -10, opacity: 0, filter: 'blur(24px)' },
      { scale: 1, yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.1, stagger: 0.085, ease: 'expo.out' }, 0.25)
    // micro camera shake on impact
    .to('.hero__stage', { keyframes: { x: [0, -5, 4, -2, 0], y: [0, 3, -3, 1, 0] }, duration: 0.42, ease: 'none' }, 0.55)
    .from('.hero__kicker span', { yPercent: 120, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.9)
    .from('.hero__tag .line > span', { yPercent: 110, duration: 1.2, stagger: 0.12, ease: 'expo.out' }, 1.05)
    .from('.hero__scroll .arrow, .hero__chapters, .hero__progress, .nav', { opacity: 0, duration: 1.2, ease: 'power2.out' }, 1.3)
    .fromTo('.sticky-cta', { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity' }, 1.5);
}

/* =========================================================
   HERO: scroll-scrubbed film + FORGE-style type punch
   Timeline (hero progress p):
   0.00–0.62  video scrubs 0 → end (oil → hands → steam → stones → treatment → garden)
   0.04–0.40  L'ABRI punches toward the viewer and through the screen
   0.62–0.70  video freezes, charcoal floods in (liquid wipe)
   0.70–1.00  ESCAPE. UNWIND. RECONNECT. one word at a time
   ========================================================= */
function hero(video) {
  const VIDEO_END = 0.62;
  const chapters = $$('.hero__chapters li');
  const bar = $('.hero__progress span');
  const letters = $$('.hero__letter');
  const title = $('.hero__title');
  const liquid = $('.words__liquid path');
  const words = $$('.words__word');
  const rule = $('.words__rule');

  // iOS/Safari need a user-gesture "unlock" before seeking paints frames
  const unlock = () => { video.play().then(() => video.pause()).catch(() => {}); };
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });

  let target = 0;
  let current = 0;
  const scrub = () => {
    const d = video.duration;
    if (d && isFinite(d)) {
      current += (target - current) * 0.14;
      const t = clamp(current, 0, 1) * (d - 0.06);
      if (!video.seeking && Math.abs(video.currentTime - t) > 0.012) {
        video.currentTime = t;
      }
    }
    requestAnimationFrame(scrub);
  };
  requestAnimationFrame(scrub);

  // Type punch: letters split apart and rush toward camera, then the word flies through.
  const typeTl = gsap.timeline({ paused: true });
  typeTl
    .to('.hero__kicker, .hero__tag, .hero__scroll', { opacity: 0, y: -30, duration: 0.12, ease: 'none' }, 0)
    .to(letters, {
      yPercent: (i) => [-18, -40, 12, -26, 20, -8][i] || 0,
      xPercent: (i) => (i - 2.5) * 16,
      rotate: (i) => [-4, 8, 2, -3, 4, -6][i] || 0,
      scale: 1.2, duration: 0.4, ease: 'power2.inOut', stagger: 0.02,
    }, 0.02)
    .to(title, { scale: 9, opacity: 0, filter: 'blur(14px)', duration: 0.5, ease: 'power3.in' }, 0.42)
    .to(video, { scale: 1.14, duration: 1, ease: 'none' }, 0);

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: ({ progress: p }) => {
      target = range(p, 0, VIDEO_END);
      bar.style.transform = `scaleX(${target})`;
      const ci = Math.min(chapters.length - 1, Math.floor(target * chapters.length));
      chapters.forEach((c, i) => c.classList.toggle('is-on', i === ci && p < VIDEO_END + 0.02));

      typeTl.progress(range(p, 0.02, 0.44));

      // liquid charcoal wipe (curved leading edge) over the frozen last frame
      const w = range(p, VIDEO_END, 0.7);
      const y = 100 - w * 115;
      const bulge = Math.sin(w * Math.PI) * 18;
      liquid.setAttribute('d', `M0,100 L0,${y + bulge} Q50,${y - bulge} 100,${y + bulge} L100,100 Z`);

      // words: each owns a slice; blur→sharp, scale down, masked reveal, then exit up
      const wp = range(p, 0.7, 1);
      words.forEach((el, i) => {
        // overlapping slices so one word hands over to the next without a dead frame
        const s = i * 0.3; const e = i === 2 ? 1 : s + 0.4;
        const local = range(wp, s, e);
        const inP = range(local, 0, 0.45);
        const outP = i === 2 ? range(local, 0.92, 1) * 0.0 : range(local, 0.72, 1);
        const vis = local > 0 && (i === 2 || local < 1);
        el.style.opacity = vis ? String(inP * (1 - outP)) : '0';
        el.style.filter = `blur(${(1 - inP) * 22 + outP * 10}px)`;
        el.style.transform = `translateY(${(1 - inP) * 8 - outP * 18}vh) scale(${1.45 - inP * 0.45 - outP * 0.12})`;
        el.style.clipPath = `inset(${(1 - inP) * 50}% 0 ${(1 - inP) * 50}% 0)`;
      });
      rule.style.transform = `scaleX(${wp})`;
    },
  });
}

/* =========================================================
   PHILOSOPHY: pinned, six visual states, image ↔ text rhythm
   ========================================================= */
function story() {
  const imgs = $$('.story__img');
  const steps = $$('.story__step');
  const cur = $('.story__current');
  const bar = $('.story__bar span');
  const n = steps.length;
  ScrollTrigger.create({
    trigger: '.story', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: ({ progress: p }) => {
      const f = p * n;
      const idx = Math.min(n - 1, Math.floor(f));
      cur.textContent = String(idx + 1).padStart(2, '0');
      bar.style.transform = `scaleX(${p})`;
      steps.forEach((s, i) => {
        const local = f - i; // 0..1 while active
        const inP = clamp(local / 0.28);
        const outP = i === n - 1 ? 0 : clamp((local - 0.78) / 0.22);
        const o = local < 0 ? 0 : inP * (1 - outP);
        const isText = s.classList.contains('is-text');
        s.style.opacity = o;
        const blur = (1 - inP) * 16 + outP * 12;
        s.style.filter = `blur(${blur}px)`;
        const ty = (1 - inP) * 70 - outP * 70;
        s.style.transform = isText
          ? `translate(-50%, calc(-50% + ${ty}px)) scale(${1.12 - inP * 0.12})`
          : `translateY(calc(-50% + ${ty}px))`;
      });
      imgs.forEach((im, i) => {
        const local = f - i;
        const inP = clamp((local + 0.15) / 0.35);
        const outP = i === n - 1 ? 0 : clamp((local - 0.85) / 0.3);
        const isText = steps[i].classList.contains('is-text');
        im.style.opacity = local < -0.15 ? 0 : inP * (1 - outP * 0.999);
        // image-led steps are crisp and close; text-led steps push the image back, dim and soft
        const sc = 1.14 - inP * 0.1 + clamp(local) * 0.04;
        im.style.transform = `scale(${sc})`;
        im.style.filter = isText ? `brightness(${0.42}) blur(${3 + inP * 3}px) saturate(0.7)` : `brightness(${0.75 + inP * 0.2})`;
        im.style.clipPath = i % 2 ? `inset(0 0 0 ${(1 - inP) * 100}%)` : `inset(${(1 - inP) * 100}% 0 0 0)`;
      });
    },
  });
}

/* =========================================================
   Generic reveals: split headings, fades, clip reveals
   ========================================================= */
function reveals() {
  $$('.split').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from(el.querySelectorAll('.w > span'), {
      yPercent: 110, rotate: 4, duration: 1.3, stagger: 0.06, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
  $$('.eyebrow, .lede, .pack__sub, .fineprint').forEach((el) => {
    if (el.closest('.hero, .book, .night__offer, .couples, .loc__card, .gallery__head')) return;
    gsap.from(el, { opacity: 0, y: 24, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  // pricing trio
  gsap.fromTo('.pricecard', { y: 90, opacity: 0 }, {
    y: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.12, clearProps: 'transform,opacity',
    scrollTrigger: { trigger: '.price__grid', start: 'top 80%', onEnter: () => countUp($$('.price .count')) },
  });
  // package cards clip reveal
  gsap.from('.pcard', {
    clipPath: 'inset(0 0 0 100%)', duration: 1.6, ease: 'expo.inOut', stagger: 0.1,
    scrollTrigger: { trigger: '.pack__rail', start: 'top 85%' },
  });
  gsap.fromTo('.gcard', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.groups__cards', start: 'top 85%' } });
  gsap.fromTo('.mcard', { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.3, stagger: 0.1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.team__rail', start: 'top 85%' } });
  gsap.from('.book__frame', { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.book', start: 'top 75%' } });
  gsap.fromTo('.foot__big', { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  // treatment grid entrance
  gsap.fromTo('.tcard', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.06, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.treat__grid', start: 'top 85%' } });
}

/* =========================================================
   COUNTERS
   ========================================================= */
function countUp(els) {
  els.forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = Number(el.dataset.to);
    const plain = el.dataset.plain === '1' && to >= 1000 && to < 3000; // years: no thousands separator
    const o = { v: 0 };
    gsap.to(o, {
      v: to, duration: to > 100 ? 2.4 : 1.6, ease: 'expo.out',
      onUpdate: () => {
        const r = Math.round(o.v);
        el.textContent = plain ? String(r) : r.toLocaleString('en-ZA').replace(/\s| /g, ',');
      },
    });
  });
}
function counters() {
  $$('.stats .count').forEach((el) => { el.textContent = '0'; });
  ScrollTrigger.create({ trigger: '.stats', start: 'top 75%', once: true, onEnter: () => countUp($$('.stats .count')) });
  gsap.from('.stat', { y: 80, opacity: 0, duration: 1.4, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 80%' } });
  $$('.price .count').forEach((el) => { el.textContent = '0'; });
}

/* =========================================================
   RITUAL: horizontal scrub (desktop)
   ========================================================= */
function ritualHorizontal() {
  const track = $('.ritual__track');
  const dist = () => track.scrollWidth - window.innerWidth;
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.ritual', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
  });
  $$('.stage').forEach((st) => {
    gsap.fromTo(st.querySelector('.stage__img > div'), { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: st, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    gsap.from(st.querySelector('.stage__img'), { clipPath: 'inset(0 100% 0 0)', ease: 'none', scrollTrigger: { trigger: st, containerAnimation: tween, start: 'left 95%', end: 'left 35%', scrub: true } });
    gsap.from(st.querySelectorAll('.stage__copy > *'), { y: 80, opacity: 0, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: st, containerAnimation: tween, start: 'left 70%', end: 'left 25%', scrub: true } });
    gsap.from(st.querySelector('.stage__num'), { xPercent: 40, ease: 'none', scrollTrigger: { trigger: st, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
  });
  return () => gsap.set(track, { clearProps: 'transform' });
}

/* =========================================================
   GALLERY: vertical scroll → horizontal editorial drift
   ========================================================= */
function galleryHorizontal() {
  const track = $('.gallery__track');
  const items = $$('.gitem');
  items.forEach((it) => gsap.set(it, { rotate: Number(it.dataset.rot) }));
  const dist = () => track.scrollWidth - window.innerWidth;
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top top', end: () => `+=${dist() * 1.1}`, pin: true, scrub: 1, invalidateOnRefresh: true },
  });
  gsap.to('.gallery__head', { opacity: 0, x: -100, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top top', end: '+=600', scrub: true } });
  items.forEach((it, i) => {
    const frame = it.querySelector('.gitem__frame');
    const img = it.querySelector('.gitem__img');
    gsap.to(frame, { clipPath: 'inset(0% 0 0 0)', ease: 'power2.out', scrollTrigger: { trigger: it, containerAnimation: tween, start: 'left 100%', end: 'left 55%', scrub: true } });
    gsap.fromTo(img, { xPercent: -10, scale: 1.25 }, { xPercent: 10, scale: 1.08, ease: 'none', scrollTrigger: { trigger: it, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    gsap.fromTo(it, { yPercent: (i % 2 ? 8 : -8) }, { yPercent: (i % 2 ? -8 : 8), ease: 'none', scrollTrigger: { trigger: it, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
  });
}

/* scroll-velocity skew on the moving rails */
function velocity() {
  if (!lenis) return;
  const skewers = gsap.utils.toArray('.gitem__frame, .stage__img');
  const set = skewers.map((el) => gsap.quickTo(el, 'skewX', { duration: 0.6, ease: 'power3' }));
  lenis.on('scroll', ({ velocity: v }) => {
    const s = clamp(v * -0.12, -6, 6);
    set.forEach((fn) => fn(s));
  });
}

/* mobile: horizontal sections are native swipe rails; add gentle entrance + active states */
function mobileRails() {
  $$('.gitem__frame').forEach((f) => { f.style.clipPath = 'none'; });
  $$('.gitem').forEach((it) => gsap.set(it, { rotate: Number(it.dataset.rot) * 0.6 }));
  const railScale = (rail, sel) => {
    const items = $$(sel, rail);
    const upd = () => {
      const c = rail.getBoundingClientRect().left + rail.clientWidth / 2;
      items.forEach((it) => {
        const r = it.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - c) / rail.clientWidth;
        it.style.transform = `scale(${1 - Math.min(d, 1) * 0.08})`;
        it.style.opacity = String(1 - Math.min(d, 1) * 0.45);
      });
    };
    rail.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
    upd();
  };
  railScale($('.ritual__track'), '.panel');
  railScale($('.treat__grid'), '.tcard');
  railScale($('.gallery__track'), '.gitem__frame');
  railScale($('.team__rail'), '.mcard');
  railScale($('.groups__cards'), '.gcard');
  document.addEventListener('treatments:render', () => railScale($('.treat__grid'), '.tcard'));
}

/* =========================================================
   TREATMENTS: tabs + cinematic hover
   ========================================================= */
function treatments(rescanImages) {
  const tabs = $('.treat__tabs');
  const grid = $('.treat__grid');
  const bind = () => {
    $$('.tcard', grid).forEach((card) => {
      const on = () => { grid.classList.add('is-hovering'); $$('.tcard', grid).forEach((c) => c.classList.toggle('is-active', c === card)); hoverVideo(card, true); };
      const off = () => { card.classList.remove('is-active'); hoverVideo(card, false); };
      card.addEventListener('mouseenter', on);
      card.addEventListener('focus', on);
      card.addEventListener('mouseleave', off);
      card.addEventListener('blur', off);
    });
  };
  grid.addEventListener('mouseleave', () => grid.classList.remove('is-hovering'));
  grid.addEventListener('focusout', (e) => { if (!grid.contains(e.relatedTarget)) grid.classList.remove('is-hovering'); });
  bind();
  tabs.addEventListener('click', (e) => {
    const t = e.target.closest('.treat__tab');
    if (!t || t.getAttribute('aria-selected') === 'true') return;
    $$('.treat__tab', tabs).forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    const swap = () => {
      renderTreatments(Number(t.dataset.cat));
      rescanImages();
      bind();
      document.dispatchEvent(new Event('treatments:render'));
      if (!reduced) gsap.fromTo($$('.tcard', grid), { y: 50, opacity: 0, clipPath: 'inset(100% 0 0 0)' }, { y: 0, opacity: 1, clipPath: 'inset(0% 0 0 0)', duration: 1, stagger: 0.05, ease: 'expo.out', clearProps: 'all' });
    };
    if (reduced) swap();
    else gsap.to($$('.tcard', grid), { opacity: 0, y: -20, duration: 0.3, stagger: 0.02, ease: 'power2.in', onComplete: swap });
    grid.scrollTo?.({ left: 0 });
  });
}

/* =========================================================
   PACKAGES rail: drag, buttons, meter
   ========================================================= */
function packagesRail() {
  const rail = $('.pack__rail');
  const meter = $('.pack__meter span');
  const upd = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const w = rail.clientWidth / rail.scrollWidth;
    meter.style.width = `${w * 100}%`;
    meter.style.transform = `translateX(${(max ? rail.scrollLeft / max : 0) * ((1 - w) / w) * 100}%)`;
  };
  rail.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd);
  upd();
  $$('.pack__btn').forEach((b) => b.addEventListener('click', () => {
    const card = $('.pcard', rail);
    rail.scrollBy({ left: Number(b.dataset.dir) * (card.offsetWidth + 20), behavior: reduced ? 'auto' : 'smooth' });
  }));
  // pointer drag with inertia (desktop)
  if (!isTouch()) {
    let down = false; let sx = 0; let sl = 0; let moved = 0; let vx = 0; let lx = 0;
    rail.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a, button')) return;
      down = true; moved = 0; sx = e.clientX; lx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-drag');
      rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener('pointermove', (e) => {
      if (!down) return;
      vx = e.clientX - lx; lx = e.clientX;
      moved = Math.abs(e.clientX - sx);
      rail.scrollLeft = sl - (e.clientX - sx) * 1.2;
    });
    const up = () => {
      if (!down) return;
      down = false;
      const o = { v: vx * 1.2 };
      gsap.to(o, { v: 0, duration: 1, ease: 'power3.out', onUpdate: () => { rail.scrollLeft -= o.v; }, onComplete: () => rail.classList.remove('is-drag') });
    };
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointercancel', up);
    rail.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); }, true);
  }
  // "Explore couples experiences" → jump the rail to the couples packages
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter="couple"]');
    if (!f) return;
    const card = rail.querySelector('.pcard[data-id="linger"]');
    if (card) setTimeout(() => rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft - 20, behavior: 'smooth' }), 900);
  });
}

/* =========================================================
   COUPLES: pinned, words light up one by one
   ========================================================= */
function couples() {
  const items = $$('.couples__list li');
  gsap.fromTo('.couples__bg', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.couples', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.couples__title', { opacity: 0, y: 80, filter: 'blur(12px)', ease: 'none', scrollTrigger: { trigger: '.couples', start: 'top 60%', end: 'top top', scrub: true } });
  gsap.from('.couples .btn, .couples .eyebrow', { opacity: 0, y: 30, ease: 'none', scrollTrigger: { trigger: '.couples', start: '75% bottom', end: 'bottom bottom', scrub: true } });
  ScrollTrigger.create({
    trigger: '.couples', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: ({ progress: p }) => {
      items.forEach((li, i) => {
        const l = range(p, 0.08 + i * 0.16, 0.26 + i * 0.16);
        li.style.opacity = String(0.12 + l * 0.88);
        li.style.filter = `blur(${(1 - l) * 8}px)`;
        li.style.transform = `translateY(${(1 - l) * 20}px)`;
      });
    },
  });
}

/* =========================================================
   NIGHT: day → evening, candlelight canvas
   ========================================================= */
function night() {
  gsap.fromTo('.night__bg', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.night', start: 'top 80%', end: 'top 10%', scrub: true } });
  gsap.fromTo('.night__sky', { filter: 'brightness(1.6) sepia(0.5)' }, { filter: 'brightness(1) sepia(0)', ease: 'none', scrollTrigger: { trigger: '.night', start: 'top bottom', end: 'top top', scrub: true } });
  gsap.from('.night__offer > *', { y: 40, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.night__offer', start: 'top 85%' } });

  const c = $('.night__candles');
  const ctx = c.getContext('2d');
  let W = 0; let H = 0; let on = false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); window.addEventListener('resize', size);
  const flames = Array.from({ length: 26 }, () => ({ x: Math.random(), y: 0.62 + Math.random() * 0.3, r: 18 + Math.random() * 40, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.2 }));
  const embers = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0012, a: Math.random() }));
  const draw = (t) => {
    if (!on) return;
    ctx.clearRect(0, 0, W, H);
    const s = t / 1000;
    flames.forEach((f) => {
      const flick = 0.75 + Math.sin(s * f.sp * 3 + f.ph) * 0.12 + Math.sin(s * f.sp * 7.3 + f.ph) * 0.08;
      const x = f.x * W; const y = f.y * H; const r = f.r * flick;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
      g.addColorStop(0, `rgba(255, 196, 110, ${0.55 * flick})`);
      g.addColorStop(0.25, `rgba(217, 152, 63, ${0.22 * flick})`);
      g.addColorStop(1, 'rgba(184, 83, 47, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
      // reflection
      const ry = H - (H - y) * 0.2 + 30;
      if (ry < H) {
        ctx.fillStyle = `rgba(255, 190, 110, ${0.05 * flick})`;
        ctx.fillRect(x - r * 0.15, ry, r * 0.3, (H - ry) * (0.5 + Math.sin(s * 2 + f.ph) * 0.1));
      }
    });
    embers.forEach((e) => {
      e.y -= e.v; if (e.y < 0) { e.y = 1; e.x = Math.random(); }
      ctx.fillStyle = `rgba(255, 200, 130, ${0.4 * Math.abs(Math.sin(s + e.a * 6))})`;
      ctx.fillRect(e.x * W + Math.sin(s + e.a * 10) * 8, e.y * H, 1.6, 1.6);
    });
    requestAnimationFrame(draw);
  };
  ScrollTrigger.create({
    trigger: '.night', start: 'top bottom', end: 'bottom top',
    onToggle: ({ isActive }) => { on = isActive; if (on) { size(); requestAnimationFrame(draw); } },
  });
}

/* =========================================================
   GROUPS: hover swaps the whole background
   ========================================================= */
function groups() {
  const cards = $('.groups__cards');
  const bgs = $$('.groups__bg');
  const activate = (card) => {
    const i = Number(card.dataset.i);
    cards.classList.add('is-hovering');
    $$('.gcard', cards).forEach((c) => c.classList.toggle('is-active', c === card));
    bgs.forEach((b, j) => b.classList.toggle('is-on', j === i));
  };
  $$('.gcard', cards).forEach((c) => {
    c.addEventListener('mouseenter', () => activate(c));
    c.addEventListener('focus', () => activate(c));
  });
  cards.addEventListener('mouseleave', () => { cards.classList.remove('is-hovering'); $$('.gcard', cards).forEach((c) => c.classList.remove('is-active')); });
  // touch: background follows the centred card
  cards.addEventListener('scroll', () => {
    if (!isTouch()) return;
    const mid = cards.getBoundingClientRect().left + cards.clientWidth / 2;
    let best = null; let bd = Infinity;
    $$('.gcard', cards).forEach((c) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = c; } });
    if (best) bgs.forEach((b, j) => b.classList.toggle('is-on', j === Number(best.dataset.i)));
  }, { passive: true });
}

/* =========================================================
   TEAM hover
   ========================================================= */
function team() {
  const rail = $('.team__rail');
  $$('.mcard', rail).forEach((m) => {
    const on = () => { rail.classList.add('is-hovering'); $$('.mcard', rail).forEach((x) => x.classList.toggle('is-active', x === m)); };
    m.addEventListener('mouseenter', on); m.addEventListener('focus', on);
  });
  rail.addEventListener('mouseleave', () => { rail.classList.remove('is-hovering'); $$('.mcard', rail).forEach((x) => x.classList.remove('is-active')); });
}

/* =========================================================
   GIFT card: pointer tilt + shine
   ========================================================= */
function gift() {
  if (reduced || isTouch()) return;
  const scene = $('.gift');
  const card = $('.gift__card');
  const rx = gsap.quickTo(card, 'rotationX', { duration: 1.2, ease: 'power3' });
  const ry = gsap.quickTo(card, 'rotationY', { duration: 1.2, ease: 'power3' });
  scene.addEventListener('pointermove', (e) => {
    const r = scene.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.animationPlayState = 'paused';
    ry(x * 40); rx(-y * 30);
    card.style.setProperty('--shine', `${(x + 0.5) * 200 - 100}%`);
  });
  scene.addEventListener('pointerleave', () => { card.style.animationPlayState = 'running'; rx(0); ry(0); });
}

/* =========================================================
   LOCATION: aerial film → map
   ========================================================= */
function location_() {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.loc', start: 'top top', end: 'bottom bottom', scrub: true } });
  tl.fromTo('.loc__img', { scale: 1 }, { scale: 1.35, ease: 'none', duration: 1 }, 0)
    .fromTo('.loc__map', { opacity: 0, clipPath: 'circle(0% at 70% 50%)' }, { opacity: 1, clipPath: 'circle(150% at 70% 50%)', ease: 'power2.inOut', duration: 0.6 }, 0.25)
    .from('.loc__card > *', { y: 60, opacity: 0, stagger: 0.05, duration: 0.3 }, 0.05);
}

function mapWhenNear() {
  const el = $('#map');
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const L = (await import('leaflet')).default;
    const b = content.business;
    const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, attributionControl: true, zoomSnap: 0.25 }).setView([b.lat, b.lng - (window.innerWidth > 768 ? 0.014 : 0)], 14.5);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    const icon = L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
    L.marker([b.lat, b.lng], { icon, title: "L'abri Day Spa" }).addTo(map)
      .bindPopup(`<strong>L'abri Day Spa</strong><br>${b.address.join(', ')}`);
    el.insertAdjacentHTML('beforeend', '<span class="loc__map-label">Kilner Park · Pretoria</span>');
    ScrollTrigger.refresh();
  }, { rootMargin: '100% 0px' });
  io.observe(el);
}

/* =========================================================
   Anchors: smooth scroll with a liquid "page transition" for long jumps
   ========================================================= */
function anchors() {
  const veil = $('.veil');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    const y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY;
    const far = Math.abs(y - window.scrollY) > window.innerHeight * 2.5;
    if (reduced || !lenis) { window.scrollTo(0, y); focusTarget(target); return; }
    if (!far) { lenis.scrollTo(y, { duration: 1.6 }); return; }
    gsap.timeline()
      .fromTo(veil, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.6, ease: 'power3.inOut' })
      .add(() => { lenis.scrollTo(y, { immediate: true, force: true }); ScrollTrigger.update(); })
      .to(veil, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'power3.inOut', delay: 0.1 })
      .add(() => focusTarget(target));
  });
}
function focusTarget(t) {
  if (t === document.body) return;
  t.setAttribute('tabindex', '-1');
  t.focus({ preventScroll: true });
}

/* =========================================================
   Sticky CTA: always there, steps aside at the booking form
   ========================================================= */
function stickyCta() {
  const cta = $('.sticky-cta');
  // hide once the form occupies the lower part of the screen (works however tall the section is)
  const io = new IntersectionObserver(([e]) => cta.classList.toggle('is-hidden', e.isIntersecting), { rootMargin: '0px 0px -35% 0px' });
  io.observe($('#booking'));
}

/* liquid image distortion on hover: pulse the displacement strength */
function distortion() {
  if (reduced || isTouch()) return;
  const map = $('.distort-map');
  const o = { s: 0 };
  const pulse = () => {
    gsap.killTweensOf(o);
    gsap.timeline()
      .to(o, { s: 38, duration: 0.45, ease: 'power2.out', onUpdate: () => map.setAttribute('scale', o.s.toFixed(1)) })
      .to(o, { s: 0, duration: 1.4, ease: 'power3.out', onUpdate: () => map.setAttribute('scale', o.s.toFixed(1)) });
  };
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.pcard, .gitem');
    if (t && !t.contains(e.relatedTarget)) pulse();
  });
}

/* =========================================================
   Reduced motion: static, complete, readable
   ========================================================= */
function reducedMode(video) {
  $('.hero').after($('.words')); // the three words become a calm static beat after the hero
  const show = () => { try { video.currentTime = Math.min(2, (video.duration || 4) * 0.35); } catch { /* ignore */ } };
  if (video.readyState >= 1) show(); else video.addEventListener('loadedmetadata', show, { once: true });
  $$('.count').forEach((el) => {
    const to = Number(el.dataset.to);
    el.textContent = el.dataset.plain === '1' && to < 3000 ? String(to) : to.toLocaleString('en-ZA').replace(/\s| /g, ',');
  });
  $$('.story__img').forEach((im, i) => { im.style.opacity = i === 0 ? '1' : '0'; });
  $$('.gitem').forEach((it) => { it.style.transform = `rotate(${it.dataset.rot}deg)`; });
}

init().catch((err) => {
  // Never leave the visitor behind a loader
  document.body.classList.remove('is-loading');
  document.querySelector('.loader')?.classList.add('is-done');
  throw err;
});
