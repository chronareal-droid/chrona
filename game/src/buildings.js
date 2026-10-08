// Mud-brick (adobe) houses in the style of old desert towns: hand-plastered walls with straw and
// cracks, protruding wooden roof beams, deep-set framed windows, triangular vents, parapet roofs.
// Textures are painted procedurally on canvases, so no image files are needed.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from './world.js';

let seed = 4242;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function canvasTex(size, paint, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  paint(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(repeat, repeat);
  return t;
}

// Plaster: warm ochre mud with darker blotches, straw flecks and fine cracks.
function paintPlaster(g, s, base = [214, 180, 122]) {
  g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * s, y = rnd() * s, r = 30 + rnd() * 120, k = (rnd() - 0.5) * 10;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${base[0] + k},${base[1] + k * 0.9},${base[2] + k * 0.7},0.22)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 380; i++) { // a little straw
    const x = rnd() * s, y = rnd() * s, a = rnd() * Math.PI, l = 2 + rnd() * 5;
    g.strokeStyle = rnd() < 0.8 ? 'rgba(240,218,160,0.22)' : 'rgba(150,118,72,0.14)'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 0; i++) { // (no cracks: a clean, freshly plastered finish)
    let x = rnd() * s, y = rnd() * s; g.strokeStyle = 'rgba(110,80,44,0.3)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 22; y += rnd() * 16; g.lineTo(x, y); }
    g.stroke();
  }
}
function paintStone(g, s) { // dressed limestone courses (ashlar)
  g.fillStyle = '#cdb994'; g.fillRect(0, 0, s, s);
  const rows = 8, rh = s / rows;
  for (let r = 0; r < rows; r++) {
    let x = -(r % 2) * 40 * (s / 512);
    while (x < s) {
      const w = (60 + rnd() * 70) * (s / 512), k = (rnd() - 0.5) * 22;
      g.fillStyle = `rgb(${205 + k},${185 + k},${148 + k * 0.8})`; g.fillRect(x + 2, r * rh + 2, w - 4, rh - 4);
      for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(90,70,40,${rnd() * 0.08})`; g.fillRect(x + rnd() * w, r * rh + rnd() * rh, 2 + rnd() * 3, 2 + rnd() * 3); }
      x += w;
    }
  }
}
function paintWood(g, s) {
  g.fillStyle = '#5a3e26'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 160; i++) { const y = rnd() * s; g.strokeStyle = `rgba(${rnd() < 0.5 ? '30,18,8' : '120,86,52'},${0.2 + rnd() * 0.3})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + (rnd() - 0.5) * 8, s * 0.6, y + (rnd() - 0.5) * 8, s, y); g.stroke(); }
}

let MATS = null;
export function materials() {
  if (MATS) return MATS;
  const plaster = canvasTex(1024, (g, s) => paintPlaster(g, s));
  const plasterLight = canvasTex(1024, (g, s) => paintPlaster(g, s, [226, 202, 158]));
  const stone = canvasTex(1024, paintStone);
  const wood = canvasTex(256, paintWood);
  [plaster, plasterLight, stone, wood].forEach((t) => (t.colorSpace = THREE.SRGBColorSpace));
  const bump = (t) => { const b = t.clone(); b.colorSpace = THREE.NoColorSpace; b.needsUpdate = true; return b; };
  MATS = {
    wall: new THREE.MeshStandardMaterial({ map: plaster, bumpMap: bump(plaster), bumpScale: 0.5, roughness: 0.95 }),
    trim: new THREE.MeshStandardMaterial({ map: plasterLight, bumpMap: bump(plasterLight), bumpScale: 1.4, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ map: stone, bumpMap: bump(stone), bumpScale: 1.6, roughness: 0.88 }),
    wood: new THREE.MeshStandardMaterial({ map: wood, bumpMap: bump(wood), bumpScale: 1.5, roughness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 1 }),
    floor: new THREE.MeshStandardMaterial({ map: plaster, color: 0x9c8466, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3a3430, metalness: 0.7, roughness: 0.5 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xa8603a, roughness: 0.8 }),
    rugs: [0x8a2a2a, 0x2b4f8a, 0xb07a2a, 0x5a6a3a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 })),
    linen: new THREE.MeshStandardMaterial({ color: 0xe2d6bc, roughness: 1 }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffb35a }),
  };
  return MATS;
}

