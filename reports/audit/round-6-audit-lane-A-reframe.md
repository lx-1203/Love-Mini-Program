# 第六轮反证复审 · A 车道（reframe：证伪 b8a60114 修复批次）

- 被审提交：`b8a60114`（91 文件）；HEAD：`74e681ca`
- 车道立场：反证。每条声明回到盘上复量；不复述报告自称。
- 纪律：仓内零修改（本报告除外）、零 git 写操作、只跑只读门；本车道独占 maven。
- 状态：**已完成**（7 节全部落盘，8 条编号发现）

## 节 1 · 注销清单/运行时语句/导出类别三个计数复量（69→83 / 62→76 / 27→28）

**结论：三个数全部成立（实测，非 grep）。附带一条结构性观察（不是缺陷，但要记账）。**

我实际跑的命令与读数：

1. 运行时真值（不是我数的，是被测进程自己打的日志行）——
   `cd apps/api && ./mvnw.cmd -o -B test`（本车道独占 maven，全量，3:52，日志落 `/d/6/tmp-r6a/mvn-full.log`）：
   ```
   [WARNING] Tests run: 1797, Failures: 0, Errors: 0, Skipped: 10
   [INFO] BUILD SUCCESS
   2026-11-01 13:10:39.235 INFO AccountErasureService - 账号注销数据清除完成: userId=100, 语句数=76, 影响行数=76, 待删文件数=0
   ```
   ⇒ 「运行时语句数 76」是运行观测，成立；skip 仍恰好来自 `FlywayMigrationRepeatableTest` 与
   `RealProfileAuthChainIntegrationTest` 两个 `@EnabledIfSystemProperty` 门控类（`Running` 行在日志里逐一点到）。
2. 结构真值——`jshell --class-path apps/api/target/classes` 直接枚举 `PersonalDataTables.INVENTORY`（载具 `/d/6/tmp-r6a/count.jsh`）：
   ```
   TOTAL_ENTRIES=83   RETAINED=7   ACTIONABLE=76
   STATEMENTS_ALL=76  STATEMENTS_ACTIONABLE=76
   EXPORT_DISTINCT_CATEGORIES=28   NAMED_TABLES_DISTINCT=78
   MULTI_STMT=[likes_inbound:0, user_follows_inbound:0, content_mentions:0, vip_billing_log:0,
               user_wallet:0, promo_code_usages:0, invite_reward:0]
   ```
   ⇒ 83 项 / 76 条可执行 / 28 个导出类别，与收口账 §2 F-01 行与 A1 §0 逐字一致；`whispers` 真在类别集里。

**附带观察（P4，记账不判缺陷）**：`STATEMENTS_ALL == STATEMENTS_ACTIONABLE == 76`，且唯一的 0 语句项就是 7 个
`RETAIN_STATUTORY` 项 ⇒ **每个可执行项恰好 1 条 SQL，清单里不存在多语句项**。
这意味着「语句数 62→76」这个数在数值上等于「可执行项数」，它不是独立测量而是同义读数；
将来若有人给某项加第二条语句，日志里的「语句数」与「影响行数」会开始分叉，而 `AccountErasureServiceTest`
用的是 `INVENTORY.stream().mapToInt(t -> t.statements().size()).sum()` 动态求和
（`AccountErasureServiceTest:80-84`，我已核到原文），
不会因此变红——这是「清单条目数＝语句数」这一巧合带来的隐性耦合，不是本轮的错，但下一轮别把 76 当两个独立量。


## 节 2 · 穷尽门 `everyOwnerColumnTableIsNamedOrExempt` 是否被豁免集掏空

**结论：没有被掏空（实测零差集）；但「掏空」这道门本来就能做到，只是本轮没被这么做。**

我实际跑的命令与读数：

1. 豁免集实测：**3 条**（`ErasureSchemaAlignmentTest.java:109-122`，`Map.of`）——
   `post_mentions` / `feedback_admin_reply` / `sensitive_word_import_task`，
   理由串实测长度 **178 / 156 / 162** 字符（逐字面量求和，载具 `/d/6/tmp-r6a/exlen.js`；门只要求 ≥20，
   即这道「必须写理由」的闸今天余量 8 倍，形不成约束）。
2. 归属表集合用**实盘**复量（不是我按门重写、也不是 grep 条数）——
   `information_schema.COLUMNS`（live MySQL 8.0.45 / `campus_love`，118 张表 / 1124 列），
   判据与门的词汇逐字对齐（15 个精确名 + `%_user_id` + `%_author_id`）⇒ **78 张归属表 / 93 个归属列引用**。
   再与 `PersonalDataTables.INVENTORY` 的点名单（jshell 取，78 张不同表）作 `comm` 差集：
   ```
   DB 有归属列、清单未点名  →  feedback_admin_reply, post_mentions, sensitive_word_import_task  （恰=3 条豁免）
   清单点名、DB 无归属列    →  payment_callback_log, temp_chat_message, users                   （JOIN 侧 / 主体表本身）
   ```
   ⇒ **差集为空**：门声称的「78 张在场归属表」与实盘一致，三张豁免正好是全部剩余项，没有第四张偷偷免检。
