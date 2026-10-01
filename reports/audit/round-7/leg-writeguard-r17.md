# r17 车道：guest 落点实测腿的「写入守卫」+ 重连复跑

HEAD 起点：`491210dd`。本车道只写：`scripts/qa/verify-guest-landing.mjs`、新增守卫模块
`scripts/qa/measured-ledger.mjs`、新测试 `scripts/qa/test-guest-landing-writeguard.mjs`、
`reports/audit/round-7/guest-landing-measured.json`（只经载具写，不手改）、本报告。

**行号口径**：本文给的 `文件:行` 都是**本车道收账时的工作树**行号（一程之内会被同伴改动推着走，
例如 L17b 往同一段注释里核正行号就把 `clearSession` 从 `:300` 推到 `:302`）。要复核请认文本锚：
接线锚 `import { ROW_POLICY, mergeMeasuredLedger, shrinkRequested }`、判点锚
`const mergeNow = () => mergeMeasuredLedger(`、落盘锚 `if (lastMerge.write) writeFileSync(MEASURED`、
booked 锚 `writeFileSync(BOOK_OUT, JSON.stringify({`。

## 1. 缺陷复述（编排方 2026-09-30 01:18 的读数）

**现象（编排方 01:18 亲测，不是推断）**：按裁定放行游客落地测量腿后开跑，预检过、UI 租约拿到，
却在第一条 `clearSession` 抛 `cant find runtimeid by projectpath …mp-weixin-real` 而死。
`MEASURE_EXIT=1`、**落盘帧 0 张**（一条证据都没产出），可权威台账
`reports/audit/round-7/guest-landing-measured.json` 已经被改写：

| 字段 | 运行前（`guest-landing-measured.json.bak-prer9-20260930-011844`） | 崩溃后落盘 |
| --- | --- | --- |
| `rows.length` | 28 | `[]` |
| `generatedAt` | `2026-09-28T10:15:58.555Z` | 崩溃那次的时间戳（重打） |
| `repeat` | 1 | 3（重打） |

编排方从 `bak-prer9-20260930-011844` 还原，读数 `RESTORED rows= 28`、sha256 与备份全等。
**⇒ 一次没有产出任何证据的失败测量，把上一轮（2026-09-28 real@f0677920）的 28 行真实测量抹掉了。**

**崩点行号（L17b 按 `git show HEAD:…` 逐行核过，修正 L17 注释里的一处偏移）**：
- `scripts/qa/verify-guest-landing.mjs`（HEAD 旧文件）**:265** 造出 `rows: []` 空壳、**:266** 无条件
  `writeFileSync(MEASURED, …)` ⇒ 写在 for 循环**之前**；**:271** 循环体第一条就是 `clearSession({ project })`；
  **:289** 才是逐行落盘那次写。
- 抛错处 `scripts/qa/cli-automator.mjs:348-349`（`clearSession` → `evaluate`）；
  `cant find runtimeid by projectpath` 这句**不在本仓代码里**（grep 全 `scripts/qa/` 零命中），
  它是 IDE/CLI 桥的返回文案被原样抛出，所以判据不能靠匹配这句话、只能靠"退出码 + 有没有行"。

**两条根因分开写清（本车道只治第二条）**：
- (i) **触发 = 编排时序**：通道 01:06 接好、另一条车道 01:07:18 重建 real 档 ⇒ IDE 对该路径的 runtime
  绑定失效（本仓老规矩：每轮重建 real 档后必须重接设备腿）。这是操作时序问题，不是载具缺陷，
  本车道不改任何时序，只在 §4/§7 如实交代重接与读数。
- (ii) **缺陷 = 载具自己**：失败/零行路径**无条件覆写**权威台账，`generatedAt`/`repeat` 跟着重打，
  等于"拿一次崩溃冒充一次新测量"。这条是本车道的治疗对象：§2 的写入守卫。

**判据归属**：这是本仓已点名的失败族"rejection/crash 路径仍然把它自己的报告要读的那些字段填掉了"
的又一次实例（同一形状见 `measured-ledger.mjs` 头注），不是游客腿独有的毛病。

## 2. 写入设计选型（合并 vs 旁路档）

**选定：合并（`merge-never-shrink`），不建旁路档。** 接线只在
`scripts/qa/verify-guest-landing.mjs` 的 `measure()` 里，判点位置（本车道改完后的行号）：

| 位置 | 作用 |
|---|---|
| `:14` | `import { ROW_POLICY, mergeMeasuredLedger, shrinkRequested } from "./measured-ledger.mjs";` —— 接线本身 |
| `:266-269` | `--allow-shrink` 用 `process.argv.indexOf` 取值（裸给 flag 也算"点名过但没拼对"），交 `shrinkRequested()` 判；拒了就印 `GUEST_LAND_SHRINK=REJECTED` 并退回合并 |
| `:271-274` | `runMeta` = 旧 `out` 的七个头字段（mode/generatedAt/project/band/guestCapable/repeat），形状与模块声明逐字对上 |
| `:274-283` | **本车道唯一新增注释**：写清为什么这里必须守卫（引 01:18 的实测形状 + "台账是这台设备唯一不可重生的仪器证据"）；行号已由 L17b 按 `git show HEAD:` 核正 |
| `:284-293` | 写盘前**先读既有台账**；读不动就 `exit 2` 拒写（宁可不写，也不把读不懂的 prev 当空账本） |
| `:294-295` | 印 `GUEST_LAND_LEDGER_GUARD=merge-never-shrink 既有台账 rows=<N>`——让"先读后写"可被人核 |
| `:296-297` | `measured` 数组 + `mergeNow()`（只调模块，不在载具里再写一份合并逻辑） |
| `:320-321` | 逐行落盘：`lastMerge = mergeNow(); if (lastMerge.write) writeFileSync(MEASURED, JSON.stringify(lastMerge.doc, null, 1));` |
| `:325-331` | 收尾印 `GUEST_LAND_LEDGER_WRITTEN=yes|no reason=merged|explicit-shrink|no-rows-contributed` + 行数/就地更新/新增/保留旧行/丢弃/无键被拒 |

