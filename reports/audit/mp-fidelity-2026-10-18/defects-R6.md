# R6 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=297　涉及页面=68　涉及帧=134　泳道卡=17　段内继承哈希=95（同段第二条起未重复抄录，非逐条见证）
- 严重度分布：P2=149　P1=96　P3=48　P0=4
- 轴分布：可达性=64　素材缺失=47　文案=42　颜色token=38　位置=21　空态文案=14　圆角=13　需新建=13　间距=13　字号=12　层级遮挡=10　尺寸比例=10
- 批次归属：297 个批次收录，**卡上有而 fixlist 没有的=0**

## (未点名页面)（18 条）

### R6-L04-D02　P1 / 素材缺失　批次 R6-B85
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`d6f3c825323c498e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:336`
- 理想图依据：无基准页，依据=规范文档 §1.6 铁律 3「裸 :src 一律包 resolveMediaUrl / SafeImage」+ 同病灶已修先例 components/common/EmptyState.vue:67-69
- 现象：空态图标位（模板 :336 渲染 88rpx=44px 见方图标，应落 y≈158–202px）实测 0 个非背景像素（取样 x 0–378 / y 100–214 全为 #EEF7F2）——图标根本没画出来；:src 直绑 stateIcons.empty（:26 = IMAGE_PATHS.ICONS_EMOJI.BOOKMARK 的 app-assets 绝对 URL），未过 resolveMediaUrl。
- 建议改法：:336（同页 :327/:394/:406/:417 四处裸 :src）统一包 resolveMediaUrl，或直接改用 EmptyState 组件。
- 修复类别：单页

### R6-L04-D03　P2 / 位置　批次 R6-B85
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`d6f3c825323c498e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:506`
- 理想图依据：无基准页，依据=组件规范 components/common/EmptyState.vue:94-112（空态整块在可视区内垂直居中）
- 现象：空态文案块实测 y=215–256px（426–508rpx），而 feed 可视区是 y=98–814px、中心应≈456px ⇒ 整块比应位高 221px（≈438rpx），下半屏 558px 全空。根因 .feed-state{flex:1} 写在 scroll-view 直接子节点上，mp-weixin 的 scroll-view 子节点不参与 flex 分配，justify-content:center 失效。
- 建议改法：给空态包一层定高容器（height:100% + flex 居中）或直接用 EmptyState（自带居中）。
- 修复类别：单页

### R6-L04-D06　P2 / 文案　批次 R6-B81
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__history__top.png`（sha16=`fbb39e6f66a04b42`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:218`
- 理想图依据：无基准页，依据=规范文档 §3（浏览记录应「一眼认出看过哪篇」：作者+标题+摘要不重复）
- 现象：三张卡片的标题行与摘要行逐字相同——「汉服出行日，路上好多同袍」×2、「和社团的朋友一起去爬山看日出，山顶的风很舒服，心情也开阔了。」×2、「今天在操场跑步遇到了很美的晚霞，随手拍了下来，分享给你们。」×2；实测卡 1 两行文字带宽分别 y=174–191px、198–215px（n=873 / 1795 非白像素），字串一模一样 ⇒ :217 渲染 post.title、:218 渲染 post.content，real 后端两字段同值，每卡白占一行且零信息增量。
- 建议改法：content 与 title 相同时不渲染摘要行（v-if="item.post.content !== item.post.title"），或后端摘要取正文前 N 字。
- 修复类别：单页

### R6-L04-D07　P2 / 颜色token　批次 R6-B81
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__history__top.png`（sha16=`fbb39e6f66a04b42`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:451`
- 理想图依据：无基准页，依据=规范文档 §1.2 配色方案（辅助文字需达可读对比度）
- 现象：互动数据行「赞 0 藏 0 看 116 评 8」实测最暗字形像素 #848D89、众数 #C7C9C8，压在白卡（#FFFFFF）上对比度 3.41:1，低于 4.5:1；:451 写作 var(--c-text-tertiary, #bbb)，兜底值 #bbb 比 token 本身更浅，深色档下（tokens.scss:245 --c-text-tertiary:#8A92A0）还会再掉一档。
- 建议改法：:451 改 --c-text-secondary 并去掉 #bbb 兜底（兜底统一给可读值）。
- 修复类别：CSS/token

### R6-L04-D08　P3 / 字号　批次 R6-B81
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__history__top.png`（sha16=`fbb39e6f66a04b42`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:450`
- 理想图依据：无基准页，依据=规范文档 §1.3 字体层级表（小字档 12–13px 用于标签/时间戳，10–11px 只给角标·法务）
- 现象：同一行四个互动计数用 font-size:22rpx（=11px，实测文字带高 y=240–252px 共 12px 行盒），落在规范「极小档（角标·法务）」，却承载「赞/藏/看/评」这类要读的数据；同卡作者名 :414 为 28rpx、时间 :420 为 22rpx，三档混排后计数几乎与底色糊在一起（见 D07 的 3.41:1）。
- 建议改法：:450 提到 var(--fs-base)=24rpx（12px），与时间戳同档。
- 修复类别：CSS/token

### R6-L04-D10　P1 / 层级遮挡　批次 R6-B81
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`209ede5fdf7c18b5`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:363`
- 理想图依据：无基准页，依据=规范文档 §1.6 渲染铁律（自定义导航下首屏内容必须落在状态栏/胶囊之下）
- 现象：bottom 帧里工具栏整行顶到屏幕最上沿（白底从 y=0px 起，实测），「清空记录」胶囊落在 x=305–350px / y=13–25px，正压在系统状态栏暗像素带（实测 y=0–29px，含 22:39 时钟与 wifi/电量图标，x 12–370px）之下，帧上读作「22:39 条记录」；同一胶囊在 top 帧位于 y=129–140px（安全）。根因 :284 的 padding-top 只把首屏下移、并非吸顶层，而 :363 .history-list{height:calc(100vh - 88rpx)} 少扣状态栏 + 工具栏 ⇒ 页面走 window 滚动，工具栏随内容滚进状态栏。
- 建议改法：把工具栏改成吸顶（position:sticky + 状态栏内衬），或 .history-list 高度按 calc(100vh - var(--statusbar) - 88rpx) 计。
- 修复类别：单页

### R6-L04-D12　P0 / 位置　批次 R6-B40
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`d987c1b30fa524f2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:766`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 页头区（副标题为标题下方一行横排灰字）
- 现象：副标题「找到与你志趣相投的人」在帧上竖排成一列单字——实测字盒 x=323.4–347.2rpx（每字仅 24rpx 宽）、y=188.5→424.6rpx 共 8+ 个单字行、行距≈30rpx；理想图同一串是一行横排 x=41–213rpx、y=177–195rpx。同因导致搜索钮掉到标题下一行左侧（实测 x=47.6–77.4rpx / y=315.5–345.2rpx，理想图在页头右上角）。根因 .circles-header 是 display:flex 行容器（:766-772 无 flex-direction:column），把「标题行 / 副标题 / chip 行」三个块并排，副标题被压到 min-content（一个字）宽。
- 建议改法：.circles-header 改 flex-direction:column + align-items:stretch，搜索钮留在标题行右端并做胶囊避让。
- 修复类别：单页

### R6-L04-D13　P1 / 可达性　批次 R6-B40
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`d987c1b30fa524f2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:843`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 分类 chip 行（6 枚 + 筛选钮一行全露，x=47.5→700.7rpx）
- 现象：chip 行被同一行容器挤到 x=361.1rpx 起（理想图起于 41rpx），帧上实测只露出 3/7 枚——「全部」绿胶囊 x=361.1–468.3rpx、「摄影」文字 x=511.9–561.5rpx、「旅行」x=632.9–682.5rpx，其后 音乐/运动/美食/更多 全部在屏右 750rpx 之外；分类切换是本页主路径，首屏只能看到 3 个分类。
- 建议改法：修 D12 后 chip 行独占一行（width:100%）自左 gutter 起，首屏至少露出 5–6 枚。
- 修复类别：单页

### R6-L04-D14　P1 / 颜色token　批次 R6-B40
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`d987c1b30fa524f2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:605`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 卡片标题右侧「热门」角标（浅粉底 + 红字）
- 现象：「热门」角标实测填充 #FF5967（:605 rgba(255,77,92,.92) 压白底）+ 白字（:606），角标盒 x=537.7–599.2 / y=519.8–557.5rpx；理想图同位角标实测底 #FEF0F1、字色 #F73C4F——深浅关系整个做反，卡片标题行被一块高饱和红块压住视觉重心。
- 建议改法：:605-606 改为浅粉底（--c-romance-50 系）+ --c-romance-500 字色，与理想图同反色关系。
- 修复类别：CSS/token

### R6-L04-D15　P3 / 文案　批次 R6-B40
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`d987c1b30fa524f2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:466`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 卡片统计行「1.2w 人加入 · 362 条动态」
- 现象：统计行帧上渲染为「1.2w 人 · 6 条动态」「8,932 人 · 4 条动态」，理想图逐字为「1.2w 人加入 · 362 条动态」——「加入」二字被 :465 的精简注释删掉，动词语义丢失（"人"不等于"已加入的人"）。
- 建议改法：恢复「人加入」三字，宽度不足时把计数列与「加入」按钮列的间距按理想图重排，而不是删文案。
- 修复类别：单页

### R6-L04-D17　P2 / 需新建　批次 R6-B40
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`c53f1400dc67cdf4`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:241`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 分类行右端「≡ 筛选」圆钮（实测 x=676.1–700.7rpx、y≈275rpx，与 6 枚 chip 同排常驻）
- 现象：理想图页头右端常驻的筛选入口在本帧（及 top 帧）都不存在——:241 把「更多」做成 QUICK_TABS 的第 7 枚 chip（iconSrc LIST），实测 chip 行止于 x=682.5rpx 即被屏右裁断，两帧里从未出现第 4 枚之后的 chip；bottom 帧吸顶页头仍是同一列竖排副标题（实测字盒 x=323.4–347.2rpx、y=297.6–424.6rpx），筛选能力对滚动后的用户完全不可达。
- 建议改法：新建页头右端常驻筛选钮（打开分类/排序面板），「更多」不再挤在横向 chip 队尾。
- 修复类别：需新建目标功能

### R6-L04-D19　P1 / 可达性　批次 R6-B43
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`cc820feba7d733ce`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:356`
- 理想图依据：无基准页，依据=规范文档 §3.11 圈子主页族（话题列表须带圈子身份：封面/圈名/人数/加入钮）
- 现象：取景 query 为空 ⇒ :319 circleId="" → :328 分支不请求、:340 只弹一次 toast；帧上标题落回兜底字面量「话题列表」（:356 的 `circleName || t("circle.topicsListTitle")`），:383 v-if="circle" 的整块兴趣圈头部（封面/圈名/人数/加入）不存在，列表区只剩「暂无话题 / 来发第一个话题吧」+「去发布」绿钮（实测 x=303.6–446.4rpx、y=740.1–805.6rpx）⇒ 这个入口进来是死页，且 :115 的「去发布」会把空 circleId 再带进发布页。
- 建议改法：无 circleId 时不渲染话题壳，直接 redirect 到圈子列表并提示，或按 store 当前圈兜底取数。
- 修复类别：单页

### R6-L04-D21　P1 / 可达性　批次 R6-B43
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`cc820feba7d733ce`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:481`
- 理想图依据：无基准页，依据=规范文档 §3（5 个 tab 与列表翻页须逐态可验）
- 现象：bottom 帧与 top 帧逐字节相同（清单 sameAsTop=true，两帧 bytes 同为 58668、contentHash 同为 cc820feba7d733ce）⇒ 本页没有任何可滚动内容，:481 的 @scrolltolower 翻页（onLoadMore→fetchTopics(page+1)）与 :336 的首屏取数在本轮两帧里都未被验证；同时「动态/精华/活动/作品墙/成员」5 个 tab（帧上 y≈300–350rpx 一行）在空 circleId 下点哪个都只会是同一块空态。
- 建议改法：带 circleId 重取景补 bottom 帧；无 circleId 时禁用 tab 行并给明确占位，避免"看起来能点其实没数据"。
- 修复类别：单页

### R6-L04-D22　P3 / 空态文案　批次 R6-B43
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`cc820feba7d733ce`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:486`
- 理想图依据：无基准页，依据=组件规范 components/common/EmptyState.vue:94-112（空态须图标+主文+副文+行动钮四件套）
- 现象：空态「暂无话题 / 来发第一个话题吧」上方无任何图标位（帧上 y=387–640rpx 区间实测 0 个非背景像素，直抵文案带 y=646.8rpx），且本页空态是自己手搓的文本块、没用 EmptyState 组件 ⇒ 与 history.vue:240 的空态形状/间距不一致；圈规条（:486）在列表为空时仍常驻顶部，读起来像"有内容但被折叠"。
- 建议改法：空态改用 EmptyState（type="no-data"），列表为空时隐藏圈规条。
- 修复类别：单页

### R6-L11-D05　P2 / 素材缺失　批次 R6-B63
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`95f38346b8f83416`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:1026`
- 现象：「上传学生证」空态只渲染 2 个文本节点（标题「点击上传学生证照片」fs-lg 28rpx + 提示「支持 JPG / PNG，大小 ≤ 5MB」fs-sm 22rpx），无任何上传图标；样式表预留了 `.upload-card__icon{font-size:80rpx}`（:1026）却无对应模板节点（模板 :657-660 只有 text+hint），且 `.upload-card`(:1006) 无虚线描边⇒上传区看不出是可点的上传框。
- 建议改法：在 `.upload-card__empty`(:1018) 内补一个上传图标节点（用已登记的 common/ 图标），并给 `.upload-card` 加 `border: 2rpx dashed var(--c-border-default)`。
- 修复类别：单页

### R6-L11-D10　P2 / 空态文案　批次 R6-B61
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`1d3b3038659c327a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:284`
- 现象：空态副标题「完善资料，更多人发现你」(:284 visitorsEmptyDesc) 明确引导「完善资料」这一动作，但空态模板 :276-285 只有图标+标题+副标题三节点、无任何「去完善资料」按钮，文案承诺的动作在页内无落点。
- 建议改法：在 `.visitors-empty` 内补一枚「去完善资料」按钮，navigateTo 到资料编辑页（entry=edit）。
- 修复类别：单页

### R6-L13-D04　P2 / 素材缺失　批次 R6-B60
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`9f1a6b0cad8a29f9`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:239`
- 理想图依据：无基准，依据=组件规范（每条任务应有可区分图标）+ 本页注释 tasks.vue:61「code 对齐后端 seed：daily-checkin / complete-profile / first-post / campus-verify」
- 现象：图标映射在 real 档整体失效——`taskIcon()` 的 case 键是 mock 本地 id（"profile"/"checkin"/"verify"），而 real 档 `toRealTask()` 把 id 换成后端 code（tasks.vue:166 `id: view.code`，实测帧内任务顺序为 每日签到→完善个人资料→发布首条动态→完成校园认证，正是后端 code 顺序 daily-checkin/complete-profile/first-post/campus-verify）。量法：4 个 code 里只有 "first-post" 命中 case，其余 3 条落到 `default` ⇒ 即便素材修好，3/4 的任务也会显示同一枚 SPARKLES 图标，图标失去区分度。
- 建议改法：case 键改为同时接受后端 code（daily-checkin/complete-profile/campus-verify），或统一在 `toRealTask()` 里把 code 映射回本地 id。
- 修复类别：单页

### R6-L13-D07　P3 / 可达性　批次 R6-B62
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`a29cd88a96e82968`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:818`
- 理想图依据：无基准，依据=全站最小热区 88rpx（AppShell.vue:334 `min-height: 88rpx`）
- 现象：自定义星期的 7 枚 chip 热区不足 88rpx。量法：第一行 chip 外框（选中态 2rpx 品牌绿描边 #72DAB7）实测 y=615..653 ⇒ 高 39px = 77rpx；第二行 y=661..697 ⇒ 高 37px = 73rpx；两行均 < 88rpx（44.4px）。宽度实测 75px（149rpx）够，但高度由 `padding: 20rpx 0` + 26rpx 文字撑出来，天生矮一截。
- 建议改法：`.weekday-item` 的 padding 提到 `28rpx 0` 或直接 `min-height: 88rpx`。
- 修复类别：CSS/token

## pages/discover/index（3 条）

### R6-L01-D07　P1 / 素材缺失　批次 R6-B14
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__discover__index__top.png`（sha16=`9759902ad67f743f`）
- 源码证据：`apps/client/src/components/match/MatchActions.vue:39`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 三键区「跳过」灰 X、「打个招呼」粉气泡，实际两枚圆钮内为空
- 现象：跳过(X_GRAY)与打个招呼(CHAT_PINK)两枚圆钮图标在 real 档未加载，只剩空白白圆；仅「喜欢」HEART_WHITE 正常显示，主交互键图标缺失不可辨
- 建议改法：确保 ICONS_V2.X_GRAY / CHAT_PINK 进 app-assets 清单返回 200，或内联兜底
- 修复类别：单页

### R6-L01-D08　P1 / 素材缺失　批次 R6-B14
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__discover__index__bottom.png`（sha16=`9759902ad67f743f`）
- 源码证据：`apps/client/src/components/match/MatchActions.vue:39`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 三键区跳过/打个招呼图标
- 现象：底帧与顶帧逐字节相同（卡片页不滚动，非可达性缺陷），跳过/打个招呼圆钮仍空白（同 D07）
- 建议改法：同 D07
- 修复类别：单页

### R6-L01-D09　P2 / 素材缺失　批次 R6-B26
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__discover__index__bottom.png`（sha16=`9759902ad67f743f`）
- 源码证据：`apps/client/src/pages/discover/index.vue:265`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 顶栏右上应有筛选(漏斗)与收藏(描边心)图标
- 现象：顶栏右上 SLIDERS 筛选图标与 HEART_OUTLINE 收藏图标渲染为两枚淡空白圆（real 档加载失败），理想图为清晰线性图标
- 建议改法：修复 ICONS_V2.SLIDERS / ICONS_EMOJI.HEART_OUTLINE 资源可加载性
- 修复类别：单页

## pages/home/index（3 条）

### R6-L02-D01　P2 / 文案　批次 R6-B86
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__home__index__top.png`（sha16=`829e2bb7d15e2cd7`）
- 源码证据：`apps/client/src/utils/location.ts:23`
- 理想图依据：素材/理想效果图/首页.png 页头右侧定位区（理想为「北京大学 · 3km」）
- 现象：真档页头定位文案渲染成技术兜底串「地址解析不可用」，与理想图的「学校 · 距离」口径完全不同，用户可见一句系统错误提示。
- 建议改法：无定位时页头改显中性地名（城市/校区）或整段隐藏，不把 DEFAULT_LOCATION_TEXT 这类内部兜底串直接铺到页头。
- 修复类别：单页

### R6-L02-D02　P2 / 需新建　批次 R6-B12
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__home__index__top.png`（sha16=`829e2bb7d15e2cd7`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:127`
- 理想图依据：素材/理想效果图/首页.png 今日推荐卡右下（理想在「1.2km·已认证·双子座」下方有一排 4 张横向缩略图，再往下才是 看看TA/喜欢）
- 现象：真档推荐卡资料区从 distanceLine 直接跳到 actions 按钮行，理想图里那排 4 张 TA 的相册缩略图整块缺失（模板根本没有该节点）。
- 建议改法：在 :123 距离行与 :127 actions 行之间补一行 4 图缩略 strip（消费 item 相册，缺图时隐藏而非留空）。
- 修复类别：需新建目标功能

### R6-L02-D03　P2 / 文案　批次 R6-B11
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__home__index__bottom.png`（sha16=`9c09617e09c1fc45`）
- 源码证据：`apps/client/src/components/home/NearbyPeople.vue:76`
- 理想图依据：素材/理想效果图/首页.png 附近的人行（理想为小溪/阿辰/草莓奶昔/星辰等真实昵称）
- 现象：附近的人昵称直接渲染成「演示·浙江大学 / 演示·武汉 / 演示·南开」，把 QA 演示前缀「演示·」当作用户名显示给真实用户。
- 建议改法：渲染前剥掉昵称里的「演示·」取证前缀（或后端 seed 数据去前缀），用户可见处不得出现「演示」字样。
- 修复类别：单页

## pages/login/index（2 条）

### R6-L01-D01　P1 / 素材缺失　批次 R6-B27
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__login__index__top.png`（sha16=`a46579fcdaec7569`）
- 源码证据：`apps/client/src/pages/login/index.vue:617`
- 理想图依据：素材/理想效果图/登录页面.png 主按钮「微信一键登录」左侧应为绿色微信双气泡图标（白圆底+绿色气泡）
- 现象：绿色主按钮左侧的 .btn-icon-wrap 白圆内为空（WECHAT_GREEN_SVG 在 real 档未加载），只剩 rgba(255,255,255,.25) 白圆，与理想图带绿色气泡的图标对比缺图标本体
- 建议改法：确认 IMAGE_PATHS.ICONS_V2.WECHAT_GREEN_SVG 在 app-assets 清单内并返回 200，或回退内联 SVG
- 修复类别：单页

### R6-L01-D02　P1 / 素材缺失　批次 R6-B27
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__login__index__bottom.png`（sha16=`689dca49965cb2cb`）
- 源码证据：`apps/client/src/pages/login/index.vue:617`
- 理想图依据：素材/理想效果图/登录页面.png 主按钮「微信一键登录」左侧绿色微信气泡图标
- 现象：滚动到底帧主按钮仍可见，左侧图标位仍为空白圆（同 D01，real 档图片加载失败），协议勾选圈为未选灰环属合规默认态不计缺陷
- 建议改法：同 D01，修复该 SVG 资源可加载性
- 修复类别：单页

## pages/messages/index（2 条）

### R6-L02-D07　P2 / 素材缺失　批次 R6-B28
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__messages__index__top.png`（sha16=`b0217e9a4c114b45`）
- 源码证据：`apps/client/src/pages/messages/index.vue:425`
- 理想图依据：素材/理想效果图/消息.png 页头右侧（理想为放大镜搜索图标 + 「＋」）
- 现象：真档页头右侧搜索按钮 ICONS_EMOJI.SEARCH 没出字形，只剩一枚浅灰空圆碟，理想图此处是清晰的放大镜图标。
- 建议改法：核实 SEARCH 图标在 real 档是否 404 并补齐；按钮空态时给可见图形兜底，别留空圆碟。
- 修复类别：单页

### R6-L02-D08　P2 / 可达性　批次 R6-B28
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__messages__index__bottom.png`（sha16=`c3f2edf7f392062c`）
- 源码证据：`apps/client/src/pages/messages/index.vue:726`
- 理想图依据：素材/理想效果图/消息.png 整页（理想为已填充的摘要卡 + 寻觅助手 + 正在升温 + 最近聊天列表，内容远超一屏）
- 现象：滚到底帧与顶帧内容一致，整页停在游客骨架灰条（quick-card__ph 占位），下方无任何可滚达的真实会话内容，理想图应有的长列表不可达。
- 建议改法：游客骨架之外给出可达的真实/示例会话列表，或明确到底提示，避免顶/底两帧同图且无内容可滚。
- 修复类别：单页

## pages/nearby/index（3 条）

### R6-L02-D04　P2 / 素材缺失　批次 R6-B29
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__nearby__index__top.png`（sha16=`d3680b4ac4ab7db5`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:450`
- 理想图依据：素材/理想效果图/附近的首页.png 顶部 5 宫格入口（理想每格有清晰彩色图标：人群/盾牌勾/学士帽/礼盒/人脉）
- 现象：真档 5 个功能入口只剩粉/绿/蓝/橙/紫的空色块，NEARBY_ICONS.PEOPLE/CIRCLE/CAMPUS/ACTIVITY/NETWORK 图标字形没渲染出来，格子看似的空白方块。
- 建议改法：核对 NEARBY_ICONS 资源在 real 档 app-assets 是否 404，补齐图标或给 icon 位一个可见兜底图形，禁止空色块顶图。
- 修复类别：单页

### R6-L02-D05　P2 / 文案　批次 R6-B29
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__nearby__index__top.png`（sha16=`d3680b4ac4ab7db5`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:442`
- 理想图依据：素材/理想效果图/附近的首页.png 标题下方副标（理想为「📍北京大学 · 3km」，且「附近」标题前有绿色定位针）
- 现象：真档副标渲染成「地址解析不可用」内部兜底串，且「附近」标题左侧缺理想图那枚绿色定位针图标，页头信息层与理想图不符。
- 建议改法：副标无定位时改显中性地名/隐藏，标题补定位针图标资源，别把技术串文当副标。
- 修复类别：单页

### R6-L02-D06　P2 / 素材缺失　批次 R6-B29
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__nearby__index__bottom.png`（sha16=`dc452c131000a244`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:587`
- 理想图依据：素材/理想效果图/附近的首页.png 校园圈 4 联竖版封面（理想为清华/北大等实景建筑照片）
- 现象：真档校园圈封面 coverUrl 为空时走 v-else 徽章分支，卡片渲染成淡绿空方块只印校名，理想图那批校园实景封面图全部缺失。
- 建议改法：coverUrl 缺失时按 :81 注释所说回落到真实校园实景素材图，而非留一块无色徽章方块。
- 修复类别：单页

## pages/profile/index（2 条）

### R6-L02-D09　P3 / 文案　批次 R6-B17
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__profile__index__top.png`（sha16=`71b10b5dc9beb9bd`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:111`
- 理想图依据：素材/理想效果图/未登录个人主页.png 点击登录行右侧（理想为白底「编辑资料」胶囊按钮）
- 现象：真档游客头部右侧只有一个「›」箭头，理想图对应位置是「编辑资料」整颗胶囊按钮，按钮文案与形态都缺。
- 建议改法：按理想图在头部右侧补「编辑资料」胶囊（游客态点击走 goLogin），替换裸箭头。
- 修复类别：单页

### R6-L02-D10　P3 / 文案　批次 R6-B17
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__profile__index__bottom.png`（sha16=`e1e833c860f4a3b6`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:207`
- 理想图依据：素材/理想效果图/未登录个人主页.png 更多功能之后（理想到 tabbar 结束，无整宽登录按钮）
- 现象：真档底部多出理想图没有的整宽绿色「登录」大按钮，与理想图版式（更多功能直接接 tabbar）不一致。
- 建议改法：与理想图对齐去掉这条整宽登录 CTA，或把登录引导并入头部，勿在页尾凭空加理想图没有的按钮。
- 修复类别：单页

## pages/register/index（2 条）

### R6-L01-D03　P2 / 层级遮挡　批次 R6-B30
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__register__index__top.png`（sha16=`94afd9857d681fbd`）
- 源码证据：`apps/client/src/pages/register/index.vue:514`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3 注册页 hero 区（副标题须完整可读）
- 现象：hero__sub「用手机号注册，开始遇见同频的人」下半被骑压 64rpx 的表单卡顶边裁切，字被吃掉一排，仅露上半截
- 建议改法：增大 hero 底部留白或减小卡片骑压量，使副标题整行落在卡片之上
- 修复类别：单页

### R6-L01-D04　P2 / 层级遮挡　批次 R6-B30
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__register__index__bottom.png`（sha16=`df21537354ff4b26`）
- 源码证据：`apps/client/src/pages/register/index.vue:514`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §3 注册页 hero 副标题完整可读
- 现象：底帧 hero 副标题仍被表单卡顶边横向裁切（同 D03），滚动后遮挡关系不变
- 建议改法：同 D03
- 修复类别：单页

## pages/register/success（2 条）

### R6-L01-D05　P3 / 圆角　批次 R6-B31
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__register__success__top.png`（sha16=`cfe50b080ffe92eb`）
- 源码证据：`apps/client/src/pages/register/success.vue:167`
- 理想图依据：无基准，依据=src/components/common 主按钮规范与登录页 .btn-primary(border-radius var(--r-full)) 全站主 CTA 胶囊一致
- 现象：主 CTA「完善我的资料 →」圆角为 24rpx 圆角矩形，与全站主按钮统一胶囊(--r-full)不同调，视觉上比登录/发现页主按钮偏方
- 建议改法：border-radius 改 var(--r-full) 与其它主 CTA 对齐
- 修复类别：CSS/token

### R6-L01-D06　P3 / 圆角　批次 R6-B31
- 帧：`tmp/qa/frames/R6/real-f0677920/pages__register__success__bottom.png`（sha16=`cfe50b080ffe92eb`）
- 源码证据：`apps/client/src/pages/register/success.vue:167`
- 理想图依据：无基准，依据=src/components/common 主按钮规范（全站主 CTA 胶囊 --r-full）
- 现象：底帧与顶帧逐字节相同（该页单屏不需滚动，非可达性缺陷），主 CTA 圆角仍为 24rpx 方角矩形（同 D05）
- 建议改法：同 D05
- 修复类别：CSS/token

## subpackages/campus/campus/certification（4 条）

