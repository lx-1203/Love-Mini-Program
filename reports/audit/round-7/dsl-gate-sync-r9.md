# r9 dsl-gate-sync 车道：DSL GATE_SUITE ↔ bash run-final-verify-v33.sh 对账

- 起点：HEAD `1788675d`，上一轮 r8 全量复量 = 16 绿 / 2 红（红项 `verify-provenance-all`、`verify-real-coverage`，见 `.zcode/tmp/final-verify/summary.json`）
- 本车道只动两个文件：`.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`、本报告
- 判据不动：任何 gate 脚本的判决逻辑/阈值/判决文案一字未改（见末节「我没有改什么」）

## 0. 改前基线（两条自检，Node 22 = `/d/codex-tools/node-v22.17.0-win-x64/node.exe`）

`node` 在 PATH 上是 v16.13.1，本车道全程用绝对路径的 Node 22（先 `-v` 自证：`v22.17.0`）。

```
syntax diagnostics: 0
DRYRUN_RESULT=PASS（3/3 画像跑到底并产出总报告）
```

逐字画像行（改前）：

```
[empty] SURVIVED → 末 phase=提交与总报告 | report=28 artifact=2 | 压过的分支=可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
[reject] SURVIVED → 末 phase=提交与总报告 | report=28 artifact=2 | 压过的分支=可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
[permissive] SURVIVED → 末 phase=提交与总报告 | report=33 artifact=2 | 压过的分支=提交后 HEAD、可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
```

## 1. bash 实跑步骤机械枚举（18 步）

解析器：正则 `^g\s+(\S+)\s+(\d+)\s+(.*)$` 扫 `scripts/qa/run-final-verify-v33.sh`（跳过 `g()` 函数定义行），
`$OUT` 归一为 `.zcode/tmp/final-verify`。ms = 秒 × 1000。表里 `bashRest` 是脚本之后的实参。

| # | bash 步骤 | 脚本 | bashRest | bash ms |
|---|---|---|---|---|
| 1 | verify-ledger | scripts/qa/verify-ledger.mjs | reports/audit/round-6 | 120000 |
| 2 | verify-state-truth | scripts/qa/verify-state-truth.mjs | reports/audit/round-7 | 180000 |
| 3 | verify-queue-reconcile | scripts/verify-queue-reconcile.mjs | reports/audit/round-7 | 120000 |
| 4 | verify-real-coverage | scripts/qa/verify-real-coverage.mjs | — | 180000 |
| 5 | verify-source-shape | scripts/qa/verify-source-shape.mjs | --dry | 180000 |
| 6 | verify-evidence-corpus | scripts/qa/verify-evidence-corpus.mjs | — | 600000 |
| 7 | verify-provenance-all | scripts/qa/verify-provenance-all.mjs | — | 600000 |
| 8 | verify-band-freshness | scripts/qa/verify-band-freshness.mjs | — | 420000 |
| 9 | verify-backend-fresh | scripts/qa/verify-backend-fresh.mjs | — | 120000 |
| 10 | verify-evidence-holes | scripts/qa/verify-evidence-holes.mjs | --mode judge | 300000 |
| 11 | prove-gates-can-fail | scripts/qa/prove-gates-can-fail.mjs | — | 300000 |
| 12 | verify-dry-no-lease | scripts/qa/verify-dry-no-lease.mjs | — | 180000 |
| 13 | verify-case-automatable | scripts/qa/verify-case-automatable.mjs | --json .zcode/tmp/case-automatable/final.json | 180000 |
| 14 | run-qa-selftests | scripts/qa/run-qa-selftests.mjs | — | 600000 |
| 15 | dryrun-workflow | scripts/qa/dryrun-workflow.mjs | --profile all | 300000 |
| 16 | emit-round-report | scripts/qa/emit-round-report.mjs | --round-dir reports/audit/round-7 --sidecar-dir .zcode/tmp/final-verify/panel --report .zcode/tmp/final-verify/panel/round-7-report.md --metrics .zcode/tmp/final-verify/panel/round-7-metrics.json | 1800000 |
| 17 | verify-ledger-after-panel | scripts/qa/verify-ledger.mjs | reports/audit/round-6 | 120000 |
| 18 | verify-state-truth-after-panel | scripts/qa/verify-state-truth.mjs | reports/audit/round-7 | 180000 |

