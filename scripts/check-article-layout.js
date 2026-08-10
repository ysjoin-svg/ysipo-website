'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');
const ARTICLE_DIRS = [
  path.join(ROOT, 'insights'),
  path.join(ROOT, 'en', 'insights'),
];

function getArticleFiles() {
  return ARTICLE_DIRS.flatMap((dir) => fs.readdirSync(dir)
    .filter((name) => /^article-.*\.html$/i.test(name) && name !== 'article-template.html')
    .map((name) => path.join(dir, name)));
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

function classTokenIndexes(html, token) {
  const indexes = [];
  const classRe = /class="([^"]*)"/gi;
  let match;
  while ((match = classRe.exec(html))) {
    if (match[1].split(/\s+/).includes(token)) indexes.push(match.index);
  }
  return indexes;
}

function findBalancedDivEnd(html, start) {
  const tokenRe = /<div\b[^>]*>|<\/div>/gi;
  tokenRe.lastIndex = start;
  let depth = 0;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<div\b/i.test(token[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) return tokenRe.lastIndex;
  }
  return -1;
}

function findHeaderEnd(html) {
  const headerStart = html.search(/<(?:header|div)\b[^>]*class="[^"]*\barticle-header\b[^"]*"/i);
  if (headerStart < 0) return -1;
  if (/^<header\b/i.test(html.slice(headerStart))) {
    const close = html.indexOf('</header>', headerStart);
    return close < 0 ? -1 : close + '</header>'.length;
  }
  return findBalancedDivEnd(html, headerStart);
}

function normalizeImageTag(tag) {
  const width = Number(getAttr(tag, 'width')) || 1200;
  const height = Number(getAttr(tag, 'height')) || 675;
  let normalized = tag
    .replace(/\sclass="[^"]*"/i, '')
    .replace(/\sstyle="[^"]*"/i, '')
    .replace(/\swidth="[^"]*"/i, '')
    .replace(/\sheight="[^"]*"/i, '')
    .replace(/\s*\/?>$/, '');
  normalized += ` class="ys-article-hero-image" width="${width}" height="${height}">`;
  return normalized;
}

function normalizeArticle(html) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  let result = html
    .replace(/id="header-placeholder"/g, 'id="site-header-placeholder"')
    .replace(/id="footer-placeholder"/g, 'id="site-footer-placeholder"')
    .replace(/<main class="article-main">/i, '<main class="article-main ys-article-page">')
    .replace(/<main id="main-content">/i, '<main id="main-content" class="ys-article-page">')
    .replace(/<article class="article-body">/i, '<article class="article-body ys-article-column">');

  const mainStart = result.search(/<main\b[^>]*class="[^"]*\barticle-main\b/i);
  if (mainStart >= 0) {
    const before = result.slice(0, mainStart);
    const after = result.slice(mainStart).replace(
      /<div class="container">/i,
      '<div class="container ys-article-column">'
    );
    result = before + after;
  }

  let imageTag = '';
  const oldHero = result.match(/\s*<div class="article-hero">\s*(<img\b[^>]*>)\s*<\/div>\s*/i);
  if (oldHero) {
    imageTag = oldHero[1];
    result = result.slice(0, oldHero.index) + eol + result.slice(oldHero.index + oldHero[0].length);
  } else {
    const cover = result.match(/<img\b[^>]*src="[^"]*assets\/img\/generated\/insight-[^"]+"[^>]*>/i);
    if (cover) {
      imageTag = cover[0];
      result = result.slice(0, cover.index) + result.slice(cover.index + cover[0].length);
    }
  }

  if (!imageTag) return result;

  const headerEnd = findHeaderEnd(result);
  if (headerEnd < 0) return result;
  const lineStart = result.lastIndexOf('\n', headerEnd) + 1;
  const indent = (result.slice(lineStart, headerEnd).match(/^\s*/) || ['    '])[0];
  const figure = [
    '',
    `${indent}<figure class="ys-article-hero">`,
    `${indent}  ${normalizeImageTag(imageTag)}`,
    `${indent}</figure>`,
    '',
  ].join(eol);
  result = result.slice(0, headerEnd) + figure + result.slice(headerEnd).replace(/^\s*\r?\n/, eol);
  return result;
}

function inspectArticle(file, html) {
  const issues = [];
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const heroIndexes = classTokenIndexes(html, 'ys-article-hero');
  if (heroIndexes.length !== 1) issues.push(`主圖容器數量應為 1，實際為 ${heroIndexes.length}`);

  const figure = html.match(/<figure\b[^>]*class="[^"]*\bys-article-hero\b[^"]*"[^>]*>[\s\S]*?<\/figure>/i);
  if (!figure) {
    issues.push('缺少標準 <figure class="ys-article-hero">');
  } else {
    const img = figure[0].match(/<img\b[^>]*>/i);
    if (!img) {
      issues.push('主圖容器內缺少 img');
    } else {
      const className = getAttr(img[0], 'class');
      const width = Number(getAttr(img[0], 'width'));
      const height = Number(getAttr(img[0], 'height'));
      if (!className.split(/\s+/).includes('ys-article-hero-image')) issues.push('主圖缺少 ys-article-hero-image class');
      if (!width || !height || Math.abs(width / height - 16 / 9) > 0.01) issues.push(`主圖 width/height 不是 16:9（${width || '?'}×${height || '?'}）`);
      if (/\sstyle=/i.test(img[0])) issues.push('主圖不可使用 inline style');
    }
  }

  const headerIndex = html.search(/class="[^"]*\barticle-header\b/i);
  const heroIndex = heroIndexes.length ? heroIndexes[0] : -1;
  const contentIndexes = [
    html.search(/class="[^"]*\barticle-content\b/i),
    html.search(/<section\b[^>]*aria-label=/i),
  ].filter((index) => index >= 0);
  const contentIndex = contentIndexes.length ? Math.min(...contentIndexes) : -1;
  if (headerIndex < 0 || heroIndex < headerIndex) issues.push('主圖必須位於文章標題區之後');
  if (contentIndex >= 0 && heroIndex > contentIndex) issues.push('主圖必須位於文章正文之前');

  if (!/class="[^"]*\bys-article-column\b/i.test(html)) issues.push('缺少統一文章欄寬 ys-article-column');
  if (!html.includes('id="site-header-placeholder"')) issues.push('頁首 placeholder ID 不正確');
  if (!html.includes('id="site-footer-placeholder"')) issues.push('頁尾 placeholder ID 不正確');
  return { rel, issues };
}

const files = getArticleFiles();
let changed = 0;

if (FIX) {
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const normalized = normalizeArticle(original);
    if (normalized !== original) {
      fs.writeFileSync(file, normalized, 'utf8');
      changed += 1;
    }
  }
}

const results = files.map((file) => inspectArticle(file, fs.readFileSync(file, 'utf8')));
const failures = results.filter((result) => result.issues.length);

console.log(`文章頁：${files.length}；修正：${changed}；格式異常：${failures.length}`);
for (const failure of failures) {
  console.log(`- ${failure.rel}`);
  for (const issue of failure.issues) console.log(`  - ${issue}`);
}

if (failures.length) process.exitCode = 1;
