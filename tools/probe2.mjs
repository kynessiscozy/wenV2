import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
const cdp=await p.target().createCDPSession();
await cdp.send('DOM.enable');await cdp.send('CSS.enable');
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
const {root}=await cdp.send('DOM.getDocument');
for(const sel of ['#formCard','.cta','.chip']){
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:sel});
  const m=await cdp.send('CSS.getMatchedStylesForNode',{nodeId});
  console.log('=====',sel);
  for(const r of m.matchedCSSRules){
    const txt=r.rule.style.cssText||'';
    if(/background/.test(txt)) console.log(' ', r.rule.selectorList.text.slice(0,90),'=>',txt.match(/background[^;]*;/g)?.join(' ').slice(0,160));
  }
}
await b.close();
