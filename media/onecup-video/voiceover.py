"""Builds the voice-over track from voiceover.json with Kokoro TTS (offline, ONNX).

    python3 voiceover.py <kokoro-v1.0.onnx> <voices-v1.0.bin> <out.wav> [<subtitles.srt>]

Each line is placed 0.18 s after its scene lands and must end 0.3 s before the next scene starts
to slide in. A line that is too long is read faster (up to 1.18×); if it still does not fit, the
script says so and the text should be shortened. Timing constants match timeline.js.
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from scipy.signal import resample_poly

model_p, voices_p, out_p = sys.argv[1:4]
srt_p = sys.argv[4] if len(sys.argv) > 4 else None

BEAT = 60 / 118.0
BAR = 4 * BEAT
BREAK = 432 / 24
END = 2054 / 24
SR = 48000


def at(b):
    if b == 'break':
        return BREAK
    if b == 'end':
        return END
    return 34.389 + (b - 17) * BAR


cfg = json.loads((Path(__file__).parent / 'voiceover.json').read_text())
k = Kokoro(model_p, voices_p)
track = np.zeros((int(END * SR) + SR, 2), dtype=np.float32)
report, subs = [], []
ok = True
for i, line in enumerate(cfg['lines']):
    start = max(at(line['bar']), 0.1) + 0.18  # scene 1 starts at 0 (its bar line falls just before)
    stop = at(line['next']) - (0.6 if line['next'] == 'end' else 0.22)
    window = stop - start
    speed = 1.0
    for _ in range(4):
        audio, sr = k.create(line['text'], voice=cfg['voice'], speed=speed, lang='en-us')
        # trim the model's leading/trailing silence so the line sits exactly where we put it
        idx = np.where(np.abs(audio) > 0.01)[0]
        audio = audio[max(idx[0] - int(0.02 * sr), 0): idx[-1] + int(0.05 * sr)]
        dur = len(audio) / sr
        if dur <= window or speed >= 1.18:
            break
        speed = min(1.18, round(speed * dur / window + 0.01, 3))
    fits = dur <= window
    ok &= fits
    a48 = resample_poly(audio, SR, sr).astype(np.float32)
    a48 *= 0.8 / max(1e-6, np.abs(a48).max())  # same peak level for every line
    s0 = int(start * SR)
    track[s0:s0 + len(a48), 0] += a48
    track[s0:s0 + len(a48), 1] += a48
    report.append(f"{line['scene']:<18} {start:6.2f}–{start + dur:6.2f}s  window {window:4.2f}s  speed {speed:.2f}  {'ok' if fits else 'TOO LONG'}  {line['text']}")
    subs.append((start, start + dur, line['text']))

sf.write(out_p, track[: int(END * SR)], SR, subtype='FLOAT')
print('\n'.join(report))
if srt_p:
    def ts(t):
        h, r = divmod(t, 3600)
        m, s = divmod(r, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"
    Path(srt_p).write_text(''.join(f"{n}\n{ts(a)} --> {ts(b)}\n{t}\n\n" for n, (a, b, t) in enumerate(subs, 1)))
print('all lines fit' if ok else 'SOME LINES ARE TOO LONG')
