# Round 5 — Lane C：质量基础设施审计（门 / CI / 文档 / 迁移链）

审计对象：`tests/*.spec.mjs`、`scripts/qa/*`、`.github/workflows/ci.yml`、根 `package.json` scripts、
`docker-compose.yml` + `docker/**`、`doc/*.md` + `README.md` + `.env.example`、`database/flyway/sql/**`。
审计时 HEAD：`86e60646`（round-4 的 `0edc9a4a / 0001e499 / 5d7983ce` 之后，另有 `0c397a0b` 落了 i18n 门接线）。
本机 node：`npm run` 走 v20.19.5（与 CI 的 `node-version: '20'` 同代），裸 `node` 是微信开发者工具的 v16（不参与判定）。
基线事实：`npm run test:contracts` 全链在本机 **EXIT=0**（`/tmp/contracts-run.log`，34 条 npm 调用）。

## 1. 判定表

| # | 项目 | 判定 | 证据指针 |
|---|------|------|----------|
| 1 | `tests/*.spec.mjs` 20 条全部既有根脚本别名又在 `test:contracts` 链内 | 已证实 | `tests/gate-wiring.spec.mjs:20-42`；链实测 EXIT=0 |
| 2 | CI 执行链：`npm run test:contracts` 于 `ci.yml:132`，并经 `verify:phase01`(`ci.yml:647`) 二次执行 | 已证实 | `.github/workflows/ci.yml:132,647` |
| 3 | `scripts/qa` 门通道（102 个 verify-/check-/audit- 件 + 56 个 `test-*` 自检件）既不在链也不在 CI | 判红 | 枚举见 §2；载具 `run-final-verify-v33.sh` 在 CI 仅出现于注释 `ci.yml:143` |
| 4 | `entity-ddl-drift` 的「引用先于创建」判点会咬 | 已证实 | 变异 M3-b：`entity-ddl-drift.spec.mjs:85` 红 |
| 5 | `entity-ddl-drift` 对「DML 写进链里从未 CREATE 的表」永不判红（正是门头声称要抓的形态） | 判红 | 变异 M3-a：幽灵表 INSERT/UPDATE ⇒ 门 EXIT=0；根因 `entity-ddl-drift.spec.mjs:80` |
| 6 | 抽样 8 个 JPA 实体映射列 ↔ 迁移链 DDL 的漂移数 | 已证实 = **0 条** | §3；实体：UserBasicProfile/Post/User/MediaAsset/VipOrder/CampusTopic/TempChatSession/AuditLog |
| 7 | 全库 110 实体的列漂移初判 8 实体 / 9 列，复核后真漂移 = 0 | 判不出（须先修解析器盲区） | §3：6 条为循环 DDL 盲区、2 条为 @JoinColumn 换行盲区 |
| 8 | `ErasureSchemaAlignmentTest` / `entity-ddl-drift` 的列集解析看不见「过程循环补列」形态 | 判红 | `V2026.07.26.0003:48,61`、`V2026.07.28.0006:32,57-58`；判据 `ErasureSchemaAlignmentTest.java:256-263` |
| 9 | `monitoring-wiring` 第 6b 节（node-exporter job 常开 + profile 同档）会咬 | 已证实 | 变异 M1：`monitoring-wiring.spec.mjs:335`（并会在 `:349` 再红） |
| 10 | `prometheus.yml` 文件头注释仍说 node-exporter job 是注释态、受 `monitoring` profile 门控 | 判红 | `docker/prometheus/prometheus.yml:14-18` vs 同文件 `:77` |
| 11 | `alert-rules.yml` 的前置声明文本引用已不存在的 `monitoring` profile | 判红 | `docker/prometheus/rules/alert-rules.yml:288` |
| 12 | `docker-compose.yml` 注释否认 `flyway-maven-plugin` 存在，与 pom 及 DEPLOYMENT 冲突 | 判红 | `docker-compose.yml:44-46,215-218` vs `apps/api/pom.xml:238-260` vs `doc/DEPLOYMENT.md:544,1172` |
| 13 | `ci-contract` 的属性门 ratchet（每个 @EnabledIfSystemProperty 必须在同一条 mvn test 里点名类）会咬 | 已证实 | 变异 M2：`ci-contract.spec.mjs:370` |
| 14 | `ci-contract` 不校验 db-integration 的步骤顺序（migrate 是否早于两个测试） | 判红 | `tests/ci-contract.spec.mjs:383-405`（只数 `DB_URL` 非 `campus_love?` 的步骤 ≥2） |
| 15 | db-integration job 能否在 runner 上真跑通 | 判不出 | 见 §4，从未有观察记录 |
| 16 | `gate-wiring` 例外清单「接上线必须划掉」双向强制 | 已证实 | `tests/gate-wiring.spec.mjs:156-161` |
| 17 | `gate-wiring` 的「CI 已执行」判据吃全文（含注释）⇒ 名字写进注释即算接线 | 判红（机制已证） | `tests/gate-wiring.spec.mjs:130`；实例：`test:structure` 仅命中注释 `ci.yml:131` |
| 18 | `admin-write-gate` 第 4 轮新增盲区上界带 7 格余量且无收缩判点 | 判红 | `tests/admin-write-gate.spec.mjs:841-845`（30）vs 实测 23 |
| 19 | i18n 棘轮基线=实测=1251（零余量）且能咬 | 已证实 | 变异 M5：`--allow-orphans 1200` ⇒ EXIT=1 |
| 20 | tz / collation / openapi-coverage / admin-scope-parity / fallback 五把棘轮都有双向收缩纪律 | 已证实 | §5 逐条行号 |
| 21 | `tests/prototype-contract.spec.mjs` 是恒绿门（目标文件已删 ⇒ exit 0） | 判红 | `tests/prototype-contract.spec.mjs:6-9`；`index.html/script.js` 不存在 |
| 22 | 专为「证明门能变红」而写的 `prove-gates-can-fail.mjs` / `run-qa-selftests.mjs` 本身无人执行 | 判红 | 两文件均不在 package.json / ci.yml / bash 载具中 |
| 23 | `.env.example` ↔ compose `:?` 必填 10 变量 ↔ DEPLOYMENT 变量表一致 | 已证实 | `deployment-config` 实测：`:? 必填 11 个全部对应空值示例` |
| 24 | 备份/恢复命令（`--profile backup`、`/backup.sh`、`restore-mysql.sh --artifact/--apply`）与 compose、脚本参数一致 | 已证实 | `docker-compose.yml:768-771`、`scripts/restore-mysql.sh:85-94`、`doc/DEPLOYMENT.md:353-361,692` |
| 25 | `README` 称 `test:contracts` 为「18 项」 | 判红（过期计数） | `README.md:384` vs 实测 34 条 npm 调用 |

