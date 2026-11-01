# 第六轮 修复车道 W4：五条从未有人跑过的存量红 —— 定性与收口

- 车道：W4（QA 红定性车道）
- 仓库：`D:\6\恋爱小程序`
- HEAD：`8d5aecb0`
- 日期：2026-11-01
- 范围：`scripts/qa/**`（不含 `scripts/qa/verify-i18n-orphan.mjs`，另一车道在改）
- 载具：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/run-qa-selftests.mjs`
  - 裸 `node` 在本机是微信工具自带 v16.13.1，会得 `SELFTEST_RESULT=NOT-EVIDENCED`；本车道全程用 v22 绝对路径。

## 0. 背景（这五条是怎么冒出来的）

第六轮 C 泳道判出「`scripts/qa` 下 102 个门形态件 + 56 个自检件既不在链也不在 CI，唯一载具只出现在注释里」。
本轮主控第一次把聚合载具真跑完一发（64 个离线件）：`SELFTEST_RESULT=FAIL（5/64 个离线测试与门自检未过）`，1 条显式 SKIP（`test-stop-flag.cjs` 需 UI 租约）。
⇒ 这五条与本轮改动无因果关系，是「建了没人跑」的实测代价，此前一直没人知道。

## 1. 分类纪律（三类不许混）

- (a) 载具/环境所限：输入件缺失、需要租约、需要证据库 —— 不许靠加豁免或放宽阈值收掉；
  该保留为红的如实保留，把「需要哪台机器/哪个库/哪个租约」写成机器可读的 NOT-EVIDENCED 形态
  （新判值必须落进消费者已有的分桶词表，否则等于免检）。
- (b) 尺子坏了：判据过期、解析器形状变了、恒 0/恒过的空转判点 —— 可代码闭合。
- (c) 产品或台账真缺陷 —— 可代码闭合（台账侧）或成交接项（页面侧，只读不改）。

## 2. 逐条定性

改前基线（本车道自己复量，非转述）：
`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/run-qa-selftests.mjs`
⇒ `SELFTEST_DIR=qa/test-* 发现=55`、`SELFTEST_RAN=54 SKIPPED=1 FAILED=5 NO_SUMMARY_LINE=0 覆盖文件=55/55`、
`GATE_SELFTESTS_RAN=10 GATE_SELFTESTS_FAILED=0`、`SELFTEST_RESULT=FAIL（5/64 个离线测试与门自检未过）`、exit 0→载具判决行本身 FAIL。
五条红的**断言失败数**与派单表逐条一致（2 / 14 / 10 / 7 / 3）。

### 2.1 `test-corpus-denominator.cjs`（红数 2）—— 归 (b) 尺子坏了（两条恒不成立的过期前提）

- 我实际跑的命令：
  - `D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/run-qa-selftests.mjs`（取聚合读数）
  - `node22 .zcode/tmp/w4-corpus-probe.cjs`（用与本测试 148-201 行**完全同源**的算法独立复算一遍集合，不改任何判据）
- 读数：
  - 门：`neverOpened=8264`、`trackedAbsent=11452`、`namedByGate=3188`、当前具名缺席 `namedAbsent=144`、`absentNamed=0`
  - 复算：`stillGone=11451`、`restoredCount=1`、`restoredUnnamed=1`、`namedInAbsent=3188`、`restoredNamed=0`
  - 红 1（`test-corpus-denominator.cjs` 的 `A BLINDSPOT 余数==已出册 + 回盘但未被点名的`）：`11451+1=11452 ≠ 8264`
  - 红 2（`A 历史删除账里被清单点名的路径全部已回盘（5/5…）`）：`具名历史=3188 已回盘=0`
- 归因：这两条断言共用**同一个已经不可能成立的前提**——「凡被清单点名、又在历史删除账里的路径，都已回到索引」
  （即 `namedInAbsent === restoredNamed`，`namedStillGone = namedInAbsent - restoredNamed = 0`）。
  该前提在 2026-10-28 重钉时成立（`absent` 里被点名的只有 04a0a221 放回的 5 张 round-7 帧，5==5）。
  盘面之后被两件事推翻，且都**不是退化**：
  1. `268e1c08 chore(repo): untrack 7,980 ignored artifacts` 把包括那 5 张帧在内的在册产物整体撤出索引
     —— 这是执行用户 2026-09-30「截图不入库」裁定的收口动作（`reports/**.png` 现为全局忽略件）；
     实测 `reports/screenshots/round-7-A-mock-final/` 盘上仍有 650 个文件（**帧没丢，只是不再入库**），
     `git ls-files -- reports/screenshots/round-7-A-mock-final` 为空（**不再被跟踪**）。
  2. 清单语料本身长大（manifest 遍历到的具名路径数上升），使 `namedInAbsent` 从 5 涨到 3188。
  ⇒ 门的读数自洽且正确（`neverOpened == trackedAbsent - namedByGate` 那条对账恒等式一直是绿的）；
  错的是测试把「被点名者必已回盘」当成长期不变量。**两种红的动作相反**：这里若误判成 (c)「证据又丢了一次」，
  动作会是把 3188 条重新 `git add` 回索引 —— 那正好违反用户的「不入库」裁定与「禁全仓还原」纪律。故本次只动尺子。
- 动作（已改判据，见 §3.1）：
  - 余数恒等式补上被漏掉的那一项：`neverOpened == stillGone - (namedInAbsent - restoredNamed) + restoredUnnamed`
    （实测 `11451-3188+1=8264`，与门逐位相等；原式在 `namedStillGone=0` 时与本式等价，故这是**收紧**不是放宽——
    它多了一项必须为 0 才允许旧式成立的隐含前提，现在被显式写出来）。
  - 把「全部已回盘」的群体断言换成**具名棘轮**：只钉 04a0a221 放回、`exec-A-mock-final/manifest-detail.json`
    按名引用的那 5 张 `PAGES-DISCOVER-INDEX-DC01~05-after.png` **仍在盘上且非空**（被删即红），
    并把「已出册 / 仍未出册」拆成可 grep 的报数行；标签里写死的 `3964+1=3965`、`5/5` 改为现量插值。

### 2.2 `test-guest-landing-writeguard.mjs`（红数 14）—— 归 (c) 台账真缺陷（与 2.3 同一条根因，保留为红）

- 我实际跑的命令：`node22 scripts/qa/test-guest-landing-writeguard.mjs`；
  A/B：`node22 -e "<删掉 policy 里 subpackages/tools/security/index 那一行裁定>"` 后
  `node22 scripts/qa/verify-guest-landing.mjs --policy <临时件> --triage .zcode/tmp/triage-r7-guest.json --out <临时件>`
- 读数：14 条全红，S1 首行 `载具真的撞到设备桩并崩了（exit 非 0 + 桩里记下 clearSession 调用）:: exit=2 桩=`（**桩里一个字节都没记**）；
  S7 的详情直接打出 `GUEST_LANDING=FAIL 先修这几条再来量（带病出腿 = 白拿租约）`。
- 归因：`exit=2` 不是设备桩失败、也不是租约问题。`verify-guest-landing.mjs` 的 `problems` 在 `buildPlan()`
  （:383）里就已填满，而 `--mode measure` 分支把「带病即退」（:392）放在**触碰设备之前**（:394 才 acquireUi）。
  ⇒ 载具副本在撞到设备桩之前就退了，桩自然是空的，14 条断言全部级联红。这是**守卫正常工作**，不是仪器坏。
  病根 = policy 第 30 条裁定 `subpackages/tools/security/index → pages/login/index`（family=guard-bounce，2026-10-31 P1 补进）
  在 ops 判据台上**一行都没有**：实测 ops 57 个在册页里 `subpackages/tools/security/index` 命中 0 行，
  而同批补进的 `subpackages/market/wallet/index` 有 11 行（全部未声明 identities ⇒ 走 2026-09-30 裁定 (a) 的整页证人路线）。
  该裁定不是空想：`securityCenterPageRequirements` 在 `apps/client/src/config/page-access.ts:70` 已实现，
  并由 `apps/client/src/subpackages/tools/security/index.vue:41` 的 `usePageAccess(...)` 消费 ⇒ **产品侧已修，台账侧漏登记**。
- A/B 证据：删掉这一条裁定后同一命令立刻 `GUEST_LANDING_RESULT=OK`、`exit=0`（rows 30→29）⇒ 14 条（连 2.3 的 10 条）
  全部由此单因造成，无一条例外。
- 动作：**保留为红，不加豁免**（本车道无权代业主撤裁定，`reports/audit/round-6/ops/**` 亦不在我的范围内、且正被另一条车道写）。
  成交接项 §4.1（补 ops 证人）。

### 2.3 `test-guest-landing.mjs`（红数 10）—— 归 (c) 同一条台账真缺陷（与 2.2 一根因，保留为红）

- 我实际跑的命令：`node22 scripts/qa/test-guest-landing.mjs`；并直接跑门体
  `node22 scripts/qa/verify-guest-landing.mjs --policy scripts/qa/guest-landing-policy.json --triage .zcode/tmp/triage-r7-guest.json --out /tmp/w4-probe-book.json`
- 读数：10 条全红，首行 `真数据 exit 0 :: exit=2`；门体三条 problem 点名
  `subpackages/tools/security/index → pages/login/index`「既不在本轮跑测的落地对里、ops 也没有任何证人」、
  「组 … 一名成员都没有」、「roster 组=29 ≠ policy 裁定组=30 ⇒ 有裁定出不了腿」。
  测试内 10 条红的读数全部指向同一个数：`rows=29 policy.rows=30`、`腿=29 唯一=29 policy 组=30`、`booked 组=29 measured 组=28`。
- 归因：同 2.2（(c) 台账登记缺口，产品已修、ops 未具名）。这 10 条**不是**尺子过期——门拒绝出腿的理由正是它该拒绝的理由；
  也不是载具所限（book 模式不碰设备、不抢租约，缺的不是环境而是台账行）。
- 动作：保留为红 + 交接项 §4.1。**不改 policy**（撤一条在力的裁定＝改政策，超出修复车道授权）。

### 2.4 `test-source-shape-absence.mjs`（红数 7）—— 归 (b) 尺子坏了（判点过期），**页面未退化，无需改页面**

- 我实际跑的命令：`node22 scripts/qa/test-source-shape-absence.mjs`；
  `node22 scripts/qa/verify-source-shape.mjs --dry`；
  `node22 .zcode/tmp/w4-cs26-probe2.mjs`（以 `QA_SHAPE_LIB=1` 借门自己的 `templateOf/stripComments/runChecks`，
  逐条 CS26 判点单独跑，避免第二台解析器）
- 读数：7 条红 = `B CS26 判点在盘上成立`（1 条真红）+ `C6 CS26 红来自被注入的那个承载` × 4 + `F0 干净活树上门 exit 0` + `F7 撤掉注入档后回绿`。
  门：`SRC_SHAPE total=99 成立=80 不成立=19`、`SRC_SHAPE_CRIT 判据台行=8 成立=7 不成立=1`、
  `SRC_SHAPE_NEG 注入点=44 已变红=44 咬不动=0 没挂负例的判据行=0`。
  唯一失败的判点是 CS26 源码侧第 4 条
  `{kind:"countTemplateEq", re:/class="chat-list"[\s\S]{0,8500}class="wechat-input-bar__input"/g, n:1}`：
  门自己的 `templateOf` 口径实测该间距 **8691 字符**，窗口 **8500** ⇒ 越窗 191 字符，计数落 0。
  CS26 其余 5 条源码判点、mock/real 两档各 6 条判点**全绿**（逐条单独跑过，不是被首条遮蔽）。
- 归因：这条判点测的是「输入栏离 `chat-list` 开口够不够近」，而盘上结构是
  `chat-list`（消息流区）与 `chat-input-area`（输入区，:2265）**互为兄弟节点**，输入栏从来不在 `chat-list` 子树里
  ⇒ 该字节窗口**从来没有证明过 claim 写的那条不变量**，只是把「上一版版面的字面距离」钉成了判据；
  消息流区每多写一行 markup，它就无关于产品好坏地漂一次窗（2026-10-24 钉的是 696/8996 配 760/8500）。
  而 claim 的真正不变量「`pageErrorMessage` 为真 ⇒ 输入栏结构性不可达」在盘上**成立**：
  `:2269 <view v-if="pageErrorMessage" class="chat-input-error">`（只出「返回 / 消息」两枚按钮）
  ↔ `:2291 <template v-else>` → `:2356 class="wechat-input-bar__input"`，同链互斥；全页输入栏恰 1 枚（countEq 绿）。
  ⇒ 判为 (b)「尺子旧」，不是 (c)「被断言缺席的物件回到盘上」。门体 RESULT 行那句
  「被断言缺席的物件回到了盘上」是 criteria 行不过时的**通用文案**，不构成物件回归的证据（这点必须写清，
  因为按它去「修页面」会把一条正确的守卫改回去）。
  `C6 × 4` 与 `F0/F7` 是级联：src 侧先红，注入档的红点就被归到 src 而非被注入的 mock/real 件；
  F0/F7 要的 `exit 0` 也确实只因 CS26 才破（门 :1933/:1947 的既有语义：台账行不过 ⇒ `PARTIAL` 且 **exit 0**，
  只有 criteria 行不过才 exit 1 ⇒ 那 18 条台账红**不该**被算进 F0 的前提，本测试没有错，不动它）。
- 动作（已改判据，见 §3.2）：把这条 proximity 代理换成 claim 声称的那个结构命题，并给它配一个真能红的案例。

### 2.5 `test-source-shape-lg31.mjs`（红数 3）—— 归 (b)：跑起来了，是**判据行词根不合消费者词法**（既非没跑起来，也非改名）

- 我实际跑的命令：`node22 scripts/qa/test-source-shape-lg31.mjs`；
  `git log -S "LG31_TEST" -- scripts/qa/test-source-shape-lg31.mjs`
- 读数：`LG31_SUMMARY cases=124 fail=3`、`SUMMARY: assertion failures = 3`、`LG31_TEST=FAIL`、exit=1；
  聚合器行：`FAIL test-source-shape-lg31.mjs exit=1 断言失败数=3 无 *_TEST= 判据行`。
  三条红是 `F0b 干净活树上门 exit 0`、`F6 撤掉变异副本后活树回绿`、`F7 判据台行在活树上全成立`，
  详情逐字为 `SRC_SHAPE_RESULT=FAIL reason=判据台缺席判点不成立（1 条：CS26）` ⇒ **与 §2.4 同一根因，纯级联**。
- 「没跑起来 vs 契约改名」判据：
  - 不是没跑起来 —— exit=1、`assertion failures = 3` 都被聚合器正常取到（`mNew` 命中），124 个 case 真跑了。
  - 也不是改名 —— `LG31_TEST` 自该文件诞生（`992f0fe8`）就是这个词，从未变过。
  - 真相是第三种，且修法与「放宽消费者」相反：**消费者的词法一直是 `[A-Z]{2,8}`（只允许字母），
    而生产者用了带数字的词根 `LG31`**，所以这条判决行从来就没被读到过。聚合器
    `run-qa-selftests.mjs:69` 的 `/\b([A-Z]{2,8})_(?:TEST|RESULT)=(PASS|FAIL)\b/`；
    该形状在仓里是**写在测试自己纪律段里的成文约定**（`test-corpus-denominator.cjs:59-61`
    「聚合器取输出里第一个 `[A-Z]{2,8}_(TEST|RESULT)=`，引用判据名一律写成 `CORPUS-RESULT`」、
    `test-source-shape-absence.mjs:20-21` 同规）。⇒ 不合约定的是生产者，不是尺子读少了。
  - 危险等级要说清：今天它**没有**造成假绿（exit 码与断言计数两条独立闸已经把这 3 条判成红）。
    但它是一个静默的空洞：聚合器那句 `ok = exit===0 && cnt===0 && !(selfVerdict && selfVerdict[2]!=="PASS")`
    里第三把闸对本文件等于不存在 ⇒ 若本文件哪天真出现「退 0 却自报 FAIL」，聚合器抓不住。
- 动作（已改生产者，见 §3.3）：**不动聚合器的判据行正则**（:64-66 明写「只放宽取数那把尺子，
  `*_TEST=/*_RESULT=` 匹配保持原样，判据极性不随这次改动漂移」，放宽词根字符集会改变全部 55 个文件的判据极性口径），
  改为把本文件的判决词根换进消费者已有的字母词根词表：`LG31_TEST` → `NONFRAME_TEST`
  （8 字母、≤8 的既有分桶形状，取自本测试自己的临时目录名 `lg31-nonframe-r10b` 与
  `reports/audit/round-7/lg31-nonframe-r10b.md`；仓内除本文件的 3 个打出点外**无任何消费者**，实测 grep）。
  `LG31_READ`/`LG31_SUMMARY` 这两个**取数**行保持原样（聚合器 `\w{2,24}_SUMMARY` 本来就读得到，动它们只会打断已在读的轴）。

## 3. 修复与单件复量（改后即测）

只动了 **3 个文件**，全部在 `scripts/qa/**` 范围内（`git status --porcelain scripts/qa/` 实测）：
`verify-source-shape.mjs`、`test-corpus-denominator.cjs`、`test-source-shape-lg31.mjs`。
`test-source-shape-absence.mjs`、`test-guest-landing.mjs`、`test-guest-landing-writeguard.mjs` **一个字节没改**
（前者的红在门里，后两者的红在台账里，都不该由它们自己背）。

### 3.1 CS26 判点重钉（`scripts/qa/verify-source-shape.mjs`）

改了三处，一处判点 + 一条阳性对照 + 两段留痕注释（claim 也补了第二次重钉的理由）：

- 撤掉的过期谓词（源码侧第 4 条）：
  `{kind:"countTemplateEq", re:/class="chat-list"[\s\S]{0,8500}class="wechat-input-bar__input"/g, n:1}`
- 换成的结构谓词（就是 claim 声称的那句互斥）：
  `{kind:"countTemplateEq", re:/v-if="pageErrorMessage" class="chat-input-error"[\s\S]{0,1200}<template v-else>[\s\S]{0,4200}class="wechat-input-bar__input"/g, n:1}`
  窗口按门自己的 `templateOf` 口径当场量：`chat-input-error`→`<template v-else>` 实距 **727**（取 1200），
  `v-else`→输入栏 实距 **3109**（取 4200）；两窗只覆盖输入区子树，**不随消息流 markup 增长而漂**。
- 给新谓词配的阳性对照（不是留一个恒 0 空转判点）：
  `{file: src, removeRe:/v-if="pageErrorMessage" class="chat-input-error"/}` —— 该串在模板里恰 1 次（已实测，满足 `inject` 的唯一性前提），
  摘掉守卫 ⇒ 谓词失去起点锚、计数 1→0 ⇒ 当场红。
- 没有做的两件事（写清以免下一个人误读）：
  ① **没有把 8500 调大**——那只会把一个永不成立的谓词继续留在盘上；
  ② **没有改 `apps/client/**`**——按 §2.4 的实测，页面满足不变量，动页面就是把正确的守卫改坏。

单件复量（改后）：

| 读数 | 改前 | 改后 |
|---|---|---|
| `verify-source-shape.mjs --dry` exit | 1 | **0** |
| `SRC_SHAPE_CRIT 判据台行` | 8 成立=7 不成立=1 | 8 成立=**8** 不成立=**0** |
| `SRC_SHAPE total` | 99/成立 80/不成立 19 | 99/成立 **81**/不成立 **18**（余下 18 条是台账行，按门既有语义走 `PARTIAL`＋exit 0，别的车道在读，本轮不动） |
| `SRC_SHAPE_NEG` | 注入点=44 已变红=44 咬不动=0 | 注入点=**45** 已变红=**45** 咬不动=0 |
| `test-source-shape-absence.mjs` | cases=265 fail=**7** exit=1 | cases=**268** fail=**0** exit=**0** |
| `test-source-shape-lg31.mjs` | cases=124 fail=**3** exit=1 | cases=124 fail=**0** exit=**0** |

