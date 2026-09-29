# 令牌冲突车道 #10-e（client implementation lane）

裁定依据：用户 2026-09-29 06:20「一律按判据补齐实现」（`reports/audit/round-7/decisions-v33.md:11`）——
冲突时只动实现，不动判据、不降级断言。判据点了具体值且没有反面裁定 ⇒ 改实现；
两条在册依据正面相撞 ⇒ 上交，不自选值。
工作树：`D:\6\恋爱小程序`，未 stage、未 commit（本车道无 git 写权限）。

---

## 判据原文与出处

### 1. AppShell 水平内边距（28rpx vs 32rpx）

- 唯一在册行（台账即判据本体，只读）：`MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001`
  —— `reports/audit/round-6/issue-matrix.md:28`，处置列逐字：
  > 修：水平内边距单一来源：由 AppShell 承担（或调为 32rpx），页内层水平 padding 归零；W16 串行全站生效。
  > 本轮已落 circles/index.vue 页内侧一半（工作树 :949），其余 14 个消费页仍各自为政 → 整条仍开放。
  > 归零只针对容器级 `.circles-tabs`，chip 胶囊内距 `.circles-tab` 不在本条射程
  证据列逐字（同 col7）：
  > `apps/client/src/components/layout/AppShell.vue:280-282 .shell--standard{padding:0 28rpx}`（HEAD 与工作树同行）叠加页内层水平内距。
- 判据台（`reports/audit/round-7/ops/*.json`，24 份 / 只读）**没有任何一条用例点名 AppShell 的水平 gutter**。
  全库 grep 实测：ops 里 `APPSHELL` 只命中 1 处 —— `reports/audit/round-7/ops/次要21.json:1498`
  （内容是 `fixed`/吸顶行为，逐字与内边距无关）；`shell--standard|AppShell.vue:28` 在两份 ops 语料里 0 命中。
  ops 里出现 `32rpx` 的行都与他物绑定，最接近的一条是页级 gutter：
  `reports/audit/round-7/ops/PAGES-NEARBY-INDEX.json:249`
  > …（.nearby-home 左右 32rpx padding，:646 起）→ **前 4 卡右缘必须完整落在静止视口内**…
- 令牌侧真值：`apps/client/src/theme/design-variables.scss:546  --page-padding: 32rpx;`
  （台账引用的 :536 是行号漂移，现值为 :546）。全仓 `var(--page-padding)` 消费者实测 12 处 / 9 个文件
  （HomeHeader.vue:90、InviteBanner.vue:35、TodayLoveProgress.vue:105、MyCompletion/MyInteraction/MyMore/MyStats、
  MyStory.vue:172、CardDetailOverlay.vue:1548/1770/2110）——**页内层早就是 32rpx 一档，只有 AppShell 停在 28rpx**。
- 规范侧：`deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md` 的 gutter 口径 = `--page-padding=32rpx`
  （round-2 具名引用：`reports/audit/round-2/findings/VISUAL-WAVE2.json:177-178`「规范 §1.4 L83 --page-padding=32rpx」，处置=改走 `var(--page-padding)`）。
- `decisions-v33.md:36-40` 本文所引「-005 那条已经裁过 32rpx」——**仓内不存在 `MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-005`**：
  `grep -rn "APPSHELL-005" reports/ docs/doc specs/.zcode/tmp` = 0 命中；该族只有 `-001` 一行（`.zcode/tmp/allids.txt:7`）。
  即：§4 引的是一个不存在的行号，但**它引的值本身有在册出处**（上面台账「或调为 32rpx」+ 令牌 + 规范三处一致）。
  引证缺陷登记在下节，不构成值冲突。

### 2. MESSAGES-002（判据 vs 已生效裁定）

两条同名不同族的行，先分清命名空间（这一步不能省，否则 §3 的"冲突"会被读成两条不相干的判据）：
- 判据台（ops）里**没有** `MP-R2-PAGES-MESSAGES-INDEX-002` 这一行号；那个字符串只作为**锚点名**出现在
  `reports/audit/round-7/ops/PAGES-MESSAGES-INDEX.json:361`（用例 `id: "MSG31"`，title「滚到底最后一条不被自定义 tabBar 遮挡」），expected 列逐字：
  > "整页 padding-bottom 避让生效（MP-R2-PAGES-MESSAGES-INDEX-002：.messages-page padding-bottom calc(112rpx + env(safe-area-inset-bottom) + 16rpx)，与首页同口径）→ 最后一条完整可见、可点击，不被浮动 tabBar 覆盖；被遮即判 P2 复发；证据须含两个 rect 读数"
  这条是几何避让，与任何裁定都不撞；且盘上已满足：`apps/client/src/pages/messages/index.vue:636`
  逐字 `padding-bottom: calc(112rpx + env(safe-area-inset-bottom) + 16rpx);` ⇒ 无冲突、未动。