/** A box with world-scaled UVs (1 texture tile ≈ 2 m) and gently uneven, hand-plastered faces. */
function wallBox(w, h, d, wobble = 0.025) {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w * 1.5)), Math.max(1, Math.round(h * 1.5)), Math.max(1, Math.round(d * 1.5)));
  const p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    // UVs in metres / 2
    if (ny > 0.5) uv.setXY(i, x / 4, z / 4); else if (nx > 0.5) uv.setXY(i, z / 4, y / 4); else uv.setXY(i, x / 4, y / 4);
    if (y > -h / 2 + 0.01) { // keep the footing flat; soften the rest
      const k = Math.sin(x * 3.1 + z * 2.3) * Math.cos(y * 2.7) * wobble;
      p.setXYZ(i, x + (Math.abs(x) > w / 2 - 0.01 ? Math.sign(x) * k : 0), y, z + (Math.abs(z) > d / 2 - 0.01 ? Math.sign(z) * k : 0));
    }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Builds an adobe house. Returns { group, footprint:{x,z,r} }.
 * opts: w, d, h (walls), upper (adds a stepped upper storey), facing (radians), windows (per long side)
 */
export function adobeHouse(x, z, opts = {}) {
  const M = materials();
  const w = opts.w ?? 7, d = opts.d ?? 5.5, h = opts.h ?? 3.4, facing = opts.facing ?? 0;
  const group = new THREE.Group();
  // Ground the house on its lowest corner and run the walls down below the highest, so no side floats or sinks.
  const c = Math.cos(facing), s = Math.sin(facing);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => heightAt(x + (a * w / 2) * c + (b * d / 2) * s, z - (a * w / 2) * s + (b * d / 2) * c));
  const lo = Math.min(...corners), hi = Math.max(...corners);
  const base = lo - 0.25, drop = hi - lo + 0.25;
  const add = (geo, mat, px, py, pz, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; group.add(m); return m; };

  // Stone plinth showing where the hill falls away
  // (its top stops just under the floor, so it never shows through indoors)
  if (drop > 0.5) add(wallBox(w + 0.3, drop + 0.4, d + 0.3, 0.02), M.stone, 0, drop - 0.03 - (drop + 0.4) / 2, 0);
  const wallH = h + drop;
  const WM = opts.stone ? M.stone : M.wall;
  // Hollow shell: four walls around a doorway, an earthen floor, and a beamed roof.
  const T = 0.35, DW = 1.3, DH = 2.25, floorY = drop, fzW = d / 2 - T / 2;
  const doorX = THREE.MathUtils.clamp((opts.doorX ?? 0) * w / 2, -w / 2 + DW / 2 + T + 0.2, w / 2 - DW / 2 - T - 0.2);
  add(wallBox(w, wallH, T), WM, 0, wallH / 2, -d / 2 + T / 2);                         // back
  add(wallBox(T, wallH, d - 2 * T), WM, -w / 2 + T / 2, wallH / 2, 0);                   // left
  add(wallBox(T, wallH, d - 2 * T), WM, w / 2 - T / 2, wallH / 2, 0);                    // right
  const lw = doorX - DW / 2 + w / 2, rw = w / 2 - (doorX + DW / 2);
  add(wallBox(lw, wallH, T), WM, -w / 2 + lw / 2, wallH / 2, fzW);                       // front, left of the door
  add(wallBox(rw, wallH, T), WM, w / 2 - rw / 2, wallH / 2, fzW);                        // front, right of the door
  add(wallBox(DW, wallH - floorY - DH, T), WM, doorX, floorY + DH + (wallH - floorY - DH) / 2, fzW); // lintel
  add(new THREE.BoxGeometry(w - 2 * T, 0.2, d - 2 * T), M.floor, 0, floorY - 0.1, 0);   // floor
  add(new THREE.BoxGeometry(w, 0.3, d), WM, 0, wallH - 0.15, 0);                          // roof slab
  for (let bx = -w / 2 + 0.9; bx < w / 2 - 0.5; bx += 1.1) add(new THREE.CylinderGeometry(0.08, 0.09, d - 2 * T, 7).rotateX(Math.PI / 2), M.wood, bx, wallH - 0.38, 0); // ceiling beams
  // door frame on the outside
  add(new THREE.BoxGeometry(0.16, DH + 0.1, T + 0.08), M.trim, doorX - DW / 2 - 0.06, floorY + DH / 2, fzW);
  add(new THREE.BoxGeometry(0.16, DH + 0.1, T + 0.08), M.trim, doorX + DW / 2 + 0.06, floorY + DH / 2, fzW);
  add(new THREE.BoxGeometry(DW + 0.4, 0.22, T + 0.1), M.wood, doorX, floorY + DH + 0.08, fzW);
  // Steps up to the threshold where the ground falls away in front of the house
  const fx = x + doorX * Math.cos(facing) + (d / 2 + 0.6) * Math.sin(facing), fzz = z - doorX * Math.sin(facing) + (d / 2 + 0.6) * Math.cos(facing);
  const outside = heightAt(fx, fzz) - base;
  const rise = floorY - outside, nSteps = rise > 0.2 ? Math.ceil(rise / 0.22) : 0;
  for (let k = 0; k < nSteps; k++) {
    const top = floorY - k * (rise / nSteps);
    add(wallBox(DW + 0.3, Math.max(0.05, top - outside + 0.3), 0.36, 0.01), M.stone, doorX, outside - 0.3 + (top - outside + 0.3) / 2, d / 2 + 0.18 + k * 0.36);
  }
  // Parapet: a low, rounded lip around the flat roof
  const top = wallH;
  const lip = 0.45;
  add(wallBox(w + 0.1, lip, 0.25, 0.03), M.wall, 0, top + lip / 2, d / 2 - 0.12);
  add(wallBox(w + 0.1, lip, 0.25, 0.03), M.wall, 0, top + lip / 2, -d / 2 + 0.12);
  add(wallBox(0.25, lip, d, 0.03), M.wall, w / 2 - 0.12, top + lip / 2, 0);
  add(wallBox(0.25, lip, d, 0.03), M.wall, -w / 2 + 0.12, top + lip / 2, 0);
  // Protruding palm-trunk roof beams (vigas)
  const vigaG = new THREE.CylinderGeometry(0.08, 0.09, 0.7, 7); vigaG.rotateX(Math.PI / 2);
  const vigas = [];
  for (let vx = -w / 2 + 0.6; vx <= w / 2 - 0.5; vx += 1.1) {
    for (const sz of [1, -1]) { const g = vigaG.clone(); g.translate(vx + (rnd() - 0.5) * 0.1, top - 0.35, sz * (d / 2 + 0.3)); vigas.push(g); }
  }
  if (vigas.length) add(mergeGeometries(vigas), M.wood, 0, 0, 0);

  // Front facade (+z): framed windows, triangular vents
  const fz = d / 2;
  const winY = drop + Math.min(2.0, h - 1.1);
  const nWin = opts.windows ?? Math.max(1, Math.floor(w / 3));
  for (let i = 0; i < nWin; i++) {
    const wx = -w / 2 + (w / (nWin + 1)) * (i + 1);
    if (Math.abs(wx - doorX) < 1.5) continue;
    window_(group, M, wx, winY, fz);
    vent(add, M, wx, winY + 0.85, fz);
  }
  // Back and side windows, smaller
  window_(group, M, 0, winY, -fz, Math.PI, 0.7);
  window_(group, M, w / 2, winY, 0, Math.PI / 2, 0.7);

  // A stepped upper storey (the taller central block in the reference photo)
  if (opts.upper) {
    const uw = w * 0.55, ud = d * 0.7, uh = 2.6;
    const ux = (rnd() - 0.5) * (w - uw) * 0.6;
    const ub = add(wallBox(uw, uh, ud), M.wall, ux, top + uh / 2, -d * 0.1);
    add(wallBox(uw + 0.08, 0.4, 0.22, 0.03), M.wall, ux, top + uh + 0.2, -d * 0.1 + ud / 2 - 0.11);
    add(new THREE.BoxGeometry(uw * 0.7, 0.85, 0.1), M.trim, ux, top + uh * 0.6, -d * 0.1 + ud / 2 + 0.03);
    [-0.2, 0, 0.2].forEach((k) => add(new THREE.BoxGeometry(0.32, 0.5, 0.12), M.dark, ux + k * uw, top + uh * 0.6, -d * 0.1 + ud / 2 + 0.05));
    const uv = [];
    for (let vx = -uw / 2 + 0.5; vx <= uw / 2 - 0.4; vx += 1.0) { const g = vigaG.clone(); g.translate(ux + vx, top + uh - 0.3, -d * 0.1 + ud / 2 + 0.3); uv.push(g); }
    if (uv.length) add(mergeGeometries(uv), M.wood, 0, 0, 0);
    void ub;
  }
  // Clay jars and a bench by the door
  if (rnd() < 0.6) {
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshStandardMaterial({ color: 0xa8603a, roughness: 0.8 }));
    jar.scale.y = 1.25; jar.position.set(doorX + 1.2, drop + 0.3, fz + 0.45); jar.castShadow = true; group.add(jar);
  }
  const merged = mergeByMaterial(group);
  merged.position.set(x, base, z);
  merged.rotation.y = facing;
  // The door: planks on a hinge at the left jamb; it swings inward.
  const pivot = new THREE.Group(); pivot.position.set(doorX - DW / 2 + 0.03, floorY, fzW);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(DW - 0.06, DH - 0.04, 0.08), M.wood); plank.position.set((DW - 0.06) / 2, DH / 2, 0); plank.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), M.iron); ring.position.set(DW / 2 - 0.2, -0.05, 0.06); plank.add(ring);
  [0.4, DH - 0.5].forEach((yy) => { const b = new THREE.Mesh(new THREE.BoxGeometry(DW - 0.12, 0.08, 0.1), M.wood); b.position.set(0, yy - DH / 2, 0.02); plank.add(b); });
  pivot.add(plank); merged.add(pivot);
  // World-space data for collisions, floors, the door and the interior.
  const cs = Math.cos(facing), sn = Math.sin(facing);
  const toWorld = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  const seg = (ax, az, bx, bz) => { const [x1, z1] = toWorld(ax, az), [x2, z2] = toWorld(bx, bz); return { x1, z1, x2, z2, r: T / 2 }; };
  const walls = [
    seg(-w / 2, -d / 2 + T / 2, w / 2, -d / 2 + T / 2),
    seg(-w / 2 + T / 2, -d / 2, -w / 2 + T / 2, d / 2),
    seg(w / 2 - T / 2, -d / 2, w / 2 - T / 2, d / 2),
    seg(-w / 2, fzW, doorX - DW / 2, fzW),
    seg(doorX + DW / 2, fzW, w / 2, fzW),
  ];
  const [dx, dz] = toWorld(doorX, d / 2), [lxw, lzw] = toWorld(w / 2 - T - 0.4, -d / 2 + T + 0.5);
  const house = {
    x, z, cs, sn, w, d, T, base, floorY: base + floorY, doorX, door: pivot, open: 0,
    doorPos: new THREE.Vector3(dx, base + floorY, dz),
    ramp: nSteps ? { lx0: doorX - DW / 2 - 0.15, lx1: doorX + DW / 2 + 0.15, lz0: d / 2 - T, lz1: d / 2 + nSteps * 0.36, y0: base + outside, y1: base + floorY } : null,
    lamp: new THREE.Vector3(lxw, base + floorY + 1.6, lzw),
    group: merged, interior: null,
    buildInterior: () => furnish(w, d, T, floorY, doorX, rnd),
  };
  return { group: merged, footprint: { x, z, r: Math.max(w, d) * 0.55 }, walls, house };
}

