# 商业化长期运行 - 1000+ 问题全量修复规范

## Why

`specs/codebase-audit-2026-07-25/CONSOLIDATED-ISSUE-LIST-1000+.md` 已识别 1,000 条问题（🔴 CRITICAL 95 / 🟠 HIGH 483 / 🟡 MEDIUM 288 / 🟢 LOW 134），覆盖硬编码、Bug/安全、功能完整性、UI/UX、测试、基础设施六大维度。多视角评价（企业 / 技术专家 / 终端用户 / 营销）一致结论：**当前代码库"可演示但不可规模运营"**——微信登录链路断裂、隐私照片公开可访问、管理后台无权限、JWT 无撤销、零 i18n、5 个 God Class、零缓存/限流/版本化、设计系统三套 Token 并存、无障碍全面缺失，存在阻断性合规风险与极高长期维护成本。

本规范作为**主控规范（Master Spec）**，将 1,000 条问题映射为 10 个有序阶段（P0-P9），以"先止血、再治本、后优化"的策略，把项目从"可演示"推进到"可规模商业化运营 + 长期可演进"。每个阶段在执行时将派生为独立的 spec delta（如 `2026-07-27-p0-security-login-baseline`），以保证小步迭代、可验证、可回滚。

## What Changes

### P0 - 安全合规与登录可用性基线（止血，~95 条 CRITICAL）
- **微信登录真实实现**：`loginWithWechat()` 接入 `wx.login()` → `code2session` → 后端换取 openId/session_key，删除一切 Mock fallback
- **隐私合规**：`manifest.json` 增加 `__usePrivacyCheck__: true`，`App.vue` 注册 `wx.onNeedPrivacyAuthorization`，配置 `requiredPrivateInfos`
- **上传目录鉴权**：移除 `SecurityConfig` 中 `/uploads/**` 公开访问，改为鉴权代理端点（按 userId 校验归属）
- **管理端权限**：8 个 Admin Controller 类级别统一添加 `@PreAuthorize('hasRole(ADMIN)')`，`AdminAuth` 校验 `enabled/status`
- **凭据脱敏**：`User.password`、`UserSession.sessionToken` 添加 `@JsonIgnore`，DTO 化返回
- **JWT 撤销机制**：引入 Redis Token 黑名单或 `tokenVersion` 字段，退出登录主动失效
- **HTTP 401 规范化**：JWT 认证失败统一返回 401 + 标准 JSON 错误体
- **HTTPS 强制**：客户端 fallback URL 改为 `https://`，配置合法域名
- **CORS 配置化**：`WebConfig` 改用 `allowedOriginPatterns` + 配置文件注入
- **敏感配置加密**：数据库密码、JWT Secret、微信 AppSecret 通过环境变量/KMS 注入，移除明文
- **Gitleaks 修正**：移除 BCrypt 哈希白名单

### P1 - 核心用户旅程修复（~80 条 CRITICAL/HIGH）
- **聊天双 Store 重复渲染**：统一以 `messagesStore` 为单一数据源，移除 `chatStore.messages` 双写
- **语音消息真实实现**：集成 `uni.getRecorderManager()` + `uni.uploadFile()`，完成录音 → 上传 → 发送音频 URL 全流程
- **会话 ID 真实化**：移除硬编码 `session-${rawUserId}`，改为 `POST /api/sessions` 创建/获取真实 sessionId
- **下拉刷新修复**：`refresherTriggered` 改为 `ref(false)`
- **Admin 假数据清除**：`Feedback.vue` 移除 `mockFeedback`，接入 `GET /api/admin/feedback`；`Users.vue` `handleSaveEdit` 实现 `PUT /api/admin/users/:id`
- **AI 视频 401 修复**：API Key 移至环境变量，添加 401 专用错误处理
- **VIP 状态显示**：`profile.load()` 解析 `vipStatus` 字段，新增 `loadMyPosts()`
- **资料完成度算法**：改为加权平均（非 `Math.min`）
- **签到服务端时间**：连续性判断由服务端基于服务器时间执行
- **定时器泄漏清理**：所有模块级 `setTimeout/setInterval` 在 `onUnload`/`onBeforeUnmount` 清理
- **触摸事件兼容**：`CardSwiper`/`CardDetailOverlay` 改用 uni-app 统一触摸事件
- **WXSS 兼容性**：`aspect-ratio` → `padding-top` 百分比；`display:grid` → Flexbox；`backdrop-filter` 加 rgba fallback；`100vh` → `wx.getWindowInfo + flex:1`；`filter:blur()` → Canvas/预处理图
- **Rewind 限制执行**：超限抛出 `DailyLimitExceededException`
- **事件修饰符**：`@tap.stop` → `catchtap`（条件编译）

