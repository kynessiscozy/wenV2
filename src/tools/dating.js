import { setToolOutput } from './shared.js';

function runDateTool(){const v=document.getElementById('dateEvent').value,dt=document.getElementById('dateTarget').value;const map={签约合作:'核对主体、金额、交付与违约条款，并预留复核时间。',面试入职:'提前准备作品案例、岗位问题和薪酬底线。',搬家出行:'确认交通、天气、证件与备用方案。',表白沟通:'选择双方不疲惫的时间，先表达感受再提出期待。'};setToolOutput('事项：'+v+(dt?'；目标日期：'+dt:'')+'。准备重点：'+map[v]+' 择日工具提供的是节奏提醒，合同、行程和健康等事项请以现实信息与专业意见为准。');}

export { runDateTool };
