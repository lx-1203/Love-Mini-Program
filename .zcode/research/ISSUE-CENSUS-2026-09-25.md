# 问题清单重导出报告（ISSUE CENSUS）— 2026-09-25

> 任务性质：纯磁盘证据研究。**不修改任何仓库文件、不构建、不启动进程**（除本报告外）。
> 原则：所有数字与结论均由本次会话直接读取磁盘文件重新导出，**不复述任何继承来的统计**。
> 本轮 exec 运行终止时刻：见 `.zcode/tmp/exec-stop-snapshot.json` 的 `takenAt` / `updatedAt` 字段（本文件已核对）。

---

## 0. 证据源清点（目录级）

清点方式：逐目录 `ls` / `find <dir> -type f | wc -l`（**未做全树 find**）。以下计数均为本次实测。

### 0.1 `reports/` 四棵子树

| 目录 | 实测条目数 | 说明 |
|---|---|---|
| `reports/audit/` | 22 个轮次子目录 | 递归文件数见下表 |
| `reports/final/` | **0 个文件（空目录）** | 无任何终验产物 |
| `reports/regression/` | **0 个文件（空目录）** | 无任何回归产物 |
| `reports/screenshots/` | 25 个子目录 + 2 个畸形文件 | 见 0.1b |

`reports/audit/*` 递归文件数（按本轮相关性排序）：

| 子目录 | 文件数 | 相关性 |
|---|---|---|
| **`round-2/`** | **85** | **本轮（R2 exec）主产物，含 `interact/exec-results.json`、23 份 `ops/*.json`、`screenshot-manifest.json`、`harvest.json`、22 份 `interact/console-*.log`、2 份 `findings/*.json`** |
| `round-1/` | 442 | 上一轮（R1），含 `audit-report.md` 302 610 B、`issue-matrix.md` 679 626 B、`interaction-matrix.md` 808 834 B、`interact/*-judge.json` 等 |
| `2026-09-22-r13-goal/` | 121 | R13 人工轮，含 `shots/`、`shots-r13e/`（被 mode-dependent 清单反向引用，如 `51-chat-entry2.png`） |
| `round-3/` | 16 | 早期轮次 |
| `r11-acceptance/` | 16 | |
| `2026-09-13-independent/` | 29 | |
| `2026-09-17-r10-visual/` | 3 | |
| `baseline/` | 3 / `final/` 2 / `independent/` 1 / 其余 12 个轮次目录各 1 | 每目录仅 1 份 md |

`reports/screenshots/*` 递归文件数（本轮直接相关的加粗）：

| 目录 | 文件数 | PNG 数（实测） |
|---|---|---|
| **`round-2-tour/`** | **602** | 599（`A/`=317、`B/`=282，另有 `manifest-detail.json` + `boot-verify-A.log` + `boot-verify-B.log`） |
| **`round-2-interact/`** | **756** | 498（扁平命名 `PAGES-XXX-<ID>-after.png` 等；余量为 wxml/txt/json 旁证） |
| `round-1-interact/` | 3316 | 3043（含 `wxml/` 子目录） |
| `round-1-tour/` | 310 | 305（A=152 / B=153）+ `manifest-detail.json` |
| `r11-acceptance/` | 924 | |
| `round-1/` | 144 | 144（A=72 / B=72）+ `manifest.json` |
| `round-1-after/` | 116 | 116（A=114 / B=2 —— **B 身份仅 2 张，双身份覆盖崩塌**） |
| `r10-audit/` 81、`r9-lifecycle/` 69、`r7-final-verify/` 37、`register-verify/` 36、`independent/` 21、`final-verify/` 30、`r10-regress/` 25、`r6-editpage/` 40、`r8-audit/` 29、`round3/` 10、`round4/` 10、`round5/` 10、`r11-ideal/` 15、`r1-round2/` 6、`2026-09-13-r3/` 8、`2026-09-13-r4/` 3、`2026-09-13-r5/` 1、`r6-admin/` 3 | | |
| **畸形文件名** | 2 | `r9-lifecycle$name.png`、`round3$1` —— shell 变量未展开直接落盘（测试台自身缺陷的物证） |

### 0.2 `tmp/`（根）与 `tmp/qa/`

- `tmp/` 根目录共 **1822** 项（含历史脚本与素材）。本轮（R2）时间窗内产出的关键件：
  `tmp/tour-R2.log`(205 682 B, 09-24 18:41)、`tmp/tour-R2.mjs`(93 342 B)、`tmp/r2-gaps.tsv`(5 496 B)、
  `tmp/r2-reshoot.tsv`(723 B)、`tmp/r2-reshoot2.tsv`(127 B)、`tmp/rebuild-R2-manifest.mjs`(7 135 B)、
  `tmp/gen-tour-R2.mjs`(9 077 B)、`tmp/probe-latency-R2.mjs`、`tmp/probe-z4.mjs`、`tmp/probe-z1-retry.mjs`、
  `tmp/r2-ext-1.png`、`tmp/r2-ext-2.png`、`tmp/r1-after-results-A.json`(45 794 B) 等 R1-after 系列 8 份。
- `tmp/*-results*.json` 共 **15** 份（实测清单）：`interact-R1-CHAT-SESSION-SUPPLEMENT`、`interact-R1-PUBLISH`、
  `interact-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX`、`interact-r1-16-{daily,help,likes,love,search,security}`、
  `interact-r1-19`、`r1-after-results{,-A,-B,-probe,-probe2,-probe3}`。
  注：`interact-r1-16-likes-results.json` 只有 **118 B**（近乎空产物）。
- `tmp/*.tsv` 共 **6** 份：`r1-gaps.tsv`、`r1-reshoot.tsv`、`r1-reshoot3.tsv`、`r2-gaps.tsv`、`r2-reshoot.tsv`、`r2-reshoot2.tsv`。
- manifest：`reports/screenshots/round-2-tour/manifest-detail.json`(722 924 B)、`round-1-tour/manifest-detail.json`(78 794 B)、`round-1/manifest.json`(40 391 B)、`reports/audit/round-2/screenshot-manifest.json`(526 427 B)、`reports/audit/round-1/screenshot-manifest.json`(59 448 B)。
- `tmp/qa/` 共 **52** 项。本轮相关的只有 `harvest-test.json`(569 923 B, **09-24 23:59 本地 = 15:59Z，终止前 7 分钟**)、
  `checkpoints/`、`locks/`；其余（`r1-*.log`、`r1-failures.json` 92 021 B、`r1-summary.json`、`r1-rerun-*`、`canary*.png`）全是 09-23 的 R1 产物。

### 0.3 `logs/`

- `logs/goal-*.log` 共 **14** 份，但 **mtime 全部落在 2026-09-22（R13 轮）**，唯一例外 `goal-admin-dev.log`(09-24 23:29) 是后台 admin dev server 的日志、与小程序 exec 无关。
  → **本轮 R2 exec 没有产生任何 `logs/goal-*.log`**。
- `logs/build-mp-*.log` 共 **3** 份：`build-mp-0825.log`(08-25)、`build-mp-mock-final.log`(09-20 01:01)、`build-mp-mock-fix.log`(09-20 00:52)。
  → **本轮 09-24 没有 `build-mp-*.log`**（构建只在 tour 日志里留下一条 provenance，见 §2.4）。
- 其余 `logs/` 内 ~70 份为 08-08～09-20 的 api/devtools/client-build 历史日志。

### 0.4 `.zcode/`

- `.zcode/workflow-runs/`：**15** 份 `dwfrun-*.mjs` 编译产物 + 1 份 `dwfeval-*.mjs`（共 16 文件）。最新一份 `dwfrun-dd96988a-d736-491d-b5ea-fef3ccb3e5d3.mjs`（103 778 B，mtime **09-25 00:03 本地 = 16:03Z**）是本轮 exec 的 runner；其余 14 份 mtime 介于 09-19 21:14 ～ 09-23 21:44。
- `.zcode/workflows/`：`miniprogram-qa-loop-v31.dwf.ts`(82 169 B, 09-21 22:49)、`miniprogram-qa-loop-v32.dwf.ts`(99 767 B, **09-25 00:15**，终止后才写)。
- `.zcode/tmp/`：**215** 项（含 9 个子目录 `v3/ v4/ v4g/ v5/ v5a/ v6/ v6b/ w2home/ __pycache__/`、两份帧语料快照 `backup-round-2-tour-pre-capture/`（实测 **267** 张 PNG）与 `orphan-frames-from-12xx-run/`（实测 **50** 文件）、大量 `_*.{tsv,txt,awk}` 中间件、**8** 份 `visual-audit-V*.md` + `visual-review-R2frames.md`）。终止前/中固化的关键件：
  `exec-stop-snapshot.json`(925 B)、`mode-dependent-issues.json`(77 389 B)、`mode-dependent-issues-final.json`(72 607 B)；
  另有 `.zcode/tmp/e2e-sync-findings.md`（**写库证据的唯一来源**，§2.3）、`build-real.log`/`build-R2-mock.log`/`build-real-evidence.md`（§2.4）、`exec-R2.log`/`exec-failure-triage.md`/`TAKEOVER-HANDOFF.md`/`wave3-decisions-landed.md`/`recurrence-postfix-check.md`/`nav-bounce-triage.md`/`orphan-frames-migration.md`/`real-assets-probe.md`/`backup-private_messages-3894.md`/`fix-queue-wave1.md`(35 182 B)/`fix-queue-wave2.md`(64 331 B)/`ideal-gap-matrix.md`(69 355 B)/`stage-contract.md`(48 953 B)/`issue-register.md`(120 978 B，**09-25 00:41 = 终止后 35 分钟**)。

### 0.5 `报告/`、`deliverables/engineering-assurance`、`docs/`

- `报告/`：**33** 份顶层 md（另含 `1000-AUDIT/`、`汇报/` 两个子目录）+ 1 份畸形 PNG `qa-20260904${name}.png`（变量未展开的第二处物证）。
  与本轮直接相关的是历史总量清单：`CONSOLIDATED-ISSUE-LIST-1000+.md`(338 565 B)、`ISSUES-LIST.md`(83 037 B)、
  `BUG-AUDIT-FULL-REPORT.md`(147 162 B)、`ADMIN-API-REAUDIT-400+.md`(131 087 B)。这些是**旧轮次总量口径**，本轮未更新（mtime ≤ 09-08）。
- `deliverables/engineering-assurance/`：**2** 份 md（`ui-fix-homepage-6issues-2026-09-03.md`、`ui-guardrails-image-tabbar-2026-09-03.md`）+ `assets/`。均 09-03，本轮无新增。
- `docs/`：**仅 1 个子目录 `openapi/`，无任何本轮报告**。

### 0.6 空目录 / 零证据结论

`reports/final/`、`reports/regression/` **两个目录存在但 0 文件**——工作流名义上的"终验/回归"落盘位从未被写入过。

---

## 0bis. Suite / 用例覆盖缺口（计划 vs 已记录，逐 suite 对账）

对账口径：`reports/audit/round-2/ops/*.json` 的 `cases[]` 长度 = **计划**；`interact/exec-results.json` 按 `suite` 计数 = **已记录**。

| 证据 | 内容 |
|---|---|
| `reports/audit/round-2/ops/*.json` | **24** 份 per-suite 计划件，`cases` 数组求和 = **1107** |
| `reports/audit/round-2/code-findings/*.json` | **24** 份（与 ops 一一对应，代码审查席产物） |
| `reports/audit/round-2/interact/console-*.log` | **21** 份（= 实际开跑的 suite 数） |
| `interact/exec-results.json` | **21** 个 suite / **941** 条记录 |
| `.zcode/tmp/exec-R2.log` | 启动行自述 `suites=24(dynamic)` —— **计划 24 套是执行器自己打印的** |
| `.zcode/tmp/e2e-sync-findings.md:4` | 原文亦称「**全 24 套**对 DB 写入 0 条」 |
| `.zcode/tmp/exec-stop-snapshot.json#suites_recorded` | `21`（"已记录"口径，非"计划"口径） |

逐 suite 对账（仅列差异项；其余 20 个 suite **计划数 == 已记录数，完全吻合**）：

| suite | 计划 | 已记录 | 差额 | 判定 |
|---|---|---|---|---|
| `SUBPACKAGES-VILLAGE-VILLAGE-INDEX` | 42 | **0** | −42 | **整套未开跑** |
| `SUBPACKAGES-VILLAGE-VILLAGE-POST` | 40 | **0** | −40 | **整套未开跑** |
| `SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH` | 34 | **0** | −34 | **整套未开跑** |
| `次要19` | 69 | **19** | −50 | **跑到一半被终止**（其 `console-次要19.log` mtime 09-25 00:05，正是终止点） |
| **合计** | **1107** | **941** | **−166** | **15.0% 计划用例从未进入执行账本** |

> 被终止时最后写入的记录：`exec-results.json` 末条 suite 归属 `次要19`（19 条），与快照 `takenAt=00:06:36` 一致。

---

## 1. 终止状态快照（三份 .zcode/tmp 固化文件，逐字段）

### 1.1 `.zcode/tmp/exec-stop-snapshot.json`（925 B，mtime 2026-09-25 00:06 本地 = 16:06Z）

逐字段原文核对结果：

| 字段 | 值 | 备注 |
|---|---|---|
| `takenAt` | `"2026-09-25T00:06:36+0800"` | 即 2026-09-24T16:06:36Z |
| `reason` | `"用户指令：停止工作流"` | 人为终止，非自然跑完 |
| `updatedAt` | `"2026-09-24T16:05:55.307Z"` | 快照早于 exec-results 45 秒 |
| `gitSha` | `"18c91ccf"` | 与 `exec-results.json#gitSha` 一致（工作树未提交态） |
| `cases` | `940` | **与 exec-results.json 的 941 不一致，见 §2.1** |
| `status.EXECUTED` | `523` | 与 exec-results 一致 |
| `status.SKIPPED` | `129` | 与 exec-results 一致 |
| `status.FAILED` | `288` | **exec-results 为 289，见 §2.1** |
| `suites_recorded` | `21` | 数组 `suites` 实际也恰好 21 项，自洽 |

`suites`（21 项，原文照录）：`PAGES-DISCOVER-INDEX`、`PAGES-HOME-INDEX`、`PAGES-LOGIN-INDEX`、`PAGES-MESSAGES-INDEX`、`PAGES-NEARBY-INDEX`、`PAGES-PROFILE-INDEX`、`PAGES-REGISTER-INDEX`、`PAGES-REGISTER-SUCCESS`、`SUBPACKAGES-CAMPUS-CAMPUS-HUB`、`SUBPACKAGES-CAMPUS-CAMPUS-INDEX`、`SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC`、`SUBPACKAGES-CHAT-CHAT-SESSION-INDEX`、`SUBPACKAGES-CIRCLES-CIRCLES-INDEX`、`SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC`、`SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS`、`SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING`、`次要18`、`次要19`、`次要20`、`次要21`、`次要22`。

**关键缺口（磁盘可证）**：`reports/audit/round-2/ops/` 下存在 **23** 份 per-suite 采集文件，其中
`SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json`、`SUBPACKAGES-VILLAGE-VILLAGE-POST.json`、`SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json`
三份有产物，但 **VILLAGE 三 suite 与 `SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX`、`次要24`、`次要26` 均不在 `exec-results.json` 的 21 个 suite 里** → 这些 suite 的用例从未被执行（详见 §2.1、§0.3）。

### 1.2 `.zcode/tmp/mode-dependent-issues.json`（77 389 B，mtime 09-24 13:05 本地）

程序化解析（`json.load` 后逐条计数，非 grep 估算）：

- 条目 **124** 条，`id` 全部唯一（0 重复）。字段集固定为 `line / sec / id / sev / status / cats / desc / shot`。
- severity 分布：`P0=1`、`P1=27`、`P2=40`、`P3=37`、**空串 `""`=19**（即 15% 的条目未定级）。
- status 分布：`待修复=100`、`已修复待终验=19`、`已验证=3`、`保留=2`。
- cats 主题分布（一条可多主题，故和 > 124）：
  `C6-服务端写入/回读真值=33`、`C7-身份/认证视角不可构造=31`、`C2-幂等/并发/防连点穿透=30`、
  `C1-401/token刷新/reLaunch链=22`、`C3-媒体URL真实解析=12`、`C5-服务端分页/追加vs替换=9`、
  `C4-i18n裸键(仅真实/未认证视角可见)=7`。
- 覆盖 `sec` 段落文件 **46** 个（`.json` / `-judge.json` / `-req.json` 三族），条目最多的为 `次要20.json`(12)、`次要22.json`(8)、`PAGES-PROFILE-INDEX.json`(7)、`PAGES-NEARBY-INDEX.json`(6)、`SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json`(6)。
- 每条自带**源行号** `line`，指向对应 findings 文件的具体行（本报告 §3 逐条引用）。

### 1.3 `.zcode/tmp/mode-dependent-issues-final.json`（72 607 B，mtime 09-24 13:05 本地）

