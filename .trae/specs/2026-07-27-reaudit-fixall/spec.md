# 复审 100+ 问题全量修复 Spec

## Why

2026-07-27 复审报告 `REAUDIT-REPORT-100+.md` 显示：P0–P9 修复方向正确，但项目仍未达成工程闭环——Admin 后台无法 typecheck/build、Java 后端 `mvn compile` 失败、根目录 `test:structure` 与 `lint:openapi` 均失败，导致 CI 门禁失效、生产部署不可达。剩余 124 条问题覆盖后端、Admin、客户端、基础设施、工程质量五个维度，需以"先编译阻断、再配置中心化、再设计系统/无障碍、再工程化与文档"的四级路径完成全量修复，确保项目可商业化落地。

## What Changes

### P0 编译阻断（必须立即修复，4 项）
- 修复 `apps/admin/src/i18n/locales/zh-CN.ts` 与 `en-US.ts` 中 `notifyConfig`/`sensitiveWords` 等命名空间下的重复 key（saveFailed/saveButton/saveSuccess/resetButton/resetConfirm/resetSuccess/resetFailed），消除 TS1117
- 修复 21 个 Java Controller 中 `com.campuslove.api.common.ApiResponse` 与 `io.swagger.v3.oas.annotations.responses.ApiResponse` 类名冲突——对 Swagger 注解使用全限定名 `@io.swagger.v3.oas.annotations.responses.ApiResponse`，避免重命名业务类造成大范围回归
- 更新 `tests/project-structure.spec.mjs:143` 断言：`subPackages.length` 由 3 改为 4（已新增 `legal` 子包）
- 在根 `package.json` `devDependencies` 中补充 `yaml` 依赖（锁定 `^2.5.0`），使 `npm run lint:openapi` 可运行

### P1 安全与运营可用（28 项）
- 后端 CORS/WebSocket/OpenAPI/Agnes AI/微信 jscode2session 等硬编码 URL 全部抽到 `application*.yml`，默认值清空或仅留 localhost profile
- `VoiceMessageService` 上传路径与 `FileStoragePathResolver` 统一为 `uploads/{userId}/{yyyyMM}/{uuid}.{ext}`
- `application-db.yml` 敏感配置改为 `${DB_PASSWORD}` 占位，提供 jasypt 加密示例
- `MockSecurityConfig` 与 `SecurityConfig` 安全策略对齐，Mock 仅 mock 外部依赖，不放开 `/uploads/**` 等路径
- `JwtTokenProvider` 密钥改为环境变量注入并支持版本字段；`RedisTokenBlacklistService` 增加 Redis 不可用降级
- `BillingService`/`AutoRenewService`/`RealChatRedPacketService` 增加幂等键、分布式锁、金额对账
- Admin `Dashboard`/`Feedback`/`AuditLogs` 移除 Mock 数据，接入真实 `/api/v1/admin/stats`、`/feedback`、`/audit-logs`
- Admin `main.ts` 注册 `router.beforeEach` 校验 token，每条路由补 `meta.requiresAuth`/`meta.roles`
- `RecommendationServiceTest.java:72` 补 `MatchMetrics` 参数

### P2 设计系统与无障碍（30 项）
- 客户端 26 个页面/组件 30+ 处硬编码颜色迁移到 design tokens（按 `tokens.scss`/`tokens.ts`）
- 客户端 `pages/discover/index.vue:1042,1188`、`pages/home/index.vue:981,1014`、`pages/dev/index.vue:207` 的 `backdrop-filter` 用 `#ifdef H5` 包裹
- `HeartSignal`/`HeartParticles`/`LikeBurst` 增加 `prefers-reduced-motion` 降级
- Admin 9 个 View（Dashboard/Users/SensitiveWords/Reports/Feedback/AuditLogs/Posts/NotifyConfig/Layout/Login）硬编码中文迁移到 `*.ts` locale；`Pagination`/`ConfirmDialog` 增加 i18n props
- Admin `admin-common.css` 颜色与尺寸迁移到 CSS variables/design tokens

