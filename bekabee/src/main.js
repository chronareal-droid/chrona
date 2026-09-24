import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHero } from './js/hero.js';
import { initHow } from './js/how.js';
import { initFacility, initSkip, initWhy, initRubble } from './js/scenes.js';
import { initSymbiosis } from './js/symbiosis.js';
import { initSorter } from './js/sorter.js';
import { initQuoteForm } from './js/form.js';
import { initCursor } from './js/cursor.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('reduced');
if (reduced) root.classList.add('reduced');

/* ── smooth scroll ─────────────────────────────────────────── */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

/* ── anchor links + service preselect ─────────────────────── */
const serviceSelect = document.querySelector('[data-service-select]');
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  e.preventDefault();
  if (a.dataset.service && serviceSelect) {
    serviceSelect.value = a.dataset.service;
    serviceSelect.closest('.field')?.classList.remove('is-invalid');
  }
  closeMenu();
  scrollToTarget(id === 'top' ? 0 : target);
  history.replaceState(null, '', id === 'top' ? location.pathname + location.search : `#${id}`);
  if (a.dataset.service) {
    const form = document.querySelector('[data-quote-form]');
    setTimeout(() => { form?.classList.remove('is-flash'); void form?.offsetWidth; form?.classList.add('is-flash'); }, reduced ? 0 : 1300);
  }
});

/* ── nav: solid on scroll, hide on scroll down, active link ─── */
const nav = document.querySelector('[data-nav]');
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('is-solid', y > 30);
  const menuOpen = document.body.classList.contains('menu-open');
  nav.classList.toggle('is-hidden', !menuOpen && y > 700 && y > lastY + 2);
  if (y < lastY - 2 || y < 700) nav.classList.remove('is-hidden');
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const navLinks = [...document.querySelectorAll('.nav__links a')];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const activeObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => activeObs.observe(s));

/* ── full-screen mobile menu ──────────────────────────────── */
const menu = document.querySelector('[data-menu]');
const toggle = document.querySelector('[data-menu-toggle]');
function openMenu() {
  menu.hidden = false;
  requestAnimationFrame(() => menu.classList.add('is-open'));
  toggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
  document.body.style.overflow = 'hidden';
  lenis?.stop();
  menu.querySelector('a')?.focus({ preventScroll: true });
}
function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  menu.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
  document.body.style.overflow = '';
  lenis?.start();
  setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700);
}
toggle.addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); toggle.focus(); } });
window.matchMedia('(min-width: 1081px)').addEventListener('change', (m) => m.matches && closeMenu());

/* ── sticky mobile CTA: hide over the quote form ──────────── */
const mbar = document.querySelector('[data-mbar]');
const contact = document.getElementById('contact');
new IntersectionObserver(([en]) => mbar.classList.toggle('is-hidden', en.isIntersecting), { threshold: 0.15 }).observe(contact);

/* ── split headings into masked words ─────────────────────── */
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part;
          w.append(inner); frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    });
  };
  walk(el);
  return el.querySelectorAll('.w > span');
}

if (!reduced) {
  document.querySelectorAll('[data-reveal-words]').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 110, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.from('.principle', { y: 60, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.principles', start: 'top 80%' } });
  gsap.from('.stream', { y: 50, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.streams', start: 'top 80%' } });
  gsap.from('.sectors__grid li', { y: 50, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.sectors__grid', start: 'top 85%' } });
  gsap.from('.case__flow li', { y: 40, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.case__flow', start: 'top 80%' } });
}

/* ── recycling steps progress ─────────────────────────────── */
const steps = [...document.querySelectorAll('[data-steps] .step')];
const bar = document.querySelector('[data-steps-bar]');
ScrollTrigger.create({
  trigger: '[data-steps]', start: 'top 75%', end: 'bottom 45%', scrub: reduced ? false : 0.6,
  onUpdate(self) {
    const p = reduced ? 1 : self.progress;
    const vertical = window.innerWidth <= 900;
    bar.style.transform = vertical ? `scaleY(${p})` : `scaleX(${p})`;
    steps.forEach((s, i) => s.classList.toggle('is-on', p >= i / steps.length + 0.02));
  },
});
if (reduced) { steps.forEach((s) => s.classList.add('is-on')); bar.style.transform = 'none'; }

/* ── price counters ───────────────────────────────────────── */
document.querySelectorAll('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  if (reduced) return;
  const o = { v: 0 };
  el.textContent = '0';
  gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(o.v)), scrollTrigger: { trigger: el, start: 'top 90%' } });
});

/* ── client marquee: duplicate for a seamless loop ────────── */
const track = document.querySelector('.marquee__track');
[...track.children].forEach((li) => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.append(c); });

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ── scenes ───────────────────────────────────────────────── */
const ctx = { gsap, ScrollTrigger, reduced };
initHero(ctx);
initHow(ctx);
initFacility(ctx);
initSkip(ctx);
initWhy(ctx);
initRubble(ctx);
initSymbiosis(ctx);
initSorter(ctx);
initQuoteForm();
if (!reduced) initCursor();

// fonts change line lengths; re-measure pinned scenes once they land
document.fonts?.ready.then(() => ScrollTrigger.refresh());
