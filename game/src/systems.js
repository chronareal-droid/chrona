// Gameplay systems: the Holy Spirit, prayer altars, scripture scrolls & rewards, side quests,
// preaching, and ridable animals.
import * as THREE from 'three';
import { heightAt, waterLevel, brookZ, PLACES, BOUNDS } from './world.js';
import { createQuadruped, createSheep, createDove } from './characters.js';

export const SCROLLS = [
  { id: 's1', at: [38, 196], text: 'The LORD is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { id: 's2', at: [-52, 150], text: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.', ref: 'Psalm 23:4' },
  { id: 's3', at: [72, 128], text: 'The LORD is my light and my salvation; whom shall I fear?', ref: 'Psalm 27:1' },
  { id: 's4', at: [-34, 96], text: 'The LORD is my rock and my fortress and my deliverer.', ref: 'Psalm 18:2' },
  { id: 's5', at: [46, 62], text: 'Blessed be the LORD, my rock, who trains my hands for war, and my fingers for battle.', ref: 'Psalm 144:1' },
  { id: 's6', at: [-60, 30], text: 'God is our refuge and strength, a very present help in trouble.', ref: 'Psalm 46:1' },
  { id: 's7', at: [-110, 120], text: 'The heavens declare the glory of God, and the sky above proclaims his handiwork.', ref: 'Psalm 19:1' },
  { id: 's8', at: [34, -4], text: 'For the LORD sees not as man sees: man looks on the outward appearance, but the LORD looks on the heart.', ref: '1 Samuel 16:7' },
  { id: 's9', at: [-38, -40], text: 'I lift up my eyes to the hills. From where does my help come? My help comes from the LORD.', ref: 'Psalm 121:1–2' },
  { id: 's10', at: [-70, -78], text: 'When I look at your heavens, the work of your fingers… what is man that you are mindful of him?', ref: 'Psalm 8:3–4' },
  { id: 's11', at: [64, -92], text: 'When I am afraid, I put my trust in you.', ref: 'Psalm 56:3' },
  { id: 's12', at: [-20, -140], text: 'That all this assembly may know that the LORD saves not with sword and spear. For the battle is the LORD’s.', ref: '1 Samuel 17:47' },
];

export const GOSPEL_SCROLLS = [
  { id: 'g1', at: [38, 196], text: 'I am the good shepherd. The good shepherd lays down his life for the sheep.', ref: 'John 10:11' },
  { id: 'g2', at: [-52, 150], text: 'Come to me, all who labor and are heavy laden, and I will give you rest.', ref: 'Matthew 11:28' },
  { id: 'g3', at: [72, 128], text: 'I am the way, and the truth, and the life. No one comes to the Father except through me.', ref: 'John 14:6' },
  { id: 'g4', at: [-34, 96], text: 'Greater love has no one than this, that someone lay down his life for his friends.', ref: 'John 15:13' },
  { id: 'g5', at: [46, 62], text: 'Blessed are the pure in heart, for they shall see God.', ref: 'Matthew 5:8' },
  { id: 'g6', at: [-60, 30], text: 'I am the light of the world. Whoever follows me will not walk in darkness.', ref: 'John 8:12' },
  { id: 'g7', at: [-110, 120], text: 'Surely he has borne our griefs and carried our sorrows… and with his wounds we are healed.', ref: 'Isaiah 53:4–5' },
  { id: 'g8', at: [44, -2], text: 'Peace I leave with you; my peace I give to you… Let not your hearts be troubled.', ref: 'John 14:27' },
  { id: 'g9', at: [-46, -40], text: 'I am the resurrection and the life. Whoever believes in me, though he die, yet shall he live.', ref: 'John 11:25' },
  { id: 'g10', at: [-70, -78], text: 'For even the Son of Man came not to be served but to serve, and to give his life as a ransom for many.', ref: 'Mark 10:45' },
  { id: 'g11', at: [64, -92], text: 'But God shows his love for us in that while we were still sinners, Christ died for us.', ref: 'Romans 5:8' },
  { id: 'g12', at: [-60, -140], text: 'O death, where is your victory? O death, where is your sting?', ref: '1 Corinthians 15:55' },
];

const QUESTIONS = [
  { fear: 'Is it lawful to pay taxes to Caesar, or not?', ref: 'Matthew 22:17', who: 'A Pharisee',
    good: 'Therefore render to Caesar the things that are Caesar’s, and to God the things that are God’s.', bad: ['Pay nothing to Rome. Rise up against them.', 'Give Caesar whatever he asks; God does not care.'] },
  { fear: 'Teacher, which is the great commandment in the Law?', ref: 'Matthew 22:36', who: 'A lawyer',
    good: 'You shall love the Lord your God with all your heart and with all your soul and with all your mind.', bad: ['Keep the Sabbath and nothing else matters.', 'Bring the largest offering to the temple.'] },
  { fear: 'And who is my neighbor?', ref: 'Luke 10:29', who: 'A scribe',
    good: 'A Samaritan… had compassion. You go, and do likewise.', bad: ['Only those of your own house and nation.', 'Those who are good to you first.'] },
  { fear: 'Lord, how often will my brother sin against me, and I forgive him? As many as seven times?', ref: 'Matthew 18:21', who: 'A disciple',
    good: 'I do not say to you seven times, but seventy-seven times.', bad: ['Seven times, and then cast him out.', 'Forgive no one who wrongs you twice.'] },
  { fear: 'Who is the greatest in the kingdom of heaven?', ref: 'Matthew 18:1', who: 'A disciple',
    good: 'Whoever humbles himself like this child is the greatest in the kingdom of heaven.', bad: ['The one with the most learning.', 'The rich, for God has blessed them.'] },
  { fear: 'By what authority are you doing these things?', ref: 'Matthew 21:23', who: 'A chief priest',
    good: 'The baptism of John, from where did it come? From heaven or from man?', bad: ['By the authority of the high priest.', 'I need not answer the likes of you.'] },
];

