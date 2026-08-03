/* 验证两项改动：
   1. 速读下方标签栏的内容去卡片化、标头不与标签重复
   2. 问问大师面板位于 Dock 之上，不遮蔽 Dock                      */
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:4173/wenV2/';
let pass = 0, fail = 0;
const ok = (c, m, extra = '') => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m + (extra ? '  ' + extra : ''))); };

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

/* ---------- 1. 标签内容去卡片化 ---------- */
{
  const p = await b.newPage();
  await p.setViewport({ width: 430, height: 932 });
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(() => window.calc(true));
  await new Promise(r => setTimeout(r, 4500));

  for (const sec of ['s-ming', 's-yun', 's-rel']) {
    await p.evaluate(s => document.querySelector(`.tab-item[data-sec="${s}"]`)?.click(), sec);
    await new Promise(r => setTimeout(r, 2400));

    const d = await p.evaluate(s => {
      const el = document.getElementById(s);
      const tabs = [...el.querySelectorAll('.sec-tab')].map(t => t.textContent.trim());
      const card = el.querySelector('.sec-pane.active > *');
      const cs = card ? getComputedStyle(card) : null;
      const active = el.querySelector('.sec-tab.active')?.textContent.trim() || '';
      const heads = [...el.querySelectorAll('.sec-pane.active > * > .card-hd')]
        .map(h => (h.querySelector('.card-tt')?.textContent || '').replace(/\s+/g, ''));
      // 内层子卡也不该再画一层灰底方块
      const sub = el.querySelector('.sec-pane.active .structure-subcard');
      return {
        tabs, active,
        bg: cs?.backgroundColor, bw: cs?.borderTopWidth, pad: cs?.paddingTop,
        dupHead: heads.some(t => t && (t.includes(active) || active.includes(t.slice(0, 2)))),
        subBg: sub ? getComputedStyle(sub).backgroundColor : null,
        explainDup: [...el.querySelectorAll('.sec-pane.active .explain-btn')].length,
        truncated: tabs.some(t => /^\d{4}年.$/.test(t)),
      };
    }, sec);

    console.log(`\n[${sec}] 标签 ${JSON.stringify(d.tabs)}`);
    ok(d.bg === 'rgba(0, 0, 0, 0)', '面板内容无卡片底色', d.bg);
    ok(d.bw === '0px', '面板内容无卡片描边', d.bw);
    ok(d.pad === '0px', '面板内容无卡片内边距', d.pad);
    ok(!d.dupHead, '标头未与标签重复');
    ok(d.subBg === null || d.subBg === 'rgba(0, 0, 0, 0)', '二级子卡也已去壳', String(d.subBg));
    ok(d.explainDup <= 1, '「这段是什么意思」不重复出现', '数量=' + d.explainDup);
    ok(!d.truncated, '标签文案未被截断');
  }
  await p.close();
}

/* ---------- 2. 聊天面板不遮蔽 Dock ---------- */
console.log('\n[问问大师 × Dock]');
for (const [w, h] of [[360, 740], [430, 932], [768, 1024], [1440, 900]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(() => window.calc(true));
  await new Promise(r => setTimeout(r, 4000));
  await p.evaluate(() => window.openAsk && window.openAsk());
  await new Promise(r => setTimeout(r, 900));

  const d = await p.evaluate(() => {
    const s = document.getElementById('aiSheet');
    const dk = document.querySelector('.ig-dock.tab-bar');
    const a = s.getBoundingClientRect(), c = dk.getBoundingClientRect();
    // 命中测试：Dock 上的按钮必须真的点得到，不能被遮罩吃掉
    const hit = document.elementFromPoint(c.left + 30, c.top + c.height / 2);
    return { gap: Math.round(c.top - a.bottom), h: Math.round(a.height), clickable: !!hit?.closest('.tab-item') };
  });
  console.log(`  ${w}×${h} 间距 ${d.gap}px，面板高 ${d.h}px`);
  ok(d.gap >= 0, `${w}px：面板不压住 Dock`, 'gap=' + d.gap);
  ok(d.clickable, `${w}px：Dock 按钮可点击`);
  ok(d.h >= 320, `${w}px：面板仍有可用高度`, 'h=' + d.h);
  await p.close();
}

await b.close();
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
