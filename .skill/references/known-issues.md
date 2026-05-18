# 已知坑與解法

> 這幾天累積的所有「踩過一次的坑」。遇到怪 bug 先翻這份，可能已經有解。

---

## CSS 相關

### 坑 1：手機漢堡點了沒反應

**症狀**：點 `.ys-menu-btn` 沒事發生，nav 不下拉。

**原因**：CSS 有 `.ys-nav { display: none }` 把 nav 隱藏，但**沒寫對應的 `.ys-nav.open { display: flex }`** — JS 加了 open class 也沒視覺變化。

**解法**：在 `@media (max-width: 768px)` 內補：
```css
.ys-nav.open {
  display: flex !important;
}
```

**預防**：以後寫 toggle 類功能，CSS 一定要寫**兩端狀態**（隱藏 + 顯示）。

---

### 坑 2：桌面 Nav 多了「English」

**症狀**：桌面 Nav 變 7 個連結（多了 English）。

**原因**：階段 A 修漢堡時把 `<a class="ys-nav-lang">English</a>` 加進 `.ys-nav` 內，桌面也跟著顯示。

**解法**：
```css
@media (min-width: 769px) {
  .ys-nav .ys-nav-lang { display: none !important; }
}
```

---

### 坑 3：手機 Hero 看不到書本背景

**症狀**：手機版只看到鋼筆，桌面版的書本 + PATENT LAW 書脊不見。

**原因**：之前手機版用獨立的 `pen-mobile.png`（只有鋼筆），不是用 `hero-bg.jpg`。

**解法**：在 `@media (max-width: 768px)` 把 `.ys-hero::after` `display: none`，改用：
```css
.ys-hero {
  background-image:
    linear-gradient(to right, rgba(0,13,34,0.92) 0%, rgba(0,13,34,0.6) 50%, rgba(0,13,34,0.1) 100%),
    url('../img/hero-bg.jpg');
  background-size: cover, 200% auto;
  background-position: center, 78% 38%;
  background-repeat: no-repeat;
}
```

---

### 坑 4：Header / Hero 沒有金線

**症狀**：分隔線變半透明或消失。

**原因**：舊規則用 `rgba(212,179,125,0.3)`（半透明），新規則用 `var(--gold)` 但沒加 `!important`，被舊規則蓋掉。

**解法**：強制覆蓋
```css
.ys-header, section.ys-header { border-bottom: 1px solid #D4B37D !important; }
.ys-hero,   section.ys-hero   { border-bottom: 1px solid #D4B37D !important; }
```

---

### 坑 5：內頁 Hero 背景圖被裁切

**症狀**：about 頁書櫃 + 天平的圖，在某些寬度書本被裁掉。

**原因**：`background-size: cover` + 單一 `background-position` 無法適應所有螢幕比例。

**解法**：按 RWD 三段個別設定 `background-position`（詳見 `project-context.md` 的內頁 Hero 表格）。

---

### 坑 6：CSS 改了但線上沒效果

可能原因（依機率排序）：
1. **Cloudflare 快取沒清** → 跑 purge_cache API
2. **GitHub Pages 還沒 build 完** → 等 1-2 分鐘
3. **使用者瀏覽器吃本機快取** → 用無痕視窗 / Ctrl+Shift+R
4. **新規則被舊規則蓋掉** → 用 DevTools Inspector 看哪條規則勝出，加 `!important` 或提高選擇器特定性
5. **改錯檔案** → 確認改的是 main.css 不是 style.css
6. **改錯區段**（例如改了桌面忘記改 `@media (max-width: 768px)` 內）

---

## JS 相關

### 坑 7：partials 載入時機

**症狀**：JS `initV20Header()` 跑了，但 `getElementById('ys-menu-toggle')` 回傳 null。

**原因**：JS 在 partial 還沒 fetch 完成前就執行，DOM 內還沒有那個按鈕。

**解法**：`initV20Header()` 一定要在 `loadPartials().then()` 內呼叫。

```js
loadPartials().then(() => {
  initV20Header();
  // 其他依賴 partial 的初始化
});
```

---

### 坑 8：首頁 vs 內頁載入流程不同

