"""Prepare face-swap data: for every student's front frames (cells 0,3,4) find the similarity
transform kit(512x880) -> atlas cell, and build a 'blank face' version of the cell by pasting the kit's
blank skin over the original features.   python3 face_prep.py"""
import json, numpy as np, cv2
from PIL import Image
from scipy import ndimage
K = '../assets/source/characters/packs/pack5/人物/'
MAN = json.load(open('../assets/source/characters/packs/pack5/manifest.json'))
META = json.load(open('src/sprites/meta.json'))
CH = {'hero1': '01', 'sailor': '02', 'hoodie': '03', 'sporty': '04', 'green': '05', 'redcap': '06'}


def rgba(p): return np.array(Image.open(p).convert('RGBA'))


def comp_green(a):
    bg = np.zeros_like(a[..., :3], dtype=np.float32); bg[:] = (128, 128, 128)
    al = a[..., 3:4] / 255.
    return (a[..., :3] * al + bg * (1 - al)).astype(np.uint8)


def face_mask(base, cid):
    """skin region of the blank kit face (connected to face centre)."""
    anc = next(c for c in MAN['characters'] if c['id'] == cid)['anchors']
    cx, cy = anc['eyes']['x'], (anc['eyes']['y'] + anc['mouth']['y']) // 2
    rgb = base[..., :3].astype(int)
    ref = rgb[cy, cx]
    d = np.abs(rgb - ref).sum(-1)
    m = (d < 70) & (base[..., 3] > 200)
    lab, _ = ndimage.label(m)
    m = lab == lab[cy, cx]
    m = ndimage.binary_fill_holes(m)
    return m


def align(kit_rgba, cell_rgba, head_frac=.5):
    """similarity kit -> cell using ORB on the head region."""
    k = comp_green(kit_rgba); c = comp_green(cell_rgba)
    # upscale the small cell so features are comparable
    up = 2.0
    c2 = cv2.resize(c, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    def headmask(a, h):
        m = np.zeros(a.shape[:2], np.uint8)
        ys = np.nonzero(a[..., 3] > 60)[0] if a.shape[2] == 4 else None
        return m
    km = np.zeros(k.shape[:2], np.uint8); ys = np.nonzero(kit_rgba[..., 3] > 60)[0]; km[ys.min():ys.min() + int((ys.max() - ys.min()) * head_frac)] = 255
    cm = np.zeros(c2.shape[:2], np.uint8); cc = cv2.resize(cell_rgba, None, fx=up, fy=up)
    ys2 = np.nonzero(cc[..., 3] > 60)[0]; cm[ys2.min():ys2.min() + int((ys2.max() - ys2.min()) * head_frac)] = 255
    orb = cv2.SIFT_create(4000)
    k1, d1 = orb.detectAndCompute(cv2.cvtColor(k, cv2.COLOR_RGB2GRAY), km)
    k2, d2 = orb.detectAndCompute(cv2.cvtColor(c2, cv2.COLOR_RGB2GRAY), cm)
    bf = cv2.BFMatcher()
    ms = bf.knnMatch(d1, d2, k=2)
    good = [m for m, n in ms if m.distance < .75 * n.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good]); dst = np.float32([k2[m.trainIdx].pt for m in good]) / up
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=5000)
    return M, int(inl.sum()), len(good)


