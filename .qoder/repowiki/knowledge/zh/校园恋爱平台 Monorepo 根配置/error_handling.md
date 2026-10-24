## 1. 整体方案

该 monorepo 采用「后端 Spring `@RestControllerAdvice` 全局异常处理器 → 标准化 JSON 响应体 → 前端统一错误类」的端到端错误处理链。客户端（uni-app）与管理端（admin v2）各自维护 HTTP 层，但共享同一套错误语义。

- **后端**：`GlobalExceptionHandler`（`apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java`）作为唯一入口，将业务异常、校验异常、认证异常等全部映射为统一的 `{ status, error, message, details? }` 结构。
- **客户端**：`AppApiError` / `EnhancedApiError`（`apps/client/src/services/api-error.ts`、`http.ts`）+ `error-toast.ts` 提供分类、文案解析与 toast 展示。
- **管理端**：独立的 `ApiError`（`apps/admin/src/api/http.ts`），走 `fetch` 封装，401 自动登出并跳转。
- **监控**：Sentry 通过 `captureException` / `addBreadcrumb` 在 HTTP 层与 WebSocket 层上报。

## 2. 关键文件

| 层级 | 文件 | 职责 |
|---|---|---|
| 后端 | `apps/api/.../config/GlobalExceptionHandler.java` | 全局异常 → 标准 JSON 错误体；生产 profile 下脱敏 |
| 客户端核心 | `apps/client/src/services/api-error.ts` | `AppApiError` 类型 + `toAppApiError` / `createMockApiError` 转换器 |
| 客户端 HTTP | `apps/client/src/services/http.ts` | 请求拦截器、重试、401 刷新、`EnhancedApiError`、Sentry 集成 |
| 客户端 UI | `apps/client/src/utils/error-toast.ts` | 错误分类、i18n 化消息、`showErrorToast` |
| 客户端常量 | `apps/client/src/constants/api.ts` | 状态码常量、AI 服务专用错误码 |
| 客户端 Sentry | `apps/client/src/services/sentry.ts` | `captureException` / `addBreadcrumb` 平台适配封装 |
| 管理端 HTTP | `apps/admin/src/api/http.ts` | 独立 `ApiError`、幂等键、401 自动登出 |
| 全局错误 | `apps/client/src/utils/global-error.ts` | 捕获未处理异常并上报 Sentry |

## 3. 架构约定

### 3.1 后端统一响应契约

`GlobalExceptionHandler` 注释明确声明标准格式：

```json
{ "status": int, "error": string, "message": string, "details?": unknown }
```

每个 `@ExceptionHandler` 方法都调用 `buildErrorResponse` 构造此结构。对生产 profile（含 `prod` 或 `real`）启用脱敏——通用未捕获异常只返回 `code/message/traceId/timestamp`，不暴露异常类名/堆栈/根因消息，而业务异常（如 `BusinessException`）透传面向用户的 message。

### 3.2 客户端错误类层次

```
Error
├── AppApiError (api-error.ts)
│   └── EnhancedApiError (http.ts) — 增加 category: "network" | "auth" | "business"
└── ApiError (admin/http.ts) — 管理端独立实现，带 body 字段
```

- `AppApiError` 携带 `status` / `error` / `details`，由 `toAppApiError(status, payload)` 把后端任意响应体规范化；缺失字段时回退到 `fallbackErrorShape`，按状态码生成 `bad_request` / `unauthorized` / `forbidden` / `not_found` / `server_error` / `request_error` 等错误码，文案走 i18n (`apiErrors.*`)。
- `EnhancedApiError` 继承自 `AppApiError`，增加 `category` 字段，供上层按类别分支处理。
- 管理端 `ApiError` 是独立实现（非继承），因为 admin v2 使用原生 `fetch` 且需保留原始 `body` 给调用方解包。

### 3.3 错误分类策略