- 条目 **116** 条，`id` 全部唯一。severity：`P0=1`、`P1=25`、`P2=39`、`P3=36`、空=15。status：`待修复=95`、`已修复待终验=19`、`保留=2`、**`已验证=0`**。
- **两份文件的精确差异（逐 id 集合比对，0 条字段变更、0 条新增）** — final 只是从 v1 里删掉了 8 条：

| 被删 id | sev | status | 所在 sec / line | 删除语义 |
|---|---|---|---|---|
| `MP-R1-PAGES-MESSAGES-INDEX-011` | P2 | 已验证 | PAGES-MESSAGES-INDEX-judge.json:1658 | 复验通过，出清单 |
| `MP-R1-DND-002` | P1 | 已验证 | 次要24.json:1087 | 视觉终验通过，出清单 |
| `MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-102` | P1 | 已验证 | ...-req.json:1418 | 回归复核通过，出清单 |
| `MP-R1-PAGES-HOME-INDEX-025` | "" | 待修复 | PAGES-HOME-INDEX.json:131 | **数据卫生/噪音类被降级剔除** |
| `MP-R1-VILLAGE-INDEX-106` | P3 | 待修复 | SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json:275 | 同上（mock 自建帖丢失） |
| `MP-R1-VILLAGE-INDEX-113` | "" | 待修复 | 同上:282 | 同上（嵌套 resolveMediaUrl） |
| `MP-R1-POST-110` | "" | 待修复 | SUBPACKAGES-VILLAGE-VILLAGE-POST.json:329 | 同上（嵌套计数 31 处） |
| `MP-R1-MOCKDATA-101` | "" | 待修复 | 次要20.json:559 | 同上（mock 层越权重写 URL） |

> 结论：`-final` 的 116 = 124 − 3（已验证）− 5（噪音/数据卫生类）。**两份文件都是"筛选后清单"，不是"终验后清单"**：final 里仍含 95 条 `待修复`，且 `已验证=0` 说明终验状态字段在 final 中被整体清空而非回填。

---

## 2. 核心数字核定

### 2.1 用例总数与分布（通过/失败/跳过/无法取证）

唯一权威执行账本：`reports/audit/round-2/interact/exec-results.json`（918 013 B，`round="R2"`、`gitSha="18c91ccf"`、`updatedAt="2026-09-24T16:06:40.116Z"`，`results` 数组长度 **941**）。

| 状态 | exec-results.json（941） | exec-stop-snapshot.json（940） |
|---|---|---|
| EXECUTED | 523 | 523 |
| SKIPPED | 129 | 129 |
| FAILED | **289** | 288 |
| 合计 | **941** | 940 |

- **两份终止前固化的状态文件互差 1 条 FAILED / 1 条总数**。时间戳差 45 秒（16:05:55.307Z vs 16:06:40.116Z），可判定为快照早于最后一次落盘一条 FAILED 用例；不存在第三份能仲裁此差异的产物。
- `id` 只有 **911 个唯一值**（941 条记录）—— 跨 suite 存在 **30 组 id 复用**（如 `CH01`…`CH10` 等在多个 suite 中重复），即 **执行器主键不全局唯一**，任何按 id 去重的统计都会低估。
- `tier` 分布：`normal=421`、`critical=302`、`navigation=133`、`noop=85`（合计 941）。
- **本轮实际"跑过并留下断言/像素证据"的只有 523 条**，占 941 的 55.6%。
- **从未执行的部分**：exec-results 只有 21 个 suite；`ops/` 却有 23 份 per-suite 采集件。VILLAGE-INDEX/POST/PUBLISH 三 suite 在 `mode-dependent-issues.json` 里贡献了 10 条问题（含 3 条 P1），但它们的用例**一条都没进过执行账本** → 属"有代码级结论、无执行级证据"。
- **计划总用例数与执行数的差额**：`reports/audit/round-2/harvest.json`（633 822 B，mtime 09-25 00:20，即终止**之后**由 harvest 生成）与 `tmp/qa/harvest-test.json` 用于对账，见 §2.1b。

**「无法取证」这一档在两份状态文件里都不存在**——执行器只有 EXECUTED/SKIPPED/FAILED 三态，无 UNVERIFIED/未取证态。但 judge 层的文字里明确存在该档：`MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-109` 原文记「本页 45 项交互用例 judge 复核仅 2 VERIFIED / 3 FAILED / **40 UNVERIFIED**」，`MP-R1-C26-003` 记「本批 49 条用例中 **43 条不可仲裁（UNVERIFIED）**」→ **"无法取证"只活在 judge 的自然语言里，从未进入可统计的结构化字段**。

**每 suite 失败率**（取自 `tmp/qa/checkpoints/exec-R2.json`，`updatedAt 16:05:00.445Z`，与 exec-results 相差 100 秒故 `failed` 合计 282 而非 289；`reconnects` 全 21 套恒为 **0**）：

| suite | executed | failed | 失败率 | | suite | executed | failed | 失败率 |
|---|---|---|---|---|---|---|---|---|
| `SUBPACKAGES-CHAT-CHAT-SESSION-INDEX` | 34 | **24** | **70.6%** | | `PAGES-LOGIN-INDEX` | 38 | 16 | 42.1% |
| `次要22` | 78 | 36 | 46.2% | | `PAGES-REGISTER-INDEX` | 37 | 13 | 35.1% |
| `次要20` | 101 | 35 | 34.7% | | `PAGES-MESSAGES-INDEX` | 41 | 11 | 26.8% |
| `次要18` | 88 | 30 | 34.1% | | `CAMPUS-CAMPUS-INDEX` | 30 | 10 | 33.3% |
| `次要21` | 102 | 30 | 29.4% | | `CIRCLES-CIRCLES-INDEX` | 25 | 6 | 24.0% |
| `CAMPUS-CAMPUS-POST-TOPIC` | 41 | 18 | 43.9% | | `MATCH-SUCCESS` | 20 | 6 | 30.0% |
| `CIRCLES-CIRCLES-POST-TOPIC` | 40 | 17 | 42.5% | | `PAGES-REGISTER-SUCCESS` | 16 | 4 | 25.0% |
| `MATCHING` | 24 | 5 | 20.8% | | `PAGES-DISCOVER-INDEX` | 45 | 7 | 15.6% |
| `CAMPUS-CAMPUS-HUB` | 27 | 4 | 14.8% | | `PAGES-PROFILE-INDEX` | 45 | 7 | 15.6% |
| `PAGES-HOME-INDEX` | 48 | 3 | **6.3%** | | `PAGES-NEARBY-INDEX` | 42 | **0** | **0%** |
| **合计（20 completed + 1 running）** | **922** | **282** | 30.6% | | `次要19` | *running*（15 ids，无计数） | | |

> `PAGES-NEARBY-INDEX` 0 失败但同页在 `judge` 层被判出 **2 条 P1**（`MP-R1VIS-PAGES-NEARBY-INDEX-001`、`MP-R1-N02-01`）→ **「用例全 EXECUTED」不等于「页面无 P1」**，执行器状态与 judge 结论是两个互不校验的通道。

### 2.2 测试台噪声 vs 产品缺陷（`__CAND__` 占位选择器 / 中文标题正则截断）

对 289 条 FAILED 的 `failureReason` 逐条分类（正则解析，脚本可复算）：

| 分类 | 条数 | 说明 |
|---|---|---|
| **A. `__CAND__` 占位选择器未命中**（纯测试台噪声） | **194** | `element not found: __CAND__` 族；其中 `el.input is not a function` 16 条属执行器 API 能力缺口，同族 |
| ├ A1 完全无标题的裸 `__CAND__` | 74 | 选择器根本没被解析出来 |
| ├ A2 **中文标题被正则截断成 1 个字** | 25 | 实测被截出的单字：`按`(11)`校`(2)`机`(2)`赞``题``试``一``回``态``误``空``填``他` |
| ├ A3 中文标题 2 字（可能为真实短标题，也可能是截断） | 55+ | `发布`(19)`保存``取消``登录``重试``提交``更换``确认``评论``返回``附近``报名``拉黑``创建``跳过``超赞``赞项``基础``兑换``移除``已关注``打招呼``写话题``兴趣圈``搜索钮``赞``题``试` 等 |
| ├ A4 中文标题 ≥4 字（未截断，选择器策略本身不命中） | 17 | `每日签到`(2)`添加照片``取消收藏``完善个人资料``重新认证``取消匹配``重新定位``微信登录``分享喜悦``继续逛逛``说点什么``重新上传``发布成功``添加故事``稍后再说``同一标签``行内头像` |
| ├ A5 `__CAND__` + `el.input is not a function` | 16 | 执行器把 `input` 动作发给不支持的节点 |
| └ A6 裸 `__CAND__`（tap/longpress，无标题） | 55 | `action tap/longpress __CAND__ failed: element not found: __CAND__` |
| **B. 真实选择器未命中**（可能是产品缺陷，也可能是选择器腐化） | 92 | 如 `.retry-btn`(3)、`.id`(2)、`#login-password`(2)、`.sms-send-btn`(2)、`.wechat-input-bar__icon-btn--more`(2)、`.relation-cell`(1) 等 |
| **C. watchdog 超时** | 3 | 含 `.match-loading__skip` tap 超时 2 条 |
| 合计 | 289 | |

**可直接判定的噪声下限：194 / 289 = 67.1% 的 FAILED 是测试台噪声**（选择器未解析出实体就照跑）。
其中**确凿的正则截断证据是 25 条单字标题**（`__CAND__("按")` 这类不可能是真实 UI 文案）。
剩下 95 条（B+C）才需要人工判定，且 B 类里 `.retry-btn`、`#login-password`、`.sms-send-btn` 等**是真实 DOM 选择器未命中**，与 `mode-dependent-issues.json` 中 `MP-R1-PAGES-LOGIN-INDEX-201` 原文「本轮 R1 自动化中该链路 15 例（LG11/LG22/LG23-LG29/LG31）全部 FAILED（element not found: #login-p…）」互相印证 —— 即该 92 条中有一部分是**已知的产品侧缺陷被重复计数**。

**SKIPPED 129 条全部是 `action-not-automatable:` 前缀**（脚本校验：`all(...)==True`）→ **129 条 100% 属执行器能力边界，零产品缺陷**，典型如「500ms 内连点同一张卡的「加入」5 次」「在卡片上向右拖动 >SWIPE_THRESHOLD 后松手」「依次点 4 个学历 chip」「拖动下限滑块到最大」——与 `MP-R1-DISCOVER-HISTORY-203` 原文「根因是 automator 无法合成左右滑（『pre:swipe left unsupported(no element api)』）生成 rejection」一致。

**因此本轮 FAILED 的可信产品缺陷上界只有 95 条（B+C），而 EXECUTED 523 条里还混有 judge 判定的"假通过"**（`MP-R1-PAGES-MESSAGES-INDEX-108` 原文：「MSG01 dom 断言 .not-logged__* 全部 absent 却标 EXECUTED」）。

### 2.3 本轮是否存在任何写库 / 真实后端调用

**结论：要分两层回答，二者证据都在盘上，且与「0 次写库」的既有说法部分冲突。**

**(a) QA exec 套件本身 = 0 次写库，有明确证据链（不是"找不到"，而是"结构性不可能"）**

| 查找位置 | 实测结果 |
|---|---|
| `reports/audit/round-2/interact/exec-results.json` 全 941 条的 `observed`/`route`/`toast`/`console` 字段 | 无一条含 HTTP 写请求记录；`console` 只有 `preloadSubpackages` 一类 info |
| `reports/audit/round-2/screenshot-manifest.json#buildFingerprint` | `buildMode="build:mp-weixin:mock"`、`apiMode="mock"`、`mode="mp-weixin-mock"`、`readFrom=[dist/build/mp-weixin/config/{env,showcase,feature-flags}.js]` |
| `apps/client/dist/build/mp-weixin/config/env.js`（被测物本体，直读） | `MODE:"mp-weixin-mock"`、`VITE_API_MODE:"mock"`；`isMockMode()` 恒 true → 写操作无网络出口 |
| `apps/api/logs/campus-love-api.2026-09-24.0.log`（287 行，覆盖 00:00–23:45:25 全天） | 19:10–00:06（exec 交互阶段）窗口内**没有任何由自动化产生的 POST/PUT**；仅见 `HotScoreScheduler`（15 分钟一次定时任务，updated=183→184）与人工 E2E 探针 |
| `apps/api/logs/campus-love-api-*.log`（4 份统计） | `INSERT` / `UPDATE ` / `DELETE FROM` 计数 **0**；日志级别只到 WARN/ERROR，本身不记 SQL |
| `apps/api/logs/audit.log`（2 558 B） | 运行窗口 19:10–00:06 内 **0 条**；最后两条为 `2026-09-25T00:16:12/00:16:49`（终止**之后**），且 `mediaId=test-avatar, targetUserId=100, isAdmin=false` → 属终止后的单独探针，不属本轮 |
| docker 侧 | `docker/` 与根 `docker-compose.yml` 存在，但**本轮无任何 `docker logs` 落盘产物**（`logs/`、`tmp/`、`.zcode/tmp/` 均无导出件）→ 该路径**无法取证** |
| 数据库行数 | 仓库内无 DB 计数快照文件；间接计数只见于 `.zcode/tmp/e2e-sync-findings.md:16`「`GET /posts?category=all` total 182 → 183」 |

**(b) 同一自然日内确实发生过真实后端写入 —— 但来自独立的 API 层 E2E 核验脚本，不是 exec 套件**

唯一证据文件：**`.zcode/tmp/e2e-sync-findings.md`**（2026-09-24；取证脚本 `e2e-sync-verify.py` / `e2e-sync-verify2.py`，直连 `http://127.0.0.1:8080/api/v1`，「用后即删」→ 脚本本体已不在盘上）。原文第 4 行自证：
> 「本轮是**首次在真实后端上产生写入**：此前 R2 exec 跑的是 mock 产物，全 24 套对 DB 写入 0 条，前后端写链路一直无证据。」

其 12 步闭环（`e2e-sync-findings.md:10-21`）与 API 日志逐条对得上，时间戳吻合到秒：

| 文档步骤 | 结果 | `campus-love-api.2026-09-24.0.log` 对应行 |
|---|---|---|
| 3 `POST /posts` | 200，**post id=230** | 22:30:16.738 `非法参数: 不支持的帖子分类: general`（首次尝试失败）→ 22:36:48 guest+admin 登录后成功 |
| 4 `GET /posts/230` | 200 回读 | 22:36:50.732 与 22:39:11.756 `GET /api/v1/posts/230` |
| 7 feed 计数 | **total 182 → 183** | 22:45:01 `HotScoreScheduler … updated=183`（00:00–22:30 恒为 183，**22:45 起恒为 184**） |
| 11 幂等重放 | **409 IDEMPOTENT_CONFLICT** | 22:36:50.766 `幂等性冲突：重复请求被拦截，method=createPost, key=idempotent:e2e-create-E2E-SYNC-VERIFY-223648:100151`；22:30:17.327 `业务失败（HTTP 400），释放幂等键 …E2E-SYNC-VERIFY-223016` |
| 8 评论写入 | 200，**comment id=1201** | （成功请求不入 WARN 日志，无对应行） |
| F-4 `wx.login` | 502 `WECHAT_API_ERROR` | 19:52:15.428 与 22:43:17.863 两次 `WeChat jscode2session error: errcode=41002, errmsg=appid missing`；22:43 那次 code 为 `e2e-***back` → 探针专用 |

**遗留脏数据（用户裁定保留，但必须进终验清单）**：`posts.id=230`（title=`E2E-SYNC-VERIFY-223648`、visibility=`public_`、作者 100151、auditStatus=approved）与 `comments.id=1201`（1 赞/1 收藏/2 浏览）仍在库（`e2e-sync-findings.md:47-48`）；可逆路径 `POST /admin/forum/village-posts/230/audit {rejected}` **本轮未执行**（:49）。
同族另一例：`MP-R1-PAGES-MESSAGES-INDEX-101`（`mode-dependent-issues.json:1251`）测试残留「全链路验收测试消息2026-09-12」外露于最近聊天预览，`private_messages id=3894, conv 461` → **DB 残留类问题本轮至少 2 例**。

**(c) 「真实模式不可达」在 exec 自己的计划件里就有逐条自证**（`ops/*.json` 用例 `pre` 字段原文，可 grep）

| 证据路径 | 原文关键句 |
|---|---|
| `ops/PAGES-REGISTER-INDEX.json:98`（用例 REG10） | 「需 apiMode=real 构建（isMockMode()=false 且 isDev=false，config/env.ts:139,250）；**本轮构建恒为 build:mp-weixin:mock**（stage-contract §3.5）」 |
| `ops/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json:28` | 「mock 构建下 fetchCircles 无网络出口（stores/circle.ts:306-309）→ **errorMessage 无法经真实失败构造**」 |
| `ops/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json:129` | 「真实档（apiMode=real）重复一次并记录 POST /circles/{id}/join 请求条数与各自 Idempotency-Key 值 + 后端成员数回读」→ 真实档从未执行 |
| `ops/次要22.json:591`（VIP 假支付封堵） | 「REAL_ONLY：需要 real 构建 + 会员开关可用 + 身份A guest-login。**mock 构建下本支路不可判定**」 |
| `ops/次要19.json:608`（钱包入口） | 「⚠ 不可达前置：钱包菜单仅在 `appConfig.isCommerceOn('coin')=true` 时注入…默认 mock 产物下该入口不存在」 |

