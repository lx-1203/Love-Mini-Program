# round-7 轮末验收报告（全部数字运行时派生，零手写统计）

- 生成器：`scripts/qa/emit-round-report.mjs`（启动于 2026-09-26T12:25:02.303Z，node v22.17.0，`D:/codex-tools/node-v22.17.0-win-x64/node.exe`）
- 轮次目录 `reports/audit/round-7` · 权威件 `reports/audit/round-7/interact/exec-results.json` · 冻结快照 `reports/audit/round-7/interact/exec-results.pre-rebuild-1048.json`

## 0. 溯源表（本报告引用的每一个输入；缺此表即不可复核）

| 文件 | mtime (UTC) | 字节 | sha256 前 8 |
|---|---|---|---|
| `.zcode/tmp/round6-LEDGER.md` | 2026-09-26T02:35:50.253Z | 327926 | `46fb9e7b` |
| `reports/audit/real-e2e/GATES.json` | 2026-09-26T11:17:04.433Z | 2301 | `ffe6d0a2` |
| `reports/audit/round-7/interact/exec-results.json` | 2026-09-26T08:49:54.068Z | 812158 | `d1e019f8` |
| `reports/audit/round-7/interact/exec-results.pre-rebuild-1048.json` | 2026-09-26T07:14:52.493Z | 812539 | `b89dc4a7` |
| `reports/audit/round-7/ops/` | (目录：登记条目数 24，无单文件语义) | 24 | `4e5c2793` |
| `reports/audit/round-7/screenshot-manifest.json` | 2026-09-26T12:15:57.450Z | 314920 | `799f8875` |
| `reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json` | 2026-09-26T12:11:18.305Z | 35695 | `3eec6da0` |
| `scripts/qa/r-exec.cjs` | 2026-09-25T23:59:25.629Z | 128320 | `5891159b` |
| `tmp/qa/checkpoints/exec-R7.json` | 2026-09-26T11:41:02.482Z | 70117 | `037efe8b` |

| 子进程（命令行原样，cwd=仓库根） | 解释器 | 退出码 | stdout 字节 | sha256(stdout) 前 8 | 备注 |
|---|---|---|---|---|---|
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-backend-restarted.mjs --port 8080` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 590 | `9a9b3e0d` |  |
| `git rev-parse --short HEAD` | git | 0 | 9 | `31dd245e` |  |
| `git status --porcelain` | git | 0 | 3164 | `fce35840` |  |
| `git status --porcelain -- apps/` | git | 0 | 0 | `e3b0c442` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 806 | `364ace82` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-7/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 215 | `7aa7a03f` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 3417 | `9da09aa8` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-state-truth.mjs reports/audit/round-7` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1105 | `1e832789` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 6039 | `a8885ed2` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/audit/round-7/screenshot-manifest.json --dir reports/screenshots/round-7-mock-tour-1a1df78b --exec reports/audit/round-7/interact/exec-results.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1126 | `5b86ef35` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-corpus.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 3981 | `6fc11e91` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-provenance-all.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 5577 | `1ebecdae` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-corpus.mjs --scope reports/audit/round-7,reports/screenshots/round-7-exec,reports/screenshots/round-7-exec-086b54f8,reports/screenshots/round-7-mock-tour-1a1df78b,reports/screenshots/round-7-real-exec,reports/screenshots/round-7-real-tour,reports/screenshots/round-7-real-tour-full,reports/screenshots/round-7-states,reports/screenshots/round-7-states-fix1,reports/screenshots/round-7-states-fix2,reports/screenshots/round-7-states-pilot,reports/screenshots/round-7-states-pilot2,reports/screenshots/round-7-states-pilot3,reports/screenshots/round-7-states-pilot4,reports/screenshots/round-7-uidebt-1a1df78b` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 3355 | `57c47bc4` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-provenance-all.mjs --scope reports/audit/round-7,reports/screenshots/round-7-exec,reports/screenshots/round-7-exec-086b54f8,reports/screenshots/round-7-mock-tour-1a1df78b,reports/screenshots/round-7-real-exec,reports/screenshots/round-7-real-tour,reports/screenshots/round-7-real-tour-full,reports/screenshots/round-7-states,reports/screenshots/round-7-states-fix1,reports/screenshots/round-7-states-fix2,reports/screenshots/round-7-states-pilot,reports/screenshots/round-7-states-pilot2,reports/screenshots/round-7-states-pilot3,reports/screenshots/round-7-states-pilot4,reports/screenshots/round-7-uidebt-1a1df78b` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 4761 | `d55f76d6` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json --dir reports/screenshots/round-7-mock-tour-1a1df78b` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 658 | `6d16cc27` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-real-exec/manifest-detail.json --dir reports/screenshots/round-7-real-exec` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 2627 | `f8b01b55` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-real-tour/manifest-detail.json --dir reports/screenshots/round-7-real-tour` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 649 | `600ca3d4` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-real-tour-full/manifest-detail.json --dir reports/screenshots/round-7-real-tour-full` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 654 | `62a018cc` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states/manifest-detail.json --dir reports/screenshots/round-7-states` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1395 | `34e577f6` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-fix2/manifest-detail.json --dir reports/screenshots/round-7-states-fix2` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1078 | `a70adfb4` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot/manifest-detail.json --dir reports/screenshots/round-7-states-pilot` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 804 | `d964fb0a` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot2/manifest-detail.json --dir reports/screenshots/round-7-states-pilot2` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 806 | `2ca9f729` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot3/manifest-detail.json --dir reports/screenshots/round-7-states-pilot3` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 806 | `5bac2e3b` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-states-pilot4/manifest-detail.json --dir reports/screenshots/round-7-states-pilot4` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 806 | `36f24921` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-7-uidebt-1a1df78b/manifest-detail.json --dir reports/screenshots/round-7-uidebt-1a1df78b` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 2657 | `124e2c24` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-i18n-orphan.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1851 | `8ed204f4` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe apps/client/scripts/build-real-isolated.mjs --check-only` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 200 | `265f3f57` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 2510 | `ae207a6e` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 402 | `96ec2406` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/probe-real-env.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1093 | `9e008813` |  |

