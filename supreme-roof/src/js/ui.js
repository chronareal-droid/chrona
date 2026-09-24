// Interactive sections: roof-type selector, service finder, process line, inspection
// hotspots, protection list, before/after project gallery, and the service-area map.
import { ROOF_TYPES, NEEDS, PROJECTS, AREAS } from './content.js';
import { texture } from './textures.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/* ── roof type selector ─────────────────────────────── */
export function initTypes({ gsap, reduced }) {
  const root = document.querySelector('[data-types]');
  const tabs = root.querySelector('[data-types-tabs]');
  const img = root.querySelector('[data-types-img]');
  const body = root.querySelector('[data-types-body]');
  tabs.innerHTML = ROOF_TYPES.map((t, i) => `<button role="tab" type="button" id="tab-${t.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">${t.key}</button>`).join('');

  async function show(i, focus) {
    const t = ROOF_TYPES[i];
    tabs.querySelectorAll('button').forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; if (k === i && focus) b.focus(); });
    root.querySelector('[data-types-panel]').setAttribute('aria-labelledby', `tab-${t.key}`);
    body.innerHTML = `
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.text)}</p>
      <div class="types__cols">
        <div><h4>Common issues</h4><ul>${t.issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><h4>How we help</h4><ul>${t.services.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <a class="btn btn--accent" href="#assessment" data-help="${t.help}" data-roof="${t.key}">Assess my ${esc(t.key.toLowerCase())} roof →</a>`;
    const url = await texture(t.tex, 1000, 760, 3);
    const layer = document.createElement('div');
    layer.className = 'types__layer';
    layer.style.backgroundImage = `url(${url})`;
    layer.innerHTML = `<span class="types__tag">${esc(t.key)}</span>`;
    img.append(layer);
    if (!reduced) {
      gsap.fromTo(layer, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.9, ease: 'expo.inOut', onComplete: () => [...img.children].slice(0, -1).forEach((n) => n.remove()) });
      gsap.fromTo(layer, { scale: 1.12 }, { scale: 1, duration: 1.6, ease: 'power3.out' });
      gsap.from(body.children, { y: 18, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' });
    } else [...img.children].slice(0, -1).forEach((n) => n.remove());
  }
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(Number(b.dataset.i)); });
  tabs.addEventListener('keydown', (e) => {
    const cur = [...tabs.children].findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show((cur + (e.key === 'ArrowRight' ? 1 : -1) + ROOF_TYPES.length) % ROOF_TYPES.length, true); }
  });
  show(0);

  const modal = document.querySelector('[data-unsure-modal]');
  document.querySelector('[data-unsure]').addEventListener('click', () => modal.showModal());
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) modal.close(); });
}

/* ── service finder ─────────────────────────────────── */
export function initDiag({ gsap, reduced }) {
  const opts = document.querySelector('[data-diag-opts]');
  const out = document.querySelector('[data-diag-out]');
  opts.innerHTML = NEEDS.map((n, i) => `<button type="button" role="radio" aria-checked="false" class="${n.emergency ? 'is-em' : ''}" data-i="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(n.label)}</button>`).join('');
  opts.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    opts.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', x === b));
    const n = NEEDS[Number(b.dataset.i)];
    out.innerHTML = `
      <div class="diag__card ${n.emergency ? 'diag__card--em' : ''}">
        <span class="diag__k">${n.emergency ? 'Urgent' : 'Where to start'}</span>
        <h3>${esc(n.title)}</h3>
        <p>${esc(n.text)}</p>
        <p class="diag__next">${esc(n.next)}</p>
        <div class="diag__ctas">
          ${n.emergency ? '<a class="btn btn--accent" href="tel:+27678173343">Call 067 817 3343</a>' : ''}
          <a class="btn ${n.emergency ? 'btn--line-light' : 'btn--accent'}" href="#assessment" data-help="${n.help}" ${n.roof ? `data-roof="${n.roof}"` : ''}>${esc(n.cta)} →</a>
        </div>
      </div>`;
    if (!reduced) gsap.from(out.firstElementChild, { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' });
  });
}

