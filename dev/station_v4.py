"""station v4 (gates inside the platform doorway): ../assets/source/rooms/station/station_v4 -> src/sroom (pictures + sroom.json layout)"""
import json, os
from PIL import Image
R = '../assets/source/rooms/station/station_v4/'; S = 'src/sroom/'
man = json.load(open(R + 'manifest.json'))
sr = json.load(open(S + 'sroom.json'))
for sk in ('landscape', 'portrait'):
    m = man['stations'][sk]
    for f in os.listdir(S):
        if f.startswith(sk + '_o_'): os.remove(S + f)
    Image.open(R + m['background'].replace('background.png', 'background.png')).convert('RGB').save(S + sk + '_bg.webp', 'WEBP', quality=90, method=6)
    occ = []
    for o in m['occluders']:
        im = Image.open(R + o['file']).convert('RGBA')
        b = o['bounds']
        if im.size != (b['width'], b['height']): im = im.crop((b['x'], b['y'], b['x'] + b['width'], b['y'] + b['height']))
        name = '%s_o_%s' % (sk, o['id'])
        im.save(S + name + '.webp', 'WEBP', quality=92, method=6)
        occ.append({'id': o['id'], 'file': name, 'x': b['x'], 'y': b['y'], 'sort': o['sort_y'], 'b': [b['x'], b['y'], b['width'], b['height']]})
    d = sr[sk]
    d.update({'w': m['canvas']['width'], 'h': m['canvas']['height'], 'occ': occ,
              'slots': {k: v['polygon'] for k, v in m['content_slots'].items()},
              'walk': [{'outer': m['walk']['outer'], 'holes': m['walk']['holes']}],
              'exitp': m['exitp'], 'portal': m['portal'], 'platform': m['platform'], 'acc': m['acc'], 'rev': man['revision']})
json.dump(sr, open(S + 'sroom.json', 'w'), ensure_ascii=False)
print('station v4 in place', {sk: [o['id'] for o in sr[sk]['occ']] for sk in ('landscape', 'portrait')})
