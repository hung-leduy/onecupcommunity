// Builds the 2-page written submission for MIT 50K VN 2026 (English):
//   node docs/mit50k/build.mjs   →   docs/mit50k/OneCup-Community-MIT50K-2026.docx
// Then convert to PDF with LibreOffice and check that it is exactly two pages
// (the organisers keep only the first two pages).
// Team details are left as blanks for the team to fill in.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  AlignmentType, BorderStyle, Document, Footer, HeightRule, ImageRun, LevelFormat, Packer, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} = require('docx');

const here = dirname(fileURLToPath(import.meta.url));
const CHAR = '252429', ORANGE = 'EC7D35', ORANGE_INK = 'A9521F', SAGE = '8A8377', INK2 = '57524B', MINT = 'F4F0E6', LINE = 'E0D9CB';
const FONT = 'Arial';
const BODY = 20; // half-points → 10 pt
const W = 10206; // content width in DXA (A4 21 cm − 2 × 1.5 cm)

// ---- tiny helpers -------------------------------------------------------------------------------
// Inline markup: **bold**, __orange bold__, _italic_
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|_[^_]+_)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else if (t.startsWith('__')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base, color: ORANGE_INK }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (text, opts = {}) =>
  new Paragraph({ children: runs(text, opts.run), spacing: { after: opts.after ?? 50, line: 252 }, alignment: opts.align ?? AlignmentType.JUSTIFIED, keepNext: opts.keepNext });
const B = (text, level = 0) =>
  new Paragraph({ children: runs(text), numbering: { reference: 'dots', level }, spacing: { after: 30, line: 252 }, alignment: AlignmentType.JUSTIFIED });
const N = (text) =>
  new Paragraph({ children: runs(text), numbering: { reference: 'steps', level: 0 }, spacing: { after: 30, line: 252 }, alignment: AlignmentType.JUSTIFIED });
const H = (num, text) =>
  new Paragraph({
    keepNext: true,
    spacing: { before: 110, after: 50 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 2 } },
    children: [
      new TextRun({ text: `${num}  `, bold: true, color: ORANGE, size: 22 }),
      new TextRun({ text, bold: true, color: CHAR, size: 22 }),
    ],
  });
const cellBorders = (color = LINE) => ({
  top: { style: BorderStyle.SINGLE, size: 4, color }, bottom: { style: BorderStyle.SINGLE, size: 4, color },
  left: { style: BorderStyle.SINGLE, size: 4, color }, right: { style: BorderStyle.SINGLE, size: 4, color },
});
const cell = (children, width, opts = {}) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders(opts.border ?? LINE),
    shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
    margins: { top: 45, bottom: 45, left: 100, right: 100 },
    verticalAlign: opts.vAlign ?? VerticalAlign.TOP,
    columnSpan: opts.span,
    children,
  });
const small = (text, o = {}) =>
  new Paragraph({ children: runs(text, { size: o.size ?? 16, color: o.color }), spacing: { after: 0, line: 240 }, alignment: o.align ?? AlignmentType.LEFT });

// ---- header: logo + title, then the team box (blank for the team) ---------------------------------------
const icon = readFileSync(join(here, 'assets/onecup-icon.png'));
const figure = readFileSync(join(here, 'assets/figure-gear-and-mvp.png'));

const titleBlock = new Table({
  width: { size: W, type: WidthType.DXA },
  columnWidths: [1000, W - 1000],
  rows: [new TableRow({ children: [
    new TableCell({
      width: { size: 1000, type: WidthType.DXA }, borders: cellBorders('FFFFFF'), verticalAlign: VerticalAlign.CENTER,
      margins: { top: 0, bottom: 0, left: 0, right: 80 },
      children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: icon, transformation: { width: 54, height: 54 } })] })],
    }),
    new TableCell({
      width: { size: W - 1000, type: WidthType.DXA }, borders: cellBorders('FFFFFF'), verticalAlign: VerticalAlign.CENTER,
      margins: { top: 0, bottom: 0, left: 60, right: 0 },
      children: [
        new Paragraph({ spacing: { after: 20 }, children: [
          new TextRun({ text: 'One Cup Community', bold: true, size: 38, color: CHAR }),
          new TextRun({ text: '   your cup. no drama.', bold: true, size: 22, color: ORANGE }),
        ] }),
        new Paragraph({ spacing: { after: 0 }, children: runs(
          'An NFC & QR platform that makes bringing your own cup the easy choice — and counts every reuse, so the impact is proven, not estimated.',
          { size: 19, color: INK2 }) }),
      ],
    }),
  ] })],
});

