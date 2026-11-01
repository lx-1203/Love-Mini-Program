# 第六轮审查 · B 车道 · 授权（垂直档位 + 水平归属）

- 仓库：`D:\6\恋爱小程序`
- HEAD：`74e681ca`
- 车道：B（授权轴：垂直档位 + 水平归属）
- 范围：`apps/api/src/main/java/com/campuslove/api`，111 个 controller
- 方法：静态走查（`@PathVariable`/`id` 入参 → service → 归属比对）+ 读既有测试；不跑 maven（另一车道独占）；只读，未修改任何仓库文件
- 交付纪律：先建骨架，每证完一条立刻追加

## 结论摘要

- 发现 9 条，其中**新缺陷 2 条**（B6-01 高、B6-07 中）、**记账型缺口 2 条**（B6-03 子项、B6-04 对账不对称，均中低/中）、**阴性账 4 条**（B6-02、B6-05、B6-06、B6-08——读到的原文证明这四处本就没有洞，或洞已在既往批次闭合）、**建议 1 条**（B6-09 三扇门）。
- 最严重的一条：`GET /api/v1/location/nearby`（B6-01）是全仓 112 个 `@PathVariable`/参数化端点里**唯一一个「读集合却不取任何主体」**的端点——任意登录用户传任意坐标即可批量取出他人 `userId + 昵称 + 校区 + 距离`，可二分收敛到约 1 公里级定位。其余水平归属面（私信、临时会话、匹配、访客、破冰、钱包、语音、帖子删除、草稿、悄悄话、订单、工单）全部读到归属比对原文。
- 判不出 7 项，集中在三类外部前提：库内数据分布（填充率/角色授予数）、部署 env 开关（模拟认证闸、回调 IP 白名单、媒体令牌严格模式）、反代 header 语义。详见末节。

## 盘面复量（写入前自测，口径为本仓实测）

| 量 | 本车道复量值 | 口径 |
|---|---|---|
| `*Controller.java` 文件数 | 109 | `glob **/*Controller.java`（派单给 111，差 2；口径为文件名后缀，接口/内部类不计） |
| `@PreAuthorize` 出现次数 | 278 | `grep -rn "@PreAuthorize"` 含非 controller（`admin/auth/AdminPermissionAspect.java` 4 处、注解定义文件） |
| 无任何 `@PreAuthorize` 的 controller 文件 | 23 | 同上口径 |
| 其中含写映射（POST/PUT/DELETE/PATCH） | 13 | 派单写 12 并列出 13 个名字，与实测一致：`auth\AuthController`(8 写)、`auth\PhoneBindingController`(1)、`auth\SmsCodeController`(1)、`auth\WechatAuthController`(1)、`config\ContentFilterController`(1)、`debug\ErrorSimulationController`(1)、`debug\MatchDebugController`(1)、`draft\DraftController`(2)、`home\HomeController`(1)、`location\LocationController`(1)、`media\MediaAccessController`(1)、`report\ErrorReportController`(1)、`wxpay\WxPayRefundNotifyController`(1) |
| 带 `@PathVariable` 的端点 | 112 | 逐文件正则扫描；`@PathVariable` 字面出现 202 次 |
| 已声明 `@Profile` 的 controller | mock 档：`debug\ErrorSimulationController`、`debug\MatchDebugController`、`profile\MockProfileController`、`chat\MockMessageDashboardController`；real 档：`media\MediaAccessController`、`report\ErrorReportController`、`report\ReportController`、`campus\CampusController`、`vip\*`、`chat\VoiceMessageController`、`chat\VideoCallController`、`ai\AiVideoController`、`clientconfig\ClientDbConfigController`、`profile\ProfileConfigController`、`village\PostReportController` | 见逐条证据 |

> 扫描器口径警告（重要，会影响后续任何自动门的设计）：`@PreAuthorize` 在本仓既可写在
> `@DeleteMapping` 之前也可写在之后（例：`chat\VoiceMessageController.java:104` 映射行在前、
> `105` 注解在后）。任何只向「上」找注解的静态判点都会把它误报成「无档位注解」。
> 判点必须按「映射行与方法签名之间的注解区」取，而不是固定 lookbehind。

## 发现

### B6-01 `/api/v1/location/nearby` 无主体绑定：任意登录用户可用任意坐标扫全图，取出他人 userId+校区+距离
- 状态：已证
- 现象：`GET /api/v1/location/nearby?lat=&lng=&radiusKm=` 的经纬度完全来自请求参数，服务端既不校验「参数坐标是否等于调用者自己上报的坐标」，也不把调用者 userId 参与查询条件，返回结果里含 `userId`。这是「按 body/query id 操作单资源/集合却无主体=资源归属者比对」的水平授权缺口，属于本车道判据 1 的阳性。
- 证据（文件+行+读到的原文）：
  - `D:\6\恋爱小程序\apps\api\src\main\java\com\campuslove\api\location\LocationController.java:73-85`
    ```java
    @GetMapping("/nearby")
    @RateLimit(capacity = 30, refillTokens = 1, key = "#clientIp")
    public ApiResponse<List<GeoService.NearbyPerson>> getNearby(
            @RequestParam BigDecimal lat,
            @RequestParam BigDecimal lng,
            @RequestParam(defaultValue = "5") int radiusKm,
            HttpServletRequest request) {
        if (geoService == null) { return ApiResponse.ok(List.of()); }
        List<GeoService.NearbyPerson> people = geoService.findNearby(lat, lng, radiusKm, 50);
    ```
    全方法内**没有一次** `SecurityUtils.getCurrentUserId()` 调用（同文件 `reportLocation` 第 48 行有，形成鲜明对照）。类上无 `@PreAuthorize`，`/api/v1/**` 只要求 `authenticated()`。
  - `D:\6\恋爱小程序\apps\api\src\main\java\com\campuslove\api\location\GeoService.java:77-107`
    ```java
    public List<NearbyPerson> findNearby(BigDecimal lat, BigDecimal lng, int radiusKm, int maxResults) {
        double radius = Math.min(Math.max(radiusKm, 1), 20);
        ...
        List<User> candidates = userRepository.findByLatitudeBetweenAndLongitudeBetween(
                minLat, maxLat, minLng, maxLng);
    ```
    签名里**没有 userId 形参**，查询条件里没有任何「可见性/授权/同意」维度（无 `isNearbyVisible`、无 `locationSharing`、无 exclude 调用者），返回体
    `GeoService.java:145-151` `record NearbyPerson(Long userId, String nickname, String avatarUrl, String campusName, String distanceText)`。
  - `reportLocation` 写入侧同样没有同意开关：`GeoService.java:50-65` 直接 `user.setLatitude(...)`，唯一节流是 IP 维度的 `@RateLimit`。
