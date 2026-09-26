# WF-VERIFY — v32 工作流 DSL 可跑性验证报告

被验物：`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`（首次测量为 1696 行；**验证期间被外部并发编辑两次**，详见 §5.0）
对照物：`.zcode/tmp/v32.pre-merge.bak.ts`（合并前，1449 行）、`.zcode/workflow-drafts/miniprogram-qa-loop-v31.dwf.ts`（1512 行，被 splice 源）
Harness：`.zcode/tmp/dryrun-v32.cjs`
方法来源：复用 `.zcode/research/WF-RUNTIME-GAPS.md` §6 的 `transpileModule` + `AsyncFunction` 干跑方案（未重造）。

约束遵守声明：本报告与 harness 两个文件之外未修改任何文件；未碰 `.zcode/workflows/*.dwf.ts`；未跑构建；未启动开发者工具/UI 会话；未写数据库。

---

## 1. 静态解析（transpile 诊断数）

> **行号基准**：§1–§4 的行号记录于快照 **S1**（122550 B / 1697 行）；当前磁盘版本是 S2（124377 B / 1715 行），换算见 §5.0 偏移表（前段 +3、后段 +10）。两版**缺陷集合与逐案 PASS/FAIL 完全一致**，差异只有行号。要抄准确行号请重跑 harness，它打印运行时坐标。

结论：**不通过 —— 诊断数 = 1，不是 0。v32 当前无法解析，谈不上"能跑"。**

```
transpile diagnostics: 1
  TS1005 @line 1698 -> '}' expected.
```

TS1005 报在文件末（1698 = 最后一行 + 1），是"括号/花括号未闭合直到 EOF"的典型形态。炸点已定位到 **「定向终验」区**：

- `:1428` `const judgePromiseF = Promise.all(chunksF.map((chunk, idx) => {` 之后，**回调体、两个并行 Promise、await 解构、`clean = true` 判定、`fixAndRegress` 收尾以及 `for` 循环的闭合 `}` 全部缺失**；
- `:1429` 直接就是 `if (!clean) {`（顶层语句），说明 splice 时把草稿 `:1353-1386` 整段（34 行）漏掉了。

对照被 splice 源 `.zcode/workflow-drafts/miniprogram-qa-loop-v31.dwf.ts:1352-1386`，缺失内容确认为：`judgePromiseF` 回调体、`visualPromiseF`、`regPromiseF`、`await Promise.all([...])` 解构成 `interF/visualF/regF`、`scribeRound`、`foundF` 的 P3 归档策略、`actionable.length === 0 → clean = true; break`、循环内 `fixAndRegress(100 + a, ...)`、循环闭合 `}`。**其中 `clean = true` 是"终验通过"的唯一赋值来源——它被整段丢弃后，`clean` 在定向终验里永远只能是 false**（`:1416` 的那处 `clean =` 仅覆盖 Gate 受限分支），即 `:1581` 的 `accepted = clean && ...` 恒 false，工作流在结构上已不可能判"通过最终验收"。这是比语法错误更深的语义后果。

> 注：TS1005 是**语法**诊断，`transpileModule` 会报；而下面的 TS2451 是**语义**诊断，`transpileModule` 不报，因此必须额外做第 2 节的符号扫描——否则会误判"只有 1 处问题"。

## 2. 符号闭环复查

结论：**任务书点名的符号基本闭环，但发现 2 个新的合并引入缺陷（`r1` 重复声明、`files` 未定义引用）+ 1 个工具性误报需排除。**

用 `ts.createProgram` + 自定义 compilerHost 做全量语义扫描，只取 `2304/2451/2448/2300` 四类，并按名字过滤宿主族，结果：

| 诊断 | 位置 | 判定 |
| --- | --- | --- |
| TS2451 `Cannot redeclare block-scoped variable 'r1'` | :1186 与 :1189 | **真缺陷** |
| TS2451 同上 | :1189 | **真缺陷**（与上成对） |
| TS2304 `Cannot find name 'files'` | :1246 | **真缺陷**（不属宿主族） |
| TS2451 `Cannot redeclare block-scoped variable 'history'` | :664 | **误报，已排除** |