absence 的 cases 由 265 涨到 268 ＝ CS26 多了一个注入点（C 段多 1 条）＋该判点的 D/B 段各多跟一格，
不是把断言摘掉了。

### 3.2 corpus 余数恒等式与具名棘轮（`scripts/qa/test-corpus-denominator.cjs`）

- `independentSets()` 里补出被漏掉的那一项 `namedStillGone`（被清单点名、在历史删除账里、且今天已不在索引），
  并把它加进返回对象。
- 恒等式改为 `neverOpened === stillGone − namedStillGone + restoredUnnamed`（仍保留 SETS0/SETS1 两格任一相等，
  盘面漂移容忍度一字未减）。实测 `11451 − 3188 + 1 = 8264`，与门的 `neverOpened=8264` 逐位相等。
  旧式 `stillGone + restoredUnnamed` 给 11452，正是这次的红。
  **这是收紧**：新式在 `namedStillGone=0` 时与旧式等价，另多要求一项显式为 0 才允许旧式读法成立。
- 「全部已回盘（5/5）」的群体断言换成具名棘轮，钉证据本体而不是钉索引状态：
  ① 引用源 `reports/audit/round-7/exec-A-mock-final/manifest-detail.json` 在盘可读；
  ② `04a0a221` 逐张还原的 5 张 `PAGES-DISCOVER-INDEX-DC01~05-after.png` 仍被该清单按名引用（引用断了要重新登记，不许悄悄摘棘轮）；
  ③ 这 5 张**在盘且非空**（实测字节数 14351/14338/14338/14338/14348）。
  阳性对照实测：把其中一张换成不存在的 `DC99-after.png` ⇒ 读数 5/5 变 4/5 ⇒ 会红，不是恒绿判点。
