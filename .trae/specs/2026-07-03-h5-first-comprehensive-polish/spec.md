# H5 优先综合修复与视觉层级强化 Spec

## Why
尽管前序 spec（`2026-07-01-visual-function-comprehensive-fix`、`2026-07-02-core-experience-rebuild`、v5 验证报告）已完成多轮修复，用户在 2026-07-03 真机验证中仍发现 11 项阻塞性问题：图片添加不全且未正常显示、按钮点击后内容消失、核心匹配与签到标签未生效、图片分割不清晰、整体不适配小程序架构、个人主页功能不全、按钮仅有震动无视觉反馈、Tab 切换无感知动画、边缘色与层级缺失。根因在于：之前修复偏重资源下载与样式声明，未在 H5 真机环境下完整验证渲染链路；缺少 H5 → mp-weixin 的渐进式适配流程，导致 mp-weixin 编译后问题再现。

本 spec 采用 **H5 优先调试** 策略：先在 H5 环境用 agent-browser 完整验证所有视觉与功能问题修复，再适配 mp-weixin 兼容性，最后产出真机截图归档。

## What Changes

### A. H5 优先调试基础设施（P0）
- 启动 H5 dev server（`pnpm --filter client dev:h5`）并使用 agent-browser 自动化验证
- 在 H5 环境完整跑通：登录 → 首页 → 寻觅（签到+匹配）→ 喜欢 → 村口 → 消息 → 聊天 → 我的
- 每个页面截图归档到 `.trae/screenshots/2026-07-03-h5-polish/`
- 生成 H5 验证报告 `h5-verification-report.md`，列出所有问题与修复状态
- H5 全部通过后，再执行 mp-weixin 编译验证（`pnpm --filter client build:mp-weixin`）

### B. 图片资源完整性与显示修复（P0）
- 审计 `apps/client/src/static/assets/images/` 所有子目录，补齐缺失图片：
  - `posters/`：login-poster.jpg、home-poster.jpg
  - `posts/`：campus-library.jpg、post-placeholder.jpg、post-1.jpg ~ post-8.jpg
  - `activities/`：activity-1.jpg ~ activity-6.jpg
  - `products/`：food-1/2.jpg、merch-1/2.jpg、ticket-1/2.jpg
  - `banners/`：village-banner.jpg、home-banner.jpg
  - `avatars/`：avatar-1.jpg ~ avatar-12.jpg（每张 MD5 唯一）
- 修复 `apps/client/src/config/images.ts` 路径与文件名一致
- 修复 `apps/client/src/services/mocks/fixtures.ts` 中所有 `avatar`/`images` 字段使用本地路径
- 修复 `SafeImage.vue` 加载失败时降级到 `default-avatar.png`，并在控制台输出错误日志
- 验证 H5 中所有 `<image>` 标签无 404，所有图片实际渲染（非空白）

### C. 按钮点击响应与内容保持修复（P0）
- 排查所有按钮 `@click`/`@tap` 绑定，确保点击后：
  - 跳转类按钮：正确跳转目标页，目标页内容正常显示（非空白）
  - 操作类按钮（喜欢/超级喜欢/签到）：触发 store action 并显示反馈
- 修复「点击进入后内容消失」问题：
  - 检查 `pages/discover/index.vue`、`pages/likes/index.vue`、`pages/village/index.vue` 跳转后目标页 `onShow`/`onLoad` 数据加载逻辑
  - 确保目标页 `pageVisible` 状态正确初始化，不应在 `onShow` 中重置为 `false` 后未恢复
  - 修复 `setTimeout(() => { pageVisible.value = true; }, 30)` 在快速切换时被中断的问题
- 修复 `pages/likes/index.vue` 喜欢列表加载逻辑，确保从 discover 跳转后数据可见

### D. 核心功能匹配与签到标签修复（P0）
- **签到标签显示**：
  - 修复 `pages/discover/index.vue` 签到卡片渲染条件 `v-if="!checkInStore.checkedIn && !checkInStore.loading"`
  - 修复 mock 模式下 `checkin.ts` 的 `fetchStatus` 未正确设置 `loading = false` 的时序
  - 签到成功后 `showSuccessAnimation` 显示 3 秒，自动过渡到 benefits-section
  - 签到标签在签到前显示「今日签到」徽章，签到后显示「已签到」徽章
