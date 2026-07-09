# Tasks

## Phase 1: 图片与视频资源修复（P0，阻塞）

- [x] Task 1: 真实图片资源下载与补齐
  - [x] SubTask 1.1: 检查 `apps/client/scripts/download-assets.mjs` 现有实现，确认图源 URL（picsum.photos / unssplash / randomuser）是否可用
  - [x] SubTask 1.2: 在 `apps/client/src/static/assets/images/posters/` 下载/替换 `login-poster.jpg`、`home-poster.jpg`（≥ 10KB，校园场景）
  - [x] SubTask 1.3: 在 `apps/client/src/static/assets/images/posts/` 补齐 `campus-library.jpg`、`post-placeholder.jpg`
  - [x] SubTask 1.4: 在 `apps/client/src/static/assets/images/activities/` 补齐 `activity-1.jpg`、`activity-2.jpg`、`activity-3.jpg`
  - [x] SubTask 1.5: 在 `apps/client/src/static/assets/images/products/` 补齐 `food-1.jpg`、`food-2.jpg`、`merch-1.jpg`、`merch-2.jpg`、`ticket-1.jpg`、`ticket-2.jpg`
  - [x] SubTask 1.6: 在 `apps/client/src/static/assets/images/banners/` 补齐 `village-banner.jpg`
  - [x] SubTask 1.7: 在 `apps/client/src/static/assets/avatars/` 新建目录，下载 8 张真实头像 `avatar-1.jpg` ~ `avatar-8.jpg`

- [x] Task 2: 视频背景归位（首页移除视频，登录页保留视频）
  - [x] SubTask 2.1: 修改 `apps/client/src/pages/home/index.vue`：移除 `<video>` 标签、`HOME_VIDEO_SRC`、`enableVideoBg`、`videoError`、`onVideoError`、`onVideoLoaded`，背景改为 `<image>` 引用 `/static/assets/images/posters/home-poster.jpg` + 渐变遮罩
  - [x] SubTask 2.2: 检查 `apps/client/src/features/login/hero.ts` 的 mock 数据，确保 `heroVideoUrl` 字段指向 `/static/assets/videos/campus-bg.mp4`
  - [x] SubTask 2.3: 修改 `apps/client/src/pages/login/index.vue`：视频错误降级改为 `login-poster.jpg`，确保 `useVideoBg` computed 正确响应

- [x] Task 3: 图片路径配置修复
  - [x] SubTask 3.1: 修改 `apps/client/src/config/images.ts`：核对所有图片路径与实际文件名一致（删除不存在路径，新增 avatars 配置）
  - [x] SubTask 3.2: 修改 `apps/client/src/services/mocks/fixtures.ts`：推荐卡片的 `avatar`、`images` 字段引用 `/static/assets/avatars/avatar-N.jpg` 与 `/static/assets/images/posts/*.jpg` 真实路径

## Phase 2: 按钮交互与核心功能修复（P0）

- [x] Task 4: Button 组件动画强化
  - [x] SubTask 4.1: 修改 `apps/client/src/components/common/Button.vue`：集成 `Ripple.vue`，添加 `:active` scale(0.96) 反馈，添加 loading spinner 样式
  - [x] SubTask 4.2: 在 Button.vue 的 `<style>` 中添加 `transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1)` 与 ripple keyframes

- [x] Task 5: TabBar 切换动画强化
  - [x] SubTask 5.1: 修改 `apps/client/src/components/layout/TabBar.vue`：图标添加 `transition: transform 250ms, color 250ms`，选中态 `scale(1.1)` + 颜色 `#5B7FFF`
  - [x] SubTask 5.2: 在 TabBar.vue 选中项顶部添加 4rpx 高品牌色渐变指示条，使用伪元素 `::before` + `transform: scaleX(0→1)` 动画
  - [x] SubTask 5.3: 修改 `apps/client/src/custom-tab-bar/index.js`：切换时调用 `uni.vibrateShort({ type: 'light' })` 添加 haptic feedback，添加 CSS transition

- [x] Task 6: 签到标签显示修复
  - [x] SubTask 6.1: 修改 `apps/client/src/stores/checkin.ts` 的 `fetchStatus`：确保 mock 模式下 `loading = false` 在状态设置之后执行（修复时序问题）
  - [x] SubTask 6.2: 修改 `apps/client/src/pages/discover/index.vue`：检查 `v-if="!checkInStore.checkedIn && !checkInStore.loading"` 条件，确保 loading 状态下显示骨架屏而非空白
  - [x] SubTask 6.3: 在 `pages/discover/index.vue` 添加签到成功动画过渡：使用 `<transition name="fade">` 包裹签到卡片与 benefits-section，确保 3 秒后平滑切换

- [x] Task 7: 匹配功能修复
  - [x] SubTask 7.1: 修改 `apps/client/src/stores/discover.ts` 的 `swipeRight`：mock 模式下添加 30% 概率 `lastSwipeResult = { matched: true, partnerName, cardId }` 逻辑
  - [x] SubTask 7.2: 检查 `apps/client/src/components/discover/CardSwiper.vue` 的 `@swipe` / `@superLike` emit 事件，确保与 `pages/discover/index.vue` 的 handleSwipe/handleSuperLike 正确绑定
  - [x] SubTask 7.3: 在 `pages/discover/index.vue` 的 `handleSwipe` 右滑分支中，匹配成功时显示 toast 并 1.5 秒后跳转 `pages/likes/index`