**量化"真实模式专属 / 结构上不可取证"的用例规模**（对 24 份 `ops/*.json` 正则统计，脚本可复算）：
`REAL_ONLY` **285 处**、`不可构造` **49 处**、`不可达前置` **8 处**、`本轮构建恒为 mock` **1 处**。
REAL_ONLY 按 suite 热点：`次要20`(62)、`次要21`(41)、`次要22`(39)、`SUBPACKAGES-VILLAGE-VILLAGE-INDEX`(25)、`CAMPUS-CAMPUS-POST-TOPIC`(24)、`VILLAGE-VILLAGE-PUBLISH`(24)、`VILLAGE-VILLAGE-POST`(22)、`CIRCLES-CIRCLES-POST-TOPIC`(21)、`CAMPUS-CAMPUS-INDEX`(17)、`CAMPUS-CAMPUS-HUB`(10)。
→ **约 25.7%（285/1107）计划用例在 mock 产物上永远无法判定**，且这一档从未进入任何可统计的结构化字段。

### 2.4 mock / real 构建次数与产物目录

构建日志实际位于 **`.zcode/tmp/`**（**不在 `logs/`**；`logs/build-mp-*.log` 最新只到 09-20）。逐份读末行退出码：

| # | 本地时间 | 日志 | 命令模式 | 结果（末行实测） | 产物目录 |
|---|---|---|---|---|---|
| 1 | 09-24 13:20 | `.zcode/tmp/build-mock-verify.log`(866 B) | `--mode mp-weixin-mock` 全链 | **失败 exit=1**：`prepare-static.mjs --dev` 阶段 `mv …src\static → static.bak.1790227234497: Permission denied`，`[prepare-static] restored full-static -> src/static 失败` | 未产出（uni build 之前即中断） |
| 2 | 09-24 13:23 | `.zcode/tmp/build-verify-nocommon.log`(27 723 B，678 行) | `UNI_OUTPUT_DIR=…/dist/verify-mock uni build --platform mp-weixin` **`--mode mp-weixin`** | 第 676 行 `DONE Build complete.`；677 行 `import dist\verify-mock run` | `apps/client/dist/verify-mock` —— **目录名叫 "mock"，但其 `config/env.js` 实测 `MODE:"mp-weixin"`、`VITE_API_MODE:"real"`，即 real 产物**（直读核对） |
| 3 | 09-24 15:57 | `.zcode/tmp/build-R2-mock.log`(32 265 B) | `--mode mp-weixin-mock` 全链（`verify-package-size --allow-mock` + `verify-build-features`） | **`BUILD_EXIT=0`**；告警「⚠ 总包 **28.81MB 超过 10.00MB**（dev 构建豁免）」；`[verify] 扫描产物目录 …dist\build\mp-weixin`、`共 324 个 js 文件`、`PASS：全部 4 项功能特征已包含` | **`apps/client/dist/build/mp-weixin`** ← 本轮 exec 实际被测物（env.js `VITE_API_MODE:"mock"` 已直读确认） |
| 4 | 09-24 22:55 | `.zcode/tmp/build-real.log`(28 660 B) | `UNI_OUTPUT_DIR=…/dist/build/mp-weixin-real node scripts/strip-mock-for-mp.mjs "uni build --platform mp-weixin **--mode real**"` | **`BUILD_EXIT=0`、`DONE Build complete.`、`[strip-mock] originals restored`**；告警 `Generated an empty chunk: "stores/village"` | **`apps/client/dist/build/mp-weixin-real`**（真 real：`MODE:"real"`、`VITE_API_MODE:"real"`、全包 `grep mockFixtures`/`AUTO-GENERATED STUB` 命中 0、4 份被桩化源文件逐字节还原） |

**计数结论**：
- **mock 语义构建 3 次尝试**（#1 失败、#3 成功；#2 名为 mock 实为 real）→ **真正的 mock 产物 1 份**：`apps/client/dist/build/mp-weixin`。
- **real 构建本轮产出 2 份**（#2 落在 `dist/verify-mock`、#4 落在 `dist/build/mp-weixin-real`）；**#4 是唯一干净的 real 产物**，完成于 22:55 本地（14:55Z），**距 16:06Z 终止仅 1h11m，exec 从未切到该目录跑过任何一条用例**。
- 历史 real 构建（对照，非本轮）：`logs/goal-build-mp-real.log`(09-22 16:11) 第 **140-146** 行 → **`build:mp-weixin:real` 失败，`npm error code 1`**；`logs/goal-build-real-static.log`(09-22 16:15) 第 848 行 → `DONE Build complete.`。

**#4 为何必须改道、不能原位重建**（`build-real-evidence.md:5-10` 原文）：R2 exec 持 `wechat-automation-9420` 锁（owner `r2-exec-subagent-R2`、**pid 40468**）在读 `dist/build/mp-weixin`；且 `prepare-static.mjs` / `prune-unreferenced-static.mjs` **把共享目录 `dist/build/mp-weixin` 写死**（后者会删文件），即使 `UNI_OUTPUT_DIR` 改道（`@dcloudio/vite-plugin-uni/dist/cli/utils.js:128-131` 确认可改道）这两个脚本仍打到共享目录。
**#4 未评估的门禁**（`build-real-evidence.md:34-38`）：`verify-package-size`（隔离目录实测总包 28.70MB / 主包 27.66MB，但因跳过 `prepare-static --real` 与 `prune-unreferenced-static` 而不代表发布形态，**不得据此判失败**）、`verify-env-release`（要求生产 HTTPS，本机 127.0.0.1 必不过）、`verify-build-features`（**只挂在 `build:mp-weixin:mock` 链里，real 链根本不含它**）。

**exec 启动即被锁阻塞**（`.zcode/tmp/exec-R2.log`，786 B，09-24 18:57）：
`[exec] .zcode/tmp/r2-exec.cjs round=R2 dir=round-2 owner=r2-exec-subagent-R2 git=18c91ccf **suites=24(dynamic)** startup 2026-09-24T10:50:18.783Z` → `[lock] BUS by {resource:"ws://127.0.0.1:9420", owner:"tour-R2-subagent", pid:4316, status:"LEASED", leaseUntil:10:56:39Z, lastHeartbeat:10:41:39Z}` → `LOCK_BUSY` / **`EXEC_EXIT=3`** → `[launcher] 2026-09-24T10:57:25.621Z 锁已可接管，启动 exec`。
同一锁记录内嵌 `externalClientsObserved`：listenerPid 15304、**6 个外部 client pid（2868,16584,36364,32804,27740,35820）、89 条连接**、`pageDriftTest:"identical (r2-ext-1/2.png)"`、verdict「idle/leaked sessions, not actively commanding; **no taskkill per protocol**」→ 9420 端口存在会话泄漏且协议禁止清理。
→ **计划 suite 数在 exec 自己的启动日志里就是 24**，与 `ops/` 的 24 份一致；`exec-stop-snapshot.json#suites_recorded=21` 仅是"已记录到"的口径。

---

## 3. 问题清单（逐条：描述 / severity / 磁盘证据路径+行号或 JSON 路径 / 判定来源 / 状态）

### 3.0 问题总量口径（四本账，互不一致，逐本实测）

| 账本 | 条目数 | 严重度分布 | 状态分布 | 说明 |
|---|---|---|---|---|
| `reports/audit/round-2/harvest.json` → `all[]` | **473** | P0 7 / P1 51 / P2 97 / P3 179 / **P4 139** | 待修复 335 / 已修复待终验 97 / 已验证 25 / 待裁决 9 / 已修复 4 / 保留 3 | 68 个不同 page；`summary.worklist=71` |
| `harvest.json` → `workIds[]` | **71** | — | — | 抽取的工作清单（`MP-R2-*` 为主） |
| `.zcode/tmp/mode-dependent-issues.json` | **124** | P0 1 / P1 27 / P2 40 / P3 37 / 空 19 | 待修复 100 / 已修复待终验 19 / 已验证 3 / 保留 2 | 仅"模式相关"子集，含 `sec:line` 反向指针 |
| `.zcode/tmp/mode-dependent-issues-final.json` | **116** | P0 1 / P1 25 / P2 39 / P3 36 / 空 15 | 待修复 95 / 已修复待终验 19 / 保留 2 | 上表筛掉 8 条（§1.3） |
| `reports/audit/round-2/findings/VISUAL-WAVE2.json` → `issues[]` | **80** | **P0 3 / P1 11** / P2 37 / P3 27 / P4 2 | **全部 80 条 = 待修复** | 21 个 page；`dupes[]` 另有 24 条判为重名不立项；`collateralFindings[]` 4 条 |
| `reports/audit/round-2/findings/WAVE2-AFFORDANCE-PENDING.json` | **9** | P2 2 / P3 3 / P4 4 | **全部 9 条 = 待裁决** | 修复代理回报，主控只抽验 3 条证据 |
| `.zcode/tmp/TAKEOVER-HANDOFF.md:45` 自称"台账真值" | **552 待修复**（P0 0 / P1 36 / P2 96 / P3 259 / P4 161）+ 193 条代码层已修待运行时验证 | | | 与 harvest 的 335 条 `待修复` **不可调和**，见 §4-D7 |

**头条事实：harvest 的 7 条 P0 里，只有 3 条是 `待修复`，而这 3 条全部是测试台自身缺陷，不是产品缺陷**：

| P0 | 判定来源 | 证据 | 状态 |
|---|---|---|---|
| `MP-R2VIS-TMP-TOUR-R2-001` | 脚本/像素（截图遮罩扫描） | `findings/VISUAL-WAVE2.json:issues[]`；描述「**位置授权系统弹窗从未被处理，导致整页取证被遮罩污染（多组页面有效帧为 0）**」，conf 0.7，`page="tmp/tour-R2"` | 待修复 |
| `MP-R2VIS-TMP-TOUR-R2-002` | 脚本（MD5/字节比对） | 同上；「状态帧未做内容哈希比对，**29 组"不同状态"帧字节相同（267 帧中 10.9%）**，≥6 状态配额被同名不同质凑满」，conf 0.75 | 待修复 |
| `MP-R2VIS-REPORTS-AUDIT-SCREENSHOT-MANIFEST-001` | 脚本 grep | 同上；「两份 screenshot-manifest 的 **gitSha 硬编码 aefd8a72**（HEAD 已是 18c91ccf）且 R2 manifest 仅 8 shot → 全部终验证据按契约过期」，conf 0.7 | 待修复（部分已改，见 §4-D1） |

其余 4 条 P0 已判 `已验证` / `已修复待终验`：`MP-R2-CIRCLES-INDEX-R01`、`MP-R2-MATCHING-001`（**证伪**：历史「匹配页打不开」不成立）、`MP-R2-VILLAGE-INDEX-R01`、`MP-R2-PUB-002-R`。

---

### 3.1 C1 — 401 / token 刷新 / reLaunch 链（`mode-dependent-issues.json` 计 22 条）

| id | sev | 描述要点 | 磁盘证据（路径 + 行号/字段） | 判定来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R1-PAGES-LOGIN-INDEX-004` | **P1** | `getPhoneNumber` 在真实后端+未登录下，页面级 401 兜底被 http 层通用 401 的 `reLaunch` 摧毁：展开的手机号表单 500ms 后被重置 | `.zcode/tmp/mode-dependent-issues.json` → `[0]`（`sec=PAGES-LOGIN-INDEX.json`，`line=55`，`cats=[C1,C6]`，`shot="无（代码层审查…）"`） | 代码审查（**无运行时取证**） | 待修复 |
| `MP-R1VIS-PAGES-NEARBY-INDEX-001` | **P1** | 「已修复待终验」的附近页 401 强踢在同 gitSha 运行时**复现**，与代码层结论直接矛盾 | `mode-dependent-issues.json` → `[76]`（`PAGES-NEARBY-INDEX.json:802`），字段 `shot="无有效截图（N02 after 保存超限失败）；证据=reports/audit/round-1/interact/exec-results.json#N02"` | 脚本输出（exec-results）+ 代码层互相打脸 | 待修复 |
| `MP-R1-N02-01` | **P1** | 未登录进入附近页：未呈现「静态空态+分区⑤登录引导卡」，实际 `401→redirectToLogin` + toast「登录已过期，请重新登录」 | `mode-dependent-issues.json` → `[86]`（`PAGES-NEARBY-INDEX-judge.json:1623`）；同事实见于 `[60]`（`PAGES-NEARBY-INDEX-req.json:1221`，`MP-R1-PAGES-NEARBY-INDEX-903`，P2，`shot=reports/screenshots/round-1-interact/PAGES-NEARBY-INDEX-N02-after.png`） | judge 复核 + 截图 | 待修复 |
| `MP-R1-PAGES-NEARBY-INDEX-001` / `MP-R2-PAGES-NEARBY-INDEX-001` | **P1×2** | 附近页 onLoad 无条件打受保护接口 / `reportLocation` 在登录门外 | `mode-dependent-issues.json` → `[7]`（:154）、`[8]`（:155） | 代码审查 | **已修复待终验**（但被上一条运行时推翻） |
| `MP-R1-PAGES-MESSAGES-INDEX-005` | **P1** | 未登录态「手机号登录」死交互（`NotLoggedWaiting` emit `goPhoneLogin` 无监听者） | `mode-dependent-issues.json` → `[12]`（`PAGES-MESSAGES-INDEX.json:216`），`shot="（无截图——Layer A 代码审查）"` | 代码审查 | 已修复待终验 |
| `R13-CHAT-409` | **P0** | 会话 get-or-create 稳定幂等键 → 二次进会话 409 `IDEMPOTENT_CONFLICT`，整页只剩后端技术串 | `mode-dependent-issues.json` → `[35]`（`SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json:501`）；修复未提交（原文：`git log -S "idem-conv"` 无命中、`git diff` 可见新增行） | 代码审查 | 已修复待终验（**运行时 409 delta 未复跑**） |
| `MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-102` | **P1** | 上述 P0 的回归复核：深链 `?userId=10003` 整页正常渲染 | `mode-dependent-issues.json` → `[81]`（`...-req.json:1418`，status `已验证`），`shot=reports/audit/2026-09-22-r13-goal/shots-r13e/51-chat-entry2.png`；**该条在 `-final` 里已被删除**（§1.3） | 截图 + judge | 已验证→出清单 |
| `MP-R1-PAGES-PROFILE-INDEX-002` | P2 | R12 头部图标与状态栏叠印的**首次视觉确认** | `mode-dependent-issues.json` → `[73]`（`PAGES-PROFILE-INDEX.json:849`），`shot=reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-25-guest-other.png` | 截图 | 待修复 |
| `R12-IND-PROFILE-INDEX-001` | P2 | 同问题代码层：`NotLoggedProfile` 根节点 `padding-top` 固定 32rpx，未消费 `--statusbar` | `mode-dependent-issues.json` → `[18]`（`PAGES-PROFILE-INDEX.json:1973`），`shot` 字段自述「PFI01-after.png **落盘失败 ERROR:timeout waiting for automator response**」 | 代码审查（截图落盘失败） | 待修复 |
| `MP-R1-PAGES-DISCOVER-INDEX-003` | P2 | 游客态登录胶囊被自定义 tabBar 中央浮岛遮挡（几何复算：safe=34px 时仅余 −4rpx 理论擦碰） | `mode-dependent-issues.json` → `[10]`（`PAGES-DISCOVER-INDEX.json:183`）；`harvest.json:all[]` 中 `MP-R2-PAGES-DISCOVER-INDEX-001` 记修复在位（胶囊 bottom 80→128rpx，`index.vue:493`） | 代码 + 历史截图 `reports/audit/2026-09-22-r13-goal/shots/05-pages-discover-index.png` | 已修复待终验 |
| `MP-R1-PAGES-LOGIN-INDEX-201` | P2 | 手机号验证码/密码登录**唯一入口**藏在 `getPhoneNumber` 失败分支；本轮该链路 15 例（LG11/LG22/LG23-LG29/LG31）全 FAILED，`element not found: #login-password` | `mode-dependent-issues.json` → `[92]`（`PAGES-LOGIN-INDEX-req.json:1164`）；**同事实测复核**：`reports/audit/round-2/interact/exec-results.json` 中 `failureReason="action input #login-password failed: element not found: #login-password"` 2 条 + `.sms-send-btn` 2 条 + `.login-sms-fallback`/`#login-sms-code` 各 1 条（见 `.zcode/tmp/exec-failure-triage.md:113,115,128,129`） | 脚本输出 + 代码审查 | 待修复 |
| `MP-R1-SETUPPREF-001` | （空级） | 未登录保存偏好静默跳过 PUT 却 toast「保存成功」并重定向 —— 假成功 | `mode-dependent-issues.json` → `[57]`（`次要24.json:715`） | 代码审查 | 待修复 |
| `MP-R1-SECURITY-202` | （空级，自述列 P4） | real 模式 `/auth/devices` 拉取失败被空 catch 吞掉，用户误以为「仅当前设备登录」 | `mode-dependent-issues.json` → `[55]`（`次要22.json:678`） | 代码审查 | 待修复 |
| `MP-R1-PAGES-LOGIN-INDEX-006` | P3 | 登录链路 toast 文案与表单实际能力不符（zh/en 双语同病） | `mode-dependent-issues.json` → `[1]`（:60） | 代码审查 | 待修复 |
| `MP-R1-PAGES-HOME-INDEX-021` | P3 | real 未登录进首页：「兴趣推荐」「附近的人」只渲板块头+空横滑，无空态文案，与 `onShow` 注释矛盾 | `mode-dependent-issues.json` → `[2]`（:121） | 代码审查 | 待修复 |
| `MP-R1-PROFILE-217` | P3 | 两处 `likesStore.fetchLikes().catch(() => {})` 空 Promise 拒绝处理器 | `mode-dependent-issues.json` → `[19]`（:1976）；**独立复核**：`.zcode/tmp/recurrence-postfix-check.md` 表内该条判 `STILL_OPEN_CODE_PROOF`，给出当前行号 `pages/profile/index.vue:1572` 与 `:1590`，并注明「dev 用 `console.warn` 仍缺失」 | 代码审查 ×2 | 待修复 |

