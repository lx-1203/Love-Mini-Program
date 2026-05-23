# Tasks

## Phase 1: P0 后端缺失API端点补全

- [ ] Task 1.1: 新增左滑(pass)后端端点
  - [ ] SubTask 1.1.1: 在MatchController中添加 `POST /api/matches/pass` 端点
  - [ ] SubTask 1.1.2: 在RealMatchService中实现pass逻辑：记录拒绝行为到pass_records表
  - [ ] SubTask 1.1.3: 创建PassRecord实体和PassRecordRepository
  - [ ] SubTask 1.1.4: 创建Flyway迁移脚本 `V2026.05.29.0001__create_pass_records.sql`
  - [ ] SubTask 1.1.5: 在推荐算法中排除已pass的用户
  - [ ] SubTask 1.1.6: 在discover.ts中调用pass API替代本地记录
  - **验证**：左滑操作同步到后端，推荐不再出现已拒绝用户

- [ ] Task 1.2: 新增反悔(rewind)后端端点
  - [ ] SubTask 1.2.1: 在MatchController中添加 `POST /api/matches/rewind` 端点
  - [ ] SubTask 1.2.2: 在RealMatchService中实现rewind逻辑：恢复最近一次pass记录，每日限1次
  - [ ] SubTask 1.2.3: 在discover.ts中调用rewind API替代本地回退
  - **验证**：反悔操作持久化，刷新后不丢失

- [ ] Task 1.3: 新增"我喜欢的"列表端点
  - [ ] SubTask 1.3.1: 在MatchController中添加 `GET /api/matches/my-likes` 端点
  - [ ] SubTask 1.3.2: 在RealMatchService中实现my-likes查询：从likes表查询当前用户发出的喜欢
  - [ ] SubTask 1.3.3: 在likes.ts中调用my-likes API替代 `this.likes = []`
  - **验证**：Real模式下"我喜欢的"Tab显示真实数据

- [ ] Task 1.4: 新增访客标记已读端点
  - [ ] SubTask 1.4.1: 在MatchController中添加 `PUT /api/matches/visitors/{id}/read` 端点
  - [ ] SubTask 1.4.2: 在RealMatchService中实现标记已读逻辑
  - [ ] SubTask 1.4.3: 在likes.ts中调用API替代本地 `isNew = false`
  - **验证**：访客已读状态持久化

- [ ] Task 1.5: 新增帖子分类列表端点
  - [ ] SubTask 1.5.1: 在VillageController中添加 `GET /api/posts/categories` 端点
  - [ ] SubTask 1.5.2: 创建PostCategory实体和PostCategoryRepository（或从posts表distinct查询）
  - [ ] SubTask 1.5.3: 创建Flyway迁移脚本 `V2026.05.29.0002__create_post_categories.sql`（如需新表）
  - [ ] SubTask 1.5.4: 在village.ts中调用categories API替代硬编码列表
  - [ ] SubTask 1.5.5: 在village/post.vue中移除硬编码的categoryOptions
  - **验证**：Real模式下分类列表从后端动态获取

- [ ] Task 1.6: 新增私信会话置顶端点
  - [ ] SubTask 1.6.1: 在PrivateMessageController中添加 `PUT /api/messages/conversations/{id}/pin` 端点
  - [ ] SubTask 1.6.2: 在RealPrivateMessageService中实现置顶逻辑
  - [ ] SubTask 1.6.3: 在messages.ts中调用pin API替代本地状态更新
  - **验证**：私信置顶持久化

---

## Phase 2: P0 后端硬编码默认用户ID消除

- [ ] Task 2.1: 实现JWT用户ID解析工具方法
  - [ ] SubTask 2.1.1: 在JwtTokenProvider中添加 `getCurrentUserId()` 方法，从SecurityContext获取
  - [ ] SubTask 2.1.2: 创建 `SecurityUtils.getCurrentUserId()` 静态工具方法
  - **验证**：工具方法可正确获取当前登录用户ID

- [ ] Task 2.2: 消除Real Service中的硬编码用户ID
  - [ ] SubTask 2.2.1: RealProfileService: `CURRENT_USER_ID = 1L` → `SecurityUtils.getCurrentUserId()`
  - [ ] SubTask 2.2.2: RealFeedbackService: `CURRENT_USER_ID = 1L` → `SecurityUtils.getCurrentUserId()`
  - [ ] SubTask 2.2.3: RealVillageService: `DEFAULT_USER_ID = 1L` → `SecurityUtils.getCurrentUserId()`
  - [ ] SubTask 2.2.4: RealTempChatService: `resolveCurrentUserId() return 1L` → `SecurityUtils.getCurrentUserId()`
  - **验证**：所有Service操作归属当前登录用户

