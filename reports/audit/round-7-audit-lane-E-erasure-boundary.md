# 第七轮 审查车道 AUDIT-E — 账号清除（erasure）域边界钻探：证伪 R7-B 第三轴与 temp_chat_media_holds 收编的完整性与正确性

- 仓库：`D:\6\恋爱小程序`（win32，Git Bash）
- **HEAD 实测：`f998762dfb008151ac841c2a31aab2742568b7ff` ＝ 任务书指认的 `f998762d` ✓**（`git rev-parse HEAD`；`git log --oneline -1` = "fix(api,client,admin,gates): 第七轮——第六轮挂账 8 项全闭合 + 46 页契约三批次落地"）
- 路线：**只读审查**。未改任何仓内文件（本报告除外）、无任何 git 写操作；`database/flyway/sql` 只读解析；真库访问仅 `SELECT`/`EXPLAIN`/`PREPARE`/`DEALLOCATE`（**未 EXECUTE、未发任何 DML/DDL**，口令走 `MYSQL_PWD` 不进 argv，`.env` 经 `set -a && . ./.env` 装载）；脚本与中间产物全部落在仓外 `D:\6\tmp-r7e\`。
- 被证伪对象：commit `f998762d` 引入的 F-11 第三轴（`ErasureSchemaAlignmentTest#everyNamedManifestIdReferenceWithoutFkIsNamedOrExempt`）与 `temp_chat_media_holds` 清单项（`PersonalDataTables` 第 1 项，语句序 1/79）。

## 0. 方法与交叉校验

三轴判点全部读源码对齐（判据载体）：

| 轴 | 判点 | 派生口径（源码读数） |
|---|---|---|
| 第一轴（归属列） | `ErasureSchemaAlignmentTest#everyOwnerColumnTableIsNamedOrExempt` | 归属列谓词 = 16 名单（`user_id/author_id/sender_id/receiver_id/visitor_id/reporter_id/caller_id/callee_id/claimer_id/operator_id/follower_id/following_id/user_a_id/user_b_id/host_id`）+ `*_user_id`/`*_author_id` 后缀；**只认 CREATE 体** |
| 第二轴（FK 借归属闭包） | `everyBorrowedOwnerTableIsNamedOrExempt` | `ownerTables ∪ {users}` 沿 FK 边 child→parent 传递闭包；FK 边认 5 种形态（CREATE 体 / ALTER ADD / ALTER DROP / `CALL add_fk_if_missing` 5\|6 参 / `CALL drop_fk_by_column`），按文本位置施加 |
| 第三轴（列名点名无 FK） | `everyNamedManifestIdReferenceWithoutFkIsNamedOrExempt` | 列 = `<清单表名>_id`、目标≠自身、目标在清单、且 FK 图上无 (child=本表→parent=目标) 边 ⇒ 表须点名或豁免；列集**复用 `ErasureMigrationGraph.columnsByTable` = 只认 CREATE 体** |

**解析器移植交叉校验**（我按 `ErasureMigrationGraph` 逐正则移植成 Node 脚本 `D:\6\tmp-r7e\enum-axis3.cjs`，跑同一迁移目录）：`files=234 / 在场表=117 / FK 边=64 / 归属表=78` —— 与第六轮 E2/W1c 的真库读数逐项相等（64 条边=information_schema 真值；78 张归属表；117+`flyway_schema_history`=118 张在场表）。第三轴命中复算 = `["temp_chat_media_holds.media_asset_id→media_asset"]`，与判点地板断言（`hits.size()>=1` 且 contains 该条）一致。⇒ 我的枚举口径与判点同源，读数可信。

运行时清单真值（不抄源码、直接问对象）：`javac -encoding UTF-8` 编译 5 个 privacy 主类到 `D:\6\tmp-r7e\classes`，jshell 枚举：`STATEMENT_COUNT=79 / INVENTORY_SIZE=86 / ACTIONABLE=79`，唯一清单表 81 张，逐语句落 `manifest-dump.txt`（PREPARE 与逐条核对都用它）。

