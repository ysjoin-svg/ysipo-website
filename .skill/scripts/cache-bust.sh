#!/bin/bash
# 強制清瀏覽器端快取
# 給所有 HTML 內的 main.css 和 main.js 加版本參數 ?v=時戳
#
# 用途：當 Cloudflare 清了、實機（特別 iPhone Safari）還是吃舊版時
#
# 用法：
#   ./cache-bust.sh

set -e

if [ ! -d "assets/css" ]; then
    echo "❌ 不在永旭網站根目錄"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d%H%M)
echo "🔧 加版本參數 ?v=${TIMESTAMP}"

FILES=(
    "index.html"
    "about.html"
    "services.html"
    "insights.html"
    "news.html"
    "contact.html"
    "thank-you.html"
    "en/index.html"
    "en/about.html"
    "en/services.html"
    "en/insights.html"
    "en/news.html"
    "en/contact.html"
)

COUNT=0
for f in "${FILES[@]}"; do
    if [ -f "$f" ]; then
        # 用 perl 比 sed 安全處理中文
        perl -i -pe "s|main\.css(\?v=[^\"']*)?|main.css?v=${TIMESTAMP}|g" "$f"
        perl -i -pe "s|main\.js(\?v=[^\"']*)?|main.js?v=${TIMESTAMP}|g" "$f"
        COUNT=$((COUNT + 1))
    fi
done

echo "✅ 處理了 ${COUNT} 個檔案"
echo ""
echo "下一步：./deploy.sh \"chore: cache bust ${TIMESTAMP}\""
