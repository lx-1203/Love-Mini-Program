# V32-MERGE-LOG —— `V32-D-RULES-DRAFT.md` → `miniprogram-qa-loop-v32.dwf.ts` 合并过程记录

- 执行时间：2026-09-25
- 唯一写入目标：`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`（1803 行 → 2799 行；原行改写 9 行，其余全为新增）
- 输入稿：`.zcode/research/V32-D-RULES-DRAFT.md`（1868 行）
- 合并前快照：`.zcode/tmp/v32.pre-drules.bak.ts`（md5 `6d12cd4296bdb67faac1237e8f449053`，与合并前目标文件逐字节相同）
- 逐节前快照：`.zcode/tmp/v32-snaps/{before-00,before-D1,before-D4,before-D8,before-D13,before-D17,before-NUMS}.ts`
- 插入器（锚点非唯一即拒写并以退出码 3 报错）：`.zcode/tmp/apply-clause.cjs`
- 载荷抽取器（从稿子按「节 + 条款号」机械取 ```ts 代码块原文，杜绝手抄漂移）：`.zcode/tmp/extract-clause.cjs` → `.zcode/tmp/clauses/D<n>-<k>.txt`（共 62 块）
- 未触碰：`apps/client`、`apps/api`、`apps/admin`、`.zcode/workflows/*v31*`、`.zcode/workflow-drafts/**`；未构建、未启动开发者工具、未写数据库、未 git commit/push

本文件里的行号都是 **合并全部完成之后** 用 `grep -n` 现测的，不是过程日志里的历史值。

## 0. 判据与验证节奏

工具：`node .zcode/tmp/dryrun-v32.cjs --case all`（node = `/d/codex-tools/node-v22.17.0-win-x64/node.exe` v22.17.0）
判据：`transpile diagnostics: 0` + 8 个 VERDICT 全 PASS + `SUMMARY: assertion failures = 0`。

| 批次 | 内容 | 结果 | 日志 |
|---|---|---|---|
| 基线 | 合并前 | transpile 0 / 8 PASS / failures 0 | —— |
| 1 | §0 + D1 + D3 | transpile 0 / 8 PASS / failures 0 | `.zcode/tmp/dryrun-batch1.log` |
| 2 | D4 + D5 + D7 | transpile 0 / 8 PASS / failures 0 | `.zcode/tmp/dryrun-batch2.log` |
| 3 | D8 + D10 + D12 | **首测 FAIL**：transpile 1（TS1005 @1064）、7 个 VERDICT 转 FAIL → 定位为稿子 D8(4) 少一个逗号，补 1 行后 transpile 0 / 8 PASS | `.zcode/tmp/dryrun-batch3.log` |
| 4 | D13 + D14 + D16 | transpile 0 / 8 PASS / failures 0 | `.zcode/tmp/dryrun-batch4.log` |
| 5 | D17 + 四工具接线 | transpile 0 / 8 PASS / failures 0 | `.zcode/tmp/dryrun-batch5.log` |
| 6 | 数字偏差 8 条 | transpile 0 / 8 PASS / failures 0 | `.zcode/tmp/dryrun-batch6.log` |
| 7 | 补 STATE_TRUTH_RULES 接线 | transpile 0 / 8 PASS / failures 0 | `.zcode/tmp/dryrun-batch7.log` |
| 终 | + CHANGELOG [C-18]~[C-21] | transpile 0 / 8 PASS / failures 0 | `.zcode/tmp/dryrun-final.log` |

批次 3 是唯一一次「语法不通」状态，且未跨越验证点：按预案只撤销该缺陷（补 1 个逗号），没有整文件回滚。
之后把同类缺陷改成 **插入前扫**：对 62 个载荷块统一检测「字符串数组相邻行少逗号」，命中 2 处（D8-4、D14-2），D14 那处在插入前即补好，故 D14 一次通过。

## 1. 锚点唯一性与实际落点（逐节）

合并开工前先把稿子 §15.1 的 31 个定位串批量 `grep -cF` 复核：**31/31 全部 = 1**，无一失配、无一需要另找锚。
每节开工前再对该节用到的锚点单独复核一次（下表「命中」列 = 最后一次复核值），锚点行一律原样保留，只做前插/后插/整行替换。

| 节 | 条款 | 锚点定位串（截断） | 命中 | 动作 | 落点（行号） |
|---|---|---|---|---|---|
| §0 | 0.1–0.6 全局约定 | `// ===== 数据结构 =====` | 1 | 前插 22 行注释块 | 110 |
| D1 | (1) PROVENANCE_RULES | `// ===== 真实模式端到端验收协议` | 1 | 前插 | 993 |
| D1 | (2) provenanceGate | 同上 | 1 | 前插（接在 (1) 后） | 1000 |
| D1 | (3) provenance 提示词 | `【证据清单（必须）】完成后写` | 1 | 后插 | 1488（接线 `PROVENANCE_RULES,` 1489） |
| D1 | (4) 调用点 | `const [tour, opsFiles] = await Promise.all(` | 1 | 后插 | 1508 |
| D3 | (1) EVIDENCE_DISK_RULES | `// ===== 真实模式端到端验收协议` | 1 | 前插（D1 块之后） | 1031 |
| D3 | (2) `shotRoot: string;` | `manifestFile: string;`（偏差 B） | 1 | 后插 | 208 |
| D3 | (3) 落盘根目录提示词 | `第 ${label} 轮截图巡检（单会话、Suite 化）` | 1 | 后插 | 1473（接线 1474） |
| D3 | (4) evidenceDiskGate | 同 (1) 锚点 | 1 | 前插 | 1040 |
| D3 | (5) 调用点 | `for (const f of tour.failures) captureFailures.push` | 1 | 后插 | 1519 |
| D4 | (1) STATE_QUOTA_RULES | `// ===== 证据预算协议（减少截图与解析成本）=====` | 1 | 前插 | 1069 |
| D4 | (2) stateQuotaGate | 同上 | 1 | 前插 | 1077 |
| D4 | (3) 配额内容学提示词 | `普通页≥1 张首屏；滚动页≥3 张` | 1 | 后插 | 1481（接线 1482） |
| D4 | (4) 调用点 | `第 ${label} 轮巡检完成：${tour.shots.length} 张截图覆盖` | 1 | 前插 | 1527 |
| D5 | (1) EVIDENCE_STATE_RULES | `// ===== UI Lock 状态机协议` | 1 | 前插 | 678 |
| D5 | (5) execEvidenceGate | 同上 | 1 | 前插 | 687 |
| D5 | (2) `noEvidence: number;` | `executed: number;`（偏差 B） | 1 | 后插 | 255 |
| D5 | (3) 四等态提示词 | `status=EXECUTED\|FAILED\|SKIPPED` | 1 | 后插 | 1548（接线 `EVIDENCE_STATE_RULES,` 1549） |
| D5 | (4) 第四态入结构化字段 | `【判定分域（v3.2 必做）】` | 1 | 后插 | 1634 |
| D5 | (6) 调用点 | `轮执行完成：` | 1 | 前插 | 1562 |
| D5 | 可选项 OpCheck.verdict 注释 | `/** VERIFIED / FAILED / UNVERIFIED */` | 1 | **整行替换**（补 ` / NO-EVIDENCE`） | 276 |
| D7 | (1) LEDGER_RULES | `// ===== 证据预算协议…=====` | 1 | 前插（D4 块之后） | 1120 |
| D7 | (2) canonical/aliases/statusEvidence | `  status: string;` | 1 | 后插 | 332 / 334 / 336 |
| D7 | (3) ledgerAudit | `function findIssue(id: string): Issue \| undefined {` | 1 | 前插 | 482 |
| D7 | (4) ledgerCoverageGate | 同上 | 1 | 前插 | 511 |
| D7 | (5) 台账口径提示词 | `写出：audit-report.md（含每页使用对比与功能目标汇总）` | 1 | 前插 | 1920（接线 `LEDGER_RULES,` 1919） |
| D7 | (6) 调用点 | `const counts = { P0: cnt(allIssues` | 1 | 前插 | 2475 |
| D8 | (1) TRIAGE_RULES | `// ===== 证据预算协议…=====` | 1 | 前插（D7 块之后） | 1128 |
| D8 | (4) bounceTriageGate | 同上 | 1 | 前插 | 1138 |
| D8 | (2) `triageCode?: string;` | `  sources: string[];` | 1 | 后插 | 324 |
| D8 | (3) 落点分诊规则 | `【编号】Issue id 格式` | 1 | 后插（进 RULES_AUDIT） | 1375 |
| D8 | (5) 调用点 | `if (!uiRes.tour` | 1 | 前插 | 1971 |
| D8 | (6) 「缺截图即记 P1」 | `把「缺截图」本身作为 P1 MiniProgram 问题记录` | 1 | **整行替换**（未采用备选的后置元素方案） | 1663（接线 `TRIAGE_RULES,` 1670） |
| D10 | (1) STATE_TRUTH_RULES | `// ===== 三级重置协议…=====` | 1 | 前插 | 883 |
| D10 | (4) stateTruthGate | 同上 | 1 | 前插 | 893 |
| D10 | (2) 单一真值源提示词 | `Suite 开始前读检查点 tmp/qa/checkpoints/exec-` | 1 | 后插 | 1544（接线 `STATE_TRUTH_RULES,` 1550） |
| D10 | (3) `lastRecordedAt: string;` | `failures: ExecFailure[];`（偏差 B） | 1 | 后插 | 259 |
| D10 | (5) 调用点 | `return { tour, exec, opsFiles };` | 1 | 前插 | 1572 |
| D12 | (1) IDENTITY_RULES | `// ===== UI Lock 状态机协议` | 1 | 前插（D5 块之后） | 738 |
| D12 | (2) HARDCODED_CRED_FILES + 两门禁 | 同上 | 1 | 前插 | 746 / 749 / 783 |
| D12 | (3) 身份可行性提示词 | `EVIDENCE_DISK_RULES,`（与 D1(3) 同邻域，先 D1 后 D12） | 1 | 后插 | 1475（接线 `IDENTITY_RULES,` 1476） |
| D12 | (4) 身份注入自证 | `EVIDENCE_STATE_RULES,`（与 D5(3) 同邻域，先 D5 后 D12） | 1 | 后插 | 1551 |
| D12 | (5) 凭证时效调用点 | `phase("第 1 轮：全量基线审查");` | 1 | 前插 | 2070 |
| D12 | (6) 身份对账调用点 | `return { tour, exec, opsFiles };`（D10(5) 之后） | 1 | 前插 | 1580 |
| D13 | (1) CAPTURE_CAPABILITY_RULES | `// ===== 证据预算协议…=====` | 1 | 前插（D8 块之后） | 1188 |
| D13 | (2) captureCapabilityGate | 同上 | 1 | 前插 | 1197 |
| D13 | (3) 置信封顶提示词 | `【产出】issues 与 observations（逐页至少一条观察证据` | 1 | 后插 | 1673（接线 `CAPTURE_CAPABILITY_RULES,` 1671） |
| D13 | (4) 调用点 | `const exec = uiRes.exec;` | 1 | 前插 | 1984 |
| D14 | (1) PERMISSION_RULES | `// ===== 证据预算协议…=====` | 1 | 前插（D13 块之后） | 1250 |
| D14 | (2) permissionConfirmGate | 同上 | 1 | 前插 | 1259 |
| D14 | (3) 权限抑制清单提示词 | `IDENTITY_RULES,`（D1→D12→D14 顺序） | 1 | 后插 | 1477（接线 `PERMISSION_RULES,` 1478） |
| D14 | (4) 权限背书规则 | `【落点分诊（先于立 P1）】`（D8(3) 之后） | 1 | 后插（进 RULES_AUDIT） | 1376 |
| D14 | (5) 调用点 | `const exec = uiRes.exec;`（D13(4) 之后） | 1 | 前插 | 1992 |
| D16 | (1) FRESH_PATHS / worktreeNotes / WORKTREE_RULES | `// ===== UI Lock 状态机协议` | 1 | 前插（D12 块之后） | 813 / 822 / 825 |
| D16 | (2) artifactFreshGate | 同上 | 1 | 前插 | 834 |
| D16 | (3) 生效条件提示词 | `完整证据文件：${findingFiles.join` | 1 | 后插 | 1816（接线 `WORKTREE_RULES,` 1817） |
| D16 | (4) 调用点 A | `let gate = await buildGate();` | 1 | 前插 | 1942 |
| D16 | (5) 调用点 B | `...(openIssues.length > 50 ?` | 1 | 后插 | 2598 |
| D17 | (1) CHANNEL_RULES | `// ===== 三级重置协议…=====` | 1 | 前插（D10 块之后） | 933 |
| D17 | (2) channelHealthGate | 同上 | 1 | 前插 | 942 |
| D17 | (3) 通道健康提示词 | `【单一真值源（v3.2 必做）】`（D10(2) 之后） | 1 | 后插 | 1545（接线 `CHANNEL_RULES,` 1546） |
| D17 | (4) 调用点 | `return { tour, exec, opsFiles };`（D10→D12→D17 顺序） | 1 | 前插 | 1589 |

