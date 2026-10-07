// The land of Judah around the Valley of Elah: terrain, sky, light, brook, vegetation, camps.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, rand } from './noise.js';

// Map layout (metres). South (+z) is Bethlehem's pasture, north (-z) the Philistine ridge.
export const PLACES = {
  pasture: new THREE.Vector3(10, 0, 170),
  jesse: new THREE.Vector3(-14, 0, 182),
  israelCamp: new THREE.Vector3(0, 0, -15),
  saulTent: new THREE.Vector3(18, 0, -26),
  brook: new THREE.Vector3(14, 0, -80),
  arena: new THREE.Vector3(0, 0, -102),
  philistineCamp: new THREE.Vector3(0, 0, -165),
};
export const BOUNDS = { minX: -230, maxX: 230, minZ: -215, maxZ: 240 };

export const brookZ = (x) => -80 + Math.sin(x * 0.018) * 9 + Math.sin(x * 0.051) * 3;

const g = (v, w) => Math.exp(-(v * v) / (w * w));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function baseHeight(x, z) {
  const pastureCalm = 0.55 + 0.45 * (1 - smooth(60, 140, z));
  let h = fbm(x * 0.007, z * 0.007, 4) * 13 * pastureCalm + fbm(x * 0.04, z * 0.04, 2) * 1.2;
  h += 9 * g(z + 18, 30) * (1 - 0.4 * g(x, 60));            // Israel's ridge
  h += 13 * g(z + 162, 32);                                    // Philistine ridge
  h -= 14 * g(z - brookZ(x), 42);                              // the broad valley
  h += 6 * g(z - 95, 50) * (0.5 + 0.5 * Math.sin(x * 0.02));  // hills on the way from Bethlehem
  // Hem the playable land in with mountains.
  const ex = Math.max(0, Math.abs(x) - 200), ez = Math.max(0, z - 215, -z - 190);
  const edge = Math.max(ex, ez);
  h += 34 * smooth(0, 70, edge) * (0.7 + 0.5 * fbm(x * 0.012 + 3, z * 0.012, 3)) + 10 * smooth(40, 110, edge);
  return h;
}

// Flatten the arena so the duel plays fair.
const arenaFlat = (x, z) => g(Math.hypot(x - PLACES.arena.x, z - PLACES.arena.z), 26);

export function heightAt(x, z) {
  let h = baseHeight(x, z);
  const bz = brookZ(x);
  h -= 2.6 * g(z - bz, 3.2);                                   // brook channel
  const a = arenaFlat(x, z);
  h = h * (1 - a) + (baseHeight(PLACES.arena.x, PLACES.arena.z) - 0.4) * a;
  return h;
}
export const waterLevel = (x) => baseHeight(x, brookZ(x)) - 1.7;

