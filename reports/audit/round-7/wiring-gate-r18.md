# L18 工作流改进门车道：载体接线门（零消费者导出件检测）

- 起跑：HEAD 见文末；全程 Node22 = `D:/codex-tools/node-v22.17.0-win-x64/node.exe`（PATH 上的 node 是 v16）
- 本车道只拥有并只改了这些文件：
  `scripts/qa/verify-carrier-wiring.mjs`（新门）、`scripts/qa/test-carrier-wiring.cjs`（新负例）、
  `scripts/qa/carrier-wiring-exemptions.json`（新豁免账）、`scripts/qa/run-final-verify-v33.sh`（+1 步）、
  `.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`（GATE_SUITE +1 条）、本报告
- 未动：任何既有门的判据/阈值/退出码语义、`decisions-v33.md`、台账、L16/L17 的文件与其产物

---

## 0. 这道门为什么非不可

这套流程反复踩的坑不是"某件东西没接线"，而是**「没有接线」这件事不会让任何东西变红**。
本轮四条同族事故，全部是实测撞出来的，不是推测出来的：

| # | 事故 | 证据命令（怎么自己复现） | 谁量的 |
|---|---|---|---|
| 1 | `verify-case-automatable.mjs` 的 `--results` 自证轴，此前三个调用点一个都没喂 ⇒「假阳性率未量」是结构必然 | `grep -rn -- "--results" scripts/qa/ .zcode/workflows/ scripts/qa/*.sh` 看点名自证轴的调用点；读数现已接线：FP 83.3% | 编排方交办（本车道未复量，见 §0a） |
| 2 | `run-qa-selftests.mjs`（离线负例聚合器）此前只存在于 bash 版终验脚本，DSL 不跑它 ⇒「工作流绿了」与「负例从没跑过」可同时成立 | `grep -n run-qa-selftests scripts/qa/run-final-verify-v33.sh .zcode/workflows/*.dwf.ts` 看两侧是否都有 | 编排方交办；现已补进 DSL GATE_SUITE（本车道起跑时已在） |
| 3 | `scripts/qa/measured-ledger.mjs`（128 行守卫模块）全仓零 import 消费者 | `grep -rn 'measured-ledger' scripts/qa/` 曾零命中 | 编排方交办（L17 产物，本车道不复量） |
| 4 | 某门文件头注释声称新增 `CORPUS_*_DENOM_*` 读数，而 `grep -n DENOM` 只命中那条注释本身 ⇒ **注释吹了、代码没做** | `grep -n DENOM scripts/qa/verify-evidence-corpus.mjs` | 编排方交办（L16 在改这个文件，本车道没读它） |

### 0a 为什么这四条证据我自己不重跑

#1/#4 的被测文件是 L16 的在途件，#3 的是 L17 的在途件。按本仓定规「并发写盘时的半截文件会被读成缺陷 ⇒
缺陷账只在全部车道收工后取一次数」，我照编排方交办的事实引用它们，并**明确标注这四条不是本车道复量的**。
本车道能自己负责的是下面这条同一形状的新证据。

### 0b 本车道自己量到的（改前基线，盘上实测）

新门第一次整跑就在本仓点出两个真死件（不是夹具、不是噪声）：

```
WIRING_DEAD_ITEM path=scripts/qa/emit-component-scoped-ids.mjs 导出=parseScoped 消费者=0
WIRING_DEAD_ITEM path=scripts/qa/run-round7-closeout.mjs 导出=reconcileQueueTally 消费者=0
```

复核（这两条是本车道亲验的）：

```
grep -rn "parseScoped"        scripts .zcode/workflows      → 只命中它自己文件内（:23 定义、:60 自测、:91 自用）
grep -rn "reconcileQueueTally" scripts .zcode/workflows     → 只命中它自己文件内（:98 定义、:535 自用）+ 注释
```

两个文件自己都在文件头写着这些导出"要交给谁吃"（前者：产物交给 `r-exec-ws.mjs --ids-file`；后者：
`reconcileQueueTally` 是「负对照 harness 的载体」）——**这就是 #4 那个形状：文档里有着落，盘上没有调用点。**
一道门如果不会因此变红，这种欠款就永远只是"某份报告里的一句话"。