结论：**§0 + 12 节全部合并，0 节跳过**；稿子规定的同锚点落地顺序（D1→D12→D14、D4→D7→D8→D13→D14、D5→D12→D16、D10→D17、D10(5)→D12(6)→D17(4)）全部照做。

## 2. 合并期对稿子做的三类改动（都有实测理由）

**A. 修掉稿子自身的语法缺陷 2 处**（同一形态：字符串数组相邻两行少一个逗号 → 相邻字符串字面量 → TS1005 / `Illegal break statement`）
1. D8(4) `bounceTriageGate` 内 `"else if(c!=='GENUINE_APP_DEFECT'…仍占 '+sev)}}"` 缺尾逗号 —— 批次 3 实测抓到（transpile 0→1、7 个 VERDICT 转 FAIL），补逗号后恢复 0 / 8 PASS。
2. D14(2) `permissionConfirmGate` 内 `"if(!ok){badIssues++;…}"` 缺尾逗号 —— 批次 3 失败后统一扫 62 个载荷块找出同形态（恰好这 2 处），在插入前补好，D14 一次通过。

**B. 结构字段落位偏差 3 处**：D3(2)/D5(2)/D10(3) 稿子给的锚点是「字段的文档注释行」，照字面插会把 `/** … */` 与它的字段拆成两段。改为插在 **字段行之后**（`manifestFile: string;` / `executed: number;` / `failures: ExecFailure[];`，各自 `grep -cF` = 1）；稿子正文本身写的就是「紧随该字段之后」，语义一致，锚点唯一性判据不变。

