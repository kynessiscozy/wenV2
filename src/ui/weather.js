/* ============================================================
   天气模块 — 定位 → Open-Meteo → 菜单头部内嵌行
   城市名在前，去卡片化，融入 header
   ============================================================ */

const WX_MAP = {
  0:  { icon: 'sun',        label: '晴' },
  1:  { icon: 'sun-cloud',  label: '晴间多云' },
  2:  { icon: 'cloud-sun',  label: '多云' },
  3:  { icon: 'cloud',      label: '阴' },
  45: { icon: 'fog',        label: '雾' },
  48: { icon: 'fog',        label: '雾凇' },
  51: { icon: 'drizzle',    label: '毛毛雨' },
  53: { icon: 'drizzle',    label: '小雨' },
  55: { icon: 'drizzle',    label: '中雨' },
  61: { icon: 'rain',       label: '小雨' },
  63: { icon: 'rain',       label: '中雨' },
  65: { icon: 'heavy-rain', label: '大雨' },
  71: { icon: 'snow',       label: '小雪' },
  73: { icon: 'snow',       label: '中雪' },
  75: { icon: 'snow',       label: '大雪' },
  77: { icon: 'snow',       label: '雪粒' },
  80: { icon: 'rain',       label: '阵雨' },
  81: { icon: 'rain',       label: '中阵雨' },
  82: { icon: 'heavy-rain', label: '大阵雨' },
  85: { icon: 'snow',       label: '小阵雪' },
  86: { icon: 'snow',       label: '大阵雪' },
  95: { icon: 'thunder',    label: '雷暴' },
  96: { icon: 'thunder',    label: '雷暴冰雹' },
  99: { icon: 'thunder',    label: '强雷暴' },
};

/* ---- 迷你天气 SVG (14x14 行内图标) ---- */
function wxIconMini(key) {
  const s = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px">';
  const sun   = '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5 M8 13v1.5 M1.5 8H3 M13 8h1.5 M3.4 3.4l1.1 1.1 M11.5 11.5l1.1 1.1 M3.4 12.6l1.1-1.1 M11.5 4.5l1.1-1.1"/>';
  const cloud = '<path d="M3 10c-2 0-3-1.5-3-3s1-2.8 2.8-3a4 4 0 0 1 7.5-1c1.7.2 3 1.5 3 3.3S11.5 10 10 10Z"/>';
  const rain  = '<path d="M9.5 13l-.8 2.5 M12 13.5l-.8 2.5"/>';
  switch (key) {
    case 'sun':        return s + sun + '</svg>';
    case 'sun-cloud':  return s + sun.replace('r="3"','r="2.5"').replace('cy="8"','cy="7"') + cloud + '</svg>';
    case 'cloud-sun':  return s + '<circle cx="5" cy="6" r="2.5"/>' + cloud + '</svg>';
    case 'cloud':      return s + cloud + '</svg>';
    case 'drizzle':    return s + cloud + '<path d="M7 13v2 M9 13.5v2 M11 13v2" stroke-width="1"/>' + '</svg>';
    case 'rain':       return s + rain + cloud + '</svg>';
    case 'heavy-rain': return s + cloud + '<path d="M6 13l-.5 2 M8.5 12.5l-.5 2.5 M11 13l-.5 2" stroke-width="1"/>' + '</svg>';
    case 'snow':       return s + cloud + '<circle cx="7" cy="13" r=".8"/><circle cx="9" cy="13.5" r=".8"/><circle cx="11" cy="13" r=".8"/>' + '</svg>';
    case 'thunder':    return s + cloud + '<path d="M9 10 6 13h2.5l-1 3 4-2.5H9l1.5-3.5Z"/>' + '</svg>';
    case 'fog':        return s + '<path d="M2 7h12 M2 9h10 M2 11h11" stroke-width="1.2"/>' + '</svg>';
    default:           return s + sun + '</svg>';
  }
}

/* ---- 反向地理编码 ---- */
async function reverseCity(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh&zoom=10`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('nominatim fail');
    const d = await r.json();
    const addr = d.address || {};
    return addr.city || addr.town || addr.county || addr.state || addr.country || '';
  } catch (e) {
    return '';
  }
}

/* ---- 获取天气 ---- */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  const r = await fetch(url, { signal: ctrl.signal });
  clearTimeout(t);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

/* ---- 渲染行内天气 ---- */
async function refreshWeather() {
  const el = document.getElementById('wxLine');
  if (!el) return;

  el.style.display = 'block';
  el.innerHTML = '<span class="wx-loading">天气加载中…</span>';

  try {
    let lat, lon, city = '';
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('no geo'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 8000, maximumAge: 600000
        });
      });
      lat = pos.coords.latitude.toFixed(4);
      lon = pos.coords.longitude.toFixed(4);
      city = await reverseCity(lat, lon);
    } catch (e) {
      lat = '39.9042'; lon = '116.4074'; city = '北京';
    }

    const data = await fetchWeather(lat, lon);
    const cur = data.current;
    const wx = WX_MAP[cur.weather_code] || { icon: 'sun', label: '未知' };
    const temp = Math.round(cur.temperature_2m);
    const hum  = cur.relative_humidity_2m;

    el.innerHTML = `${wxIconMini(wx.icon)} <span class="wx-location">${city || '当前位置'}</span> <span class="wx-sep">·</span> <span class="wx-val">${temp}°</span> <span class="wx-label">${wx.label}</span> <span class="wx-sep">·</span> <span class="wx-val">${hum}%</span>`;
  } catch (e) {
    console.warn('天气获取失败:', e);
    el.innerHTML = '<span class="wx-loading">天气暂不可用</span>';
  }
}

/* ---- 初始化 ---- */
let _lastFetch = 0;

export function initWeather() {
  const el = document.getElementById('wxLine');
  if (!el) return;

  refreshWeather();
  _lastFetch = Date.now();

  const observer = new MutationObserver(() => {
    const drawer = document.getElementById('homeMenuDrawer');
    if (drawer && drawer.classList.contains('open')) {
      const now = Date.now();
      if (now - _lastFetch > 600000) {
        refreshWeather();
        _lastFetch = now;
      }
    }
  });

  const drawer = document.getElementById('homeMenuDrawer');
  if (drawer) {
    observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
  }
}
