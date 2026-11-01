# 第七轮修复批次收口账（2026-11-01）

依据：第六轮收口账（`2026-11-01-round6-remediation.md` §5）挂账的 8 项产品账 + 第六轮 §4 边界清单。
本文件只写**回到盘上复量过的**结论；命令→读数逐条在册。

## 0. 本轮执行形态（必须先说清）

原计划派 3 条车道并行（R7-A originalPrice 改名 / R7-B media_holds 第三轴 / R7-C 页面契约第 1 批），
**三条全部在 19:37 撞账号 5 小时用量上限**（00:08 重置）中断。中断时的状态经主控逐一验收：

| 车道 | 死前落盘 | 主控验收结果 |
|---|---|---|
| R7-A | 改了 8 个文件 + 车道报告写到 §4（验证段空） | 改动全部成立（见 §2.3）；报告 §5/§6 由主控以**亲自跑出的读数**补记并标明出处 |
| R7-B | 清单项 + 第三轴判点 + 作用面账（3 个文件） | 成立；缺的排序判点（清单 rationale 引用的测试不存在）由主控补齐 |
| R7-C | 2 个门 spec（游客守卫 ✓ / 封存粒度 ✗ 红） | 封存粒度门有 **2 处尺子 bug**（见 §3），主控修复后转绿；其余 3 门 + 2 挂载 + 9 静态 + 4 挂载由主控串行补完 |

之后全部工作由主控串行完成。**R7-B/R7-C 没有车道报告**——不补造，本账即它们的交付记录。

## 1. 终验读数（主控串行独占跑）

| 载具 | 读数 | 对照第六轮收口 |
|---|---|---|
| `npm run test:contracts`（35 条） | `CONTRACTS_EXIT=0` | 不变 |
| `cd apps/api && ./mvnw -o -B test` | `Tests run: 1909, Failures: 0, Errors: 0, Skipped: 11`、`BUILD SUCCESS` | 1905→1909（+4 = R7-B 四个新判点）；skip 不变（仍是真库门控类） |
| `npm run test:client` | `Test Files 166 passed (166)`、`Tests 1733 passed`、EXIT=0 | 159→166 文件（+7：4 门 + likes 挂载 + 2 批页面契约），例数随涨 |
| `npm run test:admin` | `Tests 83 passed (83)`、EXIT=0 | 不变 |
| `npm run test:i18n-orphan` | 孤儿 `1243/1243`、裸中文 `341/341`、**同层重复键 client=0 admin=0（新第四维）**、`I18N_RESULT=PASS` | +1 维 |
| `node v22 scripts/qa/run-qa-selftests.mjs` | `SELFTEST_RESULT=FAIL（1/64）`——唯一仍红是 `test-guest-landing` 里 **`booked 30 ≠ measured 28`**（需微信开发者工具 + 真档 measure 腿 + 可销毁专用账号，边界清单 §4.8 原样） | 2/64 → 1/64 |
| `node v22 scripts/qa/test-guest-landing.mjs` 单跑 | `checks=45 assertion failures = 1`（同上） | 2→1 |

## 2. 第六轮 §5 挂账逐条处置

### 2.1 wallet 页「整页未声明游客断言」的命中面 —— **已闭合（且把断言收紧）**

事实链：wallet MW01–11 的 `pre` 自己写着「身份A 登录」；该页 2026-10-31 起有游客守卫（policy basis 全文在册）
⇒ 游客腿对这 11 行**永远作不了证**（页面弹走），只是 R2 写行时 identity 轴还不存在。recommend-pref
（RP01–11）同形（guide-401 族弹回页）。而打标工具 `tag-ops-identity-scope.mjs` 因守恒基线钉死 1107
（W5 加 16 行后实为 1123 未同步）**从 W5 起一直拒绝写盘**——这是 7947e356 拆过的同款「字面常量」复发，本轮修：

1. `EXPECT_TOTAL` 改带出处的 1123（1107+#69 盖章 → +16=W5 security 册）；
2. 落盘复读对账从「盘上全部 A,B 行数 == 计划」改成「**按本轮规则重算**的命中数 == 计划」——原式在有
   历史存量 A,B 行（判据正文后被改写命中游客词、工具只撤 ["A"] 不追删 A,B）时恒差（实测存量 14 行）；
3. `--selftest` 13 例 PASS 后 `--apply`：新标 **RP×9 + MW×11**（RP05/RP07 正文含游客词，按规矩 2 留游客腿；
   SEC01/SEC02 未标保住）⇒ 30 个裁定页全部走 #67 收窄路线；
