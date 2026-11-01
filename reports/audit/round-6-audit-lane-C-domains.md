# 第六轮审查 · C 车道：后端业务域正确性

- 审查对象：`apps/api/src/main/java/com/campuslove/api` 下业务域（chat 45 / village 42 / growth 33 / discover 28 / wallet 15 / search 15 / match 15 / verification 13 / campus 12 / media 12 / mq 10 / vip 9 / feedback 9 / official 7 / whisper 5 / shop 4 / tasks 4，文件数按实际 find 复量，与派单一致）
- 基线：HEAD `74e681ca32afba2d44d69ae0adf36ff279e6cb24`
- 方法：静态走查 + 读既有测试判「有没有判点」；未跑 maven、未连数据库（并发/真库类结论一律标「判不出」）
- 车道分工：第五轮已覆盖隐私清除轨、限流轨、钱轨（客户端侧）。本轮覆盖业务域本身，钱轨只做交叉复量不重复立项。
- 落盘纪律：本文件先建骨架，每条发现证完立刻追加正文（上一程两条车道攒着最后写，撞 150 轮上限导致报告全无）。

## 判据口径（写死，避免后文歧义）

- 「服务端幂等」= `@Idempotent` 注解（由 `config/WebConfig.java` 注册的拦截器识别）。客户端 `services/http.ts` 自造的键只有在服务端拦得住时才有意义。
- 「业务唯一键」= 库表 unique 约束 / 主键复用 / upsert / 状态机 CAS 更新，能独立于拦截器挡住重复行。
- 「有判点」= 仓库内存在能因该缺陷而变红的测试或门；否则注明「无判点」并说明它属结构命题还是行为命题。

## 发现目录（逐条闭合后追加正文）

| 编号 | 主题 | 状态 | 严重度 |
|---|---|---|---|
| C1 | 幂等覆盖度：非钱轨写端点缺 `@Idempotent` 且无业务唯一键 | 已证（并纠正派单前提：键每请求一新，注解本就不防双击） | 中高 |
| C2 | 配额/计数器一致性：读改写窗口与超发 | 已证（唯一残留＝growth 社交升温 6 计数；签到/活动/关注/圈子已原子化） | 中 |
| C3 | 状态机：feedback 工单 | 已证（终态可回退 ⇒ 重复转化） | 中 |
| C3b | 状态机：match 心动信号 | 已证（无迁移守卫 + 接受只置旗标） | 中 |
| C4 | 分页与排序注入面 | 已查，**无发现**（全部 `@Max` 收敛、排序皆字面量） | - |
| C5 | 时区与「今天」口径 | 已查，**无发现**（real 侧 46/46 走 `TimeZones.BUSINESS`）；纠正派单前提：盘上不存在 `tz-ratchet` 门 | 低（无人守） |
| C6 | N+1 与外呼入事务 | 已证（`WeChatPushService` 三处外呼仍在事务内，上一轮只剪了调用方） | 中高 |
| C7 | 错误语义 | 已证（`IllegalStateException`→500、余额不足 400/409 死分支、业务提示塌缩）；泄漏侧复量＝达标 | 中 |
| C8 | 预留位 | **作废**（无第 8 条证据强度达标的发现，不凑数） | - |

verification / vip / whisper 三域走完了但都判为闭合，故不占编号，结论随附（含一处待复量）：
- `verification`：状态机闭合。`RealRealNameCertificationService.java:120-128`（PENDING 重复提交 409、
  APPROVED 拒绝重复提交、仅 REJECTED 允许覆盖）、`:186-192`（仅 PENDING 可审核、审核结果二值白名单）。
  唯**缺 APPROVED→吊销** 迁移：`AdminRealNameController.java:112` 只有 `/{id}/review` 一条写入口，
  而 `review()` 要求来源态为 PENDING ⇒ 实名通过后无法回收 `user_basic_profile.idCardVerified`
  （`RealRealNameCertificationService.java:203-211` 只置 true，无置 false 的通道）。
  这条属「产品缺口」而非「正确性缺陷」，且需要产品裁决迁移语义，故记在此处不占编号。
- `vip`：有全仓最完整的迁移表（`VipOrderService.java:97-101`
  `PENDING→{PAYING,CLOSED,FAILED}`、`PAYING→{SUCCESS,CLOSED,FAILED}`、`SUCCESS→{REFUNDING}`、
  `REFUNDING→{REFUNDED}`）与 `applyTransition` 范式；退款侧 `:519,536` 有终态短路。
  两处绕过迁移表的直接 `setStatus`（`:306`、`:543`）各自有前置状态判断兜住 ⇒ 未立项。
  订单/回调幂等属钱轨，第五轮已证，本轮不重复。
- `whisper`：幂等与状态机均闭合（`client_request_id` NOT NULL + uk + `findByClientRequestId` 回放，
  `RealWhisperService.java:99-108`；日上限/配对唯一/实名前置 `:111-129`），且客户端已把键生成提升到
  `handleSend` 之外复用。**一处待复量**：回放路径 `:106-107` 对 `PAY_FAILED` 记录也直接 `return toView(existing)`，
  即「扣费失败的历史行」被当作成功回放返回；客户端注释（`WhisperComposeSheet.vue:56-58`）已自认并靠
  失败换键规避。是否要在服务端按 status 拒绝回放，需产品裁决 ⇒ 记此，未单列。

## 发现 C1（已证）：服务端 `@Idempotent` 在语义上拦不住「双击」，非钱轨的实际防线只剩数据库唯一键——而 4 类写端点两侧都缺

严重度：中高（重复行污染运营口径；钱轨已由唯一键 + REQUIRES_NEW 闭合，不在本条范围）

### 先纠正一个前提：`@Idempotent` 不是防双击的机制

`IdempotentInterceptor` 的键来自请求头，按 `idempotent:{key}:{userId}` 做 SETNX
（`common/IdempotentInterceptor.java:165-194`），命中即 409。键由谁生成决定了它防什么：

- `apps/client/src/services/http.ts:314-342` 明确写着键标识「一次逻辑调用」，
  且注释自己给出结论（原文 340-342）：
  > 因此「双击/连点」= 两个独立逻辑操作 = 两次都放行，这是有意取舍：
  > 防连点是页面职责（submitting 标志 + 成功即清表单…），服务端幂等键不再替页面兜底。
- 实现见 `http.ts:344-358`（`generateIdempotencyKey`）与 `http.ts:433-442`（每次调用 `operationSeq += 1` + UUID）。

⇒ 判「双击/重试是否可造成重复入账/重复行」时，注解在不在**不是判点**，
业务唯一键在不在才是判点。本条因此按唯一键覆盖度来数。

### 覆盖度实测（可复现口径）

对 `apps/api/src/main/java/com/campuslove/api` 下 **非 admin** 的 66 个 `*Controller.java` 逐文件扫描：
以「注解块绑定到其后第一个方法签名」为归属规则、剔除注释行（注释里出现 `@Idempotent` 的有 3 处，
如 `village/VillageController.java:290`、`wallet/WalletController.java:500`，按窗口取会误判）：