### P3 工程化与可观测性（22 项）
- 6 个 `Mock*Service`（AiVideo/Campus/CampusCertification/Notification/RuntimeState/Village）从 `main` 移到 `mock` profile 专属包或 `test` 路径
- `.github/workflows/ci.yml` 补齐 Admin typecheck、Java compile、`test:structure`、`lint:openapi`、E2E 四类门禁，任一失败即终止
- `docker-compose.yml` 增加 healthcheck/log driver/backup service
- `apps/api/Dockerfile` 与 `apps/admin/Dockerfile` 改为非 root 用户，集成 Trivy 镜像扫描
- `database/flyway/flyway.toml` 增加 `validateOnMigrate=true`
- `package-lock.json` 删除，统一使用 pnpm
- `verification_logs/` 加入 `.gitignore`
- `.env.example` 全部改为 `<PLACEHOLDER>` 占位
- `docs/wechat-submission-materials-checklist.md` 建立材料与代码逐项映射并签字确认
- `docs/API-CONTRACT.md`、`docs/CI-CD.md` 与 workflow/代码同步
- `logback-spring.xml` 增加审计日志 appender

### 验证闭环
- 跑通 `npm run verify:phase01`，所有 9 项验证全绿
- Java `mvn test-compile` 通过
- Admin `vue-tsc && vite build` 通过

## Impact
- Affected specs: `2026-07-26-commercialize-longterm-fixall`（前序 P0–P9 修复成果需以本 spec 收口）、`system-comprehensive-testing`、`system-issue-fixes-4phases`
- Affected code:
  - 编译阻断：`apps/admin/src/i18n/locales/{zh-CN,en-US}.ts`、`apps/api/src/main/java/com/campuslove/api/**/*Controller.java`（21 个）、`tests/project-structure.spec.mjs`、`package.json`
  - 后端配置：`apps/api/src/main/java/com/campuslove/api/config/{SecurityConfig,WebConfig,WebSocketConfig,OpenApiConfig,MockSecurityConfig}.java`、`apps/api/src/main/resources/application*.yml`、`apps/api/src/main/java/com/campuslove/api/{auth,ai,chat,vip}/*.java`
  - Admin：`apps/admin/src/views/*.vue`（9 个）、`apps/admin/src/main.ts`、`apps/admin/src/router/index.ts`、`apps/admin/src/api/http.ts`、`apps/admin/src/styles/admin-common.css`
  - 客户端：26 个 `.vue` 文件硬编码颜色与 backdrop-filter、3 个动画组件 reduced-motion
  - 基础设施：`.github/workflows/ci.yml`、`docker-compose.yml`、`apps/{api,admin}/Dockerfile`、`database/flyway/flyway.toml`、`.gitignore`、`.env.example`、`docs/*.md`

## ADDED Requirements

### Requirement: 编译闭环门禁
系统 SHALL 在任一 PR 合并前确保 Admin typecheck、Java compile、`test:structure`、`lint:openapi` 全部通过，否则 CI 红灯阻断合并。

#### Scenario: Admin typecheck 通过
- **WHEN** 执行 `npm --workspace apps/admin run typecheck`
- **THEN** 退出码为 0，无 TS1117 或任何类型错误

#### Scenario: Java 主代码编译通过
- **WHEN** 在 `apps/api` 执行 `mvn compile`
- **THEN** 退出码为 0，无 `ApiResponse` 类名冲突

#### Scenario: 项目结构测试通过
- **WHEN** 执行 `npm run test:structure`
- **THEN** `pagesJson.subPackages.length` 断言为 4，测试退出码 0

#### Scenario: OpenAPI lint 可运行
- **WHEN** 执行 `npm run lint:openapi`
- **THEN** 不报 `ERR_MODULE_NOT_FOUND`，按既定规则完成检查

### Requirement: 配置中心化与安全默认
系统 SHALL 将所有第三方 URL、CORS 允许来源、JWT 密钥、数据库密码、AI 服务地址通过环境变量或 `application*.yml` 注入，禁止在 Java 主代码路径硬编码；生产环境默认值 SHALL 为空或仅限 localhost profile。

