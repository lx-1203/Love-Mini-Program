# Round 5 · 修复车道 B1 — 客户端（apps/client）

审查基线：第五轮 B 泳道报告 `round-5-lane-B-frontend.md` 的 FINDING 1/2/3/7/8/9/10/15。
本文件是**修复交付记录**，不是复审判决：每条给「改了什么 + 判点 + 实测读数 + 判不出」。

车道执行说明（必须写在这份账里）：本车道的前半段由子代理跑，在 **150 轮上限**处中断，
**没有落任何报告**（4528 万 token / 162 次工具调用），盘上留了 27 个文件的改动。
主控接管后做了三件事：① 逐条复量它已落的改动是否成立；② 补完它**没做完**的两条
（F-7 的第四处、F-15 的登记与登出接线）；③ 修掉它打破的两个既有 spec。
下面每条都注明是「子代理落的」还是「主控补的」，不混在一起自称完成。

---

## 1. FINDING 2｜`hasAnswered` 永不为真 ⇒ 二次进页面拉不到回答列表（P2 活错）

**现象**：页面按 `hasAnswered` 决定要不要拉回答列表，而 state 顶层的 `hasAnswered`
只有 `submitAnswer` 会写；`fetchTodayQuestion` 拿到了后端的权威值却只塞进
`todayQuestion`，两处同名字段不是同一个位置 ⇒ 「今天已答过、重新进页面」永远拉不到回答，
本轮刚修的分页链路在首屏根本没机会执行。

**改动**（子代理落的）：`src/stores/daily-question.ts` 的 `fetchTodayQuestion` 两个分支都写顶层
`hasAnswered`；mock 分支按「本地已答标记 ∪ 演示数据标记」取并集，不把 mock 的 false 覆盖真实提交。

**判点**：`src/tests/stores/daily-question-pagination.spec.ts`（+75 行）钉「fetch 之后顶层值
必须等于后端下发值」，真假两个方向都有。

**读数**：`npx vitest run src/tests/stores/daily-question-pagination.spec.ts` 见 §9 全量。

---

## 2. FINDING 1｜页面侧守卫无红门（P3 债）

**改动**（子代理落的）：新增 `src/tests/pages/daily-question-page.spec.ts`，照本仓
`village-post-delete.spec.ts` 的 `readFileSync` + `@vue/compiler-sfc` 静态契约口径，判
`loadMoreAnswers` 函数体必须含 `answerLoading.value` 且去掉该位后不得再出现 `loading.value`
（后者是关键：直接写「不得含 loading.value」会被 `answerLoading.value` 自己的子串误伤，
所以判据先摘掉 `answerLoading.value` 再扫），并判模板 `:maxlength` 绑的是 `MAX_ANSWER_LENGTH`
常量而非裸数字。

**判点如何能红**：把页面守卫改回 `|| loading.value` ⇒ 第二条断言红。

---

## 3. FINDING 3｜「入口可达性」没有测试（P3）

**改动**（子代理落的）：判定规则收成单一出口 `isPostAuthor(...)`（`stores/village/utils.ts`），
`subpackages/village/village/detail.vue` 的 `isOwnPost` 改为调它；
`src/tests/pages/village-post-delete.spec.ts` +42 行，新增**运行时**用例（不再是源码文本断言）：
`userSession.userId` 为字符串 `"u-9"`、后端 `author.userId` 为数字时判定必须为真；
`userSession` 为空时判为非本人、删除项不出现；并静态判 `detail.vue` 不得再自拼比较式。

**读数**：该 spec 从 14 例增至 **18 例**，全绿。

---

## 4. FINDING 7｜展示价绕过 `costYuanFor()` 直读定价镜像表（P3）

**改动**：`CardDetailOverlay.vue`、`subpackages/discover-extra/likes/index.vue` 两处由子代理改；
`subpackages/discover-extra/likes-visitors/index.vue:113` 子代理**未改**（该文件不在它的改动面里），
由主控改为 `coinsStore.costYuanFor(...)` 并删掉 `UNLOCK_COST_YUAN` 的 import。

