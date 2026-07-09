# Verification Checklist

## Phase 1: 图片与视频资源修复

- [x] `apps/client/src/static/assets/images/posters/` 下存在 `login-poster.jpg` 与 `home-poster.jpg`，文件大小 ≥ 10KB
- [x] `apps/client/src/static/assets/images/posts/` 下存在 `campus-library.jpg` 与 `post-placeholder.jpg`
- [x] `apps/client/src/static/assets/images/activities/` 下存在 `activity-1.jpg`、`activity-2.jpg`、`activity-3.jpg`
- [x] `apps/client/src/static/assets/images/products/` 下存在 `food-1.jpg`、`food-2.jpg`、`merch-1.jpg`、`merch-2.jpg`、`ticket-1.jpg`、`ticket-2.jpg`
- [x] `apps/client/src/static/assets/images/banners/` 下存在 `village-banner.jpg`
- [x] `apps/client/src/static/assets/avatars/` 下存在至少 8 个 `avatar-N.jpg` 文件，每个 ≥ 5KB
- [x] `apps/client/src/pages/home/index.vue` 不包含 `<video` 标签，背景使用 `<image>` 引用 `home-poster.jpg`
- [x] `apps/client/src/pages/login/index.vue` 包含 `<video>` 标签引用 `heroVideoUrl`
- [x] `apps/client/src/features/login/hero.ts` 的 mock `heroVideoUrl` 指向 `/static/assets/videos/campus-bg.mp4`
- [x] `apps/client/src/config/images.ts` 中所有路径与实际文件名一致
- [x] `apps/client/src/services/mocks/fixtures.ts` 中卡片 avatar/images 引用真实本地路径

## Phase 2: 按钮交互与核心功能修复

- [x] `apps/client/src/components/common/Button.vue` 点击时有 ripple 涟漪 + scale(0.96) 反馈
- [x] `apps/client/src/components/common/Button.vue` loading 状态显示 spinner
- [x] `apps/client/src/components/layout/TabBar.vue` 选中图标 scale(1.1) + 颜色 #5B7FFF
- [x] `apps/client/src/components/layout/TabBar.vue` 选中项顶部有 4rpx 品牌色指示条动画
- [x] `apps/client/src/custom-tab-bar/index.js` 切换时调用 `uni.vibrateShort`
- [x] `apps/client/src/stores/checkin.ts` 的 `fetchStatus` mock 模式下 loading 时序正确
- [x] `apps/client/src/pages/discover/index.vue` 签到前显示签到卡片
- [x] `apps/client/src/pages/discover/index.vue` 签到成功后 3 秒显示动画，3 秒后切换 benefits-section
- [x] `apps/client/src/stores/discover.ts` 的 `swipeRight` mock 模式下 30% 概率返回 matched=true
- [x] `apps/client/src/components/discover/CardSwiper.vue` 的 @swipe/@superLike 事件正确绑定
- [x] `apps/client/src/pages/discover/index.vue` 右滑匹配成功时显示 toast 并跳转 likes 页
- [x] `apps/client/src/pages/likes/index.vue`、`pages/village/index.vue` 点击事件不阻止默认行为
- [x] 列表数据切换处使用 `<transition-group>` 实现进出场动画

## Phase 3: 视觉层级与页面切换动画

- [x] `apps/client/src/theme/design-variables.scss` 定义 `--c-elevation-1/2/3` 与 `--c-border-card` 变量
- [x] `apps/client/src/components/common/SectionCard.vue` 应用 elevation-1 + border-card
- [x] `apps/client/src/components/common/Card.vue` 应用 elevation-1 + border-card
- [x] `apps/client/src/components/home/PersonCard.vue` 应用 elevation-1 + border-card
- [x] `apps/client/src/components/home/ActivityCard.vue` 应用 elevation-1 + border-card
- [x] `apps/client/src/pages/home/index.vue` 背景为 `linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)`
- [x] `apps/client/src/pages/discover/index.vue` 背景为渐变
- [x] `apps/client/src/pages/village/index.vue` 背景为渐变
- [x] `apps/client/src/pages/chat/index.vue` 背景为渐变
- [x] `apps/client/src/pages/profile/index.vue` 背景为渐变
- [x] 首页/寻觅页/村口页的 `.section__title` 左侧有品牌色竖线装饰
- [x] `apps/client/src/composables/usePageTransition.ts` 已被各 tab 页面调用
- [x] `.page-fade-in` 全局样式已定义（300ms 淡入 + translateY）
- [x] 所有 tab 页面 onShow 时触发 page-fade-in 动画

## Phase 4: 构建验证与截图

- [x] `pnpm build:mp-weixin` 编译成功，无 error
- [x] `apps/client/dist/build/mp-weixin/static/assets/images/` 包含所有源码引用的图片
- [x] `apps/client/dist/build/mp-weixin/static/assets/avatars/` 包含 8 张头像
- [x] `apps/client/dist/build/mp-weixin/app.json` 的 tabBar 配置无 SVG 引用
- [x] `test-screenshots/2026-07-01-visual-fix/01-login.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/02-home.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/03-discover.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/04-discover-checkin.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/05-likes.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/06-village.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/07-chat.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/08-profile.png` 存在且 ≥ 50KB
- [x] `test-screenshots/2026-07-01-visual-fix/verification-report.md` 存在并记录每个页面验证状态

## 蓝色品牌主题保持

- [x] `apps/client/src/theme/tokens.ts` 中 `color.brand.400` 仍为 `#5B7FFF`
- [x] `apps/client/src/pages.json` 的 `tabBar.selectedColor` 仍为 `#5B7FFF`
- [x] 所有新增动画/阴影/边框使用蓝色品牌色系，无绿色 #3FCF8E 引入
