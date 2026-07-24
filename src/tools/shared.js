function toolPageShell(title,sub,body){return '<div class="tool-page-title">'+title+'</div><div class="tool-page-sub">'+sub+'</div>'+body;}
function setToolOutput(html){
  const out=document.getElementById('toolModalContent');if(!out)return;
  const names={wealth:'财运与理财罗盘',career:'转行与副业测评',date:'重要事项择日助手',style:'能量穿搭与工位风水',layoff:'裁员风险检测',daily:'今日日签',name:'智能起名工具',oracle:'摇签问卜',lottery:'双色球 / 超级大乐透',zodiac:'生肖合冲分析',relation:'AI 关系分析'};
  const name=names[window._activeTool]||'工具结果';
  out.innerHTML='<div class="tool-result-page"><div class="tool-result-kicker">结果分析</div><div class="tool-page-title">'+name+'</div><div class="tool-page-sub">以下结果结合你的输入与当前命盘参考生成。</div><div class="tool-result-body">'+html+'</div><div class="tool-result-actions"><button class="tool-secondary" onclick="openToolPage(window._activeTool)">← 返回修改</button><button class="tool-primary" onclick="closeToolPage()">完成</button></div></div>';
}

export { toolPageShell, setToolOutput };
