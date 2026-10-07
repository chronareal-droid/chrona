// The Shepherd King: engine core. Renderer, player controller, camera, NPCs, pickups, projectiles.
import * as THREE from 'three';
import { buildWorld, heightAt, waterLevel, brookZ, BOUNDS } from './world.js';
import { createHumanoid, createSheep, createStaff } from './characters.js';
import { createInput } from './input.js';
import { createUI, wait } from './ui.js';
import { createAudio } from './audio.js';
import { runStory } from './story.js';
import { createPost } from './post.js';
import { createSystems } from './systems.js';
import { createMenu } from './menu.js';
import { save } from './save.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.72;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 2500);
const post = createPost(renderer, scene, camera);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  post.resize();
});

const input = createInput(canvas);
const ui = createUI(input);
const audio = createAudio();
const world = buildWorld(scene, renderer, save.settings.quality);

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ground = (v) => { v.y = heightAt(v.x, v.z); return v; };

// ---------------------------------------------------------------- Game context
const G = {
  THREE, scene, camera, renderer, input, ui, audio, world, V, ground, wait,
  t: 0, control: false, cine: null, shakeAmt: 0, timeScale: 1, paused: false, post, save,
  camMode: save.settings.camMode || 'third', focus: 10, hurtFx: 0,
  npcs: [], sheep: [], pickups: [], projectiles: [], targets: [], updaters: [],
  objective: null, interactBusy: false, stats: { start: 0, stonesThrown: 0, deaths: 0 },
  cam: { yaw: Math.PI, pitch: 0.28, dist: 4.6, pos: V(), look: V(), yaw2: 0 },
};
window.__G = G; // handy for debugging in the console

// ---------------------------------------------------------------- Player (David)
const david = createHumanoid({ skin: 0xc4926a, robe: 0xcdb58a, sash: 0x7a3326, hair: 0x6b3a1e, height: 1.68, build: 0.92 });
scene.add(david.root);
const staff = createStaff();
staff.position.set(0, -0.05, 0.05); staff.rotation.x = Math.PI / 2 - 0.2;
david.rig.handR.add(staff);
const sling = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.008, 4, 16), new THREE.MeshStandardMaterial({ color: 0x5a3a22 }));
sling.visible = false; david.rig.handR.add(sling);
const heldStone = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.6 }));
heldStone.visible = false; heldStone.position.y = -0.22; sling.add(heldStone);
// Saul's armour (an optional, ill-fitting moment)
const saulArmor = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 10), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.8, roughness: 0.35 }));
saulArmor.position.y = 0.3; saulArmor.scale.set(1.15, 1.05, 0.95); saulArmor.visible = false; saulArmor.castShadow = true;
david.rig.torso.add(saulArmor);

const P = {
  h: david, pos: V(), vel: V(), facing: 0, onGround: true, health: 1, lastHurt: -99,
  rollT: 0, rollDir: V(), attackT: 0, attackHitDone: false, aimCharge: 0, aiming: false,
  stones: 0, slingUnlocked: false, armored: false, invuln: 0, dead: false, stepT: 0,
  maxHealth: 1, mount: null, spirit: 0, spiritActive: 0,
};
G.player = P;
G.setPlayer = (pos, facing = P.facing) => {
  P.pos.copy(pos); ground(P.pos); P.vel.set(0, 0, 0); P.facing = facing;
  G.cam.yaw = facing + Math.PI; G.cam.pitch = 0.28;
  david.root.position.copy(P.pos); david.root.rotation.y = facing;
  snapCamera();
};
G.setArmor = (on) => { P.armored = on; saulArmor.visible = on; };
G.setSling = (on) => { P.slingUnlocked = on; staff.visible = !on; };

G.damage = (amount, from) => {
  if (P.invuln > 0 || P.dead || !G.control) return false;
  if (P.spiritActive > 0) amount *= 0.35; // the LORD is my strength and my shield
  amount *= G.mods?.armor ?? 1;
  P.health -= amount / P.maxHealth; P.lastHurt = G.t; P.invuln = 0.6; G.hurtFx = 1;
  ui.hurt(); audio.play('hurt'); G.shake(0.5);
  if (from) { const k = V().subVectors(P.pos, from).setY(0).normalize().multiplyScalar(7); P.vel.x += k.x; P.vel.z += k.z; P.vel.y = 3; P.onGround = false; }
  if (P.health <= 0) { P.dead = true; G.onPlayerDeath?.(); }
  return true;
};
G.heal = () => { P.health = 1; P.dead = false; ui.health(1); };
G.shake = (a) => { G.shakeAmt = Math.max(G.shakeAmt, a); };

