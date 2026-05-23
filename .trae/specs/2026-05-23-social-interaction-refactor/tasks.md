# Tasks

## Phase 1: P0阻塞项 — RealHomeService首页数据聚合实现

- [x] Task 1.1: 实现RealHomeService.getDashboard()数据聚合
  - [x] SubTask 1.1.1: 注入RecommendationService/CheckInService/DailyQuestionService/ActivityService/VillageService依赖
  - [x] SubTask 1.1.2: 实现推荐人物卡片聚合 — 调用RecommendationService.getRecommendations(userId)
  - [x] SubTask 1.1.3: 实现签到状态聚合 — 调用CheckInService.getCheckInStatus(userId)
  - [x] SubTask 1.1.4: 实现每日一问聚合 — 调用DailyQuestionService.getTodayQuestion()
  - [x] SubTask 1.1.5: 实现活动推荐聚合 — 调用ActivityService.getActivities(campusFilter)
  - [x] SubTask 1.1.6: 实现村口热门帖子聚合 — 调用VillageService获取热门帖子（限制3条）
  - [x] SubTask 1.1.7: 组装DashboardView返回对象，包含所有聚合数据
  - **验证**：首页展示真实聚合数据，非空占位

- [x] Task 1.2: 前端首页数据展示对接
  - [x] SubTask 1.2.1: 验证前端Store（discover.ts/home store）能正确接收DashboardView数据
  - [x] SubTask 1.2.2: 验证首页各模块（推荐卡片/签到/每日一问/活动/村口热门）正常渲染
  - [x] SubTask 1.2.3: 验证首页加载性能（聚合查询响应时间<1s）
  - **验证**：首页完整展示真实数据，用户体验流畅

---

## Phase 2: P1核心项 — 推荐偏好持久化 + AppConfig数据库驱动 + 分页修复

- [x] Task 2.1: 实现推荐偏好持久化
  - [x] SubTask 2.1.1: 实现RealRecommendationService.getPreferences(userId) — 从recommendation_preferences表读取用户偏好
  - [x] SubTask 2.1.2: 实现RealRecommendationService.updatePreferences(userId, data) — 将偏好持久化到recommendation_preferences表
  - [x] SubTask 2.1.3: 无偏好记录时返回默认偏好（同校优先/中午12点刷新）
  - [x] SubTask 2.1.4: 偏好影响推荐排序 — 同校优先时校区匹配用户排序靠前
  - [x] SubTask 2.1.5: 验证推荐计划设置页 → 保存偏好 → 重新加载偏好 → 推荐结果变化 完整链路
  - **验证**：推荐偏好可持久化保存和读取，并影响推荐结果

- [x] Task 2.2: 实现RealAppConfigService数据库驱动
  - [x] SubTask 2.2.1: 注入AppConfigRepository依赖
  - [x] SubTask 2.2.2: 实现getLoginHeroConfig()从app_config表读取配置
  - [x] SubTask 2.2.3: 数据库无配置时返回默认值（不抛异常）
  - [x] SubTask 2.2.4: 验证登录页主视觉配置从数据库动态加载
  - **验证**：AppConfig从数据库读取，可动态管理

- [x] Task 2.3: 修复getDiscussions()分页查询
  - [x] SubTask 2.3.1: 替换circleTopicRepository.findAll()为分页查询（PageRequest.of(page, size)）
  - [x] SubTask 2.3.2: 添加按创建时间倒序排序
  - [x] SubTask 2.3.3: 默认每页20条
  - [x] SubTask 2.3.4: 验证讨论列表分页加载正常
  - **验证**：讨论列表使用分页查询，不再全表扫描

---

## Phase 3: P1质量项 — Phase 1兼容层清理

- [x] Task 3.1: 移除DEFAULT_USER_ID回退值
  - [x] SubTask 3.1.1: RealProfileService — 移除DEFAULT_USER_ID=1L，SecurityUtils.getCurrentUserId()未认证时抛401
  - [x] SubTask 3.1.2: RealVillageService — 移除DEFAULT_USER_ID=1L，Phase 1兼容方法改为从SecurityContext获取
  - [x] SubTask 3.1.3: RealTempChatService — 移除resolveCurrentUserId()中的回退逻辑
  - [x] SubTask 3.1.4: RealMatchService — 检查并移除DEFAULT_USER_ID回退（无此问题）
  - [x] SubTask 3.1.5: 统一SecurityUtils.getCurrentUserId()行为：未认证返回401而非默认值
  - [x] SubTask 3.1.6: 验证所有API在未认证时返回401，不使用默认用户
  - **验证**：所有操作归属当前登录用户，无默认用户回退

