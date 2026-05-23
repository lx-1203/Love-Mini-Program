# 参考内容全面分析与重构方案 Spec

## Why

基于对参考目录（`D:\6\恋爱小程序\参考`）中11张竞品"青藤"微信截图的深度分析，结合对当前项目代码库的全面审查，发现项目虽经多期重构（`2026-05-21-reconstruct-social-app`、`2026-05-22-audit-gap-fill`、`2026-05-22-social-enhancement-phase3`、`2026-05-22-refactor-comprehensive`），前端UI和Mock数据链路已基本完整，但存在以下核心问题：

1. **后端Real层关键Service未完整实现**：RealAuthService仍用内存Map（未接入UserRepository），RealMatchService返回硬编码结果，RealRecommendationService多处抛UnsupportedOperationException
2. **Real模式下登录后profileCompleted等字段全为false**：导致LockScreen始终显示，用户无法进入主功能——这是Real模式的**致命阻塞**
3. **前端Store尚未切换到Real API**：所有Store默认运行在Mock模式，前端WebSocket客户端未集成
4. **两套pages.json不一致**：根目录版本缺少circles和daily-question页面注册
5. **个人中心统计数据硬编码**：关注/粉丝/获赞数字固定，bio使用占位文案
6. **关注功能不完整**：后端缺少关注关系表，前端followUser按postId而非userId操作

本次方案的核心目标：**从"前端完整+后端Mock驱动"升级为"全栈真实数据驱动+完整社交闭环"**，精准还原参考产品的核心功能体验，保留大学生模式的独特性，集成在线社交互动功能，确保推荐方案设置完整可用。

**特别约束**：严禁任何游戏化元素（积分/等级/排行榜/成就徽章等）和购物相关功能（商城/付费/虚拟物品等）。项目北极星指标：**提升用户引流效果 + 延长客户停留时间**。

---

## 参考内容详细功能分析

### 一、参考产品（青藤）功能模块矩阵

基于11张微信截图的深度分析，参考产品的完整功能矩阵如下：

| 模块 | 子功能 | 交互方式 | 用户场景 |
|------|--------|----------|----------|
| **寻觅** | 全屏卡片滑动推荐 | 左滑拒绝/右滑喜欢/上滑超级喜欢 | 浏览潜在匹配对象 |
| | 每日限量推荐 | 定时刷新（中午12点） | 制造稀缺感，促回流 |
| | 推荐卡片详情 | 点击展开完整资料 | 深入了解对方 |
| | 挽回/回看 | 每日1次挽回最后拒绝 | 后悔机制 |
| | 底部村口动态流 | 嵌入式帖子预览 | 增加停留时间 |
| **喜欢** | 喜欢我的列表 | 横向头像列表+纵向详情 | 查看谁喜欢了我 |
| | 访客记录 | 横向头像列表+时间 | 查看谁看了我 |
| | 互相喜欢→心动信号 | 自动触发+倒计时 | 双向匹配确认 |
| | 资料未完善锁定 | 模糊头像+引导完善 | 强制完善资料 |
| **村口** | 三标签切换 | 关注/同城/发现 | 内容分类浏览 |
| | 六分类筛选 | 全部/兴趣圈/诚意帖/同乡/蒙面/最新 | 精准内容发现 |
| | 帖子发布 | 文字+图片+话题标签+分类 | UGC内容创作 |
| | 帖子互动 | 点赞/评论/关注/私信/转发 | 社交互动 |
| | 帖子详情 | 作者卡片+评论列表+互动 | 深度内容消费 |
| | 悬浮发帖按钮 | FAB按钮 | 快速发帖入口 |
| **消息** | 心动信号Banner | 匹配摘要+倒计时+直接开聊 | 匹配后即时沟通 |
| | 私信列表 | 会话列表+未读标记 | 管理对话 |
| | 系统通知 | 分类图标+跳转链接 | 了解互动动态 |
| | 临时匿名聊天 | 24h过期+倒计时 | 低压力交流 |
| **我的** | 个人信息展示 | 头像+昵称+学校+统计 | 自我展示 |
| | 资料完善度 | 进度条+百分比 | 引导完善资料 |
| | 功能菜单 | 编辑资料/推荐计划/兴趣圈/反馈/设置 | 功能入口集合 |
| | 推荐计划设置 | 时间偏好+范围选择 | 个性化推荐配置 |
| **门槛** | 资料完善硬门禁 | 锁定核心功能 | 保证用户质量 |
| | 学校认证 | 学生证+学号+审核 | 大学生身份验证 |

