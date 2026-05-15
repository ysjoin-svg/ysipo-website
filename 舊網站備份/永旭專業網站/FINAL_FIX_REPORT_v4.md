# 永旭智慧財產事務所 — 最終審稿修正報告 v4

**完成日期：** 2026-05-15  
**執行範圍：** 22 項修正，全程自動執行

---

## 一、修正完成狀態總覽

| # | 修正項目 | 狀態 | 修改檔案 |
|---|----------|------|----------|
| 1 | 事務所中英文全名並列置中（Hero 區） | ✅ 完成 | index.html、about.html、en/about.html |
| 2 | 全站「主持人介紹」→「事務所主持團隊」等語境替換 | ✅ 完成 | about.html、index.html、services.html |
| 3 | 英文姓氏 Lee → Li（Li Tsung-Ying / Dr. Li） | ✅ 完成 | about.html、en/about.html、en/index.html、en/services.html、insights/article-1/2/3.html |
| 4 | 「官方登錄資格」→「登錄資格」 | ✅ 完成 | about.html（兩處） |
| 5 | 著作權代理師標示加入民國 100 年 | ✅ 完成 | about.html、en/about.html |
| 6 | 技術領域從 7 項擴充為 10 項 | ✅ 完成 | about.html、services.html |
| 7 | 專利國際申請補 EPC 歐洲專利（38 成員國） | ✅ 完成 | about.html、services.html |
| 8 | 服務時間更新（08:30-17:30 + LINE 資訊 + 緊急專線） | ✅ 完成 | contact.html、en/contact.html |
| 9 | 諮詢類型新增 4 項（著作權爭議、侵權處理、授權合約、其他） | ✅ 完成 | contact.html、en/contact.html |
| 10 | 服務項目補充（商標/專利/著作權侵權告訴、授權合約、和解協商） | ✅ 完成 | services.html |
| 11 | 「由所長親撰」→「由永旭主持團隊親撰」 | ✅ 完成 | insights.html、insights/article-1/2/3.html |
| 12 | 商標爭議與救濟視覺強調框（深藍底+金色邊框+重點服務徽章） | ✅ 完成 | services.html（新增 CSS + HTML 結構） |
| 13 | Hero 區事務所名稱置中對齊 | ✅ 完成 | index.html、about.html、en/about.html |
| 14 | 雙主持人卡片 min-height 視覺平衡 | ✅ 完成 | about.html |
| 15 | 智財知識文章搜尋欄位（即時過濾） | ✅ 完成 | insights.html（CSS + HTML + JS） |
| 16 | 演講活動「即將更新」占位內容（保留 1 則結構） | ✅ 完成 | news.html |
| 17 | Footer 補上高雄 FAX、台北 FAX + 專線（完整聯絡資訊） | ✅ 完成 | assets/partials/footer.html |
| 18 | 智財新聞 AI Agent 整合 marker 標記 | ✅ 完成 | news.html |
| 19 | 林負責人英文名確認為 Esmé Lin | ✅ 確認（已正確，無需修改） | about.html JSON-LD |
| 20 | JSON-LD Person schema 更新（著作權代理師完整標示） | ✅ 完成 | about.html |
| 21 | 響應式 QA 確認（無破版危險元素） | ✅ 確認 | 全站掃描通過 |
| 22 | 產出本修正報告 FINAL_FIX_REPORT_v4.md | ✅ 完成 | — |

---

## 二、修改檔案清單

| 檔案 | 修正項目 |
|------|----------|
| `index.html` | #1（英文名稱並列）、#2（語境替換）、#13（置中） |
| `about.html` | #1、#2、#3、#4、#5、#6、#7、#14、#19(確認)、#20 |
| `services.html` | #2、#6、#7、#10、#12 |
| `contact.html` | #8、#9、#20(openingHours) |
| `insights.html` | #11、#15 |
| `news.html` | #16、#18 |
| `assets/partials/footer.html` | #17 |
| `en/index.html` | #3 |
| `en/about.html` | #1、#3、#4、#5、#13、#19(確認) |
| `en/services.html` | #3 |
| `en/contact.html` | #8、#9 |
| `insights/article-1.html` | #3、#11 |
| `insights/article-2.html` | #3、#11 |
| `insights/article-3.html` | #3、#11 |

---

## 三、重點修正說明

