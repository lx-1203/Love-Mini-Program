# Round 5 · Fix Lane A2（安全装配 / 注销终态 / 回滚判点）交付报告

车道：A2（反证审查 §7 建议顺序中的 F-05 在途 fallout、F-07、F-08、F-10）。
仓库：`D:\6\恋爱小程序`，`apps/api`（Spring Boot 3.3.1 / Java 17）。
本机环境事实：无 Docker、无真库连接权限（应用账号只有 `campus_love.*`）、Redis 握手不了。
凡「`@Transactional` 在 MySQL 上真的回滚」「76 条语句在 MySQL 8 上可执行」「AOF 里是否已经落过手机号键」一律只到代码级，逐条写在末节「本机判不出 / 遗留债」。
读写范围：只动 `apps/api/src/{main,test}`。**未新增任何迁移**（F-08 的 outbox 一条判断为不需要动 schema，理由见 §3.4）。
未碰：根 `package.json`、`.github/workflows/ci.yml`、`tests/**`、`apps/client/**`、`apps/admin/**`、`README.md`、`.gitignore`。未做任何 git 写操作。
A1 车道的 `privacy/PersonalDataTables.java` 清单条目与 `privacy/ErasureSchemaAlignmentTest.java` 穷尽门：原样保留、一字未改（本车道只在其之上加自己的判点，未动它的条目与豁免集）。

---

## 0. 基线与收口读数

A1 交来的基线：全量 `./mvnw -o -B test` = 1784 例、1 失败（就是本报告 §1 那条）、10 skip。

### 0.1 改前红点原文（第 1 项的起点）

命令：`cd /d/6/恋爱小程序/apps/api && ./mvnw -o -B test -Dtest=PublicAuthWriteRateLimitTest`

```
[ERROR] Tests run: 2, Failures: 1, Errors: 0, Skipped: 0, Time elapsed: 0.224 s <<< FAILURE! -- in com.campuslove.api.auth.PublicAuthWriteRateLimitTest
[ERROR] com.campuslove.api.auth.PublicAuthWriteRateLimitTest.smsCode_shouldRateLimitPerPhoneNotGlobalBucket -- Time elapsed: 0.022 s <<< FAILURE!
org.opentest4j.AssertionFailedError: 限流键必须引用 DTO 参数（不能使用被切面 request 变量遮蔽的 #request.phone） ==> expected: <#payload.phone> but was: <#pii.ref(#payload.phone)>
	at com.campuslove.api.auth.PublicAuthWriteRateLimitTest.smsCode_shouldRateLimitPerPhoneNotGlobalBucket(PublicAuthWriteRateLimitTest.java:53)
```

（控制台按 GBK 渲染，故中文在原始日志里是乱码；上面按源文件逐字复原。）

### 0.2 收口读数（原样，详见 §6）

```
$ cd /d/6/恋爱小程序/apps/api && ./mvnw -o -B test
[WARNING] Tests run: 1797, Failures: 0, Errors: 0, Skipped: 10
[INFO] BUILD SUCCESS
```

**失败 0**（A1 基线：1784 例 / 1 失败 → 本车道闭合那条失败并新增 13 条判点 → 1797 例 / 0 失败）。
10 例 skip 全部来自两个 `@EnabledIfSystemProperty` 门控类，逐条点名在 §6「收口读数」。

---

## 1. 第 1 项：F-05 在途改动的 fallout —— 定性：测试过期，生产没坏

### 1.1 定性过程（先判红点落在哪一侧，再动手）

红点在 `PublicAuthWriteRateLimitTest.java:53`，是 `assertEquals("#payload.phone", limit.key(), ...)`：
它把「注解表达式原文必须逐字等于 `#payload.phone`」当成了正确性本身。而该断言的消息与类注释写的真实意图是
「取值必须来自 DTO 参数，不能被切面注入的 `#request` 遮蔽成全站单桶」（P0 缺陷 1 的防线）——
`#pii.ref(#payload.phone)` 内部照旧引用 `#payload.phone`，这条意图仍然成立。所以红的是**过期期望**，不是分桶被打坏。

排除「生产真把分桶打坏了」的两条证据：

1. 代码级：`auth/PiiKeyReference.java:66-79` 的 `of(secret, purpose, value)` 是纯函数——
   输入只有 `LABEL + purpose + ':' + value`（HMAC 分支再混入恒定密钥），不含 `UUID`、时间戳、随机盐；
   `ratelimit/RateLimitAspect.java` 的 `PiiRef.ref` 每次调用 new，但 `piiKeySecret` 来自 `@Value`、进程内恒定 ⇒ 同号码必得同摘要。
2. 运行级：`capacity=1`，同号第二次调用被 `RateLimitExceededException` 拒 ⇒ 两次落进同一个桶；
   异号被放行 ⇒ 桶没合并。摘要若每次不同，第二次必然放行，这条判点会当场红（见 §1.4 变异2 实测就是这个红法）。

### 1.2 实际改动（`src/test/java/com/campuslove/api/auth/PublicAuthWriteRateLimitTest.java`）

没有删断言、没有放宽判据，而是把「钉表达式原文」改写成「钉行为 + 钉 PII 不进键名」，四条判点：

| # | 判点 | 取证方式 |
|---|---|---|
| 1 | 同一手机号仍进同一个桶（第二次被拒） | 真跑切面 `aroundMethod`；这条同时是「摘要稳定可重放」的判点 |
| 2 | 不同手机号进不同桶；且桶键不得落进 `:spel-failure:` / `:null-value:` / `:fallback`（落降级桶＝分桶维度不再是手机号） | 新增 `RecordingBucketRegistry extends RateLimitBucketRegistry`：重写 `tryConsume` 记录桶键后原样 `super` 委托（令牌桶语义仍是生产实现，不是 mock 出来的），拿到三次调用的真实桶键 |
| 3 | **PII 没进键名**：`13800000001` / `13800000002` 不出现任何一次桶键里 | 同上，运行级取证 |
| 4 | 表达式必须含 `#payload.phone`、不得含被保留掉的 `#request`、且必须含 `#pii.ref(` | 注解原文；只判行为不够——键名原值还会经 `RateLimitAspect` 的 warn 日志出进程，所以「取值形态」与「取值维度」要同时成立 |

