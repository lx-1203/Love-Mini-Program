# Round 5 · Fix Lane A1（隐私注销·清单穷尽性）交付报告

车道：A1（反证审查 §7 建议顺序中的 F-01/F-02/F-03/F-04/F-06/F-11）。
仓库：`D:\6\恋爱小程序`，分支 main，`apps/api`（Spring Boot 3.3.1 / Java 17）。
本机环境事实：无 Docker、无真库、Redis 握手不了（旧版 Windows 构建）。凡「语句在 MySQL 8 上真能执行」「`@Transactional` 真回滚」「对象存储物理删除」一律只到代码级，逐条列在 §9。
读写：只动 `apps/api` 内 A1 射程文件；`database/flyway/sql` 只读（未新增迁移）；未做任何 git 写操作；`apps/api/.../auth/SmsCodeController.java`、`RealAuthService.java`、`privacy/PhoneColumnCodec.java` 是别的车道（F-05/F-09）留下的未提交改动，未碰、未还原。

---

## 0. 改前 / 改后实测读数（原样，非推测）

改前基线（第五轮 A 报告 §0，jshell 枚举 + 运行时日志）：
- `PersonalDataTables.INVENTORY` = 69 项（62 项带语句 + 7 项 `RETAIN_STATUTORY`）
- `AccountErasureService` 运行时日志：`语句数=62`
- 全量 `./mvnw -o -B test`：`Tests run: 1778, Failures: 0, Errors: 0, Skipped: 10`
- 导出类别 27 类（`PersonalDataService.build` 产出，与冻结清单逐字一致）

改后实测（本报告，`javac -cp target/classes` 枚举 `INVENTORY` + 全量测试）：
- `PersonalDataTables.INVENTORY` = **83 项**（**76 项 actionable + 7 项 `RETAIN`**）
- `AccountErasureService` 运行时日志：`AccountErasureService -- 账号注销数据清除完成: userId=100, 语句数=76, 影响行数=76, 待删文件数=2`
- 导出类别 **28 类**（新增 `whispers`）
- A1 四套测试全绿：`AccountErasureServiceTest 15/15`、`ErasureSchemaAlignmentTest 5/5`、`PersonalDataServiceTest 12/12`、`PersonalDataErasureAlignmentTest 3/3`
- 全量 `./mvnw -o -B test`：**`Tests run: 1784, Failures: 1, Errors: 0, Skipped: 10`**，唯一 1 红是 `PublicAuthWriteRateLimitTest.smsCode_shouldRateLimitPerPhoneNotGlobalBucket`，属 **F-05 车道**遗留（`SmsCodeController` 已被改成 `#pii.ref(#payload.phone)`，其测试仍断言旧值 `#payload.phone`）——与 A1 无关，详见 §9。

关于「语句数=62」断言：`AccountErasureServiceTest` 从不硬编码 62——它用 `INVENTORY.stream().mapToInt(statements).sum()` 动态求和比对（`everyActionableEntryExecutesAtLeastOneStatement:78-80`），加条目后自动跟随，无需手改常数；日志里的 62→76 只是运行观测，无绑死读数的断言需要更新。唯一与条目数绑定的常量断言是 `ErasureSchemaAlignmentTest:94-99` 的防空转下限（≥25 项 / ≥100 列 / ≥20 句）与 `PersonalDataServiceTest` 的类别数（27→28，已改，见 §5）。

---

## 1. F-01 悄悄话 `whisper_message`

