# R1 需求对照（A4）· subpackages/discover-extra/discover/matching「匹配中」

- 审查人：需求对照审查员-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING（A4）
- 日期：2026-09-24 · 轮次：R1 · 仓库证据基线 gitSha：aefd8a72（exec-results.json `gitSha` 字段 = 当前 HEAD aefd8a72，已核对）
- 方法：沿「需求/理想设计 → 页面 → 组件 → 行为 → 验收条件」逐条核对；只读代码与既有执行证据，未改动代码、未运行开发者工具。
- 本轮静态截图：0 张（visual 审查员已以 MP-R1-MATCHING-101 记 P1 MiniProgram，本文件不重复立项）；本页真实渲染证据取同批次交互截图 MT01/MT04/MT24（mtime 2026-09-23，exec-results.json 有对应条目）。

## 基线与裁决链

| 依据 | 内容 | 效力 |
| --- | --- | --- |
| 素材/理想效果图/匹配中页面.png | 标题「正在寻找有缘的Ta...」→副标题→双头像+爱心+轨道→匹配度进度卡（90/85/80/79%）→总进度 89%；右上跳过；左上返回 | 页面级理想稿（视觉形态） |
| git show 29a2b1df:docs/design/v3.1-contract.md §12（冻结） | 「匹配中进度为视觉模拟（"正在寻找适合你的 TA ● ● ●"），**不显示虚假算法百分比**」 | **冻结需求，优先于理想稿**（理想稿中的百分比数字被此条明令否定） |
| 同上 §19 行 07（:162） | 07 匹配中｜视觉进度→候选卡→❤️/×/取消｜MatchingProgress / MatchActionButton｜次数用尽/看完=空态；取消=返回｜喜欢=like/单向已送出/互喜→成功；跳过=pass｜recommendations / like / pass | 冻结页面职责与验收 |
| 同上 §0/§6/§11 | 匹配=Intent（系统帮我找）；单向喜欢文案「已送出心动」；匹配中心展示「今日剩余 N 次」 | 冻结 |
| 素材/SVG素材核查与补充报告.md §2.4（:115） | 双环/爱心/雷达/进度条/跳过胶囊素材在库；4 个匹配度彩色图标缺失（实现已用吉祥物星/音符/闪光/萌芽图片替代，风格近似） | 素材层参考 |

## 需求目标（target）与逐条核对

### T1 主视觉：匹配中「视觉进度」，文案「正在寻找适合你的TA」，不显示虚假算法百分比（§12 + ask 目标行）

- **current**：视觉进度存在（MatchLoading.vue：涟漪 :223-252、轨道环 :447-497、心形动画 :440-444、漂浮爱心 :157-177），形态与理想稿一致。但：
  - 标题硬编码中文「正在寻找有缘的Ta...」（MatchLoading.vue:109，未走 i18n）——与理想稿一致，但 **≠ 冻结文案**「正在寻找适合你的 TA ● ● ●」；契约文案已备于 i18n `matching.searching`（zh-CN.ts:444「正在寻找适合你的 TA」、:445 searchingDesc）但**全仓 0 引用**（grep `matching.searching` 于 src 非 i18n 文件无命中）。
  - **虚假算法百分比照常渲染**：四维 90/85/80/79 为写死常量（MatchLoading.vue:49-55 `PROGRESS`），总进度 = 四项均值+5 = 89%（:58），以「匹配度 {n}%」「缘分匹配中... {n}%」渲染（:123、:129；zh-CN.ts:438-439）。执行证据：MT01 observed `dom: .match-loading__progress:present .match-loading__total:present`；MT01-after.png 实拍可见「匹配度 90%/85%/80%/79%」「缘分匹配中... 89%」。
- **gap**：违反冻结条款 §12（display 禁止展示的伪造算法输出），且冻结文案键未接线。视觉审查员 MP-R1-MATCHING-104（Consistency P3）、代码审查员 MP-R1-MATCHING-004（Consistency P3）已登记同一事实的较低定性；按本轮需求对照标准（需求违规不得降级为视觉/一致性小项）在 req 文件重定性为 Function P2（MP-R1-MATCHING-REQ-01），修复时可三合一。
- **fix**：删除 PROGRESS/totalPercent 的数字渲染（改无数值动效条或纯视觉律动）；标题改 `t("matching.searching")` + 动态省略号/● ● ●；清理或移葬 `matching.matchRate/totalProgress/dimX` 死键（zh/en 同步）。

### T2 视觉进度 → 候选卡 → CTA ❤️/×/取消（§19 行 07 + ask 目标行）

