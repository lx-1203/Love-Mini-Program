# 视觉与功能综合性修复 Spec

## Why
当前微信小程序存在多处阻塞使用的问题：
1. **图片显示问题**：`apps/client/src/static/assets/images/` 下大量目录仅有占位文件，真实可加载的图片资源不全；登录页视频背景被错误地复制到首页，登录页本身视频路径 `heroVideoUrl` 在 mock 模式下可能为空，导致登录页无视觉主体。
2. **按钮交互异常**：用户反馈按钮点击后无正常响应，进入下一页后内容消失；按钮缺少点击反馈（无 ripple、无 scale 动画），切换 Tab 时无法感知切换过程。
3. **核心功能未生效**：`pages/discover/index.vue` 的签到标签在签到后不显示（`checkInStore.checkedIn` 与 `showSuccessAnimation` 联动逻辑存在渲染问题）；匹配（喜欢/超级喜欢）点击后未触发可见结果。
4. **层级与边缘视觉差**：卡片、按钮、容器缺少统一边框/阴影层级系统，背景色与卡片色对比度低，整体视觉边界不清晰。
5. **缺少真机验证截图**：每次修复后未真正打开微信开发者工具验证并截图存档。

## What Changes

### A. 真实图片资源补齐（P0）
- 通过 `picsum.photos`、`images.unsplash.com` 等公开图源，使用 `scripts/download-assets.mjs` 下载真实图片到 `apps/client/src/static/assets/images/` 各子目录：
  - `posters/`：login-poster.jpg、home-poster.jpg（首页视频降级图）
  - `posts/`：campus-library.jpg、post-placeholder.jpg
  - `activities/`：activity-1/2/3.jpg
  - `products/`：food-1/2.jpg、merch-1/2.jpg、ticket-1/2.jpg
  - `banners/`：village-banner.jpg
- 头像资源补齐：`apps/client/src/static/assets/avatars/` 下生成 8-12 张真实头像（使用 `randomuser.me` 或 `i.pravatar.cc`）
- 修复 `apps/client/src/config/images.ts` 中路径与实际文件名一致
- 修复 `apps/client/src/services/mocks/fixtures.ts` 中卡片 avatar/images 字段使用本地真实路径

### B. 视频背景归位（P0，**BREAKING**）
- **BREAKING**：移除 `apps/client/src/pages/home/index.vue` 的视频背景代码，改为静态海报图（home-poster.jpg）+ 渐变遮罩
- 视频背景仅保留在 `apps/client/src/pages/login/index.vue`
- 修复 `apps/client/src/features/login/hero.ts` 的 mock `heroVideoUrl` 字段，确保指向真实存在的 `/static/assets/videos/campus-bg.mp4`
- 登录页视频加载失败时降级为 `login-poster.jpg`

### C. 按钮交互与动画强化（P0）
- 增强 `apps/client/src/components/common/Button.vue`：
  - 添加 ripple 涟漪动画（已有 Ripple.vue，集成进去）
  - 添加 `:active` scale(0.96) 反馈
  - 添加 loading spinner 样式
- 增强 `apps/client/src/components/layout/TabBar.vue`：
  - Tab 切换时添加图标 scale + 颜色过渡动画
  - 选中态添加顶部品牌色指示条（4rpx 高，渐变动画展开）
- 增强 `apps/client/src/custom-tab-bar/index.js`：
  - 切换时添加 haptic feedback（`uni.vibrateShort`）
  - 图标切换添加 CSS transition
- 修复按钮点击后内容消失问题：检查 `pages/discover/index.vue`、`pages/likes/index.vue`、`pages/village/index.vue` 的点击事件绑定，确保 `@click`/`@tap` 正确响应，列表数据切换时使用 transition-group 动画

### D. 核心功能修复（P0）
- **签到标签显示修复**：
  - 检查 `pages/discover/index.vue` 第 150 行 `v-if="!checkInStore.checkedIn && !checkInStore.loading"` 与第 180 行 `v-if="checkInStore.checkedIn && !checkInStore.showSuccessAnimation"` 的渲染条件
  - 修复 mock 模式下 `fetchStatus` 未正确设置 `loading = false` 的时序问题
  - 签到成功后 `showSuccessAnimation` 3 秒后收起，自动过渡到 benefits-section
