# Tasks

## Phase 1: 设计 Token 校准与图标系统（P0·视觉基石）

### Task 1: 校准色彩与阴影 Token
- [x] SubTask 1.1: 校准 `apps/client/src/theme/tokens.ts` — 微调品牌色阶 `brand[50]` 为 `#F0F5FF`（更暖），增加品牌色阴影 `brand-sm`/`brand-md`
- [x] SubTask 1.2: 同步更新 `design-system/tokens.ts` — 保持两份 Token 文件一致
- [x] SubTask 1.3: 更新 `apps/client/src/uni.scss` — 增加全局 CSS 变量（页面顶部渐变氛围、骨架屏 shimmer 动画）
- [x] SubTask 1.4: 微调圆角 Token：卡片 `xl` 从 20 → 24rpx，`lg` 从 16 → 20rpx
- **验证**：Token 文件无语法错误，H5 构建通过

### Task 2: 创建专业 SVG 图标系统
- [x] SubTask 2.1: 设计并创建 TabBar 5 个 tab 的线面结合 SVG 图标（home/village/discover/chat/profile），每个 tab 提供默认态（线性）和选中态（面性填充）两套
- [x] SubTask 2.2: 设计并创建功能入口通用图标（设置、编辑、搜索、通知、添加、关闭、返回、箭头等）
- [x] SubTask 2.3: 设计并创建社交场景图标（喜欢、匹配、访客、心动、关注、私信、评论、点赞、分享等）
- [x] SubTask 2.4: 将图标按模块分类存放到 `apps/client/src/static/assets/icons/` 目录（tabbar/common/social/）
- [x] SubTask 2.5: 更新 `apps/client/src/config/navigation.ts` 中的图标路径配置
- **验证**：所有 SVG 图标可在小程序 `image` 组件中正常渲染

### Task 3: 替换 TabBar 图标为 SVG
- [x] SubTask 3.1: 修改 `apps/client/src/components/layout/TabBar.vue` — 将 emoji `text` 组件替换为 `image` 组件加载 SVG 图标
- [x] SubTask 3.2: 实现选中态图标切换逻辑（默认态线性 → 选中态面性填充），带 200ms 过渡
- [x] SubTask 3.3: 同步更新 `apps/client/src/custom-tab-bar/` 中的原生 TabBar 图标引用
- **验证**：TabBar 图标切换流畅，选中态正确显示品牌蓝色

---

## Phase 2: 全局组件视觉打磨（P1·视觉体验）

### Task 4: 打磨通用组件视觉细节
- [x] SubTask 4.1: 升级 `Card.vue` — 确保 `shadow.sm` + `1px solid #E2E8F0` 边框生效，interactive 变体增加 scale(0.98) 按压反馈
- [x] SubTask 4.2: 升级 `Button.vue` — 所有按钮增加 scale(0.97) 按压反馈，主按钮 hover 态品牌色加深+阴影增强
- [x] SubTask 4.3: 升级 `Avatar.vue` — 增加渐变边框支持（VIP 金色渐变），优化 fallback 初始字体的品牌渐变背景
- [x] SubTask 4.4: 升级 `Tag.vue` — 统一圆角 `radiusPill`，调整内边距为 `8rpx 16rpx`
- [x] SubTask 4.5: 升级 `SectionHeader.vue` — 确保标题使用 `h2` 字号（52rpx），字重 `semibold`
- [x] SubTask 4.6: 升级 `SectionCard.vue` — 确保卡片圆角 `24rpx`，内边距 `40rpx`
- [x] SubTask 4.7: 升级 `EmptyState.vue` / `ErrorState.vue` / `StatusState.vue` — 替换 emoji 图标为 SVG 图标
- [x] SubTask 4.8: 升级 `Skeleton.vue` — 增加 shimmer 动画（`linear-gradient` 扫光效果）
- [x] SubTask 4.9: 升级 `UnreadBadge.vue` — 统一为品牌蓝背景+白色文字，圆角 pill
- **验证**：所有通用组件样式正确，交互反馈流畅

