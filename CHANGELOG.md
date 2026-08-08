# Changelog

> 本文件遵循 [Keep a Changelog 1.0.0](https://keepachangelog.com/zh-CN/1.0.0/) 规范
> 版本号遵循 [Semantic Versioning 2.0.0](https://semver.org/lang/zh-CN/) 规范
> 维护者：项目 Owner
> 配套文档：`docs/CI-CD.md`、`docs/release-checklist.md`、`docs/GRADUAL-RELEASE.md`

---

## 变更类型说明

- `Added`：新增功能
- `Changed`：对已有功能的变更
- `Deprecated`：即将废弃的功能
- `Removed`：本版本已移除的功能
- `Fixed`：Bug 修复
- `Security`：安全相关修复（CVE 引用、漏洞修复）

---

## [Unreleased]

### Added
- **P9 - 文档与发布**：API 契约文档 `docs/API-CONTRACT.md`，覆盖 50 个 Controller、200+ 端点的契约规范
- **P9 - 文档与发布**：Storybook 组件文档，覆盖 63+ 个组件的 Props 说明与可视化预览（7+ stories 文件）
- **P9 - 文档与发布**：架构决策记录（ADR），初始 10 个 MADR 格式决策记录
- **P9 - 文档与发布**：终端用户使用指南 `docs/USER-GUIDE.md`
- **P9 - 文档与发布**：Admin 后台运营手册 `docs/ADMIN-GUIDE.md`
- **P9 - 文档与发布**：故障排查手册 `docs/TROUBLESHOOTING.md`
- **P9 - 文档与发布**：灰度发布策略 `docs/GRADUAL-RELEASE.md`
- **P9 - 文档与发布**：扩展灾难恢复计划 `docs/DR/DRP.md`

### Changed
- **P9**：完善 `docs/release-checklist.md`，覆盖商业化发布全部门禁
- **R4-batch3（B3-2）**：
  - 客户端环境配置收敛：`services/env.ts` 降级为纯 re-export 兼容层，业务代码统一走 `config/env.ts`（双实现漂移消除，R4-00148/R4-00205）
  - 开发环境 API 回退地址支持 `VITE_DEV_API_BASE_URL` 覆盖（R4-00204）；媒体 URL token 拼接支持 `VITE_MEDIA_TOKEN_QUERY=false` 关闭（R4-00244，后端改签名 URL 后可平滑切换）
  - 解锁幂等键统一为 `UNLOCK-{scene}-{targetId}`（likes.unlockUser 与 coins.spend 共用 buildUnlockOrderId，R4-00195）
  - 右滑防抖改为「防抖窗口内幂等队列 + 卡片快照」：快速连续右滑不再丢失早先喜欢、不再误报「卡片不存在」（R4-00177）
  - 签到/补签日期改为本地时区（复用 localDateKey），修复北京 00:00-08:00 签到日期前一天问题（R4-00176）
  - mock 用户 ID 统一为 `user-<数字>` 单一体系（session/fixtures/likes/village/campus，R4-00125/00130/00133/00134/00135）
  - TabBar 三处配置新增一致性校验脚本 `pnpm --filter client check:tabbar`（R4-00209）
  - 错误提示/表单校验/录音权限/反馈状态/首页引导/个人主页占位等硬编码中文迁移至 i18n（R4-00213~00220）
  - 资料完善度权重抽取为常量并注释业务依据；字段判定收敛到单一函数（R4-00123/00194）

### Fixed
- **R4-batch3（B3-2）**：
  - `withTimeout` 超时分支补调 cleanup()，修复外部 AbortSignal 监听器累积泄漏（R4-00169）
  - `docs/openapi/recommendations.yaml` 对齐真实端点：删除不存在的 `/recommendations/cards*`，补 `/recommendations`、`/quota`、`/discussions`、`/activities`、`/history`、`/preferences/me` 与 ageMin/ageMax 参数（R4-00163/R4-00344）
  - `docs/API-CONTRACT.md`：VIP 域按真实路由重建（移除不存在的 /vip/plans、/vip/orders、VIP 红包端点并登记本 CHANGELOG，R4-00487/00488）；Token 有效期契约 2h→24h 对齐 JWT_EXPIRATION_MS 并标注管理端无刷新缺口（R4-00490）；敏感词批量导入/活动提案转化标注「仅 API」（R4-00494）
  - `docs/user-agreement.md`：移除已下线功能的「虚拟币打赏与红包」「未领取红包」表述（R4-00497）
  - flyway：`flyway.toml` 移除 admin_openid/admin_nickname 弱默认值强制注入（R4-00409）；手机号唯一迁移补充受影响行审计/备份指引（R4-00419）；种子图片由 Pexels 不可达 URL 改为客户端包内本地素材（R4-00421/00425）；语音消息外链改为本地 `static/audio/voice-demo-*.wav`（R4-00426）；删除与 0014 重复的 `V2026.08.08.0011__seed_campus_topics.sql`（R4-00424）
  - 演示种子数据：50 个演示用户手机号补足 11 位合法号段（R4-00503）；城市与校区城市对齐（R4-00504）；帖子点赞/评论计数与实插互动记录对账（R4-00505）；补充用户间双向喜欢/匹配对（R4-00506）；42 个补全用户代词与身高按性别混合（R4-00507）；头像本地化 UPDATE 限定目标用户范围（R4-00508）；补充完善度/认证中间态样本（R4-00509）；时间戳按近 90 天分布（R4-00510）；钱包流水 type 改为 CREDIT/DEBIT（R4-00511）；补全滑动/私信/钱包漏斗环节（R4-00512）；补充风控批量注册演示场景（R4-00513）

### Removed
- **R4-batch3（B3-2）**：VIP 红包端点（/api/v1/vip/red-packets、/red-packets/{id}/claim、/admin/business/vip/red-packets）从 `docs/API-CONTRACT.md` 移除；`config/app.ts` 的死配置 STORAGE_KEYS 删除（R4-00206）


---

## [1.0.0] - 2026-07-26

> 商业化首版发布。完成 P0-P9 全量修复，1,000 条审计问题闭环。

### Added - 安全合规与登录可用性（P0）

#### 微信登录真实链路
- 客户端 `services/auth.ts` `loginWithWechat()` 接入 `wx.login()` 获取 code，含 15s 超时 + state CSRF 防护
- 后端 `/api/v1/auth/wechat` 实现 `code2session` 调用（`WechatAuthController` + `RealAuthService` + `WeChatClient`）
- 用户表 `open_id` 添加唯一约束（Flyway `V2026.07.26.0002__add_open_id_unique_constraint.sql`）
- 移除客户端登录链路 Mock fallback，登录失败抛 `WechatLoginError(INVALID_CODE/WECHAT_API_ERROR/USER_DISABLED/CLIENT_ERROR)`
- 单元测试覆盖客户端 7 用例 + 后端 8 用例

#### 隐私合规配置
- `manifest.json` 添加 `__usePrivacyCheck__: true`（mp-weixin 段新增 `permission`/`requiredPrivateInfos`）
- `App.vue` `onLaunch` 注册 `wx.onNeedPrivacyAuthorization` 回调（三选项流程：同意并继续 / 查看协议 / 不同意）
- `app.json` 配置 `requiredPrivateInfos`（chooseAddress/chooseLocation/getLocation）
- 7 个文件 / 9 处调用隐私接口组件添加 `ensurePrivacyAuthorized()` 检查

#### 上传目录鉴权改造
- `SecurityConfig` 移除 `/uploads/**` `permitAll`（改为 `denyAll()`，强制走鉴权代理）
- 实现 `MediaAccessController` 鉴权代理端点 `GET /api/v1/media/{userId}/**`，含 JWT 鉴权 + Path Traversal 防护 + 管理员放通
- 文件路径按 `uploads/{userId}/{yyyyMM}/{uuid}.{ext}` 分片
- 客户端 14 个核心组件/页面接入 `utils/media.ts` `resolveMediaUrl`

#### 管理端权限注解
- 11 个 Admin Controller 类级别添加 `@PreAuthorize('hasRole(ADMIN)')`（超出 8 个要求）
- `RealAuthService.loginAsAdmin` 校验 `status='disabled'`，禁用账号抛 `AdminDisabledException`
- `AdminPermissionAspect` 切面（@Profile("real")）双重保险，结构化 warn 日志

#### 凭据脱敏与 JWT 撤销
- `User.password`、`UserSession.sessionToken` 添加 `@JsonIgnore`
- 全部接口 DTO 化返回，无 Entity 直接序列化
- `RedisTokenBlacklistService` 实现，Redis Key=`jwt:blacklist:{jti}`，TTL=JWT 剩余有效期，Redis 故障降级本地内存
- `JwtTokenProvider` 新增 jti claim；`JwtAuthenticationFilter` 每次请求校验黑名单
- `JwtAuthenticationEntryPoint` 返回 HTTP 401 + 标准 JSON + `X-Trace-Id` 响应头

#### 网络与配置安全
- 客户端 fallback URL 改为 `https://`（H5 dev 保留 http 用 `#ifdef H5` 条件编译）
- `WebConfig` CORS 使用 `allowedOriginPatterns` + 配置文件注入
- `application.yml` 敏感配置全部环境变量占位（JWT_SECRET/WECHAT_APPID/WECHAT_SECRET/REDIS_PASSWORD 等）
- `.gitleaks.toml` 移除 BCrypt 哈希白名单正则
- Admin 默认密码哈希改为强随机 BCrypt（cost=10，22 字符随机盐）

### Added - 核心用户旅程修复（P1）

#### 聊天功能
- 统一以 `messagesStore` 为单一数据源，`syncChatStoreMessagesToMessagesStore()` 同步
- 模板移除 `legacyMessagesView` 重复 `v-for` 渲染块
- 移除硬编码 `session-${rawUserId}`，调用 `messagesStore.createSession()` 创建真实会话
- `sendVoice()` 集成 `uni.uploadFile()` 上传录音
- 定义 `SendMessageRequest` 接口，`sendText`/`sendVoice` 强类型 payload
- `@tap.stop` → `catchtap`（4 处跨 3 个文件）

#### 列表与交互
- `refresherTriggered` 改为 `ref(false)` + loading 阶梯状态
- `loadMoreData()` 添加 300ms 防抖 + `AbortController` 取消重叠请求
- 会话列表 `v-for` 使用业务 ID 替代 index
- 活动报名按钮 loading 状态防重复点击

#### Admin 假数据清除
- `Feedback.vue` 移除 `mockFeedback`，接入 `listAdminFeedback()` 真实 API
- `Users.vue` `handleSaveEdit` 接入真实用户列表 API
- 删除所有 admin 页面硬编码 mock 数组，统一 `AppApiError` 错误处理 + loading/empty/error 三态

#### 业务逻辑修复
- `profile.load()` 解析 `vipStatus`，新增 `loadMyPosts()`
- `session.ts` 资料完成度改为加权平均（displayName 10% + campus 10% + schedule 10% + profileCompleted 70%）
- 签到连续性判断服务端 `LocalDate.now(ZoneId.of("Asia/Shanghai"))`
- `RealMatchService.rewind()` Redis 日计数 + 本地 fallback，超限抛 `DailyLimitExceededException`
- AI 视频 API Key 移至后端 `RealAiVideoService`，前端代理，401 转 `AiApiUnauthorizedException`

#### 定时器与 WXSS 兼容性
- 模块级 `setTimeout/setInterval` 迁移至 `script setup` 内部
- 所有定时器在 `onUnmounted`/`onBeforeUnmount` 清理
- `CardSwiper`/`CardDetailOverlay` 改用 uni-app 统一 `@touchstart/@touchmove/@touchend`
- 验证码倒计时 `setInterval` 切后台暂停
- `aspect-ratio` → `padding-top` 百分比
- `display:grid` → Flexbox（9 个文件，flex-wrap + calc 等宽列）
- `backdrop-filter` 加 `#ifdef H5` 条件编译 + rgba fallback
- `100vh` → `100% + flex:1`（24 个文件 25 处替换）
- `cursor:pointer`/`user-select:none` 移除（17+4 文件）

### Added - 后端架构与数据完整性（P2）

#### 数据一致性
- 65 个 JPA Entity 全部添加 `@Version private Long version = 0L`
- Flyway `V2026.07.26.0003__add_version_columns.sql`（幂等 `information_schema` 检查，覆盖 65 张表）
- `Like(user_id, target_user_id)` 唯一约束
- `User.open_id` 唯一约束
- 9 条外键约束（private_messages/likes/pass_records/reports/notifications）

#### N+1 查询消除
- 5 个方法批量查询（RealMatchService/RealPrivateMessageService/RealNotificationService/RealCampusService/RealProfileService）
- `RealVillageService.getSimilarAuthors()` 数据库层分页
- `toCampusTopicView/toCampusTopicReplyView` 重载方法接收预加载 Map
- 8 个 Repository 添加 `@EntityGraph`

#### 缓存与韧性
- `RedisConfig`（@EnableCaching + CacheManager + 8 个 TTL）+ `CaffeineCacheConfig`（备用）
- 敏感词/系统配置/校园信息/用户标签/每日一问/推荐列表/热门帖子 `@Cacheable` 与 `@CacheEvict`
- `Resilience4jConfig` + 3 个 backend（wechatApi/objectStorage/sms），4 个方法 `@CircuitBreaker`+`@Retry`+fallback
- `WeChatPushService.cachedAccessToken` 与 `tokenExpireTime` 声明 `volatile`

#### API 规范化
- 48 个 Controller `@RequestMapping` 全部以 `/api/v1/` 开头
- `ApiResponse<T>` 应用到 16 个核心 Controller
- `@Idempotent` 标注 34 处 / 15 个 Controller 写接口
- 19 处 `@RateLimit`（Bucket4j 令牌桶）
- 20 处 `@Min(1) @Max(100)` 分页参数校验

#### 异常处理与事务
- `BusinessException` 基类 + 8 个子类
- `GlobalExceptionHandler` 生产环境返回通用错误消息
- `RealAdminMatchConfigService.updateMatchConfig` 移除 `catch(Exception)`
- `AdminNotifyConfigController.update` 添加 `@Transactional`
- `RealAuthService.loginWithWechat` 远程调用移出事务

#### 工程规范
- 31 个 Service 接口抽象
- `AsyncConfig`（taskExecutor + auditLogExecutor）+ `AuditAsyncConfig`
- Actuator 暴露 `health,info,prometheus,metrics`
- `TraceIdFilter` `@Component @Order(HIGHEST_PRECEDENCE+10)` 自动注册，MDC + `X-Trace-Id` 响应头
- `LocalMediaStorageService.validateMagicBytes` 12 字节文件头校验

### Added - 设计系统统一与硬编码消除（P3）

#### 设计 Token 三合一
- `apps/client/src/theme/tokens.ts` 单一来源，`design-system/tokens.ts` 已废弃 re-export
- `apps/admin/src/theme/tokens.ts` re-export 客户端 Token
- color/typography/spacing/shadow/radius/motion 完整 Token
- `apps/client/src/styles/tokens.scss` 全局 CSS 变量

#### i18n 框架
- 客户端 `vue-i18n@9.14.2` + `zh-CN.ts`/`en-US.ts`（100+ keys）
- Admin `vue-i18n@9.14.2` + `zh-CN.ts`/`en-US.ts`（1300+ keys）
- 后端 `I18nConfig`（MessageSource UTF-8 + AcceptHeaderLocaleResolver）+ `messages*.properties`（150+ keys）
- `apps/client/src/utils/time.ts` 基于 `Intl.DateTimeFormat` 的 `formatDateTime`/`formatRelativeTime`/`formatChatListTime`

#### 文案与硬编码 token 化
- 500+ 处硬编码中文迁移到 locale 文件
- 8 个 Admin 视图 i18n 化
- 14 个 Store 错误回退消息使用 i18n key
- 颜色（#fff/#FF6B9D/#333 等）→ CSS 变量
- 字号（20+ 种）→ 语义化排版 token
- 阴影（5+ 种）→ `shadow-sm/md/lg`
- 圆角（12+ 种）→ `radius-sm/md/lg/xl`
- 动画时长 → `duration-fast/normal/slow`

#### 常量与配置动态化
- `constants/routes.ts` 统一页面路径
- `constants/storage-keys.ts` 统一 Storage key
- `constants/api-params.ts`（Bearer 前缀/wxCode/WebSocket topic）
- `UI_LIMITS`/`API_TIMEOUT`/`WS_RECONNECT` 等魔法数字常量化
- 学校列表从后端 API 获取
- 匹配偏好选项动态获取
- 筛选选项动态获取
- Hero Banner 从后端配置接口获取
- 解锁引导步骤文案外置

#### Admin 重复样式抽取
- 8 个 Admin 视图共享样式归并到 `admin-common.css`
- `<Pagination>` 组件或 `usePagination` composable
- `<ConfirmDialog>` 封装接入 i18n

### Added - God Class 拆分与代码质量（P4）

#### God Class 拆分
- `RealRecommendationService`（434 行）→ `RecommendationStrategy`（434）+ `UserPreferenceCalculator`（164）+ `RecommendationCacheManager`（93）+ `RecommendationRanker`（312）+ `RecommendationService` 接口（110），主类 322 行
- `RealMatchService`（352 行）→ `MatchEngine`（230）+ `MatchPolicy`（133）+ `MatchRecorder`（332），主类 352 行
- `RealVillageService`（142 行）→ `VillagePostService`（94）+ `VillageInteractionService`（142）+ `VillageQueryService`（382）+ `VillageViewMapper`（137）
- `RealTempChatService`（134 行）→ `TempChatSessionService`（355）+ `TempChatMessageService`（176）+ `TempChatCleanupService`（183）+ `TempChatViewMapper`（189）
- `RealProfileService`（169 行）→ `ProfileQueryService`（355）+ `ProfileUpdateService`（385）+ `FollowService`（119）

#### 异常处理规范
- 移除 `catch(Exception)`/`catch(Throwable)` 76 处（替换为具体异常；AuditLogAspect 1 处合法保留）
- 移除 `e.printStackTrace`/`System.out.println`（0 处）
- 业务异常自定义类完整定义（BusinessException + 8 个子类）
- SLF4J 参数化日志

#### Lombok 与时间 API
- Entity `@Data` → `@Getter/@Setter`（grep 验证 entity 包下 @Data 0 处）
- `java.util.Date`/`Timestamp` → `java.time`（业务代码全部使用 LocalDateTime/Instant；JwtTokenProvider 因 JJWT 0.12.x 库 API 强制要求保留 Date）
- `Optional.get()` → `orElseThrow`（36 处 .get() 调用全部前置 isPresent() 检查）

#### Repository 与日志
- 移除 nativeQuery 字符串拼接（nativeQuery=true 0 处）
- 添加 `@Transactional(readOnly=true)` 至纯查询方法
- 配置 `logback-spring.xml` 滚动策略与敏感字段脱敏（3 个 SizeAndTimeBasedRollingPolicy + access log + 脱敏）

### Added - 功能完整性补全（P5）

#### 推荐与匹配真实化
- `swipeRight` API 失败向上抛异常，移除 `Math.random() > 0.5` Mock
- `swipeLeft` 调用后端 API 上报跳过记录
- 实现真实推荐算法（基于用户偏好/标签/活跃度）
- `discover.ts` Mock 匹配概率 0.5 配置化并默认关闭

#### 分页与列表完整化
- `fetchMoreActivities` 维护 `currentPage` 状态
- 帖子列表分页加载失败保留已加载项
- `CampusController` 改用 Spring Data Pageable
- 列表图片添加 `lazy-load`

#### 后台任务与索引
- `@Scheduled` 定期清理过期临时聊天会话
- 审批后同步更新 Elasticsearch 用户索引
- `AdminConfigController` 配置更新后广播刷新事件
- 统计查询使用汇总表/物化视图
- 敏感词导入异步化

#### 实时通信完善
- WebSocket 重连改为指数退避算法
- 未读消息计数实时更新（WebSocket 推送时）
- `wx.onNetworkStatusChange` 主动提示
- `onHide` 中使用 AbortController 取消请求

#### 交互体验补全
- 点赞/通知开关乐观更新
- 图片 `@error` 显示默认占位图
- `updateProfile` 成功后同步 session store
- `registerActivity` 成功后更新参与人数
- AI 视频请求设置超时

### Added - 基础设施与运维（P8）

#### 容器化与环境
- API `Dockerfile`（多阶段构建，Maven build → JRE runtime，eclipse-temurin:17-jre）
- Admin `Dockerfile`（多阶段，Node build → nginx 静态托管）
- `docker-compose.yml`（API/Admin/Client/MySQL 8/Redis 7/Prometheus/Grafana/Alertmanager/Node Exporter/db-backup，全部含 healthcheck 与 restart policy）
- `.dockerignore`（排除 node_modules/.git/target/dist/build）
- `.env.example` 完整变量列表（11+ 类）

#### 监控与日志
- Prometheus + Grafana + Alertmanager 部署（docker-compose 集成，`--profile monitoring` 启用）
- JVM/业务/错误率/慢查询/第三方可用性监控面板
- `logback-spring.xml` 滚动策略 + 敏感字段脱敏 + access log
- 告警规则（P99 > 2s / 错误率 > 1% / 磁盘 > 80% / 内存 > 85%）

#### 数据库与备份
- MySQL 定时备份脚本（mysqldump + gzip + 滚动保留 7 天 + `--dry-run`）
- 恢复演练文档 `docs/DR/restore-procedure.md`
- 表名/列名统一规范执行（snake_case，复数表名，避免缩写）
- ENGINE=InnoDB/CHARSET=utf8mb4/COLLATE=utf8mb4_unicode_ci 显式声明
- 关键索引补全（chat_messages/users/reports/discover_swipes/notifications）
- 30+ ALTER TABLE ADD COLUMN 添加 IF NOT EXISTS 守卫
- 移除重复表（统一为 `feedback_tickets`）

#### API 文档与 CI/CD
- springdoc-openapi 注解 + Swagger UI（`OpenApiConfig.java` 配置 JWT 鉴权，路径 `/swagger-ui.html`）
- CI/CD 统一发布流程文档 `docs/CI-CD.md`
- `DEPLOYMENT.md` JVM 参数语法修正
- `build-mp-weixin.bat` 改用 pnpm + 错误处理
- 配置 YAML 文件去重，敏感与普通配置分离

### Added - OpenAPI 注解与 Storybook（P9 Task 9.1）

#### OpenAPI/Swagger 注解
- 6 个核心 Controller 已完成全量 `@Operation/@ApiResponse/@Parameter` 注解补全（AuthController/WechatAuthController/MatchController/MediaUploadController/MediaAccessController/ProfileController）
- 注解补全指南 `docs/OPENAPI-ANNOTATION-GUIDE.md`
- 在线 Swagger UI：`/swagger-ui.html`
- OpenAPI JSON/YAML：`/v3/api-docs`、`/v3/api-docs.yaml`

#### Storybook 组件文档
- Storybook 配置 `.storybook/main.ts` + `.storybook/preview.ts`（Vue 3 + Vite + a11y addon）
- 7+ stories 文件覆盖 63+ 个组件：common.stories.ts（24）/chat.stories.ts（8）/home.stories.ts（8）/discover.stories.ts（5+）/login.stories.ts（5）/social.stories.ts（5）/layout.stories.ts（3）+ profile/setup/village/unlock-guide
- 每个 Story 包含 argTypes（控制面板）+ args（默认值）+ render 函数

### Security - 全阶段安全修复

- **P0**：移除 `/uploads/**` permitAll，强制走鉴权代理
- **P0**：JWT Token 主动撤销机制（Redis 黑名单）
- **P0**：所有写接口从 `SecurityUtils.getCurrentUserId()` 获取用户 ID，不信任请求体
- **P0**：移除硬编码密码，全部环境变量化
- **P2**：`MediaAccessService` 路径穿越防护（字符级 + 绝对路径双重校验）
- **P2**：`@PreAuthorize("hasRole('ADMIN')")` 11 个 Admin Controller 全覆盖
- **P2**：`AdminPermissionAspect` 切面二次校验
- **P2**：凭据脱敏（password/sessionToken `@JsonIgnore`）
- **P2**：MIME + magic bytes 双重校验，防止伪装文件上传

### Fixed - 关键 Bug 修复

- **P1**：聊天页面发送一条消息显示两条气泡（双 Store 同步问题）
- **P1**：硬编码 `session-${rawUserId}` 导致会话 ID 冲突
- **P1**：`@tap.stop` 在 mp-weixin 不生效，替换为 `catchtap`
- **P1**：`refresherTriggered` 状态错乱，下拉刷新卡死
- **P1**：`loadMoreData()` 重复请求，列表数据重复
- **P1**：`aspect-ratio` 在低版本微信基础库不支持，导致布局错乱
- **P1**：`backdrop-filter` 在 mp-weixin 不支持，导致自定义 tab-bar 透明背景失效
- **P1**：`100vh` 在小程序中包含导航栏高度，导致页面超出屏幕
- **P1**：Admin Feedback/Users 页面 Mock 数据残留，导致后台展示假数据
- **P1**：签到连续性判断使用客户端时间，可作弊
- **P1**：AI 视频 API Key 暴露在前端代码中
- **P2**：`RealMatchService.rewind()` 反悔次数无限制
- **P2**：`catch(Exception)` 76 处隐藏真实异常
- **P2**：N+1 查询导致推荐列表加载慢
- **P2**：远程调用在事务内，导致事务长时间持有连接
- **P4**：`@Data` 注解导致 Lombok 生成无用方法
- **P5**：`Math.random() > 0.5` Mock 匹配，导致用户体验失真
- **P5**：WebSocket 重连无指数退避，弱网下频繁重连耗电

---

## [0.9.0] - 2026-07-15

### Added - P3-P5 阶段性进展
- 设计系统 Token 三合一初步完成
- i18n 框架引入（客户端 + Admin + 后端）
- God Class 拆分计划制定

### Fixed
- 多个 WXSS 兼容性问题
- 聊天双倍渲染问题
- Admin 后台假数据残留

---

## [0.5.0] - 2026-06-20

### Added - 项目初始化
- Uni-app 客户端框架搭建
- Spring Boot 3 + Java 17 后端框架搭建
- 基础业务功能（登录/匹配/聊天/村落）
- Vue 3 + Pinia + TypeScript 客户端架构
- 14 个 Pinia store
- 50+ Controller 端点
- 65 张数据库表
- Mock + Real 双模式架构

---

## 维护规范

### 1. 更新时机

每次合并到 `main` 分支时，PR 作者必须在 `[Unreleased]` 节添加变更条目；发布版本时将 `[Unreleased]` 重命名为 `[version] - date` 并新建空的 `[Unreleased]`。

### 2. 条目格式

```
- **{阶段/模块}**：简明描述变更（PR #1234）
```

示例：
```
- **P9**：新增 API 契约文档（PR #5678）
- **P9 - 文档与发布**：完成 Storybook 组件文档（PR #5679）
```

### 3. 版本号策略

- **主版本号（MAJOR）**：不兼容的 API 变更（如 v1 → v2）
- **次版本号（MINOR）**：向后兼容的功能新增（如新增端点）
- **修订号（PATCH）**：向后兼容的 Bug 修复

### 4. 发布流程

详见 `docs/release-checklist.md` 与 `docs/CI-CD.md`。

### 5. 自动化校验

CI 中通过 `commitlint` 校验提交信息，自动归类到对应变更类型；通过 `release-please` 自动生成版本 PR。