- 新增一行机器可读报数 `A_RESTORE_SPLIT 具名历史=3188 在索引=0 已出册仍在盘=3188 回盘未具名=1 具名棘轮(04a0a221)=5 在盘=5`。
- 顺带把三条**说明句里抄死的档位常量**改成"只由读数给"（`…（5 条已由 04a0a221 放回盘上…）`、
  `…（今天=0：5 条历史具名路径已全部回盘）`、`…的 650 帧全在盘上（含放回的 5 帧）`）——
  它们今天绿的、但陈述的已经是旧档位的fact，正是本仓"随档位变化的说明句不许写死成常量"点名的形状。
- 阈值、豁免、跳过：**一个都没加**。

单件复量：`test-corpus-denominator.cjs` 改前 `cases=58 fail=2 exit=1` → 改后 `cases=60 fail=0 exit=0`
（`CORPDEN_SUMMARY … realAbsent=11452 realNamedByGate=3188 realGap=8264 realProblems=1 gate=live`）。

### 3.3 lg31 判决词根并入消费者词法（`scripts/qa/test-source-shape-lg31.mjs`）

- `LG31_TEST` → `NONFRAME_TEST`（含两处 `=NOTRUN`），共 3 个打出点；文件头写明改名理由与"该合的是生产者"的判据。
- **没有**放宽聚合器的判据行正则：`run-qa-selftests.mjs:64-66` 明写"只放宽取数那把尺子；
  `*_TEST=/*_RESULT=` 判据行匹配保持原样，判据极性不随这次改动漂移"。把 `[A-Z]{2,8}` 扩成允许数字
  会同时改变全部 55 个受检文件的判据极性口径（例如让子门打出的 `*_RESULT=FAIL` 反过来支配自测件的判决），
  那是更大的风险，且与本条红无关。
