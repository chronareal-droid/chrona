// Online menus: the server browser, parties (create or join with a code, ready up, chat, voice), and the
// hand-off that carries everyone from the party screen into the same story.
import { characterCreator, lookToOpts } from './profile.js';
import { createHumanoid } from './characters.js';
import { DISCIPLES } from './net.js';

const CAMPAIGNS = { gospel: { title: 'The Way of the Cross', first: 'entry', hero: 'Jesus' }, david: { title: 'The Shepherd King', first: 'prologue', hero: 'David' } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pending = {
  get: () => { try { return JSON.parse(sessionStorage.getItem('mp') || 'null'); } catch { return null; } },
  set: (v) => { try { v ? sessionStorage.setItem('mp', JSON.stringify(v)) : sessionStorage.removeItem('mp'); } catch {} },
};

export function createLobby(G, menu) {
  const { save, ui, net } = G;
  const L = {};

  // ------------------------------------------------------------ character
  L.editCharacter = (back, then) => {
    menu.openPanel('Your character', '', back);
    const stop = characterCreator(menu.panelBody(), save, (p) => { ui.toast(`Saved · ${p.name}`, 2000); menu.closeAll(); then ? then(p) : back?.(); });
    menu.onPanelClose(stop);
  };
  const needProfile = (next, back) => (save.profile?.name ? next() : L.editCharacter(back, () => next()));

  // ------------------------------------------------------------ the Play Online screen
  L.open = (back) => needProfile(() => render('servers', back), back);
  function render(tab, back) {
    const p = save.profile;
    menu.openPanel('Play Online', `
      <div class="online">
        <div class="me-card"><b>${esc(p.name)}</b><button data-a="edit" class="ghost">Edit character</button></div>
        <nav class="tabs">${[['servers', 'Server browser'], ['party', 'Create a party'], ['code', 'Join with a code']].map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</nav>
        <div class="tab-body"></div>
        <p class="note">Players connect directly to each other. In The Way of the Cross nobody plays Jesus: he walks the story himself and every player follows him as one of the Twelve disciples. In The Shepherd King the leader plays David. Up to 8 players.</p>
      </div>`, back);
    const body = menu.panelBody();
    body.querySelector('[data-a="edit"]').onclick = () => L.editCharacter(() => render(tab, back));
    body.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => render(b.dataset.tab, back)));
    const tb = body.querySelector('.tab-body');
    if (tab === 'servers') servers(tb, back);
    if (tab === 'party') createParty(tb, back);
    if (tab === 'code') joinCode(tb, back);
  }

  function servers(tb, back) {
    tb.innerHTML = `<div class="srv-head"><span>Public servers and parties</span><button data-a="refresh" class="ghost">Refresh</button></div><ul class="servers"><li class="empty">Searching…</li></ul>`;
    const list = tb.querySelector('.servers');
    const row = (s) => `<li><div><b>${esc(s.name)}</b><small>${esc(CAMPAIGNS[s.campaign]?.title || s.campaign)} · ${esc(s.chapter)}</small></div><span class="count">${s.players}/${s.max}</span><button data-join="${esc(s.code)}" ${s.players >= s.max ? 'disabled' : ''}>Join</button></li>`;
    const found = [];
    const draw = () => {
      list.innerHTML = found.length ? found.map(row).join('') : '<li class="empty">No public servers right now. Create a party and invite friends with its code.</li>';
      list.querySelectorAll('[data-join]').forEach((b) => (b.onclick = () => L.join(b.dataset.join, back)));
    };
    net.listServers((s) => { found.push(s); draw(); }).then(draw).catch(() => { list.innerHTML = '<li class="empty">Could not reach the online service. Check your connection.</li>'; });
    tb.querySelector('[data-a="refresh"]').onclick = () => servers(tb, back);
  }

  function createParty(tb, back) {
    const p = save.profile;
    tb.innerHTML = `
      <div class="form">
        <label>Party name<input id="mp-name" maxlength="28" value="${esc(p.name)}’s party" /></label>
        <label>Story<div class="seg" data-k="campaign"><button data-v="gospel" class="on">The Way of the Cross</button><button data-v="david">The Shepherd King</button></div></label>
        <label>Who can join<div class="seg" data-k="vis"><button data-v="public" class="on">Anyone (listed)</button><button data-v="private">Only with the code</button></div></label>
        <button class="primary" data-a="create">Create party</button><em class="err"></em>
      </div>`;
    const st = { campaign: 'gospel', vis: 'public' };
    tb.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { st[b.parentElement.dataset.k] = b.dataset.v; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
    tb.querySelector('#mp-name').addEventListener('keydown', (e) => e.stopPropagation());
    tb.querySelector('[data-a="create"]').onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = 'Opening…';
      try {
        net.partyCampaign = st.campaign;
        await net.hostServer({ name: tb.querySelector('#mp-name').value.trim().slice(0, 28) || `${p.name}’s party`, isPublic: st.vis === 'public' });
        partyRoom(back);
      } catch (err) { tb.querySelector('.err').textContent = err.message; e.target.disabled = false; e.target.textContent = 'Create party'; }
    };
  }

  function joinCode(tb, back) {
    tb.innerHTML = `<div class="form"><label>Code<input id="mp-code" maxlength="5" placeholder="e.g. KQRTA" autocomplete="off" style="text-transform:uppercase" /></label><button class="primary" data-a="join">Join</button><em class="err"></em></div>`;
    const inp = tb.querySelector('#mp-code'); inp.addEventListener('keydown', (e) => e.stopPropagation()); inp.focus();
    tb.querySelector('[data-a="join"]').onclick = () => L.join(inp.value.trim().toUpperCase(), back, tb.querySelector('.err'));
  }

  // ------------------------------------------------------------ joining
  L.join = async (code, back, errEl) => {
    if (!code) return;
    ui.toast('Connecting…', 1800);
    try {
      const welcome = await net.join(code, save.profile);
      if (welcome.inGame) enterGame(welcome, code); else partyRoom(back);
    } catch (e) { if (errEl) errEl.textContent = e.message; else ui.toast(e.message, 4000); }
  };
  /** A guest arriving in a story already under way: reload into the right campaign if needed, then join. */
  function enterGame(welcome, code) {
    if (welcome.campaign !== G.campaign) { pending.set({ mode: 'join', code, at: Date.now() }); net.leave(); location.hash = `${welcome.campaign}.${welcome.part || CAMPAIGNS[welcome.campaign].first}`; location.reload(); return; }
    pending.set(null);
    menu.closeAll();
    G.startAsGuest(welcome, save.profile);
  }
  net.onStart = (m) => { pending.set({ mode: 'join', code: net.code, at: Date.now() }); net.leave(); location.hash = `${m.campaign}.${m.part}`; location.reload(); };

  // ------------------------------------------------------------ the party room
  function partyRoom(back) {
    const leader = net.role === 'host';
    const gospel = () => (net.partyCampaign || 'gospel') === 'gospel';
    menu.openPanel(leader ? `Party · ${esc(net.name)}` : 'Party', `
      <div class="party">
        <div class="code-card"><small>Invite code</small><b>${esc(net.code)}</b><button data-a="copy" class="ghost">Copy</button></div>
        <div class="party-grid">
          <ul class="members"></ul>
          <div class="party-side">
            <div class="story-pick">${leader ? `<small>Story</small><div class="seg" data-k="campaign">${Object.entries(CAMPAIGNS).map(([k, c]) => `<button data-v="${k}" class="${(net.partyCampaign || 'gospel') === k ? 'on' : ''}">${c.title}</button>`).join('')}</div>` : `<small>Story</small><b>${esc(CAMPAIGNS[net.partyCampaign]?.title || 'Chosen by the leader')}</b>`}</div>
            ${'<div class="role-pick"><small>Your disciple · in The Way of the Cross you walk with Jesus as one of the Twelve</small><div class="roles"></div></div>'}
            <div class="voice-row"><button data-a="voice" class="ghost">${net.voice.enabled ? 'Voice on' : 'Turn on voice chat'}</button><label class="mic"><input type="checkbox" id="mp-open" ${net.voice.openMic ? 'checked' : ''}/> Open mic (otherwise hold B to talk)</label></div>
            <div class="voice-row"><small>Hear others</small><div class="seg" data-k="vmode"><button data-v="proximity" class="${net.voice.mode !== 'party' ? 'on' : ''}">Proximity (nearby, from where they stand)</button><button data-v="party" class="${net.voice.mode === 'party' ? 'on' : ''}">Whole party, full volume</button></div></div>
            <form class="party-chat"><div class="lines"></div><input maxlength="140" placeholder="Message the party…" autocomplete="off" /></form>
            ${leader ? '<button class="primary" data-a="start">Start the story</button>' : `<button class="primary" data-a="ready">${'Ready'}</button>`}
          </div>
        </div>
      </div>`, () => { net.leave(); back?.(); });
    const body = menu.panelBody();
    const drawMembers = () => {
      body.querySelector('.members').innerHTML = net.memberList().map((m) => `<li class="${m.me ? 'me' : ''}"><span class="talk ${net.voice.speaking.get(m.id) ? 'on' : ''}"></span><b>${esc(m.name)}</b>${gospel() && m.role ? `<i class="role">${esc(m.role)}</i>` : ''}${m.leader ? `<em>Leader${gospel() ? '' : ' · plays David'}</em>` : m.ready ? '<em class="ok">Ready</em>' : '<em>Not ready</em>'}${!m.me && !m.leader ? `<button data-mute="${esc(m.id)}" class="ghost small">${net.voice.muted.has(m.id) ? 'Unmute' : 'Mute'}</button>` : ''}</li>`).join('');
      body.querySelectorAll('[data-mute]').forEach((b) => (b.onclick = () => { net.voice.mute(b.dataset.mute, !net.voice.muted.has(b.dataset.mute)); drawMembers(); }));
    };
    const drawRoles = () => {
      const sb = body.querySelector('.story-pick b'); if (sb) sb.textContent = CAMPAIGNS[net.partyCampaign]?.title || 'Chosen by the leader';
      const el = body.querySelector('.role-pick'); if (!el) return;
      el.hidden = !gospel();
      const taken = new Set(net.memberList().filter((m) => !m.me).map((m) => m.role));
      el.querySelector('.roles').innerHTML = DISCIPLES.map((d) => `<button data-role="${esc(d)}" class="${net.myRole === d ? 'on' : ''}" ${taken.has(d) ? 'disabled' : ''}>${esc(d)}</button>`).join('');
      el.querySelectorAll('[data-role]').forEach((b) => (b.onclick = () => { save.profile.role = b.dataset.role; save.write(); net.chooseRole(b.dataset.role); }));
    };
    net.onPlayers = () => { drawMembers(); drawRoles(); }; drawMembers(); drawRoles();
    const speakTimer = setInterval(drawMembers, 600); menu.onPanelClose(() => clearInterval(speakTimer));
    body.querySelector('[data-a="copy"]').onclick = () => navigator.clipboard?.writeText(net.code).then(() => ui.toast('Code copied', 1500)).catch(() => {});
    body.querySelectorAll('.story-pick .seg button').forEach((b) => (b.onclick = () => { net.setCampaign(b.dataset.v); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); drawMembers(); }));
    body.querySelector('[data-a="voice"]').onclick = async (e) => { const ok = await net.voice.enable(); e.target.textContent = ok ? 'Voice on' : 'Listening only (no mic)'; };
    body.querySelector('#mp-open').onchange = (e) => net.voice.setOpenMic(e.target.checked);
    body.querySelectorAll('[data-k="vmode"] button').forEach((b) => (b.onclick = () => { net.voice.setMode(b.dataset.v); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
    const chatForm = body.querySelector('.party-chat'), chatIn = chatForm.querySelector('input');
    chatIn.addEventListener('keydown', (e) => e.stopPropagation());
    chatForm.onsubmit = (e) => { e.preventDefault(); const t = chatIn.value.trim(); if (t) net.sendChat(t); chatIn.value = ''; };
    net.onChatLine = (from, text) => { const l = document.createElement('p'); l.innerHTML = '<b></b> <span></span>'; l.querySelector('b').textContent = from + ':'; l.querySelector('span').textContent = text; chatForm.querySelector('.lines').appendChild(l); };
    if (leader) body.querySelector('[data-a="start"]').onclick = () => L.startParty(net.partyCampaign || 'gospel');
    else body.querySelector('[data-a="ready"]').onclick = (e) => { const on = !e.target.classList.contains('on'); e.target.classList.toggle('on', on); e.target.textContent = on ? 'Ready ✓' : 'Ready'; net.setReady(on); };
  }

  /** Leader presses Start: friends reload into the story and rejoin; the leader begins as the hero. */
  L.startParty = (campaign) => {
    const part = CAMPAIGNS[campaign].first;
    net.startParty(campaign, part);
    if (campaign !== G.campaign) { // the world must be rebuilt for the other story: reopen the same server after reloading
      pending.set({ mode: 'host', code: net.code, name: net.name, isPublic: net.isPublic, campaign, at: Date.now() });
      setTimeout(() => { net.peer?.destroy(); location.hash = `${campaign}.${part}`; location.reload(); }, 400);
      return;
    }
    menu.closeAll();
    menu.begin(part);
  };

  // ------------------------------------------------------------ after a reload
  /** Returns true when this page load is part of an online hand-off (so the title screen should not show). */
  L.resume = () => {
    const p = pending.get();
    if (!p || Date.now() - p.at > 600000) { pending.set(null); return false; }
    if (p.mode === 'host') {
      pending.set(null);
      net.partyCampaign = p.campaign; G.onlineHost = true;
      net.hostServer({ name: p.name, isPublic: p.isPublic, code: p.code }).then(() => { net.inGame = true; ui.toast(`Server open · code ${p.code}`, 4000); }).catch((e) => ui.toast(e.message, 5000));
      return false; // the normal deep-link start begins the story as the hero
    }
    // a guest: keep trying to rejoin while the leader's server comes back
    menu.hideHome();
    ui.card('Joining your party', 'Connecting…', '', 2500);
    let tries = 0;
    const attempt = () => net.join(p.code, save.profile).then((w) => { pending.set(null); if (w.inGame) G.startAsGuest(w, save.profile); else { menu.showHome(); partyRoom(() => menu.showHome()); } })
      .catch(() => { if (++tries < 60) setTimeout(attempt, 3000); else { pending.set(null); ui.toast('Could not rejoin the party.', 4000); menu.showHome(); } });
    attempt();
    return true;
  };

  // ------------------------------------------------------------ in game: who is here (hold L)
  const listEl = document.createElement('div'); listEl.id = 'playerlist'; listEl.hidden = true; document.body.appendChild(listEl);
  G.playerList = (show) => {
    if (!net.role) return;
    listEl.hidden = !show;
    if (show) listEl.innerHTML = `<h4>${esc(net.name || 'Party')} · code ${esc(net.code)}</h4>` + net.memberList().map((m) => `<p><span class="talk ${net.voice.speaking.get(m.id) ? 'on' : ''}"></span>${esc(m.name)}${m.leader ? ` · ${CAMPAIGNS[G.campaign]?.hero}` : G.campaign === 'gospel' && m.role ? ` · ${esc(m.role)}` : ''}</p>`).join('') + `<small>T chat (Tab: nearby / party) · B push-to-talk · J ask Jesus · L players · voice: ${net.voice.mode === 'party' ? 'whole party' : 'proximity'}</small>`;
  };
  return L;
}

/** Turn this player into their custom character and follow the host's story as a guest. */
export function installGuest(G) {
  G.startAsGuest = (welcome, profile) => {
    const { ui, net, V } = G;
    G.inGame = true; G.control = true; G.cine = null; ui.cinema(false); ui.showHUD(true);
    document.body.classList.add('online');
    G.heroName = profile.name;
    G.setHeroModel(createHumanoid(lookToOpts(profile.look, profile.name)));
    G.flags.anointed = true;
    G.ui.stones(0, false);
    const [x, y, z] = welcome.hostSpawn || [0, 0, 0];
    G.setPlayer(V(x + 2, 0, z + 2), 0);
    net.startGuest(welcome, profile);
    setTimeout(() => net.voice.restore(), 1200);
    G.armGuestSling = () => { // friends can help against Goliath
      if (G.player.slingUnlocked) return;
      G.setSling(true); G.player.stones = 5; ui.stones(5, true);
      ui.hint('Help bring down Goliath: hold right mouse (or F) to whirl your sling, click to release.', 6000);
      G.updaters.push(() => { if (G.player.stones < 2 && Math.random() < 0.004) { G.player.stones++; ui.stones(G.player.stones, true); } });
    };
    G.onHostLost = () => { ui.card('', 'The host has left', 'Returning to the title screen…', 2600); setTimeout(() => { location.hash = ''; location.reload(); }, 3000); };
    ui.toast(`Joined ${welcome.host}'s story`, 3000, true);
    setTimeout(() => ui.hint(G.campaign === 'gospel' ? 'Follow Jesus through the story · T chat · hold B to talk · hold J to ask Jesus a question · L players' : 'Follow David · T chat · hold B to talk · L players', 9000), 6500);
    if (G.campaign === 'gospel' && net.myRole) setTimeout(() => ui.card('You walk with Jesus', net.myRole, `${profile.name}, you are ${net.myRole}, one of the Twelve. Follow the Master; in each scene you take your place among the disciples.`, 5200), 1200);
  };
}
