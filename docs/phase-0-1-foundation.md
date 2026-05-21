# Phase 0 / 1 工程基础说明

> 当前产品范围、页面信息架构与验收链路以 `docs/phase-1-execution-plan.md` 为准。  
> 本文只保留工程基础约束，不再承担产品主规范角色。

## 运行基线

- 后端默认 profile 为 `mock`，启动与测试都不依赖 MySQL 或 Flyway。
- 数据库相关演进仍可通过 `db` profile 单独推进。
- 客户端默认走 mock fixtures；切到真实接口时使用 `apps/client/.env.real`。
- `apps/api/mvnw.cmd` 已修正 Windows 路径转义问题，可继续作为仓库默认 Maven 入口。

## 验证入口

- `npm test`：原型契约、目录结构、客户端单元测试。
- `npm run api:test`：Spring Boot mock runtime API 测试。
- `npm run verify:phase01`：在 `npm test` 之外增加 OpenAPI lint、客户端类型检查、H5 构建与后端 API 测试。

## 当前硬约束

- 主聊天链路保持 `24 小时临时匿名聊天`，不引入长期 IM 关系。
- 当前消息类型只覆盖 `text / voice / emoji / system`。
- `今日 AI 计划` 不是首发阶段的独立一级入口，也不是 `Phase 0 / 1` 的独立接口；当前通过 `GET /home/dashboard` 中的 `aiPlan` 模块交付。
- 当 `chat_ai_enabled = false` 或模型不可用时，`aiPlan` 仍必须返回稳定的规则兜底 / 静态推荐文案；这属于首发允许状态，不构成阻塞项。
- 讨论圈与活动仍以轻量浏览和入口为主，不扩成完整社区或活动系统。
- mock mode 与 real mode 都必须覆盖同一套首页、匹配、聊天、资料补全主流程。

## 历史文档关系

- `docs/superpowers/specs/2026-05-18-miniapp-chat-only-scope.md`：历史废弃文档。
- `docs/superpowers/specs/2026-05-18-chat-rtc-mixed-architecture-design.md`：未来独立产品的架构参考，不作为当前仓库交付基线。
