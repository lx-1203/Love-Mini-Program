# 第六轮审查 · E 车道：注销清单 SQL 的真 MySQL 8 可执行性判定

- 仓库：`D:\6\恋爱小程序`，HEAD `74e681ca`
- 被测物：`apps\api\src\main\java\com\campuslove\api\privacy\PersonalDataTables.java`（注销清除清单，单一事实来源）
- 载具：本机 MySQL 8.0.45，生产口径库 `campus_love`（118 张表）
- 路线：**零写入**。允许 SELECT / SHOW CREATE TABLE / information_schema / PREPARE（解析不执行）/ EXPLAIN（DML 只出计划不执行）；严禁 EXECUTE、严禁对 campus_love 任何 DML/DDL、严禁执行清单任何一条语句。
- sql_mode：`ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`；foreign_key_checks=1。

## 边界（如实记录）
- 影子库路线走不通：应用账号仅有 `campus_love.*` 权限，`CREATE DATABASE` 报 1044 Access denied，`.env` 无 root 口令。**「真执行 + 影子库」需要 DBA 凭据，本机判不出，只能等真库/DBA。**
- 本报告的可执行性判定基于 PREPARE 的「语法解析 + 表/列对象解析」阶段 + information_schema 静态核对 + EXPLAIN 计划，不覆盖执行期约束（触发器、运行时 FK 冲突、CHECK、生成列等）。

## 1. 语句总数与两种口径
- 静态源（`PersonalDataTables.java` 的 buildInventory）与运行时口径经 jshell 枚举实测一致：
  - INVENTORY_SIZE = 83 个清单项
  - 其中 7 项为 RETAIN_STATUTORY / 无语句（idx 16,18,19,73,74,75,76：likes_inbound、user_follows_inbound、content_mentions、vip_billing_log、user_wallet、promo_code_usages、invite_reward）
  - TOTAL_STATEMENTS = 76；ACTIONABLE_COUNT = 76
  - 与 A1 车道报的「76 条」闭合，两种口径相等，无分叉。
- `{uid}` 占位符统一替换为不存在的 userId `999999999`（`users` 里 id 为 BIGINT 主键，实际业务 id 远小于此，保证即便误执行也不命中真实行）。抽取产物：`D:/6/tmp-r6e/statements.tsv`（UTF-8，中文占位字面量完整）。

## 2. 逐条 PREPARE 结果（真 MySQL 8.0.45）
- 载具：每条写独立 `.sql` 文件，`mysql --default-character-set=utf8mb4` 送入 `PREPARE stmt FROM '...'`，随后 `DEALLOCATE PREPARE`；未 EXECUTE。
- **通过率：76/76（100%），0 条失败。**
- 阳性对照（证明这把尺子能抓错，非空跑）：
  - 不存在列 → `ERROR 1054 Unknown column`（抓到）
  - 不存在表 → `ERROR 1146 Table doesn't exist`（抓到）
  - 语法错（DELETE FORM）→ `ERROR 1064 syntax`（抓到）
  - **NOT NULL 列 SET NULL → PREPARE rc=0 通过（抓不到）**：证实「`SET x = NULL` 撞 NOT NULL 列」这类错误在 prepare 阶段不可见，只能在执行期由 STRICT 模式报 1048，故该类必须靠第 3 节 information_schema 对账，PREPARE 通过不代表可执行。
- 重点形状单独用第二把尺子 EXPLAIN 复量（均出计划、不执行）：
  - 多表 `DELETE m FROM ... JOIN ...`（idx 8）：EXPLAIN 通过
  - `UPDATE ... JOIN ... SET`（idx 11 private_messages、idx 69 payment_callback_log）：EXPLAIN 通过
  - `SET x = JSON_ARRAY()`（idx 82 users.interest_tags）：EXPLAIN 通过，JSON_ARRAY() 函数被接受
  - 别名 / 反引号 / 子查询形态：无子查询用例；别名与反引号形态全部 PREPARE 通过。
- 结论（可执行性第一层）：**全部 76 条在语法层与「表/列对象存在性」层成立**——清单点名的每张表都在库里、每个 WHERE/SET/JOIN 引用的列都真实存在。这是本机零写入路线能证的天花板；执行期约束（NOT NULL、FK 方向、生成列、触发器）PREPARE/EXPLAIN 均不覆盖，见第 3 节。

## E2 接力与方法变更（2026-11-01）

- 接力原因：前一手 E 在完成第 1、2 节（清单计数 + 逐条 PREPARE 76/76）后，因**请求错误中断**，其「进度」清单后四项未落。E2 从 HEAD `74e681ca` 接手，**不重做第 1、2 节**，只复核它的数（复核结果见下）。
- 方法变更（唯一一处）：前一手「每条语句起一个 mysql 进程」→ 25 次调用跑 55 分钟被服务端掐断。E2 改成**批量会话**：把一批查询拼进一个 `.sql` 文件，`mysql --batch --raw --default-character-set=utf8mb4 < batchN.sql` 一次会话跑完。
- **实测批大小**：全程 6 发 mysql 调用（另加 1 发单行小查），承载 38 个逻辑查询段：
  | 批次 | 一次会话内查询段数 | 内容 | 实测墙钟 |
  |---|---|---|---|
  | batch1 | 9 | COLUMNS / collation / FK 子父双向 / 生成列 / CHECK / 触发器 | < 2 s |
  | batch2 | 8 | users 人口、候选 uid、疑似死表列定义与存在性 | < 2 s |
  | batch3 | 2 | 79 个谓词列填充率 + 76 条语句 × 6 个候选 uid 行数（合计 541 个聚合扫描） | **0.506 s** |
  | batch4 | 4 | outbox 体量、豁免表 COUNT(*)、witness uid、孤儿归属 | < 2 s |
  | batch5 | 8 | 库新鲜度、payload userId 解算、sentinel 归属、PII 正则、孤儿扫描 | < 3 s |
  | batch6 | 7 | 残留计数、严格手机正则（假阳性对照）、tombstone 列可空性、outbox DDL | < 2 s |
  对照：前一手 25 发 / 55 分钟，E2 6 发 / 全程约 11 分钟（其中绝大多数是 SQL 生成与本仓代码 grep，不是等库）。**批量会话是本轮能做完四节的直接原因。**
