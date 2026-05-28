# Tasks

## Phase 1: P0战略项 — 社交升温漏斗 + 校园差异化体系

### Task 1.1: 实现社交升温漏斗后端服务
- [x] SubTask 1.1.1: 创建 `SocialProgressService.java` — 管理用户社交升温状态
- [x] SubTask 1.1.2: 实现 `getProgress(userId)` — 查询用户当前升温层级和各项计数
- [x] SubTask 1.1.3: 实现 `updateProgress(userId, eventType)` — 社交事件触发进度更新
- [x] SubTask 1.1.4: 定义升温层级枚举（L1曝光→L2关注→L3匹配→L4沟通→L5圈子→L6场景）
- [x] SubTask 1.1.5: 创建Flyway迁移脚本创建 `social_progress` 表
- [x] SubTask 1.1.6: 在各Service的关键社交事件点嵌入 `updateProgress` 调用
- **验证**：用户执行社交操作后，升温状态正确更新

### Task 1.2: 实现社交升温漏斗前端UI
- [x] SubTask 1.2.1: 创建 `SocialProgressIndicator.vue` 组件 — 6层漏斗可视化展示
- [x] SubTask 1.2.2: 在寻觅页（home/index.vue）嵌入升温引导入口
- [x] SubTask 1.2.3: 在"我的"页（profile/index.vue）嵌入升温进度追踪卡片
- [x] SubTask 1.2.4: 新用户首次进入寻觅页展示升温路径引导浮层
- [x] SubTask 1.2.5: 创建 `social-progress` Store管理升温状态
- **验证**：升温漏斗UI完整展示，用户可看到自己的社交进度

### Task 1.3: 实现匹配后智能引导
- [x] SubTask 1.3.1: 后端实现 `IcebreakerService.getMatchIcebreakers(userId, matchUserId)` — 基于双方兴趣生成3个破冰话题
- [x] SubTask 1.3.2: 后端实现 `getCommonCircles(userId, matchUserId)` — 查询双方共同兴趣圈
- [x] SubTask 1.3.3: 后端实现 `getSuggestedActivities(userId, matchUserId)` — 推荐双方可能感兴趣的活动
- [x] SubTask 1.3.4: 前端实现匹配成功后展示智能引导面板（破冰话题+共同圈子+推荐活动）
- [x] SubTask 1.3.5: 创建Flyway迁移脚本创建 `icebreaker_templates` 表并预置种子数据
- **验证**：匹配成功后自动展示3个破冰话题、共同圈子、推荐活动

### Task 1.4: 实现校园社交后端服务
- [x] SubTask 1.4.1: 创建 `CampusService.java` — 校园社交核心服务
- [x] SubTask 1.4.2: 实现 `getCampusTopics(schoolId, category)` — 查询校园话题列表（支持分类筛选）
- [x] SubTask 1.4.3: 实现 `createCampusTopic(userId, schoolId, category, title, content)` — 创建校园话题
- [x] SubTask 1.4.4: 实现 `replyCampusTopic(topicId, userId, content)` — 回复校园话题
- [x] SubTask 1.4.5: 实现 `getCampusPosts(schoolId)` — 查询本校用户帖子
- [x] SubTask 1.4.6: 实现 `getCampusActivities(schoolId)` — 查询本校活动
- [x] SubTask 1.4.7: 创建Flyway迁移脚本创建 `campus_topics` 表
- **验证**：校园话题CRUD完整可用，同校圈内容流正常

### Task 1.5: 实现校园认证增强
- [x] SubTask 1.5.1: 创建 `CampusCertificationService.java` — 校园认证服务
- [x] SubTask 1.5.2: 实现 `submitCertification(userId, schoolName, major, studentIdCardUrl)` — 提交认证申请
- [x] SubTask 1.5.3: 实现 `reviewCertification(certId, status, reviewerId)` — 审核认证申请
- [x] SubTask 1.5.4: 实现 `getCertificationStatus(userId)` — 查询认证状态
- [x] SubTask 1.5.5: 前端实现学生证上传页面和认证状态展示
- [x] SubTask 1.5.6: 创建Flyway迁移脚本创建 `campus_certifications` 表
- **验证**：学生证上传+审核流程完整可用

