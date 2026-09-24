# R1 需求对照 · subpackages/village/village/index（村口·社区首页 / 站内名「圈子」）

> 审查员：A4 需求对照（与视觉审查员分文件）
> 证据基线：exec-results.json（round R1, gitSha aefd8a72, 48 条 VI 用例）+ 操作截图 reports/screenshots/round-1-interact/ + 源码 D:/6/恋爱小程序/apps/client/src/
> 理想锚点（无一对一理想图，据 ideal-baseline.md:103）：
> ① `素材/理想效果图/帖子.png`（帖子卡结构对齐）；
> ② `git show 29a2b1df:docs/design/v3.1-后台对齐与参考图生成.md` §三〈圈子/动态广场〉原文：
>    **「顶部搜索+发帖；三入口（关注/同城/发现）；帖子 Feed（头像+昵称+学校+时间+正文+九宫格图+点赞评论）；右下角绿色发布 FAB」**；
> ③ R13 已判明显偏差待修：标题+副标题+搜索挤一行、帖子卡结构与规范相反、绝对日期。

---

## PageCompare

### structureNotes（L1–L10 逐级）

- **L1 页面骨架/信息架构 — 偏差（不达标触发项）**
  理想四段式：顶部搜索+发帖 → 三入口（关注/同城/发现）→ 帖子Feed → 右下绿色发布FAB。
  实际五段式：标题「圈子」+副标题「校园恋爱社区」+搜索框**挤一行**（index.vue:587-605，i18n zh-CN「title:圈子 / subtitle:校园恋爱社区」）→ 5 频道 Tab（今日广场/兴趣圈/学校圈/活动/热度榜，channels.ts:39-82）→ 频道特有区块（认证门/兴趣宫格/活动卡）→ 帖子Feed（+置顶折叠条）→ 底部固定发帖输入条（index.vue:847-853）。
  **三入口（关注/同城/发现）全部不存在**：频道 Tab 无关注/同城；「发现」仅可辩解为「今日广场」语义近似。截图实证 VI30-after（今日广场）、VI26-after（活动频道）。
- **L2 模块顺序 — 部分偏差**
  搜索位于顶部 ✓（但与标题同排、非独立搜索行）；Feed 位于入口区之下 ✓；发布 CTA 形态/位置偏差：底部输入条右端绿色「发帖」胶囊（ChannelComposerBar.vue:58）≠ 右下角独立绿色 FAB；右下角悬浮位实际被「回到顶部」钮占用（index.vue:855-866，bottom: safe-area+220rpx）。
- **L3 帖子卡结构 — 偏差**
  理想（帖子.png 作者行）：头像+昵称+「✓北京大学」校名徽章+圈子名+相对时间（作者行内）+关注钮。
  实际（PostCard.vue:124-170）：头像✓+昵称✓+「校友」徽章（仅当与本人同校区，PostCard.vue:57-59/151）+ meta 行=年龄·城市·学历（authorMetaText，PostCard.vue:91-106）+ headline/「刚刚活跃」（:156）。**campusName 校名字段存在于数据（types.ts:27-37）但卡片从不渲染**；时间不在作者行而在卡底左下（:255-256）。
- **L4 元素级 — 偏差**
  关注 chip 绿描边胶囊 ✓ 对齐帖子.png；点赞/评论计数 ✓；**无图帖强制渲染 POST_PLACEHOLDER 占位图冒充内容图**（PostCard.vue:203-212，理想为有图才渲染图区）；帖子.png 的定位条（北京大学·未名湖校区·距你1.2km）本页目标未要求，不判缺。
