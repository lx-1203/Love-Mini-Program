# 第六轮 修复车道 W1b：后端身份与授权四条

- 车道：W1b（身份与授权）
- 基线 HEAD：`74e681ca`
- 工作树：含别的修复车道未提交改动，本车道不还原、不触碰 `apps/client`、`docker**`、`doc**`、`tests/**`、`scripts/**`、`apps/admin`
- 验证口径：`cd apps/api && ./mvnw -o -B test -Dtest=<类>`，收口前跑全量

## 状态总表

（本表在 W1b2 接力时按**盘上实测**重写。W1b 交回的原表四条全写「待闭合」、后三列全「待填」，
与盘上产物不一致；账实不一致以盘为准，逐条核对见下一节。）

| # | 发现 | 改动状态 | 判点 | 反向变异 | 实测读数 | 边界 |
|---|---|---|---|---|---|---|
| 1 | `GET /api/v1/location/nearby` 读一集合却不取主体 | 代码完整（W1b 交件 + W1b2 补「临时 deny 的门禁可见交接」） | 21 例 + W1b2 新增 2 例 = 23 例，全绿 | W1b 做过 2 次（哈希已复核对齐）；W1b2 对新判点补做 1 次 | 全量 1861 例 0 红；deny 下恒空集 | 授权列不存在 ⇒ 交接 F-W1b-1-H（已成门可见形态） |
| 2 | 管理端悄悄话读面自相矛盾 + 敏感 GET 零审计 | **W1b2 新做**（W1b 一条未动，实测确认） | 静态门 12 例 + 档位运行期 6 例 + 切面维度 8 例 = 26 例，全绿 | 3 次（见 §2） | 审计计数改造前 0/0/0 ⇒ 现 5 个读端点 + 1 个删除端点带注解 | apps/admin 悄悄话页需按 `redacted` 显示占位（禁改面，交接） |
| 3 | `PhoneBindingController` 第四种 phone 形状 | 代码完整（W1b 交件 + W1b2 补不变量 4） | 查重 9 例 + 静态门 4+7=11 例，全绿 | W1b **未记变异** ⇒ W1b2 补做 2 次 | 四条写入路径两两互测；媒体/反馈包 `setPhone` 计数 0/0 ⇒ 无误伤 | 微信身份行不留派生键（schema 决策）⇒ 交接 F-W1b-3-H |
| 4 | F-07 fail-fast 无判点 + 503 分支生产不可达 | 代码完整（纯补判点，主代码未动） | 4 例，全绿 | W1b 记过 1 次但**哈希账已失效**（同文件被后续改动过）⇒ W1b2 重做并重立基线 | 4/4 + 既有 14/14 | 真栈 BeanPostProcessor 未证 ⇒ 判不出，交接 W3/部署 |

全量真值（本机 `cd apps/api && ./mvnw -o -B test`，串行独享 target 目录）：

- 修前（W1b2 接手时盘上状态）：`Tests run: 1861, Failures: 0, Errors: 0, Skipped: 10` — `BUILD SUCCESS`。
  即「W1b 中断时后端是红的」这一条**不成立**，它留下的工作树是可编译可全绿的半成品（缺的是账与判点，不是红）。
  10 条 Skip 全部是既有 real 档集成类（`FlywayMigrationRepeatableTest` 5、
  `P0SecurityIntegrationTest$RealProfileEndToEndTests` 3、`RealProfileAuthChainIntegrationTest` 5 的档位互斥跳过），
  与本轮无关，属已知红基线里的「环境格」，不修。
- 修后（W1b2 收口）：见文末「W1b2 收口读数」。

## W1b2 接力：账实核对表

核对方法：`git status --porcelain -- apps/api` 取盘上改动面，逐文件与报告正文对；
报告里给过哈希的，用 `sha256sum` 当场复量（不是照抄）。

| 报告声称 | 盘上实测 | 结论 |
|---|---|---|
| §1 已写正文，产物含 2 个新类 + 2 个新测试 | `location/DenyAllNearbyPolicy.java`、`location/NearbyVisibilityPolicy.java`、`location/GeoServiceNearbyAuthzTest.java`、`location/NearbySubjectBindingStaticGateTest.java` 全在盘上且全绿 | **账实相符** |
| §1 变异 1/2 的「还原后 sha = 改前基线」 | `GeoService.java` 实测 `96631f98…89b40`、`LocationController.java` 实测 `a53137a3…56dffa`，与报告逐字一致 | **可复核，采信**（说明 W1b 确实把两次变异还原干净了） |
| §3 只有标题，但 `admin/PhoneIdentityCrossPathDedupTest.java`、`privacy/PhoneIdentityCodecExitStaticGateTest.java` 已在盘上 | 两文件存在，9 + 4 例全绿；`auth/PhoneBindingController.java`、`privacy/PhoneColumnCodec.java` 有对应主代码改动 | **账不实（低估）**：条目 3 的实现与判点其实已完成，缺的是报告正文与反向变异账 |
| §4 记「还原后 sha = 改前基线 `2780521…06336b`」 | `auth/RealAccountSecurityService.java` 实测 `0a4761ac…5b30a82`，**对不上**；`@jakarta.annotation.PostConstruct` 仍在 :98 在位、4 例判点仍绿 | **账失效**（W1b 之后本文件又被改过一次；报告未点名是谁——按 git 状态与改动内容判断是上一批 W1 的 `requireErasureService`/`ResourceConflictException` 那支，非本条判点失效）⇒ W1b2 重做变异并重立基线哈希 |
| §2 只有标题 | `admin/AdminWhisperController.java`、`admin/AdminConversationController.java`、`admin/AdminRealNameController.java`、`admin/audit/*` 均**不在** git 改动面内；三档读口仍原样吐正文、`@Auditable` 计数 0 | **账实相符**：条目 2 确实一条没动 ⇒ 由 W1b2 补做 |
| 「状态总表四条全待闭合」 | 4 条里 3 条代码 + 判点已在盘上（只缺账），1 条真未动 | **表已按真值重写，见上一节** |


## 1. `GET /api/v1/location/nearby` 读一集合却不取主体

**现象一句**：`LocationController#getNearby` 方法体内零次 `getCurrentUserId()`，
`GeoService#findNearby(lat,lng,radiusKm,maxResults)` 签名没有主体、查询只按 bounding box 过滤、
不带任何同意位，返回体却铺出 `userId + 昵称 + 头像 + 校区 + 距离`——任意登录账号传任意坐标
即可读全平台有坐标的用户，再靠 1km 粒度的距离文本二分收敛到约 1km。

### 改动（文件:行）

