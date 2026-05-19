# 永旭網站 — 專案脈絡

> 這是修改網站前必讀的基本資料。包含網站架構、人物、聯絡資訊、檔案結構、現況。

---

## 網站基本

- **網址**：https://ysipo.com.tw
- **GitHub Repo**：ysjoin-svg/ysipo-website（master 分支）
- **本機工作目錄**：`C:\Users\Johnny\Desktop\Agent\永旭網站`
- **部署**：GitHub Pages + Cloudflare DNS
- **Cloudflare Zone ID**：`fb5a2f0ebf6f95e1ab3a3ed041a2b3ce`
- **Node.js 版本**：v22.15.0
- **目前版本**：v20 改造完成（首頁深藍金色設計 + 全站 partials 統一）

---

## 主持人架構（容易寫錯）

| 角色 | 姓名 | 學經歷 | Email |
|------|------|--------|-------|
| 創辦人暨**所長** | 李宗穎 / Johnny Li | 電子博士、工研院訓練、商標代理人 | dr.li@ysipo.com.tw（→ ysjoin@gmail.com）|
| **台北所負責人** | 林家均 / Esmé Lin | 臺科大專利研究所碩士、商標代理人 | esme@ysipo.com.tw（→ fish801113@gmail.com）|
| 對外窗口 | （助理）| — | contact@ysipo.com.tw（→ ysptoaa@gmail.com）|

⚠️ **絕對不是「雙所長」**。是「所長 + 北所負責人」。文案、JSON-LD、介紹詞都要遵守這個架構。

---

## 聯絡資訊

### 高雄總部
- 地址：高雄市左營區子華路 116 號 2 樓之 3
- TEL: (07) 345-3388
- FAX: (07) 345-2122

### 台北分所
- 地址：台北市中正區莒光路 47 號 1 樓
- TEL: (02) 2302-1082
- 專線：0956-264-578

### 通用
- Email: contact@ysipo.com.tw
- LINE: @640yotwe

---

## 網站架構

### 中文版（根目錄）

| 檔案 | 用途 | 載入方式 |
|------|------|---------|
| `index.html` | 首頁 | **硬寫 header**，不走 partial |
| `about.html` | 關於我們 | fetch partial |
| `services.html` | 服務項目 | fetch partial |
| `insights.html` | 智財知識（動態載入文章列表） | fetch partial |
| `news.html` | 新聞動態 | fetch partial |
| `contact.html` | 聯絡我們 | fetch partial |
| `thank-you.html` | 表單送出感謝頁 | fetch partial |

### 英文版（`en/` 目錄）

同上 6 頁，檔名一樣。`en/index.html` 也是硬寫 header。

### 文章目錄

- `insights/` — 中文文章 `article-*.html` + `articles.json` 索引
- `en/insights/` — 英文文章

### 關鍵共用檔

| 檔案 | 用途 |
|------|------|
| `assets/css/main.css` | 主樣式（含 v20 + 階段 A/B/C 修補）|
| `assets/css/style.css` | 補充樣式 |
| `assets/js/main.js` | 全站 JS（`initV20Header()` + partials 載入）|
| `assets/partials/header.html` | 中文 Header partial |
| `assets/partials/footer.html` | 中文 Footer partial |
| `en/assets/partials/header.html` | 英文 Header partial |
| `en/assets/partials/footer.html` | 英文 Footer partial |

### 圖檔目錄 `assets/img/`

| 檔名 | 用途 |
|------|------|
| `logo-white.png` `logo.png` `logo-full.png` | Logo（白底 / 完整版）|
| `hero-bg.jpg` | 桌面首頁 Hero 背景（鋼筆 + 法律書 + PATENT LAW 書脊）|
| `pen-mobile.png` | ❌ 舊手機 Hero 用，**現已棄用**（手機改用 hero-bg.jpg）|
| `hero-about.jpg` | 內頁 about（書櫃 + 天平）|
| `hero-services.jpg` | 內頁 services（證書 + 蠟封 + 鋼筆）|
| `hero-insights.jpg` | 內頁 insights（燈泡 + 飛舞紙張）|
| `hero-news.jpg` | 內頁 news（報紙 + 檯燈 + 城市夜景）|
| `hero-contact.jpg` | 內頁 contact（鋼筆 + 名片 + 城市）|
| `icon-fax.svg` | 金色傳真機 icon（Footer 用）|
| `icon-*.svg` | 服務卡 icon（patent/trademark/copyright/international 等）|
| `categories/` | 自動發文用的 12 張分類配圖（trademark/patent/copyright/international 各 3 張）|

