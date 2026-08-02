import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
const r=await p.evaluate(()=>{
  const q=s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);
    return {sel:s,bg:c.backgroundColor,bgi:c.backgroundImage.slice(0,80),color:c.color,border:c.borderColor,font:c.fontFamily.slice(0,40)};};
  const rootv=n=>getComputedStyle(document.documentElement).getPropertyValue(n);
  return {theme:document.documentElement.dataset.theme,
    vars:{surface:rootv('--c-surface'),bg:rootv('--c-bg'),text:rootv('--c-text'),accent:rootv('--c-accent')},
    els:['body','#formCard','.p1-scroll','#bDate','.chip','.cta','.switch'].map(q)};
});
console.log(JSON.stringify(r,null,1));
await b.close();
