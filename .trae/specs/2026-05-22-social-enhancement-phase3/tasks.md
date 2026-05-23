# Tasks

## Phase 1: 线下活动真实化（Week 1）

- [x] Task 1.1: 活动数据模型真实化
  - [x] SubTask 1.1.1: 更新 `ActivityRecommendationView`，增加活动描述、报名人数、参与者预览字段
  - [x] SubTask 1.1.2: 在 `RecommendationController` 新增 `POST /api/activities/{id}/enroll` 报名接口
  - [x] SubTask 1.1.3: 在 `RecommendationService` 实现活动报名逻辑（记录用户-活动关联）
  - [x] SubTask 1.1.4: 创建 Flyway 迁移脚本 `V2026.05.23.0001__create_activity_enrollments.sql`
  - **验证**：API 可正常返回活动列表和报名状态

- [x] Task 1.2: 活动 Store 真实化
  - [x] SubTask 1.2.1: 移除 `activity.ts` 中硬编码的 `mockActivities` 数据
  - [x] SubTask 1.2.2: 对接 `GET /api/recommendations/activities` 真实 API
  - [x] SubTask 1.2.3: 对接 `POST /api/activities/{id}/enroll` 报名 API
  - [x] SubTask 1.2.4: 生成/更新 `api-types.ts` 中活动相关类型定义
  - **验证**：活动列表从 API 加载，报名状态持久化

- [x] Task 1.3: 活动页增强
  - [x] SubTask 1.3.1: 活动列表增加报名人数展示
  - [x] SubTask 1.3.2: 实现分页加载（下拉刷新 + 上拉加载更多）
  - [x] SubTask 1.3.3: 活动详情展示完整描述信息
  - [x] SubTask 1.3.4: 更新寻觅页活动推荐板块数据来源
  - **验证**：活动页功能完整，数据来自真实API

---

## Phase 2: 村口帖子详情增强（Week 1）

- [x] Task 2.1: 帖子详情页作者交互卡片
  - [x] SubTask 2.1.1: 在 `village/detail.vue` 顶部添加作者交互卡片组件
  - [x] SubTask 2.1.2: 作者卡片展示：头像、昵称、学校标签、兴趣标签
  - [x] SubTask 2.1.3: 关注/取消关注按钮（复用 village store 已有 followUser 方法）
  - [x] SubTask 2.1.4: 一键私信按钮 → 创建或跳转私信会话
  - **验证**：帖子详情页顶部展示完整作者信息，关注和私信功能可用

- [x] Task 2.2: 帖子转发功能
  - [x] SubTask 2.2.1: 创建 `post_shares` 数据表（Flyway 迁移脚本）
  - [x] SubTask 2.2.2: 后端新增 `POST /api/posts/{id}/share` 转发接口
  - [x] SubTask 2.2.3: 帖子详情页增加"转发"按钮
  - [x] SubTask 2.2.4: 转发弹窗：确认转发 + 可选附加评论
  - [x] SubTask 2.2.5: 转发计数展示
  - **验证**：帖子可转发，转发后原帖转发计数递增

---

## Phase 3: 互动提醒系统（Week 1-2）

- [x] Task 3.1: 后端互动通知生成
  - [x] SubTask 3.1.1: 在关注/点赞/评论操作时触发通知创建
  - [x] SubTask 3.1.2: 访客记录时自动生成访客通知
  - [x] SubTask 3.1.3: 心动信号创建时自动生成匹配通知
  - [x] SubTask 3.1.4: 更新 `GET /api/messages/notifications` 接口返回互动通知
  - **验证**：互动操作后消息页出现对应通知

- [x] Task 3.2: 前端通知展示
  - [x] SubTask 3.2.1: 消息页系统通知列表增加互动类型（关注/点赞/评论/访客）
  - [x] SubTask 3.2.2: 每种通知类型展示对应图标和文案
  - [x] SubTask 3.2.3: 通知点击跳转到对应内容（帖子详情/用户资料）
  - [x] SubTask 3.2.4: 未读通知红点 + TabBar 红点
  - [x] SubTask 3.2.5: 心动信号过期提醒（剩余<2h时推送+UI高亮）
  - **验证**：互动通知正确展示，跳转正常

---

## Phase 4: 每日一问（Week 2）