4. `test-guest-landing.mjs` 第 10 块断言**收紧**为「整页未声明必须恒 0」（原断言钉的是 2026-09-30 引导期的
   1 页现状）：裁定页 = 游客必弹走的页，内容行游客腿作不了证，「整页未声明」只能是「新裁定页还没人打标」
   的过渡态，不许常住。合成负例 3b/9a/9b 仍钉该路线自身的窄条件。
5. 门体 `verify-guest-landing.mjs` 与测试里的过期口径注释同步改写（28 页/1 页 → 30 页/0 页）。

### 2.2 `temp_chat_media_holds` 第三轴 —— **已闭合（车道半成品 + 主控补排序判点）**

语义先核清：它是**管理员举报保留**表（`MediaAssetService#holdTempAsset` 由
`AdminMediaAssetController` 调用，`created_by` 存**操作管理员**不是数据主体；`media_asset_id` 无 FK
指向 `media_asset`）。处置：

- 清单点名（排在 `media_asset` 项之前）：`DELETE h FROM temp_chat_media_holds h JOIN media_asset ma
  ON h.media_asset_id = ma.id WHERE ma.user_id = {uid}`——删轴是**借 media_asset 归属**；素材项既定裁定
  「无法定保留义务」⇒ 悬在已删素材上的保留行（session_uid/reason 含举报上下文）一并清。导出类别不加
  （media_asset 自身不在导出清单，理由写在 rationale）。作用面 45/29/5=79。
- **第三轴**（ErasureSchemaAlignmentTest 新方法）：列名 = `<清单表名>_id` 而 FK 图上无该边的表必须点名或
  带理由豁免；全库枚举**只命中 media_holds 一张**（豁免表为空）；含假 DDL 阴阳对照（同列有 FK〔CREATE/ALTER
  两种形态〕⇒ 不命中；指向非清单表 ⇒ 不命中）。
- **排序判点**（主控补）：`joinBorrowingDeletesRunBeforeTheJoinedTableIsDeleted` + 阳性对照——借归属的
  JOIN 删除排在被借表自身删除**之后** = JOIN 捞空、静默 0 行（素材行先删它就永远删不到）。
- 轴边界如实记：第三轴按**列名精确匹配清单表名**（`media_asset_id`→`media_asset`）；非 FK 的 `user_id`
  形状不归它管——那是第一轴（归属列轴）的地盘，两轴不重叠也不互相兜底。

### 2.3 `originalPrice` 同名异单位 —— **已闭合（R7-A 半成品 + 主控验收）**

裁定与落地：`shop_items` 侧 API 可见字段 `originalPrice` → **`originalPriceCents`**（与兄弟字段
`priceCents` 对齐；DB 列 `original_price` 不动）；`products` 侧保持 `originalPrice`（元，面向客户端目录，
字段注释写明勿混淆）；vip 营销位本地配置 `originalPrice` → `originalPriceYuan`（消费者恰 3 文件）。
涉面：实体/AdminShopController records/admin business.ts+Shop.vue/vip-plans+vip store+vip 页。
客户端零消费核清：`api-types.ts` 生成链只吃 `feedback-growth-and-auth.yaml`，不含 shop_items/products；
client 的 market 两页消费的是 `/products`（元，同名同单位，无错位）。验证读数见
`round-7-fix-lane-A-originalprice.md` §5（主控补记）。

### 2.4 充值保留键与 `@Idempotent` 4h TTL 终态 —— **已闭合（裁定 + 落地）**

裁定：保留键的承诺是「同键重试 ⇒ 服务端判重兜住」，但服务端 TTL 4h（`Idempotent.DEFAULT_TTL_SECONDS`，
infra R2-00249）后**忘掉这个键**——窗外的「复用」是一句服务端已不认的防重承诺。落地：`PendingRecharge`
加 `createdAt`，`RECHARGE_KEY_RETENTION_MS = 4h − 1min`（等值对齐 + 时钟漂移余量；**不许长于**服务端窗
= 空承诺，也不许短 = 窗内重试绕开判重）；窗内复用、窗外换新键当新操作；旧形状记录（无 createdAt）按无
未完成操作处理。spec +3 例（窗内复用/窗外换键并覆盖落盘/旧形状换键），8/8 绿。

### 2.5 46 页契约收敛 —— **三个批次全部落地（F-7 方案全量执行）**

