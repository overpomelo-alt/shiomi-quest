"""Append back-walk frames (cells 3,4) to each animal atlas.  Run after pack_all.py."""
import json, numpy as np
from PIL import Image
from pack_all import load, split, paste
from scipy import ndimage
META = json.load(open('src/sprites/meta.json'))
P = '../assets/source/characters/packs/pack5/寵物/'
IDS = {'shiba_yellow': '12_1', 'shiba_black': '12_2', 'shiba_white': '12_3',
       'cat_tama': '13_1', 'cat_sumi': '13_2', 'cat_mikan': '13_3', 'cat_nori': '13_4'}


def open_h(mask, r):
    m = ndimage.binary_opening(mask, structure=np.ones((r, r)))
    ys = np.nonzero(m.any(1))[0]
    return ys.max() - ys.min() + 1


for name, pid in IDS.items():
    m = META[name]; cw, ch = m['cw'], m['ch']
    base = Image.open(f'../assets/source/characters/sheets/prev_{name}.png').convert('RGBA').crop((0, 0, cw * 3, ch))
    arr = np.array(base)
    ref = open_h(arr[:, cw:2 * cw, 3] > 60, 5)        # side-walk height
    atlas = Image.new('RGBA', (cw * 5, ch), (0, 0, 0, 0)); atlas.alpha_composite(base)
    for j, fn in enumerate(['back_A.png', 'back_B.png']):
        b = load(P + pid + '/' + fn); f = split(b, 1)[0]
        sh = open_h((b[..., 3] > 60) & f['m'], 9)
        s2 = ref * .95 / sh
        ys, xs = np.nonzero(f['m'] & (b[..., 3] > 60))
        paste(atlas, b, f, s2, 3 + j, cw, ch, xs.mean())
    out = np.array(atlas); out[out[..., 3] == 0, :3] = (59, 38, 33)
    Image.fromarray(out).save(f'src/sprites/{name}.webp', 'WEBP', quality=84, method=6)
    Image.fromarray(out).save(f'../assets/source/characters/sheets/prev5_{name}.png')
    m['n'] = 5; m['bw'] = [3, 4]
    print(name, 'ok')
json.dump(META, open('src/sprites/meta.json', 'w'), indent=1)