- 前一手两个关键数复核通过：① 76 条语句引用的 **135 个不同 `(表,列)` 对**，E2 用 `information_schema.COLUMNS` 独立复核 ⇒ **135/135 全命中，0 缺列**（与第 2 节 PREPARE 结论两条独立路径一致）。② 「`SET x = NULL` 撞 NOT NULL 列在 PREPARE 阶段不可见」成立，第 3 节正是为此而设。
- 边界继承：影子库路线仍走不通（应用账号 `campus` 仅有 `campus_love.*`，无 `CREATE`，`.env` 无 root）。本车道继续零写入：**未执行任何 INSERT/UPDATE/DELETE/DDL，未 EXECUTE**，第 4 节全部走 `SELECT COUNT(*)` 等价谓词。
- 本载具性质先声明（影响第 4/5/6 节读数强度）：`campus_love` 是**播种快照**——`audit_log`/`notifications`/`private_messages`/`visitors`/`users`/`likes`/`interaction_events` 的 `MAX(created_at)` 全部等于同一个秒 `2026-10-29 10:29:26`，`users` 404 行且 `status` 全为 `active`（0 个 `deactivated`）。⇒ 凡「某表 0 行」都必须在**代码写点**一侧再钉一次，否则分不清「死表」与「快照没播到」。

## 3. NOT NULL / 可空性 / collation / FK 方向对账（information_schema）

口径：从 `statements.tsv` 的 76 条语句机器解析出 **51 个 SET 目标列**（`SET col = NULL` 31 个 / `SET col = <字面量>` 19 个 / `SET col = JSON_ARRAY()` 1 个）、**85 个 WHERE 引用列**（去重 79 个 `(表,列)`）、**3 个跨表 JOIN 列对**。产物 `D:/6/tmp-r6e/set_cols.tsv`、`where_cols.tsv`、`joins.tsv`。

### 3.1 `SET <列> = NULL` ↔ `IS_NULLABLE`（第 2 节天花板唯一补法）

**31 个 NULL 落值全部命中 `IS_NULLABLE = YES` ⇒ 0 条不合格，0 条执行期 1048。** 阳性对照来自第 2 节（同形 NOT NULL 列若落 NULL，PREPARE 照样 rc=0，故这张表不能省）。

| 清单项 | 列 | IS_NULLABLE | 列类型 |
|---|---|---|---|
| 11 | private_messages.quote_context | YES | text |
| 12 | private_conversations.last_message_preview | YES | varchar(255) |
| 23 | posts.title / images / tags / owner_circle_path / audit_remark（5 列） | YES | varchar(200) / json / json / varchar(256) / varchar(500) |
| 24 | comments.images / owner_circle_path | YES | json / varchar(256) |
| 25 | circle_topics.images | YES | json |
| 27 | campus_topics.images | YES | json |
| 29 | circle_announcements.title | YES | varchar(80) |
| 31 | notifications.source_user_id | YES | bigint unsigned |
| 65 | feedback_tickets.contact_wechat / attachments / latest_reply_summary | YES | varchar(64) / json / varchar(512) |
| 66 | activity_proposal.attachment_json / expected_city / expected_campus | YES | json / varchar(64) / varchar(128) |
| 67 | audit_log.request_body / error_message / ip / user_agent | YES | text / varchar(512) / varchar(64) / varchar(256) |
| 68 | user_agreement_consent.ip | YES | varchar(64) |
| 69 | payment_callback_log.raw_body / headers / detail | YES | text / varchar(1024) / varchar(512) |
| 70 | vip_order.openid / prepay_id | YES | varchar(128) / varchar(64) |
| 71 | vip_bills.remark | YES | varchar(200) |
| 72 | wallet_transaction_log.remark | YES | varchar(200) |

两处值得单独点名（不是缺陷，是「NULL 合法但语义要钉」）：
- `notifications.source_user_id = NULL` 与库内 FK `fk_notifications_source_user` 的 `DELETE_RULE = SET NULL` 同向 ⇒ 清单这条 UPDATE 是幂等冗余，不会触发约束。
- 5 个 `json` 列（posts.images/tags、comments.images、circle_topics.images、campus_topics.images、feedback_tickets.attachments、activity_proposal.attachment_json）落 NULL 合法（列可空），但同族另有 `users.interest_tags = JSON_ARRAY()` 落**空数组而非 NULL**——两种形状并存是本清单既有口径，非漂移。

### 3.2 `SET <列> = <字面量>` ↔ 类型/长度/字符集相容性

**19 个字面量目标 + 1 个 `JSON_ARRAY()` 全部相容 ⇒ 0 条不合格。** 最紧的一格是 `whisper_message.content varchar(60)` 接 `（内容已随账号注销删除）`（**12 字符**，占 20%），最紧的非 text 目标是 `reports.reason varchar(64)` 接 `已注销`（3 字符）；无一溢出。

