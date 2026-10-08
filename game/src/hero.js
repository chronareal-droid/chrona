// Online, in The Way of the Cross, nobody plays Jesus: he walks the story himself and every player, the
// party leader included, follows him as one of the Twelve.
//  - createFollower: the leader's own disciple body (the camera and controls move to it).
//  - createAutopilot: drives Jesus through each chapter by steering him toward the objective and doing
//    what it asks (riding the colt, overturning tables, teaching, healing, praying, carrying the cross).
import { createHumanoid } from './characters.js';
import { lookToOpts } from './profile.js';

export function createFollower(G, profile) {
  const { V, input, scene, world, audio } = G;
  const h = createHumanoid(lookToOpts(profile.look || {}, profile.name));
  scene.add(h.root);
  const F = { h, pos: V(), vel: V(), facing: 0, onGround: true, mount: null, stepT: 0, name: profile.name };
  const resolveCircle = (p, x, z, r) => { const dx = p.x - x, dz = p.z - z, d2 = dx * dx + dz * dz; if (d2 < r * r && d2 > 1e-6) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; } };
  F.place = (pos, facing = F.facing) => { F.pos.copy(pos); G.ground(F.pos); F.vel.set(0, 0, 0); F.facing = facing; h.root.position.copy(F.pos); };
  /** Keep the leader with Jesus when a chapter moves him far away. */
  F.near = (P) => { const back = P.facing + Math.PI + (Math.random() - 0.5); F.place(P.pos.clone().add(V(Math.sin(back) * 3, 0, Math.cos(back) * 3)), P.facing); };
  F.update = (dt) => {
    const ctl = G.control && !G.chatting;
    const yaw = G.cam.yaw;
    const fwd = V(-Math.sin(yaw), 0, -Math.cos(yaw)), right = V(Math.cos(yaw), 0, -Math.sin(yaw));
    const wish = V();
    if (ctl) wish.addScaledVector(fwd, input.moveY).addScaledVector(right, input.moveX);
    const amt = Math.min(1, wish.length()); if (amt > 0.01) wish.normalize();
    const speed = (input.sprint ? 6.6 : 3.3) * amt;
    const k = 1 - Math.exp(-dt * (F.onGround ? 12 : 2.5));
    F.vel.x += (wish.x * speed - F.vel.x) * k; F.vel.z += (wish.z * speed - F.vel.z) * k;
    if (ctl && input.pressed.has('jump') && F.onGround) { F.vel.y = 5.2; F.onGround = false; }
    F.vel.y -= 16 * dt;
    F.pos.addScaledVector(F.vel, dt);
    for (const c of world.colliders) resolveCircle(F.pos, c.x, c.z, c.r + 0.35);
    G.resolveWalls(F.pos, 0.32);
    for (const n of G.npcs) if (n.solid !== false && n.root.visible && !n.ghost) resolveCircle(F.pos, n.pos.x, n.pos.z, (n.radius || 0.4) + 0.35);
    if (G.player.h.root.visible) resolveCircle(F.pos, G.player.pos.x, G.player.pos.z, 0.75);
    const gy = G.ground(V(F.pos.x, 0, F.pos.z)).y;
    if (F.pos.y <= gy + (F.onGround ? 0.3 : 0)) { F.pos.y = gy; F.vel.y = Math.max(0, F.vel.y); F.onGround = true; }
    const hs = Math.hypot(F.vel.x, F.vel.z);
    const want = G.camMode === 'first' ? yaw + Math.PI : hs > 0.3 ? Math.atan2(F.vel.x, F.vel.z) : F.facing;
    F.facing = G.lerpAngle(F.facing, want, 1 - Math.exp(-dt * (G.camMode === 'first' ? 25 : 10)));
    if (F.onGround && hs > 1) { F.stepT -= dt * hs; if (F.stepT < 0) { F.stepT = 2.1; audio.play('step'); } }
    h.root.position.copy(F.pos); h.root.rotation.y = F.facing;
    h.animate(dt, hs);
  };
  return F;
}

