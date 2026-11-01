# 第六轮 修复车道 W1c — 注销擦除清单数据层三条账

- 车道：W1c（数据层收账）
- 基线 HEAD：`8d5aecb0`
- 来源：第六轮 E2 车道（只读量测路线）实测结论
- 状态图例：`待做` / `进行中` / `已闭合` / `判不出`
- 落盘方式：本文件按条增量落盘，每闭合一条立刻追加

## 0. 前置复核（改之前先验 E2 的三条结论）

状态：已闭合（三条全部复现，其中事项一的一个前提被本车道修正）

载具：只读 `SELECT` / `information_schema`（`set -a && . ./.env` + `MYSQL_PWD`，口令不进 argv）；
迁移链静态解析用 Python 原型先验，再由 Java 判点复算（两边独立实现、结果必须一致）。
`campus_love` 无任何写入；本机无 Docker/Redis。

| # | E2 的结论 | 本车道复量 | 结论 |
|---|---|---|---|
| 1 | 清单 83 项 / 76 条语句 | 静态数 `list.add(...)`＝83 项；其中 7 项 `RETAIN_STATUTORY` 零语句 ⇒ 非保留 76 项，每项恰好 1 条语句 ⇒ 76 条 | 复现 |
| 2 | `post_tags` 实盘 163 行 | `SELECT COUNT(*) FROM post_tags` = 163（父表 `posts` = 203） | 复现 |
| 3 | `post_tags` 无用户归属列 | 列集 `id/post_id/tag_name/created_at/version`（V2026.05.28.0010 + 两个 `add_*_column_if_missing` 补列） | 复现 |
| 4 | `posts` 就地匿名不删行 ⇒ `ON DELETE CASCADE` 永不触发 | `posts` 项 action＝`ANONYMISE_IN_PLACE`；`post_tags.post_id→posts.id` 策略＝CASCADE（库上与迁移链一致） | 复现 |
| 5 | 「先删子后删父」与盘上顺序相反 | 复量父前子后 6 组：`posts→post_likes/post_favorites/post_shares/post_view_history`、`circle_topics→circle_topic_likes/circle_topic_like_notices`、`users→…`（`temp_chat_session→temp_chat_message` 是唯一一组已经是子前父后） | 复现 |
| 6 | 6 张父表里 5 张不删行 | 在场且被清单点名的父表＝`users`(viaUserEntity 匿名)/`posts`/`circle_topics`/`campus_topics`/`private_conversations` 五张全为 ANONYMISE，唯一 `DELETE_ROWS` 的父表＝`temp_chat_session` | 复现 |
| 7 | `users` 侧 8 条 RESTRICT + 7 条 NO ACTION | `information_schema.REFERENTIAL_CONSTRAINTS` 按 `REFERENCED_TABLE_NAME='users'` 数：RESTRICT 8（user_wallet/vip_order/vip_bills/wallet_transaction_log/promo_codes.created_by/promo_code_usages.user_id/video_calls.caller_id/video_calls.callee_id）、NO ACTION 7 | 复现 |
| 8 | 全库 FK 边 64 条 | `KEY_COLUMN_USAGE`+`REFERENTIAL_CONSTRAINTS`＝64 条、在场表 118 张 | 复现 |
| 9 | 32 条恒 0 行语句＝5 死表 + 27 有写点 | 全库 `COUNT(*)` 逐表实测（118 张，42 张 0 行）；清单里落 0 行的语句恰好 32 条，静态写点扫描（实体+Repository 注入+至少一处 save/delete，或原生写 SQL）判出「零写点」的恰好是 `user_match_ticket / chat_ai_session_context / chat_ai_suggestion_log / activity_proposal / user_sessions` 5 张 | 复现 |

### 0.1 复核中对 E2 口径的两处修正（都朝更严的方向）

1. **「只读迁移链 DDL 就能派生外键图」这个前提，按 E2 那种 CREATE 体内解析是不成立的**：
   静态原型第一版（只认 CREATE 体里的 `FOREIGN KEY`）只得 **47** 条边，比库上真值少 **17** 条，
   漏的全是 `CALL add_fk_if_missing(...)` 与 `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`（含把
   NO ACTION 重建成 CASCADE 的那 10 条）。也就是说：光按 CREATE 体派生的顺序判点，
   会把 `vip_order`/`user_wallet`/`video_calls`/`likes`/`notifications`/`reports`/`pass_records`
   这些真实父子关系当成不存在。判点必须认全 5 种形态——本车道实现的解析器认全后
   静态边集与 `information_schema` **逐条相等（64/64，策略也相等）**，并把这条对账本身装成了 DB-gated 判点。
2. **E2 报「27 条是写点在」里，`post_tags` 不属「死表」**（本车道补测）：
   `PostTagRepository.save`（VillagePostService）是活写点，163 行是 App 写的不是种子写的——
   所以事项三的第 2×2 归因轴里，`post_tags` 落「活表有数据」格，而不是「遗留行无写点」格。

### 0.2 复核新抓出的一条同类残留（不在 E2 的三条里，一并入账）

