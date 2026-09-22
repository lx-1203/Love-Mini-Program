# R2 覆盖与核对矩阵（interaction-matrix）

- 生成：2026-09-22（书记员-R2 整理落盘）。
- **来源声明（如实）**：任务书指定的 `reports/audit/round-2/interact/`（交互判定 JSON）在本会话多次核实**不存在**（`ls reports/audit/round-2/` 仅见 audit-report.md 与 code-findings/，生成前最后一次复核仍不存在）。本轮没有运行时交互判定用例（无 PRE/ACTION/EXPECTED/OBSERVED 运行时记录、无 before/after 截图），本文件**不以任何推断填充交互判定**。
- 本轮在册的核对记录全部为 Layer A 只读代码层产出，按其原文重排为统一六列（PRE/ACTION/EXPECTED/OBSERVED/EVIDENCE/STATUS），字段映射：**PRE=核对对象与前置（页面/范围+方法）**；**ACTION=核对动作（coverage 覆盖记录 / checksPassed / 硬约束扫描项原文）**；**EXPECTED=Layer A 口径的合规预期（逐行全量审查、证据到 file:line、硬约束 0 违例）**；**OBSERVED=核对结论（原文 status/判定）**；**EVIDENCE=来源 JSON 路径（含内部字段）**；**STATUS=✅/⚠️/❌ + 原文判定**。
- 运行时交互回归须待 interact 通道产出后另行落盘；历史「无法验证」清单（baseline §三 R21 清单）在本轮无对应运行时复核记录，维持待验状态。

## PAGES-DISCOVER-INDEX.json

### 覆盖记录（coverage，8 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/discover/index | 页面主体 apps/client/src/pages/discover/index.vue 全文 612 行逐段读完：script（store×5 接线、分段切换 switchDiscoverMode、滑卡/喜欢/打招呼、游客处理、TTL 缓存 loadDiscoverData/retryDiscover、onLoad/onShow/onUnload、watch×2）、template（header 分段+筛选、错误横幅重试、matchClosed/骨架/空态三分支、MatchCard+MatchActions、游客登录胶囊、FilterDrawer v-model:visible+apply+reset）、style 全部 22 条规则块。模板类名与样式段逐一对照（死样式定位 -007）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[0] | ✅ 已核对 |
| 2 | pages/discover/index | 直接引用组件逐一读：components/match/MatchCard.vue（emits card-tap/swipe-left/swipe-right 与页面监听一一对应；R1-005 双通道修复在位：事件改名 card-tap 脱钩原生 tap + SwipeContainer catchtap 阻断冒泡，编译产物 pages/discover/index.wxml 中 <match-card> 绑 bindcardTap 单通道核实）、components/match/MatchActions.vue（emit pass/superLike/like ↔ @pass/@super-like/@like，Vue 运行时 camelize 匹配，接线正确；busy=loading 门控在位）、components/discover/FilterDrawer.vue 全文 1127 行… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[1] | ✅ 已核对 |
| 3 | pages/discover/index | store 链路：stores/discover/index.ts（state 默认值矛盾定位 -004；watch 防抖存储装配）、actions/fetch.ts（AbortController 竞态防护、401/403 不重试、quota 仅登录后查且失败兜底 false、游客 401 风险排除——SecurityConfig.java:134 /api/v1/recommendations permitAll 核实）、actions/swipe.ts（左滑游客本地放行、右滑幂等队列、错误置 errorMessage 后 rethrow 由页面 toast——横幅+toast 双反馈属既有设计未单列）、actions/filter.ts（setNearbyScope/setMatchScope/openFilterDrawer 与页面内联实现重复定位 -006）、actions/st… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[2] | ✅ 已核对 |
| 4 | pages/discover/index | utils/composables：utils/navigation.ts（openUserProfile 空 userId 守卫在位、setTabBarHidden try/catch、openAppPath 空路径 fail 回调）、utils/cache-ttl.ts（TTL 语义——失败也占缓存的根因定位 -003）、composables/useTabBar.ts（pages.json tabBar.list[2]=discover，useTabBar(2) 索引正确）、composables/useMenuButtonRect.ts（--capsule-right/--statusbar 注入与页面 340/457 行消费对应）、guards/campus-gate.ts（实名门控同步语义、mock 恒过）、view-models/match.ts（toMatchCardUse… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[3] | ✅ 已核对 |
| 5 | pages/discover/index | 硬约束（R11 附录 B）本页+组件闭包 grep 全过：无 :hover（仅 FilterDrawer 注释声明不用）、无 grid、无空 catch {}（既有 catch 均含注释，ESLint no-empty 口径不计空）、组件无 import.meta.env 直读（constants.ts 的 import.meta.env.VITE_MOCK_MATCH_PROBABILITY 属 store 常量文件且经 isDev 收敛，非组件、非 DEV 标志直读）、无 backdrop-filter（FilterDrawer 按 mp-weixin 兼容注释用 opacity 兜底）、页面切换逻辑内联 .vue（无外部 js 页面逻辑）、工具函数全部自 .ts 导入、IMAGE_PATHS 无硬编码图片路径。模板渲染文本无 emoji（标题爱心已用图片资源）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[4] | ✅ 已核对 |
| 6 | pages/discover/index | 小程序专项：scroll-view 用 flex:1+min-height:0 于 100vh flex 列容器（配合 round-1 实拍截图渲染正常，卡片高度链经 match-card-area 880rpx 固定高，实拍无塌陷，不列为发现）；safe-area：状态栏经 --statusbar 变量+env 兜底、底部避让不足见 -002；fixed 元素两处（登录胶囊 -001、FilterDrawer 全屏 z-index var(--z-modal)+tabbar 联动隐藏 watch 在位）；键盘：本页仅 FilterDrawer 关键词 input 带 cursor-spacing=20，页面级无输入框；onShow 刷新：resetDailyLimit+清陈旧错误+TTL 门控重拉齐备（但存在 -003 失败降级缺陷）；页面栈：enterMatching→openAppP… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[5] | ✅ 已核对 |
| 7 | pages/discover/index | 回归核对结论：①MP-R1-PAGES-DISCOVER-INDEX-003——代码修复在位但存在与中央浮岛的几何残余冲突，升级为本报告 -001（待修复）；②MP-R1-PAGES-DISCOVER-INDEX-004——经与 round-1 code/interact 报告比对，004 号即配额用尽前置拦截，修复在位核对本报告 -012（已修复待终验），其与 R1-010 计数顺序的叠加场景已单列 -005。R1 其余 7 项待修复发现（006/007/008/009/010/011/012/013）经逐行比对 b3d31fcd 前后 diff，均未纳入修复批，本报告按 Regression 如实重报（-002 升级证据、-004/-005/-007/-008/-009/-010/-011）。R1-005（card-tap 双通道）已核实修复，不再列为发现。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[6] | ✅ 已核对 |
| 8 | pages/discover/index | 本审查为 A2 只读代码层审查：未运行模拟器/真机、未执行构建与截图；-001/-002 的 tabBar 几何数字为样式推算并附 round-1 实拍截图佐证，标注了相应 confidence；未修改任何仓库文件。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-DISCOVER-INDEX.json coverage[7] | ✅ 已核对 |

## PAGES-HOME-INDEX.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/home/index | 组件事件接线全量核对：HomeHeader(schoolTap/searchTap/notifyTap)、TodayRecommendationCard(view/like/rotate)、TodayLoveProgress(step)、RelationActivity(all/liked-by/whispers/visitors/matches)、InterestRecommendation(more/select/join)、NearbyPeople(more/select)、CommunityFeed(more/select/openAuthor/retry)、InviteBanner(invite)、BottomSheet(close) —— 页面模板 index.vue:296-358 全部监听且有对应 handler，无未接线 emit（本项目高频缺陷类本轮通过）；硬约束 gr… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对；notRun 见原文（2 项） | code-findings/PAGES-HOME-INDEX.json coverage[0] | ✅ 已核对 |

- 方法声明（原文）：静态代码审查（无截图/无开发者工具/无构建），所有发现均到文件行号取证；硬约束以 grep 全量扫描 home 相关 10 个 .vue 文件；静态资源存在性逐一核对磁盘文件；未修改任何文件

## PAGES-LOGIN-INDEX.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/login/index | 主审文件 apps/client/src/pages/login/index.vue 全量 1601 行（script 645 行逐行、template、style）。引用链全量核对：stores/session.ts（897 行全量，重点 loading/userSession/watch 联动）、stores/app-config.ts（isLoginOpen/isRegisterOpen 默认开放语义）、services/auth.ts（431 行全量：wechat/phone/register/guest/sms/bind 六链路与 token 写入）、services/http.ts:830-880（reportError 上报口径）、services/api-error.ts（AppApiError）、utils/navigation.ts（replaceAppPath/con… | Layer A：全量逐行审查+引用链核对+证据到 file:line | covered | code-findings/PAGES-LOGIN-INDEX.json coverage[0] | ✅ covered |

## PAGES-MESSAGES-INDEX.json

