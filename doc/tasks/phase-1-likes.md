# Phase 1 — 喜欢模块 — 任务清单

## 模块概述
实现双向喜欢系统：喜欢列表、访客列表、心跳信号触发、互相匹配检测、资料未完善锁定。

## 依赖关系
- **上游依赖**：phase-0-auth、phase-1-discover（喜欢操作由发现页触发）
- **下游被依赖**：phase-1-messages（心跳信号→开聊→私信）

## 任务列表

- [ ] **T001: 实现喜欢列表 Mock/Real 服务**
  - 输入：`apps/api/src/main/java/com/campuslove/api/match/MockMatchService.java` / `RealMatchService.java`
  - 输出：GET `/api/likes/liked-me` → 喜欢我的人列表（头像、昵称、学校、时间）
  - 验收：分页加载，支持"喜欢我的"和"我喜欢的"两个方向
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现访客列表服务**
  - 输入：`Visitor` Entity + Repository
  - 输出：GET `/api/likes/visitors` → 访客记录列表（头像、昵称、访问时间、已读/未读）
  - 验收：记录"谁看过我"，按时间倒序
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现心跳信号触发逻辑**
  - 输入：`HeartSignal` Entity + Repository、`match/RealMatchService.java`
  - 输出：用户A喜欢用户B → 检测B是否喜欢A → 是 → 创建 HeartSignal → 双方通知
  - 验收：心跳信号含24h倒计时、对方摘要信息、"直接开聊"入口
  - 测试命令：`npm run api:test`

- [ ] **T004: 实现前端喜欢页双Tab + 锁定态**
  - 输入：`apps/client/src/pages/likes/index.vue`、`apps/client/src/stores/likes.ts`
  - 输出：「喜欢我的」和「访客」双标签页，资料未完善显示模糊锁定态
  - 验收：完善资料前模糊头像+引导文案；完善后显示真实列表
  - 测试命令：`npm run test:client`

- [ ] **T005: 实现前端心跳信号 UI**
  - 输入：`apps/client/src/components/chat/HeartSignal.vue`
  - 输出：心跳信号卡片（头像、学校、倒计时、开聊按钮）
  - 验收：倒计时实时更新，超时显示"已过期"
  - 测试命令：`npm run test:client`

- [ ] **T006: 实现破冰话题服务**
  - 输入：`match/IcebreakerService.java`、`IcebreakerTopic` Entity
  - 输出：GET `/api/icebreaker/topics` → 破冰话题列表
  - 验收：返回随机破冰话题，帮助用户开启对话
  - 测试命令：`npm run api:test`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 喜欢列表 Mock/Real | ⏳ |
| 访客列表 | ⏳ |
| 心跳信号触发 | ⏳ |
| 前端双Tab + 锁定态 | ⏳ |
| 心跳信号 UI | ⏳ |
| 破冰话题 | ⏳ |
