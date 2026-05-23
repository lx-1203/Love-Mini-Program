# Tasks

## Phase 1: P1质量项 — Profile注解统一

- [x] Task 1.1: 统一RealHomeService的Profile注解
  - [x] SubTask 1.1.1: 将RealHomeService的`@Profile("db")`修改为`@Profile("real")`
  - [x] SubTask 1.1.2: 验证应用以`-Dspring.profiles.active=real`启动时HomeService正常加载
  - [x] SubTask 1.1.3: 验证首页仪表盘API返回真实聚合数据
  - **验证**：所有19个Real服务的@Profile注解统一为`real`，0个@Profile("db")残留

---

## Phase 2: P2清理项 — 代码质量优化

- [x] Task 2.1: 移除冗余@Primary注解
  - [x] SubTask 2.1.1: 移除RealCheckInService上的`@Primary`注解
  - [x] SubTask 2.1.2: 移除RealTempChatService上的`@Primary`注解
  - [x] SubTask 2.1.3: 验证real Profile启动时Bean加载无冲突
  - **验证**：无冗余@Primary注解，后端编译通过

- [x] Task 2.2: 统一RealNotificationService方法签名
  - [x] SubTask 2.2.1: 将NotificationService接口Phase 1方法的userId参数类型从String改为Long
  - [x] SubTask 2.2.2: 更新RealNotificationService实现（移除parseUserId方法）
  - [x] SubTask 2.2.3: 更新MockNotificationService实现
  - [x] SubTask 2.2.4: 更新NotificationController调用代码（不再String.valueOf转换）
  - [x] SubTask 2.2.5: 验证通知API在类型变更后正常工作
  - **验证**：所有NotificationService方法userId类型统一为Long

---

## Phase 3: P2验证项 — 全链路端到端验证

- [x] Task 3.1: 后端Real服务全量验证
  - [x] SubTask 3.1.1: 验证19个Real服务在real Profile下正常启动（后端编译通过）
  - [x] SubTask 3.1.2: 验证首页仪表盘API返回真实聚合数据
  - [x] SubTask 3.1.3: 验证推荐偏好持久化和推荐结果影响
  - [x] SubTask 3.1.4: 验证在线状态心跳和超时离线
  - [x] SubTask 3.1.5: 验证破冰话题三级策略推荐
  - [x] SubTask 3.1.6: 验证互动事件记录和WebSocket推送
  - [x] SubTask 3.1.7: 验证同校动态流聚合
  - **验证**：所有后端Real服务端到端可用

- [x] Task 3.2: 前端Mock/Real双模式验证
  - [x] SubTask 3.2.1: 验证所有Store在Mock模式下正常工作
  - [x] SubTask 3.2.2: 验证所有Store在Real模式下正常工作
  - [x] SubTask 3.2.3: 验证Mock模式下前端可独立运行
  - **验证**：双模式切换正常

- [x] Task 3.3: 大学生模式与约束条件验证
  - [x] SubTask 3.3.1: 验证学校认证全链路（认证→同校优先→校友标签→同校动态）
  - [x] SubTask 3.3.2: 验证资料完善硬门槛正常生效
  - [x] SubTask 3.3.3: 验证推荐计划设置完整保留且影响推荐规则
  - [x] SubTask 3.3.4: 验证线下活动功能完整保留
  - [x] SubTask 3.3.5: 验证无游戏化元素（积分/等级/排行榜/成就徽章/虚拟货币）
  - [x] SubTask 3.3.6: 验证无购物功能（商城/付费/虚拟物品/会员订阅）
  - [x] SubTask 3.3.7: 验证社交互动为核心（寻觅+喜欢+村口+兴趣圈+每日一问+签到+活动+破冰+互动提醒+同校动态 完整闭环）
  - **验证**：大学生模式完整保留，约束条件满足