bash 另有两处**不在 `g` 清单里**的动作：`gen-round8-report.mjs` 只在收尾 echo 成"下一步跑"（:88），
`QA_EVIDENCE_STORE` 是条件式 export（:21-28）。两条见 §3 末与 §4-⑦。

> 顺带纠一个口径噪声（**未改文件**，只落账）：`run-final-verify-v33.sh:30` 的函数注释写的是
> `g <name> <timeoutMs> <args...>`，但该参数直接喂给 `timeout "$t"`，单位其实是**秒**。
> 本车道按秒×1000 与 DSL 的 `timeoutMs` 换算（这也是 §1 那张表 ms 列的来源）。
> 谁哪天照那句注释去读表，会把 420 读成 0.42 秒。改注释归 bash 文件的属主，不归本车道。

## 2. DSL 侧枚举：GATE_SUITE 13 条 + 内联 runGate 2 条

解析器：截 `const GATE_SUITE` 到 `\n];` 之间的 `{ name, args, timeoutMs }` 单行对象，另用
`runGate\(\{…\}\)` 抓内联调用。**实测条数 = 13（GATE_SUITE）+ 2（内联 prove-gates-can-fail / gen-round8-report）= 15。**

> 纠一处编排层给的事实：任务书说 DSL「currently holds 15 entries」，机械枚举出来 GATE_SUITE 只有 **13** 条；
> 15 是「13 + 2 条内联」的总数。bash 那侧 18 条无误。这个差别不影响 diff 结论（按脚本+实参逐条配，不按条数配）。

| DSL 条目（name） | 脚本 | rest | timeoutMs | 调用点 |
|---|---|---|---|---|
| 台账词表/形状 verify-ledger | scripts/qa/verify-ledger.mjs | WORKFLOW.ledgerDir | 120000 | GATE_SUITE |
| 状态真值 verify-state-truth | scripts/qa/verify-state-truth.mjs | WORKFLOW.roundDir | 180000 | GATE_SUITE |
| 队列守恒 verify-queue-reconcile | scripts/verify-queue-reconcile.mjs | WORKFLOW.roundDir | 120000 | GATE_SUITE |
| 真实档覆盖 verify-real-coverage | scripts/qa/verify-real-coverage.mjs | — | 180000 | GATE_SUITE |
| 判据台 verify-source-shape | scripts/qa/verify-source-shape.mjs | --dry | 180000 | GATE_SUITE |
| 证据语料 verify-evidence-corpus | scripts/qa/verify-evidence-corpus.mjs | — | 600000 | GATE_SUITE |
| 溯源全量 verify-provenance-all | scripts/qa/verify-provenance-all.mjs | — | 600000 | GATE_SUITE |
| 档位新鲜度 verify-band-freshness | scripts/qa/verify-band-freshness.mjs | — | 180000 | GATE_SUITE |
| 后端新鲜度 verify-backend-fresh | scripts/qa/verify-backend-fresh.mjs | — | 120000 | GATE_SUITE |
| 证据洞 verify-evidence-holes | scripts/qa/verify-evidence-holes.mjs | — | 180000 | GATE_SUITE |
| 离线负例聚合 run-qa-selftests | scripts/qa/run-qa-selftests.mjs | — | 900000 | GATE_SUITE |
| dry 不抢租约静态门 verify-dry-no-lease | scripts/qa/verify-dry-no-lease.mjs | — | 180000 | GATE_SUITE |
| 用例可自动化预检 verify-case-automatable | scripts/qa/verify-case-automatable.mjs | --json .zcode/tmp/case-automatable/preflight.json | 180000 | GATE_SUITE |
| 门禁可变红自检 prove-gates-can-fail | scripts/qa/prove-gates-can-fail.mjs | — | 300000 | 内联（终验 phase） |
| 总报告读数回填 gen-round8-report | scripts/qa/gen-round8-report.mjs | — | 120000 | 内联（总报告 phase） |

