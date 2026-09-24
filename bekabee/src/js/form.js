// Quote form. With no backend configured it opens a pre-filled email to info@bekabee.co.za.
// Set data-endpoint="https://…" on the form to POST JSON to a form service instead.

const EMAIL = 'info@bekabee.co.za';

export function initQuoteForm() {
  const form = document.querySelector('[data-quote-form]');
  const error = form.querySelector('[data-form-error]');
  const done = form.querySelector('[data-form-done]');

  const fieldOf = (el) => el.closest('.field');
  form.addEventListener('input', (e) => fieldOf(e.target)?.classList.remove('is-invalid'));
  form.addEventListener('change', (e) => fieldOf(e.target)?.classList.remove('is-invalid'));

  function validate() {
    const bad = [];
    form.querySelectorAll('[required]').forEach((el) => {
      let ok = el.value.trim() !== '';
      if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      if (ok && el.type === 'tel') ok = el.value.replace(/\D/g, '').length >= 9;
      fieldOf(el).classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok) bad.push(el);
    });
    return bad;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = validate();
    if (bad.length) {
      const names = bad.map((el) => fieldOf(el).querySelector('span').textContent.replace(' *', '').toLowerCase());
      error.textContent = `Please check: ${names.join(', ')}.`;
      error.hidden = false;
      bad[0].focus();
      return;
    }
    error.hidden = true;
    const data = Object.fromEntries(new FormData(form));

    if (form.dataset.endpoint) {
      try {
        const r = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
        done.querySelector('h3').textContent = 'Request sent.';
        done.querySelector('p').innerHTML = `Thanks, ${escapeHtml(data.name)}. Bekabee will be in touch shortly. Need us sooner? Call <a href="tel:+27862352233">0861-BEKABEE</a>.`;
        showDone();
        form.reset();
        return;
      } catch {
        // fall through to email so the request is never lost
      }
    }

    const subject = `Quote request: ${data.service} (${data.location})`;
    const body = [
      `Name: ${data.name}`,
      data.company ? `Company: ${data.company}` : null,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      `Service required: ${data.service}`,
      `Location: ${data.location}`,
      '',
      data.message || '',
    ].filter((l) => l !== null).join('\n');
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showDone();
  });

  function showDone() {
    done.hidden = false;
    done.focus();
    setTimeout(() => { done.hidden = true; }, 14000);
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