### Task 1.6: 实现校园社交前端专区
- [x] SubTask 1.6.1: 创建 `pages/campus/index.vue` — 校园社交专区首页
- [x] SubTask 1.6.2: 创建校园话题列表组件（分类Tab切换）
- [x] SubTask 1.6.3: 创建校园话题详情页（话题内容+回复列表）
- [x] SubTask 1.6.4: 创建校园话题发布页
- [x] SubTask 1.6.5: 在TabBar中新增"校园"入口（或在村口中增加校园子Tab）
- [x] SubTask 1.6.6: 创建 `campus` Store管理校园社交状态
- **验证**：校园社交专区完整可用，与村口社区独立并存

### Task 1.7: 实现同校优先推荐算法增强
- [x] SubTask 1.7.1: 修改 `RealRecommendationService.calculateScore()` — 增加同校权重+30%
- [x] SubTask 1.7.2: 增加同专业权重+20分
- [x] SubTask 1.7.3: 增加共同兴趣圈权重+5分/圈
- [x] SubTask 1.7.4: 在推荐卡片中展示"同校""同专业"标签
- [x] SubTask 1.7.5: 推荐范围设置中新增"校园优先"选项
- **验证**：同校/同专业用户在推荐中排序靠前，标签正确展示

---

## Phase 2: P1核心项 — 回流留存 + 破冰互动增强

### Task 2.1: 实现社交动态摘要推送
- [x] SubTask 2.1.1: 创建 `PushSummaryService.java` — 推送摘要生成服务
- [x] SubTask 2.1.2: 实现 `generateSummary(userId)` — 生成社交动态摘要（访客数/喜欢数/互动数）
- [x] SubTask 2.1.3: 实现 `schedulePush(userId)` — 基于用户活跃时段调度推送
- [x] SubTask 2.1.4: 创建 `PushPreferenceService.java` — 推送偏好管理
- [x] SubTask 2.1.5: 实现微信服务通知模板配置和发送
- [x] SubTask 2.1.6: 创建Flyway迁移脚本创建 `push_preferences` 和 `push_summaries` 表
- **验证**：离线6h后生成正确摘要，推送触发正常

### Task 2.2: 实现签到价值增强
- [x] SubTask 2.2.1: 修改 `RealCheckInService.checkIn()` — 签到后增加推荐配额+5次
- [x] SubTask 2.2.2: 实现签到后解锁"热门话题"查询
- [x] SubTask 2.2.3: 实现签到后解锁"新入圈用户"查询
- [x] SubTask 2.2.4: 前端签到结果页展示解锁权益详情
- [x] SubTask 2.2.5: 前端推荐配额展示签到加量标识
- **验证**：签到后推荐配额+5，热门话题和新入圈用户可查看

### Task 2.3: 实现私信破冰话题模板
- [x] SubTask 2.3.1: 修改 `IcebreakerService` — 增加基于对方资料的破冰话题生成
- [x] SubTask 2.3.2: 实现 `getProfileBasedIcebreakers(userId, peerUserId)` — 生成个性化破冰话术
- [x] SubTask 2.3.3: 前端私信页（chat-session）集成破冰话题推荐组件
- [x] SubTask 2.3.4: 实现"一键发送"破冰话题功能
- [x] SubTask 2.3.5: 实现输入框停留5秒后展示话题模板提示
- **验证**：私信界面展示破冰话题，一键发送正常

### Task 2.4: 实现兴趣圈破冰联动
- [x] SubTask 2.4.1: 在兴趣圈回复旁增加"打个招呼"按钮
- [x] SubTask 2.4.2: 点击后预填基于话题上下文的破冰文案
- [x] SubTask 2.4.3: 跳转私信页并展示引用话题内容
- [x] SubTask 2.4.4: 后端支持引用话题内容的私信格式
- **验证**：兴趣圈回复→打招呼→私信 完整链路可用

