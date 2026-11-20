// 30-second "How One Cup works" timeline. Times are seconds inside the segment.
// Scene changes sit on the bar lines of the soundtrack (118 BPM, one bar = 2.034 s);
// the bar grid is anchored on the first music splice at 7.181 s (see render.mjs).
(() => {
  const BEAT = 60 / 118.0, BAR = 4 * BEAT;
  const bar = (k) => +(7.181 + (k - 3) * BAR).toFixed(3); // bar(3) = 7.181
  const T = {
    title: bar(0), gear: bar(1), link: bar(3), tap: bar(4), flow: bar(6),
    earn: bar(8), campus: bar(10), loop: bar(12), hit: bar(14), end: 30,
  };
  const beat = (t, n) => +(t + n * BEAT).toFixed(3);

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const cues = []; // sound cues for render.mjs: [time, kind]
  const cue = (t, kind) => cues.push([+t.toFixed(3), kind]);

  const show = (sel, tin, tout) => {
    tl.set(sel, { visibility: 'visible' }, tin);
    if (tout != null) tl.set(sel, { visibility: 'hidden' }, tout);
  };
  const headIn = (sel, t) =>
    tl.fromTo(sel, { x: -70, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55 }, t);
  const pop = (sel, t, from = 0.55) =>
    tl.fromTo(sel, { scale: from, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.8)' }, t);
  const stepOn = (n, t) => {
    tl.set(`#progress .st[data-s="${n}"]`, { color: '#2b2e35' }, t);
    tl.set(`#progress .st[data-s="${n}"] i`, { backgroundColor: '#ff7b0f', color: '#ffffff', scale: 1.15 }, t);
    tl.to(`#progress .st[data-s="${n}"] i`, { scale: 1, duration: 0.3 }, t + 0.01);
  };

  // ---- 0 · hand-off: orange circle opens from the QR cup of the original shot ----------------
  tl.set('#origStart', { visibility: 'visible' }, 0);
  tl.fromTo('#wipe2', { scale: 0 }, { scale: 1, duration: 0.75, ease: 'power3.in' }, 0.08);
  tl.fromTo('#wipe', { scale: 0 }, { scale: 1, duration: 0.72, ease: 'power3.inOut' }, 0.3);
  tl.set(['#origStart', '#wipe2'], { visibility: 'hidden' }, 1.05);
  cue(0.05, 'whoosh');

  // ---- 1 · title -----------------------------------------------------------------------------
  show('#sTitle', 1.0, T.gear + 0.1);
  tl.fromTo('#tIcon', { scale: 0, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)' }, T.title);
  tl.fromTo('#tKicker', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, T.title + 0.15);
  tl.fromTo('#tTitle', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, T.title + 0.25);
  tl.fromTo('#tSub', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, beat(T.title, 1));
  tl.to('#tIcon', { y: -10, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, T.title + 0.7);
  cue(T.title, 'pop');

  // ---- 2 · the gear ----------------------------------------------------------------------------
  show('#sGear', 2.7, T.link + 0.6);
  tl.fromTo('#sGear', { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' }, T.gear - 0.4);
  cue(T.gear - 0.4, 'swish');
  headIn('#gHead', T.gear - 0.2);
  tl.fromTo('#progress', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, T.gear + 0.1);
  stepOn(1, T.gear + 0.1);
  ['#c1', '#c2', '#c3', '#c4'].forEach((c, i) => {
    const t = beat(T.gear, 0.5 + i);
    tl.fromTo(c, { y: 140, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.4)' }, t);
    tl.fromTo(`${c} .art svg`, { y: 0 }, { y: -12, duration: 0.9, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, t + 0.5);
    cue(t, 'pop');
  });
  tl.fromTo('#gNote', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, beat(T.gear, 4.6));
  // out: cards 2–4 drop away, card 1 hands its cup to the next scene
  tl.to(['#c2', '#c3', '#c4'], { y: 160, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.in' }, T.link - 0.45);
  tl.to(['#gHead', '#gNote'], { opacity: 0, x: -40, duration: 0.3, ease: 'power2.in' }, T.link - 0.4);
  tl.to('#c1', { opacity: 0, duration: 0.25 }, T.link - 0.2);

  // ---- 3 · link it in the app --------------------------------------------------------------------
  show('#sLink', T.link - 0.2, T.tap + 0.45);
  tl.fromTo('#lCup', { x: 149 - 640, y: 329 - 420 }, { x: 0, y: 0, duration: 0.6, ease: 'power3.inOut' }, T.link - 0.2);
  headIn('#lHead', T.link);
  stepOn(2, T.link);
  tl.fromTo('#lPhone', { x: 320, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, T.link + 0.05);
  tl.fromTo('#lScan', { scale: 1.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 }, beat(T.link, 1.1));
  tl.fromTo('#lBeam', { y: 0 }, { y: 144, duration: 0.33, yoyo: true, repeat: 1, ease: 'sine.inOut' }, beat(T.link, 1.4));
  cue(beat(T.link, 1.4), 'scan');
  pop('#lToast', beat(T.link, 3));
  cue(beat(T.link, 3), 'ding');
  tl.to('#lScan', { opacity: 0, duration: 0.2 }, beat(T.link, 3));

  // ---- 4 · tap at the counter ----------------------------------------------------------------------
  show('#sTap', T.tap - 0.3, T.flow + 0.05);
  tl.fromTo('#sTap', { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.inOut' }, T.tap - 0.3);
  cue(T.tap - 0.3, 'swish');
  headIn('#pHead', T.tap - 0.15);
  stepOn(3, T.tap);
  tl.fromTo('#pTab', { x: 220, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, T.tap - 0.1);
  tl.fromTo('#pReader', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, T.tap + 0.2);
  const tTap = beat(T.tap, 3);
  tl.fromTo('#pBottle', { y: -760 }, { y: 140, duration: 0.95, ease: 'power3.in' }, tTap - 0.95);
  tl.to('#pBottle', { scaleY: 0.96, transformOrigin: '50% 100%', duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.out' }, tTap);
  $$('#pRipples .ripple').forEach((r, i) =>
    tl.fromTo(r, { scale: 0.5, opacity: 0.95 }, { scale: 2.6, opacity: 0, duration: 0.9, ease: 'power2.out' }, tTap + i * 0.16));
  cue(tTap, 'nfc');
  const tOk = beat(T.tap, 4);
  tl.to('#pRes', { opacity: 1, duration: 0.18, ease: 'none' }, tOk);
  tl.fromTo('#pTab', { boxShadow: '0 0 0 0px rgba(46,157,87,0), 0 50px 90px -20px rgba(0,0,0,.5)' },
    { boxShadow: '0 0 0 10px rgba(46,157,87,1), 0 50px 90px -20px rgba(0,0,0,.5)', duration: 0.25, immediateRender: false }, tOk);
  pop('#pOk', tOk + 0.05);
  pop('#pDisc', beat(tOk, 1));
  cue(tOk, 'ding');

  // out: the tablet shrinks into the left node of the next scene
  tl.to(['#pHead', '#pOk', '#pDisc'], { opacity: 0, x: -40, duration: 0.3, ease: 'power2.in' }, T.flow - 0.45);
  tl.to(['#pBottle', '#pReader'], { opacity: 0, y: 80, duration: 0.35, ease: 'power2.in' }, T.flow - 0.45);
  tl.to('#pTab', { x: 150 - 1180, y: 390 - 200, scale: 0.7, transformOrigin: '0 0', duration: 0.5, ease: 'power3.inOut',
    boxShadow: '0 0 0 0px rgba(46,157,87,0), 0 50px 90px -20px rgba(0,0,0,.5)' }, T.flow - 0.5);

  // ---- 5 · behind the tap ---------------------------------------------------------------------------
  show('#sFlow', T.flow, T.earn + 0.05);
  headIn('#fHead', T.flow + 0.02);
  tl.fromTo('#fServer', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' }, T.flow + 0.15);
  tl.fromTo('#fLines', { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.flow + 0.2);
  tl.fromTo('#fLines g', { strokeDashoffset: 0 }, { strokeDashoffset: -200, duration: 3.6, ease: 'none' }, T.flow + 0.2);
  $$('#fRows .frow').forEach((r, i) => tl.fromTo(r, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35 }, beat(T.flow, 1 + i * 0.5)));
  tl.fromTo('#fPhone', { x: 220, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, T.flow + 0.2);
  // data packets
  const sec = $('#sFlow');
  const d1 = document.createElement('div'); d1.className = 'dot'; sec.appendChild(d1);
  const d2 = document.createElement('div'); d2.className = 'dot'; sec.appendChild(d2);
  tl.fromTo(d1, { left: 560, top: 640, opacity: 0 }, { left: 760, opacity: 1, duration: 0.45, ease: 'power1.inOut' }, beat(T.flow, 1));
  tl.to(d1, { opacity: 0, duration: 0.1 }, beat(T.flow, 1) + 0.45);
  tl.fromTo(d2, { left: 1160, top: 640, opacity: 0 }, { left: 1390, opacity: 1, duration: 0.45, ease: 'power1.inOut' }, beat(T.flow, 3) - 0.45);
  tl.to(d2, { opacity: 0, duration: 0.1 }, beat(T.flow, 3));
  cue(beat(T.flow, 1), 'blip');
  cue(beat(T.flow, 3) - 0.45, 'blip');
  const tCel = bar(7); // 15.317, second music phrase
  tl.to('#fCele', { opacity: 1, duration: 0.15, ease: 'none' }, tCel);
  tl.to('#fPhone', { scale: 0.97, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, tCel);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  $$('#fConf .conf').forEach((c) => {
    const a = rnd() * Math.PI * 2, d = 120 + rnd() * 220;
    tl.fromTo(c, { x: 0, y: 0, rotation: 0, opacity: 1, scale: 0.6 + rnd() * 0.8 },
      { x: Math.cos(a) * d, y: Math.sin(a) * d + 120, rotation: rnd() * 540 - 270, opacity: 0, duration: 1.1, ease: 'power2.out' }, tCel + rnd() * 0.1);
  });
  tl.set('#fConf', { opacity: 0 }, 0);
  tl.set('#fConf', { opacity: 1 }, tCel);
  cue(tCel, 'chime');
  tl.fromTo('#fStation', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, beat(tCel, 1.2));

  // ---- 6 · earn & see your impact ----------------------------------------------------------------------
  show('#sEarn', T.earn - 0.4, T.campus + 0.05);
  tl.fromTo('#sEarn', { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' }, T.earn - 0.4);
  cue(T.earn - 0.4, 'swish');
  headIn('#eHead', T.earn - 0.2);
  stepOn(4, T.earn);
  tl.fromTo('#eHome', { y: 220, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, T.earn - 0.15);
  tl.set(['#eLeague', '#eRewards'], { opacity: 0 }, 0);
  ['#e1', '#e2', '#e3', '#e4', '#e5'].forEach((c, i) => {
    pop(c, beat(T.earn, 0.6 + i * 0.5));
    cue(beat(T.earn, 0.6 + i * 0.5), 'tick');
  });
  const tFan = bar(9); // 19.385
  tl.to(['#e1', '#e2', '#e3', '#e4', '#e5'], { opacity: 0, scale: 0.8, duration: 0.25, ease: 'power2.in' }, tFan - 0.3);
  tl.set(['#eLeague', '#eRewards'], { opacity: 1 }, tFan - 0.05);
  const fan = { duration: 0.6, ease: 'power3.inOut', transformOrigin: '50% 0%' };
  tl.to('#eHome', { ...fan, x: -540, y: 60, scale: 0.86, rotation: -4 }, tFan - 0.05);
  tl.to('#eLeague', { ...fan, x: -90, y: 60, scale: 0.86 }, tFan - 0.05);
  tl.to('#eRewards', { ...fan, x: 360, y: 60, scale: 0.86, rotation: 4 }, tFan - 0.05);
  cue(tFan - 0.05, 'swish');
  ['#elH', '#elL', '#elR'].forEach((l, i) => tl.fromTo(l, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, tFan + 0.45 + i * 0.12));

  // ---- 7 · for the campus ------------------------------------------------------------------------------
  tl.to('#progress', { opacity: 0, y: -30, duration: 0.3, ease: 'power2.in' }, T.campus - 0.35);
  show('#sCampus', T.campus - 0.4, T.loop + 0.05);
  tl.fromTo('#sCampus', { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.inOut' }, T.campus - 0.4);
  cue(T.campus - 0.4, 'swish');
  headIn('#cHead', T.campus - 0.2);
  tl.fromTo('#cLap', { y: 140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, T.campus - 0.2);
  ['#k1', '#k2', '#k3'].forEach((k, i) => { pop(k, beat(T.campus, 1 + i * 0.5)); cue(beat(T.campus, 1 + i * 0.5), 'tick'); });
  tl.fromTo('#cNote', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, beat(T.campus, 2.8));
  tl.fromTo('#cImg', { scale: 1 }, { scale: 1.45, transformOrigin: '540px 30px', duration: 1.6, ease: 'power2.inOut', immediateRender: false }, bar(11) - 0.2);

  // ---- 8 · the loop ----------------------------------------------------------------------------------------
  show('#sLoop', T.loop - 0.35);
  tl.fromTo('#sLoop', { clipPath: 'circle(0% at 50% 44%)' }, { clipPath: 'circle(80% at 50% 44%)', duration: 0.5, ease: 'power3.in' }, T.loop - 0.4);
  cue(T.loop - 0.4, 'whoosh');
  tl.fromTo('#loopIcon', { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.7)' }, T.loop);
  tl.fromTo('#ringArc', { strokeDashoffset: 1634 }, { strokeDashoffset: 0, duration: 4 * BEAT, ease: 'none' }, beat(T.loop, 0.5));
  $$('#loopNodes .lnode').forEach((n, i) => {
    const t = beat(T.loop, 0.5 + i);
    tl.fromTo(n, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' }, t);
    cue(t, 'pop');
  });
  $$('#loopNodes .llabel').forEach((n, i) => tl.fromTo(n, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35 }, beat(T.loop, 0.65 + i)));
  tl.fromTo('#loopLine', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, bar(13));
  tl.to('#loopIcon', { scale: 1.08, duration: BEAT / 2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, bar(13));

  // ---- hand-back: white burst into the original "See your impact" shot ------------------------------
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