- **匹配功能完整实现**：
  - 修复 `stores/discover.ts` 的 `swipeRight` 逻辑，mock 模式下 30% 概率 `matched = true`
  - 修复 `CardSwiper.vue` 滑动事件绑定，确保 `@swipe`/`@superLike` 正确触发
  - 匹配成功时显示 toast「匹配成功」+ 双头像碰撞动画，1.5 秒后跳转 `pages/likes/index`
  - 修复匹配历史记录联动，喜欢列表显示已匹配用户

### E. 按钮反馈动画强化（P0，**BREAKING**）
- **BREAKING**：移除仅依赖 `uni.vibrateShort` 的震动反馈，改为「视觉动画 + 触觉反馈」组合
- 增强 `apps/client/src/components/common/Button.vue`：
  - ripple 涟漪扩散动画（点击位置出发，300ms 扩散）
  - `:active` scale(0.94) 缩放反馈
  - loading spinner 样式（按钮 loading 状态时显示）
- 增强 `apps/client/src/components/layout/TabBar.vue` 与 `custom-tab-bar/index.js`：
  - Tab 切换时图标 scale(1.15) + 颜色过渡（250ms cubic-bezier(0.4, 0, 0.2, 1)）
  - 选中态顶部 4rpx 品牌色渐变指示条（展开动画）
  - 切换时同时触发 `uni.vibrateShort` 触觉反馈（保留震动，但增加视觉）
- 增强 `press-feedback` 工具类：
  - 当前 `hover-class="press-feedback--active"` 仅做 scale，需增加 box-shadow + 透明度变化
  - 添加 `transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)`

### F. 页面切换动画强化（P0）
- 修复 `page-fade-in` 工具类：
  - 当前 `pageVisible` 在 `onShow` 中先 `false` 再 `setTimeout 30ms` 设 `true`，快速切换时会闪烁
  - 改为 CSS 动画 `@keyframes pageFadeIn` 直接触发，不依赖 JS 状态切换
  - 动画：`opacity 0 → 1` + `translateY(24rpx) → 0`，时长 350ms，缓动 `cubic-bezier(0.16, 1, 0.3, 1)`
- Tab 切换时页面内容淡入 + 上移感知明显
- 关键卡片入场动画：stagger 100ms 错位入场

### G. 视觉层级与边缘强化（P0）
- 在 `apps/client/src/theme/design-variables.scss` 中定义完整层级系统：
  - `--c-elevation-1`: `0 1rpx 4rpx rgba(15,23,42,0.04)`（卡片基础）
  - `--c-elevation-2`: `0 4rpx 16rpx rgba(15,23,42,0.08)`（卡片悬浮）
  - `--c-elevation-3`: `0 12rpx 32rpx rgba(15,23,42,0.12)`（弹层）
  - `--c-border-card`: `1rpx solid rgba(15,23,42,0.08)`
  - `--c-border-card-brand`: `1rpx solid rgba(91,127,255,0.2)`（品牌色边框）
- 强化所有卡片组件（`SectionCard`/`Card`/`PersonCard`/`ActivityCard`/`Tag`）：
  - 默认 `elevation-1` + `border-card`
  - `:active`/`hover` 升级到 `elevation-2` + `border-card-brand`
- 强化页面背景：所有 tab 页面使用 `linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)`
- 强化图片分割：每张图片增加 `border-radius: 16rpx` + `box-shadow: 0 2rpx 8rpx rgba(15,23,42,0.06)`
- 强化首页/寻觅页/村口页卡片标题左侧品牌色竖线装饰（4rpx 宽，60rpx 高，渐变蓝）

### H. 个人主页功能完善（P0）
- 审计 `pages/profile/index.vue`，补齐缺失功能：
  - 用户基本信息卡片（头像、昵称、学校、签名）
  - VIP 状态展示（若已开通）
  - 我的动态列表（已发布帖子）
  - 我的喜欢列表入口
  - 我的匹配列表入口
  - 设置入口（通知、隐私、关于）
  - 反馈入口
- 修复 `stores/profile.ts` 数据加载逻辑，确保 `fetchProfile` 在 `onShow` 时正确执行
- 修复 `view-models/profile.ts` 数据转换逻辑
- 个人主页所有按钮可点击并有反馈动画