// Collapse a house's many parts into one mesh per material (a handful of draw calls per house).
function mergeByMaterial(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse((m) => {
    if (!m.isMesh) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(g);
  });
  const out = new THREE.Group();
  for (const [mat, list] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(list), mat);
    mesh.castShadow = mesh.receiveShadow = true;
    out.add(mesh);
  }
  return out;
}

function window_(group, M, x, y, z, ry = 0, scale = 1) {
  const g = new THREE.Group();
  const f = new THREE.Mesh(new THREE.BoxGeometry(1.25 * scale, 1.05 * scale, 0.14), M.trim);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.78 * scale, 0.62 * scale, 0.2), M.dark); hole.position.z = 0.02;
  g.add(f, hole);
  for (let k = -1; k <= 1; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62 * scale, 0.05), M.wood); bar.position.set(k * 0.2 * scale, 0, 0.1); g.add(bar); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  g.rotation.y = ry;
  g.position.set(x, y, z);
  g.translateZ(0.04); // sit just proud of the wall
  group.add(g);
}

function vent(add, M, x, y, z) {
  const shape = new THREE.Shape(); shape.moveTo(-0.16, 0.14); shape.lineTo(0.16, 0.14); shape.lineTo(0, -0.14); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  add(geo, M.dark, x, y, z - 0.02);
}

