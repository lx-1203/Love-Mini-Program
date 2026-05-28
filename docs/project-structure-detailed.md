# 校园恋爱小程序 —— 项目结构 & 功能设计文档

> 项目名称: Campus Love (校园恋爱)
> 技术栈: 前端 uni-app (Vue3 + TypeScript) / 后端 Spring Boot (Java) / 数据库 MySQL (Flyway迁移)
> 架构模式: Mock/Real 双运行时模式

---

## 一、整体项目结构

```
campus-love-monorepo/
├── apps/                          # 应用模块
│   ├── api/                       # Spring Boot 后端 API
│   ├── client/                    # uni-app 前端 (微信小程序/H5)
│   └── admin/                     # 后台管理 (预留)
├── database/                      # 数据库
│   └── flyway/                    # Flyway 数据库迁移
├── docs/                          # 文档
│   ├── openapi/                   # OpenAPI 契约文件
│   └── superpowers/               # 架构设计文档
├── design-system/                 # 设计系统组件
├── design-preview/                # 设计预览
├── design-archive/                # 设计归档
├── tools/                         # 工具脚本
├── tests/                         # 集成/结构测试
├── 参考/                          # UI 参考截图
├── .trae/                         # .trae 工作区配置
│   └── specs/                     # 审计/重构规范
└── 根文件: index.html, styles.css, script.js  # 早期原型
```

---

## 二、apps/api —— 后端 API (Spring Boot)

**包路径**: `com.campuslove.api`

### 2.1 分层架构

