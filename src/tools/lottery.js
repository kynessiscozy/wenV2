import { setToolOutput } from './shared.js';

function runLotteryTool(){const t=document.getElementById('lotteryType').value,count=+document.getElementById('lotteryCount').value,unique=(n,max)=>{const a=[];while(a.length<n){const v=Math.floor(Math.random()*max)+1;if(!a.includes(v))a.push(v);}return a.sort((x,y)=>x-y).map(x=>String(x).padStart(2,'0')).join(' · ')};const lines=Array.from({length:count},(_,i)=>'第 '+(i+1)+' 注：'+(t==='ssq'?'红球 '+unique(6,33)+'　蓝球 '+unique(1,16):'前区 '+unique(5,35)+'　后区 '+unique(2,12))).join('<br>');setToolOutput(lines+'<br><br>随机组合不提高中奖概率；请仅使用可承受的娱乐预算。');}

export { runLotteryTool };
