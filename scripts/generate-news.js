// 智財新聞半自動更新 —— 爬 Google News RSS + Nvidia LLM 改寫中立摘要 + 自動上架
// 用法：
//   node generate-news.js --dry       只爬取+改寫並印出，不寫檔/不推送（測試用）
//   node generate-news.js --no-push    寫入 news.html + published-news.json，但不 git push（本地預覽）
//   node generate-news.js              正式：寫入 + git push + 清 Cloudflare 快取
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ===== 密鑰：env 優先，本機回退 config.js =====
let config = {};
try { config = require('./config'); } catch (e) {}
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || config.NVIDIA_API_KEY;
const CF_ZONE_ID     = process.env.CF_ZONE_ID     || config.CF_ZONE_ID;
const CF_API_TOKEN   = process.env.CF_API_TOKEN   || config.CF_API_TOKEN;
if (!NVIDIA_API_KEY) { console.error('❌ 缺少 NVIDIA_API_KEY'); process.exit(1); }

const WEBSITE_DIR = path.resolve(__dirname, '..');
const NEWS_HTML = path.join(WEBSITE_DIR, 'news.html');
const PUBLISHED_JSON = path.join(__dirname, 'published-news.json');
const DRY = process.argv.includes('--dry');
const NO_PUSH = process.argv.includes('--no-push');

// 多組查詢，涵蓋商標 / 專利 / 著作權 / 官方公告
// 查詢以各國官方智財消息為主，也涵蓋一般新聞媒體（避免同業事務所來源見 SOURCE_BLOCKLIST）
const QUERIES = [
  '智慧財產局 商標 專利 公告',         // 台灣官方
  '台灣 著作權 專利 商標 法規 修法',   // 台灣法規
  '專利 商標 侵權 案例 企業 台灣',     // 案例（主流媒體）
  '商標 搶註 爭議 品牌 仿冒',          // 商標案例
  '美國 USPTO 專利 商標 智財',         // 美國
  '日本 韓國 專利 商標 智慧財產',      // 日韓
  '歐盟 EUIPO EPO 商標 專利',          // 歐洲
  '中國 大陸 知識產權 專利 商標',      // 中國
];
const maxArg = process.argv.find((a) => a.startsWith('--max='));
const MAX_NEWS = maxArg ? parseInt(maxArg.split('=')[1], 10) : 2;  // 每次最多上架幾則（--max=N 覆蓋，用於一次填充資料庫）
const RECENT_DAYS = 150;   // 只取近 N 天的新聞

// 排除「個案訴訟 / 點名公司」類新聞 —— 事務所網站只留法規/公告/制度類，避免影射特定企業與版權疑慮
// 個案訴訟/醜聞的把關改由 LLM 語意判斷（中間尺度：保留有教育意義的案例、擋掉純賠償金額的醜聞式報導），見 summarize()

// 同業/競業來源黑名單 —— 避免引用其他事務所或智財服務業者的新聞，把客戶導去競爭對手
const SOURCE_BLOCKLIST = [
  '北美智權', '智權報', 'naipo', 'naipnews',
  '事務所', '法律事務所', '律師事務所', '專利商標事務所', '智權事務所', '專利師事務所',
  '理律', '聖島', '台一國際', '聯合專利', '群帆', '冠群', '卓遠', 'Accolade',
  '宏景智權', '智權集團',
];

// 來源美化：RSS 給的網域 → 正式名稱
const SOURCE_MAP = {
  'moea.gov.tw': '經濟部智慧財產局',
  'tipo.gov.tw': '經濟部智慧財產局',
};
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let d = ''; r.on('data', c => (d += c)); r.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function decodeEntities(s) {
  return s.replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}
// 進 HTML 屬性/內文前再跳脫一次，避免破版
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchRSS(query) {
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) +
    '&hl=zh-TW&gl=TW&ceid=TW:zh-Hant';
  const xml = await httpsGet(url);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1];
    const pick = (re) => { const x = block.match(re); return x ? decodeEntities(x[1]).trim() : ''; };
    return {
      title: pick(/<title>([\s\S]*?)<\/title>/),
      link: pick(/<link>([\s\S]*?)<\/link>/),
      pubDate: pick(/<pubDate>([\s\S]*?)<\/pubDate>/),
      source: pick(/<source[^>]*>([\s\S]*?)<\/source>/),
    };
  });
}

