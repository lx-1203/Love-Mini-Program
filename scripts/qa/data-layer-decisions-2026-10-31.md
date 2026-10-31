# 数据层审计发现项处置记录（S3-A/B/C/D/E/F，2026-10-31）

同一台 MySQL 8.0.45、同一个 `campus_love`（127.0.0.1:3306）。
**本会话受单写者规则约束：禁止对 `campus_love` 做任何 DDL，也禁止 `flyway:migrate/repair/clean`。**
因此下面所有「after」都是【未执行】的，索引/新列尚未落库；给出的只有 before 实测
＋「同构机制在真实表形上的实测证明」。格式沿用 `index-impact-2026-10-30.md`。

---

## A. 迁移不可重放（半路挂掉后无法续跑）

### 决定谁能改：读 `flyway_schema_history`，不猜

```sql
SELECT version, success, checksum, installed_on FROM flyway_schema_history
 WHERE version IN ('2026.07.27.0003','2026.08.08.0003','2026.08.10.0032',
                   '2026.08.15.0004','2026.10.05.0001','2026.10.31.0002');
```

实测结果（228 行，`MAX(version)=2026.10.30.0004`）：

| version | success | checksum | installed_on | 可否改写 |
|---|---|---|---|---|
| 2026.07.27.0003 | 1 | 344968530 | 2026-08-26 12:16:04 | **禁止**（改了下次 migrate 必 checksum mismatch） |
| 2026.08.08.0003 | 1 | 1646119346 | 2026-08-26 12:16:10 | **禁止** |
| 2026.08.10.0032 | 1 | 1620200340 | 2026-08-26 12:16:12 | **禁止** |
| 2026.08.15.0004 | 1 | -236083192 | 2026-08-26 12:16:12 | **禁止** |
| 2026.10.05.0001 | 1 | 779773009 | 2026-10-09 03:25:39 | **禁止** |
| 2026.10.31.0002 | — 不在表里（0 行）— | | | **可改写**（PENDING） |

⇒ 6 个文件里**只有 1 个**能改：`V2026.10.31.0002__add_outbox_dedup_key.sql`。
其余 5 个保持原样，改由新增的 forward 迁移收敛。

### 已做的改动

1. **改写 `V2026.10.31.0002`**（版本号与文件名不变）：`ALTER → UPDATE → CREATE UNIQUE INDEX → CREATE INDEX`
   四条语句全部包进 `information_schema` 守卫的存储过程里，半路重放收敛到同一终态。
   回填 `UPDATE` 原本就带 `WHERE dedup_key IS NULL`，未改。
2. **新增 `V2026.10.31.0003__converge_legacy_nonidempotent_schema.sql`**：
   把上述 5 个不可改写文件的 **DDL 终态**（promo_codes 两列 / users.uk_users_phone /
   interest_circles.category / official_messages 两列 / media_asset.category +
   idx_media_asset_category）以 guarded 形态重述一遍。在本 dev 库上是 **no-op**
   （实测这些列/索引都已存在），在半路失败的其它环境上把缺的补齐 —— 这就是「resumable」的落点。
   * 该迁移**不重放任何 DML**：`promo_codes.remaining_uses = max_uses - used_count` 今天再跑会
     凭空多发兑换码；official 账号合并的 UPDATE 会覆盖运营后来手改的文案。
     DML 侧只能靠「不再重放」保证。
   * **不为 `vip_red_packets` 补列**：该表已被 `V2026.08.09.0006__remove_red_packet.sql`
     正式 DROP（实测 `information_schema.TABLES` 0 行、Java 0 引用），补列等于复活死表。
     副作用登记：`V2026.07.27.0003` 如今**连语法上都无法重放**
     （ALTER 不存在的表 ⇒ 1146），不只是 Duplicate column。
   * **不引入 `R__` repeatable**：231 个文件全是 `V*`；R__ 会改变执行次序模型
     （每轮 migrate 在全部 V* 之后重跑），超出本发现项范围，留给协调会话。