export const REWARDS = [
  { need: 3, id: 'breath', name: 'Psalmist’s Breath', desc: 'The Spirit gathers 30% faster.' },
  { need: 6, id: 'vigor', name: 'Shepherd’s Vigour', desc: 'Strength +25%: you can take more blows.' },
  { need: 9, id: 'feet', name: 'Feet like the Deer', desc: 'Run 12% faster. (Psalm 18:33)' },
  { need: 12, id: 'golden', name: 'The Golden Sling', desc: 'A gilded sling that whirls to full strength in half the time.' },
];

const FEARS = [
  { fear: 'Have you seen this man who has come up? Surely he has come up to defy Israel.', ref: '1 Samuel 17:25',
    good: 'Who is this uncircumcised Philistine, that he should defy the armies of the living God?', bad: ['Then let us flee to the hills before he comes.', 'Leave him to me. I alone am stronger than he.'] },
  { fear: 'He is six cubits and a span. No man can stand before such a giant.',
    good: 'Man looks on the outward appearance, but the LORD looks on the heart.', bad: ['Height is nothing. I am greater than all of you.', 'You are right. We are lost.'] },
  { fear: 'Even King Saul trembles in his tent. What hope have we?',
    good: 'The LORD saves not with sword and spear. For the battle is the LORD’s.', bad: ['Kings are cowards. Follow me instead.', 'Hope is for fools and children.'] },
  { fear: 'Forty days he has shamed us, morning and evening.', ref: '1 Samuel 17:16',
    good: 'The LORD who delivered me from the paw of the lion will deliver us from his hand.', bad: ['Forty more days and he will surely tire.', 'Shame is better than death.'] },
  { fear: 'His spear is like a weaver’s beam. It would go clean through us.',
    good: 'Some trust in chariots and some in horses, but we trust in the name of the LORD our God.', bad: ['My sling is mightier than any spear.', 'Then let us hide behind the tents.'] },
  { fear: 'If he wins, we shall be the servants of the Philistines.', ref: '1 Samuel 17:9',
    good: 'Be strong and courageous. Do not be frightened, for the LORD your God is with you.', bad: ['Servants eat well enough.', 'Then we must strike a bargain with Gath.'] },
];