- [ ] Task 2.3: 消除Controller中的默认参数值
  - [ ] SubTask 2.3.1: NotificationController: 移除 `defaultValue = "1"` (2处)
  - [ ] SubTask 2.3.2: PrivateMessageController: 移除 `defaultValue = "1"` (3处)
  - [ ] SubTask 2.3.3: VillageController: 移除 `defaultValue = "1"` (4处)
  - [ ] SubTask 2.3.4: 所有Controller改为从JWT token获取userId
  - **验证**：未认证请求返回401，不再使用默认用户

- [ ] Task 2.4: 消除前端硬编码用户ID
  - [ ] SubTask 2.4.1: likes.ts: `createHeartSignalForMutualLike` toUserId从session获取
  - **验证**：前端不再硬编码用户ID

- [ ] Task 2.5: 修复JWT安全配置
  - [ ] SubTask 2.5.1: JwtConfig: 移除默认密钥，启动时校验环境变量必须设置
  - **验证**：未设置JWT_SECRET环境变量时应用拒绝启动

---

## Phase 3: P1 后端配置值外移

- [ ] Task 3.1: 创建业务配置类
  - [ ] SubTask 3.1.1: 创建 `RecommendationConfig` @ConfigurationProperties类：dailyLimit, candidatePageSize, campusWeight(+50), cityWeight(+20), interestWeight(+10), scheduleWeight(+15)
  - [ ] SubTask 3.1.2: 创建 `MatchConfig` @ConfigurationProperties类：heartSignalExpireHours, candidatePageSize, defaultChatDuration
  - [ ] SubTask 3.1.3: 创建 `ChatConfig` @ConfigurationProperties类：sessionExpireHours
  - [ ] SubTask 3.1.4: 创建 `CheckInConfig` @ConfigurationProperties类：extraQuotaPerCheckIn
  - [ ] SubTask 3.1.5: 在application.yml中添加对应配置项
  - [ ] SubTask 3.1.6: 替换RealRecommendationService和RealMatchService中的硬编码权重为配置注入
  - [ ] SubTask 3.1.7: 替换其他Service中的硬编码配置值
  - **验证**：修改application.yml配置即可调整业务参数，无需重新编译

- [ ] Task 3.2: 统一后端文案常量
  - [ ] SubTask 3.2.1: 创建 `DisplayConstants` 常量类：UNKNOWN_USER="未知用户", NEW_USER="新用户", ANONYMOUS_USER="匿名用户"
  - [ ] SubTask 3.2.2: 替换所有Service中散落的"未知用户"为 `DisplayConstants.UNKNOWN_USER`
  - [ ] SubTask 3.2.3: 替换所有Service中散落的"新用户"为 `DisplayConstants.NEW_USER`
  - **验证**：文案统一管理，修改一处全局生效

---

## Phase 4: P1 后端视图字段补全

- [ ] Task 4.1: 补全推荐人物视图字段
  - [ ] SubTask 4.1.1: RecommendedPersonView 添加 bio(String) 和 images(List<String>) 字段
  - [ ] SubTask 4.1.2: RealRecommendationService 填充 bio 和 images 数据
  - [ ] SubTask 4.1.3: discover.ts 移除 `bio: ""` 和 `images: []` 硬编码映射
  - **验证**：推荐卡片展示真实bio和图片

- [ ] Task 4.2: 补全心动信号视图字段
  - [ ] SubTask 4.2.1: HeartSignalView 添加 fromUserName 和 fromUserAvatar 字段
  - [ ] SubTask 4.2.2: RealMatchService 填充用户名和头像数据
  - [ ] SubTask 4.2.3: likes.ts 和 messages.ts 移除硬编码空字符串映射
  - **验证**：心动信号展示真实用户名和头像

- [ ] Task 4.3: 补全私信会话视图字段
  - [ ] SubTask 4.3.1: ConversationView 添加 headline/pinned/phase/sessionType 字段
  - [ ] SubTask 4.3.2: RealPrivateMessageService 填充新字段
  - [ ] SubTask 4.3.3: messages.ts 移除硬编码默认值映射
  - **验证**：私信会话展示完整信息

