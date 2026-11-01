# 第六轮修复波 W1 后端车道（钱与状态机）

- 车道：W1（backend 钱与状态机）
- 基线 HEAD：`74e681ca32afba2d44d69ae0adf36ff279e6cb24`
- 环境：Java 17 / Spring Boot 3.3.1 / `apps\api`
- 验证口径：`cd apps/api && ./mvnw -o -B test -Dtest=<类>`；收口前跑全量
- 本机边界：无 Docker、无 Redis 握手；`campus_love` 为生产库严禁写入，应用账号无建库权限（影子库不可用）

## 发现清单（五条，严重度顺序）

| 编号 | 标题 | 严重度 | 状态 | 判点 |
|---|---|---|---|---|
| C6 | 微信外呼仍在事务内 | 中高 | 已闭合 | 静态门 TransactionalHttpCallStaticGateTest（全仓 @Transactional 体内禁 HTTP 外呼）；反向变异红→还原复绿 |
| C1 | 非钱轨幂等缺口（举报唯一键 / 官方号成对行） | 中高 | 已闭合 | 举报 pending_dedup_key 唯一键迁移 + 官方号 @Idempotent；反向变异已跑 |
| C7 | 业务拒绝塌成 500（IllegalStateException 缺 handler） | 中 | 部分闭合 | 409 修正 + DEMO_RECHARGE 迁移语义异常 + 三桶分类；反向变异已跑（见变异台账） |
| C2 | 社交进度计数器读改写 + 空 catch 吞乐观锁 | 中 | 已闭合 | 六原子 increment + CASE 单调升层 + 埋点空 catch 补日志；反向变异已跑 |
| C3 | 状态机不闭合（feedback 终态回退 / 心动信号零守卫） | 中 | 已闭合 | StateMachines 一处定义两表 + 非法迁移各用例 + 接线静态门；反向变异待收口 |

## C6 微信外呼仍在事务内
状态：已闭合。

- 现象一句：`WeChatPushService` 三个方法带 `@Transactional`，方法体是一次打到微信订阅消息接口的 HTTP 外呼，而该类无 Repository/EntityManager，全程不写库——白白占着连接池（池 20）等一个 3s+ 外部调用，并发下把连接抽干。上一轮 S2-1 只剪了调用方 `NotificationConsumer` 的注解，跨 bean 这层没动。
- 判定：读源码确认三个 `@Transactional` 方法体内无任何写库（只有 `getAccessToken`/`sendSubscribeMessage` 里的 `restClient.get()` / `restClient.post()`），字段只有 `WeChatConfig`+`RestClient` ⇒ 属「完全没有写库」分支 ⇒ 撤 `@Transactional`（而非 NOT_SUPPORTED 包裹）。
- 改动：
  - `apps\api\src\main\java\com\campuslove\api\growth\WeChatPushService.java`：删除 `import ...transaction.annotation.Transactional`（原 `:18`）；撤除 `sendSubscribeMessage`（原 `:183`）、`sendSocialDigestPush`（原 `:275`）、`sendRecommendRefreshPush`（原 `:299`）三处方法级 `@Transactional`，各补一条 C6 说明注释（外呼、不写库、连接池风险）。
  - 新增静态门：`apps\api\src\test\java\com\campuslove\api\growth\TransactionalHttpCallStaticGateTest.java`——扫 `src/main/java` 下每个 `@Transactional`（方法级与类级）体，命中 `restClient./webClient./restTemplate./.retrieve()/.exchange(/HttpURLConnection/HttpClient.newHttpClient(/java.net.http.` 即红；匹配前先逐字符清空块/行注释、字符串/字符字面量（含文本块），保留换行维持行号。附带 3 条合成反证（能咬住 @Transactional+外呼、不误伤无注解方法/注释/字面量/`catch(HttpClientErrorException)` 异常类型名、类级 @Transactional）。扫描根口径下限 200 个 .java（防「扫描面空」被当「全部通过」）。
