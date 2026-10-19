#!/usr/bin/env python3
"""遠山 panoramas (../assets/source/env/shiomi-mountains, 4096x1024 RGBA, sky transparent, wraps left-right)
   -> src/env/ridge_<name>.webp (4096 wide) + ridge_<name>_2k.webp (2048 wide, used on power-saving devices)."""
import os
from PIL import Image
ROOT = os.path.dirname(os.path.abspath(__file__))
PK = os.path.join(ROOT, '../assets/source/env/shiomi-mountains')
OUT = os.path.join(ROOT, 'src/env'); os.makedirs(OUT, exist_ok=True)
for n in ('sqoyaw', 'shiomi'):
    im = Image.open(os.path.join(PK, f'ridge_{n}.png')).convert('RGBA')
    im.save(os.path.join(OUT, f'ridge_{n}.webp'), 'WEBP', quality=80, alpha_quality=90, method=6)
    im.resize((2048, 512), Image.LANCZOS).save(os.path.join(OUT, f'ridge_{n}_2k.webp'), 'WEBP', quality=80, alpha_quality=90, method=6)
    print(n, os.path.getsize(os.path.join(OUT, f'ridge_{n}.webp')), os.path.getsize(os.path.join(OUT, f'ridge_{n}_2k.webp')))
