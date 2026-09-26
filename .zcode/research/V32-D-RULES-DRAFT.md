# V32-D-RULES-DRAFT —— 剩余 12 条定义缺陷的可粘贴条款

对象文件（唯一写入目标由主代理执行，本稿不改它）：`.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`
缺陷来源：`.zcode/research/ISSUE-CENSUS-2026-09-25.md` §4 / §5
本稿覆盖：D1、D3、D4、D5（未闭合部分）、D7、D8、D10、D12、D13、D14、D16、D17（12 条）
已闭合、本稿不再重复：D2（__CAND__ 噪声隔离）、D6（real 阶段）、D9（锁墓碑）、D11（队列对账）、D5 的 requiresReal 分域部分、D15（本轮不改 DSL 之外产物）

## 0. 全局约定（所有条款共用，插入一次即可）

**0.1 宿主符号白名单**：本稿所有文本只引用两类名字 —— ① 宿主注入全局 `agent / log / phase / world / artifact / git / report`；② v32 里 grep 得到的既有符号（每条附核实命令与命中数）。凡两条都不满足的名字，一个都没有写进文本。已核实的既有符号命中数（`grep -cF`，文件 `.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`）：

| 符号 | 命中 | 符号 | 命中 |
|---|---|---|---|
| `gitTry` | 7 | `world.run` | 8 |
| `blockers.push` | 17 | `captureFailures.push` | 1 |
| `interactUnverifiable` | 5 | `allIssues` | 23 |
| `issueIds` | 11 | `findIssue` | 8 |
| `pushBoard` | 19 | `admit(` | 10 |
| `totalShots` | 7 | `headAfterR2` | 4 |
| `realGates.push` | 5 | `INSTRUMENT_RULES` | 6 |
| `EVIDENCE_BUDGET` | 3 | `RULES_AUDIT` | 2 |
| `harvestSummary` | 3 | `r2Worklist` | 9 |
| `openIssues` | 6 | `normSev` | 2 |

**0.2 world.run 契约**：v32 实际用法是 `await world.run(cmd, args, { timeoutMs })` 并读 `r.exitCode / r.stdout / r.stderr`（见 `runPnpm`、`gitTry`、`ENV_PROBE`、`HARVEST`、G7 健康检查五处）。本稿所有运行期校验都走这条已被实测可用的路：`world.run("node", ["-e", <脚本字符串>])`，node 里用 `require('fs')/require('crypto')/require('child_process')`，**结论一律印成机器可读行 + 非 0 退出码**，DSL 只解析 stdout。这与 v32 已有的 `ENV_PROBE`/`HARVEST` 同法，不引入任何新宿主能力。

> **计数漂移声明**：上表与各节"符号自证"里的 `grep -c` 数值是**本稿撰写时点的快照**。该文件在我写作期间被并行编辑过（已观测到的变化：`blockers.push` 17→19、`harvestSummary` 3→4、`G0 环境预检：DevTools 9420=` 锚点消失、`const r1 = await auditRound(...)` 由两处重复变一处）。**漂移的只是计数，不是锚点**——粘贴前只需重跑 §15.1 那 31 个定位串确认仍为唯一命中即可（我最后一次的批量复核结果是 31/31 = 1）。

**0.3 校验函数统一形状**：`async function xxxGate(...): Promise<{ ok: boolean; detail: string }>`，与既有 `gitTry`/`runPnpm`/`buildGate` 的返回形状一致；失败只往 `blockers`/`captureFailures`/`interactUnverifiable` 里写，**不 throw**（v32 的惯例是防御式收尾，见 [C-11]）。

**0.4 插入方式**：所有 `XXX_RULES` 文本都以「新增顶层 const」形式给出，放在既有规则常量块之后；所有提示词条目都以「数组元素行」形式给出（前后带反引号与逗号），插入位置用锚点行标明「紧随锚点行 / 位于锚点行之前」，锚点行本身不重写，避免与他人的编辑冲突。

**0.5 占位符**：本稿文本里没有 `...`、没有「以下同理」、没有伪代码。函数形参在调用点由 v32 既有局部变量供给（`label`/`dir`/`shotDir`/`tour`/`exec`/`opsFiles` 等，均为 `uiEvidence` 与 `auditRound` 内已声明变量）。

## D1 — provenance 逐轮重算 + 禁止字面量 SHA

### 堵住的是哪个实测数字

**R1 全部 305 帧**按契约属过期证据：`reports/screenshots/round-1-tour/manifest-detail.json.gitSha = "aefd8a72"` 而 HEAD 实为 `18c91ccf`；根因是 `tmp/tour-R2.mjs:71` 留存的原始缺陷写法 `const GIT_SHA = 'aefd8a72'`（现该文件 `:83` 已改成 `gitOut(['rev-parse','--short','HEAD']) || 'unknown'`，`:1376` 加了 unknown 告警）。census §4-D1 与 §3.9 行 `MP-R2VIS-REPORTS-AUDIT-SCREENSHOT-MANIFEST-001` 记同一事实；旁证 `reports/audit/round-2/findings/VISUAL-WAVE2.json#evidenceBase.framesGitSha = "aefd8a72（全部现存帧自报，按 DW:555 属过期证据）"`。
**定义里还留着同一个坑**：v32 第 725 行提示词自己写着 `gitSha: "${gitSha}"`，即**要求采集员把会话级变量抄进 manifest** —— 会话中任何一次 commit（v32 每轮都跑 `commitRound`）之后采集的帧，其 manifest 值就必然与被测字节脱钩，而 `RULES_AUDIT` 的「证据缓存校验」又只看这个字段，于是过期判定永不触发。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量** —— 放在 INSTRUMENT_RULES 之后：

```ts
// ===== 证据溯源协议（v3.2 补 D1：gitSha 必须是采集时刻实测值，且必须是脚本自己算的）=====
const PROVENANCE_RULES = [
  `【provenance 三不】① 不写死：巡检/执行脚本里的 gitSha 必须由脚本自身在同一进程内执行 git rev-parse --short HEAD 得到，禁止字面量（实测教训：R1 轮 tmp/tour-R2.mjs 曾写死 'aefd8a72'，HEAD 实为 18c91ccf，导致 R1 全部 305 帧按契约属过期证据）；② 不抄提示词：编排层提示词里出现的 gitSha= 只是开轮计划值，与脚本实测不一致时以脚本实测为准，并在 notes 里写 "DRIFT plan=<计划值> actual=<实测值>"；③ 不静默：取不到 SHA 只能记 "unknown"，且 unknown 的 manifest 视为无溯源、整轮 UI 证据降级。`,
  `【manifest 必带溯源字段】${WORKFLOW.version} 起的每份 screenshot-manifest 必须含 gitSha / workflowVersion / buildMode / capturedAt（ISO，采集完成时刻）/ gitShaSource（值固定 "script:rev-parse"，另附脚本路径）。缺 capturedAt 或 gitShaSource 的 manifest 按 unknown 处理，不得据其判产品通过或失败。`,
  `【轮内提交即换证据基准】本轮若发生过 commit（${WORKFLOW.ui.endpoint} 之外的 git 写操作由 Git 管家执行），提交之后采集的帧必须写新的 gitSha；不得沿用提交前算出的值给提交后的帧背书。发现混用即整轮证据标 STALE-MIXED 并记 BLOCKER。`,
].join("\n");
```

**(2) 新增顶层校验函数** —— 紧接上一常量之后：