按「无归属列、但经 FK 挂在有归属列表上」这条形状全量捞（不是只捞 post_tags）：
**全库共 3 张**——`post_tags`（父 `posts`，不删行 ⇒ 级联永不触发，**真残留**）、
`temp_chat_contact_exchange`（父 `temp_chat_session`，删行 ⇒ 级联今天确实触发，**靠级联蒙对**）、
`temp_chat_message`（同上，已在清单里）。
另外按「传递闭包」再放宽一层只多捞 1 张：`promo_codes`（`created_by→users`）——逐张裁定见事项二。
还有一张逃在两条轴之外的（既无归属列也无 FK，但 `session_uid` 含 userId、`created_by` 是用户 ID、
`media_asset_id` 指向将被删的素材）：`temp_chat_media_holds`——它的形状不属于本轮任何一条轴，
本轮不擅自扩轴，交账见 §4.2。

## 1. 事项一 — 删除顺序做成判点，不留注释

状态：已闭合

### 1.1 复核
见 §0 表 #5/#6/#7/#8。补充一条 E2 没写、但决定判点形态的实测：
**光按 CREATE 体派生外键图是不够的**。静态原型第一版只认 {@code CREATE TABLE} 里的 `FOREIGN KEY`，
得 47 条边，比库上真值 64 少 17 条，漏的全在 `CALL add_fk_if_missing(...)`（5 参与 6 参两种形状）
与 `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`（V2026.07.25.0001 把 10 条边的策略从 NO ACTION 重写成 CASCADE）。
如果判点按 47 条边来钉顺序，`vip_order`/`user_wallet`/`video_calls`/`likes`/`notifications`/`reports`/`pass_records`
的父子关系在它眼里根本不存在——判点会一直绿，而真注销照样可能在 RESTRICT 上炸。

### 1.2 设计裁定
**选择「保持父前子后的书写顺序 + 把『不删行的父项永远不删行』钉成判点」**，理由：
把 76 条语句整体倒序（子表全提到父表之前）会同时破坏另外两条已被测试钉住的顺序——
`fileUrlSelects` 必须在其行的 DELETE 之前取回文件 URL（`AccountErasureServiceTest#fileUrlsAreCollectedBeforeDeletionAndPurged`），
以及 `users` 墓碑必须最后写（同类的 `midSweepFailureStopsBeforeUsersTombstoneStatement`）；
而父表不删行本来就不需要子表先删。所以真正的不变量不是「书写顺序」，是「**删行的父表只能是已登记的那张**」。
判点因此钉三条（全部纯静态，CI 无真库可跑）：

- 判点 A `deleteStatementsFollowChildBeforeParent`：从迁移链 DDL 派生外键图，
  断言任何一条删父表的语句，其**在清单里也被删除**的子表的删除语句必须全部排在它之前（按执行序号比较，序号与
  `AccountErasureService#erase` 的发出顺序同源）。
- 判点 B `deletingParentsAndUndeletedChildrenArePinned`：断言
  ①「被清单删行、且有外键子表」的父表集合 == `{temp_chat_session}`（`EXPECTED_DELETING_PARENTS`）；
  ②「删行的父表 → 清单没点名删除的子表」登记表 == 空（`PARENT_DELETE_CASCADE_JUSTIFICATIONS`）。
  这条就是任务书里的「断言这些父项永远是 ANONYMISE，改成 DELETE 即红」。
- 判点 C `migrationGraphParserHandlesAllFiveForeignKeyForms`：解析器自证（5 种声明形态、两种 CALL 参数形状、
  策略被后续 ALTER 覆盖、建后即删按文本位置、类型词不当列名）。
- 判点 D `orderingDetectorBitesOnParentDeletedBeforeChild`：阳性对照（夹具父前子后 ⇒ 红；子前父后 ⇒ 绿；
  父项改成匿名 ⇒ 不该报红）。
- 判点 E（DB-gated）`liveSchemaAgreesWithStaticDerivation` 第 1 段：静态外键边集与
  `information_schema` **逐条相等**（含 `ON DELETE` 策略）——把「解析器是否忠实」从我的口供变成读数。

### 1.3 实现
- 新增 `apps/api/src/test/java/com/campuslove/api/privacy/ErasureMigrationGraph.java`：迁移链静态图
  （在场表 / CREATE 体列集 / 归属列集 / 外键边含策略），文件按版本序、文件内按文本位置序施加。
- 新增 `apps/api/src/test/java/com/campuslove/api/privacy/ErasureSurfaceAndOrderingGateTest.java`（11 例）。
- 改 `PersonalDataTables` 类注释：把「按外键自下而上（先删/改引用行）」这句**假话**换成实测结论
  （父前子后 + 靠 5 张父表不删行才成立 + 现在由哪三条判点看着）。
- 顺带纠正一处同源口径：`temp_chat_session` 项的 rationale 原先只说「级联带走 temp_chat_message」，
  现已点名两张子表，且两张子表都排在它之前。

