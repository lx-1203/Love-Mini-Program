# 第六轮审查 G 车道：部署 / 可观测 / 运维文档与事实的一致性

- 仓库：`D:\6\恋爱小程序`，HEAD `74e681ca`
- 车道性质：只读。除本报告外未修改仓库任何文件；未跑 maven、未跑任何会写盘的门、未起容器/构建（本机无 Docker）。
- 密钥纪律：全文只报键名与"空/非空/长度"，未读取也未打印 `.env` 的任何值；未跑 `docker compose config`。
- 读数标注：下面每条都区分【我跑的】、【我读到的原文】、【静态推断（无 Docker/maven，未能证实）】。

## 先落盘的只读判据读数（我跑了）

| 命令 | 读数 |
|---|---|
| `npm run test:monitoring` | ok：注册指标 70 个、被引用 21 个全部可追溯；Counter 裸名 0 处；告警表达式数据源核对 20 条，其中 4 条靠 node-exporter（job 活跃、过期声明 0 条）；receiver 4 个、引用 3 个全部已定义。EXIT=0 |
| `npm run test:deployment-config` | ok：`:?` 必填 11 个全部对应空值示例；文档 compose 命令变量 60 个可插值名对账通过；镜像字面量全部对齐。EXIT=0 |
| `npm run test:docs` | ok ×3 行：client 命令 2 条、node 主版本 20、文档引用 127 条路径与锚点全部可解析（覆盖 18 个 markdown，历史豁免 3 个文件）。EXIT=0 |
| `npm run test:env-release` | `ENVCHECK_SELFTEST=PASS cases=10 负例可红=是`（自测档，不是真机读数） |
| `npm run test:ci-contract` | `ci image scan contract ok`。EXIT=0 |
| `npm run test:gate-list-sync` | `GATESYNC_RESULT=PASS（判点数=14，不一致=0）`；`GATESYNC_ORPHANS=3 baseline=3`（存量孤儿：verify-logged-in-landing.mjs、verify-openqueue-lanes.mjs、verify-evidence-integrity.mjs） |
| `node scripts/verify-package-size.mjs`（默认被测物） | `PACKAGE_SIZE_BAND=MODE:mp-weixin API:real`；主包 35.83MB、总包 36.93MB ⇒ `PACKAGE_SIZE_RESULT=FAIL`，真实退出码 1（另法取 RC，避开管道吞码） |
| `node scripts/verify-package-size.mjs apps/client/dist/build/mp-weixin-real` | `PACKAGE_SIZE_BAND=MODE:real API:real`；主包 1.64MB、总包 2.75MB、`PACKAGE_SIZE_RESULT=PASS`，清单条目 294 / 出包 15.48MB / 桶内残留 0。被测档 mtime=2026-10-29（本轮未重建） |

本仓 compose 现役 profile 集合实测只有两个：`client-h5`（docker-compose.yml:517-518）、`backup`（844-845）。

---

## 判 1 复量本批改过的四处注释

四处本身都不再说反话，但其中两处旁边的"隔壁"仍在说：

1. `docker/prometheus/prometheus.yml` 头注（14-18 行）称 node-exporter 抓取【常开】——与同文件 77-81 行的活跃 `job_name: node-exporter` 一致；头注 11 行称"移除 mysql-exporter / redis-exporter / blackbox-http 抓取任务"也与盘上一致（全文再无这三个 job，连注释态都没有）。**这处改对了。** 反话在 DEPLOYMENT.md（见发现 F3）。
2. `docker/prometheus/rules/alert-rules.yml` 前置声明：`INERT-WITHOUT-SCRAPE=node-exporter` 已删（215-221 行改为"数据源在位"），`BackupNeverCompleted` 保留的 `REQUIRES-PROFILE=backup`（288 行）与 compose 现役 profile 事实一致，且该句明写"那个 profile 已不存在"，与 compose 只剩 `client-h5`/`backup` 吻合。**这处改对了。** 残留：`doc/CHANGELOG.md:337` 仍以现役口吻写"Prometheus + Grafana + Alertmanager 部署（docker-compose 集成，`--profile monitoring` 启用）"——那是历史条目，但它是本轮之后**第三处**还在指着一个已不存在的 profile（低severity，见 F4 附带）。
3. `docker-compose.yml` flyway 载具段：**只改了一半**（发现 F1）。
4. `README.md` 链口径：384-386 行改为"刻意不写几项"，并把链条完整性交给 `test:gate-wiring`。**这处改对了。** 我复量：`test:contracts` 展开=35 条 npm 调用（逐条列出核对）；`README.md` 与 `doc/` 全量 grep 无写死的链条数（`34 项/35 项` 只出现在 `reports/audit/` 历史读数里，不是现役承诺）。附带风险登记在 F7 末尾：链从 34→35 是因为新接了 `test:typecheck`，而这一条**从未有过 CI 侧读数**。

### F1 docker-compose.yml 同文件内两处对 `flyway-maven-plugin` 说相反的话（P1）

- 现象：本轮把"compose 否认 pom 里有 flyway-maven-plugin"改成承认，但只改了文件头那一段；同一个文件里 `migrate` 服务上方的注释仍是旧的反话。
- 证据（原文）：
  - `docker-compose.yml:45-46`：「注意 apps/api/pom.xml 第四轮起也声明了 flyway-maven-plugin（版本钉 ${flyway.version}…），因此 `./mvnw flyway:migrate` 同样可用。」
  - `docker-compose.yml:218-220`：「…而 apps/api/pom.xml 并无 flyway-maven-plugin——所以不能用 ./mvnw flyway:migrate」。
  - 盘上事实：`apps/api/pom.xml:238-247` 确有 `<artifactId>flyway-maven-plugin</artifactId>` + `<version>${flyway.version}</version>`；`doc/DEPLOYMENT.md:542-544` 也写"现已声明…因此 `./mvnw flyway:info|migrate|repair` 可直接使用"。即：一份文件里一句话对、一句话错，且错的那句还带着"所以不能用"的结论。
