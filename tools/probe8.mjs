import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:932});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle0'});
console.log(await p.evaluate(()=>{
  const e=document.querySelector('.cta');const c=getComputedStyle(e);
  return JSON.stringify({bg:c.backgroundColor,img:c.backgroundImage,sh:c.boxShadow,radius:c.borderRadius,ls:c.letterSpacing,fs:c.fontSize},null,1);
}));
await b.close();
