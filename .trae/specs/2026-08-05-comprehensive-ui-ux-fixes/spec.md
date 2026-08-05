# 小程序端 UI/UX 问题修复 Spec

## Why

用户在真机微信小程序实测中发现：寻觅页、圈子页、消息页、我的页以及活动入口存在大量交互断层与功能缺失，已直接影响核心体验。本次基于 `apps/client/dist/build/mp-weixin` 构建产物与源码审查，聚焦微信小程序端（H5 不在本次范围内），逐页定位根因并输出可执行修复方案。

## What Changes

### A. 寻觅页（discover）卡片可见性与布局修复
- 当前问题：页面头部、筛选栏、搜索框、签到卡片、权益卡片、每日问题等块级元素依次堆叠，CardSwiper 的 `card-area` 仅设置 `flex:1; min-height:760rpx`，在小屏真机上被上方元素严重挤压；CardSwiper 内部 `.action-bar` 位于卡片下方（文档流），进一步挤占卡片可视区域，导致用户只能看到签到和底部操作按钮，看不清中央卡片。
- 修复方向：
  - 将 `.action-bar` 改为绝对定位并叠加在卡片底部，不再挤压卡片主视觉区
  - 收缩/折叠签到卡片、权益卡片等非核心区块，或将其改为横向紧凑入口
  - 确保 CardSwiper 在常见机型（iPhone SE ~ Pro Max 类高度）上占据中央主视觉区

### B. 寻觅页操作按钮真实响应
- 当前问题：收藏、爱心按钮虽有 `catchtap` 绑定，但疑似仅切换本地状态，未接入 `discoverStore` 的真实喜欢/收藏逻辑，用户感知为"没什么用"。
- 修复方向：收藏/爱心按钮调用 `discoverStore.swipeRight` / 收藏 action，给出状态反馈与触觉反馈。

### C. 圈子页（circle）入口与生态梳理
- 当前问题：源码 `pages/circle/index.vue` 仍显示"村口发帖"标题和顶部"发帖"按钮；而 TabBar 实际指向的可能是 `pages/circles/index.vue`（圈子列表），导致用户看到的圈子页与用户预期不符。缺少校园认证圈与兴趣圈的分层，也没有右下角 FAB 发帖按钮。
- 修复方向：
  - 确认并统一 TabBar 圈子入口指向
  - 圈子页左上角标题改为"圈子"
  - 移除顶部"发帖"按钮，新增右下角 FAB（圆形 → 按下变圆角方形）
  - 增加"校园圈/兴趣圈"分区，校园圈需认证后才能进入
  - 发帖编辑页支持 tag、喜爱、定向圈子发布

### D. 首页（home）学校匹配认证与绑定
- 当前问题：源码已实现认证前置与 `bindSchool`，但用户反馈仍可随意选择、未真正绑定。需验证绑定接口与状态持久化，以及选择器只读态在真机上的实际表现。
- 修复方向：
  - 未认证用户点击学校选择器 → 弹窗引导认证
  - 已认证用户选择学校后调用真实绑定接口，成功后锁定选择器
  - 已绑定用户再次点击提示"学校已绑定，如需修改请联系客服"

### E. 签到（checkin）积分与用途说明
- 当前问题：签到后提示"获得 N 积分"，但用户看不到积分余额，也不知道积分用途；下方活动日历等入口无法正常使用。
- 修复方向：
  - 签到成功展示当前积分余额与"积分可在商城兑换权益"说明
  - 积分入口跳转商城页
  - 修复/实现线下活动日历的点击与滑动交互

### F. 活动页与内容页
- 当前问题：活动日历无法点击，活动详情、附近的人、MBTI、恋爱咨询课程等页面缺少示例内容或退出按钮。
- 修复方向：
  - 活动日历支持点击日期、滑动切换月份
  - 每个活动点击进入详情页，包含活动介绍、时间、地点、报名按钮
  - 附近的人/MBTI/恋爱咨询课程页面补充示例内容，支持后台配置 H5 URL
  - 内容页左上角/右上角增加退出按钮

### G. 设置与反馈入口
- 当前问题：反馈入口隐藏较深，设置入口不明显。
- 修复方向：在首页/寻觅页顶部增加齿轮状设置按钮，设置页一级菜单增加反馈入口，我的页顶部保留退出按钮。

