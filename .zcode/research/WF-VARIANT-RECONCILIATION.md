# 工作流 DSL 三变体差异对账报告（A / B / C）

> 研究对象：`.zcode/workflows/miniprogram-qa-loop-v31.dwf.ts`（A）、
> `.zcode/workflow-drafts/miniprogram-qa-loop-v31.dwf.ts`（B）、
> `.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`（C）
> 本报告为只读研究产物，未修改任何被研究文件。

## 0. 变体身份与基线核实

| 变体 | 路径 | 行数 | 字节 | md5 | version 字段 | mtime |
|---|---|---|---|---|---|---|
| A | `.zcode/workflows/miniprogram-qa-loop-v31.dwf.ts` | 1284 | 82169 | `bd9abe4306bc087e06f76718a390dbe3` | `"3.1"`（A:24） | 2026-09-21 22:49 |
| B | `.zcode/workflow-drafts/miniprogram-qa-loop-v31.dwf.ts` | 1512 | 99475 | `080cbcb6ab7ba07628d2cc3d91462100` | **仍为 `"3.1"`（B:24）** | 2026-09-24 23:58 |
| C | `.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts` | 1432 | 99767 | `d948d3cfc607e46b43f12f9bd4d9bdf6` | `"3.2"`（C:26） | 2026-09-25 00:15 |

三者的 md5 / 行数 / 字节与任务书实测值一致，身份无歧义。

**最关键的结构结论：B 与 C 是两条互不相交的增量。**

- `grep -c "G7\|G8\|G9\|INSTRUMENT_RULES\|__CAND__\|UNI_OUTPUT_DIR" B` → **0 命中**：B 完全不知道 real 模式验收这回事。
- `grep -n "REAL_ENV\|真实截图铁律\|构建守门员\|run-pnpm22" C` → **0 命中**：C 完全不知道真实环境注入与构建守门员这回事。
- 两者相对 A 各自只改了 A 的既有区域，唯一真正重叠的编辑面是 `总验收官` 的 ask 数组与头部注释（详见 §3）。

差异规模（`diff -u --strip-trailing-cr -B`）：

| 对比 | hunk 数 | diff 行数 |
|---|---|---|
| A ↔ B | 10 | 426 |
| A ↔ C | 8 | 220 |
| B ↔ C | 15 | 633 |

## 1. A ↔ B 逐块分析（`diff -u -B --strip-trailing-cr A B`，10 个 hunk / 426 行）

> 注：`diff` 的行号是各自文件的真实行号；下表 A/B 两列即为引用锚点。

