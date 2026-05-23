# Tasks

## Phase 1: 后端数据层基础设施

- [x] Task 1.1: 数据源配置与JPA集成
  - [x] SubTask 1.1.1: 在 `application.yml` 中配置MySQL数据源（HikariCP连接池）
  - [x] SubTask 1.1.2: 添加Spring Data JPA依赖到 `pom.xml`
  - [x] SubTask 1.1.3: 配置JPA属性（ddl-auto=validate，由Flyway管理Schema）
  - [x] SubTask 1.1.4: 验证Flyway迁移脚本在真实数据库上全部通过
  - **验证**：应用启动成功连接MySQL，Flyway迁移全部通过

- [x] Task 1.2: Entity层创建
  - [x] SubTask 1.2.1: 创建 `User` Entity（对应users表，含profileCompletion字段）
  - [x] SubTask 1.2.2: 创建 `Like` / `Visitor` Entity（对应likes/visitors表）
  - [x] SubTask 1.2.3: 创建 `Post` / `Comment` / `HeartSignal` Entity（对应posts/comments/heart_signals表）
  - [x] SubTask 1.2.4: 创建 `ActivityEnrollment` / `CheckIn` Entity（对应activity_enrollments/check_ins表）
  - [x] SubTask 1.2.5: 创建 `DailyQuestion` / `DailyAnswer` Entity（对应daily_questions/daily_answers表）
  - [x] SubTask 1.2.6: 创建 `Notification` Entity（对应notifications表）
  - [x] SubTask 1.2.7: 创建 `InterestCircle` / `CircleMembership` / `CircleTopic` / `CircleReply` Entity
  - [x] SubTask 1.2.8: 创建 `PostShare` Entity（对应post_shares表）
  - [x] SubTask 1.2.9: 新建 `RecommendationPreference` Entity + Flyway迁移脚本
  - [x] SubTask 1.2.10: 新建 `PrivateConversation` / `PrivateMessage` Entity + Flyway迁移脚本
  - [x] SubTask 1.2.11: 新建 `UserSession` Entity + Flyway迁移脚本（JWT token管理）
  - **验证**：所有Entity与数据库表结构一致，JPA验证通过

- [x] Task 1.3: Repository层创建
  - [x] SubTask 1.3.1: 为每个Entity创建Spring Data JPA Repository接口
  - [x] SubTask 1.3.2: 添加必要的自定义查询方法（如按用户查推荐、按分类查帖子等）
  - [x] SubTask 1.3.3: 添加分页查询支持
  - **验证**：Repository可正常CRUD操作

- [x] Task 1.4: 微信登录真实对接
  - [x] SubTask 1.4.1: 添加微信开放平台HTTP客户端配置（appid/secret）
  - [x] SubTask 1.4.2: 实现 `AuthService.loginWithWechat()` 真实code2Session调用
  - [x] SubTask 1.4.3: 实现JWT token生成和验证
  - [x] SubTask 1.4.4: 实现session_key解密（用户信息解密）
  - [x] SubTask 1.4.5: 保留 `@Profile("mock")` 下的Mock登录逻辑
  - **验证**：微信登录真实可用，JWT token有效

- [x] Task 1.5: MockRuntimeState替换
  - [x] SubTask 1.5.1: 将 `MockRuntimeState` 标记为 `@Profile("mock")`
  - [x] SubTask 1.5.2: 创建 `@Profile("real")` 下的真实Service实现
  - [x] SubTask 1.5.3: 确保所有Controller通过接口注入Service，不直接依赖Mock
  - **验证**：`real` Profile下应用正常运行，无MockRuntimeState依赖

---

## Phase 2: 核心社交功能后端实现

- [x] Task 2.1: 推荐引擎实现
  - [x] SubTask 2.1.1: 实现 `RecommendationService.generateDailyRecommendations()` — 基于同校优先、兴趣匹配、课表空闲时间加权排序
  - [x] SubTask 2.1.2: 实现每日限额逻辑（10次/天，跨天重置）
  - [x] SubTask 2.1.3: 实现时间门控刷新逻辑（基于用户偏好时间点）
  - [x] SubTask 2.1.4: 实现推荐偏好设置API（`GET/PUT /api/recommendations/preferences`）
  - [x] SubTask 2.1.5: 实现推荐历史记录API（`GET /api/recommendations/cards/history`）
  - [x] SubTask 2.1.6: 实现排除逻辑（已喜欢/已拒绝用户不出现在推荐中）
  - [x] SubTask 2.1.7: 更新 `docs/openapi/recommendations.yaml` 补充偏好设置Schema
  - **验证**：推荐API返回基于算法排序的真实数据，偏好设置可影响推荐结果

