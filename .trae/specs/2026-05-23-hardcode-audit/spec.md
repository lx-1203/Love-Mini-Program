# 硬编码全面审计与消除方案 Spec

## Why

项目在快速MVP阶段积累了大量硬编码数据，包括：前端Store中大量Mock假数据、后端Service中硬编码的默认用户ID和业务参数、Controller中硬编码的默认参数值、前端页面中写死的展示文本、以及后端已有端点但前端未调用的功能缺失。这些问题导致：Real模式下部分功能不可用、数据越权风险、配置无法动态调整、前后端数据模型不一致。

## What Changes

### P0 必须修复（14项）

**后端缺失API端点（6项）：**
- 新增 `POST /api/matches/pass` — 左滑(不感兴趣)后端同步
- 新增 `POST /api/matches/rewind` — 反悔操作后端同步
- 新增 `GET /api/matches/my-likes` — "我喜欢的"列表查询
- 新增 `PUT /api/matches/visitors/{id}/read` — 访客标记已读
- 新增 `GET /api/posts/categories` — 帖子分类列表
- 新增 `PUT /api/messages/conversations/{id}/pin` — 私信会话置顶

**后端硬编码默认用户ID（4项）：**
- RealProfileService `CURRENT_USER_ID = 1L` → 从SecurityContext获取
- RealFeedbackService `CURRENT_USER_ID = 1L` → 从SecurityContext获取
- RealVillageService `DEFAULT_USER_ID = 1L` → 从SecurityContext获取
- RealTempChatService `resolveCurrentUserId() return 1L` → 从SecurityContext获取

**Controller硬编码默认参数（9项）：**
- NotificationController `defaultValue = "1"` (2处) → 从JWT解析
- PrivateMessageController `defaultValue = "1"` (3处) → 从JWT解析
- VillageController `defaultValue = "1"` (4处) → 从JWT解析

**安全敏感硬编码（1项）：**
- JwtConfig `secret = "campus-love-default-secret-key-change-in-production"` → 必须环境变量注入

**前端硬编码数据（2项）：**
- `likes.ts` `createHeartSignalForMutualLike` toUserId硬编码"user-1001" → 从session获取
- `discover/index.vue` 每日一问话题文本硬编码 → 从daily-question store获取

### P1 应该修复（约42项）

**后端配置值外移至application.yml（约10项）：**
- 推荐权重系数(+50/+20/+10/+15) → 配置化
- 每日推荐上限(DAILY_LIMIT=10) → 配置化
- 心动信号过期时间(48h) → 配置化
- 临时会话过期时间(24h) → 配置化
- 签到奖励配额(3) → 配置化
- 候选用户分页大小(200) → 配置化
- 匹配候选分页大小(50) → 配置化
- JWT过期时间(24h) → 配置化
- CORS允许源 → 配置化
- 默认聊天时长(20min) → 配置化

**后端视图字段补全（7项）：**
- RecommendedPersonView 添加 bio/images 字段
- HeartSignalView 添加 fromUserName/fromUserAvatar 字段
- ConversationView 添加 headline/pinned/phase/sessionType 字段
- CircleView 添加 topicCount 字段
- DailyQuestionView 添加 category/answerCount 字段
- DailyAnswerView 添加 avatarUrl 字段
- UserSessionView 添加 profileFieldStatus 细粒度字段

**前端未调用已有后端端点（10项）：**
- 推荐历史 `GET /api/recommendations/history` → discover.ts应调用
- 帖子详情 `GET /api/posts/{id}` → village.ts应调用
- 活动详情 `GET /api/activities/{id}` → 新建活动详情页
- 活动取消报名 `DELETE /api/activities/{id}/enroll` → activity.ts应调用
- 兴趣圈精选话题 `GET /api/circles/featured` → circle.ts应调用
- 标记全部通知已读 `PUT /api/notifications/read-all` → messages.ts应调用
- 拒绝心动信号 `POST /api/matches/heart-signals/{id}/decline` → likes.ts应实现
- 访客记录写入 `POST /api/matches/visit` → 查看他人主页时调用
- 粉丝/关注列表 `GET /api/users/{id}/followers` → 新建页面
- 关注状态查询 `GET /api/users/{id}/is-following` → village.ts应调用

**后端文案统一管理（约15项）：**
- "未知用户" 散落在6+文件 → 统一为常量
- "新用户" 默认昵称 → 统一为常量
- "匿名用户" 显示名 → 统一为常量
- 通知摘要文本(6条) → i18n key
- 破冰提示文本(9条) → 数据库或i18n
- 登录页配置文案 → 数据库或配置中心
- 首页仪表盘文案 → 数据库或配置
- 默认推荐偏好值 → 配置
- feature flag → 配置中心