- 写端点（POST/PUT/PATCH/DELETE）共 **142** 条
- 带 `@Idempotent`：**51** 条
- 不带：**91** 条

其中「发内容/领奖励/发通知/举报」类不带的，逐条核数据库唯一键后的分布：

| 端点 | 位置 | 服务端注解 | 业务唯一键 | 双击/并发后果 |
|---|---|---|---|---|
| 举报 | `report/ReportController.java:68` 有注解；但 `entity/Report.java:22` 是 `@Table(name = "reports")`，**无 uniqueConstraints** | 有（对双击无效） | 无 | 同一用户对同一目标重复举报 ⇒ 多行；按行数做的处置阈值/运营计数虚高 |
| 官方号消息 | `official/OfficialAccountController.java:87` POST `/{code}/messages` | 无 | 无 | `OfficialChatService.java:49,57` 每次写 **2 行**（用户消息 + 助手回复），双击 ⇒ 4 行，会话历史重复 |
| 错误上报 | `report/ErrorReportController.java:66` | 无 | 无（按设计每行一条） | 重试 ⇒ 重复行，仅 IP 限流 `@RateLimit(capacity = 20, refillTokens = 2)` 兜 |
| AI 生成 | `ai/AiVideoController.java:81,101` | 无 | 有日配额（`tryConsumeDailyQuota`，同文件 131） | 双击 ⇒ 两次真实上游调用 + 两次扣配额（有 `@RateLimit`） |
| 访客记录 | `match/MatchController.java:261` POST `/visit` | 无 | **有**：`database/flyway/sql/V2026.05.21.0002__create_visitors_table.sql:7` `UNIQUE KEY uk_visitors_visitor_visited_date (visitor_id, visited_user_id, (DATE(created_at)))` | 不会重复行；但 `match/MatchRecorder.java:262` 的 `existsTodayVisit` 是查后写，并发时第二次撞唯一键 ⇒ 走 `GlobalExceptionHandler.java:507-514` 返回 **409「数据冲突，可能存在重复或违反约束的数据」**（用户可见的无意义文案；同仓 `RealCheckInService.java:476-480` 对同一形状是 catch DVE 后转友好文案，此处没有） |
| 活动报名 | `discover/ActivityController.java:86,101` 有注解；`RealRecommendationService.java:256-258` | 有 | **有**：`V2026.05.23.0001__create_activity_enrollments.sql:8` `uk_enrollment_activity_user` | 不产生重复行。但 `entity/ActivityEnrollment.java:21` 仅 `@Table(name = "activity_enrollments")` 未声明该约束 ⇒ 实体映射与 DDL 漂移（见下方结构注记） |
| 签到 / 补签 / 任务领奖 / 邀请奖励 / 悄悄话 / 草稿 / 圈子收藏点赞 | `entity/CheckIn.java:36-39`、`entity/TaskClaim.java:35-38`（`uk_task_claim_user_code_date`）、`entity/InviteReward.java:27`、`entity/WhisperMessage.java:31,57`（`client_request_id` NOT NULL + uk）、`entity/PostDraft.java:26`、`entity/PostLike.java:23`/`PostFavorite.java:23` | 混合 | **均有唯一键** | 判为闭合。悄悄话额外有客户端把 `clientRequestId` 提升到 `handleSend` 之外复用（`components/discover/WhisperComposeSheet.vue:80,103,116`），是本仓唯一真正做到「双击合并」的非钱轨链路 |

### 结构注记（同一条根因的两侧）

1. 有 6 张表是「DDL 有唯一键、JPA 实体不声明」：`ActivityEnrollment`、`Visitor`（`entity/Visitor.java:21`）、
   `PostReportController` 相关表等。`ddl-auto: validate` 不会因此报错，但任何以实体为准的代码走查/新代码
   （包括 `spring.jpa` 生成的测试库、H2 夹具）都不会有这层保护 ⇒ 「测试绿、生产不重复」的假象来源之一。
2. `common/Idempotent.java:39` 是 `@Target(ElementType.METHOD)`，而
   `IdempotentInterceptor.java:127-129` 还去读类级注解：
   ```java
   if (annotation == null) {
       annotation = handlerMethod.getBeanType().getAnnotation(Idempotent.class);
   }
   ```
   该分支恒为 null（注解不能标在类上）⇒ 死代码；若有人按注释「兼容未来扩展」去加类级注解，
   编译期即失败，运行期静默不生效。

### 影响

- 举报、官方号消息两处：**确证的重复行**，且都进了运营可见的口径（举报计数、官方号会话记录）。
- `/visit`：不重复入账，但双击给用户返回无业务含义的 409 文案，且 `NEW_VISITOR` 互动事件在
  `MatchRecorder.java:271-272` 与首次请求重复不了（唯一键挡住），所以只有文案问题。
- 全局：91/142 条写端点没有服务端幂等，实际防线是「唯一键（多数有）+ 页面 submitting 标志（B 车道范围）」。
  派单里「客户端会自造键但服务端只认自己那套」这句话需要修正为：
  客户端造的键**每次都是新的**，所以服务端那一套只在网络重试/401 重发时生效。

### 判据归属：现有哪扇门能抓住

- 抓不住。仓内没有「写端点必须有 @Idempotent 或业务唯一键」这类结构门；
  我 grep `scripts/`、`tools/`、`.github/workflows` 未发现相关审计（`tools/audit-prod-ratchet.mjs` 是依赖漏洞棘轮，不是这条）。
- 本条属**结构命题**，可落门：对非 admin 的 POST/PUT 方法，要求
  （a）方法体/其 service 路径存在 `findBy...` + 唯一键声明，或（b）显式豁免清单。
  纯静态即可判，不需要并发或真库。
- 「双击是否真的产生两行」是**行为命题**，必须并发压测或唯一键存在性证明；我只给了唯一键存在性（盘上 DDL 可核）这一半。

### 建议修法

1. `reports` 表加 `uk_report_reporter_target (reporter_id, target_type, target_id)`（重复举报改累加 `hit_count` 而不是插行）。
2. `OfficialChatService.sendMessage` 入口加 `clientRequestId`（照抄 whisper 的形状：NOT NULL + uk + 查后返回既有两行）。
3. `MatchRecorder.recordVisit` 按 `RealCheckInService.java:476-480` 的既有写法 catch `DataIntegrityViolationException` 转 `return`（幂等语义，别外抛 409）。
4. 把 DDL 已有唯一键的 6 张表在实体 `@Table(uniqueConstraints=...)` 上补齐声明，使映射自证。
5. 删掉 `IdempotentInterceptor.java:127-129` 的死分支或给 `@Idempotent` 加 `ElementType.TYPE`（二选一，别留着误导）。

---

## 发现 C2（已证）：growth 社交升温 6 个计数器仍是实体读-改-写，并发增量被 `@Version` 冲突 + 空 catch 静默吞掉

严重度：中（漏斗数据系统性偏低；无资金/隐私影响）

### 现象

