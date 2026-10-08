// Online play. One player hosts (they play the hero and drive the story); friends join as their own custom
// characters. Players connect directly to each other over WebRTC; the free public PeerJS service only
// introduces them. Public servers take one of a fixed set of slot IDs, so the server browser can find them
// by probing each slot; private servers use a five-letter code.
import * as THREE from 'three';
import Peer from 'peerjs';
import { createHumanoid, createGoliath, createLion, createStaff } from './characters.js';
import { lookToOpts } from './profile.js';
import { createVoice } from './voice.js';

const PREFIX = 'shepherdking-v1-';
export const SLOTS = 12;
const MAX_PLAYERS = 8;
const POSE_KEYS = ['cower', 'cheer', 'pray', 'preach', 'sit', 'reach', 'shove', 'bless', 'kneel', 'ride', 'carry', 'cross', 'fallen', 'aim', 'throw', 'swing', 'lookUp', 'talk'];
const r2 = (v) => Math.round(v * 100) / 100;
/** In the Gospel story, friends play as the disciples (Judas is left to the story). */
export const DISCIPLES = ['Peter', 'John', 'James', 'Andrew', 'Philip', 'Thomas', 'Matthew', 'Bartholomew', 'Thaddaeus', 'Simon the Zealot', 'James son of Alphaeus'];

function peerOptions() {
  let dev = null;
  try { dev = JSON.parse(localStorage.getItem('net-dev') || 'null'); } catch {}
  const config = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  ] };
  return dev ? { ...dev, config } : { config, debug: 0 };
}
const code5 = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
const openPeer = (id) => new Promise((res, rej) => {
  const p = new Peer(id, peerOptions());
  const fail = (e) => { p.destroy(); rej(e); };
  p.once('open', () => { p.off('error', fail); res(p); });
  p.once('error', fail);
});

/** Pose values worth sending (non-zero ones only). */
const packPose = (pose) => { const o = {}; for (const k of POSE_KEYS) { const v = pose?.[k]; if (v) o[k] = r2(v); } return o; };
const applyPose = (pose, o) => { for (const k of POSE_KEYS) pose[k] = o?.[k] || 0; };

/** A floating name above someone's head. */
function nameplate(text, color = '#f6eedc') {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const font = '600 40px "EB Garamond", Georgia, serif';
  g.font = font; const tw = Math.ceil(g.measureText(text).width);
  c.width = Math.max(140, tw + 44); c.height = 64;
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(10,8,6,0.72)'; g.beginPath(); g.roundRect ? g.roundRect(2, 2, c.width - 4, 60, 16) : g.rect(2, 2, c.width - 4, 60); g.fill();
  g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(text, c.width / 2, 34);
  g.fillStyle = color; g.fillText(text, c.width / 2, 34);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  // always drawn on top, so you can pick out your friends in a crowd
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false, transparent: true, fog: false, toneMapped: false }));
  s.userData.aspect = c.width / c.height; s.renderOrder = 10;
  return s;
}

/** A little speaker with sound waves, shown over whoever is talking. */
function speakerIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,8,6,0.7)'; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7dff8a'; g.beginPath(); g.moveTo(14, 26); g.lineTo(22, 26); g.lineTo(32, 16); g.lineTo(32, 48); g.lineTo(22, 38); g.lineTo(14, 38); g.closePath(); g.fill();
  g.strokeStyle = '#7dff8a'; g.lineWidth = 3.5; g.lineCap = 'round';
  [8, 15].forEach((r) => { g.beginPath(); g.arc(34, 32, r, -0.8, 0.8); g.stroke(); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false, transparent: true, fog: false, toneMapped: false }));
  s.scale.set(0.42, 0.42, 1); s.renderOrder = 11; s.visible = false;
  return s;
}
/** A speech bubble for a chat line said out loud nearby. */
function bubble(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.font = '500 34px "EB Garamond", Georgia, serif';
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > 450 && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 2); if (lines.length > 2) shown[1] += '…';
  const w = Math.min(500, Math.max(...shown.map((l) => g.measureText(l).width)) + 36), h = 28 + shown.length * 34;
  g.fillStyle = 'rgba(246,238,220,0.94)'; g.beginPath(); g.roundRect ? g.roundRect(256 - w / 2, 4, w, h, 16) : g.rect(256 - w / 2, 4, w, h); g.fill();
  g.beginPath(); g.moveTo(244, h + 4); g.lineTo(256, h + 18); g.lineTo(268, h + 4); g.fill();
  g.font = '500 34px "EB Garamond", Georgia, serif'; g.fillStyle = '#1d1309'; g.textAlign = 'center'; g.textBaseline = 'middle';
  shown.forEach((l, i) => g.fillText(l, 256, 4 + 14 + 17 + i * 34));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false, transparent: true, fog: false, toneMapped: false }));
  s.scale.set(2.6, 0.65, 1); s.renderOrder = 12;
  return s;
}
const NEAR = 30; // metres: nearby chat reaches this far

