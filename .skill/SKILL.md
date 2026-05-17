---
name: ysipo-website
description: 維護永旭智慧財產事務所網站（ysipo.com.tw）。當使用者提到永旭、ysipo、智財事務所網站、要修改 Header / Nav / Hero / Stats / Service / Footer 任何區塊、要改 .ys-* CSS class、要部署到 GitHub Pages、要清 Cloudflare 快取、要改中英文 partials、要新增文章到 insights、要碰 `C:\Users\Johnny\Desktop\Agent\永旭網站` 目錄裡任何檔案時，務必使用此 skill。即使使用者只是說「改一下我的網站的 XX」、「網站 Hero 要怎樣」、「Header 加個按鈕」、「Footer 地址要改」這類口語化請求，只要上下文是這個網站專案，也要主動讀取此 skill。本 skill 包含完整專案脈絡、CSS 命名規則、v20 色彩規範、部署流程、備份 SOP、已知坑、區塊溝通字典，能讓任何 AI 助手無縫接手而不用再貼交接文件。
---

# 永旭網站維護 Skill

維護永旭智慧財產事務所網站（ysipo.com.tw / GitHub Pages + Cloudflare）的完整工作脈絡與標準作業流程。

## 觸發後第一件事：載入完整脈絡

**讀完此 SKILL.md 後，依任務類型選擇要讀的 reference**：

| 任務類型 | 必讀檔案 |
|---------|---------|
| **任何修改前** | `references/project-context.md` — 專案基本資訊、主持人架構、聯絡資料、檔案結構 |
| **改 CSS / 改樣式** | `references/css-naming.md` — `.ys-*` 命名規則 + v20 色彩規範 |
| **改 Header / Nav** | `references/communication-dict.md` — 區塊溝通字典（圖塊對應 class） |
| **部署 / 推送** | `references/deployment.md` — Git + Cloudflare 快取清除 SOP |
| **遇到奇怪 bug** | `references/known-issues.md` — 已踩過的坑與解法 |
| **要新增文章** | `references/auto-publish.md` — Phase 3 自動發文系統 |

---

## 工作流程 SOP（每次修改都要走完）

### Step 1 — 偵察（先看再動）

絕不憑空假設。動工前用 `grep` / `cat` / `view` 確認：

```bash
# 進工作目錄
cd /c/Users/Johnny/Desktop/Agent/永旭網站

# 確認檔案實際 class 名、結構、現況
grep -n -B1 -A3 "<關鍵字>" <檔名>
```

特別注意：
- 內頁（about/services/insights/news/contact）走 `fetch partial` 載入 header/footer
- 首頁 `index.html` 是**硬寫 header**（不走 partial）
- partials 內路徑用**絕對路徑** `/assets/...`，本機 `file://` 開啟會破圖
- 中英文版各有獨立 partials：`assets/partials/` vs `en/assets/partials/`

### Step 2 — 備份

**絕對先備份**再改。Git Bash 一行：

```bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/${BACKUP_DATE}_<簡短任務名>"
mkdir -p "${BACKUP_DIR}"
cp <要改的檔案> "${BACKUP_DIR}/"
echo "✅ 備份：${BACKUP_DIR}"
```

詳見 `checklists/before-edit.md`。

### Step 3 — 修改

修改原則：
- **CSS 改動優先追加到 `assets/css/main.css` 末尾**（最高優先級，避免污染既有規則）
- 若必須改既有規則，用 `perl -i -pe` 比 `sed` 安全（中文不會出狀況）
- 中英文版改動要**對稱**（中文改了，英文版對應檔案也要改）
- 內頁 5 個（about/services/insights/news/contact）若有共用區塊，**5 個都要改**
- 用 `!important` 是最後手段，不是預設

### Step 4 — 預覽驗證

部署前先看效果：
- **單檔測試**：直接在瀏覽器開 file://（但 partials 會破圖）
- **完整測試**：用 `python -m http.server 8000` 在本機跑 server，從 `http://localhost:8000` 看
- **RWD 測試**：F12 → Device Mode → 切 iPhone / iPad / Desktop 各看一次
- **Console 必看**：F12 → Console 不該有紅字錯誤

### Step 5 — 部署

照 `references/deployment.md` 跑：

