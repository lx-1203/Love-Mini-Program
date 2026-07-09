# Phase 1 — 寻觅模块 — 任务清单

## 模块概述
实现全屏卡片滑动推荐：每日候选人列表、喜欢/拒绝/挽回、每日限额、时间门控、底部村口动态流。

## 依赖关系
- **上游依赖**：phase-0-auth（认证就绪）、phase-0-database（User/Like/PassRecord表）
- **下游被依赖**：phase-1-likes（喜欢需要推荐候选）

## 任务列表

- [ ] **T001: 实现推荐候选人 Mock 服务**
  - 输入：`apps/api/src/main/java/com/campuslove/api/discover/MockRecommendationService.java`
  - 输出：GET `/api/discover/candidates` → 今日推荐候选人列表（≤10人）
  - 验收：返回候选人含头像、昵称、学校、年级、专业、兴趣标签、简介
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现推荐候选人 Real 服务**
  - 输入：`apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java`
  - 输出：基于推荐偏好 + 同校优先 + 互动历史 的推荐算法
  - 验收：候选人按权重排序，排除已喜欢/已拒绝/已匹配用户
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现每日限额 + 时间门控**
  - 输入：`RecommendationConfig.java`
  - 输出：每日限额10张、中午12点刷新
  - 验收：当日耗尽返回空列表 + "明天12点刷新"提示
  - 测试命令：`npm run api:test`

- [ ] **T004: 实现喜欢/拒绝操作 + 挽回**
  - 输入：`POST /api/discover/like/{userId}`、`POST /api/discover/pass/{userId}`、`POST /api/discover/rewind`
  - 输出：喜欢写入 likes 表并检测双向匹配；拒绝写入 pass_records；挽回恢复最后一条 pass
  - 验收：喜欢后触发心动信号（如双向）；每日挽回1次
  - 测试命令：`npm run api:test`

- [ ] **T005: 实现前端卡片滑动组件**
  - 输入：`apps/client/src/components/discover/CardSwiper.vue`
  - 输出：全屏卡片 UI，左滑/右滑/上滑触摸手势
  - 验收：滑动流畅，卡片动画自然，超级喜欢有特效
  - 测试命令：`npm run test:client`

- [ ] **T006: 实现前端发现页完整交互**
  - 输入：`apps/client/src/pages/discover/index.vue`、`apps/client/src/stores/discover.ts`
  - 输出：卡片滑动→喜欢/拒绝→底部动态流→卡片耗尽替代入口
  - 验收：全链路 Mock/Real 模式一致
  - 测试命令：`npm run test:client`

- [ ] **T007: 实现挽回历史浏览**
  - 输入：`apps/client/src/pages/discover/history.vue`
  - 输出：今日已拒绝卡片列表，支持挽回
  - 验收：挽回后卡片回到候选人列表，当日只能挽回1次
  - 测试命令：`npm run test:client`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| Mock 推荐候选人接口 | ⏳ |
| Real 推荐算法 | ⏳ |
| 每日限额+时间门控 | ⏳ |
| 喜欢/拒绝/挽回操作 | ⏳ |
| 前端卡片滑动组件 | ⏳ |
| 完整发现页交互 | ⏳ |
| 挽回历史浏览 | ⏳ |
