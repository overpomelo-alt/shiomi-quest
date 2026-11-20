// 資料檢查：npm run check
// 檢查遊戲要讀的資料格式對不對、要用的圖在不在。錯了就列出來並且失敗（exit 1）；「提醒」不會讓檢查失敗。
// 只用 Node 內建功能，不用另外安裝。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'dev/src');
const errs = [], warns = [];
const err = (where, msg) => errs.push(`${where}：${msg}`);
const warn = (where, msg) => warns.push(`${where}：${msg}`);
const readJSON = (p, where) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { err(where, '讀不到或格式錯誤（' + e.message + '）'); return null; } };
const num = v => typeof v === 'number' && Number.isFinite(v);
const pt = p => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1]);
const poly = P => Array.isArray(P) && P.length >= 3 && P.every(pt);
function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const walkable = (D, x, y) => (D.walk || []).some(w => inPoly(x, y, w.outer) && !(w.holes || []).some(h => inPoly(x, y, h)));

// ---------- 1. 2D 手繪場景（dev/src/troom/rooms/<場景>.json）
const TR = path.join(SRC, 'troom');
const webp = new Set(fs.readdirSync(TR).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)));
const used = new Set();
const PREFIX = { cabin: '', bath: 'bath_', home: 'home_', class: 'class_', mart: 'mart_', gate: 'sgate_', field: 'sfield_', rest: 'rest_' };
const roomsDir = path.join(TR, 'rooms');
for (const f of fs.readdirSync(roomsDir).filter(f => f.endsWith('.json')).sort()) {
  const scene = f.slice(0, -5), S = readJSON(path.join(roomsDir, f), '場景 ' + f); if (!S) continue;
  for (const sk of ['landscape', 'portrait']) {
    const W = `場景 ${scene}（${sk === 'landscape' ? '橫式' : '直式'}）`, D = S[sk];
    if (!D) { err(W, '少了這個方向'); continue; }
    if (scene === 'rest') continue; // 躺床圖層：格式不同，只檢查有兩個方向
    if (!num(D.w) || !num(D.h)) err(W, '少了畫布寬高 w / h');
    // 背景圖
    const bg = D.bgkey || `${PREFIX[scene] ?? scene + '_'}${sk}_bg`;
    if (!webp.has(bg)) err(W, `找不到背景圖 ${bg}.webp`); else used.add(bg);
    // 可走範圍
    if (!Array.isArray(D.walk) || !D.walk.length) err(W, '少了可走範圍 walk');
    else D.walk.forEach((w, i) => { if (!poly(w.outer)) err(W, `walk[${i}].outer 不是至少 3 個點的多邊形`); (w.holes || []).forEach((h, j) => { if (!poly(h)) err(W, `walk[${i}].holes[${j}] 格式不對`); }); });
    // 遮擋物
    (D.occ || []).forEach(o => {
      if (!o.file || !webp.has(o.file)) err(W, `遮擋物 ${o.id || '?'} 的圖 ${o.file}.webp 不在`); else used.add(o.file);
      if (!num(o.x) || !num(o.y)) err(W, `遮擋物 ${o.id || '?'} 少了位置 x / y`);
      if (!num(o.sort) && !o.line) err(W, `遮擋物 ${o.id || '?'} 少了前後順序 sort 或 line`);
    });
    // 遠近身高
    if (D.hh !== undefined && !(Array.isArray(D.hh) && D.hh.length === 4 && D.hh.every(num))) err(W, 'hh 要是 4 個數字 [遠的腳 y, 近的腳 y, 遠的身高, 近的身高]');
    if (D.ss) D.ss.forEach((a, i) => { if (!(Array.isArray(a) && a.length === 3 && a.every(num))) err(W, `ss[${i}] 要是 [x, y, 身高]`); });
    // 出口：形狀、出生點要在可走範圍裡
    const exits = Object.assign({}, D.exit ? { exit: D.exit } : {}, D.exits || {}, D.doors || {});
    for (const [k, e] of Object.entries(exits)) {
      if (!poly(e.polygon)) err(W, `出口 ${k} 的範圍 polygon 格式不對`);
      if (!pt(e.spawn)) err(W, `出口 ${k} 少了出生點 spawn`);
      else if (D.walk && !walkable(D, e.spawn[0], e.spawn[1])) warn(W, `出口 ${k} 的出生點 (${e.spawn}) 不在可走範圍裡`);
    }
  }
}
// 有些圖是程式用名字組出來的（躺床、窗戶夜色、門簾…），沒被資料直接寫到；只提醒，不算錯
const unused = [...webp].filter(k => !used.has(k) && !/^(rest_|landscape_|portrait_)|_(floor|wall)_|_(bed|rest|win|night)/.test(k));
if (unused.length) warn('troom 圖檔', `有 ${unused.length} 張圖沒有被場景資料直接用到（可能是程式另外組名字讀的）：${unused.slice(0, 8).join('、')}${unused.length > 8 ? '…' : ''}`);

// ---------- 2. 人物圖集（dev/src/sprites/meta.json）
const meta = readJSON(path.join(SRC, 'sprites/meta.json'), '人物 meta.json');
if (meta) for (const [k, v] of Object.entries(meta)) {
  if (!fs.existsSync(path.join(SRC, 'sprites', k + '.webp'))) err('人物 ' + k, `圖集 sprites/${k}.webp 不在`);
  if (!v || typeof v !== 'object') err('人物 ' + k, 'meta 格式不對');
}

// ---------- 3. 題目（dev/src/quest.json）
const Q = readJSON(path.join(SRC, 'quest.json'), '題目 quest.json');
if (Q) {
  const ids = new Set();
  (Q.stations || []).forEach((s, i) => {
    const W = `題目站 ${s.id || '#' + i}「${s.title || ''}」`;
    if (!s.id) err(W, '少了 id'); else if (ids.has(s.id)) err(W, 'id 重複'); else ids.add(s.id);
    if (!Array.isArray(s.qs) || !s.qs.length) err(W, '沒有題目');
    (s.qs || []).forEach((q, j) => {
      if (!q.q) err(W, `第 ${j + 1} 題沒有題目文字`);
      if (Array.isArray(q.o)) { if (q.o.length < 2) err(W, `第 ${j + 1} 題選項少於 2 個`); if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length)) err(W, `第 ${j + 1} 題的答案 a=${q.a} 不在選項範圍裡`); }
    });
  });
}

// ---------- 4. 車站、家具（只檢查讀得到）
readJSON(path.join(SRC, 'sroom/sroom.json'), '車站 sroom.json');
readJSON(path.join(SRC, 'hroom/hroom.json'), '家具 hroom.json');
readJSON(path.join(SRC, 'tex/tex.json'), '貼圖 tex.json');

// ---------- 結果
for (const w of warns) console.log('提醒｜' + w);
for (const e of errs) console.log('錯誤｜' + e);
console.log(errs.length ? `\n資料檢查沒過：${errs.length} 個錯誤、${warns.length} 個提醒` : `資料檢查通過（${warns.length} 個提醒）`);
process.exit(errs.length ? 1 : 0);