**为什么不是旁路档**：旁路档只把"被抹掉"变成"没人读那份"——空壳仍然会被写进权威路径，而
`guest-landing-status.mjs:6-20`（三态判决）与 `triage-exec-failures.mjs:839` 读的都是
`reports/audit/round-7/guest-landing-measured.json` 这一个路径；改名等于把权威载体分叉成两本账，
判决与消费端各读各的。合并把不变式直接钉在唯一载体上：零行不写（`generatedAt`/`repeat` 跟着不动，
不拿崩溃冒充新鲜度）、有行只按 `groupKey` 就地覆盖、旧行永不因"本轮没量到"而消失、减行只认显式 `SHRINK_ROWS`。
"逐行落盘"这条既有优点保留了（`:320-321` 每行都写），中途掉链子时已量到的行仍然是证据。

**有没有改守卫模块：没有。** 先读了 `measured-ledger.mjs` 全文（128 行，本车道 0 改动，`wc -l` 仍 128）：
它的 `prev / incoming / runMeta / opts` 与真实写盘点逐一对上（`prev`=台账 JSON、`incoming`=本轮量到的行
且每行有 `groupKey`、`runMeta`=旧 `out` 的头字段），所以只接线，**不需要**改模块，也**没有**在载具里
写第二份合并逻辑。删掉的旧形状：循环前那次 `writeFileSync(MEASURED, …rows: []…)` 整条没了——
现在全文件只剩**一处** `writeFileSync(MEASURED`，且必须读合并结果的 `.write` 才落盘（这条是 §3 的断言之一）。

## 3. 负例与 RED 能力证明

新测试：`scripts/qa/test-guest-landing-writeguard.mjs`（`wc -l` 401 行，文件名匹配聚合器
`run-qa-selftests.mjs:26` 的 `^test-.+\.(cjs|mjs)$` 自动收件规则）。全程离线：设备调用换成
`.zcode/tmp/guest-writeguard-r17/` 下的一次性桩，UI 租约按趟隔离在临时 `QA_LOCK_DIR`，
权威台账**只被读取**（结尾一条断言就是它的 sha256 与开跑前全等）；测试自带的保险闸
`guarded()` 规定任何写/删只许落在 `.zcode/tmp/guest-writeguard-r17/` 下，越界即抛。

断言 48 条（`SUMMARY: checks=48 assertion failures = 0`），四组：
- **守卫判据本身（17 条）**：零行 ⇒ `write=false / doc=null / reason=no-rows-contributed` 且 `nextRows==prevRows`；
  合并后行数只增不减、顺序=旧账原序+新增追加；复测行就地覆盖新 `band`、未复测行保持旧 `band`；
  本轮同组重复先到先得；无 `groupKey` 的行拒收并计数；只给布尔旗标不给令牌 ⇒ 仍合并；
  令牌拼错 ⇒ 拒；**令牌给对 ⇒ 真能减行**（`nextRows=2 dropped=2 rowPolicy=explicit-shrink-SHRINK_ROWS`）；
  `prev=null` 首趟正常写；prev 形状不对不崩；头字段随证据重打而 `lastRun` 把混装事实说出来；
  `shrinkRequested` 的没给/给对/拼错三态；未点名减行时任意输入组合都不许让行数变小。
- **接线证明（3 条）**：载具 import 了守卫模块且真的调用 `mergeMeasuredLedger()` 与 `shrinkRequested()`；
  `writeFileSync(MEASURED` 只剩一处且被 `.write` 条件包住；循环前的裸空壳覆写已不存在。
- **端到端真载具进程（S1–S8，18 条）**：跑的是从现文件生成的载具副本（相对 import 换成绝对 `file://`、
  只有设备腿换成桩 ⇒ 判据仍来自盘上的真 `measured-ledger.mjs`），夹具台账 = 权威台账的逐字节副本（28 行）。
  S1 崩在第一行前 ⇒ 台账 sha 全等、`generatedAt/repeat` 未被重打、`GUEST_LAND_LEDGER_GUARD` 证明先读过 prev；
  S2 量到一半崩 ⇒ 已量到的行进账、行数不减、旧 `groupKey` 一个不少；
  S3 显式令牌 ⇒ 真减到 2 行且 `lastRun.rowsDropped=26`；S4 无旗标成功腿 ⇒ 28 行合并、`rowsKeptFromPrevious=26`；
  S5 裸给 flag / S6 令牌拼错 ⇒ `GUEST_LAND_SHRINK=REJECTED` 且照旧不减行；
  S7 prev 是坏 JSON ⇒ `exit 2`、那个文件一个字节都不动、且设备桩一次都没被调用；
  S8 = 变异证明（下面第 1 轮）。
- **安全闸（2 条）**：没往 `reports/` 写过任何测试产物；权威台账 sha 未变。

关键 PASS 行（原文，`.zcode/tmp/r17-wg-pass-again.txt`）：

