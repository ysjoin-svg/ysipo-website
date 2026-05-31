const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ===== 密鑰載入：優先讀環境變數（GitHub Actions），本機則回退 config.js =====
let config = {};
try {
  config = require('./config'); // 本機有此檔；CI 環境沒有（已 gitignore），用 env
} catch (e) {
  // CI 環境無 config.js，改用環境變數
}
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || config.NVIDIA_API_KEY;
const CF_ZONE_ID     = process.env.CF_ZONE_ID     || config.CF_ZONE_ID;
const CF_API_TOKEN   = process.env.CF_API_TOKEN   || config.CF_API_TOKEN;
if (!NVIDIA_API_KEY || !CF_ZONE_ID || !CF_API_TOKEN) {
  console.error('❌ 缺少密鑰：請設定環境變數或 scripts/config.js');
  process.exit(1);
}
const WEBSITE_DIR = path.resolve(__dirname, '..');
const INSIGHTS_DIR = path.join(WEBSITE_DIR, 'insights');

// 文章主題輪替清單
const TOPICS = [
  '商標異議處理：收到異議通知書怎麼辦？',
  '專利年費管理：避免專利因未繳年費而消滅',
  '著作權侵權處理：發現作品被盜用的法律途徑',
  '國際商標布局：馬德里系統申請完全指南',
  '新型專利vs發明專利：如何選擇最適合的保護方式',
  '商標近似判斷：如何避免申請被駁回',
  'PCT國際專利申請：從台灣布局全球市場',
  '設計專利保護：產品外觀的智財防線'
];

// 分類中英文對照
const CATEGORY_EN = {
  '商標': 'Trademark',
  '專利': 'Patent',
  '著作權': 'Copyright',
  '國際': 'International IP',
  '智財': 'IP Knowledge',
};

const MONTHS_EN = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];

// 依週數輪替主題（可用命令列參數覆蓋：node generate-article.js "自訂主題"）
function getCurrentTopic() {
  if (process.argv[2]) return process.argv[2];
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return TOPICS[weekNumber % TOPICS.length];
}

// 根據主題自動分類（統一不加「知識」後綴）
function categorizeArticle(topic) {
  const categories = {
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
  for (const keyword in categories) {
    if (topic.includes(keyword)) return categories[keyword];
  }
  return { name: '智財', slug: 'trademark' };
}

// 根據主題關鍵字選擇最適合的配圖（固定對應，不隨機）
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
      { keywords: ['PCT','專利'],                          img: 1 },
      { keywords: ['馬德里','商標'],                       img: 2 },
      { keywords: ['著作','版權'],                         img: 3 },
    ],
  };

  const list = rules[category.slug] || [];
  for (const rule of list) {
    if (rule.keywords.some(k => topic.includes(k))) {
      return `../assets/img/categories/${category.slug}-${rule.img}.jpg`;
    }
  }
  return `../assets/img/categories/${category.slug}-1.jpg`; // 預設第 1 張
}

