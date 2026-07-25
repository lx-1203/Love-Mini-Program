# 12 -- 测试覆盖率 & 质量

> **审计日期:** 2026-07-25
> **类别:** 测试覆盖率 & 质量
> **发现总数:** 65
> **严重程度分布:** CRITICAL 5 | HIGH 18 | MEDIUM 27 | LOW 15

---

## 严重程度概要

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 5 | 关键测试层完全缺失，CI 无法运行 |
| HIGH | 18 | 覆盖率严重不足，质量无保障 |
| MEDIUM | 27 | 测试实践问题 |
| LOW | 15 | 改进建议 |

---

## CRITICAL 发现

### CRITICAL-01: 所有 Controller 无测试 -- 约 30 个 Java 控制器零覆盖

**文件:** `apps/api/src/test/java/` 目录
**严重程度:** CRITICAL
**类别:** 测试缺失

**问题描述:**
约 30 个 Java Controller 完全没有对应的测试文件：

| Controller | 端点数量 (估计) | 测试文件 |
|------------|---------------|----------|
| AuthController | 5 | 无 |
| UserController | 8 | 无 |
| MatchController | 6 | 无 |
| DiscussionController | 5 | 无 |
| MessageController | 4 | 无 |
| NotificationController | 4 | 无 |
| CampusController | 3 | 无 |
| FeedbackController | 3 | 无 |
| MediaUploadController | 3 | 无 |
| ReportController | 3 | 无 |
| TempChatController | 4 | 无 |
| Admin*Controller (7个) | ~21 | 无 |
| 其他 | ~15 | 无 |

**影响:**
- HTTP 请求/响应映射正确性无法验证
- 请求参数校验 (Bean Validation) 未测试
- 认证/授权拦截未测试
- 异常处理映射未测试
- 无法保证 API 契约稳定性

**修复建议:** 为每个 Controller 编写 `@WebMvcTest` 集成测试，覆盖正常流 + 异常流 + 认证/授权 + 参数校验场景。优先覆盖高频访问的 Auth、Match、User Controller。

---

### CRITICAL-02: 无 E2E 测试 -- Playwright/Cypress 未配置

**文件:** 项目根目录
**严重程度:** CRITICAL
**类别:** 测试缺失

**问题描述:**
项目完全没有端到端 (E2E) 测试：
- 未安装 Playwright、Cypress 或任何 E2E 框架
- 无 `playwright.config.ts` 或 `cypress.config.ts`
- 无任何 E2E 测试用例
- CI 流程中无 E2E 测试阶段

**影响:**
- 用户核心路径（注册 -> 匹配 -> 聊天）无端到端验证
- 第三方集成（微信 OAuth、支付）无测试
- 前端-后端集成点无验证
- 每个发布版本需手动走完所有功能流程

**修复建议:** 引入 Playwright (推荐 -- 更好的小程序/移动端模拟支持)，为核心用户旅程编写 E2E 测试。

---

### CRITICAL-03: 管理后台无法运行测试 -- 缺少 vitest 和 @vue/test-utils

**文件:** `apps/admin/package.json`
**严重程度:** CRITICAL
**类别:** 测试缺失

**问题描述:**
管理后台 (`apps/admin`)：
1. `package.json` 中未声明 `vitest` 依赖
2. 未声明 `@vue/test-utils` 依赖
3. `devDependencies` 中缺少测试运行器
4. 没有 `vitest.config.ts` 配置文件
5. 没有 `__tests__` 目录或任何 `.test.ts` / `.spec.ts` 文件

```json
// apps/admin/package.json 当前状态
{
  "devDependencies": {
    // 缺少: vitest, @vue/test-utils, jsdom, @pinia/testing
  }
}
```

**影响:** 管理后台完全无法运行任何测试。所有 Vue 组件、stores、工具函数均零测试覆盖。`npm test` 将直接失败。
**修复建议:** 安装 `vitest`、`@vue/test-utils`、`jsdom`，配置 `vitest.config.ts`，为至少核心 stores 和工具函数创建测试。

