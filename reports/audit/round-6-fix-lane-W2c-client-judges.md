# 第六轮修复波 W2c 车道：给两条已修完的改动补判点

- 批次：round-6 fix lane W2c（判点补齐，不改产品行为）
- 基线 HEAD：`8d5aecb0`
- 范围：`apps/client`（禁改根 `package.json`、`.github/workflows/ci.yml`、`README.md`、`tests/**`、
  `scripts/qa/**`（除 `verify-i18n-orphan.mjs` 判据新增维度所需入参）、`apps/api/**`、`apps/admin/**`、
  `docker**`、`doc**`；禁 git 写操作；不起 dev server、不跑构建）
- 载具：`cd apps/client && npx vitest run src/tests/<文件>`；收口前全量 `npm run test:unit` + `npm run typecheck`
- 状态：已收口（两条判点均闭合，全量绿；逐条闭合即时落盘）

## 条目账

| # | 条目 | 状态 |
| --- | --- | --- |
| 1 | 409 双来源（INSUFFICIENT_BALANCE / IDEMPOTENT_CONFLICT）排除逻辑无判点 | 已闭合 |
| 2 | i18n 同层重复键不被任何判点抓到 | 已闭合 |

## 一、条目 1：409 双来源排除逻辑的判点

### 1.1 落点

新判点文件：`apps/client/src/tests/components/whisper-unlock-409-source.spec.ts`（14 例，2 宿主 × 7 例）。
被改动产品文件：0（本条只补判点，`CardDetailOverlay.vue` / `CardSwiper.vue` 的 sha 见 §1.4）。

前置事实核对（逐条实测，不是转述）：
- 后端 409 的两个生产者都在盘上：
  `apps/api/.../config/GlobalExceptionHandler.java:196-205`（`InsufficientBalanceException`
  ⇒ `status:409` + `code:"INSUFFICIENT_BALANCE"`）；
  `apps/api/.../common/IdempotencyException.java:22`（`ERROR_CODE = "IDEMPOTENT_CONFLICT"`，
  由 `IdempotentInterceptor.java:192` 抛出，同文件 :520 另有 `DataIntegrityViolationException`
  ⇒ 409 且**不带 code**）。⇒ 只按 status 分支确实会把「同键重放（钱已扣）」提示成「余额不足」。
- 判点字面量位置：`CardDetailOverlay.vue` 与 `CardSwiper.vue` 的
  `if (status === 409 && conflictCode !== "IDEMPOTENT_CONFLICT")`（文本锚，不给行号）。

### 1.2 载具可达性（这条必须说清，否则下一个人以为今天就能在后端复现）

主控派单里「解锁走的正是跨点击稳定的业务键 `UNLOCK-{scene}-{targetId}`，所以这条路径可达」
一句**只有一半成立**，实测分解：
- 悄悄话解锁这一发走 `clientApi.unlockWhisper` ⇒ `POST /recommendations/{userId}/whisper/unlock`；
  该端点**没有** `@Idempotent`（`RecommendationController.java:560` 只有 `@PostMapping` + `@PreAuthorize`），
  且 `apps/client/src/services/http.ts:349-356` 的自动补键拦截器对未手设键的写请求
  **每次调用生成新键**（P1-1 修复注释写明理由）。
  ⇒ 今天这一发不会回 `IDEMPOTENT_CONFLICT`，此处的排除属**防御性口径**。
- 跨点击稳定的业务键确实在盘上，但挂在**另一条解锁路**：`apps/client/src/stores/coins.ts:307-310、326-329`
  手设 `headers: { "Idempotency-Key": orderId }`（`orderId = UNLOCK-{scene}-{targetId}`，:178），
  打到 `POST /wallet/unlock`（`WalletController.java:425-428`）与 `/wallet/deduct`（:458-460），
  这两个端点**都标了 `@Idempotent`** ⇒ 同目标二次点击在 TTL 内必回 409 + `IDEMPOTENT_CONFLICT`。
  同一棵组件树里 `CardDetailOverlay.handleMessage()`（解锁私信）就是这条路。