运行观测（改后，同一次测试日志）：

```
WARN RateLimitBucketRegistry -- 限流命中：key=SmsCodeController#sendCode:b35ff8b3d62700ca5cc5054ff8cbc374, capacity=1, refillTokens=0.016666666666666666/s
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
```

桶键真值就是「类#方法:32 位十六进制摘要」，不含号码。
另外 F-05 车道已在 `RateLimitKeyAuditTest` 补了 `noKeyMayEmbedRawPii`（扫全部 `@RateLimit`、用真实形态手机号探针值）+
`piiDetectorActuallyBites` 反证夹具；本条用例钉的是「短信这条具体路径的分桶 + 摘要」，两处互为双保险，不重复也不冲突。

### 1.3 同批在途改动的一致性核对

- `ratelimit/RateLimitAspect.java`：新增 `#pii` SpEL 变量（`PiiRef`）+ `piiKeySecret` 字段注入（不改构造器签名，
  所以 `RateLimitConfig` 与既有单测的 `new RateLimitAspect(registry, trustedProxies)` 不受影响）。
- 变量命名不变量（注入变量不得与方法参数同名）仍然成立：`pii` 不是任何方法参数名，`RateLimitKeyAuditTest` 的门覆盖它。
- `docker-compose.yml --appendonly yes` 未动：正因为 AOF 落盘，键名才必须是摘要。

### 1.4 反向变异（改坏 ⇒ 红 ⇒ 原样还原 ⇒ 复绿）

| 变异 | 改坏点 | 红点用例 | 红点原文（截） |
|---|---|---|---|
| MUTATION-A2-F05-1 | `RateLimitAspect.PiiRef.ref` 返回值追加 `Long.toHexString(System.nanoTime())`（模拟摘要不稳定） | `PublicAuthWriteRateLimitTest.smsCode_shouldRateLimitPerPhoneNotGlobalBucket:114` | `同一手机号第二次发送应被限流拒绝（拒绝失效说明摘要值每次不同，限流形同虚设） ==> Expected com.campuslove.api.ratelimit.RateLimitExceededException to be thrown, but nothing was thrown.` |
| MUTATION-A2-F05-2 | `SmsCodeController` 的 key 退回 `#payload.phone`（裸手机号进键名） | ①`PublicAuthWriteRateLimitTest...:94`；②`RateLimitKeyAuditTest.noKeyMayEmbedRawPii:316` | ①`限流键引用了手机号，却把原值直接写进键名（AOF 会落盘）。请走 #pii.ref(...)：#payload.phone ==> expected: <true> but was: <false>`；②`有 2 个限流键把 PII 写进了【键名】…value 的 TTL 管不到它；改键名里的字段请走 #pii.ref(...)` |

变异1 的红正是任务书要求能区分的那一种（摘要不稳定 ⇒ 限流形同虚设），变异2 的红证明「PII 不进键名」这条判点在两处独立生效。
两个变异均已原样还原（`grep -rn MUTATION src/` 为空），还原后复绿读数见 §6。

---

## 2. F-07：清除服务缺席时「静默当成功」

按报告的四步做，逐条对应：

### 2.1 ①构造器注入 `ObjectProvider<AccountErasureService>` + real 档 fail-fast

`auth/RealAccountSecurityService.java`：
- 删除 `@Autowired(required=false)` 字段注入，改为构造器第 7 参
  `ObjectProvider<com.campuslove.api.privacy.AccountErasureService>`（`AccountErasureService` 自己也是
  以 `ObjectProvider<MediaStorageService>` 注入可选协作者，口径一致）。
- 新增 `@PostConstruct failFastIfErasureServiceMissing()`：`getIfAvailable()` 为空 ⇒ 抛
  `IllegalStateException`，消息点名缺的是哪个 bean、后果是什么、该查哪一处。
  real 档下「起不来」优于「静默半注销」。
- 类字段注释里写清为什么不用强依赖的单例参数（`AccountErasureService` 依赖 `JdbcTemplate`，
  设成强依赖参数会把「可选基础设施/装配顺序」问题变成本类起不来；provider + 显式检查把缺席变成可判定的运行时事实）。

### 2.2 ②缺席 ⇒ 显式失败（503），不写墓碑冒充已注销

`deactivateAccount` 的兜底路径整段删除：
- `manualTombstone(User)` 私有方法（那份与 `tombstone` 逐列同构的手搓墓碑）**已删除**，全库无引用。
- 新增 `requireErasureService(userId)`：缺席时 `log.error` + 抛
  `ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, ErrorMessages.ACCOUNT_ERASURE_SERVICE_UNAVAILABLE)`。
  文案常量补在 `common/ErrorMessages.java`（本仓「未装配/暂不可用」的既有口径是 503 +
  `ResponseStatusException`，参照 `auth/SmsCodeService.java:176,183`；`GlobalExceptionHandler:533` 已处理该异常）。
- 流程改成 `requireErasureService → erase → tombstone → save → revokeAllTokens` 的**单向无分支**序列，
  HTTP 200 只在清单真的跑完之后才可能返回。抛异常 ⇒ 外层 `@Transactional` 整体回滚，不留半注销外观。

### 2.3 ③那两个「在 bean 缺席下断言注销成功」的用例

`RealAccountSecurityServiceTest`：
- `setUp` 改为注入**真实** `AccountErasureService`（`spy` + 替身 `JdbcTemplate` + `ObjectProvider` 替身）：
  `erase` 走替身不连库，`tombstone` 走**生产列集**。于是
  `deactivate_success_erasesInventoryAndWritesUsersTombstone` 的「phone 为 NULL / openid 是 erased: 随机墓碑 /
  autoRenewEnabled=false …」断言证明的是生产墓碑写法，而不是测试自己手搓的兜底——这正是 F-07 说的「把兜底钉成正常路径」。
