// Trees and plants of the Judean hills: olive, date palm, cypress and terebinth trees, bushes, wildflowers,
// reeds along the brook, and rocks. Built after the buildings so nothing grows through a wall, a path or a tent.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt, brookZ, pathX, PLACES, GOLGOTHA, TOMB, JERUSALEM, BOUNDS } from './world.js';
import { fbm, rand } from './noise.js';

// ---------- textures painted on canvases
function leafTexture(colors, { count = 220, long = 1, size = 256 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rand()) * size * 0.46, a = rand() * Math.PI * 2;
    const x = size / 2 + Math.cos(a) * r, y = size / 2 + Math.sin(a) * r;
    g.save(); g.translate(x, y); g.rotate(rand() * Math.PI * 2);
    g.fillStyle = colors[Math.floor(rand() * colors.length)];
    g.beginPath(); g.ellipse(0, 0, 2.2 * long + rand() * 2, 6 * long + rand() * 5, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function frondTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = '#5c6a2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 256); g.stroke();
  for (let y = 6; y < 250; y += 5) {
    const w = 30 * Math.sin((y / 256) * Math.PI) + 4;
    g.strokeStyle = rand() < 0.5 ? '#6f8037' : '#7d8a40'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(32, y); g.lineTo(32 - w, y + 9); g.moveTo(32, y); g.lineTo(32 + w, y + 9); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function barkTexture(base) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 90; i++) { const x = rand() * 64; g.strokeStyle = `rgba(${rand() < 0.5 ? '30,22,14' : '150,130,100'},${0.25 + rand() * 0.3})`; g.lineWidth = 1 + rand() * 2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (rand() - 0.5) * 10, 90, x + (rand() - 0.5) * 10, 170, x + (rand() - 0.5) * 8, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- wind for foliage (instanced): leaves near the top sway most
function windMaterial(mat, strength = 1) {
  const u = { uTime: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sway = (sin(uTime * 1.3 + ip.x * 0.11 + ip.z * 0.07) * 0.6 + sin(uTime * 3.7 + ip.x) * 0.15) * ${strength.toFixed(2)};
        float h = max(0.0, position.y - 1.0);
        transformed.x += sway * h * 0.025; transformed.z += sway * h * 0.015;`);
  };
  return { mat, u };
}
const depthFor = (map) => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });

// ---------- geometry helpers
/** A tapering, twisting trunk along a curve. */
function trunk(points, r0, r1, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, 10, 1, radial, false);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  const cen = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const t = uv.getX(i);
    curve.getPointAt(Math.min(1, t), cen);
    const r = THREE.MathUtils.lerp(r0, r1, t) * (1 + 0.12 * Math.sin(t * 23 + uv.getY(i) * 9));
    p.setXYZ(i, cen.x + n.getX(i) * r, cen.y + n.getY(i) * r, cen.z + n.getZ(i) * r);
    uv.setXY(i, uv.getY(i) * 2, t * 4);
  }
  g.computeVertexNormals();
  return g;
}
/** A leafy cluster: a dense core plus crossed leaf cards for a ragged outline. */
function cluster(x, y, z, s, coreList, cardList) {
  const core = new THREE.IcosahedronGeometry(s * 0.62, 1);
  const cp = core.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < cp.count; i++) { v.fromBufferAttribute(cp, i); v.multiplyScalar(0.85 + rand() * 0.3); v.y *= 0.8; cp.setXYZ(i, v.x, v.y, v.z); }
  core.computeVertexNormals(); core.translate(x, y, z); coreList.push(core);
  for (let k = 0; k < 3; k++) {
    const card = new THREE.PlaneGeometry(s * 2, s * 1.7);
    card.rotateY((k / 3) * Math.PI + rand() * 0.4); card.rotateX((rand() - 0.5) * 0.5);
    card.translate(x, y, z);
    cardList.push(card);
  }
}

function oliveGeo() {
  const tr = [], br = [], core = [], cards = [];
  const stems = 2 + Math.floor(rand() * 2);
  for (let s = 0; s < stems; s++) {
    const a = rand() * Math.PI * 2, lean = 0.25 + rand() * 0.35;
    const top = new THREE.Vector3(Math.cos(a) * lean * 2.2, 2.6 + rand() * 0.6, Math.sin(a) * lean * 2.2);
    tr.push(trunk([new THREE.Vector3(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15), new THREE.Vector3(Math.cos(a + 1) * 0.35, 1.0, Math.sin(a + 1) * 0.35), new THREE.Vector3(Math.cos(a) * 0.5, 1.9, Math.sin(a) * 0.5), top], 0.28, 0.1));
    for (let b = 0; b < 2; b++) {
      const ba = a + (rand() - 0.5) * 2.4, end = top.clone().add(new THREE.Vector3(Math.cos(ba) * 1.3, 0.6 + rand() * 0.5, Math.sin(ba) * 1.3));
      br.push(trunk([top.clone().multiplyScalar(0.92), top.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.25, 0)), end], 0.09, 0.04, 5));
      cluster(end.x, end.y + 0.25, end.z, 1.0 + rand() * 0.4, core, cards);
    }
    cluster(top.x, top.y + 0.6, top.z, 1.2 + rand() * 0.4, core, cards);
  }
  return { wood: mergeGeometries([...tr, ...br]), core: mergeGeometries(core), cards: mergeGeometries(cards) };
}
function terebinthGeo() {
  const tr = [trunk([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 1.5, 0.1), new THREE.Vector3(0, 3.2, 0)], 0.38, 0.18)];
  const core = [], cards = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4, r = 1.2 + rand() * 1.5;
    const end = new THREE.Vector3(Math.cos(a) * r, 3.6 + rand() * 1.4, Math.sin(a) * r);
    tr.push(trunk([new THREE.Vector3(0, 3.0, 0), end.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 1.8, 0)), end], 0.14, 0.05, 5));
    cluster(end.x, end.y + 0.3, end.z, 1.3 + rand() * 0.5, core, cards);
  }
  cluster(0, 5.2, 0, 1.6, core, cards);
  return { wood: mergeGeometries(tr), core: mergeGeometries(core), cards: mergeGeometries(cards) };
}
function cypressGeo() {
  const tr = [trunk([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.5, 0)], 0.18, 0.12, 6)];
  const core = [], cards = [];
  for (let i = 0; i < 9; i++) { const y = 1.2 + i * 0.75, w = 0.9 * Math.sin(Math.min(1, (i + 1) / 9.5) * Math.PI * 0.95) + 0.2; cluster((rand() - 0.5) * 0.2, y, (rand() - 0.5) * 0.2, w, core, cards); }
  return { wood: mergeGeometries(tr), core: mergeGeometries(core), cards: mergeGeometries(cards) };
}
function palmGeo() {
  const lean = new THREE.Vector3((rand() - 0.5) * 1.4, 0, (rand() - 0.5) * 1.4);
  const top = new THREE.Vector3(lean.x, 7 + rand() * 1.5, lean.z);
  const tg = trunk([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean.x * 0.2, 3, lean.z * 0.2), top], 0.26, 0.2, 8);
  // leaf-scar rings
  const tp = tg.attributes.position, tuv = tg.attributes.uv;
  for (let i = 0; i < tp.count; i++) { const k = 1 + 0.06 * Math.max(0, Math.sin(tuv.getY(i) * 40)); tp.setX(i, tp.getX(i) * k); tp.setZ(i, tp.getZ(i) * k); }
  tg.computeVertexNormals();
  const fronds = [];
  for (let i = 0; i < 16; i++) {
    const f = new THREE.PlaneGeometry(0.9, 3.4, 1, 8); f.translate(0, 1.7, 0);
    const p = f.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, -Math.pow(y / 3.4, 2) * 1.6); }
    f.rotateX(-(0.6 + (i % 2) * 0.5 + rand() * 0.2)); f.rotateY((i / 16) * Math.PI * 2 + rand() * 0.2);
    f.translate(top.x, top.y, top.z);
    fronds.push(f);
  }
  const dates = new THREE.SphereGeometry(0.28, 8, 6); dates.scale(1, 1.3, 1); dates.translate(top.x, top.y - 0.35, top.z);
  return { wood: mergeGeometries([tg, dates.toNonIndexed ? dates : dates]), fronds: mergeGeometries(fronds) };
}
function bushGeo() {
  const core = [], cards = [];
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) cluster((rand() - 0.5) * 1.1, 0.35 + rand() * 0.4, (rand() - 0.5) * 1.1, 0.45 + rand() * 0.35, core, cards);
  return { core: mergeGeometries(core), cards: mergeGeometries(cards) };
}

export function buildVegetation(scene, world, { quality = 'high', campaign = 'gospel', inCity }) {
  const update = [];
  const dens = { low: 0.45, medium: 0.7, high: 1, ultra: 1.25 }[quality] || 1;
  // ---- where things may grow
  const blocked = (x, z, pad = 1.2) => {
    if (x < BOUNDS.minX + 4 || x > BOUNDS.maxX - 4 || z < BOUNDS.minZ + 4 || z > BOUNDS.maxZ - 4) return true;
    if (Math.abs(x - pathX(z)) < 3.2 && z > -34) return true;
    if (Math.abs(z - brookZ(x)) < 3.4) return true;
    if (inCity(x, z)) return true;
    for (const p of Object.values(PLACES)) if (Math.hypot(p.x - x, p.z - z) < 12) return true;
    if (campaign === 'gospel' && (Math.hypot(x - GOLGOTHA.x, z - GOLGOTHA.z) < 13 || Math.hypot(x - TOMB.x, z - TOMB.z) < 10)) return true;
    for (const c of world.colliders) if (c.building && Math.hypot(c.x - x, c.z - z) < c.r + pad) return true;
    for (const c of world.footprints) if (Math.hypot(c.x - x, c.z - z) < c.r + pad + 0.8) return true;
    return false;
  };
  const tmp = new THREE.Object3D();
  const instanced = (geo, mat, list, { shadow = true, depth = null } = {}) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((t, i) => { tmp.position.set(t.x, t.y, t.z); tmp.rotation.set(0, t.ry, 0); tmp.scale.setScalar(t.s); tmp.updateMatrix(); im.setMatrixAt(i, tmp.matrix); if (t.color) im.setColorAt(i, t.color); });
    im.castShadow = shadow; im.receiveShadow = true;
    if (depth) im.customDepthMaterial = depth;
    scene.add(im);
    return im;
  };

  // ---- materials
  const oliveLeaf = leafTexture(['#7d8a62', '#94a07a', '#6a7752', '#a8b291'], { long: 0.9 });
  const greenLeaf = leafTexture(['#556b2a', '#65793a', '#48602a', '#728a44'], { long: 1.1 });
  const cypLeaf = leafTexture(['#2f4524', '#3a5228', '#26381e'], { count: 320, long: 0.7 });
  const mkCards = (map) => windMaterial(new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 }));
  const mkCore = (color) => windMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  const oliveBark = new THREE.MeshStandardMaterial({ map: barkTexture('#6b5a46'), roughness: 1 });
  const darkBark = new THREE.MeshStandardMaterial({ map: barkTexture('#4e3c2a'), roughness: 1 });
  const palmBark = new THREE.MeshStandardMaterial({ map: barkTexture('#7a6448'), roughness: 1 });
  const frondMat = windMaterial(new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }), 1.6);

  // ---- species: a few variants each, many instances
  const species = [
    { make: oliveGeo, n: 520, variants: 4, bark: oliveBark, cards: mkCards(oliveLeaf), core: mkCore(0x6e7a52), map: oliveLeaf, scale: [0.8, 1.25], where: (x, z) => z > -60 || rand() < 0.4 },
    { make: terebinthGeo, n: 120, variants: 3, bark: darkBark, cards: mkCards(greenLeaf), core: mkCore(0x52662c), map: greenLeaf, scale: [0.8, 1.2], where: () => true },
    { make: cypressGeo, n: 110, variants: 3, bark: darkBark, cards: mkCards(cypLeaf), core: mkCore(0x2e4224), map: cypLeaf, scale: [0.9, 1.3], where: (x, z) => Math.abs(z - brookZ(x)) > 15 },
  ];
  for (const sp of species) {
    const variants = Array.from({ length: sp.variants }, sp.make);
    const lists = variants.map(() => []);
    const count = Math.round(sp.n * dens);
    for (let i = 0, tries = 0; i < count && tries < count * 8; tries++) {
      const x = (rand() - 0.5) * 460, z = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
      if (blocked(x, z, 2.5) || !sp.where(x, z)) continue;
      const near = Math.exp(-((z - brookZ(x)) ** 2) / (30 * 30));
      if (rand() > 0.3 + near * 0.6 + Math.max(0, fbm(x * 0.01, z * 0.01, 2)) * 0.8) continue;
      const s = THREE.MathUtils.lerp(sp.scale[0], sp.scale[1], rand());
      lists[i % sp.variants].push({ x, y: heightAt(x, z) - 0.15, z, ry: rand() * 6.28, s });
      world.colliders.push({ x, z, r: 0.45 * s, tree: true });
      i++;
    }
    variants.forEach((v, k) => {
      instanced(v.wood, sp.bark, lists[k]);
      instanced(v.core, sp.core.mat, lists[k], { shadow: false });
      instanced(v.cards, sp.cards.mat, lists[k], { depth: depthFor(sp.map) });
    });
    update.push(sp.cards.u, sp.core.u);
  }
  // ---- date palms near water, villages and along the Jerusalem road
  {
    const variants = Array.from({ length: 3 }, palmGeo), lists = variants.map(() => []);
    const spots = [];
    for (let i = 0; i < 260; i++) {
      const x = -180 + rand() * 360, z = brookZ(x) + (rand() < 0.5 ? -1 : 1) * (5 + rand() * 18);
      spots.push([x, z]);
    }
    for (let i = 0; i < 60; i++) { const a = rand() * Math.PI * 2, r = 14 + rand() * 30; spots.push([PLACES.jesse.x + Math.cos(a) * r, PLACES.jesse.z + Math.sin(a) * r * 0.7]); }
    let k = 0;
    for (const [x, z] of spots) {
      if (rand() > 0.55 * dens + 0.15 || blocked(x, z, 2)) continue;
      lists[k++ % 3].push({ x, y: heightAt(x, z) - 0.1, z, ry: rand() * 6.28, s: 0.8 + rand() * 0.45 });
      world.colliders.push({ x, z, r: 0.35, tree: true });
    }
    const fm = depthFor(frondMat.mat.map);
    variants.forEach((v, i) => { instanced(v.wood, palmBark, lists[i]); instanced(v.fronds, frondMat.mat, lists[i], { depth: fm }); });
    update.push(frondMat.u);
  }
  // ---- bushes (broom, thorn and saltbush)
  {
    const variants = Array.from({ length: 4 }, bushGeo), lists = variants.map(() => []);
    const leaf = leafTexture(['#6b7442', '#7c8450', '#5c6838', '#8e8a5a'], { long: 0.8 });
    const cards = mkCards(leaf), core = mkCore(0x5f6a3c);
    for (let i = 0; i < 2600 * dens; i++) {
      const x = (rand() - 0.5) * 470, z = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
      if (blocked(x, z, 1) || fbm(x * 0.02 + 9, z * 0.02, 2) < -0.05) continue;
      lists[i % 4].push({ x, y: heightAt(x, z) - 0.1, z, ry: rand() * 6.28, s: 0.6 + rand() * 0.9 });
    }
    variants.forEach((v, k) => { instanced(v.core, core.mat, lists[k], { shadow: false }); instanced(v.cards, cards.mat, lists[k], { depth: depthFor(leaf) }); });
    update.push(cards.u, core.u);
  }
  // ---- wildflowers: red anemones, white daisies, yellow mustard, purple thistle
  {
    const blossoms = [0xd23a3a, 0xf2efe6, 0xe8c838, 0x9a5ab0];
    const head = new THREE.IcosahedronGeometry(0.06, 0), stem = new THREE.CylinderGeometry(0.008, 0.01, 0.35, 3); stem.translate(0, 0.17, 0);
    const clump = [], stems = [];
    for (let k = 0; k < 7; k++) { const dx = (rand() - 0.5) * 0.6, dz = (rand() - 0.5) * 0.6, h = 0.22 + rand() * 0.2; const hg = head.clone(); hg.translate(dx, h + 0.02, dz); clump.push(hg); const sg = stem.clone(); sg.scale(1, h / 0.35, 1); sg.translate(dx, 0, dz); stems.push(sg); }
    const fGeo = mergeGeometries(clump), sGeo = mergeGeometries(stems);
    const list = [];
    for (let i = 0; i < 5200 * dens; i++) {
      const x = (rand() - 0.5) * 460, z = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
      if (blocked(x, z, 0.6) || fbm(x * 0.05 + 3, z * 0.05, 2) < 0.12) continue;
      list.push({ x, y: heightAt(x, z) - 0.02, z, ry: rand() * 6.28, s: 0.8 + rand() * 0.6, color: new THREE.Color(blossoms[Math.floor(fbm(x * 0.03, z * 0.03, 1) * 2 + 2 + rand()) % 4]) });
    }
    instanced(fGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), list, { shadow: false });
    instanced(sGeo, new THREE.MeshStandardMaterial({ color: 0x5a7a30, roughness: 0.9 }), list, { shadow: false });
  }
  // ---- reeds and rushes along the brook
  {
    const blades = [];
    for (let k = 0; k < 14; k++) {
      const b = new THREE.PlaneGeometry(0.05, 1.6 + rand() * 0.8, 1, 4); b.translate(0, 0.9, 0);
      const p = b.attributes.position; for (let v = 0; v < p.count; v++) { const y = p.getY(v); p.setZ(v, (y / 2.4) ** 2 * 0.3); }
      b.rotateY(rand() * Math.PI); b.translate((rand() - 0.5) * 0.7, 0, (rand() - 0.5) * 0.7); blades.push(b);
    }
    const head = new THREE.CylinderGeometry(0.035, 0.035, 0.25, 5); head.translate(0.1, 2.1, 0);
    const reedGeo = mergeGeometries([...blades.map((b) => b.toNonIndexed()), head.toNonIndexed()]);
    const reedMat = windMaterial(new THREE.MeshStandardMaterial({ color: 0x7a8a44, side: THREE.DoubleSide, roughness: 0.9 }), 2.2);
    const list = [];
    for (let x = -200; x < 200; x += 0.9) {
      for (const side of [-1, 1]) {
        if (rand() > 0.55 * dens) continue;
        const z = brookZ(x) + side * (3.2 + rand() * 2.8);
        if (inCity(x, z)) continue;
        list.push({ x: x + (rand() - 0.5) * 0.8, y: heightAt(x, z) - 0.1, z, ry: rand() * 6.28, s: 0.7 + rand() * 0.6 });
      }
    }
    instanced(reedGeo, reedMat.mat, list, { shadow: false });
    update.push(reedMat.u);
  }
  // ---- rocks and boulders
  {
    const rg = new THREE.IcosahedronGeometry(1, 2);
    const rp = rg.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); v.multiplyScalar(0.78 + fbm(v.x * 1.6 + 9, v.z * 1.6 + v.y, 3) * 0.45); rp.setXYZ(i, v.x, v.y * 0.68, v.z); }
    rg.computeVertexNormals();
    const list = [];
    for (let i = 0; i < 900 * dens; i++) {
      const x = (rand() - 0.5) * 470, z = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
      if (blocked(x, z, 1.5)) continue;
      const s = rand() < 0.1 ? 1.8 + rand() * 2.5 : 0.25 + rand() * 0.9;
      list.push({ x, y: heightAt(x, z) - s * 0.28, z, ry: rand() * 6, s, color: new THREE.Color().setHSL(0.09, 0.12 + rand() * 0.08, 0.5 + rand() * 0.15) });
      if (s > 1.2) world.colliders.push({ x, z, r: s * 0.85 });
    }
    for (let i = 0; i < 300; i++) { // pebbles on the brook banks
      const x = -150 + rand() * 300, z = brookZ(x) + (rand() - 0.5) * 9;
      list.push({ x, y: heightAt(x, z) - 0.04, z, ry: rand() * 6, s: 0.1 + rand() * 0.2, color: new THREE.Color().setHSL(0.08, 0.1, 0.55 + rand() * 0.2) });
    }
    instanced(rg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }), list);
  }
  return { update: (t) => { for (const u of update) u.uTime.value = t; } };
}
