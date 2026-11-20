// Flat illustrations in the One Cup style (charcoal #2B2E35, orange #FF7B0F, sage #8D9993).
// Everything is inline SVG so the frames render offline and stay sharp at any scale.
(() => {
  const C = '#2b2e35', O = '#ff7b0f', OD = '#d65f00', S = '#8d9993', SS = '#eceeec', W = '#ffffff';
  const $ = (id) => document.getElementById(id);
  const put = (id, svg) => { const el = $(id); if (el) el.innerHTML = svg; };

  // The One Cup mascot, from web/public/icon.svg (translate(106 58) scale(2.5) inside a 512 box).
  const mascot = (body = O, hole = C) => `
    <path d="M20 71h80l-9 67q-1 7-8 7H37q-7 0-8-7Z" fill="${body}"/>
    <path d="M27.5 80h65l-7.6 55q-.7 5-5 5H40.1q-4.3 0-5-5Z" fill="${hole}"/>
    <rect x="12" y="58" width="96" height="16" rx="8" fill="${body}"/>
    <path d="M21 61q2-18.5 39-19.5 37 1 39 19.5Z" fill="${body}"/>
    <path d="M22 61.5q38-4 76 0" stroke="${hole}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <ellipse cx="62" cy="48.5" rx="13" ry="4.4" fill="${hole}"/>
    <g transform="rotate(9 62 51)"><path d="M55 51V11q0-7 7-7h2q7 0 7 7v40q0 2.5-2.5 2.5h-11Q55 53.5 55 51Z" fill="${body}"/>
    <path d="M58 9 48.5 15" stroke="${body}" stroke-width="10" stroke-linecap="round"/></g>
    <circle cx="60.5" cy="98.5" r="4.6" fill="${body}"/><circle cx="74.5" cy="94.5" r="4.6" fill="${body}"/>
    <path d="M42 104.5q10.5 15 26.5 4" stroke="${body}" stroke-width="5.6" stroke-linecap="round" fill="none"/>`;
  const appIcon = `<svg viewBox="0 0 512 512" width="100%" height="100%"><rect width="512" height="512" rx="112" fill="${C}"/>
    <g transform="translate(106 58) scale(2.5)">${mascot()}</g></svg>`;

  const nfcWaves = (stroke, w = 2.6) => `<g fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round">
    <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/>
    <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></g>`;

  // Deterministic QR-like pattern with the three finder squares.
  function qr(x, y, size, fg, n = 21) {
    let s = 7, out = '';
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const m = size / n;
    const finder = (fx, fy) => `<rect x="${x + fx * m}" y="${y + fy * m}" width="${7 * m}" height="${7 * m}" fill="${fg}"/>
      <rect x="${x + (fx + 1) * m}" y="${y + (fy + 1) * m}" width="${5 * m}" height="${5 * m}" fill="#f6f7f5"/>
      <rect x="${x + (fx + 2) * m}" y="${y + (fy + 2) * m}" width="${3 * m}" height="${3 * m}" fill="${fg}"/>`;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const inF = (i < 8 && j < 8) || (i < 8 && j > n - 9) || (i > n - 9 && j < 8);
      if (!inF && r() > 0.52) out += `<rect x="${(x + i * m).toFixed(2)}" y="${(y + j * m).toFixed(2)}" width="${(m + 0.3).toFixed(2)}" height="${(m + 0.3).toFixed(2)}" fill="${fg}"/>`;
    }
    return out + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7);
  }

  // 1 · VGU reusable cup with an engraved QR code
  const cup = `<svg viewBox="0 0 330 360"><defs>
      <linearGradient id="cupBody" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f1f3f1"/><stop offset="1" stop-color="#dfe3e0"/></linearGradient></defs>
    <ellipse cx="165" cy="342" rx="92" ry="12" fill="#2b2e35" opacity=".12"/>
    <path d="M168 70 178 8q1-6 7-6h22" stroke="${O}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M92 96h146l-20 228q-1.6 14-16 14h-78q-14.4 0-16-14Z" fill="url(#cupBody)" stroke="#d2d7d4" stroke-width="3"/>
    <rect x="78" y="78" width="174" height="26" rx="13" fill="${O}"/>
    <path d="M92 80q4-22 73-24 69 2 73 24Z" fill="${O}"/>
    <path d="M101 150h128l-3 30H104Z" fill="${C}"/>
    <text x="165" y="172" font-family="Lilita One" font-size="19" fill="${W}" text-anchor="middle" letter-spacing="3">ONE CUP</text>
    <rect x="117" y="196" width="96" height="96" rx="10" fill="#f6f7f5" stroke="${S}" stroke-width="3"/>
    ${qr(125, 204, 80, '#3a3e47')}
    <text x="165" y="316" font-family="Quicksand" font-weight="700" font-size="15" fill="${S}" text-anchor="middle">OCC-539EUY</text>
  </svg>`;

  // 2 · decorated NFC stickers
  const coil = (cx, cy, r, col) => `<g fill="none" stroke="${col}" stroke-width="1.6" opacity=".55">
    <circle cx="${cx}" cy="${cy}" r="${r - 10}"/><circle cx="${cx}" cy="${cy}" r="${r - 15}"/><circle cx="${cx}" cy="${cy}" r="${r - 20}"/></g>`;
  const tags = `<svg viewBox="0 0 330 360">
    <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#2b2e35" flood-opacity=".22"/></filter></defs>
    <g filter="url(#sh)">
      <g transform="rotate(-10 95 105)"><circle cx="95" cy="105" r="72" fill="${W}"/><circle cx="95" cy="105" r="64" fill="${S}"/>${coil(95, 105, 64, W)}
        <g transform="translate(59 69) scale(3)"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="${W}"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="${W}" stroke-width="2" fill="none" stroke-linecap="round"/></g></g>
      <g transform="rotate(8 238 120)"><circle cx="238" cy="120" r="66" fill="${W}"/><circle cx="238" cy="120" r="58" fill="${C}"/>${coil(238, 120, 58, '#7f8a84')}
        <g transform="translate(208 90) scale(2.5)">${nfcWaves(O, 2.4)}</g></g>
      <g transform="rotate(-4 165 248)"><circle cx="165" cy="248" r="88" fill="${W}"/><circle cx="165" cy="248" r="80" fill="${O}"/>
        <g opacity=".22" fill="${W}"><circle cx="110" cy="210" r="7"/><circle cx="222" cy="214" r="6"/><circle cx="120" cy="300" r="5"/><circle cx="212" cy="296" r="8"/></g>
        <circle cx="140" cy="236" r="10" fill="${C}"/><circle cx="190" cy="230" r="10" fill="${C}"/>
        <path d="M128 266q36 34 74 6" stroke="${C}" stroke-width="10" stroke-linecap="round" fill="none"/>
        <circle cx="120" cy="262" r="9" fill="#ffb27a"/><circle cx="212" cy="256" r="9" fill="#ffb27a"/></g>
      <g transform="rotate(14 270 285)"><circle cx="270" cy="285" r="44" fill="${W}"/><circle cx="270" cy="285" r="38" fill="#ffc83d"/>
        <path d="M270 262l7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2Z" fill="${W}"/></g>
    </g></svg>`;

  // 3 · NFC lanyard with a bottle clip and a tag charm
  const lanyard = `<svg viewBox="0 0 330 360">
    <ellipse cx="165" cy="344" rx="70" ry="10" fill="#2b2e35" opacity=".12"/>
    <path d="M120 30 C 30 70, 50 200, 150 248" stroke="${OD}" stroke-width="34" stroke-linecap="round" fill="none"/>
    <path d="M210 30 C 300 70, 280 200, 180 248" stroke="${O}" stroke-width="34" stroke-linecap="round" fill="none"/>
    <path d="M120 30 Q165 0 210 30" stroke="${O}" stroke-width="34" stroke-linecap="round" fill="none"/>
    <g stroke="${W}" stroke-width="3" stroke-dasharray="10 9" fill="none" opacity=".8">
      <path d="M120 30 C 30 70, 50 200, 150 248"/><path d="M210 30 C 300 70, 280 200, 180 248"/><path d="M120 30 Q165 0 210 30"/></g>
    <text font-family="Lilita One" font-size="17" fill="${W}" letter-spacing="3"><textPath href="#lp" startOffset="8%">ONE CUP · ONE CUP · ONE CUP</textPath></text>
    <path id="lp" d="M210 30 C 300 70, 280 200, 180 248" fill="none"/>
    <rect x="140" y="236" width="50" height="34" rx="8" fill="#b9c0bc" stroke="#7f8a84" stroke-width="3"/>
    <circle cx="165" cy="284" r="14" fill="none" stroke="#9aa39e" stroke-width="7"/>
    <g transform="rotate(-8 165 322)"><circle cx="165" cy="326" r="36" fill="${C}"/><circle cx="165" cy="326" r="36" fill="none" stroke="${O}" stroke-width="5"/>
      <g transform="translate(147 308) scale(1.5)">${nfcWaves(O, 2.6)}</g></g>
  </svg>`;

  // 4 · thermos bottle in a carry holder with a built-in NFC patch
  const holder = `<svg viewBox="0 0 330 360"><defs>
      <linearGradient id="flask" x1="0" x2="1"><stop offset="0" stop-color="#a7b1ac"/><stop offset=".45" stop-color="#8d9993"/><stop offset="1" stop-color="#6d7972"/></linearGradient></defs>
    <ellipse cx="150" cy="346" rx="72" ry="10" fill="#2b2e35" opacity=".12"/>
    <rect x="112" y="20" width="76" height="46" rx="14" fill="${C}"/><rect x="124" y="8" width="52" height="20" rx="8" fill="#3a3e47"/>
    <rect x="100" y="60" width="100" height="282" rx="40" fill="url(#flask)"/>
    <rect x="114" y="84" width="10" height="210" rx="5" fill="${W}" opacity=".35"/>
    <path d="M200 132 C 290 120, 300 300, 200 286" stroke="${O}" stroke-width="20" stroke-linecap="round" fill="none"/>
    <path d="M200 132 C 290 120, 300 300, 200 286" stroke="${W}" stroke-width="2.5" stroke-dasharray="8 8" fill="none" opacity=".7"/>
    <rect x="92" y="118" width="116" height="28" rx="8" fill="${C}"/>
    <rect x="92" y="272" width="116" height="28" rx="8" fill="${C}"/>
    <rect x="92" y="186" width="116" height="58" rx="12" fill="${C}"/>
    <rect x="124" y="190" width="52" height="50" rx="12" fill="${O}"/>
    <g transform="translate(132 197) scale(1.5)">${nfcWaves(W, 2.8)}</g>
  </svg>`;

  // NFC reader on the counter
  const reader = `<svg viewBox="0 0 440 200" width="440" height="200">
    <ellipse cx="220" cy="176" rx="200" ry="20" fill="#000" opacity=".3"/>
    <path d="M40 92 Q40 60 72 60 H368 Q400 60 400 92 V140 Q400 168 368 168 H72 Q40 168 40 140Z" fill="#1d1f24"/>
    <path d="M40 92 Q40 60 72 60 H368 Q400 60 400 92 V118 Q400 146 368 146 H72 Q40 146 40 118Z" fill="#3a3e47"/>
    <ellipse cx="220" cy="103" rx="120" ry="32" fill="none" stroke="${O}" stroke-width="6"/>
    <ellipse cx="220" cy="103" rx="80" ry="20" fill="none" stroke="${O}" stroke-width="3" opacity=".5"/>
    <circle cx="372" cy="84" r="6" fill="#2e9d57"/>
    <text x="70" y="136" font-family="Quicksand" font-weight="700" font-size="18" fill="#9aa39e">NFC READER</text>
  </svg>`;

  // iPhone-style status bar above every phone screenshot (the screenshots carry a blank 44 px band)
  const bar = `<div class="sb"><span>9:41</span><svg viewBox="0 0 66 14" width="66" height="14"><g fill="#2b2e35">
    <rect x="0" y="9" width="3" height="5" rx="1"/><rect x="5" y="6.5" width="3" height="7.5" rx="1"/><rect x="10" y="4" width="3" height="10" rx="1"/><rect x="15" y="1.5" width="3" height="12.5" rx="1"/>
    <path d="M30 4.2a9 9 0 0 1 11.5 0l-1.6 1.7a6.6 6.6 0 0 0-8.3 0Zm2.9 3.1a4.8 4.8 0 0 1 5.7 0l-2.85 3Z"/>
    <rect x="45.5" y="1" width="18" height="11" rx="3.2" fill="none" stroke="#2b2e35" stroke-width="1.4" opacity=".5"/><rect x="47.5" y="3" width="14" height="7" rx="1.8"/><rect x="64.6" y="4.6" width="1.4" height="3.8" rx=".7" opacity=".5"/></g></svg></div>`;
  document.querySelectorAll('.phone .scr').forEach((s) => s.insertAdjacentHTML('beforeend', bar));

  put('tIcon', appIcon);
  put('fIcon', appIcon);
  put('loopIcon', appIcon);
  put('artCup', cup);
  put('artTags', tags);
  put('artLanyard', lanyard);
  put('artHolder', holder);
  put('lCup', cup);
  put('pBottle', holder);
  put('pReader', reader);

  // ripples for the tap
  const rip = $('pRipples');
  for (let i = 0; i < 3; i++) rip.insertAdjacentHTML('beforeend', '<div class="ripple"></div>');

  // confetti around the celebration phone
  const conf = $('fConf');
  const cols = [O, '#ffc83d', '#2e9d57', W, S];
  for (let i = 0; i < 18; i++) conf.insertAdjacentHTML('beforeend', `<div class="conf" style="background:${cols[i % cols.length]}"></div>`);

  // loop nodes around the ring (centre 960,480 r 290)
  const nodes = [
    ['Bring', '<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="m12 8 1-6h2"/>'],
    ['Tap', '<path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/>'],
    ['Earn', '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'],
    ['Repeat', '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'],
  ];
  const ln = $('loopNodes');
  nodes.forEach(([label, icon], i) => {
    const R = 260, CX = 960, CY = 470;
    const a = (-90 + i * 90) * Math.PI / 180;
    const x = CX + R * Math.cos(a), y = CY + R * Math.sin(a);
    const box = [
      { left: x - 200, top: y - 150, align: 'center' },
      { left: x + 92, top: y - 26, align: 'left' },
      { left: x - 200, top: y + 88, align: 'center' },
      { left: x - 92 - 400, top: y - 26, align: 'right' },
    ][i];
    ln.insertAdjacentHTML('beforeend', `
      <div class="lnode abs" style="left:${x - 70}px;top:${y - 70}px;width:140px;height:140px;border-radius:50%;background:${O};display:grid;place-items:center;box-shadow:0 0 0 12px ${C}">
        <svg class="i" viewBox="0 0 24 24" width="66" height="66" style="stroke:#fff;stroke-width:2.4">${icon}</svg></div>
      <div class="llabel abs display" style="left:${box.left}px;top:${box.top}px;width:400px;text-align:${box.align};font-size:52px;line-height:1;color:#fff">${label}</div>`);
  });
})();
