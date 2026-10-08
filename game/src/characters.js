// Procedural, low-poly characters and creatures with code-driven animation.
import * as THREE from 'three';

// Materials are shared per colour so a crowd of sixty people compiles only a few shaders.
const matCache = new Map();
const mat = (color, o = {}) => {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }));
  return matCache.get(key);
};
// Skin: soft sheen approximates light scattering through skin.
const skinMat = (color) => {
  const key = 'skin' + color;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xff9a7a) }));
  return matCache.get(key);
};
const shadow = (root) => { root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return root; };
const nz = (x, y, z) => Math.sin(x * 61.7 + y * 13.1) * Math.cos(z * 47.3 - y * 29.9) * 0.5 + Math.sin(x * 23.3 - z * 31.1 + y * 57.7) * 0.5;

// Old capsule limb, still used by the animals.
function limb(len, r, m) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 2, 3, 8), m);
  mesh.position.y = -len / 2;
  pivot.add(mesh);
  return pivot;
}

/** A muscled limb: a lathe whose radius follows profile(t) (t = 0 at the joint, 1 at the far end). */
function muscleLimb(len, profile, m, segs = 14) {
  const pivot = new THREE.Group();
  const pts = [];
  const N = 12;
  pts.push(new THREE.Vector2(0.0001, 0));
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push(new THREE.Vector2(profile(t), -t * len)); }
  pts.push(new THREE.Vector2(0.0001, -len));
  const g = new THREE.LatheGeometry(pts, segs);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, m);
  pivot.add(mesh);
  // a joint ball hides the seam when the limb bends
  const ball = new THREE.Mesh(new THREE.SphereGeometry(profile(0) * 0.98, 12, 10), m);
  pivot.add(ball);
  return pivot;
}
const bulge = (r0, r1, peak, at = 0.35, w = 0.3) => (t) => THREE.MathUtils.lerp(r0, r1, t) + peak * Math.exp(-((t - at) ** 2) / (w * w * 0.5));

/** A sculpted head: jaw, chin, cheekbones, brow ridge, eye sockets and nose, shaped from a sphere. */
function sculptHead(skin, female) {
  const R = 0.115;
  const g = new THREE.SphereGeometry(R, 40, 30);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) / R, y = p.getY(i) / R, z = p.getZ(i) / R;
    x *= 0.86; y *= 1.12;
    if (z < 0) z *= 1.1;                                          // fuller back of the skull
    if (y < 0) { const k = -y; x *= 1 - 0.32 * k * k; z *= 1 - 0.12 * k; if (z > 0) z += 0.06 * k; } // jaw narrows to the chin
    if (z > 0.3) {
      z += 0.20 * Math.exp(-((x / 0.13) ** 2) - (((y + 0.05) / 0.22) ** 2)) * (female ? 0.8 : 1);   // nose
      z += 0.05 * Math.exp(-(((y - 0.24) / 0.07) ** 2)) * (Math.abs(x) < 0.55 ? 1 : 0) * (female ? 0.5 : 1); // brow ridge
      z -= 0.07 * Math.exp(-(((Math.abs(x) - 0.33) / 0.13) ** 2) - (((y - 0.12) / 0.1) ** 2));    // eye sockets
      x *= 1 + 0.05 * Math.exp(-(((y - 0.0) / 0.18) ** 2));       // cheekbones
      z -= 0.03 * Math.exp(-((x / 0.25) ** 2) - (((y + 0.42) / 0.05) ** 2));  // mouth line
    }
    p.setXYZ(i, x * R, y * R, z * R);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, skin);
}
/** Hair or beard shell: the head shape, inflated, with vertices outside the region pulled inside. */
function shell(keep, scale, m, curl = 0.012) {
  const R = 0.115;
  const g = new THREE.SphereGeometry(R, 32, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) / R, y = p.getY(i) / R, z = p.getZ(i) / R;
    const inside = !keep(x, y, z);
    x *= 0.86; y *= 1.12; if (z < 0) z *= 1.1;
    if (y < 0) { const k = -y; x *= 1 - 0.32 * k * k; z *= 1 - 0.12 * k; if (z > 0) z += 0.06 * k; }
    const sc = inside ? 0.85 : scale + nz(x, y, z) * curl * 4;
    p.setXYZ(i, x * R * sc, y * R * sc, z * R * sc);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}
