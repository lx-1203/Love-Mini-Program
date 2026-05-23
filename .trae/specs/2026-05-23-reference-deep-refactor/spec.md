# 参考内容全面分析与深度重构方案 Spec

## Why

基于对参考目录（`D:\6\恋爱小程序\参考`）中11张竞品"青藤"微信截图的深度分析，结合对当前项目代码库的全面审查（含13个后端Real服务、24个数据库迁移脚本、12个前端Store），发现项目虽经多期重构已具备较完整的基础架构，但仍存在以下核心问题：

1. **RealProfileService 7个核心方法抛UnsupportedOperationException**：个人资料的查询和保存全部未实现，Real模式下用户无法编辑基本资料、校区资料、日程资料，也无法查看个人统计——这是Real模式的**致命阻塞**，因为资料完善是使用应用的前提条件
2. **RealFeedbackService 4个方法抛UnsupportedOperationException**：反馈功能在Real模式下完全不可用
3. **RealAppConfigService.getLoginHeroConfig()抛异常**：登录页主视觉配置不可用
4. **chat/和chat-session/页面未在pages.json中注册**：临时聊天功能的前端页面无法通过路由访问
5. **chat.ts和session.ts Store缺少Mock模式**：Mock环境下聊天和会话功能失效
6. **RealRecommendationService仍使用findAll()全量查询**：大数据量下存在性能隐患
7. **RealVillageService Phase 1兼容方法硬编码userId=1L**：所有操作归属到ID为1的用户

本次方案核心目标：**从"基础架构完整+关键服务缺失"升级为"全功能真实驱动+完整社交闭环"**，精准还原参考产品的核心功能体验，保留大学生模式的独特性，集成在线社交互动功能，确保推荐方案设置完整可用。

**特别约束**：严禁任何游戏化元素（积分/等级/排行榜/成就徽章等）和购物相关功能（商城/付费/虚拟物品等）。项目北极星指标：**提升用户引流效果 + 延长客户停留时间**。

---

## 参考内容详细功能分析

### 一、参考产品（青藤）功能模块矩阵

基于11张微信截图（编号141-151）的深度分析，参考产品的完整功能矩阵如下：

| 模块 | 截图编号 | 子功能 | 交互方式 | 用户场景 |
|------|----------|--------|----------|----------|
| **寻觅** | 141 | 全屏卡片滑动推荐 | 左滑拒绝/右滑喜欢/上滑超级喜欢 | 浏览潜在匹配对象 |
| | | 每日限量推荐 | 定时刷新（中午12点） | 制造稀缺感，促回流 |
| | | 推荐卡片详情 | 点击展开完整资料 | 深入了解对方 |
| | | 挽回/回看 | 每日1次挽回最后拒绝 | 后悔机制 |
| | | 底部村口动态流 | 嵌入式帖子预览 | 增加停留时间 |
| | | 底部活动推荐 | 卡片耗尽后展示活动入口 | 替代入口 |
| **喜欢** | 142 | 喜欢我的列表 | 横向头像列表+纵向详情 | 查看谁喜欢了我 |
| | | 访客记录 | 横向头像列表+时间 | 查看谁看了我 |
| | | 互相喜欢→心动信号 | 自动触发+倒计时 | 双向匹配确认 |
| | | 资料未完善锁定 | 模糊头像+引导完善 | 强制完善资料 |
| **村口** | 143 | 三标签切换 | 关注/同城/发现 | 内容分类浏览 |
| | | 六分类筛选 | 全部/兴趣圈/诚意帖/同乡/蒙面/最新 | 精准内容发现 |
| | | 帖子发布 | 文字+图片+话题标签+分类 | UGC内容创作 |
| | | 帖子互动 | 点赞/评论/关注/私信/转发 | 社交互动 |
| | | 帖子详情 | 作者卡片+评论列表+互动 | 深度内容消费 |
| | | 悬浮发帖按钮 | FAB按钮 | 快速发帖入口 |
| **消息** | 144 | 心动信号Banner | 匹配摘要+倒计时+直接开聊 | 匹配后即时沟通 |
| | | 私信列表 | 会话列表+未读标记 | 管理对话 |
| | | 系统通知 | 分类图标+跳转链接 | 了解互动动态 |
| | | 临时匿名聊天 | 24h过期+倒计时 | 低压力交流 |
| **我的** | 145 | 个人信息展示 | 头像+昵称+学校+统计 | 自我展示 |
| | | 资料完善度 | 进度条+百分比 | 引导完善资料 |
| | | 功能菜单 | 编辑资料/推荐计划/兴趣圈/反馈/设置 | 功能入口集合 |
| | | 推荐计划设置 | 时间偏好+范围选择 | 个性化推荐配置 |
| **推荐计划** | 146 | 推荐时间偏好 | 时间选择器 | 定制刷新时间 |
| | | 推荐范围选择 | 同校优先/同城/不限 | 影响推荐排序 |
| **帖子详情/发帖** | 147 | 作者交互卡片 | 学校/兴趣/关注状态+私信 | 缩短社交距离 |
| | | 帖子转发 | 站内转发+附加评论 | 内容传播 |
| | | 发帖 | 文字+图片+标签+分类 | 内容创作 |
| **活动** | 148 | 活动列表+详情 | 卡片+报名 | 线下社交 |
| | | 活动日历 | 月历视图 | 时间规划 |
| | | 活动报名 | 感兴趣/参加 | 参与线下活动 |
| **兴趣圈** | 149 | 圈子列表/加入 | 列表+一键加入 | 兴趣社交 |
| | | 圈内话题/回复 | 话题+回复 | 深度互动 |
| | | 村口联动 | 精选话题跨圈展示 | 内容曝光 |
| **每日一问** | 150 | 每日问题推送 | 问题+回答 | 日常互动 |
| | | 匿名回答 | 匿名开关 | 低压力表达 |
| | | 基于回答匹配 | 共同回答加分 | 发现志同道合 |
| **资料/认证** | 151 | 资料完善硬门槛 | 锁定核心功能 | 保证用户质量 |
| | | 学校认证 | 学生证+学号+审核 | 大学生身份验证 |
| | | 兴趣标签选择 | 多选标签 | 影响推荐匹配 |