现象复述：清单覆盖私信却整张漏掉正在收费的悄悄话，注销后正文+收发关系留库。
DDL 核实（`database/flyway/sql/V2026.08.14.0002__create_whisper_message.sql:6-8`）：`sender_id` / `receiver_id` / `content VARCHAR(60) NOT NULL`。列名与报告一致。
实际改动（`apps/api/src/main/java/com/campuslove/api/privacy/PersonalDataTables.java`，第 4 节私信块后）：
- `whisper_outgoing`：`DELETE_ROWS`，`DELETE FROM whisper_message WHERE sender_id = {uid}`，`identifyingColumns=[content, sender_id]`，导出类别 `whispers`。
- `whisper_inbound`：`ANONYMISE_IN_PLACE`，`UPDATE whisper_message SET content = '<ErasedValues.TEXT_CONTENT>' WHERE receiver_id = {uid}`，`identifyingColumns=[content]`。
哨兵值走 `ErasedValues.TEXT_CONTENT`（含中文，Base64 字母表外，AES 安全，见 `AccountErasureServiceTest.erasedLiteralsAreNeverMistakenForAesCiphertext` 已把它喂进真实 `AesEncryptor`）。导出侧真产出 `whispers`（§5）。
如何能红：`PersonalDataServiceTest.whisperCategoryExportsOnlyOutgoingContent`（新用例）——把 `whisperCategory` 的 `findBySenderIdOrderByCreatedAtDesc(CALLER)` 改成别的取数、或删 content 列映射即红；另见 §6 变异4（摘掉清单一侧的 `whispers` 类别，同源自检 3 处炸红）。
本机判不出：该 DELETE/UPDATE 在 MySQL 8 上是否真执行成功、`receiver_id` 行是否真被就地匿名——无真库，代码级。

## 2. F-02 圈层/校区 UGC

现象复述：只匿名了 `posts`/`comments`，圈子话题/回复、校区话题/回复、圈公告的作者正文全漏。
DDL 逐表核实实际作者列与内容列（与报告 `author_id`+`content` 对照）：
- `circle_replies`（V2026.05.23.0005:41-45）：`author_id` + `content TEXT NOT NULL`。一致。
- `circle_topics`（同文件 :24-30）：`author_id` + `title VARCHAR(200) NOT NULL` + `content TEXT NOT NULL` + `images JSON`。报告只说 content，实表另有 title/images，一并清。
- `campus_topic_replies`（V2026.05.28.0004:20-24）：`author_id` + `content TEXT NOT NULL`。一致。
- `campus_topics`（同文件 :1-8）：`author_id` + `title VARCHAR(200) NOT NULL` + `content TEXT`（可空）+ `images JSON`。
- `circle_announcements`（V2026.10.28.0009:3-10）：`author_id`（可空）+ `title VARCHAR(80)`（可空）+ `content VARCHAR(1000) NOT NULL`。差异已写进条目注释：author_id 存发布人=管理员/圈主用户 ID、可空，回填旧公告为 NULL。
实际改动（同文件，第 6 节 comments 后）：5 个 `ANONYMISE_IN_PLACE` 项，就地匿名作者写的 title/content/images，行保留（`circle_replies`/`campus_topic_replies` FK ON DELETE CASCADE 指向话题，删行会销毁他人回复）。导出类别留空（与 posts/comments 同域，不新造类别，避免导出侧重复）。
如何能红：`ErasureSchemaAlignmentTest` A/B/C——若某一列名写错（如把 `content` 写成 `body`），B/C 立即红（该用例本身有 `detectorBitesOnSyntheticTypo` 反证夹具证明能咬）；`AccountErasureServiceTest.everyColumnDeclaredInInventoryIsActuallyWiped` 要求每个声明列都出现在该表 DELETE 或某条 SET 里。
本机判不出：UPDATE 语句真库可执行性、CASCADE 方向不伤他人行的实际效果——代码级。

## 3. F-03 访客足迹 `visitors`

现象复述：清单清 `profile_visitors`，生产真正写的是 `visitors`（实体 `Visitor`），判点打在空表上。
核实：`entity/Visitor.java:21 @Table("visitors")`；生产写点 `match/MatchRecorder`（visitorRepository.save）；读侧 `RelationshipScoreService`/`RealPushSummaryService`。DDL `V2026.05.21.0002:2-4`：`visitor_id`/`visited_user_id`。与报告一致。
实际改动（第 7 节，紧接 `profile_visitors` 后）：新增 `visitors_outgoing`：`DELETE FROM visitors WHERE visitor_id = {uid}`。注释里写清两表职责差异（谁写谁读），**不合并表**（两套写读路径，合并是另一件事）。
如何能红：同 F-02（A/B/C + 逐列擦除断言）；且 F-11 门保证 `visitors` 若再被漏掉直接红（§6）。
本机判不出：真库删除效果。

