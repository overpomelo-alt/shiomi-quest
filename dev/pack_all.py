"""Build every sprite atlas used by the game from the ChatGPT source sheets.

Humans: one row of 5 cells (front, side-right, back, walkA, walkB), cell 352x512.
Animals: one row of 3 cells (front-sit, side-walkA, side-walkB), cell 320x320.
Writes src/sprites/<id>.webp and src/sprites/meta.json
"""
import json, os, numpy as np
from PIL import Image
from scipy import ndimage

R = '../assets/source/characters/packs/pack3/'
OUT = 'src/sprites/'
os.makedirs(OUT, exist_ok=True)


def load(p):
    a = np.array(Image.open(p).convert('RGBA'))
    # colour-bleed so bilinear filtering never pulls in black from transparent pixels
    solid = a[..., 3] > 128
    idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    a[..., :3] = a[..., :3][idx[0], idx[1]]
    return a


def split(a, cols, rows=1):
    """Split a sheet into a rows x cols grid of figures using connected components."""
    al = a[..., 3]
    H, W = al.shape
    lab, n = ndimage.label(al > 90)
    if n == 0:
        raise ValueError('empty')
    idxs = np.arange(1, n + 1)
    sizes = ndimage.sum(np.ones_like(lab), lab, idxs)
    cms = ndimage.center_of_mass(np.ones_like(lab), lab, idxs)
    owner = np.full(lab.shape, -1, int)
    # cluster the centroids of big components into columns / rows by k-means style split
    big = [(i, cms[i]) for i in range(n) if sizes[i] > 400]
    xs = np.array([c[1] for _, c in big]); ys = np.array([c[0] for _, c in big]); ws = np.array([sizes[i] for i, _ in big])

    def centers(v, w, k, lo, hi):
        c = np.linspace(lo, hi, k * 2 + 1)[1::2]
        for _ in range(30):
            asg = np.argmin(np.abs(v[:, None] - c[None, :]), 1)
            for j in range(k):
                if (asg == j).any():
                    c[j] = np.average(v[asg == j], weights=w[asg == j])
        return np.sort(c)
    cx = centers(xs, ws, cols, 0, W)
    cy = centers(ys, ws, rows, 0, H) if rows > 1 else np.array([H / 2])
    for i in range(n):
        if sizes[i] < 25:
            continue
        y, x = cms[i]
        c = int(np.argmin(np.abs(cx - x))); r = int(np.argmin(np.abs(cy - y)))
        owner[lab == i + 1] = r * cols + c
    d, (iy, ix) = ndimage.distance_transform_edt(owner < 0, return_indices=True)
    own = owner[iy, ix]
    own[(al == 0) | (d > 8)] = -1
    figs = []
    for k in range(rows * cols):
        m = own == k
        ys_, xs_ = np.nonzero(m & (al > 24))
        figs.append(dict(m=m, y0=ys_.min(), y1=ys_.max() + 1, x0=xs_.min(), x1=xs_.max() + 1))
    return figs


def legs_x(f, a):
    m = f['m'] & (a[..., 3] > 24)
    h = f['y1'] - f['y0']
    ys, xs = np.nonzero(m[f['y1'] - int(h * .2):f['y1']])
    return xs.mean()


def body_x(f, a):
    ys, xs = np.nonzero(f['m'] & (a[..., 3] > 24))
    return xs.mean()


def head_metrics(f, a):
    m = f['m'] & (a[..., 3] > 24)
    h = f['y1'] - f['y0']
    top = m[f['y0']:f['y0'] + int(h * .3)]
    ys, xs = np.nonzero(top)
    # robust width: 5th..95th percentile of columns
    return np.percentile(xs, 97) - np.percentile(xs, 3), xs.mean()


