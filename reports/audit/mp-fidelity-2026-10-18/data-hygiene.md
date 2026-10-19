# R6 数据治理 · 取证残留真删 + 真实演示数据（2026-10-19）

范围：只动 MySQL 数据面。git 一律未碰；`apps/client/src/static/**`、前端源码、`scripts/qa/*` 既有门均未改。
后端全程 `--spring.profiles.active=real` 运行中未重启，`GET /actuator/health` = `{"status":"UP"}`。
凭据纪律：口令只出现长度或前 4 位，一律经 `MYSQL_PWD` / 环境变量传入，不进命令行。

---

## 0. 凭据实测更正（重要）

任务书给的后台超管口令（len=11，前缀 `Admi`）**已失效**，实测 `POST /v1/auth/admin/login` 返回 401「管理员账号或密码错误」。
实际可用的是 `.env` 里的 `ADMIN_LOGIN_PASSWORD`（len=18，前缀 `22Be`，注释标注轮换于 2026-10-14）。
本文按纪律不落完整凭据。openid `local-dev-admin-openid-123456` 正确，`auditorId` 回读 = `100000`。

另实测：`/v1/auth/admin/login` 也要求 `Idempotency-Key` 请求头，缺失直接 422「缺少 Idempotency-Key 请求头」。

---

## 1. 盘点（只读，删前）

识别线索取自实测串文，不是猜的词表。用户可见字段：`posts.title/content/tags`、`comments.content`、
`post_tags.tag_name`、`campus_topics.title/content/tags`、`campus_topic_replies.content`、
`circle_topics/circle_replies`、`activities`、`daily_questions`、`icebreaker_topics`、`official_messages`、`users.nickname/bio`。

### 1.1 判定为真残留（本轮删除，共 758 行）

| 表 | 判定依据（模式） | 行数 | id 范围/代表行 |
|---|---|---|---|
| posts | `title LIKE 'G8取证%'`；摘要「G8 端到端取证帖 2610171341，用于验证 客户端写→后端落库→后台读→」tag `["g8"]` | 93 | 231–310, 341, 345, 352, 356, 360, 364, 369, 373–378, 382, 387, 391 |
| posts | `title LIKE 'E2E-SYNC-VERIFY%'`；摘要「E2E-SYNC-VERIFY 端到端同步验证内容，可安全删除。」tag `["e2e"]` | 1 | 230 |
| posts | `title LIKE 'QA自检%'`；摘要「QA自检-lane-ui2」 | 1 | 286 |
| posts | `title LIKE '后台发布验收<13位ts>%'`；摘要「这是一条由后台校区管理员发布的验收帖，时间戳 17919…」tag `["后台验收"]` | 25 | 311, 313, 318–321, 328–338, 342, 346, 353, 357, 361, 365, 367, 370, 379, 383, 388, 392 |
| posts | `title LIKE '浏览器验收帖<13位ts>%'`；摘要「这条由后台「发布内容」页在浏览器里真实提交，用于验证发帖闭环」 | 22 | 312, 314–317, 327, 331, 335, 339, 343, 347, 354, 358, 362, 366, 368, 371, 380, 384, 389, 393 |
| posts | `title LIKE '设备腿验收 DEVSYNC<ts> 这条帖%'` | 20 | 322–326, 332, 340, 344, 348–351, 355, 359, 363, 372, 381, 385, 386, 390 |
| posts | `title LIKE 'QAFID-R2b%'`；摘要「QAFID-R2b-20261018T191444：客户端写→后台读→删除→计数」tag `["qafid"]`，status=deleted | 3 | **394, 395, 396** |
| comments | `content LIKE 'G8 取证评论 <ts>%'` / `E2E-SYNC-VERIFY comment` | 91 | 1201–1291（全部挂在上述帖下） |
| post_tags | `tag_name IN ('g8','e2e','qafid','后台验收')` | 121 | 152–272 |
| post_likes | 外键子表（`post_id` → 取证帖） | 91 | 按父表 id 集合删除 |
| post_favorites | 外键子表 | 1 | 按父表 id 集合删除 |
| post_shares | 外键子表 | 0 | — |
| post_view_history | 外键子表 | 120 | 按父表 id 集合删除 |
| campus_topics | `title LIKE 'G8取证%'`；摘要「G8 端到端取证帖 …」 | 85 | 233–329 段内 |
| campus_topic_replies | `content LIKE 'G8 取证匿名回复 <ts>%'`（表内 84 行全是，100% 残留） | 84 | 1–84 |
| **合计** | | **758** | posts 165 + comments 91 + post_tags 121 + post_likes 91 + post_favorites 1 + post_view_history 120 + campus_topics 85 + campus_topic_replies 84 |

