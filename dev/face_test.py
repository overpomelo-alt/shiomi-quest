import json, numpy as np, cv2, sys
from PIL import Image
K = '../assets/source/characters/packs/pack5/人物/'
MAN = json.load(open('../assets/source/characters/packs/pack5/manifest.json')); CHS = MAN['characters']
F = json.load(open('src/sprites/faces.json'))['chars']; META = json.load(open('src/sprites/meta.json'))
def compose(name, parts):
    f = F[name]; m = META[name]; cw, ch = m['cw'], m['ch']
    me = next(c for c in CHS if c['id'] == f['kit'])
    layer = Image.new('RGBA', (512, 880), (0, 0, 0, 0))
    for p in ['eyes', 'nose', 'mouth']:
        src = CHS[parts.get(p, CHS.index(me))]
        im = Image.open(K + src['id'] + f'/{p}.png').convert('RGBA')
        a = f['anc'][p]; w = a['w']; h = im.height * w / im.width
        im = im.resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS)
        layer.alpha_composite(im, (round(a['x'] - w / 2), round(a['y'] - h / 2)))
    L = np.array(layer).astype(np.float32); L[..., :3] *= L[..., 3:4] / 255
    atlas = np.array(Image.open(f'../assets/source/characters/sheets/prev9_{name}.png').convert('RGBA'))
    blank = np.array(Image.open(f'../assets/source/characters/sheets/face_{name}.png').convert('RGBA'))
    mask = np.array(Image.open(f'src/sprites/fmask_{name}.webp').convert('RGBA'))[..., 3:4] / 255
    y0, y1 = f['y0'], f['y1']; cells = []
    for i, c in enumerate(f['cells']):
        b = atlas[:, c * cw:(c + 1) * cw].astype(np.float32)
        b[y0:y1] = blank[:, i * cw:(i + 1) * cw]
        M = np.array(f['M'][str(c)]).reshape(2, 3)
        wp = cv2.warpAffine(L, M, (cw, ch), flags=cv2.INTER_AREA)
        mk = np.zeros((ch, cw, 1)); mk[y0:y1] = mask[:, i * cw:(i + 1) * cw]
        wp = wp * mk
        al = wp[..., 3:4] / 255
        b[..., :3] = b[..., :3] * (1 - al) + wp[..., :3]
        cells.append(b.astype(np.uint8)[20:190])
    return np.concatenate(cells, 1)
rows = []
for name, parts in [('sailor', {}), ('sailor', {'eyes': 2, 'nose': 3, 'mouth': 2}), ('sporty', {}), ('sporty', {'eyes': 0, 'mouth': 1}), ('hero1', {}), ('hero1', {'eyes': 1, 'mouth': 5}), ('green', {}), ('green', {'eyes': 3, 'mouth': 0}), ('redcap', {}), ('hoodie', {'eyes': 5, 'mouth': 3})]:
    r = compose(name, parts); im = Image.new('RGBA', (r.shape[1], r.shape[0]), (90, 140, 110, 255)); im.alpha_composite(Image.fromarray(r)); rows.append(im)
o = Image.new('RGB', (rows[0].width * 2, 170 * 5))
for i, r in enumerate(rows): o.paste(r.convert('RGB'), ((i % 2) * rows[0].width, (i // 2) * 170))
o = o.resize((o.width * 2, o.height * 2), Image.LANCZOS)
o.save('/tmp/claude-0/-home-claude/a676c0ce-ebf8-56e9-8b02-9531d3b0bd87/scratchpad/facetest2.png')
