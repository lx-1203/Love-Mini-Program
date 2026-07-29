# 1340 条商业化前最终审计问题全量修复 Spec

## Why

2026-07-28 生成的 `CONSOLIDATED-ISSUE-LIST-1000+.md` 与 `scripts/consolidated-issues.csv` 汇总了 Client 1088 + Admin/API 549 + Infra/合规 70 = 1707 条原始审计项，去重后共 **1340 条**独立问题（CRITICAL 6 / HIGH 268 / MEDIUM 591 / LOW 475）。前序 `2026-07-27-reaudit-fixall` Spec 已完成 124 条复审问题修复并跑通 `verify:phase01`，但本次清单覆盖范围更广——涉及 21 个 Java Controller 的 `@PreAuthorize`/`@Valid`/`@Transactional` 缺失、61 处 v-for 缺 key、169 处 i18n 文案硬编码、76 处 radius token、74 处分页返回未限制、62 处颜色 token、55 处 motion duration token、54 处 `@CreatedDate`/`@LastModifiedDate` 审计字段缺失、50 处 DB 索引、48 处日志工具不统一、45 处 Bean Validation、44 处 shadow token、43 处平台降级缺失、38 处 ARIA、29 处图片懒加载、24 处 EmptyState 组件、22 处 `@Transactional` 边界、6 处 CRITICAL 合规与资金安全漏洞等。本项目需以"P0 合规与资金→P1 安全与正确性→P2 设计系统与代码质量→P3 工程化与文档"四级路径完成全量修复，确保小程序可通过微信审核并稳定商业化上线。

## What Changes

### P0 CRITICAL 合规与资金安全（6 项，必须立即修复）
- **FIN-00001/00002**：`RealAuthService.java:117`、`WeChatPushService.java:96` 日志中可能输出敏感字段（openId/phone/token），改为脱敏后记录或使用 markers 限制访问
- **FIN-00003**：`AutoRenewService.java` 1-319 行 VIP 自动续费仅记录日志未真实扣减用户余额/账户——接入真实支付/余额扣减并保证幂等（与 `BillingService`、`VipBillingLog` 流水表对接）
- **FIN-00004**：`docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md:131-135` 服务器域名 ICP 备案、upload/download/业务域名均为待配置——完成 ICP 备案并在微信公众平台配置 request/upload/download/socket 域名
- **FIN-00005**：`docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md:64-73` 小程序名称、主体认证、类目资质、客服联系方式均为待准备——线下准备并上传微信公众平台
- **FIN-00006**：`docs/wechat-submission-materials-checklist.md:19-41` 营业执照、ICP 备案等大量提审材料状态仍为"待准备"——线下准备并更新文档状态为"已就绪"

### P1 HIGH 安全与正确性（268 项）

#### P1.1 Admin 后台对齐后端 API（7 项，FIN-00010~00016）
- `apps/admin/src/api/config.ts`、`match-config.ts`、`notify-config.ts`、`sensitive-words.ts` 中 7 处 `/admin/*` 旧前缀全部改为 `/v1/admin/*`，与后端 `AdminConfigController`/`AdminMatchConfigController`/`AdminNotifyConfigController`/`AdminSensitiveWordController` 对齐

#### P1.2 Admin 移除 `import.meta.env`（2 项，FIN-00018/00020）
- `apps/admin/src/stores/session.ts:12`、`apps/admin/src/views/Login.vue:11` 改为构建时注入常量或运行时配置接口，并移除 mock 登录分支

#### P1.3 Admin i18n 文案抽取（HIGH 2 项 + MEDIUM 169 项，FIN-00017/00019 等）
- `ErrorState.vue` 3 处、`Forbidden.vue` 1 处中文硬编码抽取到 locale 文件并通过 `$t()` 引用
- 其余 169 处 i18n 文案抽取在 P2 阶段批量处理

#### P1.4 Java Controller `@Valid/@Validated` 校验（32 项，FIN-00023~00150 等）
- 32 个 Controller 的 `@RequestBody` 参数添加 `@Valid` 注解，覆盖 Admin/Auth/Campus/Chat/Discover/Feedback/Growth/Match/Profile/Report/User/Village/Vip 全部模块