| # | A 锚点 | B 锚点 | 所在函数 / 阶段 | 变更内容 | 分类 | 已在 C 中体现？ |
|---|---|---|---|---|---|---|
| 1 | A:61 之后 | B:64-76 | 全局常量区（`WORKFLOW` 收尾与「数据结构」之间） | 新增 `const REAL_ENV = [...]`（13 行、7 条事实）：real profile 后端 8080 + `/actuator/health`、`/api/v1` 前缀、游客登录 `POST /api/v1/auth/guest-login`（账号 100151「阿辰」）、MySQL/Redis 只读约束、SUPER_ADMIN 凭据、wechatide skill 路径与 `scripts/devtools/wx10.ps1`、**登录态两步注入**、异常处置与提交纪律 | **新增能力**（把运行期环境事实写进协议，不再是口口相传） | **否**（C 全文无 `REAL_ENV`） |
| 2 | A:468-485 | B:479-509 | 工具层 `runPnpm()` / `buildGate()`（Gate G1/G2 的底座，被 `fixAndRegress`、终验、R2 全域调用） | ① `PNPM_ENTRY`（A:472 硬编码 corepack 绝对路径）→ `PNPM_WRAPPER = "tmp/run-pnpm22.cjs"`（B:485）；② 新增 `const gatekeeper = agent("构建守门员", …)`（B:496）；③ `buildGate()` 由 `return runPnpm([...])`（A:482）改为 `await gatekeeper.ask<{ok,err,command}>`（B:498-509），带「诚实铁律」禁止顺手修编译错误 | **新增能力 + 参数修订**（修的是真缺陷：`world.run` 沙箱对这条构建链秒级失败、PATH 里的 node 是 v16 导致 uni build 必挂） | **否**（C:494 仍是 `PNPM_ENTRY`，C:503-504 `buildGate` 仍直调 `runPnpm`） |
| 3 | A:539-547 | B:563-568 | 「复用子代理（跨轮积累上下文）」声明区 | `shooter`/`fixer`/`verifier` 三个常驻 agent 的提示词尾部拼 `+ REAL_ENV`；`"修复工程师"` 改名 `"修复工程师-R4"`（B:567）；`fixer`/`verifier` 各加一条**【真实截图铁律】**（截图是修复被采纳的唯一依据；无截图支撑一律 UNVERIFIED） | **提示词措辞 + 新增能力**（证据标准，属于验收口径的实质收紧） | **否**（C:588-590 与 A 逐字相同） |
| 4 | A:653 | B:677 | `auditRound()` 内 A1 单写者执行段（`exec0`） | `操作执行员-${label}` 提示词拼 `+ REAL_ENV`（登录态注入 / 9420 单写者 / 提交纪律进入 Driver） | **提示词措辞**（作用面是取证能力） | **否**（C:702 与 A 同；C 只在它的 ask 数组里加了 `INSTRUMENT_RULES`，见 C:714） |
| 5 | A:799 | B:823-845 | `regressionChunk()`（A5 历史回归员结果归集） | 新增 `stillOpen` 补录：把 A5 判读为 `仍开放/未修复/未整改/仍待修`、有 `id` 且 `!issueIds.has(id)` 的历史条目，折算成 `category=Regression`、`severity=P2`、`status=待修复` 的 Issue，经 `admit(..., "MP-"+label+"-"+chunkKey+"-REGOPEN")` 入 `allIssues` + `pushBoard`；log 增加「仍开放补录 N」 | **新增能力（真实协议改进）**：修掉一个逻辑洞——这类条目过去只有核对记录、不生成 Issue，**会绕开 worklist 永远无人修复**；注释同时明确「证据不足」不在此列以免制造噪声 | **否**（C 该区与 A 相同，仍只 log） |
| 6 | A:1074-1109 | B:1117-1294 | 主流程 R1 之后（A 的 `for (let n = 2; n <= 1 + WORKFLOW.audit.maxFixRounds; n++)` 影响范围回归轮，A:1077） | 整段替换为 **「v3.2 收尾改造」**（banner B:1121-1127）：`phase("R2 收割与工作树固化")`（B:1129）→ G0 环境预检 `ENV_PROBE`（B:1131-1147，探 9420 + 8080，产出 `uiReady`/`apiUp`）→ `HARVEST` 脚本收割 `reports/audit/round-2/{code-findings,findings,interact,regression}` 落盘 JSON 去重归一（B:1152-1172）→ `admit(harvested.all, issueIds, "MP-R2")` → 分级收割政策（P0/P1 全修、P2 需 `confidence>=0.6`、其余置「保留」并归档 harvest.json，B:1184-1193）→ `git.status()` 盘点上次中断的 64 文件修复批并入提交范围（B:1196-1206）→ `fixer.ask` 接续中断修复批（B:1215-1225）→ G1/G2 门禁各一次重试（B:1233-1249）→ `verifier.ask` 定向复验、DevTools 离线则降级为静态确认并标 UNVERIFIED（B:1252-1284）→ `commitRound(2,…)` + `headAfterR2`（B:1289-1290）→ `roundOutcomes.push({mode:"harvest-commit-verify"})` | **新增能力 + 参数修订（成本 redesign）**：banner 直指"原 v3.1 整轮重跑 R2（64 页六路复核）+ 最多 4 次全量终验 = 6.65 亿 token 消耗与两度配额停跑的主因" | **否**（C:1125 保留 A 的 `maxFixRounds` 循环原样） |
| 7 | A:1133-1167 | B:1296-1352 | 终验循环（A:1094 `for (let a = 1; a <= WORKFLOW.audit.maxFinalAuditTries …)`） | `a <= 2` 写死（B:1296）；`phase("终验：定向独立审计")`（B:1299）；定向范围 = 待修复/待终验问题页 ∪ `scopePages` 影响页 ∪ 核心页，再等距抽样补到 `CAP = 24`（B:1305-1330）；**删除** `reqPromiseF`/`reqF`/`lastCompares = reqF.pageCompares`（终验不再跑 A4 需求对照，`scribeRound` 第 5 参传 `[]`）；新 P3 发现直接置「保留」不再触发修复轮；blockers 文案改「终验 2 次后仍存在待修复 P0/P1/P2（定向范围）」 | **参数修订 + 新增能力（范围收敛）** | **否**（C:1142 仍用 `maxFinalAuditTries`（=4，C:59），C:1184-1198 仍跑 `reqPromiseF`/`reqF`） |
| 8 | A:1190-1204 | B:1414-1426 | 「最终回归与总报告」阶段，`officer`（A:1193） | agent 提示词加【真实截图铁律】并拼 `REAL_ENV`（B:1417）；ask 数组插 2 条：真实审查模式说明（含 8080 健康检查、管理员凭据、guest-login、skill 文档路径）、**验收基准三条**（每条 P0/P1/P2 结论要有本轮真实截图/路由证据；核心链路 A–H 逐链给实测截图目录；代码推断只作线索）；再插 1 条「v3.2 收尾说明」（声明 R2 未整轮重跑、终验为定向 ≤24 页、A4 沿用 R1、P3/P4 归档，并给出真实 HEAD `headAfterR2`） | **提示词措辞 + 新增能力**（验收口径） | **部分**：C 在同一个 ask 数组另有改动（九道 Gate / `realGates` / 「3b. G4 口径」，见 §2#7），但 **B 的这三条一字未进 C**（C:1297 提示词与 A 逐字相同，C:1300 首条仍是 `对整个 QA 闭环做最终验收并写总报告。`） |
| 9 | A:1264 | B:1490 | 返回值 `result.verified[0]` | 「R1 全量基线 → 影响范围回归轮（Impact Graph） → 终验全量独立审计」→ 改为 v3.2 收尾版口径（R1 复用前轮缓存 → R2 收割+工作树固化+定向复验 → 终验定向独立审计 ≤24 页） | **版本注释**（但它是对外交付文案，错报即虚报） | **否**（C 保留 A 文案） |
| 10 | A:1278 | B:1504-1506 | 返回值 `result.leftover` | 追加 2 条诚实披露：「R2 收割中未修复的 P3/P4 与低置信发现（归档 `reports/audit/round-2/harvest.json`）」「终验轮未重跑需求对照（A4），沿用 R1 每页使用对比」 | **新增能力**（把收敛造成的盲区显式挂到遗留项） | **否** |

