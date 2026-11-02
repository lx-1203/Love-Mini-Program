# 第七轮审查 G2 车道：部署 / 可观测面复检（第六轮 G 发现与修复的真值）

- 仓库：`D:\6\恋爱小程序`（win32，Git Bash）
- 车道性质：只读复检。除本报告外未修改仓库任何文件；未跑 maven；未起容器（本机无 Docker 引擎）；未做任何 git 写操作。
- 本轮改动核对对象：`f998762d`（见第 0 节——它就是 HEAD）。

## 0) HEAD

| 项 | 读数 |
|---|---|
| `git rev-parse HEAD` | `f998762dfb008151ac841c2a31aab2742568b7ff` |
| `git log --oneline -1` | `f998762d fix(api,client,admin,gates): 第七轮——第六轮挂账 8 项全闭合 + 46 页契约三批次落地` |
| 结论 | 本轮要审的改动提交 `f998762d` **就是 HEAD**，盘上读数即该提交的真值，无需做「工作区 vs 提交」二分。 |

---

## 1) 七条复检（命令 → 读数 → 判定）

### 复检 1：`BackupNeverCompleted` 死告警 —— **已修〔`8d5aecb0`（写入端+规则前置）、`5d7983ce`（抓取常开）、指标暴露自 `a431b2b6`〕，静态面闭合；live 面仍需一次真跑**

第六轮 G 的 F6 口径：抓取端常开后，写入端在 cron 档不可写 ⇒ 序列恒缺 ⇒ 「既不告警也不报错」的死告警形态。

命令与读数：

1. `grep -rn "BackupNeverCompleted" docker/ docker-compose*.yml docs/ scripts/ tools/`
   命中 5 个载体（仓内无 `monitoring/`、`ops/`、`deploy/` 目录，实际目录为 `docker/` + 根级 compose）：`docker-compose.yml`（7 处注释）、`docker/prometheus/prometheus.yml`（3 处注释）、`docker/prometheus/rules/alert-rules.yml:294`（规则本体）、`scripts/backup-mysql.sh`（6 处注释）、`docker/backup/entrypoint.sh`（8 处，含播种与 LOUD 自检）。
2. 规则侧（`docker/prometheus/rules/alert-rules.yml:294-306`）：
   `expr: (time() - node_backup_last_success_timestamp_seconds) > 129600`，`for: 30m`，`precondition: "REQUIRES-PROFILE=backup（……抓取端已常开，与 monitoring profile 无关——那个 profile 已不存在）"`。表达式**无标签选择器** ⇒ 「标签值对不上」这一错配面不存在。
3. 写入端指标文本（`scripts/backup-mysql.sh` `write_textfile_metric()`，约 165-185 行）：写 `${BACKUP_TEXTFILE_DIR}/backup.prom`，内容为 `node_backup_last_success_timestamp_seconds`（gauge，**无标签**）与 `node_backup_last_exit_code`（gauge）——与规则引用的指标名**逐字一致**。退出时经 `report_and_exit()` 无条件调用（成功失败都写）。
4. 播种端（`docker/backup/entrypoint.sh:50-101`）：`mkdir -p … "${TEXTFILE_DIR}"` → 显式 `chown backup:backup "${TEXTFILE_DIR}"` + `chmod 775`（不再依赖 `chown -R /backups` 顺带覆盖）→ `[ -w ] && [ -d ]` 可写性自检（不可写打 LOUD）→ `/proc/mounts` 校验是真挂载点（防写到容器临时层）→ `backup.prom` 不存在时播种 `node_backup_last_success_timestamp_seconds ${seeded:-0}`。
5. 静态门：`npm run test:monitoring`（本轮实跑）EXIT=0，摘要含「textfile 写入端形状 11 种静默哑形态全可判红、落地前置 6 项已核」。