- [x] Task 2.2: 村口社区后端实现
  - [x] SubTask 2.2.1: 实现 `VillageService` 帖子CRUD（发布/详情/列表/删除）
  - [x] SubTask 2.2.2: 实现评论/点赞/转发逻辑
  - [x] SubTask 2.2.3: 实现分类筛选（全部/兴趣圈/诚意帖/同乡/蒙面/最新）
  - [x] SubTask 2.2.4: 实现三标签排序（关注/同城/发现），同城标签下同校优先
  - [x] SubTask 2.2.5: 实现帖子转发API（`POST /api/posts/{id}/share`）
  - [x] SubTask 2.2.6: 实现帖子互动时自动生成通知
  - [x] SubTask 2.2.7: 更新 `docs/openapi/village.yaml` 补充完整Schema
  - **验证**：村口CRUD和互动API全部可用，分类筛选和排序正确

- [x] Task 2.3: 喜欢与心动信号实现
  - [x] SubTask 2.3.1: 实现 `MatchService` 喜欢/取消喜欢逻辑
  - [x] SubTask 2.3.2: 实现双向喜欢检测 → 自动生成心动信号
  - [x] SubTask 2.3.3: 实现访客记录逻辑（查看资料时自动记录）
  - [x] SubTask 2.3.4: 实现心动信号24h过期机制
  - [x] SubTask 2.3.5: 实现喜欢我的/访客列表API
  - [x] SubTask 2.3.6: 心动信号生成时触发通知
  - **验证**：喜欢→双向匹配→心动信号→通知 完整链路可用

- [x] Task 2.4: 私信系统实现
  - [x] SubTask 2.4.1: 实现私信会话创建/列表API
  - [x] SubTask 2.4.2: 实现私信消息发送/接收API
  - [x] SubTask 2.4.3: 实现消息已读/未读状态
  - [x] SubTask 2.4.4: 实现联系方式交换状态机（保留已有TempChatService逻辑）
  - [x] SubTask 2.4.5: 私信与临时聊天双轨并行（私信为长期，临时为24h匿名）
  - [x] SubTask 2.4.6: 更新 `docs/openapi` 补充私信Schema
  - **验证**：私信会话创建、消息收发、已读状态全部可用

- [x] Task 2.5: 通知系统实现
  - [x] SubTask 2.5.1: 实现 `NotificationService` 通知生成逻辑
  - [x] SubTask 2.5.2: 关注/点赞/评论/访客/心动信号 → 自动生成对应类型通知
  - [x] SubTask 2.5.3: 实现通知列表API（`GET /api/notifications`）
  - [x] SubTask 2.5.4: 实现未读计数API（`GET /api/notifications/unread-count`）
  - [x] SubTask 2.5.5: 实现标记已读API（`PUT /api/notifications/{id}/read`）
  - [x] SubTask 2.5.6: 实现心动信号过期提醒（剩余<2h时生成提醒通知）
  - **验证**：互动操作后通知正确生成，未读计数准确

---

## Phase 3: 在线社交互动功能

- [x] Task 3.1: 兴趣圈后端实现
  - [x] SubTask 3.1.1: 实现 `CircleService` 兴趣圈列表/加入/退出逻辑
  - [x] SubTask 3.1.2: 实现圈内话题发布/列表/详情API
  - [x] SubTask 3.1.3: 实现话题回复API
  - [x] SubTask 3.1.4: 实现村口"兴趣圈"分类联动（精选话题推送到村口）
  - [x] SubTask 3.1.5: 更新 `docs/openapi/village.yaml` 补充兴趣圈Schema
  - **验证**：兴趣圈完整CRUD可用，村口联动正常