---

## 1. 判域选择，以及放弃的更大判域

**采用的判域**（实测规模写在机器行里）：
`scripts/qa/**` + `apps/client/scripts/**` 两棵树里、盘上存在、并按文件自己的模块制度声明了导出的 `.mjs`/`.cjs`。
本轮实测：两棵树里盘上 `.mjs/.cjs` = **230** 个，其中声明导出的 = **23** 个（导出符号合计 100）。

三条口径决定，每条都是量出来的，不是定的：

1. **判域取"盘上存在"，不要求已被 git 跟踪。**
   决定性证据：起跑时 `scripts/qa/measured-ledger.mjs` 有 export 但**尚未被跟踪**（未跟踪件计数当时=1）。
   若按"tracked"作闸，这道门恰好在「刚建好、还没人接线」那一刻完全失明——而那是本病唯一还能被早期发现的时刻。
   tracked/未跟踪 只作为口径分栏印出来（`盘上 .mjs/.cjs=230（其中 git 已跟踪=218 未跟踪=2）`），不参与判定。
   ⚠ 代价如实记：工作树里有几千个 D 状态文件，"tracked 但盘上没有"的文件因此被排除在判域外，
   这是有意的（对不上的东西不判）。
2. **"声明了导出"按文件自己的模块制度分判，不用一把 `export` 正则横扫。**
   决定性证据（本车道自己踩的）：第一版用字节级 `/^\s*export\s/`，把本车道那个 **.cjs 负例**收进了判域——
   它的模板字符串里写了一句 `export function …`（写给夹具用的），而 CommonJS 里顶层 `export` 本就是语法错误。
   现规则：`.mjs` 认顶层 `export`（含不换行的 `export{…}` 形式与 `export *`）；`.cjs` 只认 `module.exports`。
   实测影响：判域从 22 → 23（−1 假成员 test-carrier-wiring.cjs，+2 真成员 `change-verbs.cjs`/`deny-tap.cjs`，
   这两个都有消费者，判红集合不变）。
3. **放弃的更大判域：全仓扫描 / `scripts/*.cjs` 那 1000+ 个一次性调试脚本。**
   理由不是"麻烦"，是这门会因此死：一次性脚本按定义就没有复用者，全仓扫描会把 1000 多条"正确的死"
   混进判红集合，没人能逐条处置，最后一步一定是有人把整条门关掉——那时真正需要被点名的 `measured-ledger`
   也一起被关掉了。**判域小 ⇒ 每条红都可处置 ⇒ 门才活得下来。** 两棵树 + 必须声明导出，是同时满足
   「覆盖到被当作模块复用的东西」与「红得起来又收得住」的最小判域。

**判域仍未覆盖的（明确认账，不假装全覆盖）**：树外的导出件（`apps/client/src/**`、`config/**`）；
一个已被接线的模块**内部**的个别死导出（现在判的是"这个模块有没有消费者"，不是"这个符号有没有"——
那是下一格的轴，见 §7）。

---

## 2. 消费侧：算消费者与不算消费者

算（七类真实入口，实测分类计数印在 `WIRING_CARRIER` 行）：

| 入口类 | 实测文件数 | 判据 |
|---|---|---|
| code（.mjs/.cjs/.js/.ts） | 931 | 剥注释后的字符串字面量：`import … from` / `export … from` / `import()` / `require()` 的目标，以及 spawn/execFile 用的路径字面量；裸文件名只在**同目录**算（`join(HERE,"x.mjs")` 这一族） |
| shell（*.sh） | 13 | 非注释行点名（`run-final-verify-v33.sh`、`rerun-round7-slices.sh`、`round7-post-b-slice.sh` 都在这类里） |
| dsl（.zcode/workflows/*.dwf.ts） | 3 | GATE_SUITE / PANEL_SUITE / args 里的字符串实参 |
| pkg（package.json） | 4 | scripts 字段值里的路径 |
| queue（scripts/qa/ui-queue*.json + cellplan*.json） | 45 | JSON 字符串值里点名的路径 |
| ci（.github/**/*.yml） | 1 | 非注释行点名 |
| 按文件名正则自动收件的聚合器 | 登记 1 条 | `run-qa-selftests.mjs` 的 `/^test-.+\.(cjs|mjs)$/`，实测实收 42 个文件 |

