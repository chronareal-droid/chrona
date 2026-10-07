// Realistic rigged characters (AI-generated GLB) driven by the game's procedural animation.
// An invisible procedural "puppet" runs the usual walk/pray/carry poses; every frame its joint
// rotations are retargeted onto the GLB skeleton, whatever its rest pose (A-pose or T-pose).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createHumanoid } from './characters.js';

const BONE_ALIASES = {
  hips: ['hips', 'pelvis', 'root_hips'],
  torso: ['spine', 'spine01', 'spine1', 'spine_01'],
  chest: ['spine02', 'spine2', 'chest', 'spine_02'],
  neck: ['neck', 'neck01'],
  head: ['head'],
  armL: ['leftarm', 'upperarm_l', 'l_upperarm', 'leftupperarm'],
  foreL: ['leftforearm', 'lowerarm_l', 'l_forearm', 'leftlowerarm'],
  armR: ['rightarm', 'upperarm_r', 'r_upperarm', 'rightupperarm'],
  foreR: ['rightforearm', 'lowerarm_r', 'r_forearm', 'rightlowerarm'],
  handL: ['lefthand', 'hand_l'], handR: ['righthand', 'hand_r'],
  legL: ['leftupleg', 'thigh_l', 'l_thigh', 'leftupperleg'],
  shinL: ['leftleg', 'calf_l', 'l_calf', 'leftlowerleg'],
  legR: ['rightupleg', 'thigh_r', 'r_thigh', 'rightupperleg'],
  shinR: ['rightleg', 'calf_r', 'r_calf', 'rightlowerleg'],
};
const norm = (n) => n.toLowerCase().replace(/^mixamorig[:_]?/, '').replace(/[^a-z0-9_]/g, '');

const loader = new GLTFLoader();
const cache = new Map();
function loadGLB(urls) {
  const key = urls.join('|');
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      for (const u of urls) {
        try { return await loader.loadAsync(u); } catch (e) { console.warn('Model not loaded from', u, e?.message || e); }
      }
      return null;
    })());
  }
  return cache.get(key);
}

/**
 * Returns a humanoid with the same API as createHumanoid ({ root, rig, pose, animate }), or null if the
 * model can't be loaded. `id` looks up public/models/models.json: { id: { local, remote, height } }.
 */
export async function loadRiggedHumanoid(id, fallbackOpts) {
  let manifest = {};
  try { manifest = await (await fetch('./models/models.json')).json(); } catch {}
  const m = manifest[id];
  if (!m) return null;
  const gltf = await loadGLB([m.local, m.remote].filter(Boolean));
  if (!gltf) return null;
  return fromGLTF(gltf, m.height || 1.75, fallbackOpts);
}