## 4. F-04 其余主体表 + 死表分类

实际改动的 5 张（第 7 节）：
- `wallet_unlocks`：`DELETE_ROWS`（`user_id`）。资金额另在 `wallet_transaction_log` 财务留存。
- `video_call_records`：`DELETE_ROWS`（`caller_id` OR `receiver_id`，同 heart_signals 口径整行删）。
- `content_mentions`：`RETAIN_STATUTORY`（`mentioned_user_id`）。**纠正报告**：本表只有 target_type/target_id/mentioned_user_id 三根 ID，无我的自由文本，属「别人 @ 我的引用边」——与 `likes_inbound` 同口径保留，而非报告暗示的「抹掉引用」。区别写进 rationale：quote 存我的原文快照故抹，mention 只是指向我的边故留。
- 门新揭示、报告未点名的活跃表：`video_calls`（实时状态表，`caller_id`/`callee_id`，`DELETE` 双方轴）、`circle_topic_likes`、`circle_topic_like_notices`。

**报告 F-04 两张「主体表」前提不成立，已按盘上纠正（未进清单）**：
- `official_messages`：读 `V2026.08.07.0003:57-73` + 全部后续 ALTER（`V2026.08.15.0004:28` 只加 card_activity_id/recommend_reason，`V2026.10.31.0003` 只 CONVERT CHARSET）——**全链无任何用户归属列**，只有 `account_id`（FK→official_accounts，平台账号）。它是官方号对全员广播的公告，非按主体存的个人数据，「按 {uid} 删/匿名」在语义上无从写起。报告把它并列为「有构造点的主体表」是把它和「有 `content` 自由文本」混为一谈。故不进清单、F-11 门也不命中（无归属列，不在 T）。
- `error_reports`：读 `V2026.08.07.0027:16-26`——列为 message/stack/name/context/platform/created_at，**无用户归属列**，`context` 建表注释自证「客户端上报前已脱敏截断」。它不是「谁的」数据，只有 `ErrorReportRetentionService` 的按时间留存清理。同理不进清单、不在 T。

**报告 §2 F-04 列出的 5 张「找不到构造点/疑似死表」，按 F-11 门的分类逐张定性（不凭猜测）**（grep 证据在 §附录A）：
| 表 | 盘上事实 | 处置 | 理由 |
|---|---|---|---|
| `circle_topic_likes` | 有 CREATE + 实体，且 `RealCircleService:848 circleTopicLikeRepository.save(like)` 真写 | **进清单**（`DELETE_ROWS` by user_id） | 纠正报告：它不是死表，是活跃主体行为（我点赞过的话题） |
| `post_mentions` | 有 CREATE + 实体 PostMention，但全仓无 new/save/insert 写点；`content_mentions` 迁移注释自证「回填后不再写入」 | **进带理由豁免** | 死表且被 content_mentions 取代，数据由后者覆盖 |
| `temp_chat_media_holds` | 有 CREATE + 实体 + `MediaAssetService:275 save`，但 DDL 只有 `media_asset_id/session_uid/created_by`，**无任何用户归属列** | **不在 T，无需处理** | 举报保留审计（created_by=管理员），非主体归属行；其媒体本体走 media_asset 清单项 |
| `vip_red_packet_claims` | CREATE 于 V2026.07.25.0002，**DROP 于 V2026.08.09.0006__remove_red_packet.sql** | **不在 T（建后即删）** | 红包功能整体下线，表已从链上消失 |
| `user_feedback_ticket` | CREATE 于 V2026.05.18.1600，**DROP 于 V2026.07.26.0004:281** | **不在 T（建后即删）** | 表被删，反馈本体是 feedback_tickets |

