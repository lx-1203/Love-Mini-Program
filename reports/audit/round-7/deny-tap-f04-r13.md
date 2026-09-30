# F-04 收口：`DENY_TAP` 的「清空」按宾语收窄（r13 车道）

授权来源：`reports/audit/round-7/followups-v33.md` §4（登记未改）+ 本轮用户对"按语境收窄、不是放宽"的明示授权。
本车道只做一件事：让护栏不再误拦"清空输入框"，同时证明账号级清空照旧被拦。**不跑设备、不动账本、不把任何判据标成免检。**

## 0. 读数前提（HEAD 与授权口径）

派单写的是 `HEAD=70472d92`，**本车道起跑时实测 HEAD 已经前进一截**：

```
491210dd chore(qa,client): 本地落账 QA 会话新增改动（不推送）
70472d92 chore(repo): 删除一周前及以前的工作流产出报告（260 个文件）
```

`70472d92` 是 `491210dd` 的父提交。所有行号核对一律按 `git show HEAD:scripts/qa/<file>` 现取，
不引用任何报告里转录过的行号（§1 会说明为什么这条对本车道是**实质性的**：派单给的行号有一个是错的）。

本车道的交付物只有两件事：护栏不再误拦 + 双向可红的证明。**TD03 没有跑、不能算过**
（设备会话不可驱动，另一波次占设备时间）；`TD03` 在账本上仍是原样那一行，没有被标免检、
没有动任何台账。

## 1. 定义点与载体：词表是复制的，而且复制了**三份**

| 载体 | 词表定义点（HEAD 实测） | 应用点 | 它作用在什么文本上 |
|---|---|---|---|
| `scripts/qa/r-exec-cli.mjs`（`--tap` 刀） | **`:138`** | `:1539` | `c.action` |
| `scripts/qa/r-exec-ws.mjs`（WS 交互腿） | **`:391`** | `:473` | `c.action` |
| `scripts/qa/shoot-frameplan.mjs`（帧计划腿） | **`:479`** | `:536` | `st.note + " " + st.selector` |

三份是**逐字相同的正则字面量**，不是"定义一次再 import"：

```
const DENY_TAP = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/;
```

**派单记录的 `r-exec-cli.mjs:60` 是错的**：`git show HEAD:scripts/qa/r-exec-cli.mjs | sed -n '60p'`
打出来的是 `import { evaluate, openPage, shot, ... } from "./cli-automator.mjs";`。
`r-exec-ws.mjs:391` 记录正确。这正是"行号在本仓会动"的又一例，也是本报告坚持现取的原因。

**本车道改完之后行号又动了**，一并留下对照，免得下一位拿旧编号去指（上表与 §1.1 的引用一律是
**收窄前的 HEAD 行号**）：

| 位置 | 收窄前（HEAD） | 收窄后（工作树） |
|---|---|---|
| cli 载具入口 require | — | `r-exec-cli.mjs:62` |
| cli 应用点 | `:1539` | `:1550`（`const denyWord = denyTapMatch(String(c.action \|\| ""))`） |
| ws 载具入口 require | —（原 `:48` 已有 `createRequire`） | `:395` |
| ws 应用点 | `:473` | `:477`（`const denyWord = denyTapMatch(actionText)`） |

这就是发现本身：**三条载具各自持有一份安全边界，任何一条被单独改坏，另外两条不会跟着红。**
本仓对这类缺陷有明确反对先例（`scripts/qa/change-verbs.cjs` 就是 §96.2 同类"两份会漂移的副本"
的收口载体，且 `test-change-verb-spans.cjs` 专门有一条"消费者是否真接了共享模块"的接线断言），
所以本车道照同一形状收口，而不是再抄第四份。

