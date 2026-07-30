import { getCtx } from '../state/context.js';
import { openToolPage } from '../tools/center.js';
import { KB } from '../ai/kb.js';
import { KBSearch, smartAnswer, extractIntents, buildBaziContext } from '../ai/smart-answer.js';
import { generateAnswerFallback } from '../ai/fallback.js';
import { streamAskAnswer, probeConnection, getConnState, onConnChange, modelLabel } from '../ai/openrouter.js';
import { renderSmartAnswer, renderRouteButtons, buildRelatedRoutes, formatStandardAnswer } from '../render/ai.js';

/* ============================================================
   问问大师 · 重构版 — ChatGPT 气泡式对话
   含：AI 模型触发机制 + 连接状态面板
   ============================================================ */

// —— 时间格式 ——
function _ts() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ============================================================
   连接状态 UI
   ============================================================ */
const _STATE_MAP = {
  unknown:  { dot: 'conn-unknown',  text: '未检测' },
  checking: { dot: 'conn-checking', text: '检测中…' },
  online:   { dot: 'conn-online',   text: '已连接' },
  offline:  { dot: 'conn-offline',  text: '离线' },
};

function _updateConnUI(state) {
  const bar = document.getElementById('aiConnBar');
  if (!bar) return;
  const cfg = _STATE_MAP[state] || _STATE_MAP.unknown;
  bar.className = 'ai-conn-bar ' + cfg.dot;
  bar.querySelector('.ai-conn-text').textContent = cfg.text;
}

function _ensureConnBar() {
  if (document.getElementById('aiConnBar')) return;
  const head = document.querySelector('#aiSheet .ai-head');
  if (!head) return;
  const bar = document.createElement('div');
  bar.id = 'aiConnBar';
  bar.className = 'ai-conn-bar conn-unknown';
  bar.innerHTML =
    '<span class="ai-conn-dot"></span>' +
    '<span class="ai-conn-text">未检测</span>' +
    '<span class="ai-conn-model" id="aiConnModel"></span>';
  head.appendChild(bar);
  // 订阅状态变化
  onConnChange(_updateConnUI);
  // 立即显示当前状态
  _updateConnUI(getConnState());
}

function _setModelLabel(modelId) {
  const el = document.getElementById('aiConnModel');
  if (!el) return;
  if (modelId) {
    el.textContent = modelLabel(modelId);
    el.title = modelId;
  } else {
    el.textContent = '';
  }
}

/* ============================================================
   消息来源标签 — 显示在每条 AI 回复气泡底部
   ============================================================ */
function _sourceTag(type, detail) {
  // type: 'ai' | 'kb' | 'fallback' | 'local'
  const map = {
    ai:       { icon: '⚡', label: 'AI' },
    kb:       { icon: '📖', label: '信息库' },
    fallback: { icon: '📴', label: '离线' },
    local:    { icon: '💬', label: '本地' },
  };
  const cfg = map[type] || map.local;
  const extra = detail ? ' · ' + detail : '';
  return '<span class="chat-source">' + cfg.icon + ' ' + cfg.label + extra + '</span>';
}

/* ============================================================
   渲染函数
   ============================================================ */

// —— 欢迎消息 ——
function _renderWelcome(el) {
  const ctx = window._ctx;
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  let contextLine = '随时问我关于事业、关系、近期选择的问题。';
  if (ctx) {
    contextLine = '我已连接你的命盘（' + ctx.dg + ctx.dw + '），随时可以聊。';
  }
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-welcome';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '<div class="chat-welcome-greeting">' + greeting + '！我是问问大师 ✦</div>' +
        '<div class="chat-welcome-desc">' + contextLine + '</div>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
}

// —— 用户气泡 ——
function _renderUserBubble(el, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-user';
  msgDiv.innerHTML =
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-user">' + _escHtml(text) + '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _scrollToBottom(el);
}