> **并发写入声明**：权威件在执行轮结束前持续被追加。本工具对每个文件**读一次、哈希一次**，上表 sha 就是被我解析的那一份字节；被调门（分诊台/改判台/完整性门）按各自启动时刻**重读同一文件**，故它们的行数与我这份可差几条——差值在对应小节逐处标出，不取齐、不四舍五入。

## A. 轮次身份

- HEAD：`1a1df78b` (源: git rev-parse --short HEAD → stdout=)
- 工作树脏项：全仓 73 项 (源: git status --porcelain → 行数=)；其中 `apps/` 下 0 项 (源: git status --porcelain -- apps/ → 行数=)
- 后端 JVM：pid=29536，起于 2026-09-26 03:12:29 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-backend-restarted.mjs --port 8080 → RESTARTED_PID=)；该门本次判定 **PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提**（退出码 0）
  - 其自报最新源码：D:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java mtime=2026-09-25T16:35:35.256Z
- 被测物包指纹（在盘产物逐文件 sha256 前 8；brief 所说『两个 mock 包指纹』的全部可核解释一并列出）：
  - **mock 包（执行轮被测物，重建后在盘）** `apps/client/dist/build/mp-weixin`：app.json=`207f7136` (5264B, 2026-09-26T08:52:07.291Z) · config/env.js=`fba847c4` (2397B, 2026-09-26T08:52:07.132Z) · config/showcase.js=`67628744` (915B, 2026-09-26T08:52:07.234Z) · config/feature-flags.js=`08a7cff6` (134B, 2026-09-26T08:52:07.234Z)
    合成指纹（按 `app.json→env→showcase→feature-flags` 的 sha8 串接再 sha256）：`cd5d6e0e` (源: apps/client/dist/build/mp-weixin/app.json → sha256)
  - **real 包（G7 隔离产物）** `apps/client/dist/build/mp-weixin-real`：app.json=`207f7136` (5264B, 2026-09-26T08:53:38.741Z) · config/env.js=`f0677920` (2392B, 2026-09-26T08:53:38.551Z) · config/showcase.js=`3039fc25` (910B, 2026-09-26T08:53:38.669Z) · config/feature-flags.js=`08a7cff6` (134B, 2026-09-26T08:53:38.669Z)
    合成指纹（按 `app.json→env→showcase→feature-flags` 的 sha8 串接再 sha256）：`05637737` (源: apps/client/dist/build/mp-weixin-real/app.json → sha256)
  - 两份巡检载体是否同一 gitSha：是（1a1df78b）

## B. 覆盖（计划 / 已记录 / 缺口）

- 队列对账门本次判定：**QUEUE_RESULT=PASS**（退出码 0）
- 计划：24 套 / 1107 例 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_PLANNED_CASES=)
- 已记录：1107 行（manifest 轴 24 套；唯一 id 1065；我这份快照读到 1107 行）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_RECORDED_CASES=)
- 缺口：GAP=0；从未开跑 0 套 / 0 例；未计划套件 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_GAP=)
- 键轴：`manifest` 命中 24/24；缺 manifest 字段的行 0；复合主键重复组 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_KEY_AXIS_MATCHED=)
- requiresReal 普查：true=236 false=871 未打=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_REQUIRES_REAL_TRUE=)
- 证据里带 ERROR/timeout 的行（192 那条门禁口径）：0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_ERR_TAINTED_CASES=)
- CONSERVED ✔ 计划 − 记录 vs GAP: 1107 + 0 = 1107 vs 全体 1107
- 检查点 `tmp/qa/checkpoints/exec-R7.json`：suites 24，status 分布 completed=24 (源: tmp/qa/checkpoints/exec-R7.json → suites[].status)
  - **status=running 的套件是半途中断的半成品，绝不得计入"完成"**：无 (源: tmp/qa/checkpoints/exec-R7.json → suites[running])
  - 套件轴口径说明：检查点键是**派生规划器 id**（`P-<manifest>-<seq>`），计划侧是 manifest 名，两轴不同，故下面用权威件的 `suite→manifest` 字段做映射（映射不到者进兜底桶）。
  - 计划套件（ops 轴）24 · 检查点已认领 24 · 从未进检查点 0 · 兜底桶「suite 键映射不到 manifest」= **0** (源: reports/audit/round-7/interact/exec-results.json → results[].suite → results[].manifest)
  - CONSERVED ✔ status 分布 vs 检查点 suites: 24 = 24 vs 全体 24
  - CONSERVED ✔ 已认领 + 从未开跑 vs 计划套件: 24 + 0 = 24 vs 全体 24
  - 与队列门的从未开跑一致：0 套
- 从未开跑清单（逐字取自门的输出行，非我拼装）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_NEVER_RAN=)：
  - ⚠ 门一行 `QUEUE_NEVER_RAN` 都没打印，而计数是 0 —— 两者不符即为该门的截断/字段问题，按取不到记。

## C. 结果分布（重建边界两侧分开算，合并值只作守恒核对）