`history` 一项必须说明清楚，否则会当成第 3 个缺陷误报：`:664` 是 `const [history, ideal] = await Promise.all([...])`，被判 TS2451 是因为我的扫描器挂了 `lib.es2022.full.d.ts`（含 DOM），`history` 与 `window.history` 全局撞名。宿主沙箱里没有 DOM，`AsyncFunction` 形参只有 7 个宿主名，`const history` 完全合法 —— **不是缺陷**。除它之外，语义扫描再没报出任何非宿主族的未定义引用。

### 2.1 audit 声明与引用配对（maxTargetedFinalAuditTries / finalAuditPageCap / maxFixRounds）

| 符号 | 定义 | 引用 | 判定 |
| --- | --- | --- | --- |
| `maxTargetedFinalAuditTries` | `:61`（值 2） | `:1371` for 循环上界；`:1663` CHANGELOG 文本 | **闭环 ✅**（真引用在 1371） |
| `finalAuditPageCap` | `:62`（值 24） | `:1397` `const CAP = ...`；`:1531` officer 提示词插值；`:1663` 文本 | **闭环 ✅** 两处真引用 |
| `maxFixRounds` | 已删除（无定义） | 仅 `:59` 注释文本自述"已无引用" | **闭环 ✅ 0 残留引用**，符合预期 |
| `maxFinalAuditTries` | `:60`（值 4） | `:1429` `blockers.push` 文本 | 仍被引用，但注释自称"仅历史口径"；因终验循环被截断，`:1429` 这句恰好是**残缺区的尾巴**（草稿对应位置写的是硬编码 "终验 2 次"）。语义上口径与 `maxTargetedFinalAuditTries=2` 不一致，见第 4 节。 |

### 2.2 REAL_ENV 声明位置 vs 全部使用点（求值顺序）

**闭环 ✅ —— 顺序安全。** `REAL_ENV` 声明在 `:92`（`:104` 处 `.join("\n")` 结束），全部 6 个使用点都在其后：

- `:533` gatekeeper、`:630` shooter、`:631` fixer、`:632` verifier、`:744` exec0（在 `uiEvidence` 函数体内，且调用发生在 `:1185` 之后）、`:1525` officer。

任务书担心的"gatekeeper 在文件后段"实际落在 `:533`，仍在 `:92` 之后，模块顶层求值不会踩 TDZ。`:1528` 的 `REAL_ENV` 出现在提示词字符串里是**中文文本提及**，不是标识符引用。注意 `:1682` CHANGELOG 说注入 6 个角色 + 验收员，实际带 `+ REAL_ENV` 的是 6 处，"真实模式验收员"（`:1454`）注入的是 `REAL_E2E_RULES` 与 `UI_LOCK_RULES` 而非 `REAL_ENV` —— 文档与代码的这句表述略有出入，属注释精度问题，不影响运行。

### 2.3 合并新符号逐个闭环

| 符号 | 定义 | 引用 | 判定 |
| --- | --- | --- | --- |
| `headAfterR2` | `:1282` `let headAfterR2 = gitSha` | `:1361` 赋值、`:1363`/`:1531` 读 | **闭环 ✅** |
| `PNPM_WRAPPER` | `:522` | `:525` `world.run("node", [PNPM_WRAPPER, ...])` | **闭环 ✅** |
| `gatekeeper` | `:533` | `:535` `gatekeeper.ask` | **闭环 ✅** |
| `runBuildViaGatekeeper` | `:534` | `:546`（buildGate 内）、`:1449`（G7） | **闭环 ✅** |
| `indexFile` | 形参 `:871`；另有 `regIndex.indexFile` 属性 | `:880`、`:904`；实参 `:1144` 传 `regIndex.indexFile`；`:1536` 再用 | **闭环 ✅** 无遮蔽冲突 |
| `stillOpen` | `:896` | `:908` `admit(stillOpen, ...)` | **闭环 ✅** |
| `admittedOpen` | `:908` | `:909` 循环、`:913` 日志 | **闭环 ✅** |
| `realGates` | `:1440` | `:1479/:1480/:1481/:1486/:1495` push、`:1539` 注入 officer 提示词 | **闭环 ✅** |
| `CAP` | `:1397` | `:1400` `Math.max(0, CAP - baseArr.length)` | **闭环 ✅** |

### 2.4 PNPM_ENTRY 残留

**0 处代码引用 ✅**。唯一命中是 `:1667` CHANGELOG 叙述文本 "PNPM_ENTRY → PNPM_WRAPPER"，是刻意的改名说明，非引用。