- [x] Task 8: 按钮点击内容消失修复
  - [x] SubTask 8.1: 检查 `apps/client/src/pages/likes/index.vue`、`apps/client/src/pages/village/index.vue`、`apps/client/src/pages/discover/index.vue` 的 `@click`/`@tap` 事件绑定，确保不阻止默认行为
  - [x] SubTask 8.2: 在列表数据切换处添加 `<transition-group name="list">` 实现进出场动画，避免内容突变

## Phase 3: 视觉层级与页面切换动画（P1）

- [x] Task 9: 视觉层级系统定义
  - [x] SubTask 9.1: 修改 `apps/client/src/theme/design-variables.scss`：新增 `--c-elevation-1/2/3` 阴影变量与 `--c-border-card` 边框变量
  - [x] SubTask 9.2: 修改 `apps/client/src/components/common/SectionCard.vue`：应用 elevation-1 + border-card 默认样式，`:active` 升级到 elevation-2
  - [x] SubTask 9.3: 修改 `apps/client/src/components/common/Card.vue`、`apps/client/src/components/home/PersonCard.vue`、`apps/client/src/components/home/ActivityCard.vue`：同上应用层级系统

- [x] Task 10: 页面背景渐变强化
  - [x] SubTask 10.1: 修改 `apps/client/src/pages/home/index.vue` 的 `.discover-page` / root 样式：背景改为 `linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)`
  - [x] SubTask 10.2: 修改 `apps/client/src/pages/discover/index.vue`、`pages/village/index.vue`、`pages/chat/index.vue`、`pages/profile/index.vue`：同上应用渐变背景
  - [x] SubTask 10.3: 强化首页/寻觅页/村口页的 `.section__title` 左侧品牌色竖线装饰（伪元素 `::before`，4rpx 宽，渐变 `brand-400 → brand-500`）

- [x] Task 11: 页面切换动画启用
  - [x] SubTask 11.1: 检查 `apps/client/src/composables/usePageTransition.ts` 现有实现，确认 onShow 触发淡入 + translateY 动画
  - [x] SubTask 11.2: 在 `pages/home/index.vue`、`pages/discover/index.vue`、`pages/village/index.vue`、`pages/chat/index.vue`、`pages/profile/index.vue` 中调用 `usePageTransition()`，根元素绑定 `:class="{ 'page-fade-in': pageVisible }"`
  - [x] SubTask 11.3: 在 `apps/client/src/uni.scss` 或全局样式中定义 `.page-fade-in` 类：`animation: pageFadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)` + `@keyframes pageFadeIn { from { opacity: 0; transform: translateY(16rpx) } to { opacity: 1; transform: translateY(0) } }`

## Phase 4: 构建验证与截图（P0）

- [x] Task 12: 构建并验证
  - [x] SubTask 12.1: 在 `apps/client` 目录执行 `pnpm build:mp-weixin`，确认无编译错误
  - [x] SubTask 12.2: 检查 `apps/client/dist/build/mp-weixin/static/assets/images/` 与 `avatars/` 目录，确认所有图片复制到构建产物
  - [x] SubTask 12.3: 检查 `apps/client/dist/build/mp-weixin/app.json` 的 tabBar 配置正确，无 SVG 引用

- [x] Task 13: 真机验证截图
  - [x] SubTask 13.1: 在微信开发者工具中打开 `apps/client/dist/build/mp-weixin/`，使用 `screenshot` skill 或 `agent-browser` skill 截图登录页保存为 `test-screenshots/2026-07-01-visual-fix/01-login.png`
  - [x] SubTask 13.2: 截图首页 `02-home.png`、寻觅页 `03-discover.png`、签到后 `04-discover-checkin.png`、喜欢页 `05-likes.png`、村口页 `06-village.png`、聊天页 `07-chat.png`、我的页 `08-profile.png`
  - [x] SubTask 13.3: 撰写 `test-screenshots/2026-07-01-visual-fix/verification-report.md`，记录每个页面的验证状态（pass/fail）与发现的问题

# Task Dependencies
- Task 2 依赖 Task 1（需要 home-poster.jpg 作为首页降级图）
- Task 3 依赖 Task 1（需要图片文件存在才能配置路径）
- Task 6 依赖 Task 4（签到按钮使用强化后的 Button 组件）
- Task 7 依赖 Task 6（签到修复后再验证匹配流程）
- Task 8 依赖 Task 4、Task 7（按钮修复后再修复内容消失）
- Task 11 依赖 Task 9、Task 10（视觉层级与背景就绪后启用切换动画）
- Task 12 依赖 Task 1-11 全部完成
- Task 13 依赖 Task 12（构建通过后才能截图验证）

# Parallelizable Work
- Task 1（图片下载）与 Task 4（Button 组件）可并行
- Task 5（TabBar）与 Task 9（视觉层级系统）可并行
- Task 10（页面背景）与 Task 11（页面切换动画）可并行