判定：**静态可判的死告警成因（没人写 / 目录不可写 / 两侧不同源 / 名字漂移 / 序列恒缺）已全数闭合，修复提交 `8d5aecb0`**（entrypoint 与规则前置的本轮 git log 均指向它；抓取常开是 `5d7983ce`；脚本侧指标暴露最早在 `a431b2b6`）。仍欠的不是代码而是读数：`--profile backup` 起一次真容器，证 ① 真 `-w` 成立 ② node-exporter 真把 `backup.prom` 解析成序列 ③ Prometheus `query=node_backup_last_success_timestamp_seconds` 非空（与复检 3 的 live 清单同跑可闭）。

### 复检 2：恢复命令少覆盖一个变量 —— **已修〔`8d5aecb0`，第六轮 W3 item 1〕；diff 对账见下，另有 2 个 P3 口径缺口记入新发现 N1/N2**

第六轮 F4 口径：文档 `MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}" scripts/restore-mysql.sh` 只换口令不换用户，`.env` 的 `MYSQL_USER=campus` 顶掉 root 兜底 ⇒ 认证必然失败。

diff 口径对账（命令 → 读数）：

- 脚本侧真实读取的外部变量（`grep -o '\${[A-Z_]*…}' scripts/restore-mysql.sh` 去内部变量后）：`MYSQL_HOST / MYSQL_PORT / RESTORE_MYSQL_USER / RESTORE_MYSQL_PASSWORD / MYSQL_ROOT_USER / MYSQL_ROOT_PASSWORD / BACKUP_ENCRYPTION_KEY / BACKUP_LIVE_SCHEMA / RESTORE_BIN / RESTORE_MYSQLBINLOG_BIN / RESTORE_ALLOW_MARIADB_BINLOG` 共 11 个；`MYSQL_USER / DB_USERNAME / MYSQL_PASSWORD` 仅用于「检测到业务账号就打 WARN」的提示分支（`restore-mysql.sh:176-193`），**不参与认证**。
- 文档侧命令（`doc/DEPLOYMENT.md:744-799、1389`；`doc/RUNBOOKS.md:145-155`）：全部为零覆盖形态（`set -a; . ./.env; set +a` 后直接调脚本，凭据走配对 B `MYSQL_ROOT_PASSWORD`）；配对 A 仅作为注释示例 `RESTORE_MYSQL_USER=dbadmin RESTORE_MYSQL_PASSWORD=…`。**「文档命令设了脚本不读的变量」= 0 处；「覆盖业务账号变量」= 0 处**；旧错写法在 DEPLOYMENT:744 与 RUNBOOKS:147-148 被显式点名「跑不通」。
- 文档表登记（`doc/DEPLOYMENT.md:514-522`）：第六轮缺的 `RESTORE_BIN / RESTORE_MYSQLBINLOG_BIN / RESTORE_ALLOW_MARIADB_BINLOG / BACKUP_LIVE_SCHEMA` 四项**全部入表**，另登记配对 A/B 两档与「MYSQL_USER/DB_USERNAME/MYSQL_PASSWORD 不参与恢复认证」的警示行；`:522-528` 新增「恢复脚本的宿主前置」（mysql/mysqlbinlog/openssl 二进制），补掉了第六轮第 70 行那两条 △ 缺口。
- 静态门：`npm run test:deployment-config`（本轮实跑）EXIT=0，摘要「恢复命令 6 处参数与脚本对账通过；脚本外部变量 10 个已登记进文档表且全部被脚本真读」。H 段三轴（前缀变量必须被脚本读 / 业务账号变量判红 / 长选项必须在 case 分支）+ 4 条自测负例在每次跑门时执行（`tests/deployment-config.spec.mjs:415-512`）。
- compose↔backup 脚本方向：backup 服务 env 的 `MYSQL_* / REDIS_* / BACKUP_*` 全部被 `scripts/backup-mysql.sh` 读取；**例外**：`DB_HOST / DB_USER / DB_PASSWORD / DB_NAME` 四键在 `backup-mysql.sh`、`docker/backup/entrypoint.sh`、`docker/backup/crontab` 三处 grep 均 0 命中（新发现 N1）。

