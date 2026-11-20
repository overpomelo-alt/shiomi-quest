#!/usr/bin/env bash
# 測試分輕重。先在 dev/ 跑過 python3 build.py，再執行：
#   bash dev/tests/run.sh light <測試檔…>   試做時：只跑和這次改動有關的幾支，手機一種大小（390×844）
#   bash dev/tests/run.sh walk              上正式版前：基本走一圈（開場→車站→教室→領養，手繪 Sqoyaw 一整圈），兩種手機＋學校平板
#   bash dev/tests/run.sh full              全部跑：基本走一圈＋Sqoyaw 3D 巡檢＋村子配置比對＋繞圈截圖
# 什麼時候跑 full：改到存檔格式、改到走路引擎的核心、一次換一大批圖、距離上次 full 已經 3 輪（日子記在 handoff/team/主程式.md 最上面）。
# 截圖放在 $OUT（預設 /tmp/shiomi-tests），不要 commit 進 repo。
set -u
cd "$(dirname "$0")"; T=$(pwd)
OUT=${OUT:-/tmp/shiomi-tests}; mkdir -p "$OUT"
PORT=${PORT:-8765}; export PORT
[ -d node_modules/playwright-core ] || npm i --silent
python3 mk_test.py >/dev/null
# 本機伺服器（只在沒開的時候開）
if ! curl -s -o /dev/null "http://localhost:$PORT/test.html"; then (cd ../dist && setsid nohup python3 -m http.server "$PORT" </dev/null >/dev/null 2>&1 &); sleep 1; fi
FAIL=0
run(){ # run <名稱> <指令…>：跑一支，看輸出裡有沒有錯誤
  local name=$1; shift; echo "── $name"; local log="$OUT/${name// /_}.log"
  if ! (cd "$OUT" && "$@") >"$log" 2>&1; then echo "   沒過（程式結束有錯）→ $log"; FAIL=1; return; fi
  # 各測試最後都會印出頁面上的錯誤清單：空的 [] 才算過；Sqoyaw 巡檢還要卡住／陷地／穿進房子都是 0
  if grep -qE '^\["|^errs \["' "$log"; then echo "   頁面有錯誤訊息 → $log"; FAIL=1
  elif grep -q '"stuck":' "$log" && ! grep -q '"stuck":0,"sink":0,"inside":0' "$log"; then echo "   巡檢有卡住／陷地／穿模 → $log"; FAIL=1
  else echo "   過"; fi
}
walk(){ for s in phone small tab; do
    o=p; [ $s = tab ] && o=l
    run "基本走一圈 $s 教室車站領養" env SIZE=$s node "$T/smoke2.js"
    run "基本走一圈 $s 手繪Sqoyaw" env SIZE=$s Q=sq2d=1 node "$T/sq2d.js" "$OUT" "walk_$s" $o
  done; }
case "${1:-}" in
  light) shift; [ $# -gt 0 ] || { echo "要給測試檔，例如：run.sh light sq2d.js"; exit 2; }
         for t in "$@"; do run "試做 $t" env SIZE=phone node "$T/$t" "$OUT" light; done ;;
  walk)  walk ;;
  full)  walk
         run "Sqoyaw 3D 巡檢" node "$T/patrol.js"
         run "村子配置比對" bash -c "node '$T/bld_dump.js' '$OUT/bld_now.json' && cmp '$T/bld_before.json' '$OUT/bld_now.json'"
         run "繞圈截圖" node "$T/orbit.js" ;;
  *) sed -n '2,8p' "$0"; exit 2 ;;
esac
[ $FAIL = 0 ] && echo "全部過" || { echo "有沒過的，看上面列的 log"; exit 1; }
