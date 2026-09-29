# r9 游客落点：成员来源归一（裁定 (a) 落地）

车道：guest-membership（r9）。HEAD=1788675d。Node 22：`/d/codex-tools/node-v22.17.0-win-x64/node.exe`。
状态：**进行中**（每节随做随填，不攒到最后）。

## 1. 改动前的现场（实测，非推断）

命令（§11 记录的那一次调用，逐字重复；**未拍帧、未取租约** —— 载具在 `problems` 非空时于 `verify-guest-landing.mjs:244` 退出，早于 `:245` 的 `heldLeases` 与 `:246` 的 `acquireUi`）：

```
$N scripts/qa/verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real --repeat 3 \
  --only GG-campus-campus-index,GG-discover-extra-discover-matching,GG-village-village-tag-posts,GG-setup-campus-index,GG-setup-recommend-pref-index
MEASURE_BEFORE_EXIT=2
GUEST_LAND_SOURCES=.zcode/tmp/triage-r7-guest.json（组=26，行次=239） ⇒ 并集组数=26 并集行数=239
GUEST_LAND_NO_RUN_WITNESS=1 组（游客腿按 c.identities 不再认领这些页 ⇒ 跑测里不再出现落地对；成员账改由 ops 派生，不是裁定过期）
GUEST_LAND_ROSTER 组=27（成员来自 ops 的=27 只来自跑测的=0）成员行次合计=434｜跑测观察并集组数=26
GUEST_LANDING=FAIL 先修这几条再来量（带病出腿 = 白拿租约）：
  policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何被收窄出游客腿的用例 ⇒ 这一组没有任何证人：
  subpackages/setup/recommend-pref/index → pages/login/index
  组 subpackages/setup/recommend-pref/index → pages/login/index 一名成员都没有 ⇒ 有裁定却没有账本成员，不能出 GG-* 腿
```

同一份 `buildPlan()` 的 book 侧读数（`--mode book --out .zcode/tmp/guest-r9/before-book-default.json`）⇒ `exit=2`，`GUEST_LANDING_RESULT=FAIL problems=2`，两条 `✗` 与上面逐字相同；`GUEST_LAND_ROSTER 组=27 … 成员行次合计=434`。

现场核对（`tmp/qa/locks` 前后逐字相同 4 份，全是别车道既有租约，我没新增、没残留；`heldLeases({excludeOwner:"r7-guest-landing"})=0` 说明**当时若有读数就会真去拿锁**，所以那条"拦门在取租约之前"必须先证明再动代码）：

```
wechat-automation-9420.lock owner=tour-R6-subagent batch=R6 pid=24572
wechat-automation-9430.lock owner=tour-R6-subagent batch=R6 pid=36956
wechat-automation-9431.lock owner=tour-R6-subagent batch=R6 pid=15580
wechat-automation-cli.lock owner=emit-round-report-30068 batch=R7 pid=30068
heldLeases(excludeOwner=r7-guest-landing)=0 []
```

在册产物自身的形状（**没有被本车道改写**）：

- `reports/audit/round-7/guest-landing-booked.json`：`rows=28 groups=26 debtRows=434`；`subpackages/setup/recommend-pref/index` 那一组的 `memberSource={"fromOps":0,"fromRun":4}`、`caseIds=RP01,RP02,RP06,RP10`。
- `reports/audit/round-7/guest-landing-measured.json`：`rows=28 band=real@f0677920 generatedAt=2026-09-28T10:15:58.555Z`；booked 与 measured 的 groupKey 集合**相等**（28/28）。
- ⇒ 在册账本认为这一组有 4 名成员、能拍；预检按 `--triage` 缺省那份 scratch 语料算出 0 名成员、拒拍。**"booked 却在预检里没有任何证人"就是缺陷本体**（不是数字漂移）。


## 2. 两条成员路线与分叉点（file:line）

