# r9 面板车道：把 `CORPUS_SHA_CLASS` 三类接进面板读数（lane-shaclass-r9）

- 车道：面板侧，只改 `scripts/qa/emit-round-report.mjs` + 新建 `scripts/qa/test-panel-sha-class-axis.cjs` + 本文件
- 在册缺陷（原文）：`reports/audit/round-7/followups-v33.md:99` §5 ——
  「`emit-round-report.mjs` 目前只印 `CORPUS_EXPIRED_GITSHA` 这个合并数，而语料门已经能分三类
  （`CORPUS_SHA_CLASS resolvableOlder/unresolvable/empty`）。HEAD 每前进一次，那个合并数就涨一次，
  读的人分不清"历史轮本应定格"和"真断链"。补法在面板侧，本程面板车道正在改另一句红词，未越界代做。」
- 开局 HEAD：`1788675d`；本车道跑验证期间主控又落了提交（`94c286bf` → `740957e3` → `70472d92`）
  —— **这正是 §5 说的那件事本身**：合并数与 `resolvableOlder` 随 HEAD 前进，见 §2 的两次读数差。
- 未取任何设备租约之外的东西：两次面板都按 bash sweep 的形状跑，产物全部落 `.zcode/tmp/lane-shaclass-r9/`，
  没写任何 `reports/audit/round-7/*` 权威件（除本报告文件）。

## 1. 门侧的逐字事实（核对过代码，不采信任何人的拼写）

`scripts/qa/verify-evidence-corpus.mjs:328` 打的那一行，**字段名逐字照抄**（面板不重命名）：

```
CORPUS_SHA_CLASS resolvableOlder=<n> unresolvable=<n> empty=<n> :: frames resolvableOlder=<n> unresolvable=<n> empty=<n>
```

- 值形态：全部是十进制整数；`::` 之前是**清单级**（一份 manifest 计一次），`:: frames` 之后是**帧级**
  （该类清单的 `shots.length` 之和）。累加点在 :251-256：`expired*` 三个 + `frames*` 三个，互斥且穷尽
  （`if (!sha) … else if (!real) … else …`），所以「三类相加 == `CORPUS_EXPIRED_GITSHA`」是**代数恒等式**，
  面板据此做守恒核对（不相等 = 有一类被漏计/重复计 = 拆分不可信），不是新阈值。
- 合并数那一行 `:324`：`CORPUS_SCANNED=… CORPUS_EXPIRED_GITSHA=… CORPUS_PROBLEMS=…`，
  门自己的注释 `:325-327` 写明「不改这行一个字节，`emit-round-report.mjs:1332` 用 `num("CORPUS_EXPIRED_GITSHA")` 取数」。
- 相关配套行：`CORPUS_LEGACY_NO_SHA=<n> CORPUS_LEGACY_FRAMES=<n> …`（:333）。
  **`legacy ⊆ empty`**（:238 `legacyNoStamp` 要求 `!sha`），这一点决定了面板不能拿裸 `empty>0` 判红。
- **判决与退出码语义**（:258、:259-264、:341-345、:178-181、:277-280）——本车道一字未动，只是照抄方向：
  | 类 | 门内是否计红 | 依据 |
  |---|---|---|
  | `resolvableOlder` | **永不**（advisory） | 有戳且 `real` ⇒ `shaBlocked=!real&&!legacyNoStamp=false` |
  | `unresolvable` | **必红** | `shaBlocked=!real=true` ⇒ `fail++` |
  | `empty` | 仅 `empty−legacy` 红 | `legacyNoStamp` 只豁免「无戳 ∧ generatedAt 严格早于约定」 |
  退出码：`fail ∨ 硬编码 SHA≠HEAD ⇒ 1`（且硬编码那一支**只在没传 `--scope` 的全域跑里参与**，:298-300）；
  扫不到 manifest ⇒ 2；扫到但无带帧清单 ⇒ 2；其余 0。
  ⇒ 面板这条轴的"红"要么严格被门的红**蕴含**（两类证据红），要么是关于**面板仪器本身**（读数不可信），
  两种都不会把 advisory 读成红，也不会把红读成 advisory。

