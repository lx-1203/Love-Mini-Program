# Phase 2 — 活动模块 — 任务清单

## 模块概述
实现校园活动系统：活动列表、活动详情、报名/取消报名、活动日历。

## 依赖关系
- **上游依赖**：phase-0-auth
- **下游被依赖**：无

## 任务列表

- [ ] **T001: 实现活动列表 + 详情服务**
  - 输入：`discover/ActivityService.java` → `MockActivityService.java` / `RealActivityService.java`
  - 输出：GET `/api/activities`（活动列表，支持状态筛选）、GET `/api/activities/{id}`（详情）
  - 验收：活动含标题/封面/时间/地点/状态/报名人数
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现活动报名 + 取消服务**
  - 输入：POST `/api/activities/{id}/enroll`、DELETE `/api/activities/{id}/enroll`
  - 输出：报名成功/取消 → 报名人数实时更新
  - 验收：同一用户不可重复报名、取消后可重新报名
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现前端活动列表 + 详情页**
  - 输入：`apps/client/src/subpackages/discover/activities/index.vue`、`apps/client/src/stores/activity.ts`
  - 输出：横向滑动活动卡片（首页）+ 活动列表 + 活动详情 + 报名按钮
  - 验收：卡片有状态标签（报名中/进行中/预告）、详情展示完整信息
  - 测试命令：`npm run test:client`

- [ ] **T004: 实现活动入口集成**
  - 输入：在首页和我的页添加活动入口
  - 输出：首页活动横向滚动、我的页活动入口
  - 验收：入口正确跳转活动列表
  - 测试命令：`npm run test:client`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 活动列表+详情 | ⏳ |
| 报名+取消 | ⏳ |
| 前端页面 | ⏳ |
| 入口集成 | ⏳ |
