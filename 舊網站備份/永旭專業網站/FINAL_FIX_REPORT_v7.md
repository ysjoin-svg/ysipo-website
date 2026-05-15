# 永旭智慧財產事務所 — 最終修正報告 v7
**修正日期**：2026-05-15  
**修正範圍**：v7 整合修正（10 項 + Phase 5–6 品質確認）

---

## Phase 1：Hero 主標文案更新

### Fix 1 ✅ — index.html Hero 主標改寫
**檔案**：`index.html`

| 欄位 | 修正前 | 修正後 |
|------|--------|--------|
| 第一行 | 電子博士主持 ｜ 工研院專利撰稿訓練 | 電子博士 × 臺科大專利研究所碩士 |
| 第二行 | 跨領域技術深度 × *前 20 大商標實績* | *專利雙專業領航* × 前 20 大商標實績 |
| 副標 | 從專利撰稿到商標爭議救援，負責人親自… | 從專利策略到商標爭議救援，所長與負責人親自把關… |

### Fix 1（EN）✅ — en/index.html Hero 主標改寫
**檔案**：`en/index.html`

| 欄位 | 修正前 | 修正後 |
|------|--------|--------|
| 第一行 | Electronics PhD Leadership | Electronics PhD × NTUST Patent Institute M.S. |
| 第二行 | ITRI-Trained Patent Expertise… | *Dual IP Expertise* × Top-20 Trademark Record |
| 副標 | 25+ years of boutique IP services… | 25+ years… / every matter handled by a principal. |

---

## Phase 2：差異點文案更新

### Fix 2 ✅ — index.html 差異點 1 改寫
**檔案**：`index.html`（第 379 行附近）

- **標題**：`博士主持・技術深度` → `博士 × 專利所碩士・雙專業領航`
- **內容**：重寫為雙主持人簡介（李所長電子博士 + 林負責人臺科大專利所碩士）

### Fix 2（EN）✅ — en/index.html 差異點 1 改寫
**檔案**：`en/index.html`

- **標題**：`PhD Leadership × ITRI-Trained` → `PhD × NTUST Patent M.S. — Dual Expertise`
- **內容**：介紹兩位主持人各自專長

---

## Phase 3：聯絡頁面重組

### Fix 3 ✅ — contact.html 三層架構重組
**檔案**：`contact.html`（聯絡資訊面板）

**舊架構**：高雄 → 台北（含 contact@） → 服務時間 + LINE  
**新架構**：
1. **第一層 — 高雄總部**：地址、TEL/FAX（合一行）、dr.li@
2. **第二層 — 台北分所**：地址、TEL/FAX（合一行）、直撥 0956-264-578、esme@
3. **第三層 — 共同聯絡**：contact@、LINE box（ID + 按鈕 + QR Code）、服務時間

**主要變更**：
- `contact@ysipo.com.tw` 從台北分所移至獨立第三層「共同聯絡」
- 台北分所補上 FAX：`(02) 2579-6932`
- 服務時間從獨立 h3 改為第三層內嵌欄位

### Fix 4 ✅ — en/contact.html 三層架構重組（英文版）
**檔案**：`en/contact.html`

同 Fix 3 邏輯，英文版：
1. **Layer 1 — Kaohsiung HQ**：address, Tel/Fax, dr.li@
2. **Layer 2 — Taipei Branch**：address, Tel/Fax, direct line +886-956-264-578, esme@
3. **Layer 3 — General Contact**：contact@, LINE box, Office Hours

---

## Phase 4：新英文頁面建立

### Fix 5 ✅ — Footer 聯絡欄確認（中英）
**檔案**：`assets/partials/footer.html`（既有）、`en/assets/partials/footer.html`（新建）

- 中文 footer：高雄（地址+TEL/FAX）、台北（地址+TEL/FAX+專線+contact@+LINE）— 已符合要求，無需修改
- 英文 footer：新建（詳見 Fix 9）

### Fix 6 ✅ — 建立 en/news.html（英文新聞頁）
**新檔案**：`en/news.html`

**內容**：
- 事務所動態 2 篇（網站改版、前 20 大商標實績）
- 演講活動 1 項（Coming Soon）
- 智財新聞 2 篇（TIPO 電子審查、歐盟 UPC 一週年）
- 分類 Tab 篩選（All / Firm News / Speaking Events / IP News）
- CTA 區塊、hreflang 雙語互連

### Fix 7 ✅ — 建立 en/insights.html（英文知識專欄）
**新檔案**：`en/insights.html`

