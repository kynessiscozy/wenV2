# Claude 风格改造说明

本分支（`claude-style`）把「问问大师」从**暗色玻璃拟态 / 霓虹光效**改造为
**Claude.ai 风格**：米白纸感底、赭橙单强调色、扁平卡片、宽松排版，并支持浅色 / 深色双主题。

---

## 一、设计对照

| 维度 | 改造前 | 改造后（Claude 风格） |
|---|---|---|
| 底色 | 纯黑 + 动态渐变网格 + 粒子星空 | 浅色 `#faf9f5` / 深色 `#262624`，无动态背景 |
| 强调色 | 随「用神」切换五套色相（木绿/火红/土黄/金灰/水蓝） | 统一 Claude 赭橙 `#d97757` |
| 卡片 | 半透明 + `backdrop-filter` 磨砂 + 大面积深投影 | 纯色表面 + 1px 描边 + `0 1px 2px` 极轻阴影 |
| 按钮 | 渐变玻璃胶囊 + 光晕 | 实心赭橙主按钮 / 描边幽灵次按钮 |
| 字体 | 全站无衬线，宽字距 | 标题衬线（Tiempos/宋体族）+ 正文无衬线，字距归零 |
| 光标 | 自定义跟随光球 + 光环 | 系统原生光标 |
| 底栏 | 液态玻璃 dock + 轨道动画 AI 球 | 纯色胶囊 + 柔和选中态 |
| 主题 | 仅暗色 | 浅色 / 深色 / 跟随系统，可一键切换 |

---

## 二、新增文件

| 文件 | 作用 |
|---|---|
| `src/theme-claude.css` | **设计令牌层**。定义 `--c-bg / --c-surface* / --c-text* / --c-border* / --c-accent*` 与五行色，浅深两套值 |
| `src/claude-ui.css` | **组件层**。把既有类名重塑为 Claude 外观；末尾重新声明 `--ac*` 等派生变量以覆盖 `styles.css` 的 `:root` |
| `src/ui/theme.js` | 主题切换逻辑：读写 `localStorage.tj_theme`、注入切换按钮、响应系统主题变化 |

样式加载顺序（`index.html`）：

```
theme-claude.css  →  styles.css  →  ig-dock.css  →  claude-ui.css
   令牌                原有样式        底栏样式         Claude 覆盖层
```

`index.html` `<head>` 内含一段内联脚本，在首屏渲染前写入 `data-theme`，避免明暗闪烁。

---

## 三、代码改动

### 语义化配色（codemod）
原代码在 CSS 与 JS 模板字符串里写死了上千处 `rgba(255,255,255,.xx)` / `#fff` / 深色 `rgba(0,0,0,.x)`。
`tools/` 下的脚本按 **CSS 属性上下文**（`color` / `background` / `border`）把它们批量映射到语义令牌：

| 脚本 | 作用 |
|---|---|
| `tools/claudeify.py` | 第一轮：白系颜色 → `--c-text*` / `--c-surface*` / `--c-border*` |
| `tools/claudeify2.py` | 第二轮：暗色底（低明度 rgba/hex/hsla）→ 同上 |
| `tools/strip-glass.py` | 删除 15 条 `[data-glass]`「玻璃质感强度」规则 |
| `tools/strip-shadows.py` | 中和 48 条深黑投影（在浅底上会变成脏灰光晕） |

### 手工改动
- `src/engines/shared.js` — 五行色 `WC` 改为 `var(--wx-*)`，随主题切换明度
- `src/engines/bazi.js` — 神煞标签配色改用 `color-mix()` + 语义色
- `src/ui/navigation.js` — `applyTheme()` 不再按用神改写全站色相，只写 `data-yongshen` 数据标记
- `src/render/report.js` — canvas 图表网格线/轴标签跟随明暗；剩余写死色值改为语义变量
- `src/main.js` — 图表强调色固定为赭橙；接入 `initTheme()`

---

## 四、主题切换

- 首页右上角 / 报告页顶栏各有一个 🌙☀️ 切换按钮
- 默认跟随系统；用户手动切换后固定，写入 `localStorage.tj_theme`
- 也可在控制台调用 `toggleTheme()`

---

## 五、验证

`tools/` 下的 Puppeteer 脚本用于回归检查：

```bash
npm run build
npx vite preview --port 4173 &

node tools/shot.mjs      # 首页/报告/运势/工具/AI 面板 × 明暗 → /tmp/shots
node tools/shot2.mjs     # 大师模式/工具弹层/保存弹窗 × 明暗 → /tmp/shots2
node tools/contrast.mjs  # WCAG AA 对比度审计
```

当前 `contrast.mjs` 结果：**浅色 0 处、深色 0 处**低对比文本（AA 标准，正文 4.5:1、大字 3:1）。

---

## 六、回滚

```bash
git checkout main          # 回到改造前
git diff main claude-style # 查看全部改动
```
