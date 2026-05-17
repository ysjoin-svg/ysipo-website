# Phase 3 自動發文系統

> 永旭網站每週一自動產生一篇智財文章發到 insights。

---

## 系統架構

```
每週一早上 09:00
   ↓
Windows 工作排程器（在 Johnny 的電腦上）觸發
   ↓
執行 node scripts/generate-article.js
   ↓
呼叫 Nvidia API（Llama 3.3-70B）產出繁體中文文章
   ↓
自動分類（商標 / 專利 / 著作權 / 國際智財）
   ↓
從 assets/img/categories/ 隨機選配圖
   ↓
產出 HTML 檔到 insights/article-yyyymmdd-時戳.html
   ↓
更新 insights/articles.json 索引
   ↓
git add → commit → push
   ↓
等 60 秒後自動 curl Cloudflare API 清快取
```

---

## 關鍵檔案

| 檔案 | 用途 |
|------|------|
| `scripts/generate-article.js` | 主程式（產文 + 寫檔 + 提交 + 清快取） |
| `scripts/manage-articles.js` | 互動式管理工具（列出 / 編輯 / 刪除既有文章）|
| `insights/articles.json` | 文章索引（標題、分類、圖、發佈日期、檔名） |
| `insights/article-*.html` | 個別文章頁 |
| `assets/img/categories/` | 12 張分類配圖 |

---

## 手動操作

### 立刻產一篇文章（測試 / 補發）

```bash
cd C:\Users\Johnny\Desktop\Agent\永旭網站\scripts
node generate-article.js
```

預期輸出：
```
✅ 文章已生成：insights/article-yyyymmdd-時戳.html
✅ articles.json 已更新
✅ Git push 完成
✅ Cloudflare 快取已清除
```

### 管理現有文章

```bash
cd C:\Users\Johnny\Desktop\Agent\永旭網站\scripts
node manage-articles.js
```

互動式選單：
- 列出所有文章
- 編輯某篇
- 刪除某篇
- 重新發佈

---

## Windows 工作排程器設定

### 查看現有排程

```powershell
# PowerShell
Get-ScheduledTask | Where-Object {$_.TaskName -like "*永旭*"}
```

或開圖形介面：「控制台 → 系統管理工具 → 工作排程器」

### 排程設定要點

- **觸發頻率**：每週一
- **觸發時間**：早上 09:00
- **動作**：`node generate-article.js`
- **工作目錄**：`C:\Users\Johnny\Desktop\Agent\永旭網站\scripts`

### 重要設定

| 設定 | 建議值 |
|------|-------|
| 如果電腦睡眠是否喚醒 | ☑ 喚醒電腦以執行此工作 |
| 如果錯過排程 | ☑ 啟動後盡快執行錯過的工作 |
| AC 電源限制 | ☐ 不要勾「僅在 AC 電源時執行」（除非桌機）|
| 失敗時重試 | ☑ 1 次，間隔 15 分鐘 |

---

## 已知風險

### ⚠️ 風險 1：電腦關機就跳過

最大問題：Johnny 的電腦不是 24 小時開機，星期一 9 點若沒開機 → **該週跳過**。

**狀態**：手動測試發文成功過，但實際排程**從未自動成功觸發**。

### ⚠️ 風險 2：API key 過期 / 額度用完

- Nvidia API 有月額度限制
- Cloudflare token 不會主動過期但可能被重設

排程失敗時不會主動通知（沒設 email alert），需要主動檢查 `insights/articles.json` 看有沒有新文章。

### ⚠️ 風險 3：產文品質浮動

LLM 偶爾會產出：
- 不符合台灣用語（用了「軟件」「網絡」等中國用詞）
- 引用法條版本過時
- 重複過往主題

**建議**：每隔 1-2 個月用 `manage-articles.js` 抽查、必要時修改或刪除。

---

## 長期改進建議

**遷移到 GitHub Actions**（強烈推薦）：

優點：
- ✅ 7×24 雲端跑，不受電腦狀態影響
- ✅ 失敗會 email 通知
- ✅ 執行紀錄保留在 GitHub
- ✅ 可手動觸發測試（workflow_dispatch）

步驟：
1. 寫 `.github/workflows/weekly-publish.yml`
2. 把 Nvidia / Cloudflare token 放進 GitHub Secrets
3. cron: `0 1 * * 1`（UTC 01:00 = 台北 09:00 星期一）
4. 加 `workflow_dispatch:` 讓手動觸發可行
5. 確認後刪掉 Windows 工作排程器內的同名工作

⚠️ 遷移過程中要小心**雙跑**問題（雲端跑了一篇、本機又跑一篇）。

---

## 偵察指令

```bash
# 1. 看排程是否還在
Get-ScheduledTask | Where-Object {$_.TaskName -like "*永旭*"}

# 2. 看最近一次執行紀錄
Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" -MaxEvents 50 |
  Where-Object {$_.Message -like "*永旭*"} |
  Select-Object TimeCreated, Id, Message |
  Format-Table -Wrap

# 3. 看本機產文 log（如果有）
cd C:\Users\Johnny\Desktop\Agent\永旭網站\scripts
type generate-article.log 2>nul

# 4. 看 articles.json 最新一篇日期
node -e "const a = require('./insights/articles.json'); console.log(a.slice(-3));"
```