- 「另一个 userId 能不能读到」的推导链：攻击者注册一个账号（只需 `ROLE_USER`）→ 调 `GET /nearby?lat=30.5&lng=114.4&radiusKm=20` 拿到该圆心 50 个真人 userId 与取整距离 → 以 20km 步长铺网格即可枚举全国任意上报过坐标的用户；要定位某个已知 userId，只需围绕候选圆心二分，用 `distanceText` 的整公里环带求交，收敛到 ~1km 级；`formatDistance` 的模糊化（`GeoService.java:126-129`）只降分辨率，不构成授权边界。
- 影响：恋爱/交友产品里的位置泄露是可直接转化为线下跟踪的危害面；同时构成「精确到人」的批量 PII 导出通道（userId+昵称+校区+距离），且没有任何业务日志说明调用者与结果集的关系。与 `MediaAccessController`（按 JWT userId 校验文件归属）、`PrivateMessageController`（参与者校验）相比，这条是唯一一个「坐标维度」完全无主体的读面。
- 严重度：高（水平授权缺失 + 敏感 PII + 物理安全后果）
- 建议修法（三选一，可叠加）：
  1. `findNearby` 增加 `Long requesterUserId` 形参，圆心强制取调用者自己上报的 `user.latitude/longitude`，请求参数最多允许 ±5km 的抖动（防「假坐标」）；
  2. 保留参数坐标，但服务端校验 `haversine(参数坐标, 调用者已上报坐标) <= radius`，超界 403；
  3. 结果加「可见性同意」维度：仅返回显式开启附近可见的用户，并在 `users` 表加可空标记列，由 `@PreAuthorize("hasRole('USER')")` 之外的业务闸把关。
  另：`nearby` 与 `report` 都缺 `@PreAuthorize("hasRole('USER')")`，兄弟端点（`whisper`、`temp-chat`、`messages`）都有，建议补齐口径。
- 判不出：无法静态判定线上 `users.latitude/longitude` 的非空填充率（禁跑 maven、不连库）。若填充率极低，危害面从「全量」降为「已上报子集」，但缺口性质不变。

### B6-02 已验证为「有防护」的水平归属面（判据 1 的阴性账，供后续门复用为阳性对照）
- 状态：已证
- 说明：本条不是缺陷，是把「穷尽」做实——下列每一处都读到归属比对原文，后续任何「补 IDOR 门」的判点都应先把这些当**阳性对照**钉住，否则门会在已闭合处误报。
- 证据（原文要点）：
  - `chat\RealPrivateMessageService.java` 每个会话操作先 `conversationRepository.findById(...)` 再判 `throw new IllegalArgumentException("User is not a participant of this conversation")`：行 286（sendMessage）、408（getMessages）、457（markAsRead）、481（markUnread）、507（pinConversation）、535（setConversationMuted）、568（deleteConversation）；`softDeleteMessage` 行 592-604 校验 `message.getSenderId().equals(userId)`，非属主统一 404 文案「消息不存在或无权操作」。
  - `chat\TempChatSessionService.java:367-390` `resolveSessionForCurrentUser` → `requireParticipant`，非参与者抛 `OperationForbiddenException("无权访问该会话")`；调用点 `getSession`(208)、`endSession`(220)、`pinSession`(250)、`unpinSession`(264)、`markSessionRead`(278)。`sendMessage`/`recallMessage`/`respondToContactExchange` 用 `resolveSession` + 显式 `sessionService.requireParticipant(...)`：`chat\TempChatMessageService.java:118-120`、`299-301`，`chat\TempChatCleanupService.java:364-366`。
  - WS 侧同样闭合：`chat\MessageWebSocketHandler.java:116`、`299` 的 `senderId` 取 `headerAccessor.getUser().getName()`（不取 payload），`170` 起用 `isTempChatPair(session, senderLong, recipientLong)` 校验双方关系，不匹配直接 return；`user == null` 时拒绝。
  - `village\VillageController.java:253-259` `deletePost` 传 `SecurityUtils.getCurrentUserId()` 进 service，契约注释明确 403「无权删除该帖子」且「作者校验在读之后、写之前」。
  - `chat\VoiceMessageService.java:200-236` 删除语音先 `relative.contains("..")` 拒绝，再 `toAbsolutePath().normalize()`，再以 normalize 后路径首段与 `ownerUserId` 比对，不等抛 `VOICE_DELETE_FORBIDDEN`（注释标明这是 R2-MEDIUM-01 修复，专治「首段校验可被 `../` 绕过」）。**注意**：同文件 `chat\VoiceMessageController.java:98-100` 的 Javadoc 仍写「当前实现不限制跨用户删除」，是过期注释，实现已限制（属文档债，不属授权债）。
  - `wallet\WalletController.java`：`/deduct`(452 起) 三重收紧——`CLIENT_DEDUCT_RELATED_TYPE_WHITELIST`(112) 拒客户端伪造管理语义、`resolveServerPrice` 服务端定价不信任客户端 `amountCents`、`deriveOrderId`(约 505) 强制幂等键含 userId；`/recharge`(249-280) 默认 `app.demo-recharge.enabled:false` 关闭 + 每日次数与累计金额双上限（Redis fail-closed）。
  - 其余「控制器已把 JWT 主体透传进 service」的形态：`whisper\WhisperController.java:52`（`markRead(userId, id)`）、`vip\VipOrderController.java:77`（`getOrder(userId, orderNo)`，注释「仅本人订单可见」）、`feedback\FeedbackController.java:227`（`getSubmissionDetail(userId, id)`）、`draft\DraftController.java` 三个端点全部以 `SecurityUtils.getCurrentUserId()` 为键、无资源 id 入参。
