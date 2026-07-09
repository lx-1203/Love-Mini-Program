# 微信小程序 tabBar 图标修复 + 设计同步优化（保留蓝色主题）Spec

## Why
微信开发者工具在打开 `apps/client/dist/build/mp-weixin/` 时报错：
```
[ app.json 文件内容错误 ] app.json: ["tabBar"]["list"][0..4]["iconPath" / "selectedIconPath"]
Wrong file format, only .png、.jpg、.jpeg format is supported
```
错误覆盖全部 5 个 Tab，导致小程序无法正常预览/上传。

同时，`doc/design-beautify-research.md` 美化研究报告诊断出多项设计问题：
- 首页大量使用 Emoji（🏫🎉📅💬🛍️🔥📍🎊）替代 SVG 图标，与项目已有 SVG 图标系统风格不统一
- 首页仍在使用旧版 TDesign 变量 `--td-brand-color-*`，与新版 `--c-*`/`designTokens` 体系并存
- 首页视频遮罩 `rgba(255,255,255,0.85)` 过重，视频几乎不可见
- WelcomeBanner 装饰元素单一（仅一个半透明圆）
- PersonCard 朴素，缺少头像光环/匹配度色条等情感化设计
- 区块标题为纯文字 + Emoji，缺少品牌色装饰

用户要求：**保留蓝色品牌主题 `#5B7FFF`**（不采纳 research 报告的青藤绿方案），但同步进行设计优化与 tabBar 修复。

## What Changes

### A. tabBar 图标格式修复（P0，阻塞修复）
- 统一将源码中 tabBar 图标引用从 `.svg` 改为 `.png`（PNG 文件已存在且为合法 81×81 RGBA PNG）
  - `apps/client/src/custom-tab-bar/index.js`
  - `apps/client/src/config/navigation.ts`
  - `apps/client/src/components/layout/TabBar.vue`
- 删除 `apps/client/src/static/assets/icons/tabbar/*.svg` 冗余源文件（仅保留 `.png`）
- 重新构建 `mp-weixin` 产物，刷新 `dist/build/mp-weixin/app.json` 与 `custom-tab-bar/index.js`

### B. 首页 Emoji 替换为 SVG 图标（P0，同步进行）
- 将 `apps/client/src/pages/home/index.vue` 中以下 Emoji 替换为项目已有 SVG 图标：
  - 🏫 → `school.svg`
  - 🎉 → `celebration.svg`
  - 📅 → `schedule.svg`
  - 💬 → `comment.svg`
  - 🛍️ → `shop.svg`
  - 🔥 → `fire.svg`
  - 📍 → `location.svg`
  - 🎊 → `celebration.svg`
  - ❤️/🤍 → `like.svg`/`like-filled.svg`
  - ✨ → `star.svg`
- 用 `<image>` 标签 + 主题色着色（CSS filter 或 PNG 着色版本）渲染图标

### C. 首页视频遮罩优化（P1）
- 将 `home-bg__overlay` 的渐变从 `rgba(255,255,255,0.85→0.6)` 改为 `rgba(255,255,255,0.6→0.4)`，叠加品牌色微染 `rgba(91,127,255,0.05)`，提升视频可见度

### D. CSS 变量统一迁移（P1）
- 将 `apps/client/src/pages/home/index.vue` 中所有 `var(--td-brand-color-*)`、`var(--td-bg-color-*)`、`var(--td-text-color-*)`、`var(--td-shadow-*)`、`var(--td-border-level-1-color)` 替换为 `designTokens` 中的对应字段（通过 `v-bind` 引用 `t.color.brand[400]` 等）

### E. WelcomeBanner 装饰丰富（P1）
- 在 `apps/client/src/components/home/WelcomeBanner.vue` 中增加 2-3 个不同大小/位置/透明度的半透明装饰圆，添加 `breathe` 浮动动画

### F. PersonCard 情感化增强（P1）
- 在 `apps/client/src/components/home/PersonCard.vue` 中：
  - 头像添加品牌色 `box-shadow` 光环（在线/同校时）
  - 区块标题左侧添加品牌色竖线装饰（4rpx 宽，与标题等高）

### G. 区块标题品牌色装饰（P1）
- 在 `apps/client/src/pages/home/index.vue` 的 `.section__title` 前增加品牌色竖线装饰（伪元素 `::before`，4rpx 宽，渐变色 `brand-400 → brand-500`）

