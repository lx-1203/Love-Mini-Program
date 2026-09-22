# Round 2 审计报告（R2 · 2026-09-22）

- **范围**：微信小程序客户端（apps/client）主包 6 个 tab 页 + 注册链路 + 村口/圈子/校园/聊天/匹配/发布等分包页簇 + 二线页簇（认证/实名/设置/工具/市场化封存页）。后端仅在与前端契约交叉处对照（如 CreatePostRequest、SmsCode 返回）。
- **方法**：A2/Layer A 只读代码审查（23 份 code-findings，全文精读页面与引用链，逐条给 file:line 证据，不驱动开发者工具、不截图、不改业务代码）。任务书另指定交互判定（interact/）、历史回归核对（regression/）、页面使用对比（page-compare/）三类来源，前两者目录**不存在**（见第一节声明），页面使用对比改由 scope/coverage 原文归纳（第四节）。
- **环境**：只读静态审查，无构建/无模拟器/无测试执行；本轮报告生成时工作区已有并行修复批改动（见第三节实测）。

## 一、数据来源与缺口（如实声明）

| 来源 | 状态 | 规模 |
|---|---|---|
| reports/audit/round-2/code-findings/（23 份 JSON） | ✅ 在（逐份读取） | 295 条发现（P0×3、P1×21、P2×47、P3×134、P4×90） |
| reports/audit/round-2/interact/ | ❌ **不存在**（本会话多次 ls 核实，生成前最后复核仍缺） | 交互判定 0 条；interaction-matrix.md 以 coverage/checksPassed/硬约束扫描原文重排，并如实标注非运行时判定 |
| reports/audit/round-2/regression/ | ❌ **不存在**（本会话多次 ls 核实） | 回归判定改从 code-findings category=Regression（54 条）+ regressionVerification/regressionCluesVerdict 专项字段提取 → regression-report.md |
| reports/audit/round-2/page-compare/ | ❌ **不存在**（本会话多次 ls 核实） | 每页使用对比改由 scope/meta/coverage 原文归纳（见第四节） |
| reports/audit/baseline/historical-issues.md | ✅ 在（2026-09-22 版，全文通读） | 历史线索库（15 系统性主题 + P0/P1/P2 清单 + 未闭环 13 项） |
| reports/screenshots/ 下本轮目录 | ❌ 无本轮新目录（round-2* 不存在） | 本轮发现证据均为代码层取证；个别发现旁证引用上轮截图 6 处，存在性核对见 screenshot-matrix.md |

## 二、总量结论

- 代码审查发现 **295 条**：P0×3、P1×21、P2×47、P3×134、P4×90；处置状态：待修复×265、已修复待终验×15、已验证×14、保留×1。
- 类别分布：Consistency×58、Regression×54、Function×42、Architecture×37、UI×33、Interaction×23、MiniProgram×17、Data×16、UX×6、Performance×3、状态管理×2、Style×1、API错误处理×1、Async×1、API 错误处理×1。
- 历史回归核对：category=Regression 共 54 条 + 两个专项核销字段，逐条判定见 regression-report.md。
- 覆盖记录：coverage 逐页核对语句与 checksPassed/硬约束扫描共 133 条，见 interaction-matrix.md。

### P0 全量（3 条）

| ID | 页面 | 问题（摘要） | 状态 | 来源 |
|---|---|---|---|---|
| MP-R2-MATCHING-001 | matching | 历史线索 MP-R3-MATCHING-001「匹配页打不开」R2 回归核对：证伪结论维持成立，兜底未被修坏。无 pendingCardId/pendingAction 且 URL 无 cardId/action/userId 上下文进入本页时，onLoad 走 setTimeout(goBack, 200) 自动返回（R11-G2 语义：防死页的「设计内行为」），goBack 对空栈兜底 swi… | 已验证 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json |
| MP-R2-VILLAGE-INDEX-R01 | subpackages/village/village/index | 历史缺陷 MP-R1-VILLAGE-002（搜索框右端伸进胶囊下方被遮挡）回归核对：代码层修复在位。头部容器 padding-right 以 --capsule-right 实测值 + 112px 避让，根节点绑定 useMenuButtonRect 注入的 CSS 变量；mp-weixin 实测胶囊间隙、H5 变量归 0 回退设计值。 | 已修复待终验 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json |
| MP-R2-PUB-002-R | subpackages/village/village/publish | 回归核对 MP-R2-PUB-002「渠道弹层缺『兴趣圈子』组」：当前代码该分组在位——公域/校园私域/兴趣圈子三组齐全，「兴趣圈子 · 圈内成员可见」组含已加入圈子选项；无参直入时弹层打开即懒加载 fetchCircles，加载中/空态均有占位；弹层 78vh + 底部安全区不再裁切末行。判定：已修复（本轮代码层验证通过）。 | 已验证 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |

### P1 全量（21 条）

| ID | 页面 | 问题（摘要） | 状态 | 来源 |
|---|---|---|---|---|
| MP-R2-PAGES-LOGIN-INDEX-001 | pages/login/index | 登录页密码输入框使用 type="password"（index.vue:769），但微信小程序 input 组件的 type 合法值仅为 text/number/idcard/digit/safe-password/nickname（官方文档），不存在 password 值，密码显示由独立布尔属性 password 控制；uni-app 编译器不做转换，编译产物原样透传 type="passwo… | 待修复 | code-findings/PAGES-LOGIN-INDEX.json |
| MP-R2-PAGES-MESSAGES-INDEX-010 | pages/messages/index | 【历史回归核对·MP-R2-MSG-006】代码层验证为已修复：(a) 助手卡红色未读角标数据源已改为「会话未读+通知未读」合计（messages/index.vue:399-401），unreadNotificationCount 为 store getter（messages.ts:518），其数据源 notifications 由 bootstrap fetchAll 内的 fetchNot… | 已验证 | code-findings/PAGES-MESSAGES-INDEX.json |
| MP-R2-PAGES-NEARBY-INDEX-001 | pages/nearby/index | real 模式未登录用户授权定位后仍被强踢登录页：R1-PAGES-NEARBY-INDEX-001 修复给 /circles、/posts、活动接口加了 canFetchProtected() 登录门（index.vue:66-68、117、133、143、163），但 initLocation 内的坐标上报 reportLocation（index.vue:107）在该门之外无条件执行。POS… | 待修复 | code-findings/PAGES-NEARBY-INDEX.json |
| MP-R2-NEARBY-005 | pages/nearby/index | 历史问题 MP-R1-NEARBY-005「热门兴趣圈第 4 卡被右缘裁切」代码层回归核对：已修复（R21 收窄方案在位）。当前 .circle-mini 宽 150rpx（index.vue:720-730，含「R21：166→150rpx 收窄，保证 4 张卡完整落在视口内」自证注释）。算术验证：视口 750rpx − 页面左右内边距 2×32rpx（index.vue:555）= 686rp… | 已修复待终验 | code-findings/PAGES-NEARBY-INDEX.json |
| MP-R2-PROFILE-001 | pages/profile/index | 回归核对：他人态顶部操作栏（分享/设置/匹配 chip）此前叠入状态栏带并被胶囊遮挡。现代码已修复——顶栏 top 锚点改为 状态栏高度+20px+sp-5，且整组按钮右侧预留胶囊安全距离。 | 已修复待终验 | code-findings/PAGES-PROFILE-INDEX.json |
| MP-R2-PROFILE-002 | pages/profile/index | 回归核对：头像/照片墙/背景/动态配图相对路径（/api/v1/media/**、/uploads/**）直连 <image> 加载失败的问题，代码层已在所有渲染边界统一经 resolveMediaUrl/resolveMediaUrls 解析（拼 apiRoot + token）；utils/media.ts 对 MEDIA_PROXY_PREFIX 与 /uploads/ 均有重写分支；Saf… | 已修复待终验 | code-findings/PAGES-PROFILE-INDEX.json |
| MP-R2-PROFILE-003 | pages/profile/index | 回归核对：相册入口已改用真实存在的 ROUTES.PROFILE.ALBUM 常量，且目标页面已在 pages.json 注册，链路闭合。 | 已修复待终验 | code-findings/PAGES-PROFILE-INDEX.json |
| MP-R2-PROFILE-004 | pages/profile/index | 回归核对：①FAB 已组件化为 GlobalPublishFab，bottom 按 custom-tab-bar 白面板实际总高（184rpx+2×env）重新核算并留 16rpx 间距，z-index 1000；②头像操作菜单已从原生 uni.showActionSheet 替换为项目统一 BottomSheet 半屏弹层（弹出时自动隐藏自定义 tabBar），四个菜单项行为接线完整。 | 已修复待终验 | code-findings/PAGES-PROFILE-INDEX.json |
| MP-R2-CAMPUSINDEX-001 | subpackages/campus/campus/index | 话题列表 scroll-view 无有界高度，real 模式下列表超过一屏后 @scrolltolower 翻页永不触发（首页 10 条之后的帖子永远不可见）。根因：.campus-page 仅声明 min-height:100%（min 是下限不是约束），内容超屏时容器随内容增长，flex:1 的 .topic-scroll 被拉伸到全部内容高度，scroll-view 自身不产生内部滚动，触底… | 待修复 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json |
| MP-R2-CHAT-CHAT-SESSION-INDEX-001 | subpackages/chat/chat-session/index | 「以 errorMessage 是否变化判定失败」的差分检测模式在『连续两次相同错误文案』时失效，重新引入 MP-R1 修复批要消灭的缺陷（消息正文无反馈丢失 / 假空会话）。发送链路（index.vue:1114-1119）：errBefore 取自 chatStore.errorMessage，而 chatStore.sendText 成功路径从不清 errorMessage、失败路径只覆盖为… | 待修复 | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json |
| MP-R2-POSTTOPIC-001 | subpackages/circles/circles/post-topic | real 模式下「帖子模式 / campus 兜底」提交分支把本地临时图片路径（wxfile://tmp_…、http://tmp/…）原样塞进 villageStore.createPost，未经 uploadPostImage 换取可访问 URL → 带图发布后 feed 内配图必然裂图（或被后端拒绝）。图片上传转换（363-382 行）只作用于下方话题模式（createTopic）路径，31… | 待修复 | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json |
| MP-R1-POSTTOPIC-001 | subpackages/circles/circles/post-topic | 回归复核（R21 线索）：圈内发话题 circleId 未生效、帖子错进村口 posts 流——代码层确认已修复：改用 onLoad(query) 路由取参，circleId 非空时 resolvedCircleId 恒取 circleId 并走 createTopic（POST /circles/{id}/topics），不再落入 posts 流分支。 | 已修复待终验 | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json |
| MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-001 | subpackages/discover-extra/discover/match-su… | 回归核对 MP-R3-MSUCCESS-001/002「返回/截图钮侵入状态栏、右上钮与胶囊碰撞」：本轮代码层复核确认修复链完整无回归。①纵向：--statusbar 由 useStatusBarHeight 模块级 uni.getSystemInfoSync().statusBarHeight 注入（非 env(safe-area-inset-top)，DevTools env 恒 0 的坑已绕… | 已验证 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json |
| MP-R2-MATCHING-002 | matching | 【R2 新发现】匹配动画双头像未过统一媒体出口 resolveMediaUrl，real 模式下 myAvatar 与 partnerAvatar 均为服务端原始路径直出，mp-weixin <image> 必加载失败（相对路径被当包内文件、且 <image> 无法携带鉴权头），页面核心视觉（双头像碰撞动画）在 real 模式渲染为空圆。同子包 match-success.vue 已修同类缺陷（M… | 待修复 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json |
| MP-R2-VILLAGE-INDEX-R03 | subpackages/village/village/index | 历史缺陷 MP-R1-VILLAGE-001(R21)（mock 发布的新帖不进今日广场 feed）回归核对：修复闭环在代码层成立。发布链路 post.vue→store.createPost(mock) unshift 进 posts；返回村口 onShow 重拉时 mock 分支旁路 30s TTL，fetchPosts 以 fixtureIds 识别『本会话自建帖』合并进重建列表；今日广场 … | 已验证 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json |
| MP-R2-PUB-101 | subpackages/village/village/publish | restoreDraft 缺 targetType==='friends'（个人日常）分支：friends 草稿经无参入口恢复后 targetType 回落 'general'，而 visibility 被恢复为 'friends'——同屏「目标卡=个人动态/默认公开·所有人可见」与「谁可以看=仅喜欢/关注的人可见」矛盾；且后端 CreatePostRequest 根本无 visibility 字… | 待修复 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R2-PUB-016-R | subpackages/village/village/publish | 回归核对 MP-R1-PUB-016(R21)「正文上限页面 1000 vs store 校验 500」：已修复——页面 maxlength/计数/警示与 store 校验同源（同一 MAX_CONTENT_LENGTH=500），501-1000 字在输入层即不可达，两版口径一致。 | 已验证 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R2-VILL-013-R | subpackages/village/village/publish | 回归核对 MP-R2-VILL-013「晚霞帖配热饮图（图文不符）」（数据源为本页引用的 stores/village/mock-data.ts 与 services/mocks/fixtures.ts）：已修复——「晚霞」文案全库已不存在，原帖文案改为与人像街拍 p6.jpg 一致的光线语义；热饮（咖啡杯）图已归组给咖啡文案帖，两组均有 MP-R1-VILLAGE-INDEX-103 修复注释。 | 已验证 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R2-SEGMENT-001 | subpackages/discover-extra/home/segment | 细分发现页头像裸 <image> 直连相对路径，未走 resolveMediaUrl/SafeImage：后端推荐视图的 avatarUrl 按契约返回原值（/uploads/... 相对路径或外链），客户端必须经 resolveMediaUrl 重写为鉴权代理路径才可加载；本页直连后 real 模式用户上传头像按包内文件解析加载失败（MP-R7-PROFILE-001 同类缺陷在 segment… | 待修复 | code-findings/次要19.json |
| MP-R2-SEARCH-001 | subpackages/tools/search/index | 搜索页两处头像裸 <image> 直连相对路径（用户分组 u.avatarUrl、校园预览 person.avatar），未走 resolveMediaUrl/SafeImage——与 MP-R2-SEGMENT-001 同根因：后端按契约返回 /uploads/... 原值，鉴权代理改造后必须客户端重写，real 模式上传过头像的用户在此两处显示为裂图/空。 | 待修复 | code-findings/次要19.json |
| MP-R2-OTHER-001 | subpackages/profile-extra/profile/other | 他人主页 real 模式：相册「生活瞬间」缩略图与「最近动态」帖子图片/作者头像以裸 <image> 直连后端相对路径，被小程序当包内文件（MP-R7-PROFILE-001/002 同病回归）。同页大图查看层却走了 resolveMediaUrl，同一数组两种待遇。 | 待修复 | code-findings/次要20.json |

（P2×47/P3×134/P4×90 全量见 issue-matrix.md。）

## 三、快照差异与并行修复批观察（本会话实测，非推断）

> 本轮 code-findings 描述的是审查时点状态；报告落盘时工作区已出现并行修复批（git status 全仓 256 文件修改 + 268 删除未提交，HEAD=b3d31fcd）。书记员对 login 页发现做了逐条抽查（其余页面未抽查，不外推）：

| 发现 | 抽查命令/证据 | 落盘时点状态 |
|---|---|---|
| MP-R2-PAGES-LOGIN-INDEX-001（type="password"） | `sed -n '760,780p' apps/client/src/pages/login/index.vue`→:774 已为 `:password="true"`；git diff 显示 `-type="password"`/`+ :password="true"`；dist 产物 09:25 重建为 `type="text" password="{{true}}"` | **工作区已修复** |
| MP-R2-PAGES-LOGIN-INDEX-004（协议跳转空 catch） | grep 命中 :609 openLegalPage→openAppPath，注释自述「不再手写空 fail/catch」 | **工作区已修复** |
| MP-R2-PAGES-LOGIN-INDEX-005（硬编码验证码文案） | grep「验证码已发送」0 命中 | **工作区已修复** |
| MP-R2-PAGES-LOGIN-INDEX-006（倒计时定时器未清理） | :168-170 onUnmounted 内 clearInterval(smsCountdownTimer) | **工作区已修复** |
| MP-R2-PAGES-LOGIN-INDEX-011（硬编码 discover 路径） | :98/:129/:188 仍为 "/pages/discover/index" 字符串 | **未修（核对时点）** |

因此：issue-matrix/regression-report 为**审查时点台账**；修复状态以后续修复批提交与终验为准，本报告不将抽查结论外推到未抽查条目。

## 四、每页使用对比与功能目标汇总

> 说明：任务书指定来源 page-compare/ 不存在；且本轮无 interact/ 运行时取证，下表为从 code-findings 各文件的 scope/meta.page/coverage 原文归纳的**审查对象与功能目标对照**（不含运行时使用对比），全部信息取自来源文件原文。

### 4.1 主包与注册链路

| 页面/对象 | 功能目标（依据 scope/coverage 原文） | 覆盖记录 | 发现数 | 代码审查 |
|---|---|---:|---:|---|
| pages/login/index | 主审文件 apps/client/src/pages/login/index.vue 全量 1601 行（script 645 行逐行、template、style）。引用链全量核对：stores/session.ts（897 行全量，重点 loading/userSession/watch 联动）、stores/app-config.ts（isLoginOpen/isRegisterOpen 默… | 1 | 14 | code-findings/PAGES-LOGIN-INDEX.json |
| pages/register/index | 本页 1223 行 index.vue 全量阅读；引用链逐文件核对：services/auth.ts、services/http.ts、services/api-error.ts、services/sentry.ts、stores/app-config.ts、stores/session.ts（refreshSession:467 签名核对）、utils/debounce.ts（createBut… | 1 | 8 | code-findings/PAGES-REGISTER-INDEX.json |
| pages/register/success | 架构/状态管理：页面零 store 依赖，maskedPhone 单一 ref 为唯一数据源，rows 用 computed 派生（success.vue:33-37），无 store/页面双源同步问题；subLines 静态常量合理。；API 错误处理：本页无任何 API 调用、无 try/catch（天然无空 catch）；两个导航 API（success.vue:40-42 navigate… | 1 | 4 | code-findings/PAGES-REGISTER-SUCCESS.json |
| pages/home/index（首页 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | 组件事件接线全量核对：HomeHeader(schoolTap/searchTap/notifyTap)、TodayRecommendationCard(view/like/rotate)、TodayLoveProgress(step)、RelationActivity(all/liked-by/whispers/visitors/matches)、InterestRecommendation(m… | 1 | 15 | code-findings/PAGES-HOME-INDEX.json |
| pages/discover/index | 页面主体 apps/client/src/pages/discover/index.vue 全文 612 行逐段读完：script（store×5 接线、分段切换 switchDiscoverMode、滑卡/喜欢/打招呼、游客处理、TTL 缓存 loadDiscoverData/retryDiscover、onLoad/onShow/onUnload、watch×2）、template（heade… | 8 | 12 | code-findings/PAGES-DISCOVER-INDEX.json |
| pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | pages/nearby/index（附近 tabBar 页）——本轮唯一负责页面，逐文件核对说明： | 12 | 11 | code-findings/PAGES-NEARBY-INDEX.json |
| pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | pages/messages/index（1210 行全文逐行）：架构（store 单一数据源/页面 computed 组装/孤儿组件 ConversationItem/模板双分支）、命名、状态管理（messagesStore+likesStore 双源仅 likedMeCount/waitingReplyCount 兜底，pinned/muted 运行态与服务端态同步链路）、API 错误处理（b… | 11 | 13 | code-findings/PAGES-MESSAGES-INDEX.json |
| pages/profile/index | pages/profile/index.vue：4217 行全量逐行读取（script 1-1905 / template 1907-2433 / style 2434-4216）；引用组件全读：ProfileShell、MyProfile、MyStats、MyStory、MyInteraction、MyMore、MyHeader（script+模板）、MyCompletion、NotLogged… | 0 | 18 | code-findings/PAGES-PROFILE-INDEX.json |

### 4.2 分包页簇（专项审查）

| 页面/对象 | 功能目标（依据 scope/meta 原文） | 覆盖记录 | 发现数 | 代码审查 |
|---|---|---:|---:|---|
| subpackages/campus/campus/hub（校园圈） | 页面：subpackages/campus/campus/hub.vue 全文逐行读（799 行），git diff HEAD 为空（基线 b3d31fcd，无未提交改动混入）。 | 10 | 10 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json |
| subpackages/campus/campus/index（校园圈帖子流） | 架构与重复代码：发现 005（formatCampusTime 重复实现 utils/time.ts）、008（死代码 scrollLeft/动态分类映射）、009（showcase 入口一跳重定向）；categoryTabs 六项数组在 index.vue:66-73 与 post-topic.vue:87-92 重复列举（P4 级，并入 008 语境，不单列）。；命名：certStatusCl… | 1 | 9 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json |
| subpackages/campus/campus/post-topic | 架构/状态管理：发布走 campusStore.createCampusTopic 单一入口，成功后 topics.unshift（mock campus.ts:653 / real :675），hub.vue:130 onShow 刷新并存，无页面本地副本；errorMessage 先清后置（campus.ts:614-616, 677-679），页面 catch 消费（post-topic.v… | 1 | 8 | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json |
| subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/ChatBubble/ActivityC… | 页面主体 subpackages/chat/chat-session/index.vue（3318 行）逐段读完：script setup（1-1755）/ template（1757-2308）/ style（2310-3318）。 | 11 | 15 | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json |
| subpackages/circles/circles/post-topic | post-topic.vue 全文逐行（1321 行：script 1-434 / template 436-684 / style 686-1321）：状态管理（publishTarget/interestCategory/selectedTags/favoriteEnabled/circleId/sourceChannel 单页 ref，无跨 store 双写）、API 错误处理（catch … | 9 | 11 | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json |
| subpackages/discover-extra/discover/match-success | 页面主体 apps/client/src/subpackages/discover-extra/discover/match-success.vue 全文 218 行逐段读完（R1 修复后版本）：script（store 接线 19-22、myAvatar/partnerAvatar 统一媒体出口 28-42、dev-preview 直达 50-61、loadFallbackPartner 71-… | 11 | 9 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json |
| matching.vue；components/match/MatchLoading.vue；stores/match.ts；stores/discover/i… | 架构/重复代码/命名：match store 状态机单一来源；两页重复逻辑（R1-010）与重复状态（R1-007）已核仍在；store 拆分（discover/index+actions）命名与职责清晰，无新违规,状态管理：store↔页面同步——页面直写 matchedUser（R1-006）、animationDone 双份（R1-007）、onUnload 残留（R1-005）均复核仍在；… | 1 | 13 | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json |
| subpackages/village/village/index（村口/校园圈动态列表 tab 页）及其引用组件/store/utils 的只读代码层审查 | 硬约束 grep（:hover 伪类/display:grid\|grid-template/backdrop-filter/import.meta.env.DEV）：本页 + components/village 8 个 .vue 全量扫描，0 命中（仅 :hover-stay-time 属性绑定与注释文案）；空 catch：grep 'catch (_e) {}' index.vue = 0；p… | 1 | 11 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json |
| subpackages/village/village/post | （本文件无 coverage 数组；回归核销见 regressionVerification 2 条、未运行项见 checksNotRun） | 0 | 8 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json |
| subpackages/village/village/publish（统一发布动态页）及其引用的 store/utils/constants 的只读代码层审查 | 架构/重复：leave() 与 submitPublish 成功路径导航兜底逻辑重复（PUB-108）；草稿双写定时器链（500ms 本地/2000ms 后端）读毕，cancel/flush/onUnmounted 清理闭环正确；状态管理：MAX_CONTENT_LENGTH 单一来源已核实（页面 :maxlength/计数与 store 校验同源，MP-R1-PUB-016 修复在位）；targ… | 1 | 16 | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| subpackages/village/village/detail；subpackages/village/village/tag-posts；subpack… | subpackages/village/village/detail：全文件已读（script 747 行+模板+样式抽样核对 1782-3239 风险点 grep）。核对：约束（无 :hover/display:grid/backdrop-filter/DEV）通过；点赞链路 likePost 乐观更新+回滚+同引用守卫通过；评论分页/防抖/上传链路错误处理均有 toast；MP-R1… ｜ s… | 1 | 28 | code-findings/次要18.json |
| subpackages/discover-extra/home/segment；subpackages/discover-extra/nearby/people… | subpackages/discover-extra/home/segment：全文件已读（305 行）。i18n：脚本核对 7 个静态 t() 键在 zh-CN 全存在——历史 MP-R1-SEGMENT-001（home.segmentHighMatch/segmentEmpty 裸键）代码层确认已修复关闭。竞态：load() 无 token（onLoad 单次+下拉场景，风险低未列 issu… | 1 | 13 | code-findings/次要19.json |

### 4.3 二线页簇（批次审查）

| 批次 | 覆盖页面（scope 原文） | 发现数 | 代码审查 |
|---|---|---:|---|
| 次要20 | subpackages/profile-extra/verification/index；subpackages/profile-extra/verification/real-name；subpackages/profile-extra/profile/other；subpackages/profile-extra/profile/location；subpackages/profile-ext… | 15 | code-findings/次要20.json |
| 次要21 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/profile-extra/feedback/history（反馈历史）；subpackages/chat/official-chat/index（官方客服会话）；subpackages/setup/campus/index（校区设置）；subpackages/setup/sched… | 15 | code-findings/次要21.json |
| 次要22 | subpackages/discover/activities/index, subpackages/market/{detail,shop,wallet}/index, subpackages/vip/{index,promo-code,bills} 及其引用的 store/组件/utils | 19 | code-findings/次要22.json |

### 4.4 使用方式与门禁要点（依据 scope/coverage/evidence 原文归纳）

- **身份双轨**：本轮全部为代码层审查，无运行时身份取证；代码层对照的运行语义来自 store/服务层（如 login 覆盖记录对 stores/session.ts 897 行全量、services/auth.ts 431 行六链路的核对；profile 覆盖记录对 session/profile/likes/checkin 等 store 契约的核对）。
- **门禁与封存**：登录/注册开关语义（stores/app-config isLoginOpen/isRegisterOpen 默认开放）经 login 覆盖记录核对；校园门禁/实名（campus hub、verification）在次要20/campus 三份文件中代码层核对；市场化封存页（次要22：activities/market×3/vip×3）为 commerce.*=false 封存语境下的审查（方法原文见该文件）。
- **双实现并存**：publish（统一发布）与 post（村口发帖）两版的口径差异仍是本轮发现热点之一（如 MP-R2-PUB-101 草稿恢复分支缺失、POSTTOPIC-001 real 模式临时图片路径直出）。
- **平台差异**：H5 构建可达性问题（MP-R2-PAGES-LOGIN-INDEX-002）为 mp-weixin 条件编译语义核对产出；媒体相对路径直连问题（SEGMENT-001/SEARCH-001/OTHER-001/MATCHING-002 等）为 real 模式渲染链核对产出。

## 五、代码审查主题热点（按类别，代表条目）

- **Consistency（58 条）** 代表：MP-R2-PUB-101[P1]、MP-R2-CAMPUSINDEX-002[P2]、MP-R2-CHAT-CHAT-SESSION-INDEX-005[P2]、MP-R2-POSTTOPIC-003[P2]…（全量见 issue-matrix.md）
- **Regression（54 条）** 代表：MP-R2-MATCHING-001[P0]、MP-R2-VILLAGE-INDEX-R01[P0]、MP-R2-PUB-002-R[P0]、MP-R2-PAGES-MESSAGES-INDEX-010[P1]…（全量见 issue-matrix.md）
- **Function（42 条）** 代表：MP-R2-CHAT-CHAT-SESSION-INDEX-001[P1]、MP-R2-POSTTOPIC-001[P1]、MP-R2-MATCHING-002[P1]、MP-R2-PAGES-HOME-INDEX-001[P2]…（全量见 issue-matrix.md）
- **Architecture（37 条）** 代表：MP-R2-PAGES-DISCOVER-INDEX-006[P3]、MP-R2-PAGES-LOGIN-INDEX-008[P3]、MP-R2-PAGES-MESSAGES-INDEX-003[P3]、MP-R2-PAGES-MESSAGES-INDEX-004[P3]…（全量见 issue-matrix.md）
- **UI（33 条）** 代表：MP-R2-PAGES-DISCOVER-INDEX-002[P2]、MP-R2-CAMPUS-HUB-001[P2]、MP-R2-CAMPUSINDEX-003[P2]、MP-R2-PAGES-DISCOVER-INDEX-008[P3]…（全量见 issue-matrix.md）
- **Interaction（23 条）** 代表：MP-R2-POSTTOPIC-002[P2]、MP-R2-PUB-103[P2]、MP-R2-INTEREST-001[P2]、MP-R2-次要22-007[P2]…（全量见 issue-matrix.md）
- **MiniProgram（17 条）** 代表：MP-R2-PAGES-LOGIN-INDEX-001[P1]、MP-R2-CAMPUSINDEX-001[P1]、MP-R2-PAGES-MESSAGES-INDEX-002[P2]、MP-R2-PAGES-REGISTER-INDEX-002[P2]…（全量见 issue-matrix.md）
- **Data（16 条）** 代表：MP-R2-PAGES-MESSAGES-INDEX-001[P2]、MP-R2-PUB-102[P2]、MP-R2-PUB-104[P2]、MP-R2-PAGES-HOME-INDEX-004[P3]…（全量见 issue-matrix.md）
- **UX（6 条）** 代表：MP-R2-SEARCH-003[P3]、MP-R2-FEEDBACKHIST-001[P3]、MP-R2-FEEDBACK-002[P3]、MP-R2-次要22-011[P3]…（全量见 issue-matrix.md）
- **Performance（3 条）** 代表：MP-R2-PAGES-LOGIN-INDEX-006[P3]、MP-R2-VILLAGE-INDEX-007[P4]、MP-R2-ALBUM-001[P4]…（全量见 issue-matrix.md）
- **状态管理（2 条）** 代表：MP-R2-TASKS-001[P4]、MP-R2-OTHER-005[P4]…（全量见 issue-matrix.md）
- **Style（1 条）** 代表：MP-R2-PAGES-REGISTER-SUCCESS-001[P3]…（全量见 issue-matrix.md）
- **API错误处理（1 条）** 代表：MP-R2-CAMPUS-HUB-004[P3]…（全量见 issue-matrix.md）
- **Async（1 条）** 代表：MP-R2-POST-002[P3]…（全量见 issue-matrix.md）
- **API 错误处理（1 条）** 代表：MP-R2-FAVORITES-001[P3]…（全量见 issue-matrix.md）

## 六、后续处置建议（依据发现状态统计）

1. **P0×3**：MP-R2-VILLAGE-INDEX-R01 已修复待终验；MP-R2-MATCHING-001 与 MP-R2-PUB-002-R 为回归核对「已验证/证伪维持」，无新增开放 P0。
2. **P1×21**（10 条待修复）：建议按 issue-matrix 顺序清零，热点为媒体相对路径直连（SEGMENT-001/SEARCH-001/OTHER-001/MATCHING-002）、real 模式发布链（POSTTOPIC-001 临时图片、PUB-101 草稿分支）、chat-session 差分检测缺陷、campus scroll-view 无界高度、nearby 未登录强踢。
3. **已修复待终验 15 条**：需真机/开发者工具终验闭环（含工作区并行修复批的 login 抽查 4 条）。
4. **交互与运行时证据缺口**：interact/ 未产出，baseline §三「无法验证」清单与 §七高风险区（返回栈底、滚底、弹窗、tabBar 净空等）在本轮无运行时复核，须留待下一运行时取证轮次。
5. **回归防线**：regression-report 第四节给出 baseline §八未闭环项的本轮覆盖对照，未命中项保持开放。

## 七、本报告集文件

| 文件 | 内容 |
|---|---|
| audit-report.md | 本文件：总量结论、P0/P1 全量、快照差异观察、每页使用对比与功能目标汇总 |
| issue-matrix.md | 代码审查 295 条逐条矩阵（ID/级别/类别/状态/摘要/证据/修复建议） |
| interaction-matrix.md | 覆盖记录与核对项 133 条（PRE/ACTION/EXPECTED/OBSERVED/EVIDENCE/STATUS），含来源缺失声明 |
| screenshot-matrix.md | screenshot 字段全量分布、引用截图存在性核对、编译产物取证复核、screenshots 目录盘点 |
| regression-report.md | 历史回归核对 54 条 + 专项核销 + baseline 未闭环项覆盖对照 |
| git-summary.md | 本轮落盘时的 git 状态实测（分支/HEAD/工作区/最近提交） |

> 诚实性声明：本报告集所有结论均可回溯到上述来源文件的原文（路径+字段/行号）或本会话实际执行的命令输出；来源不存在的部分（interact/、regression/、page-compare/、本轮截图目录）已如实标注「不存在」而非推断填充。既有 round-2/audit-report.md 为旧视觉周期（2026-09-10）留档，本轮按任务书以 R2（2026-09-22）数据源重写覆盖；code-findings/ 23 份 JSON 为本轮在册输入，未做任何改写。
