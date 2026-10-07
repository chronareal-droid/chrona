// Progress & settings persisted per browser. Every access is guarded: storage can be unavailable.
const KEY = 'shepherd-king-save-v1';
const defaults = () => ({
  part: null, reached: ['prologue'], scrolls: [], quests: {}, faith: 0, courage: 0,
  settings: { quality: matchMedia('(pointer: coarse)').matches ? 'medium' : 'high', volume: 0.8, sensitivity: 1, invertY: false, camMode: 'third' },
});
let data = defaults();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) { const d = JSON.parse(raw); data = { ...data, ...d, settings: { ...data.settings, ...(d.settings || {}) } }; }
} catch {}
export const save = data;
save.write = () => { try { const { write, reset, ...rest } = save; localStorage.setItem(KEY, JSON.stringify(rest)); } catch {} };
save.reset = () => { const s = save.settings; Object.assign(save, defaults(), { settings: s }); save.write(); };