- 影响：运维在 `migrate` 服务出问题时正好读的是这一段（它离报错最近），会放弃唯一的宿主侧补跑路径，只做容器侧折腾；`ci.yml:375` 已经在用 `mvn flyway:migrate`，注释与 CI 事实互相打脸。
- 严重度：P1（文档自证相反，且误导点在故障现场）。
- 建议修法：把 218-220 行改写为与 45-46 同源的一句话，并显式保留真正的约束（"两条载具都在，但同一时刻只许一个写者；mvnw 不读 Spring 配置，必须显式传 placeholders"——这句 47-48 行已经写对了，抄下来即可）。判点建议：给 `tests/deployment-config.spec.mjs` 加一条按 YAML 结构+注释行的对账——凡 compose 文本里出现 `flyway-maven-plugin`，其在 pom 中的存在性必须与句子的肯定/否定极性一致（结构命题，静态可判）。

### F2 apps/api/pom.xml 的插件注释用现在时态说"本 pom 从未声明该插件"（P2）

- 现象：插件是本轮加的，但"为什么要加"的说明句留在改动前的时态，读起来像插件不存在。
- 证据：`apps/api/pom.xml:231-234`「Flyway Maven 插件（2026-10-30 补）。doc/DEPLOYMENT.md 的迁移排障步骤一直写着 `./mvnw flyway:info` 与 `./mvnw flyway:repair`，**但本 pom 从未声明该插件**——照文档执行会直接得到 "No plugin found for prefix 'flyway'"」；紧接 238 行就是该插件的声明。
- 影响：比 F1 轻（同一段落里有"2026-10-30 补"作时间锚），但同属"修好一处、句子还在说反话"；且它把 DEPLOYMENT 的正确文档说成死路。
- 严重度：P2。
- 建议修法：把该句改成过去时（"改动前本 pom 未声明…现已补上"），并保留它查出的事实价值（那句 "No plugin found for prefix" 是当时真实现象）。

（判 1 复量结论：四处中 3 处（prometheus.yml 头注、alert-rules 前置、README 链口径）改齐且无新说谎；第 4 处（compose flyway 段）只改了一半=F1，并在 pom 内留下同族 F2。）

---

## 判 2 文档 ↔ 脚本/载体命令对账（扩面）

逐条把文档里写的命令对到载具实际接受的参数上。完整表，✓=对得上：

| 文档写的命令（出处） | 载具实际接受 | 结论 |
|---|---|---|
| `scripts/backup-mysql.sh --dry-run`（RUNBOOKS:123、DEPLOYMENT:672） | 脚本参数只有 `--dry-run` / `--help|-h`，其它一律 `Unknown argument` + exit 1（backup-mysql.sh:226-243） | ✓ |
| `scripts/restore-mysql.sh --artifact … [--point-in-time] [--target-schema] [--apply]`（RUNBOOKS:127-129、DEPLOYMENT:692/699/732/1262） | 解析器接受 `--artifact/--manifest/--binlog-dir/--target-schema/--point-in-time/--start-position/--apply/--allow-live-target/--skip-checksum/--help`（restore-mysql.sh:98-112） | ✓ 旗标名全部存在 |
| `docker compose run --rm migrate info` / `migrate migrate`（DEPLOYMENT:566/569） | `migrate` 服务 image=flyway/flyway:10.10.0-alpine，ENTRYPOINT 即 flyway，`command: ["migrate"]` 会被 run 的参数覆盖（compose:224-264） | ✓ |
| `MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}" scripts/restore-mysql.sh …`（DEPLOYMENT:691-692、698-700、732、1262） | 脚本的用户取 `MYSQL_USER`，默认 root；而第 0 步 `set -a; . ./.env` 已把 `MYSQL_USER=campus` 灌进环境（.env.example:79），脚本第 52 行的 root 兜底**永不生效** | ✗ 见 F4 |
| `scripts/restore-mysql.sh --artifact … --target-schema campus_love_drill --apply`（RUNBOOKS:128-129，**不含任何 MYSQL_* 覆盖**） | 同上：用户=campus、口令=campus 口令；APPLY 第一步是 `CREATE DATABASE IF NOT EXISTS campus_love_drill`（restore:326） | ✗ 见 F4 |
| `docker compose --profile backup run --rm backup /backup.sh [--dry-run]`（DEPLOYMENT:669-672、RUNBOOKS:123-124） | `run` 覆盖服务 `command`，而 bash/openssl/mysql-client 的安装**只在那条 command 里**（compose:810-811）；脚本 shebang 是 `#!/usr/bin/env bash`（backup-mysql.sh:1） | ✗ 见 F5 |
| DEPLOYMENT 环境变量清单表（433-490） | 脚本真实读取的 `RESTORE_BIN` / `RESTORE_MYSQLBINLOG_BIN` / `RESTORE_ALLOW_MARIADB_BINLOG` / `BACKUP_LIVE_SCHEMA` 未登记（restore-mysql.sh:52-58、116-117、167-175），只写在脚本头注释里 | △ 缺口（表自称"与 .env.example 对齐"，而 .env.example 也没有这四项） |
| DEPLOYMENT/RUNBOOKS 未把"宿主要有 `mysql`/`mysqlbinlog`/`openssl` 二进制"列为前置 | 脚本 dry-run 阶段就 `command -v mysql`+`command -v mysqlbinlog` 硬检查（restore:116-117） | △ 缺口：照文档在一台只有 Docker 的机器上第一步就 die |

### F3 DEPLOYMENT.md「监控与告警」整节与 prometheus.yml / alert-rules.yml 大面积不一致（P1）

