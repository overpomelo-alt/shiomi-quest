"""Build the game into dist/: a small dist/index.html plus every picture as its own file under dist/assets/.

  python3 build.py            -> dist/index.html, dist/assets/**, dist/assets/catalog.json

Pictures are referenced by relative URL (with ?v=<content hash> so a replaced picture is never served from cache).
Source pictures stay where they always were (src/sprites, src/troom, src/sroom, src/hroom, src/cabin, src/loader);
to replace one, overwrite the source file with the same name and rebuild.
See ASSETS.md for the folder map.
"""
import json, os, hashlib, shutil

S = 'src/'
D = 'dist/'
A = 'assets/'
if os.path.isdir(D + A):
    shutil.rmtree(D + A)
os.makedirs(D + A, exist_ok=True)
catalog = []


def put(src_path, rel, group, note=''):
    """copy src_path to dist/assets/<rel>; return the URL the page uses."""
    data = open(src_path, 'rb').read()
    dst = D + A + rel
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, 'wb').write(data)
    h = hashlib.sha1(data).hexdigest()[:8]
    catalog.append({'file': A + rel, 'group': group, 'bytes': len(data), 'note': note})
    return A + rel + '?v=' + h


css = open(S + 'style.css').read()
markup = open(S + 'markup.html').read()
engine = open(S + 'engine.js').read()
game = open(S + 'game.js').read()
quest = json.dumps(json.load(open(S + 'quest.json')), ensure_ascii=False)
for name, t in [('css', css), ('engine', engine), ('game', game), ('markup', markup)]:
    assert '</script' not in t.lower().replace('<\\/script', ''), name
quest = quest.replace('</', '<\\/')

# ---- characters
meta = json.load(open(S + 'sprites/meta.json'))
PLAYERS = {'hero1', 'sailor', 'hoodie', 'sporty', 'green', 'redcap'}


def sgroup(k):
    if k in PLAYERS: return 'players'
    if k.startswith('act'): return 'actions'
    if k.startswith('res'): return 'residents'
    if k.startswith('cat_') or k.startswith('shiba_') or k.startswith('ani_'): return 'pets'
    return 'npcs'


spr = {}
for k, v in meta.items():
    g = sgroup(k)
    note = v.get('name') or v.get('pack') or ''
    spr[k] = dict(v, src=put(S + 'sprites/' + k + '.webp', 'characters/%s/%s.webp' % (g, k), 'characters/' + g, note))
fc = json.load(open(S + 'sprites/faces.json'))
resfaces = open(S + 'sprites/resfaces.json').read()
fonts = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">'''
loader = open(S + 'loader.js').read().replace('__SHEET__', put(S + 'loader/run-1-sheet.webp', 'ui/loading-run.webp', 'ui', 'loading screen runner'))


# ---- rooms
def room_dir(key):
    for p in ('home_', 'bath_', 'rest_', 'class_', 'mart_', 'sfield_', 'sgate_'):
        if key.startswith(p): return p[:-1]
    return 'cabin'


troom = json.load(open(S + 'troom/room.json'))
troom['img'] = {f[:-5]: put(S + 'troom/' + f, 'rooms/%s/%s' % (room_dir(f[:-5]), f), 'rooms/' + room_dir(f[:-5]))
                for f in sorted(os.listdir(S + 'troom')) if f.endswith('.webp')}
hroom = json.load(open(S + 'hroom/hroom.json'))
hroom['img'] = {f[:-5]: put(S + 'hroom/' + f, 'rooms/furniture/' + f, 'rooms/furniture')
                for f in sorted(os.listdir(S + 'hroom')) if f.endswith('.webp')}
sroom = json.load(open(S + 'sroom/sroom.json'))
sroom['img'] = {f[:-5]: put(S + 'sroom/' + f, 'rooms/station/' + f, 'rooms/station')
                for f in sorted(os.listdir(S + 'sroom')) if f.endswith('.webp')}
tex = json.load(open(S + 'tex/tex.json'))
for k in tex: tex[k]['url'] = put(S + 'tex/' + k + '.webp', 'tex/' + k + '.webp', 'tex', 'surface texture')
art = {f[:-5]: put(S + 'art/' + f, 'art/school-v1/' + f, 'art', 'school art sample v1') for f in sorted(os.listdir(S + 'art')) if f.endswith('.webp')}
env = {f[:-5]: put(S + 'env/' + f, 'env/' + f, 'env', 'distant mountain panorama') for f in sorted(os.listdir(S + 'env')) if f.endswith('.webp')}
tphotos = [put(S + 'cabin/photo%d.webp' % i, 'rooms/cabin/photo%d.webp' % i, 'rooms/cabin', 'teacher photo') for i in (1, 2)]

