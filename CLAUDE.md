# 汐見町闖關（shiomi-quest）— 給 Claude 的交接說明

平等國小五年級（全班 5 人）的跨科闖關遊戲，網址是 https://overpomelo-alt.github.io/shiomi-quest/ 。老師登入請在網址後面加 `?teacher`。
使用者是這個班的班導 Tien（邱聖瑱），所有素材都是她用 ChatGPT 畫的，由 Claude 轉成遊戲可用的格式再接進遊戲。回覆一律用繁體中文、白話，不要用術語。

---

## 0. 開工前必讀：使用者的偏好

- **先討論，再一次做完**：先把這一批要做的事和做法談好，確定後一口氣做完、一次回報。不要做一點回報一點。一批最好 3～5 件，避免其中一件卡住拖累整批。
- **非常在意穿模**：人物、物件、鏡頭穿進牆壁、山坡、家具，或物件互相重疊，都算嚴重問題。每次改完都要從多個角度截圖檢查，可以用 `dev/tests/orbit.js` 繞一圈拍。
- **要看得到改變**：她不接受「改了但看起來一樣」。回報時附「改前／改後」截圖，兩張要同一地點、同一鏡頭。
- **說明和步驟一次寫完整**：每個畫面要選什麼都寫清楚，不要一步一步來回問。
- **直接發布正式版**：改好、驗證過，就直接 push 到 main（GitHub Pages 會自動上線），不用另外開測試版。
- **固定規則**：
  - 不放族語。
  - 學生不能開「任意門」，只有老師可以。
  - 部落要叫「Sqoyaw」，介面上不要一直寫「部落」。
  - Sqoyaw 村子的配置（房子位置）不能變，見第 6 節的「亂數規則」。
- 她用手機和學校平板測試，所以畫面要同時顧到直式和橫式。

---

## 1. 怎麼建置、測試、發布

```bash
cd dev
python3 build.py        # src/ → dist/（本機版）＋ web/（網路版）
```
- 有 `dev/.webcache/` 時大約 1 分鐘；快取不見就要重新壓縮所有圖片，大約 10 分鐘。
- `web/version.json` 的版本號是台北時間 MMDD-HHMM。手機打開網頁時如果發現版本不同，會自動重新載入一次。

**發布**：把 `dev/web/` 的內容複製到 repo 根目錄，再 commit、push。
- 要複製的檔案：`index.html`、`sw.js`、`version.json`、`manifest.webmanifest`、`icon-192.png`、`icon-512.png`。
- `assets/` 要和 `dev/web/assets/` 同步：刪掉多出來的檔案，但**不要動 `assets/source/`**。
- 機器上沒有 rsync，同步可以用一小段 Python。
- commit 作者用 `overpomelo-alt <overpomelo@gmail.com>`。
- push 後用 `gh api repos/overpomelo-alt/shiomi-quest/commits/main/check-runs` 等 build 和 deploy 都顯示 success。

**測試**（Playwright 加無頭 Chromium，腳本都在 `dev/tests/`）：
```bash
cd dev/tests && npm i                                  # playwright-core
(cd ../dist && python3 -m http.server 8765 &)         # 本機伺服器
python3 mk_test.py                                      # 產生 dist/test.html，把內部函式透過 window.__qf() 開放給腳本
node patrol.js       # Sqoyaw 巡檢：走遍所有巷子，檢查卡住、陷進地面、穿進房子（要全部 0）
node smoke2.js       # 冒煙測試：教室、車站、領養
node bld_dump.js out.json && cmp bld_before.json out.json   # 村子配置有沒有變（必須相同）
node orbit.js        # 6 個地點、各 8 個方向截圖，檢查穿模和漏畫
node nreal.js TAG night '{}'                            # 用老師設定的天色拍 6 個地點（可以覆寫夜晚數值）
```
- `base.js` 寫死了 Chromium 的路徑 `/opt/pw-browsers/chromium-1194/...`，換環境要改這裡。
- 用座號 `'3'` 登入。老師座號 T 會卡在登入流程。
- 重的測試不要同時跑：機器忙的時候，patrol 會誤報 STUCK。
- 腳本直接把玩家傳送到很遠的地方時，鏡頭會慢慢追上去。拍照前先執行 `q.cam.pos.set(0,0,0)`，讓鏡頭直接跳到定位。

---

## 2. Repo 結構

