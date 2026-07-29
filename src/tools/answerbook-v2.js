const ANSWERS={
  direct:[
    '可以，但先把第一步缩小到今天就能完成的程度。',
    '先别急着答应。把你真正担心的那一点说清楚。',
    '现在不需要证明什么，先选择让你更安稳的方向。',
    '答案在行动里，不在反复推演里。去做一次小验证。',
    '可以等一等；更完整的信息会让决定变得简单。',
    '这件事值得尝试，但请给自己留一个退出的边界。',
    '先完成，再优化。你不需要等到完全准备好。',
    '别把别人的节奏，当成自己的截止日期。',
    '把注意力放回你能控制的那一部分。',
    '今天的“暂不决定”，也是一个成熟的决定。'
  ],
  action:[
    '给这件事 20 分钟，只做最小版本，然后再决定要不要继续。',
    '找一个真实的人或数据，验证你的第一个假设。',
    '写下最坏结果、可承受损失和退出条件。',
    '先完成一条消息、一个电话或一次预约，让事情开始流动。',
    '把它拆成三步，今天只处理最容易的一步。',
    '把“我应该”换成“我真正想要”，再写下一句答案。',
    '留出一晚再回复。情绪平稳后，答案会更准确。',
    '主动说出一个具体请求，而不是等待别人猜到。',
    '删掉一个不重要的待办，为真正重要的事腾出空间。',
    '给自己设一个小期限：48 小时内做一次现实验证。'
  ],
  reflect:[
    '如果不需要向任何人解释，你还会这样选择吗？',
    '你在害怕失去什么，又在渴望靠近什么？',
    '这件事是让你更像自己，还是让你离自己更远？',
    '你想要的是答案，还是被允许去做那个选择？',
    '把“必须立刻解决”拿掉后，真正的问题还剩下什么？',
    '如果朋友处在同样的位置，你会怎样温柔地对他说？',
    '你可以不确定，但可以先诚实。',
    '此刻最需要被照顾的，是计划、关系，还是你自己？',
    '什么样的结果，会让你在三个月后仍觉得值得？',
    '你已经知道一部分答案了，只是还没把它说出口。'
  ]
};
const MODES={direct:'直接回答',action:'行动线索',reflect:'内心提问'};

// 短句库：适合快速翻页与重复阅读，不作预测或确定性承诺。
ANSWERS.direct.push(
  '先缓一缓。','现在就开始。','再给自己一点时间。','可以试一次。','先别急着回应。',
  '把边界讲清楚。','先相信你的感受。','不用立刻有答案。','今天先到这里。','别勉强自己。',
  '先做，再判断。','保留一点余地。','这不是你的全部。','慢一点也没关系。','先回到事实。',
  '值得认真对待。','暂时不要承诺。','去问一次就知道。','把话说出来。','先照顾自己。',
  '不必解释太多。','允许事情自然发生。','先完成眼前这一小步。','选择让你安稳的。','别替别人做决定。',
  '可以拒绝。','再看一遍细节。','先停下比较。','答案会在路上出现。','不要用疲惫做决定。',
  '试着换个角度。','留意那个小小的犹豫。','今天适合整理。','先别把话说满。','你有选择。',
  '把期待调低一点。','先给自己一个期限。','不需要马上证明。','往轻松处走一步。','这一次，听听自己。'
);
ANSWERS.action.push(
  '先喝口水，再开始。','写下第一步。','发出那条消息。','做五分钟版本。','关掉一个干扰。',
  '把时间留出来。','先查一个真实信息。','列出三个选项。','预约一次沟通。','完成一个小任务。',
  '把问题说具体。','删掉一个待办。','今天只推进一件事。','问清楚截止日期。','把预算写下来。',
  '睡一晚再回复。','先收集证据。','和可信的人聊聊。','给自己设个提醒。','把手机放远一点。',
  '先整理桌面。','走十分钟。','把需求写成一句话。','先做一个样本。','为自己留白。',
  '把想法发给一个人。','先完成最难的五分钟。','记录这次感受。','把事情分成两半。','先核对一次。',
  '拒绝一个不必要的安排。','给对方一个明确时间。','打开文档，写第一句。','先做可逆的决定。','把重要的放到上午。',
  '把钱和情绪分开看。','先结束一个旧任务。','把担心变成清单。','只处理下一步。','现在就预约。'
);
ANSWERS.reflect.push(
  '什么让你迟迟不动？','你真正想守住什么？','这是谁的期待？','你在等待谁的许可？','如果不用害怕，会怎样？',
  '你想被怎样对待？','哪里让你感到不安？','你已经做得够多了吗？','这件事值得你的精力吗？','你是否忽略了自己？',
  '最小的诚实是什么？','你在证明什么？','什么可以先放下？','你想靠近什么？','什么让你觉得轻松？',
  '这真的是你的问题吗？','你有没有给自己留空间？','你想听见什么答案？','你在逃避哪一个选择？','这份执着在保护什么？',
  '如果今天不解决，会怎样？','谁的声音最影响你？','你需要的是结果还是陪伴？','什么是你不能失去的？','你愿意再试一次吗？',
  '什么时候的你最自在？','你能对自己更温柔吗？','这件事让你学会了什么？','什么值得被慢慢完成？','你是否把自己排在最后？',
  '你的身体在提醒什么？','你还能相信什么？','哪个选择更接近真实？','如果可以重来，你会改什么？','你想为谁而活？',
  '此刻，你最需要什么？','你愿意相信自己吗？','什么不是你的责任？','哪里需要一个停顿？','你想从这里带走什么？'
);
const escape=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let used=[];

