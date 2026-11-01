# Round-5 · Lane B — 前端反证审计（apps/client + apps/admin）

审计基线：`origin/main` = `5d7983ce`，被审批次 = `0001e499`（第四轮前端修复四条）。
方法：读整文件 + 跑既有 spec（`npx vitest run src/tests/...`、`npm run test:unit`、`node tests/admin-write-gate.spec.mjs`）。
本 lane 未改、未建、未删 `apps/client` 与 `apps/admin` 内任何文件；未跑 dev server / build。

## 0. 判决表

| # | 批次声称 | 判决 | 证据（可复现） |
|---|---|---|---|
| a1 | 每日一问分页守卫改读独立 `answerLoading`，不再双推 | **已证实** | `apps/client/src/stores/daily-question.ts:452`（在途守卫）+ `:456`（页码幂等）+ `:306`（按 id 去重）；`apps/client/src/subpackages/tools/daily-question/index.vue:136`（页面守卫已从 `loading` 换成 `answerLoading`）。`npx vitest run src/tests/stores/daily-question-pagination.spec.ts` → 10/10 绿；`:89` `expect(store.answerLoading).toBe(true)` 与 `:122` `expect(store.loading).toBe(false)` 一旦回退即红 |
| a2 | 回答长度契约 500→2000 与后端对齐 | **已证实** | `apps/client/src/stores/daily-question.ts:22` `MAX_ANSWER_LENGTH = 2000`；后端 `apps/api/src/main/java/com/campuslove/api/discover/DailyQuestionController.java:98` `@NotBlank @Size(max = 2000)`；模板绑定 `index.vue:256` `:maxlength="MAX_ANSWER_LENGTH"`。spec `:182` `expect(MAX_ANSWER_LENGTH).toBe(2000)` 钉住 |
| a3 | 「页面侧守卫」这一半是否被测试钉住 | **判不出（无红门）** | 没有任何 spec 挂载 `subpackages/tools/daily-question/index.vue`（`grep -rln subpackages apps/client/src/tests` 无该文件）；把 `index.vue:136` 改回 `loading.value` 全库无红。见 FINDING 1 |
| b | 作者可删自己的动态：DELETE 路由 + store 四处摘除 + 详情页菜单 | **已证实** | 后端 `apps/api/src/main/java/com/campuslove/api/village/VillageController.java:253-259`（`@DeleteMapping("/{id}")` + `hasRole('USER')`）；前端 `apps/client/src/stores/village/api.ts`（`deletePostApi`）、`stores/village/index.ts:809-851`、`subpackages/village/village/detail.vue:342-420`。`npx vitest run src/tests/pages/village-post-delete.spec.ts` → 14/14 绿，三层各有判点（`:83` 断言 method=DELETE、`:96-99` 四处摘除、`:111` 失败不动列表、`:194` isOwnPost 门、`:231` 无空 catch） |
| c | 管理端超管端点从 `canWrite` 重挂到 `canSuperAdminWrite` | **已证实（但有两条门判不到的反向问题）** | 14 个视图共 70 处 `canSuperAdminWrite`（`grep -rn canSuperAdminWrite apps/admin/src/views --include=*.vue \| wc -l` = 70）；门 `node tests/admin-write-gate.spec.mjs` → 写视图 34 / 端点 182 / 不中 0 / 盲区 23-0-0；`--self-test` 双向判红通过。反向问题见 FINDING 4、FINDING 5 |
| d | 删除 `config/env.ts` 中永不可达的生产告警 | **已证实** | 修复前：`git show 0001e499^:apps/client/src/config/env.ts` 第 210-220 行 `if (isDev) return "mock"` 之后又写 `if (isDev) console.warn("生产环境未配置…")` ⇒ 分支互斥、永不打印。修复后 `apps/client/src/config/env.ts:218-249` 抽出纯函数 `resolveApiModeNotice`。`npx vitest run src/tests/env.spec.ts` → 11/11 绿；回退即 `import { resolveApiModeNotice }` 报错 + `:44` 的 `notice not.toBeNull()` 变红 |
| e | 悄悄话之外的「钱/计数器」轨：本次未发现新的分/元错印，也未找到可双击造成的重复扣费 | **已证实为「无活错」+ 债 5 条** | 逐处 file:line 见 FINDING 6 的表；`npx vitest run src/tests/stores/server-price-mirror.spec.ts src/tests/pages/wallet-recharge-idempotency.spec.ts src/tests/pages/vip-money-display.spec.ts` → 24/24 绿；债见 FINDING 7-11 |

**门读数原样引用**（`node tests/admin-write-gate.spec.mjs`，2026-11-01）：
`admin write-gate contract ok（写 API 函数 96 个 / 写视图 34 个 / Java 写端点 182 个 / 已归档写函数 95 个 / 不中 0 条 / 豁免 0 条）`
`盲区：控件未能按处理函数归属 23 处（上界 30）/ TS 路径未匹配到 Java 端点 0 处（上界 0）/ 无守卫处理函数 0 处（上界 0）`

---

## FINDING 1 — 每日一问：页面侧守卫无红门；store 侧已钉死

**现象**：批次声称修的是「守卫读了一个不相关的 loading 标志」。store 层三道保险（在途标志、页码幂等、按 id 去重）都有测试；但真正承载原缺陷的那一行——页面 `loadMoreAnswers()` 的守卫——没有任何测试挂载该页面。

**证据**：
- `apps/client/src/subpackages/tools/daily-question/index.vue:136` — `if (!todayQuestion.value || !answerHasMore.value || answerLoading.value) return;`
- `grep -rln "subpackages" apps/client/src/tests` 的 28 个命中里没有 `daily-question`；`apps/client/src/tests/pages/` 下 13 个页面 spec 亦无每日一问。
- 对照：同批次的村口删除写了 `src/tests/pages/village-post-delete.spec.ts:162-267` 用 `readFileSync` + `vue/compiler-sfc` 对 `.vue` 源码做静态契约断言 —— 本仓已有「页面级静态契约」的既有做法，每日一问没用。

**影响**：把 `index.vue:136` 的 `answerLoading.value` 改回 `loading.value`，`npx vitest run src/tests/stores/daily-question-pagination.spec.ts` 与全量 `test:unit` 全绿。用户可见后果被 store 的 `answerLoading`+去重兜住（不会双推），所以这不是 P1；但「修复的一半无人看管」正是本仓定义的债。

**建议修法**：照 `village-post-delete.spec.ts` 的 `readFileSync` 口径加 6 行静态断言：`loadMoreAnswers` 函数体必须含 `answerLoading.value` 且不含 `loading.value`；同时断言模板 `:maxlength` 绑定的是 `MAX_ANSWER_LENGTH` 而不是裸数字。

**严重度**：P3（债，非活错）

---

## FINDING 2 — 每日一问：`hasAnswered` 永不为真 ⇒ 二次进页面拉不到回答列表（现存活错，批次未提）

**现象**：页面只在 `hasAnswered` 为真时才拉回答列表，而 `hasAnswered` 只在 `submitAnswer` 里被置真；`fetchTodayQuestion` 拿到了后端的 `hasAnswered` 字段却只写进 `todayQuestion`，从不写进 store 顶层的 `hasAnswered`。于是「今天已答过、重新进入页面」这条路径下回答列表永远为空，分页修复在真实首屏上根本没有机会被执行。

