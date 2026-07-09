# Phase 0 — 认证模块 — 任务清单

## 模块概述
实现微信登录、JWT 签发/刷新、会话管理、Token 黑名单。Mock 模式用模拟用户，Real 模式对接微信 API。

## 依赖关系
- **上游依赖**：phase-0-database（User 表就绪）
- **下游被依赖**：所有 Phase 1/2 模块（全部需要认证）

## 任务列表

- [ ] **T001: 实现微信登录 Mock 服务**
  - 输入：`apps/api/src/main/java/com/campuslove/api/auth/MockAuthService.java`
  - 输出：Mock 登录返回模拟 JWT token
  - 验收：POST `/api/auth/login` → 200 + `{ accessToken, refreshToken }`
  - 测试命令：`npm run api:test`（AuthController 测试）

- [ ] **T002: 实现微信登录 Real 服务**
  - 输入：`apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java`
  - 输出：Real 模式通过微信 code 换取 openId，签发 JWT
  - 验收：POST `/api/auth/login` → 200 + 有效 JWT
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现 JWT Token 刷新**
  - 输入：JWT 配置（access: 30min, refresh: 7d）
  - 输出：POST `/api/auth/refresh` 返回新 access token
  - 验收：过期 access token 能通过 refresh token 刷新
  - 测试命令：`npm run api:test`

- [ ] **T004: 实现登出 + Token 黑名单**
  - 输入：`SecurityUtils.java`、`JwtTokenProvider.java`
  - 输出：POST `/api/auth/logout` → 当前 token 加入黑名单
  - 验收：登出后 token 无法再访问受保护端点
  - 测试命令：`npm run api:test`

- [ ] **T005: 实现前端认证流程**
  - 输入：`apps/client/src/stores/session.ts`、`apps/client/src/services/api.ts`
  - 输出：前端自动携带 JWT、token 过期自动刷新、登出清理
  - 验收：登录→请求→过期→刷新→重试 全链路无感知
  - 测试命令：`npm run test:client`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| Mock 登录返回 JWT | ⏳ |
| Real 登录返回 JWT | ⏳ |
| Token 刷新流程正常 | ⏳ |
| 登出黑名单生效 | ⏳ |
| 前端认证流程无缝 | ⏳ |