门新揭示的两张 admin/运营侧表（报告未列，但归属列命中 T）：
- `sensitive_word_import_task`（`operator_id`）：**进带理由豁免**——有原生 INSERT，但 operator=管理员、message 是系统进度摘要，非 APP 主体个人数据。
- `feedback_admin_reply`（`replier_user_id`）：**进带理由豁免**——全仓 grep 零命中（无实体/无写点，死表），且 replier 语义是处置人（管理员）。
如何能红：见 §6 变异1（漏一张归属表即红）。
本机判不出：死表是否真 0 行需 `SELECT COUNT(*)`（本机无真库，判不出）；但门判的是「有没有生产写入口/在不在盘上」，此点由代码 grep 证据支撑，不依赖行数。

## 5. F-06 `reports` + 导出侧 `whispers`

F-06 改动（`PersonalDataTables.java`，第 10 节财务块尾）：`reports` 从 `RETAIN_STATUTORY`（0 语句）改为 `ANONYMISE_IN_PLACE`：`UPDATE reports SET description = '<TEXT_CONTENT>', reason = '<SHORT_TEXT>' WHERE reporter_id = {uid}`，`identifyingColumns=[description, reason]`；行与 status/handler_id/handle_remark/handled_at/target_type/target_id 保留。列名核实 `V2026.06.26.0001:28-33`：`reason VARCHAR(64) NOT NULL`、`description VARCHAR(500)`。rationale 点名它违反了 `ErasureAction.java:41-42`「有自由文本列即不得 RETAIN」。
- 改前：reports 在 `retainedRowsCarryNoDirectIdentifier`（只查声明的 identifyingColumns=`reporter_id`）下蒙混过关；改后 reports 不再是 RETAIN，该测试跳过它，而 `everyColumnDeclaredInInventoryIsActuallyWiped` 要求 description/reason 真被 SET。
- 注意：`identifyingColumns` 不含 `reporter_id`（它在 WHERE，被擦的是 description/reason），若误把 reporter_id 列进去，逐列擦除断言会红（无 DELETE 也无 SET 它）。

导出侧 `whispers`（`profile/PersonalDataService.java`）：
- 构造器加第 26 参 `WhisperMessageRepository`（+字段+赋值+import `WhisperMessage`/`WhisperMessageRepository`）。
- 新增 `whisperCategory(userId)`：`capped("whispers", ..., findBySenderIdOrderByCreatedAtDesc(userId))`，列 = id/receiver_id/content/status/price_cents/created_at/read_at/refunded_at，只导我发出的（发给我的属发送方，不导，与 whisper_inbound 边界一致）。build() 内在 privateMessageCategory 后插入。
- 三处测试构造调用同步补参：`PersonalDataErasureAlignmentTest`（@Mock + 传参）、`PersonalDataServiceTest`（@Mock + 传参 + 新用例 + 夹具 `whisper()`）。
- 类别数断言 27→28，DisplayName「27 个类别齐全」→「28 个」。
- `AccountErasureServiceTest.inventoryMatchesExportCategoriesExactly` 冻结类别列表加 `"whispers"`（现 28 项）。
如何能红：`inventoryMatchesExportCategoriesExactly` 已含「少一类/多一类各 assertThrows」的牙齿；变异4（§6）实测摘掉清单一侧 whispers → 3 处炸红。
本机判不出：whisperCategory 真库取数正确性。

## 6. F-11 穷尽性门（纯静态、CI 可跑、不需真库）+ 反向变异

载体：`apps/api/src/test/java/com/campuslove/api/privacy/ErasureSchemaAlignmentTest.java`（复用其迁移链解析器，未还原别批次把 `ADD_COLUMN_PROC` 改成按族匹配 `add(?:_[a-z0-9_]*?)?_column_if_missing(?:_v\d+)?` 的未提交改动，在其之上加）。