function hand(skin) {
  const h = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), skin); palm.scale.set(0.95, 1.15, 0.45); palm.position.y = -0.045; h.add(palm);
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.05 - Math.abs(k - 1.5) * 0.008, 3, 6), skin);
    f.position.set(-0.027 + k * 0.018, -0.115 + Math.abs(k - 1.5) * 0.006, 0.006); f.rotation.x = 0.25; h.add(f);
  }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 3, 6), skin); th.position.set(0.04, -0.06, 0.02); th.rotation.set(0.4, 0, -0.6); h.add(th);
  return h;
}
function foot(skin, sandal) {
  const f = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), skin); top.scale.set(0.95, 0.6, 2.3); top.position.set(0, 0.02, 0.06); f.add(top);
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.26), sandal); sole.position.set(0, -0.012, 0.06); f.add(sole);
  [0.0, 0.1].forEach((z) => { const st = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 5, 14, Math.PI), sandal); st.position.set(0, 0.0, z); st.rotation.y = Math.PI / 2; f.add(st); });
  return f;
}
/** A robe skirt with hanging folds, pivoted at the waist. */
function robeSkirt(rTop, rBot, len, m) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, 36, 8, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), t = 0.5 - y / len; // 0 at waist, 1 at hem
    const fold = 1 + Math.sin(a * 9 + Math.sin(a * 3) * 0.8) * 0.06 * t + Math.sin(a * 17) * 0.015 * t;
    p.setXYZ(i, x * fold, y - len / 2 - (Math.sin(a * 5) * 0.012 * t), z * fold);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}

/**
 * A robed humanoid. opts: skin, robe, sash, hair, beard, headwrap, height, build, armor, female
 * Returns { root, rig, animate(dt, speed, state) }.
 */
