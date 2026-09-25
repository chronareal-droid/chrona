import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/inter';
import site from './data/site.json';
import media from './data/media.json';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ───────── Media: prefer self-hosted WebP (npm run media:fetch), else the hosted original ───────── */
let local = {};
try {
  const res = await fetch('media/local.json', { cache: 'no-cache' });
  if (res.ok) local = await res.json();
} catch { /* hosted originals */ }

function applyMedia(img) {
  const key = img.dataset.media;
  const item = media[key];
  if (!item) return;
  const files = local[key];
  if (files) {
    img.src = files[img.dataset.size === '900' ? 900 : 2000];
    img.srcset = `${files[900]} 900w, ${files[2000]} 2000w`;
    img.sizes = img.dataset.sizes || (img.dataset.size === '900' ? '300px' : '100vw');
  } else {
    img.src = item.url;
  }
  img.width = item.w;
  img.height = item.h;
  if (!img.hasAttribute('data-decorative') && !img.alt && !img.closest('[aria-hidden="true"]')) img.alt = item.alt;
  img.decoding = 'async';
  if (!('eager' in img.dataset)) img.loading = 'lazy';
  else img.fetchPriority = 'high';
  const done = () => img.classList.add('is-loaded');
  img.complete && img.naturalWidth ? done() : img.addEventListener('load', done, { once: true });
}

/* ───────── Business details (null → keep the neutral markup or show an editable placeholder) ───────── */
const biz = site.business;
const digits = (n) => (n ? String(n).replace(/\D/g, '').replace(/^0/, '27') : null);
const values = {
  ...biz,
  phoneDisplay: biz.phoneDisplay || biz.phone,
  whatsappDisplay: biz.whatsapp ? `WhatsApp ${biz.whatsapp}` : null,
  about: site.about,
};
const waText = encodeURIComponent('Hi Greenfields, I would like a quote for my garden.');
const links = {
  phone: biz.phone ? `tel:${biz.phone.replace(/[^\d+]/g, '')}` : null,
  whatsapp: biz.whatsapp ? `https://wa.me/${digits(biz.whatsapp)}?text=${waText}` : null,
  email: biz.email ? `mailto:${biz.email}?subject=${encodeURIComponent('Quote request')}` : null,
};

$$('[data-text]').forEach((el) => {
  const v = values[el.dataset.text];
  if (v) el.textContent = v;
  else if (el.dataset.placeholder) {
    el.textContent = el.dataset.placeholder;
    el.classList.add('is-placeholder');
  }
});
$$('[data-link]').forEach((el) => {
  const href = links[el.dataset.link];
  if (!href) return;
  el.href = href;
  if (href.startsWith('http')) { el.target = '_blank'; el.rel = 'noopener'; }
});

