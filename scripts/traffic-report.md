# 內容成效一鍵報表

手機與其他電腦可開啟私人查詢頁：[review.ysipo.com.tw/traffic](https://review.ysipo.com.tw/traffic)，以兩位指定收件信箱之一收取驗證碼登入。報表和 CSV 不放在公開官網；查詢憑證只保存在審稿伺服器。伺服器首次授權仍須依下方步驟設定唯讀憑證。

雙擊根目錄的 `traffic-report.cmd`，程式會讀取官網目前已上線的文章與新聞，查詢最近 30 天資料，並開啟 `reports/traffic-report.html`。同一資料夾會產生兩份 CSV。`reports/` 和本機憑證均已加入 `.gitignore`。

文章清單以官網索引為主，另從公開 GitHub 檔案清單補齊仍在線上、但未列入索引的舊文章；若該清單暫時無法取得，報表會提示可能漏列，不會將漏列文章顯示為零流量。

也可在專案根目錄執行 `node scripts/traffic-report.js --days=7`；天數可設 1 至 90。

## 指標口徑

| 欄位 | 來源 | 說明 |
|---|---|---|
| GA4 瀏覽 | Google Analytics 4 | 每篇文章中英文頁的頁面瀏覽總和；文章內頁自本功能部署後開始送出 GA4 瀏覽事件。 |
| Cloudflare 瀏覽 | Cloudflare Web Analytics | 網頁載入數；若授權允許，可查看已有的歷史資料，與 GA4 數字可能不同。 |
| 列表曝光／卡片曝光 | GA4 `view_item_list` | 卡片至少 50% 進入畫面時記一次，每次頁面載入最多一次。 |
| 列表點擊／來源連結點擊 | GA4 `select_item` | 文章標題或新聞來源標題被點擊的次數。 |
| 列表 CTR／卡片 CTR | 上述點擊 ÷ 曝光 | 本站卡片的點擊率，不是 Google 搜尋點擊率。 |
| 搜尋曝光、點擊、CTR | Google Search Console | Google 搜尋結果中該文章網址的曝光、點擊與點擊率。 |

新聞共用 `news.html`，沒有逐則獨立網頁，因此**不能顯示逐則網頁瀏覽量**。報表只顯示整個新聞頁的瀏覽量，以及每則有來源連結新聞的卡片曝光與點擊。沒有來源連結的新聞 CTR 顯示 `—`。新增的列表事件不能回補部署前的歷史。

## 首次唯讀授權

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 選擇或建立專案，啟用 **Google Analytics Data API** 與 **Search Console API**，建立服務帳戶並下載 JSON 金鑰。將 JSON 放在 `scripts/traffic-service-account.json`。請勿把金鑰貼入對話、寄信或提交 Git。
2. 將服務帳戶的 email 加入 GA4 的該網站資源，權限設為 **Viewer**；同一 email 加入 Search Console 的 `ysipo.com.tw` 資源，權限設為 **Restricted**。GA4 的數字資源 ID 在「管理 → 資源設定」，不是 `G-2GEMQLB2JR` 這個評估 ID。
3. 將 `scripts/traffic-config.example.js` 複製為 `scripts/traffic-config.js`，填入 `ga4PropertyId`。若 Search Console 實際使用 URL 前置字元資源，將 `searchConsoleProperty` 改為該資源的完整網址，例如 `https://ysipo.com.tw/`。
4. 若要看 Cloudflare 既有流量，另建立**唯讀** API token：權限為 `Account → Account Analytics → Read`，範圍限制在永旭所屬帳號。在設定檔填入 `cloudflareAccountId` 和 `cloudflareAnalyticsToken`。既有清快取 token 沒有讀取 Analytics 的權限，不能共用。
5. 雙擊 `traffic-report.cmd`。資料來源連線狀態會顯示在報表頂部；若授權或 API 設定有誤，錯誤原因會顯示在報表與執行視窗，不會把缺失資料顯示成零。

官方說明：[GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart)、[Search Console API 授權](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing)、[Cloudflare Analytics token](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)。

## 驗證

```powershell
node --test scripts/traffic-report.test.js
node scripts/traffic-report.js
```

新版追蹤上線後，請先在網站打開一篇文章，再在文章列表與新聞頁點擊各一則；GA4 報表資料可能延後出現。不可用本機報表查詢結果反推個別訪客身分。
