# 永旭智慧財產事務所 — 官方網站重建專案

## 專案說明
重建 ysipo.com.tw 官方網站。舊網站為 WordPress + Elementor，SSL 已過期無法正常瀏覽。
新網站規劃為純靜態 HTML，部署至 GitHub Pages。

## 目錄結構（規劃中）
```
永旭網站/
├── CLAUDE.md                   # 本專案說明
├── ysipo_website_archive.md    # 舊網站內容存檔（Wayback Machine 重建）
├── index.html                  # 首頁
├── about.html                  # 關於我們
├── contact.html                # 聯絡我們
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   └── img/                    # logo、圖片
```

## 公司基本資料
- **名稱**：永旭智慧財產事務所（Yong Syu Intellectual Property Office）
- **主持人**：李宗穎（逾 25 年智慧財產權經驗）
- **高雄所**：高雄市左營區子華路 116 號 2 樓之 3
- **台北所**：台北市中正區莒光路 47 號 1 樓
- **電話**：+886 7 345-3388
- **Email**：ys@ysipo.com
- **網域**：ysipo.com.tw

## 服務項目
1. **專利**：申請、維護、舉發、撤銷、答辯、異議、行政救濟、侵權取締、移轉授權
2. **商標**：申請、註冊、維護、撤銷、答辯、評定、移轉授權、侵權取締
3. **著作權**：登記申請、侵權鑑定、著作授權合約

## 舊網站素材來源
- 存檔日期：2025-03-14（Wayback Machine）
- Logo（中英文）：https://web.archive.org/web/20250314222150/https://www.ysipo.com.tw/wp-content/uploads/2024/03/Logo%E4%B8%AD%E8%8B%B1%E6%96%87%E5%8F%8A%E5%9C%96.png
- Logo（純圖）：https://web.archive.org/web/20250314222428/https://www.ysipo.com.tw/wp-content/uploads/2024/03/cropped-logo2.png
- 關於我們主視覺：about-us-page-cta-image.webp（wp-content/uploads/2022/08/）
- 畫廊圖片：gallery-image-1 ～ gallery-image-5.webp

## 設計風格
- 主標語：Making your vision become a reality
- Slogan：永續服務，品質第一
- 舊網站風格：Blocksy 主題（專業、簡潔）
- 新設計方向：待確認（還原舊風格 / 全新設計）

## 部署規劃
| 項目 | 說明 |
|------|------|
| 平台 | GitHub Pages（免費靜態托管） |
| Repo | ysjoin-svg/ysipo-website（待建立） |
| 網址 | ysjoin-svg.github.io/ysipo-website（暫定） |
| 自訂網域 | ysipo.com.tw（需設定 DNS CNAME） |

## 操作偏好
- 回覆語言：繁體中文
- 靜態 HTML + CSS + JS，不使用框架
- 版面參考舊網站風格，內容以 ysipo_website_archive.md 為準

## Cloudflare 快取管理
**規則：每次 `git push` 完成後，立即自動清除 Cloudflare 快取，不需另外詢問。**

密鑰存放於 `scripts/config.js`（已加入 .gitignore，不上傳）：
- `CF_ZONE_ID`：Cloudflare Zone ID
- `CF_API_TOKEN`：Cloudflare API Token

```bash
# 讀取 config.js 並清快取
node -e "
const {CF_ZONE_ID, CF_API_TOKEN} = require('./scripts/config.js');
const https = require('https');
const data = JSON.stringify({purge_everything: true});
const req = https.request({
  hostname: 'api.cloudflare.com',
  path: '/client/v4/zones/' + CF_ZONE_ID + '/purge_cache',
  method: 'POST',
  headers: {'Authorization':'Bearer ' + CF_API_TOKEN,'Content-Type':'application/json','Content-Length':data.length}
}, r => { let b=''; r.on('data',d=>b+=d); r.on('end',()=>console.log(b)); });
req.write(data); req.end();
"
```

或直接用 curl（token 從 config.js 取得）：
```bash
CF_ZONE_ID=$(node -e "console.log(require('./scripts/config.js').CF_ZONE_ID)")
CF_API_TOKEN=$(node -e "console.log(require('./scripts/config.js').CF_API_TOKEN)")
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

- 回應 `"success":true` 表示清除成功
