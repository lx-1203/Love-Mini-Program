# Checklist

## Phase 1: P0阻塞项修复

### RealAuthService数据库集成
- [x] RealAuthService不再使用内存Map（openIdToUserId/userIdToDisplayName）
- [x] 用户查找通过UserRepository从数据库获取
- [x] 新用户创建写入数据库（User + UserBasicProfile）
- [x] profileCompleted基于数据库字段动态计算
- [x] campusVerified基于UserCampusProfile审核状态计算
- [x] scheduleCompleted基于UserScheduleProfile是否存在计算
- [x] Real模式登录后不再显示LockScreen
- [x] 服务重启后用户数据保留

### RealMatchService真实匹配创建
- [x] createMatch()返回真实匹配对象（非硬编码）
- [x] createQuickMatch()返回真实匹配对象（非硬编码）
- [x] 匹配结果持久化到数据库
- [x] 匹配→心动信号→私信链路正常

### 活动报名和详情真实实现
- [x] enrollActivity()不抛UnsupportedOperationException
- [x] getActivityDetail()不抛UnsupportedOperationException
- [x] 活动报名创建ActivityEnrollment记录
- [x] 活动详情返回完整信息（描述/报名人数/参与者预览）
- [x] 报名后报名人数更新

### 推荐服务补全
- [x] getDiscussions()返回真实讨论推荐（非空列表）
- [x] getHistory()返回真实推荐历史（非空列表）
- [x] 推荐逻辑包含兴趣标签匹配加权

---

## Phase 2: P1核心项

### pages.json统一
- [x] 根目录pages.json包含circles页面注册
- [x] 根目录pages.json包含daily-question页面注册
- [x] 两套pages.json内容一致
- [x] circles页面编译后可正常访问
- [x] daily-question页面编译后可正常访问

### Store Real模式验证
- [ ] discover.ts Real模式推荐卡片API正常
- [ ] likes.ts Real模式喜欢/访客API正常
- [ ] village.ts Real模式帖子列表API正常
- [ ] messages.ts Real模式消息列表API正常
- [ ] profile.ts Real模式个人资料API正常
- [ ] activity.ts Real模式活动API正常
- [ ] checkin.ts Real模式签到API正常
- [ ] circle.ts Real模式兴趣圈API正常
- [ ] daily-question.ts Real模式每日一问API正常
- [ ] 错误处理正常（网络错误/业务错误/鉴权失败）

### 前端WebSocket集成
- [x] WebSocket客户端连接后端STOMP端点成功
- [x] 私信实时推送到前端
- [x] 通知实时推送到前端
- [x] 心动信号实时推送到前端
- [x] WebSocket断线重连机制正常
- [x] 消息TabBar未读红点实时更新

### 推荐标签匹配
- [x] UserBasicProfile包含兴趣标签字段
- [x] 共同兴趣标签用户在推荐中排序靠前
- [x] 标签匹配加权逻辑正确

---

## Phase 3: P2增强项

### 关注关系系统
- [x] user_follows表创建成功（Flyway迁移通过）
- [x] UserFollow Entity和Repository创建
- [x] POST /api/users/{id}/follow 关注接口正常
- [x] DELETE /api/users/{id}/follow 取关接口正常
- [x] GET /api/users/{id}/followers 粉丝列表正常
- [x] GET /api/users/{id}/following 关注列表正常
- [x] RealVillageService.getFollowingPosts()使用关注关系表
- [x] 前端followUser按userId操作（非postId）
- [x] 关注时触发通知

### 个人中心统计真实化
- [x] GET /api/profile/stats 返回关注数/粉丝数/获赞数
- [x] GET /api/profile/basic 返回bio字段
- [x] 前端统计数字来自API（非硬编码28/16/104）
- [x] 前端bio来自API（非硬编码"保持热爱，奔赴山海"）

---

## Phase 4: 清理与全链路验证

### 代码清理
- [ ] Village Store分页加载实现
- [ ] appVersion动态获取
- [ ] 两套pages.json无冗余

### 全链路验证（Real模式）
- [ ] 微信登录 → 学校认证 → 资料完善 → 解锁功能
- [ ] 寻觅 → 喜欢 → 心动信号 → 私信
- [ ] 村口 → 发帖 → 评论 → 点赞 → 转发
- [ ] 兴趣圈 → 加入 → 话题 → 回复 → 村口展示
- [ ] 签到 → 每日一问 → 回答 → 发现匹配 → 私信
- [ ] 活动 → 列表 → 日历 → 详情 → 报名
- [ ] 推荐偏好设置 → 影响推荐结果
- [ ] 互动提醒 → 通知 → 跳转
- [ ] 服务重启后数据保留

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

- [x] 社交互动为核心（寻觅+喜欢+村口+话题圈+每日一问+活动 完整闭环）
- [x] 大学生模式完整保留（学校认证、campus字段、同乡分类、同校圈）
- [x] 推荐方案设置完整保留且可影响推荐规则
- [x] 线下活动作为辅助社交场景存在
- [x] 线上社交互动（话题圈/每日一问/同校圈/互动提醒）功能可用
- [x] 用户留存机制（签到/动态推送/回流提醒）生效
- [x] 后端数据持久化（非内存Mock）
- [x] 微信登录真实对接（非Mock）
- [x] 实时通信（WebSocket）前后端均可用
- [x] 前后端数据模型一致
