// "Where does it go?": tap an item and it flies into its waste stream.
// Streams are limited to what Bekabee handles: paper, plastic, glass, metal, general waste,
// and skips for rubble / garden waste.

const BINS = [
  { k: 'paper', name: 'Paper', note: 'Paper & cardboard', c: 'var(--paper)' },
  { k: 'plastic', name: 'Plastic', note: 'Bottles & tubs', c: 'var(--plastic)' },
  { k: 'glass', name: 'Glass', note: 'Bottles & jars', c: 'var(--glass)' },
  { k: 'metal', name: 'Metal', note: 'Cans & tins', c: 'var(--metal)' },
  { k: 'general', name: 'General', note: "Can't be recycled", c: 'var(--general)' },
  { k: 'skip', name: 'Skip', note: 'Rubble & garden', c: 'var(--rubble)' },
];

const I = {
  newspaper: '<rect x="10" y="12" width="44" height="40" rx="3" fill="#F5F4EE" stroke="#101313" stroke-width="2.5"/><rect x="16" y="18" width="14" height="12" fill="#F2C230"/><path d="M34 20h14M34 26h14M16 36h32M16 42h32M16 48h22" stroke="#101313" stroke-width="2.5"/>',
  box: '<path d="M8 22 32 12l24 10v26L32 58 8 48Z" fill="#d7b98a" stroke="#101313" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 22l24 10 24-10M32 32v26" stroke="#101313" stroke-width="2.5" fill="none"/><path d="M20 17l24 10" stroke="#F2C230" stroke-width="4"/>',
  bottle: '<path d="M27 6h10v8c6 4 8 8 8 14v26a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4V28c0-6 2-10 8-14Z" fill="#bfe6c0" stroke="#101313" stroke-width="2.5" stroke-linejoin="round"/><rect x="26" y="4" width="12" height="6" rx="2" fill="#48B84A" stroke="#101313" stroke-width="2"/><rect x="19" y="32" width="26" height="12" fill="#48B84A"/>',
  tub: '<path d="M12 22h40l-5 32H17Z" fill="#F5F4EE" stroke="#101313" stroke-width="2.5" stroke-linejoin="round"/><rect x="9" y="15" width="46" height="8" rx="3" fill="#48B84A" stroke="#101313" stroke-width="2.5"/><path d="M20 34h24" stroke="#48B84A" stroke-width="4"/>',
  glassbottle: '<path d="M28 4h8v14c5 3 8 7 8 13v25a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V31c0-6 3-10 8-13Z" fill="#15803D" stroke="#101313" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 30v20" stroke="#fff" stroke-width="3" opacity=".5"/><rect x="21" y="36" width="22" height="10" fill="#F2C230"/>',
  jar: '<rect x="16" y="18" width="32" height="40" rx="7" fill="#d6ece0" stroke="#101313" stroke-width="2.5"/><rect x="18" y="8" width="28" height="10" rx="2" fill="#7C8584" stroke="#101313" stroke-width="2.5"/><path d="M22 26v22" stroke="#fff" stroke-width="3"/>',
  can: '<rect x="18" y="8" width="28" height="50" rx="5" fill="#c7cccb" stroke="#101313" stroke-width="2.5"/><rect x="18" y="20" width="28" height="24" fill="#F2C230"/><path d="M22 12h20" stroke="#101313" stroke-width="2"/>',
  tin: '<rect x="12" y="16" width="40" height="40" rx="4" fill="#c7cccb" stroke="#101313" stroke-width="2.5"/><path d="M12 24h40M12 48h40" stroke="#101313" stroke-width="2"/><rect x="12" y="28" width="40" height="16" fill="#15803D"/>',
  scraps: '<path d="M8 44c0-10 10-18 24-18s24 8 24 18Z" fill="#F5F4EE" stroke="#101313" stroke-width="2.5"/><path d="M6 44h52v4a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6Z" fill="#7C8584" stroke="#101313" stroke-width="2.5"/><circle cx="24" cy="36" r="4" fill="#F2C230"/><path d="M34 32c4-4 10-2 10 2" stroke="#48B84A" stroke-width="3" fill="none"/>',
  chips: '<path d="M14 10h36l-4 8 4 8-4 8 4 8-4 8 4 6H14l4-6-4-8 4-8-4-8 4-8Z" fill="#F2C230" stroke="#101313" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="32" r="8" fill="#15803D"/>',
  bricks: '<rect x="6" y="36" width="24" height="14" fill="#b4634a" stroke="#101313" stroke-width="2.5"/><rect x="34" y="36" width="24" height="14" fill="#b4634a" stroke="#101313" stroke-width="2.5"/><rect x="18" y="20" width="26" height="14" fill="#c7765b" stroke="#101313" stroke-width="2.5"/><path d="M4 54h56" stroke="#9b8a74" stroke-width="4"/>',
  garden: '<path d="M32 58V28" stroke="#6b4f2c" stroke-width="4"/><path d="M32 34C20 34 12 26 12 14c12 0 20 8 20 20ZM32 28c0-12 8-20 20-20 0 12-8 20-20 20Z" fill="#48B84A" stroke="#101313" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 44c-8 0-14-6-14-12 8 0 14 4 14 12Z" fill="#15803D" stroke="#101313" stroke-width="2.5"/>',
};