- 判不出（诚实记账）：本条只证到**控制器与其直接委托的第一层 service**。`WhisperService.markRead`、`VipOrderService.getOrder`、`FeedbackService.getSubmissionDetail`、`VillagePostService.deletePost` 内部的归属比对是否真落地未逐个读到底（预算限制，且部分有 real/mock 双实现）。这四处「控制器传了 userId」是必要条件不是充分条件，留作判点建议 B6-09 的行为命题靶。

### B6-03 permitAll 面上的写入：逐条读完，全部为「只读扫描或自建行」，无越权写；两处值得记账
- 状态：已证
- 现象/结论：`/api/v1/error-reports`（POST 落库）与 `/api/v1/content-filter/check`（POST 只扫不写）是 permitAll 面上仅有的两个 POST；`/api/v1/location/ip-city`、`/api/v1/app-config/**`、`/api/v1/config/legal`、两条 GET 推荐、`/api/v1/media/app-assets/**` 全部只有读映射（实测：`LocationController` 类内 `@GetMapping("/ip-city")` 与 `@PostMapping("/report")` 不同路径，`report` 在 `/api/v1/**` authenticated 之后；`AppConfigController` 仅 2 个 `@GetMapping`）。
- 证据：
  - `report\ErrorReportController.java:43-45` `@Profile("real")` + `@RequestMapping("/api/v1/error-reports")`；`:66-68` `@PostMapping @ResponseStatus(CREATED) @RateLimit(capacity = 20, refillTokens = 2, key = "#clientIp")`；`:53` `MAX_CONTEXT_BYTES = 4096` 且 `:74-78` 按 UTF-8 字节数拒绝；请求体 `:104-110` 各字段 `@Size(max = 2000/8000/128/32)`。体积上限与限流双在，堆垃圾行的成本被压到「每 IP 2 行/秒」。
  - `config\ContentFilterController.java:40-59`：permitAll POST，`:43` `@RateLimit(capacity = 60, refillTokens = 5, key = "#clientIp")`，`:22` `MAX_CONTENT_LENGTH = 5000`，`:52` 超限拒绝，`:58` 只返回 `containsSensitive` 布尔（注释 `:56-57` 明确「不暴露命中的敏感词字典，防止攻击者枚举完整词库后规避内容审核」）。**不写库**，只耗 CPU，且 CPU 已被长度+限流双闸约束。
  - 限流键的可信度我复核到实现层（这条决定上面两个结论成不成立）：`ratelimit\RateLimitAspect.java:241-246` 注入的变量名是 `#httpRequest` / `#clientIp` / `#pii`，**没有 `#request`**；`ratelimit\RateLimit.java:26-30` 的注释与 `:97` 的降级键 `类名#方法名:<标记>:<clientIp>` 说明 SpEL 失败时按**每客户端各自一个桶**回落，不会塌成全站共桶；`ratelimit\ClientIpResolver.java:26-60` 明确「直连来源不在可信代理名单内时忽略 X-Forwarded-For，伪造 XFF 换不到限流桶」，并有 `RateLimitKeyAuditTest`（`RateLimitAspect.java:58` 声称）守门。
    ⇒ 派单与 `village\VillageController.java:236-249` 那段长注释里「`key = "#clientIp"` 正是踩 P0 的写法、会降级成全站共用一个桶」的前提**已被后续提交自愈**（P0 修的是 `#request` 同名覆盖，不是 `#clientIp`）。该注释现在是过期论述，属文档债。
- 影响：这两个面不构成授权缺口。真正值得记的两条：
  1. `location\LocationController.java:87-97` `resolveClientIp()` **无条件**优先信 `X-Real-IP`，其次 `X-Forwarded-For` 首跳——这与 `ClientIpResolver` 的可信代理白名单口径**不一致**。它不参与限流键（限流走 aspect 自己的解析器），只决定 `/ip-city` 给匿名调用者回显哪个城市，危害是「任意匿名用户把自己伪装成任意 IP，换取该 IP 的城市归属」，可作为城市维度的侦察/伪装，不泄露用户数据。判低。
  2. `growth\AppConfigController.java:30-46`（`/api/v1/app-config`，permitAll）把 `app_switch / app_rule / app_config` 三表的**全量功能开关字典**（`AppConfigView` 的 `switches`）匿名吐给客户端。攻击者可据此在打业务端点前先确认哪些付费/风控开关是开的（侦察面），且不缓存⇒每次一次三表查询，permitAll 下无 `@RateLimit`。同类「permitAll 但无限流」的还有 `clientconfig\ConfigController.java:124 /legal`。判中低（可用性问题更实：`/api/v1/app-config` 是小程序启动期与切 Tab 必打的路径，无限流 + 不缓存 = 匿名可打穿 DB）。