| 文件 | 改动 |
|---|---|
| `apps/api/src/main/java/com/campuslove/api/location/NearbyVisibilityPolicy.java` | 新增：授权判定接口（唯一能回答「对方是否同意被附近的人看到」的位置），类注释里逐项论证现有列为什么都不算这一位 |
| `apps/api/src/main/java/com/campuslove/api/location/DenyAllNearbyPolicy.java` | 新增：当前生产实现，一律 deny；写清「解除拒绝的三个前置条件」 |
| `apps/api/src/main/java/com/campuslove/api/location/GeoService.java:38-59` | 构造器从 1 参变 3 参（+`BlockService`、+`NearbyVisibilityPolicy`） |
| `apps/api/src/main/java/com/campuslove/api/location/GeoService.java:70-141` | `findNearby(Long requesterId, ...)`：主体缺席/主体不存在/判定器缺席 ⇒ 空集且**一次坐标查询都不发**；候选先过「非自己 → 状态 active → 未被拉黑（双向，读失败即整条 fail-closed）→ 授权」，**全部通过后才算距离** |
| `apps/api/src/main/java/com/campuslove/api/location/GeoService.java:186-197` | `NearbyPerson` 投影裁剪为 `{userId, nickname, avatarUrl, distanceText}`，删除 `campusName` |
| `apps/api/src/main/java/com/campuslove/api/location/LocationController.java:73-97` | `getNearby` 先 `SecurityUtils.getCurrentUserId()` 再把它送进服务；`@RateLimit` 键从 `#clientIp` 收紧为 `#clientIp + ':' + getCurrentUserId()` |
| `apps/api/src/test/java/com/campuslove/api/location/GeoServiceTest.java:26` | 既有纯计算用例的构造器补 null 协作者（该路径不触碰它们） |
| `apps/api/src/test/java/com/campuslove/api/profile/UserProfileControllerTest.java:72` | 同上（只借 haversine/formatDistance 两个纯函数） |

### 判点

新增 2 个测试类，共 21 例（`GeoServiceNearbyAuthzTest` 15 + `NearbySubjectBindingStaticGateTest` 6）：

- 核心判点 `findNearby_unauthorizedCandidate_leaksNoIdentityFields`：A 调 nearby，
  候选为「未授权的 B + 已授权的 C」，断言结果只含 C，且响应文本里没有 B 的 ID/昵称/校区/手机号。
- `findNearby_productionDenyPolicy_returnsEmpty`：用生产实现 `DenyAllNearbyPolicy` ⇒ 恒空集（不泄露人数）。
- `findNearby_doesNotComputeDistanceForUnauthorizedCandidates`：Mockito spy 断言
  2 个候选里只有 1 个走 `haversineKm`/`formatDistance`；deny-all 场景 `never()`——距离本身可二分，必须在授权之后才算。
- `findNearby_withoutRequester_readsNothingAtAll` / `_unknownRequester_` / `_withoutPolicy_` /
  `_blockServiceFailure_failsClosed`：四条 fail-closed 路径，前三条还要 `verify(never())` 坐标查询。
- `findNearby_excludesSelf` / `_excludesBlockedRelations` / `_excludesNonActiveUsers`。
- `nearbyPerson_projectionIsMinimal`：反射取 record 组件，白名单钉死为四元组，
  并显式禁止 `campusName/phone/realName/idCardNo/latitude/longitude`。
- `controller_passesSubjectToService` / `controller_unauthenticated_doesNotReadCollection`。
- 静态门 `everyLbsReadEndpointBindsTheSubject`（location 包每个 GET 必须取主体，白名单只有 `/ip-city`）、
  `findNearbySignatureCarriesTheSubject`（第一个入参必须是主体）、
  `nearbyRateLimitKeyIsSubjectBound`（限流键必须引用主体）；
  另附 3 例探测器反证（咬得住不带主体的 GET、不误伤合规/白名单、注释与字符串里的
  `getCurrentUserId()` 字样不算取主体）。

### 反向变异（红⇒还原⇒哈希对齐⇒复绿）

变异 1 —— 删掉 `GeoService` 的授权过滤行 `.filter(u -> nearbyVisibilityPolicy.isDiscoverableTo(u, requesterId))`：

```
[ERROR] Tests run: 15, Failures: 3, Errors: 0 -- in com.campuslove.api.location.GeoServiceNearbyAuthzTest
GeoServiceNearbyAuthzTest.findNearby_unauthorizedCandidate_leaksNoIdentityFields:154
  只有已授权的 C 能出现；B 未授权 ? 连一条匿名占位都不该有
  ==> expected: <[3]> but was: <[2, 3]>
另两条红：findNearby_productionDenyPolicy_returnsEmpty、findNearby_doesNotComputeDistanceForUnauthorizedCandidates
```

- 变异后 `GeoService.java` sha256：`bcec0111e46b904e95074e9331753ebfffc7b0695f74217911734b49ee473539`
- 红日志 sha256：`44889f85a065d594bae5c57153775cbc95b08d38094fcc59fc8193c2bb963362`
- 还原后 sha256：`96631f980cb0e16f54fa650d2c2c64372ac134fc7ccb884b6b99bc9d3a689b40` = 改前基线，一致

变异 2 —— 把 `LocationController#getNearby` 退回改造前形态（去掉取主体那一行，`findNearby(null, ...)`）：

```
[ERROR] Tests run: 8, Failures: 3, Errors: 0
GeoServiceNearbyAuthzTest: controller_passesSubjectToService、controller_unauthenticated_doesNotReadCollection
NearbySubjectBindingStaticGateTest.everyLbsReadEndpointBindsTheSubject:
  有 1 个 LBS 读端点没有绑定当前主体：
  LocationController.java#getNearby：方法体内没有 getCurrentUserId()/getCurrentUserIdOrNull()，
  且不在公开读取白名单 [/ip-city] 内（映射路径=/nearby） ==> expected: <[]> but was: <[…]>
```

- 变异后 `LocationController.java` sha256：`9f1056cc3c6266cbd81d5e3b3181e672166c8cd057f369e03519d4eb94791a1d`
- 红日志 sha256：`4128915d8d99e9700a1295f7899b0ecc01cd62804d7c575a0b5eaad15b44d8f4`
- 还原后 sha256：`a53137a312e13949f4b7d9fbd81b7efe4dbc2ab9e41698407e5847017156dffa` = 改前基线，一致
- 复绿读数：`GeoServiceNearbyAuthzTest 15/15、NearbySubjectBindingStaticGateTest 6/6、GeoServiceTest 5/5、UserProfileControllerTest 11/11`（37 例全绿）

### 实测读数（本机 MySQL 只读，无任何写入）

| 读数 | 值 | 口径 |
|---|---|---|
| `users` 总数 | 404 | `SELECT COUNT(*) FROM campus_love.users` |
| 有纬度坐标的行 | 387 | `SUM(latitude IS NOT NULL)` —— 这就是改造前该端点一次能铺出来的最大集合 |
| 有 `geo_updated_at` 的行 | 77 | 近一次真实上报过坐标的主体数 |
| `users` 中名字含 nearby/visible/consent/discover 的列数 | **0** | `information_schema.COLUMNS` 计数 ⇒ 「同意被附近的人看到」这一位**确实不存在** |