**证据**：
- `apps/client/src/subpackages/tools/daily-question/index.vue:103` `if (todayQuestion.value && hasAnswered.value) void dailyQuestionStore.fetchAnswers(...)`
- `apps/client/src/stores/daily-question.ts:333-365` `fetchTodayQuestion`：只 `this.todayQuestion = mapToDailyQuestion(data)`（`:359`），全函数未出现 `this.hasAnswered =`
- `apps/client/src/stores/daily-question.ts:318-327` state 里 `hasAnswered: false`；`:407`/`:426` 仅 `submitAnswer` 置真
- `mapToDailyQuestion`（`:65-74`）把后端 `raw.hasAnswered` 放进 `DailyQuestion.hasAnswered`，与 state 的同名字段是两个不同位置

**影响**：real 档下回答列表 + 本次修的分页链路在首屏不可达（用户看不到任何人的回答，也遇不到重复卡片）。同时 `EmptyState`（`index.vue:337` 的 `v-else-if="!loading && !answerLoading && hasAnswered"`）也永远不显示——三态皆不成立时列表区整体消失。

**建议修法**：`fetchTodayQuestion` 成功后加 `this.hasAnswered = data.hasAnswered;`（mock 档同理取 `mockTodayQuestion.hasAnswered`）；并在 `daily-question-pagination.spec.ts` 补一条「fetchTodayQuestion 之后 hasAnswered 必须等于后端下发值」的断言。

**严重度**：P2

---

## FINDING 3 — 村口删除：链路完整，但「入口可达性」没有测试；`deletePost` 失败态与后端档位一致

**现象**：三层链路（api → store → 页面）都在位且有测试；唯一判不出的轴是「用户实际怎么点到一个能删的按钮」——所有断言都建立在 `detail.vue` 的源码文本上，没有一条断言 `isOwnPost` 在 real 档能真的为真。

**证据**：
- `apps/client/src/subpackages/village/village/detail.vue:522-526` `isOwnPost` = `String(sessionStore.userSession?.userId) === String(currentPost.value?.author?.userId)`
- `apps/client/src/tests/pages/village-post-delete.spec.ts:190-201` 判的是正则匹配源码里 `isOwnPost.value ? t("village.detail.deleteAction") : ""` 这段字面量，不是运行时求值
- 后端档位核对：`VillageController.java:256` `@PreAuthorize("hasRole('USER')")`，`:257-259` 由 `userId` 与帖子作者比对（非作者 403）；前端可见性只是体验、不是授权 —— 与 `detail.vue:338-339` 的注释一致
- i18n 键在位且唯一：`apps/client/src/i18n/locales/zh-CN.ts:1921-1927`（`village.detail.delete*`）、`:4140`（`storeErrors.village.deletePostFailed`，在 village 块内）

**影响**：若 `sessionStore.userSession.userId` 与后端 `author.userId` 的类型/口径哪天漂移（数字 vs 字符串已用 `String()` 兜住，但 `userSession.userId` 若为空则恒 false），作者会「看不见删除项」而没有任何测试报警。

**建议修法**：在 `village-post-delete.spec.ts` 增一条运行时用例：以 `useSessionStore` 写入 `userSession.userId = "u-9"`、`currentPost.author.userId = 9` 后断言 `isOwnPost` 为真（现有 `postItem()` 已经默认 `authorId="u-9"`，改动很小）。

**严重度**：P3

---

## FINDING 4 — 权限门：`SELF_SERVICE_WRITE_HANDLERS` 的豁免理由与后端 URL 规则矛盾（门说 ok，点了必 403）

**现象**：门里唯一一条写端点豁免宣称「POST /v1/admin/account/change-password 接受 AUDITOR（类级 hasAnyRole）」，据此把 `Users.vue#handleChangePwd` 从 `ungardedHandlers`（上界 0）里豁免掉。但同一个门自己断言的 SecurityConfig 形态——`POST /api/v1/admin/** → hasAnyRole("ADMIN","SUPER_ADMIN")`——在 URL 过滤器层就把 AUDITOR 拦了，方法级类注解根本没有机会生效。豁免的前提是错的。

**证据**：
- 豁免条目：`tests/admin-write-gate.spec.mjs:72-74`
- 类级注解：`apps/api/src/main/java/com/campuslove/api/admin/AdminAccountController.java:60-62`（`@RequestMapping("/api/v1/admin/account")` + `hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')`）、`:88` `@PostMapping("/change-password")`（无方法级收紧）
- URL 级规则：`apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java:208-215`，且注释 `:203-205` 明确「四条写方法规则必须声明在通用 admin 规则之前，否则 AUDITOR 的写拦截会失效」
- 客户端自己也拦：`apps/admin/src/api/http.ts:453-461` — `isWrite && sessionRole !== null && !roleCanWrite(sessionRole)` ⇒ 直接 `throw new ApiError(403, t("errors.readOnlyRole"))`，请求根本不发
- 后端无 test 覆盖该端点：`grep -rn "change-password" apps/api/src/test` → 0 命中（所以这条口径没有任何可执行的反对证据）

**影响**：今天没有用户踩到，因为控件被另一层挡住（见 FINDING 5）。但门据此报「无守卫处理函数 0」是**假数**：`handleChangePwd` 确实是一个没有任何档位守卫的写处理函数，门靠一条理由错误的白名单把它从计数里抹掉。哪天有人按这条注释「给 AUDITOR 放开自助改密」，会得到一个必然 403 的按钮，而门仍然报绿。

**建议修法**：把豁免理由改成事实口径（URL 级 + 本地 http 拦截 ⇒ AUDITOR 无法自助改密），或者直接划掉这条豁免、在 `Users.vue` 的改密入口挂 `canWrite`，让「只读角色看不到改密」成为唯一一致口径；同时在 `admin-write-gate` 里加一条断言：`SELF_SERVICE_WRITE_HANDLERS` 引用的每个端点必须能在 `expandAuthorities` 结果里放行所声称的角色，否则门自身判红。

**严重度**：P2（门的可信度，不是当下用户可见故障）

---

## FINDING 5 — 权限门：档位轴看不见 `currentAdminRole === 'SUPER_ADMIN'` 这类裸角色比较（反向：后端允许、前端拦人）

**现象**：`admin-write-gate` 的控件轴只认 `sessionStore.canWrite / canSuperAdminWrite / canAdminOnlyWrite` 三个位（`ADMIN_WRITE_BITS`，`:77`）。裸的角色相等比较不在它的词表里，`controlBindings` 对这类标签记 `roles = null`（`:375`）并注释「交给存在性判据」——于是「UI 比后端严」这个方向完全没有判点。

