# R8 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=237　涉及页面=68　涉及帧=136　泳道卡=14
- 严重度分布：P2=136　P3=51　P1=50
- 轴分布：颜色token=47　位置=32　可达性=30　文案=24　素材缺失=22　层级遮挡=18　圆角=15　间距=13　尺寸比例=13　字号=10　需新建=7　空态文案=6
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0
- 批次归属：237 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/discover/index（2 条）

### R8-L01-D07　P1 / 颜色token　批次 R8-B10
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__discover__index__top.png`（sha16=`4c7220128fee9eec`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:271`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片右下「92% 匹配度」——理想图是一枚绿色圆环徽章；规范§1.2 亦规定「绿色=行动/成功，粉色=喜欢，两色禁止混用」
- 现象：匹配度徽章 `.match-card__score-ring` 底色写死 `--c-gradient-romance`（#FF6B81→#FF8DA1 粉），帧上「80% 匹配度」是粉色圆盘；理想图与规范都要求「匹配度」属绿色系（成功/在线语义），粉被越权用在了非「喜欢」指示上，颜色族整体错配
- 建议改法：将匹配度徽章改用绿色令牌（`--c-brand`/`--c-success`）或直接复用已存在的 `XunmiMatchRing.vue`（其 conic 渐变即 #36C99A→#55D5A7 绿色环），去掉 romance 粉
- 修复类别：CSS/token

### R8-L01-D08　P3 / 圆角　批次 R8-B22
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__discover__index__bottom.png`（sha16=`45253b11fa8d866d`）
- 源码证据：`apps/client/src/pages/discover/index.vue:497`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 右上角筛选漏斗图标与下方收藏心形——理想图均为裸线性图标、无圆形衬底
- 现象：`.discover-header__filter`（及同族 `.discover-header__fav`）被包成 72rpx(≈36px) 白底圆片（`border-radius:50%`+`background:--c-bg-container`+投影），帧上右上两枚图标各带一圈白色圆底；理想图这两枚是无衬底的裸图标，多出圆片改变了页头图标语言
- 建议改法：去掉筛选/收藏按钮的圆形白底与投影（transparent 背景），保留裸图标对齐理想图
- 修复类别：单页

## pages/home/index（2 条）

### R8-L01-D09　P1 / 素材缺失　批次 R8-B08
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__home__index__top.png`（sha16=`f284c6b290662fd8`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:127`
- 理想图依据：素材/理想效果图/首页.png「今日推荐」卡右下——理想图在签名/距离行与「看看TA/喜欢」按钮之间有一排 4 张小缩略图；规范§3.2 亦明列该卡含「4 张缩略图」
- 现象：今日推荐卡信息区从距离行（第123行）直接跳到 `.today-card__actions` 按钮行（第127行），中间没有任何缩略图节点；帧上卡片右下缺理想图那排 4 张 90rpx 级相册缩略图，整块内容缺失
- 建议改法：在 bio/distance 与 actions 之间补一段 `item.photos.slice(0,4)` 缩略图行（横排小图 + 圆角），对齐理想图与§3.2
- 修复类别：需新建目标功能

### R8-L01-D10　P3 / 文案　批次 R8-B07
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__home__index__bottom.png`（sha16=`ed80034fd167d440`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:265`
- 理想图依据：素材/理想效果图/首页.png「社区动态」帖底互动行——理想图分享动作在图标后带「分享」文字（点赞/评论为数字、分享为文字）
- 现象：帖子互动行 `.post-card__meta` 里点赞(第258行)、评论(第262行)都有 `<text>` 数值，唯独分享项(第264-266行)只渲染 `TB_SHARE` 图标、无「分享」文字；帧上帖底只显示两枚数字+一枚孤零零的分享图标，缺理想图的「分享」标签
- 建议改法：在分享 `stat-item` 图标后补 `<text>分享</text>`（走 i18n 键），与理想图帖底文案一致
- 修复类别：单页

## pages/login/index（2 条）

### R8-L01-D01　P2 / 颜色token　批次 R8-B23
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__login__index__top.png`（sha16=`e2010cd156ff0c4b`）
- 源码证据：`apps/client/src/pages/login/index.vue:1187`
- 理想图依据：素材/理想效果图/登录页面.png 按钮区第三档「稍后再看」——理想图里它是一枚明显浅灰填充的胶囊按钮（灰底与白色卡面对比清晰）
- 现象：`.btn-guest` 填充取 `--c-bg-surface`（#f7faf9），而所在页面底为 `--c-bg-page`（#eef7f2），ΔR9/ΔG3/ΔB7、对比度≈1.02:1，帧上「稍后再看」几乎看不出按钮轮廓，退化成一行裸灰字，丢了理想图那枚灰胶囊的按钮可供性
- 建议改法：把「稍后再看」填充从 `--c-bg-surface` 换成与页面底有档差的浅灰（如 `--c-neutral-100`/`--c-bg-surface` 加深一档），恢复理想图的灰胶囊边界
- 修复类别：CSS/token

### R8-L01-D02　P3 / 圆角　批次 R8-B23
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__login__index__bottom.png`（sha16=`c2f9ed16d669e9b4`）
- 源码证据：`apps/client/src/pages/login/index.vue:1078`
- 理想图依据：素材/理想效果图/登录页面.png 主按钮「微信一键登录」——微信图标为直接落在绿底上的白色图形，无衬底圆片
- 现象：主按钮内 `.btn-icon-wrap` 给微信图标套了一枚 44rpx(≈22px) 半透明白圆片（`rgba(255,255,255,0.25)`+`border-radius:50%`），理想图该位置只有裸白色微信图形、没有这层圆形衬底，帧上图标外围多出一圈浅色圆盘
- 建议改法：去掉 `.btn-icon-wrap` 的半透明圆底（或改 transparent），让微信图标与理想图一样直接压在绿色按钮上
- 修复类别：CSS/token

## pages/messages/index（4 条）

### R8-L02-D08　P1 / 位置　批次 R8-B24
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__messages__index__top.png`（sha16=`e1fabf431257810f`）
- 源码证据：`apps/client/src/pages/messages/index.vue:808`
- 理想图依据：素材/理想效果图/消息.png 左版页头：放大镜与「+」两枚图标贴页面右侧，右缘约在画布 93% 处
- 现象：页头 `padding-right: calc(var(--capsule-right,7px) + 104px)` 把右侧操作组整体左推，帧上「+」按钮右缘停在 x≈250（帧宽 378 的 66%），理想图对应右缘 x≈341（90%），右侧空出约 91px≈180rpx；页头标题行本身在 y≈85-120，已低于胶囊带（y≈28-60），无需再横向让位。
- 建议改法：去掉 104px 缓冲，只保留 32rpx 页边距；若仍需避让，改为按胶囊底缘抬高页头 padding-top。
- 修复类别：CSS/token

### R8-L02-D09　P2 / 颜色token　批次 R8-B24
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__messages__index__top.png`（sha16=`e1fabf431257810f`）
- 源码证据：`apps/client/src/pages/messages/index.vue:850`
- 理想图依据：素材/理想效果图/消息.png 左版页头右侧两枚操作件：无底裸图标（近黑描线放大镜 + 近黑「+」）
- 现象：帧上两枚按钮各带一块 72rpx（≈36px）正圆浅绿底 `--c-bg-surface #EEF7F2`，理想图此处没有任何圆底，图标直接压在白页头上；叠底后图标字形被压成灰绿，视觉权重反而高于标题「消息」。
- 建议改法：去掉 `background`（保留 72rpx 热区），图标描线取 `--c-text-primary`，与理想图裸图标口径一致。
- 修复类别：CSS/token

### R8-L02-D10　P2 / 空态文案　批次 R8-B24
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__messages__index__top.png`（sha16=`e1fabf431257810f`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1486`
- 理想图依据：素材/理想效果图/消息.png 左版登录墙所在区段：两张摘要卡均带完整文案（有人喜欢你 / 3 个人想认识你 / 去看看；正在等待回复 / 2 个聊天正在继续 / 去回复）
- 现象：游客态摘要卡占位「只放形状、无文案、无计数」，帧上 y≈245-340 两张卡内只有 64rpx 灰圆 + 两条灰条，y≈350-625 再接 4 行灰条——登录卡下方共 6 个纯灰块、0 个汉字，用户无法知道这些位置对应「喜欢/待回复/会话」，与 §3.6 的版式语义脱节。
- 建议改法：灰态占位保留形状的同时补静态文案槽（标题走既有 i18n 键、计数位写「登录后可见」），或整段换成 EmptyState 组件的一句说明。
- 修复类别：单页

### R8-L02-D11　P1 / 层级遮挡　批次 R8-B24
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__messages__index__bottom.png`（sha16=`7146c02d4c5fe913`）
- 源码证据：`apps/client/src/pages/messages/index.vue:786`
- 理想图依据：素材/理想效果图/消息.png 左版页头（标题「消息」+ 副标「今天也有新的心动在发生」为完整可读的两行）
- 现象：`.messages-page__top-scrim` 是 `position:fixed; z-index:9` 的白色渐变遮罩（82% 纯白→透明），而页头不是固定元素：底帧里页头升入 y≈50-78 后整块被这层白纱压住，「消息」标题上缘被裁、字形只剩约 40% 不透明度，副标「今天也有新的心动在发生」在 y≈70 处与状态栏时钟同带且几近不可读。
- 建议改法：遮罩高度收在状态栏 + 胶囊带内（top 0 → 约 y=60px）并降 z-index 到页头之下，或页头改 sticky 由遮罩垫底。
- 修复类别：单页

## pages/nearby/index（7 条）

### R8-L02-D01　P1 / 位置　批次 R8-B25
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__nearby__index__top.png`（sha16=`a70866155211a9cd`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:751`
- 理想图依据：素材/理想效果图/附近的首页.png 顶部标题行——右侧「发动态」绿色胶囊右缘贴页面右边距（与放大镜同排、位于画面最右）
- 现象：页头整行被 `padding-right: calc(var(--capsule-right,7px) + 120px)` 左推，帧上「发动态」右缘仅到 x≈228（帧宽 378 的 60%），理想图对应件右缘在 x≈352（93%），右侧留出约 124px≈246rpx 空白带；而页头行本身已位于系统胶囊下方（标题行 y≈70-95，胶囊 y≈28-66），横向避让属重复让位。
- 建议改法：页头行既已下移到胶囊之下，删除 120px 横向缓冲（改回 32rpx 页边距），使「发动态」右对齐至页面右缘。
- 修复类别：CSS/token

### R8-L02-D02　P3 / 文案　批次 R8-B25
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__nearby__index__top.png`（sha16=`a70866155211a9cd`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:411`
- 理想图依据：素材/理想效果图/附近的首页.png「热门兴趣圈」四卡人数行：`1.2w 人加入 / 8602 人加入 / 1.6w 人加入 / 1.1w 人加入`（精确值无千分位分隔符）
- 现象：帧上四张卡人数为「1.2w / 8,932 / 8,123 / 6,533」，同排混用「w 缩写」与「带千分位逗号的精确值」两种量纲；上一轮 R21 以「对齐理想图（1.2w / 8,932）」为名加了 `toLocaleString("en-US")` 的千分位，但理想图的精确值写作 8602 不带逗号——同一条轴修得不对。
- 建议改法：保留 ≥1w 折「w」的口径，千位段去掉千分位分隔符（`String(count)`），与理想图 8602 一致。
- 修复类别：单页

### R8-L02-D03　P2 / 空态文案　批次 R8-B25
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__nearby__index__top.png`（sha16=`a70866155211a9cd`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:442`
- 理想图依据：素材/理想效果图/附近的首页.png 标题下方定位行「北京大学 · 3km」（绿针 + 城市 + 距离）；无基准部分依据 deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3.5「定位行（城市 + 切换）」
- 现象：定位行为空时该行只渲染一枚灰针 + 「暂无位置信息」纯文本（帧 y≈113-128，x≈20-135），右侧与文本本身都没有任何可点件——既无理想图的城市值，也无 §3.5 要求的「切换」入口，用户无法从这一行恢复定位或换城市。
- 建议改法：空态下把该行升级为「暂无位置信息 · 开启定位 ›」的可点件（复用 goSearch 同级的 88rpx 热区口径），有城市时再补「切换」。
- 修复类别：单页

### R8-L02-D04　P2 / 需新建　批次 R8-B25
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__nearby__index__top.png`（sha16=`a70866155211a9cd`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:490`
- 理想图依据：无基准同区段（理想图《附近的首页》五宫格之后直接是热门兴趣圈），依据=规范文档§3.5「附近的人（按距离/同城分段 + 人卡列表）」
- 现象：「附近的人」分区在帧上（y≈225-380）只有两张跳转条（附近的人 / 同城的人，各含图标 + 标题 + 一句副标），§3.5 要求的分段控件与「人卡列表」在本页 DOM 里不存在——该分区实际是一个二级入口，不是内容区。
- 建议改法：在两张入口条下方补距离/同城分段 + 人卡横滑（复用 pages/people 既有卡片组件），无数据时给 EmptyState 而不是直接省略。
- 修复类别：需新建目标功能

### R8-L02-D05　P1 / 层级遮挡　批次 R8-B25
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__nearby__index__bottom.png`（sha16=`d02e3804d4c4cb01`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:421`
- 理想图依据：素材/理想效果图/附近的首页.png 热门兴趣圈四卡（圈名 + 人数两行文字完整可读，右上无任何遮挡件）
- 现象：页头写在 `scroll-view` 内（非固定导航），滚到底帧时第 4 张兴趣圈卡升入系统胶囊带：帧上胶囊占 x≈272-370 / y≈28-60，第 4 卡「运动」圈名与「6,533 人加入」位于 x≈262-345 / y≈20-40，文字右半被胶囊整块压住不可读。
- 建议改法：给本页加一条与状态栏等高的固定导航底板（或滚动后固定页头 + 顶部渐变遮罩），使内容永远停在胶囊带下方。
- 修复类别：单页

### R8-L02-D06　P2 / 颜色token　批次 R8-B25
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__nearby__index__bottom.png`（sha16=`d02e3804d4c4cb01`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1055`
- 理想图依据：素材/理想效果图/附近的首页.png 校园圈四卡：校名为近黑正文色、次行为浅灰，四张卡白底
- 现象：帧上四张校园圈卡（南京大学/浙江大学/复旦大学/武汉大学）的校名整行渲染为品牌绿 `--c-brand-600 #1F9A75`，次行城市又叠一层 `--c-brand-700 #2E8B6A`（:1063），卡片底再铺 `--c-brand-50` 浅绿（:1011）——同一张卡三层绿，理想图为「白底 + 近黑标题 + 灰副标」，卡内文字与卡底同色系导致层级读不出来。
- 建议改法：校名改 `--c-text-primary`、次行改 `--c-text-tertiary`，卡底保留白底，绿色只留给状态胶囊。
- 修复类别：CSS/token

### R8-L02-D07　P2 / 文案　批次 R8-B25
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__nearby__index__bottom.png`（sha16=`d02e3804d4c4cb01`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1051`
- 理想图依据：素材/理想效果图/附近的首页.png 校园圈四卡第二行为「3.2k 位同学 / 2.1k 位同学 / 1.1w 位同学 / 2.0k 位同学」
- 现象：帧上四张校园圈卡第二行渲染为城市名（南京 / 杭州 / 上海 / 武汉），理想图该行为同学数；城市是「省份级重复信息」（卡内已有校名含城市线索），把 §3.5 要求的「同学数」槽位占掉了。
- 建议改法：同学数字段接后端（或按学校维度的既有 count 字段）优先渲染「N 位同学」，字段缺失时整行留白而不是回填城市。
- 修复类别：单页

## pages/profile/index（6 条）

### R8-L02-D12　P2 / 素材缺失　批次 R8-B14
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__profile__index__top.png`（sha16=`877fead9fddd0244`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:83`
- 理想图依据：素材/理想效果图/未登录个人主页.png 顶栏右侧第一枚图标——2×2 四方格（空间分享/扫码）造型的近黑描线图标
- 现象：帧上顶栏右上第一枚图标是「手机」轮廓（取自 ICONS_EMOJI.MOBILE，帧内 x≈205-238 / y≈68-100），与理想图的四方格图标形状不同，且语义上「手机」在本页无任何指向（本页没有设备/绑定入口）。
- 建议改法：换用与理想图同形的 grid/QR 素材（或复用已登录态 MyHeader 的分享图标），MOBILE 素材从本页摘除。
- 修复类别：需新建目标功能

### R8-L02-D13　P3 / 颜色token　批次 R8-B14
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__profile__index__top.png`（sha16=`877fead9fddd0244`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:256`
- 理想图依据：素材/理想效果图/未登录个人主页.png 顶栏左侧返回 ‹：浅灰白细箭头（弱化处理），右侧两枚图标为近黑
- 现象：帧上返回 ‹ 字形为品牌绿 `#36C99A`（x≈22-46 / y≈70-92），右侧两枚却是 `#6B7571` 灰（:262），同一排三个图标两种色语义；理想图返回件是弱化灰白、右侧两枚才是重黑，本页正好反了。
- 建议改法：返回 ‹ 改 `--c-text-tertiary`，右侧两枚改 `--c-text-primary`，与理想图明暗关系对齐。
- 修复类别：CSS/token

### R8-L02-D14　P1 / 需新建　批次 R8-B14
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__profile__index__top.png`（sha16=`877fead9fddd0244`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:308`
- 理想图依据：素材/理想效果图/未登录个人主页.png 头像行右侧白底胶囊「编辑资料」（规范§3.8 亦写明「右侧白底绿字『编辑资料』」）
- 现象：游客态头部右侧渲染的是一枚 44rpx 的「›」箭头（帧上 x≈344-356 / y≈146-160），整个 NotLoggedProfile 模板里没有「编辑资料」节点——理想图与规范要求的白底绿字胶囊入口在本页完全缺失，游客无法从「我的」进入资料填写，只能靠底部那颗「登录」。
- 建议改法：在 header 右侧补白底绿字「编辑资料」胶囊（复用 MyHeader 同档 88rpx 热区），游客态点击走既有登录引导。
- 修复类别：需新建目标功能

### R8-L02-D15　P2 / 颜色token　批次 R8-B13
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__profile__index__bottom.png`（sha16=`e4242b4c6c89450f`）
- 源码证据：`apps/client/src/components/profile/mine/MyMore.vue:60`
- 理想图依据：素材/理想效果图/未登录个人主页.png「更多功能」四枚图标：无底深灰描线（星形 / 对话搜索 / 图片 / 徽章齿轮），无任何彩色圆底
- 现象：帧上「更多功能」四枚图标各压一层 `${iconTint}22` 彩色圆底（橙 / 紫 / 粉 / 紫，x≈30-350 / y≈415-470），理想图为无底裸图标；叠底后四枚图标由理想图的统一深灰变成四种彩色，与上方「我的互动」列表的粉色圆底连成一片，模块之间失去区分。
- 建议改法：游客态与理想图对齐——去掉圆底、图标统一 `--c-text-secondary`，彩色底只保留给「我的互动」列表。
- 修复类别：CSS/token

### R8-L02-D16　P2 / 位置　批次 R8-B14
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__profile__index__bottom.png`（sha16=`e4242b4c6c89450f`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:600`
- 理想图依据：素材/理想效果图/未登录个人主页.png 页面尾部：「更多功能」卡之后直接是 tabBar，无任何通栏按钮
- 现象：帧上「更多功能」卡下方多出一枚通栏实心绿按钮「登录」（x≈14-364 / y≈688-740，高 92rpx + 32rpx 上距），理想图没有这一条；它与头部「点击登录」构成同一动作的两处入口，并把页面整体拉长约 124rpx，使「更多功能」卡被顶到接近首屏折叠线以下。
- 建议改法：移除通栏登录条（登录入口收敛到头部「点击登录」+ D14 新增的「编辑资料」），或按理想图把它换成白底绿字胶囊放在头部行内。
- 修复类别：单页

### R8-L02-D17　P1 / 层级遮挡　批次 R8-B14
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__profile__index__bottom.png`（sha16=`e4242b4c6c89450f`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:229`
- 理想图依据：素材/理想效果图/未登录个人主页.png 顶栏常驻（‹ + 两枚图标固定在最上方，任何滚动位置下方内容都不与系统胶囊同带）
- 现象：`.nlp-topbar` 是文档流元素（非 fixed/sticky），底帧滚到「我的故事」时第 4 枚虚线卡的「添加故事」标签升到 y≈32-46 / x≈300-362，与系统胶囊（x≈272-370 / y≈28-60）几乎完全重叠，标签右半被胶囊盖住；这正是上一轮 R2b-L03-D07 把 fixed 登录条改成文档流后，同一轴换个元素继续存在。
- 建议改法：给本页加固定导航底板（含状态栏高度 + 胶囊带），或给滚动内容加顶部 white 遮罩层并把 z-index 排在内容之上、胶囊之下。
- 修复类别：单页

## pages/register/index（2 条）

### R8-L01-D03　P2 / 圆角　批次 R8-B26
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__register__index__top.png`（sha16=`b97d6f77a36e9596`）
- 源码证据：`apps/client/src/pages/register/index.vue:1176`
- 理想图依据：无基准，依据=规范文档§1.4 圆角令牌 + 全站主按钮口径（login/index.vue `.btn-primary` 与 success.vue `.reg-success__btn` 均已用 `--r-full` 胶囊，R6-L01-D05 明确「与全站主按钮同调」）
- 现象：主 CTA「注 册」`.submit-btn` 圆角写死 `24rpx`(≈12px)，在 96rpx 高的按钮上呈圆角矩形；而登录/注册成功两页主按钮都是 `--r-full` 全胶囊，同一「主按钮」角色在注册页少了胶囊化，帧上注册按钮明显比另两页方
- 建议改法：将 `.submit-btn` 的 `border-radius:24rpx` 改为 `var(--r-full)`，与 login/success 主按钮统一为胶囊
- 修复类别：CSS/token

### R8-L01-D04　P2 / 颜色token　批次 R8-B26
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__register__index__bottom.png`（sha16=`2523a5fb66cf84eb`）
- 源码证据：`apps/client/src/pages/register/index.vue:1191`
- 理想图依据：无基准，依据=规范文档§1.2 配色（禁用态需保持标签可读）+ §1.4 令牌；对照同表单其它控件均走 `var(--c-*)`
- 现象：空表单时 `.submit-btn--disabled` 只把背景换成 `--c-status-disabled`(#dce5e2) 浅灰，但 `.submit-btn__text` 仍是 `--c-text-inverse`(#ffffff) 白字（第1187行），白字压 #dce5e2 浅灰底对比度≈1.18:1，帧上「注 册」二字几乎不可辨
- 建议改法：给 `.submit-btn--disabled .submit-btn__text` 覆盖为次级字色（如 `--c-text-placeholder`/`--c-text-tertiary`），保证禁用态标签仍可读
- 修复类别：CSS/token

## pages/register/success（2 条）

### R8-L01-D05　P2 / 圆角　批次 R8-B27
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__register__success__top.png`（sha16=`4d077bae6bc13c3c`）
- 源码证据：`apps/client/src/pages/register/success.vue:92`
- 理想图依据：无基准，依据=规范文档§1.4 圆角令牌 + 本页其余表面（清单卡 `border-radius:40rpx`、CTA 胶囊）的圆角语言
- 现象：顶部吉祥物插图 `.reg-success__img` 为 472rpx(≈238px) 方形、无 `border-radius`，帧上是一块直角硬边的浅色方块压在绿色页底上，与本页 40rpx 圆角卡片、胶囊按钮的圆角语言冲突，形成生硬方框
- 建议改法：给 `.reg-success__img` 加 `border-radius`（对齐卡片 40rpx 或裁圆），或换用透明/圆角版插图，消除硬方边
- 修复类别：CSS/token

### R8-L01-D06　P3 / 间距　批次 R8-B27
- 帧：`tmp/qa/frames/R8/real-f0677920/pages__register__success__bottom.png`（sha16=`4d077bae6bc13c3c`）
- 源码证据：`apps/client/src/pages/register/success.vue:98`
- 理想图依据：无基准，依据=规范文档§1.4 间距令牌；对照同页纵向节奏（清单卡 `margin-top:48rpx`、CTA `margin-top:56rpx`）
- 现象：「注册成功」标题 `.reg-success__title` 与上方 472rpx 插图之间只有 `margin-top:8rpx`(≈4px)，而本页下方各区块间距为 48/56rpx，帧上标题紧贴插图底边、上方留白明显不足，纵向节奏失衡
- 建议改法：将标题 `margin-top` 从 8rpx 提到 `--sp-4`/`--sp-5`（约 24–32rpx），与页面其它区块间距同档
- 修复类别：CSS/token

## subpackages/campus/campus/certification（3 条）

### R8-L05-D12　P2 / 素材缺失　批次 R8-B28
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`b7a1b9f1cfd978e8`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:650`
- 理想图依据：无基准，依据=组件规范（SafeImage 尺寸须走 root-class，见 SafeImage.vue:4/:69）+ 规范文档 §1.5 组件库清单
- 现象：三处 SafeImage custom-class 图标在帧上零像素：说明卡左上 44rpx 校徽（:650）——「为什么要认证?」标题实测顶缘 y≈148px，正好等于卡顶 120px + 内边距 16px，22px 图标盒 + 6px 下边距完全没占位；两处上传框 56rpx 相机（:748）——「点击上传学生证照片」文字顶缘 y≈620px 紧接 60rpx 内边距（:728），相机位同样空掉，上传框只剩两行字。同页裸 `<image>` 的状态图标（:288）正常出图，反差坐实是 custom-class 丢失。
- 建议改法：同 R8-L05-D01，尺寸改走 SafeImage 的 root-class/custom-style。
- 修复类别：单页

### R8-L05-D13　P2 / 层级遮挡　批次 R8-B28
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`b7a1b9f1cfd978e8`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:272`
- 理想图依据：无基准，依据=规范文档 §1.6 mp-weixin 渲染铁律（自定义导航须避让刘海）+ 同分包 topic-detail/campus index 页头实测基线
- 现象：页头 paddingTop 由 :272 的内联 `calc(${statusBarHeightPx}px + var(--sp-6))` 决定，帧上「学生认证」字面上缘实测 y≈40px，而刘海黑块下缘 y≈42px ⇒ 标题顶笔被刘海切掉约 2px；同页「返回」胶囊顶 y≈42px。横向 x≈155..225 正落在刘海 x 区间 95..285 内。同分包 topic-detail 标题顶缘 y≈62px、campus/index 校名顶缘 y≈55px，本页比基线高出 13~22px。
- 建议改法：内联 padding-top 与 :488 类样式二选一（保留类侧 var(--statusbar)），并给标题带补到 statusbar + 44rpx，与同分包其余页对齐。
- 修复类别：单页

### R8-L05-D14　P2 / 文案　批次 R8-B28
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`156b132b30e6cba0`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:397`
- 理想图依据：无基准，依据=规范文档 §3 逐页说明的字段级说明口径（每个表单项的 hint 须描述本项）
- 现象：「学信网截图」上传项的提示复用了「学信网验证码」输入项的同一个 key `campus.certification.chsiHint`（:383 与 :397 两次调用），帧上两张卡的副标题逐字相同：「选填：提供学信网在线验证码或学历截图可加快审核」——出现在 y≈428（验证码卡）与 y≈528（截图卡）。截图卡下的这句话既没说明截图要求（清晰度/包含姓名学号），又把用户指回另一个字段。
- 建议改法：给截图项新建 chsiScreenshotHint（如「选填：上传 PDF 或网页截图，需含姓名与毕业院校」），两卡不再共用一个 key。
- 修复类别：单页

## subpackages/campus/campus/hub（2 条）

### R8-L04-D09　P3 / 文案　批次 R8-B21
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`3f4a0fd680023f9d`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3639`
- 理想图依据：素材/理想效果图/校园圈.png（顶部认证引导横幅副标题行）
- 现象：引导横幅副标题实际为「完成学校认证，即可加入该校专属校园圈」（zh-CN.ts:3639），理想图 校园圈.png 该行文案是「认证学校后可加入专属校园圈」，措辞不一致（多出「完成…即可…该校」）。
- 建议改法：将 guideDesc 词条改为理想图口径「认证学校后可加入专属校园圈」。
- 修复类别：单页