```
com.campuslove.api/
├── CampusLoveApplication.java      # 应用入口
│
├── config/                         # 配置层
│   ├── ChatConfig.java             # 聊天配置 (session过期时长等)
│   ├── CheckInConfig.java          # 签到配置
│   ├── DisplayConstants.java       # 显示常量
│   ├── JwtConfig.java              # JWT 配置
│   ├── JwtTokenProvider.java       # JWT Token 提供者 (生成/验证)
│   ├── MatchConfig.java            # 匹配配置 (权重/过期时间等)
│   ├── RecommendationConfig.java   # 推荐配置 (每日限额/权重)
│   ├── SecurityUtils.java          # 安全工具类
│   ├── WeChatConfig.java           # 微信登录配置
│   ├── WebConfig.java              # Web MVC 配置
│   └── WebSocketConfig.java        # WebSocket 配置
│
├── auth/                           # 认证模块
│   ├── AuthController.java         # 登录/注册 REST API
│   ├── AuthService.java            # 认证服务接口
│   ├── RealAuthService.java        # 真实实现(微信登录)
│   ├── MockAuthService.java        # Mock 实现(开发用)
│   ├── UserSessionView.java        # 会话视图对象
│   └── WeChatClient.java           # 微信 API 客户端
│
├── profile/                        # 用户资料模块
│   ├── ProfileController.java      # 资料 REST API
│   ├── ProfileService.java         # 资料服务接口
│   ├── RealProfileService.java     # 真实实现
│   └── MockProfileService.java     # Mock 实现
│
├── home/                           # 首页模块
│   ├── HomeController.java         # 首页聚合 REST API
│   ├── HomeService.java            # 首页服务接口
│   ├── RealHomeService.java        # 真实实现(聚合推荐/签到/AI计划)
│   └── MockHomeService.java        # Mock 实现
│
├── discover/                       # 发现模块
│   ├── RecommendationController.java  # 推荐 REST API
│   ├── RecommendationService.java     # 推荐服务接口
│   ├── RealRecommendationService.java # 真实实现(基于权重的推荐)
│   ├── MockRecommendationService.java # Mock 实现
│   ├── RecommendedPersonView.java     # 推荐人选视图
│   ├── ActivityController.java        # 活动 REST API
│   ├── ActivityService.java           # 活动服务接口
│   ├── RealActivityService.java       # 真实实现
│   ├── MockActivityService.java       # Mock 实现
│   ├── ActivityView.java              # 活动列表视图
│   ├── ActivityDetailView.java        # 活动详情视图
│   ├── ActivityEnrollmentResultView.java # 活动报名结果
│   ├── DailyQuestionController.java   # 每日一问 REST API
│   ├── DailyQuestionService.java      # 每日一问服务接口
│   ├── RealDailyQuestionService.java  # 真实实现
│   ├── MockDailyQuestionService.java  # Mock 实现
│   ├── DailyQuestionView.java         # 问题视图
│   ├── DailyAnswerView.java           # 答案视图
│   ├── CircleController.java          # 兴趣圈 REST API
│   ├── CircleService.java             # 兴趣圈服务接口
│   ├── RealCircleService.java         # 真实实现
│   └── MockCircleService.java         # Mock 实现
│
├── match/                          # 匹配模块
│   ├── MatchController.java        # 匹配 REST API
│   ├── MatchService.java           # 匹配服务接口
│   ├── RealMatchService.java       # 真实实现(心跳信号匹配)
│   ├── MockMatchService.java       # Mock 实现
│   ├── HeartSignalView.java        # 心跳信号视图
│   ├── LikedUserView.java          # 喜欢过的人视图
│   ├── VisitorView.java            # 访客视图
│   ├── RewindResultView.java       # 后悔/撤销结果
│   ├── IcebreakerService.java      # 破冰话题服务接口
│   ├── RealIcebreakerService.java  # 真实实现
│   ├── MockIcebreakerService.java  # Mock 实现
│   └── IcebreakerView.java         # 破冰话题视图
│
├── chat/                           # 聊天模块
│   ├── ChatController.java         # 聊天 REST API
│   ├── TempChatController.java     # 临时聊天 REST API
│   ├── TempChatService.java        # 临时聊天服务接口
│   ├── RealTempChatService.java    # 真实实现
│   ├── MockTempChatService.java    # Mock 实现
│   ├── PrivateMessageController.java  # 私信 REST API
│   ├── PrivateMessageService.java     # 私信服务接口
│   ├── RealPrivateMessageService.java # 真实实现
│   ├── MockPrivateMessageService.java # Mock 实现
│   ├── ConversationView.java          # 会话视图
│   ├── MessageView.java               # 消息视图
│   ├── MessageWebSocketHandler.java   # WebSocket 消息处理器
│   ├── NotificationController.java    # 通知 REST API
│   ├── NotificationService.java       # 通知服务接口
│   ├── RealNotificationService.java   # 真实实现
│   ├── MockNotificationService.java   # Mock 实现
│   ├── InteractionEventController.java # 互动事件 REST API
│   ├── InteractionEventService.java    # 互动事件服务接口
│   ├── RealInteractionEventService.java # 真实实现
│   ├── MockInteractionEventService.java # Mock 实现
│   └── InteractionEventView.java       # 互动事件视图
│
├── village/                        # 村口(社区)模块
│   ├── VillageController.java      # 社区 REST API
│   ├── VillageService.java         # 社区服务接口
│   ├── RealVillageService.java     # 真实实现
│   └── MockVillageService.java     # Mock 实现
│
├── feedback/                       # 反馈模块
│   ├── FeedbackController.java     # 反馈 REST API
│   ├── FeedbackService.java        # 反馈服务接口
│   ├── RealFeedbackService.java    # 真实实现
│   ├── MockFeedbackService.java    # Mock 实现
│   ├── FeedbackSubmissionRequest.java # 提交请求 DTO
│   ├── FeedbackTicketType.java     # 工单类型枚举
│   ├── SubmissionRecordView.java   # 提交记录视图
│   └── SubmissionStatus.java       # 提交状态枚举
│
├── growth/                         # 成长模块
│   ├── CheckInController.java      # 签到 REST API
│   ├── CheckInService.java         # 签到服务接口
│   ├── RealCheckInService.java     # 真实实现
│   ├── MockCheckInService.java     # Mock 实现
│   ├── CheckInResultView.java      # 签到结果视图
│   ├── CheckInStatusView.java      # 签到状态视图
│   ├── AppConfigController.java    # 应用配置 REST API
│   ├── AppConfigService.java       # 应用配置服务
│   ├── RealAppConfigService.java   # 真实实现
│   ├── MockAppConfigService.java   # Mock 实现
│   └── LoginHeroConfigView.java    # 登录页配置视图
│
├── user/                           # 用户模块
│   ├── UserController.java         # 通用用户 REST API
│   ├── OnlineStatusService.java    # 在线状态服务接口
│   ├── RealOnlineStatusService.java # 真实实现
│   ├── MockOnlineStatusService.java # Mock 实现
│   ├── OnlineStatusView.java       # 在线状态视图
│   ├── FollowView.java             # 关注视图
│   └── FollowUserView.java         # 被关注用户视图
│
├── entity/                         # 实体层 (JPA)
│   ├── User.java                   # 用户主表
│   ├── UserBasicProfile.java       # 基础资料 (昵称/头像/生日/性别)
│   ├── UserCampusProfile.java      # 校园资料 (学校/年级/专业)
│   ├── UserScheduleProfile.java    # 时间安排
│   ├── UserSession.java            # 用户会话
│   ├── UserOnlineStatus.java       # 用户在线状态
│   ├── UserFollow.java             # 用户关注
│   ├── Like.java                   # 喜欢/点赞
│   ├── Post.java                   # 帖子
│   ├── PostLike.java               # 帖子点赞
│   ├── PostShare.java              # 帖子分享
│   ├── PostCategoryEntity.java     # 帖子分类
│   ├── Comment.java                # 评论
│   ├── HeartSignal.java            # 心跳信号(匹配)
│   ├── Visitor.java                # 访客记录
│   ├── PassRecord.java             # 划过记录
│   ├── Activity.java               # 活动
│   ├── ActivityEnrollment.java     # 活动报名
│   ├── DailyQuestion.java          # 每日一问
│   ├── DailyAnswer.java            # 每日回答
│   ├── InterestCircle.java         # 兴趣圈
│   ├── CircleTopic.java            # 圈话题
│   ├── CircleReply.java            # 圈回复
│   ├── CircleMembership.java       # 圈成员
│   ├── IcebreakerTopic.java        # 破冰话题
│   ├── InteractionEvent.java       # 互动事件
│   ├── Notification.java           # 通知
│   ├── Feedback.java               # 反馈/工单
│   ├── RecommendationPreference.java # 推荐偏好
│   ├── CheckIn.java                # 签到记录
│   ├── TempChatSession.java        # 临时聊天会话
│   ├── TempChatMessage.java        # 临时聊天消息
│   ├── TempChatContactExchange.java # 临时聊天联系方式交换
│   ├── PrivateConversation.java    # 私信会话
│   ├── PrivateMessage.java         # 私信消息
│   ├── AppLoginHeroConfig.java     # 登录页英雄区配置
│   └── ... (其他实体)
│
├── repository/                     # 数据访问层 (JPA Repository)
│   ├── UserRepository.java
│   ├── UserBasicProfileRepository.java
│   ├── UserCampusProfileRepository.java
│   ├── HeartSignalRepository.java
│   ├── PostRepository.java
│   ├── LikeRepository.java
│   ├── CommentRepository.java
│   ├── ActivityRepository.java
│   ├── ActivityEnrollmentRepository.java
│   ├── DailyQuestionRepository.java
│   ├── DailyAnswerRepository.java
│   ├── InterestCircleRepository.java
│   ├── CircleTopicRepository.java
│   ├── CircleReplyRepository.java
│   ├── CircleMembershipRepository.java
│   ├── IcebreakerTopicRepository.java
│   ├── InteractionEventRepository.java
│   ├── NotificationRepository.java
│   ├── FeedbackRepository.java
│   ├── CheckInRepository.java
│   ├── RecommendationPreferenceRepository.java
│   ├── TempChatSessionRepository.java
│   ├── TempChatMessageRepository.java
│   ├── TempChatContactExchangeRepository.java
│   ├── PrivateConversationRepository.java
│   ├── PrivateMessageRepository.java
│   ├── VisitorRepository.java
│   ├── PassRecordRepository.java
│   ├── PostLikeRepository.java
│   ├── PostShareRepository.java
│   ├── PostCategoryRepository.java
│   ├── UserFollowRepository.java
│   ├── UserOnlineStatusRepository.java
│   ├── UserSessionRepository.java
│   ├── AppLoginHeroConfigRepository.java
│   └── UserScheduleProfileRepository.java
│
├── runtime/                        # 运行时状态
│   └── MockRuntimeState.java       # Mock 运行时状态管理
│
└── debug/                          # 调试控制器(仅开发环境)
    ├── ErrorSimulationController.java  # 错误模拟
    └── MatchDebugController.java       # 匹配调试
```

