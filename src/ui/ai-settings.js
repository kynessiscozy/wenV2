const defaults = { natural: true, context: true, length: 'short' };

export function getAISettings() {
  try {
    return Object.assign({}, defaults, JSON.parse(localStorage.getItem('tj_ai_settings') || '{}'));
  } catch (e) {
    return { ...defaults };
  }
}

export function toggleAISettings() {
  const sheet = document.getElementById('aiSheet');
  if (!sheet) return;
  let panel = sheet.querySelector('.ai-settings-panel');
  if (!panel) {
    const v = getAISettings();
    panel = document.createElement('div');
    panel.className = 'ai-settings-panel';
    panel.innerHTML = '<div class="ai-settings-title">AI 设置</div><label class="ai-setting-row"><span>自然对话</span><input id="aiSettingNatural" type="checkbox" '+(v.natural?'checked':'')+'></label><label class="ai-setting-row"><span>结合上下文</span><input id="aiSettingContext" type="checkbox" '+(v.context?'checked':'')+'></label><label class="ai-setting-row"><span>回复长度</span><select id="aiSettingLength"><option value="short">简洁</option><option value="standard">标准</option></select></label><div class="ai-settings-note">设置只影响后续 AI 回复，不会修改已有对话。</div>';
    sheet.appendChild(panel);
    panel.hidden = true;
    panel.querySelector('#aiSettingLength').value = v.length;
    panel.querySelectorAll('input,select').forEach(x => x.addEventListener('change', () => {
      const n = {
        natural: panel.querySelector('#aiSettingNatural').checked,
        context: panel.querySelector('#aiSettingContext').checked,
        length: panel.querySelector('#aiSettingLength').value
      };
      try { localStorage.setItem('tj_ai_settings', JSON.stringify(n)); } catch (e) {}
    }));
  }
  const open = panel.hidden !== false;
  panel.hidden = !open;
  document.querySelector('.ai-settings')?.setAttribute('aria-expanded', String(open));
}

export function initAISettings() {
  window.getAISettings = getAISettings;
  window.toggleAISettings = toggleAISettings;
  document.addEventListener('click', e => {
    const panel = document.querySelector('.ai-settings-panel');
    const btn = e.target.closest?.('.ai-settings');
    if (panel && !panel.hidden && !panel.contains(e.target) && !btn) {
      panel.hidden = true;
      document.querySelector('.ai-settings')?.setAttribute('aria-expanded', 'false');
    }
  });
}
