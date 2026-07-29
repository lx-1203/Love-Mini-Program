# Java 单元测试剩余失败修复 Spec

## Why

`apps/api` 模块在 `2026-07-27-reaudit-fixall` 收尾后仍存在 **27 errors + 1 failure** 残留：
- 4 个 `@SpringBootTest` 测试类（`P0SecurityFilterChainIntegrationTest`、`SecurityConfigTest`、`PhaseOneFlowApiTest`、`AdminPermissionTest$ControllerPermissionTests`）因 `UserRepository` 等 JPA Repository bean 未注册导致 `ApplicationContext` 加载失败（27 errors）。
- `CheckInControllerTest.checkIn_whenUnauthenticated_shouldPropagateUnauthorized` 未抛出 `HttpClientErrorException.Unauthorized`（1 failure）。

这些失败阻断 `mvn test` 全量回归，无法满足 P3 阶段"CI 完整门禁"中 `api-compile + test` job 的合并前提，必须收口。

## What Changes

### 已完成（前序会话）
- 新建 `apps/api/src/test/java/com/campuslove/api/testdata/MockAllRepositoriesConfig.java`：集中声明 60+ 个 `@MockBean` JPA Repository，供 `@SpringBootTest` 测试类 `@Import` 引用。
- 修改 `apps/api/src/main/resources/application-mock.yml`：在 `spring.autoconfigure.exclude` 中追加 `org.redisson.spring.starter.RedissonAutoConfigurationV2`，避免 mock profile 启动时尝试连接 Redis。
- `SecurityConfigTest`、`PhaseOneFlowApiTest` 增加 `@Import(MockAllRepositoriesConfig.class)`。
- 修复编译错误：`MockAllRepositoriesConfig.java` 补充 `NotificationRepository` import。

### 待完成（本 Spec 范围）
- **修复 1**：`CheckInControllerTest.checkIn_whenUnauthenticated_shouldPropagateUnauthorized` 在调用前显式清空 `SecurityContextHolder`，避免上游测试残留的认证上下文导致 `SecurityUtils.getCurrentUserId()` 未抛 401。
- **修复 2**：`PhaseOneFlowApiTest.homeChatAndFeedbackFlowsRetainMutableState` 中 `/api/v1/feedback/issues` 与 `/api/v1/feedback/my-submissions` 断言的 JSON Path 由 `$.type` / `$[0].title` 修正为 `$.data.type` / `$.data[0].title`，对齐 `ApiResponse<T>` 包装结构。
- **回归验证**：分别跑 4 个 `@SpringBootTest` 测试类 + `CheckInControllerTest` 单测，再跑全量 `mvn test` 验证无副作用。

## Impact
- Affected specs: `2026-07-27-reaudit-fixall`（P3 Task 28「最终验证闭环」前置条件）、`system-comprehensive-testing`
- Affected code:
  - `apps/api/src/test/java/com/campuslove/api/growth/CheckInControllerTest.java`（仅修改 `checkIn_whenUnauthenticated_shouldPropagateUnauthorized` 测试方法，新增 `SecurityContextHolder.clearContext()` 调用）
  - `apps/api/src/test/java/com/campuslove/api/PhaseOneFlowApiTest.java`（仅修改 `homeChatAndFeedbackFlowsRetainMutableState` 中两处 JSON Path 断言）
- **不修改主代码**，仅修改测试代码。

## ADDED Requirements

### Requirement: 测试隔离与上下文清理
单元测试 SHALL 在每个测试方法执行前/后清理 Spring Security 上下文与 Mockito 静态 mock 状态，避免测试间状态泄漏。

#### Scenario: 未鉴权场景测试不被上游污染
- **GIVEN** 同测试类中存在使用 `mockStatic(SecurityUtils.class)` 的前置测试
- **WHEN** 执行 `checkIn_whenUnauthenticated_shouldPropagateUnauthorized`
- **THEN** `SecurityContextHolder` 已被显式清空，`SecurityUtils.getCurrentUserId()` 抛出 `HttpClientErrorException.Unauthorized`（401）

### Requirement: ApiResponse 包装结构对齐
所有 `@SpringBootTest` MockMvc 测试 SHALL 根据 Controller 返回类型正确选择 JSON Path：
- 返回 `ApiResponse<T>` 的端点：业务字段路径前缀为 `$.data.`
- 直接返回 view 对象的端点：业务字段路径前缀为 `$.`
- `List<T>` 包装在 `ApiResponse` 内时：数组元素路径为 `$.data[0].xxx`

#### Scenario: 反馈接口断言命中正确路径
- **WHEN** `POST /api/v1/feedback/issues` 返回 `ApiResponse<SubmissionRecordView>`
- **THEN** `jsonPath("$.data.type").value("FEEDBACK")` 通过
- **AND** `GET /api/v1/feedback/my-submissions` 返回 `ApiResponse<List<SubmissionRecordView>>`，`jsonPath("$.data[0].title")` 通过

## MODIFIED Requirements

### Requirement: Java 单元测试全量通过
`apps/api` 模块 SHALL 在 `mvn test` 全量执行时输出 `BUILD SUCCESS`，无 failed tests、无 errors；CI `api-test` job 可作为合并门禁生效。

#### Scenario: 4 个 ApplicationContext 失败测试类恢复绿色
- **WHEN** 执行 `mvnw.cmd -f apps/api/pom.xml -Dtest=P0SecurityFilterChainIntegrationTest,SecurityConfigTest,PhaseOneFlowApiTest,AdminPermissionTest test`
- **THEN** 退出码 0，无 `NoSuchBeanDefinitionException` 与 `RedisConnectionException`

#### Scenario: CheckInControllerTest 全部通过
- **WHEN** 执行 `mvnw.cmd -f apps/api/pom.xml -Dtest=CheckInControllerTest test`
- **THEN** 退出码 0，5 个测试方法全部通过，包含 `checkIn_whenUnauthenticated_shouldPropagateUnauthorized`

#### Scenario: 全量回归无副作用
- **WHEN** 执行 `mvnw.cmd -f apps/api/pom.xml test`
- **THEN** 退出码 0，与基线相比无新增失败用例
