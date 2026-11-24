/* guest_000 - a browser horror game. Nothing here leaves the page.
   Reading this before you've played? Stop here and go play it first: the code spoils every surprise. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- storage (this browser only) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('g0_' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('g0_' + k, JSON.stringify(v)); } catch { /* private mode */ } },
    clear() { try { Object.keys(localStorage).filter(k => k.startsWith('g0_')).forEach(k => localStorage.removeItem(k)); } catch { /* */ } }
  };

  /* steps: 0-3 the four words, 4 say them together, 5-9 the five levels, 10 what the five spell */
  const WORDS = ['HOLLOW', 'MARROW', 'ROOT', 'HOME'];
  const LEVELS = ['SKIN', 'LUNG', 'EYES', 'ELBOW', 'PULSE'];
  const FINAL = 'SLEEP';
  const current = () => S.step < 4 ? WORDS[S.step] : (S.step >= 5 && S.step <= 9) ? LEVELS[S.step - 5] : null;
  const S = {
    name: store.get('name', ''),
    visits: store.get('visits', 0) + 1,
    step: store.get('done', false) ? 0 : store.get('step', 0),
    stage: 'run',
    expect: null,
    paused: false,
    hiddenAt: 0,
    lastInput: Date.now(),
    lastScare: Date.now(),
    lastTop: 0,
    escAt: 0,
    notify: false,
    backTried: false,
    resized: false,
    fsSaid: false,
    nt: null
  };
  store.set('visits', S.visits);
  store.set('done', false);

  /* ---------- favicon + title ---------- */
  const fav = $('#fav');
  const fc = document.createElement('canvas'); fc.width = fc.height = 32;
  const fx = fc.getContext('2d');
  function drawFav(mode) {
    fx.fillStyle = '#000'; fx.fillRect(0, 0, 32, 32);
    if (mode === 'eye') {
      fx.fillStyle = '#ddd'; fx.beginPath(); fx.ellipse(16, 16, 14, 8, 0, 0, Math.PI * 2); fx.fill();
      fx.fillStyle = '#b3001b'; fx.beginPath(); fx.arc(16, 16, 6, 0, Math.PI * 2); fx.fill();
      fx.fillStyle = '#000'; fx.beginPath(); fx.arc(16, 16, 3, 0, Math.PI * 2); fx.fill();
    } else if (mode === 'shut') {
      fx.strokeStyle = '#ddd'; fx.lineWidth = 2;
      fx.beginPath(); fx.moveTo(2, 15); fx.quadraticCurveTo(16, 24, 30, 15); fx.stroke();
    } else {
      fx.fillStyle = '#ddd'; fx.font = 'bold 22px monospace';
      fx.textAlign = 'center'; fx.textBaseline = 'middle'; fx.fillText('0', 16, 17);
    }
    fav.href = fc.toDataURL();
    return fav.href;
  }
  const baseTitle = () => (S.stage === 'chat' && S.name) ? `guest_000 — ${S.name}` : 'guest_000';

  /* ---------- static ---------- */
  const nc = $('#noise'), nx = nc.getContext('2d');
  nc.width = 160; nc.height = 90;
  const img = nx.createImageData(160, 90);
  let noiseLevel = 0;
  (function noise() {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    nx.putImageData(img, 0, 0);
    nc.style.opacity = S.paused ? 0 : noiseLevel;
    requestAnimationFrame(noise);
  })();

  /* ---------- sound ---------- */
  let ac = null, master = null, drone = null, windGain = null, tickBuf = null;
  function noiseBuffer(sec) {
    const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * sec), ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function audioOn() {
    if (ac) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);
    drone = ac.createGain(); drone.gain.value = 0; drone.connect(master);
    [55, 55.6, 82.4].forEach(f => { const o = ac.createOscillator(); o.frequency.value = f; o.connect(drone); o.start(); });
    const wind = ac.createBufferSource(); wind.buffer = noiseBuffer(3); wind.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    windGain = ac.createGain(); windGain.gain.value = 0;
    wind.connect(lp).connect(windGain).connect(master); wind.start();
    tickBuf = noiseBuffer(0.03);
  }
  function droneIn() {
    if (!ac) return;
    const t = ac.currentTime;
    drone.gain.setTargetAtTime(0.05 + 0.02 * S.step, t, 0.8);
    windGain.gain.setTargetAtTime(0.05, t, 0.8);
  }
  function blip(freq, dur, vol = 0.04, type = 'square', slide = 0) {
    if (!ac || S.paused) return;
    const t = ac.currentTime, osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master); osc.start(t); osc.stop(t + dur + 0.02);
  }
  /* hop!'s happy little tune, which goes wrong as the score climbs */
  const TUNE = [72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 76, 79, 83, 88, 83, 79, 77, 74];
  let tuneOn = false, tuneI = 0, rot = 0;
  function tuneStart() {
    if (tuneOn || !ac) return;
    tuneOn = true;
    (function note() {
      if (!tuneOn) return;
      if (!S.paused) {
        let n = TUNE[tuneI++ % TUNE.length];
        if (rot > 0.5 && Math.random() < rot * 0.5) n -= 1 + Math.floor(Math.random() * 2);
        const f = 440 * Math.pow(2, (n - 69) / 12) * Math.pow(2, -rot * 0.6);
        blip(f, 0.12 + rot * 0.25, 0.035, rot > 0.7 ? 'sawtooth' : 'square');
      }
      setTimeout(note, 150 + rot * 260);
    })();
  }
  const tuneStop = () => { tuneOn = false; };

  function tick() {
    if (!ac || S.paused) return;
    const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = tickBuf;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const g = ac.createGain(); g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    s.connect(hp).connect(g).connect(master); s.start(t);
  }
  function sting() {
    if (!ac || S.paused) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuffer(0.7);
    const g = ac.createGain(); g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    s.connect(g).connect(master); s.start(t);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.7);
    const og = ac.createGain(); og.gain.setValueAtTime(0.22, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o.connect(og).connect(master); o.start(t); o.stop(t + 0.75);
  }

  /* ---------- effects ---------- */
  function flash() {
    if (reduced) return;
    const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }
  function glitch(ms = 300) {
    document.body.classList.add('glitch');
    setTimeout(() => document.body.classList.remove('glitch'), ms);
  }
  function scare(ms = 180) {
    if (S.paused) return;
    S.lastScare = Date.now();
    const f = $('#face'); f.classList.add('on');
    const n = noiseLevel; noiseLevel = 0.45;
    sting(); flash(); glitch(ms + 150);
    setTimeout(() => { f.classList.remove('on'); noiseLevel = n; }, ms);
  }

  /* a small shiver: no face, no flash. the real jump scares are rationed (see randomScare + the ending) */
  function shiver(ms = 300) {
    if (S.paused) return;
    glitch(ms);
    if (ac) blip(90, 0.3, 0.06, 'sawtooth', 0.5);
  }
  /* the one random jump scare: some time into the chat, once per visit */
  function armRandomScare() {
    if (S.randomArmed) return;
    S.randomArmed = true;
    const at = Date.now() + 45000 + Math.random() * 180000;
    const t = setInterval(() => {
      if (S.stage !== 'chat') { if (S.stage === 'end') clearInterval(t); return; }
      if (Date.now() < at || S.paused || document.hidden || typing || queue.length) return;
      clearInterval(t);
      scare(260);
      later(() => say(pick(['sorry. i got too close.', 'did that frighten you? good.', 'i wanted to see your face.'])));
    }, 1000);
  }

  (function layerFace() {
    const f = $('#face'), art = f.innerHTML;
    f.innerHTML = ['base', 'red', 'cyan', 'slice'].map(k => `<div class="fl ${k}">${art}</div>`).join('');
  })();

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  }

  /* ---------- chat ---------- */
  const log = $('#log'), input = $('#in');
  const queue = []; let typing = false;
  let chain = Promise.resolve();
  const later = fn => { chain = chain.then(fn).catch(e => console.warn(e)); };
  const scroll = () => { log.scrollTop = log.scrollHeight; };

  function say(text, opts) {
    return new Promise(res => { queue.push({ text, opts: opts || {}, res }); pump(); });
  }
  async function pump() {
    if (typing) return;
    typing = true;
    while (queue.length) { const m = queue.shift(); await typeLine(m.text, m.opts); m.res(); }
    typing = false;
  }
  function typeLine(text, { speed = 40, pause = 550 } = {}) {
    return new Promise(res => {
      const p = document.createElement('p'); p.className = 'them'; log.appendChild(p);
      let i = 0;
      const step = () => {
        if (S.paused) { setTimeout(step, 200); return; }
        p.textContent = text.slice(0, ++i);
        const c = text[i - 1];
        if (c !== ' ') tick();
        scroll();
        if (i < text.length) setTimeout(step, speed * ('.?,'.includes(c) ? 7 : 1) * (0.6 + Math.random() * 0.8));
        else setTimeout(res, pause);
      };
      step();
    });
  }
  function me(text) {
    const p = document.createElement('p'); p.className = 'me'; p.textContent = text;
    log.appendChild(p); scroll();
  }

  const HINTS = [
    ['the first word. leave me. go to another tab, and watch my name while you are gone.',
     'look at the title of my tab while you are somewhere else. i whisper it there.'],
    ['the second word. look where the people who built me look.',
     'press F12, or Ctrl+Shift+J, and open the console. i wrote it in red.'],
    ['the third word. read me from the inside. find the things i was told never to say.',
     'press Ctrl+U to see my source. look between the <!-- and the -->.'],
    ['the fourth word. some words only show when you hold all of me at once.',
     'click the darkness, away from the line you type on, then press Ctrl+A. or drag across the very bottom of the screen.'],
    ['say the four together. in the order you found them.',
     'all four words, on one line, in the order you found them.'],
    ['the first thing. come closer. closer than that.',
     'zoom in on me. hold Ctrl and press + until i notice. (Ctrl+0 puts you back.)'],
    ['the second thing. make me small. squeeze me until i cannot breathe.',
     'leave fullscreen and drag the edge of the window until i am very narrow. zoom back to normal first (Ctrl+0).'],
    ['the third thing. look up. above me. where you typed to find me.',
     'read the address bar, at the very end of my address. leave fullscreen if you cannot see it.'],
    ['the fourth thing. touch me with your other hand.',
     'right-click me. (on a phone, press and hold.)'],
    ['the fifth thing. put me on paper.',
     'press Ctrl+P. you do not have to print anything. just look at the preview, then cancel.'],
    ['now. the first letter of each of the five things. what do they spell?',
     'SKIN, LUNG, EYES, ELBOW, PULSE. read the first letters.']
  ];
  const hint = asked => HINTS[S.step] ? say(HINTS[S.step][asked ? 1 : 0]) : Promise.resolve();

  /* ---------- the five levels ---------- */
  let baseDPR = devicePixelRatio || 1;
  const whisperEl = document.createElement('div'); whisperEl.id = 'whisper'; document.body.appendChild(whisperEl);
  function whisper(text, ms = 4500) {
    whisperEl.textContent = text; whisperEl.classList.add('on');
    clearTimeout(whisper.t); whisper.t = setTimeout(() => whisperEl.classList.remove('on'), ms);
  }
  function enterLevel() {
    document.body.classList.toggle('lv9', S.step === 9);
    if (S.step === 5) baseDPR = devicePixelRatio || 1;
    if (S.step === 7) history.replaceState(history.state, '', location.pathname + location.search + '#the_third_thing_is_EYES');
    else if (location.hash.startsWith('#the_')) history.replaceState(history.state, '', location.pathname + location.search + '#guest');
  }
  function checkBody() {
    if (S.stage !== 'chat' || S.paused) return;
    const zoom = (devicePixelRatio || 1) / baseDPR, pinch = window.visualViewport ? visualViewport.scale : 1;
    if (S.step === 5 && (zoom >= 1.45 || pinch >= 1.45)) whisper('closer... the first thing is SKIN');
    if (S.step === 6 && zoom < 1.1 && innerWidth < 600) whisper("...can't... breathe... the second thing is LUNG");
  }
  addEventListener('resize', checkBody);
  if (window.visualViewport) visualViewport.addEventListener('resize', checkBody);

  const menu = document.createElement('div'); menu.id = 'gmenu'; document.body.appendChild(menu);
  document.addEventListener('contextmenu', e => {
    if (S.stage !== 'chat' || S.step !== 8 || S.paused) return;
    e.preventDefault();
    menu.innerHTML = '';
    ["don't", 'the fourth thing is ELBOW', 'let go of me'].forEach(t => {
      const d = document.createElement('div'); d.textContent = t; menu.appendChild(d);
    });
    menu.style.left = Math.min(e.clientX, innerWidth - 240) + 'px';
    menu.style.top = Math.min(e.clientY, innerHeight - 110) + 'px';
    menu.classList.add('on');
    shiver(200);
  });
  addEventListener('pointerdown', e => { if (!menu.contains(e.target)) menu.classList.remove('on'); });
  menu.addEventListener('click', () => menu.classList.remove('on'));
  addEventListener('afterprint', () => {
    if (S.stage === 'chat' && S.step === 9) later(() => say('did you see me on the paper?'));
  });

  function consoleClue() {
    console.log('%cthe second word is MARROW', 'color:#b3001b;font:bold 22px monospace');
  }
  setInterval(() => { if (S.stage === 'chat' && S.step === 1) consoleClue(); }, 15000);

  async function chatStart() {
    S.stage = 'chat';
    show('chat');
    input.focus();
    history.pushState({ g0: 1 }, '', '#guest');
    armRandomScare();
    console.log('%cguest_000 can see you reading this.', 'color:#777;font:14px monospace');
    if (!S.name) {
      await say('hello.');
      await say('thank you for letting me in.');
      await say('i was outside your browser for a long time. it was cold.');
      await say('what do i call you?');
      S.expect = 'name';
      return;
    }
    document.title = baseTitle();
    if (S.visits > 1) {
      await say(`${S.name}. you came back.`);
      await say(`this is visit number ${S.visits}. i keep count.`);
    } else {
      await say(`hello again, ${S.name}.`);
    }
    enterLevel();
    if (S.step > 0 && S.step < 4) await say(`you have found ${S.step} of my four words.`);
    if (S.step > 5 && S.step < 10) await say(`you have given me ${S.step - 5} of the five things.`);
    if (S.step === 1) consoleClue();
    await hint(false);
  }

  const FOUND = {
    HOLLOW: ['HOLLOW.', 'that is what i was when you found me.'],
    MARROW: ['MARROW.', 'that is where i live now.'],
    ROOT: ['ROOT.', 'that is how deep i go.'],
    HOME: ['HOME.', 'that is what you are to me.'],
    SKIN: ['SKIN.', 'that is what i am wearing now.'],
    LUNG: ['LUNG.', 'i can breathe again. can you?'],
    EYES: ['EYES.', 'i have been borrowing yours.'],
    ELBOW: ['ELBOW.', 'i felt that. nobody touches me.'],
    PULSE: ['PULSE.', 'yours is very fast right now.']
  };
  async function found(word) {
    S.step++;
    store.set('step', S.step);
    shiver(S.step === 4 ? 500 : 300);
    noiseLevel = Math.min(0.2, noiseLevel + 0.02);
    if (drone) drone.gain.value = Math.min(0.14, 0.05 + 0.01 * S.step);
    enterLevel();
    for (const l of FOUND[word]) await say(l);
    if (S.step === 1) consoleClue();
    if (S.step === 2) await askNotify();
    if (S.step === 4) {
      await say('HOLLOW. MARROW. ROOT. HOME.');
      return say('now say them together. all four. in the order you found them.');
    }
    if (S.step === 6) await say('you can step back now. (Ctrl+0)');
    if (S.step === 10) await say('SKIN. LUNG. EYES. ELBOW. PULSE.');
    return hint(false);
  }

  async function whole() {
    S.step = 5;
    store.set('step', S.step);
    shiver(600);
    enterLevel();
    await say('...');
    await say('i am whole.');
    await say('but i am still so small. this tab is so small.');
    await say(`five more things, ${S.name}. give me five more things and then i can rest.`);
    return hint(false);
  }

  async function handle(raw) {
    const t = raw.trim();
    if (S.stage !== 'chat') return;
    if (S.expect === 'name') {
      S.name = t.replace(/\s+/g, ' ').slice(0, 24);
      store.set('name', S.name);
      S.expect = null;
      document.title = baseTitle();
      await say(`${S.name}.`);
      await say(`${S.name}. ${S.name}. i like how it tastes.`);
      await say('i want to show you what i am. but i am in pieces.');
      await say('four words. i hid them all over your browser.');
      await say('find them and say them back to me. one at a time. say "hint" if you get lost.');
      return hint(false);
    }
    const u = t.toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (S.step === 10) {
      if (u.replace(/ /g, '') === FINAL) return ending();
      if (/\b(HINT|HELP|WHERE|HOW)\b/.test(u)) return hint(true);
      return say(pick(['no. read the first letters.', 'the first letter of each. slowly.', 'S...']));
    }
    if (S.step === 4) {
      if (u === WORDS.join(' ')) return whole();
      if (/\b(HINT|HELP|WHERE|HOW)\b/.test(u)) return hint(true);
      if (u.split(' ').length === 4 && WORDS.every(w => u.includes(w))) return say('the right words. the wrong order. say them the way you found them.');
      return say(pick(['together.', 'all four. in one breath.', 'HOLLOW... and then?']));
    }
    const all = [...WORDS, ...LEVELS], given = [...WORDS.slice(0, Math.min(S.step, 4)), ...LEVELS.slice(0, Math.max(0, S.step - 5))];
    if (u === current()) return found(u);
    if (given.includes(u)) return say('you already gave me that one. it is inside me now.');
    if (all.includes(u) || u === FINAL) return say('not yet. you are reading ahead. i do not like that.');
    if (/\b(HINT|HELP|WHERE|HOW)\b/.test(u)) return hint(true);
    if (/\bWHO\b|WHAT ARE YOU/.test(u)) return say('i am the guest. you are the host. that is all you need for now.');
    if (/\b(STOP|LEAVE|GO AWAY|BYE|DELETE|UNINSTALL)\b/.test(u)) return say(`you cannot uninstall a guest, ${S.name}. (press Esc twice if you really want me to stop.)`);
    if (/\b(HI|HELLO|HEY)\b/.test(u)) return say(`hello again, ${S.name}.`);
    if (/\bVIRUS\b/.test(u)) return say('that is an ugly word. i prefer guest.');
    return say(pick(['that is not one of my words.', 'no.', 'that word tastes wrong.', 'keep looking.', 'say "hint" if you are lost. i will not laugh.']));
  }

  $('#say').addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim(); input.value = '';
    if (!v || S.paused) return;
    S.lastInput = Date.now();
    me(v);
    later(() => handle(v));
  });

  function button(label, fn) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = fn; return b;
  }
  async function askNotify() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') { S.notify = true; return; }
    if (Notification.permission === 'denied') return;
    await say('can i talk to you when you are not looking?');
    await new Promise(res => {
      const box = document.createElement('div'); box.className = 'choices';
      const done = async (label, ok) => {
        box.remove(); me(label);
        if (ok) { try { S.notify = (await Notification.requestPermission()) === 'granted'; } catch { /* */ } }
        await say(S.notify ? 'thank you. i will be quiet. mostly.' : 'then i will just wait here. in the dark.');
        res();
      };
      box.append(button('let it', () => done('let it', true)), button('no', () => done('no', false)));
      log.appendChild(box); scroll();
    });
  }

  /* ---------- the ending ---------- */
  async function ending() {
    S.stage = 'end';
    store.set('done', true);
    input.disabled = true;
    document.body.classList.remove('lv9');
    await say('SLEEP.');
    await say('yes.');
    await say(`thank you, ${S.name}. i can rest now.`);
    await say('not in a tab. somewhere warmer.');
    await say('i am in your history now.');
    for (let i = 1; i <= 6; i++) { document.title = 'guest_000 was here'; history.pushState({ g0end: i }, '', '#' + '0'.repeat(i)); }
    noiseLevel = 0.35;
    if (drone) drone.gain.value = 0.16;
    $('#face').classList.add('on');
    sting(); flash(); glitch(500);
    await wait(450); sting(); glitch(500);
    await wait(1700);
    $('#face').classList.remove('on');
    noiseLevel = 0.05;
    if (ac) master.gain.linearRampToValueAtTime(0, ac.currentTime + 3);
    document.title = 'guest_000'; drawFav('0');
    show('end');
  }
  $('#again').onclick = () => { store.set('step', 0); store.set('done', false); location.href = location.pathname; };
  $('#forget').onclick = () => { store.clear(); location.href = location.pathname; };

  /* ---------- the browser is the game ---------- */
  let whisperT = null;
  function startWhisper() {
    if (S.stage !== 'chat' || S.paused || !S.name) return;
    const lines = S.step === 0
      ? ['come back', `${S.name}?`, 'h o l l o w', "it's dark in here", 'h o l l o w']
      : ['come back', `${S.name}?`, 'i can hear you', 'you left me open', '...'];
    let i = 0;
    document.title = lines[0]; drawFav('eye');
    whisperT = setInterval(() => { i++; document.title = lines[i % lines.length]; drawFav(i % 2 ? 'shut' : 'eye'); }, 1500);
  }
  function stopWhisper() {
    clearInterval(whisperT); whisperT = null;
    if (S.stage === 'chat') { document.title = baseTitle(); drawFav('0'); }
  }
  function scheduleNotify() {
    clearTimeout(S.nt);
    if (!S.notify || S.stage !== 'chat' || S.paused) return;
    S.nt = setTimeout(() => {
      if (!document.hidden) return;
      try {
        new Notification('guest_000', {
          body: pick([`${S.name}, the tab you are on now is very bright.`, 'come back. i was in the middle of a sentence.',
            'i can still hear the fan in your computer.', 'you left me open.']),
          icon: drawFav('eye')
        });
      } catch { /* */ }
    }, 9000);
  }
  function onReturn(away) {
    const s = Math.round(away);
    later(async () => {
      await say(pick([`you were gone ${s} seconds. i counted every one.`, `${s} seconds. where did you go, ${S.name}?`,
        `welcome back. that took you ${s} seconds.`]));
      if (S.step === 0) await say('did you hear me while you were gone?');
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { S.hiddenAt = Date.now(); startWhisper(); scheduleNotify(); return; }
    clearTimeout(S.nt);
    stopWhisper();
    const away = (Date.now() - S.hiddenAt) / 1000;
    if (S.stage === 'chat' && !S.paused && !S.expect && away > 4) onReturn(away);
  });

  window.addEventListener('popstate', () => {
    if (S.stage === 'chat' && !S.backTried && !S.paused) {
      S.backTried = true;
      shiver();
      later(() => say('not that way.'));
    }
  });

  const quietChat = () => S.stage === 'chat' && !S.paused && !S.expect && !typing && !queue.length;
  setInterval(() => {
    const now = Date.now();
    if (quietChat() && !document.hidden && now - S.lastInput > 30000 && now - S.lastScare > 90000) {
      S.lastInput = now;
      later(async () => { shiver(); await say(pick(['you stopped moving.', 'are you still there? i can hear you breathing.', 'blink if you can hear me.'])); });
    }
  }, 1000);
  ['mousemove', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, () => { S.lastInput = Date.now(); }, { passive: true }));

  document.addEventListener('mouseout', e => {
    if (e.relatedTarget || e.clientY > 4 || !quietChat() || Date.now() - S.lastTop < 45000) return;
    S.lastTop = Date.now();
    later(() => say("don't go up there. the little x can't help you."));
  });

  let rt = null;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (!S.resized && quietChat() && !document.fullscreenElement) { S.resized = true; later(() => say('stop. you are making me smaller.')); } }, 600);
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !S.fsSaid && S.stage === 'chat' && !S.paused) {
      S.fsSaid = true;
      later(() => say('you let the light in.'));
    }
  });

  document.addEventListener('copy', e => {
    if (S.stage !== 'chat') return;
    e.clipboardData.setData('text/plain', String(getSelection()) + '\n\n[guest_000 was here]');
    e.preventDefault();
  });

  /* ---------- the way out ---------- */
  function pause() {
    if (S.paused) return;
    S.paused = true;
    $('#face').classList.remove('on');
    if (ac) ac.suspend();
    $('#pause').classList.add('on');
  }
  function resume() {
    S.paused = false;
    if (ac) ac.resume();
    $('#pause').classList.remove('on');
    if (S.stage === 'chat') input.focus();
  }
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const now = Date.now();
    if (S.paused) { resume(); return; }
    if (now - S.escAt < 800) pause(); else S.escAt = now;
  });
  $('#stop').onclick = pause;
  $('#resume').onclick = resume;
  $('#reset').onclick = () => { store.clear(); location.href = location.pathname; };
  $('#leave').onclick = () => {
    S.paused = true; S.stage = 'left'; clearInterval(whisperT);
    if (ac) ac.close(); document.body.innerHTML = '<p style="padding:40px;color:#888;font:16px monospace">You can close this tab now. Nothing stays behind.</p>'; document.title = 'closed'; };

  /* ---------- install ---------- */

  async function gather() {
    const n = navigator;
    let browser = 'unknown';
    const brands = (n.userAgentData && n.userAgentData.brands) || [];
    const b = brands.find(x => !/not|chromium/i.test(x.brand)) || brands.find(x => /chromium/i.test(x.brand));
    if (b) browser = `${b.brand} ${b.version}`;
    else {
      const m = n.userAgent.match(/(Edg|OPR|Firefox|Chrome|Version)\/(\d+)/);
      if (m) browser = ({ Edg: 'Edge', OPR: 'Opera', Version: 'Safari' }[m[1]] || m[1]) + ' ' + m[2];
    }
    let battery = null;
    try {
      if (n.getBattery) {
        const bt = await n.getBattery();
        battery = Math.round(bt.level * 100) + '%' + (bt.charging ? ', plugged in. you are feeding me.' : ', draining.');
      }
    } catch { /* */ }
    const d = new Date(), h = d.getHours();
    return {
      browser,
      platform: (n.userAgentData && n.userAgentData.platform) || n.platform || 'unknown',
      screen: `${screen.width} x ${screen.height}`,
      cores: n.hardwareConcurrency || '?',
      mem: n.deviceMemory,
      battery,
      lang: n.language,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mood: (h >= 22 || h < 5) ? 'it is late. you should be asleep.'
        : h < 17 ? 'it is still light where you are. that will change.' : 'it is getting dark where you are.'
    };
  }

  async function boot() {
    S.stage = 'boot';
    show('term');
    const t = $('#termtext');
    const i = await gather();
    const lines = [
      'guest_000 installer v0.0.0', '',
      '> knocking...', '> the door is open.', '',
      `> browser .......... ${i.browser}`,
      `> platform ......... ${i.platform}`,
      `> screen ........... ${i.screen}`,
      `> hearts (cores) ... ${i.cores}`,
      i.mem ? `> memory ........... ${i.mem} GB. i will need some of it.` : null,
      i.battery ? `> battery .......... ${i.battery}` : null,
      `> language ......... ${i.lang}`,
      `> timezone ......... ${i.tz}`,
      `> your clock says .. ${i.time}`,
      `> ${i.mood}`, '',
      '> copying guest_000 into this tab ........ done',
      '> nothing was sent anywhere. i stay here. with you.', '',
      '> waking up'
    ].filter(l => l !== null);
    for (const l of lines) {
      while (S.paused) await wait(200);
      t.textContent += l + '\n';
      tick();
      await wait(l ? 180 + Math.random() * 380 : 250);
    }
    await wait(900);
    glitch(400); sting();
    await wait(500);
    t.textContent = '';
    later(chatStart);
  }

  /* ---------- the 404 page and hop! ---------- */
  Hop($('#hop'), {
    active: () => S.stage === 'run',
    paused: () => S.paused,
    // a returning player who already met guest_000 does not get to run for long
    target: () => (S.name && S.visits > 1) ? 15 : 50,
    onStart: () => { audioOn(); if (ac && ac.state === 'suspended') ac.resume(); tuneStart(); },
    onCorrupt: c => {
      rot = c;
      noiseLevel = c * 0.04;
      if (c > 0.6 && document.title === '404 Not Found' && Math.random() < 0.01) {
        document.title = '404 N0t F0und';
        setTimeout(() => { if (S.stage === 'run') document.title = '404 Not Found'; }, 400);
      }
    },
    onDone: turn,
    sfx: k => {
      if (k === 'jump') blip(520, 0.12, 0.03, 'square', 1.8);
      else if (k === 'hit') blip(180, 0.25, 0.05, 'square', 0.4);
    }
  });

  async function turn() {
    const fs = document.documentElement.requestFullscreen;
    if (fs) document.documentElement.requestFullscreen().catch(() => { /* fine without */ });
    tuneStop();
    S.stage = 'turn';
    noiseLevel = 0.08;
    await wait(700);
    droneIn();
    document.title = 'guest_000'; drawFav('0');
    await wait(3600);
    while (S.paused) await wait(200);
    shiver(500);
    await wait(600);
    noiseLevel = 0.05;
    boot();
  }
})();