### 3.2 C2 — 幂等 / 并发 / 防连点穿透（30 条）

| id | sev | 描述要点 | 证据 | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R1-HOME-101` | P2 | 今日推荐「喜欢」快击 5 次 → **5 条「已喜欢」toast**（间隔 59~86ms），违反防连点铁律；`likeLoading` 在 mock 即时回包下形同虚设 | `mode-dependent-issues.json` → `[88]`（`PAGES-HOME-INDEX-judge.json:1605`），`shot=reports/screenshots/round-1-interact/PAGES-HOME-INDEX-H08-before.png / -after.png`；同事实见 `[79]`（`PAGES-HOME-INDEX-req.json:1206`，`MP-R1-PAGES-HOME-INDEX-110`） | judge + toast 时间戳流 | 待修复 |
| `MP-R1-HOME-102` | P2 | 兴趣圈「加入」快击 5 次 → **4 条「操作成功」toast**（ts 1790148196582/6641/6706/6860）；`wxml` 证据 `PAGES-HOME-INDEX-H25-after.wxml` | `mode-dependent-issues.json` → `[89]`（:1606） | judge + wxml | 待修复 |
| `MP-R1-C24-001` | P3 | 免打扰保存快击×5 → **5 条「设置已保存」Toast（311ms 内）**；`isSaving` 仅 in-flight 生效（`dnd.vue:239` 置位、`:273-275` finally 复位） | `mode-dependent-issues.json` → `[103]`（`次要24-judge.json:1861`） | judge + toast 时间戳 | 待修复 |
| `MP-R1-C26REQ-002` | P2 | 演示充值无重入锁且**幂等键每次点击重新生成**（`RECHARGE-DEMO-${Date.now()}`，`wallet/index.vue:79-106`）→ 防重复提交完全失效 | `mode-dependent-issues.json` → `[98]`（`次要26-req.json:1329`） | 代码审查 | 待修复 |
| `MP-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-REQ2` | P3 | 加入/退出 CTA 无在途锁；mock `circle.memberCount += 1` 非幂等 | `mode-dependent-issues.json` → `[95]`（`...-req.json:1332`），`shot=…/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI11-before…` | 代码 + 截图 | 待修复 |
| `MP-R1-REQ20-006` | P2 | `circle-home.vue` / `topics.vue` 的 `toggleJoin` 均无 `isJoining` 标记；exec CH12 实证 `.info-join` | `mode-dependent-issues.json` → `[100]`（`次要20-req.json:1453`） | 代码 + exec | 待修复 |
| `MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-107` | P2 | 「错误净化不外露技术串」只做一半：发送失败 toast 直抛原始 `error.message`（HTTP 码/幂等冲突串可见） | `mode-dependent-issues.json` → `[97]`（`...-req.json:1423`） | 代码审查 | 待修复 |
| `MP-R1-CIRCLES-INDEX-010` | （空级） | `fetchCircles` 无在途去重，三条触发路径可并发重复请求；`watch` 只查 `circles.length===0` 不查 `loading` | `mode-dependent-issues.json` → `[29]`（`SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json:355`） | 代码审查 | 待修复 |
| `MP-R1-CERT-101` | （空级） | `submitCert` 无 `isSubmitting` 守卫，防重仅靠 `pointer-events:none`（依赖 Vue 异步重渲染） | `mode-dependent-issues.json` → `[44]`（`次要20.json:556`） | 代码审查 | 待修复 |
| `MP-R1-VILLAGE-INDEX-108` | P3 | PostCard「分享」是死控件：`@tap.stop="noop"`，store 的 `sharePost` 无人调用 | `mode-dependent-issues.json` → `[26]`（:277） | 代码审查 | 待修复（**自上次以来「仍未修复」**） |
| `MP-R1-HIS-001` | P3 | 二级页 `onUnload` 拆卸**共享** discover store，清掉存活主 tab 页的定时器与在途请求 | `mode-dependent-issues.json` → `[48]`（`次要21.json:580`） | 代码审查 | 待修复 |
| `MP-R1-SEARCH-204` | （空级） | 回车/点热搜词发出两份相同搜索请求（防抖 + 立即调用双写） | `mode-dependent-issues.json` → `[54]`（`次要22.json:602`） | 代码审查 | 待修复 |
| `MP-R1-SHOP-001` | P3 | real 模式分类切换丢请求（`shopLoading` 早退静默丢弃新分类拉取 → 空列表） | `mode-dependent-issues.json` → `[59]`（`次要26.json:702`） | 代码审查 | 待修复 |
| `MP-R1-CAMPUSINDEX-007` | P3 | 首次进入认证状态接口重复请求（`onShow` 无首次跳过 + `onMounted` `Promise.allSettled`） | `mode-dependent-issues.json` → `[31]`（:417） | 代码审查 | 待修复 |
| `MP-R1-SETUPPROFILE-003` | （空级） | `refreshSession()` 与 `updateBasicProfile` 同 try → PUT 已成功但刷 session 失败弹「保存失败」 | `mode-dependent-issues.json` → `[56]`（`次要24.json:655`） | 代码审查 | 待修复 |
| `MP-R1-PAGES-HOME-INDEX-002/003` | P2×2 | 「换一位」/「加入」竞态与态源 —— **本轮已修** | `mode-dependent-issues.json` → `[4]`（:134）、`[5]`（:135） | 代码审查 | 已修复待终验 |
| `MP-R1-CAMPUSPOST-001/004` | P3/P2 | 空表单静默无 toast；成功后 800ms 窗口内重复提交产生重复帖 —— **本轮已修** | `mode-dependent-issues.json` → `[32]`（:429）、`[33]`（:432） | 代码审查 | 已修复待终验 |

### 3.3 C3 — 媒体 URL 真实解析（12 条）

| id | sev | 描述要点 | 证据 | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R1-PROFILE-201` | **P1** | 「我的故事→我的帖子」配图裸 `<image>` 直连 `/api/v1/media/**` → 白图（`MP-R7-PROFILE-002` 同病复发） | `mode-dependent-issues.json` → `[17]`（`PAGES-PROFILE-INDEX.json:245`） | 代码审查 | 已修复待终验 |
| `MP-R1-MATCHING-002` | **P1** | 匹配动画双头像未过 `resolveMediaUrl`，real 模式渲染空圆 | `mode-dependent-issues.json` → `[34]`（`...DISCOVER-MATCHING.json:454`） | 代码审查 | 已修复待终验 |
| `MP-R1-SEARCH-201` | **P1** | 用户/校园两处头像裸相对路径（real 裂图） | `mode-dependent-issues.json` → `[53]`（`次要22.json:597`）；`MP-R2-SEGMENT-001` 同族（`次要21.json:2089`） | 代码审查 | 已修复待终验 |
| `MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-002` | P2 | 对方头像未过统一媒体出口，real 恒落默认图 | `mode-dependent-issues.json` → `[36]`（:470） | 代码审查 | 已修复待终验 |
| `MP-R1-CTOPIC-101` | P2 | 圈子话题配图 `mapToTopicItem` 原样透传 `raw.images`，模板直 `:src="img"` | `mode-dependent-issues.json` → `[42]`（`次要20.json:547`） | 代码审查 | 待修复 |
| `MP-R1-PUBLISH-101` | **P1** | 圈子目标草稿回退「个人动态」后 `visibility` 卡在 `interest`：**UI 承诺「兴趣圈（窄）」、服务端落库 `public_`（宽）→ 静默放大可见性** | `mode-dependent-issues.json` → `[23]`（`SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json:294`，`cats=[C6]`） | 代码审查 | 待修复 |
| `MP-R1-CAMPUSPOSTTOPIC-201` | **P1** | 校园圈发帖配图链路 real 端到端断裂：**图片被创建接口静默丢弃**（客户端承诺「上传图片 0/6」+ 隐私授权 + 逐张 `uploadPostImage`） | `mode-dependent-issues.json` → `[93]`（`SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-req.json:1375`），`shot=reports/screenshots/round-1-tour/A/subpackages_campus_campus_post-topic__滚动-底部.p…` | 代码 + 截图 | 待修复 |
| `MP-R1-PAGES-HOME-INDEX-025` | （空级） | 首页 `nearbyPeople` 第 2 条头像被**双重** `resolveMediaUrl` 包裹，同数组风格不一 | `mode-dependent-issues.json` → `[3]`（:131）；**`-final` 已剔除**（§1.3） | 代码审查 | 待修复→被移出清单 |
| `MP-R1-VILLAGE-INDEX-113` / `MP-R1-POST-110` / `MP-R1-MOCKDATA-101` | （空级×3） | `mock-data.ts` 内 `resolveMediaUrl` 自我嵌套最高 5 层，grep 计数 **31 处（前序轮 14 处，不减反增）**，纯生成事故累积 | 依次 `mode-dependent-issues.json` → `[27]`（:282）、`[24]`（`VILLAGE-POST.json:329`）、`[46]`（`次要20.json:559`）；**四条数据卫生项在 `-final` 中全部被删除** | 代码审查 + grep 计数 | 移出清单（噪音类） |

### 3.4 C4 — i18n 裸键（7 条，仅真实/未认证视角可见）

| id | sev | 描述要点 | 证据 | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R1-CAMPUSINDEX-001` / `MP-R1-CAMPUSINDEX-REQ-002` / `MP-R1-REG-CAMPUSINDEX-001` | **P1×3** | **同一物理缺陷被立了 3 个 ID**：未认证视角渲染原始 key `campus.index.hotCirclesTitle` / `campus.index.viewMore`。根因：提交 `29a2b1df`（2026-09-22 09:53）把两个 key **补进了错误的命名空间 `campus.postTopic`**（`zh-CN.ts:3549-3550`），页面消费点在 `index.vue:259-260` → 修复无效、渲染效果与原缺陷一致 = **已复发** | `mode-dependent-issues.json` → `[30]`（:411）、`[94]`（`-req.json:1365`）、`[105]`（:2034）；`MP-R1-CAMPUSINDEX-002`（P2，`-judge.json:1749`）为第 4 个同缺陷 ID。辅助证据：`.zcode/tmp/i18n-keys-A3.md`、`i18n-keys-A4.md`、`i18n-keys-A5.md`、`i18n-keys-A6A2.md`、`i18n-keys-A7.md`、`i18n-keys-A15.md`、`i18n-keys-W2publish.md`（7 份 i18n 键位对账单） | 代码审查 + 截图 `…/SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX03-after.…`、`CX04-after.…` | 待修复 |
| `MP-R1-CAMPUSINDEX-REQ-001` | P2 | 空态 CTA「快来发布第一个吧」出现在**两个无发布能力的视角**（未认证视角 FAB 为 `v-if="isOwnCertifiedView"`，`index.vue:356…`） | `mode-dependent-issues.json` → `[94]`（`-req.json:1364`） | 代码 + 截图 | 待修复 |
| `MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-106` | （空级） | 计分行图标风格与理想图不符（无底裸图标 vs 浅底圆 chip+彩色图标），同卡式跨页两套风格 | `mode-dependent-issues.json` → `[71]`（`...MATCH-SUCCESS.json:978`），`shot=reports/audit/round-1/findings/_tmp_crops_MS/scorecard_top.png` | 截图裁切件 | 待修复 |

### 3.5 C5 — 服务端分页：追加 vs 替换（9 条）

| id | sev | 描述要点 | 证据 | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R3-VILLAGE-INDEX-002` **与** `MP-R1-VILLAGE-INDEX-002` | **P1×2（同缺陷双 ID）** | 热度榜上拉加载「**替换**」而非「追加」：`onLoadMore` 调 `fetchHotBoard(page+1)`，但两个分支均整体替换 `this.posts`（mock `this.posts = pageItems`） | `mode-dependent-issues.json` → `[21]`（`SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json:270`，「【回归核对：仍未修复】」）、`[104]`（:1990，「【已复发：历史 P1 未见修复落地】…本轮交互用例 VI39 未取证」） | 代码审查（**VILLAGE 三 suite 从未执行，故 0 运行时证据**） | 待修复 |
| `MP-R1-CAMPUSTOPIC-REG-001` | **P1** | `campus/topic-detail.vue:271-277` `<input v-model=replyContent>` **属性串无 `maxlength`**（全文件 grep `maxlength` 0 命中），`:46-49` `submitReply` 仅 trim 判空 —— 历史 P1 的 maxlength 子项复发 | `mode-dependent-issues.json` → `[106]`（`次要20.json:2078`），`shot` 字段直接给源码行号 + `historical-issues.md:248` | 代码审查 + grep | 待修复 |
| `MP-R1-DETAIL-102` | P3 | 评论分页游标 `commentPage` 在带 `?id=` 的 onLoad 分支不重置 → 深链打开另一帖直接请求第 N+1 页，跳过 2~N 页 | `mode-dependent-issues.json` → `[39]`（`次要20.json:533`） | 代码审查 | 待修复 |
| `MP-R1-CAMPUSTOPIC-101` | P2 | 回复分页挂在**无有界高度的 scroll-view** 上（`.detail-page` 仅 `min-height:100%`、`.detail-body` 仅 `flex:1`）→ `@scrolltolower` 永不触发 | `mode-dependent-issues.json` → `[43]`（:549） | 代码审查（几何推导） | 待修复 |
| `MP-R1-VILLAGE-INDEX-106` | P3 | mock 自建帖（`id=post-<时间戳>`）经热度榜频道后**永久丢失** | `mode-dependent-issues.json` → `[25]`（:275）；**`-final` 已剔除** | 代码审查 | 移出清单 |
| `MP-R1-ARCH-009` | （空级） | VIP 账单双实现并存（`stores/vip-billing.ts` `listBills` vs `stores/vip.ts` `fetchBills`），`BillView` 字段口径已各自演化 | `mode-dependent-issues.json` → `[58]`（`次要26.json:702`） | 代码审查 | 待修复 |
| `MP-R1-PAGES-MESSAGES-INDEX-007` | P2 | dashboard 与 sessions 并发时整表覆盖（`recentChats` 后到丢弃官方号/临时会话）→ **本轮已修为按 id 合并** | `mode-dependent-issues.json` → `[13]`（`PAGES-MESSAGES-INDEX.json:219`） | 代码审查 | 已修复待终验 |

### 3.6 C6 — 服务端写入 / 回读真值（33 条，最大类）

