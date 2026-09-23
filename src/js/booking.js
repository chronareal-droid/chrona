// Multi-step booking request: type → date/time → guests → details → summary → request.
import { content } from './render.js';

const $ = (s, r = document) => r.querySelector(s);
const TIMES = ['09:00', '10:30', '12:00', '13:30', '15:00'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function booking(gsap, reduced) {
  const form = $('.book__form');
  const steps = [...form.querySelectorAll('.book__step')];
  const next = $('.book__next');
  const back = $('.book__back');
  const bar = $('.book__progress span');
  const err = $('.book__error');
  const state = { step: 1, type: null, pkg: null, date: null, time: null, guests: 2 };

  /* ---- step 1: choices ---- */
  const choices = [...form.querySelectorAll('.choice')];
  const pick = (v) => {
    state.type = v;
    choices.forEach((c) => c.setAttribute('aria-checked', String(c.dataset.v === v)));
  };
  choices.forEach((c) => c.addEventListener('click', () => { pick(c.dataset.v); state.pkg = null; }));

  // Any CTA carrying data-book preselects the type (and remembers the package name)
  document.addEventListener('click', (e) => {
    const cta = e.target.closest('[data-book]');
    if (!cta) return;
    pick(cta.dataset.book);
    state.pkg = cta.dataset.package || null;
    if (/couple|two|date/i.test(cta.dataset.book + (state.pkg || ''))) setGuests(2, false);
  });

  /* ---- step 2: calendar ---- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const grid = $('.cal__grid');
  const renderCal = () => {
    $('.cal__month').textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    $('.cal__nav[data-cal="-1"]').disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    const first = (view.getDay() + 6) % 7; // Monday first
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    let html = '<span></span>'.repeat(first);
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const past = date < today;
      const sel = state.date === iso;
      html += `<button type="button" class="cal__day ${+date === +today ? 'is-today' : ''}" data-d="${iso}" ${past ? 'disabled' : ''} aria-selected="${sel}" aria-label="${d} ${MONTHS[view.getMonth()]}">${d}</button>`;
    }
    grid.innerHTML = html;
    if (!reduced) gsap.fromTo(grid.querySelectorAll('.cal__day'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.008, ease: 'power2.out', clearProps: 'transform,opacity' });
  };
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.cal__day');
    if (!b || b.disabled) return;
    state.date = b.dataset.d;
    grid.querySelectorAll('.cal__day').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  });
  form.querySelectorAll('.cal__nav').forEach((b) => b.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() + Number(b.dataset.cal), 1);
    renderCal();
  }));
  const times = $('.cal__times');
  times.innerHTML = TIMES.map((t) => `<button type="button" class="time" role="radio" aria-checked="false" data-t="${t}">${t}</button>`).join('');
  times.addEventListener('click', (e) => {
    const b = e.target.closest('.time');
    if (!b) return;
    state.time = b.dataset.t;
    times.querySelectorAll('.time').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  });
  renderCal();

  /* ---- step 3: guests ---- */
  const num = $('.guests__num');
  const dots = $('.guests__dots');
  function setGuests(n, animate = true) {
    const dir = n > state.guests ? 1 : -1;
    state.guests = Math.max(1, Math.min(20, n));
    const apply = () => {
      num.textContent = state.guests;
      dots.innerHTML = '<span></span>'.repeat(state.guests);
      $('.guests__label').textContent = state.guests === 1 ? 'guest' : 'guests';
    };
    if (!animate || reduced) { apply(); return; }
    gsap.timeline()
      .to(num, { yPercent: -100 * dir, opacity: 0, duration: 0.25, ease: 'power2.in' })
      .add(apply)
      .fromTo(num, { yPercent: 100 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    gsap.from(dots.lastElementChild, { scale: 0, duration: 0.5, ease: 'back.out(3)', delay: 0.25 });
  }
  form.querySelectorAll('.guests__btn').forEach((b) => b.addEventListener('click', () => setGuests(state.guests + Number(b.dataset.g))));
  setGuests(2, false);

  /* ---- navigation ---- */
  const validate = () => {
    err.textContent = '';
    if (state.step === 1 && !state.type) return 'Choose what you are looking for.';
    if (state.step === 2 && !state.date) return 'Pick the day you are escaping.';
    if (state.step === 2 && !state.time) return 'Pick a preferred time.';
    if (state.step === 4) {
      let msg = '';
      ['name', 'email', 'phone'].forEach((n) => {
        const input = form.elements[n];
        const bad = !input.value.trim() || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) || (n === 'phone' && input.value.replace(/\D/g, '').length < 9);
        input.closest('.field').classList.toggle('is-invalid', bad);
        if (bad && !msg) msg = `Please add a valid ${n}.`;
      });
      return msg;
    }
    return '';
  };

  const show = (n) => {
    const from = steps.find((s) => s.classList.contains('is-active'));
    const to = steps.find((s) => Number(s.dataset.step) === n);
    state.step = n;
    bar.style.width = `${Math.min(n, 5) * 20}%`;
    back.classList.toggle('is-hidden', n === 1 || n === 6);
    next.hidden = n >= 5;
    if (n === 5) summary();
    const swap = () => {
      from?.classList.remove('is-active');
      to.classList.add('is-active');
      if (reduced) return;
      gsap.fromTo(to, { opacity: 0, y: 40, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' });
      gsap.fromTo(to.querySelectorAll('.choice, .cal, .guests, .field, .book__summary > div, .btn'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'power3.out', delay: 0.1, clearProps: 'transform,opacity' });
    };
    if (from && !reduced) gsap.to(from, { opacity: 0, y: -30, filter: 'blur(6px)', duration: 0.35, ease: 'power2.in', onComplete: () => { gsap.set(from, { clearProps: 'all' }); swap(); } });
    else swap();
  };

  next.addEventListener('click', () => {
    const m = validate();
    if (m) {
      showErr(m);
      return;
    }
    show(state.step + 1);
  });
  back.addEventListener('click', () => show(Math.max(1, state.step - 1)));

  // Step 1/2 errors live outside step 4's alert slot, so use a transient message
  const showErr = (m) => {
    err.textContent = m;
    const target = steps.find((s) => s.classList.contains('is-active'));
    if (!target.contains(err)) target.appendChild(err);
    if (!reduced) gsap.fromTo(target, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  };

  const fmtDate = (iso) => new Date(iso + 'T00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long' });
  function summary() {
    const rows = [
      ['Experience', state.pkg ? `${state.type}: ${state.pkg}` : state.type],
      ['Date', `${fmtDate(state.date)}, ${state.time}`],
      ['Guests', state.guests],
      ['Name', form.elements.name.value.trim()],
    ];
    $('.book__summary').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${String(v).replace(/</g, '&lt;')}</dd></div>`).join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = content.business;
    const payload = {
      type: state.type, package: state.pkg, date: state.date, time: state.time, guests: state.guests,
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim(),
      message: form.elements.message.value.trim(),
    };
    let sent = false;
    if (b.bookingEndpoint) {
      try {
        const r = await fetch(b.bookingEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        sent = r.ok;
      } catch { sent = false; }
    }
    if (!sent) {
      // No backend configured: hand the request to the guest's mail app, pre-filled.
      const body = [
        `Booking request: ${payload.type}${payload.package ? ` (${payload.package})` : ''}`,
        `Date: ${fmtDate(payload.date)} at ${payload.time}`,
        `Guests: ${payload.guests}`,
        `Name: ${payload.name}`, `Email: ${payload.email}`, `Phone: ${payload.phone}`,
        payload.message ? `\n${payload.message}` : '',
      ].join('\n');
      const href = `mailto:${b.email}?subject=${encodeURIComponent(`Booking request: ${payload.type}, ${fmtDate(payload.date)}`)}&body=${encodeURIComponent(body)}`;
      const a = document.createElement('a'); a.href = href; a.rel = 'noopener'; a.click();
    }
    $('.book__done-msg').textContent = sent
      ? `Thank you, ${payload.name.split(' ')[0]}. We'll confirm your ${payload.type.toLowerCase()} for ${fmtDate(payload.date)} shortly.`
      : `Thank you, ${payload.name.split(' ')[0]}. Your email app has opened with the request to ${b.email}. Just press send. Prefer to talk? Call ${b.phone}.`;
    document.dispatchEvent(new CustomEvent('booking:sent', { detail: payload }));
    show(6);
  });

  return { state };
}