- [x] Task 3.2: 清理TODO注释和占位代码
  - [x] SubTask 3.2.1: 清理RealHomeService中的"TODO: Phase 2"注释
  - [x] SubTask 3.2.2: 清理RealAppConfigService中的"TODO: Phase 2"注释
  - [x] SubTask 3.2.3: 验证代码中无遗留TODO占位
  - **验证**：代码整洁，无遗留占位注释

---

## Phase 4: 新增功能 — 在线社交互动增强

- [x] Task 4.1: 在线状态感知功能
  - [x] SubTask 4.1.1: 创建Flyway迁移脚本 V2026.05.30.0002__create_user_online_status.sql
  - [x] SubTask 4.1.2: 创建UserOnlineStatus实体和Repository
  - [x] SubTask 4.1.3: 实现WebSocket心跳机制 — 客户端每30秒发送心跳，服务端更新last_heartbeat
  - [x] SubTask 4.1.4: 实现在线状态查询API — GET /api/users/{userId}/online-status
  - [x] SubTask 4.1.5: 实现批量在线状态查询API — POST /api/users/online-status/batch
  - [x] SubTask 4.1.6: 实现离线状态自动更新 — 超过5分钟无心跳标记为offline
  - [x] SubTask 4.1.7: 前端推荐卡片和私信列表展示在线状态标识（绿色圆点/灰色圆点）
  - [x] SubTask 4.1.8: 前端Store添加在线状态管理
  - **验证**：在线状态正确展示，5分钟超时自动标记离线

- [x] Task 4.2: 匹配破冰引导功能
  - [x] SubTask 4.2.1: 创建Flyway迁移脚本 V2026.05.30.0003__create_icebreaker_topics.sql
  - [x] SubTask 4.2.2: 创建IcebreakerTopic实体和Repository
  - [x] SubTask 4.2.3: 插入通用破冰话题种子数据（20+条）
  - [x] SubTask 4.2.4: 实现破冰话题推荐API — GET /api/matches/{matchId}/icebreakers
  - [x] SubTask 4.2.5: 破冰话题生成逻辑：优先共同兴趣标签 → 每日一问共同回答 → 通用模板
  - [x] SubTask 4.2.6: 前端心动信号匹配页展示破冰话题推荐
  - [x] SubTask 4.2.7: 点击破冰话题可直接发送到对话中
  - [x] SubTask 4.2.8: 前端Store添加破冰话题管理
  - **验证**：匹配后展示破冰话题，点击可发送到对话

- [x] Task 4.3: 互动提醒增强功能
  - [x] SubTask 4.3.1: 创建Flyway迁移脚本 V2026.05.30.0004__create_interaction_events.sql
  - [x] SubTask 4.3.2: 创建InteractionEvent实体和Repository
  - [x] SubTask 4.3.3: 实现互动事件记录服务 — 在喜欢/访客/关注/点赞/评论/回复时创建事件
  - [x] SubTask 4.3.4: 实现互动事件查询API — GET /api/notifications/interactions
  - [x] SubTask 4.3.5: 实现互动事件WebSocket实时推送
  - [x] SubTask 4.3.6: 前端通知列表展示多维度互动事件（新喜欢/新访客/新关注/帖子被赞/帖子被评论/话题被回复）
  - [x] SubTask 4.3.7: 点击通知直接跳转到对应功能页
  - [x] SubTask 4.3.8: 前端Store添加互动事件管理
  - **验证**：互动事件实时推送，通知列表展示完整，点击可跳转

- [x] Task 4.4: 同校动态流功能
  - [x] SubTask 4.4.1: 实现同校动态聚合API — GET /api/village/campus-feed
  - [x] SubTask 4.4.2: 聚合同校用户最新帖子（限制10条）
  - [x] SubTask 4.4.3: 聚合同校即将开始的活动（限制5条）
  - [x] SubTask 4.4.4: 聚合同校兴趣圈最新话题（限制5条）
  - [x] SubTask 4.4.5: 前端村口页"同城"标签改为"同校"标签（认证用户）
  - [x] SubTask 4.4.6: 前端同校动态流页面展示（帖子+活动+话题混合流）
  - [x] SubTask 4.4.7: 前端Store添加同校动态管理
  - **验证**：同校动态流展示同校帖子/活动/话题，按时间倒序