不算（这条才是这门不腐的前提）：`*.md`、`reports/**`（跑完留下的记录件，包括 `open-row-dispositions.json`
这种"记录我曾经处理过它"的件）、`.zcode/workflow-runs/**`、任何名为 `tmp` 的目录（含 `.zcode/tmp`）、以及
**注释**（代码与 bash 的注释行都先剥掉再匹配）。

- 为什么 tmp 不算：允许"往 tmp/ 里塞一句引用"就能消音的门，第一天就该死。
- 为什么注释不算：#4 那条事故的全部教训就是"注释里写着做了"。若注释能充当消费者，这门恰好对它要抓的东西恒绿。
- 自动收件登记是**回盘核**的：每次运行都去 `run-qa-selftests.mjs` 里找那条正则原文，找不到就 `exit 2`。
  不这么做的后果是——收件规则哪天改了，我还拿旧规则豁免，就会把"其实被自动收件的负例"误报成死件（这是
  交办任务里点名的最容易写错的一条）。实测它救回过一次：判域曾包含 `test-carrier-wiring.cjs`（模板串假导出），
  正是这条登记让它没被判成死件。

---

## 3. 两轴极性决定：**默认判红**（不是 advisory）

机器行里自带这个决定的理由，跑出来是哪一条一目了然：

- 命中 ⇒ `WIRING_RESULT=FAIL（死件=N …默认判红：判域只有 23 个具名导出件、每条都点到文件名，命中即可处置…）` `exit=1`
- 零命中 ⇒ `WIRING_RESULT=PASS（…死件=0 过期豁免=0…）` `exit=0`
- 口径本身不可信 ⇒ `exit 2`（git 不可用 / 判域为空 / 入口扫描集为空 / 豁免清单缺失或形状不合法 / 聚合器登记漂走 / `--select` 点了不存在的名字）
- 逃生口 `--advisory` 存在，但**两个载体都不带**（带了就等于把刚装上的刹车拆掉）

为什么这里跟本仓现成的两轴先例（`verify-case-automatable.mjs --strict`，默认 ADVISORY）**取反方向**：
那把门实测假阳性率 83.3%，**判据本身还不可信**，所以只能报数、判红权交人拍板。
这把门的判据是结构性的（数入口引用，不猜语义），而且它的可信度不是自述的：
`scripts/qa/test-carrier-wiring.cjs` 25 条断言里，第 1、2 条就钉住"零消费者的导出件必须红"与
"补一处真 import 必须绿"，两条都验**退出码**而不是 stdout 字样。
判据可信 + 命中可数（23 个文件里 2 条）+ 每条点到文件名 ⇒ 该判红。

反过来推演一次：如果这道门默认只报数，它接进 bash 与 DSL 之后**永远不会让任何东西变红**，
那它就和 #1 那条"三个调用点都没喂的自证轴"是同一个下场——只是这次连"没喂"都不用查，因为它天生不咬。

---

## 4. 豁免清单如何由实测生成

文件：`scripts/qa/carrier-wiring-exemptions.json`，形状 `{"exemptions":[{"path","why"}]}`。

生成流程（不是手挑）：跑 `--advisory` 取 `WIRING_DEAD_ITEM` 全集 ⇒ 逐条核它是不是"确属一次性落账工具、
不会再被复用" ⇒ 只有这类进清单，**每条必须带一行为什么**。清单本身的合法性是机器判的：

- 缺文件 ⇒ `exit 2`（"清单不存在"不能被读成"没有豁免所以全判"；那正是清单被随手删掉的形状）
- 某条 `why` 缺失或短于 12 字 ⇒ `exit 2`（本仓定规「收紧门必须撤回旧放行＋逐档有账」）
- 重复登记 ⇒ `exit 2`
- **过期豁免**（文件已有消费者却还留在清单里）⇒ `WIRING_STALE_ITEM` + **判红**（清单不能只进不出）