- 台账（VIS 族，decisions-v33 §3 真正描述的那条）`MP-R2VIS-PAGES-MESSAGES-INDEX-002`
  —— `reports/audit/round-6/issue-matrix.md:60`（`MP-R2-PAGES-MESSAGES-INDEX-002` 在该台账里 grep 命中数 = 0，
  所以 §3 少写 `VIS` 属误引，正文内容「组件 :16-32 与 zh-CN.ts:681-685」「mock 下不挂该组件」逐字对得上 VIS 这一行），处置列逐字：
  > 修：subtitle 改带插值的「附近有 {n} 位同频的你」，n 取游客可用的 /recommendations/people 计数；无数据时回退现有静态串。
  同 col9 已另记一句逐字：**「源码判点：副标恒取静态键 notLoggedWaiting.subtitle，不接任何游客计数（原判据按既有裁定作废）」**。
- 冲突的裁定（在册、生效中）两处原文：
  - `C:\Users\dsghy\.qoder-cn\projects\D--6------\memory\project-guest-feed-gate-intent.md`（2026-09-24 起，2026-09-29 06:20 扩权）：
    「游客**看不到**帖子广场是产品本意：未登录访问 feeds 时应被引导到注册/登录页，而不是看到公开内容」，
    且「content feeds must NOT be opened up for guests」的口径已被量成 26 组/239 行的落点账。
  - 代码内落档裁定：`apps/client/src/components/discover/NotLoggedWaiting.vue:19-35`（2026-09-25 store 接线收口）
    与 `apps/client/src/i18n/locales/zh-CN.ts:681-685`，两句都逐字写着「副标本就不含人数计数，subtitleWithCount 键两份都不落」。

### 3. village-publish-001

- 台账行 `MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001` —— `reports/audit/round-6/issue-matrix.md:169`，
  状态列：`未取证/需裁决（口径未定：提示元素与文案没有设计依据，两页字数阈值语义分歧属产品选择…）`，处置列逐字：
  > 人判：这条两半都不可静态判，需人先拍口径再定判点。前半要补的常驻图格上限提示至今没有定稿的元素与文案，
  > 两页图格区都只有一个加号块，超限只靠选满时弹的轻提示，产物里没有可比对的新载体。
  > 后半是两个阈值要不要取同一实现，本质是值相等比较…属未拍板。
  > 看哪段代码：constants/village.ts 第 18 与 27 行…、publish.vue 第 779 至 781 行与第 1071 行的预警类、post.vue 第 894 与 1450 行的超限类
- 复述处：`reports/audit/round-7/decisions-v33.md:61-63`（§7）「需要你定：字数阈值按哪一页的语义，以及提示文案以哪张设计稿为准」；
  `reports/audit/round-7/frame-verdicts.md:33` 判 `NOT_SHOOTABLE`；`reports/audit/round-7/ui-frame-debt-classes.md:69` 同口径。
- 设计侧漂移（"doc contradicts the mockups on this page"）：
  `deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:250`（§3.14 统一发布页）逐字：
  > **布局**：发布到选择器…→ 正文输入（**0/1000**）→ 添加话题 / 位置 / … → 图片九宫格 → 发帖小贴士 → 底部工具栏…
  而客户端实际：`constants/village.ts:18` 正文上限 500、store `:445` 同 500、`limits.ts:47` 的 1000 是无人读的死值、服务端 5000
  （同一读数记在 `reports/audit/round-7/round7-NOTES.md:3774`：「`limits.ts:47` 的 1000 是无人读的死值…`post.vue` 的 `--over` 因 `maxlength=500` 到不了」）。
  规范这句 0/1000 既与实现（500）矛盾，也与 `limits.ts` 的 1000 只对上死值 —— 这条判据要的"以哪张设计稿为准"因此没有可采信的单源。

## 盘上现状

- **改前** `apps/client/src/components/layout/AppShell.vue`（HEAD 与工作树一致）：
  :281 `.shell--standard{padding:0 28rpx}`、:289 `.shell--minimal{padding:0 28rpx}`、
  :298 `.shell__header{margin-bottom:28rpx}`（纵向）、:304 注释称吸顶按 28rpx 补偿、
  :310-311 `margin-left/right:-28rpx`、:312 吸顶行水平 padding `28rpx`。
  与令牌 `--page-padding:32rpx` 差 4rpx ⇒ 壳内正文基线与页内 `var(--page-padding)` 组件基线两套（circles 修复注释即为此证）。