```
/                       ← GitHub Pages 直接發布這一層（index.html、sw.js、version.json、manifest、icons）
├─ assets/              ← 遊戲用的圖（由 build.py 產生，不要手改）
│  ├─ art/  characters/  rooms/  tex/  ui/  catalog.json
│  └─ source/           ← 原始素材（ChatGPT 原圖、修過的圖、規格書），見第 4 節
├─ dev/                 ← 程式碼
│  ├─ build.py          ← 組裝遊戲
│  ├─ *_build.py 等     ← 把 ChatGPT 素材包轉成遊戲格式的腳本，見第 3 節
│  ├─ ASSETS.md         ← 角色圖集的詳細對照表
│  ├─ src/              ← 遊戲原始碼和處理過的素材（build 的輸入）
│  ├─ tests/            ← 自動測試和截圖腳本
│  └─ .webcache/        ← 網路版圖片壓縮快取（保留，可以讓 build 快很多）
├─ docs/交接說明.md      ← 給任何接手者的總覽（技術、部署、Firebase 資料結構、已知問題）
├─ docs/設計要求.md      ← 使用者已確認的遊戲規則、學校配置、角色規格、畫風、要保留的功能
├─ docs/待修清單.md      ← 每一批改了什麼的完整紀錄
├─ docs/raw_map.json    ← 舊 raw/ 資料夾對應到 assets/source/ 的哪裡
└─ CLAUDE.md
```
注意：`assets/source/` 大約 690 MB。GitHub Pages 整個網站的上限是 1 GB，目前加起來大約 735 MB，素材再多下去要考慮搬到另一個 repo 或改用 Git LFS。

---

## 3. 每個檔案在做什麼

### 遊戲本體（`dev/src/`）
| 檔案 | 用途 |
|---|---|
| `game.js` | **整個遊戲的程式**，大約 7,000 行、900 KB，全部在這一個檔案。用區塊標題 `/* ===== 名稱 */` 分段，下面列出主要區塊 |
| `engine.js` | three.js r128，原封不動內嵌，避免學校網路擋 CDN |
| `markup.html` | HUD、面板、選單的 HTML，由 game.js 注入頁面 |
| `style.css` | 全部樣式 |
| `quest.json` | 預設題目和設定。老師在遊戲裡改的版本存在雲端，會覆蓋這份 |
| `loader.js`、`loader/` | 載入畫面（跑步的小人） |
| `web/boot.js` | 網路版開機：先從 Firestore 讀老師設定，再啟動遊戲 |
| `web/sw.js` | 離線快取。頁面先試網路，10 秒沒回應才用快取 |
| `sprites/` | 角色圖集（webp）、`meta.json`（每格大小、影格表）、`faces.json`（換臉資料）、`resfaces.json` |
| `troom/` | 所有 **2D 手繪場景**的圖和 `room.json`（可走區域、遮擋物、互動點、遠近身高）。檔名前綴對應場景，見第 4 節 |
| `sroom/` | 車站大廳 2D 場景、任意門地點圖 |
| `hroom/` | 學生房間裝飾家具的圖示 |
| `tex/` | 3D 地面、牆面貼圖（`tex.json`）。第二批加了紅磚、藍／紅／綠鐵皮、直向木板牆 |
| `env/` | 遠山環景圖（Sqoyaw、汐見町各一張，含 `_2k` 省電版），由 `env_build.py` 產生 |
| `art/` | 學校樣板的手繪樹叢葉團、樹皮、草地（3D 用）。當初用一次性指令轉出，沒有留腳本 |
| `cabin/` | 老師小屋的照片（只在本機版，網路版不放） |
| `icons/` | UI 圖示 |
| `_old_parts/` | **早期從 game.js 切出來的片段，已經過時，build 不會讀，不要改** |