function updatePlayer(dt) {
  const ctl = G.control && !P.dead;
  // In witness view, steer relative to the direction David faces.
  const yaw = G.camMode === 'second' ? P.facing + Math.PI : G.cam.yaw;
  const fwd = V(-Math.sin(yaw), 0, -Math.cos(yaw)), right = V(Math.cos(yaw), 0, -Math.sin(yaw));
  const wish = V();
  if (ctl) wish.addScaledVector(fwd, input.moveY).addScaledVector(right, input.moveX);
  const wishLen = Math.min(1, wish.length());
  if (wishLen > 0.01) wish.normalize();

  P.aiming = ctl && input.aim && P.slingUnlocked;
  if (P.mount) { G.updateMount(dt); return; }
  let speed = (input.sprint && !P.aiming ? 6.6 * (G.mods?.run ?? 1) : 3.3) * wishLen;
  if (P.aiming) speed = 2.2 * wishLen;
  if (P.armored) speed *= 0.22;
  const inWater = Math.abs(P.pos.z - brookZ(P.pos.x)) < 3.2 && P.pos.y < waterLevel(P.pos.x) + 0.1;
  if (inWater) speed *= 0.65;

  P.invuln = Math.max(0, P.invuln - dt);
  if (P.rollT > 0) {
    P.rollT -= dt;
    P.vel.x = P.rollDir.x * 8.5; P.vel.z = P.rollDir.z * 8.5;
    P.invuln = Math.max(P.invuln, 0.05);
  } else {
    const k = 1 - Math.exp(-dt * (P.onGround ? 12 : 2.5));
    P.vel.x += (wish.x * speed - P.vel.x) * k;
    P.vel.z += (wish.z * speed - P.vel.z) * k;
    if (ctl && input.pressed.has('roll') && P.onGround && !P.armored) {
      P.rollT = 0.5; P.rollDir.copy(wishLen > 0.1 ? wish : V(Math.sin(P.facing), 0, Math.cos(P.facing)));
      audio.play('swing');
    }
    if (ctl && input.pressed.has('jump') && P.onGround && !P.armored) { P.vel.y = 5.2; P.onGround = false; }
  }
  P.vel.y -= 16 * dt;
  P.pos.addScaledVector(P.vel, dt);

  // Collisions: trees, rocks, tents, NPCs
  for (const c of world.colliders) resolveCircle(P.pos, c.x, c.z, c.r + 0.35);
  for (const n of G.npcs) if (n.solid !== false && n.root.visible) resolveCircle(P.pos, n.pos.x, n.pos.z, (n.radius || 0.4) + 0.35);
  P.pos.x = THREE.MathUtils.clamp(P.pos.x, BOUNDS.minX, BOUNDS.maxX);
  P.pos.z = THREE.MathUtils.clamp(P.pos.z, BOUNDS.minZ, BOUNDS.maxZ);
  const gy = heightAt(P.pos.x, P.pos.z);
  if (P.pos.y <= gy) { P.pos.y = gy; P.vel.y = 0; P.onGround = true; } else if (P.pos.y > gy + 0.15) P.onGround = false;

  // Facing
  const hs = Math.hypot(P.vel.x, P.vel.z);
  let targetFacing = P.facing;
  if (G.camMode === 'second') {
    // Tank-style turning: A/D turn, W/S walk forward/back
    if (ctl) targetFacing = P.facing - input.moveX * dt * 2.6;
  } else if (P.aiming || G.camMode === 'first') targetFacing = G.cam.yaw + Math.PI;
  else if (hs > 0.3) targetFacing = Math.atan2(P.vel.x, P.vel.z);
  P.facing = G.camMode === 'second' ? targetFacing : lerpAngle(P.facing, targetFacing, 1 - Math.exp(-dt * (P.aiming || G.camMode === 'first' ? 25 : 10)));
  david.root.position.copy(P.pos);
  david.root.rotation.y = P.facing;

  // Footsteps
  if (P.onGround && hs > 1) { P.stepT -= dt * hs; if (P.stepT < 0) { P.stepT = 2.1; audio.play('step'); } }

  // Staff strike
  const pose = david.pose;
  if (P.attackT > 0) {
    P.attackT -= dt; pose.swing = 1 - Math.max(0, P.attackT) / 0.45;
    if (!P.attackHitDone && pose.swing > 0.4) { P.attackHitDone = true; G.onStaffStrike?.(); }
    if (P.attackT <= 0) pose.swing = 0;
  } else if (ctl && !P.aiming && !P.slingUnlocked && input.pressed.has('attack')) {
    P.attackT = 0.45; P.attackHitDone = false; audio.play('swing');
  }

  // Sling
  sling.visible = P.slingUnlocked && (P.aiming || pose.throw > 0);
  heldStone.visible = P.aiming && P.stones > 0;
  if (P.aiming && P.stones > 0) {
    const before = P.aimCharge;
    P.aimCharge = P.spiritActive > 0 ? 1 : Math.min(1, P.aimCharge + dt / (G.mods?.charge ?? 1.1));
    sling.rotation.set(Math.PI / 2, 0, G.t * 24);
    if (Math.floor(before * 6) !== Math.floor(P.aimCharge * 6) || (P.aimCharge >= 1 && Math.random() < dt * 6)) audio.play('whirl');
    if (input.pressed.has('fire')) throwStone();
  } else P.aimCharge = Math.max(0, P.aimCharge - dt * 3);
  if (P.aiming && P.stones === 0 && input.pressed.has('fire')) ui.hint('Your pouch is empty. Gather the stones that fell.', 2500);
  pose.aim += ((P.aiming ? 1 : 0) - pose.aim) * (1 - Math.exp(-dt * 12));
  pose.throw = Math.max(0, pose.throw - dt * 3);
  ui.crosshair(P.aiming || (G.camMode === 'first' && P.slingUnlocked && ctl), P.stones > 0 ? P.aimCharge : 0);

  // Health regen
  if (!P.dead && (G.t - P.lastHurt > 4 || P.spiritActive > 0) && P.health < 1) P.health = Math.min(1, P.health + dt * (P.spiritActive > 0 ? 0.3 : 0.15));
  ui.health(P.health);

  david.animate(dt, P.rollT > 0 ? 0 : hs);
  if (P.rollT > 0) { // tuck and roll
    const k = 1 - P.rollT / 0.5;
    david.rig.hips.rotation.x = k * Math.PI * 2; david.rig.hips.position.y = 0.6;
  } else david.rig.hips.rotation.x = 0;
}

