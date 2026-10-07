// The story of 1 Samuel 16–17, told as playable parts. Scripture quoted from the King James Version.
import * as THREE from 'three';
import { PLACES, heightAt, brookZ, pathX } from './world.js';
import { spawnLion, spawnGoliath } from './enemies.js';
import { PARTS } from './menu.js';

const ORDER = PARTS.map((p) => p.id);

export async function runStory(G, startPart = 'prologue') {
  const { V, ui, audio, save, player: P, systems: S } = G;
  const at = (x, z, y = 0) => G.ground(V(x, 0, z)).add(V(0, y, 0));
  const head = (n, y = 1.6) => () => n.pos.clone().add(V(0, y * (n.rig?.scale || 1), 0));
  G.inGame = true;
  ui.showHUD(true);

  // ------------------------------------------------------------ Cast
  const cast = {};
  cast.jesse = G.addNPC({ name: 'Jesse', skin: 0xa77a58, robe: 0x6a5a48, sash: 0x3a3028, hair: 0xd8d2c8, beard: 0xeeeae2, headwrap: 0xcfc4ae, height: 1.66 }, PLACES.jesse, 0);
  cast.samuel = G.addNPC({ name: 'Samuel', skin: 0xa27654, robe: 0xece6d8, sash: 0x5a4a8a, hair: 0xf2f0ea, beard: 0xf8f6f0, headwrap: 0xf2eee4, height: 1.72 }, at(-40, 210), 0);
  const brothers = [
    ['Eliab', 0x8a3a2a, 1.86], ['Abinadab', 0x4a5a3a, 1.8], ['Shammah', 0x3a4a6a, 1.78], ['Nethaneel', 0x6a5a3a, 1.76],
    ['Raddai', 0x5a3a5a, 1.75], ['Ozem', 0x7a6a4a, 1.74], ['Elihu', 0x4a4a4a, 1.73],
  ].map(([name, robe, h], i) => G.addNPC({ name, skin: 0xb98a64, robe, sash: 0x2a2018, hair: 0x2b1d14, beard: i < 4, height: h, armor: i < 3 ? 0x8a7a5a : null }, at(-30 + i * 1.5, 176), Math.PI / 2));
  cast.eliab = brothers[0];
  cast.saul = G.addNPC({ name: 'King Saul', skin: 0xb08060, robe: 0x5a1e2a, sash: 0xd9a93b, hair: 0x2a1a10, beard: true, crown: true, armor: 0x9a9aa2, cape: 0x6a1a2a, height: 1.98, build: 1.1 }, at(14, -21), -0.9);
  // Israel's ranks along the ridge, looking down into the valley
  const ranks = [];
  for (let i = 0; i < 12; i++) {
    const x = -33 + i * 6 + (i % 2) * 1.5, z = -38 - (i % 3);
    ranks.push(G.addNPC({ skin: [0xa77a58, 0xb98a64, 0x8c6040][i % 3], robe: 0x7a6a52, sash: 0x2b4f8a, hair: 0x2a1a10, beard: i % 2 === 0, height: 1.7 + (i % 4) * 0.04, armor: 0x8a7a5a, lookAtPlayer: false }, at(x, z), Math.PI));
  }
  // Spears for the ranks
  const spearM = new THREE.MeshStandardMaterial({ color: 0x5a3e26 });
  ranks.forEach((n) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4), spearM); s.position.y = -0.1; n.rig.handR.add(s); s.castShadow = true; });
  // Philistine line on the far ridge
  for (let i = 0; i < 10; i++) {
    const n = G.addNPC({ skin: 0x9c6c4a, robe: 0x3a2a24, sash: 0x8a1a12, hair: 0x140c08, beard: true, height: 1.8, armor: 0x9a7a3c, headwrap: 0x6a1a12, lookAtPlayer: false }, at(-36 + i * 8, -150 + (i % 2) * 2), 0);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4), spearM); s.position.y = -0.1; n.rig.handR.add(s);
  }
  // Preaching circles in the camp
  [at(-14, -8), at(8, -2), at(-6, -28), at(28, -12)].forEach((p) => S.addPreachGroup(p));
  // Mounts: Jesse's donkey (it carries the bread), and a camel at the camp
  const donkey = S.addMount('donkey', at(-4, 176), Math.PI);
  S.addMount('camel', at(-30, -18), 0.6);
  // The flock
  const flock = [];
  for (let i = 0; i < 10; i++) flock.push(G.addSheep(at(18 + Math.random() * 18, 160 + Math.random() * 14)));
  const lamb = G.addSheep(at(30, 158), 0.65);
  flock.forEach((s) => (s.home = at(26, 166)));
  // Goliath and his shield-bearer (1 Samuel 17:7)
  const gol = spawnGoliath(G, at(0, -146), 0);
  const bearer = G.addNPC({ name: 'Shield-bearer', skin: 0x9c6c4a, robe: 0x3a2a24, sash: 0x8a1a12, hair: 0x140c08, height: 1.75, armor: 0x9a7a3c, lookAtPlayer: false }, at(0, -142), 0);
  {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x7a5a2a, metalness: 0.6, roughness: 0.4 }));
    sh.position.set(-0.1, 0.1, 0.25); bearer.rig.torso.add(sh); sh.castShadow = true;
  }

  // ------------------------------------------------------------ Helpers
  const say = (who, line, ref, o = {}) => ui.say(who, line, { reference: ref || '', ...o });
  const narrate = (line, ref, o) => say('', line, ref, o);
  const waitFor = (fn, poll = 100) => new Promise((res) => { const iv = setInterval(() => { if (fn()) { clearInterval(iv); res(); } }, poll); });
  const near = (p, r) => () => G.control && P.pos.distanceTo(typeof p === 'function' ? p() : p) < r;
  const reach = (part) => {
    save.part = part;
    if (!save.reached.includes(part)) save.reached.push(part);
    save.write();
  };
  const setOutfitForCamp = () => {
    brothers.forEach((b, i) => { b.pos.copy(at(-14 + (i % 3) * 1.6, -14 + Math.floor(i / 3) * 1.6)); b.facing = 0.4; b.root.visible = i < 3; b.solid = i < 3; });
  };
  let clips = null;
  G.playClip = async (id, caption = '') => {
    try { clips = clips || (await (await fetch('./clips/clips.json')).json()); } catch { clips = {}; }
    const src = clips[id];
    if (!src) return false;
    const el = document.getElementById('clip'), v = el.querySelector('video');
    el.hidden = false; el.querySelector('.cap').textContent = caption;
    v.src = src; v.currentTime = 0;
    await v.play().catch(() => {});
    await new Promise((res) => { v.onended = res; el.querySelector('.skip').onclick = res; setTimeout(res, 20000); });
    v.pause(); el.hidden = true;
    return true;
  };
  // An in-engine "story clip": letterboxed, depth-of-field, a camera move with narration over it.
  const clip = async (id, shots, lines) => {
    G.cinemaOn();
    const played = await G.playClip(id, lines[0]?.[0] || '');
    if (played) return;
    let i = 0;
    const camLoop = (async () => { for (const s of shots) { if (s.focus) G.focus = s.focus; await G.shot(...s.args); } })();
    for (const [line, ref, who] of lines) { await say(who || '', line, ref); i++; }
    await camLoop;
  };
  G.onPlayerDeath = async () => {
    G.control = false; G.stats.deaths++;
    await ui.fadeOut(1200);
    ui.card('', 'Rise again', '“The LORD is my shepherd; I shall not want.”', 2200);
    G.heal();
    await G.respawn?.();
    G.snapCamera(); G.cam.pos.copy(G.camera.position);
    await G.wait(1800);
    await ui.fadeIn(900);
    G.control = true;
  };

  // ------------------------------------------------------------ PROLOGUE: The Anointing
  async function prologue() {
    reach('prologue');
    G.setPlayer(at(26, 172), Math.PI * 0.9);
    // The gathering in the courtyard before Jesse's house (the house itself stands at about (-20, 174)).
    cast.samuel.pos.copy(at(-18, 190)); cast.samuel.facing = -Math.PI / 2;
    cast.jesse.pos.copy(at(-14, 186)); cast.jesse.facing = -0.6;
    brothers.forEach((b, i) => { b.pos.copy(at(-28 + i * 1.4, 194)); b.facing = Math.PI * 0.85; });
    await ui.fadeOut(10);
    G.cinemaOn(); audio.music('calm');
    G.shot(at(70, 200, 34), at(30, 196, 14), at(0, 170), at(-18, 178), 12, { ease: true });
    await ui.fadeIn(1800);
    await ui.card('Bethlehem of Judah', 'The Anointing', 'About a thousand years before Christ', 3800);
    await narrate('And the LORD said unto Samuel… fill thine horn with oil, and go, I will send thee to Jesse the Bethlehemite: for I have provided me a king among his sons.', '1 Samuel 16:1');
    G.focus = 4;
    G.shot(at(-13, 192, 2.1), at(-14.5, 191.5, 1.9), head(cast.samuel), head(cast.samuel), 6);
    await narrate('Seven sons of Jesse passed before Samuel. Eliab, the eldest, was tall and fair to look upon.', '1 Samuel 16:6–10');
    G.shot(at(-24, 189.5, 1.9), at(-26, 190, 2.1), head(cast.eliab, 1.75), head(cast.eliab, 1.75), 6);
    await say('The LORD', 'Look not on his countenance, or on the height of his stature… for man looketh on the outward appearance, but the LORD looketh on the heart.', '1 Samuel 16:7');
    await say('Samuel', 'Are here all thy children?', '1 Samuel 16:11');
    await say('Jesse', 'There remaineth yet the youngest, and, behold, he keepeth the sheep.', '1 Samuel 16:11');
    await say('Samuel', 'Send and fetch him: for we will not sit down till he come hither.', '1 Samuel 16:11');
    G.shot(at(40, 160, 6), at(32, 166, 2.4), at(26, 172, 1.2), at(26, 172, 1.4), 4);
    await G.wait(3600);
    G.cinemaOff();
    G.setObjective('Your father calls. Go to Jesse’s house', () => cast.samuel.pos);
    ui.hint(G.input.touch ? 'Left side: move. Right side: look. Tap 👁 to change camera.' : 'WASD to move · Mouse to look · Shift to run · V to change camera (first, second, third person)', 7000);
    await waitFor(near(() => cast.samuel.pos, 5));

    // The anointing
    G.cinemaOn(); G.focus = 3;
    P.pos.copy(at(cast.samuel.pos.x - 1.4, cast.samuel.pos.z)); P.facing = Math.PI / 2;
    cast.samuel.facing = -Math.PI / 2; cast.samuel.lookAtPlayer = false;
    G.shot(at(cast.samuel.pos.x - 0.7, cast.samuel.pos.z + 3.2, 1.7), at(cast.samuel.pos.x - 0.6, cast.samuel.pos.z + 2.4, 1.5), head(cast.samuel), () => P.pos.clone().add(V(0, 1.2, 0)), 5);
    await say('The LORD', 'Arise, anoint him: for this is he.', '1 Samuel 16:12');
    P.h.pose.pray = 1;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, side: THREE.DoubleSide }));
    horn.rotation.z = 2.3; horn.position.y = -0.1; cast.samuel.rig.handR.add(horn);
    cast.samuel.rig.armR.rotation.x = -2;
    await narrate('Then Samuel took the horn of oil, and anointed him in the midst of his brethren…', '1 Samuel 16:13');
    // The Spirit descends
    const dove = S.dove;
    dove.root.visible = true;
    const top = P.pos.clone().add(V(0, 18, 0)), low = P.pos.clone().add(V(0, 2.1, 0));
    dove.root.position.copy(top);
    G.shot(P.pos.clone().add(V(-2.5, 1.0, 4.5)), P.pos.clone().add(V(-1.8, 1.2, 3.6)), top, low, 5.5);
    audio.play('spirit'); audio.music('triumph');
    const t0 = G.t;
    await new Promise((res) => {
      const u = () => {
        const k = Math.min(1, (G.t - t0) / 5);
        dove.root.position.lerpVectors(top, low, 1 - Math.pow(1 - k, 2));
        dove.root.rotation.y += 0.02;
        G.spiritFx = Math.max(G.spiritFx || 0, k);
        if (k >= 1) { G.updaters.splice(G.updaters.indexOf(u), 1); res(); }
      };
      G.updaters.push(u);
    });
    await narrate('…and the Spirit of the LORD came upon David from that day forward.', '1 Samuel 16:13');
    dove.root.visible = false;
    cast.samuel.rig.handR.remove(horn);
    P.h.pose.pray = 0;
    G.flags.anointed = true; P.spirit = 0.6;
    ui.spirit(P.spirit, false);
    ui.toast('The Holy Spirit · new power unlocked', 4500, true);
    G.cinemaOff(); audio.music('calm');
    ui.hint(G.input.touch ? 'Tap SPIRIT to call upon the LORD: time slows, wounds mend, your sling flies true.' : 'Press Q to call upon the Spirit: time slows, wounds mend, your sling flies true. Pray at stone altars (E) to restore it.', 8000);
    await G.wait(1200);
    await ui.fadeOut(1200);
    cast.samuel.root.visible = false; cast.samuel.solid = false; cast.samuel.talk = null;
    await ui.card('', 'Some days later', 'The Philistines gathered their armies to battle at Shochoh, and Israel pitched by the valley of Elah.', 4200);
    return 'lion';
  }

  // ------------------------------------------------------------ PART 1: The Lion
  async function lionPart() {
    reach('lion');
    setOutfitForCamp();
    cast.samuel.root.visible = false;
    G.flags.anointed = true; if (P.spirit < 0.3) P.spirit = 0.5;
    G.setPlayer(at(14, 168), Math.PI * 0.8);
    cast.jesse.pos.copy(PLACES.jesse); cast.jesse.talk = null;
    await ui.fadeIn(1200);
    audio.music('calm');
    G.setObjective('Tend your father’s flock', at(26, 166));
    ui.hint('Your brothers have gone to war with King Saul. You stayed behind with the sheep.', 5000);
    await Promise.race([waitFor(near(at(26, 166), 9)), G.wait(15000)]);
    await G.wait(3000);

    // The lion strikes
    audio.play('roar', 0.6);
    lamb.pos.copy(at(52, 150));
    const lion = spawnLion(G, at(54, 148), lamb, at(110, 92));
    G.cinemaOn(); G.focus = 8;
    await G.shot(G.camera.position.clone(), P.pos.clone().add(V(-2, 2.4, 3)), () => lion.pos.clone().add(V(0, 1, 0)), null, 1.6);
    await say('', 'There came a lion, and took a lamb out of the flock…', '1 Samuel 17:34', { auto: 3200 });
    G.cinemaOff();
    audio.music('battle');
    G.setObjective('Go after the lion and save the lamb', () => lion.pos);
    lion.onEngage = () => {
      G.setObjective('Deliver the lamb from the lion’s mouth', () => lion.pos);
      ui.hint(G.input.touch ? 'STRIKE with your staff. ⟲ to roll away when it crouches to pounce.' : 'Click to strike with your staff. Press C to roll away when it crouches to pounce.', 6000);
    };
    G.respawn = async () => { P.pos.copy(lion.pos).add(V(8, 0, 8)); G.ground(P.pos); lion.hp = Math.max(lion.hp, 2); };
    await lion.defeated;
    audio.music('triumph');
    G.addSpirit(0.3, 'Deliverance');
    await G.wait(800);
    G.cinemaOn(); G.focus = 4;
    await G.shot(G.camera.position.clone(), P.pos.clone().add(V(2.5, 1.4, 2.5)), P.pos.clone().add(V(0, 1, 0)), null, 2);
    await narrate('And I went out after him, and smote him, and delivered it out of his mouth.', '1 Samuel 17:35');
    G.cinemaOff();
    lion.remove();
    lamb.follow = { pos: P.pos };
    G.setObjective('Bring the lamb back to the flock', at(26, 166));
    await waitFor(near(at(26, 166), 8));
    lamb.follow = null; lamb.home = at(26, 166);
    audio.play('bleat');
    audio.music('calm');
    return 'road';
  }

  // ------------------------------------------------------------ PART 2: The Road to Elah
  async function roadPart() {
    reach('road');
    setOutfitForCamp();
    G.flags.anointed = true;
    if (G.player.pos.z < 120) G.setPlayer(at(20, 168), Math.PI);
    cast.jesse.pos.copy(PLACES.jesse);
    await ui.fadeIn(600);
    G.setObjective('Your father is calling. Speak with Jesse', () => cast.jesse.pos);
    await new Promise((res) => {
      cast.jesse.talk = async () => {
        await say('Jesse', 'Take now for thy brethren an ephah of this parched corn, and these ten loaves, and run to the camp to thy brethren;', '1 Samuel 17:17');
        await say('Jesse', 'And carry these ten cheeses unto the captain of their thousand, and look how thy brethren fare.', '1 Samuel 17:18');
        await say('David', 'I will rise early and go, my father. Who will keep the sheep?');
        await say('Jesse', 'Leave them with a keeper. Take the donkey, it bears the bread. And David… the LORD go with thee.');
        cast.jesse.talk = async () => { await say('Jesse', 'Go in peace, my son. Greet your brothers for me.'); };
        res();
      };
    });
    G.setObjective('Take the provisions to your brothers in the camp of Israel', at(pathX(10), 10));
    ui.hint(G.input.touch ? 'Ride Jesse’s donkey: stand by it and tap E. RUN to trot faster.' : 'Ride Jesse’s donkey: walk up to it and press E. Hold Shift to trot.', 7000);
    setTimeout(() => ui.hint('Side quests: Nahum’s lost sheep and the widow Tirzah are near Bethlehem. Look for scrolls along the road (Tab: journal).', 6000), 9000);
    G.respawn = async () => {};
    await waitFor(near(at(pathX(10), 10), 16));
    return 'camp';
  }

  // ------------------------------------------------------------ PART 3: The Camp of Israel
  async function campPart() {
    reach('camp');
    setOutfitForCamp();
    G.flags.anointed = true;
    if (P.pos.z > 30 || P.pos.z < -40) G.setPlayer(at(pathX(12), 12), Math.PI);
    if (P.mount) S.dismount();
    gol.pos.copy(at(0, -146)); bearer.pos.copy(at(0, -142));
    await ui.fadeIn(600);
    G.cinemaOn();
    audio.play('horn'); audio.music('battle');
    await narrate('And David… came to the trench, as the host was going forth to the fight, and shouted for the battle.', '1 Samuel 17:20', { auto: 4200 });
    // The champion steps out
    G.focus = 30;
    G.shot(at(0, -42, 9), at(4, -50, 6), at(0, -120, 3), () => gol.pos.clone().add(V(0, 4, 0)), 9);
    gol.walkTo(at(0, -118), 1.6); bearer.walkTo(at(0, -114), 1.6);
    await narrate('And there went out a champion out of the camp of the Philistines, named Goliath, of Gath, whose height was six cubits and a span.', '1 Samuel 17:4');
    await narrate('He had an helmet of brass upon his head, and he was armed with a coat of mail… and the staff of his spear was like a weaver’s beam.', '1 Samuel 17:5–7');
    G.focus = 6;
    G.shot(at(3, -108, 2.5), at(1, -110, 3.2), () => gol.pos.clone().add(V(0, 4.8, 0)), null, 6);
    audio.play('roar', 0.7); G.shake(0.4);
    await say('Goliath', 'Why are ye come out to set your battle in array? Am not I a Philistine, and ye servants to Saul? Choose you a man for you, and let him come down to me.', '1 Samuel 17:8');
    await say('Goliath', 'I defy the armies of Israel this day; give me a man, that we may fight together.', '1 Samuel 17:10');
    ranks.forEach((r, i) => { r.pose.cower = 0; setTimeout(() => r.walkTo(r.pos.clone().add(V((Math.random() - 0.5) * 6, 0, 12 + Math.random() * 6)), 3.5).then(() => { r.pose.cower = 1; r.facing = Math.PI; }), i * 90); });
    G.focus = 12;
    G.shot(at(14, -20, 5), at(10, -24, 4), at(0, -38, 1), at(0, -30, 1), 5);
    await narrate('And all the men of Israel, when they saw the man, fled from him, and were sore afraid.', '1 Samuel 17:24');
    G.shot(P.pos.clone().add(V(2, 1.8, 2.5)), P.pos.clone().add(V(1.5, 1.7, 2)), P.pos.clone().add(V(0, 1.5, 0)), null, 4);
    await say('David', 'What shall be done to the man that killeth this Philistine, and taketh away the reproach from Israel? For who is this uncircumcised Philistine, that he should defy the armies of the living God?', '1 Samuel 17:26');
    G.cinemaOff();
    gol.walkTo(at(0, -140), 1.6); bearer.walkTo(at(0, -136), 1.6);
    audio.music('calm');

    // Eliab
    G.setObjective('Find your brothers in the camp', () => cast.eliab.pos);
    await new Promise((res) => {
      cast.eliab.talk = async () => {
        await say('Eliab', 'Why camest thou down hither? and with whom hast thou left those few sheep in the wilderness? I know thy pride, and the naughtiness of thine heart; for thou art come down that thou mightest see the battle.', '1 Samuel 17:28');
        await say('David', 'What have I now done? Is there not a cause?', '1 Samuel 17:29');
        cast.eliab.talk = async () => { await say('Eliab', 'Go home, little brother.'); };
        res();
      };
    });
    ui.toast('Provisions delivered', 2500);
    G.flags.canPreach = true;
    G.setObjective('Speak with King Saul at his tent · Optional: preach to the frightened soldiers', () => cast.saul.pos);
    ui.hint('Frightened soldiers huddle around the camp. Walk up and press E to preach. Their courage will matter in the battle to come.', 7000);
    // Saul
    await new Promise((res) => {
      cast.saul.talk = async () => {
        await say('David', 'Let no man’s heart fail because of him; thy servant will go and fight with this Philistine.', '1 Samuel 17:32');
        await say('King Saul', 'Thou art not able to go against this Philistine to fight with him: for thou art but a youth, and he a man of war from his youth.', '1 Samuel 17:33');
        await say('David', 'Thy servant kept his father’s sheep, and there came a lion, and took a lamb out of the flock… The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine.', '1 Samuel 17:34–37');
        await say('King Saul', 'Go, and the LORD be with thee.', '1 Samuel 17:37');
        await say('King Saul', 'But take my armour. A helmet of brass, a coat of mail, and my own sword.', '1 Samuel 17:38');
        const c = await ui.choose('David', 'The king offers his armour.', ['Put on Saul’s armour', 'Refuse it']);
        if (c === 0) {
          G.setArmor(true);
          G.cinemaOff(); G.control = true;
          ui.hint('Try to walk in the king’s armour…', 3000);
          await G.wait(4500);
          G.control = false;
          await say('David', 'I cannot go with these; for I have not proved them.', '1 Samuel 17:39');
          G.setArmor(false);
          ui.toast('David put them off him', 2500);
        } else {
          await say('David', 'I cannot go with these; for I have not proved them. My staff, my sling, and the LORD my God.', '1 Samuel 17:39');
        }
        cast.saul.talk = async () => { await say('King Saul', 'The LORD be with thee, shepherd.'); };
        res();
      };
    });
    G.respawn = async () => {};
    return 'stones';
  }

  // ------------------------------------------------------------ PART 4: Five Smooth Stones
  async function stonesPart() {
    reach('stones');
    setOutfitForCamp();
    G.flags.anointed = true; G.flags.canPreach = true;
    if (P.pos.z > 20 || P.pos.z < -60) G.setPlayer(at(10, -30), Math.PI);
    cast.saul.talk = cast.saul.talk || (async () => say('King Saul', 'The LORD be with thee, shepherd.'));
    await ui.fadeIn(400);
    ui.stones(P.stones, true);
    let picked = 0;
    const spots = [6, 13, 21, 29, 37];
    const stones = spots.map((x) => G.addStonePickup(V(x, 0, brookZ(x) + (Math.random() - 0.5) * 2), { onPick: () => { picked++; G.setObjective(`Choose five smooth stones out of the brook (${picked}/5)`, nextStone); } }));
    const nextStone = () => stones.find((s) => G.pickups.includes(s))?.grp.position || null;
    G.setObjective('Choose five smooth stones out of the brook (0/5)', nextStone);
    ui.hint('“And he took his staff in his hand, and chose him five smooth stones out of the brook.”  1 Samuel 17:40', 6000);
    await waitFor(() => picked >= 5);
    G.setSling(true);
    ui.toast('Sling ready · 5 stones in your shepherd’s bag', 4000, true);
    ui.hint(G.input.touch ? 'Tap SLING to whirl it, STRIKE to release. Missed stones can be picked up again.' : 'Hold right mouse (or press F) to whirl the sling and aim. Click to release. A longer whirl flies straighter.', 8000);
    G.setObjective('Go down to meet the Philistine', PLACES.arena);
    G.respawn = async () => {};
    await waitFor(near(PLACES.arena, 24));
    return 'duel';
  }

  // ------------------------------------------------------------ PART 5: The Champion
  async function duelPart() {
    reach('duel');
    setOutfitForCamp();
    G.flags.anointed = true;
    G.setSling(true);
    if (P.stones < 5) {
      // Arriving from chapter select: refill the bag.
      G.pickups.slice().forEach((pk) => { G.scene.remove(pk.grp); }); G.pickups.length = 0;
      P.stones = 5;
    }
    ui.stones(P.stones, true);
    if (P.pos.distanceTo(PLACES.arena) > 30) G.setPlayer(at(6, -84), Math.PI);
    if (P.mount) S.dismount();
    gol.pos.copy(at(0, -140)); bearer.pos.copy(at(0, -136));
    await ui.fadeIn(400);
    G.cinemaOn(); audio.music('battle');
    G.focus = 14;
    G.shot(at(14, -92, 3), at(10, -96, 4), () => gol.pos.clone().add(V(0, 4, 0)), null, 8);
    gol.walkTo(at(0, -114), 1.8); bearer.walkTo(at(-2, -110), 1.8);
    await narrate('And the Philistine came on and drew near unto David; and the man that bare the shield went before him.', '1 Samuel 17:41');
    await G.wait(1500);
    G.focus = 6;
    G.shot(at(3, -104, 2.4), at(2, -106, 3), () => gol.pos.clone().add(V(0, 4.8, 0)), null, 5);
    audio.play('roar', 0.7);
    await say('Goliath', 'Am I a dog, that thou comest to me with staves? Come to me, and I will give thy flesh unto the fowls of the air, and to the beasts of the field.', '1 Samuel 17:43–44');
    // David's proclamation: a moment of preaching before the whole host
    G.shot(P.pos.clone().add(V(-1.5, 1.6, -2.6)), P.pos.clone().add(V(-1.2, 1.7, -2.1)), P.pos.clone().add(V(0, 1.5, 0)), null, 6);
    P.facing = Math.atan2(gol.pos.x - P.pos.x, gol.pos.z - P.pos.z); P.h.pose.preach = 1;
    const q = await ui.timing('Proclaim the name of the LORD', G.input);
    await say('David', 'Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts, the God of the armies of Israel, whom thou hast defied.', '1 Samuel 17:45');
    await say('David', '…that all the earth may know that there is a God in Israel. And all this assembly shall know that the LORD saveth not with sword and spear: for the battle is the LORD’s.', '1 Samuel 17:46–47');
    P.h.pose.preach = 0;
    if (q > 0.5) { G.addSpirit(1, 'Proclamation'); save.courage = Math.min(100, save.courage + 10); ui.courage(save.courage); }
    bearer.walkTo(at(-14, -126), 3);
    G.cinemaOff();
    ui.boss(true, 1);
    ui.hint('“David hasted, and ran toward the army to meet the Philistine.” Dodge his spear (C to roll). When he throws back his head to roar, sling a stone at his brow.', 8000);
    gol.startFight();
    G.respawn = async () => {
      gol.pos.copy(at(0, -118)); gol.fighting = true; gol.startFight();
      P.pos.copy(at(6, -88)); G.ground(P.pos);
      const lying = G.pickups.filter((p) => p.kind === 'stone');
      lying.forEach((pk) => G.scene.remove(pk.grp)); G.pickups.length = 0;
      P.stones = 5; ui.stones(5);
    };
    await gol.down;
    // Victory: the stone sinks into his forehead
    ui.boss(true, 0);
    G.timeScale = 0.25;
    G.cinemaOn(); G.focus = 6;
    await G.shot(G.camera.position.clone(), gol.pos.clone().add(V(4, 4.5, 6)), gol.headPos(), gol.headPos(), 1.4);
    G.timeScale = 1;
    G.shot(gol.pos.clone().add(V(6, 3, 8)), gol.pos.clone().add(V(9, 2, 11)), gol.pos.clone().add(V(0, 2, 0)), gol.pos.clone().add(V(0, 0.4, 2)), 4.5);
    await narrate('And David put his hand in his bag, and took thence a stone, and slang it, and smote the Philistine in his forehead, that the stone sunk into his forehead; and he fell upon his face to the earth.', '1 Samuel 17:49');
    ui.boss(false);
    audio.music('triumph');
    const brave = save.courage >= 40;
    G.focus = 20;
    ranks.forEach((r) => { r.pose.cower = 0; r.pose.cheer = 1; });
    G.shot(at(0, -50, 6), at(-4, -60, 5), at(0, -40, 1.5), at(0, -100, 1.5), 7);
    if (brave) {
      audio.play('cheer'); setTimeout(() => audio.play('cheer'), 900);
      ranks.forEach((r, i) => setTimeout(() => { r.pose.cheer = 0; r.walkTo(at(r.pos.x, -150), 5.5); }, 600 + i * 120));
      await narrate('And the men of Israel and of Judah arose, and shouted, and pursued the Philistines.', '1 Samuel 17:52');
      ui.toast('Israel’s courage was roused by your preaching', 4000, true);
    } else {
      audio.play('cheer');
      await narrate('And when the Philistines saw their champion was dead, they fled.', '1 Samuel 17:51');
      ui.toast('Tip: preach to more soldiers to see Israel rise up and pursue', 5000);
    }
    await G.wait(1500);
    await ui.fadeOut(1500);
    G.cine = null; ui.cinema(false); ui.showHUD(false);
    G.inGame = false;
    save.part = 'duel'; save.write();
    const mins = Math.round((performance.now() - G.stats.start) / 60000);
    const doneQ = Object.values(save.quests).filter((v) => v === 'done').length;
    document.querySelector('#end .stats').innerHTML = [
      ['Time', `${mins} min`], ['Stones thrown', G.stats.stonesThrown], ['Scrolls', `${save.scrolls.length}/12`],
      ['Side quests', `${doneQ}/3`], ['Israel’s courage', `${save.courage}%`], ['Faith', save.faith],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    document.getElementById('end').hidden = false;
    if (document.pointerLockElement) document.exitPointerLock();
    return null;
  }

  const runners = { prologue, lion: lionPart, road: roadPart, camp: campPart, stones: stonesPart, duel: duelPart };
  let part = ORDER.includes(startPart) ? startPart : 'prologue';
  // Skipping ahead via chapter select: apply what earlier parts would have done.
  if (ORDER.indexOf(part) > 0) { cast.samuel.root.visible = false; cast.samuel.solid = false; G.flags.anointed = true; P.spirit = Math.max(P.spirit, 0.5); }
  if (ORDER.indexOf(part) >= ORDER.indexOf('stones')) {
    ranks.forEach((r) => { r.pos.z += 14; r.pose.cower = 1; r.facing = Math.PI; });
  }
  if (part === 'camp' || part === 'stones' || part === 'duel') G.setPlayer(at(pathX(14), 14), Math.PI);
  if (part === 'road') G.setPlayer(at(16, 170), Math.PI);
  if (part !== 'prologue') await ui.fadeOut(10);
  while (part) part = await runners[part]();
}
