# round-7 · NEEDS_UI_FRAME 欠款分类（判据台 .zcode/tmp/fixverify/verdicts.jsonl）

总数 79 条；分类守恒 79=79。

| 类别 | 条数 | 这条债在谁身上 |
|---|---|---|
| STATIC_SHOOTABLE | 56 | 设备：打开页即可出帧 |
| NEEDS_INTERACTION | 9 | 判据：必须点名 selector 才能自动化 |
| NEEDS_STATE | 9 | 夹具：要造数据态（空/失败/超长/无授权） |
| NEEDS_RUNTIME | 4 | 夹具：要切运行时开关（暗色/字号） |
| UNSHOOTABLE | 1 | 判据或落地：点名的物件两载体都没有 |

## 缺口自检

- 台账「页面」列取不到路由、id 里也抠不出来的：3 条（这些连该去哪个页都不知道）
- 需要交互/状态但没有点名 selector：23 条（判据含糊的那一块）

## 逐条

| id | 类别 | 页面 | 点名物件 | 判据（截断） |
|---|---|---|---|---|
| MP-R2-PAGES-HOME-INDEX-102 | STATIC_SHOOTABLE | pages/home/index | — | 人判：需人复验。本行是形状归一留下的并案行，原判词抠出的那个全大写词是行内状态字样而不是任何载体。判什么：并案目标 ⟨MP-R3-PAGES-HOME-INDEX-002⟩ 所指首 |
| MP-R2-PAGES-HOME-INDEX-110 | STATIC_SHOOTABLE | pages/home/index | — | 修：distance 行改 computed parts 数组 join(' · ')（与 :24-32 metaLine 同口径），模板只输出一个 text。；同类边界未覆盖 M |
| MP-R2VIS-PAGES-HOME-INDEX-004 | NEEDS_RUNTIME | pages/home/index | — | 修：换同族线性刷新 SVG（IMAGE_PATHS 取径 + resolveMediaUrl），色 --c-text-tertiary、与 22rpx 文字同字号；参照同文件 :8 |
| MP-R2-PAGES-NEARBY-INDEX-011 | NEEDS_STATE | pages/nearby/index | — | 人判：需人复验。本行是形状归一留下的并案行，原判词抠出的那个全大写词是行内状态字样而不是任何载体。判什么：并案目标 ⟨MP-R1-PAGES-NEARBY-INDEX-016⟩ 所 |
| MP-R2-PAGES-NEARBY-INDEX-014 | STATIC_SHOOTABLE | pages/nearby/index | — | 修：loadActivities 非 force 分支前置 `if (activityStore.loading) return;`（force 除外），或 store 侧在途 f |
| MP-R2-PAGES-NEARBY-INDEX-012 | STATIC_SHOOTABLE | pages/nearby/index | — | MP-R1-PAGES-NEARBY-INDEX-017〔reports/audit/round-1/issue-matrix.md:172〕 / 〔形状归一 §61：本行原为 6 |
| MP-R2-PAGES-MESSAGES-INDEX-018 | STATIC_SHOOTABLE | pages/messages/index | — | 修：(a) fetchVisitors catch 补 console.warn 留痕（兜底逻辑保留）；(b) markInteractionRead catch 补 consol |
| MP-R2-PAGES-MESSAGES-INDEX-019 | STATIC_SHOOTABLE | pages/messages/index | — | 修：模板按 act.targetUrl 条件渲染 CTA（:599 v-if），或 openActivity 空值分支给轻提示；亦可在 :88-97 映射层过滤掉无 targetU |
| MP-R2-PAGES-MESSAGES-INDEX-021 | NEEDS_INTERACTION | pages/messages/index | — | 人判：需人复验，本条无可立的静态判点。判什么：消息页头像失败的本地兜底集合在每次列表重载后是否被清空。看代码：apps/client/src/pages/messages/inde |
| MP-R2VIS-PAGES-MESSAGES-INDEX-007 | NEEDS_INTERACTION | pages/messages/index | — | 修：交换两个 view 的 DOM 顺序即可（勿改点击语义）。 |
| MP-R2VIS-PAGES-MESSAGES-INDEX-009 | STATIC_SHOOTABLE | pages/messages/index | — | 人判：这条修的是元素归属，即免打扰图标挂在昵称行还是时间行，两个类名在修复前后都存在且同在该页产物里，位置与父子关系在编译产物侧不可判，需人裁定。要人判什么：免打扰图标是否与关系标 |
| MP-R2-PAGES-MESSAGES-INDEX-020 | NEEDS_INTERACTION | pages/messages/index | — | 修：短期：操作后 toast 明示「仅本地生效，刷新后还原」或从长按菜单摘掉该能力；长期：TODO(backend) 落地会话未读元数据同步。另须复核 markAllSession |
| MP-R2VIS-PAGES-MESSAGES-INDEX-005 | NEEDS_STATE | pages/messages/index | — | 修：**删掉原句「在 mock 种子补 ⟨warmPeople⟩≥4、assistant≥1（只加种子，不碰 store 逻辑）」——字面不可行**：dashboard 是单一 ⟨ |
| MP-R2VIS-PAGES-MESSAGES-INDEX-002 | NEEDS_STATE | pages/messages/index | — | 修：subtitle 改带插值的「附近有 {n} 位同频的你」，n 取游客可用的 /recommendations/people 计数；无数据时回退现有静态串。 〔§82 注释清扫 |
| MP-R2VIS-PAGES-MESSAGES-INDEX-004 | NEEDS_INTERACTION | pages/messages/index | — | 本条不要写绿，按未修处理：修后物件在基线、当前源码、当前产物三处都不存在。下轮可用判点全部限定在该页或该组件自己的产物文件内：在该组件模板里补 mascot 组件节点并让虚线轨道与 |
| MP-R2VIS-PAGES-LOGIN-INDEX-001 | STATIC_SHOOTABLE | pages/login/index | — | 修：三枚按钮 border-radius 改 var(--r-full)（9999rpx）。 |
| MP-R2VIS-PAGES-LOGIN-INDEX-007 | STATIC_SHOOTABLE | pages/login/index | — | 修：两键值分开命名（如「手机号快捷登录」/「使用验证码或密码登录」）并弱化兜底样式，zh-CN/en-US 同批提交。 |
| MP-R2-PAGES-REGISTER-INDEX-009 | STATIC_SHOOTABLE | pages/register/index | — | 人判：需人复验，无可立的静态判点。判什么：生日是否按本地时区而不是按 UTC 解析后再与满 18 周岁的界点比较。看代码：apps/client/src/pages/registe |
| MP-R2-PAGES-REGISTER-INDEX-011 | STATIC_SHOOTABLE | pages/register/index | — | 修：视觉尺寸不动，@tap 移到外包 88rpx 透明 view（或 padding 扩展 + 等量负 margin）。 |
| MP-R2-PAGES-REGISTER-INDEX-012 | STATIC_SHOOTABLE | pages/register/index | — | 修：比对迁到确认框 @blur（新增 onConfirmBlur），@input 只保留「已有错误时清除」；同步改 :175 注释。 |
| MP-R2-PAGES-REGISTER-INDEX-013 | STATIC_SHOOTABLE | pages/register/index | — | 修：补 register.* i18n 键（zh/en 同步）后 toast() 改 t()；更新 :17-18 头注依据。 〔§82 注释清扫落定：ID 锚点在工作树 3 处命中 |
| MP-R2-PAGES-REGISTER-INDEX-014 | NEEDS_RUNTIME | pages/register/index | — | 修：**拆两类映射，不得合并成一句**。（A）彩色底上的白色**前景**（:1036 .sms-btn__text、:1119 .submit-btn__text、:1136 .s |
| MP-R2-PROFILE-025 | STATIC_SHOOTABLE | pages/profile/index | — | 人判：本条实质是两个运行时值同口径，即访客列表长度与后台统计数谁优先，产物里两边的成员访问都被改名，静态分不出修前修后。要判什么：已登录个人主页四格互动数据里最近访客那一格的数值是 |
| MP-R2-PROFILE-034 | STATIC_SHOOTABLE | pages/profile/index | — | 修：删除 socialProgressStore 实例化与 onShow 的 fetchProgress()（或等进度 UI 回归时一并恢复）。 |
| MP-R2-CAMPUS-HUB-009 | STATIC_SHOOTABLE | subpackages/campus/campus/hub | — | 修：两处 --c-bg-page 兜底值统一（同文件 :372 用 #EEF7F2、:818 .campus-search 用 #F0F4F2）；择一真值并让另一处复用同一 fal |
| MP-R2-CAMPUS-HUB-010 | STATIC_SHOOTABLE | subpackages/campus/campus/hub | — | 修：若确立「无专属封面也展示兜底封面」为产品意图，则删掉 :296 v-else 死分支与 :21 失实注释；否则去掉末端兜底，让浅绿分支可达。 |
| MP-R2-CAMPUS-HUB-011 | STATIC_SHOOTABLE | subpackages/campus/campus/hub | — | 人判：本条静态判点写不出来就不硬造。要判的是切已加入与推荐两个 tab 时学校卡片列表是否被整列重建。看哪段代码：apps/client/src/subpackages/campu |
| MP-R2-CAMPUS-HUB-012 | STATIC_SHOOTABLE | subpackages/campus/campus/hub | — | 人判：需人复验，无可立的静态判点。判什么：校园卡片的成员数与动态数每卡是否只计算一次。看代码：apps/client/src/subpackages/campus/campus/h |
| MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-001 | STATIC_SHOOTABLE | subpackages/campus/campus/hub | — | 人判：处置原列三个改法，其中首选的统计行独立成行加徽标回校名行，已在本轮基线 094f7239 之前达成（产物 hub.wxml 里统计文本与校名行是平级兄弟、hub.wxss 统 |
| MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-003 | STATIC_SHOOTABLE | subpackages/campus/campus/hub | — | 人判：封面尺寸在本轮基线 094f7239 之前就已改为近正方形并为统计行让出宽度，工作树、产物 hub.wxss 与基线三者同值，数值型判点在基线里就在，不能当本轮判点，需人裁定 |
| MP-R2-CAMPUSINDEX-010 | STATIC_SHOOTABLE | subpackages/campus/campus/index | — | 修：store 拆 certificationError 独立字段，index.vue 在认证拉取失败时给轻量重试/toast（对齐 hub.vue:180-186 的 certL |
| MP-R2-CAMPUSINDEX-011 | STATIC_SHOOTABLE | subpackages/campus/campus/index | — | 修：去掉 onMounted 内的 ⟨fetchCertificationStatus⟩（首取交给 onShow），或加 ⟨certFetchedOnce⟩ 标志去重。；关联（非同 |
| MP-R2-CAMPUSPOST-013 | STATIC_SHOOTABLE | subpackages/campus/campus/post-topic | — | 修：回设前判 cat ∈ CAMPUS_CATEGORY_MAP，非法值回落默认 course_exchange。 〔§82 注释清扫落定：ID 锚点在工作树 1 处命中、HEAD |
| MP-R2-CAMPUSPOST-014 | STATIC_SHOOTABLE | subpackages/campus/campus/post-topic | — | 修：:key 改 img 临时路径（本页生命周期内唯一稳定）。 〔§82 注释清扫落定：ID 锚点在工作树 1 处命中、HEAD 0 命中、承载文件 dirty=1；判据台桶=UN |
| MP-R2-CAMPUSPOST-016 | STATIC_SHOOTABLE | subpackages/campus/campus/post-topic | — | 修：把 :91 的 import 上移到文件头 import 区末尾。 〔§82 注释清扫落定：ID 锚点在工作树 1 处命中、HEAD 0 命中、承载文件 dirty=1；判据台 |
| MP-R2-CIRCLES-INDEX-004 | STATIC_SHOOTABLE | subpackages/circles/circles/index | — | 人判：需人复验，改动早于基线且无可指向本轮的载体。判什么：兴趣圈列表页快捷分类名与统计行文案是否已全部走语言包。看代码：apps/client/src/subpackages/ci |
| MP-R2-CIRCLES-INDEX-005 | NEEDS_INTERACTION | subpackages/circles/circles/index | — | 修：为本页建定高链（参考 village/index.vue `.village-page` height:100% 定高链，工作树 :879-887 带 MP-R1-VILLAG |
| MP-R2-CIRCLES-INDEX-006 | NEEDS_STATE | subpackages/circles/circles/index | — | 修：未登录给独立提示态或 emptyActionText 引导登录；有权但空列表时接 emptyAction 给去路。 〔§82 注释清扫落定：ID 锚点在工作树 2 处命中、HE |
| MP-R2-CIRCLES-INDEX-007 | NEEDS_RUNTIME | subpackages/circles/circles/index | — | 修：前半「:911 换 var(--c-brand,#36C99A)」已落（工作树）。**后半三案待主编排层拍板，收口不代拍**：**A**（台账原口径：新增 --c-hot-ba |
| MP-R2-POST-013 | STATIC_SHOOTABLE | subpackages/village/village/post | — | 修：targetSubtitle 首行补 `if (isCircleTarget.value && !targetCircle.value) return "圈子成员可见";`，与 |
| MP-R2-POST-016 | NEEDS_STATE | subpackages/village/village/post | — | 人判：台账要删的那条高度声明在本轮基线 094f7239 里就已不存在，工作树与产物同值，属修复早于本轮而 status 未同步，需人裁定改判为已修复（本轮前落地）。⟨aspect |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-006 | STATIC_SHOOTABLE | subpackages/village/village/post | — | 人判：待裁决后再谈判据，静态侧无可立判点。判什么：两个发布入口的圈子候选行结构取哪一种，原判据是二选一。看代码：apps/client/src/subpackages/villag |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-005 | STATIC_SHOOTABLE | subpackages/village/village/publish | — | 修：**判据更正为「view/button 节点补 hover-class；<text> 节点须先换型为 <view> 再补」**——mp-weixin 的 hover-class |
| MP-R2-PUB-114 | STATIC_SHOOTABLE | subpackages/village/village/publish | — | 修：onLoad 的 campus/circleId 回设处同步 visibility（campus→"school"、circle→"interest"），或把入口回设抽成 ap |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A01 | STATIC_SHOOTABLE | subpackages/village/village/publish | — | 修：二选一：(a) 复用 post.vue:164-168 insertMention 真往正文插 @（两页同能力，非并页）；(b) 去掉 press-feedback 与 ›、行 |
| MP-R2-VILLAGE-INDEX-012 | STATIC_SHOOTABLE | subpackages/village/village/index | — | 修：兴趣圈精选话题失败时按 circleStore.errorMessage 渲染提示条 + 重试（重跑 loadChannelData(id,true)）；活动列表补 v-els |
| MP-R2-VILLAGE-INDEX-010 | STATIC_SHOOTABLE | subpackages/village/village/index | — | 修：删掉 `.catch(() => {})`（load() 契约已保证不 reject）；若保留防御则改带注释形式说明可吞的异常类别。 〔§82 注释清扫落定：ID 锚点在工作树 |
| MP-R2-POSTTOPIC-011 | STATIC_SHOOTABLE | subpackages/circles/circles/post-topic | — | 修：遮罩改已定义的 --c-bg-overlay（design-variables.scss:123 + :368）；--c-bg-brand-soft 在主题层补亮/暗双值定义（ |
| MP-R2-POSTTOPIC-012 | NEEDS_INTERACTION | subpackages/circles/circles/post-topic | — | 修：换成同分包现成范式 apps/client/src/subpackages/circles/circles/index.vue:288-292（navigateBack().c |
| MP-R2-POSTTOPIC-013 | STATIC_SHOOTABLE | subpackages/circles/circles/post-topic | — | 修：490/697 禁用条件并入 '// isSubmitting'，提交中切 loading 文案/图标，使防重在途有视觉反馈 |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001 | STATIC_SHOOTABLE | subpackages/village/village/publish | — | 人判：这条两半都不可静态判，需人先拍口径再定判点。前半要补的常驻图格上限提示至今没有定稿的元素与文案，两页图格区都只有一个加号块，超限只靠选满时弹的轻提示，产物里没有可比对的新载体 |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A05 | NEEDS_INTERACTION | subpackages/village/village/publish | — | 修：把 :759-802 的 target-sheet 整块移出 scroll-view 到页面根（与 :915 话题弹层同层），消除同页两套层级策略 〔§82 注释清扫落定：ID |
| MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-007 | STATIC_SHOOTABLE | subpackages/chat/chat-session/index | — | 修：空态容器 flex:1 + align-items/justify-content center（或在 .chat-list 上对空态分支加 justify-content:c |
| MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-A02 | NEEDS_INTERACTION | subpackages/chat/chat-session/index | — | 修：删该死分支（样式 + :2173 绑定），或恢复键盘态差异化间距；键盘态量测需真机，故只删不猜 |
| MP-R2-PAGES-HOME-INDEX-105 | NEEDS_STATE | pages/home/index | — | 修：错误态重试按钮 :156 改 @tap="⟨handleRefresh⟩"；watch(() => ⟨props.items⟩) 变化时清 ⟨failedKeys⟩；删除 :4 |
| MP-R2-PAGES-HOME-INDEX-106 | STATIC_SHOOTABLE | pages/home/index | — | 修：**两案待主编排层拍板，收口不代拍**。（A）后端在 /home/dashboard 与 rotate 响应回 `liked`、前端单源消费——代价：要改 apps/api 并 |
| MP-R2-PAGES-HOME-INDEX-111 | STATIC_SHOOTABLE | pages/home/index | — | 修：两组件在骨架分支后补 v-else-if="items.length === 0" 空态块，复用 CommunityFeed.vue:161 的文案/样式口径。 |
| MP-R2-PAGES-HOME-INDEX-112 | STATIC_SHOOTABLE | pages/home/index | — | 人判：这条要判的是数据形状，即同一条资产路径被媒体解析函数套了几层，层数在压缩产物里不可数：函数名会被打包器改写、路径字符串本身修前修后一模一样，所以没有可判物件，需人读源码裁定。 |
| MP-R2VIS-PAGES-HOME-INDEX-003 | STATIC_SHOOTABLE | pages/home/index | — | 修：删除 :68 共同兴趣行（或按既成事实回写规范，属 SPECDOC 裁决）；头像改用 person-* 半身池或顶部锚定裁切保证脸部入画。 |
| MP-R2VIS-PAGES-HOME-INDEX-005 | STATIC_SHOOTABLE | pages/home/index | — | 修：HomeHeader 左内距改 var(--page-padding)；须同批处理 InviteBanner.vue:35 的 40rpx，否则只是换一处漂移。裁决结果（本轮） |
| MP-R2-PAGES-DISCOVER-INDEX-013 | NEEDS_STATE | pages/discover/index | — | 修：activeLabel 四分支改 t()，**键名按现仓更正**——`matchV1.activeOnline/activeToday/activeHoursAgo/activ |
| MP-R2-PAGES-REGISTER-SUCCESS-005 | STATIC_SHOOTABLE | pages/register/success | — | 修：.reg-success__alt 加 min-height:88rpx + flex 居中，或 padding:20rpx 24rpx 并以等量负 margin 抵消视觉位移 |
| MP-R2-PROFILE-024 | NEEDS_STATE | pages/profile/index（未登录态为主，本人态同病） | — | 修：**分两档写，原口径有算术缺口**。「padding-bottom 按 184rpx+2env」只等于 custom-tab-bar 面板**顶缘**（160rpx+env 加 |
| MP-R2VIS-PAGES-PROFILE-INDEX-003 | NEEDS_RUNTIME | pages/profile/index | — | 人判：术语已在本轮基线 094f7239 之前统一为同一词，卡片文案、无障碍标签、两处注释现已同向，可判物件在基线里就已存在，不能当本轮判点，需人裁定改判为已修复（本轮前落地）。若 |
| MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-002 | STATIC_SHOOTABLE | subpackages/circles/circles/circle-home | — | 人判：公告文案已在本轮基线 094f7239 之前由旧词改为新词并保留方括号前缀，产物 subpackages/circles/circles/circle-home.js 里已是 |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-001 | STATIC_SHOOTABLE | subpackages/village/village/index | — | 修：颜色按标签语义映射（活动/情感/普通）并两页共用同一 helper；或直接统一为 detail 的单色绿，删掉 :545-548 的 pink 分支。 〔§82 注释清扫落定： |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-001 | NEEDS_INTERACTION | subpackages/village/village/detail | — | 人判：需人复验，无可指向本轮的静态判点。判什么：详情页回复态与挂图态下底部固定输入栏是否还压住正文末条。看代码：apps/client/src/subpackages/villag |
| MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-006 | STATIC_SHOOTABLE | subpackages/campus/campus/hub | — | 人判：待裁决后再谈判据，静态侧无可立判点。判什么：校园域两级键命名空间要不要统一以及统一到哪一级。看代码：apps/client/src/subpackages/campus/ca |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-002 | STATIC_SHOOTABLE | subpackages/village/village/detail | — | 修：2 图特判 50/50（或首图亦 2/3）；无图态按需补占位或明确不补 |
| MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-001 | STATIC_SHOOTABLE | subpackages/circles/circles/circle-home | — | 修：给 .hero-actions-right 加 margin/padding-right:calc(var(--capsule-right,7px)+104px) 避让胶囊；补 |
| MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-004 | STATIC_SHOOTABLE | subpackages/village/village/post | — | 修：两页统一走 var(--card-shadow) 或统一无阴影 〔§82 注释清扫落定：ID 锚点在工作树 1 处命中、HEAD 0 命中、承载文件 dirty=1；判据台桶= |
| MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001 | STATIC_SHOOTABLE | ?页面无路由 | — | 修：水平内边距单一来源：由 AppShell 承担（或调为 32rpx），页内层水平 padding 归零；W16 串行全站生效。本轮已落 circles/index.vue 页内 |
| MP-R2-MATCHING-016 | STATIC_SHOOTABLE | ?页面无路由 | — | 修：runMatchCheck 支持 callerSnapshot 透传（把 loadPartnerProfile 结果 mapToDiscoverCard 后传入），直达分支自持 |
| MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-001 | STATIC_SHOOTABLE | subpackages/chat/chat-session/index | — | 修：先按 deletedMessageIds 过滤消息再调 buildChatMessageRows；或过滤后二次遍历丢弃后继不是 message 的 timebar 行 |
| MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-004 | NEEDS_STATE | subpackages/chat/chat-session/index | — | 修：外层容器加 min-height + 浅色骨架底，image 补 @error 切「图片加载失败」占位文案（或统一改走 components/common/SafeImage. |
| MP-R2VIS-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-001 | UNSHOOTABLE | subpackages/chat/official-chat/index | — | 修：四处助手文案迁 i18n 键并去 emoji（zh/en 同批），确需表情的位置改 <image> 或补 ⟨EMOJI_SVG_MAP⟩ 映射；关联 MP-R2-OFFICIA |
| MP-R2VIS-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001 | STATIC_SHOOTABLE | subpackages/discover-extra/discover/matching | — | 修：跳过钮底色改成 var(--c-bg-container)，文字色改成品牌绿，两者合起来就是台账要的白底绿字。判点载体是产物 components/match/MatchLoa |
| MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001 | STATIC_SHOOTABLE | subpackages/profile-extra/profile/other | — | 修：PublicIdentity 的 meta 拼接改 age · school · city，与我的页 MyHeader 的 ⟨metaLine⟩ 共用同一 formatter。 |
| MP-R2VIS-TMP-TOUR-R2-004 | STATIC_SHOOTABLE | ?页面无路由 | — | 修：真解在 harness 之外：把 DevTools 模拟器切到高 dpr 机型档后重跑（脚本无权改），或在报告口径上把「字级判定」标注为需人工 zoomFrames 辅助帧背书 |