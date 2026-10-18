"""student bed 'lie down' layers (../assets/source/rooms/student_room/student_bed_rest, ChatGPT pack drawn for this bed) -> src/troom/home_<sk>_bed_<layer>.webp, offsets in room.json home[sk].rest2"""
import json, os
from PIL import Image
R = '../assets/source/rooms/student_room/student_bed_rest/'; S = 'src/troom/'
room = json.load(open(S + 'room.json'))
for sk in ('landscape', 'portrait'):
    out = {'heads': {}}
    for layer in ['pillow_dent', 'blanket_front'] + ['head0%d' % i for i in range(1, 7)]:
        im = Image.open(R + sk + '/' + layer + '.png').convert('RGBA'); b = im.getchannel('A').getbbox()
        name = 'home_%s_bed_%s' % (sk, layer); im.crop(b).save(S + name + '.webp', 'WEBP', quality=90, method=6)
        e = [b[0], b[1], name]
        if layer.startswith('head'): out['heads'][layer[-2:]] = e
        else: out[layer] = e
    room['home'][sk]['rest2'] = out
json.dump(room, open(S + 'room.json', 'w'))
print({sk: list(room['home'][sk]['rest2']) for sk in ('landscape', 'portrait')})