// 用 LLM 把新聞標題改寫成中立、專業的智財新聞摘要
function summarize(title, source) {
  return new Promise((resolve) => {
    const sys =
      '你是台灣智慧財產權事務所的新聞編輯。' +
      '【第一步｜過濾】若這則新聞符合以下任一，請只回覆 {"skip":true}，不要改寫：' +
      '(a) 與專利、商標、著作權、智慧財產權無關；' +
      '(b) 只是報導特定公司的訴訟賠償金額、勝敗或上訴等個案結果，不具通用的警示或教育意義（例如僅講「某公司被判賠X萬、上訴到底」）；' +
      '(c) 屬八卦、醜聞或與智財專業無關的爭執。' +
      '【第二步｜改寫】否則（包括官方公告、法規修正、制度介紹，以及「具教育或警示意義的專利／商標案例」），' +
      '請用繁體中文、台灣慣用語改寫成中立、專業的智財新聞摘要：' +
      '1) 一個精簡標題（不超過 30 字，不照抄原標題，不聳動）；' +
      '2) 2-3 句客觀摘要（不超過 120 字）：交代「是誰、發生什麼、對權利人或申請人有何意義或提醒」；' +
      '若屬案例類，聚焦「對企業或權利人的啟示、提醒」，不要聚焦賠償金額或聳動情節；' +
      '避免「旨在／促進發展／展現成果」這類空泛套話；不杜撰未提及的細節；不用「軟件/網絡/信息/質量」等中國用語；' +
      '只以 JSON 回覆 {"title":"...","summary":"..."}。' +
      '注意：兩步驟只能擇一回覆，且只輸出 JSON。';
    const user = `新聞標題：「${title}」\n來源：${source}`;
    const payload = JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.4,
      max_tokens: 400,
    });
    const req = https.request({
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + NVIDIA_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (r) => {
      let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => {
        try {
          const txt = JSON.parse(b).choices[0].message.content;
          const obj = JSON.parse(txt.match(/\{[\s\S]*\}/)[0]);
          if (obj.skip) { resolve({ skip: true }); return; }
          resolve({ title: obj.title, summary: obj.summary });
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(payload); req.end();
  });
}

function withinRecent(pubDate) {
  const t = Date.parse(pubDate);
  return !isNaN(t) && (Date.now() - t) <= RECENT_DAYS * 86400 * 1000;
}

function loadPublished() {
  try { return JSON.parse(fs.readFileSync(PUBLISHED_JSON, 'utf8')); } catch (e) { return []; }
}
function prettySource(src) { return SOURCE_MAP[src] || src || '網路新聞'; }
function fmtDate(pubDate) {
  const d = new Date(pubDate);
  return { day: String(d.getDate()).padStart(2, '0'), my: MONTHS[d.getMonth()] + ' ' + d.getFullYear() };
}

// 產生一張智財新聞卡片（含原文連結 + 資料來源）
function buildCard(item) {
  const f = fmtDate(item.pubDate);
  const src = esc(prettySource(item.source));
  return (
'\n            <article class="news-item">' +
'\n              <div class="news-date">' +
'\n                <div class="day">' + f.day + '</div>' +
'\n                <div class="month-year">' + f.my + '</div>' +
'\n              </div>' +
'\n              <div class="news-content">' +
'\n                <h3><a href="' + esc(item.link) + '" target="_blank" rel="noopener" style="color:inherit;">' + esc(item.displayTitle) + '</a></h3>' +
'\n                <p>' + esc(item.summary) + '</p>' +
'\n                <div style="margin-top: var(--space-2);">' +
'\n                  <span class="tag tag--outline">智財新聞</span>' +
'\n                  <span style="font-size:var(--text-xs);color:var(--color-text-muted);margin-left:var(--space-2);">資料來源：' + src + '</span>' +
'\n                </div>' +
'\n              </div>' +
'\n            </article>\n'
  );
}

// 把卡片 prepend 到 news.html 的智財新聞插入點（最新在前，保留既有）
function upsertNews(cardsHtml) {
  let html = fs.readFileSync(NEWS_HTML, 'utf8');
  const marker = '<div class="news-list" data-source="ai-agent">';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error('找不到智財新聞插入點 marker');
  const pos = idx + marker.length;
  html = html.slice(0, pos) + cardsHtml + html.slice(pos);
  fs.writeFileSync(NEWS_HTML, html, 'utf8');
}

function purgeCloudflare() {
  if (!CF_ZONE_ID || !CF_API_TOKEN) return;
  const data = JSON.stringify({ purge_everything: true });
  const req = https.request({
    hostname: 'api.cloudflare.com', path: '/client/v4/zones/' + CF_ZONE_ID + '/purge_cache', method: 'POST',
    headers: { Authorization: 'Bearer ' + CF_API_TOKEN, 'Content-Type': 'application/json', 'Content-Length': data.length },
  }, (r) => { let b = ''; r.on('data', d => b += d); r.on('end', () => console.log('🌐 Cloudflare:', b)); });
  req.write(data); req.end();
}

// 寫 GitHub Actions step output，供 email 通知列出本週新增
function writeOutput(count, titles) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${count}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `added<<NEWS_EOF\n${titles || '(本週無新增)'}\nNEWS_EOF\n`);
}

(async () => {
  console.log('📡 抓取智財新聞（Google News RSS）...');
  let all = [];
  for (const q of QUERIES) {
    try { all = all.concat(await fetchRSS(q)); }
    catch (e) { console.log('  查詢失敗：' + q); }
  }
  const published = loadPublished();
  const publishedKeys = new Set(published.map(p => p.origTitle));

  // 去重(標題) → 篩近期 → 排除已上架過 → 新到舊
  const seen = new Set();
  const candidates = all.filter((n) => {
    if (!n.title || seen.has(n.title)) return false;
    seen.add(n.title);
    const st = (n.source || '') + ' ' + (n.title || '');
    if (SOURCE_BLOCKLIST.some((k) => st.includes(k))) return false;      // 濾掉同業事務所來源
    return withinRecent(n.pubDate) && !publishedKeys.has(n.title);
  }).sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));

  console.log(`🔎 近 ${RECENT_DAYS} 天、未上架過的候選 ${candidates.length} 則，取前 ${MAX_NEWS} 則改寫`);
  const picked = candidates.slice(0, MAX_NEWS);

  const newItems = [];
  for (const n of picked) {
    const s = await summarize(n.title, n.source);
    if (!s) { console.log('  ⚠️ 摘要失敗，略過：' + n.title); continue; }
    if (s.skip) { console.log('  ⏭️  AI 判定為醜聞式個案/無關，跳過：' + n.title); continue; }
    newItems.push({ ...n, displayTitle: s.title, summary: s.summary, origTitle: n.title });
  }

  if (DRY) {
    newItems.forEach((n) => {
      console.log('\n──────────────────────');
      console.log('標題：' + n.displayTitle);
      console.log('摘要：' + n.summary);
      console.log('資料來源：' + prettySource(n.source) + '（' + n.pubDate + '）');
      console.log('原文：' + n.link);
    });
    console.log('\n[dry-run] 未寫入網站、未推送。');
    return;
  }

  if (newItems.length === 0) {
    console.log('✅ 本次沒有新的新聞可上架（可能都已上架過）。');
    writeOutput(0, '');
    return;
  }

  // 上架（newItems 已是新到舊，整批 prepend，最新在最前）
  const cardsHtml = newItems.map(buildCard).join('');
  upsertNews(cardsHtml);
  console.log(`📰 已上架 ${newItems.length} 則到 news.html`);

  // 記錄已上架，供下次去重 / 移除工具使用
  const updated = newItems.map((n) => ({
    origTitle: n.origTitle, displayTitle: n.displayTitle, source: n.source,
    date: n.pubDate, link: n.link, addedAt: new Date().toISOString(),
  })).concat(published);
  fs.writeFileSync(PUBLISHED_JSON, JSON.stringify(updated, null, 2), 'utf8');

  writeOutput(newItems.length, newItems.map((n) => '・' + n.displayTitle + '（資料來源：' + prettySource(n.source) + '）').join('\n'));

  if (NO_PUSH) { console.log('[--no-push] 已寫檔，未推送。請自行檢查 news.html。'); return; }

  // 推送 + 清快取
  try {
    execSync(`git -C "${WEBSITE_DIR}" add news.html scripts/published-news.json`, { stdio: 'inherit' });
    execSync(`git -C "${WEBSITE_DIR}" commit -m "auto: 智財新聞更新 (${newItems.length} 則)"`, { stdio: 'inherit' });
    execSync(`git -C "${WEBSITE_DIR}" push origin master`, { stdio: 'inherit' });
    console.log('📤 已推送到 GitHub');
    setTimeout(purgeCloudflare, 3000);
  } catch (e) { console.log('⚠️ Git 推送失敗：' + e.message); }
})();
