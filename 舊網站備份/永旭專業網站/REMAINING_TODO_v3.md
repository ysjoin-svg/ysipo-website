# 永旭智慧財產事務所 — 待辦清單 v3

**更新日期：** 2026-05-15

---

## 🔴 正式上線前必須完成

| 優先 | 項目 | 說明 |
|------|------|------|
| P0 | 表單後端串接 | contact.html / en/contact.html 的表單目前為模擬，需串接 Formspree、Netlify Forms 或 EmailJS 才能實際收信 |
| P0 | og:image 實際圖片 | 各頁面的 `og:image` 指向 `assets/img/og-image.jpg`，此檔案尚未建立，需提供 1200×630px 的預覽圖 |
| P0 | Domain 確認 | canonical 和 JSON-LD 中的 `https://ysipo.com.tw` 需確認與實際 domain 一致 |

---

## 🟡 建議盡早完成

| 優先 | 項目 | 說明 |
|------|------|------|
| P1 | Favicon ICO 格式 | 目前為 PNG 複本，建議使用 realfavicongenerator.net 產生完整多尺寸 ICO + Apple Touch Icon |
| P1 | 英文版 Header/Footer | 目前英文頁面使用中文 partial，建議建立 `en/assets/partials/` 英文版 header 和 footer |
| P1 | about.html 世界地圖視覺化 | Global Reach 區塊目前為文字說明，可加入 SVG 地圖或靜態示意圖（`assets/img/global-reach-map.svg`） |
| P1 | Google Analytics | 加入 GA4 追蹤碼，監測流量與用戶行為 |

---

## 🟢 有餘裕時可完善

| 優先 | 項目 | 說明 |
|------|------|------|
| P2 | 知識文章 4-6 正式完稿 | insights/article-4/5/6.html 尚未建立，insights.html 的 coming soon 卡片等待補稿 |
| P2 | 英文版知識文章 | 三篇中文知識文章的英文版（insights 英文頁面） |
| P2 | 英文版新聞頁 | en/news.html |
| P2 | 英文版知識頁 | en/insights.html |
| P2 | 文章封面圖 | 三篇文章目前使用漸層背景佔位，可提供 1200×675px 真實配圖 |
| P2 | Schema 驗證 | 使用 Google Rich Results Test 驗證所有頁面的 JSON-LD |
| P2 | 行動版表單測試 | 在真實手機上測試聯絡表單的 UX |
| P3 | 語言切換完整邏輯 | 目前語言切換使用 `/en/` 路徑，在本地 Live Server 可能需調整 |

---

## 📋 資產準備清單（需客戶提供）

| 資產 | 用途 | 規格 |
|------|------|------|
| og-image.jpg | 社群分享預覽圖 | 1200×630px, JPG/PNG |
| 世界地圖 SVG | about.html Global Reach | SVG，標示服務國家 |
| 文章配圖 ×3 | 知識文章封面 | 各 1200×675px, JPG/PNG |
| 知識文章素材 4-6 | article-4/5/6 正文 | 標題 + 文案 |

---

*此清單由 Claude Sonnet 4.6 自動產出*