| 判定项 | 读数 |
|---|---|
| 目标列字符集 | 42 个文本/字符串列 **全部 `utf8mb4`**，9 个非文本（7 json + 1 bigint + 1 json）无字符集 ⇒ 中文常量无 latin1/utf8mb3 拒收风险 |
| 目标列 collation | 42 个文本列 **全部 `utf8mb4_0900_ai_ci`**，0 个异族 |
| ENUM 截断（1265） | **0 个目标是 ENUM**：`posts.status` 是 `varchar(32) NOT NULL DEFAULT 'active'`，非 ENUM ⇒ `SET status='deleted'` 无枚举值域风险 |
| 生成列误写（3105） | 78 张点名表内 `EXTRA LIKE '%GENERATED%'` 共 104 列，**逐条都是 `DEFAULT_GENERATED`（表达式默认值），0 个 STORED/VIRTUAL 生成列** ⇒ 51 个 SET 目标无一落在生成列上 |

补充复核（同缺陷类、清单外的注销写路径）：`AccountErasureService.tombstone()` 经 JPA 写 `users` 的 21 个列。实测 `users` 里 **只有 `openid` 一张列是 `NOT NULL` 且无默认值**，而 tombstone 恰给它常量哨兵（非 NULL）⇒ 该路径同样 0 条 NOT NULL 冲突；`users.status`/`role`/`profile_completion` 等 NOT NULL 列均被写非 NULL 值。

### 3.3 collation 与 JOIN 混配（1267）

- 78 张点名表内全部字符列 **235 个，collation 只有一种 `utf8mb4_0900_ai_ci`**（`GROUP BY COLLATION_NAME` 一行结果）；按表分组 `COUNT(DISTINCT COLLATION_NAME) > 1` 的**空集** ⇒ 库内不存在「同表混排」，`V2026.10.30.0004__unify_collation_0900_ai_ci.sql` 的统一在盘上真生效。
- 3 个跨表 JOIN 逐对核：

| 清单项 | JOIN 两侧 | 左类型/排序 | 右类型/排序 | 混配风险 |
|---|---|---|---|---|
| 8 | temp_chat_message.session_id ↔ temp_chat_session.id | bigint（无字符集） | bigint（无字符集） | 无（数值） |
| 11 | private_messages.conversation_id ↔ private_conversations.id | bigint | bigint | 无（数值） |
| 69 | payment_callback_log.order_no ↔ vip_order.order_no | varchar(64) utf8mb4_0900_ai_ci | varchar(32) utf8mb4_0900_ai_ci | **无**（同 collation；长度不等只影响索引前缀，不影响可执行性） |

⇒ 1267 `Illegal mix of collations` 在本清单上**0 条**。这是 PREPARE/EXPLAIN 都不报、只能靠对账抓的一类，实测没抓到东西（阴性，但尺子已用 235 列的分布证过它扫到了全表）。

### 3.4 FK 方向清单与「先删子后删父」真伪

库内 FK 总数 **64**。78 张点名表作为**子**的 FK 行 **55** 条，作为**父**的被引用行 **53** 条（父侧 DELETE_RULE 分布：CASCADE 35 / NO ACTION 8 / RESTRICT 8 / SET NULL 2）。被点名的父表只有 6 张：

| 父表（清单里的动作） | 子表（是否在清单） | DELETE_RULE | 该父表若被 DELETE 会怎样 | 今天是否成立 |
|---|---|---|---|---|
| users（82 ANONYMISE，实体另走 tombstone） | **39 条 FK 引用 `users.id`**：CASCADE 22 行；**RESTRICT 8 行**（`promo_code_usages.user_id`、`promo_codes.created_by`、`user_wallet.user_id`、`video_calls.caller_id`、`video_calls.callee_id`、`vip_bills.user_id`、`vip_order.user_id`、`wallet_transaction_log.user_id`）；**NO ACTION 7 行**（`daily_benefits`、`love_verification_application`、`real_name_certifications.user_id`、`real_name_certifications.reviewer_id`、`user_agreement_consent`、`user_device_session`、`user_interest_tag`）；SET NULL 2 行（`notifications.source_user_id`、`reports.handler_id`） | RESTRICT / NO ACTION / CASCADE / SET NULL 混合 | 删 users 行会被 **15 条 FK（8 RESTRICT + 7 NO ACTION）直接拒（1451）**，另 22 条 CASCADE 会静默连带删掉别人的关系边 | **成立且无险**：清单从不删 `users` 行，tombstone 也不改 `users.id`（UPDATE_RULE 全 NO ACTION，未被触发） |
| temp_chat_session（9 **DELETE_ROWS**） | temp_chat_message（在清单 idx 8，**CASCADE**）；**temp_chat_contact_exchange（不在清单、不在豁免，CASCADE）** | CASCADE | 子表随删，不阻塞 | **成立**：本清单唯一一条「父表 DELETE」，且两侧都 CASCADE |
| private_conversations（12 ANONYMISE） | private_messages（10/11，CASCADE） | CASCADE | — | 成立（不删行，FK 不动） |
| posts（23 ANONYMISE） | comments / post_favorites / post_likes / post_shares / post_view_history / **post_tags** / **post_mentions**（CASCADE） | CASCADE | 删动态会连带销毁别人评论与标签 | 成立（不删行）——**清单 `PersonalDataTables.java:367` 的 rationale「不删行：comments.post_id 有 FK ON DELETE CASCADE」本轮被真库读数证实**（`fk_comments_post_id`，CASCADE，真在盘上） |
| circle_topics（25 ANONYMISE） | circle_replies / circle_topic_likes / circle_topic_like_notices（CASCADE，均在清单） | CASCADE | — | 成立（不删行） |
| campus_topics（27 ANONYMISE） | campus_topic_replies（**NO ACTION**，在清单 idx 28） | **NO ACTION** | 删话题会被未删的回帖阻塞（1451） | 成立（不删行） |