- `LG31_READ` / `LG31_SUMMARY` 两个**取数**行原样保留（聚合器 `\w{2,24}_SUMMARY` 本来就读得到）。
- 改名前后判据极性一致：本文件的判决仍由 `exit` + `assertion failures` 两把独立闸兜住，这次只是把第三把闸接上。

## 4. 交接项（给主控）

### 4.1 【唯一必须外派的】ops 判据台缺 `subpackages/tools/security/index` 整页行 —— 24 条红的单一根因

- 现象：`scripts/qa/guest-landing-policy.json` 有 30 条裁定，门只出 29 条腿。
- 缺的那条：`page=subpackages/tools/security/index → landing=pages/login/index`，`family=guard-bounce`，
  2026-10-31 P1 与 wallet 同批补进。
- 实测缺口：`reports/audit/round-6/ops/*.json` 共 57 个在册页，其中 `subpackages/tools/security/index` **命中 0 行**；
  同批的 `subpackages/market/wallet/index` 有 11 行且全部未声明 identities ⇒ 走 2026-09-30 裁定 (a) 的整页证人路线。
  这个不对称就是全部差别。
- 产品侧**已修**（不是空头裁定）：`apps/client/src/config/page-access.ts:70` 的
  `securityCenterPageRequirements`（`requiresAuth:true`）已由 `apps/client/src/subpackages/tools/security/index.vue:41`
  的 `usePageAccess(securityCenterPageRequirements)` 消费；policy 的 basis 另点名
  `apps/client/src/tests/pages/wallet-security-guest-gate.spec.ts`。