### game.js 主要區塊（用搜尋找，行號會變）
- `Renderer / scene`：渲染器、ACES 色調和之後的自訂調色（`tonemapping_pars_fragment`）、陰影。
- `Time of day`：`PRESETS`（sunset／night／day 三組數值）、`blendState`。天色由老師設定：`classSky()`、`realTick()`、`skySet()`、`timeBtn()`。
- 汐見町小鎮：`World layout`、`Sky`、`Sea`、`Town ground`、`Rail line`、`Houses & shops`、`Konbini`、`Shrine`、`Coast`、`Streetlife`（電線桿、路燈）等。
- **遠山**：搜尋 `RIDGE`、`ridgeTick`。兩個內面貼圖的圓柱，固定在世界座標（不跟著鏡頭轉）：
  - Sqoyaw：中心 (TB.x-10, 30)、半徑 212，整圈；圖的下方 35% 大樹帶裁掉不用（`vcrop`），後面多一圈「天空色的牆」（用天空同一支 shader），把半徑外更高的 3D 山壁藏起來。
  - 汐見町：中心 (0, 40)、半徑 600，只有陸地那一側 200°，兩端淡出，海和夕陽不被擋；舊的條紋遠山 `FAR_RIDGE` 會自動隱藏。
  - 不受光、不吃霧；白天原色，傍晚偏暖變暗，夜晚變深藍（`_rgD/_rgS/_rgN`）。省電模式用 `_2k` 圖。
- `Collision`：`COLS` 碰撞盒、`addCol`／`addColO`、`rayDist`（鏡頭碰撞）、`camInside`、`CUTU`（穿透視角）。
- `Quest config & student state`：`CFG`、雲端存檔、`cfgPut`（老師設定寫回 Firestore 的 `shiomi/config`）。
- 學習相關：`Teacher mode`（老師面板 `renderTP`）、`挑戰館`、`Stamp card`、`公告板`。
- 角色：`Illustrated (2D paper-doll) characters`（2D 角色貼片、換臉、動作）、`Dress-up`、`Pets`。
- 其他場景：`My room`、`老師的山上小屋`、`平等車站 (hub)`、`探險：神秘小島 & 瀑布迷宮`、`Opening cutscene`。
- **2D 房間引擎**：搜尋 `R2CFG`、`r2Enter`、`r2Walk`。`R2.room` 可以是 cabin、bath、home、class、mart、field、gate。
  - 每個 2D 場景有自己的進出函式：`martEnter2`、`fieldEnter`／`fieldLeave`、`gateEnter`／`gateLeave`、`clsEnter`。
- 車站大廳 2D：`S2CFG`。
- **Sqoyaw**（世界座標 x 加 2600 那一塊）：
  - 地圖資料：`TB`、`SQ_LANES`（巷子）、`SQ_ROAD`（台 7 甲）、`SQW`（8 個打卡點）。
  - 地形：`tribeH`（含房子地基）、`sqBase`、`TB.terrH`（純地形）。
  - 合併繪製：`sqBatch`。房子在 `BLD` 迴圈裡產生，之後是路燈。
- 手繪樹叢貼片：`FOLI`、`foliMat`、`foliBuild`、`SCARDS`。
- **3D 樣板（第十三批）**：材質加 `userData.paint=1` 就會用「手繪明暗」（柔和兩段、暗面偏冷、不全黑），寫在 `inkLambert`；學校（`SG`）、學校草地、球場、跑道、Sqoyaw 地形已經用上。`sqPaintTrees` 把學校周圍 `SQPT_R` 公尺內的山坡樹、果園樹換成手繪葉團貼片。葉團貼片離鏡頭 3.2 公尺內會整張隱藏（之前用的網點淡出會在畫面上留下雜點，不要再用）。
- `GFX`：省電模式（lite）。
- `Main loop`：主迴圈和 `applyEnv`（把天色套到燈光、霧、窗戶、路燈光暈）、`updateCamera`。
- `即時同步`：`PRES`、`presTick`，同時上線時看得到同學。

### 素材轉換腳本（`dev/*.py`，都要在 `dev/` 底下執行）
| 腳本 | 從哪裡 → 轉成什麼 |
|---|---|
| `build.py` | src → dist（本機版）和 web（網路版） |
| `rooms_v3_build.py` | 老師房 v3 → cabin 房間和躺床圖層；便利商店 v3 → mart |
| `studentroom_v3_build.py` | 學生房 v3 → home |
| `bedrest_build.py` | 學生房躺床圖 |
| `classroom_build.py` | 五年級教室 → class |
| `field_build.py` | 正式操場 field-v1 包 → 操場 field（舊的暫時版改名 `field_build_v02_old.py`） |
| `env_build.py` | 遠山包 → src/env |
| `gate_build.py` | 校門口 gate-v1 包 → gate |
| `station_v4.py` | 車站剪票口 v4 → sroom |
| `tex_build.py` | 材質包＋第二批貼圖（`assets/source/batches/batch2/game-ready/assets/tex`）→ src/tex |
| `pack_actions.py` | 動作包（坐、揮手、跑步等）→ act0N 圖集 |
| `pack_animals.py`、`hudie_build.py`、`add_pet_backs.py` | 動物、蝴蝶（老師的狗，背面走路取自 back-walk 補圖包）、寵物背面 |
| `pack_all.py`、`sprite_pack.py`、`add_walks.py`、`bake_stride.py`、`side_prep.py` | 角色站姿、走路圖集 |
| `face_prep.py`、`faces_build.py`、`face_test.py` | 換臉（五官零件）資料 |
| `ui_icons.py` | 圖示 |