本仓在 2026 年多轮修复里已经把「实体读-改-写计数」统一改为数据库侧单条 UPDATE
（可检索到的锚点：`village/VillageInteractionService.java:147-149` FIN-00018、
`discover/RealRecommendationService.java:271-272` FIN-00040、
`profile/FollowService.java:145-148` infra R2-00263、
`repository/MakeUpQuotaRepository.java:29-44` P0-24）。
`growth/RealSocialProgressService` 是唯一没跟上的一组：6 个计数全部 `set(get()+1)`。

### 证据

`growth/RealSocialProgressService.java` 六处（原文）：
```java
99:   progress.setExposureCount(progress.getExposureCount() + 1);
119:  progress.setLikeCount(progress.getLikeCount() + 1);
143:  progress.setMatchCount(progress.getMatchCount() + 1);
166:  progress.setChatCount(progress.getChatCount() + 1);
189:  progress.setCircleCount(progress.getCircleCount() + 1);
212:  progress.setActivityCount(progress.getActivityCount() + 1);
```
- 单行实体：`entity/SocialProgress.java:31` `@Column(name = "user_id", nullable = false, unique = true)` ⇒ 一个用户一行，是热点行。
- 该实体**有乐观锁**：`entity/SocialProgress.java:82-83` `@Version` ⇒ 同用户并发时不丢更新而是抛 `OptimisticLockException`。
- 抛完之后被谁吞掉：`discover/RecommendationCacheManager.java:121-127`
  ```java
  if (socialProgressService != null && !views.isEmpty()) {
      try {
          socialProgressService.recordExposure(userId);
      } catch (RuntimeException e) {
          // 埋点失败仅记录日志，不阻断推荐返回
      }
  }
  ```
  catch 体里**没有任何日志调用**（`e` 未使用），注释与代码不符；同一形状在 `RecommendationCacheManager.java:283-289` 又出现一次。
  ⇒ 失败的增量既不落库也不可观测。
- 层级由计数直接推导：`RealSocialProgressService.java:~470`（`determineTier`）按 `likeCount>=1 → L2`、
  `activityCount>=1 → L6_SCENE` 逐级判定，`evaluateAndUpgradeTier` 只在该方法被调用时评估
  ⇒ 被吞掉的那次事件既不计数也不评估。

### 影响

- `exposure_count` 在每次「缓存 miss 的真实推荐计算」时 +1（`getCachedRecommendations` /
  `getRecommendationsWithExclude` 两个入口），同一用户多端/预取并发 ⇒ 计数偏低。
- 计数偏低只影响层级展示（L1..L6 漏斗）与管理端统计口径，不影响发币或解锁 ⇒ 严重度中。
- 真正的风险是**静默**：`like/match/chat/circle/activity` 四个 record 的调用点也全部包在
  `try/catch (RuntimeException)` 里（`match/RealMatchService.java:362,377`、
  `chat/RealPrivateMessageService.java:378`、`discover/RealCircleService.java:364`、
  `discover/RealRecommendationService.java:295`），所以任何持续失败都不会暴露。

### 关于派单里点的两类形状的复量结论（避免误读）

- 「`Math.max(0, x-1)`」在**生产路径**上只剩两种无害用途：
  (a) 作为 bulk UPDATE 的 `CASE WHEN ... ELSE 0 END` 之后的**响应视图本地值**
  （`VillageInteractionService.java:191,202` 明确注释「仅用于本次响应（实体已 detached）」）；
  (b) `entityManager == null` 的**单元测试构造器回退分支**（`RealRecommendationService.java:329`、
  `VillageInteractionService` 的 `@Deprecated` 构造器 `:130-139`）。
  所以派单担心的「先减到负/超发」在动态扣减侧已被原子 UPDATE 闭合。
- 「先查后写的窗口」确有一处但**已按 P0-24 改成原子**：`growth/RealCheckInService.java:431-433`
  仍在 UPDATE 前读 `quota.getUsedCount() >= quota.getLimitCount()` 做前置判断，
  真正的裁决是 `:484-489` 的 `incrementUsedCount` 影响行数（0 则抛错回滚）⇒ 前置读只是快路径，不构成超额补签。
  同方法里扣积分（`:447-450`）早于配额原子递增，靠同一事务回滚兜住——
  **该兜住是否成立取决于 `walletService.deduct` 的传播级别**，我未展开核（列入判不出）。

### 判据归属：现有哪扇门能抓住

- 现有门抓不住：`RateLimitKeyAuditTest`、`P0SecurityIntegrationTest` 一类结构门不扫计数写法；
  单测全部是单线程直调，`@Version` 冲突在单线程下永不出现。
- 本条两半分别是：
  - 「6 处读-改-写」= **结构命题**，可落门（grep `set\w+Count\(get\w+Count\(\) *[+-] 1\)` 在非 admin、非 deprecated-fallback 分支命中即红）。
  - 「并发下确实丢增量」= **行为命题**，需要双线程 + 真库才判得出（本车道不许，标判不出）。

### 建议修法

1. 照 `MakeUpQuotaRepository.incrementUsedCount` 的形状给 `SocialProgressRepository` 加 6 个
   `@Modifying` 原子 UPDATE，`RealSocialProgressService` 只保留「重查后评估层级」的读侧。
2. `RecommendationCacheManager.java:124-127,286-289` 两个空 catch 至少补 `log.debug/warn`，
   否则注释「仅记录日志」是空头承诺（本仓已有同类纠偏先例：`RealCheckInService.java` 的失败一律有名）。

---

## 发现 C3b（已证）：match 心动信号 status 无迁移守卫——过期/已拒信号可被复活，且「接受」只有旗标没有业务动作

严重度：中（下游推荐集合与管理端统计被静默改写；无资金）

### 证据

`match/MatchRecorder.java:294-323`（原文，两个方法体除 `setStatus` 外无任何状态判断）：
```java
@Transactional
public void acceptHeartSignal(Long signalId, Long userId) {
    HeartSignal signal = loadSignalAndVerifyParticipant(signalId, userId);
    signal.setStatus(SignalStatus.accepted);
    ...
@Transactional
public void declineHeartSignal(Long signalId, Long userId) {
    HeartSignal signal = loadSignalAndVerifyParticipant(signalId, userId);
    signal.setStatus(SignalStatus.declined);
```
`loadSignalAndVerifyParticipant`（`:316-323`）只校验「调用方是参与方」，**不校验当前 status、不校验 expires_at**。
状态取值见 `entity/HeartSignal.java` 注释 `:47`：`pending/accepted/expired/declined`；
表 `:39-52` 只有普通索引（含 `idx_heart_signals_status`），**无任何唯一键**，所以迁移合法性完全依赖代码——而代码没有。

三条可推导的越界迁移：
1. `expired → accepted`：过期任务把信号置 expired（`match/RealMatchService.java:576` 用
   `SignalStatus.pending, SignalStatus.expired, now` 批量刷），但接受端不看 `expires_at`，
   用户点旧卡片即可复活。
2. `accepted → declined`：管理端与推荐侧都在读 accepted 集合
   （`discover/RecommendationRanker.java:449`、`discover/RecommendationStrategy.java:331`、
   `match/MatchEngine.java:112` 三处 `findByUserAIdOrUserBIdAndStatus(..., SignalStatus.accepted)`；
   `chat/TempChatSessionService.java:555` 更直接以 `signal.getStatus() != accepted` 作为拒绝条件），
   一次 decline 会静默把已建立的关系从这些集合里摘掉。