- 严重度：低（B6-03 主体）；子项 2 判中低
- 建议修法：给 `/api/v1/app-config`、`/api/v1/config/legal`、`/api/v1/location/ip-city` 补 `@RateLimit`（permitAll 面默认应假定有 `@RateLimit`，这条正好是判点 B6-09 的靶）；`LocationController.resolveClientIp` 改为注入 `ClientIpResolver` 单例，消掉第二套 IP 解析口径；`AppConfigView` 只回客户端真正需要的开关白名单，而不是全字典。
- 判不出：无法静态确认线上反代是否按 `X-Forwarded-For: $remote_addr` 覆盖式设置（`ClientIpResolver` 文档 `:49-60` 列了这个前提）。若反代是追加式，可信代理白名单仍是正确行为，但 `LocationController` 那条解析会被客户端塞的链首 IP 直接决定。

### B6-04 钱的路径（支付/退款回调）四道闸逐条读完，实装齐全；一处对账不对称
- 状态：已证
- 结论：两个 permitAll 回调端点都实现了「配置闸 → IP 白名单 → RSA-SHA256 验签+时间戳防重放 → AES-256-GCM 解密 → 状态机」，且金额取**解密后的微信载荷**而非客户端参数，幂等键已从 `notificationId` 改为按订单状态判定。
- 证据：
  - `vip\BillingController.java:112-190`：`:121-123` `if (wxPayProperties == null || !wxPayProperties.isEnabled()) throw new ResourceNotFoundException` → 管道未开直接 404；`:127` IP 闸；`:134` 验签；`:159-166` 解密；`:185` 交给状态机。
  - `wxpay\WxPayRefundNotifyController.java:71-141`：同样四道闸，`:93` 验签失败额外 `paymentMetrics.recordCallbackFailure("signature_invalid")`。
  - `wxpay\WxPayCallbackVerifier.java:82-108`：`verifyCallback` 真验签——空值即 false（`:84-87`）、时间戳超窗即 false（`:89-91`，注释「疑似重放」）、签名串严格按官方 `timestamp\nnonce\nbody\n` 拼（`:97-98`）、`Signature.getInstance(SIGNATURE_ALGORITHM)` + 平台证书公钥 `sig.verify(...)`（`:100-103`）、任何异常一律 `return false`（`:104-108`）；`:63` 注明公钥为 null 时 `enabled=true` 由 `WxPayBootstrapChecker` fail-fast 拦启动。
  - `vip\VipOrderService.java:394-410`（支付侧对账）：`Integer callbackTotal = tx.amount() != null ? tx.amount().total() : null;` 缺失→`amount_missing` FAIL；`:402-407` `callbackCents` 与 `order.getAmountCents()` 不符→`recordFailure("amount_mismatch")` 并写 FAIL 流水。`:385-388` 重复通知幂等返回。`:54-55` 注释说明「原 `(notificationId, orderNo)` 双键可被同 orderNo 换新 notificationId 绕过」，已换。
  - 退款侧 `VipOrderService.java:525-529`：`refund_status != SUCCESS` 保持现状交人工；`:555` `Integer refundCents = payload.amount() != null ? payload.amount().refund() : order.getAmountCents();` 直接把载荷金额写进 REFUND 账单流水（`:556-562`）。
- 影响：验签+解密+金额来源三条都在，伪造回调这条路是关的。**唯一不对称**：支付路径把载荷金额与订单金额做对账（不符即 FAIL），退款路径把载荷 `amount.refund` 原样入账并**无条件**把订单迁到 `REFUNDED`（`:544` 附近），既不校验 `refund <= total`，也不因「部分退款」而区分状态。今天只能由内部发起全额退款（`:619` `Integer refundCents = order.getAmountCents();`）所以打不到；但一旦接入微信侧的「部分退款/多次退款」，账单流水会出现「部分退款记成全额退款状态」的口径漂移，而这正是对账最需要的字段。判中（不是当前可被利用的越权，是钱路径上的一处缺项对账）。
- 严重度：中（钱路径对账缺口，非越权）
- 建议修法：退款分支补 `refundCents <= order.getAmountCents()` 断言，不符写 FAIL 流水并保留订单原状态（与支付侧 `amount_mismatch` 同一口径）；部分退款应引入累计退款额与独立的 `PARTIAL_REFUNDED` 语义，而不是复用 `REFUNDED`。
- 附带（不构成漏洞但需记账）：`wxpay\WxPayCallbackGuard.java:43-52` 白名单为空时 `return true`（fail-open，仅告警一次），且传入的 `remoteIp` 由 `BillingController.resolveClientIp` / `WxPayRefundNotifyController.java:161-172` 取 **`X-Forwarded-For` 首跳**（不校验可信代理）。⇒ IP 闸这道「纵深防御」在两种情况下同时是空转：默认配置（白名单空）与反代追加式透传。目前唯一的实质防线是验签，这是设计意图（`:19-21` 注释写明「仅依赖验签兜底」），但判据要记下来：**别把 IP 白名单当成能钉住的东西**。
- 判不出：静态读不出 `app.wechat-pay.callback-ip-whitelist` 在 `.env`/部署里的实际值（不涉密不读 .env，且属运维口径），因此无法判「IP 闸在生产是否已生效」。