一次读代码的结论：**book 与 measure 并没有把成员算两遍** —— 两者都跑同一个 `buildPlan()`（`scripts/qa/verify-guest-landing.mjs:235` 模块级调用，`:243` 才分叉到 measure 分支）。分叉不在"两处计算"，而在 `buildPlan()` 里那**两条互不认账的成员来源**：

- 路线 ①「ops 派生」（#67 立的规矩）：`verify-guest-landing.mjs:57-61` `guestNoLongerClaims()` + `:64-79` `opsRosterByPage()`。
  只把**已被收窄成登录态腿**的行算成员，判据是 `c.identities` 非空且不含 `guest`/`none`。
  RP01–RP11 整页**根本没有 `identities` 字段** ⇒ `:59` 的 `if (!ids.length) return false;` 直接返回 false ⇒ 这一页成员=0。
  实测语料：`reports/audit/round-6/ops/次要21.json` 与 `reports/audit/round-7/ops/次要21.json` 里 RP01–RP11 共 11 行，`identities` 全缺、`identitiesFrom` 全缺（兄弟页 SCU 13 行 / INT 11 行每行都带 `["A","B"] + identitiesFrom:"tag-ops-identity-scope.mjs"`；SCH 12 行里 SCH02 也没标）。
- 路线 ②「跑测观察」：`verify-guest-landing.mjs:92-106` 把 `--triage` 各源的 `landingGroups` 取并集，`:146-147` 与 ① 合并成 `ids`。
  这一路**跟着喂进来的 triage 文件走**：`.zcode/tmp/triage-r7-guest.json` 有 26 组、**不含** `subpackages/setup/recommend-pref/index → pages/login/index`；`.zcode/tmp/triage-r10-guest.json.json`（守卫腿 exec-guest-real-guard-r10 派生）只有 1 组，正是这一组、4 行（RP01,RP02,RP06,RP10）。
  `:19-24` 的 `--triage` 缺省就是那份 26 组单切片，并且只在 `MODE==="book"` 时才打 `GUEST_LAND_WARN`。

**分叉点 = `:148`**：`if (!ids.length) markProblem("组 … 一名成员都没有 ⇒ 有裁定却没有账本成员，不能出 GG-* 腿")`。
它要求**两路同时为空**才放行拦门，但 ① 对"整页从没被收窄"的页结构性失明、② 又随 triage 选择漂移 ⇒ 同一份 policy 下：
喂并集（在册 booked 的来历）⇒ 该组 `fromOps=0/fromRun=4` 记账 28 组；喂缺省单切片（§11 的 measure 调用）⇒ 该组零成员、roster 只剩 27 组并拦腿。
**"在册却拍不了"就是这么来的**：`:249-254` 写盘用的 `plan.rows` 属于那一次调用的输入，而预检用的是另一次调用的输入。

另一半的口径证据（为什么"没标 identities"= 游客腿仍在认领，不是"没人管"）：执行器 `scripts/qa/r-exec-cli.mjs:159-163` `identityScopeSkip()` —— `identities` 为空 ⇒ `return ""`（不跳），即**未声明 = 游客执行腿照跑这一行**。所以"整页未声明"的页确实是一群还归游客腿判的断言，而落点被弹到登录页时它们一条都判不到东西 —— 这正是最该由 GG-* 落点腿替它们记账的形态。


## 3. 实现的规则与它的窄条件

只改 `scripts/qa/verify-guest-landing.mjs`（成员账的唯一出处）；**`scripts/qa/guest-landing-policy.json` 没有被改，也不该被改** —— 成员是"判据台语料的事实"（哪些行还归游客腿），不是"裁定"；把名册写进 policy 就等于再造第二个成员来源，正是本病灶。ops 语料一个字节没动（`reports/audit/round-7/ops/` 与 `round-6/ops/` 都不在本车道权限内）。

规则（`verify-guest-landing.mjs` 里 `opsRosterByPage()`，改后 `:85-118`）：一页在 ops 里的证人 = ① `narrowed`（#67 老口径：`guestNoLongerClaims(c)`，`:57-61`，一字未改）∪ ② `entireGuest`（裁定 (a)，条件写在 `:102` `r.rows > 0 && r.undeclared.size === r.rows`），且 ② 成立要三条同时满足：

