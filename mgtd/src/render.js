// Build-time templates: content.json + media.json -> static HTML fragments for index.html.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async (p, fallback) => {
  try { return JSON.parse(await readFile(path.join(root, p), 'utf8')); } catch { return fallback; }
};

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Text in [square brackets] is content MGTD still has to supply: render it as a visible placeholder.
const txt = (s = '') => esc(s).replace(/\[([^\]]+)\]/g, '<span class="ph" title="Content placeholder: replace with verified information">$1</span>');
const pad = (n) => String(n).padStart(2, '0');
const isPh = (s = '') => /^\[.*\]$/.test(String(s).trim());

export async function renderSections() {
  const c = await readJSON('src/data/content.json', {});
  const media = await readJSON('src/data/media.json', { images: {}, videos: {} });
  const local = await readJSON('public/media/local.json', {});

  // Responsive image: self-hosted WebP srcset when `npm run media:fetch` has run, otherwise the hosted original.
  const img = (key, { sizes = '100vw', cls = '', eager = false, alt } = {}) => {
    const m = media.images[key] || {};
    const set = local.images?.[key];
    const a = esc(alt ?? m.alt ?? '');
    const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
    if (set) {
      const srcset = Object.entries(set).map(([w, u]) => `${u} ${w}w`).join(', ');
      return `<img class="${cls}" src="${set[1400] || Object.values(set)[0]}" srcset="${srcset}" sizes="${sizes}" alt="${a}" ${load} decoding="async" />`;
    }
    return `<img class="${cls}" src="${m.remote || ''}" alt="${a}" ${load} decoding="async" />`;
  };
  const imgUrl = (key) => local.images?.[key]?.[1400] || media.images[key]?.remote || '';

  const hv = local.videos?.hero;
  const heroRemote = media.videos?.hero?.remote;
  const heroVideo = hv
    ? `<video class="hero__video" muted playsinline loop preload="metadata" poster="${hv.poster}" aria-hidden="true" data-hero-video>
         <source src="${hv.webm}" type="video/webm" /><source src="${hv.mp4}" type="video/mp4" /></video>`
    : heroRemote?.startsWith('http')
      ? `<video class="hero__video" muted playsinline loop preload="metadata" poster="${imgUrl('hero')}" aria-hidden="true" data-hero-video>
           <source src="${heroRemote}" type="video/mp4" /></video>`
      : '';

  /* ---------- Hero media ---------- */
  const hero = `${img('hero', { cls: 'hero__img', eager: true, alt: '' })}${heroVideo}`;

  /* ---------- Services ---------- */
  const services = (c.services || []).map((s, i) => `
    <li class="svc${s.verified ? '' : ' svc--ph'}" data-svc data-img="${esc(s.image)}">
      <h3 class="svc__head">
        <button class="svc__btn" type="button" aria-expanded="false" aria-controls="svc-${esc(s.id)}" id="svc-btn-${esc(s.id)}">
          <span class="svc__num">${pad(i + 1)}</span>
          <span class="svc__title">${txt(s.title)}</span>
          <span class="svc__icon" aria-hidden="true"></span>
        </button>
      </h3>
      <div class="svc__panel" id="svc-${esc(s.id)}" role="region" aria-labelledby="svc-btn-${esc(s.id)}">
        <div class="svc__inner">
          <figure class="svc__media">${img(s.image, { sizes: '(min-width: 1024px) 22vw, 90vw' })}</figure>
          <div class="svc__body">
            <p class="svc__summary">${txt(s.summary)}</p>
            <ul class="svc__points">${(s.points || []).map((p) => `<li>${txt(p)}</li>`).join('')}</ul>
            <p class="svc__source"><span>Source</span> ${txt(s.source)}</p>
            <a class="link-arrow" href="#contact" data-enquiry="${esc(isPh(s.title) ? '' : s.title)}">Discuss this with MGTD <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </li>`).join('');

  const svcPreview = [...new Set((c.services || []).map((s) => s.image))]
    .map((k) => `<div class="svc-preview__frame" data-preview="${esc(k)}">${img(k, { sizes: '30vw', alt: '' })}</div>`).join('');

  /* ---------- Projects ---------- */
  const projects = (c.projects || []).map((p, i) => {
    const rows = [
      ['Location', p.location], ['Project type', p.type], ['MGTD role', p.role], ['Environmental context', p.context],
    ].map(([k, v]) => `<div class="case__row"><dt>${k}</dt><dd>${txt(v)}</dd></div>`).join('');
    const timeline = p.timeline ? `
      <ol class="case__timeline" aria-label="Assessment timeline, 2014">
        ${p.timeline.map((t) => `<li><span class="case__t-label">${esc(t.label)}</span><span>${txt(t.text)}</span></li>`).join('')}
      </ol>` : '';
    const docs = `<div class="case__docs"><span class="eyebrow">Documentation</span><ul>${(p.documents || []).map((d) => `
        <li class="doc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M14 2v4h4M9 11h6M9 14h6M9 17h4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>${txt(d)}</li>`).join('')}</ul></div>`;
    const src = p.sourceUrl
      ? `<p class="case__source">Source: <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${esc(p.source)}</a></p>`
      : `<p class="case__source">${txt(p.source)}</p>`;
    return `
    <article class="case${p.placeholder ? ' case--ph' : ''}" aria-labelledby="case-${esc(p.id)}">
      <figure class="case__media">
        ${img(p.image, { sizes: '(min-width: 1024px) 40vw, 90vw', cls: 'case__img' })}
        <figcaption>${p.placeholder ? 'Placeholder image' : esc(p.imageNote || '')}</figcaption>
        <span class="case__index">${pad(i + 1)}</span>
      </figure>
      <div class="case__body">
        ${p.placeholder ? '<p class="case__flag">Case study to be supplied by MGTD</p>' : '<p class="case__flag case__flag--ok">Verified public record</p>'}
        <h3 class="case__name" id="case-${esc(p.id)}">${txt(p.name)}</h3>
        <dl class="case__rows">${rows}</dl>
        ${timeline}
        ${docs}
        ${src}
      </div>
    </article>`;
  }).join('');

  /* ---------- Approach ---------- */
  const steps = c.approach?.steps || [];
  const approach = steps.map((s, i) => `
    <div class="step" data-step>
      <span class="step__num">${pad(i + 1)} / ${pad(steps.length)}</span>
      <h3 class="step__word">${esc(s.word)}</h3>
      <p class="step__line">${txt(s.line)}</p>
      <p class="step__quote">From MGTD's positioning: <q>${esc(s.source.replace(/^'|'$/g, ''))}</q></p>
    </div>`).join('');
  const approachDots = steps.map((s, i) => `<li><span>${pad(i + 1)}</span>${esc(s.word.replace('.', ''))}</li>`).join('');

  /* ---------- Credentials ---------- */
  const credentials = (c.credentials || []).map((r) => `
    <li class="cred${r.placeholder ? ' cred--ph' : ''}">
      <span class="cred__mark" aria-hidden="true"></span>
      <div><h3 class="cred__title">${txt(r.title)}</h3><p>${txt(r.body)}</p></div>
      <span class="cred__meta">${txt(r.meta)}</span>
    </li>`).join('');

  /* ---------- Contact ---------- */
  const ct = c.contact || {};
  const email = ct.email ? `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>` : txt(ct.emailLabel);
  const phone = ct.phone ? `<a href="tel:${esc(ct.phone.replace(/\s/g, ''))}">${esc(ct.phone)}</a>` : txt(ct.phoneLabel);
  const contactDetails = `
    <div class="cdetail"><dt>Email</dt><dd>${email}</dd></div>
    <div class="cdetail"><dt>Telephone</dt><dd>${phone}</dd></div>
    <div class="cdetail"><dt>Office</dt><dd>${txt(ct.address)}<br />${esc(ct.area)}</dd></div>`;
  const enquiryOptions = [...(c.services || []).filter((s) => !isPh(s.title)).map((s) => s.title), 'Other enquiry']
    .map((t) => `<option>${esc(t)}</option>`).join('');
  const social = (ct.social || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('');

  const imgs = Object.fromEntries(Object.keys(media.images).map((k) => [`img_${k}`, img(k, { sizes: '100vw' })]));

  return {
    hero, services, svcPreview, projects, approach, approachDots, credentials, contactDetails, enquiryOptions,
    footerEmail: email, footerPhone: phone, footerAddress: `${txt(ct.address)}<br />${esc(ct.area)}`,
    footerSocial: social || '<li><span class="ph">Social links, if MGTD has verified profiles</span></li>',
    summary: txt(c.company?.summary), vision: txt(c.company?.vision), mission: txt(c.company?.mission),
    contactConfig: `<script type="application/json" id="contact-config">${JSON.stringify({ email: ct.email, endpoint: ct.formEndpoint }).replace(/</g, '\\u003c')}</script>`,
    ...imgs,
  };
}
