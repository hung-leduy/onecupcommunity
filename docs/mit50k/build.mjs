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
const CHAR = '2B2E35', ORANGE = 'FF7B0F', ORANGE_INK = 'B04F00', SAGE = '8D9993', INK2 = '545A61', MINT = 'F1F3F1', LINE = 'D2D7D4';
const FONT = 'Arial';
const BODY = 19; // half-points → 9.5 pt
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
          new TextRun({ text: '   Bring your cup. Tap. Earn.', bold: true, size: 22, color: ORANGE }),
        ] }),
        new Paragraph({ spacing: { after: 0 }, children: runs(
          'An NFC & QR platform that makes the reusable cup the easy choice on Vietnamese campuses — and proves the impact with verified data.',
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
  P('Vietnam discharges about **3.1 million tonnes of plastic waste on land every year**, and at least 10% reaches rivers and the sea [1]. On university campuses the takeaway drink cup is the most visible part of it: used for ten minutes, then thrown away. Students know plastic cups are bad and many already own a bottle or tumbler, yet at the counter the disposable cup is still the default. Bringing your own cup is a small hassle with **no reward, no feedback and no proof that it matters**. Meanwhile, Decree 08/2022/ND-CP ends the production and import of single-use plastic products after 2030 [2], so universities and campus food & beverage (F&B) operators need practical, measurable ways to cut single-use cups now.'),

  H('2', 'Our solution: tag any cup, verify every reuse'),
  P('One Cup Community turns bringing your own cup into a fast, rewarded and measurable habit, in four steps:', { after: 30, keepNext: true }),
  N('**Get a tagged cup.** VGU reusable cups carry an engraved QR code. Our **One Cup gear** line brings NFC to the cups people already love: decorated NFC tags, NFC lanyards, and cup & thermos holders with a built-in tag.'),
  N('**Link it in the app.** A bilingual (Vietnamese/English) web app — no app-store install — links the cup to the student in under a minute.'),
  N('**Tap & go at the counter.** A USB NFC reader or camera verifies the cup in under a second and the outlet applies its reusable-cup discount. No staff free? The student types the rotating 6-digit code shown at the counter.'),
  N('**Earn & see the impact.** Points, daily goals, streaks, weekly leagues and rewards, plus personal impact in cups, grams of plastic and CO₂e. A research console gives outlets and the university live, anonymised data, e.g. the share of drinks served in reusable cups.'),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 20 }, keepNext: true, children: [
    new ImageRun({ type: 'png', data: figure, transformation: { width: 672, height: Math.round((672 * figure.readUInt32BE(20)) / figure.readUInt32BE(16)) } }),
  ] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: runs(
    '_Figure 1. Frames from our video. Left: the planned One Cup gear — decorated NFC tags, QR cups, NFC lanyards, cup & bottle straps. Right: the working MVP at the counter — tap, verified, checked in._',
    { size: 15, color: INK2 }) }),

  H('3', 'Technology-based innovation'),
  B('**Tag any cup, one identity.** QR and NFC share one data pipeline, so an engraved cup, a stickered tumbler or a bottle in an NFC holder all become verified “smart cups”. Students need not buy new cups; outlets need no new point-of-sale system.'),
  B('**Verified, fraud-resistant counting.** Three tiers — staff scan, a cryptographically signed (HMAC) rotating counter code, and a rate-limited self-scan marked as unverified — plus cooldowns and automatic flags against double counting. Only verified uses earn rewards or count as impact.'),
  B('**Low-cost, install-free hardware.** A counter needs only a keyboard-emulating USB NFC reader (NTAG215 tags), a webcam, or an Android phone with Web NFC; students use a Progressive Web App.'),
  B('**Behavioural science built in.** Feedback, gamification and rewards can be switched on per randomised study arm and rolled out outlet cluster by cluster (stepped-wedge design), so we can show which nudges build habits that last — including after rewards stop.'),
  B('**Privacy by design.** Layered consent, pseudonymised data exports, no names shown at the counter and no negative rankings.'),

  H('4', 'Business model: from campus pilot to a profitable platform'),
  P('**Customers and value.** First universities (sustainability offices) and campus canteens and cafés; then offices and coffee chains. Outlets save a disposable cup, lid and straw on every reuse — which funds the discount — and gain loyalty and footfall data. Universities get verified progress on plastic-reduction targets for sustainability (ESG) reporting. **Revenue streams** (pricing to be validated in the pilot):', { after: 30, keepNext: true }),
  B('**Platform subscription** per outlet per month, or a campus licence, covering the counter terminal, student app and impact dashboard — priced below the disposable-cup costs an outlet avoids.'),
  B('**Sponsored rewards & campaigns:** beverage, consumer-goods, bank and telecom brands fund vouchers and challenges to reach eco-minded students.'),
  B('**One Cup gear:** QR cups, decorated NFC tags, NFC lanyards and cup & thermos holders, sold to students and co-branded for universities, clubs and companies. NFC tags cost only cents each in bulk, leaving a strong margin.'),
  P('**Market and edge.** More than **550,000 students confirmed university enrolment in 2024 alone** [3], and every campus, office and coffee chain faces the 2030 phase-out. Chain-specific “bring your own cup” discounts and deposit-cup schemes tie users to one brand and produce no verified, campus-wide data. One Cup is **brand-neutral, works with any cup and across all outlets**, and makes the impact auditable.'),

  H('5', 'Positive social impact'),
  B('**Every verified reuse avoids one single-use cup.** For example, 1,000 students reusing one cup per campus day for 150 days avoid 150,000 cups — about **1 tonne of plastic and 8 tonnes of CO₂e** (provisional factors of 6.5 g plastic and 53 g CO₂e per reuse, to be replaced with life-cycle assessment data).'),
  B('**From awareness to habit.** Instant feedback, friendly competition and rewards target the gap between caring and acting; the pilot measures whether the habit lasts once rewards stop.'),
  B('**Inclusive and fair.** Works with cups students already own; nobody is ranked last or named at the counter.'),
  B('**A public good.** An anonymised open dataset on campus reuse behaviour and a model any Vietnamese university can replicate, contributing to SDG 12 (responsible consumption) and the national plastics roadmap.'),

  H('6', 'Feasibility & implementation plan'),
  P('**Where we are.** A **working MVP** has been built and demonstrated end to end: student web app, counter terminal (USB NFC reader, QR camera, rotating codes) and research console with analysis and data export, on a Node.js + SQLite server — tested with real NTAG215 tags and covered by automated API and logic tests.', { keepNext: true }),
];