3. `declined → accepted`：同一入口反向可复活，且 `AdminRealName` 那种终态守卫在这里不存在。

第二层问题：**accept 不产生任何业务动作**。`acceptHeartSignal` 全方法只有 `setStatus` + `setUpdatedAt` + `save`
（`:298-303`），既不建 match、不发 `MatchEventMessage`、也不通知对方（对比同文件
`recordVisit` `:269-278` 会写事件 + 发 MQ）。⇒ 「接受心动信号」的产品语义是「只收回旗标不置后续态」的形状，
派单 C3 担心的「失败分支只收回旗标」在这里表现为**成功分支只收回旗标**。
注：`SignalStatus.accepted` 确实被推荐侧读（上面三处），所以 accept 并非完全无副作用，
它会改变推荐池过滤 —— 但这既没有测试固定，也没有文档声明（我已通读 `:292-323` 上方注释，只写「（status=accepted）」）。

### 影响

- 复活/撤销是**无审计**的：`AdminRealNameController` 那条链有 `Auditable`，这里连管理端入口都没有，纯用户侧。
- 端点无 `@Idempotent`、无 `@RateLimit`（`match/MatchController.java:282-299` 三个 POST 全部裸），
  双击 ⇒ 两次 UPDATE（同值，幂等无害）⇒ 本条不是重复行问题，是**迁移不设限**问题。

### 判据归属：现有哪扇门能抓住

- 抓不住。`apps/api/src/test` 下我 grep 到的信号相关断言只有
  `match/MatchPolicyTest.java`（rewind 配额）与 `:515` `ErrorMessages.SIGNAL_INVALID_OR_EXPIRED_PREFIX`
  这条**已存在但只被 `chat/TempChatSessionService.java:551,556` 使用**的消息常量——
  即「信号无效或已过期」的判断在 temp-chat 链路里做了，在 accept/decline 链路里没做。
  这是本条最强的证据形状：**同一个谓词，一处有一处无**。
- 属**结构命题**（可静态判：写 `HeartSignal.status` 的调用点必须在赋值前读旧值并拒绝非法来源态）。
  「过期信号是否真的在库里还能被接受」需真库造一条 expired 行 ⇒ 行为侧标判不出。

### 建议修法

1. `acceptHeartSignal`/`declineHeartSignal` 复用 `TempChatSessionService.java:551,556` 已有的谓词
   （pending 且未过期才允许 accept），失败抛既有 `SIGNAL_INVALID_OR_EXPIRED_PREFIX`。
2. 引入本仓 `vip/VipOrderService.java:97-101` 已有的 `Map<From, Set<To>>` 迁移表范式，
   把 pending→accepted/declined/expired、expired→(终态) 写死，accept 后禁止 decline。
3. 若「接受即匹配」是产品意图，accept 应像 `recordVisit` 一样发 MQ 事件；若不是，请在方法注释写明
   「仅置状态，供推荐过滤读」，避免下一轮审查再次误判为漏实现。

---

## 发现 C4（已证，结论为「未发现问题」）：分页有上限、排序无注入面

- 非 admin 列表端点的 `size` 一律 `@Min(1) @Max(100)`（或 `@Max(50)`）：
  `village/VillageController.java:78,187,198,315,393,436`、`chat/NotificationController.java:86`、
  `chat/PrivateMessageController.java:81`、`discover/CircleController.java:96`、
  `search/PostSearchController.java:52`（`@Max(50)`）。
  Spring Boot 3.3.1（`apps/api/pom.xml:9`）= Framework 6.1，控制器方法参数约束**内置生效**，
  不需要类级 `@Validated`（非 admin 的 66 个控制器里确实普遍没有 `@Validated`，只有 admin 侧加了，
  所以我没有把「缺 @Validated ⇒ 约束失效」写成发现——它在本版本不成立）。
- 排序字段全部是**字面量**，用户可控的 `sortBy` 只做白名单二选一：
  `village/VillageQueryService.java:203-208`（`"hottest".equals(effectiveSort) ? Sort.by(DESC,"likesCount") : ...`）。
  全量 grep `Sort.by(` 非 admin 命中 12 处，无一处拼接变量；`ORDER BY " +` 形式的 JPQL/原生拼接 0 处。
- 无上限 `findAll()` 在非 admin 侧只有 4 处，其中 3 处是小配置表（`growth/RealAppConfigService.java:142,149`、
  `clientconfig/ClientDbConfigController.java:118`），1 处是**测试回退分支**：
  `village/VillageQueryService.java:777-782` 的 `userCampusProfileRepository.findAll()` 只在
  `entityManager == null`（旧测试构造器）时走，Spring 注入路径走 `:784-787` 的投影查询 ⇒ 不构成生产风险。
- 结论：C4 判点无发现。留一条待观察：`village/HotScoreScheduler.java:132` 在定时任务里
  `postRepository.findAll(PageRequest.of(page, size))` 全表翻页扫，属批处理设计选择，非用户可控。

---

## 发现 C5（已证，结论为「口径统一」+ 一条前提纠正）：日期边界全部走 `TimeZones.BUSINESS`

- 口径定义：`common/TimeZones.java` 仅一个常量 `BUSINESS = ZoneId.of("Asia/Shanghai")`，注释「与 DB serverTimezone 对齐」。
- 实测 `LocalDate.now(` 全量 46 处，其中不带 zone 的只有 2 处，都在 mock：
  `tasks/MockTaskService.java:48,85`（`String todayKey = TASK_DAILY_CHECKIN + "#" + LocalDate.now();`）。
  real 路径逐条核过：
  - 签到：`growth/RealCheckInService.java:398` `LocalDate today = LocalDate.now(TimeZones.BUSINESS)`
    （同文件 `:201`、`:340` 另外两处「今天」同口径），
    补签窗口 `:399` `today.minusDays(MAKE_UP_MAX_DAYS_BACK)`，跨天边界以「`!targetDate.isBefore(today)`」拒绝当天与未来（`:402-404`），
    超窗拒绝在 `:406`。
    重复签到另有 `entity/CheckIn.java:36-39` `uk_checkin_user_date` 兜底（`:476-480` 还把 DVE 转成友好文案）。
  - 每日问题：`discover/RealDailyQuestionService.java:78-80` 缓存键与查询都用
    `T(java.time.LocalDate).now(T(...TimeZones).BUSINESS)`，题目切换日 = `entity/DailyQuestion.java:30` `question_date` 唯一。
  - 推荐配额日键：`growth/RecommendQuotaService.java:105,130` `LocalDate.now(TimeZones.BUSINESS).format(yyyyMMdd)`，
    Redis TTL 36h 覆盖跨天（`:48`）。
  - 悄悄话日上限：`whisper/RealWhisperService.java:116` `LocalDateTime.of(LocalDate.now(TimeZones.BUSINESS), LocalTime.MIN)`。
  - 访客日去重：`match/MatchRecorder.java:261` 同样用 BUSINESS，与 DDL 的
    `uk_visitors_..._date(..., (DATE(created_at)))`（`V2026.05.21.0002:7`）关系见下方残留风险。