新增判点 `everyOwnerColumnTableIsNamedOrExempt`：
- `buildOwnerTables()`：按迁移版本序逐文件、文件内 **按文本位置序** 施加 CREATE/DROP 事件，从 CREATE TABLE 体里取「用户归属列」（`OWNER_COLUMNS` 精确名 + `_user_id`/`_author_id` 后缀），撤掉被后续 `DROP TABLE` 删的表 → 得 T（**75→78 张在场归属表**，随词汇含 user_a_id/user_b_id/host_id）。
- 断言 `T ⊆ 清单点名表 ∪ OWNER_TABLE_EXEMPTIONS`（点名表 = `INVENTORY` 各 `table()` 去重）。
- 豁免集 `OWNER_TABLE_EXEMPTIONS` 3 条，逐条带理由字符串（长度≥20 断言）。
- 反漂移（照 `tests/gate-wiring.spec.mjs:156-161` 与 `entity-ddl-drift.spec.mjs` `PHANTOM_DML_EXEMPTIONS` 同族纪律）：每条豁免必须当下仍在 T 里、且仍不在清单里，否则「必须划掉」→ 红。
- 防空转下限：归属表数 ≥60、归属列引用总数 ≥80、清单点名表数 ≥50。

新增自测 `exhaustivenessParserIsOrderAwareAndLoopProof`（第五轮 C「循环补列盲区」约束）：
- 建后即删 → 不在 T；同文件 drop→create → 在场且在 T；`CALL add_version_column_if_missing('looped')` / `add_created_at_column_if_missing_v6` 形态 → 归属检测只读 CREATE 体，`looped` 无归属列，不伪造进 T。

反向变异（每条：临时改坏→跑出红→原样还原→复绿；文件 `ErasureSchemaAlignmentTest.java` 基线哈希 `28b4b355eb43c58247b01e6cf7eab9b6b09784f4`，`PersonalDataTables.java` 基线哈希 `41f6e2281014853b27b15b113bd811ed08ba634b`）：

| 变异 | 改坏点 | 红点用例 | 报错原文（截） | 还原后哈希 |
|---|---|---|---|---|
| 变异1 漏表/缺豁免 | 删 `post_mentions` 豁免条目 | `everyOwnerColumnTableIsNamedOrExempt` | `注销清单不穷尽——… post_mentions（归属列 [mentioned_user_id]）既没进清单、也没写豁免理由 ==> expected: <true> but was: <false>` | `28b4b355…` |
| 变异2 反漂移 | 加幽灵豁免 `totally_ghost_table_mutation2` | `everyOwnerColumnTableIsNamedOrExempt` | `豁免表 totally_ghost_table_mutation2 现在已经不在 T 里（表被 DROP 了、或 CREATE 体里不再有归属列）：这条豁免必须从 OWNER_TABLE_EXEMPTIONS 划掉` | `28b4b355…` |
| 变异3 解析器序 | 注释掉 `events.sort(按 pos)` | `exhaustivenessParserIsOrderAwareAndLoopProof` | `已 DROP 的表仍被算作带归属列的在场表 ==> expected: <false> but was: <true>` | `28b4b355…` |
| 变异4 whispers 耦合 | 摘 `whisper_outgoing` 的 `"whispers"` 类别 | `AccountErasureServiceTest.inventoryMatchesExportCategoriesExactly` + `PersonalDataErasureAlignmentTest`（×2） | `个人信息清除清单与导出清单已分叉：导出有但未登记=[whispers]，已登记但导出不产出=[]` | `41f6e228…` |

四张文件还原后哈希均与基线逐字相等（已 `sha1sum` 复核），复绿：`ErasureSchemaAlignmentTest 5/5`。
门揭示的实际漏表数（未改前）：F-01/F-02/F-03/F-04 的 13 张 + 门新挖的 `video_calls`/`circle_topic_likes`/`circle_topic_like_notices` 3 张 + `reports` 违规 1 处 = 装上后本车道补齐 17 项；剩余 3 张归入带理由豁免。

