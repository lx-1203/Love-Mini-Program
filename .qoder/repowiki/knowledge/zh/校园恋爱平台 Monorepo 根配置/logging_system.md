## 1. 总体方案

本仓库是一个包含 Java Spring Boot 后端、Vue 管理后台（admin/admin-legacy）和 uni-app H5/小程序客户端的 Monorepo。日志体系按运行环境拆分：

- **后端（apps/api）**：基于 Logback（SLF4J），通过 `logback-spring.xml` 集中配置输出到控制台/文件，并按 profile 切换级别；通过自定义 Filter 注入 MDC `traceId`；独立审计日志输出到 `audit.log`；访问日志由 Tomcat AccessLogValve 输出到独立文件。
- **管理后台（apps/admin / apps/admin-legacy）**：统一的 `utils/logger.ts` 封装 `console.debug/info/warn/error`，以 `[LEVEL]` 前缀输出，生产环境自动静默 `debug`。
- **客户端（apps/client）**：异常与性能数据通过 `services/sentry.ts` 上报至 Sentry（H5），在 mp-weixin 环境下降级为 `console.error` + 后端 `/api/error-reports` 接口上报；业务调试仍大量使用直接 `console.log`（构建脚本与临时 patch 脚本尤为明显）。
- **脚本层（scripts/**）**：绝大多数运维/QA 脚本直接使用 Node 原生 `console.log`，无统一 logger 抽象。

## 2. 关键文件

| 模块 | 文件 | 作用 |
|---|---|---|
| 后端 | `apps/api/src/main/resources/logback-spring.xml` | Logback 全局配置：Appender、滚动策略、敏感字段脱敏、审计日志、异步输出、profile 级别 |
| 后端 | `apps/api/src/main/java/com/campuslove/api/config/TraceIdFilter.java` | 请求级 traceId 生成/校验/MDC 注入/响应头回写 |
| 后端 | `apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java` | 审计事件（媒体访问 granted/denied）调用审计 logger 的记录示例 |
| 管理后台 | `apps/admin/src/utils/logger.ts` | 统一 logger（复制自 admin-legacy） |
| 管理后台 | `apps/admin-legacy/src/utils/logger.ts` | 旧版统一 logger（与新版一致） |
| 客户端 | `apps/client/src/services/sentry.ts` | Sentry 初始化、异常捕获、降级上报、消息/性能采集 |
| 客户端 | `apps/client/scripts/patch-login-all.cjs` 等 | 通过代码补丁向业务代码注入 `captureException` 调用 |

## 3. 架构与设计决策

### 3.1 后端：Logback + 多 Appender + 审计分离
- **输出目标**：
  - `CONSOLE`：开发环境仅控制台。
  - `FILE`：主业务日志，按日+100MB 滚动，保留 30 天，总上限 10GB。
  - `ERROR_FILE`：仅 ERROR 级别，独立文件便于快速定位。
  - `AUDIT`：审计日志，单行 JSON，保留 90 天（合规要求），独立文件 `audit.log`。
  - `ACCESS_FILE`：Tomcat 访问日志，保留 14 天，总上限 5GB。
- **安全**：所有 Pattern 使用 `%replace(...)` 正则对 `password/passwd/sessionToken/accessToken/refreshToken/secret/appSecret/jwtSecret/openId/unionId` 等字段脱敏为 `***`。
- **性能**：文件输出经 `AsyncAppender`（队列 2048，neverBlock=true）异步写入；审计日志走专用 Logger `com.campuslove.api.audit`（additivity=false，避免重复输出）。
- **可观测性**：`TraceIdFilter` 在请求入口生成或透传 `X-Trace-Id`，放入 MDC `traceId`，所有日志自动携带该 ID，并回写响应头供客户端关联。

### 3.2 管理后台：轻量 console 包装
- 单一 `logger.ts` 暴露 `{ debug, info, warn, error }` 四个方法。
- `debug` 仅在 `import.meta.env.MODE === "development"` 时输出，生产自动静默，避免泄露调试信息。
- 所有输出附加 `[DEBUG]/[INFO]/[WARN]/[ERROR]` 前缀，方便浏览器控制台过滤与日志采集器解析。

### 3.3 客户端：Sentry + 平台感知降级
- **H5**：通过 `@sentry/vue` 初始化，启用 `browserTracingIntegration`，`tracesSampleRate: 0.2`，对 20% 事务采样性能数据。
- **mp-weixin**：跳过 Sentry SDK 加载（条件编译 `// #ifdef H5`），降级为 `console.error` + 异步 POST 到后端 `/api/error-reports`。
- **统一出口**：`captureException(error, context?)` 对外隐藏平台差异；context 中的 `source`、`http_url`、`http_status` 提取为 Sentry tag，其余作为 extra 附带。
- 业务侧通过脚本（如 `patch-login-all.cjs`）将 `captureException` 注入到登录等关键路径。

## 4. 约定与约束

- **后端日志级别策略**（`logback-spring.xml` 中 springProfile 声明）：
  - `dev/local/mock`：root INFO，`com.campuslove.api` DEBUG，Hibernate SQL TRACE。
  - `real/prod`：root INFO，项目包 INFO，Spring/Hikari/Lettuce 降至 WARN。
  - 未指定 profile：默认 root INFO，项目包 DEBUG。
- **审计日志必须通过** `LoggerFactory.getLogger("com.campuslove.api.audit")` 记录，格式为单行 JSON（见 AUDIT_PATTERN），覆盖媒体访问、管理员登录/操作、权限变更、敏感数据访问等事件。
- **traceId 贯穿全链路**：上游 `X-Trace-Id` 优先使用，非法时降级生成 UUID；请求结束后从 MDC 清除，防止线程池复用串流。
- **禁止明文凭据落盘**：Logback 的 `CONSOLE_PATTERN`/`FILE_PATTERN`/`AUDIT_PATTERN` 均强制替换敏感字段；访问日志不再记录含 query 的完整 URL，避免 JWT/token 泄露。
- **前端统一入口**：管理后台禁止直接调用 `console.*`，应通过 `@/utils/logger`；客户端异常上报应通过 `services/sentry` 的 `captureException`，而非裸 `console.error`。
- **脚本层无统一规范**：`scripts/**` 下 QA/运维脚本普遍直接 `console.log`，不属于受控日志体系范围，主要用于本地调试与 CI 输出。

## 5. 适用性说明

本类别适用于本仓库，因为存在跨多端的结构化日志体系（后端 Logback + 审计 + traceId、管理后台统一 logger、客户端 Sentry 集成与降级），而非裸 `console.log` 散落模式。但脚本层日志尚未纳入统一框架，属于局部实现。