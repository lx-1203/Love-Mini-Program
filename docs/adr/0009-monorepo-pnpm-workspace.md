# ADR-0009: 代码仓库 - pnpm monorepo

- **Status**: Accepted
- **Date**: 2026-05-18
- **Deciders**: 工程效率组、架构组、前端 Lead、后端 Lead
- **Tags**: tooling, monorepo, build, ci-cd, developer-experience

---

## Context and Problem Statement

校园恋爱小程序项目包含 3 个独立但高度耦合的应用：

1. **客户端**（`apps/client`）：Vue 3 + uni-app，同时构建微信小程序与 H5
2. **管理后台**（`apps/admin`）：Vue 3 + Element Plus
3. **后端 API**（`apps/api`）：Spring Boot 3 + Java 17

外加 5 个共享的关注点：

- API 契约（OpenAPI 定义，前端生成 TypeScript 类型）
- 设计 Token（客户端与 Admin 共享颜色/排版/间距）
- i18n 文案（中英双语，跨端共享 key）
- 测试与 E2E（Playwright 跨端流程）
- 文档（API 契约、ADR、运维手册）

仓库结构选型直接影响：

1. **代码复用**：设计 Token、API 类型、工具函数能否在客户端与 Admin 间共享
2. **协同效率**：跨端联调时切换目录、启动多个进程的便利性
3. **CI/CD 复杂度**：是否每个应用独立流水线，还是统一编排
4. **版本一致性**：API 契约变更能否同步触达所有端
5. **新人上手**：clone 一次即可获得全栈代码，还是需要 clone 多个仓库
6. **依赖管理**：第三方依赖版本是否能在端间统一

需在「单仓库（monorepo）」与「多仓库（polyrepo）」之间作出选型，并选择具体的 monorepo 工具链。

---

## Decision Drivers

- **跨端共享**：客户端与 Admin 共享设计 Token、API 类型、i18n key，必须能直接 import
- **API 契约同步**：后端 OpenAPI 变更后，客户端类型重新生成必须 ≤ 1 个命令
- **联调效率**：本地一键启动 API + Client + Admin 三个服务
- **CI 简化**：一次 PR 触发所有受影响的端构建与测试
- **依赖一致性**：Vue / Pinia / vue-i18n 等共享库版本必须跨端一致
- **磁盘与安装速度**：node_modules 体积控制（pnpm 硬链接 + content-addressable store）
- **未来扩展**：可能新增 camps-mini（小程序独立版）或运营工具，需易于添加

---

## Considered Options

### 方案 A：pnpm workspace 单仓库（**选定**）

- **包管理器**：pnpm 11.x（含 workspace）
- **目录结构**：

  ```
  campus-love/
  ├── apps/
  │   ├── client/      # 客户端（uni-app + Vue 3）
  │   ├── admin/       # 管理后台（Vue 3 + Element Plus）
  │   └── api/         # 后端 API（Spring Boot，Maven 管理）
  ├── packages/        # 共享包（预留）
  │   ├── shared-types/   # OpenAPI 生成的 TypeScript 类型
  │   ├── design-tokens/  # 设计 Token
  │   └── ui-common/      # 跨端 UI 组件
  ├── docs/            # 跨端共享文档
  ├── pnpm-workspace.yaml
  ├── package.json     # 根 package.json，含脚本编排
  └── tsconfig.base.json
  ```

- **脚本编排**：根 `package.json` 通过 `--filter` 调用子包脚本

### 方案 B：npm workspace 单仓库

- 使用 npm 8+ 内置 workspace
- 优势：无需额外安装
- 劣势：磁盘占用大（无硬链接）、安装慢、无法精细控制依赖版本

### 方案 C：Yarn workspace 单仓库

- 使用 Yarn 1.x（classic）或 Yarn 2+（Berry）
- 优势：成熟生态
- 劣势：Yarn Berry 配置复杂，Plug'n'Play 与 uni-app 兼容性未验证

### 方案 D：Turborepo + pnpm workspace

- 在 pnpm workspace 之上叠加 Turborepo 编排构建
- 优势：增量构建、远程缓存、依赖图调度
- 劣势：增加工具链复杂度，团队学习成本

