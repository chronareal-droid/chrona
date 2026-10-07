// DOM-side presentation: dialogue, cards, objectives, HUD widgets.
const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createUI(input) {
  const sub = $('#subtitle'), who = sub.querySelector('.who'), line = sub.querySelector('.line'), ref = sub.querySelector('.ref'), choices = sub.querySelector('.choices');
  const card = $('#card'), fade = $('#fade'), hud = $('#hud');
  const objText = $('.obj-text'), objDist = $('.obj-dist'), objBox = $('.objective');
  const health = $('.health i'), stones = $('.stones'), stonesN = $('.stones b');
  const marker = $('.marker'), markerDist = $('.marker em');
  const cross = $('.crosshair'), crossC = cross.querySelector('circle');
  const prompt = $('.prompt'), promptText = prompt.querySelector('span');
  const boss = $('.boss'), bossBar = $('.boss .bar i'), hint = $('.hint');
  let hintTimer = null;
  const spiritEl = $('.spirit'), spiritBar = $('.spirit i'), courageEl = $('.courage'), courageBar = $('.courage i');
  const toasts = $('#toasts'), scrollCard = $('#scrollcard'), timing = $('#timing');

  const ui = {
    showHUD(v) { hud.hidden = !v; },
    cinema(on) { document.body.classList.toggle('cinema', on); },
    async fadeOut(ms = 900) { fade.style.transitionDuration = ms + 'ms'; fade.style.opacity = 1; await wait(ms); },
    async fadeIn(ms = 900) { fade.style.transitionDuration = ms + 'ms'; fade.style.opacity = 0; await wait(ms); },

    /** Show a line; resolves after the player advances (or after `auto` ms). */
    async say(speaker, text, { reference = '', auto = 0, minMs = 450 } = {}) {
      input.clearUI();
      sub.hidden = false; sub.classList.remove('ready');
      who.textContent = speaker || ''; ref.textContent = reference; choices.innerHTML = '';
      line.textContent = '';
      // Typewriter, skippable
      const start = performance.now();
      let skipped = false;
      for (let i = 0; i <= text.length; i += 2) {
        line.textContent = text.slice(0, i);
        if (input.pressed.has('advance') && performance.now() - start > 150) { skipped = true; input.pressed.delete('advance'); break; }
        await wait(16);
      }
      line.textContent = text;
      sub.classList.add('ready');
      const t0 = performance.now();
      const readMs = auto || Math.max(1800, text.length * 45);
      await new Promise((res) => {
        const tick = () => {
          const el = performance.now() - t0;
          const adv = input.pressed.has('advance') && (el > minMs || skipped);
          if (adv) input.pressed.delete('advance');
          if (adv || (auto && el > readMs)) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
      sub.hidden = true;
    },

    async choose(speaker, text, options) {
      input.clearUI();
      sub.hidden = false; sub.classList.remove('ready');
      who.textContent = speaker || ''; line.textContent = text; ref.textContent = '';
      choices.innerHTML = '';
      return new Promise((res) => {
        const done = (i) => { sub.hidden = true; choices.innerHTML = ''; cancelAnimationFrame(raf); res(i); };
        options.forEach((o, i) => {
          const b = document.createElement('button');
          b.innerHTML = `<kbd>${i + 1}</kbd>${o}`;
          b.onclick = () => done(i);
          choices.appendChild(b);
        });
        let raf;
        const tick = () => {
          if (input.pressed.has('choice1')) return done(0);
          if (input.pressed.has('choice2')) return done(1);
          if (input.pressed.has('choice3') && options.length > 2) return done(2);
          raf = requestAnimationFrame(tick);
        };
        tick();
        if (document.pointerLockElement) document.exitPointerLock();
      });
    },

    async card(kicker, title, text = '', ms = 3600) {
      card.hidden = false; card.classList.remove('out');
      card.querySelector('small').textContent = kicker;
      card.querySelector('h2').textContent = title;
      card.querySelector('p').textContent = text;
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
      await wait(ms);
      card.classList.add('out');
      await wait(1000);
      card.hidden = true;
    },

    objective(text) {
      objText.textContent = text; objDist.textContent = '';
      objBox.hidden = !text;
      objBox.classList.remove('flash'); void objBox.offsetWidth; objBox.classList.add('flash');
    },
    objectiveDist(m) { objDist.textContent = m == null ? '' : `${Math.round(m)} m`; },
    health(f) { health.style.width = Math.max(0, f * 100) + '%'; },
    hurt() { hud.classList.remove('hurt'); void hud.offsetWidth; hud.classList.add('hurt'); },
    stones(n, show = true) { stones.hidden = !show; stonesN.textContent = n; },
    marker(x, y, dist, visible) {
      marker.hidden = !visible;
      if (visible) { marker.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; markerDist.textContent = `${Math.round(dist)} m`; }
    },
    crosshair(show, charge = 0) {
      cross.hidden = !show;
      crossC.style.strokeDasharray = `${charge * 100} 100`;
      cross.classList.toggle('full', charge >= 1);
    },
    prompt(text, key = 'E') { prompt.hidden = !text; if (text) { promptText.textContent = text; prompt.querySelector('kbd').textContent = input.touch ? 'E' : key; } },
    boss(show, f = 1) { boss.hidden = !show; bossBar.style.width = f * 100 + '%'; },
    spirit(f, active, left = 0) {
      spiritEl.hidden = false;
      spiritBar.style.width = (active ? Math.min(1, left / 10) : f) * 100 + '%';
      spiritEl.classList.toggle('ready', f >= 0.5 && !active);
      spiritEl.classList.toggle('active', !!active);
    },
    courage(v) { courageEl.hidden = !v; courageBar.style.width = Math.min(100, v) + '%'; },
    toast(text, ms = 2600, big = false) {
      const d = document.createElement('div');
      d.className = 'toast' + (big ? ' big' : ''); d.textContent = text;
      toasts.appendChild(d);
      setTimeout(() => d.classList.add('out'), ms);
      setTimeout(() => d.remove(), ms + 600);
    },
    scroll(sc, n, total) {
      scrollCard.hidden = false;
      scrollCard.querySelector('small').textContent = `Scroll ${n} of ${total}`;
      scrollCard.querySelector('p').textContent = `“${sc.text}”`;
      scrollCard.querySelector('cite').textContent = sc.ref;
      scrollCard.classList.remove('out'); scrollCard.style.animation = 'none'; void scrollCard.offsetWidth; scrollCard.style.animation = '';
      clearTimeout(ui._sct);
      ui._sct = setTimeout(() => { scrollCard.classList.add('out'); setTimeout(() => (scrollCard.hidden = true), 700); }, 5200);
    },
    /** Conviction mini-game: stop the moving mark inside the golden zone. Resolves 0..1. */
    timing(label, inp) {
      inp.clearUI();
      timing.hidden = false;
      timing.querySelector('small').textContent = label;
      const mark = timing.querySelector('.mark'), zone = timing.querySelector('.zone');
      const zc = 0.3 + Math.random() * 0.4, zw = 0.16;
      zone.style.left = (zc - zw / 2) * 100 + '%'; zone.style.width = zw * 100 + '%';
      const t0 = performance.now();
      return new Promise((res) => {
        const tick = () => {
          const t = (performance.now() - t0) / 1000;
          const x = 0.5 + 0.5 * Math.sin(t * 3.4 - Math.PI / 2);
          mark.style.left = x * 100 + '%';
          if (inp.pressed.has('advance') || inp.pressed.has('attack') || t > 6) {
            inp.clearUI(); inp.pressed.delete('attack');
            const q = Math.max(0, 1 - Math.abs(x - zc) / (zw * 1.5));
            timing.classList.add(q > 0.6 ? 'good' : 'meh');
            setTimeout(() => { timing.hidden = true; timing.classList.remove('good', 'meh'); res(q); }, 500);
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
    },
    hint(text, ms = 4500) {
      clearTimeout(hintTimer);
      hint.hidden = !text; hint.textContent = text || '';
      hint.style.animation = 'none'; void hint.offsetWidth; hint.style.animation = '';
      if (text && ms) hintTimer = setTimeout(() => { hint.hidden = true; }, ms);
    },
  };
  return ui;
}
export { wait };
