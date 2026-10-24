## 1. 整体方案

本项目采用 **pnpm workspace** 作为根级包管理器，配合 **GitHub Actions**（`.github/workflows/ci.yml`）执行代码门禁、构建与镜像安全扫描；运行时通过 **docker-compose.yml** 编排 MySQL/Redis/API/Admin/Client/Prometheus/Grafana/Alertmanager/Backup 等 10 个服务。每个应用各自维护独立的 `Dockerfile`，后端 API 使用 Spring Boot Maven 多阶段构建，前端 Admin/Client 使用 Vite + pnpm 多阶段构建并托管于 nginx alpine。

## 2. 关键文件与职责

- `package.json`：monorepo 根入口，声明 `workspaces: ["apps/client", "apps/admin"]`，集中定义 `api:dev/test`、`client:dev:h5`、`lint`、`test`、`verify:phase01`、`lighthouse:*` 等跨应用脚本。
- `pnpm-workspace.yaml`：workspace 清单 + `allowBuilds`（允许 core-js/esbuild/puppeteer/sharp 等含原生模块的包构建）+ `overrides.@vitejs/plugin-vue=5.0.5`（统一依赖版本）。
- `.npmrc` / `pnpm-lock.yaml`：锁定包管理器与依赖树；CI 强制 `--frozen-lockfile`。
- `docker-compose.yml`：定义 networks (`data-net`/`app-net`)、volumes、10 个 service，按 `mysql/redis → api → admin/client → prometheus → grafana/alertmanager` 顺序启动；所有敏感字段通过 `${VAR:?error}` 强制注入，端口仅绑定 `127.0.0.1`。
- `apps/api/Dockerfile`：Maven 构建 → JRE 17 运行，启用 spring-boot-maven-plugin layers、dumb-init、JVM GC 参数、actuator healthcheck；附带 `trivy-scanner` stage。
- `apps/admin/Dockerfile`、`apps/admin-legacy/Dockerfile`：Node 20 + pnpm 构建 → nginx 1.27-alpine 静态托管，暴露 8080；同样带 trivy-scanner stage。
- `.github/workflows/ci.yml`：6 个 job（gitleaks-scan → lint-and-structure → client-typecheck-and-build → client-test → admin-typecheck-and-build → ...），PR/push main/develop/tags v* 触发，分支级 concurrency 取消旧任务。
- `build-mp-weixin.bat`：Windows 下微信小程序编译入口，检查 pnpm、`pnpm install --frozen-lockfile`、可选注入 `WX_APPID`、调用 `pnpm run build:mp-weixin`。
- `tools/run-api-wrapper.cjs`：包装 Spring Boot 启动（`spring-boot:run -Dspring-boot.run.profiles=mock`）。
- `scripts/*`：大量 QA 自动化脚本（截图、探测、回测）、数据库备份 (`backup-mysql.sh`)、OpenAPI lint (`lint-openapi.mjs`) 等辅助工具。

## 3. 架构与约定

### 3.1 包管理与工作区
- 根 `packageManager` 固定为 `pnpm@11.17.0+sha512...`，CI 通过 `pnpm/action-setup@v3` 安装相同版本，避免漂移。
- Node 引擎要求 `>=18.0.0 <23.0.0`，CI 实际使用 Node 20。
- workspace 子包以 `apps/*` 匹配，但根 `workspaces` 白名单只包含 `apps/client` 和 `apps/admin`（legacy 管理端不纳入 workspace）。

### 3.2 构建管线（CI jobs 顺序）
1. `gitleaks-scan`：git 全量历史密钥扫描（`gitleaks/gitleaks:v8.18.4`）。
2. `lint-and-structure`：`pnpm audit --prod --audit-level high` + ESLint + OpenAPI Spectral + 项目结构测试。
3. `client-typecheck-and-build`：`typecheck` + `build:h5` + `build:mp-weixin`。
4. `client-test`：Vitest 单元测试。
5. `admin-typecheck-and-build`：Vue3/Vite 生产构建。
6. （后续 job 在截断处继续：api-test、security-scan/trivy、e2e 等）。

