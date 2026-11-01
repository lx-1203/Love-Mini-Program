# 第五轮修复批次收口（2026-11-01）

依据：三份第五轮反证审查报告（`round-5-lane-A-backend.md` 11 条编号发现、
`round-5-lane-B-frontend.md` 15 条（其中 FINDING 6 是阴性记录）、`round-5-lane-C-gates-ci.md` 8 条发现
+ 判定表 25 项）与一批在途改动（`0edc9a4a`/`0001e499`/`5d7983ce` 之后、本 session 开始时已在
工作树里的 F-05/F-09/C-F1/C-F3/C-F4/C-F5）。
本文件只写**回到盘上复量过的**结论；每条的车道级细节在
`round-5-fix-lane-{A1-privacy,A2-security,B1-client,B2-i18n,C-admin-gates}.md` 里。

## 1. 复量读数一览（本 session 亲自跑的，命令 → 输出）

| 命令 | 读数 |
|---|---|
| `npm run test:contracts`（现 35 条） | `CONTRACTS_EXIT=0`；链内所有 `FAIL` 字样均来自各门自带负对照（`verdict=PASS`） |
| `cd apps/api && ./mvnw -o -B test` | `Tests run: 1797, Failures: 0, Errors: 0, Skipped: 10`、`BUILD SUCCESS`（10 个 skip 仍是 `FlywayMigrationRepeatableTest` 与 `RealProfileAuthChainIntegrationTest` 两个 `@EnabledIfSystemProperty` 门控类） |
| `npm run test:admin` | `Test Files 7 passed (7)`、`Tests 83 passed (83)`、EXIT=0 |
| `npm run test:client` | `Test Files 151 passed (151)`、EXIT=0（`generate:openapi` 重跑后 `api-types.ts` 无字节变化） |
| `apps/client` `npm run typecheck` / `apps/admin` `npm run typecheck` | 各 EXIT=0（合进链后再次确认） |
| `npm run test:i18n-orphan` | `I18N_ZH_KEYS=4222`、孤儿 `1251/1251`（压线未涨）、**裸中文 `341/341`**（模板 265 / 属性 33 / toast 24 / 兜底 19 / throw 0，84 个文件）、`I18N_RESULT=PASS` |
| `npm run test:gate-wiring` | `test gate wiring contract ok`（含车道 C 新加的 scripts/qa 第二条磁盘对账：门形态件 52、无人跑残留 5 钉成只减不增基线） |
| `node tests/admin-write-gate.spec.mjs` | 写视图 34 / 端点 182 / 不中 0 / 豁免 0 / 盲区 **22**-0-0 / SUPER_ADMIN 口径 注解 45 · 归档函数 43；`--self-test` 六向判红全绿 |
| `npm run test:prove-gates-can-fail` | `GATES_RED_PROVEN=7/7 VACUOUS=0 INCONCLUSIVE=0`、`PROVE_GATES_CAN_FAIL_RESULT=PASS` |
| `npm run test:qa-selftests`（本轮第一次把它跑完） | 64 个离线自检：**59 PASS / 5 FAIL / 1 SKIP**，`SELFTEST_RESULT=FAIL` ⇒ 见 §4 |

## 2. 逐条状态

