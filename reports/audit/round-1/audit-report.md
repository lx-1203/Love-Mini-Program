# Round 1 审计报告（R1 · 2026-09-22）

- **范围**：微信小程序客户端（apps/client）主包 6 个 tab 页 + 注册链路 + 村口/圈子/校园/聊天/匹配/发布等分包页簇 + 市场化封存页；后端仅在与前端契约交叉处对照（如 SmsCodeController、PostSummaryView）。
- **方法**：① A2/Layer A 只读代码审查（25 份 code-findings，全文精读页面与引用链，逐条给 file:line 证据，不驱动开发者工具）；② miniprogram-automator/开发者工具 CLI 交互取证（24 份 interact 判定，995 条用例，before/after 截图 + console 落盘 + DOM/store 探针）；③ 对照 baseline/historical-issues.md 做历史回归核对。
- **环境**：mock 构建（pnpm build:mp-weixin:mock，Node 22；verify-build-features 4/4 PASS）；开发者工具 Stable 2.02.2608040（自动化端口 ws://127.0.0.1:9420）；后端 127.0.0.1:8080；身份 A=mock user-1001/100158（campusVerified）与 B=游客/新号双身份（各文件 notes 记载）。

## 一、数据来源与缺口（如实声明）

| 来源 | 状态 | 规模 |
|---|---|---|
| reports/audit/round-1/code-findings/（25 份 JSON） | ✅ 在 | 405 条发现（P0×4 P1×46 P2×94 P3×175 P4×86） |
| reports/audit/round-1/interact/（24 份 JSON + 2 份 console 日志） | ✅ 在 | 995 条用例（✅856/❌80/⚠️59）+ 69 条交互层发现 |
| reports/audit/round-1/regression/ | ❌ **不存在**（本会话 ls 核实） | 回归判定改从 code-findings category=Regression（82 条）、interact regression* 字段、coverage 核对语句提取 → regression-report.md |
| reports/audit/round-1/page-compare/ | ❌ **不存在**（本会话 ls 核实） | 每页使用对比改由 interact 各文件 page/pageName/notes/checks 与 code-findings scope 归纳（见第四节） |
| reports/audit/baseline/historical-issues.md | ✅ 在 | 历史线索库（15 个系统性主题 + P0/P1/P2 全量清单 + 未闭环 13 项） |
| reports/screenshots/round-1、round-1-interact | ✅ 在 | 72+72 张双身份全页截图；2397 张交互取证 png + 7 个证据日志 |

## 二、总量结论

- 代码审查发现 **405 条**：P0 4、P1 46、P2 94、P3 175、P4 86；处置状态：待修复 338、已修复待终验 50、已验证 9、保留（产品决议）8。
- 交互取证用例 **995 条**：符合 856（86%）、偏差 80、无法验证 59；交互层补充发现 69 条。
- 历史回归核对：82 条代码层 Regression 核对 + 4 组交互专项回归（详见 regression-report.md）。

### P0 全量（4 条）

| ID | 页面 | 问题（摘要） | 状态 | 来源 |
|---|---|---|---|---|
| MP-R1-MATCHING-001 | subpackages/discover-extra/dis… | 回归核对 R3 线索 MP-R3-MATCHING-001「匹配页『打不开』」：代码层证伪确认，非缺陷。无上下文进入 matching 时的「无 pendingCardId/pendingAction 且 URL 无 cardId/acti… | 已验证 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json |
| MP-R1-VILLAGE-INDEX-112 | subpackages/village/village/in… | 回归核对 MP-R1-VILLAGE-002（P0）「搜索框右端伸进胶囊下方被遮挡」：代码层确认已修复且留有余量。头部行 padding-right: calc(var(--capsule-right, 7px) + 112px)（R21 … | 已修复待终验 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json |
| MP-R2-PUB-002 | subpackages/village/village/pu… | 回归核对：渠道弹层缺「兴趣圈子」组（历史 P0）。代码层确认已修复：弹层含「公域 / 校园私域 / 兴趣圈子」三级分组，兴趣圈子组带加载中/空态，且弹层打开时圈子为空会懒加载 fetchCircles 一次；弹层面板加高 78vh+底部安全… | 已修复待终验 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R1-CIRCLES-R001 | subpackages/circles/circles/in… | 回归核对【MP-R1-CIRCLE-004「…1 条动」半字硬裁 + MP-R1-CIRCLE-005(R21) 375px 统计/好友行截断】：代码层已按 R20/R21 方案落地。省略号移到文本节点自身（.circle-card__co… | 已修复待终验 | code-findings/次要18.json |

### P1 全量（46 条）