- **匹配功能修复**：
  - 检查 `stores/discover.ts` 的 `swipeRight` 逻辑，mock 模式下确保 `lastSwipeResult.matched` 有 30% 概率返回 true
  - `CardSwiper.vue` 滑动事件确保 `@swipe`/`@superLike` 正确触发
  - 匹配成功 toast 显示后跳转 `pages/likes/index`

### E. 视觉层级与边缘强化（P1）
- 在 `apps/client/src/theme/design-variables.scss` 中新增层级系统：
  - `--c-elevation-1`: 卡片基础阴影 `0 1rpx 4rpx rgba(15,23,42,0.04)`
  - `--c-elevation-2`: 卡片悬浮阴影 `0 4rpx 16rpx rgba(15,23,42,0.08)`
  - `--c-elevation-3`: 弹层阴影 `0 12rpx 32rpx rgba(15,23,42,0.12)`
  - `--c-border-card`: `1rpx solid rgba(15,23,42,0.06)`
- 强化 `SectionCard.vue`、`Card.vue`、`PersonCard.vue`、`ActivityCard.vue` 的边框 + 阴影组合
- 强化各页面背景：从纯色 `#f8fafc` 改为带品牌色微染的渐变 `linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)`
- 强化首页/寻觅页/村口页的卡片标题左侧品牌色竖线装饰

### F. 页面切换动画（P1）
- 启用 `apps/client/src/composables/usePageTransition.ts` 在所有 tab 页面
- Tab 切换时页面内容淡入 + 轻微上移（translateY(16rpx) → 0）
- 使用 GSAP（已有 `plugins/gsap.ts`）实现 300ms 缓动过渡

### G. 真机验证与截图（P0）
- 构建最新 mp-weixin 产物
- 在微信开发者工具中打开 `apps/client/dist/build/mp-weixin/`
- 对每个核心页面截图存档到 `test-screenshots/2026-07-01-visual-fix/`：
  - 01-login.png（登录页，验证视频背景）
  - 02-home.png（首页，验证海报图与卡片）
  - 03-discover.png（寻觅页，验证签到标签显示）
  - 04-discover-checkin.png（签到后，验证 benefits-section 显示）
  - 05-likes.png（喜欢页）
  - 06-village.png（村口页）
  - 07-chat.png（聊天页）
  - 08-profile.png（我的页）
- 截图保存后写入验证报告 `test-screenshots/2026-07-01-visual-fix/verification-report.md`

## Impact
- Affected specs:
  - `2026-06-29-tabbar-icon-fix-blue-theme`（tabBar 图标修复基线，本 spec 在其上增加交互动画）
  - `2026-06-26-wechat-mp-debugging`（微信小程序调试基线）
- Affected code:
  - **图片资源**：`apps/client/src/static/assets/images/*`、`apps/client/src/static/assets/avatars/*`（新增）
  - **视频归位**：`apps/client/src/pages/home/index.vue`（移除视频）、`apps/client/src/pages/login/index.vue`（保留视频）、`apps/client/src/features/login/hero.ts`
  - **按钮动画**：`apps/client/src/components/common/Button.vue`、`apps/client/src/components/layout/TabBar.vue`、`apps/client/src/custom-tab-bar/index.js`
  - **核心功能**：`apps/client/src/pages/discover/index.vue`、`apps/client/src/stores/discover.ts`、`apps/client/src/stores/checkin.ts`、`apps/client/src/components/discover/CardSwiper.vue`
  - **视觉层级**：`apps/client/src/theme/design-variables.scss`、`apps/client/src/components/common/SectionCard.vue`、`apps/client/src/components/common/Card.vue`、`apps/client/src/components/home/PersonCard.vue`
  - **页面切换**：`apps/client/src/composables/usePageTransition.ts`、各 tab 页面入口
  - **配置**：`apps/client/src/config/images.ts`、`apps/client/src/services/mocks/fixtures.ts`
- 不影响：后端 API、admin 后台、数据库结构

## ADDED Requirements

### Requirement: 真实图片资源完整下载
`apps/client/src/static/assets/images/` 下所有子目录（posters/posts/activities/products/banners）SHALL 包含真实可加载的 JPG/PNG 图片，文件大小 ≥ 10KB，禁止使用 1×1 像素占位图或空文件。