读数：静态外键边 64 条 = 库上 64 条（0 缺 0 多、策略 0 处不一致）；顺序判点在盘上清单上绿；
删行父表集合 = `{temp_chat_session}`；级联登记表 = 空。

### 1.4 反向变异
| # | 变异 | 结果 | 还原 |
|---|---|---|---|
| M1 | 把 `temp_chat_session` 的删除整块提到它的两张子表之前 | 红 1 例：`deleteStatementsFollowChildBeforeParent`，报出「第 9 条语句删父表，子表 temp_chat_message 排在第 10 条之后 / temp_chat_contact_exchange 排在第 11 条之后」 | sha `74382ba2…9c30` 与基线逐字对齐，复绿 |
| M2 | 把 `circle_topics` 项从 `UPDATE … ANONYMISE_IN_PLACE` 改成 `DELETE FROM circle_topics WHERE author_id = {uid}`（模拟「父项改成删行」） | 红 2 例：`deletingParentsAndUndeletedChildrenArePinned`（父表集合 `[temp_chat_session]` → `[temp_chat_session, circle_topics]`）＋ `deleteStatementsFollowChildBeforeParent`（子表 `circle_topic_likes` 第 44 条、`circle_topic_like_notices` 第 45 条都在父表第 25 条之后） | sha 同上对齐，复绿 |

## 2. 事项二 — post_tags 进清单 + F-11 穷尽门补「借 FK 归属」形状

状态：已闭合

### 2.1 复核
`post_tags` 163 行（父 `posts` 203 行）、列集 `id/post_id/tag_name/created_at/version` 无归属列、
`posts` 为 ANONYMISE 不删行 ⇒ `ON DELETE CASCADE` 永不触发——四条全部复现（§0 表 #2/#3/#4）。
补充实测（E2 未涉）：`post_tags` **不是死表**，`PostTagRepository.save`（VillagePostService、RealPostTagService）
是在用的写点，163 行是 App 写的而不是种子写的（V2026.08.07.0024 确实播过种，但那不是唯一来源）。

### 2.2 全库同类子表穷尽（把门装上后先跑一遍的结果）
轴定义为「归属闭包」：T₀ = CREATE 体里有用户归属列的在场表 ∪ `users`（主体表自身没有 `user_id` 列，
但它是所有归属的根），沿外键边 `child→parent` 取**传递闭包**（只看一层会漏孙表，孙表与 `post_tags` 同理由漏检）。
派生结果：**有归属列的表 78 张；闭包比它多出 4 张**，即全库「借父表归属」的子表共 **4 张**（不是 1 张）：

| 表 | 借谁的归属 | 父表删不删行 | 本轮裁定 |
|---|---|---|---|
| `post_tags` | `posts.author_id` | 否（ANONYMISE）| **进清单**（真残留，163 行）|
| `temp_chat_message` | `temp_chat_session.user_a_id/user_b_id` | 是（CASCADE 会触发）| 已在清单，位置已正确（子前父后）|
| `temp_chat_contact_exchange` | 同上 | 是 | **进清单**（今天靠级联蒙对，与 post_tags 押的是同一条注）|
| `promo_codes` | `users`（`created_by`，RESTRICT）| users 不删行 | **带理由豁免**（`created_by` 是发放优惠码的后台运营账号；code/discount/used_count 是平台营销资产；它是 users 的子表，主体行只墓碑化 ⇒ RESTRICT 永不触发）|

门装上后首跑的红就是 `post_tags` 与 `temp_chat_contact_exchange` 两张（逐张点名，没有只修第一张），
补齐后转绿；`promo_codes` 走豁免通道。另有一张逃在本轮两条轴之外的残留记在 §4.2（`temp_chat_media_holds`）。

### 2.3 实现
- 清单：新增 `post_tags` 项（`DELETE pt FROM post_tags pt JOIN posts p ON pt.post_id = p.id WHERE p.author_id = {uid}`，
  列名以 V2026.05.28.0010 的 DDL 为准）与 `temp_chat_contact_exchange` 项（JOIN `temp_chat_session` 按
  `user_a_id/user_b_id` 删，排在父表之前）；两项都写明「借归属」来历、导出缺口与写点证据。
- 穷尽门补形：`ErasureSchemaAlignmentTest#everyBorrowedOwnerTableIsNamedOrExempt`
  ＋豁免表 `BORROWED_OWNER_TABLE_EXEMPTIONS`（与既有 `OWNER_TABLE_EXEMPTIONS` 同族纪律：只减不增、
  理由 ≥20 字、该表当下仍必须在闭包内且未进清单，否则红）。
- 反漂移：新增断言——本类原有 `buildOwnerTables()` 与 `ErasureMigrationGraph.ownerTables()`
  两套解析器派生的归属表/列必须**逐表逐列相等**（同一件事不许有两个答案，而其中一个是绿的）。
- 解析器自证：`borrowedOwnerClosureIsTransitiveAndOrderAware`（一层与两层都认、无外键的孤儿表不牵连、
  已 DROP 的子表不留边）。