### 二、交互流程分析

#### 核心用户旅程

```
微信登录 → 学校认证 → 资料完善 → 解锁全部功能
    ↓
寻觅页浏览推荐卡片 → 左滑拒绝/右滑喜欢
    ↓
双向喜欢 → 触发心动信号 → 倒计时内开聊
    ↓
私信对话 → 村口社区互动 → 活动报名参与
    ↓
每日推荐刷新 → 消息通知 → 社区动态更新 → 签到回流
```

#### 关键交互细节

1. **卡片滑动**：全屏沉浸式，手势流畅，飞出动画自然
2. **心动信号**：双向喜欢后自动触发，24h倒计时制造紧迫感
3. **村口发帖**：悬浮FAB按钮，随时可发，降低创作门槛
4. **私信入口**：多个触点（喜欢页/帖子详情/心动信号/兴趣圈），缩短社交距离
5. **时间门控**：每日中午12点刷新推荐，制造期待感和回流动力

### 三、用户场景分析

| 场景 | 用户需求 | 参考产品支持 | 当前项目支持 | 差距 |
|------|----------|-------------|-------------|------|
| 快速浏览 | 发现潜在匹配对象 | ✅ 卡片滑动 | ✅ CardSwiper | 无 |
| 双向确认 | 确认互相喜欢 | ✅ 心动信号 | ✅ Mock实现 | Real后端需修复 |
| 社区浏览 | 查看他人动态 | ✅ 村口广场 | ✅ Mock实现 | Real后端可用 |
| 内容创作 | 表达自己、吸引关注 | ✅ 发帖+分类 | ✅ Mock实现 | Real后端可用 |
| 一对一交流 | 深入对话 | ✅ 私信+临时聊天 | ✅ Mock实现 | Real后端可用 |
| 活动参与 | 线下见面 | ✅ 活动列表+报名 | ⚠️ Mock可用 | Real后端抛异常 |
| 日常回流 | 保持活跃 | ✅ 签到+推荐刷新 | ✅ Mock实现 | Real后端可用 |
| 话题互动 | 兴趣讨论 | ✅ 兴趣圈+每日一问 | ✅ Mock实现 | Real后端可用 |
| 个性化推荐 | 定制推荐规则 | ✅ 推荐计划设置 | ✅ Mock实现 | Real后端可用 |
| 实时沟通 | 即时消息 | ✅ WebSocket | ❌ 前端未集成 | 需前端WebSocket |

---

## 当前功能 vs 目标功能对比评估

### 差异点详细矩阵

| 维度 | 当前代码实际状态 | 目标状态 | 差距类型 | 改进方向 |
|------|-----------------|---------|----------|----------|
| **认证服务** | RealAuthService用内存Map，profileCompleted硬编码false | UserRepository+真实字段计算 | **P0阻塞** | 重写RealAuthService |
| **匹配创建** | RealMatchService返回硬编码结果 | 真实匹配逻辑+数据库 | **P0阻塞** | 重写匹配创建 |
| **活动报名/详情** | RealRecommendationService抛UnsupportedOperationException | 真实CRUD | **P0阻塞** | 实现活动Service |
| **推荐服务** | 讨论推荐空列表，标签匹配未实现 | 完整推荐逻辑 | **P1核心** | 补全推荐逻辑 |
| **前端Store** | 全部默认Mock模式 | Real模式可用 | **P1核心** | 切换+验证 |
| **前端WebSocket** | 未集成 | 实时消息推送 | **P1核心** | 集成WebSocket客户端 |
| **pages.json** | 两套不一致 | 统一一份 | **P1质量** | 对齐合并 |
| **个人中心统计** | 硬编码数字 | 真实API数据 | **P2增强** | 对接后端统计 |
| **关注功能** | 缺关注关系表，按postId操作 | 关注关系表+按userId | **P2增强** | 新建表+重写逻辑 |
| **Village分页** | 未实现 | 分页加载 | **P3清理** | 实现分页 |