- 跨文件耦合核查：全库 `grep -rn "\-28rpx" apps/client/src` = 3 处，除 AppShell 外只有
  `pages/register/index.vue:996`（`.field__tap--32` padding28+margin-28 自配平热区）与 :1230（`.agree__hit` 同型），
  两者都是「padding 与等量负 margin 自抵消」的触控热区，**与 AppShell gutter 无耦合**，且该页不挂 AppShell（grep 0 命中）⇒ 不动。
  `grep -rn "shell--standard|shell--minimal" apps/client/src` 除 AppShell 自身外只有 circles 的一处注释（见下）。
- MESSAGES-002：实现侧已按裁定落定 —— `NotLoggedWaiting.vue:54` 恒取静态 `notLoggedWaiting.subtitle`，
  `zh-CN.ts:686 "subtitle": "发现更多同频的人"`，无 `subtitleWithCount` 键；
  `pages/messages/index.vue:374` 的挂载条件是 `v-if="!sessionStore.isLoggedIn && !useMock()"` ⇒ **mock 档整页不挂该组件**，
  与 decisions-v33 §3 的记载逐字对得上。
- village-publish-001：`publish.vue:794` 图格区在 `images.length < POST_MAX_IMAGES` 时才渲染「＋」块，
  超限反馈只有 `publish.vue:254-255` 的 `uni.showToast`（选满即 toast）；:785-795 区间**无常驻上限提示元素**。
  文件里现存的 `.publish-tip`（:873-883，样式 :1126-1131）是「发帖小贴士」可关闭引导卡（文案「真实分享校园生活，友善互动…」），
  规范 §3.14 也把它单列为「发帖小贴士」，**不是**判据前半点名的"图格上限提示"，不能拿来当它的载体交差。
  正文侧 :779 起是「剩 50 字内变警示色」的预警类，post.vue :894/:1450 是「超限才变红」的超限类 ⇒ 两页语义确实不同。

## 能补的

已按判据落实现（只动实现，判据一字未改）：

1. `apps/client/src/components/layout/AppShell.vue` 水平 gutter 28rpx → **32rpx**（判据半句「或调为 32rpx」，= `--page-padding` 实值）：
   - :283 `.shell--standard { padding: 0 32rpx; }`
   - :291 `.shell--minimal { padding: 0 32rpx; }`
   - 耦合项（同批改，避免 lone-32-with--28 的新 bug）：
     :313 `margin-left: -32rpx;`、:314 `margin-right: -32rpx;`、:315 吸顶行水平 padding `32rpx`、:306 注释同步为 32rpx 并写明"负边距必须与 gutter 同数"
   - :280-281 补该 ID 的修复注释（与 circles 页内侧同族做法）
   - **刻意不动**：:300 `margin-bottom: 28rpx`（头部与正文的纵向节奏值，判据只点水平内边距，无任何依据要求它变 32；
     改了就是无判据的视觉变更）；`.shell--immersive{padding:0}` 无水平值。
2. `apps/client/src/subpackages/circles/circles/index.vue:485-492` 注释纠偏：原句逐字写着「`.shell--standard` 已提供 **28rpx** 水平内边距」，
   改后为假事实 ⇒ 改写为"单源 32rpx（= --page-padding）"，并把理想图读数（卡框左缘约 25rpx / 副标题与首枚 chip 约 37rpx）
   与两个候选值的关系如实写成"落在两点之间"，不假装理想图背书 32rpx。该行的 ID 锚点保留（`land-comment-sweep-rows.mjs:35` 要它）。

未补（不是冲突，是射程外/需别的车道）：判据前半的另一半「页内层水平 padding 归零」仍只落了 circles 一枚，
台账自己列了其余 7 个载体（`circles`/`activities`/`feedback history`/`recommend-pref`/`feedback`/`help`/`security`，
见 `.zcode/tmp/lane-recheck/rows.json:31` 的实测清单），那是跨 7 页的批量刀，与本条值冲突无关，本车道不夹带。

## 必须上交的