### 覆盖记录（coverage，11 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | pages/messages/index（1210 行全文逐行）：架构（store 单一数据源/页面 computed 组装/孤儿组件 ConversationItem/模板双分支）、命名、状态管理（messagesStore+likesStore 双源仅 likedMeCount/waitingReplyCount 兜底，pinned/muted 运行态与服务端态同步链路）、API 错误处理（bootstrap/fetchLikes/setSessionPinned/deleteSession 均有 catch 或页面 toast；markSessionUnread 为同步；setSessionMuted 恒 resolve；无空 catch {}、无未处理 rejection；handleRetry 经 removeCache 穿透 TTL）、异步流程（onLoad+onShow+wa… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[0] | ✅ 已核对 |
| 2 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | stores/messages.ts（1486 行全文）：bootstrap/SWR/TTL、竞态 token、dashboard 合并（muted 丢失证据链）、setSessionPinned/setSessionMuted/markSessionUnread/markAllSessionsRead/markConversationRead、totalUnreadCount/unreadNotificationCount getter | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[1] | ✅ 已核对 |
| 3 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | stores/likes.ts（fetchLikes abort/rethrow，页面 .catch 留痕匹配）、stores/helpers/use-mock.ts、stores/session.ts（isLoggedIn） | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[2] | ✅ 已核对 |
| 4 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | composables：useTabBar（onShow setData selected）、useUnreadBadge（storage+setData 双通道）、useMenuButtonRect、useStatusBarHeight、usePageAccess（config/page-access.ts:32-37 requiresAuth:true/requiresProfile:false，页面 spread 覆盖冗余无害） | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[3] | ✅ 已核对 |
| 5 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | components：NotLoggedWaiting（emits/props 匹配；raw hex 无 token 兜底，量级大且属共享组件，暂记观察未立案）、PageStateContainer、Skeleton（variant=list ✓）、ErrorState（emit retry ✓）、EmojiText（text-class/emoji-size ✓）、XunmiMascot（mood=mascot_smile 在 V2 映射内 ✓）、ConversationItem（零引用孤儿，见 003） | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[4] | ✅ 已核对 |
| 6 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | custom-tab-bar/（index.js syncBadge/syncSelected/switchTab、index.wxml 角标渲染、index.wxss fixed 高度）与 pages.json（tabBar.custom:true、messages 页 enablePullDownRefresh） | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[5] | ✅ 已核对 |
| 7 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | config/images.ts（IMAGE_PATHS 全部被引用键存在 + real 模式基址切换）、constants/routes.ts（OFFICIAL_CHAT/SESSION/VISITORS_LIKES/TAB 均存在）、utils/navigation.ts（openAppPath 空串防御/switchTab query 桥接）、utils/cache-ttl.ts、utils/dev-user.ts（onLoad dev-user=1 注入，页面级兜底）、utils/media.ts（resolveMediaUrl 空守卫/本地化）、utils/time.ts（formatChatListTime） | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[6] | ✅ 已核对 |
| 8 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | 静态资源存在性（逐一 ls 验证）：icons/v2/search.png、icons/search.svg、icons/common/pin.svg、icons/common/volume-x.svg、svg-spec/08-mascot/sprout-default.svg、svg-spec/09-decorations/leaf-2.svg、images/mascot/{sprout,default,heart_green,chat_hi}.png、images/posters/notlogged-waiting.png、default-avatar.jpg —— 全部存在 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[7] | ✅ 已核对 |
| 9 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | 硬约束扫描（grep，页面+6 个引用组件）：:hover 0 命中；display:grid/grid-template 0 命中；backdrop-filter 0 命中；import.meta.env 0 命中（components 禁 DEV ✓）；emoji 仅出现在 messages/index.vue:97-98 注释与 images.ts 注释中，非渲染 UI；页面切 tab 逻辑经 useTabBar 内联于页面 ✓ | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[8] | ✅ 已核对 |
| 10 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | 历史回归 4 条全部代码层验证（010-013）：MP-R2-MSG-006 已修复闭环、R1-001「+」死交互已消除、R1-002/003 置顶/免打扰反馈已落地、INDEP-004 滚动遮罩已补 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[9] | ✅ 已核对 |
| 11 | pages/messages/index（消息 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | 未执行项（如实声明）：未运行构建/vue-tsc/单测，未启动开发者工具，未截图，未做真机/交互验证——本审查为只读静态代码审查，UI 类发现（002/006）的最终影响需交互取证轮确认 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-MESSAGES-INDEX.json coverage[10] | ✅ 已核对 |

- 方法声明（原文）：静态代码审查（无截图/无开发者工具/无构建），所有发现均到文件行号取证；历史回归线索均经本轮代码层验证后才列入（category=Regression）

## PAGES-NEARBY-INDEX.json

### 覆盖记录（coverage，12 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | pages/nearby/index（附近 tabBar 页）——本轮唯一负责页面，逐文件核对说明： | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[0] | ✅ 已核对 |
| 2 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ① 页面主体 apps/client/src/pages/nearby/index.vue 全文 1086 行逐段读完：script 导入（13-44 行全部 import 均有真实引用，R1 死链 peoplePreview 已删且无回归）、canFetchProtected 登录门（66-68）、schoolEntries（71-78）、hotCircles（84-85）、initLocation/onLoad/onShow/onPullDownRefresh 生命周期链（100-155）、loadNearbyData/watch 登录补拉/loadActivities/loadCirclePosts TTL（162-218）、全部跳转函数（221-310）、互动三函数 onPostLike/Favorite/Follow（268-290，try/catch + showErrorTo… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[1] | ✅ 已核对 |
| 3 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ② 事件接线（本项目高频缺陷项）：NearbySection 仅 emit「more」，本页 4 处使用中 3 处带 moreText 且均监听 @more（421/448/477/506 行），分区①无 moreText 不触发——通过；PostCard 声明 7 个 emit（PostCard.vue:35-43），本页 528-537 行 @like/@favorite/@follow/@open-detail/@open-author/@open-tag/@open-activity 7/7 全接线——通过；ActivityCard open-detail 由 PostCard 内部消费（PostCard.vue:216）——通过。PostCard 卡片内交互统一 @tap.stop（编译为 catchtap，MP-R1-NEARBY-001 修复在位，PostCard.vue:6… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[2] | ✅ 已核对 |
| 4 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ③ API 错误处理：页面侧 try/catch + showErrorToast（268-290 行）通过；发现 2 项：下拉刷新 toast 死路径（R2-002）、兴趣圈区零状态（R2-003）；utils/location.ts reportLocation/fetchCurrentLocation 内部吞错为文档化设计，fetchCityFromBackend 走 permitAll 端点——通过。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[3] | ✅ 已核对 |
| 5 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ④ 异步流程：onLoad/onShow/onPullDownRefresh/watch(isLoggedIn) 四条触发链核对（发现 onLoad+onShow 首进重复请求 R2-010）；loadCirclePosts TTL + force 语义正确（205-218）；无未处理 Promise 拒绝（所有 void 调用链末端均自吞错或页面 catch）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[4] | ✅ 已核对 |
| 6 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ⑤ 架构/状态管理：circlePosts 独立维度 nearbyPosts（不复用全局 posts）、circleCoverFor 单一真相源（config/circle-covers.ts 收编完成）、circleStore/activityStore/villageStore 共享 store 页面无副本状态——通过；发现顶部 padding 双真相源（R2-009）与 slice 双重截断（R2-006）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[5] | ✅ 已核对 |
| 7 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ⑥ 样式/硬约束扫描（grep 执行）：:hover 伪类 0 命中（PostCard.vue:119/129 为 uni-app :hover-stay-time 属性绑定，非 CSS）；display:grid/grid-template 0 命中；import.meta.env 0 命中；backdrop-filter 0 命中；业务组件渲染文本 emoji 0 命中（unicode 区段扫描）；页面全部 image :src 均走 IMAGE_PATHS/circleCoverFor/session 字段，无硬编码图片路径，所用 13 个 IMAGE_PATHS 键（ICONS_COMMON.SEARCH、NEARBY_ICONS.PEOPLE/CIRCLE/CAMPUS/ACTIVITY、ICONS_PROFILE.NETWORK、ICONS_EMOJI.LOCATION/GRO… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[6] | ✅ 已核对 |
| 8 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ⑦ 小程序专项：scroll-view 高度用 flex:1+min-height:0 于 min-height:100% flex 列容器（561-564）——项目既有模式；自定义 TabBar useTabBar(1) 与 custom-tab-bar/index.js 实序（1=nearby）核对一致；底部安全区 page-bottom-safe（calc(112rpx+safe-area-inset-bottom)）+ footer-space 兜底；键盘 input confirm-type=search + @confirm（345-353）；onShow 按 TTL 刷新真实可见数据源（129-137）；页面栈 openAppPath 内置 ≥10 层 redirectTo 兜底（utils/navigation.ts:100-116）；搜索页 keyword 消费核实（su… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[7] | ✅ 已核对 |
| 9 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ⑧ 回归核对：MP-R1-NEARBY-005 宽度算术复核通过（R2-NEARBY-005，已修复待终验）；另主动核对 round-1/code-findings/PAGES-NEARBY-INDEX.json 全部 11 项：001 部分回归（R2-001）、002/003/004/005 已修复无回归、006 部分未修复（R2-003）、007/008/009/010/011 未修复（R2-004/005/006/007/008）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[8] | ✅ 已核对 |
| 10 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ⑨ 路由完整性：本页全部跳转目标（ROUTES.LOGIN/SEARCH/NEARBY.PEOPLE/CIRCLES.HOME/CIRCLES.INDEX/CAMPUS.HUB/ACTIVITY_DETAIL、SUBPACKAGE_ROUTES.DISCOVER_FEED.ACTIVITIES、village 四页）在 constants/routes.ts 与 pages.json 均已注册；pages.json 本页 enablePullDownRefresh:true 与 onPullDownRefresh 处理器匹配（59-61 行）；STORAGE_KEYS.NEARBY_CITY 存在（storage-keys.ts:70）；SCHOOLS/School、sessionStore.userSession.campusName 字段核实。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[9] | ✅ 已核对 |
| 11 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ⑩ 未执行项（如实声明）：本轮为 Layer A 纯代码审查，未运行构建/typecheck/单测，未启动微信开发者工具，未截图，未运行任何运行时取证；R2-NEARBY-005 的「已修复」为代码层数学验证，视觉终验留待交互取证轮。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[10] | ✅ 已核对 |
| 12 | pages/nearby/index（附近 tabBar 页）及其引用组件/store/utils 的只读代码层审查 | ⑪ 本轮未修改任何文件（只读审查）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/PAGES-NEARBY-INDEX.json coverage[11] | ✅ 已核对 |

- 方法声明（原文）：静态代码审查（无截图/无开发者工具/无构建），所有发现均到文件行号取证

## PAGES-PROFILE-INDEX.json

### 核对通过项（checksPassed，9 条）