- ⇒ 结论：本判点钉的是**客户端分支口径**（后端契约变更时的行为承诺 + 无 code 的保守档），
  不是「当前后端可复现的一次响应」。spec 头部注释里已把这段写死，免得下轮有人当成回归。

### 1.3 夹具选型与覆盖矩阵

两处组件形状相同（同一段 catch 复制），判点写成**一张期望表 × 两个宿主组件**
（`describe.each(HOSTS)` + `it.each(CASES)`），而不是「共用一份夹具只测一处」：
1. 任一文件里删掉/写歪排除条件都会红——两处各自独立有覆盖（§1.4 的 M1a/M1b 各只改一个文件，
   各红一条且只红对应宿主，实测过）；
2. 期望表只有一份，不会出现「改了 A 的口径忘了改 B 的题语」这种判点自身漂移；
3. 两处入参都是同一个 `AppApiError` 形状（`services/api-error.ts:42-63`，`status`/`code` 都是实例字段），
   分开写只会把 4 个组合抄两遍。

| # | 入参（reject 的 AppApiError） | 期望 toast | 期望 modal | 附带不变量 |
| --- | --- | --- | --- | --- |
| 1 | 409 + `INSUFFICIENT_BALANCE` | 1 次，标题＝`交友币余额不足，解锁失败`（zh-CN.ts:1033 字面量），`icon:"none"` | 不弹 | `resetToPaywall` 1 次、`showResult` 0 次 |
| 2 | 409 + `IDEMPOTENT_CONFLICT` | **不得**调用 | 1 次，标题＝`解锁失败`，正文含后端原文，`showCancel:false` | 同上 |
| 3 | 500 + `INTERNAL_ERROR` | 不调用 | 1 次（兜底 modal） | 同上 |
| 4 | 409 且 `code` 缺失 | 1 次，仍给余额提示（**刻意保守**，组件注释写明「宁可提示保守，也不退回弹后端原文」） | 不弹 | 同上 |
| 5 | 不抛错（成功对照） | 不调用 | 不调用 | 证明 1-4 的缺席是分支给的，不是载具没跑 |

反「恒真」处理：
- 断言写死语言包真值字符串，不用 `t(key)` 当期望值（本仓已知坑）；另加一条独立用例
  `t("discover.whisperUnlockFailBalance") === "交友币余额不足，解锁失败"`，
  键被删/改名时它先红，同时 toast 断言里显式要求标题不等于裸键名。
- 载具有效性断言：`clientApi.unlockWhisper` 必须被调用 1 次且入参 `"user-1"`，
  否则说明 `useMock()` 没被置成 false、整段 catch 一步没走。
- mock 置位：`vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }))`
  ——real 档才走 `clientApi.unlockWhisper`；mock 档走 `coinsStore.spend` 抛裸 `Error`，无 status/code。
- 弹层探针：`WhisperUnlockSheet` 用带 `methods: { showResult, resetToPaywall }` 的 options 桩替换
  （`handleWhisperUnlock` 未 `defineExpose`，唯一入口是模板上的 `@unlock`，故判点通过
  `findComponent({ name: "WhisperUnlockSheet" }).vm.$emit("unlock")` 驱动，走的是真实事件绑定）。

### 1.4 反向变异记录（判点能否真咬）

| 变异 | 改法（改坏⇒跑⇒还原⇒sha 对齐⇒复绿） | 结果 |
| --- | --- | --- |
| M1a | 仅 `CardDetailOverlay.vue`：`status === 409 && conflictCode !== "IDEMPOTENT_CONFLICT"` ⇒ `status === 409`（删掉排除） | `Tests 1 failed \| 13 passed`，红的是 Overlay 宿主的「409 + IDEMPOTENT_CONFLICT」，报「非余额档不得提示『余额不足』: expected spy to not be called … actually been called 1 times」 |
| M1b | 仅 `CardSwiper.vue`：同 M1a | `Tests 1 failed \| 13 passed`，红在 Swiper 宿主的同一格 ⇒ 两处各自独立有覆盖 |
| M2 | 两文件：`conflictCode !== "IDEMPOTENT_CONFLICT"` ⇒ `conflictCode === "INSUFFICIENT_BALANCE"`（把保守档翻掉） | `Tests 2 failed \| 12 passed`，两宿主的「409 + code 缺失」同时红 ⇒ 那条刻意保守的选择被钉住了 |
| M3 | 两文件：`status === 409` ⇒ `status >= 400`（状态轴放开） | `Tests 2 failed \| 12 passed`，两宿主的「500 ⇒ 走兜底 modal」同时红 |