- 要做的动作（**不在本车道范围**，`reports/**` 与 `apps/**` 均禁改，且 ops 正被另一条车道写）：
  给 `subpackages/tools/security/index` 在 ops 判据台补登记游客断言行（照 wallet 的 11 行形状，整页不声明 identities 即可复用既有证人路线）。
  补完后这 **24 条**（`test-guest-landing.mjs` 10 + `test-guest-landing-writeguard.mjs` 14）一起转绿，无需改这两个自测件。
- 反例警告（防止下一个人走错）：**不要**为了让这 24 条绿而
  ① 从 policy 撤掉这条裁定（＝替业主改政策，且会把一条已实现的守卫从账上抹掉）；
  ② 给 `verify-guest-landing.mjs` 加豁免或放宽 `roster 组数 == policy 裁定条数` 那条对账（＝免检）；
  ③ 把 writeguard 的 14 条读成"设备桩/租约所限"——它是 `problems` 在 `:392` 的**带病不退腿**，
    发生在 `:394` `acquireUi()` **之前**，所以桩里一个字节都没记；这是守卫正常工作。
- 归因证据链（三条独立）：① 14 条 + 10 条红详情全部指向同一条「带病出腿 / 无证人」exit=2；
  ② 该分支读的 `problems` 与 book 模式同源（都在 `buildPlan()` :383 填满）；
  ③ A/B：把这条裁定从 policy 复制件的 `rows` 里删掉（30→29），同一门体命令立刻
  `GUEST_LANDING_RESULT=OK` / `exit=0`（在临时件上做，**未**触碰仓内 policy，**未**跑 `--mode measure`，
  故既没抢 UI 租约也没改权威台账 `reports/audit/round-7/guest-landing-measured.json`）。