- **current**：本页为**纯过渡页**——模板仅「返回箭头（matching.vue:222）+ MatchLoading（:225-231）」两节点；onLoad 即提交 `runMatchCheck()`（:157-159），2.6s 动画兜底后由 watch 自动分流（:63-83）：matched→redirectToSuccess、idle→Toast+400ms goBack、failed→Toast+600ms goBack。**无候选卡、无 ❤️/×/取消 任一 CTA**。❤️/× 实际位于寻觅中心页卡片（pages/discover/index.vue:314 MatchCard、:323 MatchActions；MatchActions.vue emit pass/like/superLike），且在**进入本页之前**已完成——流程顺序与契约行 07 相反（契约：进度→选卡→动作；实现：选卡→动作→进度动画→结果）。「取消匹配」无任何控件：i18n `matching.cancel`「取消匹配」（zh-CN.ts:446）、`matching.backToHub`「返回匹配中心」（:455）均已备且全仓 0 引用。另：契约行 07 行为列「跳过=pass」——本页「跳过」实为快进动画/返回双语义（matching.vue:198-209），≠ pass（pass 在中心卡 × 键）。
- **gap**：页面职责与冻结契约 §19 行 07 结构性分歧（含 §0「匹配=Intent、发现=Browse 严格切分」在实现中合并进寻觅中心）。取消的**能力**存在（‹ 返回 goBack→寻觅中心，:54-61；MT07/MT08 EXECUTED；无上下文深链 200ms 兜底返回不留死页，:143-147，MT06 EXECUTED），但**语义控件**缺失。此为架构分歧而非单点功能缺失，故定 Architecture P2（MP-R1-MATCHING-REQ-02），须产品裁决：改码（本页落候选卡+MatchActionButton+取消）或先修契约（契约自身规则：任何页面改动必须先改本文档）。
- **fix**：路线 A（按契约）：动画结束后落候选卡 + MatchActionButton（❤️/×）+「取消匹配」钮，配额/看完空态接入 `matching.loadFailed`/`backToHub`。路线 B（维持现架构）：修订 v3.1-contract §19 行 07/§0 为「寻觅中心选卡 → 匹配确认过渡页 → 结果」，删除或移葬 cancel/backToHub 死键，‹ 返回钮补「取消匹配、返回匹配中心」aria 语义。

### T3 状态：次数用尽 / 看完 = 空态（§19 行 07 + ask 目标行）

- **current**：本页无任何空态分支（无上下文直达走 200ms 兜底返回，:143-147，MT06 EXECUTED；深链参数不齐同兜底，MT23 EXECUTED）。空态托管于寻觅中心页：`quotaExhausted`→「今日次数已用完…」、看完→`emptyTitle`（discover/index.vue:70-78 空态文案计算，:304-308 EmptyState 渲染）；且配额门控使「次数用尽还能进入本页」在正常入口被前置拦截（discover/index.vue:124-127、:154-157 Toast 拦截）。i18n `matching.loadFailed`「暂时没有找到合适的人」（zh-CN.ts:450）已备 0 引用。
- **gap**：需求能力在流程层存在（中心页空态+门控），但契约行 07 归属的「本页空态」不存在；属 T2 同一架构分歧的另一面，并入 MP-R1-MATCHING-REQ-02 记录，不单独立项（不构成产品级功能缺失）。
- **fix**：随 T2 路线 A/B 一并裁决。

### T4 行为：喜欢=like / 单向已送出 / 互喜→成功（§19 行 07 行为列）

- **current**：互喜→成功：status=matched 时 redirectTo match-success（matching.vue:67-69；stores/match.ts:42-68 状态机、:59 `result?.matched ? "matched" : "idle"`）——代码层完整，执行层 MT03 critical **navError=timeout、after 截图失败**，未获机证。单向已送出：Toast 文案用 `t("discover.likeSent")`=「**已喜欢**」（matching.vue:73；zh-CN.ts:923），**≠ 冻结文案「已送出心动」**（§6/§12；`matching.crushSent` zh-CN.ts:447 已备 0 引用）——discover-req 审查员已以 MP-R1-PAGES-DISCOVER-INDEX-REQ-05（Consistency P3）跨页立项，本文件引用不重复。执行层 MT02 critical **FAILED**（action-not-performed，候选元素「按」不存在），单向喜欢全链路本轮无机证。
- **gap**：文案违约（REQ-05 已跟踪）+ 关键行为无执行证据（并入 MP-R1-MATCHING-REQ-03）。
- **fix**：Toast 改 `matching.crushSent`（随 REQ-05 修复）；重跑 MT02/MT03（见 REQ-03 fix）。

### T5 取消返回匹配中心（ask 目标行）