判定：**F4 本体已修（提交 `8d5aecb0`），静态门钉住，脚本实测分支读数在 W3 报告（无凭据 rc=1 / 半对 rc=1 / 旧变量 rc=1 / 合规零覆盖 rc=0）**。残留为两个 P3 口径缺口（N1 死键、N2 MYSQL_HOST/MYSQL_PORT 未按恢复口径登记）与「`--apply` 真写库仍未演练」（RUNBOOKS 演练日志仍是 ⬜，属诚实登记不是缺陷）。

### 复检 3：textfile 目录落地的 5 项 —— **静态轴绿（本轮实跑）；「需真容器」那半仍缺 5 项，逐项点名**

先对口径：任务说的「5 项」是第六轮移交时的口径；W3b 实际交付的静态落地前置是 **6 项**（`reports/audit/round-6-fix-lane-W3-deploy.md:320-337` 的表），「live 判不出」是 **5 项**（同报告 ①–⑤）。门摘要自述「落地前置 6 项已核」与此一致。

- 门的名字与位置：`tests/monitoring-wiring.spec.mjs` 第 **6c 节**（「BackupNeverCompleted 的写入端形状」），npm 别名 `test:monitoring`，接在 `test:contracts` 链第 30 位（package.json `test:contracts` 展开含 `&& npm run test:monitoring`）。
- 本轮实跑：`npm run test:monitoring` → EXIT=0，读数全文见复检 1 第 5 条。静态 6 项判的是：backup 无非 root `user:`、无 `read_only: true`、播种文件是 `*.prom`、播种者与脚本写**同一个**文件名（防 duplicate 整目录不导出）、目录权限留 others 位、`.prom` 不被 chmod 成 others 不可读；另有 11 种静默哑形态判红与 15 行卷解析阳性对照（含 `${VAR:-default}` 内嵌冒号、Windows 盘符反例）。
- **仍缺的「需真容器运行」5 项**（W3b 点名，本轮复核声明不变——本机无 Docker）：
  1. 真容器里 `[ -w "${TEXTFILE_DIR}" ]` / `[ -d ]` 是否实际成立；
  2. bind 源 `./backups/node-textfile` 宿主不存在时 Docker 是否真按预期建目录（rootless / Docker Desktop 的 uid 映射会变形）；
  3. NFS/CIFS 类 root-squash 宿主会不会静默吃掉 `chown`（文档已点名「换到本地盘」，但未实测）；
  4. node-exporter 是否真把 `backup.prom` 解析成 `node_backup_*` 序列（含 `:ro` 挂载下 nobody 可读）；
  5. Prometheus 侧 `query=node_backup_last_success_timestamp_seconds` 是否非空、`/targets` 里 `job=node-exporter` 是否 UP。
  收口动作一条：`docker compose --profile backup up -d` 后查 `/targets` 与 `/api/v2/alerts`。

判定：**静态判据绿（已修，属 `8d5aecb0`/W3b 交付）；真容器 5 项原样挂账，一项都没少也没多**。

### 复检 4：CI 首跑三大假设 —— **静态可修的部分一项都没修；三项全部仍需首跑**

1. **flyway-mysql 插件依赖块**（第六轮 R1）：
   `sed -n '<flyway-maven-plugin 块>' apps/api/pom.xml`（240-262 行）——插件块只有 `<version>${flyway.version}</version>` + `<configuration>`（url/user/password/locations/ignoreMigrationPatterns），**没有自己的 `<dependencies>`**；`flyway-core`/`flyway-mysql` 仍只在项目 `<dependencies>`（47-54 行，compile）。`pom.xml` 最近一次提交是 `8d5aecb0`（本轮 diff 只动了注释时态，即 F2 修复），**插件依赖块自第五轮点名以来未动**。判定：**仍欠（静态一步之遥的修法没做）**——首跑若红，修法照旧：把 `flyway-mysql` 写进 flyway-maven-plugin 自己的 `<dependencies>`。