### R8-L04-D10　P2 / 位置　批次 R8-B29
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`fbef223592c6d486`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:743`
- 理想图依据：素材/理想效果图/校园圈.png（未认证徽标恒在校名同一行右侧）
- 现象：下滚帧里「中国人民大学圈 / 复旦大学圈 / 上海交通大学圈 / 同济大学圈」的「未认证」徽标被换到校名下方第二行（徽标起点 y 比校名低约 40px），而理想图 校园圈.png 对同样长的「中国人民大学圈」仍把徽标留在名行右侧；上一轮 R6-L05-D25/D30 为防校名截断放开整行换行（:743「badge 让到第二行」），结果偏离理想图。
- 建议改法：校名行按理想图给徽标预留固定右侧槽位、校名超长用省略号，徽标不换行下沉。
- 修复类别：CSS/token

## subpackages/campus/campus/index（5 条）

### R8-L05-D01　P2 / 素材缺失　批次 R8-B30
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`5cb12fdb6ee6d17d`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:572`
- 理想图依据：无基准，依据=组件规范（SafeImage.vue:4 根节点 width/height:100%，尺寸须走 root-class）+ 规范文档 §1.5 组件库清单「基础 common」
- 现象：两处 SafeImage 图标在帧上零像素——页头校名左侧 40rpx 校徽（:480）与认证引导卡左侧 64rpx 校徽（:572）都没渲染：页头返回键右缘 x≈44px 与「北京大学」左缘 x≈48px 之间只剩 4px 呼吸（应再塞下 20px 图标 + 6px gap）；引导卡标题「完成学生认证，解锁校园专区」左缘 x≈28px = 卡左缘 14px + 内边距 14px，图标盒完全没占位。同页用裸 `<image>` 的返回箭头（:265）与 8 片封面（:312）全部正常出图，只有 custom-class 走 SafeImage 的丢失。
- 建议改法：把尺寸从 custom-class 挪到 SafeImage 的 `root-class`（组件已有该 prop，SafeImage.vue:69）或直接 custom-style 内联 40rpx/64rpx。
- 修复类别：单页

### R8-L05-D02　P2 / 可达性　批次 R8-B30
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`5cb12fdb6ee6d17d`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:510`
- 理想图依据：无基准，依据=规范文档 §1.2 色板表第 8 行「兴趣紫 --c-purple #A29BFE：用途＝未认证·兴趣分类」
- 现象：「未认证」徽章底取 --c-overlay-bg-light = rgba(255,255,255,0.2)（design-variables.scss:739），字取 --c-text-inverse → --c-overlay-text-primary = rgba(255,255,255,0.95)（:369/:739），即 95% 白字压在 20% 白罩上，合成底 ≈#71D6B7、字面 ≈#F5FAF8，实测对比度 ≈1.6:1，远低于 4.5:1；帧上 x≈152..208 / y≈57..75 这块胶囊几乎与渐变头图糊成一片。规范给「未认证」这个角色定的是紫 #A29BFE，本页没取。
- 建议改法：`.cert-badge--unverified` 底改 --c-purple 浅底、字改 --c-text-primary（或 brand-700 深色字），别再叠两层半透明白。
- 修复类别：CSS/token

### R8-L05-D03　P2 / 位置　批次 R8-B30
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`887f1e8caf34e4a1`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:808`
- 理想图依据：无基准，依据=组件规范（列表卡页脚应为「头像＋昵称」左组 + 互动数右组）+ 规范文档 §1.4 卡片内边距 32rpx
- 现象：话题卡页脚 `.topic-card__footer`（:795 space-between）里作者头像走 `<SafeImage custom-class="topic-card__avatar">`，40rpx/flex-shrink:0 落在内层 image 上、组件根仍是 width:100%（SafeImage.vue:309），于是页脚左边多出一个不可见的弹性宽盒：帧上「远山」左缘实测 x≈168px(333rpx)，被推到卡片水平居中，而卡片左内边距只有 x≈28px——昵称与页头标题「高数期中复习资料分享」左缘错位 ≈140px，且完全看不到头像。
- 建议改法：同 D01 改走 root-class 让头像盒锁定 40rpx，昵称紧随其后左对齐。
- 修复类别：单页

### R8-L05-D04　P2 / 颜色token　批次 R8-B30
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`887f1e8caf34e4a1`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:626`
- 理想图依据：无基准，依据=规范文档 §1.1 原则 1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」
- 现象：分类 Tab 条 `.category-tabs` 底取 --c-bg-container(#FFFFFF) 且横向无外边距，帧上是一条从 x=0 铺到 x=378、y≈395..450（高 ≈55px/109rpx）的整幅纯白横带，把上方浅绿推荐卡与下方浅绿话题卡之间的页面底色切成两段白/绿断层；同页其余卡（引导卡 :564、话题卡 :732）都是 24rpx 外缩的圆角白卡，唯独这条通铺。
- 建议改法：Tab 条底色改 --c-bg-page（或去掉容器底色、只留各 chip 的 $bg-page 底），保持页面单一浅绿底。
- 修复类别：CSS/token

### R8-L05-D05　P3 / 层级遮挡　批次 R8-B30
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`887f1e8caf34e4a1`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:1002`
- 理想图依据：无基准，依据=规范文档 §1.2（封面叠字范式）+ §5 素材表（circle-cover-*@3x 1120×840 满幅封面）
- 现象：R7-L05-D02 补的底部渐变蒙层过头：`.cert-recommend__label` padding 26rpx/6rpx + 22rpx 字身 ≈ 63rpx 高，且 0%→60% 段是满强 rgba(15,23,42,0.7)，而瓷片总高只有 120rpx（:971）——帧上实测暗带 ≈30px 高 / 瓷片 63px 高 = 48%，八片封面近一半面积被死灰罩盖住，「摄影」的相机、「宠物」的金毛只剩上半截可辨。
- 建议改法：暗带压到 ≤36rpx（padding-top 收到 8rpx、满强段止于 30%），或把瓷片高从 120rpx 抬到 ≥160rpx 让蒙层占比回到 HotTopicsSection 的 1/4 量级。
- 修复类别：单页

## subpackages/campus/campus/post-topic（3 条）

### R8-L05-D06　P2 / 位置　批次 R8-B31
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`7c94074192cd2196`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:636`
- 理想图依据：无基准，依据=规范文档 §3.14（发布页导航：标题居微信导航规范位）+ 同分包 topic-detail.vue:404 / certification.vue:489 页头标题实测均居中于 x≈189px
- 现象：页头 `padding-right: calc(var(--capsule-right,7px) + 104px)` ≈111px 而 padding-left 只有 32rpx(16px)，space-between 三段布局被整体左挤：帧上「发布话题」中心实测 x≈140px，偏离视口中线 189px 约 49px(97rpx)，是同分包四页里唯一不居中的标题；右侧「发布」胶囊右缘 x≈262px，与胶囊按钮之间留下 ≈100px 空带。
- 建议改法：标题改绝对居中（左右各留 --capsule-right 安全区或用 grid 1fr auto 1fr），别用 padding-right 把三段流一起推左。
- 修复类别：单页

### R8-L05-D07　P3 / 间距　批次 R8-B31
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`7c94074192cd2196`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:712`
- 理想图依据：无基准，依据=规范文档 §1.4「页边距 --page-padding = 32rpx = 16px」
- 现象：正文容器 `.post-body { padding: 24rpx }` = 12px，比规范页边距少 8rpx；帧上四张表单白卡（选择分类/话题标题/话题内容/上传图片）左缘实测 x≈12px，而同页页头「取消」按钮左缘 x≈16px（:633 用的 32rpx）⇒ 同一根轴上上下错开 4px(8rpx)，白卡比页头宽出一圈。
- 建议改法：`.post-body` padding 改 `24rpx var(--page-padding)`，与页头同轴。
- 修复类别：CSS/token

### R8-L05-D08　P2 / 可达性　批次 R8-B31
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`7c94074192cd2196`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:643`
- 理想图依据：无基准，依据=组件规范（页头按钮标签在渐变头图上须 ≥4.5:1）+ R7-L05-D03 同页同族收口口径
- 现象：上一轮 R7-L05-D03/D04 只把右侧「发布」改成了实底白胶囊＋深色字（帧上已可读），左侧「取消」仍是老配方：底 --c-overlay-white-bg-mid-strong = rgba(255,255,255,0.25)（:643）+ 字 --c-text-inverse = rgba(255,255,255,0.95)（:656），合成底 ≈#7AD8BA、字面 ≈#F7FBFA，实测对比度 ≈1.7:1，帧上 x≈18..62 / y≈52..78 的「取消」两字与绿→粉渐变头几乎同明度。同一条轴同一族现象，本页只收了一半。
- 建议改法：「取消」与「发布」取同一套实底/深字令牌（实底白 + --c-text-secondary），别再留半透明白叠白字。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（3 条）

### R8-L05-D09　P2 / 可达性　批次 R8-B32
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`24d40328dd1af701`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:412`
- 理想图依据：无基准，依据=组件规范（页头返回须与渐变头图拉开明度差）+ R7-L05-D03 已在本仓认定的同类缺陷口径
- 现象：页头「返回」胶囊底 --c-overlay-white-bg-mid-strong = rgba(255,255,255,0.25)（:412），字 --c-text-inverse（:761），压在 :405 的绿→粉渐变上：帧上实测胶囊区 x≈18..62 / y≈52..76，字面与底几乎同明度，对比度 ≈1.8:1（<4.5:1），是整页唯一的全站导航出口却最难读。
- 建议改法：底改实底白（--c-bg-container）＋字改 --c-text-secondary，或整块换成 --c-purple/--c-brand 深底白字。
- 修复类别：CSS/token

### R8-L05-D10　P3 / 文案　批次 R8-B32
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`24d40328dd1af701`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:329`
- 理想图依据：无基准，依据=组件规范（EmptyState actionText 应给出下一步动作，而非重复导航）
- 现象：同一屏出现两枚字面完全相同的「返回」——页头左上 x≈18..62/y≈52..76 一枚，空态绿色主按钮 x≈155..222/y≈470..515 又一枚（:329 取 zh-CN.ts:3615 "backText": "返回"），两者都走 goBack；空态主按钮作为页面唯一 CTA 却没有说明去向，用户读到的是同一词重复两次。
- 建议改法：空态按钮改「返回校园话题」之类带去向的文案，或 :hide-action 只留页头导航。
- 修复类别：单页

### R8-L05-D11　P3 / 需新建　批次 R8-B02
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`3a866e59a70ba569`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:53`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue §1.1 原则 4「emoji/占位一律替换为标准 SVG」+ 规范文档 §5.2「仍缺素材」清单未登记空态插画
- 现象：`no-data` 预设没有专属插画，直接复用搜索放大镜 ICONS_COMMON.SEARCH（:53），帧上 y≈375..425 那枚放大镜既不是「话题被删除」的语义图形、也不是插画；且该资产是位图 PNG，其私有色 #94A3B8 靠 :163 的 `filter: grayscale(1) brightness(0.7)` 事后染色，渲染出的图标偏灰死、与同块 --c-text-secondary 标题不同系。
- 建议改法：为 no-data 出一张标准 SVG 空态插画并登记进 §5.2 缺素材清单，撤掉 filter 染色兜底。
- 修复类别：需新建目标功能

## subpackages/chat/chat-session/index（2 条）

### R8-L11-D11　P2 / 空态文案　批次 R8-B33
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`e746f0898f3a5567`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2057`
- 理想图依据：无基准，依据=规范文档§3.7 聊天会话（组件清单含 ChatHeader/ChatInput/MatchGreetingTip 等，异常态应走 common 组件）+ `src/components/common/` 有 ErrorState.vue 可用
- 现象：整页兜底态只有一行裸文本「缺少会话标识，请从聊天列表或匹配结果进入。」（实测墨迹 x=15..249 / y=106..118，h=13px，色 --c-text-secondary），无图标、无卡片、无层级，且同页已存在专用于错误提示的 `.meta-copy--warning`（:2792，--c-error + font-weight 600 + 居中）却没有挂上；common 的 ErrorState/EmptyState 也未复用。
- 建议改法：错误分支改挂 `<ErrorState>`（或至少补 `meta-copy--warning` 类），保留返回动作。
- 修复类别：单页

### R8-L11-D12　P2 / 位置　批次 R8-B33
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`e746f0898f3a5567`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2069`
- 理想图依据：无基准，依据=规范文档§3.7 聊天会话布局（消息流为 flex:1 主体区，提示内容应落在该区内）
- 现象：错误文本贴在滚动区最上沿：头部下沿 y≈88 → 文本 y=106..118 → 底部输入区上沿 y≈729，可用空区高约 634px，文本中心 y≈112 比该区光学中心 y≈412 高 300px，其下 611px 全为空底（实测 #EEF7F2 平色，x=189 于 y=200/400/600/700 四点同值）。页面已为消息流空态写了居中配方 `chat-list--empty`（:2069 与 :2063 注释），但 `meta-copy` 错误分支不在该配方覆盖范围内。
- 建议改法：给错误分支同样套居中容器（复用 `chat-list--empty` 的 flex 居中口径），使提示落在滚动区视觉中心。
- 修复类别：单页

## subpackages/chat/official-chat/index（3 条）

### R8-L11-D13　P2 / 可达性　批次 R8-B34
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`f395e68dd5152442`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:797`
- 理想图依据：无基准，依据=规范文档§1.2（时间戳/弱说明层级应为 --c-text-tertiary #6B7571 或 --c-text-placeholder #9AA39F）+ §1.3 小字层
- 现象：消息时间戳「8月26日 06:16」用私有色值 `color: #bbb`（22rpx=11px 小字），实测该字串墨迹（x=155..223 / y=464..473）最暗像素仅 #C7CAC8，与页面底 #EEF7F2 的对比度约 1.5:1（按 #BBBBBB 纯值算也只有 1.73:1），远低于 4.5:1 正文门限；同帧气泡正文墨迹到 #424343 级，反差被拉到不可读。
- 建议改法：`color: #bbb` 改 `var(--c-text-tertiary)`（#6B7571，约 4.6:1）。
- 修复类别：CSS/token

### R8-L11-D14　P2 / 颜色token　批次 R8-B34
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`f395e68dd5152442`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:707`
- 理想图依据：无基准，依据=规范文档§1.1 规则 1/3（主题底色统一浅绿 #EEF7F2，禁止私有色值）+ §1.2 输入底 --c-bg-surface
- 现象：英雄区渐变收尾色是冷灰 `#f5f6f8`，实测在 x=30/y=264..268 处为 #F4F6F7→#F5F6F8（B>R 的冷灰），紧邻其下的消息区底为 #EEF7F2（y=272 起，G>R<B 的浅绿）——两带之间形成一条 8px 高的灰→绿断层带，正是本页 :582 注释声明要消除的「覆盖全局渐变、统一浅薄荷底」的反例。
- 建议改法：渐变末段改回浅绿族（如 #E8FAF3→#F0FDF5→#EEF7F2），与消息区底色同令牌。
- 修复类别：CSS/token

### R8-L11-D15　P2 / 颜色token　批次 R8-B34
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`f395e68dd5152442`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:757`
- 理想图依据：无基准，依据=规范文档§1.2 文本层级（主文本 --c-text-primary #1A1E1C / 次文本 --c-text-secondary #4A524E）+ §1.1 规则 3「一令牌一值，禁止私有色值」
- 现象：英雄区两行文字全用私有色值：标题 `.hero-greeting` `color: #222`（:744，实测墨迹最深 #000000 级、比令牌 #1A1E1C 更硬）、描述 `.hero-desc` `color: #666`（:757，实测墨迹 #424343 级，比 --c-text-secondary #4A524E 偏灰且丢了绿相），与同帧气泡正文（走令牌）形成两套文本灰阶。
- 建议改法：`#222`→`var(--c-text-primary)`、`#666`→`var(--c-text-secondary)`。
- 修复类别：CSS/token

## subpackages/circles/circles/circle-home（2 条）

### R8-L04-D07　P1 / 位置　批次 R8-B35
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`c7df139edcc822ba`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:489`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png（顶部：圈名/人数/加入按钮为白字直接压在深色封面图上）
- 现象：理想图里「摄影圈 / 用镜头记录… / 1.2w 人加入 / 加入圈子」是白色文字叠在高封面（封面约占帧高 55%）上；本页把这些内容放进封面下方一张独立白卡 .info-card（:489，仅 margin-top:-96rpx 上抬压住封面底沿），封面被压成约 222px（440rpx，帧高约 27%）的窄带，顶部构图与理想图/规范§3.11 相反。
- 建议改法：抬高 hero 至约 55% 并把圈名/人数/加入以白字叠于封面上（info-card 内容并入 hero），仅保留 feed 面板为白卡。
- 修复类别：单页

### R8-L04-D08　P2 / 层级遮挡　批次 R8-B35
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`9450772a55792d0f`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:959`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png（滚动后内容应始终从状态栏下方穿过）
- 现象：下滚帧里帖子标题「微单镜头…」与正文「预算 2000…」出现在状态栏带内、与系统时间「0:53」同高叠印；吸顶 .tabs 的 top 只扣 --statusbar（:959），其上方状态栏带无同色不透明底，滚动内容从该带透出（与 hub 的 R2b-L05-D14 同类问题）。
- 建议改法：给吸顶区补一条高=状态栏+胶囊、同色不透明的头部带，令 feed 恒从其下方穿过、状态栏带不留裸内容。
- 修复类别：单页

## subpackages/circles/circles/index（6 条）

### R8-L03-D19　P1 / 位置　批次 R8-B36
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f9297ee316e12a10`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:669`
- 理想图依据：兴趣圈列表.png 卡片标题行——「热门」角标紧贴圈名右缘（角标实测 x363..402，圈名右缘约 x355，间距≈8px≈7rpx）
- 现象：.circle-card__name 上的 flex:1 把角标推到行尾，实测圈名「摄影圈」墨迹 x96..146 而「热门」角标在 x271..296 ⇒ 名称与角标之间空出 125px（248rpx），角标改与右侧「加入」按钮（x312..352）成一组。
- 建议改法：去掉 .circle-card__name-row 内名称的 flex:1（改 max-width + ellipsis），让角标按 gap:10rpx 紧跟圈名。
- 修复类别：CSS/token

### R8-L03-D20　P1 / 素材缺失　批次 R8-B36
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f9297ee316e12a10`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:462`
- 理想图依据：兴趣圈列表.png 卡片左侧封面为实拍照片（摄影/旅行/音乐三张实测均值饱和度 0.305–0.488、明度 0.325–0.552）
- 现象：前四张卡（摄影/旅行/音乐/运动）封面实测均值饱和度仅 0.095–0.128、明度 0.858–0.919（近白），而同页第五张美食圈走另一套 png 实测 0.284/0.714 ⇒ 帧上前四张是淡彩占位插画，与理想图同位实拍图不对题、发白。
- 建议改法：为四张 circle-cover-*.jpg 换成与理想图同题材的实拍封面（或改映射到已存在的饱和 png）。
- 修复类别：单页

