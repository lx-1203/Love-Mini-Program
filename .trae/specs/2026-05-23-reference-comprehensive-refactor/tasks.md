# Tasks

## Phase 1: P0核心项 — 二级社交功能Real服务实现

- [x] Task 1.1: 实现RealCircleService兴趣圈完整服务
  - [x] SubTask 1.1.1: 创建 `RealCircleService.java`，实现 `@Profile("real")` 注解
  - [x] SubTask 1.1.2: 实现 `getCircles()` — 查询所有兴趣圈，含成员数和最新话题摘要
  - [x] SubTask 1.1.3: 实现 `joinCircle(circleId)` — 创建CircleMembership记录，成员数+1
  - [x] SubTask 1.1.4: 实现 `leaveCircle(circleId)` — 删除CircleMembership记录，成员数-1
  - [x] SubTask 1.1.5: 实现 `getTopics(circleId)` — 查询圈内话题列表（分页）
  - [x] SubTask 1.1.6: 实现 `createTopic(circleId, title, content, images)` — 创建CircleTopic记录
  - [x] SubTask 1.1.7: 实现 `getTopicDetail(topicId)` — 查询话题详情+回复列表
  - [x] SubTask 1.1.8: 实现 `replyToTopic(topicId, content)` — 创建CircleReply记录
  - [x] SubTask 1.1.9: 实现 `getMembers(circleId)` — 查询圈子成员列表
  - [x] SubTask 1.1.10: 验证兴趣圈完整链路：列表→加入→发话题→回复→退出
  - **验证**：Real模式下兴趣圈全部功能可用，数据持久化到数据库

- [x] Task 1.2: 实现RealDailyQuestionService每日一问完整服务
  - [x] SubTask 1.2.1: 创建 `RealDailyQuestionService.java`，实现 `@Profile("real")` 注解
  - [x] SubTask 1.2.2: 实现 `getTodayQuestion()` — 查询当日DailyQuestion记录
  - [x] SubTask 1.2.3: 实现 `submitAnswer(questionId, content, isAnonymous)` — 创建DailyAnswer记录
  - [x] SubTask 1.2.4: 实现 `getAnswers(questionId)` — 查询问题回答列表（分页）
  - [x] SubTask 1.2.5: 实现 `getUserAnswer(questionId, userId)` — 查询用户是否已回答
  - [x] SubTask 1.2.6: 匿名回答支持：isAnonymous=true时返回"匿名用户"而非真实昵称
  - [x] SubTask 1.2.7: 验证每日一问完整链路：获取问题→回答→查看他人回答
  - **验证**：Real模式下每日一问全部功能可用，匿名回答正确展示

- [x] Task 1.3: 实现RealCheckInService签到完整服务
  - [x] SubTask 1.3.1: 创建 `RealCheckInService.java`，实现 `@Profile("real")` 注解
  - [x] SubTask 1.3.2: 实现 `checkIn(userId)` — 创建CheckIn记录（日期+用户ID，唯一约束）
  - [x] SubTask 1.3.3: 实现 `getCheckInStatus(userId)` — 返回今日是否已签到+连续天数
  - [x] SubTask 1.3.4: 实现 `getStreakDays(userId)` — 计算连续签到天数
  - [x] SubTask 1.3.5: 实现 `getMonthlyCalendar(userId, yearMonth)` — 返回本月签到日历
  - [x] SubTask 1.3.6: 签到后额外推荐机会逻辑（+3次/天，非积分/等级）
  - [x] SubTask 1.3.7: 验证签到完整链路：签到→状态查询→连续天数→日历
  - **验证**：Real模式下签到功能可用，连续天数正确计算，额外推荐机会生效

---

## Phase 2: P1核心项 — 数据模型修复与推荐增强

- [x] Task 2.1: Flyway迁移修复heart_signals表
  - [x] SubTask 2.1.1: 创建迁移脚本 `V2026.05.26.0001__alter_heart_signals_add_match_type.sql`
  - [x] SubTask 2.1.2: 添加 `match_type VARCHAR(20) DEFAULT 'mutual_like'` 列
  - [x] SubTask 2.1.3: 验证迁移脚本执行成功，RealMatchService.createMatchSignal()不再报错
  - **验证**：heart_signals表包含match_type列，心动信号创建正常

- [x] Task 2.2: 补全推荐服务兴趣标签匹配
  - [x] SubTask 2.2.1: 创建迁移脚本 `V2026.05.26.0002__alter_user_basic_profile_add_interest_tags.sql`
  - [x] SubTask 2.2.2: 添加 `interest_tags JSON` 列到user_basic_profile表
  - [x] SubTask 2.2.3: 修改UserBasicProfile Entity添加interestTags字段（List<String>类型）
  - [x] SubTask 2.2.4: 修改RealRecommendationService.calculateScore()启用兴趣标签匹配（每个共同标签+10分）
  - [x] SubTask 2.2.5: 验证有共同兴趣标签的用户在推荐中排序靠前
  - **验证**：推荐算法包含兴趣标签维度，标签匹配影响排序