**证据**：
- `tests/admin-write-gate.spec.mjs:347-379`（只解析三个位）、`:404-413`（档位角色集合只从 `write-policy.ts` 源码正则取）
- `apps/admin/src/views/content/Users.vue:769-773`：
  ```
  <!-- 新增用户 + 修改密码入口：仅超级管理员显示（后端 @PreAuthorize SUPER_ADMIN） -->
  <template v-if="currentAdminRole === 'SUPER_ADMIN'">
    <button v-if="sessionStore.canWrite" class="primary-button" @click="openCreateUser">…</button>
    <button class="ghost-button" @click="openChangePwd">…</button>
  ```
  注释与 `Users.vue:203` 都写「新增用户 / 修改密码仅 SUPER_ADMIN 可用（后端 @PreAuthorize）」
- 后端实际口径：`AdminUserController.java:143-148` `POST /api/v1/admin/users` = `hasRole('SUPER_ADMIN')`（注释对新增用户是对的）；但改密端点 **没有** 任何 SUPER_ADMIN 收紧（`AdminAccountController.java:60,88`），且 `:86-87` 的 R4-00389 注释明写「放开为 ADMIN 可修改自己密码…校区管理员无需再依赖超管代劳」
- 档位快照与授权图核对（这部分门是对的）：`User.java:414-416` `isWriteAdmin()` 含 SUPER_ADMIN；`JwtAuthenticationFilter.java:240` 用它填 snapshot.admin()；`:373-375` `snapshot.admin()` ⇒ 注入 `ROLE_ADMIN`；`:379-381` SUPER_ADMIN 再补 `ROLE_SUPER_ADMIN`。故 `hasRole('ADMIN')` 端点（`FeedbackController.java:143-144`）SUPER_ADMIN 可通过 —— 门在 `expandAuthorities`（`:172-185`）里的这条推断站得住

**影响**：校区 ADMIN 在「用户管理」页看不到「修改密码」按钮，只能找超管代劳 —— 与后端 R4-00389 的既定意图相反，属于「前端比后端严」造成的功能倒退。门对此完全无感。

**建议修法**：门补一条轴：把模板里出现的 `currentAdminRole === '…'` / `role === '…'` 这类字面角色比较也归入档位计算（等价于把 `['SUPER_ADMIN']` 当作 roles 集合），随后端点档位不一致即报红；`Users.vue` 的改密入口按后端真实档位改成 `v-if="sessionStore.canWrite"`（去掉 SUPER_ADMIN 外壳），与 R4-00389 对齐。

**严重度**：P2

---

## FINDING 6 — 钱与计数器总判：本轮未复现「分当元印」，也未找到任何可双击/快速重试造成的重复扣费

**现象**：本条是**阴性结论**——钱包/解锁/充值/VIP/商城/后台金额六条链路逐处读完并核到 Java 之后，**没有**新的单位错印，也没有重复扣费路径；客户端所有扣费都落在跨点击稳定的业务幂等键上（`UNLOCK-{scene}-{targetId}` / 服务端派生 `UNLOCK-{relatedType}-{userId}-{relatedId}`），后台所有写请求都走 `api/http.ts` 的统一闸。反证尝试：我按「第一次成功但响应丢失 → 第二次 409 触发 `afterCompletion` 释放键 → 第三次重新入账」这条链构造过双入账，**读源码后判不成立**——`IdempotentInterceptor.java:198` 只在本次自己 SETNX 成功时登记属性，`:247-250` 对未登记的重复请求直接 return，键不会被误放。

**证据**：下表逐条 file:line（组件 → store → api → Java 全链，含后端 4 个闸的出处）。

**影响**：本轮「钱」轨可判定为通过；但残留 4+2 处展示价/换算绕过唯一出口（FINDING 7/8/9）、一处 mock 哨兵（FINDING 10）、一处同名异单位结构（FINDING 11），以及 FINDING 8 里那条被后端上限兜住的充值键保留缺陷。

**建议修法**：本条无需修法（阴性结论）。**严重度**：通过记录，非缺陷条目

读过的调用链（组件 → store → api → Java）与每一处金额/计数器算术：

| 处 | 位置 | 算术 | 判定 |
|---|---|---|---|
| 换算唯一出口 | `apps/client/src/stores/coins.ts:83`、`:101` | `cents/100`、`toFixed(2)` 去尾零 | 正确 |
| 定价镜像→分 | `apps/client/src/stores/coins.ts:122` | `Math.round(UNLOCK_COST_YUAN[scene]*100)` | 正确，且被 spec 钉住 |
| 派生价 | `apps/client/src/stores/coins.ts:190-197` | `costCentsFor`/`costYuanFor`（服务端实测价优先） | 正确 |
| 余额展示 | `apps/client/src/stores/coins.ts:200`、`subpackages/market/wallet/index.vue:306` | `balanceYuan.toFixed(2)` | 正确 |
| 充值常量 | `apps/client/src/subpackages/market/wallet/index.vue:110` | `RECHARGE_AMOUNT_CENTS = 10000`（=100 元） | 正确 |
| 充值成功文案 | 同上 `:225` | `{ n: 100 }` 裸写 | 见 FINDING 8 |
| 账单行金额 | 同上 `:279` | `Math.abs(item.amount)/100` 手写 | 见 FINDING 9 |
| 扣费金额来源 | `apps/client/src/stores/coins.ts:257` | 只从 `costCentsFor()` 取，不接受调用方金额 | 正确（R4-00171 成立） |
| mock 扣减 | `apps/client/src/stores/coins.ts:263-267`、`fetchBalance :216-217` | `balanceCents \|\| 80000` | 见 FINDING 10 |
| 解锁两条路 | `apps/client/src/stores/coins.ts:277-285`（/wallet/unlock）、`:290-311`（/wallet/deduct） | 均带 `Idempotency-Key: UNLOCK-{scene}-{targetId}` | 正确，服务端按业务键去重 |
| 悄悄话预检 | `apps/client/src/components/discover/WhisperUnlockSheet.vue:71/74/78/87` | 走 `unlockCostCents`/`formatCentsAsYuan`；`:78` 余额门槛 `>= costCents` | 正确（上轮分/元错印已闭合） |
| 悄悄话余额行 | `apps/client/src/components/discover/WhisperComposeSheet.vue:67/71` | 同上 | 正确 |
| 私信解锁 | `apps/client/src/components/discover/CardDetailOverlay.vue:447/455/496/537/542-543` | `spend("MESSAGE")` 后同步 `balanceCents` | 见 FINDING 7 |
| 卡片解锁 | `apps/client/src/components/discover/CardSwiper.vue:590/595-596` | 同上 | 正确 |
| 批量解锁 | `apps/client/src/stores/likes.ts:507-520` + `subpackages/discover-extra/likes/index.vue:230/242-247` | 逐条 `unlockUser`，`item.unlocked` 乐观置真 | 无重复扣费（服务端幂等），见 FINDING 7 |
| 同类页面 | `apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:113` | 直读镜像表 | 见 FINDING 7 |
| 商城详情 | `apps/client/src/subpackages/market/detail/index.vue:370-371` | `¥{{product.price}}`（后端 `BigDecimal` 元） | 单位正确，但见 FINDING 11 |
| VIP 账单 | `apps/client/src/stores/vip-billing.ts:29`（`amount: number`，只读列表） | 无算术 | — |
| 客户端自动幂等键 | `apps/client/src/services/http.ts:345-356` | 拦截器在重试循环外一次性生成 | 设计有文档，正确（R4-00168 不再复发） |
| 后台商品价 | `apps/admin/src/views/business/Shop.vue:119-121/218-219/268-269/429-430` | 读 `/100`、写 `*100` 成对 | 与 `ShopItem.originalPrice`（`int` 分）一致，正确 |
| 后台账单/钱包/码 | `apps/admin/src/views/business/VipBills.vue:117`、`Wallets.vue:98`、`PromoCodes.vue:101` | `cents/100` | 未见单位错 |
| 后台写拦截 | `apps/admin/src/api/http.ts:439-470` | 只读角色本地 403 + 每次调用新键 | 正确（`:712` 注释所述旧「60s 签名缓存」已除） |
| 服务端资金闸 | `WalletController.java:251`(`@Idempotent`)、`:275`(UUID orderId)、`:134/138/92`(默认关闭 / 5 次/日 / 500 元终身) | — | 用于校准前端口径 |
| 服务端幂等语义 | `IdempotentInterceptor.java:184-201`、`:241-263` | 仅「本次自己 SETNX 成功者」可在 >=400 时释放键 | 关键：重复请求**不会**释放键 ⇒ 无「第三次双击重新入账」路径（我按此构造反证，未成立） |
| 悄悄话扣费 | `RecommendationController.java:560-587` | 已解锁早退 + `UNLOCK-WHISPER-{targetUserId}` 唯一索引 | 幂等成立 |
| 定价在册值 | `application.yml:278-280`（liked-me/visitor=300 分）、`RecommendationController.java:101`（whisper=200 分） | 与镜像表 LIKES/VISITORS=3、WHISPER=2 一致 | 由 `src/tests/stores/server-price-mirror.spec.ts:108-131` 钉住 |

