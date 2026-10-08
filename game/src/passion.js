// The Passion: the purple robe and the crown of thorns (John 19:2), and the cross as Jesus carries it.
import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/**
 * Hang `obj` from a bone so that, at the moment of attaching, its axes match the character's root
 * (up = up, forward = +Z) and its origin sits at `at` (a point in the root's frame, in metres).
 */
function hangFrom(bone, root, obj, at) {
  root.updateMatrixWorld(true);
  const holder = new THREE.Group();
  const bq = bone.getWorldQuaternion(new THREE.Quaternion()), rq = root.getWorldQuaternion(new THREE.Quaternion());
  holder.quaternion.copy(bq.invert().multiply(rq));
  holder.scale.setScalar(1 / bone.getWorldScale(V()).x);
  holder.position.copy(bone.worldToLocal(root.localToWorld(at.clone())));
  holder.add(obj);
  bone.add(holder);
  return holder;
}

/** A soldier's cloak of purple, thrown over his shoulders and hanging open at the front. */
function purpleRobe(s) {
  const H = 1.08 * s, open = 0.62;
  const geo = new THREE.CylinderGeometry(0.235 * s, 0.4 * s, H, 40, 10, true, open, Math.PI * 2 - open * 2);
  geo.translate(0, -H / 2, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const down = -y / H, a = Math.atan2(x, z);
    const fold = 1 + Math.sin(a * 9) * 0.035 * down + Math.sin(a * 4 + 1) * 0.02 * down; // hanging folds
    let nz = z * 0.78 * fold, nx = x * 1.04 * fold, ny = y;
    if (down < 0.12) ny += (0.12 - down) * 0.6 * s * (1 - Math.abs(Math.cos(a))); // rounds over the shoulders
    ny += Math.cos(a * 2) * 0.03 * down * s; // a ragged, uneven hem
    p.setXYZ(i, nx, ny, nz);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a1a64, roughness: 0.82, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  // the clasp at the right shoulder
  const clasp = new THREE.Mesh(new THREE.TorusGeometry(0.035 * s, 0.009 * s, 6, 14), new THREE.MeshStandardMaterial({ color: 0x9a7a3a, metalness: 0.7, roughness: 0.4 }));
  clasp.position.set(-0.13 * s, -0.04 * s, 0.13 * s);
  m.add(clasp);
  return m;
}

/** Two braided thorn branches with spikes all round. */
function thornCrown(s) {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 1 });
  const R = 0.108 * s;
  for (let k = 0; k < 2; k++) {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const w = Math.sin(a * 7 + k * Math.PI) * 0.012 * s;
      pts.push(V(Math.sin(a) * (R + w), Math.cos(a * 7 + k * Math.PI) * 0.012 * s, Math.cos(a) * (R + w) * 1.12));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.0065 * s, 5, true), bark);
    tube.castShadow = true; g.add(tube);
  }
  const thorn = new THREE.ConeGeometry(0.004 * s, 0.03 * s, 4);
  const spikes = new THREE.InstancedMesh(thorn, new THREE.MeshStandardMaterial({ color: 0x5a4a2e, roughness: 1 }), 46);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + Math.random() * 0.1;
    const dir = V(Math.sin(a), (Math.random() - 0.3) * 1.2, Math.cos(a) * 1.12).normalize();
    q.setFromUnitVectors(V(0, 1, 0), dir);
    e.setFromQuaternion(q);
    m4.compose(V(Math.sin(a) * R, (Math.random() - 0.5) * 0.02 * s, Math.cos(a) * R * 1.12).addScaledVector(dir, 0.012 * s), q, V(1, 1, 1));
    spikes.setMatrixAt(i, m4);
  }
  g.add(spikes);
  return g;
}

/** Robe and crown on the hero (procedural figure or the rigged model). Returns { remove }. */
export function dressForPassion(h) {
  const s = h.rig.scale || 1;
  const B = h.rig.bones;
  const chest = B?.chest || B?.torso || h.rig.torso;
  const head = B?.head || h.rig.head || h.rig.neck;
  const robe = purpleRobe(s), crown = thornCrown(s);
  const a = hangFrom(chest, h.root, robe, V(0, 1.47 * s, -0.01 * s));
  const b = hangFrom(head, h.root, crown, V(0, 1.7 * s, 0.01 * s));
  crown.rotation.x = -0.12; // tilted back a little on the brow
  return { robe, crown, removeRobe: () => a.parent?.remove(a), remove: () => { a.parent?.remove(a); b.parent?.remove(b); } };
}

/** The cross, borne on the right shoulder with its foot dragging behind (attach to the character root). */
export function carriedCross(s = 1) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x5e4128, roughness: 0.92 });
  const cross = new THREE.Group();
  const POST = 4.4, ARM = 2.1, JOIN = 3.35; // the beam crosses the post 3.35 m up from its foot
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, POST, 0.18), wood); post.position.y = POST / 2;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(ARM, 0.18, 0.16), wood); beam.position.y = JOIN;
  // rough-hewn: a few dark knots and lashing at the joint
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 5, 12), new THREE.MeshStandardMaterial({ color: 0x8a7650, roughness: 1 }));
  rope.position.y = JOIN; rope.rotation.set(Math.PI / 2, 0.6, 0);
  cross.add(post, beam, rope);
  cross.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  // Orient: the joint rests on the right shoulder; the foot drags on the ground behind and to the right.
  const S = V(-0.2 * s, 1.47 * s, 0.03 * s), F = V(-0.42 * s, 0.06, -3.05 * s);
  const d = S.clone().sub(F); const len = d.length(); d.normalize();
  const holder = new THREE.Group();
  holder.position.copy(F);
  holder.quaternion.setFromUnitVectors(V(0, 1, 0), d);
  // turn the beam about the post so one arm reaches down across his chest, where both hands hold it
  holder.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -0.95));
  holder.add(cross);
  holder.position.add(d.clone().multiplyScalar(len - JOIN)); // move so the joint is at the shoulder
  return holder;
}