取证帖状态构成：165 行中 `status=active` 122 行、`status=deleted` 43 行（含 394/395/396）。
→ 用户投诉属实：后台 `village-posts` 不带 status 过滤时 total 一直在把 43 行软删帖算进去。

### 1.2 UNCERTAIN，本轮**保留未动**（共 16 行 + 1 个素材文件名）

分解：posts 190–195（6）+ posts 281/282（2）+ circle_replies 43（1）+ users 100152/100153/100154/100155/100156/100158（6）
+ users 100000（1，后台登录号，卫生门里已按 role 排除）= 16 行；另有 `assets/images/posts/post-placeholder.jpg` 素材名 1 个。

| 对象 | 摘要（截 40 字） | 为什么拿不准 | 处置 |
|---|---|---|---|
| posts 190–195（6 行） | 「喜欢图书馆的下午和操场晚风，有一起自习的朋友吗？」等 | 正文是真人文案；命中只因 `audit_remark` 写着「2026-10-14 数据归真：作者行不存在…归入环境与测试账号」。`audit_remark` 是**后台侧治理字段，用户看不见**，且这 6 行 `status=hidden` 本就不外露 | 保留。要清的是 remark 措辞，不是数据 |
| posts 281, 282 | title=content=`123456` | 整字段纯数字，显然是手敲垃圾，但不在用户裁定的取证模式内 | 保留，进门白名单 PENDING_RULING |
| circle_replies 43 | content=`123456` | 同上（作者 100158） | 保留，PENDING_RULING |
| users 100152 验收君 / 100153 模拟器验收 / 100154 QA-E2E-User / 100155 UI验收用户 / 100156 Pair-QA-B | 昵称即串文 | 5 个号 0 帖 0 评论，但 `interaction_events/likes/user_device_session/social_progress/post_draft/private_messages/user_agreement_consent` 里有它们的行（100152–155 实测 7+2+1+1+2+4+4+4 行）；删号 ≠ 删内容，会波及认证/会话链路 | 保留，PENDING_RULING。100154、100156 会被卫生门正则抓到 |
| users 100158 曦风QA链 | 昵称含 QA | 同上，且是上面 3 行数字垃圾的作者 | 保留，PENDING_RULING |
| users 100000 超级测试账号 | 昵称含「测试」，role=SUPER_ADMIN | **这就是后台登录用的号**（auditorId 回读 100000），删了整个后台进不去 | 保留。卫生门里用 `role <> 'SUPER_ADMIN'` 显式排除 |
| assets/images/posts/post-placeholder.jpg | 帖子#198 引用了这个素材名 | 素材逐字节托管、HTTP 200 正常出图；改文件名要动 `apps/client/src/static/**`（禁地），改图片没有可用的帖子 PUT/PATCH 接口（`VillageController` 只有 POST/GET/DELETE history） | 保留，卫生门 ALLOW 白名单，记为 P2 待办 |

`circle_topics` / `circle_replies` / `activities` / `daily_questions` / `daily_answers` / `icebreaker_topics` /
`official_messages` / `media_asset` 用同一套模式扫，命中 **0** 行（干净）。

---

## 2. 394/395/396 现状确认 + 本轮之后新增的 QA 行

删前实读：`id=394,395,396`，三条全部 `status=deleted`、`category=interest`、`author_id=100151`、
`tags=["qafid"]`、`content=QAFID-R2b-20261018T191444/191723/191822：客户端写→后台读→删除→计数`，
created_at 分别是 `2026-10-19 03:14:44 / 03:17:24 / 03:18:22` —— 与 `database/backup/qafid-R2b-*.sql`
四个备份件的时间戳逐一对应（191408 那次没落库，只有三个 191444/191723/191822 的落库成功）。

