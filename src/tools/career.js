import { setToolOutput } from './shared.js';
import { getCtx } from '../state/ctx.js';

function runCareerTool(){const goal=document.getElementById('careerGoal').value,ready=+document.getElementById('careerReady').value,d=getCtx();const score=Math.max(35,Math.min(92,Math.round((d.cs*0.55)+(4-ready)*12+(d.wx.st?8:2))));const step=ready===1?'开始用小项目、投递或试单验证市场。':ready===2?'用 4 周补齐作品、案例或目标行业访谈。':'先锁定一个细分方向，完成 3 次真实访谈再决定。';setToolOutput(goal+'准备度 '+score+' / 100。下一步：'+step+' 不建议裸辞或大额投入，先保留现金流与退出方案。');}

export { runCareerTool };