- [ ] Task 4.4: 补全其他视图字段
  - [ ] SubTask 4.4.1: CircleView 添加 topicCount 字段
  - [ ] SubTask 4.4.2: DailyQuestionView 添加 category/answerCount 字段
  - [ ] SubTask 4.4.3: DailyAnswerView 添加 avatarUrl 字段
  - [ ] SubTask 4.4.4: 前端Store移除对应硬编码映射
  - **验证**：所有视图字段完整，前端无需写死默认值

---

## Phase 5: P1 前端未调用端点补全

- [ ] Task 5.1: 补全discover.ts未调用端点
  - [ ] SubTask 5.1.1: 推荐历史：调用 `GET /api/recommendations/history` 替代localStorage
  - **验证**：推荐历史从后端获取

- [ ] Task 5.2: 补全village.ts未调用端点
  - [ ] SubTask 5.2.1: 帖子详情：调用 `GET /api/posts/{id}` 替代本地列表查找
  - **验证**：帖子详情从后端获取

- [ ] Task 5.3: 补全messages.ts未调用端点
  - [ ] SubTask 5.3.1: 标记全部通知已读：调用 `PUT /api/notifications/read-all`
  - [ ] SubTask 5.3.2: 拒绝心动信号：实现 `declineHeartSignal` 方法调用 `POST /api/matches/heart-signals/{id}/decline`
  - **验证**：通知已读和拒绝信号同步到后端

- [ ] Task 5.4: 补全activity.ts未调用端点
  - [ ] SubTask 5.4.1: 活动取消报名：调用 `DELETE /api/activities/{id}/enroll`
  - [ ] SubTask 5.4.2: 活动详情：新增 `fetchActivityDetail` 方法调用 `GET /api/activities/{id}`
  - **验证**：活动报名取消和详情从后端获取

- [ ] Task 5.5: 补全circle.ts未调用端点
  - [ ] SubTask 5.5.1: 精选话题：实现 `fetchFeaturedTopics` 方法调用 `GET /api/circles/featured`
  - **验证**：村口兴趣圈分类展示精选话题

- [ ] Task 5.6: 补全访客记录写入
  - [ ] SubTask 5.6.1: 在查看他人主页/帖子详情时调用 `POST /api/matches/visit` 写入访客记录
  - **验证**：查看他人资料后对方能看到访客记录

---

## Phase 6: P2 Mock数据优化 + 实体默认值

- [ ] Task 6.1: Mock假数据移至JSON资源文件
  - [ ] SubTask 6.1.1: 将runtime/MockRuntimeState.java中的假数据移至 `resources/mock-data/` JSON文件
  - [ ] SubTask 6.1.2: 将前端 `services/mocks/fixtures.ts` 中的假数据移至 `assets/mock-data/` JSON文件
  - **验证**：Mock数据与代码分离，便于维护

- [ ] Task 6.2: 实体JSON列添加默认值
  - [ ] SubTask 6.2.1: Feedback.attachments 添加默认值 `"[]"`
  - [ ] SubTask 6.2.2: UserBasicProfile.interestTags 添加默认值 `"[]"`
  - [ ] SubTask 6.2.3: Activity.participantAvatars 添加默认值 `"[]"`
  - [ ] SubTask 6.2.4: CircleTopic.images 添加默认值 `"[]"`
  - [ ] SubTask 6.2.5: Post.images 添加默认值 `"[]"`
  - [ ] SubTask 6.2.6: Post.tags 添加默认值 `"[]"`
  - [ ] SubTask 6.2.7: UserScheduleProfile 两个JSON列添加默认值 `"[]"`
  - [ ] SubTask 6.2.8: 创建Flyway迁移脚本添加列默认值
  - **验证**：新记录JSON列自动填充空数组

---

# Task Dependencies

- Task 2.1 是 Task 2.2/2.3 的前置依赖
- Task 1.1-1.6 互相独立，可并行
- Task 2.2/2.3/2.4 互相独立，可并行（依赖2.1）
- Task 3.1 和 3.2 互相独立，可并行
- Task 4.1-4.4 互相独立，可并行
- Task 5.1-5.6 互相独立，可并行
- Task 6.1 和 6.2 互相独立，可并行
- Phase 2 依赖 Phase 1 中的JWT相关基础设施
- Phase 4 可与 Phase 2/3 并行
- Phase 5 可与 Phase 3/4 并行
- Phase 6 独立，可与任何Phase并行
