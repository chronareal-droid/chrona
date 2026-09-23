// Micro-interactions: film grain, custom cursor, magnetic buttons, split text, lazy media.
import { imageUrl, attachVideo } from './media.js';

export const isTouch = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

/* ---------- film grain: a few pre-rendered noise tiles, cycled (cheap, crisp at 1:1) ---------- */
export function grain(reduced) {
  const el = document.querySelector('.grain');
  const S = 220;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const frames = Array.from({ length: reduced ? 1 : 4 }, () => {
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return `url(${c.toDataURL('image/png')})`;
  });
  el.style.backgroundImage = frames[0];
  if (reduced) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % frames.length;
    el.style.backgroundImage = frames[i];
    el.style.backgroundPosition = `${(Math.random() * S) | 0}px ${(Math.random() * S) | 0}px`;
  }, 90);
}

/* ---------- custom cursor ---------- */
export function cursor(gsap) {
  if (isTouch()) return;
  document.documentElement.classList.add('has-cursor');
  const el = document.querySelector('.cursor');
  const dot = el.querySelector('.cursor__dot');
  const ring = el.querySelector('.cursor__ring');
  const label = el.querySelector('.cursor__label');
  const xd = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const yd = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const xr = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
  const yr = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { xd(e.clientX); yd(e.clientY); xr(e.clientX); yr(e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => el.classList.remove('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button');
    if (!t) { el.classList.remove('is-label', 'is-book'); return; }
    const txt = t.dataset.cursor || (t.tagName === 'A' ? 'VIEW' : '');
    label.textContent = txt;
    el.classList.toggle('is-label', !!txt);
    el.classList.toggle('is-book', txt === 'BOOK');
  });
}

/* ---------- magnetic buttons ---------- */
export function magnetic(gsap) {
  if (isTouch()) return;
  document.addEventListener('pointermove', (e) => {
    const m = e.target.closest?.('.magnetic');
    document.querySelectorAll('.magnetic.is-mag').forEach((el) => {
      if (el !== m) { el.classList.remove('is-mag'); gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }); }
    });
    if (!m) return;
    const r = m.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    m.classList.add('is-mag');
    gsap.to(m, { x: x * 0.3, y: y * 0.4, duration: 0.6, ease: 'power3.out' });
  }, { passive: true });
}

/* ---------- split text into masked words ---------- */
export function splitWords(root = document) {
  root.querySelectorAll('.split').forEach((el) => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  });
}

/* ---------- lazy background images ---------- */
export function lazyImages() {
  const load = (el) => {
    if (el.dataset.loaded) return;
    const url = imageUrl(el.dataset.img);
    if (!url) return;
    el.dataset.loaded = '1';
    const pre = new Image();
    pre.decoding = 'async';
    pre.onload = () => { el.style.backgroundImage = `url("${url}")`; el.classList.add('is-loaded'); };
    pre.src = url;
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '120% 120%' });
  const scan = () => document.querySelectorAll('[data-img]:not([data-loaded])').forEach((el) => io.observe(el));
  scan();
  return scan;
}

/* ---------- lazy videos: attach sources near viewport, pause off-screen ---------- */
export function lazyVideos(reduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (v.dataset.hover !== undefined || v.classList.contains('hero__video')) return;
      if (isIntersecting) {
        if (!v.dataset.attached) {
          attachVideo(v);
          v.addEventListener('loadeddata', () => v.classList.add('is-ready'), { once: true });
          v.load();
        }
        if (!reduced) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    });
  }, { rootMargin: '25% 0px' });
  const scan = () => document.querySelectorAll('video[data-media]').forEach((v) => io.observe(v));
  scan();
  return scan;
}

/* ---------- hover video previews (treatment cards) ---------- */
export function hoverVideo(card, on) {
  const v = card.querySelector('video[data-hover]');
  if (!v) return;
  if (on) {
    if (!v.dataset.attached) { attachVideo(v); v.load(); }
    card.classList.add('is-video');
    v.play().catch(() => {});
  } else {
    card.classList.remove('is-video');
    v.pause();
  }
}

/* ---------- fit oversized display type to its box ----------
   Syne is very wide, so on narrow screens a single long word ("RECONNECT.") can be wider than the
   viewport. Shrink each heading just enough that its widest line fits; groups share one size. */
const FIT = [
  { sel: '.hero__title', pad: 0 },
  { sel: '.words__word', group: true },
  { sel: '.story__step h3' },
  { sel: '.stage__copy h3, .ritual__intro .display' },
  { sel: '.display, .mega, .couples__title, .night__title, .book__step legend' },
  { sel: '.pcard__name, .pricecard__name, .gcard h3, .mcard__name' },
  { sel: '.stat__n', group: true },
  { sel: '.foot__big' },
];

export function fitType() {
  const vw = document.documentElement.clientWidth;
  const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 16;
  FIT.forEach(({ sel, group }) => {
    const els = [...document.querySelectorAll(sel)];
    els.forEach((el) => { el.style.fontSize = ''; });
    const ratios = els.map((el) => {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      // available width: the element's own box, but never more than the viewport minus gutters
      const box = el.classList.contains('words__word') || el.classList.contains('hero__title') || el.classList.contains('foot__big')
        ? vw - gutter * 2
        : Math.min(el.clientWidth || vw, vw - gutter * 2);
      const need = el.scrollWidth;
      return { el, fs, r: need > box + 1 ? box / need : 1 };
    });
    if (group) {
      const r = Math.min(...ratios.map((x) => x.r), 1);
      if (r < 1) ratios.forEach(({ el, fs }) => { el.style.fontSize = `${Math.floor(fs * r * 0.98)}px`; });
    } else {
      ratios.forEach(({ el, fs, r }) => { if (r < 1) el.style.fontSize = `${Math.floor(fs * r * 0.98)}px`; });
    }
  });
}