## 2. 基线（编辑前，逐字机器行）

```
$ node22 scripts/qa/emit-round-report.mjs --round-dir reports/audit/round-7 --sidecar-dir .zcode/tmp/lane-shaclass-r9/panel --report …/round-7-report.md --metrics …/round-7-metrics.json
UI_LEASE=released ok
REPORT_WRITTEN=.zcode/tmp/lane-shaclass-r9/panel/round-7-report.md lines=467
METRICS_WRITTEN=.zcode/tmp/lane-shaclass-r9/panel/round-7-metrics.json
EMIT_HEAD=1788675d execRows=1107 sideA=1107 sideB=0 sum=1107
EMIT_RESULT=OK 全部源可读、全部守恒断言通过      PANEL_EXIT=0

$ node22 scripts/qa/run-qa-selftests.mjs
SELFTEST_DIR=qa/test-*  发现=35  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe
SELFTEST_RAN=34 SKIPPED=1 FAILED=0 NO_SUMMARY_LINE=0 覆盖文件=35/35
GATE_SELFTESTS_RAN=1 GATE_SELFTESTS_FAILED=0
SELFTEST_RESULT=PASS（34 个离线测试 + 1 条门自检全绿，1 个 UI 绑定测试按策略跳过）
```

> 主控给的 r8 读数是「34 离线测试 + 1 条门自检」；实测**发现=35 / RAN=34**（`发现` 数文件、`RAN` 扣掉
> `test-stop-flag.cjs` 那条 UI 绑定跳过项）。两个数都对，只是指的是不同的东西，本车道按 `发现` 记账。

基线时门自己的两类读数（面板当时**没有**拆，只有合并数）：

```
CORPUS_SCANNED=47 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=1
CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=1 :: frames resolvableOlder=9040 unresolvable=0 empty=144
（本轮 scope 版）CORPUS_SHA_CLASS resolvableOlder=32 unresolvable=0 empty=0 :: frames resolvableOlder=6994 unresolvable=0 empty=0
```
基线那次全域跑的 `CORPUS_PROBLEMS=1` 具名成因是 `reports/audit/round-7/exec-a-mock-final/manifest-detail.json
共 650 帧 :: 帧不存在=1`（**帧轴**上的洞，与 gitSha 无关，且在我改动之前由另一条车道在写那个目录；
改后的面板复跑同一清单 `PROBLEMS=0` —— 那条帧回到盘上了。记下来免得被读成本车道的功劳或过错）。

## 3. 面板侧改了什么，为什么（`emit-round-report.mjs`，+183/−9）

一条口径只留一份实现：报告路径与 `--sha-class-selftest` 用同一个解析器、同一份渲染、同一条机器行。

1. **新增这条轴的四个函数**（放在 `--dup-axis-selftest` 之前，与 `rawDupAxisRecord`/`dispoAxisRecord` 同族）：
   - `measureCorpusShaClassAxis(body, leg, gateExit)` —— 拆 `CORPUS_SHA_CLASS`，产三个具名读数 +
     派生数 `emptyBlocked=max(0, empty−legacy)` + 判决。值不是整数的类**记"读不到"**而不是 0。
   - `shaClassAxisCountLine(ms)` —— 正文那条可读汇总，**显式写出 `resolvableOlder` 是"预期随 HEAD 增长、
     这条增长不是衰减"**，并写明判"链断没断"看的是 `unresolvable` 与 `empty−legacy` 两个数。
   - `shaClassCell(m)` —— H 节表格那两格里的三类点名（同一个"预期随 HEAD 增长"标注）。
   - `shaClassMachineLine(m)` —— 机器行 `EMIT_SHA_CLASS … expected_to_grow=resolvableOlder axis_red=yes|no`，
     把免责标注也写给机器读，不只写在散文里。
2. **两把语料门各拆各的**（`G.shaClass=[global, scoped]`，接在 `G.corpusScoped = runGate(…)` 之后）。
   顺带纠出一处旧面板的漏印：**`--scope` 那一行从前连 `EXPIRED_GITSHA` 都没印**（全域行印了），
   即本轮证据的过期数在面板上根本看不见；现在两行都有 merged + 三类。
   两类不并成一条通过率（全域是历史口径、scope 才否决本轮）。