- 判点与反向变异红原文：把 `@Transactional` 加回 `sendSubscribeMessage`（连同 import）后
  `[ERROR] Tests run: 4, Failures: 1 ...  noTransactionalMethodBodyContainsHttpCall`
  红原文（中文是 maven stdout GBK 乱码，只认 ASCII 定位）：
  `com/campuslove/api/growth/WeChatPushService.java#sendSubscribeMessage (第 211 行, 命中 restClient.) ==> expected: <[]> but was: <[...#sendSubscribeMessage ... 命中 restClient.]>`
  还原变异后复绿：`Tests run: 4, Failures: 0, Errors: 0`。
- 实测读数：还原前后 `WeChatPushService.java` sha256 均为 `fb80a404e4cf08ef67d56a18a8ad669e217b3a7df30ac6c9215c139b963e6558`（字节一致）。门单跑 BUILD SUCCESS。
- 判不出/交接：真并发把连接抽干需要 Docker+Redis+真库压测，本机不可复现；门只证「形态不变量·全仓」，真事务边界由既有 `NotificationPushTransactionBoundaryTest`（运行期）守。


## C7 业务拒绝塌成 500
状态：部分闭合（钱轨已闭；跨域业务拒绝留交接）。

- 现象一句：`GlobalExceptionHandler` 有 19 个 `@ExceptionHandler`（含 IllegalArgumentException/InsufficientBalanceException/ContentSecurityException 等），但没有 `IllegalStateException`——而全仓 45 个文件抛出它。真正用户可触发的业务拒绝因此塌成 500；且余额不足后端返 400、客户端与测试注释按 409 处理，客户端 409 分支恒不命中、落到弹后端原文的兜底。
- 意图分类（97 处 `throw new IllegalStateException` / 45 文件，逐条按消息读）：
  - A 装配/启动期 fail-fast（不该到 handler，抛出即启动失败或 500 正确）：CampusLoveApplication 2、JwtConfig 3、DatabaseConfigValidator 4、RedisConfig 1、WebSocketConfig 1、WxPayBootstrapChecker 3、RateLimitTopologyGuard 1、AiVideoConfig 1、MockSecurityConfig 1、AdminPasswordValidator 3、AdminOpenidValidator 1、AdminCredentialAudit 1、PiiKeyReference 2、privacy/PersonalDataTables 7（清单结构不变量，加载期抛）、RealAccountSecurityService:105（缺装配）。
  - B 加密/签名/IO 编程错误（真 bug，正确保持 500，若转 4xx 会伪装成用户错误）：AesEncryptor 4、PhoneColumnCodec 1、MediaUrlSigner 3、WxPayRequestSigner 2、WxPayCallbackVerifier 5、SHA256_UNAVAILABLE 系（ThirdPartyAuthService:482 / RealAccountSecurityService:341 / RealAuthService:1203）、WeChatClient:88、VoiceMessageService:157、LocalMediaStorageService 7、OnlineUserService:284、AdminVipController:161、AdminProfileConfigController:81、RealCircleService:840/892、RealCheckInService:445、RealPushSummaryService:191、PrivacyFieldFilter:177/204、profile/PersonalDataService:855。
  - C 用户可触发的业务拒绝（应 4xx，是 C7 要治的）：本车道钱轨命中 **WalletController:258 DEMO_RECHARGE_DISABLED**（同类 :269 累计上限分支已用 OperationForbiddenException，唯它塌 500）。跨域命中（归其它车道/下轮）：RealAuthService:981 ADMIN_LOGIN_NOT_ENABLED、feedback/RealFeedbackService:261/267（提案已转化，属状态机→并入 C3）、mock 认证服务 _PENDING/_ALREADY_DONE 7、BillingService:123/142（措辞「服务不可用请稍后重试」，语义更近 503）、PhoneBindingController 6（上游微信依赖失败，5xx 合理）。
  - 决策：不新增「一刀切 ISE→400」handler（会把 B 类真 bug 伪装成用户错误）。A/B 保持既有 `handleGenericException(Exception)`（500，且已 `log.error(...traceId, ex)` 补日志，满足「不变量破坏保持 500 并补日志」）；C 类按站点改抛既有语义异常。