同批（上一程"证'删得掉'"）新增并留存的 QA 行：394/395/396 之下还挂着 comments、post_tags、post_likes、
post_view_history 子行；`posts` 里 391（G8取证2610181308）、392（后台发布验收…deleted）、393（浏览器验收帖…）
是 2026-10-18 那一批，一并判为残留删除。

删后复核：`SELECT COUNT(*) FROM posts WHERE id IN (394,395,396)` = **0**。

---

## 3. 备份（删前）

命令：`mysqldump --no-tablespaces --single-transaction --default-character-set=utf8mb4 campus_love posts comments post_tags post_likes post_favorites post_shares post_view_history campus_topics campus_topic_replies users`，口令经 `MYSQL_PWD`。

| 件 | 字节 | 校验 |
|---|---|---|
| `D:\6\恋爱小程序\database\backup\qafid-R6-20261019T130124.sql` | **457,698** | 10×CREATE TABLE，9×INSERT，含 `取证` 原文，`-- Dump completed on 2026-10-19 21:01:24` |
| `D:\6\恋爱小程序\database\backup\qafid-R6-20261019T130104.sql` | 457,384 | 同一时刻的早 20 秒副本，也完整（首跑因缺 `--no-tablespaces` 对 stderr 报 `PROCESS privilege` 警告，但 dump 本体完整）。留着不删，以免"删备份"变成新风险 |

路径方言按上一程教训实测过：`existsSync('D:\\6\\恋爱小程序\\database\\backup\\…')` = **true**（原生形式，不是 `/d/…`）。

---

## 4. 预演（事务内 ROLLBACK）

`START TRANSACTION` → 删 → `SELECT ROW_COUNT()` → `ROLLBACK`，脚本 `tmp/r6-rehearsal.sql`（临时表 `CREATE TEMPORARY TABLE` 不触发隐式提交，预演安全）。

| 步 | 预演 ROW_COUNT() | 与第 1 步盘点 |
|---|---|---|
| post_view_history | 120 | 一致 |
| post_shares | 0 | 一致 |
| post_favorites | 1 | 一致 |
| post_likes | 91 | 一致 |
| post_tags | 121 | 一致 |
| comments | 91 | 一致 |
| posts | 165 | 一致（`r6_forensic_posts`=165） |
| campus_topic_replies | 84 | 一致（`r6_forensic_topics`=85） |
| campus_topics | 85 | 一致 |
| 预演内余量 | posts_remaining=185，campus_topics_remaining=165 | — |
| ROLLBACK 后 | `posts_after_rollback`= **350**（回到原值） | 预演确认未落库 |

外键顺序（由 `information_schema.KEY_COLUMN_USAGE` 实测）：`posts` ← `comments / post_favorites / post_likes / post_shares / post_tags / post_view_history`；`campus_topics` ← `campus_topic_replies`。先子后父。

---

## 5. 真删与复量

同谓词、同顺序，把 `ROLLBACK` 换成 `COMMIT`。**九步 ROW_COUNT 与第 4 步预演逐条完全相同**（120/0/1/91/121/91/165/84/85），verdict=`DELETES_COMMITTED`。

删后 DB：`posts`=185（active 179 + hidden 6），`campus_topics`=165，`campus_topic_replies`=0。
残留复扫全部为 0：residual_posts 0 / residual_comments 0 / residual_post_tags 0 / residual_campus_topics 0 / residual_campus_replies 0。
**孤儿复扫全部为 0**：orphan_comments / orphan_post_tags / orphan_post_likes / orphan_post_view_history / orphan_campus_topic_replies = 0。

接口复量（删后、造数据前）：

