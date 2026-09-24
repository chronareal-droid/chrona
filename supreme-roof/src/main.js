import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHero } from './js/hero.js';
import { applyTextures } from './js/textures.js';
import { initTypes, initDiag, initProcess, initInspect, initProtects, initProjects, initAreas } from './js/ui.js';
import { initForm } from './js/form.js';
import { CONTACT } from './js/content.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('reduced');
if (reduced) document.documentElement.classList.add('reduced');

/* ── smooth scroll ──────────────────────────────────── */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = id ? document.getElementById(id) : null;
  if (!el) return;
  e.preventDefault();
  closeMenu();
  if (lenis) lenis.scrollTo(id === 'top' ? 0 : el, { duration: 1.3 });
  else el.scrollIntoView();
  history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
});

/* ── nav ────────────────────────────────────────────── */
const nav = document.querySelector('[data-nav]');
const leak = document.querySelector('[data-leak]');
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('is-solid', y > 40);
  if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > 900 && y > lastY + 3);
  if (y < lastY - 3) nav.classList.remove('is-hidden');
  leak.classList.toggle('is-on', y > window.innerHeight * 1.2);
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const links = [...document.querySelectorAll('.nav__links a')];
const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`)); }), { rootMargin: '-45% 0px -50% 0px' });
links.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });

/* ── mobile menu ────────────────────────────────────── */
const menu = document.querySelector('[data-menu]');
const toggle = document.querySelector('[data-menu-toggle]');
function openMenu() { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); toggle.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); document.body.style.overflow = 'hidden'; lenis?.stop(); }
function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); document.body.style.overflow = ''; lenis?.start();
  setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 600);
}
toggle.addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ── mobile bar hides over the form ─────────────────── */
const mbar = document.querySelector('[data-mbar]');
new IntersectionObserver(([en]) => mbar.classList.toggle('is-hidden', en.isIntersecting), { threshold: 0.2 }).observe(document.getElementById('assessment'));

/* ── service panels: explore toggles ────────────────── */
document.querySelectorAll('[data-more]').forEach((b) => {
  const more = b.closest('.svc__body').querySelector('.svc__more');
  const label = b.textContent;
  b.setAttribute('aria-expanded', 'false');
  b.addEventListener('click', () => {
    const open = more.hidden;
    more.hidden = !open;
    b.setAttribute('aria-expanded', String(open));
    b.textContent = open ? 'Show less' : label;
    if (open && !reduced) gsap.from(more, { height: 0, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'height' });
    ScrollTrigger.refresh();
  });
});

/* ── headline split reveals, section reveals ────────── */
function splitWords(el) {
  const walk = (node) => [...node.childNodes].forEach((ch) => {
    if (ch.nodeType === 3) {
      const frag = document.createDocumentFragment();
      ch.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) return frag.append(' ');
        const o = document.createElement('span'); o.className = 'w';
        const i = document.createElement('span'); i.textContent = w; o.append(i); frag.append(o);
      });
      ch.replaceWith(frag);
    } else if (ch.nodeType === 1) walk(ch);
  });
  walk(el);
  return el.querySelectorAll('.w > span');
}
if (!reduced) {
  document.querySelectorAll('[data-split]').forEach((el) => gsap.from(splitWords(el), { yPercent: 105, duration: 1, ease: 'expo.out', stagger: 0.045, scrollTrigger: { trigger: el, start: 'top 85%' } }));
  gsap.utils.toArray('.head .lead, .svc, .why__item, .b2b__list li, .faq details, .contact__list > div, .emergency__grid > *').forEach((el) => gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  gsap.from('.pcard', { y: 50, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.problems__grid', start: 'top 80%' } });
  gsap.from('.trust__list li', { y: 20, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.trust', start: 'top 92%' } });
  // parallax inside service imagery
  document.querySelectorAll('[data-parallax]').forEach((el) => gsap.fromTo(el, { backgroundPosition: '50% 0%' }, { backgroundPosition: '50% 100%', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.to('.seal__spin', { rotation: 360, duration: 60, repeat: -1, ease: 'none', svgOrigin: '120 120' });
  gsap.from('.b2b__bg', { scale: 1.2, ease: 'none', scrollTrigger: { trigger: '.b2b', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ── counters ───────────────────────────────────────── */
document.querySelectorAll('[data-count]').forEach((el) => {
  if (reduced) return;
  const to = Number(el.dataset.count), from = el.dataset.plain !== undefined ? to - 40 : 0;
  const o = { v: from };
  el.textContent = String(from);
  gsap.to(o, { v: to, duration: 1.8, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(o.v))), scrollTrigger: { trigger: el, start: 'top 95%' } });
});

/* ── reviews marquee ────────────────────────────────── */
const reviews = document.querySelector('[data-reviews]');
[...reviews.children].forEach((r) => { const c = r.cloneNode(true); c.setAttribute('aria-hidden', 'true'); reviews.append(c); });

/* ── map (Leaflet loads only when the contact section nears) ── */
const mapEl = document.querySelector('[data-map]');
new IntersectionObserver(async ([en], obs) => {
  if (!en.isIntersecting) return; obs.disconnect();
  const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  const map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([CONTACT.lat, CONTACT.lng], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap contributors © CARTO' }).addTo(map);
  const icon = L.divIcon({ className: 'map__pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] });
  L.marker([CONTACT.lat, CONTACT.lng], { icon, title: 'Supreme Roof Waterproofing Company' }).addTo(map).bindPopup('<strong>Supreme Roof Waterproofing</strong><br>2 Dale Gardens, 25 Plantation Road<br>Bryanston, Sandton');
}, { rootMargin: '400px' }).observe(mapEl);

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ── sections ───────────────────────────────────────── */
const ctx = { gsap, ScrollTrigger, reduced };
initHero(ctx);
applyTextures();
initTypes(ctx);
initDiag(ctx);
initProcess(ctx);
initInspect(ctx);
initProtects(ctx);
initProjects(ctx);
initAreas(ctx);
initForm(ctx);
document.fonts?.ready.then(() => ScrollTrigger.refresh());
