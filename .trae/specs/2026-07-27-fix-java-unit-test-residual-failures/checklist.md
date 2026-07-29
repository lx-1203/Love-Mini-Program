# Java 单元测试剩余失败修复 Checklist

> 对应 `spec.md` 与 `tasks.md`，每项验证须由实际执行命令或代码检查确认。任一未通过则不可标记完成。

## 阶段 1：CheckInControllerTest 1 failure 修复验证

- [x] `apps/api/src/test/java/com/campuslove/api/growth/CheckInControllerTest.java` 中 `checkIn_whenUnauthenticated_shouldPropagateUnauthorized` 测试方法首行调用 `SecurityContextHolder.clearContext()`
- [x] 已使用全限定名 `org.springframework.security.core.context.SecurityContextHolder.clearContext();`（无需新增 import）
- [x] `mvnw.cmd -f apps/api/pom.xml -Dtest=CheckInControllerTest test` 输出 `Tests run: 5, Failures: 0, Errors: 0, BUILD SUCCESS`
- [x] `checkIn_whenUnauthenticated_shouldPropagateUnauthorized` 测试通过（无 "Expected HttpClientErrorException.Unauthorized to be thrown, but nothing was thrown" 错误）

## 阶段 2：PhaseOneFlowApiTest JSON Path 修复验证

- [x] `apps/api/src/test/java/com/campuslove/api/PhaseOneFlowApiTest.java` 第 210 行断言为 `jsonPath("$.data.type").value("FEEDBACK")`
- [x] `apps/api/src/test/java/com/campuslove/api/PhaseOneFlowApiTest.java` 第 214 行断言为 `jsonPath("$.data[0].title").value("需要更清楚的超时提示")`
- [x] `mvnw.cmd -f apps/api/pom.xml -Dtest=PhaseOneFlowApiTest test` 输出 `Tests run: 5, Failures: 0, Errors: 0, BUILD SUCCESS`
- [x] `homeChatAndFeedbackFlowsRetainMutableState` 测试通过（无 "No value at JSON path $.type" 错误）

## 阶段 3：27 errors 验证（4 个 @SpringBootTest 测试类）

- [x] `mvnw.cmd -f apps/api/pom.xml -Dtest=P0SecurityFilterChainIntegrationTest test` 输出 BUILD SUCCESS（Tests run: 13, Failures: 0, Errors: 0），无 `NoSuchBeanDefinitionException`、无 `RedisConnectionException`
- [x] `mvnw.cmd -f apps/api/pom.xml -Dtest=SecurityConfigTest test` 输出 BUILD SUCCESS（Tests run: 8, Failures: 0, Errors: 0）
- [x] `mvnw.cmd -f apps/api/pom.xml -Dtest=PhaseOneFlowApiTest test` 输出 BUILD SUCCESS（Tests run: 5, Failures: 0, Errors: 0，与阶段 2 同一命令，覆盖验证）
- [x] `mvnw.cmd -f apps/api/pom.xml -Dtest=AdminPermissionTest test` 输出 BUILD SUCCESS（Tests run: 30, Failures: 0, Errors: 0），包含 `ControllerPermissionTests` 嵌套类 24 个用例
- [x] `MockAllRepositoriesConfig.java` 中 `@MockBean` 字段覆盖所有测试运行时报错的 Repository（全量回归无新增 `NoSuchBeanDefinitionException`）
- [x] `application-mock.yml` 中 `spring.autoconfigure.exclude` 列表包含 `org.redisson.spring.starter.RedissonAutoConfigurationV2`

## 阶段 4：全量回归验证

- [x] `mvnw.cmd -f apps/api/pom.xml test` 输出 BUILD SUCCESS
- [x] 全量测试 `Tests run: 813, Failures: 0, Errors: 0, Skipped: 7`，与基线相比无新增失败用例
- [x] 主代码未被修改（仅测试代码与测试配置变更）：本任务仅修改 `apps/api/src/test/` 下 2 个测试文件
- [x] 多视角复核：
  - 企业决策者：CI 门禁可生效，PR 合并前提满足 ✅ 813 测试全绿，可作为 `api-test` job 门禁
  - 技术专家：测试隔离性提升，无状态泄漏；JSON Path 与 ApiResponse 结构对齐 ✅ SecurityContextHolder 显式清理 + JSON Path 修正
  - 终端用户：无直接影响（测试代码修改） ✅
  - 营销人员：无直接影响（测试代码修改） ✅