### H. 全局发布动态 FAB
- 当前问题：发布动态按钮与底部 Tab 可能重叠，且在消息页构建产物中未出现 GlobalPublishFab。
- 修复方向：在所有主 Tab 页面（首页、寻觅、圈子、消息、我的）右下角固定 FAB，位于 TabBar 上方，跟随滚动，不重叠。

### I. 消息页（messages）整理
- 当前问题：
  - 构建产物中缺失 GlobalPublishFab
  - "林夕"等会话若头像字段异常会显示奇怪图标或首字符
  - 官方消息/小助手使用 emoji 图标而非真实头像
  - 话题推荐位置错误（应在圈子页）
- 修复方向：
  - 消息页接入 GlobalPublishFab
  - 私信列表顶部置顶官方消息与小助手，使用真实头像/SVG 图标
  - 修复异常头像回退逻辑
  - 移除消息页话题推荐入口，迁移至圈子页

### J. 我的页（profile）修复
- 当前问题：
  - 编辑资料按钮图标过大或点击热区被遮挡
  - 顶部可能存在未知大图标
  - 我的动态中出现爱心 emoji
  - 功能入口图标需统一为 SVG
- 修复方向：
  - 修复编辑资料按钮点击热区，图标尺寸控制在 32-40rpx
  - 移除/替换顶部未知图标
  - 爱心 emoji 替换为 SVG 标记
  - 动态、任务中心、访客记录、相册、恋爱认证等入口补齐真实功能与统一 SVG 图标

## Impact

- Affected specs:
  - `2026-07-28-consolidated-1340-fixall`
  - `2026-07-04-ui-refinement-from-real-feedback`
  - `polish-match-card-experience`
  - `qingteng-social-differentiation`
- Affected code:
  - 寻觅页：`apps/client/src/pages/discover/index.vue`、`apps/client/src/components/discover/CardSwiper.vue`
  - 圈子页：`apps/client/src/pages/circle/index.vue`、`apps/client/src/pages/circles/index.vue`、`apps/client/src/pages/circles/post-topic.vue`、`apps/client/src/stores/circle.ts`
  - 首页：`apps/client/src/pages/home/index.vue`、`apps/client/src/stores/session.ts`
  - 签到：`apps/client/src/stores/checkin.ts`、`apps/client/src/pages/discover/index.vue`
  - 活动：`apps/client/src/pages/activities/index.vue`、`apps/client/src/pages/activities/detail.vue`、`apps/client/src/stores/activity.ts`
  - 设置/反馈：`apps/client/src/pages/settings/index.vue`、`apps/client/src/pages/feedback/history.vue`
  - 消息：`apps/client/src/pages/messages/index.vue`、`apps/client/src/stores/messages.ts`
  - 我的：`apps/client/src/pages/profile/index.vue`、`apps/client/src/pages/profile/album.vue`、`apps/client/src/pages/profile/visitors.vue`、`apps/client/src/pages/verification/index.vue`、`apps/client/src/config/images.ts`
  - 全局：`apps/client/src/components/common/GlobalPublishFab.vue`、`apps/client/src/components/layout/TabBar.vue`

## ADDED Requirements

### Requirement: 寻觅页卡片主视觉区可见
系统 SHALL 保证在 iPhone SE 高度（约 568pt）及以上的微信小程序机型上，CardSwiper 卡片区域占据屏幕中央可见高度不少于 45%，中央人物卡片完整可见，不被签到、权益、搜索等模块挤压；底部操作按钮 SHALL 以半透明浮动栏形式叠加在卡片底部，不占用文档流高度。

#### Scenario: 卡片不被挤压
- **WHEN** 用户进入寻觅页
- **THEN** 可见区域 primarily 展示人物卡片，而非被签到/操作按钮占据

### Requirement: 寻觅页操作按钮真实生效
系统 SHALL 保证收藏、爱心按钮点击后调用真实的喜欢/收藏逻辑，并给出明确状态反馈（图标高亮 + toast/haptic）。

#### Scenario: 点击爱心
- **WHEN** 用户点击爱心按钮
- **THEN** 触发 `discoverStore.swipeRight(cardId)`，卡片右滑或按钮高亮，并给出 haptic 反馈

#### Scenario: 点击收藏
- **WHEN** 用户点击收藏按钮
- **THEN** 将当前卡片加入收藏列表，按钮高亮，并给出反馈

### Requirement: 圈子页标题与入口统一
系统 SHALL 保证 TabBar 的"圈子"入口指向统一的圈子主页面；页面左上角标题 SHALL 显示"圈子"；顶部 SHALL 不再显示"发帖"按钮。

