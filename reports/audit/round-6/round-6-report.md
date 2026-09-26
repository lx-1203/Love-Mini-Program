# round-6 轮末验收报告（全部数字运行时派生，零手写统计）

- 生成器：`scripts/qa/emit-round-report.mjs`（启动于 2026-09-26T05:09:05.453Z，node v22.17.0，`D:/codex-tools/node-v22.17.0-win-x64/node.exe`）
- 轮次目录 `reports/audit/round-6` · 权威件 `reports/audit/round-6/interact/exec-results.json` · 冻结快照 `.zcode/tmp/round6-exec/exec-results.snapshot-82e9960db122090c.json`

## 0. 溯源表（本报告引用的每一个输入；缺此表即不可复核）

| 文件 | mtime (UTC) | 字节 | sha256 前 8 |
|---|---|---|---|
| `.zcode/tmp/round6-exec/exec-results.snapshot-82e9960db122090c.json` | 2026-09-25T16:11:03.230Z | 535492 | `82e9960d` |
| `.zcode/tmp/round6-LEDGER.md` | 2026-09-26T02:35:50.253Z | 327926 | `46fb9e7b` |
| `reports/audit/real-e2e/GATES.json` | 2026-09-26T05:08:52.716Z | 2286 | `055ed361` |
| `reports/audit/round-6/interact/exec-results.json` | 2026-09-25T22:57:26.937Z | 1161149 | `e7a7fe79` |
| `reports/audit/round-6/ops/` | (目录：登记条目数 24，无单文件语义) | 24 | `4e5c2793` |
| `reports/audit/round-6/screenshot-manifest.json` | 2026-09-26T01:25:40.468Z | 951195 | `6e9f69ce` |
| `reports/screenshots/round-6-tour/manifest-detail.json` | 2026-09-25T09:24:49.927Z | 725431 | `3f132cee` |
| `scripts/qa/r-exec.cjs` | 2026-09-25T23:59:25.629Z | 128320 | `5891159b` |
| `tmp/qa/checkpoints/exec-R6.json` | 2026-09-25T22:57:26.939Z | 58639 | `c87ef147` |

| 子进程（命令行原样，cwd=仓库根） | 解释器 | 退出码 | stdout 字节 | sha256(stdout) 前 8 | 备注 |
|---|---|---|---|---|---|
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-backend-restarted.mjs --port 8080` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 590 | `d8818233` |  |
| `git rev-parse --short HEAD` | git | 0 | 9 | `2e1206ec` |  |
| `git status --porcelain` | git | 0 | 462 | `3dc341ba` |  |
| `git status --porcelain -- apps/` | git | 0 | 0 | `e3b0c442` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 808 | `d31ad3a5` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-6/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 304 | `ec631cc1` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-6/interact/exec-results.json --ops reports/audit/round-6/ops --no-lines --samples 1` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 5294 | `59e25d54` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-state-truth.mjs reports/audit/round-6` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1108 | `0aeaa393` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 6009 | `05961212` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/audit/round-6/screenshot-manifest.json --dir reports/screenshots/round-6-tour --exec reports/audit/round-6/interact/exec-results.json` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1146 | `a5113737` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-corpus.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 3338 | `c083333c` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-provenance-all.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 4506 | `4f4ec2c6` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-corpus.mjs --scope reports/audit/round-6,reports/screenshots/round-6-interact,reports/screenshots/round-6-real-tour,reports/screenshots/round-6-tour,reports/screenshots/round-6-tour-chat,reports/screenshots/round-6-tour-dupfix,reports/screenshots/round-6-tour-reshoot` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1721 | `4ea08538` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-provenance-all.mjs --scope reports/audit/round-6,reports/screenshots/round-6-interact,reports/screenshots/round-6-real-tour,reports/screenshots/round-6-tour,reports/screenshots/round-6-tour-chat,reports/screenshots/round-6-tour-dupfix,reports/screenshots/round-6-tour-reshoot` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 2222 | `4c9468b6` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-6-real-tour/manifest-detail.json --dir reports/screenshots/round-6-real-tour` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 649 | `78a8267b` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-6-tour/manifest-detail.json --dir reports/screenshots/round-6-tour` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1379 | `341ec026` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-6-tour-chat/manifest-detail.json --dir reports/screenshots/round-6-tour-chat` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 643 | `0d227663` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-6-tour-dupfix/manifest-detail.json --dir reports/screenshots/round-6-tour-dupfix` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 647 | `e9528fdb` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-evidence-integrity.mjs reports/screenshots/round-6-tour-reshoot/manifest-detail.json --dir reports/screenshots/round-6-tour-reshoot` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 1 | 1495 | `021ae26d` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-i18n-orphan.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1851 | `8ed204f4` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe apps/client/scripts/build-real-isolated.mjs --check-only` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 200 | `265f3f57` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 2510 | `d3503001` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 402 | `96ec2406` |  |
| `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/probe-real-env.mjs` | D:/codex-tools/node-v22.17.0-win-x64/node.exe v22.17.0 | 0 | 1093 | `9e008813` |  |

> **并发写入声明**：权威件在执行轮结束前持续被追加。本工具对每个文件**读一次、哈希一次**，上表 sha 就是被我解析的那一份字节；被调门（分诊台/改判台/完整性门）按各自启动时刻**重读同一文件**，故它们的行数与我这份可差几条——差值在对应小节逐处标出，不取齐、不四舍五入。

## A. 轮次身份

- HEAD：`1598715f` (源: git rev-parse --short HEAD → stdout=)
- 工作树脏项：全仓 11 项 (源: git status --porcelain → 行数=)；其中 `apps/` 下 0 项 (源: git status --porcelain -- apps/ → 行数=)
- 后端 JVM：pid=29536，起于 2026-09-26 03:12:29 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-backend-restarted.mjs --port 8080 → RESTARTED_PID=)；该门本次判定 **PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提**（退出码 0）
  - 其自报最新源码：D:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java mtime=2026-09-25T16:35:35.256Z
