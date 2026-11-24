// 智財新聞草稿產生器 —— 爬 Google News RSS + Nvidia LLM 改寫，人工核准後才上架
// 用法：
//   node generate-news.js --dry       只爬取+改寫並印出，不寫檔/不推送（測試用）
//   node generate-news.js --no-push    寫入 pending-news.json，但不 git push（本地預覽）
//   node generate-news.js              正式：建立草稿並推送，網站內容不會自動變更
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createNvidiaTextClient } = require('./nvidia-text');

// ===== 密鑰：env 優先，本機回退 config.js =====
let config = {};
try { config = require('./config'); } catch (e) {}
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || config.NVIDIA_API_KEY;
const CF_ZONE_ID     = process.env.CF_ZONE_ID     || config.CF_ZONE_ID;
const CF_API_TOKEN   = process.env.CF_API_TOKEN   || config.CF_API_TOKEN;

const WEBSITE_DIR = path.resolve(__dirname, '..');
const NEWS_HTML = path.join(WEBSITE_DIR, 'news.html');
const PUBLISHED_JSON = path.join(__dirname, 'published-news.json');
const PENDING_JSON = path.join(__dirname, 'pending-news.json');
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
const OFFICIAL_SOURCES = /^(?:經濟部(?:智慧財產局)?|智慧財產局|經濟部智慧財產局（TIPO）|USPTO|EUIPO|EPO|WIPO|JPO|KIPO|CNIPA|(?:www\.)?(?:tipo|moea)\.gov\.tw)$/i;
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

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
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
  const xml = await response.text();
  if (!/<rss\b/i.test(xml)) throw new Error('RSS 回應格式錯誤');
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
function summarize(title, source, complete) {
  const sys =
      '你是台灣智慧財產權事務所的新聞編輯。' +
      '【第一步｜過濾】若這則新聞符合以下任一，請只回覆 {"skip":true}，不要改寫：' +
      '(a) 與專利、商標、著作權、智慧財產權無關；' +
      '(b) 只是報導特定公司的訴訟賠償金額、勝敗或上訴等個案結果，不具通用的警示或教育意義（例如僅講「某公司被判賠X萬、上訴到底」）；' +
      '(c) 屬八卦、醜聞或與智財專業無關的爭執。' +
      '【第二步｜改寫】否則（包括官方公告、法規修正、制度介紹，以及「具教育或警示意義的專利／商標案例」），' +
      '明確涉及申請流程或制度更新（例如專利優先權文件電子交換）應摘要，即使原標題很短。' +
      '請用繁體中文、台灣慣用語改寫成中立、專業的智財新聞摘要：' +
      '1) 一個精簡標題（不超過 30 字，不照抄原標題，不聳動）；' +
      '2) 2-3 句客觀摘要（不超過 120 字）：交代「是誰、發生什麼、對權利人或申請人有何意義或提醒」；' +
      '若屬案例類，聚焦「對企業或權利人的啟示、提醒」，不要聚焦賠償金額或聳動情節；' +
      '避免「旨在／促進發展／展現成果」這類空泛套話；不杜撰未提及的細節；不用「軟件/網絡/信息/質量」等中國用語；' +
      '只以 JSON 回覆 {"title":"...","summary":"..."}。' +
      '注意：兩步驟只能擇一回覆，且只輸出 JSON。';
  const user = `新聞標題：「${title}」\n來源：${source}`;
  return complete([{ role: 'system', content: sys }, { role: 'user', content: user }], {
    temperature: 0.4,
    maxTokens: 800,
    timeoutMs: 40_000,
    label: '新聞摘要',
    validate: parseSummary,
  });
}

function parseSummary(text) {
  let result;
  try {
    result = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
  } catch {
    throw new Error('新聞摘要不是有效的 JSON');
  }
  if (result?.skip === true) return { skip: true };
  if (typeof result?.title !== 'string' || !result.title.trim() || result.title.length > 200 ||
      typeof result.summary !== 'string' || !result.summary.trim() || result.summary.length > 1500) {
    throw new Error('新聞摘要缺少有效的標題或摘要');
  }
  return { title: result.title.trim(), summary: result.summary.trim() };
}