- 现象：本轮只订正了 prometheus.yml 文件头和 alert-rules 的前置声明，但 DEPLOYMENT 里**描述同一件事的另一节**（1005-1034 行）从没跟着复量，其中三类陈述与盘上事实相反。
- 证据（我读到的原文 vs 盘上事实）：
  1. 抓取目标清单 `doc/DEPLOYMENT.md:1022-1024` 把 `mysql-exporter`、`redis-exporter`、`blackbox-http` 列为"Prometheus 默认抓取以下目标"；而 `docker/prometheus/prometheus.yml:11-13` 明写这三个任务**已被移除**（"compose 未部署对应服务，target 永久 DOWN 产生无效告警"），全文也确实没有这三个 job（含注释态）。`doc/RUNBOOKS.md:34` 更进一步教运维"取消 prometheus.yml 中 blackbox-http 抓取任务注释"——**要取消注释的那段注释已经不存在**，照做的人找不到落点。`doc/DEPLOYMENT.md:1003` 还把"Prometheus blackbox 探针"当作后端健康检查的现役手段。
  2. 告警名清单 `doc/DEPLOYMENT.md:1031-1034` 列的 8 个名字里，`MysqlDown`、`RedisDown`、`JvmMemoryHigh`、`JvmGcPauseHigh`、`MatchSuccessRateLow`、`ChatMessageLatencyHigh`、`AuthFailureSpike` 在 `alert-rules.yml` 中**一个都不存在**（现役 20 条实名：ApiDown/ApiHealthCheckFailed/ApiHighLatencyP99/P95/ApiSlowAverageResponse/ApiHighErrorRate/ApiHighClientErrorRate/JvmHeapMemoryHigh/JvmThreadsHigh/JvmFrequentFullGc/DbConnectionPoolHigh/DbSlowQuery/HostDiskHigh/HostMemoryHigh/HostCpuHigh/BackupNeverCompleted/HighLoginFailureRate/PaymentCallbackFailure/ChatMessageSendFailure/MatchRecommendSlowP99）；`AdminDown` 存在但是注释态（规则文件 49-58 行）。同族：`doc/RUNBOOKS.md:39` 用 `ApiLatencyHigh`、`:58` 用 `JvmHeapHigh`，也都不存在（实名 ApiHighLatencyP99 / JvmHeapMemoryHigh）。
  3. 阈值口径 `doc/DEPLOYMENT.md:1032` 写 `HostDiskHigh（>85%）`、`HostMemoryHigh（>90%）`；规则实际是 `> 0.8`（230 行）与 `> 0.85`（244 行）。附带：`alert-rules.yml:5` 的原则句"触发后 5 分钟内持续异常才告警"与同文件里 `for: 10m/15m/30m` 以及 `PaymentCallbackFailure` 根本没有 `for:`（356-359 行）也不吻合。
  4. 端口 `doc/DEPLOYMENT.md:1012` 表格给 Grafana 写 3000，而同一文档 :307 与 compose 宿主映射是 3001（容器内 3000/宿主 3001 的口径没标）。
- 影响：这是运维照着做的两本手册之一；告警名对不上意味着"照文档去查这条告警"落到空集，`取消注释` 类指令已不可执行，阈值差 5-10 个百分点会让人误判"还没到线"。
- 严重度：P1（形状与本轮判出的四处同类，规模更大）。
- 建议修法：1016-1034 行按 `prometheus.yml` 的活跃 job 集合与 `alert-rules.yml` 的实名+实阈值重写；RUNBOOKS:34 改为"新增 blackbox-http 抓取任务（当前文件里已无该段）"。判点建议（结构命题，静态可判，无需 live Prometheus）：在 `tests/monitoring-wiring.spec.mjs` 加一节，把 `doc/DEPLOYMENT.md`/`doc/RUNBOOKS.md` 里以反引号或驼峰形式出现的 `alert:` 实名与规则文件实名做双向对账（文档引用了不存在的告警名=红；规则新增告警而文档清单没更新=同样红），并把"取消注释"类措辞要与 `prometheus.yml` 中是否真有该注释态 job 绑定。

### F4 文档里的恢复命令用户/口令配对是错的，两条文档命令各错一种（P1）

- 现象：`restore-mysql.sh` 的凭据是 `MYSQL_USER` + `MYSQL_PASSWORD` 一对，而文档只换口令不换用户。
- 证据：
  - 脚本：`MYSQL_USER="${MYSQL_USER:-root}"`（restore:52）、`MYSQL_PASSWORD` 必填否则 die（:139），两者一起写进 `--defaults-extra-file`（:143-151）。
  - `doc/DEPLOYMENT.md:690-692`：`set -a; . ./.env; set +a` 之后 `MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}" scripts/restore-mysql.sh …` —— 第 0 步已经把 `.env` 的 `MYSQL_USER=campus`（.env.example:79）灌进环境，所以这条命令实际是 **user=campus + root 口令** ⇒ 认证直接失败（Access denied for user 'campus'）。同一形状出现在 :698、:732、:1262 四处。
  - `doc/RUNBOOKS.md:118-129` 的「恢复演练（可执行版）」连口令覆盖都没有 ⇒ user=campus + campus 口令，认证能过，但 APPLY 第一步 `CREATE DATABASE IF NOT EXISTS campus_love_drill`（restore:326）需要 CREATE 权限；本仓应用账号 `campus` 无建库权限（第五轮同机实测记录，本机 MySQL 8.0.45 在跑但 campus 无 CREATE；本轮为只读车道，未再连库复验 ⇒ 标"继承值，待复量"）。第二步还有 :292-293 自己写明的 `SET SESSION sql_log_bin=0` 需要 SUPER/SESSION_VARIABLES_ADMIN，应用账号同样没有。
  - 正确形状在本仓自己就有：`docker-compose.yml:734-738` 的 backup 服务同时显式覆盖 `MYSQL_USER: root` + `MYSQL_PASSWORD: ${MYSQL_ROOT_PASSWORD:?…}`，并配注释说明"引用上方已强制校验的 root 口令"。文档漏了用户那一半。