### 判不出与交接项

- **未闭合的边界（本条最重的一半）**：库里没有地理曝光同意位，所以线上 `nearby` 现在恒返回空集。
  这不是「功能坏了」，是「在证明不了授权时不假装有权」。**交接项 F-W1b-1-H**：
  1. 新增迁移给 `users` 补 `nearby_visible TINYINT(1) NOT NULL DEFAULT 0` + `nearby_consent_at`（默认必须 0，存量行不能被迁移顺带授权）；
  2. 用户侧要有可关入口，且 `PersonalDataTables` 注销清单与个人数据导出要把这一位算作处理依据；
  3. 替换 `DenyAllNearbyPolicy` 读取该位。判点已按「换实现自动复红」写好（投影白名单 + 距离只在授权后才算 + deny 场景 never() 断言）。
- 「校区管理员/管理端读坐标」不属本条：`UserProfileController`、`RecommendationRanker` 只用 `GeoService` 的纯数学部分，不经 `findNearby`。
- 需真环境才能证的（线上真实限流行为、`@RateLimit` 复合键在 Redis/Bucket4j 下的实际分桶）：本机无 Docker/Redis ⇒ **判不出**。
- 前端影响：`/api/v1/location/nearby` 在 `apps/client` 与 `apps/admin` 全仓 grep **零调用**
  （首页「附近的人」走 `HomeFeedView.nearbyPeople`／`NearbyPersonSummaryView`，寻觅「附近」Tab 走 `RecommendationController`，两者都带主体），
  所以投影裁剪与恒空集不破坏任何现有页面。

## 2. 管理端悄悄话读面自相矛盾 + 敏感 GET 零审计

**W1b2 接力补做（W1b 实测一条未动：`admin/AdminWhisperController.java`、
`admin/AdminConversationController.java`、`admin/AdminRealNameController.java`、
`admin/audit/*` 都不在 `git status` 的改动面内）。**

**现象一句**：`admin/AdminWhisperController.java` 的 `AdminWhisperView.of(WhisperMessage)`
把 `whisper_message.content` **原样**交给类级 `@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')")`
放行的全部三档；同域同语义的 `admin/AdminConversationController.java`（:334 / :381 两侧映射）
却对非超管把 `lastMessagePreview / content / quoteContext` 一律置 null 并回传 `redacted` 标记。
同一份「两个人私下说的话」，保密档位由「走哪个后台页面」决定 ⇒ 自相矛盾。
另一半：这三档里最敏感的读接口（悄悄话列表 / 会话列表·详情·消息 / 实名申请列表）
在改造前 `@Auditable` 计数实测 **0/0/0**，读 PII 不留一行痕。

### 先回答「`@Auditable` 能不能作用于 GET」

读 `admin/audit/Auditable.java` 与 `admin/audit/AuditLogAspect.java` 的实测结论：
**能拦住，但拦到之后记不下**，所以不是「硬挂一个空注解」，而是先补记录维度再挂注解。

- 切点是 `@Around("@annotation(auditable)")`（`AuditLogAspect.java:127`），只按「方法上有注解」匹配，
  与 HTTP 方法无关 ⇒ GET 一样进切面、一样 `saveAsync` 落库。
- 但它的四个取证维度里：`targetId` 只从 `@PathVariable` 取（:278-291）、
  `requestBody` 只从 `@RequestBody` 取（:296-311），而读端点的「读谁」在 query 参数里、
  「读多少」在返回值里 —— 两处都不在视野内。`requestUrl` 还只取 `getRequestURI()`（丢了查询串）。
  于是给悄悄话列表 GET 挂上注解，产出的只是「某管理员某时到过 `/api/v1/admin/whispers`」这一行废话。
- 补齐的两条记录维度（`AuditLogAspect#buildReadScopeSnapshot`，写在本来恒空的
  `audit_log.request_body` 列，不需要新列、不需要迁移）：
  **读选择器**（query 快照，命中既有 `SENSITIVE_FIELDS` 表的键一律 `***`）与
  **读出规模**（`returned` / `total`，认 `AdminPageView` / Spring Data `Page` / `Collection` 三种形态，
  外面可再包一层 `ResponseEntity`）。规模「不可判定」记 `null`，与「确实读到 0 条」分开——
  审计库里这两个值必须长得不一样。
- 写请求口径逐字节不变：有 `@RequestBody` 时仍走 `sanitizeAndSerialize`，绝不出现 `query/read` 键。

### 改动（文件:行）

| 文件 | 改动 |
|---|---|
| `admin/audit/AuditOperation.java:83-97` | 新增 4 个**读/删**操作码：`VIEW_WHISPER`、`VIEW_CONVERSATION`、`VIEW_REAL_NAME_CERTIFICATION`、`DELETE_WHISPER`。此前这张表只有写操作码，等于在枚举层面就否认了「读也需要审计」 |
| `admin/audit/AuditLogAspect.java:128-160` | `result` 提出来在 `finally` 可见（异常路径也要能记「这次没读成」）；`recordAuditLog` 多收一个返回值参数 |
| `admin/audit/AuditLogAspect.java:337-426` | 新增 `isReadMethod` / `buildReadScopeSnapshot` / `resolveReadScale` / `ReadScale`，即上面两条维度；类注释把「GET 能不能用、缺哪条维度、为什么写进 `request_body`」写成可核的论证 |
| `admin/AdminWhisperController.java:190-232` | `AdminWhisperView.of(WhisperMessage, boolean canSeeContent)`：正文那一格改成 `canSeeContent ? m.getContent() : null`，并新增 `redacted` 分量（字段名与私信侧 `AdminConversationView#redacted` 刻意一致，两侧同一套语义）；:67-107 `list()` 取 `adminDataScope.isCurrentSuperAdmin()` 并传给两处映射 |
| `admin/AdminWhisperController.java:66-70,108-110` | `@Auditable(VIEW_WHISPER)` 挂到列表 GET；`@Auditable(DELETE_WHISPER)` 挂到删除（悄悄话单行的破坏性写操作，改造前同样零留痕） |
| `admin/AdminWhisperController.java:44,49-65` | 类注释里那句「刻意不变之处：正文是否脱敏……故本类只补作用域判定，脱敏另议」被替换为新的正文档位口径 + 读留痕说明（旧注释正是这条自相矛盾的书面依据） |
| `admin/AdminConversationController.java:97,150,178` | 三个只读 GET 各挂 `@Auditable(VIEW_CONVERSATION)`；:64-70 补「档位已有、留痕原缺」的口径说明。**主逻辑一行未动**（它的档位口径就是本次的统一到哪去） |
| `admin/AdminRealNameController.java:68-71,112-115` | 列表 GET 挂 `@Auditable(VIEW_REAL_NAME_CERTIFICATION)`；顺手闭合同文件的审核 POST 零留痕（`REVIEW_CERTIFICATION` + `targetType=REAL_NAME_CERTIFICATION`，与同域 `AdminCertificationController#review` 已有做法一致）；:31-48 逐字段写清「哪个列已掩码、哪个列故意不动」 |
| `src/test/.../admin/AdminSensitiveReadAuditStaticGateTest.java` | 新增：形态门 12 例（3 条不变量 + 阳性对照 + 非误伤对照 + 6 组反证） |
| `src/test/.../admin/AdminWhisperContentTierTest.java` | 新增：档位运行期 6 例 |
| `src/test/.../admin/audit/AuditAspectReadDimensionTest.java` | 新增：切面读维度 8 例 |