### 分类汇总（A↔B）

- 新增能力：hunk 1、2、3、5、6、7、8、10（8 个）
- 参数修订：hunk 2、6、7（与上重叠）
- 提示词措辞：hunk 3、4、8
- 运行期落盘状态：**0 个**（详见 §4 判定）
- 纯粹版本注释：hunk 9
- **已在 C 中体现：仅 hunk 8 的一小半（同一 ask 数组被 C 各自改写），其余 9.5 个全部未进 C。**

## 2. A ↔ C 逐块分析（`diff -u -B --strip-trailing-cr A C`，8 个 hunk / 220 行）

| # | A 锚点 | C 锚点 | 所在函数 / 阶段 | 变更内容 | 分类 | 与 B 的关系 |
|---|---|---|---|---|---|---|
| 1 | A:1-12 | C:1-14 | 文件头 `/* zcode-workflow` 元数据 | `description` 首句改为 v3.2，声明「补齐真实模式端到端验收阶段 + G7/G8/G9 三道 Gate、把执行器噪声（`__CAND__` 占位与中文标题正则截断）从产品判定里剥离、新增用例契约与队列对账协议、修正 UI Lock 释放语义（墓碑 + finally/信号兜底 + 僵尸租约按 pid 接管）」；`whenToUse` 末尾追加「→真实模式前后端联通验收」 | **版本注释**（内容有证据，非虚标） | B 未动头部（B 的收尾改造同样自称 v3.2，但头部仍写 v3.1 → 见 §6 M-1） |
| 2 | A:24 | C:26-45 | `const WORKFLOW` 配置对象 | `version: "3.2"`；新增三个配置块：`build{mockScript, realScript:"build:mp-weixin:real:dev", sharedOutDir, realOutDir, outDirEnvKey:"UNI_OUTPUT_DIR"}`、`realEnv{apiBaseUrl, healthPath, requireBackendUp, wechatLogin, guestLoginWorks}`、`instrument{forbidPlaceholderSelector, unresolvedVerdict:"UNVERIFIED-INSTRUMENT", requireManifestTotalReconcile}` | **新增能力（配置化）**——把环境事实外提为常量，方向正确 | **零冲突**：B 在 A:24 处未改；B 的对应做法是写死字面量（`ENV_PROBE` 里的 8080/9420，B:1131-1136） |
| 3 | A:499 | C:518-521 | `UI_LOCK_RULES` 常量（A:494） | 把「结束：`status=released` 并删除锁文件」拆成 3 条 v3.2 规则：**墓碑保留不 unlink**、**释锁挂 finally + SIGINT/SIGTERM/uncaughtException**、**僵尸租约按 `owner.pid` 存活判定接管**（且禁止 kill 他人进程） | **参数修订（协议语义修正）** | B 未动此区。两者可无损共存 |
| 4 | A:511 后 | C:536-560 | 常量区（`RESET_RULES` 与 `EVIDENCE_BUDGET` 之间） | 新增 `INSTRUMENT_RULES`（5 条：用例契约/禁 `__CAND__`/解析不到记 `UNVERIFIED-INSTRUMENT`/`requiresReal` 断言分域/队列对账）+ `REAL_E2E_RULES`（9 条：为何单独一轮、G7 产物自证模式、构建隔离、桩化还原校验、G8 五环、G9 素材可达性、后台字段对账、后端前置条件前置声明、凭据走文件体） | **新增能力（最大的一块）** | B 完全无此二常量（0 命中） |
| 5 | A:665 | C:714-715 | `auditRound()` 的 `exec0.ask()` 数组（`EVIDENCE_BUDGET` 之后） | 注入 `INSTRUMENT_RULES` 与一条「队列对账（v3.2 必做）」 | **新增能力** | 与 B 的 hunk#4（同一 agent 的**提示词字符串**加 `+ REAL_ENV`）**不同行、可叠加** |
| 6 | A:1165 后（终验循环结束与「最终回归」之间） | C:1213-1269 | 新增阶段 | `phase("真实模式端到端验收（G7/G8/G9）")`（C:1220）：`REAL_DIR`（C:1221）、`realGates[]`（C:1223）、`curl` 健康预检→不可达整批记 BLOCKED（C:1226-1231）、`runPnpm([... WORKFLOW.build.realScript …])` 跑 G7（C:1232）、`agent("真实模式验收员").ask<{g7,g8,g9,fieldParityGaps,artifactsLeft,notes}>`（C:1237-1256）、三道 Gate 入 `realGates`（C:1257-1259）、**未跑成也必须落 Gate 记录**的 else 分支（C:1263-1268） | **新增能力**（这是 C 的存在理由） | B 无。注意此块**依赖 `runPnpm` 真能跑构建**，与 B 的 hunk#2 结论直接冲突（见 §6 M-5） |
| 7 | A:1201-1206 | C:1305-1312 | `officer.ask()` 数组 | 「六道 Gate」→「**九道 Gate**」并给 G4 补「判定必须剔除测试台噪声」（C:1308）；新增「G7/G8/G9 由脚本给定值 `realGates`，不得自行改写或补判，数组为空必须记 BLOCKED」（C:1309）；新增「3b. G4 口径：分母只能是判定成功的产品用例，`__CAND__` 类单列『未取证(工具)』并另报待修选择器清单」（C:1310）；报告结构第六章改九道 Gate、新增第七章「真实模式端到端结论」、遗留项顺延为第八章（C:1312） | **参数修订 + 新增能力** | **唯一真正与 B 重叠的编辑面**：B 在同一个数组的更前面插了 3 条（§1#8）。两侧行不重叠，合并 = 保留 B 的 3 条 + C 的 4 处改写，顺序建议：真实模式说明 → 验收基准 → 轮次结构 → v3.2 收尾说明 → 九道 Gate → realGates 锁定 → 3b |
| 8 | A:1282 后（`return result;` 之后） | C:1388-1432 | 文件尾 | 追加 `CHANGELOG v3.1 → v3.2`：`[C-1]`…`[C-7]` 每条带根因与磁盘证据路径（`.zcode/tmp/build-real-evidence.md`、`e2e-sync-findings.md`、`real-assets-probe.md`、`exec-failure-triage.md`），末尾「未随 v3.2 改动、仍属遗留」点名 4 个硬编码 `dist/build/mp-weixin` 的脚本 | **版本注释（证据充分，属加分项）** | B 无 CHANGELOG（它的 v3.2 主张只写在 banner B:1121-1127 里 → 合并后应补写第 8 条起的新条目） |

