# Round 5 · Lane A（后端）反证审查

审查对象：`apps/api`（Spring Boot 3.3.1 / Java 17）@ main = 5d7983ce。
立场：证伪 round-4 修复批次（0edc9a4a / 0001e499 / 5d7983ce）的五条声明，不复述其自评。
读写：全程只读；未执行任何写库命令；`.env` 未读取、未打印。

## 0. 我实际跑过的东西（证据基线）

| 命令 / 手段 | 观察到的结果 |
|---|---|
| `cd apps/api && ./mvnw -o -B -q test-compile` | 静默通过（主/测试源码都能编译） |
| `./mvnw -o -B test -Dtest=ErasureSchemaAlignmentTest,AccountErasureServiceTest,RealAccountSecurityServiceTest` | `Tests run: 29, Failures: 0, Errors: 0, Skipped: 0`；日志含 `AccountErasureService -- 账号注销数据清除完成: userId=100, 语句数=62, 影响行数=62, 待删文件数=2` |
| `./mvnw -o -B test -Dtest=RateLimitKeyAuditTest,RateLimitIntegrationTest` | `Tests run: 12, Failures: 0, Skipped: 0`（audit 4 + integration 8） |
| `./mvnw -o -B test`（全量） | `Tests run: 1778, Failures: 0, Errors: 0, Skipped: 10`、`BUILD SUCCESS`；10 个 skip 全部来自两个「需显式系统属性才跑」的类：`RealProfileAuthChainIntegrationTest`（`-Dreal.it.test=true`）、`FlywayMigrationRepeatableTest`（`-Dflyway.repeatable.test=true`） |
| `jshell --class-path target/classes` 枚举 `PersonalDataTables.INVENTORY` | 69 项（62 项带语句 + 7 项 `RETAIN_STATUTORY`），与运行时「语句数=62」一致 |
| Python 解析 `database/flyway/sql/*.sql` 全部 123 张 CREATE TABLE，与 jshell 得到的清单表名做差集 | 25 张「有用户归属列或自由文本列、但不在清除清单里」的表（见 F-01…F-04） |
| `grep` 逐条核对 Redisson / RedisTemplate / `@Cacheable` 键构造 | 见 F-05 与 §2 |

方法说明：标识符级别的结论一律用 `grep -n`（精确文本）+ 编译产物（jshell）+ 真实运行核对，不依赖单次文件渲染；文件渲染曾出现标识符变形，若只读代码就下结论会误判。
环境事实（不是产品缺陷）：本机 Redis 为旧版 Windows 构建、Redisson 无法握手，且无 Docker ⇒ 任何连真库/连真 Redis 的判断在本轮**只能到「代码级」**，逐条列在 §5。

## 1. 判定表