### H. 保留蓝色品牌主题（贯穿所有改动）
- 不修改 `apps/client/src/theme/tokens.ts` 与 `apps/client/src/theme/design-variables.scss` 中的色板
- 品牌主色保持 `#5B7FFF`，不引入 `#3FCF8E` 绿色色板

## Impact
- Affected specs: `2026-06-26-wechat-mp-debugging`（微信小程序调试基线）
- Affected code:
  - **tabBar 修复**：
    - `apps/client/src/custom-tab-bar/index.js`
    - `apps/client/src/config/navigation.ts`
    - `apps/client/src/components/layout/TabBar.vue`
    - `apps/client/src/static/assets/icons/tabbar/*.svg`（删除 10 个）
  - **设计优化**：
    - `apps/client/src/pages/home/index.vue`（Emoji 替换 + 视频遮罩 + CSS 变量 + 区块标题装饰）
    - `apps/client/src/components/home/WelcomeBanner.vue`（装饰丰富）
    - `apps/client/src/components/home/PersonCard.vue`（头像光环）
  - **构建产物**：`apps/client/dist/build/mp-weixin/*` 刷新
- 不影响主题色：`apps/client/src/theme/tokens.ts` 与 `apps/client/src/theme/design-variables.scss` 保持不变
- 不影响其他页面（discover/likes/profile/messages 等）

## ADDED Requirements

### Requirement: 源码 tabBar 图标引用统一为 PNG
源码中所有引用 tabbar 图标的位置（custom-tab-bar、navigation 配置、TabBar.vue 组件）SHALL 使用 `.png` 扩展名的图标路径，禁止引用 `.svg` 文件。

#### Scenario: 源码扫描无 SVG 引用
- **WHEN** 对 `apps/client/src` 目录执行 `grep "tabbar/.*\\.svg"` 检索
- **THEN** 返回 0 条匹配结果

#### Scenario: PNG 文件存在且合法
- **WHEN** 检查 `apps/client/src/static/assets/icons/tabbar/` 目录
- **THEN** 存在 10 个 `.png` 文件（home/village/discover/chat/profile × default/active），文件头为 `89 50 4E 47 0D 0A 1A 0A`，尺寸为 81×81 像素

### Requirement: tabBar 图标 SVG 源文件清理
`apps/client/src/static/assets/icons/tabbar/` 目录下 SHALL 仅保留 `.png` 文件，删除所有 `.svg` 文件。

#### Scenario: 目录仅含 PNG
- **WHEN** 列出 `apps/client/src/static/assets/icons/tabbar/` 目录文件
- **THEN** 仅存在 10 个 `.png` 文件，不存在 `.svg` 文件

### Requirement: 首页 Emoji 替换为 SVG 图标
`apps/client/src/pages/home/index.vue` 中所有 Emoji 字符（🏫🎉📅💬🛍️🔥📍🎊❤️🤍✨）SHALL 替换为 `<image>` 标签引用 `static/assets/icons/common/` 或 `static/assets/icons/social/` 下已有 SVG 图标，使用 `designTokens` 主题色着色。

#### Scenario: 首页无 Emoji
- **WHEN** 对 `apps/client/src/pages/home/index.vue` 执行 Emoji 字符检索
- **THEN** 模板中不再出现 🏫🎉📅💬🛍️🔥📍🎊❤️🤍✨ 等 Emoji 字符（仅允许在注释中出现）

#### Scenario: 图标引用合法路径
- **WHEN** 检查 `apps/client/src/pages/home/index.vue` 中的 `<image>` 标签
- **THEN** `src` 属性引用的图标文件实际存在于 `src/static/assets/icons/common/` 或 `src/static/assets/icons/social/` 目录

### Requirement: 首页视频遮罩可见度优化
`apps/client/src/pages/home/index.vue` 的 `.home-bg__overlay` 渐变 SHALL 降低白色不透明度至 `0.4~0.6` 区间，并叠加品牌色微染 `rgba(91,127,255,0.05)`，使视频背景可见且内容可读。

#### Scenario: 视频可见
- **WHEN** 在首页渲染时查看视频背景
- **THEN** 视频内容可见（非完全被白色遮罩覆盖），同时文字内容仍可清晰阅读

### Requirement: 首页 CSS 变量统一为 designTokens
`apps/client/src/pages/home/index.vue` 中 SHALL 不再使用 `var(--td-*)` 旧版 TDesign 变量，统一通过 `v-bind` 引用 `designTokens`（`t.color.*`、`t.shadow.*` 等）。

#### Scenario: 无 --td-* 变量引用
- **WHEN** 对 `apps/client/src/pages/home/index.vue` 执行 `var(--td-` 检索
- **THEN** 返回 0 条匹配结果