const third = Math.round(W / 3);
const teamBox = new Table({
  width: { size: W, type: WidthType.DXA },
  columnWidths: [third, third, W - 2 * third],
  rows: [new TableRow({ children: [
    cell([small('**Team name:**'), small(' ')], third, { fill: MINT }),
    cell([small('**University / organisation:**'), small(' ')], third, { fill: MINT }),
    cell([small('**Contact (e-mail · phone):**'), small(' ')], W - 2 * third, { fill: MINT }),
  ] })],
});

// ---- body ---------------------------------------------------------------------------------------------------
const body = [
  titleBlock,
  new Paragraph({ spacing: { after: 60 }, children: [] }),
  teamBox,

  H('1', 'The problem: not awareness, but friction'),
  P('Vietnam discharges about **3.1 million tonnes of plastic waste on land every year**, and at least 10% reaches rivers and the sea [1]. On campus the takeaway drink cup is the most visible part of it: used for ten minutes, then binned. Students know plastic cups are bad and many already own a bottle or tumbler, yet at the counter the disposable cup is still the default — bringing your own is a small hassle with **no reward, no feedback and no proof that it matters**. Decree 08/2022/ND-CP phases out single-use plastic products by the end of 2030 [2], so universities and food & beverage (F&B) outlets need a habit that sticks, and a way to measure it.'),

  H('2', 'Our solution: any cup, one tap'),
  P('One Cup Community turns bringing your own cup into a fast, rewarded and measurable habit, in four steps:', { after: 30, keepNext: true }),
  N('**Get a tagged cup.** **One Cup gear** makes any cup a smart cup: glass tumblers printed with the One Cup logo, decorated NFC tags, One Cup lanyards and bottle slings with a built-in tag. VGU reusable cups carry an engraved QR code.'),
  N('**Link it in the app.** A bilingual (Vietnamese/English) web app — no app-store install — links the tag to the student in under a minute.'),
  N('**Tap at the counter.** A USB NFC reader or camera verifies the cup in under a second and the outlet applies its reusable-cup discount. No staff free? The student types the rotating 6-digit code shown at the counter.'),
  N('**Earn & see the impact.** Points, streaks, milestones, a weekly league and rewards, plus personal impact in cups, grams of plastic and CO₂e; outlets and the university see live, anonymised data.'),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 20 }, keepNext: true, children: [
    new ImageRun({ type: 'png', data: figure, transformation: { width: 672, height: Math.round((672 * figure.readUInt32BE(20)) / figure.readUInt32BE(16)) } }),
  ] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: runs(
    '_Figure 1. Frames from our video. Left: One Cup gear — logo glass tumbler, NFC tags, bottle sling, lanyard. Right: the working MVP at the counter — tap, verified, checked in._',
    { size: 15, color: INK2 }) }),

  H('3', 'Criterion 1 · Technology-based innovation'),
  B('**Tag any cup, one identity.** QR and NFC share one data pipeline, so an engraved cup, a stickered tumbler or a bottle in a sling all become verified “smart cups”. Students need not buy new cups; outlets need no new point-of-sale system.'),
  B('**Verified, fraud-resistant counting.** Three tiers — staff scan or NFC reader, a cryptographically signed (HMAC) rotating counter code, and a rate-limited self-scan marked as unverified — plus cooldowns and automatic flags against double counting. Only verified uses earn rewards or count as impact.'),
  B('**Built to scale.** A new outlet needs a low-cost USB NFC reader (NTAG215 tags), a webcam or an Android phone, and a PIN; a new campus is a configuration. Students use a Progressive Web App.'),
  B('**Evidence built in.** Feedback, gamification and rewards can be switched on for randomised groups, so the platform shows which nudges build habits that last — including after rewards stop. **Privacy by design:** layered consent, pseudonymised exports, no names at the counter, no negative rankings.'),

  H('4', 'Criterion 2 · Profit potential'),
  P('**Customers and value.** Universities (sustainability offices) and campus canteens and cafés first, then cafés, offices and coffee chains. Outlets save a disposable cup, lid and straw on every reuse — which funds the discount — and gain loyalty and footfall data; universities get verified progress for their sustainability (ESG) reporting. **Revenue streams** (pricing to be validated with the first campus partners):', { after: 30, keepNext: true }),
  B('**Platform subscription** per outlet per month, or a campus licence (counter terminal, student app, impact dashboard) — priced below the disposable-cup costs an outlet avoids.'),
  B('**Sponsored rewards & campaigns:** beverage, consumer-goods, bank and telecom brands fund vouchers and challenges to reach eco-minded students.'),
  B('**One Cup gear:** logo glass tumblers, decorated NFC tags, lanyards and bottle slings, sold to students and co-branded for universities, clubs and companies; NFC tags cost cents each in bulk.'),
  P('**Market and edge.** More than **550,000 students started university in 2024 alone** [3], and every campus, office and coffee chain faces the 2030 phase-out. Chain-specific “bring your own cup” discounts and deposit cups tie users to one brand and produce no shared, verified data. One Cup is **brand-neutral, works with any cup at every outlet**, and makes the impact auditable.'),
  P('**Growth path.** Vietnam’s campuses → cafés, offices and coffee chains, where every takeaway counter faces the same rules → Southeast Asia, the same model in new cities. Each step adds outlets (subscriptions), audiences (sponsors) and gear buyers — and multiplies the impact.'),
  P('**Feasibility.** A **working MVP** is built and demonstrated end to end — student web app, counter terminal (USB NFC reader, QR camera, rotating codes) and data console with export — tested with real NTAG215 tags and covered by automated tests. Risks are handled in the design: low uptake → discount, rewards and a one-second tap; misuse → verified tiers and flags; metal bottles → on-metal tags and slings.'),

  H('5', 'Criterion 3 · Measurable positive impact'),
  B('**Every verified reuse avoids one single-use cup — and it is counted, not estimated.** If 1 in 10 of the 551,479 students who started university in 2024 [3] reuses one cup per campus day for 150 days: **≈ 8.27 million cups a year ≈ 54 tonnes of plastic and ≈ 440 tonnes of CO₂e avoided** (provisional factors of 6.5 g plastic and 53 g CO₂e per reuse, to be replaced with life-cycle assessment data).'),
  B('**What we measure:** share of drinks served in reusable cups vs. baseline, weekly active users, week-8 retention, and whether the habit lasts once rewards stop.'),
  B('**From awareness to habit, for everyone.** Works with the cup students already own; nobody is ranked last or named at the counter.'),
  B('**A public good.** An anonymised open dataset on reuse behaviour and a model any Vietnamese university can replicate — contributing to SDG 12 and Vietnam’s 2030 plastics goals. **Profit and impact grow together:** every new outlet adds both revenue and verified reuses.'),
];