3. 所有新迁移一律用仓内既有 guarded 口径（`DROP/CREATE PROCEDURE` + `CALL` + `DROP`，
   见 `V2026.07.26.0002`），结构自检：3 个文件均 `BEGIN=1 / IF==END IF / DELIMITER=2 / CALL=1`。

---

## B. 最热读路径在无索引列上排序

### before（实测）

```sql
EXPLAIN FORMAT=TREE SELECT p.id FROM posts p
 WHERE p.status='active' AND p.audit_status='approved'
 ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 10;
```
```text
-> Limit: 10 row(s)  (cost=22.4 rows=10)
    -> Sort: p.is_pinned DESC, p.created_at DESC, limit input to 10 row(s) per chunk  (cost=22.4 rows=206)
        -> Filter: ((p.audit_status = 'approved') and (p.`status` = 'active'))  (cost=22.4 rows=206)
            -> Table scan on p  (cost=22.4 rows=206)
```
```text
| type | possible_keys                       | key  | rows | filtered | Extra                       |
| ALL  | idx_posts_audit_status,idx_posts_status | NULL |  206 |    94.20 | Using where; Using filesort |
```

```sql
EXPLAIN SELECT u.id FROM users u
 WHERE (u.nickname LIKE '%张%' OR u.campus_name LIKE '%张%')
   AND u.status='active' AND u.role='USER'
 ORDER BY u.profile_completion DESC, u.created_at DESC LIMIT 20;
```
```text
-> Limit: 20 row(s) (cost=9.67 rows=20)
    -> Sort: u.profile_completion DESC, u.created_at DESC  (cost=9.67 rows=139)
        -> Filter: ((u.`status`='active') and ((u.nickname like '%张%') or (u.campus_name like '%张%')))
            -> Index lookup on u using idx_users_role (role='USER')  (cost=9.67 rows=139)
```
```text
| type | key            | key_len | ref   | rows | filtered | Extra                       |
| ref  | idx_users_role | 66      | const |  139 |    20.99 | Using where; Using filesort |
```
`posts` 现有 9 条二级索引，**无一含 `is_pinned`**（实测 information_schema）。
`users.role` 实测取值 USER 139 / GUEST 259 / ADMIN 4 / SUPER_ADMIN 1 / AUDITOR 1，
`status` 全 active ⇒ `idx_users_role` 的 ref 实际接近一次 139/404 行的窄扫描。

### 机制证明（用**已存在**的索引在**同一批真实表**上跑，代替无法执行的 after）

```sql
-- 等值前缀 + 排序后缀，索引已存在：
EXPLAIN SELECT p.id FROM posts p WHERE p.category='all' AND p.status='active'
 ORDER BY p.created_at DESC LIMIT 10;
| ref | idx_posts_category_status_created_at | rows=3 | Extra: Backward index scan; Using index |  ← 无 filesort
```
⇒ 「WHERE 等值列 + ORDER BY 列同处一条索引」在本表真实表形上确实免排序。

```sql
-- 单列排序索引救不了两列 ORDER BY（users 已有 idx_users_profile_completion）：
EXPLAIN SELECT u.id FROM users u ORDER BY u.profile_completion DESC, u.created_at DESC LIMIT 20;
| ALL | key=NULL | rows=404 | Extra: Using filesort |   ← 必须建复合索引
```

```sql
-- 分页 tiebreaker 的方向敏感性（InnoDB 二级索引隐含 ASC 主键尾，反读时一起反读）：
ORDER BY created_at DESC, id DESC → Backward index scan; Using index   ← 免排序
ORDER BY created_at DESC, id ASC  → Using index; Using filesort        ← 立刻退化
（同样结论在 idx_posts_author_created_at、idx_users_profile_completion 上复现）
```
⇒ 结论：索引列**全 ASC 声明、不带显式 id 列**，配 `ORDER BY … , id DESC`（同方向），
是实测唯一能免排序的组合；把列写成 DESC 或把 `id ASC` 当尾巴都会招回 filesort。

### 新增（`V2026.10.31.0004`，待 apply）

