'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { GoogleAuth } = require('google-auth-library');
const {
  SITE, parseNews, parseArticles, pathFromUrl, joinReport,
  renderHtml, toCsv, percent,
} = require('./traffic-report-core');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'reports');

function config() {
  const file = path.join(__dirname, 'traffic-config.js');
  const local = fs.existsSync(file) ? require(file) : {};
  return {
    ga4PropertyId: process.env.TRAFFIC_GA4_PROPERTY_ID || local.ga4PropertyId || '',
    googleCredentialsFile: process.env.TRAFFIC_GOOGLE_CREDENTIALS || local.googleCredentialsFile || 'scripts/traffic-service-account.json',
    searchConsoleProperty: process.env.TRAFFIC_SEARCH_CONSOLE_PROPERTY || local.searchConsoleProperty || 'sc-domain:ysipo.com.tw',
    cloudflareAccountId: process.env.TRAFFIC_CF_ACCOUNT_ID || local.cloudflareAccountId || '',
    cloudflareAnalyticsToken: process.env.TRAFFIC_CF_ANALYTICS_TOKEN || local.cloudflareAnalyticsToken || '',
  };
}

function taipeiDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateRange(days) {
  const end = taipeiDay();
  const startDate = new Date(`${end}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  return { start: startDate.toISOString().slice(0, 10), end };
}

async function liveText(relativePath) {
  const url = new URL(relativePath, SITE);
  url.searchParams.set('_report', String(Date.now()));
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function liveOrLocal(relativePath, issues) {
  try { return await liveText(relativePath); }
  catch (error) {
    const local = path.join(ROOT, ...relativePath.split('/'));
    if (!fs.existsSync(local)) throw new Error(`${relativePath} 無法從網站或本機讀取：${error.message}`);
    issues.push(`${relativePath} 暫時無法從官網讀取，改用本機版本；可能不是最新內容。`);
    return fs.readFileSync(local, 'utf8');
  }
}

async function inventory(issues) {
  const [indexText, zhNews, enNews] = await Promise.all([
    liveOrLocal('insights/articles.json', issues),
    liveOrLocal('news.html', issues),
    liveOrLocal('en/news.html', issues),
  ]);
  const index = JSON.parse(indexText);
  if (!Array.isArray(index)) throw new Error('articles.json 格式不是文章清單');
  const articles = parseArticles(index, path.join(ROOT, 'insights'));
  const news = [
    ...parseNews(zhNews, '繁中', `${SITE}/news.html`),
    ...parseNews(enNews, 'English', `${SITE}/en/news.html`),
  ];
  return { articles, news };
}

async function googleClient(settings) {
  const keyFile = path.resolve(ROOT, settings.googleCredentialsFile);
  if (!fs.existsSync(keyFile)) return null;
  const auth = new GoogleAuth({
    keyFile,
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
  });
  return auth.getClient();
}

async function gaReport(client, propertyId, dates, dimensions, metrics, offset = 0) {
  const { data } = await client.request({
    url: `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    method: 'POST',
    data: {
      dateRanges: [{ startDate: dates.start, endDate: dates.end }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      limit: '10000', offset: String(offset),
    },
    timeout: 30000,
  });
  return data;
}

async function gaRows(client, propertyId, dates, dimensions, metrics) {
  const result = [];
  for (let offset = 0; ; offset += 10000) {
    const page = await gaReport(client, propertyId, dates, dimensions, metrics, offset);
    result.push(...(page.rows || []));
    if (result.length >= Number(page.rowCount || 0) || !(page.rows || []).length) break;
  }
  return result;
}

async function fetchGaViews(client, settings, dates) {
  const rows = await gaRows(client, settings.ga4PropertyId, dates, ['pagePath'], ['screenPageViews']);
  const result = new Map();
  for (const row of rows) {
    const page = pathFromUrl(row.dimensionValues[0].value);
    result.set(page, (result.get(page) || 0) + Number(row.metricValues[0].value || 0));
  }
  return result;
}

async function fetchGaItems(client, settings, dates) {
  const rows = await gaRows(client, settings.ga4PropertyId, dates, ['itemId'], ['itemsViewedInList', 'itemsClickedInList']);
  const result = new Map();
  for (const row of rows) {
    const id = row.dimensionValues[0].value;
    result.set(id, {
      views: Number(row.metricValues[0].value || 0),
      clicks: Number(row.metricValues[1].value || 0),
    });
  }
  return result;
}

async function fetchSearch(client, settings, dates) {
  const result = new Map();
  const site = encodeURIComponent(settings.searchConsoleProperty);
  for (let startRow = 0; ; startRow += 25000) {
    const { data } = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate: dates.start, endDate: dates.end,
        dimensions: ['page'], rowLimit: 25000, startRow,
        dataState: 'all',
      },
      timeout: 30000,
    });
    const rows = data.rows || [];
    for (const row of rows) {
      const page = pathFromUrl(row.keys[0]);
      const previous = result.get(page) || { clicks: 0, impressions: 0 };
      previous.clicks += Number(row.clicks || 0);
      previous.impressions += Number(row.impressions || 0);
      result.set(page, previous);
    }
    if (rows.length < 25000) break;
  }
  return result;
}