### Requirement: 圈子页校园圈/兴趣圈分层
系统 SHALL 将圈子页划分为"校园圈"与"兴趣圈"两大分区；校园圈 SHALL 仅对完成校园认证的用户开放；兴趣圈 SHALL 按爱好/话题分类展示。

#### Scenario: 未认证用户进入校园圈
- **GIVEN** 用户未完成校园认证
- **WHEN** 用户切换到"校园圈"Tab
- **THEN** 展示认证引导卡片，点击跳转 `/pages/campus/certification`

### Requirement: 圈子页 FAB 发帖按钮
系统 SHALL 在圈子页右下角提供圆形 FAB 发帖按钮；按钮在用户按下时 SHALL 从圆形（border-radius: 50%）动画过渡为圆角方形（border-radius: 24rpx）；点击 SHALL 跳转到发帖编辑页；FAB SHALL 不遮挡底部 TabBar。

### Requirement: 发帖编辑页功能
系统 SHALL 在发帖编辑页提供 tag 选择、喜爱标签、定向圈子发布功能。

### Requirement: 首页学校选择认证前置与一次性绑定
系统 SHALL 在首页学校选择器前校验校园认证状态；未认证时 SHALL 引导认证；认证后选择学校 SHALL 调用后端绑定接口，绑定后选择器变为只读。

### Requirement: 签到积分展示与用途说明
系统 SHALL 在签到成功后展示获得的积分数；SHALL 提供积分用途说明；SHALL 跳转积分商城。

### Requirement: 活动日历与内容页可用
系统 SHALL 提供可点击的线下活动日历；SHALL 为每个活动提供详情页（含活动介绍、时间、地点、报名）；SHALL 为附近的人/MBTI/恋爱咨询课程等内容页提供示例内容与后台可控的 H5 URL 注入能力；内容页 SHALL 提供退出按钮。

### Requirement: 主页设置与反馈入口
系统 SHALL 在首页/寻觅页顶部提供齿轮状设置按钮；SHALL 在设置页一级菜单提供反馈入口；SHALL 在我的页顶部提供退出登录按钮。

### Requirement: 全局发布动态 FAB
系统 SHALL 在所有主 Tab 页面（寻觅/首页/圈子/消息/我的）右下角提供全局发布动态 FAB；FAB SHALL 固定定位、跟随滚动；SHALL NOT 与底部 TabBar 重叠。

### Requirement: 消息页官方与小助手置顶
系统 SHALL 在消息页私信列表顶部置顶"官方消息"与"小助手"两个固定会话；SHALL 展示对方真实头像或统一 SVG 图标；SHALL NOT 展示"林夕"等异常头像。

### Requirement: 消息页话题推荐迁移
系统 SHALL 将话题推荐入口从消息页迁移至圈子页顶部；消息页 SHALL 不再展示话题推荐。

### Requirement: 我的页编辑资料与功能入口
系统 SHALL 修复"编辑资料"按钮点击热区与图标尺寸；SHALL 移除未知大图标；SHALL 将爱心 emoji 替换为 SVG 标记；SHALL 为动态/任务中心/访客记录/相册/恋爱认证等入口提供匹配风格的 SVG 图标与真实跳转路径。

## MODIFIED Requirements

### Requirement: 圈子页导航与发帖流程
圈子页左上角标题 SHALL 显示"圈子"；发帖按钮 SHALL 从顶部 header 下移到右下角 FAB；FAB 形态 SHALL 支持圆形→方形的动画过渡；发帖编辑页 SHALL 支持 tag/喜爱/定向圈子发布。

### Requirement: 消息页分区与置顶
消息页 SHALL 在私信列表顶部置顶官方消息与小助手；SHALL NOT 在消息页展示话题推荐（迁移至圈子页）；SHALL 修复林夕等异常头像。

## REMOVED Requirements

### Requirement: H5 端同步验证
**Reason**: 用户明确要求本次只检查与修复微信小程序端，H5 不在范围内。
**Migration**: 小程序端修复完成后，如需支持 H5，再单独评估适配成本。

### Requirement: 消息页话题推荐入口
**Reason**: 话题推荐与消息页业务不相关，应归属圈子页
**Migration**: 将话题推荐入口迁移到圈子页顶部，消息页移除该入口

### Requirement: 圈子页顶部"发帖"按钮
**Reason**: 顶部"发帖"按钮位置不符合用户预期，应改为右下角 FAB
**Migration**: 移除顶部"发帖"按钮，新增右下角 FAB 发帖按钮