**C. 规则常量接线（稿子只给常量、没给引用点）**：12 个 `XXX_RULES` 若不进任何提示词就是无人执行的死规则，与本轮要消灭的「工具在仓库、定义不知道」同一种病。接线位（每处唯一锚点后插一行数组元素）：
巡检席 `PROVENANCE_RULES`(1489) `EVIDENCE_DISK_RULES`(1474) `STATE_QUOTA_RULES`(1482) `IDENTITY_RULES`(1476) `PERMISSION_RULES`(1478)；
执行席 `EVIDENCE_STATE_RULES`(1549) `STATE_TRUTH_RULES`(1550) `CHANNEL_RULES`(1546)；
视觉席 `TRIAGE_RULES`(1670) `CAPTURE_CAPABILITY_RULES`(1671)（接在 `      RULES_AUDIT,` 之后，该锚点全文唯一，命中 1）；
记录员 `LEDGER_RULES`(1919)；修复工程师 `WORKTREE_RULES`(1817)。
接线后复核：12 个常量各自 `grep -cF` = 2（声明 + 引用）。`STATE_TRUTH_RULES` 首轮漏接（计数 = 1 被抓出），批次 7 补上。
另有 1 处重命名：接线用的 `const probe` → `const realProbe`（与既有 `probeRes` 区分，不改语义）。