### 当前项目功能实现状态总览

| 功能模块 | 前端页面 | 前端Store | 后端Mock | 后端Real | 端到端可用(Real) |
|----------|----------|-----------|----------|----------|-----------------|
| 微信登录 | ✅完整 | ✅完整 | ✅完整 | ❌内存Map | 仅Mock |
| 资料编辑 | ✅完整 | ✅完整 | ✅完整 | ⚠️存在 | 待验证 |
| 寻觅(卡片推荐) | ✅完整 | ✅完整 | ✅完整 | ⚠️部分 | 仅Mock |
| 喜欢/访客 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 心动信号 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 村口(帖子社区) | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 私信 | ✅完整 | ✅完整 | ⚠️空列表 | ✅完整 | Real可用 |
| 临时聊天 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 系统通知 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 签到 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 每日一问 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 兴趣圈 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 活动 | ✅完整 | ✅完整 | ✅完整 | ❌抛异常 | 仅Mock |
| 反馈中心 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |
| 匹配 | ✅完整 | ✅完整 | ✅完整 | ❌硬编码 | 仅Mock |
| 推荐计划设置 | ✅完整 | ✅完整 | ✅完整 | ✅完整 | Real可用 |

---

## What Changes

### 一级：P0阻塞项修复（Real模式致命问题）

- 重写 `RealAuthService`：接入UserRepository，从数据库查找/创建用户，计算profileCompleted/campusVerified/scheduleCompleted
- 重写 `RealMatchService` 匹配创建逻辑：实现真实匹配创建，返回数据库记录
- 实现 `RealRecommendationService` 活动报名和详情：替换UnsupportedOperationException为真实数据库操作
- 补全 `RealRecommendationService` 讨论推荐：实现讨论内容推荐逻辑

### 二级：P1核心项（前端切换Real模式）

- 统一pages.json：合并两套pages.json为一份，包含所有页面注册
- 前端Store切换到Real API：验证所有Store在Real模式下正常工作
- 前端WebSocket客户端集成：uni-app兼容方案，实现私信和通知实时推送
- 补全推荐服务标签匹配逻辑：基于UserBasicProfile的tags字段实现兴趣匹配

### 三级：P2增强项（功能完善）

- 个人中心统计数据真实化：关注/粉丝/获赞从后端API获取
- 新建关注关系表+重写关注逻辑：实现按userId的关注/取关/获取关注列表
- 个人简介(bio)从后端API获取：替换硬编码占位文案

### 四级：P3清理项（代码质量）

- Village Store分页实现
- appVersion动态获取
- 清理两套pages.json中的冗余

---

## Impact

- Affected specs: `2026-05-22-refactor-comprehensive`（后端Real层未完成部分）、`2026-05-22-social-enhancement-phase3`（前端WebSocket未集成）
- Affected code:
  - `apps/api/.../auth/RealAuthService.java` — 重写，接入UserRepository
  - `apps/api/.../match/RealMatchService.java` — 重写匹配创建逻辑
  - `apps/api/.../discover/RealRecommendationService.java` — 补全活动报名/详情/讨论推荐
  - `apps/client/pages.json` — 统一页面注册
  - `apps/client/src/services/websocket.ts` — 前端WebSocket客户端
  - `apps/client/src/stores/*.ts` — Real模式验证
  - `apps/client/src/pages/profile/index.vue` — 统计数据真实化
  - `database/flyway/sql/` — 新增关注关系表迁移脚本

