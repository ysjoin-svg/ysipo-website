# 永旭智慧財產事務所 — 最終審稿修正報告 v5

**完成日期：** 2026-05-15  
**執行範圍：** 27 項修正（含 v4 延續 + 全新 Email 階段）

---

## 一、修正完成狀態總覽

| # | 修正項目 | 狀態 | 修改檔案 |
|---|----------|------|----------|
| 1 | 事務所中英文全名並列置中（Hero 區） | ✅ v4 完成 | index.html、about.html、en/about.html |
| 2 | 全站「主持人介紹」→「事務所主持團隊」等語境替換 | ✅ v4 完成 | about.html、index.html、services.html |
| 3 | 英文姓氏 Lee → Li（Li Tsung-Ying / Dr. Li） | ✅ v4 完成 | about.html、en/about.html、en/index.html、en/services.html、insights/ |
| 4 | 「官方登錄資格」→「登錄資格」 | ✅ v4 完成 | about.html（兩處） |
| 5 | 著作權代理師標示加入民國 100 年 | ✅ v4 完成 | about.html、en/about.html |
| 6 | 技術領域從 7 項擴充為 10 項 | ✅ v4 完成 | about.html、services.html |
| 7 | 專利國際申請補 EPC 歐洲專利（38 成員國） | ✅ v4 完成 | about.html、services.html |
| 8 | 服務時間更新（08:30-17:30 + LINE + 緊急專線） | ✅ v4 完成 | contact.html、en/contact.html |
| 9 | 諮詢類型新增 4 項（著作權爭議、侵權處理、授權合約、其他） | ✅ v4 完成 | contact.html、en/contact.html |
| 10 | 服務項目補充（商標/專利/著作權侵權告訴、授權合約、和解協商） | ✅ v4 完成 | services.html |
| 11 | 「由所長親撰」→「由永旭主持團隊親撰」 | ✅ v4 完成 | insights.html、insights/article-1/2/3.html |
| 12 | **Email 全站替換：ysptoaa@gmail.com → contact@ysipo.com.tw** | ✅ v5 完成 | index.html、en/index.html、about.html（2處）、contact.html（3處）、en/contact.html（2處）、assets/partials/footer.html |
| 13 | **主持人個人 Email 加入卡片（李所長 dr.li、林負責人 esme）** | ✅ v5 完成 | about.html、en/about.html |
| 14 | **聯絡頁辦公室卡片加入主管個人 Email** | ✅ v5 完成 | contact.html、en/contact.html |
| 15 | **表單辦公室路由 radio 按鈕（高雄/台北/不指定，附主管名）** | ✅ v5 完成 | contact.html、en/contact.html |
| 16 | Footer Email 更新（即 Fix 12 的 footer.html 項目） | ✅ v5 完成 | assets/partials/footer.html |
| 17 | 商標爭議視覺強調框（深藍底+金色邊框+重點服務徽章） | ✅ v4 完成 | services.html |
| 18 | 文章搜尋欄位（即時過濾） | ✅ v4 完成 | insights.html |
| 19 | 演講活動「即將更新」占位內容 | ✅ v4 完成 | news.html |
| 20 | Footer 補上完整聯絡資訊（高雄 FAX、台北 FAX + 專線） | ✅ v4 完成 | assets/partials/footer.html |
| 21 | 智財新聞 AI Agent 整合 marker 標記 | ✅ v4 完成 | news.html |
| 22 | 林負責人英文名 Esmé Lin 確認 | ✅ 確認（已正確） | en/about.html（Lin Chia-Chun → Esmé Lin 亦於 v5 修正） |
| 23 | Hero 區事務所名稱置中對齊 | ✅ v4 完成 | index.html、about.html、en/about.html |
| 24 | **JSON-LD Person schema 加入 email 欄位** | ✅ v5 完成 | about.html（李所長 dr.li@、林負責人 esme@） |
| 25 | 雙主持人卡片 min-height 視覺平衡 | ✅ v4 完成 | about.html |
| 26 | **全站連結 QA（mailto、href、殘留舊文字掃描）** | ✅ v5 完成 | 全站 grep 掃描通過 |
| 27 | **產出本修正報告 FINAL_FIX_REPORT_v5.md** | ✅ 完成 | — |

---

## 二、v5 新增修正詳細說明

### Fix 12 — Email 全站替換（10 處）

| 檔案 | 位置說明 |
|------|---------|
| `index.html` | JSON-LD LegalService email |
| `en/index.html` | JSON-LD LegalService email |
| `about.html` | 高雄辦公室 mailto（兩地據點區）|
| `about.html` | 台北辦公室 mailto（兩地據點區）|
| `contact.html` | og:description meta tag |
| `contact.html` | JSON-LD LegalService email |
| `contact.html` | 聯絡資訊欄 mailto |
| `en/contact.html` | JSON-LD LegalService email |
| `en/contact.html` | 聯絡資訊欄 mailto |
| `assets/partials/footer.html` | Footer 電子郵件連結 |

### Fix 13 — 主持人個人 Email（profile card）