- **前提纠正**：派单说「本仓有一道 `tz-ratchet` 门守着无时区 now()」。我在
  `scripts/`、`tools/`、`.github/workflows`、`apps/api/src/test` 四处检索
  （关键词 `tz`、`ratchet`、`LocalDateTime.now()`、`ZoneId.systemDefault`、`Files.walk`），
  **未找到这样一道门**。盘上同名件只有 `tools/audit-prod-ratchet.mjs`，它的内容是
  `pnpm audit --prod` 的依赖漏洞棘轮（见文件头 1-20 行自述），与时区无关。
  ⇒ 现在 C5 的「干净」是靠人工纪律维持的，没有机器件；mock 侧那 2 处裸 `LocalDate.now()` 今天没有任何东西会拦。
- 残留风险（结构命题，可落门）：`DATE(created_at)` 是 DB 会话时区里的日期，而 `created_at` 由 Java 以
  BUSINESS 写入的 `LocalDateTime`。两者一致的前提是 **DB 会话/系统时区确为 Asia/Shanghai**。
  该前提由 `application-real.yml` 的 `serverTimezone` 类配置维持，我没有把它钉成一条可判的不变量
  （若有人把容器 `TZ` 改成 UTC 且写入路径某处换成 `LocalDateTime.now()`，「今天」的边界就会错，
  访客日去重与配额日键同时漂移）。判不出部分见汇总。

---

## 发现 C6（已证）：微信订阅消息的外呼仍包在 `@Transactional` 里——上一轮只剪了调用方，被调方自己开事务

严重度：中高（连接池可被外部依赖耗尽，是可用性面而非正确性面）

### 证据

- `growth/WeChatPushService.java:183-188`：
  ```java
  @Transactional
  @CircuitBreaker(name = Resilience4jConfig.WECHAT_API_BACKEND, ...)
  @Retry(name = Resilience4jConfig.WECHAT_API_BACKEND)
  @RateLimiter(name = Resilience4jConfig.WECHAT_API_BACKEND)
  public boolean sendSubscribeMessage(String openId, String templateId, String page, ...) {
      String accessToken = getAccessToken();
  ```
  方法体内先取 access_token（HTTP），再 POST 微信（`:200+`），全程持有事务与一条 DB 连接。
  同类还有 `:275` `sendSocialDigestPush`、`:299` `sendRecommendRefreshPush`（后者又调用前者，
  默认传播 REQUIRED ⇒ 同一事务）。这三个方法**都不写数据库**，事务纯属多余。
- 「修过 4 处」的痕迹在调用方：`mq/NotificationConsumer.java:37` 的注释原文
  > 本方法原先带方法级 `@Transactional`，而 `WeChatPushService#sendSubscribeMessage`
  
  即 S2-1 把**消费者自己**的事务注解去掉了，但 `:379` 仍然
  `weChatPushService.sendSubscribeMessage(...)` 跨 bean 调用被代理的方法 ⇒
  事务在内层照样开启，外层摘注解等于没摘。
- 时长量级是本仓自己承认的：`apps/api/src/main/resources/application.yml:412-413`
  给 `wechatApi` 配了 `slow-call-rate-threshold: 60` / `slow-call-duration-threshold: 3s`
  ⇒ 设计上就预期这条外呼要 3 秒以上；外面还套 `@Retry`（默认 3 次）。
- 连接池上限：`application-real.yml:21-27` `maximum-pool-size: ${DB_POOL_MAX:20}`、
  `connection-timeout: 30000` ⇒ 约 7 个并发慢推送（每个占一条连接 3s×重试）即可让全站请求
  排在 `Connection is closed`/`SQLTransientConnectionException` 上。

### 影响

微信侧抖动（或熔断前的重试风暴）会通过「事务占用连接」放大成 API 整体不可用；
这与业务正确性无关，但属于派单 C6 明确要判的「外呼放进事务的残留」，且**上一轮的修复是假的闭合**。

### 判据归属：现有哪扇门能抓住

- 抓不住。我没有找到「@Transactional 方法体内不得出现 HTTP/外呼」的结构门；
  `mq/NotificationConsumer.java` 的注释甚至声称已修，属于「注释承诺的判点要 grep」那一类反面样本
  （我 grep 了被调方，才发现内层注解仍在）。
- 属**结构命题**：可写成一条静态门——`@Transactional` 标注的方法体内（含其同类直调的私有方法）
  出现 `RestTemplate|WebClient|HttpClient|exchange(` 即红，豁免清单需要点名理由。
- 「实际会不会打爆池子」= 行为命题，需要并发压测 + 真库，判不出。

### 建议修法

1. 去掉 `WeChatPushService.java:183,275,299` 三处 `@Transactional`（方法内无任何 JPA 写操作）。
2. 若 `getAccessToken()` 需要落库读缓存，改为 `@Transactional(propagation = NEVER)` 或在进入前完成读取，
   保证外呼阶段无事务。
3. 把这条写成结构门并接入现有 CI，注释里那句「已修」才成立。

---

## 发现 C3（已证）：feedback 工单状态机无迁移表，终态 CONVERTED 可被回退，回退后可二次转化产出重复活动

严重度：中（运营数据污染，非资金/隐私）

### 现象

`feedback` 域的状态集合有 5 个取值，但没有任何迁移表：写入状态的地方共 3 处，其中 2 处对当前状态零校验，
包括对终态 `CONVERTED` 的覆写。而 `CONVERTED` 在业务上意味着「已经为该提案真实创建了一条 Activity」
（R4-00342 起才有的副作用），副作用与状态之间没有幂等关联，状态被回退后副作用不回收，
且再次转化会再造一条活动。

### 证据（文件:行 + 原文）

1. 状态集合：`apps/api/src/main/java/com/campuslove/api/feedback/SubmissionStatus.java:3-8`
   ```java
   public enum SubmissionStatus {
     SUBMITTED,
     PROCESSING,
     REVIEWED,
     PLANNED,
     CONVERTED
   }
   ```
   无 `CLOSED`/`REJECTED`/`ARCHIVED`，即 `CONVERTED` 是唯一事实终态。

2. 转化写入终态并产生外部副作用：`feedback/RealFeedbackService.java:266-268`（唯一的守卫）与 `283-302`
   ```java
   // 校验提案尚未被转换
   if (feedback.getStatus() == SubmissionStatus.CONVERTED) {
       throw new IllegalStateException(ErrorMessages.PROPOSAL_ALREADY_CONVERTED_PREFIX + proposalId);
   }
   ...
   Activity savedActivity = activityRepository.save(activity);
   feedback.setStatus(SubmissionStatus.CONVERTED);
   feedback.setConvertedActivityId(savedActivity.getId());
   ```
   守卫只认 `status == CONVERTED`，**没有认 `convertedActivityId != null`**——这是本条可证伪的关键点：
   只要状态被别处改写而 `convertedActivityId` 保留，守卫即失效。