- `deactivate_delegatesFullErasureSweepToAccountErasureService` 改为构造器注入 + `verify(accountErasureService).erase(100L)`
  （原来的反射塞字段删掉）。
- `deactivate_alreadyDeactivated_rerunsSweepWithoutCredentialCheck` 增加 `verify(accountErasureService).erase(100L)`，
  「复跑补齐」从此有判点。
- 新增两条缺席用例：
  - `deactivate_missingErasureServiceFailsLoudlyInsteadOfFakeTombstone`：provider 取不到 bean ⇒
    必须 503，且 `nickname/phone/openid/status` 四个字段一个都没动、`userRepository.save` 没被调用、
    token 没被吊销（缺席时不注销，主体还能重跑）。
  - `constructionWithMissingErasureServiceMustFailFastAtStartup`：缺席 ⇒ `failFastIfErasureServiceMissing()` 抛
    且消息点名 `AccountErasureService`；并加反向对照（正常装配的那个 provider 不抛），防止这条判点只在钉 mock。

读数：`./mvnw -o -B test -Dtest=RealAccountSecurityServiceTest` ⇒ `Tests run: 14, Failures: 0, Errors: 0, Skipped: 0`。

### 2.4 ④把 `RealProfileAuthChainIntegrationTest` 的门禁接进真实栈

该类是 `@SpringBootTest + @ActiveProfiles("real") + @EnabledIfSystemProperty(named="real.it.test", matches="true")`
（源文件 `:96-99`），本轮仍 5 例全 skip——本机没有真库，起 real 上下文连不上 MySQL，跑不了。
按硬约束我没有改 `.github/workflows/ci.yml` 与根 `package.json`，需要的命令行原文写在 §6「接线三件套」。
本轮实测到的事实（原样，不作推断）：本机无 `-Dreal.it.test=true` ⇒ 5 例 skip；
该类被 skip 期间，「real 档装配完整性」（含本次新增的 `@PostConstruct` fail-fast）**没有任何在跑的判点**——
这一点必须让主控知道：F-07 的 ①②③ 有单测覆盖，④ 只有命令行，真实装配验证仍属「本机判不出」。

---

## 3. F-08：注销不是终态（三个消费者 + 续费流水）

### 3.1 判定口径先落地一次（避免四处漂移）

- `entity/User.java` 新增 `isErasedSubject()`：`"deactivated".equalsIgnoreCase(status)`。
  注释里明写**为什么不复用 `isDisabled()`**：`disabled` 是管理员临时禁用（可逆，解除后本人应看到通知），
  `deactivated` 才是注销终态；把两者混用会顺手改掉禁用用户的通知行为，超出隐私整改射程。
- 新增 `privacy/ErasureSubjectGuard.java`：`isErasedSubject(UserRepository, userId)`，
  供「拿不到实体、只有 userId」的三个消费者使用。失败方向刻意是**不拦**：
  `UserRepository` 未装配（mock 档）或查询抛异常 ⇒ 返回 false 照常落库——
  DB 抖动不该被解释成「该用户已注销」而把通知永久丢掉。
  （4 个调用点共用一份口径，正是为了避免报告 §4 那类「各写一份、迟早漂移」。）

### 3.2 三个消费者在落库段前短路并 ack

| 文件 | 位置 | 行为 |
|---|---|---|
| `mq/NotificationConsumer.java` | `handleNotification` 的 try 段第 0 步（类型判定之前） | 丢弃并 `return`（正常返回＝ack，幂等登记不撤销 ⇒ 同一条重投永久不再处理），既不写 `notifications` 也不推微信订阅消息 |
| `mq/MatchEventConsumer.java` | `persistNotification(receiverId, …)` 落库段首（`:321`） | 按**接收者逐个**判定：match/unmatch 会调两次，注销那一方丢、活跃那一方照写 |
| `mq/CheckInEventConsumer.java` | `persistNotification(userId, …)` 落库段首（`:249`） | 同形；本类原先没有 `UserRepository`，按同包既有风格补 `@Autowired(required=false)` 字段 |

### 3.3 续费侧不再给不可用主体写流水

`vip/AutoRenewService.java`：在 `renewVip` 里**取出实体之后、`autoRenewEnabled` 判断之前**加
`if (user.isErasedSubject()) → 不写流水，返回 STATUS_SKIPPED`。
放在前面而不是补在「未开启续费」分支里，是为了覆盖此后所有失败分支（目录不可定价等）。
竞态成因写进了代码注释：`findByAutoRenewEnabledTrue()` 是注销**前**取的快照，
本轮循环仍会带着刚被墓碑化的 userId 走到「未开启续费」分支 ⇒ 原实现给它新写一行 FAILED 流水。
`AccountErasureService` 类注释第 4 条（原来自认「未修、靠可重跑」）已改为指向本节的实现。

### 3.4 outbox 一条：判断为不动 schema

`mq/MessageProducer.java` 的每 30s 补偿重投、`outbox_event` 无 `user_id` 列——报告建议加列。
**本车道没有新增迁移**，理由：
1. 重投本身不再产生任何新行——消费者侧（§3.2）已按 `deactivated` 短路并 ack，
   补偿重投最多变成「重投一条被丢弃的消息」；F-08 的缺陷形态（墓碑 user_id 上追加行）已被切断。
2. `outbox_event` 的行只承载**事件载荷**（类型/标题/正文/接收者 ID），不是「注销后新产生的主体数据」；
   它属于平台侧事件日志，清单里已按「无法定向清除」写明（A1 未改这条，本车道也不改清单）。
3. 加列的代价与不可验证性：新增列需要一次真库往返才能证明语句可执行，而本机无真库；
   幂等迁移（照 `V2026.10.13.0002` 的 `SET @has_col` + `PREPARE`）能写下但只能到「代码级正确」。
   为一条已被上游短路掉的残留去动 schema，收益不抵风险。
遗留：若主控裁定要「注销能定向清空 outbox」，再加 `user_id` 列（只补列不补索引、幂等可重放）+ 清单项；
本车道判断这不属 F-08 的最小闭合面。

