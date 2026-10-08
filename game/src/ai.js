// AI Jesus (optional, free): a small language model that runs in the player's own browser on their graphics
// card (WebGPU). It downloads once (about 1 GB, then cached) and needs no account, key or server.
// Answers are grounded in a matching saying from the Gospels and shown as AI-written, never as Scripture.
const MODELS = { f16: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC' };
const BLOCK = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'slut', 'whore', 'porn', 'sex', 'rape', 'nazi', 'kill yourself'];

export function createJesusAI(G) {
  const ai = { state: 'off', progress: 0, supported: !!navigator.gpu, engine: null, onChange: null };
  const pill = document.createElement('div'); pill.id = 'aistatus'; pill.hidden = true; document.body.appendChild(pill);
  const status = (text, hideAfter = 0) => {
    pill.textContent = text; pill.hidden = !text;
    clearTimeout(ai._t); if (hideAfter) ai._t = setTimeout(() => (pill.hidden = true), hideAfter);
    ai.onChange?.();
  };

  ai.load = async () => {
    if (ai.state === 'ready' || ai.state === 'loading') return ai.state === 'ready';
    if (!ai.supported) { ai.state = 'error'; status('AI Jesus needs Chrome or Edge on a computer with WebGPU. Using Gospel verses.', 6000); return false; }
    ai.state = 'loading'; status('AI Jesus: preparing…');
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('no GPU adapter');
      const model = adapter.features.has('shader-f16') ? MODELS.f16 : MODELS.f32;
      const webllm = await import('@mlc-ai/web-llm');
      const worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      ai.engine = await webllm.CreateWebWorkerMLCEngine(worker, model, {
        initProgressCallback: (r) => { ai.progress = r.progress || 0; status(`AI Jesus: ${/fetch|download|param/i.test(r.text) ? 'downloading' : 'loading'} ${Math.round(ai.progress * 100)}% (first time only)`); },
      });
      ai.state = 'ready'; status('AI Jesus is ready · hold J to ask', 4000);
      return true;
    } catch (e) {
      console.warn('AI Jesus unavailable', e);
      ai.state = 'error'; ai.engine = null;
      status('AI Jesus could not start on this computer. Using Gospel verses.', 6000);
      return false;
    }
  };

  /** Jesus's reply in his own manner. `ground` is a fitting saying from the Gospels to steer by. */
  ai.reply = async (asker, question, ground) => {
    if (ai.state !== 'ready') return null;
    const q = String(question).slice(0, 200);
    if (BLOCK.some((b) => q.toLowerCase().includes(b))) return null;
    const scene = G.chapterTitle?.() || 'the week of the Passover';
    const role = asker.role ? `${asker.name}, who walks with you as your disciple ${asker.role}` : asker.name;
    const sys = `You are Jesus of Nazareth in a reverent Bible story game, during the last week before the Passover in Jerusalem (current scene: "${scene}"). You are speaking to ${role}.
Answer as Jesus speaks in the Gospels: gentle, wise, brief (one to three short sentences), often with a simple image or a question back.
Stay faithful to the Bible and historic Christian teaching. Prefer to echo your own words from the Gospels. Do not invent new doctrine, prophecies or events, and never claim to be an AI.
If asked about modern things you would not know, gently turn the conversation to love of God and neighbor.
If someone speaks of harming themselves, abuse or danger, answer with compassion and tell them to talk now to a trusted adult, a pastor, or emergency services.
Keep it suitable for children. No violence, romance or crude talk.
A saying of yours that may fit: "${ground.line}" (${ground.ref}).`;
    try {
      const r = await ai.engine.chat.completions.create({
        messages: [{ role: 'system', content: sys }, { role: 'user', content: q }],
        max_tokens: 110, temperature: 0.6, top_p: 0.9,
      });
      let text = (r.choices?.[0]?.message?.content || '').trim();
      text = text.replace(/^(jesus|answer)\s*:\s*/i, '').replace(/^["“]|["”]$/g, '').replace(/\s+/g, ' ');
      const sentences = text.match(/[^.!?]+[.!?]+["”’)]*/g) || [text];
      text = sentences.slice(0, 3).join(' ').trim();
      if (!text || text.length < 3 || BLOCK.some((b) => text.toLowerCase().includes(b))) return null;
      return text.slice(0, 360);
    } catch (e) { console.warn('AI reply failed', e); return null; }
  };
  return ai;
}