#### Scenario: 图片目录非空且合法
- **WHEN** 列出 `apps/client/src/static/assets/images/posters/`、`posts/`、`activities/`、`products/`、`banners/` 目录
- **THEN** 每个目录下至少有对应的 JPG/PNG 文件，且每个文件大小 ≥ 10KB

#### Scenario: 图片在构建产物中存在
- **GIVEN** 已执行 `pnpm build:mp-weixin`
- **WHEN** 检查 `apps/client/dist/build/mp-weixin/static/assets/images/` 目录
- **THEN** 所有源码中引用的图片文件均存在于构建产物中

### Requirement: 头像资源补齐
`apps/client/src/static/assets/avatars/` 目录 SHALL 包含至少 8 张真实头像图片（avatar-1.jpg ~ avatar-8.jpg），每张大小 ≥ 5KB，用于 mocks/fixtures.ts 中的推荐卡片。

#### Scenario: 头像文件存在
- **WHEN** 列出 `apps/client/src/static/assets/avatars/` 目录
- **THEN** 存在至少 8 个 `.jpg` 文件，命名格式为 `avatar-N.jpg`

### Requirement: 视频背景仅出现在登录页
`apps/client/src/pages/login/index.vue` SHALL 使用 `<video>` 标签播放 `/static/assets/videos/campus-bg.mp4` 作为背景；`apps/client/src/pages/home/index.vue` SHALL NOT 包含任何 `<video>` 标签，背景改为静态海报图 + 渐变遮罩。

#### Scenario: 首页无视频
- **WHEN** 检查 `apps/client/src/pages/home/index.vue` 源码
- **THEN** 不存在 `<video` 标签，背景使用 `<image>` 引用 `/static/assets/images/posters/home-poster.jpg`

#### Scenario: 登录页有视频
- **WHEN** 检查 `apps/client/src/pages/login/index.vue` 源码
- **THEN** 存在 `<video>` 标签引用 `heroVideoUrl`，且 `hero.ts` mock 中 `heroVideoUrl` 指向 `/static/assets/videos/campus-bg.mp4`

### Requirement: 按钮点击反馈动画
`apps/client/src/components/common/Button.vue` SHALL 在点击时展示 ripple 涟漪动画 + scale(0.96) 缩放反馈，动画时长 300ms，使用 cubic-bezier(0.4, 0, 0.2, 1) 缓动。

#### Scenario: 按钮点击有视觉反馈
- **GIVEN** 渲染一个 Button 组件
- **WHEN** 用户点击按钮
- **THEN** 按钮产生涟漪扩散动画 + 轻微缩小，松开后回弹

### Requirement: TabBar 切换动画
`apps/client/src/components/layout/TabBar.vue` 与 `apps/client/src/custom-tab-bar/index.js` SHALL 在 Tab 切换时展示：选中图标 scale(1.1) + 颜色过渡到 `#5B7FFF`，顶部出现 4rpx 高品牌色渐变指示条，过渡时长 250ms。

#### Scenario: Tab 切换有动画
- **GIVEN** 用户在首页 Tab
- **WHEN** 点击匹配 Tab
- **THEN** 匹配 Tab 图标放大并变为蓝色，顶部出现蓝色指示条展开动画

### Requirement: 签到标签正常显示
`apps/client/src/pages/discover/index.vue` SHALL 在签到前显示「今日签到」卡片，签到成功后 3 秒内显示「签到成功」动画，3 秒后自动过渡到 benefits-section 显示推荐配额/热门话题/新入圈用户权益入口。

#### Scenario: 签到前显示签到卡片
- **GIVEN** 用户首次进入寻觅页且未签到
- **WHEN** 页面渲染完成
- **THEN** 顶部显示「今日签到」卡片，包含 checkin 图标、标题、描述与「立即签到」按钮

#### Scenario: 签到后显示权益
- **GIVEN** 用户点击「立即签到」
- **WHEN** `checkInStore.checkIn()` 完成
- **THEN** 3 秒内显示「签到成功」动画，3 秒后自动切换为 benefits-section，显示推荐配额提升、热门话题、新入圈用户三个权益卡片

### Requirement: 匹配功能可触发
`apps/client/src/stores/discover.ts` 在 mock 模式下 SHALL 让 `swipeRight` 操作有 30% 概率返回 `lastSwipeResult.matched = true`，匹配成功时 `pages/discover/index.vue` SHALL 显示「匹配成功」toast 并 1.5 秒后跳转 `pages/likes/index`。