### 2.2 API 模块职责总表

| 模块 | 包名 | 核心职责 | 关键 API |
|------|------|---------|---------|
| **认证** | auth | 微信登录、JWT 签发、会话管理 | POST /auth/login, POST /auth/refresh |
| **资料** | profile | 用户资料 CRUD、多步引导 | GET/PUT /profile, 校园/时间/偏好子资源 |
| **首页** | home | 仪表盘聚合、签到入口、推荐预览 | GET /home/dashboard |
| **发现-推荐** | discover | 推荐人选、滑动浏览、每日限额 | GET /discover/candidates, POST /discover/pass |
| **发现-活动** | discover | 活动列表、详情、报名 | GET/POST /activities, GET /activities/{id} |
| **发现-每日一问** | discover | 每日题目、回答提交 | GET /daily-question, POST /daily-question/answer |
| **发现-兴趣圈** | discover | 圈子列表、话题、加入/退出 | CRUD /circles, /circles/{id}/topics |
| **匹配** | match | 心跳信号、互相喜欢、匹配 | POST /match/heart-signal, GET /match/mutual |
| **破冰** | match | 破冰话题推荐 | GET /icebreaker/topics |
| **聊天-临时** | chat | 匿名聊天、定时过期 | WS /chat/temp, POST /chat/temp/message |
| **聊天-私信** | chat | 配对成功后私信 | WS /chat/private, GET /chat/conversations |
| **通知** | chat | 系统/互动通知 | GET /notifications, PUT /notifications/{id}/read |
| **互动事件** | chat | 互动事件流 | GET /interaction-events |
| **村口(社区)** | village | 帖子 CRUD、评论、分类、共享 | CRUD /posts, /posts/{id}/comments, /posts/{id}/share |
| **反馈** | feedback | 工单提交和查询 | POST /feedback, GET /feedback/records |
| **成长-签到** | growth | 每日签到、连续签到奖励 | POST /check-in, GET /check-in/status |
| **成长-配置** | growth | App 动态配置 | GET /app-config |
| **用户** | user | 公共用户信息、关注、在线状态 | GET /users/{id}, POST /users/{id}/follow |