## 1. 六轴钻探（命令 → 读数 → 判定）

### 轴 1｜第三轴逃逸形状枚举（本轮最重要）

命令：`node D:\6\tmp-r7e\enum-axis3.cjs`（对 `database/flyway/sql` 全部 234 个 SQL，按 ErasureMigrationGraph 口径解析）→ 产物 `id-columns.tsv`（178 行）/ `escape-candidates.tsv`（97 行），再对每个候选人工核 DDL 语义。

全库扫到 **162 个 `_id` 列 + 16 个 `_by`/`uid` 列**。按「该列指向的表是否在清单（精确名匹配）/ 是否有 FK 边」分桶：

| 桶 | 计数 | 说明 |
|---|---|---|
| 本列有 FK 边 | 63 | 归第二轴闭包射程（如 `reports.handler_id→users(SET NULL)`、`reports.reporter_id→users(CASCADE)`、`promo_codes.created_by→users(RESTRICT)`） |
| 精确名匹配清单表且无 FK（第三轴命中） | **1** | `temp_chat_media_holds.media_asset_id→media_asset`（唯一命中，已收编） |
| 既无 FK 又非精确名匹配 | ≈98 | 逐一过语义网（`*_user_id`、`user_a/b_id`、`target_id`、`operator_id`、`created_by/updated_by`、`reviewer/auditor/handler/inviter*`） |

**逐类判定**（表 → 覆盖归属）：

1. `*_user_id` 族（`mentioned_user_id`(content_mentions/post_mentions)、`replier_user_id`(feedback_admin_reply)、`submitter_user_id`(activity_proposal)、`inviter_user_id/invitee_user_id`(invite_reward)、`blocked_user_id`(user_block)、`visited_user_id`(visitors)、`trigger_user_id`(interaction_events)、`source_user_id`(notifications)）：**全部命中第一轴后缀谓词** ⇒ 表要么在清单、要么在 `OWNER_TABLE_EXEMPTIONS`（post_mentions/feedback_admin_reply/sensitive_word_import_task 三张带理由豁免）。
2. `operator_id`(audit_log/sensitive_word_import_task)、`caller/receiver/callee_id`、`user_a/b_id`、`host_id`、`reviewer_id`(campus_certifications，有 FK)：**全在 16 名单内或表已在清单**。
3. `target_id`(reports/wallet_unlocks/content_mentions/post_draft)：内容对象指针（target_type+target_id 复合），所在表全在清单（reports 项只匿名 reporter 手写文本、target 边保留指向墓碑——已有裁定）。
4. 语义指向 users 但三轴全盲的，只剩两组（+一组形状性盲区）：
   - **`admin_layer.admin_id`**（V2026.10.13.0001:69，`BIGINT NOT NULL`，无 FK——该 DDL 是从现网 `SHOW CREATE TABLE` 原样落的，边本就不存在）：后台管理员↔圈层授权映射（RBAC）。表不在清单、无归属列（`admin_id` 不进谓词）、无 FK（第二轴闭包走不到）、无 `<清单表>_id>` 列（第三轴不触发）⇒ **三轴全盲**。
   - **8 张平台配置表的 `updated_by`**（`app_config / app_login_hero_config / app_rule / app_switch / chat_ai_feature_flag / legal_document / match_config / recommend_strategy`，均为 ALTER 补列、无 FK）：`_by` 后缀不在任何一轴的派生谓词里 ⇒ 三轴全盲。
   - **CREATE 体外的列对第三轴不可见**（结构性盲区，当前无实害）：`posts.auditor_id`（V2026.06.25.0004:37，"审核人用户 ID"）、`circle_topics.auditor_id`（V2026.08.31.0001）、`media_asset.temp_session_id`（V2026.10.28.0012:5，"临时会话 ID"→temp_chat_session，无 FK 且列名缩写不精确匹配）——这三个全靠"表恰好在清单里"才没成为残留，第三轴对它们一个都看不见（见发现 F-3/F-4）。

