// 合併前檢查：這個分支有沒有改到不屬於這個角色的檔案。
// 用法：node scripts/team/owner-check.mjs <角色> [分支]
//   角色：handoff/team/owners.json 裡的名字（主程式、背景、室內、人物、遊戲設計）
//   分支：要檢查的分支，預設用 owners.json 裡這個角色的分支（例如 origin/bg）；也可以給 HEAD
// 比對的起點：這個分支和 workshop 分開的地方（merge-base）。只看這個分支自己改過的檔案。
// 全部在範圍內 → 「範圍檢查通過」，exit 0；有超出的 → 列出來，exit 1。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const git = (...a) => execFileSync('git', ['-c', 'core.quotePath=false', ...a], { cwd: ROOT, encoding: 'utf8' }).trim();
const O = JSON.parse(fs.readFileSync(path.join(ROOT, 'handoff/team/owners.json'), 'utf8'));
const role = process.argv[2];
if (role === '--unowned') { // 列出 repo 裡沒有人管的檔案（主程式整理 owners.json 時用）
  const all = git('ls-files').split('\n').filter(Boolean);
  const res = Object.values(O.roles).flatMap(v => v.owns.map(g => toRe(g)));
  const left = all.filter(f => !res.some(r => r.test(f)));
  console.log(left.length ? `沒有人管的檔案 ${left.length} 個：\n  ` + left.join('\n  ') : '每個檔案都有人管'); process.exit(left.length ? 1 : 0);
}
if (!role || !O.roles[role]) { console.log('用法：node scripts/team/owner-check.mjs <角色> [分支]\n角色：' + Object.keys(O.roles).join('、')); process.exit(2); }

const has = r => { try { git('rev-parse', '--verify', '--quiet', r + '^{commit}'); return true; } catch { return false; } };
const pick = (...rs) => rs.find(has);
const branch = process.argv[3] || pick('origin/' + O.roles[role].branch, O.roles[role].branch);
const base = pick('origin/workshop', 'workshop');
if (!branch) { console.log(`找不到 ${role} 的分支 ${O.roles[role].branch}`); process.exit(2); }
if (!base) { console.log('找不到 workshop 分支'); process.exit(2); }

// 簡單的萬用字元：** 任何一層資料夾、* 檔名裡任何字（不跨資料夾）、{a,b} 其中一個
function toRe(glob) {
  let s = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { s += '.*'; i++; if (glob[i + 1] === '/') i++; }
    else if (c === '*') s += '[^/]*';
    else if (c === '{') { const j = glob.indexOf('}', i); s += '(?:' + glob.slice(i + 1, j).split(',').map(x => x.replace(/[.+?^$()|[\]\\]/g, '\\$&')).join('|') + ')'; i = j; }
    else s += c.replace(/[.+?^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + s + '$');
}
const mine = O.roles[role].owns.map(toRe);
const from = git('merge-base', base, branch);
const files = git('diff', '--name-only', '--no-renames', from, branch).split('\n').filter(Boolean);
const out = files.filter(f => !mine.some(r => r.test(f)));
console.log(`${role}：檢查 ${branch}（從 ${base} 分出來之後）改過的 ${files.length} 個檔案`);
if (out.length) {
  console.log(`\n超出範圍 ${out.length} 個（這些不是「${role}」管的，不能合併）：`);
  for (const f of out) {
    const who = Object.entries(O.roles).filter(([k, v]) => k !== role && v.owns.some(g => toRe(g).test(f))).map(([k]) => k);
    console.log('  ' + f + (who.length ? `　← 屬於 ${who.join('、')}` : '　← 沒有人管，請主程式決定歸誰'));
  }
  process.exit(1);
}
console.log('範圍檢查通過');
