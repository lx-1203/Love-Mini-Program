# Checklist

## Phase 1: 后端数据层基础设施

### 数据源配置
- [ ] `application.yml` 中MySQL数据源配置正确（HikariCP连接池）
- [ ] Spring Data JPA依赖已添加到 `pom.xml`
- [ ] JPA属性配置正确（ddl-auto=validate，Flyway管理Schema）
- [ ] 应用启动成功连接MySQL数据库
- [ ] Flyway迁移脚本全部通过（14个已有脚本 + 新增脚本）

### Entity层
- [ ] User Entity 与 users 表结构一致
- [ ] Like / Visitor Entity 与对应表结构一致
- [ ] Post / Comment / HeartSignal Entity 与对应表结构一致
- [ ] ActivityEnrollment / CheckIn Entity 与对应表结构一致
- [ ] DailyQuestion / DailyAnswer Entity 与对应表结构一致
- [ ] Notification Entity 与 notifications 表结构一致
- [ ] InterestCircle / CircleMembership / CircleTopic / CircleReply Entity 与对应表结构一致
- [ ] PostShare Entity 与 post_shares 表结构一致
- [ ] RecommendationPreference Entity + 迁移脚本创建成功
- [ ] PrivateConversation / PrivateMessage Entity + 迁移脚本创建成功
- [ ] UserSession Entity + 迁移脚本创建成功

### Repository层
- [ ] 每个Entity均有对应Spring Data JPA Repository接口
- [ ] 自定义查询方法（按用户查推荐、按分类查帖子等）正确实现
- [ ] 分页查询支持正常

### 微信登录
- [ ] 微信开放平台HTTP客户端配置正确（appid/secret）
- [ ] `AuthService.loginWithWechat()` 真实调用code2Session
- [ ] JWT token生成和验证正常
- [ ] session_key解密功能正常
- [ ] `@Profile("mock")` 下Mock登录逻辑保留

### MockRuntimeState替换
- [ ] `MockRuntimeState` 标记为 `@Profile("mock")`
- [ ] `@Profile("real")` 下真实Service实现存在
- [ ] 所有Controller通过接口注入Service，不直接依赖Mock
- [ ] `real` Profile下应用正常运行

---

## Phase 2: 核心社交功能后端实现

### 推荐引擎
- [ ] `RecommendationService.generateDailyRecommendations()` 基于多维度加权排序
- [ ] 每日限额逻辑正确（10次/天，跨天重置）
- [ ] 时间门控刷新逻辑正确（基于用户偏好时间点）
- [ ] `GET /api/recommendations/preferences` 返回用户偏好
- [ ] `PUT /api/recommendations/preferences` 保存用户偏好
- [ ] `GET /api/recommendations/cards/history` 返回推荐历史
- [ ] 已喜欢/已拒绝用户不出现在推荐中
- [ ] 推荐偏好影响推荐排序结果
- [ ] OpenAPI `recommendations.yaml` 包含偏好设置Schema

### 村口社区
- [ ] 帖子发布API正常（文字+图片+标签+分类）
- [ ] 帖子详情API返回完整信息
- [ ] 帖子列表API支持分页
- [ ] 评论/点赞/转发API正常
- [ ] 分类筛选正确（6个分类）
- [ ] 三标签排序正确（关注/同城/发现）
- [ ] 同城标签下同校帖子优先
- [ ] `POST /api/posts/{id}/share` 转发API正常
- [ ] 帖子互动时自动生成通知
- [ ] OpenAPI `village.yaml` 包含完整Schema

### 喜欢与心动信号
- [ ] 喜欢/取消喜欢API正常
- [ ] 双向喜欢自动生成心动信号
- [ ] 访客记录自动生成
- [ ] 心动信号24h过期机制正确
- [ ] 喜欢我的/访客列表API正常
- [ ] 心动信号生成时触发通知

### 私信系统
- [ ] 私信会话创建/列表API正常
- [ ] 私信消息发送/接收API正常
- [ ] 消息已读/未读状态正确
- [ ] 联系方式交换状态机正常
- [ ] 私信与临时聊天双轨并行
- [ ] OpenAPI 包含私信Schema

