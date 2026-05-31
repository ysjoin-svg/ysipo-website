# 自動發文系統（GitHub Actions 版）

> 永旭網站每週一自動產生一篇智財文章（含 AI 即時生成的專屬配圖）發到 insights。
> 2026-05-31 起已從 Windows 工作排程器**遷移到 GitHub Actions**，不再依賴本機開機。

---

## 系統架構

```
每週一 台北時間 09:00（cron: UTC 01:00 週一）
   ↓
GitHub Actions 雲端觸發（.github/workflows/weekly-publish.yml）
   ↓
checkout → setup-node → 設定 git identity
   ↓
執行 node scripts/generate-article.js
   ↓
呼叫 Nvidia API（Llama 3.3-70B）產出繁中 + 英文文章
   ↓
自動分類（商標 / 專利 / 著作權 / 國際智財）
   ↓
★ 用 FLUX.1-schnell 依分類即時生成專屬配圖（存 insights/img/）
   生圖失敗則回退 assets/img/categories/ 圖庫
   ↓
產出中英文 HTML 到 insights/article-yyyymmdd-時戳(.｜-en).html
   ↓
更新 insights/articles.json 索引（image 指向生成圖）
   ↓
git add → commit → push（用內建 GITHUB_TOKEN，免認證設定）
   ↓
等 60 秒後 curl Cloudflare API 清快取
```

---

## 關鍵檔案

| 檔案 | 用途 |
|------|------|
| `.github/workflows/weekly-publish.yml` | **排程定義**（cron + workflow_dispatch 手動觸發）|
| `scripts/generate-article.js` | 主程式（產文 + 生圖 + 寫檔 + 提交 + 清快取）|
| `scripts/generate-article.js` 內 `generateArticleImage()` | FLUX.1 生圖函式（依分類，刻意不傳文章標題避免亂碼字）|
| `scripts/manage-articles.js` | 互動式管理工具（列出 / 編輯標題 / 刪除）|
| `scripts/config.js` | **本機**密鑰（已 gitignore）；CI 上改用 GitHub Secrets |
| `insights/articles.json` | 文章索引（標題、分類、圖、發佈日期、檔名）|
| `insights/article-*.html` | 個別文章頁 |
| `insights/img/article-*.jpg` | 各篇 AI 生成的專屬配圖 |
| `assets/img/categories/` | 12 張分類配圖（生圖失敗時的 fallback）|

---

## 密鑰管理（兩套來源）

腳本密鑰載入順序：**先讀環境變數，沒有才回退 `config.js`**。

| 環境 | 來源 |
|------|------|
| GitHub Actions（雲端） | GitHub Secrets：`NVIDIA_API_KEY`、`CF_ZONE_ID`、`CF_API_TOKEN` |
| 本機手動跑 | `scripts/config.js`（已 gitignore，不上傳）|

設定 / 更新 Secrets（需 gh CLI 已登入、token 有 repo scope）：
```bash
cd C:\Users\Johnny\Desktop\Agent\永旭網站
node -e "process.stdout.write(require('./scripts/config.js').NVIDIA_API_KEY)" | gh secret set NVIDIA_API_KEY
node -e "process.stdout.write(require('./scripts/config.js').CF_ZONE_ID)"    | gh secret set CF_ZONE_ID
node -e "process.stdout.write(require('./scripts/config.js').CF_API_TOKEN)"  | gh secret set CF_API_TOKEN
gh secret list   # 確認
```

---

## AI 生圖重點（FLUX.1-schnell）

- endpoint：`POST https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell`
- 用**現有的 `NVIDIA_API_KEY`**（同一把 key，免額外申請、免額外付費）
- 回傳 `artifacts[0].base64`，解碼存成 jpg（約 25~45 KB，1024×768）
- prompt = 固定風格（navy + gold 扁平商務插畫、強制 no text）+ 分類物件描述
- ⚠️ **絕對不要把文章標題（英文句子）塞進 prompt** —— FLUX 會把它「寫」進圖裡變成亂碼英文字。只用分類的具象物件詞。
- 分類物件對照：
  - trademark → 盾牌、放大鏡、勾選、星章
  - patent → 燈泡、齒輪、藍圖捲軸、圓規
  - copyright → 文件、鋼筆、調色盤、底片/音符
  - international → 地球、世界地圖、連線、紙飛機

---

## 手動操作

### 立刻產一篇（測試 / 補發）— 雲端（推薦）

GitHub → Actions → 「Weekly Article Publish」→ Run workflow，或：
```bash
cd C:\Users\Johnny\Desktop\Agent\永旭網站
gh workflow run weekly-publish.yml --ref master
gh run watch $(gh run list --workflow=weekly-publish.yml --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```

### 立刻產一篇 — 本機（需 config.js）
```bash
cd C:\Users\Johnny\Desktop\Agent\永旭網站\scripts
node generate-article.js
```

### 管理現有文章（列出 / 改標題 / 刪除）
```bash
cd C:\Users\Johnny\Desktop\Agent\永旭網站\scripts
node manage-articles.js
```

---

## 偵察指令

```bash
# 看 workflow 最近執行紀錄
gh run list --workflow=weekly-publish.yml --limit 5

# 看某次 run 的 log
gh run view <run-id> --log

# 看 articles.json 最新幾篇
node -e "const a=require('./insights/articles.json'); console.log(a.slice(0,3).map(x=>x.date+' '+x.title));"
```

---

## 已知風險

### ⚠️ Nvidia API 額度 / key 失效
- Nvidia API 有月額度；Llama 產文與 FLUX 生圖共用同一把 key，額度雙重消耗。
- 額度用完或 key 失效 → workflow 會失敗，**GitHub 會自動 email 通知 repo owner（ysjoin@gmail.com）**。

### ⚠️ 產文品質浮動
LLM 偶爾產出非台灣用語（「軟件」「網絡」）、過時法條或重複主題。
**建議**：每隔 1-2 個月用 `manage-articles.js` 抽查、必要時修改或刪除。

### ⚠️ 生圖品質浮動
FLUX 偶爾構圖偏空或物件怪異。不影響發文（有 fallback），但可人工抽換 `insights/img/` 下的圖。

---

## 歷史備註（Windows 工作排程器，已停用）

- 舊機制：Windows 工作排程器「永旭網站_自動發文」每週一 09:00 跑 `run-generate-article.bat`。
- 問題：背景非互動環境下 node PATH / git push 認證易失敗，**實際從未自動成功觸發過**。
- 2026-05-31 已用 `scripts/disable-schedule.ps1` 停用（disable 非 delete，設定仍保留）。
- ⚠️ 若哪天重啟 Windows 排程，務必先確認 GitHub Actions 已停用，避免**雙跑重複發文**。