### Task 5: 打磨首页组件视觉细节
- [x] SubTask 5.1: 升级 `HomeHeader.vue` — 学校选择器样式优化，下拉箭头替换为 SVG 图标
- [x] SubTask 5.2: 升级 `WelcomeBanner.vue` — 增加顶部蓝色渐变氛围背景
- [x] SubTask 5.3: 升级 `PersonCard.vue` — 卡片圆角 `24rpx`，图片区域增加渐变遮罩，信息区域排版优化
- [x] SubTask 5.4: 升级 `PeopleScroll.vue` — 横向滚动区域间距优化，卡片阴影柔和
- [x] SubTask 5.5: 升级 `ActivityCard.vue` / `ActivityScroll.vue` — 活动卡片视觉优化，状态标签颜色规范
- [x] SubTask 5.6: 升级 `WallSection.vue` — 帖子卡片间距和圆角优化
- **验证**：首页各模块视觉协调，信息层级清晰

### Task 6: 打磨社交组件视觉细节
- [x] SubTask 6.1: 升级 `SocialProgressIndicator.vue` — 6 层漏斗可视化优化，颜色层级区分（浅蓝→深蓝），动画过渡
- [x] SubTask 6.2: 升级 `SocialOnboardingOverlay.vue` — 引导浮层设计优化，按钮样式统一
- [x] SubTask 6.3: 升级 `MatchGuideOverlay.vue` — 匹配引导面板视觉优化
- [x] SubTask 6.4: 升级 `WallPostCard.vue` — 帖子卡片交互反馈增强（点赞/评论/关注按钮）
- **验证**：社交组件视觉统一，交互反馈流畅

### Task 7: 打磨聊天与发现组件视觉细节
- [x] SubTask 7.1: 升级 `ChatBubble.vue` — 气泡圆角优化（发送方 `20rpx 4rpx 20rpx 20rpx`，接收方 `4rpx 20rpx 20rpx 20rpx`），阴影减弱
- [x] SubTask 7.2: 升级 `ChatItem.vue` — 会话列表项间距优化，头像圆角，未读角标品牌蓝
- [x] SubTask 7.3: 升级 `ChatHeader.vue` — 聊天头部视觉优化
- [x] SubTask 7.4: 升级 `HeartSignal.vue` — 心动信号组件动效优化
- [x] SubTask 7.5: 升级 `IcebreakerSuggestions.vue` — 破冰话题卡片样式优化
- [x] SubTask 7.6: 升级 `VoicePill.vue` — 语音气泡样式优化
- [x] SubTask 7.7: 升级 `CardSwiper.vue` — 卡片滑动弹性缓动优化
- **验证**：聊天和发现组件视觉统一，交互流畅

---

## Phase 3: 页面视觉打磨（P1·视觉体验）

### Task 8: 打磨首页（home/index.vue）
- [x] SubTask 8.1: 页面顶部增加极浅蓝渐变氛围（`#F0F5FF` → `#F8FAFC`，200rpx 范围）
- [x] SubTask 8.2: 统一各区块标题字号和间距
- [x] SubTask 8.3: 统一各区块之间 32rpx 间距
- [x] SubTask 8.4: 替换所有 emoji 图标为 SVG 图标
- [x] SubTask 8.5: 确保内容区水平内边距 32rpx
- **验证**：首页视觉层次清晰，呼吸感充足

### Task 9: 打磨圈子页（village/index.vue）
- [x] SubTask 9.1: 分类 Tab 样式优化（选中态品牌蓝底线+文字变色）
- [x] SubTask 9.2: 帖子瀑布流间距优化（24rpx 卡片间距）
- [x] SubTask 9.3: 替换 emoji 图标为 SVG 图标
- [x] SubTask 9.4: 发帖悬浮按钮样式优化（品牌蓝圆形+白色 SVG 加号图标）
- **验证**：圈子页视觉统一，交互流畅

### Task 10: 打磨匹配页（discover/index.vue）
- [x] SubTask 10.1: 页面头部视觉优化（标题+剩余次数排版）
- [x] SubTask 10.2: 卡片区域确保全屏沉浸式体验
- [x] SubTask 10.3: 底部操作按钮区域优化（喜欢/超级喜欢/拒绝按钮间距和样式）
- [x] SubTask 10.4: 替换 emoji 图标为 SVG 图标
- **验证**：匹配页视觉沉浸，操作按钮反馈清晰

