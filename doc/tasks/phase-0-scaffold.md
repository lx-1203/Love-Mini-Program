# Phase 0 — 项目骨架 — 任务清单

## 模块概述
验证并完善项目脚手架：构建链路、目录结构、配置文件、Mock/Real 双模式切换。

## 依赖关系
- **上游依赖**：无（Phase 0 起点）
- **下游被依赖**：phase-0-database, phase-0-auth

## 任务列表

- [ ] **T001: 验证项目目录结构**
  - 输入：`docs/project-structure-detailed.md`
  - 输出：目录结构检查报告
  - 验收：`npm run test:structure` 通过
  - 测试命令：`npm run test:structure`

- [ ] **T002: 验证 package.json 构建脚本**
  - 输入：`package.json`
  - 输出：所有脚本可正常执行
  - 验收：`npm run api:dev`（mock profile启动成功）、`npm run client:dev:h5`（H5 dev server启动）
  - 测试命令：`npm run test`

- [ ] **T003: 验证 Maven Wrapper 可用**
  - 输入：`apps/api/mvnw.cmd` / `mvnw`
  - 输出：mvnw 可正常执行
  - 验收：`mvnw --version` 输出正常，`npm run api:test` 通过
  - 测试命令：`npm run api:test`

- [ ] **T004: 验证 Python 工具链**
  - 输入：`run_full_test.py`、`tools/`、`scripts/`
  - 输出：Python 脚本可正常运行
  - 验收：`pytest` 全部通过、`mypy --strict` 0 error、`ruff check` 0 error
  - 测试命令：`pytest && mypy --strict . && ruff check`

- [ ] **T005: 验证 OpenAPI 契约完整性**
  - 输入：`docs/openapi/*.yaml`
  - 输出：所有契约通过 lint
  - 验收：`npm run lint:openapi` 通过、`npm run lint:openapi:spectral` 通过
  - 测试命令：`npm run lint:openapi && npm run lint:openapi:spectral`

- [ ] **T006: 验证 Mock/Real 双模式切换**
  - 输入：`apps/client/src/services/env.ts`、`apps/api/src/main/resources/application-mock.properties`
  - 输出：确认 Mock/Real 切换机制工作正常
  - 验收：Mock 模式启动无报错，Real 模式配置正确
  - 测试命令：手动验证 `npm run client:dev:h5` vs `npm run client:dev:h5:real`

- [ ] **T007: 验证 H5 + 小程序构建**
  - 输入：`apps/client/src/`
  - 输出：两种构建均成功
  - 验收：`npm run verify:client-builds` 通过
  - 测试命令：`npm run verify:client-builds`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| `npm run test:structure` 通过 | ⏳ |
| `npm run test` 通过 | ⏳ |
| `npm run api:test` 通过 | ⏳ |
| `pytest && mypy --strict && ruff check` 通过 | ⏳ |
| `npm run lint:openapi` 通过 | ⏳ |
| Mock/Real 切换正常 | ⏳ |
| H5 + 小程序构建成功 | ⏳ |
