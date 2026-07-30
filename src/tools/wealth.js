import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runWealthTool(){const income=+document.getElementById('wealthIncome').value,cost=+document.getElementById('wealthCost').value,cash=+document.getElementById('wealthCash').value,d=getCtx();if(!income||cost<0){setToolOutput('请先填写有效的月到手收入与固定支出。');return;}const surplus=Math.max(0,income-cost),months=cost?Math.floor(cash/cost):0,rate=Math.round(surplus/income*100);setToolOutput('每月结余约 '+surplus+'，结余率 '+rate+'%。当前储蓄可覆盖约 '+months+' 个月固定支出。优先级：'+(months<3?'先补足 3—6 个月应急金，再考虑高波动配置。':rate<20?'先优化固定支出或提升收入，把结余率提升至 20% 以上。':'可在应急金外分层安排长期目标资金。')+' 命盘财运参考 '+d.ws+' / 100，仅用于节奏提醒。');}

export { runWealthTool };