### B6-05 debug 档在 real profile 下不存在（阴性，可结项）
- 状态：已证
- 证据：`debug\ErrorSimulationController.java:22` `@Profile("mock")`；`debug\MatchDebugController.java:21` `@Profile("mock")`。两者都只注册 `@PostMapping`（`/{status}`、`/next-status/{queueStatus}`），real 档下 bean 不装配、URL 无承载 Controller ⇒ 落到 `SecurityConfig` 的 `/api/v1/**` `authenticated()` 之后返回 401/404，不是「现网可点的调试开关」。
- 加固事实：`CampusLoveApplication.java:37-47`（R4-00368）在 Spring 启动前强制校验激活 profile，未显式指定或非法时 fail-fast 退出，所以 `application.yml:4-5` 的 `spring.profiles.default=mock` 只对测试引导生效，不存在「忘了配 env 就跑成 mock」的路径（mock 侧 `config\MockSecurityConfig.java:266` 是 `anyRequest().permitAll()`，一旦真跑成 mock 整个授权面归零——这条 fail-fast 是关键承重墙，建议纳入 B6-09 的静态判点）。
- 影响：无缺陷。`config\ContentFilterController` 无 `@Profile`，两档都在，但它按设计就是公开只读（见 B6-03）。
- 严重度：无（阴性账）
- 判不出：`auth\DemoCertificationSimulateController.java` 用的是 `@ConditionalOnProperty("app.campus.certification-simulate-enabled", matchIfMissing = false)`（`:29-33`）而不是 `@Profile`——静态无法判定生产 `APP_CAMPUS_CERT_SIMULATE_ENABLED` 是否被打开；该端点 `POST /api/v1/campus/certification/simulate`（`:46-52`，`@PreAuthorize("hasRole('USER')")`）会直接 `certService.simulateApprove(userId)` 置认证通过，属于「一旦开关被打开，任何用户一键自证实名/校园认证」的高爆点。判不出＝需运维核 .env；建议把它从「配置开关」升级为「profile 硬闸」。

### B6-06 disabled / deactivated 主体：认证链一处收口，自服务链被同一道闸覆盖（阴性），但有一个 60 秒窗口和一处口径裂缝
- 状态：已证
- 结论：用户侧自服务链的状态判定不在各 service 里，而是**收敛在 `JwtAuthenticationFilter` 一处**，与后台链路同源，本批新加的 `isErasedSubject()` 只覆盖后台链路这件事**没有留下用户侧缺口**。
- 证据：
  - `entity\User.java:435-437` `isDisabled()` = `"disabled" || "deactivated"`；`:448-450` `isErasedSubject()` = 仅 `"deactivated"`，注释 `:439-447` 明确两者区分「是有意为之」。
  - `config\JwtAuthenticationFilter.java:230-243` `loadAuthSnapshot` 用 `user.isDisabled()` 填 `disabled` 位；`:355-357` `!snapshot.exists()` → `BadCredentialsException`；`:359-362` `snapshot.disabled()` → `BadCredentialsException(USER_DISABLED_PREFIX)`。该 filter 挂在**唯一**的 `SecurityFilterChain` 上（`SecurityConfig.java:246-247` `addFilterBefore(...)`），所以 91 个非 admin controller 的自服务写读全在这一道闸之后，无需逐个补状态判断。
  - 后台链路补账（本批 F-08）：`privacy\ErasureSubjectGuard.java:41-58`，调用点 `mq\NotificationConsumer.java:186`、`mq\MatchEventConsumer.java:321`、`mq\CheckInEventConsumer.java:249`、`vip\AutoRenewService.java:542`。
- 两条需要记账的裂缝：
  1. **60 秒缓存窗口**：`JwtAuthenticationFilter.java:350-351` 注释自陈「被删除/禁用用户最长延迟约 60s 生效（可接受的安全窗口）」（快照缓存本体声明在 `:89`，R4-00272）。管理员点「禁用」到实际断会话之间有 60s，被禁用/被注销主体在这 60s 内仍可打完任意自服务写端点（改资料、发消息、扣钱包）。这是**已知且被接受**的取舍，不是我发现的缺陷，但没有任何门钉住「这个窗口 ≤ 配置值」。
  2. **`ErasureSubjectGuard` 的失败方向是 fail-open**（`ErasureSubjectGuard.java:52-57`：查询异常/仓储缺席 → 返回 `false` = 按未注销继续写行）。理由注释得通（DB 抖动不该被解释成注销而永久丢通知），但后果是「注销是终态」这条隐私承诺在 DB 抖动时可以被后台链路重新写行；与 `:29-33` 的自我表述一致，属被显式接受的风险。判不出（静态无法量化抖动频率）。
- 严重度：低（两处均已被注释记账，非新缺陷）
- 建议修法：把 60s 窗口做成配置项 + 断言（禁用/注销时主动 `userAuthCache.evict(userId)`，比缩 TTL 更便宜）；`ErasureSubjectGuard` 的 `RuntimeException` 分支额外打一条可告警的 metric，使「抖动期写进墓碑行的次数」可观测。

