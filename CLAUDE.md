# 汐見町闖關（shiomi-quest）— 固定規則

平等國小五年級（全班 5 人）的跨科闖關遊戲，網址 https://overpomelo-alt.github.io/shiomi-quest/ 。
使用者是班導 Tien（邱聖瑱）。圖都是她請 ChatGPT 畫的，Claude 負責規格書、轉檔、程式、測試、上線。

這份只放**固定規則**。其他資料在：
- 每個對話現在做到哪裡：`handoff/team/<角色>.md` 最上面的「現況」
- 換對話時貼的開場的話：`handoff/team/opening-texts.md`
- 技術參考（每個檔案在做什麼、game.js 的區塊、素材命名、已知問題、寫程式的地雷）：`docs/技術參考.md`
- 每一批改了什麼：`docs/待修清單.md`；使用者確認過的遊戲規則：`docs/設計要求.md`

---

## 一、分工：一件事分給好幾個對話

| 角色 | 分支 | 管什麼 |
|---|---|---|
| 主程式 | `workshop` | 全部的程式、建置、測試、合併、上線、這份規則 |
| 背景 | `bg` | 戶外手繪場景（Sqoyaw、校門口、操場）、遠山、3D 貼圖 |
| 室內 | `indoor` | 老師房、學生房、浴室、教室、便利商店、車站大廳、學生房家具 |
| 人物 | `chars` | 學生、居民、動物、寵物的圖集、動作、比例，載入畫面的小人 |
| 遊戲設計 | `design` | 只讀不改程式：跟 Tien 把功能和方向談定，寫「給主程式：…」 |

- 誰管哪些檔案寫在 `handoff/team/owners.json`。**每個對話只改自己的檔案。**
- **只有主程式改程式。** 其他對話需要程式做事時，在自己的筆記寫「給主程式的需求」（要什麼、為什麼、資料長什麼樣子、怎樣算做好），再給 Tien 一段「給主程式：…」轉貼。
- 新的資料夾或新種類的資料，第一次由主程式連同程式一起建，之後歸對應的對話。
- ChatGPT 那邊開一個專案，分「背景」「室內」「人物」三個對話畫圖（家具併在室內）。
- Tien 在中間轉貼文字和檔案、用手機看預覽、拍板。

## 二、跟 Tien 的規則
- 回覆一律繁體中文、白話、條列，**不用要左右滑的表格**（她用手機看）。不要用英文回她。
- **每個改動做之前先討論，她同意才做。** 想清楚要做的事，一口氣做完、一次回報，不要做一點回報一點。
- 要轉貼的文字（給 ChatGPT、給主程式）放在回覆**最前面**、用可以一鍵複製的格子；檢查結果放後面。
- 每輪回報用了多少時間（看得到 token 就也報）。
- 說明和操作步驟一次寫完整，每個畫面點哪裡都寫清楚。
- 給她的遊戲網址**一律帶 `&teacher`**（例如 `?sq2d=1&teacher`），不然不會出現「老師登入」，她會以為登不進去。
- 她非常在意穿模（人物、物件、鏡頭穿進牆、家具，或物件互相重疊），也不接受「改了但看起來一樣」：回報附同地點、同鏡頭的改前／改後截圖。

## 三、上線的兩條規則
1. **程式功能、修錯**：Tien 同意要做以後，做好、測試都過，主程式直接推正式版。上線後她不喜歡哪裡，就單獨改那一項。
2. **畫面、質感、調色、人物處理**：一律做成網址參數（例如 `?look=`、`?char=`、`?sq2d=1`），**預設維持原樣**。Tien 在手機上比過、明確說「預設改成某某」才能改預設；沒有這句話不准改，也不要順手換掉。參數功能本身可以發布，回報要寫「預設沒動」並附各種網址和同場景比較截圖。
- 現在的預設（每次回報前用 grep 確認）：`LOOK_DEFAULT='orig'`、`CHAR_DEFAULT='off'`、手繪 Sqoyaw 只在 `?sq2d=1`（`SQ2D`）。
- 學生在用：推正式版盡量挑放學後或週末。
- 遊戲只在認得的網址用雲端存檔（`game.js` 的 `HOSTED`：github.io、workers.dev…）。**換新網址或自己的網域時，一定要加進 `HOSTED`**，不然那個網址存檔不會上雲端。

## 四、遊戲的固定規則
- 不放族語。部落叫「Sqoyaw」，介面上不要一直寫「部落」。
- 學生不能開「任意門」，只有老師可以。
- Sqoyaw 3D 村子的房子位置不能變：房子產生之前**不能增加或減少任何 `rand()` 呼叫**，改完用 `dev/tests/run.sh full` 裡的村子配置比對確認。
- 3D 的程式不要刪：還沒畫好的地方繼續用；等一整區都畫好，才關掉那一區的 3D。
- 方向：整個遊戲改成全手繪場景，Sqoyaw 先做；風格柔和、低飽和。
- 「學校不切手繪畫面」那段修改不發布（只留在私人 repo 的 `patches/`）。
- **網頁讀得到的檔案，誰都看得到**：題目答案、學生名字和座號對照、老師或班級密碼，都不能放進網頁會讀的檔案或任何人都讀得到的雲端資料。現在已經有違反的地方，清單和處理進度在主程式筆記。