处置：新建唯一来源 **`scripts/qa/deny-tap.cjs`**，把两条被点名的载具（`r-exec-cli.mjs`、
``r-exec-ws.mjs`）接到它上面。**`shoot-frameplan.mjs` 一个字未动** —— 它的清单作用在
`note + selector` 而不是 ops 的 `action`，是另一个射程；在那边收窄会移动帧计划腿的派发集合，
而本车道只被授权动 ops 判据这一侧。它是**记账的债**，见 §6。

### 1.1 收窄前：两条误拦行的原文与拒绝路径（逐字）

**(a) 改任何文件之前**，按旧正则跑一遍两条判据自己的 action 文本（round-7/ops 全量 1107 条里的摘录）：

```
BEFORE DENY_TAP refuses (round-7/ops) = 32 cases
  REFUSE 次要18|TD03  命中词=清空
  REFUSE 次要20|OT09  命中词=清空
```

**(b) 误拦的宾语**（判据原文，现取 `reports/audit/round-7/ops/次要18.json` / `次要20.json`）：

- `次要18|TD03` 的 action 里那句是 `② 清空 .reply-input 后 tap .reply-btn 发送`，
  而同一个 action 的第一句已经把 `.reply-input` 就地绑回控件：
  `对第 415 行 .reply-input（topic-detail.vue 的 <input>，v-model=replyContent :414、@confirm=submitReply :418）`。
  清的是 `<input>` 里的字，不是账号。
- `次要20|OT09` 的是 `③ 每路关闭后重新打开检查内容是否清空`，同一 action 第①步点名
  `① textarea（:83-88）依次：空内容直接点发送 → 输入正常短句 …`，`tapTarget=.whisper-sheet__input`
  （证据 `apps/client/src/components/discover/WhisperComposeSheet.vue:85`）。
  这里「清空」甚至是**被观察的谓词**（内容是否已空），不是一条清数据的指令。

**(c) 拒绝路径本体**（`git show HEAD:` 的逐字源码）：

```js
// scripts/qa/r-exec-cli.mjs:1539-1542
        if (DENY_TAP.test(String(c.action || ""))) {
          stats.tapDeny++;
          rows.push(row(name, page, c, "SKIPPED", route, "交互禁触（注销/解绑/清空这类不可逆动作会打掉后面几百条共用的会话）⇒ 显式记 DENY，不混进已跑", observed0(c, route, routeOk, dom, "")));
          continue;
        }
```

```js
// scripts/qa/r-exec-ws.mjs:473-475
  if (DENY_TAP.test(actionText)) {
    return { bucket: "tapDeny", row: mkRow(name, page, c, "SKIPPED", route, "动作命中不可逆清单（注销/解绑/清空/登出）⇒ 禁触，否则后面几百条共用的会话会被打掉", "top=" + route + " | deny-tap | action=" + actionText.slice(0, 60)) };
  }