### Task 2.5: 实现社交信号分类通知
- [x] SubTask 2.5.1: 修改 `RealNotificationService` — 增加通知分类标签（社交信号/内容信号）
- [x] SubTask 2.5.2: 社交信号：红色标记（喜欢/访客/心动信号）
- [x] SubTask 2.5.3: 内容信号：蓝色标记（评论/点赞/关注/回复）
- [x] SubTask 2.5.4: 前端通知列表支持按类型筛选
- [x] SubTask 2.5.5: 前端通知列表视觉区分两类信号
- **验证**：通知正确分类，筛选功能可用

---

## Phase 3: P2增强项 — 内容分类 + 质量体系

### Task 3.1: 实现村口六分类扩展
- [x] SubTask 3.1.1: 后端实现村口帖子的六分类查询（全部/兴趣圈/诚意帖/同乡/校园/最新）
- [x] SubTask 3.1.2: "同乡"分类：基于用户家乡/学校地域匹配
- [x] SubTask 3.1.3: "校园"分类：仅对已完成校园认证用户展示本校帖子
- [x] SubTask 3.1.4: 前端村口页改造为六分类Tab切换
- [x] SubTask 3.1.5: 默认展示"全部"分类，记忆用户上次选择
- **验证**：六分类Tab切换流畅，各分类内容正确

### Task 3.2: 实现帖子话题标签系统
- [x] SubTask 3.2.1: 创建 `PostTagService.java` — 话题标签管理服务
- [x] SubTask 3.2.2: 实现 `getTags()` — 获取预置话题标签列表
- [x] SubTask 3.2.3: 实现 `getPostsByTag(tagName)` — 按标签查询帖子
- [x] SubTask 3.2.4: 前端发帖页增加话题标签选择器（最多选3个）
- [x] SubTask 3.2.5: 前端帖子列表和详情展示话题标签
- [x] SubTask 3.2.6: 前端标签点击跳转到该标签下帖子列表
- [x] SubTask 3.2.7: 创建Flyway迁移脚本创建 `post_tags` 表
- **验证**：发帖可选标签，标签可点击查看聚合帖子

### Task 3.3: 实现村口互动触点增强
- [x] SubTask 3.3.1: 帖子详情作者区域增加"关注""私信"快捷按钮
- [x] SubTask 3.3.2: 同校用户展示"校友"标签
- [x] SubTask 3.3.3: 共同兴趣用户展示共同兴趣标签
- [x] SubTask 3.3.4: 帖子底部推荐1-2位"相似作者"
- [x] SubTask 3.3.5: 后端实现相似作者推荐算法
- **验证**：帖子详情互动触点完整，相似作者推荐可用

### Task 3.4: 实现内容审核基础能力
- [x] SubTask 3.4.1: 集成敏感词过滤（帖子/评论/私信/话题）
- [x] SubTask 3.4.2: 实现敏感词配置管理（可动态更新）
- [x] SubTask 3.4.3: 前端输入时实时敏感词提示
- **验证**：敏感词内容被过滤，前端实时提示

---

## Phase 4: 全链路验证 + 回归测试

### Task 4.1: 全链路验证（Real模式）
- [ ] SubTask 4.1.1: 新用户引导→资料认证→社交升温L1入口 完整链路
- [ ] SubTask 4.1.2: 寻觅→喜欢→匹配→破冰引导→私信 完整链路
- [ ] SubTask 4.1.3: 兴趣圈→回复→打招呼→私信 完整链路
- [ ] SubTask 4.1.4: 校园认证→同校圈→校园话题→同校推荐 完整链路
- [ ] SubTask 4.1.5: 签到→解锁权益→热门话题→新入圈用户 完整链路
- [ ] SubTask 4.1.6: 村口六分类→标签发帖→互动触点→相似作者 完整链路
- [ ] SubTask 4.1.7: 社交动态摘要→推送→点击回流入应用 完整链路
- [ ] SubTask 4.1.8: 社交升温进度→个人中心查看→"下一步"指引 完整链路
- **验证**：所有新增链路在Real模式下正常运行