### B6-07 管理端读面：同一敏感类（一对一私聊内容）在两档角色口径上互相矛盾，且**所有**管理端 GET 零审计留痕
- 状态：已证
- 现象：`/api/v1/admin/**` 的 GET 由 `SecurityConfig.java:216` 放行给 `ADMIN/SUPER_ADMIN/AUDITOR` 三档，读侧的敏感度分级只有 `AdminConversationController` 一处做了「非超管置 null」。悄悄话（同为 1 对 1 私聊语义）完全没分级；身份证/手机号两条读侧已掩码，不构成明文泄露，但**读操作无任何审计**，权限+无痕=既无法追责也无法事后发现越权浏览。
- 证据：
  - 做了分级的唯一一处（这是正面样板）：`admin\AdminConversationController.java:47-48` 类注释「SUPER_ADMIN：可见消息正文（content）、会话预览（last_message_preview）与引用上下文（quote_context）」，实现 `:334` 「会话 → 列表视图；非超管时 lastMessagePreview 置 null（服务端脱敏）」、`:381` 「消息 → 视图；非超管时 content/quoteContext 置 null（服务端脱敏）」，视图字段注释 `:428 :481 :484` 逐条标「非超管为 null」。
  - 没做分级的那一处（矛盾面）：`admin\AdminWhisperController.java:55-57` 类级 `@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")` + `:67 @GetMapping list(...)`，视图 `:190-201`
    ```java
    public record AdminWhisperView(
        Long id, Long senderId, Long receiverId, String content,
        String status, Long priceCents, String createdAt, String readAt
    ) { static AdminWhisperView of(WhisperMessage m) { return new AdminWhisperView(
        m.getId(), m.getSenderId(), m.getReceiverId(), m.getContent(), ...
    ```
    `content` 逐条原样吐给三档角色。而且该类的注释 `:49-51` 是**知情后刻意不做**：「正文是否对非超管脱敏属角色轴（能看什么）而非作用域轴（看谁的），且改变字段取值会影响现有后台展示，故本类只补作用域判定，脱敏另议。」——本车道认这条理由为「未闭合」而不是「已裁定」：作用域轴它已经补了，角色轴它把同一个类数据留给了 ADMIN/AUDITOR 明文。
  - 读侧掩码到位的两处（负面账要记全）：`admin\AdminUserController.java:808` `PhoneColumnCodec.displayMasked(aesEncryptor, stored)`；`admin\AdminRealNameController.java:84` `RealNameCertificationView.maskIdCardNo(decryptIdCardNo(entity))`（`:97-106` 解密失败回落空串由视图层掩码兜底）。⇒ 本批「phone 收敛进 codec」的读侧口径在管理端是到位的，判不出明文泄露。
  - 零审计：`@Auditable` 全仓 78 处，分布在 24 个 admin controller，但**只挂在写方法上**——`admin\AdminUserController.java:159 :271` 两个 `@Auditable` 都在 `createUser`/`createAdmin` 上；`admin\AdminCertificationController.java:123` 在 `POST /{id}/review` 上；`admin\audit\Auditable.java:22-23` 的切面语义本身就是「从 `@PathVariable` 提取 targetId、从 `@RequestBody` 提取并脱敏请求体」，即设计面向写路径。三个最敏感读面 `AdminWhisperController` / `AdminConversationController` / `AdminRealNameController` 的 `@Auditable` 计数实测为 **0 / 0 / 0**。
  - 角色形同虚设（档位与职责冲突）：`config\SecurityConfig.java:208-215` 把 `/api/v1/admin/**` 的 POST/PUT/PATCH/DELETE 一律收成 `hasAnyRole("ADMIN","SUPER_ADMIN")`，于是「审核员」做不了任何审核动作——`admin\AdminRealNameController.java:112 POST /{id}/review`、`admin\AdminCertificationController.java:124 POST /{id}/review`、`admin\AdminCommentController.java:126 DELETE`、`admin\AdminReportController.java:170 POST` 全在 URL 层就被拒。类级注解 `hasAnyRole(...,'AUDITOR')` 里的 AUDITOR 只对 GET 生效。
- 影响：
  1. AUDITOR 拿到「悄悄话正文全量分页」（`size` 上限 200，`AdminWhisperController.java:70`），却拿不到私信正文——同为私聊内容，两套口径；这既是隐私分级不一致，也是给运营的实际泄露面。
  2. 「档位 + 无痕」组合使管理端读面没有任何可事后追责的证据链；一旦发生内部人员批量翻看用户悄悄话/实名记录，盘上只有 `admin_audit_log` 的**写**记录，读行为零记录。
  3. AUDITOR 只能读不能审 ⇒ 运营为完成审核必须升 ADMIN，最小权限原则在实际操作中被打穿（这正是 `tests\admin-write-gate.spec.mjs:8` 提到的「校区 ADMIN 在 42 个超管端点上白吃 403」的同一类档位错配的另一面）。
- 严重度：中（1、2 条）；低（3 条，可用性/流程摩擦，非越权）
- 建议修法：
  1. 把 `AdminConversationController` 的「非超管置 null」抽成一个共享的读侧分级策略（与已有的 `media\MediaTierPolicy.java:121-160` 同形态：`grants(tier, authentication)`），让 whisper / conversation / realname / certification 四个正文类读面共用同一张档位表，`AdminWhisperView.of` 接 `Authentication` 而非裸 `m.getContent()`。
  2. 给管理端读面加 `@Auditable` 的读语义（新增 `AuditOperation.VIEW_*`，切面从 `@GetMapping` + query 参数提取 target 维度并**按需采样**，避免审计表被后台轮询打爆），至少覆盖 whisper/conversation/realname/certification 四类。
  3. 若要救活 AUDITOR：在 `SecurityConfig` 的四条通用写规则之前，为「审核类写」单列白名单规则（`POST /api/v1/admin/*/review`、`/api/v1/admin/reports/*` 等），并让 `tests\admin-write-gate.spec.mjs` 的角色交集把它算进去；否则就该把类级注解里的 AUDITOR 从这些 controller 上摘掉，别让注解承诺比 URL 规则更宽。
- 判不出：无法静态判定 AUDITOR 在生产实际被授予了几个账号（`user.role` 分布需读库）；若线上根本没有 AUDITOR 账号，第 3 条降级为纯设计债，第 1 条的泄露面也暂只落在 ADMIN。