// Team table — left blank for the team to fill in.
const tw = [2700, 2500, W - 5200];
const teamTable = new Table({
  width: { size: W, type: WidthType.DXA },
  columnWidths: tw,
  rows: [
    new TableRow({ tableHeader: true, children: ['Member', 'Role in One Cup', 'Background & key skills'].map((h, i) =>
      cell([small(`**${h}**`, { color: 'FFFFFF' })], tw[i], { fill: CHAR, border: CHAR })) }),
    ...[0, 1, 2, 3].map((r) => new TableRow({ height: { value: 330, rule: HeightRule.ATLEAST }, children: tw.map((w) =>
      cell([small(' ')], w, { fill: r % 2 ? 'FFFFFF' : MINT })) })),
  ],
});

const tail = [
  H('6', 'Team'),
  teamTable,
  new Paragraph({ spacing: { before: 60, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 2 } }, children: runs(
    '[1] World Bank (2022), reported by VietNamNet, “Vietnam discards over three million tonnes of plastic waste a year”. [2] Decree 08/2022/ND-CP detailing the Law on Environmental Protection 2020. [3] Ministry of Education and Training, 2024 university admissions: 551,479 confirmed enrolments.',
    { size: 14, color: INK2 }) }),
];

const doc = new Document({
  creator: 'One Cup Community',
  title: 'One Cup Community — MIT 50K VN 2026 written submission',
  styles: { default: { document: { run: { font: FONT, size: BODY, color: CHAR } } } },
  numbering: {
    config: [
      { reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 260, hanging: 200 } }, run: { color: ORANGE } } }] },
      { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 300, hanging: 240 } }, run: { color: ORANGE, bold: true } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 850, right: 850, footer: 340 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: 'One Cup Community · MIT 50K VN 2026 · page ', size: 14, color: SAGE }),
      new TextRun({ children: [PageNumber.CURRENT], size: 14, color: SAGE }),
      new TextRun({ text: ' / 2', size: 14, color: SAGE }),
    ] })] }) },
    children: [...body, ...tail],
  }],
});

const out = join(here, 'OneCup-Community-MIT50K-2026.docx');
writeFileSync(out, await Packer.toBuffer(doc));
console.log('wrote', out);
