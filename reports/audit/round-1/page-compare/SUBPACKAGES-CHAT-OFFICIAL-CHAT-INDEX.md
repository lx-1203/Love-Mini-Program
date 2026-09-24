# R1 需求对照 · subpackages/chat/official-chat/index（官方/AI 聊天 · 寻觅助手会话页）

- 审查角色：A4 需求对照审查员（req）
- 轮次：R1 · 基线 gitSha aefd8a72（exec-results.json `updatedAt=2026-09-23T12:00:00.115Z`）
- 日期：2026-09-24
- 只读审查：未改任何代码，未碰开发者工具

## 0. 理想基线的锚定说明（重要）

`素材/理想效果图/` 19 张清点（本轮实测 `ls`）：ChatGPT Image 2026年8月20日 11_37_17 / 他人显示主页 / 兴趣圈列表 / 匹配中页面 / 匹配成功页面 / 发布帖子页面 / 圈子详情，摄影圈参考 / 寻觅匹配卡片页面 / 已经填完资料的个人主页 / 帖子 / 未登录个人主页 / 未登录等待页面 / 校园圈 / **消息** / 登录页 / 登录页面 / 等待页面 / 附近的首页 / 首页。

**本页没有专属整页理想图**；`消息.png` 为左右双联图，其**右半幅即「寻觅助手会话页」整页稿**（返回箭头＋寻觅助手＋官方徽章＋「你的恋爱小管家」、绿色英雄区吉祥物＋「Hi~ 我是寻觅助手 🌱」、活动卡片「城市露营计划」、用户绿气泡「听起来不错！我想参加」＋已读、「太好了！已经帮你报名成功啦✅…」＋气泡内「去看看 / 稍后再说」双按钮、输入栏「对我说点什么吧~」）——本轮以它作为本页唯一页面级对照依据。组件级参考：`素材/组件库/理想效果图-svg拆分/12-chat/`（bubble-self 薄荷绿渐变 `#6FD4AA→#36C99A`、activity-card「助手聊天用」、input-bar 56px）。吉祥物：`素材/吉祥物/xunmi_mascot_design_system_v2/`。

## 1. 页面功能目标（target）逐条核对

代码主文件：`apps/client/src/subpackages/chat/official-chat/index.vue`（下称 index.vue）。