export function buildWorld(scene, renderer, quality = 'high') {
  const world = { update: () => {}, colliders: [], sun: null };

  // --- Sky & light (late golden afternoon) ---
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const su = sky.material.uniforms;
  su.turbidity.value = 6; su.rayleigh.value = 1.6; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.86;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(74), THREE.MathUtils.degToRad(215));
  su.sunPosition.value.copy(sunDir);
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(sky.clone());
  scene.environment = pmrem.fromScene(envScene).texture;
  scene.environmentIntensity = 0.45;

  scene.fog = new THREE.FogExp2(0xdcc6a2, 0.0036);

  const hemi = new THREE.HemisphereLight(0xfbe8c8, 0x6b5a3c, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd6a0, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  world.sun = sun;
  world.followShadow = (p) => {
    sun.position.copy(p).addScaledVector(sunDir, 180);
    sun.target.position.copy(p);
  };

  // --- Terrain ---
  const SIZE = 640, SEG = 256;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  tg.rotateX(-Math.PI / 2);
  tg.translate(0, 0, 10);
  const pos = tg.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(0x8a8a46), cDry = new THREE.Color(0xc2a46a), cRock = new THREE.Color(0x9a8a78),
    cMud = new THREE.Color(0x6e5a3c), cLush = new THREE.Color(0x5f7a34), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const slope = Math.abs(heightAt(x + 1, z) - heightAt(x - 1, z)) + Math.abs(heightAt(x, z + 1) - heightAt(x, z - 1));
    const n = fbm(x * 0.05, z * 0.05, 2);
    c.copy(cDry).lerp(cGrass, THREE.MathUtils.clamp(0.45 + n * 0.8 + smooth(80, 200, z) * 0.4, 0, 1));
    c.lerp(cLush, g(z - brookZ(x), 14) * 0.7);
    c.lerp(cMud, g(z - brookZ(x), 3.5) * 0.9);
    c.lerp(cRock, THREE.MathUtils.clamp((slope - 0.9) * 0.9, 0, 1));
    c.lerp(cDry, arenaFlat(x, z) * 0.5);
    const shade = 0.92 + fbm(x * 0.2, z * 0.2, 2) * 0.12;
    col[i * 3] = c.r * shade; col[i * 3 + 1] = c.g * shade; col[i * 3 + 2] = c.b * shade;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tg.computeVertexNormals();
  const tmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  // Close-up detail: procedural soil/grass breakup and micro-normals so the ground reads at 4K.
  tmat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
      float fb(vec2 p){ return vn(p)*.5 + vn(p*2.07)*.25 + vn(p*4.13)*.125 + vn(p*8.3)*.0625; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float d1 = fb(vWP.xz * 0.35), d2 = fb(vWP.xz * 2.2), d3 = vn(vWP.xz * 9.0);
        diffuseColor.rgb *= 0.78 + d1 * 0.32 + d2 * 0.12;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.0, 0.82), smoothstep(0.55, 0.8, d1) * 0.5);
        diffuseColor.rgb *= 0.94 + d3 * 0.1;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float e = 0.08;
        float nx = fb(vWP.xz * 3.0 + vec2(e, 0.)) - fb(vWP.xz * 3.0 - vec2(e, 0.));
        float nz = fb(vWP.xz * 3.0 + vec2(0., e)) - fb(vWP.xz * 3.0 - vec2(0., e));
        normal = normalize(normal + (viewMatrix * vec4(nx * 1.4, 0., nz * 1.4, 0.)).xyz);`);
  };
  const terrain = new THREE.Mesh(tg, tmat);
  terrain.receiveShadow = true;
  scene.add(terrain);
  world.terrain = terrain;

  // --- The brook of Elah ---
  {
    const pts = [], idx = [];
    for (let x = -330; x <= 330; x += 3) {
      const z = brookZ(x), y = waterLevel(x);
      pts.push(x, y, z - 4.5, x, y, z + 4.5);
    }
    for (let i = 0; i < pts.length / 6 - 1; i++) {
      const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    wg.setIndex(idx); wg.computeVertexNormals();
    const wm = new THREE.MeshStandardMaterial({ color: 0x4f7f86, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82 });
    wm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 };
      wm.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vW;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          float r1 = sin(vW.x*1.7 + uTime*2.6) * cos(vW.z*2.3 - uTime*1.4);
          float r2 = sin(vW.x*4.1 - uTime*3.3 + vW.z*3.0);
          normal = normalize(normal + vec3(r1*0.12 + r2*0.05, 0., r2*0.1));`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float sparkle = pow(max(0., sin(vW.x*9.+uTime*4.)*sin(vW.z*11.-uTime*3.)), 24.);
          gl_FragColor.rgb += vec3(1.,.9,.7)*sparkle*0.6;`);
    };
    const water = new THREE.Mesh(wg, wm);
    scene.add(water);
    const prev = world.update;
    world.update = (t, dt) => { prev(t, dt); if (wm.userData.shader) wm.userData.shader.uniforms.uTime.value = t; };
  }

  const tmp = new THREE.Object3D();
  const placeInstanced = (geo, mat, list, { shadow = true } = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => {
      tmp.position.set(p.x, p.y, p.z);
      tmp.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      tmp.scale.setScalar(p.s || 1);
      if (p.sy) tmp.scale.y *= p.sy;
      tmp.updateMatrix();
      im.setMatrixAt(i, tmp.matrix);
    });
    im.castShadow = shadow; im.receiveShadow = true;
    scene.add(im);
    return im;
  };
  const nearPlace = (x, z, r) => Object.values(PLACES).some((p) => Math.hypot(p.x - x, p.z - z) < r);
  const onPath = (x, z) => Math.abs(x - pathX(z)) < 5;

  // --- Olive & terebinth trees ---
  {
    const trunkG = new THREE.CylinderGeometry(0.22, 0.42, 3.2, 6, 3);
    trunkG.translate(0, 1.6, 0);
    const tp = trunkG.attributes.position;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + Math.sin(y * 1.8) * 0.25); }
    trunkG.computeVertexNormals();
    const leaves = [];
    for (let k = 0; k < 6; k++) {
      const s = 0.9 + rand() * 0.7;
      const lg = new THREE.IcosahedronGeometry(s, 0);
      lg.translate((rand() - 0.5) * 2.6, 3.1 + rand() * 1.4, (rand() - 0.5) * 2.6);
      leaves.push(lg);
    }
    const leafG = mergeGeometries(leaves);
    const list = [];
    for (let i = 0; i < 520; i++) {
      const x = (rand() - 0.5) * 460, z = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
      if (nearPlace(x, z, 22) || onPath(x, z) || Math.abs(z - brookZ(x)) < 7) continue;
      const near = g(z - brookZ(x), 30);
      if (rand() > 0.35 + near * 0.6) continue;
      list.push({ x, y: heightAt(x, z) - 0.2, z, ry: rand() * 6.28, s: 0.8 + rand() * 0.8 });
    }
    placeInstanced(trunkG, new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }), list);
    placeInstanced(leafG, new THREE.MeshStandardMaterial({ color: 0x6f7f45, roughness: 0.9, flatShading: true }), list);
    list.forEach((p) => world.colliders.push({ x: p.x, z: p.z, r: 0.6 * p.s }));
  }

  // --- Rocks & boulders ---
  {
    const rg = new THREE.IcosahedronGeometry(1, 1);
    const rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(rp, i);
      v.multiplyScalar(0.75 + fbm(v.x * 2 + 9, v.z * 2 + v.y, 2) * 0.5);
      rp.setXYZ(i, v.x, v.y * 0.7, v.z);
    }
    rg.computeVertexNormals();
    const list = [];
    for (let i = 0; i < 700; i++) {
      const x = (rand() - 0.5) * 470, z = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
      if (nearPlace(x, z, 14) || onPath(x, z)) continue;
      const s = rand() < 0.1 ? 2 + rand() * 3 : 0.3 + rand() * 1.1;
      list.push({ x, y: heightAt(x, z) - s * 0.25, z, ry: rand() * 6, rx: rand() * 0.4, s });
      if (s > 1.2) world.colliders.push({ x, z, r: s * 0.85 });
    }
    // Pebbles strewn along the brook banks
    for (let i = 0; i < 260; i++) {
      const x = -120 + rand() * 240, z = brookZ(x) + (rand() - 0.5) * 12;
      list.push({ x, y: heightAt(x, z) - 0.05, z, ry: rand() * 6, s: 0.12 + rand() * 0.25 });
    }
    placeInstanced(rg, new THREE.MeshStandardMaterial({ color: 0xa79a86, roughness: 0.92, flatShading: true }), list);
  }

  // --- Grass tufts with wind ---
  {
    const blade = new THREE.PlaneGeometry(0.12, 0.7, 1, 3);
    blade.translate(0, 0.35, 0);
    const parts = [];
    for (let k = 0; k < 5; k++) {
      const b = blade.clone();
      b.rotateZ((rand() - 0.5) * 0.6);
      b.rotateY(rand() * Math.PI);
      b.translate((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3);
      parts.push(b);
    }
    const tuft = mergeGeometries(parts);
    const gm = new THREE.MeshStandardMaterial({ color: 0xa7a35a, side: THREE.DoubleSide, roughness: 1 });
    gm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 };
      gm.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 ip = instanceMatrix * vec4(0.,0.,0.,1.);
          float w = sin(uTime*1.7 + ip.x*0.15 + ip.z*0.1) * 0.5 + sin(uTime*3.1 + ip.x*0.6)*0.2;
          transformed.x += w * position.y * 0.35; transformed.z += w * position.y * 0.15;`);
    };
    const list = [];
    const grassN = { low: 6000, medium: 12000, high: 22000, ultra: 34000 }[quality] || 22000;
    for (let i = 0; i < grassN; i++) {
      const x = (rand() - 0.5) * 440, z = -200 + rand() * 430;
      if (onPath(x, z) || Math.abs(z - brookZ(x)) < 3.5) continue;
      if (fbm(x * 0.03, z * 0.03, 2) < -0.15) continue;
      list.push({ x, y: heightAt(x, z) - 0.05, z, ry: rand() * 6, s: 0.7 + rand() * 0.9 });
    }
    placeInstanced(tuft, gm, list, { shadow: false });
    const prev = world.update;
    world.update = (t, dt) => { prev(t, dt); if (gm.userData.shader) gm.userData.shader.uniforms.uTime.value = t; };
  }

  // --- Footpath from Bethlehem to the camp ---
  {
    const pts = [];
    for (let z = 200; z >= -30; z -= 2) {
      const x = pathX(z);
      pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.06, z));
    }
    const path = new THREE.Mesh(
      ribbon(pts, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xb59c72, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    path.receiveShadow = true;
    scene.add(path);
  }

  // --- Distant mountains of Judah (unfogged, hazed by hand so they read as aerial perspective) ---
  {
    const ring = new THREE.CylinderGeometry(900, 900, 1, 220, 1, true);
    const rp = ring.attributes.position;
    const verts = [], idx = [];
    const N = 220;
    for (let layer = 0; layer < 2; layer++) {
      const R = 760 + layer * 260;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const hgt = 18 + layer * 30 + Math.max(0, fbm(Math.cos(a) * 3 + layer * 7, Math.sin(a) * 3, 4)) * (70 + layer * 90) + Math.abs(fbm(a * 9, layer, 2)) * 12;
        verts.push(Math.cos(a) * R, -20, Math.sin(a) * R, Math.cos(a) * R, hgt, Math.sin(a) * R);
      }
      const base = layer * (N + 1) * 2;
      for (let i = 0; i < N; i++) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    ring.dispose();
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    mg.setIndex(idx); mg.computeVertexNormals();
    const cols = new Float32Array(verts.length);
    for (let i = 0; i < verts.length / 3; i++) {
      const far = Math.hypot(verts[i * 3], verts[i * 3 + 2]) > 900;
      const y = verts[i * 3 + 1];
      const c = new THREE.Color(far ? 0xd9c7ae : 0xbfa98a).lerp(new THREE.Color(0xeedcc0), y < 0 ? 0.7 : 0.25);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    mg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mtn = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    mtn.position.z = 10;
    scene.add(mtn);
  }

  // --- Clouds: soft billboards drifting high over the valley ---
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d');
    for (let i = 0; i < 14; i++) {
      const x = 30 + rand() * 68, y = 44 + rand() * 40, r = 18 + rand() * 26;
      const gr = cx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const clouds = new THREE.Group();
    for (let i = 0; i < 36; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: 0xfff1dc, transparent: true, opacity: 0.55 + rand() * 0.3, depthWrite: false, fog: false });
      const sp = new THREE.Sprite(m);
      const a = rand() * Math.PI * 2, r = 150 + rand() * 650;
      sp.position.set(Math.cos(a) * r, 170 + rand() * 140, Math.sin(a) * r);
      const sc = 140 + rand() * 220; sp.scale.set(sc, sc * 0.45, 1);
      clouds.add(sp);
    }
    scene.add(clouds);
    const prev = world.update;
    world.update = (t, dt) => { prev(t, dt); clouds.rotation.y += dt * 0.002; };
  }

  // --- Dust motes drifting in the low sun, and birds wheeling overhead ---
  {
    const N = 600, a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) a.set([(rand() - 0.5) * 60, rand() * 12, (rand() - 0.5) * 60], i * 3);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe6b8, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);
    const birds = [];
    const bm = new THREE.MeshBasicMaterial({ color: 0x2a2018, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Group();
      const wg = new THREE.PlaneGeometry(0.8, 0.22); wg.translate(0.4, 0, 0);
      const l = new THREE.Mesh(wg, bm), r = new THREE.Mesh(wg, bm); r.scale.x = -1;
      l.rotation.x = r.rotation.x = -Math.PI / 2;
      b.add(l, r); b.userData = { l, r, a: rand() * 6.28, rad: 20 + rand() * 30, h: 40 + rand() * 25, sp: 0.15 + rand() * 0.1, c: new THREE.Vector3((rand() - 0.5) * 200, 0, -60 + (rand() - 0.5) * 200) };
      scene.add(b); birds.push(b);
    }
    world.followDust = (p) => { dust.position.set(Math.round(p.x / 30) * 30, p.y - 2, Math.round(p.z / 30) * 30); };
    const prev = world.update;
    world.update = (t, dt) => {
      prev(t, dt);
      dust.rotation.y += dt * 0.01;
      birds.forEach((b, i) => {
        const u = b.userData; u.a += dt * u.sp;
        b.position.set(u.c.x + Math.cos(u.a) * u.rad, u.h + Math.sin(t * 0.3 + i) * 3, u.c.z + Math.sin(u.a) * u.rad);
        b.rotation.y = -u.a; b.rotation.z = 0.3;
        const f = Math.sin(t * 7 + i) * 0.6; u.l.rotation.y = f; u.r.rotation.y = -f;
      });
    };
  }

  // --- Camps ---
  world.campfires = [];
  buildCamp(scene, world, PLACES.israelCamp, { cloth: [0xe7dcc2, 0xcdb894, 0x8f6b4a], banner: 0x2b4f8a, spread: 30, count: 16 });
  buildCamp(scene, world, PLACES.philistineCamp, { cloth: [0x5a3a2c, 0x7c2f22, 0x3b3a3a], banner: 0x9a2a1e, spread: 40, count: 22 });
  // King Saul's pavilion
  {
    const p = PLACES.saulTent;
    const t = tent(0xf1e6c8, 2.1, 0x8c2a2a);
    t.position.set(p.x, heightAt(p.x, p.z) - 0.1, p.z);
    t.rotation.y = -0.6;
    scene.add(t);
    world.colliders.push({ x: p.x, z: p.z, r: 5.4 });
  }
  // Jesse's house in Bethlehem: a stone house and a sheepfold.
  {
    const p = PLACES.jesse;
    const house = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xcdb48c, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 7), stone);
    body.position.y = 2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.4, 7.6), new THREE.MeshStandardMaterial({ color: 0x8a6a48 }));
    roof.position.y = 4.2;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x3b2a1c }));
    door.position.set(1.5, 1.2, 3.55);
    house.add(body, roof, door);
    house.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    house.position.set(p.x - 6, heightAt(p.x - 6, p.z - 8) - 0.3, p.z - 8);
    scene.add(house);
    world.colliders.push({ x: p.x - 6, z: p.z - 8, r: 5.5 });
    // low stone wall of the sheepfold
    const wallM = new THREE.MeshStandardMaterial({ color: 0xa8957a, roughness: 1, flatShading: true });
    for (let a = 0; a < Math.PI * 1.75; a += 0.16) {
      const x = PLACES.pasture.x + 30 + Math.cos(a) * 9, z = PLACES.pasture.z + 4 + Math.sin(a) * 9;
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), wallM);
      b.position.set(x, heightAt(x, z) + 0.2, z); b.rotation.set(rand(), rand(), rand());
      b.castShadow = true; scene.add(b);
    }
  }

  return world;
}