**本轮最终判进豁免清单的条目数：0。** 理由（已写进清单文件的 `_why_empty_today`）：
实测两条死件 `emit-component-scoped-ids.mjs` 与 `run-round7-closeout.mjs` **都不是退役的一次性工具**——
它们各自的文件头都写明那个导出"该被谁吃"（前者产物交给 `r-exec-ws --ids-file`、后者导出是给负对照 harness 用的），
盘上却零调用点。把它们写进清单换绿，就是拿豁免账掩盖 #4 那一类"文档有着落、代码没着落"的缺陷，
正是这门要抓的东西。正确处置是接线（补一个 `test-*.cjs` 吃它，或点进某个必然经过的载体），
或由编排方裁定退役后再入账。

`measured-ledger.mjs` 特意不入账、也特意说明它为什么不在红名单上：起跑时它零消费者（正被 L17 接线），
收工前复量它已有 2 个消费者。本车道侧车实录：

```
path=scripts/qa/measured-ledger.mjs
exports=["ROW_POLICY","mergeMeasuredLedger","shrinkRequested"]
consumers=["scripts/qa/test-guest-landing-writeguard.mjs","scripts/qa/verify-guest-landing.mjs"]
```

它是"病被修好了"，不是"需要放行的东西"。

---

## 5. 负例双向证明（`scripts/qa/test-carrier-wiring.cjs`）

文件名匹配聚合器收件规则 `^test-.+\.(cjs|mjs)$` ⇒ 被自动收件，无需再改任何人手里的清单。

**阳性对照**（RED，逐字，夹具=有 export、零消费者）：

```
      阳性 --select exit=1 :: WIRING_DEAD_ITEM path＝scripts/qa/tmp-l18-carrier-fixture.mjs 导出＝tmp_l18_carrier_fixturePing 消费者＝0 口径＝上述六类入口全部零命中 ⟶ WIRING_RESULT＝FAIL（死件＝1 过期豁免＝0 / 判域导出件＝1；…）
```
（回显把 `=` 换成全角 `＝`，是为了不让聚合器把**被测门**的 `WIRING_RESULT=FAIL` 抓成本测试的判据行；
盘上真实字节仍是 `=`。断言用的也是原始 stdout。）
并额外钉了一条：整跑（不带 `--select`）也必须指名它 ⇒ 证明 `--select` 不是让它变红的原因。

**阴性对照**（PASS，给该夹具加一处真实静态 `import`）：

```
      阴性 --select exit=0 :: WIRING_RESULT＝PASS（判域 1 个导出件全部有消费者；死件＝0 过期豁免＝0；口径＝…）
```

另外三条（超出交办最低要求，因为它们是这门自己的死法）：
③ 按实测进豁免清单 ⇒ 放行且必须打 `WIRING_EXEMPT_ITEM … why=`；
④ 已有消费者却还留在清单 ⇒ 判红并打 `WIRING_STALE_ITEM … 首个=…`；
⑤ `--select` 拼错 ⇒ `exit 2`；⑥ 豁免清单文件缺失 ⇒ `exit 2`。

**变异后删干净并用 ls 证明**：

```
      ls 证明（bash: ls scripts/qa | grep -i tmp-l18）: LS_GREP_RC=1
  ok    7 临时夹具已从盘上删干净（ls + readdirSync 双向核，只留一个都不算证明）
  ok    7 逐个核不存在：D:\6\恋爱小程序\scripts\qa\tmp-l18-carrier-fixture.mjs
  ok    7 逐个核不存在：D:\6\恋爱小程序\scripts\qa\tmp-l18-carrier-user.mjs
```

测试结论行（未接管道亲验退出码）：

```
CARRIER_TEST=PASS
SUMMARY: assertion failures = 0
TEST_EXIT=0        ← node scripts/qa/test-carrier-wiring.cjs 的退出码，未接管道
```