- **L5 样式/Token** — 品牌绿 chip/发帖钮在位；A3 MP-R1-VILLAGE-INDEX-110 已档两处硬编码色（P4 保留）。
- **L6 文案/i18n** — 全量走 i18n（zh-CN.ts:2114-2118 频道名等）；A3 -107 已核审核徽标 i18n 修复在位。
- **L7 交互** — 频道切换/频道记忆/深链 ?channel/分页/下拉刷新/滚动位保持全部 EXECUTED（VI14/VI20/VI23/VI24/VI25/VI39/VI40/VI41）；回到顶部 dom present 但自动化点按失败（VI38，选择器/固定元素限制，代码路径在位 index.vue:464-467）。
- **L8 状态** — loading 骨架/错误重试/空态（含 B6 发帖开关文案切换）在位（index.vue:772-811）；VI08 七态时序因 automator 超时未取证（navError），不判缺陷。
- **L9 数据** — mock 帖龄 ≤70h，feed 全部显示相对时间（VI30 实证「8分钟前」）；**A3 两条 P1 未修直接影响本页数据可信**：图文不符 ≥15 帖（MP-R3-VILLAGE-INDEX-001）、热度榜上拉「替换非追加」（MP-R3-VILLAGE-INDEX-002）。
- **L10 无障碍/工程卫生** — role/aria-label 全量在位；过时注释「圈子=Tab 索引 2」仍存（index.vue:80-81，A3 -115 已档，本页实非 Tab 页）。

### usageNotes（理想 vs 实际操作路径）

- 核心任务可完成：浏览帖子→详情 ✓（VI28，setCurrentPost+?id= 直达）；搜索 ✓（VI09，落地 subpackages/tools/search/index）；关注 toggle ✓（VI32）；频道切换+记忆+深链 ✓（VI14/VI20/VI23/VI24/VI25）；分页/下拉穿透 TTL ✓（VI39/VI40）。整体不易迷路。
- **回 tab 路径**：本页非 Tab 页（pages.json tabBar 仅 home/nearby/discover/messages/profile 五项），由首页/附近入口 navigateTo 进入；页面头部无返回钮（全局自定义导航），返回依赖系统手势/胶囊，**1 步回到来源 Tab** → 「任意页 2 步内回 tab」满足（经来源页中转）。
- **自动化未证实项（均查实为取证侧问题，非页面缺陷）**：点赞/收藏（VI30/31，候选错位为「提交/按」）；发帖条点击（VI42-44 dom 报 present 但 tap not found——`composer-bar__input/__publish` 类名实存 ChannelComposerBar.vue:41/:58）；置顶条展开（VI36/37——`pinned-bar__summary/__list` 类名实存 PinnedPostsBar.vue:40/:54，VI30 截图可见「置顶 1 条」已渲染）。VI01 期望未完善身份见 LockScreen 实际全页渲染，但 harness 标注「login A ok userId=user-1001 **MISMATCH!**」，身份注入不符，证据不足不立缺陷；未登录 LockScreen 正常（VI06 `.lock-screen__btn:present`）。
- **发布链路**：入口=底部发帖条/空态按钮（实名门控 ensureCertified，index.vue:385-390）→ /subpackages/village/village/post（发布动态页）；刷新链= circles/post-topic.vue:366 `uni.$emit("village:post-created")` → index.vue:257-260 强制穿透 TTL ✓；但经 post.vue 发布返回仅靠 onShow→`loadChannelData()`（非 force，index.vue:522），30s TTL 内返回不刷新（A3 -104/-105 已覆盖此域）。

### functionGaps（target → current → gap → fix）

