const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeCandidates } = require('./generate-news');

const candidates = [{ title: '專利公告一', source: '來源' }, { title: '專利公告二', source: '來源' }];

test('empty feed and editorial skips can finish with no drafts', async () => {
  assert.deepEqual(await summarizeCandidates([], () => assert.fail('不應呼叫模型')), []);
  assert.deepEqual(await summarizeCandidates(candidates, (_messages, { validate }) => validate('{"skip":true}')), []);
});

test('model and summary-format errors cannot silently produce zero drafts', async () => {
  await assert.rejects(summarizeCandidates(candidates, async () => {
    throw new Error('NVIDIA HTTP 410');
  }), /2 則摘要發生錯誤.*HTTP 410/);
  await assert.rejects(summarizeCandidates(candidates, (_messages, { validate }) => (
    validate('{"skip":"true","title":"缺少摘要"}')
  )), /缺少有效的標題或摘要/);
});

test('an individually failed summary does not discard a valid draft', async () => {
  let count = 0;
  const drafts = await summarizeCandidates(candidates, (_messages, { validate }) => {
    if (++count === 1) throw new Error('NVIDIA 請求逾時');
    return validate('```json\n{"title":"公告摘要","summary":"公開資訊"}\n```');
  });
  assert.deepEqual(drafts, [
    { ...candidates[1], origTitle: candidates[1].title, displayTitle: '公告摘要', summary: '公開資訊' },
  ]);
});

test('an editorial skip leaves room for the next candidate without exceeding the draft limit', async () => {
  let count = 0;
  const drafts = await summarizeCandidates([...candidates, { title: '第三則', source: '來源' }], () => {
    if (++count === 1) return { skip: true };
    return { title: '公告摘要', summary: '公開資訊' };
  }, 1);
  assert.equal(count, 2);
  assert.equal(drafts[0].origTitle, candidates[1].title);
});
