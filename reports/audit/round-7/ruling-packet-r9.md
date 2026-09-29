# r9 拍板件包（车道实测版 · lane-ruling-packet）

> **入库副本说明（编排加的，非车道原文）**：本件与 `ruling-packet-r9.json` 是从
> `.zcode/tmp/lane-ruling-packet/`（被 gitignore 挡住、只在采集机上存在）复制进来的可携副本，
> 车道的原始探针件与逐门日志（`r9-provenance-all.log`、`r9-real-coverage.log`、`probe-uncovered10.mjs`）
> 仍在该 tmp 目录，**未入库**；本文件下面那条"机器可读副本"指的是旧文件名，入库后叫
> `ruling-packet-r9.json`。
> 量取时 HEAD 是 `1788675d`；自那时起 HEAD 已推进到 `491210dd`（其中 `70472d92` 删了 260 份报告、
> 用户另删了 3848 帧盘上截图），所以本包 §0.1/§0.2 的数在 r9 终验那一发上**允许与本文不一致**，
> 不一致时以本轮终验的机器读数为准，并把差值归到那两次删除上，不归到车道。
> 裁定与实测纠偏见 `decisions-v33.md` §32 / §32.1；现状对账见 `followups-v33.md` §12。

- 生成车道：ruling-packet lane（只读车道）
- 量取时 HEAD：`1788675d`（`git rev-parse HEAD`）
- 铁律：本包**只做实测与列项**，不提任何政策选择。凡未亲自跑出的数一律写 `unknown`。
- Node：`N=/d/codex-tools/node-v22.17.0-win-x64/node.exe`（v22.17.0）；PATH 上的 node 是 v16.13.1，会造假红。
- 机器可读副本：同目录 `decisions-packet-r9.json`

## 0. 两个红的当日读数（先落我跑过的数）

### 0.1 verify-provenance-all
- 命令：`"$N" scripts/qa/verify-provenance-all.mjs`（终验脚本里这道门**不带** `--dry`/`--out`，逐字镜像）
- 当日读数（HEAD `1788675d`，exit=**1**，日志 `.zcode/tmp/lane-ruling-packet/r9-provenance-all.log`）：

| 字段 | 今日实测 | r8 记账值 | 是否一致 |
|---|---|---|---|
| `PROV_FRAMES_PRE_STAMP` | **4886** | 4886 | 一致 |
| `PROV_FRAMES_CONSISTENT` | 4154 | 4154 | 一致 |
| `PROV_FRAMES_LEGACY` | 144 | 144 | 一致 |
| `PROV_FRAMES_STALE` | 0 | 0 | 一致 |
| `PROV_FRAMES_UNDATED` | 0 | 0 | 一致 |
| `PROV_FRAMES_UNRESOLVABLE` | 0 | 0 | 一致 |
| `PROV_FRAMES_UNKNOWN_BAND` | 0 | — | 0 |
| `PROV_FRAMES_ABSOLUTE` | 0 | — | 0 |
| `PROV_MANIFESTS_BAD_SHA` | 0 | 0 | 一致 |
| `PROV_MANIFESTS_NO_SHA` | 0 | 0 | 一致 |
| `PROV_MANIFESTS_NO_SHA_LEGACY` | 1 | 1 | 一致 |
| `PROV_PRODUCERS` | 11 | 11 | 一致（`DERIVED_OK=11 LITERAL_SHA=0 NO_DERIVE=0`） |
| `PROV_FRAME_ACCOUNTING` | in=9184 out=9184 OK | — | 帧总数守恒 |
| 打戳约定起点 | 2026-09-24T16:31:39.000Z | 同 | 一致 |

- 唯一红源确认仍是 `PRE_STAMP=4886`，其它轴逐字 0 ⇒ **"every other axis reads 0" 这句话今天仍然成立**。
- §25 的"19 份 manifest 全部帧都是 pre_stamp"今日复量：**19 份**（`grep -oE "PROV_MANIFEST.*pre_stamp=[0-9]+" | 过滤 pre_stamp>0 且 consistent=0` 计数）。
  其中 **18 份共用顶层 `gitSha=6fd151786c43438eb3cc32c5b53d0ac6d67d95f3`**（提交时间门里报的是 `2026-09-28T10:07:22.000Z`，
  ⚠ 与 §25 正文写的 `2026-09-28T18:07+08` 是同一时刻的两种时区写法，不冲突），第 19 份是 `reports/screenshots/round-8-interact/`（`gitSha=93650335…`，19 帧全红）。
- 逐册 pre_stamp 明细（今日，单位=帧）：exec-A-mock-final 650 / exec-A-mock-r7final 642 / exec-A-mock-stage7 275 /
  exec-A-real-only 194 / exec-A-real-r7final 195 / exec-A-real-stage7 107 / exec-A-real 819 / exec-A-showcase-r8e 31 /
  exec-guest-real-close-r8e 15 / exec-guest-real-final 436 / exec-guest-real-only 100 / exec-guest-real-r7final 105 /
  exec-guest-real-stage7 53 / exec-guest-real 434 / exec-tap-final 98 / exec-tap-final2 30 / exec-tap-final3 646 /
  exec-ws-tap-r8 37 / round-8-interact 19。合计 **4886**（与门自报一致）。
- §25 三种改法的投影（`CONSISTENT 8697/PRE_STAMP 19/STALE 324` 等）：**今日未复跑** ⇒ 该投影记 `unknown`（复刻件是 `.zcode/tmp/prov-predicate-replica.mjs`，跑它不等于跑门；本车道未据其下结论）。


### 0.2 verify-real-coverage
- 命令：`"$N" scripts/qa/verify-real-coverage.mjs`（同上，无写盘旗号）
- 当日读数：**exit=1**
  - `REALCOV_CASES=236`
  - `REALCOV_COVERED=198`
  - `REALCOV_UNCOVERED=10／236`
  - `REALCOV_UNCOVERED_LIST=10`
  - `REALCOV_AUTOMATABLE_EXEMPT=28`
  - `REALCOV_CONSERVATION=OK`、`REALCOV_UNCOVERED_LEDGER=OK`
  - `REALCOV_NEVER_ON_REAL=0`、`REALCOV_IDENTITYLESS_ON_REAL=0`、`REALCOV_SESSION_CONTRADICT_ROWS=0`、`REALCOV_SESSION_CONTRADICT_CASES=0`