- **边界怎么派生**：把在盘权威件与冻结快照按 `suite|manifest|id` 三字段复合键比对（与 `scripts/qa/r-exec.cjs` 第 478 行 的 `upsertResult` findIndex 同一把键，行号由本报告读该文件得出）(源: scripts/qa/r-exec.cjs → upsertResult findIndex 行号)。**不按行号**——行是就地 upsert 的，按号比必错位。
  - 快照 `reports/audit/round-7/interact/exec-results.pre-rebuild-1048.json`：1107 行，gitSha=713c1729 updatedAt=2026-09-26T07:05:22.051Z (源: reports/audit/round-7/interact/exec-results.pre-rebuild-1048.json → results[])
  - 在盘 `reports/audit/round-7/interact/exec-results.json`：1107 行，gitSha=086b54f8 updatedAt=2026-09-26T08:49:54.056Z (源: reports/audit/round-7/interact/exec-results.json → results[])
- **A 侧｜冻结 `713c1729` 构建 + 旧后端**（复合键见于快照的行）：1107 行 = EXECUTED 326 / FAILED 134 / SKIPPED 647 (源: reports/audit/round-7/interact/exec-results.json → status)
- **B 侧｜重建构建 + 重启后后端**（复合键未见于快照的行）：0 行 = EXECUTED 0 / FAILED 0 / SKIPPED 0 (源: reports/audit/round-7/interact/exec-results.json → status)
- ⚠ 合计（**混合两个被测物，仅作守恒核对，不得作结论、不得当通过率分母**）：1107 行 = EXECUTED 326 / FAILED 134 / SKIPPED 647 (源: reports/audit/round-7/interact/exec-results.json → status)
- CONSERVED ✔ A 侧 + B 侧 vs 在盘行数: 1107 + 0 = 1107 vs 全体 1107
- CONSERVED ✔ A 侧三态 vs A 侧行数: 326 + 134 + 647 + 0 = 1107 vs 全体 1107
- CONSERVED ✔ B 侧三态 vs B 侧行数: 0 + 0 + 0 + 0 = 0 vs 全体 0
- CONSERVED ✔ 快照中已从在盘消失的行（应为 0）: 0 = 0 vs 全体 0
- 两侧同键但状态被改写（停机后重跑同一用例、覆盖旧结论）：**205** 行 (源: reports/audit/round-7/interact/exec-results.pre-rebuild-1048.json → status)
  - `C-PAGES-DISCOVER-INDEX|PAGES-DISCOVER-INDEX|DC07` EXECUTED → SKIPPED
  - `C-PAGES-DISCOVER-INDEX|PAGES-DISCOVER-INDEX|DC20` EXECUTED → SKIPPED
  - `C-PAGES-DISCOVER-INDEX|PAGES-DISCOVER-INDEX|DC43` SKIPPED → EXECUTED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H02` SKIPPED → EXECUTED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H03` SKIPPED → EXECUTED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H06` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H07` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H08` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H09` EXECUTED → SKIPPED
  - `C-PAGES-HOME-INDEX|PAGES-HOME-INDEX|H36` EXECUTED → SKIPPED
  - 这些行按复合键归 **A 侧**（快照认领过），但其状态取自在盘权威件。把 A 侧读成"纯冻结构建的结果"时须扣这 205 行。
- BELT=REMEASURED-ALL：在盘 1107 行的复合键全部被快照认领过，且状态逐行取自在盘权威件（就地改写 205 行）⇒ 本轮是"重建后全量重测"，A/B 按键分侧退化为一侧，边界由构建戳差（快照 vs 活件 gitSha 不同）证明。

| 套件（manifest｜检查点 suite 轴） | 行数 | A侧 | B侧 | EXECUTED | FAILED | SKIPPED | 其他 |
|---|---|---|---|---|---|---|---|
| `次要21`｜`C-次要21` | 102 | 102 | 0 | 26 | 20 | 56 | 0 |
| `次要20`｜`C-次要20` | 101 | 101 | 0 | 27 | 0 | 74 | 0 |
| `次要18`｜`C-次要18` | 88 | 88 | 0 | 22 | 9 | 57 | 0 |
| `次要22`｜`C-次要22` | 78 | 78 | 0 | 13 | 25 | 40 | 0 |
| `次要19`｜`C-次要19` | 69 | 69 | 0 | 18 | 0 | 51 | 0 |
| `PAGES-HOME-INDEX`｜`C-PAGES-HOME-INDEX` | 48 | 48 | 0 | 29 | 0 | 19 | 0 |
| `PAGES-DISCOVER-INDEX`｜`C-PAGES-DISCOVER-INDEX` | 45 | 45 | 0 | 32 | 0 | 13 | 0 |
| `PAGES-PROFILE-INDEX`｜`C-PAGES-PROFILE-INDEX` | 45 | 45 | 0 | 25 | 0 | 20 | 0 |
| `PAGES-NEARBY-INDEX`｜`C-PAGES-NEARBY-INDEX` | 42 | 42 | 0 | 24 | 0 | 18 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-INDEX`｜`C-SUBPACKAGES-VILLAGE-VILLAGE-INDEX` | 42 | 42 | 0 | 7 | 0 | 35 | 0 |
| `PAGES-MESSAGES-INDEX`｜`C-PAGES-MESSAGES-INDEX` | 41 | 41 | 0 | 29 | 0 | 12 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC`｜`C-SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC` | 41 | 41 | 0 | 9 | 0 | 32 | 0 |
| `SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC`｜`C-SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC` | 40 | 40 | 0 | 12 | 0 | 28 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-POST`｜`C-SUBPACKAGES-VILLAGE-VILLAGE-POST` | 40 | 40 | 0 | 7 | 0 | 33 | 0 |
| `PAGES-LOGIN-INDEX`｜`C-PAGES-LOGIN-INDEX` | 38 | 38 | 0 | 0 | 37 | 1 | 0 |
| `PAGES-REGISTER-INDEX`｜`C-PAGES-REGISTER-INDEX` | 37 | 37 | 0 | 2 | 0 | 35 | 0 |
| `SUBPACKAGES-CHAT-CHAT-SESSION-INDEX`｜`C-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX` | 34 | 34 | 0 | 4 | 0 | 30 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH`｜`C-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH` | 34 | 34 | 0 | 6 | 0 | 28 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-INDEX`｜`C-SUBPACKAGES-CAMPUS-CAMPUS-INDEX` | 30 | 30 | 0 | 0 | 20 | 10 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-HUB`｜`C-SUBPACKAGES-CAMPUS-CAMPUS-HUB` | 27 | 27 | 0 | 7 | 0 | 20 | 0 |
| `SUBPACKAGES-CIRCLES-CIRCLES-INDEX`｜`C-SUBPACKAGES-CIRCLES-CIRCLES-INDEX` | 25 | 25 | 0 | 10 | 0 | 15 | 0 |
| `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING`｜`C-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING` | 24 | 24 | 0 | 0 | 23 | 1 | 0 |
| `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS`｜`C-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS` | 20 | 20 | 0 | 8 | 0 | 12 | 0 |
| `PAGES-REGISTER-SUCCESS`｜`C-PAGES-REGISTER-SUCCESS` | 16 | 16 | 0 | 9 | 0 | 7 | 0 |
| **合计（24 套）** | 1107 | 1107 | 0 | 326 | 134 | 647 | 0 |
- CONSERVED ✔ 套件表行数合计 vs 在盘行数: 1107 = 1107 vs 全体 1107
- CONSERVED ✔ 套件表状态格合计 vs 在盘行数: 1107 = 1107 vs 全体 1107