out = ('<title>汐見町闖關</title>\n' + fonts + '\n<style id="css">' + css + '</style>\n'
       '<script id="loader">' + loader + '</script>\n'
       '<script type="application/json" id="quest">' + quest + '</script>\n'
       '<script type="application/json" id="sprites">' + json.dumps(spr, ensure_ascii=False) + '</script>\n'
       '<script type="application/json" id="faces">' + json.dumps(fc) + '</script>\n'
       '<script type="application/json" id="resfaces">' + resfaces + '</script>\n'
       '<script type="application/json" id="tphotos">' + json.dumps(tphotos) + '</script>\n'
       '<script type="application/json" id="hroom">' + json.dumps(hroom, ensure_ascii=False) + '</script>\n'
       '<script type="application/json" id="troom">' + json.dumps(troom) + '</script>\n'
       '<script type="application/json" id="sroom">' + json.dumps(sroom, ensure_ascii=False) + '</script>\n'
       '<script type="application/json" id="tex">' + json.dumps(tex) + '</script>\n'
       '<script type="application/json" id="art">' + json.dumps(art) + '</script>\n'
       '<script type="application/json" id="env">' + json.dumps(env) + '</script>\n'
       '<script id="engine">' + engine + '</script>\n'
       '<script id="game">const MARKUP=' + json.dumps(markup, ensure_ascii=False) + ';\n' + game + '</script>\n')
open(D + 'index.html', 'w').write(out)
catalog.sort(key=lambda c: c['file'])
json.dump({'built_from': 'shiomi/src', 'files': catalog}, open(D + A + 'catalog.json', 'w'), ensure_ascii=False, indent=1)
tot = sum(c['bytes'] for c in catalog)
print('index.html', len(out.encode()), 'bytes;', len(catalog) + 1, 'asset files', tot, 'bytes')


# ---- hosted copy (GitHub Pages): web/ = full HTML page + assets (no teacher photos) + boot (cloud settings) + offline cache
import shutil, re as _re
WB = 'web/'
if os.path.isdir(WB + 'assets'): shutil.rmtree(WB + 'assets')
os.makedirs(WB, exist_ok=True)
shutil.copytree(D + A, WB + A, ignore=shutil.ignore_patterns('photo*.webp'))
# smaller pictures for the web copy: re-encode each webp at quality 78 when that saves at least 12 % (cached by content hash);
# the loading-screen runners are drawn small, so their sheet is scaled to 2/3
from PIL import Image as _Im
import io as _io
_CD = '.webcache/'
os.makedirs(_CD, exist_ok=True)
_before = _after = 0
for _root, _ds, _fs in os.walk(WB + A):
    for _f in _fs:
        if not _f.endswith('.webp'): continue
        _p = os.path.join(_root, _f); _raw = open(_p, 'rb').read(); _before += len(_raw)
        _h = hashlib.sha1(_raw).hexdigest(); _c = _CD + _h + '.webp'
        if not os.path.exists(_c):
            _im = _Im.open(_io.BytesIO(_raw))
            if _f == 'loading-run.webp': _im = _im.resize((_im.width * 2 // 3, _im.height * 2 // 3), _Im.LANCZOS)
            _b = _io.BytesIO(); _im.save(_b, 'WEBP', quality=78, method=6)
            _new = _b.getvalue()
            open(_c, 'wb').write(_new if (len(_new) < len(_raw) * .88 or _f == 'loading-run.webp') else _raw)
        _out = open(_c, 'rb').read(); open(_p, 'wb').write(_out); _after += len(_out)
print('web pictures: %.1f MB -> %.1f MB' % (_before / 1e6, _after / 1e6))
import datetime as _dt
BUILD = (_dt.datetime.utcnow() + _dt.timedelta(hours=8)).strftime('%m%d-%H%M')
RESET = (':root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
         'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#16121f;color:#141413}')
web = out.replace('<script type="application/json" id="tphotos">' + json.dumps(tphotos) + '</script>',
                  '<script type="application/json" id="tphotos">[]</script>')
web = web.replace('<script id="engine">', '<script type="text/x-shiomi" id="boot-pending-engine">', 1)
web = web.replace('<script id="game">', '<script type="text/x-shiomi" id="boot-pending-game">', 1)
web = web.replace('id="boot-pending-engine"', 'id="engine"').replace('id="boot-pending-game"', 'id="game"')
web = web.replace('<title>汐見町闖關</title>\n', '')
head = ('<!doctype html><html lang="zh-Hant" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<title>汐見町闖關</title><meta name="theme-color" content="#16121f">'
        '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">'
        '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
        '<style>' + RESET + '</style>'
        # version stamp: if the page came from an old copy (slow network -> service-worker copy), reload once to the live version
        '<script>window.SHIOMI_BUILD="' + BUILD + '";(function(){try{fetch("version.json?t="+Date.now(),{cache:"no-store"}).then(function(r){return r.json();}).then(function(j){'
        'if(j&&j.v&&j.v!==window.SHIOMI_BUILD&&sessionStorage.getItem("shiomi_rl")!==j.v){sessionStorage.setItem("shiomi_rl",j.v);location.reload();}}).catch(function(){});}catch(e){}})();</script>'
        '</head><body>\n')
boot = '<script id="boot">' + open(S + 'web/boot.js').read() + '</script>\n'
open(WB + 'index.html', 'w').write(head + web + boot + '</body></html>\n')
open(WB + 'version.json', 'w').write(json.dumps({'v': BUILD}))
for f in ('sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'):
    shutil.copy(S + 'web/' + f, WB + f)
open(WB + '.nojekyll', 'w').write('')
print('web/ ready:', os.path.getsize(WB + 'index.html'), 'bytes')
