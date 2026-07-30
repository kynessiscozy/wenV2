import { getCtx } from '../state/context.js';
import { openToolPage } from '../tools/center.js';
import { KB } from '../ai/kb.js';
import { KBSearch, smartAnswer, extractIntents, buildBaziContext } from '../ai/smart-answer.js';
import { generateAnswerFallback } from '../ai/fallback.js';
import { streamAskAnswer } from '../ai/openrouter.js';
import { renderSmartAnswer, renderRouteButtons, buildRelatedRoutes, formatStandardAnswer } from '../render/ai.js';

export function openAsk(){
  // The Dock icon is a toggle: it closes an already-open anchored chat panel.
  if(document.getElementById('aiSheet')?.classList.contains('open')){
    closeAsk();
    return;
  }
  const fab=document.getElementById('aiFab');
  if(fab){
    fab.classList.remove('fab-pop');void fab.offsetWidth;fab.classList.add('fab-pop');
    fab.addEventListener('animationend',()=>fab.classList.remove('fab-pop'),{once:true});
  }
  document.getElementById('aiOverlay').classList.add('open');
  document.getElementById('aiSheet').classList.add('open');
  const context=document.getElementById('aiContext'),d=window._ctx;
  if(context&&d){context.innerHTML='<span>✦ 当前命盘</span><b>'+d.dg+d.dw+' · '+(d.wx.st?'行动型节奏':'蓄力型节奏')+' · 可直接问事业、关系与近期选择</b>';}
  // 自由提问：打开后直接聚焦输入框。
  setTimeout(()=>document.getElementById('askInput').focus(),300);
}
export function closeAsk(){
  document.getElementById('aiOverlay').classList.remove('open');
  document.getElementById('aiSheet').classList.remove('open');
  document.getElementById('aiSuggest').classList.remove('show');
}
export function newAskChat(){
  window._aiConversation=[];
  const result=document.getElementById('askResult'),input=document.getElementById('askInput'),sug=document.getElementById('aiSuggest');
  if(result)result.innerHTML='';
  if(input){input.value='';input.style.height='auto';input.focus();}
  if(sug){sug.innerHTML='';sug.classList.remove('show');}
}
export function aiToolRequest(q){
  const x=String(q||'').trim();
  if(!/(打开|使用|开始|做一下|帮我|调用|进入|测一下|测评)/.test(x))return false;
  const rules=[
    [/财运|理财|现金流|财富/, 'wealth','财运与理财罗盘'],[/转行|副业|职业选择|换工作/, 'career','转行与副业测评'],[/裁员|失业|职场风险/, 'layoff','裁员风险检测'],[/关系沟通|伴侣沟通|感情沟通/, 'relation','关系沟通分析'],[/穿搭|工位|环境|颜色|风水/, 'style','能量穿搭与工位风水'],[/择日|重要事项|安排日期/, 'date','重要事项择日助手'],[/今日日签|今日提醒|日签/, 'daily','今日日签'],[/起名|取名|名字/, 'name','智能起名工具'],[/摇签|问卜|抽签/, 'oracle','摇签问卜'],[/彩票|双色球|大乐透|选号/, 'lottery','娱乐选号'],[/生肖合冲|生肖关系/, 'zodiac','生肖合冲分析']
  ];
  const hit=rules.find(([re])=>re.test(x));if(!hit)return false;
  const el=document.getElementById('askResult');if(!el)return false;
  const short={wealth:'财运',career:'转行',layoff:'职场风险',relation:'关系沟通',style:'环境',date:'择日',daily:'日签',name:'起名',oracle:'摇签',lottery:'选号',zodiac:'生肖'}[hit[1]]||'工具';
  const card=document.createElement('div');card.className='ai-body-inner ai-tool-call';
  card.innerHTML='<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问大师</div><div>可以，直接开始这个小工具，填完后我再帮你看结果。</div><button class="ai-tool-call-btn" type="button">开始 · '+short+' →</button></div></div></div>';
  card.querySelector('button').onclick=()=>{window._returnToAI=true;closeAsk();setTimeout(()=>openToolPage(hit[1]),180)};
  el.appendChild(card);el.scrollTop=el.scrollHeight;return true;
}
export function doAsk(q){
  if(!document.getElementById('aiSheet').classList.contains('open'))openAsk();
  const input=document.getElementById('askInput');
  input.value='';input.style.height='auto';
  const countEl=document.getElementById('aiCount');
  if(countEl)countEl.textContent='0 / 500';
  document.getElementById('aiSuggest').classList.remove('show');
  try{sessionStorage.setItem('tj_ai_draft','')}catch(e){}
  if(aiToolRequest(q))return;
  generateAnswer(q);
}
export function doAskCustom(){
  const input=document.getElementById('askInput');
  const q=input.value.trim();
  if(!q)return;
  input.value='';input.style.height='auto';
  const countEl=document.getElementById('aiCount');
  if(countEl)countEl.textContent='0 / 500';
  document.getElementById('aiSuggest').classList.remove('show');
  try{sessionStorage.setItem('tj_ai_draft','')}catch(e){}
  if(aiToolRequest(q))return;
  generateAnswer(q);
}
// —— 切换分类 ——
export function aiSwitchCat(el){
  document.querySelectorAll('.ai-cat').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  aiRefreshChips(el.dataset.cat);
}
// —— 刷新当前分类下的快捷问题 chips ——
export function aiRefreshChips(cat){
  const wrap=document.getElementById('aiChips');
  if(!wrap)return;
  let list=[];
  if(cat==='hot'){
    // 热门：每个意图各 1 条
    const seen=new Set();
    ['事业','财富','感情','健康','学业','居住','玄学'].forEach(it=>{
      const f=KB.faqs.find(x=>x.intent===it&&!seen.has(x.id));
      if(f){list.push(f);seen.add(f.id);}
    });
  }else if(cat==='玄学'){
    // 玄学分类同时显示术语
    list=KBSearch.byIntent('玄学');
  }else{
    list=KBSearch.byIntent(cat);
  }
  wrap.innerHTML=list.map(f=>`<div class="ai-chip" onclick="doAsk('${f.q.replace(/'/g,"\\'")}')">${f.q}</div>`).join('');
  // 玄学分类附加术语速查
  if(cat==='玄学'){
    wrap.innerHTML+='<div class="ai-divider">术语速查</div>';
    wrap.innerHTML+=KB.terms.slice(0,12).map(t=>`<div class="ai-chip term" onclick="doAsk('${t.t}')">${t.t}</div>`).join('');
  }
}
// 自由提问模式：不展示预设问题或联想列表，保留用户自己的问题输入。
export function aiOnInputSuggest(){
  const sug=document.getElementById('aiSuggest');
  if(sug){sug.innerHTML='';sug.classList.remove('show');}
}

