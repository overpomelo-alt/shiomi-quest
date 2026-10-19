#!/usr/bin/env python3
"""第十四批: residents Q version (../assets/source/characters/packs/residents_chibi_v2) -> src/sprites/res01..res10.webp, meta.json, resfaces.json

Input sheets: ../assets/source/characters/sprites_orig/res_before_q/ (the pack_actions.py output before this pass, 15 cells of 264x480:
3 standing front/side/back + 4 front / 4 side / 4 back walk frames, foot 4 px above the cell bottom). Safe to re-run.

- The 3 standing frames become the new pack's front / side / back (264x384, foot at y=380), pasted unscaled so the foot sits on the cell's foot line.
- res03 (采玲) and res07 (阿澈) were redrawn; their old long-body walk frames are replaced by the new standing pose of the same direction
  (the pack README: no new walk animation yet, use the standing pose while moving).
- The other 8 keep their walk frames, shrunk around the foot so the walking figure is as tall as the new standing figure.
- hpx = the new standing figure's visible height, so the in-world height (meta h) does not change.
- Dialogue portraits (resfaces.json) come from the pack's expressions/ (400x400 -> 180x180).
"""
import base64, io, json
from PIL import Image

PK = '../assets/source/characters/packs/residents_chibi_v2/'
OLD = '../assets/source/characters/sprites_orig/res_before_q/'
OUT = 'src/sprites/'
M = json.load(open(PK + 'manifest.json'))
alias = M.get('aliases') or {}
meta = json.load(open(OUT + 'meta.json'))
old_meta = json.load(open(OLD + 'meta.json'))
faces = json.load(open(OLD + 'resfaces.json'))
REDRAWN = {'res03', 'res07'}
CW, CH, FOOT = 264, 480, 4
FY = CH - FOOT                      # foot line in the cell (476)

for r in M['residents']:
    rid = 'res' + r['id'][-2:]
    om = old_meta[rid]
    sheet = Image.open(OLD + rid + '.webp').convert('RGBA')
    cols = om['cols']
    cell = lambda i: sheet.crop(((i % cols) * CW, (i // cols) * CH, (i % cols + 1) * CW, (i // cols + 1) * CH))
    new = {}
    for v in ('front', 'side', 'back'):
        a = r['assets'][v]
        im = Image.open(PK + r['directory'] + '/' + a['file']).convert('RGBA')
        c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        c.paste(im, (CW // 2 - a['foot_anchor'][0], FY - a['foot_anchor'][1]), im)
        new[v] = c
    vis_new = r['visible_height_px']
    st0 = cell(0).split()[3].getbbox()
    vis_old = FY - st0[1]
    k = vis_new / vis_old
    cells = [new['front'], new['side'], new['back']]
    for i in range(3, om['n']):
        if rid in REDRAWN:
            cells.append(new['front'] if i in om['fw'] else new['side'] if i in om['sw'] else new['back'])
            continue
        fr = cell(i)
        w, h = round(CW * k), round(CH * k)
        fr = fr.resize((w, h), Image.LANCZOS)
        c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        c.paste(fr, (round(CW / 2 - CW / 2 * k), round(FY - FY * k)), fr)
        cells.append(c)
    rows = (len(cells) + cols - 1) // cols
    out = Image.new('RGBA', (cols * CW, rows * CH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        out.paste(c, ((i % cols) * CW, (i // cols) * CH))
    out.save(OUT + rid + '.webp', 'WEBP', quality=86, method=4)
    m = dict(om, hpx=vis_new, q=2)
    if rid in REDRAWN:
        m['stride'] = False                 # identical frames: no stride baking
        m['hip'] = .3
    meta[rid] = m
    # dialogue portraits
    fd = {}
    for ek, e in r['expressions'].items():
        im = Image.open(PK + r['directory'] + '/' + e['file']).convert('RGBA').resize((180, 180), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=84, method=6)
        fd[ek] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    faces[rid] = fd
    print(rid, r['name_zh'], 'visible', vis_old, '->', vis_new, 'walk k=%.3f' % k, 'redrawn' if rid in REDRAWN else '')

json.dump(meta, open(OUT + 'meta.json', 'w'), ensure_ascii=False)
json.dump(faces, open(OUT + 'resfaces.json', 'w'), ensure_ascii=False)