export function createNet(G) {
  const { scene, ui, audio, save, V } = G;
  const hud = G.post?.overlay || scene; // drawn sharp, on top of the film grade
  const net = { role: null, code: null, name: '', players: new Map(), peer: null, conns: new Map(), host: null, onChat: null };
  G.net = net;
  net.voice = createVoice(G, net);
  const send = (conn, msg) => { try { if (conn?.open) conn.send(msg); } catch {} };
  const broadcast = (msg, except) => { for (const c of net.conns.values()) if (c !== except) send(c, msg); };

  // ------------------------------------------------------------ Avatars for other players
  const avatars = new Map(); // id -> { h, plate, pos, tgt, facing, tf, speed, pose, isHero }
  net.avatars = avatars;
  net.debug = { makeAvatar: (...a) => makeAvatar(...a), hearChat: (m) => hearChat(m) };
  function makeAvatar(id, info, isHero = false) {
    removeAvatar(id);
    let h;
    if (isHero) h = info.campaign === 'gospel' ? createHumanoid({ skin: 0xb08560, robe: 0xe6dccb, sash: 0x6a4a2a, hair: 0x2e1e14, beard: true, height: 1.75, cape: 0xc8b48c, longHair: true, longRobe: true })
      : createHumanoid({ skin: 0xc4926a, robe: 0xcdb58a, sash: 0x7a3326, hair: 0x6b3a1e, height: 1.68, build: 0.92 });
    else h = createHumanoid(lookToOpts(info.look || {}, info.name));
    if (isHero && info.campaign !== 'gospel') { const st = createStaff(); st.position.set(0, -0.05, 0.05); st.rotation.x = Math.PI / 2 - 0.2; h.rig.handR.add(st); }
    scene.add(h.root);
    const icon = speakerIcon(); hud.add(icon);
    const plate = nameplate(isHero ? (info.campaign === 'gospel' ? (info.auto ? 'Jesus' : `Jesus · ${info.name}`) : `David · ${info.name}`) : info.role && G.campaign === 'gospel' ? `${info.role} · ${info.name}` : info.name || 'Pilgrim', isHero ? '#ffd889' : info.role ? '#e8dcff' : '#f6eedc');
    hud.add(plate);
    const a = { h, plate, icon, pos: V(), tgt: V(), facing: 0, tf: 0, speed: 0, pose: {}, isHero, auto: !!info.auto, name: info.name, role: info.role || null, first: true };
    avatars.set(id, a);
    // the hero as seen by friends uses the realistic model when it is available
    if (isHero && info.campaign === 'gospel' && G.loadHeroModel) G.loadHeroModel().then((m) => { if (m && avatars.get(id) === a) { scene.remove(a.h.root); a.h = m; scene.add(m.root); } });
    return a;
  }
  function removeAvatar(id) { const a = avatars.get(id); if (!a) return; scene.remove(a.h.root); hud.remove(a.plate); hud.remove(a.icon); avatars.delete(id); }
  /** Which voice-chat peer an avatar belongs to. */
  const voiceIdOf = (id) => (id === 'host' || id === 'hostme' ? (net.role === 'guest' ? net.hostId : null) : id);
  const myPos = () => (G.follow || G.player).pos;
  function moveAvatar(id, d) {
    const a = avatars.get(id); if (!a) return;
    a.tgt.set(d[0], d[1], d[2]); a.tf = d[3]; a.speed = d[4]; a.pose = d[5] || {}; a.ride = d[6] || 0;
    if (a.first) { a.pos.copy(a.tgt); a.facing = a.tf; a.first = false; }
  }
  function updateAvatars(dt) {
    for (const [id, a] of avatars) {
      a.pos.lerp(a.tgt, 1 - Math.exp(-dt * 12));
      a.facing = G.lerpAngle(a.facing, a.tf, 1 - Math.exp(-dt * 12));
      a.h.root.position.copy(a.pos); a.h.root.rotation.y = a.facing;
      applyPose(a.h.pose, a.pose);
      a.h.animate(dt, a.speed);
      a.plate.position.copy(a.pos).add(V(0, 2.15 + (a.ride ? 1 : 0), 0));
      const k = Math.min(4, Math.max(1, a.pos.distanceTo(G.camera.position) / 9)); // stays readable far away
      a.plate.scale.set(0.36 * a.plate.userData.aspect * k, 0.36 * k, 1);
      // a friend playing a disciple steps into that disciple during cutscenes
      const inScene = a.role && G.campaign === 'gospel' && G.cine && !G.cine.title;
      a.h.root.visible = !inScene;
      a.plate.visible = (!G.cine || G.cine.net) && !inScene && a.pos.distanceTo(G.camera.position) < 70;
      // the speaker icon: over the leader's disciple rather than over Jesus when Jesus walks by himself
      const vid = voiceIdOf(id);
      const talker = id !== 'host' || !avatars.has('hostme');
      a.icon.visible = !!(vid && talker && net.voice.speaking.get(vid)) && a.plate.visible;
      a.icon.position.copy(a.plate.position).add(V(0, 0.4 * k, 0)); a.icon.scale.setScalar(0.4 * k);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i], p = b.at();
      if (!p || G.t > b.until) { hud.remove(b.s); bubbles.splice(i, 1); continue; }
      const k = Math.min(3, Math.max(1, p.distanceTo(G.camera.position) / 10));
      b.s.position.copy(p).add(V(0, 2.2 + 0.75 * k + b.lift * 0.85 * k, 0)); b.s.scale.set(3.2 * k, 0.8 * k, 1);
      b.s.visible = (!G.cine || G.cine.net) && !(b.key === 'me' && G.camMode === 'first');
    }
  }
  const bubbles = [];
  /** Show a chat line as a bubble over the speaker's head for a few seconds. */
  function say(key, at, text) {
    for (const b of bubbles) if (b.key === key) b.lift++;
    const s = bubble(text); hud.add(s);
    bubbles.push({ s, key, at, until: G.t + 4 + text.length * 0.06, lift: 0 });
    while (bubbles.length > 12) { hud.remove(bubbles[0].s); bubbles.shift(); }
  }

  // ------------------------------------------------------------ HOST
  const spawnLog = new Map(); // netId -> spawn descriptor (so late joiners get everyone)
  net.registerNPC = (n, opts, pos, facing) => {
    if (opts.local) return;
    const data = {};
    for (const k of ['name', 'skin', 'robe', 'sash', 'hair', 'beard', 'headwrap', 'height', 'build', 'armor', 'cape', 'crown', 'female', 'longHair', 'longRobe', 'eyes']) if (opts[k] != null) data[k] = opts[k];
    const d = { t: 'spawn', id: n.netId, o: data, p: [r2(pos.x), r2(pos.y), r2(pos.z)], f: r2(facing) };
    spawnLog.set(n.netId, d);
    if (net.role === 'host') broadcast(d);
  };
  net.unregisterNPC = (n) => { if (!spawnLog.has(n.netId)) return; spawnLog.delete(n.netId); if (net.role === 'host') broadcast({ t: 'despawn', id: n.netId }); };

  net.hostServer = async ({ name, isPublic = true, max = MAX_PLAYERS, code: want = null }) => {
    let peer = null, code = null;
    if (want) { // reopen the same server after a reload; the old ID can take a few seconds to free up
      const id = PREFIX + (/^S\d+$/.test(want) ? 'srv-' + want.slice(1) : 'room-' + want);
      for (let k = 0; k < 15 && !peer; k++) { try { peer = await openPeer(id); code = want; } catch { await new Promise((r) => setTimeout(r, 1500)); } }
      if (!peer) throw new Error('Could not reopen the server.');
    } else if (isPublic) {
      for (let i = 0; i < SLOTS && !peer; i++) { try { peer = await openPeer(PREFIX + 'srv-' + i); code = 'S' + i; } catch (e) { if (!/taken|unavailable-id|ID .* is taken/i.test(String(e?.type || e?.message))) throw e; } }
      if (!peer) throw new Error('All public server slots are busy. Host a private server instead.');
    } else {
      for (let k = 0; k < 5 && !peer; k++) { const c = code5(); try { peer = await openPeer(PREFIX + 'room-' + c); code = c; } catch {} }
      if (!peer) throw new Error('Could not open a private server. Check your connection and try again.');
    }
    Object.assign(net, { role: 'host', peer, code, name, isPublic, max, inGame: !!G.inGame });
    net.me = { id: 'host', name: save.profile?.name || 'Host' };
    net.myRole = null; net.myRole = pickRole(save.profile?.role);
    peer.on('connection', (conn) => {
      if (conn.metadata?.probe) { // the server browser asking who we are
        conn.on('open', () => { send(conn, net.info()); setTimeout(() => conn.close(), 1500); });
        return;
      }
      conn.on('data', (m) => hostReceive(conn, m));
      conn.on('close', () => hostDrop(conn));
      conn.on('error', () => hostDrop(conn));
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch {} });
    net.voice.listen(peer);
    wrapHostUI();
    G.updaters.push(hostTick);
    return code;
  };
  net.info = () => ({ t: 'info', name: net.name, players: net.players.size + 1, max: net.max, campaign: net.partyCampaign || G.campaign, chapter: net.inGame ? (G.chapterTitle?.() || 'In the story') : 'Party lobby', code: net.code, inGame: !!net.inGame });

  function hostReceive(conn, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      if (net.players.size + 1 >= net.max) { send(conn, { t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      const id = conn.peer;
      const info = { id, name: String(m.name || 'Pilgrim').slice(0, 16), look: m.look || {}, role: pickRole(m.role) };
      net.players.set(id, info); net.conns.set(id, conn);
      const P = G.player;
      send(conn, {
        t: 'welcome', hostRole: net.myRole, inGame: !!net.inGame, partyCampaign: net.partyCampaign, hostId: net.peer.id, ids: [...net.players.keys()], campaign: G.campaign, part: G.currentPart?.() || null, host: net.me.name, hostSpawn: [P.pos.x, P.pos.y, P.pos.z],
        players: [...net.players.values()].filter((p) => p.id !== id), spawns: [...spawnLog.values()], time: G.world.time,
        objective: G.objective?.text || '', crosses: !!G.world.crosses?.visible, you: info, hostMe: G.autoHero ? hostMe() : null,
      });
      broadcast({ t: 'join', p: info }, conn);
      if (net.inGame) makeAvatar(id, info);
      ui.toast(`${info.name} joined`, 2600); audio.play('join');
      net.onPlayers?.();
      return;
    }
    const id = conn.peer;
    if (m.t === 'p') { moveAvatar(id, m.d); return; }
    if (m.t === 'ready') { const p = net.players.get(id); if (p) { p.ready = !!m.on; broadcast({ t: 'ready', id, on: p.ready }); net.onPlayers?.(); } return; }
    if (m.t === 'chat') { const text = String(m.text || '').slice(0, 140); const from = net.players.get(id)?.name || '?'; const msg = { t: 'chat', from, text, id, scope: m.scope === 'near' ? 'near' : 'party', p: Array.isArray(m.p) ? m.p.slice(0, 3).map(Number) : null }; hearChat(msg); broadcast(msg, conn); return; }
    if (m.t === 'hit' && G.goliathTarget) { G.goliathTarget.onHit(m.part, {}); return; }
    if (m.t === 'ask') { const p = net.players.get(id); if (p && G.ask) G.ask.answer(p.name, String(m.q || '').slice(0, 140), () => avatars.get(id)?.pos); return; }
    if (m.t === 'role') {
      const p = net.players.get(id); if (!p) return;
      const want = DISCIPLES.includes(m.role) && ![...net.players.values()].some((q) => q !== p && q.role === m.role) ? m.role : p.role;
      if (want !== p.role) { p.role = want; if (net.inGame) { const a = avatars.get(id); makeAvatar(id, p); if (a) { avatars.get(id).pos.copy(a.pos); avatars.get(id).tgt.copy(a.tgt); avatars.get(id).first = false; } } }
      broadcast({ t: 'pinfo', p }); net.onPlayers?.();
    }
  }
  function pickRole(want) {
    const taken = new Set([...net.players.values()].map((p) => p.role));
    if (net.role === 'host' && net.myRole) taken.add(net.myRole);
    return DISCIPLES.includes(want) && !taken.has(want) ? want : DISCIPLES.find((d) => !taken.has(d)) || null;
  }
  /** The disciple a friend plays: hidden while they walk about as themselves, back in place for cutscenes. */
  const discipleOf = (role) => role && G.campaign === 'gospel' && G.disciples?.find((d) => d.name === role);
  function ghostable(n) {
    if (n.ghostable) return; n.ghostable = true;
    let vis = n.root.visible;
    Object.defineProperty(n.root, 'visible', { get: () => vis && !n.ghost, set: (v) => { vis = v; }, configurable: true });
  }
  let wasCine = false;
  function roleTick() {
    if (net.role !== 'host' || !net.inGame) return;
    const cine = !!(G.cine && !G.cine.title);
    const played = new Set();
    for (const p of net.players.values()) {
      const n = discipleOf(p.role), a = avatars.get(p.id); if (!n || !a) continue;
      played.add(n); ghostable(n);
      if (wasCine && !cine) { // the cutscene put the disciple somewhere: bring the friend there
        send(net.conns.get(p.id), { t: 'tp', p: [r2(n.pos.x), r2(n.pos.y), r2(n.pos.z)], f: r2(n.facing) });
        a.pos.copy(n.pos); a.tgt.copy(n.pos); a.hold = 1.2;
      }
      a.hold = Math.max(0, (a.hold || 0) - 1 / 60);
      n.ghost = !cine;
      // while the friend walks about, the hidden disciple stands where they are, so the story finds them there
      if (!cine && !n.target && !a.hold) { n.pos.copy(a.pos); n.facing = a.facing; }
    }
    const F = G.follow, mine = F && discipleOf(net.myRole);
    if (mine) {
      played.add(mine); ghostable(mine);
      if (wasCine && !cine) { F.place(mine.pos, mine.facing); F.hold = 1.2; }
      F.hold = Math.max(0, (F.hold || 0) - 1 / 60);
      mine.ghost = !cine;
      if (!cine && !mine.target && !F.hold) { mine.pos.copy(F.pos); mine.facing = F.facing; }
      G.hideSelf = cine;
    } else if (F && wasCine && !cine && G.hdist(F.pos, G.player.pos) > 60) F.near(G.player);
    for (const d of G.disciples || []) if (d.ghostable && !played.has(d)) d.ghost = false;
    // anyone left far behind (a new chapter, a long cutscene) catches up with the hero
    if (wasCine && !cine) for (const [id, a] of avatars) if (!played.has(discipleOf(net.players.get(id)?.role)) && G.hdist(a.pos, G.player.pos) > 60) {
      const q = G.player.pos.clone().add(V(Math.random() * 4 - 2, 0, 2.5)); send(net.conns.get(id), { t: 'tp', p: [r2(q.x), r2(q.y), r2(q.z)], f: r2(G.player.facing) }); a.pos.copy(q); a.tgt.copy(q);
    }
    wasCine = cine;
  }
  /** Dialogue from a disciple a friend is playing carries their name too. */
  const speaker = (who) => { const p = [...net.players.values()].find((q) => q.role && q.role === who); return p && G.campaign === 'gospel' ? `${who} (${p.name})` : who; };
  function hostDrop(conn) {
    const id = conn.peer; if (!net.players.has(id)) return;
    const name = net.players.get(id).name;
    net.players.delete(id); net.conns.delete(id); removeAvatar(id);
    broadcast({ t: 'leave', id }); net.voice?.drop(id);
    ui.toast(`${name} left`, 2400); audio.play('leave');
    net.onPlayers?.();
  }

  // Mirror what the host sees and hears: subtitles, cards, objectives, toasts, the boss bar, time of day.
  function wrapHostUI() {
    const wrap = (obj, key, make) => { const orig = obj[key].bind(obj); obj[key] = (...a) => { broadcast(make(...a)); return orig(...a); }; };
    const say = ui.say.bind(ui); ui.say = (who, ...rest) => say(speaker(who), ...rest);
    wrap(ui, 'say', (who, line, o = {}) => ({ t: 'say', who: speaker(who), line, ref: o.reference || '' }));
    wrap(ui, 'card', (k, title, text, ms) => ({ t: 'card', k, title, text, ms }));
    wrap(ui, 'objective', (text) => ({ t: 'obj', text }));
    wrap(ui, 'boss', (show, f = 1) => ({ t: 'boss', show, f }));
    wrap(ui, 'cinema', (on) => ({ t: 'cinema', on }));
    const setTime = G.world.setTime; G.world.setTime = (n) => { broadcast({ t: 'time', n }); return setTime(n); };
  }

  let acc = 0;
  function hostTick(dt) {
    acc += dt; if (acc < 1 / 12 || !net.conns.size) return; acc = 0;
    const P = G.player, h = P.h;
    const players = [['host', r2(P.pos.x), r2(P.pos.y), r2(P.pos.z), r2(P.facing), r2(Math.hypot(P.vel.x, P.vel.z)), packPose(h.pose), P.mount ? 1 : 0]];
    const F = G.follow;
    if (F) players.push(['hostme', r2(F.pos.x), r2(F.pos.y), r2(F.pos.z), r2(F.facing), r2(Math.hypot(F.vel.x, F.vel.z)), packPose(F.h.pose), 0]);
    for (const [id, a] of avatars) players.push([id, r2(a.tgt.x), r2(a.tgt.y), r2(a.tgt.z), r2(a.tf), r2(a.speed), a.pose, a.ride || 0]);
    const npcs = [];
    for (const n of G.npcs) {
      if (!spawnLog.has(n.netId)) continue;
      if (G.hdist(n.pos, P.pos) > 90 && !n.target) continue;
      npcs.push([n.netId, r2(n.pos.x), r2(n.pos.y), r2(n.pos.z), r2(n.facing), r2(n.target ? n.walkSpeed : 0), packPose(n.pose), n.root.visible ? 1 : 0]);
    }
    const msg = { t: 's', pl: players, n: npcs, ctl: G.control ? 1 : 0 };
    if (G.cine) msg.cam = [r2(G.camera.position.x), r2(G.camera.position.y), r2(G.camera.position.z), ...G.camLookAt().toArray().map(r2)];
    const gol = G.goliath;
    if (gol) msg.g = [r2(gol.pos.x), r2(gol.pos.y), r2(gol.pos.z), r2(gol.facing), gol.state === 'walk' || gol.state === 'advance' ? 1.3 : 0, packPose(gol.pose), gol.hp ?? 5, gol.fighting ? 1 : 0];
    const lion = G.lion;
    if (lion) msg.l = [r2(lion.pos.x), r2(lion.pos.y), r2(lion.pos.z), r2(lion.facing), lion.state === 'dead' ? 1 : 0];
    if (G.sheep.length) msg.sh = G.sheep.filter((s) => !s.local).slice(0, 24).map((s) => [r2(s.pos.x), r2(s.pos.y), r2(s.pos.z), r2(s.facing)]);
    broadcast(msg);
  }

  // ------------------------------------------------------------ GUEST
  net.listServers = (onFound) => new Promise((res) => {
    const found = [];
    let pending = SLOTS, done = false;
    const finish = () => { if (done) return; done = true; probe.destroy(); res(found); };
    const probe = new Peer(undefined, peerOptions());
    probe.on('error', (e) => { if (e.type === 'peer-unavailable') { if (--pending <= 0) finish(); } });
    probe.on('open', () => {
      for (let i = 0; i < SLOTS; i++) {
        const c = probe.connect(PREFIX + 'srv-' + i, { metadata: { probe: true }, reliable: true });
        c.on('data', (m) => { if (m?.t === 'info') { const s = { ...m, slot: i }; found.push(s); onFound?.(s); } c.close(); if (--pending <= 0) finish(); });
      }
    });
    setTimeout(finish, 6000);
  });

  net.join = (code, profile) => new Promise((res, rej) => {
    const target = /^S\d+$/i.test(code) ? PREFIX + 'srv-' + code.slice(1) : PREFIX + 'room-' + code.toUpperCase();
    const peer = new Peer(undefined, peerOptions());
    let settled = false;
    const fail = (msg) => { if (settled) return; settled = true; peer.destroy(); rej(new Error(msg)); };
    peer.on('error', (e) => fail(e.type === 'peer-unavailable' ? 'No server with that code is running.' : 'Could not connect. Check your connection and try again.'));
    setTimeout(() => fail('The server did not answer in time.'), 12000);
    peer.on('open', () => {
      net.voice.listen(peer);
      const conn = peer.connect(target, { reliable: true });
      conn.on('open', () => send(conn, { t: 'hello', name: profile.name, look: profile.look, role: profile.role }));
      conn.on('data', (m) => {
        if (m?.t === 'full') return fail('That server is full.');
        if (m?.t === 'welcome' && !settled) {
          settled = true; Object.assign(net, { role: 'guest', peer, host: conn, code, hostId: m.hostId, hostName: m.host, hostRole: m.hostRole, inGame: m.inGame, partyCampaign: m.partyCampaign });
          net.me = { id: 'me', name: profile.name }; net.myRole = m.you?.role || null;
          for (const p of m.players) net.players.set(p.id, p);
          setTimeout(() => net.voice.callAll(), 500); // the newcomer calls everyone already here
          res(m);
        }
        else guestReceive(m);
      });
      conn.on('close', () => { if (net.role === 'guest') G.onHostLost?.(); });
    });
  });

  const mirrors = new Map(); // netId -> npc on this guest
  let golV = null, lionV = null, sheepV = [];
  net.startGuest = (welcome, profile) => {
    net.me = { id: 'me', name: profile.name }; net.inGameGuest = true;
    for (const p of welcome.players) makeAvatar(p.id, p);
    makeAvatar('host', { name: welcome.host, campaign: welcome.campaign, auto: !!welcome.hostMe }, true);
    if (welcome.hostMe) makeAvatar('hostme', welcome.hostMe);
    for (const s of welcome.spawns) guestReceive(s);
    if (welcome.time) G.world.setTime(welcome.time);
    if (welcome.objective) ui.objective(welcome.objective);
    if (G.world.crosses) G.world.crosses.visible = !!welcome.crosses;
    G.updaters.push(guestTick);
  };
  function guestReceive(m) {
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'spawn': {
        if (mirrors.has(m.id)) return;
        const n = G.addNPC({ ...m.o, lookAtPlayer: false, local: true, solid: true }, V(...m.p), m.f);
        n.mirror = true; mirrors.set(m.id, n);
        break;
      }
      case 'despawn': { const n = mirrors.get(m.id); if (n) { n.remove(); mirrors.delete(m.id); } break; }
      case 'join': if (net.inGameGuest) makeAvatar(m.p.id, m.p); ui.toast(`${m.p.name} joined`, 2400); net.players.set(m.p.id, m.p); net.onPlayers?.(); break;
      case 'leave': ui.toast(`${net.players.get(m.id)?.name || 'A player'} left`, 2400); removeAvatar(m.id); net.voice?.drop(m.id); net.players.delete(m.id); net.onPlayers?.(); break;
      case 'say': ui.say(m.who, m.line, { reference: m.ref, auto: Math.max(2600, m.line.length * 55) }); break;
      case 'card': ui.card(m.k, m.title, m.text, m.ms); break;
      case 'obj': ui.objective(m.text); break;
      case 'boss': ui.boss(m.show, m.f); if (m.show) G.armGuestSling?.(); break;
      case 'cinema': ui.cinema(m.on); if (!m.on && G.cine?.net) { G.cine = null; G.control = true; } break;
      case 'time': G.world.setTime(m.n); break;
      case 'chat': hearChat(m); break;
      case 's': if (net.inGameGuest) guestState(m); break;
      case 'ready': { const p = net.players.get(m.id); if (p) p.ready = m.on; net.onPlayers?.(); break; }
      case 'start': net.onStart?.(m); break;
      case 'bye': G.onHostLost?.(); break;
      case 'pinfo': {
        if (m.p.id === net.peer?.id) { net.myRole = m.p.role; if (save.profile) { save.profile.role = m.p.role; save.write(); } net.onPlayers?.(); break; }
        const old = net.players.get(m.p.id); net.players.set(m.p.id, { ...old, ...m.p });
        if (net.inGameGuest && avatars.has(m.p.id) && old?.role !== m.p.role) { const a = avatars.get(m.p.id); makeAvatar(m.p.id, m.p); avatars.get(m.p.id).pos.copy(a.pos); avatars.get(m.p.id).first = false; }
        net.onPlayers?.(); break;
      }
      case 'hostme': if (net.inGameGuest) { const old = avatars.get('hostme'); makeAvatar('hostme', m.p); if (old) { avatars.get('hostme').pos.copy(old.pos); avatars.get('hostme').first = false; } const hero = avatars.get('host'); if (hero && m.p.auto && !hero.auto) makeAvatar('host', { name: net.hostName, campaign: G.campaign, auto: true }, true); } break;
      case 'hostrole': net.hostRole = m.role; net.onPlayers?.(); break;
      case 'ans': G.ask?.show(m.who, m.q, { line: m.line, ref: m.ref }); break;
      case 'camp': net.partyCampaign = m.c; net.onPlayers?.(); break;
      case 'tp': G.setPlayer(V(m.p[0], m.p[1], m.p[2]), m.f); G.snapCamera?.(); break;
    }
  }
  function guestState(m) {
    for (const d of m.pl) { if (!avatars.has(d[0])) continue; moveAvatar(d[0], d.slice(1)); }
    for (const d of m.n) {
      const n = mirrors.get(d[0]); if (!n) continue;
      n.netTgt = n.netTgt || V(); n.netTgt.set(d[1], d[2], d[3]); n.netF = d[4]; n.netSpeed = d[5];
      applyPose(n.pose, d[6]); n.root.visible = !!d[7];
    }
    // the host's cutscene camera
    if (m.cam) {
      const pos = V(m.cam[0], m.cam[1], m.cam[2]), look = V(m.cam[3], m.cam[4], m.cam[5]);
      if (!G.cine?.net) { G.cine = { net: true, dur: 1, t: 0, pos: pos.clone(), look: look.clone(), path: () => ({ pos: G.cine.pos, look: G.cine.look }) }; G.control = false; ui.cinema(true); }
      G.cine.pos.lerp(pos, 0.5); G.cine.look.lerp(look, 0.5); G.cine.t = 0;
    } else if (G.cine?.net) { G.cine = null; G.control = true; ui.cinema(false); }
    if (m.g) {
      if (!golV) { golV = createGoliath(); scene.add(golV.root); golV.netPos = V(); golV.root.position.set(m.g[0], m.g[1], m.g[2]); guestGoliathTarget(); }
      golV.netPos.set(m.g[0], m.g[1], m.g[2]); golV.netF = m.g[3]; golV.netSpeed = m.g[4]; applyPose(golV.pose, m.g[5]); golV.hp = m.g[6]; golV.fighting = m.g[7];
      golV.brow.material.opacity = golV.pose.lookUp > 0.5 ? 0.6 : 0;
    }
    if (m.l) {
      if (!lionV) { lionV = createLion(); scene.add(lionV.root); }
      lionV.root.position.set(m.l[0], m.l[1], m.l[2]); lionV.root.rotation.y = m.l[3]; lionV.pose.dead = m.l[4];
    }
    if (m.sh) {
      while (sheepV.length < m.sh.length) { const s = G.addSheep(V(m.sh[sheepV.length][0], 0, m.sh[sheepV.length][2])); s.local = true; s.netMirror = true; sheepV.push(s); }
      m.sh.forEach((d, i) => { const s = sheepV[i]; s.netTgt = V(d[0], d[1], d[2]); s.facing = d[3]; s.target = null; s.home = s.netTgt; });
    }
  }
  // Friends can sling stones at Goliath too; the host applies the hit.
  function guestGoliathTarget() {
    const wp = (o) => o.getWorldPosition(V());
    G.targets.push({
      spheres: () => {
        const S = golV.rig.scale, hips = wp(golV.rig.hips), neck = wp(golV.rig.neck);
        const out = [{ c: wp(golV.brow), r: 0.32, part: 'brow' }, { c: wp(golV.rig.head), r: 0.36, part: 'head' }];
        for (let i = 0; i < 5; i++) out.push({ c: hips.clone().lerp(neck, i / 4), r: 0.42 * S, part: 'body' });
        out.push({ c: wp(golV.shield), r: 0.62, part: 'shield' });
        return out;
      },
      onHit: (part) => { if (golV.fighting) { send(net.host, { t: 'hit', part }); audio.play(part === 'brow' ? 'hit' : 'clang'); } },
    });
  }
  let gacc = 0;
  function guestTick(dt) {
    for (const n of mirrors.values()) if (n.netTgt) { n.pos.lerp(n.netTgt, 1 - Math.exp(-dt * 10)); n.facing = G.lerpAngle(n.facing, n.netF, 1 - Math.exp(-dt * 10)); n.target = null; n.mirrorSpeed = n.netSpeed; }
    if (golV) { golV.root.position.lerp(golV.netPos, 1 - Math.exp(-dt * 10)); golV.root.rotation.y = G.lerpAngle(golV.root.rotation.y, golV.netF, 0.3); golV.animate(dt, golV.netSpeed); }
    if (lionV) lionV.animate(dt, 0);
    for (const s of sheepV) if (s.netTgt) s.pos.lerp(s.netTgt, 1 - Math.exp(-dt * 8));
    gacc += dt; if (gacc < 1 / 15) return; gacc = 0;
    const P = G.player;
    // playing a disciple: during the host's cutscenes the disciple on screen is you
    G.hideSelf = !!(net.myRole && G.campaign === 'gospel' && G.cine?.net);
    send(net.host, { t: 'p', d: [r2(P.pos.x), r2(P.pos.y), r2(P.pos.z), r2(P.facing), r2(Math.hypot(P.vel.x, P.vel.z)), packPose(P.h.pose), P.mount ? 1 : 0] });
  }

  // ------------------------------------------------------------ Chat
  const log = document.createElement('div'); log.id = 'chatlog'; document.body.appendChild(log);
  const box = document.createElement('form'); box.id = 'chatbox'; box.hidden = true;
  box.innerHTML = '<span class="scope"></span><input id="chat-input" maxlength="140" autocomplete="off" placeholder="Say something… (Enter to send · Tab: nearby / party · Esc to close)" />';
  document.body.appendChild(box);
  const input = box.querySelector('input');
  // Text chat is nearby by default in the story: only players within 30 m read it, and it appears over your head.
  net.chatScope = 'near';
  const scopeEl = box.querySelector('.scope');
  const drawScope = () => { const near = net.chatScope === 'near' && G.inGame; scopeEl.textContent = near ? 'Nearby' : 'Party'; scopeEl.className = 'scope ' + (near ? 'near' : 'party'); };
  const avatarFor = (m) => (m.id === 'host' ? (avatars.has('hostme') ? 'hostme' : 'host') : m.id);
  function hearChat(m) {
    const me = myPos();
    if (m.scope === 'near' && G.inGame && m.p && G.hdist({ x: m.p[0], z: m.p[2] }, me) > NEAR) return; // too far away to hear
    showChat(m.from, m.text, m.scope === 'near' && G.inGame);
    const key = avatarFor(m);
    if (G.inGame && avatars.has(key)) say(key, () => avatars.get(key)?.pos, m.text);
  }
  function showChat(from, text, near = false) {
    const line = document.createElement('p'); line.innerHTML = '<b></b> <span></span>';
    if (near) line.classList.add('near');
    line.querySelector('b').textContent = (near ? '(nearby) ' : '') + from + ':'; line.querySelector('span').textContent = text;
    log.appendChild(line); while (log.children.length > 8) log.firstChild.remove();
    setTimeout(() => line.classList.add('old'), 12000);
    audio.play('chat');
    net.onChatLine?.(from, text);
  }
  net.openChat = () => { if (!net.role) return; drawScope(); box.hidden = false; input.value = ''; input.focus(); if (document.pointerLockElement) document.exitPointerLock(); G.chatting = true; };
  const closeChat = () => { box.hidden = true; input.blur(); G.chatting = false; };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') closeChat();
    if (e.key === 'Tab') { e.preventDefault(); net.chatScope = net.chatScope === 'near' ? 'party' : 'near'; drawScope(); }
  });
  input.addEventListener('keyup', (e) => e.stopPropagation());
  box.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 140);
    if (text) net.sendChat(text, net.chatScope);
    closeChat();
  });

  /** Party leader: everyone loads into the chosen story together. */
  net.startParty = (campaign, part) => { net.inGame = true; broadcast({ t: 'start', campaign, part }); };
  net.askHost = (q) => send(net.host, { t: 'ask', q });
  net.broadcastAnswer = (m) => broadcast({ t: 'ans', ...m });
  net.setReady = (on) => send(net.host, { t: 'ready', on });
  net.setCampaign = (c) => { net.partyCampaign = c; broadcast({ t: 'camp', c }); };
  net.chooseRole = (role) => {
    if (net.role !== 'host') return send(net.host, { t: 'role', role });
    if (DISCIPLES.includes(role) && ![...net.players.values()].some((q) => q.role === role)) { net.myRole = role; broadcast({ t: 'hostrole', role }); if (G.autoHero) broadcast({ t: 'hostme', p: hostMe() }); net.onPlayers?.(); }
  };
  /** The leader's own disciple (online in the Gospel, Jesus walks by himself). */
  const hostMe = () => ({ id: 'hostme', name: net.me?.name, look: save.profile?.look || {}, role: net.myRole, auto: !!G.autoHero });
  net.announceHostMe = () => { if (net.role === 'host') broadcast({ t: 'hostme', p: hostMe() }); };
  net.avatarPositions = () => [...avatars.entries()].filter(([id]) => id !== 'host').map(([, a]) => a.pos);
  net.sendChat = (text, scope = 'party') => {
    const near = scope === 'near' && G.inGame, p = myPos(), at = [r2(p.x), r2(p.y), r2(p.z)];
    showChat(net.me?.name || 'Me', text, near);
    if (G.inGame) say('me', () => myPos(), text);
    const msg = { t: 'chat', text, scope: near ? 'near' : 'party', p: at };
    if (net.role === 'host') broadcast({ ...msg, from: net.me.name, id: 'host' }); else send(net.host, msg);
  };
  net.memberList = () => [
    { id: net.role === 'host' ? 'host' : net.hostId, name: net.role === 'host' ? net.me?.name : net.hostName, leader: true, ready: true, role: net.role === 'host' ? net.myRole : net.hostRole, me: net.role === 'host' },
    ...[...net.players.values()].map((p) => ({ id: p.id, name: p.name, ready: !!p.ready, look: p.look, role: p.role })),
    ...(net.role === 'guest' ? [{ id: 'me', name: net.me?.name, me: true, role: net.myRole }] : []),
  ];
  net.playerNames = () => [net.role === 'host' ? `${net.me?.name} (host)` : null, ...[...net.players.values()].map((p) => p.name), net.role === 'guest' ? `${net.me?.name} (you)` : null].filter(Boolean);
  net.leave = () => { try { broadcast({ t: 'bye' }); net.peer?.destroy(); } catch {} net.role = null; };
  addEventListener('beforeunload', () => net.leave());
  net.update = (dt) => { roleTick(); updateAvatars(dt); net.voice.update((id) => (id === net.hostId ? (avatars.get('hostme') || avatars.get('host')) : avatars.get(id))?.pos, myPos()); };
  return net;
}