---

## 4. 素材在哪裡、怎麼命名

### 原始素材 `assets/source/`（ChatGPT 原檔，要重修就從這裡改）
| 資料夾 | 內容 |
|---|---|
| `characters/sheets/` | 6 位學生造型的原圖和修過的圖（hero1 草帽、sailor、hoodie 粉帽 T、sporty 黃 T、green 綠帽 T、redcap 紅帽），`face_*`／`sface_*`／`piece_*` 換臉零件，`prev*_*` 各版預覽，`bak_*` 備份 |
| `characters/packs/` | ChatGPT 角色包 pack3～pack7（人物、寵物、換臉工作室） |
| `characters/actions/` | 動作包（student-daily／interactions／sports／run、resident-walk、pet-transitions）、跑步、走路修正 |
| `characters/pets/` | 貓動作、老師的狗（蝴蝶，含 `shiomi-teacher-dog-back-walk` 背面走路補圖）、保育動物（石虎、黑豹、狼犬、馬爾濟斯、貴賓、黑熊） |
| `characters/sprites_orig/` | 動作包轉換前的原始圖集（pack_actions.py 每次都從這裡開始處理） |
| `rooms/station/` | 車站大廳和剪票口（v3、v4） |
| `rooms/teacher_room/` | 老師房（舊版、v2、v3） |
| `rooms/student_room/` | 學生房 v3、躺床圖、參考圖、重畫規格 |
| `rooms/mart/`、`rooms/classroom/` | 便利商店 v3、五年級教室 |
| `school/` | 校門口 gate-v1、正式操場 `school_field_v1`、學校樣板（樹叢、草地）、學校戶外規格、學校實景照片、給 ChatGPT 的規格 zip |
| `env/` | 遠山包 `shiomi-mountains`（原始 PNG、預覽、檢查表） |
| `batches/batch2/` | 第二批素材的接入說明、給 ChatGPT 的下一批需求、別的對話轉好的 game-ready 檔（新貼圖的來源就在這裡） |
| `art_direction/artpack_v02/` | 全遊戲美術設計初稿 v0.2（設計圖、色票、交接說明） |
| `textures/` | 舊材質包 |
| `specs/` | 給 ChatGPT 的各種規格書（.md） |
| `screenshots/` | 給使用者看的改前改後截圖和影片 |

### 遊戲用的素材 `dev/src/` 的命名
- `troom/` 的前綴對應場景（`build.py` 的 `room_dir()`）：
  - `home_`：學生房。
  - `bath_`：浴室。
  - `rest_`：躺床。
  - `class_`：教室。
  - `mart_`：便利商店。
  - `sfield_`：操場。
  - `sgate_`：校門口。
  - 沒有前綴的 `landscape_*`／`portrait_*`：老師房。
- 每個場景都分 `landscape`（橫式）和 `portrait`（直式）兩套：`<前綴><sk>_bg.webp` 是背景，`<前綴><sk>_o_<id>.webp` 是遮擋物（會擋在人物前面的家具）。
- `room.json[場景][sk]` 的欄位：
  - `walk`：可走的多邊形和不能走的洞。
  - `occ`：遮擋物，含 `sort`／`line` 決定前後順序。
  - `acc`：互動點。
  - `exit`／`exits`：出口。
  - `hh`：遠近身高，格式是 [遠的腳 y, 近的腳 y, 遠的身高, 近的身高]。
  - `slots`／`own`：可放東西的位置。
- 角色圖集：一格 264×384，鞋底在第 380 列；跑步圖集一格 336×320。
  - 學生編號：01 hero1、02 sailor、03 hoodie、04 sporty、05 green、06 redcap。
  - `res01`～`res10` 是居民，`ani_*` 是動物，`cat_*`／`shiba_*` 是寵物。
  - 詳細對照見 `dev/ASSETS.md`。