2. **runner `mysql` CLI**（第六轮 R2）：
   `sed -n '340,365p' .github/workflows/ci.yml`——db-integration 的 steps 依次为 checkout → setup-java → `Create an EMPTY schema`（`:360` 直接 `mysql --protocol=TCP -h 127.0.0.1 -P 3306 -uroot -pci-root-pass -e "CREATE DATABASE…"`），**中间没有任何安装 mysql 客户端的步骤**。ci.yml 最近提交仍是 `6d1222bd`（第四轮）。判定：**仍欠（无法静态判 ubuntu-latest 是否自带；若缺，首跑红在第一步且报错可辨）**。附带（非缺陷，第六轮已记）：口令写在进程参数 `-pci-root-pass`，与本仓 compose healthcheck 用 `MYSQL_PWD` 的自家规矩不同，属抛弃型口令的「示范反例」。
3. **Trivy HIGH/CRIT 与 cosign 推送闸**（第六轮 R3/R4）：
   - cosign 闸（`:435-461`）逻辑未动：未配 `secrets.COSIGN_PRIVATE_KEY` 且 `vars.ALLOW_UNSIGNED_IMAGES ≠ true` 时 push/workflow_dispatch 档**按设计必红**；盘上仍无 secrets/vars 镜像事实 ⇒ 判定：**仍需首跑（设计性红，动作是配密钥或显式放行，不是改 ci）**。
   - Trivy fs（`:467-481`）：API 与 Admin 两发，`severity: HIGH,CRITICAL`、`exit-code: 1`，无 ignore 文件。第六轮建议的「逐 advisory-id 钉住、只能变短的 Trivy 基线载体」**未建**——`tools/audit-prod-baseline.json` 存在但其 `_comment` 自述消费方是 `tools/audit-prod-ratchet.mjs`（pnpm audit 豁免基线），`tests/ci-contract.spec.mjs` 里 grep `trivy` 只有步骤配对/同文轴，**没有 Trivy 漏洞基线轴**。判定：**仍需首跑，且按盘上自认的 4 条修不掉的 high（ci.yml:104-110 注释）首跑大概率红，红了没有棘轮可挂**。
   - 静态可判部分：`npm run test:ci-contract`（本轮实跑）EXIT=0（`ci image scan contract ok`），钉的是结构事实（load/push 与扫描步骤 if 同文、digest 扫各恰一条、`@master` 禁用等）——这半边**本来就绿且未被本轮改动碰**。

### 复检 5：node-exporter 常开 + rootless Docker 宿主前置（`1e32ed8a`）—— **在盘、与 compose 一致**

- 文档段：`doc/DEPLOYMENT.md:331-340`（`grep -n rootless doc/DEPLOYMENT.md` 唯一命中区）。原文要点：常开带来的唯一新前置是挂宿主根（`/:/host:ro,rslave`，只读、`cap_drop: ALL`、端口只绑 `127.0.0.1`）；rootless / 禁挂 `/` 的宿主 `up -d` 会报挂载失败，正路两条（换 `--path.rootfs` 或停服务并连规则一起改写），并点名「不许靠注释抓取任务蒙过门——6b 节判点会红」。
- compose 侧逐项核对（`docker-compose.yml:679-737`）：`--path.rootfs=/host` ✓、`--collector.textfile.directory=/mnt/textfile` ✓、volumes `/:/host:ro,rslave` ✓、ports `127.0.0.1:${NODE_EXPORTER_PORT:-9100}:9100` ✓、`read_only: true` + `no-new-privileges:true` + `cap_drop: ALL` ✓、**无 `profiles:` 键**（全文件 `profiles:` 仅 2 处：`:538` client-h5、`:887` backup）⇒ 与 prometheus/grafana/alertmanager 同档常开 ✓。
- 来源提交核对：`git show 1e32ed8a --stat` = `doc/DEPLOYMENT.md` 单文件，提交说明与盘上段落同口径；其后 `8d5aecb0` 又动过 DEPLOYMENT.md，该段未被改丢（本轮读数即证）。

