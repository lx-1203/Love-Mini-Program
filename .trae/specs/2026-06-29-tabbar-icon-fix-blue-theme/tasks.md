# Tasks

## 阶段一：tabBar 图标格式修复（P0 阻塞）

- [x] Task 1: 源码 tabBar 图标引用统一为 PNG
  - [x] SubTask 1.1: 修改 `apps/client/src/custom-tab-bar/index.js`，将 5 个 tab 的 `iconPath` 与 `activeIconPath` 字段从 `.svg` 改为 `.png`
  - [x] SubTask 1.2: 修改 `apps/client/src/config/navigation.ts`，将 5 个 tab 的 `iconPath` 与 `selectedIconPath` 字段从 `.svg` 改为 `.png`
  - [x] SubTask 1.3: 修改 `apps/client/src/components/layout/TabBar.vue`，将 `defaultTabs` 中 5 个 tab 的 `iconPath` 与 `selectedIconPath` 字段从 `.svg` 改为 `.png`
  - [x] SubTask 1.4: 执行 `grep "tabbar/.*\.svg" apps/client/src` 验证源码中已无 SVG 引用

- [x] Task 2: 清理 tabbar 目录中冗余的 SVG 文件
  - [x] SubTask 2.1: 删除 `apps/client/src/static/assets/icons/tabbar/` 下 10 个 `.svg` 文件
  - [x] SubTask 2.2: 验证目录仅剩 10 个 `.png` 文件

- [x] Task 3: 验证 pages.json 与 PNG 资源
  - [x] SubTask 3.1: 读取 `apps/client/src/pages.json` 确认 `tabBar.list[0..4].iconPath/selectedIconPath` 均为 `.png` 路径
  - [x] SubTask 3.2: 读取 `apps/client/src/pages.json` 确认 `tabBar.selectedColor` 为 `#5B7FFF`
  - [x] SubTask 3.3: 验证 `apps/client/src/static/assets/icons/tabbar/*.png` 文件头为 `89 50 4E 47 0D 0A 1A 0A`，尺寸为 81×81

## 阶段二：首页设计同步优化

- [x] Task 4: 首页 Emoji 替换为 SVG 图标
  - [x] SubTask 4.1: 在 `apps/client/src/pages/home/index.vue` 顶部 import `designTokens`，定义图标路径常量（`school.svg`、`celebration.svg`、`schedule.svg`、`comment.svg`、`shop.svg`、`fire.svg`、`location.svg`、`like.svg`、`like-filled.svg`、`star.svg`）
  - [x] SubTask 4.2: 替换学校选择器 🏫 为 `<image src="school.svg">`
  - [x] SubTask 4.3: 替换 5 个区块标题 Emoji（🎉📅💬🛍️🔥）为对应 SVG 图标
  - [x] SubTask 4.4: 替换帖子位置 📍、点赞 ❤️/🤍、评论 💬、空闲 ✨、活动占位 🎊 为 SVG 图标
  - [x] SubTask 4.5: 验证 `apps/client/src/pages/home/index.vue` 模板中无 Emoji 字符

- [x] Task 5: 首页视频遮罩优化
  - [x] SubTask 5.1: 修改 `.home-bg__overlay` 渐变为 `rgba(255,255,255,0.6) → rgba(255,255,255,0.4)`
  - [x] SubTask 5.2: 叠加品牌色微染层 `rgba(91,127,255,0.05)`

- [x] Task 6: 首页 CSS 变量统一迁移
  - [x] SubTask 6.1: 在 `<script setup>` 中引入 `designTokens as t`
  - [x] SubTask 6.2: 替换 `var(--td-brand-color-6/7/1/2/3)` 为 `v-bind('t.color.brand[400/500/100/200/300]')` 等
  - [x] SubTask 6.3: 替换 `var(--td-bg-color-surface)`、`var(--td-text-color-*)`、`var(--td-shadow-1)`、`var(--td-border-level-1-color)` 为 designTokens 对应字段
  - [x] SubTask 6.4: 验证 `apps/client/src/pages/home/index.vue` 中无 `var(--td-` 引用

- [x] Task 7: 区块标题品牌色装饰
  - [x] SubTask 7.1: 在 `.section__title` 添加 `::before` 伪元素，宽度 4rpx，高度与文字等高，背景为 `linear-gradient(180deg, t.color.brand[400], t.color.brand[500])`
  - [x] SubTask 7.2: 伪元素与文字间距 12rpx（`margin-right: 12rpx`），垂直对齐 `middle`

- [x] Task 8: WelcomeBanner 装饰丰富
  - [x] SubTask 8.1: 在 `apps/client/src/components/home/WelcomeBanner.vue` 中增加 2 个额外装饰圆 view（不同尺寸 200rpx/160rpx、不同位置、不同透明度 0.08/0.12）
  - [x] SubTask 8.2: 为装饰圆添加 `breathe` 浮动动画（`@keyframes` 缩放 1→1.05→1，时长 4s，infinite alternate）

- [x] Task 9: PersonCard 头像光环
  - [x] SubTask 9.1: 在 `apps/client/src/components/home/PersonCard.vue` 中，当 `isSameSchool === true` 时给 `Avatar` 组件外层 view 添加 `person-avatar--halo` class
  - [x] SubTask 9.2: 添加 `.person-avatar--halo` 样式：`box-shadow: 0 0 0 4rpx rgba(91,127,255,0.2), 0 0 16rpx rgba(91,127,255,0.15)`

## 阶段三：构建与验证

- [x] Task 10: 重新构建微信小程序产物
  - [x] SubTask 10.1: 在 `apps/client` 目录执行 `pnpm build:mp-weixin`
  - [x] SubTask 10.2: 验证构建无 error（允许 warning）
  - [x] SubTask 10.3: 验证 `apps/client/dist/build/mp-weixin/app.json` 中 `tabBar.list[*].iconPath/selectedIconPath` 均为 `.png`
  - [x] SubTask 10.4: 验证 `apps/client/dist/build/mp-weixin/custom-tab-bar/index.js` 中图标路径均为 `.png`
  - [x] SubTask 10.5: 验证 `apps/client/dist/build/mp-weixin/static/assets/icons/tabbar/` 下存在 10 个 `.png` 文件且为合法 PNG

- [x] Task 11: 蓝色主题保留校验
  - [x] SubTask 11.1: 对比 `apps/client/src/theme/tokens.ts`，确认 `color.brand.400` 仍为 `#5B7FFF`
  - [x] SubTask 11.2: 对比 `apps/client/src/theme/design-variables.scss`，确认 `$brand-400` 仍为 `#5B7FFF`
  - [x] SubTask 11.3: 确认本次修改未触及 `apps/client/src/theme/` 目录下任何文件

# Task Dependencies
- Task 2 依赖 Task 1（先改完引用再删 SVG）
- Task 4-9（设计优化）可在 Task 1-3 完成后并行进行
- Task 10 依赖 Task 1-9 全部完成（源码与资源就绪后才能构建）
- Task 11 可与 Task 1-9 并行（互不依赖）