| 頁面 | header 載入方式 |
|------|---------------|
| `index.html` | **硬寫**在 HTML 內，不走 partial |
| `about.html` 等內頁 | 用 `<div id="site-header-placeholder">` + JS fetch partial |

**踩過的坑**：
- 改 partial 後**首頁不會自動更新**（因為它根本沒讀 partial）→ 首頁要單獨改
- 在首頁加 `<div id="site-header-placeholder">` 會壞掉（partial 會疊在硬寫 header 上）

---

### 坑 9：JS 動態綁定背景圖路徑問題

`main.js` 第 ~402 行有：
```js
pageHero.style.backgroundImage = "url('/assets/img/hero-" + page + ".jpg')";
```

⚠️ 用了**絕對路徑 `/assets/...`**，在 `file://` 本機開檔會找不到圖。但部署後 https://ysipo.com.tw 是 OK 的。

**Workaround for 本機測試**：用 `python -m http.server` 跑本機 server，或暫時改成相對路徑。

---

## Git / 部署相關

### 坑 10：commit 訊息有 emoji 導致 Git Bash 編碼錯誤

**症狀**：`git commit` 後訊息亂碼，或 push 後 GitHub 顯示 ???。

**解法**：commit 訊息**不用 emoji**，用 ASCII 標籤（`[fix]` `[feat]` `feat:` `fix:`）。

---

### 坑 11：Windows Git Bash 換行符警告

```
warning: in the working copy of 'xxx.html', LF will be replaced by CRLF the next time Git touches it
```

**這不是錯誤，可忽略**。是 Git 在做 LF↔CRLF 自動轉換，正常現象。

若想停掉警告：
```bash
git config core.autocrlf false
```

---

### 坑 12：Big5 中文檔名解壓

**症狀**：在 Linux 解壓 Windows 包的 ZIP，中文檔名變亂碼。

**解法**：用 Python 處理（不要用 `unzip`）：
```python
import zipfile
with zipfile.ZipFile('xxx.zip') as z:
    for info in z.infolist():
        name = info.filename.encode('cp437').decode('cp950')  # Big5
        # ...
```

---

## API 相關

### 坑 13：Cloudflare API token 在 git 內

⚠️ 不可以把 `Authorization: Bearer xxx` 的 xxx 寫進 commit。已洩漏的 token 要立刻去 Cloudflare Dashboard rotate。

**正確做法**：
```bash
# 在本機設環境變數
export CF_API_TOKEN=xxxxx

# 或放在 .env（已 gitignore）
echo "CF_API_TOKEN=xxxxx" >> .env
```

腳本內用 `$CF_API_TOKEN` 引用。

---

### 坑 14：Anthropic API 500 錯誤

Claude Code 偶爾會跳：
```
API Error: 500 Internal server error.
```

**這不是程式碼問題**，是 Anthropic 伺服器暫時性錯誤。等 30 秒～1 分鐘重試即可。**不需要回滾改動**。

---

## 自動發文相關

### 坑 15：Phase 3 從未自動發過文

**原因**：排程在 **Windows 工作排程器**跑，電腦關機 / 睡眠就跳過。

**狀態**：手動測試發文 OK，但實際排程從未成功觸發過。

**長期解法**：移到 GitHub Actions（雲端 7×24 跑）。

---

### 坑 16：Windows 工作排程器找不到 node

**症狀**：排程執行結果代碼為 1，且沒有產生 log 檔。

**原因**：工作排程器使用的 PATH 不含使用者自訂路徑（node 裝在 `AppData\Local\...`），導致 `node` 指令找不到。

**解法**：在 `.bat` 檔內手動設 PATH：
```bat
set PATH=C:\Users\Johnny\AppData\Local\node-v22.15.0-win-x64;C:\Program Files\Git\cmd;%PATH%
node generate-article.js >> "...log" 2>&1
```

---

## Cloudflare 相關

### 坑 17：ERR_TOO_MANY_REDIRECTS（無限重定向）

**症狀**：瀏覽器顯示「將您重新導向的次數過多」，ERR_TOO_MANY_REDIRECTS。