## D. 失败分诊

- **用的是刚跑的那一份**：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-7/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report`（退出码 0），sidecar `.zcode/tmp/report-emitter/triage-r6-at-report.md/.json`
- 来源：本次由本报告启动的分诊台（其 stdout + 它自己写的 JSON sidecar）；权威件 `reports/audit/round-7/interact/exec-results.json` updatedAt=2026-09-26T08:49:54.056Z 行数=1107 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-7/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report → TRIAGE_RESULT=)

| 桶 | 条数 |
|---|---|
| `EXECUTED` | 326 |
| `SKIPPED-not-automatable` | 647 |
| `other-fail` | 134 |
| （本次为 0、故未列出的桶） | locate-label, locate-label-token-lost, locate-selector, harness-api, timeout, auth-precondition |
- CONSERVED ✔ 分诊桶合计 vs 行数: 326 + 647 + 134 = 1107 vs 全体 1107
- ⚠ **兜底/未归类合计 = 915**（other-fail 134、工具自报 unclassified 781）：这些行的判据形态没被任何规则接住，必须逐条读原文，不许并进任何通过率。

### dist/src 四格（只对能恢复出查找目标的定位失败做双载体检；n=0）(源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].verdict)

| 结论 | 条数 |
|---|---|
| ⚠ 一格都没有 | 0 |
- CONSERVED ✔ 四格合计 vs 有查找目标的定位失败:  = 0 vs 全体 0
- 单字标签（从用例散文里抠出的残字，几乎必是规格噪声而非产品缺陷）：**0** (源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].suspect)
- token-lost（执行器只留哨兵 `__CAND__`、没留要找的文案，事后无法复核）：**0** (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-7/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report → locate-label-token-lost=)
- 动作发生时不在用例声明的页面上：**160**；`top=` 与 `route[]` 都读不到因而**判不了**：**0** (源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].onTarget)
- observed 带 `MISMATCH!`（执行器自报前置身份/状态不符）：**0** (源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].mismatch)
- CONSERVED ✔ 在目标页三态（是/否/判不了）vs 分诊条目: 621 + 160 + 0 = 781 vs 全体 781

## E. 证据可信度（两条规则并列展示，不合并、不互相替换）

- **用的是刚启动的干跑**（无 `--apply`，未写任何权威件）：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1` 退出码 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_CLASS=)
- 它读到的行数：1107（我这份快照 1107 行）；status 分布 {"EXECUTED":326,"SKIPPED":647,"FAILED":134}

| 分类（规则：先剥 `(123B)` / `(ERROR:…)` 尾注再看盘，再按 tier 配额判定） | 用例数 | 其中 EXECUTED |
|---|---|---|
| `CLEAN_EVIDENCE` | 87 | 87 |
| `TAINTED_BUT_FILE_PRESENT` | 0 | 0 |
| `NO_EVIDENCE_MISSING_FILE` | 0 | 0 |
| `NOT_A_FILE_REF` | 781 | 0 |
| `EXECUTED_WITHOUT_TIER_EVIDENCE` | 239 | 239 |
- CONSERVED ✔ 五类合计 vs 改判台行数: 87 + 0 + 0 + 781 + 239 = 1107 vs 全体 1107
- `RJ_SET_IDENTICAL`（与 192 那条门禁口径是否同一集合）：**1（同一）** (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_SET_IDENTICAL=)
- 门禁等价集=0 / 本工具污染全宇宙=0 / 只在本工具=0、只在门禁=0、交集=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_GATE_EQUIV_CASES=)
- 改判到 NO-EVIDENCE=239 条；EXECUTED 但 tier 交不齐=239 条；只有大小注记且文件确在=0 条；整行无像素引用=781 条 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-7/interact/exec-results.json --ops reports/audit/round-7/ops --no-lines --samples 1 → RJ_DOWNGRADE_TO_NO_EVIDENCE=)
- ⚠ `EXECUTED_WITHOUT_TIER_EVIDENCE=239`：这些"已执行"连 tier 要求的帧都没落盘。