- **current**：‹ 返回（72rpx 圆钮，matching.vue:222，role=button+aria-label t('common.back')）：栈>1 navigateBack、栈=1 switchTab 回寻觅 tab（:54-61）。寻觅 tab 即实现中的「匹配中心」承载页。MT07（navigateBack 回来源页）、MT08（深链空栈 switchTab 落寻觅）均 EXECUTED。**满足**；仅差「取消匹配」语义命名（归入 T2/REQ-02）。
- **gap**：无（能力满足）；热区 72×72rpx < 88rpx 铁律为另一维度，视觉审查员 MP-R1-MATCHING-105 + MT13 已记，不重复。
- **fix**：—（aria 文案可随 REQ-02 路线 B 补「返回匹配中心」）。

## PageCompare · structureNotes（L1–L10）

- **L1 页面组成**：理想稿 = 返回‹+跳过+标题+副标题+双头像+心+轨道+进度卡+总进度；实现 = 同组成但「头像区在标题上方」（顺序对调，视觉 103 已记 P3）。**契约行 07 要求的「候选卡→❤️/×/取消」段整体不存在**（本页为过渡页）——L1 存在需求级偏差。
- **L2 布局层级**：模板顺序 头像区(:79-107)→标题(:109)→副标题(:110)→进度卡(:113-125)→总进度(:128-133)；理想稿 标题→副标题→头像→进度卡→总进度。偏差已由 103 跟踪。
- **L3 组件形态**：双头像+中央渐变心+涟漪+轨道环与理想稿对应组件一一在库；跳过钮实心绿胶囊 vs 理想白底描边（106 已记 P4）；无候选卡/CTA 组件挂载。
- **L4 内容/文案**：副标题「分析彼此兴趣，缘分匹配中」、进度卡标题、四维标签与理想稿一致；标题硬编码「正在寻找有缘的Ta...」= 理想稿但 ≠ 冻结 §12 文案；**90/85/80/79/89% 与理想稿数字一致但被 §12 明令禁止展示** → L4 需求级不达标项（REQ-01）。
- **L5 尺寸/间距**：本轮静态基线 0 张（101），仅 373×820 交互截图，不做像素判定，留待补拍。
- **L6 色彩/token**：品牌绿用 `rgba(54,201,154,…)`/`var(--c-brand,#36C99A)` 字面量（MatchLoading.vue:153,188,393,402,435 等 15+ 处），≠ v3.1 冻结 Primary `#34C98A`（代码 005 已记 P3）。
- **L7 图标/素材**：四维图标以 mascot STAR/MUSIC/SPARKLE/SPROUT 图片替代（:50-54），§2.4 登记的彩色图标缺失已用替代实现兜底，风格近似；装饰爱心用 HEART_PINK_LARGE/HEART_GREEN 图片替代理想稿半透明粉爱心。
- **L8 动效**：涟漪×5(:235-239)、轨道双向旋转(:487-497)、心形缩放(:440-444)、爱心浮动(:174-177)；2.6s 兜底 finish（:39-41，MT18 noop 弱证据）；「跳过=快进」设计存在但 MT09/10 FAILED 未获机证。
- **L9 状态/空态**：无 loading 失败态/空态分支（空态在中心页）；preview=1/dev-preview=1 两个 QA 态在库（:92-126，MT01/MT14 EXECUTED）；onUnload 无条件复位状态机（:214-216，MP-R2-MATCHING-007，MT19 EXECUTED）。
- **L10 可达性/热区**：返回钮有 role=button+aria-label（:222）；跳过钮**无 role/aria-label**（MatchLoading.vue:74-76）；两可点元素热区 <88rpx（105 + MT13「预期不达标」已记）。

## PageCompare · usageNotes（理想 vs 实际操作路径）

- **理想路径（契约行 07）**：匹配中心开始 → 匹配中视觉进度（可取消/跳过=pass）→ 候选卡 → ❤️/× → 互喜→成功页 / 单向→已送出 → 返回匹配中心。
- **实际路径**：寻觅 tab 浏览卡（×/打招呼/❤️ 三键）→ 点❤️/打招呼 → 本页 2.6s 动画（期间自动提交匹配确认，用户无事可做）→ matched 自动进 match-success；单向成功 Toast「已喜欢」后自动返回寻觅并切下一张（consumeCardFromDeck :171-181）；失败 Toast 后返回。返回‹ 任意时刻可离开（栈=1 深链落寻觅 tab）。
- **核心任务可完成**：表达喜欢→得知结果→回到中心，全链路可用；任意时刻 1 步回 tab（‹ 一击，MT07/08 机证），满足「2 步内回 tab」。
- **迷路/体验风险点**：①「跳过」首次点击=快进动画、再次=离开（:198-209），语义与「跳过=pass」契约语义冲突且无提示；②动画期间展示假百分比 90/85/80/79/89%，用户会误读为真实算法结果；③无「取消匹配」明确控件，取消意图只能靠 ‹ 迁移。
- **执行取证缺口**：24 项中 7 FAILED 全部 action-not-performed、5 项 after 截图 timeout——单向喜欢 Toast→返回切卡（MT02 critical）、互喜→成功页跳转（MT03 critical）、superLike 路径（MT05）、跳过双语义（MT09/10）、连点防抖（MT11/12）、检查前退出竞态（MT20）、500ms 反馈铁律（MT21）本轮**均未获执行层证实**；且全部用例 pre:login A/B 双身份均解析为 userId=user-1001 并标 `MISMATCH!`，双身份证据可信度受损（与 discover-req DC21 记录的 harness 瑕疵同源）。