**A→C 删除面（重点核查）**：C 相对 A 只"消失"了 6 行（见 §5），逐行核对全部是**被就地改写的同一行**（description、whenToUse、`version`、UI Lock 释放行、Gate 六→九、报告结构第六→第八），**没有任何一行 A 内容被整块删掉**。

## 3. B ↔ C 交叉验证（`diff -u -B --strip-trailing-cr B C`，15 个 hunk / 633 行）

15 个 hunk = A↔B 的 10 个 + A↔C 的 8 个 **去掉重叠** 的结果，其中：

- B 侧独有、C 侧表现为"删除"的：`REAL_ENV`（B:64-76）、`PNPM_WRAPPER`/`gatekeeper`/`buildGate` 重写（B:479-509）、三个常驻角色铁律（B:563-568）、`exec0 + REAL_ENV`（B:677）、`stillOpen` 补录（B:823-845）、收尾改造整段（B:1117-1352）、officer 三条（B:1414-1426）、`verified[0]`（B:1490）、`leftover` 两条（B:1504-1506）。
- C 侧独有、B 侧表现为"删除"的：头部与 `version`/三个配置块（C:1-45）、UI Lock 三条（C:518-521）、`INSTRUMENT_RULES`+`REAL_E2E_RULES`（C:536-560）、exec ask 注入（C:714-715）、真实模式阶段（C:1213-1269）、九道 Gate（C:1305-1312）、CHANGELOG（C:1388-1432）。
- **净结论：两者可机械合并的部分约占 90%；真正的冲突只有 3 处** ——
  1. `officer.ask` 数组（两侧都插，不同行，合并即并列）；
  2. `WORKFLOW` 对象尾部与 `buildGate` 调用面（B 把构建改为子代理执行，C 新增的 G7 仍用 `runPnpm`，属**语义冲突**，必须统一到 B 的口径）；
  3. `result.verified[0]` / 报告「轮次结构」文案（B 收敛了轮次语义，C 沿用 A 的全量语义；若采纳 B 的收尾改造则 C 侧这些文案必须同步改，否则终报虚报范围）。