## 3. 机械 diff（配对键 = 脚本路径 + 实参；bash 步骤 | DSL 条目 | 失配种类）

| bash # | bash 步骤 | 配到的 DSL 条目 | 失配种类 | 处置 |
|---|---|---|---|---|
| 1 | verify-ledger | 台账词表/形状 verify-ledger | EXACT | — |
| 2 | verify-state-truth | 状态真值 verify-state-truth | EXACT | — |
| 3 | verify-queue-reconcile | 队列守恒 verify-queue-reconcile | EXACT | — |
| 4 | verify-real-coverage | 真实档覆盖 verify-real-coverage | EXACT | — |
| 5 | verify-source-shape | 判据台 verify-source-shape | EXACT | — |
| 6 | verify-evidence-corpus | 证据语料 verify-evidence-corpus | EXACT（环境变量另算，见 ⑦） | 加注释 |
| 7 | verify-provenance-all | 溯源全量 verify-provenance-all | EXACT | — |
| 8 | verify-band-freshness | 档位新鲜度 verify-band-freshness | **TIMEOUT-TOO-SMALL（180000 < 420000，差 240 秒）** | 上调 → 420000 |
| 9 | verify-backend-fresh | 后端新鲜度 verify-backend-fresh | EXACT | — |
| 10 | verify-evidence-holes | 证据洞 verify-evidence-holes | **ARGS（缺 --mode judge）+ TIMEOUT-TOO-SMALL（180000 < 300000，差 120 秒）** | 补旗 + 上调 → 300000 |
| 11 | prove-gates-can-fail | 内联 prove-gates-can-fail | EXACT | — |
| 12 | verify-dry-no-lease | dry 不抢租约静态门 verify-dry-no-lease | EXACT | — |
| 13 | verify-case-automatable | 用例可自动化预检 verify-case-automatable | **ARGS（侧车文件名 final.json vs preflight.json）** | 不改，写理由（§4-④） |
| 14 | run-qa-selftests | 离线负例聚合 run-qa-selftests | TIMEOUT-DSL-LARGER（900000 ≥ 600000，方向安全） | 不改，写理由（§4-⑤） |
| 15 | dryrun-workflow | （无） | **MISSING-IN-DSL** | 新增进 GATE_SUITE（§4-③） |
| 16 | emit-round-report | （无） | **MISSING-IN-DSL** | 新增进 PANEL_SUITE（§4-⑥） |
| 17 | verify-ledger-after-panel | （无） | **MISSING-IN-DSL** | 新增进 PANEL_SUITE（§4-⑥） |
| 18 | verify-state-truth-after-panel | （无） | **MISSING-IN-DSL** | 新增进 PANEL_SUITE（§4-⑥） |
| — | （bash 只在 echo 里提）gen-round8-report | 内联 gen-round8-report | DSL-ONLY（DSL 比 bash 多跑一次真调用） | 保留 |

**失配合计 9 处**：4 条 MISSING、2 条 TIMEOUT-TOO-SMALL、2 条 ARGS、1 条 TIMEOUT 方向差异（DSL 更大，判为良性）。
另有 1 条非命令行漂移（`QA_EVIDENCE_STORE` 条件 export，DSL 无 env 通道）＝ 只在注释/报告里落账，不改码。

## 4. 逐处编辑与理由（含超时方向）