```sql
CREATE INDEX idx_posts_feed_pin_created        ON posts (status, audit_status, is_pinned, created_at);
CREATE INDEX idx_users_search_completion_created ON users (role, status, profile_completion, created_at);
```

### after —— **NOT VERIFIED**

本会话禁止 DDL，索引未落库，**没有 after 计划可给**。
并且诚实说明：**206 行的 posts / 404 行的 users 太小，优化器很可能仍选全表扫**，
apply 后若看到 `Using filesort` 或没走新索引，**这不算反驳**，要在生产量级库上重判；
那时仍不选就删掉这两条索引。索引的正当性来自上面的 ORDER BY 前缀规则与四条实测，
不是编造的 rows/cost 改善。`is_pinned` 实测 205 行=0 / 1 行=1，作为过滤器毫无价值，
只作为排序首列有意义。

apply 后请重跑（与 before 逐字同一条 SQL）：

```sql
EXPLAIN FORMAT=TREE SELECT p.id FROM posts p WHERE p.status='active' AND p.audit_status='approved'
 ORDER BY p.is_pinned DESC, p.created_at DESC, p.id DESC LIMIT 10;
EXPLAIN SELECT u.id FROM users u WHERE (u.nickname LIKE '%张%' OR u.campus_name LIKE '%张%')
 AND u.status='active' AND u.role='USER'
 ORDER BY u.profile_completion DESC, u.created_at DESC, u.id DESC LIMIT 20;
```

---

## C. `datetime` 精度漂移：判定 = **不做批量改类型**，改为「消除不确定性 + 钉住时区 + 登记」

实测（`information_schema.COLUMNS`，`TABLE_SCHEMA='campus_love'`）：
`datetime(0)` **204 列**、`timestamp(0)` **8 列**，另有 **1 列 `datetime(6)`**
（`official_chat_messages.created_at`）—— 精度本来就已经不一致，没有「统一真相」可回去。

8 个 timestamp 列：`flyway_schema_history.installed_on`、`payment_callback_log.created_at`、
`user_wallet.created_at/updated_at`、`users.geo_updated_at`、`vip_billing_log.created_at`、
`wallet_transaction_log.created_at/updated_at`。

### 为什么不选「全部归一到 datetime(3)+」

`datetime(0) → datetime(3)` 是**列类型变更**，InnoDB 走 COPY 重建表，
204 列 × 各自的表 = 一轮全库重写；且按 A 的结论它**必须逐列 guarded**才可续跑，
体积和风险都远超一个审计修复轨能负责的范围。在没有生产量级验证窗口前做它，
是用「一致性好看」换「一次失败的迁移把链条卡死」。

### 实际做了什么

1. **真正的用户可见缺陷是分页不确定性，不是精度本身**：`posts.created_at` 是 `datetime(0)`，
   同秒写入被截断 ⇒ 排序键不唯一。实测本表**恰好 1 组 tie**：
   `SELECT created_at, COUNT(*) FROM posts GROUP BY created_at HAVING COUNT(*)>1`
   → `2026-10-26 17:20:47`，**6 行**（其余全部唯一）。
   ⇒ 修法：**给 ORDER BY 追加同方向唯一尾巴**，与精度无关、无需 DDL：
   - `PostRepository.findVisiblePosts`（:689）与 `findVisiblePostsByCategory`（:733）
     → `ORDER BY p.isPinned DESC, p.createdAt DESC, p.id DESC`
   - `UserRepository.searchByKeyword`（:315）→ `…, u.id DESC`
   尾巴方向按 B 的实测结论取 `DESC`（`ASC` 会把免排序打成 filesort）。
