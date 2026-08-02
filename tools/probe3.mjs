import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.setViewport({width:430,height:932});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,4000));
const r=await p.evaluate(()=>{
  const bad=[];
  document.querySelectorAll('#page2 *').forEach(e=>{
    if(!e.textContent.trim()||e.children.length)return;
    const c=getComputedStyle(e);
    const m=c.color.match(/\d+/g).map(Number);
    // 蓝味：b 明显大于 r
    if(m[2]-m[0]>25) bad.push([e.className||e.tagName, c.color, e.textContent.trim().slice(0,18)]);
  });
  return bad.slice(0,25);
});
console.log(r.map(x=>x.join(' | ')).join('\n'));
await b.close();