/** Stone/ashlar material for city walls, towers and the temple platform. */
export const stoneMaterial = () => materials().stone;
export const plasterMaterial = () => materials().wall;
export { wallBox };

/** Furnishings for a one-room house (local coordinates; the floor top is at y = floorY). Built only when the
 * player comes near, and merged per material, so a whole city of interiors costs almost nothing. */
function furnish(w, d, T, floorY, doorX, r) {
  const M = materials();
  const g = new THREE.Group();
  const add = (geo, mat, px, py, pz, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, floorY + py, pz); m.rotation.y = ry; g.add(m); return m; };
  const iw = w - 2 * T, id = d - 2 * T;
  // woven rug in the middle of the room
  add(new THREE.BoxGeometry(Math.min(2.6, iw * 0.5), 0.02, Math.min(1.8, id * 0.45)), M.rugs[Math.floor(r() * 4)], 0, 0.01, -0.1);
  // low table with bread and a cup
  add(new THREE.BoxGeometry(1.2, 0.08, 0.7), M.wood, 0, 0.36, -0.1);
  [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(([a, b]) => add(new THREE.BoxGeometry(0.07, 0.34, 0.07), M.wood, a, 0.17, -0.1 + b));
  add(new THREE.SphereGeometry(0.14, 10, 6).scale(1, 0.5, 1), M.floor, -0.2, 0.44, -0.1);
  add(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 10), M.clay, 0.25, 0.46, -0.05);
  // sleeping mats with folded blankets along the back wall
  for (let k = 0; k < 2; k++) {
    add(new THREE.BoxGeometry(0.8, 0.06, 1.9), M.linen, -iw / 2 + 0.6 + k * 0.95, 0.03, -id / 2 + 1.05);
    add(new THREE.BoxGeometry(0.7, 0.12, 0.4), M.rugs[(k + 1) % 4], -iw / 2 + 0.6 + k * 0.95, 0.12, -id / 2 + 0.3);
  }
  // water jars and a bread oven (tabun) in the corner
  for (let k = 0; k < 3; k++) { const j = add(new THREE.SphereGeometry(0.22, 12, 10), M.clay, iw / 2 - 0.35 - k * 0.45, 0.28, id / 2 - 0.5); j.scale.y = 1.35; }
  if (Math.abs(-iw / 2 + 0.7 - doorX) > 1.3) { const oven = add(new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.floor, -iw / 2 + 0.7, 0, id / 2 - 0.8); oven.scale.y = 1.1; }
  // shelf with pottery on the right wall
  add(new THREE.BoxGeometry(0.3, 0.05, 1.6), M.wood, iw / 2 - 0.15, 1.5, -0.6);
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.07 + r() * 0.04, 0.06, 0.18 + r() * 0.1, 10), M.clay, iw / 2 - 0.15, 1.62, -1.2 + k * 0.4);
  // oil lamp in a wall niche
  add(new THREE.BoxGeometry(0.3, 0.35, 0.15), M.dark, iw / 2 - 0.4, 1.45, -id / 2 + 0.02);
  add(new THREE.SphereGeometry(0.06, 8, 6).scale(1.6, 0.6, 1), M.clay, iw / 2 - 0.4, 1.32, -id / 2 + 0.1);
  add(new THREE.ConeGeometry(0.025, 0.08, 6), M.flame, iw / 2 - 0.4, 1.4, -id / 2 + 0.1);
  // a loom by the left wall
  if (r() < 0.5) {
    add(new THREE.BoxGeometry(0.06, 1.8, 0.06), M.wood, -iw / 2 + 0.25, 0.9, -0.6);
    add(new THREE.BoxGeometry(0.06, 1.8, 0.06), M.wood, -iw / 2 + 0.25, 0.9, 0.4);
    add(new THREE.BoxGeometry(0.05, 0.05, 1.1), M.wood, -iw / 2 + 0.25, 1.75, -0.1);
    add(new THREE.PlaneGeometry(0.9, 1.3), M.linen, -iw / 2 + 0.3, 1.0, -0.1, Math.PI / 2);
  }
  const merged = mergeByMaterial(g);
  merged.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
  return merged;
}