---

## Phase 5: P2验证与回归 — 全链路验证

- [x] Task 5.1: 全链路端到端验证（Real模式）
  - [x] SubTask 5.1.1: 微信登录 → 资料编辑 → 资料完善度更新
  - [x] SubTask 5.1.2: 首页 → 推荐卡片 → 签到 → 每日一问 → 活动推荐 → 村口热门
  - [x] SubTask 5.1.3: 寻觅 → 喜欢 → 心动信号 → 破冰引导 → 私信
  - [x] SubTask 5.1.4: 村口 → 发帖 → 评论 → 点赞 → 转发
  - [x] SubTask 5.1.5: 兴趣圈 → 加入 → 话题 → 回复
  - [x] SubTask 5.1.6: 签到 → 每日一问 → 回答
  - [x] SubTask 5.1.7: 活动 → 列表 → 详情 → 报名
  - [x] SubTask 5.1.8: 临时聊天 → 创建 → 发消息 → 联系方式交换
  - [x] SubTask 5.1.9: 反馈 → 提交 → 查询历史
  - [x] SubTask 5.1.10: 推荐偏好设置 → 保存 → 影响推荐结果
  - [x] SubTask 5.1.11: 在线状态 → 心跳 → 状态标识 → 超时离线
  - [x] SubTask 5.1.12: 互动提醒 → 事件触发 → 推送通知 → 点击跳转
  - [x] SubTask 5.1.13: 同校动态 → 帖子/活动/话题聚合 → 浏览
  - **验证**：所有链路在Real模式下正常运行

- [x] Task 5.2: Mock模式验证
  - [x] SubTask 5.2.1: 所有Store在Mock模式下正常工作（含新增功能Store）
  - [x] SubTask 5.2.2: Mock模式下前端可独立运行，无需后端服务
  - **验证**：Mock模式全Store可用

- [x] Task 5.3: 回归验证
  - [x] SubTask 5.3.1: 大学生模式（学校认证/同校分类/同校动态）不受影响
  - [x] SubTask 5.3.2: 资料完善硬门槛正常生效
  - [x] SubTask 5.3.3: 推荐计划设置完整保留且可影响推荐规则
  - [x] SubTask 5.3.4: 线下活动功能完整保留
  - [x] SubTask 5.3.5: 无游戏化元素和购物功能
  - **验证**：所有已有功能完整可用，约束条件满足

---

# Task Dependencies

- Task 1.1 + 1.2 顺序执行（后端先实现，前端再对接）
- Task 2.1 + 2.2 + 2.3 可并行（三个独立修复）
- Task 3.1 + 3.2 可并行（两个独立清理）
- Task 4.1 + 4.2 + 4.3 + 4.4 可并行（四个独立新功能）
- Task 5.1 依赖所有前置任务
- Task 5.2 依赖 Task 4.1-4.4（新增功能需Mock模式）
- Task 5.3 依赖 Task 5.1

# 可并行执行的任务组

- **组A**：Task 1.1（HomeService聚合）→ Task 1.2（前端对接）
- **组B**：Task 2.1 + 2.2 + 2.3（全部独立，可完全并行）
- **组C**：Task 3.1 + 3.2（全部独立，可与组B并行）
- **组D**：Task 4.1 + 4.2 + 4.3 + 4.4（全部独立，可与组B/C并行）
- **组E**：Task 5.1 + 5.2 + 5.3（依赖所有任务完成）

# 开发时间线建议

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Day 1-2 | Phase 1: RealHomeService首页数据聚合 | M1: 首页展示真实数据 |
| Day 3-4 | Phase 2: 推荐偏好持久化 + AppConfig + 分页修复 | M2: 推荐设置真实可用 |
| Day 5 | Phase 3: Phase 1兼容层清理 | M3: 用户ID归属正确 |
| Day 6-9 | Phase 4: 在线状态 + 破冰引导 + 互动提醒 + 同校动态 | M4: 社交互动增强 |
| Day 10-11 | Phase 5: 全链路验证 + 回归测试 | M5: 全部验收通过 |

# 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1 | HomeService聚合+偏好持久化+AppConfig+在线状态+破冰引擎+互动事件+同校动态+分页修复+兼容层清理 |
| 前端开发 | 1 | 首页数据展示+在线状态UI+破冰引导UI+互动提醒UI+同校动态流+Store双模式 |
| 全栈/联调 | 1 | 前后端联调+集成测试+回归验证 |
