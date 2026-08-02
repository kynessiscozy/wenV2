import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
await p.evaluate(()=>window.calc(true));
await new Promise(r=>setTimeout(r,3500));
await p.evaluate(()=>document.querySelector('.tab-item[data-sec="s-adv"]')?.click());
await new Promise(r=>setTimeout(r,800));
console.log(await p.evaluate(()=>{
  // 取工具栏灰块位置的元素堆叠
  const els=document.elementsFromPoint(20,175);
  return els.slice(0,6).map(e=>{const c=getComputedStyle(e);
    return e.tagName+'.'+String(e.className).slice(0,45)+' bg='+c.backgroundColor+' img='+c.backgroundImage.slice(0,50)+' shadow='+c.boxShadow.slice(0,60);}).join('\n');
}));
await b.close();