夹具命名纪律：刻意**不以 `test-` 开头**，否则它会被聚合器的收件规则当成负例自动跑，
污染并行车道的 `发现=` 自数。

### 5a 聚合器 before/after `发现=` 差值（实测是 +3，本车道只贡献 +1）

- before `发现=39`：用聚合器自己的收件规则（`readdirSync('scripts/qa').filter(/^test-.+\.(cjs|mjs)$/)`）
  在**建我的测试文件之前**枚举得到。口径标注：**没有**用"真跑一遍聚合器"来取 before——
  那会把 40 多条负例（含并行车道的在途件）全部 spawn 一遍，既慢又可能动到同伴的临时件。
- after `发现=42`：聚合器亲印的第一行 `SELFTEST_DIR=qa/test-*  发现=42`。
- **差值 +3 ≠ +1。** 计数会把并行车道的功劳算到我头上，所以按**文件名集合差**归因（同规则、同目录）：

```
BEFORE_count=39  NOW_count=42  delta=3
ADDED=["test-carrier-wiring.cjs","test-corpus-denominator.cjs","test-real-coverage-discover16.cjs"]
REMOVED=[]       MY_TEST_ADDED=true
```

本车道贡献恰好 +1：`test-carrier-wiring.cjs`。另两枚属 L16 与并发复验车道，不是我加的。
我的测试在聚合器里被真的跑到了并过了：`PASS  test-carrier-wiring.cjs  exit=0  断言失败数=0  CARRIER_TEST=PASS  63s`。
**认账**：那一发聚合器我没有观察到收尾（42 条负例里有并行车道的重腿，跑到第 8 条时我按预算收手，
`SELFTEST_RESULT=` 终行不在我的取证范围内）。我取证的是"第一行 `发现=42`"与"我这条被跑到且 PASS"两点，
整套的终局红绿请取编排方自己那一发。

### 5b 两个退出码都是未接管道亲验的（这条是本仓的雷，我差点自己踩下去）

第一次复量我写成 `node …verify-carrier-wiring.mjs | tail -3`，读回来的是 `FINAL_GATE_EXIT=0`——
**那是 `tail` 的 0，不是门的 0。** 改成未接管道重跑才是真值：

```
GATE_EXIT_UNPIPED=1        ← 门确实红（死件=2）
NEGTEST_EXIT_UNPIPED=0     ← 负例确实全过
BASH_N_EXIT=0              ← bash -n scripts/qa/run-final-verify-v33.sh（改过的终验脚本语法可解析）
```

---

## 6. 两个载体的对齐核对表（dsl-gate-sync 口径）

新增这一条的两侧实录：

```bash
# scripts/qa/run-final-verify-v33.sh:65
g verify-carrier-wiring   180 scripts/qa/verify-carrier-wiring.mjs
```
```ts
// .zcode/workflows/miniprogram-qa-finish-v33.dwf.ts GATE_SUITE 第 13 条（共 16 条）
{ name: "载体接线零消费者门 verify-carrier-wiring", args: ["scripts/qa/verify-carrier-wiring.mjs"], timeoutMs: 180000 },
```

三条自检逐条核：

| 纪律 | 核法 | 结果 |
|---|---|---|
| ① name 以 bash 那个门名为结尾 | bash `verify-carrier-wiring` ↔ DSL `"载体接线零消费者门 verify-carrier-wiring"` 尾串 | 相等 ⇒ summary.json 的键能对上 |
| ② 实参与 bash 逐字一致 | bash 实参 = `scripts/qa/verify-carrier-wiring.mjs`（零旗标）；DSL args = 同一串，零旗标 | **逐字一致**，没有"有意的不等价"需要解释 |
| ③ timeoutMs ≥ bash 秒×1000，只准往大调 | bash 180 秒 ×1000 = 180000；DSL `timeoutMs: 180000` | 1:1 相等（未往小调）。实测本门 wall=**3157 / 2888 / 2595 ms**（Node22、默认参数、写侧车）⇒ 最慢一发对 180 秒约 57 倍余量，与同簇静态门 `verify-dry-no-lease` 齐平 |
| 不进提交后 sha 敏感子集 | `/corpus\|provenance\|band-freshness\|real-coverage/` 匹配 name | 不匹配 ⇒ 它扫的是脚本字节与入口清单，不随产物/证据 SHA 变，不该被重复捞 |
| 位置按语义就近 | 两侧都放在 `verify-dry-no-lease` 之后、`verify-case-automatable` 之前 | 与"接线/wiring 簇"同段 |

