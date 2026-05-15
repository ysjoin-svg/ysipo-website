# 永旭智慧財產事務所 — 網站重製專案

**Yong Syu Intellectual Property Office (YSIPO)**
純前端靜態網站，HTML / CSS / JavaScript，無需後端服務。

---

## 專案結構

```
永旭專業網站/
├── index.html              # 首頁
├── about.html              # 關於我們
├── services.html           # 服務項目
├── insights.html           # 智財知識（部落格首頁）
├── news.html               # 新聞動態
├── contact.html            # 聯絡我們
├── sitemap.xml             # SEO 網站地圖
├── robots.txt              # 爬蟲設定
│
├── insights/
│   ├── article-template.html   # 文章模板（複製此檔製作新文章）
│   └── *.html                  # 各篇文章
│
├── en/
│   └── index.html          # 英文版首頁（其他英文頁面待建立）
│
├── assets/
│   ├── css/
│   │   └── main.css        # 主要設計系統 CSS（含所有 CSS 變數）
│   ├── js/
│   │   └── main.js         # 核心 JavaScript（導覽、動畫、表單）
│   ├── partials/
│   │   ├── header.html     # 共用 Header（由 main.js 動態載入）
│   │   └── footer.html     # 共用 Footer（由 main.js 動態載入）
│   ├── img/
│   │   ├── logo.svg        # Logo（待設計）
│   │   ├── office/         # 辦公室照片（待提供）
│   │   └── icons/          # 圖示檔案
│   └── fonts/              # 字型（目前使用 Google Fonts CDN）
│
├── PROJECT_BRIEF.md        # 原始專案啟動文件
├── README.md               # 本文件
├── QUESTIONS_FOR_USER.md   # 設計問題與待辦文案清單
└── SESSION_REPORT.md       # 建置工作紀錄
```

---

## 如何在本機預覽

### 方法 1：VS Code Live Server（推薦）

1. 安裝 VS Code 擴充套件：**Live Server** (Ritwick Dey)
2. 在 VS Code 開啟 `永旭專業網站/` 資料夾
3. 右鍵點選 `index.html` → **Open with Live Server**
4. 瀏覽器自動開啟 `http://127.0.0.1:5500/`

> **注意**：由於 header/footer 使用 `fetch()` 動態載入，必須在 HTTP server 環境下才能正常顯示。直接用瀏覽器開啟 `file://` 路徑會導致 header/footer 無法載入。

### 方法 2：Python HTTP Server

```bash
cd "C:\Users\Johnny\Desktop\Agent\永旭專業網站"
python -m http.server 8080
```

然後開啟 `http://localhost:8080/`

### 方法 3：Node.js serve

```bash
npx serve .
```

---

## 設計系統速查

所有設計 token 定義在 `assets/css/main.css` 的 `:root { }` 區塊：

| 類別       | 變數範例                     | 值                |
|------------|------------------------------|-------------------|
| 主色       | `--color-primary`            | `#1a2845`（深海藍）|
| 強調色     | `--color-accent`             | `#c8a96b`（金色）  |
| 背景米白   | `--color-bg-cream`           | `#faf8f4`         |
| 中文標題字 | `--font-serif-tc`            | Noto Serif TC     |
| 中文內文字 | `--font-sans-tc`             | Noto Sans TC      |
| 英文標題字 | `--font-serif-en`            | Playfair Display  |
| 英文內文字 | `--font-sans-en`             | Inter             |

---

## 響應式斷點

| 名稱     | 寬度       | 說明             |
|----------|------------|------------------|
| Mobile   | < 768px    | 單欄、手機優先   |
| Tablet   | ≥ 768px    | 部分多欄         |
| Desktop  | ≥ 1024px   | 完整桌機版       |
| Wide     | ≥ 1440px   | 大螢幕寬容器     |

---

## 建置說明 — 本次完成事項

| 任務 | 狀態 | 說明 |
|------|------|------|
| 設計系統 CSS | ✅ | 完整 CSS 變數、Reset、排版、元件 |
| header.html | ✅ | Logo、七大選單、語系切換 |
| footer.html | ✅ | Logo、服務、快速連結、聯絡資訊 |
| main.js | ✅ | 導覽、動畫、表單、計數器 |
| index.html | ✅ | 7個主要區塊骨架 |
| about.html | ✅ | 完整結構（含雙主持人 Profile） |
| services.html | ✅ | 四大服務詳細頁 |
| insights.html | ✅ | 文章列表 + 分類篩選 + 側欄 |
| news.html | ✅ | 三類新聞列表 |
| contact.html | ✅ | 聯絡表單 + 地圖區 |
| en/index.html | ✅ | 英文版首頁骨架 |
| article-template.html | ✅ | 文章頁面模板 |
| sitemap.xml | ✅ | SEO 網站地圖 |
| robots.txt | ✅ | 爬蟲設定 |

---

## 下一步待辦

### 優先（有文案後立刻可做）
- [ ] 填入各頁 `[TODO: 待文案]` 標記的文案內容
- [ ] 插入真實照片（辦公室、主持人照片）
- [ ] 設計並提供 logo.svg
- [ ] 嵌入 Google Maps iframe（高雄、台北各一）
- [ ] 填入真實文章（至少 3 篇，複製 article-template.html）

### 進階
- [ ] 建立英文版其他頁面（about、services、contact）
- [ ] 串接聯絡表單到真實後端（Formspree / Netlify Forms / EmailJS）
- [ ] 設計 og-image.jpg（Open Graph 分享圖）
- [ ] 新增 favicon.ico / apple-touch-icon.png
- [ ] 壓縮優化圖片（WebP 格式）
- [ ] Google Analytics 或 Clarity 埋碼
- [ ] 上線前 SEO 最終審查

---

## 合理預設說明

詳細設計決策請見 `QUESTIONS_FOR_USER.md`。
主要預設值：深海藍 `#1a2845`（主色）、金色 `#c8a96b`（強調色）、Noto Serif TC（標題）。