### 判点

**形态门 `admin/AdminSensitiveReadAuditStaticGateTest`（12 例）**，断言的正是任务口径那句话
「返回 PII 明文列的管理端 GET 必须同时具备档位收紧与审计」：

1. 不变量 1（审计）：`admin/` 下任何引用了 PII 载体类型的 `@GetMapping` 必须带 `@Auditable`。
   PII 载体类型名单不靠我抄一张表 —— `piiCarrierTypesReallyCarrySensitiveColumns`
   逐类回源打开 `entity/WhisperMessage.java` 等文件，断言它今天确实还声明着
   `content` / `idCardNo` / `lastMessagePreview` / `quoteContext` 物列；名单失效即红。
2. 不变量 2（档位）：这些文件里每一次「从 PII 载体实体取正文物列」都必须落在
   **它自己那一格实参**里带 `isCurrentSuperAdmin` / `canSeeContent` 判据。
   粒度是实参不是语句，这条是**被反向变异教出来的**（见下面变异 A 的假阴性记录）。
   接收者按**声明类型**筛（`WhisperMessage m` 这种），不按访问器名字筛，
   所以 `result.getContent()`（`Page<WhisperMessage>` 取分页元素）不会被当成正文出口。
3. 不变量 3（证件号）：`.getIdCardNo()` 只允许出现在已被 `maskIdCardNo` 包住的语句里，
   或出现在 `decrypt*` / `mask*` 变换助手<b>自身方法体内</b>（其出口由调用点的掩码证明）。
4. `gateHasRealTargets`：三条不变量今天各自都有分母（敏感 GET ≥4、正文出口 ≥4、证件号出口 ≥1），
   防止「扫了个空集」被读成「全部通过」。
5. `nonPiiAdminReadsAreNotDraggedIn`：`AdminPostController` / `AdminCommentController` /
   `AdminFeedbackController` 也被扫过且必须零违规 —— 帖子评论正文同名 `getContent()`
   属公开 UGC，把它们拉进分母只会让门长期红或被迫给几十个 GET 挂审计（那就是误伤）。
6. 6 组合成源码反证：合规形态不误伤；摘 `@Auditable` 必红；摘档位三元必红；
   证件号裸奔必红；分页同名 `getContent()` 不误伤；注释里的 `@Auditable`/字样不算数。

**运行期档位 `admin/AdminWhisperContentTierTest`（6 例）**：超管可读正文且 `redacted=false`、
校区管理员 `content==null` 且连 record 的 `toString` 里都不出现正文（顺手封日志泄露面）、
收紧只动正文（元数据/条数照常，审核工作面不断档）、校区轴与档位轴互不替代、
哨兵账号空集、档位来源唯一（把 `isCurrentSuperAdmin` 置 true 就必须读得到正文）。

**运行期审计 `admin/audit/AuditAspectReadDimensionTest`（8 例）**：用盘上真实的
Controller 方法与其 `@Auditable` 实例驱动切面（注解不是我自造的夹具），断言
GET 那一行必须含操作码/操作者/GET/URI/200/query 快照/`returned`+`total`；
`phone`、`idCardNo` 作 query 键必须被掩码且 `***` 而不是被删掉；失败读也必须落痕且
规模记 `null`（≠0 条）；写请求（POST + `@RequestBody`）口径不含 `query/read` 键且手机号仍掩码；
`List` 与 `Page` 两种返回形态的规模都能算出来；不认识的形态必须显式 `null`；
最后一条把「悄悄话列表 + 会话列表/详情/消息 + 实名列表」这 5 个读端点的注解用反射钉一遍。

### 反向变异（串行，红⇒还原⇒哈希对齐⇒复绿）

**变异 A —— 把悄悄话正文那一格的档位三元判据摘掉（退回改造前形态）**
`AdminWhisperView.of`：`canSeeContent ? m.getContent() : null` ⇒ `m.getContent()`

第一次跑出的结果是**半个假阴性**，值得留账：

```
[ERROR] AdminWhisperContentTierTest  Tests run: 6, Failures: 2
  list_campusAdmin_getsNoContentAtAll: 非超管不得拿到任何正文字样
    ==> expected: <null> but was: <只说给你听的悄悄话正文>
  campusScopeAloneDoesNotGrantContent: 校区内≠可读正文，档位轴独立负责
    ==> expected: <null> but was: <只说给你听的悄悄话正文>
[INFO] AdminSensitiveReadAuditStaticGateTest Tests run: 12, Failures: 0   ← 门当时没抓到
```

原因：形态门原先按**整条语句**找档位字样，而视图构造是
`new AdminWhisperView(id, sender, receiver, m.getContent(), status, price, …, !canSeeContent)`，
末尾 `!canSeeContent`（`redacted` 那一格）仍在同一条语句里 ⇒ 被判成「已收紧」。
修法是收紧判点而不是放宽红：门改为**实参粒度**（`enclosingArgument`，正文明文必须由
它自己那一格的判据放行，旁边另一格传了个档位布尔不算数），并把合成夹具改成与盘上同形的
多实参形状，让这条假阴性在反证里也被复现一次。

改门后对同一处变异复跑 ⇒ 门咬住：

```
[ERROR] AdminSensitiveReadAuditStaticGateTest.privateContentColumnsAreTierGated
有 1 处私密正文不经档位判据就离开管理端控制器（同一份私信内容不得因为「走哪个 Controller」而换保密档位）：
AdminWhisperController.java:249 [正文明文出口未过档位] m.getContent(),
==> expected: <[]> but was: <[AdminWhisperController.java:249 [正文明文出口未过档位] m.getContent(),]>
```

- 变异后 `AdminWhisperController.java` sha256：`da761d10a0c0e94d12e651c1351f2ddc3f43d98f5f70d6735e3f96f436b9b62f`
- 还原后 sha256：`8789a9dd16baaa9502af82f26563fa1ea521b3223c8ca095d61671d2b21cb4ab` = 变异前基线，一致

**变异 B —— 摘掉 `AdminWhisperController#list` 上的 `@Auditable`**（正是「硬挂一个空注解」的反面：注解根本没了）