- 与记账值（198/10/28）**逐字相同** ⇒ r8 那笔数在当前盘上仍然成立。
- 10 条点名（逐字抄自 `.zcode/tmp/lane-ruling-packet/r9-real-coverage.log:80-89`）：

| # | suite\|id | 缺的轴 |
|---|---|---|
| 1 | `PAGES-PROFILE-INDEX\|PFI25` | login |
| 2 | `SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI25` | login |
| 3 | `SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI34` | login |
| 4 | `次要18\|TD03` | login |
| 5 | `次要20\|OT05` | login |
| 6 | `次要20\|OT06` | login+guest |
| 7 | `次要20\|OT09` | login |
| 8 | `次要20\|VRN07` | login |
| 9 | `次要21\|OC09` | login+guest |
| 10 | `次要22\|VB03` | login |

## 0.3 #17 设备腿的拦门：三计数今日复量（**分歧仍然存在**）

| 计数 | 今日实测 | 出处命令（我跑的） |
|---|---|---|
| **booked**（权威判决件的成员名册） | `rows_len=28`、顶层 `groups=26`、顶层 `debtRows=434`、`generatedAt=2026-09-28T20:16:20.597Z` | `node22 -e "require('./reports/audit/round-7/guest-landing-booked.json')…"` |
| **measured**（已拍的复测腿） | `rows_len=28`、distinct groupKeys=28、`band=real@f0677920`、`generatedAt=2026-09-28T10:15:58.555Z`、全部 stable | `node22 -e "require('./reports/audit/round-7/guest-landing-measured.json')…"` |
| **roster**（预检走的那条成员来源，今日重跑） | `GUEST_LAND_ROSTER 组=27（成员来自 ops 的=27 只来自跑测的=0）成员行次合计=434｜跑测观察并集组数=26` ⇒ **exit=2** | `"$N" scripts/qa/verify-guest-landing.mjs --mode book --out .zcode/tmp/lane-ruling-packet/guest-landing-booked-r9.json`（book 模式文档自证"不开模拟器"；`--out` 指到本车道目录，`reports/` 未被写） |

- 今日的分歧数值就是 **28 / 28 / 27**（与 `followups-v33.md` §11 记的 booked=28、measured=28、roster=27 **逐字相同** ⇒ 病没自愈）。
- 唯一差的那一组，今日仍被点名，两句话逐字（`.zcode/tmp/lane-ruling-packet/r9-guest-book.log`）：
  - `policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何被收窄出游客腿的用例 ⇒ 这一组没有任何证人：` `subpackages/setup/recommend-pref/index → pages/login/index`
  - `组 subpackages/setup/recommend-pref/index → pages/login/index 一名成员都没有 ⇒ 有裁定却没有账本成员，不能出 GG-* 腿`
- **两套成员来源今日各自读到什么**（这是拦门的机制，实测非推断）：
  - 权威 booked 件里该组 `caseIds=RP01,RP02,RP06,RP10`、`memberSource={"fromOps":0,"fromRun":4}` ⇒ 它是**跑测观察**那一支喂进来的；
  - 今日预检用的跑测源是缺省 scratch `.zcode/tmp/triage-r7-guest.json`（`updatedAt=2026-09-26T23:57:29.862Z`，`results=reports/audit/round-7/exec-guest-real/exec-results.json`），其 `landingGroups` 今日 **26 组、其中 0 组含 recommend-pref** ⇒ 跑测那一支也给不出证人；ops 那一支该页 0 成员 ⇒ 名册空。
  - 今日读数 `GUEST_LAND_NO_RUN_WITNESS=1 组`（ops 有成员、跑测无证人 ⇒ 只报警不判红）与"完全无证人"的那 1 组是**不同的两组**，别混。
- **权威件自身守恒破裂（今日新量，§11 未记）**：`booked.debtRows=434` 而 `sum(rows[].caseIds.length)=438` ⇒ 差 **4**，正好等于 recommend-pref 那 4 个 id。本车道今日重跑出的 27 组版本 `debtRows=434 / sum=434` 守恒 OK。
  也就是说：**盘上那份权威账本用 28 组的名册报了 27 组的行次。**
  面板在 r8 复量时段写的侧车 `.zcode/tmp/final-verify/panel/guest-landing-booked-r7.json`（`generatedAt=2026-09-29T12:49:47.509Z`）也已是 `rows_len=27 groups=26 debtRows=434` ⇒ 分歧在 r8 复量时就在，只是权威件没被重打（`--out` 已修到侧车，属 §30 记的"D-17 已闭"那把刀的结果）。
- 本车道**没有**跑 `--mode measure`：预检通过后的路径会 `acquireUi` 并驱动 DevTools（`verify-guest-landing.mjs:245-247`），越过只读边界。
- 租约现状（只读问模块，未碰锁文件）：`heldLeases()` 打印 `[]`；`tmp/qa/locks/` 仍有 4 个 `wechat-automation-*.lock`（9420/9430/9431/cli），**未触碰、未清理**。

## 0.4 real-coverage 那 10 条：逐条查"盘上到底有什么"（含我自己一处已纠正的错）

> **先纠我自己本包上一版的错**：我原先在这里写"这 10 个 id 在 exec 语料里一行都没有"。**那句是错的**——
> 探针只读了 `j.rows`，而这些文件的行数组叫 `j.results`。按正确键名重跑后：**10 条全部有行、全部在 real 档有行，
> 但一条 `EXECUTED` 都没有，全是 `SKIPPED`**。教训与本仓"读空之前先确认键名"那条同族。

