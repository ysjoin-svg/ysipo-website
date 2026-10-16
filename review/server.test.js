const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysipo-review-test-'));
process.env.NODE_ENV = 'test';
process.env.REVIEW_DATA_DIR = dataDir;
process.env.REVIEW_INGEST_KEY = 'test-ingest-key';
let server;
let readDraft;
const authState = { allowed: true, unavailable: false };
const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
const authServer = http.createServer(async (req, res) => {
  if (authState.unavailable) { res.writeHead(503); return res.end(); }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    const parts = [];
    for await (const part of req) parts.push(part);
    const credentials = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (credentials.username !== '10001' || credentials.password !== 'correct-password') {
      res.writeHead(401);
      return res.end('{}');
    }
    return res.end(JSON.stringify({ token }));
  }
  if (req.url === '/api/auth/content-analytics-access' && req.headers.authorization === `Bearer ${token}`) {
    res.writeHead(authState.allowed ? 200 : 403);
    return res.end(JSON.stringify({ allowed: authState.allowed }));
  }
  res.writeHead(404);
  res.end('{}');
});

before(async () => {
  await new Promise((resolve) => authServer.listen(0, '127.0.0.1', resolve));
  process.env.IPMGR_AUTH_BASE_URL = `http://127.0.0.1:${authServer.address().port}`;
  ({ server, readDraft } = require('./server'));
});

