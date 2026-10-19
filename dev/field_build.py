#!/usr/bin/env python3
"""平等國小正式操場 (../assets/source/school/school_field_v1, ChatGPT field-v1 pack) -> src/troom/sfield_<sk>_*.webp + room.json['field']
   Same pack format as the gate (gate_build.py): full-canvas occluder PNGs are cropped to their alpha box and placed at (x, y).
   Exits: to_gate (right track) -> 校門口, classroom_door (white door + mat) -> 五年級教室, to_lawn (left track) -> 3D 單槓草地 until the painted lawn arrives.
   (The old temporary field made from the art-pack picture is field_build_v02_old.py.)"""
import json, os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
PK = os.path.join(ROOT, '../assets/source/school/school_field_v1/shiomi-school-outdoor')
OUT = os.path.join(ROOT, 'src/troom')
M = json.load(open(os.path.join(PK, 'manifest.json')))
RJ = os.path.join(OUT, 'room.json'); R = json.load(open(RJ))
for f in glob.glob(os.path.join(OUT, 'sfield_*.webp')): os.remove(f)
pt = lambda p: [round(p[0]), round(p[1])]
R['field'] = {}
for sk in ('landscape', 'portrait'):
    L = M['scenes']['field'][sk]
    Image.open(os.path.join(PK, L['background'])).convert('RGB').save(os.path.join(OUT, f'sfield_{sk}_bg.webp'), 'WEBP', quality=88, method=6)
    occ = []
    for o in L['occluders']:
        im = Image.open(os.path.join(PK, o['file'])).convert('RGBA'); bb = im.split()[3].getbbox(); c = im.crop(bb)
        name = f'sfield_{sk}_o_{o["id"]}'; c.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
        sl = o.get('sort_line')
        occ.append({'id': o['id'], 'file': name, 'x': bb[0], 'y': bb[1], 'sort': round(o['sort_y']), 'line': [pt(sl[0]), pt(sl[1])] if sl else None,
                    'b': [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]})
    cs = L['character_scale']
    D = {'w': L['canvas']['width'], 'h': L['canvas']['height'], 'bgkey': f'sfield_{sk}_bg',
         'walk': [{'outer': [pt(p) for p in L['walk']['outer']], 'holes': [[pt(p) for p in h] for h in L['walk']['holes']]}],
         'occ': occ, 'acc': {k: pt(v) for k, v in L['acc'].items()}, 'tgt': {k: pt(v) for k, v in L.get('acc_targets', {}).items()},
         'exits': {k: {'polygon': [pt(p) for p in e['polygon']], 'center': pt(e['center']), 'spawn': pt(e['spawn']), 'facing': e.get('facing', 'front')} for k, e in L['exits'].items()},
         'hh': [cs['far']['foot_y'], cs['near']['foot_y'], cs['far']['height_px'], cs['near']['height_px']],
         'spawn': pt(L['preview_spawn']) if 'preview_spawn' in L else None,
         'sign': L.get('content_slots', {}).get('classroom_sign'),
         'own': {}, 'rev': M.get('revision')}
    D['exit'] = D['exits']['to_gate']   # the engine's default door
    R['field'][sk] = D
    print('field', sk, len(occ), 'occ', D['hh'], sorted(D['acc']), 'spawn', D['spawn'])
json.dump(R, open(RJ, 'w'), ensure_ascii=False, separators=(',', ':'))