```
ok   S1 载具真的撞到设备桩并崩了（exit 非 0 + 桩里记下 clearSession 调用）  (exit=1 桩=clearSession#1 project=…\guest-writeguard-r17\proj)
ok   S1 台账逐字节没动（sha256 与播种时全等）—— 这就是守卫要买的东西  (before=2750dab20b30 after=2750dab20b30 rows=28)
ok   S1 generatedAt/repeat 没被一次没有证据的崩溃重打  (2026-09-28T10:15:58.555Z / repeat=1)
ok   S3 显式点名 SHRINK_ROWS 才真的减得下来（守卫不是恒挡）  (exit=0 rows=2 policy=explicit-shrink-SHRINK_ROWS)
ok   S5 裸给 flag（没有令牌值）⇒ GUEST_LAND_SHRINK=REJECTED 且照旧合并  (rows=28)
ok   S7 prev 解析不了 ⇒ exit 2 且那个文件一个字节都不动  (exit=2 GUEST_LANDING=FAIL~ …s7-measured.json 读不动（Expected property name or)
ok   S8 负例可红：把循环前的裸覆写插回副本后，同一条崩腿真的把 28 行清空了  (rows=0 sha变了=true)
SUMMARY: checks=48 assertion failures = 0
WG_TEST=PASS
```

**变异证明两轮，都留原文**：

1. **测试内建**（S8）：把 `writeFileSync(MEASURED, {…runMeta, rows: []})` 插回一次性副本 ⇒
   同一条崩腿把夹具清成 `rows=0`（判据红），live 形状同场景判绿；第三条 S8 断言钉的正是这个差。
2. **对外盘真放宽**（任务书要求）：把同一句裸覆写插回 `scripts/qa/verify-guest-landing.mjs` 后跑测试 ⇒ 变红
   （`.zcode/tmp/r17-wg-mutant-red.txt`，`WG_MUTANT_EXIT=1`）：

```
FAIL 载具里对 MEASURED 的写只剩一处，且那一处必须读合并结果的 .write 才落盘 :: 写点=writeFileSync(MEASURED, JSON.stringify(Object.assign({}, runMeta, { rows: [] }), null, 1))
FAIL S1 台账逐字节没动（sha256 与播种时全等）—— 这就是守卫要买的东西 :: before=2750dab20b30 after=b78cf81a2de0 rows=0
FAIL S1 generatedAt/repeat 没被一次没有证据的崩溃重打 :: 2026-09-30T04:28:55.539Z / repeat=1
FAIL S8 现形状在同一场景下判绿、副本判红（两者的差只在那一句裸覆写）
SUMMARY: checks=48 assertion failures = 4
WG_TEST=FAIL
```

   改回后 `node --check` 通过，且载具 sha256 回到变异前记录的同一个值
   （`CARRIER_SHA_BEFORE_MUTATION=f513d7c48d8f3e4889927da701b16dc29ed11ce9821691037c52cf5e9d150895`
   = `REVERTED sha256=f513d7c4…`）；再跑 ⇒ `WG_EXIT_AFTER_REVERT=0 / assertion failures = 0 / WG_TEST=PASS`。
   ⚠ 注：那次"改回"之后 L17b 又往同一段注释里核正了行号，所以**当前盘上的载具 sha 已不等于 f513d7c4**；
   f513d7c4 只对"变异↔改回"这一对读数负责。收账时实测的三个文件 sha（`wc -l` 一并给）：
   `verify-guest-landing.mjs sha256=10d493126b39a974… lines=367`、
   `measured-ledger.mjs sha256=6c4a5674a540a94f… lines=128`（mtime 仍是 `2026-09-30 05:22:42`，
   ⇒ 守卫模块**本车道 0 改动**这一条是实测，不是"我记得没改"）、
   `test-guest-landing-writeguard.mjs sha256=e109e3133cbd197a… lines=401`。

**删除变异体的盘上证明**（`ls` 原文）：

```
$ ls -a .zcode/tmp/ | grep -i guest-writeguard        →（无输出，grep_exit=1）
$ ls .zcode/tmp/guest-writeguard-r17                  → ls: cannot access '…\guest-writeguard-r17': No such file or directory
$ ls -a scripts/qa/ | grep -iE "mutant|carrier-prefix|carrier-live|stub-automator"  →（无输出）
```
测试自己在结尾也断言 `!existsSync(MUTANT) && !existsSync(LIVE) && !existsSync(STUB) && !existsSync(TMP)`（已 ok）。

**聚合器 `发现=` before/after**：
- before（本车道动工前，`.zcode/tmp/r17-selftests-before.txt`）：`SELFTEST_DIR=qa/test-*  发现=37`，
  收尾 `SELFTEST_RESULT=FAIL（2/38 个离线测试与门自检未过）`；两条既有红是
  `test-corpus-legacy-window.cjs` 与 `test-evidence-store-axis.mjs`（属并行 corpus 车道/仓外库轴，本车道一根手指没碰）。
- after（守卫与负例都落地后，`.zcode/tmp/r17-selftests-after.txt`）：`发现=43`，
  本车道那条是 `PASS  test-guest-landing-writeguard.mjs  exit=0  断言失败数=0  WG_TEST=PASS  25s`，
  收尾 `SELFTEST_RESULT=FAIL（3/45 个离线测试与门自检未过）`。
- **差值口径要说清：聚合读数净涨 +6，不是任务书预期的 +1**——本车道只贡献其中 **+1**（我新增的收件文件恰好一个：
  `test-guest-landing-writeguard.mjs`）。after 相对 before 新收进来的 6 个文件里，另外 5 个是并行车道在同一段窗口里落地的
  （`test-carrier-wiring.cjs` / `test-corpus-denominator.cjs` / `test-lane-report-complete.cjs` /
  `test-real-coverage-disposition.cjs` / `test-report-decision-buckets.cjs`），`after 少了=[]`（没有任何一条被弄丢）。
  这条对照是按两份日志里 `PASS|FAIL|SKIP  test-*` 行逐名比出来的，不是估的。
