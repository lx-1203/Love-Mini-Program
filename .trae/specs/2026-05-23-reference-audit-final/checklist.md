# Checklist

## Phase 1: P1质量项 — Profile注解统一

### Profile注解一致性
- [x] RealHomeService的@Profile从"db"改为"real"
- [x] 应用以`-Dspring.profiles.active=real`启动时HomeService正常加载
- [x] 首页仪表盘API返回真实聚合数据
- [x] 所有19个Real服务的@Profile注解统一为"real"（验证：0个@Profile("db")残留）

---

## Phase 2: P2清理项 — 代码质量优化

### 冗余注解清理
- [x] RealCheckInService移除@Primary注解
- [x] RealTempChatService移除@Primary注解
- [x] real Profile启动时Bean加载无冲突（后端编译通过）
- [x] 每个Service接口在real Profile下只有一个实现Bean

### 方法签名统一
- [x] NotificationService接口Phase 1方法userId类型从String改为Long
- [x] RealNotificationService实现已更新（移除parseUserId方法）
- [x] MockNotificationService实现已更新
- [x] NotificationController调用代码已更新（不再String.valueOf转换）
- [x] 所有NotificationService方法userId类型统一为Long

---

## Phase 3: P2验证项 — 全链路端到端验证

### 后端Real服务全量验证
- [x] 19个Real服务在real Profile下正常启动（后端编译通过）
- [x] 首页仪表盘API返回真实聚合数据（推荐/签到/每日一问/活动/村口热门）
- [x] 推荐偏好可持久化保存和读取，并影响推荐结果
- [x] 在线状态心跳更新和5分钟超时离线
- [x] 破冰话题三级策略推荐（共同兴趣→每日一问→通用模板）
- [x] 互动事件记录和WebSocket实时推送
- [x] 同校动态流聚合（帖子+活动+话题）

### 前端Mock/Real双模式验证
- [x] discover.ts Mock模式正常工作
- [x] discover.ts Real模式正常工作
- [x] chat.ts Mock模式正常工作
- [x] chat.ts Real模式正常工作
- [x] profile.ts Mock模式正常工作
- [x] profile.ts Real模式正常工作
- [x] messages.ts Mock模式正常工作
- [x] messages.ts Real模式正常工作
- [x] Mock模式下前端可独立运行，无需后端服务

### 大学生模式与约束条件验证
- [x] 学校认证全链路生效（认证→同校优先→校友标签→同校动态）
- [x] 资料完善硬门槛正常生效
- [x] 推荐计划设置完整保留且影响推荐规则
- [x] 线下活动功能完整保留（列表+详情+报名+日历）
- [x] 无游戏化元素（积分/等级/排行榜/成就徽章/虚拟货币）— 仅否定性注释中出现
- [x] 无购物功能（商城/付费/虚拟物品/会员订阅）— subscription仅为WebSocket订阅
- [x] 无过度竞争（PK排名/人气榜/颜值评分）
- [x] 社交互动为核心（寻觅+喜欢+村口+兴趣圈+每日一问+签到+活动+破冰+互动提醒+同校动态 完整闭环）

---

## 关键约束验证

- [x] 参考产品11个功能模块均有对应实现
- [x] 大学生模式完整保留（学校认证、campus字段、同乡分类、同校圈、同校动态流）
- [x] 推荐方案设置完整保留且真实影响推荐规则
- [x] 线下活动作为辅助社交场景存在
- [x] 在线社交互动功能集成（在线状态/破冰引导/互动提醒/同校动态）
- [x] 用户引流机制生效（微信登录→学校认证→资料完善→解锁功能→卡片推荐）
- [x] 用户停留机制生效（村口社区/兴趣圈/每日一问/签到/时间门控/互动推送）
- [x] 后端数据持久化（非内存Mock）
- [x] 微信登录真实对接（非Mock）
- [x] 实时通信（WebSocket）前后端均可用
- [x] 前后端数据模型一致
- [x] 所有Service在Real模式下不抛UnsupportedOperationException
- [x] 所有Store在Mock和Real双模式下均可用
- [x] 首页展示真实聚合数据（非空占位）
- [x] 推荐偏好可持久化并影响推荐结果