### 3.5 新判点与反向变异

载体：`src/test/java/com/campuslove/api/mq/ErasedSubjectBackgroundWriteTest.java`（5 例）、
`src/test/java/com/campuslove/api/vip/ErasedSubjectBillingLedgerTest.java`（2 例）。
读数：`./mvnw -o -B test -Dtest=ErasedSubjectBackgroundWriteTest,ErasedSubjectBillingLedgerTest`
⇒ `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0`。

每个判点一负一正：负＝已注销 ⇒ `save` 一次都不发生且方法正常返回（ack）；
正＝活跃接收者照常落库 / `disabled` 照常落库 / 未注销但关闭续费的用户仍写 FAILED 流水（防「一律不写」式假修好）。
变异打在被四个调用点共用的 `User.isErasedSubject()` 上，一次跑同时验四处：

| 变异 | 改坏点 | 结果 |
|---|---|---|
| MUTATION-A2-F08-1 | `isErasedSubject()` 恒 false（＝三消费者 + 续费都没拦） | 5 红，且只有 4 条负例红、正控全绿：`checkInEventConsumer_dropsErasedSubject:169`、`matchEventConsumer_dropsErasedReceiver:137`、`matchEventConsumer_mutualMatchOnlyDropsErasedSide:155`（`expected: <1> but was: <2>`＝注销方那条又写回来了）、`notificationConsumer_dropsErasedReceiverAndAcks:99`、`erasedSubjectGetsNoBillingLogAtAll:102` |
| MUTATION-A2-F08-2 | `isErasedSubject()` 恒 true（＝「一律不写」假修好） | 6 红，全是正控：`…dropsErasedSubject:172 活跃用户的签到通知必须照常落库 ==> expected: <1> but was: <0>`、`…dropsErasedReceiver:141`、`…mutualMatch…:155`、`…dropsErasedReceiverAndAcks:103`、`…stillWritesForDisabledUser:115`、`activeUserWithRenewDisabledStillWritesFailedLedger:114` |
| MUTATION-A2-F08-3 | 口径扩大成 `disabled \|\| deactivated`（即误用 `isDisabled()`） | 恰好 1 红：`notificationConsumer_stillWritesForDisabledUser:115 判据必须是 status=deactivated（注销终态），不能顺手把 disabled 也拦掉 ==> expected: <1> but was: <0>` |

三个变异均原样还原（`grep MUTATION` 为空），还原后复绿读数见 §6。

---

## 4. F-10：「任何一条失败整笔回滚」原来没有任何判点

### 4.1 ①替身用例：第 k 条炸 ⇒ 墓碑没被写下去

前提纠正（以盘上为准）：报告原文写「抛 `DataUpdateException`」，该类在本仓依赖（Spring 6.1 spring-tx）里**不存在**；
改用 `org.springframework.dao.DataIntegrityViolationException`——同为 `DataAccessException` 家族、
是 `JdbcTemplate` 在 FK RESTRICT / NOT NULL 撞值时真正抛出的类型，也是 `@Transactional` 默认回滚规则覆盖的 RuntimeException。
用例注释里写明了这处纠正，避免下一个读报告的人去找一个不存在的类。

三条判点（`privacy/AccountErasureServiceTest`，载体复用其记录型 `JdbcTemplate` 家族）：

1. `midSweepFailureStopsBeforeUsersTombstoneStatement`：新增 `ThrowingJdbcTemplate`（在第 5 条 UPDATE 抛
   `DataIntegrityViolationException`，且**再往后**的 UPDATE 一旦被调用就直接 `IllegalStateException`）。断言：
   异常原样冒出（被 catch 掉就等于事务照常提交＝真半注销态）、炸点之后 UPDATE 为 0 条、
   已执行语句里**没有任何** `UPDATE users`（users 的原生墓碑写在清单最后一项 ⇒ 根本没到）、文件删除 0 次。
2. `filePurgeRunsOnlyOnCommitAndNotOnRollback`：手工 `TransactionSynchronizationManager.initSynchronization()` 后跑 `erase`，
   断言 erase 是**注册**了提交后回调而不是当场删文件；再分别触发 `afterCompletion(STATUS_ROLLED_BACK)`
   （必须一个文件都不删）与 `TransactionSynchronizationUtils.invokeAfterCommit(...)`（必须删）。
   这条钉的是「不留半注销态」的另一半：回滚后若仍删了对象存储文件，就得到「库里数据完好、文件没了」的第三种坏状态。
3. `RealAccountSecurityServiceTest.deactivate_abortsTombstoneSaveWhenErasureFailsMidway`：
   清除服务（§2.3 的真实实例）在第 k 条抛 ⇒ 断言 `userRepository.save` 从未被调用、
   `status` 仍是 `active`、`phone` 未被清空、`openid` 未被换成墓碑、token 未吊销
   （＝主体还能重跑注销，幂等复跑的前提）。这条防的是「有人把顺序倒过来：先写墓碑再跑清单」。

**明写**：以上三条证的是**代理边界与调用序列**（异常不被吞、写序被硬中断、墓碑写在清单之后、文件删除挂在提交后）。
本机无真库 ⇒ `@Transactional` 在 MySQL 8 上是否真的把 76 条语句整笔回滚，**判不出**，不得当成已验证。

### 4.2 ②静态判点：实体写与原生写的两侧一致性

`AccountErasureServiceTest.usersNativeWritesStayDisjointFromEntityMapping`：
反射 `User` 实体的持久字段得到「映射列集合」（`@Column(name)` 优先，否则驼峰转下划线；排除
`@Transient`/关系字段/静态字段），再对清单 `users`（`viaUserEntity`）项做双向检查：
- **方向一**：清单里的原生 `SET` 命中的列，**若已被 `User` 映射 ⇒ 红**
  （Hibernate 整行回写会用内存里的旧值覆盖这条 UPDATE，等于注销把数据复活）；
