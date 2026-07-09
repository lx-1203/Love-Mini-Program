# Checklist

## Phase 1: 设计 Token 校准与图标系统

### Token 校准
- [x] `apps/client/src/theme/tokens.ts` 品牌色阶 `brand[50]` 已校准为 `#F0F5FF`
- [x] `apps/client/src/theme/tokens.ts` 新增 `brand-sm`/`brand-md` 品牌色阴影
- [x] `design-system/tokens.ts` 与 `apps/client/src/theme/tokens.ts` 保持同步
- [x] `apps/client/src/uni.scss` 已增加全局 CSS 变量（页面渐变氛围、骨架屏 shimmer）
- [x] 圆角 Token `xl` 从 20 → 24rpx，`lg` 从 16 → 20rpx
- [x] Token 文件无 TypeScript 语法错误

### SVG 图标系统
- [x] TabBar 5 个 tab 的线面结合 SVG 图标已创建（默认态+选中态）
- [x] 功能入口通用图标已创建（设置、编辑、搜索、通知、添加、关闭、返回、箭头）
- [x] 社交场景图标已创建（喜欢、匹配、访客、心动、关注、私信、评论、点赞、分享）
- [x] 图标按模块分类存放在 `apps/client/src/static/assets/icons/` 目录
- [x] 图标命名遵循 `{模块}-{名称}-{状态}.svg` 规范
- [x] `config/navigation.ts` 图标路径配置已更新
- [x] 所有 SVG 图标可在小程序 `image` 组件中正常渲染

### TabBar 图标替换
- [x] `TabBar.vue` 已替换 emoji 为 SVG `image` 组件
- [x] 选中态图标切换逻辑正确（默认态线性 → 选中态面性填充+品牌蓝）
- [x] 选中态切换带 200ms 过渡动画
- [x] `custom-tab-bar/` 原生 TabBar 图标引用已同步更新

---

## Phase 2: 全局组件视觉打磨

### 通用组件
- [x] `Card.vue` — `shadow.sm` + `1px solid #E2E8F0` 边框生效
- [x] `Card.vue` — interactive 变体 scale(0.98) 按压反馈
- [x] `Button.vue` — 所有按钮 scale(0.97) 按压反馈
- [x] `Button.vue` — 主按钮 hover 态品牌色加深+阴影增强
- [x] `Avatar.vue` — 渐变边框支持（VIP 金色渐变）
- [x] `Avatar.vue` — fallback 初始字体品牌渐变背景
- [x] `Tag.vue` — 圆角 `radiusPill`，内边距 `8rpx 16rpx`
- [x] `SectionHeader.vue` — 标题 `h2` 字号（52rpx），字重 `semibold`
- [x] `SectionCard.vue` — 卡片圆角 `24rpx`，内边距 `40rpx`
- [x] `EmptyState.vue` / `ErrorState.vue` / `StatusState.vue` — emoji 已替换为 SVG 图标
- [x] `Skeleton.vue` — shimmer 扫光动画正常
- [x] `UnreadBadge.vue` — 品牌蓝背景+白色文字，圆角 pill

### 首页组件
- [x] `HomeHeader.vue` — 学校选择器样式优化，下拉箭头为 SVG 图标
- [x] `WelcomeBanner.vue` — 顶部蓝色渐变氛围背景
- [x] `PersonCard.vue` — 卡片圆角 `24rpx`，图片区域渐变遮罩
- [x] `PeopleScroll.vue` — 横向滚动区域间距优化
- [x] `ActivityCard.vue` / `ActivityScroll.vue` — 活动卡片视觉优化，状态标签颜色规范
- [x] `WallSection.vue` — 帖子卡片间距和圆角优化

### 社交组件
- [x] `SocialProgressIndicator.vue` — 6 层漏斗颜色层级区分（浅蓝→深蓝）
- [x] `SocialOnboardingOverlay.vue` — 引导浮层设计优化
- [x] `MatchGuideOverlay.vue` — 匹配引导面板视觉优化
- [x] `WallPostCard.vue` — 帖子卡片交互反馈增强

