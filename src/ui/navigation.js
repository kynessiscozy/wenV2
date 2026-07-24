import { KB } from '../ai/kb.js';

export function jumpTo(secId,cardKey){
  // 关 AI 面板
  if(typeof window.closeAsk==='function')window.closeAsk();
  // 若 secId 为空，从 KB.routes 推断；同时取 sub（合并卡子区）
  let subKey=null,routeCard=cardKey;
  if(cardKey&&KB&&KB.routes&&KB.routes[cardKey]){
    const r=KB.routes[cardKey];
    if(!secId)secId=r.sec;
    if(r.sub)subKey=r.sub;
    routeCard=r.card; // 重定向到真正的 DOM data-card
  }
  // 切 tab
  const tab=document.querySelector('.tab-item[data-sec="'+secId+'"]');
  if(tab&&!tab.classList.contains('active'))tab.click();
  // 重写：使用 routeCard 进行查找
  cardKey=routeCard;
  // 滚动+高亮
  setTimeout(()=>{
    let el=null;
    if(cardKey){
      el=document.querySelector('[data-card="'+cardKey+'"]');
    }
    if(!el){
      el=document.getElementById(secId);
    }
    if(!el)return;
    // “命盘结构”将四柱、五行等收进分栏；跳转前先唤醒所在分栏，避免滚动到隐藏内容。
    const structurePane=el.closest&&el.closest('.structure-pane');
    if(structurePane){
      const structure=structurePane.closest('.master-structure');
      const structureTab=structure&&structure.querySelector('.structure-tab[data-structure="'+structurePane.dataset.structure+'"]');
      if(structureTab&&typeof window.switchStructureTab==='function')window.switchStructureTab(structureTab);
    }
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.classList.add('tj-flash');
    setTimeout(()=>el.classList.remove('tj-flash'),1800);
    // 如果是合并卡的子区跳转，自动激活对应子 tab
    if(subKey){
      const sub=el.querySelector('.focus-tab[data-sub="'+subKey+'"]');
      if(sub)sub.click();
    }
    // 如果卡片是折叠状态，自动展开
    if(el.classList.contains('collapsed'))el.classList.remove('collapsed');
  },280);
}

export function applyTheme(yongShen){const themes={木:{h:145,s:'45%',l:'45%',m1:'rgba(40,140,80,0.28)',m2:'rgba(30,100,60,0.22)',m3:'rgba(20,80,45,0.14)',m4:'rgba(50,130,70,0.10)',m5:'rgba(25,90,50,0.14)',bg1:'#060d08',bg2:'#0c1a10',bg3:'#081208'},火:{h:8,s:'60%',l:'52%',m1:'rgba(180,60,40,0.28)',m2:'rgba(140,45,30,0.22)',m3:'rgba(100,35,25,0.16)',m4:'rgba(160,55,35,0.10)',m5:'rgba(120,40,28,0.14)',bg1:'#0d0806',bg2:'#1a100c',bg3:'#120c08'},土:{h:38,s:'55%',l:'56%',m1:'rgba(180,130,60,0.30)',m2:'rgba(120,80,40,0.25)',m3:'rgba(90,60,30,0.16)',m4:'rgba(160,100,50,0.10)',m5:'rgba(100,70,35,0.15)',bg1:'#0d0b08',bg2:'#14120e',bg3:'#0f0d0a'},金:{h:45,s:'15%',l:'65%',m1:'rgba(160,155,140,0.22)',m2:'rgba(130,125,110,0.18)',m3:'rgba(100,95,85,0.12)',m4:'rgba(150,145,130,0.08)',m5:'rgba(110,105,95,0.12)',bg1:'#0a0a0b',bg2:'#14141a',bg3:'#0f0f14'},水:{h:210,s:'50%',l:'50%',m1:'rgba(40,80,160,0.28)',m2:'rgba(30,60,130,0.22)',m3:'rgba(25,50,100,0.14)',m4:'rgba(45,75,140,0.10)',m5:'rgba(30,55,110,0.14)',bg1:'#06080d',bg2:'#0c101a',bg3:'#080c12'}};const t=themes[yongShen]||themes['土'];const root=document.documentElement.style;root.setProperty('--accent-h',t.h);root.setProperty('--accent-s',t.s);root.setProperty('--accent-l',t.l);root.setProperty('--m1',t.m1);root.setProperty('--m2',t.m2);root.setProperty('--m3',t.m3);root.setProperty('--m4',t.m4);root.setProperty('--m5',t.m5);root.setProperty('--bg1',t.bg1);root.setProperty('--bg2',t.bg2);root.setProperty('--bg3',t.bg3);}