## 五、repo 和素材
- 遊戲程式：`overpomelo-alt/shiomi-quest`。原始素材（ChatGPT 原圖、規格書、截圖）：私人 repo `overpomelo-alt/shiomi-quest-source`，clone 到 `assets/source/`（`.gitignore` 已排除）。**新素材包、截圖、規格書都放私人 repo**，在裡面各放自己的資料夾，push 前先 `git pull --rebase`。
- ⚠️ 2026-10-20 清過這個 repo 的 git 歷史。在那之前下載的副本不能再用（`git log --oneline | tail -1` 最舊一筆是 `ab1d3d3` 就是舊的，丟掉重新 clone）。清之前的完整歷史在私人 repo 的 `backup/public-history-20261020` 分支（不要刪）。

## 六、分支、合併、上線
- `workshop`：工作版，只放 Tien 點過頭的東西，只有主程式合併。`main`：正式版，只有主程式推。
- 圖的對話做好 → 放試做預覽（Artifact 連結：場景上畫出可走範圍、出口、人物大小；要真的在遊戲裡走的，請主程式放在網址參數後面）→ Tien 點頭 → 給她一行「給主程式：請合併 `<分支>` 到 `<commit 前 7 碼>`（Tien `<時間>` 同意：`<是什麼>`）」。
- 主程式合併：`node scripts/team/owner-check.mjs <角色>` → 合進 workshop → `npm run check` 和測試都過 → 推 main → 在主程式筆記的合併紀錄記一行 → 回 Tien 一句。有問題就不合，寫一段話轉回去。
- 只交圖、遊戲還沒用到的，先合進 workshop、不推 main，等程式做好一起上。
- 改到存檔格式的，推 main 前先用雲端存檔的備份複本試過，舊紀錄都在。
- 建置：`cd dev && python3 build.py`（src → dist 本機版 ＋ web 網路版）。
- 上線：推 main → GitHub Actions（`.github/workflows/deploy.yml`）建一次遊戲，放到兩個地方：Cloudflare（`wrangler.jsonc`，有 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 祕密設定才做）和 GitHub Pages。push 後到 GitHub 的 Actions 頁面，或用 `curl -s https://api.github.com/repos/overpomelo-alt/shiomi-quest/commits/<commit>/check-runs` 確認都 success（這個環境的 `gh` 登入可能失效，用 curl 就好）。commit 作者 `overpomelo-alt <overpomelo@gmail.com>`。
- **過渡期**（主程式筆記「現況」會寫目前在哪一步）：Tien 把 repo 的 Pages 來源改成「GitHub Actions」之前，舊網址還是從 main 最上層的檔案發布，所以上線時還要照舊把 `dev/web/` 的 `index.html`、`sw.js`、`version.json`、`manifest.webmanifest`、`icon-192.png`、`icon-512.png` 複製到最上層、`assets/` 和 `dev/web/assets/` 同步（刪多的，**不要動 `assets/source/`**）。改完以後就不用了，最上層的這些檔案會刪掉。

## 七、檢查和測試（分輕重）
- `npm run check`：資料檢查（場景資料、圖在不在、題目格式），每次都跑。
- 收到 ChatGPT 的 ZIP：`python3 -I scripts/pack_open.py <zip> <新的空資料夾>`。它會先查路徑（不能跑到外面、不能有捷徑），解到新資料夾，再檢查場景包格式。不執行包裡任何程式。
- `bash dev/tests/run.sh light <測試檔…>`：試做時，只跑和這次有關的，手機一種大小（390×844）。
- `bash dev/tests/run.sh walk`：上正式版前，基本走一圈（開場→車站→教室→領養、手繪 Sqoyaw 一整圈），兩種手機（390×844、360×780）加學校平板橫式。
- `bash dev/tests/run.sh full`：基本走一圈加 Sqoyaw 3D 巡檢、村子配置比對、繞圈截圖。改到存檔格式、走路引擎核心、一次換一大批圖、或距離上次 full 已經 3 輪才跑。上次 full 的日子記在主程式筆記最上面。
- 重的測試不要同時跑（機器忙時巡檢會誤報卡住）。測試用座號 `3` 登入。

## 八、交件和圖
- 給 ChatGPT 的任務是一段可以直接貼的文字，第一行寫給哪個對話。有附檔就寫「這次要附：檔名」，沒有就寫「沒有另外的壓縮檔」。ZIP 和任務名用「背景-」「室內-」「人物-」開頭。
- 原圖（PNG）放私人素材 repo；遊戲用的 webp 由各自的轉檔腳本（`dev/*_build.py`）產生；網站版建置時再壓縮。
- 轉檔腳本、資料檔歸各自的對話（見 owners.json）；2D 場景資料一個場景一個檔：`dev/src/troom/rooms/<場景>.json`（用 `dev/troomdb.py` 讀寫）。
