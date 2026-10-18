#!/usr/bin/env python3
"""Student room v3 pack (../assets/source/rooms/student_room/student_room_v3) -> src/troom/home_<sk>_* webp + room.json['home'][sk]."""
import json, os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
PK = os.path.join(ROOT, '../assets/source/rooms/student_room/student_room_v3')
OUT = os.path.join(ROOT, 'src/troom')
M = json.load(open(os.path.join(PK, 'manifest.json')))
RJ = os.path.join(OUT, 'room.json')
R = json.load(open(RJ))

for f in glob.glob(os.path.join(OUT, 'home_*.webp')):
    os.remove(f)

OCC_ID = {'bed': 'bed_end', 'desk': 'desk_front', 'chair': 'chair', 'bin': 'bin',
          'bookcase': 'bookcase_front', 'beanbag': 'beanbag', 'pet_bed': 'pet_bed'}
r = lambda v: round(v)
pt = lambda p: [r(p[0]), r(p[1])]
rect4 = lambda b: [[r(b[0]), r(b[1])], [r(b[0] + b[2]), r(b[1])], [r(b[0] + b[2]), r(b[1] + b[3])], [r(b[0]), r(b[1] + b[3])]]


def crop_save(src, name, q=86):
    im = Image.open(os.path.join(PK, src)).convert('RGBA')
    bb = im.split()[3].getbbox()
    c = im.crop(bb)
    c.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=q, method=6)
    return [bb[0], bb[1]], c.size


for sk in ('landscape', 'portrait'):
    L = M['rooms'][sk]
    W, H = L['canvas']['width'], L['canvas']['height']
    Image.open(os.path.join(PK, L['background'])).convert('RGB').save(
        os.path.join(OUT, f'home_{sk}_bg.webp'), 'WEBP', quality=88, method=6)
    D = {'w': W, 'h': H}
    D['walk'] = [{'outer': [pt(p) for p in L['walk']['outer']],
                  'holes': [[pt(p) for p in h] for h in L['walk']['holes']]}]
    occ, ob = [], {}
    for o in L['occluders']:
        oid = OCC_ID[o['id']]
        name = f'home_{sk}_o_{oid}'
        (x, y), (w, h) = crop_save(o['file'], name)
        occ.append({'id': oid, 'file': name, 'x': x, 'y': y, 'sort': r(o['sort_y']), 'line': None, 'b': [x, y, w, h]})
        b = o['bounds']
        ob[oid] = [b['x'], b['y'], b['width'], b['height']]
    D['occ'] = occ
    cs = L['content_slots']
    wb = cs['window']['bounds']
    ob['window_seat'] = [r(v) for v in wb]
    D['obounds'] = ob
    e = L['exit']
    D['exit'] = {'polygon': [pt(p) for p in e['polygon']], 'center': pt(e['center']), 'spawn': pt(e['spawn']), 'facing': e.get('facing', 'back')}
    D['win'] = {'polygon': rect4(wb), 'panes': [rect4(p) for p in cs['window']['panes']]}
    D['slot'] = rect4(cs['stamp_board'])
    q = L.get('content_slot_quads', {})
    D['poster'] = [pt(p) for p in q['poster']] if 'poster' in q else rect4(cs['poster'])
    D['calendar'] = [pt(p) for p in q['calendar']] if 'calendar' in q else rect4(cs['calendar'])
    pb = L['pet_bed']
    poly = [pt(p) for p in pb['polygon']]
    cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
    D['pet'] = {'polygon': poly, 'center': [r(cx), r(cy)], 'access': pt(pb['access'])}
    D['acc'] = {k: pt(v) for k, v in L['acc'].items()}
    D['quad'] = [pt(p) for p in L['floor_quad']]
    pp = L['preview_character_perspective']
    ch = L['preview_character_height_px']
    D['hh'] = [r(pp['back_y']), r(pp['front_y']), r(ch * pp['back_scale']), ch]
    D['open_floor'] = [pt(p) for p in L['open_floor']]
    D['wall'], D['floor'] = {}, {}
    for k, f in L['wallpapers'].items():
        if k == 'ivory':
            continue
        D['wall'][k], _ = crop_save(f, f'home_{sk}_wall_{k}', 84)
    for k, f in L['floors'].items():
        if k == 'natural_wood':
            continue
        D['floor'][k], _ = crop_save(f, f'home_{sk}_floor_{k}', 84)
    rs = L['rest']
    rest2 = {'heads': {}}
    (x, y), _ = crop_save(rs['pillow_dent'], f'home_{sk}_bed_pillow_dent')
    rest2['pillow_dent'] = [x, y, f'home_{sk}_bed_pillow_dent']
    for hk, hv in rs['heads'].items():
        n = hk[-2:]
        (x, y), _ = crop_save(hv['file'], f'home_{sk}_bed_head{n}')
        rest2['heads'][n] = [x, y, f'home_{sk}_bed_head{n}']
    rest2['face'] = pt(rs['heads']['head01']['face_center'])
    (x, y), _ = crop_save(rs['blanket_front'], f'home_{sk}_bed_blanket_front')
    rest2['blanket_front'] = [x, y, f'home_{sk}_bed_blanket_front']
    D['rest2'] = rest2
    R['home'][sk] = D
    print(sk, 'occ', len(occ), 'walls', len(D['wall']), 'floors', len(D['floor']), 'hh', D['hh'])

json.dump(R, open(RJ, 'w'), ensure_ascii=False, separators=(',', ':'))
