# CI/CD 统一发布流程（Task 8.4.2）

> 本文档定义校园恋爱小程序项目的持续集成与持续部署流程，覆盖从代码提交到生产部署的完整链路。

---

## 〇、SLO 与错误预算（infra R2-00366）

> 需求：用户要求的监控 SLO 定义。原文档仅含告警阈值，无可用性量化目标，本节约定 SLO 与错误预算，后续告警/复盘均以此为准。

### 0.1 服务等级目标（SLO）

| 指标 | 目标（30 天滚动窗口） | 计量方式 |
|------|----------------------|----------|
| API 可用性 | ≥ 99.9% | `ApiDown` / `ApiHealthCheckFailed` 之外的成功请求占比（Probe/日志） |
| API P99 延迟 | ≤ 2s | Prometheus `http_server_requests_seconds_bucket` 分位数 |
| 首页/H5 可用性 | ≥ 99.5% | `ApiDown` 期间首页不可达时长占比 |
| 核心链路（登录/匹配/聊天）错误率 | ≤ 1% | `http_server_requests_seconds_count{status=~"5.."}` / 总请求 |
| 数据库可用性 | ≥ 99.9% | MySQL 容器运行时长占比（up 指标） |
| 备份成功率 | 100%（每日） | 备份脚本产物 + gzip -t 校验 |

### 0.2 错误预算（Error Budget）

- 月度错误预算 = (1 − SLO) × 当月分钟数。以 API 可用性 99.9% 计，每月允许约 43 分钟不可用。
- 消耗规则：每次 P0/P1 故障按实际不可用时长扣减；错误预算耗尽（≤ 20% 剩余）时冻结非紧急发布，优先稳定性投入。
- 月度复盘：每月首个工作日核对 SLO 达成与错误预算消耗，未达标需输出改进项并登记至告警规则（alert-rules.yml 的 burn-rate 记录规则为后续增强项）。

### 0.3 告警与 SLO 的关系

- 固定阈值告警（见 §7.2）用于“正在发生的事故”；SLO 与 burn-rate 告警用于“预算正在被快速消耗”，当前告警规则文件未含 burn-rate 规则，属已知缺口（见 infra-round2 MEDIUM 项），部署 blackbox/记录规则后补充。

---

## 一、整体架构

### 1.1 工具链

