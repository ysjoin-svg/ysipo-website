# 智財新聞半自動更新系統（已上線 2026-06-01）

> 每週自動爬台灣智財新聞 → AI 改寫中立摘要 → **自動上架** news.html 並 email 通知，
> 覺得不妥可事後移除（opt-out 模式，非事前審核）。
> 與「智財知識專欄」(auto-publish) 的差異：新聞講「時事/法規動態」，知識講「教學/實務」。詳見 [[auto-publish]]。

---

## 進度：全部完成並雲端驗證 ✅

| 部分 | 狀態 |
|------|------|
| 內容生產：爬取 + 篩選 + 去重 + LLM 改寫 + 來源標注 | ✅ `scripts/generate-news.js` |
| ① 上架：寫入 news.html 的 AI_AGENT_INSERT_POINT（prepend，最新在前） | ✅ |
| ② 去重持久化：`scripts/published-news.json`（記錄 origTitle/link） | ✅ 實測第二次跑自動抓不同的新聞 |
| ③ email 通知本週新增 | ✅ `weekly-news.yml` 用 dawidd6 寄 taiejoin@hotmail.com |
| ④ 移除工具 `scripts/manage-news.js` | ✅ `node manage-news.js` / `remove <N>` |
| ⑤ 排程 | ✅ `.github/workflows/weekly-news.yml`，每週四 09:00（台北）|
| 個案訴訟過濾 | ✅ EXCLUDE_KEYWORDS 擋掉侵權/訴訟/判賠/點名公司類 |

**排程時間**：發文（知識專欄）週一 09:00、新聞週四 09:00，錯開避免同時 push。

**常用指令**：
```
node generate-news.js --dry       # 預覽當週會抓到什麼、摘要長怎樣（不上架）
node generate-news.js --no-push   # 本地上架寫檔但不推送（檢查 news.html）
node manage-news.js               # 列出自動上架的新聞 + 編號
node manage-news.js remove <N>    # 移除第 N 則（刪卡片+記錄+push+清快取）
```

---

## 版權合規方案（使用者拍板）

三招併用，已落實於 generate-news.js：
1. **改寫**：LLM 重寫標題＋摘要，不複製原文內文
2. **標注來源出處**：每則卡片顯示「資料來源：XXX」
3. **連結導流**：標題可點回原文網站

⚠️ 不抓原文全文改寫——Google News 連結是層層重定向、各站結構不一還可能擋爬蟲，會拖累每週自動跑的穩定性。改寫標題＋具體摘要＋標注出處在版權上已充分。

---

## 來源策略（重要：商業考量，使用者明確要求）

⚠️ **絕對排除同業事務所／智財服務業者的新聞**（如「北美智權」），否則等於幫競爭對手曝光、把客戶導去對手。由 `SOURCE_BLOCKLIST` 把關：來源或標題含「北美智權／智權報／事務所／律師事務所／理律／聖島…」即排除。要新增同業時把來源名或特徵詞加進此清單。

**優先來源 = 各國官方智財機關**：
- 台灣：經濟部智慧財產局（moea.gov.tw / tipo.gov.tw）
- 美國 USPTO、日本 JPO、韓國 KIPO、中國 CNIPA、歐洲 EPO / EUIPO、WIPO

**可接受**：一般新聞媒體（中央社、經濟日報、工商時報等）報導的智財消息。

`QUERIES` 已涵蓋台灣官方 + 美／日韓／歐／中國際智財關鍵字。

## 案例尺度（中間尺度，使用者 2026-06-01 調整）

