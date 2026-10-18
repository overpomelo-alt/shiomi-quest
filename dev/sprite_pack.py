"""Optional extra args: front-walk images (walkA walkB) -> atlas becomes 2048x1024,
row0: front, side, back, walkA; row1: walkB.
Pack a ChatGPT turnaround sheet (FRONT, SIDE-facing-right, BACK on a transparent
background) into a 2048x512 atlas: 4 cells of 512x512, feet on the bottom edge,
horizontally anchored on the legs. Usage: python3 sprite_pack.py in.png out.webp"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
walks = sys.argv[3:]
im = Image.open(src).convert('RGBA')
a = np.array(im)
al = a[..., 3]
mask = al > 24
# split into views by connected components (3 largest), small bits join nearest
lab, n = ndimage.label(al > 100)
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
big = list(np.argsort(sizes)[::-1][:3] + 1)
cent = {b: ndimage.center_of_mass(lab == b)[1] for b in big}
owner = np.zeros_like(lab)
for k in range(1, n + 1):
    if k in big: owner[lab == k] = k
    elif sizes[k - 1] > 30:
        cx = ndimage.center_of_mass(lab == k)[1]
        owner[lab == k] = min(big, key=lambda b: abs(cent[b] - cx))
# faint edge pixels: assign via nearest owned pixel
dist, (iy, ix) = ndimage.distance_transform_edt(owner == 0, return_indices=True)
owner_full = owner[iy, ix]
big.sort(key=lambda b: cent[b])
views = []
for b in big:
    m = (owner_full == b) & (al > 0)
    views.append(m)
frames = []
for vm in views:
    colsx = np.where(vm.any(0))[0]; x0, x1 = colsx[0], colsx[-1] + 1
    sub = vm[:, x0:x1] & mask[:, x0:x1]
    rows = np.where(sub.any(1))[0]
    y0, y1 = rows[0], rows[-1] + 1
    h = y1 - y0
    # anchor x = centroid of the lowest 22% (legs/feet)
    leg = sub[y1 - int(h * .22):y1]
    ys, xs = np.nonzero(leg)
    ax = x0 + xs.mean()
    frames.append(dict(x0=x0, x1=x1, y0=y0, y1=y1, ax=ax, m=vm))
H = max(f['y1'] - f['y0'] for f in frames)
half = max(max(f['ax'] - f['x0'], f['x1'] - f['ax']) for f in frames)
CELL = 512
pad = 6
scale = min((CELL - pad) / H, (CELL / 2 - pad) / half)
# colour-bleed transparent pixels so filtering doesn't create fringes
rgb = a[..., :3].astype(np.float32)
solid = al > 128
idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
bled = rgb[idx[0], idx[1]]
a2 = np.dstack([bled, al.astype(np.float32)]).astype(np.uint8)
src_im = Image.fromarray(a2, 'RGBA')
ROWS = 2 if walks else 1
atlas = Image.new('RGBA', (CELL * 4, CELL * ROWS), (0, 0, 0, 0))
def head_metrics(m):
    ys, xs = np.nonzero(m); y0, y1 = ys.min(), ys.max() + 1; h = y1 - y0
    top = m[y0:y0 + int(h * .42)]
    cols = np.where(top.any(0))[0]
    ty, tx = np.nonzero(top)
    return cols[-1] - cols[0] + 1, tx.mean()   # head/hat width, head centre x
for i, f in enumerate(frames):
    one = a2.copy(); one[~f['m'], 3] = 0
    crop = Image.fromarray(one, 'RGBA').crop((f['x0'], f['y0'], f['x1'], f['y1']))
    w, h = crop.size
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    ox = round(i * CELL + CELL / 2 - (f['ax'] - f['x0']) * scale)
    oy = CELL - nh - 2
    atlas.alpha_composite(crop, (ox, oy))
    if i == 0:
        fw, fcx = head_metrics(f['m'] & mask)
        front_headw = fw * scale
        front_headx = ox + (fcx - f['x0']) * scale   # in atlas px, cell 0
def bleed(arr):
    al = arr[..., 3]; solid = al > 128
    idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    arr = arr.copy(); arr[..., :3] = arr[..., :3][idx[0], idx[1]]; return arr
for j, wp in enumerate(walks):
    wa = bleed(np.array(Image.open(wp).convert('RGBA')))
    wm = wa[..., 3] > 24
    lab, n = ndimage.label(wa[..., 3] > 100)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.isin(lab, [k + 1 for k in range(n) if sizes[k] > 200])
    dist = ndimage.distance_transform_edt(~keep)
    wa[dist > 6, 3] = 0; wm &= dist <= 6
    ww, wcx = head_metrics(wm)
    s2 = front_headw / ww
    ys, xs = np.nonzero(wm); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = Image.fromarray(wa, 'RGBA').crop((x0, y0, x1, y1))
    nw, nh = round((x1 - x0) * s2), round((y1 - y0) * s2)
    crop = crop.resize((nw, nh), Image.LANCZOS)
    cell = 3 if j == 0 else 4
    cx0, cy0 = (cell % 4) * CELL, (cell // 4) * CELL
    ox = round(cx0 + (front_headx) - (wcx - x0) * s2)
    oy = cy0 + CELL - nh - 2
    tmp = Image.new('RGBA', atlas.size, (0, 0, 0, 0)); tmp.alpha_composite(crop, (max(ox, cx0), oy) if ox >= cx0 else (ox, oy))
    # clip to cell
    t = np.array(tmp); cm = np.zeros(t.shape[:2], bool); cm[cy0:cy0 + CELL, cx0:cx0 + CELL] = True; t[~cm, 3] = 0
    atlas.alpha_composite(Image.fromarray(t, 'RGBA'))
    print('walk', j, 'scale', round(s2, 3), 'size', nw, nh)
# fill the RGB of fully transparent atlas pixels with a neutral dark (outline colour)
arr = np.array(atlas)
z = arr[..., 3] == 0
arr[z, :3] = (59, 38, 33)
Image.fromarray(arr, 'RGBA').save(out, 'WEBP', quality=88, method=6)
Image.fromarray(arr, 'RGBA').save(out.rsplit('.', 1)[0] + '_preview.png')
print('frames', [(f['x0'], f['x1'], f['y1'] - f['y0']) for f in frames], 'scale', round(scale, 3))