### Requirement: WelcomeBanner 装饰丰富
`apps/client/src/components/home/WelcomeBanner.vue` SHALL 增加 2-3 个不同大小/位置/透明度的半透明装饰圆，并应用 `breathe` 浮动动画，提升首屏视觉层次。

#### Scenario: 多个装饰圆
- **WHEN** 检查 `WelcomeBanner.vue` 的样式
- **THEN** 存在至少 3 个装饰圆元素（伪元素或独立 view），尺寸/位置/透明度各异

### Requirement: PersonCard 头像光环
`apps/client/src/components/home/PersonCard.vue` 的头像 SHALL 在同校/同专业场景下添加品牌色 `box-shadow` 光环（`0 0 0 4rpx rgba(91,127,255,0.2)`）。

#### Scenario: 同校头像有光环
- **WHEN** `isSameSchool === true` 时渲染 PersonCard
- **THEN** 头像元素具有品牌色 box-shadow 光环

### Requirement: 区块标题品牌色装饰
`apps/client/src/pages/home/index.vue` 的 `.section__title` SHALL 在左侧添加品牌色竖线装饰（4rpx 宽，渐变色 `brand-400 → brand-500`），与文字之间有 12rpx 间距。

#### Scenario: 标题左侧有竖线
- **WHEN** 渲染首页各区块标题
- **THEN** 标题左侧出现品牌色渐变竖线装饰

## MODIFIED Requirements

### Requirement: 微信小程序 tabBar 配置合规
`apps/client/src/pages.json` 的 `tabBar.list` 中每一项的 `iconPath` 与 `selectedIconPath` 字段 SHALL 使用 `.png`/`.jpg`/`.jpeg` 扩展名，且对应文件存在于 `src/static/` 目录下并被构建系统正确复制到 `dist/build/mp-weixin/static/`。

构建产物 `dist/build/mp-weixin/app.json` 的 `tabBar.list[*].iconPath/selectedIconPath` SHALL 与 `pages.json` 一致，且 `dist/build/mp-weixin/static/assets/icons/tabbar/*.png` 文件 SHALL 为合法 PNG（文件头魔数 `89 50 4E 47 0D 0A 1A 0A`）。

#### Scenario: 微信开发者工具无图标格式错误
- **GIVEN** 已执行 `pnpm build:mp-weixin` 生成最新构建产物
- **WHEN** 在微信开发者工具中打开 `apps/client/dist/build/mp-weixin/` 目录
- **THEN** 控制台不再出现 `["tabBar"]["list"][*]["iconPath"] Wrong file format` 错误，项目可正常预览

#### Scenario: 自定义 tabBar 组件图标正常加载
- **GIVEN** 小程序运行中，`tabBar.custom = true`
- **WHEN** 切换 Tab 或查看任意 Tab 页面
- **THEN** 自定义 tabBar 组件渲染的图标为 PNG 图标，无 broken image 占位符

### Requirement: 保留蓝色品牌主题
本次修复与设计优化 SHALL NOT 修改 `apps/client/src/theme/tokens.ts`、`apps/client/src/theme/design-variables.scss`、`apps/client/src/pages.json` 中 `tabBar.selectedColor` 等任何与品牌色相关的配置；品牌主色保持 `#5B7FFF`（暖蓝），不引入 `#3FCF8E`（青藤绿）色板。

#### Scenario: 品牌色令牌未变更
- **WHEN** 对比 `apps/client/src/theme/tokens.ts` 与 `apps/client/src/theme/design-variables.scss` 修改前后
- **THEN** `color.brand.400` 仍为 `#5B7FFF`，`$brand-400` 仍为 `#5B7FFF`，无绿色色板字段

#### Scenario: tabBar 选中色保持蓝色
- **WHEN** 读取 `apps/client/src/pages.json` 的 `tabBar.selectedColor`
- **THEN** 值为 `#5B7FFF`

## REMOVED Requirements

### Requirement: tabbar SVG 图标源文件
**Reason**: 微信小程序原生 tabBar 仅支持 PNG/JPG/JPEG，SVG 在开发者工具中会触发"Wrong file format"错误。已通过 `scripts/svg-to-png.mjs` 生成对应 PNG，SVG 源文件不再需要存在于 `tabbar` 目录中。
**Migration**: 已生成的 `.png` 文件作为唯一图标来源；若需重新生成，可从 `git` 历史中恢复 SVG 或运行 `svg-to-png.mjs` 重新转换。