收正規媒體（TVBS／三立／UDN／經濟日報等）的專利商標案例，但偏「有教育／警示意義」的；擋掉「某公司賠多少、上訴到底」的醜聞式個案。
- **全靠 LLM 語意判斷**（`summarize` 的 prompt 第一步）：(a) 與智財無關、(b) 純報導某公司賠償金額/勝敗/上訴的醜聞式個案、(c) 八卦 → 回 `{"skip":true}`；官方公告/法規/制度，以及具教育意義的案例則改寫（案例聚焦「對企業的啟示」，不聚焦賠償金額）。
- 純關鍵字過濾（舊 EXCLUDE_KEYWORDS）已移除 —— 會誤殺有意義的案例。
- 同業仍由 `SOURCE_BLOCKLIST` 硬擋；LLM 也會把同業公司動態判為個案跳過（雙保險）。
- 抓取量：`node generate-news.js --max=N` 一次多抓填充（預設每週 2 則）。`QUERIES` 已含案例與美/日韓/歐/中查詢。

---

## 架構流程

```
每週四 09:00（台北）GitHub Actions：weekly-news.yml
  → Google News RSS 搜尋（多組關鍵字，QUERIES）
  → 解析 item（title/link/pubDate/source）
  → 去重(標題) + 排除個案訴訟類(EXCLUDE_KEYWORDS) + 篩近 RECENT_DAYS 天
  → 排除 published-news.json 已上架過的 + 新到舊排序
  → 取前 MAX_NEWS 則，Nvidia LLM 改寫成中立摘要
  → 寫入 news.html 的 AI_AGENT_INSERT_POINT 區塊（prepend，最新在前）
  → 更新 published-news.json
  → email 本週新增清單到 taiejoin@hotmail.com（成功/失敗都寄）
  → git push + 清 Cloudflare 快取
```

---

## 關鍵技術點 / 坑

- **資料源 = Google News RSS**：`https://news.google.com/rss/search?q=<關鍵字>&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`。免金鑰、雲端可跑、回 XML。用正則抽 `<item>`。
- **firecrawl 不能用於自動化**：它是 Claude Code 的互動 MCP 工具，GitHub Actions 腳本呼叫不到。只在「人工互動探索」時用。
- **LLM 摘要**：`integrate.api.nvidia.com /v1/chat/completions`，model `meta/llama-3.3-70b-instruct`，要求只回 JSON `{"title","summary"}`。prompt 已強制：具體交代「誰/做什麼/對權利人意義」、禁空泛套話、禁中國用語。
- **來源美化**：RSS 的 source 是 `moea.gov.tw`，上架時映射成正式名稱「經濟部智慧財產局」。可建一個 SOURCE_MAP。
- **news.html 插入點**：`<!-- AI_AGENT_INSERT_POINT: 智財新聞 -->` 與 `<!-- END_AI_AGENT_INSERT_POINT -->` 之間，`<div class="news-list" data-source="ai-agent">`。上架 = 在此 div 開標籤後 prepend 新卡片（最新在前），保留既有手寫的 2 則。
- **參數**（generate-news.js 頂部）：`MAX_NEWS=2`（每次最多上架）、`RECENT_DAYS=150`（只取近 N 天）、`QUERIES`（4 組關鍵字）。

---

## 卡片模板（智財新聞 news-item）

上架時每則套用，注意加「資料來源」行與原文連結：

```html
<article class="news-item">
  <div class="news-date">
    <div class="day">DD</div>
    <div class="month-year">MON YYYY</div>
  </div>
  <div class="news-content">
    <h3><a href="原文連結" target="_blank" rel="noopener" style="color:inherit;">改寫標題</a></h3>
    <p>改寫摘要</p>
    <div style="margin-top: var(--space-2);">
      <span class="tag tag--outline">智財新聞</span>
      <span style="font-size:var(--text-xs);color:var(--color-text-muted);margin-left:var(--space-2);">資料來源：經濟部智慧財產局</span>
    </div>
  </div>
</article>
```

---

## 移除工具設計（④ manage-news.js）

仿 `manage-articles.js`：讀 published-news.json 列出自動上架的新聞 → 選編號刪除 → 從 news.html 移除該卡片 + 從 json 移除 → git push。讓使用者「覺得不妥馬上移除」。

英文版 `en/news.html` 是否同步：待確認（中文版優先，英文版可選擇性同步或標示「中文限定」）。
