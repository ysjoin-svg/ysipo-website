'use strict';

const fs = require('node:fs');

const envFile = '/home/yongsyu/ysipo-review/review.env';
let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
  if (input.length > 256) {
    console.error('Token 長度不正確。');
    process.exitCode = 1;
    process.stdin.destroy();
  }
});

process.stdin.on('end', () => {
  if (process.exitCode) return;
  const token = input.trim();
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    console.error('Token 格式不正確。');
    process.exitCode = 1;
    return;
  }

  try {
    const previous = fs.readFileSync(envFile, 'utf8');
    const backup = `${envFile}.bak-traffic-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.copyFileSync(envFile, backup);
    fs.chmodSync(backup, 0o600);

    const lines = previous.split(/\r?\n/).filter((line) => !line.startsWith('TRAFFIC_CF_ANALYTICS_TOKEN='));
    const next = `${lines.join('\n').trimEnd()}\nTRAFFIC_CF_ANALYTICS_TOKEN=${token}\n`;
    const temp = `${envFile}.${process.pid}.tmp`;
    fs.writeFileSync(temp, next, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, envFile);
    fs.chmodSync(envFile, 0o600);
    console.log('Cloudflare 唯讀 token 已安全寫入審稿伺服器。');
  } catch (error) {
    console.error(`寫入失敗：${error.message}`);
    process.exitCode = 1;
  }
});
