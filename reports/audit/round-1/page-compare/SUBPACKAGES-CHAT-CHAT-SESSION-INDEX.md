# PageCompare · subpackages/chat/chat-session/index（聊天会话）· R1 需求与功能目标对照

- 审查员：需求对照员（A4）
- 轮次：R1（gitSha aefd8a72）
- 理想图：**无**（R13 已判本页无页面级理想图）。唯一对照依据：
  - `git show 29a2b1df:docs/design/message-v3-spec.md` §2.2 普通聊天页 / §2.3 寻觅助手会话页 / §8 组件清单 / §9 状态
  - `git show 29a2b1df:docs/design/v3.1-后台对齐与参考图生成.md` §三 聊天：「顶部对方头像+姓名+在线状态+更多；消息气泡区（对方白底左对齐、自己薄荷绿右对齐、灰色系统气泡居中、图片圆角、共同兴趣浅绿卡）；底部输入栏（语音+输入框+表情+加号）」
- 证据：
  - 静态截图 `reports/screenshots/round-1/A|B/SUBPACKAGES_CHAT_CHAT-SESSION_INDEX-默认.png`（1 张，A/B 同构）
  - 交互执行 `reports/audit/round-1/interact/exec-results.json`（45 例：12 EXECUTED / 33 FAILED）
  - 交互复核 `reports/audit/round-1/interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-judge.json`（judge 判定：2 VERIFIED / 3 FAILED / 40 UNVERIFIED）
  - 操作截图目录 `reports/screenshots/round-1-interact/`（CS07/CS44 等；多数 after 截图超时无影像）
  - R13 回归对照 `reports/audit/2026-09-22-r13-goal/shots-r13e/51-chat-entry2.png`
  - 源码 `apps/client/src/subpackages/chat/chat-session/`（index.vue 3297 行 + types/dto/view-models/api）

## 应该具备什么功能（target，逐条对 current/gap/fix）

规范目标按 message-v3-spec §2.2 内容顺序 + 后台对齐 §三 聊天 + 任务书给定状态要求：