export function pathX(z) {
  // Winds from Jesse's house north to the Israelite camp.
  return Math.sin(z * 0.022) * 18 + Math.sin(z * 0.061) * 5 - 4;
}

function ribbon(points, width) {
  const v = [], idx = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[Math.min(i + 1, points.length - 1)], o = points[Math.max(i - 1, 0)];
    const d = new THREE.Vector3().subVectors(q, o).setY(0).normalize();
    const side = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(width / 2);
    v.push(p.x + side.x, heightAt(p.x + side.x, p.z + side.z) + 0.07, p.z + side.z);
    v.push(p.x - side.x, heightAt(p.x - side.x, p.z - side.z) + 0.07, p.z - side.z);
    if (i < points.length - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

function tent(color, scale = 1, trim = 0x6b4a2e) {
  const grp = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide, flatShading: true });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4 * scale, 2.8 * scale, 6, 1, true), cloth);
  cone.position.y = 1.4 * scale;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.42 * scale, 2.42 * scale, 0.25 * scale, 6, 1, true),
    new THREE.MeshStandardMaterial({ color: trim, side: THREE.DoubleSide }));
  band.position.y = 0.35 * scale;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.6 * scale), new THREE.MeshStandardMaterial({ color: 0x4a3626 }));
  pole.position.y = 1.8 * scale;
  grp.add(cone, band, pole);
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  return grp;
}