```
[ERROR] AdminSensitiveReadAuditStaticGateTest.sensitiveAdminReadEndpointsAreAudited
有 1 个敏感管理端 GET 没有审计留痕（读 PII 不留痕 ⇒ 事后无法判定泄露规模与责任人）：
AdminWhisperController.java:85 [敏感读口零审计] @GetMapping
[ERROR] AuditAspectReadDimensionTest Tests run: 8, Failures: 5
  sensitiveReadsAreAnnotated: AdminWhisperController#list 是返回 PII 的管理端读口，必须留痕 ==> expected: not <null>
  另 4 例：list 上没有 @Auditable —— 本判点失去被测物
```

- 变异后 sha256：`6038b70e0b12d0aea02d6a9d010ec566544a4e3ff6dbb803383d22726ed4ab1e`
- 还原后 sha256：`8789a9dd16baaa9502af82f26563fa1ea521b3223c8ca095d61671d2b21cb4ab` = 基线，一致

**变异 C —— 把切面里「GET 才补读范围快照」那三行注释掉**（证明本条不是空注解、注解之外还有维度）

```
[ERROR] AuditAspectReadDimensionTest Tests run: 8, Failures: 4, Errors: 1
  这一行审计没有读范围快照 ⇒ 敏感 GET 的留痕退化成「某人某时到过这个 URL」，
  答不出「读了谁、读了多少」——正是本条要封的「硬挂一个空注解」形态 ==> expected: not <null>
```

（第一次跑这一条时红话是 Jackson 的 `argument "content" is null`，读起来像夹具坏了而不是判点红了；
补了 `readSnapshot()` 这一层，把「快照没记」这条语义写成断言 —— 红话必须说清是哪件事坏了。）

- 变异后 `AuditLogAspect.java` sha256：`87a2021b524caa59cd9d4cd9e75b879cec2c9db8fb9d4f5f95929ef7df7c863a`
- 还原后 sha256：`5b7bdb1228759ffd85b7ffe23f4de93fa3c71dddc2813800f665a0cd14ec6de5` = 基线，一致
- 三次变异复绿读数：`AdminSensitiveReadAuditStaticGateTest 12/12 + AdminWhisperContentTierTest 6/6
  + AuditAspectReadDimensionTest 8/8 + 既有 AdminWhisperScopeTest 8/8 = 34/34`

### 实测读数

| 读数 | 值 | 口径 |
|---|---|---|
| 改造前三个敏感 GET 的 `@Auditable` 计数 | **0 / 0 / 0** | `grep -c "@Auditable" AdminWhisperController.java / AdminConversationController.java / AdminRealNameController.java`（W1b 交回时的盘上状态，本次接手复核一致） |
| 改造后带审计的读/删端点 | 5 个 GET + 1 个 DELETE | whisper list、whisper delete、conversation list/`{id}`/`{id}/messages`、realname list（+ realname review POST 顺手闭合） |
| `AuditOperation` 里的读操作码 | 改造前 0 个 ⇒ 改造后 3 个 `VIEW_*` + 1 个 `DELETE_WHISPER` | 枚举里此前没有读类目 ⇒「读也需要审计」在类型层面就不成立 |
| 全仓 `@Auditable` 引用点 | 78 处（均为写操作） | 改动前 `grep -rn "@Auditable" src/main/java \| wc -l` |
| media / feedback 包里的 phone 写入 | 0 / 0 | `grep -rn "phone" src/main/java/com/campuslove/api/{media,feedback}` 零命中 ⇒ 静态门不误伤这两类出口 |
| 悄悄话/私信/实名相关的 admin 文件 | 恰好 3 个 | `grep -rl "WhisperMessage\|PrivateMessage\|PrivateConversation\|RealNameCertification" admin/` ⇒ 门的作用面就是这 3 个文件，不是全后台 |

### 判不出与交接项

- **F-W1b-2-H（前端侧，本车道禁改）**：`apps/admin/src/views/content/Whispers.vue:125`
  直接把 `detailItem.content` 渲染出来。服务端收紧后非超管拿到的这一格变成 `null`，
  页面会显示空白而不是「已隐藏」。同仓 `views/content/Conversations.vue` 已有正确做法
  （据 `redacted` 显示徽标 + `conversations.redacted` 文案），字段名本次刻意对齐成 `redacted`
  就是为了让这条路可以直接照抄。`apps/admin/**` 属本车道禁改面 ⇒ **只交接，不动**，
  并且不给「前端也一起改完」的口头承诺。
- **AUDITOR 档位的读能力**：改造后 AUDITOR 与校区 ADMIN 一样读不到正文（只拿元数据 + `redacted`）。
  审核工作流是否需要「按具体授权放开正文」属产品决策，代码层面现在唯一口径是超管；
  若将来要放开，必须同时新增一条写进 `audit_log` 的授权依据，而不是把三元判据放宽成角色串判断。
- **audit_log 表没有「读规模」这一列**：本次复用 `request_body`（对 GET 本就恒空）承载快照，
  不新增列、不写迁移、不碰 `V2026.11.01.0001`。代价是这一列在 GET 上语义变成「请求内容（脱敏后）」，
  已在切面类注释写明；真要把 `returned/total` 升成可 SQL 聚合的独立列，需 DBA 决策（影子库建不了，
  应用账号无 CREATE 权限，见 MEMORY 实测）。
- **判不出**：真实审计行数需要跑起 real 栈并点一次后台页面才能数（本机无 Docker/Redis）⇒
  本次只证「注解在位 + 切面产出的这一行内容对不对」（用同一切面实现驱动，非真栈）；
  异步线程池 `saveAsync` 在真栈下的丢失率、`audit_log` 写入失败时的降级（`log.warn` 那条路径）⇒ **判不出**，
  与 §4 的启动期负例一起交 W3/部署车道。


## 3. `PhoneBindingController` 第四种 phone 形状 ⇒ 同号重复账号

**W1b 的代码与判点其实已完成（盘上实测），缺的是本条正文与反向变异账；
W1b2 另补了「openid 那一半」的不变量 4。正文如下。**

**现象一句**：`users.phone` 有四种写入形状——注册侧（`RealAuthService#registerUser`）、
后台建号侧（`AdminUserController#createUser/createAdmin`）、换号侧
（`RealAccountSecurityService#changePhone`）都按「不可逆派生键优先 + 明文兜底」查重后写
`phone=密文 / openid=派生键`；而微信绑定侧（`auth/PhoneBindingController#bindPhone`）
改造前是「AES 密文 phone + 本行原有微信 openid + **零查重**」。
同一手机号因此可以既挂在 A 账号（注册来的）又挂在 B 账号（微信绑定来的），静默产生第二个主体；
`uk_users_phone` 挡不住——AES-GCM 随机 IV 让同号码每次密文都不同，密文列上的唯一索引等于没有约束。

### 改动（文件:行）