### I. 小程序架构适配验证（P0）
- H5 验证通过后，执行 `pnpm --filter client build:mp-weixin`
- 在微信开发者工具中打开 `apps/client/dist/build/mp-weixin/`
- 验证以下 mp-weixin 兼容性：
  - 无 `import.meta.env.DEV` 引用（mp-weixin 不支持）
  - 无 `backdrop-filter`（mp-weixin 部分不支持，需降级到 `background-color: rgba(255,255,255,0.85)`）
  - 无 `position: sticky`（mp-weixin 部分不支持，改用 `fixed` + 占位）
  - 无 `:hover` 伪类（mp-weixin 不支持，改用 `hover-class`）
  - CSS 变量在 mp-weixin 中正常解析
- 8 个核心页面真机截图归档到 `.trae/screenshots/2026-07-03-mp-weixin-polish/`

## Impact
- Affected specs:
  - `2026-07-02-core-experience-rebuild`（核心体验重做基线）
  - `2026-07-01-visual-function-comprehensive-fix`（视觉功能修复基线）
  - `2026-06-29-tabbar-icon-fix-blue-theme`（tabBar 蓝色主题基线）
- Affected code:
  - **图片资源**：`apps/client/src/static/assets/images/*`、`apps/client/src/static/assets/avatars/*`
  - **图片加载**：`apps/client/src/components/common/SafeImage.vue`、`apps/client/src/config/images.ts`、`apps/client/src/services/mocks/fixtures.ts`
  - **按钮交互**：`apps/client/src/components/common/Button.vue`、`apps/client/src/components/layout/TabBar.vue`、`apps/client/src/custom-tab-bar/index.js`、`apps/client/src/utils/haptic.ts`
  - **核心功能**：`apps/client/src/pages/discover/index.vue`、`apps/client/src/stores/discover.ts`、`apps/client/src/stores/checkin.ts`、`apps/client/src/components/discover/CardSwiper.vue`
  - **个人主页**：`apps/client/src/pages/profile/index.vue`、`apps/client/src/stores/profile.ts`、`apps/client/src/view-models/profile.ts`
  - **视觉层级**：`apps/client/src/theme/design-variables.scss`、`apps/client/src/components/common/SectionCard.vue`、`apps/client/src/components/common/Card.vue`、`apps/client/src/components/home/PersonCard.vue`
  - **页面切换**：`apps/client/src/theme/global.css`（page-fade-in 工具类）、各 tab 页面入口
  - **目标页内容**：`apps/client/src/pages/likes/index.vue`、`apps/client/src/pages/village/index.vue`、`apps/client/src/pages/discover/index.vue`
- 不影响：后端 API、admin 后台、数据库结构

## ADDED Requirements

### Requirement: H5 优先调试流程
开发流程 SHALL 先在 H5 环境（`pnpm --filter client dev:h5`）使用 agent-browser 完整验证所有页面与功能，截图归档后再执行 mp-weixin 编译验证。

#### Scenario: H5 验证先行
- **WHEN** 开发者开始修复
- **THEN** 启动 H5 dev server，用 agent-browser 访问每个页面，截图归档到 `.trae/screenshots/2026-07-03-h5-polish/`
- **AND** 生成 `h5-verification-report.md` 记录每个页面验证状态

#### Scenario: mp-weixin 验证后置
- **GIVEN** H5 验证全部通过
- **WHEN** 执行 `pnpm --filter client build:mp-weixin`
- **THEN** 在微信开发者工具中验证 8 个核心页面，截图归档到 `.trae/screenshots/2026-07-03-mp-weixin-polish/`

### Requirement: 图片资源完整可加载
`apps/client/src/static/assets/images/` 下所有子目录（posters/posts/activities/products/banners）与 `avatars/` SHALL 包含真实可加载的 JPG/PNG 图片，每张大小 ≥ 10KB，MD5 唯一。

#### Scenario: 图片目录完整
- **WHEN** 列出 `posters/`、`posts/`、`activities/`、`products/`、`banners/`、`avatars/` 目录
- **THEN** 每个目录下有对应的 JPG/PNG 文件，每个文件大小 ≥ 10KB，且 MD5 互不相同

#### Scenario: H5 中图片实际渲染
- **GIVEN** H5 dev server 已启动
- **WHEN** 用 agent-browser 访问首页、寻觅页、村口页、个人主页
- **THEN** 所有 `<img>` 标签实际加载图片（非空白、非 broken），浏览器控制台无 404 错误