| id | sev | 描述要点 | 证据 | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R1-PAGES-MESSAGES-INDEX-101` | **P1** | 测试残留消息「全链路验收测试消息2026-09-12」外露于最近聊天预览；全仓 grep 仅命中 reports 基线文档 → 属**运行时 DB 残留**（`private_messages id=3894`，`conv 461`） | `mode-dependent-issues.json` → `[90]`（`PAGES-MESSAGES-INDEX-req.json:1251`），`shot=reports/screenshots/round-1-tour/A/pages_messages_index__默认.png`。**状态需更正**：`.zcode/tmp/backup-private_messages-3894.md` 已记该行 **`DELETED`（可逆，附 INSERT 回滚）**，`TAKEOVER-HANDOFF.md:43-44` 记「`private_messages` 3819→3818、会话 461 预览位回正、**全库残留 0**、health UP」→ 台账仍写「待修复」是**过期状态** | 截图 + DB 备份件 | **实际已清理（台账未回写）** |
| `MP-R1-CAMPUSPOSTTOPIC-202` | **P1** | **匿名发布开关在 real 模式是安慰剂，实名信息照常暴露**：页面恒显示开关并承诺「显示为『匿名校友』」（`post-topic.vue:383-395` + `zh-CN.ts:3544`），未像 circles 同族页用 `useMock()` 门隐藏；mock 下 `campus.ts:654` 才真按 `isAn…` | `mode-dependent-issues.json` → `[93]`（`-req.json:1376`） | 代码审查 | 待修复（**隐私/合规语义，风险高于 P1 标签**） |
| `MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-001` | **P1** | temp 深链 `loadSession` 失败后 `chatStore.activeSession` **残留上一次会话** → 渲染上一个临时会话的消息，继续操作会**把消息发进错误会话** | `mode-dependent-issues.json` → `[37]`（`SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json:489`） | 代码审查 | 待修复 |
| `MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-001` / `…-102` | P2×2 | P8-2.3「报名成功→寻觅助手消息」链路 real 模式整体断裂 + 本地通知无限累积：两条路径都无条件 `appendAssistantActivityNotify`（`detail.vue:241` 真实报名、`:252` 示例活动），但消费者只在 mock 存在 | `mode-dependent-issues.json` → `[38]`（:512）、`[99]`（`-req.json:1436`）——**同缺陷双 ID** | 代码审查 | 待修复 |
| `MP-R1-TOPICS-103` | P3 | **虚构社交证明不限 mock 模式**：hero 区「等 N 位朋友已加入」头像（`FRIEND_AVATAR_POOL` 按 circleId 哈希取 3 张）与人数（`5+seed%8`）纯编造，无 `useMock` 守卫，real 照常渲染 | `mode-dependent-issues.json` → `[41]`（`次要20.json:544`） | 代码审查 | 待修复 |
| `MP-R1-CIRCLEHOME-102` / `MP-R1-REQ20-005` | P3/P2 | real 模式圈内动态点赞恒为假值：`realFeed` 把 `likes` 写死 0、`liked` 写死 false（后端无字段透传），`toggleLike` 仅本地翻转；代码自注 `TODO(后端)` | `mode-dependent-issues.json` → `[45]`（:553）、`[99]`（`次要20-req.json:1452`）——**同缺陷双 ID** | 代码审查 | 待修复 |
| `MP-R1-REQ20-008` | P2 | 圈子主页「标签 chips + 置顶规约」两块核心结构要素**仅 mock 渲染**（写死演示数据，`TODO(后端)`），real 模式整块消失 | `mode-dependent-issues.json` → `[99]`（`次要20-req.json:1455`） | 代码 + 截图 `round-1-tour/A/subpackages_circles_circles_circle-home__数据态.…` | 待修复 |
| `MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-011` | P2 | 助手活动卡片宣称「城市露营计划（周六 14:00-18:00 · 中央公园 2.3km，12人已报名）」，点击实际落到「新人礼遇（每日 18:00-20:00 · 校园咖啡角）」——**标题/时间/地点全不符** | `mode-dependent-issues.json` → `[72]`（`...-req.json:1007`），`shot=reports/screenshots/round-1-tour/A/subpackages_chat_official-chat_index__交互后.png…` | 截图（双身份实拍） | 待修复 |
| `MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-006` | P3 | 后端「按钮卡片」的「稍后再说」分支只本地 push、不落库、刷新即消失，与 R16 修复目标自相矛盾（`:161-170` 不调 `POST /official-accounts/{code}/messages`） | `mode-dependent-issues.json` → `[39]`（:517） | 代码审查 | 待修复 |
| `MP-R1-MOCKDATA`类 / `MP-R1-TASKS-006` | （空级） | real 模式任务图标与 aria 标签按 mock id 设计（`profile/checkin/first-post/verify`）与后端 code（`complete-profile/daily-checkin/…`）不匹配 | `mode-dependent-issues.json` → `[56]`（`次要24.json:655` 前一条，:655 行段 `MP-R1-TASKS-006`，`sec=次要24.json:655`/`line=655`） | 代码审查（源码行号为据） | 待修复 |
| `MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-009` | P3 | `notifyTyping` 未排除临时匿名会话（`index.vue:1261-1263`、`:1284` 无 `isTempSession` 守卫），real 模式向 `/app/chat/typing` 发 `conversationId="session-{a}…"` | `mode-dependent-issues.json` → `[37]`（:497） | 代码审查 | 待修复 |
| `MP-R1-TAGPOSTS-103` | P3 | 头像占位字符直取 `post.author.name[0]`，无 `initialOf` 兜底（全仓 detail/history/topics/topic-detail 已按 R4-00086/90/102 收敛，本页遗漏） | `mode-dependent-issues.json` → `[40]`（`次要20.json:537`） | 代码审查 | 待修复 |
| `MP-R1-HISTORY-103` | （空级） | 首次进入 `loadHistory(true)` 被 `onLoad` 与 `onShow` 各调一次 → 双重请求 | `mode-dependent-issues.json` → `[41]`（:540） | 代码审查 | 待修复 |
| `MP-R1-PAGES-MESSAGES-INDEX-009` | P2 | 下拉刷新 30s TTL 内空转（`loadPage` 非 async、`await` 落在 void 上）→ **本轮已修**（改 async + `force=true` 走 bootstrap） | `mode-dependent-issues.json` → `[14]`（:221） | 代码审查 | 已修复待终验 |
| `MP-R1-VILLAGE-INDEX-104` | P2 | real 模式加载失败后 30s 内「重试/下拉刷新」被 TTL 短路成空操作 → **本轮已修**（await 成功后才 `markFresh`） | `mode-dependent-issues.json` → `[22]`（:273） | 代码审查 | 已修复待终验 |
| `MP-R1-MSG-003` | P3 | 活动推荐卡空 `targetUrl` 分支点击无路由反馈（仅 hover opacity）→ 死按钮候选；`Manifest MSG39` 指定不得豁免 | `mode-dependent-issues.json` → `[101]`（`PAGES-MESSAGES-INDEX-judge.json:1653`），`shot` 字段**为空字符串** | judge | 待修复（**零证据**） |
| `MP-R1-PAGES-MESSAGES-INDEX-011` | P2 | 历史问题（编造「2 场活动」/硬编码露营文案）复验：当前构建 `assistant=[]` 时活动区整块隐藏、全页 wxml 无编造文案 | `mode-dependent-issues.json` → `[15]`（`-judge.json:1658`），`shot=reports/screenshots/round-1-interact/wxml/PAGES-MESSAGES-INDEX-MSG28-after.wxml`；**`-final` 已剔除** | wxml 取证 | 已验证 |
| `MP-R1-PAGES-HOME-INDEX-111` | P3 | 关系动态每格 3 头像堆仅 real 有数据：mock fixture 的 `relationActivity` 不带 avatar 数组 → 演示态该理想元素恒不渲染（5 张截图均无） | `mode-dependent-issues.json` → `[80]`（`PAGES-HOME-INDEX-req.json:1207`） | 截图 | 待修复 |
| `MP-R1-PAGES-MESSAGES-INDEX-108` | P3 | **R1 交互执行证据系统性缺陷**：`buildMode=build:mp-weixin:mock` 下 `useMock()=true` 使 `isUnlocked` 恒真 → 未登录等待态结构性不可渲染，MSG01-04 必然失败/误报；`MSG01` dom 断言 `.not-logged__*` 全部 absent 却标 EXECUTED | `mode-dependent-issues.json` → `[91]`（`-req.json:1258`） | 代码 + dom 断言自相矛盾 | 待修复（**测试台缺陷**） |
| `MP-R1-VILLAGE-PUBLISH-106` / `-107` | P3×2 | 字数计数 0/500 vs 理想图 0/1000；圈子目标下话题行整体隐藏 —— 两条均 status **`保留`**（有意收敛，偏差在理想稿本身） | `mode-dependent-issues.json` → `[96]`、`[97]`（`…-req.json:1303,1304`） | 代码 + 截图 | 保留（by-design 裁定） |

### 3.7 C7 — 身份 / 认证视角不可构造（31 条；测试台与产品的交界带）

| id | sev | 描述要点 | 证据 | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R1-IDENT-01` / `MP-R1-HOME-109` / `MP-R1-C21-003` / `MP-R1-C24-002` / `MP-R1-C26-003` / `MP-R1J-VILLAGE-INDEX-002` | P3/P2 混合 | **manifest 身份固定表（A=100158 曦风 / B=100159 小新生）在 mock 构建下不可满足**：mock 会话强制 `mockUserSession.userId="user-1001"`（`stores/session.ts:34-40`，R4-00134 全家桶统一），执行器注入后轮询得 `user-1001` 并**自报 `MISMATCH!`**（16+ 例 / 75 条 pre:login 标注）→ 双身份互斥前置（如 DQ03 签到额度错开）失效，「A/B 双身份各一份」覆盖要求仅 tour 达成 | `mode-dependent-issues.json` → `[87]`（`PAGES-NEARBY-INDEX-judge.json:1628`）、`[88]`（`PAGES-HOME-INDEX-judge.json:1613`）、`[102]`（`次要21-judge.json:1829`）、`[103]`（`次要24-judge.json:1862`）、`[104]`（`次要26-judge.json:1889`）、`[101]`（`…VILLAGE-INDEX-judge.json:1681`）；证据字段指向 `exec-results.json` 各条 `pre` 段 | 执行器自报 + judge | 待修复（**基建缺陷，非页面缺陷**） |
| `MP-R1-C26-003` | P2 | **A1 交互执行器基建缺陷导致本批 49 条用例中 43 条不可仲裁（UNVERIFIED）**：①身份注入恒为 `user-1001`；②解封预案无配置注入面（`pre-FAIL input element not found: .enabled/.membership…`） | `mode-dependent-issues.json` → `[104]`（`次要26-judge.json:1889`） | judge | 待修复 |
| `MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-109` | P2 | **本页 45 项交互用例 judge 复核仅 2 VERIFIED / 3 FAILED / 40 UNVERIFIED**：发送文本/防连点/超长输入/表情面板/长按复制-转发-删除-引用-撤回/···菜单/免打扰/拉黑/举报全部无执行级证据。「主因是取证清单缺陷而非产品缺陷」 | `mode-dependent-issues.json` → `[97]`（`...-req.json:1425`） | judge | 待修复 |
| `MP-R1-DISCOVER-HISTORY-203` | P2 | 核心差异化功能「挽回」整链零正向执行证据：DH03/DH04/DH05 全 FAILED，根因 `automator` 无法合成左右滑（`pre:swipe left unsupported(no element api)`）→ `.rewind-btn` 永不渲染 | `mode-dependent-issues.json` → `[98]`（`次要21-req.json:1470`） | exec + judge | 待修复 |
| `MP-R1-DQ-201` | P2 | 页面核心功能「提交回答」整链零正向执行证据：DQ05-DQ09 全 FAILED，根因**用例身份未签到**（`DQ05-after.wxml` 实证当时停在签到锁定卡，回答区 `v-else` 未渲染） | `mode-dependent-issues.json` → `[98]`（`次要21-req.json:1473`） | wxml 实证 | 待修复 |
| `MP-R1-PAGES-REGISTER-INDEX-013` / `MP-R1-PAGES-REGISTER-SUCCESS-008` / `MP-R1-CAMPUSINDEX-010` / `MP-R1-MATCHING-101` | **P1×4** | **四条"P1"实为「本页整页零截图」**：直连 `reLaunch` 被应用侧会话守卫重定向至 `pages/login/index`（2 次一致）/ 落 `campus/hub` / `?target=10003` 落 `pages/discover/index` → 静态巡检矩阵 A/B 双身份全部缺档 | `mode-dependent-issues.json` → `[67]`(761)、`[68]`(772)、`[74]`(934)、`[75]`(958)。**独立分诊已推翻其归因**：`.zcode/tmp/nav-bounce-triage.md` + `TAKEOVER-HANDOFF.md:67-73` 判定 13 页弹跳 `GENUINE_APP_DEFECT = 0`，全为测试台问题（`BUILD_FLAG_ABSENT` 4、`PARAM_REQUIRED` 2、`HARNESS_CALL_DEFECT` 7），且「落在 discover = mock 自动前进」这条 R1 归因**不成立**（两个确证落点是无条件下沉；`session-guard.ts:84-95` 是死代码，`AUTH_GUARD_BOUNCE=0`）；`?target=10003` 是**幽灵参数**（编译产物中 `target` 出现 0 次） | 巡检自述 + 事后分诊 | 状态应从「产品 P1」改判为「测试台缺陷」 |
| `MP-R1-CIRCLES-INDEX-003` | P3 | 「校园认证圈」拦截是**死代码**：`circle.campusVerified` 全仓无生产者（后端 `BackendCircleView` 无该字段、`mapToCircleItem` 不映射、`mockCircles` 不种子） | `mode-dependent-issues.json` → `[28]`（`SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json:348`） | 代码审查 + 全仓 grep | 待修复 |
| `MP-R1-CAMPUS-HUB-014` | （空级） | 「校园是否已认证」**双数据源无同步桥**：hub 族用 `campusStore.certificationStatus`（`GET /campus/certification`），守卫族用 `session.userSession.campusVerified`，后端审批通过后若只刷新其一即不一致 | `mode-dependent-issues.json` → `[30]`（`CAMPUS-HUB.json:396`） | 代码审查 | 待修复 |
| `MP-R1-CAMPUSINDEX-012` | P3 | 未认证视角「推荐兴趣圈」8 枚封面 `flex:1×8` 单行挤占（无换行/无横滚），每枚实测 ≈74rpx×120rpx 竖条，`aspectFill` 中心裁切只剩中缝 | `mode-dependent-issues.json` → `[75]`（:936），`shot=…/SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX04-after.…` | 截图 + 尺寸实测 | 待修复 |

> **对继承数字的实测更正（重要）**：`MP-R1-HOME-109` 自述「执行器自记 MISMATCH!，**16+ 例**」、`MP-R1-C24-002` 自述「证据=exec-results 全部 **75 条** pre:login MISMATCH 标注」——这两句都是 R1 语料口径。**本轮（R2）实测**：`exec-results.json` 中 `observed` 含 `MISMATCH` 的用例 **366 条**（= 全部 366 条带 `pre:login` 步骤的用例，**100% 不匹配**），出现的 userId 令牌只有 `user-1001` 一种（374 次命中）。按 suite：`次要21` 76、`次要18` 69、`次要20` 67、`CIRCLES-CIRCLES-POST-TOPIC` 30、`CAMPUS-CAMPUS-POST-TOPIC` 26、`CAMPUS-CAMPUS-HUB` 21、`CAMPUS-CAMPUS-INDEX` 19、`CHAT-CHAT-SESSION-INDEX` 18、`次要22` 17、`次要19` 10、`REGISTER-SUCCESS` 4、`MATCH-SUCCESS` 4、`MATCHING` 3、`CIRCLES-CIRCLES-INDEX` 2。
> 典型 `observed` 原文：`pre:login A ok userId=user-1001 MISMATCH!`。
> → 双身份注入在本轮**无一例成功**，规模是台账自述的 **4.9×（对 75）～ 22.9×（对 16）**。凡依赖「A/B 各一份」的覆盖声明本轮一律不成立。

### 3.8 后端 / API 侧缺陷（唯一来源：`.zcode/tmp/e2e-sync-findings.md` + `wave3-decisions-landed.md`，真实后端实测）

这批**不来自 mock 巡检**，来自 09-24 22:30–22:43 本地的一次真实后端 API 层核验（12 步闭环），因此是本轮**唯一带真实读写证据**的一类。