## 2. 覆盖率普查（走盘，不信任何文档清单）

**门总量**：`tests/*.spec.mjs` 20 条；`scripts/qa` 325 个文件里门形态件（`verify-* / check-* / audit-* / test-*`）约 240；根 `package.json` 里 `test:*` 脚本 44 条。

**(a) `tests/`：20/20 全部在链内且在 CI 内**（链被 `ci.yml:132` 与 `:647` 各跑一遍）。逐门的「能否变红」体检：

| 门 | 负对照/自测 | 正控下限 | 备注 |
|----|------------|---------|------|
| ci-contract | 有（`167-172` Dockerfile 旧 context 负对照） | 有（`310` java>100、`340` 属性门≥2、`223` real-only≥4） | 最完整 |
| monitoring-wiring | 有（`166-168`、`279-296` 三条合成自测） | 有（`78,105,142,199,326,332`） | 第 3 节可证伪 |
| entity-ddl-drift | 无显式夹具 | 有（`36,54,69,98`） | 见发现 3 |
| admin-write-gate | 有（`750-780` self-test 方向 a/b） | 有（`endpoints≥30`、`writeApi≥20`） | 盲区上界见发现 6 |
| tz-ratchet | 有（`77-79` 解析自测三例） | 有（`59,105`） | |
| collation-uniform | 部分（锚文件存在性） | 有（`105,134`） | 带收缩红 |
| openapi-coverage | 有（`95` 编造路径必须红） | 有（`84,101,108,134`） | |
| admin-scope-parity | — | 有（`168`） | 基线=上限 21=实测 |
| admin-scope-leak | 有（`81-84` 负例≥2） | 有（`93`） | |
| admin-credential-gate | 部分（grandfather 必须在盘且含危险值） | 无全局计数下限 | |
| deployment-config | 有（注释里的 `-e MYSQL_PWD` 负例） | 有（`:?`≥8） | |
| docs-contract | 部分（路径必须真存在） | 弱（仅 `ciNodeVersions>0`） | |
| release-gate | 无夹具、无下限 | — | 靠 `assert.match` 仍可红 |
| third-party-binding-audit | 无夹具 | 有（`48,72`） | |
| final-verify-summary | 有（合成 3 组夹具） | 有（空读判 FAIL） | |
| project-structure | 无 | 有（`styleFiles>=10`） | |
| r16-disposition-ledger | 无 | 硬相等断言（150/64/214） | 只能红不能漂 |
| e2e-routes | 委托 `generate-e2e-routes --check` | 无 | |
| gate-wiring | 无（自身即 ratchet） | 有（`specsOnDisk≥10`） | 见发现 8 |
| **prototype-contract** | **无，且第 6-9 行直接 `process.exit(0)`** | 无 | **恒绿，见发现 1** |