**对「先删子后删父」这一说法的裁决：它并不是本清单实际依赖的机制。** 按 `PersonalDataTables.INVENTORY` 顺序（`AccountErasureService:114` 起 `for` 循环、`jdbcTemplate.update` 逐条执行、单 `@Transactional`），**父项一律排在子项之前**：campus_topics 27 → campus_topic_replies 28；circle_topics 25 → circle_replies 26 / circle_topic_likes 44 / like_notices 45；posts 23 → comments 24；private_conversations 12 → private_messages 10/11（此处才真「子先父后」）；users 82 → 全部子表。它之所以整链不炸，**不是因为排序对，而是因为 6 张父表里 5 张是 ANONYMISE（不删行、不改 `id`）**，FK 根本没机会开火。⇒ 结论：**当前 0 条 DELETE 会被 FK 阻塞**（不合格 0 条），但顺序保护是**假的**，真正的保护是动作类型。任何一次把 `posts`/`circle_topics`/`campus_topics`/`private_conversations` 改成 `DELETE_ROWS` 的改动，都会让「子项排在父项之后」立刻变成运行时 1451（`campus_topic_replies` 是 NO ACTION，最脆；CASCADE 那几张则是静默多删别人的行）。
两处本轮新点名的连带面（不是新缺陷，但要在册）：
1. `idx 9` 删 `temp_chat_session` 会 **CASCADE 顺带清空 `temp_chat_contact_exchange`**（既不在清单也不在 A1 豁免集）。该表列集实测为 `id/session_id/proposer/status/created_at/updated_at/version`，**无用户归属列**，故 F-11 穷尽门不命中是对的；它的清除完全靠 FK 级效，**清单本身对它无一字**——若哪天该 FK 被改 NO ACTION，联系交换记录就会漏清。
2. `post_tags`（父 posts CASCADE，163 行，见第 6 节）与 `post_mentions`（0 行）同样挂在 posts 的 CASCADE 下，posts 不删行 ⇒ 二者永不被清单触达。

### 3.5 执行期约束补量（第 2 节明说没覆盖的两类）

- **CHECK 约束 12 条**，涉及列：`heart_signals.status`、`likes.status`、`temp_chat_session.phase`、`notifications.type/reference_type`、`circle_announcements.status`、`content_mentions.target_type`、`real_name_certifications.status`、`user_agreement_consent.source`、`user_online_status.status`、`posts.category/status`。清单 51 个 SET 目标里**唯一落进 CHECK 列的是 `posts.status`**，而 CHECK 值域实测为 `('active','deleted','hidden')` ⇒ `SET status='deleted'` **在值域内，0 条 3819**。其余 50 个 SET 目标与 CHECK 列无交集。
- **触发器 0 个**（`information_schema.TRIGGERS` 对 78 张点名表空集）⇒ 无隐藏写路径。
⇒ 第 3 节小结：**51 个 SET 目标、79 个谓词列、3 个 JOIN 列对、64 条 FK、12 条 CHECK、0 个触发器，合计不合格 0 条**；新暴露的是 1 条「顺序保护是假的」结构性风险 + 1 条「CASCADE 代管的未点名表」在册项，均非当前缺陷。

## 4. 恒 0 死语句预估（等价谓词 `SELECT COUNT(*)`）

口径（三条，全部机器生成，不手抄）：
1. **谓词替换**：把每条语句的 `FROM`/`JOIN` 段与 `WHERE` 段原样取出，前缀换成 `SELECT COUNT(*)`，仅把占位 `999999999` 换成真实 userId ⇒ 与 DML 的命中集合逐字同形（未执行任何 DML）。
2. **候选 uid 不是拍的**：先实测 6 个候选在各语句上的覆盖面再选主口径。

| 候选 uid | 命中的语句数 / 76 | 命中行数合计 |
|---|---|---|
| **100000（选为主口径，覆盖最广）** | **23** | 671 |
| 10001 | 21 | 4488 |
| 10002 | 21 | 3022 |
| 10003 | 19 | 1194 |
| 10024 | 11 | 2666 |
| 100171 | 12 | 38 |

3. **填充率口径**：对 79 个谓词列各取 `COUNT(*)`（表行数）、`COUNT(列)`（非 NULL）、`COUNT(DISTINCT 列)`。

### 4.1 填充率总判：没有「列存在但从未被写」这一类

79 个谓词列里 **47 个所在表非空，这 47 个列全部 `COUNT(列) == COUNT(*)`（填充率 100%）**，`列有 NULL` 的行数差异为 0 行 ⇒ 本清单**不存在**「谓词列根本没被写过」这种死法（区别于历史 5/530,461 那类死列）。剩下 32 个谓词列所在表本身 0 行，进 4.2 的 A 类。**注：这里的「32 个列」与 4.2 的「32 条语句」是两套独立计数，数字相同纯属巧合，不可互相推**（列按 `(表,列)` 去重、且 JOIN 语句的谓词列记在驱动表名下；语句按清单项计）。

