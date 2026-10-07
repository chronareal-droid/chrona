// Procedural, low-poly characters and creatures with code-driven animation.
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const shadow = (root) => { root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return root; };

function limb(len, r, m) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 2, 3, 8), m);
  mesh.position.y = -len / 2;
  pivot.add(mesh);
  return pivot;
}

/**
 * A robed humanoid. opts: skin, robe, sash, hair, beard, headwrap, height, build, armor
 * Returns { root, rig, animate(dt, speed, state) }.
 */
export function createHumanoid(opts = {}) {
  const o = {
    skin: 0xb98a64, robe: 0xd8c7a3, sash: 0x8c3b2a, hair: 0x2b1d14, beard: false, headwrap: null,
    height: 1.75, build: 1, armor: null, cape: null, ...opts,
  };
  const s = o.height / 1.75;
  const root = new THREE.Group();
  const body = new THREE.Group(); // scaled container
  body.scale.setScalar(s);
  root.add(body);

  const skinM = mat(o.skin), robeM = mat(o.robe), sashM = mat(o.sash), hairM = mat(o.hair, { roughness: 1 });
  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);

  // Robe skirt
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * o.build, 0.36 * o.build, 0.75, 10, 1, true), mat(o.robe, { side: THREE.DoubleSide }));
  skirt.position.y = -0.3; hips.add(skirt);

  const torso = new THREE.Group(); hips.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * o.build, 0.38, 4, 10), robeM);
  chest.position.y = 0.3; chest.scale.z = 0.75; torso.add(chest);
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.2 * o.build, 0.04, 6, 14), sashM);
  sash.rotation.x = Math.PI / 2; sash.position.y = 0.06; sash.scale.y = 0.78; torso.add(sash);

  if (o.armor) {
    const am = mat(o.armor, { metalness: 0.75, roughness: 0.35 });
    const plate = new THREE.Mesh(new THREE.CapsuleGeometry(0.235 * o.build, 0.34, 4, 10), am);
    plate.position.y = 0.32; plate.scale.z = 0.82; torso.add(plate);
    const skirtA = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * o.build, 0.34 * o.build, 0.3, 10, 1, true), mat(o.armor, { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
    skirtA.position.y = -0.1; hips.add(skirtA);
  }
  if (o.cape) {
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * o.build, 1.0, 1, 4), mat(o.cape, { side: THREE.DoubleSide }));
    cape.position.set(0, 0.05, -0.17); cape.rotation.x = 0.08; torso.add(cape);
  }

  const neck = new THREE.Group(); neck.position.y = 0.62; torso.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skinM);
  head.position.y = 0.12; head.scale.set(0.95, 1.1, 1); neck.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
  hair.position.y = 0.14; hair.rotation.x = -0.25; neck.add(hair);
  if (o.beard) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), mat(o.beard === true ? o.hair : o.beard, { roughness: 1 }));
    b.position.set(0, 0.0, 0.07); b.rotation.x = Math.PI + 0.35; neck.add(b);
  }
  if (o.headwrap) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(o.headwrap));
    w.position.y = 0.15; neck.add(w);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.4), mat(o.headwrap, { side: THREE.DoubleSide }));
    tail.position.set(0, 0.0, -0.13); neck.add(tail);
  }
  if (o.crown) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.08, 10, 1, true), mat(0xd9a93b, { metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide }));
    c.position.y = 0.25; neck.add(c);
  }
  // Eyes give a sense of facing
  const eyeM = mat(0x1a120c);
  [-0.045, 0.045].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), eyeM); e.position.set(x, 0.14, 0.118); neck.add(e); });

  const shoulderY = 0.52;
  const armL = limb(0.3, 0.055 * o.build, robeM), armR = limb(0.3, 0.055 * o.build, robeM);
  armL.position.set(0.25 * o.build, shoulderY, 0); armR.position.set(-0.25 * o.build, shoulderY, 0);
  torso.add(armL, armR);
  const foreL = limb(0.28, 0.045 * o.build, skinM), foreR = limb(0.28, 0.045 * o.build, skinM);
  foreL.position.y = -0.3; foreR.position.y = -0.3;
  armL.add(foreL); armR.add(foreR);
  const handR = new THREE.Group(); handR.position.y = -0.28; foreR.add(handR);
  const handL = new THREE.Group(); handL.position.y = -0.28; foreL.add(handL);

  const legL = limb(0.48, 0.07 * o.build, skinM), legR = limb(0.48, 0.07 * o.build, skinM);
  legL.position.set(0.1, -0.02, 0); legR.position.set(-0.1, -0.02, 0);
  hips.add(legL, legR);
  const shinL = limb(0.46, 0.055 * o.build, skinM), shinR = limb(0.46, 0.055 * o.build, skinM);
  shinL.position.y = -0.48; shinR.position.y = -0.48;
  legL.add(shinL); legR.add(shinR);
  const sandal = mat(0x4a3220);
  [shinL, shinR].forEach((sh) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.22), sandal); f.position.set(0, -0.47, 0.05); sh.add(f); });

  shadow(root);
  const rig = { hips, torso, neck, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, handR, handL, scale: s };

  let phase = Math.random() * 10, t = 0;
  const pose = { swing: 0, throw: 0, aim: 0, kneel: 0, sling: 0, fallen: 0, lookUp: 0, talk: 0, cheer: 0, ride: 0, pray: 0, preach: 0, cower: 0 };
  const animate = (dt, speed = 0) => {
    t += dt;
    const moving = Math.min(1, speed / 2.2);
    phase += dt * (2 + speed * 2.3);
    const sw = Math.sin(phase) * moving;
    const run = Math.min(1, Math.max(0, (speed - 3) / 3));
    legL.rotation.x = sw * (0.7 + run * 0.3); legR.rotation.x = -sw * (0.7 + run * 0.3);
    shinL.rotation.x = Math.max(0, -Math.sin(phase + 0.9)) * 1.1 * moving + pose.kneel * 1.6;
    shinR.rotation.x = Math.max(0, Math.sin(phase + 0.9)) * 1.1 * moving;
    legL.rotation.x -= pose.kneel * 1.4;
    hips.position.y = 0.95 + Math.abs(Math.cos(phase)) * 0.05 * moving - pose.kneel * 0.38;
    legL.rotation.z = pose.ride * 0.5; legR.rotation.z = -pose.ride * 0.5;
    if (pose.ride > 0.5) { legL.rotation.x = legR.rotation.x = -1.25; shinL.rotation.x = shinR.rotation.x = 1.2; hips.position.y = 0.95; }
    if (pose.pray > 0 || pose.cower > 0) { // kneel on both knees
      const k = Math.max(pose.pray, pose.cower);
      legL.rotation.x = legR.rotation.x = -0.15 * k; shinL.rotation.x = shinR.rotation.x = 1.55 * k; hips.position.y = 0.95 - 0.42 * k;
    }
    torso.rotation.x = run * 0.25 + Math.sin(t * 1.6) * 0.012 + pose.kneel * 0.15 + pose.cower * 0.55 + pose.pray * 0.12;
    torso.rotation.z = Math.sin(phase) * 0.04 * moving;
    neck.rotation.x = -pose.lookUp * 0.5 + Math.sin(t * 9) * 0.04 * pose.talk;

    // Arms: walk swing blended with actions
    let aLx = -sw * 0.6, aRx = sw * 0.6, aLz = 0.12, aRz = -0.12, fLx = -0.25, fRx = -0.25;
    aLx = aLx * (1 - pose.cheer) - 2.8 * pose.cheer; aRx = aRx * (1 - pose.cheer) - 2.8 * pose.cheer;
    if (pose.swing > 0) { // staff strike: wind up then sweep
      const k = pose.swing;
      aRx = -2.4 * Math.sin(k * Math.PI) + 0.4 * k; aRz = -0.3 - Math.sin(k * Math.PI) * 0.6; fRx = -0.6;
      torso.rotation.y = Math.sin(k * Math.PI) * -0.6;
    } else torso.rotation.y = 0;
    if (pose.aim > 0) { // sling whirling overhead
      const a = pose.aim;
      aRx = aRx * (1 - a) + -2.9 * a; aRz = aRz * (1 - a) + -0.4 * a;
      fRx = fRx * (1 - a) + (-0.3 + Math.sin(t * 22) * 0.4) * a;
      aLx = aLx * (1 - a) + -1.3 * a; aLz = aLz * (1 - a) + 0.2 * a;
    }
    if (pose.throw > 0) { const k = pose.throw; aRx = -2.9 + k * 3.6; fRx = -0.2; }
    if (pose.pray > 0) { const k = pose.pray; aLx = aLx * (1 - k) - 1.1 * k; aRx = aRx * (1 - k) - 1.1 * k; aLz = 0.12 - 0.5 * k; aRz = -0.12 + 0.5 * k; fLx = fRx = -1.3 * k; }
    if (pose.preach > 0) { const k = pose.preach, w = Math.sin(t * 2.2); aRx = aRx * (1 - k) + (-2.2 + w * 0.5) * k; aRz = aRz * (1 - k) - 0.5 * k; fRx = -0.4 * k; aLx = aLx * (1 - k) + (-0.9 - w * 0.3) * k; aLz = 0.12 + 0.4 * k; }
    if (pose.cower > 0) { const k = pose.cower; aLx = aLx * (1 - k) - 1.6 * k; aRx = aRx * (1 - k) - 1.6 * k; fLx = fRx = -1.8 * k; }
    armL.rotation.set(aLx, 0, aLz); armR.rotation.set(aRx, 0, aRz);
    foreL.rotation.x = fLx; foreR.rotation.x = fRx;
    body.rotation.x = pose.fallen * Math.PI / 2; // falls forward, on his face
    body.position.y = pose.fallen * 0.25 * s;
  };
  return { root, rig, pose, animate };
}

