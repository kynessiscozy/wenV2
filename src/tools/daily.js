import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';
import { getTodayGZ } from '../engines/bazi.js';

function runDailyTool(){const f=document.getElementById('dailyFocus').value,d=getCtx();const map={推进工作:'先完成一项关键推进，再处理零散消息；沟通时用事实和下一步说话。',关系沟通:'选一个双方不疲惫的时间，先表达感受，再提出一个具体期待。',学习积累:'只选一个主题，完成 25 分钟深度输入并记下一个可应用点。',休息恢复:'减少额外安排，保证睡眠与规律饮食，让身体先回到稳定节奏。'};setToolOutput('今日 '+getTodayGZ()+' · 聚焦「'+f+'」<br><br>'+map[f]+'<br><br>行动清单：① 只定一件最重要的事；② 留出 20 分钟无干扰时间；③ 晚上复盘是否完成。当前有利元素参考：'+d.wx.ys+'。');}

export { runDailyTool };