- [x] Task 2.3: 实现帖子点赞去重机制
  - [x] SubTask 2.3.1: 创建迁移脚本 `V2026.05.26.0003__create_post_likes.sql`
  - [x] SubTask 2.3.2: 创建post_likes表（user_id, post_id, created_at，联合唯一约束）
  - [x] SubTask 2.3.3: 创建PostLike Entity和PostLikeRepository
  - [x] SubTask 2.3.4: 修改RealVillageService.likePost() — 先查询是否已点赞，已点赞则取消
  - [x] SubTask 2.3.5: 前端适配：点赞按钮状态根据用户点赞记录切换
  - [x] SubTask 2.3.6: 验证点赞/取消点赞正常，无重复点赞
  - **验证**：帖子点赞可取消，无重复记录，点赞数正确

- [x] Task 2.4: 前端Store Real模式全量验证
  - [x] SubTask 2.4.1: 验证 `discover.ts` Real模式下推荐卡片API调用正常
  - [x] SubTask 2.4.2: 验证 `likes.ts` Real模式下喜欢/访客API调用正常
  - [x] SubTask 2.4.3: 验证 `village.ts` Real模式下帖子列表API调用正常
  - [x] SubTask 2.4.4: 验证 `messages.ts` Real模式下消息列表API调用正常
  - [x] SubTask 2.4.5: 验证 `profile.ts` Real模式下个人资料API调用正常
  - [x] SubTask 2.4.6: 验证 `activity.ts` Real模式下活动API调用正常
  - [x] SubTask 2.4.7: 验证 `checkin.ts` Real模式下签到API调用正常
  - [x] SubTask 2.4.8: 验证 `circle.ts` Real模式下兴趣圈API调用正常
  - [x] SubTask 2.4.9: 验证 `daily-question.ts` Real模式下每日一问API调用正常
  - [x] SubTask 2.4.10: 修复验证过程中发现的API调用/数据格式/错误处理问题
  - **验证**：所有Store在Real模式下正常工作，数据正确展示

---

## Phase 3: P1增强项 — 临时聊天Real服务

- [x] Task 3.1: 实现RealTempChatService临时聊天完整服务
  - [x] SubTask 3.1.1: 创建 `RealTempChatService.java`，实现 `@Profile("real")` 注解
  - [x] SubTask 3.1.2: 实现 `createSession(userId1, userId2)` — 创建TempChatSession，设置24h过期
  - [x] SubTask 3.1.3: 实现 `sendMessage(sessionId, senderId, content)` — 创建TempChatMessage，WebSocket推送
  - [x] SubTask 3.1.4: 实现 `getMessages(sessionId)` — 查询会话消息列表（分页）
  - [x] SubTask 3.1.5: 实现 `getSession(sessionId)` — 查询会话详情+倒计时
  - [x] SubTask 3.1.6: 实现 `exchangeContact(sessionId, userId)` — 创建TempChatContactExchange
  - [x] SubTask 3.1.7: 实现24h过期检查逻辑 — 过期会话消息不可见
  - [x] SubTask 3.1.8: 验证临时聊天完整链路：创建会话→发消息→24h倒计时→联系方式交换
  - **验证**：Real模式下临时聊天功能可用，24h过期机制正常

---

## Phase 4: P2增强项 — 推荐与匹配优化

- [x] Task 4.1: 实现推荐讨论内容和推荐历史
  - [x] SubTask 4.1.1: 实现 `getDiscussions()` — 基于用户兴趣和热门话题返回讨论列表
  - [x] SubTask 4.1.2: 实现 `getHistory()` — 返回用户历史推荐记录
  - [x] SubTask 4.1.3: 验证讨论推荐和历史API返回真实数据
  - **验证**：讨论推荐和历史不再返回空列表

- [x] Task 4.2: 优化匹配算法
  - [x] SubTask 4.2.1: 替换 `findAll()` 为分页查询（PageRequest + Specification）
  - [x] SubTask 4.2.2: 实现基于推荐分数的加权排序选择
  - [x] SubTask 4.2.3: 排除已喜欢/已有信号的用户
  - [x] SubTask 4.2.4: 验证匹配结果质量提升
  - **验证**：匹配算法不再全量随机，性能和匹配质量提升

