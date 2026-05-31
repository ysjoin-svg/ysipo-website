// 智財新聞移除工具（管理 generate-news.js 自動上架的新聞）
// 用法：
//   node manage-news.js              列出所有自動上架的智財新聞（含編號）
//   node manage-news.js remove <N>   移除第 N 則：從 news.html 刪卡片 + 更新記錄 + push + 清快取
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let config = {};
try { config = require('./config'); } catch (e) {}
const CF_ZONE_ID   = process.env.CF_ZONE_ID   || config.CF_ZONE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN || config.CF_API_TOKEN;

const WEBSITE_DIR = path.resolve(__dirname, '..');
const NEWS_HTML = path.join(WEBSITE_DIR, 'news.html');
const PUBLISHED = path.join(__dirname, 'published-news.json');

function load() { try { return JSON.parse(fs.readFileSync(PUBLISHED, 'utf8')); } catch (e) { return []; } }

function purgeCloudflare() {
  if (!CF_ZONE_ID || !CF_API_TOKEN) return;
  const https = require('https');
  const data = JSON.stringify({ purge_everything: true });
  const req = https.request({
    hostname: 'api.cloudflare.com', path: '/client/v4/zones/' + CF_ZONE_ID + '/purge_cache', method: 'POST',
    headers: { Authorization: 'Bearer ' + CF_API_TOKEN, 'Content-Type': 'application/json', 'Content-Length': data.length },
  }, (r) => { let b = ''; r.on('data', d => b += d); r.on('end', () => console.log('🌐 Cloudflare:', b)); });
  req.write(data); req.end();
}

const args = process.argv.slice(2);
const list = load();

if (args[0] === 'remove') {
  const n = parseInt(args[1], 10) - 1;
  if (isNaN(n) || n < 0 || n >= list.length) { console.log('❌ 編號無效。先跑 node manage-news.js 看編號。'); process.exit(1); }
  const target = list[n];

  // 從 news.html 移除含該原文連結的 <article> 區塊
  let html = fs.readFileSync(NEWS_HTML, 'utf8');
  const i = target.link ? html.indexOf(target.link) : -1;
  if (i >= 0) {
    let start = html.lastIndexOf('<article class="news-item">', i);
    let end = html.indexOf('</article>', i);
    if (start >= 0 && end >= 0) {
      end += '</article>'.length;
      while (start > 0 && /\s/.test(html[start - 1])) start--;
      html = html.slice(0, start) + '\n' + html.slice(end);
      fs.writeFileSync(NEWS_HTML, html, 'utf8');
      console.log('🗑️  已從 news.html 移除：' + target.displayTitle);
    } else { console.log('⚠️ 找不到對應卡片區塊，僅從記錄移除。'); }
  } else { console.log('⚠️ news.html 找不到該連結（可能已手動移除），僅從記錄移除。'); }

  list.splice(n, 1);
  fs.writeFileSync(PUBLISHED, JSON.stringify(list, null, 2), 'utf8');

  try {
    execSync(`git -C "${WEBSITE_DIR}" add news.html scripts/published-news.json`, { stdio: 'inherit' });
    execSync(`git -C "${WEBSITE_DIR}" commit -m "remove: 移除智財新聞 - ${target.displayTitle}"`, { stdio: 'inherit' });
    execSync(`git -C "${WEBSITE_DIR}" push origin master`, { stdio: 'inherit' });
    console.log('📤 已推送');
    setTimeout(purgeCloudflare, 2000);
  } catch (e) { console.log('⚠️ Git 失敗：' + e.message); }

} else {
  if (list.length === 0) {
    console.log('目前沒有自動上架的智財新聞。');
    console.log('（news.html 裡手寫的新聞不在此工具管理範圍，請直接編輯 news.html）');
  } else {
    console.log('=== 自動上架的智財新聞 ===\n');
    list.forEach((a, i) => {
      console.log((i + 1) + '. ' + a.displayTitle);
      console.log('   來源：' + (a.source || '') + ' | 上架：' + (a.addedAt || '').slice(0, 10));
      console.log('');
    });
    console.log('移除某則 → node manage-news.js remove <編號>');
  }
}
