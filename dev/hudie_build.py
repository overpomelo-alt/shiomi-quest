"""蝴蝶 (Tien's old dog; ../assets/source/characters/pets/teacher_dog/shiomi-teacher-dog, 448x448, ground 440, 4 fur stages f0..f3 x 7 poses)
-> src/sprites/ani_hudie_f<n>.webp + meta.json.  Same cell layout as pack_animals.py (0..4 = front sit, side walk A/B, back walk A/B).
Back view (walking away): 8 frames from the back-walk add-on pack (../assets/source/characters/pets/teacher_dog/shiomi-teacher-dog-back-walk),
same 448 canvas / foot y 440 / display scale as the side walk, so the cells drop straight into slots 3-4.  Every stage uses f0's sitting height as hpx, so longer fur
makes the silhouette bigger while the dog itself stays the same size."""
import json
from PIL import Image
R0 = '../assets/source/characters/pets/teacher_dog/shiomi-teacher-dog/frames/teacherdog/teacherdog_%s_%s.png'
RB = '../assets/source/characters/pets/teacher_dog/shiomi-teacher-dog-back-walk/frames/teacherdog/teacherdog_%s_%s.png'
R = None
CELL = 224; COLS = 8
ORDER = ['front_sit', 'side_walk_A', 'side_walk_B', 'back_walk_A', 'back_walk_B', 'lie', 'sleep', 'wag_A', 'wag_B']
KEYS = ['front_sit', 'side_walk_A', 'side_walk_B', 'back_walk_A', 'back_walk_B', 'lie', 'sleep', 'wag_A', 'wag_B']
meta = json.load(open('src/sprites/meta.json'))
hpx0 = None
for s in range(4):
    sheet = Image.new('RGBA', (COLS * CELL, 2 * CELL), (0, 0, 0, 0))
    for i, k in enumerate(ORDER):
        im = Image.open((RB if k.startswith('back_') else R0) % ('f%d' % s, k)).convert('RGBA').resize((CELL, CELL), Image.LANCZOS)
        sheet.alpha_composite(im, ((i % COLS) * CELL, (i // COLS) * CELL))
    sit = sheet.crop((0, 0, CELL, CELL)).getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    if hpx0 is None: hpx0 = sit[3] - sit[1]
    act = {k: i for i, k in enumerate(KEYS)}
    act.update({'t_lie_contact': act['lie'], 't_stand': 0, 'beg': act['wag_A'], 'playdead': act['lie'], 'roll': act['lie'], 'paw': act['wag_A'], 'eat': act['lie'], 'sniff': 0})
    anims = {'lie_down': {'f': [0, act['lie']], 'd': [.3, .6], 'loop': False}, 'get_up': {'f': [act['lie'], 0], 'd': [.3, .4], 'loop': False},
             'jump': {'f': [0], 'd': [.55], 'loop': False}, 'eat': {'f': [act['lie']] * 3, 'd': [.6, .6, .6], 'loop': False},
             'chew': {'f': [act['lie'], act['wag_A']], 'd': [.4, .4], 'loop': True}}
    sid = 'ani_hudie_f%d' % s
    sheet.save('src/sprites/%s.webp' % sid, 'WEBP', quality=88, method=6)
    meta[sid] = {'kind': 'animal', 'cw': CELL, 'ch': CELL, 'n': len(ORDER), 'cols': COLS, 'rows': 2, 'hpx': hpx0, 'foot': 4,
                 'bw': [3, 4], 'act': act, 'anims': anims, 'pack': 'shiomi-teacher-dog', 'name': 'hudie_f%d' % s}
    print(sid, 'hpx', hpx0, 'sit bbox h', sit[3] - sit[1])
json.dump(meta, open('src/sprites/meta.json', 'w'), ensure_ascii=False)
