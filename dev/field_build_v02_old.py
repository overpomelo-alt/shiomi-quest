#!/usr/bin/env python3
"""平等國小操場 (art pack v0.2 image 05) -> a walkable 2D scene: src/troom/sfield_*.webp + room.json['field'].
   One landscape painting; portrait phones pan across the same picture. Only the basketball stand can stand in front
   of the player (everything else is behind the walkable ground), so it is the one occluder, cut out by colour."""
import json, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'src/troom')
src = Image.open(os.path.join(ROOT, '../assets/source/art_direction/artpack_v02/images/05_school_courtyard.png')).convert('RGB')
W, H = src.size
src.save(os.path.join(OUT, 'sfield_landscape_bg.webp'), 'WEBP', quality=90, method=6)

a = np.asarray(src).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
m = np.zeros((H, W), bool)
yy, xx = np.mgrid[0:H, 0:W]
# blue pole, padding and frame
box = (xx >= 955) & (xx <= 1106) & (yy >= 405) & (yy <= 716)
m |= box & (b > r + 35) & (b > g + 5) & (b > 90)
# backboard (white panel with red square) as a quad
from PIL import ImageDraw
q = Image.new('L', (W, H), 0); ImageDraw.Draw(q).polygon([(940, 434), (1023, 428), (1025, 514), (942, 518)], fill=255)
m |= np.asarray(q) > 0
# white net under the rim
net = (xx >= 932) & (xx <= 982) & (yy >= 490) & (yy <= 536)
m |= net & (r > 190) & (g > 190) & (b > 190)
# orange rim
rim = (xx >= 930) & (xx <= 985) & (yy >= 486) & (yy <= 500)
m |= rim & (r > 170) & (g < 150) & (b < 110)
mk = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.6))
occ = src.copy(); occ.putalpha(mk)
bb = mk.getbbox(); occ = occ.crop(bb)
occ.save(os.path.join(OUT, 'sfield_o_hoop.webp'), 'WEBP', quality=92, method=6)

# walkable ground: the paved strip in front of the building, the grass, the court and the track
outer = [[0, 664], [120, 662], [130, 646], [262, 646], [270, 662], [1536, 668], [1536, 1018], [0, 1018]]
holes = [[[1060, 688], [1110, 688], [1112, 718], [1058, 718]],       # basketball stand base
         [[300, 640], [760, 640], [760, 652], [300, 652]]]          # planters and deck front
D = {'w': W, 'h': H, 'walk': [{'outer': outer, 'holes': holes}],
     'occ': [{'id': 'hoop', 'file': 'sfield_o_hoop', 'x': bb[0], 'y': bb[1], 'sort': 716, 'line': None, 'b': [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]}],
     'exit': {'polygon': [[600, 968], [930, 968], [940, 1018], [590, 1018]], 'center': [765, 995], 'spawn': [765, 930], 'facing': 'back'},
     'acc': {'classroom': [196, 652], 'hoop': [1010, 760], 'deck': [624, 668], 'board': [1334, 676], 'storeroom': [1222, 672], 'track': [300, 960]},
     'hh': [650, 1018, 78, 236], 'bgkey': 'sfield_landscape_bg', 'own': {}}
RJ = os.path.join(OUT, 'room.json'); R = json.load(open(RJ))
R['field'] = {'landscape': D, 'portrait': D}
json.dump(R, open(RJ, 'w'), ensure_ascii=False, separators=(',', ':'))
print('field', W, H, 'hoop occluder', bb)