// 用 FLUX.1 即時生成文章專屬配圖（失敗回傳 null，由呼叫端回退分類圖庫）
// 注意：刻意不把文章標題塞進 prompt，否則 FLUX 會在圖上「寫」出亂碼英文字
function generateArticleImage(category, dateStr, timestamp) {
  return new Promise((resolve) => {
    const styleBase =
      'Flat modern vector business illustration, professional corporate style, ' +
      'deep navy blue background, gold and white accents, minimalist, clean lines, ' +
      'balanced composition with a few related icons, soft shadow, ' +
      'absolutely NO text, no letters, no alphabet, no words, no numbers, ' +
      'no typography, no watermark, no signature, no logos containing letters';
    const subjectByCat = {
      trademark:     'brand protection shield, magnifying glass, checkmark, star badge',
      patent:        'lightbulb, mechanical gears, blueprint scroll, drafting compass',
      copyright:     'document pages, fountain pen, artist palette, film and music icons',
      international: 'globe, world map, connection lines, paper airplane',
    };
    const subject = subjectByCat[category.slug] || 'intellectual property law symbols';
    const prompt = `${styleBase}. Theme: ${subject}.`;

    const body = JSON.stringify({
      prompt,
      mode: 'base',
      width: 1024,
      height: 768,
      steps: 4,
      seed: Math.floor(Math.random() * 1000000),
    });

    const req = https.request(
      {
        hostname: 'ai.api.nvidia.com',
        path: '/v1/genai/black-forest-labs/flux.1-schnell',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + NVIDIA_API_KEY,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (r) => {
        let b = '';
        r.on('data', (d) => (b += d));
        r.on('end', () => {
          try {
            if (r.statusCode !== 200) {
              console.log(`  ⚠️ 生圖 HTTP ${r.statusCode}：${b.slice(0, 200)}`);
              return resolve(null);
            }
            const json = JSON.parse(b);
            const b64 = json.artifacts && json.artifacts[0] && json.artifacts[0].base64;
            if (!b64) return resolve(null);
            const imgDir = path.join(INSIGHTS_DIR, 'img');
            if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
            const imgFilename = `article-${dateStr}-${timestamp}.jpg`;
            const absFile = path.join(imgDir, imgFilename);
            fs.writeFileSync(absFile, Buffer.from(b64, 'base64'));
            resolve({
              htmlPath: `img/${imgFilename}`,            // 給文章頁（在 insights/ 內）
              jsonPath: `insights/img/${imgFilename}`,   // 給 insights.html（在網站根）
              absFile,
            });
          } catch (e) {
            console.log('  ⚠️ 生圖解析失敗：' + e.message);
            resolve(null);
          }
        });
      }
    );
    req.on('error', (e) => {
      console.log('  ⚠️ 生圖連線失敗：' + e.message);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

// 呼叫 Nvidia API（通用）
function callNvidiaAPI(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 2048
    });

    const options = {
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('API 回應格式錯誤: ' + data));
          }
        } catch (e) {
          reject(new Error('JSON 解析失敗: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 中文文章 prompt
function buildZhMessages(topic) {
  return [
    {
      role: 'system',
      content: '你是永旭智慧財產事務所的智財專家，專門撰寫繁體中文智財知識文章。文章要專業、實用、易懂。'
    },
    {
      role: 'user',
      content: `請撰寫一篇關於「${topic}」的繁體中文智財知識文章。

要求：
- 字數：800-1200字
- 結構：主標題、2-3個副標題、各段落說明
- 語氣：專業但易懂，適合企業主和發明人
- 內容：實用的建議和注意事項
- 結尾：「如需進一步諮詢，歡迎聯絡永旭智慧財產事務所，初次諮詢完全免費。」

請直接輸出文章，不要加前言或說明。`
    }
  ];
}

// 英文文章 prompt
function buildEnMessages(topic) {
  return [
    {
      role: 'system',
      content: 'You are an IP expert at Yong Syu Intellectual Property Office (Taiwan). You MUST write ONLY in English. Never use Chinese characters in your response. Your entire output must be in English.'
    },
    {
      role: 'user',
      content: `The following is an IP topic written in Chinese: "${topic}"

Please write a complete IP knowledge article in ENGLISH about this topic.

IMPORTANT: Your entire response must be in English only. Do not write any Chinese characters.

Requirements:
- Length: 600–900 words
- Start with an English title (no # symbol needed, just the title text on the first line)
- Structure: title, 2–3 subheadings (use ## prefix), paragraph explanations under each
- Tone: professional yet accessible for business owners and inventors
- Content: practical advice, key points, and actionable tips relevant to Taiwan IP practice
- Final paragraph: "For further consultation, please contact Yong Syu Intellectual Property Office — initial consultations are completely free."

Output the article directly in English. Do not explain or translate the topic first.`
    }
  ];
}

// 清除 Cloudflare 快取
function purgeCloudflareCache() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ purge_everything: true });
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          parsed.success ? resolve(true) : reject(new Error('Cloudflare 清快取失敗: ' + JSON.stringify(parsed.errors)));
        } catch (e) {
          reject(new Error('Cloudflare 回應解析失敗: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 純文字轉 HTML body（共用）
function parseBody(text) {
  const lines = text.trim().split('\n').filter(l => l.trim() !== '');
  let htmlBody = '';
  let inList = false;

  for (const line of lines) {
    const clean = line.replace(/\*\*/g, '').trim();
    if (clean.match(/^={3,}$/) || clean === '') continue;

    if (clean.match(/^#{1,3}\s/)) {
      if (inList) { htmlBody += '</ul>\n'; inList = false; }
      htmlBody += `<h2>${clean.replace(/^#+\s*/, '')}</h2>\n`;
    } else if (clean.match(/^[\*\-]\s+/) || clean.match(/^\d+\.\s+/)) {
      if (!inList) { htmlBody += '<ul>\n'; inList = true; }
      htmlBody += `<li>${clean.replace(/^[\*\-]\s+/, '').replace(/^\d+\.\s+/, '')}</li>\n`;
    } else {
      if (inList) { htmlBody += '</ul>\n'; inList = false; }
      htmlBody += `<p>${clean}</p>\n`;
    }
  }
  if (inList) htmlBody += '</ul>\n';
  return htmlBody;
}

// 取得文章第一行作為標題
function extractTitle(text) {
  return text.trim().split('\n')[0]
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/={3,}/g, '')
    .trim();
}

// 取得摘要
function extractSummary(text) {
  return text.trim().split('\n')
    .filter(l => l.trim().length > 20 && !l.match(/^#+/) && !l.match(/^={3,}/) && !l.match(/^[\*\-]/))
    [0]?.replace(/\*\*/g, '').trim().slice(0, 120) + '...' || '';
}

// 產生中文 HTML
function textToHtml(text, title, dateStr, category, imagePath) {
  const htmlBody = parseBody(text);
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | 永旭智慧財產事務所</title>
<meta name="description" content="${title} - 永旭智慧財產事務所智財知識專欄">
<meta property="og:title" content="${title} | 永旭智慧財產事務所">
<meta property="og:description" content="${title} - 智財知識專欄">
<meta property="og:image" content="${imagePath}">
<meta property="og:type" content="article">
<link rel="alternate" hreflang="zh-TW" href="https://ysipo.com.tw/insights/${title}">
<link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
<div id="header-placeholder"></div>
<main class="article-main">
  <div class="article-hero">
    <img src="${imagePath}" alt="${title}" class="article-hero-image">
  </div>
  <div class="container">
    <div class="article-header">
      <span class="article-category">${category.name}</span>
      <h1 class="article-title">${title}</h1>
      <div class="article-meta">
        <span>永旭智財團隊</span>
        <span>${dateStr}</span>
        <span>閱讀約 5 分鐘</span>
      </div>
    </div>
    <div class="article-content">
      ${htmlBody}
    </div>
    <div class="article-cta">
      <h3>需要智財專業協助？</h3>
      <p>初次諮詢完全免費，所長與負責人親自回覆每一個案件。</p>
      <a href="../contact.html" class="btn-primary">立即免費諮詢</a>
    </div>
  </div>
</main>
<div id="footer-placeholder"></div>
<script src="../assets/js/main.js"></script>
</body>
</html>`;
}

// 產生英文 HTML
function textToHtmlEn(text, titleEn, dateStr, category, imagePath) {
  const htmlBody = parseBody(text);
  const catEn = CATEGORY_EN[category.name] || 'IP Knowledge';
  const [y, m, d] = dateStr.split('-');
  const dateEnStr = `${MONTHS_EN[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleEn} | Yong Syu Intellectual Property Office</title>
<meta name="description" content="${titleEn} - YSIPO IP Knowledge Column">
<meta property="og:title" content="${titleEn} | YSIPO">
<meta property="og:description" content="${titleEn} - IP Knowledge Column">
<meta property="og:image" content="${imagePath}">
<meta property="og:type" content="article">
<meta property="og:locale" content="en_US">
<link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
<div id="header-placeholder"></div>
<main class="article-main">
  <div class="article-hero">
    <img src="${imagePath}" alt="${titleEn}" class="article-hero-image">
  </div>
  <div class="container">
    <div class="article-header">
      <span class="article-category">${catEn}</span>
      <h1 class="article-title">${titleEn}</h1>
      <div class="article-meta">
        <span>YSIPO Team</span>
        <span>${dateEnStr}</span>
        <span>~5 min read</span>
      </div>
    </div>
    <div class="article-content">
      ${htmlBody}
    </div>
    <div class="article-cta">
      <h3>Need Professional IP Advice?</h3>
      <p>Initial consultations are completely free — our principals personally review every inquiry.</p>
      <a href="../en/contact.html" class="btn-primary">Book a Free Consultation</a>
    </div>
  </div>
</main>
<div id="footer-placeholder"></div>
<script src="../assets/js/main.js"></script>
</body>
</html>`;
}

// 主程式
async function main() {
  console.log('🚀 開始產生智財文章（中文 + 英文）...');

  try {
    const topic = getCurrentTopic();
    console.log(`📝 本週主題：${topic}`);

    const category = categorizeArticle(topic);
    console.log(`📂 自動分類：${category.name}`);

    // 預備配圖（AI 生圖失敗時的 fallback）
    const fallbackImagePath = selectImage(topic, category);

    // 中英文 API 並行呼叫
    console.log('🤖 呼叫 Nvidia API（中文 + 英文並行）...');
    const [articleZh, articleEn] = await Promise.all([
      callNvidiaAPI(buildZhMessages(topic)),
      callNvidiaAPI(buildEnMessages(topic))
    ]);
    console.log('✅ 中英文文章產出完成');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timestamp = now.getTime();

    // 標題與摘要
    const titleZh  = extractTitle(articleZh);
    const titleEn  = extractTitle(articleEn);
    const summaryZh = extractSummary(articleZh);
    const summaryEn = extractSummary(articleEn);

    // 檔名
    const filenameZh = `article-${dateStr}-${timestamp}.html`;
    const filenameEn = `article-${dateStr}-${timestamp}-en.html`;

    // 用 FLUX.1 即時生成專屬配圖，失敗則回退分類圖庫
    console.log('🎨 生成專屬配圖（FLUX.1）...');
    let imagePath = fallbackImagePath;
    let imageField;
    let generatedImageFile = null;
    const imgResult = await generateArticleImage(category, dateStr, timestamp);
    if (imgResult) {
      imagePath = imgResult.htmlPath;
      imageField = imgResult.jsonPath;
      generatedImageFile = imgResult.absFile;
      console.log(`🖼️  AI 生圖成功：${imgResult.jsonPath}`);
    } else {
      const m = fallbackImagePath.match(/(\w+)-(\d+)\.jpg$/);
      imageField = m
        ? `assets/img/categories/${m[1]}-${m[2]}.jpg`
        : `assets/img/categories/${category.slug}-1.jpg`;
      console.log(`🖼️  AI 生圖失敗，改用分類圖庫：${imageField}`);
    }

    // 產生 HTML
    const htmlZh = textToHtml(articleZh, titleZh, dateStr, category, imagePath);
    const htmlEn = textToHtmlEn(articleEn, titleEn, dateStr, category, imagePath);

    // 確保 insights 資料夾存在
    if (!fs.existsSync(INSIGHTS_DIR)) {
      fs.mkdirSync(INSIGHTS_DIR, { recursive: true });
    }

    // 寫入檔案
    fs.writeFileSync(path.join(INSIGHTS_DIR, filenameZh), htmlZh, 'utf8');
    console.log(`💾 中文：insights/${filenameZh}`);

    fs.writeFileSync(path.join(INSIGHTS_DIR, filenameEn), htmlEn, 'utf8');
    console.log(`💾 英文：insights/${filenameEn}`);

    // 更新 articles.json
    const articlesJsonPath = path.join(INSIGHTS_DIR, 'articles.json');
    let articles = [];
    if (fs.existsSync(articlesJsonPath)) {
      articles = JSON.parse(fs.readFileSync(articlesJsonPath, 'utf8'));
    }

    articles.unshift({
      filename:    filenameZh,
      filenameEn:  filenameEn,
      title:       titleZh,
      titleEn:     titleEn,
      category:    category.name,
      categorySlug: category.slug,
      image:       imageField,
      date:        dateStr,
      readTime:    '5',
      summary:     summaryZh,
      summaryEn:   summaryEn,
      autoGenerated: true,
      createdAt:   now.toISOString()
    });

    fs.writeFileSync(articlesJsonPath, JSON.stringify(articles, null, 2), 'utf8');
    console.log('📋 articles.json 已更新（含英文欄位）');

    // Git commit + push
    console.log('📤 推送到 GitHub...');
    const addPaths = [
      `"insights/${filenameZh}"`,
      `"insights/${filenameEn}"`,
      `"insights/articles.json"`,
    ];
    if (generatedImageFile) {
      addPaths.push(`"insights/img/article-${dateStr}-${timestamp}.jpg"`);
    }
    execSync(
      `git -C "${WEBSITE_DIR}" add ${addPaths.join(' ')}`,
      { stdio: 'inherit' }
    );
    execSync(
      `git -C "${WEBSITE_DIR}" commit -m "auto: ${category.name} - ${titleZh} (${dateStr})"`,
      { stdio: 'inherit' }
    );
    execSync(`git -C "${WEBSITE_DIR}" push origin master`, { stdio: 'inherit' });

    console.log('⏳ 等待 GitHub Pages 部署完成（60秒）...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    console.log('🌐 清除 Cloudflare 快取...');
    await purgeCloudflareCache();
    console.log('✅ Cloudflare 快取已清除');

    console.log('');
    console.log('🎉 完成！');
    console.log(`📰 中文標題：${titleZh}`);
    console.log(`📰 英文標題：${titleEn}`);
    console.log(`📂 分類：${category.name}`);
    console.log(`🌐 中文：https://ysipo.com.tw/insights/${filenameZh}`);
    console.log(`🌐 英文：https://ysipo.com.tw/insights/${filenameEn}`);

  } catch (err) {
    console.error('❌ 錯誤：', err.message);
    process.exit(1);
  }
}

main();