| id | 上交原因 | 两条读数 |
|---|---|---|
| `MP-R2VIS-PAGES-MESSAGES-INDEX-002` | 判据与**已生效裁定**正面相撞，动哪边都有代价，按纪律不自选、不改行为、不改判据 | 判据侧（`issue-matrix.md:60`）：副标要显示游客可用的 `/recommendations/people` 计数 `附近有 {n} 位同频的你`。裁定侧（guest-feed-gate memory + `NotLoggedWaiting.vue:19-35` + `zh-CN.ts:681-685`）：游客不得接触内容流、必须被引导到登录/注册，且游客态没有语义正确的计数真源（mock 池固定 9 条演示人格、real 被 `GUEST_LIST_LIMIT=30` 截断、`discover.cards` 在两个宿主从不触发、理想图副标 12 与同图 6 个头像自相矛盾）。<br>按判据做 ⇒ 把推荐流计数暴露给游客，直接违反 2026-09-24/29 的在册裁定，并把「宁缺不展示伪造社交证明」（`MP-R2-CIRCLES-INDEX-002`）判为可违例；且 `pages/messages/index.vue:374` 的 `!useMock()` 门使该断言在 mock 档恒不可测。<br>按裁定做 ⇒ 判据 col11 那句永久判不了，台账得由人来改口径。**盘上现状已经是裁定那一侧**，本车道未改一行行为。附带请一并裁掉 `decisions-v33.md:31` 的引号歧义：§3 写的行号少了 `VIS`，而 `MP-R2-PAGES-MESSAGES-INDEX-002` 这个名字在盘上只作为 ops 用例 `MSG31`（`PAGES-MESSAGES-INDEX.json:361`）里的锚点出现、讲的是 padding-bottom 避让（那条已被 `messages/index.vue:636` 满足），两套读法同名不同事，下一轮复验员极易把冲突安到避让行上。 |
| `MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-005`（引证缺陷，非值冲突） | `decisions-v33.md:37-39` 两处引用的这一行**在盘上不存在**（全库 0 命中）；§4 的 A/B 选项把裁定挂在一个空号上 | 值本身可采信（台账 -001「或调为 32rpx」+ `--page-padding:32rpx` + 规范 §1.4 三源一致，无反面裁定 ⇒ 已按判据补齐实现）；但请把这行的真实出处补进台账，否则下一轮复验员仍只能"信 decisions 的一句话"。另：本条整行仍未结案（"页内层归零"的另一半跨 7 页），`decisions-v33.md:40` 记的"停在原地"只算值这一半已解。 |
| `MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001` | 唯一拦路的是**没有设计依据**，不是缺一个可补的物件；不自创文案、不自选阈值 | 前半：判据要"常驻图格上限提示"，但规范 §3.14（`全站设计规范与逐页设计稿说明.md:250`）给这一页的清单只有「图片九宫格 → 发帖小贴士」，没有上限提示这一元素，也没有它的文案；现存 `.publish-tip` 是小贴士（:873-883），不是上限提示，顶包会把两条判据同时判脏。补它需要一个设计源（哪张稿、哪句文案）。<br>后半：`village/publish.vue:779`（剩 50 字预警）与 `post.vue:894/1450`（超限变红）是两个不同语义，且规范 §3.14 写「正文输入（0/1000）」、实现是 500、`limits.ts:47` 的 1000 无人读、服务端 5000 —— 四个数并存，"按哪一页语义"必须先拍。<br>纪律：这一条我一行代码都没动，因为无论补元素还是统一阈值都是造判据没有的东西。 |

## 基线与差值

| 项 | 改前（HEAD/工作树基线，实测） | 改后（实测） | 差值 |
|---|---|---|---|
| `pnpm typecheck`（vue-tsc --noEmit，Node 22） | exit 0 | exit 0 | 0 |
| `pnpm test`（`vitest run --config vitest.config.ts`） | **121 files / 1356 tests passed**（210.37s） | **121 files / 1356 tests passed**（173.48s，exit 0） | 0 文件 / 0 用例，无丢失 |
| `node scripts/qa/verify-source-shape.mjs` | `SRC_SHAPE total=99 成立=99 不成立=0 补丁=182（守恒：yes）`、`CRIT 判据台行=8 成立=8 未裁半句=1`、`NEG 注入点=42 已变红=42 咬不动=0`、`RESULT=OK`，exit 0 | 逐字一致：`total=99 成立=99 不成立=0`、`RESULT=OK`，exit 0 | 0 条谓词状态变化 |

两条与主控给的基线不一致，先说明不是本车道造成的：
- 主控记 119 files / 1335 tests；我在**动码之前**跑到的 HEAD 是 **121 / 1356**（+2 文件 / +21 用例），
  增量来自并行车道（#10-b LG31、#10-c/#10-d 载具线）落在同一工作树；本车道不 stage、不 revert，故以自测基线为对照面。
