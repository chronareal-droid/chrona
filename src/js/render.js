// Builds data-driven sections from content.json so prices and copy stay editable in one place.
import content from '../data/content.json';

const $ = (s, r = document) => r.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const money = (n) => `${content.currency}${Number(n).toLocaleString('en-ZA').replace(/\s| /g, ',')}`;
export const packageById = (id) => content.packages.find((p) => p.id === id);
export { content };

const leafSvg = `<svg class="mcard__leaf" viewBox="0 0 160 160" aria-hidden="true"><path d="M20 140 C 40 80, 90 30, 150 20 C 140 80, 90 130, 20 140 Z"/><path d="M20 140 C 60 110, 100 70, 150 20"/><path d="M60 112 C 62 96, 70 84, 80 76 M88 90 C 92 76, 100 64, 112 56"/></svg>`;

const STORY = [
  { t: 'Leave the world outside.', mode: 'img' },
  { t: 'Slow down.', mode: 'text' },
  { t: 'Breathe deeply.', mode: 'img' },
  { t: 'Let nature take over.', mode: 'text' },
  { t: 'Reconnect with yourself.', mode: 'img' },
  { t: 'Leave feeling renewed.', mode: 'text' },
];

const RITUAL = [
  { t: 'Arrive', d: 'Welcome drink and peaceful surroundings.', img: 'welcome' },
  { t: 'Unwind', d: 'Warm towels, aromatherapy and calming atmosphere.', img: 'towels' },
  { t: 'Indulge', d: 'Massage, facial, manicure, pedicure and body treatments.', img: 'massage' },
  { t: 'Restore', d: 'Relaxation, water, greenery and stillness.', img: 'jacuzzi' },
  { t: 'Reconnect', d: 'Leave feeling relaxed, rejuvenated and restored.', img: 'garden' },
];

const GALLERY = [
  ['room', 'Treatment rooms', 'a', 'up'], ['garden', 'Botanical garden', 'c', 'down'], ['massage', 'Therapists', 'b', ''],
  ['stones', 'Spa details', 'c', 'up'], ['pedicure', 'Pedicure', 'a', 'down'], ['jacuzzi', 'Jacuzzi', 'b', 'up'],
  ['lounge', 'Relaxation', 'c', 'down'], ['couple', 'Couples', 'b', ''], ['group', 'Group experiences', 'a', 'up'],
  ['facial', 'Facials', 'c', 'down'],
];

export const BOOK_TYPES = ['Spa Package', 'Massage', 'Facial', 'Pedicure', 'Couples', 'Corporate', 'Gift Voucher'];