- 影响：照 DEPLOYMENT 跑＝认证失败；照 RUNBOOKS 跑＝影子库建不出来。两条都是"文档命令 + 现成凭据 ⇒ 跑不通"，而且失败点正好在 `--apply`（唯一有副作用的一档），运维会在那里反复试、进而倾向加 `--allow-live-target` 去动真库——这是最坏的方向。
- 严重度：P1。
- 建议修法：统一成一行显式 DBA 凭据：`MYSQL_USER=root MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}" scripts/restore-mysql.sh …`（四处一起改，RUNBOOKS 那三步补上同一对），并在脚本头部把"需要 CREATE + SESSION_VARIABLES_ADMIN/SUPER"列为前置。判点建议：`tests/deployment-config.spec.mjs` 已经在对账 `docker compose` 命令的变量，可用同一把尺扩到 `scripts/*.sh` 文档命令——凡文档调用 restore/backup 脚本，`MYSQL_USER` 与 `MYSQL_PASSWORD` 必须**成对**出现在同一行前缀里（结构命题，静态可判）。

### F5 备份的手动触发/演练命令绕过了装依赖的那条 command（P1）

- 现象：`docker compose --profile backup run --rm backup /backup.sh` 是文档里唯一的"立即跑一次备份"和恢复演练第 1 步，但 `run` 不会执行服务 `command`，而 alpine 基础镜像里**没有 bash**。
- 证据：`docker-compose.yml:810-811` 服务 command 才做 `apk add --no-cache bash openssl mysql-client~10.11 redis~7.2 gzip tini`；镜像是 `alpine:3.19.4`（:717）；脚本第一行 `#!/usr/bin/env bash`（backup-mysql.sh:1），compose 自己的注释也说"补 bash —— backup-mysql.sh 用 `#!/usr/bin/env bash`…alpine 基础镜像默认只有 busybox sh，缺 bash 会让脚本根本无法执行"（:804-807）。同文件 :815-816 还把 crontab 写入与 `su backup` 也放在这条 command 里。`doc/DEPLOYMENT.md:561-562` 恰恰解释了 `run` 会覆盖服务 command（用于 migrate 那段），却没有把同一条规则用到 backup 上。
- 影响：手动备份/演练一步即失败（`/usr/bin/env: bash: No such file or directory` 一类），而且失败信息完全指不到真实原因（缺包）；与 F4 叠在同一节文档里，运维会以为 backup 链路根本不可用。
- 严重度：P1（静态推断，未证实：本机无 Docker，没跑过 `compose run`）。
- 建议修法：把依赖安装从 `command` 移到镜像构建期（自建薄镜像）或在文档命令里显式带上安装步骤，例如 `docker compose --profile backup run --rm --entrypoint sh backup -c 'apk add --no-cache bash openssl mysql-client~10.11 gzip && /backup.sh --dry-run'`；同时在 DEPLOYMENT 的 backup 小节复述"`run` 不跑 command"这条自家规则。

### F6 备份指标写入端在 cron 档不可写，`BackupNeverCompleted` 因此可能常年无序列（P2）

- 现象：抓取端本轮已常开，规则的前置也如实改成"只剩 `--profile backup`"；但**写入端还多一个没被任何文档写下的前置**：落 textfile 的那一步以非 root 用户跑，而那个 bind 目录没被 chown。
- 证据：backup 容器写 `BACKUP_TEXTFILE_DIR`（默认 `/mnt/node-textfile`，backup-mysql.sh:148、compose:768）；compose 挂载 `./backups/node-textfile:/mnt/node-textfile`（:781，node-exporter 侧以 `:ro` 读同一宿主目录到 `/mnt/textfile`，:680/:686）；而服务 command 里的 `chown -R backup:backup` 只覆盖 `/etc/crontabs /backup /backups`（:814），**不含 `/mnt/node-textfile`**，crond 又以 `su backup` 非 root 运行（:816）。脚本的写入条件是 `[[ -d … && -w … ]] || return 0`（:172）——不可写就静默不写，`STATUS_HAS_SINK` 保持 0，只在 `BACKUP-STATUS=… signal_sink=0` 那行日志里露一下（:214-217）。注意 `docker compose run`（手动档，root）能写、cron 档（backup 用户）不能写 ⇒ "手动跑过一次有图、每天其实一直没图"。
- 影响：`BackupNeverCompleted` 表达式是 `time() - node_backup_last_success_timestamp_seconds > 129600`（rules:279）——无序列时 Prometheus 不评估空向量，与本轮刚修的"死告警"完全同形，只是成因从"没抓"换成了"没人写"。
- 严重度：P2（静态推断，本机无 Docker 未证实）。
- 建议修法：command 的 chown 追加 `/mnt/node-textfile`（或改 `runAsUser`）；把 `signal_sink=0` 从一行 WARN 升级为非零退出或独立告警条件；文档 RUNBOOKS:80-85 补一句"cron 用户必须对 textfile 目录可写，否则本链照样是哑的"。
  - 补充（同一处文档内部也自相矛盾，可直接当作修法依据）：`doc/DEPLOYMENT.md:354` 用的是 `docker compose --profile backup exec backup /backup.sh`（exec 进已起容器，bash 已由 command 装好，能跑），而 :357/:361 与 :669-672、RUNBOOKS:123-124 用的是 `run`（新容器，没 bash）。同一节里两种写法并存，运维按哪一条都会有一半概率失败。

---

## 判 3 告警链路自证：能证"数据源有人抓"，证不了"表达式/标签写得对"

- `tests/monitoring-wiring.spec.mjs` 现役判点（我通读全文并按节核对）：
  1 抓取链四要素在场；2 面板/规则的指标名可追溯到 `*Metrics.java` 注册名（含 `_total` 与平台前缀白名单）；2b Counter 必须写导出名＋三条自测；3 route→receiver 已定义；4 `NO-ALERT-CHANNEL-CONFIGURED` 哨兵与渠道真值双向；5 每条 `runbook:` 的文件与锚点真实存在；6 表达式数据源所属 job 是否活跃＋过期/缺失声明双向（含 3 条合成分支自测）；6b node-exporter job 活跃、与 prometheus 的 profiles 同档、哨兵词反向对账。
  本轮读数：EXIT=0，`告警表达式数据源核对 20 条，其中 4 条靠 node-exporter`。