`error-toast.ts` 与 `http.ts` 中的分类逻辑一致：

1. `EnhancedApiError.category` 优先使用；
2. `AppApiError` 按状态码推断：401/403 → auth，0 → network，其余 → business；
3. 字符串/普通 Error 检查关键词 `timeout` / `network` / `abort` → network；
4. 兜底 → unknown。

### 3.4 用户可见文案规则

- 网络错误与权限错误：一律显示分类默认文案（`errorToast.network` / `apiErrors.unauthorized`），避免向用户暴露 `timeout`、`token`、`401` 等技术细节。
- 业务错误：优先使用后端返回的已格式化 message；若为空则回退到调用方传入的 fallback（如 "提交失败"）→ 分类默认文案。
- 所有文案经 `t()` 解析，支持 zh-CN / en-US 切换。

### 3.5 401 处理与重试

`constants/api.ts` 集中定义：
- `DEFAULT_TIMEOUT_MS = 10000`、`DEFAULT_RETRY_COUNT = 1`、`DEFAULT_RETRY_DELAY_MS = 500`（指数退避）
- `HTTP_STATUS_NETWORK_ERROR = 0`（仅对网络层错误重试）
- `MAX_401_RETRY_COUNT = 1`（防止 token 刷新后仍 401 形成死循环）

`http.ts` 中 401 由队列统一处理，触发 token 刷新；刷新超时 `REFRESH_TIMEOUT_MS = 8000`（短于默认请求超时，让刷新失败尽早暴露）。

### 3.6 AI 服务错误隔离

`constants/api.ts` 定义专用错误码：
- `AI_API_UNAUTHORIZED_CODE = "AI_API_UNAUTHORIZED"`：上游 API Key 失效，区别于 JWT `unauthorized`
- `AI_API_ERROR_CODE = "AI_API_ERROR"`：上游 4xx(非 401)/5xx 或网络异常
- `AI_API_TIMEOUT_MS = 30000`：独立超时，避免正常长耗时生成被误判为失败

## 4. 观察到的约定与约束

- **统一入口**：后端所有异常必须通过 `GlobalExceptionHandler` 转成标准 JSON，禁止 Controller 直接 `throw new ResponseEntity`。
- **生产脱敏**：`GlobalExceptionHandler.isProductionProfile()` 判断 `spring.profiles.active` 是否包含 `prod` 或 `real`，生产环境禁止透传内部异常信息。
- **前端错误对象化**：catch 块中不应直接使用 `unknown` 错误对象，应通过 `AppApiError` / `EnhancedApiError` 的类型字段做分支；纯文本错误最终也经 `toAppApiError` 包装。
- **UI 层统一 Toast**：业务模块通过 `showErrorToast(error, fallback)` 展示错误，不再自行拼凑用户可读文案。
- **Sentry 接入点单一**：所有异常上报经过 `services/sentry.ts` 的 `captureException` / `addBreadcrumb`，而非直接调用 `Sentry.captureException`。
- **WebSocket 不可用容错**：`error-toast.ts` 中 `uni.showToast` 调用被 try/catch 包裹，极端环境静默忽略，避免报错阻断主流程。
- **常量集中**：HTTP 状态码、超时、重试参数集中在 `constants/api.ts`，调用方不得硬编码数字状态码。
- **i18n 强制**：R4-batch2 起所有错误文案（包括 fallback）走 `apiErrors.*` / `errorToast.*` i18n 键集，禁止硬编码中文。

## 5. 管理端差异

管理端 (`apps/admin/src/api/http.ts`) 没有复用客户端的 `AppApiError`，而是自建 `ApiError extends Error`，原因：
- 使用原生 `fetch` 而非 uni.request；
- 需要保留原始 `body` 给 `unwrapApiData` 解包 ApiResponse；
- 401 直接清空 `localStorage.admin_v2_token` 并 `reLaunch` 到登录页，不走客户端的 token 刷新队列。
