// Voice chat between players: every player's browser streams its microphone directly to every other player.
// Push-to-talk (hold B) or open mic. In the story, voices get quieter with distance (proximity chat).
export function createVoice(G, net) {
  const voice = { enabled: false, openMic: false, talking: false, muted: new Set(), speaking: new Map(), level: 0 };
  const calls = new Map(); // peer id -> { call, el, analyser, data }
  let mic = null, silent = null, actx = null, micAnalyser = null, micData = null;

  const ctx = () => (actx ||= new (window.AudioContext || window.webkitAudioContext)());
  // A silent stream lets a player without a microphone still receive everyone else's voice.
  const silence = () => { if (!silent) { const d = ctx().createMediaStreamDestination(); silent = d.stream; } return silent; };
  const outStream = () => mic || silence();
  const setMicLive = () => { if (mic) mic.getAudioTracks().forEach((t) => (t.enabled = voice.enabled && (voice.openMic || voice.talking))); };

  voice.enable = async () => {
    if (voice.enabled) return true;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      G.ui.toast('Microphone blocked. You can still hear others.', 4000);
      mic = null;
    }
    voice.enabled = true;
    G.save.settings.voice = true; G.save.write();
    if (mic) { const src = ctx().createMediaStreamSource(mic); micAnalyser = ctx().createAnalyser(); micAnalyser.fftSize = 256; micData = new Uint8Array(micAnalyser.fftSize); src.connect(micAnalyser); }
    setMicLive();
    // replace the stream in calls already open (received-only until now)
    for (const id of [...calls.keys()]) { drop(id); }
    voice.callAll();
    return !!mic;
  };
  voice.disable = () => { voice.enabled = false; G.save.settings.voice = false; G.save.write(); mic?.getTracks().forEach((t) => t.stop()); mic = null; for (const id of [...calls.keys()]) drop(id); };
  voice.setOpenMic = (on) => { voice.openMic = on; G.save.settings.openMic = on; G.save.write(); setMicLive(); };
  voice.openMic = !!G.save.settings.openMic;
  /** Voice stays on after the reload into the story if it was on in the party. */
  voice.restore = () => { if (G.save.settings.voice && !voice.enabled) voice.enable(); };
  voice.mute = (id, on) => { if (on) voice.muted.add(id); else voice.muted.delete(id); };
  /** 'proximity': voices come from where each player stands and fade out with distance. 'party': everyone at full volume. */
  voice.mode = G.save.settings.voiceMode || 'proximity';
  voice.setMode = (m) => { voice.mode = m; G.save.settings.voiceMode = m; G.save.write(); };
  voice.RANGE = 40; // metres: beyond this you can't hear someone in proximity mode

  function attach(id, call) {
    const prev = calls.get(id); if (prev && prev.call !== call) { try { prev.call.close(); } catch {} prev.el?.remove(); }
    const el = new Audio(); el.autoplay = true;
    const entry = { call, el, analyser: null, data: null, gain: null, pan: null };
    calls.set(id, entry);
    call.on('stream', (stream) => {
      el.srcObject = stream;
      try {
        // 3D voice: stream → level meter, and stream → gain → HRTF panner → speakers
        const c = ctx(); if (c.state !== 'running') c.resume();
        const src = c.createMediaStreamSource(stream);
        entry.analyser = c.createAnalyser(); entry.analyser.fftSize = 256; entry.data = new Uint8Array(256); src.connect(entry.analyser);
        entry.gain = c.createGain();
        entry.pan = c.createPanner(); Object.assign(entry.pan, { panningModel: 'HRTF', distanceModel: 'linear', refDistance: 5, maxDistance: voice.RANGE, rolloffFactor: 1 });
        src.connect(entry.gain).connect(entry.pan).connect(c.destination);
        el.muted = true; // Chrome only feeds a remote stream to Web Audio while an element plays it; the sound itself comes through the panner
      } catch { entry.gain = null; }
      el.play().catch(() => {});
    });
    call.on('close', () => { if (calls.get(id) === entry) { calls.delete(id); el.remove(); } });
    call.on('error', () => { if (calls.get(id) === entry) { calls.delete(id); el.remove(); } });
  }
  function drop(id) { const c = calls.get(id); if (!c) return; try { c.call.close(); } catch {} try { c.gain?.disconnect(); c.pan?.disconnect(); } catch {} c.el.srcObject = null; c.el.remove(); calls.delete(id); voice.speaking.delete(id); }
  voice.drop = drop;
  voice.calls = calls;
  /** Call one player (the newer joiner always places the call, so pairs never call each other twice). */
  voice.callPeer = (id) => { if (!net.peer || calls.has(id) || !voice.enabled) return; attach(id, net.peer.call(id, outStream())); };
  voice.callAll = () => {
    if (!voice.enabled || !net.peer) return;
    const ids = net.role === 'guest' ? [net.hostId, ...net.players.keys()] : [...net.players.keys()];
    for (const id of ids) if (id) voice.callPeer(id);
  };
  voice.listen = (peer) => {
    peer.on('call', (call) => { call.answer(outStream()); attach(call.peer, call); });
  };

  // browsers start audio suspended until the player clicks or presses a key
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => { if (actx && actx.state !== 'running') actx.resume(); }, { capture: true }));

  // Push-to-talk on B
  addEventListener('keydown', (e) => { if (e.code === 'KeyB' && !e.repeat && !G.chatting && voice.enabled) { voice.talking = true; setMicLive(); } });
  addEventListener('keyup', (e) => { if (e.code === 'KeyB') { voice.talking = false; setMicLive(); } });

  const level = (an, data) => { if (!an) return 0; an.getByteTimeDomainData(data); let s = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; s += v * v; } return Math.sqrt(s / data.length); };
  /** Per frame: speaking indicators and proximity volume. */
  voice.update = (posOf, me) => {
    voice.level = mic && (voice.openMic || voice.talking) ? level(micAnalyser, micData) : 0;
    // the listener's ears are at the camera
    const cam = G.camera;
    if (actx && calls.size) {
      const L = actx.listener, f = cam.getWorldDirection(new G.THREE.Vector3()), t = actx.currentTime;
      if (L.positionX) { L.positionX.setValueAtTime(cam.position.x, t); L.positionY.setValueAtTime(cam.position.y, t); L.positionZ.setValueAtTime(cam.position.z, t); L.forwardX.setValueAtTime(f.x, t); L.forwardY.setValueAtTime(f.y, t); L.forwardZ.setValueAtTime(f.z, t); L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t); }
      else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
    }
    for (const [id, c] of calls) {
      const lvl = level(c.analyser, c.data);
      const p = posOf?.(id);
      // in menus, cutscenes and party mode everyone is heard at full volume, straight ahead
      const flat = voice.mode === 'party' || !p || !G.inGame || G.cine;
      const muted = voice.muted.has(id);
      const near = flat || (me && G.hdist(p, me) < voice.RANGE);
      voice.speaking.set(id, lvl > 0.035 && near && !muted);
      if (c.gain && c.pan) {
        c.gain.gain.value = muted ? 0 : 1;
        const at = flat ? cam.position.clone().add(cam.getWorldDirection(new G.THREE.Vector3()).multiplyScalar(0.5)) : p.clone().setY(p.y + 1.6);
        if (c.pan.positionX) { c.pan.positionX.value = at.x; c.pan.positionY.value = at.y; c.pan.positionZ.value = at.z; } else c.pan.setPosition(at.x, at.y, at.z);
        c.pan.maxDistance = flat ? 10000 : voice.RANGE;
      } else {
        c.el.muted = muted;
        c.el.volume = flat ? 1 : Math.max(0, Math.min(1, 1 - (G.hdist(p, me || G.player.pos) - 5) / (voice.RANGE - 5)));
      }
    }
  };
  return voice;
}