export function createHumanoid(opts = {}) {
  const o = {
    skin: 0xb98a64, robe: 0xd8c7a3, sash: 0x8c3b2a, hair: 0x2b1d14, beard: false, headwrap: null,
    height: 1.75, build: 1, armor: null, cape: null, ...opts,
  };
  if (o.female == null) o.female = o.beard === false && /Mary|Tirzah|widow|woman/i.test(o.name || '') ;
  const s = o.height / 1.75, b = o.build, fem = o.female;
  const root = new THREE.Group();
  const body = new THREE.Group(); // scaled container
  body.scale.setScalar(s);
  root.add(body);

  const skinM = skinMat(o.skin), robeM = mat(o.robe, { roughness: 0.95 }), robeDS = mat(o.robe, { roughness: 0.95, side: THREE.DoubleSide });
  const sashM = mat(o.sash), hairM = mat(o.hair, { roughness: 0.9 });
  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);

  // Robe skirt with folds, swinging from the waist; ankle length for women and elders.
  const long = fem || o.longRobe || o.beard === 0xeeeae2 || o.beard === 0xf8f6f0;
  const skirtLen = long ? 0.86 : 0.62;
  const skirt = robeSkirt(0.19 * b, (fem ? 0.36 : 0.33) * b, skirtLen, robeDS);
  skirt.position.y = 0.07; hips.add(skirt);

  const torso = new THREE.Group(); hips.add(torso);
  // Chest and waist as one lathe: narrow waist, broad ribcage, shoulders.
  const chestPts = [];
  const prof = (t) => (fem ? 0.165 : 0.18) * b * (0.86 + 0.22 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9)) * (t > 0.85 ? 1 - (t - 0.85) * 3.2 : 1);
  for (let i = 0; i <= 14; i++) { const t = i / 14; chestPts.push(new THREE.Vector2(Math.max(0.02, prof(t)), -0.02 + t * 0.62)); }
  const chestG = new THREE.LatheGeometry(chestPts, 24); chestG.scale(1, 1, fem ? 0.78 : 0.72);
  const chest = new THREE.Mesh(chestG, robeM); torso.add(chest);
  // V neckline shows skin at the collar
  const collar = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), skinM); collar.scale.set(1.1, 1.1, 0.35); collar.position.set(0, 0.56, 0.1); torso.add(collar);
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.168 * b, 0.026, 8, 24), sashM);
  sash.rotation.x = Math.PI / 2; sash.position.y = 0.05; sash.scale.y = 0.74; torso.add(sash);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), sashM); knot.position.set(0.07, -0.04, 0.12); knot.rotation.z = 0.15; torso.add(knot);

  if (o.armor) {
    const am = mat(o.armor, { metalness: 0.75, roughness: 0.35 });
    const plateG = chestG.clone(); plateG.scale(1.09, 0.8, 1.12);
    const plate = new THREE.Mesh(plateG, am); plate.position.y = 0.12; torso.add(plate);
    const strips = new THREE.Group();
    for (let k = 0; k < 12; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.015), am); const a = (k / 12) * Math.PI * 2; st.position.set(Math.sin(a) * 0.21 * b, -0.14, Math.cos(a) * 0.17 * b); st.rotation.y = a; strips.add(st); }
    hips.add(strips);
  }
  if (o.cape) {
    const cg = new THREE.PlaneGeometry(0.42 * b, 1.05, 4, 8);
    const cp = cg.attributes.position;
    for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i); cp.setZ(i, -Math.cos(x * 9) * 0.02 - (0.5 - y) * 0.06); }
    cg.computeVertexNormals();
    const cape = new THREE.Mesh(cg, mat(o.cape, { side: THREE.DoubleSide, roughness: 0.95 }));
    cape.position.set(-0.04, 0.03, -0.12); cape.rotation.set(0.08, 0, 0.12); torso.add(cape); // mantle over one shoulder
    const drape = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 16, Math.PI), mat(o.cape, { roughness: 0.95 }));
    drape.position.set(0.02, 0.45, 0); drape.rotation.set(0.2, 0.3, -0.9); torso.add(drape);
  }

  const neck = new THREE.Group(); neck.position.y = 0.6; torso.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), skinM); neckM.position.y = 0.02; neck.add(neckM);
  const headG = new THREE.Group(); headG.position.y = 0.13; neck.add(headG);
  const head = sculptHead(skinM, fem); headG.add(head);
  // Ears
  [-1, 1].forEach((sx) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinM); e.scale.set(0.45, 1.25, 0.8); e.position.set(sx * 0.1, 0.0, -0.005); headG.add(e); });
  // Eyes: white, iris, pupil; brows; lips
  const white = mat(0xf2ece0, { roughness: 0.3 }), iris = mat(o.eyes || 0x4a2e18, { roughness: 0.2 }), pupil = mat(0x080604, { roughness: 0.1 });
  [-1, 1].forEach((sx) => {
    const ex = sx * 0.035, ey = 0.016, ez = 0.096;
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 10), white); w.position.set(ex, ey, ez); headG.add(w);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.0072, 10, 8), iris); ir.position.set(ex, ey, ez + 0.0085); ir.scale.z = 0.5; headG.add(ir);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 8, 6), pupil); pu.position.set(ex, ey, ez + 0.0118); headG.add(pu);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0132, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), skinM); lid.position.set(ex, ey + 0.001, ez); lid.rotation.x = 0.35; headG.add(lid);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, fem ? 0.005 : 0.008, 0.008), hairM); brow.position.set(sx * 0.036, 0.038, 0.108); brow.rotation.z = -sx * 0.12; headG.add(brow);
  });
  const lips = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6), mat(new THREE.Color(o.skin).lerp(new THREE.Color(0x9a3a32), 0.45).getHex(), { roughness: 0.5 }));
  lips.scale.set(1.2, 0.42, 0.55); lips.position.set(0, -0.052, 0.103); headG.add(lips);

  // Hair: short and curled, or long down the back (women, and Jesus' look)
  const longHair = fem || o.longHair;
  // keep the face open: nothing in front (z > 0.25) below the hairline
  const face = (x, y, z) => z > 0.25 && y < 0.45 && y > -0.95;
  headG.add(shell((x, y, z) => !face(x, y, z) && (y > 0.42 || (z < 0.25 && y > (longHair ? -0.9 : -0.2))), 1.07, hairM, longHair ? 0.006 : 0.014));
  if (longHair) { const back = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.26, 12, 1, true, Math.PI * 0.6, Math.PI * 0.8), mat(o.hair, { roughness: 0.9, side: THREE.DoubleSide })); back.position.set(0, -0.12, -0.035); back.rotation.y = Math.PI; headG.add(back); }
  if (o.beard) {
    const beardM = mat(o.beard === true ? o.hair : o.beard, { roughness: 1 });
    headG.add(shell((x, y, z) => y < -0.12 && z > -0.25 && !(z > 0.6 && y > -0.52 && y < -0.36 && Math.abs(x) < 0.2), 1.05, beardM, 0.016));
    const mous = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 5, 12, Math.PI), beardM); mous.position.set(0, -0.043, 0.106); mous.rotation.z = Math.PI; headG.add(mous);
  }
  if (o.headwrap) {
    const wrapM = mat(o.headwrap, { roughness: 0.95 });
    headG.add(shell((x, y, z) => !(z > 0.2 && y < 0.5) && (y > 0.05 || (z < 0.2 && y > -0.7)), 1.13, wrapM, 0.01));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.012, 6, 22), mat(o.sash)); band.rotation.x = Math.PI / 2 - 0.15; band.position.y = 0.055; headG.add(band);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.36, 2, 4), mat(o.headwrap, { side: THREE.DoubleSide, roughness: 0.95 }));
    tail.position.set(0, -0.13, -0.11); tail.rotation.x = 0.12; headG.add(tail);
  }
  if (o.crown) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.108, 0.06, 16, 1, true), mat(0xd9a93b, { metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide }));
    c.position.y = 0.12; headG.add(c);
    for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 5), mat(0xd9a93b, { metalness: 0.9, roughness: 0.25 })); const a = (k / 8) * Math.PI * 2; sp.position.set(Math.sin(a) * 0.112, 0.17, Math.cos(a) * 0.105); headG.add(sp); }
  }

  // Arms: deltoid and biceps under a wide sleeve, tapering forearm, real hands.
  const shoulderY = 0.5, sw = (fem ? 0.21 : 0.235) * b;
  const armL = muscleLimb(0.29, bulge(0.05 * b, 0.04 * b, 0.012 * b, 0.25), robeM), armR = muscleLimb(0.29, bulge(0.05 * b, 0.04 * b, 0.012 * b, 0.25), robeM);
  armL.position.set(sw, shoulderY, 0); armR.position.set(-sw, shoulderY, 0);
  [armL, armR].forEach((a) => { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * b, 0.085 * b, 0.22, 14, 1, true), robeDS); sl.position.y = -0.14; a.add(sl); });
  torso.add(armL, armR);
  const foreL = muscleLimb(0.27, bulge(0.04 * b, 0.026 * b, 0.008 * b, 0.25), skinM), foreR = muscleLimb(0.27, bulge(0.04 * b, 0.026 * b, 0.008 * b, 0.25), skinM);
  foreL.position.y = -0.29; foreR.position.y = -0.29;
  armL.add(foreL); armR.add(foreR);
  const handR = new THREE.Group(); handR.position.y = -0.27; foreR.add(handR);
  const handL = new THREE.Group(); handL.position.y = -0.27; foreL.add(handL);
  handR.add(hand(skinM)); const hl = hand(skinM); hl.scale.x = -1; handL.add(hl);

  // Legs: thigh and calf with muscle shape, sandalled feet.
  const legL = muscleLimb(0.47, bulge(0.075 * b, 0.05 * b, 0.012 * b, 0.3), skinM), legR = muscleLimb(0.47, bulge(0.075 * b, 0.05 * b, 0.012 * b, 0.3), skinM);
  legL.position.set(0.095 * b, -0.02, 0); legR.position.set(-0.095 * b, -0.02, 0);
  hips.add(legL, legR);
  const shinL = muscleLimb(0.45, bulge(0.05 * b, 0.032 * b, 0.016 * b, 0.28, 0.25), skinM), shinR = muscleLimb(0.45, bulge(0.05 * b, 0.032 * b, 0.016 * b, 0.28, 0.25), skinM);
  shinL.position.y = -0.47; shinR.position.y = -0.47;
  legL.add(shinL); legR.add(shinR);
  const sandal = mat(0x4a3220);
  [shinL, shinR].forEach((sh) => { const f = foot(skinM, sandal); f.position.set(0, -0.455, 0); sh.add(f); });

  shadow(root);
  const rig = { hips, torso, neck, head: headG, armL, armR, foreL, foreR, legL, legR, shinL, shinR, handR, handL, skirt, scale: s };

  let phase = Math.random() * 10, t = 0;
  const pose = { swing: 0, throw: 0, aim: 0, kneel: 0, sling: 0, fallen: 0, lookUp: 0, talk: 0, cheer: 0, ride: 0, pray: 0, preach: 0, cower: 0, cross: 0, carry: 0, reach: 0, shove: 0, bless: 0, sit: 0 };
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
    if (pose.reach > 0) { const k = pose.reach; aRx = aRx * (1 - k) - 1.35 * k; aRz = aRz * (1 - k) + 0.05 * k; fRx = fRx * (1 - k) - 0.35 * k; } // hand outstretched to touch
    if (pose.shove > 0) { const k = Math.sin(Math.min(1, pose.shove) * Math.PI); aLx = -1.5 * k + aLx * (1 - k); aRx = -1.5 * k + aRx * (1 - k); aLz = 0.15; aRz = -0.15; fLx = fRx = -0.15; torso.rotation.x += 0.25 * k; } // both arms drive forward
    if (pose.bless > 0) { const k = pose.bless; aLx = aLx * (1 - k) - 2.4 * k; aRx = aRx * (1 - k) - 2.4 * k; aLz = 0.12 + 0.5 * k; aRz = -0.12 - 0.5 * k; fLx = fRx = -0.2 * k; } // hands raised
    if (pose.sit > 0) { const k = pose.sit; legL.rotation.x = legR.rotation.x = -1.4 * k; shinL.rotation.x = shinR.rotation.x = 1.5 * k; hips.position.y = 0.95 - 0.55 * k; } // sitting on the ground
    if (pose.carry > 0) { aLx = -0.25; aRx = -0.25; aLz = 1.3; aRz = -1.3; fLx = fRx = -1.0; torso.rotation.x += 0.28; } // arms along the beam across his shoulders
    if (pose.cross > 0) { aLx = 0; aRx = 0; aLz = 1.45; aRz = -1.45; fLx = fRx = 0; legL.rotation.x = legR.rotation.x = 0; shinL.rotation.x = shinR.rotation.x = 0; neck.rotation.x = 0.35; }
    armL.rotation.set(aLx, 0, aLz); armR.rotation.set(aRx, 0, aRz);
    foreL.rotation.x = fLx; foreR.rotation.x = fRx;
    body.rotation.x = pose.fallen * Math.PI / 2; // falls forward, on his face
    body.position.y = pose.fallen * 0.25 * s;
  };
  return { root, rig, pose, animate };
}