| 文件 | 改动 |
|---|---|
| `auth/PhoneBindingController.java:118-147` | 绑定前先查重（与三条写入口同一判据：`findByOpenid(derived)` 优先、`findByPhone(明文)` 兜底），命中他人 ⇒ `ResourceConflictException`（409）；命中自己 ⇒ 放行（幂等重绑）。落库改为 `phone=codec.store(...)`，并在本行身份已是派生键时把派生键跟着号码走（`isDerivedKey` 判据），否则旧号码会被一个不再持有它的行占着 |
| `privacy/PhoneColumnCodec.java:64-108` | 派生键前缀字面量收进唯一常量 `DERIVED_PREFIX`；新增 `isDerivedKey(String)`，读取侧判据与写入侧 `derivedOpenid` 同源（别处再写 `startsWith("phone:")` 会在前缀改名/加 pepper 时静默失配，失配方向是「少同步派生键」⇒ 下一任持号者查不到占用） |
| `src/test/.../admin/PhoneIdentityCrossPathDedupTest.java` | 9 例：四条写入路径两两互测（含核心判点「注册先落一行 ⇒ 别的账号微信绑定同号码必须 409」）、密文/明文两条错路各自被替身当场证伪、派生键迁移、边界证据型判点 |
| `src/test/.../privacy/PhoneIdentityCodecExitStaticGateTest.java` | 4 条不变量 + 阳性对照 + 6 组反证 = 11 例（W1b2 补的是不变量 4） |

### 判点与「三条路径覆盖」的裁定（任务点名要判的）

**覆盖结论：不止三条，是四条，且是两两互测而不是各测各的。**
`adminCreated_thenRegister` / `registered_thenAdminCreate` / `registered_thenWechatBind` /
`adminCreated_thenWechatBind` / `changePhone_usesDerivedKeyNotCipher` /
`bind_samePhoneOwnAccount_isIdempotent` / `bind_phoneIdentityRow_migratesDerivedKey`——
换号侧（第四条）也在内。**判据同源的证明方式**是「先由 X 路径落一行，再由 Y 路径撞它」，
而不是四条路径各自断言一句「我查重了」；后者挡不住两条路径查的是不同的键。

**历史明文行仍能被兜住：能。** 每条查重都保留 `findByPhone(明文)` 兜底，
主判据是 `findByOpenid(派生键)`；静态门不变量 3 把「只问明文不问派生键」和
「只问派生键不留明文兜底」两种残缺形态都判成违规（`enclosingStatement` 必须同句含两个查询）。
仓储声明文件 `repository/UserRepository.java` 本身在排除名单里，不算出口。

**「历史密文行」兜不住，且这不是回归而是 schema 上限**：`users.openid` 是
`NOT NULL UNIQUE` 的唯一身份列，微信身份行（openid = 微信 hash）绑定手机号后无处再写派生键 ⇒
注册侧两条判据都查不到它。这一半由
`bindOnWechatIdentityRow_leavesNoDedupeTrace_knownGap` 作为**边界证据型判点**钉在盘上
（断言的是「今天查不到」这个现状，并在注释里写明将来补上派生键时这条必须翻成 present，
判点即门禁），不是口头待办。交接项 F-W1b-3-H：要么加 `phone_hmac` 列，要么改身份列语义 ⇒ schema 决策。

### 「静态门有没有误伤其它出口」的裁定（任务点名要判的）

**没有误伤，但原交付正文里「禁止非 codec 出口写 phone/openid」这句话只对了一半。**
实测拆解：

- 不变量 1（`"phone:"` 前缀字面量只能住在 codec）扫描面是整个 `src/main/java`，
  这条同时管写入与读取（`startsWith("phone:")` 也含该字面量），今天零违规。
- 不变量 2（`.setPhone(` 取值必须出自 codec）今天命中 7 处，全部合规
  （3 处 `codec.store`、2 处初值含 codec 的局部变量、1 处 `null` 建号、1 处 `ERASED_VALUE` 注销）。
- 不变量 3（`findByPhone` 必须与 `findByOpenid` 同句）命中 6 处 + 仓储声明排除 1 处。
- **openid 那一半当时只有不变量 1 间接覆盖**：门禁的是「自创前缀」，
  并不禁「phone 走 codec、openid 随手塞一个别的值」这种**分家写**——
  而分家写正是本条缺陷的成因形状（改造前的微信绑定路径就是：密文 phone + 原微信 openid）。
  ⇒ W1b2 补**不变量 4**：同一段方法体里写了带号码身份的 `phone`，
  就必须成对把 codec 侧来源（`derivedOpenid` / `ERASED_VALUE` / `ErasedValues` 墓碑 / `null`）写进 `openid`。