| 读数 | 删前 | 删后 | 是否回原 |
|---|---|---|---|
| 后台 `GET /v1/admin/forum/village-posts`（不带 status） | total=350 | **total=185** | 350−165=185 ✅ |
| 后台 同上 `status=deleted` | total=43 | **total=0** | 用户投诉的"total 仍算软删行"已消除 ✅ |
| 后台 同上 `status=active` | total=301 | total=179 | 301−122=179 ✅ |
| 客户端 `GET /api/v1/posts` | total=269 | **total=176** | 差 93。不是丢数据：165 行里只有 93 行是"客户端本来就能看见"的（active ∧ approved ∧ visibility=public_）；另 43 行软删 + 29 行 pending/非公开本就不可见。对账式见第 7 步 |
| 后台 `GET /v1/admin/forum/campus-topics` | — | total=165 | 250−85=165 ✅ |

API 侧串文复扫：客户端 100 条 / 后台 100 条抽样，residue_rows=**0**。

---

## 6. 真实演示数据（全部走后端真实 API，零直插 SQL）

复用在册配方：先跑 `node scripts/build-demo-accounts.mjs` → 全 PASS、失败 0 项，4 个学生号（100171–100174）
+ 1 个校区管理员号（100175）均已存在，幂等跳过建号、复核归属（circle_path 与期望节点逐一对上）。
`.env` 的 `DEMO_SEED=true` 经 `application-real.yml:103 demo_seed: ${DEMO_SEED:false}` 只喂 Flyway 的
虚拟用户/演示私信种子迁移（R4-00420/00422/00423）；后端在跑、不许重启，所以本轮没有新增迁移，
数据一律经接口写入 —— 符合"绕过去的数据后端字段语义可能不一致"的告诫。

| 内容 | 条数 | 写入端点 |
|---|---|---|
| 社区动态/帖子 | **12** | `POST /api/v1/posts`（游客/用户 JWT）id 397–408 |
| 帖子评论 | **18** | `POST /api/v1/posts/{id}/comments` id 1292–1309，每帖 1–2 条 |
| 圈子话题 | **3** | `POST /api/v1/circles/{id}/topics`（先 `/join`）id 38/39/40，圈子 12 美食·8 摄影·11 运动 |
| 圈子回复 | **6** | `POST /api/v1/circles/topics/{id}/replies` id 44–49 |
| 活动 | **2** | `POST /api/v1/admin/activities`（超管）id 12/13 |
| 资料补齐 | 4 个号 | `PUT /api/v1/profile/basic` 写 avatarUrl + bio + grade + pronouns |

作者：`演示·中山大学/浙江大学/武汉大学/南开大学`（100171–100174），昵称沿用 `build-demo-accounts.mjs`
的在册约定（「姓名刻意用「演示·校名」前缀，后台列表一眼能认出是演示号」），没有自创第二套。

**图片**：一律用后端已托管、逐字节一致的 app-assets 素材，`rel = assets/images/posts/*`。
存的形态是 `/static/assets/images/posts/post-N.jpg`（与库里 185 条真人帖一致，`resolveMediaUrl` 会重写成
`${apiRoot}/api/v1/media/app-assets/{rel}`）。实测出图（HTTP 200 + 与磁盘同字节）：
post-1 51047 / post-2 57989 / post-3 58210 / post-4 27309 / post-5 89708 / post-6 70607 / post-7 73122 /
post-8 27996 / campus-library 67226。活动封面 activity-3 62348、activity-sports 128821。
`post-placeholder.jpg` **没有**被新数据引用（占位词）。

头像只能存 `/api/v1/media/…` 形态：`ProfileUpdateService.isTrustedMediaUrl()`（R4-00297）拒收 `/static/…`，
实测报 `头像地址不合法，仅支持本服务上传的图片`。改用 `/api/v1/media/app-assets/assets/images/avatars/avatar-{12,23,31,44}.jpg` 后 4 个号全 200，出图 26584/6096/4105/4988 字节。

**文案**：全部是校园生活动线（西门糖水铺、珠江夜跑搭子、紫金港六楼靠窗、之江老房子拍照、珞珈山樱花吹进教室、
玉泉腌笃鲜只供两日、校园民谣抢票、法理学自习搭子、游泳馆早场、宿舍楼下三花生小猫、八里台梧桐扫窗），
无任何取证串文、无「测试/test/placeholder/TODO/示例数据」。

### 6.1 一处实测的可见性缺口（已按真实链路补）