export function createAutopilot(G) {
  const { V, input } = G;
  const A = { busyUntil: 0, stuckT: 0, detour: 0, detourT: 0, lastPos: null, checkT: 0 };
  const targetOf = () => { const o = G.objective; const t = o && (typeof o.target === 'function' ? o.target() : o.target); return t ? V(t.x, 0, t.z) : null; };
  const posOf = (it) => (typeof it.pos === 'function' ? it.pos() : it.pos);
  /** The nearest player: Jesus waits when everyone has fallen far behind. */
  const nearestFriend = () => {
    const P = G.player; let best = Infinity;
    if (G.follow) best = G.hdist(G.follow.pos, P.pos);
    for (const p of G.net?.avatarPositions?.() || []) best = Math.min(best, G.hdist(p, P.pos));
    return best;
  };
  A.drive = (dt) => {
    const P = G.player;
    const tgt = targetOf();
    const wish = V();
    let sprint = false;
    if (G.control && !G.interactBusy && !P.dead && !(G.t < (A.pauseUntil || 0))) {
      // do what the scene asks once he is there
      const best = G.best;
      if (best && G.t > A.busyUntil && !P.mount) {
        const bp = posOf(best);
        if (best.auto || (tgt && bp && G.hdist(bp, tgt) < 4)) { A.busyUntil = G.t + 1.5; G.interact(best); }
      }
      if (tgt) {
        const d = G.hdist(P.pos, tgt);
        const lag = nearestFriend();
        if (d > 1.4 && lag < 26) {
          wish.subVectors(tgt, P.pos).setY(0).normalize();
          sprint = d > 24 && lag < 10 && !G.carrySpeed;
          // stuck against a wall or a crowd: try going around
          A.checkT += dt;
          if (A.checkT > 1) {
            A.checkT = 0;
            const moved = A.lastPos ? G.hdist(A.lastPos, P.pos) : 9;
            A.lastPos = P.pos.clone();
            if (moved < 0.5) { A.stuckT += 1; A.detour = (A.stuckT % 2 ? 1 : -1) * (0.9 + Math.min(1, A.stuckT * 0.15)); A.detourT = 1.4; } else A.stuckT = 0;
            if (A.stuckT > 7) { P.pos.addScaledVector(wish, 2.5); G.ground(P.pos); A.stuckT = 0; }
          }
          if (A.detourT > 0) { A.detourT -= dt; wish.applyAxisAngle(V(0, 1, 0), A.detour); }
        }
      }
    }
    // steer through the normal controls (camera-relative), then hand them back to the player
    const yaw = G.cam.yaw;
    const save = { x: input.moveX, y: input.moveY, sprint: input.sprint, aim: input.aim, pressed: input.pressed, mode: G.camMode };
    input.moveY = wish.x * -Math.sin(yaw) + wish.z * -Math.cos(yaw);
    input.moveX = wish.x * Math.cos(yaw) + wish.z * -Math.sin(yaw);
    input.sprint = sprint; input.aim = false; input.pressed = new Set(); G.camMode = 'third';
    try { G.updatePlayer(dt); } finally {
      input.moveX = save.x; input.moveY = save.y; input.sprint = save.sprint; input.aim = save.aim; input.pressed = save.pressed; G.camMode = save.mode;
    }
  };
  return A;
}

/** Turn the leader into a disciple and let Jesus walk the story by himself. */
export function enableAutoHero(G) {
  if (G.autoHero) return;
  const profile = G.save.profile || { name: 'Disciple', look: {} };
  G.follow = createFollower(G, profile);
  G.follow.near(G.player);
  G.autoHero = createAutopilot(G);
  G.ui.auto = true; // Jesus answers and prays by himself in the dialogue mini-games
  document.body.classList.add('online');
  G.net?.announceHostMe?.();
  G.net?.voice?.restore();
  G.ask?.prepare();
  const role = G.net?.myRole;
  setTimeout(() => {
    if (role) G.ui.card('You walk with Jesus', role, `${profile.name}, you are ${role}, one of the Twelve. Follow the Master; in each scene you take your place among the disciples.`, 5200);
    G.ui.hint('Follow Jesus through the story · T chat · hold B to talk · hold J to ask Jesus a question · L players', 9000, true);
  }, 1500);
}
