// Renders the One Cup pitch video (~86 s) from index.html + timeline.js, with the voice-over.
//
//   node render.mjs <music.wav> <outDir> --vo=<vo.wav>                 full render (~12 min)
//   node render.mjs <music.wav> <outDir> --preview=4,20.5               stills at the given times
//   node render.mjs <music.wav> <outDir> --vo=<vo.wav> --reuse-frames   keep frames, redo the sound
//   node render.mjs <music.wav> <outDir> --vo=<vo.wav> --range=0-110    re-render only those frames
//
// <music.wav> is the team's soundtrack with its old voice-over removed (separate.py). The 40.9 s
// track is stretched to 85.6 s on its own bar grid (118 BPM): it plays from the top to 34.389 s,
// the 16-beat groove phrase (26.254–34.389 s, found by cross-correlation) repeats four times, then
// a 24-beat jump back to 22.186 s runs on into the original ending — so the musical break lands on
// "meet ONE CUP" (18.0 s) and the final drop on the end card (81.2 s).
// <vo.wav> comes from voiceover.py; the music ducks under it.
//
// Output: <outDir>/onecup-pitch.mp4 (1920×1080, 24 fps, H.264 + AAC) and onecup-pitch.srt if the
// voice-over subtitles sit next to vo.wav.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const [src, outArg = 'out', ...rest] = process.argv.slice(2);
if (!src || !existsSync(src)) throw new Error('usage: node render.mjs <music.wav> <outDir> [--vo=vo.wav] [--preview=t1,t2] [--reuse-frames] [--range=a-b]');
const out = resolve(outArg);
const preview = rest.find((a) => a.startsWith('--preview='))?.slice(10).split(',').map(Number);
const reuse = rest.includes('--reuse-frames');
const vo = rest.find((a) => a.startsWith('--vo='))?.slice(5);
const range = rest.find((a) => a.startsWith('--range='))?.slice(8).split('-').map(Number); // re-render frames a..b only
mkdirSync(out, { recursive: true });

const FPS = 24;
const J = 34.389, L16 = 8.135583, L24 = 12.203375, XF = 0.03; // music splice points (s)
const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

// ---- frames ------------------------------------------------------------------------------------------------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, 'index.html')).href);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
});
const { cues, duration } = await page.evaluate(() => ({ cues: window.__cues, duration: window.__duration }));
const N = Math.round(duration * FPS);
if (preview) {
  for (const t of preview) {
    await page.evaluate((x) => window.__seek(x), t);
    await page.screenshot({ path: join(out, `preview-${t.toFixed(2)}.png`) });
  }
  await browser.close();
  console.log('previews in', out);
  process.exit(0);
}
const frames = join(out, 'frames');
if (!reuse) {
  if (!range) rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const [f0, f1] = range ?? [0, N - 1];
  for (let f = f0; f <= f1; f++) {
    await page.evaluate((x) => window.__seek(x), f / FPS);
    await page.screenshot({ path: join(frames, `${String(f).padStart(4, '0')}.png`) });
    if (f % 240 === 0) console.log('frame', f, '/', N);
  }
}
await browser.close();
writeFileSync(join(out, 'cues.json'), JSON.stringify(cues));
const LEN = N / FPS;

