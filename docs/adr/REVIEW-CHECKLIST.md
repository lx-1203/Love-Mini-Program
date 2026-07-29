# ADR 复核检查单

> 用于定期复核架构决策记录（ADR）与当前实现的一致性。
> 对应 REAUDIT-REPORT-100+ 第 3.5 节编号 114。
> 创建日期：2026-07-27

## 复核周期

- 每季度一次（Q1 / Q2 / Q3 / Q4 季度末）
- 重大架构变更后立即触发（如技术栈替换、核心模块重构、部署形态变更）
- 发版前可选触发（建议在 major 版本前执行完整复核）

## 复核步骤

- [ ] 列出 `docs/adr/` 下所有 ADR 文件
- [ ] 对每个 ADR：
  - [ ] 阅读决策内容与上下文
  - [ ] 在代码中找到对应实现（`apps/api` / `apps/client` / `apps/admin` / 根配置）
  - [ ] 检查实现是否与 ADR 一致
  - [ ] 若不一致，更新 ADR 或修复代码
  - [ ] 在 ADR 末尾增加"最近复核日期"与"复核人"两行
- [ ] 在本检查单末尾追加本次复核记录（日期 + 复核人 + 不一致项数 + 处理结果）

## 复核判定原则

- **决策已落地**：代码中存在对应实现且行为与 ADR 描述一致 -> 标 `已落地`
- **决策部分落地**：核心实现存在但缺失细节（如限流参数未配置） -> 标 `部分落地`，并列出待补项
- **决策未落地**：代码中找不到对应实现 -> 标 `未落地`，并立即在代码中补齐或更新 ADR
- **决策已变更**：实际实现已偏离 ADR 且不可逆 -> 标 `已变更`，必须更新 ADR 记录新决策与变更原因
- **决策已废弃**：对应模块已下线 -> 标 `已废弃`，在 ADR 顶部增加废弃声明并指向替代 ADR

## ADR 列表

- 0001-technology-stack-selection.md
- 0002-authentication-jwt-wechat.md
- 0003-database-mysql-utf8mb4.md
- 0004-cache-redis-cluster.md
- 0005-media-storage-auth-proxy.md
- 0006-api-versioning-uri-prefix.md
- 0007-i18n-vue-i18n-message-source.md
- 0008-resilience4j-circuit-breaker.md
- 0009-monorepo-pnpm-workspace.md
- 0010-deployment-docker-compose.md

## 单 ADR 复核模板（复制使用）

```markdown
## 复核记录：ADR-NNNN

- 复核日期：YYYY-MM-DD
- 复核人：<姓名 / GitHub handle>
- 状态：已落地 / 部分落地 / 未落地 / 已变更 / 已废弃
- 一致性证据（文件路径 + 行号）：
  - apps/api/src/main/java/.../XxxController.java:LNN
  - apps/client/src/.../xxx.ts:LNN
- 不一致项：
  1. <描述>
- 处理结果：
  - [ ] 更新 ADR（PR #xxx）
  - [ ] 修复代码（PR #xxx）
  - [ ] 创建替代 ADR（ADR-NNNN）
```

## 复核历史汇总

| 复核日期 | 复核人 | 已复核 ADR 数 | 不一致项数 | 处理 PR |
|---|---|---|---|---|
| 2026-07-27 | 初始创建 | 0 | - | - |

> 首次复核任务由架构 Lead 在 2026-Q3 内执行，结果回填本表。
