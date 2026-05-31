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
const QUERIES = [
  '智慧財產局 商標 公告',
  '專利 法規 台灣 智慧財產',
  '著作權 修法 台灣',
  '智慧財產權 侵權 判決 台灣',
];
const MAX_NEWS = 2;        // 每次最多上架幾則
const RECENT_DAYS = 150;   // 只取近 N 天的新聞

// 排除「個案訴訟 / 點名公司」類新聞 —— 事務所網站只留法規/公告/制度類，避免影射特定企業與版權疑慮
const EXCLUDE_KEYWORDS = [
  '判賠', '起訴', '求償', '提告', '興訟', '纏訟', '敗訴', '勝訴',
  '和解金', '被訴', '涉侵權', '侵權案', '遭訴', '判決', '官司', '訴請', '訴訟',
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
      '【第一步｜過濾】若這則新聞是針對「特定公司或個人」的訴訟、侵權糾紛、判賠、上訴、求償等個案事件' +
      '（而非通用的法規修正、官方公告、制度介紹、研討會、考試報名、統計數據等），' +
      '請只回覆 {"skip":true}，不要改寫。' +
      '【第二步｜改寫】否則請用繁體中文、台灣慣用語把標題改寫成中立、專業的智財新聞摘要：' +
      '1) 一個精簡標題（不超過 30 字，不照抄原標題，不聳動）；' +
      '2) 2-3 句客觀摘要（不超過 120 字）：具體交代「是誰、做了什麼事、對權利人或申請人有何意義或提醒」，' +
      '避免「旨在」「促進發展」「展現成果」這類空泛套話；不杜撰原標題未提及的細節；' +
      '不用「軟件/網絡/信息/質量」等中國用語；' +
      '只以 JSON 回覆 {"title":"...","summary":"..."}。' +
      '注意：第一步與第二步只能擇一回覆，且只輸出 JSON，不要任何其他文字。';
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
    if (EXCLUDE_KEYWORDS.some((k) => n.title.includes(k))) return false; // 濾掉個案訴訟類
    return withinRecent(n.pubDate) && !publishedKeys.has(n.title);
  }).sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));

  console.log(`🔎 近 ${RECENT_DAYS} 天、未上架過的候選 ${candidates.length} 則，取前 ${MAX_NEWS} 則改寫`);
  const picked = candidates.slice(0, MAX_NEWS);

  const newItems = [];
  for (const n of picked) {
    const s = await summarize(n.title, n.source);
    if (!s) { console.log('  ⚠️ 摘要失敗，略過：' + n.title); continue; }
    if (s.skip) { console.log('  ⏭️  AI 判定個案訴訟，跳過：' + n.title); continue; }
    if (EXCLUDE_KEYWORDS.some((k) => s.title.includes(k))) { console.log('  ⏭️  改寫後判定個案，跳過：' + s.title); continue; }
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