2. **混合存储判定为「当前安全」，并给出可复核的依据**：
   - **没有任何查询路径跨两类时间排序/比较**：timestamp 只出现在 4 张资金表 +
     `users.geo_updated_at` + flyway 自身；它们各自单独 ORDER BY，
     从不与 `posts/notifications/private_messages` 的 datetime 出现在同一个 ORDER BY、
     同一个 UNION 或同一个比较里（资金表读路径见 `WalletTransactionLogRepository`
     `findByUserIdOrderByCreatedAtDesc`、`VipBillRepository` 等，均表内自序）。
   - **JDBC 会话时区是钉住的**：`application-real.yml` 与 `docker-compose.yml` 的
     API/Flyway 连接串均带 `serverTimezone=Asia/Shanghai`；API 容器带
     `-Duser.timezone=Asia/Shanghai`；mysql 容器带 `TZ: Asia/Shanghai`；
     业务代码统一走 `TimeZones.BUSINESS = Asia/Shanghai`。
     实测服务端 `@@global.time_zone=SYSTEM` / `@@session.time_zone=SYSTEM`，
     `@@system_time_zone` = China Standard Time（UTC+8，**无 DST**）。
     ⇒ 两者相差恒定 0 偏移，timestamp 的会话换算当前不产生位移。
3. **风险登记（这条才是给运维的真正提醒）**：安全结论**依赖上面那 4 处 TZ 配置同时成立**。
   `@@global.time_zone=SYSTEM` 意味着它跟的是 OS/docker 的 TZ；
   一旦容器基础镜像改成 `TZ=UTC`（官方镜像的常见默认）或做过一次跨时区 dump/restore，
   4 张资金表的 `timestamp` 会整体位移 8 小时，而 `datetime` 的社会时间线不动 ——
   表现就是「钱的时间和水口时间对不上」。**不要把这类改 TZ 的变更和发版混在一起做。**
   复核命令（只读）：
   ```sql
   SELECT @@global.time_zone, @@session.time_zone, @@system_time_zone, NOW();
   SELECT DATA_TYPE, DATETIME_PRECISION, COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='campus_love' AND DATA_TYPE IN ('datetime','timestamp')
    GROUP BY 1,2;
   ```
4. **禁止顺手改这四张资金表的列类型**：它们同时是 F 里「绝对不得清理」的表。

---

## D. 软删除口径不一致 —— 精确活数据

| 判据（实测 campus_love） | 数值 |
|---|---|
| `posts` 总数 / `status='deleted'` | 206 / **5**（id 428–432） |
| 这 5 行的 `likes_count` | **全为 0** |
| `post_likes` JOIN 这 5 行 | **0 行** |
| `comments` JOIN 这 5 行 | **0 行** |
| `post_likes` 全表 / `comments` 全表 | 47 / 1127 |
| 受影响作者数 | 5 |
| `media_asset` 总数 / `deleted_at IS NOT NULL` | 1384 / **0** |

⇒ **诚实读法**：两个缺陷在**代码**上是真的，但在**当前活数据上的净影响是 0**：
「公开获赞数被已删帖虚增」目前一列都没涨（5 篇墓碑帖获赞与评论均为 0），
「已删媒体仍可解析」也没有行可解析。**不能拿这个当不修的理由**——
它是零存量、非零概率的口径漏洞，第一篇带赞的帖子被删就会显形。

### 改动

* `PostRepository`：新增 `findByAuthorIdAndStatusNot`；
  `ProfileQueryService.calculateTotalLikesCount`（公开主页总获赞数）改用它并传 `PostStatus.deleted`。
* **墓碑有意可读，点名调用方**：
  `findByAuthorId`（不过滤）保留给 `PersonalDataService.postCategory`
  （本人数据查阅导出，PIPL 数据主体访问权，其注释本就写明「含已删除」）
  与 `UserProfileController.buildPosts(isSelf=true)`（作者本人视角）。
* `MediaAssetRepository`：展示读入口全部改成 `…AndDeletedAtIsNull`
  （`findByUrlInAndDeletedAtIsNull`、`findByUserIdAndTypeAndDeletedAtIsNull`、
  `findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc`、`findByUrlAndTypeAndDeletedAtIsNull`），
  `MediaAssetService.findByUrls/findByUrl` 改用之，并保留服务侧
  `deletedAt == null` 的第二道防线。
  `MediaAccessController.getAppAsset` 的门也补了过滤（门只会因此更严，方向安全）。