### P2 - 后端架构与数据完整性（~100 条 HIGH）
- **乐观锁**：所有 JPA Entity 添加 `@Version private Long version`
- **N+1 查询消除**：批量收集 authorId → 一次性 `findByIdIn` → Map 组装；使用 `JOIN FETCH`/`@EntityGraph`
- **唯一约束**：`Like(user_id, target_user_id)`、`User.open_id` 等添加唯一约束 + `INSERT ON DUPLICATE KEY UPDATE`
- **缓存策略**：集成 Spring Cache + Redis/Caffeine，覆盖敏感词/系统配置/校园信息/用户标签
- **韧性模式**：引入 Resilience4j，为微信 API/短信/对象存储添加熔断/重试/降级
- **API 版本化**：所有路径升级为 `/api/v1/**`
- **统一响应格式**：所有 Controller 返回 `ApiResponse<T>` 包装
- **幂等性**：写操作支持 `Idempotency-Key` + Redis 去重
- **限流**：登录/短信/上传/推荐接口添加 Redis + Lua 限流
- **全局异常处理**：生产环境返回通用错误消息，详细信息仅记录日志，定义业务异常层次（`UserNotFoundException` 等）
- **事务边界修正**：移除 `catch(Exception)` 吞异常，远程调用移出事务，批量更新加 `@Transactional`
- **Service 接口抽象**：8 个 Controller 改为面向接口编程
- **线程池配置化**：使用 `ThreadPoolTaskExecutor`，配置化核心/最大线程数、队列、拒绝策略
- **Spring Boot Actuator**：暴露 `/actuator/health/info/metrics`
- **请求追踪 ID**：Filter 中生成 TraceId 注入 MDC/响应头
- **分页上限**：`@Max(100)` 校验
- **文件上传安全**：MIME + magic bytes 校验，后端限制大小

### P3 - 设计系统统一与硬编码消除（~250 条 HIGH/MEDIUM）
- **Token 三合一**：废弃 `design-system/tokens.ts`（天蓝）与 Admin 紫色系，统一以 `apps/client/src/theme/tokens.ts` 为单一来源，Admin 复用相同 Token
- **i18n 框架**：客户端引入 `vue-i18n`，Admin 引入 `vue-i18n`，Java 后端 `MessageSource` + LocaleResolver
- **文案 i18n 化**：500+ 处硬编码中文迁移到 `locales/zh-CN.ts` 与 `locales/en-US.ts`，使用 `$t()` 调用
- **CSS 变量统一**：颜色/字号/阴影/圆角/动画时长全部 token 化，移除 `#fff`/`#FF6B9D`/`#333` 等硬编码
- **路由常量化**：`constants/routes.ts` 统一维护页面路径
- **Storage key 常量化**：`constants/storage-keys.ts` 统一管理
- **配置化**：学校列表、匹配偏好、筛选选项、Hero Banner、解锁引导步骤等从后端 API 动态获取
- **法律文本外置**：用户协议/隐私政策从 CMS 或配置文件获取
- **API 参数常量化**：`Bearer ` 前缀、`wxCode` 参数名、WebSocket topic 等
- **魔法数字常量化**：`UI_LIMITS`、`API_TIMEOUT`、`WS_RECONNECT` 等
- **Admin 重复样式抽取**：`admin-common.css` 或共享组件（`<Pagination>` 等）
- **Mock 数据 i18n**：`fixtures.ts` 使用 i18n key

### P4 - God Class 拆分与代码质量（~50 条 MEDIUM）
- **5 个 God Class 拆分**：
  - `RealRecommendationService`（1368 行）→ `RecommendationStrategy` + `UserPreferenceCalculator` + `RecommendationCacheManager` + `RecommendationRanker`
  - `RealMatchService`（1011 行）→ `MatchEngine` + `MatchPolicy` + `MatchRecorder`
  - `RealVillageService`（979 行）→ `VillagePostService` + `VillageInteractionService` + `VillageQueryService`
  - `RealTempChatService`（948 行）→ `TempChatSessionService` + `TempChatMessageService` + `TempChatCleanupService`
  - `RealProfileService`（748 行）→ `ProfileQueryService` + `ProfileUpdateService`