3. 词汇表宽度单独证伪一次：用一条**刻意更宽**的正则（`uid|member|customer|person|profile|account|creator|owner|
   submitter|reviewer|admin|operator|target|subject|actor` 结尾 + `phone/mobile/openid/unionid/id_card/email/ip/device_id`）
   复扫实盘 ⇒ 16 列 / 12 表命中，落在「未点名 ∪ 未豁免」之外的只有 2 张：
   `promo_codes.max_uses_per_user`（数值上限）、`temp_chat_media_holds.session_uid`（会话 UUID）。
   ⇒ 两张都是宽词表的假阳性，**门的窄词汇今天没有漏掉任何一张真有归属列的表**。

**「若某张真有归属列的表被塞进豁免，门会不会红」——不会红，这是设计事实不是猜测**：
判据本体 `if (named.contains(table) || OWNER_TABLE_EXEMPTIONS.containsKey(table)) continue;`（`:249-251`）。
三条反漂移断言（`:262-268`）判的是「理由串 ≥20 字」「该表仍在 T 里」「该表仍不在清单里」，
**没有一条判理由是否为真**。这张门可靠抓的是「漏登记」，抓不到「登记了但理由是错的」。
本轮三条理由我逐条回源码/实盘核过：`sensitive_word_import_task`（`operator_id` 实盘可空、写点
`SensitiveWordImportService` 是管理员导入）属实；`post_mentions`（实体 `PostMention` 存在，但
`village/PostMentionService` 的 `saveMentions/notifyMentions` 全部委派 `ContentMentionService`，
零写 `post_mentions`）属实；`feedback_admin_reply` 结论（死表）属实、文字有一处不实（见 F-A7）。

影响：声明成立，不需返工；但「穷尽」一词覆盖了「白名单式豁免」这层软肋。
严重度：**P3**（设计局限，非本轮缺陷）。
建议修法：把豁免从「表名 → 散文理由」升级成「表名 → {自认的非归属列集合, 理由}」，
让门比对该表在链上真实存在的归属列 ⊆ 豁免声明的那几列——「同名列但语义是管理员」就有机器判点可咬。
本机判不出的部分：三张豁免表在**生产库**的行数（本机 `campus_love` 三张均 0 行）。

## 节 3 · F-07 fail-fast：缺席 503 与启动 fail-fast 在 real profile 下是否自相矛盾

**结论：两条不矛盾（同一后果的两道闸），但 503 那一半在 real 档不可达；而「启动 fail-fast」的判点确实只在替身层面。**

我实际跑的命令与读数：
- 装配事实：`RealAccountSecurityService.java:34 @Profile("real")` + `:35 @Service`；
  `AccountErasureService.java:70 @Profile("real")` + `:71 @Service`。mock 档是**另一个类**
  `mock/MockAccountSecurityService`（`grep -l implements AccountSecurityService src/main` 只出这两个）。
  ⇒ **mock 档没有被这道闸拦死**：`@PostConstruct` 挂在 `@Profile("real")` 的 bean 上，mock 档不实例化它。
  旁证：我这发全量 `mvn test` = 1797 例 / 0 失败，其中含 4 处真实 profile 切片
  （`SmsCodeServiceGatewayTest:31`、`FlywayMigrationRepeatableTest:43`、
  `RealProfileAuthChainIntegrationTest:98`、`VipPlanCatalogContainerWiringTest:70`），无一被这道闸打红。
- 判点本体：`RealAccountSecurityServiceTest:309-325` 是
  `assertThrows(IllegalStateException.class, notWired::failFastIfErasureServiceMissing)` —— **手工点方法名**，不经容器。
  `grep -rn "PostConstruct" src/test tests/ scripts/` 命中 3 处注释、**0 处判点**
  ⇒ 「Spring 会在启动期调用它」在本仓没有任何在跑的判点；唯一能证的
  `RealProfileAuthChainIntegrationTest` 5 例仍 skip（我的全量日志里 `Running` 行出现且计入 Skipped:10）。
- `RealAccountSecurityServiceTest` 断言的是替身还是真 bean：`setUp:70-76` 用
  `Mockito.spy(new AccountErasureService(mock(JdbcTemplate), mock(ObjectProvider)))` =
  **真类的真实例**，`tombstone()` 走生产列集，只有 DB 与 provider 是替身 ⇒ F-07 ③ 的声明成立。