全部编辑只落在 `.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`（`git diff --numstat` 终值：**+96 / −11**）。
方向记号：↑＝把 DSL 的掐表调大（消假红），→＝逐字照抄 bash，⊘＝判过的保留（不接）。

### ① band-freshness 超时 ↑ 180000 → 420000

bash 给 420 秒、DSL 给 180 秒。这条门遍历三档产物（r8 日志实测每档 ~2150 文件、srcFiles=753）再做符号级深检。
`runGate` 的兜底形状是"被 timeout 掐掉 → exitCode=-1 → 看板 RED"，所以 180 秒不是判据而是**假红发生器**。
本车道真跑了一发取实测（Node 22、不带 `--out` ⇒ 脚本 :51 默认 null ⇒ 零写盘）：`exit=0 wall=99s`、
`FRESH_RESULT=PASS bands=3 markers=4`。⇒ 诚实的措辞是：**今天 99 秒能跑完，180 秒只剩 1.8 倍余量**，
而权威扫（bash）认的是 420 秒；不对齐的后果是"脏项多/构建写回多的那一发在 DSL 里被掐成红、在 bash 里仍是绿"。
上调只改"允不允许量完"，阈值与 `FRESH_RESULT` 判据一字未动。

### ② evidence-holes 实参 → + 超时 ↑ 180000 → 300000

`scripts/qa/verify-evidence-holes.mjs:17` 写的是 `const MODE = arg("mode", "judge")`：
**默认值本就是 judge**，所以补 `--mode judge` 是"把两个 carrier 的命令行写成同一串字"，判据/退出码/写盘行为零变化
（这一点是本车道核过才敢做的：若默认值是别的模式，补旗就是改判域，那要归人拍板）。
超时同样只往大调。另在注释里落一个**本车道不改**的事实：judge 分支 :144 无条件 `writeFileSync`
`reports/audit/round-7/evidence-holes-verdict.json` ⇒ DSL 里"账单阶段这批门都不写 reports/**"那句旧口径对本条不成立
（bash 同形，它也没给 `--out`）。已把该旧口径注释改成如实版本（见 ⑧）。

### ③ dryrun-workflow 新增 → GATE_SUITE（`--profile all`，timeoutMs 300000 = bash 300 秒 1:1）

此前只有 bash 跑它，DSL 从不跑 ⇒ "这条 DSL 还能不能干跑到终报"在工作流里无人作证，而它正是 F2 那一类
（炸在终报之前）的探测器。进 GATE_SUITE 的安全性核过：它只 transpile + 在 stub 宿主里执行本文件，
`world.run`/`artifact` 全是桩 ⇒ 不落盘、不取 UI 租约；被桩执行的那一遍 DSL 再遇到它也**不会递归起真进程**（桩不 spawn）。
名字尾串 `dryrun-workflow` 与不含 sha 敏感词，已核对不落入提交后复量子集。

### ④ verify-case-automatable `--json` 落点名 ⊘ 保留不接（唯一的真实差异，写进注释）

bash 终验那一发写 `final.json`；`preflight.json` 既是该脚本 :32 的**默认值**、也是 `run-round7-closeout.mjs:349` 用的名字。
DSL 的这张表同时喂「缺口账单」和「终验复量」两个 phase（同一份 args 用两次），指成 `final.json`
就会把账单阶段那一发标成"终验"——那是造假标签，不是对齐。风险评估：全仓对这两份 JSON **零读者**，
退出码与落点无关（脚本自己 mkdir 侧车目录），所以这条差异不会造红也不会造绿。
按纪律"不许静默漂移"：不改，但在条目注释里写清为什么不接。

### ⑤ run-qa-selftests 超时 ⊘ DSL 900000 > bash 600000，不往小对齐

方向差不是缺陷：DSL 本来就留了头。往小调等于把一条能跑完的门改成会被掐死的门，正是本轮要拆的那颗雷。
注释里把"只准往大调"的理由钉住。