**跑了的 spec**：`server-price-mirror` + `wallet-recharge-idempotency` + `vip-money-display` = 24/24 绿（3 files，87.5s）；`admin npm run test:unit` = 79/79 绿（7 files，含 `api/http-idempotency.test.ts` 13、`api/http-write-guard.test.ts` 9、`views/content/users-write-gate.test.ts` 1）。

**没找到的东西（也是有价值的结论）**：本轮**没有**复现出「分当元印」的新实例，也**没有**找到任何一条能用双击/快速重试造成重复扣费的链路——钱的所有出口都落在 `UNLOCK-{scene}-{targetId}` 或 `UNLOCK-{relatedType}-{userId}-{relatedId}` 这类跨点击稳定的业务键上。

---

## FINDING 7 — 四处展示价绕过 `costYuanFor()`，直读定价镜像表

**现象**：2026-10-31 的 P2 修复把「服务端实测扣减额优先」做成展示价的应有来源，并在 `stores/coins.ts:61-62` 明令「消费方请改用 `unlockCostCents()` / `unlockCostYuan()`」。四个用户可见的价签没有照做。

**证据**：
- `apps/client/src/stores/coins.ts:61-62`（禁令原文）、`:187-197`（`serverPrices` + `costYuanFor`）
- `apps/client/src/components/discover/CardDetailOverlay.vue:21` import `UNLOCK_COST_YUAN` → `:447` `t("discover.privateMsgPaidHint", { coins: UNLOCK_COST_YUAN.MESSAGE })`（解锁私信的确认弹窗价）
- `apps/client/src/subpackages/discover-extra/likes/index.vue:47` → `:184-186` → `:230` `t("likesVisitors.unlockConfirm", { coins: unlockCost.value … })`
- `apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:18` import → `:113` 直读镜像表（与上一条同型）
- 对照合规实现：`apps/client/src/components/discover/WhisperUnlockSheet.vue:71-74`
- 今天**数值仍对**：`server-price-mirror.spec.ts:108/130-131` 把四条镜像价钉到后端在册价（100/300/300/200 分）

**影响**：一旦服务端调价而 `@Value` 默认值/yml 未同步进 spec 的解析路径（或运维用环境变量覆盖 `APP_UNLOCK_PRICE_*`），这四处会继续报旧价，而 `WhisperUnlockSheet` 报新价 ⇒ 同一次购买在两个页面显示两个价。当前是潜伏债，不是活错。

**建议修法**：四处改用 `coinsStore.costYuanFor(scene)`；并把 `users-write-gate` 那类源码断言的写法搬过来，加一条「`.vue` 里不得出现 `UNLOCK_COST_YUAN`」的静态判点（现仓内只有 store 与 spec 应当引用它）。

**严重度**：P3

---

## FINDING 8 — 充值成功文案把金额裸写成 100，与 `RECHARGE_AMOUNT_CENTS` 两处各写一份

**现象**：入账金额是常量（分），成功 toast 却是另一份手写的元值。

**证据**：`apps/client/src/subpackages/market/wallet/index.vue:110` `RECHARGE_AMOUNT_CENTS = 10000`；`:215` `data: { amountCents: RECHARGE_AMOUNT_CENTS }`；`:225` `t("wallet.rechargeSuccess", { n: 100 })`。`src/tests/pages/wallet-recharge-idempotency.spec.ts` 钉的是**键的稳定性**（24 绿里没有一条断言 n 与常量同源）。

**影响**：改充值额度（100→50）时 toast 仍报 100 元——正是本仓「同一数字两处各写一份」反复复发的形态。用户可见，且是钱数。

**顺带核到的充值键保留语义（一处真缺陷，但被后端上限兜住）**：`wallet/index.vue:226-228` 在「响应丢失但服务端已入账」时**故意**保留键，靠服务端 `@Idempotent` 拦重复；而 `Idempotent.java:44` 的键 TTL 默认 4 小时。4 小时内用户再点会得到裸 toast「重复请求已被拦截，请勿使用相同的 Idempotency-Key」（`:229-230` 直 `err.message` 上屏，且**不刷新余额**，而钱已经到账）；4 小时后同一条保留键会因 Redis 键自然过期而重新 SETNX 成功 ⇒ 同一笔「未完成操作」再入账一次。兜住它的是后端上限：`WalletController.java:134`（`app.demo-recharge.enabled` 默认 false）、`:138`（5 次/日）、`:92`（终身 500 分单位=500 元）。所以生产默认关；开着时损害被封顶。建议：终态判定里把「409 IDEMPOTENT_CONFLICT」当**成功且已入账**处理（刷新余额 + 清键 + 中性文案），而不是当失败弹后端原文。

**建议修法**：`{ n: centsToYuan(RECHARGE_AMOUNT_CENTS) }`（顺手把 `:279` 的手写 `/100` 一起收进 `centsToYuan`），并在该 spec 里加一条 `expect(toastTitle).toContain("100")` 与常量联动的断言。

**严重度**：P3

---

## FINDING 9 — 账单金额换算在 `centsToYuan` 之外又写了一份 `/100`

**现象**：`apps/client/src/stores/coins.ts:77` 明写「其余站点请不要再手写 `/ 100`」，钱包页流水行仍然自己除了 100。

**证据**：`apps/client/src/subpackages/market/wallet/index.vue:279` `const yuan = Math.abs(item.amount) / 100;`（`:280` 拼 `±¥`）；唯一出口在 `stores/coins.ts:82-84`。

