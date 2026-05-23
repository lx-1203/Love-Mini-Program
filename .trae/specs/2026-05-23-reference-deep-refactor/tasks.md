# Tasks

## Phase 1: P0致命项 — RealProfileService完整实现

- [ ] Task 1.1: 实现RealProfileService基本资料查询与保存
  - [ ] SubTask 1.1.1: 实现 `getBasicProfile(userId)` — 从user_basic_profile表查询基本资料（头像/昵称/bio/性别/生日/兴趣标签），无记录返回空模板
  - [ ] SubTask 1.1.2: 实现 `saveBasicProfile(userId, data)` — 更新user_basic_profile表，重新计算profileCompletion字段
  - [ ] SubTask 1.1.3: 验证基本资料查询和保存链路：前端编辑页 → API调用 → 数据库更新 → 返回确认
  - **验证**：Real模式下基本资料可查询和保存，profileCompletion正确更新

- [ ] Task 1.2: 实现RealProfileService校区资料查询与保存
  - [ ] SubTask 1.2.1: 实现 `getCampusProfile(userId)` — 从user_campus_profile表查询校区资料（学校/专业/年级/学号/认证状态）
  - [ ] SubTask 1.2.2: 实现 `saveCampusProfile(userId, data)` — 更新user_campus_profile表，重新计算认证状态和profileCompletion
  - [ ] SubTask 1.2.3: 验证校区资料查询和保存链路：前端校区页 → API调用 → 数据库更新 → 认证状态更新
  - **验证**：Real模式下校区资料可查询和保存，认证状态正确更新

- [ ] Task 1.3: 实现RealProfileService日程资料查询与保存
  - [ ] SubTask 1.3.1: 实现 `getScheduleProfile(userId)` — 从user_schedule_profile表查询日程资料（空闲时间段）
  - [ ] SubTask 1.3.2: 实现 `saveScheduleProfile(userId, data)` — 更新user_schedule_profile表，重新计算profileCompletion
  - [ ] SubTask 1.3.3: 验证日程资料查询和保存链路：前端日程页 → API调用 → 数据库更新
  - **验证**：Real模式下日程资料可查询和保存

- [ ] Task 1.4: 实现RealProfileService个人统计查询
  - [ ] SubTask 1.4.1: 实现 `getProfileStats(userId)` — 从数据库计算关注数、粉丝数、获赞数、帖子数
  - [ ] SubTask 1.4.2: 关注数从user_follows表count(follower_id)计算
  - [ ] SubTask 1.4.3: 粉丝数从user_follows表count(following_id)计算
  - [ ] SubTask 1.4.4: 获赞数从post_likes表关联posts表计算
  - [ ] SubTask 1.4.5: 帖子数从posts表count(author_id)计算
  - [ ] SubTask 1.4.6: 验证个人统计查询：前端"我的"页 → API调用 → 返回真实统计
  - **验证**：Real模式下个人统计从数据库真实计算，非硬编码

---

## Phase 2: P0阻塞项 — RealFeedbackService + 页面路由修复

- [ ] Task 2.1: 实现RealFeedbackService反馈提交与查询
  - [ ] SubTask 2.1.1: 实现 `submit(userId, request)` — 创建Feedback记录，持久化到数据库
  - [ ] SubTask 2.1.2: 实现 `listMine(userId)` — 查询该用户的所有反馈记录，含提交时间/类型/状态/回复
  - [ ] SubTask 2.1.3: 实现 `listAdminFeedback()` — 管理员查看所有反馈，支持按类型和状态筛选
  - [ ] SubTask 2.1.4: 实现 `convertProposal(feedbackId)` — 将活动提案转为正式Activity记录，更新提案状态
  - [ ] SubTask 2.1.5: 验证反馈完整链路：提交反馈 → 查询历史 → 管理员审核 → 提案转换
  - **验证**：Real模式下反馈功能完整可用

- [ ] Task 2.2: 修复chat/chat-session页面路由注册
  - [ ] SubTask 2.2.1: 在pages.json主包中注册chat页面路由（path: "pages/chat/index"）
  - [ ] SubTask 2.2.2: 在pages.json主包中注册chat-session页面路由（path: "pages/chat-session/index"）
  - [ ] SubTask 2.2.3: 验证页面路由：点击临时聊天入口 → 正常导航到chat-session页面
  - [ ] SubTask 2.2.4: 验证页面路由：点击消息页聊天入口 → 正常导航到chat页面
  - **验证**：chat和chat-session页面可通过路由正常访问

---

