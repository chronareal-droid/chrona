// Procedural sound: layered ambience (wind, birds, crickets, the brook, a murmuring crowd), a score with
// pads, drone, plucked kinnor and frame drum, and synthesized effects, all through a shared hall reverb.
// No audio files needed. Audio unlocks on the first click, tap or key press anywhere.
export function createAudio() {
  let ctx = null, master, comp, musicBus, sfxBus, ambBus, verb, verbIn, noiseBuf, brownBuf, musicNodes = [];
  const a = { started: false, vol: 0.8, musicVol: 0.8, sfxVol: 1 };
  const amb = {}; // live ambience layers
  let ambState = { brook: 0, crowd: 0, night: false, indoor: false, wind: 1 };

  const impulse = (secs, decay) => {
    const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  };
  const loopNoise = (buf, type, freq, q, gain, dest) => {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f).connect(g).connect(dest); s.start();
    return { s, f, g };
  };

  a.start = () => {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = a.vol;
    master.connect(comp).connect(ctx.destination);
    // a stone hall: everything sends a little into it
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 2.6);
    verbIn = ctx.createGain(); verbIn.gain.value = 0.9; verbIn.connect(verb).connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = a.musicVol; musicBus.connect(master);
    const musicVerb = ctx.createGain(); musicVerb.gain.value = 0.55; musicBus.connect(musicVerb).connect(verbIn);
    sfxBus = ctx.createGain(); sfxBus.gain.value = a.sfxVol; sfxBus.connect(master);
    const sfxVerb = ctx.createGain(); sfxVerb.gain.value = 0.18; sfxBus.connect(sfxVerb).connect(verbIn);
    ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    brownBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const bd = brownBuf.getChannelData(0); let last = 0;
    for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }

    // Wind: two gusting bands
    amb.wind = loopNoise(brownBuf, 'lowpass', 600, 0.4, 0.22, ambBus);
    amb.whistle = loopNoise(noiseBuf, 'bandpass', 900, 1.2, 0.025, ambBus);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(amb.whistle.f.frequency); lfo.start();
    const gust = ctx.createOscillator(); gust.frequency.value = 0.11;
    const gg = ctx.createGain(); gg.gain.value = 0.09; gust.connect(gg).connect(amb.wind.g.gain); gust.start();
    // The brook: bubbling high band, its level set by how near the water is
    amb.brook = loopNoise(noiseBuf, 'bandpass', 2200, 0.9, 0, ambBus);
    amb.brookLow = loopNoise(brownBuf, 'lowpass', 400, 0.5, 0, ambBus);
    const bub = ctx.createOscillator(); bub.frequency.value = 7.3; const bg = ctx.createGain(); bg.gain.value = 700; bub.connect(bg).connect(amb.brook.f.frequency); bub.start();
    // A crowd: a murmur of voices (formant bands of brown noise)
    amb.crowd = ctx.createGain(); amb.crowd.gain.value = 0; amb.crowd.connect(ambBus);
    [[320, 3], [780, 4], [1400, 5]].forEach(([fr, q], i) => {
      const n = loopNoise(brownBuf, 'bandpass', fr, q, 0.5 - i * 0.12, amb.crowd);
      const l = ctx.createOscillator(); l.frequency.value = 0.7 + i * 0.37; const lgn = ctx.createGain(); lgn.gain.value = 0.25; l.connect(lgn).connect(n.g.gain); l.start();
    });
    // Night: crickets
    amb.crickets = ctx.createGain(); amb.crickets.gain.value = 0; amb.crickets.connect(ambBus);
    [4300, 4750].forEach((fr, i) => {
      const o = ctx.createOscillator(); o.frequency.value = fr;
      const am = ctx.createGain(); am.gain.value = 0;
      const chirp = ctx.createOscillator(); chirp.type = 'square'; chirp.frequency.value = 22 + i * 3;
      const cg = ctx.createGain(); cg.gain.value = 0.5; chirp.connect(cg).connect(am.gain);
      const slow = ctx.createOscillator(); slow.type = 'square'; slow.frequency.value = 0.9 + i * 0.23;
      const sg = ctx.createGain(); sg.gain.value = 0.5; slow.connect(sg).connect(am.gain);
      const v = ctx.createGain(); v.gain.value = 0.012;
      o.connect(am).connect(v).connect(amb.crickets); o.start(); chirp.start(); slow.start();
    });
    a.started = true;
    a.ambience(ambState);
    const pend = mood; mood = null; if (pend) a.music(pend);
    birdLoop();
  };
  // Unlock on any gesture anywhere (browsers keep audio silent until the player interacts).
  const unlock = () => { a.start(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, unlock, { capture: true }));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });

  // Birdsong by day: short chirps and trills from random directions
  function birdLoop() {
    setTimeout(birdLoop, 900 + Math.random() * 2600);
    if (!ctx || ambState.night || ambState.indoor || ctx.state !== 'running') return;
    const t = ctx.currentTime, n = 1 + Math.floor(Math.random() * 5), base = 2200 + Math.random() * 2200;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(ambBus); }
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      const st = t + i * (0.09 + Math.random() * 0.05);
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), st);
      o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.5), st + 0.06);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.02, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.08);
      o.connect(g).connect(pan || ambBus); o.start(st); o.stop(st + 0.1);
    }
  }
  /** Ambience mix: brook 0..1 (nearness), crowd 0..1, night, indoor. Called by the game a few times a second. */
  a.ambience = (s) => {
    ambState = { ...ambState, ...s };
    if (!ctx) return;
    const t = ctx.currentTime, set = (g, v) => g.setTargetAtTime(v, t, 0.6);
    const out = ambState.indoor ? 0.35 : 1;
    set(amb.wind.g.gain, 0.2 * out * (ambState.wind ?? 1));
    set(amb.whistle.g.gain, 0.03 * out);
    set(amb.brook.g.gain, 0.09 * ambState.brook * out);
    set(amb.brookLow.g.gain, 0.12 * ambState.brook * out);
    set(amb.crowd.gain, 0.12 * ambState.crowd);
    set(amb.crickets.gain, ambState.night ? 1 * out : 0);
  };

  // ------------------------------------------------------------------ Score
  // Phrygian-dominant pads and drone, a plucked kinnor melody and, on the road and in battle, a frame drum.
  const scale = [0, 1, 4, 5, 7, 8, 10, 12];
  let melodyTimer = null, mood = null;
  a.music = (m) => {
    if (!ctx || m === mood) { mood = ctx ? mood : m; return; }
    mood = m;
    musicNodes.forEach((nd) => { try { nd.g?.gain.setTargetAtTime(0, ctx.currentTime, 0.8); nd.o.stop(ctx.currentTime + 3); } catch {} });
    musicNodes = [];
    clearInterval(melodyTimer);
    if (!m) return;
    const root = m === 'battle' ? 55 : m === 'triumph' ? 73.4 : 65.4;
    const t = ctx.currentTime;
    // pad: detuned saws through a slow-breathing filter
    const pad = ctx.createBiquadFilter(); pad.type = 'lowpass'; pad.frequency.value = m === 'battle' ? 900 : 650; pad.Q.value = 0.7;
    const breathe = ctx.createOscillator(); breathe.frequency.value = 0.08; const bg = ctx.createGain(); bg.gain.value = 250; breathe.connect(bg).connect(pad.frequency); breathe.start();
    musicNodes.push({ o: breathe });
    pad.connect(musicBus);
    const chord = m === 'triumph' ? [1, 1.26, 1.5, 2, 2.52] : [1, 1.5, 2, 2.38, 3];
    chord.forEach((r, i) => [-7, 7].forEach((det) => {
      const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth';
      o.frequency.value = root * r; o.detune.value = det + (Math.random() - 0.5) * 6;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((i === 0 ? 0.16 : 0.055) * (m === 'battle' ? 1.2 : 1), t + 3);
      o.connect(g).connect(pad); o.start(); musicNodes.push({ o, g });
    }));
    // sub drone
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = root / 2;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.18, t + 4);
    sub.connect(sg).connect(musicBus); sub.start(); musicNodes.push({ o: sub, g: sg });
    const step = m === 'battle' ? 230 : m === 'triumph' ? 380 : 470;
    let k = 0, phrase = 0;
    melodyTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      k++;
      if (m === 'battle') { if (k % 4 === 0) drum(0.5, 0); else if (k % 2 === 0) drum(0.18, 1); }
      else if (m === 'triumph' && k % 4 === 0) drum(0.25, 0);
      if (Math.random() < (m === 'battle' ? 0.35 : 0.5)) return;
      phrase = (phrase + (Math.random() < 0.6 ? 1 : -1) + scale.length) % scale.length; // stepwise, like a song
      pluck(root * 4 * Math.pow(2, scale[phrase] / 12), m === 'battle' ? 0.09 : 0.1);
      if (Math.random() < 0.2) pluck(root * 2 * Math.pow(2, scale[phrase] / 12), 0.06);
    }, step);
  };

  function pluck(freq, vol, dest = musicBus) {
    const t = ctx.currentTime;
    // a kinnor: bright attack (two partials), fast decay
    [1, 2.01].forEach((h, i) => {
      const o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = freq * h;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol * (i ? 0.4 : 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + (i ? 0.5 : 1.8));
      o.connect(g).connect(dest); o.start(t); o.stop(t + 1.9);
    });
  }
  function drum(vol, kind = 0, dest = musicBus) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(kind ? 220 : 110, t); o.frequency.exponentialRampToValueAtTime(kind ? 120 : 45, t + 0.25);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind ? 0.18 : 0.5));
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.55);
    if (kind) noise(0.08, 2500, vol * 0.6, 'bandpass', 1, dest);
  }
  function noise(dur, freq, vol, type = 'bandpass', q = 1, dest = sfxBus) {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest); s.start(t, Math.random()); s.stop(t + dur);
    return f;
  }
  function tone(freq, vol, dur, type = 'sine', dest = sfxBus, at = 0) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  const sfx = {
    swing: () => { const f = noise(0.3, 700, 0.4, 'bandpass', 2); f.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.25); },
    hit: () => { noise(0.18, 300, 0.8, 'lowpass'); drum(0.6, 0, sfxBus); },
    whirl: () => noise(0.12, 1400, 0.12, 'bandpass', 4),
    release: () => { const f = noise(0.35, 2400, 0.4, 'bandpass', 3); f.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3); },
    clang: () => [523, 789, 1210, 1690, 2380].forEach((fr, i) => tone(fr, 0.12 / (1 + i * 0.4), 1.2, 'sine')),
    roar: (vol = 0.7) => {
      const t = ctx.currentTime;
      [1, 1.49, 0.5].forEach((m, i) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95 * m, t); o.frequency.linearRampToValueAtTime(58 * m, t + 1.5);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol / (i + 1.5), t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        o.connect(lp).connect(g).connect(sfxBus); o.start(t); o.stop(t + 1.8);
      });
      noise(1.5, 300, vol * 0.7, 'lowpass');
    },
    bleat: () => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 380 + Math.random() * 80;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 24; const lg = ctx.createGain(); lg.gain.value = 30;
      lfo.connect(lg).connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(f).connect(g).connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    },
    pickup: () => { tone(880, 0.18, 0.5, 'triangle'); tone(1320, 0.15, 0.6, 'triangle', sfxBus, 0.09); },
    hurt: () => { noise(0.35, 600, 0.7, 'lowpass'); tone(120, 0.3, 0.25, 'sine'); },
    thud: () => { drum(1, 0, sfxBus); noise(0.9, 120, 0.9, 'lowpass'); },
    // footsteps: a soft heel thump and the crunch of grit
    step: () => { noise(0.07, 180 + Math.random() * 60, 0.32, 'lowpass'); noise(0.05, 2400 + Math.random() * 1500, 0.07, 'bandpass', 1.5); },
    door: () => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(90, t + 0.5);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 6;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(f).connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.6);
      setTimeout(() => ctx && drum(0.25, 1, sfxBus), 480);
    },
    splash: () => { const f = noise(0.4, 1800, 0.3, 'bandpass', 0.8); f.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.35); noise(0.25, 300, 0.15, 'lowpass'); },
    spirit: () => {
      [261.6, 329.6, 392, 523.2, 659.3, 784].forEach((fr, i) => {
        const t = ctx.currentTime + i * 0.09;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
        o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 4.1);
      });
      noise(3, 3500, 0.08, 'highpass');
    },
    spiritEnd: () => tone(392, 0.12, 0.8, 'triangle'),
    reward: () => [523.2, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.16, 0.7, 'triangle', sfxBus, i * 0.11)),
    cheer: () => { for (let i = 0; i < 10; i++) setTimeout(() => ctx && noise(0.8, 600 + Math.random() * 900, 0.14, 'bandpass', 1.5), i * 60); },
    horn: () => {
      [146.8, 220].forEach((fr, i) => {
        const t = ctx.currentTime + i * 0.6;
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
        o.connect(lp).connect(g).connect(sfxBus); o.start(t); o.stop(t + 1.7);
      });
    },
    // menus and chat
    click: () => { tone(660, 0.08, 0.08, 'triangle'); noise(0.02, 3000, 0.04, 'highpass'); },
    open: () => { tone(440, 0.06, 0.25, 'triangle'); tone(660, 0.05, 0.3, 'triangle', sfxBus, 0.06); },
    chat: () => { tone(988, 0.08, 0.18, 'sine'); tone(1318, 0.07, 0.25, 'sine', sfxBus, 0.08); },
    join: () => [392, 523.2, 659.3].forEach((f, i) => tone(f, 0.1, 0.5, 'triangle', sfxBus, i * 0.08)),
    leave: () => [523.2, 392].forEach((f, i) => tone(f, 0.09, 0.45, 'triangle', sfxBus, i * 0.1)),
    talk: () => { noise(0.06, 900 + Math.random() * 500, 0.03, 'bandpass', 4); },
  };
  a.ui = (name) => a.play(name);
  a.play = (name, ...args) => { if (ctx && ctx.state === 'running' && sfx[name]) try { sfx[name](...args); } catch {} };
  a.setWind = (v) => a.ambience({ wind: v * 4 });
  a.volume = (v) => { a.vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.1); };
  a.setMusicVolume = (v) => { a.musicVol = v; if (musicBus) musicBus.gain.setTargetAtTime(v, ctx.currentTime, 0.1); };
  a.setSfxVolume = (v) => { a.sfxVol = v; if (sfxBus) sfxBus.gain.setTargetAtTime(v, ctx.currentTime, 0.1); };
  a.mute = (m) => { if (master) master.gain.setTargetAtTime(m ? 0 : a.vol, ctx.currentTime, 0.1); };
  return a;
}