---

## 三、apps/client —— 前端 (uni-app)

### 3.1 目录结构

```
apps/client/
├── src/
│   ├── main.ts                        # 入口
│   ├── App.vue                        # 根组件
│   ├── pages.json                     # 页面路由 & Tab 配置
│   │
│   ├── pages/                         # 主包页面
│   │   ├── login/index.vue            # 登录页
│   │   ├── discover/
│   │   │   ├── index.vue              # 发现/首页 - 推荐人选卡片滑动
│   │   │   └── history.vue            # 今日已看历史
│   │   ├── likes/index.vue            # 喜欢页 - 与我互动/喜欢我的人
│   │   ├── village/
│   │   │   ├── index.vue              # 村口 - 社区帖子流
│   │   │   ├── post.vue               # 发布帖子
│   │   │   └── detail.vue             # 帖子详情
│   │   ├── messages/index.vue         # 消息页 - 会话列表
│   │   ├── profile/index.vue          # 我的 - 个人中心
│   │   ├── chat/index.vue             # 聊天页
│   │   ├── chat-session/index.vue     # 会话详情
│   │   ├── circles/
│   │   │   ├── index.vue              # 兴趣圈列表
│   │   │   ├── topics.vue             # 话题列表
│   │   │   ├── topic-detail.vue       # 话题详情
│   │   │   └── post-topic.vue         # 发布话题
│   │   ├── daily-question/index.vue   # 每日一问
│   │   ├── activities/index.vue       # 活动
│   │   ├── discussions/index.vue      # 讨论
│   │   └── dev/index.vue              # 开发者调试页
│   │
│   ├── subpackages/                   # 分包页面
│   │   ├── setup/                     # 用户设置流
│   │   │   ├── profile/index.vue      # 基础资料设置
│   │   │   ├── campus/index.vue       # 学校信息设置
│   │   │   ├── schedule/index.vue     # 时间安排设置
│   │   │   └── recommend-pref/index.vue # 推荐偏好设置
│   │   ├── support/
│   │   │   └── feedback/index.vue     # 反馈中心
│   │   └── discover/
│   │       ├── discussions/index.vue  # 讨论圈
│   │       └── activities/index.vue   # 活动
│   │
│   ├── components/                    # 公共组件
│   │   ├── layout/
│   │   │   └── AppShell.vue           # 应用壳(自定义TabBar)
│   │   ├── common/
│   │   │   ├── BottomActionBar.vue    # 底部操作栏
│   │   │   ├── LockScreen.vue         # 锁定屏幕
│   │   │   ├── SectionCard.vue        # 区块卡片
│   │   │   └── StatusState.vue        # 状态展示(空/加载/错误)
│   │   ├── chat/
│   │   │   ├── ChatBubble.vue         # 聊天气泡
│   │   │   └── VoicePill.vue          # 语音药丸
│   │   └── discover/
│   │       └── CardSwiper.vue         # 卡片滑动组件
│   │
│   ├── config/                        # 配置
│   │   ├── navigation.ts              # Tab导航配置
│   │   ├── page-access.ts             # 页面访问权限
│   │   ├── status-copy.ts             # 状态文案
│   │   └── home-recommended-people.ts # 首页推荐人选配置
│   │
│   ├── services/                      # 服务层
│   │   ├── api.ts                     # API 封装
│   │   ├── http.ts                    # HTTP 客户端
│   │   ├── websocket.ts               # WebSocket 客户端
│   │   ├── env.ts                     # 环境检测(Mock/Real)
│   │   ├── api-error.ts               # API 错误处理
│   │   ├── generated/
│   │   │   └── api-types.ts           # OpenAPI 生成的类型
│   │   └── mocks/
│   │       └── fixtures.ts            # Mock 数据固定数据
│   │
│   ├── stores/                        # Pinia 状态管理
│   │   ├── discover.ts                # 发现/推荐状态
│   │   ├── profile.ts                 # 用户资料状态
│   │   ├── likes.ts                   # 喜欢状态
│   │   ├── messages.ts                # 消息状态
│   │   ├── village.ts                 # 社区状态
│   │   ├── chat.ts                    # 聊天状态
│   │   ├── session.ts                 # 会话状态
│   │   ├── activity.ts                # 活动状态
│   │   ├── circle.ts                  # 兴趣圈状态
│   │   ├── daily-question.ts          # 每日一问状态
│   │   ├── feedback.ts                # 反馈状态
│   │   ├── checkin.ts                 # 签到状态
│   │   └── ...
│   │
│   ├── view-models/                   # 视图模型
│   │   ├── home.ts                    # 首页 VM
│   │   ├── login.ts                   # 登录 VM
│   │   ├── profile.ts                 # 资料 VM
│   │   ├── chat.ts                    # 聊天 VM
│   │   └── feedback.ts                # 反馈 VM
│   │
│   ├── features/                      # 特性模块
│   │   ├── chat/
│   │   │   ├── session-machine.ts     # 会话状态机
│   │   │   └── transport.ts           # 消息传输层
│   │   └── login/
│   │       └── hero.ts                # 登录页英雄区
│   │
│   ├── guards/                        # 路由守卫
│   │   ├── profile-guard.ts           # 资料完整性守卫
│   │   └── session-guard.ts           # 会话守卫
│   │
│   ├── composables/                   # 组合式函数
│   │   └── usePageAccess.ts           # 页面访问控制
│   │
│   ├── utils/                         # 工具函数
│   │   └── navigation.ts              # 导航工具
│   │
│   ├── theme/                         # 主题
│   │   └── tokens.ts                  # 设计 Token
│   │
│   └── tests/                         # 单元测试
│       ├── chat-overview-view.spec.ts
│       ├── chat-session-machine.spec.ts
│       ├── chat-transport.spec.ts
│       ├── chat-transport-real.spec.ts
│       ├── error-state.spec.ts
│       ├── hero.spec.ts
│       ├── navigation-config.spec.ts
│       ├── navigation-utils.spec.ts
│       ├── page-access-config.spec.ts
│       ├── profile-guard.spec.ts
│       ├── session-guard.spec.ts
│       ├── profile-store.spec.ts
│       ├── mock-fixtures.spec.ts
│       ├── components/LockScreen.spec.ts
│       └── stores/
│           ├── discover.spec.ts
│           ├── likes.spec.ts
│           ├── messages.spec.ts
│           └── village.spec.ts
│
├── dist/                             # 构建产物
├── package.json
├── vite.config.ts                    # Vite 配置
├── vitest.config.ts                  # 测试配置
├── tsconfig.json
└── uni.scss                          # 全局样式变量
```

