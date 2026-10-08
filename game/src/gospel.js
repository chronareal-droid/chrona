// "The Way of the Cross": the final week of Jesus, from the triumphal entry to the empty tomb.
// Scripture quotations are from the ESV® Bible (see the notice in the README and on the title screen). Told reverently: no combat, nothing graphic.
import * as THREE from 'three';
import { PLACES, heightAt, brookZ, pathX, GOLGOTHA, TOMB, GETHSEMANE, JERUSALEM } from './world.js';

export const GOSPEL_PARTS = [
  { id: 'entry', n: 'Part 1', title: 'Hosanna', blurb: 'Ride into Jerusalem as the crowds spread their garments and palm branches.' },
  { id: 'temple', n: 'Part 2', title: 'The House of Prayer', blurb: 'Teach in the temple courts and heal the blind and the lame.' },
  { id: 'supper', n: 'Part 3', title: 'The Upper Room', blurb: 'Wash the disciples’ feet. Bread and the cup.' },
  { id: 'gethsemane', n: 'Part 4', title: 'Gethsemane', blurb: '“Not as I will, but as you will.”' },
  { id: 'cross', n: 'Part 5', title: 'The Way of the Cross', blurb: 'From Pilate’s judgment seat to Golgotha.' },
  { id: 'risen', n: 'Part 6', title: 'He Is Risen', blurb: 'The third day. The garden. The commission.' },
];
const ORDER = GOSPEL_PARTS.map((p) => p.id);

const robe = (o) => ({ skin: 0xa77a58, robe: 0xcdb58a, sash: 0x5a3a22, hair: 0x2a1a10, beard: true, height: 1.72, ...o });