- after 的 3 条红：`test-corpus-denominator.cjs`（L16 在途的新测试）、`test-corpus-legacy-window.cjs`、
  `test-evidence-store-axis.mjs`（后两条 before 就红）。**三条都不是本车道带来的**——本车道那条是 PASS，
  且 §3 的变异/回退全程只写 `.zcode/tmp` 与自己那三个文件。

## 4. 重连读数（heldLeases / 锁目录 / WS_UP 凭证）

- 端口来源实测：`scripts/qa/ide-port.json` → `"wsAutomatorPort": 9420`。
- 开跑前先看锁：`tmp/qa/locks/` 下四把（`wechat-automation-9420/9430/9431/cli.lock`）**全部 `status=released`**
  （cli 那把 `releasedAt=2026-09-29T18:05:38.862Z`、`wechat-automation-9420` 是带 `_restore_note` 的历史墓碑）
  ⇒ 没有活租约、没有竞争者，本车道没有 kill 过任何进程、没有旋轮抢锁、没动过别人的锁。
- `netstat` 只当线索**不当凭据**（9420 由 pid 46580 在听、9430 由 pid 43324）；凭据只认脚本自己印的行：

```
IDE_PORT_SOURCE=config D:/6/恋爱小程序/scripts/qa/ide-port.json → 9420
WS_UP=ALREADY_UP port=9420 connectMs=193 page=pages/login/index hits=00000000 单条查询=17.8ms
WS_UP_BAND=match port=9420 本腿要的档位 project=D:/6/恋爱小程序/apps/client/dist/build/mp-weixin-real VITE_API_MODE=real MODE=real envSha8=f0677920 / 端口上活着的实例自报 apiMode=real 项目路径=(无) 落点=pages/login/index（两条独立证据：路径比对=na，env 档位比对=match）
WS_UP_BAND_证据 Tool.getInfo 键名=[version,SDKVersion] Tool.getInfo 异常=无 应用内 require(config/env.js)=OK|real|config/env.js 应用内异常=无
WS_UP_BAND_OK 档位与 --project 相符 ⇒ 这条 ALREADY_UP 才允许以 exit=0 收口
WS_UP_NOTE 收尾不要调 close()——它会关掉整个自动化 IDE 实例（本轮踩过）；本次已 disconnect 本进程的 ws 客户端
WS_UP_BAND_RESULT=match exit=0
```
  命令原文：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/ws-channel-up.mjs --project "D:/6/恋爱小程序/apps/client/dist/build/mp-weixin-real" --wait 150`
  ⇒ `WS_EXIT=0`，日志 `.zcode/tmp/r17-ws-up.txt`。
- **实测到的要紧一条：`WS_UP=ALREADY_UP` 不足以驱动 CLI 桥。** 拿它当凭据直接开 measure 腿，
  第一条 `clearSession` 照旧抛 `cant find runtimeid by projectpath …mp-weixin-real`（§1 末尾那次复现，`SMOKE_EXIT=1`）。
  补的那一步是本仓既有具名载体 `scripts/qa/open-project-window.mjs`（开/换 real 项目窗口并**验窗口真活了**，
  本车道没改它）：`OPENWIN call={"success":true,"type":"newopen","winId":"s1"}` →
  `OPENWIN probe={"route":"pages/login/index","pages":1}` → `OPENWIN verify=window-live` →
  `OPENWIN_RESULT=OK`（`OPENWIN_EXIT=0`，日志 `.zcode/tmp/r17-openwin.txt`）⇒ 之后 measure 腿才第一次真跑到页。
  这正是 §33 根因 (i) 的那笔债：**重建/换档之后必须重接设备腿**，端口在听 ≠ 会话可驱动。

**L17b（接手车道）自己在重试设备腿之前取的那一份凭证**（14:0x，命令与上面同形、日志
`D:/6/恋爱小程序/tmp/l17b/ws-up-r17b.txt`，`WS_EXIT=0`）——逐字：

```
IDE_PORT_SOURCE=config D:/6/恋爱小程序/scripts/qa/ide-port.json → 9420
WS_UP=ALREADY_UP port=9420 connectMs=388 page=pages/login/index hits=00000000 单条查询=30.5ms
WS_UP_BAND=match port=9420 本腿要的档位 project=D:/6/恋爱小程序/apps/client/dist/build/mp-weixin-real VITE_API_MODE=real MODE=real envSha8=f0677920 / 端口上活着的实例自报 apiMode=real 项目路径=(无) 落点=pages/login/index（两条独立证据：路径比对=na，env 档位比对=match）
WS_UP_BAND_证据 Tool.getInfo 键名=[version,SDKVersion] Tool.getInfo 异常=无 应用内 require(config/env.js)=OK|real|config/env.js 应用内异常=无
WS_UP_BAND_OK 档位与 --project 相符 ⇒ 这条 ALREADY_UP 才允许以 exit=0 收口
WS_UP_NOTE 收尾不要调 close()——它会关掉整个自动化 IDE 实例（本轮踩过）；本次已 disconnect 本进程的 ws 客户端
WS_UP_BAND_RESULT=match exit=0
```

- 端口来源同一处：`scripts/qa/ide-port.json → "wsAutomatorPort": 9420`；**没有**拿 netstat 端口表当凭据。
- 本轮 real 档**没有被重建**（`envSha8=f0677920` 与 §6 的 `band` 逐字相同）⇒ 不需要再走一次
  `open-project-window.mjs`；这条判断是实测出来的（档位由 `WS_UP_BAND` 当场量），不是假设。
  接手车道开腿前也核过锁：`tmp/qa/locks/wechat-automation-cli.lock` 在 13:11 之后是 `status=released`
  无人占用的窗口，本车道没有 kill 过任何进程、没有旋轮抢锁（载具自己的 `heldLeases` 预检就是那道门）。

## 5. 复跑结果

守卫 + 负例都绿之后才重试设备腿（顺序照 §3 → §4 → 本节）。所有腿的命令形状：
`node scripts/qa/verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real --only <组> [--repeat N] --out .zcode/tmp/r17-probe/booked-*.json`
（Node22；booked 一律写到 `.zcode/tmp`，见 §8.4；逐趟日志 `.zcode/tmp/r17-measure-*.txt`）。

| 趟 | exit | 用时 | 读数 |
|---|---|---|---|
| 重连前 smoke（2 组） | `SMOKE_EXIT=1` | 3.4s | 崩在 `clearSession`，`cant find runtimeid …mp-weixin-real`（§1、§7.1）；**台账 sha 未变、rows 仍 28** |
| `open-project-window.mjs` | `OPENWIN_EXIT=0` | — | `OPENWIN verify=window-live` / `OPENWIN_RESULT=OK`（§4） |
| smoke2（2 组） | `SMOKE2_EXIT=0` | 53.6s | `GUEST_LAND_LEDGER_WRITTEN=yes reason=merged … 台账行=28->28 就地更新=2 新增=0 保留旧行=26 丢弃=0` |
| 批 1（10 组） | `B1_EXIT=0` | 6m40s | 同上格式：`本轮行=10 台账行=28->28 就地更新=10 保留旧行=18 丢弃=0`；`状态分布 CLOSED=26 MEASURED-DRIFT=2` |
| 批 2（9 组）首发 | `B2_EXIT=1` | — | 写台账时撞 Windows 伪错误（§7.2），**0 行进账、账本没变小**（`generatedAt` 停在上一趟 `2026-09-30T04:36:30.638Z`） |
| 批 2 重跑 | `B2R_EXIT=0` | 7m06s | `本轮行=9 台账行=28->28 就地更新=9 保留旧行=19 丢弃=0` |
| 批 3（9 组） | `B3_EXIT=0` | 5m39s | `本轮行=9 台账行=28->28 就地更新=9 保留旧行=19 丢弃=0`；`状态分布 CLOSED=20 MEASURED-DRIFT=8`；`GUEST_LANDING_RESULT=OK` |

**28 组本轮全部真量到了**：`rows=28`，每行 `measuredAt` 都落在 `2026-09-30T04:36:57.746Z … 04:59:08.706Z`，
`band=real@f0677920`、`identity=not-logged-in` 28/28，`rowPolicy=merge-never-shrink`，
`repeat=1`，`丢弃=0`（没有任何一趟把旧行清掉）。

**没有判过：8 组现在是 `MEASURED-DRIFT`**（载具的三态判决没把它们算成 CLOSED，`GUEST_LANDING_RESULT=OK`
只说明"每组都有具名复测腿"，不等于结案）。逐组读数（实测量到的栈顶 vs 裁定落点）：

```
DRIFT GG-discover-extra-discover-match-success 期望=pages/login/index 实测量到=subpackages/discover-extra/discover/match-success waitedMs=4500
DRIFT GG-profile-extra-feedback-history        期望=pages/login/index 实测量到=subpackages/profile-extra/feedback/history waitedMs=4500
DRIFT GG-profile-extra-settings-dnd            期望=pages/login/index 实测量到=ERR:automation_evaluate 调用失败：Command failed: …微信开发者工具.exe -e …
DRIFT GG-profile-extra-verification-real-name  期望=pages/login/index 实测量到=(空) waitedMs=4500
DRIFT GG-setup-schedule-index                  期望=pages/login/index 实测量到=subpackages/setup/schedule/index waitedMs=4500
DRIFT GG-tools-search-index                    期望=pages/login/index 实测量到=subpackages/tools/search/index waitedMs=4500
DRIFT GG-village-village-history               期望=pages/login/index 实测量到=subpackages/village/village/history waitedMs=4500
DRIFT GG-vip-promo-code                        期望=pages/profile/index 实测量到=(空) markers={"​.profile-page":"ERR:automation_element_action 调用失败…"} waitedMs=4500
```
其中至少 4 组带**仪器噪声**（`measuredLanding` 是 IDE 桥的错误串、或是空栈顶、或探针 `nodeCount` 报 ERR），
把它们直接写成"落点变了/产品缺陷"就是本仓反对的那种冒领结论。为此对这四组另开一趟
`--repeat 2` 的定性复测（载具 `--only` 的既有用途：量出 MEASURED-DRIFT 的组要定性"稳定漂移还是竞态"）：

**定性复测（`--repeat 2`，两趟各 4 组）**：第一趟 `R1_EXIT=0`（`.zcode/tmp/r17-measure-r1.txt`）
把这四组全部量回裁定落点，且**连测 2 次落点一致=yes**：

```
LANDING subpackages/discover-extra/discover/match-success → pages/login/index 身份=not-logged-in 连测2次落点一致=yes
LANDING subpackages/profile-extra/feedback/history → pages/login/index 身份=not-logged-in 连测2次落点一致=yes
LANDING subpackages/profile-extra/settings/dnd → pages/login/index 身份=not-logged-in 连测2次落点一致=yes
LANDING subpackages/profile-extra/verification/real-name → pages/login/index 身份=not-logged-in 连测2次落点一致=yes
GUEST_LAND_LEDGER_WRITTEN=yes reason=merged policy=merge-never-shrink 本轮行=4 台账行=28->28 就地更新=4 新增=0 保留旧行=24 丢弃=0 无键被拒=0
  状态分布 CLOSED=24 MEASURED-DRIFT=4