### B6-08 `/ws/**` 与媒体的鉴权层次：都在，且是本轮读到的最完整的一处（阴性账）
- 状态：已证
- `/ws/**` 的鉴权在哪一层（判据 2 的点名问题）：HTTP 过滤链确实放行（`SecurityConfig.java:136` `/ws/**` permitAll），但鉴权被完整下沉到 STOMP 帧层，四层都有原文：
  - `config\JwtChannelInterceptor.java:140-145` 按命令分派 `CONNECT / SUBSCRIBE / SEND,MESSAGE`；`:236-274` CONNECT 必须带有效 JWT 并 `setAuthenticatedUser`，`:257-260` 明确「媒体访问令牌（media scope）不可建立长连接」；`R4-00281`（`:75`）CONNECT 阶段还查用户未被禁用。
  - `:351-357` SUBSCRIBE 未认证直接 `MessageDeliveryException`；`:372-396` `/user/**` 只允许「自己的队列」两种形态（简写 `/user/queue/**` 与显式 `/user/{userId}/queue/**`，且显式形态比对 `userId.equals(targetUserId)`，不等抛 `cannot subscribe to another user's queue`）；`:400-408` 再收紧一层「`/user/{userId}/` 之后必须以 `queue/` 开头」。
  - `:162-180` SEND/MESSAGE 只允许应用前缀，`/topic/**`、`/queue/**`、`/user/**` 一律拒（注释 `:27-33` 解释了为什么：`enableSimpleBroker("/topic","/queue")` + SUBSCRIBE 放开 `/topic/**` 时，没有 SEND 侧过滤等于任何人都能向全体在线用户伪造推送），被拒目标额外 `log.warn` 作为「有人在探测 /topic 注入面」的唯一可见信号。
  - 业务层再叠一次：`chat\MessageWebSocketHandler.java:108-116` `senderId` 取 `headerAccessor.getUser().getName()` 且注释 `:102` 明写「从 STOMP 认证用户中获取 senderId，不信任客户端 payload」；`:164-178` 与 `:326-346`（typing）用 `isTempChatPair` / `isPrivatePair` 校验 (sender, recipient) 恰为会话双方，不匹配 return。
  - 唯一小裂缝：`:360-362` `destination == null` 的 SUBSCRIBE「直接放行」。STOMP 规范里 SUBSCRIBE 必带 destination，实际不可达；但它是这段拦截器里唯一一条「解析不出来就不判」的分支，与同文件其它 fail-closed 风格不一致，值得在门里点名。
- 媒体读面（判据 1 的「媒体」项）：`media\MediaAccessController.java:392-412` 临时会话图片按 `tempChatMediaService.canRead(sessionUid, currentUserId)` 授权，签名 URL 走能力凭据分支（`:401-403` 要求 `currentUserId == 0` 且 `MediaTokenPolicy.isMediaOnlyAuthentication`，两个条件与）；`:434-470` `/{userId}/**` 双层校验（controller `assertOwnership` + service `loadMedia`，注释 `:426-428` 明说「深度防御」），档位由 `media\MediaTierPolicy.java:178-225` 判定且**默认 fail-closed**（无法归类 → `Tier.VERIFICATION`；两路都无信号 → `VERIFICATION`）。
  - 一处需要点名的口径：`MediaTierPolicy.java:135-136 :158-159`「内容档公开图片（IMAGE）任何已登录用户可读」。即相册/帖子配图类 IMAGE 的归属闸是**关闭**的，实际保护来自文件名 UUID 不可猜（`uploads/{userId}/{yyyyMM}/{uuid}.ext`，见 `chat\VoiceMessageService.java:29 :144-167`）。授权层没写「非本人」判断，所以这条不可能被静态门判成违规——它是「能力凭据 + 角色公开读」的设计选择，我把它记在账上而不是判成漏洞；`media\MediaAccessController.java` 的 `@Operation` 描述（`:436`）也如实对外声明了这个口径。
  - `/uploads/**` 在 URL 层 `denyAll()`（`SecurityConfig.java:197`，注释 `:193-196` 记录了原 permitAll 导致任意匿名枚举的教训），强制走鉴权代理，这一条是闭合的。
- 严重度：无缺陷（B6-08 主体）
- 建议修法：只两条小事——`JwtChannelInterceptor.java:360-362` 的空 destination 改为拒绝（与同文件其它分支一致）；把「IMAGE 公开读」这条从口头设计升成一条机器可读断言（见 B6-09 判点 C），否则将来某个新上传类目被误归 IMAGE 时就自动获得「任意登录用户可读」而没人签字。
- 判不出：`app.security.media-query-token-strict` 默认 false（`JwtAuthenticationFilter.java:343-347`），即 24h 会话 JWT 仍可用 `?token=` 进 URL；是否已在生产开启需读部署 env（属运维，静态不可判）。

### B6-09 判点建议：这个仓缺的是三扇门，其中两扇能纯静态跑
- 状态：已证（按「判据是结构命题还是行为命题」分档给出）
- 缺口定性：`tests\admin-write-gate.spec.mjs` 已经证明这个团队能把「档位」做成静态结构命题（它做正则+注释剥离状态机、方法级→类级回落、再与 SecurityConfig URL 规则取**交集**、规则形态变化时拒绝结论以防假绿，见该文件 `:12-17`、`:146-148`、`:183`、`:250-260`）。但它的作用域实测只有 `/api/v1/admin/**` 的**写**。本车道这轮量的 85 个非 admin `@PathVariable` 端点、以及全部水平归属，**没有任何门覆盖**。缺的三扇：
- **门 A「水平归属可达性」——结构命题，可纯静态跑**
  判据：对每个非 admin、非 permitAll 的映射方法，从映射行到方法签名之间取注解区（**必须双向取**，见盘面复量的口径警告），再取方法体；断言二者之一定成立：
  (1) 方法体或其一跳委托里出现 `SecurityUtils.getCurrentUserId()` / `getCurrentUserIdOrNull()` / `isAuthenticated()` / `SecurityContextHolder`；
  (2) 端点在白名单里且白名单条目必须带「为什么不需要主体」的理由字符串（沿用 admin-write-gate 的 `reason` 约定，见 `tests\admin-write-gate.spec.mjs:94-103`）。
  本车道实测：85 个候选里 29 个「方法体内无主体」，其中 `TempChatController`(9)、`MatchController`(3)、`ProfileController`(1) 属一跳委托内闭合（我已逐个读到 service 内的 `OperationForbiddenException`），**真阳性只有 `LocationController.getNearby` 1 个**（= B6-01）。⇒ 判据可给阳性、且当前红数=1，不是空转门。
  成本与边界：必须显式声明「只看一跳委托」，否则 `MatchController:386 → RealMatchService:649-658` 这类会被误报；建议在门里内嵌一张「委托白名单表」（controller 方法 → 已验证的 service 方法 + 判据行号），表里的条目过期要靠 service 侧那行 `OperationForbiddenException|requireParticipant|isDisabled` 仍在位来续命，不在位即红——这就是把 `tests\admin-write-gate.spec.mjs:250-260` 的「规则形态变了就拒绝结论」搬到归属轴。