### 2.5 未定义引用全集（区分宿主注入全局那一族）

宿主族命中统计（全部合法，由宿主注入）：`agent` / `log` / `phase` / `world` / `artifact` / `git` / `report` —— 共 73 处，**未见第 8 个宿主名的猜测**。

族外未定义引用：**1 个 —— `files`（`:1246`）**。

- `files` 不在 7 个宿主全局之内（§1.2 与本次扫描双重确认），是从草稿轴线（`workflow-drafts/...:1174` 同一行）带过来的、假定另一套宿主 API 的调用。
- 后果不是崩溃而是**静默失效**：`:1246` 被 `:1245` 的 `try` 与 `:1251` 的 `catch (e) { log("R2 收割读取失败…") }` 包住，`ReferenceError: files is not defined` 会被吞成一行日志，`r2All` 保持 `[]` → `r2Worklist` 为空 → `:1283` 的整个 R2 修复批不执行 → `r2Fixed=0`。
- 也就是说：**"R2 收割与工作树固化"这半区在当前宿主下永远收割不到任何东西**，而流程看起来一切正常。这比抛异常更危险，属本次验证最实质的发现之一。
- 该行前面的 `world.run("node", ["-e", HARVEST])`（`:1238`）其实已把同一份数据算出来并 `fs.writeFileSync` 落盘，`files.read` 只是第二次读盘；修法是改用已拿到的 `harvestRes.stdout`（`:1239` 已在解析 `summary`，缺的只是 `all` 明细），不必引入 `files`。**（只指出，未改。）**

## 3. 干跑四案（A 快速失败 / B 全绿 / C 畸形输入 / D ask reject）

结论：**SHIPPED 原文六案全部无法起跑**（`AsyncFunction` 构造阶段就 `SyntaxError: Identifier 'r1' has already been declared`）。
为回答"修没修好"这个本体问题，harness 在**内存里**做两处机械修复后重跑；下表结果均属 REPAIRED 变体。
**判定：C 案所考察的畸形输入防御确实生效；但 A 案按任务书口径跑不通，并暴露一个新缺陷。**

修复只做两件事（被测文件零改动，`git status` 见第 5 节）：
- `R1: 删除 :1188 起的重复 R1 调用块（第二段 const r1 + roundOutcomes.push）`
- `R2: 在 :1425 之后补回草稿 :1353-1386 共 34 行（终验并行复核/判定/修复/循环闭合）`
- 结果：`repaired transpile diagnostics: 0`

| 案 | 画像 | 结果 | 关键证据 |
| --- | --- | --- | --- |
| **A** | 任务书口径：`world.run` 恒返回非 0 + curl 非 200 | **FAIL（跑不通）** | `RUNTIME CRASH: TypeError -> Cannot read properties of undefined (reading 'P0')` @ 修复后产物第 934 行 = 源 **:1266** |
| **A2** | 诊断对照：仅门禁/后端不可用，本机 harvest 探针可跑通 | **PASS** | 抵达 return；`realGates = [G7=BLOCKED, G8=BLOCKED, G9=BLOCKED]`；conclusion 含 `G7/G8/G9 BLOCKED：后端 /actuator/health 未返回 200（实际 "000"）` |
| **B** | 全绿：stub 返回完备结构 | **PASS** | 抵达 return（`agent.ask=44`）；**`realGates` 恰 3 条** 且全 PASS；日志见 `终验通过：第 1 次定向独立审计未发现新的 P0/P1/P2` |
| **C** | 畸形输入：`g8 = {}`（无 rings 无 result）+ `g9 = {}` + 删 `g7`/`fieldParityGaps`/`artifactsLeft` | **PASS【核心结论：已不崩】** | 抵达 return；`realGates` 恰 3 条且**全 BLOCKED**；`ASSERT 三 Gate 全 BLOCKED: PASS`；无 TypeError |
| **C2** | 只删 `g8.rings`、`result` 齐全（修复前 TypeError 的最小形态） | **PASS** | 抵达 return，3 条 Gate 正常产出 |
| **D** | 守门员 + 真实模式验收员 ask 双双 reject | **PASS** | `:542` 的 `.catch` 生效 → `R1: 构建未通过（守门员调用失败: Error: stub: ask rejected…）`；`G7 FAIL：build:mp-weixin:real:isolated 未通过（守门员调用失败…）` |
| **D3** | 仅真实模式验收员 reject（门禁放行，必达 `:1473`） | **PASS** | `:1473` 的 `.catch` 生效 → 日志 `真实模式验收员调用异常：Error: stub: ask rejected`，落 3 条 BLOCKED + `G7/G8/G9 BLOCKED：真实模式验收员未返回可用结构`，正常出结论 |
| **D2** | 对照组：全局所有 ask reject（非任务要求） | 按预期崩 | 在 `:639` recon 即抛；说明 `.catch` 只覆盖 2 个点，见第 4 节 |