| # | target（应该具备） | current（读码+执行结果证据） | gap / fix |
|---|---|---|---|
| T1 | 从消息页「寻觅助手」卡进入本页（带参 accountId=official-assistant） | **代码达成**：`pages/messages/index.vue:191-192` `openAssistant()` → `openAppPath(ROUTES.MESSAGES.OFFICIAL_CHAT?accountId=official-assistant)`，卡绑定 `:401` `@tap="openAssistant"`；路由注册 `src/pages.json:250`、常量 `constants/routes.ts:98`；onLoad 采纳 query（index.vue:350-351）。**运行证据缺口**：OC03 SKIPPED（action-not-automatable，exec-results#OC03），真实入口点击无运行取证 | 无产品 gap；建议下轮修复 harness 后补 OC03 |
| T2 | 未登录（real 包）LockScreen 全屏拦截，聊天主体不渲染 | **代码达成**：`isUnlocked = isLoggedIn || useMock()`（index.vue:48）+ `<LockScreen v-if="!isUnlocked">`（:358）+ usePageAccess（:52-53，chatPageRequirements 去 requiresProfile，`config/page-access.ts:46-51`）。**运行未验证**：OC25 UNVERIFIED——mock 包 useMock() 恒真，锁定态在 mock 环境不可承载（judge 同判） | 无产品 gap；real 环境未证，注记 |
| T3 | 会话元信息：标题/官方徽章/副标题/返回/··· | **达成且有运行证据**：OC01/OC02 VERIFIED；巡检默认态截图（round-1-tour/A/…__默认.png，本轮已读实拍）与 OC12-after.wxml（本轮解析：nav-left=1、标题/徽章/副标题在树）三重实证 | 无 |
| T4 | 历史消息加载：real GET /official-accounts(+/{code}/messages)，会话与广播合并 | **代码达成**：index.vue:263-275；后端 `OfficialAccountController.java:49-53/62-80`（GET + R16 双向会话时间归并）；`RealOfficialAccountService.java:33-44`（广播 text/card）。**运行仅 mock 证**：OC01/OC02（mock 固化 3 条，index.vue:222-253）；real 模式加载本轮未执行 | 无产品 gap；real 运行证空白注记 |
| T5 | 发送：POST /official-accounts/{code}/messages，幂等键，pending→后端权威替换，失败回滚+Toast | **代码达成**：index.vue:99-155（`headers:{"Idempotency-Key":…}` :138 [PRODUCT-FIX]；失败移除 pending+恢复草稿+Toast :146-151）；后端 `OfficialAccountController.java:87-99` + `OfficialChatService.java:37-62`（落库+规则回复+direction）。**运行证据**：mock 发送 OC12 VERIFIED（本轮解析 OC12-after.wxml：msg-row--right=1、bubble--user=1、read-receipt=1、含「你好呀」「收到啦」、scroll-into-view=official-chat-bottom-anchor）；real 发送/失败回滚 OC24 UNVERIFIED（mock 无失败路径） | 无产品 gap；幂等键 real 重试语义未证 |
| T6 | 消息形态：助手文本(左/吉祥物头像)、用户文本(右/用户头像+已读)、活动卡、**按钮卡（去看看/稍后再说）** | 前三形态**达成**（OC01/OC12+截图+wxml；direction 判别 index.vue:205-210）。**按钮卡不可达——产品 gap**：渲染分支存在（index.vue:213-214、470-477）但全仓无生产者：客户端契约仅 `'text' \| 'card'`（`services/generated/api-types-supplement.ts:628`），后端会话回复硬编码 `"text"`（`OfficialChatService.java:108-116`），real/mock 广播服务 grep `action-buttons` 0 命中，mock 固化 3 条无按钮（index.vue:222-253）→ **死渲染分支**；OC21/OC22 元素不存在（judge 判 UNVERIFIED「环境正确表现」）。理想图明确画出该按钮组 | **MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-101（P2 Function）**；fix 见 findings JSON |
| T7 | 活动卡点击跳活动详情（targetUrl→activityId 拼详情→列表兜底） | **代码达成**：index.vue:288-302（三层兜底）+ `utils/navigation.ts:96-126`（栈满/limit 兜底）。**运行证据冲突**：OC19 UNVERIFIED（探针坏，OC12 wxml 反证 .bubble--card 存在）；OC20 A1 会话 FAILED → A6 已立案 **MP-R1-OC-001（P2 Interaction）**；巡检交互后截图（round-1-tour/A/…__交互后.png，本轮已读实拍=活动详情页「新人礼遇」）证明链路在巡检会话可达。另视觉审查员已立 **-011（P2 Data）**：卡片宣称「城市露营计划」落地却是「新人礼遇」——跳转可达但内容错位，任务语义受损 | 不重复立案；复跑+内容一致性归 -011/MP-R1-OC-001 |
| T8 | 按钮动作：去看看→活动列表；稍后再说→本地插入用户消息 | 处理器代码在（index.vue:158-171），**但承载元素不可达（同 T6）**，OC21/OC22 element not found | 并入 -101 |
| T9 | 输入辅助：表情面板、+/··· 反馈、confirm 发送、空输入禁用、防连点 | 代码：toggleEmojiPanel+EmojiPanel（index.vue:70-83、543，面板 25 格 `EmojiPanel.vue:25`）；+/··· 敬请期待 Toast（:78-83）；canSend 禁用（:68）；sending 防重入（:100-101）。**运行**：OC07/OC08 VERIFIED（Toast 逐字捕获）、OC11 VERIFIED（快击×5 零副作用+禁用态）；OC09/OC10 UNVERIFIED（harness `el.input is not a function` 中断）；OC14 UNVERIFIED（无 confirm 触发记录） | 无产品 gap；表情面板/confirm 运行证空白注记 |
| T10 | 发送/加载后滚底，最后一条不被输入栏遮挡 | **代码达成**：scroll-into-view 底部锚点（index.vue:176-199，MP-R1-OFFICIALCHAT-001 修复）；OC12 wxml 实证 `scroll-into-view="official-chat-bottom-anchor"` 且 after 截图用户消息完整可见。**但**视觉审查员当前 HEAD 默认态实测冷启动滚动停在顶部 → 已立 **-010（P1 Regression）**，本页「最新消息可见」验收处于待修复状态 | 引用 -010，不重复 |
| T11 | 报名成功→寻觅助手会话回流「报名成功」助手消息（P8-2.3；理想图第 3 段「太好了！已经帮你报名成功啦✅…」） | **mock 达成 / real 断链——产品 gap**：生产者 `tools/activities/detail.vue:182-205`（真实报名成功 :241 与示例活动 :252 均调用 appendAssistantActivityNotify）；消费者**仅在 useMock() 分支**（index.vue:254-259）；`utils/assistant-notify.ts:7` 自述「mock 模式专用契约」→ real 用户报名后本会话不出现任何确认消息，本地积压通知永不清空。延伸：文案承诺「活动开始前一天我会提醒你」（index.vue:249；`OfficialChatService.java:85`）但后端 @Scheduled 仅 cleanup/hotscore/vip/mq/ratelimit（本轮 grep），无活动提醒任务、客户端无订阅消息 → 承诺能力无实现 | **-102（P2 Function，real 回流断链）**、**-103（P3 Function，提醒承诺落空）** |
| T12 | 返回：栈深>1 navigateBack；栈深=1 兜底 switchTab 消息 tab | **代码达成**：index.vue:311-318（MP-R1-OFFICIALCHAT-003 修复）；ROUTES.TAB.CHAT=`/pages/messages/index`（routes.ts:40）。**运行**：OC05 VERIFIED（栈深1 tap .nav-left → 终态 pages/messages/index）；OC04 UNVERIFIED（harness 自身 navigateBack NAV_ERROR+探针矛盾，采集会话异常） | 无 |
| T13 | 加载失败：错误文案+重试按钮真实重拉 | 代码达成（index.vue:280-282、386-390；i18n `zh-CN.ts:2787-2788`/`en-US.ts:2625-2626` 两键在）。**运行未验证**：OC23 UNVERIFIED（mock 加载恒成功，错误态不可呈现） | 无产品 gap；real 失败路径运行证空白 |