- **方向二**：清单声明的列里**未被实体映射**的，必须全部出现在原生 `SET` 中，否则红
  （实体写不到它，原生写又没写它 ⇒ 注销后原值仍可读回）。

防空转：反射取到的映射列少于 20 个、或取不到已知列（`nickname`/`circle_path`）即红；
判据本体做成纯函数 `usersWritePathProblems(...)`，用例内自带两个合成坏项（已映射列被原生写、
未映射列没人写）反证「门真能咬」——照 A1 在穷尽门上用的同一族纪律。

这条防的正是报告点名的漂移：哪天有人给 `User` 加一个映射 `interest_tags` 的字段，
`users` 项那条 `UPDATE users SET interest_tags = JSON_ARRAY()` 就会被整行回写覆盖，
而全库原本没有任何用例能因此变红（`tests/entity-ddl-drift.spec.mjs` 管的是枚举/列宽，不管这个）。

### 4.3 反向变异

| 变异 | 改坏点 | 红点用例 | 红点原文（截） |
|---|---|---|---|
| MUTATION-A2-F10-1 | `erase` 的 UPDATE 循环 `try/catch(RuntimeException)` 吞掉异常（＝`@Transactional` 不再触发回滚，半注销态被提交） | `AccountErasureServiceTest.midSweepFailureStopsBeforeUsersTombstoneStatement:382` | `清单中途失败必须把异常冒出去（@Transactional 的回滚靠它触发；被 catch 掉才是真半注销态） ==> Expected org.springframework.dao.DataIntegrityViolationException to be thrown, but nothing was thrown.` |
| MUTATION-A2-F10-2 | 文件删除不再挂 `afterCommit`，改成当场就删 | `filePurgeRunsOnlyOnCommitAndNotOnRollback:418`（另有 2 条既有用例 collateral：`fileUrlsAreCollectedBeforeDeletionAndPurged:320`、`filePurgeFailureDoesNotBreakErasure:335`，因当场删＋提交后删各删一次，`verify(mediaStorage).delete(...)` 的 times(1) 破——如实记录：该变异的红不只落在新判点上） | 三条均为 `Wanted 1 time but was 2` / `Never wanted here` 形态 |
| MUTATION-A2-F10-3 | 给 `User` 加一个映射 `interest_tags` 的字段（`@Column(name="interest_tags") String interestTags` + getter/setter），清单与 tombstone 都不动 | `AccountErasureServiceTest.usersNativeWritesStayDisjointFromEntityMapping:454` | `users 的「实体写 ↔ 原生写」两侧不一致（详见断言消息） ==> expected: <[]> but was: <[users 列 interest_tags 已被 User 实体映射，却又被清单里的原生 SQL 写：注销时 Hibernate 的整行回写会用内存里的旧值覆盖这条 UPDATE（= 注销把数据复活）。要么把该列改由 tombstone 实体写负责，要么先撤销 User 上的映射。]>` |
| MUTATION-A2-F10-4 | `deactivateAccount` 里把顺序倒过来：先 `tombstone(user)` + `userRepository.save(user)`，后 `erase(userId)` | `RealAccountSecurityServiceTest.deactivate_abortsTombstoneSaveWhenErasureFailsMidway:253` | `org.mockito.exceptions.verification.NeverWantedButInvoked: userRepository.save(<any>); Never wanted here: -> at ...(RealAccountSecurityServiceTest.java:253) But invoked here: -> at com.campuslove.api.auth.RealAccountSecurityService.deactivateAccount(RealAccountSecurityService.java:244) with arguments: [com.campuslove.api.entity.User@6b2ef50e]` |

变异3 就是 F-10 描述的那个场景本身，装上这条门之后它不再是「无人能证伪」。
三个变异均已原样还原（`grep -rn MUTATION src/` 无命中），还原后复绿读数见 §6。

---

## 5. 本车道改动文件清单

主代码：
- `apps/api/src/main/java/com/campuslove/api/auth/RealAccountSecurityService.java`（F-07 ①②）
- `apps/api/src/main/java/com/campuslove/api/common/ErrorMessages.java`（新增 503 文案常量）
- `apps/api/src/main/java/com/campuslove/api/entity/User.java`（新增 `isErasedSubject()`）
- `apps/api/src/main/java/com/campuslove/api/privacy/ErasureSubjectGuard.java`（新增，判定口径唯一来源）
- `apps/api/src/main/java/com/campuslove/api/privacy/AccountErasureService.java`（类注释第 4 条改为指向已实现短路；未改逻辑）
- `apps/api/src/main/java/com/campuslove/api/mq/NotificationConsumer.java`
- `apps/api/src/main/java/com/campuslove/api/mq/MatchEventConsumer.java`
- `apps/api/src/main/java/com/campuslove/api/mq/CheckInEventConsumer.java`
- `apps/api/src/main/java/com/campuslove/api/vip/AutoRenewService.java`

测试：
- `apps/api/src/test/java/com/campuslove/api/auth/PublicAuthWriteRateLimitTest.java`（第 1 项改写）
- `apps/api/src/test/java/com/campuslove/api/auth/RealAccountSecurityServiceTest.java`（F-07 ③ + 缺席必抛 + F-10① 调用序列）
- `apps/api/src/test/java/com/campuslove/api/privacy/AccountErasureServiceTest.java`（F-10 ①②，15 → 18 例）
- `apps/api/src/test/java/com/campuslove/api/mq/ErasedSubjectBackgroundWriteTest.java`（新增，5 例）
- `apps/api/src/test/java/com/campuslove/api/vip/ErasedSubjectBillingLedgerTest.java`（新增，2 例）

未改：`privacy/PersonalDataTables.java` 的清单条目、`ErasureSchemaAlignmentTest` 的穷尽门与豁免集、
`ratelimit/RateLimitAspect`（F-05 车道的 `#pii` 变量原样保留）、`admin/AdminUserController.java`（F-09 射程）、
`SmsCodeController.java` 的注解（F-05 车道原文保留，本车道只在变异时临时改过、已还原）。

---