**判定：APP 主体射程内 P1 逃逸 = 0 张**。三轴+清单对"APP 用户的个人数据表"的覆盖在本轮枚举下闭合；盲区里躺着的全是**管理员指针/平台运营配置**形状（`admin_layer`、8 张 config 表），它们是否该进注销射程是语义裁定问题，不是漏删 APP 用户数据——但按这套门自己的纪律（"约定式引用必须点名或豁免"），它们是**未登记的三轴外逃逸**（F-1/F-2，P2）。另一个诚实读数：第三轴按 `<清单表>_id` 精确匹配，全库只命中 1 列——清单表名是复数、引用列习惯单数（`post_id`→posts、`conversation_id`→private_conversations、`activity_id`→activities 全都不匹配），**这条轴的"泛化能力"实际上是单点**，这印证并收紧了主控已认的"覆盖度=列名约定"边界。

### 轴 2｜media_holds 语句与 DDL 对账

命令：读 `V2026.10.28.0012__add_temp_chat_media.sql` + `V2026.07.24.0002__create_media_asset.sql`，逐列对清单语句 `DELETE h FROM temp_chat_media_holds h JOIN media_asset ma ON h.media_asset_id = ma.id WHERE ma.user_id = {uid}`。

| 对账项 | DDL 读数 | 判定 |
|---|---|---|
| `temp_chat_media_holds` 列集 | `id / media_asset_id(BIGINT NOT NULL) / session_uid(VARCHAR(64) NOT NULL) / reason(VARCHAR(255) NULL) / hold_until(DATETIME NOT NULL) / created_by(BIGINT UNSIGNED NULL) / created_at` | 与清单 rationale 声称的列集逐列相等 ✓ |
| `media_asset.id` | `BIGINT AUTO_INCREMENT PRIMARY KEY`（有符号） | 与 `h.media_asset_id BIGINT`（有符号）**类型可 JOIN** ✓（UNIQUE KEY `uk_temp_chat_media_holds_asset` 还保证了 1:1） |
| `media_asset.user_id` | `BIGINT NOT NULL` + `idx_media_user` | 存在 ✓，借归属谓词成立 |
| `SET x=NULL` 形态 | 本项是纯 `DELETE …JOIN`，无 SET 子句 | 清单没有对它写非法语句 ✓（`PersonalDataTables.sanityCheck` 的"SET 侧禁 `{uid}`"对 DELETE 形态天然满足；`{uid}` 只出现在 WHERE 侧 ✓） |
| 顺序 | 清单项序 0（第 1 条语句），`media_asset` 删除在序 1（第 2 条） | 借方先于被借表 ✓（判点 `joinBorrowingDeletesRunBeforeTheJoinedTableIsDeleted` 绿） |
| `identifyingColumns` | `session_uid / reason` 两列真实存在 | 判据 B 覆盖 ✓ |
| 文件回收 | holds 无自有文件；`media_asset` 项的 `fileUrlSelects` 取回 URL 后物理删文件 | 无孤儿文件路径 ✓ |

附带一致性注记（非缺陷，已有裁定但值得留痕）：`media_asset.hold_until` 是"举报取证保留截止（此时间前不删）"，而 erasure 的 `DELETE FROM media_asset WHERE user_id={uid}` **不理会未到期的 hold**——清单 rationale 明写"取证价值随素材消灭"，属 PIPL 删除义务压过取证保留的政策选择，已登记，不改判。

**判定：轴 2 通过，语句与 DDL 逐列成立，无非法形态。**

### 轴 3｜顺序判点对"子查询借归属"的充分性

命令：读 `ErasureSurfaceAndOrderingGateTest#joinTargetsOf`（239-259 行）。

读数：`joinTargetsOf` 只扫描小写化语句里的 `" join "` 子串并取其后的表名（LEFT/STRAIGHT 显式不认）。构造性反例：

```sql
DELETE FROM t WHERE t.media_asset_id IN (SELECT ma.id FROM media_asset ma WHERE ma.user_id = ?)
```