3. **红的两种来源，各走各的通道**：
   - **读数失效**（类行缺失 / 类值不是整数 / 三类相加≠合并数 / `legacy>empty`）⇒ `ERRORS` ⇒ `EMIT_RESULT=FAIL`。
     这条是面板自己的老规矩（文件头 :11「取不到就写取不到并把退出码置非零」）。**合并数在、拆类没量到，
     就是从今往后仍然分不清"定格"与"断链"**，所以它必须能让面板红，而不是打一个 `未量` 就算交代。
   - **两个证据类非零**（`unresolvable`、`empty−legacy`）⇒ 进「一条不藏」`OPEN` 并逐字写出红因，
     **不重复进 `gatePanel`**。理由：门 `:258` 决定了这两类非零时 `CORPUS_PROBLEMS` 必然已 `fail++`，
     scoped 那条本就在 `gatePanel` 里、全域那条已在 :1449 的"历史口径红"里；再计一次就是本文件 H 节
     口径注 ③ 明写的「重复计同一个洞只会让面板数字失真」。（本车道在配对自检 F 节钉了这条不越界：
     断言 `gatePanel` 数组里没有 `shaClass`。）
   - `resolvableOlder` **永不判红**，且带"预期随 HEAD 增长"的标签。
4. **合并数 `CORPUS_EXPIRED_GITSHA` 保留打印、不退役**（决定与理由）：门 `:324` 那行没改一个字，门自己的
   注释 `:325-327` 写明面板靠它取数 —— 退役它是**跨车道改契约**，且它是守恒核对的分母（没有总数就没法发现
   某一类被漏计）。它从今天起**只当总数用**，"坏了几处"由两个断链类回答。
5. **新增 `--sha-class-selftest`（+ 两个只给自检用的旋钮 `--sha-class-root` / `--sha-class-body`）**，
   形状照抄 `--dup-axis-selftest` / `--queue-dispo-selftest`：只 spawn 只读门（门自己有 `--root` 夹具旋钮，
   见其 :105-109「自测专用，生产不传 ⇒ 行为与逐字改前一致」），**不取 UI 租约、不写任何文件、不进报告路径**。
   `--sha-class-body` 存在唯一的理由：真门永远会打那行类，"仪器坏了"那四种形状不回放在就造不出负例。
   `verify-dry-no-lease` 复量：`DRYLEASE 扫描=173 clean=15 no-dry=158` → `DRYLEASE_RESULT=OK`
   （改前基线 `扫描=172 clean=15 no-dry=157` → OK；多的那 1 个文件是本车道新自检，`no-dry` 随之 +1）。
6. **把 `runGate` 里的 `kv`/`num` 提到顶层 `gateKv`/`gateNum`**，两条路径共用一把尺子（正则原样搬，
   行为逐字不变）。不这么做就得为回放另写一份取值逻辑，"自检里绿的那次"量的就不是报告里那次数了。
7. 文件头用法块补了三个新旗标的说明（含"不是生产默认值，报告路径不传"）。

### 改后实跑（同一形状，sidecar/report/metrics 全指 `.zcode/tmp/lane-shaclass-r9/panel2/`）