- **第 1 批（4 门 + 2 挂载）**：
  1. 游客守卫对账门（`guest-guard-census.spec.ts`，4 例）：`guideGuestToLogin(` 调用页 ⇔ policy 双向对账
     （guard-bounce 行 ⊆ 调用集；调用集 ⊆ 在册行，不分族——F-4.3 的 5 页 guide-401 失真按事实口径处理）；
  2. 封存粒度门（`commerce-module-census.spec.ts`，4 例）：实参 ⊆ {coin,consult,course,vip}；无参只许
     shop/detail 两页（带 F-4.1 理由登记）；8 个调用页逐页登记「页面→module」表，登记漂了也红；
  3. a11y 基线递减门（`a11y-baseline-census.spec.ts`，4 例）：跨行解析（单行 grep 会把 maxlength 缺失
     21 误报成 48——F-5 教训写死在注释）；基线 maxlength 23 / 可访问名 61 / 按压反馈**点名尾单 2 页**
     （notifications、setup/campus；组件的 hover-class 机制不算缺）；
  4. 隐私授权前置门（`privacy-media-precedence.spec.ts`，2 例）：9 个媒体 API 调用文件**全部**有
     `ensurePrivacyAuthorized` 在调用点之前 ⇒ **零基线**装门（无存量缺守卫；夹具自证含守卫在后/缺失=红）；
  5. likes/likes-visitors 挂载（`likes-pages-commerce.spec.ts`，7 例）：两页各补 coin 封存结构性不可达 +
     余额不足→去充值 modal→跳钱包；likes 页（第二份 handleUnlock 拷贝）补会员三态。
- **第 2 批（9 静态，`static-page-contracts-batch2.spec.ts` 14 例）**：discover 额度早退顺序 / search 深链与
  历史区块条件 / history 重试与 dispose / activities 详情 id 单入口 / activities 列表守卫先于 onShow /
  discussions 守卫+失败可重试 / help 门槛口径（chatPageRequirements 只许活在注释里）/ tasks 签到态真实派生 +
  离开取消 / official-chat 乐观合并排序。
- **第 3 批（4 挂载，`mounted-page-contracts-batch3.spec.ts` 10 例）**：shop 封存零请求（含签到）+ 解封补偿
  （MP-R2-次要22-003）/ detail 封存早退先记 productId + 解封按记录补拉（-002）/ feedback-history onShow 单拉
  （R4-00119）+ 失败不折空态 / nearby superLike 走 `/matches/super-like`（300ms 防抖窗口走完才断言）+
  未登录早退零请求。

### 2.6 `run-qa-selftests` / `prove-gates-can-fail` 升链 —— **裁定：仍不升，理由落账**

- `run-qa-selftests`：本轮后仍 1/64 红，且那条（booked≠measured）是**真环境边界**（需真机 measure 腿）。
  升链 = 链立刻因外部条件变红，会把环境红误归因到代码改动。维持「有理由的本地载具」登记（bash/DSL 在册），
  **边界消除（真机腿跑完 measured=30）当日即升链**——这不是免检，是待环境。
- `prove-gates-can-fail`：单发数十分钟且会临时改坏盘上文件，维持本地载具。第六轮已真跑过一发（7/7）。

### 2.7 门侧补 i18n 重复键轴 —— **已装（第四维，零基线）**

`verify-i18n-orphan.mjs` 新增文本级同层重复键判据（**路径栈**判定——首版用花括号深度，自证用例当场抓出
「嵌套兄弟层同名误报」，改成打开每层的键名栈后才过）；值内 `{n}`/`a: b`/换行不漂层（三个对照钉住）；
client zh-CN 与 admin zh-CN 都进同一把尺（admin 此前零判点覆盖）；基线 0、无棘轮（重复键没有存量合理形态）。
读数 `I18N_DUP_KEYS client=0 admin=0`，`I18N_RESULT=PASS`。

### 2.8 `answerHasMore` 冷启动值 —— **已裁定：false**

未拉过第一页之前「还有更多」是未验证的假设，不许驱动可见的「加载更多」入口；首页拉取后由真实页满决定
（`fetchAnswers` 两分支都写顶层值）。`daily-question.ts` 初值改 false + 裁定注释；`session.spec.ts` 的
登出复位判点同步改钉（该用例注释本就写明「谁改初值必须来这里认领」——本轮认领）。

## 3. 本轮制造并收回的错（不许省）

1. **i18n 重复键判点第一版是坏的**：用花括号深度分同层，嵌套兄弟层（`{a:{k},b:{k}}`）同名误报——
   判点自证用例（内嵌阳性对照）当场抓住，改路径栈后过。这证明「判点必须带能红的对照」不是仪式。