### 本报告内独立复算（第二条规则：不看 tier 配额，只问『有没有一张像素帧真在盘上』）

- 规则：EXECUTED 行的 `evidence[]` 里，剥掉 `(123B)` 与 `(ERROR:…)` 尾注后**至少一条 .png 在盘且 size>0** (源: reports/audit/round-7/interact/exec-results.json → evidence[])
- 结果：**326 / 326** 条达标；其余 = 纯断链 0 条 + evidence[] 里根本没有 .png 引用 0 条
- CONSERVED ✔ 有图 / 断链 / 无 .png 引用 vs EXECUTED 行数: 326 + 0 + 0 = 326 vs 全体 326
- 修复后新字段 「missingEvidence[]」：1107 行带该字段（= 由修好的执行器写出的行），其中 0 行确有捕获失败记录 (源: reports/audit/round-7/interact/exec-results.json → missingEvidence[])
- 幻象路径余量：全库仍有 0 条 evidence[] 带 「(ERROR:…)」，其中新行内 0 条 (源: reports/audit/round-7/interact/exec-results.json → evidence[])
  判读：新行内应为 **0**（不为 0 就说明存在性校验没接上）；旧行的余量由改判台在步骤① 处理，不算本轮未修。

| 口径 | 规则 | 『干净』计数 | 用的行集 |
|---|---|---|---|
| 改判台 | 先剥尾注再看盘 **且** 按 tier 交齐（critical=2 帧 / normal=1 / navigation,noop=0） | CLEAN 87 条 EXECUTED（另有 TAINTED_BUT_FILE_PRESENT 0 条文件确在） | 它自己重读的 1107 行 |
| 本报告 | 至少 1 张 .png 在盘即算有像素证据（不看 tier 配额） | 326 条 EXECUTED | 我这份快照 326 条 EXECUTED |
- 两数不等是**规则不同**（tier 要 2 帧，本口径只要 1 帧），不是有一边算错；编排层已决定终报两条并列。

## F. 截图巡检（`reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json`）

- 载体头：gitSha=1a1df78b workflowVersion=3.2-cli buildMode=build:mp-weixin（mock） generatedAt=2026-09-26T12:09:02.824Z (源: reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json → gitSha)
- 帧数 shots = **77**，按 identity：A=72 / B=5 (源: reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json → shots[])
- failures = **12**，按 identity：A=12 (源: reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json → failures[])
- stateNotApplied = **0**，按 `aliasLabel` 拆：`true`=0（同帧别名标签：把默认帧再标一次数据态/空态）/ `false`=0（状态真没打上去，需定向重截）/ 其他=0 (源: reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json → stateNotApplied[].aliasLabel)
- routeDrifts = **0**，按 identity： (源: reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json → routeDrifts[])
- zoomFrames = **0**，按 identity：；另一处独立取数 `shots[].zoomCrops` 合计 0 (源: reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json → zoomFrames[])
- 工作树脏项（载体当时自报，与 A 节本次实测是不同时刻）：? (源: reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json → gitWorktreeDirtyPaths)
- CONSERVED ✔ aliasLabel 拆项 vs stateNotApplied: 0 + 0 + 0 = 0 vs 全体 0
- CONSERVED ✔ stateNotApplied + 其它 failure vs failures 总数: 0 + 12 = 12 vs 全体 12
- CONSERVED ✔ identity 分组 vs shots 总数: 72 + 5 = 77 vs 全体 77
- CONSERVED ✔ zoomFrames vs shots[].zoomCrops（两处独立取数）: 0 = 0 vs 全体 0

## G. 真实模式（在盘载体 + 本次复跑的当前结论）

- 在盘载体 `reports/audit/real-e2e/GATES.json`（schemaVersion=gates-2 capturedAt=2026-09-26T11:16:58.188Z gitSha=1a1df78b）：
  - G7_RESULT=PASS / G8_RESULT=PASS（环 10/10）/ G9_RESULT=PASS（ok=455/455）(源: reports/audit/real-e2e/GATES.json → G7_RESULT / G8_RESULT / G9_RESULT)
  - 前置件：scripts/qa/verify-backend-restarted.mjs → PASS（JVM pid 29536 起于 2026-09-26 03:12:29）(源: reports/audit/real-e2e/GATES.json → precondition.jvmPid)
  - G9 对照表四格（载体值）：{"在盘且200":455,"在盘但失败":0,"不在盘但200":0,"不在盘且失败":0} (源: reports/audit/real-e2e/GATES.json → detail.G9.controlTable)
  - 载体记的本轮新增库内主键：posts=263 comments=1231(源: reports/audit/real-e2e/GATES.json → newDbKeysThisRound)
  - undefined：**undefined** —— undefined
  > 载体是 **capturedAt 时刻**的（早于本轮重建与后端重启）；下栏是本工具此刻复跑得到的**当前**结论。两者不一致即"证据已过期"，两条都印、不取齐、不覆盖。

### 本次复跑（退出码即数据；非零不删报告，只记进失败清单）