export async function runGospel(G, startPart = 'entry') {
  const { V, ui, audio, save, player: P, systems: S, world } = G;
  const at = (x, z, y = 0) => G.ground(V(x, 0, z)).add(V(0, y, 0));
  const head = (n, y = 1.6) => () => n.pos.clone().add(V(0, y * (n.rig?.scale || 1), 0));
  const jesusHead = () => P.pos.clone().add(V(0, 1.6, 0));
  G.inGame = true;
  ui.showHUD(true);
  G.flags.anointed = true; // "The Spirit of the Lord is upon me" (Luke 4:18)
  P.spirit = Math.max(P.spirit, 0.6);
  ui.stones(0, false);
  const gs = save.gospel;
  // The colt (Matthew 21:2), ridable throughout
  const colt = S.addMount('donkey', at(16, 160), Math.PI);
  colt.int.prompt = 'Ride the colt';

  // ------------------------------------------------------------ Cast
  const names = ['Peter', 'John', 'James', 'Andrew', 'Philip', 'Thomas', 'Matthew', 'Bartholomew', 'James son of Alphaeus', 'Thaddaeus', 'Simon the Zealot', 'Judas Iscariot'];
  const robes = [0x7a5a3a, 0x8a3a2a, 0x4a5a3a, 0x6a5a48, 0x3a4a6a, 0x5a3a5a, 0x7a6a4a, 0x4a4a4a, 0x6a4a3a, 0x5a5a3a, 0x3a5a5a, 0x5a4a2a];
  const disciples = names.map((name, i) => G.addNPC(robe({ name, robe: robes[i], hair: i === 1 ? 0x5a3a1e : 0x2a1a10, beard: i !== 1, height: 1.68 + (i % 4) * 0.04, headwrap: i % 3 === 0 ? 0xcfc4ae : null, lookAtPlayer: true }), at(4 + (i % 4) * 1.4, 176 + Math.floor(i / 4) * 1.4), Math.PI));
  const [peter, john] = disciples; const judas = disciples[11];
  const follow = (on) => disciples.forEach((d, i) => { d.followP = on ? i : null; });
  // Disciples walk a few paces behind Jesus.
  G.updaters.push(() => {
    disciples.forEach((d, i) => {
      if (d.followP == null || !d.root.visible) return;
      const ang = P.facing + Math.PI + ((i % 4) - 1.5) * 0.35, dist = 3 + Math.floor(i / 4) * 1.6;
      const goal = P.pos.clone().add(V(Math.sin(ang) * dist, 0, Math.cos(ang) * dist));
      if (d.pos.distanceTo(goal) > 1.4 && !d.target) d.walkTo(goal, P.mount ? 6 : Math.min(6, 1.6 + d.pos.distanceTo(goal) * 0.6));
      else if (d.target && d.target.distanceTo(goal) > 2) d.target.copy(G.ground(goal));
    });
  });
  const mary = G.addNPC(robe({ name: 'Mary Magdalene', skin: 0xb88a66, robe: 0x6a3a4a, sash: 0x3a2030, hair: 0x2a1a10, beard: false, headwrap: 0x8a5a6a, height: 1.6 }), at(-60, 60), 0);
  const motherMary = G.addNPC(robe({ name: 'Mary', skin: 0xb88a66, robe: 0x2b4f8a, sash: 0x1a2a4a, beard: false, headwrap: 0x3a5a9a, height: 1.58 }), at(-62, 62), 0);
  [mary, motherMary].forEach((m) => { m.root.visible = false; m.solid = false; });
  const pilate = G.addNPC({ name: 'Pontius Pilate', skin: 0xc49a7a, robe: 0xf2eee4, sash: 0x6a1a5a, hair: 0x3a2a1a, height: 1.76, cape: 0x6a1a5a, lookAtPlayer: false }, at(20, -14), -1.2);
  pilate.root.visible = false;
  const roman = (p, f) => G.addNPC({ skin: 0xb98a64, robe: 0x8a1e1a, sash: 0x2a1a10, hair: 0x2a1a10, height: 1.76, armor: 0xa0a0a8, cape: 0x8a1e1a, lookAtPlayer: false }, p, f);
  const soldiers = [];
  const crowd = [];
  const spawnCrowd = (n, cx, cz, spread, opts = {}) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = at(cx + (Math.random() - 0.5) * spread, cz + (Math.random() - 0.5) * spread * 0.6);
      const f = G.addNPC(robe({ skin: [0xa77a58, 0xb98a64, 0x8c6040, 0xc49a7a][i % 4], robe: [0x8a7a5a, 0x6e6450, 0x9a8462, 0x6a4a5a, 0x4a5a6a, 0xb0a080][i % 6], beard: i % 3 !== 0, headwrap: i % 2 ? [0xcfc4ae, 0x8a6a4a, 0x5a6a8a][i % 3] : null, height: 1.55 + Math.random() * 0.25, lookAtPlayer: true, ...opts }), p, Math.random() * 6);
      out.push(f); crowd.push(f);
    }
    return out;
  };

  // ------------------------------------------------------------ Helpers
  const say = (who, line, ref, o = {}) => ui.say(who, line, { reference: ref || '', ...o });
  const narrate = (line, ref, o) => say('', line, ref, o);
  const waitFor = (fn, poll = 100) => new Promise((res) => { const iv = setInterval(() => { if (fn()) { clearInterval(iv); res(); } }, poll); });
  const near = (p, r) => () => G.control && G.hdist(P.pos, typeof p === 'function' ? p() : p) < r;
  const reach = (part) => { gs.part = part; if (!gs.reached.includes(part)) gs.reached.push(part); save.write(); };
  const clearCrowd = () => { crowd.splice(0).forEach((c) => c.remove()); };
  const placeDisciples = (cx, cz, faceTo) => disciples.forEach((d, i) => { d.followP = null; d.target = null; d.pos.copy(at(cx + (i % 4) * 1.5 - 2.2, cz + Math.floor(i / 4) * 1.5)); d.facing = faceTo ?? Math.PI; d.root.visible = true; d.pose.cower = 0; d.pose.pray = 0; });
  G.onPlayerDeath = async () => { G.heal(); };
  G.respawn = async () => {};
  const wearGlow = (on) => { P.h.root.traverse((o) => { if (o.isMesh && o.material?.emissive) { o.material.emissive.setRGB(on ? 0.25 : 0, on ? 0.22 : 0, on ? 0.15 : 0); } }); };

  // ------------------------------------------------------------ PART 1: Hosanna
  async function entry() {
    reach('entry');
    world.setTime('golden');
    G.setPlayer(at(12, 168), Math.PI);
    placeDisciples(6, 172, Math.PI);
    colt.pos.copy(at(16, 160)); colt.facing = Math.PI; colt.col.x = colt.pos.x; colt.col.z = colt.pos.z;
    await ui.fadeOut(10);
    G.cinemaOn(); audio.music('calm');
    G.shot(at(60, 120, 40), at(20, 150, 16), at(0, -10, 6), at(12, 168, 1.4), 12);
    await ui.fadeIn(1800);
    await ui.card('Bethany, on the Mount of Olives', 'The Way of the Cross', 'The week of the Passover, in the reign of Tiberius Caesar', 4000);
    await narrate('Now when they drew near to Jerusalem and came to Bethphage, to the Mount of Olives, then Jesus sent two disciples…', 'Matthew 21:1');
    G.focus = 5;
    G.shot(at(18, 166, 2), at(17, 164, 1.8), () => colt.pos.clone().add(V(0, 1, 0)), null, 5);
    await say('Jesus', 'Go into the village in front of you, and immediately you will find a donkey tied, and a colt with her. Untie them and bring them to me.', 'Matthew 21:2');
    await narrate('This took place to fulfill what was spoken by the prophet… “Behold, your king is coming to you, humble, and mounted on a donkey.”', 'Matthew 21:4–5');
    G.cinemaOff();
    follow(true);
    G.setObjective('Ride the colt into Jerusalem', () => (P.mount ? world.gates.south : colt.pos));
    ui.hint(G.input.touch ? 'Walk to the colt and tap E to ride. Tap 👁 to change camera.' : 'Walk to the colt and press E to ride · V changes camera (first / second / third person) · Q calls on the Spirit', 8000);
    // The crowd lines the road with palm branches.
    const palmM = new THREE.MeshStandardMaterial({ color: 0x6f8a3a, side: THREE.DoubleSide });
    const lining = [];
    for (let z = 16; z < 78; z += 4) [-1, 1].forEach((sx) => {
      const x = pathX(z) + sx * (3 + Math.random() * 1.5);
      const [c] = spawnCrowd(1, x, z, 0.5);
      c.facing = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 1.4), palmM); frond.position.y = -0.6; c.rig.handR.add(frond);
      c.idle = (n) => { if (P.pos.distanceTo(n.pos) < 14) { n.pose.cheer = 0.5 + Math.sin(G.t * 6 + n.pos.z) * 0.5; } else n.pose.cheer = 0; };
      lining.push(c);
    });
    // Garments spread on the road
    for (let z = 20; z < 70; z += 3.3) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshStandardMaterial({ color: [0x8a3a2a, 0x2b4f8a, 0xb0a080, 0x6a4a5a][Math.floor(z) % 4], roughness: 1 }));
      g.rotation.set(-Math.PI / 2, 0, Math.random()); g.position.set(pathX(z) + (Math.random() - 0.5), heightAt(pathX(z), z) + 0.09, z); g.receiveShadow = true;
      G.scene.add(g);
    }
    let shouted = false;
    await waitFor(() => {
      if (!shouted && G.control && P.pos.z < 82) {
        shouted = true; audio.play('cheer');
        ui.say('The multitudes', 'Hosanna to the Son of David! Blessed is he who comes in the name of the Lord! Hosanna in the highest!', { reference: 'Matthew 21:9', auto: 4500 });
      }
      return near(world.gates.south.clone().setY(0).add(V(0, 0, 10)), 12)();
    });
    G.cinemaOn(); G.focus = 8;
    const ph = G.addNPC(robe({ name: 'A Pharisee', robe: 0x2b3f6a, sash: 0xd9c08a, headwrap: 0xe8e0cc, height: 1.74 }), P.pos.clone().add(V(3, 0, -2)), -2);
    G.shot(P.pos.clone().add(V(-3, 2.6, 4)), P.pos.clone().add(V(-2.4, 2.4, 3)), head(ph, 1.6), jesusHead, 4);
    await say('A Pharisee', 'Teacher, rebuke your disciples.', 'Luke 19:39');
    await say('Jesus', 'I tell you, if these were silent, the very stones would cry out.', 'Luke 19:40');
    G.shot(P.pos.clone().add(V(2, 3.4, 4)), P.pos.clone().add(V(1, 3, 2.5)), jesusHead, at(world.gates.south.x, -20, 8), 6);
    await narrate('And when he drew near and saw the city, he wept over it.', 'Luke 19:41');
    await say('Jesus', 'Would that you, even you, had known on this day the things that make for peace!', 'Luke 19:42');
    ph.remove();
    if (P.mount) S.dismount();
    G.cinemaOff();
    lining.forEach((c) => c.remove());
    return 'temple';
  }

  // Overturning a table: Jesus drives it over; it tips, spins and bounces under gravity while the coins scatter.
  let tablesTurned = 0;
  async function overturn(tb) {
    tb.done = true;
    const first = tablesTurned++ === 0;
    const away = V().subVectors(tb.pos, P.pos).setY(0).normalize();
    P.facing = Math.atan2(away.x, away.z);
    G.cinemaOn(); G.focus = 3;
    const side = V(-away.z, 0, away.x);
    const camA = tb.pos.clone().add(side.clone().multiplyScalar(4)).add(V(0, 1.6, 0)).addScaledVector(away, -1.5);
    const camB = tb.pos.clone().add(side.clone().multiplyScalar(3)).add(V(0, 1.2, 0)).addScaledVector(away, 1);
    G.shot(camA, camB, P.pos.clone().add(V(0, 1.2, 0)), tb.pos.clone().add(V(0, 0.8, 0)), first ? 2.6 : 1.4);
    // the shove
    for (let i = 0; i <= 10; i++) { P.h.pose.shove = i / 10; await G.wait(28); }
    audio.play('hit'); G.shake(0.35);
    if (first) G.timeScale = 0.35; // a moment of slow motion
    tb.seller.pose.cower = 1;
    // rigid-body tumble: velocity, spin, gravity, bounce, friction
    const body = { v: away.clone().multiplyScalar(3.2).add(V(0, 3.4, 0)), w: V(-away.z * 6, (Math.random() - 0.5) * 3, away.x * 6), q: tb.t.quaternion, pos: tb.t.position };
    const coins = [];
    tb.t.children.filter((c) => c.geometry?.type === 'CylinderGeometry' && c.geometry.parameters.radiusTop < 0.05).forEach((c) => {
      const wp = c.getWorldPosition(V()); tb.t.remove(c); G.scene.add(c); c.position.copy(wp);
      coins.push({ m: c, v: away.clone().multiplyScalar(1.5 + Math.random() * 3).add(V((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3)), w: Math.random() * 20 });
    });
    const dq = new THREE.Quaternion(), ax = V();
    let rest = 0;
    const phys = (dt) => {
      body.v.y -= 9.8 * dt;
      body.pos.addScaledVector(body.v, dt);
      const gy = heightAt(body.pos.x, body.pos.z);
      if (body.pos.y < gy) { body.pos.y = gy; if (body.v.y < -1) { body.v.y *= -0.3; audio.play('thud'); G.shake(0.12); } else body.v.y = 0; body.v.x *= 0.6; body.v.z *= 0.6; body.w.multiplyScalar(0.55); }
      const wl = body.w.length();
      if (wl > 1e-3) { dq.setFromAxisAngle(ax.copy(body.w).divideScalar(wl), wl * dt); body.q.premultiply(dq); }
      for (const c of coins) {
        c.v.y -= 9.8 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.w * dt;
        const cy = heightAt(c.m.position.x, c.m.position.z) + 0.01;
        if (c.m.position.y < cy) { c.m.position.y = cy; c.v.multiplyScalar(0.4); c.v.y = Math.abs(c.v.y) * 0.3; c.w *= 0.5; }
      }
      if (body.v.length() < 0.2 && body.pos.y <= gy + 0.01) rest += dt;
      if (rest > 2.5) G.updaters.splice(G.updaters.indexOf(phys), 1);
    };
    G.updaters.push(phys);
    if (first) {
      await G.wait(900);
      G.timeScale = 1;
      await narrate('He overturned the tables of the money-changers and the seats of those who sold pigeons.', 'Matthew 21:12', { auto: 3200 });
    } else await G.wait(900);
    for (let i = 10; i >= 0; i--) { P.h.pose.shove = i / 10; await G.wait(20); }
    tb.seller.pose.cower = 0;
    tb.seller.walkTo(tb.pos.clone().add(V((Math.random() - 0.5) * 10, 0, 16)), 4);
    G.cinemaOff();
  }

  // ------------------------------------------------------------ PART 2: The House of Prayer
  async function temple() {
    reach('temple');
    world.setTime('day');
    if (P.pos.z > 20 || P.pos.z < JERUSALEM.minZ) G.setPlayer(at(world.gates.south.x, 2), Math.PI);
    placeDisciples(world.gates.south.x, 10, Math.PI); follow(true);
    await ui.fadeIn(600);
    G.setObjective('Go up to the temple', world.temple);
    // Money-changers' tables in the court
    const tables = [];
    const tableM = new THREE.MeshStandardMaterial({ color: 0x6a4a2a }), coinM = new THREE.MeshStandardMaterial({ color: 0xd9a93b, metalness: 0.9, roughness: 0.3 });
    [-6, -2, 2, 6].forEach((dx, i) => {
      const p = world.temple.clone().add(V(dx, 0, 5)); G.ground(p);
      const t = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1), tableM); top.position.y = 0.8;
      [-0.9, 0.9].forEach((x) => [-0.4, 0.4].forEach((z) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), tableM); l.position.set(x, 0.4, z); t.add(l); }));
      for (let k = 0; k < 12; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 8), coinM); c.position.set((Math.random() - 0.5) * 1.6, 0.87, (Math.random() - 0.5) * 0.6); t.add(c); }
      t.add(top); t.position.copy(p); t.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.scene.add(t);
      const seller = G.addNPC(robe({ robe: [0x6a4a2a, 0x8a6a3a][i % 2], headwrap: 0xd8cca8 }), p.clone().add(V(0, 0, -1.2)), 0);
      const tb = { t, seller, done: false, pos: p };
      tables.push(tb);
      G.interactables.push({ pos: p, range: 2.6, prompt: 'Overturn the tables', enabled: () => !tb.done && G.flags.cleanse, talk: () => overturn(tb) });
    });
    await waitFor(near(world.temple, 14));
    G.cinemaOn(); G.focus = 10;
    G.shot(world.temple.clone().add(V(10, 6, 12)), world.temple.clone().add(V(6, 4, 9)), world.temple.clone().add(V(0, 3, -4)), null, 5);
    await narrate('And Jesus entered the temple and drove out all who sold and bought in the temple, and he overturned the tables of the money-changers.', 'Matthew 21:12');
    G.cinemaOff();
    G.flags.cleanse = true;
    G.setObjective('Overturn the tables of the moneychangers', () => tables.find((t) => !t.done)?.pos);
    await waitFor(() => tables.every((t) => t.done));
    await say('Jesus', 'It is written, “My house shall be called a house of prayer,” but you make it a den of robbers.', 'Matthew 21:13');
    G.flags.cleanse = false;
    // Teaching and healing
    G.flags.canPreach = true;
    const groups = [world.temple.clone().add(V(-9, 0, 12)), world.temple.clone().add(V(8, 0, 14)), world.temple.clone().add(V(-2, 0, 20))].map((p) => S.addPreachGroup(p, 4));
    const sick = [
      S.addSick(world.temple.clone().add(V(-12, 0, 6)), 'blind'),
      S.addSick(world.temple.clone().add(V(12, 0, 7)), 'lame'),
      S.addSick(world.temple.clone().add(V(4, 0, 22)), 'blind'),
    ];
    await narrate('And the blind and the lame came to him in the temple, and he healed them.', 'Matthew 21:14', { auto: 3800 });
    ui.hint('Teach the people (walk up to a group and press E; answer as Jesus answered, then speak with conviction). Heal the sick: pray with them.', 8000);
    const status = () => `Teach in the temple (${groups.filter((g) => g.done).length}/3) · Heal the sick (${sick.filter((s) => s.healed).length}/3)`;
    G.setObjective(status(), () => (groups.find((g) => !g.done)?.center || sick.find((s) => !s.healed)?.pos));
    await waitFor(() => { ui.objectiveText?.(status()); document.querySelector('.obj-text').textContent = status(); return groups.filter((g) => g.done).length >= 2 && sick.every((s) => s.healed); }, 400);
    await say('Jesus', 'You shall love the Lord your God with all your heart… You shall love your neighbor as yourself.', 'Matthew 22:37–39');
    G.setObjective('As evening falls, go to the upper room', world.upperRoom);
    await waitFor(near(world.upperRoom, 6));
    return 'supper';
  }

  // ------------------------------------------------------------ PART 3: The Upper Room
  async function supper() {
    reach('supper');
    await ui.fadeOut(900);
    clearCrowd();
    world.setTime('night');
    // A furnished upper room, lit by oil lamps (a pavilion on the roof terrace)
    const R = world.upperRoom.clone().add(V(-1, 0, 6)); G.ground(R);
    const room = new THREE.Group(); room.position.copy(R);
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.8 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 7), new THREE.MeshStandardMaterial({ color: 0xb9a37c })); floor.position.y = 0.1; room.add(floor);
    const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 1.2), wood); table.position.y = 0.4; room.add(table);
    const tcloth = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.03, 1.3), cloth); tcloth.position.y = 0.62; room.add(tcloth);
    const bread = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc89a5a })); bread.scale.y = 0.5; bread.position.set(0, 0.7, 0); room.add(bread);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a4a })); cup.position.set(0.35, 0.72, 0); room.add(cup);
    for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), wood); p.position.set(i < 2 ? -4.8 : 4.8, 2, i % 2 ? -3.3 : 3.3); room.add(p); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.25, 7.4), wood); roof.position.y = 4.05; room.add(roof);
    const lamps = [];
    [-2.2, 0, 2.2].forEach((x) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffc070 })); f.position.set(x, 0.75, 0.3); room.add(f); lamps.push(f); });
    const lampLight = new THREE.PointLight(0xffb060, 18, 14, 1.5); lampLight.position.set(0, 1.8, 0); room.add(lampLight);
    room.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    G.scene.add(room);
    const seats = disciples.map((d, i) => { const side = i < 6 ? -1 : 1, k = i % 6; return R.clone().add(V(-2.5 + k, 0, side * 1.2)); });
    disciples.forEach((d, i) => { d.followP = null; d.target = null; d.pos.copy(seats[i]); d.facing = i < 6 ? 0 : Math.PI; d.pose.pray = 0.6; d.solid = false; d.root.visible = true; });
    G.setPlayer(R.clone().add(V(-3.6, 0, 0)), Math.PI / 2);
    await ui.fadeIn(1200);
    G.cinemaOn(); G.focus = 3;
    G.shot(R.clone().add(V(4.5, 2.2, 3)), R.clone().add(V(3.5, 1.9, 2.4)), R.clone().add(V(-3.6, 1.2, 0)), R.clone().add(V(-1, 1.0, 0)), 6);
    await narrate('Now before the Feast of the Passover, when Jesus knew that his hour had come… having loved his own who were in the world, he loved them to the end.', 'John 13:1');
    await narrate('He rose from supper. He laid aside his outer garments, and taking a towel, tied it around his waist.', 'John 13:4');
    G.cinemaOff();
    ui.hint('Wash the disciples’ feet: kneel beside each one and press E.', 6000);
    const washed = new Set();
    const washers = disciples.slice(0, 4);
    washers.forEach((d) => {
      G.interactables.push({ pos: d.pos, range: 2, prompt: `Wash ${d.name}’s feet`, enabled: () => !washed.has(d), talk: async () => {
        P.h.pose.pray = 1; audio.play('pickup');
        if (d === peter) {
          await say('Peter', 'Lord, do you wash my feet? You shall never wash my feet.', 'John 13:6–8');
          await say('Jesus', 'If I do not wash you, you have no share with me.', 'John 13:8');
          await say('Peter', 'Lord, not my feet only but also my hands and my head!', 'John 13:9');
        } else await G.wait(1800);
        P.h.pose.pray = 0; washed.add(d);
      } });
    });
    G.setObjective('Wash the disciples’ feet (0/4)', () => washers.find((d) => !washed.has(d))?.pos);
    await waitFor(() => { document.querySelector('.obj-text').textContent = `Wash the disciples’ feet (${washed.size}/4)`; return washed.size >= 4; }, 300);
    G.setPlayer(R.clone().add(V(-3.4, 0, 0)), Math.PI / 2);
    G.cinemaOn(); G.focus = 2.5;
    await say('Jesus', 'If I then, your Lord and Teacher, have washed your feet, you also ought to wash one another’s feet.', 'John 13:14');
    G.shot(R.clone().add(V(-1.5, 1.6, 2.2)), R.clone().add(V(-1.2, 1.4, 1.8)), () => bread.getWorldPosition(V()), null, 6);
    await say('Jesus', 'This is my body, which is given for you. Do this in remembrance of me.', 'Luke 22:19');
    G.shot(R.clone().add(V(0.8, 1.4, 1.6)), R.clone().add(V(0.6, 1.3, 1.3)), () => cup.getWorldPosition(V()), null, 6);
    await say('Jesus', 'This cup that is poured out for you is the new covenant in my blood.', 'Luke 22:20');
    G.shot(R.clone().add(V(3, 1.8, -2.5)), R.clone().add(V(2.6, 1.6, -2)), head(judas), null, 5);
    await say('Jesus', 'Truly, I say to you, one of you will betray me.', 'Matthew 26:21');
    await say('The disciples', 'Is it I, Lord?', 'Matthew 26:22');
    await say('Jesus', 'What you are going to do, do quickly.', 'John 13:27');
    judas.pose.pray = 0; judas.walkTo(R.clone().add(V(20, 0, 20)), 3);
    await narrate('So, after receiving the morsel of bread, he immediately went out. And it was night.', 'John 13:30');
    judas.root.visible = false;
    G.shot(R.clone().add(V(-6, 2.2, 0.5)), R.clone().add(V(-5.4, 1.9, 0.3)), jesusHead, null, 6);
    await say('Jesus', 'A new commandment I give to you, that you love one another: just as I have loved you, you also are to love one another.', 'John 13:34');
    await narrate('And when they had sung a hymn, they went out to the Mount of Olives.', 'Matthew 26:30');
    await ui.fadeOut(1000);
    G.scene.remove(room);
    G.interactables = G.interactables.filter((it) => !it.prompt?.startsWith('Wash'));
    G.cinemaOff();
    return 'gethsemane';
  }

  // ------------------------------------------------------------ PART 4: Gethsemane
  async function gethsemane() {
    reach('gethsemane');
    world.setTime('night');
    clearCrowd();
    G.setPlayer(at(world.gates.north.x, JERUSALEM.minZ - 6), Math.PI);
    placeDisciples(world.gates.north.x, JERUSALEM.minZ - 3, Math.PI); follow(true);
    judas.root.visible = false; judas.followP = null;
    await ui.fadeIn(1200);
    audio.music('calm');
    G.setObjective('Go out over the brook to the garden of Gethsemane', GETHSEMANE);
    await narrate('He went out with his disciples across the brook Kidron, where there was a garden.', 'John 18:1', { auto: 4200 });
    await waitFor(near(GETHSEMANE, 9));
    follow(false);
    const sleepers = disciples.slice(0, 11);
    sleepers.forEach((d, i) => { d.target = null; d.pos.copy(at(GETHSEMANE.x + 5 + (i % 4) * 1.6, GETHSEMANE.z + 6 + Math.floor(i / 4) * 1.6)); d.pose.cower = 0; });
    await say('Jesus', 'Sit here, while I go over there and pray… remain here, and watch with me.', 'Matthew 26:36–38');
    // Three prayers; each time the disciples fall asleep.
    const prayers = [
      ['My Father, if it be possible, let this cup pass from me; nevertheless, not as I will, but as you will.', 'Matthew 26:39'],
      ['My Father, if this cannot pass unless I drink it, your will be done.', 'Matthew 26:42'],
      ['Father… not my will, but yours, be done.', 'Luke 22:42'],
    ];
    for (let i = 0; i < 3; i++) {
      G.setObjective(`Pray at the rock (${i + 1}/3)`, GETHSEMANE);
      await new Promise((res) => {
        const it = { pos: GETHSEMANE, range: 3, prompt: 'Pray', talk: async () => {
          G.interactables.splice(G.interactables.indexOf(it), 1);
          P.h.pose.pray = 1;
          const q = await ui.timing('Pour out your soul in prayer', G.input);
          await say('Jesus', prayers[i][0], prayers[i][1]);
          if (i === 1) {
            const angel = S.dove; angel.root.visible = true; angel.root.position.copy(P.pos).add(V(0, 3.2, 0.5));
            audio.play('spirit');
            await narrate('And there appeared to him an angel from heaven, strengthening him.', 'Luke 22:43');
            angel.root.visible = false;
          }
          G.addSpirit(0.2 + q * 0.2, 'Prayer');
          P.h.pose.pray = 0;
          res();
        } };
        G.interactables.push(it);
      });
      sleepers.forEach((d) => (d.pose.cower = 1));
      if (i < 2) {
        G.setObjective('Go back to the disciples', () => sleepers[0].pos);
        await waitFor(near(() => sleepers[0].pos, 4));
        await say('Jesus', i === 0 ? 'So, could you not watch with me one hour? Watch and pray that you may not enter into temptation. The spirit indeed is willing, but the flesh is weak.' : 'Sleep and take your rest later on…', i === 0 ? 'Matthew 26:40–41' : 'Matthew 26:45');
        sleepers.forEach((d) => (d.pose.cower = 0));
      }
    }
    // The arrest
    const torchM = new THREE.MeshBasicMaterial({ color: 0xffa040 });
    const lightT = new THREE.PointLight(0xff9a40, 30, 30, 1.6);
    judas.root.visible = true; judas.pos.copy(at(GETHSEMANE.x - 30, GETHSEMANE.z + 10)); judas.pose.pray = 0;
    for (let i = 0; i < 7; i++) {
      const s = roman(at(GETHSEMANE.x - 32 - (i % 3) * 1.5, GETHSEMANE.z + 8 + Math.floor(i / 3) * 1.5), Math.PI / 2);
      const torch = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), torchM); torch.position.y = -0.1; torch.rotation.x = Math.PI; s.rig.handR.add(torch);
      soldiers.push(s);
    }
    soldiers[0].root.add(lightT); lightT.position.y = 2.5;
    G.cinemaOn(); G.focus = 12;
    sleepers.forEach((d) => (d.pose.cower = 0));
    G.shot(P.pos.clone().add(V(3, 2, 4)), P.pos.clone().add(V(2, 1.8, 3)), () => judas.pos.clone().add(V(0, 1.4, 0)), null, 6);
    judas.walkTo(P.pos.clone().add(V(-1.2, 0, 0.2)), 2.4);
    soldiers.forEach((s, i) => s.walkTo(P.pos.clone().add(V(-4 - (i % 3) * 1.4, 0, (Math.floor(i / 3) - 1) * 1.6)), 2.4));
    await say('Jesus', 'Rise, let us be going; see, my betrayer is at hand.', 'Matthew 26:46');
    await G.wait(2500);
    G.focus = 2.5;
    G.shot(P.pos.clone().add(V(0.8, 1.7, 2.4)), P.pos.clone().add(V(0.4, 1.6, 2)), () => P.pos.clone().add(V(-0.6, 1.55, 0)), null, 5);
    await narrate('And he came up to Jesus at once and said, “Greetings, Rabbi!” And he kissed him.', 'Matthew 26:49');
    await say('Jesus', 'Judas, would you betray the Son of Man with a kiss?', 'Luke 22:48');
    await say('Jesus', 'Whom do you seek?', 'John 18:4');
    await say('Soldiers', 'Jesus of Nazareth.', 'John 18:5');
    await say('Jesus', 'I am he.', 'John 18:5');
    // Peter and the servant's ear
    const malchus = G.addNPC(robe({ name: 'Malchus', robe: 0x5a4a3a, beard: false, height: 1.7 }), P.pos.clone().add(V(-2.2, 0, 1.4)), Math.PI / 2);
    peter.pos.copy(P.pos.clone().add(V(1.4, 0, 1.2))); peter.facing = -Math.PI / 2;
    audio.play('swing'); G.shake(0.2);
    malchus.pose.cower = 1;
    await narrate('Then Simon Peter, having a sword, drew it and struck the high priest’s servant and cut off his right ear. (The servant’s name was Malchus.)', 'John 18:10');
    await say('Jesus', 'Put your sword into its sheath; shall I not drink the cup that the Father has given me?', 'John 18:11');
    G.cinemaOff();
    G.setObjective('Touch his ear, and heal him', () => malchus.pos);
    await new Promise((res) => {
      const it = { pos: malchus.pos, range: 2.4, prompt: 'Touch his ear and heal him', talk: async () => {
        G.interactables.splice(G.interactables.indexOf(it), 1);
        P.h.pose.preach = 1; audio.play('spirit');
        await G.wait(1400);
        malchus.pose.cower = 0; P.h.pose.preach = 0;
        await narrate('And he touched his ear and healed him.', 'Luke 22:51');
        res();
      } };
      G.interactables.push(it);
    });
    G.cinemaOn();
    await narrate('Then all the disciples left him and fled.', 'Matthew 26:56');
    disciples.forEach((d, i) => d.walkTo(d.pos.clone().add(V(20 + i, 0, 30)), 5));
    await G.wait(1200);
    await ui.fadeOut(1500);
    malchus.remove();
    return 'cross';
  }

  // ------------------------------------------------------------ PART 5: The Way of the Cross
  async function cross() {
    reach('cross');
    world.setTime('day');
    disciples.forEach((d) => { d.root.visible = false; d.followP = null; d.target = null; d.solid = false; });
    soldiers.splice(0).forEach((s) => s.remove());
    // Gabbatha, "the Pavement": Pilate's judgment seat, in the open below the north gate.
    const pav = at(0, -62);
    G.setPlayer(at(0, -63), 0);
    pilate.root.visible = true; pilate.pos.copy(at(0, -59.5)); pilate.facing = Math.PI;
    const mob = spawnCrowd(18, 0, -73, 14, { lookAtPlayer: false });
    mob.forEach((m) => (m.facing = 0));
    const guards = [roman(at(-2, -64), 0), roman(at(2, -64), 0)];
    await ui.fadeIn(1200);
    G.cinemaOn(); G.focus = 6;
    G.shot(pav.clone().add(V(6, 2.6, -3)), pav.clone().add(V(4, 2.2, -2)), head(pilate), jesusHead, 7);
    await narrate('And as soon as it was morning… they bound Jesus and led him away and delivered him over to Pilate.', 'Mark 15:1');
    await say('Pontius Pilate', 'Are you the King of the Jews?', 'John 18:33');
    await say('Jesus', 'My kingdom is not of this world… For this purpose I was born and for this purpose I have come into the world, to bear witness to the truth.', 'John 18:36–37');
    await say('Pontius Pilate', 'What is truth?', 'John 18:38');
    G.shot(pav.clone().add(V(-5, 5, 4)), pav.clone().add(V(-4, 4.2, 2)), pav.clone().add(V(0, 1.5, -10)), null, 6);
    await say('Pontius Pilate', 'Behold the man!', 'John 19:5');
    mob.forEach((m) => (m.pose.cheer = 1));
    audio.play('cheer');
    await say('The crowd', 'Crucify him, crucify him!', 'John 19:6');
    await narrate('And the soldiers twisted together a crown of thorns and put it on his head and arrayed him in a purple robe.', 'John 19:2');
    mob.forEach((m) => (m.pose.cheer = 0));
    // Crown of thorns
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 5, 18), new THREE.MeshStandardMaterial({ color: 0x4a3a20, roughness: 1 }));
    crown.rotation.x = Math.PI / 2; crown.position.y = 0.2;
    (P.h.rig.bones?.head || P.h.rig.neck).add(crown);
    if (P.h.rig.bones?.head) crown.scale.setScalar(1 / P.h.rig.bones.head.getWorldScale(V()).x);
    await narrate('And he went out, bearing his own cross, to the place called The Place of a Skull, which in Aramaic is called Golgotha.', 'John 19:17');
    // Carry the cross
    const crossM = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.9 });
    const carried = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.6, 0.24), crossM); post.position.set(0, 0.6, -1.1); post.rotation.x = -1.05;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.22), crossM); beam.position.set(0, 1.45, 0.05);
    carried.add(post, beam); carried.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    P.h.root.add(carried);
    G.cinemaOff();
    G.setPlayer(at(world.gates.north.x, JERUSALEM.minZ + 4), Math.PI);
    mob.forEach((m, i) => { m.pos.copy(at(world.gates.north.x + (i % 2 ? 4 : -4) + (Math.random() - 0.5) * 3, JERUSALEM.minZ - 6 - i * 4)); m.lookAtPlayer = true; m.facing = i % 2 ? -Math.PI / 2 : Math.PI / 2; });
    guards.forEach((g) => (g.followP = true));
    G.updaters.push(() => guards.forEach((g, i) => { if (!g.followP) return; const goal = P.pos.clone().add(V(i ? 2 : -2, 0, 2.5)); if (g.pos.distanceTo(goal) > 1.2) g.walkTo(goal, 1.8); }));
    G.flags.carrying = true;
    let strength = 1, falls = 0, simonTook = false, womenMet = false;
    const women = spawnCrowd(4, -26, -92, 4, { lookAtPlayer: true, beard: false, headwrap: 0x6a5a7a, female: true });
    const simon = G.addNPC(robe({ name: 'Simon of Cyrene', skin: 0x6a4a30, robe: 0x8a6a3a, height: 1.8 }), at(-14, -88), 0);
    ui.hint('The cross is heavy. Walk slowly (do not run); your strength drains as you go. If you stumble, press E to rise.', 8000);
    G.setObjective('Carry the cross to Golgotha', GOLGOTHA);
    G.carrySpeed = 0.45;
    await new Promise((res) => {
      const tick = setInterval(async () => {
        if (!G.control) return;
        const moving = Math.hypot(P.vel.x, P.vel.z) > 0.3;
        strength = Math.max(0, Math.min(1, strength + (moving ? (simonTook ? 0.004 : -0.012) : 0.02)));
        ui.health(strength);
        if (strength <= 0 && !G.flags.fallen) {
          G.flags.fallen = true; falls++; G.control = false; P.h.pose.kneel = 1; P.h.pose.pray = 1; G.shake(0.3); audio.play('thud');
          await narrate(falls === 1 ? 'He fell beneath the weight of the cross.' : 'He fell again.', '', { auto: 2600 });
          G.control = true;
          await new Promise((r2) => { const it = { pos: () => P.pos, range: 3, prompt: 'Rise', talk: async () => { G.interactables.splice(G.interactables.indexOf(it), 1); r2(); } }; G.interactables.push(it); });
          P.h.pose.kneel = 0; P.h.pose.pray = 0; strength = 0.6; G.flags.fallen = false;
          if (falls >= 2 && !simonTook) {
            simonTook = true; G.control = false;
            simon.pos.copy(P.pos.clone().add(V(2, 0, -1)));
            await narrate('And as they led him away, they seized one Simon of Cyrene, who was coming in from the country, and laid on him the cross, to carry it behind Jesus.', 'Luke 23:26');
            P.h.root.remove(carried); simon.root.add(carried);
            G.carrySpeed = 0.7; G.control = true;
            G.updaters.push(() => { const goal = P.pos.clone().add(V(0, 0, 2.6)); if (simon.pos.distanceTo(goal) > 1.4) simon.walkTo(goal, 2); });
          }
        }
        if (!womenMet && G.hdist(P.pos, women[0].pos) < 9) {
          womenMet = true; G.control = false;
          women.forEach((w) => (w.pose.pray = 1));
          await narrate('And there followed him a great multitude of the people and of women who were mourning and lamenting for him.', 'Luke 23:27');
          await say('Jesus', 'Daughters of Jerusalem, do not weep for me, but weep for yourselves and for your children.', 'Luke 23:28');
          G.control = true;
        }
        if (G.hdist(P.pos, GOLGOTHA) < 10) { clearInterval(tick); res(); }
      }, 100);
    });
    G.flags.carrying = false; G.carrySpeed = null;
    // The crucifixion: told from a distance, under a darkened sky.
    await ui.fadeOut(1500);
    simon.root.remove(carried); P.h.root.remove(carried);
    guards.forEach((g) => (g.followP = false));
    world.crosses.visible = true;
    const centre = world.crosses.children[1];
    P.h.root.visible = true;
    // Jesus upon the centre cross, arms outstretched
    G.setPlayer(centre.position.clone(), 0);
    P.pos.copy(centre.position).add(V(0, 0.85, 0.22)); G.control = false;
    G.cinemaOn();
    const hold = () => { P.pos.copy(centre.position).add(V(0, 0.85, 0.22)); P.vel.set(0, 0, 0); P.h.root.position.copy(P.pos); P.h.root.rotation.y = 0; };
    G.crossHold = hold;
    mob.forEach((m, i) => { m.pos.copy(at(GOLGOTHA.x + (Math.random() - 0.5) * 24, GOLGOTHA.z + 12 + Math.random() * 8)); m.facing = Math.PI; m.lookAtPlayer = false; });
    motherMary.root.visible = true; mary.root.visible = true; john.root.visible = true;
    motherMary.pos.copy(at(GOLGOTHA.x - 1.5, GOLGOTHA.z + 5)); mary.pos.copy(at(GOLGOTHA.x + 1.2, GOLGOTHA.z + 5.5)); john.pos.copy(at(GOLGOTHA.x - 0.2, GOLGOTHA.z + 6));
    [motherMary, mary, john].forEach((n) => { n.facing = Math.PI; n.lookAtPlayer = false; n.pose.pray = 0.7; });
    const centurion = roman(at(GOLGOTHA.x + 4, GOLGOTHA.z + 6), Math.PI);
    G.focus = 40;
    G.shot(at(GOLGOTHA.x + 30, GOLGOTHA.z + 40, 10), at(GOLGOTHA.x + 18, GOLGOTHA.z + 30, 7), at(GOLGOTHA.x, GOLGOTHA.z, 4), null, 14);
    await ui.fadeIn(2000);
    audio.music('calm');
    await narrate('And when they came to the place that is called The Skull, there they crucified him, and the criminals, one on his right and one on his left.', 'Luke 23:33');
    await say('Jesus', 'Father, forgive them, for they know not what they do.', 'Luke 23:34');
    await say('Jesus', 'Truly, I say to you, today you will be with me in paradise.', 'Luke 23:43');
    G.focus = 10;
    G.shot(at(GOLGOTHA.x - 4, GOLGOTHA.z + 12, 2.2), at(GOLGOTHA.x - 3, GOLGOTHA.z + 10, 2.4), at(GOLGOTHA.x, GOLGOTHA.z + 5, 1.5), at(GOLGOTHA.x, GOLGOTHA.z, 4), 8);
    await say('Jesus', 'Woman, behold, your son!… Behold, your mother!', 'John 19:26–27');
    world.setTime('darkness');
    audio.music(null);
    G.focus = 40;
    G.shot(at(GOLGOTHA.x + 26, GOLGOTHA.z + 34, 6), at(GOLGOTHA.x + 20, GOLGOTHA.z + 28, 5), at(GOLGOTHA.x, GOLGOTHA.z, 4), null, 16);
    await narrate('Now from the sixth hour there was darkness over all the land until the ninth hour.', 'Matthew 27:45');
    await say('Jesus', 'Eli, Eli, lema sabachthani? That is, “My God, my God, why have you forsaken me?”', 'Matthew 27:46');
    await say('Jesus', 'I thirst.', 'John 19:28');
    await say('Jesus', 'It is finished.', 'John 19:30');
    await say('Jesus', 'Father, into your hands I commit my spirit!', 'Luke 23:46');
    G.shake(1.2); audio.play('thud'); setTimeout(() => { audio.play('thud'); G.shake(0.8); }, 700);
    await narrate('And behold, the curtain of the temple was torn in two, from top to bottom. And the earth shook, and the rocks were split.', 'Matthew 27:51');
    G.focus = 6;
    G.shot(centurion.pos.clone().add(V(2, 1.8, 3)), centurion.pos.clone().add(V(1.4, 1.7, 2.2)), head(centurion), at(GOLGOTHA.x, GOLGOTHA.z, 4), 7);
    await say('The centurion', 'Truly this was the Son of God!', 'Matthew 27:54');
    await ui.fadeOut(3000);
    G.crossHold = null;
    await ui.card('', 'It is finished', '“For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.” John 3:16', 7000);
    await narrate('And Joseph took the body and wrapped it in a clean linen shroud and laid it in his own new tomb… And he rolled a great stone to the entrance of the tomb.', 'Matthew 27:59–60');
    await ui.card('', 'The third day', '', 3200);
    crown.parent?.remove(crown);
    mob.forEach((m) => m.remove()); women.forEach((w) => w.remove()); simon.remove(); guards.forEach((g) => g.remove()); centurion.remove();
    world.crosses.visible = false;
    return 'risen';
  }

  // ------------------------------------------------------------ PART 6: He Is Risen
  async function risen() {
    reach('risen');
    world.setTime('dawn');
    G.crossHold = null;
    [motherMary].forEach((n) => (n.root.visible = false));
    mary.root.visible = true; mary.pos.copy(at(TOMB.x + 6, TOMB.z + 9)); mary.facing = -2.4; mary.pose.pray = 0.8; mary.lookAtPlayer = false;
    G.setPlayer(at(TOMB.x, TOMB.z + 2.2), 0);
    P.h.root.visible = false;
    G.cinemaOn(); G.focus = 6;
    G.shot(at(TOMB.x + 7, TOMB.z + 10, 2.6), at(TOMB.x + 5, TOMB.z + 8, 2.2), at(TOMB.x, TOMB.z, 1.5), null, 9);
    await ui.fadeIn(2500);
    audio.music('triumph');
    // The stone is rolled away
    const st = world.tombStone, from = st.position.clone(), to = st.position.clone().add(V(3, 0, 0.2));
    const t0 = G.t;
    G.shake(0.9); audio.play('thud');
    await new Promise((res) => { const u = () => { const k = Math.min(1, (G.t - t0) / 3); st.position.lerpVectors(from, to, k); st.rotation.y = -k * 2.2; if (k >= 1) { G.updaters.splice(G.updaters.indexOf(u), 1); res(); } }; G.updaters.push(u); });
    await narrate('And behold, there was a great earthquake, for an angel of the Lord descended from heaven and came and rolled back the stone.', 'Matthew 28:2');
    // Jesus walks out, clothed in light
    P.h.root.visible = true; wearGlow(true); G.spiritFx = 1;
    audio.play('spirit');
    G.shot(at(TOMB.x + 2, TOMB.z + 6, 1.7), at(TOMB.x + 1.6, TOMB.z + 5, 1.6), at(TOMB.x, TOMB.z + 1.5, 1.4), jesusHead, 6);
    await G.wait(2500);
    G.cinemaOff(); G.spiritFx = 0;
    G.setObjective('Go to Mary Magdalene, weeping in the garden', () => mary.pos);
    await waitFor(near(() => mary.pos, 3.2));
    G.cinemaOn(); G.focus = 2.5;
    mary.lookAtPlayer = true;
    G.shot(mary.pos.clone().add(V(1.6, 1.6, 1.8)), mary.pos.clone().add(V(1.2, 1.55, 1.4)), head(mary, 1.5), jesusHead, 6);
    await say('Jesus', 'Woman, why are you weeping? Whom are you seeking?', 'John 20:15');
    await say('Mary Magdalene', 'Sir, if you have carried him away, tell me where you have laid him, and I will take him away.', 'John 20:15');
    await say('Jesus', 'Mary.', 'John 20:16');
    mary.pose.pray = 0; mary.pose.cheer = 1;
    await say('Mary Magdalene', 'Rabboni!', 'John 20:16');
    await say('Jesus', 'Go to my brothers and say to them, “I am ascending to my Father and your Father, to my God and your God.”', 'John 20:17');
    mary.pose.cheer = 0;
    mary.walkTo(at(10, -40), 4);
    G.cinemaOff();
    // The disciples on the mountain (the Mount of Olives, toward Bethany)
    const mount = at(-6, 130);
    placeDisciples(mount.x, mount.z, 0);
    judas.root.visible = false;
    disciples.forEach((d) => { d.pose.pray = 0.4; });
    G.setObjective('Go to your disciples on the mount of Olives', mount);
    ui.hint('A long walk east of the city. The colt waits in the valley if you wish to ride.', 5000);
    colt.pos.copy(at(pathX(-60) + 4, -60)); colt.col.x = colt.pos.x; colt.col.z = colt.pos.z;
    await waitFor(near(mount, 8));
    if (P.mount) S.dismount();
    G.cinemaOn(); G.focus = 6;
    world.setTime('golden');
    G.shot(mount.clone().add(V(6, 3, 8)), mount.clone().add(V(4, 2.6, 6)), jesusHead, null, 8);
    await say('Jesus', 'Peace be with you.', 'John 20:19');
    const thomas = disciples[5];
    await say('Jesus', 'Put your finger here… Do not disbelieve, but believe.', 'John 20:27');
    await say('Thomas', 'My Lord and my God!', 'John 20:28');
    await say('Jesus', 'Blessed are those who have not seen and yet have believed.', 'John 20:29');
    G.shot(mount.clone().add(V(-6, 2.2, -4)), mount.clone().add(V(-4, 2, -3)), jesusHead, null, 8);
    await say('Jesus', 'All authority in heaven and on earth has been given to me. Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.', 'Matthew 28:18–19');
    await say('Jesus', 'You will receive power when the Holy Spirit has come upon you, and you will be my witnesses… to the end of the earth.', 'Acts 1:8');
    await say('Jesus', 'And behold, I am with you always, to the end of the age.', 'Matthew 28:20');
    // The ascension
    disciples.forEach((d) => { d.pose.pray = 0; d.pose.lookUp = 1; d.lookAtPlayer = false; });
    wearGlow(true); audio.play('spirit');
    const base = P.pos.clone(), t1 = G.t;
    G.shot(mount.clone().add(V(10, 1.5, 10)), mount.clone().add(V(8, 1.8, 8)), () => P.pos.clone().add(V(0, 1.2, 0)), null, 10, { ease: false });
    await new Promise((res) => { G.crossHold = () => { const k = (G.t - t1) / 9; P.pos.copy(base).add(V(0, k * k * 40, 0)); P.h.root.position.copy(P.pos); G.spiritFx = Math.min(1, k * 2); if (k >= 1) { G.crossHold = null; res(); } }; });
    await narrate('And when he had said these things, as they were looking on, he was lifted up, and a cloud took him out of their sight.', 'Acts 1:9');
    await ui.fadeOut(2000);
    G.cine = null; ui.cinema(false); ui.showHUD(false); G.spiritFx = 0;
    G.inGame = false;
    const mins = Math.round((performance.now() - G.stats.start) / 60000);
    const end = document.getElementById('end');
    end.querySelector('small').textContent = 'The Way of the Cross · complete';
    end.querySelector('h2').textContent = '“He is not here, for he has risen, as he said.”';
    end.querySelector('.ref').textContent = 'Matthew 28:6';
    end.querySelector('.next-ch').innerHTML = 'Next: <em>Pentecost</em>, when the Holy Spirit comes like a mighty wind and tongues of fire, is still to come.';
    end.querySelector('.stats').innerHTML = [['Time', `${mins} min`], ['Scrolls', `${S.myScrolls().length}/12`], ['Faith', save.faith], ['People taught', `${save.courage}%`]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    end.hidden = false;
    if (document.pointerLockElement) document.exitPointerLock();
    return null;
  }

  const runners = { entry, temple, supper, gethsemane, cross, risen };
  let part = ORDER.includes(startPart) ? startPart : 'entry';
  if (part !== 'entry') await ui.fadeOut(10);
  if (part === 'temple') G.setPlayer(at(world.gates.south.x, 10), Math.PI);
  if (part === 'supper') G.setPlayer(world.upperRoom.clone(), Math.PI);
  // Every chapter starts with the player in control (a chapter that opens with a cutscene takes it back).
  // Starting from the title screen or chapter select would otherwise leave the title camera running.
  while (part) { G.cine = null; ui.cinema(false); G.control = true; part = await runners[part](); }
}