### 3.2 Tab 导航结构

| Tab | 路由 | 图标 | 说明 |
|-----|------|------|------|
| 寻觅 | /pages/discover/index | discover.svg | 推荐人选卡片滑动 |
| 喜欢 | /pages/likes/index | likes.svg | 喜欢我/互赞/访客 |
| 村口 | /pages/village/index | village.svg (prominent) | 社区帖子流 |
| 消息 | /pages/messages/index | messages.svg | 消息会话列表 |
| 我的 | /pages/profile/index | profile.svg | 个人中心 |

---

## 四、数据库 —— Flyway 迁移概览

```
database/flyway/sql/
├── V2026.05.18.1600__add_growth_feedback_and_ai_reserved.sql    # 成长/反馈/AI 预留
├── V2026.05.18.2200__phase0_phase1_client_foundation.sql        # Phase 0/1 客户端基础
├── V2026.05.21.0001__create_likes_table.sql                     # 喜欢表
├── V2026.05.21.0002__create_visitors_table.sql                  # 访客表
├── V2026.05.21.0003__create_posts_table.sql                     # 帖子表
├── V2026.05.21.0004__create_comments_table.sql                  # 评论表
├── V2026.05.21.0005__create_heart_signals_table.sql             # 心跳信号表
├── V2026.05.21.0006__alter_users_add_profile_completion.sql     # 用户表增加资料完成度
├── V2026.05.23.0001__create_activity_enrollments.sql            # 活动报名表
├── V2026.05.23.0002__create_check_ins.sql                       # 签到表
├── V2026.05.23.0003__create_daily_questions.sql                 # 每日一问表
├── V2026.05.23.0004__create_notifications.sql                   # 通知表
├── V2026.05.23.0005__create_interest_circles.sql                # 兴趣圈表
├── V2026.05.23.0006__create_post_shares.sql                     # 帖子分享表
├── V2026.05.24.0001__create_recommendation_preferences.sql      # 推荐偏好表
├── V2026.05.24.0002__create_private_conversations.sql           # 私信会话表
├── V2026.05.24.0003__create_user_sessions.sql                   # 用户会话表
├── V2026.05.24.0004__create_activities.sql                      # 活动表
├── V2026.05.25.0001__create_user_follows.sql                    # 用户关注表
├── V2026.05.26.0001__alter_heart_signals_add_match_type.sql     # 心跳信号加匹配类型
├── V2026.05.26.0002__alter_user_basic_profile_add_interest_tags.sql # 基础资料加兴趣标签
├── V2026.05.26.0003__create_post_likes.sql                      # 帖子点赞表
├── V2026.05.27.0001__create_temp_chat_tables.sql                # 临时聊天表
├── V2026.05.28.0001__create_feedback_tickets.sql                # 反馈工单表
├── V2026.05.29.0001__create_pass_records.sql                    # 划过记录表
├── V2026.05.29.0002__alter_visitors_add_is_read_and_conversations_add_pinned.sql # 访客已读/会话置顶
├── V2026.05.29.0003__create_post_categories.sql                 # 帖子分类表
├── V2026.05.30.0001__add_json_column_defaults.sql               # JSON 列默认值
├── V2026.05.30.0002__create_user_online_status.sql              # 用户在线状态表
├── V2026.05.30.0003__create_icebreaker_topics.sql               # 破冰话题表
└── V2026.05.30.0004__create_interaction_events.sql              # 互动事件表
```

