/* ============================================================
   分区标签页
   ------------------------------------------------------------
   问题：报告页是长卡片流，实测「关系」需滚 3.2 屏、「命盘」2.5 屏，
   用户要不断下滑才能找到想看的内容；折叠卡虽然压缩了高度，
   但「哪张卡里有什么」仍然不可见。

   方案：每个分区保留顶部「速读/一览」常驻，
   其下所有卡片改为标签页，一次只渲染一张，可横向快速切换。

   实现要点：
   · 不改动任何卡片的内部结构，只做「重新归位 + 显隐」
   · 标签由卡片标题自动生成，新增卡片无需改这里
   · 记住每个分区上次选中的标签（sessionStorage）
   ============================================================ */

const KEY = 'tj_sec_tab_v1';
// 这些卡片是「概览」，始终固定在顶部，不参与标签化
const PINNED = new Set(['beginner-brief', 'qr-card', 'demo-report-note']);

function _isPinned(card) {
  if (card.classList.contains('beginner-brief')) return true;
  if (card.classList.contains('qr-card')) return true;
  return PINNED.has(card.dataset.card || '');
}

function _title(card) {
  const el = card.querySelector('.card-tt') || card.querySelector('.qr-title') || card.querySelector('.bb-title');
  let t = (el?.textContent || card.dataset.card || '内容').trim();
  // 标签要短，去掉括号补充与冗余前缀
  t = t.replace(/（[^）]*）/g, '').replace(/\s+/g, '');
  if (t.length > 6) t = t.slice(0, 6);
  return t;
}

function _load() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
}
function _save(secId, idx) {
  try {
    const m = _load(); m[secId] = idx;
    sessionStorage.setItem(KEY, JSON.stringify(m));
  } catch (e) {}
}

