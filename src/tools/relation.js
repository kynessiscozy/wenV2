import { setToolOutput } from './shared.js';
import { getCtx } from '../state/context.js';

function runRelationTool() {
  const n = document.getElementById('relName').value.trim() || '对方';
  const f = document.getElementById('relFocus').value;
  const date = document.getElementById('relDate').value;
  const d = getCtx();

  const focus = {
    '亲密关系': '先确认安全感与边界，再讨论未来安排。',
    '朋友合作': '先明确分工、交付和收益分配，再谈默契。',
    '家人沟通': '先讲共同目标，再说明各自可接受的做法。'
  };

  setToolOutput({
    sections: [
      { type: 'row', label: '对象', value: n },
      { type: 'row', label: '关系类型', value: f },
      { type: 'row', label: '感情参考', value: d.ls + ' / 100' },
      { type: 'divider' },
      { type: 'text', label: '沟通方案', value: focus[f] },
      { type: 'text', value: date ? '已记录对方出生日期，可作为后续双盘比对的基础信息。' : '补充对方出生日期后，可进一步进行双盘节奏比对。' },
    ],
    note: '关系建议结合命盘参考，不替代双方真实沟通。'
  });
}

export { runRelationTool };
