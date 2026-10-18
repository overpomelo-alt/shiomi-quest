"""Add a 6th cell to each human atlas: the side view with legs opened in a stride
(front half of the legs rotated forward, back half backward, pivoting at the hip)."""
import json, numpy as np
from PIL import Image
META = json.load(open('src/sprites/meta.json'))
ANG = 15
for name, m in META.items():
    if m['kind'] != 'human' or name == 'bike': continue
    cw, ch = m['cw'], m['ch']
    src = Image.open(f'../assets/source/characters/sheets/prev_{name}.png').convert('RGBA')
    src = src.crop((0, 0, cw * 5, ch))           # idempotent
    side = np.array(src.crop((cw, 0, cw * 2, ch)))
    al = side[..., 3]
    ys, xs = np.nonzero(al > 60)
    y1 = ys.max()
    hip_y = int(ch * (1 - m['hip'])) + 2
    band = al[y1 - 70:y1 + 1] > 60
    by, bx = np.nonzero(band)
    ax = bx.mean()
    up = side.copy(); up[hip_y:, :, 3] = 0
    lo = side.copy(); lo[:hip_y, :, 3] = 0
    xx = np.arange(cw)[None, :]
    front = lo.copy(); front[..., 3] = np.where(xx >= ax, lo[..., 3], 0)
    back = lo.copy(); back[..., 3] = np.where(xx < ax, lo[..., 3], 0)
    piv = (ax, hip_y)
    F = Image.fromarray(front).rotate(ANG, resample=Image.BICUBIC, center=piv)
    B = Image.fromarray(back).rotate(-ANG * .8, resample=Image.BICUBIC, center=piv)
    cell = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    lift = 4   # body dips a little in the stride
    cell.alpha_composite(B, (0, -lift)); cell.alpha_composite(F, (0, -lift))
    cell.alpha_composite(Image.fromarray(up))
    # shift everything down so the lowest foot touches the baseline again
    a2 = np.array(cell)[..., 3]; low = np.nonzero(a2 > 60)[0].max()
    cell = cell.transform(cell.size, Image.AFFINE, (1, 0, 0, 0, 1, -(y1 - low)), resample=Image.BICUBIC)
    atlas = Image.new('RGBA', (cw * 6, ch), (0, 0, 0, 0))
    atlas.alpha_composite(src, (0, 0)); atlas.alpha_composite(cell, (cw * 5, 0))
    arr = np.array(atlas); arr[arr[..., 3] == 0, :3] = (59, 38, 33)
    Image.fromarray(arr).save(f'src/sprites/{name}.webp', 'WEBP', quality=86, method=6)
    Image.fromarray(arr).save(f'../assets/source/characters/sheets/prev6_{name}.png')
    m['n'] = 6; m['stride'] = True
    print(name, 'ax', round(ax), 'hip_y', hip_y)
json.dump(META, open('src/sprites/meta.json', 'w'), indent=1)
