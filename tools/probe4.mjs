import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,3500));
await p.evaluate(()=>document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
await new Promise(r=>setTimeout(r,800));
console.log(await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('#s-adv, #s-adv > *, #s-adv .tool-hub, #s-adv .tool-grid, #s-adv .tool-tile').forEach(e=>{
    const c=getComputedStyle(e);
    out.push([e.tagName+'.'+(e.className||'').toString().slice(0,40), c.backgroundColor, c.backgroundImage.slice(0,60), c.boxShadow.slice(0,50)].join(' | '));
  });
  return [...new Set(out)].join('\n');
}));
await b.close();