export function createSheep() {
  const root = new THREE.Group();
  const wool = mat(0xf0e8da, { roughness: 1, flatShading: true });
  const dark = mat(0x2e2620);
  const body = new THREE.Group(); body.position.y = 0.55; root.add(body);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.06, 1), wool);
    b.position.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.3) * 0.15, (i / 6 - 0.5) * 0.7);
    body.add(b);
  }
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 3, 6), dark);
  head.rotation.x = 1.1; head.position.set(0, 0.12, 0.5); body.add(head);
  const ears = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.08), dark);
  ears.position.set(0, 0.2, 0.46); body.add(ears);
  const legs = [];
  [[-0.14, 0.25], [0.14, 0.25], [-0.14, -0.25], [0.14, -0.25]].forEach(([x, z]) => {
    const l = limb(0.4, 0.035, dark); l.position.set(x, 0.42, z); root.add(l); legs.push(l);
  });
  shadow(root);
  let ph = Math.random() * 6;
  const animate = (dt, speed) => {
    ph += dt * (3 + speed * 5);
    const m = Math.min(1, speed);
    legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.5 * m; });
    body.position.y = 0.55 + Math.abs(Math.sin(ph)) * 0.03 * m;
    head.rotation.x = 1.1 + (speed < 0.1 ? 0.6 + Math.sin(ph * 0.3) * 0.2 : 0);
  };
  return { root, animate, head };
}