1. 该页在 ops 里至少 1 行；
2. 该页**每一行**都没有任何 `identities` 声明（新函数 `identityDeclared(c)`，`:65-67`）；
3. 于是该页没有任何一行被收窄（①=0；有 ① 的页本来就不缺证人，用不着 ②）。

**红线（也是负例钉的东西）**：② 认的是"整页从没被标过"，**不是**"整页被声明成 guest"。`identities:["guest"]` 是判据台明写"这些行归游客执行腿自己判"，那批行由 exec 游客腿直接作证，不需要 GG-* 腿替它们记账 ⇒ 只要该页有**任意一行**带着声明（哪怕声明的是 guest），② 就不生效，跑测证人再缺席就照旧 exit 2。第 3b 条（整页声明 guest）与新增第 9b 条（部分声明）都是这条红线的负例。

依据的出处（不是本车道编的）：执行器 `scripts/qa/r-exec-cli.mjs:159-163` `identityScopeSkip()` 对空 `identities` 返回 `""`（不跳）⇒ "未声明 = 游客腿照跑这一行"。所以"整页未声明"的页确实是一群仍归游客腿判的断言，而它们被弹到登录页时一条都判不到东西 —— 这就是"这些行自己就是这一落地对的证人"的理由。

判决写成机器可读字段（不是 prose）：每组新增

- `memberBasis`：`ops-narrowed-out-of-guest-leg` / `ops-entirely-undeclared-guest-assertions` / `run-observed-only`；
- `memberSource` 扩两格：`fromOpsNarrowed`、`fromOpsEntireGuest`（原有 `fromOps`、`fromRun` 语义不变）；
- `memberBasisEvidence`：`opsRowsOnPage` / `rowsWithoutIdentityDeclaration` / `rowsScopedOutOfGuestLeg` / `rowsScopedToGuestLegByDeclaration` / `rule`（规则全名 + 依据出处）。

读数行：`GUEST_LAND_OPS_ENTIRE_GUEST=<组数> 组 / <行数> 行（…）：<页名>(ops 行=N 全部未声明 identities ⇒ 证人=N)` —— 新路线的命中面单独打印并点名，不许混在"成员来自 ops 的"里。

另加一条不变式（病灶本体，`:202-206`）：`rows.length !== policy 组数 ⇒ markProblem("roster 组=X ≠ policy 裁定组=Y ⇒ 有裁定出不了腿…")`。
它把"一本拍不了的账本"变成硬失败：**载具不许 book 一组自己拒拍的落地对**。（注：`--mode book` 仍在判决之前写 `--out` 账本，这是既有落盘次序，本车道没改它；改的是"少一组"从此一定 exit 2 且点名，不会被当成正常读数收口。）


## 4. 改前 / 改后的组数与证人数（含守恒声明）

同一支命令、同一份 policy，只换代码（`--out` 全部指到 `.zcode/tmp/guest-r9/`，**没有写回任何在册产物**）：

| 输入 | 改前 | 改后 |
| --- | --- | --- |
| `--mode book`，缺省单切片 triage（= §11 那一次的输入） | exit **2**；roster **组=27**、成员行次 **434**、NO_RUN_WITNESS=1、`✗ 一名成员都没有` | exit **0**；roster **组=28**、成员行次 **445**、NO_RUN_WITNESS=2、`GUEST_LAND_OPS_ENTIRE_GUEST=1 组 / 11 行` |
| `--mode book`，并集 triage（r7 + r10 守卫腿） | exit 0，roster 组=28，但该组 `memberSource={fromOps:0,fromRun:4}`（成员**完全吊在喂哪份切片上**） | exit 0，roster **组=28**、成员行次 **445**，该组 `{fromOps:11,fromRun:4,fromOpsNarrowed:0,fromOpsEntireGuest:11}` |
| `--mode book --ops reports/audit/round-7/ops`（§11 说"换成 round-7 同样 exit 2"） | exit **2** | exit **0**，roster 组=28 / 445 |
| `--mode measure`（§11 原调用） | exit **2**（拦门在取租约之前，一帧未拍） | **未跑**：改后预检已经绿了，跑它就得拿租约；本车道按纪律不碰设备。改后 measure 仍会拦"没有证人"的组 —— 证据在第 5 节的夹具腿（`--mode measure` 用的就是同一份 `buildPlan()` 判决，`9c` 还钉死了"拦门排在 `acquireUi` 之前"） |