- 改动：
  - `apps\api\src\main\java\com\campuslove\api\wallet\WalletController.java:258`：`IllegalStateException` → `OperationForbiddenException`（403），并补 C7 注释。
  - `apps\api\src\main\java\com\campuslove\api\config\GlobalExceptionHandler.java`：`handleInsufficientBalance` 400→409（error "Conflict"），`resolveMappedStatus` 把 InsufficientBalanceException 从 400 组迁到 409 组；javadoc 补 C7 说明。
  - docstring 同步：`WalletController.java:410`、`vip/BillingService.java:98` 的「400 INSUFFICIENT_BALANCE」改为 409。
  - 判点文件：`apps\api\src\test\java\com\campuslove\api\config\GlobalExceptionHandlerTest.java`（新增 2 例）、`apps\api\src\test\java\com\campuslove\api\wallet\WalletControllerTest.java:173`（断言夹具随新不变量迁移 ISE→OperationForbiddenException）。
- 判点与反向变异：
  - `handleInsufficientBalance_returns409` + `resolveMappedStatus_c7SplitsBusinessRejectFromInvariantBreak`（断言余额不足 409、业务拒绝 403、ISE 仍 500）+ `recharge_demoDisabled_shouldThrow`（断言抛 403 语义异常）。
  - 反向变异在收口前串行执行并记 sha256（见「接线三件套」前的变异台账）。当前读数：`Tests run: 14, Failures: 0`（GlobalExceptionHandlerTest 6 + WalletControllerTest 8）。
- 判不出/交接：
  - 客户端那一半（交接项）：`apps\client\src\services\api.ts`、`components/discover/{CardDetailOverlay,CardSwiper}.vue` 已有 `status===409 → 余额不足` 分支，后端改 409 后该分支由恒不命中转为生效；请客户端侧车道复验该分支渲染「余额不足」文案、确认不与「弹后端原文」兜底重复弹 toast（禁改客户端，故只登记）。
  - C 类跨域业务拒绝（auth ADMIN_LOGIN_NOT_ENABLED、mock 认证 _PENDING/_ALREADY_DONE、BillingService 服务不可用→503）建议各域车道按本条尺子迁移到语义异常，不在本车道越界改。


## C2 社交进度计数器
状态：已闭合。

- 现象一句：`RealSocialProgressService` 六层漏斗计数（exposure/like/match/chat/circle/activity）都是「读实体字段 + 加 + 写回 + save」，并发互相覆盖丢增量；实体带 `@Version`，冲突抛 ObjectOptimisticLockingFailureException，却唯一调用方 `RecommendationCacheManager`（曝光埋点）的两处 `catch (RuntimeException e)` 空体（注释写「仅记录日志」实则无日志）静默吞掉。
- 改动：
  - `apps\api\src\main\java\com\campuslove\api\repository\SocialProgressRepository.java`：新增 6 个 `@Modifying(flushAutomatically=true, clearAutomatically=true)` 原子自增方法（`incrementExposureCount/incrementLikeCount/incrementMatchCount/incrementChatCount/incrementCircleCount/incrementActivityCount`），JPQL 形如 `s.likeCount = s.likeCount + 1`；like/match/chat/circle/activity 同一条 UPDATE 内用 CASE 依据「被自增列取新值、其余列取现值」单调重算 `current_tier`（层级只升不降，与原 determineTier 等价）；bulk UPDATE 绕过 `@Version`，该路径不再有乐观锁丢更新。口径对齐本仓既有 `CircleTopicRepository.incrementLikeCount`。
  - `apps\api\src\main\java\com\campuslove\api\growth\RealSocialProgressService.java`：6 个 recordXxx 去掉读改写，改为 `getOrCreateProgress(userId)`（仅保证行存在）+ 调对应原子 increment；删除因此不再被引用的私有 `evaluateAndUpgradeTier`/`determineTier`；补 C2 注释。recordExposure 保留 REQUIRES_NEW（只读事务懒创建修复不变）。
  - `apps\api\src\main\java\com\campuslove\api\discover\RecommendationCacheManager.java`：加 slf4j `Logger`；两处曝光埋点 `catch (RuntimeException e)` 由空体改为 `log.warn(...)`（埋点失败不阻断推荐返回，但真的记日志）。metrics 的 `catch (RuntimeException ignore)` 三处非本发现所指、且涉他车道文件，未动。