## 3. 四个既有门禁工具的接线（任务第 6 条）

| 工具 | 合并前引用数 | 合并后 | 接法与落点 |
|---|---|---|---|
| `scripts/verify-evidence-integrity.mjs` | 0 | 4 | `evidenceDiskGate`（1040）`world.run` 直调，按 `EVIDENCE_SHOTS=` / `EVIDENCE_RESULT=` 与退出码记 G6 blocker；调用点 1519（D3 自带） |
| `scripts/verify-queue-reconcile.mjs` | 0 | 3 | 新增 `queueReconcileGate`（1315，解析 QUEUE_PLANNED_CASES/QUEUE_RECORDED_CASES/QUEUE_GAP/QUEUE_NEVER_RAN_SUITES/QUEUE_UNPLANNED_SUITES/QUEUE_DUP_ID_GROUPS）+ `auditRound` 调用点 2002 + INSTRUMENT_RULES 新增「队列对账的机检口径」元素 989 |
| `scripts/probe-real-env.mjs` | 2（只在 REAL_ENV 散文里提过，0 调用） | 5 | 新增 `realProbeGate`（1332）+ G7/G8/G9 阶段开头调用 2373（退出码 2 → 三项一律 BLOCKED、3 → G9 记 BLOCKED-需对照，均不记产品 FAIL）+ 验收员提示词 2421 要求贴三行机器可读行原文 |
| `apps/client/scripts/build-real-isolated.mjs` | 1（只在 [C-10] 注释里） | 4 | 新增 `g7ArtifactCheckGate`（1342，`--check-only` 只复核产物 MODE/VITE_API_MODE 与 mock 共享产物指纹，**不重新构建**）+ 接在 G7 构建之后 2392（FAIL 即把 `realGate` 置 false，G7 不再接受代理自报）+ 验收员提示词 2421 |