还原后 sha1（与改坏前基线逐字一致）：
- `CardDetailOverlay.vue` `4698de5a261fd87c915aae99cea84650fd51d2f3`
- `CardSwiper.vue` `cd8844c814c77fec0b3e2dcb490422740fbc011c`
- `git status --porcelain -- apps/client/src/components` 空 ⇒ 本条零产品改动。
- 复绿读数：`npx vitest run src/tests/components/whisper-unlock-409-source.spec.ts`
  ⇒ `Test Files 1 passed (1) / Tests 14 passed (14)`。

状态：已闭合。


## 二、条目 2：i18n 同层重复键判点

### 2.1 `i18n.spec.ts` 的「唯一性」到底判的是什么粒度（决定新判点形态的结论）

判点位置：`apps/client/src/tests/i18n.spec.ts` 的
`it("zh-CN 键集应自洽：叶子路径唯一且文案值非空")`（文本锚，同文件 :125-161 是它用的两个收集器）。

实测口径分解：
- 谓词是 `collectLeafEntries(zhCN)` + `new Set(paths).size === entries.length`。
  `collectLeafEntries` 递归的是 **`import zhCN from "../i18n/locales/zh-CN"` 求值之后的运行时对象**
  （用 `Object.keys()` 取属性名）。
- 于是这既不是「叶子名全局唯一」，也不是「源文本路径唯一」，而是
  **「运行时对象的叶子路径唯一」——按 JS 语义恒真**（同一个对象不可能有两个同名属性，
  TS 对象字面量的同层重复键在求值时已被静默合并，后写块整体覆盖前写块）。
  ⇒ 该判点对同层重复键的判别力是 **0**，不是「粒度不够细」，是**平凡重述**。
- 配套的「值非空」维度同样只看合并后的值：前块被整块吞掉后，它独有的那些路径
  直接从键集里消失，连「空值」都判不到；而「≥1500 个 key」的下限远低于实测 4176，
  少几条也不红。
- 实测读数（本车道跑出的数，不是推的）：`zh-CN.ts` 4866 行 / 源文本级键出现 4475 次 /
  运行时叶子路径 4176 条 / 父路径 300 个 / 最大深度 6 / 同层重复 **0 对**；
  两者差值 4475 − 4176 = 299 = 对象型键数（父路径数 300 含根，故 −1）。
- 派单里说 `i18n.spec.ts` 是 113 例，**实测是 102 例**（`npx vitest run src/tests/i18n.spec.ts`
  ⇒ `Tests 102 passed (102)`），按实测记，不影响结论。

⇒ 对新判点的约束：必须**在文本层**做「同一父路径下键名重复」的比对，要能给出首次行号与
被覆盖写法的行号；只数键名、只看求值后的对象、或做全局同名比对（会把
`a.same.x` 与 `b.same.x` 误判成重复）都不合格。

### 2.2 新判点形态

新判点文件：`apps/client/src/tests/i18n-duplicate-keys.spec.ts`（14 例）。
它自带 tokenizer（剥 `//` 与 `/* *\/` 注释、字符串整体成一个 token，值里的 `//`、`:`、`,`、`{}` 都不误伤）
+ 递归下降（花括号深度 + 父路径追踪），`scanObjectLiteralKeys(src)` 返回
`{dups, keyOccurrences, arrayKeyOccurrences, parentPaths, maxDepth, tokens, lines}`。