---

## ADDED Requirements

### Requirement: RealAuthService数据库集成

系统 SHALL 将RealAuthService从内存Map切换为UserRepository数据库操作，确保Real模式下用户数据持久化且profileCompleted等字段正确计算。

#### Scenario: 微信登录创建新用户

- **WHEN** 用户首次微信登录
- **THEN** 系统通过UserRepository创建新用户记录
- **AND** 返回有效JWT token
- **AND** profileCompleted基于用户资料字段动态计算

#### Scenario: 微信登录查找已有用户

- **WHEN** 已注册用户微信登录
- **THEN** 系统通过UserRepository查找用户
- **AND** profileCompleted/campusVerified/scheduleCompleted基于数据库字段计算
- **AND** 服务重启后用户数据不丢失

### Requirement: RealMatchService真实匹配创建

系统 SHALL 实现真实的匹配创建逻辑，替代硬编码结果。

#### Scenario: 创建匹配

- **WHEN** 用户发起匹配请求
- **THEN** 系统基于推荐算法创建匹配记录
- **AND** 匹配结果持久化到数据库
- **AND** 返回真实匹配对象信息

### Requirement: 活动报名和详情真实实现

系统 SHALL 实现活动报名和详情的真实数据库操作，替代UnsupportedOperationException。

#### Scenario: 活动报名

- **WHEN** 用户点击"感兴趣"报名活动
- **THEN** 系统创建ActivityEnrollment记录
- **AND** 报名人数实时更新
- **AND** 不抛出UnsupportedOperationException

#### Scenario: 活动详情

- **WHEN** 用户查看活动详情
- **THEN** 系统从数据库获取完整活动信息
- **AND** 包含描述、报名人数、参与者预览

### Requirement: 前端WebSocket客户端集成

系统 SHALL 在前端集成WebSocket客户端，实现私信和通知的实时推送。

#### Scenario: 私信实时推送

- **WHEN** 用户收到新私信
- **THEN** 通过WebSocket实时推送到前端
- **AND** 消息页TabBar显示未读红点
- **AND** 会话列表实时更新

#### Scenario: 通知实时推送

- **WHEN** 用户收到新通知（喜欢/访客/评论等）
- **THEN** 通过WebSocket实时推送到前端
- **AND** 系统通知列表实时更新

### Requirement: pages.json统一

系统 SHALL 合并两套pages.json为一份统一的配置，包含所有页面注册。

#### Scenario: 页面访问

- **WHEN** 用户导航到circles或daily-question页面
- **THEN** 页面正常加载
- **AND** 不出现页面未注册错误

### Requirement: 关注关系系统

系统 SHALL 实现完整的关注关系功能，包括关注关系表和按userId的关注操作。

#### Scenario: 关注用户

- **WHEN** 用户点击帖子详情页的"关注"按钮
- **THEN** 系统创建关注关系记录（follower_id → following_id）
- **AND** 被关注者收到通知
- **AND** 关注者可在村口"关注"标签看到被关注者的帖子

#### Scenario: 获取关注列表帖子

- **WHEN** 用户切换到村口"关注"标签
- **THEN** 系统返回已关注用户的帖子列表
- **AND** 不返回所有帖子

### Requirement: 个人中心统计数据真实化

系统 SHALL 将个人中心的关注/粉丝/获赞统计从硬编码切换为后端API获取。

#### Scenario: 查看个人统计

- **WHEN** 用户打开"我的"页
- **THEN** 关注数/粉丝数/获赞数从后端API获取
- **AND** 个人简介从后端API获取
- **AND** 不显示硬编码数字

## MODIFIED Requirements

### Requirement: 前端Store Real模式验证（原为Store切换）

所有前端Store SHALL 在Real模式下经过完整验证，确保API调用、数据格式、错误处理均正常工作。

#### Scenario: Real模式全链路

