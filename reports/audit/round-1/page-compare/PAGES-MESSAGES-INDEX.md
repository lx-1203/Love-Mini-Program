# R1 需求对照 · pages/messages/index（消息，tabBar）

- 审查员：A4 需求对照员（与视觉审查员分文件；本页代码侧发现见 `code-findings/PAGES-MESSAGES-INDEX.json` MP-R1-…-004~023）
- 基线：`素材/理想效果图/消息.png`（唯一页面级对照依据）+ 任务书页面 target + `reports/audit/baseline/ideal-baseline.md:87` + v3.1 契约「消息白底」（git show 29a2b1df:docs/design/v3.1-contract.md 裁决链，任务书转述）
- 证据：
  - 静态截图（screenshot-manifest.json 记账，gitSha aefd8a72，buildMode build:mp-weixin:mock）：
    `reports/screenshots/round-1-tour/A/pages_messages_index__默认.png`、`…__空态.png`（两者 `cmp` 字节级相同）
  - 执行结果：`reports/audit/round-1/interact/exec-results.json` MSG01-MSG40（12 FAILED）
  - 源码：`apps/client/src/pages/messages/index.vue`（工作区，1175 行）及引用链
- 结论速览：**verdict = 不达标**（L3/L4 规格偏离 + Function P1×1 + P2×2 功能缺失 + P2×2 规格色/样偏离）

---

## 一、页面 target（应该具备什么）

依 消息.png 与任务书逐条：

| # | target | 证据锚点 |
|---|--------|---------|
| T1 | 主视觉白底 | 消息.png 整页白底；v3.1 契约「发现/附近/消息白底」 |
| T2 | 两张等宽半屏快捷通知卡并排（有人喜欢你/正在等待回复）；「去看看」=浅绿描边小胶囊+绿字，**非实心渐变** | 消息.png 上部双卡 |
| T3 | 内容顺序：快捷双卡→寻觅助手官方卡（官方标+未读点）→正在升温横滑（关系标签 聊天中#3CC99A/暧昧中#FF6891/互相关注#3CC99A）→最近聊天列表 | 消息.png 信息层级 |
| T4 | 最近聊天行=头像+昵称+最后消息+相对时间（17:32/昨天）+未读数 | 消息.png 列表行 |
| T5 | 头部右侧放大镜**+加号（发起会话）** | 消息.png 头部右上双钮 |
| T6 | 底部导航五 Tab | 消息.png 底部（首页/附近/匹配/消息/我的） |
| T7 | 状态：空态=**推荐认识的人兜底**、骨架加载 | 任务书 target；ideal-baseline.md:87 |
| T8 | 数据侧清理测试残留预览文案「全链路验收测试消息2026-09-12」（外露待修） | 任务书明示；R13-DATA-3894 |
| T9 | （已修项）单卡通栏不铺满 | 任务书「单卡通栏已修」 |

## 二、逐条 current / gap / fix

### T1 白底 — ✗ 不符（P2，issue 106）
- current：页面根 `background: var(--c-bg-page, #EEF7F2)`（index.vue:570），浅色 token 实值 `$bg-page: #EEF7F2`（apps/client/src/theme/design-variables.scss:119、:359）。静态实拍 `A/…__默认.png` 整页浅绿底、白卡片浮于绿底上，与理想图「白底白卡+描边/阴影分区」的图底关系相反。
- fix：消息页根节点/区块底色改白（--c-bg-page 不动全局，页面级覆写为 #FFFFFF），保留卡片描边阴影层级。

### T2 快捷双卡 — ◐ 部分达标（结构✓ / 按钮样式✗）
- 结构 ✓：两张等宽半屏卡（index.vue:373-398）；「单卡通栏已修」核实为工作区未提交修改：`git diff HEAD -- apps/client/src/pages/messages/index.vue` 仅 2 处改动，其一 `.quick-card { flex:1 → flex:1 1 0; max-width: calc(50% - 10rpx) }`（index.vue:684-686）；MSG19 EXECUTED（waitingReplyCount=0 时单卡不铺满）。注意该修复**尚未提交**（HEAD aefd8a72 不含）。
- 第二卡按 `v-if="waitingReplyCount > 0"` 隐藏（index.vue:386）——数据驱动，与「真实数据」规则一致，判定保留（T2 结构在有数据时完全达标，实拍 A/默认 两卡俱在）。
- 按钮 ✗（P2，issue 105）：「去看看/去回复」为实心绿渐变+白字+投影（index.vue:739-742 `linear-gradient(135deg, #36C99A→#2AAE83)`），代码注释自称「对齐 2026-08-27 理想图修复」，与唯一页面级对照依据 消息.png（浅绿描边小胶囊+绿字）及任务书「非实心渐变」直接矛盾。实拍 `A/默认.png` 印证实心绿胶囊白字。
- 文案微差（L5，不单列 issue）：理想卡1描述「3 个人想认识你」，实际「{{n}} 人喜欢了你」（index.vue:380）。