### 发现 F-A3（P2）
现象一句话：`@PostConstruct` 使「bean 缺席 ⇒ 启动失败」，于是同一段代码里「缺席 ⇒ 抛 503」在 real 档
**永不触发**；而把 `@jakarta.annotation.PostConstruct` 这行删掉，本仓全量套件仍 0 失败。
读数：上列 grep + 我这发全量 mvn（1797/0/10）。
影响：① 收口账 §2 F-07 那格把「缺席 ⇒ 503」写成用户可见行为，实际生产行为是「起不来」，读账方向会错；
② fail-fast 的**装配级**保证是空的，回归形状正是「下次有人重构构造器、注解漂掉、无人变红」。
建议修法：加一条不需要真库的静态判点（照 `RateLimitKeyAuditTest` 形状）——反射取
`RealAccountSecurityService#failFastIfErasureServiceMissing`，断言其上存在 `jakarta.annotation.PostConstruct`
且类上 `@Profile` 含 `real`；同时把收口账那格改成「缺席 ⇒ 启动失败（503 为装配后失活的第二道闸）」。
本机判不出的部分：「删注解是否真全绿」是我从 grep（无人读该注解）**推**的，没有实跑——本车道纪律禁改盘。

## 节 4 · F-08 消费者短路：短路点是否真在落库之前 / ack 语义 / `isErasedSubject()` 边界

**结论：成立，且这三个消费者的全部写面只有一处 `save`，所以「只拦这一处」不是漏拦。**

| 消费者 | 短路行 | 该类全部写库调用 | 中间还有别的写吗 |
|---|---|---|---|
| `NotificationConsumer` | `:186`（try 段第 0 步，早于类型判定与 openid 解析） | `:295 notificationRepository.save` | 无（`:251` 是 `findById` 只读；微信订阅推送在 save 之后，一并被跳过） |
| `MatchEventConsumer` | `:321`（`persistNotification` 段首） | `:334` | 无 |
| `CheckInEventConsumer` | `:249` | `:263` | 无 |

取证命令：`grep -nE "\.save\(|\.delete|JdbcTemplate|Repository\.|\.update"` 三文件各只出 1 条写调用 ⇒ 写面=1、拦面=1。
- **ack 语义**：`NotificationConsumer:175` 的 `idempotencyStore.claim(dedupKey)` 发生在短路**之前**，
  短路走 `return`（正常返回＝ack）且不释放幂等位 ⇒ 同 `eventId` 重投在 `:176` 就被跳过。
  报告自述「丢弃并 ack，幂等登记不撤销 ⇒ 同一条重投永久不再处理」**逐字与盘上一致**——
  即：消息确实会被永久丢掉，这是写明的取舍而不是隐藏副作用。
- **`isErasedSubject()` 与 `disabled` 的边界**：`entity/User.java:448-450` ＝
  `"deactivated".equalsIgnoreCase(status)`，与 `isDisabled()` 完全分离；
  `AutoRenewService:542` 的短路位置（取实体之后、`autoRenewEnabled` 之前）与 A2 §3.3 描述一致，
  其后所有失败分支被覆盖；`:532` 的 `catch (IllegalArgumentException)` 走「实体根本不存在」，
  注销主体是墓碑行不是消失行，不会被它绕过 ⇒ 边界声明成立。
- **失败方向**：`ErasureSubjectGuard:44-46`（repo/userId 为 null ⇒ 不拦）与 `:56-60`
  （`catch (RuntimeException)` ⇒ WARN 后返回 false）读源码属实；代价（DB 抖动窗口内仍可能追加一行）
  被写成取舍而非缺陷，定性正确。
严重度：**P4（阴性记录）**。本机判不出：真 RabbitMQ + outbox 每 30s 重投的端到端时序（本机无 broker）。

## 节 5 · F-05/F-09：限流键不变量可红性 + 管理端派生键的历史明文行迁移空洞

### 5a F-05：不改盘判「把键改回明文会不会红」——会红，且红在三处独立位置

取证（`PublicAuthWriteRateLimitTest` 全文读 + 我这发全量日志的运行观测）：
- 判点 1/2/3 是**运行级**：`RecordingBucketRegistry extends RateLimitBucketRegistry`，
  重写 `tryConsume` 记下真实桶键后 `super` 委托（令牌桶语义仍是生产实现，不是 mock）。
  判点 3 是 `assertFalse(bucketKey.contains(phoneA) || bucketKey.contains(phoneB))`
  ⇒ **键退回 `#payload.phone` 时桶键就是 `SmsCodeController#sendCode:13800000001`，这条必红**，
  不依赖任何字面文本。判点 1 同时锁「摘要稳定」（摘要若每次不同，第二次被放行 ⇒ 红）。
- 判点 4b `assertTrue(expression.contains("#pii.ref("))` 是注解原文级，第 2 处会红；
  `RateLimitKeyAuditTest.noKeyMayEmbedRawPii`（`:295-313`，逐个 `@RateLimit` 真求值键）是第 3 处。
- 探测器本身有阳性对照：`piiDetectorActuallyBites`（`:364-382`）用 `piiLeakingProbe`（`#phone`）断言必被判红、
  再用 `piiSafeProbe`（`#pii.ref(#phone)`）断言不误伤且不含明文 ⇒ 这条判点不是恒绿的空门。
