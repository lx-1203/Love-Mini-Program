# PageCompare · R1 需求与功能目标对照 · subpackages/circles/circles/index（兴趣圈列表）

- 审查员：需求对照员-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX（A4，需求/功能目标对照；只读代码与证据，不改代码）
- 日期：2026-09-24
- 基线（唯一页面级对照依据）：`素材/理想效果图/兴趣圈列表.png`（852×1846，本轮亲自打开逐区查看）
- 证据：
  - 代码：`apps/client/src/subpackages/circles/circles/index.vue`（本轮全文通读）、`stores/circle.ts`、`stores/circle/mock-data.ts`、`config/circle-covers.ts`、`config/images.ts`、`constants/routes.ts`、`i18n/locales/zh-CN.ts`、`subpackages/tools/search/index.vue`
  - 执行结果：`reports/audit/round-1/interact/exec-results.json`（round=R1、gitSha=aefd8a72、updatedAt=2026-09-23T12:00:00.115Z、共 1283 条；本页 CI01–CI21 = results[454–474]，本轮逐条读取）
  - 截图：`reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI09-before.png / CI09-after.png / CI10-after.png`（本轮亲自查看并仲裁）
  - 素材核对（本轮执行）：`素材/全站素材补齐-0912_assets/` 四张封面与 `apps/client/src/static/assets/images/covers/circle-cover-{photography,travel,music,sports}.jpg` 做 MD5 + PIL 尺寸 + 16×16 灰度 MSE 比对
- 与其他审查员分工：视觉审查员 5 项（`findings/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json` 001–005）、代码层 A2 12 项（`code-findings/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json` 001–012）均不重复；本文只立需求/功能层新项。

---

## 1. 应该具备什么功能（target，源自理想图 + 页面摘要 + 代码内规格引用）

| # | 功能目标 | 依据 |
|---|---|---|
| T1 | 进页拉取并展示兴趣圈列表；loading/错误/空/内容四态完备 | 理想图整页卡列表；index.vue:66-86/123-133 |
| T2 | 分类 chips 过滤（全部/摄影/旅行/音乐/运动/美食…），激活态可辨识，深链 ?category 生效 | 理想图 chips 行；ask 页面摘要；index.vue:211-232 |
| T3 | 搜索：头部搜索入口可点、可搜（代码内规格锚：index.vue:263「点击搜索 → 跳搜索页（占位，规格书 14.4）」） | 理想图头部右端放大镜 |
| T4 | 筛选圆钮（chips 行末端 ≡ 圆钮 + 绿点徽标）展开更多筛选 | 理想图 chips 行右端（本轮查看确认存在） |
| T5 | 圈卡七要素：封面图/圈名/热门徽/描述/人数·动态/头像堆/加入钮；点击卡片进圈子主页 | 理想图卡片区；index.vue:360-414 |
| T6 | CTA「+ 加入/已加入」加入退出真实生效、失败有反馈、快击不异常累加 | 理想图绿色胶囊 CTA；exec CI09/CI10/CI11 用例目标 |
| T7 | 「我的圈子/发现圈子」Tab（ask 页面摘要所列） | 仅见于 ask 摘要；锚定理想图无此结构（见 §3 L1） |
| T8 | 底部五 Tab 导航（首页/附近/匹配/消息/我的） | 理想图底部 |
| T9 | 圈封面素材与理想风格一致（摄影/旅行/音乐/运动走 0912 补齐素材） | ask 素材清单；images.ts:604-610 |
| T10 | 副标题「找到与你志趣相投的人」 | 理想图；zh-CN.ts:3671 |

## 2. 逐条 current / gap / fix

### T1 列表加载与四态 —— 达标（一项取证缺口）
- current：`index.vue:75-77` onLoad 拉取（`getToken() || useMock()` 守卫）、`:82-86` onShow 空列表自愈补拉、`:274-281` 登录态 watch 兜底；`PageStateContainer` 四态映射（:123-128）；mock 14 圈渲染（`stores/circle/mock-data.ts`，截图实测 14 卡全序：摄影→旅行→音乐→运动→美食→游戏→阅读→宠物→天文圈→篮球→桌游→考研→学习搭子→萌宠）。CI01（冷启动时序）、CI20（onShow 自愈）EXECUTED。
- gap：错误态与空态从未被真实渲染验证——CI18 错误态注入 FAILED（`exec-results.json results[471]`，"element not found: __CAND__"），CI19 空态因 mock 恒非空仅探测 `circlesEmpty:absent`（results[472]）。代码路径在、视觉与重试链路未取证。
- fix：补一次真实模式（或拦截 request）下的错误态/空态取证，闭环 CI18。