- `joinTargetsOf` 返回 `[]` ⇒ 该语句**不计入 borrowers**，借方-被借表顺序检查对它**完全不发生**；
- 防空转地板 `assertTrue(audit.borrowers() >= 1)` 只保证全清单至少还有一个 JOIN 形借方（今天有 5 条：post_tags/temp_chat_message/temp_chat_contact_exchange/private_messages_inbound_quote/payment_callback_log）⇒ 一条被改写成子查询并排错，地板照绿；
- `DELETE_TARGET` 正则对 `DELETE FROM t WHERE … IN (SELECT…)` 仍能取出目标 t（删除顺序判点 A 不受影响），盲的只是"借归属先于被借表删除"这一条。

**判定：确认盲。当前 79 条语句无一含子查询（round-6 E 报告亦实测"无子查询用例"），故今天是潜在缺陷而非现行缺陷——应当挂账**（F-5，P3：把 `FROM <表>` 出现在子查询里也纳入借方识别，或在判点注释里显式声明此边界）。

### 轴 4｜管理员主体的语义对称性

事实链（全部回盘核过）：

1. `MediaAssetService#holdTempAsset(assetId, sessionUid, reason, days, adminId)`（由 `AdminMediaAssetController` 调用）写 `created_by=管理员`、`reason=保留原因（管理员手写自由文本，≤255）`、`session_uid=会话双方痕迹`；
2. 清单的删轴只有 `media_asset.user_id`（素材归属）——**被注销主体是管理员时，他创建的 holds 一条不删**（`created_by` 不参与任何 WHERE）；
3. `RealAccountSecurityService#deactivateAccount`（196-252 行）**没有角色门**：有密码账号校验旧密码即可注销，而 V2026.06.25.0008 已把 password 扩到全部用户（含管理员）⇒ "被注销的主体是管理员"**经此路径可达成，不是假设**。

两个方向的论证：

- **"holds 是操作记录不是主体个人数据"（支持现状）**：行的证据载荷（session_uid、reason、hold_until）是关于**别人素材**的moderation事实；`created_by` 只是对动作的归因指针，注销后解析到无身份墓碑行——与 `promo_codes.created_by`（豁免理由原文："后台运营账号…平台营销资产而非 APP 主体的个人数据"）、`reports.handler_id`（"处置留痕保留"）、`sensitive_word_import_task.operator_id`（豁免）同族。且 hold 行本来就会随素材主体的注销而消亡（删轴借 media_asset.user_id）。
- **"审计留痕"的反例不对称**：`audit_log` 项恰恰是**按 operator_id 触发**的（`UPDATE audit_log SET operator_username=…,request_body=NULL,… WHERE operator_id={uid}`）——当操作者是被注销主体时，操作者手写的载荷被抹掉、只留可归因但不识别的指针。同理 `reports` 项把**举报人本人**手写的 description/reason 就地匿名（"有自由文本列即不得 RETAIN"是清单自己的规则）。`temp_chat_media_holds.reason` 是管理员手写自由文本，却在"管理员注销"场景原样保留——与上述两条先例**不同向**。

**裁定建议（不改码）**：hold 行本身保留（操作记录、载荷关于他人素材、指向墓碑不识别）——站得住；但 `reason` 应视为与 `audit_log.request_body`/`reports.description` 同族的"操作者手写文本"，理想态是在清单 rationale 里把"管理员主体注销时 reason 不处理"这条边界**写明并登记豁免理由**（乃至后续按 audit_log 先例对管理员主体的 reason 做置空）。鉴于 E2 快照 0 行、管理员自注销是边缘路径，降为 **P3 语义挂账**（F-6）。同族残留一并点名：`reports.handler_id/handle_remark`、`posts.auditor_id`、`circle_topics.auditor_id`、8 张 config 表 `updated_by`（后三者/组三轴全盲，见 F-1/F-2）。

### 轴 5｜PREPARE 零写入验证（复刻 round-6 W1c/E 路线）