- CS26 那条**不需要**交接：§2.4 已判为尺子过期并在门内闭合，页面一个字节没动。

## 5. 归类汇总与留给真环境的红

| 自检件 | 红数 | 类 | 闭合方式 | 本车道复量 |
|---|---|---|---|---|
| `test-corpus-denominator.cjs` | 2 | **(b)** 尺子坏了 | 恒等式补项 + 具名棘轮（已改判据，附留痕） | 2 → **0** |
| `test-source-shape-absence.mjs` | 7 | **(b)** 尺子坏了 | CS26 距离代理换成结构命题并配阳性对照（已改判据） | 7 → **0** |
| `test-source-shape-lg31.mjs` | 3 | **(b)** 尺子坏了（判据行词根不合消费者词法；3 条红本身是 CS26 级联） | 生产者词根并入 `[A-Z]{2,8}` 词表 | 3 → **0** |
| `test-guest-landing.mjs` | 10 | **(c)** 台账真缺陷 | 不在范围，保留为红 + 交接 §4.1 | 10 → **10（如实保留）** |
| `test-guest-landing-writeguard.mjs` | 14 | **(c)** 同上一条根因 | 同上 | 14 → **14（如实保留）** |

- **(a) 类：这五条里一条都不属于**。逐条验过：五条都不缺输入件（`reports/audit/round-6/ops/**`、
  `.zcode/tmp/triage-r7-guest.json`、两档 `dist/build/mp-weixin{,-real}` 产物全在盘）、都不需要 UI 租约
  （writeguard 用一次性设备桩 + 临时租约目录，全程离线；gate 侧只跑 book 模式）、
  也不需要仓外证据库（`test-corpus-denominator.cjs:101` 主动 `delete env.QA_EVIDENCE_STORE`，
  它钉的就是"无库"那一格，属自洽设计；顺带实测 `D:/6/love-mini-evidence` 目录本身在盘）。
  ⇒ 因此本车道**没有新增任何 NOT-EVIDENCED 判值**，也没有新增豁免/阈值下调；
  唯一那条环境件仍是载具原有的显式 `SKIP test-stop-flag.cjs 原因=需要 UI 租约`（既有分桶词表，未动）。