// —— Typing indicator ——
function _showTyping(el, hint) {
  let indicator = el.querySelector('.chat-typing');
  if (indicator) {
    // 更新提示文字
    const hintEl = indicator.querySelector('.typing-hint');
    if (hintEl && hint) hintEl.textContent = hint;
    return indicator;
  }
  indicator = document.createElement('div');
  indicator.className = 'chat-msg chat-msg-ai chat-typing';
  indicator.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '<div class="typing-dots"><span></span><span></span><span></span></div>' +
        '<div class="typing-hint">' + (hint || '') + '</div>' +
      '</div>' +
    '</div>';
  el.appendChild(indicator);
  _scrollToBottom(el);
  return indicator;
}
function _hideTyping(el) {
  const indicator = el.querySelector('.chat-typing');
  if (indicator) indicator.remove();
}

// —— AI 回复气泡（含来源标签）——
function _createAiBubble(el, sourceType, sourceDetail) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai"><div class="chat-ai-text"></div></div>' +
      '<div class="chat-bubble-footer">' +
        _sourceTag(sourceType || 'local', sourceDetail || '') +
        '<div class="chat-actions">' +
          '<button type="button" data-act="copy" title="复制回答">复制</button>' +
          '<button type="button" data-act="retry" title="重新回答">重试</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _scrollToBottom(el);
  return msgDiv.querySelector('.chat-ai-text');
}

// —— KB 信息库气泡 ——
function _renderKbBubble(el, kbRes, q) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  const kbHtml = renderSmartAnswer(kbRes, q);
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai chat-bubble-kb">' + kbHtml + '</div>' +
      '<div class="chat-bubble-footer">' +
        _sourceTag('kb', kbRes.kind === 'term' ? '术语' : '命中 FAQ') +
        '<div class="chat-actions">' +
          '<button type="button" data-act="copy" title="复制回答">复制</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _scrollToBottom(el);
}

// —— 工具调用气泡 ——
function _renderToolCallBubble(el, short, toolId) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '可以，直接开始这个小工具，填完后我再帮你看结果。' +
        '<button class="chat-tool-btn" type="button">开始 · ' + short + ' →</button>' +
      '</div>' +
      '<div class="chat-bubble-footer">' + _sourceTag('local', '工具路由') + '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  msgDiv.querySelector('.chat-tool-btn').onclick = () => {
    window._returnToAI = true;
    closeAsk();
    setTimeout(() => openToolPage(toolId), 180);
  };
  el.appendChild(msgDiv);
  _scrollToBottom(el);
}

// —— 无命盘提示 ——
function _renderNeedChart(el) {
  _hideTyping(el);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg-ai chat-msg-appear';
  msgDiv.innerHTML =
    '<div class="chat-avatar">✦</div>' +
    '<div class="chat-content">' +
      '<div class="chat-bubble chat-bubble-ai">' +
        '请先完成命盘排盘，我才能给出有针对性的建议。' +
        '<button class="chat-tool-btn" type="button" onclick="closeAsk();goBack();">前往填写出生信息 →</button>' +
      '</div>' +
      '<div class="chat-meta">' + _ts() + '</div>' +
    '</div>';
  el.appendChild(msgDiv);
  _scrollToBottom(el);
}

// —— 辅助 ——
function _escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _scrollToBottom(el) { requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }); }
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ============================================================
   公开 API
   ============================================================ */

export function openAsk() {
  if (document.getElementById('aiSheet')?.classList.contains('open')) { closeAsk(); return; }

  const fab = document.getElementById('aiFab');
  if (fab) { fab.classList.remove('fab-pop'); void fab.offsetWidth; fab.classList.add('fab-pop'); fab.addEventListener('animationend', () => fab.classList.remove('fab-pop'), { once: true }); }

  document.getElementById('aiOverlay').classList.add('open');
  document.getElementById('aiSheet').classList.add('open');

  // 上下文
  const context = document.getElementById('aiContext');
  const d = window._ctx;
  if (context && d) {
    context.innerHTML = '<span>✦ 当前命盘</span><b>' + d.dg + d.dw + ' · ' + (d.wx.st ? '行动型节奏' : '蓄力型节奏') + '</b>';
  }

  // 连接状态栏
  _ensureConnBar();

  // 首次打开：欢迎消息 + 连接探测
  const body = document.getElementById('askResult');
  if (body && !body.querySelector('.chat-msg')) {
    _renderWelcome(body);
    // 启动连接探测
    const apiKey = import.meta.env.VITE_API_KEY;
    probeConnection(apiKey);
  }

  setTimeout(() => document.getElementById('askInput')?.focus(), 300);
}