// Shared sheep geometry: one lumpy fleece, one sculpted head, built once for the whole flock.
let SHEEP = null;
function sheepParts() {
  if (SHEEP) return SHEEP;
  const fleece = new THREE.IcosahedronGeometry(0.34, 5);
  const p = fleece.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const curl = 1 + 0.07 * nz(n.x * 2.1, n.y * 2.1, n.z * 2.1) + 0.04 * nz(n.x * 5.3, n.y * 5.3, n.z * 5.3);
    v.multiplyScalar(curl); v.z *= 1.55; v.y *= 0.92; if (v.y < 0) v.y *= 0.8;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  fleece.computeVertexNormals();
  const head = new THREE.SphereGeometry(0.1, 20, 16);
  const hp = head.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    z *= 1.55; if (z > 0) { x *= 1 - z * 2.2; y *= 1 - z * 1.6; y -= z * 0.25; } // tapering muzzle
    hp.setXYZ(i, x, y, z);
  }
  head.computeVertexNormals();
  const ear = new THREE.SphereGeometry(0.05, 10, 8); ear.scale(0.45, 0.2, 1);
  SHEEP = { fleece, head, ear };
  return SHEEP;
}

export function createSheep() {
  const root = new THREE.Group();
  const parts = sheepParts();
  const tint = [0xf2ebdd, 0xe8dfcd, 0xefe6d4, 0xd9cdb6][Math.floor(Math.random() * 4)];
  const wool = mat(tint, { roughness: 1 });
  const face = mat([0x2e2620, 0x4a3a2c, 0xd8cbb4][Math.floor(Math.random() * 3)], { roughness: 0.8 });
  const hoof = mat(0x1a1410);
  const body = new THREE.Group(); body.position.y = 0.58; root.add(body);
  body.add(new THREE.Mesh(parts.fleece, wool));
  const top = new THREE.Mesh(parts.fleece, wool); top.scale.setScalar(0.42); top.position.set(0, 0.06, 0.42); body.add(top); // wool cap behind the head
  const head = new THREE.Group(); head.position.set(0, 0.1, 0.55); body.add(head);
  head.add(new THREE.Mesh(parts.head, face));
  [-1, 1].forEach((sx) => {
    const e = new THREE.Mesh(parts.ear, face); e.position.set(sx * 0.09, 0.03, -0.02); e.rotation.set(0, sx * 1.1, sx * 0.5); head.add(e);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat(0x0c0806, { roughness: 0.2 })); eye.position.set(sx * 0.06, 0.03, 0.04); head.add(eye);
  });
  const legs = [];
  [[-0.13, 0.3], [0.13, 0.3], [-0.13, -0.3], [0.13, -0.3]].forEach(([x, z]) => {
    const l = muscleLimb(0.24, bulge(0.04, 0.022, 0.006, 0.2), face, 8); l.position.set(x, 0.45, z);
    const low = muscleLimb(0.2, (t) => 0.02 - t * 0.004, face, 8); low.position.y = -0.24; l.add(low);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.035, 8), hoof); h.position.y = -0.2; low.add(h);
    root.add(l); legs.push({ l, low });
  });
  const tail = new THREE.Mesh(parts.ear, wool); tail.scale.set(1.2, 2, 0.8); tail.position.set(0, 0.05, -0.55); tail.rotation.x = 1.2; body.add(tail);
  shadow(root);
  let ph = Math.random() * 6, t = 0;
  const animate = (dt, speed) => {
    t += dt; ph += dt * (3 + speed * 5);
    const m = Math.min(1, speed);
    legs.forEach(({ l, low }, i) => {
      const a = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0));
      l.rotation.x = a * 0.5 * m; low.rotation.x = Math.max(0, -a) * 0.7 * m * (i < 2 ? -1 : 1);
    });
    body.position.y = 0.58 + Math.abs(Math.sin(ph)) * 0.03 * m;
    // grazing when still: head down, slow chewing nods
    head.rotation.x = speed < 0.1 ? 0.9 + Math.sin(t * 2.2) * 0.06 : 0.1 + Math.sin(ph) * 0.05;
    head.position.y = speed < 0.1 ? -0.05 : 0.1;
    tail.rotation.z = Math.sin(t * 5) * 0.3;
  };
  return { root, animate, head };
}