客户端发帖落 `audit_status=pending`，**审核通过前客户端读不到**（不是同步坏，是审核口径）。
所以 12 条新帖 + 3 条话题建完时前端全是空的。已走真实后台审核接口放行：

- `POST /v1/admin/forum/village-posts/{397..408}/audit` `{decision:"approved"}` → 12 × 200
- `POST /v1/admin/forum/circles/topics/{38,39,40}/audit` → 3 × 200
- 顺带发现**存量真人帖 `posts#221`**（「今日日常：在图书馆自习了一下午…」，2026-09-08）一直卡在 pending，
  前端永远看不见；同接口放行 → 200，`auditorId=100000`。

---

## 7. 前后端一致性对账

别名口径（实测事实，不是故障）：客户端 `item.author.userId`/`author.nickname`（嵌套）↔ 后台 `item.authorId`/`authorNickname`（平铺）；
`status` / `auditStatus` / `visibility` **只在后台侧**（客户端契约里没有治理字段）。
分页口径坑：`/v1/circles/topics/{id}/replies` 与 `/v1/activities` 的 `page` 是 **0 基**（Spring Pageable），
传 `page=1` 会翻到 offset=20 读到空数组 —— 第一版对账把这条读成了"读不到"，改成 `page=0` 后即通。

对账结果（`tmp/r6-reconcile.txt`，逐项 PASS/FAIL）：

| 检查 | 结果 |
|---|---|
| 客户端帖子分页拉全 | PASS total=188 实收=188 |
| 后台帖子分页拉全 | PASS total=197 实收=197 |
| 12 条新帖两侧都读得到 + 作者别名一致 | 12/12 PASS（`client.author.userId=100171 ↔ admin.authorId=100171`，status=active audit=approved visibility=public_） |
| `posts#221` 仅后台侧 | PASS（标注 `visibility=friends` → 游客不可见属预期口径，非同步故障） |
| 12 条帖的图片可解析 | 14/14 PASS（每张 http=200、bytes>1000） |
| 12 条帖的评论两侧都读得到 | 12/12 PASS（客户端 n ↔ 后台 n，逐条相等） |
| 3 条圈子话题：客户端详情 + 回复 + 后台话题列表 | 9/9 PASS（回复各 2 条） |
| 2 个活动两侧都读得到 + 封面可解析 | 4/4 PASS（客户端活动列表 total=7 = published∧非 ended 口径） |
| 两侧全量帖 JSON 无取证串文/占位词 | 唯一命中 `posts#198` = `post-placeholder.jpg` 素材文件名 → 已入 ALLOW（见 1.2） |

删 + 造之后的两侧 total：

| 读数 | 值 | 对账式 |
|---|---|---|
| 客户端 `GET /api/v1/posts` total | **188** | 197 总 − 6 hidden(190–195) − 2 pending(281,282) − 1 friends(221) = 188 ✅ |
| 后台 `village-posts` total（不带 status） | **197** | = `SELECT COUNT(*) FROM posts` = 197 ✅（**已不含任何软删行**） |
| 后台 `status=active` | 191 | 197 − 6 hidden ✅ |
| 后台 `status=deleted` | **0** | 用户投诉项归零 ✅ |
| 后台 `campus-topics` total | 165 | 250 − 85 ✅ |
| 客户端 `activities` total | 7 | 含新建 12/13 ✅ |

---

## 8. 卫生门（新建）

`scripts/qa/verify-data-hygiene.mjs`（新建，只读；`q()` 里硬约束"只允许 SELECT，否则拒发"，全程不写库）。

