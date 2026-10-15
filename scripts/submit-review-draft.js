const fs = require('fs');
const path = require('path');

const REVIEW_URL = process.env.REVIEW_BASE_URL || 'https://review.ysipo.com.tw';
const KEY = process.env.REVIEW_INGEST_KEY;
const RECIPIENTS = ['taiejoin@hotmail.com', 'fish801113@gmail.com'];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function emailHtml(items, email) {
  const cards = items.map(({ draft, link }) => {
    const c = draft.content;
    const title = draft.type === 'news' ? c.title : c.titleZh;
    const text = draft.type === 'news'
      ? `<p><strong>摘要</strong></p><p>${esc(c.summary)}</p><p>資料來源：${esc(c.source)}<br><a href="${esc(c.link)}">查看原文</a></p>`
      : `<p><strong>中文正文</strong></p><div style="white-space:pre-wrap">${esc(c.bodyZh)}</div><hr><h3>${esc(c.titleEn)}</h3><p><strong>English article</strong></p><div style="white-space:pre-wrap">${esc(c.bodyEn)}</div><p>分類：${esc(c.category)}；封面圖可在審稿頁查看。</p>`;
    return `<section style="border:1px solid #d5dce0;padding:20px;margin:20px 0;background:#fff"><h2 style="color:#0b2236">${esc(title)}</h2>${text}<p style="margin-top:24px"><a href="${esc(link)}" style="display:inline-block;background:#0b2236;color:#fff;padding:11px 18px;text-decoration:none;margin-right:8px">修改草稿</a><a href="${esc(link)}" style="display:inline-block;background:#0b6b60;color:#fff;padding:11px 18px;text-decoration:none">審核並發布</a></p></section>`;
  }).join('');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"></head><body style="font:16px/1.6 sans-serif;color:#1b2630;background:#f7f8f7;padding:20px"><div style="max-width:720px;margin:auto"><h1>永旭智財待審草稿</h1><p>收件者：${esc(email)}。兩位收件者任一人可以修改或核准。按鈕會開啟審稿頁，先驗證收件信箱，再確認發布。</p>${cards}<p style="color:#52616b">草稿目前尚未公開。核准後，另一位收件者的頁面會顯示已發布。</p></div></body></html>`;
}

async function main() {
  if (!KEY) throw new Error('缺少 REVIEW_INGEST_KEY');
  const input = process.argv[2];
  if (!input) throw new Error('請提供草稿 JSON 檔案');
  const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
  const drafts = Array.isArray(payload) ? payload : [payload];
  const publishedTitles = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'insights', 'articles.json'), 'utf8')).map((article) => article.title));
  const links = Object.fromEntries(RECIPIENTS.map((email) => [email, []]));
  for (const draft of drafts) {
    if (draft.type === 'article' && publishedTitles.has(draft.content.titleZh)) {
      console.log('略過與既有網站重複的文章標題');
      continue;
    }
    const response = await fetch(`${REVIEW_URL}/api/drafts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!response.ok) throw new Error(`審稿服務拒絕草稿（HTTP ${response.status}）`);
    const created = await response.json();
    if (created.duplicate) continue;
    for (const email of RECIPIENTS) links[email].push({ draft, link: created.links[email] });
  }
  const outputDir = process.env.RUNNER_TEMP || path.dirname(input);
  for (const [email, items] of Object.entries(links)) {
    const filename = email.startsWith('taiejoin') ? 'review-owner.html' : 'review-north.html';
    fs.writeFileSync(path.join(outputDir, filename), emailHtml(items, email), 'utf8');
  }
  const createdCount = links[RECIPIENTS[0]].length;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${createdCount}\n`);
  console.log(`已送出 ${createdCount} 則待審草稿，通知將寄至兩位審稿人`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });
module.exports = { emailHtml };