| # | PRE | ACTION（原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/profile/index 及引用组件 | R11 附录 B 硬约束扫描（本页+引用组件）：无 :hover（仅注释提及禁用）、无 display:grid、无 backdrop-filter、组件无 import.meta.env.DEV（isDev 统一从 services/env\|config/env 导入，index.vue:32/412/1862、SafeImage.vue:58）——grep 验证 | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[0] | ✅ 通过 |
| 2 | pages/profile/index 及引用组件 | 组件事件接线三层核对（页面→ProfileShell→MyProfile→子组件）：tap-avatar/edit/complete/stat-tap/story-photo/tap-album/add-story/interaction-tap/more-tap/go-login/close/publish/tap 全部 emits 声明+模板转发+页面监听闭合；kebab 监听 vs camelCase emit 经 Vue3 属性 camelize 等价（唯一断链 tapVideo/postTap 为无发射点的死声明，已计入 MP-R2-PROFILE-006） | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[1] | ✅ 通过 |
| 3 | pages/profile/index 及引用组件 | ROUTES 常量与 pages.json 注册双向核对：LIKES.INDEX/PROFILE.VISITORS/PROFILE.ALBUM/PROFILE.FAVORITES/SETTINGS.INDEX/PROFILE.TASKS/VILLAGE.*/CHAT.SESSION/MESSAGES.INDEX 均存在且目标页已注册（pages.json:160,203,212,227,230） | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[2] | ✅ 通过 |
| 4 | pages/profile/index 及引用组件 | i18n 键抽查 60+ 个 profile.* / messages.* / apiErrors.* / discover.* 键在 zh-CN.ts 与 en-US.ts 均存在（脚本循环 grep，0 缺失） | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[3] | ✅ 通过 |
| 5 | pages/profile/index 及引用组件 | store 契约核对：profile（fetchProfile/loadMyPosts/loadMyDailies/uploadAvatar/uploadBackground/uploadVoice/clearVoiceStatus/uploadPhotoAtIndex/removePhotoAtIndex/photoGalleryItems/avatarAuditStatus/voiceStatusUrl）、session（isLoggedIn/isProfileComplete/profileCompletion）、likes（likes/likedBy/mutualLikes/visitors/fetchLikes）、checkin（checkedIn/consecutiveDays/checkIn）、social-progress（progress/progressPercenta… | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[4] | ✅ 通过 |
| 6 | pages/profile/index 及引用组件 | onShow 刷新纪律：profileRequestedOnce 首载全量 + 后续 onShow 轻量刷新 dailies/posts/likes，冷启动会话未就绪用 2s 退避重试 ×3；未登录门禁 getToken()&&!useMock() 挡 401 雪崩（index.vue:1783-1872） | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[5] | ✅ 通过 |
| 7 | pages/profile/index 及引用组件 | onUnload 资源清理：voicePlayTimer/recordingTickTimer/avatarHintTimer/recorderManager/voiceAudio + discover/village store dispose（index.vue:1878-1904） | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[6] | ✅ 通过 |
| 8 | pages/profile/index 及引用组件 | 页面栈与冒泡：openAppPath 内置 10 层栈上限 redirectTo 兜底（navigation.ts:100-116）；avatar-camera @tap.stop 与 invite-modal @tap.stop 使用正确（index.vue:2192,2376） | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[7] | ✅ 通过 |
| 9 | pages/profile/index 及引用组件 | 媒体渲染边界：本人态头像/照片墙/背景/动态配图/预览大图全部经 resolveMediaUrl；他人态经 SafeImage 内部解析兜底（详见 MP-R2-PROFILE-002） | 该核对项 0 断链/0 缺失 | 通过（原文） | code-findings/PAGES-PROFILE-INDEX.json checksPassed[8] | ✅ 通过 |

### 覆盖备注（coverageNotes，8 条，含「未做」声明）

- pages/profile/index.vue：4217 行全量逐行读取（script 1-1905 / template 1907-2433 / style 2434-4216）
- 引用组件全读：ProfileShell、MyProfile、MyStats、MyStory、MyInteraction、MyMore、MyHeader（script+模板）、MyCompletion、NotLoggedProfile、CertBadgeRow、GlobalPublishFab、BottomSheet、SafeImage；契约级核对：CertDetailSheet、MatchCountChip、VerificationBadge、AvatarFrame（props/emits 定义段）
- 工具/组合式：utils/navigation.ts、utils/media.ts、utils/image-local.ts（toLocalImage 段）、composables/useMenuButtonRect.ts、useStatusBarHeight.ts、useTabBar.ts、useProfileTracker.ts（no-op 占位已确认）
- 数据层：view-models/profile.ts、view-models/other-profile.ts 全读；stores profile/session/likes/checkin/social-progress/discover/village/app-config 字段与动作级核对；services/http.ts 的 401→reLaunch 行为定位
- 路由：constants/routes.ts 全读；pages.json 的 profile 注册/tabBar.custom/preloadRule/profile-extra 分包页核对
- 关联面：首页 InviteBanner → invite=1 桥接链路（pages/home/index.vue:286,358）因作用于本页 onShow 而纳入核查
- 未做（超出 Layer A 职责）：未运行微信开发者工具/真机、未截图比对、未执行构建与测试套件；未核查 LockScreen 页（回归线索中 LockScreen 两页同病属其他页面负责人）；PublicBio.vue 的 ❝ 装饰符（dingbat，非 emoji）出现在 public 分支组件中、本页 mode=mine 不渲染，仅备案不计发现
- 本会话执行过的核验命令：grep/photoCells 等符号引用扫描、i18n 键循环 grep、emoji 字符范围扫描、pages.json/store 契约 grep（均在上文 evidence 引用）

## PAGES-REGISTER-INDEX.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/register/index | 本页 1223 行 index.vue 全量阅读；引用链逐文件核对：services/auth.ts、services/http.ts、services/api-error.ts、services/sentry.ts、stores/app-config.ts、stores/session.ts（refreshSession:467 签名核对）、utils/debounce.ts（createButtonGuard:145-169 leading 锁核对）、config/env.ts（isDev:104-139 无 import.meta 依赖）、config/images.ts（REGISTER:616-621 / REGISTER_ICONS:626-645）、constants/routes.ts（ROUTES.REGISTER/REGISTER_SUCCESS:55-56、SUBPA… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对；notRun 见原文（见原文） | code-findings/PAGES-REGISTER-INDEX.json coverage[0] | ✅ 已核对 |

## PAGES-REGISTER-SUCCESS.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | pages/register/success | 架构/状态管理：页面零 store 依赖，maskedPhone 单一 ref 为唯一数据源，rows 用 computed 派生（success.vue:33-37），无 store/页面双源同步问题；subLines 静态常量合理。；API 错误处理：本页无任何 API 调用、无 try/catch（天然无空 catch）；两个导航 API（success.vue:40-42 navigateTo、45-47 switchTab）目标路由均已在 pages.json 核实存在——register/success 注册于 pages.json:49、pages/home/index 为 tabBar 页（switchTab 合法）、/subpackages/setup/profile/index 在 subpackages/setup 分包（pages.json:255）且磁盘文件存在，… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/PAGES-REGISTER-SUCCESS.json coverage[0] | ✅ 已核对 |

## SUBPACKAGES-CAMPUS-CAMPUS-HUB.json

### 覆盖记录（coverage，10 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/campus/campus/hub（校园圈） | 页面：subpackages/campus/campus/hub.vue 全文逐行读（799 行），git diff HEAD 为空（基线 b3d31fcd，无未提交改动混入）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[0] | ✅ 已核对 |
| 2 | subpackages/campus/campus/hub（校园圈） | 架构/重复/命名/状态管理：页面无自定义子组件、无 emit 接线点（N/A 本项目高频缺陷项）；campusStore 与 sessionStore 双源问题（certificationStatus vs userSession.campusVerified/campusName）已核实并立 MP-R2-CAMPUS-HUB-002；CAMPUS_COVER/schoolStats 内联页面、未复用 config/schools.ts 已立 MP-R2-CAMPUS-HUB-007；selectedSchool 死状态已立 MP-R2-CAMPUS-HUB-003。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[1] | ✅ 已核对 |
| 3 | subpackages/campus/campus/hub（校园圈） | API 错误处理：本页唯一异步入口 onShow→fetchCertificationStatus，空 rejection handler + errorMessage 零消费已立 MP-R2-CAMPUS-HUB-004；store 侧 404→unverified 的兜底（stores/campus.ts:860-869）核对无误；无未处理 Promise 拒绝其余来源（goSchool/goCertification/goBack 为同步导航）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[2] | ✅ 已核对 |
| 4 | subpackages/campus/campus/hub（校园圈） | 异步流程：竞态 token、loading/errorMessage 生命周期在 store 侧（campus.ts:415-470 等）抽查无异常；hub 页自身无并发请求。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[3] | ✅ 已核对 |
| 5 | subpackages/campus/campus/hub（校园圈） | 样式/token/IMAGE_PATHS：14 处字面量色已立 MP-R2-CAMPUS-HUB-001；IMAGE_PATHS 五处引用（GRADUATION_CAP_SVG/ICONS_EMOJI.SEARCH/CIRCLE_COVERS.CAMPUS/AVATARS.AVATAR_1-3/GENERATED.CAMPUS_*）逐一对照 config/images.ts 确认存在（44-46/156-167/289/471/602 行）；死样式与重复声明立 MP-R2-CAMPUS-HUB-008。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[4] | ✅ 已核对 |
| 6 | subpackages/campus/campus/hub（校园圈） | 硬约束核对（R11-B）：禁 :hover ✓（本页仅 hover-class 属性，无 CSS :hover）；禁 grid ✓（grep 无 display:grid）；空 catch——无 try{}catch{} 空块，但 131 行 `.catch(() => {})` 空 rejection handler 已按 MP-R2-CAMPUS-HUB-004 立项；组件禁 import.meta.env.DEV ✓（grep 无）；业务组件禁 emoji ✓（‹=&#x2039;、× 为标点符号非 emoji，images.ts:471 的 🔍 位于 config 注释非业务组件）；backdrop-filter ✓ 无；页面切换逻辑内联 .vue ✓（goSchool/goCertification/goBack 均内联）；工具函数均自 .ts 导入 ✓；CardSwiper … | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[5] | ✅ 已核对 |
| 7 | subpackages/campus/campus/hub（校园圈） | 小程序专项：scroll-view ✓ N/A（整页滚动无 scroll-view）；safe-area 顶部 ✓（hub.vue:308 var(--statusbar, env(safe-area-inset-top)) + useMenuButtonRect 注入，胶囊避让 324 行含 R1 修复 MP-R1-CAMPUS-HUB-004）；底部未加 env(safe-area-inset-bottom)（48rpx footer，页尾为非交互文案，未立为缺陷）；键盘 ✓（cursor-spacing=20，输入框不在 fixed 底部，无遮挡路径；confirm-type=search 无 @confirm 但列表为 v-model 实时过滤，未立缺陷）；onShow 刷新 ✓（130-132 行有认证状态刷新）；页面栈 ✗ 已立 MP-R2-CAMPUS-HUB-006；@ta… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[6] | ✅ 已核对 |
| 8 | subpackages/campus/campus/hub（校园圈） | i18n：campusHub 段 zh/en 16 个在用 key 逐一核对齐备（zh-CN.ts:3406-3427 / en-US.ts:3317-3338）；4 处硬编码中文已立 MP-R2-CAMPUS-HUB-005。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[7] | ✅ 已核对 |
| 9 | subpackages/campus/campus/hub（校园圈） | 回归核对：MP-R1-CAMPUS-HUB-001 / 003 均已在代码层验证修复，立 MP-R2-CAMPUS-HUB-R001/R002（status=已验证）；线索中提及的 R21 轮次编号在仓库内未见对应留档文件（未查证到，仅按本清单描述核对代码现状）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[8] | ✅ 已核对 |
| 10 | subpackages/campus/campus/hub（校园圈） | 未执行项：未运行开发者工具/模拟器、未截图、未运行单测（tests/pages/nearby-page.spec.ts 引用本页，属上游页面测试，未在本 ask 范围内执行）；以上均为代码层静态审查结论。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json coverage[9] | ✅ 已核对 |

## SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/campus/campus/index（校园圈帖子流） | 架构与重复代码：发现 005（formatCampusTime 重复实现 utils/time.ts）、008（死代码 scrollLeft/动态分类映射）、009（showcase 入口一跳重定向）；categoryTabs 六项数组在 index.vue:66-73 与 post-topic.vue:87-92 重复列举（P4 级，并入 008 语境，不单列）。；命名：certStatusClass/certStatusText/switchCategory/onLoadMoreTopic 等语义清晰无缩写歧义，未发现问题。；状态管理：发现 002（store.topics 与 Tab 分类失同步：发布回流污染+切分类失败静默）、007（errorMessage 单字段跨数据源串扰）；store 竞态 token（campus.ts:296/417-467）与页面 in-flight … | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对；notRun 见原文（2 项） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json coverage[0] | ✅ 已核对 |

## SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/campus/campus/post-topic | 架构/状态管理：发布走 campusStore.createCampusTopic 单一入口，成功后 topics.unshift（mock campus.ts:653 / real :675），hub.vue:130 onShow 刷新并存，无页面本地副本；errorMessage 先清后置（campus.ts:614-616, 677-679），页面 catch 消费（post-topic.vue:242-248）——通过；API 错误处理：uploadPostImage 缺 url 抛错（api.ts:889-892）→ 页面 catch toast + isSubmitting 复位（:242-248）——通过；chooseImage fail 静默——见 MP-R2-CAMPUSPOST-005；catch(_e) 两处均有处理体，无空 catch {}——通过；异步流程：isS… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json coverage[0] | ✅ 已核对 |

## SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json

### 覆盖记录（coverage，11 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 页面主体 subpackages/chat/chat-session/index.vue（3318 行）逐段读完：script setup（1-1755）/ template（1757-2308）/ style（2310-3318）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[0] | ✅ 已核对 |
| 2 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 本页辅助模块 4 件全读：types.ts（112 行）/ dto.ts（221 行）/ view-models.ts（342 行）/ api.ts（32 行）——纯函数拆分符合「页面转场内联 .vue、工具从 .ts 导入」硬约束；发现 index.vue.bak 残留（3090 行，gitignored）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[1] | ✅ 已核对 |
| 3 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 架构/重复/命名：拆层合理（dto/view-models/api 职责清晰）；发现 009（死样式/重复 .chat-list/.bak）、012（裸路径重复 openUserProfile、存储键绕过 STORAGE_KEYS）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[2] | ✅ 已核对 |
| 4 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 状态管理（单一数据源/store 同步）：确认 currentMessages 单源策略在位（Task 1.1.1），temp 会话经 syncChatStoreMessagesToMessagesStore 回同步且保留扩展字段；发现 001（errorMessage 差分检测失效）、007（setSessionMuted 返回值被弃）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[3] | ✅ 已核对 |
| 5 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | API 错误处理：逐个检查页面全部 async 函数（sendText/handleAcceptExchange/handleEndSession/handleRecallMessage/handleForwardTo/handleImagePlaceholder/handleAvatarPat/loadIcebreakers/loadPeerOnlineStatus/loadSessionData/onScrollToUpper）——发现 001/002/003/006；loadPeerOnlineStatus 的静默 catch 为注释声明的有意降级，未立案；全页无真正空 catch{}（grep 0 命中）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[4] | ✅ 已核对 |
| 6 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 异步流程：onLoad/onShow 竞态有防护（onLoad userId 路径 await 后补 loadSessionData；createSession 前置）；fetchSessionMessages 竞态 token 在 store 层在位；发现 006（未处理拒绝）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[5] | ✅ 已核对 |
| 7 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 样式/硬约束：禁 :hover、禁 grid、禁空 catch{}、组件禁 import.meta.env.DEV、业务组件禁 emoji、backdrop-filter 未使用——grep（含 Unicode emoji 区段）对本页与 7 个 chat 组件全部 0 命中；safe-area（输入区 env(safe-area-inset-bottom)、弹层底部安全区）与 --statusbar JS 注入在位；发现 010（token 漏网块）。IMAGE_PATHS：全页图标/头像均走 IMAGE_PATHS，无 /static 裸引用（grep 0 命中）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[6] | ✅ 已核对 |
| 8 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 组件事件接线（本项目高频缺陷项，逐个核对 emit 声明与页面监听）：ChatHeader back/more/avatar-tap/avatar-pat（ChatHeader.vue:20-25 ↔ index.vue:1767-1770）、ChatBubble longpress/avatarTap/tapQuote（ChatBubble.vue:49-52 ↔ index.vue:1882-1884，kebab/camel 归一确认）、ActivityCard tapCard（ActivityCard.vue:29-31 ↔ index.vue:1857）、MatchGreetingTip send（↔1846）、BreakQuestion send（↔1956）、EmojiPanel select（↔2013）、LockScreen 仅 props——本轮全部接线匹配，零缺失。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[7] | ✅ 已核对 |
| 9 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 小程序专项：scroll-view 高度（.chat-scroll flex:1+min-height:0 于 100vh flex 列，2402-2408）、scroll-into-view/scroll-top 互斥处理（453-460/1620-1627）、nearBottom 缓存策略（369-385）、键盘（adjust-position+keyboardheightchange+padding 档切换，1987-1998/2446-2448）、onShow 刷新（loadSessionData+在线状态+破冰 724-768）、onHide/onUnload 计时器清理（770-786）、页面栈（navigateBack fail 兜底 496-510、tabBar 用 openAppPath 263-279）、@tap.stop 阻冒泡+noop 占位（2045-2056 等… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[8] | ✅ 已核对 |
| 10 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | 回归核对（4/4 条均代码层验证）：MP-R2-CHAT-001 → 013（确认脚本参数误用，非产品缺陷，保留）；R21-001 转发 preview → 014（代码层已修，待终验）；R21-002 临时会话破碎 → 015（代码层已修，待终验，残余缺口并入 001）；INDEP-002 conv- → 004（温路径已修、冷启动深链仍 400，立案待修复）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[9] | ✅ 已核对 |
| 11 | subpackages/chat/chat-session/index（聊天会话页）及其引用组件（ChatHeader/… | i18n 全量核对（本页 t() 91 键 × zh-CN/en-US 两 locale 实际求值比对）：发现 005（chat.muteLocalOnly、share.shareVillage 缺失），其余 88 键两语言齐全；另记录 store 依赖链 3 处硬编码中文（并入 008）。类型检查/构建未运行（本轮为纯静态审查，未执行 vue-tsc/build）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json coverage[10] | ✅ 已核对 |

- 方法声明（原文）：静态代码审查（无截图/无开发者工具/无构建/未改任何文件），所有发现均到文件行号取证；i18n 缺键用 node vm 实际求值两个 locale 文件核对；4 条历史回归线索均经本轮代码层验证后才列入（category=Regression）

## SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json

### 覆盖记录（coverage，9 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/circles/circles/post-topic | post-topic.vue 全文逐行（1321 行：script 1-434 / template 436-684 / style 686-1321）：状态管理（publishTarget/interestCategory/selectedTags/favoriteEnabled/circleId/sourceChannel 单页 ref，无跨 store 双写）、API 错误处理（catch 非空、上传失败入外层 catch）、异步流程（isSubmitting 防重、定时器 onUnmounted 清理 161-171）、onLoad 取参 416-433。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[0] | ✅ 已核对 |
| 2 | subpackages/circles/circles/post-topic | 引用文件核对：stores/circle.ts（createTopic 479-540：real 只发 title/content/images，errorMessage 机制）、stores/village/index.ts（createPost 416-520+：errorMessage 独立、selfPendingPosts 审核流）、stores/activity.ts（fetchActivities 168-208：内部 catch 不外抛 → onLoad 428 的 void promise 无未处理拒绝风险）、stores/village/api.ts（createPostApi 203-245：不代上传图片）、stores/village/utils.ts（toBackendCategory 362-367）、composables/useMenuButtonRect.t… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[1] | ✅ 已核对 |
| 3 | subpackages/circles/circles/post-topic | 入口盘点（grep 全 src）：circle-home.vue:371、topics.vue:115 带 circleId；setup/dev/index.vue:209、setup/showcase/index.vue:110 无参；无任何 channel=/activityId= 入口 → 帖子模式分支仅 showcase/dev 可达（campusPostFallback）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[2] | ✅ 已核对 |
| 4 | subpackages/circles/circles/post-topic | 事件接线：uni.$emit('village:post-created') 全仓 grep → 监听者仅 village/village/index.vue:560/569（onUnmounted 注销）；ActivityCard 三处父级对照（PostCard:216 / detail:856 / index:695）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[3] | ✅ 已核对 |
| 5 | subpackages/circles/circles/post-topic | 硬约束（R11 附录 B）逐项 grep 本页 + ActivityCard.vue：:hover 无 ✓；grid 无 ✓；空 catch 无（189/255/399 均有处理体）✓；import.meta.env.DEV 无 ✓；emoji（U+1F300-1FAFF/2600-27BF/FE0F 扫描）无 ✓；backdrop-filter 无 ✓；设计 token：仅 1002 #ffffff 与若干 var() 兜底值（兜底属 token 规范允许模式）→ 记 MP-R2-POSTTOPIC-008；IMAGE_PATHS：655 CLOSE_SVG 正常引用 ✓；页面切换逻辑内联 .vue ✓；工具函数均自 .ts 导入 ✓；CardSwiper 不涉及；自定义组件宿主 flex:1 不涉及（本页无自定义组件布局依赖）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[4] | ✅ 已核对 |
| 6 | subpackages/circles/circles/post-topic | 小程序专项：scroll-view（456）flex:1 + 根 min-height:100%（702-708）与 campus/post-topic.vue:414-421/278 同构（页面级原生滚动承载，scroll-y 实际惰性，属全项目统一模式，未计缺陷）；safe-area 见 005；键盘：input/textarea cursor-spacing=20 + textarea :show-confirm-bar=false（460/471/476）✓；onShow 刷新：本页为表单页无需 onShow；发布后列表刷新经 store 响应式（circle-home.vue:237、topics.vue:34）✓；页面栈：navigateBack 均由站内 navigateTo 进入（openAppPath），无首页直开风险；冒泡：activity-picker 遮罩 @tap… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[5] | ✅ 已核对 |
| 7 | subpackages/circles/circles/post-topic | i18n：页面用到的 29 个 circle.postTopic* key + common.backAria/closeAria/loading 全部在 zh-CN.ts 命中（grep 计数≥1）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[6] | ✅ 已核对 |
| 8 | subpackages/circles/circles/post-topic | 本轮未执行（超出只读代码审查角色）：真机/模拟器运行、截图、console/network 取证——005 号的 env() 真机取值与两处回归项的真机终验需交互取证轮补齐。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[7] | ✅ 已核对 |
| 9 | subpackages/circles/circles/post-topic | 对照检查命令（本轮实际执行）：grep -rn ':hover\|display:grid\|backdrop-filter\|import.meta.env\|catch\s*{}' 两文件；grep -nP emoji 区段 post-topic.vue；grep -rn 'village:post-created\|postedChannel\|uploadPostImage\|<ActivityCard\|CIRCLES.POST_TOPIC\|channel=' 全 src；sed 读取 App.vue/global.scss/pages.json/campus 与 village 参照页相关段落。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json coverage[8] | ✅ 已核对 |

## SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json

### 覆盖记录（coverage，11 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/discover-extra/discover/match-success | 页面主体 apps/client/src/subpackages/discover-extra/discover/match-success.vue 全文 218 行逐段读完（R1 修复后版本）：script（store 接线 19-22、myAvatar/partnerAvatar 统一媒体出口 28-42、dev-preview 直达 50-61、loadFallbackPartner 71-82、goChat/keepExploring/handleShare/goBack/handleScreenshot 84-113）、template（success-nav 三钮 119-152 + MatchSuccess 六 props/三事件 154-162）、style（success-nav fixed 胶囊避让 176-199）。本轮核对基于当前工作区代码（git HEAD b3d… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[0] | ✅ 已核对 |
| 2 | subpackages/discover-extra/discover/match-success | 子组件 components/match/MatchSuccess.vue 全文 459 行：props 默认值 17-30、emit 声明 32-36、头像 @error 兜底链 8-15/94/104、scoreIcons/defaultScores 40-42、displayReasons 补齐 48-58、漂浮爱心/涟漪/心跳动画 416-457、样式全段 158-459。事件接线核对：emit chat/explore/share（137/147/151）页面全部监听（match-success.vue:159-161），无漏接；vitest 规格 tests/components/MatchSuccess.spec.ts 在盘（本轮未运行测试，仅确认存在）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[1] | ✅ 已核对 |
| 3 | subpackages/discover-extra/discover/match-success | store 与数据链：stores/match.ts 全文 100 行（状态机/beginCheck/runMatchCheck/markChatReady/reset）；stores/profile.ts 255-384（state avatarUrl、load() 并发守卫与 60s 缓存、real 模式 avatarUrl 从 basic.avatarUrl 同步）；services/api.ts:960-973 getPersonProfile（mock fixtures 匹配/real request，null 语义）；stores/discover/utils.ts:31-82 mapToDiscoverCard（后端原始字段透传）；view-models/match.ts 全文 105 行（toMatchCardUser/buildMatchReasons/computeMa… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[2] | ✅ 已核对 |
| 4 | subpackages/discover-extra/discover/match-success | API/工具：utils/navigation.ts 全文 310 行（openAppPath 空路径防御、tab query 桥接、10 层栈满 redirectTo 兜底；goChat 未传 fail 回调但封装内部已兜底，不立项）；utils/media.ts:129-225 resolveMediaUrl 统一出口（002 修复依据）+ appendTokenIfMissing 268-296。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[3] | ✅ 已核对 |
| 5 | subpackages/discover-extra/discover/match-success | 常量/配置/资源（全部本轮逐一核实存在）：constants/routes.ts:30 TAB.DISCOVER、:104 CHAT.SESSION、:68 DISCOVER.MATCH_SUCCESS；pages.json:140-144 subpackages/discover-extra 注册 discover/match-success；config/images.ts:41 DEFAULT_AVATAR、43 AVATARS、510 HEART_FILLED、484 BOOK、525 FOOD、533 MUSIC、559 RUN、674 LOGIN_SPLIT['r06_c01']——页面/组件引用的全部图片键在盘；i18n zh-CN.ts:446-456 matchSuccess 键、:24 common.back、:901/:916 discover.partnerDefa… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[4] | ✅ 已核对 |
| 6 | subpackages/discover-extra/discover/match-success | 硬约束逐项（R11 附录 B，本轮全为只读 grep/python 扫描）：禁 :hover——页面+组件 0 命中（hover-class/hover-stay-time 为 mp 正规按压态，press-feedback 全局类在盘，合规）；禁 grid——0 命中；禁空 catch {}——.catch(()=>{}) 1 处命中（003 延续）；catch (_e) 带语句（match-success.vue:77、useStatusBarHeight.ts:15）非空捕获合规；组件禁 import.meta.env.DEV——两文件 grep exit=1（0 命中，合规；discover/utils.ts 的 isDev 来自 config/env 系 .ts 工具层，合规）；业务组件禁 emoji——python 逐字符扫描命中 ⤴ U+2934（004 延续）；‹ U+20… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[5] | ✅ 已核对 |
| 7 | subpackages/discover-extra/discover/match-success | 组件事件接线（本项目高频缺陷项）：MatchSuccess 三 emit 全部被页面监听、参数签名一致；头像 @error 兜底链完整（组件内两 ref + 页面层 resolveMediaUrl\|\|DEFAULT_AVATAR 双保险）；nav 三钮 @tap 直连函数无冒泡冲突（.success-nav 容器 pointer-events:none、按钮 auto，未滥用 @tap.stop，合规）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[6] | ✅ 已核对 |
| 8 | subpackages/discover-extra/discover/match-success | 小程序专项：scroll-view——页面无 scroll-view，依赖页面级滚动，无高度塌陷；safe-area——--statusbar 由 getSystemInfoSync 注入而非 env()（001 修复链）；fixed——.success-nav fixed+z-index:20+pointer-events 分层方案正确；键盘——无输入控件 N/A；onShow 刷新——无 onShow，一次性庆祝页数据 onLoad 一次消费，profileStore.load 失败有默认头像兜底（沿用 R1 留档口径，不立项）；页面栈——goBack 按 getCurrentPages().length>1 分流 navigateBack/switchTab，openAppPath 内置栈满兜底；@tap.stop/catchtap——未滥用（合规）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[7] | ✅ 已核对 |
| 9 | subpackages/discover-extra/discover/match-success | 架构/重复代码留档（未立项）：goBack 与上游 matching.vue:42-49 逐字重复，且 getCurrentPages().length>1 分流模式全仓 12+ 文件散布（本轮 grep -l 佐证：LockScreen/settings/verification/vip/village 等），系项目级系统性现状，沿用 R1 口径不单独立项；myAvatar 解析口径在 matching.vue:32（裸 avatarUrl）与本页：28-33（resolveMediaUrl）不一致，属上游页面问题，移交对应页审阅人。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[8] | ✅ 已核对 |
| 10 | subpackages/discover-extra/discover/match-success | 数据诚实性留档（未立项，沿用 R1 口径）：getScorePercent 恒返 [90,85,80,79]（MatchSuccess.vue:60-62），MatchCardUser.matchScore（computeMatchScore 计算后）从未被本页消费；buildMatchReasons 页面调用未传 myTags（match-success.vue:43），commonTags 退化为对方前 3 个标签+三条浪漫氛围兜底——均为规格书 7.8/D-04 既定展示行为且注释自述，交互轮验收按此口径通过；dev-preview=1 QA 直达入口生产可用为既定 QA 机制（OP01 依赖），未立项。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[9] | ✅ 已核对 |
| 11 | subpackages/discover-extra/discover/match-success | 本轮执行说明：仅读源码与既有留档/截图（round-1 code-findings/interact JSON、r11-acceptance 截图路径），未驱动开发者工具、未新截图、未改任何业务文件；运行过的检查均为只读扫描（grep/python 逐字符扫描/pages.json 结构探查），无测试/构建执行。历史线索 MP-R3-MSUCCESS-001/002 经代码层复核按 001 维持关闭（已验证）；R1 八项发现逐项对现状复核：002 已修复（本轮 002 已修复待终验）、001 已验证维持，003-008 延续待修复并更新至现行行号。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json coverage[10] | ✅ 已核对 |

## SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/discover-extra/discover/matching（含引用组件/store/uti… | 架构/重复代码/命名：match store 状态机单一来源；两页重复逻辑（R1-010）与重复状态（R1-007）已核仍在；store 拆分（discover/index+actions）命名与职责清晰，无新违规,状态管理：store↔页面同步——页面直写 matchedUser（R1-006）、animationDone 双份（R1-007）、onUnload 残留（R1-005）均复核仍在；swipeRight 300ms 防抖幂等队列（constants.ts:80）与 consumeCardFromDeck 守卫（matching.vue:157 先查 cards.some）无双重消费，正常链路无竞态,API 错误处理：runMatchCheck try/catch→lastError→failed toast（match.ts:60-64 + matching.vue:63-6… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对；notRun 见原文（3 项） | code-findings/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json coverage[0] | ✅ 已核对 |

## SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/village/village/index | 硬约束 grep（:hover 伪类/display:grid\|grid-template/backdrop-filter/import.meta.env.DEV）：本页 + components/village 8 个 .vue 全量扫描，0 命中（仅 :hover-stay-time 属性绑定与注释文案）；空 catch：grep 'catch (_e) {}' index.vue = 0；page 内全部 catch 块带注释或逻辑（如 index.vue:106-108/115-117/229-231）；组件事件接线核对：ChannelTabs @change→onChannelChange✓（update:modelValue 按 MP-R1-VILLAGE-INDEX-101 有意不监听）；PostCard 7 个 emit（like/favorite/follow/open-… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json coverage[0] | ✅ 已核对 |

- 方法声明（原文）：静态代码审查（无截图/无开发者工具/无构建/无测试运行），所有发现均到文件行号取证；R11 附录 B 硬约束以 grep 全量扫描本页 + components/village 全部 8 个 .vue；历史问题 3 条逐一在代码层回归核对；未修改任何源文件（仅写入本报告）

