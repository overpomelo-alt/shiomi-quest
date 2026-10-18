"""animal packs (../assets/source/characters/pets/wild_animals/<pack>/frames/<id>/<id>_<key>.png, 448x448, ground 440) -> src/sprites/ani_<id>.webp + meta.json
cell 224; frames 0..4 = front sit, side walk A/B, back walk A/B (the layout the game's animal code expects), then every other pose.
hpx = the sitting figure's height in the cell, so a sprite made with height h is h metres tall when sitting."""
import json, os, glob
from PIL import Image
CELL = 224; COLS = 8
BASE = ['front_sit', 'side_walk_A', 'side_walk_B', 'back_walk_A', 'back_walk_B']
meta = json.load(open('src/sprites/meta.json'))
for pack in sorted(glob.glob('../assets/source/characters/pets/wild_animals/*/manifest.json')):
    root = os.path.dirname(pack)
    for d in sorted(glob.glob(root + '/frames/*/')):
        sid = os.path.basename(d.rstrip('/'))
        keys = {os.path.basename(f)[len(sid) + 1:-4]: f for f in glob.glob(d + '*.png')}
        if not all(k in keys for k in BASE): print('skip', sid, 'missing base frames'); continue
        order = BASE + sorted(k for k in keys if k not in BASE)
        rows = (len(order) + COLS - 1) // COLS
        sheet = Image.new('RGBA', (COLS * CELL, rows * CELL), (0, 0, 0, 0))
        for i, k in enumerate(order):
            im = Image.open(keys[k]).convert('RGBA').resize((CELL, CELL), Image.LANCZOS)
            sheet.alpha_composite(im, ((i % COLS) * CELL, (i // COLS) * CELL))
        sit = sheet.crop((0, 0, CELL, CELL)).getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
        act = {k: i for i, k in enumerate(order)}
        A = lambda k, alt=0: act.get(k, alt)
        # names the existing pet code looks for
        act.update({'t_lie_contact': A('lie'), 't_stand': 0, 'beg': A('wag_A', 0), 'playdead': A('roll', A('lie'))})
        anims = {'lie_down': {'f': [0, A('lie')], 'd': [.3, .6], 'loop': False}, 'get_up': {'f': [A('lie'), 0], 'd': [.3, .4], 'loop': False},
                 'jump': {'f': [A('jump', A('pounce', 0))], 'd': [.55], 'loop': False}, 'eat': {'f': [A('eat')] * 3, 'd': [.6, .6, .6], 'loop': False},
                 'chew': {'f': [A('eat'), A('sniff', A('eat'))], 'd': [.4, .4], 'loop': True}}
        sheet.save('src/sprites/ani_%s.webp' % sid, 'WEBP', quality=88, method=6)
        meta['ani_' + sid] = {'kind': 'animal', 'cw': CELL, 'ch': CELL, 'n': len(order), 'cols': COLS, 'rows': rows, 'hpx': sit[3] - sit[1], 'foot': 4,
                              'bw': [3, 4], 'act': act, 'anims': anims, 'pack': os.path.basename(root), 'name': sid}
        print(sid, len(order), 'frames, hpx', sit[3] - sit[1])
json.dump(meta, open('src/sprites/meta.json', 'w'), ensure_ascii=False)