- 残留的 24 条红全部是 **(c) 单因**，且已绑到一条可执行的交接（§4.1：ops 判据台补一页行）。

## 6. 收口复量（聚合载具再跑一整发）

命令：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/run-qa-selftests.mjs`
（先确认解释器在盘：`-rwxr-xr-x … 85219968 Jun 24 2025 D:/codex-tools/node-v22.17.0-win-x64/node.exe`，`-v` = v22.17.0；
对照 PATH 上的裸 `node` = v16.13.1，用它起会得 `SELFTEST_RESULT=NOT-EVIDENCED`，本车道两次整发都是 v22。）

| 读数 | 改前（本车道基线） | 改后（收口） |
|---|---|---|
| `SELFTEST_DIR … 发现` | 55 | 55（**没摘任何自检件、没清清单**） |
| `SELFTEST_RAN / SKIPPED / FAILED` | 54 / 1 / **5** | 54 / 1 / **2** |
| `NO_SUMMARY_LINE` | 0 | 0 |
| `GATE_SELFTESTS_RAN / FAILED` | 10 / 0 | 10 / 0 |
| `SELFTEST_RESULT` | FAIL（5/64） | FAIL（**2/64**） |

五条点名复量：

```
PASS  test-corpus-denominator.cjs      exit=0  断言失败数=0   CORPDEN_TEST=PASS      134s   (改前 FAIL exit=1 断言失败数=2 54s)
PASS  test-source-shape-absence.mjs    exit=0  断言失败数=0   ABSENT_TEST=PASS        1s    (改前 FAIL exit=1 断言失败数=7 1s)
PASS  test-source-shape-lg31.mjs       exit=0  断言失败数=0   NONFRAME_TEST=PASS      4s    (改前 FAIL exit=1 断言失败数=3 「无 *_TEST= 判据行」)
FAIL  test-guest-landing-writeguard.mjs exit=1 断言失败数=14  WG_TEST=FAIL            1s    (不变，(c) 保留，见 §4.1)
FAIL  test-guest-landing.mjs           exit=1  断言失败数=10  GL_TEST=FAIL            3s    (不变，(c) 保留，见 §4.1)
SKIP  test-stop-flag.cjs  原因=需要 UI 租约（会连 DevTools/占锁），默认不跑；要跑设 QA_SELFTEST_ALLOW_UI=1
```

三点如实记：

1. **不是凑绿**：没有摘掉任何自检件（发现数 55→55）、没有清空任何清单、没有任何阈值/下限下调、没有新增豁免、
   没有新增 NOT-EVIDENCED 判值。剩下的 2 条红**原样留着**，红数一字未减（14 与 10），
   并绑到一条可执行的交接（§4.1：ops 判据台补 `subpackages/tools/security/index` 整页行）。
2. `test-corpus-denominator.cjs` 耗时 54s → 134s（同一发载具、同一格 env）。
   本车道新增的量很小（读 1 份 manifest + 5 次 statSync + 一个 `namedStillGone` 计数器，它复用已经在跑的
   两遍 `independentSets()` 全域遍历，不额外扫盘），所以这 80s 是同机并发与 git `--diff-filter=D` 全历史扫描的
   冷/热缓存差，属载具档位，不是判据变贵；两发都远在载具单件 300s 上限内，但**余量不再宽裕**，
   下轮别把它当 11s 余量的舒适区（同门 2026-09-30 的复量已经记过这个形状）。
3. `lg31` 的第三把闸这次真接上了：判据行由「读不到」变成 `NONFRAME_TEST=PASS`，
   即今后若它出现「exit 0 且自报 0 失败、却自己声明 FAIL」的形状，聚合器能抓到（改前抓不到）。

## 7. 一句话结论

五条存量红里 **3 条是尺子坏了（(b)，已代码闭合）、2 条是台账真缺陷（(c)，同一条根因，保留为红并交接）**、
**0 条是载具/环境所限（(a)）**——所以本车道没有产生任何新的 NOT-EVIDENCED 值；
CS26 判出的结论是**页面没有退化**，故 `apps/client/**` 一个字节未动，无需页面侧交接。