| # | 声明 | 判定 | 证据指针 |
|---|---|---|---|
| a-1 | 清单里每张表都真的有语句被执行 | 已证实 | `privacy/AccountErasureService.java:111-121` 循环；`privacy/PersonalDataTables.java:56-85` 类加载期禁止「无语句项」；`test/.../AccountErasureServiceTest.java:76-94`；运行时日志「语句数=62」= 62 个非保留项之和 |
| a-2 | phone 列真被消灭（不是 userId 派生值） | 已证实（users）/ 判红（管理端建号路径仍在写入明文，见 F-09） | `privacy/PhoneColumnCodec.java:43` `ERASED_VALUE = null`；`AccountErasureService.java:149`；`admin/AdminUserController.java:172-173,287-288` |
| a-3 | 失败不会留下半注销态 | 部分证实：注解在、但没有任何判点能让它变红 | `AccountErasureService.java:103`（`@Transactional`）+ `auth/RealAccountSecurityService.java:185`；文件删除确实推到 `afterCommit`（`AccountErasureService.java:192-213`）；`AccountErasureServiceTest` 15 个用例里没有「第 N 条炸 ⇒ 前 N-1 条不生效」 |
| a-4 | 清除服务 bean 缺席时的兜底足够 / 不静默 | 判红 | `auth/RealAccountSecurityService.java:63-64`（`required=false`）、`:209-215`（只 `log.error`）、`:218-221`（仍走成功）、`:232-256`（手搓墓碑）；`test/.../RealAccountSecurityServiceTest.java:224-234,237-249` 正是在 bean 缺席下跑通并断言成功 |
| a-5 | 后台任务不会在注销后重建行 | 判红 | `mq/NotificationConsumer.java:267-288`、`mq/MatchEventConsumer.java:326`、`mq/CheckInEventConsumer.java:249`（均不校验主体状态）；`AccountErasureService.java:57-62` 自认未修；`vip/AutoRenewService.java:536` 分支仍写 `vip_billing_log` 流水 |
| a-6 | 新对账门在正常构建里跑、且能变红 | 已证实 | `test/.../ErasureSchemaAlignmentTest.java:85-104`（含 ≥25 项 / ≥100 列 / ≥20 句的防空转下限）、`:108-151`（4 个错列/错表反证夹具）、`:155-167`（解析器自证）；本轮 3/3 绿、非 skip。它现在能红这一点是**被反推证明的**：清单 `users` 项声明 `circle_path`、`posts/comments` 项声明 `owner_circle_path`，只有 V2026.10.13.0002 的字符串内 `ALTER TABLE ... ADD COLUMN` 被解析到，A/B 判据才不会炸 |
| b | PII 不再出现在 Redis 键名里 | 判红（一条路径仍在写裸手机号键名） | `auth/SmsCodeController.java:101` `key = "#payload.phone"` → `ratelimit/RateLimitAspect.java:240` → `ratelimit/RateLimitBucketRegistry.java:189-214`（real 下优先分布式）→ `:299-301` 键名拼接；`docker-compose.yml:176 --appendonly yes` |
| b' | 其余 Redis/Redisson 键名干净 | 已证实 | `auth/PiiKeyReference.java:66-79`（HMAC-SHA256+purpose 域分隔）、`auth/SmsCodeService.java:373-375`、`auth/LoginAttemptService.java:157-159`、`vip/AutoRenewService.java:483`、`tasks/RealTaskService.java:290`、`chat/TempChatCleanupService.java:131,211`、`auth/OnlineUserService.java:248`（值=jti|方法|时间戳，见 `:291-296`）、`growth/RecommendQuotaService.java:135`、`ai/AiVideoController.java:139`、`common/IdempotentInterceptor.java:277`、`mq/ConsumerIdempotencyStore.java:111`、`@Cacheable` 键（`discover/RecommendationCacheManager.java:98` 等）全部按 userId/固定串 |
| c | 限流键不再退化成共享桶 + 新增审计门 | 已证实 | `ratelimit/RateLimitAspect.java:205-250`（失败/为 null 都按 clientIp 分桶，不产出跨用户桶）；`test/.../RateLimitKeyAuditTest.java` 4 个用例本轮全绿，其中 `:293-322 detectorActuallyBites` 用两个故意写坏的合成注解证明判点能红，并断言合法键 `endsWith("203.0.113.7:probe-value")`（证明 IP 真的进了键名，不是常量）；main 源码 49 处 `@RateLimit` 全部按生产同一路径求值 |
| d | 用户可自删动态（DELETE 路由） | 已证实 | `village/VillageController.java:253-261`（`@DeleteMapping("/{id}")` + 按用户限流 + `@PreAuthorize`）；`village/VillagePostService.java:537-559`（作者校验 403、已墓碑幂等返回） |
| e | V2026.10.13.0002 补齐三条圈层轴列 | 已证实（且已被门钉住） | `database/flyway/sql/V2026.10.13.0002__add_circle_axis_columns_to_users_posts_comments.sql:38-90`（三段 `SET @has_col` + `PREPARE` 幂等，只补列不补索引，理由写在 `:22-25`）；编号早于引用方 `V2026.10.14.0005`；`ErasureSchemaAlignmentTest` 绿 = 这三列已从迁移链被解析出来 |
| f | 「注销 = 单一清单驱动的真删除」整体是否成立 | 判红 | 清单本身漏掉了 7 张有生产写入口的主体数据表（F-01…F-04），其中含悄悄话正文与访客足迹 |

## 2. 编号发现

### F-01 悄悄话（whisper_message）根本不在清除清单里 —— 注销后正文照旧留库

- 现象：注销清单覆盖了 `private_messages`（私信）两条目，却完全没有覆盖 `whisper_message`。悄悄话是本仓正在收费的功能（round-4 批次自己就在修 `悄悄话把分当元印、双击双扣`）。
- 证据：
  - `jshell` 枚举 `PersonalDataTables.INVENTORY` 得 69 项，其中无 `whisper_message`；`privacy/PersonalDataTables.java:256-283` 只处理 `private_messages*` / `private_conversations`。
  - 表结构：`database/flyway/sql/V2026.08.14.0002__create_whisper_message.sql:5-17` — `sender_id`、`receiver_id`、`content VARCHAR(60) NOT NULL`、`price_cents`、`client_request_id`。
  - 生产写入口：`whisper/RealWhisperService.java:140`、`:254`（`new WhisperMessage()`）；管理端读侧 `admin/AdminWhisperController.java:58`。
  - 差集脚本输出：`whisper_message NOT-IN-REGISTRY cols=content,receiver_id,sender_id`。
- 影响：主体注销后，其亲手写的每条悄悄话正文 + 收发双方关系 + 扣费金额永久留在库里，且 `receiver_id`/`sender_id` 仍把它指向一个「已注销」墓碑 —— PIPL 第 47 条的删除权在最有价值的一类内容上没兑现；对外却已经宣称「单一清单驱动的真删除」。
- 建议修法：加两条清单项，口径与私信一致 —— `whisper_outgoing`（`DELETE FROM whisper_message WHERE sender_id = {uid}`）+ `whisper_inbound`（`ANONYMISE_IN_PLACE`，把 `receiver_id = {uid}` 的行 `content` 置 `ErasedValues.TEXT_CONTENT`，行保留以支撑退款/对账），并把它纳入 `assertMatchesExportCategories` 的新导出类别 `whispers`。
- 严重度：高（P0 同级，且是「清单被当成单一事实来源」这个论点本身的反例）。

### F-02 圈层/校区话题 UGC（作者写的正文）未被清除