### T2 分类 chips 过滤 —— 达标
- current：QUICK_TABS 7 项（全部/摄影/旅行/音乐/运动/美食/更多-icon 态），`tabFilteredCircles` 按圈名 includes 过滤（index.vue:225-232）；CI05（点「摄影」tapIndex 命中）、CI06（「更多」显示全量）、CI07（往返切换状态不丢）EXECUTED；CI13 深链 `?category=travel` 过滤实证生效（results[466]，截图 64741B 仅剩旅行卡族）；CI14 `?category=movie` 诚实空列表（执行，after 截图超时未落盘）。
- gap：①深链过滤生效时 chips 高亮仍停在「全部」（CI13 截图 + 代码注释 index.vue:228「互不干扰」属有意为之）——列表内容与高亮态不一致，用户从村口分类进入时所见非所选；②`?category=movie` 这类无匹配分类直接展示「暂无兴趣圈」空态，但空态本身从未被视觉验证（见 T1 gap）。
- fix：深链带参时把对应 chip 置为激活（或将 category 映射进 QUICK_TABS），使高亮与列表一致；是否立案归交互判定员裁决（视觉审查员 observation-05 已呈报，本文件不重复立案）。

### T3 搜索 —— 不达标（功能缺失，立案 REQ-001，Function P2）
- current：头部搜索钮存在且可点（index.vue:312-323，header-right 插槽），但 `goSearch()` 只弹 toast「搜索功能即将上线」（index.vue:263-266）；CI04 实证 toast ×2（results[457]）。仓内已有帖子搜索页 `ROUTES.SEARCH = /subpackages/tools/search/index`（routes.ts:57-58，nearby:235、village:600 均已接线），但该页为帖子搜索流（tools/search/index.vue:5「帖子搜索结果流」，无圈子搜索域），本页未接线。
- gap：理想图头部放大镜对应的「搜索」功能目标是死胡同——既没接既有搜索页，也无圈子域搜索能力；叠加视觉审查员 001（搜索钮被胶囊遮挡、真机不可达），搜索目标双层未达成。
- fix：短期 `goSearch()` → `openAppPath(ROUTES.SEARCH)`（与 nearby/village 入口口径一致）；若产品要圈子域搜索，需在搜索页补 circles 数据源。与视觉 001（胶囊遮挡）一并修复后，搜索目标才闭环。

### T4 筛选圆钮 —— 不达标（功能缺失，已由视觉审查员立案 INDEX-002，本文件不重复）
- current：模板/脚本无任何筛选控件（index.vue:334-357 仅 QUICK_TABS v-for；全文件无 filter 节点），唯一筛选择偶是 chips 关键字过滤，无排序/更多筛选。
- gap：理想图 chips 行末端「≡ 圆钮 + 绿点徽标」整页缺失（本轮查看理想图确认该控件存在）。
- fix：见 `findings/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json` INDEX-002（Function P2）；若产品裁剪需在契约记录关闭 R13 挂账。

### T5 圈卡七要素 + 进圈子主页 —— 达标
- current：七要素齐备且顺序与理想图一致（index.vue:360-414：封面→圈名+热门徽→描述→人数·动态→头像堆+朋友行→加入钮）；热门徽阈值 8000 渲染与 mock 数据完全一致（视觉审查员 observation-02 逐卡核对）；点击卡片 `goToCircleHome` → `ROUTES.CIRCLES.HOME?circleId=`（index.vue:151-161），CI08 执行、CI21 重复进出场景执行。封面走 `circleCoverFor` 单一真相源（config/circle-covers.ts:16-45，11 组关键词规则 + DEFAULT 兜底）。
- gap：无功能缺口。附注两点既有立案不重复：天文圈封面坏图（视觉 003）、校园认证拦截为死代码（A2 INDEX-003，campusVerified 字段无人写入）。
- fix：—

### T6 加入/退出 CTA —— 达标（一项新缺陷立案 REQ-002，Interaction P3）
- current：`toggleJoin` @tap.stop 阻冒泡（index.vue:400-412），失败 toast 可见反馈（:180-187，MP-R1-CIRCLES-001 修复）；store 双模式实现（circle.ts:326-369 mock 本地翻转 + memberCount±1 / real POST·DELETE /circles/{id}/join 回包驱动）。本轮亲自仲裁截图：
  - CI09-before 中摄影圈按钮已是「已加入」，而 mock 种子 `circle-photo isJoined: false`（mock-data.ts:64）——证明此前自动化用例（CI08 第二动作 tap .circle-card__action）真实触发过一次「点击→store 状态→按钮翻转」全链路并跨用例持久；音乐/美食两圈按种子渲染「已加入」（mock-data.ts:82/100）也证明已加入态渲染正确。
  - CI09-after 中旅行圈未翻转（仍「+ 加入」8,932）——CI09 自身 tap 是否生效无法仲裁（wxml 快照 345B 头部截断），视觉审查员已呈报、判定归交互判定员。