#### Scenario: 生产 CORS 不放行 localhost
- **WHEN** 启动时 `CORS_ALLOWED_ORIGINS` 未配置
- **THEN** 默认允许来源列表为空，请求被拒绝并返回 403

#### Scenario: JWT 密钥从环境变量读取
- **WHEN** 启动时 `JWT_SECRET` 未配置
- **THEN** 应用启动失败并打印明确错误："JWT_SECRET environment variable is required"

### Requirement: 设计系统完全落地
系统 SHALL 通过 design tokens 表达所有颜色、阴影、圆角、间距；客户端与 Admin SHALL NOT 在 `.vue`/`.css` 中硬编码具体颜色值（除 token 文件本身）。

#### Scenario: 主题切换无视觉断层
- **WHEN** 切换亮色/暗色主题
- **THEN** 所有页面（含 26 个迁移页面）颜色跟随变化，无残留硬编码

#### Scenario: mp-weixin 不渲染 backdrop-filter
- **WHEN** 在 mp-weixin 环境运行客户端
- **THEN** `backdrop-filter` 不被解析，使用 `opacity: 0.96` 降级背景

### Requirement: 无障碍动画降级
系统 SHALL 对所有粒子/心跳/喜欢爆炸类动画响应 `prefers-reduced-motion: reduce`，降级为静态或单次播放。

#### Scenario: 减弱动效用户不触发粒子动画
- **WHEN** 用户系统设置 `prefers-reduced-motion: reduce`
- **THEN** `HeartParticles` 不发射粒子，签到成功仅显示静态 toast

### Requirement: Admin 真实数据与权限守卫
Admin 后台 SHALL 通过真实 API 获取数据，禁止在 `Dashboard`/`Feedback`/`AuditLogs` 中使用 Mock；每条路由 SHALL 配置 `meta.requiresAuth` 与 `meta.roles`，并由 `router.beforeEach` 校验。

#### Scenario: 未登录访问后台页面
- **WHEN** 未携带 token 直接访问 `/users`
- **THEN** 路由守卫跳转到 `/login` 并记录原目标 URL

#### Scenario: Dashboard 接入真实统计
- **WHEN** 进入 Dashboard 页面
- **THEN** 数据来自 `GET /api/v1/admin/stats`，无 Mock fixture 引用

### Requirement: Mock 服务隔离
系统 SHALL 将所有 `Mock*Service` 从 `main` 源码路径移至 `mock` profile 专属包或 `test` 路径，确保生产构建不包含 Mock 实现。

#### Scenario: 生产构建不含 Mock
- **WHEN** 以 `prod` profile 构建 `apps/api`
- **THEN** 最终 jar 中不包含 `MockAiVideoService`/`MockCampusService` 等 6 个 Mock 类的字节码

### Requirement: CI 完整门禁
`.github/workflows/ci.yml` SHALL 在 PR 触发时依次执行：Client typecheck + build + test、Admin typecheck + build、Java compile + test、`test:structure`、`lint:openapi`、E2E，任一失败即终止后续步骤并标记 PR 不可合并。

#### Scenario: PR 因 Admin typecheck 失败被阻断
- **GIVEN** PR 中存在 TS1117 重复 key
- **WHEN** CI 运行到 `admin-typecheck` job
- **THEN** job 失败，PR 被标记 `x admin-typecheck`，不可合并

## MODIFIED Requirements

### Requirement: 后端资金类服务幂等与对账
`BillingService`/`AutoRenewService`/`RealChatRedPacketService` SHALL 在所有资金类操作中实现幂等键、分布式锁、金额对账三重保障；并发请求 SHALL NOT 导致超发、多扣、少付。

#### Scenario: 重复支付回调被忽略
- **GIVEN** 微信支付对同一笔订单发送两次回调
- **WHEN** 第二次回调到达
- **THEN** 系统检测到幂等键已处理，直接返回 SUCCESS，不重复开通 VIP

## REMOVED Requirements

### Requirement: 旧版 CORS 默认值放行 localhost
**Reason**: 生产环境默认值放行 localhost 是 CSRF/信息泄露风险来源
**Migration**: 改为默认空列表，强制通过 `CORS_ALLOWED_ORIGINS` 环境变量配置