## SUBPACKAGES-VILLAGE-VILLAGE-POST.json

### 未运行核对（checksNotRun，如实登记）

- ⚠️ 未运行：ESLint：cd D:\6\恋爱小程序 && npx eslint apps/client/src/subpackages/village/village/post.vue → ConfigError: Key "constructor-super": structuredClone is not defined（环境 Node 版本过旧，ESLint 9 flat config 无法加载）。故「禁空 catch {}」仅能按人工核对结论：post.vue 无字面空 catch 块，4 处注释式 catch（330-332/358-360/404-407/434-436）与 1 处 .catch(() => {})（523，上方 522 行有说明注释）均为项目既有惯例且 R11 验收时已存在。
- ⚠️ 未运行：运行时/截图/交互验证：A2 为只读代码层审查，不驱动开发者工具。
- ⚠️ 未运行：TypeScript 编译、单元测试：本次 ask 未要求，未运行。

（来源：code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json checksNotRun）

## SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/village/village/publish | 架构/重复：leave() 与 submitPublish 成功路径导航兜底逻辑重复（PUB-108）；草稿双写定时器链（500ms 本地/2000ms 后端）读毕，cancel/flush/onUnmounted 清理闭环正确；状态管理：MAX_CONTENT_LENGTH 单一来源已核实（页面 :maxlength/计数与 store 校验同源，MP-R1-PUB-016 修复在位）；targetType/visibility 组合在草稿恢复路径无一致性 invariant（PUB-101）；currentCity 为 setup 一次性快照（PUB-110）；API 错误处理：submitPublish 的 try/catch/finally 完整（showLoading 必隐藏、submitting 必复位、后端 message 优先展示）；circleStore.fetchCir… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json coverage[0] | ✅ 已核对 |

- 方法声明（原文）：静态代码审查（无截图/无开发者工具/无构建/未修改任何源文件）。publish.vue 818 行全文精读；依赖链 stores/village/{index,constants,utils,api}.ts、stores/circle.ts、services/api.ts（draft/upload 段）、services/mocks/fixtures.ts、utils/{media,compress-image}.ts、config/images.ts、i18n 双语 keys、pages.json、styles/tokens.scss 逐一核对；硬约束以 grep 扫描本页 .vue；后端 apps/api CreatePostRequest/VillagePostService/Post 枚举源码抽查用于校准可见性类发现的置信度

## 次要18.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/village/village/detail；subpackages/village/villa… | subpackages/village/village/detail：全文件已读（script 747 行+模板+样式抽样核对 1782-3239 风险点 grep）。核对：约束（无 :hover/display:grid/backdrop-filter/DEV）通过；点赞链路 likePost 乐观更新+回滚+同引用守卫通过；评论分页/防抖/上传链路错误处理均有 toast；MP-R1… ｜ subpackages/village/village/tag-posts：全文件已读。核对：分页 off-by-one 已修复（(page-1)*PAGE_SIZE，:129，MP-R1-TAGPOSTS-001 关闭）；缺参+栈=1 返回守卫已修复（goBack reLaunch :242-248，MP-R1-TAGPOSTS-002 关闭）；scroll-view/refresher 绑… ｜… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要18.json coverage[0] | ✅ 已核对 |

## 次要19.json

### 覆盖记录（coverage，1 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/discover-extra/home/segment；subpackages/discover… | subpackages/discover-extra/home/segment：全文件已读（305 行）。i18n：脚本核对 7 个静态 t() 键在 zh-CN 全存在——历史 MP-R1-SEGMENT-001（home.segmentHighMatch/segmentEmpty 裸键）代码层确认已修复关闭。竞态：load() 无 token（onLoad 单次+下拉场景，风险低未列 issu… ｜ subpackages/discover-extra/nearby/people：全文件已读（440 行）。通过项：竞态 loadToken ✓、userId 去重兜底 ✓、onPullDownRefresh 已开（pages.json=true）✓、头像走 SafeImage（内部 resolveMediaUrl+http 源本地化）✓、tagLabelsFor 单一映射源 ✓、tabs… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要19.json coverage[0] | ✅ 已核对 |

## 次要20.json

### 覆盖记录（coverage，8 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/profile-extra/verification/index（认证中心） | 通读 1127 行。防重入守卫/定时器清理/深链返回兜底/pending 30s 轮询齐全；模拟通过按钮与重置/删除认证已限 mock（MP-R1-VERIFY-INDEX-003 在档）；safe-top 前置 nav-bar 正确。发现：驳回回显图片相对路径直连 <image> 与重提上传必败（MP-R2-VERIFICATION-001）；状态枚举契约分裂（MP-R2-VERIFICATION-002）。空 catch：loadVerification :313 仅注释（全库既定兜底惯例，未单列）。IMAGE_PATHS 引用全部存在（ICONS_EMOJI.CHECK_CIRCLE/PENDING/CHECK_FAIL/GRAD_CAP/TARGET/SCORE/ROCKET/GIFT/CHAT/WARNING 已逐一核对 config/images.ts:466-574）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[0] | ✅ 已核对 |
| 2 | subpackages/profile-extra/verification/real-name（实名认证） | 通读 952 行。身份证格式校验/未成年人门禁/409 处理/轮询/定时器清理在档。发现：401 时 getBasicProfile 静默回退 mockFixtures 导致 isAdult 由假资料决定（MP-R2-REALNAME-001）；回显证件照相对路径同病（并入 MP-R2-VERIFICATION-001）。:318/:336 兜底 catch 仅注释（惯例内）。未认证态图标误用 CHECK_CIRCLE（:113，语义小瑕疵未单列）。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[1] | ✅ 已核对 |
| 3 | subpackages/profile-extra/profile/other（他人主页） | 通读页面 576 行 + 组件链 ProfileShell/PublicProfile/PublicHero/PublicIdentity/PublicBio/PublicGallery/PublicMoment/RelationshipCTA/GovernanceMenu/WhisperComposeSheet/BottomSheet + likes store + api/profile.ts + types/profile.ts + 后端 UserProfileController/MatchController。历史线索核对：R12-IND-PROFILE-OTHER-001 已修复（401 单独文案 other.vue:139-144、错误态 FAB 隐藏 :422 v-if="!errorMessage && !loading"）；MP-R1-OTHER-001 主路径已修复（… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[2] | ✅ 已核对 |
| 4 | subpackages/profile-extra/profile/location（位置设置） | 通读 420 行 + utils/location.ts。fetchCurrentLocation 内部消化失败返回 null、reportLocation 静默自兜底，onLoad 裸调无 unhandled rejection 风险；map/marker/chooseLocation 均限定 MP-WEIXIN 条件编译，H5 有降级占位；goBack 深链兜底 reLaunch。样式 token 化良好（var 带 fallback）。未发现需立项问题。i18n：页面文案硬编码中文但与既有 R5 验收形态一致，未单列。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[3] | ✅ 已核对 |
| 5 | subpackages/profile-extra/profile/privacy（隐私设置） | 通读 195 行 + stores/profile.ts（allowSameSchoolRecommend/receiveSameSchoolInfo 持久化 :169-185/:332-337/:360-366 核实存在）。switch checked/color 走 designTokens；MP-R1-PRIVACY-001「仅本机保存」文案如实（已知保留项）；goBack 兜底正确。状态栏注入用了 useStatusBarHeight 内联 px + CSS var 双机制并存（内联优先，功能正常），不构成缺陷未立项。无发现。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[4] | ✅ 已核对 |
| 6 | subpackages/profile-extra/profile/album（我的相册） | 通读 800 行 + stores/profile.ts 关键 action（uploadAvatar :698）。MP-R1-ALBUM-001 修复在档：网格与预览均 resolveMediaUrl（:365/:371）、/static 走自建查看层；flex 三列替代 grid、hover-class 替代 :hover、隐私授权前置。发现：onMounted+onShow 双触发（MP-R2-ALBUM-001）。localReorderAsAvatar 失败回退仅本地生效为注释留档的既定兜底，未单列。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[5] | ✅ 已核对 |
| 7 | subpackages/profile-extra/profile/favorites（我的收藏） | 通读 179 行 + stores/village/index.ts toggleFavorite（:611-673）。发现：unfavorite 无错误处理（MP-R2-FAVORITES-001）；scroll-view 高度硬编码（MP-R2-FAVORITES-002）。@tap.stop 用法正确阻止冒泡到 openPost；onShow 刷新在档（:95 空 catch 为 mock 兜底惯例）。resolveMediaUrl 用于封面/头像（:35/:39）正确。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[6] | ✅ 已核对 |
| 8 | subpackages/profile-extra/profile/tasks（任务中心） | 通读 634 行 + services/api.ts checkIn/getCheckInStatus（:622-641，幂等键在档）+ session store（isProfileComplete :401/refreshSession :467）+ i18n key 抽查（zh-CN.ts:1676-1695 存在）。历史线索核对：MP-R1-TASKS-001 已修复（checkinDone 状态驱动 :275）、002 已修复（真实积分文案 :279）、003 已修复（complete-profile path :123，localTasks 同步补 :123）、004/005 修复留档在案。发现：real 失败静默回退 mock 任务+签到无响应+checkinDone 单向锁存（MP-R2-TASKS-001）、real 模式 aria 空标签（MP-R2-TASKS-002… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（结论见 ACTION 原文） | code-findings/次要20.json coverage[7] | ✅ 已核对 |

### 硬约束扫描（hardConstraintsScan）