- 判点文件：`apps\api\src\test\java\com\campuslove\api\growth\SocialProgressCounterAtomicityTest.java`（4 例）：
  - 结构命题：service 源码不得再出现 6 种 `getXxxCount() + 1`；且必须委托到 6 个原子方法。
  - SQL 形态：反射 `SocialProgressRepository`，断言 6 个 increment 方法带 `@Modifying` 且 JPQL 匹配 `x = x + 1` + `UPDATE SocialProgress`（无真库，证到 SQL 形态）。
  - 委托行为：mock 仓库驱动 `recordLike(42L)`，`verify(incrementLikeCount)` + `verify(save, never())`（并发不丢增量的可证形态）。
  - 空 catch 消灭：`RecommendationCacheManager` 的 `catch (RuntimeException e)`（两处埋点）块体去注释后不得为空。
- 实测读数：单跑 `Tests run: 4, Failures: 0`。反向变异在收口前串行做（见变异台账）。
- 判不出/交接：真并发丢增量需真库（本机不可复现），判点只到「SQL 形态 + 委托形态 + 空 catch 消灭」；JPQL bulk UPDATE 的 `@Version` 不自增是有意的原子口径（与既有 increment 一致），如需保留版本审计另议。


## C3 状态机不闭合
状态：已闭合。

- 现象一句：(a) feedback 工单终态 `CONVERTED` 可被 `replyFeedback` 无条件改回 `REVIEWED`，回退后再 `convertProposal` 会重复创建 Activity；(b) 心动信号 `acceptHeartSignal/declineHeartSignal`（`MatchRecorder`）零迁移守卫，`expired` 可被复活成 `accepted`——而同一个 `status==accepted` 谓词在 `chat/TempChatSessionService:551` 却有守卫，两处口径不一致本身即证据。
- 既有先例：`vip/VipOrderService.ALLOWED_TRANSITIONS` + `applyTransition`「迁移唯一入口，非法迁移拒绝」。照此写法，但拒绝异常用既有语义 `ResourceConflictException`（409，走 BusinessException handler）而非 `IllegalStateException`（后者塌 500，正是 C7 的病）。
- 改动：
  - 新增一处共用定义 `apps\api\src\main\java\com\campuslove\api\common\StateMachines.java`：两张合法迁移表集中一处——feedback（CONVERTED 为终态、无出边）与心动信号（pending 唯一可 accept/decline/expired，accepted/declined/expired 为终态）。`assertFeedbackTransitionAllowed` / `assertHeartSignalTransitionAllowed` 非法迁移抛 409。
  - `feedback/RealFeedbackService.replyFeedback`：校区校验后、setStatus 前加 `assertFeedbackTransitionAllowed(status, REVIEWED)`（CONVERTED→REVIEWED 被拒）。
  - `feedback/RealFeedbackService.convertProposal`：把原 `if(status==CONVERTED) throw IllegalStateException` 改走同一 `assertFeedbackTransitionAllowed(status, CONVERTED)`（共用表，且 409 不再塌 500）。
  - `match/MatchRecorder.acceptHeartSignal/declineHeartSignal`：setStatus 前各加 `assertHeartSignalTransitionAllowed(status, accepted/declined)`（expired/accepted/declined 起点一律 409，杜绝复活与重复迁移）。
