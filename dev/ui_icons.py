"""src/icons/*.svg (art pack v0.2, 24x24 line icons, ink #4E3B2B) -> the ICONS block in src/game.js (currentColor, stroke 1.8)."""
import glob, os, re, json
d = {}
for f in sorted(glob.glob('src/icons/*.svg')):
    s = open(f).read()
    body = re.sub(r'<\?xml.*?\?>|<svg[^>]*>|</svg>|<style>.*?</style>', '', s, flags=re.S)
    body = body.replace('#4E3B2B', 'currentColor').replace('#4e3b2b', 'currentColor')
    body = re.sub(r'\s+', ' ', body).strip()
    d[os.path.basename(f)[:-4]] = body
js = 'const ICONS=' + json.dumps(d) + ';\nfunction ICON(n,c){const b=ICONS[n];return b?`<svg class="ic${c?" "+c:""}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`:"";}\n'
g = open('src/game.js').read()
A, B = '/* ICONS:BEGIN */\n', '/* ICONS:END */\n'
if A in g:
    i = g.index(A); j = g.index(B) + len(B); g = g[:i] + A + js + B + g[j:]
else:
    k = g.index('function C2(')
    g = g[:k] + A + js + B + g[k:]
open('src/game.js', 'w').write(g)
print(len(d), 'icons')