export function createSystems(G) {
  const { scene, V, ui, audio, input, save, player: P } = G;
  const gospel = G.world.campaign === 'gospel';
  const SCR = gospel ? GOSPEL_SCROLLS : SCROLLS;
  if (gospel) document.querySelector('.courage span').textContent = 'Hearts reached';
  const myScrolls = () => save.scrolls.filter((id) => SCR.some((s) => s.id === id));
  const sys = { mounts: [], altars: [], groups: [], quests: {}, scrollSet: SCR, myScrolls };
  G.interactables = [];
  G.flags = G.flags || {};
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];

  // ------------------------------------------------------------ Rewards & stat modifiers
  G.mods = {};
  sys.applyRewards = () => {
    const n = myScrolls().length;
    const has = (id) => REWARDS.find((r) => r.id === id).need <= n;
    G.mods.spiritGain = has('breath') ? 1.3 : 1;
    P.maxHealth = has('vigor') ? 1.25 : 1;
    G.mods.run = has('feet') ? 1.12 : 1;
    G.mods.charge = has('golden') ? 0.55 : 1.1;
    G.mods.armor = save.quests.lostSheep === 'done' ? 0.8 : 1;
    G.sling.material.color.set(has('golden') ? 0xd9a93b : 0x5a3a22);
    G.sling.material.metalness = has('golden') ? 0.9 : 0;
  };

  // ------------------------------------------------------------ The Holy Spirit
  const dove = createDove();
  dove.root.visible = false; scene.add(dove.root);
  const motes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffe2a0, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  { const a = new Float32Array(240 * 3); for (let i = 0; i < a.length; i++) a[i] = (Math.random() - 0.5) * 4; motes.geometry.setAttribute('position', new THREE.BufferAttribute(a, 3)); }
  motes.visible = false; scene.add(motes);
  sys.dove = dove;
  G.addSpirit = (v, why) => {
    if (!G.flags.anointed) return;
    const before = P.spirit;
    P.spirit = Math.min(1, P.spirit + v * (G.mods.spiritGain || 1));
    ui.spirit(P.spirit, P.spiritActive > 0);
    if (why && P.spirit > before) ui.toast(`+ Spirit · ${why}`);
    if (before < 0.5 && P.spirit >= 0.5 && !G.flags.spiritTaught) {
      G.flags.spiritTaught = true;
      ui.hint(input.touch ? 'The Spirit is with you. Tap SPIRIT to call upon the LORD.' : 'The Spirit is with you. Press Q to call upon the LORD: time slows, your sling flies true, wounds mend.', 6500);
    }
  };
  const activateSpirit = () => {
    if (!G.flags.anointed || P.spiritActive > 0 || !G.control) return;
    if (P.spirit < 0.5) { ui.hint('The Spirit must gather before you can call upon it. Pray, preach, and seek the scrolls.', 3000); return; }
    P.spiritActive = 3 + P.spirit * 7; P.spirit = 0;
    audio.play('spirit');
    ui.hint(gospel ? '“The Spirit of the Lord is upon me.”  Luke 4:18' : '“The Spirit of the LORD rushed upon David.”  1 Samuel 16:13', 3000);
  };

  // ------------------------------------------------------------ Prayer altars (stone heaps, "Ebenezer")
  const altarSpots = [[24, 186], [-6, 70], [-24, -6], [30, -70]];
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xb3a28a, roughness: 0.95, flatShading: true });
  altarSpots.forEach(([x, z], i) => {
    const grp = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.2, 0), stoneM);
      const a = k * 2.4, rr = k < 6 ? 0.55 : 0.2;
      r.position.set(Math.cos(a) * rr, k < 6 ? 0.25 : 0.65 + (k - 6) * 0.3, Math.sin(a) * rr);
      r.rotation.set(Math.random(), Math.random(), Math.random()); r.castShadow = true; grp.add(r);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, opacity: 0.9 }));
    flame.position.y = 1.55; grp.add(flame);
    const pos = V(x, heightAt(x, z), z);
    grp.position.copy(pos); scene.add(grp);
    const alt = { pos, flame, ready: 0 };
    sys.altars.push(alt);
    G.world.colliders.push({ x, z, r: 0.9 });
    G.interactables.push({ pos, range: 2.6, prompt: 'Pray at the altar', enabled: () => !P.mount && alt.ready <= 0, talk: () => pray(alt) });
  });
  async function pray(alt) {
    alt.ready = 45;
    P.h.pose.pray = 0;
    const t0 = G.t;
    audio.play('pickup');
    ui.hint('“I lift up my eyes to the hills. From where does my help come?”', 3200);
    while (G.t - t0 < 2.6) { P.h.pose.pray = Math.min(1, P.h.pose.pray + 0.05); await G.wait(30); }
    G.heal(); G.addSpirit(0.4, 'Prayer');
    while (P.h.pose.pray > 0) { P.h.pose.pray = Math.max(0, P.h.pose.pray - 0.06); await G.wait(30); }
  }

  // ------------------------------------------------------------ Scripture scrolls
  const scrollMeshes = [];
  const parchment = new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: 0.8, emissive: 0x403010 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a93b, metalness: 0.9, roughness: 0.25 });
  SCR.forEach((sc, i) => {
    if (save.scrolls.includes(sc.id)) return;
    const [x, z] = sc.at;
    const grp = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 12), parchment); roll.rotation.z = Math.PI / 2;
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.66, 8), gold); c1.rotation.z = Math.PI / 2;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 3;
    grp.add(roll, c1, glow, beam);
    grp.position.set(x, heightAt(x, z) + 0.8, z);
    scene.add(grp);
    scrollMeshes.push({ sc, grp, glow, i });
  });
  const collectScroll = (s) => {
    scene.remove(s.grp); scrollMeshes.splice(scrollMeshes.indexOf(s), 1);
    save.scrolls.push(s.sc.id); save.write();
    audio.play('pickup');
    const n = myScrolls().length;
    ui.scroll(s.sc, n, SCR.length);
    G.addSpirit(0.15, 'Scripture');
    const rw = REWARDS.find((r) => r.need === n);
    if (rw) setTimeout(() => { ui.toast(`Reward unlocked · ${rw.name}`, 5000, true); audio.play('reward'); }, 2600);
    sys.applyRewards();
  };

  // ------------------------------------------------------------ Side quests
  const questDefs = gospel ? {
    lostSheep: { title: 'The Lost Sheep', where: 'Bethany', desc: '“What man of you, having a hundred sheep, if he has lost one of them, does not… go after the one that is lost?” (Luke 15:4) Help old Nahum find three lost ewes.', reward: 'Shepherd’s Cloak, +Faith' },
    widow: { title: 'Bread for the Widow', where: 'Bethany', desc: 'Bring a loaf from the oven by the house to the widow Tirzah.', reward: '+Spirit, +Faith' },
    water: { title: 'A Cup of Cold Water', where: 'Jerusalem', desc: '“Whoever gives one of these little ones even a cup of cold water… will by no means lose his reward.” (Matthew 10:42) Bring water from the brook to Ira the beggar.', reward: '+Hearts reached, +Faith' },
  } : {
    lostSheep: { title: 'The Lost Sheep', where: 'Bethlehem', desc: 'Old Nahum has lost three of his ewes in the hills. Find them and lead them home to his fold.', reward: 'Shepherd’s Cloak: you take 20% less harm. +Faith' },
    widow: { title: 'Bread for the Widow', where: 'Bethlehem', desc: 'Bring a loaf from Jesse’s oven to the widow Tirzah.', reward: '+Spirit, +Faith' },
    water: { title: 'Water for the Wounded', where: 'Camp of Israel', desc: 'A wounded soldier thirsts. Fill a waterskin at the brook of Elah and bring it to him.', reward: '+Army courage, +Faith' },
  };
  const Q = gospel ? (save.gospel.quests ||= {}) : save.quests;
  sys.questDefs = questDefs;
  const questStep = (id, state, msg) => {
    Q[id] = state; save.write();
    if (state === 'active') ui.toast(`Side quest · ${questDefs[id].title}`, 4000, true);
    if (state === 'done') { ui.toast(`Quest complete · ${questDefs[id].title}`, 4500, true); audio.play('reward'); save.faith += 20; save.write(); sys.applyRewards(); }
    if (msg) ui.hint(msg, 4500);
    sys.refreshQuestObjective();
  };
  // Which side-quest target the HUD marker should show when the story has none.
  sys.sideTarget = null;
  sys.refreshQuestObjective = () => {
    sys.sideTarget = null;
    if (Q.lostSheep === 'active') { const s = lost.find((l) => l.following) || lost.find((l) => !l.homeFlag); if (s) sys.sideTarget = s.following ? fold : s.pos; }
    else if (Q.widow === 'active') sys.sideTarget = oven;
    else if (Q.widow === 'bread') sys.sideTarget = tirzah.pos;
    else if (Q.water === 'active') sys.sideTarget = V(-26, 0, brookZ(-26));
    else if (Q.water === 'filled') sys.sideTarget = ira.pos;
  };

  // Lost sheep — Nahum by his fold east of the pasture
  const fold = V(40, 0, 174);
  const nahum = G.addNPC({ name: 'Nahum', skin: 0xa77a58, robe: 0x7a6a52, sash: 0x3e3a30, hair: 0xd8d2c8, beard: 0xe8e2d8, headwrap: 0x9a8a6a, height: 1.62,
    talk: async () => {
      if (!Q.lostSheep) {
        await ui.say('Nahum', gospel ? 'Rabbi! Three of my ewes strayed into the hills at dawn. My knees will not carry me so far.' : 'Son of Jesse! Three of my ewes strayed into the hills at dawn. My knees will not carry me so far.');
        await ui.say(G.heroName, gospel ? 'I will go after the one that is lost, until I find it.' : 'I will bring them back. Not one shall be lost.', gospel ? { reference: 'Luke 15:4' } : {});
        questStep('lostSheep', 'active', 'Find Nahum’s three lost ewes. Walk close and they will follow you home.');
      } else if (Q.lostSheep === 'active') await ui.say('Nahum', `${lost.filter((l) => l.homeFlag).length} of 3 are home. Bless you, boy.`);
      else await ui.say('Nahum', 'Take my old cloak, David. It has turned the teeth of wolves. May it turn worse for you.');
    } }, V(46, 0, 168), -2);
  const lost = [[-90, 196], [96, 104], [-72, 64]].map(([x, z]) => Object.assign(G.addSheep(V(x, 0, z)), { following: false, homeFlag: false }));
  const updateLost = () => {
    if (Q.lostSheep !== 'active') return;
    for (const s of lost) {
      if (s.homeFlag) continue;
      if (!s.following && G.hdist(s.pos, P.pos) < 4) { s.following = true; s.follow = { pos: P.pos }; audio.play('bleat'); ui.toast('A lost ewe follows you'); sys.refreshQuestObjective(); }
      if (s.following && G.hdist(s.pos, fold) < 9) {
        s.following = false; s.follow = null; s.homeFlag = true;
        s.home = fold.clone().add(V((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)); s.target = s.home;
        audio.play('bleat');
        const n = lost.filter((l) => l.homeFlag).length;
        ui.toast(`Ewe returned · ${n}/3`);
        if (n === 3) questStep('lostSheep', 'done');
        else sys.refreshQuestObjective();
      }
    }
  };

  // Widow's bread
  const tirzah = G.addNPC({ name: 'Tirzah', skin: 0xb88a66, robe: 0x4a3a5a, sash: 0x2a2030, hair: 0x9a948c, headwrap: 0x3a2e48, height: 1.58,
    talk: async () => {
      if (!Q.widow) {
        await ui.say('Tirzah', gospel ? 'Shalom, Rabbi. Since my husband died, the cruse runs low and the meal barrel is near empty.' : 'Shalom, David. Since my husband died, the cruse runs low and the meal barrel is near empty.');
        await ui.say(G.heroName, 'Wait here; I will bring you bread.');
        questStep('widow', 'active', 'Take a loaf from the oven beside Jesse’s house.');
      } else if (Q.widow === 'bread') {
        await ui.say('Tirzah', 'Warm bread! The LORD repay you for what you have done, and a full reward be given you.');
        questStep('widow', 'done'); G.addSpirit(0.5, 'Kindness');
      } else if (Q.widow === 'active') await ui.say('Tirzah', 'The oven is by your father’s door.');
      else await ui.say('Tirzah', 'The LORD watch over you, son of Jesse.');
    } }, V(-34, 0, 192), 1.2);
  const oven = V(-12, 0, 168);
  {
    const ov = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xa8784e, roughness: 1 }));
    ov.position.set(oven.x, heightAt(oven.x, oven.z) - 0.05, oven.z); ov.castShadow = true; scene.add(ov);
    G.world.colliders.push({ x: oven.x, z: oven.z, r: 0.9 });
    G.ground(oven);
  }
  G.interactables.push({ pos: oven, range: 2.4, prompt: 'Take a loaf of bread', enabled: () => Q.widow === 'active', talk: async () => { audio.play('pickup'); questStep('widow', 'bread', 'Bring the bread to Tirzah.'); } });

  // Water for the wounded
  const ira = G.addNPC({ name: 'Ira', skin: 0xa77a58, robe: 0x8a7a5a, sash: 0x5a2a20, hair: 0x2a1a10, beard: true, height: 1.74,
    talk: async () => {
      if (!Q.water) {
        await ui.say('Ira', gospel ? 'Water… I have sat by this wall since I was a boy. No one stops for a beggar.' : 'Water… I was struck by a Philistine arrow at the ford. No one dares go down to the brook while the giant walks.');
        await ui.say(G.heroName, gospel ? 'I have stopped for you. Rest, friend.' : 'Then I will go. Rest, brother.');
        questStep('water', 'active', 'Fill a waterskin at the brook of Elah.');
      } else if (Q.water === 'filled') {
        await ui.say('Ira', gospel ? 'Cold as the snow of Lebanon… Who are you, that you would serve a beggar?' : 'Cold as the snow of Lebanon… If a shepherd boy walks into that valley unafraid, why do we hide?');
        questStep('water', 'done'); save.courage = Math.min(100, save.courage + 15); save.write(); ui.courage(save.courage);
      } else if (Q.water === 'active') await ui.say('Ira', 'The brook… please.');
      else await ui.say('Ira', 'I will stand with the ranks today.');
    }, idle: (n) => { if (Q.water !== 'done') n.pose.cower = 0.8; else n.pose.cower = Math.max(0, n.pose.cower - 0.02); } }, V(-22, 0, -4), 0.4);
  G.interactables.push({ pos: () => P.pos, range: 4, prompt: 'Fill the waterskin', enabled: () => Q.water === 'active' && Math.abs(P.pos.z - brookZ(P.pos.x)) < 6,
    talk: async () => { audio.play('pickup'); questStep('water', 'filled', 'Bring the water to Ira in the camp.'); } });

  // ------------------------------------------------------------ The Scribe's Riddles (unscramble the Bible name)
  const RIDDLES = gospel ? [
    { word: 'PETER', clue: 'The fisherman Jesus called “the rock”, who walked on the water toward him.', ref: 'Matthew 16:18; 14:29' },
    { word: 'LAZARUS', clue: 'The friend in Bethany who came forth from the tomb after four days.', ref: 'John 11:43–44' },
    { word: 'ZACCHAEUS', clue: 'A little tax collector who climbed a sycamore tree to see Jesus.', ref: 'Luke 19:2–4' },
    { word: 'NICODEMUS', clue: 'A ruler of the Jews who came to Jesus by night, and was told, “You must be born again.”', ref: 'John 3:1–7' },
    { word: 'BARTIMAEUS', clue: 'The blind beggar of Jericho who cried, “Jesus, Son of David, have mercy on me!”', ref: 'Mark 10:46–47' },
    { word: 'MARTHA', clue: 'She was “distracted with much serving” while her sister sat at the Lord’s feet.', ref: 'Luke 10:40' },
    { word: 'THOMAS', clue: 'The disciple who would not believe until he saw the mark of the nails.', ref: 'John 20:25' },
  ] : [
    { word: 'SAMUEL', clue: 'The prophet who anointed the youngest son of Jesse with a horn of oil.', ref: '1 Samuel 16:13' },
    { word: 'JESSE', clue: 'The Bethlehemite who had eight sons, the youngest a shepherd.', ref: '1 Samuel 16:10–11' },
    { word: 'GOLIATH', clue: 'The champion of Gath, six cubits and a span.', ref: '1 Samuel 17:4' },
    { word: 'JONATHAN', clue: 'Saul’s son, whose soul was knit with the soul of David.', ref: '1 Samuel 18:1' },
    { word: 'BETHLEHEM', clue: 'The town of Judah where David kept his father’s sheep.', ref: '1 Samuel 17:15' },
    { word: 'ELIAB', clue: 'David’s eldest brother, who said, “I know your presumption.”', ref: '1 Samuel 17:28' },
    { word: 'MICHAL', clue: 'King Saul’s daughter, who loved David and became his wife.', ref: '1 Samuel 18:20' },
  ];
  questDefs.riddles = { title: 'The Scribe’s Riddles', where: gospel ? 'Bethany' : 'Bethlehem', desc: 'Shemaiah the scribe has scrambled the letters of names from the Scriptures. Unscramble all seven.', reward: 'Scribe’s Wisdom: +Faith and +Spirit' };
  const riddleSave = gospel ? save.gospel : save;
  riddleSave.riddles ||= 0;
  G.addNPC({ name: 'Shemaiah the scribe', skin: 0xb98a64, robe: 0x2b3f6a, sash: 0xd9c08a, hair: 0x9a948c, beard: 0xcfc8bc, headwrap: 0xe8e0cc, height: 1.64,
    talk: async () => {
      if (Q.riddles === 'done') { await ui.say('Shemaiah the scribe', 'You know the names of the faithful well. “You search the Scriptures…” (John 5:39)'); return; }
      if (!Q.riddles) {
        await ui.say('Shemaiah the scribe', 'Peace be with you. My pupils mix up the letters of names from the Scriptures to test one another. Will you set them right?');
        questStep('riddles', 'active');
      }
      while (riddleSave.riddles < RIDDLES.length) {
        const r = RIDDLES[riddleSave.riddles];
        const ok = await ui.anagram({ ...r, n: riddleSave.riddles + 1, total: RIDDLES.length });
        if (!ok) { await ui.say('Shemaiah the scribe', 'Come back when you are ready. The scroll will wait.'); sys.refreshQuestObjective(); return; }
        riddleSave.riddles++; save.faith += 5; save.write(); audio.play('pickup');
        ui.toast(`Riddle solved · ${riddleSave.riddles}/${RIDDLES.length}`);
      }
      await ui.say('Shemaiah the scribe', 'Every name in its place! “Your word is a lamp to my feet and a light to my path.”', { reference: 'Psalm 119:105' });
      questStep('riddles', 'done'); G.addSpirit(0.4, 'Wisdom');
    } }, V(24, 0, 182), -2.2);

  // ------------------------------------------------------------ Preaching
  sys.addPreachGroup = (center, count = 3) => {
    const men = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const p = center.clone().add(V(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6));
      const n = G.addNPC({ skin: [0xa77a58, 0xb98a64, 0x8c6040][i % 3], robe: [0x8a7a5a, 0x6e6450, 0x9a8462][i % 3], sash: 0x5a2a20, hair: 0x2a1a10, beard: i % 2 === 0, height: 1.7 + Math.random() * 0.1, armor: 0x7a6a50, headwrap: i === 1 ? 0x5a4a3a : null, lookAtPlayer: true, solid: true }, p, Math.atan2(-Math.cos(a), -Math.sin(a)));
      n.pose.cower = 1;
      men.push(n);
    }
    const g = { center: G.ground(center.clone()), men, done: false };
    g.int = { pos: g.center, range: 4, prompt: gospel ? 'Teach the people' : 'Preach to the frightened soldiers', enabled: () => !g.done && G.flags.canPreach, talk: () => preach(g) };
    G.interactables.push(g.int);
    sys.groups.push(g);
    return g;
  };
  let fearDeck = [];
  async function preach(g) {
    if (document.pointerLockElement) document.exitPointerLock();
    const t = P.h.pose;
    const look = g.center.clone().add(V(0, 1.2, 0));
    const camPos = P.pos.clone().add(V().subVectors(P.pos, g.center).setY(0).normalize().multiplyScalar(3.2)).add(V(1.2, 1.9, 0));
    G.cinemaOn(); G.focus = 3.5;
    G.shot(G.camera.position.clone(), camPos, look, look, 1.0);
    P.facing = Math.atan2(g.center.x - P.pos.x, g.center.z - P.pos.z);
    t.preach = 1;
    let gain = 0;
    for (let r = 0; r < 2; r++) {
      if (!fearDeck.length) fearDeck = [...(gospel ? QUESTIONS : FEARS)].sort(() => Math.random() - 0.5);
      const f = fearDeck.pop();
      const speaker = g.men[r % g.men.length];
      speaker.talking = true;
      await ui.say(f.who || 'Soldier', f.fear, { reference: f.ref || '' });
      speaker.talking = false;
      const opts = [f.good, ...f.bad].sort(() => Math.random() - 0.5);
      const pick = await ui.choose(G.heroName, gospel ? 'How will you answer?' : 'What will you say?', opts);
      if (opts[pick] !== f.good) {
        await ui.say(gospel ? 'Narrator' : 'Soldier', gospel ? 'That is not how the Lord answered. (Answer with his words.)' : rnd(['Words. Only a boy’s words.', 'That is pride talking, shepherd.', 'Then we are truly lost.']));
        continue;
      }
      // Conviction: speak it with your whole heart
      const q = await ui.timing('Speak with conviction', input);
      await ui.say(G.heroName, f.good, { auto: 2600 });
      gain += 6 + q * 9;
      speaker.pose.cower = 0;
      audio.play(q > 0.7 ? 'reward' : 'pickup');
    }
    t.preach = 0;
    if (gain > 0) {
      g.done = true;
      g.men.forEach((m) => { m.pose.cower = 0; m.pose.cheer = 1; setTimeout(() => (m.pose.cheer = 0), 2200); });
      save.courage = Math.min(100, save.courage + Math.round(gain)); save.faith += Math.round(gain); save.write();
      ui.courage(save.courage);
      audio.play('cheer');
      await ui.say(gospel ? 'The people' : 'Soldiers', gospel ? rnd(['Never man spake like this man.', 'He teacheth as one having authority!', 'Is not this the Christ?']) : rnd(['The LORD is with this boy!', 'For the LORD and for Israel!', 'We will stand. We will stand!']), { auto: 1800 });
      G.addSpirit(0.25, 'Preaching');
    } else {
      await ui.say('', 'They are not yet ready to hear. Speak the truth, not your own boast.', { auto: 2600 });
    }
    G.cinemaOff();
  }

  // ------------------------------------------------------------ Healing (Gospel)
  sys.addSick = (pos, kind = 'blind') => {
    const n = G.addNPC({ skin: 0xa77a58, robe: 0x7a6a52, sash: 0x3e3a30, hair: 0x2a1a10, beard: Math.random() < 0.6, headwrap: 0x9a8a6a, height: 1.66, lookAtPlayer: true }, pos, Math.random() * 6);
    n.pose.cower = 1;
    const sk = { n, pos: n.pos, healed: false, kind };
    G.interactables.push({ pos: n.pos, range: 2.6, prompt: kind === 'blind' ? 'Touch his eyes and heal him' : 'Take his hand and raise him up', enabled: () => !sk.healed, talk: async () => {
      await ui.say(kind === 'blind' ? 'A blind man' : 'A lame man', kind === 'blind' ? 'Jesus, Son of David, have mercy on me! Lord, let me recover my sight.' : 'Sir, I have no one to put me into the pool.', { reference: kind === 'blind' ? 'Luke 18:38–41' : 'John 5:7' });
      P.h.pose.preach = 1;
      const q = await ui.timing('Pray for him', input);
      audio.play('spirit');
      await ui.say(G.heroName, kind === 'blind' ? 'Recover your sight; your faith has made you well.' : 'Get up, take up your bed, and walk.', { reference: kind === 'blind' ? 'Luke 18:42' : 'John 5:8', auto: 2600 });
      P.h.pose.preach = 0;
      sk.healed = true; n.pose.cower = 0; n.pose.cheer = 1; setTimeout(() => (n.pose.cheer = 0), 3000);
      audio.play('cheer'); save.faith += 10 + Math.round(q * 10); save.write();
      ui.toast(kind === 'blind' ? 'He received his sight, and followed, glorifying God' : 'He rose up and walked', 3500, true);
      G.addSpirit(0.15, 'Compassion');
    } });
    return sk;
  };

  // ------------------------------------------------------------ Ridable animals
  sys.addMount = (kind, pos, facing = 0) => {
    const q = createQuadruped(kind);
    const m = { ...q, kind, pos: G.ground(pos.clone()), facing, vel: 0, saddleHeight: q.height + (kind === 'camel' ? 0.9 : 0.25) };
    q.root.position.copy(m.pos); q.root.rotation.y = facing; scene.add(q.root);
    m.int = { pos: m.pos, range: 2.6, prompt: `Ride the ${kind}`, enabled: () => !P.mount && !P.slingAimLock, talk: () => mount(m) };
    G.interactables.push(m.int);
    G.world.colliders.push(m.col = { x: m.pos.x, z: m.pos.z, r: kind === 'camel' ? 1.1 : 0.8 });
    sys.mounts.push(m);
    return m;
  };
  function mount(m) {
    P.mount = m; P.h.pose.ride = 1; m.col.r = 0;
    ui.hint(input.touch ? 'Stick to ride. RUN to gallop. E to dismount.' : 'W/A/S/D to ride · Shift to gallop · E to dismount', 4000);
    audio.play('bleat');
  }
  sys.dismount = () => {
    const m = P.mount; if (!m) return;
    P.mount = null; P.h.pose.ride = 0;
    P.pos.copy(m.pos).add(V(Math.cos(m.facing) * 1.4, 0, -Math.sin(m.facing) * 1.4)); G.ground(P.pos);
    P.h.root.rotation.x = 0;
    m.col.x = m.pos.x; m.col.z = m.pos.z; m.col.r = m.kind === 'camel' ? 1.1 : 0.8;
  };
  G.updateMount = (dt) => {
    const m = P.mount;
    const ctl = G.control;
    const yaw = G.cam.yaw;
    const fwd = V(-Math.sin(yaw), 0, -Math.cos(yaw)), right = V(Math.cos(yaw), 0, -Math.sin(yaw));
    const wish = V();
    if (ctl) {
      if (G.camMode === 'second') { m.facing -= input.moveX * dt * 2; wish.set(Math.sin(m.facing), 0, Math.cos(m.facing)).multiplyScalar(Math.max(0, input.moveY)); }
      else wish.addScaledVector(fwd, input.moveY).addScaledVector(right, input.moveX);
    }
    const amt = Math.min(1, wish.length());
    const top = m.kind === 'camel' ? (input.sprint ? 11.5 : 4) : (input.sprint ? 9.5 : 4.2);
    m.vel += (amt * top - m.vel) * (1 - Math.exp(-dt * 2.5));
    if (amt > 0.05 && G.camMode !== 'second') m.facing = G.lerpAngle(m.facing, Math.atan2(wish.x, wish.z), 1 - Math.exp(-dt * 3.2));
    m.pos.x += Math.sin(m.facing) * m.vel * dt; m.pos.z += Math.cos(m.facing) * m.vel * dt;
    for (const c of G.world.colliders) {
      const dx = m.pos.x - c.x, dz = m.pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.9;
      if (d < r && d > 1e-4) { m.pos.x += dx / d * (r - d); m.pos.z += dz / d * (r - d); m.vel *= 0.95; }
    }
    m.pos.x = THREE.MathUtils.clamp(m.pos.x, BOUNDS.minX, BOUNDS.maxX); m.pos.z = THREE.MathUtils.clamp(m.pos.z, BOUNDS.minZ, BOUNDS.maxZ);
    G.ground(m.pos);
    m.root.position.copy(m.pos); m.root.rotation.y = m.facing;
    m.animate(dt, m.vel);
    // seat David
    m.saddle.updateWorldMatrix(true, false);
    const seat = V(); m.saddle.getWorldPosition(seat);
    P.pos.set(seat.x, seat.y - 0.95 * P.h.rig.scale + 0.05, seat.z);
    P.vel.set(Math.sin(m.facing) * m.vel, 0, Math.cos(m.facing) * m.vel);
    P.facing = m.facing;
    P.h.root.position.copy(P.pos); P.h.root.rotation.y = m.facing;
    P.h.animate(dt, 0);
    if (m.vel > 1) { m.stepT = (m.stepT || 0) - dt * m.vel; if (m.stepT < 0) { m.stepT = 2.4; audio.play('step'); } }
    ui.crosshair(false); ui.health(P.health);
  };

  // ------------------------------------------------------------ Per-frame
  let bleatT = 4;
  sys.update = (raw, dt) => {
    // Interact while riding = dismount
    if (P.mount && G.control && input.pressed.has('interact')) { input.pressed.delete('interact'); sys.dismount(); }
    if (input.pressed.has('spirit')) activateSpirit();
    if (input.pressed.has('journal') && G.control) G.menu.journal();
    // Spirit
    if (P.spiritActive > 0) {
      P.spiritActive -= raw;
      G.timeScale += (0.4 - G.timeScale) * Math.min(1, raw * 5);
      G.spiritFx = Math.min(1, (G.spiritFx || 0) + raw * 3);
      if (P.spiritActive <= 0) { audio.play('spiritEnd'); }
    } else {
      G.timeScale += (1 - G.timeScale) * Math.min(1, raw * 3);
      G.spiritFx = Math.max(0, (G.spiritFx || 0) - raw * 1.5);
      if (G.flags.anointed && G.control) P.spirit = Math.min(1, P.spirit + raw * 0.004 * (G.mods.spiritGain || 1));
    }
    if (G.flags.anointed) ui.spirit(P.spirit, P.spiritActive > 0, P.spiritActive);
    motes.visible = G.spiritFx > 0.02;
    if (motes.visible) {
      motes.position.copy(P.pos).add(V(0, 1, 0));
      motes.rotation.y += raw * 0.8;
      motes.material.opacity = G.spiritFx * 0.9;
    }
    if (dove.root.visible) dove.animate(raw);
    // Altars
    for (const a of sys.altars) { a.ready = Math.max(0, a.ready - raw); a.flame.visible = a.ready <= 0; a.flame.scale.setScalar(0.9 + Math.sin(G.t * 11 + a.pos.x) * 0.15); }
    // Scrolls
    for (const s of [...scrollMeshes]) {
      s.grp.rotation.y += raw * 1.2; s.grp.position.y = heightAt(s.grp.position.x, s.grp.position.z) + 0.8 + Math.sin(G.t * 2 + s.i) * 0.1;
      s.glow.material.opacity = 0.15 + Math.sin(G.t * 3 + s.i) * 0.07 + (G.spiritFx || 0) * 0.3;
      if (G.control && s.grp.position.distanceTo(P.pos.clone().add(V(0, 0.8, 0))) < (P.mount ? 2.6 : 1.6)) collectScroll(s);
    }
    updateLost();
    if ((bleatT -= raw) < 0) { bleatT = 6 + Math.random() * 8; if (G.sheep.some((s) => s.pos.distanceTo(P.pos) < 25)) audio.play('bleat'); }
  };

  sys.applyRewards();
  ui.courage(save.courage);
  sys.refreshQuestObjective();
  return sys;
}
