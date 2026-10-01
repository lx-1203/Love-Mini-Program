# 车道报告骨架完成度门 · L20（round-7）

交付：新门 `scripts/qa/verify-lane-report-complete.mjs`、离线负例 `scripts/qa/test-lane-report-complete.cjs`、
具名收件清单 `reports/audit/round-7/lane-report-intake-round-7.json`、声明式豁免 sidecar
`reports/audit/round-7/lane-report-exemptions-round-7.json`（当前**空清单**，一条都没有）。
本报告按本门的体例写：**每个小节的读数是实测后立刻回填的，不留骨架占位。**

---

## 0. 读数前提（先说口径，再说数）

| 轴 | 口径 | 取值 |
|---|---|---|
| 取数时刻 | 本机 `date` 带时区 | 2026-09-30 12:29:54 +0800（dry 读数）；12:43:03 +0800（DSL 复核） |
| HEAD | 引用的行号都锚在这个提交 | `da996f3a` |
| Node | 一律 Node22 | `D:/codex-tools/node-v22.17.0-win-x64/node.exe` v22.17.0（PATH 上是 v16.13.1，本门没用 `import.meta.dirname`，但按纪律仍全量 Node22） |
| 在途车道 | 并发隔离清单 | L16 / L17 / L18 / L19 全在途；**本车道一份它们的字节都没读**（只量 mtime 判死活：`corpus-blindspot-r16.md` 12:49:27、`leg-writeguard-r17.md` 12:49:20、`wiring-gate-r18.md` 12:52:05，都在本次写作期间被改写过；§6 的 dry 读数用 `--skip-entry` 把这三份从扫描集里剔掉，不是"看了再说绿"） |
| 缺陷账 | 本报告**不是**收工账 | 收工账由编排方在全部车道落地后复量（同 `run-final-verify-v33.sh` 头注「只在所有车道收工之后跑这一次」的体例） |

**取数时刻实测到的一条重要变化**：12:16 时 `.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts` 与
`scripts/qa/run-final-verify-v33.sh` 的工作树字节 == HEAD 字节（`git diff --numstat` 空输出）；
到 12:43 复测，工作树 DSL 已是 **709 行 / 59,736 字节**（HEAD 是 690 行 / 57,300 字节）、
bash 已是 **100 行 / 6,701 字节**（HEAD 是 92 行 / 5,821 字节）⇒ **L18 在 12:35–12:36 动了这两个文件**。
我没有读它们的当前内容，只比了字节数。结论：§1 的行号一律是 **HEAD `da996f3a` 口径**，
若 L18 的 19 行增量插在 415 之前，工作树里的行号会整体后移 ⇒ 落 prompt 时**按文本锚定位，别按行号**（锚见 §9）。

---

## 1. 缺口证据：主控给的引用逐字复核（结论：三条全对，一处口径要补）

全部用 `git show HEAD:<path>` 取 committed blob 核对，不读在途字节。

### 1.1 DSL 三条 —— 逐字对照