### 2.4 反向变异（W1c2 接力：前一手的「待跑」由本车道实跑并还原）
| # | 变异 | 结果 | 还原 |
|---|---|---|---|
| M3 | 从清单里删掉 `post_tags` 项（只删 `list.add` 块，`SURFACE_LEDGER` 里仍留 `post_tags` 键） | 红 2 例：① 穷尽门 `ErasureSchemaAlignmentTest#everyBorrowedOwnerTableIsNamedOrExempt`（354 行：`post_tags` 仍在借归属闭包却不在 `named` 集合 ⇒ 「既不点名也不豁免」非空）；② 归因覆盖门 `ErasureSurfaceAndOrderingGateTest#surfaceLedgerCoversExactlyTheStatementBearingEntries`（230 行：账里多 `post_tags` 键）——两条独立判点同时抓到「漏捞一张借归属子表」 | `PersonalDataTables.java` 还原后 sha `74382ba2…9c30`，与基线逐字相等（见 §5 sha 台账） |
| M4 | 把 `borrowedClosureOf` 的 `while(grew)` 传递闭包削成「只看一层」（一次 for 遍历外键边） | 红 1 例：`borrowedOwnerClosureIsTransitiveAndOrderAware`（387 行：孙表 `grandchild_no_owner` 没被认出——夹具把孙表建在子表<b>之前</b>，单趟扫描先看到 `grandchild→child` 时 child 还没进集合）。真实清单侧 `everyBorrowedOwner…` 不红，因为盘上 4 张借归属表全是一层——这条正是 §2.3 注释「一遍扫描恰好也能过 ⇒ 变异抓不到」所加固的那一发 | `ErasureSchemaAlignmentTest.java` 还原后 sha `0a0a4fb9…dd39e`，与基线逐字相等 |

## 3. 事项三 — 76 条语句作用面归因账（机器可读三分类）

状态：已闭合（W1c2 接力补：前一手的 §3.1/§3.2/§3.3/§3.4 全为「（待填）」，正文与变异台账由本车道按盘上真值补齐；未照抄任何自述）

### 3.1 复核（先验归因账是不是「机器可读的账」而不是注释）
盘上真值核对（不是复述前一手）：
- 归因账落在 `PersonalDataTables.SURFACE_LEDGER`（`buildSurfaceLedger()`，160-244 行），
  键＝清单项 key，值＝新增枚举 `ErasureStatementSurface`（`privacy/ErasureStatementSurface.java`，4 格 2×2）。
  「一条语句今天是不是空转」第一次是一个 `Map`，`surfaceOf(key)` 未登记即抛错（无默认值免检）。
- 穷尽性由判点钉，不靠人肉数：
  `surfaceLedgerCoversExactlyTheStatementBearingEntries` 断言
  ①键集合 `== `「带语句的清单项」集合、②每项恰好 1 条语句、③`statementCount() == 账条数`、④`statementCount() >= 76`。
  故「每条语句都有归因」＝判点绿时自动成立，不是我的口供。
- 三分类当前读数（盘上 `buildSurfaceLedger()` 逐行数得）：`LIVE_WRITTEN` 45 / `EMPTY_WRITTEN` 28 /
  `DEAD_TABLE` 5 ＝ **78** 项 = W1c 后的语句总数（事项二补进 `post_tags`→LIVE、`temp_chat_contact_exchange`→EMPTY 之前是 44/27/5=76）。
- 第 4 格 `LIVE_UNWRITTEN`（有行、代码无写点：种子/遗留）本轮实测 **0 项**，但仍是合法枚举值，
  判点 `surfaceLedgerHasEveryCategoryAboveFloor` 显式断言它＝0 并要求「一旦有项落进来先登记证据与下限」——
  2×2 缺角被钉成「不许当垃圾桶」。
- 两个正交轴各有载体：**写点轴**（代码有没有人写这张表）纯静态，`surfaceWriterAxisAgreesWithDerivedWritePoints`
  拿 `deriveWritePoints(src/main)` 与声明逐条对账，CI 无库也能红；**行数轴**（本快照有没有行）只有真库可判，
  归 DB-gated 判点 `liveSchemaAgreesWithStaticDerivation`（第 3 段 `COUNT(*)>0 ⇔ rowsPresent()`），无库时 skip。
- 口径澄清（与 §0.1 修正一致）：`post_tags` 不是死表——`PostTagRepository.save` 是活写点，163 行是 App 写的，
  故它进 `LIVE_WRITTEN` 而非「遗留无写点」格；32 条恒 0 的拆分是 **27 有写点（EMPTY_WRITTEN）+ 5 死表（DEAD_TABLE）**，
  本快照恰好 0 项落 `LIVE_UNWRITTEN`（E2「27 条写点在」的口径成立）。

### 3.2 死表 5 张逐张裁定（零写点集合 == 登记表，判点 `deadTableAdjudicationsAreExactlyTheZeroWriterEntries` 钉）
5 张**全部裁定为「保留清单项」**（rationale 里有字面量「W1c 裁定＝保留清单项」，判点逐张 `contains` 该句）：