- 能力上限（诚实版）：以上全是**结构命题**——"某个名字有没有人生成"。它证不了两件事：(a) 表达式在语义上真的会触发（阈值/`for`/除零/空向量），(b) 触发送到人手里之后**描述能不能渲染**。
- 盘上现在就有一条 (b) 的实例，见 F7。

### F7 三条告警的 `annotations` 引用了表达式证明不可能存在的标签（P2）

- 证据（我读到的原文 + 注册端事实）：
  1. `ApiHealthCheckFailed` 的 description：「组件 {{ `$labels.component` }} 健康检查失败」（rules:43）。而它的数据源 `app_health_status` 由 `apps/api/.../monitor/HealthMetrics.java:51-55` 注册，**唯一标签是 `status`**（全文件 grep `component` = 0 命中）。⇒ 该告警真触发时描述渲染成"组件  健康检查失败"，运维拿不到组件名。
  2. `PaymentCallbackFailure` 的 description 引用 `{{ $labels.reason }}`（rules:364），但表达式是 `sum(increase(payment_callback_failure_total[5m])) > 0`（358 行）——`sum()` 无 `by` 会**丢弃全部标签**，`reason` 在结果向量里必然不存在（标签本身是注册过的：PaymentMetrics:82 `.tag(TAG_REASON, …)`）。
  3. `ChatMessageSendFailure` 同形：description 引用 `{{ $labels.reason }}`（378 行），表达式 `sum(rate(chat_message_failed_total[5m])) > 0`（371 行）。
  对照组（证明这不是我的正则串读）：`ApiHighErrorRate` 用 `by (uri)` 且只引用 `$labels.uri`（117-125 行）、`HostDiskHigh` 不聚合且引用 `$labels.mountpoint`（230-237 行）——这两条是对的。
- 影响：不影响触发，只影响"响了之后有没有信息量"。资金类（支付回调）与消息类两条恰好是最需要 reason 的；运维收到"原因 "空值会退回到人肉翻日志，而这正是本车道判的"可观测文档↔事实一致性"的同一缺陷族（写对了名字、写错了标签）。
- 严重度：P2（不会漏告警，会让告警不可用）。
- 建议修法：要么在表达式里保留标签（`sum by (reason) (increase(...))`），要么把 description 改成不带 reason 的写法并点名"聚合后无 reason"。
- 判点建议（回答"有没有一条路能在无 live Prometheus 情况下钉住表达式写错列名/标签"）：**是结构命题，可以在现有静态门里钉住**，具体两把尺：
  1. 标签可达性：对每条规则，解析 `annotations.description/summary` 里全部 `{{ $labels.X }}`，与表达式输出标签集合做对账——输出标签 =（源指标已知标签集）∩（`by`/`without` 分组，若存在最外层聚合则以其为准）∪（`labels:` 块与抓取时注入的 `job/service/instance`）。源指标已知标签集可从 `*Metrics.java` 的 `.tag("k", …)` 抽（本门已有扫 java 的载具），平台指标维护一张小表（`http_server_requests` 的 `uri/status/method`、`hikaricp_*` 的 `pool`、`node_*` 的 `mountpoint/instance`、`jvm_*` 的 `area`）。**必须有阳性对照**：拿本条真实缺陷（`reason` 被 `sum()` 丢掉）当"必须红"的夹具，再拿 `ApiHighErrorRate`（`uri` 可达）当"必须绿"的夹具，否则又是一条空转判点。
  2. 选择器标签存在性：规则里 `{k="v"}` 的每个 `k` 必须属于该指标的已知标签集（能抓 `status=~"5.."` 这类写错成 `state=` 的漂移）。
  - 明确说清这把尺**证不了**的：阈值合不合理、`for` 时长够不够、除零、空向量语义、Alertmanager 真的把消息投出去。那些要么需要 live Prometheus/Amtool（本机没有），要么需要按本仓历史基线做人工裁定，不属于静态门能力，别把静态绿当成"告警已验证可触发"。

---

## 判 4 CI 侧：静态门已钉住 vs 只能等 runner

`tests/ci-contract.spec.mjs` 本轮读数 EXIT=0（`ci image scan contract ok`）。它实际钉住的是这些**结构**事实（逐条从门里读出来）：GitHub Actions 表达式里不许 `.split()`；`build-api`/`build-admin` 步骤 id 唯一、`with.load`/`with.push` 必须与对应 Trivy 扫描步骤的 `if` **同文**（本地扫 vs digest 扫各恰一条）；metadata 只产单一 tag（`type=sha` 禁用、`type=raw` 恰 2 处）；build context 与 Dockerfile 的 COPY 源自洽（含"context=./apps/admin 必缺文件"的负对照）；`db-integration` 必须存在、services 恰为 mysql+redis、必须真跑一次 `flyway:migrate`、fresh-schema 步骤 ≥2；`e2e-real` 自带 mysql+redis、必须点名 `real-stack-smoke.spec.ts`、必须设 `E2E_API_MODE=real`；凡以 `E2E_API_MODE … 'real'` 自跳过的 spec（现 6 条）必须在 CI 被点名，否则红；mock `e2e` 的 `needs` 必含 `gitleaks-scan`；资产覆盖门在 CI 恰一发且必须 `--source-only --selftest`（禁 `--base`）；`@EnabledIfSystemProperty` 的属性名必须出现在某条 `mvn test` 且**同一行** `-Dtest=` 点名该类，属性门数量 ≥2，`apps/api/src/test` 里 `@Disabled` 恒 0；禁 `-Dsurefire.failIfNoSpecifiedTests=false`；凡 `SPRING_PROFILES_ACTIVE=real` 的 job 必须显式给 `ADMIN_OPENID` 与 `ADMIN_INITIAL_PASSWORD_HASH`；根 package.json 必须声明 `@playwright/test`/`@axe-core/playwright` 且 CI 用 `pnpm exec` 而非 `npx`。
另有 `tests/gate-wiring.spec.mjs` 钉"每条 `test:*` 要么在 `test:contracts` 链里、要么被 CI 按名整词执行"，`tests/docs-contract.spec.mjs` 钉文档 node 主版本=CI/engines=20。

