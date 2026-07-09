# Phase 2 — 资料模块 — 任务清单

## 模块概述
实现用户资料编辑、学校认证、资料完善度计算、推荐偏好设置。资料100%完善是解锁全部功能的硬门禁。

## 依赖关系
- **上游依赖**：phase-0-auth
- **下游被依赖**：phase-2-checkin（签到需要资料完成）

## 任务列表

- [ ] **T001: 实现资料编辑 Mock/Real 服务**
  - 输入：`profile/ProfileService.java` → `MockProfileService.java` / `RealProfileService.java`
  - 输出：GET `/api/profile`（获取资料）、PUT `/api/profile`（更新资料）
  - 验收：支持头像上传、昵称/性别/生日/简介编辑、兴趣标签选择、学校/年级/专业填写
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现资料完善度计算**
  - 输入：`SocialProgress` Entity + 权重配置
  - 输出：完善度百分比（头像20% + 昵称10% + 性别10% + 生日10% + 学校20% + 专业10% + 兴趣10% + 简介10%）
  - 验收：每次资料更新后重新计算完善度
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现学校认证服务**
  - 输入：`profile/ProfileController.java`、`CampusCertification` Entity
  - 输出：POST `/api/profile/certification` → 提交学生证照片+学号 → 管理员审核 → 认证标识
  - 验收：上传成功 → 待审核状态 → 审核通过/拒绝通知
  - 测试命令：`npm run api:test`

- [ ] **T004: 实现推荐偏好设置服务**
  - 输入：`RecommendationPreference` Entity
  - 输出：PUT `/api/profile/preferences` → 更新推荐偏好（同校优先/同城/不限 + 时间偏好）
  - 验收：偏好保存后影响推荐候选人排序
  - 测试命令：`npm run api:test`

- [ ] **T005: 实现前端资料页**
  - 输入：`apps/client/src/pages/profile/index.vue`、`apps/client/src/stores/profile.ts`
  - 输出：个人信息展示 + 完善度进度条 + 功能菜单 + 编辑入口
  - 验收：完善度实时更新、菜单跳转正确、蓝色主题配色
  - 测试命令：`npm run test:client`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 资料编辑 Mock/Real | ⏳ |
| 完善度计算 | ⏳ |
| 学校认证 | ⏳ |
| 推荐偏好设置 | ⏳ |
| 前端资料页 | ⏳ |