### 通知系统
- [ ] 被关注时生成关注通知
- [ ] 被点赞时生成点赞通知
- [ ] 帖子被评论时生成评论通知
- [ ] 有新访客时生成访客通知
- [ ] 心动信号创建时生成匹配通知
- [ ] `GET /api/notifications` 返回通知列表
- [ ] `GET /api/notifications/unread-count` 返回未读计数
- [ ] `PUT /api/notifications/{id}/read` 标记已读
- [ ] 心动信号剩余<2h时生成过期提醒

---

## Phase 3: 在线社交互动功能

### 兴趣圈后端
- [ ] `GET /api/circles` 返回兴趣圈列表
- [ ] `POST /api/circles/{id}/join` 加入/退出兴趣圈
- [ ] `GET /api/circles/{id}/topics` 返回圈内话题
- [ ] `POST /api/circles/{id}/topics` 发布新话题
- [ ] `GET /api/circles/topics/{id}/replies` 返回话题回复
- [ ] `POST /api/circles/topics/{id}/replies` 回复话题
- [ ] 村口"兴趣圈"分类展示精选话题

### 兴趣圈前端
- [ ] 兴趣圈Store（`stores/circle.ts`）创建完成
- [ ] 兴趣圈列表页展示圈名、图标、成员数、最新话题摘要
- [ ] 加入/退出按钮交互正常
- [ ] 圈内话题列表页展示标题、摘要、回复数、最后回复时间
- [ ] 发布新话题支持标题+正文+可选图片
- [ ] 话题详情+回复列表展示完整
- [ ] "我的"页功能菜单包含"兴趣圈"入口
- [ ] 兴趣圈→加入→话题→回复→村口展示 完整链路可用

### 每日一问后端
- [ ] `GET /api/daily-question/today` 返回今日问题
- [ ] `POST /api/daily-question/answer` 提交回答成功
- [ ] `GET /api/daily-question/answers` 返回回答列表
- [ ] 匿名回答显示"匿名用户"，不暴露真实昵称
- [ ] 共同回答作为推荐加分项

### 每日一问前端
- [ ] 每日一问Store创建完成
- [ ] 寻觅页（卡片用完后）展示"每日一问"卡片
- [ ] 回答输入页：问题展示 + 输入框 + 匿名开关 + 提交按钮
- [ ] 回答列表页：展示所有回答 + 点击作者头像查看资料
- [ ] 未签到用户看到"签到后解锁"提示

### 同校圈
- [ ] 村口"同城"标签同校优先排序正确
- [ ] 同校帖子展示"校友"标签
- [ ] 推荐算法同校加权生效
- [ ] 校园活动日历视图（列表/日历切换）正常

---

## Phase 4: 推荐偏好+签到持久化+活动真实化

### 推荐计划设置
- [ ] `subpackages/setup/recommend-pref/index.vue` 页面创建完成
- [ ] 每日推荐时间偏好选择器正常（10:00/12:00/14:00/18:00）
- [ ] 推荐范围选择正常（同校优先/同城/不限）
- [ ] 偏好保存到 `PUT /api/recommendations/preferences`
- [ ] 偏好从 `GET /api/recommendations/preferences` 加载
- [ ] 推荐偏好实际影响推荐排序结果

### 签到持久化
- [ ] 签到记录写入数据库（非内存）
- [ ] 连续签到天数从数据库计算
- [ ] 签到后推荐次数增加逻辑持久化
- [ ] 服务重启后签到记录不丢失
- [ ] 前端签到Store对接真实API

### 活动真实化
- [ ] 活动列表从 `GET /api/recommendations/activities` 加载
- [ ] 报名功能对接 `POST /api/activities/{id}/enroll`
- [ ] 活动详情展示完整描述信息
- [ ] 活动列表支持分页加载
- [ ] 寻觅页活动推荐板块数据来自真实API

---

## Phase 5: 实时通信与前端Store切换