### ⑥ emit-round-report + 两条面板后复量 新增 → 另立 PANEL_SUITE（不进 GATE_SUITE）

`const PANEL_SUITE: { name; args; timeoutMs }[]`，三条与 bash :66-72 逐字同参、同超时（1800000 / 120000 / 180000）。
**为什么不是 GATE_SUITE**（这段判断是本车道的主要交付，写进了 DSL 注释）：
GATE_SUITE 被 `Promise.all` 无条件遍历两处（缺口账单 + 终验复量），面板一旦进去，三件事每件翻倍——
(1) 面板自己抢 UI 租约再放（r8 侧车日志 `.zcode/tmp/final-verify/emit-round-report.log` 首行 `UI_LEASE=released`），
账单阶段交互腿还没起跑，9420/9430 单写者协议会被自己人先占一遍；
(2) 面板内部自己 spawn 三十来条实时门（含 G7 构建、G8/G9 环），一轮真跑跑两遍＝全场时长翻倍；
(3) 单发 1800 秒会把账单那条 Promise.all 拖住半小时，缺口账单出不来。
所以它在「门禁终验与构建测试」phase 末尾、所有车道收工之后**顺序**跑（`for..of`，不是 `Promise.all`：
后两条读的就是"面板落完盘之后"的台账形状，并发会让复量有机会跑在面板重写之前，退化成 gateOuts2 的重复读数）。
三条红都进 `blockers`，读数并进 `finalReadings` ⇒ DSL 的 `summary.json` 与 bash 的 18 键对齐（DSL 19 键）。
"DSL 不该带这一步"的情况：**没有发生**——四条缺失全部接上了，只是面板那条换了张表放，注释与本报告都点了名，
不构成"门存在但没人跑"。

### ⑦ verify-evidence-corpus 的 `QA_EVIDENCE_STORE` ⊘ 不接，只落账

bash :21-28 是**条件式** export（库目录在才设变量）。DSL 的 args 是无条件常量，写死 `--store` 会在没库的机器上
把该轴从 `unconfigured`（脚本 :45："不新增红，也不豁免任何东西"）变成 `unreachable`（脚本 :316："⇒ 判红"）——
那是拿"对齐"的名义新增一条红，方向正好反了。`runGate` 也没有 env 通道。
如实记下的代价：DSL 自己跑的 corpus 门量不到"库背书"那一轴，那一轴的权威读数仍只能出自 bash 全量扫。

### ⑧ 三处"手填数字"纠偏（不是门禁判据，是工作流自己的陈述）

- frontmatter description 与「缺口账单」phase 注释里的"十二项门禁" → 改成"全清单门禁（条数以 GATE_SUITE 为准）"；
  原 DSL 实有 13 条，手填的"十二"在改动前就已与实际脱节（本车道的机械枚举就是证据）。
- `verified[]` 第一条同样去手填：改成模板串插 `${GATE_SUITE.length}`，并新增一条说明面板腿 `${PANEL_SUITE.length}`。
- 顺带把"这批门都不写 reports/**"这句旧口径改成列出两个已知例外的如实版本。
以上只动**这份 DSL 对自己干了什么的描述**，未动任何门禁的判据、阈值、退出码语义，也未动任何 `*_RESULT` 文案。

## 5. 改后自检（两条，逐字）

同一条命令、同一个 Node 22 绝对路径。

```
syntax diagnostics: 0
DRYRUN_RESULT=PASS（3/3 画像跑到底并产出总报告）
```

逐字画像行（改后；`report=` 比改前 +5，正是新增的 1 条 dryrun 门在两个 phase 各一发 + 面板腿 3 发喂看板）：

```
[empty] SURVIVED → 末 phase=提交与总报告 | report=33 artifact=2 | 压过的分支=可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
[reject] SURVIVED → 末 phase=提交与总报告 | report=33 artifact=2 | 压过的分支=可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
[permissive] SURVIVED → 末 phase=提交与总报告 | report=38 artifact=2 | 压过的分支=提交后 HEAD、可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
```

