"""Build src/sprites/faces.json for the face-swap feature.

For every student and every frame that shows a face (front: standing + 2 front-walk cells;
side: standing + 2 side-walk cells) we need
  * M       2x3 similarity transform  base-image coords -> atlas-cell coords (SIFT + RANSAC)
  * anc     anchors (x, y, w) of each part in base-image coords
  * pieces  one "blank piece" strip per part: the base's blank skin, with alpha = only where that
            part's ORIGINAL feature was.  Drawing a piece over the atlas erases just that part,
            so parts left on "原本" keep the original drawing of that frame.

Sources (see FRONT / SIDE below). A base must be a pixel-exact copy of the atlas frame with the
features removed; the side bases (pack6) are.  Front bases: set FRONT_SRC to the new pack when it
arrives; until then the retraced pack5 base is used (FACE_ON stays false in the game).
Run from the project root:   python3 faces_build.py
"""
import json, os, base64, io, numpy as np, cv2
from PIL import Image
from scipy import ndimage

META = json.load(open('src/sprites/meta.json'))
STU = {'hero1': '01', 'sailor': '02', 'hoodie': '03', 'sporty': '04', 'green': '05', 'redcap': '06'}
P5 = '../assets/source/characters/packs/pack5/'; P6 = '../assets/source/characters/packs/pack6/'
M5 = json.load(open(P5 + 'manifest.json')); M6 = json.load(open(P6 + 'manifest.json'))
OLD = json.load(open('src/sprites/faces.json')) if os.path.exists('src/sprites/faces.json') else {}

# front: per student -> list of (base file, anchors) for [stand, walkA, walkB]
FRONT_NEW = '../assets/source/characters/packs/pack7/'          # expected: manifest.json with characters[].poses{idle,walk_A,walk_B}
def front_sources(name, cid):
    if os.path.exists(FRONT_NEW + 'manifest.json'):
        man = json.load(open(FRONT_NEW + 'manifest.json'))
        c = next(x for x in man['characters'] if x['id'] == cid)
        return [(FRONT_NEW + c['poses'][p]['file'], c['poses'][p]['anchors'], c['poses'][p].get('editRegions'), c['poses'][p].get('stylePlacements')) for p in ('idle', 'walk_A', 'walk_B')], True
    anc = OLD['chars'][name].get('anc') or next(c for c in M5['characters'] if c['id'] == cid)['anchors']
    base = P5 + '人物/' + cid + '/base.png'
    return [(base, anc, None, None)] * 3, False


def side_sources(name, cid):
    c = next(x for x in M6['characters'] if x['id'] == cid)
    return [(P6 + c['poses'][p]['file'], c['poses'][p]['anchors'], None, None) for p in ('idle', 'walk_A', 'walk_B')]


def rgba(p): return np.array(Image.open(p).convert('RGBA'))


def grey(a):
    al = a[..., 3:4] / 255.
    return cv2.cvtColor((a[..., :3] * al + 128 * (1 - al)).astype(np.uint8), cv2.COLOR_RGB2GRAY)


SIFT = cv2.SIFT_create(4000)
def align(base, cell, head=.55):
    """similarity transform base -> cell, matched on the head region."""
    up = 2.0
    c2 = cv2.resize(cell, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    def hm(a):
        m = np.zeros(a.shape[:2], np.uint8); ys = np.nonzero(a[..., 3] > 60)[0]
        m[ys.min():ys.min() + int((ys.max() - ys.min()) * head)] = 255; return m
    k1, d1 = SIFT.detectAndCompute(grey(base), hm(base))
    k2, d2 = SIFT.detectAndCompute(grey(c2), hm(c2))
    ms = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [m for m, n in ms if m.distance < .75 * n.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good]); dst = np.float32([k2[m.trainIdx].pt for m in good]) / up
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=5000)
    return M, int(inl.sum()), len(good)


def part_regions(shape, anc, parts):
    """generous ellipse per part in base coords (eyes include the brows above them)."""
    R = {}
    for p in parts:
        a = anc[p]; m = np.zeros(shape, np.uint8)
        if p == 'eyes': cv2.ellipse(m, (int(a['x']), int(a['y'] - a['w'] * .06)), (int(a['w'] * .62), int(a['w'] * .38)), 0, 0, 360, 255, -1)
        elif p == 'mouth': cv2.ellipse(m, (int(a['x']), int(a['y'])), (int(max(a['w'], 18) * .9), int(max(a['w'], 18) * .6)), 0, 0, 360, 255, -1)
        else: cv2.ellipse(m, (int(a['x']), int(a['y'])), (int(max(a['w'], 8) * 2.2), int(max(a['w'], 8) * 2.2)), 0, 0, 360, 255, -1)
        R[p] = m > 0
    # eyes stay above, mouth below the line half-way between them
    if 'eyes' in anc and 'mouth' in anc:
        ys = np.arange(shape[0])[:, None]
        split = anc['eyes']['y'] + (anc['mouth']['y'] - anc['eyes']['y']) * .55
        if 'eyes' in R: R['eyes'] &= ys < split
        if 'mouth' in R: R['mouth'] &= ys >= split - (anc['mouth']['y'] - anc['eyes']['y']) * .15
    # a pixel belongs to one part only (nose loses to eyes/mouth)
    if 'nose' in R:
        for q in ('eyes', 'mouth'):
            if q in R: R['nose'] &= ~R[q]
    return R