- **异常处理规范**：捕获具体异常类型，移除 `catch(Exception)`/`e.printStackTrace`/`System.out.println`
- **Lombok 修正**：Entity 改用 `@Getter/@Setter`，懒加载字段加 `@ToString.Exclude`
- **时间 API 统一**：全部迁移至 `java.time`
- **业务异常层次**：定义 `UserNotFoundException`/`MatchAlreadyExistsException`/`DailyLimitExceededException` 等
- **Repository 优化**：移除 nativeQuery 字符串拼接，使用 Criteria API
- **日志规范**：SLF4J 参数化，移除字符串拼接
- **Optional 安全使用**：`orElseThrow` 替代 `get()`

### P5 - 功能完整性补全（~150 条 MEDIUM）
- **真实推荐算法**：移除 `swipeRight` 失败时 `Math.random() > 0.5` Mock fallback，API 失败向上抛异常
- **swipeLeft 上报**：调用后端 API 记录跳过
- **帖子分页**：`fetchMoreActivities` 维护 `currentPage` 状态
- **临时聊天会话清理**：`@Scheduled` 定期清理过期会话
- **Elasticsearch 索引同步**：审批后同步更新用户索引
- **配置中心化**：`AdminConfigController` 配置更新后广播刷新事件
- **统计汇总表**：使用物化视图/汇总表替代实时 `COUNT(*)`
- **敏感词导入异步化**：改为异步任务或分批处理
- **图片懒加载**：列表 `<image>` 添加 `lazy-load`
- **网络状态监听**：`wx.onNetworkStatusChange` 主动提示
- **图片 fallback**：`@error` 事件显示默认占位图
- **乐观更新**：点赞/通知开关等先本地更新再同步服务端
- **WebSocket 指数退避**：重连策略改为指数退避算法
- **未读消息计数实时更新**：WebSocket 推送新消息时更新计数

### P6 - UI/UX 与无障碍（~150 条 MEDIUM/LOW）
- **暗色模式**：`app.json` 声明 `darkmode: true`，定义暗色 Token
- **prefers-reduced-motion**：所有 CSS 动画添加回退
- **a11y 全面修复**：
  - 100+ 图片添加 `alt`/`aria-label`/`aria-hidden`
  - TabBar 添加 `role=tablist`/`role=tab`/`aria-selected`/`aria-label`
  - 表单输入框 `<label>` 关联（7 个表单 + Admin）
  - 模态框 `role=dialog`/`aria-modal=true`/焦点锁定/焦点返回
  - 触控目标 ≥ 44×44 CSS 像素
  - 颜色对比度 ≥ 4.5:1
  - 状态信息补充文字（不仅靠颜色）
  - `<html lang="zh-CN">`、`theme-color`、`aria-busy`、`aria-live`
  - Skip link 跳到主内容
  - `:focus-visible` 替代 `:focus`
- **重复 CSS 抽取**：8 个 Admin 视图共享样式归并到 `admin-common.css`
- **分包加载**：`pages.json` 按功能拆分 subpackages
- **scroll-view 优化**：启用 `enhanced`/`bounces`
- **Vue Transition**：替换手动 `class + setTimeout` 动画
- **v-for key**：使用业务 ID 替代 index
- **defineProps validator** + **defineEmits 类型化**

### P7 - 测试与质量保障（~30 条 MEDIUM/HIGH）
- **Java Controller 单元测试**：覆盖 30 个无测试 Controller
- **Vue 组件测试**：40 个无测试组件补全
- **Store 测试加强**：14 个 Pinia store 覆盖率提升至 80%+，覆盖异步错误分支
- **API 层直接测试**：移除 `vi.mock()` 完全替换，验证签名/参数/响应/错误分支
- **E2E 测试**：引入 Playwright，覆盖注册→匹配→聊天核心旅程
- **性能测试**：引入 k6，建立响应时间基准与并发负载测试
- **a11y 测试**：引入 axe-core/jest-axe
- **视觉回归测试**：引入 Storybook + Chromatic
- **覆盖率阈值**：提升至 80% statements/lines
- **JaCoCo**：Java 端集成，mvn test 产出覆盖率
- **Flyway 迁移测试**：验证迁移正确性与可重复执行
- **测试数据工厂**：`UserFactory`/`MatchFactory` 等
- **CI 质量门禁**：SonarQube/OWASP Dependency Check/代码重复率/圈复杂度
- **测试规范**：AAA 结构、命名一致、`waitFor`/`flushPromises` 替代 `setTimeout`

