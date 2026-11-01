# 第六轮修复波 W3 车道：部署 / 可观测 / 运维文档与事实不一致

- 基线 HEAD：`74e681ca`
- 车道面：`docker/**`、`docker-compose.yml`、`docker-compose.alerting.yml`、`doc/**`、`scripts/**`（不含 `scripts/qa/verify-i18n-orphan.mjs`）、`tests/**`（不含 `tests/prototype-contract.spec.mjs`、`tests/entity-ddl-drift.spec.mjs`）、`.env.example`
- 禁改：根 `package.json`、`.github/workflows/ci.yml`、`README.md`、`apps/**`
- 环境约束：本机无 Docker，任何需要真容器 / 真 Prometheus / 真 CI runner 的结论一律标「判不出」
- 安全：不跑 `docker compose config`（会明文打印 `.env` 密钥）；本报告只出现键名，不出现值

## 条目索引

> ⚠️ 本表原由 W3 在 2026-11-01 写下，把 8 条**全部**写成「待办」，与盘上不符
> （盘上 5 条已闭合）。W3b 接力时按 `git diff` 逐条复核并在下面直接改成真值；
> 逐条依据见文末「W3b 接力 / 一、账实核对表」。

| # | 现象 | 状态（W3b 复核后的真值） |
|---|---|---|
| 1 | 恢复命令少覆盖 `MYSQL_USER`，文档与脚本口径不一致 | 已闭合（判点 H 段） |
| 2 | `compose run backup /backup.sh` 绕过装 bash 的 command | 已闭合（entrypoint 搬移 + 判点 I 段） |
| 3 | `BackupNeverCompleted` 至今是死告警（textfile 目录属主） | 已闭合（静态可判范围内；6 项落地前置 + 5 项 live 判不出，见 W3b） |
| 4 | compose 同文件内两处对 `flyway-maven-plugin` 说反话 | 已闭合（判点 G 段） |
| 5 | `apps/api/pom.xml` 注释现在时态说「本 pom 从未声明该插件」 | 交接（禁改 apps/**；已由 `POM_STALE_BASELINE` 2/2 机器接管） |
| 6 | `doc/DEPLOYMENT.md` 监控告警节整节漂移 | W3b 新做并已闭合（整节重写 + 第 8 节双向对账钉住） |
| 7 | 三条告警的 `$labels.component` / `$labels.reason` 不可达 | 已闭合（判点第 7 节） |
| 8 | 额外：把「文档命令 → 实际接受参数」对账做成判点 | 已闭合（H/I 段 + W3b 第 8 节 A/B/C/D 四轴 + deployment-config J 段） |

---

## 逐条闭合记录

（每条闭合后立刻追加：现象一句 / 改动（文件:行）/ 判点与反向变异红原文 / 实测读数 / 判不出）

### item 1 —— 恢复命令少覆盖一个变量（运维真跑不通）【已闭合】

**现象一句**：`doc/DEPLOYMENT.md` 与 `doc/RUNBOOKS.md` 的恢复命令在 `set -a; . ./.env` 之后
只覆盖 `MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}"`，而 `restore-mysql.sh` 原第 52 行是
`MYSQL_USER="${MYSQL_USER:-root}"` —— `.env` 里的 `MYSQL_USER=campus`（业务账号，
`.env.example:79`）会顺手顶掉那个默认值，于是"看起来用 root"的命令实际拿 `campus`
去配 root 的口令，认证必然失败；不 source `.env` 时它又静默用 `root`。同一条演练命令
在两种环境下错得不一样。

**回盘复核（先证前提，再改）**：本机 `.env` 里**根本没有 `MYSQL_*` 那一组键**（它是
Spring 直跑用的 `.env`：`DB_URL/DB_USERNAME/DB_PASSWORD/…`，26 个键，无 MYSQL_USER、
无 MYSQL_ROOT_PASSWORD），所以「生效的是 campus」这一条不能用本机 `.env` 复现，必须
按 compose 口径的合成环境（照 `.env.example` 的键集）验。载具
`C:\Users\dsghy\AppData\Local\Temp\w3drill\probe-a.sh`（逐字照 HEAD 的三行解析顺序）实测：

```
HEAD 判据下真正进 my.cnf 的 user  = campus
HEAD 判据下口令来源            = MYSQL_ROOT_PASSWORD（root 的口令）
compose 里 MYSQL_USER=campus 的口令是 MYSQL_PASSWORD ⇒ 账号/口令错配，认证必然失败
```

⇒ G 的前提在"合规的 compose `.env`"上成立，且**不是**只错一种：source 了 `.env` 用
`campus`，没 source 就用 `root`。

**改动**：
- `scripts/restore-mysql.sh:64-71`（去掉 `MYSQL_USER:-root` / `MYSQL_PASSWORD:-` 两行静默默认）、
  `:162-205`（新增「凭据同源配对」解析：配对 A `RESTORE_MYSQL_USER`+`RESTORE_MYSQL_PASSWORD`
  ⇒ 配对 B `MYSQL_ROOT_PASSWORD`（账号取 `MYSQL_ROOT_USER`，缺省 root，与变量命名同源自洽，
  不是 shell 默认）；两对都凑不齐就 `die` 并点名；`MYSQL_USER/DB_USERNAME/MYSQL_PASSWORD`
  一律不参与认证，只在被解析账号与业务账号同名时打 WARN）、`:108-119`（`--help` 补配对说明）、
  `:29-45`（文件头凭据段改写，含旧写法为什么跑不通）。
- `doc/DEPLOYMENT.md:695-723`（「MySQL 恢复（全量）」：删掉两处 `MYSQL_PASSWORD=` 覆盖，
  改为零覆盖 + 为什么；配对 A 的写法给成注释示例）、`:742-760`（PITR 段同口径）、
  `:1276-1288`（「数据库回滚」段同口径）。
- `doc/RUNBOOKS.md:111-119`（新增一条「恢复的凭据是管理员配对」）、`:121-145`（演练步骤里
  删掉错配写法并解释）。

为什么配对 B 允许"缺省 root"而不算"静默用 shell 默认"：`MYSQL_ROOT_PASSWORD` 这个键名
本身就指名它是 root 账号的口令（compose `:115` 把它交给 `MYSQL_ROOT_PASSWORD:` 初始化
MySQL），账号与口令同源；脚本每次都会打印 `credential pair` 行（只打印账号名，口令不回显），
所以它是"显式且可核对"的，而不是猜。业务账号一侧的变量则彻底不参与，配对错不了。

**判点**：`tests/deployment-config.spec.mjs` H 段（`:392-512`）——把文档 bash 围栏里的命令
按 `\` 续行接成整条命令，对每条 `restore-mysql.sh` 调用做三项对账：① 命令前缀设的每个
变量名必须真的被脚本读取（`scriptKnownVars` 从脚本源码抽）；② 覆盖业务账号变量
`MYSQL_PASSWORD/MYSQL_USER/DB_PASSWORD/DB_USERNAME` 直接判红（缺陷本体）；③ 传的每个
`--长选项` 必须存在于脚本的 `case` 分支（`scriptOptions`，当前 9 个）。另有正控下限
「文档里 restore 调用 ≥4 处」防"空集合假绿"，与 4 条自测（旧写法必须红、未知变量必须红、
未知选项必须红、合法零覆盖必须放过）——自测在每次跑门时都执行。

**反向变异红原文**（真实改盘跑出来的，跑完已还原并复绿）：
```
AssertionError [ERR_ASSERTION]: 文档里的恢复命令与 scripts/restore-mysql.sh 实际接受的参数不一致：
  doc/DEPLOYMENT.md: 恢复命令设了 RESTORE_MYSQL_PASSPHRASE，但 scripts/restore-mysql.sh 从不读它（写了等于没写）
  doc/DEPLOYMENT.md: 恢复命令覆盖了 MYSQL_PASSWORD —— 那是 .env 里的业务账号（campus）一侧的变量，与 MYSQL_ROOT_PASSWORD 配对不上；旧写法正是「认证必然失败」的成因。改用 RESTORE_MYSQL_USER+RESTORE_MYSQL_PASSWORD 成对给，或直接靠 MYSQL_ROOT_PASSWORD（账号缺省 root）
  doc/DEPLOYMENT.md: 恢复命令传了 --skip-verify，但脚本的 case 分支里没有这个选项（会 die "未知参数"）
```

**实测读数**（本机 bash + 仓库脚本，`/tmp/w3drill/campus_love-20261031-020000.sql.gz` 合成产物）：
| 分支 | rc | 关键行 |
|---|---|---|
| 无凭据配对 | 1 | `ERROR: 没有可用的恢复凭据配对。二选一：RESTORE_MYSQL_USER=root …` |
| 半对（只给 user） | 1 | `ERROR: 凭据配对不完整：RESTORE_MYSQL_USER 与 RESTORE_MYSQL_PASSWORD 必须同时给出` |
| 只给旧变量 `MYSQL_PASSWORD` | 1 | `提示：检测到你传了 MYSQL_PASSWORD…` + 同上 die |
| 合规 compose 环境零覆盖（新文档写法） | 0 | `credential pair : MYSQL_ROOT_PASSWORD（账号取 MYSQL_ROOT_USER，缺省 root）；账号=root（口令不回显）`；`业务账号（不参与恢复认证）: campus campus`；dry-run 正常收尾 |
| `--help` | 0 | 凭据配对三条都在帮助里 |

**判不出**：`--apply` 真写库仍需影子库 + 可达的 MySQL（本机 Docker 停机；且本机 MySQL 的
`campus` 账号无 CREATE 权限，`root` 口令不在本仓可及范围）。dry-run 只证明"凭据解析与
计划这条路径成立"，不证明恢复可用。`RUNBOOKS#演练日志` 仍是 0 次成功演练，本轮没有改变它。

### item 2 —— `compose run backup /backup.sh` 绕过装 bash 的 command【已闭合】

**现象一句**：backup 服务把「apk 装 bash / 建 backup 账号 / chown / 写 crontab」整段写在
`command:` 里，而 `docker compose run <service> <命令>` 的语义是**用 `<命令>` 替换
service 的 `command`**（entrypoint 不动）⇒ 文档给运维的
`run --rm backup /backup.sh` 每次都跳过装 bash，而 `/backup.sh` 的 shebang 是
`#!/usr/bin/env bash`，alpine 基镜像只有 busybox sh ⇒ not found。手动备份这条路从未跑通。

**判清的分工（本仓自己的反例）**：同文件的 `migrate` 服务用 `run --rm migrate info` 是安全的，
因为官方 flyway 镜像的 ENTRYPOINT 就是可执行文件，`run` 只换子命令。所以正确的分工是
「entrypoint = 必做的准备 + 移交，command = 默认动作」，本仓文档 `DEPLOYMENT.md:561-562`
早就写明"`run` 会用你给的参数覆盖 service 的默认 `command`"，只有 backup 违反了它。

**改动**：新增 `docker/backup/entrypoint.sh`（130 行，职责：装依赖 → 建 uid 固定的 backup
账号 → chown 可写目录 → 写 crontab → 校验并播种 textfile 指标 → 降权 `exec` 参数）；
`docker-compose.yml:838`（`command:` 六行换成 `entrypoint: ["/bin/sh", "/backup-entrypoint.sh"]`）、
`:825-837`（注释重写：entrypoint/command 分工 + run/exec 语义差别 + migrate 反例对照 +
原来的 mysql-client 血统说明改指 entrypoint.sh 里那一行，避免"下面这行"这种指空引用；
血统段整体保留在 `:839-851`）、`:802-810`（volumes 首条挂 entrypoint 脚本）、
`:77-92`（文件头新增 2026-11-01 W3 小节）。
`docker/backup/crontab:5-11,21-22`（参考文件的载体说明同步）。
文档：`doc/DEPLOYMENT.md:344-372`（`exec` 为首选、`run --rm` 保留并解释为什么现在能跑）、
`:672-684`（「手动触发备份」）、`doc/RUNBOOKS.md:125-133`（演练步骤）。

为什么选"搬进 entrypoint"而不是"只改文档命令"：改文档只能修好**当前这两条**命令；
`run` 是运维临时救火的入口（`run --rm backup sh -c 'tail -n 50 /backup/cron.log'` 之类），
下一次照样绕过。搬进 entrypoint 后"准备动作与 run 参数无关"成为结构性事实，且判点①
（结构轴）对**任何**服务都成立，不只能盯 backup 一处。代价：`run` 每次会重跑一遍
`apk add`（约 5-15s，判不出精确值——本机无 Docker），所以文档把 `exec` 列为首选。
uid 钉 10000 段而不是 busybox 的"下一个空闲 uid"：本容器要 chown 宿主 bind 目录，
uid 漂了宿主目录属主就跟着漂。参数移交用逐参数单引号 + `sed` 转义（busybox `su -c`
只接一条字符串），载具 `w3drill/quote-carrier.sh` 实测：`/backup.sh --dry-run` 与
`sh -c "cat … | tail -5" "it's fine"` 两种 argv 都无损往返（`COUNT=2` / `COUNT=4`，
`ARG4=<it's fine>`）。

**判点**：`tests/deployment-config.spec.mjs` I 段（`:514-611`），两条轴：
① 结构轴（与文档无关）：任何服务的 `command` 里出现 `apk add|apt-get install|adduser|
chown|chmod|crontab|mkdir -p` 而该服务**没有 entrypoint** ⇒ 红；
② 交付形状轴：backup 必须有 entrypoint、command 里不得再含安装动词、entrypoint 引用的
容器路径必须由 volumes 挂进来、宿主脚本必须真实存在且含"装 bash"与"移交 `$@`"；
③ 文档轴：文档里每条 `compose run <svc> <args>` 指向的服务要么有 entrypoint，要么其
command 里没有前置动作；服务不存在也红。正控下限「文档 compose run 命令 ≥3 条」，
外加合成 fixture 自测。

**反向变异红原文**（把 entrypoint 换回 HEAD 的 command 形态后跑出，已还原）：
```
AssertionError [ERR_ASSERTION]: compose 的 command 被当成了安装脚本用：
  services.backup.command 里含前置安装动作，而该服务没有 entrypoint ⇒ 会被 compose run 替换掉
```

**判不出（点名）**：① 容器内 `apk add` 是否成功（需 alpine 3.19 仓库可达）；② busybox
`adduser -u 10000` / `su -s /bin/sh -c` / `crond -l 8` 的真实行为（本机 sh 是 msys bash，
不是 busybox ash）；③ `run --rm backup /backup.sh` 端到端能否产出备份；④ `/proc/mounts`
里 textfile 目录的挂载点判定；⑤ entrypoint 里 `chmod 0755` 对挂载脚本是否必要（本仓用
`/bin/sh <脚本>` 调用，刻意不需要 exec 位，Windows checkout 丢 exec 位也不影响——这条
推理没有实测）。

### item 4 —— compose 同文件内两处对 `flyway-maven-plugin` 说反话【已闭合】

**现象一句**：`docker-compose.yml` 头注（`:44-48`）说"pom 第四轮起也声明了
flyway-maven-plugin，两条载具都在"，而 migrate 段（`:218-220`）说"pom 并无该插件——
所以不能用 `./mvnw flyway:migrate`"。`apps/api/pom.xml:238-247` 实测**确有**该插件
（`<artifactId>flyway-maven-plugin</artifactId>`，版本 `${flyway.version}`），否认的一方是错的。

**改动**：`docker-compose.yml:232-241`（migrate 段改成与头注同一份三件套表述：
pom 有该插件 ⇒ 两条载具都在 ⇒ 同一时刻只许一个写者；并留一句"此前本段写的是否认"
的历史说明），`:77-92` 文件头新增 W3 小节点名这条。

**判点**：`tests/deployment-config.spec.mjs` G 段（`:326-390`）。刻意不钉字面句子
（等价改写不该判红），钉三件可判的事：① 事实锚——`apps/api/pom.xml` 必须声明该插件
（真要摘掉就必须同批改写三处表述）；② 否认轴——compose/DEPLOYMENT 里任何谈到
`flyway-maven-plugin` / `mvnw flyway:*` 的行不得否认其存在或可用性，含 7 条否认式
（`并无|没有|从未声明|不含|不能用|无法使用|No plugin found`），并允许"此前/原先/旧文档"
这类过去时反面引用（与既有 C/F 段的惯例一致）；③ 覆盖轴——谈该插件的位置不得缩到
少于 2 处，防止"删掉一段就不矛盾了"。

**反向变异红原文**（把头注改成否认式后跑出，已还原）：
```
AssertionError [ERR_ASSERTION]: pom 里明明声明了 flyway-maven-plugin，以下位置仍在否认它（同一事实两处说反话，运维按哪一段做都是五五开）：
  docker-compose.yml:45: #     注意 apps/api/pom.xml 并未声明 flyway-maven-plugin，因此不能用 ./mvnw flyway:migrate。
```

**实测读数**：`test:deployment-config` rc=0，摘要行
`flyway 载具表述与 pom 一致；恢复命令 6 处参数与脚本对账通过；compose run 无绕过安装段的形态`。

**判不出**：`./mvnw flyway:info` 真跑（本批禁止跑 maven，且它要 DB_URL/DB_USERNAME/DB_PASSWORD
+ 可达库）。G 段证的是"三处表述与 pom 的声明一致"，不证 mvnw 那条载具今天真能连通。

### item 5 —— `apps/api/pom.xml` 注释用现在时态说「本 pom 从未声明该插件」【成交接，未动文件】

**现象一句**：`apps/api/pom.xml:231-237` 的注释块在**声明该插件的那段代码正上方**用现在
时态说这个 pom 没有这个插件；同段最后一行还说"版本交给 spring-boot-starter-parent 的
依赖管理"，而 `:241-247` 紧接着写"pluginManagement 里【没有】flyway 条目"并显式钉了
`<version>${flyway.version}</version>`。两条都是自相矛盾的陈旧叙述，与 item 4 同源。

**本车道没动它**（`apps/**` 由后端车道 W1 持有）。改动原文与建议文本见下面的
「接线三件套 / 交接项 A」，并且**已经装进判点**：`tests/deployment-config.spec.mjs` G 段
新增 `POM_STALE_BASELINE`（只允许收缩的在途基线，上限 2 项）；基线之外的新否认式表述
直接判红；两处文本一旦被改对而基线没清空，本节 `throw` 点名"请同步清空基线，否则判点
对着空集合绿"（本仓踩过四次的「空判点」事故类型）。

**实测读数**：`node tests/deployment-config.spec.mjs` rc=0，摘要含
`pom 陈旧注释在途基线 2/2 处待主控落` —— 即两处陈旧文本此刻都在盘上，机器可见、
可核对，不靠本车道口头转述。

**判不出**：无（纯文本事实，已由判点接管）。

---

# W3b 接力（接手撞 150 轮上限的 W3）

- 基线 HEAD：`74e681ca`（未变；本轮**未做任何 git 写操作**）
- 接力范围：先做「账 ↔ 盘」核对，再补 volume 判据洞、item 3 落地前置、item 6、item 8 余项
- 环境：本机无 Docker、无 maven、`.env` 不含 `MYSQL_*` 键组；只跑本车道五条只读门

## 一、账实核对表（W3 的条目索引说「8 条全待办」，盘上不是这样）

W3 的索引把它已经做完的 5 条也写成了「待办」——**账比盘悲观**，与「账比盘乐观」同样是
失真，只是危害方向相反（后者会让人重复施工，前者会让人以为门还没接就上生产）。
逐条按 `git diff` 复核后的真值：

| # | 索引写的 | 盘上真值 | 判点是否已接 | 反向变异是否留档 | 门读数是否留档 |
|---|---|---|---|---|---|
| 1 | 待办 | **已闭合**（`scripts/restore-mysql.sh` 凭据配对 + `DEPLOYMENT.md` 3 处 + `RUNBOOKS.md` 2 处；盘上再无「活」的错配写法，仅剩 3 处明写「旧写法/不要写」的过去时引用） | 是（deployment-config H 段） | 是 | 是（5 行分支表） |
| 2 | 待办 | **已闭合**（新建 `docker/backup/entrypoint.sh`；compose 的 backup `command:` 已删除、换成 `entrypoint:`；文档 `exec` 首选 + `run` 解释） | 是（deployment-config I 段） | 是 | 部分（判点读数有，「判不出」5 项点名） |
| 3 | 待办 | **改了一半 → W3b 已补完**：W3 侧的 entrypoint/crontab/compose 三件都在盘上，判点 6c 也在盘上并能红；但它只判「形状」，**没判这套改法能不能落地**（属主链的四条前置） | W3 接了形状轴；**W3b 新增落地前置 5 项** | W3 有 9 形态自测；**W3b 另做 4 次真盘变异** | W3b 全记（见下文 item 3） |
| 4 | 待办 | **已闭合**（compose 头注与 migrate 段统一成同一份三件套表述） | 是（G 段） | 是 | 是（rc=0 摘要行） |
| 5 | 交接 | **属实，仍是交接**（`apps/api/pom.xml:231-237` 两处陈旧文本原样在盘，本车道按纪律未动 `apps/**`；已由 `POM_STALE_BASELINE` 2/2 机器可见地接管） | 是（G 段基线轴） | 不适用（未动文件） | 是 |
| 6 | 待办 | **未动**——W3 正文里没有 item 6 的闭合记录，`doc/DEPLOYMENT.md` 的 diff 只碰了「启动监控告警/备份/恢复」小节，`## 监控与告警` 整节（:1029-1148）一字未改；`doc/RUNBOOKS.md:33,34,39,58` 的假告警名与「取消 blackbox-http 注释」（该注释已不存在）原样在盘 | 否 | 否 | 否 | 
| 7 | 待办 | **已闭合**（`alert-rules.yml`：`ApiHealthCheckFailed` 文案改写 + `PaymentCallbackFailure`/`ChatMessageSendFailure` 改 `sum by (reason)`） | 是（monitoring-wiring 第 7 节） | 是 | 是（17 条文案、不可达 0） |
| 8 | 待办 | **改了一半 → W3b 已补完**：W3 已把「恢复命令→脚本参数」和「compose run→entrypoint 分工」两轴做成判点（H/I 段）；审计 F 表余下的「文档告警名/抓取 job/阈值 ↔ 规则文件实名」轴没接 | 部分 → W3b 补第 8 节 | W3b 补做 | W3b 全记 |

⇒ 八条的真值：**5 条已闭合（1/2/4/5/7）、1 条未动（6）、2 条改了一半（3/8）**，
索引里「8 条全待办」不成立，已按上表更正。

## 二、优先项：volume 判据洞（W3 自述「加 `:ro` 门没红」）

**结论先说**：W3 在撞线前**已经把解析器改对了**（盘上 `splitVolume` 已认容器侧
`${VAR:-default}`），并且 6c 节自测里已经有「backup 侧挂成只读（挂载目标带插值）」这一行；
它缺的是**最后那一次重跑证明**——它没能跑到「真文件变异 ⇒ 红」这一步就断了，所以洞是否
真闭合在账上是空白的。W3b 把这段补成实测，并把残留的另两个方向也钉掉。

### 2.1 复核：解析器仍有的两处错切（W3 未覆盖）

对盘上版本喂 9 组形态实测（`node -e` 直接调 `splitVolume` 打印三元组），
「容器侧插值」全部正确，但两处错：

```
输入  ${BACKUP_DIR:-./backups/node-textfile}:/mnt/node-textfile:ro
解析  host=${BACKUP_DIR   container=-./backups/node-textfile}:/mnt/node-textfile   mode=ro
      ↑ 默认值表达式里的冒号被当成 host/container 分隔符（宿主侧这一格 W3 只修了容器侧）
输入  /srv/data:/mnt/x:${MOUNT_OPTS:-ro}
解析  host=（空）  ← 三段但末段不是字面 mode，直接掉进兜底分支，读写性彻底丢失
```

⇒ 修法：**按花括号深度扫描**，只在深度 0 的冒号上切分；末段既像字面选项串
（`ro`/`rw`/`rslave`/`cached`…，且不含 `/` `\`）或整个是插值表达式时才算 mode 位；
mode 位是插值 ⇒ 标 `modeUnresolved`，**不许**把「不等于 ro」当成「可写」，而是点名
「这一格静态判不出」。Windows 盘符 `D:\data:/mnt/x` 不会被认成 mode（末段含分隔符）。

### 2.2 阳性对照（否则「修好了」只是自述）

`tests/monitoring-wiring.spec.mjs` 新增 `VOLUME_PARSE_POSITIVE_CONTROLS`，**15 行**，
每行逐字段断言 `host`/`container`/`mode`，覆盖四种形态 × 有/无 mode：
相对路径、`:ro`、`:rw`、容器侧 `${VAR:-default}`、容器侧插值 + `:ro`（原缺陷形态）、
**宿主侧插值 + `:ro`**、两侧都是插值、`$VAR` 无花括号 + `:ro`、宿主绝对路径、
mode 位本身是插值、命名卷（`redis-data`/`mysql-data`）两种、非 ro/rw 的传播选项
（`rslave`）、嵌套 `${VAR:-${ALT:-/mnt/deep}}`、匿名卷单段。
另有表长度下限判点：

```js
assert.ok(VOLUME_PARSE_POSITIVE_CONTROLS.length >= 12,
  "卷解析阳性对照从 N 行缩了：这张表是"解析器修好了"的唯一证据，删行等于拆判据");
```

### 2.3 重跑 W3 原本那次 `:ro` 变异（真盘，不是 fixture）

载体：`npm run test:monitoring`。改盘 ⇒ 跑 ⇒ 还原 ⇒ 校 sha256。

- 变异前 `docker-compose.yml` sha256 = `3222e5a47b03c0cde45824731661e34272051d0bed0cf499c19e046315c8d3ac`
- 动作：`- ./backups/node-textfile:${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}` 末尾加 `:ro`
- **红了**（W3 当时看到的「没红」现已不复现）：

```
AssertionError [ERR_ASSERTION]: BackupNeverCompleted 的写入端形状不成立（这条"安全网的安全网"会静默地不响）：
  backup 侧的 node-textfile 挂载是只读（mode=ro）⇒ 脚本根本写不进指标文件
+ actual - expected
+ [ 'backup 侧的 node-textfile 挂载是只读（mode=ro）⇒ 脚本根本写不进指标文件' ]
- []
    at file:///D:/6/…/tests/monitoring-wiring.spec.mjs:526:10
```

- 还原后 sha256 = `3222e5a47b03c0cde45824731661e34272051d0bed0cf499c19e046315c8d3ac`（逐字节相同），
  复跑 `test:monitoring` rc=0。

### 2.4 判据自身的防绕过

`textfileShape` 的红形态自测从 9 加到 **11**（每次都随门跑），新增两行正是 2.1 的两个方向：
`backup 侧挂成只读（宿主路径带插值）`、`backup 侧读写位被插值藏起来（静态判不出＝必须点名）`。
挂载查找从 `/node-textfile$/.test(v.host)` 改成对**原始声明串**匹配（`v.raw`），
这样宿主侧写成插值时不会「找不到挂载」而误报成「没挂进来」；而「两侧是否同一宿主目录」
仍然**严格比字符串**，不做插值展开 ⇒ 写法不同就判红（宁可误报不漏报，因为静态确实判不出
`.env` 里那个变量取什么值）。





### item 3（W3b 补完）—— BackupNeverCompleted 从「形状可判」升到「落地前置可判」

**W3 已经做掉的**（复核为真，不重做）：`docker/backup/crontab` 载体说明同步、
`docker-compose.yml` 把 backup 侧挂载目标改成与 `BACKUP_TEXTFILE_DIR` **同一个插值表达式**
（`:817`）、node-exporter 侧钉成 `:ro`（`:711`）、新建 `docker/backup/entrypoint.sh`
（mkdir + 建 uid 10001 的 backup 账号 + chown + `chmod 775` + `/proc/mounts` 挂载点校验 +
播种 `backup.prom`）、判点 6c 节。⇒ 我复核的结论是这套**改法方向正确**，
但它只证明了「形状」，没证明「这套形状在真容器里落得了地」。

**W3b 补的落地前置（6 项，全部静态可判，载具 `tests/monitoring-wiring.spec.mjs` 6c 节）**：

| 前置 | 为什么是它 | 判法 |
|---|---|---|
| backup 服务不得设**非 root** 的 `user:` | entrypoint 要 `adduser` + `chown` 宿主 bind 目录；非 root 起跑就 EPERM，目录留在 root:root ⇒ cron 档写不进 ⇒ 死告警原样回来 | 解 `backup.user`，`root`/`0` 豁免（它就是「以 root 跑」的另一写法） |
| backup 服务不得 `read_only: true` | `/etc/crontabs`、crontab、`.prom` 全在容器根 fs ⇒ EROFS | 直接读 key（node-exporter 自己是 `read_only: true`，它是读侧不受影响） |
| 播种文件必须 `*.prom` | textfile collector 只收该扩展名 | 正则取 entrypoint 里的文件名 |
| 播种者与 `scripts/backup-mysql.sh` 必须写**同一个**文件名 | 同目录两个文件暴露同名指标 ⇒ collector 判 duplicate 后**整目录不导出**（又是静默死告警，且这次连「不可写」都不报） | 两边各取 `.prom` 文件名比对 |
| textfile 目录权限必须留 others 位 | 读侧 node-exporter 以镜像默认非 root（nobody）跑；`chmod 700` 做得出「backup 可写但 nobody 不可读」 | 扫 entrypoint 的 `chmod NNN ${TEXTFILE_DIR}`，末位为 0 就红 |
| 播种的 `.prom` 不得 chmod 成 others 不可读 | 同上，文件级 | 扫 `chmod 6xx/0xx …/backup.prom` |

**反向变异（真盘，跑完即还原并校 sha256）**：

| # | 变异 | 结果 |
|---|---|---|
| M1 | compose 的 backup 服务加 `user: backup` | 红：`backup 服务设了 user=backup ⇒ entrypoint 的 adduser/chown 会以非 root 跑…` |
| M2 | entrypoint `chmod 775` → `chmod 700` | 红：`entrypoint 把 textfile 目录 chmod 成 700 ⇒ others 无权限，而 node-exporter 以非 root（镜像默认 nobody）读它` |
| M3 | entrypoint 的 `backup.prom` → `seed-metrics.prom` | 红（先撞播种名/规则轴：`entrypoint 没有播种基线指标…`）——记为「红得对但报的是邻位」 |
| M4 | `scripts/backup-mysql.sh` 写 `other-backup.prom`（entrypoint 仍 `backup.prom`） | 红：`播种写 backup.prom、备份脚本写 other-backup.prom，同一目录里两个文件暴露同名指标 ⇒ textfile collector 判 duplicate 后整目录不导出` |
| M0 | backup 侧 textfile 挂载加 `:ro`（W3 原本那次） | 红，见上文 2.3 |

还原后 sha256：`docker-compose.yml` `3222e5a47b03c0cde45824731661e34272051d0bed0cf499c19e046315c8d3ac`（与接手时同）、
`docker/backup/entrypoint.sh` `07603d316c2cae9d6de9e47d0f8b9c5c8d95e16ef24a70a8102a921b533fb722`、
`scripts/backup-mysql.sh` `0e90c0c50b182538a4088d00d9723c264792588e833dc1188d47b0ef1c9e419d`。

**文档侧**：`doc/DEPLOYMENT.md` 新增「textfile 指标目录的落地条件」四条 + 播种说明
（含宿主目录创建时机：`backups/` 在 `.gitignore` 里，全新克隆没这目录 ⇒ Docker 首次 `up`
按宿主默认属主建出来，entrypoint 每次启动重新 chown，**运维不需要手工 mkdir**；
但 NFS/CIFS 这类做 root squash 的宿主会把 chown 静默吃掉 ⇒ 点名要把
`BACKUP_TEXTFILE_DIR` 换到本地盘）。

**判不出（必须一次真容器运行才能证，本车道没做）**：
① 真容器里 `[ -w "${TEXTFILE_DIR}" ]` 与 `[ -d ]` 是否成立；
② bind 源在宿主不存在时 Docker 是否真按 root:root 建（各版本行为不同，
rootless / Docker Desktop 的 uid 映射还会变）；
③ **root squash**：宿主把 `./backups` 放在 NFS/CIFS 上时 chown 会不会被吃掉（本机无 NFS）；
④ node-exporter 是否真把 `backup.prom` 解析成 `node_backup_*` 序列（含 `:ro` 挂载下可读）；
⑤ Prometheus 侧 `query=node_backup_last_success_timestamp_seconds` 是否非空。
⇒ 这五条要在有 Docker 的机器上跑一次 `docker compose --profile backup up -d`
再查 `/targets` 与 `/api/v2/alerts` 才能闭；静态判点只保证「链上没有已知的静默哑形态」。

### item 6（W3b 新做）—— doc/DEPLOYMENT.md「监控与告警」整节重写

**盘上事实核对**（审计 F3 的四类陈述，逐条实测）：
`docker/prometheus/prometheus.yml` 现役 job 只有 3 个（`prometheus` / `campuslove-api` /
`node-exporter`），全文再无任何注释态 job；`alert-rules.yml` 现役 20 条实名、
注释态 3 条（`AdminDown` + 整组注释掉的 `third-party-availability`）；
文档旧清单 8 个名字里只有 `ApiDown` 真实存在，其余
（`MysqlDown`/`RedisDown`/`AdminDown` 当现役/`JvmMemoryHigh`/`JvmGcPauseHigh`/
`MatchSuccessRateLow`/`ChatMessageLatencyHigh`/`AuthFailureSpike`）在规则文件里查不到；
阈值旧写 `HostDiskHigh>85%`（实 0.8=80%）、`HostMemoryHigh>90%`（实 0.85=85%）；
Grafana 表里写 3000、正文与 compose 是宿主 3001→容器 3000；
`:1027` 把「Prometheus blackbox 探针」当现役健康检查手段。

**改动**：
- `doc/DEPLOYMENT.md`「监控与告警」：组件表改成「宿主端口 → 容器端口」（9090 / 3001→3000 /
  9093 / 9100，全部 `127.0.0.1` 绑定 + 可覆盖变量名）；抓取目标改成「现役 3 个 job」的表 +
  明确列出**已移除**的三个 exporter 与恢复它们的正确顺序（新增，不是解注释）；
  告警规则整节换成 **20 条全量清单表**（组名 / 实名 / 触发条件 / `for` / 严重级逐条照
  规则文件抄），另加「停用 3 条」段、「两条数据源前提」段，以及对规则文件开头那句
  「5 分钟内持续异常」原则句的**纠偏**（实值有 2m/5m/10m/15m/30m 五种，
  `PaymentCallbackFailure` 根本没有 `for`）。
- `doc/DEPLOYMENT.md:1027` 的 blackbox 现役说法改为 `up{job="campuslove-api"}` + `ApiDown`，
  并注明 blackbox 探针当前不在编排里。
- `doc/DEPLOYMENT.md` 告警路由表：补齐顶层 `group_by`/`group_interval`、`critical` 路由的
  `continue: true`、以及「未匹配任何 route 走顶层默认 receiver」这一格。
- `doc/RUNBOOKS.md`：`ApiLatencyHigh`→`ApiHighLatencyP99`（带上实阈值与窗口）、
  `JvmHeapHigh`→`JvmHeapMemoryHigh` + `JvmFrequentFullGc`、`admin-下线` 一节的
  「取消 `blackbox-http` 抓取任务注释」改成 ①②③④ 的新增顺序
  （那段注释自 infra #18 起已整段删除，照旧文案做会找不到落点）。

**反向变异红原文**（真盘改文档跑出来，跑完还原）：
```
M5 RUNBOOKS 把实名改回 ApiLatencyHigh：
AssertionError: 文档里的告警名与规则文件对不上（照文档排障会找一个不存在的规则）：
  doc/RUNBOOKS.md:47: `ApiLatencyHigh` 在 alert-rules.yml 里不存在（现役 20 条实名，
  注释态 AdminDown/WechatApiUnreachable/AgnesApiUnreachable）——文档引用了一条查不到、也永远不会触发的告警

M6 DEPLOYMENT 把 HostMemoryHigh 阈值写成 >90%：
AssertionError: 文档里的告警阈值/持续窗口与 alert-rules.yml 不一致：
  doc/DEPLOYMENT.md:1090: HostMemoryHigh 文档写 >90%，规则表达式实际是 [85%] ⇒ 阈值口径漂移

M7 从清单表里删掉 ApiHighClientErrorRate 那一行：
AssertionError: alert-rules.yml 有 1 条现役告警文档一个字都没提：ApiHighClientErrorRate

M8 往 RUNBOOKS 塞一句「取消 blackbox-http 抓取任务的注释即可」：
AssertionError: 文档描述的抓取目标与 prometheus.yml 的现役 job 不一致：
  doc/RUNBOOKS.md:43: 提到 blackbox-http，但 prometheus.yml 里没有这个 job，
  且这一带没有「已移除/未部署/需新增」的限定 ⇒ 读者会以为它在抓
```

**判不出**：文档与规则文件对账是静态的；**渲染结果**（Prometheus 真把 20 条规则装载、
Grafana 面板真按这些名出图）需要一次 live Prometheus，本机无 Docker ⇒ 未证。

### item 8（W3b 补完余行）—— 文档 ↔ 事实源 的对账判点

W3 已接的两轴不动（deployment-config H 段 = 恢复命令 ↔ 脚本参数；I 段 = `compose run` ↔
entrypoint/command 分工）。W3b 补三处：

- **`tests/monitoring-wiring.spec.mjs` 第 8 节**（文档 ↔ 规则 / prometheus.yml 四轴）：
  A 告警名实名存在性（含注释态必须带「停用/未部署/新增」限定，否则判红）；
  B 覆盖率（**每条现役告警都必须出现在文档里**——防止「把一段删掉就不矛盾了」）；
  C 阈值与 `for`（文档那行写了百分比就必须等于表达式实值；写了 `\d+m` 窗口就必须等于
  该规则实 `for`，规则没 `for` 而文档编了一个 ⇒ 红）；
  D 抓取 job（提到 `mysql-exporter`/`redis-exporter`/`blackbox-http` 却不在现役 job 集合里，
  且周围没有「已移除/未部署/需新增」限定 ⇒ 红；教人「取消注释」而 `prometheus.yml` 里
  根本没有注释态 job ⇒ 红）。
  告警名识别**不手写名单**：从现役名单自己的构词形态推出后缀集合
  （`Down`/`High`/`Failed`/`Failure`/`Rate`/`P99`…），新告警进来自动纳入，
  而 `GlobalExceptionHandler`（Handler 不在集合内）不误伤。
  8 种漂移形态每次随门自测。
  **踩坑记录**：C 轴第一版要求「每个提到告警名的行都必须重述 `for`」，跑出来 10 条全误报
  ——那是把叙述句当清单句读。已改成「说了就得说对，不要求每行都说」，教训写进判点注释。
- **`tests/deployment-config.spec.mjs` 新增 J 段**（审计 F 表两行「△ 缺口」）：
  10 个脚本外部变量（`RESTORE_BIN`/`RESTORE_MYSQLBINLOG_BIN`/`RESTORE_ALLOW_MARIADB_BINLOG`/
  `BACKUP_LIVE_SCHEMA`/`RESTORE_MYSQL_USER`/`RESTORE_MYSQL_PASSWORD`/`MYSQL_ROOT_USER`/
  `BACKUP_ENCRYPTION_KEY`/`BACKUP_TEXTFILE_DIR`/`BACKUP_MYSQLDUMP_BIN`）
  必须登记进 DEPLOYMENT 变量表（按「表格第一格」检，不按全文 grep），
  并反向检这些键真被脚本读（写了没人读 = 死文档）；再加「宿主必须有 mysql/mysqlbinlog/openssl」
  前置段的文档判点。文档侧同步补了 9 行变量表 + 一段宿主前置说明，
  并把 `BACKUP_CRON` 那行「由 backup 服务启动命令写入 crontab」改成
  「由 ENTRYPOINT `docker/backup/entrypoint.sh` 写入」（W3 的 item 2 改动留下的陈旧口径）。
  **踩坑记录两条**：(a) J 段最初的「前提校验」写的是 `command -v mysql`，而脚本实际写
  `command -v "${RESTORE_BIN}"` ⇒ 门对着一个**不存在的前提**绿；已按被测物真实写法修正，
  并把教训写进判点消息。(b) 我用一个 node 补丁改 `deadDocVars` 时正则贪婪匹配，
  连带吞掉了后面三条断言，门当场从红变绿——靠「删掉文档段落门却没红」这次 M10 复测才发现，
  已补回并把 M10 做实。
  M9（删 `RESTORE_BIN` 行 + 删前置段）与 M10（只删前置段）分别打红两轴，
  还原后 `doc/DEPLOYMENT.md` sha256 = `da0ec4aa52761b4c28a73e73aea956c784e3ab77509e24c0ba59ae129413ca7a`。

### 三条已闭合条目的接力复核（不重做）

- **item 1**：盘上再无「活的」错配写法（仅剩 3 处明写「旧写法/不要写」的过去时引用）；
  `bash scripts/restore-mysql.sh --help` rc=0，配对 A/B + 「不参与认证」三条都在帮助里。
  复核结论：**已闭合**，判点 H 段在跑（6 处恢复命令 ↔ 9 个长选项对账）。
- **item 2**：compose 的 backup 段已无 `command:`，只有
  `entrypoint: ["/bin/sh", "/backup-entrypoint.sh"]`（`:838`），脚本由 volumes 挂入且 `:ro`；
  判点 I 段在跑。复核结论：**已闭合**。W3 点名的 5 项判不出仍然成立。
- **item 5**：仍然只是交接。`POM_STALE_BASELINE` 2/2 在盘（现在时态否认那条 +
  「版本交给 parent 依赖管理」那句），本车道未动 `apps/**`。

## 三、五条只读门读数（W3b 收工态，全部 rc=0）

| 门 | rc | 摘要（关键计数） |
|---|---|---|
| `npm run test:monitoring` | 0 | 注册指标 70、被引用 21 全可追溯；Counter 裸名 0；告警数据源核对 20 条（4 条靠 node-exporter，job 活跃、过期声明 0）；receiver 定义 4 / 引用 3 全对；**textfile 静默哑形态 11 种全可判红、落地前置 6 项已核**；**卷解析阳性对照 15 行**；**文档↔规则：告警名 23/20 全覆盖、漂移形态自测 8 种全可判红**；`$labels` 可达性 17 条文案、不可达 0 |
| `npm run test:deployment-config` | 0 | `:?` 必填 11；文档 compose 变量 60 个对账；镜像字面量对齐；flyway 表述与 pom 一致（**pom 陈旧基线 2/2 待主控落**）；恢复命令 6 处 ↔ 脚本对账；`compose run` 无绕过安装段；**脚本外部变量 10 个已登记且全部被脚本真读** |
| `npm run test:docs` | 0 | client 命令 2 条存在；node 主版本 20 一致；**文档引用 143 条路径与锚点全部可解析**（接手时 129 条，本接力 +14），覆盖 18 个 markdown，历史豁免 3 个 |
| `npm run test:ci-contract` | 0 | ci image scan contract ok |
| `npm run test:gate-list-sync` | 0 | `GATESYNC_RESULT=PASS`（判点数 14，不一致 0；ORPHAN 3 = 基线 3，未新增） |

## 四、W3b 改动清单与未闭合项

**W3b 动的文件**（9 个里改了 5 个，另 4 个只复核）：
`tests/monitoring-wiring.spec.mjs`（解析器 + 6c 落地前置 + 第 8 节）、
`tests/deployment-config.spec.mjs`（J 段 + 摘要计数）、
`doc/DEPLOYMENT.md`（监控与告警整节 + 变量表 9 行 + 宿主前置段 + textfile 落地条件）、
`doc/RUNBOOKS.md`（3 处假告警名 + blackbox 恢复步骤）、
`docker-compose.yml`（**仅变异测试，已还原**，sha256 与接手时逐字节一致）。
未动：`apps/**`、根 `package.json`、`.github/workflows/ci.yml`、`README.md`；
无 git 写操作；未跑 maven；未起容器；未跑 `test:contracts` 全链；未跑 `docker compose config`
（全程只在报告里出现键名）。

**仍然没闭合 / 交下轮的**：
1. item 5 的 `apps/api/pom.xml` 两处陈旧注释 —— 仍在 `POM_STALE_BASELINE` 里等后端车道落，
   基线不空就 `throw` 点名（不是静默绿）。
2. **item 3 的 5 项 live 判不出**（见上 ①–⑤）—— 需要一次真 `docker compose --profile backup up -d`。
3. **item 2 的 5 项判不出**（W3 已点名，本轮未变）。
4. `doc/RUNBOOKS.md` 的「演练日志」仍是 0 次成功演练（W3 item 1 已说过，本轮没有改变它）。
5. 审计 F 表里「把脚本全部外部输入自动抽出来」这条轴我没做（bash 局部变量太多、误判率高），
   只补了 10 个外部键的人工清单 + 双向对账；要自动化得先解决「局部变量 vs 外部输入」的判据。