---

## v20 已完成項目（基線狀態）

修改前先知道什麼已經做好：

- ✅ 首頁 v20 改造（Header / Hero / Stats / Service 全新設計）
- ✅ 全站 Header/Footer/Nav 統一（中英文 partials）
- ✅ 全站色變數更新為 v20
- ✅ 中英文 partials 都已更新
- ✅ 階段 A：首頁 EN 按鈕補齊、漢堡 ID 修正、Nav `knowledge.html` → `insights.html`、傳真獨立成行 + 金色 SVG icon
- ✅ 階段 B：內頁 Hero 統一左對齊 + 5 張背景圖 RWD 個別定位 + about 副標斷行
- ✅ 階段 C：英文首頁 1:1 重做（結構複製中文版 + 全文英譯）
- ✅ 漢堡選單修復（補上 `.ys-nav.open { display: flex }` 規則）
- ✅ 手機 Hero 重做（用 `hero-bg.jpg` 取代 `pen-mobile.png` + Header/Hero 加全色金線）
- ✅ 桌面 Nav 隱藏 `.ys-nav-lang` English 連結（避免與右上 EN 重複）

---

## 自動發文系統（Phase 3）

- 排程：每週一 09:00（**Windows 工作排程器**，不是 GitHub Actions）
- 觸發 `scripts/generate-article.js` → 呼叫 Nvidia API 產文 → 自動分類 → 配圖 → 寫 HTML → 更新 `insights/articles.json` → git push → 清快取
- 管理工具：`scripts/manage-articles.js`（互動式列出 / 編輯 / 刪除）

⚠️ 風險：**電腦關機就跳過該週**。長期建議移到 GitHub Actions 雲端跑。

詳見 `references/auto-publish.md`。

---

## API Keys 與服務

- **Nvidia API**（產文章）— https://build.nvidia.com/settings/api-key
- **Cloudflare API Token**（清快取）— Zone.Cache Purge 權限
- **EmailJS**（已設定完成）— Service: `service_kdq5gzi` / Template: `template_wrq9d22` / Public Key: `a5x52UregaIksKaKC`
- **GA4** Tracking ID: `G-2GEMQLB2JR`
- **Google Search Console**：已驗證、已提交 sitemap.xml

⚠️ 這些 key 不應該出現在 git 內，應放在本機環境變數或 `.env`（已被 `.gitignore`）。

---

## Footer 結構（真實樣貌）

4 欄佈局（不是先前以為的 2 欄）：

1. **品牌欄**（`.ys-footer-brand`）— Logo + 簡介文字
2. **服務項目**連結 — 專利申請 / 商標申請 / 著作權服務 / 國際佈局 / 智財策略顧問
3. **快速連結**（含 English）— 關於我們 / 智財知識 / 新聞動態 / 聯絡我們 / English
4. **聯絡資訊** — 高雄總部 + 台北分所，**TEL 與 FAX 同一行**（`TEL：xxx　FAX：yyy`）

下方再加版權列（`.ys-footer-bottom`）。

---

## 階段 B 內頁 Hero 個別 background-position（精準值）

各內頁 Hero 用 `body.page-{name}` class 動態綁定，CSS 內已調好：

| 頁面 | 桌面（≥1200）| 平板（768-1199）| 手機（≤767）|
|------|-------------|----------------|------------|
| about | `right 25%` | `75% 30%` | `70% center` |
| services | `right 45%` | `75% 45%` | `65% center` |
| insights | `right 40%` | `75% 40%` | `70% center` |
| news | `right 50%` | `75% 45%` | `65% center` |
| contact | `right 55%` | `75% 50%` | `70% center` |

這些值是經過實機驗證的，**不要無故改動**。

`document.body.classList.add('page-' + page)` 在 `main.js` 的 `initV20Header()` 內呼叫。
