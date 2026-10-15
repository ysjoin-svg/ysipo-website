'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const SITE = 'https://ysipo.com.tw';

function hash(value) {
  let result = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

function articleFilename(filename) {
  return path.basename(filename).replace(/-en\.html$/i, '.html');
}

function articleItemId(filename) {
  return `a_${hash(articleFilename(filename))}`;
}

function newsItemId(url, title) {
  return `n_${hash(`${url || `title:${title}`}|${title}`)}`;
}

function articlePaths(article) {
  return [article.filename, article.filenameEn]
    .filter(Boolean)
    .map((filename) => `/insights/${path.basename(filename)}`);
}

function parseNews(html, language, pageUrl) {
  const $ = cheerio.load(html);
  const rows = [];
  $('[data-news-section] .news-item').each((_, element) => {
    const heading = $(element).find('h3').first();
    const title = heading.text().trim().replace(/\s+/g, ' ');
    if (!title || /建置中|Coming Soon/i.test(title)) return;
    const rawUrl = heading.find('a[href]').first().attr('href');
    let url = '';
    if (rawUrl) {
      try {
        const resolved = new URL(rawUrl, pageUrl);
        if (['http:', 'https:'].includes(resolved.protocol)) url = resolved.href;
      } catch { /* Invalid links remain unclickable. */ }
    }
    const date = $(element).find('.news-date').text().trim().replace(/\s+/g, ' ');
    rows.push({ id: newsItemId(url, title), title, date, url, language });
  });
  return rows;
}

function parseArticles(index, insightsDir) {
  const rows = new Map();
  for (const item of index) {
    if (!/^article-[\w-]+\.html$/.test(item.filename || '')) continue;
    const filename = articleFilename(item.filename);
    rows.set(filename, {
      id: articleItemId(filename),
      filename,
      filenameEn: /^article-[\w-]+-en\.html$/.test(item.filenameEn || '') ? item.filenameEn : '',
      title: item.title || filename,
      date: item.date || '',
      category: item.category || '',
    });
  }

  if (fs.existsSync(insightsDir)) {
    for (const filename of fs.readdirSync(insightsDir)) {
      if (!/^article-[\w-]+\.html$/.test(filename) || filename.endsWith('-en.html') || filename === 'article-template.html' || rows.has(filename)) continue;
      const $ = cheerio.load(fs.readFileSync(path.join(insightsDir, filename), 'utf8'));
      const title = $('h1').first().text().trim() || $('title').first().text().split('|')[0].trim() || filename;
      const date = filename.match(/^article-(\d{4}-\d{2}-\d{2})-/)?.[1] || '';
      const filenameEn = filename.replace(/\.html$/, '-en.html');
      rows.set(filename, {
        id: articleItemId(filename), filename,
        filenameEn: fs.existsSync(path.join(insightsDir, filenameEn)) ? filenameEn : '',
        title, date, category: '',
      });
    }
  }
  return [...rows.values()].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

function pathFromUrl(value) {
  try { return new URL(value, SITE).pathname; } catch { return ''; }
}

function metricSum(paths, values) {
  return paths.reduce((sum, item) => sum + (Number(values.get(item)) || 0), 0);
}

function joinReport(inventory, data, status) {
  const articles = inventory.articles.map((item) => {
    const paths = articlePaths(item);
    const list = data.items.get(item.id) || {};
    const google = paths.reduce((result, page) => {
      const row = data.search.get(page) || {};
      result.clicks += Number(row.clicks) || 0;
      result.impressions += Number(row.impressions) || 0;
      return result;
    }, { clicks: 0, impressions: 0 });
    return {
      ...item,
      url: `${SITE}/insights/${item.filename}`,
      gaViews: status.gaViews === 'ok' ? metricSum(paths, data.gaPages) : null,
      cfViews: status.cloudflare === 'ok' ? metricSum(paths, data.cfPages) : null,
      listViews: status.gaItems === 'ok' ? Number(list.views) || 0 : null,
      listClicks: status.gaItems === 'ok' ? Number(list.clicks) || 0 : null,
      searchImpressions: status.search === 'ok' ? google.impressions : null,
      searchClicks: status.search === 'ok' ? google.clicks : null,
    };
  });
  const news = inventory.news.map((item) => {
    const list = data.items.get(item.id) || {};
    return {
      ...item,
      listViews: status.gaItems === 'ok' ? Number(list.views) || 0 : null,
      listClicks: status.gaItems === 'ok' && item.url ? Number(list.clicks) || 0 : null,
    };
  });
  return {
    articles,
    news,
    newsGaViews: status.gaViews === 'ok' ? metricSum(['/news.html', '/en/news.html'], data.gaPages) : null,
    newsCfViews: status.cloudflare === 'ok' ? metricSum(['/news.html', '/en/news.html'], data.cfPages) : null,
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function number(value) {
  return value == null ? '—' : Number(value).toLocaleString('zh-TW');
}

function percent(clicks, views) {
  return clicks == null || views == null || views === 0 ? '—' : `${(clicks / views * 100).toFixed(1)}%`;
}

function safeLink(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function renderHtml(report, dates, status, issues) {
  const articleRows = report.articles.map((row) => `<tr><td><a href="${escapeHtml(row.url)}" target="_blank" rel="noopener">${escapeHtml(row.title)}</a><small>${escapeHtml(row.category)}</small></td><td>${escapeHtml(row.date)}</td><td>${number(row.gaViews)}</td><td>${number(row.cfViews)}</td><td>${number(row.listViews)}</td><td>${number(row.listClicks)}</td><td>${percent(row.listClicks, row.listViews)}</td><td>${number(row.searchImpressions)}</td><td>${number(row.searchClicks)}</td><td>${percent(row.searchClicks, row.searchImpressions)}</td></tr>`).join('');
  const newsRows = report.news.map((row) => `<tr><td>${row.url ? `<a href="${escapeHtml(safeLink(row.url))}" target="_blank" rel="noopener">${escapeHtml(row.title)}</a>` : escapeHtml(row.title)}<small>${escapeHtml(row.language)}</small></td><td>${escapeHtml(row.date)}</td><td>${number(row.listViews)}</td><td>${number(row.listClicks)}</td><td>${percent(row.listClicks, row.listViews)}</td></tr>`).join('');
  const sources = [
    ['GA4 瀏覽', status.gaViews], ['GA4 列表事件', status.gaItems],
    ['Search Console', status.search], ['Cloudflare', status.cloudflare],
  ].map(([name, state]) => `<span class="source ${state === 'ok' ? 'ok' : 'muted'}">${escapeHtml(name)}：${state === 'ok' ? '已連線' : '未連線'}</span>`).join('');
  const notices = issues.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>永旭內容成效報表</title>
<style>
:root{font-family:system-ui,"Microsoft JhengHei",sans-serif;color:#17272a;background:#f5f7f6}*{box-sizing:border-box}body{margin:0}header{background:#fff;border-bottom:1px solid #dce3e0;padding:22px max(20px,4vw)}h1{font-size:24px;margin:0 0 6px}header p{margin:0;color:#5f6e6b}main{padding:20px max(20px,4vw) 50px}.sources{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}.source{font-size:13px;border:1px solid #a5cbc0;color:#17624f;background:#e9f5ef;padding:5px 9px;border-radius:4px}.source.muted{border-color:#d7dedd;color:#687674;background:#fff}.summary{display:flex;gap:32px;flex-wrap:wrap;border-bottom:1px solid #dce3e0;padding-bottom:18px}.summary div{min-width:120px}.summary strong{font-size:24px;display:block}.summary span{font-size:13px;color:#63716e}.notice{background:#fff;border-left:3px solid #d1a953;padding:10px 16px;margin:20px 0}.notice ul{margin:5px 0;padding-left:22px}nav{display:flex;gap:14px;margin:24px 0 12px;border-bottom:1px solid #dce3e0}nav button{background:none;border:0;border-bottom:3px solid transparent;padding:8px 2px;font:inherit;cursor:pointer}nav button.active{border-color:#247e67;font-weight:700}.toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0 0 10px}.toolbar input{font:inherit;padding:8px;border:1px solid #b9c8c3;border-radius:4px;max-width:300px;width:100%}.toolbar a{white-space:nowrap;color:#17624f}.table-wrap{overflow:auto;background:#fff;border:1px solid #dce3e0}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #e8edeb;white-space:nowrap}th{background:#ecf1ee;position:sticky;top:0}td:first-child{white-space:normal;min-width:250px}td small{display:block;color:#71807c;margin-top:3px}a{color:#17624f}tbody tr:hover{background:#f5faf8}[hidden]{display:none!important}.footnote{font-size:13px;color:#5f6e6b;line-height:1.6;margin-top:16px}
</style></head><body><header><h1>內容成效</h1><p>${escapeHtml(dates.start)} 至 ${escapeHtml(dates.end)}｜產生於 ${escapeHtml(dates.generatedAt)}（台北時間）</p></header><main>
<div class="sources">${sources}</div><div class="summary"><div><strong>${number(report.articles.length)}</strong><span>文章</span></div><div><strong>${number(report.news.length)}</strong><span>新聞卡片（含英文）</span></div><div><strong>${number(report.newsGaViews)}</strong><span>新聞頁 GA4 瀏覽</span></div><div><strong>${number(report.newsCfViews)}</strong><span>新聞頁 Cloudflare 瀏覽</span></div></div>
${notices ? `<div class="notice"><strong>資料狀態</strong><ul>${notices}</ul></div>` : ''}
<nav><button class="active" data-tab="articles">文章</button><button data-tab="news">新聞</button></nav>
<section id="articles"><div class="toolbar"><input type="search" placeholder="搜尋文章" aria-label="搜尋文章"><a href="traffic-articles.csv" download>下載 CSV</a></div><div class="table-wrap"><table><thead><tr><th>文章</th><th>日期</th><th>GA4 瀏覽</th><th>Cloudflare 瀏覽</th><th>列表曝光</th><th>列表點擊</th><th>列表 CTR</th><th>搜尋曝光</th><th>搜尋點擊</th><th>搜尋 CTR</th></tr></thead><tbody>${articleRows}</tbody></table></div><p class="footnote">文章瀏覽含中英文頁；列表 CTR 是本站文章列表的點擊 ÷ 可見曝光，搜尋 CTR 是 Google 搜尋結果的點擊 ÷ 曝光。兩者不可混用。</p></section>
<section id="news" hidden><div class="toolbar"><input type="search" placeholder="搜尋新聞" aria-label="搜尋新聞"><a href="traffic-news.csv" download>下載 CSV</a></div><div class="table-wrap"><table><thead><tr><th>新聞</th><th>日期</th><th>卡片曝光</th><th>來源連結點擊</th><th>卡片 CTR</th></tr></thead><tbody>${newsRows}</tbody></table></div><p class="footnote">新聞共用 news.html，沒有逐則文章頁。上方的新聞頁瀏覽量不可分攤到每則；逐則成效以卡片曝光與來源連結點擊衡量。未設來源連結的新聞沒有可計算的點擊率。</p></section>
<p class="footnote">列表事件及新補上的文章 GA4 瀏覽，僅自追蹤程式上線後開始累積，無法回補歷史數據。Cloudflare 與 GA4 的口徑不同。</p></main>
<script>document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!==b.dataset.tab)}));document.querySelectorAll('.toolbar input').forEach(i=>i.addEventListener('input',()=>{i.closest('section').querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(i.value.toLowerCase()))}));</script></body></html>`;
}

module.exports = { SITE, hash, articleItemId, newsItemId, parseNews, parseArticles, pathFromUrl, joinReport, renderHtml, toCsv, percent };