- 被测物包指纹（在盘产物逐文件 sha256 前 8；brief 所说『两个 mock 包指纹』的全部可核解释一并列出）：
  - **mock 包（执行轮被测物，重建后在盘）** `apps/client/dist/build/mp-weixin`：app.json=`207f7136` (5264B, 2026-09-26T02:48:50.613Z) · config/env.js=`f1c7b96b` (2402B, 2026-09-26T02:48:50.472Z) · config/showcase.js=`59e2a9c9` (920B, 2026-09-26T02:48:50.577Z) · config/feature-flags.js=`08a7cff6` (134B, 2026-09-26T02:48:50.576Z)
    合成指纹（按 `app.json→env→showcase→feature-flags` 的 sha8 串接再 sha256）：`ff6dd482` (源: apps/client/dist/build/mp-weixin/app.json → sha256)
  - **real 包（G7 隔离产物）** `apps/client/dist/build/mp-weixin-real`：app.json=`207f7136` (5264B, 2026-09-26T02:55:56.272Z) · config/env.js=`f0677920` (2392B, 2026-09-26T02:55:56.163Z) · config/showcase.js=`3039fc25` (910B, 2026-09-26T02:55:56.225Z) · config/feature-flags.js=`08a7cff6` (134B, 2026-09-26T02:55:56.223Z)
    合成指纹（按 `app.json→env→showcase→feature-flags` 的 sha8 串接再 sha256）：`05637737` (源: apps/client/dist/build/mp-weixin-real/app.json → sha256)
  - 巡检载体**当时记下**的 buildFingerprint（记录值，非本次计算）：`{"buildMode":"build:mp-weixin:mock","mode":"mp-weixin-mock","apiMode":"mock","isShowcaseMode":false,"membershipEnabled":false,"readFrom":["apps/client/dist/build/mp-weixin/config/env.js","apps/client/dist/build/mp-weixin/config/showcase.js","apps/client/dist/build/mp-weixin/config/feature-flags.js"]}` gitSha=`874ff52f` (源: reports/screenshots/round-6-tour/manifest-detail.json → buildFingerprint)
  - 两份巡检载体是否同一 gitSha：是（874ff52f）

## B. 覆盖（计划 / 已记录 / 缺口）

- 队列对账门本次判定：**QUEUE_RESULT=PASS**（退出码 0）
- 计划：24 套 / 1107 例 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_PLANNED_CASES=)
- 已记录：1107 行（manifest 轴 24 套；唯一 id 1065；我这份快照读到 1107 行）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_RECORDED_CASES=)
- 缺口：GAP=0；从未开跑 0 套 / 0 例；未计划套件 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_GAP=)
- 键轴：`manifest` 命中 24/24；缺 manifest 字段的行 0；复合主键重复组 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_KEY_AXIS_MATCHED=)
- requiresReal 普查：true=236 false=871 未打=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_REQUIRES_REAL_TRUE=)
- 证据里带 ERROR/timeout 的行（192 那条门禁口径）：145 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_ERR_TAINTED_CASES=)
- CONSERVED ✔ 计划 − 记录 vs GAP: 1107 + 0 = 1107 vs 全体 1107
- 检查点 `tmp/qa/checkpoints/exec-R6.json`：suites 29，status 分布 completed=29 (源: tmp/qa/checkpoints/exec-R6.json → suites[].status)
  - **status=running 的套件是半途中断的半成品，绝不得计入"完成"**：无 (源: tmp/qa/checkpoints/exec-R6.json → suites[running])
  - 套件轴口径说明：检查点键是**派生规划器 id**（`P-<manifest>-<seq>`），计划侧是 manifest 名，两轴不同，故下面用权威件的 `suite→manifest` 字段做映射（映射不到者进兜底桶）。
  - 计划套件（ops 轴）24 · 检查点已认领 24 · 从未进检查点 0 · 兜底桶「suite 键映射不到 manifest」= **0** (源: reports/audit/round-6/interact/exec-results.json → results[].suite → results[].manifest)
  - CONSERVED ✔ status 分布 vs 检查点 suites: 29 = 29 vs 全体 29
  - CONSERVED ✔ 已认领 + 从未开跑 vs 计划套件: 24 + 0 = 24 vs 全体 24
  - 与队列门的从未开跑一致：0 套
- 从未开跑清单（逐字取自门的输出行，非我拼装）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_NEVER_RAN=)：
  - ⚠ 门一行 `QUEUE_NEVER_RAN` 都没打印，而计数是 0 —— 两者不符即为该门的截断/字段问题，按取不到记。

## C. 结果分布（重建边界两侧分开算，合并值只作守恒核对）

- **边界怎么派生**：把在盘权威件与冻结快照按 `suite|manifest|id` 三字段复合键比对（与 `scripts/qa/r-exec.cjs` 第 478 行 的 `upsertResult` findIndex 同一把键，行号由本报告读该文件得出）(源: scripts/qa/r-exec.cjs → upsertResult findIndex 行号)。**不按行号**——行是就地 upsert 的，按号比必错位。
  - 快照 `.zcode/tmp/round6-exec/exec-results.snapshot-82e9960db122090c.json`：556 行，gitSha=874ff52f updatedAt=2026-09-25T16:10:03.144Z (源: .zcode/tmp/round6-exec/exec-results.snapshot-82e9960db122090c.json → results[])
  - 在盘 `reports/audit/round-6/interact/exec-results.json`：1107 行，gitSha=874ff52f updatedAt=2026-09-25T22:57:26.921Z (源: reports/audit/round-6/interact/exec-results.json → results[])
