# 永旭審稿流程

每週一 09:00，Ubuntu cron 觸發 `weekly-publish.yml` 產生中英文智財文章草稿。
每週四 09:00，Ubuntu cron 觸發 `weekly-news.yml` 產生智財新聞草稿。兩者都不會直接發布。

草稿存放在 Ubuntu 主機的 `/home/yongsyu/ysipo-review/data`，不公開於網站或 GitHub。
有新草稿時，系統把完整文字和審稿連結分別寄到
`taiejoin@hotmail.com`、`fish801113@gmail.com`。沒有新草稿就不寄空白通知。

審稿人點郵件中的「修改草稿」或「審核並發布」，再按「寄送驗證碼」。
系統會將 8 位數驗證碼寄到該收件信箱，10 分鐘內有效。
進入審稿頁後，可修改標題、文章正文或新聞摘要；修改後先儲存，再按「核准並發布」。
另一位審稿人的連結會顯示已發布狀態，不能重複發布。

正式發布由 `review-publish.yml` 執行：取得已核准草稿、產出網站檔案、
更新文章索引或新聞列表、推送到 GitHub Pages，最後清除 Cloudflare 快取。
如發布失敗，兩位審稿人會收到失敗通知，草稿可再次嘗試發布。

審稿服務的原始碼為 `review/server.js`，以 `review/ysipo-review.service` 在 Ubuntu 執行，
只監聽 `127.0.0.1:4310`；公開入口由 Cloudflare Tunnel 提供 HTTPS。
密鑰保存在主機的 `review.env`（0600）與 GitHub Secret `REVIEW_INGEST_KEY`，
絕不可寫入 Git 儲存庫。伺服器的 GitHub token 只用於觸發寄驗證碼及發布工作。

驗證碼不放在 GitHub workflow input。審稿服務建立一次性取碼請求，
寄信工作以私密 API 取碼後立即刪除暫存碼。

目前遺留的 `scripts/pending-news.json` 待審新聞會在新版新聞工作首次執行時匯入審稿服務。

排查：

```powershell
gh run list --workflow=weekly-publish.yml --limit 5
gh run list --workflow=weekly-news.yml --limit 5
gh run list --workflow=review-publish.yml --limit 5
ssh yongsyu@192.168.0.101 'systemctl is-active ysipo-review; curl -s http://127.0.0.1:4310/health'
```

## 私人內容成效頁

`https://review.ysipo.com.tw/traffic` 可用手機或電腦開啟，使用承辦人系統帳號密碼登入。管理員在承辦人系統「承辦人管理」的「內容成效」欄設定權限；初始開放李宗穎（10001）與林家均（17005）。登入最長有效 8 小時；每次查詢及 CSV 下載均向承辦人系統重新查核帳號與權限，停用或撤權立即生效。可查最近 7、30、90 天，報表在伺服器記憶體快取 10 分鐘，不寫入公開網站或草稿目錄。只有審稿流程繼續使用郵件驗證碼。

兩個服務須在同一台 Ubuntu 主機執行；審稿服務透過 `http://127.0.0.1:3002` 呼叫承辦人系統登入／查核 API，可用 `IPMGR_AUTH_BASE_URL` 指定其他 loopback 埠。密碼與承辦人系統 JWT 都不會傳回瀏覽器或寫入 Git。承辦人系統無法連線時採拒絕存取，不會顯示快取報表。

部署時將 `scripts/traffic-report.js`、`scripts/traffic-report-core.js` 複製到審稿主機的 `scripts/`，在審稿主機用 `review/package-lock.json` 安裝唯讀查詢依賴。Google 服務帳戶 JSON 與 Cloudflare Analytics 唯讀 token 只能保留在主機私有檔案／環境變數；不可提交 Git 或送到瀏覽器。授權方法見 `scripts/traffic-report.md`。

未設定唯讀憑證時，登入和清單仍可用，但流量欄位顯示未連線，不代表零流量。
