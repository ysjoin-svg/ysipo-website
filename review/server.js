const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.REVIEW_PORT || 4310);
const DATA_DIR = process.env.REVIEW_DATA_DIR || path.join(__dirname, 'data');
const BASE_URL = process.env.REVIEW_BASE_URL || 'https://review.ysipo.com.tw';
const INGEST_KEY = process.env.REVIEW_INGEST_KEY;
const TOKEN_FILE = process.env.REVIEW_GITHUB_TOKEN_FILE;
const REVIEWERS = ['taiejoin@hotmail.com', 'fish801113@gmail.com'];
const sessions = new Map();

if (!INGEST_KEY || (!TOKEN_FILE && process.env.NODE_ENV !== 'test')) {
  throw new Error('REVIEW_INGEST_KEY and REVIEW_GITHUB_TOKEN_FILE are required');
}
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

const random = () => crypto.randomBytes(24).toString('base64url');
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fileFor = (id) => path.join(DATA_DIR, `${id}.json`);
const validId = (id) => /^[a-f0-9]{32}$/.test(id);

function readDraft(id) {
  if (!validId(id)) return null;
  try { return JSON.parse(fs.readFileSync(fileFor(id), 'utf8')); } catch { return null; }
}

function saveDraft(draft) {
  const target = fileFor(draft.id);
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(draft), { mode: 0o600 });
  fs.renameSync(temp, target);
}

function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'",
    ...extra,
  });
  res.end(body);
}

function page(title, body) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | 永旭審稿</title><style>
  body{margin:0;background:#f7f8f7;color:#1b2630;font:16px/1.6 system-ui,-apple-system,sans-serif}main{max-width:760px;margin:0 auto;padding:24px 18px 64px}header{background:#0b2236;color:#fff;padding:17px 20px;font-weight:700}h1{font-size:1.5rem;line-height:1.35}h2{font-size:1.1rem;margin-top:28px}p{margin:12px 0}label{display:block;font-weight:650;margin:18px 0 7px}input,textarea{box-sizing:border-box;width:100%;border:1px solid #aab7bd;border-radius:4px;padding:12px;font:inherit;background:#fff;color:#1b2630}textarea{min-height:130px;resize:vertical}.body-editor{min-height:320px}button{border:0;border-radius:4px;padding:11px 18px;background:#0b6b60;color:#fff;font:inherit;font-weight:700;cursor:pointer}button.secondary{background:#0b2236}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:20px}.panel{border-left:4px solid #c6a45b;background:white;padding:16px;margin:20px 0}.status{font-weight:700;color:#0b6b60}.muted{color:#52616b;font-size:.9rem}img{max-width:100%;height:auto}a{color:#075e91}</style></head><body><header>永旭智慧財產事務所 · 審稿</header><main>${body}</main></body></html>`;
}

async function readBody(req, limit = 8 * 1024 * 1024) {
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('內容過大');
    parts.push(chunk);
  }
  return Buffer.concat(parts).toString('utf8');
}

function apiAuth(req) {
  const given = req.headers.authorization || '';
  const expected = `Bearer ${INGEST_KEY}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionFor(req, id) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)ysreview=([A-Za-z0-9_-]+)/);
  const session = match && sessions.get(match[1]);
  if (!session || session.id !== id || session.expires < Date.now()) return null;
  return session;
}

async function dispatchWorkflow(workflow, inputs) {
  if (process.env.NODE_ENV === 'test') return;
  const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  const response = await fetch(`https://api.github.com/repos/ysjoin-svg/ysipo-website/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'ysipo-review' },
    body: JSON.stringify({ ref: 'master', inputs }),
  });
  if (response.status !== 204) throw new Error(`GitHub 工作觸發失敗（HTTP ${response.status}）`);
}

function reviewerByToken(draft, token) {
  return REVIEWERS.find((email) => draft.reviewers[email] === digest(token || ''));
}

function validateContent(type, content) {
  if (type === 'news') {
    return content && ['title', 'summary', 'link', 'source', 'date'].every((key) => typeof content[key] === 'string' && content[key].length > 0) && content.title.length <= 200 && content.summary.length <= 1500;
  }
  if (type === 'article') {
    return content && ['titleZh', 'titleEn', 'bodyZh', 'bodyEn', 'category', 'imageBase64'].every((key) => typeof content[key] === 'string' && content[key].length > 0) && content.bodyZh.length <= 30000 && content.bodyEn.length <= 30000 && content.imageBase64.length <= 7000000 && /^(商標|專利|著作權|國際|智財)$/.test(content.category);
  }
  return false;
}

