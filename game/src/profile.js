// Player profile: a username and a custom character, with a live 3D preview while you design it.
import * as THREE from 'three';
import { createHumanoid } from './characters.js';

export const SKIN = [0xe0b48c, 0xc99a6e, 0xb98a64, 0xa27654, 0x8c6040, 0x6a4a30];
export const HAIR = [0x1a120c, 0x2b1d14, 0x4a2e18, 0x6b3a1e, 0x8a6a4a, 0xd8d2c8];
export const CLOTH = [0xd8c7a3, 0xe6dccb, 0x8a7a5a, 0x6e6450, 0x8a3a2a, 0x7a2e3a, 0x2b4f8a, 0x3a5a7a, 0x4a5a3a, 0x6a4a5a, 0xb07a2a, 0x3a3a3a];
export const ACCENT = [0x8c3b2a, 0x5a3a22, 0x2b4f8a, 0xd9a93b, 0x3e3a30, 0x6a1a5a, 0x2a2018, 0x9a8a6a];

export const defaultLook = () => ({
  body: 'man', skin: 2, height: 1.74, build: 1, hair: 1, longHair: false, beard: true,
  headwrap: -1, robe: 2, sash: 0, mantle: -1,
});

/** Turn a saved look into options for createHumanoid. */
export function lookToOpts(look, name) {
  const L = { ...defaultLook(), ...look };
  const fem = L.body === 'woman';
  return {
    name, female: fem, skin: SKIN[L.skin] ?? SKIN[2], hair: HAIR[L.hair] ?? HAIR[1], longHair: fem || L.longHair,
    beard: !fem && L.beard ? true : false, headwrap: L.headwrap >= 0 ? CLOTH[L.headwrap] : null,
    robe: CLOTH[L.robe] ?? CLOTH[2], sash: ACCENT[L.sash] ?? ACCENT[0], cape: L.mantle >= 0 ? CLOTH[L.mantle] : null,
    height: THREE.MathUtils.clamp(+L.height || 1.74, 1.5, 1.98) * (fem ? 0.95 : 1), build: THREE.MathUtils.clamp(+L.build || 1, 0.8, 1.25),
    longRobe: fem,
  };
}

const BANNED = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'slut', 'whore', 'dick', 'pussy', 'rape', 'nazi'];
/** Usernames: 3–16 letters, numbers, spaces, _ or -, and nothing offensive. Returns [cleanName, error]. */
export function checkName(raw) {
  const n = String(raw || '').replace(/\s+/g, ' ').trim();
  if (n.length < 3) return [n, 'At least 3 characters.'];
  if (n.length > 16) return [n, 'At most 16 characters.'];
  if (!/^[A-Za-z0-9 _-]+$/.test(n)) return [n, 'Letters, numbers, spaces, _ and - only.'];
  const flat = n.toLowerCase().replace(/[^a-z]/g, '');
  if (BANNED.some((b) => flat.includes(b))) return [n, 'Please choose a different name.'];
  return [n, null];
}

/**
 * Character creator panel. Renders into `body` (a DOM element) with a live preview; calls onDone(profile).
 */