- 运行观测（我的 `/d/6/tmp-r6a/mvn-full.log`，非报告转抄）：
  ```
  key=SmsCodeController#sendCode:b35ff8b3d62700ca5cc5054ff8cbc374
  key=SmsCodeController#sendCode:0b27de5191f114048d9a781b2cc380d6
  grep -c "key=[^ ]*1380000000[12]" → 0
  ```
  ⇒ 全量 1797 例跑完后，**任何一次桶键里都没有手机号原值**；键形态是 32 位 hex。
- 一处小瑕疵（不翻案）：判点 4b 把「必须走 `#pii.ref(`」钉成字面串，与本批自己立的规矩
  （「判点钉实现字面文本 ⇒ 等价修复必假红」，收口账 §6 第 5 条）同形——
  换成等价但不同名的包装器（`#pii.hash(...)`）会假红。因判点 3 是行为级兜底，我判 **P4**，不改也许可接受。

### 5b F-09：历史明文行**没有**让预检与登录互找重新不一致；真洞在第三条写入路径

实盘 census（`campus_love`，404 行；命令：`information_schema` + `SHA2()` 交叉连接）：
```
users.phone 形状   NULL=260  PLAINTEXT_11位=129  BASE64密文=15
users.openid 形状  guest:=259  phone:=27  OTHER(微信真 openid)=118
phone:% 里         len=17(明文派生)+明文列=12 行   len=70(sha256 派生)+密文列=15 行
明文 phone 且 openid 不是 phone: 前缀            = 117 行
密文 phone 且 openid 不是 phone: 前缀            = 0   行
同号重复（明文行 X 与派生行 Y 命中同一号码）      = 0   组
明文/派生各自重复组                              = 0 / 0
uk_users_phone(唯一) / uk_users_openid(唯一) 在实盘确认存在
```
- 逐路径核对（源码 + 上面读数）：
  管理端预检 `AdminUserController:179-181` ＝ `findByOpenid("phone:"+sha) OR findByPhone(明文)`；
  注册 `RealAuthService:614-616`、登录 `RealAuthService:687-688` **同一形状**；
  派生算法两侧同源（`RealAuthService#hashOpenid:1196-1202` 直接委派 `PhoneColumnCodec.sha256Hex`）
  ⇒ 「口径逐字一致」这句我核到了实现层，成立。
  对 129 条历史明文行：两条路径都由 **明文兜底那一支**命中 ⇒ **不会**因为改用派生键而互找不一致。
  报告 F-09 的声明**成立**。

### 发现 F-A5（P2）
现象一句话：真正会绕过唯一性预检的是 `PhoneBindingController#bindPhone`（`:113-116`）——
它把手机号写成 **AES 密文**、**不重写 `openid`**（保持微信 openid）、并且**完全不做任何重复性预检**。
读数：源码 + 实盘「密文 phone ∧ openid≠phone: 」当前 0 行（本机库尚未走出这条路径，属**潜在**而非已发生）。
影响（三层，都能从同一形状推出）：
① 该账号的号码此后既不被 `findByOpenid(派生)` 命中、也不被 `findByPhone(明文)` 命中
   ⇒ 管理端建号/注册都能**再建一个同号账号**；
② `uk_users_phone` 也挡不住：AES-GCM 随机 IV ⇒ 同一号码两次密文不同，唯一索引形同虚设；
③ 该账号自己也**无法用手机号+密码登录**（同一双找都落空），只能走微信。
即：F-09 把「两条路径口径对齐」这一半修好了，但整套判据建立在「phone 列只有 明文 / 密文+派生openid / NULL」
这三种形状上，而 `bindPhone` 是本仓**第四种形状**的唯一生产者，`PhoneColumnCodec` 的类注释也没把它列进合法取值。
严重度：P2（可静默产生重复身份 + 本人登录不回，非数据损毁）。
建议修法：`bindPhone` 换取手机号后，与 `RealAccountSecurityService#changePhone`（`:176-188`）对齐——
先做「派生键优先 + 明文兜底」查重（并排除自己），再 `user.setPhone(cipher)` **同时**
`user.setOpenid("phone:"+sha256Hex(phone))`；或在 `PhoneColumnCodec` 里把「密文 + 非派生 openid」
显式声明成第四种合法形状并给预检补一支「按密文列不可行 ⇒ 需在写入时就登记派生键」的判点。
配套应加一条不需要真库的静态门（照 F-11 的形状）：`grep users.setPhone(` 的全部写点，
逐个断言其或写 `openid` 派生键、或走 `PhoneColumnCodec.store` + 查重，否则红。
本机判不出：生产库里是否已存在这种形状的行（要把 15 条密文解密后才能与微信 openid 行交叉比对，
本机我只做了 SQL 侧的未解密普查）；以及生产库行数分布。

## 节 6 · `PersonalDataTables` 新增项：存在性 vs 语句语义

**结论：语义这一维本轮我把它从「本机判不出」推进到了「实盘可证的部分已全证」，零违例；
剩下的只是「影响行数 / 真回滚」这类必须写盘才能证的部分。**