- **A 侧｜冻结 `874ff52f` 构建 + 旧后端**（复合键见于快照的行）：556 行 = EXECUTED 291 / FAILED 157 / SKIPPED 108 (源: reports/audit/round-6/interact/exec-results.json → status)
- **B 侧｜重建构建 + 重启后后端**（复合键未见于快照的行）：551 行 = EXECUTED 299 / FAILED 220 / SKIPPED 32 (源: reports/audit/round-6/interact/exec-results.json → status)
- ⚠ 合计（**混合两个被测物，仅作守恒核对，不得作结论、不得当通过率分母**）：1107 行 = EXECUTED 590 / FAILED 377 / SKIPPED 140 (源: reports/audit/round-6/interact/exec-results.json → status)
- CONSERVED ✔ A 侧 + B 侧 vs 在盘行数: 556 + 551 = 1107 vs 全体 1107
- CONSERVED ✔ A 侧三态 vs A 侧行数: 291 + 157 + 108 + 0 = 556 vs 全体 556
- CONSERVED ✔ B 侧三态 vs B 侧行数: 299 + 220 + 32 + 0 = 551 vs 全体 551
- CONSERVED ✔ 快照中已从在盘消失的行（应为 0）: 0 = 0 vs 全体 0
- 两侧同键但状态被改写（停机后重跑同一用例、覆盖旧结论）：**3** 行 (源: .zcode/tmp/round6-exec/exec-results.snapshot-82e9960db122090c.json → status)
  - `P-PAGES-DISCOVER-INDEX-01|PAGES-DISCOVER-INDEX|DC20` EXECUTED → FAILED
  - `P-PAGES-LOGIN-INDEX-01|PAGES-LOGIN-INDEX|LG12` EXECUTED → FAILED
  - `P-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-01|SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI03` FAILED → EXECUTED
  - 这些行按复合键归 **A 侧**（快照认领过），但其状态取自在盘权威件。把 A 侧读成"纯冻结构建的结果"时须扣这 3 行。

| 套件（manifest｜检查点 suite 轴） | 行数 | A侧 | B侧 | EXECUTED | FAILED | SKIPPED | 其他 |
|---|---|---|---|---|---|---|---|
| `次要21`｜`P-次要21-01` | 76 | 0 | 76 | 50 | 19 | 7 | 0 |
| `次要20`｜`P-次要20-01` | 73 | 0 | 73 | 48 | 21 | 4 | 0 |
| `次要18`｜`P-次要18-01` | 70 | 0 | 70 | 34 | 33 | 3 | 0 |
| `次要22`｜`P-次要22-01` | 66 | 0 | 66 | 41 | 24 | 1 | 0 |
| `次要19`｜`P-次要19-01` | 51 | 0 | 51 | 28 | 19 | 4 | 0 |
| `PAGES-HOME-INDEX`｜`P-PAGES-HOME-INDEX-01` | 48 | 48 | 0 | 37 | 3 | 8 | 0 |
| `PAGES-DISCOVER-INDEX`｜`P-PAGES-DISCOVER-INDEX-01` | 45 | 45 | 0 | 22 | 8 | 15 | 0 |
| `PAGES-PROFILE-INDEX`｜`P-PAGES-PROFILE-INDEX-01` | 45 | 45 | 0 | 20 | 8 | 17 | 0 |
| `PAGES-NEARBY-INDEX`｜`P-PAGES-NEARBY-INDEX-01` | 42 | 42 | 0 | 24 | 0 | 18 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-INDEX`｜`P-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-01` | 42 | 3 | 39 | 23 | 15 | 4 | 0 |
| `PAGES-MESSAGES-INDEX`｜`P-PAGES-MESSAGES-INDEX-01` | 41 | 41 | 0 | 14 | 11 | 16 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC`｜`P-SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-01` | 41 | 41 | 0 | 22 | 18 | 1 | 0 |
| `SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC`｜`P-SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-01` | 40 | 40 | 0 | 20 | 17 | 3 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-POST`｜`P-SUBPACKAGES-VILLAGE-VILLAGE-POST-01` | 40 | 0 | 40 | 14 | 23 | 3 | 0 |
| `PAGES-LOGIN-INDEX`｜`P-PAGES-LOGIN-INDEX-01` | 38 | 38 | 0 | 14 | 17 | 7 | 0 |
| `PAGES-REGISTER-INDEX`｜`P-PAGES-REGISTER-INDEX-01` | 37 | 37 | 0 | 20 | 13 | 4 | 0 |
| `SUBPACKAGES-CHAT-CHAT-SESSION-INDEX`｜`P-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-01` | 34 | 34 | 0 | 7 | 24 | 3 | 0 |
| `SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH`｜`P-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-01` | 34 | 0 | 34 | 10 | 22 | 2 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-INDEX`｜`P-SUBPACKAGES-CAMPUS-CAMPUS-INDEX-01` | 30 | 30 | 0 | 13 | 12 | 5 | 0 |
| `次要20`｜`P-次要20-02` | 28 | 0 | 28 | 20 | 6 | 2 | 0 |
| `SUBPACKAGES-CAMPUS-CAMPUS-HUB`｜`P-SUBPACKAGES-CAMPUS-CAMPUS-HUB-01` | 27 | 27 | 0 | 23 | 4 | 0 | 0 |
| `次要21`｜`P-次要21-02` | 26 | 0 | 26 | 16 | 10 | 0 | 0 |
| `SUBPACKAGES-CIRCLES-CIRCLES-INDEX`｜`P-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-01` | 25 | 25 | 0 | 16 | 6 | 3 | 0 |
| `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING`｜`P-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-01` | 24 | 24 | 0 | 15 | 5 | 4 | 0 |
| `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS`｜`P-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-01` | 20 | 20 | 0 | 12 | 6 | 2 | 0 |
| `次要18`｜`P-次要18-02` | 18 | 0 | 18 | 12 | 5 | 1 | 0 |
| `次要19`｜`P-次要19-02` | 18 | 0 | 18 | 3 | 14 | 1 | 0 |
| `PAGES-REGISTER-SUCCESS`｜`P-PAGES-REGISTER-SUCCESS-01` | 16 | 16 | 0 | 10 | 4 | 2 | 0 |
| `次要22`｜`P-次要22-02` | 12 | 0 | 12 | 2 | 10 | 0 | 0 |
| **合计（29 套）** | 1107 | 556 | 551 | 590 | 377 | 140 | 0 |
- CONSERVED ✔ 套件表行数合计 vs 在盘行数: 1107 = 1107 vs 全体 1107
- CONSERVED ✔ 套件表状态格合计 vs 在盘行数: 1107 = 1107 vs 全体 1107

