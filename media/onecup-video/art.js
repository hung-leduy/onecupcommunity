// Product drawings in the One Cup campaign style: thick near-black outlines, flat cream / orange /
// butter-yellow fills, slightly wobbly lines (SVG displacement filter #wobble, defined in index.html).
// The cup character follows the poster mascot: black lid, a "1" for a straw, cream body, smiley.
(() => {
  const INK = '#252429', OR = '#ec7d35', YE = '#eecd70', TA = '#e4ddcd', CR = '#ede9dd', PA = '#fffdf8';
  const $ = (id) => document.getElementById(id);
  const put = (id, svg) => { const el = $(id); if (el) el.innerHTML = svg; };
  const W = 7; // outline width

  // deterministic QR-like pattern with finder squares (not a real code)
  function qr(x, y, size, n = 15) {
    let s = 11, out = '';
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const m = size / n;
    const finder = (fx, fy) => `<rect x="${x + fx * m}" y="${y + fy * m}" width="${5 * m}" height="${5 * m}" fill="${INK}"/>
      <rect x="${x + (fx + 1) * m}" y="${y + (fy + 1) * m}" width="${3 * m}" height="${3 * m}" fill="${PA}"/>
      <rect x="${x + (fx + 2) * m}" y="${y + (fy + 2) * m}" width="${m}" height="${m}" fill="${INK}"/>`;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const inF = (i < 6 && j < 6) || (i < 6 && j > n - 7) || (i > n - 7 && j < 6);
      if (!inF && r() > 0.5) out += `<rect x="${(x + i * m).toFixed(1)}" y="${(y + j * m).toFixed(1)}" width="${(m + 0.4).toFixed(1)}" height="${(m + 0.4).toFixed(1)}" fill="${INK}"/>`;
    }
    return out + finder(0, 0) + finder(n - 5, 0) + finder(0, n - 5);
  }

  // the mascot cup (lid, "1" straw, cream body, smile) — reused by the QR cup and the One Cup tag
  const cupChar = (bodyExtra = '') => `
    <path d="M190 112 V40 q0-10-9-6 L160 46" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M96 150 Q100 104 180 100 Q260 104 264 150 Z" fill="${INK}"/>
    <rect x="80" y="140" width="200" height="34" rx="17" fill="${INK}"/>
    <path d="M100 160 Q180 150 260 160" fill="none" stroke="${CR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M104 178 H256 L236 372 Q234 388 218 388 H142 Q126 388 124 372 Z" fill="${CR}" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    ${bodyExtra}`;
  const face = (y = 214) => `<circle cx="164" cy="${y}" r="8" fill="${INK}"/><circle cx="200" cy="${y - 4}" r="8" fill="${INK}"/>
    <path d="M150 ${y + 22} Q176 ${y + 44} 210 ${y + 18}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;

  // 1 · QR cup
  const qrCup = `<svg viewBox="0 0 360 440" width="360" height="440"><g filter="url(#wobble)">
    <ellipse cx="180" cy="414" rx="96" ry="12" fill="${INK}" opacity=".14"/>
    ${cupChar(`
      ${face(212)}
      <path d="M113 268 H247 L240 344 H120 Z" fill="${OR}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <rect x="150" y="262" width="60" height="60" rx="6" fill="${PA}" stroke="${INK}" stroke-width="5"/>`)}
    </g>${qr(155, 267, 50)}</svg>`;

  // 2 · NFC lanyard with a tag charm (the "Register your NFC tag" character, mini)
  const lanyard = `<svg viewBox="0 0 360 440" width="360" height="440"><g filter="url(#wobble)">
    <path d="M118 0 C 60 110, 96 220, 166 272" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="round"/>
    <path d="M242 0 C 300 110, 264 220, 194 272" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="round"/>
    <path d="M118 0 C 60 110, 96 220, 166 272" fill="none" stroke="${OR}" stroke-width="26" stroke-linecap="round"/>
    <path d="M242 0 C 300 110, 264 220, 194 272" fill="none" stroke="${OR}" stroke-width="26" stroke-linecap="round"/>
    <g fill="none" stroke="${CR}" stroke-width="3" stroke-dasharray="10 9" opacity=".9">
      <path d="M118 0 C 60 110, 96 220, 166 272"/><path d="M242 0 C 300 110, 264 220, 194 272"/></g>
    <rect x="156" y="258" width="48" height="38" rx="8" fill="${TA}" stroke="${INK}" stroke-width="6"/>
    <circle cx="180" cy="314" r="15" fill="none" stroke="${INK}" stroke-width="7"/>
    <circle cx="180" cy="372" r="52" fill="${OR}" stroke="${INK}" stroke-width="${W}"/>
    <path d="M160 352 q6 -7 12 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="198" cy="350" r="5" fill="${INK}"/>
    <path d="M164 368 Q180 382 198 368 Q190 360 180 362 Q170 362 164 368 Z" fill="${INK}"/>
    <path d="M150 384 Q180 404 210 384" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M140 396 Q180 424 220 396" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  </g></svg>`;

  // 3 · thermos in a carry strap with an NFC patch
  const strap = `<svg viewBox="0 0 360 440" width="360" height="440"><g filter="url(#wobble)">
    <ellipse cx="170" cy="420" rx="86" ry="11" fill="${INK}" opacity=".14"/>
    <path d="M246 150 C 350 120, 352 360, 246 336" fill="none" stroke="${INK}" stroke-width="36" stroke-linecap="round"/>
    <path d="M246 150 C 350 120, 352 360, 246 336" fill="none" stroke="${OR}" stroke-width="22" stroke-linecap="round"/>
    <rect x="138" y="22" width="64" height="58" rx="18" fill="${INK}"/>
    <path d="M144 76 H196 L204 104 H136 Z" fill="${YE}" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    <rect x="104" y="100" width="132" height="310" rx="56" fill="${YE}" stroke="${INK}" stroke-width="${W}"/>
    <path d="M126 150 V260" stroke="${PA}" stroke-width="9" stroke-linecap="round" opacity=".8"/>
    <rect x="94" y="140" width="152" height="34" rx="12" fill="${OR}" stroke="${INK}" stroke-width="6"/>
    <rect x="94" y="320" width="152" height="34" rx="12" fill="${OR}" stroke="${INK}" stroke-width="6"/>
    <circle cx="170" cy="250" r="40" fill="${PA}" stroke="${INK}" stroke-width="6"/>
    <g fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round">
      <path d="M156 236 q10 14 0 28"/><path d="M168 228 q16 22 0 44"/><path d="M180 220 q22 30 0 60"/></g>
  </g></svg>`;

  // 4 · our own epoxy tag: the mascot on a cream tag with a key-ring hole
  const mascotTag = `<svg viewBox="0 0 360 440" width="100%" height="100%"><defs>
      <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="M180 6 C 214 6, 230 24, 228 52 L 300 120 Q 316 134 310 156 L 274 404 Q 270 432 242 432 H118 Q90 432 86 404 L 50 156 Q 44 134 60 120 L 132 52 C 130 24, 146 6, 180 6 Z"
      fill="${OR}" stroke="${INK}" stroke-width="8"/>
    <circle cx="180" cy="42" r="15" fill="${CR}" stroke="${INK}" stroke-width="6"/>
    <g transform="translate(0 20) scale(1)" filter="url(#wobble)">${cupChar(face(214))}</g>
    <path d="M78 150 Q 120 100 196 92" fill="none" stroke="url(#gloss)" stroke-width="14" stroke-linecap="round" opacity=".7"/>
  </svg>`;

  put('artCup', qrCup);
  put('artLanyard', lanyard);
  put('artStrap', strap);
  put('t4', mascotTag);
  put('b3tag', mascotTag);
  put('e4', mascotTag);


  // ---- extra drawings for the full pitch ----------------------------------------------------------------

  // the single-use plastic cup: clear dome lid, striped straw, a bored face
  const plasticCup = (w = 380, h = 520, faceOn = true) => `<svg viewBox="0 0 380 520" width="${w}" height="${h}"><g filter="url(#wobble)">
    <ellipse cx="190" cy="500" rx="110" ry="13" fill="${INK}" opacity=".14"/>
    <path d="M214 110 L248 10" stroke="${INK}" stroke-width="30" stroke-linecap="round"/>
    <path d="M214 110 L248 10" stroke="${PA}" stroke-width="18" stroke-linecap="round"/>
    <path d="M222 86 l14 6 M230 62 l14 6 M238 38 l14 6" stroke="${OR}" stroke-width="7" stroke-linecap="round"/>
    <path d="M86 150 Q96 92 190 88 Q284 92 294 150 Z" fill="#f4f1ea" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    <rect x="70" y="140" width="240" height="30" rx="15" fill="#f4f1ea" stroke="${INK}" stroke-width="${W}"/>
    <path d="M92 172 H288 L262 470 Q260 486 244 486 H136 Q120 486 118 470 Z" fill="#f4f1ea" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    <path d="M118 200 L134 440" stroke="${PA}" stroke-width="10" stroke-linecap="round"/>
    <path d="M144 200 L152 300" stroke="${PA}" stroke-width="7" stroke-linecap="round"/>
    ${faceOn ? `<path d="M156 300 h26 M206 296 h26" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="170" cy="312" r="6" fill="${INK}"/><circle cx="220" cy="308" r="6" fill="${INK}"/>
    <path d="M168 360 Q194 352 222 360" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` : ''}
  </g></svg>`;
  put('h1cup', plasticCup());

  // plastic cups raining behind the big number
  const rain = $('rain');
  let rs = 5;
  const rr = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 210 + rr() * 80, sc = 0.32 + rr() * 0.22;
    rain.insertAdjacentHTML('beforeend', `<div class="drop abs" style="left:${x.toFixed(0)}px;top:-260px;opacity:.28;transform:scale(${sc.toFixed(2)});transform-origin:0 0">${plasticCup(380, 520, false)}</div>`);
  }

  // counter NFC reader with waves (verification card)
  put('artReader', `<svg viewBox="0 0 360 230" width="330" height="210"><g filter="url(#wobble)">
    <path d="M60 120 L250 92 L320 140 L130 172 Z" fill="${PA}" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    <path d="M60 120 L130 172 L130 210 L60 158 Z" fill="${OR}" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    <path d="M130 172 L320 140 L320 178 L130 210 Z" fill="${OR}" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    <g fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round">
      <path d="M176 82 q-14 -22 0 -44"/><path d="M204 76 q-22 -32 0 -64"/><path d="M232 70 q-28 -40 0 -80" opacity=".9"/></g>
  </g></svg>`);

  // self-scan: a phone with a question mark
  put('artSelf', `<svg viewBox="0 0 360 230" width="330" height="210"><g filter="url(#wobble)">
    <rect x="128" y="14" width="104" height="200" rx="22" fill="${CR}" stroke="${INK}" stroke-width="${W}"/>
    <rect x="160" y="26" width="40" height="10" rx="5" fill="${INK}"/>
    <text x="180" y="150" text-anchor="middle" font-family="Anton" font-size="96" fill="${OR}">?</text>
  </g></svg>`);

  // campus canteen counter with an awning
  put('artCampus', `<svg viewBox="0 0 400 230" width="360" height="210"><g filter="url(#wobble)">
    <path d="M60 70 H340 L320 22 H80 Z" fill="${OR}" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>
    <path d="M60 70 q23 26 46 0 q23 26 46 0 q23 26 46 0 q23 26 46 0 q23 26 46 0 q23 26 46 0" fill="${PA}" stroke="${INK}" stroke-width="6"/>
    <rect x="76" y="96" width="248" height="112" rx="8" fill="${PA}" stroke="${INK}" stroke-width="${W}"/>
    <rect x="96" y="120" width="96" height="64" rx="6" fill="${TA}" stroke="${INK}" stroke-width="6"/>
    <path d="M226 186 V150 q0 -12 12 -12 h40 q12 0 12 12 V186" fill="${YE}" stroke="${INK}" stroke-width="6"/>
    <text x="200" y="56" text-anchor="middle" font-family="Anton" font-size="30" fill="${CR}">CANTEEN</text>
  </g></svg>`);

  // a crowd of reusable cups (the campus community)
  const smallCup = (x, y, s, body, sleeve, mood = 0) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M190 112 V40 q0-10-9-6 L160 46" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M96 150 Q100 104 180 100 Q260 104 264 150 Z" fill="${INK}"/>
    <rect x="80" y="140" width="200" height="34" rx="17" fill="${INK}"/>
    <path d="M104 178 H256 L236 372 Q234 388 218 388 H142 Q126 388 124 372 Z" fill="${body}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M113 268 H247 L240 330 H120 Z" fill="${sleeve}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <circle cx="164" cy="214" r="9" fill="${INK}"/><circle cx="200" cy="210" r="9" fill="${INK}"/>
    <path d="M150 ${236 + mood} Q176 ${258 - mood} 210 ${232 + mood}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/></g>`;
  put('aHero', `<svg viewBox="0 0 520 640" width="520" height="640"><g filter="url(#wobble)">
    <ellipse cx="260" cy="610" rx="230" ry="18" fill="${INK}" opacity=".12"/>
    <g class="cc">${smallCup(-30, 250, 0.95, CR, OR)}</g>
    <g class="cc">${smallCup(250, 240, 0.95, YE, PA)}</g>
    <g class="cc">${smallCup(110, 20, 1.05, PA, OR)}</g>
  </g></svg>`);

  // the little mascot that climbs the market steps
  put('climb', `<svg viewBox="40 0 280 420" width="150" height="225" style="overflow:visible"><g filter="url(#wobble)">
    ${cupChar(`<path d="M113 268 H247 L240 344 H120 Z" fill="${OR}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>${face(212)}`)}
  </g></svg>`);

  // the big mascot for the closing line, and hearts
  put('zHero', `<svg viewBox="0 0 360 440" width="560" height="684"><g filter="url(#wobble)">
    <ellipse cx="180" cy="420" rx="110" ry="14" fill="${INK}" opacity=".14"/>
    ${cupChar(`<path d="M113 268 H247 L240 344 H120 Z" fill="${OR}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="164" cy="214" r="8" fill="${INK}"/><circle cx="200" cy="210" r="8" fill="${INK}"/>
      <path d="M146 232 Q178 262 214 228" fill="${INK}"/>
      <ellipse cx="146" cy="236" rx="11" ry="7" fill="#f2a27a" opacity=".8"/><ellipse cx="222" cy="230" rx="11" ry="7" fill="#f2a27a" opacity=".8"/>`)}
  </g></svg>`);
  const heart = (x, y, s, f) => `<path class="ht" transform="translate(${x} ${y}) scale(${s})" d="M0 -14 C -10 -34 -40 -26 -36 -2 C -32 18 0 34 0 42 C 0 34 32 18 36 -2 C 40 -26 10 -34 0 -14 Z" fill="${f}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  put('zHearts', `<svg viewBox="0 0 300 300" width="300" height="300" style="overflow:visible"><g filter="url(#wobble)">
    ${heart(70, 200, 1.5, OR)}${heart(170, 110, 1.1, OR)}${heart(240, 210, 0.8, CR)}</g></svg>`);

  // iPhone-style status bar above every phone screenshot (they carry a blank 44 px band)
  const bar = `<div class="sb"><span>9:41</span><svg viewBox="0 0 66 14" width="66" height="14"><g fill="${INK}">
    <rect x="0" y="9" width="3" height="5" rx="1"/><rect x="5" y="6.5" width="3" height="7.5" rx="1"/><rect x="10" y="4" width="3" height="10" rx="1"/><rect x="15" y="1.5" width="3" height="12.5" rx="1"/>
    <path d="M30 4.2a9 9 0 0 1 11.5 0l-1.6 1.7a6.6 6.6 0 0 0-8.3 0Zm2.9 3.1a4.8 4.8 0 0 1 5.7 0l-2.85 3Z"/>
    <rect x="45.5" y="1" width="18" height="11" rx="3.2" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".5"/><rect x="47.5" y="3" width="14" height="7" rx="1.8"/><rect x="64.6" y="4.6" width="1.4" height="3.8" rx=".7" opacity=".5"/></g></svg></div>`;
  document.querySelectorAll('.phone .scr').forEach((s) => s.insertAdjacentHTML('beforeend', bar));

  // confetti for the check-in celebration, in the campaign colours
  const conf = $('kConf');
  const cols = [OR, YE, CR, TA, OR];
  for (let i = 0; i < 18; i++) conf.insertAdjacentHTML('beforeend', `<div class="conf" style="background:${cols[i % cols.length]}"></div>`);
})();