```
EMIT_HEAD=740957e3 execRows=1107 sideA=1107 sideB=0 sum=1107
EMIT_SHA_CLASS leg=global merged=47 resolvableOlder=46 unresolvable=0 empty=1 frames_resolvableOlder=9040 frames_unresolvable=0 frames_empty=144 legacy=1 emptyBlocked=0 class_sum=47 conserved=yes split=measured gate_exit=0 expected_to_grow=resolvableOlder axis_red=no reds=0
EMIT_SHA_CLASS leg=scoped merged=32 resolvableOlder=32 unresolvable=0 empty=0 frames_resolvableOlder=6994 frames_unresolvable=0 frames_empty=0 legacy=0 emptyBlocked=0 class_sum=32 conserved=yes split=measured gate_exit=0 expected_to_grow=resolvableOlder axis_red=no reds=0
EMIT_RESULT=OK 全部源可读、全部守恒断言通过      PANEL_EXIT=0
```
H 节两格现在逐字长这样（旧行只有一个 `EXPIRED_GITSHA=47`）：
```
| `verify-evidence-corpus（全域）` | **0** | MANIFESTS=53 SCANNED=47 EXPIRED_GITSHA=47 PROBLEMS=0 拆类 resolvableOlder=46【预期随 HEAD 增长，非衰减】 unresolvable=0【非 0 即断链】 empty=1（legacy 豁免 1 ⇒ 未豁免 empty=0） 帧轴 resolvableOlder=9040 unresolvable=0 empty=144 相加=47 vs 合并 47 → CORPUS_RESULT=PASS（…） | … |
| `verify-evidence-corpus（本轮 scope）` | **0** | MANIFESTS=37 SCANNED=32 PROBLEMS=0 拆类 resolvableOlder=32【预期随 HEAD 增长，非衰减】 unresolvable=0【非 0 即断链】 empty=0（legacy 豁免 0 ⇒ 未豁免 empty=0） 帧轴 resolvableOlder=6994 unresolvable=0 empty=0 相加=32 vs 合并 32 → CORPUS_RESULT=PASS（…） | … |
```
读法演示（就是 §5 要消灭的那种误读）：全域 `merged=47` 里 **46 是历史轮定格、1 是无戳但已被打戳约定豁免**，
所以 47 处长得一样却**零处断链**；HEAD 从 `1788675d` 走到 `740957e3` 期间 `resolvableOlder` 随时可能继续涨，
那是预期，不是衰减。

**"涨"这一件事当场量到了**（同一份从没被人碰过的历史清单，同一条判据，只是 HEAD 前进了 4 枚）：

```
HEAD=1788675d  reports/audit/round-1/screenshot-manifest.json gitSha=aefd8a72
               → 非当前HEAD→按契约过期(可解析=175个提交前的历史 ⇒ 不判红…)
HEAD=70472d92  同一份、同一个戳 aefd8a72
               → 非当前HEAD→按契约过期(可解析=179个提交前的历史 ⇒ 不判红…)
```
证据一个字没变，"过期"的量却 +4 —— 合并数 `CORPUS_EXPIRED_GITSHA=47` 与 `resolvableOlder=46` 在这种推进里
随时会变大（一旦某份清单的戳记被新的 HEAD 甩到身后，它就从这个类里 +1）。
**这就是为什么"预期增长"必须写成读数的一部分而不是靠读者记住**：现在它同时出现在
H 节那一格（`【预期随 HEAD 增长，非衰减】`）、正文汇总行、以及机器行的 `expected_to_grow=resolvableOlder`。

> 同一次全域跑里 `CORPUS_PROBLEMS=1` 的具名成因是
> `reports/audit/round-7/exec-a-mock-final/manifest-detail.json 共 650 帧 :: 帧不存在=1` ——
> **帧轴**上的洞，与 gitSha 拆类无关，且它在我这一趟之间来回出现/消失（23:06 那次面板读到 0，
> 现在又读到 1；同一时刻 `apps/client/dist` 正在被别的车道重建）。本车道没碰那份目录，读数照实记。
>
> **登记一条不属于本车道、但会污染任何读数盘的事实**（按"发现问题要落账"的规矩写在这里，处置交主控）：
> 现在工作树里有 `reports/screenshots/round-7-A-mock-final/*.png` 处于 `D`（工作树已删、尚未入库）状态，
> `git status --short` 里能数到；这正是上面那条 `帧不存在=1` 的来源，也会让
> `test-evidence-store-axis.mjs` / `verify-real-coverage` 一类读数继续飘。
> **本车道一次都没有删过证据/帧/文件**（写盘范围只有 `.zcode/tmp/lane-shaclass-r9*`、
> 按 pid 的 `.zcode/tmp/panel-shaclass-*` 与本报告文件），也没去动那些 `D` 项 —— 恢复还是坐实由主控裁。

