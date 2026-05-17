# 永旭網站維護 Skill

> 這是一份「能讓任何 AI 助手秒進入永旭網站專案脈絡」的知識包。
> 把這個資料夾放好之後，下次跟 AI 對話時不用再貼任何交接文件。

---

## 📦 內容

| 檔案 / 目錄 | 用途 |
|------------|------|
| `SKILL.md` | 主入口（AI 第一個讀的檔案） |
| `references/project-context.md` | 完整專案資訊（網站、人物、聯絡、檔案結構） |
| `references/css-naming.md` | `.ys-*` 命名規則 + v20 色彩規範 |
| `references/communication-dict.md` | 「Johnny 的口語」→「實際 class」對照字典 |
| `references/deployment.md` | Git + Cloudflare 部署 SOP |
| `references/known-issues.md` | 已踩過的坑與解法（這幾天累積的）|
| `references/auto-publish.md` | Phase 3 自動發文系統 |
| `checklists/before-deploy.md` | 部署前自檢清單 |
| `checklists/rwd-test.md` | RWD 測試清單 |
| `scripts/backup-before-edit.sh` | 一鍵備份 |
| `scripts/deploy.sh` | 一鍵部署（commit + push + 清快取） |
| `scripts/purge-cloudflare.sh` | 單獨清 Cloudflare 快取 |
| `scripts/cache-bust.sh` | 強制清瀏覽器端快取（給 CSS / JS 加版本參數）|
| `templates/cta-section.html` | CTA 區塊範本 |
| `templates/page-hero.html` | 內頁 Hero 範本 |
| `templates/service-card.html` | Service 卡片範本 |

---

## 🛠️ 安裝方式

### 方式 A：給 Claude Code 用（推薦）

把整個 `ysipo-website/` 資料夾放到專案目錄底下的 `.skills/`：

```
C:\Users\Johnny\Desktop\Agent\永旭網站\
├── .skills\
│   └── ysipo-website\        ← 整包放這裡
│       ├── SKILL.md
│       ├── references\
│       └── ...
├── index.html
├── about.html
└── ...
```

下次開 Claude Code 對話時，直接說：

> 「看 `.skills/ysipo-website/SKILL.md`，然後幫我改 contact 頁的 Email 欄位 placeholder」

Claude Code 會自動讀 SKILL.md，再依任務性質決定讀哪個 reference。

### 方式 B：給 Claude.ai 網頁版用

如果你用 claude.ai 網頁版，需要把整個 skill 資料夾打包成 zip 上傳到對話：

```bash
cd <skill 上層目錄>
zip -r ysipo-website-skill.zip ysipo-website/
```

然後在對話開頭：

> 「我傳一份永旭網站 skill 給你，看完 SKILL.md 後等我下指令」
> 〔上傳 zip〕

---

## 🎯 使用範例

### 範例 1：基本維護

> 你：「幫我看一下首頁 Hero 的條列 3 點要怎麼改成 4 點」

AI 看完 SKILL.md → 知道 `.ys-hero-points` 在 `.ys-hero` 內 → 看 `templates/` 沒範本 → 直接 grep 找實際結構 → 給你完整改動指令（含備份、commit、清快取）。

### 範例 2：跨多頁修改

> 你：「Footer 的高雄電話我要從 (07) 345-3388 改成 (07) 999-9999」

AI 看完 SKILL.md → 知道 partials 結構（中英文版各一份）→ 知道首頁 index.html 是硬寫不走 partial → 找出**所有 7 個位置**（中英文 partials × Header + Footer + 首頁硬寫）→ 一次改齊。

### 範例 3：除錯

> 你：「我手機按漢堡沒反應」

AI 看完 SKILL.md → 翻 `references/known-issues.md` 第 1 條 → 知道是 `.ys-nav.open` 規則沒寫 → 直接給修補指令。

### 範例 4：新增功能

> 你：「我想在首頁加一個團隊介紹區」

AI 看完 SKILL.md → 翻 `references/css-naming.md` 知道命名規則 → 設計新 class 以 `.ys-team` 開頭 → 用 `var(--gold)` 而非寫死色碼 → 給完整 HTML + CSS。

---

## 🔑 環境變數設定

部署腳本需要 `CF_API_TOKEN`：

### Git Bash / macOS / Linux

```bash
# 加到 ~/.bashrc 或 ~/.zshrc
export CF_API_TOKEN="你的_Cloudflare_API_Token"
```

### Windows PowerShell

```powershell
# 永久設定
[System.Environment]::SetEnvironmentVariable('CF_API_TOKEN', '你的_token', 'User')
# 重開 terminal 後生效
```

⚠️ **絕對不要把 token 寫進 git** 任何地方。

---

## 🔄 維護這個 Skill

當網站有重大改動時（例如又一次大改 v21、新增區塊等），記得回頭更新這個 skill：

1. 改 `references/project-context.md` 的「已完成項目」
2. 若有新 class 命名 → 更新 `references/css-naming.md` 和 `communication-dict.md`
3. 若踩到新坑 → 加進 `references/known-issues.md`
4. 若新增區塊 → 在 `templates/` 加範本

skill 的價值在於「**反映當下真實狀態**」，過時的 skill 比沒 skill 還糟。

---

## 📅 版本

- v1（2026-05-17）— 初版，包含 v20 改造 + 階段 A/B/C + 漢堡修復 + 手機 Hero 重做 + Nav 隱藏 English

---

## 💬 給 AI 助手的留言

如果你是接手的 AI：

1. **先讀 SKILL.md 全部**（不長）
2. 依任務性質讀 reference（不要每次都讀全部）
3. **絕對先備份再改**
4. **commit 訊息不用 emoji**
5. **不憑空假設 class 名 / 結構** — grep 確認再動
6. **中英文版要對稱改動**
7. **部署完一定清 Cloudflare 快取**
8. 不熟悉的需求 → 問使用者，不要硬猜

Johnny 是個務實、注重備份、喜歡明確說明的使用者。**清楚的回報比酷炫的功能更重要**。

祝順利。