export function createLion() {
  const root = new THREE.Group();
  const fur = mat(0xb8874a), mane = mat(0x6a4426, { roughness: 1, flatShading: true });
  const body = new THREE.Group(); body.position.y = 0.85; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.1, 4, 10), fur);
  torso.rotation.x = Math.PI / 2; body.add(torso);
  const headG = new THREE.Group(); headG.position.set(0, 0.25, 0.85); body.add(headG);
  const maneM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mane); maneM.scale.set(1, 1, 0.8); headG.add(maneM);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), fur); face.position.z = 0.25; headG.add(face);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), mat(0xc79a62)); snout.position.set(0, -0.06, 0.5); headG.add(snout);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), mat(0x7a2e22)); jaw.position.set(0, -0.16, 0.45); headG.add(jaw);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffd040 });
  [-0.1, 0.1].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeM); e.position.set(x, 0.07, 0.5); headG.add(e); });
  const legs = [];
  [[-0.22, 0.55], [0.22, 0.55], [-0.22, -0.55], [0.22, -0.55]].forEach(([x, z]) => {
    const l = limb(0.8, 0.09, fur); l.position.set(x, 0.75, z); root.add(l); legs.push(l);
  });
  const tail = limb(0.9, 0.04, fur); tail.position.set(0, 0.2, -0.75); tail.rotation.x = -2.3; body.add(tail);
  shadow(root);
  let ph = 0, t = 0;
  const pose = { crouch: 0, pounce: 0, hurt: 0, dead: 0 };
  const animate = (dt, speed) => {
    t += dt; ph += dt * (2 + speed * 1.6);
    const m = Math.min(1, speed / 2);
    legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2) * Math.PI + (i > 1 ? 1.2 : 0)) * 0.6 * m - pose.pounce * (i < 2 ? 1 : -0.8); });
    body.position.y = 0.85 - pose.crouch * 0.35 + Math.abs(Math.sin(ph)) * 0.06 * m;
    body.rotation.x = -pose.pounce * 0.4 + pose.crouch * 0.12;
    tail.rotation.z = Math.sin(t * 3) * 0.4;
    jaw.position.y = -0.16 - pose.crouch * 0.06 - pose.pounce * 0.08;
    body.rotation.z = pose.dead * 1.5;
    body.position.x = pose.dead * 0.4;
    if (pose.dead) legs.forEach((l) => { l.visible = pose.dead < 0.5; });
    body.traverse((c) => { if (c.material && c.material.emissive) c.material.emissive.setRGB(pose.hurt * 0.6, 0, 0); });
  };
  return { root, animate, pose, headG };
}