我实际跑的命令与读数（全部零写入，载具在 `/d/6/tmp-r6a/`）：
1. 取真值清单：`jshell --class-path apps/api/target/classes` 导出 76 条语句原文 →
   `inventory_stmts.tsv`（`STMT|n|key|table|action|sql`，76 行，`{uid}` 占位 85 处，无 `?`）。
2. **逐条 `PREPARE`**（MySQL 的 PREPARE 会解析并解析对象名，但**不执行**，因此零写入）：
   `{uid}` 替换为常量 100，语句以 `SET @s = 0x<hex>` 承载（UTF-8 中文哨兵不经 shell 转义），
   `mysql --force ... < prepare_all.sql` ⇒ **stderr 0 行**（76/76 通过）。
3. **载具阳性对照**（证明这道检查会咬）：
   ```
   UPDATE users SET nickname='x' WHERE typo_column=100   → ERROR 1054 (42S22) Unknown column
   DELETE FROM typo_table_here WHERE user_id=100         → ERROR 1146 (42S02) Table doesn't exist
   ```
4. 约束语义（PREPARE 抓不到的部分）用 `information_schema` 对账（`analyze.js`）：
   - 21 条 UPDATE 的**每一个 SET 目标列**都在实盘存在（0 条「找不到」）；
   - **没有任何 NOT NULL 列被 `SET = NULL`**（11 条含 `= NULL` 的语句，其目标列 `IS_NULLABLE` 全为 YES：
     `private_messages.quote_context`、`posts.title/images/tags/owner_circle_path/audit_remark`、
     `comments.images/owner_circle_path`、`circle_topics.images`、`campus_topics.images`、
     `circle_announcements.title`、`notifications.source_user_id`、`feedback_tickets.contact_wechat/
     attachments/latest_reply_summary`、`activity_proposal.attachment_json/expected_city/expected_campus`、
     `audit_log.request_body/error_message/ip/user_agent`、`user_agreement_consent.ip`、
     `payment_callback_log.raw_body/headers/detail`、`vip_order.openid/prepay_id`、`vip_bills.remark`、
     `wallet_transaction_log.remark`、`private_conversations.last_message_preview`）；
   - 无 ENUM/SET 域越例——但**这条今天无适用对象**：实盘 1124 列里 **0 个 ENUM/SET 列**（本仓的枚举全用
     varchar + 应用侧 Java 枚举表达），所以这个判据在本库是空跑，不得当成证据；
     「字面量长于列宽」的检查同样 0 违例（哨兵 `ErasedValues.TEXT_CONTENT` 13 字 <
     `whisper_message.content VARCHAR(60)`、`SHORT_TEXT='已注销'` 3 字 < `reports.reason VARCHAR(64)`、
     `NICKNAME='已注销用户'` 5 字 < `users.nickname VARCHAR(64)`、`erased:<uuid>` 43 字 < `users.openid VARCHAR(128)`）；
   - **CHECK 约束维（本车道新增，门与 PREPARE 都抓不到）**：实盘有 **13 条 CHECK 约束**
     （`posts.status`、`posts.category`、`likes.status`、`heart_signals.status`、`notifications.type`、
     `real_name_certifications.status`、`user_agreement_consent.source`、`temp_chat_session.phase`、
     `circle_announcements.status`、`user_online_status.status`、`content_mentions.target_type`、
     `activities.status`、`notifications.reference_type`）。逐条与 21 个 SET 目标求交 ⇒
     **只有 1 列命中约束**：`#21 posts.status = 'deleted'`，域为 `[active,deleted,hidden]` ⇒ **在域内**；
     实盘 `posts`（203 行）的现存 status 取值即 `active,deleted,hidden`，`deleted` 已被使用过。
     这条是我这发里唯一「改了载体才新出现的判据维」，也是下轮最该盯的形状：
     谁把哨兵改成 `SET status='erased'`，PREPARE 与存在性门都绿、真实注销会炸 3819；
   - **FK 写序**：64 条外键中指向任一 DELETE 目标的只有 2 条，全是 `CASCADE`
     （`private_messages→private_conversations`、`temp_chat_contact_exchange→temp_chat_session`）⇒ 自动随行删除；
     `RESTRICT/NO ACTION` 指向 DELETE 目标的数量为 **0**，无「子表后删导致 1451/1452」的次序违例；
   - 双轴 `OR` 删除（`video_call_records`/`video_calls`/`heart_signals`）PREPARE 通过，
     且 `video_calls.caller_id/callee_id → users.id` 是 RESTRICT（删子不删父，无影响）。