### 二、交互流程分析

#### 核心用户旅程（5阶段闭环）

```
阶段1: 引流
  微信登录 → 学校认证 → 资料完善 → 解锁全部功能

阶段2: 发现
  寻觅页浏览推荐卡片 → 左滑拒绝/右滑喜欢

阶段3: 匹配
  双向喜欢 → 触发心动信号 → 倒计时内开聊

阶段4: 互动
  私信对话 → 村口社区互动 → 兴趣圈话题 → 活动报名

阶段5: 留存
  每日推荐刷新 → 签到 → 每日一问 → 消息通知 → 社区动态更新
```

#### 关键交互细节

1. **卡片滑动**：全屏沉浸式，手势流畅，飞出动画自然
2. **心动信号**：双向喜欢后自动触发，24h倒计时制造紧迫感
3. **村口发帖**：悬浮FAB按钮，随时可发，降低创作门槛
4. **私信入口**：多个触点（喜欢页/帖子详情/心动信号/兴趣圈），缩短社交距离
5. **时间门控**：每日中午12点刷新推荐，制造期待感和回流动力
6. **多层级社交**：轻量互动（滑动/点赞）→ 中度互动（关注/话题）→ 深度互动（私信/活动）

### 三、用户场景分析

| 场景 | 用户需求 | 参考产品支持 | 当前项目支持 | 差距 |
|------|----------|-------------|-------------|------|
| 快速浏览 | 发现潜在匹配对象 | ✅ 卡片滑动 | ✅ CardSwiper | 无 |
| 双向确认 | 确认互相喜欢 | ✅ 心动信号 | ✅ Real可用 | 无 |
| 社区浏览 | 查看他人动态 | ✅ 村口广场 | ✅ Real可用 | 无 |
| 内容创作 | 表达自己、吸引关注 | ✅ 发帖+分类 | ✅ Real可用 | 无 |
| 一对一交流 | 深入对话 | ✅ 私信+临时聊天 | ✅ Real可用 | 无 |
| 活动参与 | 线下见面 | ✅ 活动列表+报名 | ✅ Real可用 | 无 |
| 日常回流 | 保持活跃 | ✅ 签到+推荐刷新 | ✅ Real可用 | 无 |
| 话题互动 | 兴趣讨论 | ✅ 兴趣圈+每日一问 | ✅ Real可用 | 无 |
| 个性化推荐 | 定制推荐规则 | ✅ 推荐计划设置 | ✅ Real可用 | 无 |
| 实时沟通 | 即时消息 | ✅ WebSocket | ✅ 前后端均可用 | 无 |
| 资料编辑 | 完善个人信息 | ✅ 完整资料编辑 | ❌ RealProfileService抛异常 | **致命阻塞** |
| 反馈提交 | 提交问题反馈 | ✅ 反馈中心 | ❌ RealFeedbackService抛异常 | **P0阻塞** |
| 登录页配置 | 动态主视觉 | ✅ 可配置 | ❌ RealAppConfigService抛异常 | **P1问题** |

