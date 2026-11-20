// Renders the 30 s "How One Cup works" segment and splices it into the team's original video.
//
//   node render.mjs <original.mp4> <outDir>                 full render
//   node render.mjs <original.mp4> <outDir> --preview=1.5,4  stills at the given segment times
//   node render.mjs <original.mp4> <outDir> --reuse-frames    skip the frame capture
//
// Output (in outDir): how-it-works-30s.mp4 (the segment with its music) and onecup-final.mp4
// (original 0–27.21 s + segment + original from 28.75 s; ≈ 71 s, under the 90 s limit).
//
// Splice points (24 fps):
//   CUT    = 653  first original frame replaced (the "Tap & go / Scan & go" shot is still at this point)
//   RESUME = 690  first original frame after the segment (the white flash before "See your impact")
// Music: the original track keeps playing into the segment, then its 16-beat groove phrase
// (34.389 s → 26.254 s, measured by cross-correlation) repeats twice and a 24-beat jump lands back
// on the original timeline, so from the resume point the picture and the music are in sync again.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const [src, outArg = 'out', ...rest] = process.argv.slice(2);
if (!src || !existsSync(src)) throw new Error('usage: node render.mjs <original.mp4> <outDir> [--preview=t1,t2]');
const out = resolve(outArg);
const preview = rest.find((a) => a.startsWith('--preview='))?.slice(10).split(',').map(Number);
const reuse = rest.includes('--reuse-frames'); // keep frames from an earlier run (audio/splice tweaks only)
mkdirSync(out, { recursive: true });

const FPS = 24, CUT = 653, RESUME = 690, SEG = 720; // SEG frames = 30.000 s
const J = 34.389, L16 = 8.135583, L24 = 12.203375, XF = 0.03; // music splice (s)
const SEG_START = CUT / FPS;

const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

// Drop the colour chunks ffmpeg writes into PNGs (gAMA/cHRM/cICP): Chromium honours them and
// renders the still darker than the video it came from, which shows at the cut.
function stripPngColour(file) {
  const b = readFileSync(file), keep = [b.subarray(0, 8)];
  for (let i = 8; i < b.length; ) {
    const n = b.readUInt32BE(i), type = b.toString('latin1', i + 4, i + 8);
    if (!['gAMA', 'cHRM', 'cICP', 'iCCP', 'sRGB'].includes(type)) keep.push(b.subarray(i, i + 12 + n));
    i += 12 + n;
  }
  writeFileSync(file, Buffer.concat(keep));
}

// 1 · stills from the original for the hand-off in and out of the segment
for (const [n, name] of [[CUT, 'orig-start'], [RESUME, 'orig-end']]) {
  const f = join(here, `assets/${name}.png`);
  ff('-i', src, '-vf', `select=eq(n\\,${n}),scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24`, '-frames:v', '1', f);
  stripPngColour(f);
}

// 2 · frames
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, 'index.html')).href);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
});
const cues = await page.evaluate(() => window.__cues);
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
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  for (let f = 0; f < SEG; f++) {
    await page.evaluate((x) => window.__seek(x), f / FPS);
    await page.screenshot({ path: join(frames, `${String(f).padStart(4, '0')}.png`) });
    if (f % 120 === 0) console.log('frame', f);
  }
}
await browser.close();
writeFileSync(join(out, 'cues.json'), JSON.stringify(cues));