#### P1.5 Java Controller `@PreAuthorize` 权限（11+ 项，FIN-00033~00170 等）
- 写操作接口方法补 `@PreAuthorize("hasRole('USER')")` 或 `hasRole('ADMIN')`，覆盖 AiVideo/ThirdPartyAuth/Campus/InteractionEvent/Notification/PrivateMessage/TempChat/VideoCall/VoiceMessage/ContentFilter/Activity/Circle/DailyQuestion/Recommendation/Feedback/CheckIn/DoNotDisturb/Match/Profile/ProfileVisitor/Report/User/PostReport/Village/AutoRenew/PromoCode/VipRedPacket 等控制器

#### P1.6 Java Service `@Transactional` 边界（22 项，FIN-00032~00173 等）
- 写操作 Service 方法补 `@Transactional`，覆盖 SensitiveWordImportService/RealAuthService/TempChatSessionService/VoiceMessageService/RealConfigService/RealRecommendationService/RealFeedbackService/WeChatPushService/LocalMediaStorageService/ProfileUpdateService/AutoRenewService/PromoCodeService/VipRedPacketService 等

#### P1.7 Java `@Transactional` catch 异常处理（6 项，FIN-00022/00031/00071/00114/00151/00157）
- `AdminAuditLogService`/`RealAdminMatchConfigService`/`TempChatMessageService`/`RealCheckInService`/`RealVillageService`/`VillageQueryService` 中 `catch Exception` 仅记录日志的方法改为重新抛出或显式 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`

#### P1.8 Java 定时任务分布式锁（4 项，FIN-00021/00061/00082/00136）
- `CampusLoveApplication`/`TempChatCleanupService`/`JwtTokenProvider`/`RateLimitBucketRegistry` 的 `@Scheduled` 任务使用 Redisson 分布式锁或数据库任务表幂等执行

#### P1.9 Java 调试控制器隔离（2 项，FIN-00083/00085）
- `ErrorSimulationController`/`MatchDebugController` 仅 `test`/`mock` profile 加载或移除，生产构建不可访问

#### P1.10 Java 实体敏感字段保护（2 项，FIN-00100/00101）
- `ThirdPartyAccount.openId`、`User.openId` 添加 `@JsonIgnore`，敏感信息不随实体序列化泄露

#### P1.11 Java Repository `@Query` 参数化（6 项，FIN-00139~00144）
- `HeartSignalRepository`/`PrivateConversationRepository`/`PromoCodeRepository`/`TempChatSessionRepository`/`UserOnlineStatusRepository`/`VipRedPacketRepository` 中字符串拼接 SQL 改为命名参数 `:name` 或索引 `?1`

#### P1.12 VIP 红包真实扣款（1 项，FIN-00171）
- `VipRedPacketService.java` 1-418 行红包领取未扣减/充值用户钱包余额——对接 `WalletService`/`UserBalanceService` 并保证原子性（与 `VipBillingLog` 流水表事务绑定）

#### P1.13 客户端 v-for `:key` 补齐（61 项，FIN-00174~00266 等）
- 61 处 `v-for` 缺少 `:key` 全部补齐唯一 key，覆盖 pages/activities、chat-session、chat、components/chat/*、components/common/*、components/discover/*、components/home/*、components/profile/*、components/setup/*、components/social/*、components/village/*、pages/campus|chat|circle|circles|daily-question|dev|discover|feedback|heart-signals|home|likes|messages|profile|settings|shop|verification|village|vip 等所有列表渲染场景

#### P1.14 客户端 `.stop` 修饰符替换（19 项，FIN-00176/00178/00186 等）
- 19 处 `.stop` 修饰符改为 `catchtap`/`catchclick`，覆盖 chat/UnlockGuideModal/ChatBubble/ShareCard/FilterDrawer/PostReportDialog/WallPostCard/chat-session/chat-red-packet/circle/circles/circles-topic-detail/circles-topics/discover/home/village-detail/village-index/vip-red-packet/support-feedback 等组件与页面

#### P1.15 客户端 `setTimeout` 清理（10 项，FIN-00257~00267）
- `services/http.ts`、`services/websocket/index.ts`、`stores/chat/utils.ts`、`stores/discover/utils.ts`、`utils/audio-recorder.ts`、`utils/haptic.ts` 等 10 处 `setTimeout` 保存 timer 引用，在 `onBeforeUnmount`/`onUnload` 中 `clearTimeout`

#### P1.16 CI 完整门禁（1 项，FIN-00007）
- `.github/workflows/ci.yml` 补齐 `mvn compile`、`mvn test`、Admin typecheck、`test:structure`、`lint:openapi` 关键门禁并设失败终止

#### P1.17 gitleaks 白名单收紧（1 项，FIN-00008）
- `.gitleaks.toml:22-31` 移除过于宽泛的路径白名单（`ci.yml`、`application-db.yml`），改用精确匹配

#### P1.18 manifest.json appid 确认（1 项，FIN-00009）
- `apps/client/src/manifest.json:24` 确认 `wxc67cd233d72388d0` 是否为正式注册的小程序 appid，若为测试账号则替换为正式 appid

#### P1.19 默认密码强制替换（5 项，FIN-00268~00272）
- `database/flyway/flyway.toml:15`、`docker-compose.yml:66/69/107/155` 移除 `change_me`/`change-me-*` 默认值，强制通过环境变量注入强密码

#### P1.20 隐私政策与 SDK 披露（2 项，FIN-00273/00274）
- `docs/privacy-policy.md:169-172` 补充实名+校园认证代码审查记录，证明 18 岁以下无法注册
- `docs/third-party-sdks.md:49-62` 确认 Sentry SDK 启用状态并完整披露，与 `apps/client/package.json` 实际依赖对齐

### P2 MEDIUM 设计系统与代码质量（591 项）

#### P2.1 客户端颜色 token 化（62 项）
- 62 处硬编码颜色 `#3FCF8E`/`#EC4899`/`rgba(...)` 等替换为 `var(--c-*)` 或 `tokens.ts` 中的语义化 token

