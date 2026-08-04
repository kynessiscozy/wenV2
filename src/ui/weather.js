/* ============================================================
   天气模块 — 定位 → Open-Meteo → 渲染到菜单卡片
   自动适配明暗主题，使用项目语义变量
   ============================================================ */

// Open-Meteo 天气编码 → 图标 key + 中文描述
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

/* ---- 手绘风格天气 SVG 图标 ---- */
function wxIconSVG(key) {
  const base = '<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';
  const sunRays = [
    'M24 6v3','M24 39v3','M6 24h3','M39 24h3',
    'M11.3 11.3l2.1 2.1','M34.6 34.6l2.1 2.1',
    'M11.3 36.7l2.1-2.1','M34.6 13.4l2.1-2.1'
  ];
  const sunCircle = '<circle cx="24" cy="24" r="7.5"/>';
  const cloudBody = '<path d="M12 28c-4 0-6-3-6-6s2-5.5 5.5-6a8 8 0 0 1 15-2c3.5.4 6 3 6 6.5S29 28 26 28Z"/>';
  const drizzleDrops = [
    'M20 36v4','M24 37v4','M28 36v4'
  ];
  const rainDrops = [
    'M19 35l-1.5 5','M24 36l-1.5 5','M29 35l-1.5 5'
  ];
  const heavyRain = [
    'M18 34l-1 4','M22 33l-1 5','M26 34l-1 4','M30 33l-1 5'
  ];
  const snowFlakes = [
    'M20 37a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
    'M25 38a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
    'M29 37a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z'
  ];
  const thunderBolt = '<path d="M26 30 18 36h6l-2 6 8-7h-5l3-5Z"/>';
  const fogLines = [
    'M12 20h24','M12 24h20','M12 28h22'
  ];

  switch (key) {
    case 'sun':
      return base + sunRays.map(d => `<path d="${d}"/>`).join('') + sunCircle + '</svg>';
    case 'sun-cloud':
      return base + sunRays.map(d => `<path d="${d}"/>`).join('') + sunCircle + cloudBody.replace(/M12 28/, 'M14 32') + '</svg>';
    case 'cloud-sun':
      return base + sunCircle.replace(/r="7.5"/, 'r="5.5"').replace(/24,24/, '18,18') + cloudBody + '</svg>';
    case 'cloud':
      return base + cloudBody + '</svg>';
    case 'drizzle':
      return base + cloudBody + drizzleDrops.map(d => `<path d="${d}" stroke-width="1.2"/>`).join('') + '</svg>';
    case 'rain':
      return base + cloudBody + rainDrops.map(d => `<path d="${d}"/>`).join('') + '</svg>';
    case 'heavy-rain':
      return base + cloudBody + heavyRain.map(d => `<path d="${d}"/>`).join('') + '</svg>';
    case 'snow':
      return base + cloudBody + snowFlakes.join('') + '</svg>';
    case 'thunder':
      return base + cloudBody + thunderBolt + '</svg>';
    case 'fog':
      return base + fogLines.map(d => `<path d="${d}"/>`).join('') + '</svg>';
    default:
      return base + sunCircle + '</svg>';
  }
}

/* ---- 城市名反向地理编码 ---- */
async function reverseCity(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh&zoom=10`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('nominatim fail');
    const d = await r.json();
    // 优先取 city / town / county / state
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

/* ---- 主函数 ---- */
async function refreshWeather() {
  const el = document.getElementById('wxCard');
  if (!el) return;

  // 显示加载态
  el.innerHTML = `<div class="wx-loading">查询天气中…</div>`;
  el.classList.add('show');

  try {
    // 1. 浏览器定位
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
      // 定位失败 → 默认北京
      lat = '39.9042'; lon = '116.4074'; city = '北京';
    }

    // 2. 获取天气
    const data = await fetchWeather(lat, lon);
    const cur = data.current;
    const wcode = cur.weather_code;
    const wx = WX_MAP[wcode] || { icon: 'sun', label: '未知' };

    // 3. 渲染
    const temp = Math.round(cur.temperature_2m);
    const hum = cur.relative_humidity_2m;
    const wind = cur.wind_speed_10m;
    const icon = wxIconSVG(wx.icon);

    el.innerHTML = `
      <div class="wx-card-inner">
        <div class="wx-icon">${icon}</div>
        <div class="wx-info">
          <div class="wx-primary">
            <span class="wx-temp">${temp}°</span>
            <span class="wx-label">${wx.label}</span>
          </div>
          <div class="wx-meta">
            <span class="wx-city">${city || '当前位置'}</span>
            <span class="wx-detail">湿度 ${hum}% · 风速 ${wind} km/h</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    console.warn('天气获取失败:', e);
    el.innerHTML = `<div class="wx-error">天气暂不可用</div>`;
  }
}

/* ---- 初始化（节流，菜单打开时拉取）---- */
let _lastFetch = 0;

export function initWeather() {
  const el = document.getElementById('wxCard');
  if (!el) return;

  // 首次拉取
  refreshWeather();
  _lastFetch = Date.now();

  // 监听菜单打开，距离上次拉取 > 10 分钟则刷新
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