**判点**（主控加的）：`src/tests/stores/server-price-mirror.spec.ts` 新增一个 describe，
遍历 `src/**/*.vue`，**剥离注释后**判代码里不得出现 `UNLOCK_COST_YUAN`
（三处已迁移页面在修复说明里逐字留着改前原文，连注释一起扫会恒红）。三条断言：
扫描面 ≥150 个 .vue（防空转）、违例集必须为空、阳性对照——替代出口 `costYuanFor/unlockCostYuan`
必须仍被 ≥4 个页面消费（否则这条门只是在守一个已经消失的符号）。

**反向变异（主控跑的）**：把 `likes-visitors/index.vue` 那一行还原成
`UNLOCK_COST_YUAN[...]` ⇒ `× 没有任何 .vue 的可执行代码直读镜像表` 红；
还原后 `sha256 103a734a720b72e44acbceefa596c9c4d56b2478b55f0ae4441e08ed30f7f4a4`
与改前逐字相同。门读数：`15 passed (15)`。

---

## 5. FINDING 8｜充值文案裸写 100 + 409 判重被当失败（P3）

**改动**（子代理落的）：`subpackages/market/wallet/index.vue` 的成功 toast 改为
`centsToYuan(RECHARGE_AMOUNT_CENTS)`，与上送金额同一个源；
新增 `isAlreadyCreditedConflict(err)`：命中 `status===409` 且
`code|error === "IDEMPOTENT_CONFLICT"` 时按**已入账**收尾（清键 + 重取余额与流水 +
复用既有 `wallet.rechargeSuccess` 中性文案），不再把后端原文当失败弹给用户、也不再留着键不清。

**判点**：`src/tests/pages/wallet-recharge-idempotency.spec.ts` 5 例全绿（含键稳定性）。

**遗留**：`Idempotent.java` 的键 TTL 默认 4 小时这一条**没在前端修**（超出本道范围）：
「响应丢失 → 保留键」与 4 小时后键自然过期之间的窗口仍在，兜住它的是后端
`app.demo-recharge.enabled` 默认 false + 5 次/日 + 终身 500 元上限。下一轮要收的是
「保留键的终态判定」而不是 toast 文案。

---

## 6. FINDING 9｜账单行手写 `/100`（P3）

**改动**（子代理落的）：钱包页 `amountText` 走 `centsToYuan`/`formatCentsAsYuan`；
`stores/coins.ts` 的 `CoinTransactionItem.amount` 从写死的 `number` 改成
`number | null | undefined`，与后端 `Long amount`（无非空注解）对齐 ⇒ 金额未知印 `--` 而不是 `NaN`。

**这条修复自己带进的一个活错（由 i18n 车道的 typecheck 抓到，主控修）**：
子代理在 `amountText` 的未知分支里用了 `formatCentsAsYuan`，却**没把它加进 import**
（第 12 行只 import 了 `useCoinsStore, centsToYuan`）⇒ 一旦后端真下发 `amount: null`，
这一行是 `ReferenceError` 而不是 `--`。151 个 spec 全绿也没抓到，因为**没有任何用例走到
「金额为未知」这条分支**——这正是本仓反复出现的「判点只覆盖正路」形态。
B2 车道跑 `npm run typecheck` 时报 `TS2304 Cannot find name 'formatCentsAsYuan'`（:326），
是这一条被抓到的现场证据。修法：补 import；同时把未知分支从 ``¥${formatCentsAsYuan(cents)}``
改成直接返回 `formatCentsAsYuan(cents)`（`¥--` 会让 `--` 看起来像一个被截断的金额）。
修后 `apps/client` `npm run typecheck` → EXIT=0。

**记账的结论**：客户端 `typecheck` 不在 `test:contracts` 那 34 条里（CI 有独立 job，本机从未跑出过读数），
所以「子代理改完只跑 vitest」这条路径对这一整类缺陷是盲的。收口环节要把双端 typecheck 接进链
（或把「链内必须有一次 typecheck」登记成待办），否则下一轮还会以同样的方式漏掉。