口径三条明确写出：
- 只在**同一个对象字面量内部**比键名（父路径不同＝两条不同 `t()` 路径，不算重复）；
- 计算键 `[expr]:` 的键名要运行时才知道 ⇒ 整段跳过，不参与同层比对；
- 数组元素对象里的重复同样报出（TS 一样静默合并），但打 `insideArray` 标记，父路径记作 `父路径[]`。

判点分四组，缺一组就退化成能被空转骗过的判据：

| 组 | 内容 | 实测读数 |
| --- | --- | --- |
| 扫描面下限 | locales 至少 1 份 `.ts`；每份文件 行数 ≥3000、token ≥15000、源文本键数 ≥3000、父路径 ≥200、深度 ≥3；再加「源文本键数 ≥ 运行时叶子路径数」的交叉校验 | zh-CN.ts 实读 4866 / 18002 / 4475 / 300 / 6 |
| 阳性对照 | 7 个合成片段：同父重复块（1 对，含 parentPath 与两处行号 + 键计数 7）、同名不同父**不得**误报、同层三连写报 2 对且行号 `2->3`/`2->4`、引号写法不同（`"a"`/`a`）仍算同一键、注释里的假键与值里的 `//`+冒号+逗号都不算键、数组元素对象里的重复带 `insideArray`、计算键不参与 | 7 例全过 |
| 判据自证 | 复刻旧判点的谓词跑一份**含重复**的源 ⇒ `Set.size === entries.length` 照样成立（旧判点全绿的机器证明），而文本级这把尺在同一份源上报 1 对；再证前块独有键在运行时对象里整个消失 | — |
| 存量基线 | `DUPLICATE_KEY_BASELINE: string[] = []`（签名 `父路径 > 键名`），逐条 `toEqual`，红信里带 `文件 + parent + key + 首次行 + 被覆盖行` | 现存 0 对 ⇒ 基线为空集 |

### 2.3 现存同层重复键入账

**0 对**（不是「若干」，是逐文件扫完后计数为 0）：

| 文件 | 行数 | 源文本键数 | 父路径数 | 同层重复 |
| --- | --- | --- | --- | --- |
| `apps/client/src/i18n/locales/zh-CN.ts`（唯一在册语言资源，en-US.ts 已于 2026-10-29 下线） | 4866 | 4475 | 300 | 0 |

配套事实核对：
- 主控撞到的那一发 `storeErrors.vip` 同层重复**不在 HEAD**：
  `git status --porcelain -- apps/client/src/i18n` 为空，
  `zh-CN.ts` sha1 `b0a97509f0946ef1abf146d8a8c06fd8f6f1de87`，`storeErrors` 段内只有 1 枚 `"vip"` 块
  （`planRequired` + `statusPending` 两条）。⇒ 无存量债要钉棘轮，基线保持空集；
  「只减不增」由 `toEqual(DUPLICATE_KEY_BASELINE)` + 显式 `expect(DUPLICATE_KEY_BASELINE).toEqual([])` 双重焊住，
  不许有人把新扫出的重复塞进基线转绿。
- 「0 对」不是空转读数：同一份 spec 在同一次跑里对合成片段报出了重复（阳性对照），
  且下限组要求源文本真读到 3000+ 个键才允许继续判（§2.4 的 N3 变异证明这两个闸门都会咬）。

### 2.4 反向变异记录