function buildCamp(scene, world, center, { cloth, banner, spread, count }) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.3;
    const r = spread * (0.45 + rand() * 0.55);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r * 0.7;
    if (Math.abs(x - pathX(z)) < 6 && center.z > -50) continue;
    const t = tent(cloth[i % cloth.length], 0.9 + rand() * 0.5);
    t.position.set(x, heightAt(x, z) - 0.1, z);
    t.rotation.y = rand() * 6;
    scene.add(t);
    world.colliders.push({ x, z, r: 2.4 });
  }
  // Banners
  const bm = new THREE.MeshStandardMaterial({ color: banner, side: THREE.DoubleSide, roughness: 0.8 });
  const flags = [];
  for (let i = 0; i < 4; i++) {
    const x = center.x + (i - 1.5) * spread * 0.45, z = center.z - spread * 0.55 * (center.z < -100 ? -1 : 1);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7), new THREE.MeshStandardMaterial({ color: 0x3e2c1e }));
    pole.position.set(x, heightAt(x, z) + 3.5, z); pole.castShadow = true;
    const fg = new THREE.PlaneGeometry(2.2, 1.3, 8, 1); fg.translate(1.1, 0, 0);
    const flag = new THREE.Mesh(fg, bm);
    flag.position.set(x, heightAt(x, z) + 6.2, z); flag.castShadow = true;
    scene.add(pole, flag); flags.push(flag);
  }
  // Campfires with flicker
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.5;
    const x = center.x + Math.cos(a) * spread * 0.25, z = center.z + Math.sin(a) * spread * 0.2;
    if (Math.abs(x - pathX(z)) < 4 && center.z > -50) continue;
    const y = heightAt(x, z);
    const fire = new THREE.Group();
    const logs = new THREE.MeshStandardMaterial({ color: 0x3a2618 });
    for (let k = 0; k < 4; k++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1), logs);
      l.rotation.set(Math.PI / 2.4, k * 1.57, 0); l.position.y = 0.15; fire.add(l);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 7), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 }));
    flame.position.y = 0.55; fire.add(flame);
    fire.position.set(x, y, z);
    scene.add(fire);
    world.campfires.push(flame);
    world.colliders.push({ x, z, r: 0.9 });
  }
  const prev = world.update;
  world.update = (t, dt) => {
    prev(t, dt);
    flags.forEach((f, i) => {
      const p = f.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, Math.sin(t * 4 + x * 2.4 + i) * 0.18 * x); }
      p.needsUpdate = true;
    });
    world.campfires.forEach((fl, i) => { const s = 0.85 + Math.sin(t * 13 + i * 3) * 0.12 + Math.sin(t * 7.3 + i) * 0.08; fl.scale.set(s, s * 1.15, s); });
  };
}