def build_view(name, sources, cells, parts, exact):
    m = META[name]; cw, ch = m['cw'], m['ch']
    atlas = rgba(f'../assets/source/characters/sheets/prev9_{name}.png')
    Ms, ancs, pieces = {}, {}, {p: [] for p in parts}
    SP = {}
    for (bfile, anc, edit, place), cell in zip(sources, cells):
        base = rgba(bfile); cellimg = atlas[:, cell * cw:(cell + 1) * cw]
        M, ninl, ngood = align(base, cellimg)
        s = np.hypot(M[0, 0], M[1, 0])
        wb = cv2.warpAffine(base, M, (cw, ch), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        diff = np.abs(wb[..., :3].astype(int) - cellimg[..., :3].astype(int)).sum(-1) > (40 if exact else 70)
        diff &= (cellimg[..., 3] > 150) & (wb[..., 3] > 150)
        if edit:   # exact rectangles from the asset pack, grown a little
            regs = {}
            for p in parts:
                r = np.zeros(base.shape[:2], bool)
                for (l, t, rr_, b) in edit.get(p, []): r[max(0, t - 6):b + 6, max(0, l - 6):rr_ + 6] = True
                regs[p] = r
        else:
            regs = part_regions(base.shape[:2], anc, parts)
        for p in parts:
            reg = cv2.warpAffine(regs[p].astype(np.uint8) * 255, M, (cw, ch), flags=cv2.INTER_NEAREST) > 0
            mk = ndimage.binary_dilation(diff & reg, iterations=2) & ndimage.binary_dilation(reg, iterations=1)
            soft = cv2.GaussianBlur(mk.astype(np.float32), (0, 0), 1.0)
            soft = np.clip(soft * 1.6, 0, 1) * (cellimg[..., 3] > 150)
            piece = np.zeros((ch, cw, 4), np.uint8); piece[..., :3] = wb[..., :3]; piece[..., 3] = (soft * 255).astype(np.uint8)
            pieces[p].append(piece)
        Ms[cell] = [round(float(v), 5) for v in M.flatten()]
        ancs[cell] = {p: {k: round(float(v), 2) for k, v in anc[p].items()} for p in parts}
        if place:
            SP[cell] = {sid: {p: {k: round(float(v), 2) for k, v in pl[p].items()} for p in parts if p in pl} for sid, pl in place.items()}
        print(f'  {name} cell {cell}: scale {s:.3f}  inliers {ninl}/{ngood}')
    # crop all pieces to the rows that contain anything
    any_row = np.zeros(ch, bool)
    for p in parts: any_row |= (np.concatenate(pieces[p], 1)[..., 3] > 0).any(1)
    rows = np.nonzero(any_row)[0]
    y0 = max(0, rows.min() - 2); y1 = min(ch, rows.max() + 3)
    out = {}
    for p in parts:
        st = np.concatenate(pieces[p], 1)[y0:y1]; st[st[..., 3] == 0, :3] = 0
        bio = io.BytesIO(); Image.fromarray(st).save(bio, 'WEBP', quality=90, method=6)
        out[p] = 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()
        Image.fromarray(st).save(f'../assets/source/characters/sheets/piece_{name}_{cells[0]}_{p}.png')
    return dict(cells=cells, M=Ms, anc=ancs, sp=SP, y0=int(y0), y1=int(y1), pieces=out)


def uri(p, half=False):
    im = Image.open(p).convert('RGBA')
    if half: im = im.resize((max(2, im.width // 2), max(2, im.height // 2)), Image.LANCZOS)
    bio = io.BytesIO(); im.save(bio, 'WEBP', quality=90, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()


chars = {}
for name, cid in STU.items():
    m = META[name]
    fs, exact = front_sources(name, cid)
    print(name, 'front (exact bases)' if exact else 'front (retraced pack5 base)')
    front = build_view(name, fs, [0] + m['fw'], ['eyes', 'mouth'] if exact else ['eyes', 'nose', 'mouth'], exact)
    print(name, 'side')
    side = build_view(name, side_sources(name, cid), [1] + m['sw'], ['eyes', 'mouth'], True)
    side['dflt'] = int(next(x for x in M6['characters'] if x['id'] == cid)['defaultFaceStyle']) - 1
    chars[name] = dict(kit=cid, front=front, side=side, frontExact=exact)
parts = [{'id': c['id'], 'names': c['featureNames'], 'img': {p: uri(P5 + '人物/' + c['id'] + f'/{p}.png', True) for p in ('eyes', 'nose', 'mouth')}} for c in M5['characters']]
FS = {f['id']: f for f in M6['faceStyles']}
sparts = [{p: uri(P6 + FS[f'{i:02d}']['files'][p]) for p in ('eyes', 'mouth')} for i in range(1, 12)]
json.dump(dict(chars=chars, parts=parts, sparts=sparts), open('src/sprites/faces.json', 'w'))
print('faces.json', os.path.getsize('src/sprites/faces.json') // 1024, 'KB')