function fromGLTF(gltf, height, fallbackOpts) {
  const model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const mt = o.material;
      if (mt) { mt.envMapIntensity = 0.8; if (mt.map) mt.map.anisotropy = 8; }
    }
  });
  // Scale to height and stand on y = 0.
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = height / Math.max(0.01, size.y);
  const root = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(k);
  holder.add(model);
  model.position.y -= box.min.y;
  model.position.x -= (box.min.x + box.max.x) / 2;
  model.position.z -= (box.min.z + box.max.z) / 2;
  root.add(holder);
  root.updateMatrixWorld(true);

  // Map bones
  const bones = {};
  model.traverse((o) => {
    if (!o.isBone) return;
    const n = norm(o.name);
    for (const [slot, names] of Object.entries(BONE_ALIASES)) if (!bones[slot] && names.includes(n)) bones[slot] = o;
  });
  // The torso pivot is the lowest spine bone (rigs disagree on whether that is Spine, Spine01 or Spine02).
  if (bones.hips) {
    const low = bones.hips.children.find((c) => c.isBone && /spine/i.test(c.name));
    if (low) bones.torso = low;
  }
  const ok = ['hips', 'armL', 'armR', 'legL', 'legR'].every((s) => bones[s]);
  if (!ok) console.warn('Rig bones not recognised; the model will stand still.', Object.keys(bones));

  // Rest data in the character frame (root-relative), so puppet rotations (authored in that frame) carry over.
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const charQ = (o) => { const m = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld); const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
  const charP = (o) => o.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInv);
  const rest = {};
  for (const [slot, b] of Object.entries(bones)) rest[slot] = { local: b.quaternion.clone(), W: charQ(b), Wp: charQ(b.parent), pos: b.position.clone() };

  // Rest-pose corrections: bring A/T-pose arms down to the sides and legs straight, matching the puppet's rest.
  const corr = {};
  const down = new THREE.Vector3(0, -1, 0);
  const dirOf = (a, b) => charP(bones[b]).sub(charP(bones[a])).normalize();
  if (bones.armL && bones.foreL) corr.armL = new THREE.Quaternion().setFromUnitVectors(dirOf('armL', 'foreL'), down);
  if (bones.armR && bones.foreR) corr.armR = new THREE.Quaternion().setFromUnitVectors(dirOf('armR', 'foreR'), down);
  if (bones.foreL && bones.handL) corr.foreL = new THREE.Quaternion().setFromUnitVectors(dirOf('foreL', 'handL'), dirOf('armL', 'foreL'));
  if (bones.foreR && bones.handR) corr.foreR = new THREE.Quaternion().setFromUnitVectors(dirOf('foreR', 'handR'), dirOf('armR', 'foreR'));
  if (bones.legL && bones.shinL) corr.legL = new THREE.Quaternion().setFromUnitVectors(dirOf('legL', 'shinL'), down);
  if (bones.legR && bones.shinR) corr.legR = new THREE.Quaternion().setFromUnitVectors(dirOf('legR', 'shinR'), down);

  // Puppet: never added to the scene; supplies poses.
  const puppet = createHumanoid({ ...(fallbackOpts || {}), height });
  const pr = puppet.rig;
  const map = { hips: pr.hips, torso: pr.torso, neck: pr.neck, armL: pr.armL, foreL: pr.foreL, armR: pr.armR, foreR: pr.foreR, legL: pr.legL, shinL: pr.shinL, legR: pr.legR, shinR: pr.shinR };
  const qR = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), qInv = new THREE.Quaternion();
  const hipsRestY = bones.hips ? bones.hips.position.y : 0;
  // Puppet hip offsets are in body units (×height/1.75 = metres); convert metres into the hips' parent space.
  const hipsScale = bones.hips ? (height / 1.75) / bones.hips.parent.getWorldScale(new THREE.Vector3()).y : 1;

  const apply = () => {
    for (const [slot, src] of Object.entries(map)) {
      const b = bones[slot], r = rest[slot];
      if (!b) continue;
      // R: puppet rotation expressed in the character frame, then the rest correction.
      qR.setFromEuler(src.rotation);
      if (corr[slot]) qR.multiply(corr[slot]);
      // local = Wp^-1 * R * W
      qInv.copy(r.Wp).invert();
      qTmp.copy(qInv).multiply(qR).multiply(r.W);
      b.quaternion.copy(qTmp);
    }
    if (bones.hips) bones.hips.position.y = hipsRestY + (pr.hips.position.y - 0.95) * hipsScale;
    holder.rotation.x = puppet.root.children[0].rotation.x; // fallen / kneeling body lean
  };

  // Attachment points that follow the real hands and head.
  const attach = (bone) => { const g = new THREE.Group(); if (bone) { bone.add(g); g.scale.setScalar(1 / bone.getWorldScale(new THREE.Vector3()).x); } return g; };
  const rig = { ...pr, handR: attach(bones.handR) , handL: attach(bones.handL), scale: height / 1.75, glb: true, bones };

  return {
    root, rig, pose: puppet.pose, realistic: true,
    animate: (dt, speed) => { puppet.animate(dt, speed); apply(); },
  };
}