- 判点：`posts/comments/post_tags/campus_topics/campus_topic_replies/circle_topics/circle_replies/activities/daily_questions/icebreaker_topics/official_messages/users(nickname,bio)` 命中取证串文/占位词模式 ⇒ `DATA_HYGIENE_RESULT=FAIL` + 逐行点名 `表#id 字段 命中 摘要` ⇒ **exit 1**。
- 模式集合取自第 1 步实测残留（`取证/端到端/可安全删/写库链路/QA自检/后台发布验收/浏览器验收帖/设备腿验收/QAFID/DEVSYNC/E2E-SYNC/lane-ui` + 词边界 `G8|QAFID|R2b|DEVSYNC|E2E|QA` + `G8…\d{8,14}号` + 整字段纯数字）。
- 退出码口径沿用 `verify-admin-roundtrip.mjs`：0=PASS，1=脏行，2=NOT-EVIDENCED（连不上库/凭据缺/mysql 路径不存在时**不假装通过**）。
- `normExe()` 已把 `/d/…` 归一成 `D:/…` —— 上一程那个"门因路径写法而恒红"的坑不再重演。
- 口令经 `MYSQL_PWD` 环境变量传，不进命令行。

实跑：

```
扫描范围：posts=197  comments=1127  post_tags=164  campus_topics=165  campus_topic_replies=0
          circle_topics=33  circle_replies=38  activities=13  daily_questions=8  icebreaker_topics=26
          official_messages=12  users=291
单元格数=3560  白名单例外=2 个（post-placeholder.jpg 素材名）
PENDING posts#281 / posts#282 / circle_replies#43 / users#100154 / users#100156 …（共 7 行，逐行点名）
DATA_HYGIENE_RESULT=PASS cells=3560 dirty=0        exit=0
```

`--self-test`（往内存结果注入 1 条合成脏行，MySQL 一行未动）：

```
DIRTY  posts#SELFTEST 字段=title 命中=取证 摘要=G8 端到端取证帖 SELFTEST，用于验证门会红
DATA_HYGIENE_RESULT=FAIL dirty=1
self_test_exit=1        ← 该红的地方确实红
```

保留行怎么处理的：第 1 步那 16 行 UNCERTAIN 没有顺手删，也没有悄悄放过 —— 其中被正则实际抓到的 5 行走
`PENDING_RULING` 集合，每轮 stdout 都以 `PENDING …` 点名并写明"待主控裁决"，但不计入 FAIL，
免得一道门因等裁决而恒红、把别的车道的接线全堵死。一旦主控裁定要删，删完这些行自然消失；
若改判"必须计入 FAIL"，把 `PENDING_RULING` 里对应条目去掉即可（门会立刻变红逼着处理）。

**接线要在以下三个登记点点名这道门**（我不动这三个文件，只报告）：
1. `scripts/qa/` 的门清单 / `verify-gate-catalog`（既有门登记处）—— 登记 `verify-data-hygiene.mjs` 与 `DATA_HYGIENE_RESULT` 结果键。
2. 根 `package.json` 的 `scripts`（QA 门聚合入口，与 `verify-admin-roundtrip` 同批）。
3. `.github/workflows` 的 QA 门 job 列表 + `.gitignore`/产物登记（`database/backup/` 与 `reports/audit/**` 的入库口径由主控定）。

---

## 9. 未做成 / 需要主控接手

1. **QA 账号 5 + 1 个（users 100152–100156, 100158）没删**，昵称是用户可见串文（其中 2 个会被卫生门抓到）。
   它们在 8 张 users 外键表里有行，删号属越界，需单独裁定。`users#100000 超级测试账号`是后台登录号，**绝不能删**。
2. **3 行整字段 `123456` 垃圾**（posts#281/282、circle_replies#43）保留待裁定。
3. **`posts#198` 的图片是 `post-placeholder.jpg`**：素材本身 200 出图、内容是真人文案，只是文件名带占位词。
   没有帖子更新接口，改名要动 `static/**`（禁地）。建议：要么把该素材在 CDN 清单里重命名（走资产车道），
   要么永久 ALLOW 并接受报告里这条 P2。
4. **后台超管口令已轮换**，任务书里那条（len=11，前缀 `Admi`）实测 401。请把凭据册同步到 `.env` 的 `ADMIN_LOGIN_PASSWORD`（len=18）。
5. `daily_answers` 只有 3 行、`consulting_signup` 等长尾表本轮未在盘点范围内展开（它们不在"社区可见"链路上）。
6. 备份件里有 2 个同一时刻的 R6 副本（130104 与 130124），都完整。要不要清理 130104 由主控定 —— 我没有删任何备份件。
