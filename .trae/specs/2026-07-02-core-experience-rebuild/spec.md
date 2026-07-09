# 核心体验重做 Spec - Core Experience Rebuild

## Why
上一轮视觉修复后，用户反馈首页背景不当、tabBar 顺序不合理、圈子页面交互失效、匹配功能未实现、消息页面缺失关键交互。这些问题严重影响核心使用体验，需要分阶段重做，并强化 UI 美化与借鉴参考（贴吧/微信/探探）。

## What Changes

### A. 首页背景与主题调整（UI 美化）
- 首页背景改为纯蓝色调渐变（移除海报图片）
- 整体主题色调强化蓝色识别度（保留 `#5B7FFF` 品牌色）
- 首页卡片采用**毛玻璃效果**（backdrop-filter）适配蓝色背景
- 文字层级清晰：白色主标题、半透明白色副文字
- 装饰元素：右上角圆形光斑、左下角模糊光晕，营造氛围感

### B. tabBar 顺序与默认页调整 **BREAKING**
- 默认进入页改为「匹配」（discover）
- tabBar 顺序调整为：匹配 → 圈子 → 首页 → 消息 → 我的
- 首页位置从第一移至中间
- 学校选择器下移到合适位置（避开状态栏，`safe-area-inset-top + 24rpx`）
- tabBar 整体视觉强化：白色磨砂背景 + 顶部 1rpx 蓝色渐变分隔线

### C. 圈子页面重做（参考**百度贴吧**格式）
- 修复 tabBar 圈子图标点击失效问题
- 修复选中图标未切换显示问题
- 帖子列表采用贴吧式分区/卡片布局
- **UI 借鉴要点**：
  - 顶部 banner：渐变蓝色背景 + 「村口」标题 + 副标题「校园八卦 · 情感树洞」
  - 分区筛选 tab：横向滚动 chip，选中态蓝色填充 + 白字，未选中白底蓝字
  - 帖子卡片：白底圆角，左侧头像（带蓝色楼主徽章），右侧标题 + 内容预览（2 行省略）
  - 卡片底部分区标签（彩色色块）+ 回复数（图标 + 数字）+ 时间（灰色小字）
  - 楼主标识：蓝色圆形徽章「楼主」字样，置于头像右下角
- 强化人物头像和帖子特色区分

### D. 匹配功能完全重做（参考**探探**卡片滑动）
- 卡片滑动匹配机制
- **UI 借鉴要点**：
  - 卡片设计：圆角 32rpx，全屏宽度 90%，高度 70vh，阴影立体感
  - 卡片内容：顶部全宽头像图（aspect-ratio 3:4），底部渐变遮罩 + 姓名/年龄/标签/简介
  - 滑动反馈：右滑时卡片右上角显示绿色「LIKE」印章，左滑红色「NOPE」印章
  - 滑动动画：卡片旋转 ±15° + 透明度渐变 + 飞出屏幕
  - 底部操作按钮：3 个圆形按钮（跳过灰 / 喜欢粉 / 超级喜欢蓝），尺寸 120rpx
  - 匹配成功弹窗：双头像碰撞 + 爱心粒子动画 + 蓝粉渐变背景
- 左滑跳过、右滑喜欢
- 匹配成功弹窗与动画
- 完整匹配历史/喜欢列表联动
- 顶部统计：今日喜欢数、今日匹配数（蓝色 chip 样式）

### E. 消息页面与聊天会话重做（参考**微信**聊天）
- 修复消息列表页布局
- **UI 借鉴要点（消息列表）**：
  - 顶部 header：白色背景 + 「消息」标题（黑色加粗）+ 右侧搜索图标
  - 会话卡片：白底，左侧圆形头像（80rpx），右侧昵称 + 最后消息预览 + 时间 + 未读红点
  - 未读红点：红色圆形 + 白色数字，置于卡片右侧
- **UI 借鉴要点（聊天会话）**：
  - 顶部导航栏：白底，左侧蓝色返回 ←，中间对方昵称，右侧更多 ...
  - 消息气泡：自己右侧蓝色 `#5B7FFF`，对方左侧白色，圆角 24rpx，尾巴小三角
  - 时间戳：消息分组显示，居中灰色小字
  - 底部输入栏：白底，左侧语音/键盘切换图标，中间输入框，右侧发送按钮（蓝色）
  - 语音模式：输入框变为「按住说话」按钮，长按录音时显示录音动画
- 聊天会话参考微信：发送文字、发送语音（长按录音）
- 添加返回按钮（退出页面到消息列表）
- 完整的会话交互（气泡、时间戳、未读提示）

