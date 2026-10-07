// Procedural sound: wind bed, a modal drone score, and synthesized effects. No audio files needed.
export function createAudio() {
  let ctx = null, master, musicGain, windGain, noiseBuf, musicNodes = [];
  const a = { started: false };

  a.start = () => {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = a.vol ?? 0.8; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Wind
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0.05;
    n.connect(f).connect(windGain).connect(master); n.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(f.frequency); lfo.start();
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    a.started = true;
  };

  // A slow Phrygian-dominant drone with a plucked kinnor-like melody.
  const scale = [0, 1, 4, 5, 7, 8, 10, 12];
  let melodyTimer = null, mood = null;
  a.music = (m) => {
    if (!ctx || m === mood) return;
    mood = m;
    musicNodes.forEach((nd) => { try { nd.stop(ctx.currentTime + 2); } catch {} });
    musicNodes = [];
    clearInterval(melodyTimer);
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(m ? (m === 'battle' ? 0.22 : 0.14) : 0, ctx.currentTime, 1.2);
    if (!m) return;
    const root = m === 'battle' ? 55 : m === 'triumph' ? 73.4 : 65.4;
    [1, 1.5, 2, m === 'triumph' ? 2.52 : 2.38].forEach((r, i) => {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = root * r; o.detune.value = (Math.random() - 0.5) * 12;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = m === 'battle' ? 700 : 480;
      const g = ctx.createGain(); g.gain.value = i === 0 ? 0.35 : 0.14;
      o.connect(lp).connect(g).connect(musicGain); o.start(); musicNodes.push(o);
    });
    const step = m === 'battle' ? 260 : 520;
    let k = 0;
    melodyTimer = setInterval(() => {
      if (Math.random() < (m === 'battle' ? 0.25 : 0.45)) return;
      const deg = scale[Math.floor(Math.random() * scale.length)];
      pluck(root * 4 * Math.pow(2, deg / 12), m === 'battle' ? 0.09 : 0.07);
      if (m === 'battle' && k++ % 4 === 0) drum(0.35);
    }, step);
  };

  function pluck(freq, vol) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(musicGain); o.start(t); o.stop(t + 1.7);
  }
  function drum(vol) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.5);
  }
  function noise(dur, freq, vol, type = 'bandpass', q = 1) {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur);
    return f;
  }
  const sfx = {
    swing: () => noise(0.25, 900, 0.25, 'bandpass', 2),
    hit: () => { noise(0.15, 300, 0.5, 'lowpass'); drum(0.3); },
    whirl: () => noise(0.12, 1400, 0.06, 'bandpass', 4),
    release: () => { const f = noise(0.35, 2000, 0.25, 'bandpass', 3); f.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3); },
    clang: () => {
      const t = ctx.currentTime;
      [523, 789, 1210, 1690].forEach((fr) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.connect(g).connect(master); o.start(t); o.stop(t + 1.2);
      });
    },
    roar: (vol = 0.45) => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(60, t + 1.4);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 1.7);
      noise(1.4, 250, vol * 0.6, 'lowpass');
    },
    bleat: () => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 380 + Math.random() * 80;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 24; const lg = ctx.createGain(); lg.gain.value = 30;
      lfo.connect(lg).connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(f).connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    },
    pickup: () => { pluckMaster(880, 0.12); setTimeout(() => pluckMaster(1320, 0.1), 90); },
    hurt: () => noise(0.3, 600, 0.4, 'lowpass'),
    thud: () => { drum(0.9); noise(0.8, 120, 0.6, 'lowpass'); },
    step: () => noise(0.06, 500, 0.03, 'lowpass'),
    splash: () => { const f = noise(0.35, 1800, 0.12, 'bandpass', 0.8); f.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.3); noise(0.2, 300, 0.05, 'lowpass'); },
    spirit: () => {
      const t = ctx.currentTime;
      [261.6, 329.6, 392, 523.2, 659.3].forEach((fr, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.08); g.gain.linearRampToValueAtTime(0.07, t + i * 0.08 + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
        o.connect(g).connect(master); o.start(t + i * 0.08); o.stop(t + 3.6);
      });
      noise(2.5, 3000, 0.05, 'highpass');
    },
    spiritEnd: () => pluckMaster(392, 0.08),
    reward: () => [523.2, 659.3, 784, 1046.5].forEach((f, i) => setTimeout(() => pluckMaster(f, 0.1), i * 110)),
    cheer: () => { for (let i = 0; i < 6; i++) setTimeout(() => noise(0.6, 700 + Math.random() * 600, 0.08, 'bandpass', 1.5), i * 70); },
    horn: () => {
      const t = ctx.currentTime;
      [146.8, 220].forEach((fr, i) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.6); g.gain.linearRampToValueAtTime(0.12, t + i * 0.6 + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + i * 0.6 + 1.6);
        o.connect(lp).connect(g).connect(master); o.start(t + i * 0.6); o.stop(t + i * 0.6 + 1.7);
      });
    },
  };
  function pluckMaster(freq, vol) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.5);
  }
  a.play = (name, ...args) => { if (ctx && sfx[name]) sfx[name](...args); };
  a.setWind = (v) => { if (windGain) windGain.gain.setTargetAtTime(v, ctx.currentTime, 0.8); };
  a.volume = (v) => { a.vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.1); };
  a.mute = (m) => { if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.1); };
  return a;
}