| PRE | ACTION | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|
| subpackages/profile-extra/verification/index；subpa… | 禁:hover | 范围文件 0 违例 | PASS — 范围文件 grep :hover 仅命中 album.vue:13 注释；交互均用 hover-class。 | code-findings/次要20.json hardConstraintsScan.禁:hover | ✅ PASS |
| subpackages/profile-extra/verification/index；subpa… | 禁grid | 范围文件 0 违例 | PASS — 范围文件无 display:grid/grid-template。 | code-findings/次要20.json hardConstraintsScan.禁grid | ✅ PASS |
| subpackages/profile-extra/verification/index；subpa… | 禁空catch{} | 范围文件 0 违例 | PASS（字面）— 无字面空块；存在仅注释兜底 catch（verification/index.vue:313、real-name.vue:318/336、tasks.vue:192/350/360）与两处 `.catch(() => {})`（other.vue:130/199），前者为全库既定兜底惯例未单列，后者并入 MP-R2-OTHER-002 说明。 | code-findings/次要20.json hardConstraintsScan.禁空catch{} | ✅ PASS |
| subpackages/profile-extra/verification/index；subpa… | 组件禁import.meta.env.DEV | 范围文件 0 违例 | PASS — 范围文件仅注释提及。 | code-findings/次要20.json hardConstraintsScan.组件禁import.meta.env.DEV | ✅ PASS |
| subpackages/profile-extra/verification/index；subpa… | 业务组件禁emoji | 范围文件 0 违例 | 边缘违规 1 处 — PublicBio.vue:7 ❝（U+275D），记 MP-R2-PUBLICBIO-001。 | code-findings/次要20.json hardConstraintsScan.业务组件禁emoji | ⚠️ 边缘违规 |
| subpackages/profile-extra/verification/index；subpa… | 设计token强制 | 范围文件 0 违例 | 违规 — 公共主页组件族大面积硬编码 hex，记 MP-R2-OTHER-004。 | code-findings/次要20.json hardConstraintsScan.设计token强制 | ❌ 违例 |
| subpackages/profile-extra/verification/index；subpa… | backdrop-filter仅H5条件编译 | 范围文件 0 违例 | PASS — 范围文件无 backdrop-filter。 | code-findings/次要20.json hardConstraintsScan.backdrop-filter仅H5条件编译 | ✅ PASS |
| subpackages/profile-extra/verification/index；subpa… | IMAGE_PATHS | 范围文件 0 违例 | PASS — 两页+组件引用的全部 key 已逐一核对存在（config/images.ts:182/200/210/248/274/298/356/433/466-574）。 | code-findings/次要20.json hardConstraintsScan.IMAGE_PATHS | ✅ PASS |

## 次要21.json

### 覆盖记录（coverage，10 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【dnd（settings/dnd.vue，852 行，全读）】加载/保存/校验/goBack 守卫齐全：loadSetting catch→错误态+重试(dnd.vue:90-117,293-296,337-347)；handleSave isSaving 守卫+服务端回填(238-275)；goBack 栈=1 switchTab 我的兜底(281-288)——回归 MP-R1-DND-001 代码级已修✔。safe-top 先于 nav-bar(310-314) 且 useMenuButtonRect 注入 --statusbar(31-33)——R3 settings 顶入状态栏根因模式本页无。样式全 token、无 :hover/grid/backdrop-filter/空 catch/emoji；picker/switch/change 事件全部接线；constant()+en… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[0] | ✅ 已核对 |
| 2 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【feedback/history（history.vue，604 行，全读）】onShow 统一加载(260-262)、store.errorMessage 映射错误态(108-114)、ISO 时间已 formatDateTime(37-38,201-203)——回归 MP-R1-FEEDBACK-001 已修✔；自动展开定时器 onUnmounted 清理(47-57,220-245)；附件 previewImage(180-184)。发现 1 项：MP-R2-FEEDBACKHIST-001（详情失败错误卡劫持整页列表）。utils/time.ts formatDateTime/getCurrentLocale 核对有效（Invalid Date→'-'，Intl 兜底链 226-241）；AppShell 返回自带栈=1 兜底(AppShell.vue:111-140)。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[1] | ✅ 已核对 |
| 3 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【official-chat（index.vue，1001 行，全读）】死按钮已接线（···/+ toast 敬请期待 78-83、表情接 EmojiPanel 70-77,510-543）——回归 MP-R1-OFFICIALCHAT-002 已修✔；goBack 栈守卫+switchTab ROUTES.TAB.CHAT（TAB_BAR_ROUTES 含 CHAT，routes.ts:259-264）——MP-R1-OFFICIALCHAT-003 已修✔；发送真实 API+幂等键+失败回滚草稿(99-155)；滚底锚点方案(174-199)。发现 4 项：MP-R2-OFFICIALCHAT-001（P0 历史同病：mock 分支初载不滚底+ready 竞态，Regression）、002（token 硬编码）、003（文案不走 i18n）、004（用户气泡 EmojiText 不一… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[2] | ✅ 已核对 |
| 4 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【campus（setup/campus/index.vue，409 行，全读）】隐私「?」弹窗 showCancel:false（106-113），取消路径不复存在、页内无 captureException——回归 MP-R1-SETUPCAMPUS-001 已修✔；三级联动重置逻辑正确（77-101）；isReauthScenario 分流保存/跳过目标（149-192）；profileStore.load() 吞错（stores/profile.ts:305-414 catch 不 rethrow），onMounted await 无未处理 rejection。border: var(--c-border-card) 为完整 border 值（design-variables.scss:488），合法。发现关联 2 项：MP-R2-SETUP-001（进度条缺时间安排步骤+页内注释自… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[3] | ✅ 已核对 |
| 5 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【schedule（setup/schedule/index.vue，203 行，全读）】数组渲染全部时段+新增/删除(40-47,83-118)；保存校验/错误 toast/i18n(49-72)。发现 1 项：MP-R2-SCHEDULE-001（无防重复提交，BottomActionBar 未传 disabled）。courseBlocks 以空数组随 {…form} 提交符合契约注释(23-30)；onMounted 依赖 store.load 吞错无未处理 rejection(32-35)；cursor-spacing 存在(79,90)。removal 用 idx 为 key 的潜在复用问题经核对 v-model 绑定数组元素，值随索引更新，不构成发现。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[4] | ✅ 已核对 |
| 6 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【recommend-pref（setup/recommend-pref/index.vue，353 行，全读）】GET/PUT /recommendations/preferences/me 不带 userId（83-95,122-135）；catch 置 error=true 错误态+重试(97-110)——review #28 修复在位；saving 守卫(115-117)；未登录默认值分支(91-96)。发现 1 项：MP-R2-RECOMMEND-001（scopeOptions 非 computed + retry 原生 button ::after）。loadIdentity 同步导入(20,27)；SetupProgress clamp 逻辑安全(110-116)。 | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[5] | ✅ 已核对 |
| 7 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【interest（setup/interest/index.vue，141 行，全读）】MP-R1-SETUPINTEREST-001（栈守卫 navigateBack/switchTab 兜底 53-59）与 002（全量合并防清空 40-49）已修✔；MP-R9-STATUS-005（padding-top:calc(var(--statusbar,…)+24rpx) + useMenuButtonRect 注入，7-15,72,92-93）已修✔；TagSelector groups=['interest'] 过滤（MP-R1-SETUPINTEREST-003，80 行；TagSelector.vue:36-58 v-model/update:modelValue 接线核对✔）。发现 2 项：MP-R2-INTEREST-001（P2 无防重入→双提交双返回）、002（onLoa… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[6] | ✅ 已核对 |
| 8 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【support/feedback（index.vue，820 行，全读）】MP-R1-FEEDBACK-001 时间已 formatDateTime(40-41,407-416,580) 已修✔；上传链路（隐私授权→chooseImage→校验→uploadImage，150-265）守卫/取消分支/错误 toast 齐全；提交三类型经 store 布尔返回+store.errorMessage(310-358)；@tap.stop 删除按钮防冒泡(511)；IMAGE_PATHS.ICONS_COMMON.CLOSE_WHITE_SVG/CAMERA 资源实测存在。发现 2 项：MP-R2-FEEDBACK-001（裸 navigateTo 无栈满兜底）、002（记录区加载失败静默空态，与 history 页已修模式不同步）。历史页路径 /subpackages/profile-ext… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[7] | ✅ 已核对 |
| 9 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【横向核对】硬约束扫证（8 页+直接组件）：:hover 伪类 0 处（仅注释与 :hover-stay-time 属性，grep 实证）；display:grid/grid-template 0 处；空 catch{} 0 处（grep 'catch\s*{\s*}' 0 命中）；8 页无 import.meta.env 直读（仅注释提及）；backdrop-filter 0 处；页面切换逻辑均内联 .vue 或调用 .ts 工具（navigation/time/media/haptic 均 .ts 导入）✔；CardSwiper 本轮页面未引用（N/A）；自定义组件宿主 flex:1 项：TagSelector/EmojiPanel 在 flex 列容器内由默认 stretch/收缩吸收，未发现布局断点，判 N/A。组件事件接线全量核对：BottomActionBar@primary（… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[8] | ✅ 已核对 |
| 10 | subpackages/profile-extra/settings/dnd（免打扰设置）；subpackages/pr… | 【回归线索核对结论（仅限本轮 8 页，代码级）】已修✔：MP-R1-DND-001、MP-R1-OFFICIALCHAT-002、MP-R1-OFFICIALCHAT-003、MP-R1-SETUPCAMPUS-001、MP-R1-SETUPINTEREST-001/002（但衍生出新缺陷 MP-R2-INTEREST-001）、MP-R1-FEEDBACK-001、MP-R9-STATUS-005。部分修复→立案 Regression：MP-R1-OFFICIAL-003/R21-OFFICIALCHAT-001（mock 分支未覆盖+ready 竞态，MP-R2-OFFICIALCHAT-001）。不在本轮页面范围未验证：MP-R3-PROFILE-001/002、MP-R3-SETTINGS-001、MP-R7-PROFILE-001/002/003/004/005、MP-R1-SE… | Layer A：全量逐行审查+引用链核对+证据到 file:line | 已核对（原文为核对语句） | code-findings/次要21.json coverage[9] | ✅ 已核对 |

## 次要22.json

### 覆盖记录（coverage，7 条）

