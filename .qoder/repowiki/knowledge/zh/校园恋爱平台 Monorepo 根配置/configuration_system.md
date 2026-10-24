## 1. 体系概览

本仓库的「配置系统」以 **Vite `loadEnv` + `.env.[mode]`** 为构建期入口，通过 `apps/client/src/config/` 目录下的集中模块对外暴露类型安全的运行期配置；同时用独立的 **Feature Flags** 模块承载运行时可切换的功能开关。后端 / 基础设施侧则通过 `docker-compose.yml` 的 `environment:` 段与 `.env.example` 注入容器变量。

| 层次 | 位置 | 职责 |
|---|---|---|
| 构建期环境 | `apps/client/.env*`、`vite.config.ts` | 加载 `VITE_*` 变量，静态替换到 `import.meta.env` |
| 运行时配置入口 | `apps/client/src/config/{env,app,api,channels,showcase,feature-flags}.ts` | 统一导出常量、聚合对象、功能开关 |
| 运行时服务层 | `apps/client/src/services/env.ts`、`services/http.ts` | 解析 API Base URL、鉴权头、Sentry DSN 等 |
| 容器编排 | `docker-compose.yml` | 向各服务注入数据库、Redis、RabbitMQ、CORS、Swagger 等环境变量 |

## 2. 关键文件

- `apps/client/vite.config.ts`：调用 `loadEnv(mode, process.cwd(), "VITE_")`，白名单枚举 `VITE_API_MODE / VITE_API_BASE_URL / VITE_APP_VERSION / VITE_SENTRY_DSN`，再通过 `define: { ... }` 把值写入 `process.env.X`，供 uni-app / mp-weixin 在运行时读取。
- `apps/client/src/config/env.ts`：**统一的 VITE_ 环境变量访问入口**，新增于 Task 35，替代历史 `src/services/env.ts`。提供 `readViteEnv(key)`，先走 `import.meta.env.VITE_X`（switch 分支保证 Vite 能静态替换），再回退 `process.env`，最后抛错阻止生产包启动。
- `apps/client/src/config/app.ts`：应用级静态常量（APP_NAME、APP_VERSION、DEBUG_TAG、SUPPORT_EMAIL），版本号单源来自 `VITE_APP_VERSION`。
- `apps/client/src/config/api.ts`：HTTP 请求层聚合配置 `API_CONFIG`（超时、重试、401 处理、拦截器开关），由 `constants/api.ts`、`constants/limits.ts` 提供原始数值。
- `apps/client/src/config/channels.ts`：频道（follow/today/interest/school/activity/hot）元数据，定义 dataSource、postCategory、requiresCampus 等运行时行为参数。
- `apps/client/src/config/showcase.ts`：超级管理员展示模式，读 `VITE_SHOWCASE_MODE`，调用 `applyShowcaseMode()` 在 `main.ts createApp()` 前把 featureFlags 全置 true。
- `apps/client/src/config/feature-flags.ts`：全局 Feature Flags 唯一真相源（`membershipEnabled`、`heartSignalEnabled`、`villageSameCityEnabled`、`whisperEnabled`）。
- `docker-compose.yml`：数据库、Redis、RabbitMQ、Nginx、Prometheus/Grafana 等的 `environment:` 段，要求真实凭据通过 `.env` 注入，`.gitignore` 已排除。

## 3. 架构与约定

### 3.1 构建期 → 运行时的双通道读取

`src/config/env.ts` 的 `readViteEnv` 采用 **三层降级**：
1. `import.meta.env.VITE_X`（Vite 构建期静态替换，需直接具名访问，禁止下标访问）。
2. `process.env.VITE_X`（mp-weixin / vitest / SSR 回退）。
3. 返回 `undefined`，由调用方提供默认值或抛错。

该模式被 `showcase.ts` 复用（`readShowcaseFlag`）以支持 `VITE_SHOWCASE_MODE` 独立键。

### 3.2 类型安全的环境键

`ClientEnvKey` 联合类型限定允许访问的键集：`VITE_API_MODE`、`VITE_API_BASE_URL`、`VITE_APP_VERSION`、`VITE_SENTRY_DSN`、`VITE_MEDIA_TOKEN_QUERY`、`VITE_TENCENT_MAP_KEY`。新增环境变量需在此处声明，否则 TypeScript 编译期报错。