### P2 可以优化（约33项）

- Mock假数据移至JSON资源文件（24项）
- 实体JSON列添加默认值"[]"（8项）
- 前端配置常量外移（MAX_CONTENT_LENGTH=500等）（若干项）

## Impact

- Affected specs: 所有之前的spec均涉及
- Affected code:
  - 后端：所有Controller、所有Real Service、JwtConfig、WebConfig
  - 前端：所有Store（12个）、所有页面、config目录、services/mocks目录
  - 数据库：新增2-3张表（pass_records、rewind_records）

## ADDED Requirements

### Requirement: 后端缺失API端点补全

系统 SHALL 提供以下缺失的后端API端点，确保前端所有展示功能有后端数据支撑。

#### Scenario: 左滑(不感兴趣)同步到后端
- **WHEN** 用户在寻觅页左滑拒绝推荐卡片
- **THEN** 系统调用 `POST /api/matches/pass` 记录拒绝行为
- **AND** 后续推荐算法排除已拒绝用户

#### Scenario: 反悔操作持久化
- **WHEN** 用户执行反悔操作恢复上一个拒绝的推荐
- **THEN** 系统调用 `POST /api/matches/rewind` 持久化反悔
- **AND** 每日反悔次数限制为1次

#### Scenario: "我喜欢的"列表查询
- **WHEN** 用户切换到"我喜欢的"Tab
- **THEN** 系统调用 `GET /api/matches/my-likes` 返回我喜欢的用户列表
- **AND** 列表不为空（Real模式下）

#### Scenario: 访客标记已读
- **WHEN** 用户查看访客记录
- **THEN** 系统调用 `PUT /api/matches/visitors/{id}/read` 标记已读
- **AND** 访客的isNew状态同步到后端

#### Scenario: 帖子分类列表
- **WHEN** 用户打开村口页或发帖页
- **THEN** 系统调用 `GET /api/posts/categories` 返回分类列表
- **AND** 分类列表从数据库动态获取，非硬编码

#### Scenario: 私信会话置顶
- **WHEN** 用户长按私信会话选择置顶
- **THEN** 系统调用 `PUT /api/messages/conversations/{id}/pin` 持久化置顶状态
- **AND** 刷新后置顶状态保持

### Requirement: 后端默认用户ID消除

系统 SHALL 从Spring Security SecurityContext获取当前用户ID，消除所有硬编码的默认用户ID。

#### Scenario: 所有操作归属当前登录用户
- **WHEN** 用户执行任何需要身份认证的操作
- **THEN** 系统从JWT token解析当前用户ID
- **AND** 不使用任何硬编码的默认用户ID（1L、1001L等）
- **AND** 未认证请求返回401而非使用默认用户

### Requirement: 后端配置值外移

系统 SHALL 将所有硬编码的业务配置值外移至application.yml，支持运行时调整。

#### Scenario: 推荐权重可配置
- **WHEN** 管理员需要调整推荐算法权重
- **THEN** 修改application.yml中的配置即可生效
- **AND** 无需重新编译代码

### Requirement: 后端视图字段补全

系统 SHALL 补全所有后端视图类型中前端需要的缺失字段，消除前端映射时写死默认值。

#### Scenario: 推荐卡片包含完整信息
- **WHEN** 前端请求推荐人物列表
- **THEN** 后端返回包含bio和images字段的完整数据
- **AND** 前端无需写死空字符串或空数组

### Requirement: 前端未调用端点补全

系统 SHALL 在前端Store中补全所有已有后端端点的调用，消除"后端有但前端不用"的浪费。

#### Scenario: 推荐历史从后端获取
- **WHEN** 用户查看推荐历史
- **THEN** 前端调用 `GET /api/recommendations/history` 获取数据
- **AND** 不依赖localStorage

## MODIFIED Requirements

### Requirement: JWT认证集成（原为Phase 1兼容模式）

所有Controller和Service SHALL 从JWT token获取当前用户ID，不再接受userId作为请求参数（除非是管理员操作）。

## REMOVED Requirements

### Requirement: Phase 1兼容方法中的硬编码用户ID

**Reason**: JWT认证已集成，应从SecurityContext获取当前用户ID。
**Migration**: 所有Phase 1兼容方法改为从SecurityContext获取，Controller移除defaultValue="1"参数。