| 变异 | 改法 | 结果 |
| --- | --- | --- |
| N1 | **把主控撞到的那发真插回产品文件**：`zh-CN.ts` 的 `storeErrors` 下、既有 `"vip"` 块之前，再写一个 `"vip": { "w2cMutationProbe": … }` | 新判点 `Tests 2 failed \| 12 passed`：存量基线组点名 `zh-CN.ts storeErrors > vip 首次 4108 行、被覆盖写法 4111 行`；「在册读数」组的 `keyOccurrences - leaves === parentPaths - 1` 同时失配。**同一次跑里 `src/tests/i18n.spec.ts` 102 例全绿**（`Test Files 1 failed \| 1 passed`）——主控报的「那一发全绿通过」被逐字复现 |
| N2 | 把判据从「同一父路径」放宽成「全局同名」（`const seen = new Map()` ⇒ 共享 `globalSeen`） | `Tests 3 failed \| 11 passed`：红在 ①「同名但不同父不得误报」对照（合成片段被误报 2 对：`b > same`、`b.same > x`）、②在册读数（`zh-CN.ts` 被误报出上千对，断言摘要显示 `…(1026)` 续行）、③存量基线 ⇒ 证明「同层」这个粒度本身有判点，而不是只判「有没有重名」 |
| N3 | 关掉 tokenizer 的行注释剥离（`if (c === "/" && n === "/")` ⇒ `&& false`） | `Tests 5 failed \| 9 passed`：源文本键数从 4475 塌到 1972 ⇒ ①扫描面下限红（键数/交叉校验两条）、②「注释里的假键」对照红（键数 3≠2）、③在册读数与④存量基线被注释里的假键污染成 dup 误报 ⇒ 下限组与注释轨都真在拦东西 |
| 附带 | 首跑时两条阳性对照的**期望值**写错（键计数 6≠7、3≠2） | 当场红 ⇒ 顺带证明这两条不是恒真断言；已按实测改正 |

还原核验：
- `zh-CN.ts` sha1 还原后 `b0a97509f0946ef1abf146d8a8c06fd8f6f1de87`（与插回前逐字一致），
  `npx vitest run src/tests/i18n-duplicate-keys.spec.ts` ⇒ `Tests 14 passed (14)`；
- spec 自身两次改坏后 sha1 均回到 `4f03340f1331cf7a4a063e33e243bb1d7806db10`，复绿 14/14。

### 2.5 顺带入账（不在本车道权限内，交主控）

- `scripts/qa/verify-i18n-orphan.mjs` 的 `loadLocale()` 同样是 `new Function` 求值后再 `Object.keys` 遍历，
  ⇒ 它的三条维（成对 / 孤儿 / 裸中文）**也都看不见**同层重复键（键少了几条只会让 `I18N_ZH_KEYS` 变小，
  而孤儿棘轮是按「找不到引用」计数，被覆盖掉的键压根不进键集，所以连计数变化都没有）。
  本车道没动这道门：新判点已落在客户端 vitest 套件里（`vitest.config.ts` 的
  `include: ["src/tests/**/*.spec.ts"]` ⇒ CI 的 `client-test` job 自动收），
  派单给的「只许动 `verify-i18n-orphan.mjs` 判据新增维度所需入参」这个口子**没用上**。
- 若要把它同时做成 QA 门的一维，需要在该文件加第四维（现有三维是 成对 / 孤儿 / 裸中文：
  文本级扫描 + `--allow-dup-keys` 棘轮），
  属改判据逻辑，超出本车道权限，标为待办。

状态：已闭合。

## 三、收口读数

| 读数 | 载具 | 结果 |
| --- | --- | --- |
| 新判点单跑 | `npx vitest run src/tests/components/whisper-unlock-409-source.spec.ts` | `Test Files 1 passed (1) / Tests 14 passed (14)` |
| 新判点单跑 | `npx vitest run src/tests/i18n-duplicate-keys.spec.ts` | `Test Files 1 passed (1) / Tests 14 passed (14)` |
| 三条相关套件合跑（含旧 i18n 判点） | `npx vitest run src/tests/i18n-duplicate-keys.spec.ts src/tests/i18n.spec.ts src/tests/components/whisper-unlock-409-source.spec.ts` | `Test Files 3 passed (3) / Tests 130 passed (130)` |
| 全量单测（收口终跑，产品树已还原后重跑） | `cd apps/client && npm run test:unit` | `Test Files 159 passed (159) / Tests 1685 passed (1685)`，`unit_exit=0`，Duration 216.63s |
| 子集口径对账 | `npx vitest run src/tests/components` | `66 files / 706 tests` ⇒ 减去本车道新增的 1 文件 14 例＝**65 / 692**，与主控报的「65 文件 692 例全绿」逐字吻合（这也反向证明该子集此前确实没有判点走到 409 分支） |
| 类型面（收口终跑） | `cd apps/client && npm run typecheck`（`vue-tsc --noEmit`） | `typecheck_exit=0`、除 npm 头两行外零输出（已知坑 TS6133 未触发：新增 import 全部被用到） |

