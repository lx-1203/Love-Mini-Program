# R1 需求与功能目标对照 · pages/discover/index（寻觅，tabBar）

- 审查员：A4 需求对照员（与视觉审查员分文件；本文件 = 需求/功能视角）
- 轮次：R1 · 执行基线 sha：aefd8a72（exec-results.json `round: R1, gitSha: aefd8a72`）
- 理想依据：`素材/理想效果图/寻觅匹配卡片页面.png`（唯一页面级对照图，已逐要素目视核对）＋ `reports/audit/baseline/ideal-baseline.md:86`（§3 页面行：理想结构要点）＋ Token 裁决链 `git show 29a2b1df:docs/design/v3.1-contract.md`（Primary #34C98A / Love #FF6FA3 / Whisper #4D8DFF；§6:56、§12:96 文案冻结）
- 执行证据：`reports/audit/round-1/interact/exec-results.json`（DC01–DC44，44 条，其中 FAILED 15 条多为取证脚本选择器/导航错误，逐条甄别见 §4）
- 截图证据：`reports/screenshots/round-1-tour/A/pages_discover_index__默认.png`（静态 1 张，本次已目视+像素测量）；`reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-*.png`（交互序列，本次抽验 2/15 两张并做像素采样）
- 源码：`apps/client/src/pages/discover/index.vue`（513 行全文）、`components/match/MatchCard.vue`、`components/match/MatchInfo.vue`、`components/match/MatchActions.vue`、`components/common/swipe/SwipeContainer.vue`+`SwipeGesture.ts`、`constants/match.ts`、`components/discover/FilterDrawer.vue`、`stores/discover/index.ts`、`custom-tab-bar/index.{js,wxml,wxss}`、`guards/campus-gate.ts`、`subpackages/discover-extra/discover/matching.vue`

---

## 1. 应该具备什么功能（target，源自 ideal-baseline.md:86 + 理想图 + 本次 ask）

| # | 功能目标 | 判定 |
|---|---|---|
| T1 | 沉浸式大图卡 ≥70% 视口（match-card-hero 800×1280 兜底图） | ❌ 实测 53.9%（REQ-04） |
| T2 | 顶部「寻觅♥ + 推荐/附近分段 + 筛选 + 右侧空心收藏心形入口」 | ⚠️ 前三项 ✅，收藏入口缺失（REQ-02） |
| T3 | 卡信息位：黑色渐变蒙层直接叠信息（禁白色资料卡）；左上白底粉字距离 chip；右上白底绿点绿字在线徽标 | ✅（MatchCard.vue:144-207；tour 截图像素验证白底） |
| T4 | 信息顺序：姓名+年龄+性别符 → 学校·年级 → 距离·在线 → 兴趣标签 → 带大引号 bio | ✅（MatchInfo.vue:50-90；性别符 R13 待修项已落地） |
| T5 | 匹配度 = 右下角绿色环形进度（细环+中心 %+「匹配度」，SVG stroke-dasharray；禁 conic-gradient 版 XunmiMatchRing） | ❌ 实心粉圆（REQ-01） |
| T6 | CTA：喜欢（粉）/超级喜欢·打招呼/跳过 + 左右滑手势 | ✅ 按钮+手势齐备（布局为横排=理想图；baseline 文本「右侧竖向」与理想图矛盾，以图为准，见 §3 L3） |
| T7 | 配额「今日剩余 N 次」展示 | ❌ 页面无任何配额展示（REQ-03） |
| T8 | 底部五 Tab 中央凸起寻觅 | ✅（custom-tab-bar/index.js:59-65 prominent:true；pages.json:390-392 custom:true） |
| T9 | 状态：配额用尽空态 / 推荐空态 / 附近空态 / 匹配关闭态 / 错误横幅+重试 / 骨架屏 | ✅ 代码齐备（index.vue:69-78,288-310）；空态文案仅部分取得机证（§4） |
| T10 | 门控：未登录点喜欢/打招呼→登录 Toast；未实名→实名引导弹窗；配额用尽→拦截 Toast；打招呼 3 次/卡/日频控 | ✅ 代码齐备（index.vue:80-84,119-134,142-179 + campus-gate.ts:72-93）；机证 DC20 ✅，DC21/DC23 未取得有效机证（§4） |

---

## 2. PageCompare · structureNotes（L1–L10 逐级）