**(b) `scripts/qa` / `scripts` / `tools`：** 被 package.json 引用的门件只有 12 个（其中 3 个只跑 `--self-test`：`test:asset-coverage:source`、`test:data-hygiene`、`test:asset-registry`、`test:client` 被 `gate-wiring.spec.mjs:105-119` 显式登记为例外并强制收缩）；被 CI 直接执行的只有 `verify-app-assets-coverage.mjs --source-only --selftest`(`ci.yml:146`)、`verify-env-release.mjs`(release-gate job)、`tools/audit-prod-ratchet.mjs`(`ci.yml:115`)。

**既不在链也不在 CI 的集合**（本轮普查结论）：
1. `test:asset-coverage:source`、`test:data-hygiene`、`test:asset-registry`、`test:client` —— **有登记、有反漂移强制**（`gate-wiring:156-161`），可接受。
2. **未被任何登记覆盖的暗面**：`scripts/qa` 下 102 个门形态件 + 56 个 `test-*.*` 自检件，其唯一载具是 `scripts/qa/run-final-verify-v33.sh`（引用 66 个 verify-*）与 `.zcode/workflows/*.dwf.ts`（引用 64 个 qa 件）；bash 载具在 CI 里**只出现在注释** `ci.yml:143`，DSL 载具没有任何自动执行入口；`prove-gates-can-fail.mjs`、`run-qa-selftests.mjs`、`lint-gate.cjs`、`mini-audit-smoke.sh` 全为孤儿。

## 3. 迁移链列级复现（任务 6）

自写解析器（CREATE TABLE / 多子句 ALTER / `ADD (…)` / `add_column_if_missing(t,c)` / `DROP COLUMN` / `CREATE TABLE LIKE` / 过程体 CALL）+ 110 个实体（@Column 显式名、@JoinColumn、`@Version`、snake_case 默认名、@Transient/@Formula 排除）。

抽样 8 个实体：**漂移 = 0**。
- `UserBasicProfile→user_basic_profile`（DDL 30 列 / 实体 30 列）、`Post→posts`（27/27）、`User→users`（25/24）、`MediaAsset→media_asset`（22/22）、`VipOrder→vip_order`（20/19）、`CampusTopic→campus_topics`（19/19）、`TempChatSession→temp_chat_session`（18/17）、`AuditLog→audit_log`（17/17）——全部列都能在链上找到出处。

全库：**8 个实体 / 9 个列引用**报缺，逐条复核后**真漂移 0 条**：
- 6 条 `created_at`（`dnd_settings / make_up_quota / notify_config / push_preferences / social_progress / user_online_status`）是解析器盲区：列由 `V2026.07.28.0006:32` 的 **变名过程** `add_created_at_column_if_missing_v6('t')` 循环补上（`:57-58` 起）；`users.version` 等同理由 `add_version_column_if_missing`（65 处 CALL）。
- 2 条 `consulting_signup.course`、`role_menus.menu/role` 是 `@JoinColumn` 跨行写法造成的假阳（`ConsultingSignup.java:51-54`、`RoleMenu.java:32-39`）。