---

## 7. FINDING 10｜mock 钱包把「余额归零」当「没加载过」（P4）

**改动**（子代理落的）：`stores/coins.ts` 引入具名常量 `MOCK_INITIAL_BALANCE_CENTS = 80000`，
`fetchBalance` 与 `spend` 的 mock 分支都用 `loaded` 标志判初始化，不再用 `=== 0` / `|| 80000` 当哨兵
⇒ 演示走查里把钱扣到 0 之后不会自己弹回 800。

**连带打破的两处（由主控修，记账在这里）**：子代理改完 store 没回头跑既有 spec，全量套件红 2 个文件 7 例。
- `src/tests/components/WhisperComposeSheet.spec.ts`（2 例）：夹具 `setBalance(2000)` 直接写 state，
  但弹层以 `visible=true` 挂载时组件的 immediate watcher 会调 `fetchBalance(false)`；新语义下
  `loaded` 仍为 false ⇒ 被判成「没初始化」并回填 80000。**这是夹具不满足 store 自身不变量，不是产品回归**，
  所以修的是夹具：`setBalance` 同时置 `loaded = true`。修后 `7 passed (7)`。
- `src/tests/pages/wallet-recharge-idempotency.spec.ts`（5 例）：该 spec 整份替换了
  `../../stores/coins`，而页面新增了 `centsToYuan` 出口 ⇒ 该函数在桩里是 undefined，
  充值流程在取文案金额那一步抛 TypeError，一条请求都发不出去，判点以「没派发」的形式假失败。
  改为 `vi.mock(..., importOriginal)`：只桩 store 本体，换算函数用真身。修后 `5 passed (5)`。

---

## 8. FINDING 15｜登出清了存储、没清 Pinia 内存态（P2，跨账号可见）

**复量子代理的实际状态**：`grep -rn "resetForLogout" src/stores` 命中 21 个文件（19 个 store 实现了
复位入口，`checkin`/`daily-question` 走 `$reset()` 并在注释里说明为何整块是账号态），
但 `src/stores/session.ts` **一行没改**——登记表不存在、`logout()` 不调用任何 store 的复位、
也没有「新增 store 必须登记」的门；它写在 `checkin.ts` 注释里的「判点见 session.spec」当时是**空头承诺**
（`session.spec.ts` 未被改动）。以下由主控补完。

**改动**：
- 新增 `src/stores/logout-registry.ts`：`ACCOUNT_SCOPED_STORES`（25 项，`{id, load}` 形态，
  `load` 必须惰性——顶层求值会在 pinia 激活前炸，且部分 store 内部会读 session store）、
  `NON_ACCOUNT_STORES`（3 项带可反驳的理由：`session` 是登出执行者本身、`app-config` 是服务端下发配置、
  `theme` 是设备级偏好）、`resetAccountScopedStores()` 逐项返回 `{id, status}`，
  区分 `reset / no-method / error`，单个 store 抛错不影响其余（登出的本地清理必须「尽力清完」）。
- 补 `resetForLogout()` 的 5 个 store：`campus-wall`（`isLiked`/`isFollowing` 是账号点的，
  种子数据 hoist 成 `seedPosts()` 供初始化与复位共用一份）、`schedule`（课程条目；时段模板不动，
  冷启动快照用初始化器本身取，避免第二份种子）、`vip`（会员身份/到期日/账单分页；目录 `plans` 不动）、
  `vip-auto-renew`、`vip-billing`（两者已有 `reset()`，`resetForLogout` 委托它，命名与登记表对齐）。
- `src/stores/session.ts` 的 `logout()` 在 session 自身字段清空**之后**调 `resetAccountScopedStores()`
  （个别 store 的复位会读会话状态，要先落到「已登出」）。