* **`findByUrlIn` 故意保持不过滤**，两个具名调用方：`MediaAssetService.deleteByUrl`
  （物理清理必须看见墓碑，否则墓碑行永久残留）与
  `MediaAccessService.resolveAccessProfile`（分类逻辑「只收紧不放松」，
  丢掉已登记行会把 `ID_CARD` 放松成 `IMAGE` 档）。
  `searchForAdmin` 同样**故意保留**墓碑，调用方 `AdminMediaAssetController`
  列表 + `RealAdminStatsService` 待审计数（后台取证视角）。
* 顺带更正审计的一处归属：`MediaAssetRepository.findByUserIdAndType` 与
  `findByUserIdOrderByCreatedAtDesc` **在 main 里没有任何调用方**（实测 grep），
  所以活体泄漏面只有 `findByUrlIn` 一条。两个死方法仍加了过滤保留 —— 删掉不等于修好。

### 测试（两层，且做了变异验证）

`apps/api/src/test/java/com/campuslove/api/media/MediaAssetSoftDeleteReadPathTest.java`
* 调用层（Mockito verify/never）＋ 派生查询层（Spring Data `PartTree` 解析方法名，
  **整张 `MediaAssetRepository` 扫描 + 具名例外白名单**：新增读方法不过滤即红）。
* `ProfileQueryServiceTest` 新增 `calculateTotalLikesCount_excludesDeletedPostTombstones`。
* **变异验证明文结果**：把过滤去掉后
  `9 tests → 3 failed`（调用层 2 + 整表扫描 1）；
  把 `findByAuthorIdAndStatusNot` 改回 `findByAuthorId` 后
  `16 tests → 2 failed`。恢复后 `9/9`、`16/16` 全绿。
  变异只在 `/tmp` 的副本上做，仓库文件未被改动。

---

## E. N+1 幸存者 `generateSocialDigest`：确认是死代码，**已删除**

* 复核：`grep -rn "generateSocialDigest" apps/ tests/` 只命中接口声明与两个实现自身；
  `grep -rn "PushSummaryService" apps/ tests/` 同样只命中 `growth/` 包内的
  接口 + `MockPushSummaryService` + `RealPushSummaryService`，
  **没有任何 Controller / Service / `@Scheduled` 注入该类型**。
* 它正是 N+1 的唯一来源：逐帖各发一次 `postLikeRepository.countByPostId` 与
  `commentRepository.findByPostIdOrderByCreatedAtDesc`（后者返回**无界** `List<Comment>`，
  只为在内存里数 24 小时内的条数）。
* ⇒ 删掉接口方法 + 两个实现 + `RealPushSummaryService` 里因此失去用户的
  5 个 Repository 依赖（Visitor/Like/Post/PostLike/Comment）与相应 import；
  顺带带走了对不过滤墓碑的 `findByAuthorId` 的一次调用。
  给死代码建索引不是优化，是浪费。
* **未一并删** `generateRecommendRefresh` / `markSent`：它们同样零调用方，
  但那属于「订阅消息推送链路是否还要做」的产品决定，已作为待决项上报，不在本轨擅自拍板。
* `push_summaries` 实测 **0 行**，删除无数据影响。

---

## F. 留存清理：只有一条是可辩护的，其余登记为**决定**而非缺口