#### P2.2 客户端 radius token 化（76 项）
- 76 处硬编码 `border-radius: 8rpx`/`16rpx` 等替换为 `var(--r-*)` 或 `designTokens.radius.*`

#### P2.3 客户端 motion duration token 化（55 项）
- 55 处硬编码 `transition: 300ms`/`animation: 0.5s` 等替换为 `var(--d-*)` 或 `designTokens.motion.duration.*`

#### P2.4 客户端 shadow token 化（44 项）
- 44 处硬编码 `box-shadow: 0 2rpx 8rpx rgba(...)` 替换为 `var(--s-*)` 或 `designTokens.shadow.*`

#### P2.5 客户端 i18n 文案抽取（169 项）
- 169 处中文硬编码文案抽取到 `zh-CN.ts`/`en-US.ts` locale 文件，模板使用 `$t()` 或 `t()`

#### P2.6 客户端图片懒加载（29 项）
- 29 处列表/非首屏 `<image>` 添加 `lazy-load="true"` 属性

#### P2.7 客户端 EmptyState 组件统一（24 项）
- 24 处空状态分散实现统一替换为 `EmptyState` 组件并接入 i18n

#### P2.8 客户端 AbortController 超时（11 项）
- 11 处网络请求增加 `AbortController` 超时控制，避免页面切换后请求继续

#### P2.9 客户端 uni.* API 适配（8 项）
- 8 处浏览器原生 API（`TouchEvent`/`window.*`）替换为 `uni.*` API 或 compat 层封装

#### P2.10 客户端 ROUTE_* 常量（8 项）
- 8 处硬编码路由路径替换为 `constants/routes.ts` 中定义的 `ROUTE_*` 常量

#### P2.11 客户端 ARIA 无障碍（38 项）
- 38 处可点击元素添加 `aria-label` 与 `role="button"`，覆盖图标按钮、卡片、Tab 等

#### P2.12 客户端 config/env.ts 平台降级（43 项）
- 43 处平台特定逻辑通过 `config/env.ts` 统一封装并做平台降级

#### P2.13 Java 分页返回限制（74 项）
- 74 处 `List<T>` 全量返回改为 `Page<T>` 或限制最大返回条数（`@PageableDefault(size=20, max=100)`）

#### P2.14 Java 审计字段补齐（85 项）
- 54 处 `createdAt` 补 `@CreatedDate` 与 `AuditingEntityListener`
- 31 处 `updatedAt` 补 `@LastModifiedDate`

#### P2.15 Java DB 索引（50 项）
- 50 处根据查询场景添加索引与唯一约束，新建 Flyway 迁移脚本

#### P2.16 Java Bean Validation（45 项）
- 45 处 DTO 字段添加 `@NotBlank`/`@Size`/`@Pattern` 等校验