function resolveCircle(p, x, z, r) {
  const dx = p.x - x, dz = p.z - z, d2 = dx * dx + dz * dz;
  if (d2 < r * r && d2 > 1e-6) { const d = Math.sqrt(d2), push = (r - d) / d; p.x += dx * push; p.z += dz * push; }
}
const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
G.lerpAngle = lerpAngle;

// ---------------------------------------------------------------- Stones & projectiles
const stoneGeo = new THREE.SphereGeometry(0.06, 8, 6);
const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd8cfbd, roughness: 0.5, emissive: 0x3a2a10 });
const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.35, depthWrite: false });

G.addStonePickup = (pos, { onPick } = {}) => {
  const grp = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), stoneMat); s.scale.y = 0.75; s.castShadow = true;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), glowMat.clone());
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.25, depthWrite: false }));
  beam.position.y = 1.2;
  grp.add(s, glow, beam);
  grp.position.copy(pos);
  grp.position.y = Math.max(heightAt(pos.x, pos.z), waterLevel(pos.x) - 0.1) + 0.08;
  scene.add(grp);
  const pk = { grp, glow, onPick, kind: 'stone' };
  G.pickups.push(pk);
  return pk;
};

function updatePickups(dt) {
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const pk = G.pickups[i];
    pk.glow.material.opacity = 0.25 + Math.sin(G.t * 4 + i) * 0.12;
    pk.grp.rotation.y += dt;
    if (G.control && P.pos.distanceTo(pk.grp.position) < 1.5) {
      scene.remove(pk.grp); G.pickups.splice(i, 1);
      P.stones++; ui.stones(P.stones); audio.play('pickup');
      pk.onPick?.();
    }
  }
}