5. `tombstone()`（生产列集，`AccountErasureService:143-169`）写入 `users` 的 14 个置 NULL 列，
   实盘 `IS_NULLABLE` 全 YES；被写非空值的 NOT NULL 列（`nickname/openid/role/status/auto_renew_enabled/
   profile_completion/following_count/followers_count/updated_at`）取值分别为
   `已注销用户`(5字<64)/`erased:<uuid>`(43字<128)/常量/0/now ⇒ **无 NOT NULL 撞 NULL**。
   `uk_users_phone` 唯一但 MySQL 对 NULL 不去重（260 条 NULL 已在盘上共存，即为实证）⇒ 报告 §codec 注释里
   「NULL 不占唯一位」这条依赖成立。

### 发现 F-A6（P4，账目过期而非缺陷）
现象一句话：收口账 §5.1 把「76 条语句在 MySQL 8 上的真实可执行性」整格记成本机判不出，
实则本车道用 PREPARE + `information_schema` 就能把它证到（对象可解析、约束不冲突、FK 写序合法）。
读数：上面第 2–5 步。严重度 P4。
建议修法：把 §5.1 拆成两格——「语句可执行性/约束兼容性＝已证（零写入路线）」与
「影响行数、真回滚＝仍需 DBA 凭据或可建影子库」；并把这套载具（`gen_prepare.js` + `analyze.js`）
落成 `scripts/qa/verify-erasure-statements-against-live-schema.mjs` 之类的常开门，否则下轮又要从零推。
本机判不出：真实影响行数、`@Transactional` 在 MySQL 8 的整笔回滚、外键在**有数据**时的实际拦截行为
（本机相关表 0 行；影子库被权限挡死，`campus` 账号 `CREATE DATABASE` 报 1044）。

## 节 7 · 收口账 §1 读数抽复

我抽了 3 发（任务建议的三发全抽），逐格与自己跑的对照：

| 收口账记载 | 我这发的读数 | 判定 |
|---|---|---|
| `mvn -o -B test`：`Tests run 1797, F 0, E 0, Skipped 10` + BUILD SUCCESS | 同一读数，`Total time 03:52`，MVN_EXIT=0；skip 仍来自 `FlywayMigrationRepeatableTest` + `RealProfileAuthChainIntegrationTest` | **一致** |
| `npm run test:i18n-orphan`：`I18N_ZH_KEYS=4222`、孤儿 `1251/1251`、裸中文 `341/341`（模板 265/属性 33/toast 24/兜底 19/throw 0，84 文件）、`I18N_RESULT=PASS` | 逐字一致；退出码 0 | **一致**（补充：账里没写 `I18N_PAIRING=SKIPPED reason=en-US 语言包已下线`、`STATIC_REFS=2484`、`DYNAMIC_PREFIXES=10`；成对维自 F8「诚实化」后已不覆盖，账 §2 Lane C 有载 §1 未载，属可接受） |
| `node tests/admin-write-gate.spec.mjs`：写视图 34 / 端点 182 / 不中 0 / 豁免 0 / 盲区 22-0-0 / 注解 45 · 归档函数 43；`--self-test` 六向判红全绿 | 主跑逐字一致；`--self-test` EXIT=0，原文「(a)超管档位 (b)纯 ADMIN 档位 (c)前端比后端严 (d)豁免方向写反 (e)脚本块顶层写调用 (f)死位 六向判红，正控绿」 | **一致**（补充：账里省了 `写 API 函数 96 个 / 已归档写函数 95 个`，96↔95 差 1 是门自己允许的，建议在账里点名，否则下轮会当成新洞） |

⇒ **§1 的三发读数没有一处与盘上冲突，收口账这一节是实测账不是转抄账。**
未复的 6 发（`test:contracts`/`test:admin`/`test:client`/typecheck/`test:gate-wiring`/`prove-gates-can-fail`）：
前两类要跑 `generate:openapi`（会改 `apps/client/src/types/api-types.ts`），`prove-gates-can-fail` 会改盘，
均被本车道纪律禁止 ⇒ 写进「未展开」交主控。

## 编号发现汇总（本车道上限 8 条）

