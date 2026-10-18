"""Pack the 2026-10-03 action-expansion frames (../assets/source/characters/actions/actions/<pack>/frames/...) into game sprite sheets.

Re-run after dropping a new/updated pack into ../assets/source/characters/actions/actions/<pack>/ (manifest.json + frames/).
Inputs that are never overwritten:  ../assets/source/characters/actions/actions/**, ../assets/source/characters/sprites_orig/sprites_orig/** (the sheets before this pass).
Outputs:  src/sprites/<id>.webp + entries in src/sprites/meta.json

  students  act01d / act01i / act01s ... act06*   (daily / interactions / sports), grid sheets, 246x317 cells
  residents res01..res10  = 3 old standing frames + 12 new walk frames (front/side/back), 264x480 cells
  pets      cat_* / shiba_*  = 20 old frames + 12 new transition frames, 224x224 cells
"""
import json, os
from PIL import Image

R = '../assets/source/characters/actions/actions/'
OUT = 'src/sprites/'
ORIG = '../assets/source/characters/sprites_orig/sprites_orig/'
meta = json.load(open(ORIG + 'meta.json'))
LOOK = {'01': 'hero1', '02': 'sailor', '03': 'hoodie', '04': 'sporty', '05': 'green', '06': 'redcap'}
PACKS = {'student-daily': 'd', 'student-interactions': 'i', 'student-sports': 's', 'student-run': 'r'}
# per-pack cell: (crop_top, cell_w, cell_h). Running is the most-seen animation, so it keeps more resolution (0.75 of the source)
# and a taller crop (the airborne frames rise ~25 px above the standing head).
CELL = {'student-run': (150, 336, 320)}


def save(im, name):
    im.save(OUT + name + '.webp', 'WEBP', quality=86, method=4)


def grid(cells, cw, ch, cols):
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGBA', (cw * cols, ch * rows), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % cols) * cw, (i // cols) * ch), c)
    return sheet, rows


def man(pack):
    return json.load(open(R + pack + '/manifest.json'))


# ---------------- students ----------------
CW, CH = 246, 317           # same cell as the first action pack (act01..06)
SX, SY = CW / 448, CH / 576
for pack, suf in PACKS.items():
    if not os.path.isdir(R + pack):
        continue
    M = man(pack)
    top, cw, ch = CELL.get(pack, (0, CW, CH))
    sx, sy = cw / 448, ch / (576 - top)
    for S in M['subjects']:
        keys = [f['key'] for f in S['frames']]
        cells = [Image.open(R + pack + '/' + f['file']).convert('RGBA').crop((0, top, 448, 576)).resize((cw, ch), Image.LANCZOS) for f in S['frames']]
        sheet, rows = grid(cells, cw, ch, 6)
        sid = 'act' + S['id'] + suf
        save(sheet, sid)
        anims = {}
        for a in S['animations']:
            anims[a['id']] = {'f': [keys.index(fr['key']) for fr in a['frames']],
                              'd': [fr['duration_ms'] / 1000 for fr in a['frames']],
                              'loop': bool(a['loop'])}
        extra = {}
        for f in S['frames']:
            for k in ('seat_anchor', 'head_anchor'):
                if k in f:
                    extra.setdefault(k, {})[f['key']] = [round(f[k][0] * sx, 1), round((f[k][1] - top) * sy, 1)]
        meta[sid] = dict(kind='human', cw=cw, ch=ch, n=len(cells), cols=6, rows=rows, hpx=round(375 * sy, 1),
                         hip=.2, walk=False, stride=False, fw=[], sw=[], bw=[], foot=round(ch - (564 - top) * sy, 1),
                         act=True, keys=keys, anims=anims, look=LOOK[S['id']], pack=pack, **extra)
        print(sid, sheet.size, len(cells))

# ---------------- residents ----------------
M = man('resident-walk')
for S in M['subjects']:
    rid = 'res' + S['id'].split('_')[1]
    old = meta[rid]
    k = old['hpx'] / S['nominal_standing_height_px']          # keep the size the resident already has in game
    CWr, CHr = 264, 480
    foot = 4
    base = Image.open(ORIG + rid + '.webp').convert('RGBA')
    cells = []
    for i in range(old['n']):
        fr = base.crop((i * old['cw'], 0, (i + 1) * old['cw'], old['ch']))
        c = Image.new('RGBA', (CWr, CHr), (0, 0, 0, 0))
        c.paste(fr, ((CWr - old['cw']) // 2, CHr - foot - (old['ch'] - old.get('foot', 3))), fr)
        cells.append(c)
    for f in S['frames']:
        im = Image.open(R + 'resident-walk/' + f['file']).convert('RGBA')
        w, h = round(528 * k), round(960 * k)
        im = im.resize((w, h), Image.LANCZOS)
        c = Image.new('RGBA', (CWr, CHr), (0, 0, 0, 0))
        ax, ay = 264 * k, 952 * k                              # ground anchor after scaling
        c.paste(im, (round(CWr / 2 - ax), round(CHr - foot - ay)), im)
        cells.append(c)
    sheet, rows = grid(cells, CWr, CHr, 5)
    save(sheet, rid)
    meta[rid] = dict(old, cw=CWr, ch=CHr, n=len(cells), cols=5, rows=rows, foot=foot,
                     hip=round(old['hip'] * (old['ch'] - 3) / (CHr - foot), 3),
                     walk=True, walk4=True, stride=True, fw=[3, 4, 5, 6], sw=[7, 8, 9, 10], bw=[11, 12, 13, 14])
    print(rid, sheet.size, 'k=%.3f' % k)

# ---------------- pets ----------------
M = man('pet-transitions')
PET = {'dog_black': 'shiba_black', 'dog_white': 'shiba_white', 'dog_yellow': 'shiba_yellow'}
for S in M['subjects']:
    pid = PET.get(S['id'], S['id'])
    old = meta[pid]
    base = Image.open(ORIG + pid + '.webp').convert('RGBA')
    cells = [base.crop((i * old['cw'], 0, (i + 1) * old['cw'], old['ch'])) for i in range(old['n'])]
    act = dict(old['act'])
    for f in S['frames']:
        im = Image.open(R + 'pet-transitions/' + f['file']).convert('RGBA').resize((224, 224), Image.LANCZOS)
        c = Image.new('RGBA', (224, 224), (0, 0, 0, 0))
        c.paste(im, (0, (224 - 3) - 220), im)                  # ground 440/2=220 -> old sheets' foot (3 px)
        act['t_' + f['key']] = len(cells)
        cells.append(c)
    sheet, rows = grid(cells, 224, 224, 8)
    save(sheet, pid)
    anims = {}
    for a in S['animations']:
        anims[a['id']] = {'f': [act['t_' + fr['key']] for fr in a['frames']],
                          'd': [fr['duration_ms'] / 1000 for fr in a['frames']], 'loop': bool(a['loop'])}
    meta[pid] = dict(old, n=len(cells), cols=8, rows=rows, act=act, anims=anims)
    print(pid, sheet.size)

json.dump(meta, open(OUT + 'meta.json', 'w'), ensure_ascii=False, indent=1)
print('meta entries', len(meta))