**影响**：数值今天正确（后端流水 `amount` 确为分，见 `coins.ts:19-22` 的 `CoinTransactionItem` 与 `RealWalletService` 流水）。风险是**下一处**照抄这行的人不知道单位约定；以及 `formatCentsAsYuan` 的「未知→`--`」保护在这里缺位（`item.amount` 为 `undefined` 时这里印 `¥NaN`，`:267-269` 的 `isDebitRow` 同理会拿到 `undefined`）。

**建议修法**：`amountText` 改为调用 `formatCentsAsYuan(Math.abs(item.amount))` 并自行补符号；同时给 `amount` 加 `number | null` 的真实类型（现在签名写死 `amount: number`，与后端可空字段不符）。

**严重度**：P3

---

## FINDING 10 — mock 钱包把「余额归零」当成「没加载过」，白送 800 元

**现象**：`fetchBalance` 与 `spend` 的 mock 分支都用 `0` 当「未初始化」的哨兵，于是真花光之后任何一次余额读取/扣费都会重置为 80000 分。

**证据**：`apps/client/src/stores/coins.ts:216-217`（`balanceCents.value = Math.max(0, …); if (balanceCents.value === 0) balanceCents.value = 80000;`）、`:263`（`const current = balanceCents.value || 80000;`）；对照 `:174` 已有 `loaded` 标志，`loaded` 与 `loading` 都在 `:376-392` 导出。

**影响**：仅 mock/演示档（`useMock()` 内），real 分支不受影响（`:229` 直接取后端值）。演示走查里「余额不足→充值」这条路径无法演示——扣到 0 会自己弹回 800。属演示保真度缺陷，非资金风险。

**建议修法**：mock 分支用 `loaded.value` 判是否初始化，而不是用 `balanceCents === 0` 当哨兵。

**严重度**：P4

---

## FINDING 11 — 「商品原价」在两套单位里同名存在（products=元 / shop_items=分）

**现象**：客户端商城详情走 `ProductView`（`BigDecimal` 元，直接 `¥{{price}}`），后台商品管理走 `ShopItem`（`Integer` 分，`/100` 展示、`*100` 上送），两处字段都叫 `originalPrice`；另有第三份 `config/vip-plans.ts` 的 `originalPrice: 28`（元）。

**证据**：
- 元侧：`apps/api/src/main/java/com/campuslove/api/shop/ProductService.java:47-57`（`BigDecimal price, BigDecimal originalPrice`）、`apps/client/src/subpackages/market/detail/index.vue:370-371`、`apps/client/src/config/vip-plans.ts:78/89/103`
- 分侧：`apps/api/src/main/java/com/campuslove/api/entity/ShopItem.java:51`（`Integer originalPrice`）、`admin AdminShopController.java:324/341`、`apps/admin/src/views/business/Shop.vue:218-219/268-269`
- DDL 同证：`database/backup/post-verify-20261026-final.sql:2303` `decimal(10,2) … 原价（元）` vs `:2837` `int … 划线价（分）`

**影响**：两条链路各自闭合（我逐条核过 `AdminShopController` 全程只用 `ShopItem`），今天不产出错值。但**同名异单位**是把悄悄话那次「分当元印」重演出来的最典型结构条件，而全仓没有一扇门按字段名+单位做交叉核对（`tests/openapi-coverage.spec.mjs` 只核覆盖不核单位）。

**建议修法**：把分侧统一改名 `originalPriceCents`（与 `priceCents` 同构），或在 `CoinTransactionItem`/`ProductView` 之上立一条「凡金额字段必须带单位后缀」的静态门。

**严重度**：P3（结构性风险，非活错）

---

## 权限门可信度：6 个处理函数的手工对账

对照物：`ADMIN_WRITE_GATE_VERBOSE=1 node tests/admin-write-gate.spec.mjs` 的档位读数 vs 我逐条读的 Java 注解 + SecurityConfig + JwtAuthenticationFilter 授权注入。

| # | 处理函数 | 端点 | 后端实际档位（我读到的出处） | 门判 | UI 位 | 结论 |
|---|---|---|---|---|---|---|
| 1 | `system/Admins.vue#handleCreate`（`:160`） | `POST /api/v1/admin/users/admins` | `admin/AdminUserController.java:249-254` 方法级 `hasRole('SUPER_ADMIN')` | super-only | `canSuperAdminWrite`（`:160`/`:274`） | 门**正确** |
| 2 | `system/Admins.vue#confirmToggle`（`:209`） | `POST /api/v1/admin/users/{id}/disable`、`/enable` | `AdminUserController.java:587/601` 无方法级 ⇒ 类级 `hasAnyRole(...AUDITOR)` ∩ `SecurityConfig.java:208-209` | any-write | `canWrite`（`:209`/`:240`） | 门**正确**（校区 ADMIN 确实能启停管理员） |
| 3 | `content/Users.vue#handleChangePwd` | `POST /api/v1/admin/account/change-password` | 类级 `hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')`（`AdminAccountController.java:60`）**但** URL 级 `SecurityConfig.java:208-209` 只放 ADMIN/SUPER_ADMIN；`api/http.ts:453-461` 本地也拦 | 无守卫→被 `SELF_SERVICE_WRITE_HANDLERS` 豁免 | 裸 `currentAdminRole === 'SUPER_ADMIN'` | 门**判错**（豁免理由不成立）⇒ FINDING 4；同时 UI 比后端严（后端 `AdminAccountController.java:86` R4-00389 明写放开给 ADMIN）⇒ FINDING 5 |
| 4 | `system/Schools.vue#confirmDelete`（`:210`）/`confirmToggle`（`:182`） | `DELETE /api/v1/admin/schools/{id}`、`POST …/{id}/status` | 方法级 `hasRole('SUPER_ADMIN')`（`write-policy.ts:13` 引 `AdminSchoolController.java:129`，门亦归档 super-only） | super-only | `canSuperAdminWrite`（`:134`/`:182`/`:210`/`:255`/`:296`/`:298`/`:305`） | 门**正确**（这两条恰是 unattachedControls 里的 ①，控件轴看不见、守卫轴判到） |
| 5 | `config/NotifyConfig.vue` | `PUT /api/v1/admin/notify-config` | `admin/AdminNotifyConfigController.java:76-77` 方法级 `hasRole('SUPER_ADMIN')` | super-only | `canSuperAdminWrite` | 门**正确** |
| 6 | 反馈回复（`canAdminOnlyWrite` 档位对应端点） | `PUT /api/v1/admin/feedback/{id}/reply` | `feedback/FeedbackController.java:143-144` `hasRole('ADMIN')`；SUPER_ADMIN 是否持有 `ROLE_ADMIN`：`entity/User.java:414-416`（`isWriteAdmin()` 含 SUPER_ADMIN）→ `config/JwtAuthenticationFilter.java:240`（填 snapshot.admin）→ `:373-375`（注入 `ROLE_ADMIN`） | any-write | 走 `canWrite`；`canAdminOnlyWrite` **0 个视图引用**（`grep -rn canAdminOnlyWrite apps/admin/src/views` = 0） | 门**正确**（授权链我手工走通，不是照抄注释）；档位 3 是**无消费者的死位** |