## 4. 负例自检能变红的证明（`scripts/qa/test-panel-sha-class-axis.cjs`）

命名对上了聚合器自己的选择式（`run-qa-selftests.mjs:25` 逐字：
`readdirSync(HERE).filter((f) => /^test-.+\.(cjs|mjs)$/.test(f))`）⇒ `发现` 数自动 +1，无需接线：

```
改前（基线）：SELFTEST_DIR=qa/test-*  发现=35   SELFTEST_RAN=34 SKIPPED=1 FAILED=0 NO_SUMMARY_LINE=0 覆盖文件=35/35
                                    GATE_SELFTESTS_RAN=1  → SELFTEST_RESULT=PASS（34 个离线测试 + 1 条门自检全绿，1 个 UI 绑定测试按策略跳过）
改后（收口跑）：SELFTEST_DIR=qa/test-*  发现=36  SELFTEST_RAN=35 SKIPPED=1 FAILED=2 NO_SUMMARY_LINE=1 覆盖文件=36/36
                                     GATE_SELFTESTS_RAN=2  → SELFTEST_RESULT=FAIL（2/37 个离线测试与门自检未过）
本把自检在聚合器里的那一行（逐字）：
PASS  test-panel-sha-class-axis.cjs  exit=0  断言失败数=0  PNSHA_TEST=PASS  42s
```
`发现` 35→36、`RAN` 34→35 就是"聚合器确实收到了它"的证明（`覆盖文件=36/36` 守恒行也在）。
（`GATE_SELFTESTS_RAN` 1→2 不是本车道加的：`run-qa-selftests.mjs` 是别的车道在改，它新接了
`verify-case-automatable --selftest`，本车道没碰那个文件。）

**改后那 2 条 FAILED 没有一条是本车道造成的**，两条都在聚合器之外单独复量过：

| 红 | 在聚合器里的样子 | 单独复跑 | 结论 |
|---|---|---|---|
| `test-signal-flush.cjs` | `FAIL B: 自我触发后打了 EXEC_SIGNAL 落盘行 :: … EPERM: operation not permitted, rename 'tmp\qa\checkpoints\exec-R97.json.tmp-…'` | `SIGFLUSH_SUMMARY checks=6 fail=0` → `SIGFLUSH_TEST=PASS` exit=0 | Windows 上 `tmp/qa/checkpoints` 的 rename 撞车（同一时刻有别的进程在动那个目录），是**并发瞬断**，不是判据 |
| `test-evidence-store-axis.mjs` | `exit=1 无自报断言计数` 248s | 单独跑也红：`FAIL 2 库可达：PROBLEMS 仍等于基线 … PROBLEMS=0 基线 P0=2` → `EVS_SUMMARY cases=16 fail=1` | **这条是真红，成因在本车道之外**：工作树里的 `reports/screenshots/**` 正在被删（`git status` 里有成批 `D` 项，见 §3 末尾那条登记），盘上缺的帧改由仓外库 `D:\6\love-mini-evidence`（3497 枚对象）按哈希背书 ⇒ PROBLEMS 从 2 掉到 0，而该断言要求"库不豁免既有问题"两侧相等。要谁处置：截图出库/删除这条决定的人（主控） |

> 交主控的一句话：这两条红都在"别人正在改工作树"的窗口里量到，`run-final-verify-v33.sh` 单独跑一遍
> 才能把 `test-evidence-store-axis` 那条钉成事实（它要么需要把那批帧从库里请回盘上，
> 要么需要那条断言承认"库背书过的缺帧不算红"—— 后者是改判口径，不由本车道自决）。


全程离线：夹具只写 `.zcode/tmp/panel-shaclass*`，一次都不取 UI 租约、不碰 `reports/**`。
62 条断言，四个方向都当场量到（A 绿 / B 红 / C 红 / D 不红 + E 四种仪器失效 + F 接线 + G 替身反证 + H 残留复核）：