```
⇒ 上面那四组的 DRIFT 是**竞态/仪器读数**（单趟 `waitedMs=4500` 才取栈顶、或 IDE 桥直接回错误串），
不是落点变了；守卫在这里的可见效果是：复测**就地覆盖同名 `groupKey`**（`就地更新=4 丢弃=0`），
台账仍 28 行、没有一趟把它写小。第二趟（`GG-setup-schedule-index,GG-tools-search-index,GG-village-village-history,GG-vip-promo-code`）读数见 `.zcode/tmp/r17-measure-r2.txt`：

```
R2_EXIT=0（用时另记于该日志）
  LANDING subpackages/setup/schedule/index → pages/login/index 身份=not-logged-in 连测2次落点一致=yes .login-page__brand:1 .login-register-entry:1
  LANDING subpackages/tools/search/index → pages/login/index 身份=not-logged-in 连测2次落点一致=yes .login-page__brand:1 .login-register-entry:1
  LANDING subpackages/village/village/history → pages/login/index 身份=not-logged-in 连测2次落点一致=yes .login-page__brand:1 .login-register-entry:1
  LANDING subpackages/vip/promo-code → pages/profile/index 身份=not-logged-in 连测2次落点一致=yes .profile-page:1
GUEST_LAND_LEDGER_WRITTEN=yes reason=merged policy=merge-never-shrink 本轮行=4 台账行=28->28 就地更新=4 新增=0 保留旧行=24 丢弃=0 无键被拒=0
  状态分布 CLOSED=28