- 现象：清单只匿名化了 `posts` 与 `comments` 两张 UGC 表；圈子话题、圈子回复、校区话题、校区话题回复、圈公告都各有 `author_id + content`，全部不在清单内。这与「圈层轴」刚上线（V2026.10.13.0001/0002、V2026.10.14.0005~0007 全在回填这些表）正好矛盾：新做的功能进了清单，新做的内容表没进。
- 证据：
  - 差集输出：`circle_replies cols=author_id,content`、`campus_topic_replies cols=author_id,content`、`circle_topics cols=author_id,content`、`campus_topics cols=author_id,content`、`circle_announcements cols=author_id,content`。
  - 生产写入口：`discover/RealCircleService.java`（`new CircleReply(`）、`campus/RealCampusService.java`（`new CampusTopicReply(`）、`admin/AdminCircleController.java`。
  - 清单里与之最接近的只有 `PersonalDataTables.java:324-346`（`posts`、`comments`）与 `:402-403`（`circle_memberships` 只删圈籍关系，不碰内容）。
- 影响：注销后主体的发言文本在圈子/话题域整段残留；`ErasureSchemaAlignmentTest` 与 `assertMatchesExportCategories` 都不会变红，因为它们的判点是「清单 ↔ 迁移链列名」和「清单 ↔ 导出类别」，而不是「清单 ↔ schema 全量用户表」——见 F-06 的结构性说明。
- 建议修法：为 `circle_replies`/`campus_topic_replies` 各加 `ANONYMISE_IN_PLACE`（清 `content`，线程结构保留，理由同 `comments`）；`circle_topics`/`campus_topics`/`circle_announcements` 若允许用户创建，同样清 `content` 并把 `author_id` 留在墓碑引用上；同时补 F-11 的门，否则下一次加内容表还会漏。
- 严重度：高。

### F-03 访客足迹：清单清的是 `profile_visitors`，生产真正在写的是 `visitors`

- 现象：清单有一条「我的访客足迹」按 `visitor_id` 删除 `profile_visitors`；但匹配/推荐链路写的是另一张同义表 `visitors`（`Visitor` 实体），注销后主体的浏览足迹原封不动。
- 证据：
  - `privacy/PersonalDataTables.java:362-363`（`deleteRows("profile_visitors", …, "visitor_id", …)`）。
  - `entity/ProfileVisitor.java:31` `@Table(name = "profile_visitors")`；`entity/Visitor.java:21` `@Table(name = "visitors")` —— 两张表同时存在、语义重叠。
  - `visitors` 的生产写入口：`match/MatchRecorder.java:269`、`:289`（`visitorRepository.save(visitor)`），另有 `chat/RelationshipScoreService.java`、`growth/RealPushSummaryService.java` 读用。
  - DDL：`database/flyway/sql/V2026.05.21.0002__create_visitors_table.sql:1-8`（`visitor_id`、`visited_user_id`、按天唯一）。
- 影响：「谁看过谁」这类可推断社交意图的行踪数据在注销后保留；而且这条最容易解释成「我们清过访客了」，因为清单里确实有一条访客项 —— 判点存在但打在了空表上。
- 建议修法：再加一项 `visitors_outgoing`（`DELETE FROM visitors WHERE visitor_id = {uid}`），并顺手决定 `visitors` 与 `profile_visitors` 是否该合并（两个写入方、两套读路径早晚漂移）；至少加一条注释把两表职责写清。
- 严重度：中-高。

### F-04 其余被漏掉的主体表（按证据列出，均无清单条目）

- 现象/证据（差集脚本 + 「是否有生产构造点」双重核对）：
  - `wallet_unlocks`（`user_id`）—— `wallet/RealWalletUnlockService.java` 有 `new WalletUnlock(`，解锁记录（花了什么、解锁了谁）保留。
  - `video_call_records`（`receiver_id`）—— `chat/VideoCallService.java` 有 `new VideoCallRecord(`，通话参与关系保留。
  - `content_mentions`（`mentioned_user_id`）—— `content/ContentMentionService.java` 有 `new ContentMention(`；他人内容里 @ 我的引用行保留，且与清单已有的 `private_messages_inbound_quote`（`:264-273`）理念相反（那里选择抹掉引用，这里什么都没做）。
  - `official_messages`（`content`）—— `admin/AdminOfficialAccountController.java`、`official/RealOfficialAccountService.java` 有构造点；清单只覆盖了 `official_chat_messages`（`:409-410`）。
  - `error_reports`（`message`）—— `report/ErrorReportController.java` 有 `new ErrorReport(`，客户端上报常带用户上下文；清单完全没提（`ErrorReportRetentionService.java:104` 只做留存期清理）。
  - 判不出/低价值：`circle_topic_likes`、`post_mentions`、`temp_chat_media_holds`、`vip_red_packet_claims`、`user_feedback_ticket`、`visitors` 之外未发现生产构造点（`grep "new X("` 计数为 0，或 Java 侧无引用），可能只由 DDL/历史转储存在 —— 这几张要在有真库时按 `SELECT COUNT(*)` 定生死，我不在此断言。
- 影响：与 F-01…F-03 同类：「单一清单」被当成完整答案，而它的来源是人工维护的导出类别枚举（`profile/PersonalDataCategory.java` 只是载荷记录，类别名在 `profile/PersonalDataService` 里手写），两边都没跟 schema 对账。
- 建议修法：见 F-11 的门（按 schema 派生「必须被清单点名或被显式豁免」的表集合）。
- 严重度：中。

### F-05 Redis 键名里仍有裸手机号（real profile 下必现），且同时进日志

