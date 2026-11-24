'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { missingCredentials } = require('./generate-article');
const { parseCompletion, createNvidiaTextClient } = require('./nvidia-text');

test('draft mode only needs the article API key', () => {
  assert.deepEqual(missingCredentials(true, { NVIDIA_API_KEY: 'test' }), []);
  assert.deepEqual(missingCredentials(false, { NVIDIA_API_KEY: 'test' }), ['CF_ZONE_ID', 'CF_API_TOKEN']);
});

test('accepts nonempty article text', () => {
  const body = JSON.stringify({ choices: [{ message: { content: '文章標題\n正文' }, finish_reason: 'stop' }] });
  assert.equal(parseCompletion(body, 200), '文章標題\n正文');
});

test('reports missing reasoning-model content without a null trim error', () => {
  const body = JSON.stringify({ choices: [{ message: { content: null }, finish_reason: 'length' }] });
  assert.throws(() => parseCompletion(body, 200), /未回傳文章正文.*finish_reason: length/);
  assert.throws(() => parseCompletion(JSON.stringify({ choices: [] }), 200), /未回傳文章正文/);
});

test('separates API failures and malformed responses from missing article text', () => {
  assert.throws(() => parseCompletion('{}', 429), /HTTP 429/);
  assert.throws(() => parseCompletion('<html>error</html>', 502), /HTTP 502/);
  assert.throws(() => parseCompletion('<html>error</html>', 200), /回應不是 JSON/);
  assert.throws(() => parseCompletion('null', 200), /未回傳文章正文/);
});

function mockClient(responses) {
  const calls = [];
  const waits = [];
  const complete = createNvidiaTextClient('test', {
    env: { NVIDIA_TEXT_MODEL: 'primary', NVIDIA_TEXT_FALLBACK_MODEL: 'backup' },
    request: async (_url, options) => {
      calls.push(JSON.parse(options.body).model);
      return responses.shift();
    },
    wait: async (ms) => { waits.push(ms); },
    warn: () => {},
  });
  return { calls, waits, complete };
}

function completion(content, finishReason = 'stop') {
  return Response.json({ choices: [{ message: { content }, finish_reason: finishReason }] });
}

const options = { temperature: 0.5, maxTokens: 100, label: '測試產稿' };

test('retired primary model switches directly to configured backup', async () => {
  const { calls, waits, complete } = mockClient([new Response('gone', { status: 410 }), completion('標題\n正文')]);
  assert.equal(await complete([], options), '標題\n正文');
  assert.deepEqual(calls, ['primary', 'backup']);
  assert.deepEqual(waits, []);
});

test('transient failure retries once, then truncated output triggers fallback', async () => {
  const { calls, waits, complete } = mockClient([
    new Response('limit', { status: 429 }), completion('未完', 'length'), completion('完整'),
  ]);
  assert.equal(await complete([], options), '完整');
  assert.deepEqual(calls, ['primary', 'primary', 'backup']);
  assert.deepEqual(waits, [2000]);
});

test('both models failing reports both statuses without exposing response data', async () => {
  const { complete } = mockClient([new Response('private detail', { status: 404 }), new Response('gone', { status: 410 })]);
  await assert.rejects(complete([], options), { message: /^測試產稿失敗：primary: NVIDIA HTTP 404[^；]*；backup: NVIDIA HTTP 410[^；]*$/ });
});

test('invalid shared credential stops immediately', async () => {
  const { calls, complete } = mockClient([new Response('', { status: 401 })]);
  await assert.rejects(complete([], options), /驗證失敗/);
  assert.deepEqual(calls, ['primary']);
});