| # | target | current（代码/执行证据） | gap | fix |
| --- | --- | --- | --- | --- |
| T1 | 顶部导航：对方头像+姓名+在线状态+··· | `ChatHeader.vue:56-73`（头像+在线角标+标题+在线/离线+···）；在线状态走 `POST /users/online-status/batch`（index.vue:48-50,893-907）；CS05 VERIFIED（title/status/days/input/send 全 present）；R13e 51-chat-entry2.png 显示「林晚/离线/认识 3 天」 | 无 | — |
| T2 | 关系状态区：RelationshipTag + SuggestedAction | **缺失**。模板 index.vue:1798-2078 无关系状态区（仅 `fromSignal=1` 时 signal-banner，1828-1864）；`components/relationship/RelationshipTag.vue`、`SuggestedAction.vue` 全仓零 import（grep 证实）；后端契约已有 `suggestedAction`（api-types-supplement.ts:657） | 整段缺失（L2），spec §1「恋爱关系推进中心」核心动作引导在会话页落空 | ChatHeader 下接入 RelationshipTag+SuggestedAction，数据源 session.relationship / relationship-dashboard，无数据时降级隐藏 |
| T3 | 消息流：对方白底左 / 自己薄荷绿右 / 系统灰居中；活动卡内嵌；时间条 | `ChatBubble.vue:247-254`（self flex-end / peer flex-start / system center）、`:302-317`（self=var(--c-brand)#36C99A 薄荷绿、peer=var(--c-bubble-other)#FFFFFF，design-variables.scss:15,141）；ActivityCard 内嵌 index.vue:1894-1899 + parseActivityCard 307-327；时间条 view-models.ts:267-342；CS10/CS11/CS30 EXECUTED | 系统气泡为透明底居中灰字（ChatBubble.vue:323-324），非「灰色系统气泡」底色——微偏（视觉级） | 如需严格对齐给 system 气泡加浅灰底 |
| T4 | 恋爱输入区：语音+输入框+表情+加号+发送 | 输入框（2028-2039）/表情按钮+EmojiPanel（2006-2015,2054）/「+」更多菜单（2018-2025）/常显发送+置灰（2042-2050, canSend 867）齐备；**语音按钮不存在**，index.vue:1220-1224 记录「微信隐私保护指引未声明麦克风，按产品要求下线语音」 | 输入栏 5 要素缺 1（有记录的产品决定，但 message-v3-spec 未同步更新） | 维持下线则反向修订 spec §三 聊天描述；若恢复需先补麦克风隐私声明再接 VoiceRecorder |
| T5 | 发送失败保留重试 | 草稿保留 ✔：temp 路径失败 return 不清草稿（index.vue:1131-1138）、私信路径抛错不清草稿（1147-1151）+ toast/Sentry（1157-1165）；temp 链路有 withSendRetry 自动重试 1 次（stores/chat/actions/messaging.ts:110-124） | 气泡级失败态/一键重试不存在：`toChatBubbleDeliveryStatus` 把 sending/failed 有意映射为 undefined（view-models.ts:26-46「ChatBubble 不渲染这两种状态」）；私信 sendMessage 从不写 deliveryStatus | 失败消息落流 + 红色感叹号 + 点击重发（微信语义），至少 temp 链路已有的 failed 状态要渲染出来 |
| T6 | 错误净化不外露技术串 | 消息区 store 错误净化 ✔（friendlyPageError index.vue:94-101 → 模板 1881）；建会话失败净化 ✔（723-730） | **发送失败 toast 未净化**：1163-1164 直接 `error.message`、1134 直接 `chatStore.errorMessage` 上 toast；后端 message 原样透传（api-error.ts:155-158），且 friendlyPageError 正则本身就承认 HTTP/幂等/数字码类技术串存在 | 发送 toast 复用 friendlyPageError 同口径净化后再展示 |
| T7 | R13 P0 幂等键（回归对照） | 已修且保持：会话 get-or-create 每次唯一键（stores/messages.ts:894）；消息发送每次随机键且 `headers` 字段名已修正（961-970）；回归证据 CS05 VERIFIED（?userId=10003 深链整页渲染无报错）+ R13e 51-chat-entry2.png | 无（回归通过） | — |
| T8 | 深链健壮性：缺参/失效会话错误态 | 缺参 ✔（CS07 VERIFIED，双区错误文案+输入栏不渲染）；失效数字 sessionId ✘ 假空会话（CS08 judge FAILED：match-greeting+BreakQuestion+可用输入栏，错误态未到达；根因 stores/messages.ts:718 mock 空桶静默返回空列表无错误）；失效 temp 会话 ✘（CS09 judge FAILED：错误文案渲染但 temp-banner/temp-action-btn 因 isTempSession 级联 false 整组不渲染，index.vue:802-828→1815/2057） | 两处失效深链健壮性缺陷 | ①加载完成且无会话无消息无错误时渲染「会话不存在」而非空态引导；②temp 加载失败时保留 banner+禁用按钮（tempSessionUnavailable 目前依赖 isTempSession=true，目标场景恒 false） |
| T9 | §9 状态：空态/加载态/错误态 | 空态 ✔（chat-empty-hint 1930-1932 + MatchGreetingTip 1884-1888）；加载态 ✔（SkeletonBlock variant=chat 1877-1880，CS06 EXECUTED）；错误态 ✔（1876/1881；CS07/CS08 场景） | 无 | — |
| T10 | §2.3 寻觅助手会话页 | 独立路由 `subpackages/chat/official-chat/index`（pages.json:250），非本页；本页不含助手会话 | 不属本页范围 | 由 official-chat 页审查员判定 |
| T11 | 交互执行证据 | judge 判定 45 例中 2 VERIFIED / 3 FAILED / **40 UNVERIFIED**；UNVERIFIED 主因：清单路由参数缺失（CS15/16/22/23/24 等 options:{}→页面按缺参渲染错误态，wxml dump 证实）、logout 仅清 storage 不重置内存 sessionStore（CS01-04 lock-screen:absent）、截图超时 | 发送/表情/长按/转发/拉黑/举报等核心链路无执行级证据，仅代码级证据 | 修复 ops 清单（补 sessionId/userId、logout 后重启实例）后重跑 S08 |

## structureNotes（L1–L10 逐级）