- 判点文件：`apps\api\src\test\java\com\campuslove\api\feedback\StateTransitionGuardTest.java`（7 例）：
  - feedback 非法迁移（CONVERTED→REVIEWED/PROCESSING 抛 409）+ 合法正控（SUBMITTED→REVIEWED/CONVERTED）；
  - 接线行为：mock 仓库下 `replyFeedback(CONVERTED)` 抛 409 且不落库；`convertProposal(已CONVERTED)` 抛 409（重复活动防线）；
  - 心动信号：expired/accepted/declined 作起点的 accept/decline 交叉迁移抛 409；pending→accepted/declined/expired 正控通过；
  - 接线静态门（CRLF 稳健的括号配平）：`MatchRecorder.accept/decline` 源码体内确调用迁移守卫（防「表定义了但没接线」的假绿）。
- 实测读数：单跑 `Tests run: 7, Failures: 0`；同批 `RealFeedbackCampusScopeTest` 13/0、`FeedbackControllerTest` 6/0、`MatchControllerTest` 7/0 无回归。反向变异在收口前串行做（见变异台账）。
- 判不出/交接：并发下的状态竞态需真库；判点覆盖到「迁移表逻辑 + 写点接线 + 服务级拒绝行为」三层。VipOrderService 的 `IllegalOrderStateException extends IllegalStateException` 同样塌 500，属钱轨另一入口，若需迁 409 归 W1b/下轮。


## C1 非钱轨幂等缺口
状态：已闭合（判据按业务唯一键，非注解覆盖率）。

- 前提纠正：`apps\client\src\services\http.ts:314-342` 自述「双击=两次逻辑操作=两次都放行」，`@Idempotent` 结构上不防双击 ⇒ 判据应是业务唯一键。据此，非 admin 写端点两侧皆缺的真账两条：(a) 举报无唯一键⇒同人同目标重复立案；(b) 官方号私信每次写 2 行⇒网络重试成对重复。
- (a) 举报唯一键（服务端派生业务键）：
  - 现状与去重风险：`entity\Report.java`（reports 表，`V2026.06.26.0001__create_reports.sql`）status 为 VARCHAR('PENDING/HANDLED/REJECTED')，reporter_id BIGINT UNSIGNED，无任何唯一键。本机无库、应用账号对 campus_love 无写权限 ⇒ 不查现网数据；迁移采用「先去重再加约束」写法，避免唯一键因存量重复 PENDING 行创建失败。
  - 设计：新增可空列 `pending_dedup_key`，建单时派生 `reporterId:targetType:targetId`，加唯一键 `uk_reports_pending_dedup`。MySQL 唯一键允许多 NULL ⇒ 只约束「活跃(PENDING)」同人同目标一条；结案时置 NULL（保留历史 + 允许日后再次举报）。避免用 `UNIQUE(reporter,target)` 那种「永久禁止再举报」的过严键。
  - 改动：`entity\Report.java` 加 `pendingDedupKey` 列 + 访问器；`report\ReportController.createReport` 派生去重键（重复 PENDING 命中唯一键 ⇒ DataIntegrityViolationException → 409，既有 handler 映射）；`admin\AdminReportController.handle`（`:189-195` 附近）结案置 `setPendingDedupKey(null)`；新增迁移 `database\flyway\sql\V2026.11.01.0001__add_reports_pending_dedup_unique.sql`（照 `V2026.10.13.0002` 补列幂等写法 + `V2026.10.05.0011` 去重再 `information_schema.STATISTICS`+`PREPARE` 加唯一键，四段：补列/回填/去重/加唯一）。