/* Socials: only verified links are shown */
const socialLabels = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', google: 'Google Business Profile' };
const socials = Object.entries(site.social).filter(([, url]) => url);
$('#socials').innerHTML = socials.length
  ? socials.map(([k, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${socialLabels[k]}"><svg aria-hidden="true"><use href="#i-${k}"/></svg></a>`).join('')
  : '<span class="is-placeholder">Social links to be added</span>';

/* ───────── Services ───────── */
const services = site.services.filter((s) => s.enabled);
$('#services-grid').innerHTML = services.map((s, i) => {
  const img = s.image && media[s.image];
  const feature = i === 0 && img;
  return `
  <article class="svc${feature ? ' svc--feature' : ''}${img ? ' svc--image' : ''}" data-reveal>
    ${img ? `<div class="svc__media"><img data-media="${s.image}" data-sizes="${feature ? '(min-width: 900px) 60vw, 100vw' : '(min-width: 900px) 30vw, 100vw'}" alt="" /></div>` : ''}
    <div class="svc__body">
      <span class="svc__icon"><svg aria-hidden="true"><use href="#i-${s.icon}"/></svg></span>
      <span class="svc__num">${String(i + 1).padStart(2, '0')}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
      <a class="svc__link" href="#quote" data-service="${s.id}">Ask about this <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </div>
  </article>`;
}).join('');

$('#service-chips').innerHTML = services.map((s) => `
  <label class="chip"><input type="checkbox" name="services" value="${esc(s.title)}" data-id="${s.id}" /><span>${esc(s.title)}</span></label>`).join('');

$$('[data-service]').forEach((a) => a.addEventListener('click', () => {
  const box = $(`#service-chips input[data-id="${a.dataset.service}"]`);
  if (box) box.checked = true;
}));

/* ───────── Gallery ───────── */
const gallery = [
  { key: 'garden', title: 'Finished residential garden', tag: 'Landscaping' },
  { key: 'laying', title: 'Instant lawn going down', tag: 'Lawn installation' },
  { key: 'patio', title: 'Outdoor living, finished', tag: 'Finished spaces' },
  { key: 'prep', title: 'Levelled and ready for lawn', tag: 'Lawn preparation' },
  { key: 'front', title: 'Front garden makeover', tag: 'Garden makeover' },
  { key: 'bed', title: 'Indigenous planting beds', tag: 'Landscaping' },
  { key: 'after', title: 'Bare ground to lawn', tag: 'Transformation' },
  { key: 'grass', title: 'Fresh, dense instant lawn', tag: 'Lawn installation' },
];
$('#gallery').innerHTML = gallery.map((g, i) => `
  <figure class="tile" data-reveal-img>
    <button type="button" data-index="${i}" aria-label="View larger: ${esc(g.title)}">
      <img data-media="${g.key}" data-sizes="(min-width: 1000px) 33vw, (min-width: 600px) 50vw, 100vw" alt="${esc(media[g.key].alt)}" />
      <figcaption><small>${esc(g.tag)}</small>${esc(g.title)}</figcaption>
    </button>
  </figure>`).join('');

/* ───────── Reviews: only genuine, verified content ───────── */
const r = site.rating;
$('#rating').innerHTML = r.score
  ? `<div class="rating__score">${Number(r.score).toFixed(1)}</div>
     <div><div class="stars" style="--rating:${r.score}" aria-label="${r.score} out of 5 stars"></div>
     <p>${r.count ? `Based on ${esc(r.count)} ` : ''}${esc(r.source)} reviews</p>
     ${r.url ? `<a class="link-arrow" href="${esc(r.url)}" target="_blank" rel="noopener">Read the reviews <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>` : ''}</div>`
  : `<div class="rating__placeholder is-placeholder-box"><div class="stars stars--empty" aria-hidden="true"></div><p>Verified ${esc(r.source)} rating to be added</p></div>`;

$('#reviews').innerHTML = site.testimonials.length
  ? site.testimonials.map((t) => `
    <blockquote class="review" data-reveal>
      <svg class="review__mark" aria-hidden="true"><use href="#i-quote"/></svg>
      ${t.rating ? `<div class="stars" style="--rating:${t.rating}" aria-label="${t.rating} out of 5 stars"></div>` : ''}
      <p>${esc(t.text)}</p>
      <footer><strong>${esc(t.name)}</strong>${t.location ? `<span>${esc(t.location)}</span>` : ''}${t.source ? `<span>via ${esc(t.source)}</span>` : ''}</footer>
    </blockquote>`).join('')
  : [1, 2].map(() => `
    <div class="review review--placeholder is-placeholder-box" data-reveal>
      <svg class="review__mark" aria-hidden="true"><use href="#i-quote"/></svg>
      <p>Genuine customer review to be added.</p>
      <footer><strong>Customer name</strong><span>Suburb · Source</span></footer>
    </div>`).join('');

/* ───────── Service areas ───────── */
$('#areas').innerHTML = site.serviceAreas.length
  ? site.serviceAreas.map((a) => `<li>${esc(a)}</li>`).join('')
  : '<li class="is-placeholder">Confirmed suburbs to be added</li>';

/* Media after all templates are in the DOM */
$$('img[data-media]').forEach(applyMedia);

if (!site.imagesAreIllustrative) $$('[data-illustrative]').forEach((el) => el.remove());
$('#year').textContent = new Date().getFullYear();

/* ───────── Header ───────── */
const nav = $('.nav');
const toggle = $('.nav__toggle');
const menu = $('#mobile-menu');
const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 40);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

function setMenu(open) {
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.toggle('is-open', open);
  menu.hidden = !open;
  document.body.classList.toggle('no-scroll', open);
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
$$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

/* Active section in nav */
const navLinks = $$('.nav__links a');
const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
}), { rootMargin: '-45% 0px -50% 0px' });
['services', 'about', 'work', 'quote'].forEach((id) => spy.observe(document.getElementById(id)));

