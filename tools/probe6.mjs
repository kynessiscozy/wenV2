import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,3500));
await p.evaluate(()=>document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
await new Promise(r=>setTimeout(r,800));
console.log(await p.evaluate(()=>{
  const res=[];
  document.querySelectorAll('#s-adv *').forEach(e=>{
    for(const pe of ['::before','::after']){
      const c=getComputedStyle(e,pe);
      if(c.content!=='none' && (c.backgroundColor!=='rgba(0, 0, 0, 0)'||c.backgroundImage!=='none'||c.boxShadow!=='none')){
        res.push(String(e.className).slice(0,35)+pe+' bg='+c.backgroundColor+' img='+c.backgroundImage.slice(0,45)+' sh='+c.boxShadow.slice(0,40));
      }
    }
  });
  return [...new Set(res)].slice(0,15).join('\n');
}));
await b.close();
