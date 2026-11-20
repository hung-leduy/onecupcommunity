"""Removes the old voice-over from the team's soundtrack (UVR MDX-Net "Inst HQ 3", ONNX).

    python3 separate.py <model.onnx> <in.wav> <instrumental.wav> [<vocals.wav>]

The model (UVR-MDX-NET-Inst_HQ_3.onnx, from the UVR model repository) predicts the instrumental
spectrogram from the mix: STFT n_fft 6144, hop 1024, the lowest 3072 bins, 256 frames per chunk,
44.1 kHz stereo. The vocals are the mix minus the instrumental.
"""
import sys

import librosa
import numpy as np
import onnxruntime as ort
import soundfile as sf

model_p, in_p, inst_p = sys.argv[1:4]
voc_p = sys.argv[4] if len(sys.argv) > 4 else None

SR, N_FFT, HOP, DIM_F, DIM_T, COMPENSATE = 44100, 6144, 1024, 3072, 256, 1.022
CHUNK = HOP * (DIM_T - 1)
TRIM = N_FFT // 2
GEN = CHUNK - 2 * TRIM

mix, sr = librosa.load(in_p, sr=SR, mono=False)
if mix.ndim == 1:
    mix = np.stack([mix, mix])
n = mix.shape[1]
pad = GEN - n % GEN
padded = np.concatenate([np.zeros((2, TRIM)), mix, np.zeros((2, pad)), np.zeros((2, TRIM))], axis=1)

sess = ort.InferenceSession(model_p, providers=['CPUExecutionProvider'])


def stft(x):  # (2, CHUNK) -> (1, 4, DIM_F, DIM_T)
    s = np.stack([librosa.stft(c, n_fft=N_FFT, hop_length=HOP, window='hann', center=True, pad_mode='reflect') for c in x])
    s = s[:, :DIM_F, :DIM_T]
    return np.stack([s[0].real, s[0].imag, s[1].real, s[1].imag])[None].astype(np.float32)


def istft(spec):  # (1, 4, DIM_F, DIM_T) -> (2, CHUNK)
    s = spec[0]
    full = np.zeros((2, N_FFT // 2 + 1, DIM_T), dtype=np.complex64)
    full[0, :DIM_F] = s[0] + 1j * s[1]
    full[1, :DIM_F] = s[2] + 1j * s[3]
    return np.stack([librosa.istft(full[c], hop_length=HOP, window='hann', center=True, length=CHUNK) for c in range(2)])


out = []
for i in range(0, padded.shape[1] - 2 * TRIM, GEN):
    chunk = padded[:, i:i + CHUNK]
    if chunk.shape[1] < CHUNK:
        chunk = np.pad(chunk, ((0, 0), (0, CHUNK - chunk.shape[1])))
    spec = stft(chunk)
    # average with the prediction on the inverted mix ("denoise"), as UVR does
    pred = 0.5 * sess.run(None, {'input': spec})[0] - 0.5 * sess.run(None, {'input': -spec})[0]
    out.append(istft(pred)[:, TRIM:TRIM + GEN])
inst = np.concatenate(out, axis=1)[:, :n] * COMPENSATE
sf.write(inst_p, inst.T, SR, subtype='FLOAT')
if voc_p:
    sf.write(voc_p, (mix - inst).T, SR, subtype='FLOAT')
print('instrumental', inst.shape, 'peak', float(np.abs(inst).max()))
