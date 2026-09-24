# PageCompare · subpackages/campus/campus/index（校园圈·话题列表）

- 轮次：R1（需求与功能目标对照，A4）
- 日期：2026-09-24
- 审查人：需求对照员-R1-SUBPACKAGES-CAMPUS-CAMPUS-INDEX（A4，只读代码与证据）
- 证据基线：exec-results.json 自声明 gitSha=aefd8a32 == 当前 HEAD（`git log --oneline -1` = aefd8a72）；本页 `subpackages/campus/campus/index.vue` 相对 HEAD 零改动（视觉审查员 workingTreeNote 同口径核对），工作区 i18n/campus store 未提交漂移已与当前文件交叉核对无矛盾。
- 证据构成：静态截图 0 张（screenshot-manifest.json 本页 0 条，A3 MP-R1-CAMPUSINDEX-010 已立 P1）；交互执行结果 reports/audit/round-1/interact/exec-results.json#CX01–CX23（判定文件 SUBPACKAGES-CAMPUS-CAMPUS-INDEX-judge.json：VERIFIED 3 / UNVERIFIED 20 / FAILED 0，20 例 UNVERIFIED 全部归因执行侧两根因——兜底 auto-reLaunch 不带 query 触发设计内 hub 重定向（scripts/qa/r1-exec.cjs:1311-1319）与 S06–S08 会话 tap 派发失效）；平行线健康会话证据 reports/audit/round-1/interact/次要14.json#CAMPUSINDEX OP01–OP10 + fix2 E（9-21，早于 HEAD 提交，仅作旁证）；在盘帧亲验 4 张独立帧（CX03/CX04/CX10≡CX11/CX12≡CX14，其中 CX04 亲读）。
- 理想图对照前提：素材/理想效果图/校园圈.png 经读图核对为 **hub 学校圈列表页**（对应 hub.vue，19 张稿中无本页页面级对照稿）→ 本页 L1–L4 理想图逐层对照不可执行，结构对照基准降级为源码设计意图（scroll-x 单行 Tab 设计、页面 docblock 功能清单、规格书 16 结构注释 index.vue:58/180）。此为证据缺口，非免检。

## 应该具备什么功能（target，源自页面 docblock index.vue:2-10、规格书 16 结构注释、v3 hub→index 传参契约）