def paste(atlas, a, f, scale, cell, cw, ch, ax):
    one = a.copy(); one[~f['m'], 3] = 0
    crop = Image.fromarray(one, 'RGBA').crop((f['x0'], f['y0'], f['x1'], f['y1']))
    nw, nh = max(1, round((f['x1'] - f['x0']) * scale)), max(1, round((f['y1'] - f['y0']) * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    ox = round(cell * cw + cw / 2 - (ax - f['x0']) * scale)
    oy = ch - nh - 3
    layer = Image.new('RGBA', atlas.size, (0, 0, 0, 0))
    layer.alpha_composite(crop, (max(0, ox), oy), (max(0, -ox), 0))
    t = np.array(layer)
    keep = np.zeros(t.shape[:2], bool); keep[:, cell * cw + 2:(cell + 1) * cw - 2] = True
    t[~keep, 3] = 0
    atlas.alpha_composite(Image.fromarray(t, 'RGBA'))
    return nh


def save(atlas, name):
    arr = np.array(atlas)
    arr[arr[..., 3] == 0, :3] = (59, 38, 33)
    Image.fromarray(arr, 'RGBA').save(OUT + name + '.webp', 'WEBP', quality=84, method=6)
    Image.fromarray(arr, 'RGBA').save('../assets/source/characters/sheets/prev_' + name + '.png')


META = {}


def human(name, turn, walk=None, walk_files=None, CW=264, hip_override=None):
    CH, TARGET = 384, 375
    a = load(R + turn)
    figs = split(a, 3)
    axs = [legs_x(f, a) for f in figs]
    H = max(f['y1'] - f['y0'] for f in figs)
    half = max(max(ax - f['x0'], f['x1'] - ax) for f, ax in zip(figs, axs))
    scale = min(TARGET / H, (CW / 2 - 3) / half)
    atlas = Image.new('RGBA', (CW * 5, CH), (0, 0, 0, 0))
    hpx = 0
    for i, (f, ax) in enumerate(zip(figs, axs)):
        hpx = max(hpx, paste(atlas, a, f, scale, i, CW, CH, ax))
    # crotch (back view): lowest opaque pixel on the centre column of cell 2
    arr = np.array(atlas)[..., 3]
    col = arr[:, 2 * CW + CW // 2 - 3:2 * CW + CW // 2 + 4].max(1)
    y = CH - 4
    while y > CH * .5 and col[y] <= 100: y -= 1
    hip = (CH - y) / CH
    if hip < .12 or hip > .45: hip = .27
    walk_ok = False
    fw, fcx = head_metrics(figs[0], a)
    fhx = fcx  # head centre in source coords
    front_legs = axs[0]
    wfs = []
    if walk:
        b = load(R + walk); wf = split(b, 2); wfs = [(b, f) for f in wf]
    elif walk_files:
        for p in walk_files:
            b = load(R + p); wfs.append((b, split(b, 1)[0]))
    for j, (b, f) in enumerate(wfs):
        ww, wcx = head_metrics(f, b)
        s2 = scale * fw / ww
        hs = (f['y1'] - f['y0']) * s2
        # anchor: align head centres (front stand head x relative to its leg anchor)
        ax = wcx - (fhx - front_legs) * (scale / s2)
        paste(atlas, b, f, s2, 3 + j, CW, CH, ax)
        walk_ok = True
        print(f'  walk{j} s2/s={s2/scale:.3f} h={hs:.0f}')
    save(atlas, name)
    if hip_override is not None: hip = hip_override
    META[name] = dict(kind='human', cw=CW, ch=CH, n=5, hpx=hpx, hip=round(hip, 3), walk=walk_ok)
    print(name, 'scale', round(scale, 3), 'hpx', hpx, 'hip', round(hip, 3))


def animals(names, front, fcols, walk, wcols, wrows, walk_ratio):
    CW, CH = 224, 224
    a = load(R + front); ff = split(a, fcols)
    b = load(R + walk); wf = split(b, wcols, wrows)
    for c, name in enumerate(names):
        f = ff[c]
        H = f['y1'] - f['y0']; Wd = f['x1'] - f['x0']
        ws = [wf[r * wcols + c] for r in range(wrows)]
        atlas = Image.new('RGBA', (CW * 3, CH), (0, 0, 0, 0))
        s = min(210 / H, 210 / Wd)
        hpx = paste(atlas, a, f, s, 0, CW, CH, body_x(f, a))
        for r, g in enumerate(ws):
            gh = g['y1'] - g['y0']; gw = g['x1'] - g['x0']
            s2 = min(hpx * walk_ratio / gh, 210 / gw)
            paste(atlas, b, g, s2, 1 + r, CW, CH, body_x(g, b))
        save(atlas, name)
        META[name] = dict(kind='animal', cw=CW, ch=CH, n=3, hpx=hpx)
        print(name, 'hpx', hpx)


if __name__ == '__main__':
    human('hero1', 'characters/01_hero_turnaround.png', walk_files=['characters/01_hero_walk_A.png', 'characters/01_hero_walk_B.png'])
    human('sailor', 'characters/02_sailor_girl.png', 'characters/02_sailor_girl_walk.png')
    human('hoodie', 'characters/03_pink_hoodie_girl.png', 'characters/03_pink_hoodie_girl_walk.png')
    human('sporty', 'characters/04_sporty_girl.png', 'characters/04_sporty_girl_walk.png')
    human('green', 'characters/05_green_hoodie_boy.png', 'characters/05_green_hoodie_boy_walk.png')
    human('redcap', 'characters/06_red_cap_boy.png', 'characters/06_red_cap_boy_walk.png')
    human('grandpa', 'characters/07_grandpa.png')
    human('fisher', 'characters/08_fisherman.png', 'characters/08_fisherman_walk.png')
    human('guard', 'characters/09_crossing_guard.png', 'characters/09_crossing_guard_walk.png')
    human('clerk', 'characters/10_store_clerk.png', 'characters/10_store_clerk_walk.png')
    human('bike', 'characters/11_bicycle_girl.png', CW=528, hip_override=0)
    animals(['shiba_yellow', 'shiba_black', 'shiba_white'], 'pets/12_shiba_front.png', 3, '../pack4/12_shiba_side_walk.png', 3, 2, .92)
    animals(['cat_tama', 'cat_sumi', 'cat_mikan', 'cat_nori'], 'pets/13_cats_front.png', 4, '../pack4/13_cats_side_walk.png', 4, 2, .8)
    json.dump(META, open(OUT + 'meta.json', 'w'), indent=1)