### 4.2 三态分类（76 条全覆盖）

| 类 | 定义 | 条数 |
|---|---|---|
| **A 恒 0（普适）** | 被删/被改的那张表**整表 0 行** ⇒ 对**任何** uid 都恒 0 行 | **32** |
| **B 有行、主口径未命中** | 表有行且谓词列 100% 填充，只是 6 个候选都不是其主人 | 10 |
| **C 活语句** | 至少一个候选命中 > 0 行 | 34 |

### 4.3 A 类 32 条逐条，并用代码写点二分

判「死语句 / 这个账号恰好没这类数据 / 表根本没被写过」不能只靠库：**本库是播种快照**（见 E2 节），所以每条都回到 `apps/api/src/main/java` 数了一次写点（实体 / Repository 注入 / `save|delete` 调用 / 原生 DML）。

> 方法学坑（已纠）：第一版把「原生 DML 命中」当作活表证据，结果 `vip_order`、`feedback_tickets`、`activity_proposal` 等 7 张表的命中**全部来自 `PersonalDataTables.java` 自己引用它的注销语句**——检查器扫到了被测物本体。剔除该文件后重测，才得到下面的 W 列。

| idx | 表 | 表行数 | 代码写点（剔除清单自身后） | 定性 |
|---|---|---|---|---|
| 4 | user_interest_tag | 0 | UserInterestTagRepository.save ×2 | W-活，快照未播 |
| 7 | love_verification_application | 0 | save ×24 | W-活，快照未播 |
| 8 | temp_chat_message | **0**（其驱动表 temp_chat_session 有 1 行） | TempChatMessageRepository.save ×7 | W-活，快照未播 |
| 28 | campus_topic_replies | 0 | save ×1 | W-活，快照未播 |
| 29 | circle_announcements | 0 | save ×8 | W-活，快照未播 |
| 32 | profile_visitors | 0 | `ProfileVisitorController:229 profileVisitorRepository.save(record)` | W-活，快照未播 |
| **35** | **user_match_ticket** | 0 | **全仓零命中：无实体、无 Repository、无原生 DML** | **D-代码级死表** |
| 38 | user_block | 0 | save ×2 | W-活，快照未播 |
| 41 | post_shares | 0 | save ×1 | W-活，快照未播 |
| 44 | circle_topic_likes | 0 | save ×2 | W-活，快照未播 |
| 45 | circle_topic_like_notices | 0 | save ×1 | W-活，快照未播 |
| 46 | video_call_records | 0 | save ×4 | W-活，快照未播 |
| 47 | video_calls | 0 | save ×4 | W-活，快照未播 |
| 48 | wallet_unlocks | 0 | `wallet/WalletUnlock` + `unlockRepository.save` ×1 | W-活，快照未播 |
| 52 | task_claim | 0 | save ×1 | W-活，快照未播 |
| 53 | daily_benefits | 0 | save ×1 | W-活，快照未播 |
| 54 | make_up_quota | 0 | save ×1 | W-活，快照未播 |
| 56 | push_preferences | 0 | save ×1 | W-活，快照未播 |
| 57 | push_summaries | 0 | save ×2 | W-活，快照未播 |
| 60 | consulting_signup | 0 | save ×1 | W-活，快照未播 |
| 62 | invite_code | 0 | save ×1 | W-活，快照未播 |
| **63** | **chat_ai_session_context** | 0 | **无实体、无 Repository；全仓唯一命中就是清单自己那条 DELETE** | **D-代码级死表** |
| **64** | **chat_ai_suggestion_log** | 0 | **同上，全仓零命中** | **D-代码级死表** |
| 65 | feedback_tickets | 0 | 实体 `Feedback` + `feedbackRepository.save` ×4（表名与实体名不同名，靠 `@Table` 才对上） | W-活，快照未播 |
| **66** | **activity_proposal** | 0 | **无实体、无 Repository；仓内另一处命中是 C 端反馈类型字符串 `"activity_proposal"`，与表无关** | **D-代码级死表** |
| 69 | payment_callback_log | 0（joined 的 vip_order 亦 0） | PaymentCallbackLogRepository.save ×1 | W-活，快照未播 |
| 70 | vip_order | 0 | VipOrderRepository.save ×9 | W-活，快照未播 |
| 71 | vip_bills | 0 | 实体 `VipBill` + save ×2 | W-活，快照未播 |
| 77 | reports | 0 | ReportRepository.save ×5 | W-活，快照未播 |
| **78** | **user_sessions** | 0 | 实体 `UserSession` 与 `UserSessionRepository` 接口都在盘上，但**全仓零注入、零调用** | **D-代码级死路径（接口孤儿）** |
| 80 | user_online_status | 0 | save ×2 | W-活，快照未播 |
| 81 | third_party_account | 0 | save ×4 | W-活，快照未播 |

⇒ **A 类 32 条 = 5 条代码级死语句（35、63、64、66、78） + 27 条「写点确实在、只是这份快照没播到行」**。
- 5 条死语句的严重度：**低-中**。它们不产生错误、不影响注销正确性，但**清单里 6.6%（5/76）的语句在应用代码里没有生产者**，其中 `user_match_ticket`/`chat_ai_suggestion_log`/`chat_ai_session_context`/`activity_proposal` 四张连 JPA 实体都没有（表只存在于迁移链），`user_sessions` 是「实体与 Repository 接口俱在、无人注入」的接口孤儿。这与本仓吃过的「列存在≠列在用」同源，属**清单臃肿/表名漂移**类，不是隐私缺陷。
- 27 条不能判死：本库所有表的最大写入时间戳塌缩到同一秒 `2026-10-29 10:29:26`，是一次性播种的指纹 ⇒「表为空」在这里**没有区分力**，必须等真生产库才能定这 27 条的实际命中量。