**成员来源归一（病灶的另一半）**：改后 `GUEST_LAND_ROSTER … 成员来自 ops 的=28 只来自跑测的=0` —— 28/28 组都有 ops 证人（`memberSource.fromOps>0`，`test-guest-landing.mjs` 第 10 条钉这条），所以 roster 不再随 `--triage` 喂哪份切片在 27/28 之间摆。跑测那一路现在只能**追加**行、不能决定"谁在账上"（7/28 组有追加行，例如 `subpackages/campus/campus/hub` fromOps=19 / ids=22）。
`buildPlan()` 在文件里只被调用一次（`:293`），book 与 measure 共用同一份名册 ⇒ 不存在"算两遍"；测试第 9c 条用源码级检查钉住"调用次数==1"。

**守恒（用脚本比对的，不是叙述）**：改前 booked 27 组 vs 改后 booked 28 组，逐组比 `groupKey` 集合与共有组的 `caseIds`：

```
before.rows=27 after.rows=28
消失的组=[]  新增的组=["subpackages/setup/recommend-pref/index → pages/login/index"]  成员变了的共有组=[]
debtRows before=434 after=445（差 = 11 = 新路线命中页的行数）
memberBasis 分布={"ops-narrowed-out-of-guest-leg":27,"ops-entirely-undeclared-guest-assertions":1}
```

⇒ 落地对集合一条没丢、一条没多：改后 28 组 == `guest-landing-policy.json` 的 28 条裁定 == 在册 measured 的 28 行（`booked==measured 组集: true`）。
只有证人推导规则变了，且只影响 1 组 / 11 行；其余 27 组的成员逐字节相同。
改前那个"28 vs 27"的分叉（在册 booked 28 组、预检 roster 27 组）现在是 **28 vs 28**。


## 5. 负例能变红（RED 证明）

`scripts/qa/test-guest-landing.mjs` 加了两块（离线，`--out` 全在 `.zcode/tmp/guest-landing-selftest/`，不碰设备）：

- **9a 正例**：把夹具页 `subpackages/tools/search/index` 的 11 行全剥成"无 identities 声明"，并把它的落地对从 triage 里删掉 ⇒ 必须 exit 0，且 `GUEST_LAND_OPS_ENTIRE_GUEST` 点名该页、账本里 `memberBasis=="ops-entirely-undeclared-guest-assertions"`、`caseIds` 恰等于该页 ops 全部 11 行、落地对集合与 policy 逐组相等。
- **9b 负例（钉住窄条件）**：同一页只让**第一行**带 `identities:["guest"]`（明写"归游客执行腿自己判"），其余照旧没声明，跑测证人照旧缺席 ⇒ **必须 exit 2**，读数不许点名该页，且拍不了的组不许进账本。
- **9c 结构**：`buildPlan()` 只被调用一次（名册只有一个来源）；`GUEST_LANDING=FAIL` 的拦门行号排在 `acquireUi({` 之前（预检不过时结构上拿不到租约）。
- **10 真数据改动面**：28/28 组都有 ops 证人；`memberBasis` 分布必须是 `1 + 27`（别页哪天开始整页掉声明，这里先红，而不是悄悄多发 GG-* 腿）；booked 组集 == measured 组集。
- 顺带把**第 3 块的两条腿改成传并集 triage**（基线 realOut 传的是并集，控制腿却传单切片 ⇒ "删一组"这个变量上混进了 recommend-pref 从"零证人"变成"具名读数"的位移，读数从 +1 跳到 +3 判红）。这是夹具对齐载具自己写的正确用法（`GUEST_LAND_WARN` 要求多腿轮传并集），**判据一字未松**：3b 那条"跑测证人 + 判据台证人同时撤 ⇒ 红"照旧必须 exit 2。