- 现象：`auth/SmsCodeController.java:101` 的限流键直接用 `#payload.phone`。切面把它拼成桶键（`ratelimit/RateLimitAspect.java:240` `return methodQualifier + ":" + value`），注册表在 `redissonClient != null` 时**优先**走分布式桶（`ratelimit/RateLimitBucketRegistry.java:189-214`），Redis 键名由 `:299-301` 生成：
  `ratelimit:SmsCodeController#sendCode:13800001111#v1-60s`。
  本仓 Redis 开了 AOF（`docker-compose.yml:176 --appendonly yes`），键名即成磁盘证据，且 `ratelimit:*` 键的回收依赖闲置清理（`:321-328`），AOF 历史里删不掉。
- 同一键名还被写进日志：`RateLimitAspect.java:174-175`（`key={}`）、`RateLimitBucketRegistry.java:232`、`:283-284`（`key=` 与 `redisKey=` 同时打印）；`logs/` 与告警链路（`docker-compose.alerting.yml`）会把手机号带出进程。
- 为什么这道门没抓到：round-4 的 PII 键名整改只覆盖了它已知的两处 —— `auth/SmsCodeService.java:373-375` 与 `auth/LoginAttemptService.java:157-159`（都改成 `PiiKeyReference`，`auth/PiiKeyReference.java:66-79`，做法本身是对的），对应判点 `test/auth/PiiKeyRedisReferenceTest.java` 的断言对象只有 `sms:code:` / `sms:fail:` / `login:` 前缀；限流桶键这条**新增的、由注解自由文本决定的**键名来源没有任何判点。`RateLimitKeyAuditTest` 只判「表达式能否解析、是否落降级桶」，不判「解析值是否是 PII」——于是门绿、缺陷活着。
- 影响：直接推翻本轮声明 (b)；同时 (c) 的限流按手机号分桶这件事本身是对的（防号码探测），不该被牺牲。
- 建议修法：把限流键的取值也过 `PiiKeyReference.of(piiKeySecret, "rate-limit-send-code", phone)`（同一密钥、不同 purpose 域分隔，键名仍稳定可分桶）；再在 `RateLimitAspect` 的日志里只打「桶键摘要」而非原值；最后补一条门：扫描所有 `@RateLimit(key=…)`，凡表达式命中 `phone|openid|idCard|account|email` 标识符即红，白名单必须写理由。
- 严重度：高。

### F-06 `reports` 被标成「法定保留」，却留着主体手写的自由文本 —— 违反清单自己的规则

- 现象：`privacy/PersonalDataTables.java:544-549` 把 `reports` 定为 `RETAIN_STATUTORY`、零语句，理由写「被举报内容与主体身份无关」。但举报行里 `description` 是**举报人（=主体本人）写的自由文本**。
- 证据：`database/flyway/sql/V2026.06.26.0001__create_reports.sql:23-33`，其中 `:29 description VARCHAR(500)`（举报人填写）、`:28 reason`、`:32 handle_remark`（处理人写，属平台）。
  而本清单自己定的规则在 `privacy/ErasureAction.java:37-44`：「若表里存在自由文本/网络标识符列（remark、raw_body、openid 快照、ip），那就不是本取值，而是 `ANONYMISE_IN_PLACE`」——同批清单项对 `vip_bills.remark`（`:504-511`）、`wallet_transaction_log.remark`（`:512-518`）、`feedback_tickets.content`（`:426-437`）都严格照此办理，唯独 `reports` 没有。
- 为什么门没红：`AccountErasureServiceTest.java:239 retainedRowsCarryNoDirectIdentifier` 只能检查 RETAIN 项**声明的** `identifyingColumns`，而 `reports` 只声明了 `reporter_id`；判据把「声明什么」交给写清单的人，声明漏了就无从发现（与 F-11 同一结构性问题）。
- 影响：注销后主体手写的举报正文（常含姓名、手机号、截图描述、被举报人关系）无限期保留，且对外口径是「身份文本列已全部销毁」。
- 建议修法：把 `reports` 改成 `ANONYMISE_IN_PLACE`：`UPDATE reports SET description = <TEXT_CONTENT>, reason = <SHORT_TEXT> WHERE reporter_id = {uid}`，行与 `status/handler_id/handle_remark` 保留（处置留痕不受损）。
- 严重度：中。

### F-07 清除服务缺席时「静默当成功」，且兜底路径正被当正常路径测试