### 4.4 B 类 10 条：主口径 100000 恒 0，但都不是死语句

逐条找 witness（`MIN(谓词列)`）后全部拿到 >0 行 ⇒ 属「这个账号恰好没这类数据」：

| idx | 表 | 表行数 | 命中过的 uid / 行数 |
|---|---|---|---|
| 0 | media_asset | 1384 | 真人侧仅 35 行（uid 100165→28、100158→4、100157→3）；其余 1349 行属 uid=0（见 4.5） |
| 5 | real_name_certifications | 261 | 100004 → 1 |
| 9 | temp_chat_session | 1 | **10020 → 1**（另一侧 user_a_id=1 是无主 id） |
| 21 | pass_records | 3 | 100032 → 1 |
| 34 | post_draft | 8 | 100018 → 1 |
| 36 | recommendation_preferences | 1 | 100159 → 1 |
| 37 | dnd_settings | 1 | 100158 → 1 |
| 43 | comment_likes | 556 | 10007 → 139 |
| 49 | search_queries | 3 | 100109 → 1 |
| 61 | official_chat_messages | 3 | 100151 → 3 |

⇒ 若只按「主口径 uid 恒 0」判死，会把这 10 条误杀。**恒 0 必须与 `COUNT(列)`/`COUNT(DISTINCT 列)` 同读**，否则分不出死语句与窄账号。

### 4.5 两条对「恒 0」有解释力、但不算缺陷的实测

- **`media_asset.user_id = 0` 是平台自有资源哨兵，不是注销黑洞**：1349/1384 行归 uid=0。实测其 `type` 全为 `app_asset`（1349 行全部），另 35 行是 `image`(33)/`avatar`(2) 归真人；`user_id` 由 `MediaAssetService.recordUpload/recordTempUpload` 的入参写入，**全部 6 个调用点传的都是会话内真实 userId，无一传 0**；uid=0 那批来自 `scripts/sync-app-assets.mjs` 生成的内置素材 SQL（该行首列字面量 `0`）。⇒ idx 0 的 `WHERE user_id = {uid}` 永不命中内置素材是**设计正确**，不是漏清。（附注：`media_asset.user_id` 是 `bigint NOT NULL` 且**无 FK 到 users**，所以 0 这类哨兵在库层面被允许；这是它没被 `Q4` 的 FK 清单扫到的原因。）
- **无主归属行的量化 + 归因**：对 47 个非空谓词列扫「owner id 在 `users` 里不存在且非 0」，命中 **3 张表 8 行**：`posts.author_id` 6 行（且这 6 行 `content` 仍非空）、`daily_answers.user_id` 1 行、`temp_chat_session.user_a_id` 1 行。逐一看 owner id：**posts 的 6 个是连续低号段 5,6,7,8,9,10**，而真人 id 从 10001 起（`MIN(id)=10001`），且 `database/seed-media-assets.sql:18` 正是按 `user_id IN (5,6,7,8,9,10)` 清理自己造的旧演示行；`daily_answers`/`temp_chat_session` 的无主 id 是 `1`。⇒ **成因是旧 id 方案的一次性播种残留，不是注销设计的生产漏洞**（`erase(uid)` 只可能由存在的主体触发）。但由此暴露一条真实不变量缺口：**清单没有任何「owner 无主行」的兜底扫描**，一旦生产上出现 `users` 行被硬删（当前 tombstone 设计刻意不删，见 3.4），这些行就永久无人可达。按「不变量缺口 + 本库证据归因为夹具」两条分开记，不合并成缺陷。

## 5. outbox_event 遗留判定（A2 §3.4「不给 outbox_event 加 user_id 列」）

A2 的论断拆成三个可测的原子，逐个给读数。**结论：论断未被证伪，但也未闭合——其中一条在本库「无对照」。**

| # | A2 的子论断 | 实测读数 | 裁决 |
|---|---|---|---|
| 1 | `outbox_event` 无 `user_id` 列（因此「不动 schema」的前提存在） | DDL 13 列：`id/queue_type/exchange_name/routing_key/payload_json/dedup_key/status/retry_count/last_error/created_at/sent_at/claimed_at/updated_at`，**确无 `user_id`** | **成立** |
| 2 | 消费者短路后「不再产生新行」 | 表内 **105 行**，`dedup_key` **105/105 全部以 `legacy-` 开头**＝迁移回填的存量行（`OutboxEvent.java:83` 自证「以 legacy- 开头的是迁移回填的存量行，仅用于追溯，不代表业务身份」）⇒ **这 105 行一条都不是生产者写的**。再看库新鲜度：`outbox_event.MAX(created_at)=2026-10-28 12:15:14`，而全库写入指纹塌在 `2026-10-29 10:29:26`（见 E2 节），即**快照里根本没有「修复之后的写」** | **判不出**（本库对「短路后有无新行」没有对照组：生产者从未在本快照产过一行，且快照在 2026-10-29 后不再收写）。**不许写「已闭合」** |
| 3 | 行只承载事件载荷、不是「注销后新产生的主体数据」 | 105/105 `JSON_VALID`；`JSON_KEYS` 唯一形态 `["userId","createdAt","eventType","targetUserId"]`；`$.title` 命中 **0/105**、`$.content` 命中 **0/105**、`$.userId` **105/105**、`$.targetUserId` **105/105**；`queue_type` 全为 `match`，`status` **105/105 全 FAILED** | **半成立**：载荷里**没有主体自由文本**（无标题/正文），但**有可寻址主体标识**：38 个不同 `$.userId` + 42 个不同 `$.targetUserId`，且 **105/105 都能用 `JSON_UNQUOTE(JSON_EXTRACT(...))` 取到值** ⇒ 「payload 里 userId 取不到」这一读法被实测否掉，取得到 |

