# Phase 2 — 每日一问模块 — 任务清单

## 模块概述
实现每日一问功能：每日题目展示、回答提交、匿名模式、回答浏览。

## 依赖关系
- **上游依赖**：phase-0-auth
- **下游被依赖**：无

## 任务列表

- [ ] **T001: 实现每日一问 Mock/Real 服务**
  - 输入：`discover/DailyQuestionService.java` → `MockDailyQuestionService.java` / `RealDailyQuestionService.java`
  - 输出：GET `/api/daily-question`（今日问题）、POST `/api/daily-question/answer`（提交回答）
  - 验收：每日问题唯一、支持匿名回答
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现回答浏览服务**
  - 输入：GET `/api/daily-question/answers?page=0&size=20`
  - 输出：本日所有回答列表（匿名回答显示"匿名用户"）
  - 验收：分页加载、共同回答统计
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现前端每日一问页**
  - 输入：`apps/client/src/pages/daily-question/index.vue`、`apps/client/src/stores/daily-question.ts`
  - 输出：问题展示 + 回答输入区 + 匿名开关 + 回答列表
  - 验收：可以匿名/实名回答，浏览他人回答
  - 测试命令：`npm run test:client`

- [ ] **T004: 实现每日一问入口集成**
  - 输入：在发现页（卡片耗尽）和我的页添加入口
  - 输出：点击入口跳转每日一问页
  - 验收：两处入口均正常跳转
  - 测试命令：`npm run test:client`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 每日一问服务 Mock/Real | ⏳ |
| 回答浏览 | ⏳ |
| 前端页面 | ⏳ |
| 入口集成 | ⏳ |