门可信度总判：6 条里 5 条与后端逐字相符，1 条（#3）判错且错在「放宽」方向。**门自身的两个结构性缺口**：
1. `(顶层)` 桶：`topLevelFunctions`（`tests/admin-write-gate.spec.mjs:301-309`）只认行首 `function`/`const x = (` 两种形态；标识符落在脚本块顶层（注释里提到函数名、写在回调里的写调用）会被归到 `(顶层)`，此时 `hostText = 整个脚本`（`:607`），守卫取**全文件档位并集**——一个处理函数缺守卫可以被同文件另一个处理函数的守卫蒙混过去。现网唯一命中是 `system/Roles.vue#(顶层)`，来源是 `Roles.vue:10` 的 JSDoc 里写了 `assignRoleMenus(id, checkedIds)`，本次无害，但机制可被利用。
2. `guardsIn`（`:316-328`）要求条件里出现字面 `!sessionStore.<位>`；把档位赋给中间变量（`const can = sessionStore.canWrite; if (!can) return;`）会被算成无守卫——这个方向是**误报**（会上 `ungardedHandlers` 棘轮并判红），保守，可接受。

**建议修法**：(a) `unattachedControls` 23 条应逐条改名到具体控件（把 `ConfirmDialog` 的 `@confirm` prop 透传形态纳入解析，`:347-379` 已支持 `@confirm="fn"`，缺的是 `<ConfirmDialog :visible="x" @confirm="confirmDelete">` 这类同标签多属性的取全 —— 实测这些确实进了盲区，值得单独查一次正则）；(b) `(顶层)` 桶不再享受全文件守卫，改为「脚本块顶层存在写调用即红」；(c) 划掉或改写 `SELF_SERVICE_WRITE_HANDLERS` 的理由。

**严重度**：P2（#3 那条豁免 + (顶层) 桶）；扫描面本身（无命名空间 import、42/47 视图有 api import、34 为写视图）判定为**够用**。

---

## FINDING 12 — 档位 3（`canAdminOnlyWrite`）是无消费者的死位

**现象**：`write-policy.ts:41` 给档位 3 的角色集合填了 `["ADMIN","SUPER_ADMIN"]`，与档位 1 逐字相同；`session.ts:87` 导出、门在 `ADMIN_WRITE_BITS` 里解析它，但没有任何视图引用。

**证据**：`grep -rn canAdminOnlyWrite apps/admin/src/views` → 0；`apps/admin/src/utils/write-policy.ts:16-24` 自述「本档位 today 的角色集合是 {ADMIN, SUPER_ADMIN}，与 canWrite 相同；单独设位是为了让『后端一旦收紧为纯 ADMIN』变成前端可见的契约」；`tests/admin-write-gate.spec.mjs:600-601` `compatibleOf` 因此对 any-write 端点同时给出两个候选位。

**影响**：不产错。但「为了将来」的位今天既无引用也无红门保护（把它删掉全库不会红），注释里许诺的「前端可见的契约」实际上不成立；另外 `--self-test` 用的 `POLICY_SNIPPET`（`:691`）把 `canAdminOnlyWrite` 写成 `["ADMIN"]`，与真实文件不同——自测判的是合成档位，真实档位 3 从未被任何用例走过。

**建议修法**：要么今天就把 `FeedbackController` 那条 `hasRole('ADMIN')` 端点的消费方挂到 `canAdminOnlyWrite`（使位有真实语义），要么删位并在 write-policy 里把「等后端收紧再加」写成 issue；`--self-test` 的档位快照改成读真实 `write-policy.ts`。

**严重度**：P4

---

## FINDING 13 — 注释里的「42 处 SUPER_ADMIN 端点」是过期数（实测 49 注解 / 43 TS 函数）

**现象**：`write-policy.ts` 与 commit message 都把「后端 `hasRole('SUPER_ADMIN')` 共 42 处」当作口径依据呈现；实测注解出现 49 次，门归档出的 super-only TS 写函数 43 个。三个数互不相等，而注释的语气是「取自 Java 源码」的事实陈述。

**证据**：
- `apps/admin/src/utils/write-policy.ts:12-13`「方法级 `@PreAuthorize("hasRole('SUPER_ADMIN')")`，共 42 处」
- `grep -rn "@PreAuthorize(\"hasRole('SUPER_ADMIN')\")" apps/api/src/main/java --include=*.java | wc -l` = **49**
- `ADMIN_WRITE_GATE_VERBOSE=1 node tests/admin-write-gate.spec.mjs | grep -c "^  #"` = **43**（super-only 档的 api 函数）
- 门只把落在 `/api/v1/admin/**` 且被 TS 函数命中的端点归档（`analyze` 的 `:461` `if (!fullPath.startsWith("/api/v1/admin")) continue;`），所以 49 注解 ≠ 43 函数是**结构性**的、不是漏判

**影响**：读者/下一个审计会拿 42 去对账并得出「门漏了 7 个」的错误结论；`write-policy.ts:22-24` 关于 `canAdminOnlyWrite` 的论述同样依赖这个数。

**建议修法**：注释改成「以 `ADMIN_WRITE_GATE_VERBOSE=1` 实跑为准（本轮：注解 49 / 归档函数 43）」，或让门在输出里直接打印两个数并断言单调关系。

**严重度**：P4（文档口径）

---

## FINDING 14 — i18n：死键实测 1251（正好压在棘轮上界），i18n 之外的硬编码文案实测 388+51（不是 47）

### (a) 现象 + 证据：`zh-CN.ts` 里没人引用的键 —— 用仓内自己的量具

`node scripts/qa/verify-i18n-orphan.mjs`（该门已接进 `package.json:56` 的 `test:contracts`，经 `grep -rn admin-write-gate|i18n-orphan package.json .github/workflows` 复核，本轮不再是「有门没人跑」）：

```
I18N_PAIRING=SKIPPED reason=en-US 语言包已下线（apps\client\src\i18n\locales\en-US.ts 不存在）
I18N_ZH_KEYS=4143 I18N_EN_KEYS=0 FILES_SCANNED=553 STATIC_REFS=2405 DYNAMIC_PREFIXES=10
I18N_ORPHANS=1251 I18N_ORPHANS_ALLOWED=1251
I18N_DYNAMIC_PREFIXES_SEEN=, tagSelector, village.educationLabels, chat.timeBar.weekdayNames,
  activities.category, contentPages.mbti.advice, contentPages.mbti, contentPages.mbti.types
I18N_RESULT=PASS（成对维 SKIPPED，本次只有孤儿维生效）
```

**证据**：读数——**zh-CN 共 4143 键，1251 个全仓找不到静态引用**，与棘轮上界 `:37 ALLOW = Number(arg("allow-orphans","1251"))` **逐字相等 ⇒ 门是「压线绿」**：任何新死键都会让它红，任何删除都必须同步改台账（脚本 `:26-35` 已写明这条纪律，本轮实测与 14d9f461 记的 1251 一致，没有再涨）。