补充三条对本节定性有用的实测：
- **残留行是投递惰性的**：`MessageProducer` 的补偿只认领 `PENDING`（`:443` 条件更新 `... AND status = PENDING`），`FAILED` 为终态「供人工介入」（`:475`）。105 行全 FAILED ⇒ 不会被再投，也就不会再向消费者注入任何写路径。**A2「补偿重投最多变成重投一条被丢弃的消息」这句在盘上是真的。**
- **有没有指向已注销/不可用主体**：**0/105**——38 个 `$.userId` 全部命中 `users` 行且 `status='active'`（`rows_subject_absent=0`、`rows_subject_not_active=0`）。**但这一步在本库是空对照**：`users` 404 行 `status` 全为 `active`，**库里一个 `deactivated` 主体都没有**（注销态在库层面尚未发生过），所以「不指向已注销主体」不可能是短路的效果，只是没有已注销主体可指。⇒ 真正要防的情形（注销后仍留着指向该主体的行）**本库无法构造**。
- **成本实测（支撑 A2「收益不抵风险」的取舍）**：`payload_json` 是 `TEXT` 且无 `user_id` 列 ⇒ 想按主体定向清除只能 `WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_json,'$.userId')) = ?`，**函数包列，不可走索引，只能全表扫**。在 105 行上是瞬时，但这是「不加列」路线的真实代价；105 行之外，清单 83 项 / 78 张点名表**不含 `outbox_event`**，F-11 穷尽门也不命中它（其 CREATE 体无用户归属列，不在 T 内）⇒ **注销后这 105 行的主体标识结构性留存，无任何语句触达**。

裁决写法（不越界）：A2 的「不加列」在**投递安全**上成立（FAILED 终态 + 载荷无自由文本），在**「注销能清空主体标识」这一目标上不成立**，而 A2 §3.4 段尾自己已把这个缺口留给主控裁定（「若主控裁定要『注销能定向清空 outbox』，再加 `user_id` 列 + 清单项」）。**本轮把该缺口从「判断」降为「未闭合」，并给出它在本库的真实尺寸：105 行、38 个主体、42 个被指向者、0 行可被现有清单触达。**

## 6. A1 归入带理由豁免的表复核（逐张 `COUNT(*)`）

### 6.1 正式豁免集 3 张（`ErasureSchemaAlignmentTest:109-122 OWNER_TABLE_EXEMPTIONS`）

| 表 | `COUNT(*)` | 表在盘上？ | 代码写点 | 裁决 |
|---|---|---|---|---|
| `post_mentions` | **0** | 是 | 实体 `PostMention` + `PostMentionRepository` 接口在盘上，但 **`PostMentionRepository` 全仓零注入**（唯一命中是它自己的声明行）；`village/PostMentionService:11` 注释自证「2026-10-28 起复用统一表 content_mentions（旧表 post_mentions 仅保留回填）」，`:25` 实调 `ContentMentionService` | **豁免站得住**：0 行 + 无写点 + 数据改道，三条都实测到 |
| `feedback_admin_reply` | **0** | 是 | 无实体、无 Repository、无原生 DML（列集实测 `id/source_type/source_id/replier_user_id/reply_content/is_public/created_at`，`replier_user_id bigint NOT NULL`） | **豁免站得住** |
| `sensitive_word_import_task` | **0** | 是 | 有原生 INSERT（A1 已述），但表内 0 行 ⇒ 当前无管理员 id 留存 | **豁免站得住**（0 行；「非 APP 主体」的语义理由本轮不复核，属代码论证射程） |

⇒ **三张带理由豁免全部真 0 行，无一「有数据 ⇒ 新缺陷」。**

### 6.2 A1 报告点名的其余「死表 / 不在 T」表逐张