/* ───────── Reveal on scroll ───────── */
requestAnimationFrame(() => document.body.classList.add('is-ready'));
const reveal = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('is-in');
  reveal.unobserve(e.target);
}), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('[data-reveal], [data-reveal-img]').forEach((el) => {
  // stagger siblings in the same parent
  const sibs = [...el.parentElement.children].filter((c) => c.matches('[data-reveal], [data-reveal-img]'));
  el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 6) * 70}ms`);
  reveal.observe(el);
});

/* ───────── Hero parallax ───────── */
const heroImg = $('.hero__media img');
if (!reduced) {
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking || scrollY > innerHeight * 1.2) return;
    ticking = true;
    requestAnimationFrame(() => {
      heroImg.style.setProperty('--py', `${scrollY * 0.22}px`);
      ticking = false;
    });
  }, { passive: true });
}

/* ───────── Before / after slider ───────── */
$$('.compare__frame').forEach((frame) => {
  const range = $('.compare__range', frame);
  const set = (v) => frame.style.setProperty('--pos', `${v}%`);
  range.addEventListener('input', () => { frame.classList.add('is-touched'); set(range.value); });
  // a gentle hint the first time it scrolls into view
  if (!reduced) {
    const hint = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || frame.classList.contains('is-touched')) return;
      hint.disconnect();
      const start = performance.now();
      const run = (t) => {
        if (frame.classList.contains('is-touched')) return;
        const p = Math.min((t - start) / 2200, 1);
        const v = 50 + Math.sin(p * Math.PI * 2) * 22 * (1 - p);
        set(v); range.value = v;
        if (p < 1) requestAnimationFrame(run);
      };
      setTimeout(() => requestAnimationFrame(run), 500);
    }, { threshold: 0.6 });
    hint.observe(frame);
  }
});

/* ───────── Lightbox ───────── */
const box = $('#lightbox');
const boxImg = $('img', box);
const boxCap = $('figcaption', box);
let current = 0;
function show(i) {
  current = (i + gallery.length) % gallery.length;
  const g = gallery[current];
  const files = local[g.key];
  boxImg.src = files ? files[2000] : media[g.key].url;
  boxImg.alt = media[g.key].alt;
  boxCap.innerHTML = `<small>${esc(g.tag)}</small>${esc(g.title)}`;
}
$('#gallery').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-index]');
  if (!btn) return;
  show(+btn.dataset.index);
  box.showModal();
});
$('.lightbox__close').addEventListener('click', () => box.close());
$('.lightbox__nav--prev').addEventListener('click', () => show(current - 1));
$('.lightbox__nav--next').addEventListener('click', () => show(current + 1));
box.addEventListener('click', (e) => e.target === box && box.close());
box.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') show(current - 1);
  if (e.key === 'ArrowRight') show(current + 1);
});

/* ───────── Quote form ─────────
   endpoint set → POST JSON; else WhatsApp (if configured); else email (if configured). */
const form = $('#quote-form');
const status = $('.form__status', form);
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $$('.field.is-invalid', form).forEach((f) => f.classList.remove('is-invalid'));
  const bad = $$('[required]', form).filter((el) => !el.value.trim());
  if (bad.length) {
    bad.forEach((el) => el.closest('.field').classList.add('is-invalid'));
    bad[0].focus();
    status.textContent = 'Please fill in your name, phone number and area.';
    status.dataset.state = 'error';
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  data.services = $$('input[name="services"]:checked', form).map((c) => c.value);
  const summary = [
    'Quote request: Greenfields Instant Lawns',
    `Name: ${data.name}`, `Phone: ${data.phone}`, data.email && `Email: ${data.email}`,
    `Area: ${data.suburb}`, data.services.length && `Services: ${data.services.join(', ')}`,
    data.area && `Approx. lawn area: ${data.area} m²`, data.message && `Details: ${data.message}`,
  ].filter(Boolean).join('\n');

  const done = (msg) => { status.textContent = msg; status.dataset.state = 'ok'; };
  try {
    if (site.quote.endpoint) {
      const res = await fetch(site.quote.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      done("Thank you. We've received your request and will be in touch soon.");
    } else if (biz.whatsapp) {
      open(`https://wa.me/${digits(biz.whatsapp)}?text=${encodeURIComponent(summary)}`, '_blank', 'noopener');
      done('Opening WhatsApp with your details. Just press send.');
    } else if (biz.email) {
      location.href = `mailto:${biz.email}?subject=${encodeURIComponent('Quote request')}&body=${encodeURIComponent(summary)}`;
      done('Opening your email app with your details. Just press send.');
    } else {
      status.textContent = 'Online quote requests are not connected yet. Please check back soon.';
      status.dataset.state = 'error';
      console.warn('[Greenfields] Set quote.endpoint, business.whatsapp or business.email in src/data/site.json.');
    }
  } catch {
    status.textContent = 'Something went wrong sending your request. Please try again.';
    status.dataset.state = 'error';
  }
});