- `verify-source-shape` 的条目数从 token-rulings 车道的 98 变成 99（`token-rulings-report.md:0` 记的是他们那一次），
  同样是并行新增；改前后都由同一份工作树给出，可比。
- 该门里唯一含 `32rpx` 字面量的谓词是 `scripts/qa/verify-source-shape.mjs:55`，被测文件是
  `components/profile/NotLoggedProfile.vue`（断言 `calc(var(--statusbar, …`），**与本改动无交集**；
  全门 grep `28rpx|page-padding|AppShell|layout/AppShell` = 0 命中 ⇒ 没有静态谓词钉住 AppShell 的旧字面量。
- 未跑、也不归本车道：`verify-band-freshness`（本车道按硬约束**没有重建** `apps/client/dist/**`，
  源码新、产物旧 ⇒ 它必红，这是主控的重建模，不是缺陷）；`run-final-verify-v33.sh` / `emit-round-report.mjs` 未跑（禁项）。

## 读数

逐条原样粘贴（Node `v22.17.0`，PATH 前置 `/d/codex-tools/node-v22.17.0-win-x64`）：

**typecheck**（`cd apps/client && pnpm typecheck` = `vue-tsc --noEmit`）
- 改前：`$ vue-tsc --noEmit` → `TYPECHECK_EXIT=0`
- 改后：`$ vue-tsc --noEmit` → `TYPECHECK_EXIT=0`

**client 单测**（`apps/client/package.json`：`test` = `vitest run --config vitest.config.ts`）
- 改前基线：`Test Files 121 passed (121)` / `Tests 1356 passed (1356)` / `Duration 210.37s`，exit 0
- 改后：`Test Files 121 passed (121)` / `Tests 1356 passed (1356)` / `Duration 173.48s`，`TEST_EXIT=0`
- 差值 0 文件 / 0 用例，无丢失（本车道未新增用例：改动是 4 个字面量与 2 段注释，无可断言的行为面）
- 注：主控记的 119/1335 是我进场前的 HEAD 面；+2 文件/+21 用例来自并行车道 #10-b、#10-d 已落的改动，非本车道。

**源码形态门**（`node scripts/qa/verify-source-shape.mjs`；改前 / 改后各跑一次，终态再复跑一次）
- 改前：`SRC_SHAPE total=99 成立=99 不成立=0 补丁=182（守恒：yes）`、`SRC_SHAPE_CRIT 判据台行=8 成立=8 不成立=0 未裁半句=1`、`SRC_SHAPE_NEG 注入点=42 已变红=42 咬不动=0 没挂负例的判据行=0`、`SRC_SHAPE_RESULT=OK`，exit 0
- 改后（含 circles 注释纠偏的终态）：同上逐字一致，`SRC_SHAPE_RESULT=OK`，exit 0
- 该门全文 grep `28rpx|32rpx|page-padding|AppShell` 只有 1 处含 `32rpx` 的谓词（`:55`，被测文件 `NotLoggedProfile.vue`），没有任何静态谓词钉住 AppShell 的旧字面量 ⇒ 本改动不会静默打断静态判点
- 提醒：`scripts/qa/verify-source-shape.mjs` 在我进场时已被 #10-b 车道改脏（`git status` 可见，非本车道所为），所以门自己的条目数会随并行车道浮动，99 是本轮两次读数的共同面

**未跑 / 不归本车道**
- `verify-band-freshness`：按硬约束**未重建** `apps/client/dist/**`（未跑任何 build），源码新、产物旧 ⇒ 该门现在必红。这是主控的重建模，**不是本车道要修的东西**，也不该由我用重建去"修绿"。
- `run-final-verify-v33.sh`、`emit-round-report.mjs`：禁项，未跑。设备/DevTools 未碰（UI 租约在主控）。

**改动面（git status 逐条，未 stage）**
```
M apps/client/src/components/layout/AppShell.vue
 M apps/client/src/subpackages/circles/circles/index.vue
?? reports/audit/round-7/token-conflicts-r10e.md
```
`reports/audit/round-7/ops/**`、`apps/client/dist/**` 本车道零改动（只读引用）。

TOKENCONF_RESULT=PARTIAL changed=apps/client/src/components/layout/AppShell.vue:280-291,306-315;apps/client/src/subpackages/circles/circles/index.vue:485-492 handed_back=MP-R2VIS-PAGES-MESSAGES-INDEX-002,MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001,MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-005(引证缺陷) typecheck=0 tests=121files/1356->121files/1356 src_shape=OK(99/99)->OK(99/99)