#### P2.17 Java `@PageableDefault`（13 项）
- 13 处 Controller 方法参数添加 `@PageableDefault(size=20, max=100)`

#### P2.18 Java `@Cacheable` 缓存（8 项）
- 8 处热点查询方法添加 `@Cacheable` 并配置 TTL 与失效策略

#### P2.19 Java `@Positive/@Min(1)`（21 项）
- 21 处数值参数添加 `@Positive`/`@Min(1)` 校验

#### P2.20 Admin token 化（24 项）
- 12 处颜色硬编码替换为 `var(--admin-color-*)` 语义 token
- 12 处间距/字号硬编码替换为 `var(--admin-space-*)`/`var(--admin-font-*)` token

#### P2.21 Admin ElMessageBox.confirm（8 项）
- 8 处敏感操作前调用 `ElMessageBox.confirm` 并接入 i18n

#### P2.22 统一日志工具（48 项）
- 48 处 `console.log`/`System.out.println` 移除或替换为统一日志工具（前端 `logger.ts`/后端 `SLF4J`）

#### P2.23 异步错误处理（10 项）
- 10 处异步流程添加 `try/catch` 与统一错误提示

### P3 LOW 工程化与文档（475 项）
- 剩余 LOW 项：包括代码风格、注释补齐、文档同步、依赖版本固定、`engines` 字段、`timeout-minutes`、`--frozen-lockfile`、`dev` 页面移除、配置中心化等
- 完整 OpenAPI 文档与代码同步
- 微信小程序提审材料文档完善
- CI/CD 文档与实际 workflow 对齐
- 部署加固剩余项（healthcheck/log driver/backup service 已在 reaudit-fixall 完成，本阶段补齐 Trivy 扫描报告、镜像签名等）

### 验证闭环
- 跑通 `npm run verify:phase01`，所有 9 项验证全绿
- Java `mvn test` 全部通过（813+ tests）
- Admin `vue-tsc && vite build` 通过
- Client `pnpm --filter client run build:mp-weixin` 通过（小程序可上线）
- 微信开发者工具真机预览无报错
- 微信小程序提审材料 100% 就绪

## Impact
- Affected specs: `2026-07-27-reaudit-fixall`（前序 124 条已完成，本 spec 在其基础上扩展至 1340 条）、`2026-07-26-commercialize-longterm-fixall`、`system-comprehensive-testing`、`system-issue-fixes-4phases`
- Affected code:
  - CRITICAL 合规：`apps/api/src/main/java/com/campuslove/api/{auth/RealAuthService,growth/WeChatPushService,vip/AutoRenewService}.java`、`docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md`、`docs/wechat-submission-materials-checklist.md`
  - Admin API 对齐：`apps/admin/src/api/{config,match-config,notify-config,sensitive-words}.ts`
  - Admin i18n/env：`apps/admin/src/{stores/session.ts,views/Login.vue,components/ErrorState.vue,views/Forbidden.vue}` + 9 个 View 的 i18n 抽取
  - Java Controller 权限/校验/事务：`apps/api/src/main/java/com/campuslove/api/**/*Controller.java`（32 个 `@Valid`、11+ 个 `@PreAuthorize`、22 个 `@Transactional`、6 个 catch 修复、4 个分布式锁、2 个调试控制器隔离）
  - Java Service/Repository/Entity：`*Service.java`（22 个 `@Transactional`）、`*Repository.java`（6 个 `@Query` 参数化）、`{User,ThirdPartyAccount}.java`（`@JsonIgnore`）
  - Java 资金：`VipRedPacketService.java`、`AutoRenewService.java`、`BillingService.java`
  - 客户端 v-for/.stop/setTimeout：61+19+10 处分布于 `apps/client/src/{pages,components,subpackages}/**/*.vue` 与 `apps/client/src/{services,stores,utils}/*.ts`
  - 客户端 token 化：262 处颜色/radius/motion/shadow token 迁移、169 处 i18n、29 处懒加载、24 处 EmptyState、11 处 AbortController、8 处 uni.* API、8 处 ROUTE_* 常量、38 处 ARIA、43 处平台降级
  - Java 数据层：74 处分页、85 处审计字段、50 处 DB 索引、45 处 Bean Validation、13 处 `@PageableDefault`、8 处 `@Cacheable`、21 处 `@Positive/@Min(1)`
  - Admin token 化：24 处 admin token、8 处 ElMessageBox.confirm
  - 日志/异步：48 处统一日志、10 处异步错误处理
  - 基础设施：`.github/workflows/ci.yml`、`.gitleaks.toml`、`apps/client/src/manifest.json`、`database/flyway/flyway.toml`、`docker-compose.yml`、`docs/{privacy-policy,third-party-sdks,wechat-submission-materials-checklist,WECHAT-MINI-PROGRAM-ACCEPTANCE}.md`

