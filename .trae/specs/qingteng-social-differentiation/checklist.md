# Checklist

## Phase 1: P0战略项 — 社交升温漏斗 + 校园差异化体系

### 社交升温漏斗
- [x] `social_progress` 表创建成功（Flyway迁移通过）
- [x] `SocialProgressService.getProgress()` 返回正确升温层级
- [x] `SocialProgressService.updateProgress()` 在社交事件后正确更新
- [x] 升温事件定义完整（L1曝光→L2关注→L3匹配→L4沟通→L5圈子→L6场景）
- [x] `SocialProgressIndicator.vue` 组件渲染正常
- [x] 寻觅页嵌入升温引导入口
- [x] "我的"页嵌入升温进度追踪卡片
- [x] 新用户首次进入展示升温路径引导浮层
- [x] 匹配成功后智能引导面板展示（3个破冰话题+共同圈子+推荐活动）
- [x] `icebreaker_templates` 表创建成功并预置种子数据
- [x] `IcebreakerService.getMatchIcebreakers()` 基于双方兴趣生成破冰话题

### 校园差异化体系
- [x] `campus_topics` 表创建成功（Flyway迁移通过）
- [x] `campus_certifications` 表创建成功（Flyway迁移通过）
- [x] `CampusService.getCampusTopics()` 查询校园话题（支持分类筛选）
- [x] `CampusService.createCampusTopic()` 创建校园话题
- [x] `CampusService.replyCampusTopic()` 回复校园话题
- [x] `CampusService.getCampusPosts()` 查询本校用户帖子
- [x] `CampusService.getCampusActivities()` 查询本校活动
- [x] `CampusCertificationService.submitCertification()` 提交认证申请
- [x] `CampusCertificationService.reviewCertification()` 审核认证申请
- [x] `CampusCertificationService.getCertificationStatus()` 查询认证状态
- [x] 前端学生证上传页面可用
- [x] 前端认证状态展示正确
- [x] 校园社交专区首页（campus/index.vue）完整可用
- [x] 校园话题列表（分类Tab切换）可用
- [x] 校园话题详情页可用
- [x] 校园话题发布页可用
- [x] TabBar新增"校园"入口（或村口校园子Tab）

### 同校优先推荐
- [x] `RealRecommendationService.calculateScore()` 增加同校权重+30%
- [x] 同专业权重+20分
- [x] 共同兴趣圈权重+5分/圈
- [x] 推荐卡片中展示"同校""同专业"标签
- [x] 推荐范围设置中新增"校园优先"选项
- [x] 同校/同专业用户在推荐结果中排序靠前

---

## Phase 2: P1核心项 — 回流留存 + 破冰互动增强

### 社交动态摘要推送
- [x] `push_preferences` 表创建成功
- [x] `push_summaries` 表创建成功
- [x] `PushSummaryService.generateSummary()` 生成正确摘要
- [x] 摘要包含访客数、喜欢数、互动数
- [x] `PushSummaryService.schedulePush()` 基于活跃时段调度
- [x] 微信服务通知模板配置正确
- [ ] 离线6h后推送触发正常
- [x] 推送内容合规（遵守微信服务通知规范）
- [x] 推送频率可配置（默认每日最多1次）

### 签到价值增强
- [x] 签到后推荐配额+5次
- [x] 签到后解锁"热门话题"查看
- [x] 签到后解锁"新入圈用户"查看
- [x] 前端签到结果页展示解锁权益详情
- [x] 前端推荐配额展示签到加量标识
- [x] 权益仅当日有效，次日重置

### 破冰话题模板
- [x] `icebreaker_templates` 表包含预置模板数据
- [x] `IcebreakerService.getProfileBasedIcebreakers()` 生成个性化破冰话术
- [x] 私信页集成破冰话题推荐组件
- [x] "一键发送"破冰话题功能可用
- [x] 输入框停留5秒后展示话题模板提示
- [x] 兴趣圈回复旁有"打个招呼"按钮
- [x] 点击"打招呼"预填基于话题的破冰文案
- [x] 跳转私信页展示引用话题内容

### 社交信号分类通知
- [x] 通知分为"社交信号"和"内容信号"两类
- [x] 社交信号红色标记（喜欢/访客/心动信号）
- [x] 内容信号蓝色标记（评论/点赞/关注/回复）
- [x] 前端通知列表支持按类型筛选
- [x] 前端通知列表视觉区分两类信号

---

## Phase 3: P2增强项 — 内容分类 + 质量体系

### 村口六分类
- [x] 村口帖子的六分类查询可用（全部/兴趣圈/诚意帖/同乡/校园/最新）
- [x] "同乡"分类基于家乡/学校地域匹配
- [x] "校园"分类仅对已认证用户展示
- [x] 前端村口页六分类Tab切换流畅
- [x] 默认展示"全部"分类
- [x] 用户上次选择被记忆

### 话题标签系统
- [x] `post_tags` 表创建成功（Flyway迁移通过）
- [x] `PostTagService.getTags()` 返回预置标签列表
- [x] `PostTagService.getPostsByTag()` 按标签查询帖子
- [x] 前端发帖页话题标签选择器可用（最多选3个）
- [x] 前端帖子列表展示话题标签
- [x] 前端帖子详情展示话题标签
- [x] 标签点击跳转到该标签下帖子聚合页

