"""Side-profile face data (pack6): per student, align blank side bases to atlas side cells (1, walkA, walkB),
bake blank cells and store transforms + anchors.  Adds 'side' to faces.json and side part images."""
import json, base64, io, numpy as np, cv2
from PIL import Image
from scipy import ndimage
from face_prep import align
P = '../assets/source/characters/packs/pack6/'
MAN = json.load(open(P + 'manifest.json'))
META = json.load(open('src/sprites/meta.json'))
FJ = json.load(open('src/sprites/faces.json'))
CH = {'hero1': '01', 'sailor': '02', 'hoodie': '03', 'sporty': '04', 'green': '05', 'redcap': '06'}
FS = {f['id']: f for f in MAN['faceStyles']}
for name, cid in CH.items():
    m = META[name]; cw, ch = m['cw'], m['ch']
    atlas = np.array(Image.open(f'../assets/source/characters/sheets/prev9_{name}.png').convert('RGBA'))
    c = next(x for x in MAN['characters'] if x['id'] == cid)
    cells = [1] + m['sw']
    blanks, Ms, ancs = [], {}, {}
    for cell, pose in zip(cells, ['idle', 'walk_A', 'walk_B']):
        Pz = c['poses'][pose]
        base = np.array(Image.open(P + Pz['file']).convert('RGBA'))
        cellimg = atlas[:, cell * cw:(cell + 1) * cw].copy()
        M, ninl, ngood = align(base, cellimg)
        s = np.hypot(M[0, 0], M[1, 0])
        wb = cv2.warpAffine(base, M, (cw, ch), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))
        # region to replace: ellipses around the eye and mouth anchors
        reg = np.zeros(base.shape[:2], np.uint8)
        for part, k in (('eyes', (1.1, 2.3)), ('mouth', (1.3, 1.6))):
            a = Pz['anchors'][part]
            cv2.ellipse(reg, (int(a['x']), int(a['y'])), (int(a['w'] * k[0]), int(a['w'] * k[1] * (1.0 if part == 'eyes' else .8))), 0, 0, 360, 255, -1)
        reg = cv2.GaussianBlur(reg.astype(np.float32) / 255, (0, 0), 6)
        wr = cv2.warpAffine(reg, M, (cw, ch), flags=cv2.INTER_LINEAR)[..., None] * (cellimg[..., 3:4] > 200) * (wb[..., 3:4] > 200)
        blank = cellimg.astype(np.float32); blank[..., :3] = blank[..., :3] * (1 - wr) + wb[..., :3] * wr
        blanks.append(blank.astype(np.uint8))
        Ms[cell] = [round(float(v), 5) for v in M.flatten()]
        ancs[cell] = Pz['anchors']
        print(name, pose, 'cell', cell, 'scale', round(s, 4), 'inliers', ninl, '/', ngood)
    strip = np.concatenate(blanks, 1)
    diff = np.abs(strip.astype(int) - np.concatenate([atlas[:, c_ * cw:(c_ + 1) * cw] for c_ in cells], 1).astype(int)).sum(-1) > 6
    rows = np.nonzero(diff.any(1))[0]; y0 = max(0, rows.min() - 6); y1 = min(ch, rows.max() + 7)
    st = strip[y0:y1]; st[st[..., 3] == 0, :3] = (59, 38, 33)
    bio = io.BytesIO(); Image.fromarray(st).save(bio, 'WEBP', quality=88, method=6)
    Image.fromarray(st).save(f'../assets/source/characters/sheets/sface_{name}.png')
    FJ['chars'][name]['side'] = dict(cells=cells, M=Ms, anc=ancs, y0=int(y0), y1=int(y1), dflt=int(c['defaultFaceStyle']) - 1,
                                     blank='data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode())
sp = []
for i in range(1, 12):
    f = FS[f'{i:02d}']; e = {}
    for part in ('eyes', 'mouth'):
        bio = io.BytesIO(); Image.open(P + f['files'][part]).convert('RGBA').save(bio, 'WEBP', quality=90, method=6)
        e[part] = 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()
    sp.append(e)
FJ['sparts'] = sp
json.dump(FJ, open('src/sprites/faces.json', 'w'))