**判点**：
- 静态穷尽门 `src/tests/stores/logout-registry.spec.ts`（6 例）：扫 `src/stores/**/*.ts` 的
  `defineStore('...')`（单双引号都认，`socialProgress` 这种 camelCase id 也在射程内），
  判「每个 store 要么登记复位、要么登记为不跟账号走」，反向判「登记表不得指向盘上已不存在的 id」、
  「登记复位的 store 必须真的实现了 `resetForLogout()`」、「豁免必须带 ≥12 字的理由」、
  「登记表数组里只许函数引用不许顶层调用」、以及解析到 `defineStore` ≥25 个的防空转下限。
  遍历口径与 `storage-keys.ts` 的「默认即安全」同形：**新增 store 不登记就红**。
- 运行时红门（`session.spec.ts` 新增 5 例）：走生产同一入口
  ① 登记表每项 `entry.load()` 都必须有 `resetForLogout`；
  ② `checkedIn=true` → 登出后必须 false（每日一问的签到门槛不再被 B 账号绕过）；
  ③ `hasAnswered=true` + `answers=[一条]` → 登出后 `hasAnswered=false`、`answers` 空、
  `answerPage` 回 1（`answerHasMore` 断言的是**冷启动形态 true**，不是「清成 false」，
  这条写成 true 是为了钉住「`$reset()` 回初始化器」这个选择本身）；
  ④ `balanceCents=2000`/`loaded=true` → 登出后 0 / false（B 不再先闪出 A 的余额）；
  ⑤ `village.posts` 非空、`vip.expireDate` 有值 → 登出后清空 / null。

**读数**：`npx vitest run src/tests/stores/logout-registry.spec.ts src/tests/stores/session.spec.ts`
→ `Test Files 2 passed (2)`、`Tests 34 passed (34)`。
**反向变异**：临时新建 `src/stores/__probe-lane-b1.ts`（一个未登记的 `defineStore("probe-lane-b1")`）
⇒ `AssertionError: 未登记的 store：probe-lane-b1 @ __probe-lane-b1.ts`，`1 failed | 5 passed`；
探针文件已删（`ls` 确认不存在），门复绿。

**判不出（本机限制，不许冒充已验证）**：本道全程未起 dev server、未做构建、未在微信开发者工具里
跑过真机；跨账号残留的用户可见后果是**从源码分支推导**的（引用具体条件与行号），
不是屏幕上看到的。登出后 `reLaunch` 是否真的不重置 JS 运行时，需要 real 档双账号 e2e 才能取证。

---

## 9. 全量验证读数

- 单文件：`server-price-mirror` 15/15、`wallet-recharge-idempotency` 5/5、`WhisperComposeSheet` 7/7、
  `logout-registry` + `session` 34/34。
- 全量：`npm run test:unit`（apps/client）→ `Test Files 151 passed (151)`、`EXIT=0`。
  ⚠ 口径提醒：这一发跑在 B2（i18n 迁移）车道已经开始改 `village/publish.vue`、`village/post.vue`、
  `pages/register/index.vue` 与 `locales/zh-CN.ts` 的窗口里，因此它是「B1 收口时的客户端读数」，
  **不是**整批改动的终验数；终验由收口环节重跑一次并以此文件 §9 的更正为准。

## 10. 接线三件套

本道新增的 spec 都在 `apps/client/src/tests/**`（vitest 目录内自动发现），
**不需要**根 `package.json` 或 CI 的新脚本登记；`tests/gate-wiring.spec.mjs` 只盘根 `tests/*.spec.mjs`，
本道未在其中新建文件。若下一轮把「登出内存态」轨升成根门，需按三门登记点（bash 终验清单 /
DSL `GATE_SUITE` / `run-qa-selftests.mjs` 的 `GATE_SELFTESTS`）接满。

## 11. 遗留债

1. 充值保留键与 4h TTL 之间的终态判定（§5）。
2. `likes/index.vue:255` 用 `msg.includes("余额不足")` 做控制流判定 —— 客户端行为钉在后端中文措辞上，
   属另一类缺陷，本道未动（要改需与后端错误码同批）。
3. 页面级静态契约仍只覆盖被点名到的页面；`src/tests` 引用到的 .vue 与 74 个页面/分包页的差集
   由下一轮按门复量。