### 修正 1 — Hero 區中英文並列
index.html 與 about.html（含英文版）的 Hero 頂部，由原本單行英文小標改為：
- 第一行：「永旭智慧財產事務所」（Noto Serif TC、白色）
- 第二行：Yong Syu Intellectual Property Office（Inter、金色）
- 兩行皆 `text-align: center`

### 修正 3 — 英文姓氏 Lee → Li
全站所有英文頁面的李所長英文名稱統一改為 **Li Tsung-Ying**（台灣官方威妥瑪拼音）。
- HTML 文字、meta description、JSON-LD schema、article 作者框均已更新
- 圖片檔名 `lee-principal.jpg` 保留不變（只改顯示文字）

### 修正 12 — 商標爭議視覺強調框
`.trademark-disputes-highlight` 元件：
- 深藍漸層底色 (#1a2845 → #243456)
- 金色實線邊框 (2px solid #c8a96b)
- CSS `::before` 顯示「重點服務」徽章（深藍底金色文字）
- 標題金色、列表項白色 85% 透明、底部說明文字金色細線分隔

### 修正 15 — 文章搜尋功能
- HTML：`<input type="text" id="article-search">` + 搜尋圖示
- CSS：圓角 full border、focus 時金色光暈
- JS：監聽 `input` 事件，即時隱藏不符合標題/摘要/分類的卡片

### 修正 17 — Footer 完整聯絡資訊
高雄總部加入 FAX：(07) 345-2122  
台北分所加入 FAX：(02) 2579-6932 及專線：0956-264-578  
兩個辦公室之間加入金色分隔線

---

## 四、待使用者後續提供

| 項目 | 用途 | 備註 |
|------|------|------|
| LINE ID（正式） | contact.html / en/contact.html | 目前顯示 "ysipo_official（待補）" |
| LINE QR Code 圖片 | contact.html | `assets/img/line-qr-placeholder.png`（上傳後自動顯示） |
| og-image.jpg (1200×630px) | 全站社群分享預覽圖 | 所有頁面均指向此路徑 |
| 國際服務地圖 SVG | about.html Global Reach 區塊 | 目前仍為文字佔位符 |
| 知識文章素材 4-6 | insights/article-4/5/6.html | 三篇 coming soon 卡片等待補稿 |

---

## 五、上線前最後檢查清單

### P0（必須，上線前完成）
- [ ] **表單後端串接**：contact.html / en/contact.html 表單目前模擬送出，需串接 Formspree / EmailJS / Netlify Forms
- [ ] **Domain 確認**：canonical / JSON-LD 均使用 `https://ysipo.com.tw`，確認與實際 domain 一致
- [ ] **og:image**：提供 1200×630px 圖片後上傳至 `assets/img/og-image.jpg`

### P1（建議上線前完成）
- [ ] **LINE 資訊補齊**：填入正式 LINE ID；上傳 QR Code 至 `assets/img/line-qr-placeholder.png`
- [ ] **Favicon ICO**：目前為 PNG 複本，建議使用 realfavicongenerator.net 產生多尺寸 ICO
- [ ] **Google Analytics GA4**：加入追蹤碼
- [ ] **Schema 驗證**：使用 Google Rich Results Test 驗證各頁 JSON-LD

### P2（有餘裕時）
- [ ] 知識文章 4-6 正式完稿
- [ ] 英文版知識頁、新聞頁（en/insights.html、en/news.html）
- [ ] 國際服務地圖視覺化（about.html Global Reach 區塊）
- [ ] 英文版 Header / Footer 獨立 partial

---

## 六、視覺截圖建議

完成後請使用 Chrome DevTools → Ctrl+Shift+I → 右上角「⋮」→ **Capture full page screenshot**：

| 頁面 | 建議驗證重點 |
|------|-------------|
| index.html | Hero 中英文並列居中、信任條 5 指標 |
| about.html | 事務所主持團隊標題、技術領域 10 項、EPC |
| services.html | 商標爭議「重點服務」徽章強調框、EPC 國際申請 |
| contact.html | 服務時間 08:30-17:30、LINE 資訊、11 個複選框 |
| insights.html | 搜尋欄位（輸入關鍵字即時過濾） |
| news.html | 演講活動「即將更新」占位內容 |
| footer（任一頁） | 高雄 FAX、台北 FAX + 專線 |

---

*報告由 Claude Sonnet 4.6 自動產出，修正日期 2026-05-15*