const ITEMS = [
  { name: 'Newspaper', icon: 'newspaper', bin: 'paper', why: 'Paper is sorted out and kept clean and dry.' },
  { name: 'Cardboard box', icon: 'box', bin: 'paper', why: 'Cardboard is recyclable paper.' },
  { name: 'Plastic bottle', icon: 'bottle', bin: 'plastic', why: 'Plastic bottles are separated from the mixed waste.' },
  { name: 'Yoghurt tub', icon: 'tub', bin: 'plastic', why: 'Plastic tubs join the plastic stream.' },
  { name: 'Glass bottle', icon: 'glassbottle', bin: 'glass', why: 'Glass is kept apart so it can be recycled.' },
  { name: 'Glass jar', icon: 'jar', bin: 'glass', why: 'Jars go with glass. The lid goes with metal.' },
  { name: 'Cooldrink can', icon: 'can', bin: 'metal', why: 'Cans are metal, one of the recyclable streams.' },
  { name: 'Food tin', icon: 'tin', bin: 'metal', why: 'Tins are metal too.' },
  { name: 'Food scraps', icon: 'scraps', bin: 'general', why: "What can't be recycled is removed responsibly." },
  { name: 'Chip packet', icon: 'chips', bin: 'general', why: 'Most chip packets are mixed materials, so they go to general waste.' },
  { name: 'Bricks', icon: 'bricks', bin: 'skip', why: 'Rubble goes in a rubble skip or on a flatbed.' },
  { name: 'Garden cuttings', icon: 'garden', bin: 'skip', why: 'Garden waste is a job for a skip.' },
];

const svgIcon = (k) => `<svg viewBox="0 0 64 64" aria-hidden="true">${I[k]}</svg>`;

export function initSorter({ gsap, reduced }) {
  const root = document.querySelector('[data-sorter]');
  const itemsEl = root.querySelector('[data-sorter-items]');
  const binsEl = root.querySelector('[data-sorter-bins]');
  const caption = root.querySelector('[data-sorter-caption]');
  const countEl = root.querySelector('[data-sorter-count]');
  root.querySelector('[data-sorter-total]').textContent = ITEMS.length;
  let sorted = 0;

  binsEl.innerHTML = BINS.map((b) => `<li class="sorter__bin" data-k="${b.k}" style="--c:${b.c}"><span class="n" data-n>0</span><strong>${b.name}</strong><small>${b.note}</small></li>`).join('');

  function render() {
    sorted = 0; countEl.textContent = '0';
    binsEl.querySelectorAll('[data-n]').forEach((n) => (n.textContent = '0'));
    itemsEl.innerHTML = ITEMS.map((it, i) => `<li><button class="sorter__item" type="button" data-i="${i}" data-cursor="explore">${svgIcon(it.icon)}<span>${it.name}</span></button></li>`).join('');
    caption.innerHTML = 'Pick any item to sort it.';
  }
  render();

  itemsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.sorter__item');
    if (!btn || btn.disabled) return;
    const it = ITEMS[Number(btn.dataset.i)];
    const bin = binsEl.querySelector(`[data-k="${it.bin}"]`);
    const binDef = BINS.find((b) => b.k === it.bin);
    btn.disabled = true;
    caption.innerHTML = `<span><b>${it.name}</b> → ${binDef.name}. ${it.why}</span>`;

    const done = () => {
      const n = bin.querySelector('[data-n]'); n.textContent = Number(n.textContent) + 1;
      bin.classList.remove('is-hit'); void bin.offsetWidth; bin.classList.add('is-hit');
      sorted++; countEl.textContent = sorted;
      if (sorted === ITEMS.length) caption.innerHTML = '<span><b>All sorted.</b> Now picture that every day, handled for you, by Bekabee.</span>';
    };
    if (reduced) { done(); return; }

    const from = btn.querySelector('svg').getBoundingClientRect();
    const to = bin.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'sorter__fly';
    fly.innerHTML = svgIcon(it.icon);
    fly.style.left = `${from.left}px`; fly.style.top = `${from.top}px`;
    fly.style.width = `${from.width}px`; fly.style.height = `${from.height}px`;
    document.body.append(fly);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height * 0.45 - (from.top + from.height / 2);
    const tl = gsap.timeline({ onComplete: () => { fly.remove(); done(); } });
    tl.to(fly, { x: dx, duration: 0.75, ease: 'power1.inOut' }, 0)
      .to(fly, { y: Math.min(dy, 0) - 70, duration: 0.3, ease: 'power2.out' }, 0)
      .to(fly, { y: dy, duration: 0.45, ease: 'power2.in' }, 0.3)
      .to(fly, { rotation: 360, scale: 0.55, duration: 0.75, ease: 'none' }, 0)
      .to(fly, { opacity: 0, duration: 0.12 }, 0.66);
  });

  root.querySelector('[data-sorter-reset]').addEventListener('click', render);
}
