"""Append real side / back walk poses (2 per sheet) to a human atlas.
Frame lists are written to meta: fw (front walk), sw (side walk), bw (back walk).
Run after pack_all.py and bake_stride.py.   python3 add_walks.py"""
import json, os, numpy as np
from PIL import Image
from pack_all import load, split, paste
from scipy import ndimage

META = json.load(open('src/sprites/meta.json'))
P4 = '../assets/source/characters/packs/pack4/'
P5 = '../assets/source/characters/packs/pack5/人物/'
EXTRA0 = {'hero1': dict(side=P4 + '01_hero_side_walk.png', back='../assets/source/characters/sheets/hero1_back_walk.png'),
         'sailor': dict(side=P4 + '02_sailor_girl_side_walk.png'), 'hoodie': dict(side=P4 + '03_pink_hoodie_girl_side_walk.png'),
         'sporty': dict(side=P4 + '04_sporty_girl_side_walk.png'), 'green': dict(side=P4 + '05_green_hoodie_boy_side_walk.png'),
         'redcap': dict(side=P4 + '06_red_cap_boy_side_walk.png'), 'grandpa': dict(side=P4 + '07_grandpa_side_walk.png'),
         'fisher': dict(side=P4 + '08_fisherman_side_walk.png'), 'guard': dict(side=P4 + '09_crossing_guard_side_walk.png'),
         'clerk': dict(side=P4 + '10_store_clerk_side_walk.png'), 'bike': dict(side=P4 + '11_bicycle_girl_side_walk.png')}
EXTRA = {}
for i, k in enumerate(['hero1', 'sailor', 'hoodie', 'sporty', 'green', 'redcap', 'grandpa', 'fisher', 'guard', 'clerk', 'bike']):
    e = dict(EXTRA0[k])
    if k != 'hero1':
        e['back'] = [f'{P5}{i + 1:02d}/back_A.png', f'{P5}{i + 1:02d}/back_B.png']
    EXTRA[k] = e


def cell_head(arr, i, cw):
    al = arr[:, i * cw:(i + 1) * cw, 3] > 24
    ys, xs = np.nonzero(al); y0, y1 = ys.min(), ys.max() + 1
    top = al[y0:y0 + int((y1 - y0) * .3)]
    ty, tx = np.nonzero(top)
    return np.percentile(tx, 97) - np.percentile(tx, 3), tx.mean(), y1 - y0


def open_h(mask, r):
    m = ndimage.binary_opening(mask, structure=np.ones((r, r)))
    ys = np.nonzero(m.any(1))[0]
    return ys.max() - ys.min() + 1


def src_head(a, f):
    m = f['m'] & (a[..., 3] > 24)
    h = f['y1'] - f['y0']
    ty, tx = np.nonzero(m[f['y0']:f['y0'] + int(h * .3)])
    return np.percentile(tx, 97) - np.percentile(tx, 3), tx.mean()


for name, m in META.items():
    if m['kind'] != 'human': continue
    cw, ch = m['cw'], m['ch']
    pv = f'../assets/source/characters/sheets/prev6_{name}.png' if name != 'bike' else f'../assets/source/characters/sheets/prev_{name}.png'
    base = Image.open(pv).convert('RGBA')
    n = 6
    m['fw'] = [3, 4] if m.get('walk') else []
    m['sw'] = [5]
    m['bw'] = []
    ex = EXTRA.get(name)
    if not ex:
        m['n'] = 6; continue
    cells = []
    arr = np.array(base)
    for key, ref in (('side', 1), ('back', 2)):
        if key not in ex: continue
        if isinstance(ex[key], list):
            pairs = [(load(p),) for p in ex[key]]
            pairs = [(t[0], split(t[0], 1)[0]) for t in pairs]
        else:
            b0 = load(ex[key]); pairs = [(b0, f) for f in split(b0, 2)]
        hw, hcx, hh = cell_head(arr, ref, cw)
        rh = open_h(arr[:, ref * cw:(ref + 1) * cw, 3] > 60, 5)
        for b, f in pairs:
            ww, wcx = src_head(b, f)
            sh = open_h((b[..., 3] > 60) & f['m'], 13)
            s2 = rh * (.97 if key == 'side' else .985) / sh
            ax = wcx - (hcx - cw / 2) / s2
            cells.append((key, b, f, s2, ax))
            print(name, key, 'scale', round(s2, 3), 'h', round((f['y1'] - f['y0']) * s2), 'ref h', hh)
    # side walk replaces the baked stride (cell 5)
    total = 5 + len(cells)
    atlas = Image.new('RGBA', (cw * total, ch), (0, 0, 0, 0))
    atlas.alpha_composite(base.crop((0, 0, cw * 5, ch)))
    sw, bw = [], []
    for k, (key, b, f, s2, ax) in enumerate(cells):
        paste(atlas, b, f, s2, 5 + k, cw, ch, ax)
        (sw if key == 'side' else bw).append(5 + k)
    out = np.array(atlas); out[out[..., 3] == 0, :3] = (59, 38, 33)
    Image.fromarray(out).save(f'src/sprites/{name}.webp', 'WEBP', quality=86, method=6)
    Image.fromarray(out).save(f'../assets/source/characters/sheets/prev9_{name}.png')
    m['n'] = total; m['sw'] = sw or [5]; m['bw'] = bw
json.dump(META, open('src/sprites/meta.json', 'w'), indent=1)
print(json.dumps(META['hero1']))
