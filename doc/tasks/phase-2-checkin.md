# Phase 2 — 签到模块 — 任务清单

## 模块概述
实现每日签到功能：签到操作、连续天数追踪、签到奖励（额外推荐次数）。

## 依赖关系
- **上游依赖**：phase-0-auth
- **下游被依赖**：无

## 任务列表

- [ ] **T001: 实现签到 Mock/Real 服务**
  - 输入：`growth/CheckInService.java` → `MockCheckInService.java` / `RealCheckInService.java`
  - 输出：GET `/api/check-in/status`（今天是否已签到、连续天数）、POST `/api/check-in`（执行签到）
  - 验收：每日只能签到一次，连续天数正确计算
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现签到奖励逻辑**
  - 输入：`CheckInConfig.java`
  - 输出：签到后额外 +3 次推荐候选人
  - 验收：签到后当日推荐配额增加3张
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现前端签到入口 + UI**
  - 输入：`apps/client/src/stores/checkin.ts`、签到组件（出现在发现页顶部）
  - 输出：签到按钮 + 连续天数展示 + 签到成功动效
  - 验收：签到后按钮变为"已签到"，连续天数更新
  - 测试命令：`npm run test:client`

- [ ] **T004: 验证签到与推荐的联动**
  - 输入：签到后推荐配额变更
  - 输出：签到 → 推荐配额 +3 → 在发现页可浏览更多候选人
  - 验收：Mock/Real 模式数据一致
  - 测试命令：`npm run api:test`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 签到服务 Mock/Real | ⏳ |
| 签到奖励逻辑 | ⏳ |
| 前端签到 UI | ⏳ |
| 签到→推荐联动 | ⏳ |
