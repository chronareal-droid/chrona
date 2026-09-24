// Four-step roof assessment form.
// No backend by default: on submit it prepares the request for WhatsApp (quickest, and
// photos can be attached there) or email. Add data-endpoint="https://…" to the <form>
// to POST it (with photos) as multipart/form-data to a form service instead.
import { CONTACT } from './content.js';

export function initForm({ gsap, reduced }) {
  const form = document.querySelector('[data-form]');
  const steps = [...form.querySelectorAll('[data-step]')];
  const stepList = [...document.querySelectorAll('[data-step-list] li')];
  const prev = form.querySelector('[data-prev]');
  const next = form.querySelector('[data-next]');
  const submit = form.querySelector('[data-submit]');
  const error = form.querySelector('[data-error]');
  const progress = form.querySelector('[data-progress]');
  const done = form.querySelector('[data-done]');
  const summary = form.querySelector('[data-summary]');
  let cur = 0;
  let files = [];

  function go(i) {
    cur = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, k) => { s.classList.toggle('is-on', k === cur); s.hidden = k !== cur; });
    stepList.forEach((li, k) => { li.classList.toggle('is-on', k === cur); li.classList.toggle('is-done', k < cur); });
    prev.hidden = cur === 0;
    next.hidden = cur === steps.length - 1;
    submit.hidden = cur !== steps.length - 1;
    progress.style.transform = `scaleX(${(cur + 1) / steps.length})`;
    error.hidden = true;
    renderSummary();
    if (!reduced) gsap.from(steps[cur], { x: 24, opacity: 0, duration: 0.45, ease: 'power3.out' });
  }

  function invalid(stepEl) {
    const bad = [];
    const radios = new Set([...stepEl.querySelectorAll('input[type=radio][required]')].map((r) => r.name));
    radios.forEach((name) => { if (!form.querySelector(`input[name="${name}"]:checked`)) bad.push(form.querySelector(`input[name="${name}"]`).closest('.chips').previousElementSibling?.textContent.replace(' *', '') || name); });
    stepEl.querySelectorAll('input:not([type=radio]):not([type=file])[required], textarea[required]').forEach((el) => {
      let ok = el.value.trim() !== '';
      if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      if (ok && el.type === 'tel') ok = el.value.replace(/\D/g, '').length >= 9;
      el.closest('.field').classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok) bad.push(el.closest('.field').querySelector('span').textContent.replace(' *', ''));
    });
    return bad;
  }
  function showError(bad) {
    error.textContent = `Please complete: ${bad.join(', ').toLowerCase()}.`;
    error.hidden = false;
    steps[cur].querySelector('[aria-invalid="true"], input:not(:checked)')?.focus({ preventScroll: true });
  }

  next.addEventListener('click', () => { const bad = invalid(steps[cur]); if (bad.length) return showError(bad); go(cur + 1); });
  prev.addEventListener('click', () => go(cur - 1));
  form.addEventListener('input', (e) => { e.target.closest('.field')?.classList.remove('is-invalid'); renderSummary(); });
  // choosing a chip on the first step moves on by itself
  form.addEventListener('change', (e) => {
    if (e.target.type === 'radio' && cur === 0) setTimeout(() => go(1), 220);
    renderSummary();
  });

  function data() { return Object.fromEntries([...new FormData(form)].filter(([k]) => k !== 'photos')); }
  function renderSummary() {
    const d = data();
    const bits = [d.help, d.roof && `${d.roof} roof`, d.height, d.area].filter(Boolean);
    summary.hidden = !bits.length || cur === 0;
    summary.innerHTML = bits.map((b) => `<span>${escapeHtml(b)}</span>`).join('');
  }

  /* photos */
  const input = form.querySelector('[data-upload-input]');
  const drop = form.querySelector('[data-upload-drop]');
  const list = form.querySelector('[data-upload-list]');
  function addFiles(fl) {
    [...fl].filter((f) => f.type.startsWith('image/')).forEach((f) => { if (files.length < 8) files.push(f); });
    renderFiles();
  }
  function renderFiles() {
    list.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      const img = document.createElement('img'); img.alt = f.name; img.src = URL.createObjectURL(f); img.onload = () => URL.revokeObjectURL(img.src);
      const x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', `Remove ${f.name}`);
      x.addEventListener('click', () => { files.splice(i, 1); renderFiles(); });
      li.append(img, x); list.append(li);
    });
    drop.classList.toggle('has-files', files.length > 0);
  }
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

  /* submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) { const bad = invalid(steps[i]); if (bad.length) { go(i); return showError(bad); } }
    const d = data();
    const lines = [
      `Roof assessment request`,
      `Need: ${d.help}`, `Roof type: ${d.roof}`, `Height access: ${d.height}`, `Area: ${d.area}`,
      d.message ? `Details: ${d.message}` : null,
      `Name: ${d.name}`, `Phone: ${d.phone}`, `Email: ${d.email}`,
      files.length ? `Photos: ${files.length} (attaching separately)` : null,
    ].filter(Boolean);
    const text = lines.join('\n');

    if (form.dataset.endpoint) {
      try {
        const fd = new FormData(form); fd.delete('photos'); files.forEach((f) => fd.append('photos', f));
        const r = await fetch(form.dataset.endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(r.status);
        form.querySelector('[data-done] h3').textContent = 'Request received.';
        form.querySelector('[data-done-text]').textContent = `Thanks, ${d.name}. The team will be in touch to arrange your assessment. Leaking right now? Call ${CONTACT.phone}.`;
        form.querySelector('.form__send').hidden = true;
        return showDone();
      } catch { /* fall back to WhatsApp / email below */ }
    }
    const subject = `Roof assessment: ${d.help}, ${d.roof} roof (${d.area})`;
    form.querySelector('[data-send-wa]').href = `https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(text)}`;
    form.querySelector('[data-send-mail]').href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + (files.length ? '\n\n(Please attach your roof photos to this email.)' : ''))}`;
    form.querySelector('[data-done-text]').textContent = files.length
      ? `Send it the way that suits you. On WhatsApp or email, attach the ${files.length} photo${files.length > 1 ? 's' : ''} you selected once the message opens.`
      : 'Send it the way that suits you. WhatsApp is quickest, and you can add photos there too.';
    showDone();
  });

  function showDone() { done.hidden = false; done.focus(); if (!reduced) gsap.from(done, { opacity: 0, y: 20, duration: 0.5, ease: 'power3.out' }); }
  form.querySelector('[data-reset]').addEventListener('click', () => { form.reset(); files = []; renderFiles(); done.hidden = true; form.querySelector('.form__send').hidden = false; go(0); });

  /* preselect from any CTA with data-help / data-roof */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-help], [data-roof]');
    if (!a || !a.matches('a[href="#assessment"]')) return;
    let jump = 0;
    if (a.dataset.help) { const r = form.querySelector(`input[name="help"][value="${a.dataset.help}"]`); if (r) { r.checked = true; jump = 1; } }
    if (a.dataset.roof) { const r = form.querySelector(`input[name="roof"][value="${a.dataset.roof}"]`); if (r) r.checked = true; }
    go(jump);
  });

  go(0);
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