before/after 对照：

| 自检 | 改前 | 改后 |
|---|---|---|
| TS parse diagnostics | `syntax diagnostics: 0` | `syntax diagnostics: 0` |
| 干跑 | `DRYRUN_RESULT=PASS（3/3 …）` | `DRYRUN_RESULT=PASS（3/3 …）` |
| 看板 report 计数（empty/reject/permissive） | 28 / 28 / 33 | 33 / 33 / 38 |

上面两行"改后"取的是**最后一次注释微调之后复跑**的值（把 `verified[]` 里那句"13 条"改成
"接线前 13 条 / 接线后 14 条"这类不改变运行语义的措辞后，两条自检各重跑一遍，仍 `0` / `PASS`）。
本报告里出现的每一条命令与机器行都来自实际终端输出，没有照记忆补的数。

### 5a. 改后机械复 diff（同一套解析器重跑）

```
GATE_SUITE=14 PANEL_SUITE=3 inline=2 total DSL gate invocations=19 bash steps=18
剩余真实差异条数 ACTIONABLE_MISMATCHES=1        ← 即 §4-④ 判过保留的 preflight.json 落点名
bash-name 是 DSL 键名尾串的覆盖检查：未配对的 bash 步骤 = 0
DSL-only（bash 清单里没有的额外腿）：总报告读数回填 gen-round8-report
```

第一轮复跑还报了第二条 `emit-round-report ARGS` 差异，逐字比过是**解析器的引号残留**
（bash 那行写 `"$OUT/panel"`，替换变量后带着引号进表）；把两侧引号归一化后该条消失，实参逐字相等。
这条留在这里是为了说明：机械 diff 也要复核它自己的口径，不然会把工具噪声当成失配去"修"。

### 5b. 新增腿的实跑证据（能跑的跑了，不该跑的没跑）

- `dryrun-workflow --profile all`：本车道按 DSL 给的 300 秒预算**真跑过两遍**（改前基线 + 改后复量），
  退出码 0、机器行 `DRYRUN_RESULT=PASS`；r8 侧车 `.zcode/tmp/final-verify/dryrun-workflow.exit` 同为 0。
- `verify-band-freshness`：按"只往大调会不会调过头"这个问题真跑了一发（Node 22、不带 `--out` ⇒ 零写盘）：
  `exit=0 wall=99s`，机器行 `FRESH_RESULT=PASS bands=3 markers=4`。
  所以本车道**没有**声称 180 秒今天会假红；声称的是"权威扫认 420 秒、DSL 认 180 秒 ⇒ 两个 carrier 对同一发的
  允许时长不同，重树代价（脏项/构建写回多）下只有 DSL 那一侧会被掐成红"。99 秒对 180 秒只剩 1.8 倍余量。
  第二发计时因我把 `start` 写进子壳作用域而失效（打印出 `wall=1790689533s` 这种显然假数），
  按纪律不采信、只留第一发的 99 秒；这条也顺手记下来：计时器自己也会说谎，看到 17 亿秒就该怀疑口径。
- `emit-round-report` / 面板后两条：**没有真跑**。原因是它越出本车道的文件边界：面板会抢 9420/9430 UI 租约、
  内部 spawn 三十来条实时门（含会重写被跟踪源 PNG 的 G7 构建腿，见 HEAD~5 那条提交记的既有稳定性问题），
  还会往 `.zcode/tmp/final-verify/panel/` 落文件——本车道只被授权动 DSL 与本报告两个文件。
  它的预算不是猜的：1800000 逐字照抄 bash，且 r8 那一发 `emit-round-report.exit=0`、
  `EMIT_RESULT=OK 全部源可读、全部守恒断言通过`（同目录 `.log`），证明 1800 秒够跑完，方向上不会再被掐。

## 6. 我没有改什么