| # | target（需求） | current（读码+执行证实） | gap | fix |
|---|---|---|---|---|
| 1 | 三入口「关注」：关注的人的动态 Feed | 频道 Tab=今日广场/兴趣圈/学校圈/活动/热度榜（channels.ts:39-82）；`FOLLOWING_CATEGORY_ID="cat-following"`（constants.ts:48）全应用无页面引用 | **关注流功能整体缺失**（全 app 无入口面） | 增设关注入口/频道：fetchPosts({categoryId:"cat-following"})，或将关注流并入今日广场筛选 |
| 2 | 三入口「同城」：按城市过滤动态 | 本页无同城入口；store 支持在位：`SAME_CITY_CATEGORY_ID="cat-samecity"`（constants.ts:51）+ fetchNearbyPosts(city)（stores/village/index.ts:306-327），仅 nearby 页使用 | 本页缺入口（内容在附近 Tab 可看） | 增设同城入口/频道，复用 city 参数透传（api.ts:155-164） |
| 3 | 右下角绿色发布 FAB | 发布入口为底部输入条右端「发帖」胶囊 + 空态按钮；功能在位（实名门控→/village/post） | CTA 形态/位置偏离需求（功能未缺失） | 如需对齐理想稿：改右下 FAB 或 FAB+输入条双轨，避让回到顶部钮 |
| 4 | 帖子卡显示「学校」 | campusName 有数据但不渲染；仅同校区显示「校友」二字徽章；meta=年龄·城市·学历 | 需求字段缺失（信息展示层） | PostCard 作者行加校名徽章（含校验 ✓ 样式，对齐帖子.png） |
| 5 | 相对时间 | formatRelativeTime：<7d 相对、≥7d 回退绝对日期 YYYY-MM-DD（utils/time.ts:289-321）；mock 帖龄 ≤70h 全相对（VI30「8分钟前」） | R13「绝对日期」仅现于 real 模式/≥7 天旧帖，当前 mock 不可复现 | 如需严格对齐：≥7d 改「N 周前/N 个月前」分段 |
| 6 | 帖子.png「分享」为可用动作 | PostCard 分享钮 `@tap.stop="noop"` 死控件（PostCard.vue:275-277）；VI35 实测无反馈 | 功能失效（A3 MP-R1-VILLAGE-INDEX-108 已档 P3） | 组件补 share 事件→openSharing 或 onShareAppMessage 路径 |
| 7 | 顶部「发帖」入口（顶部搜索+发帖） | 顶部无发帖位；发布入口集中在底部输入条/空态 | 入口位置偏离（可达，1 tap） | 随 #3 一并决策头部/悬浮入口 |
| 8 | 九宫格图仅在有图时渲染 | 无图帖强制 POST_PLACEHOLDER 占位图（PostCard.vue:203-212） | 占位图冒充内容图，误导阅读 | 去掉 v-else 占位分支，无图即无图区 |

### verdict

**不达标**（按「L1–L4 偏差即不达标」裁定：L1 三入口缺失、L2 发布 CTA 形态偏离、L3/L4 帖子卡缺学校字段+占位图）。
说明：社区核心功能链路（浏览/详情/搜索/关注/频道/分页/发帖入口）全部可用且多数经自动化证实，属「功能可用但结构与需求不符」——与 ideal-baseline.md:103 R13「明显偏差待修」结论一致。

---

## 证据清单

| 证据 | 路径/命令 |
|---|---|
| 需求原文 | `git show 29a2b1df:docs/design/v3.1-后台对齐与参考图生成.md` §三〈圈子/动态广场〉 |
| 基线行 | reports/audit/baseline/ideal-baseline.md:103（R13 待修三偏差） |
| 理想图 | 素材/理想效果图/帖子.png（读图：作者行头像+昵称+✓北京大学+摄影圈+30分钟前+关注；1+3图；定位条；❤256/💬32/分享） |
| 页面源码 | apps/client/src/subpackages/village/village/index.vue（:587-613 头部、:847-853 发帖条、:385-390 handlePublish、:522 onShow） |
| 卡片源码 | apps/client/src/components/village/PostCard.vue（:124-170 作者行、:203-212 占位图、:255-288 底栏、:275-277 share noop、:91-106 meta） |
| 频道/分类 | config/channels.ts:39-82；stores/village/constants.ts:48-56；stores/village/index.ts:306-327 |
| 时间机制 | utils/time.ts:265-322（<7d 相对，≥7d 绝对回退）；stores/village/mock-data.ts（最大偏移 70h） |
| 路由/Tab | constants/routes.ts:34/:59/:84；pages.json（tabBar 五项不含 village；globalStyle navigationStyle=custom） |
| 执行结果 | reports/audit/round-1/interact/exec-results.json（VI01-VI48：EXECUTED 24 / FAILED 24，失败项逐条核对为取证侧选择器/身份问题） |
| 截图 | VI26/VI30（头部挤一行+五频道+底部发帖条）、VI30（「8分钟前」相对时间+置顶条）、VI01（MISMATCH 身份全页渲染）、VI32-after |
| A3 交叉引用 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json（-001/-002 P1 未修、-108 分享死按钮、-104/-105 刷新链、-114/-115） |