## 4. 判定：B 相对 A 多出来的是什么

**判定：B 是「已实测跑过、但未升版号」的真实协议改进稿（一条与 C 平行、互不相交的第二轴线 v3.2 收尾改造），不是 exec 运行器写的中间态，也不是幂等重排。**

证据链（按强度排序）：

1. **B 是 00:03 那次执行的源，不是它的产物。** `.zcode/workflow-runs/dwfrun-dd96988a-d736-491d-b5ea-fef3ccb3e5d3.mjs`（mtime 2026-09-25 00:03，103778 字节）里 grep：`R2 收割与工作树固化` = 1、`PNPM_WRAPPER` = 1、`REAL_ENV` = 1、`真实模式端到端验收` = **0**。即：编译进执行文件的正是 B 的正文，而 C 的核心阶段完全不在该次执行里 → 数据流方向是 **B → run**，运行器只是逐字搬运。
2. **B 引用了一个早于它两天就存在的磁盘产物。** B:485 `const PNPM_WRAPPER = "tmp/run-pnpm22.cjs";`，而 `tmp/run-pnpm22.cjs` 实际存在、mtime **2026-09-22 20:33**，且 B:482-484 注释写明「`world.run` 沙箱对本条构建链秒级失败（**实测三轮一致**）」→ 现场验证过的修复，机器不会自己引用一个人类写的包装器。
3. **每个差异块都带人类设计理由。** B:1123「6.65 亿 token 消耗与两度配额停跑的主因」、B:1121「上方 R1 区逐字未动，**保住前轮缓存回放**」、B:826-827「『证据不足』不在此列——把未知升格成待修项只会制造噪声」。这类权衡语句不可能出自落盘逻辑。
4. **B 的行序与 A 完全一致。** `phase()` 与 `agent()` 声明的相对顺序未变（A 的 10 个 phase 在 B 里仍是同一批，只把两个 phase 名字换成本地版本：A:1084 `影响范围回归轮`→B:1129 `R2 收割与工作树固化`、A:1097 `最终独立全量审计`→B:1299 `终验：定向独立审计`）。若为幂等重排，行序必然扰动。
5. **B 的数字与运行现场对得上，说明它真的在跑。** `.zcode/tmp/exec-stop-snapshot.json`（00:06:36，`reason: "用户指令：停止工作流"`）记录 `cases: 940`、`FAILED: 288`、`suites_recorded: 21`；这恰好是 C 的 CHANGELOG 所引证据「R2 清单 1107 例、记录 940 例」「288 条 FAILED 里 192 条是 `__CAND__`」（C:1404-1406、C:1410-1411）的同一批数 —— **C 引用的失败数据正是 B 那一轮跑出来的**。
6. **唯一"未定稿"的迹象只是没升版**：B:24 仍 `version: "3.1"`、文件名仍带 `v31`、目录是草稿区 `.zcode/workflow-drafts/`（`.gitignore` 2 字节）。这解释的是"B 为什么头部写 v3.1"，而不是"B 是运行器写的"。

**因此不合并的候选：0 块。** B 的 8 个增量全部是真实协议改进，需按 §6 逐块并入 C。仅两处要求"合并时改写"而非"照搬"：

- B:567 的 `"修复工程师-R4"` —— `R4` 是那一轮会话的临时后缀，合进 C 要还原为 `"修复工程师"`，否则会破坏常驻 agent 的跨轮上下文身份（B 与 A/C 在 A:543 / C:589 都是无后缀名）。
- B:1296 的 `for (let a = 1; a <= 2 …)` 魔数 —— C:59 的 `maxFinalAuditTries: 4` 仍在，合并时应新增/改配一个 `maxTargetedFinalAuditTries: 2` 字段承载，别留裸魔数（C:26-45 已确立"数值只进配置、不进提示词"的纪律，B 这条违背它）。
- B 删掉了终验的 A4 需求对照（B 无 `reqPromiseF`/`reqF`），同时删了 `lastCompares = reqF.pageCompares`，但 B:1425 officer 仍引用 `lastCompares`（值退化为最后一次 impact 轮的对比，A:1059/B:1102 赋值），而提示词文案仍写「每页使用对比（**终验轮**）」→ 合并时文案与语义需一并对齐（B:1505 已自我披露"终验轮未重跑需求对照"，算诚实，可保留该收敛）。

## 5. C 完整性计数核对（防误删）

### 5.1 结构计数对照表