- [x] Task 4.3: profile.ts添加Mock模式支持
  - [x] SubTask 4.3.1: 在profile.ts中添加Mock数据分支
  - [x] SubTask 4.3.2: Mock模式下返回本地硬编码资料数据
  - [x] SubTask 4.3.3: 验证Mock模式下个人中心正常展示
  - **验证**：profile.ts在Mock模式下正常工作

---

## Phase 5: P3清理与全链路验证

- [x] Task 5.1: 代码清理
  - [x] SubTask 5.1.1: Village Store实现分页加载
  - [x] SubTask 5.1.2: 清理Phase 1兼容方法中的硬编码用户ID `1L`
  - [x] SubTask 5.1.3: 清理两套pages.json中的冗余注释
  - **验证**：代码无冗余，分页正常，无硬编码用户ID

- [x] Task 5.2: 全链路验证（Real模式）
  - [x] SubTask 5.2.1: 微信登录 → 学校认证 → 资料完善 → 解锁功能 完整链路
  - [x] SubTask 5.2.2: 寻觅 → 喜欢 → 心动信号 → 私信 完整链路
  - [x] SubTask 5.2.3: 村口 → 发帖 → 评论 → 点赞 → 转发 完整链路
  - [x] SubTask 5.2.4: 兴趣圈 → 加入 → 话题 → 回复 → 村口展示 完整链路
  - [x] SubTask 5.2.5: 签到 → 每日一问 → 回答 → 发现匹配 → 私信 完整链路
  - [x] SubTask 5.2.6: 活动 → 列表 → 详情 → 报名 完整链路
  - [x] SubTask 5.2.7: 临时聊天 → 创建 → 发消息 → 联系方式交换 完整链路
  - [x] SubTask 5.2.8: 推荐偏好设置 → 影响推荐结果 完整链路
  - [x] SubTask 5.2.9: 互动提醒 → 通知 → 跳转 完整链路
  - [x] SubTask 5.2.10: 服务重启后数据保留验证
  - **验证**：所有链路在Real模式下正常运行

- [x] Task 5.3: 回归验证
  - [x] SubTask 5.3.1: 大学生模式（学校认证/同乡分类/同校圈）不受影响
  - [x] SubTask 5.3.2: 资料完善硬门槛正常生效
  - [x] SubTask 5.3.3: 推荐计划设置完整保留
  - [x] SubTask 5.3.4: 线下活动功能完整保留
  - [x] SubTask 5.3.5: Mock模式仍可作为开发回退使用
  - [x] SubTask 5.3.6: 无游戏化元素和购物功能
  - **验证**：所有已有功能完整可用，约束条件满足

---

# Task Dependencies

- Task 1.1 + 1.2 + 1.3 可并行（三个独立Real服务）
- Task 2.1 独立（数据库迁移）
- Task 2.2 独立（推荐标签匹配）
- Task 2.3 独立（点赞去重）
- Task 2.4 依赖 Task 1.1-1.3（Store验证需要后端Real服务可用）
- Task 3.1 独立（临时聊天Real服务）
- Task 4.1 依赖 Task 2.2（讨论推荐可能依赖标签匹配）
- Task 4.2 独立（匹配算法优化）
- Task 4.3 独立（profile Mock支持）
- Task 5.2 依赖所有前置任务
- Task 5.3 依赖 Task 5.2

# 可并行执行的任务组

- **组A**：Task 1.1 + 1.2 + 1.3 + 2.1 + 2.2 + 2.3（全部独立，可完全并行）
- **组B**：Task 2.4 + 3.1 + 4.1 + 4.2 + 4.3（依赖组A部分完成，可并行）
- **组C**：Task 5.1（独立，可与组B并行）
- **组D**：Task 5.2 + 5.3（依赖所有任务完成）

# 开发时间线建议

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Day 1-2 | Phase 1: 二级社交功能Real服务（兴趣圈+每日一问+签到） | M1: 二级社交功能Real可用 |
| Day 3-4 | Phase 2: 数据模型修复+推荐增强+Store验证 | M2: 数据模型完整+推荐全维度 |
| Day 5 | Phase 3: 临时聊天Real服务 | M3: 全功能Real可用 |
| Day 6 | Phase 4: 推荐优化+匹配优化+profile Mock | M4: 功能完善 |
| Day 7 | Phase 5: 清理+全链路验证+回归测试 | M5: 全部验收通过 |

# 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1 | RealCircleService+RealDailyQuestionService+RealCheckInService+RealTempChatService+数据模型修复+推荐增强 |
| 前端开发 | 1 | Store Real验证+修复+profile Mock+点赞去重前端适配+分页 |
| 全栈/联调 | 1 | 匹配优化+讨论推荐+联调测试+回归验证 |