| # | 现象一句话 | 取证命令 → 读数 | 影响 | 严重度 | 建议修法 | 本机判不出 |
|---|---|---|---|---|---|---|
| F-A1 | 穷尽门的豁免集是设计上的逃生口：门判「在不在豁免里」，不判「豁免理由是否为真」 | `comm` 比对 live `information_schema` 的 78 张归属表 ↔ 清单点名单（78）∪ 3 条豁免 ⇒ 差集恰等于豁免集；`:249-251` 的 `continue` + `:262-268` 三条反漂移断言不含真值判定 | 今日无漏表（实测零差集），但「把真主体表写成豁免 + 20 字漂亮理由」可以静默通过 | **P3** | 豁免条目从 `表名→散文` 改为 `表名→{自认非归属列集合, 理由}`，门比对真实归属列 ⊆ 声明集合 | 生产库行数（本机 3 张豁免表均 0 行） |
| F-A2 | 归属列词汇是白名单 + 只读 CREATE 体：`ALTER TABLE … ADD COLUMN xxx_user_id` 补出来的归属列不进 T | `OWNER_COLUMNS`（15 名）+ 两后缀；我另用更宽正则扫实盘 ⇒ 12 表命中、仅 2 表未被覆盖且皆为假阳性（`promo_codes.max_uses_per_user`、`temp_chat_media_holds.session_uid`） | 今天不漏；将来用 ALTER 补一张主体表的归属列，门不会红 | **P4** | 让 `applySchemaText` 也吃 `ALTER TABLE … ADD COLUMN`（只补进 ownerCols，不喂给循环补列探针），并给「词汇表新增条目必须同时有阳性夹具」加一条判点 | 无（纯结构） |
| F-A3 | 「缺席⇒503」在 real 档不可达；「启动 fail-fast」只被方法级替身证明 | `@Profile("real")` 两侧同档（`:34/:70`）；`RealAccountSecurityServiceTest:309-325` 手工调用；`grep PostConstruct src/test tests scripts` = 0 判点；全量 1797/0/10 | 账目把不可达分支写成用户可见行为；删掉 `@PostConstruct` 注解无人变红 | **P2** | 加反射静态判点（注解必须存在 + 类含 `@Profile("real")`）；收口账 §2 F-07 那格改口径 | 「删注解是否真全绿」是从 grep 推的，未实跑（纪律禁改盘） |
| F-A4 | 限流判点 4b 又把实现字面串 `#pii.ref(` 钉进断言，与本批自己立的规矩同形 | 读 `PublicAuthWriteRateLimitTest` 判点 4b；判点 1/2/3 与 `RateLimitKeyAuditTest:295,364` 均为行为级 + 自带阳性对照；运行日志键形态 `:b35ff8b3…`、`grep -c key=.*1380000000[12]` = 0 | 等价但改名的 PII 包装器会假红；行为级判点 3 仍在兜底 | **P4** | 4b 改成「解析后的桶键必须是定长摘要（`^[0-9a-f]{32}$`）」而不是找包装器名字 | 无 |
| F-A5 | `PhoneBindingController#bindPhone` 造出第 4 种行形状（密文 phone + 微信 openid + 零查重），绕过 F-09 的双找口径 | 源码 `:113-116`（只 `setPhone(cipher)`，无 `setOpenid`、无查重）；实盘 census：密文∧非派生 openid 当前 0 行、明文行 129、派生+密文行 15、重复组 0 | 同号重复账号可静默产生且 `uk_users_phone` 挡不住（随机 IV 两次密文不同）；该本人手机号登录不回 | **P2** | `bindPhone` 对齐 `changePhone`（`:176-188`）：先派生+明文双查排除自己，再同时写 `setOpenid("phone:"+sha)`；补一条静态门枚举全部 `users.setPhone(` 写点 | 生产库是否已有该形状（需解密 15 条密文才能交叉比对） |
| F-A6 | 收口账 §5.1 把「76 条语句可执行性」整格记成本机判不出，实则零写入路线本机就能证（我另加了一维：CHECK 约束） | jshell 导出 76 条 → `mysql --force` 逐条 `PREPARE`：stderr 0 行；阳性对照 ERROR 1054 / 1146；`analyze.js` 对 `information_schema`：SET 目标 21/21 存在、NOT NULL∧SET NULL=0、列宽违例=0、ENUM 维 0 适用对象（实盘无 ENUM 列）、13 条 CHECK 约束里唯一命中 SET 的 `posts.status='deleted'` 在域内、FK RESTRICT 指向 DELETE 目标=0、CASCADE=2（随行删） | 账目过保：把已可闭合的一格继续挂着会让它进第 7 轮 | **P4** | §5.1 拆成「可执行性/约束（含 CHECK 域）＝已证」与「影响行数/真回滚＝待 DBA」两格；把载具落成常开门 `verify-erasure-statements-against-live-schema`，判据维要含「SET 目标命中 CHECK ⇒ 值必须在域内」——这是 PREPARE 与存在性门都抓不到的形状 | 真实影响行数、真回滚、有数据时 FK/CHECK 的实际拦截（本机相关表 0 行、`posts` 203 行） |
| F-A7 | 两条理由文字与盘不符（结论碰巧没错） | ① A1 §2 称「`circle_replies`/`campus_topic_replies` FK ON DELETE CASCADE 指向话题」，实盘：`circle_replies.topic_id→circle_topics` = **CASCADE**，`campus_topic_replies.topic_id→campus_topics` = **NO ACTION**；② 豁免理由写「全仓 grep『feedback_admin_reply』零命中」，实为迁移文件 + `tests/collation-uniform.spec.mjs` + 本门自己都在命中，准确说法是「`apps/**` 零命中」 | ①下轮若照这句把 campus_topics 改成 DELETE，会在有回复行时炸 1451；②读者按字面复核会以为门在撒谎 | **P4** | 两处文字按实盘改正；把「FK 规则」这类事实从散文升成门读的字段（与 F-A1 同一次改造） | 无 |
| F-A8 | `PhoneColumnCodec` 类注释仍声称「`AdminUserController` 的明文写入属管理端建号路径，本次不动」，与同一提交 `b8a60114` 的改动矛盾 | 文件现文（HEAD `74e681ca`）：合法取值三条里第 2 条自带这句；而 `AdminUserController:192` 已是 `PhoneColumnCodec.store(aesEncryptor, …)` | 这份类注释是「phone 列唯一口径」的权威说明，留着过期豁免会把人引回明文 | **P4** | 删掉那句、把合法取值改成为 4 条（含 F-A5 的形状）或明确写「第 4 种为待修缺陷，见 round-6 F-A5」 | 无 |