## Impact
- Affected specs: 2026-07-01-visual-function-comprehensive-fix
- Affected code:
  - apps/client/src/pages/home/index.vue（背景改纯蓝渐变）
  - apps/client/src/pages/discover/index.vue（卡片滑动匹配重做）
  - apps/client/src/pages/village/index.vue（贴吧式重做）
  - apps/client/src/pages/chat/index.vue（消息列表修复）
  - apps/client/src/pages/chat-session/index.vue（微信式聊天重做）
  - apps/client/src/custom-tab-bar/index.js（顺序调整）
  - apps/client/src/config/navigation.ts（tabBar 配置）
  - apps/client/src/components/layout/TabBar.vue（顺序调整）
  - apps/client/src/pages.json / app.json（pages 数组顺序，默认进入页）

## ADDED Requirements

### Requirement: 蓝色纯色首页背景
The system SHALL display 首页 with a pure blue gradient background (no poster image).

#### Scenario: 进入首页
- **WHEN** 用户进入首页
- **THEN** 背景呈现 `#5B7FFF` → `#7C9BFF` 蓝色渐变，无海报图片层

#### Scenario: 主题色保持一致
- **WHEN** 用户在首页浏览
- **THEN** 所有装饰元素、文字、卡片均使用蓝色主题色系，强化品牌识别

### Requirement: tabBar 默认进入匹配页
The system SHALL launch directly into 匹配 (discover) page on app startup.

#### Scenario: 启动小程序
- **WHEN** 用户打开小程序
- **THEN** 默认显示匹配页（discover），tabBar 第一项「匹配」激活

#### Scenario: tabBar 顺序
- **WHEN** 用户查看 tabBar
- **THEN** 顺序为：匹配 → 圈子 → 首页 → 消息 → 我的（首页位于中间位置）

### Requirement: 学校选择器位置调整
The system SHALL position the school selector below the status bar with safe-area padding.

#### Scenario: 在首页查看学校选择器
- **WHEN** 用户进入首页
- **THEN** 学校选择器位于状态栏下方 `safe-area-inset-top + 24rpx` 处，清晰可见

### Requirement: 圈子页面贴吧式布局
The system SHALL display 圈子 with a Tieba-style forum layout including clear post cards, avatar display, and section dividers.

#### Scenario: 浏览圈子
- **WHEN** 用户进入圈子页
- **THEN** 显示帖子卡片列表，每张卡片包含头像、标题、内容预览、回复数；分区明确

#### Scenario: 切换到圈子 tab
- **WHEN** 用户从其他 tab 切换到圈子
- **THEN** tabBar 图标正确切换为选中态，「圈子」文字变蓝

### Requirement: 卡片滑动匹配机制
The system SHALL provide a swipe-card matching mechanism with like/skip actions and match-success animation.

#### Scenario: 右滑喜欢
- **WHEN** 用户右滑卡片或点击「喜欢」按钮
- **THEN** 卡片飞出屏幕右侧，若双向匹配则弹出匹配成功动画与弹窗

#### Scenario: 左滑跳过
- **WHEN** 用户左滑卡片或点击「跳过」按钮
- **THEN** 卡片飞出屏幕左侧，加载下一张推荐卡片

#### Scenario: 卡片耗尽
- **WHEN** 当前批次卡片全部滑完
- **THEN** 显示「暂无更多推荐」提示，提供刷新按钮

### Requirement: 微信式聊天交互
The system SHALL provide WeChat-style chat input with text send, voice send, and back navigation.

#### Scenario: 进入聊天
- **WHEN** 用户从消息列表点击会话进入聊天
- **THEN** 顶部显示返回按钮（点击返回消息列表），底部支持文字输入与语音切换

#### Scenario: 发送文字
- **WHEN** 用户输入文字并点击发送
- **THEN** 消息气泡显示在右侧，附带时间戳，输入框清空

#### Scenario: 发送语音
- **WHEN** 用户切换到语音模式并长按「按住说话」按钮
- **THEN** 开始录音，松开后语音消息发送并显示在气泡中

#### Scenario: 返回消息列表
- **WHEN** 用户点击顶部返回按钮
- **THEN** 退出聊天会话页，返回消息列表

## MODIFIED Requirements

### Requirement: tabBar 配置
tabBar 顺序调整为：匹配 → 圈子 → 首页 → 消息 → 我的；首页置于中间位置；默认激活第一项「匹配」。

### Requirement: 首页布局
首页移除海报背景层与覆盖层，改用纯蓝色渐变；学校选择器下移；保留签到入口、推荐卡片、活动板块、热门话题等功能模块。

## REMOVED Requirements

### Requirement: 首页海报图片背景
**Reason**: 用户反馈首页背景应为纯蓝色，不放图片
**Migration**: 移除 `home-poster.jpg` 引用与 `<image>` 背景层，改用 CSS `linear-gradient` 蓝色渐变背景

### Requirement: 旧的匹配按钮触发跳转
**Reason**: 匹配功能完全重做，不再使用按钮跳转 likes 页的方式
**Migration**: 改为卡片滑动机制，匹配成功后弹窗引导进入聊天