#### Scenario: 右滑喜欢可触发匹配
- **GIVEN** mock 模式下用户在寻觅页
- **WHEN** 右滑卡片
- **THEN** 卡片滑出，有 30% 概率显示「匹配成功」toast 并跳转喜欢页

### Requirement: 视觉层级系统
`apps/client/src/theme/design-variables.scss` SHALL 定义 `--c-elevation-1/2/3` 三级阴影变量与 `--c-border-card` 边框变量；所有卡片组件（SectionCard/Card/PersonCard/ActivityCard）SHALL 应用 elevation-1 默认 + 边框，hover/active 时升级到 elevation-2。

#### Scenario: 卡片有边框与阴影
- **WHEN** 渲染 SectionCard 组件
- **THEN** 卡片有 1rpx 边框 `rgba(15,23,42,0.06)` + 阴影 `0 1rpx 4rpx rgba(15,23,42,0.04)`

### Requirement: 页面背景渐变
所有 tab 页面（home/discover/village/chat/profile）SHALL 使用 `linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)` 作为背景，强化视觉层次。

#### Scenario: 页面背景非纯色
- **WHEN** 检查任意 tab 页面的 background 样式
- **THEN** 使用 linear-gradient 渐变，非纯色 `#f8fafc`

### Requirement: 页面切换动画
所有 tab 页面 SHALL 在 onShow 时触发淡入 + 上移动画（translateY(16rpx) → 0，opacity 0 → 1，时长 300ms）。

#### Scenario: Tab 切换有页面动画
- **GIVEN** 用户从首页切换到匹配页
- **WHEN** 匹配页 onShow 触发
- **THEN** 页面内容在 300ms 内从下方 16rpx 淡入到原位

### Requirement: 真机验证截图存档
构建后 SHALL 在微信开发者工具中对 8 个核心页面截图，保存到 `test-screenshots/2026-07-01-visual-fix/` 目录，并生成 `verification-report.md` 记录验证结果。

#### Scenario: 截图文件存在
- **WHEN** 列出 `test-screenshots/2026-07-01-visual-fix/` 目录
- **THEN** 存在 01-login.png ~ 08-profile.png 共 8 张截图，每张大小 ≥ 50KB

#### Scenario: 验证报告存在
- **WHEN** 读取 `test-screenshots/2026-07-01-visual-fix/verification-report.md`
- **THEN** 报告包含每个页面的验证状态（pass/fail）与发现的问题清单

## MODIFIED Requirements

### Requirement: 微信小程序核心页面可用
`apps/client/src/pages/` 下所有页面 SHALL 在微信开发者工具中正常渲染：图片加载无 404，按钮点击有响应，签到/匹配功能正常工作，Tab 切换有动画反馈。

#### Scenario: 寻觅页签到流程完整
- **GIVEN** 已构建最新 mp-weixin 产物并在微信开发者工具中打开
- **WHEN** 进入寻觅页 → 点击「立即签到」
- **THEN** 显示「签到中...」 → 显示「签到成功」动画 → 3 秒后显示权益卡片，全程无控制台错误

#### Scenario: 寻觅页匹配流程完整
- **GIVEN** 已在寻觅页
- **WHEN** 右滑卡片
- **THEN** 卡片滑出动画，30% 概率显示「匹配成功」toast 并跳转喜欢页

### Requirement: 蓝色品牌主题保持
本次修复 SHALL NOT 修改 `apps/client/src/theme/tokens.ts` 中 `color.brand.400 = #5B7FFF` 的蓝色主色定义；所有新增动画、阴影、边框 SHALL 使用蓝色品牌色系。

#### Scenario: 品牌色未变更
- **WHEN** 读取 `apps/client/src/theme/tokens.ts`
- **THEN** `color.brand.400` 仍为 `#5B7FFF`

## REMOVED Requirements

### Requirement: 首页视频背景
**Reason**: 用户明确要求视频仅放在登录页，首页视频背景导致性能损耗且与登录页视频重复。改为静态海报图 + 渐变遮罩，保留品牌氛围同时提升性能。
**Migration**: `apps/client/src/pages/home/index.vue` 中的 `HOME_VIDEO_SRC`、`enableVideoBg`、`videoError`、`onVideoError`、`onVideoLoaded` 等视频相关代码移除，背景改为引用 `/static/assets/images/posters/home-poster.jpg`。