### Requirement: 按钮点击响应与内容保持
所有按钮点击后 SHALL 正确响应：跳转类按钮目标页内容正常显示，操作类按钮触发 store action 并显示反馈；点击进入后内容 SHALL NOT 消失。

#### Scenario: 跳转按钮目标页内容显示
- **GIVEN** 用户在寻觅页
- **WHEN** 点击「查看喜欢列表」按钮
- **THEN** 跳转到喜欢页，喜欢列表数据正常显示，页面非空白

#### Scenario: 操作按钮触发反馈
- **GIVEN** 用户在寻觅页卡片前
- **WHEN** 点击「喜欢」按钮
- **THEN** 卡片滑出动画，store 记录喜欢，30% 概率显示「匹配成功」toast

### Requirement: 签到标签显示
`pages/discover/index.vue` SHALL 在签到前显示「今日签到」卡片与徽章，签到成功后 3 秒内显示「签到成功」动画，3 秒后自动过渡到 benefits-section，并显示「已签到」徽章。

#### Scenario: 签到前显示签到卡片
- **GIVEN** 用户首次进入寻觅页且未签到
- **WHEN** 页面渲染完成
- **THEN** 顶部显示「今日签到」卡片与「今日签到」徽章

#### Scenario: 签到后显示权益
- **GIVEN** 用户点击「立即签到」
- **WHEN** `checkInStore.checkIn()` 完成
- **THEN** 3 秒内显示「签到成功」动画，3 秒后切换为 benefits-section，徽章变为「已签到」

### Requirement: 匹配功能完整实现
`stores/discover.ts` 在 mock 模式下 SHALL 让 `swipeRight` 操作有 30% 概率返回 `matched = true`，匹配成功时显示 toast + 动画并 1.5 秒后跳转喜欢页。

#### Scenario: 右滑喜欢可触发匹配
- **GIVEN** mock 模式下用户在寻觅页
- **WHEN** 右滑卡片或点击「喜欢」按钮
- **THEN** 卡片滑出，30% 概率显示「匹配成功」toast + 双头像碰撞动画，1.5 秒后跳转喜欢页

#### Scenario: 匹配历史联动
- **GIVEN** 已发生匹配
- **WHEN** 进入喜欢页
- **THEN** 已匹配用户显示在「匹配」分区，已喜欢未匹配用户显示在「喜欢」分区

### Requirement: 按钮视觉反馈动画
`Button.vue` SHALL 在点击时展示 ripple 涟漪动画 + scale(0.94) 缩放反馈，时长 300ms，缓动 `cubic-bezier(0.4, 0, 0.2, 1)`；`TabBar.vue` 切换时图标 scale(1.15) + 颜色过渡 + 顶部品牌色指示条展开。

#### Scenario: 按钮点击有视觉反馈
- **GIVEN** 渲染一个 Button 组件
- **WHEN** 用户点击按钮
- **THEN** 按钮产生涟漪扩散动画 + 缩小到 0.94，松开后回弹，同时触发震动

#### Scenario: Tab 切换有动画
- **GIVEN** 用户在首页 Tab
- **WHEN** 点击匹配 Tab
- **THEN** 匹配 Tab 图标放大 1.15 倍并变为蓝色，顶部出现蓝色指示条展开动画，时长 250ms

### Requirement: 页面切换动画感知明显
所有 tab 页面 SHALL 在切换时触发淡入 + 上移动画（translateY(24rpx) → 0，opacity 0 → 1，时长 350ms），用户能明显感知切换过程。

#### Scenario: Tab 切换有页面动画
- **GIVEN** 用户从首页切换到匹配页
- **WHEN** 匹配页 onShow 触发
- **THEN** 页面内容在 350ms 内从下方 24rpx 淡入到原位，动画平滑无闪烁

### Requirement: 视觉层级系统完整
`apps/client/src/theme/design-variables.scss` SHALL 定义 `--c-elevation-1/2/3` 三级阴影与 `--c-border-card`/`--c-border-card-brand` 边框变量；所有卡片组件 SHALL 应用 elevation-1 + border-card 默认，active/hover 升级到 elevation-2 + border-card-brand。

#### Scenario: 卡片有边框与阴影
- **WHEN** 渲染 SectionCard 组件
- **THEN** 卡片有 1rpx 边框 `rgba(15,23,42,0.08)` + 阴影 `0 1rpx 4rpx rgba(15,23,42,0.04)`

