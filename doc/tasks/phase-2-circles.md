# Phase 2 — 兴趣圈模块 — 任务清单

## 模块概述
实现兴趣圈系统：圈子列表、加入/退出、话题发布/回复、圈成员管理。

## 依赖关系
- **上游依赖**：phase-0-auth
- **下游被依赖**：无（精选话题出现在村口"兴趣圈"分类）

## 任务列表

- [ ] **T001: 实现兴趣圈列表 + 加入/退出服务**
  - 输入：`discover/CircleService.java` → `MockCircleService.java` / `RealCircleService.java`
  - 输出：GET `/api/circles`（圈子列表）、POST `/api/circles/{id}/join`（加入）、DELETE `/api/circles/{id}/join`（退出）
  - 验收：圈子列表含名称/图标/成员数、加入后出现在"我的圈子"
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现圈话题 + 回复服务**
  - 输入：GET `/api/circles/{id}/topics`、POST `/api/circles/{id}/topics`、POST `/api/circles/{id}/topics/{topicId}/replies`
  - 输出：话题列表（分页）、发布话题、话题详情含回复列表
  - 验收：回复可 @ 他人、发布后圈成员可见
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现前端兴趣圈列表页**
  - 输入：`apps/client/src/pages/circles/index.vue`、`apps/client/src/stores/circle.ts`
  - 输出：圈子分类浏览 + 我的圈子 + 加入/退出按钮
  - 验收：加入/退出即时生效
  - 测试命令：`npm run test:client`

- [ ] **T004: 实现前端圈内话题页**
  - 输入：`apps/client/src/pages/circles/topics.vue`、`topic-detail.vue`、`post-topic.vue`
  - 输出：话题列表 + 话题详情 + 发布话题
  - 验收：话题列表中可看到回复数、发布时间
  - 测试命令：`npm run test:client`

- [ ] **T005: 实现精选话题在村口的展示**
  - 输入：村口"兴趣圈"分类筛选
  - 输出：圈内精选话题出现在村口"兴趣圈"分类下
  - 验收：非圈成员可浏览但不可回复
  - 测试命令：`npm run api:test`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 圈子列表+加入/退出 | ⏳ |
| 话题+回复 | ⏳ |
| 前端列表页 | ⏳ |
| 前端话题页 | ⏳ |
| 村口精选展示 | ⏳ |