## Phase 3: P1核心项 — Store Mock模式 + RealAppConfigService

- [ ] Task 3.1: 为chat.ts添加Mock模式支持
  - [ ] SubTask 3.1.1: 在chat.ts中添加useMock()判断分支
  - [ ] SubTask 3.1.2: 创建本地Mock聊天数据（会话列表+消息列表+临时聊天）
  - [ ] SubTask 3.1.3: Mock模式下返回本地数据，不调用后端API
  - [ ] SubTask 3.1.4: 验证Mock模式下聊天界面正常展示
  - **验证**：chat.ts在Mock模式下正常工作

- [ ] Task 3.2: 为session.ts添加Mock模式支持
  - [ ] SubTask 3.2.1: 在session.ts中添加useMock()判断分支
  - [ ] SubTask 3.2.2: 创建本地Mock会话数据（用户信息+登录状态+资料完善度）
  - [ ] SubTask 3.2.3: Mock模式下返回本地数据，不调用后端API
  - [ ] SubTask 3.2.4: 验证Mock模式下会话管理正常工作
  - **验证**：session.ts在Mock模式下正常工作

- [ ] Task 3.3: 实现RealAppConfigService.getLoginHeroConfig()
  - [ ] SubTask 3.3.1: 实现 `getLoginHeroConfig()` — 从数据库或配置中返回登录页主视觉文案和图片URL
  - [ ] SubTask 3.3.2: 若数据库无配置，返回默认值（不抛异常）
  - [ ] SubTask 3.3.3: 验证登录页主视觉配置正常加载
  - **验证**：RealAppConfigService.getLoginHeroConfig()不抛异常，返回有效配置

---

## Phase 4: P1性能与质量项 — 推荐优化 + 硬编码修复 + 视图字段补全

- [ ] Task 4.1: 优化RealRecommendationService查询性能
  - [ ] SubTask 4.1.1: 替换 `userRepository.findAll()` 为分页查询（PageRequest + Specification）
  - [ ] SubTask 4.1.2: 添加排除条件：排除已喜欢/已有信号的用户
  - [ ] SubTask 4.1.3: 限制查询数量（如每次最多查询100个候选用户）
  - [ ] SubTask 4.1.4: 验证推荐查询性能：大数据量下响应时间<500ms
  - **验证**：推荐查询不再全表扫描，性能显著提升

- [ ] Task 4.2: 修复RealVillageService硬编码userId
  - [ ] SubTask 4.2.1: 修复 `createPost()` Phase 1方法：从SecurityContext获取当前用户ID
  - [ ] SubTask 4.2.2: 修复 `likePost()` Phase 1方法：从SecurityContext获取当前用户ID
  - [ ] SubTask 4.2.3: 修复 `createComment()` Phase 1方法：从SecurityContext获取当前用户ID
  - [ ] SubTask 4.2.4: 修复 `sharePost()` Phase 1方法：从SecurityContext获取当前用户ID
  - [ ] SubTask 4.2.5: 验证操作归属正确用户：不同用户操作归属各自ID
  - **验证**：所有操作归属当前登录用户，不再硬编码userId=1L

- [ ] Task 4.3: 补全前端视图类型缺失字段
  - [ ] SubTask 4.3.1: HeartSignalView添加fromUserName和fromUserAvatar字段
  - [ ] SubTask 4.3.2: PostSummaryView添加isLiked、isFollowed、isShared字段
  - [ ] SubTask 4.3.3: ConversationView添加headline、pinned、phase、sessionType字段
  - [ ] SubTask 4.3.4: DailyQuestionView添加category、answerCount字段
  - [ ] SubTask 4.3.5: CircleView添加topicCount字段
  - [ ] SubTask 4.3.6: 验证前端视图类型与后端返回数据一致
  - **验证**：前端视图类型字段完整，与后端数据模型一致

- [ ] Task 4.4: 对齐两套页面目录
  - [ ] SubTask 4.4.1: 确认apps/client/pages/和apps/client/src/pages/的差异
  - [ ] SubTask 4.4.2: 将缺失的circles/和daily-question/页面同步到pages/目录（或统一编译配置）
  - [ ] SubTask 4.4.3: 验证编译后所有页面可正常访问
  - **验证**：两套页面目录一致，编译无遗漏

---

## Phase 5: P2清理 + 全链路验证 + 回归测试

