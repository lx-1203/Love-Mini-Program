# Checklist

## Phase 1: P0致命项 — RealProfileService完整实现

### 基本资料
- [x] getBasicProfile()从user_basic_profile表查询基本资料
- [x] getBasicProfile()无记录时返回空资料模板（非抛异常）
- [x] saveBasicProfile()更新user_basic_profile表
- [x] saveBasicProfile()重新计算profileCompletion字段
- [x] 前端资料编辑页 → API调用 → 数据库更新 → 返回确认 完整链路

### 校区资料
- [x] getCampusProfile()从user_campus_profile表查询校区资料
- [x] getCampusProfile()无记录时返回空资料模板
- [x] saveCampusProfile()更新user_campus_profile表
- [x] saveCampusProfile()重新计算认证状态和profileCompletion
- [x] 前端校区页 → API调用 → 数据库更新 → 认证状态更新 完整链路

### 日程资料
- [x] getScheduleProfile()从user_schedule_profile表查询日程资料
- [x] getScheduleProfile()无记录时返回空资料模板
- [x] saveScheduleProfile()更新user_schedule_profile表
- [x] saveScheduleProfile()重新计算profileCompletion
- [x] 前端日程页 → API调用 → 数据库更新 完整链路

### 个人统计
- [x] getProfileStats()从数据库计算关注数（user_follows表）
- [x] getProfileStats()从数据库计算粉丝数（user_follows表）
- [x] getProfileStats()从数据库计算获赞数（post_likes表）
- [x] getProfileStats()从数据库计算帖子数（posts表）
- [x] 个人统计为真实计算值（非硬编码）

---

## Phase 2: P0阻塞项 — RealFeedbackService + 页面路由修复

### 反馈服务
- [x] submit()创建Feedback记录，持久化到数据库
- [x] listMine()查询该用户的所有反馈记录
- [x] listAdminFeedback()管理员查看所有反馈，支持筛选
- [x] convertProposal()将活动提案转为正式Activity记录
- [x] 提案转换后提案状态更新为"已采纳"
- [x] 提案转换后提案者收到通知

### 页面路由
- [x] pages.json中注册chat页面路由
- [x] pages.json中注册chat-session页面路由
- [x] 点击临时聊天入口可正常导航到chat-session页面
- [x] 点击消息页聊天入口可正常导航到chat页面
- [x] 页面导航不出现"页面未注册"错误

---

## Phase 3: P1核心项 — Store Mock模式 + RealAppConfigService

### chat.ts Mock模式
- [x] chat.ts包含useMock()判断分支
- [x] Mock模式下返回本地Mock聊天数据
- [x] Mock模式下不调用后端API
- [x] Mock模式下聊天界面正常展示

### session.ts Mock模式
- [x] session.ts包含useMock()判断分支
- [x] Mock模式下返回本地Mock会话数据
- [x] Mock模式下不调用后端API
- [x] Mock模式下会话管理正常工作

### RealAppConfigService
- [x] getLoginHeroConfig()返回登录页主视觉配置
- [x] getLoginHeroConfig()不抛UnsupportedOperationException
- [x] 数据库无配置时返回默认值
- [x] 登录页主视觉正常加载

---

## Phase 4: P1性能与质量项

### 推荐查询优化
- [x] RealRecommendationService不再使用findAll()全表扫描
- [x] 使用分页查询（PageRequest + Specification）
- [x] 排除已喜欢/已有信号的用户
- [x] 限制查询数量，避免全表扫描
- [x] 大数据量下推荐响应时间<500ms

### 硬编码修复
- [x] createPost()操作归属当前登录用户（非userId=1L）
- [x] likePost()操作归属当前登录用户
- [x] createComment()操作归属当前登录用户
- [x] sharePost()操作归属当前登录用户
- [x] 不同用户操作正确归属各自ID

### 视图类型字段补全
- [x] HeartSignalView包含fromUserName和fromUserAvatar
- [x] PostSummaryView包含isLiked、isFollowed、isShared
- [x] ConversationView包含headline、pinned、phase、sessionType
- [x] DailyQuestionView包含category、answerCount
- [x] CircleView包含topicCount
- [x] 前端视图类型与后端返回数据一致

### 页面目录对齐
- [x] apps/client/pages/和apps/client/src/pages/差异已确认
- [x] 缺失的circles/和daily-question/页面已同步
- [x] 编译后所有页面可正常访问

---

## Phase 5: P2清理 + 全链路验证 + 回归测试

### 代码清理
- [ ] RealCircleService和RealDailyQuestionService移除多余的@Primary
- [ ] RealNotificationService Phase 1方法userId类型统一为Long
- [ ] RealHomeService.getDashboard()不再抛UnsupportedOperationException

### 全链路验证（Real模式）
- [ ] 微信登录 → 资料编辑 → 资料完善度更新
- [ ] 寻觅 → 喜欢 → 心动信号 → 私信
- [ ] 村口 → 发帖 → 评论 → 点赞 → 转发
- [ ] 兴趣圈 → 加入 → 话题 → 回复
- [ ] 签到 → 每日一问 → 回答
- [ ] 活动 → 列表 → 详情 → 报名
- [ ] 临时聊天 → 创建 → 发消息 → 联系方式交换
- [ ] 反馈 → 提交 → 查询历史
- [ ] 推荐偏好设置 → 影响推荐结果
- [ ] 个人统计 → 关注数/粉丝数/获赞数/帖子数

### Mock模式验证
- [ ] 所有Store在Mock模式下正常工作（含chat.ts和session.ts）
- [ ] Mock模式下前端可独立运行，无需后端服务

### 回归验证
- [ ] 大学生模式（学校认证/同乡分类/同校圈）不受影响
- [ ] 资料完善硬门槛正常生效
- [ ] 推荐计划设置完整保留
- [ ] 线下活动功能完整保留
- [ ] 无游戏化元素（积分/等级/排行榜/成就徽章/虚拟货币）
- [ ] 无购物功能（商城/付费/虚拟物品/会员订阅）
- [ ] 无过度竞争（PK排名/人气榜/颜值评分）

---

## 关键约束验证

- [ ] 社交互动为核心（寻觅+喜欢+村口+兴趣圈+每日一问+签到+活动 完整闭环）
- [ ] 大学生模式完整保留（学校认证、campus字段、同乡分类、同校圈）
- [ ] 推荐方案设置完整保留且可影响推荐规则
- [ ] 线下活动作为辅助社交场景存在
- [ ] 线上社交互动（兴趣圈/每日一问/同校圈/临时聊天/互动提醒）功能可用
- [ ] 用户留存机制（签到/动态推送/回流提醒）生效
- [ ] 后端数据持久化（非内存Mock）
- [ ] 微信登录真实对接（非Mock）
- [ ] 实时通信（WebSocket）前后端均可用
- [ ] 前后端数据模型一致
- [ ] 所有Service在Real模式下不抛UnsupportedOperationException
- [ ] 所有Store在Mock和Real双模式下均可用
