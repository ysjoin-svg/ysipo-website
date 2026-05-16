/**
 * 批次產生多篇智財文章（中英文並行）
 * 用法：node generate-batch.js
 * 所有文章 API 呼叫並行，最後一次 git push + Cloudflare 清快取
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./config');

const NVIDIA_API_KEY = config.NVIDIA_API_KEY;
const CF_ZONE_ID    = config.CF_ZONE_ID;
const CF_API_TOKEN  = config.CF_API_TOKEN;
const WEBSITE_DIR   = path.resolve(__dirname, '..');
const INSIGHTS_DIR  = path.join(WEBSITE_DIR, 'insights');

// ===== 本次批次主題 =====
const BATCH_TOPICS = [
  '迴避設計實戰：從競爭對手專利壁壘中找出生路',
  '程式碼、設計圖、行銷素材——數位著作權保護完全指南',
];

const CATEGORY_MAP = {
  '商標':   { name: '商標', slug: 'trademark'    },
  '專利':   { name: '專利', slug: 'patent'       },
  '著作權': { name: '著作權', slug: 'copyright'  },
  'PCT':    { name: '國際', slug: 'international' },
  '國際':   { name: '國際', slug: 'international' },
  '馬德里': { name: '國際', slug: 'international' },
  '新型':   { name: '專利', slug: 'patent'       },
  '發明':   { name: '專利', slug: 'patent'       },
  '設計專利': { name: '專利', slug: 'patent'     },
  '迴避':   { name: '專利', slug: 'patent'       },
  '程式碼': { name: '著作權', slug: 'copyright'  },
};

const CATEGORY_EN = {
  '商標': 'Trademark',
  '專利': 'Patent',
  '著作權': 'Copyright',
  '國際': 'International IP',
  '智財': 'IP Knowledge',
};

const MONTHS_EN = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];

function categorize(topic) {
  for (const kw in CATEGORY_MAP) {
    if (topic.includes(kw)) return CATEGORY_MAP[kw];
  }
  return { name: '智財', slug: 'trademark' };
}

function selectImage(topic, category) {
  const rules = {
    trademark: [
      { keywords: ['近似','駁回','核駁','識別性','識別'], img: 2 },
      { keywords: ['異議','撤銷','評定','爭議','侵權'],   img: 1 },
      { keywords: ['布局','馬德里','國際','授權','移轉'], img: 3 },
    ],
    patent: [
      { keywords: ['年費','維護','消滅','期限'],           img: 2 },
      { keywords: ['迴避','壁壘','設計專利','外觀'],       img: 3 },
      { keywords: ['說明書','申請','新型','發明','PCT'],   img: 1 },
    ],
    copyright: [
      { keywords: ['侵權','盜用','取締','鑑定'],           img: 1 },
      { keywords: ['數位','程式碼','設計圖','素材','軟體'], img: 2 },
      { keywords: ['登記','授權','合約'],                  img: 3 },
    ],
    international: [
      { keywords: ['PCT','專利'],  img: 1 },
      { keywords: ['馬德里','商標'], img: 2 },
      { keywords: ['著作','版權'], img: 3 },
    ],
  };
  const list = rules[category.slug] || [];
  for (const rule of list) {
    if (rule.keywords.some(k => topic.includes(k))) {
      return `../assets/img/categories/${category.slug}-${rule.img}.jpg`;
    }
  }
  return `../assets/img/categories/${category.slug}-1.jpg`;
}

function callAPI(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 2048
    });
    const req = https.request({
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          p.choices?.[0] ? resolve(p.choices[0].message.content)
                         : reject(new Error('API 格式錯誤: ' + data));
        } catch (e) { reject(new Error('JSON 解析失敗: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function zhMessages(topic) {
  return [
    { role: 'system', content: '你是永旭智慧財產事務所的智財專家，專門撰寫繁體中文智財知識文章。文章要專業、實用、易懂。' },
    { role: 'user', content: `請撰寫一篇關於「${topic}」的繁體中文智財知識文章。\n\n要求：\n- 字數：800-1200字\n- 結構：主標題、2-3個副標題、各段落說明\n- 語氣：專業但易懂，適合企業主和發明人\n- 內容：實用的建議和注意事項\n- 結尾：「如需進一步諮詢，歡迎聯絡永旭智慧財產事務所，初次諮詢完全免費。」\n\n請直接輸出文章，不要加前言或說明。` }
  ];
}

function enMessages(topic) {
  return [
    { role: 'system', content: 'You are an IP expert at Yong Syu Intellectual Property Office (Taiwan). You MUST write ONLY in English. Never use Chinese characters in your response.' },
    { role: 'user', content: `The following is an IP topic written in Chinese: "${topic}"\n\nPlease write a complete IP knowledge article in ENGLISH about this topic.\n\nIMPORTANT: Your entire response must be in English only. Do not write any Chinese characters.\n\nRequirements:\n- Length: 600–900 words\n- Start with an English title on the first line\n- Structure: title, 2–3 subheadings (use ## prefix)\n- Tone: professional yet accessible for business owners and inventors\n- Content: practical advice, key points, and actionable tips relevant to Taiwan IP practice\n- Final paragraph: "For further consultation, please contact Yong Syu Intellectual Property Office — initial consultations are completely free."\n\nOutput the article directly in English.` }
  ];
}

function parseBody(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  let html = '', inList = false;
  for (const line of lines) {
    const c = line.replace(/\*\*/g, '').trim();
    if (c.match(/^={3,}$/)) continue;
    if (c.match(/^#{1,3}\s/)) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h2>${c.replace(/^#+\s*/, '')}</h2>\n`;
    } else if (c.match(/^[\*\-]\s+/) || c.match(/^\d+\.\s+/)) {
      if (!inList) { html += '<ul>\n'; inList = true; }
      html += `<li>${c.replace(/^[\*\-]\s+/, '').replace(/^\d+\.\s+/, '')}</li>\n`;
    } else {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<p>${c}</p>\n`;
    }
  }
  if (inList) html += '</ul>\n';
  return html;
}

function extractTitle(text) {
  return text.trim().split('\n')[0]
    .replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/={3,}/g, '').trim();
}

function extractSummary(text) {
  return (text.trim().split('\n')
    .filter(l => l.trim().length > 20 && !l.match(/^#+/) && !l.match(/^={3,}/) && !l.match(/^[\*\-]/))
    [0]?.replace(/\*\*/g, '').trim().slice(0, 120) + '...') || '';
}

function buildZhHtml(text, title, dateStr, category, imagePath) {
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | 永旭智慧財產事務所</title>
<meta name="description" content="${title} - 永旭智慧財產事務所智財知識專欄">
<meta property="og:title" content="${title} | 永旭智慧財產事務所">
<meta property="og:image" content="${imagePath}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
<div id="header-placeholder"></div>
<main class="article-main">
  <div class="article-hero"><img src="${imagePath}" alt="${title}" class="article-hero-image"></div>
  <div class="container">
    <div class="article-header">
      <span class="article-category">${category.name}</span>
      <h1 class="article-title">${title}</h1>
      <div class="article-meta">
        <span>永旭智財團隊</span><span>${dateStr}</span><span>閱讀約 5 分鐘</span>
      </div>
    </div>
    <div class="article-content">${parseBody(text)}</div>
    <div class="article-cta">
      <h3>需要智財專業協助？</h3>
      <p>初次諮詢完全免費，所長與負責人親自回覆每一個案件。</p>
      <a href="../contact.html" class="btn-primary">立即免費諮詢</a>
    </div>
  </div>
</main>
<div id="footer-placeholder"></div>
<script src="../assets/js/main.js"></script>
</body></html>`;
}

function buildEnHtml(text, titleEn, dateStr, category, imagePath) {
  const catEn = CATEGORY_EN[category.name] || 'IP Knowledge';
  const [y, m, d] = dateStr.split('-');
  const dateEn = `${MONTHS_EN[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleEn} | Yong Syu Intellectual Property Office</title>
<meta name="description" content="${titleEn} - YSIPO IP Knowledge Column">
<meta property="og:title" content="${titleEn} | YSIPO">
<meta property="og:image" content="${imagePath}">
<meta property="og:type" content="article">
<meta property="og:locale" content="en_US">
<link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
<div id="header-placeholder"></div>
<main class="article-main">
  <div class="article-hero"><img src="${imagePath}" alt="${titleEn}" class="article-hero-image"></div>
  <div class="container">
    <div class="article-header">
      <span class="article-category">${catEn}</span>
      <h1 class="article-title">${titleEn}</h1>
      <div class="article-meta">
        <span>YSIPO Team</span><span>${dateEn}</span><span>~5 min read</span>
      </div>
    </div>
    <div class="article-content">${parseBody(text)}</div>
    <div class="article-cta">
      <h3>Need Professional IP Advice?</h3>
      <p>Initial consultations are completely free — our principals personally review every inquiry.</p>
      <a href="../en/contact.html" class="btn-primary">Book a Free Consultation</a>
    </div>
  </div>
</main>
<div id="footer-placeholder"></div>
<script src="../assets/js/main.js"></script>
</body></html>`;
}

function purgeCloudflare() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ purge_everything: true });
    const req = https.request({
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          p.success ? resolve(true) : reject(new Error(JSON.stringify(p.errors)));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generateOne(topic, index) {
  console.log(`  [${index+1}] 呼叫 API：${topic.slice(0, 20)}...`);
  const category = categorize(topic);
  const imagePath = selectImage(topic, category);
  const [zhText, enText] = await Promise.all([
    callAPI(zhMessages(topic)),
    callAPI(enMessages(topic))
  ]);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timestamp = now.getTime() + index * 1000;
  const fnZh = `article-${dateStr}-${timestamp}.html`;
  const fnEn = `article-${dateStr}-${timestamp}-en.html`;
  const titleZh = extractTitle(zhText);
  const titleEn = extractTitle(enText);

  fs.writeFileSync(path.join(INSIGHTS_DIR, fnZh), buildZhHtml(zhText, titleZh, dateStr, category, imagePath), 'utf8');
  fs.writeFileSync(path.join(INSIGHTS_DIR, fnEn), buildEnHtml(enText, titleEn, dateStr, category, imagePath), 'utf8');

  const imageSlug = imagePath.match(/(\w+)-(\d+)\.jpg$/);
  const imageField = imageSlug ? `assets/img/categories/${imageSlug[1]}-${imageSlug[2]}.jpg` : `assets/img/categories/${category.slug}-1.jpg`;

  return {
    filename: fnZh, filenameEn: fnEn,
    title: titleZh, titleEn: titleEn,
    category: category.name, categorySlug: category.slug,
    image: imageField,
    date: dateStr, readTime: '5',
    summary: extractSummary(zhText),
    summaryEn: extractSummary(enText),
    autoGenerated: true,
    createdAt: now.toISOString()
  };
}

async function main() {
  console.log(`\n🚀 批次產生 ${BATCH_TOPICS.length} 篇智財文章（中英文並行）\n`);

  if (!fs.existsSync(INSIGHTS_DIR)) fs.mkdirSync(INSIGHTS_DIR, { recursive: true });

  // 全部主題同時呼叫 API
  console.log('🤖 全部主題同時呼叫 Nvidia API...');
  const results = await Promise.all(BATCH_TOPICS.map((t, i) => generateOne(t, i)));
  console.log('✅ 全部文章產出完成\n');

  // 更新 articles.json
  const jsonPath = path.join(INSIGHTS_DIR, 'articles.json');
  let articles = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : [];
  for (const r of results.reverse()) articles.unshift(r); // 最新在前
  fs.writeFileSync(jsonPath, JSON.stringify(articles, null, 2), 'utf8');

  // 列出結果
  console.log('📋 產出結果：');
  for (const r of results.reverse()) {
    console.log(`  📰 ${r.title}`);
    console.log(`     ${r.titleEn}`);
    console.log(`     中文：insights/${r.filename}`);
    console.log(`     英文：insights/${r.filenameEn}\n`);
  }

  // 一次 git push
  console.log('📤 推送到 GitHub...');
  const addFiles = results.flatMap(r => [`"insights/${r.filename}"`, `"insights/${r.filenameEn}"`]).join(' ');
  execSync(`git -C "${WEBSITE_DIR}" add ${addFiles} "insights/articles.json"`, { stdio: 'inherit' });
  execSync(`git -C "${WEBSITE_DIR}" commit -m "batch: 補發 ${results.length} 篇智財文章（中英雙語）(${results[0].date})"`, { stdio: 'inherit' });
  execSync(`git -C "${WEBSITE_DIR}" push origin master`, { stdio: 'inherit' });

  console.log('\n⏳ 等待 GitHub Pages 部署完成（60秒）...');
  await new Promise(r => setTimeout(r, 60000));

  console.log('🌐 清除 Cloudflare 快取...');
  await purgeCloudflare();
  console.log('✅ Cloudflare 快取已清除');

  console.log('\n🎉 批次發文完成！');
}

main().catch(err => {
  console.error('❌ 錯誤：', err.message);
  process.exit(1);
});