| 件 | 命令行 | 退出码 | 关键计数（逐字取自其 stdout） |
|---|---|---|---|
| G7 产物自证 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe apps/client/scripts/build-real-isolated.mjs --check-only` | 0 | G7_RESULT=PASS；[g7] 产物自证 MODE=real VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api；[g7] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-real sharedOutUntouched=yes ｜**必须 node22**：v16 上它自报假 FAIL（实测） |
| G8 十环 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs` | 0 | G8_RESULT=PASS G8_RINGS_OK=10/10（解析到环 10 条）G8_ARTIFACTS=posts.id=270 ; comments.id=1238 ; campus_topics.id=299 ; campus_replies.id=31  ← 本轮写入的真实数据，未删除，交你决定去留 |
| G9 素材探针 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs` | 0 | G9_RESULT=PASS EXTRACTED=455 PROBED=455 OK=455 SKIPPED=0 FAIL=0；G9_CONTROL 在盘且200=455 在盘但失败=0 不在盘但200=0 不在盘且失败=0 |
| probe-real-env | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/probe-real-env.mjs` | 0 | PROBE_BACKEND=UP 可达=8/8 在盘=1440 VERDICT=READY |
- CONSERVED ✔ G9 ok+skipped+fail vs PROBED: 455 + 0 + 0 = 455 vs 全体 455
- CONSERVED ✔ G9 对照表四格 vs PROBED: 455 + 0 + 0 + 0 = 455 vs 全体 455 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs → G9_CONTROL=)
- CONSERVED ✔ G8 OK 环 + MISS 环 vs 环总数: 10 + 0 = 10 vs 全体 10

## H. 台账与门禁（本次复跑 vs 轮初基线）

- 基线只作叙事：`.zcode/tmp/round6-LEDGER.md` §1（**下面引用的每一个计数都来自本次复跑的门，没有一个数抄这张表**）(源: .zcode/tmp/round6-LEDGER.md → §1 表)

| 门禁 | 本次退出码 | 本次关键计数（逐字取自其 stdout） | 轮初基线（台账 §1 原文行） |
|---|---|---|---|
| `verify-ledger` | **0** | SOURCES=3 DISTINCT_IDS=433 MATRIX_IDS=1700 ORPHAN_TRUE=0 MULTI_ID_FAMILIES=29 → LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法 | 台账 §1 无此行（不猜） |
| `verify-state-truth` | **0** | CASE_SPREAD=0 FAIL_SPREAD=0 → STATE_RESULT=PASS（全局极差比的是 2 列同范围源；检查点按 subset-window 已做逐套包含核对） | 退出码 `1`：`/ verify-state-truth（round-2） / 1 / 四源 1107/941/922/940 → 用例极差 185；FAILED 289/282/288 → 极差 7；`checkpoint.failures[]` 恒空 /` |
| `verify-evidence-integrity（权威索引=本轮全部 corpus）` | **0** | SHOTS=303 MATCHED=303 MISSING=0 HASH_MISMATCH=0 ORPHANS=0 DUP_STATE=0 SNA改判=80 盘上仅算非证据=0；exec: 0 条 WITH_ERROR=0 伪造引用=0 → EVIDENCE_RESULT=PASS | 退出码 `1`：`/ verify-evidence-integrity（round-2 manifest） / 1 / `MATCHED=254 MISSING=0 HASH_MISMATCH=0 ORPHANS=0 DUP_STATE_GROUPS=3` /` |
| `verify-evidence-corpus（全域）` | **1** | MANIFESTS=23 SCANNED=23 EXPIRED_GITSHA=19 PROBLEMS=9 → CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA） | 退出码 `1`：`/ verify-evidence-corpus / 1 / 5/5 份 manifest gitSha ≠ HEAD；round-1 的 305+305 帧无 contentHash /` |
| `verify-provenance-all（全域）` | **1** | FRAMES_CONSISTENT=2608 PRE_STAMP=95 STALE=0 UNDATED=171 PRODUCERS=17 LITERAL_SHA=2 → PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论） | 退出码 `1`：`/ verify-provenance-all（本轮新建） / 1 / 帧侧 0 伪造 / 0 过期戳记（1118 张时间轴相符）；生产者侧 3 处字面量 SHA /` |
| `verify-evidence-corpus（本轮 scope）` | **1** | MANIFESTS=12 SCANNED=12 PROBLEMS=6 → CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA） | 台账 §1 无此行（不猜） |
| `verify-provenance-all（本轮 scope）` | **1** | FRAMES_CONSISTENT=591 UNDATED=27 → PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-mock-tour-1a1df78b，信息轴）` | **0** | SHOTS=77 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-real-exec，信息轴）` | **1** | SHOTS=169 DUP_STATE=36 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-real-tour，信息轴）` | **0** | SHOTS=18 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-real-tour-full，信息轴）` | **0** | SHOTS=77 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states，信息轴）` | **1** | SHOTS=18 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=11 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-fix2，信息轴）` | **1** | SHOTS=4 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=4 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot，信息轴）` | **1** | SHOTS=2 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot2，信息轴）` | **1** | SHOTS=1 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot3，信息轴）` | **1** | SHOTS=1 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-states-pilot4，信息轴）` | **1** | SHOTS=1 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=1 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-7-uidebt-1a1df78b，信息轴）` | **1** | SHOTS=42 DUP_STATE=6 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-queue-reconcile` | **0** | GAP=0 NEVER_RAN=0套/0例 ERR_TAINTED=0 → QUEUE_RESULT=PASS | 退出码 `1`：`/ verify-queue-reconcile（round-2, --allow-unlabeled） / 1 / 计划 1107/24 套 · 记录 941/21 套 · 缺口 166 · 从未开跑 3 套 116 例 · 重复 id 组 30 · 错误污染 373 例 /` |
| `verify-backend-restarted` | **0** | JVM pid=29536 startedAt=2026-09-26 03:12:29 STALE_SOURCE=none  HEAD_NEWER_THAN_JVM=no  APPS_API_CLEAN_VS_HEAD=yes → PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提 | 退出码 `0`：`/ verify-backend-restarted / 0 / JVM pid 11800 起于 11:37:11，晚于全部 java 源码与 HEAD /` |
| `probe-real-env` | **0** | BACKEND=UP REACHABLE=8/8 → READY | 退出码 `0`：`/ probe-real-env / 0 / `PROBE_BACKEND=UP`、素材 8/8 可达、`PROBE_VERDICT=READY` /` |
| `verify-i18n-orphan` | **0** | ZH=4157 EN=4157 PAIR_DIFF=0+0 ORPHANS=1257/允许1257 → I18N_RESULT=PASS | 台账 §1 无此行（不猜） |
- **本次仍判红：2 / 8** —— `verify-evidence-corpus（本轮 scope）`(1) `verify-provenance-all（本轮 scope）`(1)
- 轮初基线里退出码=1 的行数（从台账 §1 原文**数出来**的，不是记忆）：**8** (源: .zcode/tmp/round6-LEDGER.md → §1 退出码列)
- 口径注：门禁面板里的 corpus/provenance 是**本轮 scope** 版（reports/audit/round-7,reports/screenshots/round-7-exec,reports/screenshots/round-7-exec-086b54f8,reports/screenshots/round-7-mock-tour-1a1df78b,reports/screenshots/round-7-real-exec,reports/screenshots/round-7-real-tour,reports/screenshots/round-7-real-tour-full,reports/screenshots/round-7-states,reports/screenshots/round-7-states-fix1,reports/screenshots/round-7-states-fix2,reports/screenshots/round-7-states-pilot,reports/screenshots/round-7-states-pilot2,reports/screenshots/round-7-states-pilot3,reports/screenshots/round-7-states-pilot4,reports/screenshots/round-7-uidebt-1a1df78b）；全域版同表打印但只作历史口径（与轮初基线可比的是全域版，能否决本轮收尾的是 scope 版）。integrity 分两类：**权威索引轴**（`reports/audit/round-7/screenshot-manifest.json`，由 scripts/qa/rebuild-frozen-manifest.mjs 从各 corpus 派生）进取决集，逐 corpus 的**原始记录轴**只打印数字、不进取决集（同字节帧已被权威索引改判进 stateNotApplied[]，原始 corpus 是采集时刻的原始记录、不改写也不删；它们的组数逐条进"一条不藏"那一节）；`--exec` 分支的否决权本轮收窄为「只否决伪造」=证据里写了图片路径、既无 ERROR/timeout 注记、盘上又不存在，自报失败的注记条目不再计红（tier 交不齐由 readjudicate-evidence/verify-queue-reconcile 记账），这条改动有配对自检 scripts/qa/test-evidence-fabrication.cjs（含反向对照）；ledger/state-truth 限定 `reports/audit/round-7`；i18n 的孤儿走棘轮（配对差异一律判红，基线与理由见 scripts/qa/verify-i18n-orphan.mjs 顶部与台账 §74）。