out = {}
for name, cid in CH.items():
    m = META[name]; cw, ch = m['cw'], m['ch']
    atlas = np.array(Image.open(f'../assets/source/characters/sheets/prev9_{name}.png').convert('RGBA'))
    base = rgba(K + cid + '/base.png')
    fm0 = face_mask(base, cid)
    # where the features are (kit default face AND the original atlas face, incl. brows drawn over the bangs)
    anc = next(c for c in MAN['characters'] if c['id'] == cid)['anchors']
    ex, ey, ew, my = anc['eyes']['x'], anc['eyes']['y'], anc['eyes']['w'], anc['mouth']['y']
    box = np.zeros(base.shape[:2], bool)
    box[int(ey - ew * .62):int(my + ew * .3), int(ex - ew * .66):int(ex + ew * .66)] = True
    dflt = rgba(K + cid + '/front_default.png')
    d1 = np.abs(dflt[..., :3].astype(int) - base[..., :3].astype(int)).sum(-1) > 45
    c0 = atlas[:, 0:cw]
    M0, _, _ = align(base, c0)
    back = cv2.warpAffine(c0, cv2.invertAffineTransform(M0), (512, 880), flags=cv2.INTER_LINEAR)
    d2 = np.abs(back[..., :3].astype(int) - base[..., :3].astype(int)).sum(-1) > 70
    skin = ndimage.binary_dilation(fm0, iterations=2)

    def blobs(d):
        """eye pair + mouth centroids of a feature-difference mask (kit coords)."""
        dd = ndimage.binary_closing(d & box & ndimage.binary_erosion(fm0, iterations=3), iterations=2)
        lab, n = ndimage.label(dd); sz = ndimage.sum(dd, lab, range(1, n + 1))
        order = list(np.argsort(sz)[::-1]); cm = [ndimage.center_of_mass(dd, lab, i + 1) for i in range(n)]
        up = [i for i in order if cm[i][0] < (ey + my) / 2][:2]
        lo = [i for i in order if cm[i][0] > (ey + my) / 2 - 5 and i not in up][:1]
        E = sorted([cm[i] for i in up], key=lambda c: c[1])
        if len(E) == 1: E = E * 2
        Mo = cm[lo[0]] if lo else None
        return E, Mo
    Ek, Mk = blobs(d1)      # kit default face
    if cid == '06':  # the kit default for 06 is a wink: use a typical kit layout instead (eyes ~ +8px below anchor, mouth at anchor)
        Ek = [(anc['eyes']['y'] + 8, anc['eyes']['x'] - anc['eyes']['w'] * .30), (anc['eyes']['y'] + 8, anc['eyes']['x'] + anc['eyes']['w'] * .30)]
        Mk = (anc['mouth']['y'], anc['mouth']['x'])
    Eo, Mo = blobs(d2)      # original face in our atlas
    if Mk is None or Mo is None: Mk = Mo = (0, 0)
    spank = abs(Ek[1][1] - Ek[0][1]); spano = abs(Eo[1][1] - Eo[0][1]); sE = spano / spank if spank > 20 and spano > 20 else 1.18
    dex = (Eo[0][1] + Eo[1][1]) / 2 - (Ek[0][1] + Ek[1][1]) / 2; dey = (Eo[0][0] + Eo[1][0]) / 2 - (Ek[0][0] + Ek[1][0]) / 2
    dmx = Mo[1] - Mk[1]; dmy = Mo[0] - Mk[0]
    A = {'eyes': dict(x=anc['eyes']['x'] + dex, y=anc['eyes']['y'] + dey, w=anc['eyes']['w'] * sE),
         'nose': dict(x=anc['nose']['x'] + (dex + dmx) / 2, y=anc['nose']['y'] + (dey + dmy) / 2, w=anc['nose']['w'] * sE),
         'mouth': dict(x=anc['mouth']['x'] + dmx, y=anc['mouth']['y'] + dmy, w=anc['mouth']['w'] * sE)}
    A = {k: {kk: round(float(vv), 2) for kk, vv in v.items()} for k, v in A.items()}
    print(name, 'Ek-anchor', [round(Ek[0][0] - anc['eyes']['y'], 1), round((Ek[0][1] + Ek[1][1]) / 2 - anc['eyes']['x'], 1), round(abs(Ek[1][1] - Ek[0][1]) / anc['eyes']['w'], 3)], 'Mk-anchor', [round(Mk[0] - anc['mouth']['y'], 1), round(Mk[1] - anc['mouth']['x'], 1)])
    print(name, 'anchor shift eyes', round(dex, 1), round(dey, 1), 'mouth', round(dmx, 1), round(dmy, 1), 'scale', round(sE, 3))
    # erase only the original features: skin part gets the kit's blank skin, hair part is inpainted
    feat = ndimage.binary_dilation(d2 & box & (base[..., 3] > 200), iterations=4)
    fskin = (feat & skin).astype(np.float32); fhair = (feat & ~skin).astype(np.uint8)
    soft = cv2.GaussianBlur(fskin, (0, 0), 2.5)
    boxd = ndimage.binary_dilation(box, iterations=40)
    clip = ((base[..., 3] > 128) & boxd).astype(np.float32)
    masks = []
    frames = {}
    blanks = []
    for cell in [0] + m.get('fw', []):
        cellimg = atlas[:, cell * cw:(cell + 1) * cw].copy()
        M, ninl, ngood = align(base, cellimg)
        s = np.hypot(M[0, 0], M[1, 0])
        wb = cv2.warpAffine(base, M, (cw, ch), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        wm = cv2.warpAffine(soft, M, (cw, ch), flags=cv2.INTER_LINEAR)
        wm = np.clip(wm * 1.3, 0, 1)[..., None] * (cellimg[..., 3:4] > 200)
        blank = cellimg.copy().astype(np.float32)
        blank[..., :3] = blank[..., :3] * (1 - wm) + wb[..., :3] * wm
        blank = blank.astype(np.uint8)
        wh = cv2.warpAffine(fhair * 255, M, (cw, ch), flags=cv2.INTER_LINEAR)
        wh = (wh > 60).astype(np.uint8) * (cellimg[..., 3] > 200)
        if wh.any():
            rgb = cv2.inpaint(np.ascontiguousarray(blank[..., :3]), wh.astype(np.uint8), 3, cv2.INPAINT_TELEA)
            blank[..., :3] = rgb
        blanks.append(blank)
        wc = cv2.warpAffine(clip, M, (cw, ch), flags=cv2.INTER_LINEAR)
        mk = np.zeros((ch, cw, 4), np.uint8); mk[..., :3] = 255; mk[..., 3] = np.clip(wc * 255, 0, 255).astype(np.uint8)
        masks.append(mk)
        frames[cell] = [round(float(v), 5) for v in M.flatten()]
    mstrip = np.concatenate(masks, 1)
    rows_ = np.nonzero(mstrip[..., 3].max(1) > 0)[0]; y0 = max(0, rows_.min() - 4); y1 = min(ch, rows_.max() + 5)
    strip = np.concatenate(blanks, 1)[y0:y1]
    strip[strip[..., 3] == 0, :3] = (59, 38, 33)
    Image.fromarray(strip).save(f'src/sprites/face_{name}.webp', 'WEBP', quality=88, method=6)
    Image.fromarray(strip).save(f'../assets/source/characters/sheets/face_{name}.png')
    Image.fromarray(mstrip[y0:y1]).save(f'src/sprites/fmask_{name}.webp', 'WEBP', quality=80, method=6)
    out[name] = dict(kit=cid, cells=[0] + m.get('fw', []), M=frames, y0=int(y0), y1=int(y1), anc=A)
# feature parts (half resolution) of all 11 kit characters
import base64, io
parts = []
for c in MAN['characters']:
    e = {'id': c['id'], 'names': c['featureNames'], 'anchors': c['anchors'], 'img': {}}
    for p in ['eyes', 'nose', 'mouth']:
        im = Image.open(K + c['id'] + f'/{p}.png').convert('RGBA')
        im = im.resize((max(2, im.width // 2), max(2, im.height // 2)), Image.LANCZOS)
        bio = io.BytesIO(); im.save(bio, 'WEBP', quality=90, method=6)
        e['img'][p] = 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()
    parts.append(e)
json.dump(dict(chars=out, parts=parts), open('src/sprites/faces.json', 'w'))