#### Scenario: 卡片按压有反馈
- **WHEN** 用户按压卡片
- **THEN** 阴影升级到 `0 4rpx 16rpx rgba(15,23,42,0.08)`，边框变为 `rgba(91,127,255,0.2)`

### Requirement: 图片分割清晰
所有图片 SHALL 有 `border-radius: 16rpx` + `box-shadow: 0 2rpx 8rpx rgba(15,23,42,0.06)`，与背景明显分割。

#### Scenario: 图片有圆角与阴影
- **WHEN** 渲染任意 `<image>` 或 `<img>` 元素
- **THEN** 元素有 16rpx 圆角与轻微阴影，与背景分割明显

### Requirement: 个人主页功能完整
`pages/profile/index.vue` SHALL 包含：用户信息卡片、VIP 状态、我的动态、喜欢列表入口、匹配列表入口、设置入口、反馈入口，所有入口可点击并有反馈动画。

#### Scenario: 个人主页功能完整
- **GIVEN** 用户进入个人主页
- **WHEN** 页面渲染完成
- **THEN** 显示用户信息卡片、VIP 状态、我的动态列表、5 个功能入口（喜欢/匹配/设置/反馈/关于）

#### Scenario: 功能入口可点击
- **WHEN** 用户点击「我的喜欢」入口
- **THEN** 跳转到喜欢页，按钮有按压反馈动画

### Requirement: mp-weixin 架构适配
H5 验证通过后，mp-weixin 编译 SHALL 无 `import.meta.env.DEV`、`backdrop-filter`、`position: sticky`、`:hover` 等不兼容语法；8 个核心页面在微信开发者工具中正常渲染。

#### Scenario: 编译无禁用语法
- **WHEN** 执行 `pnpm --filter client build:mp-weixin`
- **THEN** 构建产物中无 `import.meta.env.DEV`、`backdrop-filter`、`position: sticky`、`:hover` 语法

#### Scenario: mp-weixin 真机渲染正常
- **GIVEN** 已构建 mp-weixin 产物
- **WHEN** 在微信开发者工具中打开 8 个核心页面
- **THEN** 所有页面图片显示、按钮响应、签到/匹配功能正常，无控制台错误

## MODIFIED Requirements

### Requirement: 微信小程序核心页面可用
`apps/client/src/pages/` 下所有页面 SHALL 在 H5 与 mp-weixin 双端正常渲染：图片加载无 404，按钮点击有视觉反馈，签到/匹配功能正常工作，Tab 切换有动画，层级与边缘清晰。

#### Scenario: 寻觅页签到流程完整
- **GIVEN** 已构建最新 mp-weixin 产物并在微信开发者工具中打开
- **WHEN** 进入寻觅页 → 点击「立即签到」
- **THEN** 显示「签到中...」 → 显示「签到成功」动画 → 3 秒后显示权益卡片，全程无控制台错误

#### Scenario: 寻觅页匹配流程完整
- **GIVEN** 已在寻觅页
- **WHEN** 右滑卡片或点击喜欢按钮
- **THEN** 卡片滑出动画，30% 概率显示「匹配成功」toast 并跳转喜欢页，喜欢页内容正常显示

### Requirement: 蓝色品牌主题保持
本次修复 SHALL NOT 修改 `apps/client/src/theme/tokens.ts` 中 `color.brand.400 = #5B7FFF` 的蓝色主色定义；所有新增动画、阴影、边框 SHALL 使用蓝色品牌色系。

#### Scenario: 品牌色未变更
- **WHEN** 读取 `apps/client/src/theme/tokens.ts`
- **THEN** `color.brand.400` 仍为 `#5B7FFF`

## REMOVED Requirements

### Requirement: 仅震动反馈
**Reason**: 用户反馈按钮只有震动反馈无视觉反馈，体验差。改为视觉动画 + 触觉反馈组合。
**Migration**: 所有按钮保留 `uni.vibrateShort` 触觉反馈，同时增加 ripple 涟漪动画 + scale 缩放视觉反馈。

### Requirement: pageVisible 状态切换实现页面淡入
**Reason**: 当前实现 `pageVisible` 在 `onShow` 中先 `false` 再 `setTimeout 30ms` 设 `true`，快速切换时会闪烁或被中断，导致页面内容消失。
**Migration**: 改为纯 CSS 动画 `@keyframes pageFadeIn`，在 `onShow` 时直接添加 class 触发动画，不依赖 JS 状态切换。