- gap（新）：`toggleJoin`（index.vue:173-188）与 `joinCircle/leaveCircle`（circle.ts:326-410）均无在途锁/防连点。mock 分支 `memberCount += 1` 非幂等，快击 N 次在重渲染前均读到旧 `isJoined` → N 次入账，成员数异常累加；real 模式为 N 次重复 POST。CI11（快击×5 防连点用例）虽 EXECUTED，但 dom 探测在本页全失效 + after 截图 ERROR:timeout（results[464]），该验收条件未被证实也未证伪。
- fix：toggleJoin 加 in-flight ref 锁（或 store 侧 pendingSet），执行中忽略重复触发；mock 分支改按 `isJoined` 终态赋值而非 `+= 1`。

### T7 「我的圈子/发现圈子」Tab —— 锚定不符，不立案（记录）
- current：本页无此双 Tab；全仓检索「我的圈子」仅 i18n key（zh-CN.ts:1509）与设置页注释（settings/index.vue:332「2026-09-06 产品收敛：任务中心/我的圈子/情感实验室 暂不对外展示（需求方要求隐藏）」）；store 有 `joinedCircles` getter（circle.ts:289-293）但无任何 UI 消费。
- gap：ask 页面摘要列有「我的圈子/发现圈子Tab」，但锚定理想图 `兴趣圈列表.png` 中不存在该结构（本轮查看：chips 行 + 圈卡 + 底部五 Tab，无双 Tab）；理想图为唯一页面级对照依据，故不构成页面级功能缺失。已加入圈的聚合视图目前全站无入口，属产品裁剪状态。
- fix：无需代码动作；建议在页面锚定单中更正摘要（去掉「我的圈子/发现圈子Tab」或注明裁剪依据），避免后续轮次反复挂账。

### T8 底部五 Tab —— 平台不适用（记录）
- current/gap：本页为分包非 tab 页，微信小程序原生不渲染 tabBar；返回钮 1 步回来源页（CI02），栈底兜底 switchTab 首页（CI03 EXECUTED）。理想图底部五 Tab 属 tab 页对照项。
- fix：无（全站分包页一致行为）。

### T9 圈封面素材 —— 达标
- current：本轮命令核对——四张 0912 素材（36f64e80/39cd56f3/dac87668/372d838e）与静态产物 `circle-cover-{photography,travel,music,sports}.jpg` 逐对 MD5 不同但为同图降采样（1120×840 → 750×562，16×16 灰度 MSE=0.1 同主体），与 images.ts:604-606 注释「750x562 JPEG」一致；映射经 circle-covers.ts 规则 1-4 命中。CI09 截图实拍五封面均为摄影感场景图，与理想图风格一致。
- gap：无（天文圈坏图为另一素材 circle-sky.png，视觉 003 已立案，不在本条四素材范围）。
- fix：—

### T10 副标题 —— 达标
- current：`circles-banner` 渲染 `t("circle.circlesSubtitle")`（index.vue:337-339），zh-CN.ts:3671「找到与你志趣相投的人」与理想图副标题逐字一致；R13 banner key 已修并经视觉审查员像素复核。
- fix：—

## 3. structureNotes（L1–L10，基于本轮亲览理想图 + 巡检截图与视觉审查员记录）

- **L1 结构**：返回+标题（兴趣圈，「趣」下划线品牌字形）+搜索 / 副标题 / chips 行 / 圈卡列表——四大区与理想图一一对应。偏差：①理想图 chips 末端筛选圆钮缺失（→ 视觉 002 / 本文件 T4）；②ask 摘要的「我的圈子/发现圈子Tab」在锚定理想图中不存在（→ T7，不立案）；③底部五 Tab 平台不适用（→ T8）。
- **L2 层级**：标题→副标题→chips→卡片的层级与理想图一致；卡片内「封面 | 信息列 | CTA」三栏层级一致。
- **L3 交互位置**：搜索钮位于标题行右端与理想图同位，但被原生胶囊遮挡、真机不可达（→ 视觉 001）；chips 横滑可及（第 7 个「更多」需滑动）；卡片 CTA 右侧与理想图同位。
- **L4 结构比例**：卡片实测总高 ≈118px vs 理想图 ≈90px（描述两行 + 封面更大所致），卡内比例关系一致（视觉 observation-04，不复立案）。
- **L5 间距**：373px 视口下统计行/好友行完整不截断（历史 P0 MP-R1-CIRCLE-004 实测回归通过，视觉 observation-01）。
- **L6 文案**：副标题逐字一致；「等 N 位朋友加入」缺「已」字（A2 INDEX-008 i18n 硬编码已立案）；圈名 14 卡仅「天文圈」带后缀风格不一（视觉 004 已立案）。
- **L7 图标**：搜索放大镜被胶囊覆盖（视觉 001）；「更多」chip 用 LIST 图标代替理想图筛选 ≡ 圆钮。
- **L8 颜色**：激活 chip 薄荷底绿字绿边 vs 理想图实心绿底白字（R13 对比度修复后现状，视觉已取样记录不复立案）；热门徽红底白字 vs 理想图浅粉底粉字（A2 已有 token 立案，不复）；加入钮浅绿描边胶囊与理想图一致。
- **L9 阴影**：卡片 `--s-card-soft` 软阴影，与理想图浅阴影一致（巡检截图核对）。
- **L10 微细节**：A/B 双身份五态逐像素一致（每对 diff 仅 24 采样点噪声级，视觉取证）；万位 1.2w / 千分位 8,932 / 无千位三种计数格式正确渲染。