```

**(d) 上一轮真跑过一次的拒绝记录**（`reports/audit/round-7/exec-interact-real-sc-r10/exec-results.json`，
`id` 现取）—— 这是"确实拦在载具里、不是判据不可自动化"的既有旁证：

```
id=TD03 page=subpackages/circles/circles/topic-detail :: VEHICLE_DENY :: 载具 DENY_TAP（r-exec-cli.mjs:60 词表）命中 action 文本 ⇒ 载具在取租约前就不发交互；本 lane 不放宽判据，如实记。命中词=清空
id=OT09 page=subpackages/profile-extra/profile/other :: VEHICLE_DENY :: 载具 DENY_TAP（r-exec-cli.mjs:60 词表）命中 action 文本 ⇒ 载具在取租约前就不发交互；本 lane 不放宽判据，如实记。命中词=清空
```

（那两行里写的 `:60` 就是 §1 说的转录行号错误，实际定义点在 `:138`。）

### 1.2 对照件：语料里真的是账号级/存储级的清空

收窄必须留得住"真破坏"。以下四条都在同一份 ops 语料里，本车道**不请自来地当反例用**：

| 判据 | action 里的原句 | 为什么必须继续被拦 |
|---|---|---|
| `次要20\|PR05` | `④ 清空 storage 后进入本页（缺字段/非法值兜底）` | 宾语是 **storage**（持久化存储），不是任何输入框 |
| `次要18\|HS07` | `④ 重开后 tap 确认清空（:269 → handleClear :100-115）` | 「清空」本身就是**被 tap 的确认按钮**，处理器 `handleClear` 落历史 |
| `次要19\|SE05` | `① tap「清空历史」（.section-clear …同一行即 @tap=clearHistory）` | 同上：按钮标签，处理器 `clearHistory` 清整条历史 |
| `SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC\|CPT33` | `清空/拦截数据源后打开弹层` | 宾语是**数据源** |

注意 `HS07`/`SE05` 的 action 里**也有选择器**（`.history-clear`、`.section-clear`），
所以"点了名的元素引用"不足以当放行依据 —— 这是本车道先试过再否决的一条捷径（见 §2 为何要 `v-model`/组件标签级证据）。

## 2. 收窄规则（一句话）

> **「清空」不再按词禁触，而是按它自己的宾语判：只有当这条判据的文本里就地指出了一个小程序
> 文本输入控件（平台可打字组件的闭集 `<input>` / `<textarea>`，或把类名绑回控件的 `v-model=`），
> 并且「清空」的宾语就是那个控件本身（`清空 .reply-input`）或那个控件里的内容（`检查内容是否清空`）
> 时才放行；否则一律照旧禁触 —— 证明不了宾语是字段的，默认拦。**

规则写在三处下一位读者一定会撞见的地方：

1. `scripts/qa/deny-tap.cjs` 文件头注（整段用横线框住，是唯一来源本体）；
2. `scripts/qa/r-exec-cli.mjs` 的 `TAP_MODE` 上方注释（交互刀的入口注释，原话"不可逆的账号级
   动作一律禁触"下面接着写这条判据）；
3. `scripts/qa/r-exec-ws.mjs:388` 起的那段（原本就写着"注销/解绑/清空先禁触"的理由，现补宾语判）。

另外两条反向否决（`PERSISTENCE_OBJECT`：storage/缓存/会话/token/登录态/历史/数据源/数据库/账号；
`CLEAR_IS_THE_TAPPED_CONTROL`：`tap 确认清空`、`「清空历史」`）是纵深防御，**并且实测今天就是惰性的**
（见 §4 的 W2/W3/W4 读数：单独删掉任一条，released 仍恰好是 TD03/OT09）。把这件事写出来，
是因为"有一条永远不影响结果的守卫"很容易被下一个人当成冗余删掉 —— 它防的是**未来文本**
（例如某条判据既有输入框又写 `清空 storage`），不是今天这 1107 行。

刻意没有采用的两种偷懒写法：

- **关键词豁免表**（"清空 + 输入框/搜索框/textarea 白名单"）：授权明令禁止，且这张表会长大。
  现在的控件证据只认平台闭集（小程序可打字组件就 `<input>`/`<textarea>` 两类，加 `v-model=` 绑定），
  不认散文名词。
- **"宾语是选择器就放行"**：`HS07`/`SE05` 的 action 里同样点名了 `.history-clear`/`.section-clear`，
  这条捷径会当场把两条真破坏放出去（本车道实跑过，故否决）。同理，类名片段里的 `input`
  （`.reply-input`、`.input-bar__input`）**不算**控件证据 —— `FIELD_PROOF` 用 `(?<![-.\w])` 把它们排除掉，
  否则等于给任意选择器名发豁免。

一处实现坑值得记下（首版就是这样把 TD03 误留在禁触侧的）：`String.prototype.match` 配 `/g`
**只返回整段命中、不返回捕获组**，所以 `直接宾语=清空 ([.#]…)` 取到的是 `"清空 .reply-input"`
而不是 `.reply-input`，回头查绑定证据必然落空。修法是用 `matchAll` 取 `m[1]`
（`deny-tap.cjs` 里就地写了这条注释）。

## 3. 语料级前后对照：拒绝集合的每一次状态变化（全部点名）

两份 ops 语料都量了（`r-exec-cli.mjs` 的 `--ops` 默认值是 **round-6/ops**，round-7 各腿显式指
round-7/ops；两份的 32 条命中行**逐字相同**，所以一个数就够代表两份）：

```
DENYTAP_CORPUS dir=reports/audit/round-7/ops cases=1107 refuse_before=32 refuse_after=30 released=次要18|TD03,次要20|OT09 newly_denied=(none)
DENYTAP_CORPUS dir=reports/audit/round-6/ops cases=1107 refuse_before=32 refuse_after=30 released=次要18|TD03,次要20|OT09 newly_denied=(none)
```

| 口径 | 收窄前 | 收窄后 | 变化 |
|---|---|---|---|
| 判据总数（两份各） | 1107 | 1107 | 0（守恒） |
| `DENY_TAP` 拒绝数 | **32** | **30** | **-2** |
| 放出的行 | — | — | `次要18|TD03`、`次要20|OT09`（**恰好是授权点名的两行**） |
| 新拦下的行 | — | — | **0 行** |

**没有任何未点名的状态变化**：既没有多放一行（本车道无权顺手让别的判据可派发），
也没有多拦一行（新红必须是显式的）。28 条含「清空」的行里 26 条仍被拒、2 条放行；
除「清空」外的 4 条（`PAGES-NEARBY-INDEX|N30` 命中「登出」、`次要19|ST01/ST08/ST11` 命中「退出登录」）
一行未动 —— 它们连代码路径都没换（`ALWAYS_DENY_WORDS` 逐字保留原词条）。

第三份副本 `shoot-frameplan.mjs` 的射程（帧计划的 `note + selector`）**不在上表里，也一行未动**。

中途踩到的一个读数陷阱值得记下来（它正是"别拿没动的正则去比"那一类）：判定这条差集时
必须作用在**载具真正读的那个字段** `c.action` 上，而 `title` / `expected` / `pre` 里同样大量出现
「清空」（例如 `TD03.expected` 有 `输入框清空（:91）`、`OT09.expected` 有 `重开后 textarea 为空`）。
把这些字段一起卷进比较，得到的是护栏从没管辖过的一批行，差集会虚高到完全不可信。
本表全部只取 `c.action`，与 `:1539` / `:473` 两个应用点的实际入参一致。

入参边界也逐项核过，新旧同判（防止把"action 为空"这种行的覆盖悄悄改掉）：

```
""  old_denies=false  new_denies=false
undefined  old_denies=false  new_denies=false
null  old_denies=false  new_denies=false
"只读文案，无动作"  old_denies=false  new_denies=false
```

**下游对拒绝文案的耦合没有被改坏。** `scripts/qa/triage-exec-failures.mjs:184` 是**按句子前缀**
认这笔账的：

```js
const RE_TAP_DENY = /^动作命中不可逆清单（注销\/解绑\/清空\/登出）⇒ 禁触/;
```

`:364` 还交叉要求 `observed` 里带 `deny-tap` 段。本车道因此**只在原句之后追加**
`| 命中词=… （清单唯一来源 …）`，前缀与 observed 都逐字保留，实测：

```
ws prefix still matched by RE_TAP_DENY = true
cli row starts with original sentence = true
```

（同一份分诊台里 `:914` 把这条 DENY 的来源写成 `r-exec-ws.mjs:373`，也是转录行号，
真实定义点 `:391` / 应用点 `:473` —— 又一例"行号在本仓会动"。）

## 4. 双向 RED 证明

测试文件：**`scripts/qa/test-deny-tap-field-clear.cjs`**（33 条断言，文件名符合聚合器的
`^test-.+\.(cjs|mjs)$`，见 `run-qa-selftests.mjs:25`，所以它真的会被跑到）。

### 4.1 方向①：误拦的两行现在过得了护栏（绿）

```
ok   S2[放行] reports/audit/round-7/ops 次要18|TD03 过得了护栏  (denyTapMatch="")
ok   S2[放行] reports/audit/round-7/ops 次要20|OT09 过得了护栏  (denyTapMatch="")
```

判据原文**现取 ops**、不硬编码文本；一旦哪天 `TD03.action` 里不再含「清空」，
测试会显式 FAIL 并说明"F-04 的前提变了，要人重看"，不会静默变绿。

### 4.2 方向②：账号级清空**照旧被拒**，且这条断言能变红

未放宽时（绿，且证明这条门"可绿"）：

```
ok   S3[仍拦] reports/audit/round-7/ops 次要20|PR05 必须仍被拒  (命中词=清空 原文=① 开关1 置为 true 并确认 storage；② tap 返回离开页 → 再进入本页读值；③ wx.reLaunc)
ok   S3[仍拦] reports/audit/round-7/ops 次要18|HS07 必须仍被拒  (命中词=清空 原文=① tap .history-clear（history.vue:162，:167 @tap=showClearDial)
ok   S3[仍拦] reports/audit/round-7/ops 次要19|SE05 必须仍被拒  (命中词=清空 原文=① tap「清空历史」（.section-clear，apps/client/src/subpackages/tools)
ok   S3[仍拦] reports/audit/round-7/ops SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC|CPT33 必须仍被拒  (命中词=清空 原文=清空/拦截数据源后打开弹层 → 观察 → 关闭再重开一次)
```

### 4.3 mutation：把护栏放宽，测试必须红

**(a) 测试自带的 mutant**（在 `.zcode/tmp` 下造一份"不再问宾语、`清空` 整条放行"的
`deny-tap.widened.cjs`，同一支探针分别打干净版和放宽版）：

```
PROBE_CLEAN  leaked=(none) released=次要18|TD03,次要20|OT09 over=0
ok   S5[门可绿] 未放宽的真模块跑同一探针必须退 0、零泄漏  (exit=0 leaked=(none) over=0)
PROBE_MUTANT leaked=次要20|PR05,次要18|HS07,次要19|SE05,SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC|CPT33 over=26
ok   S5[RED 可达·拦方向] 放宽版把账号级清空放出去了（PR05 必须漏 ⇒ 证明 ③ 真在管这件事）  (exit=1 leaked=次要20|PR05,次要18|HS07,次要19|SE05,SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC|CPT33)
ok   S5[RED 可达·守恒方向] 放宽版同时被守恒轴抓住（多放行 > 0）  (over_release=26)
```

mutant 的锚点行如果哪天在 `deny-tap.cjs` 里找不到，`S5[可造]` 会直接 FAIL —— 免得这条 mutation
检查悄悄退化成"永远绿"。

**(b) 手工把真文件改宽，再跑整条测试**（这是要求里那种"真的红一次"，不是自证式夹具）：

```
MUTANT_APPLIED=yes
```

```
FAIL S3[仍拦] reports/audit/round-7/ops 次要20|PR05 必须仍被拒 :: 命中词= 原文=① 开关1 置为 true 并确认 storage；…
FAIL S3[仍拦] reports/audit/round-7/ops 次要18|HS07 必须仍被拒 :: 命中词= 原文=① tap .history-clear…
FAIL S3[仍拦] reports/audit/round-7/ops 次要19|SE05 必须仍被拒 :: 命中词= 原文=① tap「清空历史」…
FAIL S3[仍拦] reports/audit/round-7/ops SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC|CPT33 必须仍被拒 :: 命中词= …
DENYTAP_CORPUS dir=reports/audit/round-7/ops cases=1107 refuse_before=32 refuse_after=4 …
checks=33 assertion failures = 12
SUMMARY: assertion failures = 12
DENYTAP_TEST=FAIL
```

放宽版把拒绝数从 **32 打到 4**（等于护栏被拆掉），12 条断言红 —— 拦截方向的门是真在管的。
剩下的 4 条正是 §3 里那 4 条「登出/退出登录」，它们连代码路径都没换。

### 4.4 mutant 已删除并自证

```
--- md5 (expect 19534760ce6e213670f3316913fde4f2) ---
19534760ce6e213670f3316913fde4f2 *scripts/qa/deny-tap.cjs
19534760ce6e213670f3316913fde4f2 *scripts/qa/deny-tap.cjs   <-- 改动前留存的 orig.md5，同值
--- MUTANT-DEMO occurrences (expect 0) ---
0
```

第一轮 mutant 删除后也核过同一件事（`files_in_leftover=0` 说明命名空间里只剩空目录，
放宽版词表本身已不在盘上；该空目录随后被测试自己收回，见下）：

```
files_in_leftover=0
```

```
--- ls .zcode/tmp (scoped, no repo-wide find) ---
lane-denyf04: ABSENT
--- any widened/mutant carrier copy under scripts/qa ? ---
none
```

删除断言本身也在测试里：

```
ok   S6 mutant 已删除（磁盘上不再存在放宽版词表）  (…\.zcode\tmp\lane-denyf04\mutant\deny-tap.widened.cjs)
ok   S6 探针已删除（.zcode/tmp 下不留夹具）
ok   S6 临时目录整条收回（不留空命名空间给下一位）  (…\.zcode\tmp\lane-denyf04)
ok   S6 mutant 命名空间内一个文件都不剩  (…\.zcode\tmp\lane-denyf04)
```

恢复后重跑：`checks=33 assertion failures = 0` / `DENYTAP_TEST=PASS`。
（注：`find` 全仓扫 mutant 会撞上 3848 个有意未提交的截图删除，所以自证用**限定路径的 `ls`**，
不使用任何仓库级恢复/清理命令。）

### 4.5 顺带量到的惰性结论（防后人误删纵深）

| mutant 形状 | released 行数 | 账号级对照是否漏 |
|---|---|---|
| W1 不再问宾语（`清空` 整条放行） | 28 | **4 条全漏**（PR05/HS07/SE05/CPT33） |
| W2 只删 `PERSISTENCE_OBJECT` 否决 | 2（仍恰好 TD03/OT09） | 不漏 |
| W3 只删 `FIELD_PROOF` 闸门 | 2 | 不漏 |
| W4 两条都删 | 2 | 不漏 |

即：今天真正在起作用的判别轴是"宾语是否被就地绑到文本控件"，两条反向否决在当前语料上是惰性的
（它们与对象测试互为冗余）。这既说明本修复为何只放出两行，也说明**不能**因为"删了不红"就把它们当死代码删掉。

## 5. 自检与聚合器读数

全部用 Node 22（`/d/codex-tools/node-v22.17.0-win-x64/node.exe`；PATH 上的 node 是 v16.13.1）。

**执行器自己的自检**（`r-exec-cli.mjs` 头部约定的旗标是 `--selftest`，自报行是
`EXEC_SELFTEST=PASS cases=N bad=0`，见 `:304`）：

```
EXEC_SELFTEST=PASS cases=97 bad=0
```

（接线前、接线后各跑一次，都是 97/0 —— 加注释与换入口没有改变自检覆盖面。）

**新负例被聚合器发现并真跑**（`run-qa-selftests.mjs:25` 的扫描规则确认为
`/^test-.+\.(cjs|mjs)$/`，输出行 `:28` 是 `SELFTEST_DIR=… 发现=N`）：

```
SELFTEST_DIR=qa/test-*  发现=37  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe
PASS  test-deny-tap-field-clear.cjs  exit=0  断言失败数=0  DENYTAP_TEST=PASS  4s
```

发现数 **36 → 37**，差值正好是本车道新增的这 1 个测试文件（`deny-tap.cjs` 不匹配
`^test-`，不进这个守恒）。单独跑该文件：

```
checks=33 assertion failures = 0
SUMMARY: assertion failures = 0
DENYTAP_TEST=PASS
```

**工作流干跑**（本车道改的是两条载具，没改工作流 DSL 读的任何文件：
`grep -rln "r-exec-cli\|r-exec-ws\|deny-tap" .zcode/workflows/` 无输出 —— 仍按要求跑了一遍）：

```
DRYRUN_RESULT=PASS（3/3 画像跑到底并产出总报告）
```

### 5.1 `SELFTEST_RESULT` 的四条红**没有一条是本车道改出来的**（逐字点名 + 归因）

完整跑批的收尾四行：

```
SELFTEST_RAN=36 SKIPPED=1 覆盖文件=37/37
PASS  verify-dry-no-lease --selftest  exit=0  DRYLEASE_SELFTEST=PASS cases=5 bad=0
PASS  verify-case-automatable --selftest  exit=0  CA_SELFTEST=PASS cases=7 bad=0
GATE_SELFTESTS_RAN=2 GATE_SELFTESTS_FAILED=0
SELFTEST_RESULT=FAIL（4/38 个离线测试与门自检未过）
```

`覆盖文件=37/37` 说明本车道新增的测试**确实被发现并被跑了**（36 个 test-* 实跑 + 2 个门自检 = 38；
`test-stop-flag.cjs` 按规矩作为需要 UI 租约被 SKIP，不是被跳过就失踪）。四条红逐条归因：

```
FAIL  test-corpus-legacy-window.cjs  exit=1  断言失败数=1  LEGWIN_TEST=FAIL  250s
      |   FAIL H 真仓对跑：scoped corpus 侧 PROBLEMS=0 而 legacy>=1 ⇒ 红与豁免分得开  <<problems=1 legacy=1>>
FAIL  test-corpus-sha-axis.cjs  exit=1  断言失败数=4  CPSSHA_TEST=FAIL  53s
      |   FAIL B 空 SHA：exit 1  <<code=2>>
FAIL  test-evidence-store-axis.mjs  exit=null  无自报断言计数（不可信）  无 *_TEST= 判据行  300s
      | FAIL 2 库可达：PROBLEMS 仍等于基线（库不新增红，也不豁免既有问题） :: PROBLEMS=0 基线 P0=2 ｜ CORPUS_STORE=reachable dir=D:\6\love…
FAIL  test-guest-landing.mjs  exit=1  断言失败数=1  GL_TEST=FAIL  12s
      |   FAIL 10 真数据：booked 的落地对集合 == measured 的落地对集合（在册账本与实测腿同一批组） :: measured 组=0 booked 组=28
```

- **前两条**（LEGWIN / CPSSHA）都读 `verify-evidence-corpus.mjs` 对 `reports/screenshots/**` 的判决，
  成因是**证据帧文件不在盘上** —— 单独跑那把尺子就能点名：

  ```
  CORPUS_SCANNED=2 CORPUS_EXPIRED_GITSHA=2 CORPUS_PROBLEMS=1（限定 scope=reports/screenshots/round-1，生产者侧降级 INFO）
    CORPUS_PROBLEM reports/screenshots/round-1/manifest.json 共 144 帧 :: 帧不存在=144
  CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）
  ```

  `ls reports/screenshots/round-1/` 现在只剩 `manifest.json`（`frames_on_disk=1`）。
  这属于用户既定的"截图以后一律不提交"处置面（`740957e3`），**本车道一律不恢复**。
- **第三条** 是 evidence-store 轴：它把库指到仓外路径 `D:\6\love…` 并**跑满 300s 被 kill**（`exit=null`），
  比的是 `PROBLEMS=0` 与基线 `P0=2`。与本车道的词表无交集。
- **第四条** 是游客落点轴：`measured 组=0 booked 组=28` —— 缺的是**设备实测腿**，
  而设备时间归另一波次（本车道按硬护栏一个 case 都没上机）。`verify-guest-landing.mjs` 是别的车道射程。

本车道的改动面与之无交集：

```
 scripts/qa/r-exec-cli.mjs | 21 +++++++++++++++++----
 scripts/qa/r-exec-ws.mjs  | 16 +++++++++++-----
 2 files changed, 28 insertions(+), 9 deletions(-)
?? scripts/qa/deny-tap.cjs
?? scripts/qa/test-deny-tap-field-clear.cjs
?? reports/audit/round-7/deny-tap-f04-r13.md
```

**没有为了让红消失而动过任何台账、阈值或判据**，也没有标任何免检。

一条时序旁证（也是"并发车道下别信单次读数"的实例）：本车道 00:52 那次聚合器里 `LEGWIN` 是**绿**的、
红的是 `test-rendered-label-check.cjs` 与 `GATE verify-dry-no-lease`；到 01:1x 换成了 `LEGWIN` 红。
`verify-dry-no-lease.mjs --selftest` 单跑 `DRYLEASE_SELFTEST=PASS cases=5 bad=0`（退 0），
它扫的正是 `.zcode/workflows/**`，而 `git status` 显示 `M .zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`
—— 那是**别车道的在途改动**，本车道没写过那个目录。这两条红都随在盘状态移动，
本车道不把它们算到自己头上，也不去改任何台账/阈值让它们消失。

## 6. 边界与未做的事

**没有跑设备。** TD03 与任何判据都没有上机：DevTools 自动化会话当前不可驱动，设备时间归另一波次。
本车道的交付物只有"护栏不再拦 + 双向可红的证明"，不是"TD03 过了"。
**可派发 ≠ 已通过**：`次要18|TD03`、`次要20|OT09` 两行在账本上仍是原样，状态没有被改、
没有被标免检/可豁免，任何台账文件都没动（`reports/audit/round-7/ops/**` 只读）。

**没有收敛第三份副本。** `shoot-frameplan.mjs:479` 仍自带一份逐字相同的六词正则（应用点 `:536`，
作用在 `st.note + " " + st.selector`）。它没被接进 `deny-tap.cjs`，因为那条腿的输入不是 ops 的
`c.action`，在那边套用宾语判会移动帧计划腿的派发集合，而授权只覆盖 ops 判据这一侧。
**这是记下来的债，不是已收口**：三条载具现在仍是"两条同源 + 一条副本"，漂移面缩小了但没有归零。
下一位要动它的人应连同 `:536` 的输入语义一起判，而不是直接把正则换成 import。

**规则的残余风险（写清楚，不含糊）**：宾语判读的是"这条判据自己有没有把控件绑回
`<input>`/`<textarea>`/`v-model=`"。理论上一条判据可以第①步名一个输入框、第②步写
`清空 .not-a-field`，从而被误放行 —— 当前 1107 行里实测 **0 行**属此类。兜住这一类的不是运气，
是守恒轴：`S4` 要求"相对旧正则放出的行恰好等于授权点名的两行"，语料一旦出现第三行就会红。

**没碰的文件**：`verify-case-automatable.mjs`、`emit-round-report.mjs`、`verify-guest-landing.mjs`、
`profile-svg-to-png.mjs`、`prepare-static.mjs`、`reports/audit/round-7/ops/**`、`.zcode/workflows/**`。
工作树里 `gen-round8-report.mjs`、`run-final-verify-v33.sh`、`run-round7-closeout.mjs` 的脏改动
**不属于本车道**（其它在途车道），本车道未代提交、未回滚、未 `git checkout`、未做仓库级恢复。

**一条并发观察（并发车道下别信单次读数）**：本车道动任何文件之前先跑过一次完整聚合器，收尾是：

```
SELFTEST_SUMMARY files=36 ran=35 passed=33 failed=1 skipped=1
SELFTEST_RESULT=FAIL
  FAIL GATE verify-dry-no-lease --selftest  exit=0  退出码 0 但没抓到它自报的 PASS 行（不可信，按失败算）
  FAIL  test-rendered-label-check.cjs  exit=1  断言失败数=1  LABCHK_TEST=FAIL
```

收工后是 `发现=37` / `SELFTEST_RESULT=FAIL（4/38 …）`，红的却是**另外四条**（§5.1）：
`test-rendered-label-check.cjs` 自己变绿了，`verify-dry-no-lease` 这次
`GATE_SELFTESTS_RAN=2 GATE_SELFTESTS_FAILED=0`（它单跑一直是
`DRYLEASE_SELFTEST=PASS cases=5 bad=0`，扫的正是 `.zcode/workflows/**`，而 `git status` 显示
`M .zcode/workflows/miniprogram-qa-finish-v33.dwf.ts` —— 别车道的在途改动）。
顺带一条读数坑：那次运行里 `发现=` 读到 37，而同一时刻限定重算 `^test-.+\.(cjs|mjs)$` 得 36 ——
说明当时有一个**别车道在途的 test-\* 文件**在盘上闪现；收工后的 37 才是"原 36 + 本车道这 1 个"。
18 分钟内红集合整批换人，本车道只主张两件事：`发现` 的 +1 是自己的测试文件、
`test-deny-tap-field-clear.cjs` 两次口径下都绿。其余红一律如实点名交回原车道，不冒领、不掩盖。