| # | target | current（代码+执行结果证实） | gap | fix |
|---|--------|------------------------------|-----|-----|
| T1 | 路由契约：hub 为「校园圈」门页，本页必须带 `?school=` 进入；无参 redirectTo hub 不留栈；校名 URL 解码渲染与全链路透传；非法 % 序列回退原值不崩溃 | index.vue:179-198（守卫+decodeURIComponent try/catch）、:186-194；CX02 EXECUTED（无参→top=hub、栈深=1）、CX03 VERIFIED（「北京大学」解码渲染+列表 2 卡）、CX04 VERIFIED（%E4%8D 回退+空态不崩溃）、平行线 OP01 符合 | 无 | — |
| T2 | 头部：返回键（navigateBack/栈底 switchTab home 兜底）+ 校名 + 认证徽章四态 | index.vue:98-105（goBack 兜底）、:134-161（四态 class/文案映射）、:234-240；校名+未认证徽章 CX03/CX04 亲验 ✓ | 返回键两条路径（CX05/CX06）、verified/pending/rejected 三态徽章（CX16）运行时零证据——执行侧失效，非应用缺陷 | 随截图管线修复（A3 -010 fix）补拍；四态需 real 认证数据预置 |
| T3 | 未认证视角：认证引导卡（去认证→certification，返回 onShow 重取状态）+ 推荐兴趣圈 8 格（→circles/index） | index.vue:245-268（引导卡+推荐圈）、:203-206（onShow 重取）、:41-43（goCircles）；OP03 符合（certGuide:true、recommendItems:8）、OP07 符合（→certification）、judge 引 OP06 符合（查看更多→circles） | 区块标题/更多链接渲染裸 i18n key（campus.index.hotCirclesTitle / campus.index.viewMore）——**REQ-002 P1**；CX07/CX08/CX09 运行时 UNVERIFIED（执行侧） | 见 REQ-002；截图管线带 `?school=` 重跑 CX07-09 |
| T4 | 六分类 Tab：单行横向滚动、高亮迁移、清空重载、viewSchool 全链路透传（切 Tab/翻页/重试）、竞态 token | index.vue:66-73（六分类）、:82-87（setActiveCategory 透传 viewSchool）、:90-92/:168-177（重试/翻页同口径）；campus.ts:400-407（重置 page/hasMore）、:418-425（竞态 token）；OP04 符合（切 Tab 列表刷新）、OP10 符合（连点 3 Tab 竞态保护） | **mp-weixin 实渲染 Tab 纵向堆叠 6 行、横向滚动形态完全失效**（亲验 CX04 帧：6 Tab 各占一行占首屏约 45%）——A3 MP-R1-CAMPUSINDEX-011 P1 已立，本文件不重复立案；scrollLeft 死状态（激活 Tab 不滚入视野）= 代码层 MP-R1-CAMPUSINDEX-005 P3 | 按 A3 -011 fix（scroll-view 内包 inner flex 层）；随修回填 -005 |
| T5 | 话题卡：标题/相对时间/两行预览/作者头像（SafeImage 鉴权重写+匿名兜底）/回复数，点击→topic-detail?topicId= | index.vue:313-343（卡结构）、:111-113（goToTopicDetail）、:328-336（SafeImage+匿名）；campus.ts:308-312（formatCampusTime→utils/time）；CX03 帧亲验（标题+「33 分钟前」+预览+回复数徽章）、OP05 符合（→topic-detail 带参） | 无 | — |
| T6 | 分页：触底翻页 + in-flight 防抖 + loading-more/no-more 态（TOPIC_PAGE_SIZE=10） | index.vue:167-177（防抖）、:312（@scrolltolower）、:344-350（双态）；campus.ts:444-465（page/hasMore）；有界高度链 MP-R1-CAMPUSINDEX-009 已验证；no-more 态运行时证实（CX14 dom .no-more:present + 帧「没有更多了」） | 翻页分支运行时不可达：mock 每分类仅 2-3 条 <10（CX13 UNVERIFIED，append 无证据）——证据环境缺口，非应用缺陷 | mock 种子补 ≥10 条/分类使翻页可实证（健康会话重跑 CX13） |
| T7 | 状态完备：loading→success 无闪现；错误态+重试（同口径透传 viewSchool）；空态 | index.vue:291-309（三态）、:90-92（retry 透传）；campus.ts:466-471（topicsError 独立字段→errorMessage 镜像）；CX01 末态 success（.loading-spinner:absent .topic-card:present，console 干净）、CX04 空态亲验 | ① loading→success 时序与「严禁闪现」负向断言无三时刻采样（CX01 UNVERIFIED）；② 错误态+重试零运行时证据（CX15 落 hub，场景未建立）；③ **空态文案与发布能力错位——REQ-001 P2**；④ topicsError 独立字段全仓零消费（代码层 MP-R1-CAMPUSINDEX-003 P2，运行时行为因 errorMessage 镜像暂等价） | ①③④ 见对应 issue/复查；② 截图管线加请求拦截后带参重跑 CX15 |
| T8 | 视角分支：公开浏览（非本校）banner 提示 + 无引导卡；FAB 仅 isOwnCertifiedView（本校已认证），FAB→post-topic?category=当前分类 | index.vue:270-274（banner）、:61-63（isOwnCertifiedView）、:356-358（FAB 门控）、:118-122（透传 category）；post-topic.vue:61-68（消费 category）；OP08+fix2 E 符合（verified 注入后引导卡/banner 消失、FAB 出现、点按→post-topic） | **公开浏览 banner 分支零运行时证据**（CX17 双前置未建立：real 已认证身份 + 带参入口；.public-browse-banner:absent 系落 hub 测得）——代码在位但从未上屏过 | 带 `?school=清华大学`+real 已认证身份重跑 CX17；category 透传补专项断言 |
| T9 | 导航可达性：nearby tab→hub（1 步）→学校卡→本页（2 步）；任意位置 ≤2 步回 tab | 入口链代码在位：pages/nearby/index.vue:253→ROUTES.CAMPUS.HUB（constants/routes.ts:146）→hub.vue:154-156（学校卡→INDEX?school=）；goBack 栈底兜底 switchTab home（index.vue:98-105）；路由注册 pages.json:117-133 | 回 tab 兜底路径运行时 UNVERIFIED（CX06：tap 上报成功但事件未达应用，同会话 tap 系统性失效；平行线 OP09 同交互符合） | 健康会话重跑 CX05/CX06/CX21 |

## structureNotes（L1–L10）