### 3.1 敏感性对拍（证明 C 案不是"测试太松"）

同一 C2 画像跑**合并前备份** `.zcode/tmp/v32.pre-merge.bak.ts`（该文件 transpile 诊断 0、可构造）：

```
RUNTIME CRASH: TypeError -> Cannot read properties of undefined (reading 'map')
```

即 §6 记录的原始炸点在此 harness 下**确实可复现**；而同一画像在 v32 上 PASS。因此"C 案已修好"是由对拍支撑的结论，不是断言之赐。备份文件里 `:1274-1276` 是无守卫的 `real.g7.result / real.g8.rings.map / real.g9.failures.length`，v32 已换成 `?.` + `?? `，改动方向被实测确认。

### 3.2 A 案为什么跑不通（最小复现与定位）—— 本次验证的新缺陷

任务书要求 A 案"world.run 恒返回非 0 → 应跑到结尾并给出含 G7/G8/G9 BLOCKED 的结论，不得抛异常"。实际在 `:1266` 抛 TypeError，流程在 R2 收割区就断，根本到不了 G7/G8/G9。

炸点链路（逐行实测，非推断）：

1. `:1237` `let harvestSummary = { total: 0, bySev: {} as Record<string, number> };` —— 给了安全默认值；
2. `:1239` `await world.run("node", ["-e", HARVEST])` 返回 `exitCode:1, stdout:""`（A 案口径：命令一律非 0）；
3. `:1240` `harvestSummary = JSON.parse(harvestRes.stdout || "{}")` —— **无条件整体覆盖**，默认值被 `{}` 冲掉，`bySev` 变 `undefined`；这里既不检查 `exitCode`，也不做 `?? 默认值` 合并；
4. `:1266` `harvestSummary.bySev.P0 ?? 0` —— `??` 只保护了**叶子**，父对象 `bySev` 为 undefined 时先炸。

这与 [C-11] 修的是**同一类**缺陷（"代理漏字段是常态，绝不允许 TypeError 炸在终报之前"），只是这处落在今天新 splice 进来的 R2 收割区，没被同一次加固覆盖。**A2 案证明：只要 harvest 探针本身能返回良构 JSON，其余门禁全挂时流程是健康降级的**（真按设计落 3 条 BLOCKED）。所以缺陷范围明确限定在 `:1240` 的覆盖式赋值。

修法（只描述，**未改**）：`:1240` 改为解析到临时量后校验 `exitCode === 0 && typeof parsed.bySev === 'object'` 才覆盖，或 `:1266` 用 `(harvestSummary.bySev ?? {}).P0 ?? 0`。

### 3.3 C 案暴露的判定完整性问题（重要，非崩溃）

C 案跑通不崩，但**结论自相矛盾**：三道 Gate 全 BLOCKED，`conclusion` 却是 `"已通过最终验收：…"`。

根因：`:1581` `accepted = clean && openP0 === 0 && openP1 === 0 && finalRes.blockers.length === 0 && blockers.length === 0` —— 只看 `blockers`。而 `:1479-1481` 的 `?? "BLOCKED"` 分支**只 push 进 `realGates`，不 push 进 `blockers`**（对比 `:1488`、`:1492-1496` 那两条路径都会写 blockers）。于是"验收员返回了对象但关键字段残缺"这一档，G7/G8/G9 记 BLOCKED 却不计阻塞，QA 被静默判成通过。B 案不受影响（全 PASS 且 `fieldParityGaps` 有值时确实进了 blockers）。
这是"BLOCKED ≠ 通过"原则的漏洞，属判定口径缺陷而非语法缺陷；**只指出，未改**。

## 4. 合并语义抽查（R2 收割区 / 定向终验区）