先读路线出处：`reports/audit/round-6-fix-lane-W1c-erasure.md` §4.2 交代"语法+对象存在已由 E2 的逐条 PREPARE 路线量过"；具体机制在 `reports/audit/round-6-audit-lane-E-db.md` §1-2：`{uid}`→不存在的 `999999999`，每条 `PREPARE stmt FROM '…'` + `DEALLOCATE`，**绝不 EXECUTE**，批量会话一次送入。任务书"本机只读 PREPARE 不可用"的前提被实测推翻——本机 MySQL 8.0.45 可达（`campus_love`，`temp_chat_media_holds` 实测 0 行，与 EMPTY_WRITTEN 归因一致）。

命令与读数：

- `node gen-prepare.cjs` 从 jshell 抽取的 79 条语句生成 `prepare-batch.sql`（单引号双写转义）；
- `mysql … --force < prepare-batch.sql`（`MYSQL_PWD` 走环境）→ **79/79 PREPARE rc=0，0 条 ERROR**；批尾追加 `SELECT 'BATCH_END_OK'` 复核整批确实跑完（marker 回显 ✓，证明不是中途静默截断）；
- **阳性对照**（证明尺子能抓错，非空转）：错列 → `ERROR 1054 Unknown column`；错表 → `ERROR 1146 Table doesn't exist`；语法错（DELETE FORM）→ `ERROR 1064`——三条全部按预期炸；
- 第 79 号新语句（实为第 1 条）双尺复量：PREPARE 通过 + `EXPLAIN DELETE h FROM temp_chat_media_holds h JOIN media_asset ma …` 出计划不执行（h 全扫 1 行、ma eq_ref 走 PRIMARY、Using where）。

**判定：79 条语句在语法层与"表/列对象存在性"层全部成立。** 边界继承 round-6：PREPARE 不覆盖执行期约束（NOT NULL 撞 SET NULL、运行期 FK 冲突、触发器），且写 session 状态（PREPARE/DEALLOCATE 自身）——数据零写入。

### 轴 6｜回归与语句数断言

命令：`cd apps/api && ./mvnw -o -B test -Dtest='Erasure*'` → **BUILD SUCCESS，`Tests run: 22, Failures: 0, Errors: 0, Skipped: 1`**：

- `ErasureSchemaAlignmentTest` 9/0（第六轮 7 例 + R7 第三轴 2 例）；
- `ErasureSurfaceAndOrderingGateTest` 13/0/1skip（第六轮 11 例 + R7 借归属顺序 2 例；skip=DB-gated `liveSchemaAgreesWithStaticDerivation`，assumeTrue 不写成通过，口径正确）。

**一个命令陷阱（F-7）**：`-Dtest='Erasure*'` 按**类名前缀**匹配，`AccountErasureServiceTest`（Account 开头）与 `PersonalDataErasureAlignmentTest`（PersonalData 开头）**不在射程内**——按任务书原命令跑会漏掉清除域最核心的单测。我补跑 `-Dtest='AccountErasureServiceTest,PersonalDataErasureAlignmentTest'` → 18/0 + 3/0，BUILD SUCCESS。合计 43 例/0 失败/1 skip。

语句数断言核对（grep 79/78/76 字面）：`AccountErasureServiceTest` **没有任何 79/78/76 字面**——它的断言是结构性的（`assertEquals(INVENTORY.stream().mapToInt(t->t.statements().size()).sum(), result.statements())`，79 行：83 附近），随清单自动对齐、天然不漂；字面钉子在门上：`ErasureSurfaceAndOrderingGateTest` 的 `statementCount() >= 79`（含出处注释"76 → W1c 78 → R7-B 79"）+ 三类归因地板 40/22/4 + `named.size()>=50`。**判定：对齐成立，且是比字面更稳的形态**（AccountErasureServiceTest 若钉 79 字面，每次加表都要改两处）。

## 2. 发现（分级，≤8 条）