- **为什么这条不会误伤媒体/反馈签名/订单/第三方登录**：不变量 4 只在该方法体
  同时出现 `.setPhone(`` 时才生效。实测 `media` 与 `feedback` 两个包里
  `setPhone` 出现次数为 0（`grep -rn "phone" src/main/java/com/campuslove/api/{media,feedback}` 也零命中）；
  `VipOrderService:242`（订单自己的 openid）、`DtoMapper:80`（掩码出口，不写实体）、
  `WeChatClient:149`（传输层 DTO）、`ThirdPartyAuthService:214`（第三方身份命名空间）
  所在方法体都不写 `users.phone` ⇒ 不进分母。
  `RealAuthService:770` 的体验账号建号（`setOpenid("guest:"+UUID)` + `setPhone(null)`）
  由「不写号码身份即豁免」这条分支放行，并单独有一组反证钉住它不被误伤。
  这也是我**没有**给门加「全局禁止非 codec 写 openid」那条更宽规则的原因：
  那条规则一上线就会把上述 5 个合法出口全判成违规，只能靠豁免表抹平 —— 那正是本仓禁的「用豁免凑绿」。

### 反向变异（串行）

W1b 交回时本条**没有任何变异账**（原表「反向变异」列写「待填」），故由 W1b2 补做两次。

**变异 E —— 把换号侧的成对派生键改成分家写**
`RealAccountSecurityService.java:190`：`user.setOpenid(newPhoneDerivedOpenid)`
⇒ `user.setOpenid("wx-" + newPhone)`（模拟「phone 走 codec、openid 随手写别的」的原始缺陷形状）

```
[ERROR] PhoneIdentityCodecExitStaticGateTest.phoneIdentityWriteForcesPairedCodecOpenid
有 1 处把手机号身份写进 users.phone 却没把派生键成对写进 users.openid（两条列分家 ⇒ 查重两条判据都问不到 ⇒ 同号重复账号复活）：
com/campuslove/api/auth/RealAccountSecurityService.java:190 [phone 身份未成对写 codec openid] "wx-" + newPhone
==> expected: <[]> but was: <[...RealAccountSecurityService.java:190 [phone 身份未成对写 codec openid] "wx-" + newPhone]>
```

这一条红同时是**不变量 4 的必要性证据**：同一处变异下
`PhoneIdentityCrossPathDedupTest` 9 例**全绿**（它测的是「占用校验问的是派生键」，
不问 openid 有没有跟着走）。也就是说在补这条之前，盘上没有任何东西守得住这个形状。

- 变异后 `RealAccountSecurityService.java` sha256：`ac82083b437255e6561db80079180e4606b02e86eeb516c818d1cc96c73c3652`
- 还原后 sha256：`0a4761ac648b8d53c38480f0ffba96c71a85db94bdc4bf83ffde7ec515b30a82` = 变异前盘上基线，一致
- 红日志 sha256：`3e5737d70f65055760a68280c5ede3197f52cefb2c5f2bad7aae12696d95a8f0`
  （`target/surefire-reports/…PhoneIdentityCodecExitStaticGateTest.txt`）

**变异 G —— 删掉微信绑定路径的整块查重**（退回「零查重」的原始缺陷）：见文末「W1b2 收口读数」补记。

### 实测读数 / 判不出与交接项

- 判点规模：`PhoneIdentityCrossPathDedupTest 9` + `PhoneIdentityCodecExitStaticGateTest 11`（W1b2 +2 例）= 20 例。
- 替身口径：AES 替身刻意让**密文≠明文且每次加密都不同**（等价真实 AES-GCM 随机 IV），
  于是「拿明文/密文做等值查重必然查不到」是测出来的，不是注释里说的。
- **判不出**：`uk_users_phone` 在真库上的实际行为（密文列唯一索引确实挡不住同号多行）
  需要在 MySQL 上插两行同明文不同密文才证得；本机应用账号对 `campus_love` 无写权限、
  影子库建不了（无 CREATE 权限）⇒ **判不出**，交有真环境的车道。
- F-W1b-3-H（交接）：微信身份行绑定手机号后不留派生键 ⇒ 注册侧两条判据都问不到那一行。
  补法二选一：给 `users` 加 `phone_hmac CHAR(64)`（确定性派生，可建唯一索引）或把身份列拆成两张表。
  属 schema 决策，不在本车道动手；判点已按「将来补上就会翻红」写好。


### W1b2 接力补记（任务点名要判的两件事）

**判 1：`DenyAllNearbyPolicy` 有没有把功能打死？—— 没有打死任何在用的功能，
但它确实把「附近的人」这一条**端点**永久关掉了，而这件事原先没人守着。**

- 端点面：`GET /api/v1/location/nearby` 现在恒返回空集。实测它在
  `apps/client/src` 与 `apps/admin/src` **零调用**
  （`grep -rn "location/nearby" apps/client apps/admin --include=*.ts --include=*.vue --include=*.js`
  命中 0 行；`apps/client` 里 `nearby` 字样全是页面名/图标目录名/CSS 类名，见下）。
- 产品面：用户看到的「附近的人」不接这个端点。首页那块走
  `home/HomeController` 的 `nearbyPeople`（`NearbyPersonSummaryView`，带主体），
  寻觅「附近」Tab 走 `RecommendationController`（也带主体）⇒ 恒空集不改变任何现有页面。
  这两个来源在 mock 档是演示数据（`HomeFeedFallbackProvider:50-53` 之类的硬编码人名），
  real 档才走真实推荐，本条不碰。
- 结论：不是「功能坏了」，是「证明不了授权时不假装有权」。但**「暂时关掉」与「永久关掉而没人知道」
  之间只隔一条能被门看见的账**，原交付只有类注释与报告正文（人读），没有门 ⇒ 本次补上。

**判 2：返回体是否已按最小必要裁剪？—— 是，且比任务给的口径更窄。**
实测 `GeoService.java:186-197` 的 `NearbyPerson` 现取值为
`{userId, nickname, avatarUrl, distanceText}`：任务描述里的「校区」这一列
（`campusName`）在改造中已被**删掉**，`GeoServiceNearbyAuthzTest.nearbyPerson_projectionIsMinimal`
用反射把白名单钉成这四元组，并显式禁止 `campusName/phone/realName/idCardNo/latitude/longitude`
出现（`latitude/longitude` 被禁是因为原始坐标能直接反推住所，`distanceText` 才是可给的粒度）。
⇒ 不需要再动，动宽了反而是退化。

**补的半件：把「等待授权列落地」挂成门能看见的 TODO（本仓口径：不许留没人看的口头待办）**

| 文件 | 改动 |
|---|---|
| `location/DenyAllNearbyPolicy.java:11-24` | 类注释加一段带机器可读标记的交接块：`TODO(F-W1b-1-H)：本实现是临时 deny，不是终态`，并把「等待授权列落地」这句写进解除条件标题；同时点名守它的两条判点（摘标记即红、列落地后仍 deny 也即红） |
| `src/test/.../location/NearbySubjectBindingStaticGateTest.java:140-215` | 新增 2 例 + 3 个辅助方法（目录向上找 `database/flyway/sql`，与 `ErasureSchemaAlignmentTest` 同口径，不假设工作目录） |

两条新判点：

1. `denyPolicyCarriesMachineReadableHandoff`：`DenyAllNearbyPolicy` 还在盘上 ⇒ 它必须含
   `TODO(F-W1b-1-H)` 且必须含「等待授权列落地」字样；顺带要求接口注释里
   「`user_agreement_consent` 等现有列都不算这一位」的论证不许被删
   （删了下一个人就会误拿协议同意位放开附近的人）。
2. `consentColumnAndDenyPolicyCannotCoexist`：**双向**门。迁移目录里一旦出现地理曝光同意位
   （候选列名 `nearby_visible` / `nearby_consent_at` / `geo_discoverable` / `location_consent`）
   而 deny 实现仍在 ⇒ 直接红，红话写「功能已被永久打死」；
   另附两条阳性对照防「扫了个空集所以绿」：真目录读不到就抛、
   合成迁移夹具（`ALTER TABLE users ADD COLUMN nearby_visible …`）必须被探测器认出来。

反向变异 D —— 摘掉 `TODO(F-W1b-1-H)` 标记（正是「留一条没人看的口头待办」的动作）：

```
[ERROR] NearbySubjectBindingStaticGateTest.denyPolicyCarriesMachineReadableHandoff
deny-all 是「附近的人」整体关停，必须挂着机器可读的交接标记 TODO(F-W1b-1-H)（本仓口径：不许留没人看的口头待办）。
标记被摘掉而 deny 仍在 ⇒ 下一个人只会看到「这里恒返回 false」，不会知道它在等一列 ==> expected: <true> but was: <false>
Tests run: 8, Failures: 1, Errors: 0, Skipped: 0
```

- 变异后 `DenyAllNearbyPolicy.java` sha256：`4c9e564cf66e140a7629bc85efaa4eef0a70be6173939fa2f164d593286220e4`
- 红日志 sha256：`55e9b76788fe934aea418947817ee8cd8addb9a5563c1bcd48d996f9eb42d8e8`
- 还原后 sha256：`7d890e8950ff3f7603fa679bbaa3c0e469ba31195fbc44997c54e0faabe85e29` = 变异前基线，一致

W1b 自交的两次变异（删授权过滤行、Controller 退回不取主体）本次**复量了哈希**：
`GeoService.java` 盘上实测 `96631f980cb0e16f54fa650d2c2c64372ac134fc7ccb884b6b99bc9d3a689b40`、
`LocationController.java` 盘上实测 `a53137a312e13949f4b7d9fbd81b7efe4dbc2ab9e41698407e5847017156dffa`，
与其「还原后 sha = 改前基线」的记载**逐字对齐** ⇒ 那两次变异账成立，不重做。
判点规模由 21 例增至 23 例（静态门 6 ⇒ 8）。

## 4. F-07 fail-fast 判点缺失 + 503 分支不可达

**现象一句**：`RealAccountSecurityService#failFastIfErasureServiceMissing()` 挂着
`@jakarta.annotation.PostConstruct`，但第五轮 A 车道实测 `grep PostConstruct src/test` = 0
——把注解整行删掉全量仍绿，即「钩子会被容器调用」没有任何判点在守；
同档装配（本类与 `AccountErasureService` 都是 `@Profile("real") @Service`，无其它条件）
使「清除服务缺席 ⇒ 503」这条运行期分支在生产不可达。