| 事实 | 今日实测 | 命令 |
|---|---|---|
| 门的语料范围 | `EXEC_DIRS=30` 个 `reports/audit/round-7/exec-*/exec-results.json`（缺省 `--dir reports/audit/round-7`，源码 :76-78 核过） | `node22 .zcode/tmp/lane-ruling-packet/probe-uncovered10.mjs`（已按 `results` 修正） |
| 10 条有无条目 | **10/10 有条目**（每条 14~20 行，散在 12~20 个 exec 目录） | 同上 |
| 10 条的 real 档 EXECUTED | **全为 0**；状态集合恒为 `[SKIPPED]`，real 档行数 10~16 | 同上 |
| 与门自报是否自洽 | 自洽：`REALCOV_NEVER_ON_REAL=0` ⇒ 不是"real 档零行"那一类；门的自检 `:324` 明写"real 档但全被 SKIPPED⇒仍算欠" | `r9-real-coverage.log` |

**逐条拦路原因（real 档 SKIPPED 的原因分布，今日现量）**

| 欠账行 | 主因（次数） | 这条红等谁 |
|---|---|---|
| `PAGES-PROFILE-INDEX\|PFI25` | 欠前置配方（先展开/先切态）×8、requiresReal×2、NOT_SHOOTABLE×1 | 载具/配方，不是裁定 |
| `SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI25` | 欠前置配方×5、requiresReal×2、observe-only×1、**栈顶=pages/login/index×1** | 载具 + 与游客落地族沾边 |
| `...VILLAGE-INDEX\|VI34` | 欠前置配方×5、requiresReal×2、observe-only×1、**栈顶=login×1** | 同上 |
| `次要18\|TD03` | **手写"交互禁触"DENY×9 + `VEHICLE_DENY`（词表，命中词=清空）×1**、requiresReal×2 | **F-04** |
| `次要20\|OT05` | 欠前置配方×9、requiresReal×2、身份 A/B 不由 guest 腿认领×1 | 载具/配方 |
| `次要20\|OT06` | 欠前置配方×12、requiresReal×2、NOT_SHOOTABLE×1 | 载具/配方（且缺 guest 轴） |
| `次要20\|OT09` | **手写禁触×9 + `VEHICLE_DENY`（命中词=清空）×1**、requiresReal×2、身份收窄×1 | **F-04** |
| `次要20\|VRN07` | 欠前置配方×7、requiresReal×2、身份 A/B×1、observe-only×1、**栈顶=login×1** | 载具/配方 |
| `次要21\|OC09` | 欠前置配方×7、**判据没点名可交互元素×5**、requiresReal×2、无 `--tap`×1 | **判据正文要收紧 ⇒ 拍板族** |
| `次要22\|VB03` | 欠前置配方族 + `栈顶=pages/profile/index×4`、observe-only×3、未点名元素×2、身份 A/B×2 | 载具/配方 |

| 授权 | 今日实测能关掉 | 依据 |
|---|---|---|
| **D-13 / #13**（代跑 18 份在途 exec-* 清单的戳字段） | **0 / 10** | §13 原话是"改的是产物清单里的戳字段，不改判决值"；覆盖门的分子看 exec 行的 `status/identity/band`，这 10 条 real 档**全是 SKIPPED**，改戳不动 status ⇒ 一条也关不掉。（今日另量到：18 份 manifest **全在盘**、**全部带 `resultsGitSha`**（§25 改法②的前提成立），但 **15/18 目录仍未被 git 跟踪**、3/18 已跟踪 ⇒ "别的车道正在写的未提交产物"这句今天仍为真。） |
| **G-17 / #17**（游客落地设备腿） | **直接 0 / 10；间接点名 4 条** | `grep -c "guest-landing" scripts/qa/verify-real-coverage.mjs` = **0** ⇒ 覆盖门不读 `guest-landing-{booked,measured}.json`。间接：`VI25/VI34/VRN07` 各 1 行、`VB03` 4 行的跳过原因是"本页没落在声明页（栈顶=login/profile）"——这一支与游客落地/守卫行为同族，但**要的是腿真的停在声明页**，不是多一本落点账 |
| **F-04**（两条 `VEHICLE_DENY` 是被误拦的） | **点名 2 条：`次要18\|TD03`、`次要20\|OT09`** | 词表 `DENY_TAP` 今日在 `r-exec-cli.mjs:138`（⚠ 文档写的 `:60` 已漂），命中词都是"清空"；同两条行还各有 **9 次**被另一支手写"交互禁触"表挡下 ⇒ **只放开词表翻不绿这两行**，两道拦门要一起看 |
| **OC09 的判据收紧** | 点名 1 条：`次要21\|OC09` | 5 次"action 含交互动词但没点名可交互元素 ⇒ 待把判据收紧"——这是改判据正文，属拍板族，不是载具活 |
| 与裁定无关的那把刀 | 主因覆盖 **7/10** 条 | "欠前置配方（先展开/先切态）"——补 prestate 配方是技术活 |

- **与文档不一致处（两个说法都留在这里，不覆盖）**：`followups-v33.md` §10 表把 real-coverage 的红归为"待 #17 的设备腿授权"。今日实测：该授权**直接收 0 条**，点名 2 条的是 **F-04**、点名 1 条的是 **OC09 判据收紧**，多数（7 条）等的是补前置配方。以本包附命令的读数为准。


## 1. 待拍板项（每项一节，边跑边填）

### 1.1 D-01 `--r-lg` 令牌值与判据正面冲突
- blocks_which_gate: 无（判据行 `MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004` 停在不动）
- measured_value: **仍然正面冲突**。`$radius-lg: 20rpx`（`apps/client/src/theme/design-variables.scss:201`）→ `--r-lg: #{$radius-lg}`（:445）→ 编译产物 `apps/client/dist/build/mp-weixin/app.wxss` 与 `mp-weixin-real/app.wxss` 里都是 `--r-lg: 20rpx`。另有两条互相矛盾的说法在盘上：`components/common/Card.vue:5` 注释写"圆角默认 --r-lg: 16rpx"，`tests/design-token-rulings.spec.ts:122` 把 `^\$radius-lg:\s*20rpx;$` 钉成断言 ⇒ **改令牌值必然让这条 spec 红**。
- command: `grep -rn -- '--r-lg *:' apps/client/src/theme/design-variables.scss`；`grep -rho -- '--r-lg:[^;]*' apps/client/dist/build/{mp-weixin,mp-weixin-real}/app.wxss`
- options: A 改判据指向一个实值 16rpx 的令牌 / B 改令牌值（连带 :122 那条 spec 与全站 `--r-lg` 消费者）
- cost_per_option: A=改判据正文（属拍板族，不动视觉）；B=`design-variables.scss:201` + `design-token-rulings.spec.ts:122` 两处 + 全站圆角视觉变化 + 需构建后帧级复核
- needs_user: true / runnable_now: false

