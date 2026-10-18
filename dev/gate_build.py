#!/usr/bin/env python3
"""平等國小校門口・魚溜滑梯 (../assets/source/school/school_gate_v1, gate-v1 pack) -> src/troom/sgate_<sk>_*.webp + room.json['gate']"""
import json, os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
PK = os.path.join(ROOT, '../assets/source/school/school_gate_v1/shiomi-school-outdoor')
OUT = os.path.join(ROOT, 'src/troom')
M = json.load(open(os.path.join(PK, 'manifest.json')))
RJ = os.path.join(OUT, 'room.json'); R = json.load(open(RJ))
for f in glob.glob(os.path.join(OUT, 'sgate_*.webp')): os.remove(f)
pt = lambda p: [round(p[0]), round(p[1])]
R['gate'] = {}
for sk in ('landscape', 'portrait'):
    L = M['scenes']['gate'][sk]
    Image.open(os.path.join(PK, L['background'])).convert('RGB').save(os.path.join(OUT, f'sgate_{sk}_bg.webp'), 'WEBP', quality=88, method=6)
    occ = []
    for o in L['occluders']:
        im = Image.open(os.path.join(PK, o['file'])).convert('RGBA'); bb = im.split()[3].getbbox(); c = im.crop(bb)
        name = f'sgate_{sk}_o_{o["id"]}'; c.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
        sl = o.get('sort_line')
        occ.append({'id': o['id'], 'file': name, 'x': bb[0], 'y': bb[1], 'sort': round(o['sort_y']), 'line': [pt(sl[0]), pt(sl[1])] if sl else None,
                    'b': [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]})
    cs = L['character_scale']
    D = {'w': L['canvas']['width'], 'h': L['canvas']['height'],
         'walk': [{'outer': [pt(p) for p in L['walk']['outer']], 'holes': [[pt(p) for p in h] for h in L['walk']['holes']]}],
         'occ': occ, 'acc': {k: pt(v) for k, v in L['acc'].items()}, 'tgt': {k: pt(v) for k, v in L.get('acc_targets', {}).items()},
         'exits': {k: {'polygon': [pt(p) for p in e['polygon']], 'center': pt(e['center']), 'spawn': pt(e['spawn']), 'facing': e.get('facing', 'front')} for k, e in L['exits'].items()},
         'hh': [cs['far']['foot_y'], cs['near']['foot_y'], cs['far']['height_px'], cs['near']['height_px']],
         'own': {}, 'rev': M.get('revision')}
    D['exit'] = D['exits']['to_map']   # the engine's default door
    R['gate'][sk] = D
    print('gate', sk, len(occ), 'occ', D['hh'], sorted(D['acc']))
json.dump(R, open(RJ, 'w'), ensure_ascii=False, separators=(',', ':'))
