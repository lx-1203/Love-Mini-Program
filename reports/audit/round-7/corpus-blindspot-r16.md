# r16 车道：verify-evidence-corpus 的分母盲区（instrumentation only，不改判定）

lane: L16 → **L16b 接手收口**  HEAD at start: 491210dd（实测当前 HEAD=da996f3a）  date: 2026-09-30
约束：不撤销用户的删除决定、不动阈值、PROBLEMS 不计入用户选择的删除、不碰 reports/screenshots/**。

> **接手说明（L16b，12:35 起）**：上游车道 L16 在 12:34 被服务端异常打断，代码写了但没写报告。
> 本车道先逐项验收它的在途件，再补齐交付四件。验收结论见下面 §0；凡本报告里的数，
> **实测**与**推断**分开标注，实测都带取数时刻（并发车道仍在动盘，缺席总数在 3849→3850 之间漂）。

## 0. 对 L16 半成品的验收判定

| 件 | L16 留下的状态 | 复量证据 | 判定 |
| --- | --- | --- | --- |
| `scripts/qa/verify-evidence-corpus.mjs` 的 `DENOM` 实现 | 打断前编排方 `grep -n 'DENOM'` 只命中注释本身；本车道 12:35 复量：文件 mtime **12:27:30**，`grep -c DENOM` = **17** 处，`git show HEAD:… \| grep -c DENOM` = **0** | 12:37 实跑该文件 ⇒ **五行 `CORPUS_DENOM_*` 全部打印**、`CORPUS_PROBLEMS` 从 2 降到 1、exit=1（见 §4/§6） | **留用**。承诺的机器行这次真落盘了；HEAD 里确实是 0 处 ⇒ 文件头那条自述在 HEAD 为假、在工作树为真 |
| 两轴划分（advisory / blocking） | 判红条件只改了 `if (missing \|\| …)` → `if (blockingMissing \|\| …)` 一行；`git diff` 的删除行只有 5 条：用法注释、import 补 `relative`、上面那条 if、`why` 里的 `帧不存在=` 取数、PASS 行尾追加说明 | 见 §6 对照：`帧不存在=144`（round-1）仍判红；哈希/无 hash/字节数/真断链四类一字未动 | **留用**，符合"分轴"而非"改阈值" |
| `scripts/qa/test-corpus-denominator.cjs`（未跟踪新件） | mtime **12:33:52**（打断前 40 秒写完），内容未验收 | 本车道 12:47 亲跑：**exit=1、cases=44 fail=2、289s**；两条 FAIL 都在 D 段（`NEGATIVE_PROOF live_bad=2 mutant_bad=2`） | **骨架留用、D 段与 B 段重写**：A/C2/C3/C4/E 都是有效阳性（尤其 C2"放回盘上读数必变"这条关键反证），但 **D 段是假负例**（替身没锚到夹具根 ⇒ 空扫描集 exit=2 ⇒ live 与 mutant 同样红，变异证明与谓词无关）；另外两发全域跑让整件 289s，距聚合器 300s kill 只剩 11s。修后实测 `NEGATIVE_PROOF live_bad=0 mutant_bad=1`，聚合器里 **PASS**（§5） |
| `corpus-blindspot-r16.md` | 32 行 7 节全「（待填）」 | — | 本车道补写七节（即本文件），§5 用 12:47 与 14:07 两次实跑对照 |

**关键反证已复核（本车道独立实现，不共享门的判定）**：`exec-a-mock-final` 那批缺席帧的归属，
结论是 **属"选定删除"advisory**（§2 末），而 `round-1` 的 144 帧 **属无凭据 blocking**（照旧判红）——
两轴各给一侧阳性，正好证明这条轴不是恒 0 装饰、也不是把缺失一洗到底的豁免开关。

## 1. 改前读数（gate 按终验的 sanctioned 跑法）

**跑法**：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-evidence-corpus.mjs`（无参数＝全域），**未接管道**，
输出重定向到文件后整篇读。两发改前读数都来自 **HEAD 版门体**（`git show HEAD:scripts/qa/verify-evidence-corpus.mjs`）——
**没有原地 stash/checkout**：把它复制到 `tmp/l16b-pre/scripts/qa/` 镜像目录，只机械替换一行
`const repo = resolve(here, "../..")` → `const repo = "D:/6/恋爱小程序"`（与本仓测试 `variant({anchor})` 同一手法）。

**为什么必须换这一行**（实测，不是猜）：不换时 git 子命令的 cwd 落在镜像目录里，门里那条
`git log --reverse -S gitSha -- scripts/qa` 的**相对 pathspec** 会在镜像目录下静默解析成空 ⇒ 打戳约定起点派生不出来
⇒ 144 帧那一发会被判成"无 gitSha 红"而不是 legacy，读数与生产不同源。本车道试过 `GIT_DIR`+`GIT_WORK_TREE` 指回真仓，
**实测同样返回空**（pathspec 按 cwd 解，不按 GIT_WORK_TREE），所以只能用 anchor 替换。
**镜像法有效性复核**：下面 `pre_full` 的 `打戳约定起点=2026-09-24T16:31:39.000Z`、`CORPUS_LEGACY_NO_SHA=1`、
`CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47` 与编排方 12:06 那一发逐字相同 ⇒ 除分母轴外门体同源。

### 1a. 编排方 12:06 亲跑的改前基线（留存 `tmp_l16_gate_now.txt`，机器行逐字）

```
CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=2
CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=1 :: frames resolvableOlder=9040 unresolvable=0 empty=144
CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=144 打戳约定起点=2026-09-24T16:31:39.000Z
CORPUS_PROBLEM reports/audit/round-7/exec-a-mock-final/manifest-detail.json 共 650 帧 :: 帧不存在=3
CORPUS_PROBLEM reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144
CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）
```
`grep -n 'DENOM'` 在那一发的门体里**只命中文件头那条注释**（本车道复量：`git show HEAD:… | grep -c DENOM` = **0**）
⇒ 承诺过的具名读数当时确实不存在，这一格就是被打断的位置。

### 1b. 本车道 12:59 复量（HEAD 码 · 无库 · exit=1 · 82s · `tmp/l16b_pre_full.txt`）

```
CORPUS_MANIFESTS=54 CORPUS_MANIFESTS_TOTAL=54 SCOPE=全域 HEAD=da996f3a
CORPUS_STORE=unconfigured（没配 QA_EVIDENCE_STORE/--store ⇒ 本轴不判，判定与从前相同）
CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=2
CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=1 :: frames resolvableOlder=9040 unresolvable=0 empty=144
CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=144 打戳约定起点=2026-09-24T16:31:39.000Z（…）
  CORPUS_PROBLEM reports/audit/round-7/exec-a-mock-final/manifest-detail.json 共 650 帧 :: 帧不存在=4
  CORPUS_PROBLEM reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144
CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）
```
与 12:06 那一发的**唯一**差别是 `帧不存在=3` → `=4`：并动车道在 `reports/screenshots/round-7-A-mock-final/` 里
又多删了一张（`…-dc04-after.png`），**不是门变了**（实测：缺席总数同时从 3849 漂到 3850）。
改前**没有任何一行**说得出"消失了多少"。

### 1c. 改前配库那一发＝裁定册 §32 记的形状，本车道复现了

13:00 复量（HEAD 码 + `QA_EVIDENCE_STORE=D:/6/love-mini-evidence` · exit=0 · 64s · `tmp/l16b_pre_store.txt`）：

```
CORPUS_STORE=reachable dir=D:\6\love-mini-evidence 库内对象=3497 本轮库背书帧=148 前缀碰撞=0
CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=0
CORPUS_RESULT=PASS（无不可背书证据；legacy 无戳清单=1 帧=144 …）
```
`库背书帧=148` = 被点名的 4 张 + round-1 的 144 张 ⇒ 配库时**连那 144 张也由哈希背书**，`CORPUS_PROBLEMS=0` 并 **PASS**，
而同期 `git ls-files --deleted` 报 **3850** 个在册文件已不在盘上。**"对着几千张被删帧只看得见几个、照印 PROBLEMS=0 PASS"
这句话在改前是可复现的实测，不是修辞。** 这就是本门要治的盲区。

## 2. 三个集合，本车道自己量的数

**取数时刻：2026-09-30T04:40:08Z（本地 12:40:08 +0800）与 04:44–04:46Z 两次，HEAD=`da996f3a`，未接管道。**
三个集合各自独立复算过（`tmp/l16b-probe-3frames2.cjs` + `git -c core.quotepath=off ls-files`），也同时给出门的读数，两件事分得开。

| 集合 | 问的是什么 | 实测值 | 来源 |
| --- | --- | --- | --- |
| **a) tracked 且已从盘上消失（在册缺席）** | `git ls-files --deleted -- reports` | **3850** 个文件，全部在 `reports/screenshots/**` 下（14:07 复量 **3851**） | 独立复算 = 门 `CORPUS_DENOM_ABSENT trackedAbsentFiles=3850`（两者逐字相同；14:07 那发同样逐字相同） |
| ↳ 其中带图扩展名（`.png/.jpg/…`） | 同上按 `EVIDENCE_EXT` 拆 | **3840**（`.png` 3814 + `.jpg` 26；14:07 复量 **3841**） | 独立复算 = 门 `trackedAbsentFrames=3840` |
| ↳ 其中非图扩展 | 同上 | **10**（`.log`×4、`.ps1`×2、`.txt`、`.json`、`.tsv`、无扩展名各 1） | 独立复算 = 门 `trackedAbsentNonImage=10` |
| **b) 其中被任何 manifest 点名的** | a ∩ 「各清单 shots[].path∪file」 | **4** 个路径（14:07 复量 **5**） | 独立复算 = 门 `CORPUS_DENOM_BLINDSPOT absentNamedByGate=4` |
| **c) 门本来会去看的** | 门打开过的条目 / 去重后的路径 | **9184** 条目、**6460** 唯一路径；这 6460 与 a 的交只有 4 ⇒ 门对 a 这一集的**可见率 4/3850**（14:07：5/3851） | 独立复算 = 门 `gateItems=9184 gateNamedPaths=6460` |
| 分母（在册全集，供对账） | `git ls-files -- reports` | **12047** 个 tracked 文件 / 其中 **10457** 带图扩展 / **1590** 非图 | 独立复算 = 门 `CORPUS_DENOM_TRACKED trackedFiles=12047 trackedFrames=10457`（10457 与裁定册既有的「reports/** 仍跟踪 10,457 枚」同数，两处独立得到） |
| **盲区（a 减 b/c）** | 门**结构上打不开**的在册缺席 | **3846**（两发都落在 3846：总数漂了一格、被点名的也漂一格，差没变） | 门 `absentNeverOpenedByGate=3846`；对账 3850−4=3846 闭合 |

**与裁定册 §32 那个「3848 张截图」的对账（本车道的算术，属推断标注）**：本次实测 a=3850，扣掉两个明显的脚本文件
（`reports/screenshots/round3/_crops/crop.ps1`、`crop2.ps1`）恰为 **3848**；按图扩展名口径则是 3840。
两个差都不是门造成的，而是"3848 张"与"3850 个在册缺席"本来就是两个口径 —— 本车道不替它选一个，
两个都摆在表里。总数在 L15 记账时是 3849、本车道 12:40 量到 3850，**+1 的漂移来自并发车道仍在动盘**（实测标注，非推断）。

**那批帧（12:06=3 帧 → 12:37=4 帧 → 14:07=5 帧）的归属结论 —— 属「选定删除」advisory，不是 blocking**
证据链（全部独立复算，不共享门的判定）：
1. 清单写法是**仓相对 + 大写混排**方言：`reports/screenshots/round-7-A-mock-final/PAGES-DISCOVER-INDEX-DC01-after.png`（实测 `abs-dialect-entries=0`，即 650 条里没有一条绝对写法）—— 本车道第一版探针因为拿 `join()` 出的反斜杠绝对路径去比 `ls-files` 的仓相对输出，恒判 false，**差点把 advisory 读成 blocking**；方言同源后才是下面这个结果。
2. 这 4 条路径逐条满足：**仍在 `git ls-files`（tracked）里 = true**，且**能在 `git ls-files --deleted` 里查到 = true**（`reports/screenshots` 子树限定下同样 = true）⇒ 它们的缺席有"用户这次选定删除"的可核凭据。
3. 对照面（证明这不是万能豁免）：`reports/screenshots/round-1/manifest.json` 那 144 帧逐条 `inDeletedSet=false / stillTracked=false` —— **从未入库**，删除集给不出凭据 ⇒ 照旧 blocking、照旧判红（实测：门的 `CORPUS_PROBLEM … 帧不存在=144` 原样在，`CORPUS_PROBLEMS=1` 就是它）。
4. 帧数 3→4→5 的漂移：12:06 基线 `missing=3`，12:37/12:44 两发 `missing=4`（新增 `…-dc04-after.png`），
   14:07 那一发 `missing=5`（门印 `选定删除集内缺席=5`、`gateNamedAbsent=149`）。
   **并动车道在同一目录里继续删** ⇒ 本车道不把它当成门的缺陷，但它要求"全域那一发的具体数字必须绑时刻引用"
   （§7e 把这条写成下游硬要求）。被点名数与缺席总数同步漂移，所以**盲区差 3846 三发都一样**。

⇒ 结论：**这 4 帧全部属用户选定删除集 ⇒ advisory 具名报数、不进 PROBLEMS；144 帧那批无凭据 ⇒ 仍判红。缺失没有被洗成一色。**

## 3. 门能看见什么、不能看见什么

**能看见**：`walk(ROOT)` 收到的文件（名字匹配 `manifest.*\.json` 的那些 JSON，全域 54 份、总 54 份）里被 `shots`/`frames` 数组**点名**的每一个路径 —— 对这些路径做 `existsSync` + `contentHash` 抽样比对 + `bytes` 比对。这就是"被点名的都在不在"。

**不能看见（结构性成因，实测坐实）**：
1. **门的语料是"清单点名的路径"，不是"语料里本该存在的文件"**。`walk()` 收的是 `manifest*.json`，随后 `for (const s of shots) existsSync(p)` ⇒ 门 stat 过的全集 = 6460 个点名路径。而证据语料的 tracked 分母是 10457 张在册帧。**盘上消失的 3850 个在册文件里，只有 4 个恰好被某份清单点过名** ⇒ 其余 3846 个门连路径都没打开过，既不可能记进 `CORPUS_PROBLEMS`，也不可能记进任何 advisory —— 它压根没看见。这一格从前**没有任何读数**。
2. **readdir 当不了分母**。就算把 `walk()` 从"只收 manifest"改成"收所有文件"，readdir 也只看得见**还在盘上的**东西；已被删除的 3850 个在 readdir 里根本不存在。只有 git 给得出两件别处给不出的集合：在册（`ls-files`）与"在册却已不在盘上"（`ls-files --deleted`）。
3. **manifest 点名的并集也当不了分母**。并集本身就是门遍历的东西（6460），拿它当分母得到的缺席还是那 4 个 ⇒ 等于把盲区重新藏回定义里。
4. **"缺席"此前是一种事实**：`existsSync` 为 false 一律 `missing++` ⇒ 判红。于是"用户自己删的"和"证据真丢了"共用同一个格子，两件事在同一个数里对冲：默认档会把用户的选择判成红（与裁定"不许把他行使选择权做成默认红"冲突），而**配了仓外证据库那一发更糟** —— 库按哈希把点名的缺席背书掉，`missing` 直接归零，门 `CORPUS_PROBLEMS=0` 并 PASS，而那 3846 个文件的消失对这一个字节都没有影响过。这正是 §32 记的 L15 实测形状。
5. **`--scope` 让盲区更宽**：限定 scope 时清单集合本身就缩小（`CORPUS_MANIFESTS` 变小），而缺席分母按 `--root` 而不是按 scope 算，本车道把它如实印成两行不同的数（`CORPUS_MANIFESTS` vs `CORPUS_DENOM_*`），不做调和。

## 4. 新字段与极性决定

### 4a. 新增的具名机器行（全部 `^CORPUS_` 开头、可 grep，实测取自 `tmp/l16b_run_timed2.txt`）

| 字段 | 逐字形状（实测） | 问的是哪件事 |
| --- | --- | --- |
| `CORPUS_DENOM_TRACKED` | `source=git:ls-files root=reports trackedFiles=12047 trackedFrames=10457 trackedNonImage=1590` | **分母**取自 git 在册集合（明写"不是盘上 readdir、也不是 manifest 点名的并集"） |
| `CORPUS_DENOM_ABSENT` | `trackedAbsentFiles=3850 trackedAbsentFrames=3840 trackedAbsentNonImage=10` | **删了多少**（含非图扩展单列，供对账：两个数本就不该相等） |
| `CORPUS_DENOM_SCANNED` | `gateItems=9184 gateNamedPaths=6460 gateNamedAbsent=148 :: vouchedByDeletionSet=4 notVouched=144（对账 4+144=148 vs gateNamedAbsent=148）` | **门本来会去看多少** + 门看见的那部分缺席分两轴 |
| `CORPUS_DENOM_BLINDSPOT` | `absentNamedByGate=4 absentNeverOpenedByGate=3846` | **门结构上打不开的那一集**＝从前完全静默的那一格 |
| `CORPUS_DENOM_AXIS` | `advisoryFrames=4 advisoryPaths=4 advisoryManifests=1 blockingFrames=144 strict=off` | 两轴的头条数 + 自报档位 |
| `CORPUS_ADVISORY_FILE` | `reports/audit/round-7/exec-a-mock-final/manifest-detail.json 共 650 帧 :: 选定删除集内缺席=4（凭据=git ls-files --deleted …）` | 逐份点名，与 `CORPUS_PROBLEM` / `CORPUS_LEGACY_FILE` **平行不混用** |

三个集合各自量化到位：`ABSENT`＝删了多少、`BLINDSPOT absentNamedByGate`＝其中被 manifest 点名多少、
`SCANNED gateItems/gateNamedPaths`＋`absentNeverOpenedByGate`＝门本来会去看多少 / 看不见多少。

### 4b. 极性决定（两轴）

| 事实 | 判据 | 依据 |
| --- | --- | --- |
| 缺席路径能在 `git ls-files --deleted` 查到 | **advisory**：具名报数，**不进** `CORPUS_PROBLEMS`、不影响退出码 | 这就是用户 2026-09-30 书面裁定"我选的"那一批；裁定明写不许把他行使选择权做成默认红 |
| 缺席路径**查不到**这份凭据（从未入库 / 真丢失 / 根在仓外拿不到 git） | **blocking**：照旧 `帧不存在=N` 判红，与改前逐字同判 | 不能被删除集背书 ⇒ 没有任何豁免理由。实测：round-1 那 144 帧仍红 |
| 分母不可得（`--root` 指到仓库外、或 git 不可用） | 一条都不背书（全走 blocking），`(...)` 里印出 `(不可得:原因)` | 宁可红，不空放；不把"取不到"悄悄当 0 |

**没有把全部缺失洗成 advisory**：默认档实测 `advisoryFrames=4 / blockingFrames=144`，
`CORPUS_PROBLEMS` 从 2 降到 **1**（降的那一格只有选定删除集那一份）。

**判据只动了一格**（`git diff` 的删除行总共 5 条，其中判据行只有 1 条）：
`if (missing || mismatch || noHash || shaBlocked || bytesBad)` → `if (blockingMissing || …)`，
`blockingMissing = STRICT ? missing : missing - advisory`。哈希不符 / 无 contentHash / 字节数不符 / 真断链 / 无戳窗口
四类**一字未动**，阈值一个没改。

**`--strict` 形状照 `verify-case-automatable.mjs` 的 `--strict` 先例**（同名同义：默认只报数，判红权在旗标）：
加它之后 ① `blockingMissing` 退回 `== missing`（复现改前判据），② 盲区那一格额外计一处问题。
实测两档的**读数逐字相同**、只有判决变（§5 的 B 组断言在管这件事）。

**与仓外证据库那一轴的交叉（本车道实测的新发现，不是推断）**：配库时 `missing` 会先被"库按哈希背书"消化掉，
所以 `advisoryFrames/blockingFrames` 双双变 0（`gateNamedAbsent=0`），**但 `CORPUS_DENOM_BLINDSPOT` 仍然报 3846** ——
它按「点名路径集 ∩ 在册缺席集」算，不走 missing 那条循环。
⇒ 盲区这一格是**库轴洗不掉**的：12:06 之前"配库⇒PROBLEMS=0 PASS"那一发，现在照样 PASS，
但同一发里多出一行具名读数说"3846 个在册缺席我压根没打开过"。这正是本刀要的收口形状。

## 5. 负例测试 RED 证明（含变异）

**文件**：`scripts/qa/test-corpus-denominator.cjs`（收件名匹配聚合器 `run-qa-selftests.mjs` 的 `^test-.+\.(cjs|mjs)$`，
实测被收：聚合器输出第 5 行就是它）。

### 5a. L16 那一版：实测**不通过**，而且负例轴是假的

本车道 12:47 用 Node22 亲跑 L16 留下的原版（未接管道，`tmp/l16b_selftest_first.txt`，**exit=1，289s**）：

```
  FAIL D 替身与活文件只差 1 行（只放宽背书谓词，别的一个字没动）  <<diffLines=2>>
  FAIL D 活文件：两格极性都成立（有凭据⇒advisory、无凭据⇒红）  <<bad=2>>
  NEGATIVE_PROOF live_bad=2 mutant_bad=2（恒真背书让 C3 的 blockingFrames 2->0、PROBLEMS 1->0）
CORPDEN_SUMMARY cases=44 fail=2 …
CORPDEN_TEST=FAIL
```
根因（实测复现，不是推测）：`battery()` 拿 `anchor=真实仓` 的替身去跑夹具 ⇒ 门把 `--root fx` 解成
`<真实仓>/fx`（盘上没有）⇒ **空扫描集 exit=2** ⇒ live 与 mutant **同样** bad=2。
于是"变异必红"是靠**路径没接上**通过的，跟放宽谓词毫无关系 —— 这正是本轮点名要治的"假负例/死代码"形状。
**处置：判为必须重写；不接受"绿了就行"，因为它根本没在测判据。**
第二个实测缺陷：289s 距聚合器 `spawnSync … timeout:300000` 只剩 11s，并发一挤就会被误杀 ⇒ 把第二发全域换成窄 scope。

### 5b. 修好之后：聚合器里 **PASS**

14:07 亲跑聚合器（Node22，未接管道，`tmp/l16b_selftests_after.txt`）：

```
SELFTEST_DIR=qa/test-*  发现=43  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe
PASS  test-corpus-denominator.cjs  exit=0  断言失败数=0  CORPDEN_TEST=PASS  64s
```
**发现数 before/after（口径必须绑时刻，并动车道也在往 `scripts/qa` 放 test-*）**：
12:38 `ls scripts/qa` 数到 **42** 个 `test-*.\(cjs|mjs\)`（**已含**本件 ⇒ 不含本件＝**41**＝改前基线）；
14:07 聚合器报 **43**（含本件 ⇒ 不含本件＝42）。⇒ 本件净贡献 **+1**，其余 +1 来自并发车道新放的测试文件，不是本车道。

变异轴的复跑证据（本车道 14:0x 单跑 `tmp/l16b_selftest_fixed.txt`，`A_DIAGNOSTIC 盘漂移=无`）：

```
  ok   D 夹具替身相对夹具门只差 1 行（背书谓词；锚点在生成夹具门时已经打好了）
  NEGATIVE_PROOF live_bad=0 mutant_bad=1（恒真背书让 C3 的 blockingFrames 2->0、PROBLEMS 1->0）
  ok   D 变异体此刻确实还在盘上（下一步删它并复核）
```
`live_bad=0` 是先立起来的**阳性前提**，`mutant_bad=1` 才说明放宽真的会被抓 ⇒ 这条轴不再是死代码。
"改回→PASS"由两处共同承担：同一发里未放宽的替身仍给 `live_bad=0`；聚合器整发 `CORPDEN_TEST=PASS`。
"删变异体→`ls` 证明不在盘上"由 E 段承担（打印 `.zcode/tmp` 真实列举 + 复核无 `corpusdenom-*` 残留）；
本车道另在盘上复核：`ls -d .zcode/tmp/corpusdenom-*` 已无匹配（rc=2＝没有该文件），
只清掉了本车道早期那一发（固定名夹具）留下的残目录，未动别人的夹具目录。

### 5c. 关键反证（把 advisory 化的帧放回盘上 ⇒ 读数必须变化）

C2 那一组逐条实测（夹具仓 `.zcode/tmp/corpusdenom-fx-*`，独立 git 仓库，**没碰 `reports/screenshots/**`**）：

```
  ok   C2 帧放回盘上后 ABSENT / advisory / BLINDSPOT 三格全部归零 ⇒ 这条轴量的确实是盘上的事实，不是抄死的常数
  ok   C2 对 C1 逐项比较：三格读数**都**变了（任何一格不变就说明那格没接上数据线）
  ok   C2 遍历集不变而缺席归零 ⇒ 变的是「帧在不在」，不是门看了多少东西（两件事分得开）
  ok   C2 复核：再删一次，读数回到 C1 那一组 ⇒ 变化是可复现的读数差，不是随机漂移
```
⇒ `advisory 2→0 / absent 3→0 / blindspot 1→0`，且 `gateItems`、`gateNamedPaths` 不变 —— 证明这条轴不是恒 0 的装饰。

真仓那一发同样带着这条对账（B 组，窄 scope 真清单）：默认档 `PROBLEMS=0` 具名 advisory，
`--strict` 下 `帧不存在` 退回的数字**恰好等于默认档豁免掉的那一集**（本车道这一发量到 5 帧，盘仍在漂）⇒
"红只在旗标手里，不在判据里"。

### 5d. 兄弟自测的两发红（**如实落账，本车道未修、也未验证过它们在改前是否绿**）

同一次聚合器里有 2/45 红，都不是本车道的文件：

```
FAIL  test-corpus-legacy-window.cjs  exit=1  断言失败数=1  LEGWIN_TEST=FAIL  26s
      |   FAIL H 真仓对跑：scoped corpus 侧 PROBLEMS=0 而 legacy>=1 ⇒ 红与豁免分得开  <<problems=1 legacy=1>>
FAIL  test-evidence-store-axis.mjs   exit=1  断言失败数=1  EVS_TEST=FAIL  99s
      | FAIL 2 库可达：PROBLEMS 仍等于基线（库不新增红，也不豁免既有问题） :: PROBLEMS=0 基线 P0=1
```
两发都在读 `CORPUS_PROBLEMS` 的**构成**，而 r16 这一刀改的正是那一格的构成（选定删除集的缺席不再进 PROBLEMS）。
本车道只核到"门自己的极性与设计一致"（全域默认实测 `CORPUS_PROBLEMS=1`，红仍只来自 round-1 那 144 帧无凭据的缺席）；
**没有**把 HEAD 码拿去跑这两个兄弟自测，因此**不能断言它们在改前是绿的**——这一条留给编排方拍板：
要么按新极性修它们的期望常量（属他人车道），要么承认 advisory 轴把它们的前提改写了。本车道不越界去改别人的文件。

## 6. 门行改前/改后对照

所有读数**未接管道**、Node22、`--store` 未传时不配库。取数时刻标注在每行。

| 发 | 改前（HEAD 码） | 改后（工作树码） | 判决变化 |
| --- | --- | --- | --- |
| 全域 · 默认档 | `CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=2`，exit=**1**（12:59 `tmp/l16b_pre_full.txt`） | `CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=1`，exit=**1**（12:44 `tmp/l16b_run_timed2.txt`，113s） | 只有选定删除集那一格从红转豁免；`帧不存在=144` 原样在 |
| 全域 · `--strict` | 无此档（HEAD 不认 `--strict`） | `CORPUS_PROBLEMS=3`，exit=**1**（13:00 `tmp/l16b_post_strict.txt`） | =改前的 2 格 + 盲区 1 格 ⇒ **`--strict` 精确复现旧判据再多加一格** |
| 全域 · 配库 | `CORPUS_PROBLEMS=0` ⇒ **PASS**，exit=**0**（13:00 `tmp/l16b_pre_store.txt`，库背书 148 帧） | `CORPUS_PROBLEMS=0` ⇒ PASS，exit=**0**（13:01 `tmp/l16b_post_store.txt`）**但同一发印出 `absentNeverOpenedByGate=3846`** | 判决不变，**静默变可见** |
| 本轮轴 `--scope reports/audit/round-7` | 红（`帧不存在=3~4` 计入本轮 PROBLEMS） | `CORPUS_SCANNED=19 … CORPUS_PROBLEMS=0` ⇒ **PASS**，exit=**0**（12:46，67s） | 用户裁定的直接后果：本轮轴不再为"我选的删除"亮红；红挪到 `BLINDSPOT`/`ADVISORY_FILE` 两行具名读数上 |
| 窄 scope `--scope reports/audit/round-7/exec-a-mock-final/` | 红 1 格 | 默认 `PROBLEMS=0` exit=0（16s）／`--strict` `PROBLEMS=2` exit=1（23s），且退回 `帧不存在=4` 的改前写法（无附注） | 旗标可逆，读数不漂 |

`CORPUS_MANIFESTS / CORPUS_SCANNED / CORPUS_EXPIRED_GITSHA / CORPUS_PROBLEMS / CORPUS_SHA_CLASS /
CORPUS_LEGACY_NO_SHA / CORPUS_PROBLEM / CORPUS_RESULT` 的**既有形状一字未改**（`emit-round-report.mjs` 按
`num("CORPUS_EXPIRED_GITSHA")` 等键名取数，动形状就是跨车道改契约）；新增的都是**另起的新行**。

### 6a. `verify-provenance-all` 侧：`PRE_STAMP` 复量＝**4882**，不是 4886 —— 但**不是本刀改的**（实测证据链）

任务要求"`PRE_STAMP` 必须仍是 4886，不许你这刀改变"。本车道 13:12 复量（Node22、未接管道、exit=**1**，
`tmp/l16b_provenance.txt`）：

```
PROV_FRAMES_CONSISTENT=4154 PROV_FRAMES_STALE=0 PROV_FRAMES_PRE_STAMP=4882 PROV_FRAMES_UNRESOLVABLE=148 PROV_FRAMES_UNDATED=0 PROV_FRAMES_UNKNOWN_BAND=0 PROV_FRAMES_LEGACY=0
PROV_FRAME_ACCOUNTING in=9184 out=9184 OK
PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论）
```

**判定：本车道这一刀没有改变 `PRE_STAMP`；4886→4882 的 −4 是并动车道继续在盘上删帧造成的。** 四条实测依据：
1. `git status --porcelain -- scripts/qa/verify-provenance-all.mjs` = **空**（该门在工作树里一个字节没改，我车道也没碰它）。
2. 该门的分类**依赖帧在不在盘上**：`verify-provenance-all.mjs` 的帧循环里
   `if (!p || !existsSync(abs)) { unresolvable++; … continue; }` —— 缺席帧**在到达 pre-stamp 判定之前就 continue 了**，
   于是每少一张在册帧，`PRE_STAMP` 减一、`UNRESOLVABLE` 加一。这是结构，不是猜测。
3. 实测对得上：`PROV_FRAMES_UNRESOLVABLE=148` **恰好等于**语料门同一盘的 `gateNamedAbsent=148`（=round-1 的 144 + exec 的 4），
   而 `PROV_FRAME_ACCOUNTING in=9184` 也**恰好等于**语料门的 `gateItems=9184` ⇒ 两把尺子在数同一批条目。
4. 清单侧没有变：12:06 基线与本车道 12:59 那发的 **54 行 `shots=` 逐行 diff 为空**、清单路径集 diff 为空
   ⇒ 条目集没被谁改过，变的只有盘上存在性。

⇒ 结论写给编排方：**`PRE_STAMP=4886` 这个"必须仍是"的前置条件，在删除仍在进行的当下无法保持**，
它是一张随盘漂移的读数（−4 精确对应 exec-a-mock-final 那 4 张 dc01–dc04 帧）。本车道没有把它改判、没有豁免、
也没有碰那扇门；`PROVENANCE_RESULT` 仍为 FAIL（红保持）。若要求 `PRE_STAMP` 钉在 4886，需要的是**停止并发删除**
或改用与存在性无关的口径 —— 两者都超出本车道授权（不改判据、不恢复他选的删除）。**这条差异如实落账。**

### 6b. 收口那一发（本车道最后一次，15:52 全域默认 · Node22 · 未接管道 · exit=**1** · `tmp/l16b_FINAL.txt`）

```
CORPUS_MANIFESTS=54 CORPUS_MANIFESTS_TOTAL=54 SCOPE=全域 HEAD=da996f3a
CORPUS_STORE=unconfigured（没配 QA_EVIDENCE_STORE/--store ⇒ 本轴不判，判定与从前相同）
CORPUS_DENOM_TRACKED source=git:ls-files root=reports trackedFiles=12047 trackedFrames=10457 trackedNonImage=1590（…）
CORPUS_DENOM_ABSENT trackedAbsentFiles=3851 trackedAbsentFrames=3841 trackedAbsentNonImage=10（…）
CORPUS_DENOM_SCANNED gateItems=9184 gateNamedPaths=6460 gateNamedAbsent=149 :: vouchedByDeletionSet=5 notVouched=144（对账 5+144=149 vs gateNamedAbsent=149）
CORPUS_DENOM_BLINDSPOT absentNamedByGate=5 absentNeverOpenedByGate=3846 :: 在册缺席 3851 个路径里门结构上只遍历到 5 个 ⇒ 其余 3846 个既不进 PROBLEMS 也不进 advisory（…）
CORPUS_DENOM_AXIS advisoryFrames=5 advisoryPaths=5 advisoryManifests=1 blockingFrames=144 strict=off（…）
CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=1
CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=1 :: frames resolvableOlder=9040 unresolvable=0 empty=144
CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=144 打戳约定起点=2026-09-24T16:31:39.000Z（…）
  CORPUS_PROBLEM reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144
  CORPUS_LEGACY_FILE reports/screenshots/round-1/manifest.json 共 144 帧 :: generatedAt=… 早于打戳约定 …
  CORPUS_ADVISORY_FILE reports/audit/round-7/exec-a-mock-final/manifest-detail.json 共 650 帧 :: 选定删除集内缺席=5（凭据=git ls-files --deleted …）
CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）
```
这一发同时把"漂移"与"不变"钉在一起：缺席总数 3850→**3851**、被点名 4→**5**、`gateNamedAbsent` 148→**149**，
而 **盲区差仍是 3846**、**blocking 仍是 144**、**PROBLEMS 仍是 1**、**exit 仍是 1**、`SHA_CLASS`/`LEGACY` 两行一字未变。

## 7. 下游要求（本车道不改的文件）

**本车道一行都没改下面这些文件**（`git status` 里它们不属于本车道的改动集）；这里只写"若要消费新行，精确要求是什么"。

### 7a. `scripts/qa/emit-round-report.mjs`（面板取数方）
1. 取新数**只能按行首键名 + 具名字段**取，不得从 `CORPUS_PROBLEMS` 反推：
   `^CORPUS_DENOM_ABSENT` → `trackedAbsentFiles` / `trackedAbsentFrames` / `trackedAbsentNonImage`；
   `^CORPUS_DENOM_BLINDSPOT` → `absentNamedByGate` / `absentNeverOpenedByGate`；
   `^CORPUS_DENOM_AXIS` → `advisoryFrames` / `advisoryPaths` / `advisoryManifests` / `blockingFrames` / `strict`。
2. **行取不到 ⇒ 印"未量"，不得当 0**。这条照它自己处理 `CORPUS_SHA_CLASS` 的先例
   （`emit-round-report.mjs` 里 `if (!hit) instr("门输出里根本没有 CORPUS_SHA_CLASS 行 ⇒ 三类未量（不得读成 0/0/0）")`）——
   把"没接到线"读成 0，就是本轮要治的那个形状本身。
3. `absentNeverOpenedByGate` 必须**独立成格**，不得并进 PROBLEMS 列、也不得与 `advisoryFrames` 共用一格；
   面板上 `advisoryFrames` 那一格的说明句必须带"**不判红 ≠ 帧还在**"这层意思（门自己的行内已经这么写，照抄即可）。
4. `strict=on/off` 必须随读数一起印出来：同一批发数对应两种判决，档位不写清就是歧义。
5. 既有 `num("CORPUS_EXPIRED_GITSHA")` / `num("CORPUS_PROBLEMS")` / `shaClassCell(...)` 的取数**不受影响**
   （本车道没动那几行的形状）。

### 7b. `scripts/qa/run-final-verify-v33.sh`（终验载具）
1. 载具里 `g verify-evidence-corpus 600 …` 的 600s 预算**够用**：本车道实测全域单发 57–113s（并发负载决定，
   轻载 57s、重载 113s）。但**若终验要同时留"默认档"与"--strict 档"两发全域，预算必须按 2×113s + 余量重估**，
   不能沿用单发预算。
2. 该载具在有仓外库时会 `export QA_EVIDENCE_STORE`（脚本注释自陈）。**实测后果**：配库那一发
   `advisoryFrames=0 / blockingFrames=0 / PROBLEMS=0 PASS`（库先把 missing 消化了），
   而 `absentNeverOpenedByGate=3846` 不变 ⇒ **终验必须至少跑一发"不配库"的全域**，
   否则 `帧不存在=144` 那格红会在面板上消失（这与既有认知"round-1 的 144 条只在无库格出现"同源，不是新问题）。
   两发的 `CORPUS_DENOM_BLINDSPOT` 必须都取到并逐字留存。
3. 终验**不要**默认加 `--strict`：加了它 `PROBLEMS` 会包含盲区那一格（实测 1→3），
   那是政策问题（要不要拿盲区当门禁），归编排方拍板，不归本车道。

### 7c. `scripts/qa/run-round7-closeout.mjs`（本轮收跑）
- 实测行为变化：`verify-evidence-corpus-round7`（`--scope` 本轮）**由改前的红变成 `PROBLEMS=0` exit=0**；
  `verify-evidence-corpus-history`（全域）**仍是 exit=1**（`PROBLEMS` 2→1，仍是 round-1 那 144 帧）。
  ⇒ 收跑台账**不得**把本轮轴的 PASS 读成"本轮证据都在盘上"，必须同发记录 `CORPUS_ADVISORY_FILE` 的点名
  （`选定删除集内缺席=N`）与 `CORPUS_DENOM_BLINDSPOT`。

### 7d. DSL（`dsl/*.feature`）与 bash 镜像
- 若要消费新行：**逐字锚定机器行名**（`CORPUS_DENOM_*`、`CORPUS_ADVISORY_FILE`），并**同步两条极性与退出码**——
  默认档 `absentNeverOpenedByGate>0` 仍是 exit=0；`--strict` 才是 exit=1。DSL 与 bash 必须同源，
  否则会出现"同一个门两把尺子"（本仓已有先例教训）。
- DSL 里任何"证据完好"的断言**不得**写成 `CORPUS_PROBLEMS == 0`；至少要 AND 上
  `CORPUS_DENOM_BLINDSPOT absentNeverOpenedByGate == 0`，否则 PASS 只说"没违规"、不说"东西还在"。

### 7e. 面板载体文件（`reports/audit/round-7/round7-gatepanel.md` / `panel-shaclass-r9.md` 等）
- 需要各加一行/一格承载三个集合的数（缺席 / 被点名 / 盲区），并注明取数时刻——
  **这些数是随盘漂移的**：本车道一小时内实测 `trackedAbsentFiles` 3849→3850→3851、
  被点名缺席 3→4→5 帧（并动车道仍在删）。引用必须绑时刻，不得写成常量。

### 7f. 聚合器预算（实测出来的约束）
- `run-qa-selftests.mjs` 每个测试 `spawnSync … timeout: 300000`。本测试**跑过**全域一发（113s）之后，
  老结构（两发全域 + 夹具）实测 **289s**，距被杀只剩 11s ⇒ 已把第二发全域换成窄 scope 档（16s/23s）。
  下游若再往任何自测里加全域 corpus 发数，必须同时重估这条 300s 预算。

### 7g. 本车道**没有**做、也不该由本车道做的事
- 没有恢复任何被删帧；没有改任何阈值；没有把 `PRE_STAMP` 的 4886→4882 漂移"修"回常量（§6a 给了归因证据）；
  没有改 L19/L20/L21 与 guest-landing 那三条车道的任何文件；没有 commit/add/checkout/stash/restore。