**关键结论**：round-4 新增的 `ErasureSchemaAlignmentTest` 的 `ALTER_ADD_PAIR` / `ADD_COLUMN_PROC` 两把正则（`:250-263`）**同样看不见循环补列形态**——`ALTER TABLE \`', tbl_name, '\` ADD COLUMN version` 的表名在字符串里，`CALL add_version_column_if_missing('t')` 是 1 参形式而它只认 2 参形式。也就是说该测试的「生产有、迁移没有」判定是**解析器覆盖度**的函数，不是库的真事实：若清单将来引用 `version` 或 `_v6` 补的列，会误报；反之这类列无法被校验。这解释了发现 5 与 6。

## 4. CI 可行性（只读推理）

步骤顺序本身成立：checkout → setup-java → 建空库 `campus_love_fresh` → `flyway:migrate` → 两个 `mvn test -Dtest=` 定向跑。要点与风险：
1. **`mvn flyway:migrate` 能不能连 MySQL**：`apps/api/pom.xml:238-260` 的插件块**没有** `<dependencies>`；本地 `~/.m2/.../flyway-maven-plugin-10.10.0.pom` 不声明 flyway-mysql，`flyway-core-10.10.0.jar` 内 **0 个 mysql 类**（`flyway-mysql-10.10.0.jar` 有 18 个）。侥幸点在 `plugin.xml` 里 migrate mojo 是 `requiresDependencyResolution=test`，项目 test 级类路径（含 `flyway-mysql`、runtime 的 `mysql-connector-j`）会进插件 realm ⇒ **大概率可用，但这是整条 job 的第一号未验证假设**。有 runner 时第一件事：单跑该步骤，看是 `Unable to load database type MySQL` 还是通过。
2. **`mysql` CLI 依赖**：`ci.yml:360` 用宿主 `mysql` 客户端建库/授权（10 处引用）。runner 镜像是否恒带该客户端未在本仓证明；备选 `docker run --network host mysql:8.0.39 mysql ...`。这是第二号待验假设（`command -v mysql`）。
3. **placeholder 与血统差异**：migrate/test 步骤的 `DB_URL` 缺 `useSSL=false&allowPublicKeyRetrieval=true`，而 compose 的 `FLYWAY_URL` 带（`docker-compose.yml` migrate 服务）；MySQL 8 服务端默认可 TLS、Connector/J 默认 `sslMode=PREFERRED`，故应可过——但这是与 compose 不同源的一处，值得单独验一发。
4. **非 ASCII 命令行**：`-Dflyway.placeholders.admin_nickname=系统管理员`(`ci.yml:378`) 依赖 runner 的 UTF-8 locale；退化成 `?????` 只会污染昵称列，不会红 job。
5. **静态门不盯顺序**：`ci-contract.spec.mjs:399-405` 只数「DB_URL 非 campus_love 的步骤 ≥2」，把 migrate 挪到测试之后门仍绿（且 `flyway:migrate` 存在性 `:393-398` 仍绿）。
6. **只可能红在 CI 的观察面**：`needs: api-compile` + `cache: maven` 冷缓存下 flyway 插件/依赖需联网解析；`timeout-minutes: 40` 装 233 份迁移 + 两个 SpringBootTest，无实测记录。
7. **本地会让 CI 假红的东西**：无——本地链全绿且无仓库内文件依赖被 .gitignore 挡掉（`verify-gate-list-sync.cjs` 读的 `.zcode/workflows/*.dwf.ts`、`run-final-verify-v33.sh` 均已 `git ls-files` 确认跟踪）。

## 5. 棘轮清单与完整性

