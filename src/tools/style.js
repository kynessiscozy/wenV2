import { setToolOutput } from './shared.js';
import { getCtx } from '../state/ctx.js';

function runStyleTool(){const scene=document.getElementById('styleScene').value,d=getCtx(),map={重要沟通:'选择低饱和、有质感的 '+d.wx.ys+' 属性配色；桌面只保留沟通资料与纸笔。',面试汇报:'穿搭强调整洁与可信赖感；工位或会议桌朝向明亮处，提前整理要点。',专注工作:'使用 '+d.wx.ys+' 属性的小面积色彩作为提示，关闭无关通知并保持桌面留白。',休息恢复:'减少视觉刺激，选择舒适材质与柔和光线，优先恢复睡眠和饮食节奏。'};setToolOutput(scene+'方案：'+map[scene]);}

export { runStyleTool };