| 死表 | 表还在链上吗 | 零写点证据 | 保留理由（核心） |
|---|---|---|---|
| `user_match_ticket` | 在（V2026.05.23.0003 建，链上无 DROP 认领退役） | 全仓无实体无 Repository | 行含话题偏好 + 临时会话 uid（PIPL 射程）；撤项＝把「可能有人有行」转成「没人负责」；代价仅一次 0 行语句 |
| `chat_ai_session_context` | 在（同上） | 无实体无 Repository | 全清单敏感度最高载荷之一（对话原文 JSON 自述姓名/校区/作息）；撤项＝注销不碰对话上下文，正是第五轮 P0 形状 |
| `chat_ai_suggestion_log` | 在（同上） | 无实体无 Repository | 对话派生文本，同属可主张删除；与上表要么一起留要么随退役迁移一起走，单摘一条会让「AI 语境数据清了没」重变口供 |
| `activity_proposal` | 在（同上） | 无实体无 Repository（FeedbackController 走 feedback 通道不落本表） | 全库唯一写明文手机号（`submitter_phone` 不走 AES）的表；撤项＝注销不处理提案手机号；删行会破坏已转公开活动的溯源故仅匿名 |
| `user_sessions` | 在（V2026.05.18.2200 建，无 DROP 迁移） | 有实体 `UserSession`+`UserSessionRepository`，但该接口全仓**零注入**（登录实际走 JWT+TokenBlacklistService）——「有壳没人写」 | `session_token` 是可重放凭据，不允许以「现在没人写」为由不清除；旧快照里的 token 行留存即凭据风险 |

> `user_sessions` 是写点判据的关键正例：判点明确「实体存在但 Repository 全仓零注入」不算写点，
> 否则它会被误判成 EMPTY_WRITTEN（`writerDetectorBitesOnFixtures` 用「只有实体+接口、零注入的壳表」专门做阳性对照）。
> 退役落账点缺失是共因：这 5 张的「表还在链上、语句恒 0」不是设计意图，是退役没写 DROP 迁移。
> 本轮不擅自 DROP 生产表（判不出项，见 §4.2），改由「退役迁移到位后 A/B/C 门会因『迁移链里没这张表』自动逼着划掉清单项与归因」兜底。

### 3.3 实现（机器可读 + 反漂移 + 防空转）
- 新增 `privacy/ErasureStatementSurface.java`：4 格枚举 + `rowsPresent()` / `hasWriters()` 两条轴判据 + 中文口径。
- `PersonalDataTables` 新增 `SURFACE_LEDGER` / `surfaceOf()` / `surfaceLedger()` / `statementCount()`；78 项逐条登记。
- 判点三条（`ErasureSurfaceAndOrderingGateTest`）：覆盖门 / 写点轴对账门 / 死表逐张裁定门；
  外加 `surfaceLedgerHasEveryCategoryAboveFloor`（各类地板 40/22/4，防整类被摘空转绿）与
  `mislabelingASurfaceCategoryTurnsTheWriterAxisRed`（内置阳性对照：对每项枚举所有「写点轴为假」的错类别，
  断言这些错类别必被判点抓到——CI 里自证「改错类别一定炸」，不需真库）。
- 写点扫描 `deriveWritePoints(src/main)`：①原生 `INSERT INTO/UPDATE…SET/DELETE FROM`；
  ②实体→Repository→被注入接收者上的 mutating 调用；**排除 privacy 包本身**（否则「清单证明清单」）。

### 3.4 反向变异（W1c2 接力实跑；前一手的 §3.4 全「（待填）」，此处为真发，全部串行跑、跑完立刻还原）
| # | 变异 | 结果（`ErasureSurfaceAndOrderingGateTest`） | 还原 |
|---|---|---|---|
| M5 | 把一张活表 `posts` 的归因从 `LIVE_WRITTEN` 覆盖成 `DEAD_TABLE` | 红 1 例：`surfaceWriterAxisAgreesWithDerivedWritePoints`（260 行：`posts` 有写点却声明写点轴为假）；`deadTableAdjudications…` 不红（`posts` 非零写点，不进 derivedZero），符合预期隔离 | sha `74382ba2…9c30` |
| M6 | 把一张死表 `user_sessions` 的归因从 `DEAD_TABLE` 覆盖成 `EMPTY_WRITTEN`（单张误标成有写点） | 红 2 例：`surfaceWriterAxisAgrees…`（260：零写点却声明有写点）＋ `deadTableAdjudications…`（286：零写点项的 `surfaceOf` 不在 `DEAD_TABLE` 格）；地板门不红（DEAD 5→4 仍 ≥ 地板 4） | sha `74382ba2…9c30` |
| M9 | **整组 5 张死表**归因从 `DEAD_TABLE` 改成 `EMPTY_WRITTEN`（前一手中断时正在做的那一发） | 红 3 例：`surfaceWriterAxis…`（5 项零写点却声明有写点）＋ `deadTableAdjudications…`（5 项 `surfaceOf≠DEAD_TABLE`）＋ `surfaceLedgerHasEveryCategoryAboveFloor`（DEAD 计数 5→0 < 地板 4）。三条独立判点同时抓到「把死表整体误标成有写点」 | sha `74382ba2…9c30`（还原后逐字相等，见 §5 sha 证据） |