| ID | 页面 | 问题（摘要） | 状态 | 来源 |
|---|---|---|---|---|
| MP-R1-PAGES-HOME-INDEX-001 | pages/home/index | InviteBanner「去邀请」CTA 静默失效：首页 openInvite() 通过 switchTabWithQuery(ROUTES.PROFILE.INDEX, {invite:"1"}) 跳「我的」并桥接 i… | 待修复 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-007 | pages/home/index | 回归核对 MP-R1-HOME-007「关系动态 4 格同色不可辨」：已修复。4 格图标底恢复理想图四色体系（粉 #FFD9E0 / 绿 #BCEFDD / 紫 #E0D9FF / 橙 #FFE4C2，色度加深），且 4… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-009 | pages/home/index | 回归核对 MP-R1-HOME-009「恋爱进度第 4 卡截断+数字序号」：已修复。① 序号圆点已改回理想图语义图标（完成态对勾 CHECK_WHITE_SVG，未完成用该步骤类别图标 TASK_*，模板中不再渲染任何数… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-010 | pages/home/index | 回归核对 MP-R1-HOME-010「社区动态『刷新』语义错（误跳发帖页）」：已修复。右上入口文案改为「查看更多 ›」，点击 emit more → 页面 openCommunity() 跳村口动态流列表页 /subp… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-011 | pages/home/index | 回归核对 MP-R1-HOME-011「社区动态相邻卡同作者」：mock 口径已消除——首页社区动态取 village 最新 4 帖（按 createdAt 降序 slice(0,4)），当前最新 4 帖作者为 mock… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-012 | pages/home/index | 回归核对 MP-R1-HOME-012「『25岁 ·』尾点残留」：已修复（主案例）。meta 行已收口为 computed metaLine = [age岁, campusName, gradeLabel].filter… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-013 | pages/home/index | 回归核对 MP-R1-HOME-013「banner 后约 1/3 屏空白」：已修复（token 层）。R21 已将 --tab-bar-clear-zone 从 360rpx 收敛到 300rpx（design-var… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-014 | pages/home/index | 回归核对 MP-R2-HOME-012「社区动态仅 1 卡（后端去重后不足）」：mock 口径已修复——首页社区动态固定取最新 4 帖（mockPosts 33 条在库，slice(0,4) 必有 4 卡）；real 端… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-015 | pages/home/index | 回归核对 MP-R3-HOME-001「铃铛+角标『3』侵入状态栏/刘海带」：已修复。① 页面根 padding-top: calc(var(--statusbar, env(safe-area-inset-top)) … | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-016 | pages/home/index | 回归核对 MP-R3-HOME-006「滚动后统计区与系统时间叠印」：已修复（源方案在本页）。滚动超过 10px 后顶部 fixed 渐变遮罩（home-page__top-scrim）淡入：高度 statusBarPx… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-017 | pages/home/index | 回归核对 R12-IND-HOME-001「首页偶发白屏（连 TabBar 全无）」：代码层无法证伪/复现（渲染层偶发问题，非本页代码缺陷线索）；维持原判定「DevTools 渲染层偶发 + blank 自动重拍兜底，巡… | 保留 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-HOME-REG-018 | pages/home/index | 回归核对 MP-R1-HOME-014/015/016(R21) 三连（「关注」无 handler 冒泡误跳、作者行静默失效、「加入」按钮态永不变化）：三条主缺陷均已修复。① 关注按钮接通 onFollow（client… | 已修复待终验 | code-findings/PAGES-HOME-INDEX.json |
| MP-R1-PAGES-MESSAGES-INDEX-004 | pages/messages/index | 最近聊天列表右侧「时间」整列永不显示：模板读取 (session as any).lastMessageTime，但数据层 MessageSession 根本没有该字段（真实字段是 lastMessageSentAt），… | 待修复 | code-findings/PAGES-MESSAGES-INDEX.json |
| MP-R1-PAGES-MESSAGES-INDEX-005 | pages/messages/index | 未登录态（且非 mock 模式）下「手机号登录」按钮是死交互：子组件 NotLoggedWaiting 声明并 emit 了 goPhoneLogin，但消息页只监听了 @go-login，goPhoneLogin 无任… | 待修复 | code-findings/PAGES-MESSAGES-INDEX.json |
| MP-R2-MSG-006 | pages/messages/index | 回归核对（代码层）：①助手卡未读角标数据源已修复——现取 会话未读+通知未读 合计；unreadNotificationCount 来自 notifications，由 bootstrap 的 Promise.all 内… | 已修复待终验 | code-findings/PAGES-MESSAGES-INDEX.json |
| MP-R1-PAGES-NEARBY-INDEX-001 | pages/nearby/index | 未登录用户进入附近页（real 模式）必被强跳登录页：onLoad 无条件调用 circleStore.fetchCircles()（index.vue:108，real 分支 GET /api/v1/circles）与… | 待修复 | code-findings/PAGES-NEARBY-INDEX.json |
| MP-R1-NEARBY-005 | pages/nearby/index | 历史问题「热门兴趣圈第 4 卡被右缘裁切」代码层回归核对：已修复。R21 将卡片由 166rpx 收窄至 150rpx（源码 694-698 行注释自证修复意图）。算术验证：视口 750rpx − 页面左右内边距 2×3… | 已修复待终验 | code-findings/PAGES-NEARBY-INDEX.json |
| MP-R1-PROFILE-201 | pages/profile/index | 【回归复发：MP-R7-PROFILE-002 同病】本人主页「我的故事→我的帖子」卡片配图用裸 <image :src> 直连后端相对路径 /api/v1/media/**，mp-weixin 将其当包内文件加载失败（… | 待修复 | code-findings/PAGES-PROFILE-INDEX.json |
| MP-R1-PROFILE-202 | pages/profile/index | 「语音介绍」与「背景图上传/编辑」两个功能的全部 UI 挂载点都位于不可达分支：唯一模板挂载在①legacy 槽 <template #legacy v-if="false">（永不渲染）和②他人主页 v-else 分支… | 待修复 | code-findings/PAGES-PROFILE-INDEX.json |
| MP-R1-CAMPUSPOST-002 | subpackages/campus/campus/post… | real 模式配图上传 Idempotency-Key 恒定冲突：本页上传循环对每张图硬编码 name:"campus-topic.jpg"，而 api.ts 的 Idempotency-Key 按「endpoint\|… | 待修复 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json |
| MP-R1-POSTTOPIC-001 | subpackages/circles/circles/po… | 回归核对历史缺陷 MP-R1-POSTTOPIC-001(R21)（圈内发话题 circleId 未生效、帖子错进村口 posts 流）：代码层核对确认已修复。修复链完整——①入口带参：circle-home.vue:3… | 已修复待终验 | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json |
| MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-001 | subpackages/discover-extra/dis… | 回归核对 MP-R3-MSUCCESS-001/002「返回/截图钮侵入状态栏、右上钮与胶囊碰撞」：代码层确认已修复且机制完整。顶部 nav 的纵向位置由 JS 注入的 --statusbar（uni.getSystem… | 已验证 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json |
| MP-R1-VILLAGE-INDEX-101 | subpackages/village/village/in… | 频道切换主链路是死代码：ChannelTabs 在 select() 里先 emit("update:modelValue") 再 emit("change")，Vue3 emit 同步调用父级监听器，父页 v-mode… | 待修复 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json |
| MP-R1-VILLAGE-INDEX-102 | subpackages/village/village/in… | ActivityCard 的「报名」按钮冒泡未阻断，mp-weixin 上点击报名会同时触发报名和打开活动详情。组件在 enroll(e) 里靠 `e?.stopPropagation?.()` 阻断冒泡，但 uni-a… | 待修复 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json |
| MP-R1-VILLAGE-INDEX-103 | subpackages/village/village/in… | 回归核对 MP-R2-VILL-013「晚霞帖配热饮图（图文不符）」：原描述中的「热饮图」具体配对已不存在，但同一缺陷类在原帖位仍在——今日广场 mock 帖 post-7 文案「周末去爬山，山顶的日落太治愈了」配的是 … | 待修复 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json |
| MP-R1-POST-101 | subpackages/village/village/po… | 成功发布到圈子后，下一次进入发布页会静默恢复「圈子目标」但解析不出圈子名，「发布到」卡片显示成「个人动态 / 默认公开 · 所有人可见」，而实际提交走 circleStore.createTopic 进圈——UI 与提交… | 待修复 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json |
| MP-R1-PUBLISH-001 | subpackages/village/village/pu… | 「谁可以看」选择的 visibility 在 real 模式被后端静默丢弃：页面把 visibility 随 POST /api/posts 提交，但后端 CreatePostRequest 记录类没有 visibili… | 待修复 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R1-PUB-016 | subpackages/village/village/pu… | 回归核对（R21）：正文上限页面 1000 vs store 校验 500。本页已修复：maxlength 与计数器直接绑定 stores/village 的 MAX_CONTENT_LENGTH=500，与 store… | 已修复待终验 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R2-VILL-013 | subpackages/village/village（vi… | 回归核对：晚霞帖图文不符。代码层可证实：晚霞帖（标题「今日份图书馆晚霞，治愈了」）配图指向占位资源 POST_SUNRISE_1=/uploads/mock/post-sunrise-1.jpg——语义上就是用「日出」占… | 待修复 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R1-DETAIL-001 | subpackages/village/village/de… | 帖子图片全屏查看层（R19）样式整体失效：detail.vue 的 </style>（3218 行）之后还有一段孤立 CSS（3220-3235 行，.image-viewer / .image-viewer__img）… | 待修复 | code-findings/次要18.json |
| MP-R1-TAGPOSTS-R001 | subpackages/village/village/ta… | 回归核对【MP-R1-TAGPOSTS-001 分页 off-by-one 列表恒空】：代码层已修复。mock 分支取片起点改为 (currentPageNum-1)*PAGE_SIZE（原 from=page*PAGE… | 已修复待终验 | code-findings/次要18.json |
| MP-R1-TAGPOSTS-R002 | subpackages/village/village/ta… | 回归核对【MP-R1-TAGPOSTS-002 栈=1 返回失效/缺参 switchTab 卡死】：代码层已修复。goBack 栈>1 navigateBack、否则 reLaunch 到村口页（非 tabBar 页不再… | 已修复待终验 | code-findings/次要18.json |
| MP-R1-CIRCLEHOME-R002 | subpackages/circles/circles/ci… | 回归核对【R10-P1-001 冷启动/深链误判「圈子不存在或已解散」（G6 断言）】：代码层已修复。circlesFetchSettled 初始为 useMock()，real 模式拉取落定前 isUnknownCir… | 已修复待终验 | code-findings/次要18.json |
| MP-R1-CAMPUSTOPIC-R001 | subpackages/campus/campus/topi… | 回归核对【R12-IND-TOPICS-001 401 静默成空错误信息→误渲染「话题不存在」】：campus 侧代码层已修复。fetchCampusTopicDetail catch 读取 error.status/h… | 已修复待终验 | code-findings/次要18.json |
| MP-R8-LIKES-001 | subpackages/discover-extra/lik… | 回归核对：「喜欢我的」永远空态（原 isUnlocked=isProfileComplete 守卫永不满足→fetchLikes 永不执行）。代码层验证已修复：门槛降为 isLoggedIn，并补 watch（登录态异步… | 已修复待终验 | code-findings/次要19.json |
| MP-R3-DAILY-001/003 | subpackages/tools/daily-questi… | 回归核对：头部标题与系统时间叠印、返回钮被盖。代码层验证已修复：.dq-header padding-top=calc(var(--statusbar, env)+sp-4)，--statusbar 由 useMenuB… | 已修复待终验 | code-findings/次要19.json |
| MP-R1-HELP-101 | subpackages/tools/help/index | 【回归证实·MP-R1-HELP-001 未修】「客服邮箱-复制」复制到剪贴板的是 i18n 文案标签「客服邮箱」而非真实邮箱地址，且 toast 提示「邮箱已复制」。i18n help 段不存在任何真实邮箱地址 key… | 待修复 | code-findings/次要20.json |
| MP-R1-LNEARBY-101 | subpackages/tools/love-center/… | 附近的人页滑动链路与 discover store 脱节（单一数据源破坏）：页面把推荐数据存进本地 ref cards（:37,:65-66），从不写入 discoverStore.cards，但 handleSwipe… | 待修复 | code-findings/次要20.json |
| MP-R1-LMBTI-101 | subpackages/tools/love-center/… | MBTI 页自定义返回键固定在右上角（right: var(--sp-4)=8px、top: statusbar+8px、64×64rpx=32×32px），与微信胶囊（项目自证标准 87×32px、距右缘 7px、to… | 待修复 | code-findings/次要20.json |
| MP-R1-LNEARBY-201 | subpackages/tools/love-center/… | 【回归核对·已修复】R12-IND-NEARBY-LC-001「附近的人恒 0 人」：后端 filterByDistanceMax 对 distanceText 缺失条目改为保留（带本问题编号注释），前端已补 dista… | 已验证 | code-findings/次要20.json |
| MP-R1-LNEARBY-202 | subpackages/tools/love-center/… | 【回归核对·已修复（残留新问题）】R12-IND-NEARBY-LC-002「返回键被 space-between 推到胶囊正下方」：返回键已移到标题左侧左对齐，不再处于胶囊区。残留：space-between 使标题贴… | 已验证 | code-findings/次要20.json |
| MP-R1-LNEARBY-203 | pages/nearby/index（线索 page=nea… | 【回归核对·已修复】MP-R1-NEARBY-005「热门兴趣圈第 4 卡被右缘裁切」：R21 已将卡片 166→150rpx 收窄并收敛右内边距。几何复核：视口 750rpx，左 padding 8 + 4×150 +… | 已验证 | code-findings/次要20.json |
| MP-R1-LCONSULT-201 | subpackages/tools/love-center/… | 【回归核对·已修复】R10-P1-002「封存态仍展示 ¥99/129/159 课程+报名」+ R21-CONSULTING-001 key 契约风险：本页已接 commerceSealed 闸（!isCommerceO… | 已验证 | code-findings/次要20.json |
| MP-R1-VERIFY-INDEX-001 | subpackages/profile-extra/veri… | 认证中心（恋爱认证）页模板中 nav-bar 位于 safe-top 之前：navigationStyle=custom（pages.json:36 全局自定义导航）下 nav-bar 从 y=0 起排，标题与返回键顶进… | 待修复 | code-findings/次要21.json |
| MP-R1-OTHER-002 | subpackages/profile-extra/prof… | 「送心动卡/悄悄话」（whisper）事件链断裂，功能在他人主页完全不可达：other.vue 监听 ProfileShell 的 @whisper 并挂载 WhisperComposeSheet，但事件链上游无人 em… | 待修复 | code-findings/次要21.json |
| MP-R1-DND-002 | subpackages/profile-extra/sett… | 免打扰设置页自绘导航整体顶进状态栏：navigationStyle=custom（pages.json:36 globalStyle）下页面从 y=0 开始渲染，本页把 <view class="nav-bar">（固定… | 待修复 | code-findings/次要22.json |

（P2×94/P3×175/P4×86 全量见 issue-matrix.md。）

## 三、偏差与无法验证热点（交互侧）

- 偏差用例按页面分布：CAMPUSINDEX×1、CAMPUSPOST×1、CIRCLEHOME×5、POSTTOPIC×2、TOPICDETAIL×1、campus/certification×1、campus/topic-detail×2、home/segment×1、likes/index×1、pages/discover/index×2、pages/home/index×3、pages/messages/index×3、pages/nearby/index×7、pages/profile/index×1、subpackages/campus/campus/hub×5、subpackages/chat/chat-session/index×6、subpackages/chat/official-chat/index×6、subpackages/circles/circles/index×1、subpackages/discover-extra/discover/matching×1、subpackages/profile-extra/feedback/history×2、subpackages/profile-extra/profile/other×1、subpackages/profile-extra/profile/tasks×2、subpackages/profile-extra/profile/visitors×2、subpackages/profile-extra/settings/dnd×1、subpackages/profile-extra/settings/index×2、subpackages/profile-extra/verification/index×1、subpackages/profile-extra/verification/real-name×1、subpackages/setup/campus/index×1、subpackages/setup/interest/index×1、subpackages/tools/heart-signals/index×2、subpackages/tools/help/index×1、subpackages/tools/love-center/nearby×7、subpackages/village/village/detail×1、subpackages/village/village/history×1、subpackages/village/village/publish×2、subpackages/village/village/tag-posts×2。
- 「无法验证」两个口径：判定为「无法验证」的用例 59 条（STATUS 列）＋各判定文件 unverifiable 清单另行登记 127 项（两者有交叠、口径不同，均源于工具边界：原生弹层/手势/scroll-view 原生滚动/maxlength/自定义 tabBar 等），逐项见 interaction-matrix.md 各文件末尾汇总；须真机人工补验。
- console 证据：各取证文件均落盘 console 日志；代表性结论（login）「全部交互过程 console 无 TypeError/ReferenceError/EXCEPTION；error 级均为登录失败时 Sentry 按设计上报」（interact/PAGES-LOGIN-INDEX.json consoleSummary）。

## 四、每页使用对比与功能目标汇总

> 说明：任务书指定来源 page-compare/ 不存在；下表为从 interact 判定文件（page/pageName/notes/checks 的实际操作与身份）与 code-findings（scope/coverage）归纳的每页使用与功能对照，全部信息取自上述文件原文。

### 4.1 主包与注册链路（逐页专项取证）

| 页面 | 功能目标（依据 pageName/scope/用例原文） | 交互用例 | ✅/❌/⚠️ | 代码审查 | 发现数 |
|---|---|---|---|---|---|
| pages/login/index（登录页） | 登录页：微信一键登录/验证码与密码登录表单/协议勾选/游客「稍后再看」/DEV 演示入口/未成年拦截与授权拒绝兜底 | 22 | 22/0/0 | code-findings/PAGES-LOGIN-INDEX.json | 15 |
| pages/register/index（注册页） | 注册页：手机号+验证码+密码+昵称注册、短信倒计时、协议勾选、重复注册拦截 | 39 | 38/0/1 | code-findings/PAGES-REGISTER-INDEX.json | 7 |
| pages/register/success（注册成功页） | 注册成功页：三态出口（完善资料/进首页/返回登录）与会话生效核对 | 13 | 13/0/0 | code-findings/PAGES-REGISTER-SUCCESS.json | 6 |
| pages/home/index（首页（tabBar）） | 首页（tabBar）：今日推荐/恋爱进度/关系动态/兴趣推荐/附近的人/社区动态/邀请 banner/底部弹层 | 42 | 39/3/0 | code-findings/PAGES-HOME-INDEX.json | 28 |
| pages/discover/index（寻觅（tabBar）） | 寻觅页（tabBar）：匹配卡滑动喜欢/跳过、游客入口胶囊、每日配额、匹配页往返 | 38 | 32/2/4 | code-findings/PAGES-DISCOVER-INDEX.json | 11 |
| pages/nearby/index（附近（tabBar）） | 附近页（tabBar）：同校/附近的人卡片流、PostCard 内层交互、关注/喜欢链路 | 43 | 29/7/7 | code-findings/PAGES-NEARBY-INDEX.json | 12 |
| pages/messages/index（消息（tabBar）） | 消息页（tabBar）：会话列表、置顶/免打扰、官方号与活动入口卡 | 29 | 24/3/2 | code-findings/PAGES-MESSAGES-INDEX.json | 19 |
| pages/profile/index（我的（tabBar）） | 我的页（tabBar）：资料头/四格统计/功能入口矩阵/发动态 FAB | 26 | 25/1/0 | code-findings/PAGES-PROFILE-INDEX.json | 14 |

### 4.2 分包页簇（逐页专项取证）

| 页面 | 功能目标 | 交互用例 | ✅/❌/⚠️ | 代码审查 | 发现数 |
|---|---|---|---|---|---|
| subpackages/village/village/index（村口广场） | 村口广场：频道 tab 切换/帖子流加载与分页/置顶帖/热门话题/活动报名/发布入口/校园门禁 | 21 | 15/0/6 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json | 13 |
| subpackages/village/village/post（村口发帖） | 村口发帖页：正文输入/话题选择/配图/渠道弹层/发布与草稿 | 25 | 24/0/1 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json | 11 |
| subpackages/village/village/publish（统一发布动态页） | 统一发布动态页（发布主入口）：草稿快照/话题合并/渠道弹层/双身份 | 38 | 33/2/3 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json | 19 |
| subpackages/village/village/detail（帖子详情） | 帖子详情：正文/评论发布与点赞/帖子点赞收藏/作者关注/图片全屏/举报/返回链 | 18 | 15/1/2 | code-findings/次要18.json | 41 |
| subpackages/village/village/tag-posts（标签帖列表） | 标签帖列表：按标签分页拉取/空态/缺参兜底/返回链 | 6 | 3/2/1 | code-findings/次要18.json | 41 |
| subpackages/village/village/history（浏览历史） | 浏览历史：列表/清空记录/确认弹窗/返回链 | 7 | 6/1/0 | code-findings/次要18.json | 41 |
| subpackages/circles/circles/index（兴趣圈列表） | 兴趣圈列表：圈卡统计行/加入·退出/搜索入口/热门标 | 12 | 9/1/2 | code-findings/次要18.json | 41 |
| subpackages/circles/circles/topics（圈话题列表） | 圈话题列表：话题卡/封面/发布入口/热门分组 | 18 | 18/0/0 | code-findings/次要18.json | 41 |
| subpackages/circles/circles/topic-detail（圈话题详情） | 圈话题详情：回复计数与列表一致性/回复发布/点赞 | 13 | 11/1/1 | code-findings/次要18.json | 41 |
| subpackages/circles/circles/post-topic（圈内发话题） | 圈内发话题：话题选择/正文与配图/发布流向（circleId 生效性） | 16 | 14/2/0 | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json | 11 |
| subpackages/circles/circles/circle-home（圈主页） | 圈主页：冷启动深链/动态卡交互/加入状态/分享与更多 | 12 | 7/5/0 | code-findings/次要18.json | 41 |
| subpackages/campus/campus/index（校园圈首页） | 校园圈首页：校名渲染（URL 解码）/话题列表/话题详情入口 | 12 | 11/1/0 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json | 8 |
| subpackages/campus/campus/hub（校园圈 hub） | 校园圈 hub：认证徽章/统计行/认证入口/胶囊避让 | 22 | 17/5/0 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json | 15 |
| subpackages/campus/campus/post-topic（校园发话题） | 校园发话题：表单校验/空提交拦截/配图上传/发布 | 15 | 13/1/1 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json | 13 |
| subpackages/campus/campus/topic-detail（校园话题详情） | 校园话题详情：回复分页与重复追加/输入 maxlength/401 错误态 | 12 | 10/2/0 | code-findings/次要18.json | 41 |
| subpackages/chat/chat-session/index（单聊会话） | 单聊会话页：气泡/长按菜单/转发/撤回/临时会话/输入发送 | 49 | 41/6/2 | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json | 20 |
| subpackages/discover-extra/discover/matching（匹配中） | 匹配中页：匹配动画/无上下文兜底返回 | 11 | 9/1/1 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json | 10 |
| subpackages/discover-extra/discover/match-success（匹配成功） | 匹配成功页：双头像/联系交换入口/状态栏避让 | 15 | 15/0/0 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json | 8 |

### 4.3 二线页簇（批次取证，代码审查成簇）

| 批次 | 覆盖页面 | 功能目标 | 交互用例 | ✅/❌/⚠️ | 代码审查 | 发现数 |
|---|---|---|---|---|---|---|
| 次要15 | 校园话题详情/认证/细分发现/附近的人/寻觅历史/喜欢页 | 校园话题详情/认证/细分发现/附近的人/寻觅历史/喜欢页（61 用例） | 61 | 54/5/2 | code-findings/次要19.json | 26 |
| 次要16 | 喜欢·访客/每日一题/恋爱中心/帮助/官方客服/反馈历史/安全中心/隐私/搜索 | 喜欢·访客/每日一题/恋爱中心/帮助/官方客服/反馈历史/安全中心/隐私/搜索（76 用例） | 76 | 61/1/14 | code-findings/次要20.json | 20 |
| 次要17 | 心动信号/活动详情/恋爱中心附近·MBTI·咨询/设置 | 心动信号/活动详情/恋爱中心附近·MBTI·咨询/设置（85 用例） | 85 | 70/11/4 | code-findings/次要21.json | 15 |
| 次要18 | 校园认证/实名/访客/他人主页/位置/隐私 | 校园认证/实名/访客/他人主页/位置/隐私（51 用例） | 51 | 45/5/1 | code-findings/次要22.json | 20 |
| 次要19 | 相册/收藏/任务/免打扰/反馈历史/官方客服 | 相册/收藏/任务/免打扰/反馈历史/官方客服（63 用例） | 63 | 52/11/0 | code-findings/次要22.json | 20 |
| 次要20 | 注册向导（资料/校园/日程/推荐偏好/兴趣/开发者） | 注册向导：资料/校园/日程/推荐偏好/兴趣/开发者入口（56 用例） | 56 | 52/2/2 | code-findings/次要23.json | 24 |
| 次要21 | 展示入口/意见反馈/讨论圈/活动/协议页 | 展示入口/意见反馈/讨论圈/活动/隐私与用户协议（41 用例） | 41 | 39/0/2 | code-findings/次要23.json | 24 |

> 注：4.2/4.3 表中「交互用例」为按页拆分后的计数（批次文件的用例按 check.page 归属到具体页，TOPICS/POSTTOPIC 等短代码页名已映射到实际路由）；批次与其代码审查文件的对应按页面主题归组，非一一映射（次要22/23 两条 code-findings 覆盖多个批次页面簇）。市场化封存页簇（market×3/vip×3）仅有代码审查 code-findings/次要24.json（19 条），无专项交互取证——封存行为依赖 commerce.* 开关，历史口径见 baseline T10。

### 4.4 使用方式对比要点（身份/入口/前置）

- **身份双轨**：A=满配 mock 账号（boot-verify-A.log 实测 logged-in userId=user-1001；campusVerified=true），token 注入 + session.bootstrap() 两步法；B=游客/新号（guest-login 现签 token，如 mock 游客 100151，或注册向导新建号）——publish/messages/nearby/hub/discover 等页均做了 A/B 双身份对照；mock 构建下「未登录态」经 evaluate 清 token + $patch({userSession:null}) 实现（bootstrap 仅 App.onLaunch 执行一次，reLaunch 不重跑）。
- **入口差异**：tab 页经 reLaunch/switchTab 直达；带参页（chat-session/tag-posts/topic-detail/circle-home）做了冷启动深链直开与返回链核对；发布页含「统一发布入口 publish」与「村口发帖 post」双实现并存（产品决议保留，行为一致性列为回归风险）。
- **封存与门禁**：市场化页簇（次要24）审查口径为 commerce.*=false 封存行为；校园圈/村口部分入口有 SchoolCircleGate/campusVerified 门禁（A 身份过门禁、B 身份验拦截）。

## 五、代码审查主题热点（按类别）

- **Architecture（59 条）** 代表：MP-R1-PUBLISH-012[P2]、MP-R1-PUBLISH-004[P2]、MP-R1-PROFILE-203[P2]、MP-R1-PAGES-NEARBY-INDEX-002[P2]、MP-R1-PAGES-MESSAGES-INDEX-006[P2]…（全量见 issue-matrix.md）
- **Consistency（59 条）** 代表：MP-R1-PUBLISH-001[P1]、MP-R1-TASKS-004[P2]、MP-R1-LIKES-103[P2]、MP-R1-PUBLISH-005[P2]、MP-R1-PROFILE-207[P2]…（全量见 issue-matrix.md）
- **Function（59 条）** 代表：MP-R1-OTHER-002[P1]、MP-R1-LNEARBY-101[P1]、MP-R1-POST-101[P1]、MP-R1-CAMPUSPOST-002[P1]、MP-R1-PROFILE-202[P1]…（全量见 issue-matrix.md）
- **UI（38 条）** 代表：MP-R1-LMBTI-101[P1]、MP-R1-OTHER-004[P2]、MP-R1-SEARCH-102[P2]、MP-R1-CAMPUSINDEX-004[P2]、MP-R1-CAMPUS-HUB-004[P2]…（全量见 issue-matrix.md）
- **Regression（82 条）** 代表：MP-R1-CIRCLES-R001[P0]、MP-R2-PUB-002[P0]、MP-R1-VILLAGE-INDEX-112[P0]、MP-R1-MATCHING-001[P0]、MP-R1-DND-002[P1]…（全量见 issue-matrix.md）
- **MiniProgram（22 条）** 代表：MP-R1-SAFEAREA-001[P2]、MP-R1-DISCOVERACTIVITIES-001[P2]、MP-R1-POSTTOPIC-007[P2]、MP-R1-CAMPUSPOST-003[P2]、MP-R1-PAGES-MESSAGES-INDEX-010[P2]…（全量见 issue-matrix.md）
- **Data（26 条）** 代表：MP-R1-OFFICIALCHAT-004[P2]、MP-R1-VERIFY-INDEX-003[P2]、MP-R1-PRIVACY-001[P2]、MP-R1-HSIGNALS-101[P2]、MP-R1-CIRCLEHOME-001[P2]…（全量见 issue-matrix.md）
- **Interaction（32 条）** 代表：MP-R1-VILLAGE-INDEX-102[P1]、MP-R1-VILLAGE-INDEX-101[P1]、MP-R1-PAGES-MESSAGES-INDEX-005[P1]、MP-R1-VIP-001[P2]、MP-R1-VERIFY-INDEX-002[P2]…（全量见 issue-matrix.md）
- **UX（15 条）** 代表：MP-R1-PAGES-MESSAGES-INDEX-008[P2]、MP-R1-WALLET-003[P3]、MP-R1-BILLS-002[P3]、MP-R1-SEARCH-103[P3]、MP-R1-PUBLISH-010[P3]…（全量见 issue-matrix.md）
- **Performance（4 条）** 代表：MP-R1-PAGES-MESSAGES-INDEX-012[P3]、MP-R1-HSIGNALS-102[P4]、MP-R1-CIRCLEHOME-006[P4]、MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-017[P4]…（全量见 issue-matrix.md）

## 六、后续处置建议（依据发现状态统计）

1. **P0×4 立即修复**（见第二节全列表）；P1×46 中 20 条仍为待修复态，建议按 issue-matrix 顺序清零。
2. **已修复待终验 50 条**：需在本轮真机/开发者工具终验闭环（interact 侧已对部分完成运行时复核，如首页 11 项历史回归 ✓）。
3. **无法验证 59 条用例 + R21 遗留真机清单**（baseline §三）：安排真机人工抽检批次（手势/原生弹层/滚动/maxlength/分享/tabBar）。
4. **回归防线**：baseline §七 高风险区（返回栈底守卫、滚底、草稿闭环、mock 固件写穿、@catchtap 清零复查）在本轮 code-findings 中已有对应 Regression 核对条目，逐条判定见 regression-report.md。

## 七、本报告集文件

| 文件 | 内容 |
|---|---|
| audit-report.md | 本文件：总量结论、P0/P1 全量、每页使用对比与功能目标汇总 |
| issue-matrix.md | 代码审查 405 条 + 交互层 69 条逐条矩阵（ID/级别/类别/状态/关联用例/摘要/证据/修复建议） |
| interaction-matrix.md | 995 条交互用例逐条（PRE/ACTION/EXPECTED/OBSERVED/EVIDENCE/STATUS） |
| screenshot-matrix.md | 截图逐张矩阵 + 存在性核对 + console/过程证据清单 |
| regression-report.md | 历史回归核对逐条（代码层 82 条 + 交互专项 + coverage 核对） |
| git-summary.md | 本轮落盘时的 git 状态实测（分支/HEAD/工作区/最近提交） |

> 诚实性声明：本报告集所有结论均可回溯到上述来源文件的原文（路径+字段/行号）；来源不存在的部分已如实标注「不存在」而非推断填充。既有 round-1/audit-report.md 与 screenshot-matrix.md 为旧视觉周期（2026-09-10，R21 对抗验收口径）留档，本轮按任务书以 R1（2026-09-22）数据源重写覆盖。