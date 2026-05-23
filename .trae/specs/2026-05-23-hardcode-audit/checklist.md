# Checklist

## Phase 1: P0 后端缺失API端点补全

### 左滑(pass)端点
- [ ] MatchController 存在 `POST /api/matches/pass` 端点
- [ ] RealMatchService 实现pass逻辑，记录到pass_records表
- [ ] PassRecord实体和Repository存在
- [ ] Flyway迁移脚本 `V2026.05.29.0001__create_pass_records.sql` 存在
- [ ] 推荐算法排除已pass用户
- [ ] discover.ts调用pass API替代本地记录

### 反悔(rewind)端点
- [ ] MatchController 存在 `POST /api/matches/rewind` 端点
- [ ] RealMatchService 实现rewind逻辑，每日限1次
- [ ] discover.ts调用rewind API替代本地回退

### "我喜欢的"列表端点
- [ ] MatchController 存在 `GET /api/matches/my-likes` 端点
- [ ] RealMatchService 实现my-likes查询
- [ ] likes.ts调用my-likes API，Real模式下列表不为空

### 访客标记已读端点
- [ ] MatchController 存在 `PUT /api/matches/visitors/{id}/read` 端点
- [ ] RealMatchService 实现标记已读
- [ ] likes.ts调用API替代本地 `isNew = false`

### 帖子分类列表端点
- [ ] VillageController 存在 `GET /api/posts/categories` 端点
- [ ] 分类数据从数据库动态获取
- [ ] village.ts调用categories API替代硬编码列表
- [ ] village/post.vue移除硬编码categoryOptions

### 私信会话置顶端点
- [ ] PrivateMessageController 存在 `PUT /api/messages/conversations/{id}/pin` 端点
- [ ] RealPrivateMessageService 实现置顶逻辑
- [ ] messages.ts调用pin API替代本地状态更新

---

## Phase 2: P0 后端硬编码默认用户ID消除

### JWT用户ID解析
- [ ] SecurityUtils.getCurrentUserId() 工具方法存在
- [ ] 从SecurityContext正确获取当前用户ID

### Real Service硬编码消除
- [ ] RealProfileService 不含 `CURRENT_USER_ID = 1L`
- [ ] RealFeedbackService 不含 `CURRENT_USER_ID = 1L`
- [ ] RealVillageService 不含 `DEFAULT_USER_ID = 1L`
- [ ] RealTempChatService resolveCurrentUserId() 不返回1L

### Controller默认参数消除
- [ ] NotificationController 不含 `defaultValue = "1"`
- [ ] PrivateMessageController 不含 `defaultValue = "1"`
- [ ] VillageController 不含 `defaultValue = "1"`
- [ ] 未认证请求返回401

### 前端硬编码消除
- [ ] likes.ts createHeartSignalForMutualLike toUserId从session获取

### JWT安全配置
- [ ] JwtConfig 不含硬编码默认密钥
- [ ] 未设置JWT_SECRET时应用拒绝启动

---

## Phase 3: P1 后端配置值外移

### 业务配置类
- [ ] RecommendationConfig @ConfigurationProperties类存在
- [ ] MatchConfig @ConfigurationProperties类存在
- [ ] ChatConfig @ConfigurationProperties类存在
- [ ] CheckInConfig @ConfigurationProperties类存在
- [ ] application.yml包含对应配置项
- [ ] RealRecommendationService使用配置注入替代硬编码权重
- [ ] RealMatchService使用配置注入替代硬编码权重
- [ ] 推荐权重(+50/+20/+10/+15)不再硬编码在代码中

### 文案常量统一
- [ ] DisplayConstants常量类存在
- [ ] "未知用户"统一为DisplayConstants.UNKNOWN_USER
- [ ] "新用户"统一为DisplayConstants.NEW_USER
- [ ] 不存在散落的硬编码"未知用户"文本

---

## Phase 4: P1 后端视图字段补全

### 推荐人物视图
- [ ] RecommendedPersonView包含bio和images字段
- [ ] RealRecommendationService填充bio和images
- [ ] discover.ts不包含 `bio: ""` 或 `images: []` 硬编码映射

### 心动信号视图
- [ ] HeartSignalView包含fromUserName和fromUserAvatar
- [ ] RealMatchService填充用户名和头像
- [ ] likes.ts和messages.ts不包含空字符串硬编码映射

### 私信会话视图
- [ ] ConversationView包含headline/pinned/phase/sessionType
- [ ] RealPrivateMessageService填充新字段
- [ ] messages.ts不包含硬编码默认值映射

### 其他视图
- [ ] CircleView包含topicCount
- [ ] DailyQuestionView包含category和answerCount
- [ ] DailyAnswerView包含avatarUrl
- [ ] 前端Store不包含对应硬编码映射

---

## Phase 5: P1 前端未调用端点补全

### discover.ts
- [ ] 推荐历史从 `GET /api/recommendations/history` 获取，不依赖localStorage

### village.ts
- [ ] 帖子详情从 `GET /api/posts/{id}` 获取，不从本地列表查找

### messages.ts
- [ ] 标记全部通知已读调用 `PUT /api/notifications/read-all`
- [ ] 拒绝心动信号调用 `POST /api/matches/heart-signals/{id}/decline`

### activity.ts
- [ ] 活动取消报名调用 `DELETE /api/activities/{id}/enroll`
- [ ] 活动详情调用 `GET /api/activities/{id}`

### circle.ts
- [ ] 精选话题调用 `GET /api/circles/featured`

### 访客记录
- [ ] 查看他人主页时调用 `POST /api/matches/visit`

---

## Phase 6: P2 Mock数据优化 + 实体默认值

### Mock数据外移
- [ ] MockRuntimeState.java假数据移至JSON资源文件
- [ ] fixtures.ts假数据移至JSON资源文件

### 实体JSON列默认值
- [ ] Feedback.attachments 默认值 `"[]"`
- [ ] UserBasicProfile.interestTags 默认值 `"[]"`
- [ ] Activity.participantAvatars 默认值 `"[]"`
- [ ] CircleTopic.images 默认值 `"[]"`
- [ ] Post.images 默认值 `"[]"`
- [ ] Post.tags 默认值 `"[]"`
- [ ] UserScheduleProfile JSON列默认值 `"[]"`
- [ ] Flyway迁移脚本添加列默认值

---

## 关键约束验证

- [ ] 所有前端展示功能有对应后端API支撑
- [ ] 所有后端API有对应数据库表支撑
- [ ] 无硬编码默认用户ID（1L/1001L等）
- [ ] 无Controller默认参数 defaultValue="1"
- [ ] 无JWT默认密钥硬编码
- [ ] 推荐权重可配置
- [ ] 文案常量统一管理
- [ ] 后端视图字段完整，前端无需写死默认值