### 方案 E：多仓库（polyrepo）

- 每个端一个独立 Git 仓库
- 通过 npm package 发布共享代码
- 优势：仓库体积小、权限隔离
- 劣势：跨端联调需 npm link 或频繁发版，API 契约同步困难

---

## Pros and Cons of the Options

### 方案 A（pnpm workspace）

| 优点 | 缺点 |
|------|------|
| ✅ 跨端 import 共享代码（`@campus-love/shared-types`） | ❌ Java/Maven 不在 pnpm 管理范围，需双工具链 |
| ✅ 硬链接 + content-addressable store，磁盘节省 50%+ | ❌ 部分老旧 npm 包对 pnpm 符号链接兼容性差 |
| ✅ `pnpm --filter` 精准控制子包脚本 | ❌ CI 配置需显式安装 pnpm（`corepack enable`） |
| ✅ 严格的依赖隔离，防止幽灵依赖 | ❌ 团队需学习 pnpm 特有命令 |
| ✅ 一次 `pnpm install` 安装所有依赖 | |
| ✅ 与 Vite/uni-app/Vitest 兼容良好 | |

### 方案 B（npm workspace）

| 优点 | 缺点 |
|------|------|
| ✅ 无需额外安装 | ❌ 安装慢，磁盘占用大 |
| ✅ 工具链最简单 | ❌ 无依赖隔离，幽灵依赖问题 |
| | ❌ `npm --workspace` 命令较新，部分场景兼容性差 |

### 方案 C（Yarn workspace）

| 优点 | 缺点 |
|------|------|
| ✅ Yarn 1.x 成熟稳定 | ❌ Yarn Berry PnP 与 uni-app 兼容性未验证 |
| ✅ 社区文档丰富 | ❌ 配置复杂度高于 pnpm |

### 方案 D（Turborepo + pnpm）

| 优点 | 缺点 |
|------|------|
| ✅ 增量构建与远程缓存 | ❌ 工具链复杂度上升 |
| ✅ 依赖图调度，并行构建 | ❌ 团队规模尚小，收益有限 |
| | ❌ 远程缓存需自建或付费 |

### 方案 E（多仓库）

| 优点 | 缺点 |
|------|------|
| ✅ 仓库体积小 | ❌ 共享代码需发版，迭代慢 |
| ✅ 权限隔离清晰 | ❌ API 契约同步靠人工，易出错 |
| | ❌ 本地联调需 npm link，体验差 |
| | ❌ CI 流水线重复建设 |

---

## Decision

**选定方案 A：pnpm workspace 单仓库**

具体决策：

### 1. 包管理器

- **pnpm 11.17.0**（在根 `package.json` 中通过 `packageManager` 字段锁定）
- 启用 Corepack：`corepack enable && corepack prepare pnpm@11.17.0 --activate`
- 工作区配置：`pnpm-workspace.yaml` 声明 `packages: ["apps/*"]`

### 2. 仓库结构

```
campus-love/
├── apps/
│   ├── client/              # uni-app 客户端
│   ├── admin/               # 管理后台
│   └── api/                 # Spring Boot 后端（Maven 管理，与 pnpm 隔离）
├── packages/                # 预留共享包目录
├── docs/                    # 跨端共享文档
├── tests/                   # E2E 与项目结构测试
├── tools/                   # 构建辅助脚本
├── pnpm-workspace.yaml
├── package.json             # 根编排脚本
└── tsconfig.base.json
```

### 3. 脚本编排

根 `package.json` 提供跨端编排脚本：

```json
{
  "scripts": {
    "api:dev": "node tools/run-api-wrapper.cjs spring-boot:run -Dspring-boot.run.profiles=mock",
    "api:test": "node tools/run-api-wrapper.cjs test",
    "client:dev:h5": "npm --workspace apps/client run dev:h5",
    "client:dev:h5:real": "npm --workspace apps/client run dev:h5:real",
    "generate:openapi": "npm --workspace apps/client run generate:openapi",
    "test": "npm run test:prototype && npm run test:structure && npm run test:client",
    "verify:phase01": "npm run test && npm run lint:openapi && ...",
    "verify:client-builds": "node tools/verify-client-builds.mjs"
  }
}
```