- **L1 布局**：四段式「顶部导航 → 消息流 → 恋爱输入区」成立（ChatHeader / scroll-view / chat-input-area，index.vue:1803-2078）；但 spec §2.2 四段中的**「关系状态区」整段缺失**（L2 级），仅 fromSignal=1 会话有 signal-banner 替代物，普通会话从 ChatHeader 直接跳消息流。
- **L2 结构**：同上，关系状态区缺失是本页唯一整段级结构偏差；其余分段齐全。
- **L3 组件**：ChatHeader（头像+在线角标+姓名+认识X天+···）、ChatBubble（白左/绿右/系统居中/撤回态/引用块）、ActivityCard（活动卡内嵌）、EmojiPanel、BreakQuestion、MatchGreetingTip、SkeletonBlock、LockScreen（未登录）、longpress 菜单、more-menu-sheet 全部在场。`RelationshipTag.vue`/`SuggestedAction.vue` 组件文件存在但**全仓零引用（死代码）**——组件库已备、页面未接。
- **L4 内容**：文案全部 i18n（chat.* 键、timeBar 系列 view-models.ts:294-318）；破冰提示「你们已互相匹配成功…」+两枚快捷开场白在静态截图与 R13e 截图一致；空会话提示「会话刚建立，还没有消息。」在场。微偏：系统消息气泡无灰底（透明底居中灰字），与「灰色系统气泡居中」描述有出入（视觉级，不构成功能缺失）。
- **L5–L7（交互/状态/反馈）**：发送置灰/高亮（canSend）、空提交拦截（1104）、超长输入拦截（store 933）、防连点靠发送后清草稿+store 锁；temp 会话倒计时按秒刷新（1058-1098）；输入栏与表情面板互斥（1228-1234,1266）。CS15/CS17（空提交/防连点）因清单参数缺失 UNVERIFIED，仅代码证据。
- **L8–L10（数据链路/异常/边界）**：mock/real 双链路分叉清晰（1103-1165）；WS 在线状态/正在输入预留（45,1937-1951）；幂等键策略正确（messages.ts:894,970）；异常路径三处缺陷见 issues（假空会话/temp 按钮不渲染/栈深1返回静默）。
- **结论：L2 关系状态区整段缺失 → L1–L4 级存在偏差，结构维度不达标**（但页面主体结构仍高度贴合 §2.2）。

## usageNotes（理想 vs 实际操作路径）

- **核心任务顺畅度**：消息 Tab 点会话 → 本页（MSG27 链路）；深链 ?userId=10003 冷启动 → 自动建会话+破冰引导+可发送（CS05 VERIFIED + R13e 截图）。发送→气泡上屏→清草稿链路代码完整，但执行级证据因清单参数缺失缺位（CS16 UNVERIFIED）。
- **迷路风险**：返回按钮 CS41 EXECUTED（落点=来源页且未读恢复）；压栈即弹 CS42 EXECUTED 无崩溃，但**栈深 1 时返回静默无反馈**（judge FAILED，goBack fail 吞掉无 switchTab 兜底，对比 LockScreen.vue:94-98 有兜底）——深链进入（分享卡/推送）的用户可能被困。CS32/CS34/CS35（···菜单跳主页/拉黑/举报）UNVERIFIED。
- **2 步回 tab**：本页为栈内页，返回 1 步回消息 Tab 来源页，满足铁律（CS41）；栈深 1 场景例外（无兜底）。
- **冷启动破冰**：MatchGreetingTip 首条固定提示 + BreakQuestion 推荐开场 + 草稿持久化（128-160）三重降低「不知说什么」的流失，符合 §1「推进中心」意图的一半——另一半（SuggestedAction 关系推进建议）未落地。

## verdict

**基本达标**。
核心聊天闭环（导航/消息流/输入区/幂等发送/骨架/空态）结构齐备且回归通过（R13 P0 幂等键修复保持有效）；但 spec §2.2 明确的「关系状态区（RelationshipTag+SuggestedAction）」整段缺失（P1），另有失效深链假空会话、temp 禁用按钮不渲染、栈深 1 返回静默、发送失败 toast 技术串外露等 P2 缺陷，且 40/45 交互用例因清单缺陷 UNVERIFIED（功能存在性仅有代码级证据）。上述问题修复并补跑交互取证后可达「达标」。

## 关联 issues

见 `reports/audit/round-1/findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-req.json`（MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-101 ~ 109）。