### 后端（Lane A）
| 编号 | 处置 | 载体与读数 |
|---|---|---|
| F-01 悄悄话不在清除清单 | 已修 | 清单 **69→83 项**、运行时**语句数 62→76**、导出类别 **27→28**（新增 `whispers`）；`AccountErasureServiceTest` 18 例 |
| F-02 圈子/校区 UGC 未清 | 已修 | `circle_replies`/`campus_topic_replies`/`circle_topics`/`campus_topics`/`circle_announcements` 逐项进清单（A1 按 DDL 核过列名） |
| F-03 `visitors` vs `profile_visitors` | 已修（清单点名 + 职责注释）；**两表合并未做**，另列工程项 |
| F-04 其余主体表 | 已修 | `wallet_unlocks`/`video_call_records`/`content_mentions` 进清单；A1 纠正审查前提：`official_messages`、`error_reports` **没有用户归属列**，不进清单、穷尽门也不命中 |
| F-05 限流键名含裸手机号 | 已修（在途批次）+ 判点扩到行为级 | `key = "#pii.ref(#payload.phone)"`；`RateLimitKeyAuditTest` 新增 `noKeyMayEmbedRawPii` / `piiDetectorActuallyBites`；`PublicAuthWriteRateLimitTest` 原断言钉的是注解字面文本 `#payload.phone` ⇒ 等价修复必假红，已改成四条行为不变量（同桶/异桶/键名不含真实号码且不落降级桶/表达式仍取 `#payload`），并加 `RecordingBucketRegistry` 记真实桶键取证 |
| F-06 `reports` 留举报人自由文本 | 已修 | 改为 `ANONYMISE_IN_PLACE`（`description`/`reason` 抹、`status`/`handler_id`/`handle_remark` 保留） |
| F-07 清除服务缺席静默成功 | 已修 | 构造器注入 `ObjectProvider` + `@PostConstruct` fail-fast；`manualTombstone` 删除，缺席 ⇒ 503；两个「缺席下断言成功」的用例改为注入真 `AccountErasureService`，另加「缺席必抛」「启动必失败」 |
| F-08 后台链路复活注销主体 | 已修（消费者侧） | `User.isErasedSubject()` + `ErasureSubjectGuard` 单点口径；三个消费者落库前短路并 ack；续费流水按终态拦；新增 `ErasedSubjectBackgroundWriteTest`(5) + `ErasedSubjectBillingLedgerTest`(2)。**outbox 未加 `user_id` 列**：A2 判断补偿重投被短路后不再产生新行，加列的代价（真库不可验证）不抵收益——遗留见 §5.6 |
| F-09 管理端建号写明文 phone/openid | 已修（在途批次） | 改走 `PhoneColumnCodec.store` + `derivedOpenid`（`"phone:"+SHA-256`，与注册侧同一份 `sha256Hex`）；唯一性预检改为「派生键优先 + 明文兜底」；`AdminUserControllerTest` 12 例 |
| F-10 回滚只有注解无判点 | 已修（代码级） | 炸点中断 / afterCommit 才删文件 / 调用序列三条 + 静态门「实体映射列 ↔ users 原生 SET」双向对账（A2 纠正：报告原文的 `DataUpdateException` 本仓不存在，改用 `DataIntegrityViolationException`） |
| F-11 门只校自洽不校穷尽 | 已修 | `ErasureSchemaAlignmentTest#everyOwnerColumnTableIsNamedOrExempt`：迁移链归属表 ⊆ 清单点名 ∪ 带理由豁免，含 DROP 序感知、反漂移、防空转下限与解析器自测；装上后当场又挖出 `video_calls`/`circle_topic_likes`/`circle_topic_like_notices` 三张 |

### 前端（Lane B）
| 编号 | 处置 |
|---|---|
| 1 页面守卫无红门 | 已修：新增 `daily-question-page.spec.ts`（源码静态契约口径） |
| 2 `hasAnswered` 永不为真 | 已修：`fetchTodayQuestion` 两分支都写顶层值 + 断言双向 |
| 3 删除入口可达性 | 已修：判定规则收成 `isPostAuthor` 单一出口 + 运行时用例（spec 14→18 例） |
| 4 豁免前提与 SecurityConfig 矛盾 | 已修：豁免理由改成事实口径，并给门加元判点「豁免引用的端点必须能在 `expandAuthorities` 里放行所声称角色」 |
| 5 档位轴看不见裸角色比较 | 已修：门纳入 `currentAdminRole === 'X'` 形态；`Users.vue` 改密入口改挂 `canWrite`（与后端 R4-00389 对齐），盘上裸角色比较已零命中 |
| 6（阴性记录） | 无活错，债 5 条见 7/8/9/10/11 |
| 7 四处展示价直读镜像表 | 已修 + 新门：`.vue` 代码里出现 `UNLOCK_COST_YUAN` 即红（含扫描面下限与「替代出口仍被 ≥4 页消费」的阳性对照） |
| 8 充值文案裸写 100 / 409 当失败 | 已修：与 `RECHARGE_AMOUNT_CENTS` 同源；409 `IDEMPOTENT_CONFLICT` 按已入账收尾。键 TTL 4h 窗口遗留见 §5 |
| 9 账单手写 `/100` | 已修（**并带出一个活错**：改后 `formatCentsAsYuan` 未 import，未知金额分支是 ReferenceError；由 B2 的 typecheck 抓到，已修 + 去掉 `¥--` 的错拼） |
| 10 mock 余额哨兵 | 已修：`loaded` 标志 + 具名常量 |
| 11 `originalPrice` 同名异单位 | **未动**（跨 api/admin/client 的改名，见 §5.5） |
| 12 `canAdminOnlyWrite` 死位 | 已修：删位 + 位↔消费方判点 + `--self-test` 改读真实 `write-policy.ts` |
| 13 注释「42 处」过期 | 已修：门直接打印两数（注解 45 / 归档函数 43）并断言单调关系 |
| 14 i18n 死键与裸文案 | 可测量性已修（第二维上线、基线 456→341、成对维诚实化）；裸文案迁移做了 Top 3 文件（114 条 + 13 处 aria-label），剩 341 条/84 文件按棘轮记账 |
| 15 登出不清 Pinia 内存态 | 已修：25 个 store 登记 + 3 条带理由豁免 + `logout()` 接线 + 穷尽对账门（新增 store 不登记即红）+ 5 条运行时红门；admin 侧 `menuStore.reset()` 接进登出、守卫改按 `loadedFor` 判定 |