### Task 4.2: 回归验证
- [ ] SubTask 4.2.1: 卡片滑动推荐功能不受影响
- [ ] SubTask 4.2.2: 喜欢/访客/心动信号功能不受影响
- [ ] SubTask 4.2.3: 村口社区原功能不受影响
- [ ] SubTask 4.2.4: 私信/临时聊天原功能不受影响
- [ ] SubTask 4.2.5: 兴趣圈原功能不受影响
- [ ] SubTask 4.2.6: 每日一问原功能不受影响
- [ ] SubTask 4.2.7: 活动报名原功能不受影响
- [ ] SubTask 4.2.8: 反馈中心原功能不受影响
- [ ] SubTask 4.2.9: 推荐计划设置原功能不受影响
- [ ] SubTask 4.2.10: Mock模式仍可作为开发回退使用
- [ ] SubTask 4.2.11: 无游戏化元素（积分/等级/排行榜/成就徽章）
- [ ] SubTask 4.2.12: 无购物功能（商城/付费/虚拟物品）

### Task 4.3: 大学生模式专属验证
- [ ] SubTask 4.3.1: 未认证用户校园话题仅可浏览不可发布
- [ ] SubTask 4.3.2: 已认证用户校园功能全部可用
- [ ] SubTask 4.3.3: 同校圈内容仅同校用户可互动
- [ ] SubTask 4.3.4: 同校/同专业标签正确展示
- [ ] SubTask 4.3.5: 同校优先推荐算法生效
- [ ] SubTask 4.3.6: 校园社交专区独立于村口社区

---

# Task Dependencies

- Task 1.1（升温后端）独立，优先执行
- Task 1.2（升温前端）依赖 Task 1.1
- Task 1.3（匹配智能引导）独立于 1.1/1.2
- Task 1.4（校园后端）独立
- Task 1.5（校园认证）独立
- Task 1.6（校园前端）依赖 Task 1.4 + 1.5
- Task 1.7（推荐算法增强）依赖 Task 1.4
- Task 2.1（推送摘要）独立
- Task 2.2（签到增强）独立
- Task 2.3（私信破冰）依赖 Task 1.3
- Task 2.4（兴趣圈联动）独立
- Task 2.5（通知分类）独立
- Task 3.1（村口分类）独立
- Task 3.2（标签系统）独立
- Task 3.3（互动增强）依赖 Task 1.4
- Task 3.4（内容审核）独立
- Task 4.1（全链路验证）依赖所有前置任务
- Task 4.2（回归验证）依赖所有前置任务
- Task 4.3（校园验证）依赖 Task 1.4 + 1.5 + 1.6

# 可并行执行的任务组

- **组A**（Phase 1 后端并行）：Task 1.1 + 1.3 + 1.4 + 1.5
- **组B**（Phase 1 前端并行）：Task 1.2 + 1.6 + 1.7（依赖组A）
- **组C**（Phase 2 全部并行）：Task 2.1 + 2.2 + 2.3 + 2.4 + 2.5
- **组D**（Phase 3 全部并行）：Task 3.1 + 3.2 + 3.3 + 3.4
- **组E**（Phase 4 全部并行）：Task 4.1 + 4.2 + 4.3

# 开发时间线建议

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Day 1-2 | Phase 1 组A：后端服务（升温+校园+认证+引导） | M1-1: 后端核心服务就绪 |
| Day 3-4 | Phase 1 组B：前端UI（升温漏斗+校园专区+算法） | M1: 核心差异化能力上线 |
| Day 5-6 | Phase 2：回流留存+破冰互动增强 | M2: 留存和互动能力上线 |
| Day 7 | Phase 3：内容分类+质量体系 | M3: 内容体验升级 |
| Day 8-9 | Phase 4：全链路验证+回归测试 | M4: 全部验收通过 |

# 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1-2 | 升温服务+校园服务+认证服务+破冰服务+推送服务+推荐增强+内容审核 |
| 前端开发 | 1-2 | 升温UI+校园专区+破冰UI+村口分类+互动增强+标签系统 |
| 全栈/联调 | 1 | 数据模型迁移+联调测试+全链路验证+回归 |