---

## 五、核心功能模块 & UI 规范/交互流程

### 5.1 登录页 (`/pages/login/index`)

**UI 布局**:
- 顶部: 英雄区 (品牌标语 + 插图/动画)
- 中部: 登录按钮 (微信授权登录)
- 底部: 用户协议 & 隐私政策链接

**交互流程**:
1. 页面加载 → 检测是否已有有效会话
2. 已有会话 → 自动跳转首页
3. 点击登录 → 调起微信授权 → 获取用户信息
4. 调后端 `/auth/login` → 下发 JWT Token
5. 判断资料完整度 → 不完整则跳设置流 (setup/profile)

**后端支撑**: AuthController, AuthService, JwtTokenProvider, WeChatClient

---

### 5.2 寻觅/发现页 (`/pages/discover/index`) — 核心首页

**UI 布局**:
- 顶部: 签到入口 + 每日一问入口 (左右排列)
- 中部: 大尺寸推荐卡 (CardSwiper 组件)
  - 头像、昵称、年龄、学校
  - 兴趣标签 (气泡式展示)
  - 个人签名
- 底部: 三个操作按钮 (左: 划过 / 中: 超级喜欢(星标) / 右: 喜欢)

**交互流程**:
1. 页面加载 → 调 `GET /home/dashboard` 获取聚合数据
2. 调 `GET /discover/candidates` 加载推荐人选列表
3. 卡片滑动:
   - 左滑/点击"✕" → `POST /discover/pass` (划过, 记录 PassRecord)
   - 右滑/点击"♥" → `POST /match/heart-signal` (发送心跳信号)
   - 上滑/点击"⭐" → 超级喜欢
4. 每日限额耗尽 → 显示"今日已看 xx 人" → 引导签到获取额外额度
5. 已无新候选人 → 显示兜底状态 (StatusState: empty)

**状态覆盖**:
- 加载中: CardSwiper 骨架屏
- 空列表: "今天没有更多推荐了～" + 明日再来提示
- 错误: "加载失败" + 重试按钮

**后端支撑**: HomeService (dashboard 聚合), RecommendationService (加权推荐), MatchService (心跳信号), PassRecordRepository

---

### 5.3 喜欢页 (`/pages/likes/index`)

**UI 布局**:
- Tab 切换: "喜欢我的人" / "我喜欢的" (顶部切换)
- 列表形式: 头像 + 昵称 + 年龄/学校 + 操作按钮
- 互赞匹配: 特殊标识 "互相喜欢" + "立即聊天" 按钮

**交互流程**:
1. 加载列表 → `GET /likes/received` (收到的心跳)
2. Tab 切换 → `GET /likes/sent` (发出的心跳)
3. 互相喜欢 → 弹窗祝贺 (匹配成功)
   - "立即聊天" → 创建 TempChatSession → 跳转聊天页
   - "再看看" → 关闭弹窗
4. 访客入口: 底部或单独区域 → `GET /visitors`