> M7 / M8 未做，也无需做：M5+M6 已覆盖「单张改错类别」的两个方向（活→死、死→活），M9 覆盖「整组改错」，
> 且写点轴另有内置阳性对照 `mislabelingASurfaceCategoryTurnsTheWriterAxisRed` 在每次 CI 里自证。
> 「把归因改成错的类别，判点必须炸」这条——已在真库无依赖的 CI 路径上实跑坐实。

## 4. 收口

### 4.1 mvn 读数（W1c2 接力实测：`cd apps/api && ./mvnw -o -B test`，BUILD SUCCESS）
- 全量收口：**1905 例 / 0 失败 / 0 错误 / 11 skip**。
- 相对本任务下发的基线 `1892 / 0 / 10` 的增量＝**+13 例 / +1 skip**，全部来自 W1c 波新增：
  - `+11` ＝ 新增测试类 `ErasureSurfaceAndOrderingGateTest`（11 例，事项一顺序判点 + 事项三归因判点 + 阳性对照）；
  - `+2` ＝ `ErasureSchemaAlignmentTest` 新增 `everyBorrowedOwnerTableIsNamedOrExempt`、
    `borrowedOwnerClosureIsTransitiveAndOrderAware`（事项二穷尽门补形）；该类现 7 例。
  - `+1 skip` ＝ `ErasureSurfaceAndOrderingGateTest#liveSchemaAgreesWithStaticDerivation`
    （**新增的这一记 skip**，门控见下）。
- 定向三套（本车道还原变异后复跑，与主控先前读数一致）：
  `AccountErasureServiceTest` 18/0、`ErasureSchemaAlignmentTest` 7/0、
  `ErasureSurfaceAndOrderingGateTest` 11/0/1skip，全绿。
- 「改前/改后」两个真实读数：本车道只补跑判点、未新增/删除任何测试代码（M3–M9 全部还原），
  故**接力收口前后同为 1905/0/11**；上表 +13/+1 是相对 1892/0/10 交接基线的 W1c 波累计增量。
- skip 的门控条件：`liveSchemaAgreesWithStaticDerivation` 首行 `assumeTrue("-Derasure.db.enabled"=="true")`，
  其次要求仓库根存在 `.env` 且含 `DB_URL`/`DB_USERNAME`；三者缺一即按 assumption **跳过、不写成通过**。
  它负责「行数轴」与「静态外键图 == `information_schema` 逐条对账」两半——CI（无真库）恒 skip，
  **需要接进真实栈 CI**（能只读连 `campus_love` 口径库、且带 `-Derasure.db.enabled=true` 的作业）才算闭合，
  目前本机不具备（无 Docker/Redis、应用账号无建库/写权限）⇒ 见 §4.2。

### 4.2 判不出项（诚实边界，不写成已证）
1. **真执行 / 每语句实际影响行数 / 真回滚**：判不出。本机无 Docker/Redis；`campus_love` 生产口径库严禁写入
   （本车道全程只读 `SELECT`/`information_schema`，口令走 `MYSQL_PWD` 不进 argv）；应用账号无建库权限 ⇒ 影子库建不了。
   「语法 + 对象存在」已由 E2 的逐条 `PREPARE` 路线量过，但 `PREPARE` 只证语法与对象存在（SET NULL 撞 NOT NULL 也 rc=0），
   不等于真删得到、真回滚得了。
2. **归因账的「行数轴」在 CI 里判不出**：`surfaceOf` 声明 `LIVE_* ⇔ 本快照有行` 只在 `-Derasure.db.enabled=true` 时对账，
   无库即 skip。当前该轴的真值（`post_tags`=163 行、5 死表=0 行、44→45 张 LIVE）来自 E2 单次只读快照，
   **快照会变**（新数据落表会让某项从 EMPTY 漂到 LIVE），故行数轴是「接库时对账」的活门，不是盘上钉死的常量。
3. **5 张死表的物理退役**：判不出「该 DROP 还是该留」。本轮只裁「清单项留不留」（全留）；
   真要 DROP 需 DBA 出退役迁移，本机无法验证迁移链。留项的安全方向是「宁可 0 行空转也不给『没人负责』留口子」。
4. **`temp_chat_media_holds` 逃出本轮两条轴**（§0.2 已记，本轮未闭合）：它既无用户归属列、也无指向归属表的外键，
   身份只经 `session_uid`（含 userId 的字符串）、`created_by`（用户 ID）、`media_asset_id`（指向将被删的素材）三处隐含。
   「借归属」轴（外键闭包）与「有归属列」轴都捞不到它。本轮**不擅自扩第三条轴**，如实挂账交下一轮：
   需一条「字符串列内嵌 userId / 指向受管控资源的引用列」的新形状门，且其判据在真库上才可核。