## D. 失败分诊

- **用的是刚跑的那一份**：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-6/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report`（退出码 0），sidecar `.zcode/tmp/report-emitter/triage-r6-at-report.md/.json`
- 来源：本次由本报告启动的分诊台（其 stdout + 它自己写的 JSON sidecar）；权威件 `reports/audit/round-6/interact/exec-results.json` updatedAt=2026-09-25T22:57:26.921Z 行数=1107 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-6/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report → TRIAGE_RESULT=)

| 桶 | 条数 |
|---|---|
| `EXECUTED` | 590 |
| `SKIPPED-not-automatable` | 140 |
| `locate-label` | 115 |
| `locate-label-token-lost` | 79 |
| `locate-selector` | 144 |
| `harness-api` | 19 |
| `timeout` | 20 |
| （本次为 0、故未列出的桶） | auth-precondition, other-fail |
- CONSERVED ✔ 分诊桶合计 vs 行数: 590 + 140 + 115 + 79 + 144 + 19 + 20 = 1107 vs 全体 1107
- ⚠ **兜底/未归类合计 = 79**（other-fail 0、工具自报 unclassified 79）：这些行的判据形态没被任何规则接住，必须逐条读原文，不许并进任何通过率。

### dist/src 四格（只对能恢复出查找目标的定位失败做双载体检；n=259）(源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].verdict)

| 结论 | 条数 |
|---|---|
| 两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机） | 151 |
| 两载皆无：本构建确无此文案/类，用例断言的目标不存在（产品缺或规格臆造） | 74 |
| 不在目标页：前置导航没到位（用例前置/harness 通道），元素存在性无从判断 | 31 |
| 仅源码有：修复波补上了它 → 本轮失败作废，重建后必须复验 | 3 |
- CONSERVED ✔ 四格合计 vs 有查找目标的定位失败: 151 + 74 + 31 + 3 = 259 vs 全体 259
- 单字标签（从用例散文里抠出的残字，几乎必是规格噪声而非产品缺陷）：**27** (源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].suspect)
- token-lost（执行器只留哨兵 `__CAND__`、没留要找的文案，事后无法复核）：**79** (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-6/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report → locate-label-token-lost=)
- 动作发生时不在用例声明的页面上：**65**；`top=` 与 `route[]` 都读不到因而**判不了**：**0** (源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].onTarget)
- observed 带 `MISMATCH!`（执行器自报前置身份/状态不符）：**187** (源: .zcode/tmp/report-emitter/triage-r6-at-report.json → items[].mismatch)
- CONSERVED ✔ 在目标页三态（是/否/判不了）vs 分诊条目: 452 + 65 + 0 = 517 vs 全体 517

## E. 证据可信度（两条规则并列展示，不合并、不互相替换）

- **用的是刚启动的干跑**（无 `--apply`，未写任何权威件）：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-6/interact/exec-results.json --ops reports/audit/round-6/ops --no-lines --samples 1` 退出码 0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-6/interact/exec-results.json --ops reports/audit/round-6/ops --no-lines --samples 1 → RJ_CLASS=)
- 它读到的行数：1107（我这份快照 1107 行）；status 分布 {"EXECUTED":590,"FAILED":377,"SKIPPED":140}

| 分类（规则：先剥 `(123B)` / `(ERROR:…)` 尾注再看盘，再按 tier 配额判定） | 用例数 | 其中 EXECUTED |
|---|---|---|
| `CLEAN_EVIDENCE` | 565 | 378 |
| `TAINTED_BUT_FILE_PRESENT` | 33 | 13 |
| `NO_EVIDENCE_MISSING_FILE` | 112 | 2 |
| `NOT_A_FILE_REF` | 275 | 75 |
| `EXECUTED_WITHOUT_TIER_EVIDENCE` | 122 | 122 |
- CONSERVED ✔ 五类合计 vs 改判台行数: 565 + 33 + 112 + 275 + 122 = 1107 vs 全体 1107
- `RJ_SET_IDENTICAL`（与 192 那条门禁口径是否同一集合）：**1（同一）** (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-6/interact/exec-results.json --ops reports/audit/round-6/ops --no-lines --samples 1 → RJ_SET_IDENTICAL=)
- 门禁等价集=145 / 本工具污染全宇宙=145 / 只在本工具=0、只在门禁=0、交集=145 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-6/interact/exec-results.json --ops reports/audit/round-6/ops --no-lines --samples 1 → RJ_GATE_EQUIV_CASES=)
- 改判到 NO-EVIDENCE=122 条；EXECUTED 但 tier 交不齐=122 条；只有大小注记且文件确在=503 条；整行无像素引用=275 条 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/readjudicate-evidence.mjs reports/audit/round-6/interact/exec-results.json --ops reports/audit/round-6/ops --no-lines --samples 1 → RJ_DOWNGRADE_TO_NO_EVIDENCE=)
- ⚠ `EXECUTED_WITHOUT_TIER_EVIDENCE=122`：这些"已执行"连 tier 要求的帧都没落盘。