### 改动（文件:行）

主代码**一行没动**（`RealAccountSecurityService.java` 改前/改后 sha256 相同，
`27805212547ee5cea7741b547cf8d54811d0b437896554fa96260bb1b606336b`）：这条的动作是补判点，
不是改口径（上一批 W1 定的「缺席 ⇒ 503 且不写墓碑」保持不动）。

| 文件 | 改动 |
|---|---|
| `apps/api/src/test/java/com/campuslove/api/auth/AccountErasureFailFastWiringTest.java` | 新增 4 例：注解在位 + 真容器 refresh 失败 + 反向对照 + 钩子直调 |

判点设计（三层，缺一层就退化成「钉自己的 mock」）：

1. `failFastHookIsBoundToTheContainerLifecycle`：反射断言该方法带 `@PostConstruct`、
   无参、非 static、方法自身不再挂 `@Profile`。
2. `containerFailsToStartWhenErasureServiceAbsent`：起真实 `AnnotationConfigApplicationContext`
   （`activeProfiles = real`，与生产同档），只注册六个协作者替身、**不装** `AccountErasureService`，
   断言 `refresh()` 抛异常，且异常链同时满足两点：含 bean 名 `realAccountSecurityService`、
   含本类自检原文（「启动失败优于静默半注销」/「注销只能写 users 墓碑」）——
   防止别的装配错误冒充成这条的绿。
3. `containerStartsWhenErasureServicePresent`：同一套脚手架把 `AccountErasureService` 装上 ⇒
   refresh 成功。这一格是第 2 条的阳性对照，没有它第 2 条可能只是在钉我自己的容器代码。

### 判点与反向变异红原文 + sha

反向变异 = **删掉 `@jakarta.annotation.PostConstruct` 这一行**（正是 A 车道说「没人守」的那个动作）：

```
[ERROR] Tests run: 4, Failures: 2, Errors: 0 -- in com.campuslove.api.auth.AccountErasureFailFastWiringTest
failFastHookIsBoundToTheContainerLifecycle:
  @PostConstruct 被摘掉后，real 档缺 AccountErasureService 就不再让启动失败，
  而是等到用户点注销时才静默半注销——这正是第五轮判 P0 的旧状态 ==> expected: not <null>
containerFailsToStartWhenErasureServiceAbsent:
  装配漂移必须变成「应用起不来」，而不是运行期静默降级
  ==> Expected java.lang.Exception to be thrown, but nothing was thrown.
```

- 变异后 `RealAccountSecurityService.java` sha256：`2bb274caaf85064c5fdfeb59949b5231dfc3f1bd835731dda060cbd15f984de8`
- 红日志 sha256：`233125c3804124c12bc071b6fce81eb90dcd3fdd090cee27613d5a38fbc3d731`
- 还原后 sha256：`27805212547ee5cea7741b547cf8d54811d0b437896554fa96260bb1b606336b` = 改前基线，一致
- 复绿读数：`AccountErasureFailFastWiringTest 4/4 + 既有 RealAccountSecurityServiceTest 14/14 = 18/18`

### 对 503 分支的明确裁定：**保留，定性为纵深防御，由上面的启动期判点守**

理由（可核）：

1. **不可达是被证明的，不是被猜的**：`AccountErasureService` 是 `@Profile("real") @Service`
   且无 `@Conditional*`；`RealAccountSecurityService` 同档 ⇒ real 档下 bean 必然在场，
   缺席会在 `@PostConstruct` 阶段变成启动失败，走不到 `requireErasureService()`。
2. **删掉它的代价比留着大**：删运行期分支 = 把依赖从 `ObjectProvider` 改成必填 bean 参数。
   那会 (a) 推翻上一批 W1 已定并已有判点的口径（`RealAccountSecurityServiceTest
   #deactivate_missingErasureServiceFailsLoudlyInsteadOfFakeTombstone` 断言「缺席 ⇒ 503 且一个字段都不改」）；
   (b) 让注销路径失去「取不到就整体回滚」这道闸，改成「构造期就假定一定拿得到」；
   (c) 将来若给 `AccountErasureService` 加条件装配（例如 `@ConditionalOnBean(JdbcTemplate)`、
   改档位、换 scoped proxy），503 立刻变成唯一还能 fail-closed 的地方，删了就没人兜。
3. **「没人守又走不到」这个状态已经消除**：现在守它的是启动期判点（注解在位 + 真容器必红），
   即「这条分支的前置条件（bean 缺席）一旦真的出现，应用在启动期就被拦住，
   且这件事本身有能红的判点」。
4. **翻转条件写清楚**：若将来 `AccountErasureService` 变成条件装配（可能缺席），
   本裁定作废——那时应把启动期 fail-fast 改成条件化的（只在装配了本类时校验），
   并把 503 升格为可达路径重新补一条端到端判点。

### 实测读数 / 判不出与交接项

- `grep -c PostConstruct src/test/java`（改动前）= 0（A 车道结论复现）；改动后 = 1 个新类的 2 处引用。
- 全量 maven 读数见文末（本条不含主代码改动，风险集中在新增容器测试是否会拖慢/污染上下文）。
- **判不出**：真机上 `@PostConstruct` 是否被 `CommonAnnotationBeanPostProcessor` 处理，取决于生产
  Boot 版本的自动配置（本机无 Docker、跑不起真栈）。本判点用的是**同一容器实现**
  （`AnnotationConfigApplicationContext`）而不是真栈，因此证的是「注解语义 + 本类判定」，
  不证「真栈一定装了这个 BeanPostProcessor」——这条属未闭合的边界，交接给 W3/部署车道：
  在 real 档冷启动冒烟里加一条「故意不给 privacy 包扫描 ⇒ 启动必须失败」的负例。

## 接线三件套

（待补）

## 遗留债

（待补）