- 现象：`RealAccountSecurityService.java:63-64` 用 `@Autowired(required=false)` 字段注入 `AccountErasureService`；为 null 时（`:209-215`）只打一条 `log.error`，随后仍走 `manualTombstone(user)`（`:232-256`）+ `save` + 返回成功；调用方（注销接口）拿到的是 200。
- 兜底本身是否足够：不够。`manualTombstone` 与 `tombstone` 列集一致（逐列比对 `:233-254` vs `AccountErasureService.java:141-166`，一致），但它**只写 users 一行** —— 实名/校园认证、聊天、行为轨迹、财务身份列全部不动，正是 round-4 被判 P0 的那个状态。
- 是否静默：日志层面不静默（ERROR 级、文案点名「实名/校园认证/聊天/行为数据未清除」），**但对调用方与构建都没有后果**：HTTP 仍成功、无指标、无门。
- 为什么现实里够不够：`AccountErasureService` 与 `RealAccountSecurityService` 同为 `@Profile("real")`（`AccountErasureService.java:67`、`RealAccountSecurityService.java:32`），生产同档装配 ⇒ 正常不会 null。但这条「靠两个注解碰巧同名」的不变量没有任何断言：能证明它的类是 `test/security/RealProfileAuthChainIntegrationTest.java`，而它被 `@EnabledIfSystemProperty(named="real.it.test")` 门控，本轮 5 个用例全部 skip（`grep` 确认 `:99`）。更糟的是 `RealAccountSecurityServiceTest.java:224-234`、`:237-249` 两个用例**就是**在 bean 缺席的状态下断言「注销成功、phone 为 NULL」——兜底路径被当作正常路径钉成了绿。
- 影响：任何一次 profile/装配漂移（例如把 real 拆成 `real,external`、或 `JdbcTemplate` 缺席导致 bean 创建失败被 `required=false` 吞掉）都会让「注销」退化成只写墓碑，而对外报告与用户反馈都是「已注销」。
- 建议修法：①`RealAccountSecurityService` 构造器注入 `ObjectProvider<AccountErasureService>`，在 `@Profile("real")` 下取不到就 fail-fast（启动失败比静默半注销好）；②把兜底做成显式失败：缺席时抛 503 让运营看得见，而不是写墓碑；③给上面两个用例改成注入替身清除服务（与 `:197-221` 一致），另加一条「缺席 ⇒ 必须抛」的用例；④把 `RealProfileAuthChainIntegrationTest` 的门禁条件（`-Dreal.it.test`）写进 CI 的真实栈流程，保证它至少有人跑。
- 严重度：中（发生概率低，但后果与 P0 同形，且现有测试会掩盖它）。

### F-08 注销后仍可被后台链路重建的行：通知（三类消费者）+ 续费失败流水

- 现象：`AccountErasureService.java:57-62` 自己写明「outbox 补偿 + NotificationConsumer 确实可能在注销之后再补出一条通知行」，应对是「可重跑」；但重跑没有触发者 —— 账号已 `deactivated`、token 已吊销，主体再也调不到任何接口，所以这条残留是永久性的。
- 证据：
  - `mq/NotificationConsumer.java:267-288`：`new Notification(); entity.setUserId(message.getUserId()); … save(entity)` —— 无主体存在性/状态校验。
  - 同形缺陷另两处：`mq/MatchEventConsumer.java:326`、`mq/CheckInEventConsumer.java:249`。
  - 触发窗口真实存在：`mq/MessageProducer.java:356-361` 每 30s 扫 outbox 补偿重投（`outbox_event` 无 user_id，清单也承认无法定向清除，`PersonalDataTables.java:58-62`）。
  - 财务侧残留写入：`vip/AutoRenewService.java:536` 一带，未开启续费分支仍 `writeBillingLog(userId, …, "FAILED")` ⇒ 给墓碑 user_id 新写一行 `vip_billing_log`（清单里它是 `RETAIN_STATUTORY`，`:519-525`）。
- 防复活里**成立**的那半：自动续费不会真扣钱 —— `renewVip` 在事务内按 id 重新加载并校验 `autoRenewEnabled`（`:536`），而 `tombstone` 已把它置 false（`AccountErasureService.java:161`，注释 `:53-56` 的推理与代码一致）。`TempChatCleanupService`（`:131`）与 `RealRealNameCertificationService`（`:229`）只做 UPDATE/DELETE，不会插回被删的行 —— 这两条我按代码确认，与文档一致。
- 影响：注销结果不是终态；「清单执行完 = 数据已消灭」在时间轴上不成立。金额为零的流水与通知行都不含身份文本，但行数上会持续给墓碑 user_id 追加引用。
- 建议修法：在三个消费者的落库段前加一次短路（`userRepository.findById(userId)` 判 `isUsable()`/`status=deactivated` 即丢弃并 ack，口径同 `User.java:435`）；续费侧「未开启/用户不可用」分支不再写流水；outbox 增加 `user_id` 列（或按 payload 的 userId 过滤）让注销可定向清除。
- 严重度：中。

### F-09 管理端建号仍在往 `users.phone` 与 `users.openid` 写**明文**手机号，并绕过本轮收敛的 codec

- 现象：round-4 把 `users.phone` 的三种语义收敛成 `PhoneColumnCodec` 一种口径，同时明写「`AdminUserController` 的明文写入属管理端建号路径，本次不动」（`PhoneColumnCodec.java:24`）。今天它仍在写，而且比「只写 phone」更糟。
- 证据：`admin/AdminUserController.java:172-173` 与 `:287-288`：`user.setOpenid("phone:" + req.phone()); user.setPhone(req.phone());` —— 两处都是明文，`openid` 列里留下 `phone:13800001111`。而应用注册链路是 `auth/RealAuthService.java:614`（`"phone:" + hashOpenid(phone)`，SHA-256）与 `PhoneColumnCodec.store(...)`（AES 密文）。唯一性预检 `AdminUserController.java:164` 用明文 `findByPhone(req.phone())`。
- 影响（两层，都不依赖注销）：
  1. 隐私：`users.openid`（有 `uk_users_openid`，会进备份/AOF 之外的全库导出）与 `users.phone` 双双存明文，且这类行是**唯一**一处「注销也擦不掉来源」的明文 PII —— 注销能覆盖它（`tombstone` 会重写 openid/phone），但账号活着的时候它就是明文；`phone:<11位号码>` 的可枚举性问题在清单里被列为必须消灭旧值的理由（`PersonalDataTables.java:590-594`），管理端却仍在生产这种值。
  2. 完整性：明文 vs 密文两套值 ⇒ `findByPhone(明文)` 判不出已注册的 App 用户（可重复建号），而登录按 `findByOpenid("phone:" + sha256)`（`RealAuthService.java:687`）也找不到管理端建的号 —— 「同手机号可被唯一识别」这条写在 `AdminUserController.java:170-171` 注释里的约定，实测与两套口径互斥。