function editor(draft, session) {
  const c = draft.content;
  const fields = draft.type === 'news'
    ? `<label for="title">標題</label><input id="title" name="title" maxlength="200" required value="${esc(c.title)}"><label for="summary">摘要</label><textarea id="summary" name="summary" maxlength="1500" required>${esc(c.summary)}</textarea><p class="muted">資料來源：${esc(c.source)}　<a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">查看原文</a></p>`
    : `<label for="titleZh">中文標題</label><input id="titleZh" name="titleZh" maxlength="200" required value="${esc(c.titleZh)}"><label for="bodyZh">中文正文</label><textarea id="bodyZh" name="bodyZh" class="body-editor" required>${esc(c.bodyZh)}</textarea><label for="titleEn">英文標題</label><input id="titleEn" name="titleEn" maxlength="200" required value="${esc(c.titleEn)}"><label for="bodyEn">英文正文</label><textarea id="bodyEn" name="bodyEn" class="body-editor" required>${esc(c.bodyEn)}</textarea><h2>封面圖</h2><img src="/review/${draft.id}/image" alt="文章封面">`;
  const disabled = !['pending', 'failed'].includes(draft.status);
  return page(draft.type === 'news' ? '智財新聞草稿' : '智財知識文章草稿', `<h1>${draft.type === 'news' ? '智財新聞草稿' : '智財知識文章草稿'}</h1><p class="status">狀態：${draft.status === 'pending' ? '待審' : draft.status === 'publishing' ? '發布中' : draft.status === 'published' ? '已發布' : draft.status === 'cancelled' ? '已取消（內容重複）' : '發布失敗，可重新嘗試'}</p>${draft.publishedUrl ? `<p><a href="${esc(draft.publishedUrl)}">查看已發布內容</a></p>` : ''}${disabled ? '' : `<form method="post" action="/review/${draft.id}/save"><input type="hidden" name="csrf" value="${session.csrf}">${fields}<div class="row"><button type="submit" class="secondary">儲存修改</button></div></form><form method="post" action="/review/${draft.id}/publish"><input type="hidden" name="csrf" value="${session.csrf}"><div class="panel">確認內容後按「核准並發布」。系統會上架目前儲存的版本；若有修改，請先按「儲存修改」。</div><button type="submit">核准並發布</button></form>`}<p class="muted">本頁僅供兩位指定收件人審核；先完成的發布即生效。</p>`);
}

