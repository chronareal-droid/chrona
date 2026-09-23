// Contact form: inline validation, then POST to the configured endpoint or fall back to email.
const rules = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
  phone: (v) => (!v.trim() || /^[+()\d\s-]{7,20}$/.test(v.trim()) ? '' : 'Please enter a valid phone number, or leave it blank.'),
  enquiry: (v) => (v ? '' : 'Please choose what your enquiry is about.'),
  message: (v) => (v.trim().length >= 10 ? '' : 'Please tell us a little more (at least 10 characters).'),
};

export function initForm(form) {
  if (!form) return;
  let config = {};
  try { config = JSON.parse(document.getElementById('contact-config')?.textContent || '{}'); } catch { /* none */ }
  const status = form.querySelector('.form__status');

  const check = (input) => {
    const rule = rules[input.name];
    if (!rule) return true;
    const msg = rule(input.value);
    const field = input.closest('.field');
    const err = field.querySelector('.field__err');
    field.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg; if (err.id) input.setAttribute('aria-describedby', err.id); }
    return !msg;
  };

  form.addEventListener('blur', (e) => { if (e.target.name && e.target.value) check(e.target); }, true);
  form.addEventListener('input', (e) => { if (e.target.closest('.field.is-invalid')) check(e.target); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = [...form.elements].filter((el) => el.name);
    const invalid = inputs.filter((el) => !check(el));
    status.className = 'form__status';
    if (invalid.length) {
      invalid[0].focus();
      status.textContent = `Please check ${invalid.length === 1 ? 'the highlighted field' : `the ${invalid.length} highlighted fields`}.`;
      return;
    }
    const data = Object.fromEntries(inputs.map((el) => [el.name, el.value.trim()]));
    const btn = form.querySelector('[type="submit"]');

    if (config.endpoint) {
      btn.disabled = true;
      status.textContent = 'Sending…';
      try {
        const r = await fetch(config.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
        form.reset();
        status.classList.add('is-ok');
        status.textContent = 'Thank you. Your enquiry has been sent and MGTD will be in touch.';
      } catch {
        status.classList.add('is-warn');
        status.textContent = 'Sorry, the message could not be sent. Please try again or email MGTD directly.';
      } finally { btn.disabled = false; }
      return;
    }

    if (config.email) {
      const body = `Name: ${data.name}\nCompany: ${data.company}\nEmail: ${data.email}\nPhone: ${data.phone}\nEnquiry: ${data.enquiry}\n\n${data.message}`;
      location.href = `mailto:${config.email}?subject=${encodeURIComponent(`Enquiry: ${data.enquiry}`)}&body=${encodeURIComponent(body)}`;
      status.classList.add('is-ok');
      status.textContent = 'Your email app should open with the message ready to send.';
      return;
    }

    status.classList.add('is-warn');
    status.textContent = 'Your details are valid, but this form is not connected yet. Add MGTD’s email or a form endpoint in content.json before launch.';
  });
}