| 棘轮 | 位置 | 基线 | 实测 | 会漂/会烂判定 |
|------|------|------|------|--------------|
| i18n 孤儿 | `scripts/qa/verify-i18n-orphan.mjs:42` | 1251 | 1251 | 零余量可咬（M5）；但「可收缩」只是日志（`:130-132`）不判红 |
| tz 无时区 now | `tests/tz-ratchet.spec.mjs:29` | 6 文件/19 处 | 19 | **双向**：超出红(`:85-91`)、缩了不降也红(`:95-101`) |
| collation 历史 | `tests/collation-uniform.spec.mjs:31` | 27 文件/32 处 | 32 | 双向（`:135,:136`） |
| openapi 未接入 | `tests/openapi-coverage.spec.mjs:98` | 8 | 8 | 双向（`:113,:115`） |
| admin 作用域基线 | `tests/admin-scope-parity.spec.mjs:79,106` | 21（=上限） | 21 | 双向（`:197-203` 过期条目红）+ 每条必须有理由 |
| 兜底字面量 | `scripts/qa/audit-fallback-literals.cjs` | 0 | 0 | 「该收缩=0」在输出里 |
| 门接线例外表 | `tests/gate-wiring.spec.mjs:105` | 4 条 | 4 条 | 只减不增被强制(`:156-161`) |
| 清单同步步 | `scripts/qa/verify-gate-list-sync.cjs` | 孤儿门 3 | 3 | 空读 FAIL |
| **写权限盲区上界** | `tests/admin-write-gate.spec.mjs:841-845` | **30** | **23** | **判红**：新引入即带 7 格余量，注释写「只降不升」但**没有任何收缩判点**，同族其它棘轮都有 |
| data-hygiene 下限 | `scripts/qa/verify-data-hygiene.mjs` `HYGIENE_MIN_CELLS=500` | 500 | 3818 | 只防「读空」，防不住证据质量下降 |

Round-4 是否抬高过基线：**未见于数值上界**（唯一改动是把 i18n 从 1257 降到 1251）。但 `5d7983ce` 新增了 `unattachedControls: 30` 这个**高于当时实测量**的新上界，等价于「为未来退化预留空间」，与同轮其它门的收缩纪律自相矛盾 → 见发现 6。

## 6. 编号发现

**F1｜恒绿的「契约门」：prototype-contract**
现象：`tests/prototype-contract.spec.mjs:6-9` 在 `index.html / script.js` 缺失时 `process.exit(0)`；两文件确实不存在。
证据：链实测输出 `prototype contract skipped: legacy prototype files removed`，其后 13 条断言**永不执行**。
影响：链与 CI 里有一条永远绿、0 判点的门；它计入「20 条契约门」的口径，稀释真实覆盖率。
建议：删掉该 spec 与 `test:prototype`（并从链/README 摘除），或把断言改成对现行 app 的等价判点；若必须保留跳过语义，则 `gate-wiring` 应禁止「exit 0 且判点 0」的门。
严重度：P2。

**F2｜`scripts/qa` 门通道整体无人执行，且 ratchet 看不到它**
现象：102 个门形态件 + 56 个自检件的唯一载具（bash / DSL）没有任何自动入口。
证据：`run-final-verify-v33.sh` 在 ci.yml 仅命中注释行 `:143`；`grep` 确认 DSL/bash 未被 npm/CI 调用；`prove-gates-can-fail.mjs`、`run-qa-selftests.mjs` 为孤儿。
影响：「写了没人跑」这一主缺陷类在本仓仍有整条通道级规模的重演；`gate-wiring` 只盘 `tests/*.spec.mjs` 和根 `test:*` 名，因此对这块全盲。
建议：给 `gate-wiring` 加第二条磁盘对账（`scripts/qa` 门形态件必须属于「链 / CI / 显式登记」三集合之一），把 bash/DSL 登记为有理由的本地载具并把件数钉成只减不增的基线。
严重度：P2。

**F3｜`entity-ddl-drift` 未执行它自己声称要执行的缺陷**
现象：门头（`:5-6`）说它存在的理由是 `V2026.10.14.0005/.0007` UPDATE/INSERT 了链里从未 CREATE 的 `circle_layer/admin_layer`；但判点 2 在 `:80` 对「链里没建过的表」直接 `continue`。
证据：变异 M3-a —— 新增 `V2026.99.99.0003__audit_probe_ghost.sql`（`INSERT INTO audit_probe_ghost …` + `UPDATE …`，无实体、无 CREATE）⇒ 门 EXIT=0；M3-b 证明同族「引用先于创建」判点确实会红。
影响：只有当该表恰好被某个 `@Table` 实体映射时才可能被抓住；纯 DML 型缺表（round-4 事故的确切形态）永远绿。
建议：删掉 `:80` 的 `continue`，改为「DML 目标表若不在 `created` 且不在显式豁免集 ⇒ 红」，并保留「视图/外部对象」的显式例外清单。
严重度：P1。