- 建议修法：管理端建号改走 `PhoneColumnCodec.store(aesEncryptor, phone)` + `"phone:" + deriveSha256Hex(phone)`（与 `RealAuthService` 同口径），唯一性校验改成 `findByPhone(cipher).or(() -> findByOpenid("phone:"+hash))`；并把 `PhoneColumnCodec` 的门禁扩到「禁止任何非 codec 出口写 phone/openid」的静态扫描。
- 严重度：高（隐私 + 账号唯一性双重）。

### F-10 事务性/回滚这条声明只有注解，没有能变红的判点

- 现象：声明 (a) 的「任何一条失败整个事务回滚（不留半注销态）」在 `PersonalDataTables.java:30-31` 与 `AccountErasureService.java:38-41` 都有承诺，代码上 `erase` 有 `@Transactional`（`:103`）、外层 `deactivateAccount` 也有（`RealAccountSecurityService.java:185`），文件删除推到 `afterCommit`（`:192-213`）——方向正确。
- 但：`AccountErasureServiceTest` 的 15 个用例（`:74-335` 清单化列出）里没有一个「第 N 条语句抛异常 ⇒ 前 N-1 条不生效 / 不产生半墓碑」；它用的是记录型 `RecordingJdbcTemplate`，从不连库，所以**回滚这件事在 CI 里从未被执行过**。幂等/可重跑（`:279-297`）测的是「炸了之后再调一次能补齐」，这与「不会留下半注销态」是两个命题，被文档合并叙述了。
- 顺带一个真实顺序依赖没有判点：`users` 行同时被「原生 SQL（`interest_tags`）」与「Hibernate 整行回写（其余列）」写，清单靠「未映射列」这条脆弱事实成立（`PersonalDataTables.java:600-601`；`AccountErasureServiceTest.java:147-155` 只断言了 UPDATE 语句存在且不含 nickname）。若哪天有人给 `User` 加一个映射了 `interest_tags` 的字段，`tombstone` 的实体写会在提交时覆盖原生语句，而这不会让任何测试变红（`entity-ddl` 门管的是枚举/列宽，不是这个）。
- 建议修法：①加一条用 `JdbcTemplate` 替身「在第 k 条抛 `DataUpdateException`」的用例，断言 `@Transactional` 边界与「users 未被写墓碑」的因果（真回滚仍需 §5 的 DB 门）；②加一条静态门：`PersonalDataTables` 里 `viaUserEntity` 项声明的列，若被 `User` 实体映射则必须走实体写、未映射才允许原生 SQL，两侧不一致即红。
- 严重度：中（代码看起来对，但无人能证伪 —— 这正是本轮判定它「部分证实」的原因）。

### F-11 两条新门都只校「自洽」，不校「穷尽」—— 这是 F-01…F-04 的结构性根因

- 现象：`ErasureSchemaAlignmentTest` 判的是「清单里出现的表/列是否存在」（`A/B/C`，`:41-45`），`assertMatchesExportCategories`（`PersonalDataTables.java:109-120`）+ `PersonalDataErasureAlignmentTest.java:124-133` 判的是「导出类别与清单类别一一对应」。二者都**不检查 schema 里还有哪些带用户归属列的表没被清单点名**。清单与导出两侧都是人工维护（导出类别名写在 `profile/PersonalDataService` 里），所以「两边一起漏」恰恰是最可能的失效形态，而门在漏的时候全绿。
- 附带覆盖洞（同一测试）：`:203-205` 显式跳过所有含 `JOIN` 或涉及多表的语句（清单里正好是最复杂的 4 条：`temp_chat_message`、`temp_chat_session`、`private_messages_inbound_quote`、`payment_callback_log`，`PersonalDataTables.java:238-239,249-250,267-270,486-489`），它们的 SET/WHERE 列名只靠 `identifyingColumns` 间接覆盖；`tablesIn`（`:66-67`）也只认 `FROM|UPDATE|JOIN|INTO` 后的裸名。这是文档化取舍（「宁缺毋滥」，`:44-45`），但要在结论里说清，别让「有门」被读成「SQL 全都被校验过」。
- 建议修法：再加一条判点（纯静态，可在 CI 跑，不需要真库）：从迁移链解析出所有含 `user_id|author_id|sender_id|visitor_id|*_user_id` 列的表集合 `T`，断言 `T ⊆ 清单表集合 ∪ 显式豁免表清单`，豁免必须带理由字符串且计入「已豁免数」下限，防止有人靠加豁免把门掏空。这条门一旦装上，F-01/F-02/F-03/F-04 会在提交当场变红。
- 严重度：高（是缺陷的成因，而非又一条缺陷）。