**后端支撑**: MatchController (心跳信号), VisitorRepository

---

### 5.4 村口/社区 (`/pages/village/index`)

**UI 布局**:
- 顶部: 分类筛选 (全部/脱单/学习/生活等)
- 内容区: 帖子瀑布流/列表
  - 用户信息行 (头像+昵称+时间)
  - 帖子内容 (文字+图片)
  - 底部操作行 (点赞/评论/分享)
- 右下: 浮动 "发布" 按钮

**交互流程**:
1. 加载帖子流 → `GET /posts`
2. 分类切换 → `GET /posts?category={id}`
3. 下拉刷新 → 重新加载首页
4. 上拉加载更多 → 分页加载
5. 点击帖子 → 跳转 `/pages/village/detail`
6. 点击发布 → 跳转 `/pages/village/post` (需登录+资料完善)
7. 点赞 → `POST /posts/{id}/like`
8. 评论 → 跳转详情页 → 底部输入框
9. 分享 → `POST /posts/{id}/share`

**发布帖子** (`/post.vue`):
- 顶部: 返回 + 标题 "发布帖子"
- 内容: 文本输入框 + 图片上传
- 分类: 选择分类 (下拉/弹窗)
- 底部: "发布" 按钮 → `POST /posts`

**后端支撑**: VillageService, PostRepository, PostLikeRepository, CommentRepository, PostShareRepository, PostCategoryRepository

---

### 5.5 消息页 (`/pages/messages/index`)

**UI 布局**:
- 顶部: 标题 "消息"
- 列表: 会话列表
  - 头像 + 昵称 + 最新消息预览 + 时间
  - 未读红点标识
  - 置顶标识
- 空状态: "暂无消息"

**交互流程**:
1. 加载会话列表 → `GET /chat/conversations`
2. 点击会话 → 跳转聊天页
3. 长按会话 → 置顶/删除选项
4. WebSocket 实时更新新消息

**后端支撑**: PrivateMessageService (会话列表), NotificationController (通知列表)

---

### 5.6 我的/个人中心 (`/pages/profile/index`)

**UI 布局**:
- 顶部: 头像 + 昵称 + 个人签名 + 资料完成度进度条
- 功能区: 多行网格布局
  - 第一行: 签到 / 每日一问 / 破冰话题
  - 第二行: 我的帖子 / 我的活动 / 兴趣圈
  - 第三行: 反馈中心 / 设置
- 底部: 退出登录按钮

**交互流程**:
1. 加载 → `GET /profile` 获取个人资料
2. 点击各功能项 → 跳转对应页面
3. 签到 → 跳转或弹窗签到
4. 反馈中心 → 跳转 subpackages/support/feedback

**后端支撑**: ProfileController, ProfileService

---

### 5.7 聊天页 (`/pages/chat/index` + `/pages/chat-session/index`)

**两种聊天类型**:

**A. 临时(匿名)聊天** (TempChat):
- 通过匹配成功创建
- 有时间限制 (默认 20 分钟, session 24h 过期)
- 可交换联系方式
- UI: ChatBubble 组件 + VoicePill 语音药丸 + 底部输入框

**B. 私信聊天** (Private):
- 双方互相喜欢/配对后建立
- 永久保存
- WebSocket 实时通信

**交互流程**:
1. 进入会话 → WebSocket 连接 `/ws/chat`
2. 历史消息加载
3. 发送消息 → WS 推送
4. 输入中状态 → WS 推送 typing 事件
5. 临时聊天倒计时显示
6. 联系方式交换请求 (临时聊天)

**核心技术**: MessageWebSocketHandler (后端), session-machine.ts (前端状态机), transport.ts (传输层)

---

### 5.8 每日一问 (`/pages/daily-question/index`)

**UI 布局**:
- 顶部: 日期 + 标题 "每日一问"
- 问题卡: 大卡片展示今日问题
- 选项: 2-4 个答案选项
- 结果: 选择后显示统计/配对比

**交互流程**:
1. 加载 → `GET /daily-question/today`
2. 选择答案 → `POST /daily-question/answer`
3. 显示已选状态 + 统计
4. 可查看历史问题和回答

---

### 5.9 兴趣圈 (`/pages/circles/`)

**页面集群**:
- `index.vue`: 圈子列表 (加入/退出)
- `topics.vue`: 话题列表
- `topic-detail.vue`: 话题详情 + 回复
- `post-topic.vue`: 发布新话题

**交互流程**:
1. 圈子列表加载 → `GET /circles`
2. 加入圈子 → `POST /circles/{id}/join`
3. 浏览话题 → `GET /circles/{id}/topics`
4. 发布话题 → `POST /circles/{id}/topics`
5. 回复话题 → `POST /topics/{id}/reply`