- [ ] Task 3.2: 兴趣圈前端实现
  - [ ] SubTask 3.2.1: 创建兴趣圈Store（`stores/circle.ts`）
  - [ ] SubTask 3.2.2: 创建兴趣圈列表页（`pages/circles/index.vue`，在 `pages.json` 注册）
  - [ ] SubTask 3.2.3: 圈列表展示：圈名、图标、成员数、最新话题摘要
  - [ ] SubTask 3.2.4: 加入/退出按钮交互
  - [ ] SubTask 3.2.5: 创建圈内话题列表页（`pages/circles/topics.vue`）
  - [ ] SubTask 3.2.6: 话题列表展示：标题、摘要、回复数、最后回复时间
  - [ ] SubTask 3.2.7: 发布新话题：标题+正文+可选图片
  - [ ] SubTask 3.2.8: 话题详情+回复列表：展示所有回复，支持回复
  - [ ] SubTask 3.2.9: 在"我的"页功能菜单中增加"兴趣圈"入口
  - **验证**：兴趣圈完整链路（加入→浏览话题→回复→从村口发现）可用

- [x] Task 3.3: 每日一问后端实现
  - [x] SubTask 3.3.1: 实现 `DailyQuestionService` 今日问题获取逻辑
  - [x] SubTask 3.3.2: 实现回答提交API（支持匿名标记）
  - [x] SubTask 3.3.3: 实现回答列表API（回答后可见他人回答）
  - [x] SubTask 3.3.4: 实现基于共同回答的推荐加分逻辑
  - [x] SubTask 3.3.5: 更新 `docs/openapi/recommendations.yaml` 补充每日一问Schema
  - **验证**：每日一问API完整可用，匿名功能正常

- [ ] Task 3.4: 每日一问前端实现
  - [ ] SubTask 3.4.1: 创建每日一问Store（`stores/daily-question.ts`）
  - [ ] SubTask 3.4.2: 在寻觅页（卡片用完后）展示"每日一问"卡片
  - [ ] SubTask 3.4.3: 回答输入页：问题展示 + 输入框 + 匿名开关 + 提交按钮
  - [ ] SubTask 3.4.4: 回答列表页：展示所有回答，支持点击作者头像查看资料
  - [ ] SubTask 3.4.5: 未签到用户看到"签到后解锁"提示
  - **验证**：每日一问可回答和查看，匿名功能正常

- [x] Task 3.5: 同校圈增强
  - [x] SubTask 3.5.1: 村口"同城"标签后端实现同校优先排序逻辑
  - [x] SubTask 3.5.2: 同校帖子展示"校友"标签（后端返回isAlumni字段）
  - [x] SubTask 3.5.3: 推荐算法增加同校加权因子
  - [ ] SubTask 3.5.4: 校园活动日历视图前端实现（列表/日历切换）
  - **验证**：同校内容优先展示，校友标签可见，日历视图正常

---

## Phase 4: 推荐偏好+签到持久化+活动真实化

- [x] Task 4.1: 推荐计划设置页面
  - [x] SubTask 4.1.1: 创建 `subpackages/setup/recommend-pref/index.vue` 完整页面
  - [x] SubTask 4.1.2: 每日推荐时间偏好选择器（10:00/12:00/14:00/18:00）
  - [x] SubTask 4.1.3: 推荐范围选择（同校优先/同城/不限）
  - [x] SubTask 4.1.4: 偏好保存对接 `PUT /api/recommendations/preferences`
  - [x] SubTask 4.1.5: 偏好加载对接 `GET /api/recommendations/preferences`
  - **验证**：推荐偏好设置完整可用，影响推荐结果

- [x] Task 4.2: 签到系统持久化
  - [x] SubTask 4.2.1: `CheckInService` 从内存Mock切换为数据库操作
  - [x] SubTask 4.2.2: 连续签到天数从数据库计算
  - [x] SubTask 4.2.3: 签到后推荐次数增加逻辑持久化
  - [x] SubTask 4.2.4: 前端签到Store对接真实API
  - **验证**：签到记录持久化，服务重启后数据不丢失

- [x] Task 4.3: 活动功能真实化
  - [x] SubTask 4.3.1: 活动Store从Mock数据切换为真实API调用
  - [x] SubTask 4.3.2: 报名功能对接 `POST /api/activities/{id}/enroll`
  - [x] SubTask 4.3.3: 活动详情展示完整信息（描述、报名人数、参与者预览）
  - [x] SubTask 4.3.4: 活动列表支持分页加载
  - [x] SubTask 4.3.5: 寻觅页活动推荐板块数据来源切换
  - **验证**：活动页功能完整，数据来自真实API

---

