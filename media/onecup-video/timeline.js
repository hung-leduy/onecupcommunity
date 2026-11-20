// One Cup pitch video (~86 s), explainer cut: one idea per scene, one short headline, a slow voice-over.
//   A problem → B why students don't bring a cup → C meet One Cup: TAG → TAP → REWARD →
//   D–G the four steps of the system (a tracker at the bottom shows where we are) →
//   H who pays → I impact → J it already works → K end card.
// Scene changes sit on bar lines of the soundtrack (118 BPM, one bar = 2.034 s; grid anchored on the music
// splice at 34.389 s = bar 17). Inside a scene, pictures follow the voice-over: window.VO (vo-timing.js,
// written by voiceover.py) gives the start of every sentence; offsets inside a sentence were measured on the
// voice track (word timestamps) and are noted next to each cue.
(() => {
  const BEAT = 60 / 118.0, BAR = 4 * BEAT;
  const B = (k) => +(34.389 + (k - 17) * BAR).toFixed(3);
  const END = 2054 / 24; // 85.583 s
  const BREAK = 432 / 24; // 18.000 s: the music comes back in right after its silent break
  const VO = window.VO;
  const v = (scene, i, off = 0) => +(VO[scene].s[i] + off).toFixed(3);

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const cues = [];
  const cue = (t, kind) => cues.push([+t.toFixed(3), kind]);

  const show = (sel, tin, tout) => {
    tl.set(sel, { visibility: 'visible' }, tin);
    if (tout != null) tl.set(sel, { visibility: 'hidden' }, tout);
  };
  let flip = 0;
  const scene = (sel, t, tNext, mode) => {
    const m = mode ?? (flip++ % 2 ? 'right' : 'up');
    show(sel, m === 'cut' ? t : t - 0.45, tNext + 0.5);
    if (m === 'up') tl.fromTo(sel, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' }, t - 0.42);
    if (m === 'right') tl.fromTo(sel, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.inOut' }, t - 0.42);
    if (m !== 'cut') cue(t - 0.42, 'swish');
  };
  const fadeUp = (sel, t, d = 0.5, y = 50) => tl.fromTo(sel, { y, opacity: 0 }, { y: 0, opacity: 1, duration: d }, t);
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
  const count = (sel, from, to, t, d, fmt) => {
    const el = $(sel), o = { v: from };
    tl.fromTo(o, { v: from }, { v: to, duration: d, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }, t);
    cue(t, 'tick');
  };
  // tracker: step n becomes active at t (earlier steps turn "done")
  const step = (n, t) => {
    for (let i = 1; i <= 4; i++) {
      const on = i === n, done = i < n;
      tl.set(`#tk${i}`, { backgroundColor: on ? '#ec7d35' : done ? '#e4ddcd' : '#fffdf8', color: on || done ? '#252429' : '#8a8377', scale: on ? 1.12 : 1 }, t);
      tl.set(`#tk${i} i`, { backgroundColor: on ? '#fffdf8' : '#e4ddcd' }, t);
    }
    tl.fromTo(`#tk${n}`, { scale: 1.3 }, { scale: 1.12, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, t);
  };

  // ===== A · ten minutes, then the bin ==========================================================================
  scene('#sA', 0, v('A', 1, -0.4), 'cut');
  tl.fromTo('#aCup', { y: -760, rotation: -8 }, { y: 0, rotation: 0, duration: 0.65, ease: 'back.out(1.3)' }, 0.1);
  cue(0.7, 'pop');
  pop('#aClock', v('A', 0, 2.7), 0.4, -4, 'tick'); // "ten minutes" +2.8
  tl.fromTo('#aBin', { y: 650, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }, v('A', 0, 2.9));
  // "then the bin" +3.8–4.1: the cup arcs into the bin (it passes behind the bin's front)
  const tBin = v('A', 0, 3.3);
  tl.to('#aClock', { opacity: 0, scale: 0.6, duration: 0.2 }, tBin);
  tl.to('#aCup', { x: 590, duration: 0.8, ease: 'none' }, tBin);
  tl.to('#aCup', { y: -180, rotation: 60, duration: 0.4, ease: 'power2.out' }, tBin);
  tl.to('#aCup', { y: 190, rotation: 160, scale: 0.5, duration: 0.4, ease: 'power2.in' }, tBin + 0.4);
  tl.to('#aBin', { rotation: 4, duration: 0.08, yoyo: true, repeat: 3, ease: 'sine.inOut', transformOrigin: '50% 100%' }, tBin + 0.8);
  cue(tBin + 0.8, 'stamp');
  // the number: "Vietnam dumps over three million tonnes…"
  scene('#sA2', v('A', 1, -0.4) + 0.42, B(5), 'up');
  $$('#rain .drop').forEach((d, i) => {
    const t = v('A', 1, -0.6) + (i % 5) * 0.4 + Math.floor(i / 5) * 0.2;
    tl.fromTo(d, { y: 0, rotation: (i % 2 ? -1 : 1) * 10 }, { y: 1500, rotation: (i % 2 ? 1 : -1) * 40, duration: 4.4, ease: 'none' }, t);
  });
  pop('#a2n', v('A', 1, 0.9), 0.8, 0);
  count('#a2num', 0, 3.1, v('A', 1, 0.9), 1.1, (x) => x.toFixed(1)); // "three million" +1.2
  fadeUp('#a2l', v('A', 1, 2.3), 0.5, 30); // "of plastic every year" +2.3
  fadeUp('#a2s', v('A', 1, 2.8), 0.4, 10);

  // ===== B · why bother? ===========================================================================================
  scene('#sB', B(5), BREAK);
  tl.fromTo('#bBottle', { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' }, v('B', 0, -0.1));
  cue(v('B', 0), 'pop');
  stamp('#bHl', v('B', 1, 0.15)); // "why bring it?"
  pop('#bQ', v('B', 1, 0.5), 0.3, 10);
  tl.to('#bBottle', { rotation: -6, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut', transformOrigin: '50% 100%' }, v('B', 1, 0.3));
  pop('#bC1', v('B', 2, 0.35), 0.5, -1, 'pop'); // "no reward" +0.3
  pop('#bC2', v('B', 2, 1.5), 0.5, 1, 'pop'); // "no proof it matters" +1.5
  tl.to(['#bHl', '#bQ', '#bC1', '#bC2', '#bBottle'], { y: 90, opacity: 0, duration: 0.3, stagger: 0.03, ease: 'power2.in' }, BREAK - 0.42);

  // ===== C · meet One Cup (on the musical break), then the idea: TAG → TAP → REWARD ===============================
  scene('#sC', BREAK, v('C', 1, -0.45), 'cut');
  tl.fromTo('#posterWrap', { y: 660 }, { y: 0, duration: 0.7, ease: 'back.out(1.25)' }, BREAK);
  typeOn('#tagline', BREAK + 0.9, 0.6);
  cue(BREAK + 0.05, 'whoosh');
  scene('#sC2', v('C', 1, -0.45) + 0.42, B(13), 'right');
  pop('#o1', v('C', 1), 0.5, 0, 'pop'); // "Tag your cup."
  tl.fromTo('#oA1', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.35 }, v('C', 2, -0.35));
  pop('#o2', v('C', 2), 0.5, 0, 'pop'); // "Tap it at the counter."
  tl.fromTo('#oA2', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.35 }, v('C', 3, -0.35));
  pop('#o3', v('C', 3), 0.5, 0, 'ding'); // "Get rewarded."

  // ===== the four steps; the tracker stays at the bottom ===========================================================
  tl.fromTo('#track', { y: 160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, B(13) - 0.2);
  tl.to('#track', { y: 160, opacity: 0, duration: 0.35, ease: 'power2.in' }, B(29) - 0.45);

  // ===== D · step 1: tag your cup ===================================================================================
  scene('#sD', B(13), B(17));
  step(1, B(13) - 0.1);
  fadeUp('#dHl', B(13) - 0.2, 0.5, 60);
  tl.fromTo('#dBottle', { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' }, B(13));
  [['#dT1', -10], ['#dT2', 6], ['#dT3', 8]].forEach(([s, r], i) => pop(s, v('D', 0, 0.3 + i * 0.25), 0.4, r, i === 1 ? 'pop' : null));
  // "stick a One Cup tag on any cup you own" (+1.2–3.0): the One Cup tag flies onto the bottle
  const tStick = v('D', 0, 1.9);
  tl.to(['#dT1', '#dT3'], { opacity: 0.35, scale: 0.85, duration: 0.3 }, tStick);
  tl.to('#dT2', { x: -645, y: 212, scale: 0.55, rotation: 0, duration: 0.6, ease: 'power3.inOut' }, tStick);
  tl.to('#dBottle', { scaleY: 0.96, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: '50% 100%' }, tStick + 0.6);
  cue(tStick + 0.6, 'stamp');
  // "Scan it with your phone, and it's yours."
  tl.fromTo('#dPhone', { x: 340, opacity: 0, rotation: 6 }, { x: 0, opacity: 1, rotation: -4, duration: 0.55 }, v('D', 1, -0.3));
  tl.set('#dRip', { opacity: 1 }, v('D', 1, 0.5));
  $$('#dRip .ripple').forEach((r, i) =>
    tl.fromTo(r, { scale: 0.4, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.9, ease: 'power2.out' }, v('D', 1, 0.5 + i * 0.18)));
  cue(v('D', 1, 0.5), 'nfc');
  pop('#dOk', v('D', 1, 1.8), 0.5, -2, 'ding'); // "it's yours" +1.8

  // ===== E · step 2: tap at the counter ===============================================================================
  scene('#sE', B(17), B(21));
  step(2, B(17) - 0.1);
  fadeUp('#eHl', B(17) - 0.2, 0.5, 60);
  tl.fromTo('#eP3', { y: 220, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.3)' }, B(17));
  tl.fromTo('#eTab', { x: 320, opacity: 0, rotation: 5 }, { x: 0, opacity: 1, rotation: 0, duration: 0.6 }, B(17) + 0.15);
  const tTap = v('E', 0, 2.1); // "tap your cup on the reader"
  tl.to('#eP3', { scaleY: 0.95, scaleX: 1.03, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.out' }, tTap);
  tl.set('#eWaves .wv', { opacity: 0 }, 0);
  $$('#eWaves .wv').forEach((w, i) => {
    tl.fromTo(w, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.15, ease: 'none', immediateRender: false }, tTap + i * 0.1);
    tl.to(w, { opacity: 0, duration: 0.3 }, tTap + 1.4 + i * 0.05);
  });
  cue(tTap, 'nfc');
  tl.to('#eRes', { opacity: 1, duration: 0.15, ease: 'none' }, v('E', 1, 1.2)); // "checked in" +1.3
  stamp('#eStamp', v('E', 1, 1.3), -12);
  pop('#eDisc', v('E', 1, 2.1), 0.5, -2, 'tick'); // "with a discount" +1.8–2.1

  // ===== F · step 3: get rewarded ========================================================================================
  scene('#sF', B(21), B(25));
  step(3, B(21) - 0.1);
  fadeUp('#fHl', B(21) - 0.2, 0.5, 60);
  tl.fromTo('#fPhone', { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, B(21));
  const tCel = v('F', 0, 1.1);
  tl.to('#fCele', { opacity: 1, duration: 0.15, ease: 'none' }, tCel);
  tl.to('#fPhone', { scale: 1.04, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, tCel);
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
  pop('#f1', v('F', 0, 2.0), 0.5, -2, 'tick'); // "points" +2.0
  pop('#f2', v('F', 0, 2.6), 0.5, 1.5, 'tick'); // "streak" +2.7
  pop('#f3', v('F', 0, 3.6), 0.5, -1, 'tick'); // "the plastic you saved" +3.5
  pop('#fV', v('F', 1, 0.6), 0.5, -4, 'ding'); // "Points become free drinks."

  // ===== G · step 4: every cup counts =====================================================================================
  scene('#sG', B(25), B(29));
  step(4, B(25) - 0.1);
  fadeUp('#gHl', B(25) - 0.2, 0.5, 60);
  tl.fromTo('#gTabW', { x: -200, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, B(25));
  tl.fromTo('#gCloud', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' }, v('G', 0, 0.7));
  tl.fromTo('#gLines', { opacity: 0 }, { opacity: 1, duration: 0.3 }, v('G', 0, 0.8));
  tl.fromTo('#gLines g', { strokeDashoffset: 0 }, { strokeDashoffset: -240, duration: 6, ease: 'none' }, v('G', 0, 0.8));
  const sec = $('#sG');
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div'); d.className = 'dot'; sec.appendChild(d);
    const t = v('G', 0, 1.3 + i * 0.9);
    tl.fromTo(d, { left: 520, top: 600, opacity: 0 }, { left: 740, opacity: 1, duration: 0.45, ease: 'power1.inOut' }, t);
    tl.to(d, { opacity: 0, duration: 0.1 }, t + 0.45);
  }
  pop('#gv1', v('G', 0, 2.0), 0.6, 0, 'tick'); // "verified" +2.0
  pop('#gv2', v('G', 0, 3.1), 0.6, 0, 'tick'); // "counted only once" +3.1
  // "So the campus sees exactly how much plastic it saves."
  tl.fromTo('#gLapW', { x: 220, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, v('G', 1, 0));
  tl.fromTo('#gLapL', { opacity: 0 }, { opacity: 1, duration: 0.4 }, v('G', 1, 0.3));
  for (let i = 0; i < 2; i++) {
    const d = document.createElement('div'); d.className = 'dot'; sec.appendChild(d);
    const t = v('G', 1, 0.4 + i * 0.8);
    tl.fromTo(d, { left: 1180, top: 600, opacity: 0 }, { left: 1370, opacity: 1, duration: 0.45, ease: 'power1.inOut' }, t);
    tl.to(d, { opacity: 0, duration: 0.1 }, t + 0.45);
  }
  tl.fromTo('#gLapW', { scale: 1 }, { scale: 1.12, duration: 1.6, ease: 'power2.inOut', transformOrigin: '50% 40%', immediateRender: false }, v('G', 1, 0.9));

  // ===== H · who pays ========================================================================================================
  scene('#sH', B(29), B(33));
  stamp('#hHl', v('H', 0, 0.2));
  pop('#h1', v('H', 1, -0.1), 0.6, -1, 'pop'); // "Canteens subscribe…"
  pop('#h2', v('H', 2, -0.1), 0.6, 1, 'pop'); // "Brands sponsor rewards."
  pop('#h3', v('H', 3, -0.1), 0.6, -1, 'pop'); // "Students buy tags."

  // ===== I · impact ===========================================================================================================
  scene('#sI', B(33), B(37));
  typeOn('#iL1', v('I', 0, 0), 1.3); // "If one in ten new students joins"
  pop('#iN', v('I', 0, 2.7), 0.8, 0);
  count('#iNum', 0, 8, v('I', 0, 2.7), 0.7, (x) => Math.round(x)); // "eight million" +2.8
  typeOn('#iL2', v('I', 0, 3.4), 0.9); // "fewer plastic cups, every year" +3.5
  $$('#aHero .cc').forEach((g, i) => {
    tl.fromTo(g, { y: 260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, v('I', 0, 0.4 + i * 0.45));
    cue(v('I', 0, 0.4 + i * 0.45), 'pop');
  });
  fadeUp('#iFoot', v('I', 0, 4.8), 0.4, 10);

  // ===== J · it already works ===================================================================================================
  scene('#sJ', B(37), B(40));
  stamp('#jHl', v('J', 0, 0.9)); // "And it already works."
  tl.fromTo('#jLapW', { y: 200, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, B(37) - 0.1);
  tl.fromTo('#jTabW', { y: 200, opacity: 0, rotation: -4 }, { y: 0, opacity: 1, rotation: -3, duration: 0.6 }, B(37) + 0.1);
  tl.fromTo('#jPhW', { y: 200, opacity: 0, rotation: 4 }, { y: 0, opacity: 1, rotation: 3, duration: 0.6 }, B(37) + 0.25);
  typeOn('#jWhere', v('J', 1, 0.75), 1.6); // "campus, café or office" +0.8–2.3

  // ===== K · end card on the drop ================================================================================================
  tl.fromTo('#flash', { scale: 0, opacity: 1 }, { scale: 1, duration: 0.5, ease: 'power2.in' }, B(40) - 0.5);
  cue(B(40) - 0.8, 'riser');
  scene('#sK', B(40), END, 'cut');
  tl.to('#flash', { opacity: 0, duration: 0.3, ease: 'none' }, B(40));
  stamp('#eLogo', B(40) + 0.2, 0);
  typeOn('#eTag', v('K', 1, -0.1), 0.7); // "Your cup, no drama."
  fadeUp('#eLine', v('K', 1, 0.9), 0.45, 16);
  ['#e1', '#e2', '#e3', '#e4'].forEach((s, i) => pop(s, B(40) + 0.35 + i * 0.15, 0.4, [-6, 5, -3, 7][i], i === 0 ? 'pop' : null));
  tl.set({}, {}, END);

  window.__cues = cues.sort((a, b) => a[0] - b[0]);
  window.__duration = END;
  window.__seek = (t) => { tl.seek(t, false); };
  tl.seek(0);
})();