载体规模（机械枚举，非手填）：**bash 20 步**（新步是第 13 步）；**DSL GATE_SUITE 16 + PANEL_SUITE 3 + 内联 2 = 21 次门调用**。
判域口径提醒：16 是**我改后**的实数，我起跑时该表已是 15（r9 对账表记的是 14，之后 `verify-ops-stamp` 被接进来了）。
DSL 仍是 bash 的超集，唯一真实差异仍是 r9 判过保留的 `preflight.json` 那条，我没新增漂移、也没改任何既有门的名字/args/timeoutMs。

### 6a 两条自检（都未接管道，退出码亲验）

```
syntax diagnostics: 0
SYNTAX_EXIT=0            ← node -e "…createSourceFile…parseDiagnostics" 的退出码
```
```
[empty] SURVIVED → 末 phase=提交与总报告 | report=37 artifact=2 | 压过的分支=可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
[reject] SURVIVED → 末 phase=提交与总报告 | report=37 artifact=2 | 压过的分支=可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
[permissive] SURVIVED → 末 phase=提交与总报告 | report=42 artifact=2 | 压过的分支=提交后 HEAD、可变红自检、车道划分、门禁复量、终报读数已落盘、报告生成器
DRYRUN_RESULT=PASS（3/3 画像跑到底并产出总报告）
DRYRUN_EXIT=0            ← --profile all 的退出码
```

看板 `report=` 从 r9 记录的 33/33/38 变成 37/37/42（每画像 +4）。**这一步是算术核对，不是新实测**：
GATE_SUITE 每条在「缺口账单」与「终验复量」两个 phase 各喂一次看板 ⇒ 一条门 = +2，
r9 之后新增的 `verify-ops-stamp`(+2) 与本车道新增的 `verify-carrier-wiring`(+2) 正好解释这 +4。

---

## 7. 最终读数的全套机器行（收工前复量，判域 23 件、死件 2）

取数时刻：本车道收工前那一发。**判域在漂**：同一条命令在本次会话里先后读到 `判域导出件=20 / 21 / 22 / 23 / 24`、
`入口文件=991 … 999`——那是并行车道在往 `scripts/qa/` 落新脚本，不是门的读数不稳定。**死件恒为同两条**，
这是本车道能负责的数。下面这块引自判域=23 那一发（`.zcode/tmp` 里那份已随下一次运行覆盖，不再当作可复现件）。

```
WIRING_DOMAIN 判域=scripts/qa/** + apps/client/scripts/** 盘上 .mjs/.cjs=230（其中 git 已跟踪=218 未跟踪=2）声明 export 的导出件=23 导出符号合计=100 口径=判据是「按文件自己的模块制度声明了导出」：.mjs 认顶层 export（含不换行的 export 花括号形式、export *），.cjs 只认 module.exports——实测本车道自己的 .cjs 负例在模板串里写了一句 export function，被字节级 export 匹配误收过，现按制度分判；判域只取这两棵树（scripts 根下那 1000+ 个 shot-/probe- 一次性脚本两闸都不过）；判域取盘上不要求已提交，否则「刚建好还没人接线」那一刻正好检不到
WIRING_CARRIER 入口文件=997 分类=ci:1 code:931 dsl:3 pkg:4 queue:45 shell:13 跳过超大件=0｜算消费者=…｜不算=*.md 与 reports/** 与 .zcode/workflow-runs/** 与任何 tmp/ 目录（记录件、注释、一次性引用都不是消费者）
WIRING_AUTO_COLLECT 已登记聚合器=1 条（scripts/qa/run-qa-selftests.mjs 规则 /^test-.+\.(cjs|mjs)$/ 实收 42 个文件）判域内被自动收件=0 口径=按文件名正则自动 spawn 即"有人跑"，不登记就会把自动收件的负例误报成死件
WIRING_EXEMPT 清单=scripts/qa/carrier-wiring-exemptions.json 登记=0 条 本轮命中=0 过期=0（过期=该件已有消费者却不撤回放行 ⇒ 与新增死件同判红）
WIRING_DEAD_ITEM path=scripts/qa/emit-component-scoped-ids.mjs 导出=parseScoped 消费者=0 口径=上述六类入口全部零命中
WIRING_DEAD_ITEM path=scripts/qa/run-round7-closeout.mjs 导出=reconcileQueueTally 消费者=0 口径=上述六类入口全部零命中
WIRING_SIDECAR .zcode/tmp/carrier-wiring/wiring.json
WIRING_RESULT=FAIL（死件=2 过期豁免=0 / 判域导出件=23；…默认判红…）
GATE_EXIT=1
```