## Phase 5: 实时通信与前端Store切换

- [x] Task 5.1: WebSocket集成
  - [x] SubTask 5.1.1: 添加Spring WebSocket + STOMP依赖
  - [x] SubTask 5.1.2: 配置WebSocket端点和消息代理
  - [x] SubTask 5.1.3: 实现私信实时推送（发送消息时通过WebSocket推送到接收方）
  - [x] SubTask 5.1.4: 实现心动信号实时通知推送
  - [x] SubTask 5.1.5: 实现互动通知实时推送
  - [ ] SubTask 5.1.6: 前端WebSocket客户端集成（uni-app兼容方案）
  - **验证**：私信和通知实时送达

- [ ] Task 5.2: 前端Store从Mock切换为真实API
  - [ ] SubTask 5.2.1: `discover.ts` — 推荐卡片从Mock切换为真实API
  - [ ] SubTask 5.2.2: `likes.ts` — 喜欢/访客从Mock切换为真实API
  - [ ] SubTask 5.2.3: `village.ts` — 帖子列表从Mock切换为真实API
  - [ ] SubTask 5.2.4: `messages.ts` — 消息列表从Mock切换为真实API
  - [ ] SubTask 5.2.5: `profile.ts` — 个人资料从Mock切换为真实API
  - [ ] SubTask 5.2.6: `activity.ts` — 活动从Mock切换为真实API
  - [ ] SubTask 5.2.7: `checkin.ts` — 签到从Mock切换为真实API
  - [ ] SubTask 5.2.8: 保留 `VITE_API_MODE=mock` 作为开发环境回退
  - **验证**：`real` 模式下所有Store使用真实API，`mock` 模式下回退到Mock数据

- [x] Task 5.3: HTTP客户端增强
  - [x] SubTask 5.3.1: 统一错误处理（网络错误/业务错误/鉴权失败分类）
  - [x] SubTask 5.3.2: JWT token自动附加到请求头
  - [x] SubTask 5.3.3: 401响应自动刷新token + 重试请求
  - [x] SubTask 5.3.4: 请求超时和重试机制
  - **验证**：token过期自动刷新，网络错误友好提示

- [x] Task 5.4: 前后端数据模型对齐
  - [x] SubTask 5.4.1: 从OpenAPI YAML重新生成 `api-types.ts`
  - [x] SubTask 5.4.2: 替换Store中手动定义的类型为生成类型
  - [x] SubTask 5.4.3: 修复 `CheckInStatusResponse` 等字段名不一致问题
  - [x] SubTask 5.4.4: 修复 `history.vue` 中硬编码Mock数据
  - **验证**：前后端类型定义完全一致

---

## Phase 6: 代码清理与全链路验证

- [x] Task 6.1: 废弃代码清理
  - [x] SubTask 6.1.1: 移除 `pages/home/index.vue` 及相关配置
  - [x] SubTask 6.1.2: 移除 `pages/match/index.vue` 及相关配置
  - [x] SubTask 6.1.3: 移除 `stores/home.ts`
  - [x] SubTask 6.1.4: 移除 `stores/match.ts`
  - [x] SubTask 6.1.5: 移除 `config/home-sections.ts`、`config/match-form.ts`（已标记@deprecated）
  - [x] SubTask 6.1.6: 移除 `debug/MatchDebugController`、`debug/ErrorSimulationController`（生产环境）
  - **验证**：无废弃代码残留，应用正常运行

- [ ] Task 6.2: 全链路验证
  - [ ] SubTask 6.2.1: 微信登录 → 学校认证 → 资料完善 → 解锁功能 完整链路
  - [ ] SubTask 6.2.2: 寻觅 → 喜欢 → 心动信号 → 私信 完整链路
  - [ ] SubTask 6.2.3: 村口 → 发帖 → 评论 → 点赞 → 转发 完整链路
  - [ ] SubTask 6.2.4: 兴趣圈 → 加入 → 话题 → 回复 → 村口展示 完整链路
  - [ ] SubTask 6.2.5: 签到 → 每日一问 → 回答 → 发现匹配 → 私信 完整链路
  - [ ] SubTask 6.2.6: 活动 → 列表 → 日历 → 详情 → 报名 完整链路
  - [ ] SubTask 6.2.7: 推荐偏好设置 → 影响推荐结果 完整链路
  - [ ] SubTask 6.2.8: 互动提醒 → 通知 → 跳转 完整链路
  - [ ] SubTask 6.2.9: 服务重启后数据保留验证
  - **验证**：所有链路在真实数据模式下正常运行