**F4｜迁移链的「权威列集」不可由现有正则导出（影响新 JUnit 测试的正确性）**
现象：65 处 `CALL add_version_column_if_missing('t')`、`add_created_at_column_if_missing_v6('t')` 等循环补列形态不在任何解析器射程内。
证据：朴素解析报 67 实体/118 列漂移，补上过程体后降到 8 实体/9 列，且 9 列全为已知盲区/假阳；`ErasureSchemaAlignmentTest.java:256-258` 只匹配 2 参 `add_column_if_missing`。
影响：新测试给出的「生产有、迁移从不创建」结论是解析覆盖度的产物；一旦清单引用循环列会误报，真缺列也可能被过程形态掩盖。
建议：在 Java 测试与（拟新增的）node 列级门里共享同一份「过程补列登记表」（`proc → column`，从 `CREATE PROCEDURE` 体自动发现），并对 3 参/1 参 CALL 形态都记账；另加一条自测：把 `version` 注入夹具必须能解析到。
严重度：P2。

**F5｜监控与 compose/pom 的注释与事实相反（文档 4 处漂移）**
现象与证据：
- `docker/prometheus/prometheus.yml:14-18` 仍写「node-exporter 抓取任务默认注释、受 monitoring profile 门控」，与同文件 `:77` 常开 job 冲突；
- `docker/prometheus/rules/alert-rules.yml:288` 的前置文案仍在讲「只起 monitoring 时」，该 profile 已在 round-4 移除；
- `docker-compose.yml:44-46,215-218` 断言「pom 无 flyway-maven-plugin、不能用 `./mvnw flyway:migrate`」，与 `apps/api/pom.xml:238-260` 及 `doc/DEPLOYMENT.md:544,1172,1319`（教运维用 mvnw）互斥；
- `README.md:384` 称链是「18 项」，实测 34 条 npm 调用。
影响：运维照 prometheus 文件头会去取消注释/找 profile；照 compose 注释会拒绝 mvnw 路径；两处「正确但过期」的散文正是本门要防的静默漂移。
建议：把这三段注释改成与事实一致；并把「注释里断言 job 是注释态 ⇒ 必须与 `activeJobs` 一致」「compose 注释若否认 pom 已存在的插件 ⇒ 红」「README 计数=链实测」补成 `monitoring-wiring` / `deployment-config` / `docs-contract` 的判点。
严重度：P3。

**F6｜Round-4 新增的盲区上界带余量且无收缩判点**
现象：`BLIND_SPOT_CEILING.unattachedControls = 30` 而实测 23；注释声称「棘轮，只降不升」。
证据：`tests/admin-write-gate.spec.mjs:841-845,856-864`；无任何 `measured < ceiling` 的红；引入提交 `5d7983ce`。
影响：未来 7 个「控件归属失败」可静默存在而不红；与 tz/collation/openapi/parity/i18n 同族纪律不一致。
建议：把基线设为 23 并在 `blindOverruns` 旁加 `blindShrink` 红；若要保留余量，则必须像 `TEST_EXECUTION_BASELINE` 那样写明「为什么是 30」。
严重度：P3。

**F7｜`gate-wiring` 的 CI 判据吃全文**
现象：`tests/gate-wiring.spec.mjs:130` 在原始 `ci.yml` 文本上做 `\\b<name>\\b`，注释与 `name:` 字段同样算「CI 已执行」。
证据：`test:structure` 在 ci.yml 的唯一命中是注释行 `ci.yml:131`；同族正确写法已在同文件 `:138-145` 用 `run` 归一化文本实现过，`ci-contract` 也坚持「只认 run / 不认注释」。
影响：把门名写进注释即可骗过「已接线」判定；更糟的是它会反过来触发 `:156-161` 的「例外必须划掉」红，制造假信号。
建议：`inCi` 改为只看 `run:` 体（复用 `ciNormalized`），或至少剔除 `#` 行后再匹配。
严重度：P3。

**F8｜i18n 门当前只有一半效力**
现象：`en-US.ts` 已下线 ⇒ 成对维 SKIPPED，链里只剩孤儿维生效；`I18N_RATCHET_SHRINK` 只打印不判红。
证据：链尾输出 `I18N_PAIRING=SKIPPED … I18N_RESULT=PASS（成对维 SKIPPED…）`。
影响：这是被诚实声明的降级（round-4 还专门修了误报文案），但它让「双语一致」这条历史判点事实上归零；同时基线可长期高于实测而无人被要求收。
建议：要么恢复成对维（把 en 包下线也写进 ratchet），要么让 `I18N_RATCHET_SHRINK` 升级为红，与其他棘轮对齐。
严重度：P4。