**这条门今天接进两个载体之后就是红的**，且红在两条可处置的真死件上。这是设计目标，不是副作用。
按纪律，全部车道收工后的**最终判红清单由编排方复量取一次数**（并发写盘期间读数会漂：本车道就实测到
判域在 20→23 之间随并行车道落盘而变，也实测到自己测试的夹具窗口把死件数瞬时抬到 3、测完回落）。

---

## 8. 我没改什么 / 已知局限

没改：任何既有门的判据、阈值、`*_RESULT` 文案、名字、实参、timeoutMs（我的两处编辑都是**插入**，
未替换任何既有行）；没加 `--strict`/`--advisory` 到任何既有门；没动 `decisions-v33.md`、台账、
`reports/audit/round-7/ops/`；没 `git add`/`commit`/`checkout`/`restore`/`stash`；没动 L16/L17 的文件。
侧车一律落 `.zcode/tmp/carrier-wiring/` 与 `tmp/`，不落 `reports/**`。

已知局限（如实认，不遮掩）：

1. **判的是"模块有没有消费者"，不是"每个导出符号有没有被用"**。一个 15 个导出、14 个没人用的模块只要有人 import 就读绿。
   那是下一格的轴（符号级死导出 census），本车道刻意不一次吞，因为那条的命中集会大得多、先掉进 §1 说的噪音红死法。
2. 判域过滤仍是**字节级**（不是 AST），已按模块制度分掉 `.cjs` 那类假阳性；残留风险是"某个 .mjs 在模板串里
   写了 ESM 文本"会被多收进判域。方向是保守的：多收只会多判一个文件，不会放过死件。
3. 同目录裸文件名点名算消费者 ⇒ 理论上一个无关的字符串能给死件发"假通行证"（假绿方向）。
   收得更严要给调用位置做解析（`spawn(...,[path])` vs 普通字符串），留给编排方权衡。
4. 注释剥离是行级/块级粗剥，`代码 // "x.mjs" 注释` 这一族仍可能漏进字面量。实测影响面：0（判红集合稳定为同两条）。
5. 面板 `emit-round-report.mjs` 内部那三十来条实时门我没有加这条新门——那是别人手里的文件，
   且新门已在 bash 终验与 DSL 两个必然调用点上；编排方若要面板也带，需改面板脚本，属判域外。

---

## 9. 留给编排方

1. 两条真死件（`emit-component-scoped-ids.mjs` / `run-round7-closeout.mjs`）需要处置：**接线**或**裁定退役后再入豁免账**。
   别用"给门加 `--advisory`"处置——那等于把这条门关回它要抓的形状。
2. 全部车道收工后请复量一次 `node scripts/qa/verify-carrier-wiring.mjs` 取最终判红清单；
   并发期间它会随同伴落盘漂移（本车道实测判域 20→23、死件瞬时 2→3→2）。
3. 符号级死导出（§8.1）与"清单只进不出"的复量节奏，适合排进下一轮门车道。