/** Goliath of Gath: "six cubits and a span", bronze helmet, coat of mail, spear like a weaver's beam. */
export function createGoliath() {
  const h = createHumanoid({ skin: 0x9c6c4a, robe: 0x4b2a22, sash: 0x2b1b14, hair: 0x140c08, beard: 0x140c08, height: 3.1, build: 1.35, armor: 0x9a7a3c, cape: 0x6e1b14 });
  const bronze = mat(0xb08a3e, { metalness: 0.85, roughness: 0.3 });
  // Helmet with a crest; the brow beneath is the one weak point.
  const helm = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), bronze);
  dome.position.y = 0.15; helm.add(dome);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.3), mat(0x8a1a12));
  crest.position.y = 0.3; helm.add(crest);
  const cheek = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 12, 1, true, Math.PI * 0.75, Math.PI * 1.5), bronze);
  cheek.position.y = 0.08; helm.add(cheek);
  h.rig.neck.add(helm);
  // A glowing mark on the brow when exposed (the brow is the weak point)
  const brow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0 }));
  brow.position.set(0, 0.17, 0.12); h.rig.neck.add(brow);
  // Spear and shield
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.6, 8), mat(0x5a3e26));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 6), mat(0x8c8c8c, { metalness: 0.9, roughness: 0.3 }));
  tip.position.y = 1.45; spear.add(shaft, tip);
  spear.rotation.x = Math.PI / 2; spear.position.y = -0.05;
  h.rig.handR.add(spear);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 20), bronze);
  shield.rotation.z = Math.PI / 2; shield.position.set(0.08, -0.05, 0.05);
  h.rig.handL.add(shield);
  shadow(h.root);
  return { ...h, helm, brow, spear, shield };
}

export function createSpearProjectile() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 8, 8), mat(0x5a3e26));
  shaft.rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 6), mat(0x8c8c8c, { metalness: 0.9, roughness: 0.3 }));
  tip.rotation.x = Math.PI / 2; tip.position.z = 4.5;
  g.add(shaft, tip);
  return shadow(g);
}

export function createStaff() {
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.7, 6), mat(0x6b4a2a));
  s.castShadow = true;
  const crook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 10, Math.PI), mat(0x6b4a2a));
  crook.position.y = 0.85; crook.position.x = 0.1;
  s.add(crook);
  return s;
}

