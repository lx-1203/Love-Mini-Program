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

现场核对（`tmp/qa/locks` 前后同 4 份，均为别的车道既有锁，我没新增、没残留）：

TODO-lockcheck

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

TODO

## 4. 改前 / 改后的组数与证人数（含守恒声明）

TODO

## 5. 负例能变红（RED 证明）

TODO

## 6. 聚合器发现的测试数（改前 / 改后）

TODO

## 7. 没有改动的东西（not changed）

TODO