3. 管理端回复无条件置 `REVIEWED`：`feedback/RealFeedbackService.java:443-461`
   ```java
   public SubmissionRecordView replyFeedback(long id, String reply) {
       ...
       feedback.setStatus(SubmissionStatus.REVIEWED);
   ```
   方法体内无任何 `getStatus()` 判断（已通读 443-464 全段，除 `findById`/`assertCampusAccess` 外只有赋值）。
   因此对 `CONVERTED` 工单点一次「回复」，状态即回到 `REVIEWED`，而 `converted_activity_id` 仍是旧活动 ID。
   此后调用 `convertProposal` 不再命中 266 行的守卫，`activityRepository.save(activity)` 再执行一次
   ⇒ 同一提案产生第二条 Activity；第一条成为无提案归属的孤儿活动（`Feedback` 上的
   `convertedActivityId` 已被覆盖为第二条的 ID，第一条仅存在于 `activities` 表）。

4. 管理端处理工单更宽松，任意状态可指定：`admin/AdminFeedbackController.java:178-196`
   ```java
   feedback.setStatus(req.status());
   ```
   `req.status()` 由请求体给（仅经 `@Valid` 的枚举合法性校验，`SubmissionStatus` 五个值全合法），
   没有迁移检查，也不拒绝把 `CONVERTED` 改成 `SUBMITTED`。
   注释 `AdminFeedbackController.java:171` 自称「推进到 PROCESSING / REVIEWED / PLANNED」，
   代码实际是「可推进也可回退，含 CONVERTED」。

5. `PROCESSING` / `PLANNED` 在 real 侧无任何生产者：全仓检索赋值点，
   仅 `feedback/MockFeedbackService.java:46,64` 出现 `SubmissionStatus.PROCESSING` / `.PLANNED`
   （real 路径只有 `SUBMITTED`（`RealFeedbackService.java:127`）、`REVIEWED`（453）、`CONVERTED`（301）三处写入）。
   ⇒ 客户端/管理端可见的两个状态在真实后端只能靠第 4 点那个无守卫的接口手工造出。

### 影响

- 提案转活动的运营闭环可被一次误点回复打断，重开转化入口 ⇒ `activities` 表出现重复活动行，
  用户侧表现为同名活动报名两次入口；旧活动变成无提案来源的孤儿数据（`getActivities()` 仍会推给用户，
  它只按 `status=upcoming` 过滤，`RealRecommendationService.java:228`）。
- 工单看板筛选（`AdminFeedbackController` 支持按 5 个状态筛）的计数不可信：状态可回退 ⇒ 处理时长统计口径漂移。

### 可证伪条件

若存在下列任一，则本条不成立：(a) 某处对 `replyFeedback`/`handleTicket` 的入口做了状态前置拦截（我已通读两个方法体，未见）；
(b) 存在触发器/唯一键把 `feedback_converted_activity_id` 或「一个提案一条活动」钉在库侧（`entity/Feedback.java` 无相关约束）。
二者都需要真库才能完全排除，静态侧我未发现。

### 判据归属：现有哪扇门能抓住

- 抓不住。`apps/api/src/test/java/com/campuslove/api/feedback/` 只有两个测试文件：
  `FeedbackControllerTest.java:102` 仅把 `CONVERTED` 当夹具数据（视图字段填充），
  `RealFeedbackCampusScopeTest.java:309` 断言的是「转化成功后状态为 CONVERTED」这一正向路径。
  没有任何测试断言「CONVERTED 之后不可回退」或「同一提案不可产生两条 Activity」。
- 本条属**结构命题**（可用静态不变量判）：可写成一条门——
  「写 `Feedback.status` 的调用点必须在赋值前读取旧状态，且 `CONVERTED` 只允许作为赋值结果出现，
  不允许作为被覆写的来源」，或更可执行的不变量：`convertedActivityId != null ⇒ status == CONVERTED`。
  后者是纯不变量式（不钉实现字面文本），可在单测里用「回复已转化工单 ⇒ 断言状态仍为 CONVERTED」直接判。

### 建议修法

1. `RealFeedbackService.replyFeedback`：在 453 行前加终态守卫，`CONVERTED` 工单只允许追加回复不改状态
   （或允许 `CONVERTED → REVIEWED` 但拒绝其后再转化）。
2. `convertProposal` 的守卫从「状态」改为「副作用凭据」：
   `if (feedback.getConvertedActivityId() != null) throw ...`，与状态解耦，天然幂等。
3. `AdminFeedbackController.handleTicket` 引入与 `vip/VipOrderService.java:97-101` 同形状的迁移表常量
   （本仓已有成熟范式：`Map<From, Set<To>>` + `applyTransition`），并拒绝把 `CONVERTED` 作为来源的迁移。
4. 补 `PROCESSING`/`PLANNED` 的真实生产者，或从枚举与两端字典中删除（避免死状态）。

---

## 发现 C7（已证）：错误语义三处断裂——`IllegalStateException` 无 handler 塌成 500；「余额不足」后端 400 而客户端按 409 分支（死分支）；`real` 档下 434 条业务提示统一塌成「请求参数错误」

严重度：中（可观测性 + 客户端分支失效；「不外露原文」这一半是达标的）

### 7.1 `IllegalStateException` 没有 handler ⇒ 永久业务拒绝被报成 500

- `config/GlobalExceptionHandler.java` 中 `@ExceptionHandler(IllegalStateException.class)` 的
  **出现次数实测为 0**（`grep -c "ExceptionHandler(IllegalStateException"`），而非 admin 业务代码里
  `new IllegalStateException(` 有 **103** 处，于是全部落到 `:657-664` 的
  `@ExceptionHandler(Exception.class)` ⇒
  `buildDesensitizedErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "服务器内部错误，请稍后重试", traceId, ex)`。
- 其中确有「内部不变量被破坏」的正当 500（如 `discover/RealActivityService.java:214`
  「enrollmentOpt 已确认非空但 orElseThrow 触发，数据不一致」），
  但也有明确面向用户的业务拒绝与依赖降级：
  - `growth/RealCheckInService.java:445` `throw new IllegalStateException("钱包服务不可用，补签扣费失败")`
  - `ai/AiVideoController.java:134` `"AI 生成配额服务不可用，请稍后重试"`
  - `discover/RealCircleService.java:840,892` `"circle topic like repository unavailable"`
  - `auth/PhoneBindingController.java:148,155,180,189,194,202` 微信侧失败（消息里拼了
    `resp.errmsg` / `ex.getMessage()`，但经兜底 handler 在生产档不外露，见 7.3）
- 本仓**自己给这条尺子立过案**：`GlobalExceptionHandler.java:130-136` 的注释原文写明，缺参 handler 之前
  缺失时「客户端的 500 重试逻辑会把一个永久错误当瞬时错误反复打」，并据此补了 handler。
  同一判据套到 `IllegalStateException` 上仍然成立，而它没被补。
- 连带的口径失真：`:955-958` 注释声称 `resolveMappedStatus` 与各 `@ExceptionHandler`
  「保持同一张表：新增/修改 handler 时必须同步这里」，而 `:975-1035` 的判定链里同样没有
  `IllegalStateException` 分支 ⇒ 审计表也把它记成 500（两侧一致地错，所以门不会红）。
