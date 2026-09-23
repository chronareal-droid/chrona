import '@fontsource-variable/manrope';
import '@fontsource/newsreader/400-italic.css';
import '../styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initForm } from './form.js';
import { drawTopo } from './topo.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('reduced');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
root.classList.remove('no-js');
root.classList.add('js');
if (reduced) root.classList.add('reduced');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------------------------------------------------------------
   Logo: the supplied file, unaltered. If it isn't in public/brand yet,
   a plain text fallback shows (never a redrawn logo).
   --------------------------------------------------------------- */
$$('[data-logo]').forEach((img) => {
  const plate = img.closest('.logo-plate');
  img.addEventListener('error', () => plate?.classList.add('logo--missing'), { once: true });
  img.src = new URL('brand/mgtd-logo.png', document.baseURI).href;
});

/* Decorative contour linework (procedural, not survey data) */
drawTopo($('[data-topo]'), { w: 1600, h: 900, lines: 16, seed: 3 });
drawTopo($('[data-topo-small]'), { w: 600, h: 600, lines: 12, seed: 11 });

/* ---------------------------------------------------------------
   Smooth scroll
   --------------------------------------------------------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToTarget = (target) => {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2 || !$(id)) return;
  e.preventDefault();
  closeMenu();
  if (a.dataset.enquiry !== undefined) presetEnquiry(a.dataset.enquiry);
  scrollToTarget(id);
  history.replaceState(null, '', id === '#top' ? location.pathname : id);
  if (id === '#contact') setTimeout(() => $('#f-name')?.focus({ preventScroll: true }), 1200);
});

/* ---------------------------------------------------------------
   Navigation: overlays the hero, turns solid on scroll
   --------------------------------------------------------------- */
const nav = $('[data-nav]');
const burger = $('.nav__burger');
const menu = $('#menu');
ScrollTrigger.create({
  start: () => Math.max(40, innerHeight * 0.6),
  end: 'max',
  onToggle: (self) => nav.classList.toggle('is-solid', self.isActive),
});
$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href'));
  if (!sec) return;
  ScrollTrigger.create({
    trigger: sec, start: 'top 45%', end: 'bottom 45%',
    onToggle: (self) => a.classList.toggle('is-active', self.isActive),
  });
});
function openMenu() {
  menu.hidden = false;
  requestAnimationFrame(() => menu.classList.add('is-open'));
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', 'Close menu');
  nav.classList.add('is-solid');
  lenis?.stop();
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  if (burger.getAttribute('aria-expanded') !== 'true') return;
  menu.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Open menu');
  lenis?.start();
  document.body.style.overflow = '';
  setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700);
  ScrollTrigger.refresh();
}
burger.addEventListener('click', () => (burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu()));
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); burger.focus(); } });

/* ---------------------------------------------------------------
   Split headings into masked words
   --------------------------------------------------------------- */
$$('[data-split]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
});

/* ---------------------------------------------------------------
   Hero: quiet landscape -> logo -> headline
   --------------------------------------------------------------- */
const heroVideo = $('[data-hero-video]');
const startVideo = () => {
  if (!heroVideo || reduced) return;
  const small = matchMedia('(max-width: 600px)').matches && navigator.connection?.saveData;
  if (small) return;
  heroVideo.play().then(() => heroVideo.classList.add('is-playing')).catch(() => {});
};
if (heroVideo) {
  if (heroVideo.readyState >= 3) startVideo();
  else heroVideo.addEventListener('canplay', startVideo, { once: true });
  heroVideo.load();
  // Pause off-screen to save battery
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onLeave: () => heroVideo.pause(), onEnterBack: () => heroVideo.classList.contains('is-playing') && heroVideo.play().catch(() => {}) });
}

const heroLines = $$('.hero__title .line > span');
const heroFades = $$('[data-hero-fade]');
const heroLogo = $('.logo-plate--hero');
if (reduced) {
  root.classList.add('no-hero-intro');
} else {
  gsap.set(heroLines, { yPercent: 112 });
  gsap.set(heroFades, { autoAlpha: 0, y: 18 });
  const introSeen = sessionStorageGet('mgtd-intro');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.2 });
  tl.fromTo('[data-hero-media]', { scale: 1.12 }, { scale: 1, duration: 3.2, ease: 'power2.out' }, 0);
  if (!introSeen) {
    tl.fromTo(heroLogo, { autoAlpha: 0, scale: 0.9, y: 16 }, { autoAlpha: 1, scale: 1, y: 0, duration: 1.1 }, 0.3)
      .to(heroLogo, { autoAlpha: 0, scale: 0.96, y: -24, duration: 0.6, ease: 'power3.in' }, '+=0.45');
  }
  tl.to(heroLines, { yPercent: 0, duration: 1.3, stagger: 0.08 }, introSeen ? 0.3 : '-=0.25')
    .to(heroFades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.07 }, '-=1.1')
    .add(() => { root.classList.add('no-hero-intro'); sessionStorageSet('mgtd-intro', '1'); });

  // Scroll-out parallax
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('[data-hero-media]', { yPercent: 14, ease: 'none' }, 0)
    .to('.hero__content', { yPercent: -18, autoAlpha: 0.2, ease: 'none' }, 0)
    .to('.hero__topo', { yPercent: -10, ease: 'none' }, 0);
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } }

