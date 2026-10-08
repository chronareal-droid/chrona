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
  voice.mute = (id, on) => { if (on) voice.muted.add(id); else voice.muted.delete(id); const c = calls.get(id); if (c) c.el.muted = on; };

  function attach(id, call) {
    const prev = calls.get(id); if (prev && prev.call !== call) { try { prev.call.close(); } catch {} prev.el?.remove(); }
    const el = new Audio(); el.autoplay = true; el.muted = voice.muted.has(id);
    const entry = { call, el, analyser: null, data: null };
    calls.set(id, entry);
    call.on('stream', (stream) => {
      el.srcObject = stream; el.play().catch(() => {});
      try { const src = ctx().createMediaStreamSource(stream); entry.analyser = ctx().createAnalyser(); entry.analyser.fftSize = 256; entry.data = new Uint8Array(256); src.connect(entry.analyser); } catch {}
    });
    call.on('close', () => { if (calls.get(id) === entry) { calls.delete(id); el.remove(); } });
    call.on('error', () => { if (calls.get(id) === entry) { calls.delete(id); el.remove(); } });
  }
  function drop(id) { const c = calls.get(id); if (!c) return; try { c.call.close(); } catch {} c.el.srcObject = null; c.el.remove(); calls.delete(id); voice.speaking.delete(id); }
  voice.drop = drop;
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

  // Push-to-talk on B
  addEventListener('keydown', (e) => { if (e.code === 'KeyB' && !e.repeat && !G.chatting && voice.enabled) { voice.talking = true; setMicLive(); } });
  addEventListener('keyup', (e) => { if (e.code === 'KeyB') { voice.talking = false; setMicLive(); } });

  const level = (an, data) => { if (!an) return 0; an.getByteTimeDomainData(data); let s = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; s += v * v; } return Math.sqrt(s / data.length); };
  /** Per frame: speaking indicators and proximity volume. */
  voice.update = (posOf) => {
    voice.level = mic && (voice.openMic || voice.talking) ? level(micAnalyser, micData) : 0;
    for (const [id, c] of calls) {
      voice.speaking.set(id, level(c.analyser, c.data) > 0.035);
      const p = posOf?.(id);
      // full volume within 6 m, fading out by 40 m; in menus and cutscenes everyone is at full volume
      c.el.volume = !p || !G.inGame || G.cine ? 1 : Math.max(0.08, Math.min(1, 1 - (G.hdist(p, G.player.pos) - 6) / 34));
    }
  };
  return voice;
}
