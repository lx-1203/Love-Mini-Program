# Tasks

> 总目标：修复 Java 单元测试剩余 27 errors + 1 failure，使 `mvn test` 全量绿色，解锁 P3 CI `api-test` 门禁。
> 修复顺序原则：先修复 1 failure（影响范围小、可独立验证）→ 再修复 27 errors 的残留验证（前序已完成主体修复，仅需跑通）→ 最后全量回归。

## 阶段 1：1 failure 修复（CheckInControllerTest）

- [x] Task 1: 修复 `CheckInControllerTest.checkIn_whenUnauthenticated_shouldPropagateUnauthorized` ✅ Tests run: 5, Failures: 0, Errors: 0
  - [x] SubTask 1.1: 在 `apps/api/src/test/java/com/campuslove/api/growth/CheckInControllerTest.java` 的 `checkIn_whenUnauthenticated_shouldPropagateUnauthorized` 测试方法体首行新增 `org.springframework.security.core.context.SecurityContextHolder.clearContext();`，确保调用 `controller.checkIn()` 前 `SecurityContextHolder` 为空
  - [x] SubTask 1.2: 使用全限定名调用 `SecurityContextHolder`（无需新增 import）
  - [x] SubTask 1.3: 执行 `mvnw.cmd -f apps/api/pom.xml -Dtest=CheckInControllerTest test`，确认 5 个测试方法全部通过（Tests run: 5, Failures: 0, Errors: 0）

## 阶段 2：1 failure 修复（PhaseOneFlowApiTest JSON Path）

- [x] Task 2: 修复 `PhaseOneFlowApiTest.homeChatAndFeedbackFlowsRetainMutableState` JSON Path 断言 ✅ Tests run: 5, Failures: 0, Errors: 0
  - [x] SubTask 2.1: 在 `apps/api/src/test/java/com/campuslove/api/PhaseOneFlowApiTest.java` 第 210 行将 `.andExpect(jsonPath("$.type").value("FEEDBACK"))` 修改为 `.andExpect(jsonPath("$.data.type").value("FEEDBACK"))`，对齐 `ApiResponse<SubmissionRecordView>` 包装结构
  - [x] SubTask 2.2: 在同测试方法第 214 行将 `.andExpect(jsonPath("$[0].title").value("需要更清楚的超时提示"))` 修改为 `.andExpect(jsonPath("$.data[0].title").value("需要更清楚的超时提示"))`，对齐 `ApiResponse<List<SubmissionRecordView>>` 包装结构
  - [x] SubTask 2.3: 执行 `mvnw.cmd -f apps/api/pom.xml -Dtest=PhaseOneFlowApiTest test`，确认 5 个测试方法全部通过

## 阶段 3：27 errors 验证（前序已完成主体修复）

- [x] Task 3: 验证 4 个 `@SpringBootTest` 测试类恢复绿色 ✅ 13 + 8 + 5 + 30 = 56 测试全部通过
  - [x] SubTask 3.1: 执行 `mvnw.cmd -f apps/api/pom.xml -Dtest=P0SecurityFilterChainIntegrationTest test`，确认 `ApplicationContext` 加载成功，13 个测试方法全部通过
  - [x] SubTask 3.2: 执行 `mvnw.cmd -f apps/api/pom.xml -Dtest=SecurityConfigTest test`，确认 8 个测试方法全部通过
  - [x] SubTask 3.3: 执行 `mvnw.cmd -f apps/api/pom.xml -Dtest=AdminPermissionTest test`，确认 `ControllerPermissionTests` 嵌套类 24 个用例 + 外层 6 个用例（共 30 个）全部通过
  - [x] SubTask 3.4: 复核 `MockAllRepositoriesConfig.java` 已覆盖所有 `NoSuchBeanDefinitionException` 涉及的 Repository bean；本次回归无新增 `NoSuchBeanDefinitionException`

## 阶段 4：全量回归验证

- [x] Task 4: 全量 `mvn test` 回归 ✅ Tests run: 813, Failures: 0, Errors: 0, Skipped: 7, BUILD SUCCESS
  - [x] SubTask 4.1: 执行 `mvnw.cmd -f apps/api/pom.xml test`，记录 `Tests run: 813, Failures: 0, Errors: 0, Skipped: 7, BUILD SUCCESS`
  - [x] SubTask 4.2: 未出现新增失败用例（基线无失败，本次回归 0 failures 0 errors）
  - [x] SubTask 4.3: 在 checklist.md 中勾选所有验证项，输出最终测试结果汇总

# Task Dependencies

- Task 1 与 Task 2 互相独立，可并行（不同测试类、不同文件） ✅ 均已完成
- Task 3 依赖前序会话已完成 `MockAllRepositoriesConfig` + `application-mock.yml` 排除 Redisson，本任务仅需验证 ✅ 验证通过
- Task 4 必须在 Task 1 + Task 2 + Task 3 全部通过后执行 ✅ 全量回归通过