判定：**在盘且一致，不欠**。

### 复检 6：本轮改动（`f998762d`）的部署面扫描 —— **未触碰部署面（符合预期）；客户端改动被现有门覆盖（链绿引用+本轮抽跑）**

- `git show f998762d --stat`（32 files changed, 5553(+)/3427(-)）：逐文件归类为 `apps/admin/src/**`(2)、`apps/api/**`(6，含 2 个测试)、`apps/client/src/**`(16，含 9 个新/改 spec)、`reports/audit/**`(6)、`scripts/qa/**`(4)。**`docker/`、`docker-compose*.yml`、`.github/`、`tools/`、`doc/`、`scripts/`（非 qa）均 0 命中** ⇒ deploy / monitoring / CI 面零触碰，预期成立。
- 客户端改动的构建产物影响（`vip-plans.ts`、`wallet/index.vue`、`vip/index.vue`、`stores/vip.ts` 等）是否被 build-band/release 门覆盖：
  - `test:build-band`（`node apps/client/scripts/mark-build-band.mjs --self-test`）在 `test:contracts` 链内（package.json 链第 30 项前后，紧邻 `test:monitoring`）；本轮实跑 EXIT=0（`[bandmark][selftest] OK 5/5`）。
  - `test:release-gate` 本轮实跑 EXIT=0（`release gate contract ok`），亦在链内。
  - 链读数引用（HEAD 上的第七轮终验，`reports/audit/2026-11-01-round7-remediation.md:23-26`）：`test:contracts` 35 条 `CONTRACTS_EXIT=0`；客户端 `Test Files 166 passed (166)`、`Tests 1733 passed`；后端 `1909/0/11 BUILD SUCCESS`。钱包改动自带对应用例（提交内 `wallet-recharge-idempotency.spec.ts` +65 行）。
  - 边界（不构成新缺陷，登记）：包体积门 `verify-package-size` 不在链内（第六轮判 6 已记），本轮未重建 dist（现存档 mtime 2026-10-29/30），故 `vip-plans.ts` 等对最终包体积的影响尚无本 HEAD 的读数——发布前跑一次 size 门即可闭。

判定：**不适用→已核（部署面零触碰；构建面按链绿引用 + 本轮抽跑 build-band/release-gate 双绿）**。

### 复检 7：`@Auditable` 读维度静态门 —— **在链内绿（链读数引用）；3 个敏感 GET 端点注解在盘**

- 门的名字与位置：`apps/api/src/test/java/com/campuslove/api/admin/AdminSensitiveReadAuditStaticGateTest.java`（W1b-2 静态门：PII 载体 GET 必须「档位收紧 + 留痕」三不变量 + 6 组合成反证）与伴生的 `apps/api/src/test/java/com/campuslove/api/admin/audit/AuditAspectReadDimensionTest.java`（切面读维度）。两文件 grep `@EnabledIfSystemProperty|@Disabled` 均 0 命中 ⇒ surefire 无条件执行，随 `mvn test`/`mvn verify` 入链（CI api-test 与本地 `api:verify` 双通道）。
- 链读数引用（HEAD 终验）：`cd apps/api && ./mvnw -o -B test` → `Tests run: 1909, Failures: 0, Errors: 0, Skipped: 11`、`BUILD SUCCESS`（`reports/audit/2026-11-01-round7-remediation.md:24`）。
- 3 个敏感 GET 端点抽查（本轮读盘，`@GetMapping` 紧邻 `@Auditable`）：
  1. `AdminWhisperController.java:85-87`：`@GetMapping` + `@Auditable(value = AuditOperation.VIEW_WHISPER, targetType = "WHISPER", description = "管理端读取悄悄话列表（正文按档位收紧，读出规模由审计切面记入读范围快照）")`；
  2. `AdminConversationController.java:104-106`：`@GetMapping` + `@Auditable(value = AuditOperation.VIEW_CONVERSATION, targetType = "PRIVATE_CONVERSATION", …)`；
  3. `AdminRealNameController.java:82-84`：`@GetMapping` + `@Auditable(value = AuditOperation.VIEW_REAL_NAME_CERTIFICATION, targetType = "REAL_NAME_CERTIFICATION", …)`。