- (b) 官方号私信成对行：`official\OfficialChatService.sendUserMessage` 一次写用户+助手两行；`official\OfficialAccountController.sendMessage`（`POST /{code}/messages`）缺 `@Idempotent` ⇒ 网络重试（http.ts 复用同一 Idempotency-Key）把成对行再写一遍。修法：给端点加 `@Idempotent`（`IdempotentInterceptor` 同键拦 409，不再重复落库）。诚实注明：这治「重试成对行」；用户真的连点两次是两把不同键=两条合法消息（口径同 http.ts），不在本注解职责内。
- 判点文件：`apps\api\src\test\java\com\campuslove\api\report\ReportPendingDedupAndChatIdempotencyTest.java`（5 例）：实体访问器反射；createReport 派生键 = `1:POST:42`（ArgumentCaptor，mock 仓库+mockStatic SecurityUtils）；迁移内容门（补列/回填/HAVING 去重/ADD UNIQUE/PREPARE 五关键字齐全）；sendMessage 带 @Idempotent 反射；createReport 带 @Idempotent 对照。
- 实测读数：单跑 `Tests run: 5, Failures: 0`；同批 `ReportControllerTest` 3/0 无回归。反向变异待收口（见变异台账）。
- 判不出/交接：
  - 唯一键落库后的并发拒绝需真库复现（本机不可），判点到 SQL 形态+派生逻辑+端点注解。
  - `VipOrderService` 订单去重、以及 `entity` 无 @Table 唯一约束注解（靠迁移+应用层）；若后续 Hibernate 改 `ddl-auto=update/create` 需把 `pending_dedup_key` 唯一约束同步进实体 `@Table.uniqueConstraints`（当前 real profile 为 validate，迁移是真相源）。
  - 迁移版本 `V2026.11.01.0001` 排在链尾（现最大 `V2026.10.31.0004`），无 out-of-order pending 问题；已应用 `2026.10.14+` 存量库正常前滚执行本文件。


## 接线三件套
- 无新增 maven/npm 测试挂点需要登记：五条判点均为 JUnit，`apps/api` 既有 `api:test` / CI `api-test` job 已跑全量并覆盖；`mvnw -o -B test` 是既有唯一入口。
- 无新增根 package.json 脚本：举报去重键走 `database/flyway/sql/` 自动扫描，无需登记；文件 `V2026.11.01.0001__add_reports_pending_dedup_unique.sql`（排在链尾 `V2026.10.31.0004` 之后，无 out-of-order pending）。
- 无新增 `.gitignore` / `README.md` / `.github/workflows/ci.yml` 改动需求（本车道禁止改这些共享载体；主控若要把本报告登记进 `round6-LEDGER.md` 或 `issue-matrix.md`，按既有格式追加即可）。
- 客户端那一半交接项（不由本车道改）：`apps/client/src/services/api.ts` 与 `components/discover/{CardDetailOverlay,CardSwiper}.vue` 已有 `status===409 → 余额不足` 分支；后端把 `InsufficientBalanceException` 从 400 迁到 409 后该分支由恒不命中转为生效。请客户端车道复验：分支命中的文案渲染、`error-toast.ts` 不重复弹后端原文兜底 toast；`http.ts` 幂等拦截器（`:314-342`）在「一次逻辑调用」外若被拆包，仍要显式禁止把键生成下沉到重试循环。

## 变异台账（反向变异：改坏⇒红⇒还原⇒sha256 一致⇒复绿）

| # | 载体（文本锚，不给行号） | 变异 | 变红判点 | 红原文（关键片段） | 还原后 sha256（对齐基线） |
|---|---|---|---|---|---|
| C6 | `WeChatPushService.java` 「`public boolean sendSubscribeMessage(...)`」 | 加回 `@Transactional` + import | `TransactionalHttpCallStaticGateTest.noTransactionalMethodBodyContainsHttpCall` | `com/campuslove/api/growth/WeChatPushService.java#sendSubscribeMessage (第 211 行, 命中 restClient.) expected:<[]> but was:<[...]>` | `fb80a404e4cf08ef67d56a18a8ad669e217b3a7df30ac6c9215c139b963e6558` |
| C7 | `GlobalExceptionHandler.java` 「`handleInsufficientBalance`」 | body.put("status") `CONFLICT`→`BAD_REQUEST` | `GlobalExceptionHandlerTest.handleInsufficientBalance_returns409` | `expected: <409> but was: <400>` | `2aa8fef4b76e5c5dbbf4bae0c39bebb87b46169942395d58742a74123332434f` |
| C2 | `SocialProgressRepository.java` 「`incrementLikeCount`」 | JPQL `likeCount = likeCount + 1` → `likeCount = 1` | `SocialProgressCounterAtomicityTest.repositoryIncrementsAreAtomicModifying` | `incrementLikeCount 的 JPQL 不是原子自增形态 (x = x + 1)` | `3bb55ee7780a0f57435cd1cb2b28e8cecba795de537c29beedba3e7c01c1ef97` |
| C3 | `StateMachines.java` 「`FEEDBACK_TRANSITIONS` 终态 CONVERTED」 | `Set.of()` → `Set.of(REVIEWED)` | `StateTransitionGuardTest.convertedTicketIsTerminal` + `replyOnConvertedTicketIsRejectedAtService` | 前者 `Expected ResourceConflictException to be thrown, but nothing was thrown`；后者 `expected:<ResourceConflictException> but was:<NullPointerException>`（CONVERTED→REVIEWED 被允许后走到未 stub 的 save） | `6575a7821c09a2c864a609a88ea3be542af8b136d58737cbda3e9c98f631c15e` |
| C1 | `OfficialAccountController.java` 「`sendMessage`」 | 删除 `@Idempotent` | `ReportPendingDedupAndChatIdempotencyTest.officialChatSendEndpointIsIdempotent` | `官方号私信发送缺 @Idempotent ⇒ 网络重试复用同键却把成对行(用户+助手)再写一遍` | `e30f3f186eecc6782f34541bfb8343c2b0471715f3473277e9552fa3a7a4d350` |

