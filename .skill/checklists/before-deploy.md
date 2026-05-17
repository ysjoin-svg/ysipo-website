# 部署前 Checklist

修改完想 push 前逐項勾選：

## 改動範圍確認

- [ ] `git status` 看過，沒有意外被改的檔案
- [ ] `git diff --stat` 看過行數合理（不會突然多 5000 行）
- [ ] 改的內容**只限本次任務**（不包含未完成的其他實驗）

## 備份確認

- [ ] `backup/yyyymmdd_HHMMSS_xxx/` 目錄存在
- [ ] 備份內含本次要改的所有檔案
- [ ] 備份檔案也納入 commit（`git add backup/`）

## 對稱性確認

- [ ] 改了中文版（如 `assets/partials/header.html`）→ 英文版（`en/assets/partials/header.html`）也跟著改
- [ ] 改了首頁 `index.html` 硬寫 header → 對應 partials 也對齊
- [ ] 改了內頁 5 個共用區塊 → 5 個都改了（about/services/insights/news/contact）

## 視覺驗證

- [ ] 本機開過 `python -m http.server` 跑一次，沒破圖
- [ ] F12 Console 沒紅字
- [ ] F12 Network 沒 404 / 500
- [ ] RWD 三斷點測過：≥1200 / 768-1199 / ≤767
- [ ] 觸控目標（按鈕、連結）在手機上夠大（≥44px）

## Commit 訊息

- [ ] 用英文標籤前綴（`fix:` / `feat:` / `style:` / `docs:`）
- [ ] 沒有 emoji
- [ ] 標題 ≤ 60 字
- [ ] body 條列說明每項改動

## 部署後驗證

- [ ] GitHub Pages 顯示綠勾（https://github.com/ysjoin-svg/ysipo-website/actions）
- [ ] Cloudflare 快取已清（`"success": true`）
- [ ] 桌面 Ctrl+Shift+R 驗證過
- [ ] iPhone Safari **無痕視窗** 驗證過
- [ ] 如果是手機改動：實機看過（不是 DevTools 模擬）

---

## 紅旗（看到立刻停手）

| 紅旗 | 處理 |
|------|------|
| `git status` 顯示 100+ 檔案改動 | 不對勁，可能誤操作了 IDE 自動格式化 → `git stash` 暫存後檢查 |
| `git diff` 看到 `password` `api_key` `token` 字串 | 停！絕對不能 push → `git reset` 撤回，把密鑰移到環境變數 |
| 沒有對應 backup 就要 push | 停！先補備份再推 |
| commit message 含 emoji | 改掉再 commit |
| 中文版改了但英文版沒改 | 補英文版 |
