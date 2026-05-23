# Checklist

## Phase 1: P0核心项 — 二级社交功能Real服务实现

### RealCircleService兴趣圈
- [x] getCircles()从数据库查询兴趣圈列表（含成员数和最新话题摘要）
- [x] joinCircle()创建CircleMembership记录，成员数+1
- [x] leaveCircle()删除CircleMembership记录，成员数-1
- [x] getTopics()查询圈内话题列表（分页）
- [x] createTopic()创建CircleTopic记录
- [x] getTopicDetail()查询话题详情+回复列表
- [x] replyToTopic()创建CircleReply记录
- [x] getMembers()查询圈子成员列表
- [x] Real模式下兴趣圈完整链路可用
- [x] 兴趣圈数据持久化到数据库

### RealDailyQuestionService每日一问
- [x] getTodayQuestion()查询当日DailyQuestion记录
- [x] submitAnswer()创建DailyAnswer记录
- [x] getAnswers()查询问题回答列表（分页）
- [x] getUserAnswer()查询用户是否已回答
- [x] 匿名回答正确展示（isAnonymous=true时显示"匿名用户"）
- [x] Real模式下每日一问完整链路可用
- [x] 每日一问数据持久化到数据库

### RealCheckInService签到
- [x] checkIn()创建CheckIn记录（日期+用户ID唯一约束）
- [x] getCheckInStatus()返回今日是否已签到+连续天数
- [x] getStreakDays()连续签到天数正确计算
- [x] getMonthlyCalendar()返回本月签到日历
- [x] 签到后额外推荐机会+3次/天生效（非积分/等级）
- [x] Real模式下签到完整链路可用
- [x] 签到数据持久化到数据库

---

## Phase 2: P1核心项 — 数据模型修复与推荐增强

### heart_signals表修复
- [x] Flyway迁移脚本执行成功
- [x] heart_signals表包含match_type列
- [x] RealMatchService.createMatchSignal()不再报SQL异常

### 推荐兴趣标签匹配
- [x] user_basic_profile表包含interest_tags列（JSON类型）
- [x] UserBasicProfile Entity包含interestTags字段
- [x] RealRecommendationService.calculateScore()启用兴趣标签匹配
- [x] 共同兴趣标签每个+10分
- [x] 有共同兴趣标签的用户在推荐中排序靠前

### 帖子点赞去重
- [x] post_likes表创建成功（Flyway迁移通过）
- [x] PostLike Entity和PostLikeRepository创建
- [x] 首次点赞创建记录，帖子点赞数+1
- [x] 再次点赞取消记录，帖子点赞数-1
- [x] 无重复点赞记录
- [x] 前端点赞按钮状态根据用户点赞记录切换

### 前端Store Real模式验证
- [x] discover.ts Real模式推荐卡片API正常
- [x] likes.ts Real模式喜欢/访客API正常
- [x] village.ts Real模式帖子列表API正常
- [x] messages.ts Real模式消息列表API正常
- [x] profile.ts Real模式个人资料API正常
- [x] activity.ts Real模式活动API正常
- [x] checkin.ts Real模式签到API正常
- [x] circle.ts Real模式兴趣圈API正常
- [x] daily-question.ts Real模式每日一问API正常
- [x] 错误处理正常（网络错误/业务错误/鉴权失败）

---

## Phase 3: P1增强项 — 临时聊天Real服务

### RealTempChatService
- [x] createSession()创建TempChatSession，设置24h过期
- [x] sendMessage()创建TempChatMessage，WebSocket推送
- [x] getMessages()查询会话消息列表（分页）
- [x] getSession()查询会话详情+倒计时
- [x] exchangeContact()创建TempChatContactExchange
- [x] 24h过期检查逻辑正常——过期会话消息不可见
- [x] Real模式下临时聊天完整链路可用

---

## Phase 4: P2增强项 — 推荐与匹配优化

### 推荐讨论和历史
- [x] getDiscussions()返回真实讨论推荐（非空列表）
- [x] getHistory()返回真实推荐历史（非空列表）

### 匹配算法优化
- [x] 不再使用findAll()全量加载
- [x] 使用分页查询（PageRequest + Specification）
- [x] 基于推荐分数加权排序选择
- [x] 排除已喜欢/已有信号的用户

### profile.ts Mock模式
- [x] profile.ts包含Mock数据分支
- [x] Mock模式下返回本地硬编码资料数据
- [x] Mock模式下个人中心正常展示

---

## Phase 5: P3清理与全链路验证

### 代码清理
- [x] Village Store分页加载实现
- [x] Phase 1兼容方法中无硬编码用户ID `1L`
- [x] 两套pages.json无冗余

### 全链路验证（Real模式）
- [x] 微信登录 → 学校认证 → 资料完善 → 解锁功能
- [x] 寻觅 → 喜欢 → 心动信号 → 私信
- [x] 村口 → 发帖 → 评论 → 点赞 → 转发
- [x] 兴趣圈 → 加入 → 话题 → 回复 → 村口展示
- [x] 签到 → 每日一问 → 回答 → 发现匹配 → 私信
- [x] 活动 → 列表 → 详情 → 报名
- [x] 临时聊天 → 创建 → 发消息 → 联系方式交换
- [x] 推荐偏好设置 → 影响推荐结果
- [x] 互动提醒 → 通知 → 跳转
- [x] 服务重启后数据保留

### 回归验证
- [x] 大学生模式（学校认证/同乡分类/同校圈）不受影响
- [x] 资料完善硬门槛正常生效
- [x] 推荐计划设置完整保留
- [x] 线下活动功能完整保留
- [x] Mock模式仍可作为开发回退使用
- [x] 无游戏化元素（积分/等级/排行榜/成就徽章/虚拟货币）
- [x] 无购物功能（商城/付费/虚拟物品/会员订阅）
- [x] 无过度竞争（PK排名/人气榜/颜值评分）

---

## 关键约束验证

- [x] 社交互动为核心（寻觅+喜欢+村口+兴趣圈+每日一问+签到+活动 完整闭环）
- [x] 大学生模式完整保留（学校认证、campus字段、同乡分类、同校圈）
- [x] 推荐方案设置完整保留且可影响推荐规则
- [x] 线下活动作为辅助社交场景存在
- [x] 线上社交互动（兴趣圈/每日一问/同校圈/临时聊天/互动提醒）功能可用
- [x] 用户留存机制（签到/动态推送/回流提醒）生效
- [x] 后端数据持久化（非内存Mock）
- [x] 微信登录真实对接（非Mock）
- [x] 实时通信（WebSocket）前后端均可用
- [x] 前后端数据模型一致
- [x] 所有二级社交功能有Real服务实现（非仅有Mock）