const raycaster = new THREE.Raycaster();
function throwStone() {
  P.stones--; ui.stones(P.stones); G.stats.stonesThrown++;
  const charge = P.aimCharge; P.aimCharge = 0;
  david.pose.throw = 1; audio.play('release');
  // Aim point: march the camera ray until it meets a target sphere or the ground.
  camera.updateMatrixWorld();
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const dir = raycaster.ray.direction.clone();
  const spread = P.spiritActive > 0 ? 0 : (1 - charge) * 0.07;
  dir.x += (Math.random() - 0.5) * spread; dir.y += (Math.random() - 0.5) * spread; dir.z += (Math.random() - 0.5) * spread; dir.normalize();
  let aim = null;
  const o = raycaster.ray.origin;
  for (let d = 2; d < 160 && !aim; d += 0.4) {
    const p = o.clone().addScaledVector(dir, d);
    for (const tg of G.targets) for (const s of tg.spheres()) if (p.distanceTo(s.c) < s.r) aim = p;
    if (p.y < heightAt(p.x, p.z)) aim = p;
  }
  if (!aim) aim = o.clone().addScaledVector(dir, 160);
  const from = V(); heldStone.getWorldPosition(from);
  from.lerp(P.pos.clone().add(V(0, 1.7, 0)), 0.5);
  const speed = 34 + charge * 26;
  const to = aim.clone().sub(from);
  const tFlight = to.length() / speed;
  const vel = to.normalize().multiplyScalar(speed);
  vel.y += 0.5 * 9.8 * tFlight; // arc compensation so the stone lands on the crosshair
  const mesh = new THREE.Mesh(stoneGeo, stoneMat);
  mesh.position.copy(from); scene.add(mesh);
  const trail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), glowMat.clone()); mesh.add(trail);
  G.projectiles.push({ mesh, vel, life: 6, charge });
}