**內容**：
- 3 篇正式文章（Patent 5 Key Elements、Trademark Refusal、PCT Guide）
- 3 篇 Coming Soon 佔位（商標識別性、迴避設計、數位著作權）
- 搜尋欄、分類篩選、側欄（FAQ / 免費諮詢 Widget / 分類清單）
- CTA 區塊、hreflang 雙語互連

### Fix 8 ✅ — 建立 en/assets/partials/header.html（英文 header partial）
**新檔案**：`en/assets/partials/header.html`

- 英文導覽連結（Home / About / Services / IP Insights / News / Contact）
- EN 按鈕設為 active（繁中為非 active）
- 語系切換按鈕路由至中文版
- 使用絕對路徑 `/en/xxx.html`

### Fix 9 ✅ — 建立 en/assets/partials/footer.html（英文 footer partial）
**新檔案**：`en/assets/partials/footer.html`

- 英文 Services / Quick Links / Contact 三欄
- 高雄、台北完整聯絡資訊（含 FAX、專線）
- contact@ysipo.com.tw + LINE 官方帳號 @640yotwe
- 浮動 LINE 按鈕（英文：LINE Chat）

### Fix 10 ✅ — main.js 路由邏輯更新
**檔案**：`assets/js/main.js`（`init()` 函數）

```javascript
// 修正前：所有頁面一律載入 assets/partials/
const root = getRootPath();
headerPath = `${root}assets/partials/header.html`;
footerPath = `${root}assets/partials/footer.html`;

// 修正後：/en/ 頁面改載入英文 partials
if (path.includes('/en/')) {
  headerPath = '/en/assets/partials/header.html';
  footerPath = '/en/assets/partials/footer.html';
} else {
  headerPath = `${root}assets/partials/header.html`;
  footerPath = `${root}assets/partials/footer.html`;
}
```

---

## Phase 5：Logo 重複檢查

### ✅ 確認無重複
- 所有英文頁面（`en/*.html`）均無嵌入 logo HTML
- Logo 只存在於 `en/assets/partials/header.html` 和 `en/assets/partials/footer.html`
- 頁面本身只有 `<div id="site-header-placeholder"></div>`

---

## Phase 6：英文頁面內部連結驗證

### ✅ 確認連結正確
- `en/*.html` 中的相對連結（`contact.html`、`index.html`、`services.html` 等）均正確指向 `en/` 內的對應頁面
- 麵包屑 `<a href="index.html">Home</a>` 正確解析為 `/en/index.html`
- 新建的 `en/news.html` 和 `en/insights.html` 互連正確
- `hreflang` 雙語互連標籤完整

---

## 修正彙總

| # | 項目 | 檔案 | 狀態 |
|---|------|------|------|
| Fix 1 | Hero 主標改寫（中文） | index.html | ✅ |
| Fix 1-EN | Hero 主標改寫（英文） | en/index.html | ✅ |
| Fix 2 | 差異點 1 雙主持人文案（中文） | index.html | ✅ |
| Fix 2-EN | 差異點 1 雙主持人文案（英文） | en/index.html | ✅ |
| Fix 3 | 聯絡資訊三層架構（中文） | contact.html | ✅ |
| Fix 4 | 聯絡資訊三層架構（英文） | en/contact.html | ✅ |
| Fix 5 | Footer 聯絡欄確認 | footer.html（既有） | ✅ |
| Fix 6 | 建立英文新聞頁 | en/news.html | ✅ 新建 |
| Fix 7 | 建立英文知識專欄 | en/insights.html | ✅ 新建 |
| Fix 8 | 建立英文 header partial | en/assets/partials/header.html | ✅ 新建 |
| Fix 9 | 建立英文 footer partial | en/assets/partials/footer.html | ✅ 新建 |
| Fix 10 | main.js 路由邏輯更新 | assets/js/main.js | ✅ |
| Phase 5 | Logo 重複確認 | en/*.html | ✅ 無問題 |
| Phase 6 | 英文頁面連結驗證 | en/*.html | ✅ 正確 |

**共 14 項修正，全數完成。**

---

## 注意事項
1. `en/assets/partials/header.html` 和 `footer.html` 使用**絕對路徑**（`/en/xxx`），需在 HTTP 伺服器環境下運作，`file://` 協定不支援。
2. `en/insights.html` 中 3 篇文章目前連結至中文版文章（`../insights/article-x.html`），待英文版文章頁面建立後需更新連結。
3. 法律限制事項保持不變：不得稱 Lee「專利代理人/專利師」、服務順序維持「專利→商標→著作權」。
