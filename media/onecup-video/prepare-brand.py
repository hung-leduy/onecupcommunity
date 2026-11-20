"""Cuts the One Cup campaign artwork into the layers the video uses.

    python3 prepare-brand.py <how-it-works.jpg> <poster.jpg> <nfc-tags.jpg> <out-dir>

how-it-works.jpg  the "HOW IT WORKS — six steps" board (2576 px wide)
poster.jpg        the orange "ONE CUP — your cup. no drama." poster
nfc-tags.jpg      the product photo of the decorated epoxy NFC tags

Fixes made on the way: the "I am waiting on top" bubble that overlaps panels 4 and 5 is removed
(the video redraws it), the "Milstone" typo on the voucher and the "## gr" placeholder on the
impact card are painted out (the video sets the corrected text on top).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

board_p, poster_p, tags_p, out = sys.argv[1:5]
out = Path(out)
out.mkdir(parents=True, exist_ok=True)

CREAM = np.array([237, 233, 221])
TAUPE = np.array([228, 221, 205])

board = Image.open(board_p).convert('RGB')
K = board.width / 1998  # the crop boxes below were measured on a 1998 px wide view


def crop(box):
    x0, y0, x1, y1 = [round(v * K) for v in box]
    return board.crop((x0, y0, x1, y1))


def near(a, colour, tol):
    return (np.abs(a - colour).max(axis=2) <= tol)


# ---- panels 1–3: clean as they are ----------------------------------------------------------
for name, box in {'p1': (388, 225, 778, 672), 'p2': (806, 225, 1196, 672), 'p3': (1224, 140, 1614, 672)}.items():
    crop(box).save(out / f'{name}.png', optimize=True)

# ---- panel 4: remove the speech bubble (top right), keep the cat and the cups ----------------
p4 = np.asarray(crop((388, 832, 778, 1280))).astype(int)
fg = ~(near(p4, TAUPE, 22) | near(p4, CREAM, 22))
lab, n = ndimage.label(fg)
for i in range(1, n + 1):
    ys, xs = np.where(lab == i)
    if xs.min() > 270 and ys.max() < 125:  # the bubble and its lettering
        p4[lab == i] = 0  # mark
mask = (p4.sum(axis=2) == 0)
h, w = mask.shape
yy, xx = np.mgrid[0:h, 0:w]
# inside the taupe panel (x 7–500, y 4–569, corner radius ~18) → taupe, outside → cream
r = 18
inside = (xx >= 7) & (xx <= 500) & (yy >= 4) & (yy <= 569)
corner = (xx > 500 - r) & (yy < 4 + r) & ((xx - (500 - r)) ** 2 + (yy - (4 + r)) ** 2 > r * r)
inside &= ~corner
p4[mask & inside] = TAUPE
p4[mask & ~inside] = CREAM
Image.fromarray(p4.astype(np.uint8)).save(out / 'p4.png', optimize=True)

# ---- panel 5 (ranking): remove the bubble tail over the top-left corner -----------------------
p5 = np.asarray(crop((802, 812, 1200, 1094))).astype(int)
dark = p5[150, 470].copy()
yy5, xx5 = np.mgrid[0:p5.shape[0], 0:p5.shape[1]]
region = (yy5 < 100) & (xx5 < 150)
orange = (p5[:, :, 0] > 170) & (p5[:, :, 1] > 80) & (p5[:, :, 1] < 175) & (p5[:, :, 2] < 120)
lab, n = ndimage.label(orange & region)
blob = np.zeros_like(orange)
for i in range(1, n + 1):
    blob |= lab == i
blob = ndimage.binary_dilation(ndimage.binary_fill_holes(blob), iterations=10) & region
# panel edge: left x≈14, top y≈8, radius ≈ 18
L, T, R = 14, 8, 18
inside = (xx5 >= L) & (yy5 >= T)
corner = (xx5 < L + R) & (yy5 < T + R) & ((xx5 - (L + R)) ** 2 + (yy5 - (T + R)) ** 2 > R * R)
inside &= ~corner
p5[blob & inside] = dark
p5[blob & ~inside] = CREAM
Image.fromarray(p5[6:].astype(np.uint8)).save(out / 'p5.png', optimize=True)  # drop a 6 px sliver of the bubble on the top edge

# ---- voucher: paint out "Milstone unlocked!" (the video sets "Milestone unlocked!") -----------
v = np.asarray(crop((812, 1092, 1168, 1318))).astype(int)
vy, vx = np.mgrid[0:v.shape[0], 0:v.shape[1]]
orange_v = v[200, 90].copy()
text = (vx > 100) & (vx < 372) & (vy > 170) & (vy < 252)  # only flat orange and the old lettering here
v[text] = orange_v
Image.fromarray(v.astype(np.uint8)).save(out / 'p5b.png', optimize=True)

# ---- impact card: paint out "## gr plastic reduction" ------------------------------------------
c = np.asarray(crop((1208, 818, 1632, 1296))).astype(int)
card = np.array([228, 221, 205])
for x in range(88, 456):
    col = c[:, x]
    y = 535
    while y > 470 and col[y].sum() >= 250:  # yellow under the card
        y -= 1
    while y > 470 and col[y].sum() < 250:  # the card's black bottom frame
        y -= 1
    c[430:y - 1, x] = card  # everything between the circles and the frame
Image.fromarray(c.astype(np.uint8)).save(out / 'p6.png', optimize=True)

# ---- poster: base without the tagline, and the tagline as transparent ink -----------------------
poster = Image.open(poster_p).convert('RGB')
pa = np.asarray(poster).astype(float)
tk = poster.width / 1998
tx0, ty0, tx1, ty1 = [round(v * tk) for v in (60, 150, 560, 255)]
tw = tx1 - tx0
# ink layer: alpha from how much darker each pixel is than the orange paper around it
lum = pa[..., 0] * 0.299 + pa[..., 1] * 0.587 + pa[..., 2] * 0.114
region = lum[ty0:ty1, tx0:tx1]
paper = np.median(lum[ty0:ty1, tx1:tx1 + tw])
alpha = np.clip((paper - 6 - region) / (paper - 45), 0, 1)
ink = np.zeros((ty1 - ty0, tw, 4), dtype=np.uint8)
ink[..., 0], ink[..., 1], ink[..., 2] = 37, 36, 41
ink[..., 3] = (alpha * 255).astype(np.uint8)
Image.fromarray(ink, 'RGBA').save(out / 'poster-tagline.png', optimize=True)
# base: patch the tagline area with the plain paper just to its right (same grain and tone)
pa[ty0:ty1, tx0:tx1] = pa[ty0:ty1, tx1:tx1 + tw]
Image.fromarray(pa.astype(np.uint8)).save(out / 'poster-base.jpg', quality=92)
(out / 'poster-tagline.txt').write_text(f'{tx0} {ty0} {tx1} {ty1} {poster.width} {poster.height}\n')

# ---- NFC tags: cut the three decorated tags out of the product photo ------------------------
t = Image.open(tags_p).convert('RGB')
ta = np.asarray(t).astype(int)
H = 640  # the big product row; the thumbnails below are ignored
sat = ta.max(axis=2) - ta.min(axis=2)
bright = ta.mean(axis=2)
bgmask = (sat < 14) & (bright > 222)
bgmask[H:, :] = True
obj = ndimage.binary_fill_holes(ndimage.binary_closing(~bgmask, iterations=3))
obj = ndimage.binary_opening(obj, iterations=2)
lab, n = ndimage.label(obj)
sizes = ndimage.sum(obj, lab, range(1, n + 1))
keep = [i + 1 for i in np.argsort(sizes)[::-1][:4]]
boxes = []
for i in keep:
    ys, xs = np.where(lab == i)
    boxes.append((xs.min(), ys.min(), xs.max(), ys.max(), i))
boxes.sort()
names = ['tag-avocado', 'tag-bubbletea', 'tag-coffee', None]  # the 4th is the supplier's 'PET ID' sample: not used
for (x0, y0, x1, y1, i), name in zip(boxes, names):
    if name is None:
        continue
    m = ndimage.binary_erosion(lab == i, iterations=1)
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = t.copy()
    rgba.putalpha(alpha)
    pad = 4
    piece = rgba.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    # 2× Lanczos + light sharpening so the tags hold up at video size
    piece = piece.resize((piece.width * 2, piece.height * 2), Image.LANCZOS)
    rgb = piece.convert('RGB').filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    rgb.putalpha(piece.split()[3])
    rgb.save(out / f'{name}.png', optimize=True)
    print(name, rgb.size)
print('done')