### 本报告内独立复算（第二条规则：不看 tier 配额，只问『有没有一张像素帧真在盘上』）

- 规则：EXECUTED 行的 `evidence[]` 里，剥掉 `(123B)` 与 `(ERROR:…)` 尾注后**至少一条 .png 在盘且 size>0** (源: reports/audit/round-6/interact/exec-results.json → evidence[])
- 结果：**331 / 590** 条达标；其余 = 纯断链 0 条 + evidence[] 里根本没有 .png 引用 259 条
- CONSERVED ✔ 有图 / 断链 / 无 .png 引用 vs EXECUTED 行数: 331 + 0 + 259 = 590 vs 全体 590
- 修复后新字段 「missingEvidence[]」：550 行带该字段（= 由修好的执行器写出的行），其中 196 行确有捕获失败记录 (源: reports/audit/round-6/interact/exec-results.json → missingEvidence[])
- 幻象路径余量：全库仍有 175 条 evidence[] 带 「(ERROR:…)」，其中新行内 0 条 (源: reports/audit/round-6/interact/exec-results.json → evidence[])
  判读：新行内应为 **0**（不为 0 就说明存在性校验没接上）；旧行的余量由改判台在步骤① 处理，不算本轮未修。

| 口径 | 规则 | 『干净』计数 | 用的行集 |
|---|---|---|---|
| 改判台 | 先剥尾注再看盘 **且** 按 tier 交齐（critical=2 帧 / normal=1 / navigation,noop=0） | CLEAN 378 条 EXECUTED（另有 TAINTED_BUT_FILE_PRESENT 13 条文件确在） | 它自己重读的 1107 行 |
| 本报告 | 至少 1 张 .png 在盘即算有像素证据（不看 tier 配额） | 331 条 EXECUTED | 我这份快照 590 条 EXECUTED |
- 两数不等是**规则不同**（tier 要 2 帧，本口径只要 1 帧），不是有一边算错；编排层已决定终报两条并列。

## F. 截图巡检（`reports/screenshots/round-6-tour/manifest-detail.json`）

- 载体头：gitSha=874ff52f workflowVersion=3.1 buildMode=build:mp-weixin:mock generatedAt=2026-09-25T09:24:49.921Z (源: reports/screenshots/round-6-tour/manifest-detail.json → gitSha)
- 帧数 shots = **263**，按 identity：A=133 / B=130 (源: reports/screenshots/round-6-tour/manifest-detail.json → shots[])
- failures = **46**，按 identity：A=21 / B=25 (源: reports/screenshots/round-6-tour/manifest-detail.json → failures[])
- stateNotApplied = **37**，按 `aliasLabel` 拆：`true`=24（同帧别名标签：把默认帧再标一次数据态/空态）/ `false`=13（状态真没打上去，需定向重截）/ 其他=0 (源: reports/screenshots/round-6-tour/manifest-detail.json → stateNotApplied[].aliasLabel)
- routeDrifts = **11**，按 identity：A=5 / B=6 (源: reports/screenshots/round-6-tour/manifest-detail.json → routeDrifts[])
- zoomFrames = **336**，按 identity：A=174 / B=162；另一处独立取数 `shots[].zoomCrops` 合计 336 (源: reports/screenshots/round-6-tour/manifest-detail.json → zoomFrames[])
- 工作树脏项（载体当时自报，与 A 节本次实测是不同时刻）：12 (源: reports/screenshots/round-6-tour/manifest-detail.json → gitWorktreeDirtyPaths)
- 采集限制（载体字段 `captureLimitations.screenshotDprSupported=false`）：截图不支持 DPR 参数，zoom 帧是 1x 原帧整数倍最近邻上采样，不产生新细节、不计状态配额 (源: reports/screenshots/round-6-tour/manifest-detail.json → captureLimitations)
- CONSERVED ✔ aliasLabel 拆项 vs stateNotApplied: 24 + 13 + 0 = 37 vs 全体 37
- CONSERVED ✔ stateNotApplied + 其它 failure vs failures 总数: 37 + 9 = 46 vs 全体 46
- CONSERVED ✔ identity 分组 vs shots 总数: 133 + 130 = 263 vs 全体 263
- CONSERVED ✔ zoomFrames vs shots[].zoomCrops（两处独立取数）: 336 = 336 vs 全体 336

## G. 真实模式（在盘载体 + 本次复跑的当前结论）

- 在盘载体 `reports/audit/real-e2e/GATES.json`（schemaVersion=gates-2 capturedAt=2026-09-26T05:08:52.571Z gitSha=1598715f）：
  - G7_RESULT=PASS / G8_RESULT=PASS（环 10/10）/ G9_RESULT=PASS（ok=455/455）(源: reports/audit/real-e2e/GATES.json → G7_RESULT / G8_RESULT / G9_RESULT)
  - 前置件：scripts/qa/verify-backend-restarted.mjs → PASS（JVM pid 29536 起于 2026-09-26 03:12:29）(源: reports/audit/real-e2e/GATES.json → precondition.jvmPid)
  - G9 对照表四格（载体值）：{"在盘且200":455,"在盘但失败":0,"不在盘但200":0,"不在盘且失败":0} (源: reports/audit/real-e2e/GATES.json → detail.G9.controlTable)
  - 载体记的本轮新增库内主键：posts=260 comments=1228(源: reports/audit/real-e2e/GATES.json → newDbKeysThisRound)
  - undefined：**undefined** —— undefined
  > 载体是 **capturedAt 时刻**的（早于本轮重建与后端重启）；下栏是本工具此刻复跑得到的**当前**结论。两者不一致即"证据已过期"，两条都印、不取齐、不覆盖。