### R6-L06-D13　P2 / 颜色token　批次 R6-B32
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`abccf7d51ed7aa02`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:472`
- 理想图依据：无基准，依据=规范文档§1.1 原则1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ 原则3「禁止私有色值」
- 现象：整页底色被写成私有纯白——`.cert-page{background:#ffffff}`（472）与 `page{background:#ffffff}`（884）两处硬编码，实测左缘列 x=5 从 y=101 一直到 y=780 全为 #FFFFFF（非令牌 --c-bg-page #EEF7F2），而 y=781..798 又露出 18px #EEF7F2 底，形成一条横向白/绿断层；scoped 的 `page{}` 在 mp-weixin 不生效，所以只有容器内是白、容器外仍是全局浅绿。
- 建议改法：472 改 `background: var(--c-bg-page)`，删掉 883-885 的 scoped `page{}` 影子源（或与全站浅绿对齐后统一走令牌）。
- 修复类别：CSS/token

### R6-L06-D14　P1 / 尺寸比例　批次 R6-B32
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`abccf7d51ed7aa02`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:517`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx / 区块间距 --section-gap 24rpx」
- 现象：表单卡右缘同样溢出视口——`.cert-body{padding:var(--sp-6)}`=12px，实测卡片左边界线在 x=12..13（#FFFFFF→#F2F2F3→#F8F9F9→#FFFFFF），但卡底分隔带 y=277 一路 #F3F3F4 铺到 x=377 视口边界都不收口，右侧 12px 内缩丢失（应止于 x=366）；与 post-topic D05 同一形状（scroll-view + padding 未配 border-box）。
- 建议改法：`.cert-body` 内卡片显式 `box-sizing:border-box`（或 padding 移到卡上、卡宽用 `width:auto`），与 index 话题卡实测 x=13..366 的边距节奏对齐。
- 修复类别：CSS/token

### R6-L06-D15　P0 / 可达性　批次 R6-B32
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`abccf7d51ed7aa02`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:516`
- 理想图依据：无基准，依据=任务书已实测根因⑤「top/bottom 同图应有长内容 ⇒ 可达性」+ 本页模板 certification.vue:425-436 提交按钮在折叠线以下
- 现象：bottom 帧与 top 帧 sha16 逐字相同（abccf7d51ed7aa02）＝滚到底一个像素都没变；实测 x=189 列白卡在 y=781 被 `.cert-page` 的 780px 定高盒裁断，其下的「学信网验证码」输入框、提交按钮（certification.vue:425-436）与隐私提示（:439）全部裁在视口外且无法滚到——用户填完表单也点不到提交。根因同族：`.cert-body{flex:1}`（516）在 `.cert-page{height:100%;overflow:hidden}`（470-471）下缺 `min-height:0`。
- 建议改法：`.cert-body` 补 `min-height:0`，取景端加一条「bottom 帧必须与 top 帧不同像素」的断言，防同类定高裁切再漏检。
- 修复类别：单页

### R6-L06-D16　P1 / 颜色token　批次 R6-B32
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`abccf7d51ed7aa02`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:694`
- 理想图依据：无基准，依据=规范文档§1.2「输入底 --c-bg-surface #F3FAF6 / #F7FAF9，卡片 --c-bg-container #FFFFFF」两角色必须可辨
- 现象：输入框完全没有可见边界——`.form-input` 同时写 `background:#ffffff`（694）与 `border:2rpx solid transparent`（695），落在同样 #FFFFFF 的卡上；实测沿 x=189 从 y=315 扫到 y=380（容差 2/2/2）零条边缘、整段恒为 #FFFFFF，只剩一行占位文字「请输入你的学校全称」飘在白底上，用户看不出哪里能点。对照同仓 post-topic 的 `.title-input{background:$bg-page}`（实测 #EEF7F2 反衬出 #FFFFFF 卡）尚有可见填充。
- 建议改法：694 改 `background: var(--c-bg-surface)` 且 695 的 transparent 改 `var(--c-border-default)`，让输入框有底有框。
- 修复类别：CSS/token

## subpackages/campus/campus/hub（7 条）

### R6-L05-D24　P1 / 颜色token　批次 R6-B33
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`7301b72cd11d8509`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:252`
- 理想图依据：素材/理想效果图/校园圈.png 认证横幅左侧学士帽图标（PIL 取样均值 #29C591，绿色实心）
- 现象：横幅学士帽图标着色错：实测图标落在 x=39-91、y=165-195（53×31px），区内最深像素 #B0BBCA（蓝灰），与理想图 #29C591（品牌绿）色相完全不同；根因是该 SVG 把描边写死在文件里——static/assets/icons/common/graduation-cap.svg 第 2 行 `stroke="#94A3B8"`，而它经 `<image>` 引入（:252），mp-weixin 下 CSS 无法给 image 里的 SVG 重染色。
- 建议改法：复制一份品牌绿版 graduation-cap 图标（stroke 改 #36C99A / currentColor 后内联），或改用 iconfont/字体色，别让素材自带灰蓝。
- 修复类别：CSS/token

### R6-L05-D25　P2 / 文案　批次 R6-B33
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`7301b72cd11d8509`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:725`
- 理想图依据：素材/理想效果图/校园圈.png 第 5 张卡完整校名「中国人民大学圈」
- 现象：第 3 张卡校名被省略号截断成「中国人民大…」（实测校名墨块 x=117-176，右侧紧跟 x=195-242 的「未认证」紫色 badge），理想图为完整 8 字「中国人民大学圈」；同帧第 1/2/4 张（北京大学圈/清华大学圈/复旦大学圈）均完整，只有长校名受害。样式 `.campus-school-card__name` 的 `text-overflow: ellipsis`（:725）在 badge 不收缩（:711）下把 8 字压成 6 字。
- 建议改法：名称行给 badge 让位后仍不足时改两行/缩字号（或 max-width 提到 8 字宽），别让业务主名被截。
- 修复类别：单页

### R6-L05-D26　P2 / 可达性　批次 R6-B33
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`7301b72cd11d8509`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:482`
- 理想图依据：素材/理想效果图/校园圈.png 页头无返回件（右上为搜索图标）；本卡按「入口可辨性」判
- 现象：返回入口在帧上几乎不可辨：实测 x=8-56、y=40-120 整块区域内只有 20 个平均亮度 <200 的像素（最深 #464A48，集中在 x=31-33、y=100-104），其余全为 #FFFFFF——按钮圆底取 `--c-bg-container, #FFFFFF`（:482）、描边 `--c-line, #EEF2F0`（:483，与白底差 15/255），而头部本身 background 也是 #FFFFFF（:464）⇒ 白底白钮，仅靠一枚被切掉大半的「‹」提示。
- 建议改法：圆底改 `--c-bg-page`（#EEF7F2）或加 `--c-brand` 描边/阴影，保证与头部底差 ≥ 20/255。
- 修复类别：CSS/token

### R6-L05-D27　P2 / 素材缺失　批次 R6-B33
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`2b86ff7a03089e1a`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:356`
- 理想图依据：素材/理想效果图/校园圈.png 每张学校卡「等 N 位同学」左侧 3 枚真实头像
- 现象：三枚成员头像是同三张写死的素材：模板直接引 `IMAGE_PATHS.AVATARS.AVATAR_1/2/3`（:356-358），实测本帧 5 张学校卡（北京/清华/人民/复旦/…）的头像行像素完全一致（同一组 3 张脸重复 5 次），而理想图 5 张卡是 5 组不同头像 ⇒ real 档没有按学校取真实成员头像。
- 建议改法：接后端 recentMembers 字段（与 circle-home 的 friendAvatars 同口径），素材缺失时出首字母兜底而不是复用同一组图。
- 修复类别：需新建目标功能

### R6-L05-D28　P2 / 层级遮挡　批次 R6-B33
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`2b86ff7a03089e1a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:461`
- 理想图依据：素材/理想效果图/校园圈.png（静态稿无吸顶，卡片不被切边）
- 现象：吸顶头部把上一张卡的封面切成一条残边：实测 y=134-139（5px≈10rpx）、x=28-105 一条照片绿边（#A2CC6B→#69A824→#7CB72F），上沿紧贴头部白底（y=124-133 全 #FFFFFF），下沿 1px 内回到白底 ⇒ 既不是完整卡片也不是干净的裁剪，卡片圆角与下 8 行内容全被常驻头部（position:sticky，:461）压住。
- 建议改法：吸顶带补底部渐变遮罩（--c-gradient-mask 同色收尾），或让列表容器 padding-top = 头部高度做真正吸顶偏移。
- 修复类别：单页

### R6-L05-D29　P2 / 尺寸比例　批次 R6-B33
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`2b86ff7a03089e1a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:470`
- 理想图依据：素材/理想效果图/校园圈.png 页头（标题+副标题）换算后 ≈90px 高
- 现象：常驻头部吃掉 16% 视口：本帧与 top 帧在 y=0..100 区间 37329/37800 像素逐字节相同（98.8%）⇒ 头部带（状态栏 + 标题 y≈78-101 + 副标题 y≈111-123 + 20rpx 下衬）总高 ≈130px（258rpx）在滚动后仍整块留在屏上；理想图同区换算后 ≈90px。padding 计算式 `calc(var(--statusbar) + 20px + 20rpx)`（:470）把胶囊呼吸量 20px 与状态栏叠加，比理想图多出的 40px 主要来自这里。
- 建议改法：滚动后收起副标题（或把 20px 呼吸量并入 --statusbar 一份），使常驻带 ≤ 100px。
- 修复类别：单页

### R6-L05-D30　P2 / 文案　批次 R6-B33
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`2b86ff7a03089e1a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:725`
- 理想图依据：素材/理想效果图/校园圈.png 第 6 张卡完整校名「浙江大学圈」/「上海交通大学圈」
- 现象：本帧第 4 张卡校名同样被截成「上海交通大…」（实测该卡名行 x=117-176 与 badge 起点 x=195 之间已无空间），与 top 帧 D25 同一根因、不同受害条目；本帧 5 张卡里 2 张（中国人民大…、上海交通大…）显示不完整 ⇒ 滚到底部仍有 40% 的卡片主名带省略号。
- 建议改法：与 D25 同批改 `.campus-school-card__name` 宽度策略，改完后本帧复量两张长名卡。
- 修复类别：单页

## subpackages/campus/campus/index（4 条）

### R6-L06-D01　P1 / 尺寸比例　批次 R6-B34
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`6fffc5c1eea6e993`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:480`
- 理想图依据：无基准，依据=规范文档§1.4（图标/页边距）+ index.vue 自身声明的 `.school-icon{width:40rpx;height:40rpx}`（校徽应占 20px 见方）
- 现象：页头校徽图标塌成约 0 宽——实测返回圆 `.campus-back` 右缘 x=48、「北京大学」首字左缘 x=66，中间 18px 已被 `.header-top` gap 16rpx(8px) + `.header-school` gap 12rpx(6px) 吃掉，图标槽只剩约 4px，规范应为 40rpx=20px；同栏用裸 `<image>` 的返回箭头（x=17..48=31px≈64rpx）正常，只有走 SafeImage 的图标不见。
- 建议改法：SafeImage 根节点是 `width:100%;height:100%`（apps/client/src/components/common/SafeImage.vue:309），页级 scoped 的 `.school-icon` 在 mp-weixin 组件样式隔离下不生效；给本页三处 SafeImage 传 `root-class`（或 `.header-school .safe-image{width:40rpx;height:40rpx}` 走 :deep）锁定 20px 见方。
- 修复类别：CSS/token

### R6-L06-D02　P1 / 素材缺失　批次 R6-B34
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`6fffc5c1eea6e993`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:389`
- 理想图依据：无基准，依据=组件规范（话题卡互动条应「图标+计数」成组，见 index.vue:388-391 结构）+ 规范文档§1.4 图标位
- 现象：话题卡回复气泡里 `.replies-icon` 声明 24rpx=12px（index.vue:825），实测「12」左侧只有 8rpx gap、无任何图标像素，气泡内只剩数字；`IMAGE_PATHS.ICONS_SOCIAL.COMMENT` 解析为 `/static/assets/icons/social/comment.svg`，而包内源目录 `apps/client/src/static/assets/icons/` 实盘只有 `common/`、`register/`、`tabbar/` 三个子目录——`social/` 整个不存在，real 包内必 404。
- 建议改法：新建 `apps/client/src/static/assets/icons/social/comment.svg`（含同目录其余 11 枚）并在 config/cdn-buckets.json 的 localPrefixes 里补 `static/assets/icons/social/`，别再指望后端桶；不许凭空改指向别家目录。
- 修复类别：需新建目标功能

### R6-L06-D03　P1 / 可达性　批次 R6-B34
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`b590ce94467eec4b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:727`
- 理想图依据：无基准，依据=规范文档§1.4 卡片栅格（列表页应可连续浏览）+ 任务书已实测根因⑤「top/bottom 同图应有长内容」
- 现象：本帧与 top 帧（sha16 6fffc5c1…）像素级几乎同图——实测「没有更多了」仅从 y≈569 移到 y≈591（差 22px），话题卡止于 y≈532，y=591..796 约 205px（占屏 25%）是纯 #EEF7F2 空底；`.topic-scroll{flex:1}`（727-729）在 `.campus-page{height:100%;overflow:hidden}`（437-438）下没有 `min-height:0`，内滚高度约束不成立，列表翻页与 FAB 都拿不到可滚区。
- 建议改法：`.topic-scroll` 补 `min-height:0`，并让 real 档本校话题种子数据 ≥1 页（>10 条）使 top/bottom 真能拉开。
- 修复类别：单页

### R6-L06-D04　P2 / 间距　批次 R6-B34
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`b590ce94467eec4b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:930`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx / 卡片 --card-radius」+ 同页话题卡实测边距
- 现象：「热门兴趣圈」卡满幅出血——实测 y=245 行 x=2..377 全为卡片白，左右无页边距；同页认证引导卡 `.cert-guide-card{margin:20rpx 24rpx}`（index.vue:564）实测左缘 x=13、话题卡 `.topic-card{margin:16rpx 24rpx}`（index.vue:732）实测 x=13..366，三张卡左右边界互不对齐（差 12px）。
- 建议改法：给 `.cert-recommend` 补 `margin: 24rpx 24rpx 0`（与 `.cert-guide-card` 同一 24rpx 横向节奏），或统一改用 `--page-padding`。
- 修复类别：CSS/token

## subpackages/campus/campus/post-topic（4 条）

### R6-L06-D05　P1 / 尺寸比例　批次 R6-B35
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`e4e4573896562a23`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:698`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx / 区块间距 24rpx」——卡片应左右各留 12px
- 现象：表单卡右缘溢出视口——实测 `.category-section` 左缘 x=13（=24rpx 内缩，正确），但第 3 列 chip「校园活动」右缘 x=374、卡片白底一路铺到 x=377 视口边界仍不收口，右侧 12px 内缩完全丢失（应止于 x=366）；同页三行 chip 总宽 26..374=348px 已超出 378-2×26=326px 的卡内可用宽。
- 建议改法：给 `.post-body`（scroll-view）内的卡片显式 `box-sizing:border-box` / `width:auto`，别用「100% 宽 + padding」把右内边距顶出视口；chip 行改 `flex-wrap` 或按可用宽折算 `flex-basis`。
- 修复类别：CSS/token

### R6-L06-D06　P3 / 圆角　批次 R6-B35
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`e4e4573896562a23`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:817`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius = 40rpx = 20px」
- 现象：表单卡圆角偏小——逐行追左上角：y=168 首白行左内缩 8px、y=176 归零，弧高仅约 8px（AA 阈值 >248 会低估，上界约 11px），而规范卡片圆角是 40rpx=20px；本页 4 张卡（.category-section/.title-section/.content-section/.images-section）全用 `var(--r-xl,24rpx)`=12px。同口径实测 index 话题卡左上角亦为 8px（y=392 缩 8 → y=400 归零）。
- 建议改法：卡片圆角统一改 `var(--card-radius)`（40rpx），别拿 `--r-xl` 当卡圆角。
- 修复类别：CSS/token

### R6-L06-D07　P0 / 可达性　批次 R6-B35
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`e4e4573896562a23`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:697`
- 理想图依据：无基准，依据=任务书已实测根因⑤「top/bottom 同图应有长内容 ⇒ 可达性」+ 本页自身模板（post-topic.vue:557-568 话题选择器 / 匿名开关在折叠线以下）
- 现象：bottom 帧与 top 帧 sha16 逐字相同（e4e4573896562a23）＝取景器把窗口滚到底后一个像素都没变；实测 x=330 列白底卡止于 y=781、y=781..812 露出 `.post-page` 渐变底，其下的 TopicSelector（post-topic.vue:558）、匿名开关（:562-569）与图片 4/5/6 槽全部被裁在视口外且无法滚到。根因：`.post-body{flex:1}`（697）在 `.post-page{height:100%;overflow:hidden}`（620-621）下缺 `min-height:0`，scroll-view 拿不到有界高度、又不产生内滚。
- 建议改法：`.post-body` 补 `min-height:0; overflow:hidden`，并核 real 档 scroll-view 是否真能内滚（补一条「滚到底出现提交/匿名开关」的取景断言）。
- 修复类别：单页

### R6-L06-D08　P2 / 颜色token　批次 R6-B35
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`e4e4573896562a23`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:828`
- 理想图依据：无基准，依据=规范文档§1.2「输入底 --c-bg-surface #F3FAF6」「页面底色 --c-bg-page #EEF7F2」两角色不得混用
- 现象：输入框底色错用页面底令牌——`.title-input` 与 `.content-input` 都写 `background: $bg-page`（post-topic.vue:828 与 post-topic.vue:855），实测标题输入区 (340,250)=#F0F8F4、内容输入区 (330,500)=#EDF7F1，均≈#EEF7F2（--c-bg-page），不是规范给输入角色的 #F3FAF6（--c-bg-surface）；于是「输入底」与「页面底」共用一个值，卡片内的输入区靠白卡反衬才勉强可辨。
- 建议改法：两处 `background: $bg-page` 改 `var(--c-bg-surface)`，与 certification 的输入底收敛到同一角色令牌。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（4 条）

### R6-L06-D09　P2 / 空态文案　批次 R6-B36
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`a250b96d95dd9e76`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:322`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:80 注释「空态主标题与『这里空空如也』语义重复时使用 hideSub 只留一句」
- 现象：空态叠了两句话——实测 y=213..224 一行「话题不存在或已被删除」、紧接 y=233..244 一行「这里空空如也」（行距仅 9px），后者是 EmptyState 在 description 缺省时兜出来的 `presetSubMap['no-data']`（EmptyState.vue:82），本页只传了 title（topic-detail.vue:322）却没传 `hide-sub`，等于把通用占位句压在真实原因句上；tools/search/index.vue:329 已按 hide-sub 口径收口，本页漏改。
- 建议改法：`<EmptyState … hide-sub />`（与 search 页同口径），只留「话题不存在或已被删除」。
- 修复类别：单页

### R6-L06-D10　P3 / 颜色token　批次 R6-B04
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`a250b96d95dd9e76`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:53`
- 理想图依据：无基准，依据=规范文档§1.2 中性色阶（--c-text-quaternary #9AA39F 等）全部为绿相灰，禁蓝相灰
- 现象：空态图标是蓝相灰、与全站绿相灰中性板不同族——实测放大镜笔画像素 #93A2B7 / #94A3B9 / #9AA8BB（B−R ≈ +36，蓝占优），而同页占位文字实测 #B6BEBA、页面底 #EEF7F2 均为 R≥B 的绿相灰；该图标由 `'no-data': IMAGE_PATHS.ICONS_COMMON.SEARCH` 直出 PNG，色值烙在素材里、不吃令牌。
- 建议改法：把 no-data 预设图标换成可着色的 `school.svg` 体系同族 SVG（stroke 走 `currentColor` + `--c-text-quaternary`），或重出绿相灰 #9AA39F 版 search.png。
- 修复类别：CSS/token

### R6-L06-D11　P1 / 可达性　批次 R6-B36
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`a250b96d95dd9e76`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:434`
- 理想图依据：无基准，依据=任务书已实测根因⑤「top/bottom 同图应有长内容 ⇒ 可达性」
- 现象：bottom 帧与 top 帧 sha16 逐字相同（a250b96d95dd9e76）＝滚到底像素不变；实测 x=189 列内容只到 y=292（返回按钮下缘），y=292..798 共 506px（占屏 62%）是纯 #EEF7F2 空底，且本页正常态（有回复列表）同样受 `.detail-body{flex:1}`（434）无 `min-height:0`、`.detail-page{height:100%;overflow:hidden}`（387 起）约束，@scrolltolower 回复翻页拿不到内滚区。
- 建议改法：`.detail-body` 补 `min-height:0`；另用一条有回复的话题补拍，确认 bottom 帧能拉开。
- 修复类别：单页

### R6-L06-D12　P2 / 位置　批次 R6-B36
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`a250b96d95dd9e76`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:320`
- 理想图依据：无基准，依据=组件规范 EmptyState 应居中于可用区（EmptyState.vue:127-131 图标+文案+按钮成组，无顶部锚定声明）
- 现象：空态块贴顶不居中——实测块体占 y=144..292（高 148px），可用内容区 y=101..814（高 713px），块中心 y=218 比区中心 y=457 高 239px；上方只留 43px 顶距，下方留 522px 空白，视觉上像被 header 挤下来的残帧。
- 建议改法：给 EmptyState 的外层容器加 `flex:1; align-items:center; justify-content:center`（或 `.empty-state{min-height:100%;display:flex;flex-direction:column;justify-content:center}`）让空态垂直居中。
- 修复类别：单页

## subpackages/chat/chat-session/index（4 条）

### R6-L14-D01　P1 / 素材缺失　批次 R6-B02
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`5e50a333eab7e58b`）
- 源码证据：`apps/client/src/components/chat/ChatHeader.vue:67`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3 聊天页头部规范 + 组件规范 components/chat/ChatHeader.vue
- 现象：标题「聊天」右侧的心形装饰图未出图——实测 x128-146（应落 28rpx=14px 图位）墨迹像素=0，标题墨迹右止 x125、「认识 1 天」墨迹起 x147，中间只剩 22px 空档；同帧「认识 1 天」粉字（#F8A6B2 系抗锯齿，芯值 #FF6B81）正常出。原因是 heartSrc=IMAGE_PATHS.MESSAGE_ICONS.HEART='/static/assets/message/svg/icon/heart.svg'（config/images.ts:309 字面量），而 real 出包包内无 `static/assets/message/` 整目录，且该常量未过 resolveMediaUrl。
- 建议改法：把 MESSAGE_ICONS 全组改走 assetDir()/resolveMediaUrl 出后端 app-assets URL，或把该枚 svg 归 localPrefixes 随包发布；改完复测 x128-146 区应有 14px 宽墨迹。
- 修复类别：需新建目标功能

### R6-L14-D02　P1 / 空态文案　批次 R6-B37
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`5e50a333eab7e58b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2151`
- 理想图依据：无基准，依据=规范文档§3（错误态只允许一处提示）
- 现象：同一句「缺少会话标识，请从聊天列表或匹配结果进入。」在本帧出现两次：列表区墨迹 bbox x15-248 / y107-118，输入区墨迹 bbox x17-250 / y755-766（同字串、同字号，仅 y 不同）；2151 行在 `.chat-input-area` 内二次渲染 2048 行已渲染过的 pageErrorMessage，导致底部白色输入条（y739-798，高 59px=118rpx）整块被错误文案占据，输入框与发送键 0 个。
- 建议改法：输入区错误分支只保留占位提示（或整区隐藏），把唯一一条错误文案留在消息流区；错误态下输入栏应给出「返回聊天列表」动作而非重复文案。
- 修复类别：单页

### R6-L14-D03　P2 / 文案　批次 R6-B37
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`5e50a333eab7e58b`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:971`
- 理想图依据：无基准，依据=同页 index.vue:984 自述降级规则「宁缺毋造」
- 现象：会话根本没解析成功（pageErrorMessage 已置位、sessionId 为空）时，头部仍断言两项关系事实：「认识 1 天」（971 行 `if (!sessionId.value) return 1;` 兜底造数）与「离线」（components/chat/ChatHeader.vue:70 由 online=false 反推，而 peerOnlineStatus 本帧从未成功拉取，index.vue:944 初值 null）。实测粉字「认识 1 天」墨迹 x147-192 y51-61、灰字「离线」墨迹 x99-124 y62-70，均落在错误页上。
- 建议改法：sessionId 为空/错误态时 relation-days 与在线状态整段不渲染（返回 null 而非 1/false），与 990 行 relationshipInfo 的整区隐藏口径一致。
- 修复类别：单页

### R6-L14-D04　P1 / 可达性　批次 R6-B37
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`0891255b62ec6a7a`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2545`
- 理想图依据：无基准，依据=规范文档§3 消息流可滚动到底
- 现象：bottom 帧与 top 帧 contentHash 完全相同（5e50a333eab7e58b，均 31152B，清单标 sameAsTop=true/dupOf=top），滚动后 0 像素变化。页面根 `.chat-page` 为 `height:100vh + overflow:hidden`（2545-2547），消息流装在 scroll-view 里（2039），取景用的 pageScrollTo 无法推动内层容器 ⇒ 长会话的尾部消息/新消息提示条在自动化与真机手势下均未被证明可达；本帧可见空白消息区 y119-737（619px=1238rpx）无任何内容。
- 建议改法：滚动容器改为可被外层驱动的单一来源（scroll-view 绑 scroll-top 并由页面 onReachBottom/下拉事件驱动），或整页自然流滚动去掉 100vh 锁；修后 bottom 帧应产生与 top 不同的 contentHash。
- 修复类别：单页

## subpackages/chat/official-chat/index（5 条）

### R6-L14-D05　P1 / 素材缺失　批次 R6-B38
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`0891255b62ec6a7a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:451`
- 理想图依据：无基准，依据=规范文档§3 官方助手页（英雄区吉祥物 + 每条助手消息带头像）
- 现象：助手形象全空白。实测 5 个助手头像盘（.msg-avatar 72rpx，盘高 36-37px 与声明一致）内部除边缘背景外 0 个非灰像素，纯 #e8e8e8 灰盘；英雄区 160rpx 吉祥物位（x149-229 / y96-176）与背景差值像素=0，即 80px 直径的空圆洞。原因：两处 :src 直接吃 IMAGE_PATHS.MASCOT.SMILE='/static/assets/images/mascot/mascot_smile.png'（config/images.ts:537 字面量，未经 resolveMediaUrl），而 real 包内 `static/assets/images/` 整目录不存在。
- 建议改法：451/421 两处改为 resolveMediaUrl(IMAGE_PATHS.MASCOT.SMILE)（同页 88 行 userAvatar 已是这个写法），并把该枚登记进单一来源表；复测要求 5 个盘内出现非 #e8e8e8 墨迹、英雄区 80px 圆内有像素。
- 修复类别：单页

### R6-L14-D06　P2 / 素材缺失　批次 R6-B38
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`0891255b62ec6a7a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:532`
- 理想图依据：无基准，依据=同页 index.vue:528 注释自述栏位规范「[表情][+][输入框][发送]」
- 现象：输入栏第一个栏位（.input-bar__icon 64rpx 表情钮）无图形：实测 x2-50 / y730-800 区域非白像素仅 14 个（全是边缘杂点），而同栏用 `<text>` 画的「+」同区域有 619 个像素——同一条栏、同一时刻，图元素 0 出、文字元素出。ICONS_EMOJI.SMILE 派生自 ICONS_BASE='/static/assets/icons'（config/images.ts:675），real 包内 `static/assets/icons/` 只剩 common/register/tabbar 三个子目录，扁平的 smile.svg 已被剪出包外。
- 建议改法：表情钮改用包内素材（assets/icons/common/ 或 svg-spec）或把 smile.svg 归入 localPrefixes 随包；改前该热区不可见、用户无法发现表情面板入口。
- 修复类别：需新建目标功能

### R6-L14-D07　P2 / 位置　批次 R6-B38
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`0891255b62ec6a7a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:608`
- 理想图依据：无基准，依据=规范文档§3 导航栏（返回钮与标题/系统胶囊同一视觉行）
- 现象：返回箭头「‹」掉到副标题行：实测箭头墨迹 x13-17 / y64-70（中心 y=67），标题「寻觅助手」墨迹 y28-55（中心 y=41），系统胶囊中心 y=43 ⇒ 箭头比标题低 26px（约 52rpx），且横向贴死在 80rpx 热区左缘（x13 起，热区应为 x12-52 居中）。608 行 .nav-back-icon 只给 font-size:42rpx 未收 line-height，598 行 .nav-left 又缺 justify-content。
- 建议改法：同 components/chat/ChatHeader.vue:101-103 的既有修法（line-height:1 + 负 margin 微调）并给 .nav-left 补 justify-content:center。
- 修复类别：CSS/token

### R6-L14-D08　P2 / 颜色token　批次 R6-B38
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`0891255b62ec6a7a`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:1014`
- 理想图依据：无基准，依据=规范文档§3 主按钮禁用态可读性
- 现象：空输入时「发送」按钮为白字压浅绿底：实测按钮底 #C7E9DC（取样 x340-355 / y748-770 全为该值），文字 #FFFFFF（1017-1020 行），WCAG 对比度 1.30:1，28rpx 正文完全读不出；且 #C7E9DC 与同文件 1006 行的 #36C99A 都是硬写字面量，仓内已有 --c-brand-500(#36C99A)/--c-neutral-* 档位。
- 建议改法：禁用态改用带档位的 token（如 --c-brand-200 底 + --c-brand-700 字，或 --c-status-disabled + --c-text-secondary），保证对比度≥4.5:1。
- 修复类别：CSS/token

### R6-L14-D09　P1 / 可达性　批次 R6-B38
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`7620f955de5b4d55`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:752`
- 理想图依据：无基准，依据=规范文档§3 消息流可上滑读历史
- 现象：bottom 帧与 top 帧 contentHash 相同（0891255b62ec6a7a，均 123168B，清单 sameAsTop=true），滚动 0 位移 ⇒ 首屏被截断的历史消息（本帧顶部 y185-215 有一条被切一半的气泡）不可达。752-755 行 `.chat-scroll{flex:1;overflow:hidden}` 缺 `min-height:0`（同仓 chat-session/index.vue:2574 已注明「flex 子项必须 min-height:0（mp-weixin）」并写了），且 scroll-view 不在 theme/global.scss:1 的 `view, text, image` border-box 复位名单内，容器高度按内容撑开后被 overflow:hidden 裁掉。
- 建议改法：.chat-scroll 补 min-height:0（并把 scroll-view 纳入全局 border-box 复位），改后要求 bottom 帧 hash 与 top 不同。
- 修复类别：单页

## subpackages/circles/circles/circle-home（10 条）

### R6-L05-D14　P1 / 素材缺失　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`6f530c0e30543d99`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:595`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 中部帖子卡底部互动栏「♡256 / 💬32」区
- 现象：帖子卡互动栏两枚图标全空：实测 y=490-512 带内、x=20..200 只有两个数字墨块（x=48-55、x=100-107，各 8×8px），图标应在的 x=26-47（心形）与 x=58-99（评论）为 0 非白像素。引用的是 `IMAGE_PATHS.ICONS_SOCIAL.LIKE / COMMENT`（:595、:604，尺寸 36rpx=18px，见 :1162），而 `apps/client/src/static/assets/icons/` 下**根本没有 social/ 目录**（盘上只有 common/ register/ tabbar/ 与散图），config/images.ts:454 拼出的 `/social/like.svg` 无处可取。
- 建议改法：新建 `static/assets/icons/social/{like,like-filled,comment,share}.svg`（按 cdn-buckets.json:12 的契约出包），或改指盘上已有的 icons/common/heart.svg + svg-spec 资源。
- 修复类别：需新建目标功能

### R6-L05-D15　P1 / 需新建　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`6f530c0e30543d99`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:480`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 右上角「分享」方框箭头图标
- 现象：头图右上分享按钮只剩一个空灰盘：按钮实测 x=235-267、y=56-74 区间内没有任何亮于 #A5A5A5 的像素（整片为 rgba(0,0,0,.3) 压在亮图上得到的 #9A9A91~#9EA59A），即 36rpx 图标 0 像素；同排左侧返回按钮改用文字「‹」（:474）所以可见。缺的正是 `ICONS_SOCIAL.SHARE`＝`assets/icons/social/share.svg`（config/images.ts:459），该目录在盘上不存在，且 cdn-buckets.json:12 已把 `static/assets/icons/social/` 划进 cdnPrefixes ⇒ 包内不留、只能靠 CDN，属需新建素材，不许造路径。
- 建议改法：与 D14 同批新建 social 图标目录并按 CDN 清单登记；未建好前临时用文字/内联 SVG 兜底，别留空盘。
- 修复类别：需新建目标功能

### R6-L05-D16　P1 / 需新建　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`6f530c0e30543d99`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:119`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 头图下方 4 枚深色胶囊标签 + tab 下方「置顶【圈规】…」公告条
- 现象：理想图两处模块在本帧 0 像素：①兴趣标签行（摄影技巧/风景拍摄/人像写真/城市漫游）——模板有 `.tag-chip` v-for（:526），实测信息卡底 y=300 到 tab 顶 y=319 之间无任何墨块；②置顶公告条——模板 `.pinned-card`（:547）在 real 档被写死为空：`pinnedNotice = useMock() ? t("circle.home.pinnedNotice") : ""`（:119），实测 tab 下划线 y=352-353 到首卡顶 y=373 之间只有页面底色 #EEF7F2。
- 建议改法：real 档给 pinnedNotice/circleTags 接后端字段（圈子公告、圈标签），无数据时出骨架而不是整段消失。
- 修复类别：需新建目标功能

### R6-L05-D17　P2 / 位置　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`6f530c0e30543d99`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:961`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png tab 行「动态/精华/活动/作品墙/成员 1.2w」同一基线单行
- 现象：第 5 个 tab 折成两行、与前 4 个错位：实测 动态 x=26-49、精华 77-102、活动 129-154、作品墙 173-212 均为单行 y=330-340，而「成员 1.2w」占两行（y=319-332 与 y=340-350）⇒ 基线上移 11px（≈22rpx），下一行还压到指示条（y=352-353）。根因：吸顶 tab 带右侧被胶囊避让吃掉 111px（`padding: 0 calc(var(--capsule-right,7px)+104px) 0 24rpx`，:961），5 个 `flex:1` 的 tab 各分 51px，而 `tabLabel()` 把「成员 1.2w」拼成一条文案（:435）需要 ≈58px。
- 建议改法：成员 tab 的人数改到第二行独立节点（或 flex 权重按内容给），别让它挤在 51px 里折行。
- 修复类别：CSS/token

### R6-L05-D18　P1 / 文案　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`6f530c0e30543d99`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:562`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 帖子作者行为「阿辰 / 光影捕手 / 老鹰视觉」等真实昵称
- 现象：real 档 feed 第二张卡作者行渲染为「演示·浙江大学」（实测 y=642-660，昵称墨块自 x=70 起，紧跟 x=26-68 的头像）——带「演示·」前缀的取证串文直接出现在真实档页面上；同帧理想图对应位置是「阿辰 + 认证勾 + 北京大学 chip」。
- 建议改法：清掉后端演示账号昵称前缀（与 utils/location.ts:23、HomeHeader.vue:27 的串文同批治理），real 档不渲染「演示·」。
- 修复类别：单页

### R6-L05-D19　P3 / 颜色token　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`c2ae726d93999f44`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:976`
- 理想图依据：无基准，依据=规范文档 §2「颜色一律走 --c-* 令牌」
- 现象：tab 文字色写死十六进制：`.tab-text { color: #5d6c7b }`（:976）未引用 --c-text-* 令牌，实测该帧未选中 tab 最深像素 #717E8C（x=77-102、y=328-344 取样），与同页正文灰阶无同源关系；深色模式/换肤时这一档不跟随。
- 建议改法：改 `var(--c-text-secondary)` 并删硬编码 hex。
- 修复类别：CSS/token

### R6-L05-D20　P1 / 层级遮挡　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`c2ae726d93999f44`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:959`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png（tab 以上为固定头部带，正文不得进入状态栏）
- 现象：吸顶 tab 栏（实测标签 y=72-90、指示条 y≈96）上方还有两行帖子正文穿透到状态栏带：实测 y=36-45 一行墨块横跨 x=26-340、y=49-59 一行 x=0-243，而系统时钟墨迹在 y=1-28、刘海黑块在 y=0-30（x=92-330）⇒ 正文与系统状态栏净距仅 8px，且首行右端伸到 x=340 已进入微信胶囊横向带（胶囊实测 x=290-365、y=56-71）。sticky 只扣了 `top: var(--statusbar)`（:959），其上的 hero 滚走后没有第二层遮罩，正文从 tab 上方 15px 缝里穿过。
- 建议改法：tab 带补与自身同色的不透明顶衬（padding-top = 状态栏 + 呼吸量，参照 hub.vue:470 的写法），或给 feed 容器加 overflow 裁切。
- 修复类别：单页

### R6-L05-D21　P1 / 素材缺失　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`c2ae726d93999f44`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:604`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 每张帖子卡底部「♡ 数字 / 💬 数字」
- 现象：本帧三张帖子卡（苏奈 / 草莓 / 阿辰）互动栏同样只剩数字：实测「0 1」「0 0」「0 0」两两数字之间与之前均为空白，图标位 0 非白像素（与 top 帧同一 x=26-47、x=58-99 空槽）；引用 `ICONS_SOCIAL.COMMENT`（:604）指向盘上不存在的 `static/assets/icons/social/`。
- 建议改法：同 D14，新建 social 图标目录后复拍本帧。
- 修复类别：需新建目标功能

### R6-L05-D22　P2 / 文案　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`c2ae726d93999f44`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:569`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 帖子时间为「30 分钟前 / 2 小时前 / 3 小时前」相对时间
- 现象：同一页两套时间格式：本帧三张卡作者行下方为裸日期「9-09」（实测 y=142-178 卡内作者行），而 top 帧同页另一条渲染为「1 小时前」（同帧 y=660-679 一带）——`item.timeText`（:569）由 store 侧拼装，服务端有相对时间、无 updatedAt 的条目退化成 M-DD，同屏并列即自相矛盾。
- 建议改法：timeText 统一走 formatCircleTime（同包 topic-detail.vue:290 口径），补「今天/昨天」档。
- 修复类别：单页

### R6-L05-D23　P2 / 尺寸比例　批次 R6-B39
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`7301b72cd11d8509`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1225`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 底部固定操作栏（加入圈子胶囊 + 右下悬浮发帖圆钮）
- 现象：底部固定栏高度与热区比例失衡：实测绿色「加入圈子」按钮 x=17-306、y=728-770（290×43px = 575×85rpx），其下到帧底仍有 44px 空白（y=771-814）；右侧发帖圆钮实测非白像素带 x=300-377、y=735-804，与按钮之间留 6px 缝（306→312）。按钮宽 290px 占屏 77%，理想图为 ≈72% 且圆钮与按钮底边对齐，本帧圆钮下沿（y=804）比按钮下沿（y=770）低 34px。
- 建议改法：固定栏改 flex 两端对齐 + align-items:center，按钮 flex:1、圆钮 96rpx 定宽，去掉手工 margin。
- 修复类别：CSS/token

## subpackages/circles/circles/index（identity A）（2 条）

### R6-L04-D11　P2 / 可达性　批次 R6-B81
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`d987c1b30fa524f2`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:233`
- 理想图依据：无基准页，依据=规范文档 §3（列表到底须有终止提示，避免无限空滚）
- 现象：bottom 帧已滚到第 3 条（最后一张卡止于 y≈468px 白底，其下 346px 全为页面底色 #f5f6fa），却没有任何「没有更多」提示——:233 的提示挂在 !hasMore 上，而 hasMore 初值 :57=true、只有走 :187 @scrolltolower→onLoadMore 才会置 false；本页实际是 window 滚动（见 D10），scroll-view 的 scrolltolower 永不触发 ⇒ 翻页链路与终止态双双不可达。
- 建议改法：首屏 fetch 后按返回条数直接判定 hasMore（<pageSize 即 false），并把滚动事件挂回页面 onReachBottom。
- 修复类别：单页

### R6-L04-D16　P3 / 素材缺失　批次 R6-B40
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`c53f1400dc67cdf4`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:451`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 前四张圈封面（相机/房车/演唱会/滑板实拍）
- 现象：本帧前四张封面（摄影/旅行/音乐/运动圈）实测均值色 #E6EAE0、平均饱和度 0.065/0.071/0.067/0.061，几乎与页面底色 #EEF7F2 同明度；理想图同位封面实测 #959689、饱和度 0.231，本帧第 5 张（美食圈）实测 0.382 正常 ⇒ :451 circleCover() 命中的前四张素材未对源（淡彩占位插画），封面在卡里像没加载出来。
- 建议改法：前四张圈封面改指 app-assets 里与理想图同题材的实拍图（或补拍/补素材），并保留 :451 的 mode="aspectFill"。
- 修复类别：单页

## subpackages/circles/circles/post-topic（6 条）

### R6-L05-D08　P1 / 位置　批次 R6-B41
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`334e04a6c6180237`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:856`
- 理想图依据：无基准，依据=规范文档 §3.14 发布页「卡片左右等内衬」+ 同包 topic-detail 卡片实测内衬 13px
- 现象：四张表单卡片整体右溢出：卡片白底实测 x=13..377（宽 365px），左内衬 13px、右内衬仅 1px；左上角有圆角曲线（y=185→193 时 x 由 21 收到 13），右缘恒为 377 且**无**圆角 ⇒ 右侧被视口裁掉。根因：`.post-body` 是 `<scroll-view>`（:507）却写了 `padding: 24rpx`（:856），而全局 border-box 复位只覆盖 `view, text, image`（theme/global.scss:1），scroll-view 仍是 content-box ⇒ 内容盒 = 378 + 24 = 402px，右侧 12px 出屏。
- 建议改法：给 `.post-body` 补 `box-sizing: border-box`（或把 24rpx 内衬下移到卡片自身 margin），并把 global.scss:1 的复位扩展到 scroll-view/swiper。
- 修复类别：CSS/token

### R6-L05-D09　P2 / 文案　批次 R6-B24
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`334e04a6c6180237`，自同段前条继承）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3797`
- 理想图依据：无基准，依据=规范文档 §3.14「发布到选择器」只要求一处目标说明
- 现象：同一张卡里「发布到」出现两次：区块标题 `t('circle.postTopicPublishTo')`（post-topic.vue:543，实测 y=404-416、x=28-64）与下方只读回显 `t('circle.postTopicSelectedTarget')`＝「发布到：校园圈」（:590，实测绿色文字 x=36-123、y=486-498），两句间隔仅 70px，读起来像标签重复渲染。词条本身把标签又拼了一遍（zh-CN.ts:3792「发布到」/ :3797「发布到：{name}」）。
- 建议改法：把 :3797 改成「已选：{name}」，或删掉 :589-591 的回显行（选择器已高亮选中态）。
- 修复类别：单页

### R6-L05-D10　P2 / 颜色token　批次 R6-B41
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`334e04a6c6180237`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:1243`
- 理想图依据：无基准，依据=规范文档 §3.14「发布按钮 --c-brand 胶囊」
- 现象：底部主提交按钮禁用态与页面底色同色：按钮填充实测 #EEF2F0（x=30 列上 y=720-760 连续 41px），页面底 #EEF7F2（同列 y=704-716）——两色只差 ΔG=5/255，按钮轮廓在帧上 0 像素可辨，只剩中间 12px 高的灰字「发布话题」（实测 x=172-228、y=735-746）。源码 `.bottom-submit__btn--disabled { background: $border-light }`（:1243）取的正是 design-variables.scss:189 的 #EEF2F0，而它比 $bg-page #EEF7F2（:127）几乎不深。
- 建议改法：禁用态改 `--c-border-default` 或加 1px 描边/降透明度，保证与页面底 ΔL ≥ 8%。
- 修复类别：CSS/token

### R6-L05-D11　P1 / 可达性　批次 R6-B41
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`334e04a6c6180237`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:507`
- 理想图依据：无基准，依据=规范文档 §3.14 发布页含「图片九宫格 + 小贴士 + 底部工具栏」多段，应有可滚动作证
- 现象：bottom 帧与 top 帧逐字节相同（sha16 均为 334e04a6c6180237，取景清单 sameAsTop=true、scrollMethod=`pageScrollTo+Element.scrollTo(1)`）：实测内容底边（提交按钮 y=762）已在视口 814px 内，滚动零位移 ⇒ 该页在 real 档没有第二屏，两帧证据完全重复。而 real 档下 tags-section（:598）与 favorite-section（:659）被 `useMock()` 关掉，页面比 mock 档更短，滚动配额被浪费。
- 建议改法：本帧改判为「不可用/重复帧」，或把取景改为带 9 图与超长正文的态以覆盖内滚行为。
- 修复类别：单页

### R6-L05-D12　P2 / 间距　批次 R6-B41
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`334e04a6c6180237`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:529`
- 理想图依据：无基准，依据=本页卡片内衬规范（.content-section padding:28rpx，post-topic.vue:896）
- 现象：字数计数器「0/500」实测 x=344-375、y=354-364 —— 右缘距屏幕右边只有 3px（≈6rpx），越过卡片应有的 28rpx（14px）内衬约 10px；它是 `.content-count`（:529，`justify-content: flex-end`）随 D08 的 402px 溢出容器一起被推到屏外的。
- 建议改法：修掉 D08 的 border-box 后复量；计数器右缘应落在 x≈352（卡片内衬线）而非 375。
- 修复类别：CSS/token

### R6-L05-D13　P3 / 文案　批次 R6-B41
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`6f530c0e30543d99`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:711`
- 理想图依据：无基准，依据=规范文档 §3.14 单一提交动作口径
- 现象：一屏两枚提交按钮、两套文案：头部胶囊实测亮色带 x=150-299、y=49-84，文字取 `t("circle.postTopicSubmit")`＝「发布」（zh-CN.ts:3764）；底部按钮实测文字 x=172-228、y=735-746，却复用**导航标题**词条 `t("circle.postTopicNavTitle")`＝「发布话题」（zh-CN.ts:3762）。同一动作两个名字，且底部按钮的标签与页面标题耦合（改标题会连带改按钮）。
- 建议改法：底部按钮改调 `circle.postTopicSubmit`（或新增 submitBottom 词条），与头部统一为「发布」。
- 修复类别：单页

## subpackages/circles/circles/topic-detail（7 条）

### R6-L05-D01　P1 / 可达性　批次 R6-B42
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`cd475f745acc65d3`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:217`
- 理想图依据：无基准，依据=规范文档 §3.13/§3.11 话题详情应有「正文 + 回复列表 + 底部回复栏」三段
- 现象：整页只渲染兜底空态——实测内容止于 y=311（「返回」按钮底边），y=312-798 共 487px（≈966rpx）为纯页面底色 #EEF7F2；正文 scroll-view（同文件 :271）、评论区（:315）、底部回复栏（:410）三块在本帧 0 像素。取景清单 query 为空 ⇒ onLoad 取不到 topicId 直接落 EmptyState（:401），生产入口其实是带参的（circle-home.vue:424）。
- 建议改法：取景参数补 `topicId`（与 circle-home.vue:424 同口径），让本帧覆盖正文分支；无参直开的兜底分支另拍一帧，不占正文配额。
- 修复类别：单页

### R6-L05-D02　P2 / 位置　批次 R6-B04
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`cd475f745acc65d3`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:125`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue（空态应在可用区内垂直居中）
- 现象：空态块贴顶不居中：头部绿带底边 y=120，图标顶 y=167（间隙 47px），按钮底 y=311，其下留白 487px ⇒ 视觉重心 y=237 只占帧高 29%。`.empty` 只有 `padding: 80rpx 40rpx`、无 flex:1/高度约束；本页残留的 `.empty-state{flex:1;justify-content:center}`（topic-detail.vue:810）已成死样式（模板里无该节点，实际走 :401 的 EmptyState 组件）。
- 建议改法：给 `.empty` 补 `flex:1` 并由父级给高，同时删掉 topic-detail.vue:810-842 的死样式。
- 修复类别：CSS/token

### R6-L05-D03　P2 / 空态文案　批次 R6-B24
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`cd475f745acc65d3`，自同段前条继承）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:2922`
- 理想图依据：无基准，依据=EmptyState.vue 组件规范「R10-P2-008 空态只留一句」
- 现象：主标题「话题不存在或已被删除」（实测 y=230-241，x=123-255）下面又叠一行通用副标题「这里空空如也」（实测 y=251-261，x=155-223，68×11px），两句语义重复。组件已为此提供 `hideSub`（EmptyState.vue:27，命中即返回空串 :81），但本页调用（topic-detail.vue:401-407）只传了 title/action-text/type，未传 hide-sub ⇒ 走 presetSubMap['no-data'] 白送一行填充文案。
- 建议改法：本页 `<EmptyState>` 补 `hide-sub`，或把副标题换成有指向性的文案（如「去圈子看看别的讨论」）。
- 修复类别：单页

### R6-L05-D04　P2 / 颜色token　批次 R6-B01
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`cd475f745acc65d3`）
- 源码证据：`apps/client/src/styles/tokens.scss:319`
- 理想图依据：无基准，依据=规范文档 §2 令牌单一来源（同一 token 不得两处定义）
- 现象：本页头部 `background: var(--c-gradient-brand)`（topic-detail.vue:450）实测左上 #38CA9B → 右下 #54D4A6，与 theme/design-variables.scss:171 的 `#36C99A→#55D5A7` 吻合；但 styles/tokens.scss:319 对**同名** `--c-gradient-brand` 另定义为 `#36C99A→#156B51`（末端深绿），App.vue 先 :306 引 design-variables、后 :311 引 tokens ⇒ 头部色值取决于导入顺序，本帧读数无法自证符合规范。
- 建议改法：删掉 tokens.scss:319 的重复定义（或改为引用同一变量），把 --c-gradient-brand 收成单一来源。
- 修复类别：CSS/token

### R6-L05-D05　P1 / 可达性　批次 R6-B42
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`cd475f745acc65d3`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:271`
- 理想图依据：无基准，依据=规范文档 §3.13 帖子/话题详情「全部评论（楼层+楼中楼）」需可滚动作证
- 现象：bottom 帧与 top 帧逐字节相同（两帧 sha16 均为 cd475f745acc65d3，取景清单 sameAsTop=true）：滚动位移 0 像素，本页不存在可复核的「底部状态」。根因同 D01——正文 scroll-view（:271）根本没渲染，页面高度等于视口，pageScrollTo/elementScroll 无处可滚（清单 scrollMethod=`pageScrollTo+elementScroll:N/A`）。
- 建议改法：按 D01 补 topicId 重拍；若确认无正文可滚，本帧应记「不可用」而非以相同像素充数。
- 修复类别：单页

### R6-L05-D06　P2 / 尺寸比例　批次 R6-B04
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`cd475f745acc65d3`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:146`
- 理想图依据：无基准，依据=本页自述标准（topic-detail.vue:791 注释「热区高度 ≥ 44px 可点击标准 / min-height:88rpx」）
- 现象：空态唯一可点元素「返回」按钮实测 x=158-219、y=276-310 ⇒ 62×35px = 123×69rpx，热区高 69rpx 低于同页 :792 写下的 88rpx 标准 19rpx；圆角曲线从 y≈272 收到 y=288（半径 ≈12px=24rpx ≈ 高度一半）说明确是胶囊，但高度只由 `padding: var(--sp-4) 40rpx`（:146，16rpx 上下内衬）撑出来，无 min-height。
- 建议改法：`.empty-action` 补 `min-height: 88rpx`（与 :792 同口径），别只靠 padding 撑高。
- 修复类别：CSS/token

### R6-L05-D07　P3 / 文案　批次 R6-B42
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`334e04a6c6180237`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:264`
- 理想图依据：无基准，依据=本页导航文案与动作文案不得同词
- 现象：同一屏出现两个「返回」：头部返回胶囊（:264 渲染 `t("circle.topicDetailBack")`，实测头部 y=45-60 左侧白字胶囊）与空态动作按钮（:404 传同一个 key `circle.topicDetailBack`，实测 y=276-310，按钮内文字 2 字）。二者动作也不同（前者 goBack 退栈、后者同样 goBack 但视觉上是"再进一次"的引导位），用户无法区分。
- 建议改法：空态按钮改「去兴趣圈首页」（goBack 的 reLaunch 分支 :151 本就是去圈子列表，文案应与去向一致）。
- 修复类别：单页

## subpackages/circles/circles/topics（identity A，取景 query 为空）（2 条）

### R6-L04-D18　P3 / 素材缺失　批次 R6-B40
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`cc820feba7d733ce`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:451`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 运动圈/美食圈封面（实拍照片）
- 现象：本帧第一张卡（运动圈）封面实测 y=454.4–595.2rpx、均值色 #D9D6CC、饱和度 0.101，而同帧往下美食圈/阅读圈/宠物圈封面实测 0.518 / 0.341 / 0.381 ⇒ 同一列表里前四张标准圈封面与后四张不同源，滚到底仍能看出「上半截封面发白」的断层；理想图六张封面饱和度一致（0.231 起）。
- 建议改法：统一 :451 circleCover() 的素材来源，前四张换成与后四张同规格的实拍封面。
- 修复类别：单页

### R6-L04-D20　P2 / 文案　批次 R6-B43
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`cc820feba7d733ce`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:486`
- 理想图依据：无基准页，依据=全站 i18n 约定（同页其余文案均走 t()，如 :356/:393）
- 现象：置顶圈规条整句「【圈规】文明发言，友善交流，共同维护圈子氛围」是硬编码中文字面量（帧上实测位于 y≈357–387rpx 的浅绿条内），未走 i18n；同页 :411「人加入 · 条动态」、:425「等 N 位朋友已加入」同样硬编码 ⇒ 切语言/改圈规时这三处漏网。
- 建议改法：三条字面量收进 locales/zh-CN.ts（circle.ruleText / cardStats / friendsJoined），模板改 t()。
- 修复类别：单页

## subpackages/discover-extra/discover/history（4 条）

### R6-L08-D01　P3 / 素材缺失　批次 R6-B44
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`b2efa20f90aa1e2d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:238`
- 理想图依据：无基准，依据=规范文档§1.2（调色板无 #94A3B8 一档）+ EmptyState.vue 组件规范（空态插画须与场景语义同构）
- 现象：浏览历史空态的插画绑的是通知铃铛 `IMAGE_PATHS.ICONS_COMMON.NOTIFICATION`，实测铃铛占 x164-215 / y235-290（101x85rpx），笔画色 #94A3B8；「今日已看」列表页用一枚消息铃铛当插画，站内没有浏览历史专用空态素材，只能借铃铛
- 建议改法：为 discover/history 建一枚「浏览历史/已看卡片」空态插画（走 ICONS_COMMON 或 svg-spec 并在 app-assets 清单登记），不再复用 NOTIFICATION
- 修复类别：需新建目标功能

### R6-L08-D02　P2 / 可达性　批次 R6-B44
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`b2efa20f90aa1e2d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:235`
- 理想图依据：无基准，依据=EmptyState.vue 组件规范（支持 actionText 即渲染可点按钮，:104-115）
- 现象：空态副文案写「快去寻觅页发现有趣的TA吧」指向寻觅页，但 EmptyState 未传 actionText ⇒ 画面 y336 以下 478px（949rpx，占视口 59%）实测零元素、零可点热区，全帧唯一可点是返回圈（实测白色圆 x17-52 / y57-92 = 69x69rpx），用户读完引导没有出口
- 建议改法：给该 EmptyState 传 actionText（如「去寻觅」）并接 switchTab('/pages/discover/index')，复用组件已有的 .empty-action 热区
- 修复类别：单页

### R6-L08-D03　P3 / 位置　批次 R6-B44
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`b2efa20f90aa1e2d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:259`
- 理想图依据：无基准，依据=规范文档§1.4（空态应视觉居中于剩余视口）
- 现象：空态块贴在统计卡正下方（图标起于 y=235，文案止于 y=336），页面根容器是 flex column 但没给 EmptyState flex-grow/居中 ⇒ 内容只占 y106-336（230px=456rpx，视口 28%），下方 478px 全空，视觉重心偏上
- 建议改法：.history-list 或空态外层给 flex:1 + 居中（justify-content:center），使空态落在剩余视口的垂直中心
- 修复类别：单页

### R6-L08-D04　P2 / 可达性　批次 R6-B44
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`b2efa20f90aa1e2d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:236`
- 理想图依据：无基准，依据=规范文档§1.4 + 取景清单 sameAsTop=true 判据
- 现象：bottom 帧与 top 帧逐像素相同（实测 changed px = 0 / 307692，两帧 contentHash 同为 b2efa20f90aa1e2d）⇒ 滚动到底没有产生任何新画面；根因是空态分支（historyCards.length===0）下列表容器高度为 0，页高不足一屏，滚动后布局完全不可取证
- 建议改法：空态下也要让页面有可核验的长内容（补「挽回/去寻觅」次级入口或列表占位），或按规范把空态垂直居中后确认 bottom 帧与 top 帧的差异来源
- 修复类别：单页

## subpackages/discover-extra/discover/match-success（2 条）

### R6-L07-D03　P1 / 素材缺失　批次 R6-B16
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`78eca15698fcd7df`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:43`
- 理想图依据：素材/理想效果图/匹配成功页面.png —「共同点」卡 4 行行首各一枚彩色线性图标（奔跑人形/音符/胶片/相机）
- 现象：实帧「共同点」卡第 1 行「慢跑爱好」(ICONS_EMOJI.RUN) 与第 3 行「电影偏好」(ICONS_EMOJI.BOOK) 行首为空白圆角底衬、无图标；第 2 行 MUSIC 正常渲染，证明是 RUN/BOOK 两枚图标在 real 档 app-assets 未命中（空白），非布局塌陷。底衬 __score-icon-box 有绿/粉底但内层 __score-icon 不可见。
- 建议改法：scoreIcons[0]/[2] 换成 real 档可渲染的图标资源（对齐可正常显示的 ICONS_EMOJI.MUSIC 口径），或在 app-assets 补齐 run/book 图标。
- 修复类别：单页

### R6-L07-D04　P2 / 文案　批次 R6-B45
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`f333e7f812b470fd`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:181`
- 理想图依据：素材/理想效果图/匹配成功页面.png — 副标题「你和 星野 互相喜欢了彼此」（人名为真实昵称）
- 现象：底帧副标题渲染为「你和 TA 互相喜欢上了」，人名位是占位符「TA」而非对方真实昵称（理想图为「星野」）。partner?.name 为空时回落到 discover.partnerDefaultName「TA」，说明匹配对象资料未回填昵称，庆祝页对不上人。
- 建议改法：确认 matchedUser/回退资料链把对方 name 透传到本页（partner?.name 非空），避免落到默认「TA」占位。
- 修复类别：单页

## subpackages/discover-extra/discover/matching（2 条）

### R6-L07-D01　P1 / 素材缺失　批次 R6-B15
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`007fed4afcc225ab`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:52`
- 理想图依据：素材/理想效果图/匹配中页面.png —「共同点」卡 4 行行首各一枚彩色线性图标（奔跑人形/音符/胶片/相机）+ 头像间一枚粉心 + 四周漂浮粉心装饰
- 现象：实帧「共同点」卡第 1 行「旅行爱好」(MASCOT.STAR) 与第 3 行「电影偏好」(MASCOT.SPARKLE) 行首为空白 #E8F8F5 圆底、无图标；中央爱心 (HEART_GRADIENT) 与 8 枚漂浮装饰爱心 (HEART_PINK_LARGE/HEART_GREEN) 全部不渲染，画面仅剩两枚头像与绿色轨道点。第 2 行 MUSIC、第 4 行 SPROUT 正常显示，证明是 MASCOT 系资源缺失而非布局问题。
- 建议改法：把 PROGRESS[0]/[2] 与装饰爱心换成 real 档 app-assets 已存在的图标（对照同页可渲染的 ICONS_EMOJI.MUSIC/ICONS_V2.SPROUT 口径），或在 app-assets 补齐 mascot/star.png、sparkle.png、heart_* 资源。
- 修复类别：单页

### R6-L07-D02　P2 / 可达性　批次 R6-B15
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`6ef3c6e214eb2cf9`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:137`
- 理想图依据：素材/理想效果图/匹配中页面.png — 理想图为整屏铺满（头像居中、共同点卡贴底、下方留 home indicator），无大片空白
- 现象：底帧与顶帧内容逐像素同图（129554B vs 130328B，画面一致）——页面内容（头像区+标题+共同点卡）只占视口上沿约 45%，其下为整片空渐变。`.match-loading` 用 `min-height:100%`，但父级（page→.matching-page）无可解析确定高度，100% 退化为 auto，内容不铺满、也无第二屏可滚，bottom 取景拿不到任何新内容。
- 建议改法：组件根改自证 `min-height:100vh`（同页 MatchSuccess.vue:194 已用此修法），或让内容纵向居中/撑满，消除底部空带。
- 修复类别：CSS/token

## subpackages/discover-extra/home/segment（2 条）

### R6-L07-D05　P1 / 文案　批次 R6-B46
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`0f794ba96c48a6eb`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:152`
- 理想图依据：无基准页；依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3「附近的人（按距离/同城分段 + 人卡列表）」+ 取证串文系统性问题②
- 现象：实帧列表前四行人名带取证串文前缀「演示·」——「演示·中山大学」「演示·浙江大学」「演示·武汉大学」「演示·南开大学」。人名被拼成「演示·+校名」，是把演示/种子身份直出到 real 档用户可见文案（系统性问题②）。
- 建议改法：后端 recommendations 去掉「演示·」前缀、回填真实昵称；前端渲染 item.name 处不再透传该串文。
- 修复类别：单页

### R6-L07-D06　P2 / 位置　批次 R6-B46
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`5c6981b57bbeb1ec`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:167`
- 理想图依据：无基准页；依据=全站设计规范与逐页设计稿说明.md §3 该页 + 同类 nearby/people 页（固定头部 + 内层 scroll-view）
- 现象：底帧顶边直接是列表首行「谢知意」，其上方的返回键+标题「细分发现·在线」已滚出视口——本页用页面级滚动（.segment-page 定高 min-height:100% + 整页滚，非 scroll-view），头部非 sticky，滚动后列表行顶入系统状态栏下沿、与「22:46」时钟/胶囊同区。对照同域 nearby/people 页用固定头部+内层 scroll-view，滚动后仍保留标题与 tabs，两页行为不一致。
- 建议改法：把 .segment-page 改为固定头部 + 内层 scroll-view（对齐 people.vue:207 模式），或给 header 加 position:sticky + 顶部安全区，避免滚动内容压进状态栏。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（5 条）

### R6-L08-D09　P2 / 素材缺失　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`5050246f4012616b`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:180`
- 理想图依据：无基准，依据=规范文档§1.6 铁律 3 + LockScreen.vue:143 注释自陈「解锁徽章 + 同校头像 + 漂浮爱心」
- 现象：插画区两枚漂浮爱心（.illustration__heart--1/--2）在画面上完全不存在——实测顶/底两帧中 #FF6B81 系（r>200,g<170,r-g>60）像素均为 0，环周只有绿环 + 2 枚头像 + 对勾徽章；根因 ICONS_SOCIAL.LIKE_FILLED 直出 /static/assets/icons/social/like-filled.svg，而 apps/client/src/static/assets/icons 下没有 social 子目录（后端 app-assets 的 assets/icons/social/like-filled.svg 有货，cdnPrefixes 也登记了该目录）
- 建议改法：ICONS_SOCIAL 组按子目录粒度取基址（assetDir('assets/icons/social')）或包 resolveMediaUrl，让 real 档落到后端 URL
- 修复类别：单页

### R6-L08-D10　P2 / 可达性　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`5050246f4012616b`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:244`
- 理想图依据：无基准，依据=LockScreen.vue:11-13 组件自述（底部提示应「贴近屏底」可见）
- 现象：底部补充提示「资料越完善，匹配越精准，曝光机会越多」不在首屏——顶帧 y660-792 实测仅 7 个非背景像素（同区底帧滚动后为 2088 个，落在 y707-719），要滚 90px(179rpx) 才露出；根因 .lock-screen 用 min-height:100vh 铺满，宿主 likes-visitors/index.vue:317 又额外加 paddingTop=statusBar+sp-6，总高超出视口
- 建议改法：组件高度改 min-height:100%（宿主已给安全区）或由宿主传可用高度，保证 footer 与主按钮同屏可见
- 修复类别：单页

### R6-L08-D11　P2 / 颜色token　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`5050246f4012616b`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:148`
- 理想图依据：无基准，依据=规范文档§1.2（调色板内无 #94A3B8 一档，主色 #36C99A、次文本 #4A524E）
- 现象：锁图标压在品牌绿环上却几乎看不见——实测环 x119-259/y213-353（278x278rpx）底色 #44CEA0，环心锁笔画取样 #96A5B9（lock.svg 里写死 stroke="#94A3B8"），两者对比度 1.22:1；该 slate 灰不在 §1.2 任何令牌里，也不随主题变
- 建议改法：锁素材改内联 currentColor 或另出一枚反白/深绿版本，品牌底上用 --c-text-inverse，别把 #94A3B8 烘进 svg
- 修复类别：CSS/token

### R6-L08-D12　P2 / 颜色token　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`bf20fbdb8a81f854`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:421`
- 理想图依据：无基准，依据=LockScreen.vue:412 注释自陈「右下角白色圆底 + 绿色对勾」+ 规范文档§1.2 令牌表
- 现象：对勾徽章的 6rpx 品牌描边根本没画出来——实测 y341 一行从环绿 #4FD3A5 直接进白 #FEFEFE，出白圆后 x272 起即 #DFE3E0（页面底色），白底外没有任何品牌绿环带；根因 `border: 6rpx solid var(--c-gradient-brand)` 把 tokens.scss:319 的 linear-gradient 当 border-color 用，属非法值 ⇒ 整条边框不生效
- 建议改法：border-color 换成纯色令牌 var(--c-brand)（或 --c-brand-600），渐变只用于 background
- 修复类别：CSS/token

### R6-L08-D13　P2 / 可达性　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`bf20fbdb8a81f854`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:599`
- 理想图依据：无基准，依据=规范文档§1.2（三级文本令牌）+ 仓库既有 WCAG AA 4.5:1 口径（NotLoggedWaiting.vue:330-332）
- 现象：次入口「先逛逛公开内容」用 --c-text-tertiary，实测该令牌在 tokens.scss:245 是 #8A92A0，压在 #EEF7F2 页底上对比度 2.87:1（帧内字形取样 #808D88），字号 --fs-md=26rpx(13px) 不享大字号豁免；游客唯一非登录出口比同页正文更弱
- 建议改法：链接文字改 var(--c-text-secondary, #4A524E)（7.37:1），或把 --c-text-tertiary 调暗到 ≥4.5:1 后再复用
- 修复类别：CSS/token

## subpackages/discover-extra/likes/index（4 条）

### R6-L08-D05　P1 / 素材缺失　批次 R6-B10
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`a9b3994cbb523d04`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:149`
- 理想图依据：无基准，依据=规范文档§1.6 铁律 3（裸 :src 一律包 resolveMediaUrl/SafeImage）+ NotLoggedWaiting.vue 规格书 12.6（4 个 icon 行）
- 现象：4 枚功能图标里第 2 枚「聊天互动」完全空白——实测 y540-580 带内 4 个热区中只有 3 个有墨（x65-95 / x214-237 / x284-313，ink 381/477/544 px），聊天位 x131-174 非背景像素 = 0；根因是 IMAGE_PATHS.ICONS_EMOJI.CHAT 直出包内路径 /static/assets/icons/chat.svg，real 主包 static/assets/icons 下只剩 common/register/tabbar（chat.svg 已被裁剪），后端 assets/icons/chat.svg 有货但该常量不经 resolveMediaUrl
- 建议改法：把 ICONS_EMOJI 组改按 assetDir('assets/icons/emoji') 或直接过 resolveMediaUrl 走后端 app-assets，或换用包内 ICONS_COMMON 的聊天素材
- 修复类别：单页

### R6-L08-D06　P1 / 素材缺失　批次 R6-B10
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`a9b3994cbb523d04`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:171`
- 理想图依据：无基准，依据=规范文档§1.6 铁律 3 + 规格书 12.7（微信一键登录按钮含微信图标）
- 现象：主按钮「微信一键登录」左侧 32rpx 图标位空白——实测按钮 y615-673 内白色墨块只覆盖文字 x155-244（177rpx 宽），文字块中心 x=199.5 而按钮中心 x=189.5，整体被空图标盒+12rpx gap 顶偏右 10px(20rpx)；根因 ICONS_V2.WECHAT_GREEN_SVG 直出 /static/assets/icons/login/wechat-green.svg，而 apps/client/src/static 下根本没有 icons/login 目录（cdn-buckets.json 的 cdnPrefixes 却登记了 static/assets/icons/login/ 走后端）
- 建议改法：该键改走 resolveMediaUrl/后端基址（与 cdnPrefixes 对齐），并在图标缺失时不给 flex 占位，避免标签偏心
- 修复类别：单页

### R6-L08-D07　P2 / 可达性　批次 R6-B10
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`0a59b963cf3c2c9d`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:407`
- 理想图依据：无基准，依据=规范文档§1.2（占位色 --c-text-placeholder #9AA39F 仅限 placeholder）+ 同文件 :330-332 已确立的 WCAG AA 4.5:1 口径
- 现象：幽灵按钮「稍后再看」写死 #9AA39F 压在 #EEF7F2 页底上，实测字形取样 #9BA4A0，对比度 2.37:1，字号 30rpx/15px 未达 WCAG 大字号豁免线 ⇒ 远低于同文件 :334 为 .not-logged__hint 定的 --c-text-secondary(7.37:1) 档，登录墙唯一退出路径读不出
- 建议改法：与 hint 同口径改 var(--c-text-secondary, #4A524E)（7.37:1），不再写死占位灰
- 修复类别：CSS/token

### R6-L08-D08　P2 / 间距　批次 R6-B47
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`0a59b963cf3c2c9d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1025`
- 理想图依据：无基准，依据=规范文档§1.4（页边距 --page-padding 32rpx = 16px）
- 现象：游客等待页被页容器与组件双重内边距挤压——实测主按钮 x40-338（593rpx 宽）、次按钮 x41-337，左右各留 80rpx（组件 .not-logged 已含 48rpx + 本页 padding var(--sp-8)=32rpx），比规范页边距 32rpx 多出 48rpx，按钮比应有的 654rpx 窄 61rpx
- 建议改法：整页替换型组件（NotLoggedWaiting）挂到本页时把 .likes-page 的左右 padding 归零（或改 var(--page-padding) 由组件自己给），避免叠加
- 修复类别：单页

## subpackages/discover-extra/nearby/people（2 条）

### R6-L07-D07　P1 / 文案　批次 R6-B48
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`22b63ab2126e374e`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:228`
- 理想图依据：无基准页；依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3「附近的人（按距离/同城分段 + 人卡列表）」+ 取证串文系统性问题②
- 现象：实帧列表前三行人名带取证串文「演示·」前缀——「演示·中山大学」「演示·武汉大学」「演示·南开大学」。附近的人页把演示/种子身份直出到用户可见昵称（系统性问题②），与真实昵称（如后续行的「小新生」「远山」）混排。
- 建议改法：recommendations 数据去掉「演示·」前缀并回填真实昵称；本页 item.name 渲染处不再透传该串文。
- 修复类别：单页

### R6-L07-D08　P2 / 文案　批次 R6-B48
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`5878432e680fd4a4`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:85`
- 理想图依据：无基准页；依据=全站设计规范与逐页设计稿说明.md §3 该页（人卡列表应逐条唯一、昵称/年龄/学校自洽）
- 现象：底帧第 2 行「阿辰 · 25 · 东南大学」与顶帧第 8 行「阿辰 · 20 · 北京大学」为同名两条、年龄与学校互相矛盾，即同一列表里出现两个「阿辰」。去重键 `card.userId ? String(card.userId) : name:${card.name}`（:85）只在缺 userId 时按名字去重，两条各自带 userId 时同名冲突不被拦截。
- 建议改法：后端修同名种子数据（昵称唯一或补不同昵称）；前端去重键在 userId 之外再按 name+campus 兜底挡一层。
- 修复类别：单页

## subpackages/discover/activities/index（6 条）

### R6-L16-D06　P1 / 素材缺失　批次 R6-B49
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`cba3f647345bf322`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:441`
- 理想图依据：无基准，依据=规范文档§1.6 渲染铁律第 2/3 条（素材必须出图）+ 同卡片内 :445 日程图标正常出图的自对照；画面首张活动卡「校体育馆」行（y=364..376）
- 现象：地址图标完全不出图：实测该行文字「校体育馆」左边缘 x=47，而 x=29..46（28rpx=14px 图标位 + 8rpx 间距）整块为空白；同卡下一行 :445 的日程图标正常画在 x=29..42。根因是 ICONS_EMOJI 全部 14 个 svg（含 assets/icons/location.svg:1）写 `fill="none" stroke="currentColor"`，而 mp-weixin `<image>` 载入的是独立 SVG 文档，CSS 的 color（:829 的 var(--c-text-tertiary)）传不进去 ⇒ 描边不可见；正常出图的 common/schedule.svg 正是写死 stroke="#94A3B8"
- 建议改法：给这批 emoji 图标写死描边色（或改用 iconfont/内联 base64 上色），别依赖 currentColor 跨 image 边界继承
- 修复类别：需新建目标功能

### R6-L16-D07　P2 / 圆角　批次 R6-B49
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`cba3f647345bf322`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:751`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20px」+ design-variables.scss:699 令牌实值；画面首张活动卡左上角（y=286..292）
- 现象：活动卡圆角只有一半：边缘扫描实测卡片左缘 x=17，首行白像素 y=286 起于 x=26（内缩 9px），到 y=292 才回到 x=17 ⇒ 圆角半径 ≈9-10px=18-20rpx，正是 :751 的 var(--r-lg,20rpx)；令牌要求 40rpx=20px。同页 SectionCard（「下一步」卡）走 SectionCard.vue:33 的 var(--r-xl)=24rpx，实测 discussions 卡左上内缩 8px/10 行收敛≈10px，两类卡圆角还互不相同（20rpx vs 24rpx）
- 建议改法：卡片统一改吃 var(--card-radius)（40rpx），别再各自挑 --r-lg/--r-xl
- 修复类别：CSS/token

### R6-L16-D08　P3 / 颜色token　批次 R6-B49
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`cba3f647345bf322`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:784`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（主色必须走 --c-brand 系令牌）；画面活动卡标题行右侧「综合」分类标签
- 现象：「综合」标签的色与底取自 `--c-primary`，而全仓 theme/ 里没有任何 `--c-primary:` 定义（实测设计令牌只有 --c-brand/--c-brand-500），画面之所以仍是绿的，靠的是 :784/:785 两处硬编码 fallback #36C99A 与 color-mix(…12%)；一旦品牌色调整或换肤，这个标签不会跟
- 建议改法：:784/:785 改 var(--c-brand) + var(--c-brand-50)（或新增 --c-tag-* 档），删掉 --c-primary 这个不存在的令牌名
- 修复类别：CSS/token

### R6-L16-D09　P2 / 可达性　批次 R6-B49
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`222455bd9a97e12e`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:840`
- 理想图依据：无基准，依据=AppShell.vue:333-335 自述判据「触摸目标 ≥88rpx（44px）」；画面「环湖夜走第六期」卡的「感兴趣」按钮（y=237..268）
- 现象：描边行检测实测按钮上边 y=237..239、下边 y=268 ⇒ 盒高 32px=64rpx，正是 :840 的 height:64rpx，比同仓 AppShell 返回键自证的 88rpx 下限小 24rpx；同页顶部「列表/日历」切换实测品牌绿块高 28px=56rpx（y=193..220，:690 的 10rpx 上下内边距 + 24rpx 字），筛选 chip 高约 29px=58rpx，三处都低于 88rpx
- 建议改法：:840 与 :690 的触摸高度统一提到 ≥88rpx（按钮可保留视觉高度、用 min-height + 内边距撑出命中区）
- 修复类别：单页

### R6-L16-D10　P3 / 间距　批次 R6-B49
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`222455bd9a97e12e`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:750`
- 理想图依据：无基准，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx = 16px」+ design-variables.scss:698；画面第二张活动卡（顶 y=188，左缘 x=17）
- 现象：卡片内边距只有令牌的 3/4：实测卡片左缘 x=17，卡内正文/地址行墨色起点 x=29..30（top 帧同测）⇒ 内缩 12-13px=24-26rpx，对应 :750 的 padding:24rpx；同页「下一步」用 SectionCard（:32 padding var(--sp-8)=32rpx）实测内缩 16px，两类卡的内边距也不齐
- 建议改法：:750 改 padding: var(--card-padding)（32rpx），与 SectionCard 同侧
- 修复类别：CSS/token

### R6-L16-D11　P1 / 素材缺失　批次 R6-B49
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`222455bd9a97e12e`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:829`
- 理想图依据：无基准，依据=规范文档§1.6 渲染铁律第 2/3 条；画面第二张卡「未名湖畔草坪」行（y≈202）
- 现象：同一缺陷在本帧独立复现且能定位到「上色假设」这一行：实测「未名湖畔草坪」文字起点 x=51，其左侧 x=29..47 的 28rpx 图标位整块空白；:829 给 `.row-icon` 写 `color: var(--c-text-tertiary, #94a3b8)` 想给图标上色，但 `<image>` 载入独立 SVG 时 color 不跨边界继承，location.svg 的 `stroke="currentColor"` 因此无描边色可用（写死 #94A3B8 的 common/schedule.svg 在同帧 y≈232 正常出图）
- 建议改法：要么把 emoji 图标换成写死色值的 SVG / 内联 base64，要么改用 iconfont 让 :829 的 color 真正生效
- 修复类别：需新建目标功能

## subpackages/discover/discussions/index（5 条）

### R6-L16-D01　P2 / 素材缺失　批次 R6-B08
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`2db444711502a4e2`）
- 源码证据：`apps/client/src/components/common/StatusState.vue:17`
- 理想图依据：无基准，依据=规范文档§1.6 渲染铁律（素材必须真出图）+ 组件规范 StatusState.vue 的 tone→图标映射；画面「正在讨论」列表首行徽标区（y=215..233，x=32..106）
- 现象：本页 10/10 行的热度徽标全部把「热度上升 / 13 人参与」画成一个 ✕ 形图标——tone="warning" 被硬映射到 ICONS_COMMON.CLOSE（close.png），仓内没有「热度/火焰」类徽标素材（同目录其实有 assets/icons/fire.svg 但未被此映射使用），实测该图标墨色像素 @46,219，与「关闭」语义一致而与「热度」语义相反
- 建议改法：给 StatusState 增加 heat/flame 档（tone 或新 prop 指向热度图标），discussions/index.vue:101 不再复用 tone="warning" 的 CLOSE 图标
- 修复类别：需新建目标功能

### R6-L16-D02　P3 / 颜色token　批次 R6-B08
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`2db444711502a4e2`）
- 源码证据：`apps/client/src/components/common/StatusState.vue:30`
- 理想图依据：无基准，依据=规范文档§1.2 配色（同一控件的前景色必须来自同一角色令牌）；画面「正在讨论」首行徽标
- 现象：同一枚 pill 里两种前景色：标签字色实测 #F49600（=--c-warning #F59E0B 的墨心，底 #FEF5E6=--c-warning-bg-tint rgba(245,158,11,.1) 叠白，逐位吻合），而 :30 的 `<image>` 图标是 PNG 里烤死的蓝灰墨色 #99A6B9，不随 tone 变；brand/success 档同样会带这个灰 ✕
- 建议改法：图标改为按 tone 上色的单色 SVG（或提供 close-brand/success/warning 三档），别让固定灰度 PNG 进彩色语义 pill
- 修复类别：CSS/token

### R6-L16-D03　P1 / 层级遮挡　批次 R6-B13
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`2852074758f8dc0f`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:310`
- 理想图依据：无基准，依据=AppShell.vue:304-305 自述判据「吸顶时背景延伸进状态栏区——滚动时正文不得与系统状态栏文字叠印」+ 规范文档§1.2 页面底色；画面帧顶 y=0..29（状态栏/刘海带）
- 现象：本页未给 AppShell 传 fixed（AppShell.vue:53 默认 false，discussions/index.vue:75 只传 show-back），头部随页滚走，正文滚进状态栏区：实测 y=0 处已有整宽 51px 的 warning pill 底色 #FEF5E6（x=36..86），到 y=18 才结束，pill 圆头被视口上沿直接切平（正常 38rpx≈19px 高的 pill 在 y=0 就已满宽）；同时系统状态栏「23:03」字形实测落在 y=18..29 / x=20..36，正好压在卡片白底与该 pill 左下角
- 建议改法：与法务页同处理——AppShell 传 fixed（LegalTextPage.vue:161 已传），让吸顶头带不透明 --c-bg-page 底吃掉状态栏区
- 修复类别：单页

### R6-L16-D04　P2 / 文案　批次 R6-B50
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`2852074758f8dc0f`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:103`
- 理想图依据：无基准，依据=组件规范 SectionCard/feed-row 的「标题+摘要」两级信息结构（两级不得同文）；画面本帧可见 6 行讨论条目
- 现象：标题与摘要逐字重复：本帧「大提琴独奏练习中，想找人一起合奏」「这学期终于收尾，攒了半学期的生活费准备去看海，想想就很激动」「汉服出行日，路上好多同袍」三行的 :102 标题与 :103 摘要完全同文，另有两行仅差标题被截断成「…」（top 帧同型问题共 7/10 行），画面表现为同一句话连着印两遍
- 建议改法：:103 加去重守卫（summary===title 或 summary 以 title 开头时不渲染摘要行），或把数据侧 summary 改成真正的正文摘要
- 修复类别：单页

### R6-L16-D05　P2 / 可达性　批次 R6-B03
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`2852074758f8dc0f`）
- 源码证据：`apps/client/src/components/common/BottomActionBar.vue:74`
- 理想图依据：无基准，依据=AppShell.vue:333-335 自述判据「min-height/min-width 确保 ≥88rpx（44px）」同一文档口径的前景对比要求；画面帧底「下一步」主按钮（实测 x=168..352 / y=752..800）
- 现象：「去寻觅」主按钮实测底色为 --c-gradient-brand 的 #38C99B..#4ED2A4（≈--c-brand #36C99A），字色走 :74 的 #FFFFFF，白字压品牌绿对比度仅 2.1:1（#FFFFFF/#36C99A 相对亮度 1.00/0.449），28rpx 字号既不到 WCAG AA 正文 4.5:1 也不到大字号 3:1
- 建议改法：彩色底主按钮改用 brand-700 #2AAE83 及以深端（或按§1.2 用 brand-dark），把白字对比抬到 ≥4.5:1
- 修复类别：CSS/token

## subpackages/legal/agreement/index（4 条）

### R6-L16-D17　P1 / 文案　批次 R6-B24
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`b78b8503215dbc2e`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4731`
- 理想图依据：无基准，依据=组件规范 LegalTextPage 元信息单值要求；画面卡片元信息行（实测墨色 y=195..197 起，x 从 30 起）
- 现象：用户协议页复现同一双日期缺陷：帧上读出「最后更新：2026-07-26: 2026-10-19」，:4731 的 "lastUpdated" 自带日期，LegalTextPage.vue:171 再拼一次动态 updatedAt，两值相差 85 天且中间多一个半角冒号
- 建议改法：:4731 去掉硬编码日期只留标签，日期由组件统一出
- 修复类别：单页

### R6-L16-D18　P2 / 位置　批次 R6-B05
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`b78b8503215dbc2e`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:165`
- 理想图依据：无基准，依据=组件规范 AppShell 页头与卡片头不得同文重复；画面 y=110..128 与 y=171..183
- 现象：「用户协议」四字在帧顶重复排两次：实测第一处 y=110..128、x=18..99（44rpx 页头标题），第二处 y=171..183、x=29..88（:256 --fs-2xl=32rpx 卡片标题），两处垂直间距仅 43px，读起来标题错位重印（与 privacy 帧同型，量法相同：逐行暗像素带 + 左右墨界）
- 建议改法：:161 不再向 AppShell 传 title（或 :165 卡片头改放版本号/生效日期）
- 修复类别：单页

### R6-L16-D19　P2 / 可达性　批次 R6-B05
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`cb62b94322dda01d`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:365`
- 理想图依据：无基准，依据=AppShell.vue:333-335 同仓自述的可达性下限口径 + 规范文档§1.2 配色（主色上前景须可读）；画面底部「我已阅读并同意」按钮（实测 x=29..349 / y=726..771）
- 现象：全页唯一的确认按钮是低对比组合：实测按钮底 #36C99A（:355 var(--c-brand)，四角取样一致），字色走 :365 var(--c-text-inverse)→rgba(255,255,255,.95)，帧内按钮区最亮像素实测 #F5FDFA（亮像素仅 348/14766，即字身），#F5FDFA 压 #36C99A 对比度 ≈2.0:1，28rpx 字号需 4.5:1；按钮高 46px≈91rpx 命中区本身达标，问题只在配色
- 建议改法：品牌绿底上的前景改走更深的 brand-700 底或给文字加描边/改用深色字，使对比 ≥4.5:1
- 修复类别：CSS/token

### R6-L16-D20　P1 / 文案　批次 R6-B24
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`cb62b94322dda01d`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4730`
- 理想图依据：无基准，依据=规范文档§1.6 交付内容不得留占位；画面「11. 联系方式」两行（放大裁切 x=16..362 / y=560..690 读出）
- 现象：协议正文把占位联系方式渲染给用户：帧上读出「support@campuslove.example.com，客服热线 400-xxx-xxxx（09:00-22:00）」，example.com 测试域 + 字面 xxx 未替换；同帧末段还有「本协议 v1.0.0 版本于 2026-07-26 生效。详细完整版本请查看小程序内"用户协议"页面。」的自我指涉（与 privacy 帧 D16 同型）
- 建议改法：替换为真实客服邮箱与热线并删除自指句（zh-CN.ts:4730 / en-US.ts:4791 同步）
- 修复类别：单页

## subpackages/legal/privacy/index（5 条）

### R6-L16-D12　P1 / 文案　批次 R6-B05
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`1e65a720c48d1024`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:171`
- 理想图依据：无基准，依据=组件规范 LegalTextPage 自述「顶部展示标题、版本号、最后更新时间」（单值元信息）；画面卡片元信息行（实测墨色 y=195..197 起）
- 现象：「最后更新」一行印出两个互相矛盾的日期：帧上放大读出「最后更新：2026-07-26: 2026-10-19」——i18n 值本身已含日期（zh-CN.ts:4739 "lastUpdated": "最后更新：2026-07-26"），:171 又在其后拼 `: {{ displayUpdatedAt }}`（后端 updatedAt=2026-10-19），合规页出现双日期 + 多余半角冒号
- 建议改法：i18n 只留标签「最后更新」不带日期（zh-CN.ts:4731/4739 同改），日期一律由 displayUpdatedAt 出
- 修复类别：单页

### R6-L16-D13　P2 / 位置　批次 R6-B05
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`1e65a720c48d1024`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:161`
- 理想图依据：无基准，依据=组件规范 AppShell 页头与 LegalTextPage 卡片头不得同文重复；画面帧顶 y=115..128 与 y=171..183
- 现象：同一句「隐私政策」在 43px 内出现两次且两套字号：实测第一处墨色带 y=115..128、x=18..99（4 字宽 81px ⇒ 字高约 22px=44rpx，即 :161 传给 AppShell 的 title），第二处 y=171..183、x=29..88（4 字宽 59px ⇒ 约 16px=32rpx，即 :165 的 legal-header__title），画面读起来像标题被重复排版
- 建议改法：二选一——LegalTextPage 不传 AppShell title（或卡片头改展示版本号/生效日期而不再重复标题）
- 修复类别：单页

### R6-L16-D14　P3 / 字号　批次 R6-B05
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`1e65a720c48d1024`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:336`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「极小 --fs-xs/sm = 10/11px，用途：角标 · 法务」+ 行高「法务 1.75」；画面正文段落（y=228..490）
- 现象：法务正文走 --fs-md（26rpx=13.1px）而规范把法务划在 10/11px 档：实测单行墨高 12-13px（y=228..241、252..264 等行带，行距 23-24px ⇒ line-height 1.8 与 :338 一致），比§1.3 法务档大 2-3px；同页卡片头 :256 用 --fs-2xl、元信息 :270 用 --fs-xs，正文与「法务」档口径不一致
- 建议改法：确认§1.3 法务档后统一（正文改 --fs-sm/--fs-base 或把该档写进规范），并把 :338 行高对齐规范 1.75
- 修复类别：CSS/token

### R6-L16-D15　P1 / 文案　批次 R6-B24
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`4cee79c62f7f2c01`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4738`
- 理想图依据：无基准，依据=规范文档§1.6 素材/内容补齐口径（交付内容不得留占位）；画面「10. 联系我们」两行（实测 y≈455..500）
- 现象：隐私政策正文把占位符直接交给用户看：帧上放大读出「privacy@campuslove.example.com，客服热线 400-xxx-xxxx（09:00-22:00）」——example.com 是保留测试域，400-xxx-xxxx 是未替换的字面 xxx；提审合规页留占位联系方式属实质内容缺失
- 建议改法：换成真实对外邮箱与 400 号码（zh-CN.ts:4738 与 en-US.ts:4799 同改），或后端 CMS 下发时覆盖并禁止 fallback 出占位串
- 修复类别：单页

### R6-L16-D16　P2 / 文案　批次 R6-B24
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`4cee79c62f7f2c01`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4738`
- 理想图依据：无基准，依据=组件规范 LegalTextPage 元信息（版本/日期）与正文不得互相打架；画面末段两行（实测 y≈565..610）
- 现象：末段自我指涉且日期口径三重冲突：帧上读出「本政策 v1.0.0 版本于 2026-07-26 生效。详细完整版本请查看小程序内"隐私政策"页面。」——用户此刻就在该页；同一帧顶部卡片元信息又写「最后更新：2026-07-26: 2026-10-19」（见 D12），生效日/更新日/回退日三个值并存
- 建议改法：删掉「请查看小程序内…页面」这句自指，版本与生效日期改由 displayVersion/displayUpdatedAt 单点渲染，正文不再硬编码
- 修复类别：单页

## subpackages/market/detail/index（4 条）

### R6-L17-D01　P2 / 可达性　批次 R6-B51
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`214c9d66ab9333d1`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:499`
- 理想图依据：无基准，依据=仓内既有热区裁定 components/common/LockScreen 同批注释与 components/discover/FilterDrawer.vue:944 的「热区 ≥88rpx（44px @2x）」自定标准；区域=画面中部唯一主操作「返回」胶囊按钮
- 现象：封存态唯一主操作「返回」实测绿底胶囊 y465-502px、x161-217px ⇒ 高 38px=75.4rpx（含抗锯齿边约 40px=80rpx，与源码 `min-height: 80rpx` 相符）、宽 57px=113.1rpx；本仓自定热区标准是 88rpx（FilterDrawer.vue:944 注释「热区 ≥88rpx（44px @2x）」），该按钮比标准矮 8rpx，且宽度只有页面宽度的 15%（113/750）。
- 建议改法：`min-height` 80rpx→88rpx（或引热区令牌），并给按钮加 `min-width`/左右铺满，使主操作热区达标。
- 修复类别：CSS/token

### R6-L17-D02　P2 / 颜色token　批次 R6-B51
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`214c9d66ab9333d1`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:502`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（--c-brand #36C99A 用途为「主按钮·选中态·链接·进度」，未定义其上可叠白字）；区域=「返回」按钮文字
- 现象：按钮底实测 #36C99A（=--c-brand 逐字相等），文字取 `--c-text-inverse`（白）；帧内该按钮区最亮字墨 #FFFFFF vs 底 #36C99A 的 WCAG 对比度 = **2.10:1**，低于正文 4.5:1 与大字号 3:1 两条线 ⇒ 品牌绿直接当白字底用，令牌配对不成立。
- 建议改法：主按钮底改用 --c-brand-600/#2AAE83 或 --c-brand-700（规范 §1.2「主色深：按压态·深色文字」）以承载白字，或白底+品牌绿字。
- 修复类别：CSS/token

### R6-L17-D03　P2 / 需新建　批次 R6-B51
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`214c9d66ab9333d1`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:306`
- 理想图依据：无基准，依据=规范文档 §1.5 组件库清单（common 组已列 StatusState/ErrorState/EmptyState，独缺「商业化封存」态组件）；区域=整块居中封存提示（锁图标+两行字+按钮）
- 现象：同一个「商业化封存」状态在仓内被手写四份（grep `commerce.sealedTitle` 命中 market/detail、market/shop、market/wallet、tools/love-center/consulting 四个 .vue），`components/common/` 下无对应组件；后果在本帧可见——detail 的封存块连卡片容器都没有（锁图标墨迹 x170-209 y367-409 直接压在页面底 #EEF7F2 上，四周无白卡、无描边、无阴影），而同分包 shop/wallet 的同一状态是白卡，三页三种几何。
- 建议改法：新建 `components/common/CommerceSealed.vue`（锁图标+标题+描述+可选动作槽），四个消费页改为引用同一组件。
- 修复类别：需新建目标功能

### R6-L17-D04　P3 / 可达性　批次 R6-B51
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`214c9d66ab9333d1`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:360`
- 理想图依据：无基准，依据=清单实测（该帧 sameAsTop=true、contentRegionHash=7c1e2262d5f292bb 与 top 帧逐字相同、dupOf=market/detail/index__top）+ 同页商品分支的滚动容器写法；区域=整屏
- 现象：bottom 帧与 top 帧逐字节同图（本机 sha256 前 16 位两帧均为 214c9d66ab9333d1，清单 contentRegionHash 亦相等）⇒ 滚动探针零位移，清单 scrollMethod 记为 `pageScrollTo+elementScroll:N/A`。根因在源码：只有商品详情分支被 `<scroll-view scroll-y class="product-scroll">`（:360）包住，封存分支（:306）是挂在 `min-height:100%` 裸列里的普通 view，没有可滚对象。本帧实测内容最低墨迹止于 y502px=996rpx，其下 312px=619rpx（视口 38%）只有页面底 #EEF7F2，"bottom" 这一状态对本页不存在。
- 建议改法：封存分支同样包进 scroll-view（或给根容器 `min-height:100vh`+可滚），使 top/bottom 两态在短屏上都能覆盖到全部内容。
- 修复类别：单页

## subpackages/market/shop/index（5 条）

### R6-L17-D05　P2 / 位置　批次 R6-B52
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`a72f4135b7d7ba4e`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:714`
- 理想图依据：无基准，依据=仓内既有同类裁定 components/common/LockScreen.vue:12（已把「内容堆在屏幕上半区、下半屏空白」定性为缺陷并改为纵向居中）；区域=白色封存卡与其下方整片页面底
- 现象：白卡实测 y131-303px ⇒ 顶 260rpx、底 601rpx、高 343rpx，卡在视口（814px=1615rpx）里贴着头部摆放，其下 511px=1014rpx（占屏 62.8%）是纯色页面底（x189,y400 实测 #EEF7F2），没有任何内容；同分包 detail 页同一状态是纵向居中（其内容块上下空白 552rpx / 619rpx，量级相当）。源码即 `margin: 60rpx 24rpx` 顶置，未做纵向居中。
- 建议改法：封存卡改为在剩余区域内纵向居中（flex:1 容器 + justify-content:center，或 min-height:100vh 铺满后居中），与 detail/LockScreen 的既有裁定一致。
- 修复类别：单页

### R6-L17-D06　P2 / 字号　批次 R6-B52
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`a72f4135b7d7ba4e`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:441`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表（页面主标题 26–28px/700–800；--fs-5xl 22px 用途为「卡片大标题」；--fs-xl/2xl 15/16px 为正文）；区域=页头标题「逛逛」
- 现象：同一 market 分包三页的页头标题用了三档字号——本页 `var(--fs-5xl, 44rpx)` 实测单字墨宽 41.7rpx（83.3rpx/2 字）；detail 页头 `var(--fs-2xl, 32rpx)` 实测 30.2rpx/字（121.0rpx/4 字）；wallet 页头 `var(--fs-xl, 34rpx)` 实测 28.8rpx/字（115.1rpx/4 字）。三档分别是规范里的「卡片大标题」档与两个「正文」档，没有一档落在 §1.3 规定的页面主标题 52–56rpx 上；本页比另两页大出 37%/45%。
- 建议改法：三页页头统一到同一页面主标题档（规范 §1.3 的 26–28px 档，或全站既有的 --fs-2xl 页头档），别再各取一档。
- 修复类别：CSS/token

### R6-L17-D07　P2 / 空态文案　批次 R6-B52
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`a72f4135b7d7ba4e`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:380`
- 理想图依据：无基准，依据=规范文档 §1.1 原则 5 与 §3 逐页说明的「文案要指到本页要什么」口径；区域=卡内第二行说明文字
- 现象：说明行实测三帧墨迹完全同尺寸（x99-279、w=359.1rpx、h=23.8rpx）⇒ 逐字同一句「该功能暂未开放，开放时间将另行通知」（zh-CN.ts:804）。商城（本页）、钱包、商品详情三个不同用途的页共用一句无主语的「该功能」，画面上没有任何一处说明被封的是「逛逛/交友币/商品购买」中的哪一个；且文案承诺「另行通知」，而本帧可见元素只有返回键+标题+锁+两行字，页内无订阅/提醒入口可承接该承诺。
- 建议改法：封存文案按页给功能名（如「逛逛商城暂未开放…」），并去掉无法兑现的「另行通知」或补上提醒入口。
- 修复类别：单页

### R6-L17-D08　P3 / 可达性　批次 R6-B52
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`a72f4135b7d7ba4e`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:318`
- 理想图依据：无基准，依据=清单实测（sameAsTop=true、contentRegionHash=14c1226cc851fe75 与 top 帧相等、dupOf=market/shop/index__top、scrollMethod=pageScrollTo+elementScroll:N/A）；区域=整屏
- 现象：bottom 帧与 top 帧逐字节同图（本机 sha256 前 16 位两帧均为 a72f4135b7d7ba4e）⇒ 滚动零位移。源码原因：唯一的滚动容器 `<scroll-view scroll-y class="shop-scroll">`（:318）整块位于 `v-if="!commerceSealed"` 分支内，封存分支（:377）在容器外，页面上没有任何可滚对象。实测本帧卡底 y303px=601rpx 以下 511px=1014rpx（占屏 62.8%）全是页面底，"bottom" 态对本页不存在。
- 建议改法：把封存分支也纳入可滚容器（或给 .shop-page 铺满 100vh 后居中），使两态截图有实际差异可审。
- 修复类别：单页

### R6-L17-D09　P2 / 颜色token　批次 R6-B52
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`a72f4135b7d7ba4e`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:451`
- 理想图依据：无基准，依据=规范文档 §1.1 原则 1（主题底色统一浅绿 #EEF7F2，页面间不得出现断层）+ §1.1 原则 2（绿色=行动、粉色=喜欢，两色禁止混用）；区域=页头标题「逛逛」与其所在页底
- 现象：页头标题在 mp-weixin 分支被降级成纯色 `var(--c-brand)`，实测字墨最暗 #2DC695，而其脚下页底是 `linear-gradient(180deg, --c-tint-green-50 → --c-bg-page)`，本帧实测顶端 (8,20)=#E8F5E9、(8,130)=#EAF6ED（均非规范 §1.1 规定的统一底 #EEF7F2，ΔRGB=6/2/5）；绿字压浅绿底实测对比度 **1.95:1**，连大字号 3:1 都不到。同时该处是页头标题（非行动件），按 §1.1 原则 2 用"行动绿"上色属角色错配。
- 建议改法：页头标题改用 --c-text-primary；本页页底去掉 --c-tint-green-50 渐变起点，回到统一 #EEF7F2。
- 修复类别：CSS/token

## subpackages/market/wallet/index（5 条）

### R6-L17-D10　P2 / 圆角　批次 R6-B53
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`3b31f2abb8e0c48d`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:350`
- 理想图依据：无基准，依据=规范文档 §1.4（卡片圆角 --card-radius: 40rpx=20px；圆角档位 --r-sm→--r-full 内无 r-2xl 一档）；区域=白色封存卡四角
- 现象：同一张「商业化封存」卡，本页写 `border-radius: var(--r-2xl, 32rpx)`，而 `--r-2xl` 全站从未定义（theme/design-variables.scss 只有 --r-xxl，styles/tokens.scss:98 定义的别名是 --radius-2xl，均非 --r-2xl）⇒ 恒走 32rpx 兜底；shop 页同卡用 `var(--r-xl, 24rpx)`（--r-xl 实值 24rpx，design-variables.scss:202）。帧上实测角弧收敛：shop 从左缘首个白行起 8 行（≈16rpx）收平，本页 11 行（≈22rpx）收平 ⇒ 两页同卡圆角确实不同（1px=1.98rpx 分辨率下绝对值有 ±4rpx 不确定，相对大小关系与源码声明一致：24 < 32），且两者都够不到 §1.4 的卡片圆角 40rpx。
- 建议改法：两处统一改引 --card-radius（40rpx），并删掉不存在的 --r-2xl 引用（本页 :291 余额卡同病）。
- 修复类别：CSS/token

### R6-L17-D11　P2 / 间距　批次 R6-B53
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`3b31f2abb8e0c48d`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:349`
- 理想图依据：无基准，依据=规范文档 §1.4 卡片内边距 --card-padding: 32rpx + §1.1 原则 3「一令牌一值」；区域=白色封存卡内边距与卡高
- 现象：本页卡 `padding: var(--sp-8) var(--sp-6)` = 32rpx/24rpx，shop 页同卡 `padding: 80rpx 48rpx`（shop/index.vue:715）——上下内边距差 2.5 倍。帧上实测：本页首个白行 y115 到锁图标顶 y132 = 17px=33.7rpx，shop 为 y131→y172 = 41px=81.3rpx；两卡内容完全同尺寸（锁图标墨迹均 79.4×85.3rpx、标题行均 142.9×27.8rpx、描述行均 359.1×23.8rpx），但卡高本页 242rpx vs shop 343rpx，101rpx 差额全部来自 padding；左右同理使卡宽本页 712rpx vs shop 696rpx。
- 建议改法：封存卡内边距按 --card-padding（32rpx）统一，shop 侧去掉 80rpx/48rpx 的手写值。
- 修复类别：单页

### R6-L17-D12　P2 / 素材缺失　批次 R6-B53
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`3b31f2abb8e0c48d`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:153`
- 理想图依据：无基准，依据=规范文档 §1.1 原则 4（图标一律用标准 SVG，禁 emoji/字形顶替）+ 同分包 detail/shop 页头返回件的既有实现；区域=页头左上返回按钮
- 现象：本页返回件是裸文本字符「‹」（:153）而不是全站共用的 `IMAGE_PATHS.ICONS_COMMON.BACK`（detail/index.vue:299、shop/index.vue:278 都用它）。本帧实测（与 top 逐字节同图，读数取自本帧像素）：以 ΔRGB>30 为阈，该处只有 x22-26、y67-73 共 20 个像素过阈 ⇒ 字形强墨迹仅 9.9×13.9rpx；同位置 detail/shop 的返回图标墨迹约 40rpx 见方。字形顶替使返回件在 64rpx 圆底里显得又小又偏，且随系统字体度量漂移。
- 建议改法：换成 `<image :src="IMAGE_PATHS.ICONS_COMMON.BACK">`，与同分包另两页一致。
- 修复类别：单页

### R6-L17-D13　P2 / 颜色token　批次 R6-B53
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`3b31f2abb8e0c48d`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:269`
- 理想图依据：无基准，依据=规范文档 §1.2（卡片/遮罩叠层色须走 --c-overlay-* 令牌，一令牌一值）；区域=页头左上的返回圆底
- 现象：返回圆底写 `background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2))`，但该令牌实值是 rgba(255,255,255,**0.08**)（design-variables.scss:902），兜底里的 0.2 永不生效——代码预期与实际值差 2.5 倍。帧上实测：圆底内部 (25,62)=#4ACFA4，紧邻的页头绿 (8,60)=#3ACB9C，ΔRGB=16/4/8，对比度 **1.05:1**；以 ΔRGB>30 为阈整圆检不到墨迹 ⇒ 圆底实际不可见，返回件只剩 D12 那个小字形。
- 建议改法：该处不要用遮罩色令牌，改显式 20% 白的语义令牌（或 --c-brand-600 实色底+白字），使圆底可见。
- 修复类别：CSS/token

### R6-L17-D14　P2 / 可达性　批次 R6-B53
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`3b31f2abb8e0c48d`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:281`
- 理想图依据：无基准，依据=规范文档 §1.2（--c-text-inverse 的适用前提是深底；brand-500 #36C99A 属浅绿主色）；区域=页头标题「我的钱包」
- 现象：页头标题用 `--c-text-inverse`（白）压在 `linear-gradient(135deg, --c-brand-500 #36C99A, --c-brand-400 #55D5A7)`（:259）上；本帧实测页头两端底色 (8,60)=#3ACB9C、(280,60)=#4CD1A3，标题区最亮字墨 #FFFFFF vs 局部底 #40CFA0 对比度 **1.97:1**，返回字形最亮 #F9FEFB vs 同底 **1.93:1**。标题实测 28.8rpx/字（--fs-xl=30rpx，15px 粗体，按正文算需 4.5:1，按大字号算需 3:1），两条线都不达标；渐变右端（brand-400 更浅）比左端更差。
- 建议改法：页头改深底（--c-brand-600/700）承载白字，或标题/返回件改用 --c-text-primary 系深色。
- 修复类别：CSS/token

## subpackages/profile-extra/feedback/history（2 条）

### R6-L13-D09　P2 / 文案　批次 R6-B54
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`4ee2a525c2f108b9`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:268`
- 理想图依据：无基准，依据=组件规范 AppShell.vue:216（`subtitle` 渲染为 `.shell__eyebrow` 眉标，语义是页面前缀说明）+ EmptyState.vue:102（`description` 是空态副标题）——同一个 key 不该同时喂给这两个槽位
- 现象：空态副标题「提交反馈后将在此处显示」被当成页头眉标，一屏出现两遍。量法：页头眉标实测墨迹 y=106..116、x=16..144、w=129（11 字 × 11.7px，`--fs-base` 24rpx）；空态副标题实测 y=345..359、w=129 —— 两行宽度逐字相同，且与 i18n 值 `feedback.historyEmptyDesc`（zh-CN.ts:3321「提交反馈后将在此处显示」）等长同串。history.vue:268 把 `historyEmptyDesc` 传给 AppShell 的 subtitle，history.vue:305 又把同一个 key 传给 EmptyState 的 description。页头眉标压在标题「反馈历史」（实测 y=128..148、w=84）上方，读起来像"这句提示是页面名的定语"。
- 建议改法：subtitle 换成页面用途描述（或直接不传，`v-if="subtitle"` 已支持留空），空态文案只在 EmptyState 出现一次。
- 修复类别：单页

### R6-L13-D10　P2 / 可达性　批次 R6-B54
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`4ee2a525c2f108b9`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:401`
- 理想图依据：无基准，依据=全站最小热区 88rpx（AppShell.vue:334 `min-height: 88rpx`，同页返回键即用它）+ 规范文档§1.4 间距节
- 现象：四个筛选 chip 的可点高度不足 88rpx。量法：选中态「全部」白底绿块实测 x=16..80 / y=164..198 ⇒ 65×35px（填充色取样 #2BC694 ≈ `--c-brand`）；未选中「反馈」实测 x=80..140 / y=166..196 ⇒ 61×31px（填充 #EFF0F0）。短边 31~35px = 62~70rpx，均 < 88rpx（44.4px）；高度只由 `padding: 12rpx 22rpx` + 26rpx 文字撑出，没有任何 min-height 兜底。本帧与 top 帧 sha16 逐字节相同（清单 sameAsTop=true、bytes 同为 37640，内容最低像素 y=359 < 视口 814 ⇒ 无滚动态可验），chip 在同一坐标，读数同样成立。
- 建议改法：`.filter-chip` 补 `min-height: 88rpx` 并把纵向 padding 提到 `--sp-4`（16rpx）以上，与同页 AppShell 返回键热区同档。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/album（3 条）

### R6-L12-D15　P1 / 素材缺失　批次 R6-B55
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`d8b9b2dbe7ddb782`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:472`
- 理想图依据：无基准页，依据=album.vue:5-6 自述职责「展示当前用户的照片墙（最多 6 张）」＋规范 §1.1 第 5 条（除头像/人物照片外的视觉元素不得当作内容素材）
- 现象：6 格里第 2、3 格不是一张照片，而是一枚品牌绿定位图标。实帧这两格内 #36C99A 像素成片（cell2 单格取样 1443 个，主色 #36c99a/#35c99a），字形 x=153..225 与 x=271..342、跨 y=106..206，正好落在 3 列网格的第 2、3 格（格宽实测 111px=222rpx：x=16..127 / 133..244 / 250..361）；同帧第 1 格是真人照片（彩色像素 2497 个，格心取样 #6F664F），形态完全不同。photoGallery 里存的是图标路径，被 :472 的 resolveMediaUrl 当照片原样渲染
- 建议改法：清掉当前用户 photoGallery 里的图标路径（换成真实人物照片或置空走 :482 的「＋」空位），并在上传/取数处加一道「非 assets/icons/ 前缀」校验，防止图标再被当照片入库
- 修复类别：需新建目标功能

### R6-L12-D16　P1 / 层级遮挡　批次 R6-B55
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`d8b9b2dbe7ddb782`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:577`
- 理想图依据：无基准页，依据=album.vue:575-577 注释自述的避让配方（「4 / 6 计数与微信胶囊叠压」为该文件自己点名的缺陷）＋同域 other.vue:468 已验证配方
- 现象：页头照片计数「n / 6」被微信原生胶囊整条压住。实帧胶囊暗像素 bbox x=298..357 / y=56..71（逐像素 max<180），而胶囊左侧安全区 x=236..297 内一条文字暗像素都没有（页头暗字只出现在 x=140..223＝标题「我的相册」）；计数确实渲染了——同帧「添加照片」按钮（album.vue:490 v-if="photoCount > 0 && hasEmptySlot"）与长按提示（:500 v-if="photoCount > 0"）都在画面上，⇒ photoCount>0 成立、:418 的计数节点必渲染，只是落在胶囊底下。根因是 :577 的 padding-right: calc(var(--capsule-right, 96px) + 24rpx)：--capsule-right 真值是胶囊右缘间隙≈7px（useMenuButtonRect.ts:21 FALLBACK_GAP=7），于是只预留 7+12=19px，计数右缘落到 x≈359，正压在 298..357 的胶囊下
- 建议改法：按同域已验证配方改成 padding-right: calc(var(--capsule-right, 7px) + 104px)（other.vue:468 原式），把计数挪到胶囊左缘之外
- 修复类别：单页

### R6-L12-D17　P2 / 可达性　批次 R6-B55
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`d8b9b2dbe7ddb782`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:585`
- 理想图依据：无基准页，依据=组件规范（本门 CLEAN 卡口径「热区≥88rpx」）＋album.vue:55 自述「navigationStyle: custom 无系统返回栏」⇒ 页内返回钮是唯一出口
- 现象：本帧与 top 帧逐字节相同（两文件 sha256 前 16 位同为 d8b9b2dbe7ddb782，滚动零变化），top 帧的热区尺寸问题在本帧原样成立。页头唯一返回钮实测近白圆 bbox x=17..49 / y=58..90＝32×32px＝64rpx，源码 .album-header__back width/height 各 64rpx（:585-586）⇒ 只有 88rpx 最小热区的 73%；该页 navigationStyle 自定义、无系统返回栏，且照片格本身是 tap 预览／longpress 菜单（:465-466），误触这枚小圆的代价是「进预览层」而非「退出」，返回路径最容易点空
- 建议改法：把 .album-header__back 的 width/height 提到 88rpx（视觉圆底可保持 64rpx，用 padding 撑热区），同域 other.vue:474-475 的返回钮一并同批处理
- 修复类别：CSS/token

## subpackages/profile-extra/profile/favorites（2 条）

### R6-L13-D01　P1 / 素材缺失　批次 R6-B56
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`361cd0b8ed70478a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:22`
- 理想图依据：无基准，依据=规范文档§1.6 第 3 条（裸 :src 一律包 resolveMediaUrl/SafeImage）+ 组件规范 EmptyState.vue:127（`.empty-icon` 空态必须带 120rpx 图标）；本页自绘空态卡片 `.favorites-empty__icon` 声明 80rpx 图标位（favorites.vue:144）
- 现象：空态卡（白卡实测 x=12..364 / y=117..285）里 80rpx 图标位**一个像素都没画**——量法：对 x=20..360、y=118..210（即卡顶内边距 80rpx 之后到"还没有收藏"标题 y=212 之前，正好是 80rpx=40.3px 图标位 + 16rpx 下边距）整块与 #FFFFFF 做色差，阈值 24，命中像素 n=0。图标位仍占位，于是可见文字（y=212..245，中心 228）落在卡中心（201）下方 27px，空态整体下坠。src 取 `IMAGE_PATHS.ICONS_EMOJI.BOOKMARK` = `/static/assets/icons/bookmark.svg`（images.ts:679，未过 resolveMediaUrl），该 SVG 第 2 行 `stroke="currentColor"`，`<image>` 无 CSS 颜色上下文 ⇒ 描边解析为空；且 real 包 `dist/build/mp-weixin-real/static/assets/icons/` 实测只剩 common/register/tabbar 三个子目录，根级 bookmark.svg 根本不在包内。
- 建议改法：本页空态改用 `EmptyState`（或把 :src 包 `resolveMediaUrl` 并换成 `ICONS_COMMON` 里有实体色的 PNG/common 目录 SVG），同时把 80rpx 图标位改成"图标缺失时不占位"以免空态文字下沉。
- 修复类别：单页

### R6-L13-D02　P2 / 可达性　批次 R6-B56
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`361cd0b8ed70478a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:24`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:103-112（空态自带 actionText 操作按钮位）+ 本页空态副标题自述的跳转目标
- 现象：空态只给两行文字、**没有任何操作入口**——量法：卡内 y=246..284（副标题下沿到卡底）与 #FFFFFF 色差阈值 24 命中 n=0，整卡可见内容仅 y=212..245 两行文字（bbox x=79..299），画面 0 个按钮/可点热区；而副标题逐字写「在帖子页点收藏，喜欢的帖子会出现在这里」，用户被指去另一个页面却没有任何入口，只能自己返回再找。本帧为"滚动到底"取景，但与 top 帧 sha16 逐字节相同（清单 sameAsTop=true、bytes 同为 23898），实测内容最低像素在 y=285 < 视口 814 ⇒ 页面本就无可滚内容，底部态未被验证（此项按量法记录，不另计缺陷）。
- 建议改法：空态补一个 actionText 主按钮（"去帖子页"/"去社区"）并 navigateTo 到社区页，复用 EmptyState 的 hasAction 分支而不是自绘卡片。
- 修复类别：单页

## subpackages/profile-extra/profile/location（4 条）

### R6-L12-D07　P1 / 空态文案　批次 R6-B57
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`d958396c4f8aca07`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:50`
- 理想图依据：无基准页，依据=规范文档 §3 该页说明（全站设计规范与逐页设计稿说明.md:144 表行 19「我的位置页」）＋ location.vue:8-10 自述的四行结构（当前位置／经纬度／所属校区／物理地址）
- 现象：卡片主值位被一句技术诊断语占据，其余三行整体塌陷。实帧白卡 y=112..188（仅 77px=154rpx 高，逐行 near-#FFFFFF 计数 >50% 才判定），卡内只有「当前位置」标签＋粗体「地址解析不可用」；坐标行（location.vue:167 v-if="coords"）、校区行（:170 v-if="campusName"）、物理地址行（:175 v-if="addressText"）三行一条像素都没有。该文案是 utils/location.ts:23 的 DEFAULT_LOCATION_TEXT / zh-CN.ts:1749「地址解析不可用」，是给工程师看的失败原因，不是给用户看的空态指引（页面没有说明「为什么不可用／怎么恢复」，只有下方一颗「重新定位」钮）
- 建议改法：主值位换成可行动空态（例：「还没拿到定位，点下方『重新定位』或『地图选点』手动选位置」），把「地址解析不可用」降级为次级说明或 toast；坐标行在拿不到时给「—」占位而不是整行消失
- 修复类别：单页

### R6-L12-D08　P1 / 可达性　批次 R6-B25
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`d958396c4f8aca07`）
- 源码证据：`apps/client/src/manifest.json:42`
- 理想图依据：无基准页，依据=location.vue:8-10 需求自述「支持在地图上选点修改位置」＋规范 §3 表行 19 该页职责
- 现象：画面右下的绿色「地图选点」胶囊（实帧 x=286..361 / y=430..459）是死入口。location.vue:104 真实调用 uni.chooseLocation，而 manifest.json:42 只声明 `"requiredPrivateInfos": ["getLocation"]`，chooseLocation 未登记 ⇒ 微信侧该接口按 app.json 声明放行，未声明直接 fail（同文件 :33-35 注释已自证这条规则：「真机要求声明，否则 getLocation 直接 fail（开发者工具不校验，真机必现）」）⇒ 本页唯一「手动改位置」路径不可达，用户只剩「重新定位」一条路
- 建议改法：requiredPrivateInfos 追加 "chooseLocation"（与 scope.userLocation 同处声明），并在 pickFromMap 的 catch 分支把失败原因区分于「用户取消」
- 修复类别：单页

### R6-L12-D09　P2 / 可达性　批次 R6-B57
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`d958396c4f8aca07`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:404`
- 理想图依据：无基准页，依据=组件规范（本门 CLEAN 卡口径「热区≥88rpx」）＋规范 §1.4 间距档（--sp 最小档 4rpx，触控档无 60rpx）
- 现象：本帧与 top 帧逐字节相同（我实测两文件 sha256 前 16 位同为 d958396c4f8aca07，滚动后零像素变化＝页面内容不超视口，末行按钮底边 y=578／帧高 814），因此 top 帧的可点尺寸问题在本帧同样成立：「地图选点」胶囊实测高 30px=60rpx（x=286..361 / y=430..459，宽 76px=152rpx），源码 height:64rpx 与实测差 4rpx 为抗锯齿；60~64rpx 明显低于 88rpx（44px）最小热区口径，是本页全部可点元素里唯一够不到标准的一颗（同页「重新定位」实测 49px=98rpx、「返回首页」实测 47px=94rpx 均达标）
- 建议改法：.location-map__pick 的 height 从 64rpx 提到 88rpx（或保留视觉高度、用 padding/::after 把热区撑到 88rpx），与同页两颗主按钮同档
- 修复类别：CSS/token

### R6-L12-D10　P2 / 字号　批次 R6-B57
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`985e46b5b349e092`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:252`
- 理想图依据：无基准页，依据=规范文档 §1.3 字体层级表（页面主标题 26–28px／标题 --fs-3xl/4xl 18/20px）＋ §1.1 第 3 条「一令牌一值，页面只准 var(--*)」
- 现象：页头「我的位置」字形实测 x=155..223 / y=64..79（4 字宽 69px ⇒ 17.3px/字，高 16px）＝源码硬编码 font-size:36rpx，未取任何 --fs-* 令牌；同 subpackages/profile-extra 域另两页页头各自为政：相册「我的相册」字形 x=140..223（21px/字）＝--fs-5xl 44rpx，隐私「隐私权限设置」＝--fs-xl 30rpx。同域三页页标题 44 / 36 / 30rpx 三档，且本档不在 §1.3 字阶里（36rpx 是 --fs-3xl 的值，被裸写）
- 建议改法：三页页头标题收敛到同一令牌（建议 var(--fs-4xl) 档），location.vue:252 的裸 36rpx 一并替换
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（6 条）

### R6-L12-D01　P1 / 素材缺失　批次 R6-B20
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`09c7cd9348583e37`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:58`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡右上「喜欢」「打招呼」两枚胶囊——实测理想图该胶囊 tint 框 x=817..914 / y=324..361，胶囊内为「爱心图标＋文字」「气泡图标＋文字」
- 现象：两枚胶囊的图标位是空的。实帧「喜欢」胶囊 tint 实测 x=286..342（114rpx×54rpx，与 CSS height:56rpx 吻合），胶囊内着色像素只有 x=312..333（22px＝「喜欢」两字），左侧 14px 图标槽 x=296..311 相对底色最大偏离 27/255（＝纯底，无绘制）；「打招呼」胶囊 tint x=276..345、着色仅 x=301..334（33px＝三字），图标槽同样为空。两处 src 都是 IMAGE_PATHS.ICONS_V2.*（v2/heart-pink.png、v2/chat-green.png）
- 建议改法：ICONS_V2 组基址落在 cdn-buckets.json 的 cdnPrefixes（static/assets/icons/v2/）里，而 config/images.ts:97 的 assetDir('assets/icons') 只按目录基址判定 ⇒ 运行时仍出 /static 路径、出包后无该文件；把 v2/ 登记进 IN_PACKAGE_ASSETS 或让 assetDir 按子目录前缀比对（同域底栏 ICONS_EMOJI.* 实测可正常渲染，见 R6-L12-D05 帧）
- 修复类别：CSS/token

### R6-L12-D02　P1 / 空态文案　批次 R6-B20
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`09c7cd9348583e37`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:81`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡右侧三行（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3.9「右侧三行（姓名+♀+在线胶囊 / 年龄学校城市 / 距离在线）」）
- 现象：三行只剩一行，且那一行是占位语。实帧姓名「小新生」字形 x=37..103 / y=362..380，其右侧 x=105..285 × y=350..392 内 #E8FBF3（在线胶囊底）像素＝0、x=385..470 亦＝0（未换行渲染），#FF6B81/#54A0FF 容差 30 内的性别徽章像素＝0；meta 行显示「资料暂未完善」（y=466 一行，色 #9AA39F＝规范 §1.2 的「占位 placeholder」档），距离行 v-if 整行不渲染 ⇒ 身份卡白卡 y=286..486（402rpx）里右半区空了一半
- 建议改法：缺字段时不要落回「资料暂未完善」这种自证残缺的占位语——按 §3.9 三行结构给可核对的兜底（至少出在线态与校区），并把 --empty 的字色从 --c-text-quaternary 提到 --c-text-tertiary（占位色不该承载正文）
- 修复类别：单页

### R6-L12-D03　P2 / 间距　批次 R6-B18
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`09c7cd9348583e37`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicCommon.vue:107`
- 理想图依据：素材/理想效果图/他人显示主页.png 全页卡片左右缘同一条竖线；规范 §1.4 页边距 --page-padding = 32rpx
- 现象：同一页四张卡四种左外边距。逐行取白卡左缘（sharp 逐像素找 #FFFFFF 起点）：身份卡 @y=400 → x=21..357（左 42rpx／右 40rpx）、签名卡 @y=530 → x=14..364（28rpx）、兴趣卡 @y=600 → x=13..365（26rpx）、共同点卡 @y=680 → x=13..365（24rpx）。最大 42rpx、最小 24rpx，跨 18rpx，且没有一档等于规范 32rpx
- 建议改法：五个 Public* 卡片的 margin 横向值统一换成 var(--page-padding)（PublicIdentity.vue:93 的 40rpx 与其余 24rpx 一并收敛），只留纵向 margin-top 差异
- 修复类别：CSS/token

### R6-L12-D04　P3 / 颜色token　批次 R6-B20
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`8ea48f02362a00d9`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:208`
- 理想图依据：素材/理想效果图/他人显示主页.png「喜欢」胶囊底取样 #FFECEF（理想图 x=817..914 / y=324..361 逐像素命中 2385 个）；规范 §1.2 浪漫粉底 romance-50 = #FFECEF
- 现象：「喜欢」胶囊底实渲 #FCE4EC（帧内 x=286..342 区域取样，n=1114 像素，与理想图 #FFECEF 差 Δ(3,8,3)）——用的是通用 Material 粉 --c-tint-pink-50，不是品牌浪漫粉底；同页底栏「喜欢」钮（RelationshipCTA.vue:105）取同一 token，两处一起偏离理想图取样值
- 建议改法：把 --c-tint-pink-50 的取值改为 romance-50 #FFECEF（或这两处直接引 var(--c-romance-50) 档底），保持「一令牌一值」
- 修复类别：CSS/token

### R6-L12-D05　P1 / 可达性　批次 R6-B58
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`8ea48f02362a00d9`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:451`
- 理想图依据：素材/理想效果图/他人显示主页.png 左上返回、右上「···」为常驻入口（规范 §3.9「全屏头图＋左上返回/右上更多」）
- 现象：滚到底之后本页没有任何返回入口。top 帧左上返回钮（半透明白圆，亮于头图的像素实测 x=20..45 / y=64..77）在 bottom 帧同一区域 x=8..60 × y=46..105 内暗像素＝0、亮像素也无（bottom 帧 x=5..70 × y=30..110 只剩 y=20..45 的 219 个系统状态栏「22:55」字点）；.other-header 是 position:absolute（other.vue:451-452）随页滚走，而本页可滚（top/bottom 两帧 sha16 不同、姓名字形从 y=362 移到 y≈35 ⇒ 实际滚动 ≈320px）⇒ 右上「···」（举报/拉黑/关注唯一入口）与返回钮一并离屏，只剩微信原生胶囊
- 建议改法：把 .other-header 改 position:fixed（沿用 --statusbar/--capsule-right 避让配方，同域 messages/index.vue .header 口径），或在 ProfileShell 里挂常驻吸顶条
- 修复类别：单页

### R6-L12-D06　P1 / 素材缺失　批次 R6-B19
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`d958396c4f8aca07`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:40`
- 理想图依据：素材/理想效果图/他人显示主页.png「生活瞬间」为 4 张真实照片方格；规范 §3.9 逐字「生活瞬间（4 列正方形网格，无占位）」
- 现象：4 格全是灰骨架。实帧灰底 #EEF2F0（＝--c-line 分隔线 token 当填充用）实测四格 x=27..102 / 110..185 / 193..268 / 276..352，各 76×75px（152×150rpx），格内只有「暂无照片」灰字（格心 x=47..52 / y=481..484 一组 ≤175 暗点，整格着色像素几乎为 0）；理想图同区是 4 张彩色照片（理想图该带彩色像素成片）。userId=100159 的 media.photos 为空 ⇒ 组件恒定渲染 4 格占位（PublicGallery.vue:10-13 自述「骨架 ≠ 假数据」），规范要的「无占位」拿不到满足条件
- 建议改法：给演示用户补 4 张真实照片素材（app-assets assets/images/people 档）并让 photos 不足 4 张时按实际张数铺满等宽，而不是把缺料摊成灰格
- 修复类别：需新建目标功能

## subpackages/profile-extra/profile/privacy（4 条）

### R6-L12-D11　P2 / 间距　批次 R6-B59
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`985e46b5b349e092`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:154`
- 理想图依据：无基准页，依据=规范文档 §1.4「页边距 --page-padding = 32rpx = 16px」＋同域 location 页实测对照
- 现象：开关卡几乎贴屏幕边。实帧白卡 x=9..369（逐像素 near-#FFFFFF 判定，帧宽 378）⇒ 左外边距 9px=18rpx、右 8px=16rpx；源码 margin: var(--sp-5) var(--sp-4) 而 --sp-4 实测值 16rpx（design-variables.scss:550）。同域对照：location 页卡左缘实测 x=17 → 34rpx、album 页卡左缘 x=16 → 32rpx，均落在规范 32rpx 档，只有本页是它的一半
- 建议改法：.privacy-page__section 的横向 margin 换成 var(--page-padding)（32rpx），纵向保留 --sp-5
- 修复类别：CSS/token

### R6-L12-D12　P2 / 字号　批次 R6-B59
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`985e46b5b349e092`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:182`
- 理想图依据：无基准页，依据=规范文档 §1.3 字体层级表（正文/列表主文字 --fs-xl/2xl = 15/16px；辅助 --fs-lg/xl = 14/15px；--fs-base 12px 属「小字·标签/时间戳」档、--fs-xs 10px 属「极小·角标/法务」档）
- 现象：设置行主文字落在「标签」档。实帧首行标题「允许将我推荐给本校学生」字形带 y=112..122（高 11px）、x=19..145（11 字 126px ⇒ 11.5px/字）＝--fs-base 24rpx=12px；其下说明行字形带 y=131..139（高 9px）、x=19..181（18 字 163px ⇒ 9px/字）＝--fs-xs 20rpx=10px（源码 :188 写作 var(--fs-xs, 24rpx)，兜底注释 24rpx 与令牌真值 20rpx 不符，实际渲的是真值）。列表行主文字规范要求 30/32rpx 档，本页两行各低 6~8rpx
- 建议改法：行标题换 var(--fs-xl)（30rpx）、行说明换 var(--fs-lg)（28rpx），并修掉 :188 的 24rpx 假兜底
- 修复类别：CSS/token

### R6-L12-D13　P3 / 颜色token　批次 R6-B59
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`985e46b5b349e092`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:134`
- 理想图依据：无基准页，依据=组件规范（src/components/common/ 反色控件在彩色头上的最低可辨档）＋同域 other.vue:479 同一控件用 --c-overlay-bg-light(0.2)
- 现象：本帧与 top 帧逐字节相同（两文件 sha256 前 16 位同为 985e46b5b349e092，滚动零变化），top 帧的颜色问题在本帧同样在画面上。返回钮圆底实渲 #4ACFA4，其外头图底 #3ACA9C（沿 y=68 逐像素：x=2..8=#3ACA9C、x=9..41=#4ACFA4、x=41..=#3DCC9D）⇒ Δ(16,5,8)，圆底几乎看不出来；源码写 var(--c-overlay-white-bg-tint, rgba(255,255,255,0.2))，而该令牌真值是 rgba(255,255,255,0.08)（design-variables.scss:902），0.2 兜底永不生效，2.5 倍的浓度差把「可点圆钮」压成了脏印
- 建议改法：该处改引 other.vue:479 同款的 --c-overlay-bg-light（0.2 档），或把 --c-overlay-white-bg-tint 提到 0.16 以上，别留假兜底
- 修复类别：CSS/token

### R6-L12-D14　P2 / 需新建　批次 R6-B59
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`d8b9b2dbe7ddb782`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:108`
- 理想图依据：无基准页，依据=规范文档 §3 该页说明缺失（表内无「隐私权限设置」行）＋locale 已写好的页头副标题 profile.privacyPermissionDesc（zh-CN.ts:1732「控制你的信息展示范围」）
- 现象：页面只搭了半截。实帧白卡底边 y=204，其下 y=205..814 全是 #EEF7F2 纯空底（610px＝视口 75%，逐行 near-#FFFFFF 计数归零点即卡底）；页头只有标题「隐私权限设置」一行，locale 里配好的副标题「控制你的信息展示范围」在本页无消费方（全库 grep privacyPermissionDesc 只命中 tools/security/index.vue:633 的 security.* 命名空间），底部 privacy-page__footer-space 仅 120rpx 空 div，不承担内容
- 建议改法：先渲染已有的 privacyPermissionDesc 副标题补住页头信息层，再按「隐私权限设置」职责补齐其余开关（谁可以看我的动态／黑名单／隐身）——这三项当前既无 UI 也无 store 字段，属需新建
- 修复类别：需新建目标功能

## subpackages/profile-extra/profile/tasks（2 条）

### R6-L13-D03　P1 / 素材缺失　批次 R6-B60
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`9f1a6b0cad8a29f9`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:416`
- 理想图依据：无基准，依据=规范文档§1.6 第 3 条 + 本页自述结构注释 tasks.vue:14「任务列表（已完成显示勾选态…）」要求每条任务带图标
- 现象：4 张任务卡左侧的 72rpx 图标位**全部空白**。量法：逐格取图标方块内区（色差参照实测底色 #E8FBF2，即 `--c-bg-brand`）——卡1 x=34..66/y=184..218、卡2 y=254..288、卡3 y=324..358、卡4 y=394..429，四块内区与底色最大色差均为 40（仅圆角边缘抗锯齿），无任何字形像素；方块外框实测 33×36 px ≈ 66×72rpx 与 CSS 一致，说明是"素材没画出来"而不是尺寸塌成 0。src 走裸常量 `taskIcon()`（未过 resolveMediaUrl），real 档 4 条任务实际取到 `/static/assets/icons/sparkles.svg`、`/static/assets/icons/heart.svg` 两枚根级 SVG，文件第 2 行均为 `stroke="currentColor"` ⇒ `<image>` 下描边为空。
- 建议改法：`taskIcon()` 返回值统一过 `resolveMediaUrl`，并把这两枚 currentColor 根级 SVG 换成 common/ 目录里带实体描边（#94A3B8）的同语义素材。
- 修复类别：单页

### R6-L13-D05　P2 / 可达性　批次 R6-B60
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`5161c42b4ace5fa7`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:471`
- 理想图依据：无基准，依据=全站最小热区 88rpx（AppShell.vue:334 `min-height: 88rpx` 及其 iOS HIG 注释）
- 现象：页头返回键热区只有 64rpx。量法：白圆 bbox 实测 x=14..50 / y=84..116（参照页底色 #EDF7F2，色差阈值 20）⇒ 37×33 px = 73×66rpx，短边 66rpx < 88rpx 全站最小热区；圆内字形实测 x=25..31 / y=64..73 仅 7×10 px（common/back.png 正常渲染，说明是按钮做小了而不是素材缺失）。本帧与 top 帧 sha16 相同（清单 sameAsTop=true），返回键在同一坐标，读数同样成立。
- 建议改法：`.tasks-header__back` 的 width/height 提到 88rpx（或补 min-width/min-height: 88rpx），与 AppShell 返回键同档。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/visitors（2 条）

### R6-L11-D08　P2 / 尺寸比例　批次 R6-B64
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`1d3b3038659c327a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:599`
- 理想图依据：无基准，依据=组件规范 ProfileEmptyState（空态应含插图/图标 + 文案 + 可选操作）
- 现象：`.real-name-page` 设 `min-height:100%` + 渐变底（:599-600），但已认证态只有状态卡(margin:24rpx，高约 260rpx)+信息卡(约 150rpx) 两卡贴顶，合计约占 1280rpx 视口的 ~30%，下方约 70% 为纯渐变空白、无底部锚定内容；本帧与 top 帧逐字节相同（sha16 一致），证实页面根本无第二屏内容可滚。
- 建议改法：与 D07 合并——补底部操作/引导区（去校园认证按钮 + 说明），消除大片空白；若确为终态则移除 min-height:100% 让页面按内容收高。
- 修复类别：单页

### R6-L11-D09　P1 / 需新建　批次 R6-B61
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`1d3b3038659c327a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:279`
- 理想图依据：无基准，依据=组件规范 ProfileEmptyState（空态文案应配对应动作入口）
- 现象：空状态卡 `.visitors-empty__icon` 预留 120rpx×120rpx（:458-461），但其 src=`ICONS_SOCIAL.VISITOR`=`assets/icons/social/visitor.svg`（:279），`social/` 目录盘上不存在⇒图标空白，标题「暂无访客记录」上方留下 120rpx 空档。
- 建议改法：新建 `assets/icons/social/visitor.svg`（或改指已存在的 common/ 图标），使空态图标可见。
- 修复类别：需新建目标功能

## subpackages/profile-extra/settings/dnd（2 条）

### R6-L13-D06　P2 / 文案　批次 R6-B62
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`5161c42b4ace5fa7`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:472`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（分组标签 --fs-base 12px / 行标题 --fs-lg 14px 各司其职）+ 同页其余三组的写法（dnd.vue:361/389/424 分组标签分别是"开启免打扰/免打扰时段/重复方式"，与组内行标题不重复）
- 现象：「紧急消息仍会通知，避免错过重要信息」整句在一屏内**逐字出现两次**：一次当分组标签（dnd.vue:472 `t("dnd.tip")` → 实测墨迹 y=672..684、x=51..242、w=192、h=13），一次当开关行标题（dnd.vue:477 同一个 key `t("dnd.tip")` → 实测墨迹 y=726..738、x=20..216、w=197、h=13）。两行宽度差 5px 仅由抗锯齿造成，字符数同为 17 ⇒ 同一串。分组标签位本该写分组名（对照同页"免打扰时段""重复方式"），现在把提示语当分组名，读起来像同一项被列了两遍。
- 建议改法：分组标签改用独立短词（如 dnd.urgentGroup「紧急消息」），行标题保留 dnd.tip 原句，两处不再共用一个 key。
- 修复类别：单页

### R6-L13-D08　P1 / 层级遮挡　批次 R6-B62
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`4ee2a525c2f108b9`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:532`
- 理想图依据：无基准，依据=规范文档§1.4（导航/吸顶行为）+ 同页 R1 修复注释 dnd.vue:317-319（已承认"navigationStyle=custom 下页面从 y=0 渲染"），custom 导航页滚动后必须保住返回入口与状态栏净空
- 现象：滚到底后自绘导航栏整条出画、首行开关被系统胶囊压住。量法：①顶帧导航栏返回键字形墨迹 x=25..31/y=65..74、标题"免打扰"墨迹 x=166..212/y=61..73；底帧同两区已无该字形，取而代之的是卡片正文（"开启免打扰"标签墨迹 y=27..38、描述 y=48..59）⇒ 内容整体上移约 116px（顶帧标签 y=143..155 → 底帧 y=27..38），导航栏（88rpx=44px，`position: relative` 未吸顶）已完全滚出视口，滚动态 0 返回入口。②系统胶囊底帧实测深色墨迹 x=298..357/y=46..71（顶帧同判据为 x=298..357/y=56..71，仅胶囊自身），底帧多出的 y=46..55 十行墨迹落在 x≥298（描述文字只到 x=257，不可能伸进来）⇒ 正是开关（顶帧 y≈143..175，减去 116px 位移 = 底帧 y≈27..59）的下半截伸进了胶囊带 y=49..79，开关右下约 42×10px 被胶囊盖住。
- 建议改法：`.nav-bar` 改 `position: sticky; top: 0; z-index: 100`（并给 `.safe-top` 之后留等高占位），或把整页内容装进带顶部内缩的 scroll-view，使开关行永远不与胶囊同带。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/index（2 条）

### R6-L11-D01　P1 / 需新建　批次 R6-B23
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`301c8133d5c861b6`）
- 源码证据：`apps/client/src/config/images.ts:658`
- 理想图依据：无基准，依据=全站设计规范§1.4 图标底座 + 组件规范（菜单行应「彩色圆底+居中图标」）
- 现象：「推荐给好友 / 我的动态 / 访客记录」三行左侧 64rpx 彩色圆底内无任何图标（空白），其 src 分别指向 `assets/icons/social/share.svg`、`social/heart-signal.svg`、`social/visitor.svg`，而 `apps/client/src/static/assets/icons/` 下只有 `common/ register/ tabbar/` 三个子目录，`social/` 目录盘上根本不存在。
- 建议改法：在 `static/assets/icons/social/` 下新建 share/heart-signal/visitor 三枚 SVG（或改指已存在的 common/ 图标），并同步登记该目录进 cdn-buckets.json。
- 修复类别：需新建目标功能

### R6-L11-D02　P1 / 需新建　批次 R6-B23
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`08bd55e4c6089d42`）
- 源码证据：`apps/client/src/config/images.ts:647`
- 理想图依据：无基准，依据=全站设计规范§1.4 图标底座 + 组件规范
- 现象：「关于」分组内「用户协议 / 隐私政策」两行图标空白，其 src 复用 `ICONS_PROFILE.POSTS`=`assets/icons/social/heart-signal.svg`、`ICONS_PROFILE.VISITORS`=`assets/icons/social/visitor.svg`，同属盘上不存在的 `social/` 目录；同行「检查更新 / 关于我们」用 common/ 图标则正常显示，佐证差异只在 social/ 缺失。
- 建议改法：与 D01 同源——新建 `assets/icons/social/` 图标或把用户协议/隐私政策改指已存在的 common/ 图标。
- 修复类别：需新建目标功能

## subpackages/profile-extra/verification/index（2 条）

### R6-L11-D03　P1 / 素材缺失　批次 R6-B23
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`f1a77efd7d598aef`）
- 源码证据：`apps/client/src/config/images.ts:680`
- 理想图依据：无基准，依据=全站设计规范§1.4 卡片圆角/图标底座 + cdn-buckets.json 分桶契约
- 现象：「认证权益」5 张卡中「专属权益」「互动资格」两卡左上 64rpx 蓝色底座内图标空白，而「专属标识/信任优先/匹配加权」（common/pin、check-circle、trend-up）正常显示。空白两枚 src=`assets/icons/gift.svg`(GIFT)、`assets/icons/chat.svg`(CHAT)，文件盘上确实存在，但 `assets/icons/` 根目录未登记进 cdn-buckets.json（cdnPrefixes 只列 home/match/v2/emoji/login/social/nearby 子目录，localPrefixes 只列 tabbar/register/common），real 档 cdnize 前缀比对落在目录基址⇒不命中任何桶⇒运行时保留 `/static/assets/icons/gift.svg` 包内路径而构建期 prepare-static 未随包⇒404 空白。
- 建议改法：把 `static/assets/icons/`（根）补登进 cdn-buckets.json 的 localPrefixes（或把 gift.svg/chat.svg 移入已登记的 common/ 并改 images.ts:678/680 引用）。
- 修复类别：CSS/token

### R6-L11-D04　P2 / 颜色token　批次 R6-B63
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`95f38346b8f83416`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:935`
- 理想图依据：无基准，依据=全站设计规范§1.2 文本色 + 组件规范（表单 label/placeholder 一致、上传区含图标）
- 现象：`.benefit-item__icon` 背景写成 `linear-gradient(135deg, var(--c-tint-blue-50) 0%, var(--c-tint-blue-50) 100%)`——两个色标为同一令牌，渐变退化为纯色平铺，5 个图标底座实际无 135° 渐变（应为双色渐变）。
- 建议改法：第二色标改为另一浅底令牌（如 `--c-tint-blue-soft`）或直接写成 `background: var(--c-tint-blue-50)`，去除无效渐变。
- 修复类别：CSS/token

## subpackages/profile-extra/verification/real-name（2 条）

### R6-L11-D06　P3 / 文案　批次 R6-B24
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`7e22e1a5e52be7a6`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3418`
- 理想图依据：无基准，依据=全站设计规范§1.4 卡片 + 组件规范（状态卡文案应配可点入口）
- 现象：「填写认证信息」首行 label 为「学生姓名」(labelStudentName :3417)，同一行 placeholder 却写「请输入真实姓名」(placeholderStudentName :3418)，同字段两处称谓不一致（学生姓名 vs 真实姓名）。
- 建议改法：把 placeholderStudentName 改为「请输入学生姓名」，与 labelStudentName 对齐。
- 修复类别：单页

### R6-L11-D07　P1 / 可达性　批次 R6-B64
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`7e22e1a5e52be7a6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:443`
- 理想图依据：无基准，依据=全站设计规范§1.4 页边距/卡片 + 组件规范（内容应铺满或底部锚定）
- 现象：已实名认证态（status==='verified'）模板 :443-457 只渲染状态卡 + 脱敏信息卡，无任何操作按钮；而状态描述文案（:434 绑定 statusVerifiedDesc）明示「可进行校园认证（学历认证）」，页面却无通往校园/学历认证的入口，用户只能返回上级页——文案承诺的动作在页内不可达。
- 建议改法：在 verified 分支信息卡下补一枚「去校园认证」按钮，navigateTo 到 verification/index（或对应校园认证路由）。
- 修复类别：单页

## subpackages/setup/campus/index（5 条）

### R6-L14-D13　P2 / 位置　批次 R6-B13
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`fd10af0a3de78bef`，自同段前条继承）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:216`
- 理想图依据：无基准，依据=规范文档§3 页头层级（标题在上、说明在下）+ 组件规范 components/layout/AppShell.vue
- 现象：说明文字压在标题之上：实测小字「认证后解锁同校专属匹配与校友圈子」墨迹 y108-118（h=11px≈22rpx，对应 359 行 --fs-base 24rpx 的 shell__eyebrow），大字「校园认证」墨迹 y128-148（h=21px≈42rpx）⇒ 说明在上、标题在下，层级倒置。216 行 subtitle 排在 217 行 title 之前，且 campus/index.vue:217 把描述性副标题喂给了 eyebrow 槽位；同页 12 行注释还写着「移除被状态栏截断的副标题」，实际仍在渲染。
- 建议改法：AppShell 内把 subtitle 移到 title 之后（或新增独立 eyebrow 槽位），校园页按语义传参：eyebrow 传「XUNMI · CAMPUS」类标签、subtitle 传描述。
- 修复类别：单页

### R6-L14-D14　P2 / 可达性　批次 R6-B65
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`fd10af0a3de78bef`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:327`
- 理想图依据：无基准，依据=规范文档§3 最小热区 88rpx
- 现象：「学校资料」右侧隐私说明「?」按钮热区过小：CSS 声明 40rpx×40rpx（327-328 行，=20×20px），实测墨迹框 x125-150 / y206-238（26×32px≈52×64rpx），两种口径都低于 88rpx 最小可点热区，且它是本页唯一的信息披露入口。
- 建议改法：给 .card-header__help 加 padding 或外层包一个 88rpx 的 role=button 容器，视觉尺寸不变、热区放大。
- 修复类别：单页

### R6-L14-D15　P2 / 颜色token　批次 R6-B03
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`4d92902f0e050e07`）
- 源码证据：`apps/client/src/components/common/BottomActionBar.vue:85`
- 理想图依据：无基准，依据=规范文档§3 主按钮禁用态（灰底灰字须可读）
- 现象：禁用主按钮的 token 没落到画面上：85-86 行声明 background:var(--c-neutral-200)（=$neutral-200 #DDE3E0）、color:var(--c-text-tertiary)（#6B7571），实测按钮底整片为 #F7F7F7（x=90 与 x=300 两列 y678-719 连续同值）、文字最深像素 #A6A6A6 ⇒ 微信原生 `<button :disabled>` UA 样式覆盖了 scoped 声明（41 行同时给了 disabled 属性），文字对比度按实测值算 2.27:1（<4.5:1）。
- 建议改法：禁用态不要用原生 disabled 属性（保留 aria-disabled + 逻辑拦截），或给 .bar__primary--disabled 补 `button.bar__primary[disabled]` 选择器与 !important 级别的兜底，使实测底色回到 #DDE3E0。
- 修复类别：CSS/token

### R6-L14-D16　P2 / 可达性　批次 R6-B65
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`4d92902f0e050e07`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:217`
- 理想图依据：无基准，依据=规范文档§3 长表单需可滚到底
- 现象：bottom 帧与 top 帧逐像素全等：378×814=307,692 个像素按 RGB 差>30 统计得 diff=0（两帧仅字节数 71378 vs 71310、hash 不同，画面零差异）⇒ 「bottom」这一状态没有提供任何新证据，页面滚动是否可达、picker 弹层是否被 217 行 AppShell 的内容容器裁切，均未证。本帧可见内容底边（主按钮 y719）距屏 814 尚有 95px，一屏可尽，但取景器仍报 scrollContentMeasurable=true，说明滚动指令与页面容器不匹配。
- 建议改法：该页 bottom 态改为「点开城市 picker 后取景」这类有内容的状态；或在 AppShell 内容区明确滚动容器并让 pageScrollTo 可驱动，再复测两帧 hash 必须不同。
- 修复类别：单页

### R6-L14-D17　P3 / 颜色token　批次 R6-B65
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`4d92902f0e050e07`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:426`
- 理想图依据：无基准，依据=theme/design-variables.scss 已有 --c-bg-container #FFFFFF / --c-bg-page #EEF7F2 两档
- 现象：页面底色写成裸字面量 `page { background: #ffffff }`（426 行，注释称 R16 为对齐理想图），而同页 363 行字段底色用 var(--c-bg-page) #EEF7F2、334 行「?」按钮底色也用 var(--c-bg-page) ⇒ 实测白底 #FFFFFF 与薄荷字段 #F3FAF6/#EEF7F2 混排，页面底色这一档没有 token 承载，跨页（setup/profile 的 --c-bg-page 底）也不同源。
- 建议改法：`page` 背景改 var(--c-bg-container)，并把「白底 vs 薄荷底」的选择写进规范文档单一来源，避免逐页字面量。
- 修复类别：CSS/token

## subpackages/setup/interest/index（8 条）

### R6-L15-D18　P1 / 可达性　批次 R6-B21
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`2533716c30da7b8d`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:313`
- 理想图依据：无基准，依据=规范文档 §1.3（--fs-xs 10px 仅限角标·法务）+ 仓内热区标准 AppShell.vue:333-335
- 现象：空态提示"暂未选择任何标签"实测墨迹 y=195..205（高 10px=20rpx，即 --fs-xs），且它坐在 --c-bg-secondary #D1F5E7 的已选区里：实测该行最深字素 (61,201)=#949B98，对底对比度 2.42:1（按令牌 #9AA39F/#D1F5E7 算 2.21:1），远低于 4.5:1；同区上一行"已选标签"最深 #474E4A 为 7.30:1，说明只有这句最关键的引导看不见。
- 建议改法：`.tag-selector__empty-text` 字号升 `var(--fs-base)`(24rpx) 并把颜色从 --c-text-quaternary 提到 --c-text-secondary(#4A524E)。
- 修复类别：CSS/token

### R6-L15-D19　P1 / 可达性　批次 R6-B21
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`2533716c30da7b8d`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:353`
- 理想图依据：无基准，依据=仓内热区标准 AppShell.vue:333-335「min-height/min-width ≥88rpx(44px)」
- 现象：兴趣标签 chip 是本页唯一交互物，实测第一行 chip 上下描边行 y=245 与 y=264 ⇒ 高 20px=40rpx（padding 只有 --sp-1=4rpx 上下），仅 88rpx 标准的一半；10 个标签全在这个高度里点选，行间距也只有 8px（y=265..268 无墨）。
- 建议改法：`.tag-chip` 加 `min-height: 88rpx` 并把垂直 padding 提到 --sp-3，或保持视觉小 pill 但用伪元素扩热区。
- 修复类别：单页

### R6-L15-D20　P2 / 颜色token　批次 R6-B21
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`2533716c30da7b8d`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:355`
- 理想图依据：无基准，依据=规范文档 §1.2「输入底/浅底块 --c-bg-surface #F3FAF6，页面底色 --c-bg-page #EEF7F2」
- 现象：`.tag-chip` 底色写 `var(--c-bg-page)`，实测 chip 内部 y=272 处 x=21/25/30/40/55/70 全为 #EEF7F2，与同一条上 chip 外的页面底 x=5/8/12 的 #EEF7F2 逐字同值 ⇒ 未选中标签"没有底"，只靠 1rpx 描边（实测描边像素 #E4EBE8，与底差 10/12/10，约 1.1:1）勉强勾出轮廓。
- 建议改法：chip 底色改 `var(--c-bg-container)`(#FFFFFF) 或 `--c-bg-surface`，描边用 --c-border-default。
- 修复类别：CSS/token

### R6-L15-D21　P2 / 颜色token　批次 R6-B66
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`2533716c30da7b8d`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:178`
- 理想图依据：无基准，依据=规范文档 §1.2「主色 --c-brand #36C99A」+ §1.1.3「一令牌一值，禁止私有色值」
- 现象：「完成选择」主按钮写死 `linear-gradient(135deg,#36C99A 0%,#36C99A 100%)`（两端同值=纯色），实测整条 y=324..327 x=17..362 恒为 #36C99A；而同为注册流程的 schedule 页「保存并进入应用」与 recommend-pref 页「保存」用 `--c-gradient-brand`(#36C99A→#55D5A7)，实测同一 x=189 处为 #44CEA0/#47CFA1、x=30 处为 #37C99A ⇒ 走完三步流程时最后一步的主按钮色相与前两页不一致。
- 建议改法：改 `background: var(--c-gradient-brand)`，别在页面里重抄渐变。
- 修复类别：CSS/token

### R6-L15-D22　P2 / 素材缺失　批次 R6-B66
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`2533716c30da7b8d`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:152`
- 理想图依据：无基准，依据=规范文档 §1.1.4「emoji/字符一律替换为标准 SVG」+ AppShell 返回键已用 IMAGE_PATHS.ICONS_COMMON.BACK
- 现象：本页没走 AppShell，返回箭头是一个字符按 40rpx 渲染（实测白色圆内 y=85 处 x=32..34 为深色字素 #1C201E），不是 SVG；同页兴趣 chip 的图标倒是走了 image 标签（/static/assets/icons/common/*.svg），于是一屏之内"字符当图标"与"SVG 当图标"混用。
- 建议改法：返回键改用 IMAGE_PATHS.ICONS_COMMON.BACK（或本页直接换 AppShell 头），删掉字符箭头。
- 修复类别：单页

### R6-L15-D23　P2 / 位置　批次 R6-B66
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`2533716c30da7b8d`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:133`
- 理想图依据：无基准，依据=AppShell 页头规范（shell__title 左对齐；实测 schedule/feedback 帧标题左缘均在 x=16..18）
- 现象：本页自己拼页头，`.interest-header__row` 把 64rpx 圆返回键和标题组排成一行 ⇒ 实测标题"选择兴趣"左缘 x=56、副标题左缘 x=55，而本页其余所有内容（"选择你的标签" y=118..132、chip x=16、按钮 x=16..17）左缘都是 16px ⇒ 标题与正文左轴差 40px，视觉断层；其余三页标题都在 x=16。
- 建议改法：返回键移出标题行（做成标题上方的独立行）或直接复用 AppShell 头部。
- 修复类别：单页

### R6-L15-D24　P1 / 可达性　批次 R6-B66
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`2533716c30da7b8d`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:140`
- 理想图依据：无基准，依据=仓内热区标准 AppShell.vue:333-335「min-height/min-width ≥88rpx(44px)」
- 现象：本页唯一的退出口（圆返回键）实测白底圆 x=16..48 / y=62..94 ⇒ 32×32px = 64rpx，比 88rpx 标准每边少 12px；该页还有"至少 3 个才能保存"的硬门槛（index.vue:36），点不到返回就只能选满 3 个。
- 建议改法：`.interest-header__back` 改 width/height 88rpx（或保留 64rpx 视觉 + 透明 padding 扩热区）。
- 修复类别：单页

### R6-L15-D25　P3 / 尺寸比例　批次 R6-B21
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`084a981fde03aaa0`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:370`
- 理想图依据：无基准，依据=规范文档 §1.3「小字 --fs-md/base=13/12px 用于标签」
- 现象：chip 内图标声明 28rpx=14px，但 chip 整体实测只有 20px 高（y=245..264），图标占掉 70% 高度，文字（--fs-sm 22rpx=11px）被挤在同一水平带，图标与文字间隙只有 3px（.tag-chip gap:6rpx）⇒ 图标/文字/容器三级比例失衡。
- 建议改法：chip 抬到 88rpx 后把图标收在 24rpx、gap 提到 --sp-2(8rpx)。
- 修复类别：单页

## subpackages/setup/profile/index（3 条）

### R6-L14-D10　P1 / 素材缺失　批次 R6-B67
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`a10d860210102c0a`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:751`
- 理想图依据：无基准，依据=规范文档§3 照片墙（6 格人像照片，空位为「+」）
- 现象：照片墙第一行第 2、3 槽出的不是人像，是一枚品牌绿定位针：实测墨迹 bbox x157-230 与 x250-323、y540-632（约 146×184rpx），芯色 #36C99A（该区直方图众数 #36C99A×744），形状为水滴轮廓+内圈，与第 1 槽人像（同 y 区间 x63-128，无绿色）和第 4-6 槽「+」空位（框 x48-125/150-224/246-320，y644 起）三套内容混排。751 行 `<image v-if="url" :src="url">` 只认 photoDisplayUrls（444-450 行由 profileStore.photoGallery 驱动），mock 种子给的是 portraits/p1~p4.jpg（stores/profile.ts:166-171），real 包内 `static/assets/images/` 整目录不存在 ⇒ 槽位实际取到的是定位类图标素材而非人像。量不到的部分：该 URL 的最终字符串未能从仓内源码行反查到（数据来自后端 profile 响应），故只登记像素事实与槽位渲染路径。
- 建议改法：照片墙槽位素材单一来源化——photoGallery 为空/取不到人像时必须落「+」空位分支，禁止把功能图标当照片；种子改用 portraits/p1~p4 并确认 real 档可取到。
- 修复类别：需新建目标功能

### R6-L14-D11　P2 / 位置　批次 R6-B67
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`a10d860210102c0a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:678`
- 理想图依据：无基准，依据=规范文档§3 页头（标题不得与系统状态栏同处一行）
- 现象：滚动后页头标题压进系统状态栏：实测「基础资料」墨迹 y18-32（x42-84），与状态栏时钟「23:00」墨迹 y18-30 同一行，右侧 24px 即刘海黑块（x83-279，y6-26 连续深色）。本页无吸顶导航，678 行 `.hero` 随页整体滚出，标题只靠 heroStyle 的状态栏内边距在首屏避让，滚动后该避让失效。
- 建议改法：滚动超过英雄区时切吸顶标题栏（带 --statusbar 内边距与不透明底），或给 .hero__txt 加 sticky+安全区，使标题墨迹恒 ≥ y32。
- 修复类别：单页

### R6-L14-D12　P3 / 字号　批次 R6-B67
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`fd10af0a3de78bef`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1379`
- 理想图依据：无基准，依据=theme/design-variables.scss 字号档位表（--fs-xs 20rpx / --fs-sm 22rpx / --fs-md 26rpx）
- 现象：底部说明 `.safety-note` 用 font-size:21rpx —— 落在 --fs-xs(20rpx) 与 --fs-sm(22rpx) 两档之间，非档位且为硬编码字面量；实测该行文字墨迹仅 h=5px（芯色 #9AA39F，1381 行取 --c-text-placeholder 作正文色），在 378px 宽帧上 x73-305 一行排满 20+ 字，可读性最弱一档。
- 建议改法：改 font-size: var(--fs-sm) 并把正文色从 placeholder 换到 --c-text-tertiary。
- 修复类别：CSS/token

## subpackages/setup/recommend-pref/index（9 条）

### R6-L15-D09　P1 / 可达性　批次 R6-B68
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`96c19a14e359199c`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:302`
- 理想图依据：无基准，依据=仓内自陈热区标准 AppShell.vue:333-335「≥88rpx(44px)」
- 现象：7 个单选项（10:00/12:00/14:00/18:00 + 同校优先/同城/不限）全部用 `.option-item`，实测 10:00 框上下边框行 y=333 与 y=368 ⇒ 高 36px=72rpx，比 88rpx 标准少 12px；这是注册引导第 3 步的必填选择，全部热区偏小。
- 建议改法：`.option-item` 高度改 `min-height: 88rpx`（或 96rpx），与同页 BottomActionBar/输入框一致。
- 修复类别：单页

### R6-L15-D10　P2 / 颜色token　批次 R6-B68
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`96c19a14e359199c`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:305`
- 理想图依据：无基准，依据=规范文档 §1.2「边框 --c-border-light/default/strong = #EEF2F0/#DDE3E0/#C2CAC6」
- 现象：未选中选项的描边用 `--c-border-light`(#EEF2F0)，实测 10:00 框左边框像素 (32,340)=#F8F9F9、上边框 (60,332)=#F7F9F8 —— 与白卡 #FFFFFF 最大通道差仅 7~8（对比度≈1.05:1），肉眼几乎看不出这是个可点选项；描边语义应取 --c-border-default #DDE3E0。
- 建议改法：`.option-item` 描边改 `var(--c-border-default)`，或加 `background: var(--c-bg-surface)` 让未选中态有底。
- 修复类别：CSS/token

### R6-L15-D11　P3 / 文案　批次 R6-B68
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`96c19a14e359199c`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:237`
- 理想图依据：无基准，依据=该页 i18n `recommendPref.campusPriorityTitle` / `campusPriorityLabel`（zh-CN.ts:3248、3250 同为"校园优先"）
- 现象：第三张卡里"校园优先"出现两次——卡片标题（实测 y=549..563，x=34..89）与开关行标签（实测 y≈604..629 同行左侧），两行逐字相同，中间只隔着副标题（y=577..589）。
- 建议改法：开关行标签改为"开启校园优先"或直接删掉（卡片标题已说明），避免同卡同字两行。
- 修复类别：单页

### R6-L15-D12　P3 / 圆角　批次 R6-B07
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`ecce0c5d42fe7d2f`）
- 源码证据：`apps/client/src/components/common/SectionCard.vue:33`
- 理想图依据：无基准，依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx=20px」
- 现象：本页 4 张卡（进度卡 y=147..251、推荐时间 y=264..386、推荐范围 y=398..519、校园优先 y=531..650）同用 SectionCard，实测弧跨≈8px（12~16rpx 视觉半径），规范卡片圆角 40rpx=20px。
- 建议改法：同 D03，SectionCard 统一改用 --card-radius。
- 修复类别：CSS/token

### R6-L15-D13　P2 / 可达性　批次 R6-B68
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`ecce0c5d42fe7d2f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:330`
- 理想图依据：无基准，依据=仓内自陈热区标准 AppShell.vue:333-335「≥88rpx(44px)」
- 现象：「校园优先」开关整行是唯一可点区（@tap 在 .toggle-row），实测轨道 y=604..629（26px）+ 上下 padding 12rpx(6px) ⇒ 行高≈38px=76rpx，仍低于 88rpx；轨道本身 88×48rpx 实测 43×26px 无误，但轨道不是独立热区。
- 建议改法：`.toggle-row` 加 `min-height: 88rpx`，或把开关做成独立可点控件并各自满足 88rpx。
- 修复类别：单页

### R6-L15-D14　P2 / 位置　批次 R6-B03
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`ecce0c5d42fe7d2f`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/BottomActionBar.vue:52`
- 理想图依据：无基准，依据=组件语义（§1.5 结构组 BottomActionBar）+ 视口 378×814 与 home 指示条 y=799..805
- 现象：「保存」实测 y=662..705（高 44px=88rpx 正确），但它是内容流末尾的普通 flex 条：`.bar` 无 `position:fixed`、无安全区 padding ⇒ 按钮底距 home 指示条 94px，其下 y=727..798 全为空底；同页 top/bottom 两帧逐像素 0 差异（阈值>6 的差值像素=0），说明本页无第二屏，吸底缺失在取景里表现为"主 CTA 悬在半屏"。
- 建议改法：同 D07：BottomActionBar 提供吸底变体（fixed + env(safe-area-inset-bottom)）。
- 修复类别：单页

### R6-L15-D15　P3 / 文案　批次 R6-B68
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`ecce0c5d42fe7d2f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:181`
- 理想图依据：无基准，依据=该页 i18n `recommendPref.title`（zh-CN.ts:3234="推荐偏好"）与 `setupProgress.currentStep` 步骤名
- 现象："推荐偏好"在同一屏出现三次：AppShell 页头标题（实测 y=107..129，x=16 起）、进度卡内的步骤名（实测 y=169..181，居中 x=165..215）、进度条第 3 个圆点下方标签（y=230..241 标签行）；页头与步骤名之间仅隔 40px。
- 建议改法：进度卡的当前步名在当前页时省略或降级为"步骤 3/4"，不与页头同字重复。
- 修复类别：单页

### R6-L15-D16　P3 / 字号　批次 R6-B22
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`ecce0c5d42fe7d2f`，自同段前条继承）
- 源码证据：`apps/client/src/components/setup/SetupProgress.vue:239`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表（--fs-xs 10px 用途=角标·法务；说明文字应 --fs-lg/xl 14/15px）
- 现象：引导流程的步骤计数"第 3/4 步"用 `.setup-progress__current{font-size:var(--fs-xs)}`=20rpx=10px，实测该行墨迹 y=155..164 高 10px 与声明一致；规范里 10px 只允许用于角标/法务小字，注册第 3 步的关键进度提示被压到最小档。
- 建议改法：`.setup-progress__current` 升到 `var(--fs-base)`(24rpx=12px) 以上，与同卡步骤名 `--fs-md`(13px) 拉开层级而不是同档挤压。
- 修复类别：CSS/token

### R6-L15-D17　P3 / 圆角　批次 R6-B22
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`2533716c30da7b8d`）
- 源码证据：`apps/client/src/components/setup/SetupProgress.vue:226`
- 理想图依据：无基准，依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx=20px」
- 现象：进度卡（实测白底容器 y=147..251，x=16..362）不走 SectionCard，自带 `border-radius: var(--r-lg)`=20rpx=10px，比规范卡片圆角 40rpx 少一半，与同页下面 3 张 SectionCard（--r-xl=24rpx）也不同档 ⇒ 同一屏 4 张卡两种圆角、都不及规范。
- 建议改法：SetupProgress 容器改用 `var(--card-radius)`，与 SectionCard 同一来源。
- 修复类别：CSS/token

## subpackages/setup/schedule/index（8 条）

### R6-L15-D01　P1 / 需新建　批次 R6-B69
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`2ee2df3cdbe95b9a`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:29`
- 理想图依据：无基准，依据=该页源码头注释 §"时间安排页（课表导入，可选工具）"（schedule/index.vue:3）+ 画面卡片区 y=166..373
- 现象：页面自我定位是"课表导入"，但 `courseBlocks` 只在脚本里声明、模板从未渲染（同文件 :24-25 注释自陈"courseBlocks 未在模板渲染"）；实测卡内只有 3 个元素——常去区域输入框（y=211..251）、＋添加时段（y=267..298）、保存并进入应用（y=310..353），没有一行星期/节次/课程块 UI，卡下方 y=375..798 全是 #EEF7F2 空底。
- 建议改法：按 courseBlocks 契约补课表块列表（星期×节次）渲染与增删入口，或把页面标题/副标题的"课表"字样去掉、明确本页只管常去区域+空闲时段。
- 修复类别：需新建目标功能

### R6-L15-D02　P2 / 颜色token　批次 R6-B69
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`2ee2df3cdbe95b9a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:138`
- 理想图依据：无基准，依据=规范文档 §1.2 配色方案「输入底 `--c-bg-surface` #F3FAF6」
- 现象：`.field` 输入框底色写的是 `var(--c-bg-page)`，实测框内 (189,230)=#EEF7F2，与页面底色 #EEF7F2 逐字同值；它落在白卡（实测卡内 #FFFFFF）上，等于把"页面底"当"输入底"用，规范输入底应为 #F3FAF6。
- 建议改法：`.field` 底色改 `var(--c-bg-surface)`（#F3FAF6），页面底色令牌只留给 page/AppShell。
- 修复类别：CSS/token

### R6-L15-D03　P3 / 圆角　批次 R6-B07
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`2ee2df3cdbe95b9a`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/SectionCard.vue:33`
- 理想图依据：无基准，依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx=20px」
- 现象：本页唯一卡片用 SectionCard，其圆角写 `var(--r-xl)`=24rpx；实测左上角弧从 (x=24,y=166) 收到 (x=17,y=175)，弧跨度≈8px（含 1rpx 描边与 AA 约 9px），规范卡片圆角是 --card-radius 40rpx=20px，实测不到规范一半。
- 建议改法：SectionCard 圆角改 `var(--card-radius, 40rpx)`，别用 --r-xl 顶替卡片语义令牌。
- 修复类别：CSS/token

### R6-L15-D04　P2 / 空态文案　批次 R6-B69
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`2ee2df3cdbe95b9a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:28`
- 理想图依据：无基准，依据=该页 i18n 文案 `setup.schedule.timeWindowPlaceholder`（zh-CN.ts:3223）+ 画面 y=251..267 区间
- 现象：`preferredTimeWindows` 初值为空数组，模板按数组渲染输入框 ⇒ 首次进入一个时段输入框都没有，写好的引导 placeholder「常用空闲时段，例如今晚或本周三下午」在画面上永远不可见（实测输入框底 y=251 与虚线按钮边 y=267 之间只有白卡，无任何文字），新用户只看到一句"＋ 添加时段"，而保存校验（:60-64）又强制至少填一个时段。
- 建议改法：初值给 1 个空时段行（或在列表为空时渲染一行带 placeholder 的输入框），让引导文案在空态可见。
- 修复类别：单页

### R6-L15-D05　P3 / 文案　批次 R6-B69
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`2ee2df3cdbe95b9a`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:84`
- 理想图依据：无基准，依据=规范文档 §1.2「绿色=行动」+ 该页 i18n（zh-CN.ts:3219-3221）
- 现象：页头标题是"时间安排"（实测 y=130..160 区），唯一卡片标题却是"偏好设置"（SectionCard :title，实测 y≈175..190 区），且卡内第一个字段是"常去区域"（地点）——一张名为"时间安排"的页里，唯一的分组标题既不复述本页主题、又与"偏好设置"这一注册流程通用名撞名。
- 建议改法：卡片标题改为与本页主题一致的"日程偏好/时间安排"，常去区域单独拆一张"常去区域"卡。
- 修复类别：单页

### R6-L15-D06　P3 / 间距　批次 R6-B69
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`2ee2df3cdbe95b9a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:188`
- 理想图依据：无基准，依据=规范文档 §1.4「--sp-4=16rpx=8px」+ SectionCard `.card__body{gap:var(--sp-4)}`
- 现象：「＋添加时段」与上方"常去区域"输入框之间实测 16px（输入框薄荷底末行 y=251 → 虚线上边 y=267）=32rpx，是声明值的两倍：`.time-window-add` 自带 `margin-top: var(--sp-4)`(8px)，而它的父级 `.card__body` 已是 `display:flex; gap: var(--sp-4)`(8px)，margin 与 gap 叠加。
- 建议改法：去掉 `.time-window-add` 的 margin-top，交给父级 flex gap 统一控制。
- 修复类别：单页

### R6-L15-D07　P2 / 位置　批次 R6-B03
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`2ee2df3cdbe95b9a`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/BottomActionBar.vue:52`
- 理想图依据：无基准，依据=组件语义（§1.5 结构组 BottomActionBar）+ 画面视口 378×814
- 现象：名为 BottomActionBar 的主 CTA 实测在 y=310..353，距视口底 461px，下方 y=375..798（占视口 52%）是纯 #EEF7F2 空底；`.bar` 只有 `display:flex`，无 `position:fixed`、无安全区 padding，且本页还把它塞进 SectionCard 内部（schedule/index.vue:126）⇒ 它既不是吸底栏也不是普通按钮，唯一出口悬在内容流末尾。
- 建议改法：给 BottomActionBar 增加吸底（fixed + safe-area）变体并把 CTA 移出 SectionCard，或明确改为"卡内按钮"并改名。
- 修复类别：单页

### R6-L15-D08　P2 / 可达性　批次 R6-B69
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`96c19a14e359199c`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:117`
- 理想图依据：无基准，依据=仓内自陈热区标准 AppShell.vue:333-335「min-height/min-width ≥88rpx(44px)」
- 现象：「＋添加时段」是本页唯一的"造出输入框"入口，实测其虚线盒 y=267..298 = 32px（64rpx）高，低于仓内 88rpx 标准；padding 只声明 `var(--sp-4) var(--sp-4)`(8px 上下) + 28rpx 文字，凑不到 44px。
- 建议改法：`.time-window-add` 加 `min-height: 88rpx`（与 .field 一致）。
- 修复类别：单页

## subpackages/support/feedback/index（7 条）

### R6-L15-D26　P1 / 空态文案　批次 R6-B70
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`084a981fde03aaa0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:460`
- 理想图依据：无基准，依据=同卡另两个输入框均有 placeholder（实测有墨）+ 规范 §1.2 占位色令牌
- 现象：正文 textarea 没有绑 placeholder（同卡"标题"input 与"选填微信号"input 都有），实测 textarea 薄荷底 y=322..463（142px=284rpx 高）内部 x=40..340/y=330..455 墨迹像素 =0，而标题框同法测得 ink=507、微信号框 ink=1212 ⇒ 画面上是一整块空白灰框，用户不知道该写什么、写多长（maxlength 只在脚本里）；i18n 里也没有 feedback.placeholderContent 键。
- 建议改法：补 `:placeholder="t('feedback.placeholderContent')"`（如"请描述遇到的问题或建议，10-500 字"）并加字数计数。
- 修复类别：单页

### R6-L15-D27　P2 / 颜色token　批次 R6-B70
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`084a981fde03aaa0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:624`
- 理想图依据：无基准，依据=规范文档 §1.2「输入底 --c-bg-surface #F3FAF6」
- 现象：`.field` 与 `.image-cell` 底色都写 `var(--c-bg-page)`，实测三个输入框（标题 y=270..310、正文 y=322..463、微信号 y=473..514）与上传占位格（y=567..655）内部均为 #EEF7F2，与页面底同值，落在白卡（卡内实测 #FFFFFF）上；规范输入底是 #F3FAF6。
- 建议改法：表单控件底色统一 `var(--c-bg-surface)`。
- 修复类别：CSS/token

### R6-L15-D28　P3 / 文案　批次 R6-B70
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`084a981fde03aaa0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:539`
- 理想图依据：无基准，依据=该页 i18n `feedback.imageUpload`（zh-CN.ts:3310="上传图片"）
- 现象："上传图片"在同一卡内逐字出现两次：分组标题（image-upload__title）与占位格内文字（image-cell__plus-text，格实测 y=567..655 内下方一行），中间只隔一行副标题"最多 3 张，每张 ≤ 5MB"。
- 建议改法：占位格内只留相机图标（或改"添加"），标题保留"上传图片"。
- 修复类别：单页

### R6-L15-D29　P3 / 圆角　批次 R6-B07
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`552662515f1cc44b`）
- 源码证据：`apps/client/src/components/common/SectionCard.vue:33`
- 理想图依据：无基准，依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx=20px」
- 现象：本页两张卡（新建提交 y=176..723、反馈历史 y=737 起）同用 SectionCard，声明 --r-xl=24rpx=12px，规范卡片圆角 40rpx=20px；同页输入框用 --r-lg=20rpx、分类 chip 用 --r-full，一屏四种圆角且没有一个是规范的卡片档。
- 建议改法：SectionCard 统一 `var(--card-radius)`。
- 修复类别：CSS/token

### R6-L15-D30　P2 / 空态文案　批次 R6-B70
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`552662515f1cc44b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:565`
- 理想图依据：无基准，依据=EmptyState.vue:26-27 已提供 hideSub 出口（R10-P2-008 专为主标题与「这里空空如也」语义重复而加）
- 现象：反馈历史空态一屏叠三句同义文案：卡片内提示"提交反馈后将在此处显示"（实测墨迹带 y=579..589，x=37..249）、EmptyState 主标题"暂无反馈记录"（y=723..735）、EmptyState 副标题"这里空空如也"（y=744..756）；调用处没传 hideSub，也没去掉上方 hint。
- 建议改法：EmptyState 传 hide-sub，并让 history-header 的 hint 仅在非空态显示（或直接删掉）。
- 修复类别：单页

### R6-L15-D31　P2 / 可达性　批次 R6-B70
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`552662515f1cc44b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:774`
- 理想图依据：无基准，依据=仓内热区标准 AppShell.vue:333-335「≥88rpx(44px)」
- 现象："历史记录"是去反馈列表的唯一入口（goHistory），实测其浅绿药丸底（--c-bg-brand #E8FBF2）bbox x=282..344 / y=570..597 ⇒ 63×28px，高 28px=56rpx，比 88rpx 标准少 16px；同页分类 chip 已按 .chip{min-height:88rpx} 达标（实测 y=218 起为 #36C99A 实心），说明是本处漏了。
- 建议改法：`.history-header__btn` 加 `min-height: 88rpx` 并用 flex 居中，保持视觉药丸尺寸不变。
- 修复类别：单页

### R6-L15-D32　P2 / 层级遮挡　批次 R6-B70
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`552662515f1cc44b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:427`
- 理想图依据：无基准，依据=AppShell fixed 头部约定（feedback/index.vue:427 传 fixed）
- 现象：吸顶头部实测占 y=0..155（返回药丸 y=56..94、副标题 y=105..117、标题 y=128..147），底色与页面底同为 #EEF7F2 且无分隔描边/投影：bottom 帧 x=189 处 y=118..254 连续为 #EEF7F2，头部与"被它盖住后露出的 textarea"在视觉上连成一片，内容在 y=155 硬切出现（top 帧同一 textarea 在 y=322..463），看不出上方还有被盖住的"新建提交"标题与类型 chip。
- 建议改法：给 fixed 头部加底边分隔（1rpx --c-border-light）或渐变遮罩，让被遮住的内容有边界提示。
- 修复类别：单页

## subpackages/tools/activities/detail（4 条）

### R6-L10-D01　P1 / 文案　批次 R6-B71
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`e2be6bce58931acd`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:348`
- 理想图依据：无基准；依据=规范文档 §1.2/§3（该页无逐页条目）+ 数据治理「清串文」要求（画面不得出现示例/演示标记）
- 现象：real 档帧封面图左上角有「示例活动」白字角标（帧内 x≈14-58、y≈110），整页正文是内置示例活动「新人礼遇 / 每日 18:00-20:00 / 校园咖啡角」，不是后端活动数据；根因链在 detail.vue:127 `samples.find((s) => s.id === id) ?? samples[0]` —— 任意未知 id 一律回退第一条示例，且 detail.vue:347 `v-if="isSample"` 把「示例」二字直接印在用户画面上
- 建议改法：real 档取不到后端活动时走 ErrorState/EmptyState（带重试与返回列表出口），删除面向用户的 `activities.sampleBadge` 角标，示例数据仅在 mock/dev 档启用
- 修复类别：单页

### R6-L10-D02　P2 / 圆角　批次 R6-B71
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`e2be6bce58931acd`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:523`
- 理想图依据：无基准；依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx = 20px」
- 现象：两张白卡（标题卡 / 活动介绍卡）圆角取 `var(--r-xl, 24rpx)` = 24rpx = 12.5px，帧上实测卡角弧高约 12px；规范卡片圆角令牌 `--card-radius: 40rpx`（design-variables.scss:699）= 20.8px，实测比规范小 8.3px（-40%）
- 建议改法：卡片容器圆角统一改 `var(--card-radius)`，或在 design-variables.scss 里把 `--r-xl` 与 `--card-radius` 收敛为同一来源
- 修复类别：CSS/token

### R6-L10-D03　P1 / 可达性　批次 R6-B71
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`e2be6bce58931acd`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:343`
- 理想图依据：无基准；依据=规范文档 §3.2/§3.4 类「详情/列表页应有长内容」通例 + 本页数据模型（ActivityItem 有 enrollCount 字段）
- 现象：bottom 帧与 top 帧 contentHash 逐字相同（取景清单 sameAsTop=true），滚动到底 0 位移 —— detail.vue:343 的 `scroll-view scroll-y` 内只有封面 360rpx + 两张卡，总高约 640px < 视口 760px，页面根本没有可滚内容；同时详情页缺报名截止/报名人数/主办方/位置/注意事项整段：detail.vue:59 `enrollCount: 0` 在数据里，但模板（332-441 行）从未渲染它
- 建议改法：补「报名人数 + 主办 + 位置（地图入口）+ 注意事项」区块使内容超一屏，并把 enrollCount 落到标题卡下方的 meta 行
- 修复类别：需新建目标功能

### R6-L10-D04　P2 / 间距　批次 R6-B71
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`e2be6bce58931acd`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:520`
- 理想图依据：无基准；依据=规范文档 §1.4「页边距 --page-padding 32rpx = 16px」
- 现象：卡片左右外边距取 `var(--sp-4)` = 16rpx = 8.3px，帧上实测白卡左缘距屏幕 8px（封面/卡/底部栏同值），只有规范页边距 32rpx=16.6px 的一半；同页内容左右各少 8.3px 留白，卡与屏幕边缘贴得过近
- 建议改法：页面级左右间距统一改用 `var(--page-padding)`，与 AppShell 系页面（32rpx gutter）同侧
- 修复类别：CSS/token

## subpackages/tools/daily-question/index（4 条）

### R6-L08-D14　P1 / 素材缺失　批次 R6-B72
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`38c4782ac337f1e5`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:143`
- 理想图依据：无基准，依据=规范文档§1.6 铁律 2「显式宽高防 0×0（基线 _image-base.scss:39-40）」
- 现象：锁定卡顶部的 80rpx 图标整块不渲染——实测白卡（x18-361 / y99-666，681x1125rpx）内 y99-347 区间零墨像素（496rpx 高的空白带），图标直接消失；根因 SafeImage 根容器 .safe-image 是 width/height:100%（SafeImage.vue:306-312），而 scoped 的 .lock-card__icon(:409-410) 只落到内层 image ⇒ 父高 auto 时 100% 退化为 0×0；另该处绑的是 ICONS_COMMON.CLOSE（×号），与「签到后解锁」语义也不符（应为 LOCK_SVG）
- 建议改法：用 :root-class 或 custom-style 给容器显式 80rpx 宽高（对齐 _image-base 基线），并把素材换成 ICONS_COMMON.LOCK_SVG
- 修复类别：单页

### R6-L08-D15　P2 / 可达性　批次 R6-B72
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`38c4782ac337f1e5`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:423`
- 理想图依据：无基准，依据=规范文档§1.2（三级文本）+ 仓库既有 WCAG AA 4.5:1 口径
- 现象：锁卡副文案「完成今日签到即可参与每日一问」用 --c-text-tertiary，实测令牌值 tokens.scss:245 = #8A92A0，压在纯白卡（--c-bg-container #FFFFFF）上对比度 3.13:1（帧内字形取样 #9DA4A1），字号 --fs-md=26rpx(13px) ⇒ 未达正文 4.5:1，白底小字发灰
- 建议改法：卡内说明文字改 var(--c-text-secondary, #4A524E)（4.76:1 于白底为 7.5:1 档），--c-text-tertiary 只留给非必读信息
- 修复类别：CSS/token

### R6-L08-D16　P2 / 可达性　批次 R6-B72
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`0c01b77f238e6684`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:445`
- 理想图依据：无基准，依据=规范文档§1.2（主色 #36C99A 上应配反色文本令牌）+ WCAG AA 4.5:1
- 现象：唯一 CTA「去签到」白字压品牌绿——实测药丸 x109-270 / y412-450（319x77rpx）底色 #31C897，字色写死 #ffffff，对比度 2.10:1；字号 --fs-lg=28rpx(14px)/600 不满足大字号豁免（需 ≥18.66px 粗体）⇒ 全页唯一出口文字与底色几乎同明度
- 建议改法：主按钮底色改走 --c-brand-600(#2AAE83)/--c-brand-700 渐变深端或把文字加描边，使 ≥4.5:1；颜色写死 #ffffff 一并换成 var(--c-text-inverse)
- 修复类别：CSS/token

### R6-L08-D17　P2 / 可达性　批次 R6-B72
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`0c01b77f238e6684`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:400`
- 理想图依据：无基准，依据=取景清单 scrollContentMeasurable=true 判据 + 规范文档§1.4
- 现象：锁定态下「滚到底」帧与顶帧几乎同图——两帧仅 116 行 / 10948 px（3.56%）变化，实测 CTA 由 y412-450 移到 y407-444（位移 5px≈10rpx，非真实滚动），卡下方 y668-814（274rpx）始终是纯页面底色 ⇒ 底部无任何可达内容，滚动帧提供不了新证据；根因 .lock-card 固定 min-height:70vh 且 scroll-view 无溢出内容
- 建议改法：锁定态给卡加真实出口（签到说明/今日题目预览占位或返回入口），或让卡高随内容自适应，使 bottom 帧能取到滚动后的布局
- 修复类别：单页

## subpackages/tools/heart-signals/index（6 条）

### R6-L09-D22　P1 / 素材缺失　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`7084299cf5b260e4`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:180`
- 理想图依据：无基准，依据=LockScreen.vue:143 注释自述「主题插画：解锁徽章 + 同校头像 + 漂浮爱心」+ 规范文档§1.2「心动粉 --c-romance-500 #FF6B81」
- 现象：插画里两颗"漂浮爱心"完全没画面：实测插画区 x=60-320、y=200-480 内**粉色像素（r-g>25 且 r>200）0 个**，而这两枚 `<image>` 的 `ICONS_SOCIAL.LIKE_FILLED` 解析为 `static/assets/icons/social/like-filled.svg`（config/images.ts:455），但 `apps/client/src/static/assets/icons/social/` 目录**不存在**（`ls` 报 No such file or directory，全仓 `find static -iname "*like*"` 0 命中）⇒ 12 个 ICONS_SOCIAL 图标（images.ts:449-462）在 8 个组件里全是 404 空图。
- 建议改法：补 `static/assets/icons/social/` 12 枚 SVG（爱心用 #FF6B81），或把 ICONS_SOCIAL 改指已存在的 `svg-spec/` 素材；`check:mp-image` 增加"常量路径必须 stat 得到"判据。
- 修复类别：单页

### R6-L09-D23　P2 / 颜色token　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`7084299cf5b260e4`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:148`
- 理想图依据：无基准，依据=规范文档§1.2「主色 #36C99A（图标·选中态）」「兴趣紫 #A29BFE（未认证）」，表内无 #94A3B8
- 现象：绿色圆底上的大锁图标与 3 枚权益勾选图标都是**灰蓝 #94A3B8**（取样：锁描边 #93A3B8@175,300、勾选图标 #8E9792/#727B77@78-82,530-536），既不是主色也不是"未认证紫"，在 #36C99A 圆底上像禁用态；根因是素材写死颜色——`static/assets/icons/common/lock.svg:1`、`check-circle.svg:1`、`close.svg:1` 都带 `stroke="#94A3B8"`（Tailwind slate-400，design-variables.scss 内 0 命中）。
- 建议改法：这批 common/*.svg 的 stroke 换成规范色（锁 #1F8D6A 或白、勾选 #36C99A），别在素材里写死表外值。
- 修复类别：CSS/token

### R6-L09-D24　P1 / 可达性　批次 R6-B73
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`7084299cf5b260e4`）
- 源码证据：`apps/client/src/subpackages/tools/heart-signals/index.vue:220`
- 理想图依据：无基准，依据=本页 index.vue:246-249 定义的「状态筛选 Tab + 信号卡片流」与 :312-318 的头像/昵称列表项（本帧 0 画面）
- 现象：游客档整页被锁屏接管：`<LockScreen v-if="!isUnlocked">`（:219-222）之后所有页面内容都在 `v-else`（:224）里，实测 top 帧的墨迹带只有 y=121-130（关闭按钮）、y=236-418（插画）、y=442-505（文案）、y=527-587（3 条权益）、y=604-651（CTA）、y=668-679（次按钮）——**信号列表、筛选 tab、24h 倒计时（:205-212）0 画面**，且取景清单的身份前提是 A「页面未声明门槛」，与代码实际声明的门槛不符 ⇒ 该页真实内容在本轮 8 帧里完全没被验证过。
- 建议改法：给游客档留一段可逛的公开内容（打码信号流 + 登录提示条）而不是整页替换；取景侧把该页身份前提改判为"有门槛页"并补登录态帧。
- 修复类别：单页

### R6-L09-D25　P1 / 位置　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`0b80ca4fbe15bf4c`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:343`
- 理想图依据：无基准，依据=LockScreen.vue:112 自标 `role="dialog" aria-modal="true"`（模态不得随背景滚动）+ 微信胶囊固定带实测 y=56-71
- 现象：唯一的退出按钮随页面滚动漂移：top 帧 × 号墨迹 bbox x=38-48、y=121-130，bottom 帧同一按钮上移到 y=52-71（位移 69px），已经**挤进微信胶囊所在的 y=56-71 横带**（胶囊墨迹实测 x=298-357、y=56-71，两帧位置不变），按钮白圆顶边贴到状态栏下沿。根因：`.lock-screen { position: relative; min-height: 100vh }`（:243-244）不是 fixed，关闭键用 `position: absolute; top: calc(var(--statusbar) + var(--sp-3))`（:342-343）挂在这个会滚的容器上。
- 建议改法：`.lock-screen` 改 `position: fixed; inset: 0`（或给 close 换 `position: sticky` + 安全区 top），滚动锁在 body 内部，保证关闭键恒在胶囊下方。
- 修复类别：单页

### R6-L09-D26　P1 / 素材缺失　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`0b80ca4fbe15bf4c`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:164`
- 理想图依据：无基准，依据=规范文档§4 摄影语言「写实人像 · 自然暖调 · 半身构图」+ LockScreen.vue:161 注释「同校头像」
- 现象：插画里两枚"同校头像"不是人：帧上实测两圆平均色 #9FB0A3（左）/ #A4B1AB（右），追到素材 `apps/api/uploads/app-assets/assets/images/avatars/avatar-1.jpg`（400×400，平均色 #3C3A21）逐张打开看是**航拍树冠**，`avatar-2.jpg` 平均 #39413F 是暗水面/礁石纹理——头像池里装的是风景贴图，锁屏"和你一样的同学在寻觅"这层叙事直接崩掉。
- 建议改法：换掉 app-assets 头像池里的非人像（按 §4 摄影语言出写实人像），并在 `verify-app-assets-coverage` 加一条"avatars/ 目录内容必须过人像分类"的抽检。
- 修复类别：需新建目标功能

### R6-L09-D27　P2 / 文案　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`0b80ca4fbe15bf4c`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:38`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（画面须对得上页面语义）+ 本页导航标题 i18n `heartSignals.navTitle`（index.vue:241）
- 现象：锁屏通篇不提"心动信号"：标题取 `lock.titleLoggedOut`「登录后解锁完整交友功能」（实测墨迹带 y=373-437 含标题+副标题两行）、副标题「完成登录授权与基础资料填写，即可开启匹配、聊天、校园活动等全部功能」、3 条权益 y=458-519 全是「匹配/校友主页/私信」，两帧 14 条墨迹带里**没有一处出现页名「心动信号」**——用户从心动信号入口进来，看到的是一段与本页无关的通用劝登录文案。
- 建议改法：LockScreen 增加 `title/desc` 插槽或按页传参（心动信号页传"登录后查看谁对你心动"），别再让 8 个宿主页共用一句通稿。
- 修复类别：单页

## subpackages/tools/love-center/consulting（4 条）

### R6-L10-D14　P1 / 需新建　批次 R6-B74
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`c5777edfa689b164`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:38`
- 理想图依据：无基准；依据=规范文档 §3 无该页条目 + 本页自述设计（consulting.vue:10「为空则展示本地示例课程列表」，课程 3 门 ¥99/129/159 见 consulting.vue:48-59）
- 现象：real 档整页只有一张「功能封存中 / 该功能暂未开放，开放时间将另行通知」白卡，页面标题承诺的「恋爱咨询课程」0 张课程卡、0 个报名入口 —— 代码里已实现的 3 门课程列表（consulting.vue:88-110）在 `commerceSealed` 为 true 时整段不渲染，而 `isCommerceOn("consult")` 缺省即封存（consulting.vue:36 注释「缺省封存（=== true 才放行）」），real 后端未下发该开关 ⇒ 课程与报名链路在真档从未到达过
- 建议改法：real 档由后端下发 `commerce.consult`（或明确该页真档就是封存），封存态也应保留课程预览 + 「开放提醒」出口，别把已实现的课程整段藏掉
- 修复类别：需新建目标功能

### R6-L10-D15　P2 / 位置　批次 R6-B74
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`c5777edfa689b164`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:150`
- 理想图依据：无基准；依据=组件规范 `src/components/common/EmptyState.vue:119-125`（空态容器 `.empty` 上下 80rpx 留白 + flex 居中），本页未复用该组件
- 现象：封存卡贴在导航下方（帧上 y≈148-300，高 152px），其下到 home 条之间 y≈300-760 约 460px（视口 60%）是纯页面底色空白；`.consult-sealed` 写了 `justify-content: center`（consulting.vue:148）但那只管卡内子节点，卡自身只靠 `margin: var(--sp-6) var(--sp-4)` 顶在文档流开头，没有任何容器把它在剩余视口里垂直居中
- 建议改法：给 AppShell 默认插槽套一层 `flex:1; display:flex; align-items:center; justify-content:center` 容器（或直接用 EmptyState 组件）
- 修复类别：单页

### R6-L10-D16　P1 / 可达性　批次 R6-B74
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`c5777edfa689b164`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:80`
- 理想图依据：无基准；依据=组件规范 `src/components/common/EmptyState.vue:110-113`（空态自带 empty-action 出口按钮）
- 现象：bottom 帧与 top 帧 contentHash 逐字相同（取景清单 sameAsTop=true、字节同为 28809B）⇒ 滚动零位移，整页可交互节点只有 AppShell 的返回钮；封存卡（consulting.vue:80-84）内只有 lock 图标 + 两行文字，没有「开放提醒/联系客服/返回恋爱中心」任何一个 CTA，用户进到本页只能退出，是条死端
- 建议改法：卡内补次级按钮（开放提醒订阅 / 咨询客服），并复用 EmptyState 的 action 插槽
- 修复类别：需新建目标功能

### R6-L10-D17　P2 / 圆角　批次 R6-B74
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`c5777edfa689b164`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:152`
- 理想图依据：无基准；依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx = 20px」
- 现象：封存卡圆角取 `var(--r-xl, 24rpx)` = 24rpx = 12.5px，帧上卡角弧高实测约 12px，比规范卡片令牌 40rpx=20.8px 小 8.3px；同页课程卡（consulting.vue:189）也是同一个 24rpx，一旦解封将整页同偏
- 建议改法：与全站卡片统一改 `var(--card-radius)`，并把 `--r-xl` 与 `--card-radius` 收敛为单一来源
- 修复类别：CSS/token

## subpackages/tools/love-center/index（7 条）

### R6-L09-D01　P1 / 素材缺失　批次 R6-B75
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`9f18a1d6a1fd842c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:104`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条「emoji 一律替换为标准 SVG」+ §1.6 第 2 条「显式宽高防 0×0」；该列两行卡片同构（快捷入口行 vs 恋爱测试行），后者图标有画面
- 现象：「附近的人」行的 48rpx 图标位整块空白——实测卡片带 y=181-218、图标槽 x=32-60 内非白像素 0 个，而同列同宽的「MBTI 人格测试」行同区有 311 个非白像素（最深 #1C1C1C）；行内文字因此从 x=63 起排，视觉上像少了一格。根因候选已量到：`IMAGE_PATHS.ICONS_EMOJI.LOCATION`→`apps/client/src/static/assets/icons/location.svg:1` 的 `<svg>` 只有 viewBox、无 width/height 内在尺寸，而渲染成功的 `common/puzzle.svg` 带 `width="24" height="24"`（全仓 icons 下 117 个 SVG 有 107 个同样缺内在尺寸）。
- 建议改法：给 location.svg（及同批 107 个）补 `width="24" height="24"` 内在尺寸，或该页改用带内在尺寸的 common/ 图标；顺带去掉 `<image lazy-load="true">`（非 scroll-view 内不生效）。
- 修复类别：单页

### R6-L09-D02　P2 / 圆角　批次 R6-B75
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`9f18a1d6a1fd842c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:262`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20px」
- 现象：卡片圆角实测约 11px（左上角从 (34,181) 过渡到 (24,192)，逐行 firstWhiteX 扫描得 10-11px ≈ 22rpx），比规范的 40rpx（20px）小一半；代码写的是 `border-radius: var(--r-xl, 24rpx)`，不是卡片令牌 `--card-radius`。
- 建议改法：卡片圆角统一取 `var(--card-radius, 40rpx)`，与全站卡片同值。
- 修复类别：CSS/token

### R6-L09-D03　P2 / 间距　批次 R6-B75
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`9f18a1d6a1fd842c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:167`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx = 16px」
- 现象：卡片左边缘实测 x=24px（≈48rpx）、右边缘 x=353（右边距 25px），是规范 16px 的 1.5 倍。原因是双重 gutter：AppShell `.shell__content` 已给 `padding: 0 32rpx`（apps/client/src/components/layout/AppShell.vue:283），本页 `.love-center__section { margin: var(--sp-5) var(--sp-4) }` 又叠 16rpx=8px。
- 建议改法：页内 section 的水平 margin 归 0，只留上下 `var(--sp-5)`，水平交给 AppShell 的 32rpx 单一来源。
- 修复类别：CSS/token

### R6-L09-D04　P2 / 字号　批次 R6-B75
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`9f18a1d6a1fd842c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:172`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「区块标题 --fs-3xl/4xl 18/20px 700」
- 现象：区块标题「快捷入口」墨迹带实测 y=233-245（高 13px，x=24-77）⇒ 字号 ≈14px（=28rpx，正是 `font-size: var(--fs-lg, 32rpx)` 落到的 `--fs-lg: 28rpx`，见 design-variables.scss:564），比规范的 18-20px 区块标题小 4-6px；与同页 24rpx 的条目正文（「附近的人」墨迹高 11px）只差 2rpx，层级几乎拉不开。
- 建议改法：区块标题取 `var(--fs-3xl, 36rpx)`，与列表正文拉开至少 12rpx 档差。
- 修复类别：CSS/token

### R6-L09-D05　P2 / 颜色token　批次 R6-B75
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`9f18a1d6a1fd842c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:235`
- 理想图依据：无基准，依据=规范文档§1.2「主色 --c-brand(brand-500) #36C99A：图标/选中态」+ §1.1 第 2 条「绿色=行动」
- 现象：「MBTI 人格测试」行的拼图图标实测最深像素 #1C1C1C（取样点 43,267），是 SVG 自带的 currentColor 默认黑，不是规范主色 #36C99A；代码在 `.love-center__test-icon` 上写 `color: var(--c-brand-500)`，但 mp-weixin 的 `<image src="*.svg">` 是外部图片、CSS color 不注入，所以这条声明是死代码（同页 :201、:270 三处同病）。
- 建议改法：把图标换成已烧好主色描边的 SVG（或在素材内写死 `stroke="#36C99A"`），别再依赖 CSS `color` 穿图。
- 修复类别：CSS/token

### R6-L09-D06　P1 / 需新建　批次 R6-B75
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`a9d3511519d55ce4`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:112`
- 理想图依据：无基准，依据=本页脚本注释自述的页面定义（index.vue:3「恋爱中心 - 恋爱咨询（4 板块）+ 恋爱测试入口」）+ 规范文档§1.1 第 5 条
- 现象：页面主体「恋爱咨询 4 板块」（恋爱咨询/恋爱课程/社交咨询/社交课程，定义在 index.vue:27-32）在 top/bottom 两帧里都没有画面——bottom 帧滚到底后整页只剩 2 张白卡（白卡带 y=36-72、y=111-147），最后一块内容止于 y=147/814；而页头标题正是「恋爱咨询」（AppShell :217），点进来却没有任何咨询内容可看。
- 建议改法：给 real 档一条不依赖 `appConfig.isCommerceOn` 的降级画面（4 板块置灰 + 说明文案，或把开关默认值落到 real 档），别让页名与画面互相矛盾。
- 修复类别：需新建目标功能

### R6-L09-D07　P1 / 可达性　批次 R6-B75
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`a9d3511519d55ce4`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:226`
- 理想图依据：无基准，依据=规范文档§1.4 卡片高度/触控规范 + 门内既有判据「热区≥88rpx」
- 现象：①可滚范围实测只有 145px（top 帧卡片 1 在 y=181-218，bottom 帧同一张卡在 y=36-72），bottom 帧 y=147 以下 667px（≈1323rpx）全是 `#EEF7F2` 空底，`.love-center__footer-space` 的 120rpx 留白在 814px 高的视口里毫无必要；②两行卡片热区实测高 38px（≈75rpx）< 88rpx 触控下限（`padding: var(--sp-4) var(--sp-5)` = 上下各 8px + 24rpx 文本行）。
- 建议改法：卡片纵向 padding 提到 `var(--sp-6)` 使热区 ≥88rpx，并把 footer-space 换成随内容收拢（或直接删掉 120rpx 固定留白）。
- 修复类别：单页

## subpackages/tools/love-center/mbti（4 条）

### R6-L10-D10　P2 / 间距　批次 R6-B76
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`9b6ef17c84b7b24b`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:320`
- 理想图依据：无基准；依据=规范文档 §1.4「页边距 --page-padding 32rpx = 16px」
- 现象：帧上「16 型人格速览」标题左缘、16 格网格首列左缘、题目卡左缘全部落在 x≈8px，即 `var(--sp-4)`=16rpx=8.3px，只有规范页边距 32rpx=16.6px 的一半；同页末枚维度 chip「J/P 判断/知觉」右缘已到屏幕边缘 x≈390（右侧 0 留白），左右不对称
- 建议改法：`.content-section` 左右外边距改 `var(--page-padding)`，与 AppShell 系页面同 gutter
- 修复类别：CSS/token

### R6-L10-D11　P1 / 可达性　批次 R6-B76
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`9b6ef17c84b7b24b`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:429`
- 理想图依据：无基准；依据=组件规范 `src/components/common/Button.vue:56` 最小按钮高度令牌 `--btn-height-sm: 80rpx`（design-variables.scss:665）+ 同页提交按钮自证值 88rpx（mbti.vue:455）
- 现象：8 个单选项（「约朋友出去玩」「一个人安静休息」…）每行帧上实测高约 31px=60rpx（上下 padding 各 var(--sp-3)=12rpx=6.25px + 24rpx 文字行高约 17.5px + 2rpx 边框×2），比组件规范最小按钮 80rpx 还矮 20rpx，也比同页「提交并查看结果」的 88rpx 矮 28rpx；这 8 个 radio 是测试主流程的必经点击点，热区却是全页最小
- 建议改法：`.quiz-option` 纵向 padding 提到 `var(--sp-5)`（20rpx）或直接 `min-height: 88rpx; display:flex; align-items:center`
- 修复类别：CSS/token

### R6-L10-D12　P2 / 字号　批次 R6-B76
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`482892e16c392364`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:394`
- 理想图依据：无基准；依据=规范文档 §1.3 字体层级表「极小 --fs-xs/sm = 10/11px（角标 · 法务）」为全站下限
- 现象：16 格人格名（竞选者/辩论家/…/物流师）字号写死 `18rpx` = 9.4px，比全站最小令牌 `--fs-xs: 20rpx`（design-variables.scss:560）= 10.4px 还小 1px，属未登记字号；帧上这 16 个词是网格内唯一的中文语义承载，缩到 9.4px 后与同格 24rpx 代码（ENFP）落差过大
- 建议改法：改 `font-size: var(--fs-xs)`（20rpx），必要时把 code 行降到 --fs-base 以让出宽度
- 修复类别：CSS/token

### R6-L10-D13　P1 / 可达性　批次 R6-B76
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`482892e16c392364`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:274`
- 理想图依据：无基准；依据=本页自证注释 mbti.vue:282-283（MP-R1-LMBTI-101：返回键与微信胶囊 87×32px 矩形重叠需避让）+ 同族状态栏叠印登记 R10-P1-003
- 现象：滚动后绿色导航整条滚出视口 —— top 帧 y≈42-88 的「MBTI 人格测试」绿条（含返回键 mbti.vue:142）在 bottom 帧完全消失，16 格网格第 1 行顶到状态栏「22:52」同一水平线（y≈8-45），第 2 行第 4 格（INFJ 提倡者）被微信胶囊（x≈288-380、y≈88-132）压住不可读；根因是 `.content-page` 用 `min-height: 100%` 而非固定视口高，内部 scroll-view 的 `flex:1; height:0`（mbti.vue:314-317）失去约束，整页转为页面级滚动，导航随内容一起走，滚到底后页面内没有任何返回出口
- 建议改法：`.content-page` 改 `height: 100vh; overflow: hidden`（同 nearby.vue:224 形态）使导航与返回键常驻，或把 `.content-header` 提为 sticky
- 修复类别：单页

## subpackages/tools/love-center/nearby（5 条）

### R6-L10-D05　P1 / 素材缺失　批次 R6-B09
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`0c08ea4f510c9494`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1288`
- 理想图依据：无基准；依据=组件规范 CardSwiper.vue:1285 注释「底部横向操作：× 跳过 / ☆ 悄悄话 / ♥ 喜欢」——每个 116rpx 圆钮内应有 44rpx 图标
- 现象：帧上三个动作圆钮（灰/橙/粉，直径实测约 60px=116rpx）内**只有文字、没有任何图标**，卡片底部「80% 匹配」胶囊内的 ♥（CardSwiper.vue:1240 同一批图标）同样空白；根因是 real 包把这批 v2 图标裁掉了：`config/images.ts:577 X: ICONS_BASE + '/v2/x-gray.png'` 走基址拼接，`isCdnDir('assets/icons')`（images.ts:72-77）拿目录 `static/assets/icons/` 去比前缀，命中不了 `cdn-buckets.json:9` 的 `static/assets/icons/v2/` ⇒ 运行时仍出 `/static/...`，而该目录已被 prune-unreferenced-static 移出包（实测 `apps/client/dist/build/mp-weixin-real/static/assets/icons/` 只剩 common/register/tabbar，无 v2；被裁的 v2 图标共 25 个，见该目录 CDN_OFFLOAD_MANIFEST.json）
- 建议改法：把 `assets/icons/v2/`（及 home/match 等子目录）从 cdnPrefixes 摘出，或按 images.ts:156 起的 IN_PACKAGE_ASSETS 双登记形态给这批图标补字面量 `/static/...` + `/assets/...` 两条登记，使包内一定留一份
- 修复类别：CSS/token

### R6-L10-D06　P2 / 颜色token　批次 R6-B09
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`0c08ea4f510c9494`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:2181`
- 理想图依据：无基准；依据=规范文档 §1.2 配色表「互动蓝 `--c-status-info` #4D8DFF —— 消息 · **超级喜欢** · 信息提示」
- 现象：中间动作钮帧上实测填充为暖橙（渐变 #FFB066→#FF8A3D，取样按钮中心 x≈195、y≈610 呈橙色），但该钮语义是「超级喜欢」——starAction 默认值 "superLike"（CardSwiper.vue:135，本页 nearby.vue:207-215 未覆盖），而 2180 行注释写明这枚暖橙是「v3 冻结：☆ 悄悄话」专用色；规范把「超级喜欢」判给互动蓝 #4D8DFF，且这两个 hex 是硬编码、未走任何令牌
- 建议改法：superLike 态取 `var(--c-status-info)`（#4D8DFF），暖橙只在 `starAction==='whisper'` 时挂到按钮上；两个渐变改由令牌派生
- 修复类别：CSS/token

### R6-L10-D07　P1 / 层级遮挡　批次 R6-B09
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`c21abf25ed619299`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1552`
- 理想图依据：无基准；依据=组件规范 CardSwiper.vue:115-119 蒙面模式定义「未解锁时头像模糊」
- 现象：本页以 `masked=true` 进入（nearby.vue:211），卡片声明 `filter: blur(28rpx) brightness(0.72)` 做身份遮挡，但帧上照片未被模糊也未被压暗——眉毛、眼窝、耳部高光、头皮胡茬这些 ≤3px 尺度的细节全部清晰可辨；量法：帧宽 390px ⇒ 28rpx=14.6px，任何小于 14px 的细节都应被高斯抹平，实测可辨 ⇒ 遮挡层未生效。同帧卡中上部仍显示「互发喜欢解锁头像」提示条（CardSwiper.vue:1176），画面与文案自相矛盾：说头像未解锁，却给整张清晰脸
- 建议改法：别依赖跨组件 `:deep()` 的 filter（同文件 1101 行已自证「mp-weixin 下即使 :deep(...) 拉伸失效」），改在卡片内自绘一层不透明/高斯压暗遮罩 view 盖住 SafeImage，与提示条同 z 层
- 修复类别：单页

### R6-L10-D08　P2 / 尺寸比例　批次 R6-B77
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`c21abf25ed619299`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:263`
- 理想图依据：无基准；依据=规范文档 §1.4 间距表 + 组件规范 CardSwiper「4:5 大图区 + 底部信息」满高卡片通例
- 现象：帧高 760px，卡片底边 y≈545、三个动作钮占 y≈580-640，钮下方到 home 条之间约 120px（视口 15.8%）是纯页面底色空白；卡片区 `.nearby-card-area { flex: 1 }` 把富余高度吃掉了却没转给卡片，卡片按自身宽高比停在上方，整页重心偏上
- 建议改法：卡片高度改为撑满 `.nearby-card-area`（或动作钮容器 `margin-top: auto` 贴底 + 安全区留白），使卡片区占满导航与动作钮之间
- 修复类别：单页

### R6-L10-D09　P2 / 空态文案　批次 R6-B09
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`c21abf25ed619299`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1133`
- 理想图依据：无基准；依据=组件规范 CardSwiper.vue:1131 注释「顶部信息条（纯匹配版）：左上距离 / 右上在线」
- 现象：页面标题是「附近的人」，取数也按距离上限过滤（nearby.vue:53 `distanceMax: NEARBY_MAX_DISTANCE_KM`），但帧上卡片左上角距离角标整条不渲染（`v-if="identityDistance"` 无值即消失），只留右上角「在线」；距离缺失时既无「距离未知」占位文案也无同城兜底，用户无法判断这张卡到底「近」在哪里
- 建议改法：identityDistance 为空时渲染「同城 · 距离未知」弱态文案（走 --c-text-placeholder），而不是把槽位整体删掉
- 修复类别：单页

## subpackages/tools/search/index（6 条）

### R6-L09-D16　P1 / 尺寸比例　批次 R6-B78
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`2bea19f241454844`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:497`
- 理想图依据：无基准，依据=本页脚本注释 index.vue:5「顶部搜索框」+ 规范文档§1.2 输入底定义（输入框必须容得下自身 placeholder）
- 现象：placeholder 文案被截成 4 个字：i18n 真值是「搜索感兴趣的人、标签和学校」14 字（zh-CN.ts:2877），帧上只有 x=63-119 的 57px 墨迹（逐列占用：搜 63-76、索 83-94、感+兴 96-119，末字在 x=119 处被切齐），而 x=120 到「取消」墨迹起点 x=240 之间 120px 全白 —— 说明 `.search-input` 的实际渲染宽度只有 ~66px，不是 `.search-box` 的可用宽度（`flex: 1` 在 mp-weixin 原生 input 上没撑开）。
- 建议改法：给 `.search-input` 显式 `width: 100%; flex-basis: 0; min-width: 0`（或改 `placeholder-style` 限字），保证 14 字 placeholder 能完整显示。
- 修复类别：单页

### R6-L09-D17　P2 / 颜色token　批次 R6-B78
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`2bea19f241454844`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:485`
- 理想图依据：无基准，依据=规范文档§1.2「输入底 --c-bg-surface #F3FAF6：输入框·浅底块」「卡片 --c-bg-container #FFFFFF」
- 现象：搜索输入框"看不见框"：`.search-box` 底色取的是卡片令牌 `var(--c-bg-container, #F2F3F5)`（渲染 #FFFFFF），而它所在的头部本身就是白底（实测 x=200 纵扫 y=40-120 全为 #FFFFFF），二者同色 ⇒ 输入区 (50,66)-(230,66) 逐点取样都是 #FFFFFF，圆角容器边界 0 像素，只剩一个放大镜图标暗示这里能输入。
- 建议改法：输入底改 `var(--c-bg-surface, #F3FAF6)`（或加 `1px solid var(--c-border-light)`），让输入框从白头部里浮出来。
- 修复类别：CSS/token

### R6-L09-D18　P2 / 可达性　批次 R6-B78
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`2bea19f241454844`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:646`
- 理想图依据：无基准，依据=门内既有判据「热区≥88rpx」+ AppShell 同类做法（AppShell.vue:334 `min-height: 88rpx` 注释「确保 ≥88rpx(44px)」）
- 现象：三个分组 tab 的热区实测只有 56×31px（选中「用户」绿胶囊 bbox x=13-68、y=103-133，高 31px ≈ 62rpx），低于本项目自己定的 88rpx 触控下限；tab 文字「标签」墨迹仅 y=113-124（12px），上下各剩 ~7px 可点。切「标签/学校」是本页主路径，却是最小的可点目标。
- 建议改法：`.search-tab` 补 `min-height: 88rpx; padding: 0 var(--sp-5)`，与 AppShell 返回键同口径。
- 修复类别：单页

### R6-L09-D19　P2 / 字号　批次 R6-B78
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`2bea19f241454844`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:536`
- 理想图依据：无基准，依据=规范文档§1.3「区块标题 18/20px 700」+ §1.1 第 3 条「页面只引用 var(--fs-*) 等令牌，禁止私有色值/私值」
- 现象：「搜索历史」区块标题墨迹带实测 y=156-167（12px ⇒ 字号约 13px=26rpx），代码写的是硬编码 `font-size: 30rpx`（同页 :499/:510/:547/:567/:577/:602 也都是 28/26/24rpx 裸值），既不走 `--fs-*` 令牌，也比规范区块标题 18-20px 小 5-7px；与条目文字「123456」（墨迹 y=189-198，10px）只差 2px，层级几乎不分。
- 建议改法：区块标题换 `var(--fs-3xl, 36rpx)`，同页其余裸 rpx 字号一并换成令牌。
- 修复类别：CSS/token

### R6-L09-D20　P1 / 可达性　批次 R6-B78
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`2bea19f241454844`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:284`
- 理想图依据：无基准，依据=任务书已知系统性问题③「top/bottom 同图 ⇒ 应有长内容」+ 规范文档§1.1 第 5 条
- 现象：bottom 帧与 top 帧**逐字节同一张图**（清单里两帧 sha16 都是 2bea19f241454844、都是 21600B，取景记录 scrollMethod=pageScrollTo+elementScroll:N/A）⇒ 滚到底位移 0。实测内容止于 y=198（最后一个墨迹带 y=189-198 是历史 chip），下方 616px（≈1230rpx）全是 #EEF7F2 空底；页面无任何可滚内容，"往下翻"这条交互路径不存在。
- 建议改法：未搜索态补内容（热搜 10 条 + 历史多行 + 猜你想搜），或让 `.suggest-wrap` 至少撑满一屏；取景侧再复核该页 scrollMethod。
- 修复类别：单页

### R6-L09-D21　P2 / 空态文案　批次 R6-B78
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`2bea19f241454844`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:329`
- 理想图依据：无基准，依据=本页 index.vue:329 自带的 EmptyState 文案「输入关键词，搜索感兴趣的人、标签和学校」（zh-CN.ts:2886）——它在本帧根本没出现
- 现象：空态门槛写成"热搜与历史同时为 0 才显示"，于是 real 档（后端 /api/v1/search/hot 无数据 ⇒ 热搜 0 条，index.vue:286 的 v-if 不成立、无「热搜」标题也无火苗图标）只要本地历史残留 1 条就永远不出空态：帧上「搜索历史」下只有一枚白底 chip（实测 x=13-94、y=182-207）写着「123456」（自动化取景残留词，无任何校验/清洗），页面既无热搜也无空态提示。
- 建议改法：空态判定改成按区块各自兜底（热搜为空时显示"暂无热搜"占位或直接隐藏标题；历史残留词做长度/字符校验），并给未搜索态补一句引导文案。
- 修复类别：单页

## subpackages/tools/security/index（8 条）

### R6-L09-D08　P1 / 素材缺失　批次 R6-B79
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`4cede12e5a9ed409`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:562`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条（emoji/图标必须是真实 SVG 素材）+ §1.6 第 2 条；同列 4 个圆底图标（手机/钥匙/Apple/锁）均有画面，仅微信一格空
- 现象：「绑定微信」行的 80rpx 圆底（实测圆底 x=37-74、y=428-465，填色 #E8FAF3）内部**非白像素 0 个**（lum<200 取样计数=0），是个纯空心圆；同列「绑定手机号」圆底内有图标（最深 #94A3B8@50,248）。根因已定位：`IMAGE_PATHS.ICONS_V2.WECHAT_GREEN_SVG` 解析为 `static/assets/icons/login/wechat-green.svg`（config/images.ts:630），而 `apps/client/src/static/assets/icons/login/` 这个目录**根本不存在**（`ls` 报 No such file or directory，全仓 wechat 图标只有 `svg-spec/13-login/btn-wechat.svg`）⇒ real 档 404 空图。
- 建议改法：把 wechat-green.svg 真落盘到 `static/assets/icons/login/`（或改指已存在的 `svg-spec/13-login/btn-wechat.svg`），并给 `check:mp-image` 补一条"引用路径必须能在 static 下 stat 到"的判据。
- 修复类别：单页

### R6-L09-D09　P1 / 字号　批次 R6-B79
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`4cede12e5a9ed409`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:912`
- 理想图依据：无基准，依据=规范文档§1.3「正文 15/16px、小字 13/12px」两级必须可分辨
- 现象：主标签与灰色说明文字**同一字号**：「绑定手机号」墨迹带 y=224-236（13px）、「未绑定手机号」y=247-259（13px），「修改密码」y=290-304（15px）vs「建议定期更换…」y=314-327（14px）——差 0-1px，层级为 0。根因：`font-size: var(--f-md)`（:912）与 `var(--f-xs)`（:922）、`var(--f-lg)`（:935）用的是一套**全仓不存在**的令牌名（`grep -- "--f-md:"` 等 0 命中，真名是 `--fs-*`），无 fallback ⇒ 声明整体失效、全部回落到继承字号。本页共 10 处这样引用。
- 建议改法：`--f-md/--f-xs/--f-lg` 全量替换为 `--fs-lg(28rpx)/--fs-sm(22rpx)/--fs-2xl(32rpx)`，并加一条门禁：`var(--f-` 出现即红。
- 修复类别：CSS/token

### R6-L09-D10　P2 / 颜色token　批次 R6-B79
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`4cede12e5a9ed409`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:521`
- 理想图依据：无基准，依据=规范文档§1.2 主色 `--c-brand #36C99A`（图标/选中态）+ §1.1 第 3 条「一令牌一值，禁止私有色值」
- 现象：5 个行图标实测描边色全部是 **#94A3B8**（取样：手机 #94A3B8@50,248、钥匙 #8B9DB3@59,305、设备列表 #92A2B6@63,648、锁 #92A2B7@63,530、文档 #8F9FB5@62,593）——这是 Tailwind slate-400，既不在 §1.2 令牌表内（`design-variables.scss` 内 94A3B8 命中 0 次），也不是本页想要的品牌绿。根因在素材本身：`static/assets/icons/common/mobile.svg:1`、`list.svg:1` 等把 `stroke="#94A3B8"` 写死（CSS 的 color 穿不进 `<image>` 外链 SVG）。
- 建议改法：把这批 common/*.svg 的 `stroke` 从 #94A3B8 改成规范主色 #36C99A（或按"绿=行动"改 #2AAE83），一次改素材、全站行图标同色。
- 修复类别：CSS/token

### R6-L09-D11　P2 / 圆角　批次 R6-B07
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`4cede12e5a9ed409`）
- 源码证据：`apps/client/src/components/common/SectionCard.vue:33`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20px」
- 现象：本页 5 张 SectionCard 的圆角实测约 9-10px（左上角 firstWhiteX 从 (24,166) 收到 (17,176)，firstWhiteY 从 (17,176) 抬到 (24,166)），规范要 20px，只有一半；组件写的是 `border-radius: var(--r-xl)`（=24rpx=12px），没用卡片令牌 `--card-radius`。卡片左右边距实测 x=17 / x=360（各 17-18px=34-36rpx）与 §1.4 页边距 32rpx 相符，只有圆角掉档。
- 建议改法：SectionCard 圆角改 `var(--card-radius, 40rpx)`，与 love-center 自绘卡片一并收口。
- 修复类别：CSS/token

### R6-L09-D12　P1 / 位置　批次 R6-B79
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`9ad35822b9d98bce`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:864`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条 + 同页其余 8 行的箭头位置（均右对齐 x=340，实测 top 帧 inkband x 上界=340）
- 现象：「危险操作」行的 `›` 箭头跑到**左下角单独成行**：bottom 帧 y=752 是说明文字（x=37-216），其后 y=774-779 只剩一坨 4px 宽的墨迹（x=37-40），右侧 x=340 处空着——其余 8 行的箭头都正常贴在右端。根因：`.sec-item--danger` 覆写了 `flex-direction: column; align-items: flex-start`（:863-865），把行内最后一个子节点（:672 的箭头）挤到第二行的起始侧。
- 建议改法：去掉 `--danger` 的 column 覆写（只保留 `align-items: center`），或把箭头包进 `.sec-item__info` 同级的外层 row 里，让它仍贴右。
- 修复类别：单页

### R6-L09-D13　P2 / 文案　批次 R6-B79
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`9ad35822b9d98bce`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:219`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（信息必须可辨识）+ 本页设备管理语义（index.vue:7「设备列表 + 下线操作」）
- 现象：设备列表两帧合计 9 行（top 帧 3 行：y=635-674 当前设备、708-736、775-803 两枚下线胶囊；bottom 帧 6 行：y=42-48 残行 + 109-137、176-204、243-271、310-338、377-405 五枚胶囊），**每行主标题逐字都是「手机号登录」**、副行只有时间（如 9/18 16:13），因为 `device: platformLabel(item.platform)` 只映射登录方式、`location: ""`（:220）恒空 ⇒ 用户点"下线"前无法判断是哪台设备。
- 建议改法：主标题改成「手机号登录 · <设备型号/末四位>」（后端 deviceId 已有，:180），location 空时补"未知位置"而不是直接留空。
- 修复类别：单页

### R6-L09-D14　P2 / 颜色token　批次 R6-B79
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`9ad35822b9d98bce`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:942`
- 理想图依据：无基准，依据=规范文档§1.2「错误 --c-error #E5454D」「浪漫粉底 romance-50 #FFECEF」，表内无 #FEE2E2
- 现象：「下线」胶囊底色实测 **#FEE2E2**（bottom 帧 x=315 纵扫，5 个胶囊带 y=109-137/176-204/243-271/310-338/377-405 取样众数色 #FEE2E2 共 802 px），来自 `background: var(--c-error-soft, #fee2e2)`——`--c-error-soft` 全仓无定义（`grep -- "--c-error-soft:"` 0 命中），于是每处都用行内 fallback 的 Tailwind red-200，违反 §1.1 第 3 条「禁止私有色值」；同页「注销账号」文字实测 #E5434B≈规范 #E5454D 正常，说明只有 soft 档缺令牌。
- 建议改法：在 design-variables.scss 补 `--c-error-soft: #FFECEC`（由 #E5454D 派生 8% 底），页面只引令牌、删掉行内 fallback。
- 修复类别：CSS/token

### R6-L09-D15　P2 / 可达性　批次 R6-B79
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`9ad35822b9d98bce`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:940`
- 理想图依据：无基准，依据=门内既有判据「热区≥88rpx」+ 规范文档§1.4 间距表
- 现象：「下线」按钮热区实测高 29px（bottom 帧 5 枚胶囊 y 带 109-137、176-204、243-271、310-338、377-405 均为 29px ≈ 58rpx），宽 31px（x=300-330）——两个方向都低于 88rpx（44px）触控下限；`padding: 10rpx 24rpx` 只给到上下 5px。它是本页唯一会吊销会话的危险操作，却是最小的一块热区。
- 建议改法：胶囊 `min-height: 56rpx; padding: 14rpx 28rpx` 并把外扩点击区（`::after` 或 hit-slop 容器）撑到 88rpx。
- 修复类别：单页

## subpackages/village/village/detail（4 条）

### R6-L03-D18　P1 / 可达性　批次 R6-B80
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`e4986af491fcc4da`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1309`
- 理想图依据：素材/理想效果图/帖子.png 全页 6 大区块（作者行 / 标题正文 / 大图+三宫格 / 位置距离行 / 点赞评论转发 / 全部评论+底部输入栏）
- 现象：本帧以 query `id=352` 进入却直接落到 EmptyState 分支：理想图 6 个区块实测渲染 0/6（屏内只有放大镜 y≈176..230、两行文案 y=242..253 / ≈265、返回广场按钮 y=288..322）；bottom 帧与本帧 contentHash 逐字节相同（e4986af491fcc4da，24494B，清单 sameAsTop=true）⇒ 详情正文、评论、推荐模块这一轮全部没被拍到，页面下半屏 473px 空白。
- 建议改法：取景 recipe 换成当前真档里确实存在的 postId（先查 posts 表取一个 auditStatus=approved 的 id）重拍 top/bottom；id=352 这类失效样本另存为"错误态专用"帧，别顶替详情页基准帧。
- 修复类别：单页

### R6-L03-D19　P2 / 空态文案　批次 R6-B80
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`e4986af491fcc4da`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1311`
- 理想图依据：素材/理想效果图/帖子.png 无空态（理想图为正常态）；依据=组件规范 EmptyState.vue:80 注释「空态主标题与『这里空空如也』语义重复时使用 hideSub」
- 现象：空态两行文案叠在一起：主标题「帖子不存在或已被删除」（实测文字带 y=242..253）+ 组件默认副标题「这里空空如也」（y≈265..278，来自 EmptyState.vue:82 的 presetSubMap['no-data'] = zh-CN.ts:2922）。detail.vue:1309-1315 只传了 title/action-text/type，没传 :27 就有的 hideSub ⇒ 一句业务错误被通用空态话术盖一层。
- 建议改法：该处加 `hide-sub`（错误态只留一句），或直接给 description 传"返回广场重新挑一条"这类可行动文案。
- 修复类别：单页

### R6-L03-D20　P3 / 素材缺失　批次 R6-B80
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`e4986af491fcc4da`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:796`
- 理想图依据：素材/理想效果图/帖子.png 右上角「•••」菜单（紧凑三点图形，与标题同一行）
- 现象：三点菜单是文本字符不是图标：实测墨迹框 x=320..350、y=97..102（高仅 5px=10rpx，三点各自 5px 见方、间距由字符 U+00B7 的字距决定），行内写成 `<text>···</text>`；规范文档§1.1 规则 4 要求「emoji/字符图形一律替换为标准 SVG」。位置本身没问题（与标题行 y=90..105 同行、在胶囊 y=56..71 下方 26px，未被遮挡）。
- 建议改法：换成 IMAGE_PATHS.ICONS_COMMON 里的 more 图标（同页 :796 改 <image>），命中区补到 ≥88rpx。
- 修复类别：单页

### R6-L03-D21　P2 / 位置　批次 R6-B80
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`e4986af491fcc4da`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1505`
- 理想图依据：素材/理想效果图/帖子.png 整屏 6 区块铺满（无大片留白）；本帧为错误态，依据=组件规范 EmptyState 应垂直居中于可用区
- 现象：空态组没有居中而是吊在屏幕上部：图标带 y≈176..230、标题带 242..253、按钮带 288..322，之后直到 home indicator（y≈795）实测 473px = 938rpx（占屏高 58%）纯白 #FFFFFF（本帧 3px 步长采样 #FFFFFF 30790 点，占 91%）；.detail-page 未给空态容器任何 flex 居中/最小高度约束。
- 建议改法：给 EmptyState 外层加 min-height: calc(100vh - 导航高) + flex 居中（或 detail 页专用 .detail-empty 容器），让错误态与理想图一样占满视口而不是上浮。
- 修复类别：CSS/token

## subpackages/village/village/history（identity A）（2 条）

### R6-L04-D05　P1 / 可达性　批次 R6-B85
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`fbb39e6f66a04b42`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:216`
- 理想图依据：无基准页，依据=规范文档 §3（标签聚合页应可上拉翻页、到底有终止提示）
- 现象：bottom 帧与 top 帧逐字节相同（清单 sameAsTop=true、bytes 同为 33407、contentHash 同为 d6f3c825323c498e）⇒ 本页的 @scrolltolower 翻页（:216 onLoadMore）与下拉刷新（:314 refresher-enabled）在真机上一帧都没被验证到；且 :429 的「没有更多」提示条件带 posts.length>0，空列表下既不翻页也不给终止信号，用户无法区分「这个标签真没帖」与「请求错位取空」。
- 建议改法：修 D01 后重取景补 bottom 帧；空态下补一条「该标签暂无帖子，去发布」可达入口，避免死屏。
- 修复类别：单页

### R6-L04-D09　P3 / 文案　批次 R6-B81
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__history__top.png`（sha16=`209ede5fdf7c18b5`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:215`
- 理想图依据：无基准页，依据=同列字段口径（一列内时间表达必须同构）
- 现象：时间列三种口径混排——卡 1「19 小时前」、卡 2「2026/10/06」、卡 3「2026/09/27」（帧上实测三行右对齐同列）；formatRelativeTime 超过 24h 直接吐原始日期串，同一页里「相对/绝对」并存，用户无法判断哪条更新。
- 建议改法：24h–7d 走「N 天前」，>7d 走「MM-DD」，全列同构。
- 修复类别：单页

## subpackages/village/village/index（4 条）

### R6-L03-D01　P1 / 可达性　批次 R6-B82
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__index__top.png`（sha16=`7538905fd6b077e2`）
- 源码证据：`apps/client/src/subpackages/village/village/index.vue:84`
- 理想图依据：无基准页，依据=规范文档§3 页面对账总表（第 15/16 行只给 detail/publish 立基准，village 广场页按 §1.1 全站浅绿 + 组件规范 LockScreen 比）＋清单 identity=A（登录态）
- 现象：登录态 A 的这帧整页是 LockScreen，且走的是「未登录」文案分支——实测标题行 y=330..360 为「登录后解锁完整交友功能」（= i18n/locales/zh-CN.ts:2907 titleLoggedOut，已登录分支应是 zh-CN.ts:2910「完善资料，解锁…」），主按钮 y=548..594「立即登录并完善」；index.vue:589 之后的 village-header / 频道 Tab / 帖子流 0 个渲染（屏内内容卡 0/1）。isUnlocked 只取 isProfileComplete，未登录文案与登录态互相矛盾，说明 session 未水合时就出锁定页。
- 建议改法：index.vue:84 的门槛判定拆成「未登录 / 已登录未完善」两支，session 水合完成前渲染骨架而不是未登录 LockScreen；取景侧再补一次登录态复拍。
- 修复类别：单页

### R6-L03-D02　P2 / 素材缺失　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__index__top.png`（sha16=`7538905fd6b077e2`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:177`
- 理想图依据：无基准页，依据=组件规范 LockScreen.vue:143 注释「解锁徽章 + 同校头像 + 漂浮爱心」＋规范文档§1.2 心动粉 --c-romance-500 #FF6B81
- 现象：插画区两颗漂浮爱心（.illustration__heart--1 52rpx / --2 40rpx，src=ICONS_SOCIAL.LIKE_FILLED）在帧上完全不存在：对 x∈[40,340]、y∈[140,340]（即 .lock-screen__illustration 440×400rpx 盒 + 余量）逐像素扫描，R>200∧G<170∧(R−G)>40 的粉色像素 0 个；同框的 LOCK_SVG/CHECK_CIRCLE_SVG/两枚头像均正常渲染，说明不是整块被裁而是这两颗图未出。
- 建议改法：把 like-filled.svg 换成 PNG 或内联 base64（mp-weixin `<image>` 对包内 svg 不稳），或按 §1.6 铁律 3 走 SafeImage 并加 @error 兜底；确认 .illustration__heart 未被 ring 遮住。
- 修复类别：单页

### R6-L03-D03　P1 / 可达性　批次 R6-B82
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`7538905fd6b077e2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/index.vue:584`
- 理想图依据：无基准页，依据=取景清单本帧字段 sameAsTop=true / contentHash 与 top 帧逐字节相同（256754B）＋§3 页面对账总表（village 广场应有频道 Tab 与帖子流）
- 现象：bottom 帧与 top 帧像素完全相同（两帧 contentHash 均为 7538905fd6b077e2、256754B；逐点取样 y=60..800 中心列一致），滚到底 0 位移、0 新增内容——屏内除 LockScreen 外没有任何可滚模块，清单 scrollContentMeasurable=true 但实帧无内容可测。
- 建议改法：与 D01 同修（解锁判定）后重拍；若确认本页在锁定态就是 100vh 不可滚，请在取景侧把 bottom 帧标为不适用，别让它顶着一张同图当"已审"。
- 修复类别：单页

### R6-L03-D04　P3 / 颜色token　批次 R6-B06
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`e93820a9dc24ae6f`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:262`
- 理想图依据：无基准页，依据=规范文档§1.1 规则 3「一令牌一值，禁止私有色值」＋§1.2 页面底色 --c-bg-page #EEF7F2
- 现象：页底实测不是 --c-bg-page：中心列 x=189 在 y=60..170 连续 12 个取样点全部落在 #D3EDE2~#D5ECE1（比 #EEF7F2 深 26/10/13 个 RGB 单位），直到 y=790 才出现 #EEF7F2；源码 LockScreen.vue:255 自认「以下 4 处 rgba 氛围渐变…无对应 token，保留原值」，:262-266 是 4 条硬编码 rgba + :294-300 blur-avatar 品牌渐变叠加。
- 建议改法：给这 4 处氛围渐变补 --c-atmosphere-brand / --c-atmosphere-romance 令牌（值仍为现 rgba），使底色可被单一来源核对，消掉这笔已登记的令牌债。
- 修复类别：CSS/token

## subpackages/village/village/post（7 条）

### R6-L03-D11　P2 / 文案　批次 R6-B83
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__post__top.png`（sha16=`d1087d5ce1254631`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:889`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文输入区 placeholder（理想图逐字「分享一点最近发生的事…」）；post.vue 与 publish.vue 同属§3.14「统一发布页」族（规范文档第 146 行注明 post.vue 是旧发帖页保留兼容）
- 现象：正文输入框实测提示语「分享你的故事、心情或寻找那个TA…」（zh-CN.ts:2004，文字带 y≈243），理想图与同族 publish.vue:789 硬编码的都是「分享一点最近发生的事…」⇒ 同一个发布动作在两个页面上给两句不同的引导语，且都自称对齐发布帖基准图。
- 建议改法：post.vue 与 publish.vue 的 placeholder 收敛到同一个 i18n 键（village.post.contentPlaceholder），文案以理想图那句为准。
- 修复类别：单页

### R6-L03-D12　P3 / 文案　批次 R6-B83
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__post__top.png`（sha16=`d1087d5ce1254631`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:227`
- 理想图依据：素材/理想效果图/发布帖子页面.png「发布到」卡副标题只写成员数（「1.2w 成员」），可见范围仅出现在最下方「谁可以看」一行
- 现象：同屏两处「所有人可见」：目标卡副标题「默认公开 · 所有人可见」（y≈185）+ 「谁可以看 = 所有人可见」行（y≈705）。publish.vue:149-151 已按 R2b-L03-D18 把副标题改成「发布后进入广场」消除重复，post.vue 没跟改。
- 建议改法：post.vue:227 直接复用 publish.vue:151 的 targetSubtitle 口径（同批同文案）。
- 修复类别：单页

### R6-L03-D13　P3 / 颜色token　批次 R6-B83
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__post__top.png`（sha16=`f3477744bc15b112`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1247`
- 理想图依据：素材/理想效果图/发布帖子页面.png 右上「发布」胶囊（理想图为可用态 --c-brand #36C99A）＋规范文档§1.2 禁用 --c-status-disabled #DCE5E2
- 现象：空表单下「发布」胶囊取禁用底，实测取样框 x∈[190,265]、y∈[45,78] 主色 #DDE3E0（1220/1784 采样点），命中的是 --c-neutral-200（:1247 写的兜底值 #D8E2DE 与实际令牌值不符，属第二笔令牌债）；规范给禁用态的令牌是 --c-status-disabled #DCE5E2。同位 publish 帧因已输入而呈 #36C99A（正好等于 --c-brand，可用态无偏差）。
- 建议改法：:1247 改 var(--c-status-disabled)，并把 :1242/:1247 的兜底字面量同步成 tokens 现值，避免 fallback 与真值不一致。
- 修复类别：CSS/token

### R6-L03-D14　P3 / 可达性　批次 R6-B83
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`f3477744bc15b112`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1641`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部工具栏 5 组入口（图标+标签，整条带高约 190px@853）
- 现象：底部工具栏 5 个入口热区偏矮：本帧图标文字带实测 y=743..773 ⇒ 单项内容高 30px = 60rpx（.post-tool 只声明 flex 列 + gap 6rpx，无 min-height），低于全站 88rpx 最小可点高度；横向 5 等分 378px 每项 75.6px(150rpx) 达标 ⇒ 只有纵向不达标。
- 建议改法：.post-tool 加 min-height: 88rpx（或 padding: 14rpx 0），与同页 .publish-row 的命中区口径统一。
- 修复类别：单页

### R6-L03-D15　P2 / 间距　批次 R6-B83
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`f3477744bc15b112`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1512`
- 理想图依据：素材/理想效果图/发布帖子页面.png 四条功能行行距（理想 107rpx）
- 现象：本帧四行（添加话题/添加位置/提及好友/谁可以看）文字带中心 y=564/611/658/705 ⇒ 行距 47px = 93rpx，比理想图 121.5px = 107rpx 紧 13%；与 publish 帧实测 93rpx 完全一致 ⇒ 同一条 padding 值在两页各写一份（publish.vue:1142 / post.vue:1512），改一处漏一处。
- 建议改法：两处行高一起提到 107rpx 档并抽成同一个 --row-height 令牌（或共用 .form-row 基类）。
- 修复类别：CSS/token

### R6-L03-D16　P3 / 文案　批次 R6-B83
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`f3477744bc15b112`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1029`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部工具栏首项标签逐字「图片/视频」
- 现象：首项标签实测「图片」（y≈765..773 标签带第一格），理想图是「图片/视频」；本帧其余 4 格「话题/位置/提及/更多」逐字同理想图 ⇒ 5/5 标签中 1 处不一致，视频入口未标出也未实现。
- 建议改法：若确实不做视频，就把理想图基准改成「图片」并登记；否则标签改「图片/视频」并补视频选择分支。
- 修复类别：单页

### R6-L03-D17　P3 / 字号　批次 R6-B83
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`e4986af491fcc4da`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:56`
- 理想图依据：无该字段基准（理想图 发布帖子页面.png 无标题输入行），依据=规范文档§1.3 字体层级 + apps/client/src/constants/village.ts:24 POST_TITLE_MAX_LENGTH=30
- 现象：标题行计数实测「0/20」（top 帧 y≈215 右对齐），来自 :56 本地写死的 `const TITLE_MAX_LENGTH = 20`；共享常量 apps/client/src/constants/village.ts:24 是 30，且 :36 已 import POST_TITLE_MAX_LENGTH 却没用在这个输入框上 ⇒ 同一页两套标题上限，字号档也随 :879 的文本一起偏离规范 §1.3 辅助字档（实测计数文字带高 9px=18rpx，落在 --fs-xs 20rpx 以下）。
- 建议改法：:56 删除本地常量，:873/:879 统一改用 POST_TITLE_MAX_LENGTH；计数文字字号补 var(--fs-xs)。
- 修复类别：单页

## subpackages/village/village/publish（6 条）

### R6-L03-D05　P1 / 素材缺失　批次 R6-B84
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`e93820a9dc24ae6f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:766`
- 理想图依据：素材/理想效果图/发布帖子页面.png 左上「发布到」卡（理想图该位是一枚圆形真人头像，直径约 176px@853 宽）
- 现象：「发布到」头像位是一枚空心淡灰圆，里面什么都没有：取样框 x∈[15,60]、y∈[150,215]（n=2925 像素）最暗点仅 #F4F6F5、最亮点 #FFFFFF，即 0 个图像/字形像素；同族 post 帧同位（x∈[16,69]、y∈[149,229]）能取到 #808080 的占位字形。根因在 :58 `selfAvatar = profileStore.avatarUrl || IMAGE_PATHS.DEFAULT_AVATAR` 恒真 ⇒ :767 的 USER 占位分支永不触发，而 :766 是裸 `:src`（未包 resolveMediaUrl/SafeImage，违反 §1.6 铁律 3），真档下 avatarUrl 解析失败就只剩空圆。
- 建议改法：:766 改 `<image :src="resolvedSelfAvatar">` 并加 @error 回落 USER 字形；或把 :58 的兜底从 DEFAULT_AVATAR 改成空串，让 :767 的占位分支真正可达。
- 修复类别：单页

### R6-L03-D06　P2 / 文案　批次 R6-B84
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`e93820a9dc24ae6f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:846`
- 理想图依据：素材/理想效果图/发布帖子页面.png 第 3 功能行「添加位置」右值（理想图为具体地点「北京大学·未名湖校区」）
- 现象：「添加位置」行右值实测「位置选择即将开放」（zh-CN.ts:2017 locationHint，行中心 y≈566）——理想图这一格是已选好的位置文本；该行既无箭头（:834 裁定删）又无定位，等于把"功能没做"当业务信息常驻在发布表单里。
- 建议改法：位置能力落地前把该行整行 v-if 掉（与 :822 话题行的隐藏范式一致），别用陈述句占住理想图的信息位。
- 修复类别：需新建目标功能

### R6-L03-D07　P1 / 需新建　批次 R6-B84
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`fb294523630f8082`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1204`
- 理想图依据：素材/理想效果图/发布帖子页面.png 最底部常驻工具栏（图片/视频 · 话题 · 位置 · 提及 · 更多 5 组图标+标签）＋规范文档§3.14「底部工具栏（图/视频/话题/位置/提及/更多 6 图标）」
- 现象：整条底部工具栏在帧上不存在：publish 帧 y=700..814 只有发帖小贴士与 home indicator，0 个图标/标签；而 :1204-1212 的 .publish-toolbar / .publish-tool* CSS 齐全，:1199 注释自认「有 CSS 无 DOM」。同族 post 帧（post.vue:1020）DOM 与 CSS 都在，实帧 y=743..773 取到图标带+标签带 ⇒ 同一业务两页一有一无。
- 建议改法：按 post.vue:1020-1070 的 .post-toolbar 结构在 publish 模板补 DOM（复用现成 CSS），或明确废弃 publish 页并统一走 post.vue。
- 修复类别：需新建目标功能

### R6-L03-D08　P2 / 颜色token　批次 R6-B84
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`fb294523630f8082`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1034`
- 理想图依据：素材/理想效果图/发布帖子页面.png 整页白底 vs 规范文档§1.1 规则 1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」＋§1.2 --c-bg-page
- 现象：本帧整页底色 #FFFFFF（3px 步长采样 26563/33960 ≈ 78%），#EEF7F2 像素 0 个；同族 post 帧（post__top）实测 #EEF7F2 15198 采样点 + #FFFFFF 14009。两页都自称对齐"统一发布页"，底色却一个是纯白（:1032-1034 注释引 R16「页面背景统一纯白」裁定并显式拒绝 --c-bg-page）、一个是浅绿 ⇒ 发布链路内当场白/绿断层，两条定论互相打脸且无单一来源。
- 建议改法：先由主控裁定 §1.1 浅绿与 R16 纯白谁生效，再把 publish.vue:1034 与 post.vue 页面底同批改成同一个 var(--c-bg-page) 或 var(--c-bg-container)，禁止一页一值。
- 修复类别：CSS/token

### R6-L03-D09　P2 / 间距　批次 R6-B84
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`fb294523630f8082`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1142`
- 理想图依据：素材/理想效果图/发布帖子页面.png 四条功能行（添加话题/添加位置/提及好友/谁可以看）行距
- 现象：行距比理想图紧 13%：本帧四行文字带中心 y=519/566/613/660 ⇒ 行距 47px = 93rpx；理想图（853 宽）四行中心 y=1017/1138/1260/1382 ⇒ 121.5px = 107rpx。CSS 侧 :1142 `padding: 26rpx 32rpx` 只给到 92rpx 档，比理想图少一档（≈14rpx/行，四行累计少 56rpx，正好吃掉底部工具栏的高度）。
- 建议改法：.publish-row 上下内边距 26rpx → 33rpx（或行高改 --sp-8 档），与 post.vue:1512 同批改到同一来源。
- 修复类别：CSS/token

### R6-L03-D10　P3 / 文案　批次 R6-B84
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`d1087d5ce1254631`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:798`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文计数「0/1000」＋规范文档§3.14「正文输入（0/1000）」
- 现象：计数格实测「12/500」（右对齐 y≈407），上限 500；理想图与 §3.14 均为 1000。:21-22 注释说明这是把上限对齐 store 的 MAX_CONTENT_LENGTH=500（apps/client/src/constants/village.ts:18），也就是设计稿口径与工程口径二选一时改了工程侧却没回写设计基准。
- 建议改法：要么把 apps/client/src/constants/village.ts:18 提到 1000 并回归 store 校验，要么在 §3.14 与理想图注记里把 1000 改成 500，别留下"设计稿说 1000、页面说 500"的长期分歧。
- 修复类别：单页

## subpackages/village/village/tag-posts（query tagName=运动，identity A）（2 条）

### R6-L04-D01　P0 / 可达性　批次 R6-B85
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`d6f3c825323c498e`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:160`
- 理想图依据：无基准页，依据=规范文档 §3（标签聚合页应列出该标签下帖子）+ 种子库 database/flyway/sql/V2026.08.07.0024__seed_circle_posts_and_topics.sql:39,47 确有 tag='运动' 的帖子
- 现象：取景 query tagName=运动，real 档首屏请求 page=1（1 基），后端 RealPostTagService.java:105 直接 PageRequest.of(page,size)（0 基，控制器 PostTagController.java:70 注释「页码（从 0 开始）」）⇒ 前 20 条被整页跳过；帧上 y=98px（header 底边实测）以下 716px 全部是页面底色 #EEF7F2，只剩两行空态文案，一张帖子卡都没有。
- 建议改法：客户端请求体改 page=currentPageNum-1（或后端统一收 1 基并减一），使首屏落在 0 基首页。
- 修复类别：单页

### R6-L04-D04　P2 / 颜色token　批次 R6-B85
- 帧：`tmp/qa/frames/R6/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`d6f3c825323c498e`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:449`
- 理想图依据：无基准页，依据=规范文档 §1.2 配色方案（次要文字须可读）
- 现象：副文案「该标签下还没有内容」帧上最暗字形像素实测 #9AA4A0，压在页面底色 #EEF7F2 上对比度 2.35:1（远低于 4.5:1）；:449 把 $text-tertiary 映射到 --c-text-quaternary（兜底 #B8B8C8），:576 又把它用在正文级说明文字上，语义与深浅都错位。
- 建议改法：:576 改用 $text-secondary（--c-text-secondary），$text-tertiary 只留给角标/时间戳。
- 修复类别：CSS/token