### 3.3 H5 与 mp-weixin 双端兼容

- H5：通过 `import.meta.env` 读取，`isDev` 检测依赖 `window.location.hostname`。
- mp-weixin：无 `window`，`isH5` 为 false，且必须走 `process.env` 路径；`vite.config.ts` 在 uni-app 模式下把 `VITE_*` 注入 `process.env`。
- 所有配置读取都包裹 try/catch，避免在缺失环境时崩溃。

### 3.4 Feature Flags 作为运行时策略开关

`featureFlags` 对象是全局唯一真相源，业务代码按 `if (featureFlags.whisperEnabled)` 等条件渲染。展示模式通过 `applyShowcaseMode()` 在应用启动前改写该对象，不修改源码。

### 3.5 生产安全约束

- 生产环境未显式配置 `VITE_API_BASE_URL` 时直接 `throw new Error(...)`，阻止带错误地址的应用启动。
- `VITE_TENCENT_MAP_KEY` 匹配占位符 `/^your[_-]?key$/i` 视为未配置，调用方跳过外部请求。
- `.env` 文件受 `.gitignore` 排除，`docker-compose.yml` 注释明确要求复制 `.env.example` 后填写强密码。

## 4. 约定与约束（观察到的规则）

1. **所有客户端运行时环境变量必须以 `VITE_` 前缀命名**，并通过 `src/config/env.ts` 的 `ClientEnvKey` 白名单注册后才能被业务代码引用。（来源：`ClientEnvKey` 类型 + `readViteEnv` switch 分支）
2. **Vite 静态替换要求直接具名访问 `import.meta.env.VITE_X`**，禁止中间变量或下标访问，否则 mp-weixin 构建会失败。（来源：`env.ts`、`showcase.ts` 中多处注释与实现）
3. **新增环境变量需同步三处**：`ClientEnvKey` 联合类型、`readViteEnv` 的 switch 分支、以及 `vite.config.ts` 的 `loadEnv` 白名单（`VITE_API_MODE / VITE_API_BASE_URL / VITE_APP_VERSION / VITE_SENTRY_DSN`）。（来源：`env.ts` 注释「与 vite.config.ts 的 define 列表保持一致」）
4. **Feature Flags 是唯一运行时功能开关入口**，业务 UI 不得硬编码功能可见性判断。（来源：`feature-flags.ts` 文档注释 + `showcase.ts` 对 featureFlags 的改写）
5. **生产包未配置 `VITE_API_BASE_URL` 时必须抛错**，不允许静默回退到假地址。（来源：`env.ts` 中 `throw new Error("..."` 及注释对齐 `services/env.ts` 行为）
6. **容器环境变量必须通过 `.env` 注入**，禁止在 `docker-compose.yml` 内写死真实凭据；`.env.example` 提供 `<PLACEHOLDER>` 模板。（来源：`docker-compose.yml` 注释块）
7. **版本单源化**：`APP_VERSION` 仅从 `VITE_APP_VERSION` 解析，与 `manifest.json` 的 `versionName` 保持一致，禁止在 `config/app.ts` 或 `constants/app.ts` 各自维护。（来源：`app.ts` 注释 R4-00207）
8. **存储键名集中管理**：`STORAGE_KEYS` 统一放在 `constants/storage-keys.ts`，`config/channels.ts` 等模块只引用而不重复定义。（来源：`channels.ts` 注释 R4-00232）
9. **开发环境检测不依赖 `import.meta.env.DEV`**，而是组合 `window.location.hostname` 与 `process.env.NODE_ENV`，以避免 mp-weixin 运行时访问 `import.meta` 出错。（来源：`env.ts` 中 `resolveIsDev` 注释）

## 5. 适用性说明

该配置体系主要覆盖前端客户端（uni-app/Vite/mp-weixin）。后端（Spring Boot）与基础设施的配置通过 `docker-compose.yml` 的 `environment:` 段与 `.env` 注入，未见 Spring 侧的 `application.yml`/`application.properties` 加载逻辑在本仓库中出现（后端源码位于 `archive/` 之外未展开的目录中）。因此本文描述的范围严格限定在已验证的前端与编排层。