### R8-L03-D21　P2 / 颜色token　批次 R8-B36
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f9297ee316e12a10`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:913`
- 理想图依据：兴趣圈列表.png 分类 chips 行——未选中 chip 为浅灰胶囊（实测 #F5F6F6）与白卡（#FEFEFE）有明度差，选中为绿底白字
- 现象：未选中 chip 底色取 --c-bg-container（实测 #FFFFFF），与卡片底色同一值（实测卡面 #FFFFFF，色差 0），仅靠 1rpx 边框区分；理想图两者相差约 10 个明度级（#F5F6F6 vs #FEFEFE）。选中态 #36C99A 与令牌一致无问题。
- 建议改法：未选中底色改 var(--c-bg-surface, #F3FAF6) 或新增中性灰 chip 令牌，与卡面拉开一档。
- 修复类别：CSS/token

### R8-L03-D22　P3 / 位置　批次 R8-B36
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f9297ee316e12a10`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:383`
- 理想图依据：兴趣圈列表.png 标题行右端——放大镜贴屏右缘（实测图标 x771..793 / 852 = 屏宽 90%~93%）
- 现象：搜索钮被并入标题行后落在导航带中段，实测放大镜墨迹 x222..233（屏宽 59%~62%），距圈名右缘（x≈121）100px、距微信胶囊左缘（x≈290）57px ⇒ 既不与标题左基线对齐也不与右侧边缘对齐，成为悬空元素。
- 建议改法：把搜索钮锚到胶囊左侧的 header-right 槽（按 --capsule-right 预留），或并入标题行时给 margin-left:auto 贴右。
- 修复类别：单页

### R8-L03-D23　P2 / 尺寸比例　批次 R8-B36
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`97350b7ef25676da`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:701`
- 理想图依据：兴趣圈列表.png 六张圈子卡等高（描述均单行），卡高实测 211px / 852 画布 ≈ 186rpx 且逐张一致
- 现象：描述行 -webkit-line-clamp:2 使两行描述的卡变高，本帧实测五张卡高 122/104/108/103/104px（242/206/214/204/206rpx），首卡比邻卡高 18px（36rpx），列表节奏不齐。
- 建议改法：描述恢复单行 ellipsis（或给 .circle-card 定高 min-height:214rpx 并统一）。
- 修复类别：CSS/token

### R8-L03-D24　P2 / 需新建　批次 R8-B36
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`97350b7ef25676da`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:246`
- 理想图依据：兴趣圈列表.png chips 行最右端为固定筛选按钮（三横线图标 + 右上绿点，实测 x771..793 / y276..295）
- 现象：本帧 chips 行末没有独立筛选入口，第 7 项只是 key:"more" 的横滚 chip（实测行 y114..139 内最后一枚白色胶囊被视口右缘裁断于 x=336，仅露 26px 且无渐隐/绿点提示），理想图的「按条件筛选」功能在本页无落点。
- 建议改法：新建固定在行尾的筛选按钮（吸顶头内、不参与横滚）+ 筛选 BottomSheet，more chip 保留或移除。
- 修复类别：需新建目标功能

## subpackages/circles/circles/post-topic（2 条）

### R8-L04-D05　P2 / 文案　批次 R8-B37
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`78edba767f8b7cb7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:706`
- 理想图依据：无基准，依据=规范文档发布页说明 + Button 组件规范（单一主 CTA）
- 现象：同一屏出现两个提交入口：导航栏「发布」胶囊（post-topic.vue:500，文案 circle.postTopicSubmit）与底部「发布话题」大按钮（:706，文案 circle.postTopicNavTitle），二者 @tap 都绑 submitTopic，主行动重复且两处文案不一致。
- 建议改法：只保留底部主 CTA「发布话题」，导航栏去掉提交按钮（或仅作关闭）。
- 修复类别：单页

### R8-L04-D06　P3 / 颜色token　批次 R8-B37
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`78edba767f8b7cb7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:842`
- 理想图依据：无基准，依据=Button 组件禁用态规范（同页禁用态观感应一致）
- 现象：表单为空时两枚提交钮同为禁用（:501/:709 条件相同），但导航「发布」禁用态仍是半透明白胶囊 + 近绿文字（.post-header__submit--disabled :842 / 文字 :854）看起来像可点，底部「发布话题」禁用态是纯灰底，同页两处禁用观感不一致。
- 建议改法：统一禁用态色档（同 --c-text-quaternary 文字 + 同灰底），或导航钮禁用时同步降饱和/降不透明度。
- 修复类别：CSS/token

## subpackages/circles/circles/topic-detail（2 条）

### R8-L04-D03　P2 / 位置　批次 R8-B38
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`d0dfef1a1531bdcc`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:810`
- 理想图依据：无基准，依据=EmptyState 组件规范（空态应垂直居中）+ 规范文档空态说明
- 现象：「话题不存在」空态块落在帧上 y≈150–300（帧高 814 的约 18–37%），下方约 500px 全空、未垂直居中；上一轮 EmptyState.vue:142 的 flex:1 居中修复在此失效——本页给空态写的居中样式 .empty-state{flex:1;justify-content:center}（:810）是死样式，模板实际渲染的是 <EmptyState> 组件（class .empty），无 .empty-state 节点，故 flex 高度宿主缺失。
- 建议改法：删除死样式 .empty-state，改在承载 <EmptyState> 的父容器上给 flex 列 + 可解析高度（min-height 扣导航带），令其垂直居中。
- 修复类别：单页

### R8-L04-D04　P3 / 素材缺失　批次 R8-B02
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`d0dfef1a1531bdcc`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:53`
- 理想图依据：无基准，依据=EmptyState 组件规范（type→图标映射需与语义匹配）
- 现象：本页「话题不存在或已被删除」用 type="no-data"，而 no-data 预设图标被映射为放大镜 SEARCH（EmptyState.vue:53），帧上显示一枚搜索放大镜（x≈189、y≈150、120rpx≈60px）——放大镜语义是「搜索无结果」，与「话题已删除/不存在」不符，缺一张对应失效/删除图标。
- 建议改法：该态显式传 image（删除/失效图标）或 mascot，不复用 no-data 的搜索放大镜。
- 修复类别：单页

## subpackages/circles/circles/topics（2 条）

### R8-L04-D01　P2 / 可达性　批次 R8-B39
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`fd423e2f5ce08389`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:401`
- 理想图依据：无基准，依据=规范文档§3.11 圈子主页 + topics-header 组件规范（自绘导航右区不得与微信原生胶囊重复）
- 现象：自绘导航右区在 x≈290 处又画了一枚「···」更多按钮（topics-header__icon-text），紧贴微信原生胶囊「⋯」（x≈330–410），同一屏出现两枚几乎相同的「···」入口，用户无法分辨哪一枚可点。
- 建议改法：删除自绘「···」按钮（原生胶囊已提供该入口），或将其与胶囊拉开≥24px 并改用可区分的图标。
- 修复类别：单页

### R8-L04-D02　P2 / 颜色token　批次 R8-B39
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`69a149e43caee5f7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1124`
- 理想图依据：无基准，依据=同族 circle-home.vue 发帖 FAB 规范 + 圈子详情，摄影圈参考.png 右下「白圆 + 绿笔」FAB
- 现象：底部发帖 FAB 为绿色渐变实心圆（--c-gradient-float-btn，直径 84rpx≈42px）+ 白色图标；而同一功能（goToPostTopic + EDIT 图标）的 circle-home FAB 是浅底 #E8FAF3 圆 + 绿笔（circle-home.vue:1266），两页同款 FAB 填充色相反。
- 建议改法：topics FAB 背景改 --c-brand-50 + --c-brand-200 描边、图标改品牌绿，与 circle-home 对齐。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/history（4 条）

### R8-L06-D17　P1 / 位置　批次 R8-B40
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`ac373c90a6845a75`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:262`
- 理想图依据：无基准，依据=规范文档§1.4 区块间距口径（空态须在剩余可视区居中）+ 组件规范 EmptyState.vue:126-142（.empty 靠 flex:1 在宿主撑满后 justify-content:center）
- 现象：空态贴顶、下半屏全空——实测空态块（铃铛图标顶 y235 → 描述文字底 y335）只占 100px，其下 y335~800 连续 465px（57% 帧高）无任何元素；统计卡底沿 y179 到图标顶 y235 仅 56px。上一轮给 EmptyState 加的 flex:1 0 auto 在本页失效，因为宿主 .history-page 只声明 min-height:100%（无可解析父高，退化成 auto），没有剩余空间可分配
- 建议改法：.history-page 的 min-height 改 100vh（同 MatchSuccess.vue:194 已验证的写法），或给 .empty-state 宿主包一层 flex:1 容器
- 修复类别：单页

### R8-L06-D18　P2 / 颜色token　批次 R8-B40
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`ac373c90a6845a75`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:297`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（中性文本 ramp 为 #1A1E1C/#4A524E/#6B7571/#9AA39F，全站页面底 #EEF7F2 为绿相；蓝相 #4D8DFF/#A29BFE 只用于消息与未认证）
- 现象：导航返回箭头是品牌绿——实测 x26~42 / y72~77 区间的墨迹色相为绿（G 通道显著高于 R、B），与页面主标题「今日已看」的 #3CCA9C 同色；同一分包其余页（segment.vue:197、people.vue:281）返回符号都走 --c-text-primary 深色。§1.1.2「绿色=行动」使箭头与标题抢强调位
- 建议改法：.back-icon color 改 var(--c-text-primary)，把绿色留给可点行动件
- 修复类别：CSS/token

### R8-L06-D19　P2 / 素材缺失　批次 R8-B40
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`ac373c90a6845a75`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:238`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单（EmptyState 按 type 取预设插画）+ §1.1.4「emoji/图标一律替换为标准 SVG 且语义对应」
- 现象：浏览记录空态用了消息铃铛——实测图标墨迹 bbox x142~235 / y235~300（约 94×66px，即 120rpx 档），形状为带底铃的轮廓，取色 #96A5B9 / #C1CDD4（蓝灰，色相 216°），既不是「足迹/浏览」语义也不在 §1.2 任何令牌上；type="no-data" 的预设图被这枚 NOTIFICATION 图标覆盖掉了
- 建议改法：去掉显式 :image 走 type="no-data" 预设，或补一枚 history/footprint 线性 SVG（色值取 --c-text-placeholder #9AA39F）
- 修复类别：需新建目标功能

### R8-L06-D20　P2 / 空态文案　批次 R8-B40
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`ac373c90a6845a75`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:235`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:110-120（actionText 存在时渲染引导按钮）+ 规范文档§3 逐页说明「空态须给出下一步入口」
- 现象：空态只有一句劝退文案、没有出口——实测 y304~317 为标题「还没有浏览记录」、y325~335 为描述「快去寻觅页发现有趣的TA吧」，其下直到 y800 再无任何可点件；EmptyState 调用只传 type/image/title/description，未传 actionText，组件里的 .empty-action 分支恒不渲染
- 建议改法：补 actionText（如「去寻觅」）并 switchTab 到 ROUTES.TAB.DISCOVER，与描述文案形成闭环
- 修复类别：单页

## subpackages/discover-extra/discover/match-success（8 条）

### R8-L06-D01　P1 / 位置　批次 R8-B12
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`cbaab11c2de8b487`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:265`
- 理想图依据：素材/理想效果图/匹配成功页面.png 中部双头像区——两枚头像分离、中间空隙仅容一枚心形徽标骑压，头像整体收在页面左右内衬以内
- 现象：头像行溢出内容区——实帧左头像外沿 x=13、右头像外沿 x=366（页面左右内衬 48rpx=24.2px，内容盒应为 x=24.2~353.8），两头像之间实测空隙 124px；理想图同位置空隙折算仅 68px、头像整体落在 x=56~325。心形徽标实测直径 61px 浮在 124px 空档正中，两侧各留约 31px 空白，完全没压到两枚头像内缘
- 建议改法：把 __avatars 的 gap 由 80rpx 收到约 40rpx（232+40+136-40+40+232=640rpx < 654rpx 内容宽），使行宽回到内容盒内、心形重新骑压两圆内缘
- 修复类别：单页

### R8-L06-D02　P1 / 素材缺失　批次 R8-B12
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`cbaab11c2de8b487`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:43`
- 理想图依据：素材/理想效果图/匹配成功页面.png「我们正在分享你们的共同点」卡首行——圆角底衬内有一枚奔跑人形线性图标（与后三行音符/书本/餐盒图标同层可见）
- 现象：共同点卡首行「慢跑爱好」的底衬是空板——实测该行底衬区（x38~78, y400~430）除 #E8F5E9 底色与白字外零枚墨迹像素（ink=0），而第 2/3/4 行同区分别有 13/18/16 个图标像素；根因是 scoreIcons[0] 指向 static/assets/icons/emoji/run.svg，该文件只有 viewBox 无 width/height（同目录 music.svg 带 width="24" height="24" 故能渲染），违反规范 §1.6.2「显式宽高防 0×0」
- 建议改法：给 run.svg 补 width="24" height="24"（或改指 ICONS_COMMON 下带显式宽高的奔跑图标），并在 prepare-static 里加一条「SVG 必须带显式宽高」的校验
- 修复类别：需新建目标功能

### R8-L06-D03　P2 / 颜色token　批次 R8-B12
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`cbaab11c2de8b487`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:463`
- 理想图依据：素材/理想效果图/匹配成功页面.png 底部「立即聊天」主按钮——整条纯色绿带，无方向性明暗
- 现象：主按钮被画成 135° 渐变——实帧按钮内取色左上 #35C898 → 右下 #24AC79（ΔR17/ΔG28/ΔB31，肉眼可辨的斜向明暗）；理想图同区域六个取样点全部落在 #1DB97D~#23BB7D（Δ≤4），是一条平色
- 建议改法：把 background 改为单色 var(--c-brand)（或理想图实测 #21BA7B），去掉 linear-gradient
- 修复类别：CSS/token

### R8-L06-D04　P2 / 字号　批次 R8-B12
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`cbaab11c2de8b487`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:215`
- 理想图依据：素材/理想效果图/匹配成功页面.png 顶部「匹配成功」绿色主标题
- 现象：主标题比理想图大一档——实帧「匹配成功」绿色墨迹 bbox x150~259 / y112~146（字面高 35px≈70rpx、单字步进 35px），理想图同四字墨迹折算后字面高 26.6px、单字步进 28px（≈53~56rpx）；实帧大 25%~31%，把标题压到胶囊带下仅 29px 起排
- 建议改法：font-size 由 72rpx 降到 56rpx（--fs-5xl 档），与理想图字面高对齐
- 修复类别：CSS/token

### R8-L06-D05　P2 / 文案　批次 R8-B21
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`cbaab11c2de8b487`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:462`
- 理想图依据：素材/理想效果图/匹配成功页面.png 标题下两行引导文案「你和 星野 互相喜欢了彼此 / 快去打个招呼吧~」
- 现象：引导句与理想图不同句且对象名丢失——实帧渲染「你和 TA 互相喜欢上了」，理想图为「你和 星野 互相喜欢了彼此」；{name} 槽位落成 discover.partnerDefaultName「TA」，庆祝页读起来没有具体的人
- 建议改法：文案改为理想图原句「你和 {name} 互相喜欢了彼此」，并在 partner 为空时回落到入口 query.userId 对应昵称而非通用「TA」
- 修复类别：单页

### R8-L06-D06　P1 / 颜色token　批次 R8-B12
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`dd4df0a89e7f53ad`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:476`
- 理想图依据：素材/理想效果图/匹配成功页面.png「继续探索」按钮——一枚实心纯白胶囊浮在浅底上，与页面底色明显分层
- 现象：次按钮没有底色，读起来是「只有一行字」——实帧按钮内部取样 (60,690)/(100,700)/(300,710)/(60,745) 全部为 #F6F5F6~#FAF3F7，与按钮外页面底 #F5F5F7 同值（差 ≤3）；理想图同区域为 #FFFFFF，外底为 #F2F6F2，明度差 13。样式只声明了 2rpx 描边 #dce5e2（1px，同样落在浅底上不可见）
- 建议改法：给 .match-success__secondary 补 background: var(--c-bg-container) 与 --card-shadow，去掉与底色撞色的 2rpx 描边
- 修复类别：CSS/token

### R8-L06-D07　P3 / 圆角　批次 R8-B41
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`dd4df0a89e7f53ad`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:221`
- 理想图依据：素材/理想效果图/匹配成功页面.png 顶部导航——左侧裸「‹」箭头、右侧裸扫描图标，均无底衬、无圆角容器
- 现象：导航图标被自造了一对正圆白底——实帧 y=75 扫描在 x12~27、x32~47 处测到两团 min>238 的纯白区（返回钮 72rpx 正圆被 ‹ 字形切成两段），理想图同一水平线（y=165/180）纯白连续区为 0 段；这层 rgba(255,255,255,.7)+圆角 50% 底衬在理想图里不存在
- 建议改法：去掉 .success-nav__btn 的 border-radius/background/box-shadow，只保留裸图标与点击热区
- 修复类别：单页

### R8-L06-D08　P3 / 间距　批次 R8-B12
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`dd4df0a89e7f53ad`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:201`
- 理想图依据：素材/理想效果图/匹配成功页面.png 最底部「分享喜悦」——文字下沿几乎贴 home indicator
- 现象：底部落款与屏底之间留白过大——实帧「分享喜悦」墨迹带 y752~764，距画布底 814 尚有 50px（≈99rpx，屏高 6.1%）；理想图折算后同文字带落在 y784~795，距底仅 19px（2.3%）。声明的 16rpx 被 env(safe-area-inset-bottom) 叠加顶起，锚底链等于没生效
- 建议改法：padding-bottom 改为只留 env(safe-area-inset-bottom)（或 8rpx 常量），使分享行下沿回到距底约 20px
- 修复类别：单页

## subpackages/discover-extra/discover/matching（5 条）

### R8-L05-D15　P2 / 文案　批次 R8-B11
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`3abcb214cbc7da25`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:132`
- 理想图依据：素材/理想效果图/匹配中页面.png 进度卡区（每行条上方右侧一枚绿色「匹配度 90%/85%/80%/79%」标签，共 4 条）
- 现象：进度卡四行只有「图标＋标签＋进度条」，理想图每行条上方右侧都挂一条绿色「匹配度 NN%」文字，帧上该位置（x≈240..350 / 每行条上方）完全空白，一行字都没有；由此理想图行高约 150px、四行占参考图高 19%，本实现行高仅 ≈52px、四行占 13%，卡片整体比理想图矮一截。
- 建议改法：在 .match-loading__row-bar 上方补一行 `匹配度 {{ p.value }}%`（--c-text-brand、右对齐），行盒改两行结构。
- 修复类别：单页

### R8-L05-D16　P2 / 位置　批次 R8-B11
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`3abcb214cbc7da25`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:199`
- 理想图依据：素材/理想效果图/匹配中页面.png 右上角「◉ 跳过」区（胶囊右缘距画面右缘约 5% 宽）
- 现象：上一轮 R7-L05-D08 把 top 抬到独立带（纵向已不压字，帧上已验证），但 `right: 140rpx` 没动：帧上「跳过」胶囊右缘实测 x≈310px，距屏幕右缘 68px(135rpx)，而理想图该胶囊贴右缘、间距约 19px(38rpx) ⇒ 横向偏内 ≈49px(97rpx)；且它已经落在胶囊下方独立带，横向让位是多余的——微信胶囊占 x≈288..370，本胶囊右缘 310px 仍在同一 x 区间内，避让并没避干净。
- 建议改法：right 收到 32rpx（与页面 --page-padding 同轴），纵向独立带已足够避让胶囊。
- 修复类别：单页

### R8-L05-D17　P2 / 尺寸比例　批次 R8-B11
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`49a19116570d5799`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:425`
- 理想图依据：素材/理想效果图/匹配中页面.png 进度卡区（四条长度各不相同：90/85/80/79）
- 现象：四条进度条共用同一条 `match-loading-bar-pulse` 关键帧且无 animation-delay，任何时刻长度必然相等：top 帧四条右缘实测全部收在 x≈228px，bottom 帧四条全部收在 x≈238px（两帧不同相位、四条仍完全同长）；理想图四条右缘呈 90/85/80/79 的阶梯差。整卡因此读成「一根条复制四遍」，失去逐项分析的语义。
- 建议改法：给每行按 p.value 设 --bar-w 与 animation-delay（或改 indeterminate 但四条错开相位/长度档）。
- 修复类别：单页

### R8-L05-D18　P2 / 颜色token　批次 R8-B11
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`49a19116570d5799`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:349`
- 理想图依据：素材/理想效果图/匹配中页面.png 进度卡区（卡底与理想图同为纯白卡、但理想全站走令牌）+ 规范文档 §1.1 原则 3「一令牌一值，禁止私有色值」与 §1.2 色板表
- 现象：本页样式块残留 7 个私有色值，帧上均可定位：标题 #222222（:349，规范主文本是 --c-text-primary #1A1E1C）、副标题 #8a9694（:355，色板无此档，最近的是 --c-text-tertiary #6B7571）、进度卡底 #ffffff（:364，规范卡片底是 --c-bg-container）、卡标题与行标签 #333333（:371/:403）、行图标底 #E8F8F5（:388，规范 brand-50 是 #E8FAF3）、进度条槽 #F0F0F0（:411，规范浅底是 --c-border-light #EEF2F0）。整页因此比规范灰一档、白一档。
- 建议改法：七处逐条换成 §1.2/§1.4 对应令牌（--c-text-primary / --c-text-tertiary / --c-bg-container / --c-brand-50 / --c-border-light）。
- 修复类别：CSS/token

### R8-L05-D19　P1 / 素材缺失　批次 R8-B11
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`49a19116570d5799`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:295`
- 理想图依据：素材/理想效果图/匹配中页面.png 中部双头像区（左男右女两张清晰人像，直径约画面宽 30%）
- 现象：右侧对方头像位渲染成一团无辨读性的深墨绿块：帧上实测该圆 x≈228..318 / y≈243..333，整块最亮处也只到 ≈#6E766C，中心压一枚 85% 白底「匹配中」小胶囊；理想图该位是一张明亮清晰的人像照。现处理只有 `filter: blur(6rpx)`（:295）+ rgba(255,255,255,0.35) 罩（:304），既没糊出可辨的五官轮廓，也没保留人像亮度，读起来像图片加载失败而不是「待揭晓」。
- 建议改法：提高罩层亮度或改用品牌绿半透罩＋保留人像底图，必要时直接给 partner 位一张演示人格头像（person-10~21 池已就绪）。
- 修复类别：单页

## subpackages/discover-extra/home/segment（4 条）

### R8-L06-D09　P1 / 素材缺失　批次 R8-B42
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`6d0e68797604a74b`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:154`
- 理想图依据：无基准，依据=规范文档§1.6.2「显式宽高防 0×0」+ §1.2 成功/在线令牌 --c-brand #36C99A（在线态应为绿点+文字成组）
- 现象：每行「在线」前的绿点整帧不出现——实测首行「在线」绿色墨迹只占 x185~203 / y128~137（19×10px，正好两字），其左侧 x168~184 全为 #FFFFFF，16rpx 圆点位是空的；8 行无一例外。资源 svg-spec/04-avatars/status-online.svg 只有 viewBox="0 0 12 12"、无 width/height，mp-weixin <image> 拿不到固有尺寸即 0×0
- 建议改法：给 status-online.svg 补 width="12" height="12"（全站 4 个消费点同时受益），或改用 CSS 圆点不引图
- 修复类别：需新建目标功能

### R8-L06-D10　P3 / 文案　批次 R8-B42
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`6d0e68797604a74b`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:158`
- 理想图依据：无基准，依据=规范文档§3 逐页说明口径（列表 meta 行需同构）+ 同页组件规范 segment-row__meta
- 现象：meta 行体例不齐——首帧 8 行中仅第 2 行「浙江大学 · 230km」带距离，其余 7 行（中山大学 / 武汉大学 / 南开大学 / 北京师范大学 …）只有校名，同一列表里出现两种句式；分隔符 ' · ' 被写成条件拼接，distanceText 为空时整段消失
- 建议改法：distanceText 缺失时回落为「<span>学校</span> · <span>附近</span>」占位，或统一去掉距离字段，让全列表 meta 同构
- 修复类别：单页

### R8-L06-D11　P3 / 字号　批次 R8-B42
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`6d0e68797604a74b`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:289`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（标签/时间戳档 = --fs-md/base 13/12px，10/11px 只用于角标与法务）
- 现象：「在线」状态字压到极小档——实测绿色墨迹 y128~137 高 10px（=20rpx），与同行人名（.segment-row__name 30rpx，实测 15px 字面）差 1.5 档，低于 §1.3 标签档 12px；10px 汉字在 378px 画布上笔画粘连
- 建议改法：font-size 提到 var(--fs-base, 24rpx)（12px），并把颜色换成 --c-brand-600 以满足小字号对比度
- 修复类别：CSS/token

### R8-L06-D12　P1 / 层级遮挡　批次 R8-B42
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`adfe54aac6389a02`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:179`
- 理想图依据：无基准，依据=规范文档§3 逐页说明口径（页头需常驻避让状态栏与胶囊）+ 同分包 people.vue 的 sticky 页头实现
- 现象：页头随流滚动，列表滑进状态栏与胶囊底下——底帧页头已完全消失，第一张卡被画布上沿裁到只剩 y0~21（顶帧卡高 64px），第二张卡占 y34~96 而系统胶囊实测占 x298~357 / y56~71，正好压在卡右侧 › 箭头（同行卡该位墨迹在 x345~348）之上；顶帧同区域墨迹完整可见
- 建议改法：把 .segment-header 改为 position:sticky;top:0 并保留 --statusbar 上内衬，列表容器补 scroll-padding-top
- 修复类别：单页

## subpackages/discover-extra/likes-visitors/index（4 条）

### R8-L07-D01　P2 / 颜色token　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`46645aab85feb49b`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:232`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（心动粉 `--c-romance-500` = #FF6B81）+ §1.1 第 2 条「绿色=行动，粉色=喜欢，两色禁止混用」+ 第 3 条「禁止私有色值」；组件规范 apps/client/src/components/common/LockScreen.vue（插画漂浮爱心）
- 现象：插画两枚漂浮爱心实测填充色 #EF4444（左颗 24×20px、右颗 17×15px 区域内众数色，211 px 命中），是 §1.2 色板里不存在的红；素材 apps/client/src/static/assets/icons/social/like-filled.svg 第 1 行写死 `fill="#EF4444"`，规范要求的「喜欢」色档是 #FF6B81（相差 R -16/G +25/B +61，红→粉红）。
- 建议改法：把 like-filled.svg 的 fill 改成 #FF6B81（或给 .illustration__heart-img 加 `filter` 归一到 romance-500），并把该色收进 --c-romance-500 令牌引用，不留字面量。
- 修复类别：CSS/token

### R8-L07-D02　P1 / 层级遮挡　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`46645aab85feb49b`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:410`
- 理想图依据：无基准，依据=规范文档§1.1 第 1 条（全站浅绿底上不得出现叠印/断层）+ 组件规范 LockScreen.vue（× 为全屏锁定层唯一退出键）；同页宿主已按 AppShell.vue:98「var(--statusbar, env(safe-area-inset-top)) 在模拟器/部分机型为 0」的结论改用注入值
- 现象：× 关闭钮实测圆底占 x=14..56、y=8..47（43×40px≈85×79rpx，尺寸本身合规），但它的顶边落在系统状态栏文字带内——同帧系统时间「0:58」字形实测 x=12..24、y=18..26，与圆底在 x=14..24、y=18..26 交叠 11×9px，半透明白圆（rgba(255,255,255,.6)）把时间右半边罩住，× 字形只能挤在时间右侧 x≈28 起，读起来像「0:58×」连排。根因是 `top: calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-3))` 里的 --statusbar 在本运行档解析为 0（宿主页 likes-visitors/index.vue:33-35 已为此改用 useStatusBarHeight，但组件这一半没跟上）。
- 建议改法：给 LockScreen 增加 statusBarHeight prop（或组件内直接调 useStatusBarHeight），把 :410 的 top 换成注入值，与 AppShell.vue:329、daily-question/index.vue:356 同口径。
- 修复类别：单页

### R8-L07-D03　P1 / 可达性　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`46645aab85feb49b`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:650`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（主色 --c-brand #36C99A 用于主按钮；brand-600 #2AAE83 用于按压态/承载白字）+ §1.1 第 2 条；同仓已批口径见 daily-question/index.vue:482-484（R6-L08-D16 因白字压 brand-500 只有 2.10:1 而把 CTA 底色降到 brand-600）
- 现象：唯一主出口「立即登录并完善」白字压 `--c-gradient-brand` 底，钮面实测主色 #45CFA0（钮区 280×47px 众数，另见 #49D0A2/#4BD1A3 渐变段），白字对 #45CFA0 的相对亮度比只有 1.97:1；钮文字实测字形宽 15.3px/字≈30rpx（声明 --fs-2xl=32rpx=16.1px），bold 16px 不享 WCAG 大字号（≥18.66px bold）豁免，4.5:1 门槛差 2.5 倍。同一缺陷 R6 只修了 daily-question 页内那颗 CTA（改 brand-600），LockScreen 这颗仍走渐变。
- 建议改法：把 .lock-screen__btn 的 background 从 --c-gradient-brand 换成 --c-brand-600 纯色（或渐变终点改到 brand-700 一侧），使白字对比度 ≥4.5:1，与 daily-question/index.vue:484 对齐。
- 修复类别：CSS/token

### R8-L07-D04　P1 / 可达性　批次 R8-B43
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`21fb580fd19f071d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:332`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单（本页应出「双 Tab + 数据概览栏 + 列表」结构，见 index.vue:5-7 自述）+ §1.1 第 1 条；页面自述的数据概览栏口径（总浏览量/今日访客/今日浏览量）在帧上 0 命中
- 现象：`<LockScreen v-if="!isUnlocked">` + `<template v-else>` 把整页设计内容（page-header、双 Tab、overview 三格、喜欢/访客列表）全部挡在登录判定之后，top 与 bottom 两帧除 y<188 的状态栏时钟与爱心浮动动画（全帧仅 597 个像素不同、且集中在 y=0..188）之外逐像素相同 ⇒ 页面在实机档完全不可滚、可滚区为 0px，帧上「喜欢与访客」这一页本身没有任何可见内容，规范自述的 3 格概览数字与 2 个 Tab 标签命中数为 0。
- 建议改法：让未登录态保留页面骨架（Tab 头 + 概览栏占位 + 列表灰化）只把条目级操作换成登录引导，或在 shots 侧以登录态取该页帧并另开游客帧登记门槛，别让整页只剩 LockScreen。
- 修复类别：单页

## subpackages/discover-extra/likes/index（3 条）

### R8-L06-D21　P2 / 颜色token　批次 R8-B06
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`184c34cc984f6ba4`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:89`
- 理想图依据：无基准，依据=规范文档§3.15 未登录等待态「2×2 功能卡（精确匹配绿/聊天互动粉/校园相遇蓝/关系成长紫）」+ §1.2 令牌表（--c-brand #36C99A / --c-romance-500 #FF6B81 / --c-status-info #4D8DFF / --c-purple #A29BFE）
- 现象：四枚功能图标色序全错——实测图标核心区：精确匹配 #06CF87（色相 158°，绿 ✓）、聊天互动 #93A2B7（色相 215°，应为粉 #FF6B81）、校园趣遇 #8D9CB3（色相 216°、饱和度仅 0.21，应为蓝 #4D8DFF 饱和度 0.69）、关系成长 #FF6B81（色相 351° 粉，应为紫 #A29BFE）。中间两枚色相差 1°、几乎同色，四色卡读成「绿+灰+灰+粉」
- 建议改法：按 §3.15 重出四份 SVG（粉/蓝/紫烘焙色与绿同档饱和），或在组件内用 filter 统一染色，禁止再依赖素材自带灰蓝
- 修复类别：需新建目标功能

### R8-L06-D22　P2 / 尺寸比例　批次 R8-B06
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`fd5c7cd64f9fef36`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:312`
- 理想图依据：无基准，依据=规范文档§3.15「中心吉祥物 120px 浮动 + 虚线圆轨道 + 6 环绕头像」（120px 设计像素 = 240rpx = 120.9 帧 px）
- 现象：中心吉祥物比规范小一档——.not-logged__orbit-mascot 声明 width/height 200rpx（=100.8 帧 px），已小于 §3.15 的 120px；再因 aspectFit 内边距，实帧可见吉祥物字形仅 x155~222 / y337~412（68×76px = 135×151rpx），只有规范尺寸的 57%，被 6 枚 96rpx 头像（实测 49×48px）压不住场
- 建议改法：容器提到 240rpx 并换用无内边距的吉祥物 SVG（或 mode="scaleToFill"），使可见字形实测达到 120px
- 修复类别：CSS/token

### R8-L06-D23　P1 / 可达性　批次 R8-B44
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`fd5c7cd64f9fef36`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:606`
- 理想图依据：无基准，依据=规范文档§3.15 未登录等待态（登录墙为寻觅域全屏态，不应替换业务列表页的导航栏）+ 同分包 segment.vue:182 / people.vue:162 均自带返回钮
- 现象：喜欢列表整页被登录墙顶替且无返回件——顶帧导航带（x0~290 / y40~100，即胶囊以左全部区域）非背景像素实测 7 个，且 7 个全在 x=0 那条 1px 画布边缘伪影上，等于没有页头；对照 segment 顶帧同区域 1743 个墨迹像素（返回圆底+标题）。底帧滚动后主标题第一行已被画布上沿裁掉，只剩 y34~46 的第二行压在状态栏下沿
- 建议改法：登录墙嵌到列表容器内并保留页头返回钮，或给 likes 页补独立 sticky 页头；同时把该页门槛在页面清单里登记为 B（游客需登录），别再按 A 取态
- 修复类别：单页

## subpackages/discover-extra/nearby/people（4 条）

### R8-L06-D13　P1 / 素材缺失　批次 R8-B45
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`f0744d2b93b3f659`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:231`
- 理想图依据：无基准，依据=规范文档§3.5 附近页组件清单（XunmiOnlineBadge / 在线态绿点+文字成组）+ §1.6.2 显式宽高防 0×0
- 现象：在线绿点同样整帧缺失——实测首行人名后绿色墨迹仅 x185~203（19×10px，两字「在线」），x168~184 为纯白 #FFFFFF，16rpx 圆点位空；同页 8 行全部如此。引的是与 segment 同一份无 width/height 的 svg-spec/04-avatars/status-online.svg
- 建议改法：与 R8-L06-D09 合并处理：给 status-online.svg 补显式宽高，改后本页与 segment/home 四个消费点一起复验
- 修复类别：需新建目标功能

### R8-L06-D14　P3 / 圆角　批次 R8-B45
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`f0744d2b93b3f659`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:304`
- 理想图依据：无基准，依据=规范文档§1.4 圆角阶梯（--r-* 只有 4/8/12/20/24/32/9999rpx）与 §1.1.3「一令牌一值，禁止私有值」
- 现象：分段标签用了阶梯外的 18rpx——.people-tab 写死 border-radius: 18rpx（实测卡角曲率约 9px），而同一页 .people-row 用的是 20rpx、规范阶梯上并无 18rpx 档；segment.vue:244 同样抄了 18rpx，两处构成同一种私有圆角值
- 建议改法：统一改 var(--r-lg, 20rpx)，并把 segment 的同值一并收敛
- 修复类别：CSS/token

### R8-L06-D15　P2 / 文案　批次 R8-B45
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`f590992ae39a4583`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:228`
- 理想图依据：无基准，依据=规范文档§3.5 附近页（人卡列表：姓名+年龄+学校需一一对应同一自然人）
- 现象：同一列表里同名同人设冲突——顶帧第 7 行为「阿辰 20 / 北京大学 / 摄影·电影·旅行」，底帧首行又出现「阿辰 25 / 东南大学 / 博物馆·历史·古琴」，年龄差 5、学校与三个兴趣标签全不同；说明列表按人卡直出、未按 userId 去重
- 建议改法：列表数据按 userId 去重后再渲染 name/age，或给重名用户补学校后缀区分
- 修复类别：单页

### R8-L06-D16　P3 / 字号　批次 R8-B45
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`f590992ae39a4583`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:450`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（标签档 13/12px；10/11px 仅角标·法务）
- 现象：兴趣标签文字 20rpx 偏小——实测标签底衬 #EAF8F2 高 18px（y276~293），内里绿色字墨迹高仅 12px（y279~290），字面 ≈10px=20rpx，低于 §1.3 标签档 12px；标签是本页信息密度最高的一行却用了最小字号
- 建议改法：.people-row__tag font-size 提到 var(--fs-base, 24rpx)，padding 同步改 8rpx 16rpx 以保持 36rpx 行高
- 修复类别：CSS/token

## subpackages/discover/activities/index（4 条）

### R8-L13-D08　P2 / 位置　批次 R8-B46
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`86f72e7fc847f4d7`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:1145`
- 理想图依据：无基准，依据=规范 §1.4 页边距 `--page-padding` 32rpx=16px（全站唯一内容列）+ 组件规范 AppShell.vue:294-295（gutter 已由 shell 承担，页面不得再加一层）
- 现象：本页出现三条互不对齐的内容列：筛选 chip 行左缘实测 x=35（y=270 处 #E6FAF2 起点），活动卡片左缘 x=17、右缘 x=361 ⇒ chip 行比卡片缩进 18px；视图切换条右缘实测 x=347（#F3FAF6 轨道末像素），比卡片右缘 361 缩进 14px。根因是 `.quick-filters{padding:0 32rpx 20rpx}` 与 `.view-toggle-bar{padding:0 28rpx 16rpx}` 在 shell 的 32rpx gutter 内又各加了一层 gutter。
- 建议改法：两条规则的水平 padding 归零（`:1145` 改 `padding: 0 0 20rpx`、`:681` 改 `padding: 0 0 16rpx`），统一吃 shell 的 32rpx。
- 修复类别：单页

### R8-L13-D09　P3 / 颜色token　批次 R8-B46
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`86f72e7fc847f4d7`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:850`
- 理想图依据：无基准，依据=规范 §1.2（三级文本只有 --c-text-tertiary #6B7571 一档绿灰，色板无 #94A3B8 蓝灰档）
- 现象：卡片内地点/时间两行的前导图标实测最深 #A6B3C4、最深 25 点均值 #B8C2CF（B−R≈+30 蓝灰），而同卡正文文字最深 #777C7A（绿灰）⇒ 一卡之内两套灰。`.row-icon` 是 `<image>`（:444/:448），CSS `color` 对位图不生效，且它的兜底字面量就写着 #94a3b8，等于把这枚私有色值钉进了代码。
- 建议改法：删掉 `.row-icon` 上无效的 `color`，改吃已染色的 svg 变体，或与 EmptyState.vue:163 同法加 `filter: grayscale(1) brightness(0.72)`。
- 修复类别：CSS/token

### R8-L13-D10　P2 / 位置　批次 R8-B46
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`b4063acfff0f6805`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:434`
- 理想图依据：无基准，依据=规范 §1.1 第 3 条（同一列表内同构件须同列）+ 代码自述 activities/index.vue:433「参与意向人数标记」为行内固定构件
- 现象：「综合」分类药丸（实测宽恒为 32~33px）在 top 帧三张有报名数的卡上落在 x=249..305，在 bottom 帧「环湖夜走第六期」「秋冬草地音乐会」两张 0 报名的卡上跳到 x=315..346 —— 同一列构件横向漂移 66px。根因：`.row-enrollment` 整块被 `v-if>0` 摘掉，而 `.row-header`（:775）是 space-between、`.row-title`（:782）又 `flex:1` 把药丸顶到行尾，报数一缺位药丸就跟着右移贴到内容右缘 x=346。
- 建议改法：0 报名也渲染 `.row-enrollment`（文案走「暂无报名」），或把药丸从 `.row-title-wrap` 里提出、在 `.row-header` 内固定右列宽度。
- 修复类别：单页

### R8-L13-D11　P2 / 间距　批次 R8-B46
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`b4063acfff0f6805`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:342`
- 理想图依据：无基准，依据=组件规范 BottomActionBar.vue:88-89（吸底出口须带 `env(safe-area-inset-bottom)`）+ 同仓 feedback/index.vue:620-621 自述的底部安全区口径
- 现象：滚到底后「下一步」卡内「提交活动提案 / 去寻觅」两枚按钮下缘实测止于 y=798，Home 指示条墨迹在 y=801..802 ⇒ 主 CTA 与系统指示条只隔 3px，按钮圆角与触控下沿被压到屏边。根因：本页传 `:show-tab-bar="false"`，AppShell.vue:121 随即把 bodyPaddingBottom 置 '0'，页面自己也没补 `.fixed-bar-clear` 这类留白。
- 建议改法：给列表末尾补 `height: calc(env(safe-area-inset-bottom) + 32rpx)` 的占位（同 feedback/index.vue:899-901 口径）。
- 修复类别：单页

## subpackages/discover/discussions/index（4 条）

### R8-L13-D04　P2 / 素材缺失　批次 R8-B47
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`14ec7c3fba2c8260`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:101`
- 理想图依据：无基准，依据=组件规范 StatusState.vue:11-14（heat 档专指 `static/assets/icons/common/fire.png`，实测该文件存在）+ 规范 §1.1 第 4 条（图标语义须与文案一致）
- 现象：10 枚热度药丸（y=216..225、307..317、425..435、498..508、632..642、707..717…）图标位实测 x≈33..43 全是蓝灰 ✕（ICONS_COMMON.CLOSE），配橙色「热度上升 / 13 人参与」——把「热度」画成了「关闭」，语义相反。StatusState.vue:26 的 `heat` 档（→FIRE）上一轮已建好，本页消费点仍写 `tone="warning"`，R6-L16-D01 只修了组件没修页面。
- 建议改法：把 :101 改为 `tone="heat"`，让药丸吃 ICONS_COMMON.FIRE。
- 修复类别：单页

### R8-L13-D05　P2 / 文案　批次 R8-B47
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`14ec7c3fba2c8260`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:109`
- 理想图依据：无基准，依据=规范 §1.3（标题档与正文档两级字阶，两级须承载不同信息）+ 代码自述 discussions/index.vue:103-107 的去重目标
- 现象：同一句「傍晚绕着操场慢跑，抬头看见整片橘粉色的晚霞，一天的疲惫都没了」在 y=523..554（粗体标题，14px/行）与 y=564..594（正文，12px/行）逐字印了两遍，仅句尾「…」与「。」之差；:109 的去重守卫只做 `trim()` 全等，标题被省略号截断后与摘要不再逐字相等 ⇒ 守卫永不触发，R6-L16-D04 修得不对（bottom 帧同现象另见 y=340..430 段）。
- 建议改法：守卫改为「摘要以标题为前缀 / 去掉句末标点与省略号后相等」即判同文，不渲染摘要行。
- 修复类别：单页

### R8-L13-D06　P1 / 层级遮挡　批次 R8-B47
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`9c102238292812f3`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:71`
- 理想图依据：无基准，依据=组件规范 AppShell.vue:317-319 自述判据「is-fixed 时头部吸顶……滚动时正文不得与系统状态栏文字叠印」
- 现象：页头没传 `fixed` ⇒ AppShell.vue:323 的 `.is-fixed .shell__header{position:sticky}` 整条不生效，列表滚到 y=6..35（每行 210~260 个深色像素，横跨 x=33..341）直接印在系统状态栏「1:14」与电量/信号之上；y=56..71 行正文右端伸到 x=357，与微信胶囊（实测 x=298..357、y=56..71）同行叠字。
- 建议改法：:71 的 AppShell 补 `fixed`（与同仓 feedback/index.vue:427、LegalTextPage.vue:203 同口径）。
- 修复类别：单页

### R8-L13-D07　P2 / 可达性　批次 R8-B47
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`9c102238292812f3`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:75`
- 理想图依据：无基准，依据=组件规范 AppShell.vue:340-349（`.shell__back` 声明 min-height/width 88rpx 的返回入口）+ 规范 §1.5 结构组 BottomActionBar 未在本页启用
- 现象：同页 top 帧返回控件墨迹在 y=69..79（x=49..69），bottom 帧 y=45..130 全帧零墨迹（实测仅 y=114..121 有 4 个杂点）——`show-back` 渲染出的返回入口随页头一起滚出视口，且本页 `current-tab="likes"` 未起吸底条，滚动后画面里没有任何可见出口。
- 建议改法：同 D06 一并解决：AppShell 传 `fixed` 让含 `show-back` 的页头吸顶。
- 修复类别：单页

## subpackages/legal/agreement/index（3 条）

### R8-L13-D15　P2 / 文案　批次 R8-B19
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`9a1450b9eab1598d`）
- 源码证据：`apps/client/src/config/legal-texts.ts:142`
- 理想图依据：无基准，依据=规范 §1.1 第 3 条（一令牌一值，合规文案单一来源）+ 代码自述 LegalTextPage.vue:117-124「日期一律由后端 displayUpdatedAt 出」
- 现象：元信息带（实测 y=155..185 白带）放大读出「最后更新：2026-10-21」——正是本帧拍摄日。R6-L16-D12 把「两个日期打架」修好了，但 `readLocalFallbackText` 仍把 `updatedAt` 写成 `new Date().toISOString()`，于是这份用户协议的"最后更新时间"每次打开都刷新一次，法务追溯口径上的修订日期是当场编的。
- 建议改法：fallback 分支的 `updatedAt` 改吃 i18n 里的固定修订日期常量（或直接留空、由 `showMeta` 隐藏该行），不要用运行时刻。
- 修复类别：单页

### R8-L13-D16　P1 / 可达性　批次 R8-B03
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`9a1450b9eab1598d`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:283`
- 理想图依据：无基准，依据=组件规范 LegalTextPage.vue:261「loading/error/empty 状态也保留，确保用户可返回」——该按钮的设计目的就是不滚完全文也能确认退出
- 现象：首屏可点出口实测为 0：整张 top 帧品牌绿像素只有 2 个（返回箭头 y=70），「我已阅读并同意」热区（bottom 帧实测 x=26..352、y=724..773，48px 高）在首屏一个像素都没有；协议正文约 2000px，用户必须逐屏滚完全文才碰得到这个确认按钮。根因链：`.legal-page{min-height:100%}` 在本运行时不可解析 ⇒ 子级 `.legal-content{flex:1}`(:371) 不参与分配 ⇒ scroll-view 被内容撑高、footer 出视口。
- 建议改法：`.legal-page` 改 `height: 100vh`（或 `.shell__body` 给可解析高度）使 `flex:1` 生效，或按 D12 把 footer 直接吸底。
- 修复类别：单页

### R8-L13-D17　P3 / 颜色token　批次 R8-B03
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`5bdc94f234a19ed0`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:391`
- 理想图依据：无基准，依据=规范 §1.1 第 1 条（不得出现白/灰断层）+ 组件规范 BottomActionBar.vue:84-85（吸底条 `left:0; right:0` 满宽的既有口径）
- 现象：文档末尾这条「我已阅读并同意」白底带实测只铺到 x=17..361（y=720 行：x=1..15 = #EFF7F3、x=17..35 = #FFFFFF、x=36..354 = #F9FEFC、x=363..376 = #EEF7F2），左右各留 16px 浅绿缝 ⇒ 一条不贴边的白色横带卡在页面底部，两端呈锯齿断层，与全站满宽吸底条的观感不一致。
- 建议改法：footer 出流吸底时补 `left:0; right:0` + 内部再吃 `--page-padding`；若继续留在流内，则把 background 改为 `--c-bg-page` 消除白带。
- 修复类别：CSS/token

## subpackages/legal/privacy/index（3 条）

### R8-L13-D12　P1 / 位置　批次 R8-B03
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`a83513e58e5a7a02`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:388`
- 理想图依据：无基准，依据=组件规范 LegalTextPage.vue:16「底部"我已阅读"按钮」+ 同仓 BottomActionBar.vue:82-91 的吸底变体口径
- 现象：首屏（top 帧）整张 378×814 里品牌绿像素只有 **2 个**（y=70 的返回箭头），「我已阅读并同意」0 像素可见；它只出现在 bottom 帧 y=726..773（该帧绿像素 13609 个）。`.legal-footer` 只有 padding、没有 position:fixed/sticky，而 `.legal-page{min-height:100%}`(:283) 在本运行时不可解析 ⇒ `.legal-content{flex:1}`(:371) 失效、footer 掉进文档流末尾，被顶到约 2000px 长文的最后一屏。
- 建议改法：把 `.legal-footer` 改成吸底（`position: fixed; left:0; right:0; bottom:0; z-index:90; background:var(--c-bg-page)` + `env(safe-area-inset-bottom)`），并给正文容器补等高占位。
- 修复类别：单页

### R8-L13-D13　P2 / 颜色token　批次 R8-B03
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`a83513e58e5a7a02`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:370`
- 理想图依据：无基准，依据=规范 §1.1 第 1 条「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ §1.2 卡片底 `--c-bg-container` 只用于卡片容器
- 现象：同页三种底色硬接成三明治：元信息带实测 y=155..185 为 #FFFFFF（`.legal-header:293` 的 `--c-bg-container`），其下正文区 y=200..814 整片是 #EEF7F2（x=189/x=10/x=370 三点同证）——`.legal-content` 规则只写了 flex/padding/box-sizing，没有 background，正文等于直接摊在页面底上；再往下 footer 又是一条 #FFFFFF。全站其余页都是「浅绿底 + 白卡」，本页是「白条 + 绿裸文 + 白条」。
- 建议改法：给 `.legal-content` 补 `background: var(--c-bg-container)` 与 `.legal-header` 连成一张卡（并按 §1.4 上 `--card-radius`/`--card-shadow`），或把 header 底色一并改成 `--c-bg-page`。
- 修复类别：CSS/token

### R8-L13-D14　P3 / 间距　批次 R8-B03
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`bd9183a359b960b0`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:372`
- 理想图依据：无基准，依据=规范 §1.4 页边距 `--page-padding` 32rpx=16px（全站唯一内容列）
- 现象：法务正文列实测 x=29..349（y=644 行 x=50..349、y=666 行 x=29..302 取并集），比全站标准内容列 x=33..345 左右各宽 4px。根因：`.legal-content` 用 `padding: var(--sp-6)`，而 design-variables.scss:552 的 `--sp-6` 实值 24rpx=12px，不是页边距令牌 `--page-padding`（:575，32rpx=16px）。
- 建议改法：`padding: var(--page-padding, 32rpx)`，与其余页同列。
- 修复类别：CSS/token

## subpackages/market/detail/index（4 条）

### R8-L14-D01　P2 / 颜色token　批次 R8-B48
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`7b75d7720fed4532`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:424`
- 理想图依据：无基准，依据=规范文档 §1.1 规则1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:31）+ §1.2 页面底色 --c-bg-page #EEF7F2（同文档:48）
- 现象：导航带实测 y=45..88（44px 高 × 378px 宽）整条为纯白 #FFFFFF，其上方 y=40 与下方 y=100 处 x=18 实测均为 #EEF7F2，画面因此被一条 44px（≈87rpx）白带切成三段；同分包 shop 页导航带是透明浅绿、wallet 页是品牌绿渐变，三页导航带底色三种。
- 建议改法：`.nav-bar` 底色由 `var(--c-bg-container)` 改为 `var(--c-bg-page)`（或 transparent），与页面底色统一，去掉白带。
- 修复类别：CSS/token

### R8-L14-D02　P2 / 可达性　批次 R8-B48
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`7b75d7720fed4532`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:437`
- 理想图依据：无基准，依据=组件规范 apps/client/src/components/common/EmptyState.vue:176-190（空态唯一可点元素需有可见胶囊底 + min-height 88rpx）与规范文档 §1.4 圆角/边框档（同文档:86-88）
- 现象：返回按钮圆底与导航带同色——实测圆内 x=8..48 / y=52..84 全为 #FFFFFF，与 #FFFFFF 导航带对比 1.00:1，64rpx（32px）热区在画面上没有任何可见边界；仅剩描边 `--c-border-card`（1rpx / 8% 黑）实测 #F8F9F9（与白底差 7/255），以及一枚 7×11px、最暗 #99A8BB、对白底对比度 2.42:1 的 BACK SVG 折角，低于非文本控件 3:1 门槛。
- 建议改法：圆底改用与导航带可区分的档位（如 `--c-bg-surface` 或 `--c-brand-bg-tint`）并把描边提到 `--c-border-default`，使热区轮廓可见。
- 修复类别：单页

### R8-L14-D03　P2 / 尺寸比例　批次 R8-B48
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`a63b85c700b98e9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:499`
- 理想图依据：无基准，依据=组件规范 apps/client/src/components/common/EmptyState.vue:181-185（R6-L05-D06 已把空态唯一可点元素补到 min-height:88rpx=44px）
- 现象：封存卡内唯一按钮「返回」实测 56×40px（111×79rpx），高度比组件规范的 88rpx（44px）少 8rpx/4px，落在 44px 平台最小热区之下；同页底部购买栏按钮用的是 96rpx（:648），同一页两套按钮高度档。
- 建议改法：`.product-state__btn` 的 `min-height` 由 80rpx 提到 88rpx，与 EmptyState 的 `.empty-action` 对齐。
- 修复类别：CSS/token

### R8-L14-D04　P3 / 颜色token　批次 R8-B48
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`a63b85c700b98e9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:523`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（全站色板内无蓝灰档，同文档:39-59）+ §1.1 规则3「一令牌一值…禁止私有色值」（同文档:33）；同问题在组件侧已定论并修：EmptyState.vue:152-164（素材私有色 #94A3B8 蓝灰，帧上实测最暗 #91A0B6，已加 filter 归色）
- 现象：封存锁图标实测最暗像素 #C0C8D5（素材 `static/assets/icons/common/lock.svg:1` 内 `stroke="#94A3B8"` 蓝灰 × 本行 opacity 0.55 叠 #EEF7F2 底），既不是 §1.2 的 --c-text-tertiary #6B7571 也不是 --c-status-disabled #DCE5E2，在白/浅绿底上发蓝发飘；shop、wallet 两页同一枚锁图标同色同透明度（实测均 40×44px，最暗 #C0C8D5），三页一起偏色。
- 建议改法：按 EmptyState.vue:162-164 的口径给封存图标加 `filter: grayscale(1) brightness(0.7)` 归到三级文本档，或换一枚 stroke 走 token 的锁图标。
- 修复类别：CSS/token

## subpackages/market/shop/index（4 条）

### R8-L14-D05　P2 / 位置　批次 R8-B49
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`35569672830fc4f3`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:714`
- 理想图依据：无基准，依据=组件规范 apps/client/src/components/common/EmptyState.vue:126-144（R6-L05-D02 定论：空态块必须 `flex:1 + justify-content:center` 垂直居中，不得贴顶）
- 现象：封存卡实测 y=131..304，几何中心 y=217，而可视区（导航内容下沿 y≈90 到 home 指示条 y=799）中心为 y=445，整块偏上约 190px（≈377rpx），卡下方 y=305..799 共 495px 是纯底色空场；同面墙在 detail 页是垂直居中的（卡中心 435 vs 该区中心 451），两页同一空态一个居中一个贴顶。
- 建议改法：`.shop-page` 给封存分支留出可解析高度（flex:1 + align-items:stretch），`.shop-sealed` 用 `margin:auto` 或外层容器 `justify-content:center` 居中，去掉写死的 60rpx 顶距。
- 修复类别：单页

### R8-L14-D06　P3 / 圆角　批次 R8-B49
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`35569672830fc4f3`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:716`
- 理想图依据：无基准，依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx = 20px」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:87）
- 现象：封存卡圆角走 `--r-xl`（$radius-xl 24rpx = 12px），实测左上/左下圆弧只占 8 行像素（y=131 首行白区左沿 x=20，到 y=139 才收敛到 x=13），而 §1.4 卡片圆角规定 40rpx=20px；同一面封存卡在 wallet 页实测弧高 12px（x 由 22 收敛到 9），两页同组件两档圆角，均未达规范档。
- 建议改法：`.shop-sealed` 圆角改 `var(--card-radius, 40rpx)`，并与 wallet 页的 `.wallet__sealed` 取同一档。
- 修复类别：CSS/token

### R8-L14-D07　P3 / 字号　批次 R8-B49
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`35569672830fc4f3`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:441`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表「页面主标题 — 26–28px / 700–800 / 页头标题」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:68）
- 现象：页头标题「逛逛」实测字面高 20px、单字宽 21px（墨迹 x=54..95 / y=64..83，两字）⇒ 字号 44rpx=22px，比 §1.3 规定的页头标题 26–28px 少 4–6px；同分包另两页页头分别是 detail 导航标题 16px（墨迹 61×14px，:452 用 --fs-2xl）与 wallet 标题 15px（墨迹 56×12px，:279 用 --fs-xl），三页三种页头字号，无一落在规范档。
- 建议改法：三页页头标题统一到一档（新增/复用 52–56rpx 的页面主标题令牌），别再各写 var 兜底值。
- 修复类别：CSS/token

### R8-L14-D08　P3 / 间距　批次 R8-B49
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`35569672830fc4f3`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:715`
- 理想图依据：无基准，依据=规范文档 §1.4「页边距 --page-padding 32rpx = 16px / 卡片内边距 --card-padding 32rpx = 16px」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:83-85）
- 现象：封存卡上下内边距实测 41px（卡顶 y=131→锁顶 y=172）/ 44px（说明底 y=260→卡底 y=304）＝写死的 80rpx，而 wallet 页同一面墙同一段内容实测只有 18px/20px（--sp-8 32rpx）⇒ 两页卡高 174px vs 126px，差 48px；卡左右外边距实测 13px（x=13..364）≠ §1.4 页边距 16px，wallet 侧实测 9px，三页墙三种外边距。
- 建议改法：内/外边距改取 `--card-padding`（32rpx）与 `--page-padding`（32rpx），删掉 80rpx/48rpx/60rpx/24rpx 四个裸值。
- 修复类别：CSS/token

## subpackages/market/wallet/index（4 条）

### R8-L14-D09　P2 / 颜色token　批次 R8-B50
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`f031917d4c66279b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:269`
- 理想图依据：无基准，依据=规范文档 §1.1 规则3「一令牌一值：页面只引用 var(--c-*)…禁止私有色值」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:33）+ §1.2 边框/文本档同表（同文档:51-59）
- 现象：返回按钮圆底取 `--c-overlay-white-bg-tint`，该令牌注册值是 rgba(255,255,255,**0.08**)（theme/design-variables.scss:914），而本行内联兜底写的是 0.2 ⇒ 生效值只有作者意图的 40%；实测圆底均值 #49CEA3 vs 同 y 绿带均值 #3ECC9D，相对亮度 0.4865 / 0.4691，对比度 **1.034:1**，64rpx 圆在绿色导航带里完全看不出轮廓（兄弟页 detail/shop 的返回圆底为 #FFFFFF，在同位置肉眼可辨）。
- 建议改法：本行改用 `--c-overlay-white-bg-tint-strong`（rgba .12）以上或显式 rgba(255,255,255,0.2)，让圆底与绿带拉开到 ≥1.3:1。
- 修复类别：CSS/token

### R8-L14-D10　P3 / 圆角　批次 R8-B50
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`f031917d4c66279b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:350`
- 理想图依据：无基准，依据=规范文档 §1.4 圆角档「--r-sm → --r-full：4/8/12/20/24/32/9999rpx」与「卡片圆角 --card-radius 40rpx=20px」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:86-87）
- 现象：本行写的令牌 `--r-2xl` 在 design-variables.scss 里不存在（注册的是 --r-xxl，:447），实际靠 var() 兜底 32rpx 生效；实测卡左上弧占 12 行（y=114 首行白区左沿 x=22 → y=126 收敛到 x=9），即 16px 档，而规范卡片圆角是 40rpx=20px，同面墙在 shop 页实测只有 8 行/12px 档 ⇒ 令牌名写错 + 两页圆角互不一致。
- 建议改法：令牌名改为已注册的 `--r-xxl`（或直接 `var(--card-radius)`），并与 shop 页统一取同一档。
- 修复类别：CSS/token

### R8-L14-D11　P3 / 素材缺失　批次 R8-B50
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`f031917d4c66279b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:153`
- 理想图依据：无基准，依据=规范文档 §1.1 规则4「emoji 一律替换为标准 SVG」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:34）+ 分包内既有资源 ICONS_COMMON.BACK（detail/index.vue:299、shop/index.vue:278 均在用）
- 现象：导航带返回标记不是图标资源，而是文本字符「‹」；实测其亮色墨迹只有 5×6px（x=22..26 / y=67..72），而同一分包 detail、shop 两页用 BACK SVG 的墨迹是 7×11px 与 6×11px ⇒ 标记矮 5px（≈10rpx）、且是一个细斜撇不是折角箭头，在 1.034:1 的隐形圆底上几乎读不出是返回键。
- 建议改法：换成与兄弟页一致的 `<image :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit">`（40rpx 方框），删掉文本字符。
- 修复类别：需新建目标功能

### R8-L14-D12　P3 / 空态文案　批次 R8-B50
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`f031917d4c66279b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:213`
- 理想图依据：无基准，依据=组件规范 apps/client/src/components/common/EmptyState.vue:110-120（空态三段：标题 + 说明 + actionText 操作文案）与同墙 detail 分支 apps/client/src/subpackages/market/detail/index.vue:310-319（卡内有「返回」操作文案）
- 现象：本页封存卡文案到说明行为止（实测说明行墨迹 y=211..220 即卡内最后一个节点，卡底 y=240），没有第三段操作文案；同面墙在 detail 页卡内有「返回」绿色胶囊（实测 56×40px，y=465..504），shop 页同样没有 ⇒ 三页共用同一段 i18n 文案（zh-CN.ts:803-804）却给出两种空态文案层级。
- 建议改法：三页封存卡统一走一个共用封存空态组件（含 actionText 位），wallet/shop 补「返回」操作文案，与 detail 对齐。
- 修复类别：单页

## subpackages/profile-extra/feedback/history（3 条）

### R8-L11-D08　P2 / 文案　批次 R8-B51
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`035ad86eb60e4a59`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:268`
- 理想图依据：无基准，依据=规范文档§3 逐页说明（页头副标题说明页面用途，空态文案说明空态原因，两者不得同句）
- 现象：同一句话「提交反馈后将在此处显示」在本帧出现两次：一次是 AppShell 副标题（y=139..149，左对齐 x≈16 起），一次是 EmptyState 描述（y=350..360，居中 x=126..253）——两处都绑 `feedback.historyEmptyDesc`（:268 与 :305），且一左一中对齐方式还不一致。
- 建议改法：副标题换成页面用途描述（如「查看你提交过的反馈与官方回复」），空态描述保留原键。
- 修复类别：单页

### R8-L11-D09　P3 / 位置　批次 R8-B09
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`035ad86eb60e4a59`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:191`
- 理想图依据：无基准，依据=规范文档§1.4 页边距 --page-padding 32rpx（正文墨迹不得贴住 x=0）
- 现象：帧最左缘 x=0..1、y=28..50 残留 3 段灰色笔画（实测 #7F8481 / #999E9C），位于「返回」胶囊（y=44..78）之上、状态栏之下，是越界到视口外被裁掉只剩 1px 的节点墨迹；该节点为 AppShell 首个子元素「跳到主内容」链接，其隐藏依赖 `clip: rect(0,0,0,0)`（styles/a11y.scss:23），mp-weixin 不支持 clip，故只裁掉宽度未裁掉笔画。全站仅此页帧（AppShell 头部）可见该残留。
- 建议改法：该隐藏节点改用 mp 可靠口径（left:-9999px + width/height:1px 或直接不渲染），避免 1px 墨迹落在视口边缘。
- 修复类别：单页

### R8-L11-D10　P2 / 位置　批次 R8-B09
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`035ad86eb60e4a59`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:268`
- 理想图依据：无基准，依据=组件规范 EmptyState（空态应在可用区垂直居中）+ 规范文档§3 逐页说明
- 现象：空态整块（放大镜 x=150..227 / y=263..329 + 标题 y=330..341 + 描述 y=350..360，合 bbox y=263..361）几何中心实测 y≈312，而筛选条底沿 y≈198 到视口底 814 的可用区中心是 y≈506——空态比光学中心高 194px，其下留白 453px（占帧高 56%）。EmptyState 已按上一轮加了 `flex: 1 0 auto`（EmptyState.vue:142），但宿主链 `.shell` 只有 `min-height: 100%`（AppShell.vue:268）不可解析，flex 伸展拿不到确定高度，居中依旧不成立。
- 建议改法：给 `.shell`/`.shell__body` 一条可解析高度（如 `height: 100vh` 或 `min-height: calc(100vh - …)`），或本页空态宿主显式给高。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/album（3 条）

### R8-L10-D10　P1 / 素材缺失　批次 R8-B52
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`7f8a421b126b1238`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:83`
- 理想图依据：无基准，依据=规范§1.6 铁律 3 + 本页 R6-B55/D15 自述判据「功能图标禁止当照片渲染」；帧实测第 2、3 格（x≈124..224 / x≈232..332, y≈115..207）整片为绿色地图 pin 功能图标，非照片
- 现象：上一轮修得不对——R6-B55/D15 的降级判据只拦含 `/assets/icons/` 的路径，real 档 photoGallery 里两枚 pin 图标路径未被命中，帧上第 2、3 格仍把功能图标当「已上传照片」整格渲染（计数 3/6 也把它算成照片）
- 建议改法：判据扩为按扩展名+目录双拦（.svg、icons、svg-spec 一律降级为空槽），并在 store 侧登记脏数据清洗
- 修复类别：单页

### R8-L10-D11　P3 / 字号　批次 R8-B52
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`7f8a421b126b1238`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:865`
- 理想图依据：无基准，依据=规范§1.3 正文/按钮字阶（同域 location 主按钮文案 28rpx，见 location.vue:537）；帧实测「添加照片」字面带高约 13px，明显小于「重新定位」的 14px
- 现象：主 CTA「添加照片」文字用 --fs-md(26rpx=13px) 标签档，比同分包主按钮口径 28rpx 小一档
- 建议改法：改 font-size: 28rpx（与 location.vue .location-btn__text 同档）
- 修复类别：CSS/token

### R8-L10-D12　P3 / 可达性　批次 R8-B52
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`7f8a421b126b1238`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:663`
- 理想图依据：无基准，依据=规范§1.2（text-primary #1A1E1C 用于可点图标）；帧实测返回钮字形最深像素 (150,164,185)≈#94A3B8 蓝灰 PNG 描边，压白圆底对比度≈2.4:1，低于 3:1
- 现象：本页唯一退出口仍是 40rpx 的 ICONS_COMMON.BACK 蓝灰栅格图（同域 location 在 R7 已换 52rpx 深色 ‹ 字形），箭头淡到近不可辨
- 建议改法：照抄 location.vue:183-184/313-318 的「‹ 字形 + --c-text-primary 52rpx」配方
- 修复类别：单页

## subpackages/profile-extra/profile/favorites（3 条）

### R8-L10-D13　P2 / 位置　批次 R8-B53
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`f2b33bb0a81c35c3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:152`
- 理想图依据：无基准，依据=规范§1.1 布局均衡口径 + 本页 R7-L10-D17 自设验收目标「空态落在可用区垂直居中」（视口中心 y≈407）；帧实测列扫描 x=189 深色带 y=138..295，内容中心≈y217，比目标高约 190px，与 R7 帧记录（星标 y140..200、按钮底 y296）逐像素同位
- 现象：上一轮修得不对——宿主补了 flex 列 + min-height:100vh，但 R8 帧上空态块纹丝未动仍贴顶，EmptyState 的 flex:1 未获得可解析高度，y≈300..800 整屏空白依旧
- 建议改法：给 .favorites-page 内 EmptyState 直接套 flex:1 的包裹层（或宿主 height:100vh + overflow:hidden 验证撑满），改后需以帧上内容中心≈视口中心为验收
- 修复类别：单页

### R8-L10-D14　P3 / 字号　批次 R8-B53
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`f2b33bb0a81c35c3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:176`
- 理想图依据：无基准，依据=规范§1.3 页面主标题 26–28px/同域收敛口径（location.vue:325、privacy.vue:291、album.vue:670 三页页头标题均已统一 var(--fs-4xl)=40rpx）；帧实测本页标题字面带高约 15px，四页同屏对比明显矮一档
- 现象：「我的收藏（0）」页头标题仍是 var(--fs-xl, 32rpx)（真值 30rpx=15px，兜底 32rpx 是假兜底），错过 R6-B57/D10 的同域三页统一档
- 建议改法：改 var(--fs-4xl)，与同分包其余三页页头同档
- 修复类别：CSS/token

### R8-L10-D15　P3 / 可达性　批次 R8-B53
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`f2b33bb0a81c35c3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:165`
- 理想图依据：无基准，依据=仓内热区口径 AppShell.vue:334 的 88rpx + 规范§1.2；帧实测返回字形最深像素 (150,165,186)≈#94A3B8 压白底对比度≈2.4:1，圆钮热区实测直径约 32px=64rpx
- 现象：唯一退出口返回钮热区仍 64rpx（同域 other/location/privacy/album 均已在 R6/R7 提到 88rpx），且图标仍是淡蓝灰 BACK 栅格图（favorites.vue:12），双重不达标
- 建议改法：热区提 88rpx + 圆底内换 52rpx 深色 ‹ 字形（location.vue:286-318 现成配方）
- 修复类别：单页

## subpackages/profile-extra/profile/location（2 条）

### R8-L10-D06　P3 / 圆角　批次 R8-B54
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`f07700b4e53e3eb3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:347`
- 理想图依据：无基准，依据=规范§1.4 卡片圆角 --card-radius=40rpx(20px)；源码 .location-card 写死 32rpx(16px)，帧实测卡角弧半径≈16px，比全站卡片档小 4px
- 现象：位置信息卡圆角 32rpx 不入 --card-radius 40rpx 档位，与同域 privacy/album 卡片弧度不齐
- 建议改法：border-radius 改 var(--card-radius, 40rpx)
- 修复类别：CSS/token

### R8-L10-D07　P3 / 字号　批次 R8-B54
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`bc48e66ec81a39b1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:389`
- 理想图依据：无基准，依据=规范§1.3 字阶表（11px/22rpx 属「极小档，角标·法务」，正文/数据行应 15–16px、辅助 14–15px）；经纬度是本页核心数据行
- 现象：「经度 — · 纬度 —」坐标行 font-size:22rpx(11px) 落在角标/法务档，卡内主数据用极小字级呈现
- 建议改法：提到 var(--fs-lg, 28rpx) 并把兜底色 #94A39F 修正为 tertiary 真值 #6B7571
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（5 条）

### R8-L10-D01　P2 / 尺寸比例　批次 R8-B16
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`17b836ac0cb8856b`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:88`
- 理想图依据：他人显示主页.png 身份卡骑压头像区 + 规范§3.9「头像 72px 浮动骑压」；帧实测头像外圆 x≈15..107 ⇒ 直径 92px，占屏宽 24.3%，理想图同位比例约 19%，超规范 20px
- 现象：浮动头像圆 176rpx 宽 + 8rpx 白描边实渲约 92px 直径，比规范§3.9 规定的 72px 大 20px，骑压深度与身份卡比例随之整体偏大
- 建议改法：头像宽高改 144rpx（72px）并同步收 .public-identity 顶部预留 padding
- 修复类别：CSS/token

### R8-L10-D02　P2 / 位置　批次 R8-B17
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`17b836ac0cb8856b`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:101`
- 理想图依据：他人显示主页.png 身份卡「星野 ♀ 在线」行位于头像右侧（头像圆心 y≈325、姓名行 y≈325 同带）+ 规范§3.9「头像浮动骑压 + 右侧三行」；实帧姓名「小新生」y≈355..380 落在头像（y≈243..333）正下方
- 现象：身份卡用 148rpx 通栏 padding-top 把头像区整行让出，姓名/信息三行全部排在头像下方，理想图与规范要求的「姓名三行在头像右侧」不成立
- 建议改法：__main 左缘为头像让出 72px 列（margin-left 或 grid 两列），姓名行与头像中心同带起排
- 修复类别：单页

### R8-L10-D03　P3 / 可达性　批次 R8-B17
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`17b836ac0cb8856b`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:259`
- 理想图依据：无基准行，依据=规范§1.2（#9AA39F 是「占位/placeholder」档，说明文字应走 tertiary #6B7571）；帧实测「资料暂未完善」字形最深像素 (157,165,162)≈#9AA39F 压白卡，相对亮度比≈2.5:1，低于 3:1
- 现象：身份卡信息行的空态兜底文案「资料暂未完善」用 placeholder 档 #9AA39F 渲在纯白卡上，是卡内唯一可读信息却按占位色弱化
- 建议改法：--empty 修饰符颜色提到 var(--c-text-tertiary, #6B7571)
- 修复类别：CSS/token

### R8-L10-D04　P2 / 层级遮挡　批次 R8-B55
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`d8149ecd29b7ea98`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:482`
- 理想图依据：他人显示主页.png 顶部为静态整页，无滚动叠印带；实帧 bottom 态列取样 x=60 深色带 y≈20..75——姓名「小新生」升入状态栏文字带（y15..28）并与 fixed 返回芯片（y≈58..96）上缘相接，「打招呼」胶囊顶缘 y≈93 距系统胶囊底缘 y≈95 仅 2px
- 现象：fixed 头部 background:transparent 且不给滚动内容预留避让带，滚起后身份卡文字直接穿进状态栏/胶囊带，与两枚芯片叠挤（同域头部预留 96–127px 胶囊缓冲的口径此页缺失）
- 建议改法：给 ProfileShell 内容区加与头部等高的 padding-top 缓冲，或头部滚动态加半透明底衬
- 修复类别：单页

### R8-L10-D05　P3 / 颜色token　批次 R8-B15
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`d8149ecd29b7ea98`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:73`
- 理想图依据：他人显示主页.png「生活瞬间」区——标题与 4 格照片直接铺在页面浅底上、无白色容器；实帧 bottom 该节为 #ffffff 圆角卡+投影（y≈370..495 整块白底）
- 现象：生活瞬间整节套了一层理想图不存在的白卡容器（background:#ffffff + box-shadow），把该节与上方裸底排布的签名/标签卡混排成两种分组语法
- 建议改法：去掉容器白底与阴影，标题+4 格直接落在页面底上，与理想图一致
- 修复类别：CSS/token

## subpackages/profile-extra/profile/privacy（2 条）

### R8-L10-D08　P3 / 圆角　批次 R8-B56
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`7ed73ce77a824608`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:313`
- 理想图依据：无基准，依据=规范§1.4 卡片圆角 --card-radius=40rpx(20px)；源码两张白卡均 var(--r-xl, 24rpx)，帧实测开关卡/入口卡角弧≈12px，为规范档的六成
- 现象：隐私页全部白卡圆角走 --r-xl(≤24rpx) 而非 --card-radius(40rpx)，比同域 location/album 卡片明显更方
- 建议改法：.privacy-page__section 圆角改 var(--card-radius, 40rpx)
- 修复类别：CSS/token

### R8-L10-D09　P3 / 圆角　批次 R8-B56
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`7ed73ce77a824608`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:426`
- 理想图依据：无基准，依据=规范§1.4 卡片圆角 --card-radius=40rpx(20px)；R7 新增的底部说明块（帧实测 y≈555..640 薄荷块）角弧≈12px，与 20px 卡片档不齐
- 现象：说明块 .privacy-page__note 圆角同样落在 var(--r-xl, 24rpx)，上一轮补块的圆角没对齐卡片档
- 建议改法：note 块圆角改 var(--card-radius, 40rpx)，与 :313 两卡同档
- 修复类别：CSS/token

## subpackages/profile-extra/profile/tasks（4 条）

### R8-L11-D01　P1 / 素材缺失　批次 R8-B57
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`348845aeee454b9a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:250`
- 理想图依据：无基准，依据=规范文档§1.6（mp-weixin 渲染铁律）+ tasks.vue 自带 taskIcon 映射约定（每日签到=check-circle / 完善资料=user / 校园认证=graduation-cap 三枚图标应互异）
- 现象：4 个任务图标位实测只有 2 种图形——第 1/2/4 卡（y=194..207、264..277、405..418）墨迹 bbox 均为 17×14px 的同一枚「三叉星」sparkles 兜底图，仅第 3 卡（y=334..349，18×16px）是 heart；check-circle.svg / user.svg / graduation-cap.svg 三枚图标在本帧 0 像素可见。原因是 real 模式任务 id 取后端 code（daily-checkin / complete-profile / campus-verify，见 :166），而 taskIcon 的 switch 只匹配 mock 的 checkin / profile / verify，三条全部落到 :250 的 default 兜底。
- 建议改法：taskIcon 的 case 补后端 code（daily-checkin/complete-profile/campus-verify），或改按 code 前缀匹配，使 default 只在未知任务时兜底。
- 修复类别：单页

### R8-L11-D02　P2 / 颜色token　批次 R8-B57
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`348845aeee454b9a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:416`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（全站无 #94A3B8 这一色值；§1.1 规则 2「绿色=行动」）
- 现象：任务图标用裸 `<image>` 直引 SVG，实测四枚墨迹主色为 #95A4B9 / #A5B5C4 / #ACBDC9（蓝灰系，即 sparkles.svg、heart.svg 第 1 行硬写的 stroke="#94A3B8"），坐在 35×35px 的 `--c-bg-brand`（实测底 #E8FBF2）薄荷胶囊里；R7 只把 EmptyState 内的同名图标中和掉，本页仍出蓝灰字形。
- 建议改法：为该 `<image>` 换用已按 --c-brand 上色的图标，或沿用 EmptyState.vue 的 filter 染色口径，使图标与薄荷底同色族。
- 修复类别：CSS/token

### R8-L11-D03　P2 / 圆角　批次 R8-B01
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`348845aeee454b9a`）
- 源码证据：`apps/client/src/theme/global.scss:145`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius = 40rpx = 20px」
- 现象：本帧 5 张卡（积分卡 y=101..158、任务卡 y=172..231 / 243..301 / 313..371 / 383..441）全部走 `.card-base`，其圆角取 `--r-lg`（20rpx）；逐行拟合左上角曲率，白底从第 1 行内缩 6px、第 4 行内缩 2px、第 8 行才与卡片左缘 x=17 相切，拟合半径 ≈7.5–10px（15–20rpx），只有 §1.4 卡片标准 40rpx/20px 的一半。
- 建议改法：`.card-base` 的 border-radius 改 `var(--card-radius)`，或本页显式覆盖为 40rpx 与其它页卡片对齐。
- 修复类别：CSS/token

### R8-L11-D04　P2 / 文案　批次 R8-B57
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`348845aeee454b9a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:219`
- 理想图依据：无基准，依据=规范文档§3 该页口径（任务中心：完成度文案与任务状态必须自洽）
- 现象：同一帧内自相矛盾——第 3 卡（y=313..371）按钮实测为「领取」（绿底 #36C99A 胶囊 x=296..344），即该任务已完成待领取；而页头 y=68..82 写「0/4 已完成」、积分卡 y=101..158 写「累计获得 0 积分 / 0%」且进度条实测为 0 填充（轨道 #EEF2F0 全裸）。doneCount/earnedPoints 只统计 claimed（:219），未把 claimable（:208 判为已完成）计入。
- 建议改法：完成度与进度改为 `claimable || claimed` 计数，或把「0/4 已完成」文案改为「已领取 N/4」与按钮语义区分。
- 修复类别：单页

## subpackages/profile-extra/profile/visitors（3 条）

### R8-L09-D22　P1 / 位置　批次 R8-B58
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`ceb4b53147d27725`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:345`
- 理想图依据：无基准，依据=规范文档§1.4 页边距 + 组件规范（同页头部左右配重应让标题落在视口中线；对照同分包 settings 帧「设置」实测中心 x=188.5）
- 现象：标题「谁看过我」实测墨迹 x=185-268（中心 x=226.5），视口中线 189 ⇒ 整条标题右偏 37.5px（≈74rpx），而返回圆钮实测 x=18-46 贴在左轨。根因是 .visitors-header 用 `justify-content: space-between` 且计数节点带 `v-if="visitors.length > 0"`：空列表时该行只剩两个子元素，space-between 把标题推到 padding-right:96px 预留带（:348）的左边界 x=282 处。
- 建议改法：空态下让标题回到左轨（`justify-content: flex-start` + 标题 margin-left），或给计数节点渲染占位元素保持三槽配重。
- 修复类别：单页

### R8-L09-D23　P2 / 可达性　批次 R8-B58
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`ceb4b53147d27725`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:284`
- 理想图依据：无基准，依据=组件规范（同仓 R6-L10-D16 判据：空态卡除返回外必须留一个可用出口，否则为死端）
- 现象：空态卡（实测白底 x=17-360 / y=119-282）内只有眼睛图标 + 「暂无访客记录」+ 副标「完善资料，让更多人发现你」，:284 之后直接 :285 收尾，没有任何按钮或链接——文案明确指示用户去做「完善资料」这一动作，页面上却找不到对应入口，整页唯一可点节点只剩返回钮。
- 建议改法：在 :284 后补一枚跳「编辑资料」的次级按钮（复用 ROUTES.SETUP_PROGRESS.PROFILE 既有路由与 i18n 键）。
- 修复类别：单页

### R8-L09-D24　P2 / 尺寸比例　批次 R8-B58
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`bb6d7dfa9fe6ad21`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:335`
- 理想图依据：无基准，依据=组件规范（EmptyState 应在宿主给定的可解析高度内垂直居中）
- 现象：bottom 帧与 top 帧内容逐像素相同（页面不可滚动），空态卡实测 y=119-282 停在视口上方，其下 y=282-814 共 532px（占 814px 视口 65%）是纯页面底——空态既没有居中也没有把剩余高度用掉；宿主 .visitors-page 只写 `min-height: 100%`（:335）+ flex column，父高不可解析，空态块（.visitors-empty，:449）也没有 flex:1，居中链断在宿主这一环（与 village/history 已证同一根因）。
- 建议改法：给 .visitors-page 可解析高度（height: 100vh 兜底或 calc(100vh - 头部)），并让 .visitors-empty `flex: 1; justify-content: center`。
- 修复类别：单页

## subpackages/profile-extra/settings/dnd（3 条）

### R8-L11-D05　P1 / 可达性　批次 R8-B59
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`14a3ad7a2170e38c`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:369`
- 理想图依据：无基准，依据=规范文档§1.2（禁用/边框令牌 --c-status-disabled #DCE5E2 / --c-border-default #DDE3E0）+ 组件规范（开关需可辨 ON/OFF 两态）
- 现象：总开关关闭态在白色卡片上几乎不可见：实测开关轨道内部 y=155 处为 #FFFFFF、x=310/y=130..176 全程 #FFFFFF，与卡片底 #FFFFFF 同值（对比度 1.0:1），整枚控件只剩 #D8D8D8/#E7E7E7 一圈发丝描边（约 1.06:1），滑块靠 y=173..174 的 #BBBBBB 阴影勉强分离；而同行右侧「已关闭」文字（y=209..219）与底部紧急开关（ON 态实测 #36C99A 轨道）形成强烈反差，用户无法从控件本身判断状态。
- 建议改法：自绘开关轨道（关闭态填 --c-status-disabled，描边 --c-border-default），或给原生 switch 的容器补一层可辨底色。
- 修复类别：单页

### R8-L11-D06　P2 / 文案　批次 R8-B59
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`14a3ad7a2170e38c`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:472`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（分组标题为辅助层，不得与行标题同字同位重复）
- 现象：分组标题与卡片内行标题用同一个 i18n 键，画面上一字不差地重复两遍：实测 y=106..116（灰，28 个墨点）与 y=143..154（黑，34 个墨点）同为「开启免打扰」（:361 / :366）；y=727..737（110 个墨点）与 y=770..781（117 个墨点）同为「紧急消息仍会通知，避免错过重要信息」（:472 / :477）。
- 建议改法：分组标题保留，卡内行标题改为开关动作语义（如「免打扰」/「紧急消息穿透」），或去掉重复的 section__title。
- 修复类别：单页

### R8-L11-D07　P1 / 层级遮挡　批次 R8-B59
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`fd06df9394df44f5`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:571`
- 理想图依据：无基准，依据=规范文档§1.6 渲染铁律（胶囊区不得被内容占位）+ 已知系统性成因「滚动后内容滑入系统胶囊带」
- 现象：本页为自然流滚动、导航栏不固定：bottom 帧里导航（免打扰标题）已整条滚出，第一组开关行顶到 y=27，实测开关控件占 x=297..347 / y=27..57（逐行取边：y=44 处 #E0E0E0/#E4E4E4/#E6E6E6 三条边线），而系统胶囊固定占 x≈296..352 / y≈44..77（两帧深色字形墨迹 bbox 同为 x=298..355 / y=18..71）——两者在 x=297..347 × y=49..57 约 50×8px 区域叠印，放大后开关下半与胶囊白底互相咬合，开关不可点、状态不可读。根因是 `.safe-top` 只补了状态栏高度（`calc(var(--statusbar, env(...)) + 0rpx)`），未给胶囊留缓冲。
- 建议改法：导航栏改 position:sticky/fixed 并让 `.safe-top` 按胶囊底沿（约 statusbar+44px）留白，或整页改 scroll-view 内滚、导航常驻。
- 修复类别：单页

## subpackages/profile-extra/settings/index（5 条）

### R8-L09-D07　P2 / 颜色token　批次 R8-B60
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`ff043e9ee75c0d85`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:703`
- 理想图依据：无基准，依据=规范文档§1.1 原则1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ §1.2 --c-bg-page #EEF7F2
- 现象：页面底被写成 `linear-gradient(180deg, var(--c-bg-page), var(--c-tint-blue-50))`，实测同帧左缘取色 y=150 → #EAF3F1（绿偏）、y=400 → #EBF6F5、y=700 → #E9F5F7（b 比 r 高 14）——一屏之内从规范浅绿一路漂到蓝底，正是§1.1 原则1 禁止的页面间断层。
- 建议改法：底色收成单色 `var(--c-bg-page)`（#EEF7F2），去掉 --c-tint-blue-50 这一渐变终点。
- 修复类别：CSS/token

### R8-L09-D08　P2 / 可达性　批次 R8-B60
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`ff043e9ee75c0d85`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:863`
- 理想图依据：无基准，依据=规范文档§1.2（--c-text-tertiary #6B7571 为最弱文字下限；--c-border-* 是描边令牌，不作文字色）
- 现象：15 行菜单右侧的进入箭头「›」实测最深像素 #D5DBD8（x350,y154），落在白卡上对比度 1.4:1；声明取的是 `var(--c-border-strong, #C2CAC6)`——一个描边令牌被当文字色用，18px 细体描出来只剩一层浅灰，箭头这一「可进入」提示在整页几乎不可见。
- 建议改法：箭头色换成 var(--c-text-placeholder) 之上（--c-text-tertiary #6B7571 ⇒ 4.8:1），或改用 SVG 箭头图标保厚度。
- 修复类别：CSS/token

### R8-L09-D09　P3 / 间距　批次 R8-B60
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`ff043e9ee75c0d85`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:770`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」
- 现象：分组卡实测左缘 x=13、右缘 x=365（y=150/160/200 三行一致）⇒ 水平外边距 12px = 硬编码 `24rpx`，比规范 --page-padding（32rpx=16px）少 4px；同页 .nav-bar 的 `padding: 0 24rpx`（:713）与 .menu-item 的 `28rpx`（:795）又是另两个值，整页 gutter 三套口径。
- 建议改法：.section 的水平 margin 改 var(--page-padding)，与全站 32rpx 对齐。
- 修复类别：CSS/token

### R8-L09-D10　P1 / 层级遮挡　批次 R8-B60
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`c0752fbe7b452b90`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:717`
- 理想图依据：无基准，依据=组件规范（全站头部应保留状态栏避让带；本道已知系统性成因「header 随滚动让内容穿过系统区」）
- 现象：.nav-bar 是 `position: relative`（非 sticky/fixed），滚到底帧时整条白底导航（顶帧实测 y=46-87）已随文档移出，列表内容直接顶进系统状态栏带：实测「免打扰」文字墨迹 y=10-36、其左侧图标圆底 x=27-57/y=15-46，而系统时间「1:04」墨迹占 x=0-32/y=17-28——图标与时钟在 x=27-32、y=17-28 直接叠印，且页面标题「设置」在滚动后完全消失。
- 建议改法：给 .nav-bar 加 `position: sticky; top: 0;`（或不滚动整页、把列表放进 scroll-view），并保证头部有不透明底。
- 修复类别：单页

### R8-L09-D11　P1 / 层级遮挡　批次 R8-B60
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`c0752fbe7b452b90`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:717`
- 理想图依据：无基准，依据=组件规范（微信胶囊安全区：右上 87×32 胶囊不得被页面可交互元素占用）
- 现象：滚动后「本周安排」一行的开关实测灰环 bbox x=287-370 / y=49-99，而系统胶囊白底实测 x=265-369 / y=25-94——两者重叠区 82×45px，开关上半截被胶囊压住（放大裁图可见胶囊只盖住开关上缘），该行成为整页唯一被遮挡的控件；根因同 D10：头部不吸顶、内容无避让带。
- 建议改法：同 D10 让头部吸顶占位；另给开关行在滚动区顶部预留胶囊高度缓冲（≥88rpx）。
- 修复类别：单页

## subpackages/profile-extra/verification/index（6 条）

### R8-L09-D12　P1 / 颜色token　批次 R8-B61
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`d745173706c05630`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:112`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（--c-purple #A29BFE 用途栏明写「未认证 · 兴趣分类」；--c-brand 用途=「主按钮·选中态」）
- 现象：未认证态状态标题「未认证」实测墨迹 #33C999（x163-215,y197-213 众数），与 real-name 帧上「已实名认证」实测 #36C99A 为同一令牌 --c-brand-500（:112 与 real-name.vue:90 写的是同一个值）——已认证与未认证两态用同一个成功绿，颜色上完全无法区分；规范给「未认证」定的 --c-purple #A29BFE 没有被用上。
- 建议改法：:112 的 default（未认证）分支 color 改 var(--c-purple, #A29BFE)，把 brand 绿留给已认证/可行动态。
- 修复类别：CSS/token

### R8-L09-D13　P1 / 可达性　批次 R8-B61
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`d745173706c05630`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:834`
- 理想图依据：无基准，依据=规范文档§1.2（--c-warning #F59E0B 为「中强度」提示色，不应作小字正文色）+ §1.3 小字层级
- 现象：门控横幅「未认证用户仅可浏览，完成认证后可喜欢 / 发消息 / 发帖」实测文字 #F7AD2F~#F59E0B、横幅底实测 #FFF8E1（--c-tint-amber-50，design-variables.scss:827），WCAG 对比度 2.0:1，且字号走的是 --fs-sm（22rpx）这一全站最小正文档（:833）——这是全站唯一一条说明「游客能做什么/不能做什么」的门控文案，却是最难读的一行。
- 建议改法：文案色改 --c-text-primary 或 brand-700 深色系（同底 ≥7:1），把 #F59E0B 只留给横幅左侧的警示三角图标。
- 修复类别：CSS/token

### R8-L09-D14　P2 / 颜色token　批次 R8-B61
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`d745173706c05630`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:113`
- 理想图依据：无基准，依据=规范文档§1.2（状态卡浅底应取 brand-50 #E8FAF3 / romance-50 #FFECEF 一族；表内无蓝调卡底）
- 现象：未认证状态卡底色实测 #E8F4FD（r232/g244/b253，蓝>绿>红的蓝调），来自 :113 的 --c-tint-blue-soft；同一组件在已认证态用的是 real-name.vue:91 的 --c-brand-50 #E8FAF3（real-name 帧实测卡底正是 #E8FAF3）——同一张状态卡两态换了两套色相，且蓝调与本道其余帧的浅绿体系（--c-bg-page #EEF7F2）断层。
- 建议改法：未认证卡底改 --c-purple 的 50 阶浅底（或统一 --c-brand-50），与已认证态同族。
- 修复类别：CSS/token

### R8-L09-D15　P3 / 间距　批次 R8-B61
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`d745173706c05630`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:899`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」
- 现象：状态卡、权益格、表单卡、上传卡实测统一左缘 x=13、右缘 x=365（y=420/520/610/730 四行取色一致）⇒ 页边距 12px = 硬编码 `margin: 24rpx 24rpx 0`，比规范 32rpx 少 4px；同页 .gate-banner 用 `margin: 0 24rpx`（:815）而权益格间隙用 16rpx（:916），三种水平节奏并存。
- 建议改法：.section 与 .gate-banner 的水平 margin 统一 var(--page-padding)。
- 修复类别：CSS/token

### R8-L09-D16　P2 / 素材缺失　批次 R8-B61
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`357d8525a7ee2601`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:657`
- 理想图依据：无基准，依据=组件规范（上传占位卡应有相机/加号图符；同页其余 5 张权益卡均带 64rpx 图标底座）
- 现象：「上传学生证」空态卡实测白底 x=13-365 / y=590-690（353×101px），里面只有两行居中文字「点击上传学生证照片」+「支持 JPG / PNG，大小 ≤ 5MB」，无任何上传图符；样式表里 .upload-card__icon（:1026，font-size 80rpx）已定义却在模板中零引用——图标槽位漏挂，导致这块 101px 高的主操作区看起来像一段说明文字而非可点区域。
- 建议改法：在 :657 的 .upload-card__empty 首行补挂相机/加号 SVG（走 IMAGE_PATHS.ICONS_COMMON 既有资产），复用已存在的 .upload-card__icon 类。
- 修复类别：需新建目标功能

### R8-L09-D17　P1 / 层级遮挡　批次 R8-B61
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`357d8525a7ee2601`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:712`
- 理想图依据：无基准，依据=组件规范（头部避让带：滚动后内容不得进入系统状态栏带）
- 现象：.nav-bar 为 `position: relative`，bottom 帧滚动后白底头部（顶帧实测 y=46-87）已移出，「互动资格」一行直接顶进系统区：实测该卡白底自 y=20 起、行内文字墨迹上探到 y=5-29，而系统时间「1:05」墨迹占 x=0-32 / y=17-28，胶囊白底占 x=265-369 / y=25-94——卡片顶部文字被视口上沿切掉半字，同时卡身横穿胶囊带。
- 建议改法：与 settings 同修：.nav-bar 改 sticky + 不透明底，或把正文放进 scroll-view 让头部常驻。
- 修复类别：单页

## subpackages/profile-extra/verification/real-name（4 条）

### R8-L09-D18　P2 / 尺寸比例　批次 R8-B62
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`61c66004c9952620`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:599`
- 理想图依据：无基准，依据=组件规范（同仓 R6-L10-D14 判据：内容块下方不得留 >40% 视口的纯页面底）
- 现象：已认证态整页只有两块：状态卡 y=100-281、脱敏信息卡 y=306-391，实测内容止于 y=391，其下 y=391-814 共 423px（占 814px 视口 52%）是纯页面底，无任何下一步出口（无「去校园认证」按钮、无返回提示）；根因是容器只写 `min-height: 100%`（:599，父高不可解析）+ flex column 无占位项，内容既不撑开也不居中。
- 建议改法：给 .page 一个可解析高度（100vh 兜底或 calc），并在信息卡下补一枚「去校园认证」跳转按钮吃掉下半屏。
- 修复类别：单页

### R8-L09-D19　P2 / 颜色token　批次 R8-B62
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`61c66004c9952620`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:600`
- 理想图依据：无基准，依据=规范文档§1.1 原则1「主题底色统一浅绿 #EEF7F2」
- 现象：页面底写成 `linear-gradient(180deg, var(--c-bg-page), var(--c-tint-blue-50))`，实测左缘 y=120 → #EAF4F1（绿）、y=500 → #E7F4F9、y=700 → #E4F3FC（b 比 r 高 24，已是明显蓝）——本帧 52% 的裸露底色恰好全落在最蓝的一段，与同分包 visitors 帧实测的 #EEF7F2 浅绿形成跨页断层。
- 建议改法：去掉 --c-tint-blue-50 渐变终点，单色 var(--c-bg-page)。
- 修复类别：CSS/token

### R8-L09-D20　P2 / 字号　批次 R8-B62
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`61c66004c9952620`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:913`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（正文/列表主文字 --fs-xl/2xl = 15/16px；--fs-md 13px 档用途=「标签·时间戳」）
- 现象：脱敏信息卡的值「林微风」「110101********1234」与左侧标签同用 `--fs-md`（26rpx=13px）：实测身份证号 18 个字符宽 116px（x234-349）⇒ 6.4px/字，与 13px 字号吻合；标签「真实姓名」墨迹 x=31-71 亦为 13px 档。本页唯一的业务数据与它的标签同字号，只靠 font-weight 500 区分，层级读不出来。
- 建议改法：.verified-card__value 提到 var(--fs-xl)（30rpx=15px）并用 --c-text-primary 加粗一档，标签留 --fs-md。
- 修复类别：CSS/token

### R8-L09-D21　P3 / 颜色token　批次 R8-B62
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`61c66004c9952620`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:431`
- 理想图依据：无基准，依据=规范文档§1.2（成功态图标应取 --c-success #10B981/--c-brand #36C99A；表内无 slate 蓝灰）
- 现象：已认证状态卡内 59×59px 白圆（实测 x=160-218 / y=124-182）中的对勾图标实测描边 #91A1B6，来自 :431 绑定的 statusInfo.icon = `static/assets/icons/common/check-circle.svg`，该素材第 1 行硬编码 `stroke="#94A3B8"`——成功态图标是蓝灰，而紧挨其下的状态标题「已实名认证」实测 #36C99A 成功绿，同一张卡内图标与文字两套色相，且 #94A3B8 不属于任何令牌。
- 建议改法：该 SVG 描边改走令牌（成功态绿），或按状态分支换用已着色的图标资产。
- 修复类别：CSS/token

## subpackages/setup/campus/index（2 条）

### R8-L12-D04　P2 / 颜色token　批次 R8-B63
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`a35f86dc0d8fb0a5`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:409`
- 理想图依据：无基准，依据=规范文档§1.2（brand-50/100 作「浅底·标签底·氛围」档，价值提示卡应走品牌浅底）+ 组件规范 SectionCard.vue:38
- 现象：价值提示卡（墨迹 x18-360、y565-649）实测底色为纯白 (255,255,255)，而页面在 .value-card 上声明的 `background: var(--c-bg-brand)` 真值是 #E8FBF2＝(232,251,242)（design-variables.scss:131），:410 声明的 --c-brand-200 #A3EBCF 描边也未出现；父级 scoped 类挂在子组件根节点上，与 SectionCard.vue:38 `.card{background:var(--c-bg-container)}` 同特异性、组件样式后落 ⇒ 覆盖失效，这张「降低填写顾虑」的卡与上方表单卡零色差，规范要的浅绿氛围档在画面上不存在。
- 建议改法：给 SectionCard 增加 tone/tint 入参（在其自身 scoped 内落 --c-bg-brand/--c-brand-200），或本页改 `:deep(.card)` 提权，别在宿主作用域里给子组件根节点刷底色。
- 修复类别：CSS/token

### R8-L12-D05　P2 / 可达性　批次 R8-B63
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`64e43d13abce991f`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:425`
- 理想图依据：无基准，依据=仓内自陈热区口径 AppShell.vue:348 `min-height: 88rpx`（44px）+ 规范文档§1.4 间距档
- 现象：本帧与 top 帧逐像素相同（仅步骤 2 圆点脉冲环差异 y206-241），画面里非学生唯一出口「非学生？跳过此步，稍后认证›」墨迹只有 y673-685（13px 高、x104-273 宽），其可点盒由 :425 的 `padding: var(--sp-4) 0 var(--sp-2)`（8px 上 / 4px 下）加 18px 行盒构成，实测约 30px＝60rpx，为仓内 88rpx 口径的 68%，且与下方禁用态 CTA（灰 #DCE5E2，y702-745）只隔 17px，误触即跳过整步认证。
- 建议改法：给 .skip-bar 补 `min-height: 88rpx` 并居中（padding 由上下不对称改为等分），与 CTA 之间留 --section-gap(24rpx) 以上间距。
- 修复类别：单页

## subpackages/setup/interest/index（3 条）

### R8-L12-D10　P2 / 颜色token　批次 R8-B18
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`351f779931c6180f`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:355`
- 理想图依据：无基准，依据=规范文档§1.2（输入底/浅底块档为 --c-bg-surface #F3FAF6，卡片档为 --c-bg-container #FFFFFF；--c-bg-page 只留给页面底）+ §1.1 第 1 条
- 现象：未选中 chip 的底色实测 (238,247,242)，与页面底实测 (238,247,242) 逐通道差 0——:355 用 --c-bg-page 作 chip 底，而宿主 interest/index.vue:131 的页面底同为 --c-bg-page #EEF7F2 ⇒ 10 枚兴趣 chip 与背景零色差，只靠 1rpx --c-border-default 描边（实测描边像素 (221,227,224)）区分，未选中/已选中（--c-bg-brand #E8FBF2）两态之间也只剩 5 个通道的明度差。
- 建议改法：chip 底改 var(--c-bg-container)（白底浮在浅绿页上）或 var(--c-bg-surface)，描边保留 --c-border-default。
- 修复类别：CSS/token

### R8-L12-D11　P2 / 圆角　批次 R8-B64
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`351f779931c6180f`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:206`
- 理想图依据：无基准，依据=规范文档§3.1「主按钮 52px 圆角 999」+ §1.4 圆角档（--r-xl 24rpx 为通用档，不承担主按钮语义）
- 现象：本页「完成选择」CTA 实测 x16-361、y351-394（44px 高），在距左缘 4px 的 x=20 处绿色只剩 23px 高 ⇒ 圆角半径≈22px（全圆，:206 的 --r-full）；而同一条注册向导里 schedule 帧 CTA（y364-406，x=20 处 38px 高）与 recommend-pref 帧 CTA（y686-729，x=20 处 38px 高）半径均≈12px（BottomActionBar.vue:98 的 --r-xl 24rpx）⇒ 四步走完，主按钮圆角在两档之间来回跳。
- 建议改法：向导主 CTA 统一一档：按§3.1 给 BottomActionBar 增 `pill` 变体（--r-full）并让三页宿主启用，或本页回退 --r-xl 与另两步对齐。
- 修复类别：CSS/token

### R8-L12-D12　P1 / 可达性　批次 R8-B18
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`f5e29f1d3e346f9d`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:353`
- 理想图依据：无基准，依据=仓内自陈热区口径 AppShell.vue:348 `min-height: 88rpx`（44px，campus/recommend-pref 两轮修法均以此为判据）+ 规范文档§1.4 间距档
- 现象：本帧与 top 帧仅状态栏时钟不同（y17-25），画面里 10 枚兴趣 chip 实测高 27-28px（第一行描边带 y282-309、第二行 y308-335）＝54-56rpx，仅为仓内 88rpx 口径的 62%，纵向 padding 只有 :353 的 var(--sp-1)=4rpx（2px）；两行 chip 的垂直间距由 :345 的 gap var(--sp-2)=8rpx（4px）承担 ⇒ 可点区仅隔 4px，而本页是「至少 3 个」的必选步骤、chip 是唯一可点控件。
- 建议改法：.tag-chip 补 `min-height: 88rpx` 并 `align-items:center`（padding 纵向改 --sp-3 以上），.tag-selector__chips 的 gap 提到 var(--sp-3)（12rpx）以拉开相邻热区。
- 修复类别：CSS/token

## subpackages/setup/profile/index（3 条）

### R8-L12-D01　P1 / 素材缺失　批次 R8-B83
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`1db038d55fcfa7e2`）
- 源码证据：`apps/client/src/utils/image-local.ts:128`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条（功能图标不得充当内容素材）+ §1.6 第 3 条（裸 :src 必须可解析）+ 本文件 :462-466 自陈口径「命中图标前缀的条目一律视为空槽」
- 现象：照片墙 6 槽中第 2、3 槽渲染的不是人像，而是一枚品牌绿定位针——墨迹 x156-222、x258-324、y541-630（各 67×90px），取色 (54,201,154)=#36C99A，且槽位无任何底色/虚线描边（槽内 (230,600)、(145,555) 实测均为纯白 255,255,255），第 1 槽则是正常人像；上一轮 R6-B67/D10 加的过滤（profile/index.vue:473 只匹配 `/assets/icons/`）未命中本页真实取数路径 `/uploads/mock/photo-2.jpg`（MockRuntimeState.java:78-80），而 image-local.ts:128 的本地化表只登记了 photo-1.jpg，photo-2/photo-3 无对应包内人像素材 ⇒ 画面逐像素未变，属上一轮修得不对。
- 建议改法：在 image-local.ts:128 同表补 photo-2.jpg/photo-3.jpg → IMAGE_PATHS.PEOPLE.CARD_2/CARD_3（config/images.ts:322-323 已登记），并把 profile/index.vue:469-473 的守卫由「前缀黑名单」改为「只放行 images/portraits|people 前缀，其余按空槽落 + 分支」。
- 修复类别：单页

### R8-L12-D02　P2 / 位置　批次 R8-B65
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`1db038d55fcfa7e2`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1628`
- 理想图依据：无基准，依据=组件规范 .photo-grid 等宽三列网格（本文件 :1613-1625 声明每槽 `calc((100% - 32rpx)/3)` × 200rpx，六槽应同格同轴）
- 现象：已占用槽的图片没有填满槽位、也没有共同的左轴：空槽实测 x39-139 / y644-742（101×99px，与 CSS 200rpx=100.8px 相符），而槽 1 人像墨迹只有 x67-134 / y545-629（68×85px，左缩 28px、右缩 5px＝明显右偏），槽 2/3 针图墨迹 67×90px 居中（左缩 16px、右缩 17px）⇒ 第一行三格的左缘彼此相差 12px，且整体与第二行「+」空槽的 x39/x140/x240 轴不齐，六宫格读起来是错位两列。
- 建议改法：给 .photo-grid__img 补 `display:block` 并核对 mode（:800 声明 aspectFill 却按素材原比例内缩），必要时把已占用槽与空槽统一为同一 101×99 视觉盒（空槽底色/描边同步给已占用槽）。
- 修复类别：单页

### R8-L12-D03　P2 / 空态文案　批次 R8-B65
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`19b413083800c1f3`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:960`
- 理想图依据：无基准，依据=规范文档§3.14 逐页说明的字段口径 + 同流程 campus 页占位串写法（placeholderCity「请选择城市」/placeholderSchool「请选择学校」/placeholderMajor「请选择专业」各自带字段名）
- 现象：本帧可见的两行选择器（y161-209、y221-270，行高 48px）空态文案逐字相同，都只显示「请选择」三个字加一枚约 40rpx 图标，行内没有任何字段名；模板里共用这把 pleaseSelect 的行共 4 条（年级 :884、身高 :937、学历 :960、婚恋状况 :979），另有两条文本行占位串逐字相同「如：广州」（hometownCity / futureCity，y282-330 与 y342-390）⇒ 同屏出现「请选择 / 请选择」「如：广州 / 如：广州」两组无法区分的字段。
- 建议改法：把 pleaseSelect 拆成带字段名的四把 key（请选择年级/请选择身高/请选择学历/请选择婚恋状况），futureCity 占位改「如：广州（未来）」之类可与 hometownCity 区分的写法。
- 修复类别：单页

## subpackages/setup/recommend-pref/index（2 条）

### R8-L12-D08　P2 / 位置　批次 R8-B66
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`1053e290b730aa06`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:351`
- 理想图依据：无基准，依据=规范文档§1.4 卡片内边距 32rpx 档 + 组件规范 SectionCard.vue:32-43（卡内内容应占满内容宽，不留整行空白）
- 现象：「校园优先」卡（x18-360、y490-672）里唯一的控件是枚右对齐开关，墨迹 x303-345、y625-648（43×24px＝88×48rpx，与 :358-359 声明相符），开关左缘到卡片内容左缘（x≈40）空出 263px 整行空白，且开关与上方说明文字末行（y≈579 结束）纵向相距 46px——R6-B68/D11 删掉行内可见标签后，:351 的 `justify-content: flex-end` 让开关成为一只没有就近标签、孤悬在卡底的控件。
- 建议改法：.toggle-row 改 `justify-content: space-between` 并在左侧保留可见标签（无障碍名继续由 :247 的 aria-label 承担），或把开关上移到说明行右侧同一基线。
- 修复类别：单页

### R8-L12-D09　P3 / 颜色token　批次 R8-B66
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`066dd119b603a568`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:367`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（--c-brand #36C99A 的用途列写明「主按钮·选中态·链接·进度」；brand-600/700 的用途列写明「按压态·深色文字」）
- 现象：本帧与 top 帧仅步骤 3 圆点脉冲环不同（y184-222），画面里开关处于 ON 态，轨道取色实测 (31,141,106)＝#1F8D6A＝--c-brand-700（:367），选中项「12:00」「同校优先」的 2rpx 描边实测 (34,144,108) 同色（:329）；规范把「选中态」这一档归给主色 #36C99A(54,201,154)，brand-700 只用于按压态与深色文字 ⇒ 两处选中态色阶越档，并与同页主 CTA 实测渐变 (54,201,154)→(81,212,165) 明显不同调（同屏两套绿）。
- 建议改法：:367 与 :329 的选中态由 --c-brand-700 改为 --c-brand，文字档保留 brand-700（:332 不动）。
- 修复类别：CSS/token

## subpackages/setup/schedule/index（2 条）

### R8-L12-D06　P1 / 位置　批次 R8-B67
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`f9e51173303d76b0`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:141`
- 理想图依据：无基准，依据=组件规范 BottomActionBar.vue:11-19（该组件自述：不传 fixed 时「主 CTA 悬在内容流末尾」，并点名 schedule 帧）+ 规范文档§1.4 页边距档
- 现象：主 CTA「保存并进入应用」实测落在 y364-406、x32-345，被包在偏好设置卡内部（卡体 x18-360、y168-421，按钮下方还剩 15px 白卡内边距），按钮底距视口底 408px（y406-814 全是 #EEF7F2 空底）；:141 把 BottomActionBar 当卡片子节点使用，且未传 fixed（BottomActionBar.vue:82 的吸底分支需要宿主显式开启）⇒ 主操作既没有吸底、也没有落在拇指可及区，而是悬在视口 45% 高度处并被卡片内边距二次缩进。
- 建议改法：把 BottomActionBar 移出 SectionCard（作为 :99 那张卡的后继兄弟节点）并传 `fixed`，同时给滚动内容补底部留白。
- 修复类别：单页

### R8-L12-D07　P2 / 尺寸比例　批次 R8-B67
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`935bb4495f66f1e0`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:99`
- 理想图依据：无基准，依据=规范文档§1.4（--section-gap 24rpx / --card-padding 32rpx 的分区密度档）+ 同向导另三帧的卡区占比实测对照
- 现象：本帧与 top 帧逐像素相同（仅状态栏时钟 y17-25 不同）⇒ 页面不滚动；全页只有 :99 这一张卡，实测高 254px（y168-421）＝视口 814px 的 31%，其下 393px（48% 视口）是纯 #EEF7F2 空底，卡内只有 2 个输入（field1 y211-251、field2 y261-305，各 41px）+ 1 个虚线添加盒（y313-355）+ 1 个 CTA；同流程 campus 帧卡区铺到 y745、recommend-pref 帧铺到 y729，本页的纵向填充比它们低一档。
- 建议改法：按本页实际职责补分区（课表块入口或已选时段列表卡）或在 CTA 之下加引导/说明卡，使内容列高度占比与另三步同档；短期至少把 CTA 吸底以消除 48% 空底。
- 修复类别：单页

## subpackages/support/feedback/index（3 条）

### R8-L13-D01　P2 / 层级遮挡　批次 R8-B68
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`2297271ef2a21c9d`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:895`
- 理想图依据：无基准，依据=组件规范 SectionCard.vue:37（卡片四角 `--card-radius` 40rpx 圆角）——同一张卡在 bottom 帧（y=394..412）四角是圆的，top 帧却被切平
- 现象：吸底「提交」条不透明页底带（实测上沿 y=721，色 #ECF7F2）把「新建提交」卡片下缘整条切平——白像素在 x=18..360 每一列都恰好止于 y=720，20px 圆角弧与卡片下内边距全被吃掉；原因是 `.action-bar-spacer` 只有 120rpx(60px)，而 `.bar--fixed` 实高 94px（8+44+42 安全区），R7-L13-D04 把占位放进了卡片内部，修得不对。
- 建议改法：把 `.action-bar-spacer` 移到 SectionCard 之外（或增高到 188rpx/94px 与吸底条同高），让卡片下缘落在 y<720 处自然收尾。
- 修复类别：单页

### R8-L13-D02　P3 / 颜色token　批次 R8-B68
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`2297271ef2a21c9d`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:549`
- 理想图依据：无基准，依据=规范 §1.2 色板（弱图形色只有 --c-text-tertiary #6B7571 / --c-text-placeholder #9AA39F 两档绿灰，无蓝灰档）
- 现象：上传占位格内的相机图标（实测墨迹 x=65..89、y=625..645，25×21px）最深色 #C2CED6，B−R = +20，是蓝灰偏色；同页文字最深 #777C7A（B−R=+3，绿灰）。R7-L13-D03 只在 EmptyState.vue:163 给预设图标加了 `filter: grayscale(1) brightness(.7)`，本页这枚同族蓝灰位图没被覆盖。
- 建议改法：给 `.image-cell__plus-icon` 补同款 `filter: grayscale(1) brightness(0.72)`，或改吃已染色的 SVG。
- 修复类别：CSS/token

### R8-L13-D03　P2 / 间距　批次 R8-B68
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`8d595447eff92528`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:569`
- 理想图依据：无基准，依据=规范 §1.4 卡片内边距 `--card-padding` 32rpx=16px（卡片尾部只该留 16px）
- 现象：「新建提交」卡片尾部实测有 91px 纯白死区（上传格下缘 y=322 → 卡片下缘 y=412，x=78/x=300 两列同证），其中 60px 是 `.action-bar-spacer` 撑出来的——吸底条已 fixed 于视口，卡片又不是末元素（其下还有「反馈历史」卡），这 60px 占位根本不需要，白把卡片拉长 22% 视口高。
- 建议改法：删掉卡片内的 `<view class="action-bar-spacer">`，底部留白统一交给页级 `.fixed-bar-clear`（:622）承担。
- 修复类别：单页

## subpackages/tools/activities/detail（4 条）

### R8-L08-D06　P2 / 位置　批次 R8-B69
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`47b7b5737cad59f2`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:667`
- 理想图依据：无基准，依据=规范文档§1.1 第 1 条「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」——白底动作栏与浅绿底之间出现一条 34px 横带即属该条禁止的断层；组件规范对照 apps/client/src/App.vue:344-350（page 级只保留底部安全区内边距，注释自述「避免与各页内部避让相加成双倍避让」）
- 现象：底部动作栏没贴住屏底，下面露出一条 34px 浅绿带。帧上实测白色栏面 y=689..780（栏内「立即报名」绿钮 x=100..368、y=697..739=43px≈85rpx，与 :702 的 88rpx 相符；白面在钮下方还剩 41px=82rpx，正是 :667 的 `calc(env(safe-area-inset-bottom) + var(--sp-4))` 兑现值），而白面止于 y=780、其下到帧底 814 之间是 #EEF7F2 纯底色带（y=781..813=33px≈65rpx），home indicator 墨带 y=799..805 就落在这条浅绿带里。安全区被计了两遍：App.vue:350 的 `page { padding-bottom: env(safe-area-inset-bottom) }` 已把页面盒抬到 780，:667 又在栏内补一份同额内边距 ⇒ 白面永远差一个安全区高度贴不到底，栏看起来像浮在屏中。
- 建议改法：去掉 :667 下内边距里的 `env(safe-area-inset-bottom)`（保留 var(--sp-4)），避让统一交给 App.vue:350 单层承担；或反过来把该栏改 `position: fixed; bottom: 0` 并撤 page 级 padding-bottom。
- 修复类别：单页

### R8-L08-D07　P2 / 可达性　批次 R8-B69
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`47b7b5737cad59f2`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:457`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（--c-brand-500 #36C99A / --c-brand-400 用于浅底与装饰，承载白字的应是 brand-600 #2AAE83 一侧）+ §1.1 第 2 条；同仓已批口径见 apps/client/src/subpackages/tools/daily-question/index.vue:482-484（R6-L08-D16 因白字压 brand-500 只有 2.10:1 而把 CTA 底色降到 brand-600）
- 现象：页头标题白字压不住绿底。帧上实测导航带 y=0..91（含状态栏避让），面色 #44CFA0..#4ACEA4（x=60..320、y=40..85 众数），白字「活动详情」墨迹 x=148..236、y=56..79（22px/字=44rpx，R7-B20 的字号抬升确实落地）⇒ 白字对 #45CFA0 只有 1.97:1。字号升到 --fs-5xl 后该字已进 WCAG 大字号档（≥18.66px bold 可用 3:1），但 1.97:1 连 3:1 都够不到，差 1.5 倍；同帧左上返回键的 36rpx chevron 走同一条渐变底，同样在 2:1 附近。
- 建议改法：把 :457 的渐变终点从 --c-brand-400 收到 --c-brand-600/#2AAE83 一侧（或整条换 brand-600→brand-700），使白字 ≥3:1（大字号档）；与 daily-question/index.vue:484 的 brand-600 口径对齐。
- 修复类别：CSS/token

### R8-L08-D08　P2 / 颜色token　批次 R8-B69
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`47b7b5737cad59f2`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:592`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值、禁止私有色值」（§1.2 色板内无蓝灰档）+ 第 2 条「绿色=行动」；组件规范对照 apps/client/src/components/common/EmptyState.vue:153-163（同类「素材自带私值、页面令牌不生效」的既有判定与中和口径）
- 现象：「时间/地点」两行的图标不是声明的绿色。:592 给 .detail-meta__icon 写了 `color: var(--c-brand-500)`，但 :368/:373 挂的是 `<image>`，mp-weixin 的 image 不继承 CSS color，帧上实测两枚图标（x=19..31、y=335..369，各约 13×15px=26rpx，与 :590 的 30rpx 盒相符）墨色为 #BAC4D2 / #7C828C（B 比 R 高 16..24 的蓝灰），与 §1.2 全色板无一对应，视觉上与同卡「报名中」绿标（实测底 #E8FAF2、字绿）不同调。同一支 #94A3B8 素材家族（见 D03）在页面令牌处失效、只留下素材本色。
- 建议改法：换掉素材本色（该两枚 svg 的 stroke 改 #36C99A），或按 EmptyState.vue:163 口径给 .detail-meta__icon 加 `filter` 归一到 brand 绿；删掉 :592 这条对 image 不起作用的 `color` 声明以免误导。
- 修复类别：CSS/token

### R8-L08-D09　P2 / 尺寸比例　批次 R8-B69
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`47b7b5737cad59f2`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:624`
- 理想图依据：无基准，依据=规范文档§1.4（区块间距 --section-gap 24rpx，尾部空区应等于一个区块间距档）+ §1.1 第 1 条（不得出现结构性空白带）；组件规范对照 apps/client/src/components/layout/AppShell.vue 的 flex 内容链（滚动区不应把未填充空间留在正文与动作栏之间）
- 现象：正文止于卡片、下面 216px 全是页面底色。帧上实测「活动介绍」白卡止于 y=473，底部动作栏白面起于 y=689 ⇒ 中间 y=474..688 共 215px（427rpx，占视口高 26%）为纯 #EEF7F2、0 墨行。:624 的 `.detail-footer-space { height: calc(140rpx + env(safe-area-inset-bottom)) }` 只解释其中 70px（env 在本运行档为 0），余下 145px 是 .detail-scroll（:491-493 `flex: 1; height: 0`）没被内容填满的余量。又因整页内容短于视口，本页根本不可滚：top 与 bottom 两帧 sha16 逐字节相同（47b7b5737cad59f2，全帧 0 像素差），用户没有任何办法把这段空白滚掉。
- 建议改法：把 :624 降到 `var(--section-gap)`（24rpx）并给 .detail-page 补 `justify-content: flex-start` + 让 .detail-scroll 只按内容定高（或把卡下余量交给一个可滚的 .detail-body），消掉 427rpx 死带。
- 修复类别：单页

## subpackages/tools/daily-question/index（4 条）

### R8-L07-D05　P2 / 颜色token　批次 R8-B70
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`1d1ea4d62240bc63`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:454`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（三级文本 --c-text-tertiary #6B7571 / 禁用 --c-status-disabled #DCE5E2 / 边框三档，色板内无蓝灰档）+ §1.1 第 3 条「一令牌一值、禁止私有色值」；组件规范 apps/client/src/components/common/EmptyState.vue:152-164（R7-L13-D03 已对该素材做过同一条判定）
- 现象：锁定卡中央的锁图标实测最暗色 #BBC5D2（锁形区 34×36px 内最暗 3 像素均为 #BBC5D1/#BBC5D2），仍是蓝灰偏色——素材 apps/api/uploads/app-assets/assets/icons/common/lock.svg 第 1 行写死 `stroke="#94A3B8"`，再被 .lock-card__icon 的 `opacity: 0.6`（:459）在白卡上冲淡成 #BBC5D2，§1.2 全量色板无此档。上一轮 R7-B21 只把该素材换成 LOCK_SVG 并给了 80rpx 盒尺寸（这两条在帧上确实生效：锁形可见、不再空白），而同一轮为「#94A3B8 私值」补的中和 filter 只落在 EmptyState.vue:162 的 `.empty-icon--preset` 上；本页锁定卡走的是页内裸 `<image class="lock-card__icon">`（:166），不经过 EmptyState，所以色值一分没变。
- 建议改法：把 EmptyState.vue:163 那条 `filter: grayscale(1) brightness(0.7)` 同口径复制到 .lock-card__icon（或抽成共享类/把 lock.svg 的 stroke 改成 #6B7571），别只修组件出口。
- 修复类别：CSS/token

### R8-L07-D06　P2 / 尺寸比例　批次 R8-B70
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`1d1ea4d62240bc63`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:444`
- 理想图依据：无基准，依据=规范文档§1.4（卡片内边距 --card-padding 32rpx、区块间距 --section-gap 24rpx，卡片高度由内容决定）+ §1.1 第 1 条（不得出现白/灰断层，白卡占比过高等于把断层搬进卡内）
- 现象：`.lock-card { min-height: 70vh }` 把白卡撑到实测 y=99..667（高 568px=1127rpx，占帧高 69.8%），而卡内全部有墨内容（锁 303..322 + 标题 360..373 + 说明 390..402 + CTA 424..462）只占 y=303..462（161px），即卡内 407px（71.7%）是纯白空区；R4 注释（:442）说这条是为了消掉「卡下方 60% 空白」，实测空白没消失，只是从卡外搬进了卡内。
- 建议改法：去掉 min-height:70vh，改由内容 + `gap: var(--sp-5)` 自然定高，把垂直居中交给 .dq-body 的 flex 约束（或 min-height 降到内容实测 161px+2×60rpx padding 档）。
- 修复类别：单页

### R8-L07-D07　P2 / 位置　批次 R8-B70
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`1d1ea4d62240bc63`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:500`
- 理想图依据：无基准，依据=规范文档§1.4 页边距 `--page-padding` 32rpx=16px（全站左右 gutter）+ §1.1 第 1 条；同卡实测左 gutter 17px 合规，可作对照
- 现象：底部「返回」钮实测白色胶囊占 x=3..376、y=678..720（宽 374px=742rpx、左右只留 3px=6rpx），而它上方同一列的锁定卡占 x=17..361（左右 17px=34rpx）——两栏左边界相差 14px（28rpx），钮直接铺满视口宽。声明里的 `min-width: 320rpx`（:502，=161px）与 `margin: var(--sp-5) auto var(--sp-8)`（:501）都没兑现：块级 flex 容器 width 为 auto 时左右 auto margin 解析为 0，min-width 只是下限，于是 161px 的意图渲染成 742px。
- 建议改法：给 .lock-back 补 `width: fit-content`（或 `align-self: center` + `max-width: 320rpx`）并加 `margin-left/right: var(--sp-8)`，使其与 .lock-card 共用 32rpx gutter。
- 修复类别：单页

### R8-L07-D08　P2 / 文案　批次 R8-B70
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`6f584b1ba8ce91de`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:199`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单（BottomActionBar 承担唯一底部动作，不与页头返回重复）+ §1.1 第 5 条「视觉元素对照设计稿 100% 还原、不自创元素」
- 现象：同一屏出现两个都叫「返回」的控件：页头 `.dq-header__back` 的「返回」字形实测 x=17..38、y=40..89（:140 取 i18n dailyQuestion.back），底部胶囊的「返回」字形实测 x=177..203、y=693..705（:199 取同一个键）——R6-L08-D17 为消「卡下 274rpx 纯底色死区」新增的出口，只是把页头已有控件复制了一遍，文案与 goBack() 行为都相同，帧上看不出两者分工。
- 建议改法：底部那颗换成有分工的文案（如「回消息页」/「今日签到」，走既有键）或直接撤掉、把卡下空区收进 .dq-body 的居中约束，避免同屏双「返回」。
- 修复类别：单页

## subpackages/tools/heart-signals/index（3 条）

### R8-L08-D03　P2 / 颜色token　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`0465cbb90769e23e`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:95`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（中性档只有绿调 #1A1E1C / #4A524E / #6B7571 / #DCE5E2，色板内不存在任何蓝灰档）+ §1.1 第 3 条「一令牌一值、禁止私有色值」；组件规范 apps/client/src/components/common/LockScreen.vue（× 钮、权益勾选、锁徽三枚图标全部走 ICONS_COMMON 素材）
- 现象：锁定层上三枚图标全是同一支表外蓝灰 #94A3B8，且因写在 SVG 里而无法被页面令牌覆盖。帧上实测：× 字形最暗 #99A8BC（圆内 x=25..45、y=62..85 区）、三枚权益勾选圈最暗 #A0AEBF（每枚 x=49..64、宽 16px=32rpx，落在 :625 声明的 36rpx 盒内）、中央锁形最暗 #96A1B9。三笔色都来自 apps/client/src/static/assets/icons/common/close.svg 第 2 行、check-circle.svg 第 2 行、lock.svg 第 2 行逐字相同的 `stroke="#94A3B8"`（R8-L07-D05 已对 lock.svg 那条落点做过同判，但只覆盖 daily-question 页内裸 image，本页走的是 LockScreen 组件出口，素材一分未变）。后果是勾选圈 #A0AEBF 压本地底 #E0EAE6 只有 1.98:1、× 压半透明白圆 #E4F6F0 只有 2.19:1，两枚都低于非文本 3:1。
- 建议改法：把 close.svg / check-circle.svg 的 stroke 从 #94A3B8 改成 §1.2 的 --c-text-tertiary #6B7571（或组件内加 .lock-screen__close-icon / .benefit__icon 的 `filter: grayscale(1) brightness(0.7)`，与 EmptyState.vue:163 同口径），一次覆盖三枚出口。
- 修复类别：CSS/token

### R8-L08-D04　P2 / 层级遮挡　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`0465cbb90769e23e`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:531`
- 理想图依据：无基准，依据=规范文档§1.1 第 1 条（不得出现叠印/断层）+ 组件规范 LockScreen.vue 自述「解锁徽章圆环（品牌渐变，承载锁图标与完成对勾）」（:467 注释），即徽章应完整可读
- 现象：右侧头像把「完成对勾」徽章啃掉一角。徽章 .illustration__badge 声明 76rpx + 6rpx 绿描边 = 88rpx（44px）见 :499-503，帧上实测绿色环带只到 x=215..263、y=288..325（49×38px），比应有的 44px 少 6px 竖口；同帧右头像 .illustration__avatar--right（112rpx + 8rpx 白描边 = 128rpx=65px，:519-522）实测白环 x=225..279、y=310..374（高 65px 与声明相符）。两块的交叠区 x=225..263 × y=310..325 = 38×15px，头像的实心白环正好盖住徽章下沿，4× 放大可见对勾字形的左下弧被齐口切断、绿环带在底部断开成不闭合弧。根因是两者同为 position:absolute 且都没写 z-index，而头像节点（:220）排在徽章节点（:202）之后 ⇒ 后画者压上。
- 建议改法：给 .illustration__badge 补 `z-index: 2`（或把 .illustration__avatar--right 的 right 从 40rpx 收到 8rpx、把徽章 bottom 从 -12rpx 抬到 -28rpx），使两盒在 440×400rpx 插画区内不再交叠。
- 修复类别：单页

### R8-L08-D05　P2 / 可达性　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`e9a929387e0e8fa1`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:705`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（--fs-base 12px 属「小字：标签·时间戳」，不享 WCAG 大字号豁免 ⇒ 4.5:1 门槛）+ §1.2 配色方案（三级文本 --c-text-tertiary #6B7571 / 次文本 #4A524E）；同组件内已批口径见 LockScreen.vue:679-687
- 现象：底部提示「资料越完善，匹配越精准，曝光机会越多」读不出来。帧上实测该行墨迹 x=85..293（208px）/18 字 = 11.6px/字 ≈ 24rpx（对应 :704 的 --fs-base），字形最暗 #76807B 压页面底 #EEF7F2 只有 3.74:1，连令牌名义值 #6B7571 也只有 4.36:1，两档都够不到 4.5:1。同组件 18 行之上的 .lock-screen__btn-link-text 已因 R6-L08-D13 升到 --c-text-secondary #4A524E（:686 注释自证「实测 #808D88 → 2.87:1 ⇒ 改 7.37:1」），本帧那句次入口「先逛逛公开内容」实测最暗 #52625C、5.75:1 确实达标了——但同一次修复没带上 .lock-screen__footer-text，:705 仍写 `color: var(--c-text-tertiary)`。
- 建议改法：把 :705 换成 `color: var(--c-text-secondary)`（与 :686 同档，≥7:1），或按 §1.3 把该行升到 --fs-md 并保留 tertiary 色，二者取一即可过 4.5:1。
- 修复类别：CSS/token

## subpackages/tools/help/index（2 条）

### R8-L07-D12　P2 / 颜色token　批次 R8-B71
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`52bf13e70d09620b`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:125`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（粉色浅底只有浪漫粉底 romance-50 = #FFECEF；绿色浅底 brand-50 = #E8FAF3；色板内不存在任何蓝色浅底档，互动蓝只有 --c-status-info #4D8DFF）+ §1.1 第 2 条「绿色=行动、粉色=喜欢，两色禁止混用」、第 3 条「禁止私有色值」
- 现象：三条联系行的图标底在帧上实测三颗互不相干的浅底：在线客服 #FFF0F5、意见反馈 #E8F4FD、客服邮箱 #E8FAF3（各 289~315px 众数）。三颗里只有绿色那颗等于 §1.2 的 brand-50 #E8FAF3；粉色那颗与 §1.2 唯一认可的粉浅底 romance-50 #FFECEF 不同值（G/B 各差 4/6），蓝色 #E8F4FD 在 §1.2 整张色板里找不到对应档——一张卡内并列出现「粉/蓝/绿」三种氛围底，违反 §1.1 第 2 条的双色分工。另外 :143 行内兜底写的 `#E8F4FF` 与令牌实值 #E8F4FD 自相矛盾（B 差 2），兜底本身就是页内私值字面量。
- 建议改法：三颗图标底统一收进 §1.2 已有的两档浅底（--c-bg-brand #E8FAF3 / --c-romance-50 #FFECEF），删除 :125/:143/:161 的行内字面量与 --c-tint-*-soft 短名，蓝色档若确需保留则先在 §1.2 登记再落地。
- 修复类别：CSS/token

### R8-L07-D13　P2 / 位置　批次 R8-B71
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`52bf13e70d09620b`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:298`
- 理想图依据：无基准，依据=规范文档§1.4 间距表（--sp 阶梯最小 4rpx，底部需给安全区留白）+ §1.3 极小档「法务」文本的可读位置要求；组件规范对照 apps/client/src/components/common/LockScreen.vue:695（同类底部提示用 `calc(env(safe-area-inset-bottom) + var(--sp-6))`）
- 现象：底部法务提示「若问题仍未解决，欢迎通过在线客服或意见反馈联系我们，我们会尽快回复」实测墨迹占 y=777..787、x=30..348，正好压在 iOS 底部安全带（y≥780，即最后 34px）里，其下沿距 home indicator 墨带（实测 y=800..804）只有 13px=26rpx；`.help-footer` 的 `padding: 32rpx 24rpx 16rpx`（:298）只给 16rpx=8px 下内边距且完全没带 env(safe-area-inset-bottom)。且本帧与 top 帧 sha16 逐字节相同（52bf13e70d09620b，全帧 0 像素差），页面根本不可滚，没有任何办法把这行字顶出安全区。
- 建议改法：把 :298 的下内边距改成 `calc(env(safe-area-inset-bottom) + var(--sp-6))`（与 LockScreen.vue:695 同口径），并复查 .shell__body 是否已含安全区，避免双重留白。
- 修复类别：单页

## subpackages/tools/love-center/consulting（6 条）

### R8-L09-D01　P1 / 位置　批次 R8-B72
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`bad8727650e933ec`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:194`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」+ AppShell 同页左轨
- 现象：实测 AppShell 大标题「恋爱咨询课程」墨迹左缘 x=17，而其下封存卡与课程卡列左缘 x=32、右缘 x=346——页面在 AppShell 自带 32rpx gutter（AppShell.vue:297）之外又加了一次 `margin: var(--sp-5) var(--page-padding)`，内容列整体右移 15px（≈30rpx），左轨与标题不齐、整页左右留白 32/31px 是规范页边距的两倍。
- 建议改法：把 .content-section / .consult-sealed 的左右 margin 归零（水平 gutter 交给 AppShell 的 32rpx），使卡列左缘回到 x≈17 与标题同轨。
- 修复类别：CSS/token

### R8-L09-D02　P2 / 颜色token　批次 R8-B72
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`bad8727650e933ec`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:315`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（--c-error #E5454D 用途=「错误·删除」；§1.1 原则3「一令牌一值，禁止私有色值」）
- 现象：三门课的价格「¥99 / ¥129 / ¥159」实测墨迹 #E5454D（card1 取色 x265-287,y469-477），即直接命中 --c-error 错误红；价格不是错误态，全站错误红被当作商品价色使用，与§1.2 的角色定义冲突（同页错误提示会失去辨识度）。
- 建议改法：价格改用商品/金额语义令牌（--c-romance-500 #FF6B81 或 --c-brand-600 #2AAE83），把 --c-error 还给错误与删除态。
- 修复类别：CSS/token

### R8-L09-D03　P2 / 间距　批次 R8-B72
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`bad8727650e933ec`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:270`
- 理想图依据：无基准，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx=16px」
- 现象：课程卡白底左缘 x=32，卡内首行标题「恋爱沟通课」墨迹左缘 x=42 ⇒ 实测左右内边距仅 10px（=--sp-5 20rpx），只有规范 --card-padding（16px/32rpx）的 62.5%；同卡「报名」胶囊右缘 x=336 距卡缘 346 也只有 10px，卡内文字贴边。
- 建议改法：把 .course-card 的水平内边距由 var(--sp-5) 换成 var(--card-padding)（32rpx）。
- 修复类别：CSS/token

### R8-L09-D04　P3 / 颜色token　批次 R8-B72
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`bad8727650e933ec`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:243`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（无 slate 蓝灰这一项）+ §1.1 原则3「禁止私有色值」
- 现象：封存卡的锁图标实测色 #A2AFC2（取色区 x150-230,y150-210 众数），它来自素材 `static/assets/icons/common/lock.svg:1` 硬编码 `stroke="#94A3B8"` 再被 .consult-sealed__icon 的 `opacity: 0.85` 压过（0.85×148+0.15×255≈162=#A2 通道），#94A3B8 这一 slate 蓝灰不在§1.2 任何令牌里，且 0.85 透明度把它进一步推到白底 2.3:1 对比。
- 建议改法：图标素材描边改走令牌（--c-text-tertiary #6B7571 或 --c-status-disabled），并去掉 :243 的 opacity 补偿。
- 修复类别：CSS/token

### R8-L09-D05　P1 / 可达性　批次 R8-B72
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`be5c6092a9c3312b`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:322`
- 理想图依据：无基准，依据=组件规范（同文件 .consult-sealed__action 已按 min-height:88rpx 落地，AppShell.vue:347 亦记明「≥88rpx（44px）」全站触摸目标口径）
- 现象：三门课的「报名」胶囊实测 41×29px（精确取色 bbox：x296-336 / y439-467 与 x296-336 / y519-548），高度 29px≈58rpx，低于全站 88rpx（44px）最小触摸目标 15px；样式只写了 `padding: 12rpx var(--sp-5)`，没有任何 min-height，而同页封存卡的「帮助与客服」在 :222 有 `min-height: 88rpx`，同页两枚按钮热差不一致。
- 建议改法：给 .course-card__signup 补 `min-height: 88rpx; box-sizing: border-box;`，与 :222 同口径。
- 修复类别：CSS/token

### R8-L09-D06　P2 / 颜色token　批次 R8-B72
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`be5c6092a9c3312b`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:332`
- 理想图依据：无基准，依据=规范文档§1.2（--c-text-placeholder #9AA39F 用途=placeholder，可点控件文字应为 --c-text-secondary #4A524E 以上）
- 现象：封存态「报名」二字实测墨迹 #9AA39F（x305-326,y450-460 众数），底为 --c-bg-surface #F3FAF6（x296-336 实测），WCAG 对比度 2.4:1，远低于 4.5:1；且 #9AA39F 正是§1.2 的 placeholder 专用值——一个仍然可点（@tap 给 sealedToast）的控件被画成了占位符灰，视觉上与真正禁用无差别。
- 建议改法：封存态标签色提到 --c-text-secondary（#4A524E，同底 7.0:1），或给胶囊补一层 --c-border-default 描边以保住控件轮廓。
- 修复类别：CSS/token

## subpackages/tools/love-center/index（3 条）

### R8-L07-D09　P1 / 可达性　批次 R8-B73
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`9d9dc4966e8d7e35`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:242`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（卡片 --c-bg-container #FFFFFF、主文本 #1A1E1C、次文本 #4A524E）+ §1.3 字体层级（说明档 14/15px）；置灰语义在 §1.2 有专档 `--c-status-disabled` #DCE5E2，而不是整卡半透明
- 现象：`opacity: 0.5` 落在整张封存卡（恋爱课程 / 社交课程）上，帧上实测该卡底色由 #FFFFFF 退成 #F7FBF9（与左列开放卡的 #FFFFFF 同帧并排可见），卡内文字被同一次透明压掉两档：标题最暗 #767C79 对 #F7FBF9 只有 4.08:1（28rpx=14px 不享大字号豁免），说明最暗 #919A96 → 2.77:1，「功能封存中」角标最暗 #AFB7B3 → 1.99:1 且字号只有 --fs-xs 20rpx（实测角标字形宽 9.2px/字≈18rpx），三档文字在 378px 帧上均读不出。
- 建议改法：把 :242 的整卡 opacity 换成按 §1.2 的分级降饱和：底色保持 --c-bg-container、标题/说明改用 --c-text-tertiary + --c-status-disabled，角标单独给一档浅底，别整卡乘 0.5。
- 修复类别：单页

### R8-L07-D10　P2 / 字号　批次 R8-B73
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`9d9dc4966e8d7e35`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:264`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（正文/列表主文字 = --fs-xl/2xl 15/16px；--fs-base 12px 属「小字：标签·时间戳」；--fs-xs 10px 属「极小：角标·法务」）+ 令牌实值 theme/design-variables.scss:560-567
- 现象：四张宫格卡的主标题（恋爱咨询/恋爱课程/社交咨询/社交课程）走 `font-size: var(--fs-base)`，帧上实测「恋爱咨询」四字墨宽 47px ⇒ 11.75px/字 ≈ 23.3rpx（=--fs-base 24rpx，design-variables.scss:562），落在 §1.3 的「小字：标签·时间戳」档；同页顶部入口行标题「附近的人」实测 47px/4 字 = 同样 11.75px/字（:300 同为 --fs-base），而它们自己的区块标题「快捷入口/恋爱咨询/恋爱测试」实测 17.2px/字 ≈ 34rpx（--fs-3xl 36rpx，合规）——卡标题只有自己区块标题的 2/3 高，§1.3 给列表主文字的 30/32rpx 档在本页没有任何一处标题使用。
- 建议改法：把 .love-center__board-title 升到 var(--fs-xl)（30rpx=15px），说明行 .love-center__board-desc 由 --fs-xs（20rpx，实测 9.7px/字≈19.2rpx，属 §1.3「极小：角标·法务」档）升到 --fs-md（26rpx），与规范 §1.3 的正文/说明两档对齐。
- 修复类别：单页

### R8-L07-D11　P2 / 尺寸比例　批次 R8-B73
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`4ffefb9ecf267839`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:196`
- 理想图依据：无基准，依据=规范文档§1.4 区块间距 --section-gap 24rpx（尾部空区应等于一个区块间距档）+ §1.1 第 1 条（浅绿底连续可，但不得出现「滚到底还有半屏无内容」的结构性空区）
- 现象：滚到底后 MBTI 卡白底实测止于 y=425（y=426 起转 #EEF7F2），其下到 home indicator（y=799）之间是 373px=740rpx 的纯页面底色空区，占视口高 46%；对照 top 帧同一张卡止于 y=570，说明整页只滚了 144px 就到底，却仍露出 373px 无内容尾部。根因是 `.love-center { min-height: 100vh }` 给容器定了 814px 高，而内容实际只有 ~570px，多出的 244px 加上 shell 内边距变成可滚的死区。
- 建议改法：去掉 :196 的 min-height:100vh（改由 AppShell 内容区定高），或给 .love-center 补 `display:flex; flex-direction:column` 让最后一个 section 自然贴底。
- 修复类别：单页

## subpackages/tools/love-center/mbti（3 条）

### R8-L08-D14　P2 / 文案　批次 R8-B74
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`46662f4d68b91a5c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:46`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（文案与视觉元素须与设计稿一致、不自创）+ §1.3 字体层级对「标签」文本的准确要求；本页自身映射规则见 mbti.vue:91 注释「选项下标 0 → 维度前一位字母」，可作内部一致性判据
- 现象：四枚维度胶囊里只有第二枚的中文顺序与字母相反。帧上实测该带墨迹 x=23..326、y=154..165，四枚依次为「E/I 外向/内向」「S/N 直觉/实感」「T/F 思考/情感」「J/P 判断/知觉」：第 1/3/4 枚都是「前字母对应词 / 后字母对应词」，而 S=Sensing=实感、N=iNtuition=直觉，第二枚却把「直觉」写在 S 之后，等于把 S/N 读成 N/S。而 :91 的计分规则是按「维度前一位字母」映射选项 A，用户照胶囊顺序点「直觉」会被记成 S ⇒ 文案顺序与算法互相指错。文案源 apps/client/src/i18n/locales/zh-CN.ts:845 `"dimensionSN": "直觉/实感"`，en 侧 :761 `"Intuition/Sensing"` 同样反序，两语言一起错。
- 建议改法：把 zh-CN.ts:845 改为「实感/直觉」、en-US.ts:761 改为 "Sensing/Intuition"（或把 :46 的 code 改成 "N/S" 并同步 questions 的 dimension 映射），二者只改一处会留矛盾，需同批改。
- 修复类别：单页

### R8-L08-D15　P2 / 字号　批次 R8-B74
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`46662f4d68b91a5c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:299`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（「页面主标题 — 26–28px 700–800 页头标题」，最低也应是标题档 --fs-3xl 36rpx；--fs-xl 属「正文/辅助」档）+ 兄弟页同组件同口径对照 apps/client/src/subpackages/tools/activities/detail.vue:476-484
- 现象：上一轮 R7-B20 把 activities/detail 的页头标题从 30rpx 抬到 44rpx，但同壳同渐变的兄弟页 mbti 没跟上。:299 仍是 `font-size: var(--fs-xl, 34rpx)`，而 --fs-xl 真值 = 30rpx（apps/client/src/theme/design-variables.scss:565），行内兜底写的 34rpx 是第二笔兜底债。帧上实测「MBTI 人格测试」墨迹 x=48..145（98px）、字高带 y=64..75（12px）⇒ 中文约 15px/字 = 30rpx；同帧导航带与 activities 用逐字相同的 `linear-gradient(135deg, --c-brand-500, --c-brand-400)`（:295 vs detail.vue:457），而 activities 的「活动详情」实测 22px/字 = 44rpx——两条一模一样的绿导航条，标题差 14rpx（约 32%），§1.3 给页头标题的 26-28px 档两页都没到。
- 建议改法：把 :299 升到 var(--fs-5xl)（44rpx）与 detail.vue:481 同档并删掉 34rpx 兜底；若产品定的是「页头 26-28px」，则两页一起升到该档，别再单点抬一页。
- 修复类别：单页

### R8-L08-D16　P3 / 圆角　批次 R8-B74
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`b8733f4cf79c72c6`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:420`
- 理想图依据：无基准，依据=规范文档§1.4 圆角表（第 87 行「卡片圆角 --card-radius = 40rpx = 20px」，第 86 行为 --r-sm→--r-full 阶梯）+ 令牌实值 apps/client/src/theme/design-variables.scss:699 `--card-radius: 40rpx`；同产品白卡对照 apps/client/src/subpackages/tools/activities/detail.vue:531
- 现象：四张题卡是白底带投影的卡片，圆角却走了 --r-xl 而不是卡片档。:420 写 `border-radius: var(--r-xl, 24rpx)`（=12px），而 §1.4 第 87 行把白卡圆角定在 --card-radius 40rpx（=20px），detail.vue:531 的 .detail-section 正是走 40rpx。用同一把探针（min(RGB)>245、从卡片顶边逐行取首个白像素求内缩）量两页：mbti 题卡（顶 y=122、左 x=17）内缩序列 k=0/2/4/6/8 → 7/4/2/1/0，即曲率到 k=8 归零；activities 卡（顶 y=281、左 x=9）内缩 k=0/2/4/6/8/10/12/14 → 13/9/6/4/3/2/1/0，到 k=14 才归零。同一检测器下两块白卡的圆角可见差 6px（约 12rpx），mbti 侧明显更方。
- 建议改法：把 :420 换成 `border-radius: var(--card-radius)`（40rpx），与同页 .type-cell（:391 的 --r-lg）一起按 §1.4 分档归位；若产品确认小卡走 --r-xl，则在 §1.4 登记该分档再落地。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（4 条）

### R8-L08-D10　P1 / 素材缺失　批次 R8-B05
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`237f8c79b75058b7`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:2258`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条（图标须为标准 SVG 且可用）与第 5 条（视觉元素 100% 还原、不得缺件）+ §1.2 配色方案（互动蓝 --c-status-info #4D8DFF 只有一档，图标与底必须分档）；组件规范 apps/client/src/components/discover/CardSwiper.vue:2283-2286 声明的 44rpx 图标位
- 现象：三枚操作按钮的图标位全部空转，只剩文字。帧上实测三枚圆钮等大（灰 x=91..148、蓝 x=160..218、粉 x=230..288，均 58~59px=116rpx，与 :2234 相符），但各自上半部的 44rpx 图标带（y=612..634）内**没有一个像素**偏离本钮底色 60 以上（最大偏差仅 31~40，纯抗锯齿）：星形素材 apps/client/src/static/assets/icons/v2/star-blue.png 的唯一不透明色实测 (76,141,255)=#4C8DFF，而 .card-action--super-like 的底色正是 :2258 的 `var(--c-status-info)` #4D8DFF ⇒ 1.01:1，同色盖同色；× 素材 x-gray.png 墨色 (140,147,147) 压 skip 底 #727C84 = 1.36:1；heart-pink.png 墨色 (255,106,170) 压 romance 渐变底 #FE7288 = 1.01:1。三枚主操作钮因此在帧上没有任何图形标识。
- 建议改法：为三枚按钮各出一版与底色分档的素材（星/叉/心改白 #FFFFFF 或改深一档 brand/romance-700），或把 :2258/:2269 的底色换到素材色的浅档，使图标对底 ≥3:1。
- 修复类别：CSS/token

### R8-L08-D11　P2 / 颜色token　批次 R8-B05
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`237f8c79b75058b7`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:2269`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值：页面只引用 var(--c-*)，禁止私有色值」+ §1.2 配色方案（中性档全为绿调 #1A1E1C/#4A524E/#6B7571/#DCE5E2，色板内不存在 slate/蓝灰档）
- 现象：「跳过」钮底色是表外蓝灰。:2269 写死 `background: rgba(15, 23, 42, 0.55)`（Tailwind slate-900 家族的字面量），压在浅绿页底 #EEF7F2 上实测混出 #727C84（R114/G124/B132，B 比 R 高 18 ⇒ 冷蓝灰），§1.2 整张色板找不到对应档；同一条 slate 字面量还在 :2242 的 `box-shadow: 0 8rpx 24rpx rgba(15,23,42,0.25)` 上重复一次。与同帧右侧「喜欢」钮的 #FE7288（romance 渐变档）并排看，等于把规范禁止的第三种色温搬进了同一行三按钮里。
- 建议改法：把 :2269/:2242 的 rgba(15,23,42,α) 换成 §1.2 已有的中性令牌（如 `var(--c-text-primary)` 的 alpha 派生，或 --c-status-disabled 档 + 描边），全站三枚 swipe 钮同批改。
- 修复类别：CSS/token

### R8-L08-D12　P2 / 位置　批次 R8-B75
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`54bcfb8e6e3c8d1d`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:289`
- 理想图依据：无基准，依据=规范文档§1.4 间距表（底部须给安全区留白，sp 阶梯最小 4rpx）+ §1.1 第 1 条；同仓已批口径见 apps/client/src/components/common/LockScreen.vue:695（同类底部动作/提示用 `calc(env(safe-area-inset-bottom) + var(--sp-6))`）
- 现象：唯一的底部出口钮压在 home indicator 上。帧上实测「查看全部推荐」描边胶囊占 x=141..237、y=758..799（97×42px=192×83rpx，与 :343 的 min-height 88rpx 相符），而系统 home indicator 墨带实测 y=800..804（x=133..245）⇒ 两者只差 1px，胶囊下沿 19px（38rpx）整段落在底部 34px 安全带内，且胶囊与指示条在 x=141..237 完全同列重叠。根因是 R7-B25 用 `.nearby-tail { margin-top: auto }`（:313-314）把尾部锚到视口底之后，容器下内边距只给了 :289 的 `padding: var(--sp-2) 0 var(--sp-6)`（12px），没带 env(safe-area-inset-bottom) 项。本帧与 top 帧仅 673 px 差（全在 y=16..25 时钟与 y=116..119 在线点闪烁区），页面不可滚，用户无法把它顶出安全区。
- 建议改法：把 :289 的下内边距改成 `calc(env(safe-area-inset-bottom) + var(--sp-6))`（与 LockScreen.vue:695 同口径），或给 .nearby-tail 补 `padding-bottom` 同额值。
- 修复类别：单页

### R8-L08-D13　P2 / 可达性　批次 R8-B05
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`54bcfb8e6e3c8d1d`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:2289`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（--fs-xs 20rpx=10px 属「极小：角标·法务」档，不得用作主操作标签；该档不享 WCAG 大字号豁免 ⇒ 4.5:1）+ §1.2 配色方案
- 现象：三枚主操作钮唯一的可读文字既过小又压不住底。:2289 给 .card-action__label 写 `font-size: 20rpx`（=10.1px），帧上实测标签墨带 y=634..643（高 10px ✓）、「超级喜欢」四字墨宽 37px（9.3px/字）——10px 字号在 378px 帧上已接近不可读。更硬的是对比度：:2291 的字色 `rgba(255,255,255,0.95)` 实测压蓝底 #4C8CFE 只有 3.18:1、压粉底 #FE7288 只有 2.58:1、压灰底 #727C84 只有 4.18:1，三枚全部低于 4.5:1；叠加 D10 的图标 0 可见像素，这三颗钮在帧上没有任何一档达标标识。
- 建议改法：把 :2289 升到 --fs-sm/--fs-md 档（22~26rpx）并把 :2291 换成 --c-text-inverse 纯色 + 给三枚底色各降一档（如 brand-600/romance-600 一侧）使白字 ≥4.5:1。
- 修复类别：CSS/token

## subpackages/tools/search/index（2 条）

### R8-L08-D01　P1 / 尺寸比例　批次 R8-B76
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`564ed0032903aea2`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:491`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（视觉元素须 100% 还原、不得出现截断）+ §1.4 页边距/触控行高口径；文案真相源 apps/client/src/i18n/locales/zh-CN.ts:2878 `"placeholder": "搜索感兴趣的人、标签和学校"`（14 字）与同页 :2887 emptyHint 的完整 19 字句式可互为对照
- 现象：输入框仍装不下 placeholder，句子被啃掉最后两字。实测 .search-box 白底胶囊占 x=53..244（宽 192px=381rpx、高 36px=71rpx），扣掉行内 `padding: 0 24rpx`（12px×2）后内容区 x=65..232；前置放大镜图标 32rpx=16px（x=65..81）+ `gap: 12rpx`=6px ⇒ 文本可用宽只有 145px。帧上灰字墨迹实测 x=87..231（144px）/11 字 ⇒ 13.1px/字，14 字整句需要 ~183px，差 38px，于是只显示「搜索感兴趣的人、标签和」——以连词「和」收尾、第三个检索对象「学校」两字整体丢失（同帧下方空态文案 x=61..316/19 字=13.5px/字可反证字形度量一致）。上一轮 R7-B26 把两份 103px 避让合并成一份是对的（框宽 77px→192px 画面确实变了），但没核对合并后仍不够 14 字，属修得不对。另：行右内边距按 `calc(var(--capsule-right,7px)+96px)`=103px 预留，而本帧系统胶囊墨迹实起于 x=298，「取消」钮止于 x=276 ⇒ 行尾还有 22px=44rpx 纯白空档没还给输入框。
- 建议改法：把 :491 的 96px 常量改成实测胶囊几何（右缘 378-298=80px，或直接吃 --capsule-right 真值），并给 .search-input 补 `text-overflow: ellipsis` + 把 placeholder 缩到 11 字以内（如「搜索人/标签/学校」新键），别让句子以「和」收尾。
- 修复类别：单页

### R8-L08-D02　P2 / 可达性　批次 R8-B76
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`564ed0032903aea2`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:466`
- 理想图依据：无基准，依据=同文件同页已生效的自证标准 apps/client/src/subpackages/tools/search/index.vue:699（R6-L09-D18 给 .search-tab 补的 `min-height: 88rpx`，其 :696-698 注释写明「与返回键同口径补 min-height」，即返回键本该在同一档）+ 规范§1.1 第 1 条（控件可辨识）
- 现象：返回键比同页 Tab 小一档、字形又几乎看不见。实测 .search-back 的浅绿圆底占 x=13..50、y=55..86（高 32px=64rpx，与 :466-467 声明的 64rpx 一致），而同帧下方「用户」选中胶囊实测 y=103..144（高 42px=83rpx，:699 的 88rpx 已兑现）——同一页里两个并排的顶级导航控件差 10px（20rpx），返回键低于本页自陈的 88rpx 下限 24rpx。且圆内 chevron 字形实测最暗 #9BA9BC（素材 back.svg 的 #94A3B8 蓝灰描边），压在 #EEF7F2 圆底上只有 2.19:1、压白底 2.39:1，不到非文本控件 3:1 线，帧上 4×9px 的淡弧看起来像噪点而非返回键。
- 建议改法：给 .search-back 补 `min-width/min-height: 88rpx`（与 :699 同口径），并把 back.svg 的 stroke 换成 --c-text-secondary（或给 .search-back__icon 加同页色板内的 filter），使字形对圆底 ≥3:1。
- 修复类别：单页

## subpackages/tools/security/index（2 条）

### R8-L07-D14　P2 / 文案　批次 R8-B77
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`72ad0a3b854dbe74`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:981`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（--fs-md/base 13/12px 档用于「标签·时间戳」，角标类文本必须单行不折行）+ §1.4 圆角表（--r-full 胶囊标签）；对照同仓 love-center/index.vue:247 的「功能封存中」角标（单行未折）
- 现象：「当前设备」角标在帧上断成两行：角标墨迹实测 x=296..327（宽 32px≈63rpx）× y=625..649（高 25px≈50rpx），按 --fs-sm（22rpx=11.1px）算单行应为 4×11.1=44px，实测只有 32px 宽 + 25px 高 ⇒ 渲染成「当前设」/「备」，把一个四字词从中间劈开。触发条件是同行标题「手机号登录 · iPhone 12/13 (Pro)」本身已折两行（实测墨带 y=622..634 与 y=639..653），而 `.sec-item__badge`（:981-987）没有 white-space:nowrap / flex-shrink:0，被 .sec-item__info 的 `min-width: 0` 让位压扁。
- 建议改法：给 .sec-item__badge 补 `white-space: nowrap; flex-shrink: 0;`，并把角标从 .sec-item__label-row 内移出行标题列（或换到时间戳行），保证 4 字单行。
- 修复类别：单页

### R8-L07-D15　P1 / 层级遮挡　批次 R8-B09
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`83882386815e0c42`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:64`
- 理想图依据：无基准，依据=规范文档§1.1 第 1 条（页面不得出现白/灰断层与叠印）+ 组件规范 AppShell.vue:317-329 自述判据「滚动时正文不得与系统状态栏文字叠印」，该判据只在 `.is-fixed` 分支生效
- 现象：滚到底帧的最上一行设备记录被视口上沿齐根切断：该行墨带实测 y=0..35、x=0..370（标题只剩下半截字形），其右侧「下线」胶囊的粉底墨迹实测 y=24..39、x=311..328，正好落在系统状态栏文字带内（同帧电池/信号图标墨迹 y=14..30），钮被系统图标压住且上沿出框 24px，视觉上不可辨认为可点控件。根因是本页 `<AppShell … show-back>`（security/index.vue:540）没传 `fixed`，而 `fixed: false` 是 AppShell 默认值 ⇒ :324 的 `position: sticky` 吸顶分支不生效，滚动时列表行直接钻进状态栏底下（love-center/index.vue:115、help/index.vue:88 同壳同漏传）。
- 建议改法：给 security/love-center/help 三处 AppShell 传 `fixed`（或把 .is-fixed 的吸顶+底色改成默认行为），使吸顶头挡住状态栏带，滚动内容不再与系统图标叠印。
- 修复类别：单页

## subpackages/village/village/detail（2 条）

### R8-L03-D06　P1 / 素材缺失　批次 R8-B78
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`f357a7ea1abad8f9`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1341`
- 理想图依据：帖子.png——作者行（头像+昵称+学校 chip+关注）、标题正文、大图+三宫格、位置距离行、点赞/评论/转发、全部评论楼层、底部「说点什么...」输入栏
- 现象：内容区 y130..783（占屏 80%）只渲染未找到分支的 3 个元素（放大镜图标 y390..440、文案 y445..465、绿胶囊按钮 x147..231/y484..526），理想图 7 个模块 0 命中，底部输入栏（v-if="currentPost"）同步消失。
- 建议改法：让该路由以可用帖子 id 进入（或 mock 种子兜底一条真实详情），使 v-else 分支不再截获首屏。
- 修复类别：单页

### R8-L03-D07　P2 / 需新建　批次 R8-B78
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`5deae0f689fdac5d`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1346`
- 理想图依据：帖子.png 无「帖子不存在」态；规范文档 §3.13 也只定义了正常态的模块清单，未给未找到态版式
- 现象：未找到态直接复用通用 no-data 预设（放大镜 + 单行灰字 + 绿胶囊「返回广场」），全站 19 张理想图与 §3.13 均无该态设计稿，画面与详情页版式零继承（导航栏以下全空）。
- 建议改法：为详情页新建 not-found 版式（保留导航+作者占位骨架 + 说明副标题 + 返回/去广场双动作），并补进规范 §3.13。
- 修复类别：需新建目标功能

## subpackages/village/village/history（5 条）

### R8-L03-D14　P1 / 圆角　批次 R8-B79
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__history__top.png`（sha16=`b9fd323867fff82c`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:403`
- 理想图依据：无基准，依据=规范文档 §1.4 卡片圆角 --card-radius 40rpx=20px、§1.2 卡片容器令牌；组件规范 Card.vue 同族
- 现象：.history-item 只有 padding/margin-bottom/background，无 border-radius 也无左右外缩，实测白色卡区横跨 x1..376（满屏 378px）四角直角，与同仓所有列表卡（20px 圆角 + 32rpx 侧缩）不同形。
- 建议改法：给 .history-item 补 border-radius: var(--card-radius) 与左右 32rpx 外缩（或改 margin 为 16rpx 32rpx）。
- 修复类别：CSS/token

### R8-L03-D15　P2 / 文案　批次 R8-B79
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__history__top.png`（sha16=`b9fd323867fff82c`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:161`
- 理想图依据：无基准，依据=规范文档 §1.3 页面主标题层级；同包 detail/tag-posts/circles 页头均有标题文字（实测 detail 标题墨迹 x61..124）
- 现象：模板页头只有 .history-back 一个节点，实测导航带 y36..105 整条为页面底色 #EEF7F2、除返回键外 0 个文字墨迹 ⇒ 本页无任何标题（同族页应显示「浏览记录」）。
- 建议改法：页头补标题节点（与返回键同一行，fs-2xl/600，走 --c-text-primary）。
- 修复类别：单页

### R8-L03-D16　P2 / 颜色token　批次 R8-B79
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__history__top.png`（sha16=`b9fd323867fff82c`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:356`
- 理想图依据：无基准，依据=规范文档 §1.1 第 2 条「粉色=喜欢」+ §1.2 错误色 --c-error #E5454D 用于删除类动作
- 现象：破坏性动作「清空记录」的胶囊底/字用 romance 粉（实测粉色墨迹 x304..351 / y128..141），把「喜欢」语义色用在删除入口上，与 §1.1 色义分工冲突，也与同页绿色主色并置成粉绿撞色。
- 建议改法：改 --c-error 浅底 + --c-error 字（或降为中性 tertiary 描边胶囊）。
- 修复类别：CSS/token

### R8-L03-D17　P2 / 位置　批次 R8-B79
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`b9fd323867fff82c`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:322`
- 理想图依据：无基准，依据=规范文档 §1.4 页边距 --page-padding 32rpx；同仓页头控件基线（detail 返回箭头实测 x35..40）
- 现象：.history-back 声明 64rpx 圆钮但未给任何左内缩，实测白色圆底左缘 x=1（≈2rpx），按钮被屏幕左缘裁齐，而同页工具栏行内缩 32rpx、detail 页同位图标在 x35。
- 建议改法：给 .history-back 补 margin-left: var(--page-padding)（或放进带 32rpx padding 的页头行）。
- 修复类别：CSS/token

### R8-L03-D18　P2 / 间距　批次 R8-B79
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`b9fd323867fff82c`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:340`
- 理想图依据：无基准，依据=规范文档 §1.4 区块间距 --section-gap 24rpx=12px
- 现象：.history-toolbar 自带白底但无下外缩，实测「共 4 条记录/清空记录」行与第一条记录卡连成一整块白（y110..267 连续白色，157px=311rpx），而卡与卡之间有 8px（16rpx）浅绿缝 ⇒ 工具栏被读成列表首行。
- 建议改法：工具栏与列表之间加 var(--section-gap) 间隔或把工具栏并入页头吸顶层。
- 修复类别：CSS/token

## subpackages/village/village/index（4 条）

### R8-L02-D18　P1 / 可达性　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__index__top.png`（sha16=`2d32d5577de56b3d`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:96`
- 理想图依据：无基准，依据=规范文档§3.15（🔒解锁提示为页面主视觉锚点）+ 组件规范 apps/client/src/components/common/LockScreen.vue:488-494（该处自述「白色圆底 + 绿色对勾」的品牌绿语义）
- 现象：锁图标取通用素材 `ICONS_COMMON.LOCK_SVG`，其描线写死 `stroke="#94A3B8"`（apps/client/src/static/assets/icons/common/lock.svg:2），压在 280rpx 品牌绿渐变环（:476）中心：#94A3B8 与环色 #4FD3A5 的对比度实测 1.37:1，远低于非文本 3:1 门槛——帧上锁轮廓（x≈158-222 / y≈195-250）在绿环上几乎糊成一片，本页唯一的核心语义符号读不出来。
- 建议改法：为锁语义单出一枚白色/深绿描线素材（或给图标套 `filter: brightness(0) invert(1)` 的白底圆衬），不要复用通用灰描线 SVG。
- 修复类别：CSS/token

### R8-L02-D19　P2 / 层级遮挡　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__index__top.png`（sha16=`2d32d5577de56b3d`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:497`
- 理想图依据：无基准，依据=组件规范 LockScreen.vue:488-533（徽章挂环右下、头像挂环左右两侧，三者应各自独立可读）
- 现象：徽章用 `right:-12rpx; bottom:-12rpx` 挂在 280rpx 环的右下角，右侧同校头像用 `bottom:0; right:40rpx` 挂在 440×400rpx 插画盒右下——按两套坐标算，徽章落在盒内 x 296-372 / y 246-322，头像落在 x 288-400 / y 288-400，两者重叠约 76×34rpx；帧上可见白色对勾圆徽章直接压在右侧头像照片上缘（x≈228-266 / y≈288-322），头像顶部（人像头部）被整块切掉。
- 建议改法：头像下移到插画盒底缘之外（或把徽章改挂环的左下/正下），使二者包围盒不再相交。
- 修复类别：CSS/token

### R8-L02-D20　P2 / 颜色token　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`2ae850eca6914438`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:257`
- 理想图依据：无基准，依据=组件规范 LockScreen.vue:488-494 自述口径「完成对勾徽章：白色圆底 + 绿色对勾」+ 全站勾选语义统一走 --c-brand（同组件 :503 边框已按此改绿）
- 现象：权益清单三行（解锁精准匹配推荐 / 查看同校校友主页 / 发起私信与匿名聊天，帧 y≈465-530）与环上徽章共用 `CHECK_CIRCLE_SVG`，该素材描线写死 `#94A3B8`（static/assets/icons/common/check-circle.svg:2）：帧上三枚对勾是石板灰，与右侧灰字同行同色，勾选语义（全站为品牌绿）在页面上完全丢失；:503 刚把徽章边框改成 --c-brand，勾本身仍是灰的，同一枚图标两种结论。
- 建议改法：勾选场景单出 --c-brand 描线素材（或对 benefit 图标加绿色 filter），使边框与勾同色。
- 修复类别：CSS/token

### R8-L02-D21　P2 / 间距　批次 R8-B04
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`2ae850eca6914438`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:694`
- 理想图依据：无基准，依据=组件规范 LockScreen.vue:690-698（底部提示需按安全区抬升）+ 全站底部留白口径（pages/messages/index.vue:782 用 --tab-bar-total-h + 16rpx 兜底）
- 现象：底部提示「资料越完善，匹配越精准，曝光机会越多」的下边距写作 `calc(env(safe-area-inset-bottom) + var(--sp-6))`，而本项目 env() 在拍摄环境恒为 0（该事实已在 pages/messages/index.vue:64 记录并改用 --statusbar 注入）：帧上该行文字底缘 y≈772，Home Indicator 条顶缘 y≈786，净空仅约 14px≈28rpx，文字几乎坐在系统手势条上。
- 建议改法：与本页其余件同源，改读注入变量（如 `calc(var(--safe-bottom, env(safe-area-inset-bottom)) + var(--sp-8))`），保证净空 ≥ 68rpx。
- 修复类别：CSS/token

## subpackages/village/village/post（5 条）

### R8-L03-D01　P2 / 文案　批次 R8-B20
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__post__top.png`（sha16=`8d304db99af2bac5`）
- 源码证据：`apps/client/src/constants/village.ts:18`
- 理想图依据：无基准，依据=规范文档 §3.14「统一发布页」正文明确写「正文输入（0/1000）」
- 现象：正文计数器实测墨迹 x336..361 / y414..423，显示「0/500」，上限比 §3.14 规定的 0/1000 少一半（POST_MAX_LENGTH 实值 500）。
- 建议改法：把 POST_MAX_LENGTH 提到 1000（或按 §3.14 口径统一），计数器随常量自动变为 0/1000。
- 修复类别：单页

### R8-L03-D02　P2 / 素材缺失　批次 R8-B80
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__post__top.png`（sha16=`8d304db99af2bac5`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1027`
- 理想图依据：无基准，依据=规范文档 §3.14「底部工具栏（图/视频/话题/位置/提及/更多 6 图标）」
- 现象：.post-toolbar 内只有 5 个子项，实测 5 个等分格中心 x=38/113/188/263/338（单格 75.6px≈150rpx），缺 §3.14 要求的第 6 枚「视频」入口，整条工具栏比规范少一项且每格被 space-around 撑宽 20%。
- 建议改法：在「图片」与「话题」之间补一枚视频项（同 .post-tool 结构 + 视频 SVG），使 6 项等分。
- 修复类别：单页

### R8-L03-D03　P3 / 尺寸比例　批次 R8-B80
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__post__top.png`（sha16=`8d304db99af2bac5`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1445`
- 理想图依据：无基准，依据=规范文档 §3.14 正文输入区 + §1.4 间距表（无「空态正文撑满 1.6 屏」的依据）
- 现象：正文框空态实测高 182px（361rpx，占位墨迹 y225..274 → 计数器 y414），比该行声明的 min-height:220rpx（111px）多出 71px（141rpx），占位文案与计数器之间留 152px（302rpx）空白断层。
- 建议改法：给 .post-content__input 定高（220rpx）或把计数器上贴输入框底，消除空态被父级 flex 拉高的效果。
- 修复类别：CSS/token

### R8-L03-D04　P2 / 可达性　批次 R8-B80
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`44090b4d57b9363e`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1621`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:185 的动作热区基线 min-height:88rpx（=44px）
- 现象：发帖小贴士关闭按钮实测 × 墨迹仅 x343..346 / y670..673（4×4px），图标盒 28rpx=14px，且样式表无 .post-tip__close 规则补足容器热区 ⇒ 可点区不足基线 88rpx 的 1/3。
- 建议改法：给 .post-tip__close 补 min-width/min-height:88rpx + flex 居中，图标视觉尺寸不变。
- 修复类别：CSS/token

### R8-L03-D05　P2 / 文案　批次 R8-B80
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`44090b4d57b9363e`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1074`
- 理想图依据：无基准，依据=规范文档 §3.14 工具栏项与功能一一对应（「更多」应为聚合菜单）
- 现象：第 5 格标注「更多」（实测标签墨迹 x322..339 / y745..773）但该行 @tap 打开的是 visibilitySheetOpen（谁可以看弹层），图标也是眼睛 SVG，与上方已存在的「谁可以看」行重复、与「更多」字面不符。
- 建议改法：要么把该格标签与图标改为「可见」，要么改为真正的更多菜单并把可见范围收进菜单。
- 修复类别：单页

## subpackages/village/village/publish（4 条）

### R8-L02-D22　P2 / 文案　批次 R8-B81
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`282824d3b1c2805d`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:794`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文区右下角计数「0/1000」；规范§3.14 亦写明「正文输入（0/1000）」
- 现象：帧上正文计数渲染为「12/500」（x≈310-355 / y≈375-390），上限位是 500；理想图与规范§3.14 的同一位置均为 1000——上一轮把上限与 store 校验同源收成 500 后，页面文案与理想图/规范双向不一致（用户可输入的正文长度只有设计值的一半）。
- 建议改法：以规范 1000 为准，同步把 stores/village 的 MAX_CONTENT_LENGTH 抬到 1000（两端一起改，避免回到「超 500 字必败」的旧问题）。
- 修复类别：单页

### R8-L02-D23　P2 / 需新建　批次 R8-B81
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`282824d3b1c2805d`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1023`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部固定工具栏：图片/视频、话题、位置、提及、更多 五枚图标 + 文字，整条高约 110px（画布 900px 宽，≈92rpx）
- 现象：帧上「发帖小贴士」卡下方直接是页面底缘，整条底部工具栏在 DOM 里不存在（CSS 仍以存档样式留在 :1209，形成「有样式无节点」）；规范§3.14 仍把它列为本页必备组成，理想图里它是唯一的键盘上方快捷入口。
- 建议改法：按 :1209 存档样式补回五枚工具栏节点（与上方四行共用同一 handler），或与产品确认后同步删除规范§3.14 该条，避免下轮再被当缺陷重报。
- 修复类别：需新建目标功能

### R8-L02-D24　P2 / 可达性　批次 R8-B81
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`fdf0d8a94c701fc6`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:846`
- 理想图依据：素材/理想效果图/发布帖子页面.png「添加位置」行右侧为实值「北京大学 · 未名湖校区」+ › 箭头（该行是可点入口）
- 现象：帧上「添加位置」行右侧渲染灰色提示「位置选择即将开放」（x≈258-355 / y≈605-618），既无实值也无箭头，行本身（:837）没有绑定 @tap——理想图把它画成可选位置的一级入口，本页该能力实际不可达，而页面又没有任何替代路径。
- 建议改法：接入既有定位选择页（pages/search 或 utils/location 的城市选择）后回填实值 + › ；未接入前把该行降为灰禁用态（去掉 press-feedback），避免「像能点其实不能点」。
- 修复类别：需新建目标功能

### R8-L02-D25　P2 / 素材缺失　批次 R8-B81
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`fdf0d8a94c701fc6`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1146`
- 理想图依据：素材/理想效果图/发布帖子页面.png 四行选项（添加话题 / 添加位置 / 提及好友 / 谁可以看）右端 4/4 均带 › 箭头
- 现象：`.publish-row__arrow`（32rpx / --c-text-quaternary）样式已存在，但模板里四个 `publish-row`（:823/:837/:856/:864）没有任何一处渲染该节点，帧上四行右端只有灰色 meta 文本、0 枚箭头（理想图 4/4 有）；行尾因此读起来像「状态说明」而不是「可进入的选项」。
- 建议改法：在四个 publish-row 末尾补 `<text class="publish-row__arrow">›</text>`（只读行按 D24 的裁决决定是否补）。
- 修复类别：单页

## subpackages/village/village/tag-posts（6 条）

### R8-L03-D08　P1 / 颜色token　批次 R8-B82
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`6b794526ce2609db`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:512`
- 理想图依据：无基准，依据=规范文档 §1.1 第 2 条「绿色=行动，粉色=喜欢，两色禁止混用」+ 第 3 条「一令牌一值，禁止私有色值」
- 现象：页头同一条导航带实测从 #46CFA1（x=2,y=60）渐变到 #EA9DA7（x=376,y=60），把 brand 绿与 romance 粉压在同一元素上；该行还以 SCSS 变量 $green-primary 起头，未走 var(--c-*) 令牌。
- 建议改法：页头改为单色 --c-brand 或 brand-500→brand-300 同族渐变，粉端删除，$green-primary 换成 var(--c-brand-500)。
- 修复类别：CSS/token

### R8-L03-D09　P3 / 文案　批次 R8-B21
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`6b794526ce2609db`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:2066`
- 理想图依据：无基准，依据=本仓既有全站终止态键值（zh-CN.ts:1908 village.noMorePosts =「— 没有更多了 —」，用全角破折号）
- 现象：本页专用键 tagPosts.noMore 值是半角 ASCII「-- 没有更多了 --」，帧上 y570 起实测渲染为两段短横线，与同仓 noMorePosts 的全角「—」写法不一致，同一列表尾在同一产品里出现两种排版。
- 建议改法：把 tagPosts.noMore 值改为「— 没有更多了 —」或直接复用 village.noMorePosts。
- 修复类别：单页

### R8-L03-D10　P2 / 需新建　批次 R8-B82
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`6b794526ce2609db`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:324`
- 理想图依据：无基准，依据=规范文档 §3.11 聚合页范式（头部=封面/名称/人数/动态数 + 操作）与 §3.13 同族结构
- 现象：.tag-header 内只有 back/title/spacer 三个节点，实测导航带 y30..97（135rpx）之下 y98 直接进列表，标签页缺少标签名+帖子数+参与入口的头卡，整页与 circle-home 同族页相比少一整个信息层。
- 建议改法：新建标签头卡（#标签名 + N 条帖子 + 参与/关注按钮），复用 SectionHeader + Tag 组件。
- 修复类别：需新建目标功能

### R8-L03-D11　P1 / 可达性　批次 R8-B82
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`d550cdebc6582fd0`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:530`
- 理想图依据：无基准，依据=规范文档 §1.2 文本色阶（反色文字须压深色底）+ WCAG AA 4.5:1
- 现象：标题「#运动」墨迹实测 x168..209 / y65..79，其正下方渐变底色为 #6DDEB3..#7BDDB6（明度≈0.59），白字压上去对比度≈1.6:1，远低于 4.5:1，也低于 3:1 的大字下限。
- 建议改法：渐变端点整体加深（brand-600→brand-700 同族）或标题改 --c-text-primary + 白底胶囊衬。
- 修复类别：CSS/token

### R8-L03-D12　P2 / 素材缺失　批次 R8-B82
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`d550cdebc6582fd0`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:326`
- 理想图依据：无基准，依据=组件规范：同仓返回控件统一用 IMAGE_PATHS.ICONS_COMMON.BACK SVG（history.vue:168、detail.vue:796、circles/index.vue:396 同位皆图标）
- 现象：页头返回位是一枚文字「返回」（.back-icon，font-size 28rpx 白字），未用全站统一的 BACK 箭头 SVG，实测左侧 x8..40 区带是四个汉字宽度的文字块而非 24px 图标，与相邻三页的页头图标不同形。
- 建议改法：换成与 history/detail 同规格的 BACK SVG（40rpx 盒 + aspectFit），保留 aria-label。
- 修复类别：单页

### R8-L03-D13　P3 / 间距　批次 R8-B82
- 帧：`tmp/qa/frames/R8/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`d550cdebc6582fd0`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:637`
- 理想图依据：无基准，依据=规范文档 §1.4 页边距 --page-padding 32rpx、区块间距 --section-gap 24rpx
- 现象：帖子卡左右外边距 24rpx（实测白卡 x13..365，两侧各 13px≈26rpx）比 §1.4 页边距基线 32rpx 少 8rpx，上下 16rpx 也低于 --section-gap 24rpx（实测卡间隙 9px=18rpx）。
- 建议改法：margin 改 var(--section-gap) var(--page-padding)，与 circles/detail 卡片同一基线。
- 修复类别：CSS/token