### WebSocket
- [ ] Spring WebSocket + STOMP 依赖已添加
- [ ] WebSocket端点和消息代理配置正确
- [ ] 私信实时推送到接收方
- [ ] 心动信号实时通知推送
- [ ] 互动通知实时推送
- [ ] 前端WebSocket客户端集成正常

### 前端Store切换
- [ ] `discover.ts` 使用真实API（real模式）
- [ ] `likes.ts` 使用真实API（real模式）
- [ ] `village.ts` 使用真实API（real模式）
- [ ] `messages.ts` 使用真实API（real模式）
- [ ] `profile.ts` 使用真实API（real模式）
- [ ] `activity.ts` 使用真实API（real模式）
- [ ] `checkin.ts` 使用真实API（real模式）
- [ ] `VITE_API_MODE=mock` 模式下回退到Mock数据正常

### HTTP客户端增强
- [ ] 统一错误处理（网络错误/业务错误/鉴权失败分类）
- [ ] JWT token自动附加到请求头
- [ ] 401响应自动刷新token + 重试请求
- [ ] 请求超时和重试机制正常

### 数据模型对齐
- [ ] `api-types.ts` 从OpenAPI YAML重新生成
- [ ] Store中手动定义的类型替换为生成类型
- [ ] `CheckInStatusResponse` 等字段名不一致问题已修复
- [ ] `history.vue` 中硬编码Mock数据已修复

---

## Phase 6: 代码清理与全链路验证

### 废弃代码清理
- [ ] `pages/home/index.vue` 及相关配置已移除
- [ ] `pages/match/index.vue` 及相关配置已移除
- [ ] `stores/home.ts` 已移除
- [ ] `stores/match.ts` 已移除
- [ ] `config/home-sections.ts`、`config/match-form.ts` 已移除
- [ ] `debug/MatchDebugController`、`debug/ErrorSimulationController` 已移除（生产环境）
- [ ] 清理后应用正常运行

### 全链路验证
- [ ] 微信登录 → 学校认证 → 资料完善 → 解锁功能 完整链路
- [ ] 寻觅 → 喜欢 → 心动信号 → 私信 完整链路
- [ ] 村口 → 发帖 → 评论 → 点赞 → 转发 完整链路
- [ ] 兴趣圈 → 加入 → 话题 → 回复 → 村口展示 完整链路
- [ ] 签到 → 每日一问 → 回答 → 发现匹配 → 私信 完整链路
- [ ] 活动 → 列表 → 日历 → 详情 → 报名 完整链路
- [ ] 推荐偏好设置 → 影响推荐结果 完整链路
- [ ] 互动提醒 → 通知 → 跳转 完整链路
- [ ] 服务重启后所有数据保留

### 回归验证
- [ ] 大学生模式（学校认证/同乡分类/同校圈）不受影响
- [ ] 资料完善硬门槛正常生效
- [ ] 推荐计划设置完整保留
- [ ] 线下活动功能完整保留
- [ ] Mock模式仍可作为开发回退使用
- [ ] 无游戏化元素（积分/等级/排行榜/成就徽章/虚拟货币）
- [ ] 无购物功能（商城/付费/虚拟物品/会员订阅）
- [ ] 无过度竞争（PK排名/人气榜/颜值评分）

---

## 关键约束验证

- [ ] 社交互动为核心（寻觅+喜欢+村口+话题圈+每日一问+活动 完整闭环）
- [ ] 大学生模式完整保留（学校认证、campus字段、同乡分类、同校圈）
- [ ] 推荐方案设置完整保留且可影响推荐规则
- [ ] 线下活动作为辅助社交场景存在
- [ ] 线上社交互动（话题圈/每日一问/同校圈/互动提醒）功能可用
- [ ] 用户留存机制（签到/动态推送/回流提醒）生效
- [ ] 后端数据持久化（非内存Mock）
- [ ] 微信登录真实对接（非Mock）
- [ ] 实时通信（WebSocket）可用
- [ ] 前后端数据模型一致