- 串行执行说明：变异与还原均在收口前串行做（同一构建目录只此一条 maven 属主，W1b 门未占）。
- 全量读数（还原后）：`./mvnw -o -B test` = `Tests run: 1819, Failures: 0, Errors: 0, Skipped: 10`（10 是既有环境相关 skip，本车道未新增 skip）。BUILD SUCCESS，Total time ≈ 1:54 min。

## 遗留债
- 跨域 C 类业务拒绝（未由本车道越界改）：
  - `auth/RealAuthService` 「ADMIN_LOGIN_NOT_ENABLED」（ISE 应 403，非钱轨，归 auth 车道）；
  - `mock/MockCampusCertificationService|MockLoveVerificationService|MockRealNameCertificationService` 的 `_PENDING / _ALREADY_DONE` 系（ISE 应 4xx，mock profile，非钱轨）；
  - `vip/BillingService` 「优惠码/钱包服务不可用」（措辞更像 503 临时故障，需要产品裁是否降级为业务拒绝）；
  - `auth/PhoneBindingController` 6 处「微信 access_token/手机号失败」（上游依赖，5xx 合理）。
  - 尺子：与 C7 相同——按意图分流，业务拒绝迁语义异常（`OperationForbiddenException` / `InvalidOperationException` / `ResourceConflictException`），A/B 类保持既有 500（`handleGenericException` 已 `log.error(...,traceId, ex)` 记录）。
- 钱轨另一入口：`vip/VipOrderService.IllegalOrderStateException extends IllegalStateException`——非法订单迁移本应 409，现也塌 500。属 W1b 或下轮。
- 举报唯一键在实体侧仅通过 `@Column` 映射，未加 `@Table.uniqueConstraints`；`application-real.yml` 的 `ddl-auto=validate` 不校验唯一约束存在性，迁移是唯一真相源。若将来切 `update/create`，需把 `pending_dedup_key` 唯一约束同步进实体注解，否则实体-DDL 会漂移。
- 社交进度原子化后 bulk JPQL `UPDATE` 绕过 `@Version`——该路径不再触发乐观锁冲突（本发现所需），但如需保留版本审计（如管理端强制刷新），需在应用层显式 bump。这是原子口径既有取舍，与 `CircleTopicRepository.incrementLikeCount` 一致。
- `RecommendationCacheManager` 三处 `catch (RuntimeException ignore)`（matchMetrics 监控）仍是「注释说忽略、无日志」形态。非本发现所指（不涉 @Version 埋点），未一并动，避免与 W1b 在同文件撞车；若下轮统一治理请一并。
- `apps/client` 侧「余额不足 409」分支复验（详见「接线三件套」）：客户端车道跑一次真实点击链路，确保 409 命中的 toast 不与 `error-toast.ts` 兜底重复。