---

## 当前功能 vs 目标功能对比评估

### 当前项目功能实现状态总览

| 功能模块 | 前端页面 | 前端Store | 后端Mock | 后端Real | Real端到端 | 遗留问题 |
|----------|----------|-----------|----------|----------|------------|----------|
| 微信登录 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | ✅可用 | — |
| 资料编辑 | ✅完整 | ✅完整 | ✅完整 | ❌7方法抛异常 | 仅Mock | **致命阻塞** |
| 寻觅(卡片推荐) | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ⚠️待优化 | findAll()性能隐患 |
| 喜欢/访客 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 心动信号 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 村口(帖子社区) | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | Phase 1硬编码userId |
| 私信 | ✅完整 | ✅双模式 | ⚠️空列表 | ✅完整 | ✅可用 | — |
| 临时聊天 | ❌页面未注册 | ⚠️无Mock | ✅完整 | ✅完整 | 仅Mock | 页面路由缺失 |
| 系统通知 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 签到 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 每日一问 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 兴趣圈 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 活动 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 反馈中心 | ✅完整 | ✅完整 | ✅完整 | ❌4方法抛异常 | 仅Mock | **P0阻塞** |
| 匹配 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 推荐计划设置 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | ✅可用 | — |
| 关注关系 | ✅完整 | ✅双模式 | ✅完整 | ✅完整 | ✅可用 | — |
| 登录页配置 | ✅完整 | ✅完整 | ✅完整 | ❌1方法抛异常 | 仅Mock | P1问题 |

### 差异点详细矩阵

| 维度 | 当前代码实际状态 | 目标状态 | 差距类型 | 改进方向 |
|------|-----------------|---------|----------|----------|
| **RealProfileService** | 7个方法抛UnsupportedOperationException | 完整CRUD | **P0致命** | 实现全部7个方法 |
| **RealFeedbackService** | 4个方法抛UnsupportedOperationException | 完整CRUD | **P0阻塞** | 实现全部4个方法 |
| **chat/chat-session页面** | 存在但未在pages.json注册 | 页面可路由访问 | **P0阻塞** | 注册页面路由 |
| **chat.ts Mock模式** | 无Mock分支 | Mock/Real双模式 | **P1核心** | 添加Mock数据 |
| **session.ts Mock模式** | 无Mock分支 | Mock/Real双模式 | **P1核心** | 添加Mock数据 |
| **RealAppConfigService** | getLoginHeroConfig()抛异常 | 返回真实配置 | **P1问题** | 实现方法 |
| **RealRecommendationService** | findAll()全量查询 | 分页查询+性能优化 | **P1性能** | 优化查询方式 |
| **RealVillageService** | Phase 1方法硬编码userId=1L | 从SecurityContext获取 | **P1质量** | 修复硬编码 |
| **两套页面目录不一致** | pages/缺少circles/daily-question | 统一一份 | **P2质量** | 对齐目录 |
| **微信小程序appid** | manifest.json中为空 | 真实appid | **P2部署** | 填写appid |
| **前端视图类型字段缺失** | 多个View缺少字段 | 完整字段 | **P2质量** | 补全字段 |

---

## What Changes

### 一级：P0致命项 — RealProfileService完整实现

- 实现 `getBasicProfile(userId)` — 查询用户基本资料（头像/昵称/bio/性别/生日/兴趣标签）
- 实现 `saveBasicProfile(userId, data)` — 保存用户基本资料
- 实现 `getCampusProfile(userId)` — 查询校区资料（学校/专业/年级/学号/认证状态）
- 实现 `saveCampusProfile(userId, data)` — 保存校区资料
- 实现 `getScheduleProfile(userId)` — 查询日程资料（空闲时间段）
- 实现 `saveScheduleProfile(userId, data)` — 保存日程资料
- 实现 `getProfileStats(userId)` — 查询个人统计（关注数/粉丝数/获赞数/帖子数）