- 监控放大（规则名已核到盘）：`docker/prometheus/rules/alert-rules.yml:113-125`
  `ApiHighErrorRate`「5xx 错误率 > 1%（连续 5 分钟）」按 uri 分桶 ⇒
  业务拒绝进 500 会让该规则按单个 URI 长期红；
  同文件 `:129-132` 还有 `ApiHighClientErrorRate`（4xx > 5%），所以 7.3 的 400 塌缩同样会顶到告警线。

### 7.2 「余额不足」状态码契约三方不一致，客户端分支恒不命中

- 后端事实：`:187-199`
  ```java
  @ExceptionHandler(InsufficientBalanceException.class)
  ...
  body.put("status", HttpStatus.BAD_REQUEST.value());
  body.put("code", "INSUFFICIENT_BALANCE");
  return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  ```
  `:1008-1015` 的 `resolveMappedStatus` 也把 `InsufficientBalanceException` 归 400（与本 handler 一致）。
- 测试侧声明却是 409：`apps/api/src/test/java/com/campuslove/api/wallet/RealWalletUnlockServiceTest.java:113`
  `@DisplayName("余额不足：异常向上抛出（HTTP 409 语义），无解锁记录写入")`
  ——而它只 `assertThrows(InsufficientBalanceException.class, ...)`（`:121`），
  **没有任何一处断言状态码**，所以「409 语义」只是注释，代码怎么改它都绿。
- 客户端按 409 分支：`apps/client/src/components/discover/CardSwiper.vue:603-611`
  ```js
  // 409：余额不足（InsufficientBalanceException，后端契约）
  const status = ...
  if (status === 409) {
    uni.showToast({ title: t("discover.whisperUnlockFailBalance"), icon: "none" });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  uni.showModal({ title: ..., content: message, ... });
  ```
  同样形状在 `CardDetailOverlay.vue:550-558`。后端给 400 ⇒ 该 toast 分支**永不执行**，
  落到 `showModal(content: err.message)`，把后端 `message` 字段原文弹给用户。
  ⇒ 派单要求复量的「409 原文从前端弹给用户」这条路径，在后端侧的真相是：
  **正因为后端不发 409，前端才走到弹原文那条兜底支路**。
  当前 InsufficientBalance 的 message 是固定文案（「余额不足」，`:195`）所以内容无害，
  但同一条兜底支路也承接 7.3 里所有 400 —— 生产档 message 已被钉成「请求参数错误」，故未外露 PII。

### 7.3 「不外露原文」复量结论：后端侧达标，代价是业务提示全丢（记为负面结果，不另立发现）

- `real` 档下 `isProductionProfile()` 为真（`:80-85`，`activeProfile.contains("real")`），
  `:119-127` 把 434 处 `IllegalArgumentException` 的中文业务文案一律替换为「请求参数错误」，
  且 `buildErrorResponse(status, "Bad Request", message)` 三参版本**不带业务 code**
  （与 `buildErrorResponseWithCode` 系列 `:841,867` 相对照）
  ⇒ 客户端无法按机器码分支，只能靠 HTTP 码 + 自有文案。
- 已有专用载体的关键业务事实（这些不受影响）：`InsufficientBalanceException`（INSUFFICIENT_BALANCE）、
  `DailyLimitExceededException`（`:591`）、`ContentSecurityException`（`:285`）、
  `CommerceDisabledException`（`:232`）、`IdempotencyException`（409 + `IDEMPOTENT_CONFLICT`，
  客户端 `stores/campus.ts:315,324` 已在按码分桶）。
  受影响的只有「仅可补签 7 天内」「本月补签次数已用完」「悄悄话需先实名」这类纯文案提示。
- 逐个核过、确认**没有**外露通道（记录以免下一轮重复怀疑）：
  `EntityNotFoundException` `:493-499` 固定文案（R4-00284）；`WechatLoginException` `:386-398`
  的消息在构造点已是固定中文（`auth/RealAuthService.java:357-376`，R4-00254「上游细节仅进日志」）；
  带 id 拼接的 `*_PREFIX + id` 消息**全部**走 `IllegalArgumentException`（实测 20 处，
  如 `chat/TempChatSessionService.java:353`、`chat/RealInteractionEventService.java:142`），
  在生产档被 `:125` 遮蔽 ⇒ **无内部 ID/PII 外露通道**。
- 残留两处未遮蔽的拼接通道（低危，不单列为发现）：
  `:91-101` `handleValidationException` 与 `:405-416` `handleConstraintViolation`
  都把 `field + ": " + defaultMessage` 原样返回（生产档也不例外）⇒ 外露**内部字段名**
  （如 `idCardNo`、`clientRequestId`），不外露字段值；`:630-636`
  `HttpRequestMethodNotSupportedException` 回显 `ex.getMessage()`。三者都属结构信息不属用户数据。

### 判据归属：现有哪扇门能抓住

- 7.1 抓不住，且**门与被测物不同源**：`resolveMappedStatus` 注释要求与 handler 同步，
  但没有任何测试比对「每个 `@ExceptionHandler` 的类型 ↔ `resolveMappedStatus` 的分支 ↔ 实际状态码」。
  属**结构命题**：可静态判「`@ExceptionHandler` 覆盖的异常类型集合 ⊇ 业务代码 throw 的
  RuntimeException 类型集合（白名单除外）」，本仓已有同类结构门可挂靠（`ratelimit/RateLimitKeyAuditTest.java`）。
- 7.2 抓不住：契约横跨两栈，现有 CI 无跨栈契约测试覆盖「后端 status ↔ 客户端分支」。
  客户端 `WhisperComposeSheet.spec.ts` 只断请求体不断响应码分支。
  属**结构命题**（把状态码/错误码钉成契约表）；「真机弹 toast 还是 modal」属行为命题。
- 「业务提示全丢是否伤转化」= 行为命题，判不出（需产品口径与真实数据）。

### 建议修法

1. 加 `@ExceptionHandler(IllegalStateException.class)`，**同步**在 `resolveMappedStatus` 加同一分支
   （注释 `:955-958` 本就要求两侧同步）。依赖不可用类给 503
   （与 `IdempotentInterceptor.java:172,220` 已有的 503 口径一致），数据不一致类保持 500 但换独立 error code。
2. 三处对齐「余额不足」：要么后端改 409（与测试 `@DisplayName`、客户端分支一致），
   要么客户端改判 `code === "INSUFFICIENT_BALANCE"`（更稳，不受状态码迁移影响）。推荐后者——
   本仓已有 `buildErrorResponseWithCode` 的 code 通道。
3. 把 `RealWalletUnlockServiceTest.java:113` 的 `@DisplayName` 换成真断言
   （MockMvc 打一次解锁，断 `status` 与 `code`），否则这条契约永远是注释。
4. `handleValidationException` / `handleConstraintViolation` 在生产档去掉 `field` 名，只留归一后的提示。

---

## 判不出清单（需要真库 / 真并发 / 真实外呼，本车道按纪律未做）

