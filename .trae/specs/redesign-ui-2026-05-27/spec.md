# UI全面重置与功能升级 Spec — 蓝色校园风格

## Why
当前小程序 UI 视觉观感不佳，不满足上线标准。需全面重置为专业级视觉表现，采用现代设计美学，对标 ChatGPT 设计图的蓝色校园风格，同时增加校园场景核心功能模块，提升用户引流效果和停留时间。

## What Changes
- **色彩系统重构**：品牌色从冷蓝 `#1d4ed8` 迁移到校园蓝 `#2563EB`，背景 `#F8FAFC`，卡片纯白
- **圆角与阴影升级**：卡片圆角统一 `16rpx~24rpx`，按钮全圆角，阴影更柔和现代
- **排版层级优化**：标题使用粗体大字号，信息层级清晰，留白充足
- **登录页视频背景**：支持校园风景视频背景（muted autoplay loop），上方叠加渐变遮罩
- **首页重构**：顶部学校选择器 + 校园圈活动横向滑动 + 课表空档 + 校园墙瀑布流 + 逛逛推荐
- **新增课表空档功能**：展示本周课表，高亮空闲时段，支持查看同学空档
- **新增校园圈活动**：活动卡片（报名中/进行中/预告），支持报名和查看详情
- **新增校园墙功能**：帖子发布（文字+图片+定位），支持点赞/评论/关注
- **新增顺手可买**：校内商品/票务/优惠券展示
- **新增高级会员**：会员权益页，含专属标识/解锁空档/优先推荐等
- **消息页升级**：聊天界面优化，增加话题推荐助手
- **我的页升级**：顶部渐变背景 + 会员卡片 + 功能菜单分组
- **TabBar改造**：5个tab（首页/圈子/聊天/逛逛/我的），蓝色线面结合图标

## Impact
- Affected specs: 全部5个主页面 + 登录页 + LockScreen + TabBar + 新增4个功能模块
- Affected code: `uni.scss`, `design-system/tokens.ts`, `pages/discover/index.vue`, `pages/likes/index.vue`, `pages/village/index.vue`, `pages/messages/index.vue`, `pages/profile/index.vue`, `components/common/LockScreen.vue`, `pages/login/index.vue`, `config/navigation.ts`, 新增课表/活动/校园墙/会员相关页面和组件

## ADDED Requirements

### Requirement: 登录页视频背景
The system SHALL 支持在登录页播放校园风景背景视频。

#### Scenario: 视频模式
- **WHEN** 用户进入登录页
- **THEN** 展示全屏背景视频（muted autoplay loop），上方叠加 `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))` 遮罩
- **AND** 登录按钮为白色半透明底+白色文字，或品牌蓝填充

#### Scenario: 降级模式
- **WHEN** 视频加载失败
- **THEN** 降级为静态校园风景图或深蓝渐变背景

### Requirement: 课表空档功能
The system SHALL 展示用户本周课表并高亮空闲时段。

#### Scenario: 查看课表
- **WHEN** 用户在首页查看"课表空档"模块
- **THEN** 展示周一至周五的课程安排，已占用时段显示课程名和教室，空闲时段高亮显示
- **AND** 支持点击空闲时段查看此时段空闲的同学列表

#### Scenario: 编辑课表
- **WHEN** 用户首次使用或需要修改课表
- **THEN** 支持手动添加/删除课程，设置课程时间、地点

### Requirement: 校园圈活动功能
The system SHALL 展示校园活动列表并支持报名。

#### Scenario: 浏览活动
- **WHEN** 用户进入首页"校园圈活动"模块
- **THEN** 展示活动卡片横向滑动列表，每张卡片包含活动图、标题、时间、地点、状态标签（报名中/进行中/预告）

#### Scenario: 活动详情与报名
- **WHEN** 用户点击活动卡片
- **THEN** 进入活动详情页，展示完整信息、已报名人数、活动介绍
- **AND** 支持点击"报名参加"按钮报名

### Requirement: 校园墙功能
The system SHALL 支持用户发布和浏览校园墙帖子。

#### Scenario: 发布帖子
- **WHEN** 用户点击"发一条"按钮
- **THEN** 进入发帖页面，支持输入文字、上传图片（最多9张）、添加定位、选择话题标签

#### Scenario: 浏览帖子
- **WHEN** 用户浏览校园墙
- **THEN** 展示帖子瀑布流，包含用户头像、昵称、学院年级、内容、图片、定位、点赞/评论数
- **AND** 支持点赞、评论、关注发帖人

### Requirement: 顺手可买功能
The system SHALL 展示校内商品和优惠信息。

#### Scenario: 浏览商品
- **WHEN** 用户进入"逛逛"页面
- **THEN** 展示商品/票务/优惠券分类列表，包含图片、标题、价格、销量

### Requirement: 高级会员功能
The system SHALL 提供高级会员订阅服务。

#### Scenario: 会员权益展示
- **WHEN** 用户进入"我的"页面或点击会员入口
- **THEN** 展示会员权益：专属标识、解锁空档查看、优先推荐、隐身浏览、消息加速等
- **AND** 展示"立即开通"按钮

## MODIFIED Requirements

### Requirement: 色彩系统
**原实现**: 品牌色冷蓝 `#1d4ed8`，背景 `#f4f7fb`  
**新实现**: 品牌色校园蓝 `#2563EB`，背景 `#F8FAFC`，容器纯白 `#FFFFFF`，文字 `#1E293B`/`#64748B`

### Requirement: 首页结构
**原实现**: 寻觅页（卡片推荐+签到+每日一问+村口动态）  
**新实现**: 首页聚合页（学校选择器+校园圈活动+课表空档+校园墙+逛逛推荐）

### Requirement: TabBar
**原实现**: 寻觅/喜欢/村口/消息/我的  
**新实现**: 首页/圈子/聊天/逛逛/我的，图标为蓝色线面结合风格

### Requirement: 圆角系统
**原实现**: 卡片圆角 `16px`/`20rpx`  
**新实现**: 卡片圆角 `16rpx`/`24rpx`，按钮全圆角 `999px`

### Requirement: 阴影系统
**原实现**: 阴影偏深 `rgba(15, 23, 42, 0.08)`  
**新实现**: 更柔和的现代阴影 `rgba(37, 99, 235, 0.06)`，卡片增加细边框 `1px solid #E2E8F0`

## REMOVED Requirements

### Requirement: 寻觅页卡片滑动
**Reason**: 新设计以校园社交为核心，原Tinder式卡片滑动与校园场景不符  
**Migration**: 保留用户推荐逻辑，改为列表/卡片混合展示在"可能认识"模块

### Requirement: 喜欢页访客列表
**Reason**: 新设计简化为更自然的校园社交  
**Migration**: 保留互相关注和互动数据，整合到"我的"统计中