async function summarizeCandidates(candidates, complete, limit = candidates.length) {
  const items = [];
  const failures = [];
  for (const candidate of candidates) {
    let summary;
    try {
      summary = await summarize(candidate.title, candidate.source, complete);
    } catch (error) {
      failures.push(error.message);
      console.warn(`新聞摘要失敗：${candidate.title}（${error.message}）`);
      continue;
    }
    if (summary.skip) {
      console.log('依編輯規則略過：' + candidate.title);
      continue;
    }
    items.push({ ...candidate, displayTitle: summary.title, summary: summary.summary, origTitle: candidate.title });
    if (items.length === limit) break;
  }
  if (failures.length && !items.length) {
    throw new Error(`本次未能產生待審新聞，${failures.length} 則摘要發生錯誤：${[...new Set(failures)].join('；')}`);
  }
  return items;
}

function withinRecent(pubDate) {
  const t = Date.parse(pubDate);
  return !isNaN(t) && (Date.now() - t) <= RECENT_DAYS * 86400 * 1000;
}

function shortlistCandidates(candidates, limit) {
  const isOfficial = (candidate) => Number(OFFICIAL_SOURCES.test((candidate.source || '').trim()));
  return [...candidates].sort((a, b) => (
    isOfficial(b) - isOfficial(a) || Date.parse(b.pubDate) - Date.parse(a.pubDate)
  )).slice(0, limit);
}

function loadPublished() {
  try { return JSON.parse(fs.readFileSync(PUBLISHED_JSON, 'utf8')); } catch (e) { return []; }
}
function loadPending() {
  try { return JSON.parse(fs.readFileSync(PENDING_JSON, 'utf8')); } catch (e) { return []; }
}
function normalizeTitle(title) {
  return String(title || '')
    .replace(/\s*[-｜|]\s*[^-｜|]{2,30}$/u, '')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .toLowerCase();
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
function validateNewsHtml(html) {
  const startMarker = '<div class="news-list" data-source="ai-agent">';
  const endMarker = '<!-- END_AI_AGENT_INSERT_POINT -->';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);

  if (start < 0 || end < 0) {
    throw new Error('智財新聞區塊標記不完整，停止寫入 news.html');
  }

  const section = html.slice(start, end);
  if (/tokens truncated/i.test(section)) {
    throw new Error('智財新聞區塊含有內容截斷標記，停止寫入 news.html');
  }

  const openArticles = (section.match(/<article\b/gi) || []).length;
  const closeArticles = (section.match(/<\/article>/gi) || []).length;
  const openDivs = (section.match(/<div\b/gi) || []).length;
  const closeDivs = (section.match(/<\/div>/gi) || []).length;

  if (openArticles !== closeArticles || openDivs !== closeDivs) {
    throw new Error(
      `智財新聞 HTML 結構不完整（article ${openArticles}/${closeArticles}、div ${openDivs}/${closeDivs}），停止寫入 news.html`
    );
  }
}