GUEST_LANDING_RESULT=OK（每组都有具名复测腿；BOOKED/MEASURED-* 非 CLOSED 一律不算结案）
```

⇒ **收账读数：28/28 组本轮都量到且 `状态分布 CLOSED=28`（0 组 DRIFT、0 组 INVALID/FAIL）**。
上面那 8 组单趟 DRIFT 全部在 `--repeat 2` 复测里回到裁定落点且两次一致 ⇒
它们的成因是**单趟取栈顶的竞态 + IDE 桥偶发错误串**，不是落点变了；本车道没有把那种竞态写成"产品已确认"，
也没有为了凑绿去改判据（判据一个字没动，`guest-landing-policy.json` 与 canon 都不在本车道手里）。
样本数分布现在是 `{1: 20, 2: 8}`（20 组单趟、8 组连测两次），头字段 `repeat=2` 描述的是**最后那一趟**——
这正是 `measured-ledger.mjs` 用 `lastRun` 把混装事实显式说出来的原因（§2）。

### 5b. L17b（接手车道）自己那一趟复跑（14:01–14:04 本地）

守卫（§2）与负例（§3）都绿之后，接手车道才动设备。命令原文（Node22；`--out` 照样避开权威 booked，见 §8.4）：

```
D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-guest-landing.mjs \
  --mode measure --project apps/client/dist/build/mp-weixin-real \
  --only GG-pages-nearby-index,GG-campus-campus-certification,GG-campus-campus-hub \
  --repeat 2 --out tmp/l17b/booked-r17b.json
```

⇒ `MEASURE_EXIT=0`，日志 `D:/6/恋爱小程序/tmp/l17b/measure-r17b.txt`，关键行逐字：

```
GUEST_LAND_LEDGER_GUARD=merge-never-shrink 既有台账 rows=28 文件=D:\6\恋爱小程序\reports\audit\round-7\guest-landing-measured.json
  LANDING pages/nearby/index → pages/login/index 身份=not-logged-in 连测2次落点一致=yes .login-page__brand:1 .login-register-entry:1
  LANDING subpackages/campus/campus/certification → pages/login/index 身份=not-logged-in 连测2次落点一致=yes .login-page__brand:1 .login-register-entry:1
  LANDING subpackages/campus/campus/hub → pages/login/index 身份=not-logged-in 连测2次落点一致=yes .login-page__brand:1 .login-register-entry:1
GUEST_LANDING_MEASURED=3 档=real@f0677920 全部落点稳定=yes → D:\6\恋爱小程序\reports\audit\round-7\guest-landing-measured.json
GUEST_LAND_LEDGER_WRITTEN=yes reason=merged policy=merge-never-shrink 本轮行=3 台账行=28->28 就地更新=3 新增=0 保留旧行=25 丢弃=0 无键被拒=0
  状态分布 CLOSED=28
