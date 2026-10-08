// The lion of the wilderness and Goliath of Gath.
import * as THREE from 'three';
import { createLion, createGoliath, createSpearProjectile } from './characters.js';
import { heightAt } from './world.js';

const ring = (r, color) => {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.88, r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.visible = false;
  return m;
};

// ---------------------------------------------------------------- Lion
export function spawnLion(G, pos, lamb, lair) {
  const { V, scene, audio, ui } = G;
  const L = createLion();
  scene.add(L.root);
  const lion = { ...L, pos: G.ground(pos.clone()), facing: 0, state: 'carry', t: 0, hp: 4, lamb, lair: lair.clone(), pounceFrom: V(), pounceTo: V(), knock: V() };
  G.lion = lion;
  lamb.carried = true;
  lamb.root.position.set(0, -0.35, 0.55); lamb.root.rotation.set(0, Math.PI / 2, 0);
  L.headG.add(lamb.root);
  G.sheep.forEach((s) => { if (s !== lamb) s.fleeFrom = lion; });
  let resolveDefeat;
  lion.defeated = new Promise((r) => (resolveDefeat = r));
  lion.onEngage = null;

  const P = G.player;
  const setState = (s) => { lion.state = s; lion.t = 0; };
  const faceTo = (p, dt, k = 8) => { lion.facing = G.lerpAngle(lion.facing, Math.atan2(p.x - lion.pos.x, p.z - lion.pos.z), 1 - Math.exp(-dt * k)); };

  const dropLamb = () => {
    if (!lion.lamb) return;
    const lb = lion.lamb; lion.lamb = null;
    L.headG.remove(lb.root); scene.add(lb.root);
    lb.root.rotation.set(0, 0, 0);
    lb.pos.copy(lion.pos).add(V(Math.sin(lion.facing) * 1.6, 0, Math.cos(lion.facing) * 1.6));
    lb.carried = false; lb.target = null; lb.home = lb.pos.clone();
    audio.play('bleat');
  };

  G.onStaffStrike = () => {
    if (lion.state === 'dead' || lion.state === 'carry') return;
    const to = V().subVectors(lion.pos, P.pos).setY(0);
    const d = to.length();
    const fwd = V(Math.sin(P.facing), 0, Math.cos(P.facing));
    if (d < 2.8 && to.normalize().dot(fwd) > 0.35) {
      lion.hp--; audio.play('hit'); G.shake(0.25);
      L.pose.hurt = 1;
      lion.knock.copy(to).multiplyScalar(6);
      if (lion.hp <= 0) { setState('dead'); audio.play('roar', 0.3); return; }
      setState('retreat');
    }
  };

  const update = (dt) => {
    lion.t += dt;
    const toP = V().subVectors(P.pos, lion.pos).setY(0);
    const dP = toP.length();
    let speed = 0;
    L.pose.hurt = Math.max(0, L.pose.hurt - dt * 3);
    lion.pos.addScaledVector(lion.knock, dt); lion.knock.multiplyScalar(Math.exp(-dt * 6));

    switch (lion.state) {
      case 'carry': {
        const to = V().subVectors(lion.lair, lion.pos).setY(0);
        if (to.length() > 1) { to.normalize(); lion.pos.addScaledVector(to, 3.4 * dt); speed = 3.4; faceTo(lion.lair, dt); }
        if (dP < 9 && G.control) { dropLamb(); audio.play('roar', 0.5); setState('circle'); lion.onEngage?.(); }
        break;
      }
      case 'circle': case 'retreat': {
        const want = lion.state === 'retreat' ? 7 : 5;
        const tangent = V(-toP.z, 0, toP.x).normalize();
        const radial = toP.clone().normalize().multiplyScalar(dP - want);
        const mv = tangent.multiplyScalar(2.6).add(radial.multiplyScalar(1.4));
        lion.pos.addScaledVector(mv, dt); speed = mv.length();
        faceTo(P.pos, dt, 5);
        if (lion.t > (lion.state === 'retreat' ? 1.3 : 1.8 + Math.random() * 1.5) && G.control) { setState('crouch'); audio.play('roar', 0.22); }
        break;
      }
      case 'crouch':
        L.pose.crouch = Math.min(1, L.pose.crouch + dt * 3);
        faceTo(P.pos, dt, 10);
        if (lion.t > 0.85) {
          lion.pounceFrom.copy(lion.pos);
          lion.pounceTo.copy(P.pos).addScaledVector(toP.clone().normalize(), 1.2);
          setState('pounce');
        }
        break;
      case 'pounce': {
        const k = Math.min(1, lion.t / 0.55);
        L.pose.crouch = 0; L.pose.pounce = Math.sin(k * Math.PI);
        lion.pos.lerpVectors(lion.pounceFrom, lion.pounceTo, k);
        speed = 6;
        if (lion.pos.distanceTo(P.pos) < 1.4 && !lion.hitThisPounce) {
          lion.hitThisPounce = true;
          if (G.damage(0.3, lion.pos, { heavy: true })) audio.play('roar', 0.25);
        }
        if (k >= 1) { lion.hitThisPounce = false; L.pose.pounce = 0; setState('recover'); }
        break;
      }
      case 'recover':
        if (lion.t > 1.2) setState('circle');
        break;
      case 'dead':
        L.pose.dead = Math.min(1, L.pose.dead + dt * 2);
        if (lion.t > 1.2 && !lion.resolved) { lion.resolved = true; resolveDefeat(); }
        break;
    }
    lion.pos.y = heightAt(lion.pos.x, lion.pos.z);
    L.root.position.copy(lion.pos);
    if (L.pose.pounce > 0) L.root.position.y += L.pose.pounce * 1.1;
    L.root.rotation.y = lion.facing;
    L.animate(dt, speed);
  };
  G.updaters.push(update);
  lion.remove = () => { G.lion = null; scene.remove(L.root); G.updaters.splice(G.updaters.indexOf(update), 1); G.onStaffStrike = null; G.sheep.forEach((s) => (s.fleeFrom = null)); };
  return lion;
}