结论：**两个 splice 大块与 v32 既有函数的调用契约基本一致（参数个数/形状全部对得上），但合并带进 1 个死代码级缺陷、1 个语法级截断、3 处口径不一致。** 逐条如下，均未修改。

### 4.1 引用函数/变量是否仍存在且含义一致 —— 通过

把草稿 `:1353-1386` 补回后 transpile 诊断 0，且 REPAIRED 变体 B 案日志能打出 `终验通过：第 1 次定向独立审计未发现新的 P0/P1/P2` —— 说明被截断区所依赖的函数在 v32 里签名与语义都还在：

- `judgeChunk` / `visualChunk` / `regressionChunk` / `codeChunk` / `scribeRound` / `fixAndRegress` / `makeChunks` / `chunkKeyFor` / `scopePages` / `cnt` 全部存在；
- 实参个数逐个核对通过：`scribeRound(8 参)`、`fixAndRegress(11 参)`（`:1068`、`:960` 定义一致）、`regressionChunk(10 参)`（含 v32 新加的 `indexFile`/`impactFiles`，`:871` 定义一致）；
- 定向终验区对 `CAP` 做了正确的升级：草稿 `:1322` 是硬编码 `const CAP = 24`，v32 `:1397` 改读 `WORKFLOW.audit.finalAuditPageCap` ✅（配置外提方向正确）。

### 4.2 buildGate 走守门员后，收割区是否一致 —— **部分不一致（G2 被漏掉）**

- 构建侧一致：`:546`（G1 mock）、`:986/:989/:992`（fixAndRegress 内三次重试）、`:1099/:1103`（auditRound）、`:1303/:1306`（R2 收割区）、`:1377/:1380`（终验）、`:1450`（G7 real）——**全部经 `buildGate`/`runBuildViaGatekeeper`，收割区没有绕过守门员直调构建的残留** ✅。
- **但 G2 typecheck 没有一起迁移**：`:997`、`:1000`、`:1310`、`:1313` 四处仍是 `runPnpm([... "run", "typecheck"], 900000)`，而 `runPnpm` 在 `:526` 走的正是 `world.run("node", [PNPM_WRAPPER, ...])` —— 也就是 [C-9] 判定"对本条构建链秒级失败（实测三轮一致）"的那条沙箱路径。
- 后果与 [C-9] 想解决的问题完全同构：typecheck 假 FAIL → `:1002/:1313` 置 `gatesOk = false` → `:1058-1060` 整轮跳过 UI 复验并 push blocker，G1 修好的"假 FAIL 污染九道 Gate"在 G2 上原样存在。收割区（`:1301-1316`）与 fixAndRegress（`:984-1007`）两块**同构代码用了两套门禁通道**，这是合并最容易漏、也最该统一的一点。
- `tmp/run-pnpm22.cjs`（`:522` 的 `PNPM_WRAPPER` 指向）实测存在（755 字节），路径本身没写错。

### 4.3 `files.read` —— 收割区在此**永久空转**（比崩溃更危险）

`:1246` 的 `files` 不属宿主族（第 2.5 节），但被 `:1245` 的 `try` 吞成一行日志。四案日志里**每次都稳定打印** `R2 收割读取失败（继续以 R1 结果推进）：ReferenceError: files is not defined`，且流程照常往下走。净效果：

- `r2All` 恒为 `[]` → `:1255` `r2Worklist` 恒为空 → `:1283` 的整个"接续上次中断的修复批 + 门禁重试 + 定向复验"子树**在真实宿主里一次也不会执行**；
- `:1239` 的 `world.run("node", ["-e", HARVEST])` 白跑一趟（它已把数据 `writeFileSync` 落盘并印 summary），只有第二步读盘坏了 —— 也就是说坏得很"局部"，很容易被当成"这轮确实没有 R2 遗留"而漏掉；
- 与 [C-8] 的宣称（"R2 由整轮重跑改为收割 + 工作树修复固化 + 定向复验"）不符：**新轴线的核心收益目前只落地了探针，没落地收割**。
- 工作树盘点（`:1268-1278`）不依赖 `files`，走 `git.status()`，这一半是好的（B 案日志 `工作树盘点：0 个改动文件归入本轮提交范围` 正常产出）。

### 4.4 `:1240` 覆盖式赋值 —— A 案崩溃点（详见 3.2）

