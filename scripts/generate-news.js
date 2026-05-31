// 智財新聞半自動更新 —— 爬 Google News RSS + Nvidia LLM 改寫中立摘要
// 用法：
//   node generate-news.js --dry   只爬取+改寫並印出，不上架/不推送/不寄信（測試用）
//   node generate-news.js         正式：上架到 news.html + email 通知 + push（之後接）
const https = require('https');
const fs = require('fs');
const path = require('path');

// ===== 密鑰：env 優先，本機回退 config.js =====
let config = {};
try { config = require('./config'); } catch (e) {}
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || config.NVIDIA_API_KEY;
if (!NVIDIA_API_KEY) { console.error('❌ 缺少 NVIDIA_API_KEY'); process.exit(1); }

const WEBSITE_DIR = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

// 多組查詢，涵蓋商標 / 專利 / 著作權 / 官方公告
const QUERIES = [
  '智慧財產局 商標 公告',
  '專利 法規 台灣 智慧財產',
  '著作權 修法 台灣',
  '智慧財產權 侵權 判決 台灣',
];
const MAX_NEWS = 2;        // 每次最多上架幾則
const RECENT_DAYS = 150;   // 只取近 N 天的新聞

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
      '你是台灣智慧財產權事務所的新聞編輯。請用繁體中文、台灣慣用語，' +
      '把提供的新聞標題改寫成一則中立、專業的智財新聞摘要。要求：' +
      '1) 一個精簡標題（不超過 30 字，不照抄原標題，不聳動）；' +
      '2) 2-3 句客觀摘要（不超過 120 字）：具體交代「是誰、做了什麼事、對權利人或申請人有何意義或提醒」，' +
      '避免「旨在」「促進發展」「展現成果」這類空泛套話；不杜撰原標題未提及的細節；' +
      '不用「軟件/網絡/信息/質量」等中國用語；' +
      '3) 嚴格只以 JSON 回覆 {"title":"...","summary":"..."}，不要任何其他文字。';
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

(async () => {
  console.log('📡 抓取智財新聞（Google News RSS）...');
  let all = [];
  for (const q of QUERIES) {
    try { all = all.concat(await fetchRSS(q)); }
    catch (e) { console.log('  查詢失敗：' + q); }
  }
  // 去重（標題）→ 篩近期 → 新到舊排序
  const seen = new Set();
  const candidates = all.filter((n) => {
    if (!n.title || seen.has(n.title)) return false;
    seen.add(n.title);
    return withinRecent(n.pubDate);
  }).sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));

  console.log(`🔎 近 ${RECENT_DAYS} 天候選 ${candidates.length} 則，取前 ${MAX_NEWS} 則改寫：\n`);
  const picked = candidates.slice(0, MAX_NEWS);

  for (const n of picked) {
    const s = await summarize(n.title, n.source);
    console.log('════════════════════════════════════════');
    console.log('【原始新聞】' + n.title + '  (' + n.source + ', ' + n.pubDate + ')');
    console.log('────────── 上網站後的呈現 ──────────');
    if (s) {
      console.log('標題：' + s.title);
      console.log('摘要：' + s.summary);
      console.log('資料來源：' + (n.source || '網路新聞') + '（點標題可前往原文）');
    } else {
      console.log('⚠️ 摘要失敗，此則會略過');
    }
    console.log('原文連結：' + n.link);
    console.log('');
  }
  if (DRY) console.log('[dry-run] 未寫入網站、未推送、未寄信。');
})();