| 计数项 | A | C | B | 结论 |
|---|---|---|---|---|
| `phase(` 声明 | **10** | **11** | 10 | C = A + `真实模式端到端验收（G7/G8/G9）`（C:1220）。A 的 10 个 phase 名在 C 中**逐字保留**（C:596/620/645/858/898/1063/1121/1132/1145/1274 ↔ A:550/574/599/810/850/1015/1073/1084/1097/1170）✅ 无误删 |
| `agent(` 调用 | **17** | **18** | 18 | C = A + `真实模式验收员`（C:1237）；B = A + `构建守门员`（B:496）。**两者名字不同、可叠加 → 合并后应为 19**（头部 "7 Actor" 的说法届时需复核，见 §6 M-7） |
| `.ask<` / `.ask(` 调用 | **25** | **26** | **30** | C +1（验收员）；B +5（`gatekeeper.ask`、收尾区的 `fixer.ask`/`verifier.ask` 等）。B 的 4 次 ask 尚未进 C |
| 顶层 `const` 行 | **172** | **180** | 200 | 增量为正，无净丢失 |
| 顶层 `let` 行 | **16** | **17** | 24 | 同上 |
| `function` 定义 | **28** | **28** | 28 | **完全相等** ✅ 28 个函数一个没少（B 也没少，只是改了 `buildGate` 函数体） |
| `interface` 定义 | **33** | **33** | 33 | **完全相等** ✅ 数据契约无丢失 |
| 模板字符串（反引号对） | **178** | **213** | 209 | C +35 段提示词，无减少 |
| 非空行 | **1240** | **1384** | 1461 | C − A = 144 行净增 |
| 声明符号全集（const/let/function/interface/type/class） | **203** | **212** | 230 | **A \\ C = ∅** ✅ |
| Gate 名 `G1` | 7 | 9 | 9 | C 增（G1 在 real 语境复述），无减少 |
| Gate 名 `G2` | 5 | **5** | 6 | C 与 A 持平（B 的 +1 来自收尾区注释「门禁 G1/G2」，未进 C） |
| Gate 名 `G3` | 1 | 1 | 1 | 持平 ✅ |
| Gate 名 `G4` | 1 | **2** | 1 | C 增（新增 3b 口径条目）✅ |
| Gate 名 `G5` | 1 | 1 | 1 | 持平 ✅ |
| Gate 名 `G6` | 1 | 1 | 1 | 持平 ✅ |
| Gate 名 `G7`/`G8`/`G9` | 0/0/0 | **16/15/13** | 0/0/0 | C 独有的整条新轴线 |

### 5.2 「只存在于 A 而消失于 C」的符号 —— 红名单

> **（空集）** —— `A \\ C = ∅`：A 的 203 个声明符号在 C 中**全部存在**，包括所有易被"替换误删"波及的短生命周期局部名：
> `PNPM_ENTRY`(C:494)、`openP12`(C:1126)、`pendingFinal`(C:1127)、`openPagesF`(C:1153)、`reqPromiseF`(C:1184)、`reqF`(C:1196)、`lastCompares`(C:393/1107/1198/1303) —— 均在。

行级复核（多重集差 `A − C`）只有 **6 行**在 C 中不存在，逐行判定全部为「同一行被就地改写」，无一为整块删除：

| A 行 | 内容 | C 中的替代行 |
|---|---|---|
| A:2 | `description: v3.1 完整执行协议…` | C:2-4（v3.2 三行版） |
| A:11 | `whenToUse: …独立终验）时运行…` | C:12（追加真实模式联通验收） |
| A:24 | `version: "3.1",` | C:26 `version: "3.2",` |
| A:499 | `` `结束：status=released 并删除锁文件；…` `` | C:518-521（三条 v3.2） |
| A:1203 | `` `3. 六道 Gate（…G1…G6…）` `` | C:1308（九道 Gate） |
| A:1206 | `` `5. 写 reports/audit/final/final-report.md：…六、六道 Gate…七、最终遗留项` `` | C:1312（八章版） |

**对照：`A − B` = 42 行**（其中 `const key = chunkKeyFor(…)`、`}));` 两行属重复行计数假象，实际 40 处），全部落在 B 主动重写的 4 个区域（构建工具层、收尾改造区、终验区、officer 区），也**没有一处是意外丢失**。

### 5.3 「只存在于 B 而消失于 C」的符号 —— 这才是真正的丢失面（33 个）

`CAP`、`ENV_PROBE`、`HARVEST`、`PNPM_WRAPPER`、`REAL_ENV`、`admittedOpen`、`apiUp`、`baseArr`、`baseF`、`envState`、`gate2a`、`gate2b`、`gatekeeper`、`harvestRes`、`harvestSummary`、`harvested`、`headAfterR2`、`openIssuePagesF`、`openIssuesF`、`probeRes`、`r2All`、`r2Commit`、`r2Fixed`、`r2Worklist`、`restF`、`sampleCount`、`sampledF`、`scopeSet`、`step`、`stillOpen`、`tc1`、`toVerify`、`uiReady`