**原因**：
- Cloudflare SSL 模式設為「**彈性**（Flexible）」→ Cloudflare 用 HTTP 連 GitHub Pages
- GitHub Pages 有強制 HTTPS（`https_enforced: true`）→ 收到 HTTP 就 301 跳 HTTPS
- 結果：Cloudflare → HTTP → GitHub Pages → 301 跳 HTTPS → Cloudflare 又改 HTTP → 無限循環

**解法（Cloudflare 中文介面）**：

1. 登入 [dash.cloudflare.com](https://dash.cloudflare.com)，選擇 `ysipo.com.tw`
2. 左側選單 → **SSL/TLS** → **概述**
3. 在「您的 SSL/TLS 加密模式」找到目前選項（**彈性**）
4. 改選為 **完整**
5. 自動儲存，立即生效

> **注意**：選「完整」不要選「完整（嚴格）」——GitHub Pages 的憑證是 Let's Encrypt，嚴格模式要求 EV 憑證才不會報錯。

**驗證**：改完後直接在瀏覽器開 https://ysipo.com.tw，應立即正常，不需要清快取。

---

### 坑 18：修好重定向後圖片仍破圖（瀏覽器快取殘留）

**症狀**：SSL 模式改回「完整」後，網頁可開，但 Hero 背景圖、部分 stats 圖示、service 圖示顯示破圖，Insights 文章不見，內頁 Header 消失。

**原因**：瀏覽器在無限重定向期間，對某些資源 URL（圖片、JSON、JS）快取了「失敗」的重定向回應。修好 SSL 後頁面 HTML 重新載入，但這些資源 URL 仍從快取讀到舊的錯誤回應，導致破圖。

**伺服器端處置**：
1. 清除 Cloudflare 快取（`purge_everything: true`）
2. 加入 `.nojekyll`（根目錄空白檔案，停用 Jekyll 處理，GitHub Pages 最佳實踐）
3. 再次 git push + purge

**使用者端處置（必做）**：
- **最快**：按 `Ctrl + Shift + N` 開無痕視窗，再開網站
- **徹底**：按 `Ctrl + Shift + Delete` → 時間選「不限時間」→ 勾「快取的圖片和檔案」→ 清除資料 → 重新整理

**特別注意**：
- `ipos.ysipo.com.tw`（承辦人系統）是同一 Cloudflare Zone，SSL 模式是 Zone 級設定，會影響所有子網域
- 解法：Zone 設「完整」，同時建立「頁面規則」讓 `ipos.ysipo.com.tw/*` 單獨套用「彈性」模式（因為 Windows Server origin 沒有 SSL）
- **順序**：先建頁面規則，再改 Zone SSL 模式，避免 ipos 短暫中斷

---

### 坑 19：Cloudflare API Token 只能清快取，無法查閱或修改安全設定

**症狀**：用 API Token 查詢 `security_level`、`ssl` 等設定時回傳 `"Unauthorized to access requested resource"`。

**原因**：目前的 API Token（存於 `scripts/config.js`，已 gitignore）只有 `Cache Purge` 權限，沒有 Zone Settings 讀寫權限。

**解法**：需要在 Cloudflare 儀表板手動操作。如果日後想要 API 控制安全設定，需另建一組具備 `Zone:Read + Zone Settings:Edit` 權限的 Token。

---

## 一般原則

| 原則 | 為什麼 |
|------|-------|
| 改 CSS 優先「追加到 main.css 末尾」 | 後寫的優先級高，不會污染既有規則 |
| 用 `perl -i -pe` 不用 `sed` | sed 處理中文會出狀況 |
| 改之前先 `grep` | 不憑空假設 class 名 / 結構 |
| `!important` 是最後手段 | 用了就回不去，未來別人改很痛 |
| 中英文版要對稱改動 | 不對稱會被使用者抓出來 |
| 部署後必清 Cloudflare 快取 | 沒清就是「程式碼上線了但使用者看不到」 |
| 實機驗證用無痕視窗 | 排除瀏覽器本機快取 |
| Cloudflare SSL 改模式後必清 CF 快取 + 用無痕測試 | 避免 CF 快取舊錯誤回應、避免瀏覽器快取殘留 |
| 多子網域同 Zone → 改 SSL 前先建頁面規則 | 不同 origin（GitHub Pages vs 內部 HTTP Server）需要不同 SSL 模式 |