## I. 本轮新立 / 新证缺陷（全部从门与判据的输出派生，不手写）

- G8 本次 10 环全 OK（本节未从 G8 派生出新缺陷）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs → G8_RINGS_OK=)
- **[D-LEDGER]** LEDGER_MULTI_ID_FAMILIES=29（同一缺陷多 ID 的族数，>0 就说明台账没收敛） (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6 → LEDGER_MULTI_ID_FAMILIES=)

## I-bis. 修复波逐项判据（静态侧终态，逐条来自 verdicts 件而非台账自述）

- 来源：`.zcode/tmp/fixverify/verdicts.json`（sha8=`84e9bdf4`，items=116）；桶合计 116 ✔ 守恒
- 台账状态侧：本轮判据覆盖的条目里，仍写「待修复」**58** 条、已推「已修复待复验」**33** 条。
- 判据侧五桶：
  - **ARTIFACT_VERIFIED = 31**
  - **SOURCE_ONLY = 1**
  - **NEEDS_UI_FRAME = 79**
  - **NOT_IN_EITHER = 0**
  - **UNDECIDABLE = 5**
- 桶语义（写死在这里，避免下一轮重新解释）：
  - `ARTIFACT_VERIFIED`＝修后状态在**被测产物**里命中，且该判点在修复前的 HEAD 里不存在（工具的 `grantingPredatesFix` 对照通过）；
  - `SOURCE_ONLY`＝只在源码树命中，产物是构建早于改动的旧件；**这条分支本轮起也过 HEAD 对照**，
    因为旧实现只对授绿路径做对照，会把 HEAD 里本来就有的老代码判成「本轮改的」（实测拦下 2 条假推进，见台账 §47）；
  - `NEEDS_UI_FRAME`＝静态两载体都判不了行为/观感，必须等定向重截帧；
  - `NOT_IN_EITHER`＝两载体都查不到预期修后状态（疑似未落地，逐条附检索串）；
  - `UNDECIDABLE`＝台账判据本身含糊（抠不出可比对物件、或只抠到会被构建改名的裸标识符）。
- `NOT_IN_EITHER` 逐条点名（0 条，一条都不并拢）：
- 状态与判据相互打脸的条数：**9**（台账仍写待修复、判据却已在载体命中且非 HEAD 既存）。这些行必须当场改状态或在报告里说明为何不改，不允许两种口径同时留在台账里。
- 反向不一致：**0** 条台账已推「已修复待复验」而判据台仍判 `NOT_IN_EITHER`：

## J. 缺口 / 未判定 / 挂起（上面所有『判不了』归拢，一条不藏）