| id | sev（原文） | 描述 | 磁盘证据 | 判定来源 | 当前状态 |
|---|---|---|---|---|---|
| **F-1** | P2 | 后台「村落动态」**检索与列表完全不含 `title` 字段**：`posts.title` 真实存在且客户端必填 5–30 字，但 `PostRepository.searchForVillageAdmin` 关键词条件只有 `p.content LIKE`，其 javadoc 自述「村落动态帖子无标题字段，仅匹配内容」；`AdminVillagePostSummaryView`/`AdminVillagePostDetailView` 两个 record 均无 `title`。**实测：按标题前缀 `E2E-SYNC-VERIFY-` 检索 total=0 不命中，按正文片段检索 total=1 命中** | `e2e-sync-findings.md:25-30`；根因锚点 `CreatePostRequest.java:17`、repo `:214` | **真实后端 API 实测**（脚本 + 计数） | **已改，未生效**：`wave3-decisions-landed.md` ③ 已改 4 处（`PostRepository.searchForVillageAdmin` 加 `OR p.title LIKE`、两个 View record 加 `String title`、`apps/admin/src/api/forum.ts` 加 `title: string \| null`、`VillagePosts.vue` 渲标题），**但后端改动必须重启 8080 才生效，本轮按约束未重启** |
| **F-2** | P3 | `GET /posts` 响应字段名与后台侧不同源：客户端详情 `likesCount`/`commentsCount` 读出 None（键名不同），后台侧为 `likes`/`comments`；计数本身正确（=1/1/1/2）→ 命名收敛问题，非数据错误 | `e2e-sync-findings.md:32-33` | 真实后端实测 | 未修复（未列入 wave3 改动） |
| **F-3** | P2（**已被用户裁定降级**） | real 模式下游客完全无法读取帖子流：`SecurityConfig.java:120-192` 的 permitAll 白名单**没有任何 `/api/v1/posts/**`** → 未带 token 的 `GET /posts`、`GET /posts/230` 都是 **401**；`VillageController.java:98-101` 那句「发现 Tab 未认证仍可浏览 all 流」的兜底分支是**死代码** | `e2e-sync-findings.md:35-38`（实测 401）→ 裁定见 `wave3-decisions-landed.md` ② | 真实后端实测 + **用户裁定** | **产品行为判为预期**（游客应被引导去注册）→ 缺陷**降级为文案问题**：`redirectToLogin()` 写死 `apiErrors.unauthorized`（zh「登录已过期，请重新登录」），从没登录过的游客读到"过期"是错的；i18n 里**已有**正确串 `apiErrors.loginRequired`（zh「请先登录后再使用该功能」）却无人使用。已改 `apps/client/src/services/http.ts`（`clearTokens()` 前取 `hadSession` 据此选文案），**待重建产物才生效**。`VillageController.java:98-101` 死分支转 **P3 记档** |
| **F-4** | **P1**（real 构建前置阻塞） | `wx.login` 链路在本机后端**不可用**：`POST /auth/wechat-login {code:"e2e-probe-devfallback"}` → **502 `WECHAT_API_ERROR`「微信服务暂时不可用」**。根因链：`application.yml:268` `dev-fallback-enabled: ${WECHAT_DEV_FALLBACK_ENABLED:false}` 默认关；开启后 `WeChatClient.java:146-151` 才会把任意 code 派生成 `dev-wechat-{code}` openid，而生产 profile 下该开关被 R4-00270 强校验拒绝（`WeChatClient.java:71-91`）；真实 appid `wxc67cd233d72388d0` **无可用 secret** | `e2e-sync-findings.md:40-44`；**API 日志双次实拍**：`campus-love-api.2026-09-24.0.log` 19:52:15.428 与 22:43:17.863 `errcode=41002, errmsg=appid missing`（`campus-love-api-error.log` 全文仅此 2 条） | 真实后端实测 + 日志 | **未修复**。绕过方式：real 登录页 `pages/login/index.vue:740` 的「体验账号」按钮无条件渲染 → `loginAsGuest()` → `/v1/auth/guest-login`（白名单内，实测 200）。**代价：真机上「微信一键登录」主入口在本地环境永远 502，A 链只能证到 guest/phone 两路，wx 路必须记为未取证** |
| **A-1**（新增，来自 real 素材探活） | P3→**已修** | `config/images.ts` 的 `HEART_FILLED_WHITE` 在 real 模式指向**未批准资产 → 404 白图**（配对成功弹窗心形） | `real-assets-probe.md`：改前 312 URL / 311 通 / **1 断链**；改后 311 / 311 / **0** | 真实后端探活脚本 | **已修复待截图取证**：`MatchSuccess.vue:103` 改用 `HEART_FILLED`（`heart-filled.svg`，实测 200）+ `filter: brightness(0) invert(1)`；**并删除 `images.ts:523` 常量本身**（防再引用）。反色滤镜真实渲染待真机轮 |
| **B-1**（新增，跨轮 DB 残留） | **P1** | 测试残留 `private_messages id=3894`（conv 461，content「全链路验收测试消息 2026-09-12」，sender 100151，`created_at 2026-09-12 00:28:28`）外露于最近聊天预览位 | 台账：`mode-dependent-issues.json` → `MP-R1-PAGES-MESSAGES-INDEX-101`（status **待修复**）；**清理与回滚件**：`.zcode/tmp/backup-private_messages-3894.md`（记 `DELETED`＋完整 INSERT 回滚＋`private_conversations` 461 行快照；数据源 `jdbc:mysql://127.0.0.1:3306/campus_love`，MySQL 8.0.45，PID 6432；后端 PID 30324 `--spring.profiles.active=real --server.port=8080`，`/actuator/health` UP）；`TAKEOVER-HANDOFF.md:43-44` 记「3819→3818、会话 461 预览位回正、**全库残留 0**、3888/3893 完好」 | DB 备份件 + 台账 | **实际已清理，但台账仍写「待修复」→ 状态过期**（见 §4-D7）。**新暴露未授权项**：测试语预览 `private_conversations` 390/461（源消息 3893、3334）是否清理 —— `TAKEOVER-HANDOFF.md:80` 记「未授权」 |

### 3.9 测试台 / 工作流自身缺陷（**本轮真正的 P0/P1 集中在这里**）

| id | sev | 缺陷 | 磁盘证据 | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R2VIS-TMP-TOUR-R2-001` | **P0** | 位置授权系统弹窗从未被处理 → **整页取证被遮罩污染（多组页面有效帧为 0）** | `findings/VISUAL-WAVE2.json` → `issues[]`；旁证 `screenshot-manifest.json#permissionSuppression.mockMethods`（6 个 wx 方法被 mock 抑制：`getLocation/chooseLocation/authorize/getSetting/requirePrivacyAuthorize/getPrivacySetting`）与 `shots[].permSuppressed=true`（**254/254 全中**）、`permSuppressedUnconfirmed=true` | 像素普查（原生「允许」按钮 `#07C160` 绿，y>85% 区域） | 待修复 |
| `MP-R2VIS-TMP-TOUR-R2-002` | **P0** | 状态帧未做内容哈希比对 → **29 组「不同状态」帧字节相同（267 帧中 10.9%）**，「核心页 ≥6 状态」配额被同名不同质凑满 | `VISUAL-WAVE2.json`；**本轮已部分修**：`screenshot-manifest.json#stateNotApplied[]` 现记 **37** 条、`quotaSemantics` 字段明文「只有 `countsTowardStateQuota=true` 的帧可计入配额；`aliasLabel=true` 的数据态/空态是同帧别名…上一轮把它们当独立状态帧落盘，正是评审 A-2 的 29 组重复来源」；实测 `countsTowardStateQuota=true` 仅 **241/254** | 脚本 sha256 比对 | 已修一半（配额口径已立，见 §4-D3） |
| `MP-R2VIS-REPORTS-AUDIT-SCREENSHOT-MANIFEST-001` | **P0** | 两份 screenshot-manifest 的 **gitSha 硬编码 `aefd8a72`**（HEAD 实为 `18c91ccf`）且 R2 manifest 仅 8 shot → 全部终验证据按契约过期 | `VISUAL-WAVE2.json`；**已修**：`tmp/tour-R2.mjs:71` 留有原缺陷注释「原 defect：`const GIT_SHA = 'aefd8a72'`…」，`:83` 现为 `gitOut(['rev-parse','--short','HEAD']) \|\| 'unknown'`，`:1376` 新增 `gitSha==='unknown'` 告警；盘上现值 `reports/audit/round-2/screenshot-manifest.json.gitSha="18c91ccf"`、`round-2-tour/manifest-detail.json.gitSha="18c91ccf"` | 脚本 grep + 读码 | **已修复**（但 `round-1-tour/manifest-detail.json.gitSha` 仍为 `aefd8a72` → 旧轮证据永久过期，只能按 §4-D1 处置） |
| `MP-VIS-V6-00` | **P1（取证）** | **manifest 与盘已脱钩**：`round-2-tour/{A,B}/` 未清空即复用，磁盘 304 张 1x 帧中 **50 张不在 manifest `shots`**（孤儿帧），其中 **39 张仍是 11:0x–12:xx 旧快照（`aefd8a72`）的位置授权弹窗污染帧**；更严重的是 manifest 对部分孤儿帧给的 `contentHash`（`A/pages_messages_index__空态.png` 记 `3e6b3ce5ef9ac912`）**与盘上实际字节哈希 `428a5662791d1b5e` 不一致** → **V1–V5 五组视觉审查正是这样审到旧帧，并把旧帧缺陷当成本轮结论** | `.zcode/tmp/visual-audit-V6-newframes.md:25`、`:39`；处置记录 `.zcode/tmp/orphan-frames-migration.md`（50 张**完整搬迁**至 `.zcode/tmp/orphan-frames-from-12xx-run/`，实测现存 **50** 文件；二次保险副本 `.zcode/tmp/backup-round-2-tour-pre-capture/`，实测 **267** 张 PNG；迁移后「磁盘 1x 帧=254、manifest=254、**孤儿=0**」）| 逐张像素签名普查 + `sha256` 对照 | **本轮已搬迁处置**；防复发判据（原文建议）：Gate G6 增「孤儿帧数 == 0 且 manifest.contentHash 与盘上字节一致」 |
| `MP-R2VIS-TMP-TOUR-R2-003` | P1 | 「交互后」帧不落 `getCurrentPages()` 栈顶路由 → 无法区分页内交互与跳出他页，**错标可长期伪装成覆盖** | `VISUAL-WAVE2.json`；本轮该维度**已可观测**：`screenshot-manifest.json#routeDrifts[]` **13** 条、`shots[].routeFromCurrentPage`/`routeDisagree` 字段已存在（例：`subpackages/discover-extra/discover/match-success`「交互后」实落 `pages/discover/index`，`action="tap 通用入口 [class*=\"btn\"]"`，severity P3） | 脚本 | 部分修复 |
| `MP-R2VIS-TMP-TOUR-R2-004` | P1 | **取证视口只有 1x（378×814），字级判定不可达**；`r11-acceptance` 更只有 189×408 | `VISUAL-WAVE2.json`；自证 `screenshot-manifest.json#captureLimitations.apiEvidence`：`miniprogram-automator/out/MiniProgram.d.ts:6-8 IScreenshotOptions{path?}` + `MiniProgram.js screenshot(){send("App.captureScreenshot")}` **无参** → `frameSizes.limitation` 记「本轮仍只能 1x 出图」，`distribution={"378x814": 254}`（**全部同尺寸、零 dpr**）；设备实为 `iPhone 12/13 (Pro) pixelRatio:3` → 3x 能力被 API 抹平 | 读码 + API 签名 | **无法修复（API 限制）**，改用 `zoomFrames[]` 345 张最近邻放大裁切辅助帧，且 `upscaleAddsDetail:false` 自证「不产生新细节，不计入配额」 |
| `__CAND__` 选择器解析 | **P0 级噪声源** | 文案候选解析失败仍照常执行 → **194/289 FAILED（67.1%）为噪声**；中途分诊件独立佐证同一现象（14:49Z 时点：141 条候选解析失败 = 65%，具名选择器 76 条），其中 **67 条属「无文案，纯候选列表耗尽」** | 本文 §2.2 脚本分类；`.zcode/tmp/exec-failure-triage.md:10-11`、`:30`（`(无文案，纯候选列表耗尽) 67`）；`TAKEOVER-HANDOFF.md:48` 记「11 条已复发有 **7 条是假复发**（报告早于修复提交 79 秒）」 | 脚本输出 + 中途分诊 | 未修复（v3.2 草稿已提 `__CAND__` 隔离，见 §4-D2） |
| 截图落盘失败 | P1 | **`evidence[]` 1270 条路径中 437 条带 `ERROR:timeout waiting for automator response`（34.4%）**；**536/941 用例（57.0%）没有任何干净 PNG 证据**，其中被标 `EXECUTED` 的 523 条里 **298 条（57.0%）无干净帧** | `exec-results.json` → `results[].evidence[]` 字符串后缀；逐条计数（脚本可复算）；`mode-dependent-issues.json` 多处 `shot` 字段自述落盘失败（如 `[18]` PFI01-after、`[76]` N02 after「保存超限失败」） | 脚本 | 未修复 |
| automator 能力缺口 | P1 | `swipe` 无元素 API（`pre:swipe left unsupported(no element api)`）、`el.input is not a function`（16 条）、桌面模拟器**不渲染软键盘** → 键盘弹起态结构性不可达 | `mode-dependent-issues.json` → `MP-R1-DISCOVER-HISTORY-203`；`exec-failure-triage.md`（`el.input`）；`reports/screenshots/round-2-tour/manifest-detail.json` → `failures[]`：`键盘弹起态不可达：未命中输入框（桌面模拟器不渲染软键盘）` **3** 条、`表单页校验错误态不可达：未命中提交选择器` **2** 条、`reLaunch 失败` **2** 条、`落在 pages/login/index 而非目标页` **1** 条（合计 45 条，`state-not-applied` 37 + 真失败 8；按身份 A 21 / B 24；按 severity P3 24 / P2 18 / P1 3） | 脚本 + 日志 | 未修复（129 条 SKIPPED 全量归因于此，见 §2.2） |
| 身份注入恒为 `user-1001` | P2 | manifest 约定 A=100158/B=100159，注入后轮询得 `user-1001` 并**自报 `MISMATCH!`** → 双身份互斥前置失效；`stores/session.ts:34-40`（R4-00134 全家桶统一）在 mock 下无法满足固定身份表 | `mode-dependent-issues.json` → `MP-R1-IDENT-01`(P3)、`MP-R1-HOME-109`(P3)、`MP-R1-C21-003`(P2)、`MP-R1-C24-002`(P2，记「exec-results 全部 **75 条** pre:login MISMATCH 标注」)、`MP-R1-C26-003`(P2，49 条中 43 条不可仲裁)、`MP-R1J-VILLAGE-INDEX-002`(P3)、`MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-011` 相关；`fixtures.ts:1383-1396`/`680-694` 被引为「有 token 即返回 `mockLoggedInSession`（profileCompleted=true、campusVerified=true）」 | 执行器自报 | 未修复 → **B 身份取证整体作废**（旁证：`reports/screenshots/round-1-after/` A=114 帧 / **B=2 帧**） |
| 9420 会话泄漏 + 锁争用 | P1 | ①tour 与 exec 抢同一 `ws://127.0.0.1:9420` 租约，exec 首次启动直接 `LOCK_BUSY` / `EXEC_EXIT=3`；②锁记录见 **6 个外部 client pid、89 条连接**，verdict「idle/leaked sessions」但协议**禁止 taskkill**；③终止后锁文件仍 `status:"LEASED"`（**租约墓碑未释放**，`leaseUntil` 16:21:42Z） | `.zcode/tmp/exec-R2.log`（全文 786 B）；`tmp/qa/locks/wechat-automation-9420.lock`（273 B，`owner r2-exec-subagent-R2`、**`pid 40468`**、`acquiredAt 10:59:06.253Z`、`lastHeartbeat 16:06:42.519Z`） | 日志 + 锁件 | 未修复（协议层缺口） |
| `G1 构建门禁与截图取证互斥` | P1 | `prepare-static.mjs:71` 会改名 `src/static`，而 DevTools 持句柄 → `mv` Permission denied，**完整构建必须先关 DevTools** | `TAKEOVER-HANDOFF.md:37-38`；实测复现于 `.zcode/tmp/build-mock-verify.log` 末行（`EXIT=1`，「失败未损坏仓库（1341 文件完整、无残留 `.bak.*`）」） | 日志 + 读码 | 未修复（结构性互斥，直接导致 §2.4 的 real 构建只能改道跑子集） |
| 产品化脚本目录硬编码 | P1 | `prepare-static.mjs` / `prune-unreferenced-static.mjs`（**会删文件**）/ `verify-package-size.mjs` / `verify-build-features.mjs` 全部**写死** `dist/build/mp-weixin`；且 `verify-build-features` **只挂在 mock 链，real 链根本不含** → real 产物从不经功能特征门禁 | `build-real-evidence.md:8`、`:36-38`；`UNI_OUTPUT_DIR` 可改道的依据 `@dcloudio/vite-plugin-uni/dist/cli/utils.js:128-131` | 读码 + 实测 | 未修复 |
| 特性开关硬关 → 16 帧为绕过门禁 | P2 | `isShowcaseMode=false`、`membershipEnabled=false` → 4 条路由（`subpackages/setup/showcase/index`、`vip/index`、`vip/promo-code`、`vip/bills`）根本进不去，只能记 `gateBypass`；`setup/showcase/index.vue:156-162` 无 `isShowcaseMode` 即**硬 `switchTab(discover)`** | `screenshot-manifest.json`：`gateBypassRoutes[]` 4 项、`gateBypassSemantics{}` 逐条给原因与配置来源、`gateBypassedShots=16`；`TAKEOVER-HANDOFF.md:67-70` 分诊为 `BUILD_FLAG_ABSENT` 4 | 脚本 + 读码 | 未修复（需 `mockWxMethod('switchTab')` 包住并标注「会员未开」） |
| 幽灵参数 | P2 | 参数表里 `?target=10003` 是**幽灵参数**——编译产物中 `target` 出现 **0 次** → `matching` 页直连必落 discover，被误报成「本页零截图」的页面级 P1 | `TAKEOVER-HANDOFF.md:69-70`（`PARAM_REQUIRED` 2：`campus/index` 缺 `school`、matching 幽灵参数）；对照 `mode-dependent-issues.json` → `MP-R1-MATCHING-101`（P1「本页本轮静态截图缺失」，其归因「?target=10003 直连落在 pages/discover/index」被分诊推翻） | 分诊（产物 grep） | 未修复（零成本解法：补 `scripts/r11-param-map.json` 两条参数） |
| 台账失明 | P1 | **237 个 `MP-*` ID 存在于 code-findings/findings/interact JSON 但未进任何 `issue-matrix`**（`MP-R2-*` 118、`MP-R1-*` 112、`MP-R3/R7/R8` 7）；例：`round-2/code-findings/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json` 的 `MP-R2-CIRCLES-INDEX-*` 在 `round-2/issue-matrix.md` 中 grep 结果 = **0**（矩阵目录 23 份清单亦不含该文件）→ 以「ID 是否在矩阵里」做全集比对会系统性漏项 | `VISUAL-WAVE2.json` → `collateralFindings[0]`（原文） | 脚本 grep 全集比对 | 未修复 |
| 队列自计数错误 | P3 | `fix-queue-wave2.md:192` 称「P1 16 条」，但同文件 §2 表内 `N-01` 亦标 P1（`:85`）未被计入 → 按表应为 **17** 条 | `VISUAL-WAVE2.json` → `collateralFindings[1]`；输入队列 `.zcode/tmp/fix-queue-wave2.md`（64 331 B） | 脚本对账 | 已按表落账（issues 内 N-14/N-15/N-33/N-39/N-53/N-93 六条移入 dupes） |
| 计划外噪声文件名 | P3 | 测试台把未展开的 shell 变量直接当文件名落盘：`reports/screenshots/r9-lifecycle$name.png`、`reports/screenshots/round3$1`、`报告/qa-20260904${name}.png`、根目录 `nul`(51 B)、根目录 `0`(14 B) | `ls` 实测（§0.1、§0.5） | 目录清点 | 未修复（卫生问题；`TAKEOVER-HANDOFF.md:28` 已提醒提交时禁 `git add -A`，「会带入 `reports/` 证据与根目录 `0` 垃圾文件」） |