### 门禁与基础设施（Lane C）
F1 恒绿契约门已换成 8 条活判点；F3 幽灵表 DML 判点 + 空豁免集双向；F5 四处文档漂移改完（prometheus 头注、alert-rules 前置、compose↔pom、README 不再写死项数）；F6 盲区上界 30→22 并加收缩红；F7 `gate-wiring` 的 CI 判据只看 `run:` 体；F2 `scripts/qa` 第二条磁盘对账 + 5 个无人跑件钉成只减不增基线；F8 i18n 成对维诚实化 + 收缩升红；判定表 14（ci-contract 步骤顺序）亦已补。

## 3. 接线变更（本 session 由主控落的）

1. **`test:typecheck` 新进根脚本并接进 `test:contracts`**（35 条）。
   原因不是「想多一道门」，而是本轮实测到的因果：客户端 `typecheck` 原先只在 `verify:phase01` 里，
   `test:contracts` 不含它 ⇒ FINDING 9 那个「用了没 import 的标识符」在 151 个 spec 全绿的情况下活了下来，
   只有另一条车道跑 typecheck 才撞见。链绿不再等于「引用完整」这一条已经补上。
2. **撤销两条本打算新增的键**（`test:qa-selftests`、`test:prove-gates-can-fail`）。
   两者已作为「有理由的本地载具」登记在 bash（`run-final-verify-v33.sh`）与 DSL 里（车道 C 实测），
   本轮又各自真跑过一发。若把它们接进链：`run-qa-selftests` 会让链立刻因 §4 的 5 条存量红而变红
   （红还没定性，会让人误归因到本批改动），`prove-gates-can-fail` 单发耗时数十分钟且会临时改坏盘上文件。
   这是**待定性**，不是免检：§4 逐条点名并派给第六轮。
3. **无需新增 CI 步骤**（纠正一条转述）：车道 A2 交来「请把 `-Dreal.it.test=true` 接进 CI 真实栈 job」，
   实测 `.github/workflows/ci.yml` 的 db-integration job **早已有该步骤**（`-Dtest=RealProfileAuthChainIntegrationTest`
   `+ -Dreal.it.test=true`），`-Dflyway.repeatable.test=true` 那条也在。A2 的「本机证不了跑通」仍然成立，
   但「接线缺失」这一半不成立 ⇒ 记为已接。

## 4. 本轮新暴露的存量面（第一次跑聚合载具才见到的 5 条红）

