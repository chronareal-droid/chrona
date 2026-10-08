// Home screen, pause menu, and the shared panels (chapters, scrolls & rewards, journal, settings, controls).
import { REWARDS } from './systems.js';
import { GOSPEL_PARTS } from './gospel.js';
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
  const C = G.campaign;
  const slot = (c) => (c === 'gospel' ? save.gospel : save);
  const partsOf = (c) => (c === 'gospel' ? GOSPEL_PARTS : PARTS);
  // Switching campaign rebuilds the world, so it goes through a reload with a deep link.
  const go = (c, part) => {
    if (c === C) return begin(part);
    location.hash = `${c}.${part}`; location.reload();
  };
  if (C === 'gospel') {
    document.querySelector('#home .brand small').textContent = 'The Passion of Jesus, from the Gospels';
    document.querySelector('#home .brand h1').innerHTML = 'The Way of<br />the Cross';
    document.querySelector('#home .brand .sub').textContent = 'Jerusalem · the week of the Passover';
    document.querySelector('#home .tagline').textContent = '“Greater love has no one than this, that someone lay down his life for his friends.” John 15:13';
    document.title = 'The Way of the Cross';
  }
  const home = $('#home'), pauseEl = $('#pause'), panel = $('#panel');
  const body = panel.querySelector('.panel-body'), head = panel.querySelector('h2');
  let panelBack = null;
  audio.vol = save.settings.volume; audio.musicVol = save.settings.musicVolume ?? 0.8; audio.sfxVol = save.settings.sfxVolume ?? 1;

  const contBtn = home.querySelector('[data-nav="continue"]');
  const lastC = save.lastCampaign || 'gospel';
  const lastPart = slot(lastC).part;
  contBtn.hidden = !lastPart;
  if (lastPart) contBtn.textContent = `Continue · ${partsOf(lastC).find((p) => p.id === lastPart)?.title || ''}`;
  const newBtn = home.querySelector('[data-nav="new"]');
  newBtn.textContent = 'The Way of the Cross';
  const davidBtn = document.createElement('button');
  davidBtn.dataset.nav = 'david'; davidBtn.textContent = 'Old Testament · The Shepherd King';
  newBtn.after(davidBtn);
  const onlineBtn = document.createElement('button');
  onlineBtn.dataset.nav = 'online'; onlineBtn.className = 'online-btn'; onlineBtn.textContent = 'Play Online · with friends';
  davidBtn.after(onlineBtn);
  const charBtn = document.createElement('button');
  charBtn.dataset.nav = 'character'; charBtn.textContent = save.profile?.name ? `Your Character · ${save.profile.name}` : 'Create Your Character';
  onlineBtn.after(charBtn);

  let closers = [];
  const runClosers = () => { const c = closers; closers = []; c.forEach((f) => { try { f(); } catch {} }); };
  const openPanel = (title, html, back) => {
    runClosers();
    head.textContent = title; body.innerHTML = html; panel.hidden = false; panelBack = back;
    panel.querySelector('.close').focus();
    audio.ui?.('open');
  };
  const closePanel = () => { runClosers(); panel.hidden = true; const b = panelBack; panelBack = null; b?.(); };
  panel.querySelector('.close').onclick = closePanel;
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && !panel.hidden) { e.stopPropagation(); closePanel(); } }, true);

  const begin = (part) => { home.hidden = true; G.menuOpen = false; save.lastCampaign = C; save.write(); start(part); };

  // ---------- Panels
  const chapters = (back) => {
    const list = (c) => partsOf(c).map((p) => `
      <button class="chapter" data-c="${c}" data-part="${p.id}" ${slot(c).reached.includes(p.id) ? '' : 'disabled'}>
        <small>${p.n}</small><b>${p.title}</b><span>${slot(c).reached.includes(p.id) ? p.blurb : 'Not yet reached'}</span></button>`).join('');
    openPanel('Chapters', `<h3 class="ch-h">The Way of the Cross</h3><div class="chapters">${list('gospel')}
      <button class="chapter" disabled><small>Next</small><b>Pentecost</b><span>Coming later</span></button></div>
      <h3 class="ch-h">Old Testament · The Shepherd King</h3><div class="chapters">${list('david')}
      <button class="chapter" disabled><small>Chapter II</small><b>The Fugitive</b><span>Coming later</span></button></div>`, back);
    body.querySelectorAll('[data-part]').forEach((b) => (b.onclick = () => {
      panel.hidden = true;
      if (G.inGame || b.dataset.c !== C) { location.hash = `${b.dataset.c}.${b.dataset.part}`; location.reload(); } else begin(b.dataset.part);
    }));
  };
  const rewards = (back) => {
    const SCR = G.systems.scrollSet, n = G.systems.myScrolls().length;
    openPanel('Scrolls & Rewards', `
      <p class="progress-line">${n} of ${SCR.length} scrolls found · Faith ${save.faith}${C === 'david' ? ` · Israel’s courage ${save.courage}%` : ''}</p>
      <div class="scrolls">${SCR.map((s, i) => save.scrolls.includes(s.id)
        ? `<div class="scroll-tile got">“${s.text}”<cite>${s.ref}</cite></div>`
        : `<div class="scroll-tile locked">${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i]}</div>`).join('')}</div>
      <ul class="rewards">${REWARDS.map((r) => `<li class="${n >= r.need ? 'on' : 'off'}"><b>${n >= r.need ? '✦' : `${r.need}`}</b><div><strong>${r.name}</strong><br/>${r.desc}</div></li>`).join('')}
        <li class="${(C === 'gospel' ? save.gospel.quests : save.quests).lostSheep === 'done' ? 'on' : 'off'}"><b>${(C === 'gospel' ? save.gospel.quests : save.quests).lostSheep === 'done' ? '✦' : 'Quest'}</b><div><strong>Shepherd’s Cloak</strong><br/>Complete “The Lost Sheep”. Take 20% less harm.</div></li>
      </ul>`, back);
  };
  const journal = (back) => {
    const defs = G.systems.questDefs, Q = C === 'gospel' ? save.gospel.quests : save.quests;
    const state = (id) => Q[id] === 'done' ? 'Complete' : Q[id] ? 'In progress' : 'Not started. Find them in ' + defs[id].where;
    openPanel('Journal', `<div class="journal">
      <h3>Main story</h3><div class="q"><b>${partsOf(C).find((p) => p.id === slot(C).part)?.title || partsOf(C)[0].title}</b><br/>${G.objective?.text || $('.obj-text').textContent || '-'}</div>
      <h3>Side quests</h3>${Object.entries(defs).map(([id, d]) => `<div class="q ${Q[id] === 'done' ? 'done' : ''}"><b>${d.title}</b> · <small>${state(id)}</small><br/>${d.desc}<em>Reward: ${d.reward}</em></div>`).join('')}
      ${C === 'gospel'
        ? `<h3>Teaching &amp; healing</h3><div class="q">In the temple courts the people, scribes and Pharisees bring their questions. Answer as Jesus answered, then speak with conviction. Pray with the sick to heal them.</div>
      <h3>The Holy Spirit</h3><div class="q">“The Spirit of the Lord is upon me.” The Spirit gathers as you pray at stone altars, teach, heal, find scrolls and show kindness. Press <kbd>Q</kbd> when it shines: time slows and scrolls glow brighter.</div>`
        : `<h3>Preaching</h3><div class="q">Frightened soldiers huddle in the camp of Israel. Speak the truth to them (choose the answer that honours the LORD, not your own pride) and time your words with conviction. Israel’s courage: <b>${save.courage}%</b></div>
      <h3>The Holy Spirit</h3><div class="q">After your anointing, the Spirit gathers as you pray at stone altars, preach, find scrolls and show kindness. Press <kbd>Q</kbd> when it shines: time slows, wounds mend, and your sling flies true.</div>`}
    </div>`, back);
  };
  const settings = (back) => {
    const st = save.settings;
    openPanel('Settings', `<div class="settings">
      <label>Graphics quality<div class="seg" data-k="quality">${Object.entries(PRESETS).map(([k, p]) => `<button data-v="${k}" class="${st.quality === k ? 'on' : ''}">${p.label}</button>`).join('')}</div></label>
      <p class="note">Ultra renders at native 4K on 4K displays, with ambient occlusion, 4096 px shadows, bloom and SMAA. Use High on laptops and Medium on phones.</p>
      <label>Difficulty<div class="seg" data-k="difficulty">${['easy', 'normal', 'hard'].map((d) => `<button data-v="${d}" class="${(st.difficulty || 'normal') === d ? 'on' : ''}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div></label>
      <p class="note">Sets how much harm you take, how long Goliath stays open, and how fast the conviction bar moves.</p>
      <label>Show FPS<div class="seg" data-k="showFps"><button data-v="false" class="${!st.showFps ? 'on' : ''}">Off</button><button data-v="true" class="${st.showFps ? 'on' : ''}">On</button></div></label>
      <label>Camera view<div class="seg" data-k="camMode"><button data-v="third" class="${G.camMode === 'third' ? 'on' : ''}">Third person</button><button data-v="first" class="${G.camMode === 'first' ? 'on' : ''}">First person</button><button data-v="second" class="${G.camMode === 'second' ? 'on' : ''}">Second person</button></div></label>
      <p class="note">Second person is the Witness view: you see David through the eyes of someone walking ahead of him. Press V in play to cycle views.</p>
      <label>Master volume<input type="range" min="0" max="1" step="0.05" value="${st.volume}" data-r="volume" /></label>
      <label>Music<input type="range" min="0" max="1" step="0.05" value="${st.musicVolume ?? 0.8}" data-r="musicVolume" /></label>
      <label>Sound effects &amp; ambience<input type="range" min="0" max="1.5" step="0.05" value="${st.sfxVolume ?? 1}" data-r="sfxVolume" /></label>
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
      if (k === 'showFps') G.stats?.show(v);
    }));
    body.querySelectorAll('[data-r]').forEach((r) => (r.oninput = () => {
      st[r.dataset.r] = parseFloat(r.value); save.write();
      if (r.dataset.r === 'volume') audio.volume(st.volume);
      if (r.dataset.r === 'musicVolume') audio.setMusicVolume(st.musicVolume);
      if (r.dataset.r === 'sfxVolume') { audio.setSfxVolume(st.sfxVolume); audio.play('pickup'); }
    }));
    body.querySelector('[data-reset]').onclick = (e) => {
      if (e.target.dataset.armed) { save.reset(); location.hash = ''; location.reload(); }
      e.target.dataset.armed = 1; e.target.textContent = 'Click again to confirm';
    };
  };
  const chooseDifficulty = (onPick, back) => {
    const cur = save.settings.difficulty || 'normal';
    const info = {
      easy: 'For the story. You take half the harm, Goliath stays open far longer, and the conviction bar moves slowly with a wide target.',
      normal: 'The intended balance of story and challenge.',
      hard: 'You take more harm and heal slowly. Goliath is quicker and opens only briefly. The conviction bar is fast with a narrow target.',
    };
    openPanel('Choose your difficulty', `<div class="chapters">${['easy', 'normal', 'hard'].map((d) => `
      <button class="chapter${d === cur ? ' current' : ''}" data-d="${d}"><small>${d === cur ? 'Last used' : '&nbsp;'}</small><b>${d[0].toUpperCase() + d.slice(1)}</b><span>${info[d]}</span></button>`).join('')}</div>
      <p class="note" style="opacity:.6;margin-top:1rem">You can change this any time in Settings.</p>`, back);
    body.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { save.settings.difficulty = b.dataset.d; save.write(); panelBack = null; panel.hidden = true; onPick(); }));
  };
  const controls = (back) => openPanel('Controls', `<div class="ctl-list">
      <kbd>W A S D</kbd><span>Move (in Witness view: A/D turn)</span><kbd>Mouse</kbd><span>Look (click the game to capture the mouse)</span>
      <kbd>Shift</kbd><span>Run / gallop</span><kbd>Space</kbd><span>Jump · advance dialogue</span><kbd>C</kbd><span>Roll (dodge)</span>
      <kbd>E</kbd><span>Talk · ride · pray · preach · pick up</span><kbd>Left click</kbd><span>Strike with staff / release sling</span>
      <kbd>Right mouse / F</kbd><span>Whirl the sling (aim)</span><kbd>Q</kbd><span>Call upon the Holy Spirit</span>
      <kbd>V</kbd><span>Camera: third → first → second person</span><kbd>Tab</kbd><span>Journal</span><kbd>Esc / P</kbd><span>Pause</span>
      <kbd>1 2 3</kbd><span>Choose a reply</span>
      <kbd>T</kbd><span>Online: chat with your party</span><kbd>B</kbd><span>Online: hold to talk (voice chat)</span>
      <kbd>J</kbd><span>Online: hold and ask Jesus a question out loud</span><kbd>L</kbd><span>Online: who is playing</span></div>`, back);

  // ---------- Home
  const showHome = () => { home.hidden = false; G.menuOpen = true; };
  home.querySelectorAll('.mainnav [data-nav]').forEach((b) => (b.onclick = () => {
    audio.start(); audio.volume(save.settings.volume); audio.ui?.('click');
    if (!G.inGame) audio.music('calm');
    const n = b.dataset.nav;
    if (n === 'online') { home.hidden = true; G.lobby.open(showHome); }
    if (n === 'character') { home.hidden = true; G.lobby.editCharacter(() => { charBtn.textContent = save.profile?.name ? `Your Character · ${save.profile.name}` : 'Create Your Character'; showHome(); }); }
    if (n === 'continue') go(lastC, lastPart);
    if (n === 'new') { home.hidden = true; chooseDifficulty(() => { save.gospel.part = null; save.write(); go('gospel', 'entry'); }, showHome); }
    if (n === 'david') { home.hidden = true; chooseDifficulty(() => { save.part = null; save.write(); go('david', 'prologue'); }, showHome); }
    if (n === 'chapters') { home.hidden = true; chapters(showHome); }
    if (n === 'rewards') { home.hidden = true; rewards(showHome); }
    if (n === 'settings') { home.hidden = true; settings(showHome); }
    if (n === 'controls') { home.hidden = true; controls(showHome); }
  }));

  // ---------- Pause
  const menu = {
    open: false, openPanel, begin, showHome,
    panelBody: () => body,
    onPanelClose: (f) => closers.push(f),
    hideHome: () => { home.hidden = true; G.menuOpen = false; },
    closeAll: () => { runClosers(); panelBack = null; panel.hidden = true; home.hidden = true; G.menuOpen = false; },
  };
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
    if (n === 'checkpoint') { location.hash = `${C}.${slot(C).part || partsOf(C)[0].id}`; location.reload(); }
    if (n === 'quit') { location.hash = ''; location.reload(); }
  }));
  // Losing pointer lock mid-play (Esc) opens the pause menu, like a console game.
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && G.inGame && G.control && !G.paused && !G.input.touch) menu.pause();
  });

  // Deep link from chapter select / restart: #partId
  menu.boot = () => {
  if (G.lobby?.resume()) { history.replaceState(null, '', location.pathname); return; }
  const hash = location.hash.slice(1).split('.')[1];
  if (hash && partsOf(C).some((p) => p.id === hash) && slot(C).reached.includes(hash)) {
    history.replaceState(null, '', location.pathname);
    home.hidden = true;
    const go = () => { audio.start(); begin(hash); };
    // Audio needs a gesture; start silently and resume audio on first input.
    addEventListener('pointerdown', () => audio.start(), { once: true });
    addEventListener('keydown', () => audio.start(), { once: true });
    setTimeout(go, 50);
  } else showHome();
  };
  return menu;
}
