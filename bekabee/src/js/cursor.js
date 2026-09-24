// Custom cursor: a small green dot with a trailing yellow ring. "GO →" over CTAs, "EXPLORE" over services.
export function initCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const el = document.querySelector('[data-cursor-el]');
  const dot = el.querySelector('.cursor__dot');
  const ring = el.querySelector('.cursor__ring');
  const label = el.querySelector('[data-cursor-label]');
  document.documentElement.classList.add('has-cursor');

  let x = -100, y = -100, rx = x, ry = y, lx = x, ly = y;
  window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; el.classList.remove('is-hidden'); }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, select, input, textarea, label');
    const kind = t?.closest('[data-cursor]')?.dataset.cursor;
    el.classList.toggle('is-label', kind === 'go' || kind === 'explore');
    el.classList.toggle('is-hover', !!t && !kind);
    label.textContent = kind === 'go' ? 'GO →' : kind === 'explore' ? 'EXPLORE' : '';
  });

  const tick = () => {
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    lx += (x - lx) * 0.3; ly += (y - ly) * 0.3;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    label.style.transform = `translate(${lx - label.offsetWidth / 2}px, ${ly - 6}px)`;
    requestAnimationFrame(tick);
  };
  tick();
}