after(() => {
  server.close();
  authServer.close();
  assert.equal(path.dirname(path.resolve(dataDir)), path.resolve(os.tmpdir()));
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('review requires mailbox code, edits are saved, approval is single-use', async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}`;
  const content = { title: '測試新聞', summary: '原稿內容', link: 'https://example.com/news', source: 'example.com', date: new Date().toUTCString() };
  let response = await fetch(`${root}/api/drafts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'news', content }) });
  assert.equal(response.status, 401);
  response = await fetch(`${root}/api/drafts`, { method: 'POST', headers: { Authorization: 'Bearer test-ingest-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'news', content }) });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.notEqual(created.links['taiejoin@hotmail.com'], created.links['fish801113@gmail.com']);
  const id = created.id;
  response = await fetch(`${root}/review/${id}`);
  assert.equal(response.status, 403);
  const link = new URL(created.links['fish801113@gmail.com']);
  const token = link.searchParams.get('token');
  response = await fetch(`${root}/review/${id}/code`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) });
  assert.equal(response.status, 200);
  const codeFile = fs.readdirSync(dataDir).find((name) => name.endsWith('.code'));
  assert.ok(codeFile);
  response = await fetch(`${root}/api/codes/${codeFile.slice(0, 32)}`, { method: 'POST', headers: { Authorization: 'Bearer test-ingest-key' } });
  assert.equal((await response.json()).code, '12345678');
  response = await fetch(`${root}/api/codes/${codeFile.slice(0, 32)}`, { method: 'POST', headers: { Authorization: 'Bearer test-ingest-key' } });
  assert.equal(response.status, 404);
  response = await fetch(`${root}/review/${id}/verify`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, code: '12345678' }) });
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  response = await fetch(`${root}/review/${id}`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  const csrf = (await response.text()).match(/name="csrf" value="([^"]+)"/)[1];
  response = await fetch(`${root}/review/${id}/save`, { method: 'POST', redirect: 'manual', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf, title: '已修改標題', summary: '已修改摘要' }) });
  assert.equal(response.status, 303);
  assert.equal(readDraft(id).content.title, '已修改標題');
  response = await fetch(`${root}/review/${id}/publish`, { method: 'POST', redirect: 'manual', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf }) });
  assert.equal(response.status, 303);
  assert.equal(readDraft(id).status, 'publishing');
  response = await fetch(`${root}/review/${id}/publish`, { method: 'POST', redirect: 'manual', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf }) });
  assert.equal(response.status, 409);
  response = await fetch(`${root}/api/drafts/${id}`, { headers: { Authorization: 'Bearer test-ingest-key' } });
  assert.equal((await response.json()).content.summary, '已修改摘要');
  response = await fetch(`${root}/api/drafts/${id}/result`, { method: 'POST', headers: { Authorization: 'Bearer test-ingest-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'success', url: 'https://ysipo.com.tw/news.html' }) });
  assert.equal(response.status, 200);
  assert.equal(readDraft(id).status, 'published');
  response = await fetch(`${root}/api/drafts`, { method: 'POST', headers: { Authorization: 'Bearer test-ingest-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'news', content }) });
  assert.deepEqual(await response.json(), { duplicate: true });

  const article = { titleZh: '待審文章', titleEn: 'Article', bodyZh: '正文', bodyEn: 'Body', category: '商標', imageBase64: 'eA==', imageWidth: 1280, imageHeight: 720 };
  const submit = () => fetch(`${root}/api/drafts`, { method: 'POST', headers: { Authorization: 'Bearer test-ingest-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'article', content: article }) });
  const articleResponse = await submit();
  const articleId = (await articleResponse.json()).id;
  assert.equal((await (await submit()).json()).duplicate, true);
  response = await fetch(`${root}/api/drafts/${articleId}/cancel`, { method: 'POST', headers: { Authorization: 'Bearer test-ingest-key' } });
  assert.equal(response.status, 200);
  assert.equal(readDraft(articleId).status, 'cancelled');
  assert.equal((await submit()).status, 201);
});

test('traffic report requires case system credentials and current permission for every download', async () => {
  const root = `http://127.0.0.1:${server.address().port}`;
  let response = await fetch(`${root}/traffic/report`, { redirect: 'manual' });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/traffic');
  response = await fetch(`${root}/traffic/report?download=articles`, { redirect: 'manual' });
  assert.equal(response.status, 303);

  response = await fetch(`${root}/traffic/code`, { method: 'POST', body: new URLSearchParams({ email: 'fish801113@gmail.com' }) });
  assert.equal(response.status, 404);
  response = await fetch(`${root}/traffic/login`, { method: 'POST', body: new URLSearchParams({ username: '10001', password: 'wrong' }) });
  assert.equal(response.status, 401);
  authState.allowed = false;
  response = await fetch(`${root}/traffic/login`, { method: 'POST', body: new URLSearchParams({ username: '10001', password: 'correct-password' }) });
  assert.equal(response.status, 403);
  authState.allowed = true;
  response = await fetch(`${root}/traffic/login`, { method: 'POST', redirect: 'manual', body: new URLSearchParams({ username: '10001', password: 'correct-password' }) });
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie').split(';')[0];

  const traffic = require('../scripts/traffic-report');
  const original = traffic.buildReport;
  traffic.buildReport = async () => ({
    report: { articles: [], news: [], newsGaViews: null, newsCfViews: null },
    dates: { start: '2026-10-01', end: '2026-10-15', generatedAt: '2026-10-15 12:00' },
    status: { gaViews: 'missing', gaItems: 'missing', search: 'missing', cloudflare: 'missing' },
    issues: ['尚未設定唯讀憑證'],
  });
  try {
    response = await fetch(`${root}/traffic/report?days=7`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /尚未設定唯讀憑證/);
    assert.match(html, /script nonce=/);
    assert.match(html, /download=articles/);
    response = await fetch(`${root}/traffic/report?days=7&download=articles`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/csv/);
    response = await fetch(`${root}/traffic/report?days=0`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 400);
    authState.allowed = false;
    response = await fetch(`${root}/traffic/report?days=7&download=news`, { redirect: 'manual', headers: { Cookie: cookie } });
    assert.equal(response.status, 303);
    authState.allowed = true;
    authState.unavailable = true;
    response = await fetch(`${root}/traffic/report`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 503);
    authState.unavailable = false;
    response = await fetch(`${root}/traffic/logout`, { method: 'POST', redirect: 'manual', headers: { Cookie: cookie } });
    assert.equal(response.status, 303);
    response = await fetch(`${root}/traffic/report`, { redirect: 'manual', headers: { Cookie: cookie } });
    assert.equal(response.status, 303);
  } finally {
    traffic.buildReport = original;
  }
});