/* ---------------------------------------------------------------
   Generic reveals
   --------------------------------------------------------------- */
if (!reduced) {
  $$('[data-split]').forEach((el) => {
    gsap.from($$('.w > span', el), {
      yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });
  gsap.fromTo('[data-orb] img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.intro', scrub: true } });
  gsap.from('[data-orb]', { scale: 0.6, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '[data-orb]', start: 'top 90%' } });
}

/* ---------------------------------------------------------------
   Services: hover-reveal list (desktop), accordion (touch / keyboard)
   --------------------------------------------------------------- */
const svcList = $('[data-svc-list]');
const svcs = $$('[data-svc]');
const previews = $$('[data-preview]');
function setPreview(key) { previews.forEach((p) => p.classList.toggle('is-on', p.dataset.preview === key)); }
function openSvc(item, open = true) {
  svcs.forEach((s) => {
    const on = s === item ? open : false;
    s.classList.toggle('is-open', on);
    $('.svc__btn', s).setAttribute('aria-expanded', String(on));
    $('.svc__panel', s).inert = !on;
  });
  svcList.classList.toggle('has-open', svcs.some((s) => s.classList.contains('is-open')));
  if (open && item) setPreview(item.dataset.img);
  // let pinned sections below re-measure after the panel animates
  clearTimeout(openSvc.t); openSvc.t = setTimeout(() => ScrollTrigger.refresh(), 750);
}
svcs.forEach((s) => {
  $('.svc__panel', s).inert = true;
  const btn = $('.svc__btn', s);
  btn.addEventListener('click', () => openSvc(s, !s.classList.contains('is-open')));
  if (finePointer) {
    let t;
    s.addEventListener('mouseenter', () => { clearTimeout(t); t = setTimeout(() => { if (!s.classList.contains('is-open')) openSvc(s, true); }, 120); });
    s.addEventListener('mouseleave', () => clearTimeout(t));
  }
});
if (svcs[0]) setPreview(svcs[0].dataset.img);
if (finePointer && matchMedia('(min-width: 1101px)').matches && svcs[0]) openSvc(svcs[0], true);

function presetEnquiry(title) {
  const sel = $('#f-enquiry');
  if (!sel || !title) return;
  const opt = [...sel.options].find((o) => o.text === title);
  if (opt) sel.value = opt.value || opt.text;
}

/* ---------------------------------------------------------------
   Pinned / scroll-driven sections (desktop vs mobile)
   --------------------------------------------------------------- */
const mm = gsap.matchMedia();