### Task 11: 打磨消息页（messages/index.vue 和 chat/index.vue）
- [x] SubTask 11.1: 消息列表项间距和内边距优化
- [x] SubTask 11.2: 替换 emoji 图标为 SVG 图标
- [x] SubTask 11.3: 聊天页顶部导航栏视觉优化
- [x] SubTask 11.4: 聊天输入区域样式优化（圆角、阴影、发送按钮）
- **验证**：消息页视觉统一，聊天体验流畅

### Task 12: 打磨我的页（profile/index.vue）
- [x] SubTask 12.1: 顶部品牌蓝渐变背景优化（更柔和自然的过渡）
- [x] SubTask 12.2: 头像区域白色边框+阴影增强
- [x] SubTask 12.3: 数据统计行样式优化（数字+标签排版）
- [x] SubTask 12.4: 功能菜单分组卡片样式优化（圆角 24rpx，菜单项间距）
- [x] SubTask 12.5: 替换 emoji 图标为 SVG 图标
- **验证**：我的页视觉高级感提升，信息层级清晰

### Task 13: 打磨登录页（login/index.vue）
- [x] SubTask 13.1: 视频背景渐变遮罩优化（更自然的透明度过渡）
- [x] SubTask 13.2: 登录按钮样式优化（品牌蓝填充+白色文字，全圆角）
- [x] SubTask 13.3: 标题和副标题排版的字号/字重/间距优化
- [x] SubTask 13.4: 替换 emoji/文字图标为 SVG 图标
- **验证**：登录页视觉冲击力强，品牌感突出

---

## Phase 4: 动效与过渡优化（P2·体验提升）

### Task 14: 实现页面过渡动画
- [x] SubTask 14.1: 在 `App.vue` 中增加页面切换淡入淡出过渡（`opacity` 250ms）
- [x] SubTask 14.2: 在主要页面组件中增加 `onShow` 时的内容淡入动画
- [x] SubTask 14.3: 优化 Skeleton 组件的 shimmer 扫光动画
- **验证**：页面切换流畅，加载动画自然

### Task 15: 实现通知与提示动画
- [x] SubTask 15.1: 优化 Toast 提示的滑入/滑出动画（`translateY` + 弹性缓动）
- [x] SubTask 15.2: 优化模态弹窗的缩放淡入动画（`scale(0.9)→1` + `opacity 0→1`）
- **验证**：通知和弹窗动画流畅自然

---

## Phase 5: 验证与收尾

### Task 16: 全站验证
- [x] SubTask 16.1: 全局搜索确保无 emoji 作为图标使用
- [x] SubTask 16.2: 全局搜索确保无硬编码旧色值（`#1d4ed8`、`#3b82f6` 等）
- [x] SubTask 16.3: 检查所有页面视觉效果一致性（字号、间距、圆角、阴影）
- [x] SubTask 16.4: 验证 iOS/Android 圆角和阴影表现一致
- [x] SubTask 16.5: 验证底部安全区域适配正确
- [x] SubTask 16.6: H5 构建通过，无 console 报错
- [x] SubTask 16.7: 小程序开发者工具预览正常
- **验证**：全站视觉达到专业标准

---

# Task Dependencies

- Task 2（图标创建）独立，可最先执行
- Task 1（Token 校准）独立
- Task 3（TabBar 图标替换）依赖 Task 2
- Task 4~7（组件打磨）依赖 Task 1+2
- Task 8~13（页面打磨）依赖 Task 4~7
- Task 14~15（动效优化）可与 Task 8~13 并行
- Task 16（验证）依赖所有前置任务

# 可并行执行的任务组

- **组A**（Phase 1 并行）：Task 1 + Task 2
- **组B**（Phase 2 并行）：Task 4 + Task 5 + Task 6 + Task 7
- **组C**（Phase 3 并行）：Task 8 + Task 9 + Task 10 + Task 11 + Task 12 + Task 13
- **组D**（Phase 4 并行）：Task 14 + Task 15
- **组E**（Phase 5）：Task 16（依赖所有前置任务）