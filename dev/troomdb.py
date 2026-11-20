"""2D 手繪場景的資料：一個場景一個檔，放在 src/troom/rooms/<場景>.json。

以前全部擠在一個 src/troom/room.json，背景和室內兩個對話會同時改到同一個檔。
現在拆開：
  - cabin.json   老師房（遊戲裡是最上層的 landscape / portrait 兩個鍵）
  - <場景>.json   其他場景，例如 home、class、mart、field、gate、sq_bus……
build.py 用 load() 把它們合回原本的樣子放進網頁，順序固定（ORDER），所以網頁內容和以前一模一樣。
各個 *_build.py 轉檔腳本也用 load() / save()，只會改到自己那個場景的檔。
"""
import json, os

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src/troom/rooms')
CABIN = ('landscape', 'portrait')  # 老師房放在最上層的兩個鍵
# 合回去時的順序（和拆開前的 room.json 一樣）；新場景排在後面，照名字排
ORDER = ['cabin', 'bath', 'rest', 'home', 'class', 'mart', 'field', 'gate', 'sq_animals', 'sq_bus', 'sq_classmates']


def names():
    have = [f[:-5] for f in os.listdir(DIR) if f.endswith('.json')]
    return [n for n in ORDER if n in have] + sorted(n for n in have if n not in ORDER)


def load():
    """所有場景合成一個 dict（和以前的 room.json 一樣）。"""
    R = {}
    for n in names():
        d = json.load(open(os.path.join(DIR, n + '.json'), encoding='utf-8'))
        if n == 'cabin':
            for k in CABIN: R[k] = d[k]
        else:
            R[n] = d
    return R


def save(R, only=None):
    """把合起來的 dict 拆回每個場景一個檔。only=場景名單時只寫那幾個（轉檔腳本用，避免動到別人的場景）。"""
    os.makedirs(DIR, exist_ok=True)
    parts = {}
    if all(k in R for k in CABIN): parts['cabin'] = {k: R[k] for k in CABIN}
    for k, v in R.items():
        if k not in CABIN: parts[k] = v
    for n, v in parts.items():
        if only and n not in only: continue
        p = os.path.join(DIR, n + '.json')
        txt = json.dumps(v, ensure_ascii=False, indent=1) + '\n'
        if not os.path.exists(p) or open(p, encoding='utf-8').read() != txt:
            open(p, 'w', encoding='utf-8').write(txt)
