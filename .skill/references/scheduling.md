# 排程架構：Ubuntu cron 觸發 GitHub workflow（2026-06-01 起）

> ⚠️ **發文/發新聞的排程不靠 GitHub schedule，靠 Ubuntu Server 的 cron。**
> 兩個 workflow 已移除 `schedule:`，只留 `workflow_dispatch`，由 Ubuntu 當「可靠鬧鐘」觸發。

---

## 為什麼這樣設計

GitHub 免費 Actions 的 `schedule` 排程**實測不可靠**：2026-06-01 設每 5 分鐘的 cron 測試，**40 分鐘完全沒觸發**；當天早上的週一發文排程也沒跑。GitHub 官方明載 scheduled workflow「不保證準時、高負載會延遲甚至丟棄」。

解法：用使用者 24h 開機的 **Ubuntu Server（192.168.0.101，Asia/Taipei 時區）** 的 cron 當鬧鐘，每週準時用 GitHub API 觸發 `workflow_dispatch`。發文/生圖/email/push 全部仍在 GitHub 雲端跑，不變。

---

## Ubuntu 端設定（yongsyu@192.168.0.101）

| 檔案 | 用途 |
|------|------|
| `~/.ysipo-token` | GitHub fine-grained PAT（權限：repo `ysjoin-svg/ysipo-website` 的 Actions read+write），`chmod 600` |
| `~/ysipo-trigger.sh` | 觸發腳本：`curl` POST 到 GitHub API 的 workflow dispatches |
| `~/ysipo-trigger.log` | cron 執行紀錄 |

**crontab（台北時間）**：
```cron
0 9 * * 1 /home/yongsyu/ysipo-trigger.sh weekly-publish.yml >> /home/yongsyu/ysipo-trigger.log 2>&1
0 9 * * 4 /home/yongsyu/ysipo-trigger.sh weekly-news.yml   >> /home/yongsyu/ysipo-trigger.log 2>&1
```

**觸發腳本核心**（`~/ysipo-trigger.sh`）：
```bash
WF="$1"; TOKEN=$(cat ~/.ysipo-token)
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/ysjoin-svg/ysipo-website/actions/workflows/${WF}/dispatches" \
  -d '{"ref":"master"}' -w "... HTTP %{http_code}\n"
```
成功回 **HTTP 204**。

---

## 常用操作

```bash
# 手動測試觸發（從 Windows SSH 進 Ubuntu）
ssh yongsyu@192.168.0.101 '~/ysipo-trigger.sh weekly-news.yml'   # 回 204 即成功

# 看 cron 觸發紀錄
ssh yongsyu@192.168.0.101 'tail ~/ysipo-trigger.log'

# 改排程時間 / 看現有 crontab
ssh yongsyu@192.168.0.101 'crontab -l'

# 確認 GitHub 端有跑
gh run list --workflow=weekly-publish.yml --limit 3
gh run list --workflow=weekly-news.yml --limit 3
```

## Token 失效時

到 https://github.com/settings/personal-access-tokens 重新產生 fine-grained PAT（repo `ysjoin-svg/ysipo-website`、Actions: Read and write），覆蓋寫入：
```bash
printf 'github_pat_新token' | ssh yongsyu@192.168.0.101 'cat > ~/.ysipo-token && chmod 600 ~/.ysipo-token'
```

## 注意
- **不要**在 workflow 重新加 `schedule:`，否則 GitHub 偶爾觸發會跟 Ubuntu 雙跑、重複發文。
- email 通知（成功/失敗）仍由 workflow 內的 dawidd6 寄到 taiejoin@hotmail.com，是最終確認手段。
