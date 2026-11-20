"""打開 ChatGPT 交來的場景包，並檢查格式。用法（一定要加 -I）：

    python3 -I scripts/pack_open.py <壓縮檔.zip> <新的空資料夾>

做的事：
1. 先檢查壓縮檔裡每個檔的路徑：不能是絕對路徑、不能有 ..、不能是捷徑（symlink），有就整包拒收。
2. 解到「新的空資料夾」（資料夾已經有東西就拒絕，避免蓋掉別的檔）。只解壓縮，不執行裡面任何程式。
3. 找出每個 manifest.json，照場景包的格式檢查：
   - scenes.<場景>.landscape / portrait 都在，畫布大小對（橫式 1920×1080、直式 1080×1920 或 manifest 寫的大小）
   - 背景、遮擋物的圖都在，而且大小和畫布一樣
   - 可走範圍、出口、人物大小（character_scale）格式對；出口的出生點在可走範圍裡
錯了就列出來並以失敗結束；只有「提醒」不算失敗。
"""
import json, os, stat, sys, zipfile
from PIL import Image

errs, warns = [], []


def bad(w, m): errs.append(f'{w}：{m}')


def note(w, m): warns.append(f'{w}：{m}')


def safe_extract(zp, out):
    if os.path.exists(out) and os.listdir(out):
        sys.exit(f'拒絕：{out} 不是空資料夾，請給一個新的資料夾')
    os.makedirs(out, exist_ok=True)
    root = os.path.realpath(out)
    with zipfile.ZipFile(zp) as z:
        for i in z.infolist():
            n = i.filename
            mode = i.external_attr >> 16
            if n.startswith('/') or n.startswith('\\') or ':' in n.split('/')[0] or '..' in n.replace('\\', '/').split('/'):
                sys.exit(f'拒絕整包：路徑不安全 {n}')
            if stat.S_ISLNK(mode):
                sys.exit(f'拒絕整包：裡面有捷徑（symlink）{n}')
            dest = os.path.realpath(os.path.join(out, n))
            if not (dest == root or dest.startswith(root + os.sep)):
                sys.exit(f'拒絕整包：會解到資料夾外面 {n}')
        z.extractall(out)
    return out


def inpoly(x, y, P):
    c = False
    j = len(P) - 1
    for i in range(len(P)):
        xi, yi = P[i]; xj, yj = P[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c


def is_poly(P): return isinstance(P, list) and len(P) >= 3 and all(isinstance(p, list) and len(p) == 2 for p in P)


def check_manifest(mp):
    base = os.path.dirname(mp)
    try:
        M = json.load(open(mp, encoding='utf-8'))
    except Exception as e:
        bad(mp, f'manifest.json 讀不到（{e}）'); return
    scenes = M.get('scenes')
    if not isinstance(scenes, dict) or not scenes:
        bad(mp, '最上層要有 scenes'); return
    for sid, S in scenes.items():
        for sk in ('landscape', 'portrait'):
            W = f'{sid}（{"橫式" if sk == "landscape" else "直式"}）'
            L = S.get(sk)
            if not L: bad(W, '少了這個方向'); continue
            cv = L.get('canvas') or {}
            cw, ch = cv.get('width'), cv.get('height')
            if not cw or not ch: bad(W, '少了 canvas 寬高'); continue

            def img(rel, what, alpha=False):
                p = os.path.join(base, rel or '')
                if not rel or not os.path.isfile(p): bad(W, f'{what} 的圖不在：{rel}'); return
                if os.path.islink(p): bad(W, f'{what} 是捷徑：{rel}'); return
                try:
                    im = Image.open(p)
                    if im.size != (cw, ch): bad(W, f'{what} 大小 {im.size[0]}×{im.size[1]}，和畫布 {cw}×{ch} 不一樣')
                    if alpha and im.mode not in ('RGBA', 'LA', 'P'): note(W, f'{what} 沒有透明背景（{im.mode}）')
                except Exception as e:
                    bad(W, f'{what} 打不開（{e}）')

            img(L.get('background'), '背景')
            for o in L.get('occluders') or []:
                img(o.get('file'), f'遮擋物 {o.get("id")}', alpha=True)
                if 'sort_y' not in o: bad(W, f'遮擋物 {o.get("id")} 少了 sort_y')
            walk = L.get('walk') or {}
            if not is_poly(walk.get('outer')): bad(W, '可走範圍 walk.outer 格式不對'); walk = None
            cs = L.get('character_scale') or {}
            try:
                [cs[k]['foot_y'] for k in ('far', 'near')]; [cs[k]['height_px'] for k in ('far', 'near')]
            except Exception:
                bad(W, 'character_scale 要有 far / near 的 foot_y 和 height_px')
            ex = dict(L.get('exits') or {}); ex.update(L.get('doors') or {})
            for k, e in ex.items():
                if not is_poly(e.get('polygon')): bad(W, f'出口 {k} 的 polygon 格式不對')
                sp = e.get('spawn')
                if not (isinstance(sp, list) and len(sp) == 2): bad(W, f'出口 {k} 少了 spawn'); continue
                if walk and (not inpoly(sp[0], sp[1], walk['outer']) or any(inpoly(sp[0], sp[1], h) for h in walk.get('holes') or [])):
                    note(W, f'出口 {k} 的出生點 {sp} 不在可走範圍裡')


if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    out = safe_extract(sys.argv[1], sys.argv[2])
    ms = [os.path.join(r, f) for r, ds, fs in os.walk(out) for f in fs if f == 'manifest.json']
    for r, ds, fs in os.walk(out):
        for f in fs:
            if os.path.islink(os.path.join(r, f)): bad(f, '解出來是捷徑（symlink）')
    if not ms: note(out, '找不到 manifest.json（如果這包不是場景包，可以忽略）')
    for m in ms: check_manifest(m)
    for w in warns: print('提醒｜' + w)
    for e in errs: print('錯誤｜' + e)
    print(f'\n解到：{out}\n' + (f'場景包檢查沒過：{len(errs)} 個錯誤、{len(warns)} 個提醒' if errs else f'場景包檢查通過（{len(ms)} 個 manifest、{len(warns)} 個提醒）'))
    sys.exit(1 if errs else 0)