GUEST_LANDING_RESULT=OK（每组都有具名复测腿；BOOKED/MEASURED-* 非 CLOSED 一律不算结案）
```

- 三组都是真机量到的：`samples.length=2`、`stable=true`、`measuredAt` =
  `2026-09-30T06:02:02.130Z / 06:02:48.438Z / 06:03:33.946Z`（UTC）。
- 这一趟之后的盘上实数（`node -e` 现数，不是推算）：`rows=28`、样本数分布 `{1: 17, 2: 11}`
  （上一节记的 `{1:20, 2:8}` 是本车道这 3 组进账**之前**的状态——就地覆盖 3 组，行数没变），
  `identity=not-logged-in` 28/28、`band` 只有一个值 `real@f0677920`、
  `measuredAt` 全幅 `2026-09-30T04:39:05.811Z … 06:03:33.946Z`。
- 本车道没有为了凑绿动过判据：`guest-landing-policy.json`、判据台 canon、`ops/` 都不在本车道手里，也没碰。

## 6. 台账 before/after 对照

两份具名备份在开跑前核过**逐字节全等**（本车道自留的那份就是照着编排方的还原态复制的）：

```
sha256 …bak-prer9-20260930-011844 = 2750dab20b306db8ace42c132fed7fab09938fbb010140a361de7a3a39f72dec
sha256 …bak-r17-20260930-121557   = 2750dab20b306db8ace42c132fed7fab09938fbb010140a361de7a3a39f72dec   （本车道接线前另存）
prer9 == r17 ? true
```

| 字段 | before（两份备份） | after（收账时盘上） |
|---|---|---|
| `rows.length` | **28** | **28**（每一趟都是 `28->28`、`丢弃=0`） |
| `generatedAt` | `2026-09-28T10:15:58.555Z` | `2026-09-30T05:07:57.729Z`（UTC；本地 +0800 = 13:07:57） |
| `repeat` | 1 | 2（描述最后那趟 `--repeat 2` 的定性复测） |
| `band` | `real@f0677920` | `real@f0677920`（同一个 sha8 ⇒ 本轮没有因重建换档） |
| `rowPolicy` | 字段不存在 | `merge-never-shrink` |
| `lastRun` | 字段不存在 | `{rowsWritten:4, groupsUpdated:4, groupsAdded:0, rowsKeptFromPrevious:24, rowsDropped:0, shrinkToken:null, prevHadRowsField:true, at:2026-09-30T05:07:57.729Z}` |
| `sha256` | `2750dab20b30…` | `d7baccd302a3…`（内容前进 = 本轮真量到了 28 行新证据） |

- **28 个 `groupKey` 的集合与备份全等**（实测比对 `true`）⇒ 没有任何一组从账上消失；
  每行 `measuredAt` 都落在 `2026-09-30T04:36:57.746Z … 05:11:22.479Z` ⇒ 全是本轮重测的证据，
  旧 09-28 那批已被同名 `groupKey` 就地覆盖（§2 规矩 2）。
- **两趟"零行"的头字段对照**（守卫要买的就是这一格）：重连前崩退那趟（`SMOKE_EXIT=1`）后台账 sha 仍是
  `2750dab20b30…`、`generatedAt` 仍是 `2026-09-28T10:15:58.555Z`；撞 Windows 写锁那趟（`B2_EXIT=1`）
  `generatedAt` 停在上一趟的 `2026-09-30T04:36:30.638Z`、`rows` 仍 28
  ⇒ 崩溃不再能把新鲜度重打一遍（对比 01:18 事故的 `generatedAt` 被换成崩溃时刻、`repeat` 1→3）。
- 权威台账全程只由载具写（`--mode measure` 共 8 趟），没有一次手改/编辑器"恢复"；
  盘上具名备份都在（`ls` 实测：`*.bak-r17-20260930-121557` 与编排方 L17b 另留的 `*.bak-r17b-*` 三份）。

**L17b 追加的一格（接手车道自己那趟腿的 before/after，14:01–14:04）**：

| 字段 | before = `…bak-r17b-20260930-135229`（跑腿前另存的具名备份） | after = 盘上 `guest-landing-measured.json` |
|---|---|---|
| `rows.length` | 28 | **28**（`台账行=28->28`、`丢弃=0`） |
| `generatedAt` | `2026-09-30T05:07:57.729Z` | `2026-09-30T06:01:14.788Z`（真有 3 行进账才前进） |
| `repeat` | 2 | 2 |
| `band` / `rowPolicy` | `real@f0677920` / `merge-never-shrink` | 同左（档位没换、策略没放宽） |
| `lastRun` | `{rowsWritten:4, groupsUpdated:4, rowsKeptFromPrevious:24, rowsDropped:0, shrinkToken:null}` | `{rowsWritten:3, groupsUpdated:3, groupsAdded:0, rowsKeptFromPrevious:25, rowsDropped:0, shrinkToken:null, prevHadRowsField:true}` |
| `sha256` | `d7baccd302a3…` | `51f08ed2e007…` |

本轮 L17b 另存的具名备份（`ls` 实测全在盘上）：
`guest-landing-measured.json.bak-r17b-20260930-125106`（18222B）、`…-130122`（18534B）、`…-135229`（19457B），
以及 `guest-landing-booked.json.bak-r17b-20260930-125106`（45905B，booked 本车道没动过，见 §8.4）。

## 7. 若拍不了：仪器/环境阻塞的如实记录

**这一轮最终拍到了**（§5），但仪器侧真阻塞过三次，命令与报错原文如下，一条都不遮掩：

1. **`cant find runtimeid`（01:18 事故的崩点，本车道当场复现过一次）**：
   `node scripts/qa/verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real --only GG-pages-nearby-index,GG-campus-campus-hub --out .zcode/tmp/r17-probe/booked-smoke.json`
   ⇒ `SMOKE_EXIT=1`，原文（`.zcode/tmp/r17-measure-smoke.txt`）：
   `Error: automation_evaluate 调用失败：Command failed: D:\微信开发者\微信web开发者工具\微信开发者工具.exe -e …  | stdout=: "MCP_TOOL_ERROR", "message": "cant find runtimeid by projectpath D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\mp-weixin-real", … "reason": "mcp_business_fail", "tool": "automation_evaluate", "clientName": "Qoder"`
   栈：`at ideCall (cli-automator.mjs:122:11)` ← `at evaluate (…:143:17)` ← `at clearSession (…:349:10)` ← `at measure (verify-guest-landing.mjs:300:7)`。
   处置：`open-project-window.mjs` 重开 real 窗口（§4），改的是仪器不是判据。**没有伪造任何行、没有判过。**
2. **Windows 文件锁伪错误（复跑第一批之后）**：同一载具在写台账那一刻抛
   `Error: UNKNOWN: unknown error, open 'D:\6\恋爱小程序\reports\audit\round-7\guest-landing-measured.json'`
   （`errno: -4094, code: 'UNKNOWN', syscall: 'open'`，栈 `at measure (verify-guest-landing.mjs:321)`，
   日志 `.zcode/tmp/r17-measure-b2.txt`）⇒ 那一趟 0 行进账、整趟作废（9 组白量，重跑一遍即可）。
   守卫在这条路径上的行为可核：账本仍是 `rows=28`、`generatedAt` 停在上一趟的 `2026-09-30T04:36:30.638Z`，
   **没有**因为写失败而变小或清空。本车道没有为此改判据、没加重试、更没有手改文件——
   这一条与 §33 里 L12 记的 `cpSingle` 吞 Windows 伪错误是同一族仪器噪声，登记给编排方，不在本轮顺手治。
3. **测量腿分成了三批（`--only`），不是一趟 28 组**：单批 10 组实测 400s，28 组约 12 分钟会撞上命令 600s 上限；
   而被 timeout 杀掉的腿会在 `tmp/qa/locks/wechat-automation-cli.lock` 留一把 20 分钟的活租约
   （`process.exit` 不走 `finally`，`releaseUi` 不执行），会把别的车道挡死 ⇒ 刻意按 ≤10 组分批，每批正常收尾放锁。
   合并语义正是为这种"部分成功的腿"设计的（§2 规矩 2），分批不改变每组的证据。
   （标注：`process.exit` 那一句是从 `ui-lease.mjs:204-211` 与载具 `:347` 的 `finally` 结构**推断**的，
   我没有真去 kill 一条腿做实验。）

## 8. book 路径是否有同一病灶

**代码层判定：写盘动作本身同样是"无条件覆写"，但原发病灶（不可逆的证据销毁）在 book 路径不成立 ⇒ 本轮不治它。**
逐条给证据（区分实测/推断）：

1. **崩点根本到不了 book 的写盘点**（实测）。booked 的写现在在
   `scripts/qa/verify-guest-landing.mjs:349`（HEAD 旧文件 `:310`），位于 `:347` 的
   `try { measure(plan); } finally { releaseUi() }` **之后**；measure 抛异常时控制流不会走到它。
   盘上佐证：`guest-landing-booked.json` mtime `2026-09-29 13:46:50`、`generatedAt=2026-09-28T20:16:20.597Z`，
   两者都**早于** 01:18 崩溃（`bak-prer9-20260930-011844` 的 mtime 01:18:44）⇒ 事故那次 booked 逐字节未动，
   与裁定册 §33"只有 measured 被抹"的现场一致。
2. **booked 的内容里没有仪器证据**（读代码 + 读文件核过）。`:349-354` 写的是
   `generatedAt/source/ruling/groups/debtRows/anchorsOk/anchorsBad/carrier/measuredFile/rows`，
   其中 `rows` 全部出自 `buildPlan()`（`:114-247`），来源只有 policy JSON、`--triage` 语料、
   `reports/audit/round-6/ops` 判据台这三个**盘上文件**；没有 `measuredAt`/`band`/`samples`/帧这类字段
   （那些只在 measured 的行里，`guest-landing-status.mjs:11-18` 判 CLOSED 读的也是 measured）。
   ⇒ 同一批输入离线重跑就能重生成（实测 `--mode book` 约 2 秒、不需要设备），
   而 measured 的行只能由设备上那一趟腿产出 —— 这是两者决定性的差别，也是本车道只给 measured 加守卫的理由。
3. **如实登记相邻但未治的形状**（实测）：book 模式在 `problems` 非空时仍然**先覆写、后判红**
   （`:349` 在 `:361` 之前）。注入方法：把 policy 第 0 行的 `family` 改成不存在的口径，跑
   `--mode book --policy .zcode/tmp/r17-probe/bad-policy.json --out .zcode/tmp/r17-probe/bad-booked.json`
   ⇒ `BAD_BOOK_EXIT=2`、`GUEST_LANDING_RESULT=FAIL problems=2`，而那份 booked 照样被写成 `rows=27`（少一组）。
   即"红判决照样落盘"在 book 上是真的；但它抹的是**可重生成的名册**而不是仪器证据，
   且少一组同一次就把 `problems` 打红、门禁 `exit 2`，不会被下游读成绿 ⇒ 不是同一病灶。
   要治就是把 `:349` 的写挪到 `:361` 之后（或给 book 也加"红不落盘"）：那属于新增判据/改判域，
   而且会波及 `scripts/qa/test-guest-landing.mjs` 的红路径夹具与 triage 门禁的读法（都不是本车道拥有的文件），
   **交裁定，不由车道顺手改**。（标注：这一句里"会波及别人的夹具/门禁"是**推断**——读了那两处代码得出的风险判断，
   我没有真去改 book 写点再量一遍后果。）
4. 本车道自己的动作对 booked 的影响：measure 腿在成功收尾时也会写 `:349`，所以 §5 那几条复跑**都显式带了
   `--out .zcode/tmp/r17-probe/booked-*.json`**，把 booked 的写落在临时目录，避免与"book 由编排方独占跑"这件事撞车
   （实测：`reports/audit/round-7/guest-landing-booked.json` 的 mtime 与 `generatedAt` 到收账时仍为
   `2026-09-29 13:46:50` / `2026-09-28T20:16:20.597Z`，未被本车道动过）。