| 派单给的引用 | 复核结果 | HEAD 现取原文（截断到 150 字） |
|---|---|---|
| `:447`「交互腿执行员」的 prompt 里有一条硬要求 | **对** | `const res = await agent("交互腿执行员", "你独占驱动微信开发者工具自动化（单写者）…` |
| `:455` 增量落盘那句 | **对，逐字一致** | `` `增量落盘是硬要求：车道 agent 有轮次上限（实测 150 轮会被截断），所以先把 result 骨架写盘，之后每完成一行立刻更新落盘；行数多时按每批不超过 15 行分块，绝不允许攒到最后一次写。`, `` |
| `:415` / `:417-421`「收口车道-${area}」的 prompt 完全没有这条 | **对** | `:415` = ``const fixer = await agent(`收口车道-${area}`, …``；`:417-421` 是 ask 的四个实参 + `].join("\n"),`；`:420` 正是「返回 fixedIds / filesChanged / skipped / evidence / notes」那一条 |
| `:422` askFail 的 skipped 文案 | **对** | `).then((v) => v, (e) => askFail<LaneOut>(`收口车道-${area}`, e, { … skipped: items.map(i => ({ id: i.id, rea…`（行内文案为「车道调用失败，未处理」） |

**补一条比派单更硬的实测**：全文 grep「增量落盘」在 HEAD 版 DSL 里**只出现在 `:455` 一处**
（实测输出 `全文「增量落盘」出现的行号 = 455`）。也就是说"撞轮次上限就留半截件"这条防线
在整个工作流里只写在交互腿那一条腿上，收口车道与复验员两条腿都没有。这不是"分布上的疏忽"，
是**单点覆盖**：`prove` 的强度等于 `:447` 那条腿的强度。

### 1.2 L14 的观察 —— 逐字对照

| 派单给的引用 | 复核结果 | 原文 |
|---|---|---|
| `uncovered10-disposition-r14.md:32` | **对** | `是新落未跟踪件，而 L13 自己那份报告**通篇还是 `<!-- TODO -->` 骨架** ⇒ F-04 尚未收口。` |
| `:175` | **对** | `**L13 目前未收口**：`deny-tap-f04-r13.md` 全文还是 TODO 骨架，两个执行器 modified-uncommitted ⇒ 本车道把它记成条件式而不是现在式。` |

同一文件还有 `:432` 第三处（`它的 `deny-tap-f04-r13.md` 还全是 TODO`），是同一件事的第三次记账，
派单没提，一并记下。**旁证（非盘上证据，标注为推断）**：本轮同族事故的第 4 次形状是
r16/r17 此刻仍是骨架——这两份由 L16/L17 在写，本车道不取字节，只按派单转述记账，
收工账须由编排方复量（§6 已把它们从扫描集剔除）。

### 1.3 「没有任何门看这些骨架报告」—— 实测确认

取 HEAD 版两个门清单逐条列名（不是"我觉得没有"）：

- `scripts/qa/run-final-verify-v33.sh`（HEAD 92 行）里的 `g` 条目：`verify-ledger`、`verify-state-truth`、
  `verify-queue-reconcile`、`verify-real-coverage`、`verify-source-shape`、`verify-evidence-corpus`、
  `verify-provenance-all`、`verify-band-freshness`、`verify-backend-fresh`、`verify-evidence-holes`、
  `verify-dry-no-lease`、`verify-case-automatable`、`verify-ops-stamp`、`run-qa-selftests`、
  `emit-round-report`、`verify-ledger-after-panel`、`verify-state-truth-after-panel`。
- DSL 的 `GATE_SUITE`（HEAD `:62` 起）+ `PANEL_SUITE`（HEAD `:159` 起）：与上面同集，另加
  `prove-gates-can-fail`（`:544`）、`gen-round8-report`（`:627`）、`dryrun-workflow`。

⇒ **一份都不检查报告正文完整性**。`emit-round-report` 读的是 sidecar（`--sidecar-dir`），
`gen-round8-report` 是"总报告读数回填"，两者都不看 `reports/audit/round-7/*.md` 的小节有没有填。
所以「车道报告还是空骨架」与「本轮已收口」在门这一侧**可以同时成立**，形状就是本仓反复在治的
"建了没人跑 / 绿不自证"，只是这次长在文档侧。

---

## 2. 收件范围为什么必须具名（实测清单，不是哲学）

拿 round-7 目录当分母扫一遍（`tmp` 探针，已删；**排除** r16/r17 两份在途件）：

- `md总数=52`，`已读=50`，`跳过在途=2`
- 含任一「待填 / 待补 / TODO」字样的 md 数 = `5`
- 含骨架占位（口径：全角括号 + 待填二字连写，即本门的判据字面量 `（待填`）的 md 数 = `0`
  ← 这一条是关键读数：50 份**非在途**件里骨架占位一处都没有，噪音全来自"待补/TODO"那 5 份

那 5 份的逐字原文（这就是"扫目录会造出噪音红"的一手证据）：

| 文件:行 | 原文（截断） | 为什么它不是缺陷 |
|---|---|---|
| `decisions-v33.md:563` | `**待补（现在是状态，不是遗漏）**：L16（证据语料分母读数，此刻正在改 `verify-evidence-corpus.mjs`，` | 本册合法记账体例；同文件 `:498` 还写着「车道自报但未复验的一律写在"待补"里，不当已入账」 |
| `decisions-v33.md:498` | 同上 | 定义"待补"是**有意的状态** |
| `ui-frame-debt-classes.md:35` | `…长期：TODO(backend) 落地会话未读元数据同步…` | 台账行的长期处置文案，MP-R2-PAGES-MESSAGES-INDEX-020 这条的处置本来就在后端 |
| `followups-v33.md:363` | `…记 `需环境` 并首次给它登记了去向…` | 表体里"待补"是被**引用**的旧口径，行本身已闭 |
| `round7-NOTES.md` | 「待补」11 处（`:3672`、`:3673`、`:3814`、`:3876`、`:3893`、`:3895`、`:3899`、`:3901`、`:1217`、`:3840`、`:3955`） | 全是普查口径：`含交互动词 = 点名 + 待补 + 已盖章不可自动化`（实测守恒 `738 = 515 + 223 + 0`）。把"待补"当违例等于砸自己的账本 |
| `uncovered10-disposition-r14.md:32/:175/:432` | 三处 `<!-- TODO -->` / "TODO 骨架" | 散文里**引用**别的车道的骨架形状；扫目录的门会把"记录别人的缺陷"当成"自己的缺陷" |

计数汇总：`decisions-v33.md` 待补=2、`followups-v33.md` 待补=1、`round7-NOTES.md` 待补=11/TODO=1、
`ui-frame-debt-classes.md` TODO=1、`uncovered10-disposition-r14.md` TODO=3（其中 `<!-- TODO -->`=1）。
⇒ 若默认扫 `reports/audit/round-7/**`，一发就会造出 **5 份文件 / 18 处**噪音红，
涉及本册两册记账体例 + 一份长期台账。**结局一定是被人整体关掉**——这是这道门的死法，所以门不吃目录，只吃具名清单。

另外两条实测事实支撑"具名"：
1. 12:22 时 `*-r<编号>.md` 形态的车道报告有 **22 份**，12:53 复量已是 **24 份**
   （新增 `lane-report-complete-r20.md`=本车道自己、`wiring-gate-r18.md`=L18 在 12:52:05 首次落盘）。
   其中 `ca-fp-rate-r5.md`、`final-verify-r7.md`、`final-verify-r8.md`、`inflight-manifests-triage-r7.md`
   是历史轮次（已收过账），本轮（L9–L20）该收的是 **20 份** ⇒ 我按"本轮收口轮的车道"逐条具名登记。
   **这份数本身就是"具名 vs 扫目录"的差别**：写作期间目录长了 2 份，门的收件集只按我批准的条目走（`LANEREPORT_INTAKE=20`），
   不会把历史件、别人的目录件、或刚掉下来的半截件自动算进分母。
2. 实测 `reports/audit/**` 下**没有** `-r11` / `-r15` / `-r19` 形态的 md（在四个 audit 目录里搜过）。
   r19 符合预期（车道在途）；**r11/r15 缺失的成因本车道未查，只记形状不推断**——
   这一条正是"缺件"判据存在的理由：清单登记了而盘上没有，比有骨架更糟（骨架至少证明车道开过工）。

---

## 3. 门的设计（判据、豁免、机器行字段）

### 3.1 占位符判据与正则

默认判据只有一条字面量 `（待填`（本仓实际写法：全角括号 + 待填），编译成这条全局正则：
`/（待填\s*(?:[：:][^）\n]{0,200}[）])?[）]?/g`
（写成行内代码而不是围栏，是为了让本门扫自己这份报告时把它当**引用**而不是骨架——见 §10 第 5 条；
围栏里的占位仍然判红，§3.1 表格第 11 行钉着这条。）

`--selftest` 把边界钉成 11 条不读磁盘的断言（实测 `LR_SELFTEST=PASS cases=11 bad=0`）：

| 断言 | 判红命中 | 引用命中 |
|---|---|---|
| `（待填）` | 1 | 0 |
| `（待填：等 L16 复量）` | 1（带说明整体吃掉，只算一处） | 0 |
| `（待填）和（待填）` | 2 | 0 |
| `**待补（现在是状态，不是遗漏）**` | 0 | 0 |
| `TODO(backend)` | 0 | 0 |
| 半角 `(待填)` | 0 | 0（本仓实测全角；要收它得在收件条目里 `patterns` 追加） |
| `本节等待 L13 收口后回填。` | 0 | 0（含"待"字的正常句子不命中：判据要求左邻是全角括号） |
| `（进行中）（已盖章）（需环境）` | 0 | 0 |
| 散文里引用这个形状：L13 那份报告通篇是 `（待填）` 骨架 | **0** | **1**（反引号包起来＝引用，照数不判红） |
| 同行既有引用又有真骨架 | 1 | 1 |
| 围栏代码块（三个反引号那种）里单独一行的 `（待填）` | 1 | 0（围栏不算引用，那是真没填） |

误报边界如实写死：① 状态词（待补/TODO/进行中/FIXME）一律不判；② 半角不判；
③ 反引号里的引用只进 `*_HITS_QUOTED` 读数（本报告的 §1.2 就用了这条，否则本门会把自己的报告判红）；
④ 围栏不豁免。**要加新的判据形状走 `patterns` 或 sidecar，不改默认正则。**

### 3.2 小节口径

`^#{2,6} ` 标题行到**下一个任意级标题行**之间的正文算一个小节（父节只拿自己的引言，
`### 2.1` 独立计），所以「未填小节总数」不会父子双计。另开一行
`LANEREPORT_EMPTY_SECTIONS`（标题下正文为空）——**只报数不判红**：真实表格里"标题+表格"是合法形状，
本轮 dry 实测 16 份里有 10 个空正文小节，判红就是第 2 节说的噪音红死法。

### 3.3 声明式豁免（sidecar）

`reports/audit/round-7/lane-report-exemptions-round-7.json`，四条硬规则写死在门里：

1. 每条必须同时有 `file` / `section` / `reason` / `declaredBy`，缺任一条 ⇒ 判红（`LANEREPORT_EXEMPT_BAD`）。
2. **只按小节名放行，门不支持整份文件放行**（防"这一份本轮不看"式整体关掉）。
3. 指向已填完或不存在小节的旧放行 ⇒ 判红（`LANEREPORT_EXEMPT_STALE`）：收紧门必须撤回旧放行＋逐档有账。
4. 挡掉红项后如实印 `LANEREPORT_EXEMPT_SWEEP=YES(本发的绿全部来自豁免放行，非无人填)`；
   收工账可加 `--require-zero-exempt` 把"靠豁免才绿"直接判红。

当前 sidecar 是 **`"exemptions": []`（0 条）**，没有把今天任何已知红项写进去；
样例形状只写在文件自己的 `_comment` 里（JSON 合法，实测可 parse）。

### 3.4 机器行字段（每个数都带口径标注）

`LANEREPORT_INTAKE` / `SKIPPED_ENTRIES` / `SCANNED` / `MISSING` / `SKELETON_FILES` /
`SKELETON_SECTIONS` / `PLACEHOLDER_HITS` / `PLACEHOLDER_HITS_RAW` / `PLACEHOLDER_HITS_QUOTED` /
`EMPTY_SECTIONS` / `EXEMPT_DECLARED` / `EXEMPT_APPLIED` / `EXEMPT_STALE` / `EXEMPT_BAD` /
`MODE` / `POLARITY_NOTE` / `FILE <名> 未填骨架小节=…`（逐档一行）/ `ADVISORY …`（逐条放行一行）/
`EXEMPT_SWEEP` / `PROBLEMS` / `PROBLEM <文件> :: 小节「…」(行 N) :: 未填骨架 K 处 :: 例：…` /
`LANEREPORT_RESULT=<PASS|FAIL|ADVISORY> 退出码=N 口径=…`。
退出码：`0` 绿 / `1` 红 / `2` 不可测（清单读不到、JSON 坏、空清单、条目缺 `file`、重复条目）。
**空清单退 2 不退 0**（先例：`run-qa-selftests.mjs:29`「扫描集为空一律 exit 2」、
`verify-case-automatable.mjs:228`「一个 manifest 都没有（不得空过）」）。

---

## 4. 极性决定与理由（显式选定，已印进机器行）

**默认极性 = STRICT（判红）**，`LANEREPORT_MODE=STRICT 口径=判决极性轴：默认判红（收件清单由人具名，
每一份都是本轮明确要说填完的）`。要只报数用 `--advisory`。

为什么不照抄先例 `scripts/qa/verify-case-automatable.mjs` 的默认 ADVISORY：该门 `:325` 写的是
「默认只报数不判红（exit 0），要拿它当门禁必须显式 --strict」，`:331` 给的理由是
「这不是"未量"了，是量大到极性该由人拍板 —— 所以默认仍然 ADVISORY，判红权仍在 --strict」。
**那条理由是量级驱动，本门不成立**：本门的红集合由人**逐条具名**的清单界定（"这一份是本轮车道报告、必须填完"），
没有量级争议；而且噪音风险已经被 §2 的具名收件 + §3.1 的精确判据 + §3.3 的逐条放行三道收住了。
反过来说，本事故的成因恰恰是**没有任何判决发生**（advisory-only 的极限就是没有门），
所以默认必须判红，否则这道门只是把"没人看"换成"有人看但没人判"。
两轴划分保留先例结构：**轴1 极性**（STRICT/ADVISORY，旗标 `--advisory`）、
**轴2 放行强度**（默认放行有效但如实标 SWEEP，旗标 `--require-zero-exempt` 收到最紧）。

---

## 5. 判据的双向证明（全部自造夹具，在 `D:/6/恋爱小程序/tmp/` 下跑，跑完即删）

夹具四份 + 一份"没收进清单"的骨架件，均在 `tmp/l20-demo/`（已删）与测试自建 `tmp/l20-selftest-*/`（已删）。
**没有拿在途件试**（派单纪律 + 本仓实测教训「并发写盘时的目录清点会把半截文件读成缺陷」）。

### 5.1 阳性对照：骨架未填 ⇒ 必须红并指名

夹具：7 个小节全留占位，其中一节两处。命令 `--intake <骨架清单>`（默认 STRICT）。

```
LANEREPORT_INTAKE=1 口径=具名收件清单条目数（来源 D:\6\恋爱小程序\tmp\l20-demo\intake-skel.json，不是扫目录）
LANEREPORT_SCANNED=1 / LANEREPORT_MISSING=0
LANEREPORT_SKELETON_FILES=1 / LANEREPORT_SKELETON_SECTIONS=2 / LANEREPORT_PLACEHOLDER_HITS=3
LANEREPORT_MODE=STRICT 口径=判决极性轴：默认判红（…）
LANEREPORT_FILE skeleton.md 未填骨架小节=2 占位命中=3 豁免小节=0 空正文小节=0
LANEREPORT_PROBLEMS=2
PROBLEM skeleton.md :: 小节「0. 缺口证据」(行 4) :: 未填骨架 1 处 :: 例：<骨架占位原文>
PROBLEM skeleton.md :: 小节「1. 双向负例」(行 7) :: 未填骨架 2 处 :: 例：<两处>
LANEREPORT_RESULT=FAIL 退出码=1 口径=本发判决（红项见上 PROBLEMS=2）
EXIT=1
```
（PROBLEM 行的"例"字段是占位原文，本文件按 §3.1 第 3 条用反引号包住才不触发本门自判；夹具里是真骨架。）

### 5.2 阴性对照：填完 ⇒ 必须绿

夹具塞满状态词（`**待补（现在是状态，不是遗漏）**`、`TODO(backend)`、`等待 L13`、半角 `(待填)`）+ 一处反引号引用。

```
LANEREPORT_SKELETON_FILES=0 / SKELETON_SECTIONS=0 / PLACEHOLDER_HITS=0 / PLACEHOLDER_HITS_QUOTED=1
LANEREPORT_RESULT=PASS 退出码=0 口径=本发判决（红项见上 PROBLEMS=0）
EXIT=0
```

### 5.3 第三对照：声明为状态 ⇒ 走 advisory 不进 PROBLEMS

默认判红极性下，这一发**仍然退 0**，但放行痕迹全留在盘上：

```
LANEREPORT_PLACEHOLDER_HITS=0 / LANEREPORT_PLACEHOLDER_HITS_RAW=1（两行相减=被声明为状态的次数）
LANEREPORT_EXEMPT_DECLARED=1 / EXEMPT_APPLIED=1（占位 1 处）/ EXEMPT_STALE=0 / EXEMPT_BAD=0
LANEREPORT_FILE declared.md 未填骨架小节=0 占位命中=0 豁免小节=1(占位 1) 空正文小节=0
ADVISORY declared.md :: 小节「0. 长期欠账」(行 4) :: 骨架占位 1 处 已声明为状态（L20 夹具）理由=按派单只登记去向
LANEREPORT_EXEMPT_SWEEP=YES(本发的绿全部来自豁免放行，非无人填)
LANEREPORT_RESULT=PASS 退出码=0
EXIT=0
```
另加两条负例（在 `.cjs` 测试里）：缺 `reason` 的放行 ⇒ 红（`EXEMPT_BAD=1`）；
指向不存在小节的旧放行 ⇒ 红（`EXEMPT_STALE=1`）。

### 5.4 变异证明：临时放宽判定 ⇒ 测试红；改回 ⇒ PASS

变异体 = 门的源码把 `const DEFAULT_PATTERNS = ["（待填"];` 换成 `["待"];`，写在 `tmp/l20-demo/mutant-relaxed.mjs`。

```
变异体跑阴性对照夹具：LANEREPORT_SKELETON_FILES=1 / SKELETON_SECTIONS=1 / PLACEHOLDER_HITS=2
  PROBLEM filled.md :: 小节「0. 读数」(行 4) :: 未填骨架 2 处 :: 例：**待补（现在是状态，不是遗漏）**；TODO(backend) 长期处置；等待 L13。
  LANEREPORT_RESULT=FAIL 退出码=1   EXIT=1        ← 放宽判定后，本不该红的样本被算成红（判据有牙齿）
删掉变异体重跑原门：                                EXIT=0        ← 改回即 PASS
```
**残留自证（收尾实测）**：夹具目录 `tmp/l20-demo/`（含变异体 `mutant-relaxed.mjs`）、测试自建的
每个 `tmp/l20-selftest-*/`、以及本车道全部 17 个 `l20*` 临时探针（含隔离聚合器副本 `tmp/l20-agg/`）
收尾时逐一 `rmSync` 后列目录复量：`删除前 tmp 下 l20 前缀件数=17` ⇒ `删除后=0 列表=（空）`，
`mutant=false`（目录不存在）、`selftest残留=0`。测试里的 `J3`/`K1` 两条断言把同一件事钉成机器行：
`LR20 OK J3 变异体已删除（不在盘上）`、`LR20 OK K1 夹具目录已清理，tmp 下无 l20-selftest-* 残留 残留=无`。
仓根没有新文件（我拥有的只有那 5 个具名件，`git status --porcelain` 全部是 `??` 未跟踪新件）。

### 5.5 离线负例总账（`scripts/qa/test-lane-report-complete.cjs`）

```
LRPT_SUMMARY cases=34 fail=0
SUMMARY: assertion failures = 0
LRPT_TEST=PASS
LR20_TEST=PASS
直跑退出码=0（实测 4 次：31,588ms / 30,107ms / 38,210ms / 定稿前最后一发 26,155ms，
Node22 启 13 次子进程的开销随并发负载波动；聚合器单测上限 300s，余量充足）
```
覆盖：A1-A6 阳性、B1-B5 阴性、B2a-B2b 引用与围栏、C1-C5 放行、D1 缺件、E1 空清单退 2、
F1 放行不合法、G1 失效放行、H1-H2 极性轴、I1-I4 具名收件与 `--skip-entry`、J0-J3 变异证明、K1-K2 残留自证。
（`--selftest` 那 11 条判据边界不在这个文件里，是门的自带轴，接线建议见 §8 第③件。）

---

## 6. 真实 round-7 目录 dry 读数（**只报数不判红；这份数不是收工账**）

⚠ **取数时刻 2026-09-30 12:29:54 +0800，L16/L17 车道正在写自己的报告，L18/L19 的报告还没落盘**。
本发用 `--advisory`（不判红）+ `--skip-entry` 显式剔除 `corpus-blindspot-r16.md`、`leg-writeguard-r17.md`
与 `lane-report-complete-r20.md`（本车道自己，写它的时候不该自数），**这三份的字节一个都没读**。
命令原文（实测 3 次 1,246ms / 1,398ms / 1,535ms，退出码 0）：

```
node scripts/qa/verify-lane-report-complete.mjs \
  --intake reports/audit/round-7/lane-report-intake-round-7.json \
  --exemptions reports/audit/round-7/lane-report-exemptions-round-7.json \
  --advisory --skip-entry corpus-blindspot-r16.md --skip-entry leg-writeguard-r17.md --skip-entry lane-report-complete-r20.md
```

机器行（关键行逐字）：

```
SKIPENTRY corpus-blindspot-r16.md 口径=显式跳过（并发在途车道，本发不取它的字节；收工账必须去掉这个旗标）
SKIPENTRY leg-writeguard-r17.md 口径=显式跳过（…）
SKIPENTRY lane-report-complete-r20.md 口径=显式跳过（…）
LANEREPORT_INTAKE=19 口径=具名收件清单条目数（来源 reports/audit/round-7/lane-report-intake-round-7.json，不是扫目录）
LANEREPORT_SKIPPED_ENTRIES=3 口径=--skip-entry 跳过的份数（并发在途；这份数不是收工账）
LANEREPORT_SCANNED=16 口径=实际读到字节的份数
LANEREPORT_MISSING=0
LANEREPORT_SKELETON_FILES=0 口径=仍有未填骨架小节（或缺件）的份数，豁免已扣除
LANEREPORT_SKELETON_SECTIONS=0 口径=未填骨架小节总数（一节多处占位只计 1 节；豁免已扣除）
LANEREPORT_PLACEHOLDER_HITS=0 / LANEREPORT_PLACEHOLDER_HITS_RAW=0 / LANEREPORT_PLACEHOLDER_HITS_QUOTED=0
LANEREPORT_EMPTY_SECTIONS=10 口径=标题下正文为空的小节数；只报数不判红
LANEREPORT_EXEMPT_DECLARED=0 / EXEMPT_APPLIED=0 / EXEMPT_STALE=0 / EXEMPT_BAD=0
LANEREPORT_MODE=ADVISORY 口径=判决极性轴：--advisory 只报数，判红权交编排方
LANEREPORT_EXEMPT_SWEEP=NO
LANEREPORT_PROBLEMS=0 口径=判红项总数（未填小节+缺件+失效放行+放行不合法）
LANEREPORT_RESULT=PASS 退出码=0 口径=本发判决（红项见上 PROBLEMS=0）
```

逐档 16 行全为 `未填骨架小节=0`（`build-determinism-r9` 到 `uncovered10-disposition-r14`），
其中 `空正文小节` 非零的 6 份：`build-determinism-r9.md`=1、`ruling-packet-r9.md`=3、
`b7-switch-inventory-r10.md`=2、`b7-classes-verify-r10a.md`=1、`token-conflicts-r10e.md`=1、
`build-determinism-accept-r12.md`=1、`uncovered10-disposition-r14.md`=1（合计 10，与 `EMPTY_SECTIONS=10` 守恒）。
⇒ **已收工的 16 份本轮车道报告里，骨架占位一处都没有**（口径：只认 `（待填` 家族，状态词不算）。
`deny-tap-f04-r13.md`（当年"通篇 TODO 骨架"的当事件）现在 0 处 —— L13 后来补完了，
这条正是"事故真发生过、只是没人判"的证据，也是本门该存在的理由。

**这份数不是收工账**：r16/r17 未取、r18/r19 未落盘（清单里也没有它们的条目，需编排方追加）。
收工账的正确跑法：去掉三个 `--skip-entry`、补上 r18/r19 条目、**去掉 `--advisory`**（默认判红），
必要时加 `--require-zero-exempt`。

### 6.1 收尾复量（本报告定稿后再跑一发，同一张清单）

时刻见本节末行。这次把本车道报告也收进来（去掉那一条 `--skip-entry`），所以 `SCANNED` 从 16 变 17：

```
LANEREPORT_INTAKE=19 / LANEREPORT_SKIPPED_ENTRIES=2 / LANEREPORT_SCANNED=17
LANEREPORT_SKELETON_FILES=0 / LANEREPORT_SKELETON_SECTIONS=0 / LANEREPORT_PLACEHOLDER_HITS=0
LANEREPORT_PLACEHOLDER_HITS_QUOTED=12 / LANEREPORT_EMPTY_SECTIONS=11
LANEREPORT_EXEMPT_DECLARED=0 / LANEREPORT_EXEMPT_APPLIED=0
LANEREPORT_PROBLEMS=0 / LANEREPORT_RESULT=PASS 退出码=0
```
两发都跑（advisory 一发 + 默认 STRICT 一发），STRICT 那发同样 `exit=0`，实测 2,934ms / 3,325ms。
取数时刻：2026-09-30 12:48 +0800 前后（收尾这条 `date` 实测 12:49:43 +0800），
L16/L17/L18/L19 仍在途 ⇒ **本车道报告的"收工"由编排方复量确认，不是本车道自证**。

### 6.2 定稿后最后一发（收件清单在写作期间长到 20 条）

12:52:05 `wiring-gate-r18.md` 首次落盘（我只量到 mtime，**没读它的内容**），已按清单自己的收录规则补进去，
并把它的 `--skip-entry` 加上。这一发是**交付前最新的读数**：

```
LANEREPORT_INTAKE=20 口径=具名收件清单条目数（不是扫目录）
LANEREPORT_SKIPPED_ENTRIES=3 口径=r16 / r17 / r18 三份在途，本发一个字节都没取
LANEREPORT_SCANNED=17
LANEREPORT_SKELETON_FILES=0 / LANEREPORT_SKELETON_SECTIONS=0 / LANEREPORT_PLACEHOLDER_HITS=0
LANEREPORT_PLACEHOLDER_HITS_QUOTED=12 / LANEREPORT_EMPTY_SECTIONS=11
LANEREPORT_PROBLEMS=0
LANEREPORT_RESULT=PASS 退出码=0        （advisory 与默认 STRICT 各跑一发，都是 0；2,372ms / 3,472ms）
```
取数时刻 2026-09-30 12:53:02 +0800。清单里 `inFlight` 标记 3 条，`exemptions` 仍是 **0 条**。

---

## 7. 接线：负例进聚合器的 before/after

收件规则实测取数（**同口径、同一刻**，用聚合器 `run-qa-selftests.mjs:25` 的原正则
`/^test-.+\.(cjs|mjs)$/` 对 `scripts/qa/` 目录列一遍）：

```
发现_before（同刻减去本车道新增件）=38
发现_after                          =39
本件在收件集里=true（test-lane-report-complete.cjs）
差值 = +1 ✓
```

**实跑聚合器：没有跑全量。直说没做成，理由如下**：全量聚合器会把 L16–L19 的在途测试一起 spawn，
其中 `test-guest-landing.mjs` / `test-guest-landing-writeguard.mjs` 是 L17 的件且不在聚合器的
`UI_BOUND` 跳过名单里（那份名单只有 `test-stop-flag.cjs`），跑它们会去碰 9420 单写者。
替代做法（**同一份聚合器代码，隔离收件集**）：把 `run-qa-selftests.mjs` + 我的门 + 我的测试
拷到 `tmp/l20-agg/scripts/qa/`（用后已删），让真实聚合器代码只收我这一个测试：

```
SELFTEST_DIR=qa/test-*  发现=1  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe
PASS  test-lane-report-complete.cjs  exit=0  断言失败数=0  LRPT_TEST=PASS  45s
SELFTEST_RAN=1 SKIPPED=0 FAILED=0 NO_SUMMARY_LINE=0 覆盖文件=1/1
```
⇒ 聚合器的收件规则、`assertion failures = (\d+)` 解析、`*_TEST=` 判据行解析三条**都真的吃到了我的件**
（`断言失败数=0`、`LRPT_TEST=PASS` 两行是聚合器自己印的，不是我转述）。
注意：那次隔离运行的 45s 与直跑的 30–38s 都远低于聚合器单测 300s 上限，无需为它加预算。

**并发取数的漂移实测到了**（正是派单提醒的那件事）：12:54:51 复量同一把规则，
`发现=42`，比 12:2x 的 39 多了三条——`test-carrier-wiring.cjs`、`test-corpus-denominator.cjs`、
`test-real-coverage-disposition.cjs`，是 L18/L16/L19 在这半小时里各自落地的负例。
⇒ `发现=` 的**绝对值随并发车道动**，本车道的贡献只能按"同刻同口径差值"报（+1），
差值本身不受影响；编排方收工后实跑一次拿到的会是 42 或更多，那不是我的数掉了，是别人的数上来了。
另外那两行 `FAIL verify-dry-no-lease/verify-case-automatable --selftest` 是**隔离副本的假红**
（副本根目录下没有这两个模块，报错原文 `Cannot find module '…tmp\l20-agg\scripts\qa\…'`），
不代表全仓状态；全仓 `GATE_SELFTESTS_*` 的真实读数请编排方收工后实跑一次取。
顺带一个接线坑（已改）：判据行前缀**不能带数字**——聚合器用的是
`/\b([A-Z]{2,8})_(?:TEST|RESULT)=(PASS|FAIL)\b/`，字母-only，所以 `LR20_TEST=` 它抓不到
（第一次隔离跑印的是「无 *_TEST= 判据行」），故本测试同时印纯字母 `LRPT_TEST=`。

---

## 8. 给编排方的接线三件套（我不动 `run-final-verify-v33.sh` 与 DSL，L18 在改）

**① bash 终验（`scripts/qa/run-final-verify-v33.sh`，`g` 的第二参是 `timeout` 的秒）**

```bash
g verify-lane-report-complete 60 scripts/qa/verify-lane-report-complete.mjs --intake reports/audit/round-7/lane-report-intake-round-7.json --exemptions reports/audit/round-7/lane-report-exemptions-round-7.json
```
- 门名：`verify-lane-report-complete`（`$OUT/<name>.log`、`$OUT/<name>.exit`）
- 实参：见上，收工账**不要**带 `--skip-entry`、不要带 `--advisory`；最紧可加 `--require-zero-exempt`
- 秒数：**60**。实测单发 1.25–1.54s（16 份扫描 + 3 份剔除，Node22），60 是余量不是测量值；
  该门是"卡住就是配置坏了"的形状，给 180 会让一个 `exit=2` 拖 3 分钟
- 位置：插在 `g run-qa-selftests`（HEAD `:63`）之前，与其它"接线/文档侧完整性"门同段；
  它读的是车道报告，必须排在所有车道收工之后、`emit-round-report`（HEAD `:72`）之前
- 汇总行兼容性：`g` 的 `grep -oE '[A-Z_]+_RESULT=[^|]*'` 能抓到我的 `LANEREPORT_RESULT=…`（前缀纯字母，无数字）

**② DSL（`.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts` 的 `GATE_SUITE`，HEAD `:62` 起）**

```ts
  { name: "车道报告骨架完成度 verify-lane-report-complete", args: ["scripts/qa/verify-lane-report-complete.mjs", "--intake", "reports/audit/round-7/lane-report-intake-round-7.json", "--exemptions", "reports/audit/round-7/lane-report-exemptions-round-7.json"], timeoutMs: 90000 },
```
- `name` 以 bash 门名结尾 ✓（`车道报告骨架完成度 verify-lane-report-complete`，照 `:63`-`:141` 的既有体例）
- `timeoutMs` 90000 ≥ bash 秒 60 × 1000 = 60000 ✓，且**只往大调**（同套件里 `:63`/`:64` 是 1:1 同值，取同值也合规；这里给 1.5× 是因为并发车道会把磁盘拖慢，实测我的门 1.5s vs 隔离副本里的子进程 45s）
- 位置：`{ name: "离线负例聚合 run-qa-selftests", … timeoutMs: 900000 }`（HEAD `:102`）之前
- 干跑预检可选：同 args 加 `"--advisory"`，或加 `"--skip-entry", "<在途件名>"` 逐条剔除在途车道

**③ 聚合器第三处接线（`scripts/qa/run-qa-selftests.mjs`，非 L18 所有，需编排方自己动）**
我的测试已经靠文件名自动收件（§7），但门自己的 `--selftest`（11 条判据边界）目前**零调用点**——
正是该文件 `:65-:71` 注释里批评过的"一条自检没有运行器 = 一条门没有消费者"。建议照 `:72-:78` 的
`GATE_SELFTESTS` 追加：

```js
  { name: "verify-lane-report-complete", cmd: ["scripts/qa/verify-lane-report-complete.mjs", "--selftest"], want: /LR_SELFTEST=PASS cases=(\d+) bad=0/ },
```

---

## 9. 下游要求（写进报告，不改 DSL）：给「收口车道」prompt 补增量落盘硬要求

派单要求：把 §1.1 的 `:455` 那句的精神补进「收口车道-${area}」的 ask 实参。**建议文案原文**
（供编排方直接粘，插到 HEAD `:420`「返回 fixedIds / …」那一行**之前**，作为独立一条模板字符串）：

```ts
        `增量落盘是硬要求：车道 agent 有轮次上限（实测 150 轮会被截断），所以开工第一件事就把车道报告骨架写盘（reports/audit/round-7/<主题>-r<编号>.md，小节标题按本轮派单给的骨架逐条列出），之后每收口一条缺口立刻 Edit 那一节的读数并落盘，报告里**绝不许留骨架占位**；一次不要写超过 15 行，绝不允许攒到最后一次写。收口账不是内存对象：只返回 fixedIds/filesChanged/skipped/evidence 而盘上没有对应读数，按未收口处置（scripts/qa/verify-lane-report-complete.mjs 会具名点这一份并判红）。`,
```

为什么不只加"记得写报告"六个字：本事故的形状是** ask 失败 ⇒ `:422` askFail ⇒ skipped 记
「车道调用失败，未处理」⇒ 工作流照常收口**，即"内存对象丢了就什么都没了"。补的这条同时做三件事：
① 落盘时机前置到开工第一步（骨架先落，中断也留下"哪些节没填"的现场）；② 逐条增量（一次 ≤15 行，
照 `:455` 的分块口径）；③ 把"盘上没有对应读数 = 未收口"与本门的判红连起来，
让 prompt 的约束有机器后手，不靠自觉。
**按文本锚定位，不要按行号**（工作树 DSL 在 12:36 已被 L18 改了 19 行，见 §0）：
锚 A = `const fixer = await agent(`收口车道-${area}``，锚 B = `返回 fixedIds / filesChanged` 那一行。
同理建议给 `:426`「收口复验员-${area}」也补一句"复验结论逐条回写同一份报告的复验小节"，
否则复验员的丢单仍然只有 askFail 一处痕迹。（此条是建议，本车道不动 DSL。）

---

## 10. 我没做成的 / 已知局限（不粉饰）

1. **没跑全量聚合器**：理由与替代证明见 §7。`发现=39` 这个绝对值是我按聚合器原正则同口径列目录所得，
   不是聚合器实跑印出的行；并发车道若在 `scripts/qa/` 留临时 `test-*` 变异件，绝对值会漂（+1 的差值不受影响，
   因为 before/after 取自同一刻、同一规则）。
2. **门只看收件清单点名的份**：清单是人维护的，**漏登记 = 门看不见**（`LANEREPORT_INTAKE=19` 就是这条风险的读数）。
   本车道把 22 份 `*-r*.md` 里 19 份的判定理由写进清单 `_comment`，但"该收哪几份"的最终权在编排方。
3. **判据不认半角 `(待填)`，也不认别的占位词**（待补/TODO/进行中）：这是 §3.1 的取舍，
   代价是——若某条车道换一种占位写法（例如 `【待回填】`），本门会**漏判**而不是误判。
   补法是给收件条目加 `patterns`，不改默认。
4. **"填完"不等于"填对"**：本门只证明骨架没留着，不证明读数正确——那是 `verify-ledger` /
   `verify-state-truth` / `prove-gates-can-fail` 的活。反过来说，本门也**不能**替代 §9 的 prompt 修复：
   门只能事后指出半截件，不能阻止车道把 150 轮的活攒到最后一次写。
5. **本门的判据咬到了自己的报告**（这是最有说服力的一发，实测两次）：
   第一版报告写完后自扫，`LANEREPORT_FILE lane-report-complete-r20.md 未填骨架小节=2 占位命中=3`
   —— 因为我引用占位形状时没包反引号，其中一条还是 §3.1 那条**正则本身**写在围栏里
   （`PROBLEM … :: 小节「3.1 占位符判据与正则」(行 120) … /（待填\s*…/g`）。
   按 §3.1 第 3 条改成行内代码后，收尾复量的读数见 §6.1（`SKELETON_SECTIONS=0`、
   `PLACEHOLDER_HITS_QUOTED=12`、`RESULT=PASS 退出码=0`；QUOTED 随本报告字数变，不作断言）。
   ⇒ 门不但不放过自己，也清楚区分"引用"与"没填"。把引用当缺陷的门会在第一次有人引用它的时候被关掉。
6. 未查 `deny-tap-f04-r13.md` 当年那份骨架到底补没补齐"每一个小节"（只量到当前占位=0 处）；
   `-r11`/`-r15` 报告缺失的成因未查，只记形状。