| 表 | 实测行数 | 判定 | 依据 |
|---|---|---|---|
| `error_reports` | 721 | **清理 >180 天** | 纯运维遥测：`ErrorReportController` 只有 POST，`ErrorReportRepository` 此前**没有任何读路径**，无人消费又含用户端文本，留着只有害处；180 天覆盖一轮缺陷排查周期 |
| `audit_log` | 520 | **不得自动清理** | 管理员问责链 + 法定留存（《网络安全法》第二十一条要求网络日志留存**不少于六个月**；PIPL 处理留痕靠它举证）。自动删除 = 销毁合规证据。要控体量只能走**归档**（导出到冷存储后再删），需独立审批与校验，不在本轨 |
| `private_messages` | 6593 | **不得自动清理** | 用户通信内容。静默到期删除改变用户可见记录（产品/合规决定，非运维决定）；举报与纠纷需原文取证；隐私最小化由**用户主动删除 + 注销级联**实现。需要上限应做成会话级 TTL 并在产品侧公示 |
| `notifications` | 1830 | **不得自动清理** | 读取回执与权益发放（签到/VIP/支付）凭据；删掉后「我没收到通知」类申诉无法自证。体量可控且已有 `idx_notifications_user_read_created` |
| `interaction_events` | 139 | **不得自动清理** | 不是匿名埋点：`RealInteractionEventService` 按用户分页把它当**用户可见互动列表**读。139 行也不支持现在动手 |
| `profile_visitors` / `visitors` | 0 / 2693 | **不得自动清理** | 「谁看过我」是产品功能数据本身，不是日志；profile_visitors 为 0 行，给没数据的表写清理任务只加风险 |
| `user_wallet` / `wallet_transaction_log` / `vip_billing_log` / `payment_callback_log` | — | **绝对不得清理** | 资金流水与支付回调凭证 = 对账/争议重放的唯一依据；也正是 C 里唯一的 timestamp 表，别顺手改类型或加清理 |

实现：`apps/api/src/main/java/com/campuslove/api/report/ErrorReportRetentionService.java`
（`@Profile("real")`，每日 04:20，与实名照片清理 04:30 错峰；Redisson 锁 +
看门狗续期 + 失败不删；开关 `app.retention.error-report-days`，默认 180，≤0 关闭）。
`ErrorReportRepository.deleteByCreatedAtBefore` 走批量 JPQL DELETE
（不把 stack 文本灌进持久化上下文），命中已有的 `idx_error_reports_created_at`
⇒ **无需为清理新建索引**（实测 6 张候选表的 created_at/visited_at 索引均已存在）。

---

## G. 迁移链复现不出【当前代码正在读写】的 schema（2026-11-01 补，含活库读数）

发现方式：新写的 `apps/api/.../privacy/ErasureSchemaAlignmentTest` 把注销清单的表名/列名
逐条对到「按版本顺序重放整条迁移链」得到的列集上。它先是报出 6 条，修掉解析器两处
形态错（幂等 DDL 写在 `PREPARE` 字符串里；`ADD COLUMN x JSON DEFAULT (JSON_ARRAY())`
被当成列清单）后，剩下 4 条里 1 条是清单自己写错，3 条是链缺 DDL。

| 对象 | 现网库（information_schema 只读实测） | 迁移链 | 判定 |
|---|---|---|---|
| `users.circle_path` | `varchar(256) NULL`，存在 | **无任何 DDL 创建**，只有 V2026.10.14.0005/0006/0007 的 UPDATE/WHERE 引用 | 链缺，已补 |
| `posts.owner_circle_path` | `varchar(256) NULL`，存在 | 同上（0005 里多处 CASE 更新） | 链缺，已补 |
| `comments.owner_circle_path` | `varchar(256) NULL`，存在 | 同上（0006:67 引用） | 链缺，已补 |
| `heart_signals.match_id` | **不存在**（该表列集：id/user_a_id/user_b_id/match_type/expires_at/status/created_at/updated_at/version） | 也不存在 | 清单凭空声明，已删 |

**为什么这是缺陷而不是「历史包袱」**：这三列不是死列。`AdminScopeService` 的管理范围轴、
`AdminPostController` 的圈层子树过滤、`User#circlePath` 实体映射都靠它们；
注销清单的匿名语句 `UPDATE posts SET ... owner_circle_path = NULL ...` 也写它们。
⇒ 任何「只跑 Flyway 链」的库（CI 的 `campus_love_fresh`、新环境首次部署）
会在 `V2026.10.14.0005` 报 `Unknown column 'circle_path'` 中断，
而 `ddl-auto: validate` 排在失败点之后，救不回来。
与 `V2026.10.13.0001`（circle_layer/admin_layer 两张表只有 DML 没有 DDL）同一成因：
现网 schema 是从 `database/backup/*.sql` 转储带外进来的。

