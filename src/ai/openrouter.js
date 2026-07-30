export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
export const ASK_MODELS = [
  'inclusionai/ling-3.0-flash:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free'
];
export const TOOL_MODELS = [
  'inclusionai/ling-3.0-flash:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free'
];

function withOpenRouterHeaders(apiKey, title) {
  return {
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
    'X-Title': title,
    'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://kynessiscozy.github.io/wenV2/'
  };
}

function fetchWithTimeout(url, options, timeoutMs=22000) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
function cleanTurns(turns) {
  return (turns||[]).slice(-6).map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||'').slice(0,700)})).filter(x=>x.content);
}

function buildAskSystemPrompt({ systemPrompt, aiPrefs, chartContext }) {
  return systemPrompt
    + '\n回复偏好：'
    + (aiPrefs?.natural ? '使用自然口语。' : '直接、少寒暄。')
    + (aiPrefs?.length === 'standard' ? '回复可放宽到180至260字。' : '保持简洁。')
    + '\n用户命盘：\n'
    + String(chartContext||'').slice(0,5000)
    + '\n当前时间：'
    + new Date().toLocaleString('zh-CN');
}

export async function streamAskAnswer({
  apiKey,
  systemPrompt,
  chartContext,
  question,
  aiPrefs = { natural: true, length: 'short' },
  previousTurns = [],
  models = ASK_MODELS,
  onDelta
}) {
  if (!apiKey) throw new Error('missing OpenRouter API key');

  let full = '';
  for (const model of models) {
    try {
      full = '';
      const resp = await fetchWithTimeout(OPENROUTER_BASE + '/chat/completions', {
        method: 'POST',
        headers: withOpenRouterHeaders(apiKey, 'Wenwen Dashi'),
        body: JSON.stringify({
          model,
          stream: true,
          temperature: aiPrefs?.temperature ?? 0.55,
          max_tokens: aiPrefs?.length === 'standard' ? 320 : 240,
          messages: [
            {
              role: 'system',
              content: buildAskSystemPrompt({ systemPrompt, aiPrefs, chartContext })
            },
            ...cleanTurns(previousTurns),
            { role: 'user', content: question }
          ]
        })
      });

      if (!resp.ok || !resp.body) {
        let body = '';
        try { body = await resp.text(); } catch (_) {}
        throw new Error('HTTP ' + resp.status + ' ' + body.slice(0, 80));
      }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;
          const raw = s.slice(5).trim();
          if (raw === '[DONE]') continue;
          let js;
          try { js = JSON.parse(raw); } catch (_) { continue; }
          if (js.error) throw new Error('provider:' + (js.error.message || '').slice(0, 80));
          const delta = js.choices?.[0]?.delta;
          if (delta?.content) {
            full += delta.content;
            onDelta?.(full, delta.content, model);
          }
        }
      }

      if(buf.trim().startsWith('data:')){
        const raw=buf.trim().slice(5).trim();
        if(raw&&raw!=='[DONE]'){try{const js=JSON.parse(raw),content=js.choices?.[0]?.delta?.content||'';if(content){full+=content;onDelta?.(full,content,model)}}catch(_){} }
      }
      if (full.trim()) return full;
    } catch (_) {
      // 免费模型容易限流/不可用，自动尝试下一个模型。
    }
  }

  throw new Error('all OpenRouter models failed');
}

export async function askToolInsight({
  apiKey,
  typeLabel,
  source,
  chartSummary,
  models = TOOL_MODELS
}) {
  if (!apiKey) throw new Error('missing OpenRouter API key');
  const prompt = `你是一个简洁、有人情味的决策助理。用户刚完成“${typeLabel}”工具。请结合工具结果给一段自然中文回复，先接住用户可能的顾虑，再指出一个最重要的现实重点，最后给一个今天就能做的小动作。不要重复整份结果，不要把命理说成事实，不要使用标题、编号或夸张承诺，控制在100字以内。工具结果：${source}。用户命盘参考：${chartSummary}。`;

  for (const model of models) {
    try {
      const resp = await fetchWithTimeout(OPENROUTER_BASE + '/chat/completions', {
        method: 'POST',
        headers: withOpenRouterHeaders(apiKey, 'Wenwen Dashi Tool'),
        body: JSON.stringify({
          model,
          temperature: 0.65,
          max_tokens: 180,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!resp.ok) continue;
      const json = await resp.json();
      const answer = json.choices?.[0]?.message?.content?.trim() || '';
      if (answer) return answer;
    } catch (_) {}
  }

  throw new Error('all OpenRouter tool models failed');
}
