// Home screen, pause menu, and the shared panels (chapters, scrolls & rewards, journal, settings, controls).
import { SCROLLS, REWARDS } from './systems.js';
import { PRESETS } from './post.js';

export const PARTS = [
  { id: 'prologue', n: 'Prologue', title: 'The Anointing', blurb: 'Samuel comes to Bethlehem to anoint the youngest son of Jesse.' },
  { id: 'lion', n: 'Part 1', title: 'The Lion', blurb: 'A lion takes a lamb from the flock.' },
  { id: 'road', n: 'Part 2', title: 'The Road to Elah', blurb: 'Bread and cheese for your brothers at the front.' },
  { id: 'camp', n: 'Part 3', title: 'The Camp of Israel', blurb: 'Forty days of shame. A giant’s challenge.' },
  { id: 'stones', n: 'Part 4', title: 'Five Smooth Stones', blurb: 'Down to the brook, with a sling in your hand.' },
  { id: 'duel', n: 'Part 5', title: 'The Champion', blurb: 'In the name of the LORD of hosts.' },
];

const $ = (s) => document.querySelector(s);

export function createMenu(G, { start }) {
  const { save, audio, post, ui } = G;
  const home = $('#home'), pauseEl = $('#pause'), panel = $('#panel');
  const body = panel.querySelector('.panel-body'), head = panel.querySelector('h2');
  let panelBack = null;
  audio.vol = save.settings.volume;

  const contBtn = home.querySelector('[data-nav="continue"]');
  contBtn.hidden = !save.part;
  if (save.part) contBtn.textContent = `Continue · ${PARTS.find((p) => p.id === save.part)?.title || ''}`;

  const openPanel = (title, html, back) => {
    head.textContent = title; body.innerHTML = html; panel.hidden = false; panelBack = back;
    panel.querySelector('.close').focus();
  };
  const closePanel = () => { panel.hidden = true; panelBack?.(); };
  panel.querySelector('.close').onclick = closePanel;
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && !panel.hidden) { e.stopPropagation(); closePanel(); } }, true);

  const begin = (part) => { home.hidden = true; G.menuOpen = false; start(part); };

  // ---------- Panels
  const chapters = (back) => {
    openPanel('Chapters', `<div class="chapters">${PARTS.map((p) => `
      <button class="chapter" data-part="${p.id}" ${save.reached.includes(p.id) ? '' : 'disabled'}>
        <small>${p.n}</small><b>${p.title}</b><span>${save.reached.includes(p.id) ? p.blurb : 'Not yet reached'}</span></button>`).join('')}
      <button class="chapter" disabled><small>Chapter II</small><b>The Fugitive</b><span>Coming later</span></button>
      <button class="chapter" disabled><small>Chapter III</small><b>The Cave of Adullam</b><span>Coming later</span></button>
      </div>`, back);
    body.querySelectorAll('[data-part]').forEach((b) => (b.onclick = () => { panel.hidden = true; if (G.inGame) location.hash = b.dataset.part, location.reload(); else begin(b.dataset.part); }));
  };
  const rewards = (back) => {
    const n = save.scrolls.length;
    openPanel('Scrolls & Rewards', `
      <p class="progress-line">${n} of ${SCROLLS.length} scrolls found · Faith ${save.faith} · Israel’s courage ${save.courage}%</p>
      <div class="scrolls">${SCROLLS.map((s, i) => save.scrolls.includes(s.id)
        ? `<div class="scroll-tile got">“${s.text}”<cite>${s.ref}</cite></div>`
        : `<div class="scroll-tile locked">${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i]}</div>`).join('')}</div>
      <ul class="rewards">${REWARDS.map((r) => `<li class="${n >= r.need ? 'on' : 'off'}"><b>${n >= r.need ? '✦' : `${r.need}`}</b><div><strong>${r.name}</strong><br/>${r.desc}</div></li>`).join('')}
        <li class="${save.quests.lostSheep === 'done' ? 'on' : 'off'}"><b>${save.quests.lostSheep === 'done' ? '✦' : 'Quest'}</b><div><strong>Shepherd’s Cloak</strong><br/>Complete “The Lost Sheep”. Take 20% less harm.</div></li>
      </ul>`, back);
  };
  const journal = (back) => {
    const defs = G.systems.questDefs, Q = save.quests;
    const state = (id) => Q[id] === 'done' ? 'Complete' : Q[id] ? 'In progress' : 'Not started. Find them in ' + defs[id].where;
    openPanel('Journal', `<div class="journal">
      <h3>Main story</h3><div class="q"><b>${PARTS.find((p) => p.id === save.part)?.title || 'Prologue'}</b><br/>${G.objective?.text || $('.obj-text').textContent || '-'}</div>
      <h3>Side quests</h3>${Object.entries(defs).map(([id, d]) => `<div class="q ${Q[id] === 'done' ? 'done' : ''}"><b>${d.title}</b> · <small>${state(id)}</small><br/>${d.desc}<em>Reward: ${d.reward}</em></div>`).join('')}
      <h3>Preaching</h3><div class="q">Frightened soldiers huddle in the camp of Israel. Speak the truth to them (choose the answer that honours the LORD, not your own pride) and time your words with conviction. Israel’s courage: <b>${save.courage}%</b></div>
      <h3>The Holy Spirit</h3><div class="q">After your anointing, the Spirit gathers as you pray at stone altars, preach, find scrolls and show kindness. Press <kbd>Q</kbd> when it shines: time slows, wounds mend, and your sling flies true.</div>
    </div>`, back);
  };
  const settings = (back) => {
    const st = save.settings;
    openPanel('Settings', `<div class="settings">
      <label>Graphics quality<div class="seg" data-k="quality">${Object.entries(PRESETS).map(([k, p]) => `<button data-v="${k}" class="${st.quality === k ? 'on' : ''}">${p.label}</button>`).join('')}</div></label>
      <p class="note">Ultra renders at native 4K on 4K displays, with ambient occlusion, 4096 px shadows, bloom and SMAA. Use High on laptops and Medium on phones.</p>
      <label>Camera view<div class="seg" data-k="camMode"><button data-v="third" class="${G.camMode === 'third' ? 'on' : ''}">Third person</button><button data-v="first" class="${G.camMode === 'first' ? 'on' : ''}">First person</button><button data-v="second" class="${G.camMode === 'second' ? 'on' : ''}">Second person</button></div></label>
      <p class="note">Second person is the Witness view: you see David through the eyes of someone walking ahead of him. Press V in play to cycle views.</p>
      <label>Volume<input type="range" min="0" max="1" step="0.05" value="${st.volume}" data-r="volume" /></label>
      <label>Look sensitivity<input type="range" min="0.3" max="2.5" step="0.05" value="${st.sensitivity}" data-r="sensitivity" /></label>
      <label>Invert look<div class="seg" data-k="invertY"><button data-v="false" class="${!st.invertY ? 'on' : ''}">Off</button><button data-v="true" class="${st.invertY ? 'on' : ''}">On</button></div></label>
      <label>Progress<div class="seg"><button data-reset>Erase saved progress</button></div></label>
    </div>`, back);
    body.querySelectorAll('.seg[data-k] button').forEach((b) => (b.onclick = () => {
      const k = b.parentElement.dataset.k; let v = b.dataset.v;
      if (v === 'true' || v === 'false') v = v === 'true';
      b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      if (k === 'camMode') { G.cycleCamera(v); return; }
      st[k] = v; save.write();
      if (k === 'quality') post.apply(v, G.world.sun);
    }));
    body.querySelectorAll('[data-r]').forEach((r) => (r.oninput = () => {
      st[r.dataset.r] = parseFloat(r.value); save.write();
      if (r.dataset.r === 'volume') audio.volume(st.volume);
    }));
    body.querySelector('[data-reset]').onclick = (e) => {
      if (e.target.dataset.armed) { save.reset(); location.hash = ''; location.reload(); }
      e.target.dataset.armed = 1; e.target.textContent = 'Click again to confirm';
    };
  };
  const controls = (back) => openPanel('Controls', `<div class="ctl-list">
      <kbd>W A S D</kbd><span>Move (in Witness view: A/D turn)</span><kbd>Mouse</kbd><span>Look (click the game to capture the mouse)</span>
      <kbd>Shift</kbd><span>Run / gallop</span><kbd>Space</kbd><span>Jump · advance dialogue</span><kbd>C</kbd><span>Roll (dodge)</span>
      <kbd>E</kbd><span>Talk · ride · pray · preach · pick up</span><kbd>Left click</kbd><span>Strike with staff / release sling</span>
      <kbd>Right mouse / F</kbd><span>Whirl the sling (aim)</span><kbd>Q</kbd><span>Call upon the Holy Spirit</span>
      <kbd>V</kbd><span>Camera: third → first → second person</span><kbd>Tab</kbd><span>Journal</span><kbd>Esc / P</kbd><span>Pause</span>
      <kbd>1 2 3</kbd><span>Choose a reply</span></div>`, back);

  // ---------- Home
  const showHome = () => { home.hidden = false; G.menuOpen = true; };
  home.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => {
    audio.start(); audio.volume(save.settings.volume);
    const n = b.dataset.nav;
    if (n === 'continue') begin(save.part);
    if (n === 'new') { save.part = null; save.write(); begin('prologue'); }
    if (n === 'chapters') { home.hidden = true; chapters(showHome); }
    if (n === 'rewards') { home.hidden = true; rewards(showHome); }
    if (n === 'settings') { home.hidden = true; settings(showHome); }
    if (n === 'controls') { home.hidden = true; controls(showHome); }
  }));

  // ---------- Pause
  const menu = { open: false };
  const resume = () => {
    pauseEl.hidden = true; G.paused = false; menu.open = false;
    if (!G.input.touch) G.renderer.domElement.requestPointerLock?.();
  };
  const showPause = () => { pauseEl.hidden = false; };
  menu.pause = () => {
    if (menu.open || !G.inGame) return;
    menu.open = true; G.paused = true; showPause();
    if (document.pointerLockElement) document.exitPointerLock();
  };
  menu.journal = () => { if (!G.inGame) return; menu.open = true; G.paused = true; if (document.pointerLockElement) document.exitPointerLock(); journal(() => resume()); };
  pauseEl.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => {
    const n = b.dataset.nav;
    if (n === 'resume') resume();
    if (n === 'journal') { pauseEl.hidden = true; journal(showPause); }
    if (n === 'rewards') { pauseEl.hidden = true; rewards(showPause); }
    if (n === 'settings') { pauseEl.hidden = true; settings(showPause); }
    if (n === 'camera') { G.cycleCamera(); }
    if (n === 'checkpoint') { location.hash = save.part || 'prologue'; location.reload(); }
    if (n === 'quit') { location.hash = ''; location.reload(); }
  }));
  // Losing pointer lock mid-play (Esc) opens the pause menu, like a console game.
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && G.inGame && G.control && !G.paused && !G.input.touch) menu.pause();
  });

  // Deep link from chapter select / restart: #partId
  const hash = location.hash.slice(1);
  if (hash && PARTS.some((p) => p.id === hash) && save.reached.includes(hash)) {
    history.replaceState(null, '', location.pathname);
    home.hidden = true;
    const go = () => { audio.start(); begin(hash); };
    // Audio needs a gesture; start silently and resume audio on first input.
    addEventListener('pointerdown', () => audio.start(), { once: true });
    addEventListener('keydown', () => audio.start(), { once: true });
    setTimeout(go, 50);
  } else showHome();
  return menu;
}