### 互动触点增强
- [x] 帖子详情作者区域有"关注""私信"快捷按钮
- [x] 同校用户展示"校友"标签
- [x] 共同兴趣用户展示共同兴趣标签
- [x] 帖子底部推荐1-2位"相似作者"
- [x] 相似作者推荐算法可用

### 内容审核
- [x] 敏感词过滤对帖子生效
- [x] 敏感词过滤对评论生效
- [x] 敏感词过滤对私信生效
- [x] 敏感词过滤对话题回复生效
- [x] 敏感词配置可动态更新
- [x] 前端输入时实时敏感词提示

---

## Phase 4: 全链路验证 + 回归测试

### 全链路验证（Real模式）
- [ ] 新用户引导→资料认证→社交升温L1入口 完整链路
- [ ] 寻觅→喜欢→匹配→破冰引导→私信 完整链路
- [ ] 兴趣圈→回复→打招呼→私信 完整链路
- [ ] 校园认证→同校圈→校园话题→同校推荐 完整链路
- [ ] 签到→解锁权益→热门话题→新入圈用户 完整链路
- [ ] 村口六分类→标签发帖→互动触点→相似作者 完整链路
- [ ] 社交动态摘要→推送→点击回流入应用 完整链路
- [ ] 社交升温进度→个人中心查看→"下一步"指引 完整链路

### 回归验证
- [ ] 卡片滑动推荐功能不受影响
- [ ] 喜欢/访客/心动信号功能不受影响
- [ ] 村口社区原功能不受影响
- [ ] 私信/临时聊天原功能不受影响
- [ ] 兴趣圈原功能不受影响
- [ ] 每日一问原功能不受影响
- [ ] 活动报名原功能不受影响
- [ ] 反馈中心原功能不受影响
- [ ] 推荐计划设置原功能不受影响
- [ ] Mock模式仍可作为开发回退使用

### 大学生模式专属验证
- [ ] 未认证用户校园话题仅可浏览不可发布
- [ ] 已认证用户校园功能全部可用
- [ ] 同校圈内容仅同校用户可互动
- [ ] 同校/同专业标签正确展示
- [ ] 同校优先推荐算法生效
- [ ] 校园社交专区独立于村口社区

---

## 关键约束验证

- [x] 社交互动为核心（升温漏斗+破冰+校园社交+社区互动 完整闭环）
- [x] 大学生模式完整保留并增强（校园认证/同校圈/校园话题/校园活动/同校优先）
- [x] 推荐方案设置完整保留且可影响推荐规则
- [x] 线下活动作为L6场景层核心载体保留
- [x] 线上社交互动（破冰+兴趣圈联动+校园话题+私信模板+互动触点）功能可用
- [x] 用户留存机制（推送摘要+签到增强+回流提醒）生效
- [x] 无游戏化元素（积分/等级/排行榜/成就徽章/虚拟货币）
- [x] 无购物功能（商城/付费/虚拟物品/会员订阅）
- [x] 无过度竞争（PK排名/人气榜/颜值评分）
- [x] 所有新增功能基于现有Real服务架构，数据持久化到数据库
- [x] 前后端数据模型一致
- [x] 所有新增Service在Real模式下不抛UnsupportedOperationException
- [x] Mock/Real双模式兼容

---

## 项目当前状态审查结论

### 已有功能基础（7期重构后）
基于对当前项目的全面审查，以下核心功能已在之前7个Spec中完整实现：

| 功能 | 前端 | 后端Real | 数据库 | 状态 |
|------|------|----------|--------|------|
| 微信登录 | ✅ | ✅ RealAuthService | ✅ | 可用 |
| 卡片滑动推荐 | ✅ | ✅ RealRecommendationService | ✅ | 可用 |
| 喜欢/访客 | ✅ | ✅ RealMatchService | ✅ | 可用 |
| 心动信号 | ✅ | ✅ RealMatchService | ✅ | 可用 |
| 村口社区 | ✅ | ✅ RealVillageService | ✅ | 可用 |
| 私信 | ✅ | ✅ RealPrivateMessageService | ✅ | 可用 |
| 临时聊天 | ✅ | ✅ RealTempChatService | ✅ | 可用 |
| 兴趣圈 | ✅ | ✅ RealCircleService | ✅ | 可用 |
| 每日一问 | ✅ | ✅ RealDailyQuestionService | ✅ | 可用 |
| 签到 | ✅ | ✅ RealCheckInService | ✅ | 可用 |
| 活动 | ✅ | ✅ RealActivityService | ✅ | 可用 |
| 反馈 | ✅ | ✅ RealFeedbackService | ✅ | 可用 |
| 个人资料 | ✅ | ✅ RealProfileService | ✅ | 可用 |
| 推荐计划 | ✅ | ✅ 完整 | ✅ | 可用 |
| 关注关系 | ✅ | ✅ user_follows表 | ✅ | 可用 |
| WebSocket | ✅ | ✅ STOMP | — | 可用 |

### 审查结论
当前项目已具备青藤之恋的核心功能基底，所有基础社交功能均实现Real服务驱动。本方案（qingteng-social-differentiation）聚焦于在坚实基础上构建**差异化社交体验层**——6层升温漏斗、校园社交场景、智能破冰系统、回流留存机制——将项目从"功能对等"提升至"体验超越"。