- [ ] Task 6.3: 回归验证
  - [ ] SubTask 6.3.1: 大学生模式（学校认证/同乡分类/同校圈）不受影响
  - [ ] SubTask 6.3.2: 资料完善硬门槛正常生效
  - [ ] SubTask 6.3.3: 推荐计划设置完整保留
  - [ ] SubTask 6.3.4: 线下活动功能完整保留
  - [ ] SubTask 6.3.5: Mock模式仍可作为开发回退使用
  - [ ] SubTask 6.3.6: 无游戏化元素和购物功能
  - **验证**：所有已有功能完整可用，约束条件满足

---

# Task Dependencies

- Task 1.1 → Task 1.2（数据源配置依赖）
- Task 1.2 → Task 1.3（Entity创建依赖）
- Task 1.3 → Task 1.5（Repository创建依赖，才能替换MockRuntimeState）
- Task 1.4 独立于 1.2-1.3（微信登录可并行开发）
- Task 2.1-2.5 均依赖 Task 1.3（需要Repository层）
- Task 3.1-3.5 均依赖 Task 1.3（需要Repository层）
- Task 4.1 依赖 Task 2.1（推荐偏好需要推荐API）
- Task 4.2 依赖 Task 1.3（签到持久化需要Repository）
- Task 4.3 依赖 Task 1.3（活动真实化需要Repository）
- Task 5.1 依赖 Task 2.4 + 2.5（WebSocket需要私信和通知Service）
- Task 5.2 依赖 Task 2.1-2.5 + 3.1-3.5 + 4.1-4.3（所有后端API就绪后才能切换）
- Task 5.3 独立（HTTP客户端增强可并行）
- Task 5.4 依赖 Task 2.1-2.5（后端API稳定后对齐类型）
- Task 6.1 独立（代码清理可并行）
- Task 6.2 依赖 Task 5.2（前端Store切换完成后全链路验证）
- Task 6.3 依赖 Task 6.2

# 可并行执行的任务组

- **组A**：Task 1.1 + Task 1.4（数据源配置 + 微信登录，无依赖）
- **组B**：Task 1.2 + Task 1.3（Entity + Repository，依赖组A的1.1）
- **组C**：Task 2.1 + 2.2 + 2.3 + 2.4 + 2.5（核心社交后端，依赖组B，可全部并行）
- **组D**：Task 3.1 + 3.3（兴趣圈+每日一问后端，依赖组B，可与组C并行）
- **组E**：Task 3.2 + 3.4（兴趣圈+每日一问前端，依赖组D）
- **组F**：Task 4.1 + 4.2 + 4.3（推荐偏好+签到+活动，依赖组C部分完成）
- **组G**：Task 5.1 + 5.3（WebSocket + HTTP增强，可与组E/F并行）
- **组H**：Task 5.2 + 5.4（Store切换 + 类型对齐，依赖组C+D+E+F完成）
- **组I**：Task 6.1（代码清理，可与组H并行）
- **组J**：Task 6.2 + 6.3（全链路验证，依赖所有任务完成）

# 开发时间线建议

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Week 1 | Phase 1: 数据层基础设施 + 微信登录 | M1: 数据层就绪，登录可用 |
| Week 2-3 | Phase 2: 核心社交后端（推荐+村口+喜欢+私信+通知） | M2: 核心社交闭环可用 |
| Week 3-4 | Phase 3: 在线社交互动（兴趣圈+每日一问+同校圈） | M3: 在线社交三大模块可用 |
| Week 4 | Phase 4: 推荐偏好+签到持久化+活动真实化 | M4: 增强功能完整 |
| Week 5 | Phase 5: WebSocket+Store切换+类型对齐 | M5: 实时消息可用，前端切真实API |
| Week 6 | Phase 6: 代码清理+全链路验证+回归测试 | M6: 全部验收通过 |

# 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 2 | 数据层+Service+API+WebSocket |
| 前端开发 | 1 | Store切换+新页面+组件调整 |
| 全栈/联调 | 1 | OpenAPI维护+前后端联调+集成测试 |
| 测试/QA | 1 | 测试用例+回归测试+验收 |