- 计量面：`grep -rn "@Auditable" apps/api/src/main/java | wc -l` = **87**（第六轮修复前口径 78 且全在写方法；读维度修复提交 `8d5aecb0`）。

判定：**已修〔`8d5aecb0`〕且在链内绿；0/0/0 的旧案三个端点全部有注解、档位判据（`isCurrentSuperAdmin`/`canSeeContent`）与掩码出口同格在盘**。

---

## 2) 新发现（3 条，均为 P3；无 P1/P2）

| # | 级 | 发现 | 证据 | 建议 |
|---|---|---|---|---|
| N1 | P3 | compose backup 服务 env 的 `DB_HOST / DB_USER / DB_PASSWORD / DB_NAME` 四键是**死变量**：`scripts/backup-mysql.sh`、`docker/backup/entrypoint.sh`、`docker/backup/crontab` 三处 grep 均 0 命中；文档变量表也无此四行。与第六轮 F4 恰为镜像方向（那次是「脚本读而文档不登记」，这次是「compose 传而脚本不读」）。无行为影响，但会让下一个人以为备份脚本消费 DB_* 一侧。 | `docker-compose.yml` backup.environment（DB_HOST: mysql / DB_USER: ${DB_USER:-root} / DB_PASSWORD: ${DB_PASSWORD:-…} / DB_NAME: …）；`grep -n "DB_HOST\|DB_USER…" scripts/backup-mysql.sh docker/backup/entrypoint.sh` RC=1 | 删除四键，或改回 MYSQL_* 单一口径；顺手在 deployment-config 门加一条「compose 传给 backup 的 env 键必须被脚本/entrypoint 读取」的结构判据 |
| N2 | P3 | 恢复脚本读 `MYSQL_HOST`（默认 127.0.0.1）/ `MYSQL_PORT`（默认 3306），但文档变量表没有 `MYSQL_HOST` 行、`MYSQL_PORT` 行（`doc/DEPLOYMENT.md:476`）只按 mysql 服务宿主端口口径登记，未提恢复脚本也消费它；门的 `SCRIPT_INPUT_VARS` 10 个清单同样不含这两个。默认值恰好与 compose 宿主映射一致所以实际可用——这是口径缺口不是跑不通。 | `scripts/restore-mysql.sh:62-63`；`tests/deployment-config.spec.mjs:649-660` | 把两键补进 SCRIPT_INPUT_VARS 与文档表（范围列写「宿主执行 restore-mysql.sh」），或显式声明「恢复固定连 127.0.0.1:3306，不读这两个键」并从脚本删掉 |
| N3 | P3 | 第六轮判 4 建议的「Trivy 侧 advisory-id 棘轮载体」至今未建：`tools/audit-prod-baseline.json` 自述消费方是 `tools/audit-prod-ratchet.mjs`（pnpm audit 专用），`tests/ci-contract.spec.mjs` 无任何 Trivy 漏洞基线轴。后果：CI 首跑 Trivy 大概率红（盘上自认 4 条修不掉的 high），红了只能现建基线或临时降级，与 pnpm audit 侧「有棘轮可挂」的处境不对称。 | `ci.yml:467-481`（fs 扫无 ignore）；`head -8 tools/audit-prod-baseline.json`；`grep -n trivy tests/ci-contract.spec.mjs`（仅步骤配对轴） | 照 audit-prod-baseline.json 的形状建 `tools/trivy-baseline.json`（逐 advisory-id、只能变短），并在 ci-contract 加「Trivy ignore 列表与基线文件一致性」轴；或先首跑拿真检出再定基线内容 |