| 自检件 | 红数 | 首行红原文（截断） | 初步定性 |
|---|---|---|---|
| `test-corpus-denominator.cjs` | 2 | `BLINDSPOT 余数==已出册 + 回盘但未被点名 <<neverOpened=8264 已出册=11451/11451 回盘未具名=1/1>>`、`具名历史=3188 已回盘=0` | 指向证据库/历史删除账，需按库轴与用户裁定分层定性，不能直接算产品缺陷 |
| `test-guest-landing-writeguard.mjs` | 14 | `载具真的撞到设备桩并崩了（exit 非 0 + 桩里记下 clearSession 调用）:: exit=2` | `exit=2` 是载具级（缺输入/缺前置），按仪器账处理 |
| `test-guest-landing.mjs` | 10 | `真数据 exit 0 :: exit=2` | 同上，载具级 |
| `test-source-shape-absence.mjs` | 7 | `CS26 判点在盘上成立 «apps/client/src/subpackages/chat/chat-session/index.vue :: <template> 内计数应为 1，实测 0»`、`基线不成立=19 ⇒ 被断言缺席的物件回到了盘上` | **这条是真缺陷形态**：缺席断言的对象在盘上复活；且「基线不成立 19」远大于「1 条」，判据台自己的基线读数和聚合器的红数需要对账 |
| `test-source-shape-lg31.mjs` | 3 | `无 *_TEST= 判据行` | 聚合器抓不到判据行 ⇒ 该件要么恒静默、要么输出契约变了 |

这 5 条与本轮改动**无因果关系**（`run-qa-selftests` 此前从未被任何入口跑过），但它们是第五轮 C-F2
那句「写了没人跑」的实测代价，必须进第六轮的账。

## 5. 边界清单（本机判不出 / 需外部条件，逐条）

1. **76 条清除语句在 MySQL 8 上的真实可执行性与影响行数**、`@Transactional` **真回滚**：
   本机 MySQL 8.0.45 在跑、`campus_love`（118 张表）可达（`information_schema` 只读量过），
   但真栈测试会**往生产库写**；影子库路线被权限挡死（应用账号 `campus` 只有 `campus_love.*`，
   `CREATE DATABASE` 报 1044，`.env` 内无 root 凭据）。
   ⇒ 需要 DBA 凭据或一个可建的影子库。零写入的中间路线（逐条 `PREPARE` 证语法/对象可解析 +
   `information_schema` 核 FK 方向与列可空性）已列入第六轮。
2. **real profile 装配完整性**：`@PostConstruct` fail-fast 只在单测替身下证过；`RealProfileAuthChainIntegrationTest`
   5 例仍 skip（CI 步骤已在盘上，本机无库跑不完）。A2 已实测证明 maven 的 `-D` 会传到 forked JVM。
3. **AOF 里是否已落过裸手机号键**：代码侧只保证「从现在起键名是摘要」；历史键清理属运维（换密钥/重建 AOF 与备份）。
4. **对象存储物理删除**：`posts.images`/`comments.images` 是否全被 `media_asset` 行覆盖仍未经实盘验证。
5. **F-11 之外的跨车道改名项**：`products.originalPrice`（元）与 `shop_items.original_price`（分）同名异单位，
   改名要同批动 `apps/api` 实体 + `AdminShopController` + `apps/admin/Shop.vue` + openapi 与
   `tests/openapi-coverage.spec.mjs`，不在本轮任何单条车道的安全改动面内 ⇒ 保留。
6. **outbox 定向清除**（`outbox_event` 无 `user_id`）：A2 按「短路后不再产生新行」判定不动 schema；
   若产品裁定「注销必须能清空待发队列」，需幂等迁移补列 + 清单项 + 类别同步 + 真库验证。
7. **多副本限流阈值不放大**：需两个 JVM + 真 Redis；本轮判点走的是本地桶路径。
8. **微信真机 / 构建腿 / 端到端**：本 session 未起 dev server、未跑构建、未上真机；
   所有「跨账号残留」的用户可见后果都是**从源码分支推导**（引具体条件与行号），不是屏幕上看到的。

## 6. 仪器事实（这一程学到的，写下来免得下次重学）

- 三条派单车道里有**两条撞 150 轮上限**，且都在**报告落盘之前**中断（一条 4528 万 token、一条 4918 万 token）
  ⇒ 派单里「边做边写」要写成步骤序号，并把单条车道的发现数压到 ≤8 条。
- 「车道只跑自己新增的 spec」不算验证：B1 改完 store 打破了 2 个既有 spec 共 7 例，全靠全量套件才发现。
- 注释里承诺的判点必须 grep 验证：`checkin.ts` 写着「判点见 session.spec」而那个文件当时根本没被改。
- 代理对环境的陈述也是待验证的：A2 写「本机无 MySQL」不实（见 §5.1 的真实成因）。
- 判点钉在实现字面文本上 ⇒ 等价修复必然假红（F-05 那条限流测试就是这一形状），判据要写成行为不变量。