// 3 · sound effects (synthesised, kept well under the music)
const SFX = {
  pop: "aevalsrc='0.32*sin(2*PI*t*(480+700*exp(-t*55)))*exp(-t*26)':s=48000:d=0.2",
  tick: "aevalsrc='0.16*sin(2*PI*1500*t)*exp(-t*60)+0.08*sin(2*PI*2250*t)*exp(-t*80)':s=48000:d=0.12",
  blip: "aevalsrc='0.16*sin(2*PI*1760*t)*exp(-t*35)':s=48000:d=0.15",
  scan: "aevalsrc='0.10*sin(2*PI*(900*t+1400*t*t))*exp(-t*5)':s=48000:d=0.5",
  nfc: "aevalsrc='0.20*(sin(2*PI*2093*t)+0.25*sin(2*PI*6279*t))*min(1\\,t*400)*lt(t\\,0.13)':s=48000:d=0.14",
  ding: "aevalsrc='0.22*sin(2*PI*1318.5*t)*exp(-t*6)+0.2*gte(t\\,0.09)*sin(2*PI*1975.5*(t-0.09))*exp(-(t-0.09)*5)':s=48000:d=0.9",
  chime: "aevalsrc='0.16*(sin(2*PI*1046.5*t)*exp(-t*5)+gte(t\\,0.07)*sin(2*PI*1318.5*(t-0.07))*exp(-(t-0.07)*5)+gte(t\\,0.14)*sin(2*PI*1568*(t-0.14))*exp(-(t-0.14)*5)+gte(t\\,0.21)*sin(2*PI*2093*(t-0.21))*exp(-(t-0.21)*4))':s=48000:d=1.2",
  whoosh: 'anoisesrc=color=pink:amplitude=0.30:s=48000:d=0.9:seed=3,highpass=f=300,lowpass=f=5000,afade=t=in:d=0.55:curve=exp,afade=t=out:st=0.55:d=0.35',
  swish: 'anoisesrc=color=pink:amplitude=0.22:s=48000:d=0.45:seed=5,highpass=f=600,lowpass=f=6000,afade=t=in:d=0.25:curve=exp,afade=t=out:st=0.25:d=0.2',
  riser: "anoisesrc=color=white:amplitude=0.12:s=48000:d=0.8:seed=7,highpass=f=1200,afade=t=in:d=0.8:curve=exp",
};
const graph = [];
cues.forEach(([t, kind], i) => {
  graph.push(`${SFX[kind]},aformat=channel_layouts=stereo,adelay=${Math.round(t * 1000)}:all=1[s${i}]`);
});
graph.push(`${cues.map((_, i) => `[s${i}]`).join('')}amix=inputs=${cues.length}:normalize=0:duration=longest,apad=whole_dur=${SEG / FPS}[sfx]`);
const sfxWav = join(out, 'sfx.wav');
ff('-filter_complex', graph.join(';'), '-map', '[sfx]', '-t', String(SEG / FPS), '-ar', '48000', sfxWav);

// 4 · music: original track with the groove phrase looped. Each piece is cut to its own file first:
// acrossfade drops its second input when both branches come from one decoded stream.
const h = XF / 2;
const pieces = [
  [0, J + h],
  [J - L16 - h, J + h],
  [J - L16 - h, J + h],
  [J - L24 - h, null],
].map(([a, b], i) => {
  const f = join(out, `music-${i}.wav`);
  ff('-i', src, '-vn', '-af', `atrim=${b == null ? `start=${a.toFixed(6)}` : `${a.toFixed(6)}:${b.toFixed(6)}`},asetpts=PTS-STARTPTS`,
    '-ar', '48000', '-ac', '2', f);
  return f;
});
const musicWav = join(out, 'music.wav');
ff(...pieces.flatMap((f) => ['-i', f]), '-filter_complex',
  `[0][1]acrossfade=d=${XF}:c1=qsin:c2=qsin[x1];[x1][2]acrossfade=d=${XF}:c1=qsin:c2=qsin[x2];[x2][3]acrossfade=d=${XF}:c1=qsin:c2=qsin[music]`,
  '-map', '[music]', musicWav);

// 5 · the segment on its own (music slice + sfx), and the full spliced video
const seg = join(out, 'segment-video.mp4');
ff('-framerate', String(FPS), '-i', join(frames, '%04d.png'),
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', // same matrix and range as the original
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-colorspace', 'bt709', '-color_primaries', 'bt709',
  '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(FPS), seg);
ff('-i', seg, '-i', musicWav, '-i', sfxWav, '-filter_complex',
  `[1:a]atrim=${SEG_START}:${SEG_START + SEG / FPS},asetpts=PTS-STARTPTS,volume=0.85,afade=t=in:d=0.3,afade=t=out:st=${SEG / FPS - 0.4}:d=0.4[m];` +
  `[m][2:a]amix=inputs=2:normalize=0,alimiter=limit=0.84:level=disabled[a]`,
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', join(out, 'how-it-works-30s.mp4'));

const sfxDelay = Math.round(SEG_START * 1000);
ff('-i', src, '-i', seg, '-i', musicWav, '-i', sfxWav, '-filter_complex',
  `[0:v]trim=end_frame=${CUT},setpts=PTS-STARTPTS,format=yuv420p[v1];` +
  `[1:v]setpts=PTS-STARTPTS,format=yuv420p[v2];` +
  `[0:v]trim=start_frame=${RESUME},setpts=PTS-STARTPTS,format=yuv420p[v3];` +
  `[v1][v2][v3]concat=n=3:v=1:a=0[v];` +
  `[3:a]adelay=${sfxDelay}:all=1[sx];[2:a]volume=0.85[mu];[mu][sx]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=disabled[a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', join(out, 'onecup-final.mp4'));
console.log('done:', join(out, 'onecup-final.mp4'));