### 二级：P0阻塞项 — RealFeedbackService + 页面路由修复

- 实现 `submit(userId, request)` — 提交反馈/活动提案
- 实现 `listMine(userId)` — 查询我的反馈列表
- 实现 `listAdminFeedback()` — 管理员查看所有反馈
- 实现 `convertProposal(feedbackId)` — 将活动提案转为正式活动
- 在pages.json中注册chat和chat-session页面路由

### 三级：P1核心项 — Store Mock模式 + RealAppConfigService

- 为chat.ts添加Mock模式支持（本地Mock聊天数据）
- 为session.ts添加Mock模式支持（本地Mock会话数据）
- 实现 `RealAppConfigService.getLoginHeroConfig()` — 返回登录页主视觉配置

### 四级：P1性能与质量项 — 推荐优化 + 硬编码修复

- 优化RealRecommendationService：替换findAll()为分页查询
- 修复RealVillageService Phase 1方法中硬编码userId=1L
- 对齐两套页面目录（统一到src/pages/）
- 补全前端视图类型缺失字段

### 五级：P2部署与清理项

- 填写微信小程序appid（需用户提供）
- 统一@Profile注解风格（移除多余的@Primary）
- 清理RealNotificationService方法签名不一致

---

## Impact

- Affected specs:
  - `2026-05-23-reference-comprehensive-refactor`（Phase 2 Store验证标记完成但chat.ts/session.ts仍有问题）
  - `2026-05-22-reference-analysis-refactor`（RealProfileService未实现）
  - `2026-05-22-refactor-comprehensive`（后端数据层已就绪，关键服务需补全）

- Affected code:
  - `apps/api/.../profile/RealProfileService.java` — 实现7个方法
  - `apps/api/.../feedback/RealFeedbackService.java` — 实现4个方法
  - `apps/api/.../growth/RealAppConfigService.java` — 实现1个方法
  - `apps/api/.../discover/RealRecommendationService.java` — 优化查询
  - `apps/api/.../village/RealVillageService.java` — 修复硬编码
  - `apps/client/pages.json` — 注册chat/chat-session页面
  - `apps/client/src/stores/chat.ts` — 添加Mock模式
  - `apps/client/src/stores/session.ts` — 添加Mock模式
  - `apps/client/src/services/generated/api-types.ts` — 补全视图类型字段

---

## ADDED Requirements

### Requirement: RealProfileService个人资料完整实现

系统 SHALL 实现个人资料的完整后端Real服务，替代UnsupportedOperationException，使资料编辑功能在Real模式下可用。

#### Scenario: 查询基本资料

- **WHEN** 用户打开资料编辑页
- **THEN** 系统从user_basic_profile表查询基本资料
- **AND** 返回头像、昵称、bio、性别、生日、兴趣标签
- **AND** 若无记录返回空资料模板

#### Scenario: 保存基本资料

- **WHEN** 用户提交基本资料修改
- **THEN** 系统更新user_basic_profile表
- **AND** 重新计算资料完善度（profileCompletion字段）
- **AND** 返回更新后的资料

#### Scenario: 查询校区资料

- **WHEN** 用户打开校区资料页
- **THEN** 系统从user_campus_profile表查询校区资料
- **AND** 返回学校、专业、年级、学号、认证状态
- **AND** 若无记录返回空资料模板

#### Scenario: 保存校区资料

- **WHEN** 用户提交校区资料修改
- **THEN** 系统更新user_campus_profile表
- **AND** 重新计算资料完善度和认证状态
- **AND** 返回更新后的资料

#### Scenario: 查询日程资料

- **WHEN** 用户打开日程安排页
- **THEN** 系统从user_schedule_profile表查询日程资料
- **AND** 返回空闲时间段配置

#### Scenario: 保存日程资料

- **WHEN** 用户提交日程安排修改
- **THEN** 系统更新user_schedule_profile表
- **AND** 重新计算资料完善度
- **AND** 返回更新后的资料

#### Scenario: 查询个人统计

- **WHEN** 用户打开"我的"页
- **THEN** 系统从数据库计算关注数、粉丝数、获赞数、帖子数
- **AND** 返回真实统计数据（非硬编码）

### Requirement: RealFeedbackService反馈完整实现

系统 SHALL 实现反馈功能的完整后端Real服务，替代UnsupportedOperationException。

#### Scenario: 提交反馈