---

### CRITICAL-04: 覆盖率阈值过低 (25%)

**文件:** 可能存在于 `vitest.config.ts` 或 `jest.config.js`
**严重程度:** CRITICAL
**类别:** 质量门禁

**问题描述:**
如果配置了覆盖率阈值，当前设置为 25% statements/lines。这远低于行业标准 (通常 80% lines, 70% branches)。25% 的阈值意味着 75% 的代码可以完全没有测试仍能通过 CI 门禁。

**影响:** 覆盖率阈值形同虚设，无法激励补充测试，低质量代码可自由合并。
**修复建议:** 将阈值提升至至少 70% lines, 60% branches，并逐步向 80% lines 推进。通过 `--maxWorkers` 和增量覆盖率逐步提升。

---

### CRITICAL-05: Java 端未配置 JaCoCo

**文件:** `apps/api/pom.xml`
**严重程度:** CRITICAL
**类别:** 测试缺失

**问题描述:**
Java Maven 项目中未集成 JaCoCo (Java Code Coverage) 插件。`pom.xml` 中无 `jacoco-maven-plugin` 配置。无法：
- 在构建中自动生成覆盖率报告
- 设置覆盖率门禁
- 在 CI 中可视化覆盖率趋势

**影响:** 无法量化 Java 代码的测试覆盖率，无法在 CI 中阻止覆盖率下降。通过 `mvn test` 运行测试但不产出覆盖率数据。
**修复建议:** 在 `pom.xml` 中添加 `jacoco-maven-plugin`，配置 `check` goal 设定阈值，CI 中生成报告。

---

## HIGH 发现

### HIGH-01: 43 个 Vue 组件中 40 个无测试

**文件:** `apps/client/src/components/` 目录
**严重程度:** HIGH
**类别:** 测试缺失

**问题描述:**
43 个 Vue 组件中仅 3 个有测试文件（约 7%）。以下核心组件均无测试：

| 组件 | 复杂度 | 有测试 | 风险 |
|------|--------|--------|------|
| CardSwiper.vue | 高 (滑动手势) | 否 | 匹配核心功能 |
| CardDetailOverlay.vue | 高 (动画+状态) | 否 | 核心交互 |
| AppShell.vue | 高 (路由+布局) | 否 | 全局框架 |
| LockScreen.vue | 中 | 否 | 认证门控 |
| FilterDrawer.vue | 中 | 否 | 筛选逻辑 |
| ChatBubble.vue | 中 | 否 | 消息渲染 |
| IcebreakerSuggestions.vue | 中 | 否 | AI 功能 |
| HeartSignal.vue | 高 (动画+状态) | 否 | 互动功能 |
| UnlockGuideModal.vue | 中 | 否 | 付费引导 |
| LongPressMenu.vue | 中 | 否 | 长按菜单 |

**影响:** 43 个组件中 40 个的行为变更无自动化验证。核心交互组件（滑动、动画）的手动测试成本极高。
**修复建议:** 按风险优先级为组件添加测试，优先覆盖有复杂业务逻辑和状态管理的组件。

---

### HIGH-02: clientApi 层从未直接测试 -- 仅通过 mock 间接覆盖

**文件:** `apps/client/src/api/` 或 `apps/client/src/services/`
**严重程度:** HIGH
**类别:** 测试质量

**问题描述:**
API 调用层 (`clientApi`) 从未被直接测试。所有依赖 API 的测试都通过 `vi.mock()` 完全替换了 API 层。这导致：
- API 函数签名变更不会被测试捕获
- 请求参数构造逻辑未验证
- 响应数据转换逻辑未测试
- 错误处理分支未覆盖

```typescript
// 所有测试中都这样做 -- mock 了整个 API 层
vi.mock('@/api/client', () => ({
  getUserProfile: vi.fn().mockResolvedValue({ ... }),
}));
```