```
  ok   A 可解析的旧戳：面板轴 exit 0（不判红）
  ok   A 轴具名读数点名：merged=1 且全部落在 resolvableOlder
  ok   A 轴机器行自带 expected_to_grow 标签（写给机器读，别只写在散文里）
  ok   B 解析不到的戳：面板轴 exit 1（这条轴会红，不是只印一个数）
  ok   C 约定之后生成的无戳清单：面板轴 exit 1
  ok   D 约定之前的无戳清单：面板轴 exit 0（legacy 豁免生效，红没被误放大）
  ok   E1 类行缺失：轴 exit 1（合并数在、拆类没量到 ⇒ 不许当绿）
  ok   E1 读数写成「未量」而不是 0（0 会被读成「没有断链」，那正是空轴的形状）
  ok   E3 三类相加(46)≠合并数(47)：轴 exit 1（有一类被漏计 ⇒ 拆分不可信）
  ok   E4 legacy>empty（不可能，legacy 是 empty 的子集）：轴 exit 1 并点名两把尺子对不上
```

**RED 能力＝翻转谓词符号的替身，同一条输入上替身必须变绿**（活文件一个字不改，替身只住 `.zcode/tmp/panel-shaclass-mut/`，
每个替身与活文件只差 4 行 = 1 处谓词翻转 + 3 处机械定位）：

```
  NEGATIVE_PROOF[把「unresolvable>0 判红」翻成「<0」]        live_exit=1 mutant_exit=0
  NEGATIVE_PROOF[把「empty−legacy>0 判红」翻成「<0」]        live_exit=1 mutant_exit=0
  NEGATIVE_PROOF[把「相加!=合并数 判红」翻成「==」]           live_exit=1 mutant_exit=0
  ok   G 活文件在整套反证过程里逐字节未变（只动 .zcode/tmp 下的替身）   （sha256 前后相等）
```
即：三条红各自由一个**单独的谓词**撑着，把那个谓词翻掉就绿 ⇒ 断言不是恒真摆设，也不是"什么都红"假装严格
（A/D 两条必须绿同样被钉在断言里）。

真码上跑绿（standalone 复跑，`PNSHA_SUMMARY cases=62 fail=0 … conv=2026-09-24T16:31:39.0000 platform=win32`
⇒ `PNSHA_TEST=PASS`，exit 0；§5 的替身反证里三个 `NEGATIVE_PROOF` 都是 `live_exit=1 mutant_exit=0`）。

### 替身已删除的复核（`ls` 留证）

```
$ ls .zcode/tmp/ | grep -i "panel-shaclass"
（无输出，grep exit=1 ⇒ 没有任何 panel-shaclass 夹具/替身目录留在盘上）
$ ls scripts/qa | grep -c "_mutant-"        # 活目录里从来没有替身
0
```
自检的 H 节还内建了同样的复核（`!existsSync(MUT)`、按仓库相对路径再问一次、
`scripts/qa` 里没有 `_mutant-`、夹具目录已删），跑绿即等于当场证明过。

### 本车道自己踩到的两次（如实记，不粉）

**① 断言标签抢走了聚合器的判决位。** 第一版有一条断言标签写了 `… ⇒ EMIT_RESULT=FAIL` 原形，
被 `run-qa-selftests.mjs:52` 的 `\b([A-Z]{2,8})_(TEST|RESULT)=(PASS|FAIL)\b` 抢在 `PNSHA_TEST=PASS` 之前命中
⇒ 一条 61/61 全中的自检被聚合成 `FAIL`（`FAIL test-panel-sha-class-axis.cjs exit=0 断言失败数=0 EMIT_TEST=FAIL`
—— 数字与判决自相矛盾，正是这条正则的形状）。修法不是改标签措辞的记忆力，而是让 `ok()` 对**标签也**过 `brk()`：
纪律落到代码里才管用。改后本自检输出里第一个且唯一一个可见判决 token 是 `PNSHA_TEST=PASS`。