export function renderAll() {
  // Philosophy steps
  $('.story__steps').innerHTML = STORY.map((s, i) => `
    <div class="story__step ${s.mode === 'text' ? 'is-text' : ''}" data-i="${i}">
      <span class="n">Step ${pad(i + 1)}</span><h3>${s.t}</h3>
    </div>`).join('');

  // Ritual stages
  $('.ritual__track').insertAdjacentHTML('beforeend', RITUAL.map((r, i) => `
    <article class="panel stage" aria-label="${pad(i + 1)} ${r.t}">
      <span class="stage__num" aria-hidden="true">${pad(i + 1)}</span>
      <div class="stage__img"><div data-img="${r.img}"></div></div>
      <div class="stage__copy">
        <p class="eyebrow">${pad(i + 1)} / 05</p>
        <h3>${r.t}</h3>
        <p>${r.d}</p>
      </div>
      ${i < RITUAL.length - 1 ? '<span class="stage__arrow" aria-hidden="true">→</span>' : ''}
    </article>`).join(''));

  // Treatment tabs
  const tabs = $('.treat__tabs');
  tabs.innerHTML = content.treatments.map((c, i) => `
    <button class="treat__tab" role="tab" aria-selected="${i === 0}" data-cat="${i}" data-cursor="VIEW">${esc(c.category)}<sup>${c.items.length}</sup></button>`).join('');
  renderTreatments(0);

  // Packages
  $('.pack__rail').innerHTML = content.packages.map((p, i) => `
    <article class="pcard" data-id="${p.id}" data-cursor="VIEW">
      <div class="pcard__img"><div data-img="${p.image}"></div></div>
      <div class="pcard__body">
        <div>
          <span class="pcard__idx">${pad(i + 1)} / ${pad(content.packages.length)}</span>
          <h3 class="pcard__name">${esc(p.name)}</h3>
          <p class="pcard__desc">${esc(p.description)}</p>
        </div>
        <div>
          <div class="pcard__facts">
            ${p.price != null ? `<span class="pcard__price">${money(p.price)}</span>` : '<span class="pcard__price is-request">Price on request</span>'}
            ${p.duration || p.per ? `<span class="pcard__dur">${[p.duration, p.per ? 'per ' + p.per : null].filter(Boolean).join(' · ')}</span>` : ''}
          </div>
          <a href="#booking" class="btn btn--solid magnetic" data-cursor="BOOK" data-book="${/couple|two/i.test(p.per || '') ? 'Couples' : p.id === 'corporate' ? 'Corporate' : 'Spa Package'}" data-package="${esc(p.name)}"><span>Book now</span> <i>→</i></a>
        </div>
      </div>
    </article>`).join('');

  // Pricing trio
  $('.price__grid').innerHTML = content.pricingTrio.map((id) => {
    const p = packageById(id);
    const feat = id === content.pricingFeatured;
    const meta = [p.duration, p.per].filter(Boolean).join(' · ');
    return `
    <article class="pricecard ${feat ? 'is-featured' : ''}" data-cursor="BOOK">
      ${feat ? '<span class="pricecard__badge">Most popular</span>' : ''}
      <h3 class="pricecard__name">${esc(p.name)}</h3>
      <p class="pricecard__amt">${p.price != null ? `<small>${content.currency}</small><span class="count" data-to="${p.price}">0</span>` : '<span style="font-size:.4em">On request</span>'}</p>
      <p class="pricecard__meta">${esc(meta || '')}</p>
      <a href="#booking" class="btn ${feat ? 'btn--solid' : 'btn--ghost'} magnetic" data-cursor="BOOK" data-book="${/two/i.test(p.per || '') ? 'Couples' : 'Spa Package'}" data-package="${esc(p.name)}"><span>Book</span> <i>→</i></a>
    </article>`;
  }).join('');

  // Counters
  $('.stats__row').innerHTML = content.counters.map((c) => `
    <div class="stat"><span class="stat__n"><span class="count" data-to="${c.value}" data-from="${c.from || 0}" data-plain="1">${c.value}</span>${c.suffix ? `<sup>${c.suffix}</sup>` : ''}</span><span class="stat__l">${esc(c.label)}</span></div>`).join('');

  // Night price
  const dn = packageById(content.dateNight);
  $('.night__price').innerHTML = dn.price != null ? `${money(dn.price)}<small>/ ${esc(dn.per || '')}</small>` : 'Price on request';

  // Groups
  $('.groups__bgs').innerHTML = content.groups.map((g, i) => `<div class="groups__bg ${i === 0 ? 'is-on' : ''}" data-img="${g.image}"></div>`).join('');
  $('.groups__cards').innerHTML = content.groups.map((g, i) => `
    <a href="#booking" class="gcard" data-i="${i}" data-cursor="BOOK" data-book="${g.name === 'Corporate' ? 'Corporate' : 'Spa Package'}" data-package="${esc(g.name)}">
      <span class="gcard__i">${pad(i + 1)}</span>
      <div><h3>${esc(g.name)}</h3><p>${esc(g.line)}</p><span class="gcard__go">Enquire →</span></div>
    </a>`).join('');

  // Gallery
  $('.gallery__track').innerHTML = GALLERY.map(([img, cap, size, pos], i) => `
    <figure class="gitem gitem--${size} ${pos ? 'gitem--' + pos : ''}" data-rot="${(i % 2 ? 1 : -1) * (1 + (i % 3) * 0.5)}" data-cursor="VIEW">
      <div class="gitem__frame"><div class="gitem__img" data-img="${img}" role="img" aria-label="${cap}"></div></div>
      <figcaption>${pad(i + 1)} · ${cap}</figcaption>
    </figure>`).join('');

  // Team (roles only; names appear once added to content.json)
  $('.team__rail').innerHTML = content.team.map((m) => `
    <article class="mcard" tabindex="0" data-cursor="VIEW">
      <div class="mcard__img" data-img="${m.image}"></div>
      ${leafSvg}
      <div class="mcard__body">
        <span class="mcard__role">${esc(m.name ? m.role : 'The L’abri team')}</span>
        <h3 class="mcard__name">${esc(m.name || m.role)}</h3>
      </div>
    </article>`).join('');
  $('.team__note').textContent = 'Every L’abri therapist is professionally trained to leave you relaxed, rejuvenated and restored.';

  // Location
  const b = content.business;
  $('.loc__addr').innerHTML = `${b.address.map(esc).join('<br>')}<br><a href="tel:${b.phoneIntl}" data-cursor="CALL">${esc(b.phone)}</a><span class="hrs">Open ${esc(b.hours)}</span>`;
  $('.loc__dir').href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.mapQuery)}`;

  // Booking choices
  $('.book__choices').innerHTML = BOOK_TYPES.map((t, i) => `
    <button type="button" class="choice" role="radio" aria-checked="false" data-v="${t}" data-cursor="SELECT"><span class="choice__i">${pad(i + 1)}</span><span class="choice__t">${t}</span></button>`).join('');

  document.querySelector('.year').textContent = new Date().getFullYear();
}

export function renderTreatments(catIndex) {
  const cat = content.treatments[catIndex];
  $('.treat__grid').innerHTML = cat.items.map((t, i) => `
    <a href="#booking" class="tcard" data-cursor="BOOK" data-book="${cat.category === 'Feet' ? 'Pedicure' : cat.category === 'Facial' ? 'Facial' : cat.category === 'Massage' ? 'Massage' : 'Spa Package'}" data-package="${esc(t.name)}" aria-label="${esc(t.name)}${t.price != null ? ', ' + money(t.price) : ''}">
      <div class="tcard__media"><div class="tcard__img" data-img="${t.image}"></div>${cat.category === 'Massage' && i < 3 ? '<video data-media="ritual" data-hover muted playsinline loop preload="none"></video>' : ''}</div>
      <div class="tcard__body">
        <span class="tcard__idx">${pad(i + 1)} · ${esc(cat.category)}</span>
        <div class="tcard__text">
          <h3 class="tcard__name">${esc(t.short)}</h3>
          <div class="tcard__meta">
            <span class="tcard__min">${t.minutes ? t.minutes + ' min' : '&nbsp;'}</span>
            ${t.price != null ? `<span class="tcard__price">${money(t.price)}</span>` : '<span class="tcard__price is-request">On request</span>'}
          </div>
        </div>
      </div>
      <span class="tcard__book">Book →</span>
    </a>`).join('');
}