对应地，`C \\ B` = 15 个（`INSTRUMENT_RULES`、`REAL_DIR`、`REAL_E2E_RULES`、`realGate`、`realGates`、`real`、`health`、`verdict`、`why` + A 原有但 B 删掉的 `PNPM_ENTRY`、`openP12`、`openPagesF`、`pendingFinal`、`reqF`、`reqPromiseF`）—— 两个方向都不是子集关系，**证实 §0 的"互不相交"判定**。

## 6. 结论清单

### 6.1 C 需从 B 合并的块（按插入位置排序，全部为**必并**，无"不合并"项）

| 序 | B 锚点 | 落到 C 的位置 | 为什么必须并 |
|---|---|---|---|
| M1 | B:64-76 `REAL_ENV` | C:84 之后（`WORKFLOW` 于 C:84 闭合，紧接「数据结构」注释）；能配置化的字段改由 `WORKFLOW.realEnv`（C:35-40）拼出，避免双源 | C 有 `realEnv` 配置但**没有任何角色读到它**；B 独有、C 无处承载的事实有 5 项：MySQL/Redis 只读约束、SUPER_ADMIN 凭据用途、wechatide skill + `scripts/devtools/wx10.ps1`、**登录态两步注入**、提交纪律 |
| M2 | B:479-509 `PNPM_WRAPPER` + `gatekeeper` + `buildGate()` 重写 | 覆盖 C:494-504 | **阻塞项**：不并则 C:1232 的 G7 real 构建在 `world.run` 沙箱里秒级失败（B:482-484「实测三轮一致」），C:1265 会把它记成 `FAIL` 而非 `BLOCKED`，直接污染终报的九道 Gate |
| M3 | B:563-568 shooter/fixer/verifier 提示词 | 覆盖 C:588-590（**去掉 `-R4` 后缀**） | 【真实截图铁律】是 G3/G4/G6 与 G8 取证的判定标准；C 现在完全没有 |
| M4 | B:677 `exec0` + REAL_ENV | 覆盖 C:702 | A1 Driver 不知道登录态怎么注入，就跑不了 requiresReal 分域用例（C:539） |
| M5 | B:823-845 `stillOpen` 补录 | 插到 C:849（`const checked = res.checked ?? [];`）与 C:850（该 log 行）之间，并把 log 补上「仍开放补录 N」 | 真实逻辑洞：A5 判为「仍开放」的历史条目不生成 Issue ⇒ 永远绕开 worklist、无人修复。这条与成本无关，纯正确性 |
| M6 | B:1117-1294 「R2 收割与工作树固化」 | 替换 C:1125-1137 的 `maxFixRounds` 循环（或保留循环但把 R2 特化为收割，见 6.3 决策 D1） | 成本 redesign：整轮 64 页六路重跑 = 6.65 亿 token + 两度配额停跑；收割已落盘 JSON 是**零 token** 的确定性动作（B:1152-1172 用 `world.run("node", ["-e", HARVEST])`） |
| M7 | B:1296-1352 定向终验（`CAP=24`、2 次、去掉 A4） | 替换 C:1142-1212 的范围计算与循环上限 | 同上；且 B:1305-1330 的"待修复/待终验页 ∪ 影响页 ∪ 核心页 + 等距抽样"与 C 的"全量重跑"相比，是唯一能在配额内跑完的终验形态 |
| M8 | B:1414-1426 officer 三条 | 插到 C:1300 之后，与 C:1308-1310 排序（真实模式说明 → 验收基准 → 轮次结构 → v3.2 收尾说明 → 九道 Gate → realGates 锁定 → 3b G4 口径） | C 的九道 Gate 需要"每条结论有本轮真实截图"的判定纪律背书；`headAfterR2` 也是 C 缺失的"终验证据绑定真实 HEAD"字段 |
| M9 | B:1490 `verified[0]`、B:1504-1506 `leftover` 两条 | 覆盖 C:1373；在 C:1386（`P4 优化项 …` 那一项）之后追加两行 | 交付文案必须与合并后的真实轮次形态一致，否则终报虚报「影响范围回归轮 / 终验全量独立审计」 |
| M10 | — | C:1393-1432 CHANGELOG 追加 `[C-8]`…`[C-13]` | C 的 CHANGELOG 只记了自己那条轴（C-1..C-7），B 侧改造零记录 → 并完不留痕，下轮又会重演分叉 |

### 6.2 C 需修掉的自相矛盾