export async function generateAnswer(q){
  const d=getCtx();
  const el=document.getElementById('askResult');
  const conversation=window._aiConversation||(window._aiConversation=[]);
  const aiPrefs=window.getAISettings?window.getAISettings():{natural:true,context:true,length:'short'};
  const previousTurns=aiPrefs.context?conversation.slice(-6):[];
  // Short, referential questions should continue the prior topic instead of matching an unrelated FAQ.
  const contextualFollowUp=previousTurns.length>0&&(
    q.trim().length<=18||/^(那|然后|所以|具体|继续|怎么办|怎么做|为什么|他|她|这个|那我|我呢|可以吗|要不要)/.test(q.trim())
  );
  if(!d){
    
    const div = document.createElement('div');
    div.className = 'ai-body-inner';
    div.innerHTML = '<div class="ai-empty">请先完成命盘排盘，再进行提问。<br><button class="ai-btn-go" onclick="closeAsk();goBack();">前往填写出生信息 →</button></div>';
    const typing = el.querySelector('.loading-state');
    if(typing) typing.remove();
    el.appendChild(div);
  
    return;
  }
  // —— 步骤 1：智能信息库匹配 ——
  const kbRes=contextualFollowUp?null:smartAnswer(q,d);
  if(kbRes){
    
    const div = document.createElement('div');
    div.className = 'ai-body-inner';
    div.innerHTML = renderSmartAnswer(kbRes, q);
    conversation.push({role:'user',content:q});
    conversation.push({role:'assistant',content:(kbRes.sections||[]).map(s=>s.content||'').join(' ').slice(0,180)});
    const typing = el.querySelector('.loading-state');
    if(typing) typing.remove();
    el.appendChild(div);
    requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}));
    return;
  
  }
  // —— 步骤 2：调用 AI API（流式）——
  // typing removed
  const ctx=buildBaziContext(d);
  const systemPrompt=`你是「问问」，像一位真正会倾听的朋友，而不是报告生成器。请用自然语言和用户说话：先用一句顺口的承接回应问题，例如“听起来你现在最在意的是……”或“这件事确实容易让人纠结”，但不要凭空猜测用户情绪；接着直接回答，再自然地落到一个现实行动。可以使用“我会建议你先……”“如果是我，我会先……”这类口语表达，让回答像真实对话，不要像数据报告。不要套模板，不要使用“根据命盘显示”“综合来看”“建议如下”等机械套话，也不要每次都把日主、大运、评分重新说一遍。命理只能作为轻量参考，只有和问题确实相关时才自然提一句，并说明现实选择更重要。请认真参考对话历史：如果用户说“那我呢”“继续说”“这个机会”“他/她”等省略表达，要结合上一轮内容理解，不要假装这是全新问题；只有确实无法判断时才追问。每次只抓住最关键的一点，给一个具体、容易开始的行动；不要罗列多条大道理，不要强行分成结论、原因、行动等小标题。信息不足时只问一个问题。语气像熟悉用户的朋友：有温度、坦诚，允许说“我不确定”。中文回复控制在80至180字，通常写成一到两段自然对话。`;
  try{
    let ans=null;
    // 真正有内容返回前，保留“正在输入”动画；首字到达后再插入答案气泡。
    const _mkAns=()=>{ if(ans)return ans; const t=el.querySelector('.loading-state'); if(t)t.remove(); ans=document.createElement('div'); ans.className='ai-body-inner'; el.appendChild(ans); return ans; };
    const full=await streamAskAnswer({
      apiKey:import.meta.env.VITE_API_KEY,
      systemPrompt,
      chartContext:ctx,
      question:q,
      aiPrefs,
      previousTurns,
      onDelta:(partial)=>{_mkAns().innerHTML=formatStandardAnswer(partial);requestAnimationFrame(()=>{el.scrollTop=el.scrollHeight;});}
    });
    conversation.push({role:'user',content:q});
    conversation.push({role:'assistant',content:full.slice(0,500)});
    const intents=extractIntents(q);
    const links=buildRelatedRoutes(intents);
    if(links.length){_mkAns().innerHTML+=renderRouteButtons(links,'前往相关页面查看');}
    requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'nearest'});});
  }catch(e){
    generateAnswerFallback(q,d,el);
    // Keep offline/fallback turns in the same session so the next question still has a topic.
    conversation.push({role:'user',content:q});
    conversation.push({role:'assistant',content:'已基于当前话题给出建议。'});
  }
}

// —— 渲染 KB 命中结果 ——

// —— 渲染跳转按钮组 ——

// —— 根据意图自动推断相关页面 ——

