// One Cup pitch video (~86 s) — follows the 2-page written submission:
// problem → solution (gear + six steps) → technology → business model → impact → feasibility → close.
// Every scene change sits on a bar line of the soundtrack (118 BPM, one bar = 2.034 s). The bar grid is
// anchored on the first music splice at 34.389 s (bar 17); see render.mjs for the music edit.
(() => {
  const BEAT = 60 / 118.0, BAR = 4 * BEAT;
  const B = (k) => +(34.389 + (k - 17) * BAR).toFixed(3);
  const END = 2054 / 24; // 85.583 s
  const BREAK = 432 / 24; // 18.000 s: the music comes back in right after its silent break (measured on the edited track)
  const beat = (t, n) => +(t + n * BEAT).toFixed(3);

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const cues = [];
  const cue = (t, kind) => cues.push([+t.toFixed(3), kind]);

  // ---- helpers ------------------------------------------------------------------------------------------
  const show = (sel, tin, tout) => {
    tl.set(sel, { visibility: 'visible' }, tin);
    if (tout != null) tl.set(sel, { visibility: 'hidden' }, tout);
  };
  // a scene slides in over the 0.42 s before its bar line, alternating from below / from the right
  let flip = 0;
  const scene = (sel, t, tNext, mode) => {
    const m = mode ?? (flip++ % 2 ? 'right' : 'up');
    show(sel, m === 'cut' ? t : t - 0.45, tNext + 0.5);
    if (m === 'up') tl.fromTo(sel, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' }, t - 0.42);
    if (m === 'right') tl.fromTo(sel, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.inOut' }, t - 0.42);
    if (m !== 'cut') cue(t - 0.42, 'swish');
  };
  const fadeUp = (sel, t, d = 0.5, y = 50) => tl.fromTo(sel, { y, opacity: 0 }, { y: 0, opacity: 1, duration: d }, t);
  const titleIn = (title, sub, t) => { fadeUp(title, t - 0.2, 0.5, 60); if (sub) fadeUp(sub, t, 0.45, 30); };
  const pop = (sel, t, from = 0.5, rot = 0, sound) => {
    tl.fromTo(sel, { scale: from, opacity: 0, rotation: rot - 8 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.5, ease: 'back.out(1.9)' }, t);
    if (sound) cue(t, sound);
  };
  const stamp = (sel, t, rot = 0) => {
    tl.fromTo(sel, { scale: 2.3, opacity: 0, rotation: rot - 18 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.28, ease: 'power4.in' }, t - 0.28);
    tl.to(sel, { scale: 1.06, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.out' }, t);
    cue(t, 'stamp');
  };
  const typeOn = (sel, t, d = 0.6) =>
    tl.fromTo(sel, { clipPath: 'inset(-20% 100% -20% 0%)' }, { clipPath: 'inset(-20% 0% -20% 0%)', duration: d, ease: 'none' }, t);
  const words = (sel, t, step = 0.15) =>
    $$(`${sel} .word`).forEach((w, i) => tl.fromTo(w, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }, t + i * step));
  const count = (sel, from, to, t, d, fmt) => {
    const el = $(sel), o = { v: from };
    tl.fromTo(o, { v: from }, { v: to, duration: d, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }, t);
    cue(t, 'tick');
    cue(t + d * 0.5, 'tick');
  };
  const n0 = (v) => Math.round(v).toLocaleString('en-US');

  // ===== 01 · hook ==========================================================================================
  scene('#s01', 0, B(2), 'cut');
  tl.fromTo('#h1cup', { y: -760, rotation: -8 }, { y: 0, rotation: 0, duration: 0.65, ease: 'back.out(1.3)' }, 0.1);
  cue(0.7, 'pop');
  words('#h1q', 0.35, 0.17);
  typeOn('#h1c', 1.75, 0.8);
  tl.to('#h1cup', { rotation: 22, duration: 0.25, ease: 'power1.inOut' }, 2.95);
  tl.to('#h1cup', { y: 1000, rotation: 75, duration: 0.6, ease: 'power2.in' }, 3.2);
  cue(3.2, 'whoosh');

  // ===== 02 · 3.1 million tonnes ================================================================================
  scene('#s02', B(2), B(4));
  $$('#rain .drop').forEach((d, i) => {
    const t = B(2) - 0.3 + (i % 5) * 0.32 + Math.floor(i / 5) * 0.16;
    tl.fromTo(d, { y: 0, rotation: (i % 2 ? -1 : 1) * 10 }, { y: 1500, rotation: (i % 2 ? 1 : -1) * 40, duration: 3.2, ease: 'none' }, t);
  });
  fadeUp('#s2a', B(2) + 0.05, 0.45, 30);
  pop('#s2n', B(2) + 0.35, 0.8, 0);
  count('#s2num', 0, 3.1, B(2) + 0.35, 1.1, (v) => v.toFixed(1));
  fadeUp('#s2b', B(2) + 1.15, 0.45, 30);
  fadeUp('#s2c', B(2) + 1.75, 0.45, 20);

  // ===== 03 · it's just a hassle =================================================================================
  scene('#s03', B(4), B(6));
  fadeUp('#s3a', B(4) - 0.15, 0.5, 60);
  typeOn('#s3b', B(4) + 0.5, 0.6);
  ['#s3c1', '#s3c2', '#s3c3'].forEach((c, i) => pop(c, beat(B(4), 2 + i), 0.5, i === 1 ? 1.5 : -1.5, 'pop'));
  ['#s3x1', '#s3x2', '#s3x3'].forEach((x, i) =>
    tl.fromTo(x, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power4.in' }, beat(B(4), 2.5 + i)));

  // ===== 04 · 2030 ==================================================================================================
  scene('#s04', B(6), BREAK);
  fadeUp('#s4a', B(6) + 0.05, 0.45, 20);
  stamp('#s4n', beat(B(6), 1.2), 0);
  typeOn('#s4b', beat(B(6), 2.2), 0.9);
  fadeUp('#s4c', 14.85, 0.5, 60); // with the voice-over: "Campuses need a habit that sticks"
  pop('#s4d', 16.25, 0.5, -2, 'pop');
  tl.to(['#s4a', '#s4n', '#s4b', '#s4c', '#s4d'], { y: 90, opacity: 0, duration: 0.3, stagger: 0.03, ease: 'power2.in' }, BREAK - 0.42);

  // ===== 05 · meet ONE CUP (on the musical break) =========================================================================
  scene('#s05', BREAK, B(11), 'cut');
  tl.fromTo('#posterWrap', { y: 660 }, { y: 0, duration: 0.7, ease: 'back.out(1.25)' }, BREAK);
  tl.fromTo('#posterWrap', { scale: 1 }, { scale: 1.035, duration: 3.4, ease: 'none', immediateRender: false }, BREAK + 0.7);
  typeOn('#tagline', beat(B(9), 1.6), 0.7);
  cue(BREAK + 0.05, 'whoosh');

  // ===== 06 · pick your tag =======================================================================================
  scene('#s06', B(11), B(13));
  titleIn('#gTitle', '#gSub', B(11));
  [['#t1', -10], ['#t2', 6], ['#t3', -6], ['#t4', 9]].forEach(([s, r], i) => {
    const t = beat(B(11), 0.4 + i * 0.45);
    pop(s, t, 0.4, r, 'pop');
    tl.to(s, { y: -12, duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, t + 0.5);
  });
  fadeUp('#tLabel', beat(B(11), 2.3), 0.35, 20);
  tl.to('#tLabel', { opacity: 0, duration: 0.2 }, B(12) - 0.3);
  tl.to('#tags', { scale: 0.5, x: 960, y: -150, duration: 0.55, ease: 'power3.inOut' }, B(12) - 0.3);
  ['#g1', '#g2', '#g3'].forEach((s, i) => {
    const t = beat(B(12), 0.25 + i * 0.45);
    tl.fromTo(s, { y: 160, opacity: 0, rotation: i === 1 ? 3 : -3 }, { y: 0, opacity: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.5)' }, t);
    cue(t, 'pop');
  });
  stamp('#gStamp', beat(B(12), 2.3), 12);

  // ===== 07 · steps 1–2 ================================================================================================
  scene('#s07', B(13), B(15));
  titleIn('#lTitle', '#lSub', B(13));
  pop('#lP1', beat(B(13), 0.4), 0.6, -2, 'pop');
  fadeUp('#lC1', beat(B(13), 0.8), 0.35, 16);
  pop('#lP2', beat(B(13), 1.2), 0.6, 2, 'pop');
  fadeUp('#lC2', beat(B(13), 1.6), 0.35, 16);
  tl.fromTo('#lPhone', { x: 300, opacity: 0, rotation: 6 }, { x: 0, opacity: 1, rotation: 0, duration: 0.6 }, B(13) - 0.1);
  pop('#lToast', beat(B(13), 3), 0.5, -2, 'ding');

  // ===== 08 · step 3: tap & check in ==========================================================================================
  scene('#s08', B(15), B(17));
  titleIn('#pTitle', '#pSub', B(15));
  tl.fromTo('#pP3wrap', { y: 200, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.3)' }, B(15) - 0.1);
  tl.fromTo('#pTab', { x: 300, opacity: 0, rotation: 5 }, { x: 0, opacity: 1, rotation: 0, duration: 0.6 }, B(15) + 0.05);
  const tTap = beat(B(15), 2.5);
  tl.to('#pP3wrap', { scaleY: 0.95, scaleX: 1.03, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.out' }, tTap);
  tl.set('.wv', { opacity: 0 }, 0);
  $$('#pWaves .wv').forEach((w, i) => {
    tl.fromTo(w, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.15, ease: 'none', immediateRender: false }, tTap + i * 0.09);
    tl.to(w, { opacity: 0, duration: 0.3 }, tTap + 0.7 + i * 0.05);
  });
  cue(tTap, 'nfc');
  const tOk = B(16);
  tl.to('#pRes', { opacity: 1, duration: 0.15, ease: 'none' }, tOk);
  stamp('#pStamp', tOk, -12);
  fadeUp('#pCap', beat(tOk, 0.6), 0.35, 16);
  pop('#pDisc', beat(tOk, 1.2), 0.5, -1, 'tick');

  // ===== 09 · step 4: stack your cups ==========================================================================================
  scene('#s09', B(17), B(19));
  titleIn('#kTitle', '#kSub', B(17));
  tl.set('#kP4', { clipPath: 'inset(100% 0% 0% 0%)' }, 0);
  [[69, 0.5], [56, 1.0], [0, 1.6]].forEach(([top, n], i) => {
    tl.to('#kP4', { clipPath: `inset(${top}% 0% 0% 0%)`, duration: i === 2 ? 0.45 : 0.18, ease: i === 2 ? 'power2.out' : 'back.out(2)' }, beat(B(17), n));
    cue(beat(B(17), n), i === 2 ? 'whoosh' : 'pop');
  });
  pop('#kBubble', beat(B(17), 3), 0.3, 0);
  fadeUp('#kCap', beat(B(17), 2.4), 0.35, 16);
  tl.fromTo('#kPhone', { x: 300, opacity: 0, rotation: 6 }, { x: 0, opacity: 1, rotation: 0, duration: 0.6 }, B(17));
  const tCel = B(18);
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
  pop('#kPts', beat(tCel, 0.6), 0.5, -3, 'tick');
  pop('#kStreak', beat(tCel, 1.1), 0.5, 2, 'tick');

  // ===== 10 · steps 5–6 ===================================================================================================
  scene('#s10', B(19), B(21));
  titleIn('#cTitle', '#cSub', B(19));
  pop('#cP5', beat(B(19), 0.4), 0.6, -2, 'pop');
  tl.fromTo('#cPhone', { y: 260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, B(19));
  pop('#cV', beat(B(19), 1.2), 0.5, -4, 'pop');
  fadeUp('#cC5', beat(B(19), 1.8), 0.35, 16);
  pop('#cP6', beat(B(19), 2), 0.6, 3, 'pop');
  pop('#cFill1', B(20), 0.2, 0, 'tick');
  pop('#cFill2', beat(B(20), 0.5), 0.2, 0, 'tick');
  typeOn('#cImpact', beat(B(20), 1.1), 0.6);
  fadeUp('#cC6', beat(B(20), 1.6), 0.35, 16);
  tl.to('#cRew', { opacity: 1, duration: 0.25, ease: 'none' }, beat(B(20), 1));

  // ===== 11 · verified, not guessed =========================================================================================
  scene('#s11', B(21), B(23));
  titleIn('#vTitle', '#vSub', B(21));
  ['#v1', '#v2', '#v3'].forEach((c, i) => pop(c, beat(B(21), 0.6 + i * 0.7), 0.6, i === 1 ? 1 : -1, 'pop'));
  pop('#vChip', beat(B(22), 0.9), 0.5, -1, 'tick');

  // ===== 12 · proof, not promises ===========================================================================================
  scene('#s12', B(23), B(25));
  titleIn('#mTitle', '#mSub', B(23));
  tl.fromTo('#mLap', { y: 160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, B(23) - 0.15);
  ['#m1', '#m2', '#m3'].forEach((s, i) => pop(s, beat(B(23), 1 + i * 0.5), 0.5, i % 2 ? 1.5 : -1.5, 'tick'));
  tl.fromTo('#mNote', { opacity: 0 }, { opacity: 1, duration: 0.4 }, beat(B(23), 2.8));
  tl.fromTo('#mImg', { scale: 1 }, { scale: 1.45, transformOrigin: '520px 30px', duration: 1.6, ease: 'power2.inOut', immediateRender: false }, B(24) - 0.2);

  // ===== 13 · who pays ========================================================================================================
  scene('#s13', B(25), B(27));
  titleIn('#bTitle', '#bSub', B(25));
  ['#b1', '#b2', '#b3'].forEach((c, i) => pop(c, beat(B(25), 0.7 + i * 0.8), 0.6, i === 1 ? 1 : -1, 'pop'));

  // ===== 14 · market & edge ====================================================================================================
  scene('#s14', B(27), B(29));
  pop('#kN', B(27) + 0.05, 0.8, 0);
  count('#kNum', 0, 550000, B(27) + 0.05, 1.1, n0);
  fadeUp('#kL', B(27) + 0.8, 0.45, 24);
  pop('#kA', B(28) - 0.1, 0.6, -1, 'pop');
  tl.fromTo('#kAx', { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power4.in' }, beat(B(28), 0.8));
  cue(beat(B(28), 0.8) + 0.2, 'stamp');
  pop('#kB', beat(B(28), 1.5), 0.6, 1, 'ding');

  // ===== 15 · small habit, real numbers =========================================================================================
  scene('#s15', B(29), B(31));
  fadeUp('#iTitle', B(29) - 0.2, 0.5, 60);
  ['#i1', '#ix1', '#i2', '#ix2', '#i3'].forEach((s, i) => pop(s, B(29) - 0.05 + i * 0.2, 0.5, 0, i % 2 ? null : 'pop'));
  pop('#iEq', B(29) + 1.0, 0.8, 0);
  count('#iNum', 0, 150000, B(29) + 1.0, 0.7, n0);
  typeOn('#iRes', B(29) + 1.65, 0.6);
  fadeUp('#iFoot', B(29) + 2.2, 0.4, 10);

  // ===== 16 · from awareness to habit =========================================================================================
  scene('#s16', B(31), B(33));
  titleIn('#aTitle', '#aSub', B(31));
  $$('#aHero .cc').forEach((g, i) => {
    tl.fromTo(g, { y: 260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, beat(B(31), 0.3 + i * 0.4));
    cue(beat(B(31), 0.3 + i * 0.4), 'pop');
  });
  ['#a1', '#a2', '#a3', '#a4'].forEach((s, i) => pop(s, beat(B(31), 1.4 + i * 0.6), 0.5, i % 2 ? 1 : -1, 'tick'));

  // ===== 17 · the MVP already works =============================================================================================
  scene('#s17', B(33), B(35));
  titleIn('#fTitle', '#fSub', B(33));
  tl.fromTo('#fLapWrap', { y: 160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, B(33) - 0.1);
  tl.fromTo('#fTabWrap', { y: 160, opacity: 0, rotation: -4 }, { y: 0, opacity: 1, rotation: -3, duration: 0.6 }, B(33) + 0.15);
  tl.fromTo('#fPhWrap', { y: 160, opacity: 0, rotation: 4 }, { y: 0, opacity: 1, rotation: 3, duration: 0.6 }, B(33) + 0.3);
  ['#f1', '#f2', '#f3', '#f4'].forEach((s, i) => pop(s, beat(B(33), 1.4 + i * 0.6), 0.5, i % 2 ? 1 : -1, 'tick'));

  // ===== 18 · roadmap ===============================================================================================================
  scene('#s18', B(35), B(38));
  titleIn('#rTitle', '#rSub', B(35));
  typeOn('#rPath', B(35) + 0.3, 3.6);
  ['#r1', '#r2', '#r3', '#r4', '#r5'].forEach((s, i) => pop(s, B(35) + 0.45 + i * 0.8, 0.5, 0, i === 2 ? 'ding' : 'pop'));

  // ===== 19 · your bottle is a relationship ============================================================================================
  scene('#s19', B(38), B(40));
  tl.fromTo('#zHero', { y: 260, opacity: 0, rotation: -6 }, { y: 0, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.5)' }, B(38) - 0.15);
  $$('#zHearts .ht').forEach((h, i) => {
    tl.fromTo(h, { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.4)' }, beat(B(38), 1 + i * 0.5));
    cue(beat(B(38), 1 + i * 0.5), 'pop');
  });
  words('#zQ', B(38) + 0.3, 0.2);
  typeOn('#zL', beat(B(38), 3.2), 0.9);
  tl.to('#zHero', { rotation: -4, y: -10, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, B(39) + 0.6);

  // ===== 20 · end card on the drop ========================================================================================================
  tl.fromTo('#flash', { scale: 0, opacity: 1 }, { scale: 1, duration: 0.5, ease: 'power2.in' }, B(40) - 0.5);
  cue(B(40) - 0.8, 'riser');
  scene('#s20', B(40), END, 'cut');
  tl.to('#flash', { opacity: 0, duration: 0.3, ease: 'none' }, B(40));
  stamp('#eLogo', B(40) + 0.2, 0);
  typeOn('#eTag', B(40) + 0.75, 0.7);
  fadeUp('#eLine', B(40) + 1.6, 0.45, 16);
  ['#e1', '#e2', '#e3', '#e4'].forEach((s, i) => pop(s, B(40) + 0.35 + i * 0.15, 0.4, [-10, 9, -6, 8][i], i === 0 ? 'pop' : null));
  tl.set({}, {}, END);

  window.__cues = cues.sort((a, b) => a[0] - b[0]);
  window.__duration = END;
  window.__seek = (t) => { tl.seek(t, false); };
  tl.seek(0);
})();