### 3.10 视觉 / 布局类（状态栏叠印族、素材坏图、元素缺失）

| id | sev | 描述要点 | 证据（含截图） | 来源 | 状态 |
|---|---|---|---|---|---|
| `MP-R1-NP-001` | P2 | **「附近的人」全部列表行头像整体不可见**（A/B 双身份、全部 9+ 行一致）：无头像圆、无灰底占位、无骨架，昵称顶到行左缘，96rpx 塌陷。同批对照 segment / likes / likes-visitors 头像正常 → 仅本页全缺（自述「处于 P1/P2 之间」却记 P2） | `mode-dependent-issues.json` → `[100]`（`次要21.json:1037`），`shot=reports/screenshots/round-1-tour/A/subpackages_discover-extra_nearby_people__默认.…` | 截图 + 同批对照 | 待修复 |
| `MP-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-003` | P2 | **封面素材本体是坏图**：`circle-sky.png`（185×195，36383 B）上部 60% 圆角星空、下部白底并误嵌灰蓝 home 线性图标 → 观感等同加载失败（A/B 双身份两张滚动截图中该图标随卡片滚动，非悬浮控件） | `mode-dependent-issues.json` → `[74]`（`SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json:900`） | 截图 + 素材本体尺寸/字节实测 | 待修复（素材缺陷，非代码缺陷） |
| `MP-R1-SEARCH-301` | P2 | 搜索页常驻「取消」按钮与微信原生胶囊矩形**相交**（绿色文字上缘被胶囊圆角压住，4x 放大件清晰可见）；`padding-top` 仅 `statusBarHeightPx+16rpx`（`search/index.vue:217`） | `mode-dependent-issues.json` → `[100]`（`次要22.json:1054`），`shot=…/subpackages_tools_search_index__默认.png（B 同）；放…` | 截图 + 4x 裁切 | 待修复 |
| `MP-R1-TAGPOSTS-201` | P2 | **mock 模式标签聚合功能完全不可用**：带 `#摄影` 的帖子存在于村口广场（北岛帖），但聚合页恒渲「暂无帖子」；与已报 `TAGPOSTS-101`（详情断链）叠加 | `mode-dependent-issues.json` → `[99]`（`次要20.json:1023`） | 截图（A/B 双身份） | 待修复 |
| `MP-R1-CERT-201` | P2 | 滚动后「学生认证」头部随内容滚走，表单顶入状态栏叠印（`subpackages_campus_campus_certification__滚动-中…`），A/B 一致 | `mode-dependent-issues.json` → `[99]`（`次要20.json:1020`） | 截图 | 待修复 |
| `MP-R1-SETUPPROFILE-004` | P2 | 滚动后「TA」性别字段行与系统状态栏文字直接重叠（`navigationStyle=custom`，`pages.json:36`，无吸顶导航、无状态栏占位） | `mode-dependent-issues.json` → `[102]`（`次要24.json:1091`），`shot=B/subpackages_setup_profile_index__滚动-底部.png` + 3 倍放大件 `tmp_scrollbottom_top_3x.png` | 截图 + 放大件 | 待修复 |
| `MP-R1-SECURITY-301` / `MP-R1-SETTINGS-301` | P3×2 | 大标题「安全中心」/「恋爱认证」行滚入状态栏区与 `●●●●● WeChat` 字形叠印不可读；根因 `.safe-top` 占位（`settings/index.vue:436`）与 `.nav-bar` 未 fixed | `mode-dependent-issues.json` → `[100]`（`次要22.json:1055,1056`） | 截图 | 待修复 |
| `MP-R1-HEARTSIGNALS-301` | P3 | 待处理列表已过期信号同时渲红字「已过期」**和**可点击的「拒绝/接受」按钮（`heart-signals/index.vue:326-333` 无条件分支），倒计时逻辑已能判定过期 | `mode-dependent-issues.json` → `[100]`（`次要22.json:1057`） | 截图 + 代码 | 待修复 |
| `MP-R1-SECURITY-302` | （空级） | 登录设备行 badge 与副标题同文案重复：「HUAWEI Mate 80 [当前设备] / 当前设备」（`security/index.vue:135` 把 `lastActive` 也填「当前设备」） | `mode-dependent-issues.json` → `[100]`（`次要22.json:1058`） | 截图 + 代码 | 待修复 |
| `MP-R1VIS-PAGES-NEARBY-INDEX-006` | P3 | 「滚到底最后一条完整可见」未获验证且现有证据与其矛盾：末条（阿萍）互动栏完全不可见（照片底缘 y≈711-729、绿心钮顶 y=727、按 160rpx TabBar 推算栏顶 y≈740） | `mode-dependent-issues.json` → `[76]`（`PAGES-NEARBY-INDEX.json:807`），`shot=reports/screenshots/round-1-tour/A/pages_nearby_index__滚动-底部.png` 与 B 同名 | 截图 + 像素几何推算 | 待修复 |
| `MP-R1VIS-PAGES-NEARBY-INDEX-008` | （空级） | 理想图右下角绿色「➕」FAB **缺失**（8 张状态截图全无），发动态入口仅存头部绿色胶囊；功能在（N03/N04 已测通），属 L3 交互位置偏差 | `mode-dependent-issues.json` → `[76]`（:809），`shot=…/pages_nearby_index__默认.png（全页，右下角）` | 截图 vs 理想图 | 待修复 |
| `MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-105` | P3 | 计分行「图标-文案」语义错位由**行号硬编码**导致（`scoreIcons=[RUN,MUSIC,BOOK,FOOD]` 固定行序，`MatchSuccess.vue:43`，标签可变 `:50`）：第 1 行跑步图标配「旅行爱好」、第 3 行书本配「电影…」，对真实数据同样错配 | `mode-dependent-issues.json` → `[71]`（`…MATCH-SUCCESS.json:977`），`shot=reports/audit/round-1/findings/_tmp_crops_MS/scorecard_top.png` | 截图裁切 + 代码 | 待修复 |
| `MP-R1-PAGES-PROFILE-INDEX-003` | P3 | 未登录态与理想图结构性偏差：四格统计实况为「关注/粉丝/获赞/匹配」，理想图未登录稿与登录态均为「我喜欢/喜欢我的/我赞/访客」，且 `NotLoggedProfile.vue:16` 注释自称与已登录 `MyStats` 对齐（实际不对齐） | `mode-dependent-issues.json` → `[73]`（:850） | 截图 + 注释自证 | 待修复 |
| `MP-R1-PAGES-PROFILE-INDEX-004` | P3 | 「我的匹配」行右侧计数完全空白（0 值被 `v-if` 整体隐藏），用户无法区分「0 匹配」与「未加载」；理想图恒显示计数（0 值显示「0人」） | `mode-dependent-issues.json` → `[73]`（:851），`shot=…/pages_profile_index__滚动-中部.png（B 轮同）` | 截图 + 理想图对账 | 待修复 |
| Wave-2 视觉席 80 条（P1 11 / P2 37 / P3 27 / P4 2，**全部待修复**） | | 代表条：`MP-R2VIS-PAGES-MESSAGES-INDEX-006`（P1，conf 0.7，mock 会话 `unreadCount` 全 0 → 效果图 4 处未读角标零取证，TabBar 区红像素扫描 0 命中）；`MP-R2VIS-PAGES-MESSAGES-INDEX-005`（P1，`warmPeople`/`activityRecommendations` mock 恒空 → §3.6 两个整分区在全部可用帧中不渲染）；`MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001`（P1，同屏三处互指不同城：文案「南京」+ 坐标 113.2644/23.1292（广州）+ 校区「北京大学」，根因逆地理空则回退 ip-city、city 与 coords 不同源）；`MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-001`（P1，hero 分享钮**命中区 100% 落在原生胶囊内**且参考图「更多 ⋯」缺失）；`MP-R2VIS-PAGES-HOME-INDEX-002`（P1，装饰爱心 image 缺 `pointer-events:none`，可能吞约 20×20px「去邀请」CTA 热区） | `reports/audit/round-2/findings/VISUAL-WAVE2.json` → `issues[]`（80 条，每条含 `id/page/severity/category/status/confidence/sources/description/evidence`）；帧来源 `evidenceBase.screenshotCorpusUsed = .zcode/tmp/backup-round-2-tour-pre-capture/{A,B}/`（实测 **267 帧**冻结快照）+ `round-1-tour/`、`round-1-after/`、`round-1-interact/`、`r11-acceptance/`；**明确排除** `reports/screenshots/round-2-tour/`（正被覆盖） | 截图 + 代码双证（`sources`: code 73 / screenshot 58 / log 7） | 全部待修复；`statusCeiling` 自述「**本轮只落账，无任何条目经运行时确认；不声明已修复/已验证**」 |

> **Wave-2 视觉席的证据质量自证（必读）**：`confidenceRule` 原文规定「仅遮罩污染帧/0.5x/1x 不可判读的像素推断 → **≤0.35**；纯代码/文件存在性推断 → **≤0.4**」。实测 80 条中 **conf<0.6 者 42 条（52.5%）**，**conf≥0.9 者 0 条**，最高仅 0.75。→ 该批 P1 不具备"运行时确认"效力。
> **另有 24 条 `dupes[]`** 经真实 grep 复核判为与既有台账同缺陷，按队列 G5 口径「补证据不新增 ID」未立项（`dupesNote` 原文），例：`N-14` → 等价于 `MP-R1-PAGES-HOME-INDEX-112` + `-030`（`InterestRecommendation.vue:25-29` `coverSrc()` 对 `/` 开头 mock icon 直通放行 → 绕过 `circleCoverFor` 照片映射）。
> **9 条 `WAVE2-AFFORDANCE-PENDING.json`（P2 2 / P3 3 / P4 4，全部 `待裁决`）**：「提及好友」行假 affordance（`publish.vue:867` 行带 `›` 与 `role=button`，`:341` 函数体只有 toast「即将开放」）、`selectTarget` 内 `if (!circle.isJoined) return;` 静默 no-op、「发布」钮 disabled 视觉却保留 `@tap`、4 处 `env(safe-area-inset-bottom)` 写法不一致、`.chat-session-back` 死样式、`components/chat/ChatInput` 全仓无引用（死代码候选，conf 0.35）。`note` 自述「均未修复、未验证；主控已抽验其中 3 条」。

---

## 4. 证据指向的工作流定义缺陷

只列**证据支持**的；每条给出可直接定位的定义/产物路径。当前定义：`.zcode/workflows/miniprogram-qa-loop-v31.dwf.ts`（82 169 B，09-21 22:49，**本轮实际运行的版本，`screenshot-manifest.json#workflowVersion="3.1"`**）；草稿：`.zcode/workflow-drafts/miniprogram-qa-loop-v31.dwf.ts`（gitignored，`TAKEOVER-HANDOFF.md:57-60` 记 825-847 行已打 A5 补丁）；后继：`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`（99 767 B，**09-25 00:15，终止后 9 分钟才写**）。