- **L1 页面层级**：hub（门页）→ index（话题列表）→ topic-detail/post-topic/certification，与规格书 16 结构注释一致（index.vue:58/180、pages.json:117-133）。达标。
- **L2 页面骨架**：渐变头部+认证引导卡+推荐兴趣圈+分类 Tab+话题列表+FAB，与 docblock 设计意图一致；无页面级理想稿（校园圈.png=hub 页），不可逐层对照。降级达标。
- **L3 布局**：**偏差**——分类 Tab 设计意图为 scroll-x 单行（index.vue:279/530-532），mp-weixin 实渲染纵向堆叠 6 全宽行（亲验 CX04 帧，Tab 区占首屏约 45%，话题列表主体被推出首屏；A3 -011 P1）。推荐圈 8 封面窄竖条（A3 -012 P3）。
- **L4 组件**：话题卡七要素齐备（标题/相对时间/两行预览/头像/作者/匿名兜底/回复数徽章），SafeImage 鉴权链在位；空态/加载/错误三态组件齐备。达标（推荐圈栅格形状见 L3）。
- **L5–L6 色彩/文案**：整页 token 化（$green-primary=var(--c-brand) 等，index.vue:363-376）；i18n 大体在位，唯推荐圈区块 2 key 错置 postTopic 命名空间渲染裸 key（zh-CN.ts:3549-3550 vs index.vue:259-260，亲验 CX04 帧）；Tab 标签为静态中文 CAMPUS_CATEGORY_MAP（campus.ts:171-178），en 环境显示中文（代码层 -006 P3）。偏差。
- **L7 交互**：切 Tab/连点竞态/详情跳转/认证跳转/推荐圈跳转/查看更多在健康会话全部符合（OP03/04/05/07/08/10+fix2E）；R1 主跑会话因执行侧双根因 20/23 UNVERIFIED（判定文件仲裁口径②）。运行时实证缺口巨大但无一例归因应用。
- **L8 状态**：loading/空态/错误+重试/no-more 四态模板齐备；空态 CTA 文案与 FAB 门控错位（REQ-001）。
- **L9 数据**：mock 双模式（北京大学白名单）；real 走 GET /campus/topics?category&page&school（campus.ts:452）；401 不静默（campus.ts:542 R12-IND-TOPICS-001）。分页在 mock 数据量下不可达（见 T6）。
- **L10 无障碍**：返回键 role=button+aria-label（index.vue:228-229）、三态区 role=status+aria-live=polite（index.vue:291-309）、加载 spinner aria-label。达标。

**结论（结构）**：L3、L5 存在实锤偏差（-011 P1、REQ-002 P1）；按「L1–L4 偏差即不达标」的严格口径，本页理想图对照已降级、以设计意图为基准计 L3 偏差 → 结构维度不达标项均为在案 P1，无新增未立案结构缺陷。

## usageNotes（理想 vs 实际操作路径）

- **核心任务可达性**：浏览话题（未认证+本校参数即可浏览，OP03 ✓）→ 看详情（OP05 ✓ 1 步）；认证（引导卡 1 步→certification，OP07 ✓）；发布（仅本校已认证：FAB 1 步→post-topic 且携带当前分类，OP08/fix2E ✓，回流列表经 store 更新 fix2 G ✓）；跨校浏览（hub→其他学校卡→公开浏览，banner 设计在位）。健康会话旁证下六条任务线全部走通、无死路。
- **迷路风险**：中低。本页非 Tab 页，唯一出口是头部返回键；返回键双路径（navigateBack/栈底 switchTab home）设计合理，且入口链 nearby→hub→本页仅 2 步，「任意页 2 步回 tab」满足（代码层）；运行时该兜底路径未实证（CX06 UNVERIFIED，平行线 OP09 符合）。风险点：未认证/公开浏览视角下空态文案诱导发布却无入口（REQ-001），用户按文案找发布钮会扑空。
- **运行时实证缺口**：R1 主跑会话 tap 系统性失效+兜底无参重定向（r1-exec.cjs:1311-1319）导致本页 20/23 交互用例 UNVERIFIED、静态截图 0 张——本页操作路径的 HEAD 版本实证高度依赖 9-21 平行线（早于 HEAD，A3 按过期证据处理）；建议 S06–S08 健康会话重跑后再终验升级。

## verdict

**基本达标**。路由契约（T1）、六分类联动+竞态保护（T4 数据面）、话题卡与详情跳转（T5）、视角分支与发布链路（T8 数据面）、导航兜底设计（T9）功能目标全部在位且健康会话旁证可用、R1 无一例 FAILED；不评「达标」因：① 两条在案 P1（Tab mp-weixin 形态失效 -011、推荐圈区块裸 key REQ-002/-001 同区块）直接破坏首屏主导航与入口文案；② HEAD 版本运行时证据缺口（0 静态帧、20/23 UNVERIFIED）未闭合。无新增功能缺失立案（本页功能面完整，REQ-001 为文案-能力错位而非功能缺位）。

## 交叉引用（避免重复立案）

- MP-R1-CAMPUSINDEX-010（A3，P1 MiniProgram，静态截图零覆盖）/ 011（A3，P1 UI，Tab 纵排）/ 012（A3，P3 UI，推荐圈窄条）
- MP-R1-CAMPUSINDEX-001～009（代码审查员：001 裸 key P1、002 状态栏 P1、003 topicsError P2、004 触底错误静默 P3、005 scrollLeft P3、006 分类映射死代码 P3、007 认证状态重复请求 P3、008 banner 深色 P4、009 分页已验证）
- MP-R1-CAMPUSINDEX-002（交互判定员，UI P2，裸 key 回归定界 29a2b1df）——与代码审查员 001、本文件 REQ-002 同源，矩阵合并时三者取一归口