真代码全绿：`"$N" scripts/qa/test-guest-landing.mjs` ⇒ `SUMMARY: checks=39 assertion failures = 0` / `GL_TEST=PASS`（运行时 39 条 == 静态 39 个 `t(`；改前基线静态 25 个，`git show HEAD:scripts/qa/test-guest-landing.mjs | grep -cE "^\s+t\("` = 25，且 `git diff 1788675d..HEAD` 证明这两个文件在本会话期间没被别车道动过 ⇒ 改前口径就是 1788675d 的口径）。

**变异体（证明 9b 真的能红）**：复制载具为 `scripts/qa/verify-guest-landing.mutation-tmp.mjs`（名字不匹配聚合器的 `^test-.+\.(cjs|mjs)$`，不会被收进自测），只松一刀：

```
if (r.rows > 0 && r.undeclared.size === r.rows)   →   if (r.rows > 0 && r.undeclared.size >= 1)
```

同一份 9b 夹具（部分声明 + 跑测证人缺席）：

```
MUTATED_EXIT=0
GUEST_LAND_ROSTER 组=28（成员来自 ops 的=28 只来自跑测的=0）成员行次合计=470｜跑测观察并集组数=26
GUEST_LAND_OPS_ENTIRE_GUEST=12 组 / 59 行（…）：pages/nearby/index(ops 行=42 … 证人=14)，
  subpackages/campus/campus/hub(ops 行=27 … 证人=8)，subpackages/campus/campus/index(ops 行=30 … 证人=7)，
  … subpackages/tools/search/index(ops 行=11 … 证人=10)，subpackages/village/village/index(ops 行=42 … 证人=3) …
GUEST_LANDING_RESULT=OK

REAL_EXIT=2
GUEST_LAND_ROSTER 组=27（成员来自 ops 的=27 只来自跑测的=0）成员行次合计=434｜跑测观察并集组数=26
GUEST_LAND_OPS_ENTIRE_GUEST=1 组 / 11 行（…）：subpackages/setup/recommend-pref/index(ops 行=11 … 证人=11)
  ✗ policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何证人（…）⇒ 这一组没有任何证人：
  ✗ 组 subpackages/tools/search/index → pages/login/index 一名成员都没有 ⇒ 有裁定却没有账本成员（…），不能出 GG-* 腿
  ✗ roster 组=27 ≠ policy 裁定组=28 ⇒ 有裁定出不了腿（…）：subpackages/tools/search/index → pages/login/index
```

⇒ 松一刀就多 11 组 / 48 行伪证人（`pages/nearby/index` 42 行里只有 14 行没声明也算"整页"），而且把**被收窄出游客腿**的那批行重新算成游客证人 = 判域倒转。这条负例不是装饰。

**measure 侧的拦门在改后仍然带电**（真 `--project`，夹具语料；exit 2 于 `:302`，早于 `:304` 的 `acquireUi`）：

```
FIXTURE_MEASURE_EXIT=2
GUEST_LANDING=FAIL 先修这几条再来量（带病出腿 = 白拿租约）：
  policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何证人（…）⇒ 这一组没有任何证人：
  subpackages/tools/search/index → pages/login/index
  组 subpackages/tools/search/index → pages/login/index 一名成员都没有 ⇒ …不能出 GG-* 腿
  roster 组=27 ≠ policy 裁定组=28 ⇒ 有裁定出不了腿（…）
LOCKS_IDENTICAL ／ grep -l r7-guest-landing tmp/qa/locks/* ⇒ NONE
```

变异副本已删：