### 本次复跑（退出码即数据；非零不删报告，只记进失败清单）

| 件 | 命令行 | 退出码 | 关键计数（逐字取自其 stdout） |
|---|---|---|---|
| G7 产物自证 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe apps/client/scripts/build-real-isolated.mjs --check-only` | 0 | G7_RESULT=PASS；[g7] 产物自证 MODE=real VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8080/api；[g7] outDir=D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-real sharedOutUntouched=yes ｜**必须 node22**：v16 上它自报假 FAIL（实测） |
| G8 十环 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs` | 0 | G8_RESULT=PASS G8_RINGS_OK=10/10（解析到环 10 条）G8_ARTIFACTS=posts.id=261 ; comments.id=1229 ; campus_topics.id=290 ; campus_replies.id=22  ← 本轮写入的真实数据，未删除，交你决定去留 |
| G9 素材探针 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs` | 0 | G9_RESULT=PASS EXTRACTED=455 PROBED=455 OK=455 SKIPPED=0 FAIL=0；G9_CONTROL 在盘且200=455 在盘但失败=0 不在盘但200=0 不在盘且失败=0 |
| probe-real-env | `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/probe-real-env.mjs` | 0 | PROBE_BACKEND=UP 可达=8/8 在盘=1440 VERDICT=READY |
- CONSERVED ✔ G9 ok+skipped+fail vs PROBED: 455 + 0 + 0 = 455 vs 全体 455
- CONSERVED ✔ G9 对照表四格 vs PROBED: 455 + 0 + 0 + 0 = 455 vs 全体 455 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g9-probe.cjs → G9_CONTROL=)
- CONSERVED ✔ G8 OK 环 + MISS 环 vs 环总数: 10 + 0 = 10 vs 全体 10

## H. 台账与门禁（本次复跑 vs 轮初基线）

- 基线只作叙事：`.zcode/tmp/round6-LEDGER.md` §1（**下面引用的每一个计数都来自本次复跑的门，没有一个数抄这张表**）(源: .zcode/tmp/round6-LEDGER.md → §1 表)

| 门禁 | 本次退出码 | 本次关键计数（逐字取自其 stdout） | 轮初基线（台账 §1 原文行） |
|---|---|---|---|
| `verify-ledger` | **0** | SOURCES=3 DISTINCT_IDS=433 MATRIX_IDS=1700 ORPHAN_TRUE=0 MULTI_ID_FAMILIES=29 → LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法 | 退出码 `1`：`/ verify-ledger（round-2） / 1 / 34 源 · 750 distinct · 367 在册 · **383 未入账** · 94 多 ID 族 /` |
| `verify-state-truth` | **0** | CASE_SPREAD=0 FAIL_SPREAD=0 → STATE_RESULT=PASS（全局极差比的是 2 列同范围源；检查点按 subset-window 已做逐套包含核对） | 退出码 `1`：`/ verify-state-truth（round-2） / 1 / 四源 1107/941/922/940 → 用例极差 185；FAILED 289/282/288 → 极差 7；`checkpoint.failures[]` 恒空 /` |
| `verify-evidence-integrity（权威索引=本轮全部 corpus）` | **0** | SHOTS=443 MATCHED=443 MISSING=0 HASH_MISMATCH=0 ORPHANS=0 DUP_STATE=0 SNA改判=84 盘上仅算非证据=6；exec: 1281 条 WITH_ERROR=175 伪造引用=0 → EVIDENCE_RESULT=PASS | 退出码 `1`：`/ verify-evidence-integrity（round-2 manifest） / 1 / `MATCHED=254 MISSING=0 HASH_MISMATCH=0 ORPHANS=0 DUP_STATE_GROUPS=3` /` |
| `verify-evidence-corpus（全域）` | **1** | MANIFESTS=19 SCANNED=19 EXPIRED_GITSHA=19 PROBLEMS=9 → CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA） | 退出码 `1`：`/ verify-evidence-corpus / 1 / 5/5 份 manifest gitSha ≠ HEAD；round-1 的 305+305 帧无 contentHash /` |
| `verify-provenance-all（全域）` | **1** | FRAMES_CONSISTENT=2112 PRE_STAMP=0 STALE=0 UNDATED=171 PRODUCERS=14 LITERAL_SHA=2 → PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论） | 退出码 `1`：`/ verify-provenance-all（本轮新建） / 1 / 帧侧 0 伪造 / 0 过期戳记（1118 张时间轴相符）；生产者侧 3 处字面量 SHA /` |
| `verify-evidence-corpus（本轮 scope）` | **0** | MANIFESTS=6 SCANNED=6 PROBLEMS=0 → CORPUS_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-provenance-all（本轮 scope）` | **0** | FRAMES_CONSISTENT=899 UNDATED=0 → PROVENANCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-6-real-tour，信息轴）` | **0** | SHOTS=18 DUP_STATE=0 SNA改判=0 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-6-tour，信息轴）` | **1** | SHOTS=263 DUP_STATE=6 SNA改判=37 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-6-tour-chat，信息轴）` | **0** | SHOTS=6 DUP_STATE=0 SNA改判=2 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-6-tour-dupfix，信息轴）` | **0** | SHOTS=27 DUP_STATE=0 SNA改判=6 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=PASS | 台账 §1 无此行（不猜） |
| `verify-evidence-integrity（原始 corpus：round-6-tour-reshoot，信息轴）` | **1** | SHOTS=142 DUP_STATE=7 SNA改判=26 MISSING=0 ORPHANS=0 → EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS） | 台账 §1 无此行（不猜） |
| `verify-queue-reconcile` | **0** | GAP=0 NEVER_RAN=0套/0例 ERR_TAINTED=145 → QUEUE_RESULT=PASS | 退出码 `1`：`/ verify-queue-reconcile（round-2, --allow-unlabeled） / 1 / 计划 1107/24 套 · 记录 941/21 套 · 缺口 166 · 从未开跑 3 套 116 例 · 重复 id 组 30 · 错误污染 373 例 /` |
| `verify-backend-restarted` | **0** | JVM pid=29536 startedAt=2026-09-26 03:12:29 STALE_SOURCE=none  HEAD_NEWER_THAN_JVM=no  APPS_API_CLEAN_VS_HEAD=yes → PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提 | 退出码 `0`：`/ verify-backend-restarted / 0 / JVM pid 11800 起于 11:37:11，晚于全部 java 源码与 HEAD /` |
| `probe-real-env` | **0** | BACKEND=UP REACHABLE=8/8 → READY | 退出码 `0`：`/ probe-real-env / 0 / `PROBE_BACKEND=UP`、素材 8/8 可达、`PROBE_VERDICT=READY` /` |
| `verify-i18n-orphan` | **0** | ZH=4157 EN=4157 PAIR_DIFF=0+0 ORPHANS=1257/允许1257 → I18N_RESULT=PASS | 台账 §1 无此行（不猜） |
- **本次仍判红：0 / 8** —— 全绿
- 轮初基线里退出码=1 的行数（从台账 §1 原文**数出来**的，不是记忆）：**8** (源: .zcode/tmp/round6-LEDGER.md → §1 退出码列)
- 口径注：门禁面板里的 corpus/provenance 是**本轮 scope** 版（reports/audit/round-6,reports/screenshots/round-6-interact,reports/screenshots/round-6-real-tour,reports/screenshots/round-6-tour,reports/screenshots/round-6-tour-chat,reports/screenshots/round-6-tour-dupfix,reports/screenshots/round-6-tour-reshoot）；全域版同表打印但只作历史口径（与轮初基线可比的是全域版，能否决本轮收尾的是 scope 版）。integrity 分两类：**权威索引轴**（`reports/audit/round-6/screenshot-manifest.json`，由 scripts/qa/rebuild-frozen-manifest.mjs 从各 corpus 派生）进取决集，逐 corpus 的**原始记录轴**只打印数字、不进取决集（同字节帧已被权威索引改判进 stateNotApplied[]，原始 corpus 是采集时刻的原始记录、不改写也不删；它们的组数逐条进"一条不藏"那一节）；`--exec` 分支的否决权本轮收窄为「只否决伪造」=证据里写了图片路径、既无 ERROR/timeout 注记、盘上又不存在，自报失败的注记条目不再计红（tier 交不齐由 readjudicate-evidence/verify-queue-reconcile 记账），这条改动有配对自检 scripts/qa/test-evidence-fabrication.cjs（含反向对照）；ledger/state-truth 限定 `reports/audit/round-6`；i18n 的孤儿走棘轮（配对差异一律判红，基线与理由见 scripts/qa/verify-i18n-orphan.mjs 顶部与台账 §74）。

