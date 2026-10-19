"""ChatGPT surface textures (../assets/source/textures/textures) -> src/tex/<name>.webp + src/tex/tex.json (linear average colour, tile size in metres).
Batch 2 (第二批, ../assets/source/batches/batch2/game-ready/assets/tex): red brick, blue / red / green corrugated metal, vertical wood boards — already 512 seamless webp.
wall_tile v2 came as one non-tiling 1254 px picture: cut it on the brick grid (12 bricks x 48 rows) so it repeats seamlessly."""
import json, os
from PIL import Image
import numpy as np
R = '../assets/source/textures/textures/'; S = 'src/tex/'
SIZE = {'wall_tile': (2.0, 2.0 * 590 / 512), 'wall_plaster': (2.0, 2.0), 'wall_pebble': (1.0, 1.0), 'roof_metal': (2.0, 2.0),
        'asphalt': (4.0, 4.0), 'concrete': (2.0, 2.0), 'grass': (4.0, 4.0), 'wood_plank': (2.0, 2.0), 'terrazzo': (1.0, 1.0), 'soil': (4.0, 4.0),
        'wall_brick_red': (1.3, 1.3), 'metal_blue': (2.0, 2.0), 'metal_red': (2.0, 2.0), 'metal_green': (2.0, 2.0), 'wall_wood': (1.4, 1.4)}
R2 = '../assets/source/batches/batch2/game-ready/assets/tex/'
# 第十四批: the official shiomi-tiles pack (1024 px) replaces the program-made batch-2 pictures for these keys, and adds grass_t (grass_b) for the Sqoyaw ground
R3 = '../assets/source/textures/shiomi-tiles/'
TILES = {'metal_blue': 'roof_metal_blue', 'metal_red': 'roof_metal_red', 'metal_green': 'roof_metal_green', 'wall_brick_red': 'brick_fence', 'wall_wood': 'wall_wood', 'grass_t': 'grass_b'}
SIZE['grass_t'] = (5.0, 5.0)
out = {}
for name, (mw, mh) in SIZE.items():
    if name == 'wall_tile' and os.path.exists(R + 'wall_tile_v2_source.png'):
        im = Image.open(R + 'wall_tile_v2_source.png').convert('RGB').crop((96, 0, 96 + 1089, 1254)).resize((512, 590), Image.LANCZOS)
    elif os.path.exists(R + name + '.png'):
        im = Image.open(R + name + '.png').convert('RGB').resize((512, 512), Image.LANCZOS)
        if name == 'concrete':   # drop the painted joint on the tile edge: lanes run every which way, the game draws its own joints along the lane
            arr = np.asarray(im).copy(); arr[:6] = arr[8:14]; arr[-6:] = arr[-14:-8]; im = Image.fromarray(arr)
    elif name in TILES and os.path.exists(R3 + TILES[name] + '.png'):
        im = Image.open(R3 + TILES[name] + '.png').convert('RGB').resize((512, 512), Image.LANCZOS)
    elif os.path.exists(R2 + name + '.webp'):
        im = Image.open(R2 + name + '.webp').convert('RGB').resize((512, 512), Image.LANCZOS)
    else:
        continue
    im.save(S + name + '.webp', 'WEBP', quality=86, method=6)
    a = np.asarray(im).astype(float) / 255.0
    lin = np.where(a <= .04045, a / 12.92, ((a + .055) / 1.055) ** 2.4).reshape(-1, 3).mean(0)
    out[name] = {'avg': [round(float(v), 4) for v in lin], 'm': [mw, mh]}
json.dump(out, open(S + 'tex.json', 'w'))
print({k: v['avg'] for k, v in out.items()})