1. C1：各唯一键在**生产库是否真的在位**——我只核了 Flyway 脚本与实体声明；
   本仓存在 `database/backup/*.sql`、`database/sanitize`、`database/init-mysql.sql` 多条旁路
   （`init-mysql.sql` 里**没有** `activity_enrollments` 建表语句，我实测 `grep` 无匹配），
   所以 `uk_visitors_visitor_visited_date`、`uk_enrollment_activity_user` 的在位性判不出。
2. C1 / C2：双击与同毫秒并发是否**真的**产出两行 / 丢增量——需并发压测（不许跑 maven、不许连库）。
3. C2：`RealCheckInService.makeUp` 里「先扣积分（`:447-450`）后原子递增配额（`:484`）」的
   回滚是否成立，取决于 `WalletService.deduct` 的传播级别是否为 `REQUIRES_NEW`；
   我未逐条打开 `wallet/` 的注解（第五轮已证钱轨，避免重复立项）。
4. C3b：库里是否真的存在「已 expired 但仍可被 accept」的信号行——需真库取数。
5. C5：`DATE(created_at)` 与 `LocalDate.now(TimeZones.BUSINESS)` 的日界一致性，
   依赖运行时 DB 会话时区与容器 `TZ` 的实际值；静态只能证明「写入用 BUSINESS」，不能证明「读侧一致」。
6. C6：慢外呼打爆 20 条连接的真实阈值——需压测。
7. C7：`InsufficientBalanceException` 在生产档到底弹 toast 还是 modal——需真机走一次余额不足路径。

## 覆盖度自评（给下一轮的入口，勿当成结论）

本轮 8 个编号位用满后，按「结论强度」而非「文件数」分配了读取深度。以下如实记录深浅，
避免下一轮把「我读过」误读成「那侧审完了」：

- **逐方法走过**：feedback（状态机全链）、match（心动信号 + visit + 报名/likes 端点）、
  growth（签到/补签/配额/社交升温 4 个 service）、discover（推荐配额、缓存管理器、活动报名）、
  official（消息写路径）、report + PostReport（唯一键缺位）、verification（两个 service 的迁移守卫）、
  vip（迁移表 + 退款短路，仅走形状未逐端点）、whisper（发送全链）、draft、tasks（claim 唯一键）、
  common/{Idempotent, IdempotentInterceptor}、config/GlobalExceptionHandler（handler 清单全量）。
- **仅端点清单级（幂等/限流/分页三类扫描）**：chat 45 文件、search 15、campus 12、media 12、mq 10、
  village 42（只走了点赞/收藏/删除/历史四类）、shop 4、location、block、user、profile。
  ⇒ **chat 侧没有逐条走过**：它按文件数是最大域（45），本轮只在 C1 清单里出现它的 25 条写端点
  （其中 PrivateMessage/Notification/TempChat 的 PUT 已读类占多数，真正需要状态机审的是
  `TempChatController.java:57` `/{id}/contact-exchange/respond`——
  该端点无 `@Idempotent`、无 `@RateLimit`，而 `entity/TempChatContactExchange.java:35` 只有
  `session_id` 唯一（一个会话一条交换请求，形状上正确），respond 的迁移是否守卫我未打开。
  **建议下一轮把 chat 域作为 C 车道首位**，重点是 TempChat 的 respond/end/recall 三个状态写点。
- **未打开**：`mq/` 10 文件的消费幂等（只看了 `mq/ConsumerIdempotencyStore.java` 的存在性）、
  `media/MediaAssetService.java` 的 10 处 `@Transactional` 内容、`search/` 的排序与打分。

## 章节顺序说明

正文按「逐条证完立刻落盘」的纪律追加（上一程两条车道攒到最后写、撞 150 轮上限导致报告全无），
因此物理顺序为 C1、C2、C3b、C4、C5、C6、C3、C7，与编号顺序不同；编号保持稳定，引用按编号。

## 本轮未立项的观察（证据强度不足或与他道重叠）

- `Idempotent.java:39` 是 `@Target(ElementType.METHOD)`，但 `IdempotentInterceptor.java:127-129`
  仍尝试读取类级注解 ⇒ 死分支（已在 C1 结构注记内，不单列）。
- `match/RealIcebreakerService.java:382` 在 `for (Long circleId : commonCircleIds)` 内
  `interestCircleRepository.findById(circleId)`，是 N+1 形状，但循环体有
  `if (result.size() >= maxCount) break`（`:380`）且同文件其余 repository 调用都是批查
  （`:357,358,403,417`）⇒ 规模受 maxCount 约束，未定性为缺陷。
  `village/VillagePostService.java:360-362` 循环内 `postTagRepository.save(...)` 是 N 次 INSERT，
  同理属可接受的小批量写（标签数量有上限）。
- `village/VillageController.java:290,357` 主动移除了点赞的 `@Idempotent`（toggle 语义），
  防线交给 `entity/PostLike.java:23` / `PostFavorite.java:23` 的唯一键 ⇒ 形状正确，不立项。
- 派单点名的「红包」在本仓**已下线**：全量检索 `红包|redpacket|red_packet` 在 `apps/api/src/main/java`
  只命中 3 个文件，且都是历史流水兼容用的常量与注释——
  `wallet/WalletTransactionLog.java:83` 「红包发送扣减（红包功能已下线，常量保留以兼容历史流水对账）」、
  `wallet/UserWallet.java:63` 「冻结金额……预留给未来红包发送冻结方案」、
  `admin/AdminVipController.java:32` 「红包实体/页面已删，本控制器仅保留账单只读查询能力」。
  ⇒ 无写端点可审，本条不适用（不是漏审）。



---

## 主控复核纠正（2026-11-01，本车道交回后由主控实测）

本车道 C5 那条「前提纠正——盘上不存在 `tz-ratchet` 门（`audit-prod-ratchet.mjs` 是依赖漏洞棘轮）」**不成立**，
以本段为准。主控实测：

- `package.json:33` 有键 `"test:tz-ratchet": "node tests/tz-ratchet.spec.mjs"`，且该键在 `test:contracts`
  链内（链现 35 条，EXIT=0）。
- `cd /d/6/恋爱小程序 && npm run test:tz-ratchet` 实跑读数：
  `tz ratchet ok（扫描 822 个 main java；无时区 now() 19 处全部在基线内，基线文件 6 个；带时区写法 419 处）`。
- 门文件 `tests/tz-ratchet.spec.mjs` 存在，判点是双向的（超出基线红、基线可收缩而不降也红）。

⇒ 结论：时区轨**有门、在链、能咬**，本车道的「无门」判断是找错了载具（`audit-prod-ratchet.mjs` 确实不是
时区门，那一半是对的，但据此说「盘上不存在 tz-ratchet」是越界推论）。C5「时区无发现」这一条的**判决本身
不受影响**（19 处无时区写法都在基线内，说明这些域没有新增无时区 now()），但「没有尺子」这句要撤掉。

留这一段的理由：派单方与车道都可能写错前提，纠正别人前提的那句话同样是被审对象；账上留一条假纠正
比留一条空白更糟，因为下一个人会拿它当已核事实。