收割区还有一处与 [C-11] 同类的"只守卫叶子、不守卫父对象"问题，已在 A 案实测触发。合并把 [C-11] 的加固只 applied 到真实模式段（`:1476-1481`），没同步到新并入的收割段。

### 4.5 终验次数的口径不一致（文案与循环上界脱节）

循环上界是 `:1371` 的 `maxTargetedFinalAuditTries = 2`，但 `:1429` 的收尾文案用 `maxFinalAuditTries = 4`：`blockers.push(\`终验 ${WORKFLOW.audit.maxFinalAuditTries} 次后仍发现问题\`)`。草稿对应行（`:1388`）写的是字面量"终验 2 次后…"，合并时代码被截断、只剩这句尾巴还挂着旧常量。
→ 任何未通过的 QA 轮都会在终报里声称"终验 4 次后仍发现问题"，而实际只审计了 2 次。属可交付缺陷（误导阻塞归因），不是崩溃。

### 4.6 `clean` 的可达性（截断的第二重后果）

`clean = true` 的唯一赋值点在被丢弃的 34 行里（草稿 `:1380`）。v32 现存的 `:1416` 只覆盖 "Gate 受限 + 代码层无新问题" 分支。
→ **即使语法被单独补好而不补回循环体，UI 正常跑完的终验也永远判不出"通过"**（`accepted = clean && …` 恒 false）。REPAIRED 变体 B 案正是补回后才出现 `终验通过` 日志，可作对照证据。

### 4.7 `requiresReal` 只有声明与提示词，没有机器判定

`:206` 加了字段、`:583`/`:799` 写进了 INSTRUMENT_RULES，注入判定员/执行员 ✅。但 DSL 层没有任何一处消费它：`:811` `casesFailed += checks.filter(c => c.verdict === "FAILED").length` 照旧统计全部 FAILED，没排除 `requiresReal` 用例。
→ "不得计入产品失败分母"目前完全依赖代理自觉，与 [C-2]/[C-13] 想解决的问题（把噪声算进分母）只完成了一半。**只指出，未改。**

### 4.8 `.catch` 加固覆盖面：2 / 约 30 个 ask 调用点

`.catch` 只加在 `:542`（守门员）与 `:1473`（真实模式验收员）。D2 案（全局 reject）实测在 `:639` 项目盘点 `agent("项目盘点员").ask<Recon>()` 就整场抛断 —— 即"宿主注入的 agent 抖动/配额停跑"这一最常见失败模式，对除上述 2 点外的所有 ask 仍然零防护。这是**设计取舍还是遗漏，需要作者确认**：`[C-11]` 的措辞（"真实模式阶段全链路加防御"）读起来只承诺了真实模式段，那就算一致。

## 5. 可复放命令与退出码

### 5.0 必读：被测文件在本次验证期间被并发编辑（三次快照）

我在 00:5x 开始验证时该文件是 1696 行；期间它被**外部进程**改了两次（不是我：harness 全程只 `readFileSync`，且 §5.4 给出反证）。

| 快照 | 大小 / 行数 | 观察时刻 | §1–§4 引用是否有效 |
| --- | --- | --- | --- |
| S0 | 121582 B / 1696 行 | 会话开始首次 `wc -l` | 否（已被覆盖） |
| **S1** | **122550 B / 1697 行** | 主要分析基准 | **§1–§4 用这版** |
| S2 | 124377 B / 1715 行，`sha256 ≈ 0acf1bb2d201b835…` | 终局（run 前后哈希一致） | §5/总判定用这版 |

**结论跨快照不变**：S1、S2 两次完整跑出的诊断集合完全一致（`transpile: 1`、`TS1005 @EOF`、`TS2451 r1 ×2`、`TS2304 files ×1`、`history` 误报 ×1、`SUMMARY: assertion failures = 1`、八案逐项 PASS/FAIL 一字不差）。变的不只是行号，且行号漂移方向自洽：A 案崩溃点在转译产物里从 `<anonymous>:934` 挪到 `:944`，正是后段 +10。
偏移对照（S1 → S2）：`:92→:95`、`:522→:526`、`:533→:537`、`:1186/:1189→:1189/:1192`、`:1240→:1250`、`:1246→:1256`、`:1266→:1276`、`:1371→:1382`、`:1428→:1438`、`:1429→:1440`、`:1581→:1592`，EOF `1698→1716`。
更稳的做法是**直接重跑 harness**（它打印的是运行时行号，永远与磁盘当前版本对齐），不要手抄行号。
> 若有人要据此报告改代码，请先自行 `sha256sum` 比对 S2；不匹配就以 harness 输出为准。