- [x] Task 4.1: 每日一问后端 API
  - [x] SubTask 4.1.1: 创建 `daily_questions` 和 `daily_answers` 数据表（Flyway 迁移脚本）
  - [x] SubTask 4.1.2: 新增 `GET /api/daily-question/today` 获取今日问题
  - [x] SubTask 4.1.3: 新增 `POST /api/daily-question/answer` 提交回答
  - [x] SubTask 4.1.4: 新增 `GET /api/daily-question/answers` 获取回答列表
  - [x] SubTask 4.1.5: 支持匿名回答标记
  - [x] SubTask 4.1.6: 更新 `docs/openapi/recommendations.yaml`，新增每日一问 Schema
  - **验证**：API 可正常获取问题、提交和查看回答

- [x] Task 4.2: 每日一向前端实现
  - [x] SubTask 4.2.1: 创建每日一问 Store（`stores/daily-question.ts`）
  - [x] SubTask 4.2.2: 在寻觅页（卡片用完后）展示"每日一问"卡片
  - [x] SubTask 4.2.3: 回答输入页：问题展示 + 输入框 + 匿名开关 + 提交按钮
  - [x] SubTask 4.2.4: 回答列表页：展示所有回答，支持点击作者头像查看资料
  - [x] SubTask 4.2.5: 未签到用户看到"签到后解锁"提示
  - **验证**：每日一问可回答和查看，匿名功能正常

---

## Phase 5: 话题圈 / 兴趣圈（Week 2-3）

- [x] Task 5.1: 话题圈后端 API
  - [x] SubTask 5.1.1: 创建 `interest_circles`、`circle_memberships`、`circle_topics`、`circle_replies` 数据表（Flyway 迁移脚本）
  - [x] SubTask 5.1.2: 新增 `GET /api/circles` 获取兴趣圈列表
  - [x] SubTask 5.1.3: 新增 `POST /api/circles/{id}/join` 加入兴趣圈
  - [x] SubTask 5.1.4: 新增 `GET /api/circles/{id}/topics` 获取圈内话题
  - [x] SubTask 5.1.5: 新增 `POST /api/circles/{id}/topics` 发布新话题
  - [x] SubTask 5.1.6: 新增 `GET /api/circles/topics/{id}/replies` 获取话题回复
  - [x] SubTask 5.1.7: 新增 `POST /api/circles/topics/{id}/replies` 回复话题
  - [x] SubTask 5.1.8: 村口"兴趣圈"分类对接兴趣圈精选话题
  - [x] SubTask 5.1.9: 更新 `docs/openapi/village.yaml`，新增兴趣圈 Schema
  - **验证**：兴趣圈 API 完整可用

- [x] Task 5.2: 话题圈前端实现
  - [x] SubTask 5.2.1: 创建兴趣圈 Store（`stores/circle.ts`）
  - [x] SubTask 5.2.2: 创建兴趣圈列表页（`pages/circles/index.vue`，在 `pages.json` 注册）
  - [x] SubTask 5.2.3: 圈列表展示：圈名、图标、成员数、最新话题摘要
  - [x] SubTask 5.2.4: 加入/退出按钮交互
  - [x] SubTask 5.2.5: 创建圈内话题列表页（`pages/circles/topics.vue`）
  - [x] SubTask 5.2.6: 话题列表展示：标题、摘要、回复数、最后回复时间
  - [x] SubTask 5.2.7: 发布新话题：标题+正文+可选图片
  - [x] SubTask 5.2.8: 话题详情+回复列表：展示所有回复，支持回复
  - [x] SubTask 5.2.9: 在"我的"页功能菜单中增加"兴趣圈"入口
  - **验证**：兴趣圈完整链路（加入→浏览话题→回复→从村口发现）可用

---

## Phase 6: 同校圈与校园场景（Week 2-3）

- [x] Task 6.1: 同校内容流实现
  - [x] SubTask 6.1.1: 村口"同城"标签增加同校优先逻辑（基于 campusName 过滤）
  - [x] SubTask 6.1.2: 同校帖子展示"校友"标签
  - [x] SubTask 6.1.3: 推荐算法增加同校加权
  - **验证**：同校内容优先展示，校友标签可见

- [x] Task 6.2: 校园活动日历
  - [x] SubTask 6.2.1: 在活动页增加"列表/日历"视图切换
  - [x] SubTask 6.2.2: 日历视图：以月历形式展示活动日期
  - [x] SubTask 6.2.3: 日期上标注活动标题（点击进入详情）
  - [x] SubTask 6.2.4: 同校用户可见参与意向标记
  - **验证**：日历视图正常展示，可切换回列表视图

---

## Phase 7: 日常签到（Week 3）

