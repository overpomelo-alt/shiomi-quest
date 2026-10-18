"""五年級教室 (../assets/source/rooms/classroom/classroom, ChatGPT pack) -> src/troom/class_<sk>_bg.webp + class_<sk>_o_<id>.webp, layout in src/troom/room.json['class']"""
import json, os
from PIL import Image
R = '../assets/source/rooms/classroom/classroom/'; S = 'src/troom/'
man = json.load(open(R + 'manifest.json'))
room = json.load(open(S + 'room.json'))
for f in os.listdir(S):
    if f.startswith('class_'): os.remove(S + f)
out = {}
for sk in ('landscape', 'portrait'):
    m = man['classrooms'][sk]
    Image.open(R + m['background']).convert('RGB').save(S + 'class_%s_bg.webp' % sk, 'WEBP', quality=86, method=6)
    occ = []
    for o in m['occluders']:
        im = Image.open(R + o['file']).convert('RGBA'); b = o['bounds']
        im = im.crop((b['x'], b['y'], b['x'] + b['width'], b['y'] + b['height']))
        name = 'class_%s_o_%s' % (sk, o['id'])
        im.save(S + name + '.webp', 'WEBP', quality=90, method=6)
        occ.append({'id': o['id'], 'file': name, 'x': b['x'], 'y': b['y'], 'sort': o['sort_y'], 'line': None, 'b': [b['x'], b['y'], b['width'], b['height']]})
    out[sk] = {'w': m['canvas']['width'], 'h': m['canvas']['height'], 'walk': [{'outer': m['walk']['outer'], 'holes': m['walk']['holes']}],
               'occ': occ, 'exit': m['exit'], 'acc': m['acc'], 'rev': man.get('revision')}
room['class'] = out
json.dump(room, open(S + 'room.json', 'w'))
print('classroom in place', {sk: len(out[sk]['occ']) for sk in out})