if (!reduced) {
  mm.add('(min-width: 901px)', () => {
    /* Environment + development: the frame opens to full bleed as the statement builds */
    const lines = $$('.envdev__title .line > span');
    gsap.set(lines, { yPercent: 112 });
    gsap.set('[data-envdev-copy] p', { autoAlpha: 0, y: 24 });
    gsap.timeline({
      scrollTrigger: { trigger: '[data-envdev]', start: 'top top', end: '+=160%', scrub: 0.8, pin: true, anticipatePin: 1 },
    })
      .to('[data-envdev-media]', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
      .to('[data-envdev-media] img', { scale: 1, ease: 'power2.out', duration: 1.6 }, 0)
      .to('.envdev__shade', { opacity: 1, duration: 0.8 }, 0.4)
      .to(lines, { yPercent: 0, stagger: 0.12, duration: 0.6, ease: 'power3.out' }, 0.55)
      .to('[data-envdev-copy] p', { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.5 }, 1.1)
      .to({}, { duration: 0.4 });

    /* Experience: vertical scroll drives a horizontal track */
    const track = $('[data-hscroll-track]');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    if (dist() > 40) {
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '[data-hscroll]', start: () => (track.offsetHeight + 120 < innerHeight ? 'center center' : 'top top+=' + (parseInt(getComputedStyle(root).getPropertyValue('--nav-h')) + 28)), end: () => `+=${dist()}`,
          scrub: 0.6, pin: true, pinSpacing: true, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => gsap.set('[data-hscroll-bar]', { scaleX: self.progress }),
        },
      });
    }
  });

  mm.add('(max-width: 900px)', () => {
    gsap.from('.envdev__title .line > span', { yPercent: 112, stagger: 0.1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.envdev', start: 'top 60%' } });
    gsap.from('[data-envdev-copy] p', { autoAlpha: 0, y: 20, stagger: 0.1, duration: 1, scrollTrigger: { trigger: '[data-envdev-copy]', start: 'top 85%' } });
    gsap.fromTo('[data-envdev-media] img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.envdev', scrub: true } });
  });

  /* Approach: one word per viewport, pinned */
  mm.add('(min-width: 0px)', () => {
    const steps = $$('[data-step]');
    const dots = $$('.approach__dots li');
    if (!steps.length) return;
    gsap.set(steps, { autoAlpha: 0 });
    gsap.set(steps[0], { autoAlpha: 1 });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '[data-approach]', start: 'top top', end: () => `+=${steps.length * 90}%`, scrub: 0.6, pin: true, anticipatePin: 1,
        onUpdate: (self) => {
          const i = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
          dots.forEach((d, j) => d.classList.toggle('is-on', j === i));
        },
      },
    });
    tl.to('.approach__bg', { yPercent: 8, ease: 'none', duration: steps.length }, 0);
    steps.forEach((s, i) => {
      const word = $('.step__word', s);
      const rest = $$('.step__line, .step__quote, .step__num', s);
      if (i > 0) {
        tl.fromTo(s, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, i - 0.5)
          .fromTo(word, { yPercent: 40, scale: 0.92, filter: 'blur(14px)', autoAlpha: 0 }, { yPercent: 0, scale: 1, filter: 'blur(0px)', autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, i - 0.5)
          .fromTo(rest, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.04 }, i - 0.3);
      }
      if (i < steps.length - 1) {
        tl.to(word, { yPercent: -40, scale: 1.04, filter: 'blur(10px)', autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, i + 0.05)
          .to(rest, { autoAlpha: 0, y: -12, duration: 0.3 }, i + 0.05)
          .set(s, { autoAlpha: 0 }, i + 0.5);
      }
    });
    tl.to({}, { duration: 0.4 });
  });

  /* Research -> decision */
  gsap.to('.flow__line path', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '[data-flow]', start: 'top 75%', end: 'bottom 50%', scrub: true } });
  $$('.flow__node').forEach((n, i) => ScrollTrigger.create({ trigger: '[data-flow]', start: `top ${75 - i * 7}%`, onEnter: () => n.classList.add('is-on'), onLeaveBack: () => n.classList.remove('is-on') }));
  gsap.to('.route', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.method__map', start: 'top 80%', end: 'bottom 40%', scrub: true } });
  gsap.to('.orbit', { rotate: 90, ease: 'none', scrollTrigger: { trigger: '.method__map', scrub: true } });
  $$('[data-mask]').forEach((el) => {
    const round = el.classList.contains('method__field') ? 'round 200px 200px 18px 18px' : 'round 18px';
    gsap.fromTo(el, { clipPath: `inset(0% 0% 100% 0% ${round})` }, { clipPath: `inset(0% 0% 0% 0% ${round})`, duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 85%' } });
    gsap.fromTo($('img', el), { scale: 1.25 }, { scale: 1, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  gsap.fromTo('.contact__bg img', { yPercent: -8, scale: 1.1 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.contact', scrub: true } });
} else {
  $$('.flow__node').forEach((n) => n.classList.add('is-on'));
}

/* ---------------------------------------------------------------
   Cursor + magnetic buttons (fine pointers only)
   --------------------------------------------------------------- */
if (finePointer && !reduced) {
  root.classList.add('has-cursor');
  const cur = $('.cursor');
  const label = $('.cursor__label');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
  let seen = false;
  addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    if (!seen) { seen = true; gsap.set(cur, { x: pos.x, y: pos.y }); gsap.to(cur, { autoAlpha: 1, duration: 0.3 }); }
    xTo(pos.x); yTo(pos.y);
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, input, select, textarea, .case');
    cur.classList.toggle('is-hover', !!t && !t.matches('.case'));
    const lab = t?.matches('.case:not(.case--ph)') ? 'Record' : '';
    label.textContent = lab;
    cur.classList.toggle('is-label', !!lab && !e.target.closest('a, button'));
  });
  document.addEventListener('pointerleave', () => gsap.to(cur, { autoAlpha: 0, duration: 0.2 }));
  document.addEventListener('pointerenter', () => seen && gsap.to(cur, { autoAlpha: 1, duration: 0.2 }));

  $$('[data-magnetic]').forEach((b) => {
    const bx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' });
    const by = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      bx((e.clientX - r.left - r.width / 2) * 0.18);
      by((e.clientY - r.top - r.height / 2) * 0.28);
    });
    b.addEventListener('pointerleave', () => { bx(0); by(0); });
  });
}

/* ---------------------------------------------------------------
   Contact form
   --------------------------------------------------------------- */
initForm($('[data-form]'));

/* Refresh measurements once fonts and images settle */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