### T3 内容顺序与正在升温 — ◐ 顺序✓ / 标签色✗ / 横滑✗
- 顺序 ✓：Header→搜索栏(按需)→快捷双卡→寻觅助手→正在升温→最近聊天→活动推荐（index.vue:333-560），活动推荐数据驱动后置（R3 已对齐层级，MP-R1-011 已除假数据）。寻觅助手官方标 ✓（index.vue:415-417）、未读点 ✓（会话+通知未读合计，index.vue:408-410，实拍 6+ 角标）。
- 关系标签色 ✗（P2，issue 104）：`status-mutual` 互相关注=蓝 `var(--c-text-link, #4D8DFF)`（index.vue:1089-1094），规格要求 #3CC99A 绿。实拍 `A/默认.png`「叶知秋 互相关注」标签为蓝色，实锤。聊天中（绿 #36C99A≈#3CC99A）✓、暧昧中（粉 #FF6B81≈#FF6891）✓ 色相一致按达标计。
- 横滑 ✗（P3，issue 107）：「正在升温」为静态 flex 行 + `warmPeople.slice(0, 4)`（index.vue:444-460），无 scroll-view/横向滚动；warmPeople>4 时第 5 人起不可达。理想为横滑带。另：默认巡检数据下该区整块隐藏（v-if warmPeople.length>0，index.vue:439；实拍两图均无此区）——数据驱动规则允许，但使「关系标签」在升温区无从展示（标签实际落在最近聊天行，见 T4）。

### T4 最近聊天列表 — ✓ 功能达标
- 行结构 ✓：头像（含加载失败兜底 index.vue:317-321/483）+昵称+关系标签（index.vue:498-500）+最后消息 EmojiText（:502-507）+相对时间+未读数（:518-522，>99→99+，MSG33）。
- 相对时间 ✓：收敛至 `formatChatListTime`（apps/client/src/utils/time.ts:384-433：当天 HH:mm/昨天/本周周几/更早日期；NaN 防护 index.vue:310）。实拍 00:55/昨天/00:28/周一/周日 与规格「17:32/昨天」同型。MSG38 EXECUTED。
- 未读闭环 ✓：进入 onShow 标记全部已读（index.vue:274-278），MSG21/MSG27 EXECUTED（返回落点本页且红点清零）。

### T5 头部放大镜+加号 — ✗ 缺加号（P2 Function，issue 102）
- current：header__right 仅一枚搜索钮（index.vue:342-346）；HEAD 版本相同（`git show HEAD:…index.vue` :343-347）。静态实拍 `A/默认.png` 头部右侧仅 🔍 一钮。
- gap：无「发起会话」入口——从消息页无法主动找人开聊，只能等会话/升温/匹配侧反向建立。R13 起即记录为明显偏差（ideal-baseline.md:87），代码侧已记 MP-R1-019(P3 UI)；按需求侧「功能缺失禁降级」定性为 Function P2。
- fix：header__right 增加 + 钮，落地选择联系人/输入型号入口（复用 ROUTES.CHAT.SESSION?userId=）。

### T6 底部五 Tab — ✓
- pages.json:396-427 `tabBar.list` 5 项（首页/附近/寻觅/消息/我的，custom:true+BaseTabs），本页 useTabBar(3)（index.vue:37）。MSG36 tap 失败为自定义 tabBar 自动化选择器限制；MSG09 EXECUTED（末条会话不被 tabBar 遮挡，padding-bottom 修复 index.vue:575 在场）。
- 微差（L6 不单列）：理想图 tab3 文案「匹配」，实际「寻觅」（v3.1 品牌定名，判定保留）。