```bash
git add <改動檔> backup/
git commit -m "<簡明訊息>"
git push origin master

# 清 Cloudflare 快取（必做，不然 30 分鐘內看不到改動）
curl -X POST "https://api.cloudflare.com/client/v4/zones/fb5a2f0ebf6f95e1ab3a3ed041a2b3ce/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

也可直接用 `scripts/deploy.sh`。

### Step 6 — 實機驗證

- 用 **iPhone Safari 無痕視窗** 開 https://ysipo.com.tw（避免本機快取）
- 桌面 Chrome 用 **Ctrl+Shift+R** 強制重抓
- 確認 RWD 三個斷點都正常：≥1200 / 768-1199 / ≤767
- 若仍看不到改動 → 99% 是瀏覽器快取，不是程式碼問題

---

## 與使用者溝通的習慣

使用者（Johnny）的偏好：

| 偏好 | 怎麼做 |
|------|-------|
| 中文回覆 | 全程中文，技術細節用表格 |
| 一次貼完整指令 | 給 Claude Code 的指令要可一次貼上執行，長指令用 ` ``` ` 圍起來 |
| 不確定先問再做 | 不要憑空假設 class 名、結構，先 grep 確認 |
| 喜歡先 preview 再部署 | 大改動先給 HTML 預覽圖或描述效果 |
| 備份不可少 | 修改前必先 mkdir backup/日期/ |
| 不熟 Console / JS | 偵察用 Git Bash grep，不要要求他在瀏覽器 Console 跑 JS |

---

## 區塊命名溝通

使用者用以下口語名詞，對應實際 class：

| 口語 | CSS class | 在哪 |
|------|-----------|------|
| Header / 頁首 | `.ys-header` | 最上方深藍橫條 |
| Nav / 導覽列 | `.ys-nav` | Header 右下 |
| Hero / 主視覺 | `.ys-hero`（首頁）/ `.page-hero`（內頁）| 第一屏 |
| Stats / 數據條 | `.ys-stats` | Hero 下方（首頁限定）|
| Service / 服務卡片 | `.ys-service` + `.ys-service-card` | Stats 下方（首頁限定）|
| Footer / 頁尾 | `.ys-footer` | 最底部 |
| CTA / 立即諮詢按鈕 | `.ys-cta-btn` | Header 右上金色按鈕 |
| EN / 中 / 語系切換 | `.ys-lang`（桌面 Header）/ `.ys-nav-lang`（手機漢堡內）| — |
| 漢堡按鈕 | `.ys-menu-btn` / `.ys-menu-toggle` | 手機 Header 右上 |
| LINE 浮動按鈕 | `.floating-line-btn` | 右下角綠圈 |

詳細對照（含截圖）在 `references/communication-dict.md`。

---

## v20 色彩規範

絕對禁止亂用色碼，全部走 CSS 變數：

```css
:root {
  --navy-deep: #000d22;    /* 深藍主背景 */
  --navy: #0A1D37;         /* 卡片底 */
  --navy-light: #102443;   /* Hover */
  --gold: #D4B37D;         /* 主金 */
  --gold-dark: #C5A265;    /* 深金 hover */
  --gold-light: #E6D3B3;   /* 淡金 */
  --white-bg: #faf9f6;     /* 暖白 */
}
```

新增區塊配色時，先思考「**這跟現有哪個區塊風格相近**」再決定用哪個變數，不要憑感覺挑新色碼。

---

## 主持人資訊（容易搞錯）

- **李宗穎 / Johnny Li** = 創辦人暨**所長**（高雄總部，電子博士、商標代理人）
- **林家均 / Esmé Lin** = **台北所負責人**（臺科大專利所碩士、商標代理人）

⚠️ **不是「雙所長」**，是「所長 + 北所負責人」，文案不能寫錯。

完整資訊在 `references/project-context.md`。

---

## 紅線：絕對不能做的事

1. **不能直接覆寫檔案不備份** — 一定先 `cp` 到 `backup/日期/`
2. **不能改動 `/assets/img/` 內既有圖檔** — 要新增請用新檔名
3. **不能 push 前不清 Cloudflare 快取**（除非使用者明說不用清）
4. **不能在 commit 訊息裡用 emoji** — Windows Git Bash 編碼會出問題（用 ASCII 標籤如 `[fix]` `[feat]`）
5. **不能假設使用者已 commit 待備份檔** — 改動前先 `git status` 確認工作區乾淨
6. **不能在 `index.html`（首頁）加 `<div id="site-header-placeholder">`** — 首頁是硬寫 header，加了會壞掉
7. **不能改寫主持人頭銜**（所長 / 北所負責人，禁用「雙所長」/「合夥人」）

---

## 範本與工具

- `templates/` — 常用區塊範本（CTA 區、新增內頁 Hero、Footer 連結等）
- `scripts/` — 一鍵工具（備份、清快取、部署）
- `checklists/` — 部署前 / RWD 測試 / 改 partial 的檢查清單

依需求讀取使用，不要每次都讀全部。