---

### 5.10 活动 (`/subpackages/discover/activities/index.vue`)

**UI 布局**:
- 列表: 活动卡片 (封面图 + 标题 + 时间 + 地点 + 报名人数)
- 详情: 大图 + 详细描述 + 报名按钮

**交互流程**:
1. 加载活动列表 → `GET /activities`
2. 点击活动 → 跳转详情
3. 报名 → `POST /activities/{id}/enroll`
4. 取消报名 → `DELETE /activities/{id}/enroll`

---

### 5.11 设置流 (`/subpackages/setup/`)

**四步引导设置**:

| 步骤 | 页面 | 字段 | API |
|------|------|------|-----|
| 1. 基础资料 | profile/index | 昵称/头像/性别/生日/签名/兴趣标签 | PUT /profile/basic |
| 2. 学校信息 | campus/index | 学校/年级/专业 | PUT /profile/campus |
| 3. 时间安排 | schedule/index | 空闲时段/偏好时间 | PUT /profile/schedule |
| 4. 推荐偏好 | recommend-pref/index | 理想对象筛选条件 | PUT /profile/recommend-pref |

**交互流程**:
1. 登录后检测资料完整度 → 不完整引导设置
2. 每步可跳过 (跳过则使用默认值)
3. 全部完成后跳转首页
4. 后续可在 "我的" 页面重新编辑

---

### 5.12 签到功能

**位置**: 发现页顶部 / 个人中心

**交互流程**:
1. 页面加载 → `GET /check-in/status` (获取今日签到状态)
2. 未签到 → 显示签到按钮 + 连续天数 + 奖励预览
3. 点击签到 → `POST /check-in` → 动画反馈 (积分+额外推荐额度)
4. 已签到 → 显示已签 + 连续天数

**后端支撑**: CheckInService, CheckInConfig (extra-quota-per-check-in: 3)

---

### 5.13 破冰话题

**位置**: 匹配详情 / 个人中心入口

**交互流程**:
1. 用户请求破冰话题 → `GET /icebreaker/topics`
2. 展示推荐话题列表
3. 用户选择 → 可复制发送
4. 后端根据双方兴趣标签推荐

**后端支撑**: IcebreakerService, IcebreakerTopicRepository

---

## 六、设计系统 (design-system/)

```
design-system/
├── tokens.ts                        # 设计 Token (颜色/间距/字体)
├── components/
│   ├── AppShell.vue                 # 应用壳
│   ├── BottomActionBar.vue          # 底部操作栏
│   ├── ChatBubble.vue               # 聊天气泡
│   ├── EducationBadge.vue           # 学历标签
│   ├── SectionCard.vue              # 区块卡片
│   ├── StatusState.vue              # 状态展示
│   └── VoicePill.vue                # 语音药丸
└── pages/
    ├── HomePage.vue                 # 首页原型
    ├── MatchPage.vue                # 匹配原型
    ├── ProfilePage.vue              # 个人资料原型
    └── ChatSessionPage.vue          # 聊天会话原型
```

---

## 七、OpenAPI 契约 (docs/openapi/)

| 文件 | 内容 |
|------|------|
| users.yaml | 用户资料/登录/注册 API |
| likes.yaml | 喜欢/心跳信号/匹配 API |
| village.yaml | 社区帖子/评论/分类 API |
| recommendations.yaml | 推荐人选 API |
| notifications.yaml | 通知 API |
| check-in.yaml | 签到 API |
| feedback-growth-and-auth.yaml | 反馈/成长/认证 API |

---

## 八、关键架构决策

### 8.1 Mock/Real 双运行时

| 模式 | 前端 | 后端 | 数据库 |
|------|------|------|--------|
| Mock | 前端固定数据(fixtures) | Spring mock profile | 不需要 MySQL |
| Real | .env.real → localhost:8080 | 真实实现 | MySQL + Flyway |

### 8.2 推荐算法权重

| 维度 | 权重 | 说明 |
|------|------|------|
| 同校 (campus) | 50 | 优先推荐同校用户 |
| 同城 (city) | 20 | 同城市用户 |
| 兴趣 (interest) | 10 | 匹配兴趣标签 |
| 时间安排 (schedule) | 15 | 空闲时间匹配 |

### 8.3 匹配流程

```
用户A右滑(B) → POST /match/heart-signal {toUserId: B}
    │
    ├── B还未滑过A → 记录 Signal, 等待B操作
    │
    └── B也右滑过A → 互相匹配成功!
        ├── 创建 TempChatSession (默认20分钟)
        ├── 双方推送通知
        └── UI 显示匹配成功弹窗
```