| # | 级 | 发现 | 处置建议 |
|---|---|---|---|
| F-1 | **P2** | **`admin_layer.admin_id` 三轴全盲**（表/列：`admin_layer.admin_id BIGINT NOT NULL`，V2026.10.13.0001）。为什么两轴都不捞：无归属列（`admin_id` 不在 16 名单也无 `*_user_id/*_author_id` 后缀）⇒ 第一轴派生不到；**无任何 FK**（DDL 自现网原样落盘，本就无 FK）⇒ 第二轴闭包走不到；`admin` 不是清单表名 ⇒ 第三轴不触发；表也不在清单、无豁免登记。语义=管理员↔圈层 RBAC 授权（活表：V2026.10.14.0005-0007 有 DML、有实体）。管理员注销后其授权行残留，`admin_id` 指向墓碑 | 按门族自己的纪律补登记：进 `NAMED_REFERENCE_TABLE_EXEMPTIONS` 类比 promo_codes（运营配置非主体数据），或并入 F-2 的"管理员指针族"批量豁免；不建议进清单删除（删授权不等权限回收语义） |
| F-2 | **P2** | **8 张平台配置表的 `updated_by` 三轴全盲**：`app_config / app_login_hero_config / app_rule / app_switch / chat_ai_feature_flag / legal_document / match_config / recommend_strategy`（均为 ALTER 补列、无 FK）。`_by` 后缀不在任何一轴派生谓词里（第一轴不认、第三轴只认 `_id`）。管理员注销后配置行留其 ID | 批量豁免登记（一句话理由可复用 promo_codes 口径：运营配置、指针解析到墓碑不识别）；或把 `*_by` 后缀并入第三轴触发词表（注意会同时命中 promo_codes.created_by——它有 FK 会被排除，安全） |
| F-3 | P3 | **第三轴列集只认 CREATE 体**（继承 F-11 归属列纪律），ALTER 补加的 `<清单表>_id` 形列对它不可见。现存的同类孔：`posts.auditor_id`、`circle_topics.auditor_id`、`media_asset.temp_session_id`——今天都靠"表恰好在清单"兜住，**一个都没被轴看见**；未来 `ALTER TABLE ops_x ADD COLUMN media_asset_id …` 会静默滑过 | 挂账：`namedReferenceHits` 的列源换成 ALTER 感知的 schema（`ErasureSchemaAlignmentTest.buildSchema` 已有该能力）或给 `ErasureMigrationGraph` 补 ALTER ADD COLUMN 摄取 |
| F-4 | P3 | **第三轴按精确列名匹配的实际泛化力=单点**：全库 162 个 `_id` 列只命中 1 个（清单表名复数 vs 引用列单数：`post_id→posts`、`conversation_id→private_conversations`、`activity_id→activities`、缩写 `temp_session_id→temp_chat_session` 全不匹配）。主控已认"覆盖度=列名约定"，本条把边界再收紧为"约定且须全称精确" | 如实登记边界；若要扩，考虑单复数归一或 `<表名>_id` 后缀包含匹配（注意误报面） |
| F-5 | P3 | **`joinTargetsOf` 对子查询借归属全盲**（轴 3 证伪）：`WHERE x IN (SELECT … FROM 被删表 …)` 形态不计入 borrowers，借方排序不再受检；地板 `borrowers>=1` 只护总量不护逐条。当前 79 条无子查询，属潜在缺陷 | 挂账：识别子查询内 `FROM <表>`，或判点注释显式声明"借归属必须用 JOIN 形态"并把该约定写进 `PersonalDataTables` 的 SQL 约定段 |
| F-6 | P3 | **管理员主体注销的语义不对称**（轴 4）：`deactivateAccount` 无角色门、管理员有密码 ⇒ 管理员自注销可达。届时 `temp_chat_media_holds.created_by/reason`、`reports.handler_id/handle_remark`、`posts/circle_topics.auditor_id`、8 张 config 表 `updated_by` 全部原样保留，而 `audit_log`（operator 轴）却会抹掉操作者手写载荷——同族先例不同向。E2 快照 holds=0 行 | 裁定建议见轴 4：hold 行保留成立，但把"管理员注销不处理 reason"登记进 rationale；远期按 audit_log 先例对称处理操作者手写文本 |
| F-7 | P3 | **回归命令陷阱**：`-Dtest='Erasure*'` 漏 `AccountErasureServiceTest`（Account 前缀）与 `PersonalDataErasureAlignmentTest`——按此命令收口会假报清除域全绿（22 例而非 43 例） | 门/文档里把清除域测试改为显式类清单或 `*Erasure*`（中缀）模式 |
| F-8 | info | `media_asset.hold_until`（举报取证保留）被 erasure 的 DELETE 无视——清单已写明"取证价值随素材消灭"，属已登记的政策选择；与"网络安全法日志留存"在 audit_log 上的让路逻辑并存，两表口径不同但各有 rationale，不判缺陷 | 无需处置；如取证需求升级，需重开裁定 |