- **M-1（任务书点名的横幅问题）**：`C:15 // 微信小程序 QA 闭环工作流 v3.1 —— 完整执行协议` 与 `C:26 version: "3.2"`、`C:2 description: v3.2…` 直接打架。C 全文 `v3.1` 出现 **16 次**、`v3.2` 出现 11 次；其中只有 C:15 与 C:515 是"本该升版却漏升"的版本标识，其余 14 次（C:2/21/27/43/540/544/546/552/1393/1396/1405/1415/1420/1424）是**有意的历史对照**，不要误改。
- **M-2**：`C:515 // ===== UI Lock 状态机协议（v3.1：AVAILABLE/LEASED/STALE；不旋轮重试）=====` —— 紧接其下的 C:518-521 已是 v3.2 的墓碑/兜底/僵尸租约语义，横幅版本号要改并在括注里补「+ 墓碑释放」。
- **M-3（协议要求了结构装不下的字段）**：`C:539` 要求「凡 expected 涉及落库/后台可见/审核流转/计数同步的用例，必须打 `requiresReal: true`」，但 `interface TestCase`（C:166-181）**没有 `requiresReal` 字段**，用例设计员（C:685）与 Manifest 落盘结构都无处承载，A6 交互判定员（C:748）也无从分域。→ 加 `requiresReal?: boolean` 并同步用例设计员提示词与产出 schema，或明确降级为 `evidence` 文本标记（二选一，别保持现状）。
- **M-4**：C 的 `whenToUse`（C:12）已宣称"真实模式前后端联通验收"，但除 `真实模式验收员`（C:1237 自带内联事实）外，5 个取证/修复角色全部零环境知识 → 由 M1/M3/M4 合并解决。
- **M-5**：`C:1232` 的 G7 走 `runPnpm`，与 B:482-484 的实测结论冲突（并 M2 后自动消解）。若坚持不并 M2，则至少把 C:1266 的 `verdict` 逻辑改为"构建链跑不起来 → BLOCKED"，禁止记 FAIL。
- **M-6**：`C:58 maxFixRounds: 3` / `C:59 maxFinalAuditTries: 4` + C:1125/C:1142 的全量重跑，正是 B:1123 认定的成本根因，且 00:06 已被用户手动叫停（`.zcode/tmp/exec-stop-snapshot.json`）。并 M6/M7 后这两个字段成为死配置 → 要么删除，要么显式改名为 `maxTargetedFinalAuditTries: 2` 并保留一轮 impact 兜底。
- **M-7**：`C:4 description` 仍写「7 Actor（6 推理 + A1 UI Driver…）」，C 实际具名角色已 8 个（+ 真实模式验收员），合并后 9 个（+ 构建守门员）。
- **M-8**：`C:5` 仍写「Evidence Bus 六路并行复核」，若采纳 M7（终验去掉 A4），需在 description 标注「终验为 5 路，A4 沿用 R1 每页使用对比」。
- **M-9**：并 M6/M7 时同步 `C:1301` officer 提示词里的「轮次结构（R1 基线全量 → R2+ 影响范围回归 → F 终验全量独立审计）」，否则终报第四章各轮表与实际不符。
- **M-10（流程性）**：A（`.zcode/workflows/miniprogram-qa-loop-v31.dwf.ts`）与 B 都是可被再次选中执行的有效入口。合并收尾时应把 B 移入归档或冻结 `workflow-drafts/`，并在 A 头部加 DEPRECATED 指向 C —— 否则同一份"v3.1"名字下还会继续长出不相交的第二轴线（本轮已经是第二次）。

### 6.3 需要人拍板的两个决策点

- **D1（M6/M7）**：是否把 B 的"收尾改造"整体并入 C？收益是能在配额内跑完并让 G7/G8/G9 真的有证据；代价是终验不再重跑 A4 需求对照、`maxFixRounds` 失效。建议**并**，并按 M8/M9/M7 补披露（B:1505 已给出可照抄的披露文案）。
- **D2（M1 与 C:26-45 的关系）**：环境事实的单一来源应该是 `WORKFLOW.realEnv` 还是 `REAL_ENV` 文本块？建议 `REAL_ENV` 由 `WORKFLOW` 字段插值生成（保持 C:22「数值不进提示词，避免修订破坏缓存」的既有纪律）。

### 6.4 复核命令（可重放）

```bash
cd "D:/6/恋爱小程序"
A=.zcode/workflows/miniprogram-qa-loop-v31.dwf.ts
B=.zcode/workflow-drafts/miniprogram-qa-loop-v31.dwf.ts
C=.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts
diff -u --strip-trailing-cr -B "$A" "$B"   # 10 hunks
diff -u --strip-trailing-cr -B "$A" "$C"   #  8 hunks
diff -u --strip-trailing-cr -B "$B" "$C"   # 15 hunks
grep -c 'phase(' $A $B $C                  # 10 / 10 / 11
grep -o 'agent(' $A $B $C | sort | uniq -c # 17 / 18 / 18
grep -n "工作流 v3" $C                     # M-1
```

（本报告为只读研究产物：`.zcode/tmp/rr/{AB,AC,BC}.diff` 为分析副产物，未修改任何被研究的 `.dwf.ts`。）