- [x] Task 7.1: 签到后端 API
  - [x] SubTask 7.1.1: 创建 `check_ins` 数据表（Flyway 迁移脚本）
  - [x] SubTask 7.1.2: 新增 `POST /api/check-in` 签到接口
  - [x] SubTask 7.1.3: 新增 `GET /api/check-in/status` 获取今日签到状态和连续天数
  - [x] SubTask 7.1.4: 签到成功后增加当日推荐剩余次数
  - [x] SubTask 7.1.5: 更新 `docs/openapi` 签到相关 Schema
  - **验证**：签到 API 正常，连续天数计算正确

- [x] Task 7.2: 签到前端实现
  - [x] SubTask 7.2.1: 在寻觅页顶部增加签到入口（今日未签到时展示）
  - [x] SubTask 7.2.2: 签到后展示签到成功动画 + 连续天数
  - [x] SubTask 7.2.3: 签到后显示"今日剩余次数+N"
  - [x] SubTask 7.2.4: 签到后解锁"每日一问"入口
  - [x] SubTask 7.2.5: 连续签到天数展示（仅天数显示，无等级/积分标记）
  - **验证**：签到流程完整，推荐次数正确增加

---

## Phase 8: 联调与验证（Week 3-4）

- [x] Task 8.1: 全链路验证
  - [x] SubTask 8.1.1: 签到→每日一问→回答→发现匹配→私信 完整链路
  - [x] SubTask 8.1.2: 兴趣圈→加入→话题→回复→村口展示 完整链路
  - [x] SubTask 8.1.3: 活动→列表→日历→详情→报名 完整链路
  - [x] SubTask 8.1.4: 帖子→详情→作者卡片→私信→转发 完整链路
  - [x] SubTask 8.1.5: 互动提醒→通知→跳转 完整链路
  - [x] SubTask 8.1.6: mock 模式全链路通过
  - **验证**：所有新链路在 mock 模式下正常运行

- [x] Task 8.2: 已有功能回归验证
  - [x] SubTask 8.2.1: 寻觅→喜欢→心动信号→私信 链路不受影响
  - [x] SubTask 8.2.2: 村口→发帖→评论→点赞 链路不受影响
  - [x] SubTask 8.2.3: 资料完善→解锁功能 链路不受影响
  - [x] SubTask 8.2.4: 推荐计划设置 功能不受影响
  - [x] SubTask 8.2.5: 大学生模式（学校认证/同乡分类）不受影响
  - **验证**：所有已有功能完整可用

# Task Dependencies

- Task 1.1 → Task 1.2、1.3（活动数据模型依赖）
- Task 3.1 → Task 3.2（后端通知生成依赖）
- Task 4.1 → Task 4.2（每日一问后端 API 依赖）
- Task 5.1 → Task 5.2（话题圈后端 API 依赖）
- Task 7.1 → Task 7.2（签到后端 API 依赖）
- Task 8.1 依赖所有功能开发完成
- Task 8.2 依赖所有功能开发完成

# 可并行执行的任务组

- **组A**：Task 1.1、Task 2.1、Task 3.1、Task 4.1、Task 5.1、Task 6.1、Task 7.1（后端API开发，可全部并行）
- **组B**：Task 2.2、Task 6.2（独立前端功能，可与后端并行）
- **组C**：Task 1.2、1.3（依赖 Task 1.1）
- **组D**：Task 4.2（依赖 Task 4.1、Task 7.2）
- **组E**：Task 5.2（依赖 Task 5.1）
- **组F**：Task 7.2（依赖 Task 7.1）

# 开发时间线建议

| 阶段   | 内容                                                   | 预估周期 | 里程碑                           |
| ------ | ------------------------------------------------------ | -------- | -------------------------------- |
| Week 1 | Phase 1-2-3：活动真实化 + 帖子增强 + 互动提醒后台      | 5-7天    | M1: 活动/帖子/通知联调通过       |
| Week 2 | Phase 4-5-6：每日一问 + 兴趣圈 + 同校圈                | 5-7天    | M2: 在线社交三大模块通过         |
| Week 3 | Phase 7 + Phase 8部分：签到 + 联调                     | 5-7天    | M3: 签到+全链路通过              |
| Week 4 | Phase 8完整：回归验证 + Bug修复 + 性能优化             | 3-5天    | M4: 全部验收通过，可发布         |

# 团队配置建议

| 角色           | 人数 | 职责                                   |
| -------------- | ---- | -------------------------------------- |
| 后端开发       | 2    | API开发、数据表设计、业务逻辑          |
| 前端开发       | 2    | 页面开发、组件编写、Store管理           |
| 全栈/联调      | 1    | OpenAPI维护、前后端联调、集成测试      |
| 测试/QA        | 1    | 测试用例编写、回归测试、验收           |