const fs = require('fs');
const path = require('path');

async function main() {
  const id = process.argv[2];
  const key = process.env.REVIEW_INGEST_KEY;
  if (!/^[a-f0-9]{32}$/.test(id || '') || !key || !process.env.RUNNER_TEMP) throw new Error('缺少必要審稿參數');
  const url = `${process.env.REVIEW_BASE_URL || 'https://review.ysipo.com.tw'}/api/codes/${id}`;
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`取得驗證碼失敗（HTTP ${response.status}）`);
  const { recipient, code } = await response.json();
  if (!['taiejoin@hotmail.com', 'fish801113@gmail.com'].includes(recipient) || !/^[0-9]{8}$/.test(code)) throw new Error('驗證資料不合法');
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'review-code.txt'), `你的永旭審稿驗證碼：${code}\n\n10 分鐘內有效。若你沒有要求驗證，請忽略此信。\n`, { mode: 0o600 });
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `recipient=${recipient}\n`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