**L1–L4 结论**：结构/层级与理想图总体对应，L3 两处交互位缺失（搜索不可达、筛选钮缺失）均已立案，L1–L4 无未立案偏差。

## 4. usageNotes（理想 vs 实际操作路径）

- 核心任务可达性：
  1. **浏览圈子**：进页即拉取（onLoad + onShow 自愈 + 登录 watch 三重兜底），14 卡完整渲染——顺畅；
  2. **按分类找圈**：chips 点按即滤（CI05/CI06/CI07），村口/首页深链 ?category 过滤实证生效（CI13）——顺畅，但深链时高亮不同步是小迷路点；
  3. **加入/退出圈**：全链路真实生效（本轮以 CI09-before 摄影圈种子外翻转为证），失败有 toast——顺畅；
  4. **进圈子看话题**：卡片点击 → circle-home（CI08/CI21）——顺畅；
  5. **搜索圈子**：死胡同（占位 toast）——任务不可完成（REQ-001）；
  6. **更多筛选**：无入口（视觉 002）。
- 迷路风险：低。自定义返回钮语义清晰（CI02），栈底兜底不白屏（CI03）。
- 任意页 2 步内回 tab：✓，本页 1 步（返回钮 → 来源 tab 页 home/nearby；village 分包页 2 步）。
- 入口（本轮检索证实）：home/index.vue:367（兴趣区「更多」）、nearby/index.vue:248、village/index.vue:281（带 ?category）。

## 5. functionGaps 汇总

| target | current | gap | fix |
|---|---|---|---|
| 搜索（规格书 14.4 / 理想图头部放大镜） | goSearch 占位 toast（index.vue:263-266；CI04 toast×2） | 圈子搜索能力缺失，既有 ROUTES.SEARCH 未接线 | goSearch 接 ROUTES.SEARCH 或补圈子域搜索；连同视觉 001 胶囊遮挡一并修 |
| 筛选圆钮 + 筛选面板 | 无任何筛选控件 | 理想图 chips 末端圆钮缺失 | 已立案：视觉 INDEX-002（Function P2），不重复 |
| 我的圈子/发现圈子 Tab | 无此结构；joinedCircles getter 无消费 | ask 摘要与锚定理想图不符；产品 2026-09-06 已裁剪「我的圈子」入口 | 锚定单更正摘要；若产品恢复需求再立项 |
| 加入 CTA 快击可靠性 | toggleJoin/store 无在途锁；mock memberCount += 1 非幂等 | 快击可重复入账（CI11 未证伪：dom 失效 + after 截图超时） | REQ-002：加 in-flight 锁 + mock 按终态赋值 |
| 错误态/空态验收 | 代码四态完备；CI18 FAILED、CI19 条件未触发 | 两态从未真实渲染取证 | 补真实模式错误态/空态取证闭环 CI18 |
| 深链 ?category 高亮同步 | 过滤生效、chips 高亮留「全部」（CI13） | 所见（列表）与所选（高亮）不一致 | 深链参数映射进 QUICK_TABS 激活态（判定归交互判定员） |

## 6. verdict

**基本达标。** 浏览/分类过滤/加入退出/进圈子/回 tab 五条核心路径全部真实可用且有多重兜底，卡片七要素、封面素材、副标题、计数格式与理想图一致；未达标项集中在两个功能目标——搜索为占位死胡同（REQ-001，Function P2）与理想图筛选圆钮缺失（视觉 002 已立案），加上快击防重缺陷（REQ-002，P3）。修复搜索接线与筛选钮决策后可达「达标」。