**② 固定夹具目录在并发下互踩（本车道造成的那次红）。** 第一次全量聚合器复跑（`selftests-after2.txt`）里
本自检报 `Error: ENOENT … \.zcode\tmp\panel-shaclass-mut\_mutant-emptyBlocked-emit-round-report.mjs`
（`exit=1 无自报断言计数`），同一趟里 `test-corpus-legacy-window.cjs` 报 `bad=2`。
成因不是判据，是**两个跑的人互相抹**：自检开头 `rmSync(FX/MUT)`、结尾再 `rmSync`，
路径按名字固定 ⇒ 同时跑两遍聚合器（主控收尾一遍 + 车道手上一遍）时，晚到那份的启动清理会删掉正在写的那份的替身。
⇒ 本把自检改成**目录按 pid 命名**（`panel-shaclass-<pid>` / `panel-shaclass-mut-<pid>`），谁也不碰谁；
收尾复核也改成"只点名问本 pid 的目录"（别人的 pid 目录不算残留）。
并发双跑实测（同机同时开两份）：

```
A_EXIT=0   PNSHA_SUMMARY cases=62 fail=0 …   PNSHA_TEST=PASS
B_EXIT=0   PNSHA_SUMMARY cases=62 fail=0 …   PNSHA_TEST=PASS
$ ls .zcode/tmp | grep -i "panel-shaclass"     # 跑完两份都清干净
（无输出，grep exit=1）
```
> **交给主控的一条旁话（不在本车道可写域，没动）**：`test-corpus-legacy-window.cjs` 用的是同一族固定路径
> （`.zcode/tmp/corpuslegacy*`），所以它在并发跑聚合器时**天然会假红**（本次实测就是它）。修法与本车道同形
> （目录按 pid），归它自己的车道。同一趟里 `test-evidence-store-axis.mjs` 300s 超时（`exit=null`）、
> `test-native-hook-route.cjs`/`test-source-shape-absence.mjs` 报"产物被构建脚本临时改写 / 3 个文件被改动"
> —— 那个时刻 `apps/client/dist/build/mp-weixin/app.js` 正在被重建（mtime 00:09），是**并发在改工作树**，
> 不是判据坏，也不是本车道所为。

## 5. 未改动的东西（not changed）

- `scripts/qa/verify-evidence-corpus.mjs` —— **一字未动**（`git diff` 里它不出现）。三类怎么分、
  `shaBlocked` 怎么判、`CORPUS_PROBLEMS` 怎么数、`CORPUS_RESULT` 措辞、退出码 0/1/2 的语义全部原样。
- 任何判据**阈值**与任何**判决措辞**：面板里 `gatePanel` 成员集合、`本次仍判红 N/M` 的分母、
  `RAW_DUP_AXIS`/`DISPO_AXIS`/`QUEUE_PLAN_AXIS` 三条既有否决轴、G7/G8/G9/probe 实时腿、
  i18n 棘轮、`CONSERVE` 既有的 22 条 —— 都没动（新轴**没有**加进 `gatePanel`，见 §3.3，F 节钉住了这点）。
- `--dry` / 租约 / 落点语义：`DRY`/`SKIP_LIVE` 分支、`acquireUi` 守卫形状、
  `--sidecar-dir`/`--report`/`--metrics` 的默认与写入目标，全部未改；新增自检旗标不写盘、不取租约，
  `verify-dry-no-lease` 复量 `DRYLEASE_RESULT=OK`。
- 别的车道的文件：`.zcode/workflows/*.dwf.ts`、`scripts/qa/apply-ops-cellplans.mjs`、
  `reports/audit/round-7/ops/**`、两份既有自检 `test-corpus-sha-axis.cjs`/`test-corpus-legacy-window.cjs` —— 未碰。
- 没有删除任何证据、帧或文件；两次面板跑产物都写进 `.zcode/tmp/lane-shaclass-r9/`（panel=基线、panel2=改后），
  权威件 `reports/audit/round-7/round-7-report.md`、`…-metrics.json`、`guest-landing-booked.json` 等未被本车道覆写。
- `run-qa-selftests.mjs`（聚合器）未改 —— 它按文件名自动收，本车道只把新自检命名成那个形状。
- 全量 bash sweep `scripts/qa/run-final-verify-v33.sh` **没有跑**（按主控要求由主控在收齐后跑）。