### 5.1 静态解析 + 八案干跑（主命令）

```bash
cd "D:/6/恋爱小程序"
node .zcode/tmp/dryrun-v32.cjs > .zcode/tmp/_wv-final.txt 2>&1
echo $?
```

```
exit=1        # 1 = 套件发现缺陷（A 案 FAIL），不是 harness 崩了；全绿时才是 0
```

单案：`node .zcode/tmp/dryrun-v32.cjs --case C`（可选 `A|A2|B|C|C2|D|D3|D2|all`）→ `exit=0`（`SUMMARY: assertion failures = 0`）。

### 5.2 前像对拍（证明 C 案有敏感性）

```bash
cd "D:/6/恋爱小程序"
node .zcode/tmp/dryrun-v32.cjs --file "D:/6/恋爱小程序/.zcode/tmp/v32.pre-merge.bak.ts" --case C2 > .zcode/tmp/_wv-control.txt 2>&1
echo $?    # exit=1，日志含：RUNTIME CRASH: TypeError -> Cannot read properties of undefined (reading 'map')
```

备份文件本身 `transpile diagnostics: 0`、`AsyncFunction 构造: OK`、harness 的 repair 自动跳过（打印"原文语法已闭合"）—— 对照有效。

### 5.3 退出码陷阱（本机实测）

```bash
node .zcode/tmp/dryrun-v32.cjs --case A 2>&1 | tail -1 >/dev/null; echo $?
#   -> 0     ← 假绿！这是 tail 的退出码，node 的 1 被吞了
node .zcode/tmp/dryrun-v32.cjs --case A 2>&1 | tail -1 >/dev/null; echo ${PIPESTATUS[0]}
#   -> 1     ← 真值
```

即任务书预警的那条：管道后的 `$?` 属于管道尾端。本报告的退出码一律用**重定向到文件后 `echo $?`**，或管道内用 `${PIPESTATUS[0]}`；上文每个数字都是这两种方式之一取到的。

### 5.4 反证：被测物与其余文件未被我改动

```bash
cd "D:/6/恋爱小程序"
git status --porcelain .zcode/workflows/ .zcode/workflow-drafts/ apps/client/src
#  M .zcode/workflows/miniprogram-qa-loop-v32.dwf.ts   ← 相对 HEAD 的既有改动（今天合并所致），非本次验证产生
```

- `apps/client/src`、`.zcode/workflow-drafts/` 干净，无输出。
- 该 `M` 在我会话开始前（首次 `ls`）就已存在；文件在我会话中于 00:49:23 与 01:01:01 两次变更（§5.0），而我的全部写操作只落在 `WF-VERIFY.md` 与 `dryrun-v32.cjs` 两个文件。harness 内只有 `fs.readFileSync`，无任何写 API。
- 另外 `.zcode/tmp/` 被 `.gitignore:111` 的 `tmp/` 规则忽略，故 harness 不显示为 `??`；`WF-VERIFY.md` 显示为 `??`（新文件）。
- 分析过程中的 shell 重定向暂存文件（`_wv-*.txt`）已删除，本目录只留 `dryrun-v32.cjs` 一个新增物；需要日志请按 §5.1/§5.2 重新生成（harness 自带完整打印）。
- 未跑构建、未启动微信开发者工具/任何 UI 会话、未写数据库、未起任何 `fetch`/网络请求（本机 node 为 v16.13.1，无全局 fetch，harness 也不需要）。

### 5.5 环境实测值

```
node (PATH)                     v16.13.1
typescript (pnpm 绝对路径)      5.3.3
  = D:/6/恋爱小程序/node_modules/.pnpm/typescript@5.3.3/node_modules/typescript
D:\codex-tools\node-v22.17.0-win-x64\node.exe  存在（85219968 B），本次未使用
```

§6 前人记录的坑均成立：`require('typescript')` 必须给上面的绝对路径；本机 PATH 的 node 是 v16，但 harness 不用全局 fetch，v16 足够（`?.` / `??` / `AsyncFunction` 全支持），**无需切 v22**。

---

## 总判定