export function createLion() {
  const root = new THREE.Group();
  const fur = mat(0xb8874a, { roughness: 0.9 }), mane = mat(0x6a4426, { roughness: 1 });
  const body = new THREE.Group(); body.position.y = 0.85; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.1, 8, 20), fur);
  torso.rotation.x = Math.PI / 2; body.add(torso);
  const headG = new THREE.Group(); headG.position.set(0, 0.25, 0.85); body.add(headG);
  const maneG = new THREE.IcosahedronGeometry(0.5, 4); { const mp = maneG.attributes.position, mv = new THREE.Vector3(); for (let i = 0; i < mp.count; i++) { mv.fromBufferAttribute(mp, i); mv.multiplyScalar(1 + 0.16 * nz(mv.x * 6, mv.y * 6, mv.z * 6)); mp.setXYZ(i, mv.x, mv.y, mv.z); } maneG.computeVertexNormals(); }
  const maneM = new THREE.Mesh(maneG, mane); maneM.scale.set(1, 1, 0.8); headG.add(maneM);
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
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.girth, cfg.len, 8, 24), fur);
  torso.rotation.x = Math.PI / 2; body.add(torso);
  const under = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.girth * 0.85, cfg.len * 0.8, 8, 20), belly);
  under.rotation.x = Math.PI / 2; under.position.y = -cfg.girth * 0.2; under.scale.set(0.95, 1, 0.9); body.add(under);
  if (cfg.hump) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), fur); h.scale.set(1, 0.9, 1.3); h.position.y = cfg.girth * 0.9; body.add(h); }
  // Saddle blanket
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(cfg.girth * 2.3, 0.05, 0.7), mat(kind === 'camel' ? 0x8c2a2a : 0x2b4f8a));
  blanket.position.set(0, cfg.girth + (cfg.hump ? 0.5 : 0.02), -0.05); body.add(blanket);
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(cfg.girth * 2.35, 0.25, 0.68), mat(0xd9a93b));
  fringe.position.set(0, cfg.girth - 0.08 + (cfg.hump ? 0.5 : 0), -0.05); fringe.scale.y = 0.4; body.add(fringe);
  const neck = new THREE.Group(); neck.position.set(0, cfg.girth * 0.4, cfg.len / 2 + cfg.girth * 0.6); body.add(neck);
  const nm = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.girth * 0.42, cfg.neck, 6, 16), fur);
  nm.position.y = cfg.neck / 2; neck.add(nm); neck.rotation.x = kind === 'camel' ? 0.2 : 0.55;
  const head = new THREE.Group(); head.position.y = cfg.neck + 0.05; neck.add(head);
  const skull = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.head, cfg.head * 2.2, 6, 16), fur);
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
    const l = muscleLimb(cfg.leg, bulge(0.09, 0.045, 0.03, 0.15, 0.25), fur, 12); l.position.set(sx * cfg.girth * 0.6, cfg.leg + 0.05, z); root.add(l); legs.push(l);
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