export function closeAsk() {
  document.getElementById('aiOverlay').classList.remove('open');
  document.getElementById('aiSheet').classList.remove('open');
  document.getElementById('aiSuggest')?.classList.remove('show');
}

export function newAskChat() {
  window._aiConversation = [];
  const result = document.getElementById('askResult');
  const input = document.getElementById('askInput');
  const sug = document.getElementById('aiSuggest');
  if (result) { result.innerHTML = ''; _renderWelcome(result); }
  if (input) { input.value = ''; input.style.height = 'auto'; input.focus(); }
  if (sug) { sug.innerHTML = ''; sug.classList.remove('show'); }
  _setModelLabel('');
}

export function aiToolRequest(q) {
  const x = String(q || '').trim();
  if (!/(打开|使用|开始|做一下|帮我|调用|进入|测一下|测评)/.test(x)) return false;
  const rules = [
    [/财运|理财|现金流|财富/, 'wealth', '财运与理财罗盘'],
    [/转行|副业|职业选择|换工作/, 'career', '转行与副业测评'],
    [/裁员|失业|职场风险/, 'layoff', '裁员风险检测'],
    [/关系沟通|伴侣沟通|感情沟通/, 'relation', '关系沟通分析'],
    [/穿搭|工位|环境|颜色|风水/, 'style', '能量穿搭与工位风水'],
    [/择日|重要事项|安排日期/, 'date', '重要事项择日助手'],
    [/今日日签|今日提醒|日签/, 'daily', '今日日签'],
    [/起名|取名|名字/, 'name', '智能起名工具'],
    [/摇签|问卜|抽签/, 'oracle', '摇签问卜'],
    [/彩票|双色球|大乐透|选号/, 'lottery', '娱乐选号'],
    [/生肖合冲|生肖关系/, 'zodiac', '生肖合冲分析']
  ];
  const hit = rules.find(([re]) => re.test(x));
  if (!hit) return false;
  const el = document.getElementById('askResult');
  if (!el) return false;
  const short = { wealth: '财运', career: '转行', layoff: '职场风险', relation: '关系沟通', style: '环境', date: '择日', daily: '日签', name: '起名', oracle: '摇签', lottery: '选号', zodiac: '生肖' }[hit[1]] || '工具';
  _renderToolCallBubble(el, short, hit[1]);
  return true;
}

// —— 闲聊检测 ——
function _handleCasualChat(q, el) {
  const x = (q || '').trim();
  if (!/^(你好|嗨|哈喽|在吗|有人吗|早上好|晚上好|晚安|谢谢|感谢|哈哈|好的|明白了)[！!。？?\s]*$/.test(x)) return false;
  let reply;
  if (/谢谢|感谢/.test(x)) reply = '不用客气。你想继续聊刚才的事，还是换一个话题？';
  else if (/晚安|晚上好/.test(x)) reply = '晚上好。今天如果已经很累了，先把事情放一放，休息本身也是一种推进。';
  else if (/好的|明白了/.test(x)) reply = '好。如果你之后想到新的细节，直接接着说就行，我会沿着当前话题继续。';
  else reply = '我在。你可以先随便说说最近发生了什么，不一定要整理成一个正式问题。';

  _showTyping(el);
  _delay(300 + Math.random() * 300).then(() => {
    const textEl = _createAiBubble(el, 'local', '快捷应答');
    textEl.textContent = reply;
    _scrollToBottom(el);
  });
  return true;
}