| # | PRE（核对对象） | ACTION（核对内容，原文） | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|
| 1 | subpackages/discover/activities/index（活动列表） | 通读全文 1156 行；store 契约（activity.ts fetchActivities TTL/enrollActivity 吞错语义与页面 toast 配合核实）；组件接线（AppShell/SectionCard/BottomActionBar @primary/@secondary 已监听、EmptyState、@tap.stop 编译为 catchtap 正确）；日历算法、防抖 loadMore+cancel、onShow 刷新、i18n、IMAGE_PATHS 键存在性脚本核对均过 | Layer A：全量逐行审查+引用链核对+证据到 file:line | pass=禁 :hover/grid/emoji、无空 catch、无 import.meta、IMAGE_PATHS … | code-findings/次要22.json coverage[0] | ✅ pass=禁 :hover/grid/emoji、无空 catch、无 import.meta、IMAGE_PATHS 全存在、BottomActionBar 事件接线正确、scroll-view 已有 min-height 兜底（MP-R1 已修） |
| 2 | subpackages/market/detail/index（商品详情） | 通读全文 662 行；封存守卫与竞态补偿 watch 逐行推演；EmptyState props 对照组件声明；goBack 栈守卫；SafeImage/菜单栏变量注入；pages.json 确认全局 navigationStyle:custom | Layer A：全量逐行审查+引用链核对+证据到 file:line | pass=loadProduct 404/错误分支完整、handleBuyNow 封存守卫、无硬编码色、无 emoji、… | code-findings/次要22.json coverage[1] | ✅ pass=loadProduct 404/错误分支完整、handleBuyNow 封存守卫、无硬编码色、无 emoji、SafeImage 用法正确 |
| 3 | subpackages/market/shop/index（积分商城） | 通读全文 736 行；onShow 封存早退路径推演；real/mock 双分支 fetch、分类切换重新拉取、错误态+重试齐全；签到余额条接 checkInStore（fetchStatus 方法存在）；checkin pointsBalance 字段存在 | Layer A：全量逐行审查+引用链核对+证据到 file:line | pass=fetchShopItems 错误态完整、goBack 有栈守卫、token 使用规范（无未定义 token）… | code-findings/次要22.json coverage[2] | ✅ pass=fetchShopItems 错误态完整、goBack 有栈守卫、token 使用规范（无未定义 token）、无 grid/:hover/emoji |
| 4 | subpackages/market/wallet/index（钱包） | 通读全文 392 行；coins.ts 全文核对（balanceCents/分转元、fetchBalance/listTransactions）；演示充值 Idempotency-Key、useMock\|\|isDev 门控（isDev 来自 config/env 非 import.meta.env.DEV，合规）；SkeletonBlock props 匹配 | Layer A：全量逐行审查+引用链核对+证据到 file:line | pass=充值失败 toast、成功后双拉刷新、haptic、无 emoji、无空 catch 字面违规（静默 catc… | code-findings/次要22.json coverage[3] | ✅ pass=充值失败 toast、成功后双拉刷新、haptic、无 emoji、无空 catch 字面违规（静默 catch 带注释已按静默失败上报） |
| 5 | subpackages/vip/index（会员购买） | 通读全文 1051 行；mock 支付定时器生命周期逐行推演；自动续费受控回显 key 机制（MP-R1-VIP-001）核对；switch :color 取 designTokens.color.gold（tokens.ts:131 存在）；ROUTES.VIP.* 常量与 pages.json 一致；sentry captureException/addBreadcrumb 导出存在；P1-08 守卫 onLoad+交互双重覆盖 | Layer A：全量逐行审查+引用链核对+证据到 file:line | pass=real 模式假支付已封堵（isMockMode 分支）、套餐配置单一来源 vip-plans.ts、防重复点… | code-findings/次要22.json coverage[4] | ✅ pass=real 模式假支付已封堵（isMockMode 分支）、套餐配置单一来源 vip-plans.ts、防重复点击 createButtonGuard+processing、switch 重建 key 方案正确、无 emoji/grid/:hover |
| 6 | subpackages/vip/promo-code（优惠码） | 通读全文 603 行；promo-code.ts 全文核对（validate/redeem 状态清理对称性）；输入轻校验正则、readInputValue 兼容写法、cursor-spacing 键盘处理、redeem 双击锁 | Layer A：全量逐行审查+引用链核对+证据到 file:line | pass=金额分转换 Math.round、失败 toast 完整、handleReset 调 store.reset、… | code-findings/次要22.json coverage[5] | ✅ pass=金额分转换 Math.round、失败 toast 完整、handleReset 调 store.reset、无硬编码色/emoji/import.meta |
| 7 | subpackages/vip/bills（会员账单） | 通读全文 527 行；pages.json 确认本页 enablePullDownRefresh:true（下拉刷新配置有效）；vip-billing.ts 全文核对（缓存短路、mock 相对时间）；筛选/类型/状态映射、formatDate/amount 精度 | Layer A：全量逐行审查+引用链核对+证据到 file:line | pass=loadBills catch 有 toast、EmptyState 用法正确（title 为合法 prop）… | code-findings/次要22.json coverage[6] | ✅ pass=loadBills catch 有 toast、EmptyState 用法正确（title 为合法 prop）、filter 类型安全、token 使用规范 |

### 硬约束核查（hardConstraintsCheck）

| PRE | ACTION | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|
| subpackages/discover/activities/index, subpackages… | 禁:hover | 范围文件 0 违例 | pass — grep 7 页仅注释提及，无 CSS :hover | code-findings/次要22.json hardConstraintsCheck.禁:hover | ✅ pass |
| subpackages/discover/activities/index, subpackages… | 禁grid | 范围文件 0 违例 | pass — 无 display:grid（日历 7 列用 flex+calc，符合 mp-weixin 约定） | code-findings/次要22.json hardConstraintsCheck.禁grid | ✅ pass |
| subpackages/discover/activities/index, subpackages… | 禁空catch{} | 范围文件 0 违例 | pass（字面）— 无空块；wallet:54-55 与 vip:391-393 为带注释静默 catch，已按『静默失败』上报 -011/-007 关联 | code-findings/次要22.json hardConstraintsCheck.禁空catch{} | ✅ pass |
| subpackages/discover/activities/index, subpackages… | 组件禁import.meta.env.DEV | 范围文件 0 违例 | pass — 7 页无 import.meta；wallet 用的 isDev 来自 config/env.ts（多信号检测，合规） | code-findings/次要22.json hardConstraintsCheck.组件禁import.meta.env.DEV | ✅ pass |
| subpackages/discover/activities/index, subpackages… | 业务组件禁emoji | 范围文件 0 违例 | pass — node 脚本扫描 7 页无 emoji 字符（图标全部 IMAGE_PATHS SVG） | code-findings/次要22.json hardConstraintsCheck.业务组件禁emoji | ✅ pass |
| subpackages/discover/activities/index, subpackages… | 设计token强制 | 范围文件 0 违例 | 1 项违规 — --c-primary 未定义（-013）+ 6 处硬编码字号（-014/-017）；其余 403 个引用 token 全部有定义（脚本交叉核对） | code-findings/次要22.json hardConstraintsCheck.设计token强制 | ⚠️ 含违例项 |
| subpackages/discover/activities/index, subpackages… | backdrop-filter仅H5 | 范围文件 0 违例 | pass — 7 页无 backdrop-filter | code-findings/次要22.json hardConstraintsCheck.backdrop-filter仅H5 | ✅ pass |
| subpackages/discover/activities/index, subpackages… | IMAGE_PATHS | 范围文件 0 违例 | pass — 22 个引用键脚本核对全部存在 | code-findings/次要22.json hardConstraintsCheck.IMAGE_PATHS | ✅ pass |

- 方法声明（原文）：只读源码审查：通读 7 个页面全文；核对 pages.json、6 个 store（activity/coins/vip-billing/promo-code/vip-auto-renew/app-config）、5 个组件（AppShell/BottomActionBar/EmptyState/SafeImage/SkeletonBlock）、useMenuButtonRect/useStatusBarHeight/debounce/navigation/i18n/config-env/theme-tokens/config-images；未运行模拟器/未截图（A2 只读代码层）

## pages/login/index 覆盖记录与观察证据（任务书转交全文）

> 以下为任务书「覆盖记录与观察证据」转交的 login 页核对全文；与 `code-findings/PAGES-LOGIN-INDEX.json` coverage[0].checked 实读核对内容一致（任务书版本另含「MP-R1-LOGIN-002 双导航治理」与「重点 loading/userSession/watch 联动」细节，属同一审查产出的更完整行文）。PRE=pages/login/index（apps/client/src/pages/login/index.vue 1601 行）；STATUS=covered。

| PRE | ACTION | EXPECTED | OBSERVED | EVIDENCE | STATUS |
|---|---|---|---|---|---|
| pages/login/index（主审文件全量 1601 行 script/template/style） | 主审文件 apps/client/src/pages/login/index.vue 全量 1601 行（script 645 行逐行、template、style）。引用链全量核对：stores/session.ts（897 行全量，重点 loading/userSession/watch 联动）、stores/app-config.ts（isLoginOpen/isRegisterOpen 默认开放语义）、services/auth.ts（431 行全量：wechat/phone/register/guest/sms/bind 六链路与 token 写入）、services/http.ts:830-880（reportError 上报口径）、services/api-error.ts（AppApiError）、utils/navigation.ts（replaceAppPath/consumePendingLoginRedirect/openAppPath 兜底）、utils/debounce.ts（createButtonGuard 实现）、utils/haptic.ts（no-op 现状）、composables/useMenuButtonRect.ts（--statusbar 注入，页面根节点 :style 接线确认）、config/env.ts、config/showcase.ts、config/images.ts、constants/routes.ts。i18n：页面使用的全部 38 个 login.* 键在 zh-CN.ts（quoted-key grep）与 en-US.ts（unquoted-key grep）双双核对存在。IMAGE_PATHS：ICONS_EMOJI.MOBILE/KEY/LINK/CAKE、ICONS_V2.SPROUT/WECHAT_GREEN_SVG、POSTERS.LOGIN_ILLUSTRATION、ICONS_COMMON.CHECK_WHITE_SVG 共 8 个引用全部核对定义且磁盘文件存在（src/static/assets/**）。编译产物取证：dist/build/mp-weixin/pages/login/index.wxml（2026-09-22 05:50 构建，与当前源码一致）input 透传检查、register 页 password 属性对照。硬约束逐项：:hover（页面无；死组件 PhoneBtn 有）、display:grid（无）、空 catch（协议跳转 4 处空 fail/catch）、import.meta.env.DEV（页面无，走 config/env isDev——合规）、emoji（页面无 emoji，› 为标点）、backdrop-filter（无）、token… | 引用链全量核对+硬约束逐项+小程序专项逐项+回归核对，证据到 file:line | covered | code-findings/PAGES-LOGIN-INDEX.json coverage[0]；任务书覆盖记录转交全文 | ✅ covered |

> 「未运行（超出 Layer A 职责/环境，如实声明）」：真机与 DevTools 运行时取证、vue-tsc --noEmit 全量类型检查、单测套件——本轮无对应执行记录（login 覆盖记录原文）。

## 汇总

- 覆盖记录（coverage）逐条重排：**108 条**（其中 status=covered 1 条）；checksPassed/硬约束扫描等附加核对项：**25 条**；全部 ✅/⚠️ 判定均直接取自原文判定字样，未新增任何运行时结论。
- 运行时交互判定：**0 条**（interact/ 不存在，见顶部来源声明）；真机/DevTools 取证、vue-tsc、单测等未运行项以各文件 checksNotRun/coverageNotes 原文登记。
