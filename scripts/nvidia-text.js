const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const DEFAULT_FALLBACK = 'nvidia/nemotron-3.5-bolt-e4b';

function parseCompletion(body, status) {
  if (status !== 200) {
    const description = { 401: 'API 金鑰驗證失敗', 403: '模型存取遭拒', 404: '找不到模型端點', 410: '模型端點已停用', 429: '請求受到限制' }[status];
    const error = new Error(`NVIDIA HTTP ${status}${description ? `（${description}）` : ''}`);
    error.status = status;
    error.retryable = [408, 429].includes(status) || status >= 500;
    throw error;
  }

  let payload;
  try { payload = JSON.parse(body); }
  catch { throw new Error('NVIDIA 回應不是 JSON'); }

  const choice = payload?.choices?.[0];
  const reason = choice?.finish_reason;
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(`AI 未回傳文章正文${reason === 'length' ? '（finish_reason: length）' : ''}`);
  }
  if (reason === 'length') throw new Error('AI 回應達到長度上限，內容可能不完整');
  if (reason === 'content_filter') throw new Error('AI 回應未通過內容過濾');
  return content;
}

function createNvidiaTextClient(apiKey, { env = process.env, request = fetch, wait = delay, warn = console.warn, defaultModels = [DEFAULT_MODEL, DEFAULT_FALLBACK] } = {}) {
  const models = [...new Set([
    env.NVIDIA_TEXT_MODEL?.trim() || defaultModels[0],
    env.NVIDIA_TEXT_FALLBACK_MODEL?.trim() || defaultModels[1],
  ])];

  return async function complete(messages, { temperature, maxTokens, label, validate = (content) => content, timeoutMs = 75_000 }) {
    if (!apiKey) throw new Error('缺少 NVIDIA_API_KEY');
    const failures = [];
    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          let response;
          let body;
          try {
            response = await request('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              signal: AbortSignal.timeout(timeoutMs),
              headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, chat_template_kwargs: { enable_thinking: false } }),
            });
            body = await response.text();
          } catch (cause) {
            const timedOut = cause.name === 'TimeoutError' || cause.name === 'AbortError';
            const error = new Error(timedOut ? 'NVIDIA 請求逾時' : 'NVIDIA 連線或讀取失敗');
            error.retryable = true;
            throw error;
          }
          const result = validate(parseCompletion(body, response.status));
          console.log(`${label}完成（${model}）`);
          return result;
        } catch (error) {
          failures.push(`${model}: ${error.message}`);
          warn(`${label}第 ${attempt} 次嘗試失敗（${failures.at(-1)}）`);
          if (error.status === 401) throw new Error(`${label}失敗：${error.message}`);
          if (!error.retryable || attempt === 2) break;
          await wait(2000);
        }
      }
    }
    throw new Error(`${label}失敗：${failures.join('；')}`);
  };
}

module.exports = { createNvidiaTextClient, parseCompletion };
