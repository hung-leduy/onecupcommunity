// 30-second "How One Cup works" timeline in the One Cup campaign look. Times are seconds inside the
// segment. Scene changes sit on the bar lines of the soundtrack (118 BPM, one bar = 2.034 s); the
// bar grid is anchored on the first music splice at 7.181 s (see render.mjs).
(() => {
  const BEAT = 60 / 118.0, BAR = 4 * BEAT;
  const bar = (k) => +(7.181 + (k - 3) * BAR).toFixed(3); // bar(3) = 7.181
  const T = {
    poster: bar(0), gear: bar(1), gearB: bar(2), link: bar(3), tap: bar(4), stack: bar(6),
    comm: bar(8), campus: bar(10), story: bar(12), hit: bar(14), end: 30,
  };
  const beat = (t, n) => +(t + n * BEAT).toFixed(3);

  const $$ = (s) => [...document.querySelectorAll(s)];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const cues = [];
  const cue = (t, kind) => cues.push([+t.toFixed(3), kind]);

  const show = (sel, tin, tout) => {
    tl.set(sel, { visibility: 'visible' }, tin);
    if (tout != null) tl.set(sel, { visibility: 'hidden' }, tout);
  };
  const slideIn = (sel, t, from = { yPercent: 100 }) => {
    tl.fromTo(sel, from, { xPercent: 0, yPercent: 0, duration: 0.45, ease: 'power3.inOut' }, t - 0.42);
    cue(t - 0.42, 'swish');
  };
  const titleIn = (title, sub, t) => {
    tl.fromTo(title, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, t - 0.2);
    tl.fromTo(sub, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, t);
  };
  const pop = (sel, t, from = 0.5, rot = 0) =>
    tl.fromTo(sel, { scale: from, opacity: 0, rotation: rot - 8 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.5, ease: 'back.out(1.9)' }, t);
  const stamp = (sel, t, rot) => {
    tl.fromTo(sel, { scale: 2.4, opacity: 0, rotation: rot - 18 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.28, ease: 'power4.in' }, t - 0.28);
    tl.to(sel, { scale: 1.06, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.out' }, t);
    cue(t, 'stamp');
  };
  const typeOn = (sel, t, d = 0.55) =>
    tl.fromTo(sel, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: d, ease: 'none' }, t);

  // ---- 0 · hand-off: circles open from the QR cup of the original "Scan & go" shot -----------------
  tl.set('#origStart', { visibility: 'visible' }, 0);
  tl.fromTo('#wipe2', { scale: 0 }, { scale: 1, duration: 0.75, ease: 'power3.in' }, 0.08);
  tl.fromTo('#wipe', { scale: 0 }, { scale: 1, duration: 0.72, ease: 'power3.inOut' }, 0.3);
  tl.set(['#origStart', '#wipe2'], { visibility: 'hidden' }, 1.05);
  cue(0.05, 'whoosh');

  // ---- 1 · the poster: ONE CUP rises, the tagline writes itself ------------------------------------
  show('#sPoster', 0.95, T.gear + 0.1);
  tl.fromTo('#posterWrap', { y: 640 }, { y: 0, duration: 0.7, ease: 'back.out(1.25)' }, T.poster - 0.3);
  tl.fromTo('#posterWrap', { scale: 1 }, { scale: 1.035, duration: 2.0, ease: 'none', immediateRender: false }, T.poster + 0.4);
  typeOn('#tagline', beat(T.poster, 1.2), 0.6);
  cue(T.poster, 'pop');

  // ---- 2 · the gear --------------------------------------------------------------------------------
  show('#sGear', T.gear - 0.45, T.link + 0.5);
  slideIn('#sGear', T.gear);
  titleIn('#gTitle', '#gSub', T.gear);
  [['#t1', -10], ['#t2', 6], ['#t3', -6], ['#t4', 9]].forEach(([s, r], i) => {
    const t = beat(T.gear, 0.6 + i * 0.5);
    pop(s, t, 0.4, r);
    tl.to(s, { y: -12, duration: 0.8, yoyo: true, repeat: 1, ease: 'sine.inOut' }, t + 0.5);
    cue(t, 'pop');
  });
  tl.fromTo('#tLabel', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, beat(T.gear, 2.6));
  // phase B: tags shrink into the top-right corner, the carry gear comes in below
  tl.to('#tLabel', { opacity: 0, duration: 0.2 }, T.gearB - 0.3);
  tl.to('#tags', { scale: 0.5, x: 960, y: -150, duration: 0.55, ease: 'power3.inOut' }, T.gearB - 0.3);
  ['#g1', '#g2', '#g3'].forEach((s, i) => {
    const t = beat(T.gearB, 0.3 + i * 0.5);
    tl.fromTo(s, { y: 160, opacity: 0, rotation: i === 1 ? 3 : -3 }, { y: 0, opacity: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.5)' }, t);
    cue(t, 'pop');
  });
  stamp('#gStamp', beat(T.gearB, 2.4), 12);
  // out
  tl.to(['#gTitle', '#gSub', '#tags', '#g1', '#g2', '#g3', '#gStamp'], { y: -60, opacity: 0, duration: 0.35, stagger: 0.03, ease: 'power2.in' }, T.link - 0.45);

  // ---- 3 · steps 1–2: register the tag, attach it ---------------------------------------------------
  show('#sLink', T.link - 0.45, T.tap + 0.5);
  slideIn('#sLink', T.link, { xPercent: 100 });
  titleIn('#lTitle', '#lSub', T.link);
  pop('#lP1', beat(T.link, 0.4), 0.6, -2);
  tl.fromTo('#lC1', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 }, beat(T.link, 0.8));
  pop('#lP2', beat(T.link, 1.2), 0.6, 2);
  tl.fromTo('#lC2', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 }, beat(T.link, 1.6));
  cue(beat(T.link, 0.4), 'pop');
  cue(beat(T.link, 1.2), 'pop');
  tl.fromTo('#lPhone', { x: 300, opacity: 0, rotation: 6 }, { x: 0, opacity: 1, rotation: 0, duration: 0.6 }, T.link - 0.1);
  pop('#lToast', beat(T.link, 3), 0.5, -2);
  cue(beat(T.link, 3), 'ding');

  // ---- 4 · step 3: tap & check in ------------------------------------------------------------------
  show('#sTap', T.tap - 0.45, T.stack + 0.5);
  slideIn('#sTap', T.tap);
  titleIn('#pTitle', '#pSub', T.tap);
  tl.fromTo('#pP3wrap', { y: 200, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.3)' }, T.tap - 0.1);
  tl.fromTo('#pTab', { x: 300, opacity: 0, rotation: 5 }, { x: 0, opacity: 1, rotation: 0, duration: 0.6 }, T.tap + 0.05);
  tl.fromTo('#pCap', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 }, beat(T.tap, 1));
  const tTap = beat(T.tap, 3);
  tl.to('#pP3wrap', { scaleY: 0.95, scaleX: 1.03, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.out' }, tTap);
  tl.set('.wv', { opacity: 0 }, 0);
  $$('#pWaves .wv').forEach((w, i) => {
    tl.fromTo(w, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.15, ease: 'none', immediateRender: false }, tTap + i * 0.09);
    tl.to(w, { opacity: 0, duration: 0.3 }, tTap + 0.55 + i * 0.05);
    tl.fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none', immediateRender: false }, tTap + 1.0 + i * 0.07);
  });
  cue(tTap, 'nfc');
  const tOk = beat(T.tap, 4);
  tl.to('#pRes', { opacity: 1, duration: 0.15, ease: 'none' }, tOk);
  stamp('#pStamp', tOk, -12);
  pop('#pDisc', beat(tOk, 1.2), 0.5, -1);
  cue(beat(tOk, 1.2), 'tick');
  tl.to('#pWaves', { opacity: 0, duration: 0.3 }, tOk + 1.6);

  // ---- 5 · step 4: every check-in stacks a cup -------------------------------------------------------
  show('#sStack', T.stack - 0.45, T.comm + 0.5);
  slideIn('#sStack', T.stack, { xPercent: 100 });
  titleIn('#kTitle', '#kSub', T.stack);
  // reveal the board bottom-up: bottom row of cups, second row, then the cat
  tl.set('#kP4', { clipPath: 'inset(100% 0% 0% 0%)' }, 0);
  [[69, 0.5], [56, 1.0], [0, 1.6]].forEach(([top, n], i) => {
    tl.to('#kP4', { clipPath: `inset(${top}% 0% 0% 0%)`, duration: i === 2 ? 0.45 : 0.18, ease: i === 2 ? 'power2.out' : 'back.out(2)' }, beat(T.stack, n));
    cue(beat(T.stack, n), i === 2 ? 'whoosh' : 'pop');
  });
  pop('#kBubble', beat(T.stack, 3), 0.3, 0);
  tl.fromTo('#kCap', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 }, beat(T.stack, 2.4));
  tl.fromTo('#kPhone', { x: 300, opacity: 0, rotation: 6 }, { x: 0, opacity: 1, rotation: 0, duration: 0.6 }, T.stack);
  const tCel = bar(7); // 15.317, second music phrase
  tl.to('#kCele', { opacity: 1, duration: 0.15, ease: 'none' }, tCel);
  tl.to('#kPhone', { scale: 1.04, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, tCel);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  tl.set('#kConf', { opacity: 0 }, 0);
  tl.set('#kConf', { opacity: 1 }, tCel);
  $$('#kConf .conf').forEach((c) => {
    const a = rnd() * Math.PI * 2, d = 140 + rnd() * 240;
    tl.fromTo(c, { x: 0, y: 0, rotation: 0, opacity: 1, scale: 0.6 + rnd() * 0.8 },
      { x: Math.cos(a) * d, y: Math.sin(a) * d + 140, rotation: rnd() * 540 - 270, opacity: 0, duration: 1.2, ease: 'power2.out' }, tCel + rnd() * 0.1);
  });
  cue(tCel, 'chime');
  pop('#kPts', beat(tCel, 0.6), 0.5, -3);
  pop('#kStreak', beat(tCel, 1.1), 0.5, 2);
  cue(beat(tCel, 0.6), 'tick');
  cue(beat(tCel, 1.1), 'tick');

  // ---- 6 · steps 5–6: community, reward, impact --------------------------------------------------------
  show('#sComm', T.comm - 0.45, T.campus + 0.5);
  slideIn('#sComm', T.comm);
  titleIn('#cTitle', '#cSub', T.comm);
  pop('#cP5', beat(T.comm, 0.4), 0.6, -2);
  cue(beat(T.comm, 0.4), 'pop');
  tl.fromTo('#cPhone', { y: 260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, T.comm);
  pop('#cV', beat(T.comm, 1.2), 0.5, -4);
  cue(beat(T.comm, 1.2), 'pop');
  tl.fromTo('#cC5', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 }, beat(T.comm, 1.8));
  pop('#cP6', beat(T.comm, 2), 0.6, 3);
  cue(beat(T.comm, 2), 'pop');
  const tFill = bar(9); // 19.385
  pop('#cFill1', tFill, 0.2, 0);
  pop('#cFill2', beat(tFill, 0.5), 0.2, 0);
  cue(tFill, 'tick');
  cue(beat(tFill, 0.5), 'tick');
  typeOn('#cImpact', beat(tFill, 1.1), 0.6);
  tl.fromTo('#cC6', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 }, beat(tFill, 1.6));
  tl.to('#cRew', { opacity: 1, duration: 0.25, ease: 'none' }, beat(tFill, 1));

  // ---- 7 · for the campus ------------------------------------------------------------------------------
  show('#sCampus', T.campus - 0.45, T.story + 0.5);
  slideIn('#sCampus', T.campus, { xPercent: 100 });
  titleIn('#mTitle', '#mSub', T.campus);
  tl.fromTo('#mLap', { y: 160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, T.campus - 0.15);
  ['#m1', '#m2', '#m3'].forEach((s, i) => { pop(s, beat(T.campus, 1 + i * 0.5), 0.5, i % 2 ? 1.5 : -1.5); cue(beat(T.campus, 1 + i * 0.5), 'tick'); });
  tl.fromTo('#mNote', { opacity: 0 }, { opacity: 1, duration: 0.4 }, beat(T.campus, 2.8));
  tl.fromTo('#mImg', { scale: 1 }, { scale: 1.45, transformOrigin: '520px 30px', duration: 1.6, ease: 'power2.inOut', immediateRender: false }, bar(11) - 0.2);

  // ---- 8 · the story ------------------------------------------------------------------------------------
  show('#sStory', T.story - 0.45);
  tl.fromTo('#sStory', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 0.5, ease: 'power3.in' }, T.story - 0.45);
  cue(T.story - 0.45, 'whoosh');
  $$('#sQuote .word').forEach((w, i) =>
    tl.fromTo(w, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }, T.story + 0.05 + i * 0.13));
  tl.fromTo('#sLine', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5 }, bar(13));
  stamp('#sStamp', beat(bar(13), 1.5), 12);

  // ---- hand-back: white burst into the original "See your impact" shot ----------------------------------
  tl.fromTo('#whiteout', { scale: 0 }, { scale: 1, duration: 0.8, ease: 'power2.in' }, T.hit - 0.8);
  cue(T.hit - 0.8, 'riser');
  tl.fromTo('#origEnd', { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.inOut' }, T.hit + 0.05);
  tl.set({}, {}, T.end);

  window.__T = T;
  window.__cues = cues.sort((a, b) => a[0] - b[0]);
  window.__duration = T.end;
  window.__seek = (t) => { tl.seek(t, false); };
  tl.seek(0);
})();