D8 语义项（视觉席「缺截图即记 P1」）已按稿子 D8(6) 的替换文本改掉（1663）：只替换 `shots.length > 0 ? … : …` 的 false 分支这一行，三元结构、其余判定标准一字未动。

## 4. 数字偏差清单 8 条（任务第 5 条）

| # | 位置（现行号） | 旧 → 新 | 状态 |
|---|---|---|---|
| 1 | `WORKFLOW.instrument.forbidPlaceholderSelector` 注释（43） | 288/192 → 289/194（67.1%） | 已改 |
| 2 | INSTRUMENT_RULES 禁占位符条（985） | 288/192 → 289/194 | 已改 |
| 3 | 同句「67 条连 label 都没有」 | 67 → 74 条完全无标题（裸 `__CAND__`） | 已改 |
| 4 | 同句单字截断无计数 | 补「另有 25 条 label 被截成单字」，字集 `按/校/机/题/赞` 保留 | 已改 |
| 5 | INSTRUMENT_RULES【队列对账】条（988） | 记录 940 / 差 167 → 记录 941 / 缺口 166 = 村口三套 116 + 次要19 截断 50 | 已改 |
| 6 | CHANGELOG `[C-2]`（2615–2616） | 288/192/67 → 289/194/74 + 25 | 已改 |
| 7 | CHANGELOG `[C-3]`（2621） | 「940、村口三套（116）」→「941、缺口 166 = 116 + 50」 | 已改 |
| 8 | CHANGELOG `[C-12]` media_asset 与门（2665） | 与 REAL_ENV / REAL_E2E_RULES 自相矛盾 → 改「后端存活 ∧ 文件在盘（media_asset 是否参与尚未证实，须带对照）」并写明探测器已接入 | 已改 |

刻意 **不改**：`STATE_TRUTH_RULES`（884）与 `stateTruthGate` 注释（892）里的 922/940/941、282/288/289 —— 那是「三份产物互相分叉」的历史事实描述，不是权威口径（理由已写进 [C-20]）。
稿子 §13 另外三条口径建议：脏路径「按 `git status --porcelain -- apps` 行数现算」已由 `artifactFreshGate` 实现成算法值；MISMATCH 366、242>194 两条属终报引用口径，写进 [C-20]/[C-21]，不进产品代码。

## 5. 未合并项与原因

- **条款级：无。** §0 + 12 条的 62 个载荷块全部落地，没有一条因锚点失配被跳过或降级。
- **稿子 §14-A（必须改产品代码/构建配置）5 项：按任务约束一律未动** —— D16 缺 `ref` 导入并提交进 HEAD、D14 mock 权限抑制粒度、D13 换出图口、D12 双身份/mock fixture、D8 构建开关 + `scripts/r11-param-map.json`。定义侧的「不再误判/不再背书」已全部就位；逐项写进 [C-21] 第 3 项。
- **稿子 §14-B（必须新增外部脚本）7 项：未创建**，含每个脚本该读什么、断言什么，写进 [C-21] 第 1 项。其中 `verify-evidence-integrity.mjs` 的 `hardFail || dupState.length` 与 `--exec` 参与退出码两处属「改既有脚本一行」，同样未做（本文件内 D4/D5 内联门禁已能独立判 FAIL，两处并存不冲突），记在 [C-21] 第 2 项。
- **D3(6) 的第二道硬门禁**（交互侧证据==盘）需要先给 `ExecResult` 加 `manifestFile` 并要求执行员产出 manifest，稿子明确「属接口改动，不纳入本条」→ 未做，记在 [C-21] 第 6 项。
- **D7(6) 只校 round-2 单轮目录**：稿子原文写死 `"reports/audit/round-2"`，本轮按「以稿子为准」照插，未自行改成逐轮循环；限制与后果记在 [C-21] 第 5 项。
- **D17 的真重连**：DSL 只能抓「reconnects 是写死的 0」，重连本身必须在执行器脚本里做，记在 [C-21] 第 4 项。
- 稿子 §15.1 表外、稿子未给锚点的两项（`[C-18]`~`[C-21]` CHANGELOG、四工具接线）属任务书要求，见第 2/3 节。

