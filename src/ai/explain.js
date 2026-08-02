/* ============================================================
   「这段是什么意思」—— 带上下文的解释入口
   ------------------------------------------------------------
   竞品调研显示：新手最大的障碍不是排不出盘，而是
   「排出来看不懂，又不知道该怎么问」。直接问「我的八字怎么样」
   这类问题，AI 只能泛泛回答。

   这里的做法是：用户不用自己组织问题，
   点报告里任意一段的「?」，系统自动把
     · 这段讲的是什么主题
     · 相关的命盘数据
     · 段落原文
   组装成一个结构化提问，再交给 AI / 知识库。
   ============================================================ */

import { getCtx } from '../state/context.js';

/* 卡片 data-card → 主题描述与需要携带的命盘字段 */
const CARD_TOPIC = {
  bazi:      { name: '四柱八字',   ask: '我的四柱八字说明了什么？' },
  wuxing:    { name: '五行能量',   ask: '我的五行分布意味着什么？' },
  persona:   { name: '人格画像',   ask: '这段人格描述是怎么得出来的？' },
  timeline:  { name: '大运时间线', ask: '我现在处在什么阶段？接下来会怎样？' },
  ziwei:     { name: '紫微斗数',   ask: '紫微盘这部分怎么理解？' },
  qimen:     { name: '奇门遁甲',   ask: '奇门这部分怎么理解？' },
  meihua:    { name: '梅花易数',   ask: '梅花易数这部分怎么理解？' },
  relAi:     { name: '八字合盘',   ask: '这个合盘结果说明了什么？' },
  toolHub:   { name: '工具',       ask: '这些工具我该先用哪个？' },
  intimacy:  { name: '亲密关系',   ask: '我的亲密关系模式是怎么判断的？' },
  friends:   { name: '朋友关系',   ask: '我的社交风格是怎么判断的？' },
  family:    { name: '亲人关系',   ask: '我和家人的相处模式是怎么判断的？' },
};

/** 取当前命盘的关键事实，作为提问的上下文 */
export function chartFacts() {
  const d = getCtx();
  if (!d) return null;
  const f = [];
  if (d.dg) f.push(`日主${d.dg}${d.dw || ''}`);
  if (d.wx) f.push(d.wx.st ? '身旺' : '身弱');
  if (d.wx && d.wx.ys) f.push(`用神${d.wx.ys}`);
  if (d.pa && d.pa.length) f.push(`格局${d.pa.join('、')}`);
  if (d.cDy) f.push(`当前大运${d.cDy.g}${d.cDy.z}`);
  if (d.cLn) f.push(`流年${d.cLn.g}${d.cLn.z}`);
  return f.join(' · ');
}

/**
 * 组装一个「解释这一段」的问题。
 * 用户不需要自己想怎么问 —— 这正是竞品指出的新手痛点。
 */
export function buildExplainQuestion({ cardKey, heading, excerpt }) {
  const topic = CARD_TOPIC[cardKey];
  const title = heading || (topic && topic.name) || '这部分内容';

  // 优先用卡片预设问法，它比通用句式更聚焦
  if (topic && !heading) return topic.ask;

  const clean = String(excerpt || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  if (clean) return `「${title}」这段是什么意思？（原文：${clean}${clean.length >= 60 ? '…' : ''}）`;
  return `「${title}」这部分是什么意思？`;
}

/** 找到某个元素所属卡片的标题与摘要 */
export function extractSection(el) {
  const card = el.closest('[data-card]') || el.closest('.glass') || el.closest('.beginner-brief');
  const cardKey = card ? (card.dataset.card || '') : '';
  const heading =
    (card && (card.querySelector('.card-tt') || card.querySelector('.qr-title') || card.querySelector('.bb-title')))
      ?.textContent.trim() || '';
  // 摘要取卡片正文首段。注意排除标题本身与「这段是什么意思」按钮，
  // 否则会出现「标题…（原文：另一段不相干的话）」这种错位引用。
  // 注意：querySelector 用逗号列表时按「文档顺序」返回，不按选择器优先级，
  // 所以必须逐个选择器依次尝试，否则会先命中评分行等无关文本。
  let excerpt = '';
  if (card) {
    for (const sel of ['.bb-text', '.ai-sum-body', '.at', '.tr-text-body', 'p']) {
      const body = card.querySelector(sel);
      if (body && !body.closest('.explain-btn') && body.textContent.trim().length > 8) {
        excerpt = body.textContent.trim();
        break;
      }
    }
  }
  // 摘要与标题重复时不再重复引用
  if (excerpt && heading && excerpt.startsWith(heading)) excerpt = '';
  return { cardKey, heading, excerpt };
}

export { CARD_TOPIC };
