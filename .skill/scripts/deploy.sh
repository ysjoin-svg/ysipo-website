#!/bin/bash
# 一鍵部署：git add + commit + push + 清 Cloudflare 快取
#
# 用法：
#   ./deploy.sh "<commit 訊息>"
#
# 範例：
#   ./deploy.sh "fix: 手機 Hero 鋼筆位置調整"
#
# 注意：
#   - CF_API_TOKEN 必須先在環境變數設好（export CF_API_TOKEN=xxx）
#   - 從專案根目錄執行
#   - 會先 git status 確認哪些檔案改了，再進行

set -e

# 確認在專案根目錄
if [ ! -f "index.html" ] || [ ! -d "assets" ]; then
    echo "❌ 不在永旭網站根目錄。請先 cd 到 C:\\Users\\Johnny\\Desktop\\Agent\\永旭網站"
    exit 1
fi

if [ -z "$1" ]; then
    echo "用法：$0 \"<commit 訊息>\""
    echo "範例：$0 \"fix: 手機 Hero 鋼筆位置調整\""
    exit 1
fi

COMMIT_MSG=$1

# 1. 看改動
echo "════════════════════════════════════════════"
echo "📋 改動清單"
echo "════════════════════════════════════════════"
git status --short
echo ""

# 詢問確認（非互動模式跳過）
if [ -t 0 ]; then
    read -p "確認部署？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
fi

# 2. git add + commit + push
echo ""
echo "════════════════════════════════════════════"
echo "🚀 部署中"
echo "════════════════════════════════════════════"
git add .
git commit -m "$COMMIT_MSG"
git push origin master

echo ""
echo "✅ Git push 完成"

# 3. 清 Cloudflare 快取
if [ -z "$CF_API_TOKEN" ]; then
    echo ""
    echo "⚠️  CF_API_TOKEN 未設定，跳過清快取"
    echo "   請手動：export CF_API_TOKEN=xxx 然後再跑下面這行："
    echo ""
    echo "curl -X POST \"https://api.cloudflare.com/client/v4/zones/fb5a2f0ebf6f95e1ab3a3ed041a2b3ce/purge_cache\" \\"
    echo "  -H \"Authorization: Bearer \$CF_API_TOKEN\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  --data '{\"purge_everything\":true}'"
    exit 0
fi

echo ""
echo "🌐 清 Cloudflare 快取..."
RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/fb5a2f0ebf6f95e1ab3a3ed041a2b3ce/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Cloudflare 快取已清除"
else
    echo "⚠️  清快取可能失敗，回應："
    echo "$RESPONSE"
fi

echo ""
echo "════════════════════════════════════════════"
echo "✅ 部署完成"
echo "   GitHub Pages 約 30 秒~2 分鐘後上線"
echo "   實機驗證：iPhone 用無痕視窗開 https://ysipo.com.tw"
echo "════════════════════════════════════════════"