**证伪结果统计**：被审的 7 项声明里 **5 项成立**（节 1 三个计数、节 2 未被掏空、节 4 F-08 短路、
节 5a F-05 可红性、节 7 收口账三发读数）、**1 项成立但底下另有洞**（节 5b F-09：历史明文行确实还互找一致，
洞在 `bindPhone` 这条第 4 形状）、**1 项部分证伪**（节 3 F-07：503 分支在 real 档不可达，
且 fail-fast 没有装配级判点）。另有 4 条文字/账目层不实（F-A1 理由真值缺口、F-A6/F-A7/F-A8）。
最严重的是 **F-A5（P2）**——唯一性口径的合法形状枚举少了一条，同号重复账号可静默产生且唯一索引挡不住。

## 载具与环境事实（下一轮可直接复用）

- 全量 maven 读数：`cd apps/api && ./mvnw.cmd -o -B test` ⇒ `Tests run: 1797, Failures: 0, Errors: 0, Skipped: 10`，
  `Total time 03:52`（日志：`/d/6/tmp-r6a/mvn-full.log`）。
- 实盘可达：本机 MySQL **8.0.45**、`campus_love` 118 表 / 1124 列 / 64 外键，`users` 404 行；
  只读取法：`U=$(grep ^DB_USERNAME= .env | cut -d= -f2-)` + `MYSQL_PWD=…`（口令不进 argv）。
- 零写入语义验证载具（都在仓外 `/d/6/tmp-r6a/`）：`stmts2.jsh`（jshell 导出 76 条 SQL）、
  `gen_prepare.js`（`{uid}`→常量 + hex 承载 + 行号映射）、`prepare_all.sql`（逐条 PREPARE）、
  `analyze.js`（SET 目标 × 可空性/域/列宽 + FK 写序 + 表存在性）、`posctl.sql`（阳性对照）。
- Node 门用 `/d/codex-tools/node-v22.17.0-win-x64/node.exe`（PATH 上第一个 node 是微信自带 v16）。
- 未做任何 git 写操作、未改仓内任何既有文件（唯一新增：本报告）。

## 未展开（交主控）

1. **收口账 §1 余下 6 发未复**：`npm run test:contracts`、`test:admin`、`test:client`、两侧 `typecheck`、
   `test:gate-wiring`、`test:prove-gates-can-fail`。原因不是「不重要」而是纪律禁止：
   `test:client` 链内先跑 `generate:openapi`（会写 `apps/client/src/types/api-types.ts`），
   `prove-gates-can-fail` 会临时改坏盘上文件——两者都不是只读载具。账目 §1 只核了 3/9 发。
2. **76 条语句的真实影响行数与 `@Transactional` 整笔回滚**：仍要 DBA 凭据或可建影子库
   （`campus` 账号 `CREATE DATABASE` 报 1044，真栈会写 `campus_love`）。我这发只做到「PREPARE 可解析 + 约束不冲突」。
3. **F-05 的 Redis/AOF 侧**：`appendonly.aof`、RDB 备份里是否已落过裸手机号键（`appendonly.aof` 就在仓根，
   我没有去 grep 二进制——那属于运维清理判定，需要主控裁定是否要扫）。
4. **`media_asset` 是否覆盖 `posts.images`/`comments.images` 全部 URL**（对象存储物理删除）：未展开。
5. **15 条密文 phone 行解密后交叉比对**（能把 F-A5 的「生产是否已有同号重复」从「判不出」推进到实测）：
   载具可行（`APP_AES_SECRET` 在 `.env`，`AesEncryptor` 可反射注入，形状见 `PhoneColumnCodecTest:131`），
   本车道剩余轮次不足，未跑。
6. **outbox 无 `user_id` 列的定向清除**（收口账 §5.6 遗留）：本轮未复审，A2 的「短路后不再产生新行」判断我接受，
   但那是判断不是测量。
7. **F-10 的两条新判点**（`midSweepFailureStopsBeforeUsersTombstoneStatement`、
   `usersNativeWritesStayDisjointFromEntityMapping`）不在我这 7 项派单射程内，只随全量跑绿，未逐条反证。
8. **工作树里 `archive/` + `specs/` 的 167 条删除**：按纪律未碰，本报告不对其负责。
9. `admin-write-gate` 报「写 API 函数 96 / 已归档写函数 95」这 1 个差额为何被允许——我只读了打印行，未读判据全文。