```ts
// 证据溯源机器门禁：manifest.gitSha 是否等于当前 HEAD、是否脚本自算（非字面量）。
// 只读；退出码 1 = 过期或伪造溯源。实测依据：round-1-tour/manifest-detail.json 记 aefd8a72、HEAD=18c91ccf。
async function provenanceGate(label: string, manifestFile: string, scriptPath: string): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 巡检未返回 manifestFile，溯源无从校验（按 unknown 处理）` };
  const PROV_SCRIPT = [
    "const fs=require('fs'),cp=require('child_process');",
    "const mf=process.argv[1]||'',sp=process.argv[2]||'';",
    "let head='';try{head=cp.execSync('git rev-parse --short HEAD',{encoding:'utf8',timeout:8000}).trim()}catch(e){head=''}",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('PROV_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const rec=String(m.gitSha||'');",
    "if(!rec||rec==='unknown'){console.log('PROV_RESULT=FAIL reason=manifest 未记 gitSha（过期判定无从触发）');process.exit(1)}",
    "if(head&&rec!==head){console.log('PROV_RESULT=FAIL reason=manifest.gitSha='+rec+' 当前 HEAD='+head+' 证据与被测提交脱钩');process.exit(1)}",
    "const hits=[];",
    "if(sp&&fs.existsSync(sp)){",
    "const re=/(GIT_SHA|gitSha)\\s*[:=]\\s*[^0-9a-zA-Z\\n]{0,2}([0-9a-f]{7,40})[^0-9a-zA-Z\\n]/;",
    "const ls=fs.readFileSync(sp,'utf8').split(/\\r?\\n/);",
    "for(let i=0;i<ls.length;i++){const t=ls[i].trim();if(t.indexOf('//')===0||t.indexOf('*')===0)continue;if(re.test(ls[i]))hits.push(sp+':'+(i+1)+'='+ls[i].trim().slice(0,90))}",
    "}",
    "if(hits.length){for(const h of hits)console.log('PROV_HARDCODE '+h);console.log('PROV_RESULT=FAIL reason=脚本内出现字面量 SHA，provenance 属自报而非实测');process.exit(1)}",
    "console.log('PROV_RESULT=OK sha='+rec+' head='+head+' capturedAt='+(m.capturedAt||'(缺)')+' shaSource='+(m.gitShaSource||'(缺)')+' script='+(sp||'(未给)'));",
    "process.exit(0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", PROV_SCRIPT, manifestFile, scriptPath]);
    const out = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const tail = out.length ? out[out.length - 1] : "（校验脚本无输出，按 FAIL 处理）";
    return { ok: r.exitCode === 0, detail: `${label}: ${tail}` };
  } catch (e) {
    return { ok: false, detail: `${label}: provenance 校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(3) 提示词条目**（插在采集提示词里，覆盖上一行要求抄会话值的副作用）：

```ts
      `【provenance（v3.2 铁律，优先级高于上一行的 gitSha 提示值）】manifest 里的 gitSha 必须由你的采集脚本运行期执行 git rev-parse --short HEAD 取得，并同批写 capturedAt（ISO）与 gitShaSource="script:rev-parse"；把编排层给的字符串抄进 manifest 属伪造溯源，直接判该轮证据作废。`,
```

**(4) 调用点**（放在 `uiEvidence` 内 tour 返回之后，紧接着把结果写进既有聚合数组）：

```ts
  // v3.2 补 D1：证据溯源机器校验（失败即整轮 UI 证据不得被下游当有效证据消费）
  const prov = await provenanceGate(`${label}-tour`, tour.manifestFile, tour.scriptPath);
  if (!prov.ok) {
    blockers.push(`${label}: G6 溯源门禁 FAIL —— ${prov.detail}`);
    captureFailures.push(`${label}: provenance FAIL，本轮 ${tour.shots.length} 张截图按过期证据处置，不得用于判产品通过/失败`);
    log(`溯源门禁未过：${prov.detail}`);
  } else {
    log(`溯源门禁通过：${prov.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(2) 之前 | `// ===== 真实模式端到端验收协议（v3.2 新增：v3.1 完全没有这一环）=====` | `grep -cF` = 1 → 新常量与新函数插在它**之前** |
| (3) 之后 | ``      `【证据清单（必须）】完成后写 ${dir}/screenshot-manifest.json：{ gitSha: "${gitSha}", workflowVersion: "${WORKFLOW.version}", buildMode: "build:mp-weixin:mock", shots: [{page, path, state}] }。manifestFile 返回该路径。`,` `` | `grep -nF '【证据清单（必须）】完成后写'` → 单命中 |
| (4) 之后 | `  const [tour, opsFiles] = await Promise.all([tourPromise, opsPromise]);` | `grep -cF` → 单命中 |

（不给行号：`grep -n` 打出来的行号会随他人编辑漂移，本表一律以「定位串唯一命中」为准。）

### 符号自证

```
$ grep -cF 'const gitSha = (await gitTry' .zcode/workflows/miniprogram-qa-loop-v32.dwf.ts   → 1
$ grep -cF '【证据清单（必须）】完成后写' …                                                  → 1
$ grep -cF 'const [tour, opsFiles] = await Promise.all([tourPromise, opsPromise]);' …        → 1
$ grep -cF '// ===== 真实模式端到端验收协议' …                                                → 1
$ grep -cF 'manifestFile: string;' …                                                         → 1   (ShotBatch 字段，(4) 里用 tour.manifestFile)
$ grep -cF 'scriptPath: string;' …                                                           → 2   (ShotBatch.scriptPath 与 ExecResult.scriptPath 各一处)
$ grep -cF 'blockers.push' …                                                                 → 17  (既有聚合数组，(4) 复用)
$ grep -cF 'captureFailures.push' …                                                          → 1   (既有聚合数组，(4) 复用)
$ grep -cF 'WORKFLOW.version' …                                                              → 1
$ grep -cF 'WORKFLOW.ui.endpoint' …                                                          → 3
$ grep -cF 'const tourPromise = shooter.ask<ShotBatch>(' …                                   → 1   (证明 (4) 所在作用域确为 uiEvidence)
```
`node -e` 的 `process.argv[1]` 起为附加参数，已在本机实测：`node -e "console.log(JSON.stringify(process.argv))" AAA BBB` → `["D:\\…\\node.exe","AAA","BBB"]`。

### 可机检说明

退出码即结论：`PROV_RESULT=FAIL` + `exit 1`，三种情形各自独立可判 —— ① manifest 缺 `gitSha`/为 `unknown`；② `manifest.gitSha !== 当前 HEAD`；③ 采集脚本里出现字面量 SHA 赋值。
**第 ③ 项的字面量检测器本稿已实测**（只读，正则与跳过注释的规则同上）：
```
$ node -e "<硬编码检测段>"   # 六条样例行
HIT  const GIT_SHA = 'aefd8a72'                ← 历史缺陷原文，必须抓
miss const GIT_SHA = gitOut(['rev-parse',…])   ← 正确写法，不抓
HIT  gitSha: "aefd8a72",  /  const gitSha='18c91ccf'  /  GIT_SHA: 'aefd8a72'   ← 四种写法全抓
HITS=0  ← 跑在 tmp/tour-R2.mjs 上：那行 // 原 defect：`const GIT_SHA = 'aefd8a72'` 是注释，被跳过了
```
**假阳性防护是必需的**：`tmp/tour-R2.mjs:71` 就躺着那句记录历史缺陷的注释，不过滤注释行会直接误报 —— 同一轮已经发生过一次同类工具自伤（`scripts/verify-evidence-integrity.mjs` 首版把 345 张 `zoomFrames` 误报成 345 个孤儿帧）。
不需要新建脚本文件：校验体以 `world.run("node", ["-e", …])` 内联，与既有 `ENV_PROBE`/`HARVEST` 同法。

### 残留风险 / 是否必须外部件

- 定义层能堵住的是「**用了过期/自报的 SHA**」，堵不住「HEAD 本身不可构建」（那是 D16）。
- 若要连历史轮（R1 的 305 帧）一起清算，需要一次性盘查：建议新建 `scripts/qa/verify-provenance-all.mjs`（本稿**不创建**）——读 `reports/**/manifest*.json` 与 `reports/screenshots/**/`，逐份比对 `gitSha` 与该帧文件 mtime 对应的仓库提交，输出「哪些帧属哪次提交」；DSL 只管当轮。

## D3 — 「证据 == 盘」不变量（孤儿帧 / contentHash 回校）

### 堵住的是哪个实测数字

**1 张帧的 manifest 哈希与盘上字节不一致** + **50 张孤儿帧（其中 39 张是 11:0x–12:xx 旧位置授权弹窗污染帧）**，后果是 **V1–V5 五组视觉审查审到旧帧并把旧帧缺陷当成本轮结论**。
证据：`.zcode/tmp/visual-audit-V6-newframes.md:25`（`A/pages_messages_index__空态.png` manifest 记 `3e6b3ce5ef9ac912`、盘上实为 `428a5662791d1b5e`）、`:39`；处置件 `.zcode/tmp/orphan-frames-migration.md`（迁移后「磁盘 1x 帧=254、manifest=254、孤儿=0」）；实物 `.zcode/tmp/orphan-frames-from-12xx-run/`（实测 50 文件）与 `.zcode/tmp/backup-round-2-tour-pre-capture/`（实测 267 PNG）。census §4-D3、§3.9 行 `MP-VIS-V6-00`。

**关键现状**：`scripts/verify-evidence-integrity.mjs`（4810 B，09-25 00:57）**已经实现这套校验并把结论做成退出码**，但 v32 里 `grep -cF 'verify-evidence-integrity'` = **0** —— 也就是工具在仓库里、编排层却不知道它存在。本条的主要工作量就是**接线**，不是重写。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 证据==盘 不变量（v3.2 补 D3：把「证据与盘一致」从叮嘱变成退出码）=====
const EVIDENCE_DISK_RULES = [
  `【G6 磁盘一致性判据】每轮 UI 取证结束后必须跑：node scripts/verify-evidence-integrity.mjs <manifest 路径> --dir <本轮截图根>。判据是硬三条：MISSING==0（manifest 引用的帧在盘上存在）、HASH_MISMATCH==0（manifest.contentHash 与盘上字节 sha256 前 16 位一致）、ORPHANS==0（目录里没有 manifest 未登记的图片）。任一非 0 → 本轮 G6 不得记 PASS，已产出的视觉结论全部降级为「证据未背书」。`,
  `【孤儿帧只许搬迁不许删除】实测教训：round-2-tour/A、B 未清空即复用，磁盘 304 张 1x 帧里 50 张不在 manifest（其中 39 张是上一轮 11:0x–12:xx 的位置授权弹窗污染帧），V1–V5 五组视觉审查因此审到旧帧。发现孤儿帧一律整体搬迁到 .zcode/tmp/orphan-frames-from-<轮次标签>/，并在结论里写明搬迁数量与旧轮归属；禁止 rm，禁止「看起来是旧的」就地覆盖。`,
  `【采集前目录状态必须自报】巡检开始前必须数一次目标目录里的 PNG 数量，写进 manifest 的 preExistingFrames 字段：非 0 就意味着本轮在往旧目录里叠加，判定员据此把该目录整体标 STALE-MIXED。禁止用「先截后清」的顺序规避这项。`,
  `【contentHash 一律实测】哈希由采集脚本对**写盘后的同一份字节**计算（算法固定 sha256 取前 16 位十六进制），不得复用裁切/缩放前的内存缓冲哈希；无哈希的帧不参与配额、不参与判定（见 D4）。`,
].join("\n");
```

**(2) `ShotBatch` 补字段**（`shotRoot` 是本门禁的输入，缺它就必须失败关闭）：

```ts
  /** v3.2 补 D3：本轮帧落盘根目录（工作区相对，如 reports/screenshots/round-2-tour）。
   *  没有它就没法扫孤儿帧——manifest 在 reports/audit/ 下，默认根目录会把整轮校验变成空跑。 */
  shotRoot: string;
```

**(3) 提示词条目**（插进 `uiEvidence` 的巡检提示词，紧随首轮那句之后）：

```ts
      `【落盘根目录（v3.2 必填）】本轮全部帧写入同一个工作区相对根目录，并把该路径原样返回到 shotRoot；shots[].path 必须是相对工作区可直接 existsSync 的路径。开工前先数目标目录里的 PNG 数量写进 manifest.preExistingFrames，非 0 只报不改。`,
```

**(4) 新增顶层校验函数**：

```ts
// 证据==盘 门禁（v3.2 补 D3）。复用仓内既有工具 scripts/verify-evidence-integrity.mjs（只读校验），
// 不新建脚本；它的 stdout 契约：EVIDENCE_SHOTS=.. MATCHED=.. MISSING=.. HASH_MISMATCH=.. ORPHANS=.. DUP_STATE_GROUPS=..
async function evidenceDiskGate(label: string, manifestFile: string, shotRoot: string): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 未返回 manifestFile，无法核对证据与盘` };
  if (!shotRoot) return { ok: false, detail: `${label}: 未返回 shotRoot，孤儿帧扫描会退化成空跑（失败关闭）` };
  try {
    const r = await world.run("node", ["scripts/verify-evidence-integrity.mjs", manifestFile, "--dir", shotRoot]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("EVIDENCE_SHOTS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("EVIDENCE_RESULT=") === 0) || (r.exitCode === 0 ? "EVIDENCE_RESULT=PASS(未打印)" : "EVIDENCE_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const bad = lines.filter(l => l.indexOf("EVIDENCE_MISSING") === 0 || l.indexOf("EVIDENCE_MISMATCH") === 0 || l.indexOf("EVIDENCE_ORPHAN") === 0).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${bad.length ? " | 样例 " + bad.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 一致性校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(5) 调用点 A（巡检目录）**：

```ts
  // v3.2 补 D3：证据==盘（MISSING/HASH_MISMATCH/ORPHANS 三条硬判据）
  const diskTour = await evidenceDiskGate(`${label}-tour`, tour.manifestFile, tour.shotRoot);
  if (!diskTour.ok) {
    blockers.push(`${label}: G6 证据一致性 FAIL —— ${diskTour.detail}`);
    log(`G6 证据一致性未过：${diskTour.detail}`);
  } else {
    log(`G6 证据一致性通过：${diskTour.detail}`);
  }
```

**(6) 交互目录侧为何不在这里查**：`ExecResult` 里没有 manifest 字段（`grep -cF 'manifestFile: string;'` = 1，只在 `ShotBatch`），交互证据的盘上存在性由 **D5 的逐用例证据门禁**负责，本条只对巡检目录硬阻断。要把它升成第二道硬门禁，需要先给 `ExecResult` 加 `manifestFile` 并要求执行员产出 manifest —— 那是接口改动，不属本条文本范围，主代理若要一起做请在 D5 一节里连带处理。

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(4) 之前 | `// ===== 真实模式端到端验收协议（v3.2 新增：v3.1 完全没有这一环）=====` | 单命中；顺序建议：D1 块 → D3 块 → 该行 |
| (2) 之后 | `  /** 证据清单落盘路径（manifest，含 gitSha/构建指纹/截图清单；审查前必须校验） */` | 单命中（在 `interface ShotBatch` 内，紧接其注释行之后即为 `manifestFile: string;`） |
| (3) 之后 | ``      `第 ${label} 轮截图巡检（单会话、Suite 化）。构建已由脚本完成，当前 gitSha=${gitSha}。${reuseNote ? "\n" + reuseNote : ""}`,`` | 单命中 |
| (5) 之后 | `  for (const f of tour.failures) captureFailures.push(\`${label} ${f.page}: ${f.reason}\`);` | 单命中 |

### 符号自证

```
$ grep -cF '// ===== 真实模式端到端验收协议' …v32.dwf.ts   → 1
$ grep -cF '/** 证据清单落盘路径（manifest' …               → 1
$ grep -cF '第 ${label} 轮截图巡检（单会话、Suite 化）' …    → 1
$ grep -cF 'for (const f of tour.failures) captureFailures.push' … → 1
$ grep -cF 'return { tour, exec, opsFiles };' …             → 1
$ grep -cF 'blockers.push' …                                → 17
$ grep -cF 'captureFailures.push' …                         → 1
$ grep -cF 'world.run' …                                    → 8
$ grep -cF 'manifestFile: string;' …                        → 1  (ShotBatch.manifestFile)
$ grep -cF 'resultsFile: string;' …                         → 1  (ExecResult.resultsFile，(6) 说明里引用其命名风格)
$ grep -cF 'verify-evidence-integrity' …                    → 0  ← 工具存在但未接线，本条正是补这一处
$ ls scripts/verify-evidence-integrity.mjs                  → 4810 B，含 EVIDENCE_SHOTS/EVIDENCE_RESULT 输出与 process.exit(hardFail ? 1 : 0)
```

### 可机检说明

已经是退出码，不需要自然语言叮嘱：`missing.length || mismatch.length || orphans.length` → `exit 1`。DSL 只解析 `EVIDENCE_SHOTS=… ORPHANS=…` 行写进 `blockers`。
**假阳性提醒（写给主代理）**：该脚本首版把 345 张 `zoomFrames` 误报成孤儿帧，现版本已把 `zoomFrames[].path` 计入「已引用」。接线时**不要**把 `--dir` 指到 `reports/audit/round-N`（manifest 所在目录，里面没有 PNG，会让孤儿扫描空跑即通过），必须指到截图根。

### 残留风险 / 是否必须外部件

- **必须的一次性外部件**：盘上现存的 50 张孤儿帧与 267 张备份帧已被搬迁过一次，但 `reports/screenshots/` 下还有历史轮目录（`round-1-tour/`、`round-1-after/`、`r11-acceptance/`）从未按新判据校过。DSL 只管当轮，历史清算要跑一次全量：建议 `scripts/qa/verify-evidence-corpus.mjs`（本稿不创建），读 `reports/screenshots/**` 与所有 `manifest*.json`，逐目录输出 MISSING/HASH_MISMATCH/ORPHANS 三计数。
- 定义文本堵不住「采集员自己写 `shots[].path` 时就把路径写错」这一层，靠的是本条的 `existsSync` 复核，已覆盖。

## D4 — 状态配额按内容哈希去重 + 目录清盘

### 堵住的是哪个实测数字

**29 组「不同状态」帧字节完全相同（267 帧里 10.9%）**、**`countsTowardStateQuota=true` 仅 241/254**、**`stateNotAppliedCount=37`**、`round-2-tour/manifest-detail.json#failures[]` 45 条中 `state-not-applied` 占 37 条。
证据：census §4-D4、§3.9 行 `MP-R2VIS-TMP-TOUR-R2-002`（P0）；`reports/audit/round-2/screenshot-manifest.json#quotaSemantics` 原文自认「上一轮把它们当独立状态帧落盘，正是评审 A-2 的 29 组重复来源」。
**修复只做了一半**：在册帧加了哈希判定，但 ① 目录未清、② 哈希未回校、③ `scripts/verify-evidence-integrity.mjs` 虽已算出 `DUP_STATE_GROUPS`，其 `hardFail` 表达式却是 `missing.length || mismatch.length || orphans.length` —— **dupState 不参与退出码**，凑满配额依然能过。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 状态配额内容学（v3.2 补 D4：配额按"字节不同"计，不按"标签不同"计）=====
const STATE_QUOTA_RULES = [
  `【配额只认字节】R11 §3 的每页帧数配额（普通页≥1、滚动页≥3、核心页≥6）只统计 contentHash 互不相同的帧；同一页里 state 标签不同但字节相同的帧算 1 张，且必须在 manifest 里显式打 countsTowardStateQuota=false + aliasLabel=true。实测教训：上一轮 267 帧里 29 组「不同状态」字节完全相同，核心页 ≥6 状态是被同名不同质凑满的。`,
  `【状态未生效必须回校】stateNotApplied[] 里的帧（实测 37 条）不得留在配额分母里，也不得留在判定证据里：判定员引用前必须逐条回看该帧是否真的呈现了目标状态，未呈现的按「无法取证」处理（与 D5 同一等态），禁止当作"页面就是长这样"的证据下缺陷结论。`,
  `【清盘先于补拍】同一轮内补拍/重截必须写回同一目录，且写回前先把该目录既有帧逐张与 manifest 哈希回校：回校不过的帧按 D3 搬迁，不许留着与新帧混成一个"状态集"。实测教训：本轮给在册帧加了哈希判定却没清目录，于是"配额已修"与"目录仍混"两件事同时为真。`,
].join("\n");
```

**(2) 新增顶层校验函数**（读 manifest + DSL 手里的页面清单，纯只读）：

```ts
// 状态配额内容门禁（v3.2 补 D4）：同一页内"不同状态=相同字节"即判配额造假。
// 实测依据：countsTowardStateQuota=true 仅 241/254、stateNotAppliedCount=37、评审 A-2 的 29 组重复。
async function stateQuotaGate(label: string, manifestFile: string, pages: PageEntry[]): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 无 manifest，配额无从核对` };
  const QUOTA_SCRIPT = [
    "const fs=require('fs');",
    "const mf=process.argv[1]||'';",
    "let pages=[];try{pages=JSON.parse(process.argv[2]||'[]')}catch(e){pages=[]}",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('QUOTA_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const shots=m.shots||[];",
    "if(!shots.length){console.log('QUOTA_RESULT=FAIL reason=manifest 无 shots');process.exit(1)}",
    "const noFlag=shots.filter(function(s){return typeof s.countsTowardStateQuota!=='boolean'}).length;",
    "const noHash=shots.filter(function(s){return !s.contentHash}).length;",
    "const pg=new Map();",
    "for(const s of shots){const k=String(s.page||'')+'::'+String(s.contentHash||'');if(!pg.has(k))pg.set(k,new Set());pg.get(k).add(String(s.state||''));}",
    "let dupGroups=0;const dupEx=[];",
    "for(const e of pg){if(e[1].size>1){dupGroups++;if(dupEx.length<3)dupEx.push(e[0].split('::')[0]+'×'+e[1].size+'态')}}",
    "const elig=new Map();",
    "for(const s of shots){if(s.countsTowardStateQuota===false)continue;if(!s.contentHash)continue;const k=String(s.page||'');if(!elig.has(k))elig.set(k,new Set());elig.get(k).add(String(s.contentHash));}",
    "const core=new Set(pages.filter(function(p){return p.core}).map(function(p){return p.route}));",
    "let shortCore=0,shortOther=0,shortEx=[];",
    "for(const p of pages){const got=(elig.get(p.route)||new Set()).size;const need=p.core?6:1;if(got<need){if(p.core)shortCore++;else shortOther++;if(shortEx.length<3)shortEx.push(p.route+' '+got+'/'+need)}}",
    "const snaList=Array.isArray(m.stateNotApplied)?m.stateNotApplied.length:-1;",
    "const snaCount=typeof m.stateNotAppliedCount==='number'?m.stateNotAppliedCount:-1;",
    "if(snaCount>=0&&snaList<0){console.log('QUOTA_RESULT=FAIL reason=记了 stateNotAppliedCount 却没落 stateNotApplied[] 清单（哈希未回校）');process.exit(1)}",
    "const eligible=[...elig.values()].reduce(function(a,b){return a+b.size},0);",
    "console.log('QUOTA_PAGES='+pages.length+' ELIGIBLE_DISTINCT='+eligible+'/'+shots.length+' NO_FLAG='+noFlag+' NO_HASH='+noHash+' DUP_STATE_GROUPS='+dupGroups+' SHORT_CORE='+shortCore+' SHORT_OTHER='+shortOther+' STATE_NOT_APPLIED='+snaList);",
    "if(dupEx.length)console.log('QUOTA_DUP '+dupEx.join(' ; '));",
    "if(shortEx.length)console.log('QUOTA_SHORT '+shortEx.join(' ; '));",
    "const hardFail=dupGroups>0||noFlag>0||shortCore>0||snaCount>0;",
    "console.log(hardFail?'QUOTA_RESULT=FAIL（配额被同名不同质凑满或有状态未生效帧）':'QUOTA_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", QUOTA_SCRIPT, manifestFile, JSON.stringify(pages.map(p => ({ route: p.route, core: p.core })))]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("QUOTA_PAGES=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("QUOTA_RESULT=") === 0) || (r.exitCode === 0 ? "QUOTA_RESULT=PASS(未打印)" : "QUOTA_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 配额校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(3) 提示词条目**（紧随 R11 §3 那句配额要求之后）：

```ts
      `【配额内容学（v3.2）】上面这句配额只统计字节内容互不相同的帧：同一页里 state 标签不同但 contentHash 相同的，必须打 countsTowardStateQuota=false + aliasLabel=true，且在 notes 里写清"这几张是同帧别名"。状态没真正生效的帧（弹窗没弹出、数据没切换、空态没触发）必须进 stateNotApplied[] 并同步 stateNotAppliedCount，两者缺一即视为清单自相矛盾。`,
```

**(4) 调用点**（巡检完成后、进入六路复核之前）：

```ts
  // v3.2 补 D4：状态配额内容门禁（同名不同质帧 / 状态未生效帧）
  const quota = await stateQuotaGate(`${label}-quota`, tour.manifestFile, pages);
  if (!quota.ok) {
    blockers.push(`${label}: G6 状态配额 FAIL —— ${quota.detail}`);
    log(`状态配额未过：${quota.detail}`);
  } else {
    log(`状态配额通过：${quota.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(2) 之前 | `// ===== 证据预算协议（减少截图与解析成本）=====` | `grep -cF` = 1 |
| (3) 之后 | ``      `要求（R11 §3）：普通页≥1 张首屏；滚动页≥3 张（顶/中/底）；核心页≥6 张（默认/滚动/交互后/空态/数据态/弹层态）；表单页+2（校验错误/键盘弹起）；双身份尽量覆盖；参数用既有固化表（${recon.captureHow}）。`,`` | `grep -cF '普通页≥1 张首屏；滚动页≥3 张'` = 1 |
| (4) 之前 | ``  log(`第 ${label} 轮巡检完成：${tour.shots.length} 张截图覆盖 ${tour.pagesCovered} 页；用例清单 ${opsFiles.reduce((s, o) => s + o.cases, 0)} 条已备好`);`` | `grep -cF '第 ${label} 轮巡检完成：${tour.shots.length} 张截图覆盖'` = 1 |

### 符号自证

```
$ grep -cF '// ===== 证据预算协议（减少截图与解析成本）=====' …v32.dwf.ts   → 1
$ grep -cF '普通页≥1 张首屏；滚动页≥3 张' …                                  → 1
$ grep -cF '第 ${label} 轮巡检完成：${tour.shots.length} 张截图覆盖' …        → 1
$ grep -cF 'async function uiEvidence' …                                     → 1  （(4) 所在作用域；形参 pages: PageEntry[] 在 708 行签名里）
$ grep -cF 'interface PageEntry {' …                                         → 1  （route/name/core 三字段，函数只用 p.route/p.core）
$ grep -cF 'manifestFile: string;' …                                         → 1
$ grep -cF 'blockers.push' …                                                 → 17
$ grep -cF 'world.run' …                                                     → 8
$ node -e "…读 reports/audit/round-2/screenshot-manifest.json…"
  → n=254  shots[].page 形如 "pages/home/index"（与 PageEntry.route 同格式，可直接对表）
  → countsTowardStateQuota 取值域 = ["true","false"]（本函数的 noFlag 判据据此写）
  → stateNotApplied 数组长度 37 == stateNotAppliedCount 37
$ grep -nF 'const hardFail' scripts/verify-evidence-integrity.mjs
  → 91:process.exit(hardFail ? 1 : 0);  其定义为 missing.length || mismatch.length || orphans.length —— 不含 dupState
```

### 可机检说明

四条断言全部是退出码：`DUP_STATE_GROUPS>0`（同名不同质）、`NO_FLAG>0`（清单没打配额标记，即上一轮口径）、`SHORT_CORE>0`（核心页 distinct hash < 6）、`stateNotAppliedCount` 与 `stateNotApplied[]` 长度不一致（记了数却没落清单）。
阈值 6 与 1 直接抄自 R11 §3 在 v32 提示词里的原文，不新增魔法数；「滚动页≥3」不做机检，因为 `PageEntry` 没有"是否滚动页"字段（要机检就得先给该接口加字段，属接口改动，本条不越权）。
**建议对既有脚本做一处小改（属外部脚本，本稿不改）**：`scripts/verify-evidence-integrity.mjs` 把 `const hardFail = missing.length || mismatch.length || orphans.length;` 改为再 `|| dupState.length`，这样 D3 与 D4 共用一个工具即可，本条内联函数可退化为兜底二次校验。

### 残留风险 / 是否必须外部件

- 需要**改外部脚本一行**才能把 dupState 升成退出码（理由见上）。DSL 内联函数已能独立判 FAIL，两处并存不冲突，但长期应合流。
- 「目录未清」这一半：DSL 只能检当轮（D3 的 `ORPHANS==0` + 本条的 `NO_FLAG/DUP`），`.zcode/tmp/backup-round-2-tour-pre-capture/` 里 267 张与 `reports/screenshots/` 下历史轮目录需要一次性人工归档，同 D3 的 `scripts/qa/verify-evidence-corpus.mjs` 建议件。

## D5 — 第四等态 NO-EVIDENCE（无干净帧即不得记 EXECUTED）

> D5 的「requiresReal 分域」一半已在 v32 的 `INSTRUMENT_RULES` 里闭合；**本节只处理未闭合的那一半：执行器状态域缺第四等态**。

### 堵住的是哪个实测数字

**298 条被记 `EXECUTED` 的用例其实没有任何干净截图**（523 条 EXECUTED 里的 57.0%），全轮 **536/941 用例（57.0%）无干净 PNG**，`evidence[]` 1270 条里 **437 条带 `ERROR:timeout waiting for automator response`（34.4%）**；而状态域实测只有三态 —— `tmp/qa/checkpoints/exec-R2.json`、`.zcode/tmp/exec-stop-snapshot.json#status`（仅 3 键）、`reports/audit/round-2/interact/exec-results.json` 的 `status` 取值域 = {EXECUTED, SKIPPED, FAILED}。
"无法取证"这一档只活在 judge 的自然语言里：`MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-109`（45 项里 40 UNVERIFIED）、`MP-R1-C26-003`（49 条里 43 不可仲裁）。证据：census §4-D5、§3.9「截图落盘失败」行、§2.1 末段、§5 第 9 项。
天花板自证：`.zcode/tmp/TAKEOVER-HANDOFF.md:48-49`「999 条 UNVERIFIED 中 EXECUTOR_FAULT 567、AUTOMATOR_LIMIT 231、MODE_DEPENDENT 仅 82…VERIFIED 上限约 25.8%」。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 取证四等态（v3.2 补 D5：EXECUTED 必须有干净帧，否则只能落第四等态）=====
const EVIDENCE_STATE_RULES = [
  `【状态域四值，不是三值】用例状态取值域固定为 EXECUTED / FAILED / SKIPPED / NO-EVIDENCE。第四态 NO-EVIDENCE 的含义是"动作可能执行了，但本轮拿不出可复核的干净证据"：证据路径为空、剥掉尾注后文件不存在、体积低于阈值、或证据串里混着 ERROR/timeout。`,
  `【禁止用 EXECUTED 冒充已取证】EXECUTED 的判据是"按 tier 要求的证据全部落盘且可复核"，不是"脚本没抛异常"。实测教训：R2 的 523 条 EXECUTED 里 298 条（57.0%）没有任何干净截图，按三态口径这 298 条被读成"已验证通过"，通过率因此彻底失真；另有 437 条证据串直接写着 ERROR:timeout waiting for automator response。`,
  `【SKIPPED 必须带能力归因】SKIPPED 只能因"执行器能力边界"（swipe 无元素 API、el.input is not a function、桌面模拟器不渲染软键盘），且 reason 必须写 capability=<能力名>。实测 R2 的 129 条 SKIPPED 100% 属此类，全部前缀 action-not-automatable:；把它们算成产品缺陷是反向失真。`,
  `【judge 层同规则】判定结论 verdict 的取值域同样含 NO-EVIDENCE：证据缺失/外部占用/仲裁不了的，一律写进 unverifiable 并在用例上落第四态，禁止只在自然语言里说"40 项 UNVERIFIED"却没有可统计字段——上一轮就是这个缺口导致 VERIFIED 上限（约 25.8%）无人能从产物里算出来。`,
].join("\n");
```

**(2) `ExecResult` 补字段**（紧随 `/** 已执行用例数 */` 的 `executed: number;` 之后）：

```ts
  /** v3.2 补 D5：第四等态计数（动作可能跑了但没有干净证据）。
   *  executed 不再等于"有证据的用例数"，下游算通过率必须用 executed - noEvidence 作分子。 */
  noEvidence: number;
```

**(3) 提示词条目**（执行员提示词，紧随 `status=EXECUTED|FAILED|SKIPPED` 那句之后）：

```ts
      `【四等态（v3.2 必填）】status 取值域是 EXECUTED|FAILED|SKIPPED|NO-EVIDENCE。判 EXECUTED 前必须逐条核对：按该用例 tier 要求的证据是否都写进 evidence[] 且**剥掉尾注（括号串）后文件真实存在**；不满足就落 NO-EVIDENCE 并写 missingEvidence=<缺哪类>。禁止把 "xxx.png(ERROR:timeout…)" 这种带错误尾注的串当证据，禁止把"没抛异常"读成"已取证"。返回 noEvidence 计数。`,
```

**(4) 提示词条目**（A6 判定员，紧随既有【判定分域（v3.2 必做）】之后）：

```ts
      `【第四态入结构化字段（v3.2）】checks[].verdict 允许值含 NO-EVIDENCE；凡 EXECUTED 但按 tier 应有截图/路由/console 而缺的，改判 NO-EVIDENCE 并计入 unverifiable（格式「用例|缺什么证据|尝试次数」）。分母口径固定为：可判定用例 = 总用例 − NO-EVIDENCE − SKIPPED(能力边界)，报告里必须把这两个扣减数印出来。`,
```

**(5) 新增顶层校验函数**（四态一致性 + EXECUTED 无干净帧计数）：

```ts
// 第四等态机器门禁（v3.2 补 D5）。只读 exec-results.json，退出码 1 = 状态域越界 / 有 EXECUTED 未满足本 tier 证据要求。
// 实测依据（本稿已在 R2 真数据上跑通，见"可机检说明"）：523 条 EXECUTED 中 298 条无干净帧、按 tier 判有 194 条不达标。
async function execEvidenceGate(label: string, resultsFile: string): Promise<{ ok: boolean; detail: string }> {
  if (!resultsFile) return { ok: false, detail: `${label}: 未返回 resultsFile，四等态无从校验` };
  const EVID_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'';",
    "let j={};try{j=JSON.parse(fs.readFileSync(rf,'utf8'))}catch(e){console.log('STATE_RESULT=FAIL reason=结果文件不可读 '+rf);process.exit(1)}",
    "const rows=j.results||[];",
    "if(!rows.length){console.log('STATE_RESULT=FAIL reason=results[] 为空，执行账本没有任何用例');process.exit(1)}",
    "const DOMAIN={EXECUTED:1,FAILED:1,SKIPPED:1,'NO-EVIDENCE':1};",
    "const NEED={critical:2,normal:1,navigation:0,noop:0};",
    "const stray={};",
    "const strip=function(s){let b=String(s).trim();let g=0;while(g++<3&&/\\([^)]*\\)\\s*$/i.test(b))b=b.replace(/\\([^)]*\\)\\s*$/i,'').trim();return b};",
    "let noClean=0,executed=0,errInEvidence=0,noEvidenceTagged=0,tierUnmet=0,skippedNoWhy=0;const ex=[];",
    "for(const r of rows){",
    "  const st=String(r.status||'');",
    "  if(!DOMAIN[st])stray[st||'(空)']=(stray[st||'(空)']||0)+1;",
    "  const why=String(r.failureReason||r.observed||'');",
    "  if(st==='SKIPPED'&&why.indexOf('action-not-automatable')<0&&why.indexOf('capability=')<0)skippedNoWhy++;",
    "  const evs=Array.isArray(r.evidence)?r.evidence:[];",
    "  let clean=0;",
    "  for(const raw of evs){const s=String(raw);if(/ERROR:|timeout/i.test(s)){errInEvidence++;continue}const b=strip(s);if(!/\\.(png|jpe?g|webp|gif)$/i.test(b))continue;if(fs.existsSync(b))clean++}",
    "  if(st==='NO-EVIDENCE')noEvidenceTagged++;",
    "  if(st!=='EXECUTED')continue;",
    "  executed++;",
    "  if(clean===0){noClean++}",
    "  const tier=String(r.tier||'');const need=NEED[tier]===undefined?1:NEED[tier];",
    "  const okPic=clean>=need;",
    "  const okRoute=Array.isArray(r.route)&&r.route.length>0;",
    "  const okLog=(Array.isArray(r.console)&&r.console.length>0)||String(r.observed||'').length>0;",
    "  const met=tier==='navigation'?(okRoute||okLog):tier==='noop'?okLog:okPic;",
    "  if(!met){tierUnmet++;if(ex.length<5)ex.push(String(r.suite||'?')+'/'+String(r.id||'?')+'('+tier+',帧='+clean+')')}",
    "}",
    "const strayList=Object.keys(stray).map(function(k){return k+'×'+stray[k]}).join(',');",
    "console.log('STATE_ROWS='+rows.length+' EXECUTED='+executed+' EXECUTED_NO_CLEAN_FRAME='+noClean+' EXECUTED_TIER_UNMET='+tierUnmet+' TAGGED_NO_EVIDENCE='+noEvidenceTagged+' ERROR_STRINGS_IN_EVIDENCE='+errInEvidence+' SKIPPED_WITHOUT_CAPABILITY='+skippedNoWhy+' DOMAIN_VIOLATIONS='+(strayList||'0'));",
    "if(ex.length)console.log('STATE_UNMET_SAMPLES '+ex.join(' ; '));",
    "const hardFail=!!(tierUnmet||skippedNoWhy||strayList);",
    "console.log(hardFail?'STATE_RESULT=FAIL（有用例被记成 EXECUTED 却没交齐本 tier 的证据，或状态域越界）':'STATE_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", EVID_SCRIPT, resultsFile]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("STATE_ROWS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("STATE_RESULT=") === 0) || (r.exitCode === 0 ? "STATE_RESULT=PASS(未打印)" : "STATE_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 四等态校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(6) 调用点**（执行完成之后、进入复核之前；同时把计数落到既有看板变量上）：

```ts
  // v3.2 补 D5：EXECUTED 必须有干净帧，否则整批落第四等态
  const stGate = await execEvidenceGate(label, exec.resultsFile);
  if (!stGate.ok) {
    blockers.push(`${label}: G6 四等态 FAIL —— ${stGate.detail}`);
    interactUnverifiable.push(`${label}: 本轮按 tier 应证未证的用例已计入 NO-EVIDENCE（见上条 detail），不得进入通过率分子`);
    log(`四等态门禁未过：${stGate.detail}`);
  } else {
    log(`四等态门禁通过：${stGate.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(5) 之前 | `// ===== UI Lock 状态机协议（v3.2：AVAILABLE/LEASED/STALE + RELEASED 墓碑；不旋轮重试）=====` | `grep -cF` = 1 |
| (2) 之后 | `  /** 已执行用例数 */`（其后即 `executed: number;`，位于 `interface ExecResult` 内） | `grep -cF '  /** 已执行用例数 */'` = 1 |
| (3) 之后 | 含 `status=EXECUTED\|FAILED\|SKIPPED）。` 的执行提示词元素行 | `grep -cF 'status=EXECUTED\|FAILED\|SKIPPED'` = 1 |
| (4) 之后 | `      \`【判定分域（v3.2 必做）】执行器回填的 FAILED 里，凡属选择器解析不到/__CAND__ 占位/工具噪声，一律改判 UNVERIFIED-INSTRUMENT 并单列进 unverifiable…\`` | `grep -cF '【判定分域（v3.2 必做）】'` = 1 |
| (6) 之前 | ``  log(`第 ${label} 轮执行完成：${exec.executed} 条用例，失败/跳过 ${(exec.failures ?? []).length}`);`` | `grep -nF '轮执行完成：'` = 1 命中 |
| （可选）| `  /** VERIFIED / FAILED / UNVERIFIED */`（`OpCheck.verdict` 注释） | `grep -cF` = 1；若一并改成 `/** VERIFIED / FAILED / UNVERIFIED / NO-EVIDENCE */` 即结构体也自证 |

### 符号自证

```
$ grep -cF '// ===== UI Lock 状态机协议' …v32.dwf.ts                 → 1
$ grep -cF '  /** 已执行用例数 */' …                                  → 1
$ grep -cF 'status=EXECUTED|FAILED|SKIPPED' …                        → 1
$ grep -cF '【判定分域（v3.2 必做）】' …                              → 1
$ grep -cF '轮执行完成：' …                                           → 1
$ grep -cF 'unverifiable' …                                          → 10  (JudgeBatch.unverifiable / interactUnverifiable 既有语义)
$ grep -cF 'interactUnverifiable' …                                  → 5   （含 const 声明，(6) 复用它的 .push）
$ grep -cF '/** VERIFIED / FAILED / UNVERIFIED */' …                 → 1
$ grep -cF 'blockers.push' …                                         → 17
$ grep -cF 'interface ExecResult {' …                                → 1
$ node -e "…exec-results.json 取 status 取值域…"                      → {EXECUTED:523, SKIPPED:129, FAILED:289}，无第四态
```
尾注剥离正则 `/\([^)]*\)\s*$/i` 与「先剥再判存在」的顺序**不是我自己发明的**：`scripts/verify-evidence-integrity.mjs` 的 `--exec` 分支踩过的两个假阳性都写在其注释里（只剥 ERROR 类会把 575 条带 `(155040B)` 大小注记的正常路径误判成断链；不剥则把 437 条噪声全算成断链）。本函数抄同法，避免同一个坑再踩。

### 可机检说明

**本稿已在 R2 真数据上把这段 node 脚本跑通**（只读，无写入）：
```
$ node -e "<EVID_SCRIPT>" reports/audit/round-2/interact/exec-results.json
STATE_ROWS=941 EXECUTED=523 EXECUTED_NO_CLEAN_FRAME=298 EXECUTED_TIER_UNMET=194 TAGGED_NO_EVIDENCE=0
ERROR_STRINGS_IN_EVIDENCE=437 SKIPPED_WITHOUT_CAPABILITY=0 DOMAIN_VIOLATIONS=0
STATE_UNMET_SAMPLES PAGES-HOME-INDEX/H01(normal,帧=0) ; PAGES-HOME-INDEX/H05 ; …
STATE_RESULT=FAIL      EXIT=1
```
`EXECUTED_NO_CLEAN_FRAME=298` 与 census §5 第 9 项逐字吻合（含 `PAGES-HOME-INDEX` 的 H01/H05/H06/H07/H10 样本序列）；`ERROR_STRINGS_IN_EVIDENCE=437` 与 §3.9 吻合；`TAGGED_NO_EVIDENCE=0` 就是"第四等态不存在"的直接实证。判 FAIL 用的是 `EXECUTED_TIER_UNMET`（按 tier 应交 2/1/路由/日志 而未交，194 条）而不是 298 —— 因为 navigation/noop 两档按 `EVIDENCE_BUDGET` 本来就不产 PNG，用"无像素"当唯一判据会把这 158 条误伤；两个数都印出来便于对账。
**踩坑记录（写给主代理，别重抄一遍）**：SKIPPED 的能力归因 `action-not-automatable:` 实测落在 **`observed` 字段**里（`failureReason` 只有 FAILED 才有值）。本条函数第一版只读 `failureReason||reason`，于是 129 条正常 SKIPPED 全被判成"无归因"假阳性；现版本读 `r.failureReason||r.observed`，实测归零。同理，`evidence[]` 里的路径是**绝对 Windows 路径 + 尾注**（`…H04-before.png(155005B)`），必须先剥尾注再 `existsSync`。

### 残留风险 / 是否必须外部件

- **与既有工具合流（建议，属外部脚本改动）**：`scripts/verify-evidence-integrity.mjs` 已经长出 `--exec <file>` 模式，能打印 `EXEC_EVIDENCE_ENTRIES=… WITH_ERROR=… EXEC_CLEAN_BUT_MISSING=…`，但它的 `hardFail` 表达式（`const hardFail = missing.length || mismatch.length || orphans.length;`）**仍只算 manifest 侧，`--exec` 分支不参与退出码**。要合流就把该式改成再 `|| withErr || cleanNoFile`，并把本条的 tier 判据搬进去；在改之前，上面的内联函数是唯一把第四态变成退出码的地方（两处并存不冲突）。
- 结构体（`ExecResult.noEvidence`）与执行器实际返回是否一致，只能靠执行员自觉；本条用机器门禁兜底（缺字段/数不上即 FAIL），定义文本本身无法强制。
- 「键盘弹起态 / 滑动手势 / 拖拽滑块」这类**能力边界**（census §5 第 8 项：129 条 SKIPPED + 3 条 `键盘弹起态不可达`）不是定义能解决的：要么接受 NO-EVIDENCE 长期存在，要么换取证手段（真机/手工补拍）。本条只保证它被如实统计，不消除它。

## D7 — 台账收敛：单一 ID 谱系 + 状态回写 + 唯一「待修复」口径

### 堵住的是哪个实测数字

**同一缺陷 2–4 个 ID**、**"待修复"总量三处口径互斥（335 / 552 / 674 被自注虚高）**、**237 个 `MP-*` ID 存在于落盘 JSON 却从未进任何矩阵**。
具体：i18n 同缺陷 4 ID（`MP-R1-CAMPUSINDEX-001` / `MP-R1-REQ-002` / `MP-R1-REG-CAMPUSINDEX-001` / `-002`）；VILLAGE 热度榜 2 ID（`MP-R3-VILLAGE-INDEX-002` + `MP-R1-VILLAGE-INDEX-002`）；官方号助手断链 2 ID；circle-home 点赞假值 2 ID（`MP-R1-CIRCLEHOME-102` + `MP-R1-REQ20-005`）。状态过期实证：`MP-R1-PAGES-MESSAGES-INDEX-101` 仍挂"待修复"，而 `.zcode/tmp/backup-private_messages-3894.md` 记库内残留已 `DELETED`。
证据：census §4-D7、§3.0（四本账逐本实测）、§3.9「台账失明」行（`reports/audit/round-2/findings/VISUAL-WAVE2.json#collateralFindings[0]`）；`reports/audit/round-2/harvest.json` 实测 `summary.total=473 / all[] 里 status="待修复"=335`，`.zcode/tmp/TAKEOVER-HANDOFF.md:45` 记 552。
**定义侧根因**：v32 的 `normalizeIssue` 只按 **id 字符串**去重（`if (id === "" || seen.has(id))` → 生成新号），跨 ID 的同一缺陷它**结构上检不出来**；而各份 md 矩阵里的总数是代理自己算的，没有任何一处从台账回读。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 台账收敛协议（v3.2 补 D7：同一缺陷只许一个正号，状态必须回写，总数只有一本账）=====
const LEDGER_RULES = [
  `【单一正号】一个缺陷只有一个 canonical id。新立项前必须先按「同页 + 同 category + 描述前 40 字归一化」检索既有台账；命中即**不得新建 ID**，改为把新 ID 追加进既有条目的 aliases[]，并把新证据并进 evidence。实测教训：i18n 裸键这一个缺陷挂了 4 个 ID、VILLAGE 热度榜挂了 2 个，导致修复与终验各修各的、总数永远收敛不了。`,
  `【状态必须回写且有据】status 从「待修复」往前推进时，必须同时写 statusEvidence = 复验证据的「文件:行 或 截图路径」；写不出证据的推进一律不算推进。已清理的外部残留（如已删除的库内数据）若仍让条目挂"待修复"，必须在 statusNote 里写明"卡在哪儿、等什么"，禁止靠口径注水。`,
  `【总数只有一本账】任何报告/矩阵/终报里出现的「待修复 / 各 severity」数字，必须逐字取自本轮台账（编排层内存里的问题全集，与本轮 harvest.json 对账后的结果），禁止各写各的。上一轮同一件事有三个数：harvest.json 记 335、TAKEOVER-HANDOFF 记 552、旧稿记 674 且自注"虚高"——这种账没法审。`,
  `【落盘即入账】写进 code-findings/、findings/、interact/ 的每一个 MP-* ID 都必须被台账收编；台账里没有的 ID 属"漏账"，必须在轮末逐条给出处置（收编 / 判重并入 aliases / 判噪声并注明理由），不许以"矩阵没提"为由留着不管（上一轮 237 个 ID 就是这么消失的）。`,
].join("\n");
```

> **一处踩坑预警（写给主代理）**：本条第 3 款原本想引用 `${REAL_DIR}`，已**刻意去掉**。`REAL_DIR` 在第 1439 行才声明，而规则常量块在 560–620 行区间求值，`const` 有 TDZ，插进去就是运行时 `ReferenceError: Cannot access 'REAL_DIR' before initialization` —— 与今天那起 `gates.push` 引用运行时不存在数组的事故同类。同理，本稿所有插入前部的规则常量只引用 `WORKFLOW.*`（声明在最前）与其它同样位于前部的常量。

**(2) `Issue` 补三个字段**（紧随 `  status: string;` 之后，位于 `interface Issue` 内）：

```ts
  /** v3.2 补 D7：本条是否为他人缺陷的别名（填正号）；正号条目此字段留空 */
  canonical?: string;
  /** v3.2 补 D7：同一缺陷的历史 ID（立项时误开的重号），审计用 */
  aliases?: string[];
  /** v3.2 补 D7：状态推进所依据的复验证据「文件:行」或截图路径；缺它不得离开「待修复」 */
  statusEvidence?: string;
```

**(3) 新增顶层校验函数 A（纯内存：别名族 + 状态回写有据）**：

```ts
// 台账自洽审计（v3.2 补 D7）。只看内存里的 allIssues，不跑外部命令。
function ledgerAudit(): { ok: boolean; detail: string } {
  const fams = new Map<string, Issue[]>();
  for (const it of allIssues) {
    const key = [
      (it.page || "").trim().toLowerCase(),
      (it.category || "").trim().toLowerCase(),
      (it.description || "").replace(/\s+/g, "").slice(0, 40).toLowerCase(),
    ].join("|");
    const arr = fams.get(key) ?? [];
    arr.push(it);
    fams.set(key, arr);
  }
  const unlinked: string[] = [];
  let maxFamily = 0;
  for (const [key, arr] of fams) {
    if (arr.length < 2) continue;
    maxFamily = Math.max(maxFamily, arr.length);
    const declared = arr.filter(i => (i.canonical ?? "") !== "" || (i.aliases ?? []).length > 0);
    if (declared.length === 0) unlinked.push(`${key.slice(0, 60)}×${arr.length}[${arr.map(i => i.id).join(",")}]`);
  }
  const advancedNoProof = allIssues.filter(i => (i.status === "已修复" || i.status === "已修复待终验" || i.status === "已验证") && !(i.statusEvidence ?? "").trim()).length;
  const open = allIssues.filter(i => i.status === "待修复").length;
  const sample = unlinked.slice(0, 3).join(" ; ");
  const detail = `台账 ${allIssues.length} 条 / 待修复 ${open}；未声明谱系的重号族 ${unlinked.length} 组（最大一族 ${maxFamily} 个 ID）；无复验证据的状态推进 ${advancedNoProof} 条${sample ? "；样例 " + sample : ""}`;
  return { ok: unlinked.length === 0 && advancedNoProof === 0, detail };
}
```

**(4) 新增顶层校验函数 B（盘上 ID 全集 vs 台账，对账"漏账"）**：

```ts
// 落盘 ID 全集对账（v3.2 补 D7）：凡写进本轮 findings 的 MP-* ID 必须已被台账收编。
// 实测依据：上一轮 237 个 ID 存在于 code-findings/findings/interact JSON 但未进任何 issue-matrix。
async function ledgerCoverageGate(roundDir: string): Promise<{ ok: boolean; detail: string }> {
  const COV_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const base=process.argv[1]||'';",
    "const ids=new Set();let files=0;",
    "function touch(o){if(o&&typeof o==='object'){if(typeof o.id==='string'&&/^MP-/i.test(o.id))ids.add(o.id.trim());for(const k of Object.keys(o)){const v=o[k];if(Array.isArray(v))v.forEach(touch);else if(v&&typeof v==='object')touch(v)}}}",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory()){walk(p)}else if(e.name.endsWith('.json')){files++;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));touch(j)}catch(err){}}}}",
    "for(const sub of ['code-findings','findings','interact','regression'])walk(base+'/'+sub);",
    "let hv={};try{hv=JSON.parse(fs.readFileSync(base+'/harvest.json','utf8'))}catch(e){}",
    "const openInHarvest=(hv.all||[]).filter(function(x){return x&&x.status==='待修复'}).length;",
    "console.log('COV_FILES='+files+' DISK_IDS='+ids.size+' HARVEST_TOTAL='+((hv.summary&&hv.summary.total)||0)+' HARVEST_OPEN='+openInHarvest);",
    "console.log('DISK_ID_LIST='+Array.from(ids).join(','));",
  ].join("");
  try {
    const r = await world.run("node", ["-e", COV_SCRIPT, roundDir]);
    const out = String(r.stdout || "");
    const stat = (out.split("\n").map(s => s.trim()).filter(Boolean)[0]) || "（对账脚本无输出）";
    const line = out.split("\n").find(s => s.indexOf("DISK_ID_LIST=") === 0) || "";
    const disk = line.slice("DISK_ID_LIST=".length).split(",").map(s => s.trim()).filter(s => s.length > 0);
    const missing: string[] = [];
    for (const id of disk) {
      if (!findIssue(id)) missing.push(id);
    }
    if (r.exitCode !== 0) return { ok: false, detail: `${roundDir}: 对账脚本退出码 ${r.exitCode}（${stat}）` };
    if (missing.length > 0) {
      return { ok: false, detail: `${stat} | 台账外漏账 ID ${missing.length} 个：${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}` };
    }
    return { ok: true, detail: `${stat} | 盘上 ${disk.length} 个 ID 全部在账` };
  } catch (e) {
    return { ok: false, detail: `${roundDir}: 台账对账无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(5) 提示词条目**（记录员产出各矩阵之前）：

```ts
      `【台账口径（v3.2 铁律）】各矩阵与报告里的问题总数、分 severity 数、待修复数一律取自本轮台账（DSL 传入的 allIssues 统计 + 对账结果），不得自行另算、不得引用上一轮文本里的数；同一缺陷只写正号 ID，重号写进"亦见"列。台账外 ID 必须逐条给处置，漏一条就是漏账。`,
```

**(6) 调用点**（终报统计之前，与既有 `counts` 同一处）：

```ts
// v3.2 补 D7：台账自洽 + 落盘 ID 对账（失败只记 blocker 与披露，不中断收尾）
const ledgerSelf = ledgerAudit();
if (!ledgerSelf.ok) {
  blockers.push(`台账未收敛 —— ${ledgerSelf.detail}`);
  log(`台账自洽未过：${ledgerSelf.detail}`);
} else {
  log(`台账自洽通过：${ledgerSelf.detail}`);
}
const ledgerCov = await ledgerCoverageGate("reports/audit/round-2");
if (!ledgerCov.ok) {
  blockers.push(`台账漏账 —— ${ledgerCov.detail}`);
  log(`台账对账未过：${ledgerCov.detail}`);
} else {
  log(`台账对账通过：${ledgerCov.detail}`);
}
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1) 之前 | `// ===== 证据预算协议（减少截图与解析成本）=====` | 1（与 D4 同批，顺序 D4 → D7 → 该行） |
| (2) 之后 | `  status: string;`（`interface Issue` 内唯一一处） | `grep -cF '  status: string;'` = 1 |
| (3)(4) 之前 | `function findIssue(id: string): Issue \| undefined {` | `grep -cF` = 1（(4) 复用 `findIssue`，须放在其后可见；顶层函数声明互相不排序，实际任意位置均可） |
| (5) 之前 | ``写出：audit-report.md（含每页使用对比与功能目标汇总）、issue-matrix.md（逐截图与逐用例）…`` | `grep -cF '写出：audit-report.md（含每页使用对比与功能目标汇总）'` = 1 |
| (6) 之前 | `const counts = { P0: cnt(allIssues, "P0"), P1: cnt(allIssues, "P1")…` | `grep -cF 'const counts = { P0: cnt(allIssues'` = 1 |

### 符号自证

```
$ grep -cF '  status: string;' …v32.dwf.ts                    → 1     (interface Issue 内)
$ grep -cF 'const counts = { P0: cnt(allIssues' …             → 1
$ grep -cF '写出：audit-report.md（含每页使用对比与功能目标汇总）' … → 1
$ grep -cF 'function findIssue(id: string)' …                 → 1     ((4) 里调用的就是它)
$ grep -cF 'const allIssues: Issue[] = [];' …                 → 1     ((3) 遍历它)
$ grep -cF 'const issueIds = new Set<string>();' …            → 1     (说明"只按 id 去重"的现状)
$ grep -cF 'interface Issue {' …                              → 1
$ grep -cF 'const REAL_DIR = "reports/audit/real-e2e"' …      → 1     （声明在文件后部；正因如此本条规则文本不引用它。本稿撰写期间它已从 1439 漂到 1479 行 —— 也是本稿一律不给行号锚点的理由）
$ grep -cF 'blockers.push' …                                  → 17
$ grep -cF 'world.run' …                                      → 8
$ node -e "…harvest.json" → summary.total=473、all[] 里 待修复=335  （机器行的 HARVEST_* 两列口径由此来）
```

### 可机检说明

两个函数各自独立可跑：
- `ledgerAudit()` 断言：① 同「页 + category + 描述前 40 字」族内 ≥2 个 ID 而**族内无人声明 canonical/aliases** 的组数 == 0；② 状态已推进却 `statusEvidence` 为空的条数 == 0。它把"census 里那 4 个 i18n ID"这种形态变成一条可复算的检出规则，而不是叮嘱。
- `ledgerCoverageGate()` 断言：盘上 `MP-*` ID 全集 − 台账 ID 全集 == ∅（实测该差集会报出 237 量级的漏账）。它同时打印 `HARVEST_TOTAL/HARVEST_OPEN`，把"三处口径"变成同一张机器输出行里的三列，差值可见即无法各写各的。
- 均不新建脚本文件（node 侧只用 `fs`/`path`，与既有 `HARVEST` 同法）。

### 残留风险 / 是否必须外部件

- **族归并的语义判定仍是模型活儿**：机器只保证"同族必须显式声明谱系"，把 `MP-R1-CIRCLEHOME-102` 与 `MP-R1-REQ20-005` 判成同一缺陷要靠描述文本相似；描述写法不统一时检不出。彻底的跨源 ID 归并要求**新建 `scripts/qa/verify-ledger.mjs`**（本稿不创建）：读 `code-findings/*.json` + `findings/*.json` + `interact/*.json` + `.zcode/tmp/mode-dependent-issues.json`(数组，124 项) + `reports/audit/*/issue-matrix.md`，做「ID 全集 × 矩阵收录 × 台账收编」三向 diff，并输出 alias 候选表（按 page+severity+关键词）。DSL 侧本条是它的在线子集。
- 「DB 残留已清但条目挂待修复」这类**外部状态**（`.zcode/tmp/backup-private_messages-3894.md`）定义层无从核对，只能靠 `statusNote` 强制披露。

## D8 — 落点分诊先于立 P1

### 堵住的是哪个实测数字

**4 条"零截图"被判成页面级 P1，而 13 页弹跳分诊的结论是 `GENUINE_APP_DEFECT = 0`**（`BUILD_FLAG_ABSENT` 4 / `PARAM_REQUIRED` 2 / `HARNESS_CALL_DEFECT` 7）。
4 条 P1：`MP-R1-PAGES-REGISTER-INDEX-013`、`MP-R1-PAGES-REGISTER-SUCCESS-008`、`MP-R1-CAMPUSINDEX-010`、`MP-R1-MATCHING-101`。反证件：`.zcode/tmp/nav-bounce-triage.md`、`.zcode/tmp/TAKEOVER-HANDOFF.md:67-73`（同处推翻 R1「落在 discover = mock 自动前进」的归因：`session-guard.ts:84-95` 是死代码，`AUTH_GUARD_BOUNCE=0`）。旁证 `reports/audit/round-2/screenshot-manifest.json#gateBypassedShots=16`、`gateBypassRoutes[]` 4 项、`gateBypassSemantics{}`。census §4-D8、§3.9「幽灵参数」行。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 落点分诊协议（v3.2 补 D8：先分诊"为什么没到这一页"，再决定能不能立 P1）=====
const TRIAGE_RULES = [
  `【立 P1 之前必须先分诊落点】凡「本页本轮零截图 / 截图落在别的页 / 打开即被弹走」这类观察，第一步不是立 P1，而是给出 triageCode，取值域固定六选一并附实测依据：BUILD_FLAG_ABSENT（特性开关关闭导致路由被硬跳，如 isShowcaseMode=false / membershipEnabled=false）、PARAM_REQUIRED（缺参或参数表给了幽灵参数）、HARNESS_CALL_DEFECT（巡检脚本自己的调用方式错，如 navigateTo 打 tabBar 页）、PERMISSION_SUPPRESSED（权限弹窗抑制，见 D14）、DEVICE_CAPABILITY_UNREACHABLE（模拟器结构性不可达，见 D5 的 SKIPPED 归因）、GENUINE_APP_DEFECT（应用自己的缺陷）。`,
  `【只有 GENUINE_APP_DEFECT 能留 P0/P1】其余五码：缺陷立项对象是**测试台或环境**，页面级 severity 降为 P2 以下并记 owner=instrument，且必须同时给出"解法一句话"（实测这 13 页的解法成本极低：补 scripts/r11-param-map.json 两条参数、用 mockWxMethod('switchTab') 包住会员路由、给门禁路由记 gateBypass 不占覆盖）。上一轮把 4 条全判成页面级 P1，是因为定义里没有任何一步要求先给落点归因。`,
  `【门禁路由必须单列】因特性开关进不去的路由，逐条写进 manifest 的 gateBypassRoutes 并给出原因与配置来源（文件:行）；这些页的截图记 gateBypass=true，不得计入"页面已覆盖"，也不得因为"截图没落在目标页"而判页面缺陷。实测上一轮有 16 张这类帧。`,
  `【归因要有反证检查】把现象归因给某个代码分支之前，必须先证明该分支真的会被执行：上一轮 R1 把弹跳归因给 session-guard 的自动前进，事后证明那段是死代码、AUTH_GUARD_BOUNCE 实测 0 次 —— 结论错了整整一轮。凡"根因=X 代码"的结论，evidence 里必须含 X 被命中的一次实测记录。`,
].join("\n");
```

**(2) `Issue` 补字段**（紧随 `  sources: string[];` 之后；若与 D7 的三字段合并成一次编辑，就接在 D7 补丁后面）：

```ts
  /** v3.2 补 D8：落点/缺证据分诊码。取值域：
   *  BUILD_FLAG_ABSENT | PARAM_REQUIRED | HARNESS_CALL_DEFECT | PERMISSION_SUPPRESSED
   *  | DEVICE_CAPABILITY_UNREACHABLE | GENUINE_APP_DEFECT
   *  非 GENUINE_APP_DEFECT 者不得占页面级 P0/P1，且必须给 owner=instrument 与一句话解法。 */
  triageCode?: string;
```

**(3) 提示词条目**（插进共享审查规则 `RULES_AUDIT`，紧随【编号】那条之后）：

```ts
  "【落点分诊（先于立 P1）】「零截图 / 落在别页 / 打开即弹走」这类观察必须先给 triageCode 与实测依据再定级：只有 GENUINE_APP_DEFECT 可留 P0/P1；BUILD_FLAG_ABSENT / PARAM_REQUIRED / HARNESS_CALL_DEFECT / PERMISSION_SUPPRESSED / DEVICE_CAPABILITY_UNREACHABLE 一律降级并把 owner 记为 instrument，且写一句最低成本解法（补参数表、包住 switchTab、记 gateBypass）。归因某段代码前必须先证明那段代码真会被执行。",
```

**(4) 新增顶层校验函数**（幽灵参数 + 未分诊 P0/P1 两项机检）：

```ts
// 落点分诊机器门禁（v3.2 补 D8）。三件事：① 参数表里的键必须在该页源码/产物里真的被读（幽灵参数）；
// ② 缺证据类 P0/P1 必须已给 triageCode；③ 非 GENUINE_APP_DEFECT 的不得占 P0/P1。
// 实测依据：?target=10003 在 matching 页源码与编译产物里出现 0 次，却据此立了页面级 P1。
async function bounceTriageGate(label: string, findingsDirs: string[]): Promise<{ ok: boolean; detail: string }> {
  const TRIAGE_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const srcRoot=process.argv[1]||'',distRoot=process.argv[2]||'',dirs=(process.argv[3]||'').split('|').filter(Boolean);",
    "let pm={};try{pm=JSON.parse(fs.readFileSync('scripts/r11-param-map.json','utf8')).params||{}}catch(e){}",
    "const ghosts=[];",
    "function cands(r){return [srcRoot+'/'+r+'.vue',srcRoot+'/'+r+'/index.vue',srcRoot+'/'+r+'.ts',distRoot+'/'+r+'.js',distRoot+'/'+r+'.wxml',distRoot+'/'+r+'/index.js',distRoot+'/'+r+'/index.wxml'].filter(function(p){return fs.existsSync(p)})}",
    "for(const r of Object.keys(pm)){",
    "const keys=String(pm[r]).replace(/^\\?/,'').split(/[&;]/).map(function(s){return s.split('=')[0]}).filter(Boolean);",
    "const cs=cands(r);",
    "if(!cs.length){ghosts.push(r+':无候选文件（路由或参数表路径写错）');continue}",
    "const txt=cs.map(function(p){return fs.readFileSync(p,'utf8')}).join('\\n');",
    "for(const k of keys){if(txt.indexOf(k)<0)ghosts.push(r+'?'+k+'=（该页源码与产物里 0 命中，属幽灵参数）')}",
    "}",
    "const CODES={BUILD_FLAG_ABSENT:1,PARAM_REQUIRED:1,HARNESS_CALL_DEFECT:1,PERMISSION_SUPPRESSED:1,DEVICE_CAPABILITY_UNREACHABLE:1,GENUINE_APP_DEFECT:1};",
    "const SIG=/零截图|无截图|截图缺失|未渲染|落在|而非目标页|弹走|弹跳|redirect|不覆盖/;",
    "let missing=0,wrongSev=0,badCode=0,scanned=0,openIssues=0;const ex=[];",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch(err){continue}",
    "const arr=Array.isArray(j)?j:(Array.isArray(j.issues)?j.issues:[]);",
    "for(const it of arr){if(!it||typeof it!=='object'||typeof it.id!=='string')continue;scanned++;",
    "const sev=String(it.severity||''),txt=(String(it.description||'')+String(it.evidence||'')).slice(0,600);",
    "if(sev==='P0'||sev==='P1')openIssues++;",
    "if(SIG.test(txt)){const c=String(it.triageCode||'');",
    "if(!c){missing++;if(ex.length<5)ex.push(it.id+' 缺 triageCode')}",
    "else if(!CODES[c]){badCode++;if(ex.length<5)ex.push(it.id+' triageCode 取值非法:'+c)}",
    "else if(c!=='GENUINE_APP_DEFECT'&&(sev==='P0'||sev==='P1')){wrongSev++;if(ex.length<5)ex.push(it.id+' '+c+' 仍占 '+sev)}}"
    "}}} }",
    "for(const d of dirs)walk(d);",
    "console.log('TRIAGE_PARAM_ROUTES='+Object.keys(pm).length+' GHOST_PARAMS='+ghosts.length+' FINDINGS_SCANNED='+scanned+' P0_P1_TOTAL='+openIssues+' NO_TRIAGE_CODE='+missing+' ILLEGAL_CODE='+badCode+' NON_GENUINE_KEEPING_P0P1='+wrongSev);",
    "ghosts.slice(0,6).forEach(function(g){console.log('TRIAGE_GHOST '+g)});",
    "ex.slice(0,6).forEach(function(l){console.log('TRIAGE_UNROUTAGED '+l)});",
    "const hardFail=ghosts.length>0||missing>0||badCode>0||wrongSev>0;",
    "console.log(hardFail?'TRIAGE_RESULT=FAIL（未分诊落点就立了页面级 P1，或参数表含幽灵参数）':'TRIAGE_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", TRIAGE_SCRIPT, recon.srcRoot, WORKFLOW.build.sharedOutDir, findingsDirs.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("TRIAGE_PARAM_ROUTES=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("TRIAGE_RESULT=") === 0) || (r.exitCode === 0 ? "TRIAGE_RESULT=PASS(未打印)" : "TRIAGE_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const samples = lines.filter(l => l.indexOf("TRIAGE_GHOST") === 0 || l.indexOf("TRIAGE_UNROUTAGED") === 0).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${samples.length ? " | " + samples.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 落点分诊校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(5) 调用点**（六路复核落盘之后、收割/修复之前 —— 放在 `auditRound` 里，与既有 `code` 聚合同一处）：

```ts
  // v3.2 补 D8：落点分诊先于立 P1（参数表幽灵键 + 未分诊的缺证据类 P0/P1）
  const triage = await bounceTriageGate(label, [`${dir}/code-findings`, `${dir}/findings`]);
  if (!triage.ok) {
    blockers.push(`${label}: G6 落点分诊 FAIL —— ${triage.detail}`);
    log(`落点分诊未过：${triage.detail}`);
  } else {
    log(`落点分诊通过：${triage.detail}`);
  }
```

**(6) 定义自身的反向指令必须就地覆盖（本条最要紧的一处）**

v32 的视觉审查提示词里现在**明写着**：`` : `（本批页面本轮没有静态截图——把「缺截图」本身作为 P1 MiniProgram 问题记录，引用失败原因：${JSON.stringify(tour.failures).slice(0, 800)}）`, `` —— 这正是那 4 条被分诊推翻的页面级 P1 的**定义级来源**（不是代理擅自立的，是定义让它立的）。它是一条**无条件、绑定具体触发条件（本轮无帧）的指令**，而 (3) 的规则只是泛化约束；两者并存时，代理照那条具体指令执行的可能性更高。所以要动就动这一行本身。

```ts
        : `（本批页面本轮没有静态截图——**先按落点分诊定归因再定级**：逐条读 tour.failures 里的原因串，命中 BUILD_FLAG_ABSENT / PARAM_REQUIRED / HARNESS_CALL_DEFECT / PERMISSION_SUPPRESSED / DEVICE_CAPABILITY_UNREACHABLE 者，记为 owner=instrument 的 P3 取证缺陷并写一句解法；只有排除完这五类后仍解释不通的，才允许立页面级 P1 MiniProgram 问题，且必须附 triageCode=GENUINE_APP_DEFECT 与实测反证。失败原因清单：${JSON.stringify(tour.failures).slice(0, 800)}）`,
```

> 与 (1)–(5) 不同：**它是替换元素，不是新增元素**（原元素位于 `shots.length > 0 ? … : …` 的三元 false 分支）。若主代理更愿意保留原行，那就把 (3) 的规则**同时**粘到 `visualChunk` 里 `RULES_AUDIT,` 之后（后置元素优先级更高）；二者取其一，但**不能只做 (3) 而留着这一行的无条件 P1 指令** —— 否则 D8 等于没堵。

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(4) 之前 | `// ===== 证据预算协议（减少截图与解析成本）=====` | 1（与 D4/D7 同批，顺序 D4 → D7 → D8 → 该行） |
| (2) 之后 | `  sources: string[];`（`interface Issue` 内唯一） | `grep -cF '  sources: string[];'` = 1（第 291 行） |
| (3) 之后 | `  "【编号】Issue id 格式：MP-轮次标签-页面路由大写-三位序号。",` | `grep -cF '【编号】Issue id 格式'` = 1 |
| (5) 之前 | `  if (!uiRes.tour \|\| !uiRes.exec) {` | `grep -cF '  if (!uiRes.tour'` = 1（位于 `auditRound` 内，`dir`/`label` 均已在作用域） |
| (6) 之后（替换/追加两处之一） | ``        : `（本批页面本轮没有静态截图——把「缺截图」本身作为 P1 MiniProgram 问题记录，引用失败原因：${JSON.stringify(tour.failures).slice(0, 800)}）`,` `` | `grep -cF '把「缺截图」本身作为 P1 MiniProgram 问题记录'` = 1 |
| （备选）| `      RULES_AUDIT,`（`visualChunk` 内那一处） | `grep -cF 'RULES_AUDIT'` = 2，需配合上一行的 `理想图参考：` 元素一起定位；故更推荐直接做 (6) 的替换 |

### 符号自证

```
$ grep -cF '  sources: string[];' …v32.dwf.ts                    → 1
$ grep -cF '【编号】Issue id 格式' …                              → 1
$ grep -cF '  if (!uiRes.tour' …                                 → 1
$ grep -cF 'recon.srcRoot' …                                     → 2   （(5)(4) 用它的现有用法：858 行提示词）
$ grep -cF 'WORKFLOW.build.sharedOutDir' …                       → 2   （real 构建隔离条款里已在用）
$ grep -cF 'blockers.push' …                                     → 17
$ grep -cF 'const dir = "reports/audit/round-"' …                → 1   （(5) 里 ${dir} 的来源）
$ grep -cF 'gateBypass' …                                        → 0   ← 刻意：gateBypassRoutes/gateBypassedShots 只作为**产物字段名**出现在提示词与 node 脚本字符串里，不作为 DSL 标识符
$ ls scripts/r11-param-map.json                                  → 4070 B，顶层键 main/sub/params/skipRealBuild
```
**本条的机检已在本仓真数据上跑通**（只读，无写入）：
```
$ node -e "<上面 TRIAGE_SCRIPT 的 params 段>"   # srcRoot=apps/client/src, distRoot=apps/client/dist/build/mp-weixin
  → routes=13 ghost=0 noCandidate=0                       （当前参数表已无幽灵键）
$ 同一算法单测 matching 页 → target: false / dev-preview: true
  → 若参数表仍留着历史的 ?target=10003，本检查会报 GHOST_PARAMS=1，正是当时那条 P1 的成因
```

### 可机检说明

三项都是退出码：`GHOST_PARAMS>0`（参数表给了页面根本不读的键）、`NO_TRIAGE_CODE>0`（缺证据类 P0/P1 没分诊）、`NON_GENUINE_KEEPING_P0P1>0`（分诊结论是测试台问题却还占 P0/P1）。第二、三项只扫 `severity/description/evidence/triageCode` 四个字段，都是 `Issue` 已有或本条新增的字段，不猜任何新结构。

### 残留风险 / 是否必须外部件

- **必须改产品配置（不是文本）**：4 条 `BUILD_FLAG_ABSENT` 要真解掉得动 `isShowcaseMode` / `membershipEnabled` 的构建开关或在巡检脚本里 `mockWxMethod('switchTab')` 包住 —— census 已写明「零成本解法：补 `scripts/r11-param-map.json` 两条参数」，那是配置/脚本改动，定义只能保证"不再把它误立成 P1"。
- `PERMISSION_SUPPRESSED` 与 `DEVICE_CAPABILITY_UNREACHABLE` 的根治不在定义里（见 D14、D13、D5）。
- 分诊码由代理填，机器只能检"填没填、合不合法、定级是否自洽"，检不出"填错了码"。填错码属可审计偏差，靠 `evidence` 里的实测依据复核。

## D10 — 单一真值源与终止落盘（含 ID 全局唯一）

### 堵住的是哪个实测数字

**终止前 100 秒内三份状态产物分叉为 922 / 940 / 941 例、FAILED 282 / 288 / 289**，`次要19` 在 checkpoint 里 `executedCaseIds` 只有 15 条而权威账本记 19 条；**checkpoint 的 `failures[]` 恒空**（`failed` 合计 282 却报不出一条失败明细）；**941 条记录里 `id` 只有 911 个唯一值 → 30 组跨 suite 复用**，按 ID 去重必然低估。
证据：census §4-D10、§1.1（`.zcode/tmp/exec-stop-snapshot.json`：`takenAt=2026-09-25T00:06:36+0800 / updatedAt=16:05:55.307Z / cases=940 / status={EXECUTED:523,SKIPPED:129,FAILED:288} / suites_recorded=21`）、`tmp/qa/checkpoints/exec-R2.json`（`updatedAt 16:05:00.445Z`，`suites` 为**对象表**，每 suite 含 `status/executedCaseIds/finishedAt/executed/failed/reconnects`，顶层 `failures: []`）、`reports/audit/round-2/interact/exec-results.json`（`updatedAt 16:06:40.116Z`）。三份时间戳两两相差 55s / 45s，**没有任何一份能仲裁另外两份**。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 状态单一真值源（v3.2 补 D10：一份权威账本 + 派生视图同批原子写 + 主键全局唯一）=====
const STATE_TRUTH_RULES = [
  `【唯一权威】本轮执行状态只有一个权威文件：\${dir}/interact/exec-results.json。检查点 tmp/qa/checkpoints/*.json 与终止快照都是它的**派生视图**，派生视图不得自行累加、不得晚于权威文件写、不得与它口径不同。实测教训：终止前 100 秒内三份各自报出 922 / 940 / 941 例与 FAILED 282 / 288 / 289，没有任何一份能仲裁另两份，全部统计从此都成了"某一份的口径"。`,
  `【同批原子写】每完成一个 Suite：先在内存里更新权威结构，再一次性写权威文件 + 派生视图（写临时文件后 rename），三者 updatedAt 必须逐字节相同。禁止"检查点每套一写、权威文件轮末一写"这种错拍写法 —— 上一轮正是错拍，导致检查点比权威少 19 例、少 7 条 FAILED。`,
  `【明细不得只报计数】凡 per-suite 记了 failed>0，权威文件与检查点的 failures[] 必须同时给出对应明细（caseId + reason）。实测：exec-R2.json 的 failures[] 在 failed 合计 282 的情况下恒为 []，等于把失败明细全丢了。`,
  `【主键全局唯一】用例主键固定为 suite + "/" + caseId（如 PAGES-HOME-INDEX/H01）。裸 caseId 只许在 suite 内唯一，跨 suite 复用即算缺陷：上一轮 941 条记录只有 911 个唯一 id（30 组复用），任何按 id 去重的统计都会低估。`,
  `【终止也要落盘】SIGINT / SIGTERM / uncaughtException 处理器里必须完成"权威文件 + 派生视图 + 释锁墓碑（同一处理器）"三件事后再退出；被强杀前留不下收尾的，必须在恢复时按已落盘的最后一条重算，禁止凭上一轮的总数继续报数。`,
].join("\n");
```

> 上面第一条里的 `\${dir}` 已刻意转义，粘贴后就是字面量 `${dir}`（提示词里不需要真插值，`dir` 是函数内局部变量、规则常量在文件前部求值不到它）。**这是本稿唯一的转义点，粘贴后请确认渲染出的是 `${dir}` 而不是 `reports/audit/round-N`。**

**(2) 提示词条目**（执行员提示词，紧随既有【Suite 划分】那句之后）：

```ts
      `【单一真值源（v3.2 必做）】权威文件 = ${dir}/interact/exec-results.json，每完成一个 Suite 用「写临时文件 + rename」同批更新它与 tmp/qa/checkpoints/exec-${label}.json，两份的 updatedAt 必须逐字节相同；per-suite failed>0 时 failures[] 必须同步给出 {suite,caseId,reason} 明细，禁止只报计数。主键写 suite + "/" + caseId（裸 caseId 只在本 suite 内唯一）。SIGINT/SIGTERM/uncaughtException 里必须完成这两份落盘再退。`,
```

**(3) `ExecResult` 补字段**（紧随 `  /** 失败/跳过用例与原因 */` 的 `failures: ExecFailure[];` 之后）：

```ts
  /** v3.2 补 D10：终止/中断时最后一条已落盘用例的时间戳（ISO），供恢复时重算总数用 */
  lastRecordedAt: string;
```

**(4) 新增顶层校验函数**：

```ts
// 三份状态产物对账（v3.2 补 D10）。只读，退出码 1 = 分叉/丢明细/主键复用/时标错拍。
// 实测依据：922/940/941 与 FAILED 282/288/289 在 100 秒内分叉、failures[] 恒空、941 条只有 911 个唯一 id。
async function stateTruthGate(label: string, resultsFile: string, checkpointFile: string): Promise<{ ok: boolean; detail: string }> {
  if (!resultsFile) return { ok: false, detail: `${label}: 未返回 resultsFile，无从确立真值源` };
  const TRUTH_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'',cf=process.argv[2]||'';",
    "let a={};try{a=JSON.parse(fs.readFileSync(rf,'utf8'))}catch(e){console.log('TRUTH_RESULT=FAIL reason=权威文件不可读 '+rf);process.exit(1)}",
    "const rows=a.results||[];",
    "const bySuite={};let failedRows=0;",
    "for(const r of rows){const s=String(r.suite||'(无suite)');bySuite[s]=bySuite[s]||{n:0,f:0};bySuite[s].n++;if(String(r.status)==='FAILED'){bySuite[s].f++;failedRows++}}",
    "const keys={};for(const r of rows){const k=String(r.suite||'?')+'/'+String(r.id||'?');keys[k]=(keys[k]||0)+1}",
    "const dk=Object.keys(keys).filter(function(k){return keys[k]>1});",
    "const bare={};for(const r of rows){bare[String(r.id||'?')]=(bare[String(r.id||'?')]||0)+1}",
    "const bareDup=Object.keys(bare).filter(function(k){return bare[k]>1}).length;",
    "let c={};try{c=JSON.parse(fs.readFileSync(cf,'utf8'))}catch(e){c=null}",
    "let sumExec=0,sumFail=0,badDetail=0,mismatched=0;",
    "const cs=c&&c.suites?(Array.isArray(c.suites)?c.suites:Object.keys(c.suites).map(function(k){const v=c.suites[k];v.suite=k;return v})):null;",
    "if(cs){for(const s of cs){sumExec+=Number(s.executed||0);sumFail+=Number(s.failed||0);const d=Array.isArray(s.executedCaseIds)?s.executedCaseIds.length:-1;if(d>=0&&Number(s.executed||0)!==d)mismatched++;if(Number(s.failed||0)>0&&(!Array.isArray(s.failures)||s.failures.length===0))badDetail++}",
    "if(Number(c.failed||0)>0&&(!Array.isArray(c.failures)||c.failures.length===0))badDetail++}",
    "const ckSum=sumExec;",
    "const diffA=cs?rows.length-ckSum:0;",
    "const skew=c&&c.updatedAt&&a.updatedAt?Math.abs(new Date(c.updatedAt).getTime()-new Date(a.updatedAt).getTime()):-1;",
    "const topFailKept=Array.isArray(c&&c.failures)?c.failures.length:-1;",
    "console.log('TRUTH_ROWS='+rows.length+' FAILED_ROWS='+failedRows+' SUITES='+Object.keys(bySuite).length+' DUP_COMPOSITE_KEYS='+dk.length+' DUP_BARE_IDS='+bareDup+' CK_SUM_EXECUTED='+(cs?ckSum:'(无)')+' CK_SUM_FAILED='+(cs?sumFail:'(无)')+' CK_DETAIL_MISMATCH='+(cs?mismatched:'(无)')+' MISSING_FAILURE_LIST='+(cs?badDetail:'(无)')+' CK_FAILURES_LEN='+topFailKept+' UPDATE_SKEW_MS='+(skew<0?'(无 updatedAt)':skew));",
    "if(dk.length)console.log('TRUTH_DUP_KEY '+dk.slice(0,5).join(','));",
    "const hardFail=!!(dk.length||bareDup||mismatched||badDetail||(topFailKept===0&&failedRows>0)||skew>20000||diffA!==0);",
    "console.log(hardFail?'TRUTH_RESULT=FAIL（三份状态分叉 / 主键复用 / 失败明细丢失 / 时标错拍 >20s）':'TRUTH_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", TRUTH_SCRIPT, resultsFile, checkpointFile]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("TRUTH_ROWS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("TRUTH_RESULT=") === 0) || (r.exitCode === 0 ? "TRUTH_RESULT=PASS(未打印)" : "TRUTH_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 真值源对账无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(5) 调用点**（`uiEvidence` 返回之前）：

```ts
  // v3.2 补 D10：三份状态产物必须互相对得上，否则本轮统计不可用
  const truth = await stateTruthGate(label, exec.resultsFile, (exec.checkpoints ?? [])[0] ?? `tmp/qa/checkpoints/exec-${label}.json`);
  if (!truth.ok) {
    blockers.push(`${label}: 状态真值源未收敛 —— ${truth.detail}`);
    log(`真值源对账未过：${truth.detail}`);
  } else {
    log(`真值源对账通过：${truth.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(4) 之前 | `// ===== 三级重置协议（A1 恢复手段；避免频繁 reLaunch）=====` | `grep -cF` = 1 |
| (2) 之后 | ``      `【Suite 划分】按页面域分 Suite（每 Suite ≤6 页）：每 Suite 独立连接执行；Suite 开始前读检查点 tmp/qa/checkpoints/exec-${label}.json，已完成 Suite 跳过；每 Suite 结束写检查点（suite/status/executedCaseIds）。`,`` | `grep -cF 'Suite 开始前读检查点 tmp/qa/checkpoints/exec-'` = 1 |
| (3) 之后 | `  /** 失败/跳过用例与原因 */`（其后即 `failures: ExecFailure[];`） | `grep -cF '  /** 失败/跳过用例与原因 */'` = 1 |
| (5) 之前 | `  return { tour, exec, opsFiles };` | `grep -cF` = 1（D3 一节已确认它的唯一性；(5) 放在它前面） |

### 符号自证

```
$ grep -cF '// ===== 三级重置协议（A1 恢复手段；避免频繁 reLaunch）=====' …   → 1
$ grep -cF 'Suite 开始前读检查点 tmp/qa/checkpoints/exec-' …                  → 1   （(5) 里的缺省路径与它同式：exec-${label}.json）
$ grep -cF '  /** 失败/跳过用例与原因 */' …                                    → 1
$ grep -cF 'failures: ExecFailure[];' …                                       → 1
$ grep -cF 'checkpoints: string[];' …                                         → 1   （(5) 用 exec.checkpoints）
$ grep -cF 'resultsFile: string;' …                                           → 1   （(5) 用 exec.resultsFile）
$ grep -cF 'const dir = "reports/audit/round-"' …                             → 1   （(2) 里 ${dir} 的实际来源是 uiEvidence 形参 dir）
$ grep -cF 'world.run' …                                                      → 8
$ grep -cF 'blockers.push' …                                                  → 17
$ node -e "…exec-R2.json" → suites 是对象表（键=suite 名），每项 {status,executedCaseIds,finishedAt,executed,failed,reconnects}；顶层 failures=[] ；updatedAt 存在
$ node -e "…exec-stop-snapshot.json" → 键：takenAt/reason/gitSha/cases/status{EXECUTED,SKIPPED,FAILED}/suites_recorded/suites/updatedAt
```
（node 脚本里对 `c.suites` 同时兼容「对象表」与「数组」两种形态，就是照上面实测的形态写的，不猜结构。）

### 可机检说明

**本稿已在 R2 真数据上跑通这段 node 脚本**（只读）：
```
$ node -e "<TRUTH_SCRIPT>" reports/audit/round-2/interact/exec-results.json tmp/qa/checkpoints/exec-R2.json
TRUTH_ROWS=941 FAILED_ROWS=289 SUITES=21 DUP_COMPOSITE_KEYS=0 DUP_BARE_IDS=30 CK_SUM_EXECUTED=922
CK_SUM_FAILED=282 CK_DETAIL_MISMATCH=1 MISSING_FAILURE_LIST=19 CK_FAILURES_LEN=0 UPDATE_SKEW_MS=99671
TRUTH_RESULT=FAIL（三份状态分叉 / 主键复用 / 失败明细丢失 / 时标错拍 >20s）      EXIT=1
```
这行输出把 census §4-D10 的每个数都独立复算了一遍：941/289（权威）、922/282（检查点）、错拍 99.7 秒、裸 id 复用 30 组、`failures[]` 长度 0、19 个 suite 记了 failed 却没明细。`DUP_COMPOSITE_KEYS=0` 同时证明**改成 `suite/caseId` 复合主键即可零成本消除 30 组复用**（现状数据在复合键下已经不重复，只是裸 id 会被下游拿去去重）。
五条断言全为退出码：① 权威行数 − Σ(per-suite executed) != 0；② 复合主键重复 > 0；③ 裸 `caseId` 跨 suite 复用 > 0；④ `failed>0` 而明细空；⑤ `updatedAt` 差 > 20000ms。
（注意：**终止快照 `.zcode/tmp/exec-stop-snapshot.json` 是宿主/代理另行落的第三份**，字段实测为 `cases / status{EXECUTED,SKIPPED,FAILED} / suites_recorded / suites[] / updatedAt / takenAt / reason / gitSha`。DSL 管不到它的产生时机，本条把「权威 + 检查点」两份锁死，快照由 (1) 的规则文本承担。）

### 残留风险 / 是否必须外部件

- **需要新脚本**：`scripts/qa/verify-state-truth.mjs`（本稿不创建）。它要比 DSL 内联函数多做两件事：读 `.zcode/tmp/exec-stop-snapshot.json` 与 `reports/audit/round-*/ops/*.json` 计划数，输出「计划 / 权威 / 检查点 / 快照」四列并排 + 每列的 FAILED 数；终止后人工接管时（本轮就是这种情形）只有这个四列表能说明"到底跑到哪"。DSL 内联版只在轮内生效。
- 权威文件本身由执行员写，DSL 无从强制它先写哪份；本条靠"同批 rename + updatedAt 逐字节相同 + 错拍即 FAIL"三条把违约变成红牌。

## D12 — 身份可行性前置声明 + 凭证有效期门禁

### 堵住的是哪个实测数字

**A/B 双身份固定表（A=100158 / B=100159）在 mock 构建下不可满足**：注入后轮询恒得 `user-1001` 并自报 `MISMATCH!`，**实测 `exec-results.json` 941 条里有 366 条（38.9%）的 `observed` 带着 `pre:login … MISMATCH`，仍照常往下跑**（census 引的"75 条"是 14:xx 的中途时点值，本稿按权威文件全量重算为 366）；**B 身份取证整体作废**（`reports/screenshots/round-1-after/` A=114 帧 / **B=2 帧**）；**JWT 已过期仍照跑**（`tmp_r11_login.json`/`tmp_r11_guest.json` 的 `exp=1790088124` = 2026-09-22T14:42:04Z，早于套件执行时刻 toast `ts=1790141167` ≈ 2026-09-23T05:19Z）。
证据：census §4-D12；`mode-dependent-issues.json` → `MP-R1-IDENT-01`、`MP-R1-C24-002`、`MP-R1-C26-003`、`MP-R1J-VILLAGE-INDEX-002`。
**本稿自己复核过的代码事实**：`apps/client/src/stores/session.ts` 第 30-35 行注释原文「修复（R4-00134）：mock 当前用户 ID 与全项目 mock 家族统一为 "user-1001" …不再与 "1" 并存导致 mock 身份语义分裂」，其下 `const mockUserSession: UserSession = { userId: "user-1001", … }` —— mock 下**结构上不存在**第二个身份，所以"双身份各一份"的覆盖要求在 mock 轮是不可满足前置。
**本稿实测**：`node -e` 解 `tmp_r11_login.json` 的 JWT → `exp 1790088124 → 2026-09-22T14:42:04.000Z`（已过期）。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 身份可行性与凭证时效（v3.2 补 D12：前置不可满足的东西不许当覆盖要求）=====
const IDENTITY_RULES = [
  `【身份可行性矩阵必须先声明再开跑】每轮 manifest 必须含 identityMatrix: [{identity, feasible, reason}]。判定规则写死：mock 产物（config/env.js 的 MODE=mp-weixin-mock）下第二身份恒不可满足 —— apps/client/src/stores/session.ts 的 mockUserSession.userId 硬编码 "user-1001"（R4-00134 全 mock 家族统一），固定表 A=100158/B=100159 在 mock 下拿不到任何一个。因此 mock 轮凡是 pre/expected 依赖"两个不同身份对照"的用例，一律记 UNVERIFIED-IDENTITY（不进通过率分母），禁止用"注入后还是同一个号"这种自报去凑覆盖。`,
  `【注入不一致即停该身份】执行员每次身份注入后必须回读实际 userId 并与要求比对；不一致时该身份本轮已产出的全部帧与用例改判 UNVERIFIED-IDENTITY 并停止继续为它取证。实测教训：R2 有 366 条（占 38.9%）observed 里写着 pre:login …MISMATCH 却照常往下跑，A=114 帧 / B=2 帧这种悬殊分布在任何报告里都看不出来。`,
  `【凭证过期就是不过期】任何写死在文件里的 JWT（tmp_r11_login.json / tmp_r11_guest.json 这类固化凭证）开跑前必须解出 exp 与当前时间比对，余量不足即禁止使用：要么重新签发，要么把相关用例记 BLOCKED-CREDENTIAL。实测教训：固化凭证 exp=1790088124（2026-09-22T14:42Z）比套件执行时刻（toast ts=1790141167 ≈ 09-23T05:19Z）早了一天多，整轮仍然照跑，于是"登录链路失败"被当成了产品缺陷立案。`,
  `【双身份只在 real 轮要求】A/B 双身份覆盖属于真实模式（G7/G8/G9）的前置：real 轮用 ${WORKFLOW.realEnv.apiBaseUrl}/auth/guest-login 现签，签一次算一次时效；mock 轮的单身份覆盖要求维持现状，不得因为"只有一组身份帧"而判页面缺陷。`,
].join("\n");
```

**(2) 新增顶层常量 + 两个校验函数**：

```ts
// 固化凭证文件（只读探测；本稿实测其存在：tmp_r11_login.json / tmp_r11_guest.json）
const HARDCODED_CRED_FILES = ["tmp_r11_login.json", "tmp_r11_guest.json"];

// 凭证时效门禁（v3.2 补 D12）：解 JWT 的 exp，过期或余量不足即非 0 退出。
async function credentialFreshGate(minAheadSeconds: number): Promise<{ ok: boolean; detail: string }> {
  const CRED_SCRIPT = [
    "const fs=require('fs');",
    "const minAhead=Number(process.argv[1]||0);",
    "const files=(process.argv[2]||'').split('|').filter(Boolean);",
    "function b64u(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Buffer.from(s,'base64').toString('utf8')}",
    "const now=Math.floor(Date.now()/1000);const bad=[];const rep=[];",
    "for(const f of files){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){rep.push(f+':(不可读，按未使用处理)');continue}",
    "let tok='';(function find(o){if(tok)return;if(typeof o==='string'){const m=o.match(/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/);if(m)tok=o;return}if(o&&typeof o==='object'){for(const k of Object.keys(o))find(o[k])}})(j);",
    "if(!tok){rep.push(f+':(内无 JWT)');continue}",
    "let p={};try{p=JSON.parse(b64u(tok.split('.')[1]))}catch(e){rep.push(f+':(payload 解不开)');bad.push(f+' payload 不可解');continue}",
    "const exp=Number(p.exp||0);const ahead=exp-now;",
    "rep.push(f+' exp='+(exp?new Date(exp*1000).toISOString():'(无)')+' ahead='+ahead+'s');",
    "if(!exp)bad.push(f+' 无 exp 字段');",
    "else if(ahead<=0)bad.push(f+' 已过期 '+(-ahead)+'s');",
    "else if(ahead<minAhead)bad.push(f+' 余量 '+ahead+'s < 要求 '+minAhead+'s');",
    "}",
    "console.log('CRED_FILES='+files.length+' '+rep.join(' | '));",
    "if(bad.length){for(const b of bad)console.log('CRED_BAD '+b);console.log('CRED_RESULT=FAIL（固化凭证过期/余量不足：禁用或重签，相关用例记 BLOCKED-CREDENTIAL）');process.exit(1)}",
    "console.log('CRED_RESULT=PASS');",
  ].join("");
  try {
    const r = await world.run("node", ["-e", CRED_SCRIPT, String(Math.max(3600, minAheadSeconds)), HARDCODED_CRED_FILES.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("CRED_FILES=") === 0) || "（无输出）";
    const bad = lines.filter(l => l.indexOf("CRED_BAD") === 0).slice(0, 3);
    return { ok: r.exitCode === 0, detail: `${stat}${bad.length ? " | " + bad.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `凭证时效探测无法启动 ${String(e).slice(0, 160)}` };
  }
}

// 身份取证可行性对账（v3.2 补 D12）：MISMATCH 自报数 + A/B 两侧帧数悬殊。
async function identityFeasibilityGate(label: string, resultsFile: string, manifestFile: string): Promise<{ ok: boolean; detail: string }> {
  const ID_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'',mf=process.argv[2]||'';",
    "let mismatch=0,rowsN=0;",
    "try{const j=JSON.parse(fs.readFileSync(rf,'utf8'));const rs=j.results||[];rowsN=rs.length;",
    "for(const r of rs){const t=String(r.observed||'')+String(r.failureReason||'');if(/MISMATCH/i.test(t))mismatch++}}catch(e){}",
    "let A=-1,B=-1,noMatrix=false;",
    "try{const m=JSON.parse(fs.readFileSync(mf,'utf8'));const s=m.shots||[];",
    "A=s.filter(x=>/\\/A\\/|\\\\A\\\\|__A_/.test(String(x.path||''))).length;",
    "B=s.filter(x=>/\\/B\\/|\\\\B\\\\|__B_/.test(String(x.path||''))).length;",
    "noMatrix=!Array.isArray(m.identityMatrix)||m.identityMatrix.length===0}catch(e){}",
    "const skewed=(A>=0&&B>=0)&&(Math.min(A,B)+5)<Math.max(A,B)*0.25;",
    "console.log('IDENT_ROWS='+rowsN+' MISMATCH_REPORTED='+mismatch+' FRAMES_A='+(A<0?'(无 manifest)':A)+' FRAMES_B='+(B<0?'(无 manifest)':B)+' IDENTITY_MATRIX_DECLARED='+(noMatrix?'false':'true'));",
    "const hardFail=!!(mismatch>0||skewed||noMatrix);",
    "console.log(hardFail?'IDENT_RESULT=FAIL（身份注入不一致仍继续取证 / 双身份帧数悬殊 / 未声明身份可行性矩阵）':'IDENT_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", ID_SCRIPT, resultsFile, manifestFile]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("IDENT_ROWS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("IDENT_RESULT=") === 0) || (r.exitCode === 0 ? "IDENT_RESULT=PASS(未打印)" : "IDENT_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 身份对账无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(3) 提示词条目**（巡检 manifest 要求，紧随既有【证据清单（必须）】之后）：

```ts
      `【身份可行性（v3.2 必填）】manifest 追加 identityMatrix: [{identity, feasible, reason}]：mock 产物下第二身份（B）feasible 必须填 false 并给 reason（stores/session.ts 的 mockUserSession.userId 硬编码 "user-1001"，R4-00134），此时禁止再用"只有 A 侧帧"当覆盖缺口；real 轮必须写清每个身份的来源（guest-login 现签 / 固化文件）与签出时间。`,
```

**(4) 提示词条目**（执行员，紧随既有【执行】那句之后）：

```ts
      `【身份注入自证（v3.2）】每次注入后回读实际 userId 并与要求比对，把 "要求 X / 实得 Y / 一致|不一致" 写进该用例 observed；一旦不一致，本 Suite 内该身份的后续用例直接记 UNVERIFIED-IDENTITY 并停止取证，禁止带着 MISMATCH 继续跑（上一轮 366 条 MISMATCH 就是这样被无声消耗的）。固化凭证开跑前必须验 exp，过期就记 BLOCKED-CREDENTIAL 而不是 FAILED。`,
```

**(5) 调用点 A（开跑前，第 1 轮之前）**：

```ts
// v3.2 补 D12：固化凭证时效 —— 过期凭证跑出来的"失败"不是产品缺陷
const cred = await credentialFreshGate(6 * 3600);
if (!cred.ok) {
  blockers.push(`凭证时效不满足开跑条件 —— ${cred.detail}；依赖登录态的用例本轮记 BLOCKED-CREDENTIAL，不得记 FAILED`);
  log(`凭证时效未过：${cred.detail}`);
} else {
  log(`凭证时效通过：${cred.detail}`);
}
```

**(6) 调用点 B（每轮取证后）**：

```ts
  // v3.2 补 D12：身份可行性对账（MISMATCH 自报 + A/B 帧数悬殊 + 未声明矩阵）
  const ident = await identityFeasibilityGate(label, exec.resultsFile, tour.manifestFile);
  if (!ident.ok) {
    blockers.push(`${label}: 身份取证不可背书 —— ${ident.detail}`);
    interactUnverifiable.push(`${label}: 双身份对照类用例本轮全部改判 UNVERIFIED-IDENTITY（见身份对账 detail）`);
    log(`身份对账未过：${ident.detail}`);
  } else {
    log(`身份对账通过：${ident.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(2) 之前 | `// ===== UI Lock 状态机协议（v3.2：AVAILABLE/LEASED/STALE + RELEASED 墓碑；不旋轮重试）=====` | 1（与 D5 同批，顺序 D5 → D12 → 该行） |
| (3) 之后 | `      \`【证据清单（必须）】完成后写 ${dir}/screenshot-manifest.json：…\`,` | `grep -cF '【证据清单（必须）】完成后写'` = 1（与 D1(3) 相邻，先 D1 后 D12 以免互相遮蔽） |
| (4) 之后 | 含 `status=EXECUTED\|FAILED\|SKIPPED）。` 的执行提示词元素行 | 1（与 D5(3) 相邻，先 D5 后 D12） |
| (5) 之前 | `phase("第 1 轮：全量基线审查");` | `grep -cF` = 1 |
| (6) 之前 | `  return { tour, exec, opsFiles };` | 1（D10(5) 也落在这行之前；顺序：D10 块 → D12 块 → 该行） |

### 符号自证

```
$ grep -cF '// ===== UI Lock 状态机协议' …                          → 1
$ grep -cF 'phase("第 1 轮：全量基线审查");' …                       → 1
$ grep -cF 'const r1 = await auditRound(1, "R1", "full", []);' …    → 1   （现状文件里已只剩一处；另一处重复声明已在本稿撰写期间被主代理修掉）
$ grep -cF 'interactUnverifiable' …                                 → 5
$ grep -cF 'WORKFLOW.realEnv.apiBaseUrl' …                          → 3   （(1) 第 4 条引用它，声明在文件最前，作用域安全）
$ grep -cF 'exec.resultsFile' … / 'tour.manifestFile' …             → 均 ≥1（(6) 的两个入参在 uiEvidence 作用域内都取到）
$ grep -cF 'blockers.push' …                                        → 17
$ ls tmp_r11_login.json tmp_r11_guest.json                          → 两个文件都在
$ node -e "…解 tmp_r11_login.json 的 JWT…" → exp 1790088124 → 2026-09-22T14:42:04.000Z（已过期，正是 census 记的那个数）
$ sed -n '30,35p' apps/client/src/stores/session.ts → "…mock 当前用户 ID 与全项目 mock 家族统一为 \"user-1001\"（R4-00134…）"
$ grep -cF 'MISMATCH' .zcode/workflows/miniprogram-qa-loop-v32.dwf.ts → 0 （"MISMATCH" 只是产物里的字符串，不是 DSL 标识符，只出现在 node 脚本与提示词文本里）
```

### 可机检说明

**本稿已把两个 node 脚本在真数据上跑通**（只读）：
```
$ node -e "<CRED_SCRIPT>" 21600 "tmp_r11_login.json|tmp_r11_guest.json"
CRED_FILES=2 tmp_r11_login.json exp=2026-09-22T14:42:04.000Z ahead=-182200s | tmp_r11_guest.json exp=… ahead=-182200s
CRED_BAD tmp_r11_login.json 已过期 182200s
CRED_BAD tmp_r11_guest.json 已过期 182200s
CRED_RESULT=FAIL                                    EXIT=1
$ node -e "<ID_SCRIPT>" reports/audit/round-2/interact/exec-results.json reports/audit/round-2/screenshot-manifest.json
IDENT_ROWS=941 MISMATCH_REPORTED=366 FRAMES_A=134 FRAMES_B=120 IDENTITY_MATRIX_DECLARED=false
IDENT_RESULT=FAIL                                   EXIT=1
```
三项独立退出码：
1. `CRED_RESULT=FAIL` —— 固化 JWT 缺 `exp` / 已过期 / 余量 < 阈值（调用点传 6 小时，函数内部再兜底 `Math.max(3600, …)`）。对现仓数据即 FAIL：两份固化凭证都已过期约 2.1 天 —— 这正是"凭证过期仍照跑"的红牌。
2. `MISMATCH_REPORTED` 必须为 0（实测 R2 = 366）。注意函数只读 `observed`+`failureReason` 两个字段，且 census 里的 75 是中途时点值，本稿按权威文件全量重算为 366。
3. `IDENTITY_MATRIX_DECLARED=false` 即 FAIL（现盘上两份 manifest 都还没这个字段）；`FRAMES_A/FRAMES_B` 悬殊判据用 `min+5 < max×25%`，R2 现值 134/120 不悬殊（R2 已按双身份各拍一轮），R1 的 114/2 会被抓住 —— 阈值故意留了 5 张容差，避免"某一页只有 A 侧补拍"这种正常情形误报。
**注意 (2)(3) 是"取证不可背书"而不是"产品失败"**，函数只往 `blockers` / `interactUnverifiable` 写，不生成 Issue —— 与 D8 的方向一致。

### 残留风险 / 是否必须外部件

- **要真解 A/B 双身份覆盖，必须走 real 模式或改 mock fixture**：`services/mocks/fixtures.ts` 的 `MOCK_CURRENT_USER_ID` 是硬编码（census 引 `fixtures.ts:1383-1396`、`680-694`），mock 下拿不出第二个号，这是**产品/构建侧事实**，定义文本只能做到"不再把它当未覆盖缺陷"。
- 重新签发凭证要真打后端 `/auth/guest-login`（且 real profile 下需 `APP_GUEST_LOGIN_ENABLED=true`），属环境动作，不是定义能完成的。

## D13 — 取证能力上限前置声明 + 字级判定置信封顶

### 堵住的是哪个实测数字

**全轮 254 帧恒 378×814（1x），设备 pixelRatio 实为 3**；截图 API 不支持 dpr（`miniprogram-automator/out/MiniProgram.d.ts:6-8` 的 `IScreenshotOptions{path?}` + `MiniProgram.js screenshot(){send("App.captureScreenshot")}` 无参）；字级判定只能靠 **345 张最近邻放大裁切帧**，且这些帧每条自报 `upscaleAddsDetail:false`（放大不产生新细节）。后果实测：Wave-2 视觉席 80 条里 `conf<0.6` 有 42 条（52.5%）、**`conf≥0.9` 为 0 条**，而该批自己的 `confidenceRule` 规定「仅遮罩污染帧/0.5x/1x 不可判读的像素推断 → ≤0.35；纯代码/文件存在性推断 → ≤0.4」。
证据：census §4-D13、§3.10 末段「Wave-2 证据质量自证」；`reports/audit/round-2/screenshot-manifest.json#captureLimitations / #frameSizes.distribution / #zoomFrameCount`。
**census 自己标注该条「无法修复（API 限制）」** —— 所以本条的目标不是修能力，而是**让定义知道能力边界，并把越界结论封顶**。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 取证能力上限与置信封顶（v3.2 补 D13：1x 帧判不了字级，就得在结构上不许判）=====
const CAPTURE_CAPABILITY_RULES = [
  `【能力上限必须前置声明】巡检 manifest 必须含 captureLimitations: {screenshotDprSupported, apiEvidence, zoomCropSupported, zoomFactor, zoomOn, deviceInfo:{model,pixelRatio,windowWidth,windowHeight}} 与 frameSizes.distribution（"宽x高"→张数）。声明缺项、或声明与盘上实测分布不符，一律按"取证能力未知"处理：本轮不得产出任何依赖像素细节的结论。实测：截图 API 无 dpr 参数，全轮 254 帧恒 378×814，而设备 pixelRatio=3，也就是**证据天生只有 1/3 分辨率**。`,
  `【字级判定的取证门槛】凡结论依赖字号/行高/1–2px 间距/字形叠印/抗锯齿/文本截断位置，evidence 里必须给出对应的放大裁切帧路径（zoomFrames 之一）与裁切区域坐标；只给 1x 原生帧的，判"不可判读"。`,
  `【置信封顶是硬数值，不是措辞】1x 原生帧的像素推断 confidence ≤ 0.35；纯代码/文件存在性推断 ≤ 0.4；有放大帧且放大帧自报 upscaleAddsDetail=true 才可到 0.7 以上。放大最近邻帧 upscaleAddsDetail=false —— 它只是让肉眼看得清，**不增加信息量**，不得据此抬高置信。上一轮 80 条视觉发现里 conf≥0.9 为 0 条、42 条 <0.6，这套封顶当时只写在提示词里、没有任何结构拦阻，于是"P1 但不可判读"的条目照样进了修复队列。`,
  `【能力缺口要进 notCovered 而不是缺陷池】dpr 不可控、软键盘不渲染、swipe 无元素 API 这三类是取证手段的边界：写进终报 notCovered（本轮已实现的披露口），禁止转写成页面缺陷。`,
].join("\n");
```

**(2) 新增顶层校验函数**（能力声明 + 声明与盘一致 + 置信封顶三项）：

```ts
// 取证能力与置信封顶门禁（v3.2 补 D13）。只读 manifest 与本轮 findings，退出码 1 = 越界结论。
// 实测依据：254 帧全为 378x814（1x）而 pixelRatio=3；345 张放大帧全部 upscaleAddsDetail=false。
async function captureCapabilityGate(label: string, manifestFile: string, findingsDirs: string[]): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 无 manifest，取证能力无从核对` };
  const CAP_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const mf=process.argv[1]||'',dirs=(process.argv[2]||'').split('|').filter(Boolean);",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('CAP_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const cl=m.captureLimitations||{};",
    "const missing=[];",
    "if(typeof cl.screenshotDprSupported!=='boolean')missing.push('screenshotDprSupported');",
    "if(!cl.apiEvidence)missing.push('apiEvidence');",
    "if(!cl.deviceInfo||!cl.deviceInfo.pixelRatio)missing.push('deviceInfo.pixelRatio');",
    "if(!m.frameSizes&&!cl.frameSizes)missing.push('frameSizes');",
    "const declared=((m.frameSizes&&m.frameSizes.distribution)||(cl.frameSizes&&cl.frameSizes.distribution)||{});",
    "function sizeOf(p){try{const fd=fs.openSync(p,'r');const b=Buffer.alloc(24);fs.readSync(fd,b,0,24,0);fs.closeSync(fd);if(!(b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47))return '';return b.readUInt32BE(16)+'x'+b.readUInt32BE(20)}catch(e){return ''}}",
    "const measured={};let unreadable=0;",
    "for(const s of (m.shots||[])){const k=sizeOf(String(s.path||''));if(!k){unreadable++;continue}measured[k]=(measured[k]||0)+1}",
    "const dk=Object.keys(declared).sort().join(','),mk=Object.keys(measured).sort().join(',');",
    "let declaredTotal=0;for(const k of Object.keys(declared))declaredTotal+=Number(declared[k]||0);",
    "const zoomList=m.zoomFrames||[];",
    "const zoomNoFlag=zoomList.filter(function(z){return !z||typeof z.upscaleAddsDetail!=='boolean'}).length;",
    "const zoomClaim=zoomList.filter(function(z){return z&&z.upscaleAddsDetail===true}).length;",
    "const WORDSZ=/字号|字体大小|行高|字高|1px|2px|3px|4px|6px|像素|间距|叠印|抗锯齿|截断|省略号|字形/;",
    "let over=0,scanned=0;const ex=[];",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch(err){continue}",
    "const arr=Array.isArray(j)?j:(Array.isArray(j.issues)?j.issues:[]);",
    "for(const it of arr){if(!it||typeof it!=='object'||typeof it.id!=='string')continue;scanned++;",
    "const txt=(String(it.description||'')+String(it.evidence||'')+String(it.ideal||'')).slice(0,800);",
    "const conf=typeof it.confidence==='number'?it.confidence:0.5;",
    "const hasZoom=/zoom|_3x|_4x|3x\\.|4x\\.|放大|裁切/i.test(String(it.evidence||'')+String(it.screenshot||''));",
    "if(WORDSZ.test(txt)&&!hasZoom&&conf>0.35){over++;if(ex.length<5)ex.push(it.id+' conf='+conf)}",
    "}}} }",
    "for(const d of dirs)walk(d);",
    "console.log('CAP_SHOTS='+(m.shots||[]).length+' DECLARED_TOTAL='+declaredTotal+' MEASURED=['+mk+'] UNREADABLE='+unreadable+' DECLARED_KEYS=['+dk+'] ZOOM='+zoomList.length+' ZOOM_CLAIM_ADDS_DETAIL='+zoomClaim+' ZOOM_NO_FLAG='+zoomNoFlag+' FINDINGS_SCANNED='+scanned+' OVER_CEILING_NO_ZOOM='+over+' LIMIT_MISSING='+(missing.length?missing.join(','):'0'));",
    "if(ex.length)console.log('CAP_OVER '+ex.join(' ; '));",
    "const hardFail=!!(missing.length||unreadable||Object.keys(measured).length!==Object.keys(declared).length||(dk&&dk!==mk)||zoomNoFlag||zoomClaim||over);",
    "console.log(hardFail?'CAP_RESULT=FAIL（能力未声明 / 声明与盘不符 / 放大帧谎称增细节 / 无放大帧却下字级高置信结论）':'CAP_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", CAP_SCRIPT, manifestFile, findingsDirs.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("CAP_SHOTS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("CAP_RESULT=") === 0) || (r.exitCode === 0 ? "CAP_RESULT=PASS(未打印)" : "CAP_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const samples = lines.filter(l => l.indexOf("CAP_OVER") === 0).slice(0, 2);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${samples.length ? " | " + samples.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 能力门禁启动失败 ${String(e).slice(0, 160)}` };
  }
}
```

**(3) 提示词条目**（视觉审查席，紧随 `RULES_AUDIT,` 所在的元素数组末项之前，即与既有产出要求同批）：

```ts
      `【置信封顶（v3.2 硬数值）】凡依赖字号/1–2px 间距/字形叠印/文本截断位置的结论：evidence 必须给出放大裁切帧路径 + 裁切区域坐标；只有 1x 原生帧时 confidence 上限 0.35、severity 上限 P3；纯代码或文件存在性推断上限 0.4。放大帧若 upscaleAddsDetail=false 不得当作新增了细节。取证能力边界（无 dpr、软键盘不渲染、swipe 无 API）写进 coverage 说明，不得转写成页面缺陷。`,
```

**(4) 调用点**（`auditRound` 内，紧跟既有 `const exec = uiRes.exec;` 之后）：

```ts
  // v3.2 补 D13：取证能力声明与字级判定置信封顶
  const cap = await captureCapabilityGate(label, tour.manifestFile, [`${dir}/findings`, `${dir}/code-findings`]);
  if (!cap.ok) {
    blockers.push(`${label}: 取证能力/置信封顶 FAIL —— ${cap.detail}`);
    log(`能力门禁未过：${cap.detail}`);
  } else {
    log(`能力门禁通过：${cap.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(2) 之前 | `// ===== 证据预算协议（减少截图与解析成本）=====` | 1（D4/D7/D8/D13 同批，顺序：D4 → D7 → D8 → D13 → D14 → 该行） |
| (3) 之后 | `      \`【产出】issues 与 observations（逐页至少一条观察证据：page/observation/evidence 截图路径）写入 ${dir}/findings/${chunkKey}.json 并结构化返回…\`` | `grep -cF '【产出】issues 与 observations（逐页至少一条观察证据'` = 1（位于 `visualChunk` 内） |
| (4) 之前 | `  const exec = uiRes.exec;` | `grep -cF 'const exec = uiRes.exec;'` = 1（其后 `dir`/`label`/`tour` 均已就位） |

### 符号自证

```
$ grep -cF '// ===== 证据预算协议（减少截图与解析成本）=====' …       → 1
$ grep -cF '【产出】issues 与 observations（逐页至少一条观察证据' …    → 1
$ grep -cF 'const exec = uiRes.exec;' …                              → 1
$ grep -cF 'async function visualChunk' …                            → 1   （(3) 所在函数作用域：dir/label/chunkKey 均在）
$ grep -cF 'blockers.push' …                                         → 17
$ grep -cF 'world.run' …                                             → 8
```

### 可机检说明

**整段函数已在现盘数据上端到端跑通**（只读）：
```
$ node -e "<CAP_SCRIPT>" reports/audit/round-2/screenshot-manifest.json "reports/audit/round-2/findings|reports/audit/round-2/code-findings"
CAP_SHOTS=254 DECLARED_TOTAL=254 MEASURED=[378x814] UNREADABLE=0 DECLARED_KEYS=[378x814]
ZOOM=345 ZOOM_CLAIM_ADDS_DETAIL=0 ZOOM_NO_FLAG=0 FINDINGS_SCANNED=473 OVER_CEILING_NO_ZOOM=43 LIMIT_MISSING=0
CAP_OVER MP-R2VIS-PAGES-LOGIN-INDEX-002 conf=0.7 ; MP-R2VIS-PAGES-LOGIN-INDEX-009 conf=0.5 ;
         MP-R2VIS-PAGES-MESSAGES-INDEX-003 conf=0.4 ; MP-R2VIS-PAGES-HOME-INDEX-004 conf=0.6 ; …
CAP_RESULT=FAIL        EXIT=1
```
解读：能力声明与盘上实测**目前自洽**（254 帧全 378×814、345 张放大帧全部 `upscaleAddsDetail:false`、无缺项），所以红牌全部来自第四项 —— **473 条已落盘发现里有 43 条对字级/像素级现象给了 conf>0.35 却没引用任何放大帧**。这正是 census §3.10 末段说的"该批 P1 不具备运行时确认效力"（80 条里 conf≥0.9 为 0 条、42 条 <0.6）的机器化版本：以前只能靠人读 `confidenceRule` 自觉，现在是退出码。
PNG 尺寸只读文件头 24 字节（`readUInt32BE(16)/(20)`），254+345 张也只做常数级 IO，不会拖慢轮次。

### 残留风险 / 是否必须外部件

- **API 能力本身不可改**：`miniprogram-automator` 是三方包（census 标「无法修复（API 限制）」）。真要用 3x 取证只有一条路——绕开 `screenshot()`，改用开发者工具自带的 `wx10` CLI/`Page.screenshot` 或真机；那是**取证工具链改动**，不属定义文本。建议另立调查项（可参考 `scripts/devtools/wx10.ps1` 与 `tools/screenshot-all.mjs` 是否存在更高保真出图口），本条只保证"拿 1x 帧下的字级结论会被红牌"。
- 置信封顶依赖模型老实写 `confidence`；机器能拦"没放大帧却给高置信"，拦不住"把 confidence 写成 0.3 绕过封顶后再在文字里说得很确定"。终报口径由 D5/D7 的分母扣减承担。

## D14 — 权限抑制必须确认，未确认不得背书

### 堵住的是哪个实测数字

**6 个 wx 权限方法被批量 mock 抑制**（`getLocation / chooseLocation / authorize / getSetting / requirePrivacyAuthorize / getPrivacySetting`），且 **254/254 帧全部 `permSuppressed=true` 且 `permSuppressedUnconfirmed=true`** —— 也就是**本轮没有任何一帧被确认为"授权链真实呈现"**。后果是本该记 P0 的两条：`MP-R2VIS-TMP-TOUR-R2-001`「位置授权系统弹窗从未被处理 → **整页取证被遮罩污染（多组页面有效帧为 0）**」。真实调用点 census 已逐方法给出：`apps/client/src/utils/location.ts:34`、`utils/privacy.ts:257`、`utils/audio-recorder.ts:264/273`。
证据：census §4-D14、§3.9 首行；`reports/audit/round-2/screenshot-manifest.json#permissionSuppression`（本稿实测该对象键集为 `mockMethods / notes / grepEvidence / notMockedBecauseAbsent / notMockedOnPurpose / apiCannotAssertNativeDialog / armCount / generations / installFailures / armedAtExit / firstFrameRisk`）。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 权限抑制确认协议（v3.2 补 D14：抑制是取证手段的取舍，未确认就不能给结论背书）=====
const PERMISSION_RULES = [
  `【抑制清单必带确认状态】manifest 的 permissionSuppression 必须逐方法给 {method, mocked:true|false, realCallSite:"文件:行", confirmed:"CONFIRMED"|"UNCONFIRMED"|"IMPOSSIBLE", confirmEvidence}。只列方法名不给确认状态的清单等于没写。实测：R2 列了 6 个方法（getLocation/chooseLocation/authorize/getSetting/requirePrivacyAuthorize/getPrivacySetting），但 254/254 帧全部 permSuppressedUnconfirmed=true —— 本轮对权限链的取证自始至终没有一次背书。`,
  `【未确认即封判定域】凡 confirmed≠CONFIRMED，则所有依赖该权限链的用例与视觉结论只能记 UNVERIFIED-PERMISSION：定位/附近的人/地址逆地理、隐私弹窗与合规拦截、麦克风与录音、相机与相册选图。禁止据此立页面级 P0/P1，也禁止宣布"功能正常"。实测教训：位置授权弹窗从未被处理造成整页遮罩污染、多组页面有效帧为 0，却被当成页面缺陷进了修复队列。`,
  `【弹窗必须被处理一次，或被证明处理不了】自动化能点原生授权框（wx10/automator 的 modal 接口）就必须至少处理一次并留 before/after 两帧作为 CONFIRMED 证据；确认点不动的（apiCannotAssertNativeDialog=true）必须写明"哪个 API 为什么不行"，并据此把相关页面标为**取证不可达页面**、写进终报 notCovered，不许再给它们算覆盖率。`,
  `【遮罩污染帧不得计入配额】被系统弹窗/授权框遮住的帧必须打 masked=true 且不计状态配额（与 D4 同一判据），并单独报"因遮罩丢失有效帧的页面数"。`,
].join("\n");
```

**(2) 新增顶层校验函数**：

```ts
// 权限抑制确认门禁（v3.2 补 D14）。退出码 1 = 抑制未确认却仍产出权限链结论 / 清单缺确认字段。
// 实测依据：6 个 wx 方法被抑制、254/254 帧 permSuppressedUnconfirmed=true、两条遮罩污染被判 P0/P1。
async function permissionConfirmGate(label: string, manifestFile: string, findingsDirs: string[]): Promise<{ ok: boolean; detail: string }> {
  if (!manifestFile) return { ok: false, detail: `${label}: 无 manifest，权限抑制范围无从界定` };
  const PERM_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const mf=process.argv[1]||'',dirs=(process.argv[2]||'').split('|').filter(Boolean);",
    "let m={};try{m=JSON.parse(fs.readFileSync(mf,'utf8'))}catch(e){console.log('PERM_RESULT=FAIL reason=manifest 不可读 '+mf);process.exit(1)}",
    "const ps=m.permissionSuppression||{};",
    "const methods=Array.isArray(ps.mockMethods)?ps.mockMethods:[];",
    "const list=Array.isArray(ps.entries)?ps.entries:null;",
    "const unconfirmed=[];",
    "if(list){for(const e of list){if(String(e.confirmed||'')!=='CONFIRMED')unconfirmed.push(String(e.method||'?')+'='+(e.confirmed||'(缺)'))}}",
    "else if(methods.length){for(const x of methods)unconfirmed.push(x+'=(清单未给 confirmed 字段)')}",
    "const shots=m.shots||[];",
    "const unconf=shots.filter(function(s){return s&&s.permSuppressedUnconfirmed===true}).length;",
    "const masked=shots.filter(function(s){return s&&s.masked===true}).length;",
    "const CHAIN=/定位|位置|附近|地址|逆地理|授权|隐私|麦克风|录音|语音|相机|相册|选图|权限|getLocation|chooseLocation|authorize|getSetting|Privacy|录音机/;",
    "let badIssues=0,scanned=0;const ex=[];",
    "function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')){",
    "let j=null;try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch(err){continue}",
    "const arr=Array.isArray(j)?j:(Array.isArray(j.issues)?j.issues:[]);",
    "for(const it of arr){if(!it||typeof it!=='object'||typeof it.id!=='string')continue;scanned++;",
    "const txt=(String(it.description||'')+String(it.evidence||'')).slice(0,800);",
    "const sev=String(it.severity||'');",
    "if(CHAIN.test(txt)&&(sev==='P0'||sev==='P1')&&String(it.status||'待修复')!=='保留'){",
    "const ok=unconfirmed.length===0&&String(it.permissionConfirmed||'')==='CONFIRMED';",
    "if(!ok){badIssues++;if(ex.length<5)ex.push(it.id+' '+sev)}"
    "}}}}} }",
    "for(const d of dirs)walk(d);",
    "console.log('PERM_METHODS='+methods.length+' UNCONFIRMED_ENTRIES='+(list?unconfirmed.length:(methods.length?'(缺 entries[])':0))+' SHOTS='+shots.length+' SHOTS_UNCONFIRMED='+unconf+' SHOTS_MASKED='+masked+' FINDINGS_SCANNED='+scanned+' CHAIN_P0P1_WITHOUT_BACKING='+badIssues);",
    "if(unconfirmed.length)console.log('PERM_UNCONFIRMED '+unconfirmed.slice(0,8).join(','));",
    "if(ex.length)console.log('PERM_VIOLATION '+ex.join(' ; '));",
    "const hardFail=!!(methods.length&&unconfirmed.length)||badIssues>0;",
    "console.log(hardFail?'PERM_RESULT=FAIL（权限抑制未经确认却被用来下 P0/P1 结论）':'PERM_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", PERM_SCRIPT, manifestFile, findingsDirs.join("|")]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("PERM_METHODS=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("PERM_RESULT=") === 0) || (r.exitCode === 0 ? "PERM_RESULT=PASS(未打印)" : "PERM_RESULT=FAIL(退出码 " + r.exitCode + ")");
    const samples = lines.filter(l => l.indexOf("PERM_VIOLATION") === 0 || l.indexOf("PERM_UNCONFIRMED") === 0).slice(0, 2);
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}${samples.length ? " | " + samples.join(" ; ") : ""}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 权限确认门禁启动失败 ${String(e).slice(0, 160)}` };
  }
}
```

**(3) 提示词条目**（巡检 manifest 要求，紧随 (D1) 的【证据清单（必须）】与 D12 的身份条目之后）：

```ts
      `【权限抑制清单（v3.2 必填）】permissionSuppression.entries 逐方法给 {method, mocked, realCallSite:"文件:行", confirmed:"CONFIRMED|UNCONFIRMED|IMPOSSIBLE", confirmEvidence}；被系统弹窗遮住的帧打 masked=true 并同步 stateNotApplied 口径。凡 confirmed 非 CONFIRMED，相关页面在 coverage 里必须写"取证不可达（原因）"而不是"已覆盖"。`,
```

**(4) 提示词条目**（视觉/判定两席共用，紧随 D8 的 (3) 之后）：

```ts
  "【权限链结论要有背书】定位/隐私/麦克风/相机类结论只有在 manifest 里该权限 confirmed=CONFIRMED（附证据）时才可立 P0/P1；否则记 UNVERIFIED-PERMISSION 并写进 unverifiable。因授权弹窗导致的整页遮罩属取证缺陷（owner=instrument），不是页面缺陷。",
```

**(5) 调用点**（`auditRound` 内，紧随 D13 的 `cap` 之后）：

```ts
  // v3.2 补 D14：权限抑制未经确认不得给结论背书
  const perm = await permissionConfirmGate(label, tour.manifestFile, [`${dir}/findings`, `${dir}/code-findings`, `${dir}/interact`]);
  if (!perm.ok) {
    blockers.push(`${label}: 权限确认门禁 FAIL —— ${perm.detail}`);
    interactUnverifiable.push(`${label}: 依赖授权链的用例本轮改判 UNVERIFIED-PERMISSION（详见门禁 detail）`);
    log(`权限确认门禁未过：${perm.detail}`);
  } else {
    log(`权限确认门禁通过：${perm.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(2) 之前 | `// ===== 证据预算协议（减少截图与解析成本）=====` | 1（顺序：D4 → D7 → D8 → D13 → D14 → 该行） |
| (3) 之后 | 同 D1(3)/D12(3) 使用的 `【证据清单（必须）】完成后写` 行 | 1（三条按 D1 → D12 → D14 顺序追加） |
| (4) 之后 | 同 D8(3) 使用的 `  "【编号】Issue id 格式：MP-轮次标签-页面路由大写-三位序号。",` | 1（D8(3) 之后追加本条） |
| (5) 之前 | `  const exec = uiRes.exec;`（D13(4) 之后） | 1（顺序：D13 块 → D14 块） |

### 符号自证

```
$ grep -cF '【证据清单（必须）】完成后写' …v32.dwf.ts        → 1
$ grep -cF '【编号】Issue id 格式' …                          → 1
$ grep -cF 'const exec = uiRes.exec;' …                       → 1
$ grep -cF 'interactUnverifiable' …                           → 5
$ grep -cF 'blockers.push' …                                  → 17
$ grep -cF 'world.run' …                                      → 8
$ node -e "…读 round-2/screenshot-manifest.json…"
   permSuppressed=true → 254/254 ；permSuppressedUnconfirmed=true → 254/254
   permMethods 全集 = ["getLocation","chooseLocation","authorize","getSetting","requirePrivacyAuthorize","getPrivacySetting"]
   permissionSuppression 键集含 apiCannotAssertNativeDialog / armCount / firstFrameRisk（本条 (1) 引用的字段名与此一致）
$ ls apps/client/src/utils/location.ts apps/client/src/utils/privacy.ts apps/client/src/utils/audio-recorder.ts → 三个真实调用点文件都在
```

### 可机检说明

三项退出码：① `permissionSuppression.mockMethods` 非空但缺 `entries[].confirmed` → FAIL（现盘即此状态，函数会打印 `UNCONFIRMED_ENTRIES=(缺 entries[])`）；② `SHOTS_UNCONFIRMED > 0` 且存在权限链 P0/P1 结论 → `CHAIN_P0P1_WITHOUT_BACKING>0` FAIL；③ `SHOTS_MASKED` 与 `stateNotApplied` 口径不联动时由 D4 的门禁抓（本条只报数）。
本条**不会**为了通过而放宽：按现状实现，R2 数据跑出来必然 FAIL —— 这正是它该有的行为（本轮权限链取证为零，任何"权限正常"的结论都不该被背书）。

### 残留风险 / 是否必须外部件

- **必须改取证工具链才能真解**：要拿到 `CONFIRMED`，得让自动化真的能点原生授权弹窗（`scripts/devtools/wx10.ps1` 侧的 modal/弹窗接口）或改 mock 策略（`notMockedOnPurpose` 字段说明已有按需不 mock 的机制）。这不是定义文本能完成的，属**外部脚本/构建配置改动**；census §4-D14 的原文判断也是"在定义上就无法背书"。
- 6 个方法若要按页区分（只在用到它的页面抑制），要改的是 mock 注入层（`apps/client/src/services/mocks/*`）而不是 DSL。

## D16 — 修复与取证解耦（产物新鲜度 + 后端重启生效证明）

### 堵住的是哪个实测数字

**本轮 exec 跑在 15:57 构建的 mock 产物上，而 wave3 三处改动 23:2x 才落地** —— 即"修完之后所有取证取到的都是改前行为"；`.zcode/tmp/wave3-decisions-landed.md` 原文自认「**两处改动尚未生效**：① 客户端改动要等下一次重建产物（现跑的是改前的 mock 包，real 包也是改前构建的）；② 后端改动必须重启 8080 才生效」。同族事实：**HEAD 不可构建**（`apps/client/src/subpackages/setup/schedule/index.vue:9` 缺 `ref` 导入而 `:50` 用了 `ref(false)`，全仓无 auto-import；同类违规 HEAD 1 处 / 工作树 0 处）与 **26 / 34 / 35 三个"未提交路径数"互斥**（`.zcode/tmp/TAKEOVER-HANDOFF.md:13-33` 记 26，`screenshot-manifest.json#gitWorktreeDirtyPaths=35`，`VISUAL-WAVE2.evidenceBase.headAtAudit` 记 34）。
证据：census §4-D16、§5 第 10 项（wave3 四项效果**全部未取证**）。

### 条款文本（可直接粘贴）

**(1) 新增顶层常量与协议**：

```ts
// v3.2 补 D16：被测物新鲜度对账用的路径（一律取产物入口文件，不看构建命令字符串）
const FRESH_PATHS = {
  clientSrc: "apps/client/src",
  clientArtifactEntry: WORKFLOW.build.sharedOutDir + "/app.json",
  clientArtifactEnv: WORKFLOW.build.sharedOutDir + "/config/env.js",
  realArtifactEntry: WORKFLOW.build.realOutDir + "/app.json",
  apiSrc: "apps/api/src",
  apiClasses: "apps/api/target/classes",
};
// 工作树/产物新鲜度的披露汇集处（终报 notCovered 会引用它）
const worktreeNotes: string[] = [];

// ===== 修复与取证解耦协议（v3.2 补 D16：改了什么就要重新生成什么，否则证据属改前）=====
const WORKTREE_RULES = [
  `【先固化再取证】本轮修复要进入 UI 复验前，必须先把改动 commit（走 Git 管家，范围限定在已列 filesChanged），再重建产物、再取证。确实不能提交的（如需用户裁定），必须在 manifest 里记 gitWorktreeDirtyPaths=<数量> 并在终报披露"证据含未提交改动"。实测教训：HEAD 仍停在 18c91ccf 而工作树有 26~35 个源码路径未提交（同一件事三个数），于是"证据对应哪个代码"根本无法判定。`,
  `【HEAD 不可构建即整轮阻塞】G1 是对**提交后的 HEAD** 负责，不是对工作树负责。若干净 HEAD 构建不过（实测：setup/schedule/index.vue:9 缺 ref 导入却在 :50 用了 ref(false)，全仓无 auto-import），必须先修到 HEAD 可构建；期间用工作树截出来的图一律标 "EVIDENCE-BASE=DIRTY-WORKTREE"，不得用于宣告 HEAD 状态正常。`,
  `【改动类型决定重放动作】客户端源码改动 → 必须重建产物（${WORKFLOW.build.mockScript} 或 ${WORKFLOW.build.realScript}）后才允许复验；后端 Java/配置改动 → 必须重启 8080 并留下生效证明（新进程启动时间晚于改动时间，或改动字段在接口响应里已出现）才允许复验。二者缺一时结论只能记 BLOCKED-EFFECT-PENDING，**禁止记"已修复/已验证"**。实测教训：wave3 三处改动的四项效果（loginRequired 文案、hadSession 分支、后台 title 列、heart-filled 反色）至今全部未取证。`,
  `【脏度自证】manifest 必须记 gitWorktreeDirtyPaths（同一算法：git status --porcelain -- apps 的行数）与 artifactBuiltAt（产物入口文件 mtime）；两者与本轮取证时间一起构成"证据基线"。`,
].join("\n");
```

**(2) 新增顶层校验函数**（产物比源码旧 = 取证跑在改前包上）：

```ts
// 被测物新鲜度门禁（v3.2 补 D16）。只读文件系统时间戳。
// 实测依据：exec 跑在 15:57 的 mock 产物上、wave3 改动 23:2x 才落地；real 包同样是改前构建。
async function artifactFreshGate(): Promise<{ ok: boolean; detail: string }> {
  const FRESH_SCRIPT = [
    "const fs=require('fs'),path=require('path');",
    "const P=JSON.parse(process.argv[1]||'{}');",
    "function newest(dir,re,depth){let best=0,count=0;if(!dir||!fs.existsSync(dir))return -1;",
    "(function walk(d,d0){if(d0>9)return;let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return}",
    "for(const e of es){const p=path.join(d,e.name);let st=null;try{st=fs.statSync(p)}catch(err){continue}",
    "if(st.isDirectory()){walk(p,d0+1);continue}count++;if(re.test(e.name)&&st.mtimeMs>best)best=st.mtimeMs}}})(dir,0);return count?best:-2}",
    "function mtimeOf(p){try{return fs.statSync(p).mtimeMs}catch(e){return -1}}",
    "const CS=/\\.(vue|ts|js|json|scss|css)$/;",
    "const AS=/\\.(java|yml|yaml|xml|properties)$/;",
    "const srcC=newest(P.clientSrc,CS,0), artC=mtimeOf(P.clientArtifactEntry);",
    "const srcA=newest(P.apiSrc,AS,0), clsA=newest(P.apiClasses,/\\.class$/,0);",
    "let mode='(无)';try{const t=fs.readFileSync(P.clientArtifactEnv,'utf8');const mm=t.match(/MODE\\s*[:=]\\s*[\"']?([A-Za-z0-9_\\-]+)/);if(mm)mode=mm[1]}catch(e){}",
    "const clientStale=srcC>=0&&artC>=0&&srcC>artC;",
    "const apiStale=srcA>=0&&clsA>=0&&srcA>clsA;",
    "const clientGapMs=clientStale?Math.round(srcC-artC):-1;",
    "const apiGapMs=apiStale?Math.round(srcA-clsA):-1;",
    "console.log('FRESH_CLIENT_SRC='+(srcC<0?'(缺)':new Date(srcC).toISOString())+' FRESH_CLIENT_ARTIFACT='+(artC<0?'(缺)':new Date(artC).toISOString())+' FRESH_API_SRC='+(srcA<0?'(缺)':new Date(srcA).toISOString())+' FRESH_API_CLASSES='+(clsA<0?'(缺)':new Date(clsA).toISOString())+' CLIENT_STALE='+(clientStale?clientGapMs+'ms':'no')+' API_STALE='+(apiStale?apiGapMs+'ms':'no')+' ARTIFACT_MODE='+mode+' REAL_ARTIFACT='+(mtimeOf(P.realArtifactEntry)>0?'present':'absent'));",
    "const hardFail=clientStale||apiStale;",
    "console.log(hardFail?'FRESH_RESULT=FAIL（源码比被测产物新：本轮取证取的是改动前的行为）':'FRESH_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", FRESH_SCRIPT, JSON.stringify(FRESH_PATHS)]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("FRESH_CLIENT_SRC=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("FRESH_RESULT=") === 0) || (r.exitCode === 0 ? "FRESH_RESULT=PASS(未打印)" : "FRESH_RESULT=FAIL(退出码 " + r.exitCode + ")");
    let dirty = "-1";
    const g = await gitTry(["status", "--porcelain", "--", "apps"]);
    if (g.spawned && g.ok) dirty = String(g.out.split("\n").map(s => s.trim()).filter(Boolean).length);
    return { ok: r.exitCode === 0, detail: `${stat} | 工作树未提交 apps/ 路径=${dirty} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `被测物新鲜度校验无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(3) 提示词条目**（修复工程师，紧随 `完整证据文件：${findingFiles.join(…)}` 之后）：

```ts
        `【生效条件（v3.2 必填）】返回里为每个 fixedIds 说明它需要哪种重放才生效：client（要重建产物）/ api（要重启 8080）/ none；无法自行完成重放的，必须在 skipped 之外另记 blockedIds 并写"待重放后才可复验"。禁止在产物未重建、后端未重启时宣称"已验证"。`,
```

**(4) 调用点 A**（`auditRound` 里构建之前）：

```ts
  // v3.2 补 D16：取证之前先确认被测物不比源码旧（旧则整轮证据属改前行为）
  const fresh = await artifactFreshGate();
  if (!fresh.ok) {
    blockers.push(`${label}: 被测物新鲜度 FAIL —— ${fresh.detail}`);
    worktreeNotes.push(`${label}: ${fresh.detail}`);
    log(`被测物新鲜度未过：${fresh.detail}`);
  } else {
    log(`被测物新鲜度通过：${fresh.detail}`);
  }
```

**(5) 调用点 B**（终报披露，`result` 的 `notCovered` 里追加一行 spread）：

```ts
    ...(worktreeNotes.length ? [`工作树/产物新鲜度未闭环：${worktreeNotes.join("；")}（相关"已修复"结论按改前证据看待）`] : []),
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(2) 之前 | `// ===== UI Lock 状态机协议（v3.2：AVAILABLE/LEASED/STALE + RELEASED 墓碑；不旋轮重试）=====` | 1（顺序：D5 → D12 → D16 → 该行） |
| (3) 之后 | `        \`完整证据文件：${findingFiles.join("、") \|\| dir + "/ 下 findings/ 与 code-findings/"}\`,` | `grep -cF '完整证据文件：${findingFiles.join'` = 1 |
| (4) 之前 | `  // —— Evidence Bus：代码审查（非 UI，总是跑）∥ 用例预备（非 UI）∥ UI 证据（受 Gate 控制）——` 之上的 `let gate = await buildGate();` | `grep -cF 'let gate = await buildGate();'` = 1 |
| (5) 之后 | ``    ...(openIssues.length > 50 ? [`仅列出前 50 条遗留，其余见最终报告`] : []),`` | `grep -cF '...(openIssues.length > 50 ? '` = 1 |

### 符号自证

```
$ grep -cF 'let gate = await buildGate();' …v32.dwf.ts                     → 1（auditRound 内；fixAndRegress 内是 const gate = …，另 1 处）
$ grep -cF 'const gate = await buildGate();' …                              → 1
$ grep -cF 'const buildOk = gate.ok;' …                                     → 1
$ grep -cF '完整证据文件：${findingFiles.join' …                             → 1
$ grep -cF '...(openIssues.length > 50 ? ' …                                → 1   （(5) 的 spread 形状与既有写法一致）
$ grep -cF 'WORKFLOW.build.sharedOutDir' …                                  → 2   （FRESH_PATHS 引用它，声明在最前，作用域安全）
$ grep -cF 'WORKFLOW.build.realOutDir' … / 'WORKFLOW.build.mockScript' …    → 均 ≥1
$ grep -cF 'gitTry' …                                                       → 7   （(2) 用它取 dirty 行数；返回 {spawned,ok,out,err}）
$ grep -nF '完整证据文件：${findingFiles.join' …                             → 该行位于 fixAndRegress 的提示词数组内，findingFiles 是它的形参
                                                                                     （函数签名：fixAndRegress(n,label,dir,found,findingFiles,coverage,…)），
                                                                                     所以 (3) 引用它不需要任何新符号
$ grep -cF 'const findingFiles' …                                            → 1（auditRound 里另有一处同名局部量，与本条无关）
$ 路径存在性：apps/client/dist/build/mp-weixin/app.json、…/config/env.js、apps/api/target/classes  → 均在盘上（本稿实测）
$ ls apps/client/src/subpackages/setup/schedule/index.vue                    → 存在（census 记的缺 ref 导入处）
```

### 可机检说明

退出码断言两条：**源码树最新 mtime > 产物入口 mtime** → 客户端产物过期；**apps/api/src 最新 mtime > target/classes 最新 mtime** → 后端未重编（更谈不上重启生效）。detail 同时印 `ARTIFACT_MODE=`（读产物里的 `config/env.js`，与 [C-10]/G7 的"以产物文件为准"同一口径）与工作树脏度行数（把 26/34/35 三个数收敛成一个算法值）。
不新建脚本文件；但**后端"已重启"这件事机器只能证到"已重编"** —— 真正确认需要新进程启动时间，见下。

### 残留风险 / 是否必须外部件

- **必须改产品代码**：HEAD 不可构建是**产品侧一行 import 缺失**（`setup/schedule/index.vue` 补 `ref` 导入，census 记工作树里已经修好、HEAD 里没修）——不提交进 HEAD，G1 就永远只对脏工作树负责。定义文本无法替它提交。
- **后端重启生效证明**需要外部动作：建议新增 `scripts/qa/verify-backend-restarted.mjs`（本稿不创建）——读 `/actuator/health`（或 `apps/api/logs/campus-love-api.log` 里最后一次 `Started .* in .* seconds` 的时间戳）与 `apps/api/src` 最新 mtime 比对，输出 `BACKEND_FRESH=PASS|FAIL`。DSL 侧本条只做到"未重编即红牌"。
- 真正的"修复与取证解耦"（独立 worktree / 只读产物快照）属工程改造：本轮 `reports/screenshots/` 与 `apps/client/dist/` 都被 exec 与 fixer 同时读写，定义层只能用"先 commit 再取证"退而求其次。

## D17 — 通信劣化即降级（automator 超时 / reconnects）

### 堵住的是哪个实测数字

**`tmp/qa/checkpoints/exec-R2.json` 的 21 个 suite 全部 `reconnects: 0`，而同一轮 `interact/exec-results.json` 的 `evidence[]` 里有 437 条 `ERROR:timeout waiting for automator response`（1270 条证据串的 34.4%）** —— 通道明显已经反复失灵，检查点却自报"从未重连"，等于这个字段是填死的常量。定义里没有任何"通信劣化即降级/重连"的处置。
证据：census §4-D17、§3.9「截图落盘失败」行（437 与 536/941 无干净帧同源）。

### 条款文本（可直接粘贴）

**(1) 新增顶层协议常量**：

```ts
// ===== 自动化通道劣化协议（v3.2 补 D17：超时不是"个别用例失败"，是通道在坏）=====
const CHANNEL_RULES = [
  `【劣化必须计数】执行器必须为每个 Suite 维护真实的 reconnects 计数器：每次因 automator 无响应/超时而重建连接（disconnect→connect 或重启会话）都 +1，并把触发用例号写进该 Suite 的 degradedFrom。禁止把 reconnects 写成常量 0 —— 实测 R2 的 21 个 suite 全部记 0，而同轮证据里躺着 437 条 timeout，这个字段因此完全失去信息量。`,
  `【阈值即降级】同一 Suite 内累计超时 ≥5 次，或超时证据占比 >5%：立即重连一次；重连后该 Suite 已标 EXECUTED 的用例必须重跑证据采集（按 tier），拿不回证据的一律改判 NO-EVIDENCE（与 D5 同一等态）；重连仍失败的，把该 Suite 标 degraded=true 并在结论里写明"此后用例不可背书"。`,
  `【通道噪声不得冒充产品缺陷】timeout / ERROR: 串不得出现在 evidence[] 里当证据（要么去掉、要么把该用例改判）；实测 R2 的 437 条错误串正是这样被算进"已执行"的。`,
  `【统计口径要露出】轮末报告必须印：超时证据条数 / 占证据总数比例 / 受影响用例数 / 实际重连次数 / 被降级的 Suite 列表。上一轮这些数一个都没露，所以"reconnects 全 0"看起来像一切正常。`,
].join("\n");
```

**(2) 新增顶层校验函数**：

```ts
// 通道劣化对账（v3.2 补 D17）：证据里的 timeout 串 vs 检查点自报的 reconnects。
// 实测依据：21 个 suite 全记 reconnects=0，同轮 exec-results 证据里有 437 条 ERROR:timeout。
async function channelHealthGate(label: string, resultsFile: string, checkpointFile: string, scriptPath: string): Promise<{ ok: boolean; detail: string }> {
  const CH_SCRIPT = [
    "const fs=require('fs');",
    "const rf=process.argv[1]||'',cf=process.argv[2]||'',sp=process.argv[3]||'';",
    "let entries=0,timeoutStr=0,casesHit=0;",
    "try{const j=JSON.parse(fs.readFileSync(rf,'utf8'));const rs=j.results||[];",
    "for(const r of rs){const evs=Array.isArray(r.evidence)?r.evidence:[];let hit=false;",
    "for(const s of evs){entries++;if(/ERROR:|timeout waiting for automator/i.test(String(s))){timeoutStr++;hit=true}}",
    "if(hit)casesHit++}}catch(e){}",
    "let suites=0,reconn=0,degraded=0,noFlag=false;",
    "try{const c=JSON.parse(fs.readFileSync(cf,'utf8'));const arr=c.suites?(Array.isArray(c.suites)?c.suites:Object.keys(c.suites).map(function(k){const v=c.suites[k];v.suite=k;return v})):[];",
    "suites=arr.length;for(const s of arr){reconn+=Number(s.reconnects||0);if(s.degraded===true)degraded++;if(typeof s.reconnects!=='number')noFlag++}}catch(e){}",
    "let hardcoded='no';",
    "if(sp&&fs.existsSync(sp)){const ls=fs.readFileSync(sp,'utf8').split(/\\r?\\n/);",
    "for(const l of ls){const t=l.trim();if(t.indexOf('//')===0||t.indexOf('*')===0)continue;if(/reconnects\\s*[:=]\\s*0\\b/.test(l)&&!/\\+\\+|\\+=|count/i.test(l)){hardcoded='yes';break}}}",
    "const ratio=entries?(timeoutStr/entries*100):0;",
    "console.log('CHAN_ENTRIES='+entries+' CHAN_TIMEOUT_STRINGS='+timeoutStr+' ('+ratio.toFixed(1)+'%) CASES_HIT='+casesHit+' SUITES='+suites+' RECONNECTS_SUM='+reconn+' DEGRADED_SUITES='+degraded+' NO_RECONNECTS_FIELD='+noFlag+' HARDCODED_ZERO='+(sp?hardcoded:'(未给脚本)'));",
    "const hardFail=!!(timeoutStr>0&&(reconn===0||degraded===0))||noFlag>0||hardcoded==='yes';",
    "console.log(hardFail?'CHAN_RESULT=FAIL（通道已在超时却没重连/没降级，或 reconnects 是写死的常量）':'CHAN_RESULT=PASS');",
    "process.exit(hardFail?1:0);",
  ].join("");
  try {
    const r = await world.run("node", ["-e", CH_SCRIPT, resultsFile, checkpointFile, scriptPath]);
    const lines = String(r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const stat = lines.find(l => l.indexOf("CHAN_ENTRIES=") === 0) || "（无统计行）";
    const verdict = lines.find(l => l.indexOf("CHAN_RESULT=") === 0) || (r.exitCode === 0 ? "CHAN_RESULT=PASS(未打印)" : "CHAN_RESULT=FAIL(退出码 " + r.exitCode + ")");
    return { ok: r.exitCode === 0, detail: `${label}: ${stat} | ${verdict}` };
  } catch (e) {
    return { ok: false, detail: `${label}: 通道对账无法启动 ${String(e).slice(0, 160)}` };
  }
}
```

**(3) 提示词条目**（执行员，紧随既有【Suite/Checkpoint】那句之后）：

```ts
      `【通道健康（v3.2 必做）】检查点每 Suite 必须写真实计数：reconnects（因超时/无响应重建连接的次数，禁止写常量 0）、degraded(bool)、degradedFrom(首个受影响用例)。同一 Suite 累计超时 ≥5 次先重连一次并重跑该段证据采集，重连后仍拿不到证据的用例改判 NO-EVIDENCE；证据串里禁止留 "ERROR:timeout …" 这类尾注当证据。`,
```

**(4) 调用点**（`uiEvidence` 内，`return { tour, exec, opsFiles };` 之前）：

```ts
  // v3.2 补 D17：超时与"自报 0 次重连"对不上账即整轮通道不可背书
  const chan = await channelHealthGate(label, exec.resultsFile, `tmp/qa/checkpoints/exec-${label}.json`, exec.scriptPath);
  if (!chan.ok) {
    blockers.push(`${label}: 通道劣化未处置 —— ${chan.detail}`);
    interactUnverifiable.push(`${label}: 超时涉及的用例本轮不得计入已验证（详见通道对账 detail）`);
    log(`通道对账未过：${chan.detail}`);
  } else {
    log(`通道对账通过：${chan.detail}`);
  }
```

### 插入锚点

| 位置 | 唯一锚点行（原样） | grep 结果 |
|---|---|---|
| (1)(2) 之前 | `// ===== 三级重置协议（A1 恢复手段；避免频繁 reLaunch）=====` | 1（紧接 D10 块之后，顺序 D10 → D17 → 该行） |
| (3) 之后 | `      \`【Suite 划分】按页面域分 Suite（每 Suite ≤6 页）：…每 Suite 结束写检查点（suite/status/executedCaseIds）。\`,` | 1（D10(2) 也在此行之后，顺序 D10(2) → D17(3)） |
| (4) 之前 | `  return { tour, exec, opsFiles };` | 1（三条共用该锚点，落地顺序：D10 块 → D12 块 → D17 块 → 该行） |

### 符号自证

```
$ grep -cF '// ===== 三级重置协议（A1 恢复手段；避免频繁 reLaunch）=====' … → 1
$ grep -cF 'Suite 开始前读检查点 tmp/qa/checkpoints/exec-' …                → 1（(4) 的检查点路径与它同式）
$ grep -cF 'return { tour, exec, opsFiles };' …                             → 1
$ grep -cF 'scriptPath: string;' …                                              → 2（ShotBatch 与 ExecResult 各一个字段，(4) 取后者）
$ grep -cF 'const exec = await exec0.ask<ExecResult>(' …                        → 1（(4) 所在作用域里 exec 就是它；v32 现有用法形如 ui.tour.scriptPath / exec.shotDir）
$ grep -cF 'exec.scriptPath' …                                                  → 0 ← 如实说明：**这个字面组合在 v32 里没出现过**，但类型成立
     （ExecResult.scriptPath 是已声明字段 + exec 是 uiEvidence 内的 ExecResult 局部量；若主代理更保守，
      可把 (4) 的第四入参换成 `""`，函数会打印 HARDCODED_ZERO=(未给脚本) 并跳过该项，其余两条断言不受影响）
$ grep -cF 'interactUnverifiable' …                                         → 5
$ grep -cF 'blockers.push' …                                                → 17
$ grep -cF 'world.run' …                                                    → 8
$ node -e "…exec-R2.json" → 21 suites，每项含 executed/failed/reconnects(=0)/status/executedCaseIds，无 degraded 字段
```

### 可机检说明

退出码断言三条：① `CHAN_TIMEOUT_STRINGS>0` 而 `RECONNECTS_SUM==0` 或 `DEGRADED_SUITES==0` → FAIL（实测 R2：437 / 0 / 0）；② 有 suite 缺 `reconnects` 数值字段 → FAIL（`NO_RECONNECTS_FIELD`）；③ 执行器脚本里出现 `reconnects: 0` 这类**字面量赋值**（且不含 `++`/`+=`/`count`）→ `HARDCODED_ZERO=yes` FAIL —— 与 D1 抓字面量 SHA 同一手法，且同样跳过注释行防假阳性。
不新建脚本文件。

### 残留风险 / 是否必须外部件

- **真正的重连逻辑要写在执行器脚本里**（`disconnect()→connect()` 再续跑），DSL 无法代劳：这与 v32 自记的遗留第 2 项「9420 锁没有 DSL 层 watchdog：释锁靠代理自觉挂 finally，DSL 无法强制」是同一类结构缺口。本条做到的是"说谎会被抓"（对账 + 字面量检出），不是"替它重连"。
- 437 条超时的**根因**（DevTools/automator 会话泄漏，census §3.9 记 89 连接 / 6 pid 且协议禁 taskkill）需要环境侧处置，与 D9 的锁协议联动，定义层只能把受影响用例如实降级。

## 13. 数字偏差清单（定义里写 X / census 实测 Y / 应改 Z）——只列清单，不动文件

比对对象：v32 的 `WORKFLOW.instrument` 注释、`INSTRUMENT_RULES`、CHANGELOG `[C-2]`/`[C-3]`。重算口径全部来自 census §0bis / §2.1 / §2.2（唯一权威 = `reports/audit/round-2/interact/exec-results.json`，941 条，`updatedAt=2026-09-24T16:06:40.116Z`）。

| # | 定义位置（定位串，本稿复核唯一命中） | 定义写的是 X | census/本稿实测 Y | 应改成 Z |
|---|---|---|---|---|
| 1 | `    forbidPlaceholderSelector: true,  // v3.1 的 R2 轮里 288 条 FAILED 有 192 条是 __CAND__ 占位/垃圾标签` | FAILED 288 / __CAND__ 192 | 权威账本 FAILED **289**、`__CAND__` 族 **194**（288/192 是 `.zcode/tmp/exec-stop-snapshot.json` 与中途时点数） | `…R2 轮 289 条 FAILED 有 194 条（67.1%）是 __CAND__ 占位/垃圾标签…` |
| 2 | `  \`禁止执行器用正则从中文标题里"猜"选择器后回填 ${'__CAND__'} 占位符。实测教训：R2 轮 288 条 FAILED 里 192 条是 ${'__CAND__'}…\`` | 同上（288/192） | 289 / 194 | 同 #1，改数为 289 / 194 |
| 3 | 同 #2 那句里 `其中 67 条连 label 都没有` | 67 | 67 出自中途分诊件 `.zcode/tmp/exec-failure-triage.md:30`（14:49Z 时点 141/217=65%，其中「无文案，纯候选列表耗尽」67）；**全量重算为 74 条 A1「完全无标题的裸 __CAND__」** | 改成「其中 74 条完全无标题（裸 `__CAND__`）」 |
| 4 | 同 #2 那句里 `另有 label 被截成"按/校/机/题/赞"等单字垃圾` | 未给数 | 确凿截断证据是 **25 条单字标题**（字集：按11/校2/机2/赞/题/试/一/回/态/误/空/填/他） | 补上「实测 25 条被截成单字」，字集保留（`按/校/机/题/赞` 五个字与实际一致，可不动） |
| 5 | `  \`【队列对账】…实测教训：R2 清单 1107 例、记录 940 例，差 167 例（村口三套未跑）…\`` | 记录 940 / 缺口 167 | 记录 **941**、缺口 **166** = VILLAGE 三套整套未跑 **116**（42+40+34）+ `次要19` 跑到一半被终止 **50**（计划 69、记录 19） | 改成「清单 1107 例、记录 941 例，缺口 166 例 = 村口三套 116 + 次要19 被截断 50」 |
| 6 | `// [C-2] …根因：R2 的 288 条 FAILED 里 192 条是执行器用正则从中文标题猜选择器产生的占位/垃圾标签` + `//         （67 条无 label；label 被截成"按/校/机/题/赞"单字）` | 288/192/67 | 289/194/74（单字 25） | 同 #1–#4 四个数一起改 |
| 7 | `// [C-3] …根因：R2 清单 1107 例、实际记录 940 例，村口三套（116 例）从未开跑` | 940；只提 116 | 941；缺口 166（116 + 50）——**现在这行让人以为缺口就是 116** | 改成「实际记录 941 例，缺口 166 例：村口三套 116 例从未开跑 + `次要19` 被终止截断 50 例」 |
| 8 | `//   real 素材可达 = 后端存活 ∧ 文件在盘 ∧ media_asset approved 三者与门（scripts/probe-real-env.mjs 探测）。`（[C-12]） | 断言 media_asset 注册表是决定因素之一 | 与本文件自己的 `REAL_E2E_RULES`/`REAL_ENV` 冲突：那两处原文写「media_asset 注册表是否是决定因素**尚未证实**（出现过未注册却返回 200）…404 一律记 BLOCKED-需对照实验」 | 不是数字，但属**定义内部自相矛盾**：把 [C-12] 这行改成「= 后端存活 ∧ 文件在盘（media_asset 是否参与尚未证实，须带对照）」 |

**另外三处「同一件事多个数」的建议口径**（不在 instrument/INSTRUMENT_RULES/[C-2]/[C-3] 内，但主代理终报要引用）：
- `MISMATCH` 自报数：census 引 75（中途时点）→ 权威文件全量 **366/941（38.9%）**。
- 工作树脏路径数：`TAKEOVER-HANDOFF` 26 / `VISUAL-WAVE2` 34 / `screenshot-manifest#gitWorktreeDirtyPaths` 35 → 本稿 D16 的门禁统一按 `git status --porcelain -- apps` 行数现算，报告里只引用该算法值。
- census §2.2 的子目 A1–A6 相加 = 74+25+55+17+16+55 = **242 > 194**，子表口径互相重叠；引用时以 **194**（A 类合计）为准，别把子目当互斥分类求和。

## 14. 无法只靠定义文本堵住的条目（必须新增外部脚本或改产品代码）

**结论先说：12 条里只有 1 条（D5）是"粘贴文本 + DSL 内联机检"就完整闭环的；10 条必须另有外部件，1 条（D1）的外部件是可选的历史清算。**别让终报写成"12 条已定义级修复"。

### A. 必须**改产品代码 / 构建配置**才真解的（5 条）

| 条 | 为什么定义堵不住 | 需要的动作 |
|---|---|---|
| **D16** | 「HEAD 不可构建」是一行 import 缺失（`apps/client/src/subpackages/setup/schedule/index.vue:9` 缺 `ref` 却在 `:50` 用 `ref(false)`，全仓无 auto-import）。DSL 只能报"不可构建"，不能替它补 import | 补 `ref` 导入**并把它提交进 HEAD**；否则 G1 永远只对脏工作树负责 |
| **D14** | 6 个 wx 权限方法是被 mock 注入层批量抑制的（真实调用点在 `utils/location.ts:34`、`utils/privacy.ts:257`、`utils/audio-recorder.ts:264/273`）。定义只能禁止"未确认就背书" | 改 mock 注入策略（按页/按方法粒度）或让自动化能处理原生授权弹窗，才有 `CONFIRMED` 可给 |
| **D13** | 截图 API 无 dpr 是三方包事实（`miniprogram-automator/out/MiniProgram.d.ts:6-8`），census 自己标「无法修复（API 限制）」 | 换出图口（DevTools CLI / `Page.screenshot` / 真机）才拿得到 3x；本条只封顶错误结论 |
| **D12** | mock 下第二身份结构上不存在（`stores/session.ts` 的 `mockUserSession.userId = "user-1001"`，R4-00134 全 mock 家族统一） | 要么 real 轮做双身份（需后端 `APP_GUEST_LOGIN_ENABLED=true` + 重启），要么改 `services/mocks/fixtures.ts` 的身份层 |
| **D8** | 4 条 `BUILD_FLAG_ABSENT` 的真解是打开/绕过特性开关（`isShowcaseMode=false`、`membershipEnabled=false`，`setup/showcase/index.vue:156-162` 硬 `switchTab(discover)`），2 条 `PARAM_REQUIRED` 是参数表内容 | 改构建开关配置 + 补 `scripts/r11-param-map.json`（census 称"零成本解法"）；定义侧只保证不再误立 P1 |

### B. 必须**新增外部脚本 / 改既有脚本**才闭环的（7 条）

| 条 | 需要的外部件（本稿**不创建**，只给契约） | 读什么 / 断言什么 |
|---|---|---|
| **D3 + D4** | 改既有 `scripts/verify-evidence-integrity.mjs`：`const hardFail = missing.length \|\| mismatch.length \|\| orphans.length;` 一行加 `\|\| dupState.length`（D4），并让 `--exec` 分支参与退出码（D5 的 EXEC 侧） | 已在做同一件事，只是不参与退出码；改完 DSL 可省掉重复内联 |
| **D3 + D1（历史清算）** | 新建 `scripts/qa/verify-evidence-corpus.mjs` | 读 `reports/screenshots/**` 全部 manifest 与图片，逐目录输出 MISSING/HASH_MISMATCH/ORPHANS 三计数 + 每份 manifest 的 gitSha 对应提交；断言"没有一份 manifest 的 gitSha ≠ 其帧产生时的 HEAD"。DSL 只管当轮，R1 那 305 帧的过期宣告必须靠它 |
| **D7** | 新建 `scripts/qa/verify-ledger.mjs` | 读 `code-findings/*.json`+`findings/*.json`+`interact/*.json`+`.zcode/tmp/mode-dependent-issues.json`(数组 124 项)+`reports/audit/*/issue-matrix.md`，做「ID 全集 × 矩阵收录 × 台账收编」三向 diff，输出 alias 候选表；断言 237 个"从未进矩阵"的 ID 归零。DSL 版只能检族内声明，检不了 .md 矩阵（矩阵是代理写的散文） |
| **D10** | 新建 `scripts/qa/verify-state-truth.mjs` | 把 计划(`ops/*.json` 的 cases[]) / 权威(`exec-results.json`) / 检查点(`tmp/qa/checkpoints/*.json`) / 快照(`.zcode/tmp/exec-stop-snapshot.json`) **四列并排**输出含各自 FAILED 数；终止后人工接管只有这张表能说明"到底跑到哪"。DSL 锁得住前两份，锁不住宿主落的快照 |
| **D16** | 新建 `scripts/qa/verify-backend-restarted.mjs` | 读 `/actuator/health`（或 `apps/api/logs/campus-love-api.log` 最后一次 `Started … in … seconds` 的时间戳）与 `apps/api/src` 最新 mtime 比对，输出 `BACKEND_FRESH=PASS\|FAIL`；"重编"可机检、"重启"不能 |
| **D17** | 执行器脚本内部实现真重连（`disconnect()→connect()` + 计数器） | DSL 无法替它重连；本条的内联门禁只负责抓"字段是写死的 0"。这与 v32 自记遗留第 2 项（9420 锁没有 DSL watchdog）同一类结构缺口 |
| **D12** | 重签凭证要打后端 `/auth/guest-login`（环境动作） | 不是脚本，是环境前置：real profile 下 `app.guest-login.enabled` 默认 false → 403 |

### C. 纯定义文本 + DSL 内联机检即可闭环的（1 条）

- **D5**：四等态规则 + `execEvidenceGate` 内联机检（已实测跑出 298/194/437/EXIT=1），不需要任何新文件。
  （D1 也算，但只算"当轮"——R1 的历史证据清算仍要 B 项那个 corpus 脚本，故不计入纯文本闭环。）

### D. 顺带发现（不属 12 条，主代理需知道）

1. **`scripts/verify-evidence-integrity.mjs` 已存在却从未被 v32 引用**（`grep -cF 'verify-evidence-integrity' .zcode/workflows/miniprogram-qa-loop-v32.dwf.ts` = 0）：D3 的机检其实早写好了，缺的只是接线。
2. **本稿撰写期间 v32 被并行编辑**：`const r1 = await auditRound(1, "R1", "full", []);` 原有**重复声明两处**（SyntaxError 级），现为 1 处；`G0 环境预检` 那条 log 也被改写成端口候选扫描（我原打算用的锚点 `G0 环境预检：DevTools 9420=` 因此已不存在，改用 `phase("第 1 轮：全量基线审查");`）。**粘贴本稿前请重新跑一遍 §15 的锚点表**，锚点唯一性会被编辑破坏。
3. v32 的视觉席提示词里有一条**与 D8 方向相反的硬指令**（`把「缺截图」本身作为 P1 MiniProgram 问题记录`），它是那 4 条假 P1 的定义级来源；只补规则不替换这行 = D8 没堵。见 D8 第 (6) 项。

## 15. 锚点唯一性与符号自证：本稿实际执行的核实命令汇总

### 15.1 锚点全表（31 个定位串，一次批量复核）

执行时间与对象：本稿撰写期间 `.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts`（撰写过程中该文件被并行编辑过，见 §14-D-2）。命令形态：

```bash
f=.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts
while IFS= read -r s; do printf '%s | %s\n' "$(grep -cF "$s" "$f")" "$s"; done <<'LIST'
<下面 31 行定位串>
LIST
```

**结果：31/31 全部 = 1（唯一命中）**。

| # | 定位串（`grep -cF` 计数） | 被哪些条款用作锚点 |
|---|---|---|
| 1 | `// ===== 真实模式端到端验收协议`（1） | D1(1)(2)、D3(1)(4) |
| 2 | `【证据清单（必须）】完成后写`（1） | D1(3)、D12(3)、D14(3) ← **三条共用，落地顺序 D1 → D12 → D14** |
| 3 | `const [tour, opsFiles] = await Promise.all([tourPromise, opsPromise]);`（1） | D1(4) |
| 4 | `/** 证据清单落盘路径（manifest`（1） | D3(2) |
| 5 | `第 ${label} 轮截图巡检（单会话、Suite 化）`（1） | D3(3) |
| 6 | `for (const f of tour.failures) captureFailures.push`（1） | D3(5) |
| 7 | `// ===== 证据预算协议（减少截图与解析成本）=====`（1） | D4、D7、D8、D13、D14 的常量/函数块 ← **顺序 D4 → D7 → D8 → D13 → D14** |
| 8 | `普通页≥1 张首屏；滚动页≥3 张`（1） | D4(3) |
| 9 | `第 ${label} 轮巡检完成：${tour.shots.length} 张截图覆盖`（1） | D4(4) |
| 10 | `// ===== UI Lock 状态机协议`（1） | D5、D12、D16 的常量/函数块 ← **顺序 D5 → D12 → D16** |
| 11 | `  /** 已执行用例数 */`（1） | D5(2) |
| 12 | `status=EXECUTED\|FAILED\|SKIPPED`（1） | D5(3) |
| 13 | `【判定分域（v3.2 必做）】`（1） | D5(4) |
| 14 | `轮执行完成：`（1） | D5(6) |
| 15 | `  status: string;`（1） | D7(2) |
| 16 | `【编号】Issue id 格式`（1） | D8(3)、D14(4) ← **顺序 D8 → D14** |
| 17 | `写出：audit-report.md（含每页使用对比与功能目标汇总）`（1） | D7(5) |
| 18 | `const counts = { P0: cnt(allIssues`（1） | D7(6) |
| 19 | `  sources: string[];`（1） | D8(2) |
| 20 | `  if (!uiRes.tour`（1） | D8(5) |
| 21 | `把「缺截图」本身作为 P1 MiniProgram 问题记录`（1） | D8(6)（**替换**，非新增） |
| 22 | `// ===== 三级重置协议`（1） | D10、D17 的常量/函数块 ← **顺序 D10 → D17** |
| 23 | `Suite 开始前读检查点 tmp/qa/checkpoints/exec-`（1） | D10(2)、D17(3) ← **顺序 D10 → D17** |
| 24 | `  /** 失败/跳过用例与原因 */`（1） | D10(3) |
| 25 | `return { tour, exec, opsFiles };`（1） | D10(5)、D12(6)、D17(4) ← **顺序 D10 → D12 → D17** |
| 26 | `phase("第 1 轮：全量基线审查");`（1） | D12(5) |
| 27 | `【产出】issues 与 observations（逐页至少一条观察证据`（1） | D13(3) |
| 28 | `const exec = uiRes.exec;`（1） | D13(4)、D14(5) ← **顺序 D13 → D14** |
| 29 | `let gate = await buildGate();`（1） | D16(4) |
| 30 | `完整证据文件：${findingFiles.join`（1） | D16(3) |
| 31 | `...(openIssues.length > 50 ?`（1） | D16(5) |

### 15.2 被引用的既有符号（全部命中，无一生造）

```
blockers.push 17 · captureFailures.push 1 · interactUnverifiable 5 · allIssues 23 · issueIds 11
findIssue 8 · pushBoard 19 · admit( 10 · cnt( 5 · totalShots 7 · headAfterR2 4
gitTry 7 · world.run 8 · report( 2（其中一处在 pushBoard 内部）· artifact.board 1 · artifact.markdown 1
WORKFLOW.version 1 · WORKFLOW.ui.endpoint 3 · WORKFLOW.ui.portCandidates（编辑后新增）· WORKFLOW.build.sharedOutDir 2
WORKFLOW.build.realOutDir 3 · WORKFLOW.build.mockScript 1 · WORKFLOW.realEnv.apiBaseUrl 4
WORKFLOW.instrument.unresolvedVerdict 1 · WORKFLOW.boardLimit 1(boardLimit: 120 处)
ShotBatch.manifestFile 1 · ShotBatch.scriptPath（scriptPath: string; 2）· ExecResult.resultsFile 1 · ExecResult.checkpoints 1
PageEntry(route/name/core) 1 · Issue 1 · interface ExecResult 1 · interface ShotBatch 1 · interface Issue 1
recon.srcRoot 2 · recon.captureHow 3 · dir/label/uiRes/tour/exec 等局部量见各自函数签名
```
**刻意没有出现过的名字**（避免再造 `gates.push` 那类事故）：`gates`（数组在 v32 里只有 `FinalReport.gates` 这个**代理返回字段**，没有同名顶层数组，本稿一律改用 `blockers`）、`realGates`（作用域在 1479 行之后，本稿前部条款不引用）、`files.*`（宿主全局未列入白名单，本稿只用 `world.run`）、`REAL_DIR`（TDZ，见 D7 注意事项）。

### 15.3 本稿真跑过的机检（只读，零写入）

| 门禁 | 输入 | 输出（关键列） | 退出码 |
|---|---|---|---|
| D5 `execEvidenceGate` | `reports/audit/round-2/interact/exec-results.json` | `EXECUTED=523 NO_CLEAN_FRAME=298 TIER_UNMET=194 ERROR_STRINGS=437 TAGGED_NO_EVIDENCE=0` | 1 |
| D10 `stateTruthGate` | 同上 + `tmp/qa/checkpoints/exec-R2.json` | `ROWS=941 FAILED=289 DUP_BARE_IDS=30 DUP_COMPOSITE_KEYS=0 CK_SUM_EXECUTED=922 CK_SUM_FAILED=282 CK_FAILURES_LEN=0 SKEW=99671ms` | 1 |
| D12 `credentialFreshGate` | `tmp_r11_login.json` / `tmp_r11_guest.json` | 两份 `exp=2026-09-22T14:42:04Z ahead=-182200s` | 1 |
| D13 `captureCapabilityGate` | `round-2/screenshot-manifest.json` + `round-2/{findings,code-findings}` | `SHOTS=254 DECLARED_TOTAL=254 MEASURED=[378x814] DECLARED_KEYS=[378x814] ZOOM=345 CLAIM_ADDS_DETAIL=0 FINDINGS_SCANNED=473 OVER_CEILING_NO_ZOOM=43 LIMIT_MISSING=0` | 1（43 条字级结论无放大帧证据却 conf>0.35，样例 `MP-R2VIS-PAGES-LOGIN-INDEX-002 conf=0.7`） |
| D12 `identityFeasibilityGate` | `exec-results.json` + `round-2/screenshot-manifest.json` | `MISMATCH_REPORTED=366 FRAMES_A=134 FRAMES_B=120 MATRIX_DECLARED=false` | 1 |
| D8 参数表幽灵键段 | `scripts/r11-param-map.json` + `apps/client/src` + `apps/client/dist/build/mp-weixin` | `routes=13 ghost=0`；对 `matching` 页单测 `target:false / dev-preview:true` | 0（历史值 `?target=10003` 会被判 ghost） |
| D1 硬编码 SHA 检测段 | `tmp/tour-R2.mjs` + 6 条样例行 | 样例行 5 命中 1 放过；真文件 `HITS=0`（注释行被正确跳过） | — |
| D3 接线可行性 | `scripts/verify-evidence-integrity.mjs` | 工具已在仓内（135 行，含 `--exec` 模式），但 v32 `grep` 引用数 = 0 | — |

（**未跑清单**：D1 的 `git rev-parse` + manifest 比对段（本任务禁 git 写，连只读 git 也留给主代理第一次跑轮时做）、D4 `stateQuotaGate`、D7 `ledgerAudit`（纯内存函数，无需盘上验证）与 `ledgerCoverageGate`、D14 `permissionConfirmGate`、D16 `artifactFreshGate`、D17 `channelHealthGate`。这几段依赖的**字段形态**我都已用 `node -e` 读盘逐个核对过（见各节"符号自证"的最后一段，例如 `stateNotApplied[]`=37、`permSuppressedUnconfirmed`=254/254、`reconnects`=0×21、产物 `app.json`/`config/env.js`/`target/classes` 均在盘上），所以第一次真跑的退出码应当在预期内，但**我没有替它们背书**。
**本稿全程零写入**：除本文件外没有创建/修改任何文件，未跑 git 写操作、未构建、未启动开发者工具、未触碰数据库。）