const plan = [
  ['12/2026 – 02/2027', 'Secure hosting and university e-mail sign-in; prototype the gear line (decorated tags, lanyards, holders); ethics approval for the study.'],
  ['03/2027', 'Closed beta; tag cups; set up readers and train counter staff.'],
  ['04 – 06/2027', '12-week pilot at VGU: 4 outlets in 3 clusters, stepped-wedge roll-out; rewards withdrawn near the end to test whether the habit lasts.'],
  ['H2 2027', 'Publish results; expand to 3–5 campuses in Bình Dương and Ho Chi Minh City; first sponsors and gear sales.'],
  ['2028', 'Offices and coffee chains; ESG reporting module for partners.'],
];
const c1 = 1750;
const planTable = new Table({
  width: { size: W, type: WidthType.DXA },
  columnWidths: [c1, W - c1],
  rows: [
    new TableRow({ tableHeader: true, children: [
      cell([small('**When**', { color: 'FFFFFF' })], c1, { fill: CHAR, border: CHAR }),
      cell([small('**Milestone**', { color: 'FFFFFF' })], W - c1, { fill: CHAR, border: CHAR }),
    ] }),
    ...plan.map(([w, m], i) => new TableRow({ children: [
      cell([small(`__${w}__`)], c1, { fill: i % 2 ? 'FFFFFF' : MINT }),
      cell([small(m)], W - c1, { fill: i % 2 ? 'FFFFFF' : MINT }),
    ] })),
  ],
});

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
  new Paragraph({ spacing: { after: 50 }, children: [] }),
  P('**Pilot KPIs:** share of drinks served in reusable cups vs. baseline · weekly active users · week-8 retention · counter time per transaction · NFC vs. QR uptake.'),
  P('**Risks & mitigation:** low uptake → discount, gamification and a one-second tap; misuse → verified tiers, cooldowns and flags; NFC on metal bottles → on-metal tags and holders; privacy → consent layers, pseudonymisation and ethics review before the pilot.'),
  H('7', 'Team'),
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
    children: [...body, planTable, ...tail],
  }],
});

const out = join(here, 'OneCup-Community-MIT50K-2026.docx');
writeFileSync(out, await Packer.toBuffer(doc));
console.log('wrote', out);
