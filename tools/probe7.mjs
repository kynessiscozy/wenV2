import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,3500));
await p.evaluate(()=>window.openAsk());
await new Promise(r=>setTimeout(r,800));
console.log(await p.evaluate(()=>{
  const g=s=>{const e=document.querySelector(s);if(!e)return s+' MISSING';const c=getComputedStyle(e);
    return [s,'bg='+c.backgroundColor,'color='+c.color,'border='+c.borderColor,'disp='+c.display,'op='+c.opacity].join(' ');};
  return ['.ai-send','.ai-close','.ai-input-row','.ai-input','.ai-actions','.ai-conn-bar','.ai-sheet'].map(g).join('\n');
}));
await b.close();
