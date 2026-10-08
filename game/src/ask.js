// Ask Jesus (online, in The Way of the Cross): hold J and ask a question out loud (or type it). Jesus turns
// to you and answers in his own words from the Gospels (ESV), shown to the whole party and spoken aloud.
// Answers are only ever his recorded words; we never invent sayings for him.

// Each entry: words that suggest the topic, then his answer and where it is written.
const SAYINGS = [
  { k: ['who are you', 'who r u', 'your name', 'are you god', 'son of god', 'messiah', 'christ'], a: 'I am the way, and the truth, and the life. No one comes to the Father except through me.', r: 'John 14:6' },
  { k: ['way', 'truth', 'path', 'which way', 'how do i get to heaven', 'get to heaven', 'go to heaven'], a: 'I am the way, and the truth, and the life. No one comes to the Father except through me.', r: 'John 14:6' },
  { k: ['eternal life', 'live forever', 'saved', 'salvation', 'save me', 'heaven'], a: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.', r: 'John 3:16' },
  { k: ['love', 'loves me', 'does god love', 'care about me'], a: 'As the Father has loved me, so have I loved you. Abide in my love.', r: 'John 15:9' },
  { k: ['commandment', 'most important', 'greatest', 'what should i do', 'rule'], a: 'You shall love the Lord your God with all your heart and with all your soul and with all your mind… And a second is like it: You shall love your neighbor as yourself.', r: 'Matthew 22:37–39' },
  { k: ['neighbor', 'neighbour', 'other people', 'treat people', 'golden rule'], a: 'So whatever you wish that others would do to you, do also to them.', r: 'Matthew 7:12' },
  { k: ['enemy', 'enemies', 'hate me', 'bully', 'bullies', 'mean to me'], a: 'Love your enemies and pray for those who persecute you.', r: 'Matthew 5:44' },
  { k: ['forgive me', 'am i forgiven', 'forgiven', 'forgive my sins'], a: 'Take heart, my son; your sins are forgiven.', r: 'Matthew 9:2' },
  { k: ['forgive', 'forgiveness', 'sorry', 'how many times', 'grudge'], a: 'I do not say to you seven times, but seventy-seven times.', r: 'Matthew 18:22' },
  { k: ['sin', 'sinned', 'did something wrong', 'guilty', 'bad person', 'mistake'], a: 'Those who are well have no need of a physician, but those who are sick. I came not to call the righteous, but sinners.', r: 'Mark 2:17' },
  { k: ['pray', 'prayer', 'how do i talk to god', 'teach us'], a: 'Pray then like this: “Our Father in heaven, hallowed be your name. Your kingdom come, your will be done, on earth as it is in heaven.”', r: 'Matthew 6:9–10' },
  { k: ['ask', 'want something', 'need something', 'will god give'], a: 'Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you.', r: 'Matthew 7:7' },
  { k: ['worry', 'worried', 'anxious', 'anxiety', 'stress', 'stressed', 'tomorrow', 'future'], a: 'Do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.', r: 'Matthew 6:34' },
  { k: ['afraid', 'scared', 'fear', 'frightened', 'nervous'], a: 'Peace I leave with you; my peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.', r: 'John 14:27' },
  { k: ['tired', 'weary', 'exhausted', 'burden', 'heavy', 'rest'], a: 'Come to me, all who labor and are heavy laden, and I will give you rest.', r: 'Matthew 11:28' },
  { k: ['sad', 'cry', 'crying', 'grief', 'mourn', 'depressed', 'upset', 'hurt'], a: 'Blessed are those who mourn, for they shall be comforted.', r: 'Matthew 5:4' },
  { k: ['alone', 'lonely', 'leave me', 'abandon', 'with me', 'where are you'], a: 'And behold, I am with you always, to the end of the age.', r: 'Matthew 28:20' },
  { k: ['trouble', 'hard', 'suffering', 'pain', 'difficult', 'struggle'], a: 'In the world you will have tribulation. But take heart; I have overcome the world.', r: 'John 16:33' },
  { k: ['die', 'death', 'dead', 'dying', 'after death', 'resurrection'], a: 'I am the resurrection and the life. Whoever believes in me, though he die, yet shall he live.', r: 'John 11:25' },
  { k: ['why must you die', 'why do you have to die', 'why the cross', 'why die', 'why are you going to die'], a: 'Greater love has no one than this, that someone lay down his life for his friends.', r: 'John 15:13' },
  { k: ['faith', 'believe', 'doubt', 'not sure', 'trust'], a: 'If you have faith like a grain of mustard seed, you will say to this mountain, “Move from here to there,” and it will move, and nothing will be impossible for you.', r: 'Matthew 17:20' },
  { k: ['money', 'rich', 'wealth', 'poor', 'treasure', 'possessions'], a: 'Do not lay up for yourselves treasures on earth… but lay up for yourselves treasures in heaven… For where your treasure is, there your heart will be also.', r: 'Matthew 6:19–21' },
  { k: ['judge', 'judging', 'criticize', 'hypocrite'], a: 'Judge not, that you be not judged.', r: 'Matthew 7:1' },
  { k: ['kingdom', 'kingdom of god', 'what is heaven like'], a: 'The kingdom of heaven is like a grain of mustard seed… It is the smallest of all seeds, but when it has grown it is larger than all the garden plants and becomes a tree.', r: 'Matthew 13:31–32' },
  { k: ['first', 'priority', 'what matters', 'purpose', 'meaning'], a: 'But seek first the kingdom of God and his righteousness, and all these things will be added to you.', r: 'Matthew 6:33' },
  { k: ['great', 'important', 'famous', 'leader', 'be the best'], a: 'Whoever would be great among you must be your servant.', r: 'Matthew 20:26' },
  { k: ['follow', 'disciple', 'come with you', 'go with you', 'be like you'], a: 'If anyone would come after me, let him deny himself and take up his cross daily and follow me.', r: 'Luke 9:23' },
  { k: ['born again', 'new life', 'start over', 'change'], a: 'Truly, truly, I say to you, unless one is born again he cannot see the kingdom of God.', r: 'John 3:3' },
  { k: ['holy spirit', 'spirit', 'helper', 'comforter'], a: 'But the Helper, the Holy Spirit, whom the Father will send in my name, he will teach you all things.', r: 'John 14:26' },
  { k: ['father', 'god the father', 'see god', 'show us the father'], a: 'Whoever has seen me has seen the Father.', r: 'John 14:9' },
  { k: ['hungry', 'food', 'bread', 'eat'], a: 'I am the bread of life; whoever comes to me shall not hunger, and whoever believes in me shall never thirst.', r: 'John 6:35' },
  { k: ['thirsty', 'water', 'drink'], a: 'Whoever drinks of the water that I will give him will never be thirsty again.', r: 'John 4:14' },
  { k: ['light', 'dark', 'darkness', 'lost'], a: 'I am the light of the world. Whoever follows me will not walk in darkness, but will have the light of life.', r: 'John 8:12' },
  { k: ['sheep', 'shepherd', 'protect', 'keep me safe'], a: 'I am the good shepherd. The good shepherd lays down his life for the sheep.', r: 'John 10:11' },
  { k: ['children', 'kids', 'child', 'young'], a: 'Let the little children come to me and do not hinder them, for to such belongs the kingdom of heaven.', r: 'Matthew 19:14' },
  { k: ['peace', 'calm', 'peacemaker', 'fight', 'war'], a: 'Blessed are the peacemakers, for they shall be called sons of God.', r: 'Matthew 5:9' },
  { k: ['happy', 'blessed', 'joy'], a: 'These things I have spoken to you, that my joy may be in you, and that your joy may be full.', r: 'John 15:11' },
  { k: ['temptation', 'tempted', 'resist', 'weak'], a: 'Watch and pray that you may not enter into temptation. The spirit indeed is willing, but the flesh is weak.', r: 'Matthew 26:41' },
  { k: ['angry', 'anger', 'mad', 'revenge'], a: 'You have heard that it was said, “An eye for an eye and a tooth for a tooth.” But I say to you, Do not resist the one who is evil. But if anyone slaps you on the right cheek, turn to him the other also.', r: 'Matthew 5:38–39' },
  { k: ['heal', 'sick', 'ill', 'healing'], a: 'Go your way; your faith has made you well.', r: 'Mark 10:52' },
  { k: ['betray', 'judas', 'traitor'], a: 'Truly, I say to you, one of you will betray me.', r: 'Matthew 26:21' },
  { k: ['peter', 'deny', 'denied'], a: 'Truly, I tell you, this very night, before the rooster crows, you will deny me three times.', r: 'Matthew 26:34' },
  { k: ['come back', 'return', 'second coming', 'when will you'], a: 'But concerning that day and hour no one knows, not even the angels of heaven, nor the Son, but the Father only.', r: 'Matthew 24:36' },
  { k: ['where are we going', 'where are you going', 'where to'], a: 'In my Father’s house are many rooms… I go to prepare a place for you.', r: 'John 14:2' },
  { k: ['thank', 'thanks', 'thank you'], a: 'Your faith has saved you; go in peace.', r: 'Luke 7:50' },
  { k: ['hello', 'hi', 'hey', 'shalom', 'good morning', 'greetings'], a: 'Peace be with you.', r: 'John 20:19' },
  { k: ['help', 'help me', 'please'], a: 'Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you.', r: 'Matthew 7:7' },
];
const FALLBACK = [
  { a: 'He who has ears to hear, let him hear.', r: 'Matthew 11:15' },
  { a: 'Seek first the kingdom of God and his righteousness, and all these things will be added to you.', r: 'Matthew 6:33' },
  { a: 'Abide in me, and I in you.', r: 'John 15:4' },
];

/** Pick the saying that best fits the question (most keyword letters matched; ties to the longest key). */
export function answerFor(question) {
  const q = ' ' + String(question || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  let best = null, score = 0;
  for (const s of SAYINGS) {
    let sc = 0;
    for (const k of s.k) if (q.includes(' ' + k + ' ') || (k.length > 4 && q.includes(k))) sc += k.length;
    if (sc > score) { score = sc; best = s; }
  }
  return best ? { line: best.a, ref: best.r } : (() => { const f = FALLBACK[Math.floor(Math.random() * FALLBACK.length)]; return { line: f.a, ref: f.r }; })();
}

export function createAsk(G) {
  const { ui, net } = G;
  const box = document.createElement('div'); box.id = 'askjesus'; box.hidden = true;
  box.innerHTML = '<div class="ask-q"></div><div class="ask-a"><b>Jesus</b><span></span><cite></cite></div>';
  document.body.appendChild(box);
  const prompt = document.createElement('form'); prompt.id = 'askbox'; prompt.hidden = true;
  prompt.innerHTML = '<label>Ask Jesus<input maxlength="140" autocomplete="off" placeholder="Type your question and press Enter" /></label>';
  document.body.appendChild(prompt);
  const inp = prompt.querySelector('input');
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { prompt.hidden = true; G.chatting = false; inp.blur(); } });
  inp.addEventListener('keyup', (e) => e.stopPropagation());
  prompt.onsubmit = (e) => { e.preventDefault(); const t = inp.value.trim(); prompt.hidden = true; G.chatting = false; inp.blur(); if (t) send(t); };

  const can = () => G.campaign === 'gospel' && G.inGame && (net.role === 'guest' || G.autoHero);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, heard = '';

  // Speak with a calm, low voice when the browser can.
  const speak = (text) => {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, '').replace(/…/g, ', '));
      const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
      u.voice = vs.find((v) => /daniel|george|male|guy|arthur|david|james|google uk english male/i.test(v.name)) || vs[0] || null;
      u.rate = 0.88; u.pitch = 0.78; u.volume = Math.min(1, (G.save.settings.volume ?? 0.8) * 1.1);
      speechSynthesis.speak(u);
    } catch {}
  };
  let hideT = 0;
  const show = (asker, q, a) => {
    box.querySelector('.ask-q').textContent = `${asker}: “${q}”`;
    box.querySelector('.ask-a span').textContent = a.line;
    box.querySelector('.ask-a cite').textContent = a.ref;
    box.hidden = false; box.classList.remove('out');
    clearTimeout(hideT); hideT = setTimeout(() => { box.classList.add('out'); setTimeout(() => (box.hidden = true), 800); }, Math.max(6000, a.line.length * 75));
    speak(a.line);
  };
  /** Host: Jesus turns to whoever asked and answers; everyone sees and hears it. */
  const answer = (askerName, q, posOf) => {
    const a = answerFor(q);
    const P = G.player, at = posOf?.();
    if (at && G.control && !G.interactBusy) { P.facing = Math.atan2(at.x - P.pos.x, at.z - P.pos.z); }
    if (G.autoHero) G.autoHero.pauseUntil = G.t + Math.min(9, 2 + a.line.length * 0.05);
    P.h.pose.talk = 1; setTimeout(() => (P.h.pose.talk = 0), Math.min(8000, a.line.length * 60));
    net.broadcastAnswer?.({ who: askerName, q, line: a.line, ref: a.ref });
    show(askerName, q, a);
  };
  const send = (q) => {
    q = q.slice(0, 140);
    if (net.role === 'guest') net.askHost?.(q);
    else answer(net.me?.name || 'You', q, () => G.follow?.pos);
  };
  G.ask = { answer, show, answerFor };

  const start = () => {
    if (!can() || listening || G.chatting) return;
    if (!SR) { prompt.hidden = false; inp.value = ''; inp.focus(); G.chatting = true; if (document.pointerLockElement) document.exitPointerLock(); return; }
    try {
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; heard = '';
      rec.onresult = (e) => { heard = [...e.results].map((r) => r[0].transcript).join(' '); ui.hint(`Asking Jesus: “${heard}”`, 1500, true); };
      rec.onerror = (e) => {
        listening = false;
        if (e.error === 'no-speech' || e.error === 'aborted') { ui.hint('I didn’t catch that. Hold J and ask again.', 2500, true); return; }
        prompt.hidden = false; inp.value = ''; inp.focus(); G.chatting = true; // no speech service: type it instead
      };
      rec.onend = () => { listening = false; ui.hint('', 1); if (heard.trim()) send(heard.trim()); };
      rec.start(); listening = true;
      ui.hint('Listening… ask Jesus your question, then let go of J', 3000, true);
    } catch { listening = false; }
  };
  const stop = () => { if (listening) try { rec.stop(); } catch {} };
  addEventListener('keydown', (e) => { if (e.code === 'KeyJ' && !e.repeat && !G.chatting && !G.paused) start(); });
  addEventListener('keyup', (e) => { if (e.code === 'KeyJ') stop(); });
  return G.ask;
}