- **门 B「permitAll 面的写入必须自带限流」——结构命题，可纯静态跑**
  判据：从 `SecurityConfig` + `MockSecurityConfig` 正则出 permitAll 的前缀/路径集合（两份必须**同时**解析并做差集，两文件已有对齐注释 `SecurityConfig.java:150-169` / `MockSecurityConfig.java:221-239`，差集非空即红）；对落在该集合里的每个 `@PostMapping/@PutMapping/@DeleteMapping/@PatchMapping`，断言同方法的注解区里有 `@RateLimit`，且 `@RequestBody` 的每个 String 字段带 `@Size` 或显式字节上限。
  本车道实测：当前 permitAll 面只有 2 个 POST（`error-reports`、`content-filter/check`），两条都满足 ⇒ **首跑 0 红**，是一条「现在绿、且未来新增公开写端点会立刻红」的门，正是要的形状（防 `SecurityConfig.java:236-242` 注释里说的那类「新增接口默认开放」复发）。
- **门 C「档位↔实体状态↔敏感读」的一致性——一半结构、一半行为**
  - 结构半（可纯静态）：① `@Profile` 断言：`debug/**`、`DemoCertificationSimulateController` 这类演示/模拟端点必须落在 mock 或 `@ConditionalOnProperty(matchIfMissing=false)`，且 real 档下的写端点数=0；② 读侧分级断言：所有 `admin/**` 的 `@GetMapping` 视图 record 字段名里出现 `content|idCardNo|phone|realName` 时，同文件必须有「非超管置 null」形态的代码（`isSuperAdmin` 参与判定的三元/if），或该字段名进了显式豁免表——这条现在跑会红 1 处（`AdminWhisperController.java:191` 的 `content`），正落在 B6-07 第 1 条上；③ 审计断言：`@PreAuthorize` 含 `AUDITOR` 的 controller 若有返回正文字段的 GET，则该 GET 必须有 `@Auditable`（现红 3 处，见 B6-07）。
  - 行为半（**不能纯静态**，必须跑起来）：「disabled/deactivated 主体在自服务链上确实被拦」这件事，静态只能证 `JwtAuthenticationFilter.java:359-362` 那行在位，证不了 60s 缓存窗口（`:349-351`）内的真实行为、也证不了 `ErasureSubjectGuard` 异常分支的 fail-open 后果。这半要留给运行时门（`scripts/verify-admin-scope.mjs` 那一类，`tests\admin-write-gate.spec.mjs:44-46` 已明确把运行时判定排除在静态门外，别把两件事混在一扇门里）。
- 一条共同的落地约束：这三扇门都必须**拒绝在解析失败时给出绿灯**（照抄 `tests\admin-write-gate.spec.mjs:258-260` 的 `throw`），并且门自身要带阳性对照——门 A 的对照就是 `LocationController.getNearby`，门 B 的对照是临时往测试夹具里塞一个无 `@RateLimit` 的公开 POST，门 C 的对照是 `AdminWhisperController` 的 `content` 字段。没有阳性对照的门，绿了也不知道它在不在跑。
- 严重度：不适用（建议项）

## 判不出清单

1. **`/api/v1/location/nearby` 的实际暴露量**（B6-01）：需 `users.latitude/longitude` 非空填充率与 `nearby` 端点的访问日志；禁跑 maven + 不连库，静态拿不到。危害性质已证，量级未证。
2. **`app.campus.certification-simulate-enabled` 在生产是否为 true**（B6-05 附带）：`DemoCertificationSimulateController` 用配置开关而非 `@Profile` 做闸，一旦打开则任何 `ROLE_USER` 一键自获校园认证（`:46-52` → `certService.simulateApprove(userId)`）。属运维口径。
3. **`app.wechat-pay.callback-ip-whitelist` 与 `media-query-token-strict` 的实际值**（B6-04 / B6-08）：前者的空值路径是 fail-open（`WxPayCallbackGuard.java:44-51` 直接 `return true`），后者默认 false 意味着完整会话 JWT 可进 URL。都不涉密但属部署 env，静态不可判。
4. **AUDITOR 角色在生产被授予了几个账号**（B6-07）：决定第 1、2 条是「纸面档位错配」还是「已存在的内部泄露面」。需 `user.role` 分布。
5. **反向代理是否覆盖式设置 `X-Forwarded-For`**（B6-03 / B6-04）：`ClientIpResolver` 的正确行为、以及两个支付回调端点的 IP 闸是否真能拦住伪造来源，都挂在这个部署前提上。仓内 `ClientIpResolver.java:49-60` 把它写成前提而不是事实。
6. **控制器→一跳之外的 service 归属校验**（B6-02）：`WhisperService.markRead`、`VipOrderService.getOrder`、`FeedbackService.getSubmissionDetail`、`VillagePostService.deletePost`、`RealNotificationService.markRead`（`chat\NotificationController.java:53/110` 我未追到底）内部是否真的比对归属，本轮未逐个读到最后一层。「控制器把 JWT 主体传进 service」是必要非充分条件。⇒ 这正是门 A 该收的尾，静态门只能做到一跳，其余按运行时门补。
7. **`/api/v1/admin/**` GET 的「无审计」是否已被别的载体补偿**（B6-07）：我只读到 `@Auditable` 这一条审计路径；若运维侧另有 access log 采集 + 保留策略，第 2 条影响要降级。仓内静态读不出来。