- **WHEN** `VITE_API_MODE=real` 且后端运行在`db` Profile
- **THEN** 所有Store调用真实后端API
- **AND** 数据从数据库获取
- **AND** 错误处理正常（网络错误/业务错误/鉴权失败）

## REMOVED Requirements

### Requirement: MockRuntimeState（生产环境）

**Reason**: 后端Real层完整后，生产环境不再需要MockRuntimeState。
**Migration**: 保留为`@Profile("mock")`下的开发/测试工具，生产环境不加载。

---

## 技术架构建议

### 技术栈（沿用+增强）

| 层级 | 当前 | 目标 | 变更 |
|------|------|------|------|
| 前端框架 | uni-app (Vue 3 + Pinia + TS) | 不变 | — |
| 后端框架 | Spring Boot (Java) + Maven | 不变 | — |
| 数据库 | MySQL 8.0 + Flyway（已配置） | 不变 | — |
| ORM | Spring Data JPA（已集成） | 不变 | — |
| 实时通信 | 后端WebSocket已配置 | 前端WebSocket客户端集成 | **需完成** |
| API契约 | OpenAPI 3.0 (YAML) | 不变 | — |
| 认证 | JWT（已实现） | 不变 | — |

### 系统设计原则

1. **渐进式真实化**：Mock模式保留为开发回退，通过Profile切换mock/real
2. **模块独立**：每个Service独立可测，通过接口解耦
3. **数据共享**：利用现有User/Like/Post模型，新表通过外键关联
4. **双模式兼容**：大学生模式作为独立运营维度，通过campus字段贯穿全链路

### 新增数据表

- `user_follows` — 用户关注关系表（follower_id, following_id, created_at）

---

## 兼容性策略

### 大学生模式保留

- 学校认证（campus字段）贯穿全链路：推荐→社区→活动→兴趣圈
- 同校优先逻辑在推荐、社区、活动三个模块中均生效
- 校友标签在帖子、卡片、评论中统一展示
- 学校认证状态作为资料完善度的硬门槛之一

### 线下活动功能保留

- 活动列表+详情+报名完整保留
- 活动日历视图保留
- 活动作为寻觅页卡片用完后的替代入口

### 推荐方案设置保留

- 推荐时间偏好（影响每日刷新时间点）
- 推荐范围选择（同校优先/同城/不限）
- 偏好持久化到数据库
- 前端完整设置页面

### Mock模式兼容

- `VITE_API_MODE=mock` 保留为开发环境回退
- 后端`@Profile("mock")` 保留Mock实现用于测试
- 生产环境使用`@Profile("db")` 加载真实数据源

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

1. Real模式下微信登录创建/查找用户正常（非内存Map）
2. Real模式下profileCompleted基于数据库字段正确计算
3. Real模式下匹配创建返回真实数据（非硬编码）
4. Real模式下活动报名/详情不抛异常
5. 前端WebSocket客户端集成，私信和通知实时送达
6. 所有Store在Real模式下正常工作
7. pages.json统一，所有页面可正常访问
8. 关注关系按userId操作，村口"关注"标签返回关注用户帖子
9. 个人中心统计数据来自API（非硬编码）
10. 大学生模式全链路生效
11. 无游戏化元素和购物功能

---

## 开发时间线及资源分配

### 阶段规划

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Phase 1 | P0阻塞修复（RealAuthService+RealMatchService+活动Service） | M1: Real模式可登录+匹配+活动 |
| Phase 2 | P1核心（pages.json统一+Store Real验证+WebSocket前端+推荐补全） | M2: Real模式全链路可用 |
| Phase 3 | P2增强（关注关系+个人中心统计真实化） | M3: 功能完善 |
| Phase 4 | P3清理+全链路验证+回归测试 | M4: 全部验收通过 |

### 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1 | RealAuthService重写+匹配逻辑+活动Service补全 |
| 前端开发 | 1 | WebSocket集成+Store验证+页面修复 |
| 全栈/联调 | 1 | pages.json统一+关注关系+联调测试 |
