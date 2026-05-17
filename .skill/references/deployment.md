# 部署與清快取 SOP

> 改完檔案要上線給使用者看 → 走這份 SOP。

---

## 完整部署流程（每次都走 5 步）

### Step 1：確認改動

```bash
cd /c/Users/Johnny/Desktop/Agent/永旭網站

# 看哪些檔案被改了
git status

# 看具體改了什麼（confirm 沒有誤改）
git diff --stat
git diff <關鍵檔> | head -50
```

### Step 2：確認備份在

```bash
# 應該看到本次改動對應的 backup/yyyymmdd_HHMMSS_xxx/ 目錄
ls -dt backup/*/ | head -3
```

如果沒備份就改了 → **先暫停**，建議用 `git stash` 暫存改動，先備份。

### Step 3：Commit

**commit 訊息規範**：
- 用英文標籤開頭：`fix:` / `feat:` / `style:` / `docs:` / `refactor:`
- 標題行 ≤ 60 字（中文可）
- body 用條列說明改了什麼（每行 ≤ 80 字）
- **絕不用 emoji**（Windows Git Bash 編碼會亂）

```bash
git add <檔案> backup/
git commit -m "fix: <簡明描述>

- 改動 1
- 改動 2
- 改動 3"
```

### Step 4：Push

```bash
git push origin master
```

GitHub Pages 約 30 秒～2 分鐘自動部署完成。可在 https://github.com/ysjoin-svg/ysipo-website/actions 看狀態。

### Step 5：清 Cloudflare 快取（必做）

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/fb5a2f0ebf6f95e1ab3a3ed041a2b3ce/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

預期回應：
```json
{"result":{"id":"..."},"success":true,"errors":[],"messages":[]}
```

**`"success": true`** 才算成功。

---

## 常用 commit 訊息範本

### CSS / 樣式修改
```
style: <區塊> <什麼變化>

- 改 .ys-xxx 從 A 改成 B
- 解決 <問題>
```

### Bug 修復
```
fix: <bug 簡述>

根因：<原因>
修法：<改了什麼>
影響範圍：<哪幾頁>
```

### 新增功能
```
feat: <功能名>

- 新增檔案：xxx
- 新增區塊：xxx
- 對應 CSS class：.ys-xxx
```

### 內容更新
```
docs: 更新 <頁面/區塊> 文案

- <欄位> 從 A 改成 B
```

---

## 強制 Browser Cache Busting

某些情況下使用者裝置（特別 iPhone Safari）會頑固吃舊快取。對策：

```bash
TIMESTAMP=$(date +%Y%m%d%H%M)

# 把所有 HTML 內 main.css / main.js 加版本參數
for f in index.html about.html services.html insights.html news.html contact.html thank-you.html \
         en/index.html en/about.html en/services.html en/insights.html en/news.html en/contact.html; do
  if [ -f "$f" ]; then
    perl -i -pe "s|main\.css(\?v=[^\"']*)?|main.css?v=${TIMESTAMP}|g" "$f"
    perl -i -pe "s|main\.js(\?v=[^\"']*)?|main.js?v=${TIMESTAMP}|g" "$f"
  fi
done

# 然後一樣的 commit + push + 清快取流程
```

⚠️ 不是每次都需要 cache bust。只在「Cloudflare 清了但實機還是舊」時才用。

---

## 部署完成後實機驗證

| 平台 | 驗證方式 |
|------|---------|
| 桌面 Chrome | Ctrl+Shift+R 強制重抓 |
| 桌面 Firefox / Edge | Ctrl+F5 |
| iPhone Safari | **無痕視窗** 開（避免本機快取）|
| Android Chrome | 設定 → 隱私 → 清除瀏覽資料 → 圖片與檔案 |
| 公司 / 機構網路 | 注意可能有自己的 proxy 快取，可先用手機 4G 測試 |

驗證項目：
- [ ] 改動有出現
- [ ] F12 → Console 沒紅字錯誤
- [ ] F12 → Network 沒 404 資源
- [ ] RWD 三斷點都正常（桌面/平板/手機）
- [ ] 中英文版都有改到（如有跨版本改動）

---

## Rollback（救命用）

如果部署後線上炸了：

```bash
cd /c/Users/Johnny/Desktop/Agent/永旭網站

# 方式 1：用 backup 還原
ls -dt backup/*/ | head -5     # 找最近的備份
cp backup/yyyymmdd_xxx/<檔案> <原位置>
git add . && git commit -m "rollback: 回到 yyyymmdd 備份"
git push origin master

# 方式 2：用 git revert（更乾淨）
git log --oneline -5            # 找壞掉那個 commit
git revert <commit-hash>
git push origin master

# 然後一定要清快取
curl -X POST ... (同上)
```

---

## 不要這樣做

| 錯誤 | 為什麼 |
|------|-------|
| `git push --force` | 永遠不要 force push 到 master，會丟掉同事 / 排程的 commit |
| 改完不 commit 就 push | 不可能（Git 不允許），但有時會跳 commit 訊息出問題，必確認訊息有存 |
| commit 訊息用 emoji | Windows Git Bash 編碼會壞，且 git log 看起來醜 |
| push 後不清快取 | 使用者會在 30 分鐘內看到舊版（Cloudflare TTL），以為你沒改 |
| 把 API key 寫進 commit | git history 會永久留下，要立刻 rotate key |
