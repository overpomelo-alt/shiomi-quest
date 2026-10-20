#!/usr/bin/env python3
"""Sqoyaw 手繪場景包 (../assets/source/sqoyaw/batch*/<scene>-v*/) -> src/troom/<scene>_<sk>_*.webp + room.json[<scene>]

One manifest per scene (scenes.<scene_id>.landscape / portrait). Same treatment as gate_build.py:
background -> webp, every full-canvas occluder cropped to its alpha box, walk / acc / exits / doors copied,
plus the pack's scale data: character_scale -> hh, spatial_scale anchors -> ss (people's height then depends on x AND y).
Re-run after a new scene pack is dropped in; the newest version folder of each scene wins.
"""
import glob, json, os, re
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, '../assets/source/sqoyaw')
OUT = os.path.join(ROOT, 'src/troom')
RJ = os.path.join(OUT, 'room.json')
R = json.load(open(RJ))
pt = lambda p: [round(p[0]), round(p[1])]
cen = lambda P: [round(sum(p[0] for p in P) / len(P)), round(sum(p[1] for p in P) / len(P))]

packs = {}
for m in sorted(glob.glob(os.path.join(SRC, 'batch*/*-v*/manifest.json'))):
    d = os.path.basename(os.path.dirname(m)); sid, ver = re.match(r'(.+)-v(\d+)$', d).groups()
    if sid not in packs or int(ver) > packs[sid][0]: packs[sid] = (int(ver), os.path.dirname(m))

for sid, (ver, PK) in sorted(packs.items()):
    M = json.load(open(os.path.join(PK, 'manifest.json')))
    for f in glob.glob(os.path.join(OUT, f'{sid}_*.webp')): os.remove(f)
    R[sid] = {}
    for sk in ('landscape', 'portrait'):
        L = M['scenes'][sid][sk]
        Image.open(os.path.join(PK, L['background'])).convert('RGB').save(os.path.join(OUT, f'{sid}_{sk}_bg.webp'), 'WEBP', quality=88, method=6)
        occ = []
        for o in L['occluders']:
            im = Image.open(os.path.join(PK, o['file'])).convert('RGBA'); bb = im.split()[3].getbbox()
            if not bb: continue
            name = f'{sid}_{sk}_o_{o["id"]}'; im.crop(bb).save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
            sl = o.get('sort_line')
            occ.append({'id': o['id'], 'file': name, 'x': bb[0], 'y': bb[1], 'sort': round(o['sort_y']),
                        'line': [pt(sl[0]), pt(sl[1])] if sl else None, 'b': [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]})
        cs = L['character_scale']
        ent = lambda e, extra=(): dict({'polygon': [pt(p) for p in e['polygon']], 'center': cen(e['polygon']), 'spawn': pt(e['spawn']),
                                        'facing': e.get('facing', 'front')}, **{k: e[k] for k in extra if k in e})
        D = {'w': L['canvas']['width'], 'h': L['canvas']['height'], 'bgkey': f'{sid}_{sk}_bg', 'rev': f'{sid}-v{ver}',
             'walk': [{'outer': [pt(p) for p in L['walk']['outer']], 'holes': [[pt(p) for p in h] for h in L['walk']['holes']]}],
             'occ': occ, 'acc': {k: pt(v) for k, v in L['acc'].items()}, 'tgt': {k: pt(v) for k, v in L.get('acc_targets', {}).items()},
             'exits': {k: ent(e, ('to', 'edge')) for k, e in L.get('exits', {}).items()},
             'doors': {k: ent(e, ('to', 'home_index')) for k, e in (L.get('doors') or {}).items()},
             'hh': [cs['far']['foot_y'], cs['near']['foot_y'], cs['far']['height_px'], cs['near']['height_px']],
             'ss': [[round(a[0]), round(a[1]), a[2]] for a in L['spatial_scale']['anchors']] if L.get('spatial_scale') else None,
             'npc_spots': {k: pt(v) for k, v in (L.get('npc_spots') or {}).items()},
             'npc_paths': {k: [pt(p) for p in v] for k, v in (L.get('npc_paths') or {}).items()},
             'signs': {k: [pt(p) for p in v] for k, v in (L.get('sign_slots') or {}).items()},
             'animal_spots': {k: pt(v) for k, v in (L.get('animal_spots') or {}).items()},
             'animal_zones': {k: [pt(p) for p in v] for k, v in (L.get('animal_zones') or {}).items()},
             'own': {}}
        R[sid][sk] = D
        print(sid, f'v{ver}', sk, len(occ), 'occ', 'hh', D['hh'], 'spatial' if D['ss'] else '', 'exits', {k: e.get('to') for k, e in D['exits'].items()}, 'doors', len(D['doors']))
json.dump(R, open(RJ, 'w'), ensure_ascii=False, separators=(',', ':'))