5. **交接的 HEAD 对不上**：任务书称 HEAD `57f39069`，盘上 `git rev-parse HEAD` 实为 `2032954c`；
   且本车道 5 个 W1c 文件均为**未入库的工作树改动**（2 改 3 新增，见 §4.3），非提交态。
   因禁止任何 git 写操作，本车道不 commit、不追认版本号，仅如实记录盘上真值。

### 4.3 变更文件清单（W1c 波，工作树；`git status --porcelain` 实测，无游离文件）
| 文件 | 状态 | 事项 | 作用 |
|---|---|---|---|
| `apps/api/src/main/java/com/campuslove/api/privacy/ErasureStatementSurface.java` | 新增(??) | 三 | 4 格 2×2 归因枚举 + `rowsPresent()`/`hasWriters()` 两轴判据 + 中文口径 |
| `apps/api/src/main/java/com/campuslove/api/privacy/PersonalDataTables.java` | 改(M) sha `74382ba2…9c30` | 一/二/三 | ①事项二：`post_tags`（JOIN posts 按 author_id）、`temp_chat_contact_exchange`（JOIN temp_chat_session，排父表前）两项入清单 + `temp_chat_session` rationale 点名两子表；②事项三：`SURFACE_LEDGER`/`surfaceOf`/`surfaceLedger`/`statementCount` + 78 项归因 + 5 死表逐张「W1c 裁定＝保留清单项」；③类注释把「先删子后删父」假话换成实测 |
| `apps/api/src/test/java/com/campuslove/api/privacy/ErasureMigrationGraph.java` | 新增(??) | 一/二 | 迁移链静态图（在场表/CREATE 列集/归属列集/外键边含策略），认全 5 种外键声明形态 |
| `apps/api/src/test/java/com/campuslove/api/privacy/ErasureSurfaceAndOrderingGateTest.java` | 新增(??) sha `cfe38103…2666` | 一/三 | 顺序判点 A–E + 归因三判点 + 写点扫描 + 阳性对照（11 例，1 DB-gated skip） |
| `apps/api/src/test/java/com/campuslove/api/privacy/ErasureSchemaAlignmentTest.java` | 改(M) sha `0a0a4fb9…dd39e` | 二 | F-11 补形 `everyBorrowedOwnerTableIsNamedOrExempt` + `BORROWED_OWNER_TABLE_EXEMPTIONS`（只 promo_codes）+ `borrowedOwnerClosureIsTransitiveAndOrderAware` + 两解析器逐表逐列反漂移 |

> 未触碰（遵禁令）：根 `package.json`、`.github/workflows/ci.yml`、`README.md`、`tests/**`、`scripts/**`、`docker**`、`doc**`、
> `apps/client/**`、`apps/admin/**`；上一批的 `V2026.11.01.0001`、`StateMachines`、`NearbyVisibilityPolicy`、
> `TransactionalHttpCallStaticGateTest` 均未改。

## 5. W1c2 接力（收口：账实核对 + 变异台账）

- 接力车道：W1c2（收撞 150 轮上限的 W1c 数据层）；盘上 HEAD `2032954c`（任务书写 `57f39069`，见 §4.2 第 5 条）。
- 原则：不照抄前一手自述，逐条回盘核。前一手的 §0/§1 属实（§1.4 的 M1/M2 还原 sha 与本车道基线 sha `74382ba2…9c30` 逐字相等，反证其确已还原）；
  其 §2.4 标「待跑」、§3 全「（待填）」——即事项二/三的**变异从未实跑**，本车道补跑并落账，不替它追认。

### 5.1 事项二 · 账实核对表（回盘核，非复述）
| 任务要求 | 盘上真值 | 判定 |
|---|---|---|
| `post_tags` 已进清单，且**按父表归属删** | `PersonalDataTables.java:490` 项 `DELETE pt FROM post_tags pt JOIN posts p ON pt.post_id=p.id WHERE p.author_id={uid}`（本表无归属列，归属从父表 `posts.author_id` 取） | 已落 |
| 穷尽门补上「无归属列但经 FK 挂归属表的子表」形状 | `ErasureSchemaAlignmentTest#everyBorrowedOwnerTableIsNamedOrExempt`（310-369）+ `borrowedClosureOf`（401-418，`ownerTables∪{users}` 沿外键 child→parent **传递闭包**） | 已落 |
| 全库这类子表**全量捞出、不止 post_tags、逐张点名** | 闭包派生 4 张（判点地板 `borrowed.size()>=4` 且显式 `contains("post_tags")`）：`post_tags`（新点名）、`temp_chat_message`（原已在）、`temp_chat_contact_exchange`（新点名，JOIN 会话按 user_a/b_id，排父表前）、`promo_codes`（`created_by→users` RESTRICT，走 `BORROWED_OWNER_TABLE_EXEMPTIONS` 带 ≥20 字理由豁免） | 已落，4 张全覆盖，无「只修第一张」 |
| M3/M4 变异实跑 | M3 红 2 门、M4 红 1 门（孙表），均还原 | 本车道实跑，见 §5.3 |