```
$ rm -f scripts/qa/verify-guest-landing.mutation-tmp.mjs
$ ls scripts/qa | grep -iE "mutation|guest-landing"
guest-landing-policy.json
guest-landing-policy.json.bak-20260929-134610
guest-landing-status.mjs
test-guest-landing.mjs
verify-guest-landing.mjs
$ git status --short scripts/qa   → 只有 4 项 " M"（我的 2 个 + 别车道 2 个），无 "??" ⇒ 本车道零新增/零遗留文件
```


## 6. 聚合器发现的测试数（改前 / 改后）

聚合器按文件名 `^test-.+\.(cjs|mjs)$` 自动收（`scripts/qa/run-qa-selftests.mjs:24-25`，实测读码确认），门自检另计（`:66-70` 显式列，不进 `发现=` 那本账）。两次都是实跑，没沿用别人给的 34/1：

| | 改前（本车道动代码之前） | 改后 |
| --- | --- | --- |
| `SELFTEST_DIR=qa/test-* 发现=` | **35** | **36** |
| `SELFTEST_RAN / SKIPPED / FAILED / NO_SUMMARY_LINE` | 34 / 1 / 0 / 0，覆盖文件=35/35 | 35 / 1 / **1** / **1**，覆盖文件=36/36 |
| `GATE_SELFTESTS_RAN / _FAILED` | 1 / 0 | 2 / 0 |
| 退出码 / 结论 | `AGG_BEFORE_EXIT=0`，`SELFTEST_RESULT=PASS（34 个离线测试 + 1 条门自检全绿，1 个 UI 绑定测试按策略跳过）` | `AGG_AFTER_EXIT=1`，`SELFTEST_RESULT=FAIL（1/37 个离线测试与门自检未过）` |

`发现` 从 35 变 36 **不是本车道加的**：我只扩了既有的 `test-guest-landing.mjs`（`git status --short scripts/qa` 里本车道零 `??`）。新增那份是别的车道的 `scripts/qa/test-panel-sha-class-axis.cjs`（首次入库于会话期间的 fa65cf64，`git cat-file -e 1788675d:…` 证明它在 1788675d 上不存在）。

改后唯一那条红也不是本车道的：`FAIL test-evidence-store-axis.mjs exit=null 无自报断言计数（不可信） 无 *_TEST= 判据行 300s` —— 它自己 import 的只有 `verify-evidence-corpus.mjs` 那一族（全文提 `test-guest-landing` 只有第 57 行一句注释），单跑时 <150s 就出判决（`FAIL 2 库可达：PROBLEMS 仍等于基线 …` / `FAIL 3b 库落在仓内 …`），而它内部 `spawnSync(…, {timeout: 900000})` 比聚合器给单测的 300s 上限长 ⇒ 被聚合器 kill 成 `exit=null`。属"别车道在建的轴 + 超时口径不匹配"，交回编排器排给别人；本车道没有动它（禁改清单里也有它）。
**本车道那一条**：`PASS test-guest-landing.mjs exit=0 断言失败数=0 GL_TEST=PASS 19s`。

## 7. 没有改动的东西（not changed）

- `scripts/qa/guest-landing-policy.json`：**一字未改**（成员是判据台语料的事实，不是裁定；写进 policy 就是再造第二个成员来源，正是病灶）。
- `reports/audit/round-7/ops/`、`reports/audit/round-6/ops/`：**只读**，没有给 RP 行补 `identities:["guest"]`（裁定 (b) 没实现，按你的判）。
- 落地对集合、复测次数（`--repeat` 只是命令行参数，代码里默认仍是 1）、判定窗 `WINDOWS=[2500,4500]`、band/阈值：全部未动；`guest-landing-status.mjs` 的三态口径未动。
- 在册三份产物 `guest-landing-booked.json` / `guest-landing-measured.json` / policy：**本车道没有写回任何一个**（所有 `--out` 都指到 `.zcode/tmp/guest-r9/`；改后 measured 仍是 `2026-09-28T10:15:58.555Z` / `real@f0677920` 的 28 行，我复量过没被碰）。
- 设备/租约：一帧未拍、一次锁未取（`tmp/qa/locks` 前后 `diff` 为空，无 `r7-guest-landing` 属主）。
- 免检/豁免：一处没加；没有任何页被标成"不用拍"。改的是"谁算证人"，结果是多了一组**要拍**的腿（GG-setup-recommend-pref-index 现在在账上且预检放行）。
- 禁改清单里的 `emit-round-report.mjs` / `apply-ops-cellplans.mjs` / `verify-case-automatable.mjs` / `run-qa-selftests.mjs` / `.zcode/workflows/**` / 任何构建脚本：都没动（`run-qa-selftests.mjs`、`verify-case-automatable.mjs`、`test-panel-sha-class-axis.cjs` 在 `git status` 里的 " M" 是别车道的）。

