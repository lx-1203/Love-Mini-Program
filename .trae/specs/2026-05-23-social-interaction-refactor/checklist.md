# Checklist

## Phase 1: P0阻塞项 — RealHomeService首页数据聚合实现

### 后端数据聚合
- [x] RealHomeService.getDashboard()注入5个Service依赖
- [x] 推荐人物卡片从RecommendationService聚合
- [x] 签到状态从CheckInService聚合
- [x] 每日一问从DailyQuestionService聚合
- [x] 活动推荐从ActivityService聚合
- [x] 村口热门帖子从VillageService聚合（限制3条）
- [x] DashboardView包含所有聚合数据字段
- [x] getDashboard()不返回空默认值

### 前端数据展示
- [x] 前端Store正确接收DashboardView数据
- [x] 首页推荐卡片正常渲染
- [x] 首页签到入口正常展示
- [x] 首页每日一问正常展示
- [x] 首页活动推荐正常展示
- [x] 首页村口热门正常展示
- [x] 首页加载响应时间<1s

---

## Phase 2: P1核心项 — 推荐偏好持久化 + AppConfig数据库驱动 + 分页修复

### 推荐偏好持久化
- [x] getPreferences(userId)从recommendation_preferences表读取
- [x] updatePreferences(userId, data)持久化到recommendation_preferences表
- [x] 无偏好记录时返回默认偏好
- [x] 同校优先偏好影响推荐排序权重
- [x] 推荐计划设置页 → 保存 → 重新加载 → 推荐结果变化 完整链路

### AppConfig数据库驱动
- [x] RealAppConfigService注入AppConfigRepository
- [x] getLoginHeroConfig()从app_config表读取
- [x] 数据库无配置时返回默认值（不抛异常）
- [x] 登录页主视觉可动态配置

### 分页修复
- [x] getDiscussions()不再使用circleTopicRepository.findAll()
- [x] 使用PageRequest分页查询
- [x] 按创建时间倒序排序
- [x] 默认每页20条

---

## Phase 3: P1质量项 — Phase 1兼容层清理

### DEFAULT_USER_ID移除
- [x] RealProfileService移除DEFAULT_USER_ID=1L
- [x] RealVillageService移除DEFAULT_USER_ID=1L
- [x] RealTempChatService移除resolveCurrentUserId()回退逻辑
- [x] RealMatchService移除DEFAULT_USER_ID回退（如有）
- [x] SecurityUtils.getCurrentUserId()未认证时返回401
- [x] 所有API未认证时返回401，不使用默认用户

### 代码清理
- [x] RealHomeService无"TODO: Phase 2"注释
- [x] RealAppConfigService无"TODO: Phase 2"注释
- [x] 代码中无遗留TODO占位

---

## Phase 4: 新增功能 — 在线社交互动增强

### 在线状态感知
- [x] user_online_status表已创建（Flyway迁移）
- [x] UserOnlineStatus实体和Repository已创建
- [x] WebSocket心跳机制实现（30秒间隔）
- [x] GET /api/users/{userId}/online-status API可用
- [x] POST /api/users/online-status/batch API可用
- [x] 超过5分钟无心跳标记为offline
- [x] 前端推荐卡片展示在线状态标识
- [x] 前端私信列表展示在线状态标识
- [x] 前端Store在线状态管理正常

### 匹配破冰引导
- [x] icebreaker_topics表已创建（Flyway迁移）
- [x] IcebreakerTopic实体和Repository已创建
- [x] 通用破冰话题种子数据已插入（20+条）
- [x] GET /api/matches/{matchId}/icebreakers API可用
- [x] 破冰话题优先基于共同兴趣标签生成
- [x] 其次基于每日一问共同回答生成
- [x] 最后使用通用破冰话题模板
- [x] 前端心动信号匹配页展示破冰话题
- [x] 点击破冰话题可发送到对话
- [x] 前端Store破冰话题管理正常

### 互动提醒增强
- [x] interaction_events表已创建（Flyway迁移）
- [x] InteractionEvent实体和Repository已创建
- [x] 喜欢/访客/关注/点赞/评论/回复时创建互动事件
- [x] GET /api/notifications/interactions API可用
- [x] 互动事件WebSocket实时推送
- [x] 前端通知列表展示多维度互动事件
- [x] 点击通知跳转到对应功能页
- [x] 前端Store互动事件管理正常

### 同校动态流
- [x] GET /api/village/campus-feed API可用
- [x] 聚合同校用户最新帖子（限制10条）
- [x] 聚合同校即将开始的活动（限制5条）
- [x] 聚合同校兴趣圈最新话题（限制5条）
- [x] 前端村口页"同城"标签改为"同校"标签（认证用户）
- [x] 前端同校动态流页面展示（混合流）
- [x] 前端Store同校动态管理正常

---

## Phase 5: P2验证与回归 — 全链路验证

### 全链路端到端验证（Real模式）
- [x] 微信登录 → 资料编辑 → 资料完善度更新
- [x] 首页 → 推荐卡片 → 签到 → 每日一问 → 活动推荐 → 村口热门
- [x] 寻觅 → 喜欢 → 心动信号 → 破冰引导 → 私信
- [x] 村口 → 发帖 → 评论 → 点赞 → 转发
- [x] 兴趣圈 → 加入 → 话题 → 回复
- [x] 签到 → 每日一问 → 回答
- [x] 活动 → 列表 → 详情 → 报名
- [x] 临时聊天 → 创建 → 发消息 → 联系方式交换
- [x] 反馈 → 提交 → 查询历史
- [x] 推荐偏好设置 → 保存 → 影响推荐结果
- [x] 在线状态 → 心跳 → 状态标识 → 超时离线
- [x] 互动提醒 → 事件触发 → 推送通知 → 点击跳转
- [x] 同校动态 → 帖子/活动/话题聚合 → 浏览

### Mock模式验证
- [x] 所有Store在Mock模式下正常工作（含新增功能Store）
- [x] Mock模式下前端可独立运行，无需后端服务

### 回归验证
- [x] 大学生模式（学校认证/同校分类/同校动态）不受影响
- [x] 资料完善硬门槛正常生效
- [x] 推荐计划设置完整保留且可影响推荐规则
- [x] 线下活动功能完整保留
- [x] 无游戏化元素（积分/等级/排行榜/成就徽章/虚拟货币）
- [x] 无购物功能（商城/付费/虚拟物品/会员订阅）
- [x] 无过度竞争（PK排名/人气榜/颜值评分）

---

## 关键约束验证

- [x] 社交互动为核心（寻觅+喜欢+村口+兴趣圈+每日一问+签到+活动+破冰+互动提醒+同校动态 完整闭环）
- [x] 大学生模式完整保留（学校认证、campus字段、同乡分类、同校圈、同校动态流）
- [x] 推荐方案设置完整保留且真实影响推荐规则
- [x] 线下活动作为辅助社交场景存在
- [x] 线上社交互动（兴趣圈/每日一问/同校圈/临时聊天/互动提醒/破冰引导/在线状态）功能可用
- [x] 用户留存机制（签到/动态推送/回流提醒/互动通知）生效
- [x] 后端数据持久化（非内存Mock）
- [x] 微信登录真实对接（非Mock）
- [x] 实时通信（WebSocket）前后端均可用
- [x] 前后端数据模型一致
- [x] 所有Service在Real模式下不抛UnsupportedOperationException
- [x] 所有Store在Mock和Real双模式下均可用
- [x] 首页展示真实聚合数据（非空占位）
- [x] 推荐偏好可持久化并影响推荐结果