async function handler(req, res) {
  const url = new URL(req.url, BASE_URL);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, 'ok', 'text/plain');

  if (url.pathname === '/api/drafts' && req.method === 'POST') {
    if (!apiAuth(req)) return send(res, 401, 'Unauthorized', 'text/plain');
    const body = JSON.parse(await readBody(req));
    if (!validateContent(body.type, body.content)) return send(res, 400, 'Invalid draft', 'text/plain');
    if (body.type === 'news' || body.type === 'article') {
      const duplicate = fs.readdirSync(DATA_DIR).filter((name) => /^[a-f0-9]{32}\.json$/.test(name)).map((name) => readDraft(name.slice(0, 32))).find((item) => item?.type === body.type && item.status !== 'cancelled' && (body.type === 'news' ? item.content.link === body.content.link : item.content.titleZh === body.content.titleZh));
      if (duplicate) return send(res, 200, JSON.stringify({ duplicate: true }), 'application/json; charset=utf-8');
    }
    const id = crypto.randomBytes(16).toString('hex');
    const tokens = Object.fromEntries(REVIEWERS.map((email) => [email, random()]));
    const draft = { id, type: body.type, content: body.content, status: 'pending', createdAt: new Date().toISOString(), reviewers: Object.fromEntries(REVIEWERS.map((email) => [email, digest(tokens[email])])) };
    saveDraft(draft);
    const links = Object.fromEntries(REVIEWERS.map((email) => [email, `${BASE_URL}/review/${id}?token=${tokens[email]}`]));
    return send(res, 201, JSON.stringify({ id, links }), 'application/json; charset=utf-8');
  }

  const codeMatch = url.pathname.match(/^\/api\/codes\/([a-f0-9]{32})$/);
  if (codeMatch && req.method === 'POST') {
    if (!apiAuth(req)) return send(res, 401, 'Unauthorized', 'text/plain');
    const codeFile = path.join(DATA_DIR, `${codeMatch[1]}.code`);
    let payload;
    try { payload = JSON.parse(fs.readFileSync(codeFile, 'utf8')); } catch { return send(res, 404, 'Not found', 'text/plain'); }
    fs.unlinkSync(codeFile);
    if (Date.now() - payload.createdAt > 600000) return send(res, 410, 'Expired', 'text/plain');
    return send(res, 200, JSON.stringify({ recipient: payload.recipient, code: payload.code }), 'application/json; charset=utf-8');
  }

  const apiMatch = url.pathname.match(/^\/api\/drafts\/([a-f0-9]{32})(?:\/(result|cancel))?$/);
  if (apiMatch) {
    if (!apiAuth(req)) return send(res, 401, 'Unauthorized', 'text/plain');
    const draft = readDraft(apiMatch[1]);
    if (!draft) return send(res, 404, 'Not found', 'text/plain');
    if (req.method === 'GET' && !url.pathname.endsWith('/result')) {
      if (draft.status !== 'publishing') return send(res, 409, 'Not ready', 'text/plain');
      return send(res, 200, JSON.stringify({ id: draft.id, type: draft.type, content: draft.content }), 'application/json; charset=utf-8');
    }
    if (req.method === 'POST' && url.pathname.endsWith('/result')) {
      const result = JSON.parse(await readBody(req, 4096));
      if (draft.status !== 'publishing') return send(res, 409, 'Already resolved', 'text/plain');
      draft.status = result.status === 'success' ? 'published' : 'failed';
      draft.publishedUrl = result.status === 'success' && typeof result.url === 'string' ? result.url : undefined;
      draft.resolvedAt = new Date().toISOString();
      saveDraft(draft);
      return send(res, 200, 'ok', 'text/plain');
    }
    if (req.method === 'POST' && url.pathname.endsWith('/cancel')) {
      if (!['pending', 'failed'].includes(draft.status)) return send(res, 409, 'Cannot cancel', 'text/plain');
      draft.status = 'cancelled';
      draft.resolvedAt = new Date().toISOString();
      saveDraft(draft);
      return send(res, 200, 'ok', 'text/plain');
    }
  }

  const match = url.pathname.match(/^\/review\/([a-f0-9]{32})(?:\/(code|verify|save|publish|image))?$/);
  if (!match) return send(res, 404, page('找不到頁面', '<h1>找不到頁面</h1>'));
  const [, id, action] = match;
  const draft = readDraft(id);
  if (!draft) return send(res, 404, page('找不到草稿', '<h1>找不到草稿</h1>'));
  if (draft.status === 'publishing' && Date.now() - Date.parse(draft.publishingAt) > 1800000) {
    draft.status = 'failed';
    saveDraft(draft);
  }
  const session = sessionFor(req, id);

  if (req.method === 'GET' && action === 'image') {
    if (!session || draft.type !== 'article') return send(res, 403, 'Forbidden', 'text/plain');
    return send(res, 200, Buffer.from(draft.content.imageBase64, 'base64'), 'image/jpeg');
  }
  if (req.method === 'GET' && !action) {
    if (session) return send(res, 200, editor(draft, session));
    const token = url.searchParams.get('token');
    const email = reviewerByToken(draft, token);
    if (!email) return send(res, 403, page('連結無效', '<h1>審稿連結無效</h1>'));
    return send(res, 200, page('信箱驗證', `<h1>信箱驗證</h1><p>驗證碼會寄到 ${esc(email)}，完成後即可修改或發布草稿。</p><form method="post" action="/review/${id}/code"><input type="hidden" name="token" value="${esc(token)}"><button type="submit">寄送驗證碼</button></form>`));
  }
  if (req.method !== 'POST') return send(res, 405, 'Method not allowed', 'text/plain');
  const form = new URLSearchParams(await readBody(req, 80000));

  if (action === 'code') {
    const token = form.get('token');
    const email = reviewerByToken(draft, token);
    if (!email) return send(res, 403, 'Invalid token', 'text/plain');
    draft.codeRequests ||= {};
    const recent = (draft.codeRequests[email] || []).filter((time) => Date.now() - time < 3600000);
    if (recent.length >= 5) return send(res, 429, page('稍後再試', '<h1>驗證碼寄送次數已達上限，請一小時後再試</h1>'));
    const state = draft.codes?.[email];
    if (state && Date.now() - state.sentAt < 60000) return send(res, 429, page('稍候再試', '<h1>請稍候一分鐘再寄送</h1>'));
    const code = process.env.NODE_ENV === 'test' ? '12345678' : String(crypto.randomInt(10000000, 100000000));
    draft.codes ||= {};
    draft.codes[email] = { hash: digest(code), sentAt: Date.now(), attempts: 0 };
    draft.codeRequests[email] = recent.concat(Date.now());
    saveDraft(draft);
    const requestId = crypto.randomBytes(16).toString('hex');
    const codeFile = path.join(DATA_DIR, `${requestId}.code`);
    fs.writeFileSync(codeFile, JSON.stringify({ recipient: email, code, createdAt: Date.now() }), { mode: 0o600 });
    try { await dispatchWorkflow('review-code.yml', { request_id: requestId }); }
    catch (error) { fs.unlinkSync(codeFile); delete draft.codes[email]; saveDraft(draft); throw error; }
    return send(res, 200, page('輸入驗證碼', `<h1>輸入驗證碼</h1><p>已寄送至 ${esc(email)}。驗證碼 10 分鐘內有效。</p><form method="post" action="/review/${id}/verify"><input type="hidden" name="token" value="${esc(token)}"><label for="code">8 位數驗證碼</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{8}" required><div class="row"><button type="submit">進入審稿頁</button></div></form>`));
  }
  if (action === 'verify') {
    const email = reviewerByToken(draft, form.get('token'));
    const state = email && draft.codes?.[email];
    if (!state || Date.now() - state.sentAt > 600000 || state.attempts >= 5) return send(res, 403, page('驗證失敗', '<h1>驗證碼已失效，請從郵件重新開啟審稿連結</h1>'));
    state.attempts += 1;
    saveDraft(draft);
    if (digest(form.get('code') || '') !== state.hash) return send(res, 403, page('驗證失敗', '<h1>驗證碼錯誤</h1><p>請返回上一頁重新輸入。</p>'));
    delete draft.codes[email];
    saveDraft(draft);
    const sid = random();
    sessions.set(sid, { id, email, csrf: random(), expires: Date.now() + 12 * 3600000 });
    return send(res, 303, '', 'text/plain', { Location: `/review/${id}`, 'Set-Cookie': `ysreview=${sid}; HttpOnly; Secure; SameSite=Strict; Path=/review; Max-Age=43200` });
  }
  if (!session || form.get('csrf') !== session.csrf) return send(res, 403, 'Forbidden', 'text/plain');
  if (action === 'save') {
    if (!['pending', 'failed'].includes(draft.status)) return send(res, 409, editor(draft, session));
    const fields = draft.type === 'news' ? ['title', 'summary'] : ['titleZh', 'titleEn', 'bodyZh', 'bodyEn'];
    for (const field of fields) {
      const value = (form.get(field) || '').trim();
      if (!value || value.length > (field.startsWith('body') ? 30000 : field === 'summary' ? 1500 : 200)) return send(res, 400, page('內容錯誤', '<h1>內容不可為空或超過長度限制</h1>'));
      draft.content[field] = value;
    }
    draft.status = 'pending';
    draft.updatedAt = new Date().toISOString();
    saveDraft(draft);
    return send(res, 303, '', 'text/plain', { Location: `/review/${id}` });
  }
  if (action === 'publish') {
    if (!['pending', 'failed'].includes(draft.status)) return send(res, 409, editor(draft, session));
    draft.status = 'publishing';
    draft.publishingAt = new Date().toISOString();
    draft.approvedBy = session.email;
    saveDraft(draft);
    try { await dispatchWorkflow('review-publish.yml', { draft_id: id }); }
    catch (error) { draft.status = 'failed'; saveDraft(draft); throw error; }
    return send(res, 303, '', 'text/plain', { Location: `/review/${id}` });
  }
  return send(res, 405, 'Method not allowed', 'text/plain');
}

const server = http.createServer((req, res) => {
  handler(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) send(res, 500, page('服務暫時無法使用', '<h1>服務暫時無法使用</h1><p>請稍後重試。</p>'));
  });
});

if (require.main === module) server.listen(PORT, '127.0.0.1', () => console.log(`review server listening on 127.0.0.1:${PORT}`));
module.exports = { server, readDraft, saveDraft };