function build(sec) {
  if (!sec) return;
  const wrapEl = sec.querySelector(':scope > .sec-tabs-wrap');
  // 关键：已经归位到面板里的卡片也要算进来，否则每轮轮询都会看到
  // 「.sec 直接子里没有卡片」→ 误判为需要拆除 → 拆了又建，无限循环
  const cards = [
    ...[...sec.children].filter(c => c.classList && (c.classList.contains('glass') || c.classList.contains('beginner-brief'))),
    ...(wrapEl ? [...wrapEl.querySelectorAll(':scope > .sec-panes > .sec-pane > *')] : []),
  ];
  const tabbable = cards.filter(c => !_isPinned(c));

  // 少于 2 张无需标签页
  if (tabbable.length < 2) { teardown(sec); return; }

  let wrap = sec.querySelector(':scope > .sec-tabs-wrap');
  const signature = tabbable.map(c => c.dataset.card || _title(c)).join('|');

  if (wrap) {
    if (wrap.dataset.sig === signature) return;   // 结构未变，直接返回
    const panes = [...wrap.querySelectorAll('.sec-pane')];

    // organizeMasterReportLayout 等逻辑会在切换分区时把卡片重新
    // insertBefore/appendChild 回 .sec，等于把它们从面板里"抢"出去。
    // 这里不拆整个结构，只把跑出去的卡片收回原属面板 —— 保持标签稳定。
    let reclaimed = 0;
    for (const card of tabbable) {
      const key = card.dataset.card || _title(card);
      const home = panes.find(p2 => p2.dataset.pane === key);
      if (home) { home.appendChild(card); reclaimed++; }
    }
    if (reclaimed === tabbable.length) return;   // 全部收回，结构无需变动

    teardown(sec);
    return build(sec);
  }

  wrap = document.createElement('div');
  wrap.className = 'sec-tabs-wrap';
  wrap.dataset.sig = signature;

  const bar = document.createElement('div');
  bar.className = 'sec-tabs';
  bar.setAttribute('role', 'tablist');

  const panes = document.createElement('div');
  panes.className = 'sec-panes';

  tabbable.forEach((card, i) => {
    const id = card.dataset.card || ('pane' + i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sec-tab';
    btn.textContent = _title(card);
    btn.setAttribute('role', 'tab');
    btn.dataset.idx = String(i);
    btn.addEventListener('click', () => select(sec, i, true));
    bar.appendChild(btn);

    // 折叠态在标签页里没有意义：进入即完整展示
    card.classList.remove('collapsed');
    card.querySelector('.card-toggle')?.remove();
    const pane = document.createElement('div');
    pane.className = 'sec-pane';
    pane.dataset.pane = id;
    pane.appendChild(card);
    panes.appendChild(pane);
  });

  wrap.appendChild(bar);
  wrap.appendChild(panes);
  sec.appendChild(wrap);

  const saved = _load()[sec.id];
  select(sec, Number.isInteger(saved) && saved < tabbable.length ? saved : 0, false);
}

function select(sec, idx, persist) {
  const wrap = sec.querySelector(':scope > .sec-tabs-wrap');
  if (!wrap) return;
  const tabs = [...wrap.querySelectorAll('.sec-tab')];
  const panes = [...wrap.querySelectorAll('.sec-pane')];
  tabs.forEach((t, i) => {
    const on = i === idx;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  });
  panes.forEach((p, i) => p.classList.toggle('active', i === idx));
  if (persist) {
    _save(sec.id, idx);
    // 切标签后把视图带回该区顶部，否则会停在上一张卡的滚动位置
    const sc = document.getElementById('p2Scroll');
    const top = wrap.getBoundingClientRect().top - (sc?.getBoundingClientRect().top || 0);
    if (sc && top < 0) sc.scrollBy({ top, behavior: 'smooth' });
    tabs[idx]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
}

function teardown(sec) {
  const wrap = sec.querySelector(':scope > .sec-tabs-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('.sec-pane > *').forEach(c => sec.appendChild(c));
  wrap.remove();
}

export function initSectionTabs() {
  let building = false;
  const run = () => {
    if (building) return;
    if (!document.body.classList.contains('report-active')) return;
    building = true;
    try { ['s-ming', 's-yun', 's-rel'].forEach(id => build(document.getElementById(id))); }
    finally { setTimeout(() => { building = false; }, 0); }
  };

  /* 说明：这里刻意不依赖以下三种方式，它们都被实测证伪：
       1. 包装 window.switchTab —— main.js 之后会重新赋值，包装失效
       2. 初始化时观察 .sec —— 报告未渲染时 .sec 数量为 0，观察不到
       3. 仅靠 MutationObserver 防抖 —— 自身 DOM 写入会不断重置计时器
     改为「轮询 + 稳定即停」：报告激活后短时间内周期性尝试构建，
     结构稳定（连续两次签名一致）后停止，成本可忽略。 */
  let timer = null, lastSig = '', stable = 0;
  const sig = () => ['s-ming', 's-yun', 's-rel']
    .map(id => document.getElementById(id)?.querySelectorAll('.sec-tab').length || 0).join(',');

  function startPolling() {
    if (timer) return;
    stable = 0; lastSig = '';
    timer = setInterval(() => {
      if (!document.body.classList.contains('report-active')) { stopPolling(); return; }
      run();
      const s2 = sig();
      stable = (s2 === lastSig && s2 !== '0,0,0') ? stable + 1 : 0;
      lastSig = s2;
      if (stable >= 3) stopPolling();          // 连续三次无变化即认为稳定
    }, 400);
    setTimeout(stopPolling, 15000);            // 兜底，绝不长跑
  }
  function stopPolling() { clearInterval(timer); timer = null; }

  new MutationObserver(() => {
    if (document.body.classList.contains('report-active')) startPolling();
    else stopPolling();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // 分区切换 / 模式切换都会改变卡片集合，重新开一轮轮询
  document.addEventListener('click', e => {
    if (e.target.closest?.('.tab-item') || e.target.closest?.('.mode-top-switch')) startPolling();
  }, true);

  // 卡片集合发生变化（新手↔大师重排、分区懒渲染）时重新开轮询。
  // 只看 .sec 的直接子节点增减，避免被自身写入触发。
  const cardObs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.target instanceof Element && m.target.classList?.contains('sec')) { startPolling(); return; }
    }
  });
  const attachCardObs = () => document.querySelectorAll('.sec').forEach(el => {
    if (el.__cardObs) return;
    el.__cardObs = 1;
    cardObs.observe(el, { childList: true });
  });
  setInterval(attachCardObs, 1000);

  if (document.body.classList.contains('report-active')) startPolling();
  window.TJBuildSectionTabs = run;
}
