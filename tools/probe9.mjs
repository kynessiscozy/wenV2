import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,600));
console.log(await p.evaluate(()=>{
  const out=[];
  for(const s of ['.cta','.home-card','#formCard']){
    const e=document.querySelector(s);
    for(const pe of ['','::before','::after']){
      const c=getComputedStyle(e,pe||null);
      if(pe && c.content==='none')continue;
      out.push(s+pe+' bg='+c.backgroundColor+' img='+c.backgroundImage.slice(0,70)+' op='+c.opacity+' filter='+c.filter);
    }
  }
  return out.join('\n');
}));
await b.close();