**不能跑。当前 v32 在宿主里连构造都过不去，一个画像也跑不到结尾。**

按致命度排序（全部实测，非推断）：

| # | 缺陷 | 位置 | 后果 |
| --- | --- | --- | --- |
| 1 | `const r1` 重复声明（合并时粘贴两遍） | `:1189` + `:1192` | `SyntaxError` → **整场 QA 在启动时即崩**，零产出 |
| 2 | 定向终验区被截断 34 行（括号未闭合） | `:1438` 之后，EOF `TS1005 '}' expected` | 语法不通；且 `clean = true` 唯一赋值点丢失 → **不补回就永远判不出"通过"** |
| 3 | `files` 未定义（宿主无此全局） | `:1256` | 被 try 静默吞 → **R2 收割/工作树修复/定向复验整棵子树永不执行**，且表面正常 |
| 4 | `harvestSummary` 覆盖式赋值 + 叶子级 `??` | `:1250` → `:1276` | 探针失败（`stdout:""`）时 `TypeError reading 'P0'` → **A 案跑不通**，崩在 G7/G8/G9 之前 |
| 5 | BLOCKED 不进 `blockers` | `:1490-1492` vs `:1592` | 三 Gate 全 BLOCKED 仍可能出 `"已通过最终验收"`（C 案实测到） |
| 6 | 终验次数文案挂旧常量 | `:1440`（`maxFinalAuditTries=4`）vs 循环 `:1382`（`=2`） | 终报谎报"终验 4 次"，误导阻塞归因 |
| 7 | G2 typecheck 未随 G1 迁到守门员 | `:1000/:1003/:1320/:1323` | [C-9] 认定的沙箱秒级失败路径仍在用 → G2 假 FAIL，连带跳过 UI 复验 |
| 8 | `requiresReal` 无机器判定 | `:209` 声明、`:802` 仅提示词；`:811` 分母未排除 | 噪声仍可能计入失败分母，[C-2] 只落地一半 |

**已经修好的部分（实测确认，不是安慰）**：本次核心问题——真实模式段畸形输入炸终报——**确实已解决**。C 案（`g8={}`/`g9={}`/缺 `g7`/缺两个数组）与 C2 案（只缺 `rings`）均不崩、落 3 条 BLOCKED、正常出结论；同画像在合并前备份上抛 `TypeError reading 'map'`，构成有效对拍。D/D3 案证明 `:542`、`:1473` 两处 `.catch` 都真的接住了 reject。任务书点名的 9 个合并符号（`headAfterR2`/`PNPM_WRAPPER`/`gatekeeper`/`runBuildViaGatekeeper`/`indexFile`/`stillOpen`/`admittedOpen`/`realGates`/`CAP`）**定义-使用全部闭环**；`REAL_ENV` 声明顺序安全；`PNPM_ENTRY` 与 `maxFixRounds` 零残留引用。

**最小可跑路径（若目标是先让它能跑起来）**：只动缺陷 1 和 2 即可恢复语法可构造、A2/B/C/D 全通；缺陷 3/4 决定 R2 收割区是不是真在工作；缺陷 5 决定终报能不能信。按任务书要求，以上**一项都没有改**。

### 未验证 / 局限（如实交代）

1. **未在真实宿主里跑过**。全部结论来自 §6 那套 stub 宿主干跑：真实 `agent()` 的返回结构、`world.run` 对 `pnpm`/`curl`/`git` 的实际行为、9420 端口占用等均未覆盖。干跑能证伪"能不能跑完"，不能证实"跑出来对不对"。
2. **缺陷 2 的 34 行补回取材于草稿 `:1353-1386`，是"最可能原本要合进来的内容"，不是权威原文**。用它只为隔离语法问题以观察 C 案；补回后的终验区是否与原设计完全一致（尤其 `regressionChunk` 传 `[...fixerFiles]` 而非 `impactFiles`）未逐行核对。
3. **未验证 5 个角色的提示词文本语义**、G1–G9 门禁矩阵完整性、锁协议正确性——这些不在本次任务范围（§2/§4/§5 of WF-RUNTIME-GAPS 已另有覆盖）。
4. **并发编辑风险**：S2 也可能已被后续写入取代（§5.0）。重跑 harness 可自证。
5. 缺陷 8 是"机制未落地"级别，不构成运行失败，干跑画像无法证明其真实影响大小。