export function characterCreator(body, save, onDone) {
  const prof = save.profile || { name: '', look: defaultLook() };
  const look = { ...defaultLook(), ...prof.look };
  const swatches = (key, list, allowNone = false) => `<div class="swatches" data-k="${key}">${allowNone ? `<button data-v="-1" class="none" title="None">✕</button>` : ''}${list.map((c, i) => `<button data-v="${i}" style="background:#${c.toString(16).padStart(6, '0')}" aria-label="colour ${i + 1}"></button>`).join('')}</div>`;
  body.innerHTML = `
    <div class="creator">
      <div class="creator-preview"><canvas width="320" height="420"></canvas><small>Drag to turn</small></div>
      <div class="creator-form">
        <label class="namefield">Username<input id="cc-name" maxlength="16" autocomplete="off" spellcheck="false" placeholder="e.g. Bartimaeus" value="${(prof.name || '').replace(/"/g, '')}" /><em class="err"></em></label>
        <div class="row"><span>Body</span><div class="seg" data-k="body"><button data-v="man">Man</button><button data-v="woman">Woman</button></div></div>
        <div class="row"><span>Skin</span>${swatches('skin', SKIN)}</div>
        <div class="row"><span>Height</span><input type="range" id="cc-height" min="1.55" max="1.95" step="0.01" value="${look.height}" /></div>
        <div class="row"><span>Build</span><input type="range" id="cc-build" min="0.85" max="1.2" step="0.01" value="${look.build}" /></div>
        <div class="row"><span>Hair</span>${swatches('hair', HAIR)}</div>
        <div class="row man-only"><span>Hair length</span><div class="seg" data-k="longHair"><button data-v="false">Short</button><button data-v="true">Long</button></div></div>
        <div class="row man-only"><span>Beard</span><div class="seg" data-k="beard"><button data-v="true">Beard</button><button data-v="false">Clean-shaven</button></div></div>
        <div class="row"><span>Headwrap</span>${swatches('headwrap', CLOTH, true)}</div>
        <div class="row"><span>Robe</span>${swatches('robe', CLOTH)}</div>
        <div class="row"><span>Sash</span>${swatches('sash', ACCENT)}</div>
        <div class="row"><span>Mantle</span>${swatches('mantle', CLOTH, true)}</div>
        <div class="creator-actions"><button class="ghost" data-a="random">Randomise</button><button class="primary" data-a="done">Save character</button></div>
      </div>
    </div>`;
  // ---- preview
  const canvas = body.querySelector('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x3a3024, 1.4));
  const key = new THREE.DirectionalLight(0xffe0b0, 2.2); key.position.set(2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab4ff, 1.0); rim.position.set(-3, 2, -2); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 320 / 420, 0.1, 50); cam.position.set(0, 1.1, 4.6); cam.lookAt(0, 0.95, 0);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40), new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 1 })); disc.rotation.x = -Math.PI / 2; scene.add(disc);
  let fig = null, yaw = 0.3, drag = null, raf = 0, t = 0;
  const rebuild = () => {
    if (fig) { scene.remove(fig.root); }
    fig = createHumanoid(lookToOpts(look, 'preview'));
    scene.add(fig.root);
  };
  const loop = () => {
    raf = requestAnimationFrame(loop);
    t += 1 / 60; if (!drag) yaw += 0.004;
    fig.root.rotation.y = yaw; fig.animate(1 / 60, 0); r.render(scene, cam);
  };
  canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag != null) { yaw += (e.clientX - drag) * 0.012; drag = e.clientX; } });
  canvas.addEventListener('pointerup', () => (drag = null));
  // ---- controls
  const sync = () => {
    body.querySelectorAll('.seg[data-k] button, .swatches button').forEach((b) => b.classList.toggle('on', String(look[b.parentElement.dataset.k]) === b.dataset.v));
    body.querySelectorAll('.man-only').forEach((el) => (el.hidden = look.body === 'woman'));
  };
  body.querySelectorAll('.seg[data-k] button, .swatches button').forEach((b) => (b.onclick = () => {
    const k = b.parentElement.dataset.k; let v = b.dataset.v;
    v = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
    look[k] = v; sync(); rebuild();
  }));
  body.querySelector('#cc-height').oninput = (e) => { look.height = +e.target.value; rebuild(); };
  body.querySelector('#cc-build').oninput = (e) => { look.build = +e.target.value; rebuild(); };
  const nameEl = body.querySelector('#cc-name'), err = body.querySelector('.err');
  nameEl.oninput = () => { err.textContent = ''; };
  nameEl.addEventListener('keydown', (e) => e.stopPropagation()); // typing a name must not move the player or open menus
  body.querySelector('[data-a="random"]').onclick = () => {
    const pick = (n) => Math.floor(Math.random() * n);
    Object.assign(look, { body: Math.random() < 0.5 ? 'man' : 'woman', skin: pick(SKIN.length), hair: pick(HAIR.length - 1), longHair: Math.random() < 0.4, beard: Math.random() < 0.7,
      headwrap: Math.random() < 0.5 ? pick(CLOTH.length) : -1, robe: pick(CLOTH.length), sash: pick(ACCENT.length), mantle: Math.random() < 0.4 ? pick(CLOTH.length) : -1,
      height: +(1.6 + Math.random() * 0.3).toFixed(2), build: +(0.9 + Math.random() * 0.25).toFixed(2) });
    body.querySelector('#cc-height').value = look.height; body.querySelector('#cc-build').value = look.build;
    sync(); rebuild();
  };
  body.querySelector('[data-a="done"]').onclick = () => {
    const [name, problem] = checkName(nameEl.value);
    if (problem) { err.textContent = problem; nameEl.focus(); return; }
    save.profile = { name, look: { ...look } }; save.write();
    cancelAnimationFrame(raf); r.dispose();
    onDone(save.profile);
  };
  rebuild(); sync(); loop();
  return () => { cancelAnimationFrame(raf); r.dispose(); };
}