### P8 - 基础设施与运维（~40 条 MEDIUM/LOW）
- **Docker 化**：`Dockerfile` + `docker-compose.yml` + `.dockerignore`（API/Admin/Client/MySQL/Redis）
- **环境变量模板**：`.env.example` 完整列出所有变量
- **监控告警**：Prometheus + Grafana + Alertmanager，覆盖 JVM/业务/错误率/慢查询/第三方可用性
- **日志规范**：`logback-spring.xml` 滚动策略、敏感字段脱敏、access log
- **数据备份**：MySQL 定时备份脚本 + 恢复演练文档
- **API 文档**：springdoc-openapi 注解 + Swagger UI
- **CI/CD 完善**：统一发布流程文档，归档测试覆盖率报告
- **JVM 参数修正**：`DEPLOYMENT.md` 中 `java -Xms... -jar` 语法
- **构建脚本**：`build-mp-weixin.bat` 改用 pnpm + 错误处理
- **配置归并**：YAML 文件去重，敏感与普通配置分离
- **数据库规范**：表名/列名统一，ENGINE/CHARSET/COLLATE 显式声明，索引补全，外键约束

### P9 - 文档与发布（~50 条 LOW）
- **API 文档**：OpenAPI/Swagger 完整注解
- **Storybook**：43 个组件 Props 说明 + stories
- **变更说明**：CHANGELOG.md 维护
- **发布检查清单**：release-checklist 完善
- **灰度发布策略**：基于 API 版本化 + 用户分组的灰度方案
- **灾备文档**：Disaster Recovery Plan
- **用户操作手册**：终端用户使用指南
- **运营手册**：Admin 后台操作指南
- **API 契约文档**：前后端接口契约
- **架构决策记录**：ADR 文档

## Impact

- **Affected specs**: 所有 38 个历史 spec deltas（详见 `.trae/specs/` 目录），本规范作为主控规范统筹
- **Affected code**:
  - 客户端 `apps/client/`：全部 pages、components、stores、services、config、theme、utils
  - 管理后台 `apps/admin/`：全部 views、stores、utils、router
  - Java 后端 `apps/api/`：config、auth、admin、chat、discover、match、village、campus、profile、media、growth 等全部模块
  - 数据库 `database/flyway/sql/`：54+ 迁移脚本补全回滚、新增索引/外键/唯一约束/`@Version` 列
  - 基础设施：CI/CD、Docker、监控、备份
  - 测试：单元/E2E/性能/a11y/视觉回归
  - 文档：API 文档、Storybook、CHANGELOG、运维手册

- **Affected teams**：前端、后端、QA、运维、设计、产品、运营
- **Affected business**：微信小程序提审、商业化推广、海外拓展（i18n）、合规审计、长期可维护性

## ADDED Requirements

### Requirement: 商业化安全合规基线
系统 SHALL 在微信小程序真实环境下完成 OAuth 登录全流程，SHALL 保护用户上传的私密媒体文件不被未授权访问，SHALL 强制所有管理端接口需要 ADMIN 角色权限，SHALL 支持主动撤销 JWT，SHALL 不在任何响应中暴露密码哈希或会话 Token。

#### Scenario: 微信小程序真实登录
- **WHEN** 用户在微信中打开小程序并点击"微信登录"
- **THEN** 系统调用 `wx.login()` 获取临时 code，发送至后端 `/api/v1/auth/wechat`
- **AND** 后端调用 `code2session` 换取 openId 与 session_key
- **AND** 系统返回 JWT 与用户信息，前端跳转至首页

#### Scenario: 上传文件鉴权
- **WHEN** 任意用户访问 `/uploads/**` 路径
- **THEN** 系统校验 JWT 与文件归属
- **AND** 仅文件所有者或管理员可访问，否则返回 403

#### Scenario: 管理端权限
- **WHEN** 非 ADMIN 角色用户访问任意 `/api/v1/admin/**` 端点
- **THEN** 系统返回 HTTP 403 Forbidden

#### Scenario: JWT 撤销
- **WHEN** 用户点击"退出登录"
- **THEN** 后端将当前 JWT 加入 Redis 黑名单
- **AND** 后续使用该 JWT 的请求返回 401

### Requirement: 核心用户旅程可用
系统 SHALL 在聊天页面显示单一消息流（无双倍渲染），SHALL 支持真实语音消息录制与播放，SHALL 使用服务端分配的真实会话 ID，SHALL 在所有页面正确响应下拉刷新，SHALL 在所有核心页面提供加载/失败/空数据三态处理。