export function showPage2(){document.body.classList.add('report-active');document.getElementById('page1').classList.add('hidden');const p2=document.getElementById('page2');p2.classList.remove('hidden');p2.classList.add('active');document.getElementById('tabBar').classList.add('show');document.getElementById('p2Scroll').scrollTop=0;if(typeof window.resetGlossaryState==='function')window.resetGlossaryState();requestAnimationFrame(()=>{if(typeof window._rebindTilt==='function')window._rebindTilt();if(typeof window._injectCardToggles==='function')window._injectCardToggles();const a=document.querySelector('.tab-item.active');if(a&&typeof moveTabIndicator==='function')moveTabIndicator(a);});}

export function goBack(){document.body.classList.remove('report-active');applyTheme('土');['page2'].forEach(id=>{document.getElementById(id).classList.remove('active');document.getElementById(id).classList.add('hidden');});document.getElementById('page1').classList.remove('hidden');document.getElementById('tabBar').classList.remove('show');document.getElementById('lgPanel').classList.remove('open');}

export function scrollToForm(){document.getElementById('formCard').scrollIntoView({behavior:'smooth',block:'center'});}

export function switchTab(el){
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  if(typeof moveTabIndicator==='function')moveTabIndicator(el);
  // 切换 sec 时让卡片重新错落入场（重置动画）
  const targetSec=document.getElementById(el.dataset.sec);
  if(targetSec){
    targetSec.querySelectorAll('.glass').forEach(c=>{c.style.animation='none';void c.offsetWidth;c.style.animation='';});
  }
  const secId=el.dataset.sec;document.querySelectorAll('.sec').forEach(s=>s.classList.remove('active'));const target=document.getElementById(secId);if(target){target.classList.add('active');}
  document.getElementById('p2Scroll').scrollTop=0;
  if(secId==='s-ming'||secId==='s-yun'){requestAnimationFrame(()=>{document.querySelectorAll('.wxf,.ff').forEach(el=>{el.style.width='0%';setTimeout(()=>{el.style.width=el.dataset.w},50)});});}
  if(secId==='s-yun'){requestAnimationFrame(()=>{const cv=document.getElementById('cvC');if(cv&&cv._data&&typeof window.drawCurve==='function')window.drawCurve(cv._data,cv._dys,cv._age);const tl=document.getElementById('daYunTl');if(tl){const cu=tl.querySelector('.ti.cu');if(cu){setTimeout(()=>cu.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}),100);}}});}
}

export function setGlassMode(mode){
  document.body.setAttribute('data-glass',mode);
  try{localStorage.setItem('tj_glass_mode',mode);}catch(e){}
  document.querySelectorAll('.lg-opt').forEach(o=>o.classList.toggle('active',o.dataset.mode===mode));
  const fab=document.getElementById('lgFab');if(fab)fab.classList.toggle('active',mode!=='standard');
}

export function toggleLgPanel(){document.getElementById('lgPanel').classList.toggle('open');}

export function moveTabIndicator(el){
  const ind=document.getElementById('tabIndicator');
  const wrap=document.getElementById('tabBar')&&document.getElementById('tabBar').querySelector('.tab-bar-inner');
  if(!ind||!wrap||!el)return;
  const wr=wrap.getBoundingClientRect(),er=el.getBoundingClientRect();
  ind.style.width=er.width+'px';
  ind.style.transform='translateX('+(er.left-wr.left)+'px)';
  ind.classList.add('ready');
}


export function initNavigationUI(){
  document.addEventListener('click',function(e){
    const panel=document.getElementById('lgPanel'),fab=document.getElementById('lgFab');
    if(panel&&panel.classList.contains('open')&&!panel.contains(e.target)&&e.target!==fab){panel.classList.remove('open');}
  });
  window.addEventListener('resize',function(){
    const a=document.querySelector('.tab-item.active');
    if(a)moveTabIndicator(a);
  });
  let mode='standard';
  try{mode=localStorage.getItem('tj_glass_mode')||'standard';}catch(e){}
  setGlassMode(mode);
}