所有 `pnpm install` 均使用 `--frozen-lockfile`，缓存由 `actions/setup-node@v4` 内置 `cache: 'pnpm'` 提供。

### 3.3 容器化策略
- 所有 Dockerfile 使用**多阶段构建**（builder → runtime → trivy-scanner），基础镜像 pin 到具体小版本（`eclipse-temurin:17.0.12-jdk`、`node:20.15.0-alpine`、`nginx:1.27.3-alpine`、`aquasec/trivy:0.53.0`），禁止浮点 tag。
- 运行时以非 root 用户运行（`USER app` / `USER nginx`）。
- 健康检查统一通过 HTTP 探针（actuator/health、nginx 根路径）。
- Trivy 漏洞扫描作为独立 stage，HIGH/CRITICAL 即失败。
- docker-compose 中镜像 TAG 默认 `dev`，注释明确禁止 `latest` 默认上线，生产需注入 `ci-<sha>` 或 release tag。

### 3.4 数据与安全
- 密码全部通过 `${VAR:?message}` 形式强制注入，未设置则 compose 启动失败。
- 对外端口仅绑定 `127.0.0.1`，Prometheus/Alertmanager 无认证仅限本机访问。
- 网络按安全域拆分：`data-net`（mysql/redis/backup）与 `app-net`（其余服务），API 同时接入两个网络。
- Flyway 迁移目录不挂载到 MySQL `initdb.d`，避免重复执行损坏数据。

## 4. 约定与约束

- **包管理器锁定**：根 `packageManager` 字段 + CI `pnpm/action-setup@v3` + 所有 `pnpm install --frozen-lockfile` 三重保证，依赖版本与锁文件不一致时直接失败（见 `apps/admin/Dockerfile` 注释 infra #36）。
- **基础镜像 pin 版本**：所有 Dockerfile 的基础镜像 tag 固定到具体小版本，禁止浮点 tag（见各 Dockerfile 注释 infra #31/#35）。
- **镜像标签规范**：compose 中镜像 TAG 默认 `dev`，生产必须注入 `ci-<sha>` 或 release tag，禁止 `latest` 默认上线（见 `docker-compose.yml` 顶部 P1.19 说明）。
- **敏感信息注入**：所有密码字段使用 `${VAR:?error message}` 形式，未设置环境变量时 docker compose 启动失败（见 `docker-compose.yml` 顶部 P1.19 安全提示）。
- **最小权限原则**：容器内运行非 root 用户（`USER app` / `USER nginx`），drop `NET_RAW`/`MKNOD`/`SYS_CHROOT` 能力（见 `docker-compose.yml` mysql/redis 服务定义）。
- **对外端口隔离**：所有服务端口仅绑定 `127.0.0.1`，数据库/缓存/监控不暴露公网（见 `docker-compose.yml` 顶部 Infra 加固说明）。
- **CI 并发控制**：同一分支的新提交自动取消进行中的旧工作流（`concurrency.group: ci-${{ github.workflow }}-${{ github.ref }}`）。
- **Trivy 门禁**：所有镜像 Dockerfile 包含 `trivy-scanner` stage，HIGH/CRITICAL 漏洞使构建失败；CI security-scan job 进一步对镜像做 Trivy image 扫描（见 `apps/api/Dockerfile`、`apps/admin/Dockerfile` 注释）。
- **gitleaks 门禁**：CI 首个 job 对 git 全量历史执行密钥扫描（`fetch-depth: 0`）。
- **小程序构建**：Windows 环境通过 `build-mp-weixin.bat` 统一入口，任意步骤失败立即退出，支持通过 `WX_APPID` 环境变量注入 AppID（见脚本头部 Task 8.4.4 改造说明）。
- **Lighthouse 性能基准**：根脚本提供 `lighthouse:client`、`lighthouse:admin`、`lighthouse:ci`（lhci autorun），输出至 `./test-screenshots/`。
- **OpenAPI 校验**：`lint:openapi` 用 openapi-typescript 生成 TS 类型，`lint:openapi:spectral` 用 @stoplight/spectral-cli 校验 YAML 语义，二者均为 CI 门禁项。