## 3. 限流键抽检（5 条，跨 5 个 controller）

抽样方式：先 `grep -rn "@RateLimit(" src/main`（49 处，其中 46 处为 `#clientIp`），随机取 3 处 IP 维 + 全部 2 处非 IP 维（含历史上出过 P0 的钱路径），保证覆盖到「按参数名」「按静态调用取主体」「按 DTO 取自由文本」三种形状。

| # | 端点 | 注解位置 | key 表达式 | 实际桶键形状 | 判定 |
|---|---|---|---|---|---|
| 1 | `POST /register`（`AuthController#register`） | `auth/AuthController.java:119` | `#clientIp` | `AuthController#register:203.0.113.7` | 已证实 |
| 2 | `POST /phone-login`（`AuthController#phoneLogin`） | `auth/AuthController.java:138` | `#clientIp` | `AuthController#phoneLogin:<ip>` | 已证实 |
| 3 | `POST /sms/send-code`（`SmsCodeController#sendCode`） | `auth/SmsCodeController.java:101` | `#payload.phone` | `SmsCodeController#sendCode:<裸手机号>` | 能解析、但键名含 PII ⇒ F-05 判红 |
| 4 | `GET /personal-data`（`ProfileController#export`） | `profile/ProfileController.java:270-273` | `T(…SecurityUtils).getCurrentUserId()` | `ProfileController#exportPersonalData:1001` | 已证实 |
| 5 | `POST /vip/bills/purchase`（`BillingController#purchase`） | `vip/BillingController.java:246-250` | `T(…)getCurrentUserId() + ':' + #purchaseRequest.planId()` | `BillingController#purchase:1001:MONTH` | 已证实（老 P0 的 `#request.planId()` 已改名 `purchaseRequest`，参数名与切面注入变量不再撞名） |

怎么验的（不是「读了注解」）：
1. `./mvnw -o -B test -Dtest=RateLimitKeyAuditTest` → 4/4 绿。该类 `:78-116` 从**编译产物** `target/classes` 枚举所有 `@RateLimit` 方法，`:235` 调的就是生产同一个 `RateLimitAspect#resolveKey`，`:242-248` 断言每条都不落 `:spel-failure:` / `:null-value:` / 遗留 `:fallback`；`:223-225` 有「扫到 ≥40 条」的防空转下限（实测 49 条）。所以 #3 与 #5 这种「按 DTO 取属性（record 访问器）」的写法是被**真实求值**过、且拿到了非降级值的（`valueFor` 给 `SendCodeRequest` 造的替身返回 `probe-phone`，键里若解析不到就会带 marker）。
2. 能否变红：`RateLimitKeyAuditTest.detectorActuallyBites`（`:293-322`）用两个故意写坏的合成注解证明坏表达式一定落进 `:spel-failure:`、结果为 null 一定落进 `:null-value:`；同一条断言还检查降级桶里带着 `203.0.113.7`（`:304-305`），即「客户端 IP 确实进了键名」而不是常量 —— 这正是 #1/#2 分桶依据的运行时证据。另外 `parameterNamesAreAvailableToSpel`（`:325-336`）钉住 `-parameters`，关掉它 #3/#5 会集体变红。
3. 「不同调用者拿到不同桶」：`#clientIp` 侧由 `ratelimit/ClientIpResolver`（可信代理名单为空 ⇒ 忽略 XFF，见 `RateLimitAspect.java:104-108`）提供；主体侧两条由 `config/SecurityUtils.java:29-43` 从 `SecurityContext` 取 principal 转 Long，未认证直接抛 401（不静默降级）。`RateLimitIntegrationTest` 场景 3「不同 key 使用独立桶」+ 场景 6「100 并发只放 10 个」本轮一起绿（8/8）。
4. 我没做的事：没起 HTTP 服务、没发真实并发请求（本机不能起 real profile），所以「Redis 侧 `RRateLimiter` 键在多副本下阈值不放大」这一条只有代码与单测替身证据（`RateLimitBucketRegistry.java:253-287`），未端到端验证。

## 4. 前几轮报告口吻会让人以为已修、实际未修的清单

| 会被读成的结论 | 实际状态 | 指针 |
|---|---|---|
| 「注销已按单一清单真删」 | 清单漏 7 张有生产写入口的主体表（悄悄话正文、圈子/校区 UGC、`visitors` 足迹、`wallet_unlocks`、`video_call_records`、`content_mentions`、`official_messages`、`error_reports`） | F-01…F-04 |
| 「PII 不再进 Redis 键名」 | 限流分布式桶把裸手机号拼进 `ratelimit:*` 键名，real profile 必现，AOF 落盘 | F-05 |
| 「phone 列一列一种语义」 | 管理端建号仍写 phone 明文 **和** openid 明文 `phone:<号码>`，并绕过 codec；唯一性判据与登录判据互相找不到 | F-09 |
| 「高敏表的保留都按规则清了自由文本」 | `reports.description`（举报人手写）被留在 `RETAIN_STATUTORY` 里，违反清单自己在 `ErasureAction.java:37-44` 写的规则 | F-06 |
| 「注销是终态、不会被后台复活」 | 三个消费者可在注销后追加 `notifications`；续费扫描给墓碑写 FAILED 流水；清单文件自己承认且没修 | F-08 |
| 「新增了对账门，注销不会悄悄漏表」 | 门只校「清单↔迁移链」「清单↔导出」两处自洽，不校「schema↔清单」穷尽；JOIN 语句的列名还刻意不查 | F-11 |
| 「清除服务缺席会暴露出来」 | 只打一条 ERROR，HTTP 仍 200；两个单测恰在缺席状态下把兜底当正常路径钉绿；唯一能证明装配的 `RealProfileAuthChainIntegrationTest` 需 `-Dreal.it.test=true`，本轮 5 例全 skip | F-07 |