// ---- sound effects (synthesised, kept well under the music) --------------------------------------------------
const SFX = {
  pop: "aevalsrc='0.30*sin(2*PI*t*(480+700*exp(-t*55)))*exp(-t*26)':s=48000:d=0.2",
  tick: "aevalsrc='0.15*sin(2*PI*1500*t)*exp(-t*60)+0.07*sin(2*PI*2250*t)*exp(-t*80)':s=48000:d=0.12",
  nfc: "aevalsrc='0.20*(sin(2*PI*2093*t)+0.25*sin(2*PI*6279*t))*min(1\\,t*400)*lt(t\\,0.13)':s=48000:d=0.14",
  ding: "aevalsrc='0.20*sin(2*PI*1318.5*t)*exp(-t*6)+0.18*gte(t\\,0.09)*sin(2*PI*1975.5*(t-0.09))*exp(-(t-0.09)*5)':s=48000:d=0.9",
  chime: "aevalsrc='0.15*(sin(2*PI*1046.5*t)*exp(-t*5)+gte(t\\,0.07)*sin(2*PI*1318.5*(t-0.07))*exp(-(t-0.07)*5)+gte(t\\,0.14)*sin(2*PI*1568*(t-0.14))*exp(-(t-0.14)*5)+gte(t\\,0.21)*sin(2*PI*2093*(t-0.21))*exp(-(t-0.21)*4))':s=48000:d=1.2",
  stamp: "aevalsrc='0.5*sin(2*PI*82*t)*exp(-t*15)+0.18*sin(2*PI*164*t)*exp(-t*24)':s=48000:d=0.4,afade=t=out:st=0.3:d=0.1",
  whoosh: 'anoisesrc=color=pink:amplitude=0.28:s=48000:d=0.9:seed=3,highpass=f=300,lowpass=f=5000,afade=t=in:d=0.55:curve=exp,afade=t=out:st=0.55:d=0.35',
  swish: 'anoisesrc=color=pink:amplitude=0.18:s=48000:d=0.45:seed=5,highpass=f=600,lowpass=f=6000,afade=t=in:d=0.25:curve=exp,afade=t=out:st=0.25:d=0.2',
  riser: 'anoisesrc=color=white:amplitude=0.12:s=48000:d=0.8:seed=7,highpass=f=1200,afade=t=in:d=0.8:curve=exp',
};
const graph = cues.map(([t, kind], i) => `${SFX[kind]},aformat=channel_layouts=stereo,adelay=${Math.round(t * 1000)}:all=1[s${i}]`);
graph.push(`${cues.map((_, i) => `[s${i}]`).join('')}amix=inputs=${cues.length}:normalize=0:duration=longest,apad=whole_dur=${LEN}[sfx]`);
const sfxWav = join(out, 'sfx.wav');
ff('-filter_complex', graph.join(';'), '-map', '[sfx]', '-t', String(LEN), '-ar', '48000', sfxWav);

// ---- music: the team's track on its own bar grid ------------------------------------------------------------------
// Each piece is cut to its own file first: acrossfade drops its second input when both come from one stream.
const h = XF / 2;
const plan = [[0, J + h], [J - L16 - h, J + h], [J - L16 - h, J + h], [J - L16 - h, J + h], [J - L16 - h, J + h], [J - L24 - h, null]];
const pieces = plan.map(([a, b], i) => {
  const f = join(out, `music-${i}.wav`);
  ff('-i', src, '-vn', '-af', `atrim=${b == null ? `start=${a.toFixed(6)}` : `${a.toFixed(6)}:${b.toFixed(6)}`},asetpts=PTS-STARTPTS`, '-ar', '48000', '-ac', '2', f);
  return f;
});
const chain = [];
let prev = '[0]';
for (let i = 1; i < pieces.length; i++) {
  const lab = i === pieces.length - 1 ? '[music]' : `[x${i}]`;
  chain.push(`${prev}[${i}]acrossfade=d=${XF}:c1=qsin:c2=qsin${lab}`);
  prev = lab;
}
const musicWav = join(out, 'music.wav');
ff(...pieces.flatMap((f) => ['-i', f]), '-filter_complex', chain.join(';'), '-map', '[music]', musicWav);

// ---- encode: music ducked under the voice-over, effects kept light --------------------------------------------------
const inputs = ['-framerate', String(FPS), '-i', join(frames, '%04d.png'), '-i', musicWav, '-i', sfxWav];
let audio =
  `[1:a]atrim=0:${LEN},asetpts=PTS-STARTPTS,aresample=48000,volume=0.8,afade=t=out:st=${(LEN - 0.6).toFixed(3)}:d=0.6[m];` +
  `[2:a]volume=0.7[fx];`;
if (vo) {
  inputs.push('-i', vo);
  audio +=
    `[3:a]atrim=0:${LEN},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,asplit=2[v][key];` +
    `[m][key]sidechaincompress=threshold=0.015:ratio=8:attack=20:release=350:makeup=1[md];` +
    `[md][v][fx]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.84:level=disabled[a]`;
} else {
  audio += `[m][fx]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=disabled[a]`;
}
ff(...inputs, '-filter_complex', `[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v0];` + audio,
  '-map', '[v0]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', String(FPS),
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(LEN), join(out, 'onecup-pitch.mp4'));
const srt = vo && vo.replace(/\.wav$/, '.srt');
if (srt && existsSync(srt)) writeFileSync(join(out, 'onecup-pitch.srt'), readFileSync(srt));
console.log('done:', join(out, 'onecup-pitch.mp4'), `${LEN.toFixed(2)} s`);