### 5.2 事项三 · 账实核对表
| 任务要求 | 盘上真值 | 判定 |
|---|---|---|
| 76 条（现 78 条）语句作用面归因**机器可读**，三分类 | `SURFACE_LEDGER`（`PersonalDataTables:211-244`）＝ `Map<key,ErasureStatementSurface>`；`LIVE_WRITTEN`45/`EMPTY_WRITTEN`28/`DEAD_TABLE`5，第 4 格 `LIVE_UNWRITTEN`=0 但为合法枚举。覆盖由 `surfaceLedgerCovers…` 判点钉死（键集==带语句项、每项 1 句、条数==`statementCount()`） | 已落 |
| 5 张死表**逐张裁定**（进清单还是撤项 + 为何表还在链上） | `deadTableAdjudications…` 判点 + `DEAD_TABLE_ADJUDICATIONS`（5→「保留清单项」）；每张 rationale 含字面「W1c 裁定＝保留清单项」并写明表建于 `V2026.05.xxxx`、链上无 DROP 迁移（表还在链上的理由）与零写点证据 | 已落 |
| 「把归因改成错的类别，判点必须炸」**真做过变异** | 内置阳性对照 `mislabelingASurfaceCategoryTurnsTheWriterAxisRed`（每次 CI 自证）＋ 实跑 M5（活→死，红 1）/M6（死→活单张，红 2）/M9（整组死表→有写点，红 3） | 已落，本车道实跑 |

### 5.3 变异台账（串行跑、跑完立刻还原并记 sha）
| # | 事项 | 变异 | 首红判点（行） | 红例数 | 还原 sha |
|---|---|---|---|---|---|
| M1 | 一 | `temp_chat_session` 整块提到两子表之前 | `deleteStatementsFollowChildBeforeParent` | 1 | `74382ba2…9c30`（一手，与基线等） |
| M2 | 一 | `circle_topics` 匿名改删行 | `deletingParentsAndUndeletedChildrenArePinned`+顺序门 | 2 | `74382ba2…9c30`（一手，与基线等） |
| M3 | 二 | 删 `post_tags` 清单项 | `everyBorrowedOwner…`(354)+`surfaceLedgerCovers…`(230) | 2 | `74382ba2…9c30` |
| M4 | 二 | 传递闭包削成单层 | `borrowedOwnerClosureIsTransitiveAndOrderAware`(387) | 1 | `0a0a4fb9…dd39e` |
| M5 | 三 | 活表 `posts` 改判 `DEAD_TABLE` | `surfaceWriterAxis…`(260) | 1 | `74382ba2…9c30` |
| M6 | 三 | 死表 `user_sessions` 改判 `EMPTY_WRITTEN` | `surfaceWriterAxis…`(260)+`deadTableAdjudications…`(286) | 2 | `74382ba2…9c30` |
| M9 | 三 | 整组 5 张死表改判 `EMPTY_WRITTEN` | `surfaceWriterAxis…`+`deadTableAdjudications…`+`surfaceLedgerHasEveryCategoryAboveFloor` | 3 | `74382ba2…9c30` |

### 5.4 M9 还原证据（sha 一致性证明，纯文件级、无 git 写）
- 变异前基线 sha256（`PersonalDataTables.java`）：`74382ba23ffdcd8d4ccf8ed07c5ad6710b4630102eea908f0f3505e9fad89c30`。
- 施加 M9（`buildSurfaceLedger` 内 `m.put(key, ErasureStatementSurface.DEAD_TABLE)` → `EMPTY_WRITTEN`）→
  跑 `ErasureSurfaceAndOrderingGateTest`：`Tests run: 11, Failures: 3`（三条独立判点炸）。
- 逐字反向还原该行 → 再算 sha256 ＝ `74382ba23ffdcd8d4ccf8ed07c5ad6710b4630102eea908f0f3505e9fad89c30`，
  **与变异前逐字相等**；`git status --porcelain -- …/privacy …/privacy` 仅剩基线那 5 项（2 M + 3 ??），无游离改动。
- 三个受变异文件（`PersonalDataTables` / `ErasureSchemaAlignmentTest` / `ErasureSurfaceAndOrderingGateTest`）
  接力结束时的 sha 全等于接力起点基线 sha ⇒ **盘上无遗留未还原变异**；复跑定向三套（18/0、7/0、11/0/1skip）与全量
  1905/0/11 均 BUILD SUCCESS 佐证。

### 5.5 收口结论
- 事项一：已闭合（§1，判点 A–E + M1/M2）。
- 事项二：已闭合（穷尽门补形 + `post_tags`/`temp_chat_contact_exchange` 点名 + `promo_codes` 带理由豁免 + M3/M4 实跑）。
- 事项三：已闭合（78 项归因机器可读 + 5 死表逐张裁定 + M5/M6/M9 实跑；前一手的 §3 空缺由本车道补齐）。
- 未闭合、如实挂账：`temp_chat_media_holds`（逃两轴，需第三轴，§4.2-4）；归因「行数轴」与外键图真库对账
  （DB-gated skip，需接真实栈 CI，§4.1）；5 死表物理退役（需 DBA DROP 迁移）；「真执行/真回滚」（本机边界）。
