#!/usr/bin/env python3
"""Teacher room v3 (../assets/source/rooms/teacher_room/teacher_room_v3) -> the cabin room: src/troom/<sk>_*.webp, room.json[sk], room.json['rest'][sk]
   Mart (../assets/source/rooms/mart/mart_v3)                    -> src/troom/mart_<sk>_*.webp, room.json['mart'][sk]"""
import json, os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'src/troom')
RJ = os.path.join(OUT, 'room.json')
R = json.load(open(RJ))
r = lambda v: round(v)
pt = lambda p: [r(p[0]), r(p[1])]
rect4 = lambda b: [[r(b[0]), r(b[1])], [r(b[0] + b[2]), r(b[1])], [r(b[0] + b[2]), r(b[1] + b[3])], [r(b[0]), r(b[1] + b[3])]]


def crop_save(pk, src, name, q=86):
    im = Image.open(os.path.join(pk, src)).convert('RGBA')
    bb = im.split()[3].getbbox()
    c = im.crop(bb)
    c.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=q, method=6)
    return [bb[0], bb[1]], c.size


def base(pk, L, pre, sk):
    Image.open(os.path.join(pk, L['background'])).convert('RGB').save(os.path.join(OUT, f'{pre}{sk}_bg.webp'), 'WEBP', quality=88, method=6)
    D = {'w': L['canvas']['width'], 'h': L['canvas']['height']}
    D['walk'] = [{'outer': [pt(p) for p in L['walk']['outer']], 'holes': [[pt(p) for p in h] for h in L['walk']['holes']]}]
    occ = []
    for o in L['occluders']:
        name = f'{pre}{sk}_o_{o["id"]}'
        (x, y), (w, h) = crop_save(pk, o['file'], name, 88)
        sl = o.get('sort_line')
        occ.append({'id': o['id'], 'file': name, 'x': x, 'y': y, 'sort': r(o['sort_y']),
                    'line': [[sl[0], sl[1]], [sl[2], sl[3]]] if sl else None, 'b': [x, y, w, h]})
    D['occ'] = occ
    e = L['exit']
    D['exit'] = {'polygon': [pt(p) for p in e['polygon']], 'center': pt(e['center']), 'spawn': pt(e['spawn']), 'facing': e.get('facing', 'back')}
    D['acc'] = {k: pt(v) for k, v in L['acc'].items()}
    pp = L['preview_character_perspective']; ch = L['preview_character_height_px']
    D['hh'] = [r(pp['back_y']), r(pp['front_y']), r(ch * pp['back_scale']), ch]
    cs = L.get('content_slots', {})
    D['slots'] = {k: [r(x) for x in v] for k, v in cs.items() if isinstance(v, list)}
    D['quads'] = {k: [pt(p) for p in v] for k, v in L.get('content_slot_quads', {}).items()}
    own = {}
    for k, o in L.get('content_slot_owners', {}).items():
        if o: own.setdefault(o, []).append(k)
    D['own'] = own
    return D


# ---------- teacher room -> cabin
pk = os.path.join(ROOT, '../assets/source/rooms/teacher_room/teacher_room_v3')
M = json.load(open(os.path.join(pk, 'manifest.json')))
for f in glob.glob(os.path.join(OUT, 'landscape_*.webp')) + glob.glob(os.path.join(OUT, 'portrait_*.webp')) + glob.glob(os.path.join(OUT, 'rest_*.webp')):
    os.remove(f)
R['rest'] = {}
for sk in ('landscape', 'portrait'):
    L = M['rooms'][sk]
    D = base(pk, L, '', sk)
    # photo frames keep the names the game already fills
    for a, b in (('photo_1', 'left_frame_1'), ('photo_2', 'left_frame_2')):
        if a in D['slots']: D['slots'][b] = D['slots'].pop(a)
        if a in D['quads']: D['quads'][b] = D['quads'].pop(a)
    w = L['content_slots']['window']
    D['win'] = {'bounds': [r(v) for v in w['bounds']], 'panes': [rect4(p) for p in w['panes']]}
    # night tint is limited to the glass: union of the pane masks
    ms = [Image.open(os.path.join(pk, f)).convert('RGBA').split()[3] for f in w['pane_masks']]
    u = ms[0]
    for m in ms[1:]:
        u = Image.fromarray(__import__('numpy').maximum(__import__('numpy').array(u), __import__('numpy').array(m)))
    bb = u.getbbox(); wm = Image.new('RGBA', u.size, (255, 255, 255, 0)); wm.putalpha(u)
    wm.crop(bb).save(os.path.join(OUT, f'{sk}_winmask.webp'), 'WEBP', quality=90, method=6)
    D['win']['mask'] = [bb[0], bb[1], f'{sk}_winmask']
    pb = L['pet_bed']; poly = [pt(p) for p in pb['polygon']]
    D['pet'] = {'polygon': poly, 'center': [r(sum(p[0] for p in poly) / len(poly)), r(sum(p[1] for p in poly) / len(poly))], 'access': pt(pb['access'])}
    D['rev'] = M.get('revision')
    R[sk] = D
    rs = L['rest']; RS = {'heads': {}}
    (x, y), _ = crop_save(pk, rs['pillow_dent'], f'rest_{sk}_pillow_dent'); RS['pillow_dent'] = [x, y, f'rest_{sk}_pillow_dent']
    for hk, hv in rs['heads'].items():
        n = hk[-2:]; (x, y), _ = crop_save(pk, hv['file'], f'rest_{sk}_head{n}'); RS['heads'][n] = [x, y, f'rest_{sk}_head{n}']
    (x, y), (bw, bh) = crop_save(pk, rs['blanket_front'], f'rest_{sk}_blanket_front'); RS['blanket_front'] = [x, y, f'rest_{sk}_blanket_front']
    fc = pt(rs['heads']['head01']['face_center'])
    RS['hh'] = rs['heads']['head01']['bounds']['height']; RS['rot'] = 0
    RS['head'] = fc; RS['body'] = {'feet': [D['acc']['bed'][0], D['acc']['bed'][1] - 40], 'hips': [x + bw // 2, y + bh], 'shoulders': [fc[0], fc[1] + 30]}
    R['rest'][sk] = RS
    print('teacher', sk, len(D['occ']), 'occ', sorted(D['acc']), D['hh'])

# ---------- mart
pk = os.path.join(ROOT, '../assets/source/rooms/mart/mart_v3')
M = json.load(open(os.path.join(pk, 'manifest.json')))
for f in glob.glob(os.path.join(OUT, 'mart_*.webp')):
    os.remove(f)
R['mart'] = {}
for sk in ('landscape', 'portrait'):
    L = M['rooms'][sk]
    D = base(pk, L, 'mart_', sk)
    D['rev'] = M.get('revision')
    R['mart'][sk] = D
    print('mart', sk, len(D['occ']), 'occ', sorted(D['acc']), D['hh'])

json.dump(R, open(RJ, 'w'), ensure_ascii=False, separators=(',', ':'))