## 6. 最终一次 `dryrun --case all` 输出摘要（`.zcode/tmp/dryrun-final.log`）

```
=== 1. STATIC PARSE ===
file: D:/6/恋爱小程序/.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts
transpile diagnostics: 0
=== 2. UNRESOLVED / REDECL SYMBOLS (semantic codes 2304/2451/2448/2300) ===
total semantic diags: 172
NOT host family -> real problems: 1
  [2451] line 1421: Cannot redeclare block-scoped variable 'history'.
  repaired transpile diagnostics: 0
（各案 RESULT: resolved … agent.ask=18/19/44、world.run=11/27；D2 案仍是预期的 RUNTIME CRASH）
VERDICT A: PASS
VERDICT A2: PASS
  ASSERT realGates == 3 条: PASS
VERDICT B: PASS
  ASSERT realGates == 3 条: PASS
  ASSERT 三 Gate 全 BLOCKED: PASS
VERDICT C: PASS
  ASSERT realGates == 3 条: PASS
VERDICT C2: PASS
VERDICT D: PASS
  ASSERT realGates == 3 条: PASS
  ASSERT 三 Gate 全 BLOCKED: PASS
VERDICT D3: PASS
VERDICT D2: PASS

SUMMARY: assertion failures = 0
```

判读说明（写给下一个接手的人，避免把工具噪声当缺陷）：
1. `NOT host family -> real problems: 1` 的 `[2451] 'history'` 在 **合并前的基线里就存在**（基线在第 679 行，本轮只是被新增行推到 1421 行）；本轮没有新增任何非宿主未解析符号——合并前后都是 1 条、同一条。
2. 判定汇总里那句「判定基于 REPAIRED 变体，因为 SHIPPED 语法不通」是 `dryrun-v32.cjs:453` 的 **硬编码文案**，无条件打印；同一份日志里的 `transpile diagnostics: 0` 与「原文语法已闭合（transpile 诊断 0），不做任何修补」才是真信号。
3. `溯源门禁通过：R1-tour: {"ui":true,"api":true}`、`PROBE_…=(未输出)` 这类行是 **干跑 stub 不忠实**（stub 对任何 `node` 调用回吐固定 JSON），不是被测物缺陷；真实轮次由工具自己印机器可读行。stub 环境下唯一如实暴露的是 D3 的失败关闭：`G6 证据一致性未过：未返回 shotRoot，孤儿帧扫描会退化成空跑（失败关闭）`——这正是新字段没有默认值时应有的红牌。

## 7. 复核入口

- 锚点唯一性批量复核：把稿子 §15.1 的 31 个定位串喂给 `grep -cF`（本轮实测 31/31 = 1）
- 门禁是否真被调用：
  `grep -cE "await (provenance|evidenceDisk|stateQuota|execEvidence|ledgerCoverage|bounceTriage|stateTruth|credentialFresh|identityFeasibility|captureCapability|permissionConfirm|artifactFresh|channelHealth|queueReconcile|realProbe|g7ArtifactCheck)Gate\(" .zcode/workflows/miniprogram-qa-loop-v32.dwf.ts` → **16**，另有 `const ledgerSelf = ledgerAudit();`（2475）= 17/17 个门禁全部有调用点，无一生造、无一闲置
- 规则常量是否全部接线：逐个 `grep -cF '<CONST_NAME>'` = 2（声明 + 提示词引用）
- 本次改动是否只增不改：`diff .zcode/tmp/v32.pre-drules.bak.ts .zcode/workflows/miniprogram-qa-loop-v32.dwf.ts | grep '^<'` → 9 行，逐行都是有意改写（8 条数字偏差目标行 + D8(6) 替换 + OpCheck 注释），其余全为新增
