# 架构决策记录（Architecture Decision Records, ADR）

> 对应规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md` Task 9.2.5
> 格式标准：[MADR（Markdown Any Decision Records）](https://adr.github.io/madr/) v3.0.0
> 维护者：架构组（Architecture Guild）
> 最近更新：2026-07-26

---

## 1. 关于 ADR

### 1.1 什么是 ADR

架构决策记录（ADR）是一种轻量级的文档形式，用于捕获、管理与传达软件架构决策。每个 ADR 描述一个具体的架构决策，包括背景、决策、影响与后果。

### 1.2 为什么需要 ADR

- **可追溯**：记录每个架构决策的来龙去脉，避免"为什么这样设计"的疑问
- **可审查**：新成员加入时可快速了解架构演进史
- **可问责**：决策有明确的提出者、决策者、影响评估
- **防漂移**：防止后续修改时偏离原始设计意图
- **降耦合**：将决策与代码分离，便于跨团队沟通

### 1.3 MADR 格式

本项目的 ADR 采用 MADR（Markdown Any Decision Records）格式，包含以下字段：

- **Status**：proposed / accepted / deprecated / superseded by [ADR-xxx]
- **Context**：决策背景与问题陈述
- **Decision Drivers**：驱动决策的因素
- **Considered Options**：考虑过的方案
- **Decision**：最终决策
- **Consequences**：决策带来的后果（正面 + 负面）
- **Pros and Cons of the Options**：各方案优缺点对比

---

## 2. ADR 索引

### 2.1 已采纳的决策

| ADR 编号 | 标题 | 状态 | 决策日期 | 决策者 |
|----------|------|------|----------|--------|
| [ADR-0001](./0001-technology-stack-selection.md) | 技术栈选型：Spring Boot + Vue 3 + uni-app | Accepted | 2026-05-18 | 架构组 |
| [ADR-0002](./0002-authentication-jwt-wechat.md) | 认证方案：JWT + 微信登录 | Accepted | 2026-05-20 | 安全组 |
| [ADR-0003](./0003-database-mysql-utf8mb4.md) | 数据库选型：MySQL 8 + utf8mb4 | Accepted | 2026-05-22 | DBA |
| [ADR-0004](./0004-cache-redis-cluster.md) | 缓存方案：Redis + Caffeine 两级缓存 | Accepted | 2026-05-25 | 架构组 |
| [ADR-0005](./0005-media-storage-auth-proxy.md) | 媒体存储：本地分片 + 鉴权代理 | Accepted | 2026-07-26 | 安全组 |
| [ADR-0006](./0006-api-versioning-uri-prefix.md) | API 版本化：URI 前缀 `/api/v1/` | Accepted | 2026-07-26 | 架构组 |
| [ADR-0007](./0007-i18n-vue-i18n-message-source.md) | 国际化方案：vue-i18n + Spring MessageSource | Accepted | 2026-07-26 | 前端组 |
| [ADR-0008](./0008-resilience4j-circuit-breaker.md) | 韧性模式：Resilience4j 熔断 + 重试 | Accepted | 2026-07-26 | 架构组 |
| [ADR-0009](./0009-monorepo-pnpm-workspace.md) | 代码仓库：pnpm monorepo | Accepted | 2026-05-18 | 工程效率组 |
| [ADR-0010](./0010-deployment-docker-compose.md) | 部署方案：Docker Compose + 多服务编排 | Accepted | 2026-07-26 | DevOps |

### 2.2 已废弃的决策

| ADR 编号 | 标题 | 废弃原因 | 废弃日期 | 替代方案 |
|----------|------|----------|----------|----------|
| （暂无） | | | | |

### 2.3 待决策

| ADR 编号 | 标题 | 状态 | 提议日期 |
|----------|------|------|----------|
| （暂无） | | | |

---

## 3. ADR 流程

### 3.1 提议 ADR

1. 复制 `0000-template.md` 为 `00XX-<kebab-case-title>.md`
2. 填写各字段，特别关注 Context 与 Decision Drivers
3. 提交 PR，标签 `adr`
4. 至少 2 位架构组成员 Review

### 3.2 评审 ADR

- **参与人**：架构组、相关业务方、安全/DBA 等专业角色
- **评审标准**：决策合理、选项全面、后果清晰、与现有架构一致
- **评审周期**：建议 1 周

### 3.3 状态流转

```
[Proposed] → [Accepted] → [Deprecated]
                ↓
        [Superseded by ADR-XXX]
```

- **Proposed**：已提议但未评审
- **Accepted**：已评审通过，作为正式决策
- **Deprecated**：不再适用，但未被新决策替代
- **Superseded**：被新 ADR 替代

### 3.4 修改 ADR

- 已 Accepted 的 ADR **不可直接修改**
- 如需变更，创建新 ADR 标记为 `Supersedes ADR-XXX`，原 ADR 状态改为 `Superseded by ADR-YYY`

---

## 4. ADR 编写规范

### 4.1 文件命名

```
docs/adr/XXXX-<kebab-case-title>.md
```

- XXXX：4 位数字，从 0001 递增
- title：简短描述，kebab-case

### 4.2 文件头

每个 ADR 必须包含以下元信息：

```markdown
# ADR-XXXX: <标题>

- **Status**: Accepted
- **Date**: YYYY-MM-DD
- **Deciders**: <决策者列表>
- **Tags**: <标签，如 security/database/frontend>
```

### 4.3 字段要求

- **Context**：≥ 200 字，描述问题背景、当前痛点
- **Decision Drivers**：≥ 3 个驱动因素
- **Considered Options**：≥ 2 个候选方案
- **Pros and Cons**：表格对比
- **Decision**：明确选定的方案
- **Consequences**：正面 + 负面后果

---

## 5. 相关资源

- [MADR 官方文档](https://adr.github.io/madr/)
- [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- 项目内相关文档：
  - `docs/CI-CD.md`
  - `docs/DR/DRP.md`
  - `docs/API-CONTRACT.md`
  - `DEPLOYMENT.md`

---

## 6. 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-07-26 | v1.0 | 首次建立 ADR 体系，包含 10 个决策 | 架构组 |