- **WHEN** 用户提交反馈或活动提案
- **THEN** 系统创建Feedback记录
- **AND** 反馈持久化到数据库
- **AND** 返回提交状态和记录ID

#### Scenario: 查询我的反馈

- **WHEN** 用户查看反馈历史
- **THEN** 系统返回该用户的所有反馈记录
- **AND** 包含提交时间、类型、状态、回复内容

#### Scenario: 管理员查看反馈

- **WHEN** 管理员访问反馈管理页
- **THEN** 系统返回所有用户的反馈记录
- **AND** 支持按类型和状态筛选

#### Scenario: 活动提案转正式活动

- **WHEN** 管理员审核通过活动提案
- **THEN** 系统将提案转为正式Activity记录
- **AND** 提案状态更新为"已采纳"
- **AND** 提案者收到通知

### Requirement: chat/chat-session页面路由注册

系统 SHALL 在pages.json中注册chat和chat-session页面，使临时聊天功能可通过路由访问。

#### Scenario: 进入临时聊天

- **WHEN** 用户点击临时聊天入口
- **THEN** 页面正常导航到chat-session页面
- **AND** 不出现页面未注册错误

#### Scenario: 进入聊天列表

- **WHEN** 用户点击消息页的聊天入口
- **THEN** 页面正常导航到chat页面
- **AND** 聊天列表正常展示

### Requirement: chat.ts和session.ts Mock模式支持

系统 SHALL 为chat.ts和session.ts Store添加Mock模式支持，确保Mock环境下功能可用。

#### Scenario: Mock模式聊天

- **WHEN** `VITE_API_MODE=mock`
- **THEN** chat.ts使用本地Mock聊天数据
- **AND** 无需后端服务即可展示聊天界面

#### Scenario: Mock模式会话

- **WHEN** `VITE_API_MODE=mock`
- **THEN** session.ts使用本地Mock会话数据
- **AND** 无需后端服务即可管理会话状态

### Requirement: RealAppConfigService登录页配置实现

系统 SHALL 实现RealAppConfigService.getLoginHeroConfig()方法，返回登录页主视觉配置。

#### Scenario: 获取登录页配置

- **WHEN** 前端请求登录页配置
- **THEN** 系统从数据库或配置中返回主视觉文案和图片
- **AND** 不抛出UnsupportedOperationException

### Requirement: RealRecommendationService查询性能优化

系统 SHALL 优化RealRecommendationService的查询方式，替换findAll()为分页查询。

#### Scenario: 推荐查询性能

- **WHEN** 系统生成推荐列表
- **THEN** 使用分页查询（PageRequest）替代findAll()
- **AND** 排除已喜欢/已有信号的用户
- **AND** 限制查询数量，避免全表扫描

### Requirement: RealVillageService硬编码userId修复

系统 SHALL 修复RealVillageService中Phase 1兼容方法的硬编码userId=1L问题。

#### Scenario: 操作归属正确用户

- **WHEN** 用户执行发帖/点赞/评论/转发操作
- **THEN** 操作归属到当前登录用户（从SecurityContext获取）
- **AND** 不硬编码为userId=1L

## MODIFIED Requirements

### Requirement: 前端视图类型字段补全（原为部分字段缺失）

前端视图类型 SHALL 补全缺失字段，确保前后端数据模型一致。

#### Scenario: HeartSignalView完整字段

- **WHEN** 前端使用HeartSignalView
- **THEN** 包含fromUserName和fromUserAvatar字段
- **AND** 与后端返回数据一致

#### Scenario: PostSummaryView完整字段

- **WHEN** 前端使用PostSummaryView
- **THEN** 包含isLiked、isFollowed、isShared字段
- **AND** 与后端返回数据一致

## REMOVED Requirements

### Requirement: Phase 1兼容方法硬编码用户ID

**Reason**: Real模式下应从JWT token获取当前用户ID，不应硬编码默认用户ID `1L`。
**Migration**: 所有Phase 1兼容方法改为从SecurityContext获取当前用户ID。

---

## 技术架构建议

### 技术栈（沿用+增强）