1. **任何门禁的判据逻辑**：`scripts/qa/verify-*.mjs`、`emit-round-report.mjs`、`dryrun-workflow.mjs`、
   `run-qa-selftests.mjs`、`gen-round8-report.mjs`、`prove-gates-can-fail.mjs` 一个字节都没动（`git diff --name-only` 只有 DSL + 本报告）。
2. **任何阈值 / 判决文案**：`--strict` 一律没加（`verify-case-automatable` 仍走 ADVISORY、
   `verify-criteria-frame-debt` 的 `--strict` 是面板内部的事）；没有任何 `*_RESULT=` 文案被改写。
3. **`--mode judge` 不是判据变更**：该脚本默认值本就是 judge（:17），补旗前后同一分支、同一写盘、同一退出码。
4. **r8 的两条红**（`verify-provenance-all`、`verify-real-coverage`）保持原样：没碰被测物、没碰判定，
   本车道只保证"它们不会因掐表被误读成红"。
5. **提交/落账/git 相关**：没有 `git add`、没有 commit、没动 `reports/audit/round-7/ops/`、没动台账。
6. **`QA_EVIDENCE_STORE`**：没在 DSL 里模拟 bash 的条件式 env（见 §4-⑦，接了会新增一条红）。
7. **`preflight.json` 落点名**：没跟 bash 的 `final.json` 对齐（见 §4-④）。
8. **`verify-openqueue-lanes.mjs`**：仍不接线（wiring 车道那条"不该接"的判定一字未动）。
9. **`gen-round8-report` 仍以内联 runGate 存在**：bash 只在收尾 echo 里提它、DSL 已经真跑它，
   这是 DSL 多于 bash 的一条腿（超集方向），没有为了"看起来一致"把它删掉。

## 7. 留给编排层的三句

1. 任务书里"DSL currently holds 15 entries"与实际不符：**13** 条（15 是含两条内联 runGate 的调用总数）。
   不影响本车道结论（配对按脚本+实参，不按条数），但你复量口径时别按 15 去核。
2. 本轮把面板腿接进 DSL 后，**下一次真跑的工作流会比以前长一截**（面板 1800 秒 + 抢一次 UI 租约）。
   若你不想要这个形状，需要拍板的是"面板该不该属于工作流"，而不是把它再摘出去——摘出去就又回到"门存在但 DSL 不跑"。
3. `verify-evidence-holes` 的 judge 分支仍无条件写权威件 `evidence-holes-verdict.json`（bash 同形）。
   面板内部已经用 `--out` 把落点导去侧车了，两条独立扫（bash/DSL 的 GATE_SUITE）没导。
   要统一得给这两发加 `--out`，那是改判域（会改变"谁拥有那份权威件"），列为待拍板项。
4. **另有一发并发车道动了本车道禁止触碰的文件**：收尾核 `git status` 时发现
   `scripts/qa/emit-round-report.mjs` 处于 modified（+100 行，注释自报来源是 `lane-shaclass-r9` / followups §5，
   文件 mtime 21:48，正落在本车道跑自检的时间窗里）。**不是我改的**（本车道全程只写 DSL 与本报告）。
   影响面如实评估：那一轴解析的是 corpus 门的 `CORPUS_SHA_CLASS` 输出，与本车道给面板腿的四个旗
   （`--round-dir/--sidecar-dir/--report/--metrics`）无交集；但**别把我的自检当成对它的验证**——
   `dryrun-workflow` 只 transpile 本 DSL 并用桩宿主执行，全程不 load 面板脚本，
   语法自检也只读 DSL 一个文件。所以"面板腿可用"这条证据只有两支撑：CLI 表面逐字核过 + r8 侧车
   `emit-round-report.exit=0`（那是 shaclass 改动**之前**的那一版）。
   编排层若要把 r9 记成"面板腿已 live 验证"，需要等 shaclass 那一发落定后再跑一次 bash 全量扫。