// ---------------------------------------------------------------- Goliath
const TAUNTS = [
  ['Am I a dog, that you come to me with sticks?', '1 Samuel 17:43'],
  ['Come to me, and I will give your flesh to the birds of the air.', '1 Samuel 17:44'],
  ['I defy the ranks of Israel this day!', '1 Samuel 17:10'],
];

export function spawnGoliath(G, pos, facing = 0) {
  const { V, scene, audio, ui } = G;
  const H = createGoliath();
  scene.add(H.root);
  const gol = { ...H, pos: G.ground(pos.clone()), facing, state: 'idle', t: 0, target: null, walkSpeed: 1.6, fighting: false, cycle: 0, hintedHelm: false };
  const throwRing = ring(2.2, 0xff4020), sweepRing = ring(6.5, 0xff4020);
  scene.add(throwRing, sweepRing);
  const P = G.player;
  let spearFlight = null;
  let resolveDown;
  gol.down = new Promise((r) => (resolveDown = r));

  const setState = (s) => { gol.state = s; gol.t = 0; };
  const faceTo = (p, dt, k = 3) => { gol.facing = G.lerpAngle(gol.facing, Math.atan2(p.x - gol.pos.x, p.z - gol.pos.z), 1 - Math.exp(-dt * k)); };
  gol.walkTo = (p, speed = 1.6) => new Promise((res) => { gol.target = G.ground(p.clone()); gol.walkSpeed = speed; gol.arrive = res; setState('walk'); });
  gol.startFight = () => { gol.fighting = true; setState('advance'); };

  const wp = (obj, out = V()) => obj.getWorldPosition(out);
  gol.headPos = () => wp(H.brow, V());
  // Health: five stones bring him down (a stone to the brow while he roars counts double).
  gol.maxHp = 5; gol.hp = 5;
  // Hit volumes follow his body: head, a capsule of spheres along the spine, both legs, the shield.
  const pool = Array.from({ length: 16 }, () => ({ c: V(), r: 0, part: '' }));
  const seg = (k, a, b, n, r, part) => { for (let i = 0; i < n; i++) { const o = pool[k++]; o.c.lerpVectors(a, b, n === 1 ? 0.5 : i / (n - 1)); o.r = r; o.part = part; } return k; };
  const pHead = V(), pNeck = V(), pHips = V(), pKL = V(), pKR = V(), pAL = V(), pAR = V(), pSh = V(), pBrow = V();
  const target = {
    spheres: () => {
      const S = H.rig.scale;
      wp(H.rig.head, pHead); wp(H.rig.neck, pNeck); wp(H.rig.hips, pHips); wp(H.brow, pBrow);
      wp(H.rig.shinL, pKL); wp(H.rig.shinR, pKR); wp(H.shield, pSh);
      pAL.copy(pKL).y -= 0.45 * S; pAR.copy(pKR).y -= 0.45 * S;
      let k = 0;
      pool[k].c.copy(pBrow); pool[k].r = 0.32; pool[k++].part = 'brow';
      pool[k].c.copy(pHead); pool[k].r = 0.36; pool[k++].part = 'head';
      k = seg(k, pHips, pNeck, 5, 0.42 * S, 'body');
      k = seg(k, pHips, pKL, 2, 0.2 * S, 'body'); k = seg(k, pKL, pAL, 2, 0.16 * S, 'body');
      k = seg(k, pHips, pKR, 2, 0.2 * S, 'body'); k = seg(k, pKR, pAR, 2, 0.16 * S, 'body');
      pool[k].c.copy(pSh); pool[k].r = 0.62; pool[k++].part = 'shield';
      // the brow is listed first, so a stone that reaches it during a roar counts there
      return pool.slice(0, k);
    },
    onHit: (part, proj) => {
      if (!gol.fighting) return;
      const open = gol.state === 'roar';
      let dmg = 0;
      if ((part === 'brow' || part === 'head') && open) dmg = 2;
      else if (part === 'shield') dmg = 0;
      else dmg = 1;
      if (dmg === 0) { audio.play('clang'); G.shake(0.1); ui.hint('The stone glances off his shield.', 1800); return; }
      gol.hp = Math.max(0, gol.hp - dmg);
      ui.boss(true, gol.hp / gol.maxHp);
      audio.play(dmg === 2 ? 'hit' : 'clang'); G.shake(dmg === 2 ? 0.45 : 0.15);
      gol.flinch = 1;
      ui.toast(dmg === 2 ? 'Struck his brow!' : `Hit · ${gol.maxHp - gol.hp}/${gol.maxHp}`, 1500, dmg === 2);
      if (gol.hp <= 0) { gol.fighting = false; setState('fall'); resolveDown(); return; }
      if (dmg === 2) setState('stagger');
      else if (!gol.hintedHelm) { gol.hintedHelm = true; ui.hint('Every stone counts, but strike his brow while he roars for a double blow.', 4500); }
    },
  };
  G.targets.push(target);
  G.goliath = gol; G.goliathTarget = target;

  const throwSpear = () => {
    const from = V(); wp(H.rig.handR, from);
    const lead = P.vel.clone().setY(0).multiplyScalar(0.7);
    const to = P.pos.clone().add(lead); G.ground(to);
    const mesh = createSpearProjectile(); scene.add(mesh);
    H.spear.visible = false;
    spearFlight = { mesh, from, to, t: 0, dur: Math.max(0.8, from.distanceTo(to) / 22) };
    throwRing.position.set(to.x, to.y + 0.08, to.z); throwRing.visible = true;
    audio.play('swing');
  };

  const update = (dt) => {
    gol.t += dt;
    const toP = V().subVectors(P.pos, gol.pos).setY(0);
    const dP = toP.length();
    let speed = 0;
    const pose = H.pose;
    pose.lookUp += (((gol.state === 'roar' || gol.state === 'stagger') ? 1 : 0) - pose.lookUp) * Math.min(1, dt * 5);
    gol.flinch = Math.max(0, (gol.flinch || 0) - dt * 3);
    H.helm.rotation.x = -pose.lookUp * 0.55; H.helm.position.y = pose.lookUp * 0.05;
    H.brow.material.opacity = gol.state === 'roar' ? 0.55 + Math.sin(G.t * 12) * 0.35 : 0;

    switch (gol.state) {
      case 'idle': break;
      case 'walk': {
        const d = V().subVectors(gol.target, gol.pos).setY(0);
        if (d.length() < 0.4) { const a = gol.arrive; gol.arrive = null; setState('idle'); a?.(); break; }
        d.normalize(); gol.pos.addScaledVector(d, gol.walkSpeed * dt); speed = gol.walkSpeed * 0.7; faceTo(gol.target, dt);
        break;
      }
      case 'advance': {
        faceTo(P.pos, dt);
        if (dP > 5) { gol.pos.addScaledVector(toP.normalize(), 1.7 * (G.diff?.enemy ?? 1) * dt); speed = 1.3; }
        if (dP < 6.2 && gol.t > 0.6) setState('sweepWind');
        else if (gol.t > 3.2) {
          gol.cycle++;
          setState(gol.cycle % 2 === 0 ? 'roar' : 'throwWind');
          if (gol.state === 'roar') {
            audio.play('roar', 0.6); G.shake(0.3);
            const [line, ref] = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
            G.ui.hint(`Goliath: “${line}”`, 2800);
          }
        }
        break;
      }
      case 'throwWind':
        faceTo(P.pos, dt, 5);
        pose.aim = Math.min(1, gol.t * 1.5); // arm raised
        if (gol.t > 1.1 / (G.diff?.enemy ?? 1)) { pose.aim = 0; pose.throw = 1; throwSpear(); setState('throwRecover'); }
        break;
      case 'throwRecover':
        pose.throw = Math.max(0, pose.throw - dt * 2);
        if (gol.t > 1.6) setState('advance');
        break;
      case 'sweepWind':
        faceTo(P.pos, dt, 2);
        pose.swing = Math.min(0.3, gol.t * 0.4);
        sweepRing.visible = true; sweepRing.position.set(gol.pos.x, gol.pos.y + 0.1, gol.pos.z);
        sweepRing.scale.setScalar(0.4 + Math.min(1, gol.t / 0.95) * 0.6);
        if (gol.t > 0.95 / (G.diff?.enemy ?? 1)) {
          setState('sweep'); audio.play('swing'); G.shake(0.2);
          if (dP < 6.5) G.damage(0.45, gol.pos, { heavy: true });
        }
        break;
      case 'sweep':
        pose.swing = Math.min(1, 0.3 + gol.t * 1.6); sweepRing.visible = false;
        if (gol.t > 0.6) { pose.swing = 0; setState(gol.cycle % 2 === 1 ? 'roar' : 'advance'); if (gol.state === 'roar') { gol.cycle++; audio.play('roar', 0.6); } }
        break;
      case 'roar':
        if (gol.t > (G.diff?.roar ?? 4.5)) setState('advance');
        break;
      case 'stagger': // reels back from a blow to the brow
        pose.lookUp = 1; speed = 0;
        gol.pos.addScaledVector(toP.clone().normalize(), -1.2 * dt);
        if (gol.t > 1.6) setState('advance');
        break;
      case 'fall':
        pose.fallen = Math.min(1, pose.fallen + dt * (0.3 + pose.fallen * 2.5));
        pose.lookUp = 0;
        if (pose.fallen >= 1 && !gol.thudded) { gol.thudded = true; audio.play('thud'); G.shake(1.2); }
        break;
    }

    if (spearFlight) {
      const s = spearFlight; s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const p = V().lerpVectors(s.from, s.to, k); p.y += Math.sin(k * Math.PI) * 4;
      const prev = s.mesh.position.clone();
      s.mesh.position.copy(p);
      if (k < 1) s.mesh.lookAt(p.clone().add(p.clone().sub(prev)));
      throwRing.material.opacity = 0.35 + Math.sin(G.t * 20) * 0.2;
      if (k >= 1 && !s.landed) {
        s.landed = true; throwRing.visible = false; G.shake(0.35); audio.play('thud');
        if (G.hdist(P.pos, s.to) < 2.3) G.damage(0.4, s.to, { heavy: true });
        H.spear.visible = true;
        setTimeout(() => scene.remove(s.mesh), 3000);
        spearFlight = null;
      }
    }

    // Ground-shaking footsteps nearby
    if (speed > 0.2) { gol.stepT = (gol.stepT || 0) - dt; if (gol.stepT < 0) { gol.stepT = 0.85; if (dP < 30) { G.shake(Math.max(0, 0.18 - dP * 0.005)); audio.play('step'); } } }
    G.ground(gol.pos);
    // Keep David from walking through him
    if (dP < 1.4 && dP > 0.01 && gol.state !== 'fall') P.pos.addScaledVector(toP.normalize(), 1.4 - dP);
    H.root.position.copy(gol.pos);
    H.root.rotation.y = gol.facing;
    H.animate(dt, speed);
    H.rig.torso.rotation.x -= (gol.flinch || 0) * 0.35; // recoil from each stone
  };
  G.updaters.push(update);
  return gol;
}