---

## 3) 台账

### 本轮闭合（复检判「已修」）
| 项 | 修复提交 | 复检读数 |
|---|---|---|
| BackupNeverCompleted 死告警（写入端形状+播种+规则前置） | `8d5aecb0`（+抓取常开 `5d7983ce`、指标暴露 `a431b2b6`） | 规则↔指标名逐字一致、无标签错配面；`test:monitoring` EXIT=0（本轮实跑） |
| 恢复命令凭据配对（F4） | `8d5aecb0`（W3 item 1） | 文档零覆盖+配对 A/B；H 段门 6 处对账通过（本轮实跑 EXIT=0）；旧写法被文档点名 |
| textfile 静态形状轴+落地前置（F6 静态半） | `8d5aecb0`（W3/W3b） | 6c 节 11 形态可判红、落地前置 6 项已核（本轮实跑） |
| `@Auditable` 读维度 + 静态门（0/0/0 旧案） | `8d5aecb0`（W1b-2） | 87 处注解；3 端点在盘；链 1909/0/11 BUILD SUCCESS（HEAD 终验引用） |
| node-exporter 常开 + rootless 前置文档 | `5d7983ce` + `1e32ed8a` | 文档段与 compose 六项逐一对上（本轮实读） |

### 挂账外移（需 runner / 真容器 / 仓库设置，静态判不动）
| 项 | 现状 | 收口动作 |
|---|---|---|
| CI-R1 flyway-mysql 插件依赖块 | **未修**（插件块仍无 `<dependencies>`，第五轮点名至今） | 补进插件块（一步之遥），或首跑定性 |
| CI-R2 runner mysql CLI | 未装步骤，`ci.yml:360` 直用 | 首跑；缺则红在第一步、报错可辨 |
| CI-R3 cosign 推送闸 | 逻辑未动；secrets/vars 盘上无镜像事实 | 配 `COSIGN_PRIVATE_KEY` 或显式 `ALLOW_UNSIGNED_IMAGES=true` |
| CI-R4 Trivy fs HIGH/CRIT | 未建棘轮（N3）；盘上自认 4 条修不掉的 high | 首跑拿真检出 → 建 advisory-id 基线 |
| textfile live 5 项（W3b ①–⑤） | 原样挂账 | `docker compose --profile backup up -d` + 查 `/targets`、`/api/v2/alerts`、`query=node_backup_last_success_timestamp_seconds` |
| 恢复 `--apply` 真演练（RTO 计时） | RUNBOOKS 演练日志仍 ⬜（诚实登记） | 影子库真跑一次并回填日志 |
| 包体积门不在链 + dist 未随 HEAD 重建 | 第六轮判 6 遗留口径不变 | 发布前跑 `verify-package-size`（real 档） |

### 本轮新增
N1（P3）backup 服务 DB_* 四死键；N2（P3）restore 的 MYSQL_HOST/MYSQL_PORT 未按恢复口径登记；N3（P3）Trivy 棘轮载体未建。合计 3 条，无 P1/P2。

### 本轮未复现 / 判不出
- 一切需 Docker 的判据（compose run/exec 语义、textfile 属主、node-exporter 解析）：本机无 Docker 引擎，全部静态读数。
- CI 历史运行：无 gh 认证上下文，未查 run log；「从未有过读数」依据是静态定义 + 审计记录自述。
- secrets/vars、`.env` 值：按纪律只读键名与存在性，未取值。