/** Ridable quadruped: donkey, camel. */
export function createQuadruped(kind = 'donkey') {
  const cfg = kind === 'camel'
    ? { color: 0xc49a62, len: 1.5, girth: 0.45, leg: 1.35, neck: 1.0, hump: true, ears: 0.08, head: 0.18 }
    : { color: 0x7d7166, len: 1.0, girth: 0.34, leg: 0.75, neck: 0.55, hump: false, ears: 0.26, head: 0.15 };
  const root = new THREE.Group();
  const fur = mat(cfg.color, { roughness: 0.95 }), dark = mat(0x2a221c), belly = mat(kind === 'camel' ? 0xd8b582 : 0xbdb3a6);
  const body = new THREE.Group(); body.position.y = cfg.leg + cfg.girth * 0.6; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.girth, cfg.len, 4, 12), fur);
  torso.rotation.x = Math.PI / 2; body.add(torso);
  const under = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.girth * 0.85, cfg.len * 0.8, 3, 10), belly);
  under.rotation.x = Math.PI / 2; under.position.y = -cfg.girth * 0.2; under.scale.set(0.95, 1, 0.9); body.add(under);
  if (cfg.hump) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), fur); h.scale.set(1, 0.9, 1.3); h.position.y = cfg.girth * 0.9; body.add(h); }
  // Saddle blanket
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(cfg.girth * 2.3, 0.05, 0.7), mat(kind === 'camel' ? 0x8c2a2a : 0x2b4f8a));
  blanket.position.set(0, cfg.girth + (cfg.hump ? 0.5 : 0.02), -0.05); body.add(blanket);
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(cfg.girth * 2.35, 0.25, 0.68), mat(0xd9a93b));
  fringe.position.set(0, cfg.girth - 0.08 + (cfg.hump ? 0.5 : 0), -0.05); fringe.scale.y = 0.4; body.add(fringe);
  const neck = new THREE.Group(); neck.position.set(0, cfg.girth * 0.4, cfg.len / 2 + cfg.girth * 0.6); body.add(neck);
  const nm = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.girth * 0.42, cfg.neck, 3, 8), fur);
  nm.position.y = cfg.neck / 2; neck.add(nm); neck.rotation.x = kind === 'camel' ? 0.2 : 0.55;
  const head = new THREE.Group(); head.position.y = cfg.neck + 0.05; neck.add(head);
  const skull = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.head, cfg.head * 2.2, 3, 8), fur);
  skull.rotation.x = Math.PI / 2 - (kind === 'camel' ? 0.2 : 0.9); skull.position.z = cfg.head; head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(cfg.head * 0.85, 8, 8), belly);
  muzzle.position.set(0, kind === 'camel' ? 0.0 : -0.2, cfg.head * 2.4); head.add(muzzle);
  [-1, 1].forEach((sx) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, cfg.ears, 5), fur);
    ear.position.set(sx * 0.09, cfg.head * 0.9, 0); ear.rotation.z = -sx * 0.3; head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dark); eye.position.set(sx * cfg.head * 0.8, 0.04, cfg.head * 1.1); head.add(eye);
  });
  const legs = [];
  const lz = cfg.len / 2 + 0.05;
  [[-1, lz], [1, lz], [-1, -lz], [1, -lz]].forEach(([sx, z]) => {
    const l = limb(cfg.leg, 0.07, fur); l.position.set(sx * cfg.girth * 0.6, cfg.leg + 0.05, z); root.add(l); legs.push(l);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8), dark); hoof.position.y = -cfg.leg + 0.03; l.add(hoof);
  });
  const tail = limb(0.5, 0.03, dark); tail.position.set(0, cfg.girth * 0.3, -cfg.len / 2 - cfg.girth * 0.8); tail.rotation.x = 0.4; body.add(tail);
  // Panniers of bread & cheese (donkey)
  const packs = new THREE.Group();
  if (kind === 'donkey') {
    [-1, 1].forEach((sx) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.38, 10), mat(0xa47b48)); b.position.set(sx * (cfg.girth + 0.12), -0.05, -0.25); packs.add(b); });
    body.add(packs);
  }
  shadow(root);
  const saddle = new THREE.Object3D(); saddle.position.set(0, cfg.girth + (cfg.hump ? 0.55 : 0.05), -0.1); body.add(saddle);
  let ph = Math.random() * 6, t = 0;
  const animate = (dt, speed) => {
    t += dt; ph += dt * (1.5 + speed * 1.5);
    const m = Math.min(1, speed / 2);
    const gallop = Math.min(1, Math.max(0, (speed - 6) / 3));
    legs.forEach((l, i) => {
      const off = gallop > 0.5 ? (i < 2 ? 0 : Math.PI * 0.8) + (i % 2) * 0.3 : (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0);
      l.rotation.x = Math.sin(ph + off) * (0.45 + gallop * 0.25) * m;
    });
    body.position.y = cfg.leg + cfg.girth * 0.6 + Math.abs(Math.sin(ph)) * (0.04 + gallop * 0.08) * m;
    body.rotation.x = Math.sin(ph) * 0.04 * gallop;
    neck.rotation.x = (kind === 'camel' ? 0.2 : 0.55) + Math.sin(ph) * 0.08 * m + (speed < 0.1 ? Math.sin(t * 0.5) * 0.15 + 0.2 : 0);
    tail.rotation.z = Math.sin(t * 2.3) * 0.3;
  };
  return { root, animate, saddle, packs, height: cfg.leg };
}

/** A dove of light: "the Spirit of the LORD came upon David" (1 Samuel 16:13). */
export function createDove() {
  const root = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow); body.scale.set(0.8, 0.7, 1.6); root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glow); head.position.set(0, 0.06, 0.2); root.add(head);
  const wingG = new THREE.PlaneGeometry(0.5, 0.22); wingG.translate(0.25, 0, 0);
  const wl = new THREE.Mesh(wingG, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  const wr = wl.clone(); wr.scale.x = -1;
  wl.rotation.x = wr.rotation.x = -Math.PI / 2;
  root.add(wl, wr);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
  root.add(halo);
  const light = new THREE.PointLight(0xffe2a0, 6, 12, 1.6); root.add(light);
  let t = 0;
  const animate = (dt) => { t += dt; const f = Math.sin(t * 9) * 0.7; wl.rotation.y = f; wr.rotation.y = -f; halo.scale.setScalar(1 + Math.sin(t * 3) * 0.15); };
  return { root, animate, light };
}