### 1.2 D-02 `--c-text-inverse` 与 `--c-bg-container` 浅色同值
- blocks_which_gate: 无（受影响行 `MP-R2VIS-PAGES-MESSAGES-INDEX-001`）
- measured_value: **今日两处已不同值 ⇒ 这条按 §31⑤/`bc89dc79` 已闭**。`--c-text-inverse: var(--c-overlay-text-primary)`（`design-variables.scss:369`、`village/detail.vue:1473`，并由 `design-token-rulings.spec.ts:95-96` 钉住"不得再写 `#FFFFFF`/不得在暗色块重复定义"）；`--c-overlay-text-primary: rgba(255,255,255,0.95)`（:720）；`--c-bg-container: #{$bg-container}`（:376）。暗色那份重复定义已删（`tokens.scss:238` 只剩 `--c-bg-container: #1A1F26`，:249 是说明注释）。
- ⚠ 与文档不一致：`decisions-v33.md` §2 正文仍写"`design-variables.scss:108/121`、`tokens.scss:235/244` 两组值相同"——**那四个行号今日都不再定义这两个令牌**。
- 未量项：`MP-R2VIS-PAGES-MESSAGES-INDEX-001` 那行的**台账状态**（要读台账判决件，本车道未据状态改anything）⇒ `measured_value.status_of_row = unknown`
- needs_user: false（已按判据补齐实现）/ runnable_now: false

### 1.3 D-03 `MP-R2-PAGES-MESSAGES-INDEX-002` 判据 vs 已生效裁定
- blocks_which_gate: 无（mock 档判不了）
- measured_value: **仍成立**。`apps/client/src/pages/messages/index.vue:374` 逐字 `v-if="!sessionStore.isLoggedIn && !useMock()"` ⇒ mock 档该组件不挂；:65 `isUnlocked = isLoggedIn || useMock()` 同向。组件与文案两侧都在（:25 import、`zh-CN.ts` 键位）
- command: `grep -n "useMock" apps/client/src/pages/messages/index.vue`
- options: A 改判据（承认 mock 档判不了，换成真实档判点）/ B 改裁定（让该组件在 mock 下也挂）
- cost_per_option: A=改判据正文；B=动 `:374` 的守卫条件 ⇒ 会改变 mock 档可见面，需重建 + 帧级复核
- needs_user: true / runnable_now: false

### 1.4 D-04 AppShell 左右内距 28rpx 还是 32rpx
- measured_value: **这条已过期**。`apps/client/src/components/layout/AppShell.vue:283` 与 `:291` 现值都是 `padding: 0 32rpx`，:315 吸顶行 `… 32rpx …`；:281 注释明写"旧值 28rpx 与令牌差 4rpx" ⇒ 已按 -005 口径补齐（与 §31⑤ 自报一致）。
- ⚠ 与文档不一致：`decisions-v33.md` §4 仍写"AppShell 仍是 `0 28rpx`、我停在原地没改码"。当前盘上是 32rpx。
- 附带一条 §31⑤ 已登记的引用缺陷，今日复核仍在：`decisions-v33.md:37-39` 引用的 `APPSHELL-005` 在仓里 0 命中（编号不存在）。
- needs_user: false（已实现）/ runnable_now: false

### 1.5 D-05 帧像素与清单路径要不要长期可查
- measured_value（今日现量，逐字节 sniff 前 12 字节）：`git ls-files reports/` 下 `.png` = **835**；其中** JPEG 字节挂 .png 名 = 826**、**真 PNG = 9**、其它 0 ⇒ 与 §21 记的 835/826/9 **逐字相同**，比例 98.9%。
- command: `node22 -e "…git ls-files reports/ → 逐个 openSync/readSync 判 ff d8 ff vs 89 50 4e 47"`（本车道跑的，输出在上面那行）
- options: A 帧进 LFS + 清单绝对路径改仓内相对 / B 包外归档只留 hash / C 明写"证据绑定采集机"
- cost_per_option: A=改历史（要单独授权）+ 需与 D-08 同批（否则 clone 里"路径对、文件不存在"）；B=报告模板去掉可携长相的引用；C=零代码成本，代价是引用永久只在本机可读
- needs_user: true / runnable_now: false

### 1.6 D-06 各轮写进库的测试数据要不要清
- blocks_which_gate: 无（连带影响台账行 `MP-R2-PAGES-MESSAGES-INDEX-014`）
- measured_value: `posts/comments` 今日实数 = **unknown**（本车道不连后端、不读库）。
  **且这条不在只读车道能力范围内**：`scripts/qa/inventory-g8-test-data.mjs` 自身有 3 处 `writeFileSync`（:124 台账、:127 报告、:191 SQL）⇒ 重量它就要写盘，本车道没跑。
- options: A 清（要先有人对完 schema 表名；`test-data-cleanup.sql` 现默认 ROLLBACK 且表名未实名替换前删不动）/ B 继续保留（并让 014 那行继续挂着）
- cost_per_option: A=删数据不可回滚 + 撤销"保留"裁定；B=每跑一次 G8 计数继续 +1
- needs_user: true / runnable_now: false

### 1.7 D-07 `village-publish-001` 提示元素与文案缺设计依据
- measured_value: `unknown`（判据正文与设计稿出处需产品口径，非盘上可测）。今日仅复核：`decisions-v33.md:61-63` 与 §31⑤ 第二条指的是同一条判据（两处都在等裁定，不是两条）。
- options: 定字数阈值按哪一页语义 / 定提示文案以哪张设计稿为准（§31⑤ 另记"判据写 0/1000 与在跑的 500 相互矛盾"）
- needs_user: true / runnable_now: false