export function doAsk(q) {
  if (!document.getElementById('aiSheet').classList.contains('open')) openAsk();
  const input = document.getElementById('askInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }
  const countEl = document.getElementById('aiCount');
  if (countEl) countEl.textContent = '0 / 500';
  document.getElementById('aiSuggest')?.classList.remove('show');
  try { sessionStorage.setItem('tj_ai_draft', ''); } catch (e) {}

  const el = document.getElementById('askResult');
  _renderUserBubble(el, q);
  if (_handleCasualChat(q, el)) return;
  if (aiToolRequest(q)) return;
  generateAnswer(q);
}

export function doAskCustom() {
  const input = document.getElementById('askInput');
  const q = input?.value.trim();
  if (!q) return;
  input.value = '';
  input.style.height = 'auto';
  const countEl = document.getElementById('aiCount');
  if (countEl) countEl.textContent = '0 / 500';
  document.getElementById('aiSuggest')?.classList.remove('show');
  try { sessionStorage.setItem('tj_ai_draft', ''); } catch (e) {}

  const el = document.getElementById('askResult');
  _renderUserBubble(el, q);
  if (_handleCasualChat(q, el)) return;
  if (aiToolRequest(q)) return;
  generateAnswer(q);
}

// —— 分类 ——
export function aiSwitchCat(el) { document.querySelectorAll('.ai-cat').forEach(c => c.classList.remove('active')); el.classList.add('active'); aiRefreshChips(el.dataset.cat); }
export function aiRefreshChips(cat) {
  const wrap = document.getElementById('aiChips'); if (!wrap) return;
  let list = [];
  if (cat === 'hot') { const seen = new Set(); ['事业', '财富', '感情', '健康', '学业', '居住', '玄学'].forEach(it => { const f = KB.faqs.find(x => x.intent === it && !seen.has(x.id)); if (f) { list.push(f); seen.add(f.id); } }); }
  else if (cat === '玄学') { list = KBSearch.byIntent('玄学'); }
  else { list = KBSearch.byIntent(cat); }
  wrap.innerHTML = list.map(f => `<div class="ai-chip" onclick="doAsk('${f.q.replace(/'/g, "\\'")}')">${f.q}</div>`).join('');
  if (cat === '玄学') { wrap.innerHTML += '<div class="ai-divider">术语速查</div>'; wrap.innerHTML += KB.terms.slice(0, 12).map(t => `<div class="ai-chip term" onclick="doAsk('${t.t}')">${t.t}</div>`).join(''); }
}
export function aiOnInputSuggest() { const sug = document.getElementById('aiSuggest'); if (sug) { sug.innerHTML = ''; sug.classList.remove('show'); } }

/* ============================================================
   核心：generateAnswer — 三层触发机制
   ============================================================ */
export async function generateAnswer(q) {
  const d = getCtx();
  const el = document.getElementById('askResult');
  const conversation = window._aiConversation || (window._aiConversation = []);
  const aiPrefs = window.getAISettings ? window.getAISettings() : { natural: true, context: true, length: 'short' };
  const previousTurns = aiPrefs.context ? conversation.slice(-6) : [];

  const contextualFollowUp = previousTurns.length > 0 && (
    q.trim().length <= 18 || /^(那|然后|所以|具体|继续|怎么办|怎么做|为什么|他|她|这个|那我|我呢|可以吗|要不要)/.test(q.trim())
  );

  // ———— 无命盘 ————
  if (!d) {
    _showTyping(el);
    await _delay(600);
    _renderNeedChart(el);
    return;
  }

  // ———— 第 1 层：KB 信息库匹配（本地，零延迟）————
  const kbRes = contextualFollowUp ? null : smartAnswer(q, d);
  if (kbRes) {
    _showTyping(el, '信息库匹配中…');
    await _delay(400 + Math.random() * 300);
    _renderKbBubble(el, kbRes, q);
    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: (kbRes.sections || []).map(s => s.content || '').join(' ').slice(0, 180) });
    return;
  }

  // ———— 第 2 层：AI API 流式调用 ————
  _showTyping(el, '正在连接 AI…');
  _setModelLabel('');

  const ctx = buildBaziContext(d);
  const systemPrompt = `你是「问问」，像一位真正会倾听的朋友，而不是报告生成器。请用自然语言和用户说话：先用一句顺口的承接回应问题，例如"听起来你现在最在意的是……"或"这件事确实容易让人纠结"，但不要凭空猜测用户情绪；接着直接回答，再自然地落到一个现实行动。可以使用"我会建议你先……""如果是我，我会先……"这类口语表达，让回答像真实对话，不要像数据报告。不要套模板，不要使用"根据命盘显示""综合来看""建议如下"等机械套话，也不要每次都把日主、大运、评分重新说一遍。命理只能作为轻量参考，只有和问题确实相关时才自然提一句，并说明现实选择更重要。请认真参考对话历史：如果用户说"那我呢""继续说""这个机会""他/她"等省略表达，要结合上一轮内容理解，不要假装这是全新问题；只有确实无法判断时才追问。每次只抓住最关键的一点，给一个具体、容易开始的行动；不要罗列多条大道理，不要强行分成结论、原因、行动等小标题。信息不足时只问一个问题。语气像熟悉用户的朋友：有温度、坦诚，允许说"我不确定"。中文回复控制在80至180字，通常写成一到两段自然对话。`;

  let usedModel = '';

  // 7 秒慢速提示
  const slowTimer = setTimeout(() => {
    _showTyping(el, '模型响应较慢，正在尝试…');
  }, 7000);

  try {
    let textEl = null;
    const _mkBubble = () => {
      if (textEl) return textEl;
      textEl = _createAiBubble(el, 'ai', modelLabel(usedModel));
      return textEl;
    };

    const result = await streamAskAnswer({
      apiKey: import.meta.env.VITE_API_KEY,
      systemPrompt,
      chartContext: ctx,
      question: q,
      aiPrefs,
      previousTurns,
      onModelSwitch: (m) => {
        usedModel = m;
        _setModelLabel(m);
        _showTyping(el, '正在调用 ' + modelLabel(m) + '…');
      },
      onDelta: (partial) => {
        _mkBubble().innerHTML = formatStandardAnswer(partial);
        _scrollToBottom(el);
      }
    });

    clearTimeout(slowTimer);

    // 更新来源标签
    if (textEl) {
      const footer = textEl.closest('.chat-msg')?.querySelector('.chat-source');
      if (footer) footer.innerHTML = '⚡ AI · ' + modelLabel(result.model);
    }
    _setModelLabel(result.model);

    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: result.text.slice(0, 500) });

    const intents = extractIntents(q);
    const links = buildRelatedRoutes(intents);
    if (links.length && textEl) {
      const routeHtml = renderRouteButtons(links, '前往相关页面查看');
      textEl.closest('.chat-bubble').insertAdjacentHTML('beforeend', routeHtml);
    }
    _scrollToBottom(el);

  } catch (e) {
    clearTimeout(slowTimer);

    // ———— 第 3 层：离线兜底 ————
    _hideTyping(el);
    _setModelLabel('');
    _generateAnswerFallbackChat(q, d, el);
    conversation.push({ role: 'user', content: q });
    conversation.push({ role: 'assistant', content: '已基于当前话题给出建议。' });
  }
}

// —— Fallback 气泡渲染 ——
function _generateAnswerFallbackChat(q, d, el) {
  const textEl = _createAiBubble(el, 'fallback', '本地推算');
  const temp = document.createElement('div');
  generateAnswerFallback(q, d, temp);
  const fallbackText = temp.querySelector('.ai-dialogue-text')?.innerHTML
    || temp.textContent
    || '抱歉，我暂时无法连接到 AI 服务。请稍后再试。';
  textEl.innerHTML = fallbackText;
  _scrollToBottom(el);
}