## 7. 结构性说明：门为什么之前全绿、现在不绿

`assertMatchesExportCategories`（清单一侧 ↔ 导出）与 A/B/C（清单 → 迁移链列名）都是「自洽」判点：清单漏表时两侧同时缺，不矛盾，故不红。F-11 把方向反过来（迁移链 → 清单），强制每张归属表要么被点名、要么带理由豁免，才补上「穷尽」这一维。JOIN 形态语句仍不受 C 覆盖（既有取舍，`ErasureSchemaAlignmentTest:203-205`），但归属表点名不依赖语句形状，新门不受此洞影响。

## 8. 接线三件套（供主控串行落，本车道未动共享载体）

1. 无需新增根脚本：F-11 判点是 `ErasureSchemaAlignmentTest` 里的 `@Test`，已随现有 `./mvnw -o -B test`（CI `test:java` / api 全量）自动跑，属既有 JUnit 阶段，**不必**在 `package.json`/`ci.yml`/`gate-wiring.spec.mjs` 登记。
2. 若主控维护「判点清单/覆盖率台账」（如 `reports/audit` 的门登记表或某 `.json`），请登记：门名 `F-11 清单穷尽性对账`、载体 `apps/api/src/test/java/com/campuslove/api/privacy/ErasureSchemaAlignmentTest.java#everyOwnerColumnTableIsNamedOrExempt`、命令原文 `cd apps/api && ./mvnw -o -B test -Dtest=ErasureSchemaAlignmentTest`。
3. 台账如记导出类别数，请把 `PersonalDataService` 类别基线 27→28（新增 `whispers`）同步。
（本车道未改：根 `package.json`、`.github/workflows/ci.yml`、`tests/gate-wiring.spec.mjs`、`README.md`、`.gitignore`。）

## 9. 本机判不出 / 遗留债

本机判不出（代码级为止，须真库/真 Redis/真桶）：
1. 76 条语句在 MySQL 8 上的真实可执行性与影响行数（含 `DELETE FROM video_calls WHERE caller_id={uid} OR callee_id={uid}` 这类双轴删、UPDATE 就地匿名的 NOT NULL 落值）。
2. `@Transactional` 真回滚（「第 N 条炸 ⇒ 前 N-1 条不生效」）无真库无替身用例。
3. 对象存储物理删除、`media_asset` 是否覆盖 `photo_gallery` 全部 URL。
4. 死表（post_mentions/feedback_admin_reply）真 0 行需 `SELECT COUNT(*)`（本机无真库）。
5. F-11 门的豁免「只减不增」在 CI 里能红（已代码级证明），但「某豁免表将来被重新建出带归属列又漏进清单」的漂移需真实迁移才能触发，属门的设计射程内、非本机演示。

全量遗留 1 红（非本车道）：`PublicAuthWriteRateLimitTest.smsCode_shouldRateLimitPerPhoneNotGlobalBucket` 期望 `#payload.phone`、实得 `#pii.ref(#payload.phone)`——F-05 车道改了 `SmsCodeController` 未同步其测试。属 A1 射程外（auth 包），**未改、未还原**。

本车道遗留债（如实记录，未 gold-plate）：
1. `whispers` 只做了「我发出的」导出与清除；「别人发给我的」正文按 `whisper_inbound` 就地匿名，未反向加入接收方可读的导出（与私信对称设计，非缺陷）。
2. `visitors` 与 `profile_visitors` 双表并存、两套写读路径的**合并**未做（本车道只补齐注销点名 + 注释厘清职责，合并属另一工程项）。
3. `circle_topic_likes.like_count` / `posts.likes_count` 等计数列在删除点赞/话题后不回填修正（清单既有「已知代价」口径，沿用）。
4. `content_mentions`/`video_calls` 由门揭示、按最贴近的既有口径（likes_inbound / heart_signals）处置；若产品后续对「被 @ 保留 vs 抹除」另有裁定，改这两条 rationale 即可，门不受影响。