## I. 本轮新立 / 新证缺陷（全部从门与判据的输出派生，不手写）

- G8 本次 10 环全 OK（本节未从 G8 派生出新缺陷）(源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/g8-e2e.cjs → G8_RINGS_OK=)
- **[D-LEDGER]** LEDGER_MULTI_ID_FAMILIES=29（同一缺陷多 ID 的族数，>0 就说明台账没收敛） (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-ledger.mjs reports/audit/round-6 → LEDGER_MULTI_ID_FAMILIES=)
- **[D-HARNESS] 执行器自身缺陷类**（与被测物无关，不得记产品失败）：harness-api=19 / timeout=20 / token-lost=79 → 合计 118 行 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/triage-exec-failures.mjs --results reports/audit/round-6/interact/exec-results.json --out .zcode/tmp/report-emitter/triage-r6-at-report → harness-api=)

## I-bis. 修复波逐项判据（静态侧终态，逐条来自 verdicts 件而非台账自述）

- 来源：`.zcode/tmp/fixverify/verdicts.json`（sha8=`7861fbfd`，items=116）；桶合计 116 ✔ 守恒
- 台账状态侧：本轮判据覆盖的条目里，仍写「待修复」**61** 条、已推「已修复待复验」**30** 条。
- 判据侧五桶：
  - **ARTIFACT_VERIFIED = 14**
  - **SOURCE_ONLY = 1**
  - **NEEDS_UI_FRAME = 64**
  - **NOT_IN_EITHER = 0**
  - **UNDECIDABLE = 37**
- 桶语义（写死在这里，避免下一轮重新解释）：
  - `ARTIFACT_VERIFIED`＝修后状态在**被测产物**里命中，且该判点在修复前的 HEAD 里不存在（工具的 `grantingPredatesFix` 对照通过）；
  - `SOURCE_ONLY`＝只在源码树命中，产物是构建早于改动的旧件；**这条分支本轮起也过 HEAD 对照**，
    因为旧实现只对授绿路径做对照，会把 HEAD 里本来就有的老代码判成「本轮改的」（实测拦下 2 条假推进，见台账 §47）；
  - `NEEDS_UI_FRAME`＝静态两载体都判不了行为/观感，必须等定向重截帧；
  - `NOT_IN_EITHER`＝两载体都查不到预期修后状态（疑似未落地，逐条附检索串）；
  - `UNDECIDABLE`＝台账判据本身含糊（抠不出可比对物件、或只抠到会被构建改名的裸标识符）。
- `NOT_IN_EITHER` 逐条点名（0 条，一条都不并拢）：
- 状态与判据相互打脸的条数：**5**（台账仍写待修复、判据却已在载体命中且非 HEAD 既存）。这些行必须当场改状态或在报告里说明为何不改，不允许两种口径同时留在台账里。
- 反向不一致：**0** 条台账已推「已修复待复验」而判据台仍判 `NOT_IN_EITHER`：