## 6. 接线三件套（本车道不许改 `ci.yml` / 根 `package.json`，命令行原文交主控落）

1. **F-07 第④步：真实栈门禁**。`RealProfileAuthChainIntegrationTest`（`@EnabledIfSystemProperty(named="real.it.test", matches="true")`）
   需要的 mvn 命令行原文，请在 CI 的「真实栈 / db-integration」job（能连 MySQL 的那个）里加：

   ```
   cd apps/api && ./mvnw -o -B test -Dreal.it.test=true -Dtest=RealProfileAuthChainIntegrationTest
   ```

   整轮真实栈跑法（连同 flyway 可重放门一起，两个门各自独立）：

   ```
   cd apps/api && ./mvnw -o -B test -Dreal.it.test=true -Dflyway.repeatable.test=true
   ```

   需要的外部配置沿用该类已有的 `@SpringBootTest(properties=…)` 与 real profile 的环境变量
   （`SPRING_DATASOURCE_*` / `APP_AES_SECRET` 等），本车道未改任何配置文件。
   备注（本机实测，不是推测）：**Maven CLI 的 `-D` 确实会传到 forked JVM**。
   本机跑 `cd apps/api && ./mvnw -o -B test -Dtest=FlywayMigrationRepeatableTest -Dflyway.repeatable.test=true`
   时，该类的 `@EnabledIfSystemProperty` 门被打开、Spring 真实上下文开始装配
   （日志出现 `PostProcessorRegistrationDelegate$BeanPostProcessorChecker ... cacheErrorHandlerConfig` 等
   real 档 bean 创建痕迹），随后因为连不上 MySQL 一直挂着，被我的 `timeout 180` 杀掉
   （`The forked VM terminated without properly saying goodbye … Process Exit Code: 143`）。
   ⇒ 结论：命令行形态可用，**不需要**在 `apps/api/pom.xml` 里加 `systemPropertyVariables`；
   但「跑通」必须有真库——本机判不出（见 §7.1 第 3 条）。

2. **本车道新判点的登记**（台账用，命令原文）：

   ```
   cd apps/api && ./mvnw -o -B test -Dtest=PublicAuthWriteRateLimitTest,RateLimitKeyAuditTest
   cd apps/api && ./mvnw -o -B test -Dtest=RealAccountSecurityServiceTest
   cd apps/api && ./mvnw -o -B test -Dtest=AccountErasureServiceTest
   cd apps/api && ./mvnw -o -B test -Dtest=ErasedSubjectBackgroundWriteTest,ErasedSubjectBillingLedgerTest
   ```

   门名建议登记：
   - `F-05/第1项 限流键分桶与 PII 不进键名（行为级）` → `PublicAuthWriteRateLimitTest#smsCode_shouldRateLimitPerPhoneNotGlobalBucket`
   - `F-07 清除服务缺席显式失败 + 启动 fail-fast` → `RealAccountSecurityServiceTest#deactivate_missingErasureServiceFailsLoudlyInsteadOfFakeTombstone`、`#constructionWithMissingErasureServiceMustFailFastAtStartup`
   - `F-08 注销终态（消费者短路）` → `ErasedSubjectBackgroundWriteTest`（5 例）
   - `F-08 注销终态（续费流水）` → `ErasedSubjectBillingLedgerTest`（2 例）
   - `F-10① 炸点中断与提交后删文件` → `AccountErasureServiceTest#midSweepFailureStopsBeforeUsersTombstoneStatement`、`#filePurgeRunsOnlyOnCommitAndNotOnRollback`、`RealAccountSecurityServiceTest#deactivate_abortsTombstoneSaveWhenErasureFailsMidway`
   - `F-10② 实体写↔原生写一致性` → `AccountErasureServiceTest#usersNativeWritesStayDisjointFromEntityMapping`

3. **全部 6 个新/改判点都是普通 `@Test`**，随既有 `./mvnw -o -B test`（CI 的 `test:java` / api 全量阶段）自动跑，
   **不需要**在 `package.json` / `ci.yml` / `tests/gate-wiring.spec.mjs` 里新登记命令；
   上面第 1 条是唯一需要真实栈的命令行（也就是唯一必须由主控落的接线）。

### 收口读数

全量（所有变异原样还原之后，串行独占 maven 跑的权威读数）：

```
$ cd /d/6/恋爱小程序/apps/api && ./mvnw -o -B test
[WARNING] Tests run: 1797, Failures: 0, Errors: 0, Skipped: 10
[INFO] BUILD SUCCESS
```

- **失败 0**（A1 交来的基线是 1784 例 / 1 失败）；例数 1784 → 1797 = 本车道新增 13 条判点
  （`RealAccountSecurityServiceTest` 11→14、`AccountErasureServiceTest` 15→18、
  `ErasedSubjectBackgroundWriteTest` 新增 5、`ErasedSubjectBillingLedgerTest` 新增 2）。
- 10 例 skip 逐条点名（与第四/五轮口径一致，仍是两个 `@EnabledIfSystemProperty` 门控类，本车道没新增 skip）：

  ```
  com.campuslove.api.database.FlywayMigrationRepeatableTest # openIdUniqueConstraint_shouldExistAfterMigration
  com.campuslove.api.database.FlywayMigrationRepeatableTest # flywaySchemaHistory_allMigrationsShouldBeSuccessful
  com.campuslove.api.database.FlywayMigrationRepeatableTest # versionColumn_shouldExistOnUsersTable
  com.campuslove.api.database.FlywayMigrationRepeatableTest # keyBusinessTables_shouldExistAfterMigration
  com.campuslove.api.database.FlywayMigrationRepeatableTest # circleLayerAndAdminLayerTables_shouldExistFromMigrationChain
  com.campuslove.api.security.RealProfileAuthChainIntegrationTest # validUserJwt_shouldNotBeUnauthorizedOrForbidden
  com.campuslove.api.security.RealProfileAuthChainIntegrationTest # adminJwt_accessAdminEndpoint_shouldNotBeForbidden
  com.campuslove.api.security.RealProfileAuthChainIntegrationTest # revokedToken_reuse_shouldReturn401
  com.campuslove.api.security.RealProfileAuthChainIntegrationTest # userJwt_accessAdminEndpoint_shouldReturn403
  com.campuslove.api.security.RealProfileAuthChainIntegrationTest # noToken_shouldReturn401WithStandardJsonErrorBody
  ```

  前 5 条门是 `-Dflyway.repeatable.test=true`，后 5 条门是 `-Dreal.it.test=true`（即 §6.1 要接进真实栈的那一组）。