2. **验收 R7-C 半成品时抓到 2 处尺子 bug**：`CLIENT_SRC = resolve(__dirname, "../..")` 多退一级扫到
   `apps/client`（路径全带 `src/` 前缀 ⇒ 登记表整表失配，8 页全部假报未登记）；登记表 ∅ 与实参 {""}
   的空集语义没归一。修法都在判点里留了注释。
3. **第 3 批挂载的五次踩坑**（每次都靠真跑撞见，不是靠想）：feedback 页调**裸全局** `getCurrentPages()`
   （补 globalThis）；nearby 页被测对象 CardSwiper 被全局桩桩没（keepSwiper 通道）；clientApi 全量 Proxy
   把 `getRecommendations` 抹成 undefined（改 importOriginal 只覆写 listSubmissions）；
   `services/api` 的**本地** `useMock()` 不走 helper（mockFixtures 9 条泄漏，补 `config/env` 桩）；
   superLike 端点是 `/matches/super-like` 且有 300ms 防抖（flushPromises 排不了定时器）。
4. **likes 挂载首跑喂错形状**：真 store 的三个取数端点要裸数组，喂 `{}` 在 `.map` 上崩——桩要按真契约喂。

## 4. 边界清单（外部条件，逐条不变；本轮无新增可判定项）

1. DBA 凭据/影子库：76→**79** 条清除语句的真执行、影响行数、`@Transactional` 真回滚仍卡（R7-B +1 条）。
2. real profile 装配 + `liveSchemaAgreesWithStaticDerivation` 1 skip：需真实栈 CI。
3. `booked 30 ≠ measured 28`：唯一剩红，需微信开发者工具 + 真档 measure 腿 + 可销毁专用账号；
   **wallet/security 两组补测当日，§2.6 的升链条件即满足**。
4. AOF 历史键、对象存储物理删除、多副本限流、textfile 5 项、CI 首跑三大假设、微信真机腿：原样在册。

## 5. 第七轮审查面（对本轮改动的反证，主控串行）

- **ops 判据台重排版无内容损失**：工具按其标准 2 空格缩进重写了 4 个文件（W5 的 1 空格版整体换格式），
  逐文件核：security 16 例 + 7 个 pageNotes 键 + SEC01–16 全在；次要22=78、次要21=102、login=38，
  全目录 1123（corpus 守恒门绿）。语义变化只有 identities 三元组新增。
- **打标没误伤**：SEC01/SEC02（游客行）未标；RP05/RP07（含游客词）留游客腿；14 行历史 A,B 存量原样保留
  （工具不追删，复读对账已按规则重算不按全量数）。
- **断言收紧不是放松**：第 10 块从「恰好 1 页走引导期路线」改为「恒 0 页」——任何新裁定页入册没打标、
  或既有页整页掉 identities，先红。负例 3b/9a/9b 仍全绿（checks=45）。
- **R7-A 残留 grep**：shop_items 域与 vip 域无裸 `originalPrice` 残留；products 侧有意保留（元）。
- **R7-B 引用核实**：`V2026.10.28.0012__add_temp_chat_media.sql` 在盘；第三轴全库枚举只命中 1 张
  （豁免表空集，判点防空转地板钉住这一事实）。
- **第三轴边界**（如实记，防下轮误读）：按列名**精确**匹配清单表名派生，`session_id`→`temp_chat_session`
  这类复数/前缀变体不在轴内；非 FK 的 `user_id` 归第一轴。轴的覆盖度等于列名约定。
- **未提交文件卫生**：`apps/client/src/static/assets/images/demo/`（xiaoman-* 三图）为早前 UI 轮次遗留的
  未跟踪件，与本轮无关，不入库；archive/ 与 specs/ 的大量工作树删除是更早会话的动作，本轮不追认。

## 6. 提交

一个提交：第六轮 §5 全部 8 项闭合 + 第七轮审查面。文件面：
`apps/api`（privacy 清单+测试、ShopItem/Product/AdminShopController）、`apps/admin`（business.ts/Shop.vue）、
`apps/client`（wallet/daily-question/vip 三处源码 + 9 个新 spec + 3 个改 spec）、
`scripts/qa`（tag 工具/guest-landing 两件/i18n 门）、`reports/audit/round-6/ops` 4 件重打标、
`round-7-fix-lane-A-originalprice.md`（补记）+ 本账。