function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    let done = false;
    const steps = 4;
    for (let s = 0; s < steps && !done; s++) {
      const h = dt / steps;
      pr.vel.y -= 9.8 * h;
      pr.mesh.position.addScaledVector(pr.vel, h);
      for (const tg of G.targets) {
        for (const sp of tg.spheres()) {
          if (pr.mesh.position.distanceTo(sp.c) < sp.r) { tg.onHit(sp.part, pr); done = true; break; }
        }
        if (done) break;
      }
      const gy = heightAt(pr.mesh.position.x, pr.mesh.position.z);
      if (!done && pr.mesh.position.y < gy) {
        done = true;
        G.addStonePickup(pr.mesh.position); // a missed stone can be gathered again
      }
    }
    pr.life -= dt;
    if (done || pr.life < 0) { scene.remove(pr.mesh); G.projectiles.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- NPCs
G.addNPC = (opts, pos, facing = 0) => {
  const h = opts.humanoid || createHumanoid(opts);
  const n = {
    ...h, name: opts.name, pos: ground(pos.clone()), facing, talk: opts.talk || null, speed: 0, target: null, walkSpeed: opts.walkSpeed || 1.6,
    lookAtPlayer: opts.lookAtPlayer !== false, radius: opts.radius || 0.4, solid: opts.solid, idle: opts.idle,
    prompt: opts.prompt || (opts.name ? `Speak with ${opts.name}` : null), talking: false,
  };
  n.root.position.copy(n.pos); n.root.rotation.y = facing;
  scene.add(n.root);
  n.walkTo = (p, speed = n.walkSpeed) => new Promise((res) => { n.target = ground(p.clone()); n.walkSpeed = speed; n.arrive = res; });
  n.remove = () => { scene.remove(n.root); G.npcs.splice(G.npcs.indexOf(n), 1); };
  G.npcs.push(n);
  return n;
};

function updateNPCs(dt) {
  let best = null, bestD = 2.6;
  for (const n of G.npcs) {
    let sp = 0;
    if (n.target) {
      const d = V().subVectors(n.target, n.pos).setY(0);
      const dist = d.length();
      if (dist < 0.3) { n.target = null; const a = n.arrive; n.arrive = null; a?.(); }
      else {
        sp = n.walkSpeed;
        d.normalize();
        n.pos.addScaledVector(d, Math.min(dist, sp * dt));
        n.facing = lerpAngle(n.facing, Math.atan2(d.x, d.z), 1 - Math.exp(-dt * 6));
      }
    } else if (n.lookAtPlayer && n.pos.distanceTo(P.pos) < 6) {
      n.facing = lerpAngle(n.facing, Math.atan2(P.pos.x - n.pos.x, P.pos.z - n.pos.z), 1 - Math.exp(-dt * 3));
    }
    n.idle?.(n, dt);
    ground(n.pos);
    n.root.position.copy(n.pos);
    n.root.rotation.y = n.facing;
    n.pose.talk += ((n.talking ? 1 : 0) - n.pose.talk) * Math.min(1, dt * 8);
    n.animate(dt, sp);
    if (n.talk && G.control && !G.interactBusy) {
      const d = n.pos.distanceTo(P.pos);
      if (d < bestD) { best = n; bestD = d; }
    }
  }
  if (G.control && !G.interactBusy && !P.mount) {
    for (const it of G.interactables || []) {
      if (it.enabled && !it.enabled()) continue;
      const p = typeof it.pos === 'function' ? it.pos() : it.pos;
      const d = p.distanceTo(P.pos) * (2.6 / (it.range || 2.6));
      if (d < bestD) { best = it; bestD = d; }
    }
  }
  ui.prompt(P.mount && G.control ? 'Dismount' : best ? best.prompt : null);
  if (best && input.pressed.has('interact') && !P.mount) {
    input.pressed.delete('advance');
    G.interactBusy = true; G.control = false;
    best.talking = true;
    const t = best.talk;
    if (best.h || best.rig) best.facing = Math.atan2(P.pos.x - best.pos.x, P.pos.z - best.pos.z);
    Promise.resolve(t(best)).finally(() => { best.talking = false; G.interactBusy = false; if (!G.cine) G.control = true; });
  }
}

// Sheep flock
G.addSheep = (pos, scale = 1) => {
  const s = createSheep();
  s.root.scale.setScalar(scale);
  const sh = { ...s, pos: ground(pos.clone()), home: pos.clone(), target: null, facing: Math.random() * 6, timer: Math.random() * 3, fleeFrom: null, follow: null };
  s.root.position.copy(sh.pos);
  scene.add(s.root);
  G.sheep.push(sh);
  return sh;
};
function updateSheep(dt) {
  for (const s of G.sheep) {
    if (s.carried) continue;
    s.timer -= dt;
    let goal = s.target, sp = 0.6;
    if (s.follow) { const d = s.pos.distanceTo(s.follow.pos); if (d > 2.5) { goal = s.follow.pos; sp = Math.min(6, d * 1.4); } else goal = null; }
    else if (s.fleeFrom && s.pos.distanceTo(s.fleeFrom.pos) < 14) {
      goal = s.pos.clone().add(V().subVectors(s.pos, s.fleeFrom.pos).setY(0).normalize().multiplyScalar(5)); sp = 4.5;
    } else if (s.timer < 0) {
      s.timer = 3 + Math.random() * 6;
      s.target = Math.random() < 0.4 ? null : s.home.clone().add(V((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 16));
      if (Math.random() < 0.15) audio.play('bleat');
    }
    let speed = 0;
    if (goal) {
      const d = V().subVectors(goal, s.pos).setY(0); const dist = d.length();
      if (dist > 0.4) { d.normalize(); s.pos.addScaledVector(d, Math.min(dist, sp * dt)); s.facing = lerpAngle(s.facing, Math.atan2(d.x, d.z), 1 - Math.exp(-dt * 4)); speed = sp; }
      else if (!s.follow) s.target = null;
    }
    resolveCircle(s.pos, P.pos.x, P.pos.z, 0.9);
    for (const c of world.colliders) resolveCircle(s.pos, c.x, c.z, c.r + 0.4);
    ground(s.pos);
    s.root.position.copy(s.pos); s.root.rotation.y = s.facing;
    s.animate(dt, speed);
  }
}

// ---------------------------------------------------------------- Objective marker & beacon
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 16, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd889, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
beacon.visible = false; scene.add(beacon);
G.setObjective = (text, target = null) => {
  G.objective = target ? { text, target } : null;
  ui.objective(text);
};
const proj = V();
function updateObjective() {
  const o = G.objective;
  let tgt = o && (typeof o.target === 'function' ? o.target() : o.target);
  if (!tgt && G.systems?.sideTarget) tgt = G.systems.sideTarget;
  if (!tgt || G.cine) { ui.marker(0, 0, 0, false); beacon.visible = false; ui.objectiveDist(null); return; }
  const d = P.pos.distanceTo(tgt);
  ui.objectiveDist(d);
  beacon.visible = d > 8; beacon.position.set(tgt.x, heightAt(tgt.x, tgt.z) + 30, tgt.z);
  beacon.material.opacity = 0.08 + Math.sin(G.t * 2) * 0.03;
  proj.copy(tgt); proj.y += 2.2; proj.project(camera);
  let x = proj.x, y = proj.y;
  if (proj.z > 1) { x = -x; y = -1; }
  const m = 0.9; x = THREE.MathUtils.clamp(x, -m, m); y = THREE.MathUtils.clamp(y, -m, m);
  ui.marker((x * 0.5 + 0.5) * innerWidth, (-y * 0.5 + 0.5) * innerHeight, d, d > 3);
}

// ---------------------------------------------------------------- Camera
const camTarget = V(), camWanted = V();
function cameraWanted(out, look) {
  const c = G.cam;
  const aimK = david.pose.aim;
  const mounted = P.mount ? P.mount.saddleHeight : 0;
  if (G.camMode === 'first') {
    // Through David's eyes
    out.copy(P.pos); out.y += 1.58 + mounted;
    if (!P.mount) out.add(V(Math.sin(P.facing) * 0.18, 0, Math.cos(P.facing) * 0.18));
    look.set(-Math.sin(c.yaw) * Math.cos(c.pitch), -Math.sin(c.pitch), -Math.cos(c.yaw) * Math.cos(c.pitch)).add(out);
    return;
  }
  if (G.camMode === 'second') {
    // The Witness: someone else's eyes, a few paces ahead, looking back at David
    const f = P.facing;
    look.copy(P.pos).add(V(0, 1.35 + mounted, 0));
    out.set(Math.sin(f + c.yaw2) * 5.2, 1.0 + c.pitch * 2.5, Math.cos(f + c.yaw2) * 5.2).add(look);
    const gy2 = heightAt(out.x, out.z) + 0.5; if (out.y < gy2) out.y = gy2;
    return;
  }
  const dist = THREE.MathUtils.lerp(c.dist + (P.mount ? 2.2 : 0), 2.1, aimK);
  look.copy(P.pos).add(V(0, 1.55 + mounted, 0));
  // shoulder offset when aiming
  const right = V(Math.cos(c.yaw), 0, -Math.sin(c.yaw));
  look.addScaledVector(right, 0.65 * aimK);
  out.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)).multiplyScalar(dist).add(look);
  const gy = heightAt(out.x, out.z) + 0.5;
  if (out.y < gy) out.y = gy;
}
function snapCamera() { cameraWanted(G.cam.pos, G.cam.look); }