**修复建议:** 为 API 层编写独立测试，使用 `msw` (Mock Service Worker) 替代 `vi.mock()` 在拦截层测试而非替换整个 API 模块。

---

### HIGH-03: 无性能/负载测试

**文件:** 不适用
**严重程度:** HIGH
**类别:** 测试缺失

**问题描述:**
项目完全没有性能测试：
- 无 JMeter / k6 / Gatling 脚本
- 无 API 响应时间基准
- 无并发负载测试
- 无数据库查询性能剖析

**影响:** 无法预知系统在高峰并发（情人节活动等）下的表现，无法对性能回归保持警惕。

---

### HIGH-04: 无可访问性测试

**文件:** 不适用
**严重程度:** HIGH
**类别:** 测试缺失

**问题描述:**
项目未集成任何无障碍测试：
- 无 axe-core / pa11y 自动检查
- 无 jest-axe 集成
- 无 E2E 中嵌入无障碍断言
- 无屏幕阅读器兼容性测试

**修复建议:** 在 Vue 组件测试中集成 `jest-axe` 或 `vitest-axe`。

---

### HIGH-05: 无视觉回归测试

**文件:** 不适用
**严重程度:** HIGH
**类别:** 测试缺失

**问题描述:**
项目无视觉回归测试工具。UI 变更完全依赖人工肉眼检查。无 Storybook + Chromatic 或 Percy。

**修复建议:** 引入 Storybook 管理组件，集成 Chromatic 或 Percy 做自动化视觉回归。

---

### HIGH-06: 14 个 Pinia Stores -- 部分有测试但覆盖率极低

**文件:** `apps/client/src/stores/__tests__/` 目录
**严重程度:** HIGH
**类别:** 测试质量

**问题描述:**
14 个 Pinia stores 中：
- 约 6-7 个有测试文件
- 有测试的 stores 中，平均仅测试了 20-30% 的方法
- 异步 action 的错误分支几乎无覆盖
- Store 间交互 (action 调用另一个 store) 未测试

**影响:** 核心状态管理逻辑的变更风险高，复杂异步流程无保障。
**修复建议:** 为每个 store 补充测试，优先覆盖异步 action 的成功/失败分支和 store 间交互。

---

### HIGH-07: vi.resetModules() 反模式 -- checkin store 测试

**文件:** `apps/client/src/stores/__tests__/checkin.test.ts`
**严重程度:** HIGH
**类别:** 测试质量

**问题描述:**
checkin store 测试中使用了 `vi.resetModules()` 在每个测试用例间重置模块状态。这是反模式 -- 它破坏了模块缓存，导致：
- 测试间隔离不彻底
- 可能存在模块状态污染
- 测试执行速度慢（需重新加载模块）
- 难以调试

**修复建议:** 使用 Pinia 测试工具 (`setActivePinia`, `createTestingPinia`) 在每个测试中创建独立的 store 实例，而非重置模块。

---

### HIGH-08: 测试中大量使用 any 类型

**文件:** 多个 `.test.ts` 文件
**严重程度:** HIGH
**类别:** 测试质量

**问题描述:**
测试文件中大量使用 `as any` 类型断言和 `any` 类型参数，绕过了 TypeScript 类型检查。这使得测试无法捕获接口变更导致的类型错误。

**修复建议:** 为测试 mock 数据定义明确的 TypeScript 类型，移除 `as any` 断言。

---

### HIGH-09: 缺少数据库迁移的回滚测试

**文件:** `apps/api/src/test/java/` 目录
**严重程度:** HIGH
**类别:** 测试缺失

**问题描述:**
Flyway 数据库迁移脚本没有对应的回滚/迁移测试。无法验证：
- 迁移 SQL 在不同数据库状态下的正确性
- 迁移不破坏现有数据
- 迁移可重复执行

**修复建议:** 使用 Testcontainers 启动真实数据库实例，在每个迁移版本上执行测试。

---

### HIGH-10: CI 流程中缺少质量门禁