### 只能等 runner 的假设（按 job 盘查 ci.yml 全部 13 个 job 后列出）

| # | job | 静态门无法判定的假设 | 我查了什么（读不到算不了的部分） |
|---|---|---|---|
| R1 | db-integration | `mvn -B -f apps/api/pom.xml flyway:migrate` 能不能连上 MySQL：**flyway-mysql 是否在 plugin classloader 上** | `apps/api/pom.xml` 里 `flyway-core`/`flyway-mysql` 只挂在项目 `<dependencies>`（47-54 行，compile），插件块（238-260 行）**没有自己的 `<dependencies>`**。Flyway 10 的 MySQL 支持是独立模块，能不能落到插件类加载器取决于 flyway-maven-plugin 自身是否声明 `requiresDependencyResolution`——那是别人 artifact 的属性，本机不跑 maven 就无从判定。这正是第五轮点名"至今没有读数"的两个假设之一，本轮**仍未消除**。 |
| R2 | db-integration | runner 是否恒带 `mysql` / `mysqladmin` CLI | `ci.yml:360` 直接 `mysql --protocol=TCP …`，前面只有 `actions/setup-java`，没有任何安装客户端的步骤；`ubuntu-latest` 的自带软件集合是 GitHub 侧事实，本地不可查。另一个次要形状：那条命令把口令写在进程参数（`-pci-root-pass`），与本仓自己的规矩（compose healthcheck 专门用 `MYSQL_PWD`）不一致——CI 里是抛弃型口令，不构成缺陷，但构成"文档示范反例"。 |
| R3 | security-scan | 推送闸会不会红：取决于**仓库设置**里 `secrets.COSIGN_PRIVATE_KEY` 与 `vars.ALLOW_UNSIGNED_IMAGES` 的实际值 | `ci.yml:455` 的 fail 步骤条件是 `mode=='refuse' && github.event_name != 'pull_request'`。静态可读的是：PR 事件不受影响；push/workflow_dispatch 在未配密钥且未显式放行时**按设计必红**。secrets/vars 是否已配，盘上没有镜像事实。 |
| R4 | security-scan | Trivy `scan-type: fs` 扫 `apps/api` 与 `apps/admin` 以 `severity: HIGH,CRITICAL`、`exit-code: 1` 能不能过 | `ci.yml:467-481`。静态可推断的依据：同一文件 :104-110 自己承认 prod 依赖里有 **4 条无法修的 high**（uni-app alpha 锁 vue 3.4 + vue-i18n 9.x），为此把 `pnpm audit` 降级成"critical 硬失败 + high 走基线棘轮"。Trivy 的 fs 模式扫的是同一批 lockfile/manifest，OSV 数据源大概率同样命中 ⇒ 本 job 从未有过读数却是硬失败档。 |
| R5 | lint-and-structure | `npm run test:contracts`（现 35 条）在 pnpm 装的树上跑不跑得完，尤其新接入的 `test:typecheck`（`npm --workspace apps/client run typecheck`） | 静态可核的部分已过：生成物 `apps/client/src/services/generated/api-types.ts` 是 tracked（`git ls-files` 命中），typecheck 不会因为"CI 没跑 generate"而缺文件；CI 安装用 `pnpm install --frozen-lockfile`，链里混用 `npm --workspace` / `npm run`。真读数需要 runner；本机 typecheck 我只读车道未跑 ⇒ **未复现**。 |
| R6 | api-compile / api-test / phase01-verify | 60 分钟窗口内 `mvn verify` 跑不跑得完；`verify:phase01` 里 `npm run test` 已含 `api:verify`、其后又跑一次 `api:verify` + `verify:client-builds`（重复重量） | 只有 job 定义可读，无历史运行读数可取（本机无 gh 认证上下文，未查 API）。 |
| R7 | e2e / e2e-real | 六条 real spec 与整套 mock spec 在真实栈下的通过性；`e2e-real` 依赖 api 启动时自动迁移（`FLYWAY_ENABLED` 默认 true，application-real.yml:78），而 compose 档是 false ⇒ 两环境迁移主体不同 | 该形状已在 DEPLOYMENT:408-418 的"CI ≠ compose"表里诚实登记（认证插件、JDBC 参数、compose 链路从未证明），我复核该行与 compose:104/application-real.yml:78 一致 ⇒ 文档没说谎。 |
| R8 | gitleaks-scan | `docker run gitleaks/gitleaks:v8.18.4` 的检出结果 | 依赖 runner 上的 Docker 与镜像可达性；本地未跑。 |

### 第一次跑 CI 时最可能红的 3 个点（按可能性排序，并标"缺陷"还是"设计/在途"）

1. **security-scan 的镜像推送闸**（R3）：只要这次运行不是 PR 事件（push 到 main、或 workflow_dispatch），而 `COSIGN_PRIVATE_KEY` 未配且 `vars.ALLOW_UNSIGNED_IMAGES` ≠ true，就是**设计性红**，且它写在 job 名里就是要让人看见。动作不是加 `continue-on-error`（那是拆门），而是二选一：配签名密钥，或在仓库 Variables 里显式 `ALLOW_UNSIGNED_IMAGES=true` 留痕。
2. **Trivy fs 扫描 HIGH/CRITICAL 硬失败**（R4）：本仓已有盘上事实承认修不掉的 4 条 high；这一发从未跑过，首跑大概率红。它是新暴露的存量红，不许靠摘 `severity` 或加 `ignore-unfixed` 抹平，需要照 `tools/audit-prod-baseline.json` 的形状建一份**逐 advisory-id 钉住、只能变短**的 Trivy 基线，并把"Trivy 侧有没有基线载体"接进 `test:ci-contract`。
3. **db-integration 的 `mvn flyway:migrate`**（R1）：唯一一条"命令本身能不能连库"未证过的门。最可能的红相是 Flyway 报 `Unsupported Database: MySQL 8.0` / 找不到 MySQL 插件；修法在盘上一步之遥——把 `flyway-mysql` 也写进 flyway-maven-plugin 自己的 `<dependencies>`（而不是只留项目依赖），两种载具都能连。R2（runner 无 mysql CLI）如果真缺，会先在第 1 步 `Create an EMPTY schema` 红，报错一眼可辨、不是假象。