兩個頁面（about.html、en/about.html）在各主持人的姓名、英文名、職稱下方，新增金色小字 Email 連結：
- 李宗穎所長：`dr.li@ysipo.com.tw`
- 林家均負責人：`esme@ysipo.com.tw`

### Fix 14 — 聯絡頁辦公室卡片主管 Email

- `contact.html`：高雄辦公室資訊欄加入「李所長直聯信箱 dr.li@ysipo.com.tw」；台北辦公室加入「林負責人直聯信箱 esme@ysipo.com.tw」
- `en/contact.html`：同上（英文標籤 Principal Li / Principal Lin direct）

### Fix 15 — 表單辦公室路由 radio 按鈕

將原本 `<select>` 下拉選單改為三個 radio 按鈕，並附上對應主管姓名：
- 不指定，由事務所安排（預設選中）
- 高雄總部（李所長）
- 台北分所（林負責人）

英文版對應：No preference / Kaohsiung HQ (Principal Li) / Taipei Branch (Principal Lin)

### Fix 24 — JSON-LD Person schema email 欄位

`about.html` 的兩個 Person schema 各加入 `"email"` 欄位：
```json
{ "@type": "Person", "name": "李宗穎", "email": "dr.li@ysipo.com.tw", ... }
{ "@type": "Person", "name": "林家均", "email": "esme@ysipo.com.tw", ... }
```

---

## 三、Email 架構總覽

| 信箱 | 用途 | 出現位置 |
|------|------|---------|
| `contact@ysipo.com.tw` | 事務所共用對外信箱 | 全站 JSON-LD、footer、聯絡欄、about 辦公室卡片 |
| `dr.li@ysipo.com.tw` | 李所長個人直聯 | about.html 主持人卡片、contact.html 高雄辦公室欄、JSON-LD Person |
| `esme@ysipo.com.tw` | 林負責人個人直聯 | about.html 主持人卡片、contact.html 台北辦公室欄、JSON-LD Person |

---

## 四、QA 驗證結果

| 項目 | 指令 | 結果 |
|------|------|------|
| 舊 Gmail 全清 | `grep -rn "ysptoaa@gmail.com"` | 0 筆 ✅ |
| 舊姓名全清 | `grep -rn "Johnny Lee\|Dr. Lee\b"` | 0 筆 ✅ |
| 舊標題全清 | `grep -rn "主持人介紹\|官方登錄資格\|由所長親撰"` | 0 筆 ✅ |
| 所有 mailto 均為正式信箱 | `grep -rn 'href="mailto:'` | 僅 contact@、dr.li@、esme@ ✅ |

---

## 五、待使用者後續提供

| 項目 | 用途 | 備註 |
|------|------|------|
| LINE ID（正式） | contact.html / en/contact.html | 目前顯示 "ysipo_official（待補）" |
| LINE QR Code 圖片 | contact.html | `assets/img/line-qr-placeholder.png` |
| og-image.jpg (1200×630px) | 全站社群分享預覽圖 | 所有頁面均指向此路徑 |
| 國際服務地圖 SVG | about.html Global Reach 區塊 | 目前仍為文字佔位符 |
| 知識文章素材 4-6 | insights/article-4/5/6.html | 三篇 coming soon 卡片等待補稿 |
| 表單後端串接 | contact.html / en/contact.html | Formspree / EmailJS / Netlify Forms 任一均可 |

---

## 六、上線前最後檢查清單

### P0（必須，上線前完成）
- [ ] **表單後端串接**：目前模擬送出，需串接真實後端或第三方服務
- [ ] **Domain 確認**：canonical / JSON-LD 均使用 `https://ysipo.com.tw`，確認與實際 domain 一致
- [ ] **og:image**：提供 1200×630px 圖片後上傳至 `assets/img/og-image.jpg`

### P1（建議上線前完成）
- [ ] **LINE 資訊補齊**：填入正式 LINE ID；上傳 QR Code 至 `assets/img/line-qr-placeholder.png`
- [ ] **Favicon ICO**：使用 realfavicongenerator.net 產生多尺寸 ICO
- [ ] **Google Analytics GA4**：加入追蹤碼
- [ ] **Schema 驗證**：使用 Google Rich Results Test 驗證各頁 JSON-LD（特別確認 Person email 欄位）
- [ ] **表單路由測試**：確認 radio 按鈕 office 值正確傳送至後端

### P2（有餘裕時）
- [ ] 知識文章 4-6 正式完稿
- [ ] 英文版知識頁、新聞頁（en/insights.html、en/news.html）
- [ ] 國際服務地圖視覺化（about.html Global Reach 區塊）

---

## 七、視覺截圖建議

| 頁面 | 建議驗證重點 |
|------|-------------|
| `about.html` | 主持人卡片 Email 連結（金色小字）、JSON-LD |
| `contact.html` | 辦公室卡片的主管個人 Email、Radio 按鈕組 |
| `en/about.html` | Li Tsung-Ying / Esmé Lin Email 連結 |
| `en/contact.html` | Principal Li / Principal Lin direct email |
| footer（任一頁） | contact@ysipo.com.tw（已替換） |

---

*報告由 Claude Sonnet 4.6 自動產出，修正日期 2026-05-15*