async function fetchCloudflare(settings, dates) {
  if (!/^[a-f\d]{32}$/i.test(settings.cloudflareAccountId)) throw new Error('Cloudflare Account ID 應為 32 位十六進位字元');
  const result = new Map();
  let cursor = new Date(`${dates.start}T00:00:00+08:00`);
  const end = new Date(new Date(`${dates.end}T00:00:00+08:00`).getTime() + 86400000);
  while (cursor < end) {
    const next = new Date(Math.min(cursor.getTime() + 86400000, end.getTime()));
    const query = `query { viewer { accounts(filter: { accountTag: "${settings.cloudflareAccountId}" }) { rumPageloadEventsAdaptiveGroups(filter: { datetime_geq: "${cursor.toISOString()}", datetime_lt: "${next.toISOString()}", requestHost: "ysipo.com.tw" }, limit: 1000, orderBy: [count_DESC]) { count dimensions { requestPath } } } } }`;
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.cloudflareAnalyticsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30000),
    });
    const payload = await response.json();
    if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.map((error) => error.message).join('; ') || `HTTP ${response.status}`);
    const groups = payload.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
    if (!groups) throw new Error('Cloudflare 未回傳網站流量；請檢查帳號 ID 與 Analytics 唯讀權限');
    if (groups.length >= 1000) throw new Error('單日頁面數超過查詢上限，避免輸出不完整數據');
    for (const group of groups) {
      const page = pathFromUrl(group.dimensions.requestPath);
      result.set(page, (result.get(page) || 0) + Number(group.count || 0));
    }
    cursor = next;
  }
  return result;
}

function writeReport(report, dates, status, issues) {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const generatedAt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei', dateStyle: 'short', timeStyle: 'medium',
  }).format(new Date());
  fs.writeFileSync(path.join(OUTPUT, 'traffic-report.html'), renderHtml(report, { ...dates, generatedAt }, status, issues), 'utf8');
  fs.writeFileSync(path.join(OUTPUT, 'traffic-articles.csv'), toCsv(
    ['文章', '日期', 'GA4瀏覽', 'Cloudflare瀏覽', '列表曝光', '列表點擊', '列表CTR', '搜尋曝光', '搜尋點擊', '搜尋CTR', '網址'],
    report.articles.map((row) => [row.title, row.date, row.gaViews, row.cfViews, row.listViews, row.listClicks, percent(row.listClicks, row.listViews), row.searchImpressions, row.searchClicks, percent(row.searchClicks, row.searchImpressions), row.url]),
  ), 'utf8');
  fs.writeFileSync(path.join(OUTPUT, 'traffic-news.csv'), toCsv(
    ['新聞', '語言', '日期', '卡片曝光', '來源連結點擊', '卡片CTR', '來源網址'],
    report.news.map((row) => [row.title, row.language, row.date, row.listViews, row.listClicks, percent(row.listClicks, row.listViews), row.url]),
  ), 'utf8');
}

async function buildReport(days = 30) {
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('查詢天數須為 1 至 90 的整數');
  const dates = dateRange(days);
  const settings = config();
  const issues = [];
  const content = await inventory(issues);
  const status = { gaViews: 'missing', gaItems: 'missing', search: 'missing', cloudflare: 'missing' };
  const data = { gaPages: new Map(), cfPages: new Map(), items: new Map(), search: new Map() };
  let client;
  try { client = await googleClient(settings); }
  catch (error) { issues.push(`Google 憑證無法使用：${error.message}`); }
  if (!client) issues.push('未設定 Google 服務帳戶憑證；GA4 與 Search Console 指標暫不可查。');

  if (client && /^\d+$/.test(settings.ga4PropertyId)) {
    try { data.gaPages = await fetchGaViews(client, settings, dates); status.gaViews = 'ok'; }
    catch (error) { issues.push(`GA4 瀏覽查詢失敗：${error.message}`); }
    try { data.items = await fetchGaItems(client, settings, dates); status.gaItems = 'ok'; }
    catch (error) { issues.push(`GA4 卡片事件查詢失敗：${error.message}`); }
  } else if (client) issues.push('未設定 GA4 數字資源 ID；G- 開頭的評估 ID 不適用於報表 API。');

  if (client) {
    try { data.search = await fetchSearch(client, settings, dates); status.search = 'ok'; }
    catch (error) { issues.push(`Search Console 查詢失敗：${error.message}`); }
  }

  if (settings.cloudflareAccountId && settings.cloudflareAnalyticsToken) {
    try { data.cfPages = await fetchCloudflare(settings, dates); status.cloudflare = 'ok'; }
    catch (error) { issues.push(`Cloudflare 流量查詢失敗：${error.message}`); }
  } else issues.push('未設定 Cloudflare Analytics 唯讀 token；歷史 Cloudflare 瀏覽量暫不可查。');

  const report = joinReport(content, data, status);
  const generatedAt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei', dateStyle: 'short', timeStyle: 'medium',
  }).format(new Date());
  return { report, dates: { ...dates, generatedAt }, status, issues };
}

async function main() {
  const daysArg = process.argv.find((arg) => arg.startsWith('--days='));
  const days = daysArg ? Number(daysArg.slice(7)) : 30;
  const { report, dates, status, issues } = await buildReport(days);
  writeReport(report, dates, status, issues);
  console.log(`報表已產生：${path.join(OUTPUT, 'traffic-report.html')}`);
  console.log(`文章 ${report.articles.length} 篇、新聞 ${report.news.length} 則；GA4 ${status.gaViews}/${status.gaItems}、搜尋 ${status.search}、Cloudflare ${status.cloudflare}`);
  if (issues.length) issues.forEach((issue) => console.log(`注意：${issue}`));
}

if (require.main === module) main().catch((error) => { console.error(`流量報表失敗：${error.message}`); process.exitCode = 1; });

module.exports = { dateRange, taipeiDay, fetchCloudflare, fetchGaViews, fetchGaItems, fetchSearch, inventory, buildReport };