---

## 判 5 恢复路径在本机凭据下是否跑不通 + 文档措辞是否诚实

- 本机事实（读盘，不连库）：`./backups` **不存在**（`ls` 报 No such file or directory），且被 `.gitignore:136 backups/` 忽略、无任何 tracked 件 ⇒ 本仓**没有任何一份可恢复的产物**。`restore-mysql.sh:114-115` 的第一步就是 `--artifact 必填` + 文件存在性 die。
- 结论一（可执行性）：在本机凭据与本机盘状态下，这条恢复路径**跑不出任何有效读数**：dry-run 会 die 在"备份产物不存在"；即便有产物，`--apply` 档也过不了 F4 的两道（认证用户错 / `campus` 无 CREATE、无 `SESSION_VARIABLES_ADMIN`）。本机连库权限属继承值（第五轮实测），本轮只读未复验 ⇒ 标"继承，待复量"。
- 结论二（措辞诚实性）：**没有出现"恢复已验证"这类不诚实措辞**，三处都在主动否认：
  - `scripts/restore-mysql.sh:19-22`：「本脚本**在本机从未以 --apply 跑过任何库**…它证明的是"恢复有一条可执行路径"，不是"恢复已验证可用"」，并另附 6 条"它不证明的事"（36-43 行）。
  - `doc/RUNBOOKS.md:139-145` 演练日志：`| — | 尚未做过恢复演练 | 待补 |`、`| 2026-10-31 | …**仍未演练**…只验证过 dry-run、覆盖缺口判定、生产库名拒绝、口令缺失拒绝四条分支 | ⬜ 待执行 |`。
  - `doc/DEPLOYMENT.md:684-686` 只说"默认 dry-run、只有 `--apply` 才写库"，没说已验证。
  ⇒ 这条判据是本轮**唯一没抓到说谎的载体**。但有一处"承诺了却没量具"的近邻值得记：`doc/RUNBOOKS.md:136-137` 规定演练必须记录耗时（RTO 判据）、缺任一项"这次演练等于没做"，而 restore 脚本里没有任何计时读数（`grep SECONDS|date +%s|elapsed` 只命中第 38 行那句"不证明耗时符合 RTO——没有任何计时读数"的自述）——脚本自己是诚实的，缺的是把耗时自动打出来的量具；加上 F4/F5 两条，"下一次演练"照文档跑必然失败。不单列编号，随 F4/F5 一并修。

---

## 判 6 体积与档位口径复量

- 第五轮记的那笔（把某一档当常量印成"不是发布形态"）**已修对**：`scripts/verify-package-size.mjs:124-128` 的说明句按 `bandMode` 三分支条件化（未知档 / real 档 / 其它档），real 档现在印的是"本档是发布形态门禁的调用对象…这份 prune 过没有本门不判"。我实跑两档核对：默认被测物印 `← 以上数字只代表上面那个档，不是发布形态`；`mp-weixin-real` 印 real 档那句且 `PACKAGE_SIZE_BAND=MODE:real API:real`。阈值/退出码未被改动（`MAIN_PACKAGE_LIMIT`/`TOTAL_LIMIT` 仍是 2MB/10MB，:50-51；FAIL→exit 1 实测 RC=1）。档位判定用的 token 也对得上：发布档 env.js 里 `MODE:"real"`，默认档 `MODE:"mp-weixin"`（我读了两份 config/env.js 的 token，未打印其它值）。⇒ **口径标注这件事本批改对了。**
- 残留问题（属"随档位变化的说明句写死成常量"的另一半）：`scripts/verify-package-size.mjs:105-107` 把三个口径的**具体读数**当常量印在注释里，标着"实测"：`发布形态 1762.7KB / src 退化扫描 2.76MB / 本门默认被测物即 mock 档 27.78MB`。
  - 我复量（读的是盘上现存档，未重建）：同一载具的发布档今天读 **1.64MB**（≠1762.7KB≈1.72MB）；默认被测物今天读 **35.83MB**（≠27.78MB）。两个数都不是"本轮重建"的数——现存档 mtime 分别是 2026-10-29 与 2026-10-30，都早于 HEAD 的 11-01 提交。
  - 第二个数还暴露一个"档没了"的问题："src 退化扫描"这一口径**在全仓只有这一处提及**（`grep -rn 退化扫描 scripts tools doc tests` = 1 命中，就是这句注释本身），而本门在 `distRoot` 不存在时是直接 exit 1（:45-48），**没有任何 src 退化扫描路径**。⇒ 三个并存口径里有一个没有盘上载具，注释却把它当"实测"之一并列印着。
- 按用户裁定（"强制标口径而不是选一个"）与建议修法：注释里的三个数改为"口径名 + 判读规则"，具体数字要么每次跑由脚本自己印（已有 `PACKAGE_SIZE_BAND` 与被测物路径），要么显式标"历史读数、载具=某档 dist、日期=…"；对"src 退化扫描"要么补回载具、要么从三分法里删掉，不许留一个没有尺的口径。
- **未复现声明**：本轮未重建 dist，上面两个 MB 数是**现存档的读数**，不是本轮 HEAD 的构建产物读数；`1762.7KB` 与 `27.78MB` 两个历史值我无法在当前盘上复现，一律按"未复现/继承"处理，不据它们判任何达标或超限。另：本门不在 `test:contracts` 链里（链 35 条点名核对无 size 门），默认被测物 RC=1 只说明**盘上那份 10-30 遗留 dist 超限**，不构成 CI/链的红。