function pick(mode){
  const list=ANSWERS[mode]||ANSWERS.direct;
  let options=list.filter(x=>!used.includes(x));
  if(!options.length){used=[];options=list;}
  const answer=options[Math.floor(Math.random()*options.length)];
  used.push(answer);return answer;
}
function renderForm(){
  return `<section class="answerbook-v2" data-tool-art="answerbook">
    <header class="answerbook-hero">
      <span class="answerbook-eyebrow">THE BOOK OF ANSWERS</span>
      <h2>答案之书</h2>
      <p>写下一件此刻最在意的事，翻开一页，把它当作整理思路的一个新角度。</p>
    </header>
    <div class="answerbook-compose">
      <label for="answerBookQuestion">此刻想问什么？</label>
      <textarea id="answerBookQuestion" maxlength="240" placeholder="例如：我应该接受这个机会吗？"></textarea>
      <div class="answerbook-count"><span>一次只问一件事，会更容易听见自己。</span><b id="answerBookCount">0 / 240</b></div>
    </div>
    <div class="answerbook-mode" role="radiogroup" aria-label="选择阅读方式">
      ${Object.entries(MODES).map(([id,label],i)=>`<button type="button" class="answerbook-mode-btn ${i===0?'active':''}" data-mode="${id}" role="radio" aria-checked="${i===0?'true':'false'}">${label}</button>`).join('')}
    </div>
    <div class="answerbook-entry-actions">
      <button class="answerbook-open-btn" type="button" id="answerBookOpen">翻开这一页 <span>→</span></button>
      <button class="answerbook-random-btn" type="button" id="answerBookRandom">随手翻开一页</button>
    </div>
    <p class="answerbook-disclaimer">它不是预测，也不替代你的判断。重要决定请结合现实条件与专业意见。</p>
  </section>`;
}
function renderResult(question,mode,answer){
  return `<section class="answerbook-v2 answerbook-result" data-tool-art="answerbook">
    <header class="answerbook-hero compact">
      <span class="answerbook-eyebrow">THE BOOK OF ANSWERS · ${MODES[mode]}</span>
      <h2>这一页写着</h2>
    </header>
    <article class="answerbook-page-turn" aria-live="polite">
      <div class="answerbook-page-top"><span>✦</span><em>${escape(question)}</em></div>
      <blockquote>${escape(answer)}</blockquote>
      <p>把这句话当作一个新的视角，再结合事实、感受与现实条件作决定。</p>
    </article>
    <div class="answerbook-actions-v2">
      <button type="button" class="secondary" id="answerBookAgain">再翻一页</button>
      <button type="button" class="primary" id="answerBookSave">收藏这句</button>
    </div>
    <button type="button" class="answerbook-rewrite" id="answerBookRewrite">换一个问题</button>
  </section>`;
}
function saveAnswer(question,mode,answer){
  try{
    const key='tj_answerbook_saved_v2';
    const items=JSON.parse(localStorage.getItem(key)||'[]');
    items.unshift({question,mode,answer,at:Date.now()});
    localStorage.setItem(key,JSON.stringify(items.slice(0,30)));
    return true;
  }catch(e){return false;}
}
function bindForm(root){
  const input=root.querySelector('#answerBookQuestion');
  const count=root.querySelector('#answerBookCount');
  let mode='direct';
  input.addEventListener('input',()=>count.textContent=`${input.value.length} / 240`);
  root.querySelectorAll('.answerbook-mode-btn').forEach(btn=>btn.addEventListener('click',()=>{
    mode=btn.dataset.mode;
    root.querySelectorAll('.answerbook-mode-btn').forEach(item=>{const active=item===btn;item.classList.toggle('active',active);item.setAttribute('aria-checked',String(active));});
  }));
  root.querySelector('#answerBookOpen').addEventListener('click',()=>{
    const question=input.value.trim();
    if(!question){input.focus();input.classList.add('is-invalid');setTimeout(()=>input.classList.remove('is-invalid'),450);return;}
    showResult(root,question,mode,pick(mode));
  });
  root.querySelector('#answerBookRandom').addEventListener('click',()=>{
    // A no-question reading is intentionally open-ended and uses a neutral prompt in the saved history.
    showResult(root,'此刻的你',mode,pick(mode));
  });
}
function showResult(root,question,mode,answer){
  root.innerHTML=renderResult(question,mode,answer);
  requestAnimationFrame(()=>root.querySelector('.answerbook-page-turn')?.classList.add('revealed'));
  root.querySelector('#answerBookAgain').addEventListener('click',()=>showResult(root,question,mode,pick(mode)));
  root.querySelector('#answerBookRewrite').addEventListener('click',()=>{root.innerHTML=renderForm();bindForm(root);root.querySelector('#answerBookQuestion')?.focus();});
  root.querySelector('#answerBookSave').addEventListener('click',e=>{
    if(saveAnswer(question,mode,answer)){e.currentTarget.textContent='已收藏';e.currentTarget.disabled=true;}
  });
}
export function openAnswerBook(){
  const modal=document.getElementById('toolModal');
  const root=document.getElementById('toolModalContent');
  if(!modal||!root)return;
  window._activeTool='answerbook';
  document.querySelector('#toolModal .tool-sheet')?.classList.remove('result-open');
  root.innerHTML=renderForm();
  modal.classList.add('open');
  bindForm(root);
  setTimeout(()=>root.querySelector('#answerBookQuestion')?.focus(),120);
}