| # | 缺陷 | 磁盘证据 |
|---|---|---|
| **D1** | **provenance 只在会话开始时算一次并可被硬编码**，导致整轮证据与被测提交脱钩。定义内 `gitSha` 单点计算（`TAKEOVER-HANDOFF.md:52` 指 `.dwf.ts:635`「只算一次」），运行期 `gitSha` 亦沿用旧值 → **不触发过期判定**，只留 provenance 歧义 | `tmp/tour-R2.mjs:71`（原 defect 注释 `const GIT_SHA = 'aefd8a72'`）、`:83`（现改 `git rev-parse`）、`:1376`（新增 unknown 告警）；后果实物：`reports/screenshots/round-1-tour/manifest-detail.json.gitSha = "aefd8a72"`（HEAD 实为 `18c91ccf`）→ **R1 全部 305 帧按契约属过期证据**；`VISUAL-WAVE2.json#evidenceBase.framesGitSha = "aefd8a72（全部现存帧自报，按 DW:555 属过期证据）"` |
| **D2** | **选择器解析失败不隔离，失败即执行**：`__CAND__` 占位符（含被截断成单个汉字的中文标题）未命中时不 quarantine、不进 UNVERIFIED，而是照常 tap/input 并记 FAILED → 289 条 FAILED 里 **194 条（67.1%）是噪声**，真缺陷信号被淹没 | 本文 §2.2 全量分类（脚本可复算）；`reports/audit/round-2/interact/exec-results.json` → `results[].failureReason`；`.zcode/tmp/exec-failure-triage.md:10-11,30`（中途时点 141/217=65%，其中「无文案，纯候选列表耗尽」67）；`VISUAL-WAVE2.json` 队列方法学亦承认按「物理缺陷签名」而非 ID 判定 |
| **D3** | **缺「证据 == 盘」不变量**：manifest 的 `contentHash` 与盘上字节可以不一致、目录可以残留上一轮帧而不被发现 | `.zcode/tmp/visual-audit-V6-newframes.md:25`（`A/pages_messages_index__空态.png` manifest 记 `3e6b3ce5ef9ac912`，盘上实为 `428a5662791d1b5e`；**50 张孤儿帧 / 其中 39 张旧弹窗污染帧**）、`:39`；处置件 `.zcode/tmp/orphan-frames-migration.md`（原文建议「Gate G6：孤儿帧数 == 0 且 manifest.contentHash 与盘上字节一致」）；搬迁实物 `.zcode/tmp/orphan-frames-from-12xx-run/`（实测 50 文件）+ `.zcode/tmp/backup-round-2-tour-pre-capture/`（实测 267 PNG） |
| **D4** | **状态配额可被"同名不同质"帧凑满**，且修复只做了一半：在册帧加了哈希判定，**目录未清、哈希未回校** | `screenshot-manifest.json#stateNotAppliedCount=37`、`quotaSemantics` 原文（自认「上一轮把它们当独立状态帧落盘，正是评审 A-2 的 **29 组重复**来源」）、`countsTowardStateQuota=true` 仅 241/254；`round-2-tour/manifest-detail.json#failures[]` 45 条中 `state-not-applied` 占 37 |
| **D5** | **没有"无法取证"这一等态**：执行器只有 EXECUTED/SKIPPED/FAILED 三态，`judge` 层的 UNVERIFIED/不可仲裁只存在于自然语言 → 298 条被记 `EXECUTED` 的用例其实**无任何干净截图** | 三态实证：`exec-stop-snapshot.json#status`（仅 3 键）、`exec-results.json` `status` 取值域 = {EXECUTED,SKIPPED,FAILED}；无干净帧统计见 §3.9；UNVERIFIED 只在文字里：`mode-dependent-issues.json` → `MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-109`（45 项中 40 UNVERIFIED）、`MP-R1-C26-003`（49 条中 43 不可仲裁）；天花板自证 `TAKEOVER-HANDOFF.md:48-49`：「999 条 UNVERIFIED 中 **EXECUTOR_FAULT 567**、AUTOMATOR_LIMIT 231、MODE_DEPENDENT 仅 82、AMBIGUOUS 111、DATA_OR_AUTH 8 → **VERIFIED 上限约 25.8%**（非 mock 单一问题）」 |
| **D6** | **real 阶段不是门禁、只是"事后补跑"**：mock 与 real 在定义里没有先后依赖，real 产物 14:55Z 才产出、终止时（16:06Z）一条用例都没跑；且 real 链缺 `verify-build-features` 门禁 | `.zcode/tmp/build-real.log` 末行 `BUILD_EXIT=0`、`build-real-evidence.md:42-43`（原文「产物已就位且独立成目录…**不需要再重建**」）；`ops/*.json` 内 `REAL_ONLY` 标记 **285** 处（占计划 25.7%）永远拿不到判定；`screenshot-manifest.json#buildFingerprint.buildMode="build:mp-weixin:mock"` 是唯一被记录的模式 |
| **D7** | **台账状态不回写、多本账互相不收敛**：同一缺陷存在 2–4 个 ID；已清理的 DB 残留仍挂"待修复"；"待修复"总量三处口径互斥 | 双/多 ID 实证：i18n 同缺陷 4 ID（`MP-R1-CAMPUSINDEX-001`/`-REQ-002`/`MP-R1-REG-CAMPUSINDEX-001`/`-002`）；VILLAGE 热度榜 2 ID（`MP-R3-VILLAGE-INDEX-002` + `MP-R1-VILLAGE-INDEX-002`）；官方号助手断链 2 ID（`…-001` + `…-102`）；circle-home 点赞假值 2 ID（`MP-R1-CIRCLEHOME-102` + `MP-R1-REQ20-005`）。状态过期实证：`MP-R1-PAGES-MESSAGES-INDEX-101` 待修复 vs `.zcode/tmp/backup-private_messages-3894.md` 已 `DELETED`。总量口径：`harvest.json` `status.待修复=335` vs `TAKEOVER-HANDOFF.md:45`「待修复 **552**（P0 0/P1 36/P2 96/P3 259/P4 161）」且自注「旧『674 待修复』虚高」；`VISUAL-WAVE2.collateralFindings[0]` 另记 **237 个 ID 从未进矩阵** |
| **D8** | **"零截图"被当成页面级 P1 立项，实际全是测试台问题**，定义里缺一条"落点分诊先于立 P1"的闸 | `mode-dependent-issues.json` 4 条 P1（`MP-R1-PAGES-REGISTER-INDEX-013`、`MP-R1-PAGES-REGISTER-SUCCESS-008`、`MP-R1-CAMPUSINDEX-010`、`MP-R1-MATCHING-101`）；反证 `.zcode/tmp/nav-bounce-triage.md` + `TAKEOVER-HANDOFF.md:67-73`：13 页弹跳分诊 **`GENUINE_APP_DEFECT = 0`**（`BUILD_FLAG_ABSENT` 4 / `PARAM_REQUIRED` 2 / `HARNESS_CALL_DEFECT` 7），并推翻 R1 的「落在 discover = mock 自动前进」归因（`session-guard.ts:84-95` 是死代码，`AUTH_GUARD_BOUNCE=0`）；`screenshot-manifest.json#gateBypassedShots=16` 已把 4 条门禁路由单列 |
| **D9** | **单实例资源锁与运行时序无协调**：tour 与 exec 争 `ws://127.0.0.1:9420`，exec 首轮直接 `LOCK_BUSY`/`EXEC_EXIT=3`；锁存在外部泄漏会话（89 连接 / 6 pid）但协议禁 taskkill；终止后锁文件仍 `LEASED`（无 tombstone 释放） | `.zcode/tmp/exec-R2.log`（`startup 10:50:18.783Z` → `LOCK_BUSY` → `[launcher] 10:57:25.621Z 锁已可接管`）；`tmp/qa/locks/wechat-automation-9420.lock`（`pid 40468`、`status:"LEASED"`、`lastHeartbeat 16:06:42.519Z`、`leaseUntil 16:21:42.519Z`、`externalClientsObserved` 内嵌 verdict）；构建与取证互斥另见 `TAKEOVER-HANDOFF.md:37-38`（`prepare-static.mjs:71` vs DevTools 句柄） |
| **D10** | **终止时三份状态产物互不一致，没有单一真值源**：922 / 940 / 941 三个用例数、282 / 288 / 289 三个 FAILED 数、`次要19` 15 / 19 两个 caseId 数，全部在 **100 秒内**分叉 | `tmp/qa/checkpoints/exec-R2.json`（`updatedAt 16:05:00.445Z`，21 suite，20 `completed` + 1 `running`，`sum(executed)=922`、`sum(failed)=282`，`次要19` `executedCaseIds` 15 条，**`failures: []` 恒空**）；`.zcode/tmp/exec-stop-snapshot.json`（`updatedAt 16:05:55.307Z`，cases 940 / FAILED 288）；`interact/exec-results.json`（`updatedAt 16:06:40.116Z`，941 / FAILED 289）。另 `id` 仅 911 唯一（941 条）→ 跨 suite ID 复用 30 组，按 ID 去重必然低估 |
| **D11** | **计划的 24 套与"记录到 21 套"之间无对账闸**，被终止的 166 条（含 VILLAGE 整套 116 条）不进任何缺口报表；快照字段名 `suites_recorded` 掩盖了 `suites=24(dynamic)` 的事实 | `tmp/qa/checkpoints/exec-R2.json.script=".zcode/tmp/r2-exec.cjs"` + `.zcode/tmp/exec-R2.log`（`suites=24(dynamic)`）；`reports/audit/round-2/ops/` 24 份 `cases[]` 合计 1107；`interact/exec-results.json` 21 suite / 941；`console-*.log` 21 份；**VILLAGE 三 suite 有 `ops/`、有 `code-findings/`、贡献 `mode-dependent-issues.json` 10 条问题（含 3 条 P1），却 0 条执行记录** |
| **D12** | **A/B 双身份在 mock 构建上是不可满足的前置**，定义却仍按"双身份各一份"要求覆盖，且身份注入失败只写进 `observed` 自报、不阻断立案 | `MP-R1-IDENT-01` 原文「Manifest 身份固定表（A=100158/B=100159）**在 mock 构建下不可满足**」（引 `stores/session.ts:34-40`、R4-00134）；`MP-R1J-VILLAGE-INDEX-002`（`services/mocks/fixtures.ts:1383-1396`、`680-694`）；`MP-R1-C24-002` 记 `tmp_r11_login.json`/`tmp_r11_guest.json` 的 **JWT `exp=1790088124` 早于套件执行时刻**（toast 首条 `ts=1790141167` ≈ 2026-09-23T05:19Z）→ **凭证过期仍照跑**；实物旁证 `reports/screenshots/round-1-after/` A=114 帧 / B=**2** 帧 |
| **D13** | **取证 API 上限未前置声明**：截图 API 不支持 dpr，全轮 254 帧恒 378×814（设备实为 pixelRatio 3），字级判定只能靠 345 张最近邻放大裁切帧，而定义里"视觉可判"要求未据此降级 | `screenshot-manifest.json#captureLimitations`（原文引 `miniprogram-automator/out/MiniProgram.d.ts:6-8`、`MiniProgram.js screenshot(){send("App.captureScreenshot")}` 无参）、`frameSizes.distribution={"378x814":254}`、`zoomFrameCount=345` 且每条 `upscaleAddsDetail:false`、`deviceInfo.pixelRatio:3` |
| **D14** | **权限抑制是"未经确认"的**：6 个 wx 权限方法被批量 mock 抑制，254/254 帧 `permSuppressedUnconfirmed:true` → 凡依赖真实授权链的取证（定位、隐私、麦克风）在定义上就无法背书 | `screenshot-manifest.json#permissionSuppression`（逐方法给出真实调用点：`utils/location.ts:34`、`utils/privacy.ts:257`、`utils/audio-recorder.ts:264/273` 等）与 `shots[].permSuppressed/permSuppressedUnconfirmed` |
| **D15** | **`workflowVersion` 与后继版本关系无记录**：本轮跑 v3.1，v3.2 在终止后 9 分钟才出现，两版并存且都未提交，导致"哪些缺陷已被新定义堵住"无法从磁盘判定 | `.zcode/workflows/` 目录实测：`miniprogram-qa-loop-v31.dwf.ts`（09-21 22:49）+ `miniprogram-qa-loop-v32.dwf.ts`（**09-25 00:15**）；`.zcode/workflow-runs/` 15 份 `dwfrun-*.mjs`，本轮 runner `dwfrun-dd96988a-….mjs`（103 778 B，**09-25 00:03**）；`TAKEOVER-HANDOFF.md:5` 另记「会话内无 workflow MCP 工具，**无法由 CLI 续跑**」、`:3` 记 dwf 运行自 12:30 起静默（`dwfrun-addb38f0-…`，actor hook-state 冻结 12:25:28）→ **定义无断点续跑能力，静默即需人工接管** |
| **D16** | **修复与取证在同一工作树内耦合**：26 个源码路径长期未提交、HEAD 不可构建，而 exec 又在同一 `dist` 上跑 | `TAKEOVER-HANDOFF.md:13-33`：「未提交改动（26 个源码路径，HEAD 仍 `18c91ccf`）」+「**HEAD 不可构建**：`setup/schedule/index.vue:9` 缺 `ref` 导入而 `:50` 用了 `ref(false)`，全仓无 auto-import；同类违规 HEAD 1 处、工作树 0 处」；`screenshot-manifest.json#gitWorktreeDirtyPaths=35`、`VISUAL-WAVE2.evidenceBase.headAtAudit="18c91ccf + 34 个未提交路径"`（**34 与 35 又差 1**）；本轮 exec 跑在 15:57 的 mock 产物上，而 wave3 改动 23:2x 才落地 → `wave3-decisions-landed.md`「**两处改动尚未生效**：① 客户端改动要等下一次重建产物（现跑的是改前的 mock 包，real 包也是改前构建的）；② 后端改动必须重启 8080 才生效」 |
| **D17** | **`reconnects` 恒 0 但 automator 超时 437 次** → 定义里没有"通信劣化即降级/重连"的处置 | `tmp/qa/checkpoints/exec-R2.json` 21 个 suite 全部 `reconnects:0`；对照 `exec-results.json` `evidence[]` 437 条 `ERROR:timeout waiting for automator response`（§3.9） |

---

## 5. 未能取证的项

以下均经实际查找后确认**无法从磁盘取证**，列出查找位置以便下一轮定向补：

1. **任何 DB 侧行数/计数快照** —— `apps/api/logs/` 4 个日志文件内 `INSERT`/`UPDATE `/`DELETE FROM` 计数全为 0（日志级别不含 SQL）；仓库内无 DB 计数导出件。间接值仅 `e2e-sync-findings.md:16` 的 total 182→183 与 API 日志 `updated=183→184`。**查过**：`logs/`、`apps/api/logs/`、`tmp/`、`.zcode/tmp/`、`database/`、`docker/`。
2. **docker 容器日志** —— `docker/` 与 `docker-compose.yml` 在，但**本轮无任何 docker logs 落盘产物**；`appendonly.aof`（Redis，2 138 517 B，mtime **09-04**）与本轮无关。**未取证**：9420/8080/MySQL 容器的运行期 stdout。
3. **微信一键登录（`wx.login`）真机链路** —— F-4 判本机必 502（`appid missing`，无 secret），绕道只走了 `guest-login`。原文结论：「A 链（登录）只能证到 guest/phone 两路，**wx 路必须记为未取证**，除非授权改后端配置并重启」。**未取证**：`getPhoneNumber` 快捷登录真实回调链（同时是 `MP-R1-PAGES-LOGIN-INDEX-004` 这条 P1 的取证缺口，其 `shot` 字段原文即「无（代码层审查；建议 A1 交互取证在 MP-WEIXIN 真实后端 + 未登录态实测复现）」）。
4. **VILLAGE 三 suite（116 条用例）的任何运行时证据** —— `ops/`+`code-findings/` 有，`exec-results.json` 零记录；其 10 条问题（含 `MP-R3-VILLAGE-INDEX-002`、`MP-R1-VILLAGE-INDEX-002`、`MP-R1-PUBLISH-101` 三条 P1）全部只有代码层依据，其中 `MP-R1-VILLAGE-INDEX-002` 的 `shot` 自述「本轮交互用例 **VI39 未取证**」。
5. **`次要19` 被截断的 50 条用例** —— 计划 69、记录 19，`checkpoints/exec-R2.json` 该 suite 状态 `running`、`finishedAt` 缺失。
6. **本轮（R2）的矩阵与终验/回归结论** —— `reports/final/`、`reports/regression/` 两目录 **0 文件**；`reports/audit/round-2/` 下 6 份 `.md`（`audit-report.md` 31 296 B、`git-summary.md` 4 495 B、`interaction-matrix.md` 97 997 B、`issue-matrix.md` 200 990 B、`regression-report.md` 38 027 B、`screenshot-matrix.md` 3 976 B）**mtime 全部停在 09-22 09:52，本轮一天内无一更新**；`round-2/` 下亦**无 `regression/` 子目录**（对照 `round-1/regression/` 有 21 份、`round-1/regression-report.md` 91 677 B 且 mtime 09-24 10:27）。→ **R2 无本轮矩阵、无回归明细、无终验报告；矩阵类结论仍是 R1 口径**。
7. **`ops/` 中 285 处 `REAL_ONLY` 前置的判定** —— 见 §2.3(c)。
8. **键盘弹起态 / 滑动手势 / 多路弹层关闭 / 拖拽滑块** —— 129 条 `action-not-automatable` SKIPPED + `manifest-detail.json#failures[]` 内 3 条「键盘弹起态不可达（桌面模拟器不渲染软键盘）」。
9. **298 条 `EXECUTED` 但无干净帧的用例**（含 `PAGES-HOME-INDEX` 的 H01/H05/H06/H07/H10…H47 等）—— 状态标为已执行，像素证据缺失，无法独立复核。
10. **wave3 三处改动的运行时效果** —— `vue-tsc --noEmit` 客户端 exit 0、后端以 `javac` 编译到临时目录 exit 0（`TAKEOVER-HANDOFF.md`/`wave3-decisions-landed.md`「为做到零风险**没有跑 `mvn compile`**」），但**未重启 8080、未重建产物、未截图** → 前端 `loginRequired` 文案、`hadSession` 分支、后台 `title` 列、`heart-filled` 反色渲染四项**全部未取证**；后端 Java 改动至今**仍在未提交工作树内**。
11. **`dwfrun-*.mjs` 是否等价于 `.dwf.ts`** —— 无法从编译产物反推定义源码行为；且 v3.1/v3.2 均未提交（`.zcode/workflows/.gitignore` 在 `workflow-runs/` 下存在，`.zcode/workflow-drafts/` 被 gitignore）。
12. **本轮的 git 提交状态** —— `TAKEOVER-HANDOFF.md:13` 记 HEAD 仍 `18c91ccf` 且 26 路径未提交；本报告未运行任何 git 写操作，工作树当前是否已被其它会话推进**未取证**。

---

### 附：本报告实际读取的证据源（数量统计见 §0）

`reports/audit/round-2/{interact/exec-results.json, interact/console-*.log(21), ops/*.json(24), code-findings/*.json(24), findings/VISUAL-WAVE2.json, findings/WAVE2-AFFORDANCE-PENDING.json, screenshot-manifest.json, harvest.json, audit-report.md}`；`reports/screenshots/round-2-tour/manifest-detail.json`；`.zcode/tmp/{exec-stop-snapshot.json, mode-dependent-issues.json, mode-dependent-issues-final.json, e2e-sync-findings.md, build-real.log, build-real-evidence.md, build-R2-mock.log, build-mock-verify.log, build-verify-nocommon.log, exec-R2.log, exec-failure-triage.md, TAKEOVER-HANDOFF.md, wave3-decisions-landed.md, real-assets-probe.md, orphan-frames-migration.md, recurrence-postfix-check.md, nav-bounce-triage.md, worktree-integrity.md, fix-queue-wave2.md, visual-audit-V6-newframes.md, backup-private_messages-3894.md}`；`tmp/{tour-R2.log, tour-R2.mjs, r2-gaps.tsv, r2-reshoot.tsv, r2-reshoot2.tsv, qa/checkpoints/{exec-R2.json,exec-R1.json,tour-R1.json,tour-R2.json}, qa/locks/wechat-automation-9420.lock, qa/harvest-test.json}`；`apps/api/logs/{campus-love-api.2026-09-24.0.log, campus-love-api.log, campus-love-api-error.log, audit.log, campus-love-api.2026-09-23.0.log}`；`apps/client/dist/{build/mp-weixin/config/env.js, verify-mock/config/env.js}`；`logs/{goal-build-mp-real.log, goal-build-real-static.log, build-mp-mock-*.log}`；`.zcode/workflows/`；另含 `reports/`、`tmp/`、`logs/`、`报告/`、`deliverables/`、`docs/` 目录清点。

**统计口径**：本报告结论所依据的**独立文件** ≥ **71** 个 —— 其中「程序化全量解析」41 份（`exec-results.json` 941 条、`ops/*.json` 24 份、两份 R2 manifest、`harvest.json`、`harvest-test.json`、两份 findings JSON、两份 mode-dependent JSON、`exec-stop-snapshot.json`、4 份 checkpoints），「逐份读取/检索」约 30 份（构建日志、API 日志、`config/env.js` ×2、`e2e-sync-findings.md` 等 md 台账、TSV 台账、锁件、脚本 `tour-R2.mjs`）。另对 **62** 个目录做了条目计数。

**未修改任何仓库文件、未构建、未启动任何进程**（`git status --porcelain` 复核：本任务唯一新增物为 `.zcode/research/` 下本报告；其余脏项均先于本任务存在）。