## 5. 本轮判不出（环境所限，不是产品缺陷）

1. **真删除语义**：62 条语句在 MySQL 8 上是否全部合法可执行（多表 `DELETE m FROM … JOIN`、`UPDATE … JOIN … SET`、`JSON_ARRAY()`、`SET x = NULL` 撞 NOT NULL 列、外键方向与 RESTRICT/CASCADE 是否如清单所述）——清单表名/列名存在性已被 `ErasureSchemaAlignmentTest` 静态证明，但「执行不报错」与「影响行数正确」只有真库能证。`FlywayMigrationRepeatableTest`（skip）也只覆盖迁移可重放，不覆盖注销。
2. **回滚真生效**：`@Transactional` 传播与「第 N 条炸 ⇒ 整笔回滚」在 CI 里没有替身用例，也无真库（F-10）。
3. **对象存储物理删除**：`purgeFilesAfterTransactionCommit`（`AccountErasureService.java:192-213`）只在替身上验证「收集 2 个 URL / 1 个失败只告警」；真实桶、`MediaStorageService.delete` 语义、以及 `posts.images`/`comments.images` 是否都能靠 `media_asset` 行覆盖（清单在 `PersonalDataTables.java:160-163` 自认「该假设未经实盘验证」；代码侧我看到 `media/MediaUploadController.java:132,173` 与 `profile/ProfileUpdateService.java:371,414` 确实逐次 `recordUpload`，方向支持该假设）⇒ 判不出。
4. **AOF 里是否真的留下过手机号键**：F-05 是从代码 + `docker-compose.yml:176` 推定的，我没有活的 Redis 可以 `KEYS ratelimit:*` 或翻 `appendonly.aof`。
5. **real profile 装配完整性**：`AccountErasureService`/`NotificationConsumer`/`RealWhisperService` 等是否真的都在生产档存在（需起 real 上下文）。
6. **多副本限流阈值不放大**：需要两个 JVM + 真 Redis。
7. `circle_topic_likes`、`post_mentions`、`temp_chat_media_holds`、`vip_red_packet_claims`、`user_feedback_ticket` 是否还有真实数据（Java 侧找不到构造点，可能是死表）⇒ 需要 `SELECT COUNT(*)`，我没跑。

## 6. 站得住的部分（同样给证据，避免只报坏消息）

- 清单的**结构自检**是真的有牙：`PersonalDataTables.sanityCheck`（`:56-85`）在类加载期禁止「key 重复 / 类别被两项重复声明 / 非保留项无语句 / 无必消列 / SET 右侧出现 `{uid}`」，第 5 条正是旧 `"1****"+userId` 哨兵被 P0 的原因，现已无法写回来。
- `users.phone` 的擦除口径（NULL 而非哨兵，`PhoneColumnCodec.java:24-43`）、墓碑 openid（`erased:<UUIDv4>`，`ErasedValues.java:58-60`，`:161-175` 断言长度/前缀/唯一性 5000 次不撞）都有实测试；`ErasedValues` 里所有占位值刻意含 Base64 字母表外字符以躲开 AES 解密分支（`AccountErasureServiceTest.java:199-220` 逐个喂进真实 `AesEncryptor` 验过）。
- 「防自动续费复活」这条是真做对了：`AccountErasureService.java:161` 置 false + `AutoRenewService.java:536` 事务内重校验。
- 声明 (d)（DELETE 路由）与 (e)（V2026.10.13.0002 三条圈层轴列）我**没能证伪**：路由带作者校验与幂等（`VillageController.java:253-261`、`VillagePostService.java:537-559`），迁移幂等、编号在引用方之前、且已被新门钉住（判定表 a-6 / e 里说明了为什么「门绿」等价于「这三列来自迁移链可解析」）。
- 全量 `mvn test` 1778 例 0 失败（10 例为显式系统属性门控的 skip），说明这一批改动没有把既有判点改哑。

## 7. 建议处理顺序（按「能被证伪的最短路径」排）

1. F-05（改一行 SpEL + 一条静态门）——它是「宣称已修而实际仍写 PII」里最容易在现网被抓到的。
2. F-01/F-02/F-03/F-06（往清单里加条目；每条加完 `ErasureSchemaAlignmentTest` 会自动接管列名正确性）。
3. F-11（穷尽性门：schema 派生的用户表集合 ⊆ 清单 ∪ 显式豁免）——装上之后 1、2 类漏表不可能再靠人工发现。
4. F-09（管理端建号走 codec；顺带修唯一性/登录互找）。
5. F-07/F-10（装配 fail-fast + 回滚替身用例 + 把 `real.it.test` 接进真实栈 CI）。
6. F-08（三个消费者按 `deactivated` 短路 + outbox 带 user_id）。