各判点的单类读数（逐条真跑）：

| 命令 | 读数 |
|---|---|
| `-Dtest=PublicAuthWriteRateLimitTest` | `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0` |
| `-Dtest=RealAccountSecurityServiceTest` | `Tests run: 14, Failures: 0, Errors: 0, Skipped: 0` |
| `-Dtest=AccountErasureServiceTest` | `Tests run: 18, Failures: 0, Errors: 0, Skipped: 0` |
| `-Dtest=ErasedSubjectBackgroundWriteTest,ErasedSubjectBillingLedgerTest` | `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0` |
| `-Dtest=AccountErasureServiceTest,RealAccountSecurityServiceTest,ErasedSubjectBackgroundWriteTest,ErasedSubjectBillingLedgerTest,PublicAuthWriteRateLimitTest,RateLimitKeyAuditTest` | `Tests run: 47, Failures: 0, Errors: 0, Skipped: 0` |

### 还原后文件 sha256（变异全部还原、复绿之后取样；与上面读数同一份工作树状态）

```
27805212547ee5cea7741b547cf8d54811d0b437896554fa96260bb1b606336b  auth/RealAccountSecurityService.java
c3d917c59ed023c7f8fbebb5e6e9b4a9ddc772be9da2e4c08e404aece8ce216e  entity/User.java
d3590fc7b71cff8c9722aa135add6530c9c1dc5af689420109ca024d8dd616e3  privacy/AccountErasureService.java
83f3a7c8c7aff42dd0bf93bce08b877ca718845b360aac960ca982eb316c6016  ratelimit/RateLimitAspect.java
2ae47ded0f7b2f5a16b941439536a87cfb3ce818609dec7aa7d0869be7b9c1ee  auth/SmsCodeController.java
3c376c31253bd6f15285393525ffac218ee27d5cd471a6a9c1ef29b63a806c72  test/auth/PublicAuthWriteRateLimitTest.java
bb0cdac646c6d6941733099d02ddfd9c8d7b60f64d7b6c42513e88ef0c7d06bb  test/auth/RealAccountSecurityServiceTest.java
fb73447a4d33112355d099c67a669d954d14bf7760f0737949debdb7b000ce25  test/privacy/AccountErasureServiceTest.java
30ec75be1a63002cc249e0979284efe60dbbf116b2048b982e70f882c471495c  test/mq/ErasedSubjectBackgroundWriteTest.java
3c53719dc0b628c413173abafa3644cc46f55a7001021071ddb426e42371d4a3  test/vip/ErasedSubjectBillingLedgerTest.java
```

`grep -rn MUTATION src/main src/test` 无命中（所有变异标记都已删除）。

补测（写完全量读数之后又做了一次，为把 F10-4 的红点原文取全）：
把 §4.3 的 MUTATION-A2-F10-4 再apply 一次 ⇒ `deactivate_abortsTombstoneSaveWhenErasureFailsMidway`
以 `NeverWantedButInvoked` 红（原文已抄进 §4.3；`User@6b2ef50e` 是 JVM 对象标识，每次跑都不同，
本轮复现时是 `User@2ef041bb`，不是判点内容）⇒ 原样还原 ⇒
`-Dtest=RealAccountSecurityServiceTest,PublicAuthWriteRateLimitTest,AccountErasureServiceTest,ErasedSubjectBackgroundWriteTest,ErasedSubjectBillingLedgerTest,RateLimitKeyAuditTest`
⇒ `Tests run: 47, Failures: 0, Errors: 0, Skipped: 0 / BUILD SUCCESS`，
且 `RealAccountSecurityService.java` 还原后的 sha256 与上表逐字相等
（`27805212547ee5ce…b606336b`）⇒ §0.2 那份全量读数与本车道最终代码状态仍然一致。

---

## 7. 本机判不出 / 遗留债

### 7.1 本机判不出（环境所限，逐条，不许当成已验证）

1. **`@Transactional` 真回滚**：F-10 的三条替身用例证到的是「异常不被吞 + 写序被硬中断 +
   墓碑写在清单之后 + 文件删除挂在 afterCommit」。76 条语句在 MySQL 8 上整笔回滚是否真的发生、
   `undo log` 是否覆盖所有语句——本机无真库，判不出。
2. **76 条清除语句在 MySQL 8 上可执行**：本车道没动清单，但 F-08 之后仍需真库往返验证
   （`ErasureSchemaAlignmentTest` 只静态证明表/列存在性，JOIN 形态语句的列名仍刻意不查——A1 §7 已写明）。
3. **real profile 装配完整性**：新加的 `@PostConstruct` fail-fast 是否在生产 profile 下真的通过，
   需要起 real 上下文（连真 MySQL + Redis）；唯一能证的 `RealProfileAuthChainIntegrationTest` 本轮仍 5 例 skip，
   命令行已交主控（§6.1）。在它被接上之前，「缺席即启动失败」这条只由单测替身覆盖。
4. **AOF 里是否已经落过裸手机号键**：F-05/第 1 项只证明「从现在起键名是摘要」。
   历史键是否仍在 `appendonly.aof` / RDB 备份里，本机无活 Redis，判不出；
   这需要运维侧轮换/清理 AOF 与备份，代码层面无法闭合。
5. **对象存储物理删除**：`filePurgeRunsOnlyOnCommitAndNotOnRollback` 用替身证回调时机；
   真实桶、`MediaStorageService.delete` 的语义、`posts.images`/`comments.images` 是否都被 `media_asset` 覆盖，
   仍判不出（A1/第四轮同口径遗留）。
