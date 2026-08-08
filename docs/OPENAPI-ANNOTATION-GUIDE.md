# OpenAPI 注解补全指南（P9 / Task 9.1.1）

> 对应规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md` Task 9.1.1
> 配置基础：`apps/api/src/main/java/com/campuslove/api/config/OpenApiConfig.java`（P8 / Task 8.4.1 已就位）
> 访问入口：`/swagger-ui.html`（Swagger UI 页面）、`/v3/api-docs`（OpenAPI JSON）、`/v3/api-docs.yaml`（OpenAPI YAML）

---

## 1. 总览

P8 阶段已在 `pom.xml` 中引入 `springdoc-openapi-starter-webmvc-ui`，并在 `OpenApiConfig.java` 中完成：
- OpenAPI 3 元信息（标题、版本、描述、联系人、许可证）
- JWT Bearer 鉴权方案（SecurityScheme = `bearerAuth`）
- 全局默认 SecurityRequirement
- 服务器地址配置（本地 + 远端，支持环境变量注入）

P9 阶段需在所有 Controller 方法上补全以下注解，使 Swagger UI 展示完整接口语义：

| 注解 | 作用 | 必填 |
|------|------|------|
| `@Tag(name, description)` | Controller 类级别分组 | ✅ |
| `@Operation(summary, description, operationId)` | 方法说明 | ✅ |
| `@ApiResponses({@ApiResponse(...)})` | HTTP 响应码与描述 | ✅ |
| `@Parameter(name, description, required, example)` | 路径/查询/请求头参数 | ✅ |
| `@SecurityRequirement(name = "bearerAuth")` | 显式声明鉴权要求 | ✅（默认全局已声明，可省略） |
| `@Schema(implementation = ...)` | 响应体类型 | 推荐 |

---

## 2. 已完成注解的 Controller（P9 Task 9.1.1）

以下 Controller 已在 P9 阶段完成全量 `@Operation/@ApiResponse/@Parameter` 注解补全：

| Controller | 路径前缀 | Tag | 端点数 | 文件 |
|------------|----------|-----|--------|------|
| `AuthController` | `/api/v1/auth` | Auth | 6 | `apps/api/.../auth/AuthController.java` |
| `WechatAuthController` | `/api/v1/auth` | Auth | 1 | `apps/api/.../auth/WechatAuthController.java` |
| `MatchController` | `/api/v1/matches` | Match | 8（实际 @Operation 数；R4-02129 修正原「16 端点全量注解」声明） | `apps/api/.../match/MatchController.java` |
| `MediaUploadController` | `/api/v1/media` | Media | 1 | `apps/api/.../media/MediaUploadController.java` |
| `MediaAccessController` | `/api/v1/media` | Media | 1 | `apps/api/.../media/MediaAccessController.java` |
| `ProfileController` | `/api/v1/profile` | Profile | 6+ | `apps/api/.../profile/ProfileController.java` |

---

## 3. 待补全 Controller 清单（按业务域分组）

> 以下 Controller 已在 P0-P8 完成 `@RequestMapping("/api/v1/**")` 路径迁移与 `ApiResponse<T>` 包装，
> P9 阶段需按本指南 §4 模板补全 OpenAPI 注解。建议按业务模块批量推进，每个 PR 处理 5-8 个 Controller。

### 3.1 认证与用户域
- `ThirdPartyAuthController`（`/api/v1/auth/third-party`）
- `UserController`（`/api/v1/users`）

### 3.2 发现与匹配域
- `RecommendationController`（`/api/v1/recommendations`）
- `ActivityController`（`/api/v1/activities`）
- `DailyQuestionController`（`/api/v1/daily-questions`）
- `CircleController`（`/api/v1/circles`）

### 3.3 聊天与通知域
- `ChatController`（`/api/v1/chat`）
- `PrivateMessageController`（`/api/v1/messages/conversations`）
- `VoiceMessageController`（`/api/v1/chat/voice`）
- `VideoCallController`（`/api/v1/chat/video-call`）
- `TempChatController`（`/api/v1/temp-chat/sessions`）
- `NotificationController`（`/api/v1/notifications`）
- `InteractionEventController`（`/api/v1/interaction-events`）

### 3.4 社区域
- `VillageController`（`/api/v1/posts`）
- `PostReportController`（`/api/v1/posts/reports`）
- `PostTagController`（`/api/v1/posts/tags`）
- `CampusController`（`/api/v1/campus`）
- `CircleController`（`/api/v1/circles`）

### 3.5 个人与成长域
- `ProfileVisitorController`（`/api/v1/profile/visitors`）
- `CheckInController`（`/api/v1/check-in`）
- `AppConfigController`（`/api/v1/app-config`）
- `DoNotDisturbController`（`/api/v1/dnd`）

### 3.6 VIP 与付费域
- `BillingController`（`/api/v1/vip/billing`）
- `AutoRenewController`（`/api/v1/vip/auto-renew`）
- `PromoCodeController`（`/api/v1/vip/promo-codes`）

> R4-02128：`VipRedPacketController` 已随红包功能删除，不再列入待补清单。

### 3.7 反馈与举报域
- `FeedbackController`（`/api/v1/feedback`）
- `ReportController`（`/api/v1/reports`）

### 3.8 客户端配置域
- `ConfigController`（`/api/v1/client-config`）
- `ContentFilterController`（`/api/v1/content-filter`）
- `HomeController`（`/api/v1/home`）

### 3.9 管理后台域（共 11 个，全部已 `@PreAuthorize('hasRole(ADMIN)')`）
- `AdminAuditLogController`、`AdminCertificationController`、`AdminCommentController`、`AdminConfigController`
- `AdminMatchConfigController`、`AdminNotifyConfigController`、`AdminPostController`、`AdminReportController`
- `AdminSensitiveWordController`、`AdminStatsController`、`AdminUserController`

### 3.10 调试与 AI 域
- `AiVideoController`（`/api/ai/video`，路径不在 `/api/v1/**` 下）
- `ErrorSimulationController`（仅 dev/mock profile 启用）
- `MatchDebugController`（仅 dev/mock profile 启用）

---

## 4. 注解模板（推荐写法）

### 4.1 GET 列表 / 详情

```java
@GetMapping("/{id}")
@Operation(
        summary = "查询 XX 详情",
        description = "根据 ID 查询 XX 详情，含关联数据。",
        operationId = "getXxById"
)
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "查询成功",
                content = @Content(schema = @Schema(implementation = XxView.class))),
        @ApiResponse(responseCode = "401", description = "未授权", content = @Content),
        @ApiResponse(responseCode = "404", description = "资源不存在", content = @Content)
})
public XxView getXx(
        @Parameter(description = "XX ID", required = true, example = "12345")
        @PathVariable("id") Long id) {
    return xxService.getXx(id);
}
```

### 4.2 POST 创建（带幂等性 + 限流）

```java
@PostMapping
@Operation(
        summary = "创建 XX",
        description = "创建 XX 资源。支持幂等性（Idempotency-Key）。速率限制 60 桶容量/2 令牌每秒。",
        operationId = "createXx"
)
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "创建成功",
                content = @Content(schema = @Schema(implementation = ApiResponse.class))),
        @ApiResponse(responseCode = "400", description = "参数校验失败", content = @Content),
        @ApiResponse(responseCode = "401", description = "未授权", content = @Content),
        @ApiResponse(responseCode = "409", description = "资源已存在", content = @Content),
        @ApiResponse(responseCode = "429", description = "触发限流", content = @Content)
})
@RateLimit(capacity = 60, refillTokens = 2, key = "#request.remoteAddr")
@Idempotent
public ApiResponse<XxView> createXx(
        @Parameter(description = "创建请求体", required = true)
        @Valid @RequestBody XxRequest request) {
    return ApiResponse.ok(xxService.createXx(request));
}
```

### 4.3 文件上传（multipart）

```java
@PostMapping("/upload")
@Operation(summary = "上传文件", description = "上传文件，校验 MIME 与 magic bytes。", operationId = "uploadFile")
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "上传成功",
                content = @Content(schema = @Schema(implementation = ApiResponse.class))),
        @ApiResponse(responseCode = "400", description = "格式不支持", content = @Content),
        @ApiResponse(responseCode = "413", description = "文件过大", content = @Content)
})
public ApiResponse<UploadResponse> upload(
        @Parameter(in = ParameterIn.QUERY, description = "文件", required = true,
                content = @Content(mediaType = "multipart/form-data"))
        @RequestParam("file") MultipartFile file) {
    return ApiResponse.ok(service.upload(file));
}
```

### 4.4 分页查询

```java
@GetMapping
@Operation(summary = "分页查询 XX", description = "分页查询，page 从 1 开始，size 上限 100。", operationId = "listXx")
public ApiResponse<Page<XxView>> listXx(
        @Parameter(description = "页码，从 1 开始", example = "1")
        @RequestParam(value = "page", defaultValue = "1") @Min(1) int page,
        @Parameter(description = "每页大小，上限 100", example = "20")
        @RequestParam(value = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
    return ApiResponse.ok(xxService.listXx(PageRequest.of(page - 1, size)));
}
```

---

## 5. 命名约定

- **Tag 命名**：使用业务域单数名词（如 `Auth`、`Match`、`Profile`、`Village`、`Media`、`CheckIn`、`Vip`、`Admin`），避免使用复数或带空格的描述。
- **operationId**：使用 `camelCase` 动词开头（如 `loginWithWechat`、`createMatch`、`getProfileStats`），保证全局唯一，作为代码生成时的方法名。
- **summary**：≤ 30 字符的简短描述，Swagger UI 列表展示。
- **description**：详细说明业务语义、限流策略、幂等性、安全要求等。

---

## 6. 验证方式

### 6.1 启动后访问 Swagger UI

```bash
# 本地启动 API
cd apps/api
./mvnw spring-boot:run

# 浏览器访问
http://localhost:8080/swagger-ui.html
```

### 6.2 OpenAPI JSON 校验

```bash
# 获取 OpenAPI JSON
curl http://localhost:8080/v3/api-docs -o openapi.json

# 使用 spectral 校验（项目根 .spectral.yaml 已配置）
npx spectral lint openapi.json
```

### 6.3 验收标准

- [ ] 所有 Controller 类有 `@Tag` 注解
- [ ] 所有 public 方法有 `@Operation` 注解
- [ ] 所有方法有 `@ApiResponses` 至少覆盖 200/401/4xx
- [ ] 所有 `@PathVariable` 与 `@RequestParam` 有 `@Parameter` 注解
- [ ] Swagger UI 中按业务域分组，无 `default` 分组
- [ ] operationId 全局唯一

---

## 7. 已有 OpenAPI YAML 文件

以下 YAML 文件位于 `docs/openapi/`，作为静态接口契约文档（与代码注解生成的 Swagger UI 互补）：

- `check-in.yaml`：签到接口
- `likes.yaml`：喜欢接口
- `notifications.yaml`：通知接口
- `recommendations.yaml`：推荐接口
- `users.yaml`：用户接口
- `village.yaml`：动态广场接口
- `feedback-growth-and-auth.yaml`：反馈/成长/认证接口

---

## 8. 维护责任

| 角色 | 职责 |
|------|------|
| 后端开发 | 新增/修改 Controller 时同步补全 OpenAPI 注解 |
| API 评审 | PR 评审时检查注解完整性（参考本指南 §6） |
| 前端开发 | 调用接口前先查 Swagger UI，禁止凭直觉猜测参数 |
| QA | 测试用例依据 Swagger UI 中声明的响应码与字段编写 |
| DevOps | CI 中可加入 `spectral lint` 校验 OpenAPI 规范性 |

---

## 9. 参考

- springdoc-openapi 官方文档：https://springdoc.org/
- OpenAPI 3 规范：https://spec.openapis.org/oas/v3.0.3
- Swagger Annotation Java 文档：https://docs.swagger.io/swagger-core/v2.2.22/apidocs/io/swagger/v3/oas/annotations/package-summary.html
- 项目规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/spec.md` P9 节
