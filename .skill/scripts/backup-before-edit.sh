#!/bin/bash
# 備份指定檔案到 backup/yyyymmdd_HHMMSS_<任務名>/
#
# 用法：
#   ./backup-before-edit.sh <任務名> <檔案 1> [檔案 2] ...
#
# 範例：
#   ./backup-before-edit.sh "fix-mobile-hero" assets/css/main.css index.html
#
# 結果：
#   產生 backup/20260517_143022_fix-mobile-hero/
#   含複製的 main.css 和 index.html

set -e

if [ $# -lt 2 ]; then
    echo "用法：$0 <任務名> <檔案 1> [檔案 2] ..."
    echo "範例：$0 'fix-mobile-hero' assets/css/main.css index.html"
    exit 1
fi

TASK_NAME=$1
shift  # 移掉第 1 個參數，剩下的都是檔案

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/${BACKUP_DATE}_${TASK_NAME}"

mkdir -p "${BACKUP_DIR}"

for FILE in "$@"; do
    if [ -f "$FILE" ]; then
        # 保留目錄結構（例如 en/about.html 會放在 backup/yyyy.../en/about.html）
        TARGET_DIR="${BACKUP_DIR}/$(dirname "$FILE")"
        mkdir -p "$TARGET_DIR"
        cp "$FILE" "$TARGET_DIR/"
        echo "  ✅ $FILE → $TARGET_DIR/"
    else
        echo "  ⚠️  跳過（檔案不存在）：$FILE"
    fi
done

echo ""
echo "✅ 備份完成：${BACKUP_DIR}"
echo "   $(ls "${BACKUP_DIR}" | wc -l) 個檔案"