function upsertNews(cardsHtml) {
  let html = fs.readFileSync(NEWS_HTML, 'utf8');
  validateNewsHtml(html);
  const marker = '<div class="news-list" data-source="ai-agent">';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error('找不到智財新聞插入點 marker');
  const pos = idx + marker.length;
  html = html.slice(0, pos) + cardsHtml + html.slice(pos);
  validateNewsHtml(html);
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

async function main() {
  if (!NVIDIA_API_KEY) throw new Error('缺少 NVIDIA_API_KEY');
  console.log('📡 抓取智財新聞（Google News RSS）...');
  let all = [];
  let successfulQueries = 0;
  for (const q of QUERIES) {
    try {
      all = all.concat(await fetchRSS(q));
      successfulQueries++;
    } catch (error) {
      console.warn(`RSS 查詢失敗：${q}（${error.message}）`);
    }
  }
  if (!successfulQueries) throw new Error('所有新聞 RSS 查詢都失敗');
  const published = loadPublished();
  const pending = loadPending();
  const knownTitles = new Set([...published, ...pending].map(p => normalizeTitle(p.origTitle || p.displayTitle)));
  const knownLinks = new Set([...published, ...pending].map(p => p.link).filter(Boolean));

  // 去重（標題）→ 篩近期 → 排除已上架過
  const seen = new Set();
  const candidates = all.filter((n) => {
    if (!n.title || seen.has(n.title)) return false;
    seen.add(n.title);
    const st = (n.source || '') + ' ' + (n.title || '');
    if (SOURCE_BLOCKLIST.some((k) => st.includes(k))) return false;      // 濾掉同業事務所來源
    return withinRecent(n.pubDate) && !knownTitles.has(normalizeTitle(n.title)) && !knownLinks.has(n.link);
  });

  const shortlisted = shortlistCandidates(candidates, MAX_NEWS * 2);
  console.log(`🔎 近 ${RECENT_DAYS} 天、未上架過的候選 ${candidates.length} 則，檢查前 ${shortlisted.length} 則，最多產生 ${MAX_NEWS} 則草稿`);
  const newItems = await summarizeCandidates(shortlisted, createNvidiaTextClient(NVIDIA_API_KEY), MAX_NEWS);

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

  if (process.argv.includes('--draft')) {
    const draftFile = process.env.REVIEW_DRAFT_FILE;
    if (!draftFile) throw new Error('缺少 REVIEW_DRAFT_FILE');
    const reviewDrafts = newItems.map((n) => ({
      type: 'news',
      content: {
        title: n.displayTitle, summary: n.summary, source: n.source,
        link: n.link, date: n.pubDate, origTitle: n.origTitle,
      },
    })).concat(pending.map((n) => ({
      type: 'news',
      content: { title: n.displayTitle, summary: n.summary, source: n.source, link: n.link, date: n.date, origTitle: n.origTitle },
    })));
    fs.writeFileSync(draftFile, JSON.stringify(reviewDrafts), 'utf8');
    console.log(`已準備 ${reviewDrafts.length} 則待審新聞，尚未發布`);
    writeOutput(reviewDrafts.length, reviewDrafts.map((n) => n.content.title).join('、'));
    return;
  }

  if (newItems.length === 0) {
    console.log('✅ 本次沒有新的新聞可上架（可能都已上架過）。');
    writeOutput(0, '');
    return;
  }

  // 只建立待審草稿；必須以 manage-news.js approve 核准才會出現在網站
  const drafts = newItems.map((n) => ({
    origTitle: n.origTitle, displayTitle: n.displayTitle, source: n.source,
    summary: n.summary, date: n.pubDate, link: n.link, draftedAt: new Date().toISOString(),
  })).concat(pending).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  fs.writeFileSync(PENDING_JSON, JSON.stringify(drafts, null, 2), 'utf8');
  console.log(`📝 已建立 ${newItems.length} 則待審草稿，尚未上架`);

  writeOutput(newItems.length, newItems.map((n) => '・' + n.displayTitle + '（資料來源：' + prettySource(n.source) + '）').join('\n'));

  if (NO_PUSH) { console.log('[--no-push] 已寫入 pending-news.json，未推送。'); return; }

  // 推送 + 清快取
  try {
    execSync(`git -C "${WEBSITE_DIR}" add scripts/pending-news.json`, { stdio: 'inherit' });
    execSync(`git -C "${WEBSITE_DIR}" commit -m "draft: 智財新聞待審 (${newItems.length} 則)"`, { stdio: 'inherit' });
    execSync(`git -C "${WEBSITE_DIR}" push origin master`, { stdio: 'inherit' });
    console.log('📤 待審草稿已推送到 GitHub（網站未變更）');
  } catch (e) { console.log('⚠️ Git 推送失敗：' + e.message); }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { shortlistCandidates, summarizeCandidates };