function updateCamera(dt) {
  const c = G.cam;
  if (G.cine) {
    const s = G.cine;
    s.t = Math.min(1, s.t + dt / s.dur);
    const k = s.ease ? ease(s.t) : s.t;
    const from = typeof s.from === 'function' ? s.from() : s.from, to = typeof s.to === 'function' ? s.to() : s.to;
    const lf = typeof s.lookFrom === 'function' ? s.lookFrom() : s.lookFrom, lt = typeof s.lookTo === 'function' ? s.lookTo() : s.lookTo;
    camera.position.lerpVectors(from, to, k);
    camTarget.lerpVectors(lf, lt, k);
    if (s.t >= 1 && s.done) { const d = s.done; s.done = null; d(); }
  } else {
    if (G.control) {
      const sens = (input.touch ? 0.0042 : 0.0024) * (save.settings.sensitivity || 1);
      const inv = save.settings.invertY ? -1 : 1;
      if (G.camMode === 'second') {
        c.yaw2 = THREE.MathUtils.clamp(c.yaw2 - input.lookDX * sens, -1.2, 1.2);
        c.pitch = THREE.MathUtils.clamp(c.pitch + input.lookDY * sens * inv, -0.2, 1.0);
      } else {
        c.yaw -= input.lookDX * sens;
        const lo = G.camMode === 'first' ? -1.2 : -0.45;
        c.pitch = THREE.MathUtils.clamp(c.pitch + input.lookDY * sens * inv, lo, G.camMode === 'first' ? 1.2 : 1.15);
      }
    }
    cameraWanted(camWanted, c.look);
    const k = G.camMode === 'first' ? 1 : 1 - Math.exp(-dt * 14);
    c.pos.lerp(camWanted, k);
    camera.position.copy(c.pos);
    camTarget.copy(c.look);
  }
  if (G.shakeAmt > 0) {
    camera.position.x += (Math.random() - 0.5) * G.shakeAmt * 0.3;
    camera.position.y += (Math.random() - 0.5) * G.shakeAmt * 0.3;
    G.shakeAmt = Math.max(0, G.shakeAmt - dt * 1.8);
  }
  camera.lookAt(camTarget);
  // Hide David's own body in first person (keep the arms' sling visible via the crosshair)
  david.root.visible = !(G.camMode === 'first' && !G.cine);
  const targetFov = (G.camMode === 'first' ? 70 : 58) - david.pose.aim * 12 + (P.spiritActive > 0 ? 6 : 0);
  if (Math.abs(camera.fov - targetFov) > 0.05) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Cinematic camera move. Positions may be vectors or functions returning vectors (to track movers). */
G.shot = (from, to, lookFrom, lookTo, dur, { ease: e = true } = {}) =>
  new Promise((res) => { G.cine = { from, to, lookFrom, lookTo: lookTo || lookFrom, dur, t: 0, ease: e, done: res }; });
G.cinemaOn = () => { G.control = false; ui.cinema(true); if (document.pointerLockElement) document.exitPointerLock(); };
G.cinemaOff = () => {
  // Hand the camera back smoothly from wherever the shot left it.
  G.cam.pos.copy(camera.position);
  const d = V().subVectors(camera.position, P.pos);
  G.cam.yaw = Math.atan2(d.x, d.z);
  G.cine = null; G.control = true; ui.cinema(false);
};

// ---------------------------------------------------------------- Loop
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const raw = Math.min(clock.getDelta(), 1 / 20);
  if (G.paused) { input.endFrame(); post.render(G.t, { spirit: 0 }); return; }
  // The Spirit slows the world; David moves almost at full speed.
  const dtW = raw * G.timeScale, dtP = raw * Math.max(G.timeScale, 0.85);
  G.t += dtW;
  input.poll();
  if (input.pressed.has('camera') && !G.cine) G.cycleCamera();
  if (input.pressed.has('pause') && G.control) G.menu.pause();
  G.systems.update(raw, dtW);
  updatePlayer(dtP);
  updateNPCs(dtW);
  updateSheep(dtW);
  for (const u of G.updaters) u(dtW);
  updatePickups(dtW);
  updateProjectiles(dtW);
  world.update(G.t, dtW);
  world.followShadow(G.cine ? camTarget : P.pos);
  world.followDust?.(camera.position);
  updateCamera(raw);
  updateObjective();
  G.hurtFx = Math.max(0, G.hurtFx - raw * 2);
  post.render(G.t, { spirit: G.spiritFx || 0, hurt: G.hurtFx, cine: !!G.cine && !G.cine.title, focus: G.focus });
  input.endFrame();
}
const CAM_MODES = { third: 'Third person', first: 'First person', second: 'Second person · Witness view' };
G.cycleCamera = (mode) => {
  const order = ['third', 'first', 'second'];
  G.camMode = mode || order[(order.indexOf(G.camMode) + 1) % 3];
  G.cam.yaw2 = 0;
  if (G.camMode !== 'second') G.cam.yaw = P.facing + Math.PI;
  save.settings.camMode = G.camMode; save.write();
  ui.hint(`Camera: ${CAM_MODES[G.camMode]}`, 1600);
};

// ---------------------------------------------------------------- Boot
G.updateObjective = updateObjective;
G.snapCamera = snapCamera;
G.sling = sling;
G.systems = createSystems(G);
G.setPlayer(V(10, 0, 170), Math.PI);
post.apply(save.settings.quality, world.sun);
camera.position.set(0, 60, 260); camera.lookAt(0, 0, 0);
renderer.compile(scene, camera);
frame();

// Home-screen backdrop: a slow drift over the Valley of Elah.
G.titleCam = () => { G.cine = { from: V(-120, 55, -20), to: V(120, 40, -50), lookFrom: V(0, 0, -100), lookTo: V(0, 0, -115), dur: 70, t: 0, ease: false, title: true }; };
G.titleCam();
G.menu = createMenu(G, {
  start: (part) => {
    audio.start();
    G.stats.start = performance.now();
    runStory(G, part);
  },
});
document.getElementById('again').addEventListener('click', () => location.reload());