### 1.8 D-08 几百个非 png 的文本 dump 要不要入库
- measured_value（今日 `ls | wc -l` 与 `git ls-files | wc -l`）：
  | 目录 | 今日文件数 | 今日已跟踪 | 文档原记 |
  |---|---|---|---|
  | `reports/screenshots/round-2-interact` | **499** | 0 | 258 |
  | `reports/screenshots/round-6-interact` | **868** | 0 | 340 |
  | `reports/screenshots/round-2-tour` | **5** | 0 | 3 |
- ⇒ **文档那三个数是旧的**（今日分别多 241 / 528 / 2）。两个数都记在这里，当前值以上表为准。
- 与 D-05 耦合：`git ls-files reports/audit/round-7/tapfix-briefs/` = **0**（§21 已记），所以"帧进 LFS"若不连这批文本产物同批裁，可携性只做一半。
- needs_user: true / runnable_now: false

### 1.9 D-09 高 dpr 机型档的巡检帧要不要补
- measured_value: `unknown`（本车道未重测全库帧尺寸分布）。文档记的口径：全库最大竖屏 459×1012、近期档 378×814，且"没有一行真实档欠账以高 dpr 为前置"。
- 可复核的廉价代理（本车道**没跑**，因为要遍历帧头）：逐帧读 IHDR/SOF 取尺寸 ⇒ 命令留给有权写盘的车道做。
- options: A 加一档高 dpr 重拍 `HOME-005` 与 `TMP-TOUR-R2-004` / B 接受两条长期 `NOT_SHOOTABLE` 并改免检（=改判据口径）
- needs_user: true / runnable_now: false

### 1.10 D-12 round-1 那 144 帧要不要显式 LEGACY 豁免
- blocks_which_gate: `verify-evidence-corpus`
- measured_value: **今日实测该门已 PASS ⇒ 选项 A 事实上已经落地**。`"$N" scripts/qa/verify-evidence-corpus.mjs`（带 `QA_EVIDENCE_STORE=D:/6/love-mini-evidence`，照终验脚本 `SWEEP_STORE_MODE=reachable` 那一支）⇒ **exit=0**，`CORPUS_PROBLEMS=0`、`CORPUS_SCANNED=47`、`CORPUS_MANIFESTS_TOTAL=53`、`CORPUS_LEGACY_NO_SHA=1`、`CORPUS_LEGACY_FRAMES=144`、`CORPUS_STORE=reachable`。
  门自己点名那一册：`reports/screenshots/round-1/manifest.json  shots=144 … gitSha=- → 无gitSha(顶层无 gitSha，但 generatedAt=2026-09-19T17:28:57.090Z 早于打戳约定 2026-09-24T16:31:39.000Z ⇒ legacy：不判红…)`
- ⚠ 但门自己留了后半句，别把它读成"已背书"：`legacy ≠ 通过：这批帧无戳可核，本轮终报不得引用它作「产物级」证据`。
- ⚠ 与文档不一致：`decisions-v33.md` §12 仍把这条写成"corpus 门现在唯一剩下的具名红"，§30 又写"r7 corpus 转绿"。当前读数：**绿**，且这条红已不再是任何门的红源。
- needs_user: **只剩"是否允许终报引用这 144 帧"这一句**（豁免机制本身已在盘上生效）/ runnable_now: false

### 1.11 D-13 18 份在途 exec-* 清单要不要授权代跑
- blocks_which_gate: `verify-provenance-all`（**不** block `verify-real-coverage`，见 §0.4 实测 0/10）
- measured_value（今日现量）：18 份 `manifest-detail.json` **全部在盘**、**18/18 都带 `resultsGitSha`**（§25 改法②的前提成立）；**15/18 目录未被 git 跟踪**、3/18 已跟踪 ⇒ "别的车道正在写的未提交产物"今日仍为真。这 18 册贡献 `4886−19=4867` 帧（第 19 册 `round-8-interact` 的 19 帧不在 #13 范围内）⇒ **与 §13 记的 `PRE_STAMP=4867` 逐字相同**。
- command: `node22 -e "…逐目录读 manifest-detail.json 查 resultsGitSha + git ls-files 数跟踪状态"`（输出：`18_dirs_checked=18 manifest_missing=0 with_resultsGitSha=18 git_tracked_dirs=3 git_untracked_dirs=15`）
- options: A 授权代跑修好的生产者（只改戳字段）/ B 留给 exec/帧车道自己重拍
- cost_per_option: A=改 18 份未提交产物的戳字段、判决值不动；**但对两把红的收账今日实测为 0 条 real-coverage + provenance 仍需 §25 那一步**（改戳本身不会把 pre_stamp 变成 consistent，因为门比的是"归属晚于实物"）；B=慢，且每份由产出者背书
- needs_user: true / runnable_now: false（生产者写盘 ⇒ 越本车道只读边界）

### 1.12 D-14 生产者集合 11 vs 12
- blocks_which_gate: `verify-provenance-all`（计数轴，不进判红集合）
- measured_value: 今日 `PROV_PRODUCERS=11`、`DERIVED_OK=11`、`LITERAL_SHA=0`、`NO_DERIVE=0` ⇒ **盘上确实按选项 A 落定了**，`deadbeef` 那枚写死已不在门眼里（`LITERAL_SHA=0`）。
- options: A 维持 11（诚实数）/ B 把派生常量命名为 `GIT_SHA` 让它重回 12（一行）
- cost_per_option: B=一行改名，换门多盯一个生产者
- needs_user: true（但当前状态已是 A，不选就维持）/ runnable_now: false（B 是改码，不属只读车道）