---

## 判 7 `.env.example` 占位策略统一性

- 策略正文（`.env.example:28-36`）：凡被 `:?` 读取的变量一律写成 `VAR=`（空），`<PLACEHOLDER>` 只允许出现在不被 `:?` 读取的可选字段上。
- 我独立复量（不依赖门的自述）：从 `docker-compose.yml`（滤掉注释行）解析出的 `:?` 必填集合 9 个 + `docker-compose.alerting.yml` 2 个 = **11 个**；逐个回 `.env.example` 核：`ADMIN_INITIAL_PASSWORD_HASH / ADMIN_OPENID / APP_AES_SECRET / GRAFANA_ADMIN_PASSWORD / JWT_SECRET / MYSQL_PASSWORD / MYSQL_ROOT_PASSWORD / REDIS_PASSWORD / WEBSOCKET_ALLOWED_ORIGIN_PATTERNS / ALERTMANAGER_CONFIG_FILE / ALERT_SECRETS_DIR` **全部 present 且 EMPTY**，与 `test:deployment-config` 报的"11 个全部对应空值示例"一致。`<PLACEHOLDER>` 现存 4 个键（WECHAT_SECRET、AGNES_API_KEY、RABBITMQ_USERNAME、RABBITMQ_PASSWORD），全部不在上面 11 个里 ⇒ 策略统一。
- 反转后的旧口径**没有第三处活着的判点**：`tests/project-structure.spec.mjs:206-211` 已把那条重复判点摘掉并写明"单点持有"（`tests/deployment-config.spec.mjs:57-91` 持尺，且它按 compose 反推示例必须是 `NAME=` 整行）。
- 唯一残留（P3，措辞层）：`docker-compose.yml:34` 的头部安全提示仍写「`.env.example` 提供模板（`<PLACEHOLDER>` 占位），复制为 `.env` 后填写真实强密码」。这句把"占位"讲成通用策略，而现行策略恰恰是"**凭据类一律留空**、只有可选字段才标占位"——同一文件 :67 与 :253 写的才是新口径（"`.env.example` 里 `ADMIN_OPENID=` 是空值，复制后必须填写，否则 compose 报错即预期行为"）。⇒ 建议把 :34 改成与 :67 同口径的一句话；这条不改变任何行为，但它是本轮排查出的"同一文件两句话"的第 3 个实例（F1、F2 之外）。

---

## 发现计数与台账

编号发现 **7 条**：
F1 compose 内 flyway-maven-plugin 两处相反陈述（P1）
F2 pom 插件注释用现在时态否认自己存在（P2）
F3 DEPLOYMENT 监控/告警整节与 prometheus.yml、alert-rules.yml 大面积漂移（P1）
F4 文档恢复命令的用户/口令配对错，两条各错一种（P1）
F5 手动备份/演练命令 `compose run` 绕过装 bash 的服务 command（P1）
F6 textfile 指标写入端在 cron 档不可写 ⇒ `BackupNeverCompleted` 可能仍是死告警（P2）
F7 三条告警的 `annotations` 引用表达式证明不可能存在的标签（P2）

判 4 的 CI 未验证假设按 R1-R8 登记，**不占编号**（它们是需要 runner 才能定性的假设，不是盘上已成立的缺陷）。
判 5、判 6、判 7 各自没有新增编号发现：判 5 的措辞是诚实的（只欠计时量具，随 F4/F5 修）；判 6 的条件化措辞已改对，残留是注释里把历史读数当常量（记在下节"建议"里，未升格为编号缺陷）；判 7 的占位策略实测统一，残留一句 P3 措辞（`docker-compose.yml:34`）。

文档 ↔ 脚本/载体不一致：**5 处**（F1、F3、F4、F5、F6）；其中运维照文档做会**真跑不通**的是 3 处：F4（两条恢复命令各错一种）、F5（`run` 档无 bash，同节 `exec` 档能跑）、F3（"取消 blackbox-http 注释"已无落点）。另 F2、F7 属"文案/标签与事实不符"的一半。

## 未复现 / 判不出清单

1. 所有需要 Docker 的判据：`compose run/exec` 的 bash 缺失（F5）、textfile 目录属主（F6）、`node-exporter` 挂宿主根在 rootless 上的失败（仅复核了 DEPLOYMENT:331-338 的说明与 compose:685 的挂载写法一致）。本机无 Docker ⇒ 全部标静态推断。
2. 体积：本轮未重建 dist。`1762.7KB`（发布形态历史值）与 `27.78MB`（默认被测物历史值）**未复现**；现存档实测读数分别是 1.64MB（10-29 档）与 35.83MB（10-30 档），均早于 HEAD，不作为任何口径的达标/超限结论。"src 退化扫描"口径无盘上载具 ⇒ 无法复量。
3. `campus` 账号权限（CREATE / SESSION_VARIABLES_ADMIN）：继承第五轮同机实测，本轮只读未连库复验 ⇒ 待复量。
4. `mvn flyway:migrate` 的插件类加载、runner 上的 mysql CLI、Trivy fs 结果、gitleaks 检出、`test:typecheck` 在 CI 树上的通过性：全部**只能等 runner**（R1、R2、R4、R5、R8），本车道按纪律未跑 maven。
5. `secrets.COSIGN_PRIVATE_KEY` / `vars.ALLOW_UNSIGNED_IMAGES` 是否已在仓库设置里配置：盘上无镜像事实 ⇒ 判不出，只登记"未配即首跑 push 档按设计红"。
6. CI 历史运行读数：本机无认证上下文，未查 GitHub API ⇒ 所有"从未有过读数"的判断依据是静态定义 + 盘上审计记录的自述，不是 run log。
