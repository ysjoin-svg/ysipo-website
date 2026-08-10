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

function getImageDimensions(buffer) {
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (sofMarkers.has(marker) && offset + 7 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    if (length < 2) break;
    offset += length;
  }
  return null;
}

// 用 FLUX.1 即時生成文章專屬配圖（失敗回傳 null，由呼叫端重試）
// 注意：刻意不把文章標題塞進 prompt，否則 FLUX 會在圖上「寫」出亂碼英文字
function generateArticleImage(category, dateStr, timestamp, attempt = 0) {
  return new Promise((resolve) => {
    const styleBase =
      'Premium realistic editorial still-life photography for an intellectual property law firm, ' +
      'deep midnight navy, warm metallic gold and ivory legal paper, cinematic credible studio lighting, ' +
      'wide composition with a clear subject and generous crop-safe margins, refined and authoritative, ' +
      'real physical objects, not illustration, not vector art, not iconography, ' +
      'absolutely NO text, no letters, no alphabet, no words, no numbers, ' +
      'no typography, no watermark, no signature, no logos, no generic shield icon';
    const scenesByCat = {
      trademark: [
        'abstract embossed brand tokens being compared under a brass magnifying glass with an ivory evidence dossier',
        'one distinctive sculptural product seal standing apart from neutral forms on a dark presentation table',
        'premium unbranded packaging prototypes beside a trademark examination file and precision measuring tools',
        'abstract identity samples arranged for a careful legal comparison with a loupe and archival folders',
      ],
      patent: [
        'precision mechanical prototype components on authentic engineering drawings with calipers and drafting tools',
        'an invention development desk moving from hand sketch to technical drawing and sealed filing portfolio',
        'a refined industrial prototype under examination beside exploded-view drawings and a brass magnifier',
        'alternative engineered components arranged around a protected reference assembly on a blueprint worktable',
      ],
      copyright: [
        'camera, original photo prints, creation records and a legal evidence folder documenting a creative work',
        'graphic tablet, professional camera and encrypted media drives representing digital creative ownership',
        'manuscript pages, fountain pen, audio equipment and archival storage documenting original authorship',
        'design proofs and production materials organized beside timestamped evidence envelopes without readable text',
      ],
      international: [
        'elegant brass globe, unmarked filing dossiers and connected destination markers on a navy legal worktable',
        'international portfolio planning desk with world atlas textures, sealed folders and multiple jurisdiction tokens',
        'global filing route represented by physical brass markers, ivory documents and a refined navigation instrument',
        'cross-border intellectual property strategy scene with globe, passport-like blank dossiers and legal seals',
      ],
    };
    const scenes = scenesByCat[category.slug] || scenesByCat.trademark;
    const subject = scenes[(Number(timestamp) + attempt) % scenes.length];
    const prompt = `${styleBase}. Scene: ${subject}.`;

    const body = JSON.stringify({
      prompt,
      mode: 'base',
      width: 1024,
      height: 576,
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
            const imageBuffer = Buffer.from(b64, 'base64');
            const dimensions = getImageDimensions(imageBuffer);
            if (!dimensions || Math.abs(dimensions.width / dimensions.height - 16 / 9) > 0.01) {
              const actual = dimensions ? `${dimensions.width}x${dimensions.height}` : '無法辨識';
              console.log(`  ⚠️ 生圖比例不是 16:9（${actual}），本次不採用`);
              return resolve(null);
            }
            const imgDir = path.join(INSIGHTS_DIR, 'img');
            if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
            const imgFilename = `article-${dateStr}-${timestamp}.jpg`;
            const absFile = path.join(imgDir, imgFilename);
            fs.writeFileSync(absFile, imageBuffer);
            resolve({
              htmlPath: `img/${imgFilename}`,            // 給文章頁（在 insights/ 內）
              jsonPath: `insights/img/${imgFilename}`,   // 給 insights.html（在網站根）
              absFile,
              width: dimensions.width,
              height: dimensions.height,
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
function textToHtml(text, title, dateStr, category, imagePath, imageWidth, imageHeight, filenameZh, filenameEn) {
  const htmlBody = parseBody(text);
  const canonicalUrl = `https://ysipo.com.tw/insights/${filenameZh}`;
  const englishUrl = `https://ysipo.com.tw/insights/${filenameEn}`;
  const absoluteImage = imagePath.startsWith('http')
    ? imagePath
    : `https://ysipo.com.tw/${imagePath.replace(/^\.\.\//, '')}`;
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | 永旭智慧財產事務所</title>
<meta name="description" content="${title} - 永旭智慧財產事務所智財知識專欄">
<meta property="og:title" content="${title} | 永旭智慧財產事務所">
<meta property="og:description" content="${title} - 智財知識專欄">
<meta property="og:image" content="${absoluteImage}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonicalUrl}">
<link rel="canonical" href="${canonicalUrl}">
<link rel="alternate" hreflang="zh-TW" href="${canonicalUrl}">
<link rel="alternate" hreflang="en" href="${englishUrl}">
<link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
<link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
<div id="site-header-placeholder"></div>
<main class="article-main ys-article-page">
  <div class="container ys-article-column">
    <div class="article-header">
      <span class="article-category">${category.name}</span>
      <h1 class="article-title">${title}</h1>
      <div class="article-meta">
        <span>永旭智財團隊</span>
        <span>${dateStr}</span>
        <span>閱讀約 5 分鐘</span>
      </div>
    </div>
    <figure class="ys-article-hero">
      <img src="${imagePath}" alt="${title}" class="ys-article-hero-image" width="${imageWidth}" height="${imageHeight}">
    </figure>
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
<div id="site-footer-placeholder"></div>
<script src="../assets/js/main.js"></script>
</body>
</html>`;
}

// 產生英文 HTML
function textToHtmlEn(text, titleEn, dateStr, category, imagePath, imageWidth, imageHeight, filenameZh, filenameEn) {
  const htmlBody = parseBody(text);
  const catEn = CATEGORY_EN[category.name] || 'IP Knowledge';
  const [y, m, d] = dateStr.split('-');
  const dateEnStr = `${MONTHS_EN[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
  const chineseUrl = `https://ysipo.com.tw/insights/${filenameZh}`;
  const canonicalUrl = `https://ysipo.com.tw/insights/${filenameEn}`;
  const absoluteImage = imagePath.startsWith('http')
    ? imagePath
    : `https://ysipo.com.tw/${imagePath.replace(/^\.\.\//, '')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleEn} | Yong Syu Intellectual Property Office</title>
<meta name="description" content="${titleEn} - YSIPO IP Knowledge Column">
<meta property="og:title" content="${titleEn} | YSIPO">
<meta property="og:description" content="${titleEn} - IP Knowledge Column">
<meta property="og:image" content="${absoluteImage}">
<meta property="og:type" content="article">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${canonicalUrl}">
<link rel="canonical" href="${canonicalUrl}">
<link rel="alternate" hreflang="zh-TW" href="${chineseUrl}">
<link rel="alternate" hreflang="en" href="${canonicalUrl}">
<link rel="alternate" hreflang="x-default" href="${chineseUrl}">
<link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
<div id="site-header-placeholder"></div>
<main class="article-main ys-article-page">
  <div class="container ys-article-column">
    <div class="article-header">
      <span class="article-category">${catEn}</span>
      <h1 class="article-title">${titleEn}</h1>
      <div class="article-meta">
        <span>YSIPO Team</span>
        <span>${dateEnStr}</span>
        <span>~5 min read</span>
      </div>
    </div>
    <figure class="ys-article-hero">
      <img src="${imagePath}" alt="${titleEn}" class="ys-article-hero-image" width="${imageWidth}" height="${imageHeight}">
    </figure>
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
<div id="site-footer-placeholder"></div>
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

    // 用 FLUX.1 即時生成專屬配圖；失敗會重試，避免發布重複的分類共用圖
    console.log('🎨 生成專屬配圖（FLUX.1）...');
    let imagePath;
    let imageField;
    let generatedImageFile = null;
    let imgResult = null;
    for (let attempt = 0; attempt < 2 && !imgResult; attempt++) {
      imgResult = await generateArticleImage(category, dateStr, timestamp, attempt);
      if (!imgResult && attempt === 0) console.log('  ⚠️ 首次生圖失敗，改用另一個寫實場景重試...');
    }
    if (imgResult) {
      imagePath = imgResult.htmlPath;
      imageField = imgResult.jsonPath;
      generatedImageFile = imgResult.absFile;
      console.log(`🖼️  AI 生圖成功：${imgResult.jsonPath}`);
    } else {
      throw new Error('專屬配圖連續兩次生成失敗，已停止發布，避免使用重複的分類共用圖。');
    }

    // 產生 HTML
    const htmlZh = textToHtml(articleZh, titleZh, dateStr, category, imagePath, imgResult.width, imgResult.height, filenameZh, filenameEn);
    const htmlEn = textToHtmlEn(articleEn, titleEn, dateStr, category, imagePath, imgResult.width, imgResult.height, filenameZh, filenameEn);

    // 確保 insights 資料夾存在
    if (!fs.existsSync(INSIGHTS_DIR)) {
      fs.mkdirSync(INSIGHTS_DIR, { recursive: true });
    }

    // 寫入檔案
    fs.writeFileSync(path.join(INSIGHTS_DIR, filenameZh), htmlZh, 'utf8');
    console.log(`💾 中文：insights/${filenameZh}`);

    fs.writeFileSync(path.join(INSIGHTS_DIR, filenameEn), htmlEn, 'utf8');
    console.log(`💾 英文：insights/${filenameEn}`);

    // 寫入後、提交前檢查全部文章格式；任何主圖位置或比例錯誤都停止發布
    execSync(`node "${path.join(__dirname, 'check-article-layout.js')}"`, { stdio: 'inherit' });
    console.log('✅ 文章主圖位置、比例與欄寬格式檢查通過');

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