- 覆盖缺口：0 套 / 0 例从未开跑，GAP=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-7 → QUEUE_NEVER_RAN_CASES=)
- 半途套件：0 个 `status=running`（其已记行数见 C 节套件表）(源: tmp/qa/checkpoints/exec-R7.json → suites[].status)
- 205 行跨边界被就地改写 —— 同一用例在两个被测物上各记一次，后写覆盖前写，A 侧该项已非冻结构建产物
- 真实模式：undefined —— undefined
- verify-evidence-integrity（原始 corpus：round-7-real-exec，信息轴） —— 同页同身份却同字节的帧仍在原始记录里：36 组 —— 信息轴不否决；这 36 组已由权威索引 stateNotApplied[] 承接（retroactive 改判），产品侧「该状态是否真的不改变画面」仍是待复验项，下一轮需要元素级交互断言而不是像素比对
- verify-evidence-integrity（原始 corpus：round-7-states，信息轴） —— 原始 corpus 有 11 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-fix2，信息轴） —— 原始 corpus 有 4 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot，信息轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot2，信息轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot3，信息轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-states-pilot4，信息轴） —— 原始 corpus 有 1 条断链/哈希不符/孤儿 —— 信息轴不否决，但必须先确认权威索引没漏掉同一批帧
- verify-evidence-integrity（原始 corpus：round-7-uidebt-1a1df78b，信息轴） —— 同页同身份却同字节的帧仍在原始记录里：6 组 —— 信息轴不否决；这 6 组已由权威索引 stateNotApplied[] 承接（retroactive 改判），产品侧「该状态是否真的不改变画面」仍是待复验项，下一轮需要元素级交互断言而不是像素比对
- 门禁 verify-evidence-corpus（本轮 scope） —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-provenance-all（本轮 scope） —— 本次退出码 1（禁止静默收尾）
- 门禁 verify-evidence-corpus（全域） —— 本次退出码 1 —— 历史口径红（round-1/2 无 gitSha 或无日期戳），不否决本轮，但那些证据不可复用
- 门禁 verify-provenance-all（全域） —— 本次退出码 1 —— 历史口径红（round-1/2 无 gitSha 或无日期戳），不否决本轮，但那些证据不可复用

## 附 1：守恒核对全表（报告里每一条桶分解）

| 分解 | 各项 | 合计 | 全体 | 结论 |
|---|---|---|---|---|
| 计划 − 记录 vs GAP | 1107 + 0 | 1107 | 1107 | CONSERVED ✔ |
| status 分布 vs 检查点 suites | 24 | 24 | 24 | CONSERVED ✔ |
| 已认领 + 从未开跑 vs 计划套件 | 24 + 0 | 24 | 24 | CONSERVED ✔ |
| A 侧 + B 侧 vs 在盘行数 | 1107 + 0 | 1107 | 1107 | CONSERVED ✔ |
| A 侧三态 vs A 侧行数 | 326 + 134 + 647 + 0 | 1107 | 1107 | CONSERVED ✔ |
| B 侧三态 vs B 侧行数 | 0 + 0 + 0 + 0 | 0 | 0 | CONSERVED ✔ |
| 快照中已从在盘消失的行（应为 0） | 0 | 0 | 0 | CONSERVED ✔ |
| 套件表行数合计 vs 在盘行数 | 1107 | 1107 | 1107 | CONSERVED ✔ |
| 套件表状态格合计 vs 在盘行数 | 1107 | 1107 | 1107 | CONSERVED ✔ |
| 分诊桶合计 vs 行数 | 326 + 647 + 134 | 1107 | 1107 | CONSERVED ✔ |
| 四格合计 vs 有查找目标的定位失败 |  | 0 | 0 | CONSERVED ✔ |
| 在目标页三态（是/否/判不了）vs 分诊条目 | 621 + 160 + 0 | 781 | 781 | CONSERVED ✔ |
| 五类合计 vs 改判台行数 | 87 + 0 + 0 + 781 + 239 | 1107 | 1107 | CONSERVED ✔ |
| 有图 / 断链 / 无 .png 引用 vs EXECUTED 行数 | 326 + 0 + 0 | 326 | 326 | CONSERVED ✔ |
| aliasLabel 拆项 vs stateNotApplied | 0 + 0 + 0 | 0 | 0 | CONSERVED ✔ |
| stateNotApplied + 其它 failure vs failures 总数 | 0 + 12 | 12 | 12 | CONSERVED ✔ |
| identity 分组 vs shots 总数 | 72 + 5 | 77 | 77 | CONSERVED ✔ |
| zoomFrames vs shots[].zoomCrops（两处独立取数） | 0 | 0 | 0 | CONSERVED ✔ |
| G9 ok+skipped+fail vs PROBED | 455 + 0 + 0 | 455 | 455 | CONSERVED ✔ |
| G9 对照表四格 vs PROBED | 455 + 0 + 0 + 0 | 455 | 455 | CONSERVED ✔ |
| G8 OK 环 + MISS 环 vs 环总数 | 10 + 0 | 10 | 10 | CONSERVED ✔ |
- 合计 21 条分解，判红 0 条

## 附 2：本工具自判失败清单（任一条即非零退出；报告照写，但不得当作验收通过）

1. 空集判红：dist/src 四格 0 条 —— 能恢复出查找目标的定位失败为 0，通常是 token 提取失灵，不是真的没有失败

> 本文件由 `scripts/qa/emit-round-report.mjs` 生成于 2026-09-26T12:25:25.648Z；机器可读同一份数据在 `reports/audit/round-7/round7-metrics.json`。
