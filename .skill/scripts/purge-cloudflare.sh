#!/bin/bash
# 清 Cloudflare 快取（不部署，只清）
#
# 用法：
#   ./purge-cloudflare.sh           # 清全部
#   ./purge-cloudflare.sh /index.html /about.html   # 清指定路徑
#
# 環境變數：
#   CF_API_TOKEN（必須）

set -e

if [ -z "$CF_API_TOKEN" ]; then
    echo "❌ CF_API_TOKEN 未設定"
    echo "   請先 export CF_API_TOKEN=xxx"
    exit 1
fi

ZONE_ID="fb5a2f0ebf6f95e1ab3a3ed041a2b3ce"

if [ $# -eq 0 ]; then
    # 清全部
    echo "🌐 清除所有快取..."
    DATA='{"purge_everything":true}'
else
    # 清指定路徑
    URLS=""
    for path in "$@"; do
        URL="https://ysipo.com.tw${path}"
        if [ -z "$URLS" ]; then
            URLS="\"$URL\""
        else
            URLS="$URLS, \"$URL\""
        fi
    done
    DATA="{\"files\":[$URLS]}"
    echo "🌐 清除指定路徑快取：$@"
fi

RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "$DATA")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ 成功"
else
    echo "❌ 失敗"
    echo "$RESPONSE"
    exit 1
fi