## ADDED Requirements

### Requirement: P0 合规与资金安全零容忍
系统 SHALL 在商业化上线前完成 6 项 CRITICAL 修复：敏感日志脱敏、VIP 自动续费真实扣减、微信小程序 ICP 备案与域名配置、提审材料 100% 就绪。任一未完成 SHALL 阻断上线。

#### Scenario: 敏感字段不出现在日志
- **WHEN** `RealAuthService` 或 `WeChatPushService` 输出日志
- **THEN** openId/phone/token 等敏感字段以 `***` 或掩码形式呈现，原始值不可见

#### Scenario: VIP 自动续费真实扣减
- **GIVEN** 用户开通 VIP 自动续费且账户余额充足
- **WHEN** 系统触发续费
- **THEN** 用户余额账户被扣减对应金额，`vip_billing_log` 写入 SUCCESS 流水；余额不足时写入 FAILED 流水并通知用户

#### Scenario: 微信小程序提审材料就绪
- **WHEN** 检查 `docs/wechat-submission-materials-checklist.md`
- **THEN** 营业执照、ICP 备案、类目资质、客服联系方式等所有条目状态为"已就绪"，附材料文件名与责任人

### Requirement: P1 接口安全与权限完整性
系统 SHALL 为所有写操作 Controller 方法配置 `@PreAuthorize` 与 `@Valid`；写操作 Service 方法 SHALL 标注 `@Transactional`；`@Transactional` 方法内 `catch Exception` SHALL 重新抛出或显式回滚；定时任务 SHALL 使用分布式锁保证幂等。

#### Scenario: 未授权用户调用写接口被拒
- **GIVEN** 用户未登录或角色不匹配
- **WHEN** 调用 `POST /api/v1/village/posts` 等写接口
- **THEN** 返回 401/403，不执行业务逻辑

#### Scenario: 非法请求体被校验拦截
- **GIVEN** 请求体缺少必填字段或字段格式错误
- **WHEN** 调用带 `@Valid` 的接口
- **THEN** 返回 400 Bad Request 与字段级错误信息，不透传到 Service

#### Scenario: 事务异常回滚
- **GIVEN** `@Transactional` 方法内抛出异常
- **WHEN** 异常被 catch 捕获
- **THEN** 事务显式回滚，调用方收到异常信号，数据不残留

#### Scenario: 多实例定时任务不重复执行
- **GIVEN** 多实例部署且 `@Scheduled` 任务触发
- **WHEN** 实例 A 与实例 B 同时尝试执行
- **THEN** 仅一个实例获取 Redisson 锁执行，另一实例快速跳过

### Requirement: P1 前端列表与事件正确性
客户端 SHALL 为所有 `v-for` 提供唯一 `:key`； SHALL 使用 `catchtap`/`catchclick` 替代 `.stop` 修饰符； SHALL 在组件卸载时清理 `setTimeout` 引用。

#### Scenario: 长列表更新无状态错乱
- **WHEN** 聊天消息列表或动态流追加新项
- **THEN** 每项有唯一 `:key`，Vue diff 正确复用 DOM，无状态错乱

#### Scenario: 小程序事件冒泡可控
- **WHEN** 在 mp-weixin 环境点击内层按钮
- **THEN** `catchtap` 阻止冒泡，父级交互不被误触发

#### Scenario: 页面切换无定时器泄漏
- **WHEN** 页面 `onUnload`/组件 `onBeforeUnmount` 触发
- **THEN** 所有 `setTimeout` 引用被 `clearTimeout`，无残留定时器继续执行

### Requirement: P2 设计系统完全落地
客户端与 Admin SHALL 通过 design tokens 表达所有颜色、圆角、阴影、运动时长； SHALL NOT 在 `.vue`/`.css` 中硬编码具体数值（除 token 文件本身）。