### 聊天与发现组件
- [x] `ChatBubble.vue` — 气泡圆角优化（发送方/接收方不对称圆角）
- [x] `ChatItem.vue` — 会话列表项间距优化，未读角标品牌蓝
- [x] `ChatHeader.vue` — 聊天头部视觉优化
- [x] `HeartSignal.vue` — 心动信号组件动效优化
- [x] `IcebreakerSuggestions.vue` — 破冰话题卡片样式优化
- [x] `VoicePill.vue` — 语音气泡样式优化
- [x] `CardSwiper.vue` — 卡片滑动弹性缓动优化

---

## Phase 3: 页面视觉打磨

### 首页（home/index.vue）
- [x] 页面顶部极浅蓝渐变氛围（`#F0F5FF` → `#F8FAFC`，200rpx 范围）
- [x] 各区块标题字号和间距统一
- [x] 各区块之间 32rpx 间距
- [x] 所有 emoji 图标已替换为 SVG
- [x] 内容区水平内边距 32rpx

### 圈子页（village/index.vue）
- [x] 分类 Tab 选中态品牌蓝底线+文字变色
- [x] 帖子瀑布流间距 24rpx
- [x] 所有 emoji 图标已替换为 SVG
- [x] 发帖悬浮按钮品牌蓝圆形+白色 SVG 加号

### 匹配页（discover/index.vue）
- [x] 页面头部视觉优化
- [x] 卡片区域全屏沉浸式体验
- [x] 底部操作按钮区域优化
- [x] 所有 emoji 图标已替换为 SVG

### 消息页（messages/index.vue + chat/index.vue）
- [x] 消息列表项间距和内边距优化
- [x] 所有 emoji 图标已替换为 SVG
- [x] 聊天页顶部导航栏视觉优化
- [x] 聊天输入区域样式优化

### 我的页（profile/index.vue）
- [x] 顶部品牌蓝渐变背景优化
- [x] 头像区域白色边框+阴影增强
- [x] 数据统计行样式优化
- [x] 功能菜单分组卡片样式优化（圆角 24rpx）
- [x] 所有 emoji 图标已替换为 SVG

### 登录页（login/index.vue）
- [x] 视频背景渐变遮罩优化
- [x] 登录按钮样式优化（品牌蓝填充+全圆角）
- [x] 标题和副标题排版优化
- [x] 所有 emoji/文字图标已替换为 SVG

---

## Phase 4: 动效与过渡优化

### 页面过渡
- [x] `App.vue` 页面切换淡入淡出过渡（opacity 250ms）
- [x] 主要页面 `onShow` 内容淡入动画
- [x] Skeleton 组件 shimmer 扫光动画流畅

### 通知与提示
- [x] Toast 滑入/滑出动画（translateY + 弹性缓动）
- [x] 模态弹窗缩放淡入动画（scale(0.9)→1 + opacity 0→1）

---

## Phase 5: 全站验证

### 图标验证
- [x] 全站无 emoji 作为图标使用
- [x] 所有图标风格统一（线面结合，2px 线宽）

### 色彩验证
- [x] 全局无硬编码旧色值（`#1d4ed8`、`#3b82f6`、`#60a5fa` 等）
- [x] 品牌色在白色背景上对比度 ≥ 4.5:1（WCAG AA）

### 一致性验证
- [x] 所有页面字号/字重/间距符合 Token 规范
- [x] 所有卡片圆角/阴影/边框统一
- [x] 所有按钮样式统一（圆角、字号、按压反馈）

### 交互验证
- [x] 所有交互元素有视觉反馈（按压态/悬停态）
- [x] 页面切换和内容加载有过渡动画

### 兼容性验证
- [x] iOS/Android 圆角和阴影表现一致
- [x] 底部安全区域适配正确
- [x] H5 构建通过，无 console 报错
- [x] 小程序开发者工具预览正常

### 功能验证
- [x] 所有页面功能正常（不因视觉修改影响功能逻辑）
- [x] 所有 Store/API 调用不受影响
- [x] Mock/Real 双模式兼容