- 新素材包的流程：
  1. 把包放到 `assets/source/<分類>/<包名>/`。
  2. 寫或改一個 `*_build.py` 轉進 `src/`。
  3. 執行 `build.py`。

---

## 5. 目前進度（最後一版見 `version.json`；第十二批）

**已完成並上線**
- **室內 2D 手繪場景**（可以走動，人物會被家具擋住，直式橫式各一套）：學生房 v3、老師房 v3（含浴室、躺床、照片牆、窗戶夜色）、便利商店（含店員）、五年級教室、車站大廳。
- **學校**：
  - 校門口用正式手繪包，可以溜魚滑梯、鑽魚肚子、進器材倉庫、踢球。
  - 操場換成正式手繪包（橫式、直式各一套）：出口用走的就會觸發——右邊跑道回校門口、白門進五年級教室、左邊跑道到 3D 的單槓草地（手繪草地還沒來）。互動：投籃、中圈遊戲、旗桿、司令台（看全校公告）、木平台。
  - 3D 校園裡的樹換成手繪葉團貼片，草地換成手繪草地。
- **夜晚**：調亮，夜色偏藍但看得清楚。
- **遠山**：Sqoyaw、汐見町都換成手繪遠山環景（第二批）。
- **Sqoyaw 房子貼圖**：屋頂改成藍／紅／綠鐵皮，部分牆面改紅磚、藍綠鐵皮、直向木板（只換材質，房子位置不變）。
- **蝴蝶（老師的狗）**：往遠處走時用真正的背面圖（3D 和 2D 場景都是）。
- **Sqoyaw 路燈**：69 支，燈頭會亮、有光暈，地上有光圈。
- **天色由老師設定**：老師面板 →「其他設定」→「天色（全班一起）」，可選白天、傍晚、夜晚、跟著真實時間。預設是白天，學生每分鐘自動同步一次。
- **鏡頭**：被山坡擋住會自己抬高；電線桿、旗子、路燈不會再把鏡頭拉到臉前。
- **全遊戲改色**：照美術包 v0.2 調整天空和色調；加了遠近細節切換和省電模式；手機會自動載入最新版。
- **雲端**：Firebase 存檔、老師設定、留言板、同學互訪、即時看到同學、老師補發印章。
- **其他已有功能**：闖關題目、挑戰館、集章卡、寵物和保育動物（動物之家）、扭蛋、換裝、開場動畫、Sqoyaw 8 個打卡點。

**驗證狀態**
- 第十二批：村子配置相同（bld_dump）、巡檢、smoke、操場三個出口都測過。
- **還沒在真手機上確認**：1019 版的夜晚亮度、路燈、天色同步；第十二批的遠山在手機上的清晰度。

---

## 6. 還沒解決的問題

### A. 亮度不一致
**症狀**：同一個時段，不同地方的亮度差很多。
- 夜晚的 Sqoyaw 原本幾乎全黑。
- 學校、便利商店這些 2D 手繪場景一直很亮。
- 老師房、學生房的 2D 場景晚上會變暗。
- 截圖時「同樣的數值」有時亮、有時暗。

**目前的推測**（依可能性排序）：
1. **夜晚數值原本太暗**：舊的 `PRESETS.night` 是 sunI .5、hemiI .58，天光顏色很深。1019 版已改成 sunI .8、hemiI .9、exposure 1.4、light .6，天光改淡藍色。如果真手機上還是太暗或太亮，就調這幾個數字。
2. **2D 和 3D 的畫法不同**：
   - 3D 是 Lambert 材質加燈光，再經過 ACES 色調和自訂調色（飽和度 +14%、對比 +7%）。
   - 2D 手繪場景是直接把圖畫在 canvas 上，不經過燈光和色調，所以同樣是白天，2D 會比 3D 亮，顏色也不同。
   - 晚上只有老師房和學生房會疊一層 multiply 夜色；學校、便利商店、操場刻意不疊，因為那幾張圖畫的就是上午陽光。
   - 想要一致，可以給 2D 場景依天色疊一層較淡的濾色，或者讓 3D 的白天更接近手繪圖的亮度。
3. **測試時的假象**：
   - 在測試腳本裡用 `new THREE.Color('#hex')` 覆寫數值，會比遊戲裡的 `col()` 亮很多，因為 `col()` 會先把 sRGB 轉成線性。
   - 這會造成「同一組數值、截圖亮度不同」，這次查亮度時被它誤導很久。
   - **比較亮度時一律用 `PS[...]` 或 `col()`**，或用 `nreal.js`（已經修正）。