### T7 状态 — ◐ 骨架✓ / 空态兜底✗
- 骨架 ✓：Skeleton list×5（index.vue:357-359），MSG06 EXECUTED；下拉刷新不整页闪骨架（index.vue:153-164，MSG10 EXECUTED）。
- 空态 ✗（P2 Function，issue 103）：空态仅吉祥物+「还没有新的缘分/去附近看看吧」（index.vue:363-369），**无「推荐认识的人」兜底**（ideal-baseline.md:87 明示）。MSG07 仅验证文案空态本身。
- 证据瑕疵：巡检 `A/…__空态.png` 与 `…__默认.png` **字节级相同**（cmp 实测），空态在巡检中从未真实触发；空态渲染证据目前仅 interact MSG07 的 dom 断言。

### T8 测试残留数据 — ✗ 待修（P1 Function，issue 101）
- 定性（本轮复核）：「全链路验收测试消息 2026-09-12」在全仓受控文件仅命中 reports 基线文档（本轮 `grep -rn` apps/ 与全仓复核，无代码/种子命中）→ 运行时数据库残留，非代码带入。外露渲染链：index.vue:502-507 `session.lastMessagePreview` ← stores/messages.ts:272 ← apps/api …/RealPrivateMessageService.java:574 `conv.getLastMessagePreview()` ← entity PrivateConversation.java:42 `last_message_preview`。
- 修复路径（沿用 R13-DATA-3894 结论）：双表清理 private_messages id=3894 **及** private_conversations(id=461).last_message_preview；删除不可逆，停在等授权（historical-issues.md:82）。本轮未连库，行级现状以 R13 记录+任务书「待修」为准。

### 执行证据质量 — issue 108（P3 Interaction）
- MSG01 标 EXECUTED 但其 dom 断言 `.not-logged__*` **全部 absent**（与用例标题「等待态完整渲染」矛盾）；MSG02-04 FAILED 同因：buildMode=`build:mp-weixin:mock` 下 `useMock()=true` → isUnlocked 恒真（index.vue:64），未登录等待态在 mock 构建**结构性不可渲染**，用例必然失败/误报。
- MSG05/11/17/19 等证据截图 saveFile 超限保存失败（exec-results evidence 字段带 ERROR）；interact 目录现存 `PAGES-MESSAGES-INDEX-05-after.png` 含当前代码不存在的「+」头钮及搜索词「不存在xyz」，判定为旧轮残留图，不采信。
- MSG12-15/23/24/28-31/36/39 FAILED 属前置态丢失/条件渲染缺席/原生 ActionSheet 与自定义 tabBar 选择器限制，不构成功能否定；对应功能代码在（搜索过滤 index.vue:143-151、长按管理 index.vue:223-248）且 MSG16/25/26/27 等 EXECUTED 侧证。

## 三、L1–L10 结构注记（摘要，详见 JSON structureNotes）

- L1 页面框架：✓ 单页纵向滚动+自定义头+自定义五段 tabBar。
- L2 版块构成顺序：✓（双卡→助手→升温→最近聊天）；偏差：整页底色浅绿≠白底（P2-106）；默认数据下「正在升温」整块缺席（数据驱动，保留）。
- L3 元素齐缺：✗ 头部缺「+」（P2-102）；空态缺「推荐认识的人」兜底（P2-103）。
- L4 组件样式规格：✗ 「去看看/去回复」实心渐变≠描边胶囊（P2-105）；互相关注标签蓝≠#3CC99A 绿（P2-104）。
- L5 文案：基本✓；微差卡1描述「N 人喜欢了你」vs「3 个人想认识你」。
- L6 信息格式：✓ 相对时间分型正确。
- L7+ 图标/间距/动效：本轮不展开（视觉审查员分管）；tab3 文案「寻觅」vs 理想「匹配」为品牌定名偏差。

## 四、usageNotes（理想路径 vs 实际操作）

- 核心任务「看未读→进会话→回复→返回红点清零」：顺畅 ✓（MSG27/35 EXECUTED；快速连点防重 MSG34）。
- 「找人开聊」：**走不通**——页面无发起会话入口（issue 102），新会话只能依赖对方先行动作，需求路径断点。
- 「空态新人冷启动」：只有一句「去附近看看吧」，无推荐人兜底，任务颗粒度断裂（issue 103）。
- 回 tab 成本：本页即 tabBar index 3，任意子页（chat-session/official-chat/likes）返回均落回本页，2 步内回 tab ✓。
- 迷路点：长按菜单项「置顶/取消置顶」双关文案不随态（代码侧 MP-R1-022 已记，本轮不重复立项）；未登录等待态在 mock 构建下无执行证据（issue 108）。