/* ── process linework ───────────────────────────────── */
export function initProcess({ gsap, reduced }) {
  const sec = document.querySelector('[data-process]');
  const line = sec.querySelector('[data-process-line]');
  const steps = [...sec.querySelectorAll('.process__steps li')];
  if (reduced) { steps.forEach((s) => s.classList.add('is-on')); line.style.strokeDashoffset = 0; return; }
  gsap.set(line, { strokeDasharray: 1000, strokeDashoffset: 1000 });
  gsap.to(line, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: {
      trigger: sec.querySelector('.process__track'), start: 'top 75%', end: 'bottom 55%', scrub: 0.6,
      onUpdate: (s) => steps.forEach((el, i) => el.classList.toggle('is-on', s.progress >= i / steps.length * 0.95 + 0.02)),
    },
  });
}

/* ── inspection hotspots ────────────────────────────── */
const SPOTS = {
  1: 'Flashing seals the junctions where the roof meets walls, chimneys and parapets. Cracked or lifted flashing is one of the most common leak sources.',
  2: 'Valleys carry the water from two roof slopes. Debris, rusted valley flashing or badly cut tiles here send water straight inside.',
  3: 'Cracked, slipped or missing tiles and loose ridge capping open the roof to rain and wind-driven water.',
  4: 'On flat roofs, the membrane is the roof. We look for blisters, lifting seams, cracks and ponding.',
  5: 'Gutters, outlets and downpipes must clear storm water fast. Blockages cause overflows and water backing up.',
  6: 'Vent pipes, skylights and fixings that pass through the roof need sound seals around them.',
  7: 'Roof edges, fascias and eaves take the wind and the run-off, and deterioration here spreads.',
};
export function initInspect({ gsap, reduced }) {
  const sec = document.querySelector('[data-inspect]');
  const detail = sec.querySelector('[data-inspect-detail]');
  const items = [...sec.querySelectorAll('[data-spot]')];
  const activate = (n) => {
    items.forEach((el) => el.classList.toggle('is-on', el.dataset.spot === n));
    const name = sec.querySelector(`.inspect__list [data-spot="${n}"]`).textContent.replace(/^\d+/, '').trim();
    detail.innerHTML = `<strong>${esc(name)}.</strong> ${esc(SPOTS[n])}`;
  };
  items.forEach((el) => {
    el.setAttribute('tabindex', '0');
    if (el.tagName.toLowerCase() === 'g') el.setAttribute('role', 'button');
    ['mouseenter', 'focus', 'click'].forEach((ev) => el.addEventListener(ev, () => activate(el.dataset.spot)));
  });
  if (reduced) return;
  const paths = sec.querySelectorAll('.i-l');
  paths.forEach((p) => { const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
  const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 70%' } });
  tl.to(paths, { strokeDashoffset: 0, duration: 1.6, stagger: 0.03, ease: 'power2.inOut' })
    .from(sec.querySelectorAll('.spot'), { scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, '-=0.6');
}

/* ── "we're protecting..." list ─────────────────────── */
export function initProtects({ gsap, reduced }) {
  const items = document.querySelectorAll('[data-protects] li');
  if (reduced) { items.forEach((i) => i.classList.add('is-on')); return; }
  items.forEach((li) => gsap.to(li, { scrollTrigger: { trigger: li, start: 'top 72%', end: 'bottom 40%', toggleClass: 'is-on' } }));
}

/* ── before / after project gallery ─────────────────── */
export function initProjects({ reduced }) {
  const rail = document.querySelector('[data-rail]');
  rail.innerHTML = PROJECTS.map((p, i) => `
    <article class="proj" data-tags="${p.tags.join(' ')}">
      <div class="ba" data-ba style="--pos:50%">
        <div class="ba__img ba__after" data-tex-after="${p.after}"></div>
        <div class="ba__img ba__before" data-tex-before="${p.before}"></div>
        <span class="ba__lbl ba__lbl--b">Before</span><span class="ba__lbl ba__lbl--a">After</span>
        <input class="ba__range" type="range" min="0" max="100" value="50" aria-label="Compare before and after: ${esc(p.title)}" />
        <span class="ba__handle" aria-hidden="true"><span></span></span>
        <span class="ba__slot">Placeholder · awaiting project photos</span>
      </div>
      <div class="proj__meta">
        <span class="proj__n">Project slot ${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(p.title)}</h3>
        <p><span>Work completed</span>${esc(p.work)}</p>
        <ul>${p.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>
    </article>`).join('');

  const io = new IntersectionObserver((entries) => entries.forEach(async (en) => {
    if (!en.isIntersecting) return; io.unobserve(en.target);
    const a = en.target.querySelector('[data-tex-after]'), b = en.target.querySelector('[data-tex-before]');
    const [ua, ub] = await Promise.all([texture(a.dataset.texAfter, 900, 640, 5), texture(b.dataset.texBefore, 900, 640, 5)]);
    a.style.backgroundImage = `url(${ua})`; b.style.backgroundImage = `url(${ub})`;
  }), { root: null, rootMargin: '300px' });
  rail.querySelectorAll('.proj').forEach((p) => io.observe(p));

  rail.addEventListener('input', (e) => {
    if (!e.target.classList.contains('ba__range')) return;
    e.target.closest('[data-ba]').style.setProperty('--pos', `${e.target.value}%`);
  });

  // filters
  const filters = document.querySelector('[data-filters]');
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    filters.querySelectorAll('button').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    const f = b.dataset.filter;
    rail.querySelectorAll('.proj').forEach((p) => { p.hidden = f !== 'all' && !p.dataset.tags.split(' ').includes(f); });
    rail.scrollTo({ left: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  // drag-to-scroll the rail on desktop (not when dragging a slider)
  let down = false, sx = 0, sl = 0;
  rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.target.closest('.ba')) return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-drag'); });
  window.addEventListener('pointerup', () => { down = false; rail.classList.remove('is-drag'); });
  rail.addEventListener('pointermove', (e) => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
}

/* ── service-area map ───────────────────────────────── */
export function initAreas({ gsap, reduced }) {
  const svg = document.querySelector('[data-areas-map]');
  const g = svg.querySelector('.map-pts');
  const ns = 'http://www.w3.org/2000/svg';
  const lon = [27.94, 28.1], lat = [-26.0, -26.225];
  const X = (v) => 40 + ((v - lon[0]) / (lon[1] - lon[0])) * 520;
  const Y = (v) => 30 + ((v - lat[0]) / (lat[1] - lat[0])) * 500;
  AREAS.forEach((a) => {
    const el = document.createElementNS(ns, 'g');
    el.setAttribute('class', `map-pt${a.hq ? ' map-pt--hq' : ''}${a.label ? ' map-pt--region' : ''}`);
    el.dataset.area = a.key;
    el.setAttribute('transform', `translate(${X(a.lon).toFixed(1)} ${Y(a.lat).toFixed(1)})`);
    el.innerHTML = a.label
      ? `<text class="map-region" text-anchor="middle">${a.name.toUpperCase()}</text>`
      : `${a.hq ? '<circle r="22" class="map-ring"/>' : ''}<circle r="${a.hq ? 8 : 5}" class="map-dot"/>${a.hq ? `<text x="-14" y="5" text-anchor="end" class="map-label">${a.name}</text><text x="-14" y="21" text-anchor="end" class="map-sub">OUR BASE</text>` : `<text x="10" y="4" class="map-label">${a.name}</text>`}`;
    g.append(el);
  });
  const hq = AREAS.find((a) => a.hq);
  const reach = svg.querySelector('.map-reach');
  reach.setAttribute('cx', X(hq.lon).toFixed(1)); reach.setAttribute('cy', Y(hq.lat).toFixed(1));
  const list = document.querySelector('[data-areas-list]');
  const hl = (k) => { g.querySelectorAll('.map-pt').forEach((p) => p.classList.toggle('is-on', p.dataset.area === k)); list.querySelectorAll('li').forEach((li) => li.classList.toggle('is-on', li.dataset.area === k)); };
  list.querySelectorAll('li').forEach((li) => { li.tabIndex = 0; ['mouseenter', 'focus'].forEach((ev) => li.addEventListener(ev, () => hl(li.dataset.area))); li.addEventListener('mouseleave', () => hl(null)); });
  if (reduced) return;
  svg.querySelectorAll('.map-roads path').forEach((p) => { const len = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: svg, start: 'top 75%' } }); });
  gsap.from(g.children, { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.6, stagger: 0.08, ease: 'back.out(2)', scrollTrigger: { trigger: svg, start: 'top 65%' } });
  gsap.from('.map-reach', { scale: 0.2, opacity: 0, transformOrigin: '50% 50%', duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: svg, start: 'top 65%' } });
}