4. **裝置差異**：
   - 手機的 pixelRatio 上限是 1.25。
   - 記憶體 3 GB 以下會自動開省電模式。
   - 無頭 Chromium（swiftshader）的截圖和真手機的 GPU 畫面可能有落差。
5. **Lambert 是逐頂點打光**：大面積的地面只在頂點算光，所以 PointLight 打不出地上的光圈。路燈光圈是另外畫在地上的貼片，不是真的光。

**最快的解法**：請使用者提供「對的」和「錯的」截圖並排，兩張要同一個地點、同一個時段、同一台裝置。

### B. 穿模和「漏畫」（使用者很在意）
- 已修好兩種：鏡頭被山坡擋住、鏡頭被細柱子拉到臉前。
- 還沒修：站在高樓牆邊、鏡頭轉向牆的時候，鏡頭會拉近到背後。原因是 Sqoyaw 有幾棟樓的碰撞盒高達 17 公尺，鏡頭抬不過去。
- Sqoyaw 開了「穿透視角」（`CUTU`）：鏡頭和人物之間的房子會被挖空，可能就是使用者說的「漏畫」。這次試過關掉，但鏡頭會卡進房子裡更糟，所以又開回來了。
- 使用者說的「漏畫」到底是哪一種還沒確認，請她提供截圖。

### C. 3D 很醜（素材問題，不是程式設定）
- Sqoyaw 和汐見町的牆、屋頂、路面還是程式做的色塊。
- 遠山已換成手繪環景（第十二批）。Sqoyaw 半徑 212 以內的 3D 山坡還是程式做的條紋色塊。
- 屋頂和部分牆面已換第二批貼圖；汐見町小鎮的房子還沒換。

### D. 其他
- `game.js` 是一個 900 KB 的大檔，搜尋和修改都慢。之後可以考慮拆成多個模組，但要注意亂數規則。
- 素材資料夾接近 GitHub Pages 1 GB 的上限（第十二批後 `assets/source/` 約 690 MB）。

### 寫程式的地雷
- **亂數規則**：Sqoyaw 房子的位置由 `rand()` 的呼叫順序決定。在房子產生之前**不能增加或減少任何 rand() 呼叫**，後處理一律用固定的雜湊。改完要用 `bld_dump.js` 比對確認。
- 顏色一律用 `col('#hex')`，它會把 sRGB 轉成線性。
- three r128 的 InstancedMesh 預設 `frustumCulled=false`，大量實例不用擔心被裁掉。
- 2D 場景的出口只有 gate 和 field 是「走進去就觸發」（進場後要先走出出口範圍才會再觸發），其他場景都要按互動鍵。
- 「站在旁邊就畫到後面」的舊遮擋規則只用在 home 和 cabin。

---

## 7. 待辦清單

**第十三批之後的方向（使用者已同意）**
- 戶外只用 3D，不要再用手繪固定畫面切換。房間（學生房、老師房、便利商店、教室）保留手繪，進門才切換。
- 先做一小段 3D 樣板給她看實際截圖和繞圈影片，她認可之後，再照同一個標準改整座學校和 Sqoyaw。
- 手繪的校門口、操場、單槓草地先維持現狀，等她決定。
- 已收到但還沒接的素材：老師房第 4 版、居民 Q 版、單槓草地、shiomi-tiles（12 張）。房間人物要用門、桌椅的高度逐間校正，不能全部直接放大一倍。


**等 ChatGPT 的圖**
1～3. 單槓草地、Q 版居民、老師房浴室改版都已經收到（見上一段），目前沒有在等的圖。

**不用等圖就能做**
4. 用學校那批手繪樹叢和草地，把 Sqoyaw 全村的樹（山上、果園、巷子）換掉，草地換成 grass_b。已經向使用者提議，還在等她確認。
5. 確認「漏畫」是哪一種並修好；處理高樓牆邊鏡頭拉近的問題。
6. 請使用者用真手機確認夜晚亮度、路燈、天色同步，以及第十二批遠山的清晰度（不清楚的話可以改用 8K 原圖或只在近處加 3D 樹）。
7. 視情況讓 2D 場景跟著天色調亮度（見 6-A 第 2 點）。
