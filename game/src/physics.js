// Lightweight body physics for every character and animal:
//  - soft collision between bodies (people, animals, the player and mounts push each other apart)
//  - lean into acceleration and turns, measured from how each body actually moved this frame
//  - quadrupeds pitch and roll with the slope under their feet
//  - spring-damped secondary motion (robes and tails swing after the body stops or turns)
import * as THREE from 'three';
import { heightAt } from './world.js';

const springs = new WeakMap();
function state(o) {
  let s = springs.get(o);
  if (!s) { s = { prev: o.pos.clone(), vel: new THREE.Vector3(), prevFacing: o.facing || 0, lean: 0, side: 0, leanV: 0, sideV: 0, pitch: 0, roll: 0 }; springs.set(o, s); }
  return s;
}
// Critically-damped-ish spring toward a target
const spring = (x, v, target, k, c, dt) => { const a = (target - x) * k - v * c; v += a * dt; x += v * dt; return [x, v]; };

export function createPhysics(G) {
  const P = G.player;
  const bodies = () => {
    const list = [];
    for (const n of G.npcs) if (n.root.visible && n.solid !== false) list.push({ o: n, r: n.radius || 0.38, mass: n.rig?.scale ? n.rig.scale * n.rig.scale : 1 });
    for (const s of G.sheep) if (!s.carried) list.push({ o: s, r: 0.45 * (s.root.scale.x || 1), mass: 0.6 });
    for (const m of G.systems?.mounts || []) if (P.mount !== m) list.push({ o: m, r: m.kind === 'camel' ? 1.0 : 0.75, mass: 3, fixed: true });
    return list;
  };

  return {
    update(dt) {
      if (dt <= 0) return;
      const list = bodies();
      // 1. Soft separation (mass-weighted) + push from the player / ridden mount
      const pr = P.mount ? 1.0 : 0.38, pm = P.mount ? 6 : 1.2;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          const dx = b.o.pos.x - a.o.pos.x, dz = b.o.pos.z - a.o.pos.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
          if (d2 >= rr * rr || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), pen = (rr - d) * 0.5, nx = dx / d, nz = dz / d;
          const wa = a.fixed ? 0 : b.fixed ? 1 : b.mass / (a.mass + b.mass), wb = 1 - wa;
          a.o.pos.x -= nx * pen * wa * 2; a.o.pos.z -= nz * pen * wa * 2;
          b.o.pos.x += nx * pen * wb * 2; b.o.pos.z += nz * pen * wb * 2;
        }
        if (!G.control && !G.cine) continue;
        const dx = a.o.pos.x - P.pos.x, dz = a.o.pos.z - P.pos.z, rr = a.r + pr, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6 && !a.fixed) {
          const d = Math.sqrt(d2), w = pm / (pm + a.mass), pen = rr - d;
          a.o.pos.x += (dx / d) * pen * w; a.o.pos.z += (dz / d) * pen * w;
          P.pos.x -= (dx / d) * pen * (1 - w); P.pos.z -= (dz / d) * pen * (1 - w);
        }
      }
      // 2. Lean, slope and secondary motion
      for (const n of G.npcs) if (n.root.visible) motion(n, dt, false);
      for (const s of G.sheep) if (!s.carried) motion(s, dt, true);
      for (const m of G.systems?.mounts || []) motion(m, dt, true);
      if (!P.ragdoll) motion(P, dt, false, P.h);
    },
  };

  function motion(o, dt, quad, h = o) {
    const root = h.root; if (!root) return;
    const s = state(o);
    const vx = (o.pos.x - s.prev.x) / dt, vz = (o.pos.z - s.prev.z) / dt;
    s.prev.copy(o.pos);
    const ax = (vx - s.vel.x) / dt, az = (vz - s.vel.z) / dt;
    s.vel.set(vx, 0, vz);
    const f = o.facing ?? root.rotation.y;
    const fwd = Math.sin(f) * ax + Math.cos(f) * az;            // forward acceleration
    let turn = f - s.prevFacing; turn = Math.atan2(Math.sin(turn), Math.cos(turn)); s.prevFacing = f;
    const speed = Math.hypot(vx, vz);
    const turnRate = turn / dt;
    // Lean forward when speeding up, back when stopping; bank into turns like a runner.
    const leanT = THREE.MathUtils.clamp(fwd * 0.012, -0.12, 0.12) + Math.min(speed, 7) * 0.008;
    const sideT = THREE.MathUtils.clamp(-turnRate * speed * 0.02, -0.22, 0.22);
    [s.lean, s.leanV] = spring(s.lean, s.leanV, leanT, 60, 9, dt);
    [s.side, s.sideV] = spring(s.side, s.sideV, sideT, 50, 8, dt);
    if (quad) {
      // Body follows the ground: pitch along the facing direction, roll across it.
      const L = 0.9, x = o.pos.x, z = o.pos.z, sf = Math.sin(f), cf = Math.cos(f);
      const pitchT = Math.atan2(heightAt(x + sf * L, z + cf * L) - heightAt(x - sf * L, z - cf * L), 2 * L);
      const rollT = Math.atan2(heightAt(x + cf * 0.5, z - sf * 0.5) - heightAt(x - cf * 0.5, z + sf * 0.5), 1.0);
      s.pitch += (pitchT - s.pitch) * Math.min(1, dt * 8); s.roll += (rollT - s.roll) * Math.min(1, dt * 8);
      root.rotation.set(-s.pitch + s.lean * 0.3, f, s.roll + s.side * 0.6, 'YXZ');
    } else if (!h.pose?.cross && !h.pose?.fallen) {
      root.rotation.set(s.lean * 0.6, f, s.side, 'YXZ');
    }
    // Robes and tails swing behind the body's motion
    const skirt = h.rig?.skirt;
    if (skirt) { skirt.rotation.x = -s.lean * 1.6 - Math.min(speed, 6) * 0.03; skirt.rotation.z = -s.side * 1.4; }
  }
}
