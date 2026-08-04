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

/* ---- 天气大图标 (24x24) ---- */
function wxIconBig(key) {
  const s = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';
  const sun   = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4"/>';
  const cloud = '<path d="M4 14c-3 0-4-2.5-4-4.5S2 5 4.5 4.5a6 6 0 0 1 11-1c2.5.2 4.5 2 4.5 5S17 14 15 14Z"/>';
  const rain  = '<path d="M14 19l-1 3 M18 19.5l-1 3"/>';
  switch (key) {
    case 'sun':        return s + sun + '</svg>';
    case 'sun-cloud':  return s + sun.replace('r="4.5"','r="3.5"').replace('cy="12"','cy="10"') + cloud + '</svg>';
    case 'cloud-sun':  return s + '<circle cx="7" cy="8" r="3.5"/>' + cloud + '</svg>';
    case 'cloud':      return s + cloud + '</svg>';
    case 'drizzle':    return s + cloud + '<path d="M10 19l-.5 2 M13 19.5l-.5 2 M16 19l-.5 2" stroke-width="1.2"/>' + '</svg>';
    case 'rain':       return s + rain + cloud + '</svg>';
    case 'heavy-rain': return s + cloud + '<path d="M9 19l-1 3 M12.5 18.5l-1 3 M16 19l-1 3" stroke-width="1.2"/>' + '</svg>';
    case 'snow':       return s + cloud + '<circle cx="10" cy="19" r="1.2"/><circle cx="13.5" cy="20" r="1.2"/><circle cx="17" cy="19" r="1.2"/>' + '</svg>';
    case 'thunder':    return s + cloud + '<path d="M13 14 9 18h3l-1.5 4 5-3.5h-3l2-4.5Z"/>' + '</svg>';
    case 'fog':        return s + '<path d="M3 10h18 M3 13h15 M3 16h17" stroke-width="1.5"/>' + '</svg>';
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

/* ---- 渲染天气模块 ---- */
async function refreshWeather() {
  const el = document.getElementById('wxLine');
  if (!el) return;

  el.style.display = 'block';
  const iconEl = document.getElementById('wxIcon');
  const primaryEl = document.getElementById('wxPrimary');
  const secondaryEl = document.getElementById('wxSecondary');
  if (primaryEl) primaryEl.innerHTML = '天气加载中…';
  if (iconEl) iconEl.innerHTML = '—';
  if (secondaryEl) secondaryEl.innerHTML = '';

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
      _wxGeo = { city, lat: parseFloat(lat), lon: parseFloat(lon) };
    } catch (e) {
      lat = '39.9042'; lon = '116.4074'; city = '北京';
    }

    const data = await fetchWeather(lat, lon);
    const cur = data.current;
    const wx = WX_MAP[cur.weather_code] || { icon: 'sun', label: '未知' };
    const temp = Math.round(cur.temperature_2m);
    const hum  = cur.relative_humidity_2m;
    const wind = Math.round(cur.wind_speed_10m);

    if (iconEl) iconEl.innerHTML = wxIconBig(wx.icon);
    if (primaryEl) primaryEl.innerHTML = `<span style="font-size:1.3em;margin-right:6px">${temp}°</span> ${wx.label}`;
    if (secondaryEl) {
      const locSvg = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><circle cx="8" cy="6" r="3"/><path d="M12 14c0-2.2-4-6-4-6s-4 3.8-4 6"/></svg>';
      const humSvg = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M8 14c-1.7 0-3-1.3-3-3 0-2.5 3-5.5 3-5.5s3 3 3 5.5c0 1.7-1.3 3-3 3Z"/></svg>';
      const wndSvg = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M2 7h7c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2"/><path d="M5 10h6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2"/><path d="M3 12.5h5"/></svg>';
      let parts = [];
      if (city) parts.push(`${locSvg} ${city}`);
      parts.push(`${humSvg} ${hum}%`);
      parts.push(`${wndSvg} ${wind} km/h`);
      secondaryEl.innerHTML = parts.join(' <span style="color:var(--c-text-4);margin:0 2px">·</span> ');
    }
  } catch (e) {
    console.warn('天气获取失败:', e);
    if (primaryEl) primaryEl.innerHTML = '天气暂不可用';
    if (secondaryEl) secondaryEl.innerHTML = '';
    if (iconEl) iconEl.innerHTML = '—';
  }
}

/* ---- 导出当前地理位置 ---- */
let _wxGeo = null;

export function getWxGeo() {
  return _wxGeo;
}
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