6. **MQ 端到端重投时序**：F-08 的短路在真实 RabbitMQ + outbox 每 30s 补偿下的实际效果，
   需要活的 broker；本车道用直接调用 handler 的替身证明「落库段前 return＝不写行且 ack」。
7. **多副本限流阈值不放大**：需要两个 JVM + 真 Redis（`RateLimitBucketRegistry` 的分布式路径本机跑不了），
   第 1 项的判点走的是本地桶路径。
8. **真实栈门禁能否跑通**：`-D` 属性传导这一半已实测（§6.1：门被打开、Spring 上下文开始装配）；
   「跑通」那一半判不出——本机无 MySQL，上下文装配到数据源就挂住。
   所以 F-07 第④步交付的是「命令行 + 属性传导已被证明」，不是「real 档集成测试已经绿」。

### 7.2 遗留债（如实记录，未 gold-plate）

1. **outbox 定向清除**未做（§3.4 给了不动 schema 的判断与代价对比）。若主控裁定要「注销能清空 outbox」，
   需要：幂等迁移只补 `user_id` 列（照 `V2026.10.13.0002` 的 `SET @has_col` + `PREPARE` 写法）+ 清单项 +
   `PersonalDataTables` 的类别同步，且必须真库验证。
2. **`AccountSecurityService` 的其它实现**（mock 档）未同步这套缺席语义：缺席即失败只在 real 实现里；
   mock 档本来就是演示档，按报告射程不动。
3. **`ErasureSubjectGuard` 与 `AutoRenewService` 各查一次 `findById`**：消费者侧（只有 userId）与续费侧（已持有实体）
   两种形状，后者刻意直接用实体避免多一次查询。两条口径都由 `User.isErasedSubject()` 单点定义，不会漂移。
4. **`deactivated` 之外没有「软删除中」状态**：消费者短路的判点是终态；若将来引入「注销冷静期/可撤销注销」，
   `isErasedSubject()` 的语义要重新裁定（届时这条判点会是唯一提醒）。
5. **F-09（管理端建号写明文 phone/openid）不在本车道射程**，未碰 `AdminUserController`；
   它与第 1 项共享「PII 不落键名/列」的动机，但属另一条改动。
6. **`isErasedSubject` 只判 `deactivated`**：管理员 `disabled` 主体的通知照写（可逆），
   与 F-08「注销是终态」严格分开——变异3（口径扩大）就是钉这条边界的。

### 7.3 反向变异的可复核性

11 轮变异（F05 2 条、F07 2 条、F08 3 条、F10 4 条 —— 其中 F10-2 有 2 条既有用例 collateral、
F10-4 复跑过一次以取全红点原文，均已在 §4.3 如实标注），
每条都是「临时改坏 ⇒ 真跑出红 ⇒ 原样还原 ⇒ 复绿」，红点原文抄录在 §1.4、§3.5、§4.3（控制台是 GBK 渲染，
中文按源文件逐字复原，未改写措辞）。

还原的最终核验（不是只靠删注释）：
- `grep -rn MUTATION src/main src/test` 无命中；
- `grep -n "erasure.erase(userId);" -A3` 显示 `deactivateAccount` 的写序回到「清单 → 墓碑 → save → 吊销 token」；
- 还原之后再跑一次全量独占 maven：`Tests run: 1797, Failures: 0, Errors: 0, Skipped: 10 / BUILD SUCCESS`
  （即 §0.2、§6 的那份读数，取样状态 = 所有变异已还原）；
- 该状态下 10 个文件的 sha256 已记在 §6 末尾。

一处需要主控知道的执行纪律问题：本车道中途有过「全量 mvn 与变异单类 mvn 并发」的一次事故，
那份被污染的全量读数（`Tests run: 1761, Failures: 3, Errors: 199`，大量
`NoClassDefFound WxPayBootstrapChecker`）**不是**任何结论的依据，已被上面这份还原后独占重跑取代；
记录在此是为了说明为什么同一份代码出现过两个全量数字。

---

## 8. 前提核对（转述与报告口径以盘上为准的纠正）

1. `DataUpdateException` 不存在于本仓依赖，改用 `DataIntegrityViolationException`（§4.1）。
2. 报告里 A 车道的 file:line 全部已漂：`NotificationConsumer` 的落库段实际在 `:267-288`，
   但短路点选在 handler 的 `:186`（早于 openid 查询与落库，才能同时免掉微信订阅消息）；
   `MatchEventConsumer` 短路在 `:321`、`CheckInEventConsumer` 在 `:249`（与报告点名的位置不同，
   动手前逐个 grep 到符号再定位置）。
3. 「`RealAccountSecurityServiceTest` 有两个用例正是在 bean 缺席下断言注销成功」这条前提成立：
   旧 `setUp` 用 6 参构造、字段注入的 `accountErasureService` 恒为 null，
   `deactivate_success_erasesInventoryAndWritesUsersTombstone`（钉 `phone == NULL`）与
   `deactivate_noPasswordAccount_requiresConfirmationText` 都跑在 `manualTombstone` 兜底上——
   现已改为注入真实清除服务，兜底方法删除。
4. 「`AutoRenewService` 未开启续费分支仍给墓碑 user_id 写 FAILED 流水」成立且可复现成因
   （扫描快照先于注销），修法见 §3.3；同一条链路里「不真扣钱」那半（`renewVip` 事务内重校验
   `autoRenewEnabled`）确实已成立，本报告不重复认领。
5. A1 已纠正的两处前提（`official_messages` / `error_reports` 无用户归属列，不进清单）本车道未触碰、未重复劳动；
   本车道也未改 `PersonalDataTables.java` 任何一个条目，穷尽门 `everyOwnerColumnTableIsNamedOrExempt` 仍在绿。
6. 一次被污染的全量读数（1761 例 / 3 失败 / 199 错误）来自「全量 mvn 与变异单类 mvn 并发」的操作失误，
   已用还原后独占重跑取代，详见 §7.3 末段——不拿它当任何结论。