- [ ] Task 5.1: 代码清理
  - [ ] SubTask 5.1.1: 统一@Profile注解风格：移除RealCircleService和RealDailyQuestionService多余的@Primary
  - [ ] SubTask 5.1.2: 统一RealNotificationService方法签名：Phase 1方法userId从String改为Long
  - [ ] SubTask 5.1.3: 清理RealHomeService.getDashboard()的UnsupportedOperationException
  - **验证**：代码风格统一，无冗余注解

- [ ] Task 5.2: 全链路验证（Real模式）
  - [ ] SubTask 5.2.1: 微信登录 → 资料编辑（基本+校区+日程）→ 资料完善度更新 完整链路
  - [ ] SubTask 5.2.2: 寻觅 → 喜欢 → 心动信号 → 私信 完整链路
  - [ ] SubTask 5.2.3: 村口 → 发帖 → 评论 → 点赞 → 转发 完整链路
  - [ ] SubTask 5.2.4: 兴趣圈 → 加入 → 话题 → 回复 完整链路
  - [ ] SubTask 5.2.5: 签到 → 每日一问 → 回答 完整链路
  - [ ] SubTask 5.2.6: 活动 → 列表 → 详情 → 报名 完整链路
  - [ ] SubTask 5.2.7: 临时聊天 → 创建 → 发消息 → 联系方式交换 完整链路
  - [ ] SubTask 5.2.8: 反馈 → 提交 → 查询历史 完整链路
  - [ ] SubTask 5.2.9: 推荐偏好设置 → 影响推荐结果 完整链路
  - [ ] SubTask 5.2.10: 个人统计 → 关注数/粉丝数/获赞数/帖子数 完整链路
  - **验证**：所有链路在Real模式下正常运行

- [ ] Task 5.3: Mock模式验证
  - [ ] SubTask 5.3.1: 所有Store在Mock模式下正常工作（含chat.ts和session.ts）
  - [ ] SubTask 5.3.2: Mock模式下前端可独立运行，无需后端服务
  - **验证**：Mock模式全Store可用

- [ ] Task 5.4: 回归验证
  - [ ] SubTask 5.4.1: 大学生模式（学校认证/同乡分类/同校圈）不受影响
  - [ ] SubTask 5.4.2: 资料完善硬门槛正常生效
  - [ ] SubTask 5.4.3: 推荐计划设置完整保留
  - [ ] SubTask 5.4.4: 线下活动功能完整保留
  - [ ] SubTask 5.4.5: 无游戏化元素和购物功能
  - **验证**：所有已有功能完整可用，约束条件满足

---

# Task Dependencies

- Task 1.1 + 1.2 + 1.3 可并行（三个独立资料类型）
- Task 1.4 依赖 Task 1.1-1.3（统计可能依赖资料完善度计算）
- Task 2.1 独立（反馈服务）
- Task 2.2 独立（页面路由注册）
- Task 3.1 + 3.2 可并行（两个独立Store）
- Task 3.3 独立（AppConfig服务）
- Task 4.1 独立（推荐优化）
- Task 4.2 独立（硬编码修复）
- Task 4.3 独立（视图字段补全）
- Task 4.4 独立（页面目录对齐）
- Task 5.2 依赖所有前置任务
- Task 5.3 依赖 Task 3.1 + 3.2
- Task 5.4 依赖 Task 5.2

# 可并行执行的任务组

- **组A**：Task 1.1 + 1.2 + 1.3 + 2.1 + 2.2 + 3.3 + 4.1 + 4.2（全部独立，可完全并行）
- **组B**：Task 1.4 + 3.1 + 3.2 + 4.3 + 4.4（依赖组A部分完成，可并行）
- **组C**：Task 5.1（独立，可与组B并行）
- **组D**：Task 5.2 + 5.3 + 5.4（依赖所有任务完成）

# 开发时间线建议

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Day 1-2 | Phase 1: RealProfileService 7个方法实现 | M1: 资料编辑Real可用 |
| Day 3 | Phase 2: RealFeedbackService + 页面路由修复 | M2: 反馈+聊天路由可用 |
| Day 4 | Phase 3: Store Mock模式 + RealAppConfigService | M3: 全Store双模式可用 |
| Day 5 | Phase 4: 推荐优化 + 硬编码修复 + 视图字段补全 | M4: 性能和质量提升 |
| Day 6-7 | Phase 5: 清理 + 全链路验证 + 回归测试 | M5: 全部验收通过 |

# 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1 | RealProfileService+RealFeedbackService+RealAppConfigService+推荐优化+硬编码修复 |
| 前端开发 | 1 | 页面路由注册+Store Mock模式+视图类型补全+页面目录对齐 |
| 全栈/联调 | 1 | 前后端联调+集成测试+回归验证 |