未跑的面（按纪律显式标判不出）：
- 真机/构建面：本车道不起 dev server、不跑 `build:h5` / `build:mp-weixin`，
  所以「mp-weixin 端 toast/modal 的实际渲染」「条件编译后的分支裁剪」**判不出**。
- `npm run test:client` 未用（它会先跑 `generate:openapi` 写盘）。
- 根 `test:contracts` / QA 门链未跑：`scripts/qa/**` 与 `tests/**` 是本车道禁改面，
  且新判点全部落在 `vitest.config.ts` 的 `include: ["src/tests/**/*.spec.ts"]` 里，
  由 CI `client-test` job 自动收，不需要新接线。

改动清单（全部为新增判点，产品文件零改动）：
- 新增 `apps/client/src/tests/components/whisper-unlock-409-source.spec.ts`（14 例）
- 新增 `apps/client/src/tests/i18n-duplicate-keys.spec.ts`（14 例）
- 产品文件 sha1 收口值（与本轮开工基线逐字一致，`git status --porcelain` 对这些路径为空）：
  - `apps/client/src/components/discover/CardDetailOverlay.vue` `4698de5a261fd87c915aae99cea84650fd51d2f3`
  - `apps/client/src/components/discover/CardSwiper.vue` `cd8844c814c77fec0b3e2dcb490422740fbc011c`
  - `apps/client/src/i18n/locales/zh-CN.ts` `b0a97509f0946ef1abf146d8a8c06fd8f6f1de87`
- 未碰：根 `package.json`、`.github/workflows/ci.yml`、`README.md`、`tests/**`、`scripts/qa/**`
  （含 `verify-i18n-orphan.mjs`，其入参口子没用上，见 §2.5）、`apps/api/**`、`apps/admin/**`、`docker**`、`doc**`；
  全程零 git 写操作。

## 四、遗留 / 交主控

1. `scripts/qa/verify-i18n-orphan.mjs` 的三条维（成对 / 孤儿 / 裸中文）都建立在
   `new Function` 求值后的键集上 ⇒ 对同层重复键同样免疫（§2.5）。要不要把它升级成第四维
   （文本级 + `--allow-dup-keys` 棘轮）属改判据逻辑，请主控裁定车道。
2. 条目 1 的可达性分解（§1.2）说明：`IDEMPOTENT_CONFLICT` 今天不会从
   `POST /recommendations/{userId}/whisper/unlock` 这一发回来（端点无 `@Idempotent`、客户端每次生成新键），
   稳定业务键 `UNLOCK-{scene}-{targetId}` 挂在 `POST /wallet/unlock` / `/wallet/deduct`（两者都 `@Idempotent`）那条路上。
   如果主控要的是「后端把解锁也纳入 `@Idempotent`」，那需要后端排期；
   本车道只把客户端口径钉死，不改产品行为。
3. 无「预期红」遗留：本车道两条判点收口时全绿。

## 五、原始读数存档（本机临时件，`tmp/` 被根 .gitignore 吞掉，不入库）

- `tmp/w2c-final-unit.log` ⇒ 收口终跑全量 vitest 原始输出（ANSI 未剥，`Test Files 159 passed (159)`）
- `tmp/w2c-final-tc.log` ⇒ 收口终跑 `vue-tsc --noEmit` 原始输出（空）
- `tmp/w2c-test-unit.log` / `tmp/w2c-test-unit2.log` ⇒ 第一次全量跑（283.44s，同样 159/1685 绿）
- `tmp/w2c-components.log` ⇒ `src/tests/components` 子集（66/706）
- 变异 N1/N2/N3 的红色读数没有留日志文件（当场取，摘要逐字抄进 §1.4 / §2.4），
  复现载具：按 §2.4 的「改法」列重放即可，还原核验靠 sha1 三个值。