**这把尺子的盲区（必须随读数一起交付）**：
1. **成对维整个不跑**（`I18N_PAIRING=SKIPPED`、`I18N_PAIRED=0`）——en-US 已下线（`src/tests/i18n.spec.ts:57-61` 断言 `availableLocales == ["zh-CN"]`），所以门的一半是死代码，`--allow-orphans` 之外没有任何交叉核对。
2. **动态前缀整片免检**：10 个前缀（`verify-i18n-orphan.mjs:93-95` 三种正则 + `:112` 的 `k === pre || k.startsWith(pre + ".")`）下的键**一律不算孤儿**。这些子树里真死了多少，现有工具判不出来。首个前缀是空串（`t(\`${x}\`)` 形态捕获），按 `:112` 展开成 `k.startsWith(".")` ⇒ 不会误伤全库（孤儿数 1251>0 亦证），但它在报告里显示为一个空白项，误导读表人。
3. **测试代码算「有人用」**：扫描根是 `apps/client/src`（含 `src/tests`，553 文件）⇒ 只被 spec 引用的键仍计为已引用，孤儿数因此**偏低**；`i18n.spec.ts:163-175` 只核「叶子路径唯一 + 值非空」，不核引用。
4. 目录名等于 `i18n` 的被跳过（`:68`），只扫 `.vue|.ts`。

### (b) 现象 + 证据：i18n 之外的硬编码中文

**现象**：本仓没有任何工具量这件事（`scripts/scan-chinese.mjs` 只按「行内含中文」计数，读到 `TOTAL: 2706`，把注释、日志、mock 数据与 UI 文案混成一锅；`audit-fallback-literals.cjs` 量的是 CSS 兜底值，与 i18n 无关）。所以本条读数由我自建分类器产出，方法与误差一并交出去：剥 `//`、`/* */`、`<!-- -->`（带字符串状态机，跳过 23347 注释行 / 141 日志行），排除 `i18n/`、`tests/`、`*.spec.ts`、`mock-data.ts`、`fixtures`、`*.stories.*`，389 文件入扫，按上下文分五类。

| 类别 | 条数（出现） | 是否用户可见 | 典型证据 |
|---|---|---|---|
| `.vue` 模板文本节点 `>中文<` | 222 | **是**（页面/组件正文与空态） | `components/home/HomeHeader.vue <text class="home-header__title">首页</text>`、`components/home/CommunityFeed.vue <text …>重试</text>` |
| `.vue` 属性文案（`placeholder`/`alt`/`aria-label`/`label`） | 80 | **是**（含无障碍朗读名） | `subpackages/village/village/publish.vue`（48 条里多数是这类） |
| `.vue` 内 toast/modal 字面量 | 72 | **是** | `pages/home/index.vue` 5 条 `uni.showToast({ title: "页面打开失败，请重试" })`、`pages/messages/index.vue:「确定删除该会话？」` |
| `.vue` 内 `|| "中文"` 兜底 | 14 | **是**（多数直接进 `errorMessage` 上屏） | `subpackages/tools/daily-question/index.vue:46` `checkInStore.errorMessage || "签到未完成，请稍后再试"`、`:49` `"签到失败，请稍后再试"` |
| **`.vue` 合计（页面/组件，生产 UI）** | **388**（去重后 319 条不同文案；50 个文件；其中 30 条属 dev-only 页 `subpackages/setup/dev/index.vue`） | — | — |
| `.ts` 模块内 toastModal 形态（多为演示数据/横幅配置） | 35 | **否/半**（`config/home-banners.ts`、`features/login/hero.ts`、`stores/activity.ts` 演示数据；仓内既有口径 R2-00105 判演示数据不属 i18n） | `stores/campus-wall.ts` 帖子文案 |
| `.ts` 内 `new Error("中文")` | 10 | **是**（这些 message 会被 `store.errorMessage` 直接渲染/弹 toast） | 各 store 的兜底 throw |
| `.ts` 内 `\|\| "中文"` | 6 | **是** | — |
| **`.ts` 合计** | **51**（去重 49） | 混合 | — |

**影响 · 与交办口径的差异（必须点破）**：交办书与 `reports/audit/2026-11-01-completion-recheck.md:41` 都写「47 条 i18n 之外的硬编码用户可见文案」。**我用遍仓内工具与自己写的四种分类器，没能复现出 47 这个数**——最接近的窄口径（`|| "中文"` 14 + `new Error("中文")` 10 + `showErrorToast(err,"中文")` 1 + `itemList` 2）也只有 27，宽口径则到 439。我的判断是：47 是一条**更早的人工清点**遗留数，本仓没有任何门或脚本能重跑它，因此它既不可证伪也不可收敛。请以下面这个可重跑读数为准：**生产 UI 文案 ≈358 条（388 − dev 页 30）＋ store 抛错类 16 条**。

**另有第三类，既不是文案也不是注释，别混进上面两栏**：`subpackages/discover-extra/likes/index.vue:255` 用 `msg.includes("余额不足")` 做**控制流判定**（决定是否弹「去充值」引导），把客户端行为钉在后端中文措辞上；`detail.vue:402/414` 的 `console.error("删除确认弹窗不可用:", …)` / `console.error("删除失败:", …)` 是日志。这两类在 2706 里都算「硬编码中文」，但迁 i18n 时不该动。

**Top offenders（`.vue`，出现次数）**：`village/publish.vue` 48、`village/post.vue` 42、`setup/dev/index.vue` 30（dev-only）、`pages/register/index.vue` 23、`pages/messages/index.vue` 19、`pages/home/index.vue` 18、`chat/official-chat/index.vue` 18、`profile-extra/profile/location.vue` 15、`profile-extra/profile/other.vue` 14、`components/profile/NotLoggedProfile.vue` 13、`village/detail.vue` 13、`home/RelationActivity.vue` 11、`home/TodayRecommendationCard.vue` 11、`components/match/MatchHub.vue` 11。

**建议修法**：先给 `verify-i18n-orphan.mjs` 加第二维——同一遍历顺带统计「UI 上下文里的中文字面量」并入棘轮（今天它只量反方向：定义了没人用的键），否则死键与裸文案一个在减、一个在涨；再按 Top 3 文件（publish/post/register）开工，它们占 113/388 ≈ 29%。

**严重度**：P2（可测量性：一半的门是死的、47 这个数不可重跑）/ P3（裸文案本体）

---

## FINDING 15 — 登出：存储清得干净，Pinia 内存态一个都没清（跨账号残留可推导出，且无红门）

**证据 · 已确实清掉的**（客户端，`apps/client/src/stores/session.ts:571-619`）：

| 项 | 位置 | 有无红门 |
|---|---|---|
| 后端会话失效（`/auth/logout`） | `session.ts:577` | `session.spec.ts:389` 断远端失败也照清 |
| token/refreshToken | `services/http.ts:265-272`（`clearTokens`） | `:396` |
| **用户级本地存储整批**（草稿/分会话草稿前缀/搜索历史/已删消息 ID/已看记录/定位城市/签到缓存/会话持久字段） | `http.ts:234-250` + `constants/storage-keys.ts:214-216`（**派生**：不在 `DEVICE_SCOPED_STORAGE_KEYS:191-206` 里的一律用户级 ⇒ 新增 key 默认被清，漏清方向天然安全） | `session.spec.ts:353`（用户级键被 remove）+ `:378`（设备级键**不**被清） |
| 内存 TTL/SWR 缓存、媒体签名缓存 | `session.ts:583-584`、`http.ts:277-282` | 有（401 路径同口） |
| Sentry 用户上下文、WebSocket | `session.ts:599-606` | 未见断言 |
| session store 自身 5 个字段 | `session.ts:592-596` | `:397` |