## J. 缺口 / 未判定 / 挂起（上面所有『判不了』归拢，一条不藏）

- 覆盖缺口：0 套 / 0 例从未开跑，GAP=0 (源: D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/verify-queue-reconcile.mjs reports/audit/round-6 → QUEUE_NEVER_RAN_CASES=)
- 半途套件：0 个 `status=running`（其已记行数见 C 节套件表）(源: tmp/qa/checkpoints/exec-R6.json → suites[].status)
- 3 行跨边界被就地改写 —— 同一用例在两个被测物上各记一次，后写覆盖前写，A 侧该项已非冻结构建产物
- 79 条定位失败无法复核（token-lost） —— 取证字段缺失，属执行器取证缺陷，不得记产品失败
- 187 条前置身份/状态自报不符（MISMATCH!） —— 前置没到位，其结论不能当被测物证据
- 13 个状态帧未真正应用状态（aliasLabel=false） —— 该状态没有独立像素证据，只有默认帧
- 11 条 routeDrift（落点非目标页） —— 巡检自报落点在别的页，那些帧不能证明目标页
- 真实模式：undefined —— undefined
- verify-evidence-integrity（原始 corpus：round-6-tour，信息轴） —— 同页同身份却同字节的帧仍在原始记录里：6 组 —— 信息轴不否决；这 6 组已由权威索引 stateNotApplied[] 承接（retroactive 改判），产品侧「该状态是否真的不改变画面」仍是待复验项，下一轮需要元素级交互断言而不是像素比对
- verify-evidence-integrity（原始 corpus：round-6-tour-reshoot，信息轴） —— 同页同身份却同字节的帧仍在原始记录里：7 组 —— 信息轴不否决；这 7 组已由权威索引 stateNotApplied[] 承接（retroactive 改判），产品侧「该状态是否真的不改变画面」仍是待复验项，下一轮需要元素级交互断言而不是像素比对
- 门禁 verify-evidence-corpus（全域） —— 本次退出码 1 —— 历史口径红（round-1/2 无 gitSha 或无日期戳），不否决本轮，但那些证据不可复用
- 门禁 verify-provenance-all（全域） —— 本次退出码 1 —— 历史口径红（round-1/2 无 gitSha 或无日期戳），不否决本轮，但那些证据不可复用

## 附 1：守恒核对全表（报告里每一条桶分解）

| 分解 | 各项 | 合计 | 全体 | 结论 |
|---|---|---|---|---|
| 计划 − 记录 vs GAP | 1107 + 0 | 1107 | 1107 | CONSERVED ✔ |
| status 分布 vs 检查点 suites | 29 | 29 | 29 | CONSERVED ✔ |
| 已认领 + 从未开跑 vs 计划套件 | 24 + 0 | 24 | 24 | CONSERVED ✔ |
| A 侧 + B 侧 vs 在盘行数 | 556 + 551 | 1107 | 1107 | CONSERVED ✔ |
| A 侧三态 vs A 侧行数 | 291 + 157 + 108 + 0 | 556 | 556 | CONSERVED ✔ |
| B 侧三态 vs B 侧行数 | 299 + 220 + 32 + 0 | 551 | 551 | CONSERVED ✔ |
| 快照中已从在盘消失的行（应为 0） | 0 | 0 | 0 | CONSERVED ✔ |
| 套件表行数合计 vs 在盘行数 | 1107 | 1107 | 1107 | CONSERVED ✔ |
| 套件表状态格合计 vs 在盘行数 | 1107 | 1107 | 1107 | CONSERVED ✔ |
| 分诊桶合计 vs 行数 | 590 + 140 + 115 + 79 + 144 + 19 + 20 | 1107 | 1107 | CONSERVED ✔ |
| 四格合计 vs 有查找目标的定位失败 | 151 + 74 + 31 + 3 | 259 | 259 | CONSERVED ✔ |
| 在目标页三态（是/否/判不了）vs 分诊条目 | 452 + 65 + 0 | 517 | 517 | CONSERVED ✔ |
| 五类合计 vs 改判台行数 | 565 + 33 + 112 + 275 + 122 | 1107 | 1107 | CONSERVED ✔ |
| 有图 / 断链 / 无 .png 引用 vs EXECUTED 行数 | 331 + 0 + 259 | 590 | 590 | CONSERVED ✔ |
| aliasLabel 拆项 vs stateNotApplied | 24 + 13 + 0 | 37 | 37 | CONSERVED ✔ |
| stateNotApplied + 其它 failure vs failures 总数 | 37 + 9 | 46 | 46 | CONSERVED ✔ |
| identity 分组 vs shots 总数 | 133 + 130 | 263 | 263 | CONSERVED ✔ |
| zoomFrames vs shots[].zoomCrops（两处独立取数） | 336 | 336 | 336 | CONSERVED ✔ |
| G9 ok+skipped+fail vs PROBED | 455 + 0 + 0 | 455 | 455 | CONSERVED ✔ |
| G9 对照表四格 vs PROBED | 455 + 0 + 0 + 0 | 455 | 455 | CONSERVED ✔ |
| G8 OK 环 + MISS 环 vs 环总数 | 10 + 0 | 10 | 10 | CONSERVED ✔ |
- 合计 21 条分解，判红 0 条

## 附 2：本工具自判失败清单（任一条即非零退出；报告照写，但不得当作验收通过）

- （空）

> 本文件由 `scripts/qa/emit-round-report.mjs` 生成于 2026-09-26T05:09:41.450Z；机器可读同一份数据在 `reports/audit/round-6/round-6-metrics.json`。