### 1.13 D-15 `verify-openqueue-lanes.mjs` 修成门还是归档
- **一句话**：**没有裁定就跑不了**——它无条件写盘，本车道不许跑；但"要不要接"这个决定本身今天就能用命令支撑（下列读数我跑了）。
- measured_value: 文件在（6279B）；`grep -c "process.exit" scripts/qa/verify-openqueue-lanes.mjs` = **0** ⇒ "打完 OPENQ_RESULT=PARTIAL 仍 exit 0"这句今日仍为真；:22 `const DIR = resolve(REPO, "reports/audit/round-7")`（写死轮次）、:90 `writeFileSync(join(DIR, "cellplan-round7-openqueue.json"), …)` 无条件覆写判决件 ⇒ **跑它就等于写 reports/**（本车道没跑）。它仍只在 `gen-round8-report.mjs` 与 `.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts` 里被**点名排除**，没被当门跑。
- options: A 先修（exit 码与判决一致 + 不无条件覆写 + 去写死轮次）再接 / B 当 round-7 一次性转换工具归档
- cost_per_option: A=改一个脚本的三段；B=零成本，但"stage 里少一条门"这件事从此只能靠注释提醒
- needs_user: true / runnable_now: false

### 1.14 D-16 `run-round7-closeout.mjs` 接不接进工作流
- **一句话**：**`--list` 这一发不需要裁定、我今日已跑（只读、exit 0）**；"接不接进工作流"这个接线决定仍要用户。
- measured_value（今日现跑）：`"$N" scripts/qa/run-round7-closeout.mjs --list` ⇒ **exit=0**，`CLOSEOUT_FLAGS=OK`、`CLOSEOUT_RESULT=LIST`、`CLOSEOUT_PLAN 总步骤=61 本次启用=22（只读门为主；写盘步骤要 --allow-write，G8/G9 要 --with-g8，终报要 --with-report）`。旗标白名单在 :45（10 个，乱给旗标 :47 直接 exit 2）。:523 的 `--list` 早退点在所有 spawn 之前 ⇒ 纯读。脚本本体 :357 明写"下面整段只在直接跑收尾时执行：会 spawnSync 各消费者、读设备租约、最后 process.exit" ⇒ **真跑要占设备/租约，越本车道边界**，本车道只跑了 `--list`。
- options: A 经"收口守门员"接进工作流 / B 留在人工收尾时用（每次手跑才有答案）
- cost_per_option: A=接线一处 + 工作流时长增加（默认 22 步）；B=零改动，代价是"stage-8 过了吗"每次要人手跑
- needs_user: true（接线口径）/ **runnable_now: true（仅 `--list`；真跑需设备空着 + 用户放行）**

### 1.15 D-17 面板重打权威判决件（decisions 原 #17 编号）
- measured_value: **今日复量确认已闭**（三发写权威件的调用都改到侧车/加了 `--dry`）：`emit-round-report.mjs:820` 带 `--out GUEST_BOOK_SIDECAR`、`:636` 一带 `verify-source-shape` 带 `["--dry"]`、evidence-holes 落 `.zcode/tmp/final-verify/panel/evidence-holes-verdict-r7.json`。侧车实物：`panel/{guest-landing-booked-r7.json, evidence-holes-verdict-r7.json, band-freshness-r7.json}` 都在盘上（Sep 29 20:49）。
- ⚠ 编号撞车（本包已改名避免误裁）：编排方口中的 "#17" 指**游客落地设备腿**（= followups §11），而 decisions §17 是这条面板重打件。见 §2 那节。
- needs_user: false（已闭）/ runnable_now: false

### 1.16 D-18 分诊台判据台目录反推（decisions 原 #18）
- measured_value: **闭，但"反推仍是默认"这句今日复核为真**。`triage-exec-failures.mjs:507 const OPS_EXPLICIT = argv.indexOf("--ops") >= 0`、`:511` 仍是 `dirname(dirname(RESULTS))/ops` 反推、`:524 if (!OPS_EXPLICIT && fs.existsSync(RENAME_OPS))` 的 fail-closed 在。⇒ 显式给 `--ops` 才走人给的目录；不给就走反推 + 目录不存在才红。
- needs_user: false（残留那半属实现，不是政策）/ runnable_now: false

### 1.17 D-23 体积达的是哪一个口径
- blocks_which_gate: `scripts/verify-package-size.mjs`（⚠ 不在终验 18 步清单里；今日 `grep -c writeFileSync` = **0** ⇒ 纯读，我跑了）
- measured_value（今日现跑，被测物 `apps/client/dist/build/mp-weixin`）：去旗 **exit=1**、挂 `--allow-mock` **exit=0** ⇒ "门本身能红、不是自我放行"今日复现。门自印：`主包: 27.78MB (上限 2.00MB)  ← 以上数字只代表上面那个档，不是发布形态`、`总包: 28.82MB (上限 10.00MB)`，分包 village 0.19 / circles 0.11 / … 。
- ⚠ 与文档不一致（往好的方向）：§23 说"现状是只印一个数、最容易读错"——**门今日已经自印口径声明那一行**，即选项 B 的那半已落。发布形态 1.72MB / `src` 退化 2.76MB 这两个数**今日未复算**（要重建，越界）⇒ 记 `unknown`。
- options: A 门的被测物/阈值按发布形态判 / B 三门并立但强制标口径（**已部分成立**）/ C 让 mock 档也降下来（要动被钉为"不许删"的素材）
- cost_per_option: A=改门的被测物与阈值；B=补两处打印；C=动素材 ⇒ 单独放行
- needs_user: true / runnable_now: false（要复算发布形态数就得重建）

### 1.18 D-24 `utils/person-avatars.ts` 21 条强制 import 要不要动
- measured_value: **今日逐文件实到**：该文件解析出 **21 条**唯一引用、**21 条全部能在盘上解析**、字节合计 **999,151 B（0.95MB）** ⇒ 与 §24 记的 999,151B **逐字相同**。文件本体 2717B。
- command: `node22 -e "…person-avatars.ts 正则取引用 → statSync 累加"`（输出 `refs_found=21 unique=21 resolved=21 total_bytes=999151`）
- options: A 动它（`src` 退化口径 2.76MB → 约 1.81MB）/ B 不动（保持 0.76MB 缺口）
- cost_per_option: A=可能复发 09-03/09-12 那两次头像 404；B=发布形态余量维持约 0.28MB
- needs_user: true / runnable_now: false

### 1.19 D-25 provenance 那批 pre_stamp 帧
- blocks_which_gate: `verify-provenance-all`
- measured_value（今日）：见 §0.1 —— `PRE_STAMP=4886 / CONSISTENT=4154 / STALE=0 / LEGACY=144 / 其余轴全 0`，**全部帧数 9184 且 in=out 守恒**；**19 册全帧 pre_stamp**（18 册共用 `6fd151786c…`，第 19 册 `round-8-interact` 用 `93650335…`）；逐册明细合计今日复算到 4886（见 §0.1 那张表）。
- §25 的三种改法投影（8697/19/324 与 9165/19/0）：**本车道未复跑** ⇒ `unknown`。"三种改法都买不到绿"这句我**只能确认前提**（18/18 份册内都有 `resultsGitSha`，见 D-13），不能替它背书。
- options: (a) 重跑这 19 册的腿（设备时间，量级=十几个 leg）/ (b) 给一条长期口径"转换带/跨提交带的历史帧不作产物级引用"（= 给门加 legacy 档，改判口径）
- cost_per_option: (a) 十几个 leg 的设备时间，不改判据；(b) 一行口径但从此"归属晚于实物"不再判红
- needs_user: true / runnable_now: false

### 1.20 D-28 CH22 三处互斥的解释
- measured_value（今日现量，盘上第三个事实仍然成立）：`apps/client/src/subpackages/campus/campus/hub.vue:269` 起 `<scroll-view`、:270 `class="campus-hub__feed"`、闭合在 **:334**；`campus-hub__more-arrow` 全文件 **1 命中**且就是 :768 那行样式（模板里 0 命中）⇒ §28 的"底部块无箭头节点"那半今日仍可判。
- ⚠ 文档里那条行号漂移的提醒仍然有效：判据正文写 `:336-339`，今日实到 :330-332 一带（样式行 :768）。
- options: (a) 承认它是 scroll-view、ACTION 句当笔误（需执行器加"读 scroll-view 数值"能力）/ (b) 搬出 scroll-view 做页级滚动（结构改动，牵 :269-271 的 enhanced/bounces）/ (c) 拆成两条各判各的
- cost_per_option: a=载具加一通道；b=动结构 + 需重建两档；c=新增一行判据
- needs_user: true / runnable_now: false

### 1.21 D-29a 那 5 组落地对的产品级归属（重拍带身份的切片）
- blocks_which_gate: 无（#29 的 (b) 已把这条从判红集合移出，今日 `run-qa-selftests`/triage 侧未复量）
- measured_value: `unknown`（本车道未重跑 triage；r8 记账 `landingMissing=5` 且 (b) 已落地）
- options: (a) 对那 5 页各跑 `--identity guest` 与 `--identity A` 两条腿 / (c) 长期挂着、总报告如实写"无法归属"
- cost_per_option: a=两条腿设备时间，不改门的任何判定；c=零成本但这条永远不算结案
- needs_user: true / runnable_now: false（要占设备）

### 1.22 G-17 游客落地设备腿（编排方所称 "#17"；= followups §11）
- blocks_which_gate: `verify-guest-landing`（拦门 exit 2）；**不** block `verify-real-coverage`（今日实测直接收 0 条，见 §0.4）
- measured_value: **三计数今日复量 = 28 / 28 / 27，分歧仍在**（逐项出处见 §0.3），唯一差的组是 `subpackages/setup/recommend-pref/index → pages/login/index`；**另量到一处 §11 没记的**：权威 booked 件自身守恒破裂（`debtRows=434` vs `sum(caseIds)=438`，差 4 = 该组 4 个 id）。
- options: (a) 预检允许"整页都是游客断言"的组用该页游客行当证人（要配一条能变红的负例）/ (b) 按 booked 名册给 RP01/02/06/10 补 `identities:["guest"]`（判据台 canon 变、必须重打戳）
- cost_per_option: 两个都改"游客这条腿该判哪些行"= 改判域；(a) 还要新增负例测试；(b) 要重打 ops 戳
- needs_user: true / **runnable_now: false**（`--mode measure` 预检过后会 `acquireUi`+驱动 DevTools；本车道只跑了不碰模拟器的 `--mode book`）

### 1.23 D-31e `MP-R2VIS-PAGES-MESSAGES-INDEX-002` 游客计数 vs 登录裁定
- measured_value（今日）：那条"让 mock 不可测"的守卫确实存在 —— `pages/messages/index.vue:374` 的 `!useMock()`。判据要的游客可见 `/recommendations/people` 计数与在册裁定（游客必须引导去登录/注册）方向相反，与 D-03 是**同族的两个不同判据 id**（`MP-R2-…` vs `MP-R2VIS-…`），别当一条裁。
- options: 按判据补实现（= 推翻游客引导裁定在这一页的适用范围）/ 按裁定改判据 / 收窄判据到登录档
- cost_per_option: 第一条会动产品行为并改变落点账基线；第二条属改判据正文
- needs_user: true / runnable_now: false

### 1.24 F-04 两条 `VEHICLE_DENY` 是被误拦的（载具白名单）
- blocks_which_gate: `verify-real-coverage`（**点名 2 条**，见 §0.4）
- measured_value（今日现量）：词表 `DENY_TAP = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/`，今日位置 **`r-exec-cli.mjs:138`（⚠ 文档写的 `:60` 已漂）**、`r-exec-ws.mjs:391` 同一份。`exec-interact-real-sc-r10/exec-results.json` 49 行里 **`VEHICLE_DENY`=2**：`次要18|TD03`、`次要20|OT09`，命中词都是"清空"，`band=real@ed1cd82c`、`identity=A`、`status=SKIPPED`。这两条**都在今日 real-coverage 点名的 10 条里**。另：round-6 ops 全目录静态扫该词表命中 **31 行**（比"两条"多得多）⇒ 放宽词表的暴露面按词表算远大于 2。
- options: A 从词表摘掉"清空"（或限定为"清空账号"）/ B 保持（载具白名单是安全边界，收口轮不顺手放宽）
- cost_per_option: A=收 2 条 real-coverage 欠账，但同两条各还有 9 次被手写"交互禁触"表挡 ⇒ **单放开词表翻不绿**；且静态命中面 31 行意味着误放可能真打掉共用会话；B=这 2 条继续挂欠账
- needs_user: true / runnable_now: false

### 1.25 F-09 `profile-svg-to-png` 重写被跟踪的源 PNG
- blocks_which_gate: `verify-band-freshness` / `verify-provenance-all`（文档登记的"未来假红候选源"）
- measured_value（今日）：`git status --porcelain apps/client/src/static/assets/profile/png/profile-hero.png` = **空（干净）** ⇒ 抖动此刻不在工作树里；**"任何一次构建都会脏一棵树"这句我没法验**（验它要重建，越界）⇒ 记 `unknown`。文档记的抖动了数值（28622B 重生 vs 28638B 在册，差 16B）本车道未复现。
- options: A 产物改写入 `dist` / B 加 `--check` 只验不写 / C 让它确定化输出字节
- cost_per_option: 三条都属改构建链 ⇒ 文档已写明"动完必须重建三档 + 全量复量，属新的授权范围"
- needs_user: true / runnable_now: false


## 2. 编号漂移登记（重要）

### 2.1 并发变更：我干活期间 `decisions-v33.md` 被别的车道加了 §32（21:41 用户已裁 4 项）
- 起跑时该文件 412 行、止于 §31；**现在 441 行、多出 `## 32. 2026-09-29 21:41 用户裁定四项`**（`git status --porcelain` 显示该文件是 `M`，`scripts/qa/emit-round-report.mjs` 也是 `M` —— **这两处都不是本车道改的**，本车道只写了 `.zcode/tmp/lane-ruling-packet/`）。
- 被 §32 裁掉的四条，正好落在我这份包里的编号：**D-13（#13 授权代跑）**、**D-25（#25 记为已知历史红）**、**G-17（§11(a) 整页游客断言即算证人；明确不采用 (b)）**、**F-09（§9 授权修：产物移出 src 并确定化）**。
  ⇒ 本包 25 条里**净待裁 = 17 条**（21 条 `needs_user=true` 减去已被 §32 裁的 4 条；另 4 条 D-02/D-04/D-17/D-18 属"已实现/已闭但文档仍列为待裁"，D-16 的 `--list` 属"无需裁定我已跑"）。
- **我的实测与 §32 的那句自我纠正相互独立地对上了**：§32 写"用户是在『#13 是那 10 条欠账的主要解法』这句话的前提下选的，而今日实测它是 0 条"。
  本车道在**没读到 §32 之前**（我的 real-coverage 复量在 21:35、探针修正在 21:5x）独立量到同一个结论：**#13 对 10 条欠账收 0 条**（见 §0.4，附命令）。
  但本车道还要补一句 §32/L7 那版没说清的：**那 10 条并不像"没有行"，它们每条在 real 档都有 10~16 行、只是全部 `SKIPPED`**（我第一版探针读错键名 `rows`/`results` 才得出"零行"，已在本包 §0.4 纠正并留痕）。
- ⚠ **`§32.1` 是个还不存在的锚点**：`grep -n "32\.1" reports/audit/round-7/decisions-v33.md` = 2 次命中，全部在 §32 正文里（:420/:421），文件到 :441 结束、**没有 §32.1 那一节**。
  ⇒ "授权范围是否延伸"这件事现在挂在一个空引用上：**用户看不到重述，就无从决定是否把 #13 的授权延伸到 provenance 那侧**。这条属"必须补上才能继续"的文档缺陷，不是政策选择。

### 2.2 编号撞车（避免用户按错号裁定）
- 编排方口中的 "#13/#17"：`#13` 与 `decisions-v33.md` §13 一致（18 份在途 exec-*）。
- `#17` **不一致**：`decisions-v33.md` §17 是"面板重打权威判决件"（§30 记已闭、本车道复量确认已闭 = D-17），
  而 `followups-v33.md` §11 与 §10 表里"待 #17 的设备腿授权"指的是**游客落地设备腿**。
  本包用 `G-17` 标这条腿、用 `D-17` 标面板重打。§32 里用户那句"§11(a) 游客腿成员来源"选的正是 `G-17`，不是 `D-17`。

### 2.3 本车道量到"文档数字已过期"的全部条目（两个数都留着，不覆盖）
| 条目 | 文档记 | 今日实测 | 方向 |
|---|---|---|---|
| D-08 三个未跟踪目录文件数 | 258 / 340 / 3 | **499 / 868 / 5** | 文档偏小（今日更多） |
| D-01 | 只在 §1 说 20rpx | 今日两档产物都印 `--r-lg: 20rpx`，且 `Card.vue:5` 注释自称 16rpx、`spec.ts:122` 钉死 20rpx | 冲突面比文档记的大 |
| D-02 | §2 仍列为待裁 + 四个行号 | 令牌已不同值 ⇒ 已闭；那四个行号今日都不再定义这两个令牌 | 文档过期 |
| D-04 | §4 仍写"AppShell 仍是 0 28rpx、我没改码" | `AppShell.vue:283/:291` 都是 `padding: 0 32rpx` | 文档过期 |
| D-12 | §12 写"corpus 门唯一剩下的具名红" | `verify-evidence-corpus` 今日 **exit=0**、`CORPUS_PROBLEMS=0` | 文档过期（§30 的说法才是当前态） |
| D-23 | §23 写"门只印一个数，最容易读错" | 门今日已自印"← 以上数字只代表上面那个档，不是发布形态" | 文档过期（选项 B 那半已落） |
| F-04 | §4 写 `r-exec-cli.mjs:60` 是词表 | 词表今日在 `:138` | 行号漂移 |
| D-16 | §16 只有"hasConsumer=false / 能红能绿" | `--list` 自报 `总步骤=61 本次启用=22`（今日现跑） | 新增可用数 |
| G-17 | §11 记 booked/measured/roster = 28/28/27 | 复量 **仍是 28/28/27**，另发现权威件自身 `434 vs 438` 守恒破裂 | 病未自愈 + 新证据 |
| real-coverage 归因 | §10 表写"待 #17 的设备腿授权" | 该授权直接收 **0/10**；点名 2 条的是 F-04、1 条是 OC09 判据收紧，7 条等前置配方 | 归因不成立 |