| 层级 | 当前 | 目标 | 变更 |
|------|------|------|------|
| 前端框架 | uni-app (Vue 3 + Pinia + TS) | 不变 | — |
| 后端框架 | Spring Boot (Java) + Maven | 不变 | — |
| 数据库 | MySQL 8.0 + Flyway | 不变 | — |
| ORM | Spring Data JPA | 不变 | — |
| 实时通信 | Spring WebSocket + STOMP | 不变 | — |
| API契约 | OpenAPI 3.0 (YAML) | 不变 | — |
| 认证 | JWT + 微信code2Session | 不变 | — |

### 系统设计原则

1. **渐进式真实化**：Mock模式保留为开发回退，通过Profile切换mock/real
2. **模块独立**：每个Service独立可测，通过接口解耦
3. **数据共享**：利用现有User/Like/Post模型，新表通过外键关联
4. **双模式兼容**：大学生模式作为独立运营维度，通过campus字段贯穿全链路
5. **社交优先**：所有功能设计以互动为核心，延长停留时间

### 无需新增数据表

所有需要的数据库表已通过24个Flyway迁移脚本创建完毕，包括：
- `user_basic_profile` — 基本资料（含interest_tags JSON字段）
- `user_campus_profile` — 校区资料
- `user_schedule_profile` — 日程资料
- `feedback_tickets` — 反馈工单
- `app_config` — 应用配置

---

## 兼容性策略

### 大学生模式保留

- 学校认证（campus字段）贯穿全链路：推荐→社区→活动→兴趣圈
- 同校优先逻辑在推荐、社区、活动三个模块中均生效
- 校友标签在帖子、卡片、评论中统一展示
- 学校认证状态作为资料完善度的硬门槛之一
- 同校圈作为村口"同城"标签的子功能

### 线下活动功能保留

- 活动列表+详情+报名完整保留
- 活动日历视图保留
- 活动作为寻觅页卡片用完后的替代入口
- 校园活动与同校圈联动

### 推荐方案设置保留

- 推荐时间偏好（影响每日刷新时间点）
- 推荐范围选择（同校优先/同城/不限）
- 偏好持久化到数据库
- 前端完整设置页面

### Mock模式兼容

- `VITE_API_MODE=mock` 保留为开发环境回退
- 后端`@Profile("mock")` 保留Mock实现用于测试
- 生产环境使用`@Profile("db")` 加载真实数据源
- chat.ts和session.ts需补全Mock模式支持

---

## 测试方法论

### 测试类型

| 类型 | 范围 | 工具 | 验收标准 |
|------|------|------|----------|
| 单元测试 | Service层业务逻辑 | JUnit + Mockito | 覆盖率≥80% |
| 集成测试 | API端到端 | Spring Boot Test | 所有API 200响应 |
| 前端单元测试 | Store/Component | Vitest | 覆盖率≥70% |
| 契约测试 | 前后端数据模型 | OpenAPI Validator | Schema一致性100% |
| 回归测试 | 已有功能 | 手动+自动 | 零回归缺陷 |
| Mock/Real双模式测试 | 双模式切换 | 手动验证 | 两种模式均可用 |

### 关键验收标准

1. Real模式下资料编辑完整可用（基本资料/校区资料/日程资料/个人统计）
2. Real模式下反馈功能完整可用（提交/查询/管理/提案转换）
3. chat/chat-session页面可通过路由正常访问
4. chat.ts和session.ts在Mock模式下正常工作
5. RealAppConfigService.getLoginHeroConfig()不抛异常
6. RealRecommendationService使用分页查询
7. RealVillageService操作归属正确用户
8. 大学生模式全链路生效
9. 无游戏化元素和购物功能
10. 所有已有功能零回归

---

## 开发时间线及资源分配

### 阶段规划

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Phase 1 | P0致命：RealProfileService 7个方法实现 | M1: 资料编辑Real可用 |
| Phase 2 | P0阻塞：RealFeedbackService + 页面路由修复 | M2: 反馈+聊天路由可用 |
| Phase 3 | P1核心：Store Mock模式 + RealAppConfigService | M3: 全Store双模式可用 |
| Phase 4 | P1性能质量：推荐优化 + 硬编码修复 + 视图字段补全 | M4: 性能和质量提升 |
| Phase 5 | P2清理 + 全链路验证 + 回归测试 | M5: 全部验收通过 |

### 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1 | RealProfileService+RealFeedbackService+RealAppConfigService+推荐优化+硬编码修复 |
| 前端开发 | 1 | 页面路由注册+Store Mock模式+视图类型补全+联调验证 |
| 全栈/联调 | 1 | 前后端联调+集成测试+回归验证 |