| 表 | A1 的处置 | 实测 | 裁决 |
|---|---|---|---|
| `vip_red_packet_claims` | 建后即删，不在 T | **表不存在**（`information_schema.TABLES` 未命中） | **成立**（真库层面复核过 DROP 生效） |
| `user_feedback_ticket` | 建后即删，不在 T | **表不存在** | **成立** |
| `temp_chat_media_holds` | 有实体有写点，但无用户归属列 ⇒ 不在 T | **0 行**；列集 `id/media_asset_id/session_uid/created_by/...`，确无 `user_id` | **成立** |
| `official_messages` | 全链无用户归属列，仅 `account_id` ⇒ 不在 T | **12 行**（有数据）；列集实测确认只有 `account_id`，无主体归属列；`content` 手机号/邮箱正则命中 **0/12** | **成立**：有数据但不按主体归属，「按 {uid} 删/匿名」无从写起（A1 的结构性论证在真库上复量通过） |
| `error_reports` | 无用户归属列、`context` 自证已脱敏 ⇒ 不在 T | **721 行**（有数据）；列集 `message/stack/name/context/platform/created_at`，确无归属列 | **成立，但脱敏声称本轮量到边界**：宽口径手机正则 `1[3-9][0-9]{9}` 在 `stack` 命中 **3/721**，加数字边界 `(^|[^0-9])…([^0-9]|$)` 后 **0/721**，`context`/`message` 亦 0 ⇒ **3 次命中是假阳性**（长数字子串），脱敏声称未被证伪。同时点名：该表 **721 行且 `MAX(created_at)=2026-10-28 22:32:53`**，是全库唯一时间戳落在主播种点之外的表，即它在快照里**被写过**；其留存由 `ErrorReportRetentionService` 按时间清理，与注销无关 |
| `content_mentions` | RETAIN_STATUTORY（清单第 19 项，无语句） | **0 行** | 保留口径无行可保留， moot；但注意 6.1 的 `post_mentions` 改道目标就是它 ⇒ **「旧表豁免、新表也 0 行」，@提及数据在本快照里两边都空**，改道路线在本库未获数据验证 |
| `profile_visitors` vs `visitors` | A1 F-02：清单曾只清 `profile_visitors`，生产真写 `visitors` | `profile_visitors` **0 行**、`visitors` **2693 行** | **A1 的诊断方向在真库上成立**（老语句打在空表）。同时**纠一处过判**：`profile_visitors` 并非死表——`ProfileVisitorController:229 profileVisitorRepository.save(record)` 是真写点 ⇒ 两条语句（第 32、33 项）**都该保留**，A1「不合并表」的处理正确 |

### 6.3 本节新点名的未覆盖载体（非 A1 清单内，读数不为 0）

| 表 | 行数 | 事实 | 严重度 |
|---|---|---|---|
| **`post_tags`** | **163**（16 个不同 `tag_name`） | 有实体 `PostTag` + `@Table(name="post_tags")`，`VillagePostService:356` 起随 C 端发帖**同步写**（注释自证 R4-00328「此前 post_tag 表…」），`RealPostTagService`/`PostTagController` 在读。列集 `id/post_id/tag_name/created_at/version`——**无用户归属列 ⇒ F-11 穷尽门不命中它**；父表 `posts` 的 FK 是 `ON DELETE CASCADE`，但 `posts` 走 ANONYMISE 不删行（见 3.4）⇒ **注销后主体亲手写下的话题标签文本永久留在 `post_tags`**，而同一主体的 `posts.tags` JSON 已被第 23 项置 NULL | **中偏低**（新缺陷，需主控裁定）。定性要点：这是「**归属门只看列名、不看内容**」的结构性盲区——表没有 `user_id` 所以合法逃逸 F-11，但它的行是主体在 `posts` 匿名化流程里被显式清掉的那份数据的规范化副本。归因链 `post_tags.post_id → posts.author_id → users 墓碑行` 中的身份一环已被 tombstone 打断，故不构成直接可识别 PII，不构成高严重度 |
| `temp_chat_contact_exchange` | 0 | 无归属列、不在清单、不在豁免；实际由第 9 项的 `temp_chat_session` FK **CASCADE 代管**（见 3.4） | 低（在册风险项，非当前缺陷：一旦该 FK 改 NO ACTION 即漏清） |
| `post_mentions`（作为 `posts` 的 CASCADE 子表） | 0 | 同上，靠 CASCADE 或永不触达 | 无（0 行） |

## 7. 仍然判不出的部分（不得折算成收益）

1. **真执行 / 影响行数 / 回滚**：影子库要 DBA 凭据（`campus` 账号无 `CREATE`，`.env` 无 root），本机不可得 ⇒ 第 4 节全部是 `SELECT COUNT(*)` 等价谓词预估，**不是** `jdbcTemplate.update` 的真实返回值；`ErasureResult.rowsAffected` 在本载具上无法产生。
2. **27 条「写点存在但表 0 行」的语句**：本库是播种快照（全表 `MAX(created_at)` 塌在同一秒），「空表」在这里没有区分力 ⇒ 需真生产库行数才能定它们各自的实际命中量。
3. **A2 §3.4 的「短路后不再产生新行」**：本库无「修复后的写」对照组（见第 5 节 #2），**空集/无对照上判不出，不得写「已闭合」**。
4. **`users` 无 `deactivated` 主体**：404 行全 `active` ⇒ 「注销后残留行指向已注销主体」这一类在本库无法构造，outbox 与所有 RETAIN 项的「注销后语义」均只能停在代码论证层。
5. **执行期真实 FK 冲突**：第 3 节是对账（约束定义 + 动作类型 + 顺序）推出的「0 条阻塞」，不是执行结果；`@Transactional` 单事务下任一 1451/1048/3819 都会整链回滚，这一效果本机未观测。
6. **`official_messages`/`error_reports` 的「非主体数据」语义判断**：本轮只验了「无归属列 + PII 正则 0 命中」，未验业务语义（谁算主体），属代码/产品论证射程。

## 进度
- [x] 环境与连接基线
- [x] 语句抽取（两种口径计数）
- [x] 逐条 PREPARE
- [x] information_schema NOT NULL / collation / FK 对账（第 3 节，E2 落）
- [x] 恒 0 死语句预估（第 4 节，E2 落）
- [x] outbox_event 遗留判定（第 5 节，E2 落，判不出项显式保留）
- [x] 死表 COUNT(*) 复核（第 6 节，E2 落）
- [x] 判不出清单（第 7 节，E2 落）