补充（页面定位）：页面名义「官方/**AI** 聊天」，actual 助手回复为**规则化关键词匹配**（6 类关键词+兜底，`OfficialChatService.java:82-103`），代码注释自述「后续可替换为 AGNES 接入」；仓库内 AGNES 配置仅绑定 AI 视频（`AiVideoConfig.java:12-17`、`application.yml:284-289`），聊天未接模型 → **-104（P3 Function，能力定位差距，交产品裁决）**。

## 2. PageCompare

### structureNotes（L1–L10，对照基线=消息.png 右半）

- **L1 页面级区块构成**：导航栏（返回/标题+官方徽章/副标题/···）✓；绿色英雄区（吉祥物+问候+两行介绍+散点装饰）✓；居中时间条 ✓；消息流（助手左·吉祥物头像/用户右·头像+已读）✓（发送后形态 OC12 实证）；底部输入栏 ✓；表情面板（理想未画，增能）✓。**理想图中的「去看看/稍后再说」按钮消息形态在两种模式下均不可达（无生产者）→ L1 缺 1 项**。
- **L2 区块顺序与从属**：导航→英雄区→时间→消息流→输入栏，与理想一致 ✓。
- **L3 布局结构（3 处方向性偏差）**：① 英雄区理想=吉祥物在左+文案在右**横排**，实际=吉祥物居上+文案居下**竖排居中**（实拍对比两图可见）；② 活动卡理想=图左+信息右**横排媒体对象**，实际=图整宽在上+信息在下**竖排**；③ 输入栏理想=[键盘][输入框][表情][+]，实际=[表情][+][输入框][发送]——发送键为有据增强（P2 修复注记：mp-weixin 软键盘 confirm 不可靠），但键序仍与理想不同。
- **L4 组件形态/关键样式**：官方徽章理想=浅绿底胶囊，实际=白底+薄荷绿描边（index.vue:614-626，代码自称对齐另一参考图 V-08）；用户气泡理想=薄荷绿**渐变**（12-chat/README `#6FD4AA→#36C99A`），实际=品牌绿**实色** var(--c-brand,#36C99A)（:796-800）；「已读」理想=气泡左侧同行，实际=气泡**下方**（:496）；圆角/头像圆形/助手白气泡 ✓。
- **L5 文案**：「Hi~ 我是寻觅助手」「我会帮你发现有趣的人和活动」「让每一次相遇都更有意义」「对我说点什么吧～」「查看详情」「已读」均与理想一致（波浪线/标点微差）✓；mock 三条消息脚本复刻理想叙事（含「城市露营计划」卡）✓。
- **L6–L10 状态/微交互/健壮性**（多为本稿增能，理想未画）：500ms 骨架过渡、加载/错误+重试态、发送禁用态、press-feedback 按压反馈、EmojiText emoji→SVG、时间条去重+跨天格式（昨天 HH:mm / M月D日 HH:mm）、幂等键、防连点、栈深返回兜底。real 异常态（错误/失败回滚/锁定）代码在但运行证空白。

L1–L4 结论：L2 达标；**L1 缺按钮消息形态、L3 三处布局偏差、L4 两处形态偏差+已读位置偏差 → 按「L1–L4 偏差即不达标」口径，结构项不达标**；但无整段缺失、无区块错序，页面骨架与理想高度同构。

### usageNotes（理想 vs 实际操作路径）

- 核心任务「进页→读助手历史→发消息→收回复→点活动卡看详情→返回」**链路完整**：发送 OC12 三重实证（before/after 截图+wxml）；返回兜底 OC05 实证（落点=消息 tab）；卡→详情在巡检会话实拍可达（交互后截图=详情页）。入口点击（消息页助手卡）代码绑定明确但 OC03 被跳过，入口无运行取证。
- 迷路风险低：自定义导航返回键 + 栈深=1 兜底 switchTab，任意入口 2 步内回 tab 达标（OC05）。
- 体验断点（均已他案立案，不在本文件重复计数）：冷启动滚动停在顶部、最后一条被输入栏遮挡（-010 P1 Regression，直接损害「读到最新消息」）；卡文案与落地详情内容错位（-011 P2 Data）；「查看详情」A1 会话点击未跳转（MP-R1-OC-001 P2，归因待复跑）。
- 证据面缺口（非产品缺陷，环境所致，judge 同判 UNVERIFIED）：real 失败路径 OC23/OC24、real-only 按钮卡 OC21/OC22、未登录锁定 OC25、表情面板 OC09/OC10、confirm 发送 OC14、双身份 OC03/OC26（A/B 均解析 user-1001，前置失真）。

### functionGaps

见 findings JSON issues -101～-104 与本 MD §1 T6/T8/T11；另「real 模式运行时验证空白」（LockScreen/失败重试/发送失败回滚/幂等重试）记为证据缺口，非产品功能缺失，不入 Issue。

### verdict

**基本达标**。核心闭环（进入/加载/发送/回复/滚底/返回/卡片跳转）有代码与运行双重证据；未达标项集中在：按钮消息形态不可达（-101 P2）、real 报名回流断链（-102 P2）、3 处 L3 + 3 处 L4 结构偏差、以及 -010（P1，他案）所致的「最新消息可见」验收未过。

## 3. 证据清单（本轮实际执行）

- 读码：`apps/client/src/subpackages/chat/official-chat/index.vue`（全量 1000 行）、`pages/messages/index.vue`（grep openAssistant/assistant）、`constants/routes.ts`、`config/page-access.ts`、`utils/assistant-notify.ts`（全量）、`utils/navigation.ts`（90-130）、`components/chat/EmojiPanel.vue`（grep）、`services/generated/api-types-supplement.ts:628/639`、`i18n/locales/zh-CN.ts:2787-2788`、`en-US.ts:2625-2626`、`subpackages/tools/activities/detail.vue:150-220`（notifyEnrollSuccess）
- 读后端：`apps/api/src/main/java/com/campuslove/api/official/OfficialAccountController.java`（全量）、`OfficialChatService.java`（全量）、`OfficialMessageView.java`（全量）、`RealOfficialAccountService.java`（1-120）；grep `action-buttons`（client/api 两侧）、grep `@Scheduled`、grep `agnes`
- 执行结果：`reports/audit/round-1/interact/exec-results.json`（manifest=SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX 共 26 条 OC01-OC26，逐条 dump status/observed/failureReason）；`SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-judge.json`（VERIFIED 7 / FAILED 1 / UNVERIFIED 18 + MP-R1-OC-001）
- 截图实拍（本轮 Read）：`reports/screenshots/round-1-tour/A/subpackages_chat_official-chat_index__默认.png`、`…__交互后.png`（=活动详情页）、`reports/screenshots/round-1-interact/OFFICIAL-CHAT-12-after.png`
- wxml 解析（python 计数）：`reports/screenshots/round-1-interact/wxml/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC12-after.wxml` → msg-row=10、left=4、right=1、bubble--user=1、read-receipt=1、含「你好呀」「收到啦」、scroll-into-view=official-chat-bottom-anchor、nav-left=1、bubble--card=1、activity-detail-link=2
- 理想素材：`素材/理想效果图/` 19 张 ls 清点；`消息.png`（Read 实读双联图）；`素材/组件库/理想效果图-svg拆分/12-chat/README.md`

**证据引用勘误**：A6 judge 的 evidence 路径写 `round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC*.png` 并记 7 张「ERROR:timeout 未落盘」；实际落盘文件名为 `round-1-interact/OFFICIAL-CHAT-*.png`（本轮 `ls` 实测 43 张，含 judge 判缺失的 OC01/02/07/08/14 对应帧）。判定结论不受影响（judge 已用巡检截图+wxml 补第三源），但下轮引用应改用 OFFICIAL-CHAT-* 文件名。

## 4. 与他案审查员的边界

- **不重复立案**：MP-R1-OC-001（A6，查看详情未跳转，P2 Interaction）、-010（视觉，冷启动滚动顶部，P1 Regression）、-011（视觉，卡片→详情内容错位，P2 Data）、-012/-013（视觉，P3）。
- 本文件新立：**-101（P2 Function）/ -102（P2 Function）/ -103（P3 Function）/ -104（P3 Function）**，见 `reports/audit/round-1/findings/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-req.json`。