#### Scenario: 聊天消息单源渲染
- **WHEN** 用户在聊天会话页发送一条消息
- **THEN** UI 上仅出现一条消息气泡
- **AND** 消息持久化至后端，刷新后仍然可见

#### Scenario: 语音消息
- **WHEN** 用户长按语音按钮录音并释放
- **THEN** 系统调用录音 API 获取音频文件并上传
- **AND** 接收方收到音频 URL 可播放真实录音

### Requirement: 后端架构可扩展
系统 SHALL 为所有 JPA 实体提供乐观锁，SHALL 消除 N+1 查询，SHALL 为高频数据提供缓存，SHALL 为外部调用提供熔断与重试，SHALL 统一 API 响应格式为 `ApiResponse<T>`，SHALL 对所有写操作支持幂等性，SHALL 对敏感接口施加速率限制。

#### Scenario: 乐观锁冲突
- **WHEN** 两个并发请求同时更新同一用户资料
- **THEN** 后提交的事务收到 HTTP 409 Conflict
- **AND** 先提交的数据完整保留

#### Scenario: API 统一响应
- **WHEN** 前端调用任意 `/api/v1/**` 端点
- **THEN** 响应体结构为 `{ code, message, data, traceId }`

### Requirement: 设计系统单一来源
系统 SHALL 仅维护一套设计 Token（颜色/字号/间距/阴影/圆角/动画），SHALL 在客户端与管理后台共享同一 Token，SHALL 通过 vue-i18n 管理全部用户可见文案，SHALL 不在生产代码中包含任何硬编码颜色值或中文字符串。

#### Scenario: 主题切换
- **WHEN** 运营在配置中心修改品牌主色
- **THEN** 客户端与管理后台同时反映新主色，无需重新发版

### Requirement: 长期可演进性
系统 SHALL 将所有 God Class 拆分为单一职责的 Service，SHALL 通过接口抽象实现依赖倒置，SHALL 维护完整单元测试覆盖（≥80%），SHALL 提供 E2E/性能/a11y/视觉回归测试，SHALL 通过 Docker 标准化部署，SHALL 接入监控告警与日志追踪。

#### Scenario: 上线监控
- **WHEN** 推荐接口 P99 响应时间超过 2 秒
- **THEN** Prometheus 触发 Alertmanager 告警
- **AND** 运维收到告警通知，可通过 traceId 在日志中定位请求链路

### Requirement: 无障碍合规
系统 SHALL 为所有交互元素提供 ARIA 语义，SHALL 为所有功能图片提供 alt 文本，SHALL 支持键盘导航与焦点管理，SHALL 尊重 `prefers-reduced-motion`，SHALL 满足 WCAG 2.1 AA 对比度标准，SHALL 提供暗色模式。

#### Scenario: 视障用户匹配
- **WHEN** 视障用户使用屏幕阅读器进入匹配页
- **THEN** 屏幕阅读器播报"喜欢/跳过/超级喜欢"按钮语义
- **AND** 用户可通过键盘或手势完成匹配操作

## MODIFIED Requirements

### Requirement: 项目交付标准
项目交付标准从"功能可演示"升级为"可规模商业化运营 + 长期可演进"。所有 1,000 条审计问题须在本规范派生的 10 个 spec delta 中全量闭环，并通过商业化验收检查清单（见 checklist.md）。

## REMOVED Requirements

### Requirement: Mock 模式开发
**Reason**: 当前生产代码中存在大量 Mock fallback（登录、匹配、Feedback、签到），与商业化运营目标冲突
**Migration**: 所有 Mock 数据迁移至 `services/mocks/fixtures.ts` 仅用于测试环境，生产代码通过 `import.meta.env.VITE_MOCK_MODE` 严格控制，默认关闭

## 多视角成功标准

- **企业决策者**：登录链路可用、合规风险消除、可进入海外市场、长期维护成本可控
- **技术专家**：安全模型完整、数据一致性保障、性能基础设施齐备、工程规范统一、可观测性到位
- **终端用户**：核心功能可用、无重复消息/空壳功能、付费权益可见、无障碍体验完整
- **营销人员**：拉新投放可转化、运营反馈可获取、活动公平性保障、合规舆情风险可控

## 与历史 spec 的关系

本规范是 38 个历史 spec deltas 的**收口规范**。历史 spec 已完成的工作（如视觉重构、H5 验证、mp-weixin 调试）作为本规范的输入基线，不再回滚。本规范派生的新 spec delta 将按 P0→P9 顺序执行，每个 delta 完成后更新 checklist.md。
