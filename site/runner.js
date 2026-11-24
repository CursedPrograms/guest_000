/* hop! - an innocent little runner. Original art, drawn in code.
   Haven't played yet? Close this and play first: the code spoils it. */
window.Hop = function (cv, o) {
  'use strict';
  const x = cv.getContext('2d');
  const W = 640, H = 200, GROUND = 168, BX = 60;
  cv.width = W; cv.height = H;

  const BUNNY = [
    '...wp.wp...', '...wp.wp...', '...wp.wp...', '...ww.ww...',
    '..wwwwwww..', '.wwwwwwkww.', '.wwwwwwwwwp', 'wwwwwwwwww.',
    'wwwwwwwwww.', '.wwwwwwww..'
  ];
  const FEET = ['.ww....ww..', '..ww..ww...'];
  const FRONT = [
    '.wp...wp.', '.wp...wp.', '.wp...wp.', '.ww...ww.', 'wwwwwwwww',
    'wwwwwwwww', 'wkkwwwkkw', 'wkkwwwkkw', 'wwwwpwwww', 'wwkkkkkww', 'wwwwwwwww', '.wwwwwww.'
  ];
  const PAL = { w: '#ffffff', p: '#ffb3c7' };

  let st = 'title', speed, dist, score, best = 0, bun, obs, nextGap, frame = 0, doneT = 0, last = 0, c = 0;
  const clouds = [{ x: 120, y: 40 }, { x: 380, y: 26 }, { x: 560, y: 58 }];

  function reset() {
    speed = 5; dist = 0; score = 0; c = 0;
    bun = { y: GROUND, vy: 0 };
    obs = []; nextGap = 320;
  }
  reset();

  function hop() {
    if (o.paused() || st === 'done') return;
    if (st === 'title' || st === 'over') { if (st === 'over') reset(); st = 'run'; o.onStart(); return; }
    if (bun.y >= GROUND) { bun.vy = -10.5; o.sfx('jump'); }
  }
  addEventListener('keydown', e => {
    if (!o.active()) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); hop(); }
  });
  cv.addEventListener('pointerdown', e => { e.preventDefault(); hop(); });

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

  function sprite(rows, px, py, s, eye) {
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const ch = r[i]; if (ch === '.') continue;
        x.fillStyle = ch === 'k' ? eye : PAL[ch];
        x.fillRect(Math.round(px + i * s), Math.round(py + j * s), Math.ceil(s), Math.ceil(s));
      }
    });
  }

  function drawObstacle(ob) {
    const top = GROUND - ob.h;
    if (ob.kind === 'rock') {
      x.fillStyle = mix('#9aa3ad', '#3a3030', c);
      x.fillRect(ob.x + 2, top, ob.w - 4, ob.h); x.fillRect(ob.x, top + 4, ob.w, ob.h - 4);
    } else if (ob.kind === 'shroom') {
      x.fillStyle = '#f4ead8'; x.fillRect(ob.x + 5, top + 9, 6, ob.h - 9);
      x.fillStyle = mix('#ff5a6e', '#6a0010', c); x.fillRect(ob.x, top + 2, ob.w, 8); x.fillRect(ob.x + 3, top, ob.w - 6, 2);
      x.fillStyle = '#fff'; x.fillRect(ob.x + 3, top + 4, 2, 2); x.fillRect(ob.x + 10, top + 3, 2, 2);
    } else {
      x.fillStyle = '#5b5656'; x.fillRect(ob.x, top + 4, ob.w, ob.h - 4); x.fillRect(ob.x + 2, top, ob.w - 4, 4);
      x.fillStyle = '#2a2626'; x.fillRect(ob.x + 7, top + 6, 2, 9); x.fillRect(ob.x + 4, top + 9, 8, 2);
    }
  }

  function update(k) {
    if (st !== 'run') return;
    dist += speed * k;
    speed = Math.min(9, 5 + dist / 4000);
    bun.vy += 0.6 * k; bun.y += bun.vy * k;
    if (bun.y >= GROUND) { bun.y = GROUND; bun.vy = 0; }
    nextGap -= speed * k;
    if (nextGap <= 0) {
      const kind = c > 0.6 ? 'grave' : (Math.random() < 0.5 ? 'rock' : 'shroom');
      obs.push({ x: W + 10, kind, w: kind === 'rock' ? 18 : 16, h: kind === 'rock' ? 15 : 22 });
      nextGap = 260 + Math.random() * 320;
    }
    obs.forEach(ob => { ob.x -= speed * k; });
    obs = obs.filter(ob => ob.x > -30);
    clouds.forEach(cl => { cl.x -= 0.4 * k; if (cl.x < -60) cl.x = W + 40; });
    for (const ob of obs) {
      if (BX + 20 > ob.x + 3 && BX + 3 < ob.x + ob.w - 3 && bun.y > GROUND - ob.h + 3) {
        st = 'over'; best = Math.max(best, score); o.sfx('hit'); return;
      }
    }
    score = Math.floor(dist / 130);
    const target = o.target();
    c = Math.max(0, Math.min(1, (score - target * 0.55) / (target * 0.45)));
    o.onCorrupt(c);
    if (score >= target) { st = 'done'; doneT = 0; o.onDone(); }
  }

  function draw(k) {
    const cc = st === 'done' ? 1 : c;
    x.fillStyle = mix('#bfe6ff', '#140608', cc); x.fillRect(0, 0, W, H);
    clouds.forEach(cl => {
      x.fillStyle = mix('#ffffff', '#3a2a2a', cc);
      x.fillRect(cl.x, cl.y, 44, 10); x.fillRect(cl.x + 8, cl.y - 6, 22, 6);
      if (cc > 0.7) { x.fillStyle = '#b3001b'; x.fillRect(cl.x + 13, cl.y + 2, 3, 3); x.fillRect(cl.x + 25, cl.y + 2, 3, 3); }
    });
    x.fillStyle = mix('#7ccf6b', '#2b1414', cc); x.fillRect(0, GROUND, W, H - GROUND);
    x.fillStyle = mix('#5fae50', '#1a0a0a', cc); x.fillRect(0, GROUND, W, 3);
    obs.forEach(drawObstacle);

    const eye = cc > 0.5 ? '#d0001b' : '#222';
    if (st === 'done') {
      doneT += k;
      const s = Math.min(9, 2 + doneT / 18);
      sprite(FRONT, BX + 11 - FRONT[0].length * s / 2, GROUND - FRONT.length * s, s, '#d0001b');
      x.fillStyle = '#ddd'; x.font = '16px "Courier New", monospace'; x.textAlign = 'right';
      if (doneT > 70) x.fillText("you're good at running.", W - 24, 60);
      if (doneT > 160) { x.fillStyle = '#d0001b'; x.fillText("but i'm already inside.", W - 24, 86); }
    } else {
      const run = st === 'run' && bun.y >= GROUND;
      sprite(BUNNY, BX, bun.y - 24, 2, eye);
      sprite([run ? FEET[Math.floor(frame / 6) % 2] : FEET[0]], BX, bun.y - 2, 2, eye);
    }

    x.textAlign = 'right'; x.font = 'bold 16px "Courier New", monospace';
    x.fillStyle = cc > 0.4 ? '#b3001b' : '#4a5a6a';
    const sc = (cc > 0.8 && Math.random() < 0.15) ? '???' : String(score);
    if (st !== 'done') x.fillText(`★ ${sc}` + (best ? `   best ${best}` : ''), W - 16, 26);

    x.textAlign = 'center'; x.fillStyle = '#4a5a6a';
    if (st === 'title') {
      x.font = 'bold 40px "Courier New", monospace'; x.fillText('hop!', W / 2, 80);
      x.font = '15px "Courier New", monospace'; x.fillText('press space or tap to hop', W / 2, 108);
    } else if (st === 'over') {
      x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = cc > 0.4 ? '#b3001b' : '#4a5a6a';
      x.fillText(cc > 0.6 ? "don't stop now." : 'oops!', W / 2, 80);
      x.font = '15px "Courier New", monospace'; x.fillText('press space to hop again', W / 2, 106);
    }

    if (cc > 0.3 && st === 'run' && Math.random() < cc * 0.03) {
      for (let i = 0; i < 4; i++) {
        const y = Math.random() * H, h = 4 + Math.random() * 18, dx = (Math.random() - 0.5) * 40 * cc;
        x.drawImage(cv, 0, y, W, h, dx, y, W, h);
      }
    }
  }

  function loop(now) {
    const k = last ? Math.min(3, (now - last) / 16.67) : 1;
    last = now;
    if (o.active() && !o.paused()) { frame += k; update(k); draw(k); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
};