#### Scenario: 主题切换无视觉断层
- **WHEN** 切换亮色/暗色主题
- **THEN** 所有页面颜色/圆角/阴影/动画时长跟随变化，无残留硬编码

#### Scenario: 设计 token 覆盖率达标
- **WHEN** 执行 `grep -rn "#[0-9a-fA-F]\{3,8\}" apps/client/src --include="*.vue" --include="*.scss"`
- **THEN** 除 tokens.scss 与条件编译分支外，无硬编码颜色

### Requirement: P2 后端数据访问规范化
后端 SHALL 使用 `Page<T>` 限制全量返回； SHALL 为实体补齐 `@CreatedDate`/`@LastModifiedDate` 审计字段； SHALL 根据查询场景添加 DB 索引； SHALL 对 DTO 字段添加 Bean Validation。

#### Scenario: 列表接口默认分页
- **WHEN** 调用 `GET /api/v1/village/posts` 不带分页参数
- **THEN** 默认返回第 1 页 20 条，最大不超过 100 条

#### Scenario: 审计字段自动填充
- **WHEN** 新建实体保存到数据库
- **THEN** `createdAt` 自动填充当前时间，`updatedAt` 在后续更新时自动刷新

#### Scenario: 查询性能达标
- **GIVEN** posts 表数据量超过 10 万行
- **WHEN** 按 user_id + created_at 查询用户帖子
- **THEN** 命中联合索引，查询响应时间 <100ms

### Requirement: P2 无障碍与国际化完整
客户端 SHALL 为可点击元素提供 `aria-label` 与 `role="button"`； SHALL 对图片提供 `lazy-load`； SHALL 统一使用 `EmptyState` 组件； SHALL 将所有用户可见中文文案抽取到 locale 文件。

#### Scenario: 屏幕阅读器可识别按钮
- **WHEN** 视障用户使用屏幕阅读器浏览
- **THEN** 所有图标按钮、卡片可被朗读出语义化标签

#### Scenario: 多语言切换无残留
- **WHEN** 切换 zh-CN/en-US
- **THEN** 所有用户可见文案跟随切换，无硬编码中文残留

### Requirement: 验证闭环
系统 SHALL 在所有修复完成后跑通：`npm run verify:phase01` 9 项全绿、`mvn test` 全部通过、Admin `vue-tsc && vite build` 通过、Client `build:mp-weixin` 通过、微信开发者工具真机预览无报错。

#### Scenario: verify:phase01 全绿
- **WHEN** 执行 `npm run verify:phase01`
- **THEN** 退出码 0，9 项验证全部通过

#### Scenario: mp-weixin 构建成功
- **WHEN** 执行 `pnpm --filter client run build:mp-weixin`
- **THEN** 退出码 0，`dist/build/mp-weixin` 产物完整，无 backdrop-filter/v-for 缺 key 等问题

## MODIFIED Requirements

### Requirement: VIP 资金类服务幂等与对账
`BillingService`/`AutoRenewService`/`VipRedPacketService`/`RealChatRedPacketService` SHALL 在所有资金类操作中实现幂等键、分布式锁、金额对账、真实账户扣减四重保障；并发请求 SHALL NOT 导致超发、多扣、少付、空扣。

#### Scenario: 自动续费扣减真实余额
- **GIVEN** 用户开通自动续费且账户余额 100 元
- **WHEN** 系统触发 30 元/月续费
- **THEN** 用户余额变为 70 元，`vip_billing_log` 写入 SUCCESS 流水，VIP 有效期延长 1 个月

#### Scenario: 红包领取扣减/充值钱包
- **GIVEN** 用户领取 10 元红包
- **WHEN** 领取成功
- **THEN** 用户钱包余额增加 10 元，红包剩余金额与份数原子扣减，所有操作在同一事务内

## REMOVED Requirements

### Requirement: 调试控制器在生产环境可用
**Reason**: `ErrorSimulationController`/`MatchDebugController` 暴露额外攻击面，可能被用于制造异常或探测内部逻辑
**Migration**: 仅 `test`/`mock` profile 加载或直接移除，生产构建不可访问

### Requirement: 默认密码可用
**Reason**: `change_me`/`change-me-*` 默认密码导致未修改即部署时极易被入侵
**Migration**: 移除默认值，强制通过环境变量注入强密码（≥32 字符随机串）