**处置**：新增 `V2026.10.13.0002__add_circle_axis_columns_to_users_posts_comments.sql`
（编号即修复的一部分：必须排在引用方 2026.10.14.0005 之前）。列定义按现网逐列对齐，
不补索引（现网也没有引用这三列的索引，补索引等于引入新的 schema 事实）。
幂等沿用本仓既有形态（`SET @has_col` + `IF` + `PREPARE/EXECUTE`）。

**活库验证（2026-11-01，凭据只在环境里，不打印）**：

```
flyway:info     → Schema version: 2026.10.31.0004
                  2026.10.13.0001 Ignored / 2026.10.13.0002 Ignored（低版本 pending，按配置跳过）
flyway:validate → Successfully validated 233 migrations
flyway:migrate  → BUILD SUCCESS（存量库无待应用项；存量库本来就有这三列，即便应用也是 no-op）
```

**清单项 `heart_signals.match_id` 的处理**：直接从 `identifyingColumns` 删掉
（该表没有这一列，SQL 也没用到它，只有声明在骗人）。`temp_chat_session.match_id`
是真的存在（`TempChatSession#matchId`），未动。

## NOT VERIFIED（本会话能力边界，逐条写明原因）

1. ~~**三条迁移从未执行**~~ → **已执行**（2026-10-31 主控，`./mvnw flyway:migrate` 单写者路径，
   迁移前已在仓库外做整库 mysqldump 备份）：3 条全部成功，schema 到 v2026.10.31.0004，
   `DELIMITER`/存储过程在 Flyway 10.10.0 下解析正常。执行过程另外暴露并修掉一处
   由主控自己引入的回归，见文末。
2. ~~**B 的 after EXPLAIN 不存在**~~ → **已补齐，见文末「2026-10-31 主控执行记录」**：
   三条迁移已由主控单写者真跑落库，两条查询的 filesort 都消失了。
   小表下优化器【确实】走了新索引，原先"可能仍 filesort"的顾虑在本库尺寸上不成立。
3. ~~**新迁移在 Flyway 真实运行器下的通过性**未验证~~ → 已验证：`V2026.10.31.0003`
   在已应用库上确实 no-op（0.569s 内三条一起跑完，无 1060/1146），"推断"升级为"执行结果"。
4. **完整 feed JPQL 的执行计划**未验证：真实查询还带 `visibility` 的 OR + 3 个 `EXISTS` 子查询，
   优化器可能因此不走新索引。B 的实测是在审计给定的简化 SQL 形态上做的。
5. **Java 改动只做了编译 + 单元测试**（`javac` 直连 `target/cp.txt`，未走 Maven）：
   全部改动文件 `javac` 0 错误；`MediaAssetSoftDeleteReadPathTest` 9/9、
   `ProfileQueryServiceTest` 16/16 通过，并含变异验证。
   **未跑**完整测试套（Maven 禁用），故其它模块是否引用被改名/删除的方法未全量证明
   （已逐个 grep 确认 `findByUrlAndType`、`findByUserIdAndType`、
   `findByUserIdOrderByCreatedAtDesc`、`generateSocialDigest` 无残留调用方）。
6. **DB 级软删除证明缺失**：本仓无 H2/`@DataJpaTest` 基建，新测试证明的是
   「派生查询会生成带软删除条件的 SQL」，不是「库里已删行确实查不出来」；
   后者需 CI 的 db-integration job 在真库上补。
7. **F 的清理任务从未运行**（无 real profile DB）。删除行数、锁行为、cron 触发均未验证。
8. `MediaAccessService` 过滤/保留墓碑对**访问档位**的影响只做的是方向性论证
   （保留 = 不放松），没有端到端授权矩阵测试覆盖。
9. `V2026.10.31.0002` 若某行 `payload_json` 为 NULL，`CONCAT` 会算出 NULL 键，
   该行永远停留在「未回填」状态（唯一索引允许多个 NULL，不报错）。
   这是**原文件既有行为**，本次未改，登记备查。