## 7. 我实际跑过的变异（4 门 5 发）

所有真实文件先 `sha256sum` 再备份到仓外 `/tmp/audit-bak/`，跑完用 `cp` 还原并复验哈希；探针迁移文件为新增未跟踪件，跑完删除。

1. **M1 → `monitoring-wiring`**：`docker/prometheus/prometheus.yml` 第 77 行改 `  - job_name: node-exporter` → `  # - job_name: node-exporter`。
   输出：`AssertionError: 规则的数据源无人抓取且未声明： host-resources/HostDiskHigh|HostMemoryHigh|HostCpuHigh|BackupNeverCompleted 引用了 node-exporter …`，红点 `tests/monitoring-wiring.spec.mjs:335`（`:349` 的「job 必须活跃」在其后即第二发），`EXIT=1`。
   还原：`sha256 617f548c0dc7a8a24d090f0bc1214cf3cbf1b83a9d3041ca6f26450b041e52b5`（与改前逐字相同），门恢复绿。
2. **M2 → `ci-contract`**：删除 db-integration 定向步骤里的 `-Dflyway.repeatable.test=true` 一行。
   输出：`后端属性开关式集成测试的 CI 接线有 1 处缺口：FlywayMigrationRepeatableTest 靠 -Dflyway.repeatable.test=true 才执行，但 CI 没有任何一条 mvn test 设置它 ⇒ 这是一扇从不打开的门`，红点 `tests/ci-contract.spec.mjs:370`，`EXIT=1`。
   还原：`sha256 4ce1cc732850490cb2c1ba7b865abe150ad9f0211940fd0581b0f8a3c4b0a06e` 一致，门恢复绿。
3. **M3 → `entity-ddl-drift`**（两发）：
   - a（漏洞证明）：新增 `database/flyway/sql/V2026.99.99.0003__audit_probe_ghost.sql`，内含 `INSERT INTO audit_probe_ghost …` / `UPDATE audit_probe_ghost …`（该表链上从不 CREATE、也无实体）⇒ **`EXIT=0`**，输出仍报 `迁移 234 份`，证明 F3。
   - b（咬合证明）：新增 `V2026.99.99.0001__audit_probe_ordered.sql`（UPDATE）+ `V2026.99.99.0002__audit_probe_create.sql`（CREATE）⇒ `迁移链存在"引用先于创建" … V2026.99.99.0001 里引用 audit_probe_ordered，但它直到 V2026.99.99.0002 才被 CREATE`，红点 `tests/entity-ddl-drift.spec.mjs:85`，`EXIT=1`。
   还原：三个探针文件 `rm -f`；`ls database/flyway/sql/*.sql | wc -l = 233`（与审计前一致），`git status --porcelain` 内无 `audit_probe`，门恢复绿（报 `迁移 233 份`）。
4. **M4 → `gate-wiring`**：`package.json` 的 `test:contracts` 末尾摘掉 `npm run test:i18n-orphan`。
   输出：`根脚本 test:i18n-orphan（node scripts/qa/verify-i18n-orphan.mjs…）既不在 test:contracts 链里、也不被 CI 按名整词执行 = 建了没人跑`，红点 `tests/gate-wiring.spec.mjs:150`，`EXIT=1`（证明 round-4 的「每个 test:* 必须被执行」棘轮真的咬）。
   还原：`sha256 dcf3ec4629b16ac3fcd39a7b4953de08ac397174061ce0e3a9ebc3e1ae82c0b6` 一致，门恢复绿。
5. **M5（门自带负对照）→ `verify-i18n-orphan`**：`--allow-orphans 1200` ⇒ `I18N_FAIL_ORPHAN 有 51 条超出棘轮 … I18N_RESULT=FAIL（孤儿 1251>允许 1200）`，`EXIT=1`（未改任何文件）。

**收尾状态**：`git status --porcelain -- package.json docker/ .github/ database/ tests/ scripts/qa/` 为空；三处被改文件哈希与审计前逐字节相同；本审计仅新增本报告文件。审计期间仓库被主线并发提交（HEAD 从 `5d7983ce` 前进到 `86e60646`），非我造成。
