'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  articleItemId, newsItemId, githubArticleFiles, parseNews, parseArticles, joinReport,
  renderHtml, toCsv, percent,
} = require('./traffic-report-core');
const { taipeiDay, fetchCloudflare } = require('./traffic-report');

test('news inventory includes linked and unlinked items but skips placeholders', () => {
  const html = `<section data-news-section="ip"><article class="news-item"><div class="news-date">15 OCT</div><h3><a href="/source">智慧局公告</a></h3></article></section>
    <section data-news-section="speaking"><article class="news-item"><h3>演講活動專區建置中</h3></article></section>
    <section data-news-section="firm"><article class="news-item"><h3>事務所消息</h3></article></section>`;
  const rows = parseNews(html, '繁中', 'https://ysipo.com.tw/news.html');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, newsItemId('https://ysipo.com.tw/source', '智慧局公告'));
  assert.equal(rows[0].date, '15 OCT');
  assert.equal(rows[1].url, '');
});

test('article inventory normalizes English variants to one list item', () => {
  const rows = parseArticles([{
    filename: 'article-2026-10-15-123.html',
    filenameEn: 'article-2026-10-15-123-en.html',
    title: '測試文章', date: '2026-10-15', category: '專利',
  }], 'missing-directory');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, articleItemId('article-2026-10-15-123-en.html'));
});

test('public repository tree finds unindexed articles and legacy English pages', () => {
  const files = githubArticleFiles({ truncated: false, tree: [
    { type: 'blob', path: 'insights/article-1.html' },
    { type: 'blob', path: 'en/insights/article-1.html' },
    { type: 'blob', path: 'insights/article-2026-05-15-123.html' },
    { type: 'blob', path: 'insights/article-template.html' },
    { type: 'blob', path: 'insights/article-2026-06-01-456-en.html' },
  ] });
  assert.equal(files.length, 2);
  const legacy = files.find((item) => item.filename === 'article-1.html');
  assert.equal(legacy.legacyEnPath, '/en/insights/article-1.html');
  const [article] = parseArticles([{ ...legacy, title: '舊文章' }], 'missing-directory');
  const report = joinReport({ articles: [article], news: [] }, {
    gaPages: new Map([['/insights/article-1.html', 4], ['/en/insights/article-1.html', 3]]),
    cfPages: new Map(), items: new Map(), search: new Map(),
  }, { gaViews: 'ok', gaItems: 'missing', search: 'missing', cloudflare: 'missing' });
  assert.equal(report.articles[0].gaViews, 7);
  assert.throws(() => githubArticleFiles({ truncated: true, tree: [] }), /不完整/);
});

test('report joins distinct GA4, Cloudflare and Search Console measures', () => {
  const article = {
    id: articleItemId('article-2026-10-15-123.html'),
    filename: 'article-2026-10-15-123.html',
    filenameEn: 'article-2026-10-15-123-en.html',
    title: '測試文章', date: '2026-10-15', category: '專利',
  };
  const news = { id: newsItemId('https://example.com/story', '最新新聞'), title: '最新新聞', url: 'https://example.com/story', date: '', language: '繁中' };
  const report = joinReport({ articles: [article], news: [news] }, {
    gaPages: new Map([['/insights/article-2026-10-15-123.html', 9], ['/insights/article-2026-10-15-123-en.html', 3], ['/news.html', 20]]),
    cfPages: new Map([['/insights/article-2026-10-15-123.html', 15], ['/news.html', 31]]),
    items: new Map([[article.id, { views: 10, clicks: 2 }], [news.id, { views: 5, clicks: 1 }]]),
    search: new Map([['/insights/article-2026-10-15-123.html', { clicks: 3, impressions: 40 }], ['/insights/article-2026-10-15-123-en.html', { clicks: 1, impressions: 10 }]]),
  }, { gaViews: 'ok', gaItems: 'ok', search: 'ok', cloudflare: 'ok' });
  assert.equal(report.articles[0].gaViews, 12);
  assert.equal(report.articles[0].cfViews, 15);
  assert.equal(report.articles[0].searchClicks, 4);
  assert.equal(report.articles[0].searchImpressions, 50);
  assert.equal(percent(report.articles[0].searchClicks, report.articles[0].searchImpressions), '8.0%');
  assert.equal(report.news[0].listClicks, 1);
  assert.equal(report.newsGaViews, 20);
  assert.equal(report.newsCfViews, 31);
});

test('unavailable source is not rendered as zero and HTML is escaped', () => {
  const report = joinReport({ articles: [{ id: articleItemId('article-1.html'), filename: 'article-1.html', title: '<bad>', date: '', category: '' }], news: [] }, {
    gaPages: new Map(), cfPages: new Map(), items: new Map(), search: new Map(),
  }, { gaViews: 'missing', gaItems: 'missing', search: 'missing', cloudflare: 'missing' });
  assert.equal(report.articles[0].gaViews, null);
  assert.equal(percent(null, null), '—');
  const html = renderHtml(report, { start: '2026-10-01', end: '2026-10-15', generatedAt: '2026-10-15 12:00' }, { gaViews: 'missing', gaItems: 'missing', search: 'missing', cloudflare: 'missing' }, []);
  assert.match(html, /&lt;bad&gt;/);
  assert.doesNotMatch(html, /<bad>/);
});

test('CSV encodes quotes and spreadsheet formulas', () => {
  const csv = toCsv(['title'], [['=2+2'], ['He said "yes"']]);
  assert.match(csv, /"'=2\+2"/);
  assert.match(csv, /"He said ""yes"""/);
});

test('Taipei date boundary and Cloudflare daily path aggregation', async () => {
  assert.equal(taipeiDay(new Date('2026-10-15T16:30:00Z')), '2026-10-16');
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    assert.match(options.body, /rumPageloadEventsAdaptiveGroups/);
    return {
      ok: true,
      json: async () => ({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [
        { count: 7, dimensions: { requestPath: '/insights/article-1.html' } },
        { count: 2, dimensions: { requestPath: '/insights/article-1.html?utm_source=ig' } },
      ] }] } } }),
    };
  };
  try {
    const rows = await fetchCloudflare({ cloudflareAccountId: 'a'.repeat(32), cloudflareAnalyticsToken: 'test' }, { start: '2026-10-15', end: '2026-10-15' });
    assert.equal(rows.get('/insights/article-1.html'), 9);
  } finally { global.fetch = originalFetch; }
});
