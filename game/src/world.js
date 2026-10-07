// The land of Judah around the Valley of Elah: terrain, sky, light, brook, vegetation, camps.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, rand } from './noise.js';
import { adobeHouse, stoneMaterial, wallBox } from './buildings.js';

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
export const GOLGOTHA = new THREE.Vector3(-42, 0, -128);
export const TOMB = new THREE.Vector3(-20, 0, -140);
export const GETHSEMANE = new THREE.Vector3(-12, 0, -64);
export const JERUSALEM = { minX: -36, maxX: 36, minZ: -50, maxZ: 6, gateS: 6, gateN: -50 };
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
  h += 7 * g(Math.hypot(x - GOLGOTHA.x, z - GOLGOTHA.z), 13);   // Golgotha, "the place of a skull"
  const a = arenaFlat(x, z);
  h = h * (1 - a) + (baseHeight(PLACES.arena.x, PLACES.arena.z) - 0.4) * a;
  return h;
}
export const waterLevel = (x) => baseHeight(x, brookZ(x)) - 1.7;

export function buildWorld(scene, renderer, quality = 'high', campaign = 'gospel') {
  const world = { update: () => {}, colliders: [], sun: null, campaign };

  // --- Sky & light. Presets: golden (late afternoon), day, dawn, night, darkness (the sixth hour) ---
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const su = sky.material.uniforms;
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); const envSky = sky.clone(); envScene.add(envSky);
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
  const sunDir = new THREE.Vector3();
  // Stars for the night in Gethsemane
  const stars = (() => {
    const N = 2500, a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const v = new THREE.Vector3().setFromSphericalCoords(1500, Math.acos(rand()), rand() * Math.PI * 2); a.set([v.x, Math.abs(v.y) + 40, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 }));
  })();
  scene.add(stars);
  const TIMES = {
    golden: { elev: 16, az: 215, turb: 6, ray: 1.6, mie: 0.006, sun: 0xffd6a0, sunI: 3.0, sky: 0xfbe8c8, gnd: 0x6b5a3c, hemiI: 0.9, fog: 0xdcc6a2, fogD: 0.0026, exp: 0.72, env: 0.45, stars: 0 },
    day: { elev: 52, az: 160, turb: 4, ray: 1.2, mie: 0.004, sun: 0xfff1dc, sunI: 3.4, sky: 0xe8f0ff, gnd: 0x7a6a4c, hemiI: 1.0, fog: 0xcfd6dc, fogD: 0.0019, exp: 0.6, env: 0.5, stars: 0 },
    dawn: { elev: 4, az: 95, turb: 8, ray: 2.6, mie: 0.008, sun: 0xffb27a, sunI: 2.2, sky: 0xf2c8b0, gnd: 0x4a3c34, hemiI: 0.7, fog: 0xd8b4a0, fogD: 0.0042, exp: 0.85, env: 0.4, stars: 0.25 },
    night: { elev: -4, az: 250, turb: 2, ray: 0.4, mie: 0.002, sun: 0x9ab4ff, sunI: 0.45, sky: 0x31406a, gnd: 0x10121a, hemiI: 0.35, fog: 0x0e1424, fogD: 0.006, exp: 1.25, env: 0.12, stars: 1 },
    darkness: { elev: 60, az: 160, turb: 20, ray: 0.2, mie: 0.05, sun: 0x8a7a70, sunI: 0.35, sky: 0x4a4440, gnd: 0x1e1a18, hemiI: 0.45, fog: 0x2a2624, fogD: 0.009, exp: 1.0, env: 0.1, stars: 0 },
  };
  world.setTime = (name) => {
    const t = TIMES[name] || TIMES.golden;
    world.time = name;
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - t.elev), THREE.MathUtils.degToRad(t.az));
    for (const u of [su, envSky.material.uniforms]) {
      u.turbidity.value = t.turb; u.rayleigh.value = t.ray; u.mieCoefficient.value = t.mie; u.mieDirectionalG.value = 0.86;
      u.sunPosition.value.copy(sunDir);
    }
    // At night the light comes from the moon, high in the opposite sky.
    world.lightDir = name === 'night' ? new THREE.Vector3(-0.4, 0.8, 0.45).normalize() : name === 'darkness' ? new THREE.Vector3(0.2, 1, 0.1).normalize() : sunDir.clone();
    sun.color.set(t.sun); sun.intensity = t.sunI;
    hemi.color.set(t.sky); hemi.groundColor.set(t.gnd); hemi.intensity = t.hemiI;
    scene.fog.color.set(t.fog); scene.fog.density = t.fogD;
    renderer.toneMappingExposure = t.exp;
    scene.environment?.dispose?.();
    scene.environment = pmrem.fromScene(envScene).texture;
    scene.environmentIntensity = t.env;
    stars.material.opacity = t.stars;
    world.clouds?.children.forEach((c) => c.material.color.set(name === 'night' ? 0x2a3048 : name === 'darkness' ? 0x3a3430 : name === 'dawn' ? 0xffc8a8 : 0xfff1dc));
    sky.visible = name !== 'darkness';
    scene.background = name === 'darkness' ? new THREE.Color(0x2a2624) : null;
  };
  world.followShadow = (p) => {
    sun.position.copy(p).addScaledVector(world.lightDir || sunDir, 180);
    sun.target.position.copy(p);
  };
  world.setTime('golden');

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

  // --- The brook (Elah / Kidron): a flowing ribbon whose colour, clarity and foam follow its real depth.
  {
    const ACROSS = 10, HALF = 5;
    const pos = [], depth = [], idx = [];
    let rows = 0;
    for (let x = -330; x <= 330; x += 2, rows++) {
      const z0 = brookZ(x), y = waterLevel(x);
      for (let k = 0; k <= ACROSS; k++) {
        const z = z0 - HALF + (k / ACROSS) * HALF * 2;
        pos.push(x, y, z);
        depth.push(y - heightAt(x, z));
      }
    }
    const W = ACROSS + 1;
    for (let r = 0; r < rows - 1; r++) for (let k = 0; k < ACROSS; k++) {
      const a = r * W + k; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wg.setAttribute('depth', new THREE.Float32BufferAttribute(depth, 1));
    wg.setIndex(idx); wg.computeVertexNormals();
    const wm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0.0, transparent: true, depthWrite: false, envMapIntensity: 1.4 });
    const wu = { uTime: { value: 0 }, uRipple: { value: new THREE.Vector4(0, -999, 0, 0) } };
    world.waterRipple = (p, strength) => { wu.uRipple.value.set(p.x, p.y, p.z, strength); };
    wm.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, wu);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        attribute float depth; varying float vDepth; varying vec3 vW; uniform float uTime;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          transformed.y += sin(position.x * 0.9 - uTime * 2.2) * 0.02 + sin(position.z * 2.3 + uTime * 1.7) * 0.012;`)
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDepth = depth; vW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uTime; uniform vec4 uRipple; varying float vDepth; varying vec3 vW;
        float n2(vec2 p){ return sin(p.x) * cos(p.y); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          // shallow water is clear and sandy, deeper water turns green-blue
          float dep = clamp(vDepth / 0.9, 0.0, 1.0);
          diffuseColor.rgb = mix(vec3(0.55, 0.52, 0.38), vec3(0.12, 0.30, 0.30), dep);
          diffuseColor.a = mix(0.25, 0.86, smoothstep(0.0, 0.6, dep));`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          // the current runs along the brook (+x): scrolling ripples, plus rings where someone wades
          vec2 f = vW.xz * vec2(1.4, 2.2) + vec2(uTime * 1.6, 0.0);
          float a = n2(f) + 0.5 * n2(f * 2.3 + 1.7) + 0.25 * n2(f * 4.1 - uTime);
          float b = n2(f.yx * 1.3 + 2.0) + 0.5 * n2(f.yx * 2.9);
          vec3 nn = vec3(a * 0.09, 0.0, b * 0.07);
          float rd = distance(vW.xz, uRipple.xz);
          nn.xz += normalize(vW.xz - uRipple.xz + 1e-4) * sin(rd * 9.0 - uTime * 7.0) * exp(-rd * 0.9) * uRipple.w * 0.35;
          normal = normalize(normal + (viewMatrix * vec4(nn, 0.0)).xyz);`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          // foam where the water thins over stones and banks
          float foam = smoothstep(0.18, 0.0, vDepth) * (0.6 + 0.4 * sin(vW.x * 6.0 + uTime * 3.0) * sin(vW.z * 7.0));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.92, 0.9, 0.84), foam * 0.55);
          gl_FragColor.a = max(gl_FragColor.a, foam * 0.7) * smoothstep(-0.05, 0.03, vDepth);
          float glint = pow(max(0.0, sin(vW.x * 9.0 + uTime * 4.0) * sin(vW.z * 11.0 - uTime * 3.0)), 30.0);
          gl_FragColor.rgb += vec3(1.0, 0.92, 0.75) * glint * 0.5;`);
    };
    const water = new THREE.Mesh(wg, wm);
    water.renderOrder = 2;
    scene.add(water);
    const prev = world.update;
    world.update = (t, dt) => { prev(t, dt); wu.uTime.value = t; wu.uRipple.value.w = Math.max(0, wu.uRipple.value.w - dt * 0.8); };
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
  const inCity = (x, z) => campaign === 'gospel' && x > JERUSALEM.minX - 6 && x < JERUSALEM.maxX + 6 && z > JERUSALEM.minZ - 6 && z < JERUSALEM.maxZ + 6;
  const nearPlace = (x, z, r) => inCity(x, z) || Object.values(PLACES).some((p) => Math.hypot(p.x - x, p.z - z) < r)
    || (campaign === 'gospel' && (Math.hypot(x - GOLGOTHA.x, z - GOLGOTHA.z) < 12 || Math.hypot(x - TOMB.x, z - TOMB.z) < 9));
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

  // --- Grass: a dense field of curved 3D blades that follows the camera. Terrain height and a density
  // mask are baked into a texture, so every blade sits exactly on the ground and avoids paths, water and streets.
  {
    const RES = 512, X0 = -320, Z0 = -310, EXT = 640;
    const data = new Float32Array(RES * RES * 4);
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const x = X0 + (i / (RES - 1)) * EXT, z = Z0 + (j / (RES - 1)) * EXT;
      const h = heightAt(x, z);
      const slope = Math.abs(heightAt(x + 1.2, z) - h) + Math.abs(heightAt(x, z + 1.2) - h);
      let m = 1;
      if (Math.abs(x - pathX(z)) < 2.2 && z > -32) m = 0;
      else if (Math.abs(x - pathX(z)) < 3.4 && z > -32) m = 0.35;
      if (Math.abs(z - brookZ(x)) < 3.6) m = 0;
      if (inCity(x, z)) m = 0;
      if (campaign === 'gospel' && (Math.hypot(x - GOLGOTHA.x, z - GOLGOTHA.z) < 9)) m *= 0.15;
      m *= THREE.MathUtils.clamp(1.6 - slope, 0, 1);
      const patch = fbm(x * 0.03, z * 0.03, 2);
      m *= THREE.MathUtils.clamp(0.55 + patch * 1.4, 0.15, 1);
      const lush = Math.exp(-((z - brookZ(x)) ** 2) / (16 * 16));
      const k = (j * RES + i) * 4;
      data[k] = h; data[k + 1] = m; data[k + 2] = lush; data[k + 3] = patch;
    }
    // Half floats filter linearly on every WebGL2 device (full floats need an extension phones often lack).
    const half = new Uint16Array(data.length);
    for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(data[i]);
    const hm = new THREE.DataTexture(half, RES, RES, THREE.RGBAFormat, THREE.HalfFloatType);
    hm.minFilter = hm.magFilter = THREE.LinearFilter; hm.needsUpdate = true;
    world.heightTex = { tex: hm, X0, Z0, EXT };

    // One blade: 5 segments, tapered, gently curved forward.
    const seg = 5, bw = 0.06, bh = 1;
    const bp = [], bi = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, w = bw * (1 - t * 0.92);
      bp.push(-w, t * bh, t * t * 0.18, w, t * bh, t * t * 0.18);
      if (i < seg) { const a = i * 2; bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const blade = new THREE.InstancedBufferGeometry();
    blade.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    blade.setIndex(bi);
    blade.computeVertexNormals();
    const N = { low: 30000, medium: 70000, high: 130000, ultra: 220000 }[quality] || 130000;
    const R = { low: 32, medium: 42, high: 52, ultra: 64 }[quality] || 52;
    const offs = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      // denser near the centre so close-up grass is thick while the far ring thins out
      const r = R * Math.sqrt(rand()) ** 1.25, a = rand() * Math.PI * 2;
      offs.set([Math.cos(a) * r, Math.sin(a) * r, rand() * Math.PI * 2, 0.55 + rand() * 0.75], i * 4);
    }
    blade.setAttribute('offset', new THREE.InstancedBufferAttribute(offs, 4));
    blade.instanceCount = N;
    const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.85 });
    const uniforms = { uTime: { value: 0 }, uCenter: { value: new THREE.Vector2() }, uHM: { value: hm }, uHMBox: { value: new THREE.Vector3(X0, Z0, EXT) }, uPlayer: { value: new THREE.Vector3(0, -999, 0) }, uR: { value: R } };
    gm.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        attribute vec4 offset; uniform float uTime, uR; uniform vec2 uCenter; uniform sampler2D uHM; uniform vec3 uHMBox, uPlayer;
        varying float vT; varying vec3 vTint;
        float hh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }`)
      .replace('#include <begin_vertex>', `
        // wrap each blade's slot around the camera so the field never pops
        vec2 rel = mod(offset.xy - uCenter + uR, 2.0 * uR) - uR;
        vec2 wp = uCenter + rel;
        vec4 hmv = texture2D(uHM, (wp - uHMBox.xy) / uHMBox.z);
        float fade = 1.0 - smoothstep(uR * 0.7, uR, length(rel));
        float scale = offset.w * hmv.y * fade * (0.7 + hmv.z * 0.6);
        float t = position.y;
        vT = t;
        vec3 transformed = position * vec3(1.0 + hmv.z * 0.5, 0.55 + hmv.w * 0.25 + hmv.z * 0.45, 1.0);
        float ca = cos(offset.z), sa = sin(offset.z);
        transformed.xz = mat2(ca, -sa, sa, ca) * transformed.xz;
        // wind: big slow gusts plus quick flutter, stronger at the tip
        float gust = sin(uTime * 0.9 + wp.x * 0.05 + wp.y * 0.04) * 0.5 + 0.5;
        float flutter = sin(uTime * 4.0 + hh(wp) * 6.28) * 0.12;
        vec2 bend = vec2(0.55, 0.25) * (gust * 0.45 + flutter) * t * t;
        // trampling: blades lean away from whoever walks through them
        vec2 away = wp - uPlayer.xz; float dP = length(away);
        bend += (dP < 1.4 ? normalize(away + 1e-4) * (1.4 - dP) * 0.9 : vec2(0.0)) * t;
        transformed.xz += bend;
        transformed.y -= dot(bend, bend) * 0.4;
        transformed *= scale;
        transformed.xz += wp; transformed.y += hmv.x - 0.02;
        float v = hh(wp + 3.1);
        vTint = mix(vec3(0.58, 0.55, 0.26), vec3(0.32, 0.45, 0.16), hmv.z * 0.8 + v * 0.25);
        vTint = mix(vTint, vec3(0.70, 0.62, 0.36), clamp(-hmv.w * 1.5, 0.0, 0.6));`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = normalize(vec3(0.0, 1.0, 0.0) + objectNormal * 0.35);`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vT; varying vec3 vTint;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = vTint * mix(0.45, 1.15, vT);`);
    };
    const grass = new THREE.Mesh(blade, gm);
    grass.frustumCulled = false; grass.receiveShadow = true;
    scene.add(grass);
    world.grassFollow = (cam, player) => { uniforms.uCenter.value.set(cam.x, cam.z); if (player) uniforms.uPlayer.value.copy(player); };
    const prev = world.update;
    world.update = (t, dt) => { prev(t, dt); uniforms.uTime.value = t; };
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
    world.clouds = clouds;
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
  if (campaign === 'gospel') buildJerusalem(scene, world);
  if (campaign === 'david') {
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
  }
  // Jesse's house in Bethlehem: a stone house and a sheepfold.
  {
    const p = PLACES.jesse;
    const hs = adobeHouse(p.x - 6, p.z - 8, { w: 9, d: 7, h: 3.6, upper: true, facing: 0, windows: 2 });
    scene.add(hs.group);
    world.colliders.push({ x: p.x - 6, z: p.z - 8, r: 5.5 });
    // A few more homes make a village (Bethlehem / Bethany)
    [[-34, 172, 0.3], [-44, 186, 1.2], [-6, 200, Math.PI], [-30, 204, Math.PI * 0.9], [-52, 168, 0.8]].forEach(([vx, vz, f]) => {
      const v = adobeHouse(vx, vz, { w: 6 + rand() * 2, d: 5 + rand(), h: 3.2, upper: rand() < 0.4, facing: f });
      scene.add(v.group); world.colliders.push(v.footprint);
    });
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

// ------------------------------------------------------------ Jerusalem (Gospel campaign)
function buildJerusalem(scene, world) {
  const J = JERUSALEM;
  const stone = stoneMaterial();
  const stoneDark = stoneMaterial().clone(); stoneDark.color = new THREE.Color(0xd0c0a0);
  const white = new THREE.MeshStandardMaterial({ color: 0xf1eadb, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a93b, metalness: 0.9, roughness: 0.25 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.9 });
  const add = (m) => { m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  const gateHalf = 4;
  const gateSX = pathX(J.maxZ), gateNX = 0;
  // City walls, segment by segment so they follow the hillside, with gates south and north.
  const wallSeg = (x0, z0, x1, z1, gateAt) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      if (gateAt != null && Math.abs((x0 === x1 ? z : x) - gateAt) < gateHalf) continue;
      const y = heightAt(x, z);
      const b = add(new THREE.Mesh(wallBox(x0 === x1 ? 2 : len / n + 0.05, 12, x0 === x1 ? len / n + 0.05 : 2, 0.02), stone));
      b.position.set(x, y + 1.5, z);
      if (i % 2 === 0) { const c = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), stone)); c.position.set(x, y + 7.95, z); }
      world.colliders.push({ x, z, r: 1.6 });
    }
  };
  wallSeg(J.minX, J.maxZ, J.maxX, J.maxZ, gateSX);
  wallSeg(J.minX, J.minZ, J.maxX, J.minZ, gateNX);
  wallSeg(J.minX, J.minZ, J.minX, J.maxZ);
  wallSeg(J.maxX, J.minZ, J.maxX, J.maxZ);
  // Gate towers
  [[gateSX, J.maxZ], [gateNX, J.minZ]].forEach(([gx, gz]) => {
    [-1, 1].forEach((sx) => {
      const x = gx + sx * (gateHalf + 1.6), y = heightAt(x, gz);
      const t = add(new THREE.Mesh(wallBox(4, 15, 4, 0.02), stoneDark)); t.position.set(x, y + 3, gz);
      world.colliders.push({ x, z: gz, r: 2.4 });
    });
    const lintel = add(new THREE.Mesh(new THREE.BoxGeometry(gateHalf * 2 + 2, 1.5, 3), stoneDark));
    lintel.position.set(gx, heightAt(gx, gz) + 9, gz);
  });
  world.gates = { south: new THREE.Vector3(gateSX, 0, J.maxZ), north: new THREE.Vector3(gateNX, 0, J.minZ) };
  // The Temple on its platform at the north of the city
  const T = new THREE.Vector3(14, 0, -34);
  {
    const y = heightAt(T.x, T.z);
    const plat = add(new THREE.Mesh(wallBox(22, 8, 16, 0.02), stone)); plat.position.set(T.x, y - 2, T.z);
    const hall = add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 12), white)); hall.position.set(T.x, y + 7, T.z - 1);
    const porch = add(new THREE.Mesh(new THREE.BoxGeometry(14, 13, 3), white)); porch.position.set(T.x, y + 8.5, T.z + 5.5);
    const trim = add(new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.6, 3.4), gold)); trim.position.set(T.x, y + 15.2, T.z + 5.5);
    const door = add(new THREE.Mesh(new THREE.BoxGeometry(3, 6, 0.3), gold)); door.position.set(T.x, y + 5, T.z + 7.05);
    for (let i = 0; i < 6; i++) { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 9, 12), white)); c.position.set(T.x - 6 + i * 2.4, y + 6.5, T.z + 7.8); }
    world.colliders.push({ x: T.x - 6, z: T.z, r: 6 }, { x: T.x + 6, z: T.z, r: 6 }, { x: T.x, z: T.z - 3, r: 6 });
    world.temple = new THREE.Vector3(T.x, 0, T.z + 11);
  }
  // Houses: adobe and plastered limestone, clear of the main street, grounded on their lowest corner.
  const street = (x, z) => Math.abs(x - THREE.MathUtils.lerp(gateSX, gateNX, (J.maxZ - z) / (J.maxZ - J.minZ))) < 5.5;
  const awningM = [0x8a2a2a, 0x2b4f8a, 0xa8782e].map((c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 }));
  for (let i = 0; i < 90; i++) {
    const x = J.minX + 6 + rand() * (J.maxX - J.minX - 12), z = J.minZ + 6 + rand() * (J.maxZ - J.minZ - 12);
    // keep the story's open spaces clear: temple courts, the upper room and its terrace, both gates
    const temple = Math.abs(x - T.x) < 17 && z > T.z - 12 && z < T.z + 36;
    const upper = Math.hypot(x + 18, z + 8) < 9 || Math.hypot(x + 19, z + 2) < 9;
    const gates = Math.hypot(x - gateSX, z - J.maxZ) < 10 || Math.hypot(x - gateNX, z - J.minZ) < 10;
    if (street(x, z) || temple || upper || gates) continue;
    const w = 5 + rand() * 3, d = 4.5 + rand() * 2.5;
    if (world.colliders.some((c) => c.house && Math.hypot(c.x - x, c.z - z) < c.r + Math.max(w, d) * 0.55 + 1)) continue;
    const facing = x < THREE.MathUtils.lerp(gateSX, gateNX, (J.maxZ - z) / (J.maxZ - J.minZ)) ? Math.PI / 2 : -Math.PI / 2;
    const hs = adobeHouse(x, z, { w, d, h: 3 + rand() * 1.2, upper: rand() < 0.35, facing, stone: rand() < 0.4, doorX: (rand() - 0.5) * 0.6 });
    scene.add(hs.group);
    if (rand() < 0.35) { const aw = add(new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, 1.4), awningM[i % 3])); aw.position.set(x + Math.sin(facing) * (d / 2 + 0.7), heightAt(x, z) + 2.3, z + Math.cos(facing) * (d / 2 + 0.7)); aw.rotation.set(-Math.PI / 2 + 0.3, facing, 0, 'YXZ'); }
    world.colliders.push({ ...hs.footprint, house: true });
  }
  // The upper room: a two-storey house with an outside stair
  {
    const U = new THREE.Vector3(-18, 0, -8);
    const hs = adobeHouse(U.x, U.z, { w: 9, d: 7, h: 3.6, upper: true, facing: 0, windows: 2, doorX: -0.4 });
    scene.add(hs.group);
    const y = heightAt(U.x + 5.1, U.z);
    for (let k = 0; k < 8; k++) { const st = add(new THREE.Mesh(wallBox(1.2, 0.45, 0.8, 0.01), stoneMaterial())); st.position.set(U.x + 5.1, y + 0.2 + k * 0.45, U.z + 3 - k * 0.8); }
    world.colliders.push({ x: U.x, z: U.z, r: 4.6 });
    world.upperRoom = new THREE.Vector3(U.x + 1, 0, U.z + 5.5);
  }
  // Palms along the road up to the south gate (for the triumphal entry)
  const palmTrunk = new THREE.MeshStandardMaterial({ color: 0x7a5e3e, roughness: 1 });
  const frondM = new THREE.MeshStandardMaterial({ color: 0x5f7a34, roughness: 0.9, side: THREE.DoubleSide });
  for (let z = 14; z < 70; z += 7) {
    [-1, 1].forEach((sx) => {
      const x = pathX(z) + sx * (5 + rand() * 2), y = heightAt(x, z);
      const tr = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 7, 7), palmTrunk)); tr.position.set(x, y + 3.5, z); tr.rotation.z = (rand() - 0.5) * 0.15;
      for (let k = 0; k < 7; k++) {
        const fg = new THREE.PlaneGeometry(0.6, 3.4, 1, 4); fg.translate(0, 1.7, 0);
        const fp = fg.attributes.position; for (let v = 0; v < fp.count; v++) fp.setZ(v, -Math.pow(fp.getY(v) / 3.4, 2) * 1.2);
        fg.computeVertexNormals();
        const f = add(new THREE.Mesh(fg, frondM)); f.position.set(x, y + 7, z); f.rotation.set(-1.1, k * 0.9, 0, 'YXZ');
      }
      world.colliders.push({ x, z, r: 0.5 });
    });
  }
  // Gethsemane: an old olive grove by the brook, with a praying rock
  {
    const G0 = GETHSEMANE;
    const rock = add(new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), stoneDark)); rock.scale.set(1.4, 0.6, 1); rock.position.set(G0.x, heightAt(G0.x, G0.z) + 0.2, G0.z);
    world.colliders.push({ x: G0.x, z: G0.z, r: 1.6 });
  }
  // Golgotha: three crosses on a bare skull-shaped knoll (raised later in the story)
  {
    const crosses = new THREE.Group();
    [-4, 0, 4].forEach((dx, i) => {
      const c = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 0.3), wood); post.position.y = 2.75;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.26, 0.26), wood); beam.position.y = 4.3;
      c.add(post, beam); c.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      const x = GOLGOTHA.x + dx, z = GOLGOTHA.z - Math.abs(dx) * 0.3;
      c.position.set(x, heightAt(x, z) - 0.3, z);
      crosses.add(c);
    });
    crosses.visible = false; scene.add(crosses);
    world.crosses = crosses;
    const skull = add(new THREE.Mesh(new THREE.DodecahedronGeometry(3, 1), stoneDark)); skull.scale.set(1.6, 0.8, 1.2);
    skull.position.set(GOLGOTHA.x + 6, heightAt(GOLGOTHA.x + 6, GOLGOTHA.z + 8) - 0.6, GOLGOTHA.z + 8);
  }
  // The garden tomb: a rock face with a doorway and a great rolling stone
  {
    const P0 = TOMB, y = heightAt(P0.x, P0.z);
    const cliff = add(new THREE.Mesh(new THREE.DodecahedronGeometry(6, 1), stoneDark)); cliff.scale.set(1.3, 0.9, 0.8); cliff.position.set(P0.x, y + 2, P0.z - 4);
    const door = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
    door.position.set(P0.x, y + 1.3, P0.z + 0.75); scene.add(door);
    const stoneW = add(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 28), stone)); stoneW.rotation.x = Math.PI / 2;
    stoneW.position.set(P0.x, y + 1.4, P0.z + 1.1);
    world.tombStone = stoneW; world.tombDoor = new THREE.Vector3(P0.x, 0, P0.z + 2.5);
    world.colliders.push({ x: P0.x, z: P0.z - 3, r: 5.5 });
    // garden flowers
    const fl = [0xf2e6f0, 0xe8c040, 0xd8506a];
    for (let i = 0; i < 60; i++) { const a = rand() * 6.28, r = 3 + rand() * 9, x = P0.x + Math.cos(a) * r, z = P0.z + 4 + Math.sin(a) * r * 0.6; const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshStandardMaterial({ color: fl[i % 3] })); f.position.set(x, heightAt(x, z) + 0.25, z); scene.add(f); }
  }
}
