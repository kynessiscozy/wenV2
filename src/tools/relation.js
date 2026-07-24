import { setToolOutput } from './shared.js';
import { getCtx } from '../state/ctx.js';

function runRelationTool(){const n=document.getElementById('relName').value.trim()||'对方',f=document.getElementById('relFocus').value,date=document.getElementById('relDate').value,d=getCtx();const focus={亲密关系:'先确认安全感与边界，再讨论未来安排。',朋友合作:'先明确分工、交付和收益分配，再谈默契。',家人沟通:'先讲共同目标，再说明各自可接受的做法。'};setToolOutput('与'+n+'的「'+f+'」方案：'+focus[f]+' 你的当前感情参考 '+d.ls+' / 100。'+(date?'已记录对方出生日期，可作为后续双盘比对的基础信息。':'补充对方出生日期后，可进一步进行双盘节奏比对。'));}

export { runRelationTool };