## 8. 命令退出码总表（全部 Node 22）

| 命令 | 改前 | 改后 | 说明 |
| --- | --- | --- | --- |
| `"$N" scripts/qa/verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real --repeat 3 --only GG-…,GG-setup-recommend-pref-index`（§11 原调用） | **2**（拦门，零帧） | **没有再跑** | 改后预检已经绿，跑它就得拿租约 —— 按"无 UI/无租约"纪律停手。measure 分支仍带电的证据：第 5 节夹具腿 `FIXTURE_MEASURE_EXIT=2`（真 `--project`，同样走 `:293 buildPlan()` → `:302` 拦门） |
| `"$N" scripts/qa/verify-guest-landing.mjs --mode book --out .zcode/tmp/guest-r9/…`（缺省 triage） | **2**（roster 27 / 434） | **0**（roster 28 / 445） | 设备无关的预检形态，改前/改后都在这上面量守恒 |
| `… --mode book --triage .zcode/tmp/triage-r7-guest.json,.zcode/tmp/triage-r10-guest.json.json`（并集） | 0（在册 booked 的来历：RP 组 `fromOps=0/fromRun=4`） | **0**（RP 组 `fromOps=11/fromRun=4/fromOpsEntireGuest=11`） | 两条 triage 输入现在给出同一个 roster=28 ⇒ 分叉消失 |
| `… --mode book --ops reports/audit/round-7/ops` | **2** | **0**（roster 28 / 445） | §11 第 1 条排错里"换成 round-7 同样 exit 2"的那一发 |
| `"$N" scripts/qa/test-guest-landing.mjs` | 0（checks=25 静态） | **0**（`checks=39 failures=0` `GL_TEST=PASS`） | 离线，`--out` 全在 `.zcode/tmp/` |
| `"$N" scripts/qa/run-qa-selftests.mjs` | **0** `SELFTEST_RESULT=PASS`（发现 35 / 跑 34 / 门自检 1） | **1** `SELFTEST_RESULT=FAIL（1/37 …）` | 唯一红 = 别车道的 `test-evidence-store-axis.mjs`（聚合器 300s 上限 vs 它内部 900s spawn ⇒ `exit=null`）；本车道那条 `PASS test-guest-landing.mjs … GL_TEST=PASS 19s` |
| `"$N" scripts/qa/verify-ledger.mjs reports/audit/round-6` | 未在本车道改动前单独跑过（见下） | **1** ×2（`NOT_IN_ANY_MATRIX=71`、`LEDGER_RESULT=FAIL（71 个 ID 全轮次矩阵均无本尊行…）`） | **与本车道无关**：`grep -nE "verify-guest-landing|test-guest-landing" scripts/qa/verify-ledger.mjs` = 0 命中，它的输入只有 `reports/audit/round-6/*` + `scripts/qa/normalize-ledger-status.mjs`（`:338`），两次实跑读数一致（`DATA_ROWS=236 OFF_SCHEMA_ROWS=0 ROTATED_ROWS=0 STATUS_VOCAB_BAD=0`，红在 ID 归属不在形状/词表）。今天更早的记录（`held4-landing-r9.md:129`）同一条命令是 exit 0 ⇒ 这条红是本会话期间 4 次提交（fa65cf64/70472d92/94c286bf/740957e3）带来的台账漂移，属台账/ops 车道的账，我按纪律没有去动 `reports/audit/round-6`。 |