**现象 · 没清掉的**：其余全部 Pinia store 的内存态。判据是结构性的：`grep -rn "\$reset" apps/client/src` → **0 命中**；仓内只有 4 个 store 定义了 `reset()`（`stores/match.ts:88`、`stores/promo-code.ts:207`、`stores/vip-auto-renew.ts:197`、`stores/vip-billing.ts:233`），而它们的调用点全是页面级（`subpackages/discover-extra/discover/match-success.vue:109`、`matching.vue:257`、`subpackages/vip/promo-code.vue:239`），**登出链路一个都不调**。`logout()` 里唯一「清理」别的 store 的语句是 `checkInStore.dispose()` 的对偶——而 `stores/checkin.ts:551-555` 的 `dispose()` 只 `clearTimeout` 动画定时器，**不重置 `checkedIn`**（state 在 `:217`）。

**影响 · 可推导出的用户可见后果（同一次 app 生命周期内换账号；mp-weixin/H5 的 `reLaunch` 不重置 JS 运行时）**：

| store / 字段 | 位置 | 换账号后的表现 |
|---|---|---|
| `checkIn.checkedIn` | `stores/checkin.ts:217` | `subpackages/tools/daily-question/index.vue:162` 的 `v-if="!checkInStore.checkedIn"` 不成立 ⇒ **B 账号没签到就能看到题目与回答框**，签到门槛（业务闸门）在同一会话里被绕过；`:336-341` 的 EmptyState 分支同样永不成立 |
| `dailyQuestion.hasAnswered` / `.answers` | `stores/daily-question.ts:319-327` | B 继承 A 的 `hasAnswered=true` ⇒ 页面按 `index.vue:103` 去拉回答，B 未答题命中后端 422，`fetchAnswers` 的 catch（`:488-489`）**不动 `answers`** ⇒ A 拉到的回答卡片继续显示在 B 的屏幕上 |
| `coins.balanceCents` | `stores/coins.ts:174` | `components/discover/WhisperComposeSheet.vue:67` 与 `WhisperUnlockSheet.vue:87` 直接吃 store 值，余额重取发生在 `CardDetailOverlay.vue:496`/`WhisperComposeSheet.vue:81` 的异步之后 ⇒ 先闪 A 的余额；`:78` 的「够不够扣」门槛也按 A 的余额算 |
| `village.posts / nearbyPosts / selfPendingPosts / currentPost / favorites` | `stores/village/index.ts`（`dispose()` 见 `:1440-1463`，只清 AbortController、防抖定时器、in-flight Set 并归档工作槽，**不删列表**） | A 的动态列表/待审帖留在 B 的村口首屏，直到 `fetchPosts` 覆盖 |
| `likes`、`messages`（未读/会话）、`discover`（已看集）、`vip`/`match`/`campus` | 各 store state | 同上：内存态在登出后原样保留；其中落盘的部分（已看记录、未读角标 `storage-keys.ts:246-256`）已被上面那张「已清掉」表覆盖 |

**admin 侧同型缺陷（更小但更直白）**：`apps/admin/src/stores/session.ts:235-239` 清 `user/token/localStorage`，但 `stores/menu.ts` 的 `loaded/menuTree` 不清；`router/guards.ts:119-123` 的按需加载条件是 `if (!menuStore.loaded)` ⇒ 换更高/更低权限的账号登录（SPA 软跳转，不刷新页面）**不会重拉菜单树**，上一角色的动态路由与导航仍可见（点进去仍被后端 403 兜住，属错误导航暴露而非越权）。

**红门状况**：`session.spec.ts:353/378/389/396-397` 只钉存储与 session 自身字段；把 `logout()` 里再加一行 `useCoinsStore().balanceCents = 0` 或删掉任何 store 的清理，**全库不会红**。按本仓定义（未强制的修复=债），登出的内存轨整段是债。

**建议修法**：在 `session.ts logout()` 里引入一份「可重置 store 登记表」（数组 + 各自 `resetForLogout()`，命名与 `checkin.ts` 的 `dispose()` 区分开），照 `storage-keys.ts:191-216` 的「默认即安全」思路写成**新增 store 必须登记否则门红**；红门写两条：`expect(checkInStore.checkedIn).toBe(false)`、`expect(dailyQuestionStore.answers).toHaveLength(0)`（登出后断言）。admin 侧把 `menuStore.reset()` 接进 `logout()`，并把 `guards.ts:120` 的条件从 `!loaded` 改成 `!loaded || loadedFor !== currentUserId`。

**严重度**：P2（跨账号内容可见 + 签到门槛绕过；无红门）

---

## 判不出 / 未测量（明写，不假装覆盖）

1. **运行时端到端复现**：任务禁止起 dev server，也没有可用的 real 后端与两个测试账号。FINDING 2 与 FINDING 15 的跨账号后果是**从源码分支推导**的（引用了具体行号与条件），不是屏幕上看见的；`reports/audit/real-e2e` 那套 e2e 需要跑构建，本 lane 未执行。
2. **每日一问「双推」的历史现场**：我只能证「现在不会双推」以及「回退会被 store 测试抓住」，无法证「线上确实双推过」——没有该缺陷的复现脚本或录屏在册。
3. **`unattachedControls` 23 条逐条人工核**：门报数不报名（`ADMIN_WRITE_GATE_VERBOSE=1` 才报名，我已取到 23 条名单并抽了 `Schools.vue#confirmToggle/confirmDelete`、`Admins.vue#confirmToggle`、`Roles.vue#confirmDelete` 五条手工对档位）；余下 18 条未逐条对 Java。
4. **`i18n` 动态前缀子树内的真实死键数**：工具把 10 个前缀整片免检，我按同一份正则口径也无法分开「真在用」与「恰好落在免检子树」。
5. **后台 47 视图里其余 13 个**（47−34 写视图）是否含隐藏写入口：门按「import 了写 api 函数」定义写视图，`grep -rn "import \* as" apps/admin/src/views` = 0 命中等于是说没有旁路，但这依赖 api 目录的命名一致性，未逐文件读。
6. **计数器类缺陷的完整盘点**：我只跑了点赞/收藏（`village/index.ts:660/738` in-flight Set 在位、`:703` 服务端权威计数）、未读角标（`storage-keys.ts:252` + `src/tests/pages/messages-unread-local-toast.spec.ts` 在册）与分页游标三条链；`circle`/`activity`/`schedule`/`social-progress` 的计数器没逐条走。
7. **签到金币奖励**：`grep -n "coins|reward|bonus" apps/client/src/stores/checkin.ts` → 0 命中，客户端签到不发币（奖励只在 mock 流水文案 `stores/coins.ts:340-344` 的 `SIGNIN_BONUS` 里出现）。因此交办书里「计数器」这一支在客户端**没有对应实现**，无法审计。