| 阶段 | 工具 | 触发条件 | 产物 |
|------|------|----------|------|
| 代码托管 | GitHub | push / PR | 代码评审记录 |
| 持续集成（CI） | GitHub Actions | push/PR 到 main/develop 分支，或 v* tag（R4-02106：无 release/* 触发，与 ci.yml 一致） | 测试报告、构建产物 |
| 容器化 | Docker multi-stage build | CI 通过后 | API/Admin 镜像 |
| 编排部署 | Docker Compose / K8s | 镜像推送后 | 运行实例 |
| 监控告警 | Prometheus + Grafana + Alertmanager | 服务启动后 | 监控面板、告警通知 |
| 数据备份 | cron + mysqldump | 每日凌晨 2 点 | 备份文件（保留 7 天） |

### 1.2 环境分层

| 环境 | Profile | 用途 | 数据库 | 访问范围 |
|------|---------|------|--------|----------|
| 本地开发 | mock | 前端独立开发 | 内存/Mock | 开发者本机 |
| 集成测试 | real | 联调测试 | 测试库 | 内网 |
| 预发布 | real | 发布前验收 | 预发布库 | 内网 + QA |
| 生产 | real | 线上服务 | 生产库 | 公网 |

---

## 二、分支策略

### 2.1 分支模型（Git Flow 简化版）

```
main          ────────●──────────────●─────────────●────────▶ 生产
                       │              │             │
release/v0.1  ────●───┴──────────●───┘             │
                   │              │                 │
hotfix/v0.1.1  ───●──────────────●─────────────────┘
                   │
feature/xxx    ───●─────────●─────────●
                            │
                            ▼
                          PR 合并到 main
```

### 2.2 分支命名规范

- `main`：生产分支，受保护，仅通过 PR 合并
- `release/v{version}`：发布分支，仅修复 bug，不新增功能
- `hotfix/v{version}`：紧急修复分支，从 main 切出，修复后合并回 main 与 release
- `feature/{task-id}-{slug}`：功能分支，如 `feature/p8-dockerize`
- `fix/{task-id}-{slug}`：修复分支，如 `fix/jwt-token-blacklist`

### 2.3 提交规范（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type 取值：**

- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档更新
- `style`：代码格式（不影响功能）
- `refactor`：重构（既不是 feat 也不是 fix）
- `test`：新增/修改测试
- `chore`：构建/工具链/依赖变更
- `ci`：CI 配置变更
- `perf`：性能优化
- `revert`：回滚提交

**示例：**

```
feat(auth): 添加微信登录 code2session 链路

- 新增 WechatAuthController 处理 /api/v1/auth/wechat
- 集成 WeChatClient 调用微信开放平台
- 失败抛 WechatLoginException，统一错误码

Closes #123
```

---

## 三、CI 流程（GitHub Actions）

### 3.1 触发条件

CI workflow 定义在 `.github/workflows/ci.yml`，触发条件如下（对应 `on:` 字段）：

| 事件 | 目标分支 | 说明 |
|------|----------|------|
| `pull_request` | `main`、`develop` | PR 提交时触发，所有 10 个 job 并行/串行执行 |
| `push` | `main`、`develop` | 直接 push 到受保护分支时触发（含 PR 合并后的 push） |
| `push`（tag） | `v*` | 发布 tag 推送时触发（镜像推送+签名，见 §4） |
| `workflow_dispatch` | 任意分支 | 手动触发（Actions 页面按钮或 `gh workflow run ci.yml`） |

> **手动触发**：infra R2-00351 已配置 `workflow_dispatch`（ci.yml:9），可在 GitHub Actions 页面手动触发；
> 也可通过 `gh workflow run ci.yml` 触发（见 §11.2）。
>
> **权限**：infra R2-00352 为 `contents: read` + `packages: write`。
> `packages: write` 仅用于 security-scan 推镜像到 GHCR（push/tag 事件）；
> PR 事件同样具备该权限属已知最小权限缺口，见 .github/workflows/ci.yml 注释（P3-D.2）。
>
> 所有 10 个 job 在 push 与 PR 事件下均会运行；`e2e` 依赖前 9 个 job 全部通过才执行。

### 3.2 Job 结构（10 个 Job 总览）

CI 流程定义在 `.github/workflows/ci.yml`，共 **10 个 Job**（含 `gitleaks-scan` 密钥扫描；Task 53 / P1.16 新增 `phase01-verify`）。权威源以 workflow 文件为准，本文档变更须同步更新 workflow。

| # | Job ID | 名称 | 依赖（needs） | timeout-minutes | 缓存策略 | 主要产物 |
|---|---|---|---|---|---|---|
| 0 | `gitleaks-scan` | Gitleaks Secret Scan | 无 | 15 | 无 | 密钥扫描报告（infra #48） |
| 1 | `lint-and-structure` | Lint & Structure | 无 | 30 | pnpm store | OpenAPI lint（含 Spectral）+ 项目结构测试结果 |
| 2 | `client-typecheck-and-build` | Client Typecheck & Build | 无 | 30 | pnpm store | 客户端 typecheck + H5 / mp-weixin 双构建产物 |
| 3 | `client-test` | Client Unit Tests | 无 | 30 | pnpm store | 客户端 vitest 单元测试结果 |
| 4 | `admin-typecheck-and-build` | Admin Typecheck & Build | 无 | 30 | pnpm store | Admin typecheck + vite build 产物 |
| 5 | `api-compile` | API Compile | 无 | 30 | Maven `~/.m2/repository` | Maven 编译产物（target/classes） |
| 6 | `api-test` | API Unit Tests | `api-compile` | 60 | Maven `~/.m2/repository` | Maven Surefire 测试结果 |
| 7 | `security-scan` | Trivy Security Scan | `api-test` + `admin-typecheck-and-build` | 30 | 无（Trivy action 自带 DB 缓存） | Trivy 源码+镜像扫描报告（HIGH/CRITICAL 失败） |
| 8 | `phase01-verify` | Phase 01 Verify | `security-scan` | 60 | pnpm store + Maven `~/.m2/repository` | `npm run verify:phase01` 综合验证结果 |
| 9 | `e2e` | E2E Tests | 前 9 个 job 全部通过 | 45 | pnpm store | Playwright 测试结果 |

> **触发分支**：`main` 与 `develop`。所有 job 均在 `push` 与 `pull_request` 事件下运行。
>
> **失败行为（fail-fast）**：所有 job 默认 fail-fast——前序 job 失败时后续依赖 job 不执行（通过 `needs` 依赖实现）。例如 `api-compile` 失败则 `api-test` / `security-scan` / `phase01-verify` / `e2e` 均跳过。
>
> **缓存策略说明**（Task 53）：
> - pnpm 缓存：通过 `actions/setup-node@v4` 的 `cache: 'pnpm'` 内置缓存，等价于显式 `actions/cache@v4`，缓存 `~/.local/share/pnpm/store`
> - Maven 缓存：通过 `actions/setup-java@v4` 的 `cache: 'maven'` 内置缓存，等价于显式 `actions/cache@v4`，缓存 `~/.m2/repository`
> - 依赖安装：所有 pnpm install 命令统一使用 `--frozen-lockfile`，强制 lockfile 与 package.json 一致，避免意外更新依赖

#### Job 1: `lint-and-structure`（OpenAPI lint + 项目结构测试）

- **timeout-minutes**：30
- **缓存**：pnpm store（通过 `actions/setup-node@v4` 的 `cache: 'pnpm'`）

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup pnpm | `pnpm/action-setup@v3` (11.17.0) | - |
| Setup Node | `actions/setup-node@v4` (v20, cache=pnpm) | - |
| 安装依赖 | `pnpm install --frozen-lockfile` | lockfile 与 package.json 不一致则失败 |
| OpenAPI lint | `npm run lint:openapi` | 失败则 CI 中止 |
| Spectral lint | `npm run lint:openapi:spectral` | 失败则 CI 中止 |
| 项目结构测试 | `npm run test:structure` | 失败则 CI 中止 |

> 失败行为：任一步骤非零退出码即整个 job 失败，CI 中止；后续 `e2e` 因依赖关系不会执行。

#### Job 2: `client-typecheck-and-build`（客户端 typecheck + H5/mp-weixin 双构建）

- **timeout-minutes**：30
- **缓存**：pnpm store

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup pnpm + Node 20 | `pnpm/action-setup@v3` + `actions/setup-node@v4` | - |
| 安装依赖 | `pnpm install --frozen-lockfile` | lockfile 不一致则失败 |
| 客户端 typecheck | `pnpm --filter @campus-love/client run typecheck` | 失败则 CI 中止 |
| 客户端构建（H5） | `pnpm --filter @campus-love/client run build:h5` | 失败则 CI 中止 |
| 客户端构建（mp-weixin） | `pnpm --filter @campus-love/client run build:mp-weixin` | 失败则 CI 中止 |

> 失败行为：typecheck 或任一构建失败均中止 job；H5 与 mp-weixin 必须同时构建成功。

#### Job 3: `client-test`（客户端单元测试）

- **timeout-minutes**：30
- **缓存**：pnpm store

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup pnpm + Node 20 | 同前 | - |
| 安装依赖 | `pnpm install --frozen-lockfile` | lockfile 不一致则失败 |
| 运行客户端单元测试 | `pnpm --filter @campus-love/client run test:unit` | 失败则 CI 中止 |

> 失败行为：任一测试用例失败即 job 失败。测试框架为 vitest，配置在 `apps/client/vitest.config.ts`。

#### Job 4: `admin-typecheck-and-build`（Admin typecheck + vite build）

- **timeout-minutes**：30
- **缓存**：pnpm store

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup pnpm + Node 20 | 同前 | - |
| 安装依赖 | `pnpm install --frozen-lockfile` | lockfile 不一致则失败 |
| Admin typecheck | `pnpm --filter @campus-love/admin run typecheck` | 失败则 CI 中止 |
| Admin build | `pnpm --filter @campus-love/admin run build` | 失败则 CI 中止 |

> 失败行为：typecheck 或 vite build 任一失败即 job 失败。

#### Job 5: `api-compile`（Java 后端编译）

- **timeout-minutes**：30
- **缓存**：Maven `~/.m2/repository`（通过 `actions/setup-java@v4` 的 `cache: 'maven'`）

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup Java | `actions/setup-java@v4` (temurin 17, cache=maven) | - |
| Maven 编译 | `mvn -B -f apps/api/pom.xml compile` | 失败则 CI 中止 |

> 失败行为：编译错误（包括依赖解析失败、注解处理器失败）即 job 失败，下游 `api-test` 与 `e2e` 跳过。
> 注：`-B` 为 Maven batch mode，避免交互式阻塞（Task 19）。

#### Job 6: `api-test`（Java 后端单元测试）

- **timeout-minutes**：60（后端测试用例较多，超时时间放宽到 60 分钟）
- **缓存**：Maven `~/.m2/repository`
- **依赖**：`needs: api-compile`，必须 `api-compile` 成功后才会执行

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup Java | `actions/setup-java@v4` (temurin 17, cache=maven) | - |
| Maven 测试 | `mvn -B -f apps/api/pom.xml test` | 失败则 CI 中止 |

> 失败行为：任一测试失败即 job 失败，`security-scan` / `phase01-verify` / `e2e` 跳过。

#### Job 7: `security-scan`（Trivy 源码扫描）

- **timeout-minutes**：30
- **依赖**：`needs: [api-test, admin-typecheck-and-build]`，必须 `api-test` 与 `admin-typecheck-and-build` 均成功后才会执行
- **缓存**：无（Trivy action 内部维护漏洞 DB 缓存）

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Trivy 扫描 API 仓库 | `aquasecurity/trivy-action@v0.23.0` (scan-type=fs, scan-ref=apps/api, severity=HIGH,CRITICAL, exit-code=1) | 发现 HIGH/CRITICAL 漏洞则 CI 中止 |
| Trivy 扫描 Admin 仓库 | `aquasecurity/trivy-action@v0.23.0` (scan-type=fs, scan-ref=apps/admin, severity=HIGH,CRITICAL, exit-code=1) | 发现 HIGH/CRITICAL 漏洞则 CI 中止 |
| Trivy 扫描镜像 | `aquasecurity/trivy-action@v0.23.0` (image-ref=单 tag，取 meta 输出第一个 tag) | 镜像漏洞扫描失败则 CI 中止 |

> infra R2-00353：trivy-action 已由 @master 固定为 @v0.23.0（禁止未 pin 的 master 引用，见 ci.yml 注释）。

> 失败行为：扫描发现 HIGH 或 CRITICAL 级别漏洞（`exit-code: 1`）即 job 失败，`phase01-verify` / `e2e` 跳过。
> 注：Trivy 扫描范围为 `apps/api` 与 `apps/admin` 两个子目录的源码与 lockfile（pnpm-lock.yaml / Maven 依赖），用于补充依赖漏洞检测。

#### Job 8: `phase01-verify`（Phase 01 综合验证，P1.16 新增）

- **timeout-minutes**：60（综合验证涉及多 workspace，超时时间放宽到 60 分钟）
- **依赖**：`needs: [security-scan]`，必须 `security-scan` 成功后才会执行
- **缓存**：pnpm store + Maven `~/.m2/repository`

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup pnpm | `pnpm/action-setup@v3` (11.17.0) | - |
| Setup Node | `actions/setup-node@v4` (v20, cache=pnpm) | - |
| Setup Java | `actions/setup-java@v4` (temurin 17, cache=maven) | - |
| 安装依赖 | `pnpm install --frozen-lockfile` | lockfile 不一致则失败 |
| 综合验证 | `npm run verify:phase01` | 失败则 CI 中止 |

> **`verify:phase01` 覆盖的 9 项检查**（定义在根 `package.json:22`）：
> 1. `npm run test`（含 `test:prototype` + `test:structure` + `test:client`）
> 2. `npm run lint:openapi`
> 3. `npm run lint:openapi:spectral`
> 4. `npm --workspace apps/client run typecheck`
> 5. `npm run verify:client-builds`（含 build:h5 + build:mp-weixin）
> 6. `npm run api:test`（等价于 `mvn -B -f apps/api/pom.xml test`）
>
> 失败行为：任一子步骤失败即 job 失败，`e2e` 跳过。
> 注：本 job 与前置 job 有部分重复（如 typecheck / build / api test），但作为最终集成门禁，确保所有验证在同一环境串行通过，避免前置 job 缓存命中差异导致的漏检。

#### Job 9: `e2e`（Playwright E2E，依赖前 9 个 job 全部通过）

- **timeout-minutes**：45（E2E 包含浏览器安装与多场景测试，超时时间放宽到 45 分钟）
- **依赖**：`needs: [lint-and-structure, client-typecheck-and-build, client-test, admin-typecheck-and-build, api-compile, api-test, security-scan, phase01-verify]`，前 9 个 job（含 gitleaks-scan）必须全部成功才会执行
- **缓存**：pnpm store

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup pnpm + Node 20 | 同前 | - |
| 安装依赖 | `pnpm install --frozen-lockfile` | lockfile 不一致则失败 |
| 安装 Playwright 浏览器 | `npx playwright install --with-deps chromium` | 失败则 CI 中止 |
| 运行 Playwright 测试 | `npx playwright test --config=tests/e2e/playwright.config.ts` | 失败则 CI 中止 |

> infra R2-00354：根目录无 playwright.config，必须显式指定 --config（FIN-00278 已修复）。

> 失败行为：任一 E2E 测试失败即 job 失败；前 9 个 job 任一失败时此 job 自动跳过（skipped）。

### 3.3 CI 状态徽章

在 `README.md` 顶部添加：

```markdown
![CI](https://github.com/lx-1203/Love-Mini-Program/actions/workflows/ci.yml/badge.svg)
```

> infra R2-00355：CI 徽章占位符 {org}/{repo} 已替换为真实仓库（git remote 为 git@github.com:lx-1203/Love-Mini-Program.git）。

### 3.4 CI 失败排查指南

CI 失败时，按以下顺序定位与修复。所有 job 失败均会在 GitHub Actions 页面显示红色叉号，点击进入可查看具体 step 的日志。

#### 3.4.1 各 Job 常见失败原因与排查

| Job ID | 常见失败原因 | 排查步骤 | 修复建议 |
|--------|-------------|----------|----------|
| `lint-and-structure` | ① OpenAPI 规范不符；② Spectral lint 报错；③ 项目结构测试失败 | 1. 在 Actions 页面查看具体 step 日志；2. 本地运行 `npm run lint:openapi` 与 `npm run test:structure` 复现 | 按 Spectral 报错信息修改 `docs/openapi/*.yaml`；结构测试失败时检查 `tests/project-structure.spec.mjs` 中的断言 |
| `client-typecheck-and-build` | ① TypeScript 类型错误；② H5/mp-weixin 构建失败 | 1. 查看 typecheck step 日志定位错误文件行号；2. 本地 `pnpm --filter @campus-love/client run typecheck` 复现 | 按 TS 报错修复类型；构建失败多为 import 路径错误或 uni-app 平台差异 |
| `client-test` | ① vitest 单测失败；② mock fixtures 缺失 | 1. 查看 Actions 日志中失败的测试用例名；2. 本地 `pnpm --filter @campus-love/client run test:unit` 复现 | 按断言失败原因修复代码或更新期望值 |
| `admin-typecheck-and-build` | ① Admin TypeScript 类型错误；② vite build 失败 | 1. 查看 typecheck 日志；2. 本地 `pnpm --filter @campus-love/admin run typecheck` 复现 | 同 client-typecheck-and-build |
| `api-compile` | ① Maven 依赖解析失败；② 编译错误；③ 注解处理器失败 | 1. 查看 Maven 编译日志定位错误文件；2. 本地 `mvn -B -f apps/api/pom.xml compile` 复现 | 修复 Java 编译错误；依赖解析失败时检查 pom.xml 或清理 `~/.m2/repository` |
| `api-test` | ① 单测失败；② 集成测试失败；③ 测试超时 | 1. 查看 Surefire 报告 `apps/api/target/surefire-reports/`；2. 本地 `mvn -B -f apps/api/pom.xml test` 复现 | 修复测试逻辑或被测代码；超时时检查是否依赖外部服务 |
| `security-scan` | ① Trivy 发现 HIGH/CRITICAL 漏洞；② Trivy DB 拉取失败 | 1. 查看 Trivy 扫描日志中的 CVE 编号与依赖；2. 本地 `trivy fs --severity HIGH,CRITICAL apps/api` 复现 | 升级有漏洞的依赖到修复版本；误报时在 `trivy.yaml` 中配置 ignore |
| `phase01-verify` | ① 前置 job 已通过但本 job 失败（多为环境差异）；② `verify:phase01` 子步骤失败 | 1. 查看具体失败的子步骤；2. 本地 `npm run verify:phase01` 复现 | 按子步骤报错修复；注意本 job 串行执行所有验证，单点失败即整体失败 |
| `e2e` | ① Playwright 测试失败；② 浏览器安装失败；③ 测试超时 | 1. 查看 Playwright 报告 `playwright-report/`；2. 本地 `npx playwright test --config=tests/e2e/playwright.config.ts` 复现 | 修复测试或被测代码；浏览器安装失败时重试 job（网络问题） |

#### 3.4.2 通用排查流程

1. **查看失败 step 日志**：GitHub Actions → 失败的 run → 点击失败的 job → 展开失败的 step
2. **本地复现**：按 §11.3 本地复现 CI Job 中的命令逐一执行
3. **检查缓存**：若怀疑缓存污染，可在 Actions 页面手动清除 cache（Settings → Actions → Caches）
4. **检查依赖**：`pnpm install --frozen-lockfile` 失败时，本地运行 `pnpm install` 更新 lockfile 后提交
5. **重新运行**：修复后可在 Actions 页面点击 "Re-run failed jobs" 重跑失败的 job（无需重跑全部）

#### 3.4.3 紧急绕过（仅限热修场景）

> ⚠️ **谨慎使用**：绕过 CI 仅适用于生产热修场景，且必须在 24 小时内补回归测试。

- 在 commit message 中添加 `[skip ci]` 可跳过本次 CI（仅 push 事件生效，PR 不受影响）
- 在 PR 标题添加 `[ci skip]` 同样可跳过

---

## 四、CD 流程（持续部署）

### 4.1 镜像构建

CI 通过后，在 `main`/`develop` 分支 push 与 `v*` tag 触发镜像构建（实际由 security-scan job 的 build-push-action 完成；R4-02106：ci.yml 无 `release/*` 事件，此处于 2026-08 修正）

```bash
# API 镜像（多阶段构建：Maven build → JRE runtime）
# infra R2-00356：CI 实际 tag 为 ci-<sha7>（metadata-action type=raw）+ sha-<sha>，
# 并禁止 latest（docker-compose 默认 TAG=dev，TAG=latest 被拒绝）。
docker build -f apps/api/Dockerfile \
  -t ghcr.io/lx-1203/Love-Mini-Program/api:ci-$(git rev-parse --short=7 HEAD) \
  apps/api/

# Admin 镜像（多阶段构建：Node build → nginx 静态托管）
docker build -f apps/admin/Dockerfile \
  -t ghcr.io/lx-1203/Love-Mini-Program/admin:ci-$(git rev-parse --short=7 HEAD) \
  apps/admin/
```

> infra R2-00357：原文档的 `:latest` 与 `GIT_SHA` 变量与 CI 实际 tag 策略冲突（CI 禁 latest），已对齐。

**镜像大小预期：**

- `campus-love-api`：约 250-300 MB（基于 eclipse-temurin:17-jre，分层打包）
- `campus-love-admin`：约 50-80 MB（基于 nginx:1.27-alpine）

### 4.2 镜像推送

```bash
# 登录镜像仓库（GitHub Container Registry / Docker Hub / 私有仓库）
echo $CR_PAT | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# 推送镜像（infra R2-00358：与 CI tag 策略一致，ci-<sha7>，不推 latest）
docker push ghcr.io/lx-1203/Love-Mini-Program/api:ci-$(git rev-parse --short=7 HEAD)
docker push ghcr.io/lx-1203/Love-Mini-Program/admin:ci-$(git rev-parse --short=7 HEAD)
```

### 4.3 部署到目标环境

#### 方式一：Docker Compose（中小规模部署）

```bash
# SSH 到目标服务器
ssh deploy@production-host

# 拉取最新镜像
cd /opt/campus-love
docker compose pull api admin

# 滚动重启（保留旧容器直到新容器健康检查通过）
docker compose up -d --no-deps api admin

# 验证健康状态
docker compose ps
curl http://localhost:8080/actuator/health
```

#### 方式二：Kubernetes（大规模部署）

```bash
# 更新 Deployment 镜像 tag（infra R2-00359：与 CI tag 策略对齐）
kubectl set image deployment/campus-love-api \
  api=ghcr.io/lx-1203/Love-Mini-Program/api:ci-$(git rev-parse --short=7 HEAD) \
  -n campus-love-prod

# 等待 Rollout 完成
kubectl rollout status deployment/campus-love-api \
  -n campus-love-prod \
  --timeout=300s

# 如需回滚
kubectl rollout undo deployment/campus-love-api \
  -n campus-love-prod
```

### 4.4 部署后验证

```bash
# 1. 健康检查
curl -f http://localhost:8080/actuator/health || exit 1

# 2. 关键接口冒烟测试
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"'$ADMIN_PASSWORD'"}' \
  | jq -r '.data.token')
test -n "$TOKEN" || exit 1

# 3. 监控指标确认
curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result[].metric.job'
```

---

## 五、灰度发布策略

### 5.1 API 版本化

- 所有 API 路径以 `/api/v1/` 开头
- 引入破坏性变更时新增 `/api/v2/` 路径，保留 v1 至少 6 个月
- 客户端通过 `VITE_API_BASE_URL` 切换版本

### 5.2 用户分组（按 OpenID 哈希）

> ⚠️ 规划态（R4-02107）：`RealAuthService` 当前无 canary 分流实现，
> 下列代码为规划示例，落地前不可直接照抄。灰度能力落地依赖
> `docs/GRADUAL-RELEASE.md` 中的实现计划（含 `admin_app_switch` 表与配置广播链路）。

```java
// 规划示例（尚未实现）：在 RealAuthService 中根据 openId 哈希值分流
String openId = user.getOpenId();
int hash = Math.abs(openId.hashCode()) % 100;
if (hash < canaryPercent) {
    // 灰度用户：使用新版本逻辑
} else {
    // 普通用户：保持旧版本逻辑
}
```

### 5.3 灰度发布步骤（规划）

> 以下步骤依赖 5.2 的分流实现，当前为规划流程（R4-02107）。

1. **0% 灰度**：部署到生产环境，但不开放任何流量（canaryPercent=0）
2. **5% 灰度**：开放 5% 用户，观察 30 分钟（监控错误率、P99 延迟、业务指标）
3. **25% 灰度**：开放 25% 用户，观察 1 小时
4. **50% 灰度**：开放 50% 用户，观察 2 小时
5. **100% 灰度**：全量发布

**回滚条件：**

- 错误率 > 1%（持续 5 分钟）
- P99 响应时间 > 2s（持续 5 分钟）
- 业务核心指标下降 > 10%（如登录成功率、匹配成功率）

---

## 六、数据库迁移（Flyway）

### 6.1 迁移脚本规范

- 文件位置：`database/flyway/sql/`
- 命名规范：`V{yyyy.MM.dd.xxxx}__{description}.sql`（infra R2-00360：实际迁移为点分四段序号，如 V2026.07.25.0001；原文档写 HHmm 时间戳格式与实际不符）
- 必须幂等：使用 `IF NOT EXISTS` 或 `information_schema` 检查（注：MySQL 8.0 不支持 `CREATE INDEX IF NOT EXISTS`，须用存储过程/information_schema 守卫）
- 必须包含 `DOWN` 回滚脚本注释（R4-02108：存量 127 个迁移脚本中 81 个缺失 DOWN 注释，历史欠账——新迁移强制要求，存量脚本由后续回滚专项逐步补齐）

### 6.2 迁移执行顺序

```
应用启动 → Flyway migrate → 应用就绪
              │
              ▼
         检查 flyway_schema_history
              │
              ▼
         执行未应用的迁移
              │
              ▼
         记录到 flyway_schema_history
```

### 6.3 迁移失败处理

```bash
# 查看迁移状态
docker compose exec api ./mvnw flyway:info

# 修复失败记录（删除 flyway_schema_history 中的失败行）
docker compose exec api ./mvnw flyway:repair

# 修复脚本后重新迁移
docker compose exec api ./mvnw flyway:migrate
```

---

## 七、监控与告警

### 7.1 监控端点

| 服务 | URL | 端口 | 用途 |
|------|-----|------|------|
| Spring Boot Actuator | `/actuator/health` `/actuator/prometheus` | 8080 | 应用健康、指标暴露 |
| Prometheus | `http://prometheus:9090` | 9090 | 指标采集与查询 |
| Grafana | `http://grafana:3001` | 3001 | 可视化面板 |
| Alertmanager | `http://alertmanager:9093` | 9093 | 告警路由与通知 |
| Node Exporter | `http://node-exporter:9100` | 9100 | 主机指标 |

### 7.2 告警规则（详见 `docker/prometheus/rules/alert-rules.yml`）

> infra R2-00361：下表与 alert-rules.yml 实际规则名逐条对齐（原表规则名如 ApiHighP99Latency / MysqlSlowQuery / ThirdPartyApiDown 均不存在，运维按表查不到告警）。

| 告警名 | 触发条件 | 持续时间 | 严重级别 | 通知方式 |
|--------|----------|----------|----------|----------|
| ApiDown | 实例宕机（探活失败） | 1m | CRITICAL | 邮件 + 钉钉 |
| ApiHealthCheckFailed | 健康检查失败 | 1m | CRITICAL | 邮件 + 钉钉 |
| ApiHighLatencyP99 | P99 延迟 > 阈值 | 5m | WARNING | 邮件 |
| ApiHighLatencyP95 | P95 延迟 > 阈值 | 5m | WARNING | 邮件 |
| ApiSlowAverageResponse | 平均响应慢 | 5m | WARNING | 邮件 |
| ApiHighErrorRate | 错误率 > 阈值 | 5m | CRITICAL | 邮件 + 钉钉 |
| ApiHighClientErrorRate | 4xx 错误率 > 阈值 | 5m | WARNING | 邮件 |
| JvmHeapMemoryHigh | JVM 堆内存 > 阈值 | 5m | WARNING | 邮件 |
| JvmThreadsHigh | 线程数过高 | 5m | WARNING | 邮件 |
| JvmFrequentFullGc | Full GC 频繁 | 5m | WARNING | 邮件 |
| DbConnectionPoolHigh | 连接池使用 > 阈值 | 5m | CRITICAL | 邮件 + 钉钉 |
| DbSlowQuery | 慢查询 > 阈值 | 5m | WARNING | 邮件 |
| HostDiskHigh | 磁盘使用 > 阈值 | 5m | CRITICAL | 邮件 + 钉钉 |
| HostMemoryHigh | 内存使用 > 阈值 | 5m | CRITICAL | 邮件 + 钉钉 |
| HostCpuHigh | CPU 使用 > 阈值 | 5m | WARNING | 邮件 |
| HighLoginFailureRate | 登录失败率过高 | 5m | WARNING | 邮件 |

### 7.3 告警通知渠道

- **邮件**：通过 Alertmanager SMTP 配置，发送到运维邮箱
- **钉钉/企业微信**：通过 Alertmanager webhook 配置，发送到运维群
- **值班电话**：仅 CRITICAL 级别（如生产服务宕机）

---

## 八、数据备份与恢复

### 8.1 备份策略

| 备份类型 | 频率 | 保留 | 存储 |
|----------|------|------|------|
| 全量备份 | 每日凌晨 2:00 | 7 天 | 本地 + 异地 |
| 增量备份（binlog） | 实时 | 3 天 | 本地 |
| 异地同步 | 全量备份后 | 30 天 | OSS / S3 |

### 8.2 备份脚本

```bash
# 手动触发备份
# infra R2-00362：compose 实际服务名为 backup（原文档误写 db-backup），
# 脚本容器内路径为 /backup.sh（原文档误写 /backup/scripts/backup-mysql.sh）
docker compose --profile backup up -d
docker compose exec backup /backup.sh

# 验证备份文件
docker compose exec backup ls -lh /backups/
docker compose exec backup gzip -t /backups/campus_love-2026-07-26-020000.sql.gz
```

### 8.3 恢复演练

详见 `docs/DR/restore-procedure.md`，建议每季度执行一次完整恢复演练。

---

## 九、回滚流程

### 9.1 应用回滚

```bash
# Docker Compose 回滚
docker compose pull api:previous-tag
docker compose up -d --no-deps api

# Kubernetes 回滚
kubectl rollout undo deployment/campus-love-api -n campus-love-prod
```

### 9.2 数据库回滚

**重要：数据库回滚必须谨慎，需 DBA 评审**

```bash
# 1. 备份当前数据库（回滚前必做）
# infra R2-00365：compose 实际服务名为 backup，容器内脚本路径为 /backup.sh（原文档误写 db-backup）
docker compose exec backup /backup.sh

# 2. 执行 DOWN 脚本（手动，参考迁移文件末尾注释）
mysql -h 127.0.0.1 -u campus -p campus_love < V2026.xx.xxxx__down.sql

# 3. 修复 flyway_schema_history
docker compose exec api ./mvnw flyway:repair
```

### 9.3 配置回滚

```bash
# 通过 Git revert 回滚配置文件
git revert <commit-sha>
git push origin main

# 重启服务使配置生效
docker compose restart api
```

---

## 十、发布检查清单

发布前请逐项确认（详见 `docs/release-checklist-template.md`）：

- [ ] CI 全部 Job 通过（gitleaks-scan / lint-and-structure / client-typecheck-and-build / client-test / admin-typecheck-and-build / api-compile / api-test / security-scan / phase01-verify / e2e 共 10 个 job）
- [ ] 测试覆盖率达标（前端 ≥ 80%，后端 ≥ 70%）
- [ ] Flyway 迁移在预发布环境验证通过
- [ ] 镜像构建并推送成功
- [ ] 灰度发布计划已制定（5% → 25% → 50% → 100%）
- [ ] 监控告警规则已更新
- [ ] 回滚预案已准备
- [ ] 数据库备份已完成
- [ ] 运维团队已通知
- [ ] 发布窗口已确认（避开业务高峰）

---

## 十一、附录

### 11.1 相关文件

- CI 配置：`.github/workflows/ci.yml`
- API Dockerfile：`apps/api/Dockerfile`
- Admin Dockerfile：`apps/admin/Dockerfile`
- 编排配置：`docker-compose.yml`
- 环境变量模板：`.env.example`
- 监控配置：`docker/prometheus/`、`docker/grafana/`、`docker/alertmanager/`
- 备份脚本：`scripts/backup-mysql.sh`
- 恢复文档：`docs/DR/restore-procedure.md`
- 部署指南：`DEPLOYMENT.md`

### 11.2 常用命令速查

```bash
# 本地启动全部服务
docker compose up -d

# 查看服务日志
docker compose logs -f api

# 进入容器调试
docker compose exec api bash

# 重新构建并启动
docker compose up -d --build api

# 清理全部容器与数据卷（谨慎！）
docker compose down -v

# 触发 CI 手动运行（infra R2-00363：workflow_dispatch 已配置，命令可直接使用）
gh workflow run ci.yml

# 查看 CI 运行状态
gh run list
```

### 11.3 本地复现 CI Job

CI 中 10 个 job（含 gitleaks-scan）的关键步骤可在本地通过下列命令逐一复现，便于在推送前预演。所有命令均假定当前工作目录为仓库根目录 `d:/6/恋爱小程序`。

> **依赖安装提示**：CI 中所有 `pnpm install` 均使用 `--frozen-lockfile`（Task 53），本地首次安装或更新依赖时使用 `pnpm install`（不带该参数）以允许更新 lockfile；更新后须提交 `pnpm-lock.yaml`。

#### Job 1: `lint-and-structure`

```bash
# 安装依赖（首次或 lockfile 变更后）
pnpm install --frozen-lockfile

# OpenAPI lint（含 spectral）
npm run lint:openapi
npm run lint:openapi:spectral

# 项目结构测试
npm run test:structure
```

#### Job 2: `client-typecheck-and-build`

```bash
# 客户端 typecheck
pnpm --filter @campus-love/client run typecheck

# H5 构建
pnpm --filter @campus-love/client run build:h5

# mp-weixin 构建
pnpm --filter @campus-love/client run build:mp-weixin
```

#### Job 3: `client-test`

```bash
# 客户端单元测试（vitest）
pnpm --filter @campus-love/client run test:unit
```

#### Job 4: `admin-typecheck-and-build`

```bash
# Admin typecheck
pnpm --filter @campus-love/admin run typecheck

# Admin vite build
pnpm --filter @campus-love/admin run build
```

#### Job 5: `api-compile`

```bash
# Maven 编译（需本地 JDK 17，-B 为 batch mode）
mvn -B -f apps/api/pom.xml compile
```

#### Job 6: `api-test`

```bash
# Maven 测试（依赖 api-compile 已通过）
mvn -B -f apps/api/pom.xml test
```

#### Job 7: `security-scan`

```bash
# Trivy 源码扫描（需本地安装 trivy CLI）
# CI 中扫描 apps/api 与 apps/admin 两个子目录，本地可分别复现：
trivy fs --severity HIGH,CRITICAL --exit-code 1 apps/api
trivy fs --severity HIGH,CRITICAL --exit-code 1 apps/admin
```

#### Job 8: `phase01-verify`（P1.16 新增）

```bash
# 综合验证（等价于 CI 中的 npm run verify:phase01）
# 包含：test + lint:openapi + spectral + client typecheck + client builds + api:test
npm run verify:phase01
```

#### Job 9: `e2e`

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 安装 Playwright 浏览器
npx playwright install --with-deps chromium

# 运行 Playwright E2E 测试（infra R2-00364：显式指定 config，根目录无 playwright.config）
npx playwright test --config=tests/e2e/playwright.config.ts
```

> 完整复现：建议按 0 → 9 顺序依次执行；任一步骤失败应修复后再继续，与 CI 行为一致。