**P1 结论：零条。** 对 APP 数据主体，三轴+清单+豁免账在本轮全库枚举下未发现漏删残留；真正的盲区集中在"管理员指针/运营配置"形状（F-1/F-2），其处置是登记而非删除。

## 3. 台账

| # | 动作 | 命令/文件 | 读数 |
|---|---|---|---|
| T1 | HEAD 核对 | `git rev-parse HEAD` | `f998762dfb00…7ff` ＝ f998762d ✓ |
| T2 | 三轴判点源读 | `ErasureSchemaAlignmentTest.java`（三轴+豁免表）、`ErasureSurfaceAndOrderingGateTest.java`（顺序/借归属/归因判点）、`ErasureMigrationGraph.java`（解析器） | 口径见 §0 表 |
| T3 | 解析器移植+枚举 | `node D:\6\tmp-r7e\enum-axis3.cjs` | 234 文件/117 表/64 边/78 归属表（=round-6 真值）；第三轴命中 1；_id 列 162、_by/uid 16；候选 97 |
| T4 | 运行时清单抽取 | jshell + javac(临时目录) | 86 项/79 语句/81 唯一表；`manifest-dump.txt` |
| T5 | DDL 对账 | `V2026.10.28.0012`、`V2026.07.24.0002`、`V2026.10.13.0001`、`V2026.06.25.0004`、`V2026.08.31.0001` | 轴 2 全项成立；盲区列见 F-1/F-3 |
| T6 | PREPARE 复刻 | `mysql --force < prepare-batch.sql`（零 EXECUTE） | **79/79 rc=0**，BATCH_END_OK；对照 1054/1146/1064 全炸；EXPLAIN 出计划 |
| T7 | 真库只读抽核 | `SELECT COUNT(*) FROM temp_chat_media_holds` | 0 行（EMPTY_WRITTEN 一致） |
| T8 | 回归 | `./mvnw -o -B test -Dtest='Erasure*'` | 22/0/0/1skip，BUILD SUCCESS（SchemaAlignment 9、Gate 13） |
| T9 | 回归补射程 | `-Dtest='AccountErasureServiceTest,PersonalDataErasureAlignmentTest'` | 18/0 + 3/0，BUILD SUCCESS（合计 43/0/1skip） |
| T10 | 语句数断言 | grep 79/78/76 | AccountErasureServiceTest 无字面（结构性断言，自对齐）；`>=79` 钉在 GateTest + 地板 40/22/4 |
| T11 | 写入面 | `git status`（审查前后无工作树改动；唯一新增=本报告）；脚本/产物在 `D:\6\tmp-r7e\` | 仓内零改动 ✓、git 零写 ✓ |

边界（判不出/未做）：PREPARE 不覆盖执行期约束（NOT NULL/FK 运行期冲突/触发器）与真回滚——与 round-6 同一天花板，需 DBA 影子库；F-1/F-2 的"该删还是该豁免"只给裁定建议，未动码；管理员自注销未实测发起（仅静态证实路径可达）。