## MT01–MT24 执行取证摘要（reports/audit/round-1/interact/exec-results.json，manifest=SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING）

| ID | tier | status | 要点 |
| --- | --- | --- | --- |
| MT01 | normal | EXECUTED | dev-preview 停留本页；dom 证实 skip/avatars/**progress**/**total** 均渲染（假百分比在屏证据） |
| MT02 | critical | **FAILED** | 单向喜欢全链路：action-not-performed（`__CAND__("按")` 元素不存在），无动作执行 |
| MT03 | critical | EXECUTED | 互喜→match-success：navError=timeout，after 截图失败；跳转未获机证 |
| MT04 | critical | EXECUTED | failed 分支 Toast→返回（observe-only，dom 断言 absent） |
| MT05 | critical | EXECUTED | superLike 路径：after 截图 timeout，机证弱 |
| MT06 | navigation | EXECUTED | 无上下文直达 200ms 兜底返回，不留死页 ✅ |
| MT07/MT08 | navigation | EXECUTED | ‹ 返回：navigateBack / 空栈 switchTab 落寻觅 ✅ |
| MT09–MT12 | normal | **FAILED** | 跳过快进/返回/连点×5、返回连点×5：element not found（automator 动画结束后已落 discover 页） |
| MT13 | normal | EXECUTED | 热区核查：back 72rpx、skip≈64rpx——「预期不达标」（105 已立项） |
| MT14 | normal | EXECUTED | preview=1 零副作用停留 ✅（after 截图 timeout） |
| MT15 | critical | EXECUTED | URL 三参直达真实发起匹配（observe-only；after 截图 timeout） |
| MT16 | normal | EXECUTED | 头像兜底链 DEFAULT_AVATAR（代码层 MP-R2-MATCHING-002 已修，002 号机证） |
| MT17/MT18 | noop | EXECUTED | 滚动/动画完备性：noop 弱证据 |
| MT19 | normal | EXECUTED | 重复进出状态机复位（MP-R2-MATCHING-007）✅（navErr 噪声在案） |
| MT20 | navigation | **FAILED** | 检查前退出竞态：element not found，未执行 |
| MT21 | normal | **FAILED** | 500ms 反馈铁律扫描：element not found，未执行 |
| MT22 | navigation | EXECUTED | ?target= 不被读取→兜底返回（101 号缺截图根因） |
| MT23 | normal | EXECUTED | 深链参数不齐兜底返回 ✅ |
| MT24 | normal | EXECUTED | 双身份结构一致（A/B 身份解析 MISMATCH 见上） |

## 与其他审查员产出的去重关系

- 视觉审查员（findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json）：101 缺静态截图（P1 MiniProgram）、102 跳过叠压标题（P2 UI）、103 结构顺序（P3 UI）、104 假百分比（P3 Consistency）、105 热区（P3 Interaction）、106 跳过样式（P4 UI）——本文件不重复立项，REQ-01 对 104 做需求级重定性。
- 代码审查员（code-findings/同名文件）：001/002/003 回归核对、004 标题硬编码 i18n 残留（P3）、005 token 字面量（P3）、006 死数据（P4）、007 重复 goBack（P3）——不重复。
- discover-req 审查员：REQ-03 配额展示缺失、REQ-05「已喜欢」文案违约（点名 matching 页成功分支）——本页引用 REQ-05，不重复立项。

## verdict

**不达标（需求符合性）**。理由：L1 存在需求级偏差（契约 §19 行 07 的「候选卡→❤️/×/取消」页面形态未实现，页为纯过渡页）；L4 展示冻结条款 §12 明令禁止的虚假算法百分比、冻结文案「正在寻找适合你的 TA」已备未接。核心链路功能本身可用（喜欢→结果→回中心，1 步回 tab），但关键路径执行取证 7 FAILED + 5 截图 timeout 未闭合，需求验收无法以机证收口。