### 4. Java/Maven 隔离

- `apps/api` 下的 Maven 项目不纳入 pnpm 工作区
- 通过根 `package.json` 的 `tools/run-api-wrapper.cjs` 包装 `mvnw` 命令
- CI 流水线分别执行 `mvn` 与 `pnpm` 命令

### 5. 依赖一致性

- 共享依赖（Vue / Pinia / vue-i18n / TypeScript）在根 `package.json` 与子包 `package.json` 中显式声明版本
- 使用 `pnpm-lock.yaml` 锁定全树版本
- `pnpm outdated -r` 检查所有子包过期依赖

---

## Consequences

### 正面后果

- **跨端共享**：客户端与 Admin 可直接 import 共享包（设计 Token / 类型 / 工具函数），无需发版
- **API 契约同步**：后端 OpenAPI 变更后，`pnpm run generate:openapi` 一键重新生成客户端 TypeScript 类型
- **本地联调**：`pnpm install` 一次完成所有依赖安装，3 个端可同时启动
- **CI 简化**：一次 PR 触发客户端 typecheck + Admin typecheck + API test，统一报告
- **磁盘节省**：pnpm 硬链接节省 ~50% node_modules 体积（实测 ~1.2GB → ~600MB）
- **依赖一致性**：`pnpm-lock.yaml` 单一锁文件，所有子包版本对齐
- **新人友好**：`git clone && pnpm install` 即可上手全栈

### 负面后果

- **双工具链**：pnpm（前端）+ Maven（后端），CI 需同时配置 Node.js 与 JDK 环境
- **仓库体积**：单仓库 clone 较慢（含全部历史），但通过 `.dockerignore` 与浅克隆可缓解
- **权限粒度粗**：所有端在同一仓库，无法按端做代码权限隔离（团队规模小，可接受）
- **pnpm 学习成本**：团队成员需熟悉 `pnpm --filter`、`pnpm -r`、`pnpm exec` 等命令
- **uni-app 兼容性**：少数老旧依赖（如 HBuilderX 插件）对 pnpm 符号链接支持有限，需 `node-linker=hoisted` 兜底

### 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| pnpm 符号链接在 Windows 下偶发问题 | `.npmrc` 配置 `node-linker=hoisted` 兜底；CI 在 Linux 下执行 |
| Maven 与 pnpm 双工具链增加 CI 复杂度 | CI 拆分 `frontend` / `backend` 两个 job，并行执行 |
| 仓库体积膨胀 | `.gitignore` 严格排除 `node_modules`/`target`/`dist`/`build` |
| 子包相互引用导致循环依赖 | ESLint `no-restricted-imports` 规则限制 `packages/*` 内部依赖方向 |
| 锁文件冲突 | `pnpm-lock.yaml` 仅由 `pnpm install` 生成，禁止手改 |

---

## Compliance Note

- 本决策符合项目硬约束：所有页面过渡逻辑内联在 .vue 文件中（与 monorepo 结构无冲突）
- `pnpm-workspace.yaml` 仅声明 `apps/*`，不污染后端 Maven 项目
- 根 `package.json` 的 `packageManager` 字段锁定 pnpm 版本，符合 Corepack 规范
- `apps/api` 保持 Maven 标准布局，与 Spring Boot 官方推荐一致

---

## Related Documents

- [ADR-0001: 技术栈选型](./0001-technology-stack-selection.md)
- [ADR-0010: 部署方案](./0010-deployment-docker-compose.md)
- `pnpm-workspace.yaml`、`package.json`（具体配置）
- `docs/CI-CD.md`（CI 流水线设计）
- `docs/project-structure-detailed.md`（目录结构详解）

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-18 | 首次提议 | 工程效率组 |
| 2026-05-20 | 评审通过，正式采纳 | 架构组 |
| 2026-07-26 | 补充 packages/ 预留目录与共享包规划 | 工程效率组 |