- **L1 页面结构**：标题区（寻觅♥+筛选）→ 分段（推荐/附近）→ 大图卡 → 底部 CTA 行 → 五 Tab，纵向次序与理想图一致 ✅。**但卡高比例偏差**：`match-card-area` 固定 `height: 880rpx`（index.vue:480-483），对 tour 静态截图（375×820）做行扫描实测卡片占视口 **53.9%**（y≈150→592，442px/820px），低于理想「≥70% 视口」。→ **L1 偏差，不达标**（REQ-04）。
- **L2 信息层级**：卡内自上而下 姓名+年龄+性别符 → 学校·学院（含「·」分隔）→ 距离·在线 → 4 枚兴趣标签 → ❝引号 bio，与理想图一致 ✅（MatchInfo.vue:50-90）。性别符已渲染：female=#FF6B81 圆底/ Male=#54A0FF（MatchInfo.vue:120-143），资产在盘（`static/assets/icons/emoji/gender-{female,male}.svg`），tour 截图「林晓 21 ♀」可见 —— **R13「性别符未渲染」待修项已清偿** ✅。增项：姓名行多一枚认证绿勾（理想图无），轻微，不立案。
- **L3 交互位置**：筛选右上 ✅；推荐/附近分段+粉色下划线 ✅，且为页内切换（index.vue:96-101，附近=本地 ≤20km 过滤+同校→近远排序，`stores/discover/utils.ts` filterNearby/sortNearbyFirst），交互截图 15 实证附近分段出卡（0.5km·今天活跃）✅。CTA 位于卡下横排三键 —— 理想图即横排（跳过/打个招呼/喜欢），实现一致 ✅；baseline:86 文本「右侧竖向操作列」与理想图自相矛盾，按 ask「理想图为唯一页面级对照依据」以图为准，**不立案**。**收藏心形入口缺位**（tabs 行右侧空白）→ REQ-02。卡片点击→他人主页 ✅（DC16 机证 tap .match-card）。
- **L4 卡片/组件形态**：黑色渐变蒙层直接叠信息、无白色资料卡 ✅（MatchCard.vue:144-157，62% 高渐变）。距离 chip 白底(rgba(255,255,255,.92))粉字(#FF6B81) ✅、在线徽标白底+绿点+绿字 ✅（MatchCard.vue:159-207；tour 截图主色占比 55.9% 白 ✅）。**匹配度=实心粉圆（linear-gradient #FF6B81→#FF8DA1 圆盘+内圈暗圆），非绿色细环、非 SVG stroke-dasharray、无按分数的进度弧**（MatchCard.vue:91-102,209-257）→ **L4 偏差，不达标**（REQ-01；R13-ACCEPTANCE §7 已裁决「成立但未修」，ideal-baseline.md:21）。
- **L5 颜色**：组件硬编码粉 #FF6B81 / 绿 #36C99A，与 v3.1 冻结 Love #FF6FA3 / Primary #34C98A 存在全局色值漂移（tokens.scss:21 主色注释即 #36C99A）；属细节层不作门槛，记录备 L5 统一裁决。
- **L6 字体**：姓名 56rpx/700、年龄 40rpx、学校 32rpx/500·学院 28rpx/70% 白，层级清晰合理 ✅。
- **L7 间距**：卡边距 40rpx、信息区 padding 40/32/170rpx，与理想图观感一致 ✅。
- **L8 图标**：筛选键用 sliders 图标（理想图为漏斗形滤网），微差记录；CTA 三键 X/对话泡/实心心 ✅（MatchActions.vue:21-25 + icons v2 资产配置 config/images.ts:428-441）。
- **L9 微交互**：press-feedback/hover 40-120ms、抽屉滑入动画、tabBar 中央浮岛 -40rpx 上凸、筛选打开时隐藏 tabBar（index.vue:137-140）✅ 代码级确认。
- **L10 文案**：❝ 引号 bio ✅、空态三分文案（zh-CN.ts:1019-1022）✅；**「已喜欢」likeSent 违背 v3.1 冻结文案「已送出心动」**（matching.vue:73 + zh-CN.ts:923 vs `git show 29a2b1df:docs/design/v3.1-contract.md` §6:56/§12:96）→ REQ-05。

## 3. PageCompare · usageNotes（理想 vs 实际操作路径）

核心任务链「浏览大图卡 → 喜欢/打招呼 → 进匹配中页 → 结果返回下一张」可走通：DC18 喜欢 500ms 内 tapped→matching、DC22 打招呼 tapped、DC17 跳过 tapped、DC19 喜欢防连点 ×5、DC44 跳过连点 ×5 均执行；未登录点按被 Toast 拦截不强跳（DC20 双 Toast 机证）；登录胶囊→登录页→返回落点寻觅页（DC25）；登录态变化 watch 重拉、胶囊消失（DC26 机证 absent）。任意页回 tab：本页即 tabBar 页恒 1 步；筛选抽屉为全屏弹层但自动隐藏 tabBar、三路可关（代码级；DC27 机证打开）。迷路点：① 配额不可见（T7 缺失），用户只在点击被 Toast 拒绝时才知道「今日次数已用完」（DC24 行为模式），与理想「今日剩余 N 次」前置告知相悖；② 收藏入口缺失使「收藏 TA」任务无处发起（收藏页 `subpackages/profile-extra/profile/favorites.vue` 存在但只收**帖子**，Person 维度收藏能力+入口双缺）。

**机证缺口（非产品缺陷，如实记录）**：① 左右滑手势 DC12–DC15 均记 `act:swipe left unsupported(no element api)`——自动化工具不支持合成 swipe，**手势链路未取得机证**，仅代码级确认（SwipeContainer.vue:36-44 → useSwipeGesture onSwipeLeft=跳过/onSwipeRight=喜欢，阈值 `constants/match.ts:14` SWIPE_THRESHOLD=120px、`:28` TAP_MOVE_THRESHOLD=8px 与 DC15 语义一致）；② 实名门控 DC21 FAILED：harness `login B` 实际解析为 user-1001（expected 身份B，MISMATCH），无法构造未实名用户，弹窗未出现——代码门控在（index.vue:144 → campus-gate.ts:72-93 showModal 去认证/取消），**未取得机证**；③ 打招呼频控 DC23：预期 Toast「已向TA打过3次招呼…」，实测 Toast=「已喜欢」（likeSent，matching 成功路径），且 pre 键记录为未解析占位符 `greet:count:<栈顶卡cardId>`——**证据二义，无法判定产品缺陷或 harness 写键失败**，需以真实 cardId 重跑；④ 推荐/附近空态（DC05/DC06）、错误重试（DC07）、筛选细节（DC28-DC39）FAILED 均为 harness 选择器/导航错误（如 DC10 先 switchTab 到已不作为独立卡的 /pages/nearby/index 再找分段 tab），交互截图 2/15 反证抽屉与附近分段实际可用，但**空态三分文案与筛选控件语义未取得机证**。

**证据时序警示**：交互截图 15 的距离 chip 经像素采样为**粉底白字**（主色 (224,96,96) 占 51.7%），与现行代码白底粉字（MatchCard.vue:165-176）及 tour 静态截图（白色占 55.9%）不符 —— 判定为 interact 取证批次的陈旧构建渲染，非现行代码缺陷；以 tour 静态截图+代码为准。

## 4. 执行结果甄别（44 条 DC）

- EXECUTED 且支撑功能判定：DC01/02/03（首帧/卡片/徽章齐全）、DC08（match_open=false 空态）、DC09（30s 缓存窗口）、DC16（卡片→他人主页）、DC17-20/22/24（三键+门控）、DC25/26（登录链路）、DC27（抽屉打开+tabBar 隐藏）、DC40/41/42（tab 互切/往返/滚动避让）、DC43（热区扫描：筛选 72rpx 热区不足已按缺陷记录——视觉线立案，本线不重复）。
- FAILED=取证脚本问题（元素/导航错配），不构成产品缺陷：DC05/06/07/10/28/29/31/32/35/36/37/38/39/40（细节见 §3 机证缺口）。
- 证据二义待重跑：DC21（实名门控）、DC23（打招呼频控）、DC12-15（手势）。

## 5. functionGaps 汇总（详见 findings JSON）

1. REQ-02 收藏心形入口+Person 收藏能力缺失（Function P2）
2. REQ-03 「今日剩余 N 次」配额展示缺失（Function P2）
3. 滑动手势未取得机证（验证缺口，需换取证手段重跑）
4. 实名门控未取得有效机证（harness 身份构造失败，需修复 login B 后重跑）
5. 打招呼频控 DC23 证据二义（需以真实 cardId 重跑）
6. 推荐/附近空态文案、筛选控件语义未取得机证（代码齐备，建议补免 swipe 自动化脚本）

## 6. verdict

**不达标**。L1（卡高 53.9%<70%）与 L4（匹配度实心粉圆≠绿色环形进度）两级硬性偏差均在，另有两项 Function P2 缺失（收藏入口、配额展示）与一项冻结文案违背（L10）。已达成项：信息位配色反转修复、性别符渲染、页内推荐/附近分段、三键 CTA+门控链、五 Tab 中央凸起、空态/关闭态/错误横幅代码完备。

---

*取证命令摘要：`Read 素材/理想效果图/寻觅匹配卡片页面.png`；`python` 行扫描/主色统计（tour 默认图、interact 2/15 图，含右缘裁切 crop 三件存 `reports/audit/round-1/tmp-a3/discover-edge-*.png`）；`grep` 收藏/remainingCount/stroke-dasharray/收藏入口全源码检索；`git show 29a2b1df:docs/design/v3.1-contract.md` §6/§12/§附录红线；exec-results.json 44 条 DC 逐条解析。未运行构建/测试套件（本岗位只读审查）。*