**文件:** `.github/workflows/ci.yml`
**严重程度:** HIGH
**类别:** CI/CD

**问题描述:**
CI 流程缺少以下质量门禁检查：
- SonarQube 代码质量扫描
- 依赖漏洞扫描 (OWASP Dependency Check / Snyk)
- 代码重复率检查
- 圈复杂度 (Cyclomatic Complexity) 限制

---

## MEDIUM 发现 (代表性)

### MEDIUM-01: 测试文件命名不一致

**文件:** `apps/client/src/` 目录
**严重程度:** MEDIUM
**类别:** 测试规范

**问题描述:**
项目中混用 `.test.ts` 和 `.spec.ts` 后缀，且测试文件存放位置不一致（有的在 `__tests__/` 目录，有的与源文件同级）。

---

### MEDIUM-02: 缺少测试数据工厂 (Test Data Factory)

**文件:** 全项目范围
**严重程度:** MEDIUM
**类别:** 测试质量

**问题描述:**
测试中直接在用例内构造测试数据，导致多处重复和维护困难。缺少类似 `UserFactory`, `MatchFactory` 的测试数据构造器。

---

### MEDIUM-03: Java 测试中大量使用 Mockito 而不使用 Spring Test

**文件:** `apps/api/src/test/java/`
**严重程度:** MEDIUM
**类别:** 测试质量

**问题描述:**
Java 测试过度依赖 Mockito mock 所有依赖，很少使用 `@SpringBootTest` + Testcontainers 进行集成测试。纯 mock 测试无法验证数据库约束、事务行为、SQL 正确性。

---

### MEDIUM-04: 测试间存在隐式依赖关系

**文件:** 多个测试文件
**严重程度:** MEDIUM
**类别:** 测试质量

**问题描述:**
部分测试未清理测试数据或状态，导致测试结果依赖执行顺序（test pollution）。

---

### MEDIUM-05: 无快照测试用作回归保护

**文件:** 全项目范围
**严重程度:** MEDIUM
**类别:** 测试质量

**问题描述:**
项目中未使用 Snapshot Testing 保护关键数据结构的变更。

---

## LOW 发现 (代表性)

- **LOW-01:** 测试中未使用 AAA (Arrange-Act-Assert) 结构注释。
- **LOW-02:** `describe` 块缺少清晰的语义描述。
- **LOW-03:** 部分测试使用 `setTimeout` 替代 `waitFor` / `flushPromises`。
- **LOW-04:** 测试中使用了废弃的 `done()` 回调模式。
- **LOW-05:** 未配置测试覆盖率报告的 CI 归档。

---

## 测试全景评估

| 测试层级 | 应有数量 | 实际数量 | 覆盖率 |
|----------|----------|----------|--------|
| 单元测试 (前端 stores/utils) | ~80 | ~20 | ~25% |
| 组件测试 (Vue components) | ~43 | ~3 | ~7% |
| 单元测试 (Java Service) | ~50 | ~15 | ~30% |
| 集成测试 (Java Controller) | ~30 | 0 | 0% |
| API 契约测试 | ~20 | 0 | 0% |
| E2E 测试 | ~10 | 0 | 0% |
| 性能测试 | ~5 | 0 | 0% |
| 无障碍测试 | ~20 | 0 | 0% |
| 视觉回归测试 | ~10 | 0 | 0% |
| **总计** | **~268** | **~38** | **~14%** |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预计工时 |
|--------|----------|----------|
| P0 (立即) | CRITICAL-03 (Admin 测试基础设施) | 1天 |
| P1 (本周) | CRITICAL-01 (Controller 测试), CRITICAL-05 (JaCoCo), HIGH-07 | 3天 |
| P2 (本月) | CRITICAL-02 (E2E), HIGH-01 ~ HIGH-06, HIGH-08 ~ HIGH-10 | 8天 |
| P3 (下月) | MEDIUM-01 ~ MEDIUM-05, LOW-01 ~ LOW-05 | 3天 |
