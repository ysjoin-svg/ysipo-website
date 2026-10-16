'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseNvidiaArticleResponse, missingCredentials } = require('./generate-article');

test('draft mode only needs the article API key', () => {
  assert.deepEqual(missingCredentials(true, { NVIDIA_API_KEY: 'test' }), []);
  assert.deepEqual(missingCredentials(false, { NVIDIA_API_KEY: 'test' }), ['CF_ZONE_ID', 'CF_API_TOKEN']);
});

test('accepts nonempty article text', () => {
  const body = JSON.stringify({ choices: [{ message: { content: '文章標題\n正文' }, finish_reason: 'stop' }] });
  assert.equal(parseNvidiaArticleResponse(body, 200), '文章標題\n正文');
});

test('reports missing reasoning-model content without a null trim error', () => {
  const body = JSON.stringify({ choices: [{ message: { content: null }, finish_reason: 'length' }] });
  assert.throws(() => parseNvidiaArticleResponse(body, 200), /未回傳文章正文.*finish_reason: length/);
  assert.throws(() => parseNvidiaArticleResponse(JSON.stringify({ choices: [] }), 200), /未回傳文章正文/);
});

test('separates API failures and malformed responses from missing article text', () => {
  assert.throws(() => parseNvidiaArticleResponse(JSON.stringify({ error: { message: 'rate limit' } }), 429), /HTTP 429：rate limit/);
  assert.throws(() => parseNvidiaArticleResponse('<html>error</html>', 502), /回應不是 JSON（HTTP 502）/);
  assert.throws(() => parseNvidiaArticleResponse('null', 200), /未回傳文章正文/);
});
