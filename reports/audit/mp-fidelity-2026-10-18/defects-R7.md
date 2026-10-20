# R7 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=74　涉及页面=32　涉及帧=58　泳道卡=11　段内继承哈希=6（同段第二条起未重复抄录，非逐条见证）
- 严重度分布：P3=31　P2=22　待补=17　P1=4
- 轴分布：待补=17　可达性=13　颜色token=8　文案=7　素材缺失=5　间距=4　位置=4　空态文案=4　圆角=3　尺寸比例=3　字号=3　层级遮挡=2　需新建=1
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=11　涉及车道：R7-L02、R7-L13
- 批次归属：57 个批次收录，**卡上有而 fixlist 没有的=17**（这是账目错，见退出码）

## pages/login/index（3 条）

### R7-L01-D01　P2 / 文案　批次 R7-B07
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__login__index__top.png`（sha16=`ac0020b1026a9c91`）
- 源码证据：`apps/client/src/pages/login/index.vue:646`
- 理想图依据：素材/理想效果图/登录页面.png 按钮区（自上而下只有「微信一键登录 / 手机号登录 / 稍后再看」三档 + 协议行，第四档位置为空）
- 现象：帧上「手机号快捷登录」白按钮（实测 y=562..605px）与「稍后再看」灰按钮（y=661..708px）之间多出一行灰色文字「验证码或密码登录」（实测墨迹 y=633..643px，字高 10px≈20rpx，色 #929C97），理想图该位置无任何元素；该行由 i18n 键 login.phoneLogin（zh-CN.ts:2190 =「验证码或密码登录」）驱动，是 DevTools 下 getPhoneNumber 死点的 QA 兜底入口，不是设计稿内容。
- 建议改法：把 .login-sms-fallback 收进 v-if="showPhoneLogin === false && isDev" 之类的开发态条件（或改成长按/隐藏入口），生产取景帧上不留这一档。
- 修复类别：单页

### R7-L01-D02　P2 / 间距　批次 R7-B07
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__login__index__top.png`（sha16=`ac0020b1026a9c91`）
- 源码证据：`apps/client/src/pages/login/index.vue:1115`
- 理想图依据：素材/理想效果图/登录页面.png 按钮区三档按钮（实测绿 935..1006px、白 1030..1100px、灰 1130..1200px，相邻间隙 24px≈28rpx 均匀）
- 现象：帧上按钮节奏被打断：绿主按钮底 551px→白按钮顶 562px 间隙 11px≈22rpx（=--sp-4 16rpx + 抗锯齿），而白按钮底 605px→灰「稍后再看」顶 661px 间隙 56px≈111rpx，是同列节奏的 5 倍；多出的 89rpx 由 .login-sms-fallback 的 margin-top:var(--sp-3,24rpx)+padding:var(--sp-2)0+min-height:64rpx 撑出，导致「稍后再看」整档下沉、按钮组与理想图节奏不一致。
- 建议改法：删掉该兜底行的 margin-top/padding 堆叠（D01 一并处理），或把 .login-quick 的 gap 统一为 var(--sp-4) 且不给兜底行额外垂直盒。
- 修复类别：单页

### R7-L01-D03　P3 / 可达性　批次 R7-B07
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__login__index__bottom.png`（sha16=`87ba4e1a2a07f696`）
- 源码证据：`apps/client/src/pages/login/index.vue:1361`
- 理想图依据：素材/理想效果图/登录页面.png 底部协议行（勾选圆实测 19px 净宽≈22rpx，位于 x=370..388 / y=1219..1237）
- 现象：底部帧协议行勾选热区实测直径 17px（x=91..107）=34rpx，与 CSS 34rpx 逐字相符，但整行唯一可点区就是这 34rpx 圆点（.terms-wrap 只给 gap 12rpx，文字区无 @tap），远低于微信《小程序体验设计规范》/WCAG 2.5.5 的 88rpx 最小热区；未勾选时所有登录入口都被 agreeFirst 拦截（index.vue:228-231），热区过小直接卡住主流程。
- 建议改法：给 .checkbox 补 padding 或用 88rpx 透明热区包裹（visual 尺寸不变），并把 @tap 提到 .terms-wrap 整行。
- 修复类别：单页

## pages/nearby/index（6 条）

### R7-L02-D01　P2 / 颜色token　批次 R7-B08
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__nearby__index__top.png`（sha16=`d7cf588acc185e5f`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1269`
- 理想图依据：素材/理想效果图/附近的首页.png 五宫格入口区（附近的人/兴趣圈/校园圈/活动/我的人脉），五枚图标是实心彩色（绿·绿·青·橙·蓝），色相与各自底板明显拉开
- 现象：帧上五宫格 5 枚图标全部呈同一支中性灰描线字形，实测源文件 stroke：static/assets/icons/common/user.svg=#94A3B8、common/school.svg=#94A3B8、common/schedule.svg=#94A3B8、common/fire.svg=#94A3B8，只有 group.svg=#36C99A；它们各自坐在 pastel 底板 #FFF0F3 / #E8F5E4 / #EEF3FF / #FFF5E6 / #F0EEFF（index.vue:1269-1273）上，#94A3B8 对 #FFF0F3 的对比度实测 2.08:1，低于图形件 3:1，五宫格在帧上读起来是一片同色灰线，理想图的四色语义分层（绿=附近、橙=活动、蓝=人脉）整块丢失
- 建议改法：按理想图给 NEARBY_ICONS 五枚分别烘语义色（PEOPLE #36C99A / CIRCLE #36C99A / CAMPUS #0EA5E9 / ACTIVITY #F97316 / DYNAMIC #4F6EF7），不要复用同一支 #94A3B8 灰
- 修复类别：CSS/token

### R7-L02-D02　P3 / 可达性　批次 R7-B08
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__nearby__index__top.png`（sha16=`d7cf588acc185e5f`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:783`
- 理想图依据：素材/理想效果图/附近的首页.png 页头右上放大镜件，理想图字形实测约 50px@852px 宽（=44rpx 字形 + 呼吸位），整块热区不小于同行「发动态」胶囊高
- 现象：页头放大镜热区 `.nearby-home__search-btn` 实测 width:80rpx / height:80rpx（index.vue:783-784，编译产物 dist/build/mp-weixin-real/pages/nearby/index.wxss 同值），比全站 88rpx 最小热区口径窄 8rpx×8rpx；同行「发动态」胶囊与五宫格底板（88rpx，index.vue:1257）都达标，只有这一枚不达标，帧上它是页头唯一的小于 88rpx 可点件
- 建议改法：`.nearby-home__search-btn` 的 width/height 由 80rpx 抬到 88rpx，44rpx 字形尺寸不动（只放大热区）
- 修复类别：单页

### R7-L02-D03　P1 / 素材缺失　批次 R7-B08
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__nearby__index__bottom.png`（sha16=`db0658fe07c645ca`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:614`
- 理想图依据：素材/理想效果图/附近的首页.png 列表卡区（理想图该型卡片左侧 72rpx 底板内一律有可见字形），帧上分区④「附近活动」三行底板内 0 个像素的图形
- 现象：帧上「附近活动」三行（周末篮球友谊赛 / 骑行踏青活动 / 城市露营计划）的 72rpx 杏色底板全部是纯色空白块，没有任何图标。取值链：index.vue:614 → config/images.ts:720 `FIRE: ICONS_BASE + '/fire.svg'` → real 档解析为 `/static/assets/icons/fire.svg`；实测产物 apps/client/dist/build/mp-weixin-real/static/assets/icons/ 目录只有 chat/gift/group/heart/location/search.svg 与 common/register/tabbar 三个子目录，**根级 fire.svg 不存在**（config/images.ts:200-206 那批 R6/F7 登记只补了 6 枚根图标，fire.svg 正是同注释点名的「其余 8 枚同型待接」之一）→ <image> 404，底板空
- 建议改法：把 `ICONS_GIFT_SVG` 那一段的 pkg/tail 双登记补上 `ICONS_FIRE_SVG: { pkg: '/static/assets/icons/fire.svg', tail: '/assets/icons/fire.svg' }`（或直接把 images.ts:720 改指已出包的 common/fire.svg），顺带修 index.vue:1078 的 `.activity-entry__icon-wrap` 缺 `display:flex`——它声明了 align-items/justify-content 却没有 flex 容器，出包后 40rpx 图标也不会居中
- 修复类别：单页

### R7-L02-D04　P3 / 圆角　批次 R7-B08
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__nearby__index__bottom.png`（sha16=`db0658fe07c645ca`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1068`
- 理想图依据：素材/理想效果图/附近的首页.png 所有白底列表卡（动态卡、圈子入口卡）四角圆角，理想图实测半径约 22px@852px 宽 = 19rpx
- 现象：帧上分区④三张活动卡是直角矩形，而同页分区①的两张「附近的人」卡是圆角卡。源码实测：`.people-entry`（index.vue:827-835）声明 `border-radius: 20rpx` + `box-shadow`，`.activity-entry`（index.vue:1068-1077）整条规则内既无 border-radius 也无 box-shadow，编译产物 dist/build/mp-weixin-real/pages/nearby/index.wxss 的 `.activity-entry.data-v-fd6965dc` 同样只有 display/align-items/gap/padding/color/background/border/margin-bottom 八项 ⇒ 同页同族卡片两种圆角口径
- 建议改法：`.activity-entry` 补 `border-radius: 20rpx`（与 .people-entry 同值，或直接引 --r-xl）与 `box-shadow: var(--c-shadow-card)`
- 修复类别：CSS/token

### R7-L02-D05　P2 / 层级遮挡　批次 R7-B08
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__nearby__index__bottom.png`（sha16=`db0658fe07c645ca`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:715`
- 理想图依据：素材/理想效果图/附近的首页.png 底部 tabBar 区（理想图 tabBar 高约 150px@852px = 132rpx 且内容不被永久压住），帧上分区⑤「附近动态」首张帖卡被固定 tabBar 压到只剩一条上缘
- 现象：底部避让读的是 `--tabbar-height`，App.vue:751 实测该令牌 = `calc(112rpx + env(safe-area-inset-bottom))`，加 index.vue:715 的 +24rpx 呼吸位 = 136rpx + 1 个安全区；而真实 tabBar 是 apps/client/src/custom-tab-bar/index.wxss:17 的 `height: calc(160rpx + env(safe-area-inset-bottom))` 配 :18 的 `padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx)` 且 :19 `box-sizing: content-box` ⇒ 实占 184rpx + 安全区。两条口径差 48rpx 再加一个安全区，帧上「附近动态」帖卡上缘以下整块落在固定条阴影里，滚到底也抬不出来。theme/design-variables.scss:483-484 已自述这一把「少让 72rpx + 一个安全区」但本批未动数值
- 建议改法：index.vue:715 的 padding-bottom 改读 `--tab-bar-total-h`（design-variables.scss:491 实测 184rpx 口径），或把 --tabbar-height 收敛到 184rpx + 单 env 并同步全部消费者
- 修复类别：CSS/token

### R7-L02-D06　P2 / 需新建　批次 R7-B08
- 帧：`tmp/qa/frames/R7/real-f0677920/pages__nearby__index__bottom.png`（sha16=`db0658fe07c645ca`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:591`
- 理想图依据：素材/理想效果图/附近的首页.png「校园圈」四联竖版卡区，理想图每卡三行：校名 / 「3.2k 位同学」/ 状态胶囊「已加入」或「去认证」
- 现象：帧上校园圈四卡的次行是城市名（南京大学→南京、浙江大学→杭州、复旦大学→上海、武汉大学→武汉），状态胶囊四张全是「公开浏览」；理想图同位是「N 位同学」+「已加入/去认证」两态。缺的是数据源不是样式：config/schools.ts 的 School 接口无成员数与认证态字段，index.vue:564-571 注释自述「全站无该数据源…同学数待后端补字段」，campusChipKey 对本校以外恒给「公开浏览」
- 建议改法：后端 /config/campuses 补 memberCount + certified 两字段，前端把 index.vue:591 的 school.city 换成 memberCount 格式化、:595 的胶囊改回已加入/去认证双态（本校）+公开浏览（其余）
- 修复类别：需新建目标功能

## subpackages/campus/campus/certification（1 条）

### R7-L05-D09　P3 / 颜色token　批次 R7-B09
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`0f7e8a0b7ad8a8c0`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:731`
- 理想图依据：无基准，依据=规范文档 §1.1 原则1（底色统一走令牌，不留私有纯白）+ R6-L06-D13 同类收口
- 现象：.upload-area 与 .upload-preview 仍写死 background:#ffffff(:731/:762「R16：纯白背景」)，而 R6-L06-D13 已把 .cert-page/.form-input 的私有纯白收进 --c-bg-page/--c-bg-surface 令牌；这两处漏收，白卡内再叠一层裸 #ffffff，深色模式下不会随令牌反色。
- 建议改法：两处 #ffffff 改 var(--c-neutral-0)（或 --c-bg-container），与本页其余底色同源。
- 修复类别：CSS/token

## subpackages/campus/campus/index（2 条）

### R7-L05-D01　P2 / 尺寸比例　批次 R7-B10
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`0a03cdb179384a4c`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:953`
- 理想图依据：无基准，依据=组件规范（.cert-recommend 推荐兴趣圈瓷片应可辨识）+ 规范文档 §3 校园页
- 现象：「热门兴趣圈」把 8 个瓷片塞进一条不换行、不滚动的 flex 行（.cert-recommend__grid 只有 display:flex;gap:16rpx，.cert-recommend__item flex:1 高 120rpx），实测每片宽 ≈(750-48-7×16)/8≈73rpx(约 38px)、高 120rpx，竖裁后封面严重挤压、缩略图不可辨识。
- 建议改法：改为横向 scroll-view 或每屏 4 片两行换行，单片宽度不低于 ~160rpx。
- 修复类别：单页

### R7-L05-D02　P3 / 可达性　批次 R7-B10
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`116757ea8db7719f`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:986`
- 理想图依据：无基准，依据=组件规范（封面叠字需与底图有足够对比度）
- 现象：兴趣圈封面标签统一用纯白 --c-neutral-0(#FFFFFF)+text-shadow，压在浅色封面（如「美食」浅色食物图、「宠物」浅金毛犬图）上时白字与亮底几乎同明度，实测帧内该两片标签读不清。
- 建议改法：给标签加半透明底部渐变蒙层（沿用 .my-story 底蒙层范式）或改深色描边，保证任意封面下对比度 ≥4.5:1。
- 修复类别：单页

## subpackages/campus/campus/post-topic（2 条）

### R7-L05-D03　P3 / 可达性　批次 R7-B11
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`40b99b35066b5b45`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:696`
- 理想图依据：无基准，依据=组件规范（禁用态按钮标签仍应可辨读）
- 现象：顶栏「发布」按钮禁用态文字取 --c-overlay-white-text-strong=rgba(255,255,255,0.8)，底为 --c-overlay-white-bg-stronger=rgba(255,255,255,0.4) 叠在绿→粉渐变头部上，实测帧顶栏右侧「发布」二字与胶囊底几乎同明度、无法辨读（禁用≠不可读）。
- 建议改法：禁用态改用带对比度的次级文字令牌（如 --c-text-tertiary 或实底灰），保证标签在任意头部底色上可辨。
- 修复类别：CSS/token

### R7-L05-D04　P3 / 可达性　批次 R7-B11
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`bef456c9ea4ba308`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:685`
- 理想图依据：无基准，依据=组件规范（禁用态按钮标签仍应可辨读）
- 现象：bottom 帧与 top 帧逐像素同图（仅时钟 12:06→12:07 差），顶栏「发布」禁用胶囊底 --c-overlay-white-bg-stronger=rgba(255,255,255,0.4) 半透明白压在渐变上，与 80% 白文字共同构成低对比——同 D03 的禁用态不可读现象，此帧复现。
- 建议改法：同 D03，禁用态底/字改取有对比度的实底令牌，勿用两层半透明白叠加。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（2 条）

### R7-L05-D05　P2 / 位置　批次 R7-B12
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`374760b5bae4d62d`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:713`
- 理想图依据：无基准，依据=组件规范（EmptyState 应在可用区垂直居中）+ R6-L05-D02 修复口径
- 现象：空态块（放大镜+文案+返回钮）贴顶不居中，实测内容只占帧上沿约 30%、其下整片空白。EmptyState 组件已加 flex:1 居中，但页面里承载它的死样式 `.empty-state{flex:1;justify-content:center}`(:713) 选择器对 `<EmptyState>` 组件节点不生效（模板无 .empty-state 节点），宿主未给可解析高度 ⇒ R6 组件半边修了、页面半边没落地。
- 建议改法：给 `<EmptyState>` 的宿主容器（.detail-page 下、header 之后的直接子）加 flex:1;min-height:0，或删死样式改由组件根铺满。
- 修复类别：单页

### R7-L05-D06　P3 / 空态文案　批次 R7-B12
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`bc05c00e115b22ba`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:320`
- 理想图依据：无基准，依据=EmptyState 组件规范（R10-P2-008 hideSub 用于标题与副标题语义重复时）
- 现象：「话题不存在」空态主标题为「话题不存在或已被删除」，副标题又自动带出通用 empty.noDataSub「这里空空如也」，两句语义重复且后者与「不存在」场景不贴；调用处未传 hideSub。
- 建议改法：该 EmptyState 传 :hide-sub="true" 只留一句，或补贴切的 description。
- 修复类别：单页

## subpackages/chat/chat-session/index（1 条）

### R7-L11-D06　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`5e943d5e5f9ea7b4`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/chat/official-chat/index（2 条）

### R7-L11-D07　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`71c87a583d30247b`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

### R7-L11-D08　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`725b4afe8f4595f5`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/discover-extra/discover/matching（2 条）

### R7-L05-D07　P2 / 位置　批次 R7-B03
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`8fc1e46029173b5c`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:109`
- 理想图依据：素材/理想效果图/匹配中页面.png（理想自上而下为 跳过→标题→副标题→双头像轨道→进度卡）
- 现象：与理想效果图纵向顺序颠倒——帧实测为 双头像+轨道在最上、其下才是标题「正在寻找适合你的 TA」与副标题；理想是标题/副标题在上、双头像轨道在下。模板 .match-loading__avatars(:95) 排在 title(:109) 之前所致。
- 建议改法：把 title/subtitle 移到 avatar-area 之前，对齐理想图自上而下节奏。
- 修复类别：单页

### R7-L05-D08　P2 / 层级遮挡　批次 R7-B03
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`0ad33a443cdd9148`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:180`
- 理想图依据：素材/理想效果图/匹配中页面.png（「跳过」在右上角、独立于标题行之上）
- 现象：「跳过」胶囊 top=calc(statusbar+20px+240rpx) 正好落在标题行高度上、right:140rpx，实测帧中它压住标题末字，「正在寻找适合你的 TA」的「A」被遮成「T」；理想图里跳过在状态栏下方独立行、不碰标题。系 R4「下移避开头像」引入的新叠压。
- 建议改法：将跳过 top 上移到状态栏与标题之间的独立带（或给标题预留右侧安全区），确保不与标题文字重叠。
- 修复类别：单页

## subpackages/discover-extra/likes-visitors/index（2 条）

### R7-L07-D01　P3 / 文案　批次 R7-B13
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`08ea6dbd0e3029c8`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:97`
- 理想图依据：无基准，依据=规范文档§1.1 第5条（除头像外 100% 还原）+ 概览三栏语义自洽
- 现象：概览栏「今日浏览量」实测显示 1（取样 y=129-159 三值 0/0/1），而「总浏览量」显示 0；今日浏览量(1) > 总浏览量(0) 在画面上自相矛盾。根因是 :97 `todayViews: likedBy.value.length` 把「喜欢我的条数」当作「今日浏览量」透出，与 :95 `totalViews` 取 visitorsCount 不同源。
- 建议改法：「今日浏览量」改接真实浏览量字段（与 totalViews 同源 profileStats），或在无该数据时不展示这一栏，避免 0/1 互斥。
- 修复类别：单页

### R7-L07-D02　P3 / 文案　批次 R7-B13
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`b527d0c6fa96a8e4`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:358`
- 理想图依据：无基准，依据=规范文档§1.1 第5条 + 概览三栏语义自洽（本帧与 top 逐像素同：清单 sameAsTop=true、contentRegionHash 9347c6fdae8c75ef 相同）
- 现象：滚到底帧仍停在同一概览栏（内容不足一屏，:358 `{{ overview.todayViews }}` 渲染 1、:351 totalViews 渲染 0），「今日浏览量 1」高于「总浏览量 0」的矛盾在本帧同样可见。
- 建议改法：同 D01，令 todayViews 与 totalViews 同源或去掉该栏，滚动前后一致。
- 修复类别：单页

## subpackages/profile-extra/feedback/history（2 条）

### R7-L11-D04　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`2df6afcbf3dc149b`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

### R7-L11-D05　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`a71b9242077e6c56`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/profile-extra/profile/album（2 条）

### R7-L10-D14　P3 / 颜色token　批次 R7-B14
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`26c3f4f6e0e74869`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:817`
- 理想图依据：无基准，依据=R10-P3-022 自陈目标「空位/按钮要明确可点击」+ 规范 §1 色彩档位（同层元素需可区分）
- 现象：帧上「添加照片」大按钮底色与空位格、页面底三色几乎同值：按钮区 y=352 实测 #E8F9F2（x=27..351）、空位格 #E8FAF3、页面底 #ECF7F1，Δ≤4/255，按钮仅靠 1px 品牌绿实线描边可辨，主 CTA 与背景无层次。
- 建议改法：按钮改品牌绿实底白字（或 brand-100 档 + 2rpx 以上描边），与空位格、页面底拉开至少一档明度。
- 修复类别：CSS/token

### R7-L10-D15　P2 / 间距　批次 R7-B14
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`2a43a901ac990e47`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:516`
- 理想图依据：无基准，依据=同域 other 页内容流（内容直达固定底栏）+ 规范 §1 页面留白档；本帧与 top 帧逐行一致（页面不可滚动）
- 现象：帧上长按提示行（y=406..412）以下至 y=810 无任何元素（实测 398px≈796rpx 整屏空白），6 格墙+按钮+提示只占屏高一半，下半屏全空且页面无第二屏内容（top/bottom 帧相同佐证）。
- 建议改法：补足页面下部内容（如「最近上传」时间行/照片使用说明），或将 6 格墙下移居中、收紧页高，消除近半屏空白带。
- 修复类别：单页

## subpackages/profile-extra/profile/favorites（2 条）

### R7-L10-D16　P3 / 颜色token　批次 R7-B15
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`224481b5617ea084`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:34`
- 理想图依据：无基准，依据=规范 §1 色彩档（品牌绿系页面主视觉应入绿系 token）+ EmptyState 组件其余元素（品牌绿按钮 y=252..296 实测 (54,201,154)）同帧对照
- 现象：帧上空态主视觉星形图标呈蓝灰色（图标区 x=160..220/y=140..200 实测字形像素 (148,162,184) 档），与全页薄荷绿底、白卡、品牌绿按钮的绿系 token 不同色系，空态第一视觉落在外来色上。
- 建议改法：更换品牌绿（或文本灰档）星标素材，使空态图标与页面色系统一。
- 修复类别：CSS/token

### R7-L10-D17　P2 / 位置　批次 R7-B15
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`224481b5617ea084`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:32`
- 理想图依据：无基准，依据=src/components/common/EmptyState.vue 组件规范（空态居可用区垂直居中）+ 同帧实测内容块中心 y≈218 vs 视口中心 407
- 现象：帧上空态内容块整体偏上：星标 y=140..200、标题/desc 至按钮底 y=296，内容中心约 y=218，比视口中心（407）偏上约 190px；y=300..800（500px≈1000rpx）整屏空白（top/bottom 同帧=页面不可滚动），空态未在可用区居中。
- 建议改法：给空态容器加可用区垂直居中（flex:1 + justify-content:center），让星标/文案/按钮落在视觉中心。
- 修复类别：单页

## subpackages/profile-extra/profile/location（4 条）

### R7-L10-D07　P3 / 文案　批次 R7-B16
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`1cc1aa37f2601ca1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:225`
- 理想图依据：无基准，依据=规范 §1 文案准确性 + 页内按钮实际方位（「地图选点」钮实测 y=483..527 与提示文字 y=503..511 同行，位于其右侧 x=294..356）
- 现象：帧上地图提示语「轻点下方按钮，在地图上选择新位置」（y=503..511）指向错误——唯一打开选点器的「地图选点」钮在文字右侧同行（y=483..527），文字下方的是「重新定位」（GPS 重定位，非地图选点），方位词与实际可点对象不符。
- 建议改法：文案改为「轻点右侧『地图选点』，在地图上选择新位置」或去掉方位词。
- 修复类别：单页

### R7-L10-D08　P3 / 圆角　批次 R7-B16
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`1cc1aa37f2601ca1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:406`
- 理想图依据：无基准，依据=本页 CSS 自声明 border-radius:24rpx + overflow:hidden（:406）+ 规范 §1 圆角档位一致性（同页卡片均 24/32rpx 圆角可见）
- 现象：帧上地图四角为直角：容器声明 24rpx(12px) 圆角，实测左上角 x=20/y=263 已是地图内容红色像素 (217,69,70)、角部无 12px 圆角缺角（原生 map 层不受父容器 border-radius/overflow 裁剪），与上方 32rpx 圆角白卡视觉断裂。
- 建议改法：外层包一层同尺寸圆角容器 + cover-view 描角，或改用地图截图封面方案，使地图四角与卡片圆角一致。
- 修复类别：单页

### R7-L10-D09　P3 / 可达性　批次 R7-B16
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`7f98ab9a73779a64`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:262`
- 理想图依据：无基准，依据=仓内热区口径 AppShell.vue:334（88rpx）+ 同页 R6-B57/D09 已把「地图选点」提到 88rpx（帧实测 y=483..527=44px≈88rpx ✓）
- 现象：帧上页头返回钮热区仍为 64rpx（CSS :262 width/height 64rpx=32px，实测图标区 x≈22..42/y≈46..72 仅 20px 见方），是同页唯一未达 88rpx 口径的可点控件（navigationStyle:custom 下为本页返回出口）。
- 建议改法：比照 album.vue R6-B55/D17 配方——热区提 88rpx、64rpx 视觉底移入内层 circle。
- 修复类别：CSS/token

### R7-L10-D10　P3 / 可达性　批次 R7-B16
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`7f98ab9a73779a64`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:269`
- 理想图依据：无基准，依据=规范 §1.3 文本/图标对比档（浅底上图形控件需可辨）+ 同域 album.vue 返回圆钮（白底+描边+深图标）的可见规格
- 现象：帧上返回图标视觉呈浅灰蓝（实测字形像素 (183,193,207)~(215,221,229)）压白色页头，对比度约 1.6:1，且可见字形带高仅约 8px（40rpx 盒内素材留白过大），图标又小又浅几乎不可辨。
- 建议改法：更换深色实心返回图标素材（或对 image 加对比 filter），并选用留白正常的图标资产。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（6 条）

### R7-L10-D01　P1 / 可达性　批次 R7-B17
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`3f5f414259902f04`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:516`
- 理想图依据：素材/理想效果图/他人显示主页.png 左上返回钮区（浅暖色头图上深色 ‹ 字形清晰，x=318..342/y=28..36 实测墨迹 (6,5,4)）；理想头图整体为浅色照片（y=0..300 均值 lum 180..231）
- 现象：帧上头图为深色照片（y=26..86 实测 lum 69..119），返回箭头 color=var(--c-text-primary,#333A37) 深灰压深图——箭头热区 x=4..70/y=26..86 内无任何 lum<190 字形像素（对比度≈1:1）；右上「···」圆底 20% 白（--c-overlay-bg-light）实测 x≈232..268/y≈62..96 仅比背景亮约 30，三点字形不可辨，而「···」是举报/拉黑/关注的唯一入口。
- 建议改法：头图上两枚头部控件改反色令牌（var(--c-text-inverse) 字形 + 提高圆底浓度至 0.5 档），或叠加顶部渐变加深后配白字形。
- 修复类别：CSS/token

### R7-L10-D02　P2 / 素材缺失　批次 R7-B05
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`3f5f414259902f04`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:44`
- 理想图依据：素材/理想效果图/他人显示主页.png 白卡头部第一行 =「姓名 + ♀ 徽章 + 在线胶囊」（规范 §3.9 同文）；理想 x≈840..900/y≈355..375 可见粉色元素
- 现象：帧上姓名行只有姓名字形（实测 x=38..96/y=364..380 深色字），其后无 #FF6B81 性别圆徽（40rpx）、无 #E8FBF3「在线」胶囊（online 默认 true 仍未见任何薄荷胶囊像素），姓名行右侧至动作胶囊间 x=100..280 全白。
- 建议改法：保证 mock/接口下发 basic.gender 与 online 字段落位（或给性别/在线兜底渲染），使姓名行按理想图三件套齐显。
- 修复类别：单页

### R7-L10-D03　P2 / 空态文案　批次 R7-B05
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`3f5f414259902f04`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:81`
- 理想图依据：素材/理想效果图/他人显示主页.png 姓名下方第二行为实数据「21岁 · 北京大学 · 北京」（规范 §3.9：年龄学校城市一行）
- 现象：帧上基本信息行落在占位文案「资料暂未完善」上：实测 y=464..470 仅 x=36..111（约六字宽）、字色 #9AA39F 档（glyph 184..212），profileMetaParts 输出为空走了 --empty 分支。
- 建议改法：公共主页取数链补齐 basic.age/school/city（或按 distance/campus 兜底拼行），让该行出实数据而非全局占位语。
- 修复类别：单页

### R7-L10-D04　P3 / 文案　批次 R7-B05
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`3f5f414259902f04`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:67`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡右侧（理想 x≈840..910/y≈355..420）只有浅粉「喜欢」与浅绿「打招呼」上下两枚胶囊，无第三行入口；规范 §3.9 同口径
- 现象：帧上身份卡右下多出一行「送心动卡」下划线文字链（实测 y=440..444/x=299..335 灰字 (153..187) 档），理想图与规范均无此元素，动作区从两枚变成「两胶囊+一链接」三段。
- 建议改法：将「送心动卡」并入「···」governance 菜单或打招呼长按入口，身份卡右侧回到理想图两枚胶囊。
- 修复类别：单页

### R7-L10-D05　P2 / 素材缺失　批次 R7-B04
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`4af7dcefbdc79a1e`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:40`
- 理想图依据：素材/理想效果图/他人显示主页.png「生活瞬间」4 列方格（理想 y≈860..940）为 4 张真实彩色照片（实测色带 179..197 含暖色/蓝灰变化）；规范 §3.9「生活瞬间 4 列正方形网格，无占位」
- 现象：帧上 4 格全部为 #EEF2F0 灰骨架空位格 +「暂无照片」提示（实测 4 格 x=27..104/109..186/193..270/275..353、y=450..525 均一色 (238,242,240)，无任何照片色彩变化），整节与理想图完全不同。
- 建议改法：mock/取景数据链给 media.photos 配 4 张真实图（公共主页演示数据），保留空位格仅作无图兜底。
- 修复类别：单页

### R7-L10-D06　P3 / 颜色token　批次 R7-B06
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`4af7dcefbdc79a1e`）
- 源码证据：`apps/client/src/components/profile/public/RelationshipCTA.vue:153`
- 理想图依据：素材/理想效果图/他人显示主页.png 底栏第三枚「关注」白钮（理想 x≈760..850/y≈1245）图标为品牌绿（x=820 实测 (33,184,127)）
- 现象：帧上「关注」钮（x=258..348/y≈748 白底描边）左侧星标图标呈深灰（实测 x≈296..306 像素 (81,81,81)），非品牌绿；.relationship-cta__star 写的 color:var(--c-brand) 对 <image> 元素无染色效果，图标按素材原色（灰）渲染。
- 建议改法：更换为品牌绿星标素材（ICONS_V2 档），或对该 image 加绿色 filter/改用字体图标，使图标与下方绿色「关注」文字同色系。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/privacy（3 条）

### R7-L10-D11　P2 / 空态文案　批次 R7-B18
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`b7a95133e0ff5f07`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:114`
- 理想图依据：无基准，依据=同域 location.vue 页面密度（卡+地图+双按钮有效占满一屏）+ 规范 §1 页面留白档位；本页内容止于 y≈246
- 现象：帧上开关卡以下 y=250..800（实测 550px≈1100rpx）整屏空薄荷底：页面全部内容只有两枚开关（卡 y≈112..246），footer-space 仅 120rpx，其余靠 min-height:100vh 撑白，无任何补充设置项、说明或引导文案，页面呈半成品观感。
- 建议改法：补齐隐私域内容（黑名单/屏蔽列表入口、位置可见范围、清除缓存等既有后域能力的入口行），或至少给页面加说明文案块消解整屏空白。
- 修复类别：需新建目标功能

### R7-L10-D12　P2 / 可达性　批次 R7-B18
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`b7a95133e0ff5f07`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:93`
- 理想图依据：无基准，依据=规范 §1 控件可辨档 + 同卡第二枚 ON 态开关（品牌绿 (54,201,154) 实测清晰可辨）的对照
- 现象：帧上第一枚「允许推荐给本校学生」开关为 OFF 态，与白卡几乎不可辨：实测开关区 x=296..330/y=138..146 轨道仅 (243..246) 灰、白色滑块压 #FFFFFF 卡上（整控件与背景 Δlum≤12），用户无法察觉此处有可点开关。
- 建议改法：给 OFF 态 switch 加品牌化轨道底色/描边（如 --c-line 加深档或 brand-50 轨道），保证任意状态与白卡对比可辨。
- 修复类别：CSS/token

### R7-L10-D13　P3 / 可达性　批次 R7-B18
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`f71a784f5a34ffe1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:139`
- 理想图依据：无基准，依据=仓内热区口径 AppShell.vue:334（88rpx）；同域 album.vue R6-B55/D17 已修同款返回钮
- 现象：帧上绿色页头返回钮热区 64rpx（CSS :139，实测圆底 x≈16..36/y≈58..90 仅 20px 见方），低于 88rpx 仓内口径；绿色渐变头上 20% 白圆底 + 白 ‹ 字形实测仅比背景亮约 (37,10,19)，可点示能弱。
- 建议改法：热区提 88rpx（视觉圆底不动），圆底浓度提档使「可点圆钮」在绿头上清晰可辨。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/tasks（2 条）

### R7-L11-D01　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`bd47715a3212dc6f`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

### R7-L11-D02　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`d60868563c956cb6`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/profile-extra/profile/visitors（2 条）

### R7-L09-D08　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`b67eb880ba9196c7`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

### R7-L09-D09　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`ff103c269d05089e`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/profile-extra/settings/dnd（1 条）

### R7-L11-D03　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`e6ec890f0e59f03f`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/profile-extra/settings/index（1 条）

### R7-L09-D03　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`144c1178fd8b9f91`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/profile-extra/verification/index（2 条）

### R7-L09-D04　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`02e633bee4bb577e`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

### R7-L09-D05　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`240c28c7a269b2c9`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/profile-extra/verification/real-name（2 条）

### R7-L09-D06　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`2a50f93017b1942b`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

### R7-L09-D07　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`222eb02eb8a0e940`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/support/feedback/index（4 条）

### R7-L13-D01　P2 / 可达性　批次 R7-B19
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`4480f5b92d667a9c`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:621`
- 理想图依据：无基准，依据=规范文档§1 + 本页源码自陈触控标准（index.vue:620「触控目标 ≥88rpx」注释、index.vue:806 引 AppShell.vue:334「≥88rpx(44px)」）
- 现象：分类 chip 实测药丸（首个选中态，纯绿 #36C99A，x=32..90）垂直墨迹仅 y=224..260 ≈ 36px ≈ 72rpx，低于源码声明的 `.chip{min-height:88rpx}`（=44px）与仓内 88rpx 触控热区标准；作为反馈类型唯一切换入口热区不足。
- 建议改法：排查 min-height 未生效原因（如被旧构建/行内样式覆盖），并把 chip 显式声明 `min-height:88rpx; box-sizing:border-box`，画面高度补足 8px。
- 修复类别：单页

### R7-L13-D02　P3 / 颜色token　批次 R7-B19
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`4480f5b92d667a9c`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:645`
- 理想图依据：无基准，依据=规范文档§1.2 占位令牌 --c-text-placeholder=#9AA39F（绿灰）
- 现象：三处表单占位符（标题框 y≈290、正文 textarea y≈335-344、微信号框 y≈516-523）实测最暗像素 #898B8B / #848484 / #8C8D8C，R=G=B 纯中性灰，是 mp-weixin 输入控件 UA 默认 #808080 系；`.field`（645 行背景段）未声明任何 placeholder 颜色，§1.2 占位令牌 #9AA39F（G 通道偏高 9）完全没落到画面上。
- 建议改法：`.field` 补 `placeholder-class` 并在类里写 `color: var(--c-text-placeholder, #9AA39F)`（textarea 同步 placeholder-style）。
- 修复类别：单页

### R7-L13-D03　P3 / 颜色token　批次 R7-B01
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`7d2fdb98e872062b`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:100`
- 理想图依据：无基准，依据=规范文档§1.1「一令牌一值，禁止私有色值」+ §1.2 全量色板（无蓝灰档）
- 现象：提交记录空态的 120rpx 图标（bbox 实测 x=149..227、y≈677..730）渲染为蓝灰 #91A0B6 最暗值，§1.2 色板无此色（主文本 #1A1E1C / 三级 #6B7571 / 互动蓝 #4D8DFF 均不匹配），SVG 素材自带私有色值未走令牌，在白卡上发蓝发飘。
- 建议改法：SEARCH 图标 SVG 的 fill 换成 var(--c-text-tertiary)（或 image 上加 CSS filter 统一色相），与空态标题 #6B7571 同系。
- 修复类别：单页

### R7-L13-D04　P3 / 位置　批次 R7-B19
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`7d2fdb98e872062b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:556`
- 理想图依据：无基准，依据=组件规范 BottomActionBar.vue:11-19 自陈「传 fixed 即启用吸底变体…主 CTA 悬在内容流末尾」+ R6-L15-D07 同类判例
- 现象：「提交」主 CTA 未传 fixed，走内容流：bottom 帧（已滚至提交记录卡）按钮实测位于视口中部 y=461..501，吸底位 y≥770 处无提交入口，长表单填完需滚回顶部才能提交。
- 建议改法：`<BottomActionBar fixed …>` 启用吸底变体，并给滚动内容留 bottom 安全区。
- 修复类别：单页

## subpackages/tools/activities/detail（2 条）

### R7-L08-D07　P2 / 字号　批次 R7-B20
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`3c50bcd5701c67ff`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:477`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（页面主标题 26–28px / 大标题 fs-5xl 22px；fs-xl=15px 属「正文/辅助」档）；同仓兄弟页头部标题取 fs-5xl（heart-signals/index.vue:446 .page-header__title font-size: var(--fs-5xl)）
- 现象：顶部绿渐变导航栏（实测 y=0..88）里的页面标题「活动详情」墨迹高仅 12px（y=64..75，em≈15px=fs-xl 辅助档），比 §1.3 页面主标题档（26–28px）小近一半、也比兄弟工具页头部（fs-5xl 22px）小 7px，页头标题层级塌到正文档。
- 建议改法：.detail-header__title 字号升到 var(--fs-5xl)（22px）并保持 700 字重，与 heart-signals 页头同口径。
- 修复类别：单页

### R7-L08-D08　P3 / 圆角　批次 R7-B20
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`5bfb62d09eea069a`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:523`
- 理想图依据：无基准，依据=规范文档§1.4 圆角令牌（卡片圆角 --card-radius 40rpx=20px；--r-xl 24rpx=12px 是小卡/输入档）；§1.2/§1.4「一令牌一值」卡片容器应引卡片令牌
- 现象：bottom 帧与 top 帧内容一致（仅状态栏时钟像素差）：两张白卡（标题/元信息卡 y=281..385、活动介绍卡 y=395..475）实测圆角仅 ~12px（=--r-xl 24rpx），比全站卡片圆角令牌 --card-radius 40rpx(20px) 小 8px，与首页/寻觅页大卡明显不同代，卡片观感偏「贴纸」。
- 建议改法：.detail-section 的 border-radius 改引 var(--card-radius, 40rpx)，与本页底部操作条外的全站卡片令牌对齐。
- 修复类别：CSS/token

## subpackages/tools/daily-question/index（2 条）

### R7-L07-D03　P2 / 素材缺失　批次 R7-B21
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`9e49d5aa30e5cd14`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:149`
- 理想图依据：无基准，依据=规范文档§1.6 第3条（裸 SVG 需可光栅化）+ R6-L08-D14 修复自述「图标整块不渲染」应已解决
- 现象：锁定卡标题「签到后解锁」上方应有一枚 80rpx 锁图标，实测图标带 y=270-340 全宽内亮度<210 的像素为 0（同帧标题带 y=349-361 有 674 个 <180 像素作对照），即锁图标零墨迹、整块未渲染。根因：:150 绑定的 common/lock.svg 是 `fill="none" stroke="#94A3B8"` 且只有 viewBox 无 width/height，正是 R6-L09-D01 点名的 mp-weixin real 档「SVG 缺内在尺寸→0×0」失效路径；R6-L08-D14 只补了 root-class 容器尺寸，没解决 SVG 本体不光栅化。
- 建议改法：换用带内在宽高的 PNG 锁图（对齐 :49 附近 LOCATION 改 PNG 的口径），或给 lock.svg 烘 width/height 后再走 SafeImage。
- 修复类别：单页

### R7-L07-D04　P2 / 素材缺失　批次 R7-B21
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`8468785bd16c3571`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:150`
- 理想图依据：无基准，依据=规范文档§1.6 第3条 + R6-L08-D14 修复自述（本帧锁定卡与 top 同屏，滚动无变化）
- 现象：同 D03，:150 `:src="IMAGE_PATHS.ICONS_COMMON.LOCK_SVG"` 的锁图标在本帧锁定卡内仍零墨迹（标题「签到后解锁」上方空白带无 <210 像素），修复未落地。
- 建议改法：同 D03，改可光栅化的锁素材或给 SVG 烘内在尺寸。
- 修复类别：单页

## subpackages/tools/heart-signals/index（2 条）

### R7-L08-D05　P2 / 文案　批次 R7-B22
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`2a2037b23f5e5150`）
- 源码证据：`apps/client/src/subpackages/tools/heart-signals/index.vue:220`
- 理想图依据：无基准，依据=规范文档§1.5 common 组件规范 + LockScreen 组件自设的按页覆盖机制（R6-L09-D27：宿主可传 titleOverride/subtitleOverride/benefitsOverride，通稿铺 5 个宿主属已认定缺陷）
- 现象：取景账号资料未完善 ⇒ 整页落在 LockScreen 通稿（绿环插画 y175..305、主标题墨迹 y374..390 共 13 字逐字=「完善资料，解锁完整交友功能」、副题两行 y405..436、权益三条 y482..539、绿主按钮 y558..605），全页墨迹 0 处出现「心动信号」页名；R6-L09-D27 在 LockScreen.vue:47-49 已建 titleOverride/subtitleOverride/benefitsOverride 三个 props，但本宿主调用只传 :completion-percent，全仓 grep 无任何消费点——机制建了没接线，本页锁定态与页面语义脱节的原缺陷原样在帧。
- 建议改法：heart-signals 调用 LockScreen 时传 titleOverride（如「完善资料，解锁心动信号」）与页内权益清单，接上 R6-L09-D27 既有机。
- 修复类别：单页

### R7-L08-D06　P3 / 可达性　批次 R7-B02
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`43524f0c4057bd65`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:414`
- 理想图依据：无基准，依据=仓内自陈触控下限 AppShell.vue:334「min-height: 88rpx(44px)」+ 微信小程序体验规范最小热区；LockScreen 是全屏唯一出口层，× 是其中唯一不跳转的退出路径
- 现象：bottom 帧与 top 帧仅漂浮爱心/胶囊动画帧差（diff bbox y=17..197），锁定态相同；左上 × 关闭钮实测半透明白圆 x=16..52、y=52..88（直径 36px=72rpx），热区低于 88rpx(44px) 自陈下限 16rpx，且该 × 是被锁页面唯一「原路返回」出口（主按钮会跳资料完善）。
- 建议改法：保持 72rpx 视觉圆不变，外扩透明命中区到 88rpx（padding 补齐），与 .search-tab（search/index.vue:696 同口径）一致。
- 修复类别：CSS/token

## subpackages/tools/help/index（2 条）

### R7-L07-D06　P3 / 字号　批次 R7-B23
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`d7c1435ca2447a62`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:204`
- 理想图依据：无基准，依据=规范文档§1.3 字号分层（正文/列表主文字 --fs-xl/2xl=15/16px；--fs-md=13px 归「标签·时间戳」）
- 现象：6 条 FAQ 主问句（实测墨带 y=225-236/268-279/310-322/352-364/396-408/438-450，高约 12px）用 :204 `font-size: var(--f-md)`（tokens.scss:146 → --fs-md=26rpx=13px）。FAQ 问句是可点主内容，却落在 §1.3 指定给「标签·时间戳」的 13px 档，比列表主文字 15-16px 小一档。
- 建议改法：FAQ 问句字号提到 --fs-xl（30rpx=15px），与答案 --f-sm 拉开层级。
- 修复类别：CSS/token

### R7-L07-D07　P3 / 字号　批次 R7-B23
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`3be158f19f6fdfc3`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:204`
- 理想图依据：无基准，依据=规范文档§1.3 字号分层（本帧与 top 同屏，FAQ 全部可见）
- 现象：同 D06，本帧 6 条 FAQ 问句仍以 :204 --f-md(13px) 渲染，主问句字号低于 §1.3 列表主文字 15-16px 一档；页面无需滚动即整屏可见，bottom 与 top 一致。
- 建议改法：同 D06，问句升 --fs-xl。
- 修复类别：CSS/token

## subpackages/tools/love-center/consulting（2 条）

### R7-L09-D01　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`a99aadcffa3fe183`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

### R7-L09-D02　待补 / 待补　批次 -
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`d3781725f24e1da1`）
- 源码证据：`待补`
- 理想图依据：待补
- 现象：待补
- 建议改法：待补
- 修复类别：待补

## subpackages/tools/love-center/index（1 条）

### R7-L07-D05　P2 / 文案　批次 R7-B24
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`818784abf0cec96e`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:115`
- 理想图依据：无基准，依据=规范文档§1.1 第5条 + 页面自述 index.vue:3「恋爱中心」应与页头标题一致
- 现象：页头 AppShell 标题（:115 `:title="t('home.loveConsulting')"`=「恋爱咨询」）与下方第二个板块标题（:141 同键「恋爱咨询」）在 top 帧逐字重复出现两次（实测两处「恋爱咨询」文本带），本页实为「恋爱中心」聚合页（含快捷入口/恋爱咨询/恋爱测试），页头写成「恋爱咨询」既与页名不符又与板块标题撞名。
- 建议改法：页头 title 改用「恋爱中心」专用键（或本页路由名），板块标题保留「恋爱咨询」，消除重复。
- 修复类别：单页

## subpackages/tools/love-center/nearby（2 条）

### R7-L08-D09　P3 / 间距　批次 R7-B25
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`09d92c3c5e0834fe`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:224`
- 理想图依据：无基准，依据=规范文档§1.4 布局铁律「满屏页不留大段死白」+ 组件规范满屏容器（100vh）内容区应伸展或给出占位说明
- 现象：本页为 100vh 无滚动布局（.nearby height:100vh），top 帧实测地图暗色区 y=94-585、卡片区最后墨迹止于 y=663，之下 y=665-796 共 132px 全空（行扫描 <1% 墨迹），仅剩 y=799-813 home 指示器带；卡片少时列表区不伸展也无「更多附近的人」类占位，满屏页底 1/6 是死白。
- 建议改法：给 .nearby-card-area 尾部补空态/加载更多占位（同页 nearby-empty 196 行已有组件可复用低密度版），或让卡片区 min-height 吃满剩余视口。
- 修复类别：单页

### R7-L08-D10　P3 / 间距　批次 R7-B25
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`e45ae29a75d3fcb3`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:263`
- 理想图依据：无基准，依据=同 D09（规范文档§1.4 满屏页不留大段死白）；bottom 帧与 top 帧逐带一致（110050B vs 110081B 仅状态栏时钟差），滚动未能改变画面 ⇒ 佐证该页无可滚内容
- 现象：bottom 帧行扫描与 top 帧完全同构：内容止于 y=663、y=665-796 共 132px 死白；页面滚动前后画面无变化，说明底部空白不是「还没滚到」，而是布局本身在卡片区下方留空。
- 建议改法：同 D09（占位或伸展）；若为设计刻意留白，请在页内给出视觉收尾元素（如底部安全区渐变），不留纯空白带。
- 修复类别：单页

## subpackages/tools/search/index（4 条）

### R7-L08-D01　P1 / 尺寸比例　批次 R7-B26
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`601b715dd0dbda5e`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:545`
- 理想图依据：无基准，依据=规范文档§1.4（页边距/间距令牌）+ §1.3（正文 15px 可读）；头部行应「返回+输入框(占满剩余)+取消」，输入框是本页主操作
- 现象：.search-cancel 与 .search-box（index.vue:494 R12-IND-SEARCH-001 已给 margin-right calc(--capsule-right+96px)）重复叠加同一份 103px 右避让 ⇒ 头部行被两张 103px margin 吃掉 ~206px，输入框实测只剩 x=54..131（宽 ~77px≈153rpx），14 字 placeholder「搜索感兴趣的人、标签和学校」在 x=121 处被切断只显示「搜索感」3 字（R6-L09-D16 位置原样复发），输入框右缘与「取消」文字（实测绿字 x=239..265）之间留 ~108px 纯白死区。
- 建议改法：删掉 .search-cancel 的 margin-right（胶囊避让只保留 .search-box 一处），或改为 .search-header 右 padding 一次避让，把 ~100px 还给输入框，保证 placeholder 完整显示。
- 修复类别：单页

### R7-L08-D02　P3 / 颜色token　批次 R7-B26
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`601b715dd0dbda5e`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:539`
- 理想图依据：无基准，依据=规范文档§1.2（一令牌一值：页面只引用 --c-*；心动粉 #FF6B81 禁用于表单/操作状态）+ §1.1（绿=行动、粉=喜欢，两色禁混用）
- 现象：「取消」文字实测色 #35C99A，来自 var(--color-primary, #ff6b81)——该令牌不在 §1.2 令牌表（工程应为 --c-brand #36C99A），且兜底值 #ff6b81 与心动粉 --c-romance-500 同值，一旦 legacy 变量失效「取消」会翻成粉色操作字，违反粉色角色禁令。
- 建议改法：改引 var(--c-text-secondary)（次要操作字）或 var(--c-brand)，删掉 #ff6b81 兜底。
- 修复类别：CSS/token

### R7-L08-D03　P1 / 尺寸比例　批次 R7-B26
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`601b715dd0dbda5e`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:494`
- 理想图依据：无基准，依据=规范文档§1.4（页边距/间距令牌）+ §1.3；与 top 帧同源画面（两帧 sha16 相同，bottom 帧同样含头部行）
- 现象：bottom 帧头部与 top 帧一致：.search-box 自身 margin-right calc(--capsule-right+96px)=103px 与取消钮的第二份 103px margin 叠加，输入条实测仅 x=54..131 宽 ~77px，placeholder 墨迹止于 x=121（「搜索感」3 字后截断），框右缘 x≈131 至「取消」x≈239 间为 ~108px 空白。
- 建议改法：胶囊避让只在头部行计一次（.search-header 统一 padding-right），令输入框吃满返回键到取消钮之间的剩余宽度。
- 修复类别：单页

### R7-L08-D04　P3 / 空态文案　批次 R7-B26
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`601b715dd0dbda5e`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:335`
- 理想图依据：无基准，依据=规范文档§1.5 common 组件规范（StatusState/ErrorState 空态组件=插画+主文案+副文案）+ 本页 EmptyState 组件既有形态
- 现象：未搜索态只有一行 13px 灰字提示（实测墨迹 y=507..516、x=70..308）+ 一枚残留历史 chip「123456」（y=450..470 白底 x=16..91），热搜区无数据被整段吞掉；裸 text 提示不走 EmptyState/StatusState 组件形态，无插画无图标，空态层级比同页结果空态（index.vue:345 带 EmptyState）弱一档。
- 建议改法：仅热搜为空的分支也走 EmptyState（type=no-data + hide-sub）或给 .suggest-hint 配 StatusState 插画，统一空态形态。
- 修复类别：单页

## subpackages/tools/security/index（1 条）

### R7-L07-D08　P3 / 可达性　批次 R7-B27
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`bc586a3bb768fd96`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:618`
- 理想图依据：无基准，依据=组件规范（带 › 箭头的 sec-item 行均为可点导航行）
- 现象：「绑定 Apple」行（:610 `<view class="sec-item">` 无 @tap、无 role=button、无 press-feedback）却在行尾渲染了导航箭头 :618 `<text class="sec-item__arrow">›</text>`（实测该行 y=483-523 右侧有箭头墨迹）。同页其余 8 行的 › 都对应可点跳转，唯独此行有箭头却点不动，属误导性死控件。
- 建议改法：去掉不支持行的 › 箭头（或改灰 disabled 样式），与「当前环境不支持 Apple 登录」的不可点语义一致。
- 修复类别：单页

## 空帧段（未交代，不算已审）（11 段）

- `R7-L02` 帧 `tmp/qa/frames/R7/real-f0677920/pages__messages__index__top.png`（sha16=`b0a05e426342a27a`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L02` 帧 `tmp/qa/frames/R7/real-f0677920/pages__messages__index__bottom.png`（sha16=`0b94f4a203b3bc98`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L02` 帧 `tmp/qa/frames/R7/real-f0677920/pages__profile__index__top.png`（sha16=`8187fe431a1f546d`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L02` 帧 `tmp/qa/frames/R7/real-f0677920/pages__profile__index__bottom.png`（sha16=`3ae7f908dca185ac`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L02` 帧 `tmp/qa/frames/R7/real-f0677920/subpackages__village__village__index__top.png`（sha16=`d1ffd3917413b4e3`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L02` 帧 `tmp/qa/frames/R7/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`8526ae27e30cedd5`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L02` 帧 `tmp/qa/frames/R7/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`3cfd57e6463374b9`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L13` 帧 `tmp/qa/frames/R7/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`e15b993899134ce5`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L13` 帧 `tmp/qa/frames/R7/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`5ab5f92b33127903`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L13` 帧 `tmp/qa/frames/R7/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`ea1baa56bdf5e136`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R7-L13` 帧 `tmp/qa/frames/R7/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`de3f4eac310b9571`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审

## 无缺陷（CLEAN）帧（17 张）

> 这些帧泳道逐轴量过、判"没有可测缺陷"。轴名与读数照卡原样。

### R7-L03　post 发布到头像位已修复且页面可滚动（top）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__post__top.png`（sha16=`e0a229d4dbc73ab4`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=「发布到」卡顶边 y≈128px、标题占位 y≈210px、正文占位 y≈262px（帧实测，状态栏 11:46）; 尺寸比例=发布到头像 88×88rpx 圆形(post-to__avatar:1294)、加图按钮≈176rpx 方框; 颜色token=头像底 --c-brand-50=#E8FAF3(post-to__avatar:1297)、页面底浅绿渐变; 圆角=发布到卡 --r-xl=24rpx(post-to__card:1286)、头像 50%; 字号=标题占位 --fs-lg=28rpx、正文占位 --fs-md=26rpx(design-variables.scss:563); 间距=发布到卡 padding 24rpx、卡内 gap 20rpx(post-to__card:1283); 素材缺失=0 个加载失败，发布到头像位由 R6 的 0 像素修复为 SCHOOL 图标(post-to__avatar-emoji:774); 空态文案=标题占位「填写标题会有更多赞哦～」逐字(post.vue:881); 层级遮挡=底部工具栏 position:fixed 置顶、正文流内无重叠(post.vue:1272); 可达性=发布到整卡可点、底部 5 图标热区≥88rpx; 文案=「发布到」「个人动态」「默认公开 · 所有人可见」逐字(post.vue:223,234); 需新建=post.vue 旧发帖页结构完整(post.vue:7 自述)，无缺要素

### R7-L03　post 滚动后发帖小贴士出现（bottom，证明可滚）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`8c62b1731f13e434`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=滚动后「发布到」卡移出可视区、发帖小贴士条出现在工具栏上方 y≈660px（帧实测，状态栏 11:47，sameAsTop=false）; 尺寸比例=发帖小贴士条满宽、正文占位区高≈380rpx; 颜色token=小贴士底浅绿 #E8FAF3 族、正文占位灰字 --c-text-tertiary=#6B7571; 圆角=小贴士条圆角≈16rpx; 字号=小贴士标题≈26rpx、正文≈24rpx; 间距=小贴士与工具栏间距≈16rpx; 素材缺失=0 个加载失败; 空态文案=「发帖小贴士」「真实分享校园生活，友善互动，让更多人认识有趣的你～」逐字; 层级遮挡=工具栏 fixed 与小贴士无重叠(post.vue:1272); 可达性=添加话题/添加位置/提及好友/谁可以看 4 行整行可点; 文案=「添加话题 已选 0/5」「添加位置」「提及好友」「谁可以看 所有人可见」逐字; 需新建=底部工具栏 5 图标（图片/话题/位置/提及/更多）齐备，无缺要素

### R7-L03　detail 帖子不存在空态已垂直居中且单行（top）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`78bc94b1127e219a`）
- 依据：素材/理想效果图/帖子.png
- 逐轴读数：位置=空态组垂直居中：放大镜图标 y≈405px、文案 y≈455px、按钮 y≈505px（帧实测，状态栏 11:48，宿主 flex 居中 detail.vue:2824）; 尺寸比例=空态图标 120×120rpx(EmptyState.vue:140)、按钮 min-height 88rpx(EmptyState.vue:164); 颜色token=按钮底 --c-brand=#36C99A(EmptyState.vue:159)、文案 --fs-lg 灰字; 圆角=按钮 --r-full=9999rpx 胶囊(EmptyState.vue:158); 字号=空态标题 --fs-lg=28rpx(EmptyState.vue:145); 间距=容器 padding 80rpx 40rpx(EmptyState.vue:125); 素材缺失=0 个加载失败，no-data 图标为 SEARCH 放大镜(EmptyState.vue:53); 空态文案=「帖子不存在或已被删除」单行、hide-sub 生效无副标题(detail.vue:1345); 层级遮挡=空态独占可视区，无叠加(detail.vue:2824); 可达性=「返回广场」按钮 min-height 88rpx≥热区标准(EmptyState.vue:164); 文案=「帖子详情」标题、「返回广场」按钮逐字; 需新建=detail?id=352 未命中后端帖子→渲染 not-found 空态（数据/取证侧），空态要素齐全

### R7-L03　detail 空态整页无隐藏内容（bottom，与 top 同态）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`8187fa9f4a8d6c87`）
- 依据：素材/理想效果图/帖子.png
- 逐轴读数：位置=与 top 同帧（状态栏 11:49，sameAsTop=true），空态组仍居中 y≈405..505px; 尺寸比例=图标 120rpx、按钮 min-height 88rpx(EmptyState.vue:140,164); 颜色token=按钮 #36C99A(EmptyState.vue:159); 圆角=按钮 9999rpx(EmptyState.vue:158); 字号=标题 28rpx(EmptyState.vue:145); 间距=容器 padding 80rpx 40rpx(EmptyState.vue:125); 素材缺失=0 个加载失败; 空态文案=「帖子不存在或已被删除」单行无副标题(detail.vue:1345); 层级遮挡=无叠加（bottom 与 top 一致证明整页仅空态）(detail.vue:2824); 可达性=按钮 88rpx 热区(EmptyState.vue:164); 文案=「返回广场」逐字; 需新建=空态要素齐全（图标 120rpx+按钮 88rpx），无可滚内容属正常非卡滚

### R7-L03　tag-posts 标签帖列表卡要素齐备且可滚（top）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`b1ad297d4f62a3cd`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=首卡作者行 y≈130px、次卡 y≈360px、页脚「没有更多了」y≈700px（帧实测，状态栏 11:50）; 尺寸比例=头像 76×76rpx 圆(.user-avatar:668)、卡片 margin 16rpx 24rpx(.post-card:637); 颜色token=头部渐变 brand→romance-300 #FF8DA1(tag-posts:512)、标签底 #E8F9F4 字 #36C99A(tag-posts:749); 圆角=卡片 --r-xl=24rpx(.post-card:641)、标签 --r-full 9999rpx(.post-card__tag:752); 字号=作者名 --fs-xl=30rpx(.user-info__name:707)、正文 30rpx、标签 24rpx; 间距=卡内 gap 18rpx、padding 28rpx(.post-card:636); 素材缺失=0 个加载失败，两卡头像均为真实照片; 空态文案=页脚「-- 没有更多了 --」逐字; 层级遮挡=头部吸顶未压卡片(tag-posts:507); 可达性=整卡可点、互动图标行 gap 28rpx(.post-card__actions:773); 文案=标题「#运动」、「返回」、「演示·南开大学」「南开大学」逐字; 需新建=两帖卡要素（头像/昵称/学校/正文/标签/时间/评论/赞/分享）齐备，top≠bottom（sameAsTop=false）可滚，2 帖即该标签全量

### R7-L03　tag-posts 滚动后同标签全量两帖无串文（bottom）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`7553e87873358fe8`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=滚动后内容区，两卡与页脚仍满屏（状态栏 11:51，sameAsTop=false 证明可滚）; 尺寸比例=头像 76rpx、卡片圆角 24rpx(.user-avatar:668); 颜色token=标签底 #E8F9F4 字 #36C99A(tag-posts:749); 圆角=卡片 24rpx(.post-card:641); 字号=正文 30rpx(.post-card__content:727); 间距=卡 margin 16rpx 24rpx(.post-card:637); 素材缺失=0 个加载失败; 空态文案=「-- 没有更多了 --」逐字; 层级遮挡=头部吸顶未压列表(tag-posts:507); 可达性=评论/赞/分享图标 gap 28rpx(.post-card__actions:773); 文案=「14 小时前」「演示·中山大学」「中山大学」逐字; 需新建=2 帖即该标签全量，学校与昵称一致无串文

### R7-L03　history 4 条记录统计字号已提档且满屏（top）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__history__top.png`（sha16=`2734c215daf63f13`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=头部「共 4 条记录」y≈118px、首条 y≈180px、页脚「没有更多了」y≈700px（帧实测，状态栏 11:52）; 尺寸比例=头像 88×88rpx 圆(.history-item__avatar:413); 颜色token=「清空记录」底 --c-romance-bg-tint、字 --c-romance-500=#FF6B81(history:356,361); 圆角=清空记录 24rpx(.history-clear:355)、头像 50%; 字号=作者 28rpx、标题 30rpx、摘要 26rpx、统计 --fs-base=24rpx(.history-item__stat:493); 间距=条目 gap 20rpx、padding 28rpx 32rpx、统计 gap 24rpx(history:405,482); 素材缺失=0 个加载失败，4 条记录头像均真实照片; 空态文案=页脚「— 没有更多了 —」逐字; 层级遮挡=头部吸顶未压列表(history:344); 可达性=整条可点、清空记录按钮 padding 8rpx 24rpx(.history-clear:354); 文案=「共 4 条记录」「清空记录」「演示·南开大学」「新开游泳馆早场人很少」逐字; 需新建=统计「赞/藏/看/评」R6-L04-D07/D08 已从 22rpx/#bbb 提至 24rpx/--c-text-secondary(history:490)，top==bottom 属 4 条+页脚满屏非卡滚

### R7-L03　history 滚动后同 4 条无隐藏无串文（bottom）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`c2deedb8cb4075e3`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=与 top 同帧（状态栏 11:53，sameAsTop=true），4 条记录+页脚满屏; 尺寸比例=头像 88rpx(.history-item__avatar:413); 颜色token=清空记录字 #FF6B81(history:361); 圆角=清空记录 24rpx(.history-clear:355); 字号=统计 24rpx(.history-item__stat:493); 间距=条目 padding 28rpx 32rpx(history:406); 素材缺失=0 个加载失败; 空态文案=「— 没有更多了 —」逐字; 层级遮挡=无叠加（bottom 与 top 一致证明无隐藏记录）(history:344); 可达性=条目整行可点、清空记录按钮 padding 8rpx 24rpx(.history-clear:354); 文案=「唐锿锿」「谢知意」「远山」「汉服出行日，路上好多同胞」逐字; 需新建=4 条记录昵称/学校/时间各自独立无串文

### R7-L03　circles 列表卡全要素且热门角标反色已修（top）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`11b1dd835f8f4083`）
- 依据：素材/理想效果图/兴趣圈列表.png
- 逐轴读数：位置=标题「兴趣圈」y≈80px、chips y≈145px、首卡 y≈180px（帧实测，状态栏 11:53）; 尺寸比例=封面 144×144rpx(.circle-card__cover-wrap:605); 颜色token=热门角标底 --c-romance-50=#FFECEF 字 --c-romance-700=#CC4A5F（R6-L04-D14 已修，circles:628）、chips 选中 --c-brand=#36C99A; 圆角=卡片 --r-lg=20rpx(.circle-card:587)、封面 --r-md=12rpx(:607)、角标 999rpx(:631); 字号=角标 --fs-xs=22rpx(.circle-card__hot-text:638); 间距=卡 gap --sp-4=16rpx、padding --sp-6 --sp-5(:581); 素材缺失=5 张封面（摄影/旅行/音乐/运动/美食）全部命中真实图，0 加载失败; 空态文案=本页内容态无空态，副标「找到与你志趣相投的人」逐字; 层级遮挡=头部+chips 吸顶未压卡片(index.vue:380); 可达性=加入按钮、整卡可点、封面热区≥88rpx; 文案=「兴趣圈」「全部/摄影/旅行/音乐/运动/美食」「摄影圈」「加入」逐字; 需新建=理想图卡片全要素（封面/名/热门/人数/动态数/好友头像/加入）已实现，chip 行末「≡」更多筛选以头部搜索等价替代，top≠bottom 可滚

### R7-L03　circles 滚动后新增三圈封面均命中（bottom）
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`b8b3ee2a464f67ce`）
- 依据：素材/理想效果图/兴趣圈列表.png
- 逐轴读数：位置=滚动后新增 游戏圈/阅读圈/宠物圈 三卡（状态栏 11:54，sameAsTop=false 证明可滚）; 尺寸比例=封面 144rpx 方(.circle-card__cover-wrap:605); 颜色token=热门角标 #FFECEF/#CC4A5F、加入按钮描边 --c-brand(circles:628); 圆角=卡片 20rpx、封面 12rpx(.circle-card:587,607); 字号=角标 22rpx(.circle-card__hot-text:638); 间距=卡 padding --sp-6 --sp-5(:582); 素材缺失=0 个加载失败，游戏/阅读/宠物封面均真实图命中; 空态文案=内容态无空态，末卡「宠物圈」逐字; 层级遮挡=吸顶头未压列表(index.vue:380); 可达性=加入按钮热区≥88rpx; 文案=「游戏圈」「阅读圈」「宠物圈」「组队开黑、聊新作，找到一起玩的人」逐字; 需新建=8 圈封面在帧内全部渲染，两张缺封面属已知遗留需新建素材（非加载失败）

### R7-L07　love-center bottom 帧逐轴核对
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`d4882b5f07ad2a75`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=板块卡左缘 x=17px(=32rpx 页边距)、右缘 x=361px(右距 17px) 左右对称(sharp 取样 y=200); 尺寸比例=双列等宽各 168px(左 17-185 / 右 193-361); 颜色token=页面底 #EEF7F2(取样@10,500)、卡片 #FFFFFF(取样@60,160) 与 §1.2 令牌一致; 圆角=卡片 --card-radius 40rpx=20px(index.vue:231); 字号=区块标题 --fs-3xl 36rpx=18px，实测标题墨带 y=100-116 高 16px(index.vue:209); 间距=双列 gap --sp-3 实测约 8px(185→193)、卡内 padding --sp-5(index.vue:219); 素材缺失=0 缺图，心/文档/气泡/学士帽/定位/拼图 6 图标全渲染(index.vue:155); 空态文案=本页无空态分支，4 板块恒渲染(R6-L09-D06 index.vue:139); 层级遮挡=无 z-index 叠压，卡片按文档流顺序(index.vue:190); 可达性=板块热区 padding --sp-5 加图标 56rpx，行高≥88rpx(index.vue:229); 文案=「恋爱咨询/社交咨询」板块标题逐字、封存卡「功能封存中」标签在位(index.vue:158); 需新建=无基准页，按 §1 令牌与组件规范核，理想内容全部已实现(index.vue:116)

### R7-L08　love-center/mbti top 帧逐轴核对
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`145cc75b7bb75bfb`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=状态栏带 y=0-30px、页头墨带 y=57-79px、首卡内容带起 y=103px（--sp-4+statusbar 内边距 nearby.vue 同构 mbti.vue:294）； 尺寸比例=内容带右缘 x≈362px ⇒ 页边距 16px=32rpx（带 154-165/186-196 取样）； 颜色token=页面底 #F3FAF6/#EEF7F2 双绿底（占位 23.5%/9.2%）、卡底 #FFFFFF 26.0% 与 §1.2 令牌系一致； 圆角=分段带 92-125 #EDF7F1（33px≈66rpx 高的通栏分组条，无独立卡片圆角诉求）； 字号=题干/选项墨带节拍 10-13px（103-116/125-137/154-165），--fs-md 28rpx 档（mbti.vue:320 content-scroll 排版）； 间距=题与题间空白 ~9-11px（165→186 间带距实测）； 素材缺失=0（本帧无图片元素诉求，纯排版页）； 空态文案=非空态（内容带 103-410 连续）； 层级遮挡=0 处断裂（带序连续）； 可达性=滚动真实生效（bottom 帧带序 102-115/132-145 与本帧 103-116/125-137 不同）； 文案=题干走 i18n contentPages.mbti.*（mbti.vue:148 scroll-view 内容区）； 需新建=0 项（测题/结果面板/重测按钮已实现 mbti.vue:244/254）

### R7-L08　love-center/mbti bottom 帧逐轴核对
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`e7f8385baa640d89`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=滚动尾段内容带 102-529px、 intentional 尾部留白 y=713-796=84px（content-footer-space mbti.vue:217 显式占位）； 尺寸比例=内容带右缘 x≈362px ⇒ 页边距 16px=32rpx（带 305-317/442-454 取样）； 颜色token=页面底 #F3FAF6 31.0% + #EEF7F2 15.7% + 卡底 #FFFFFF 15.2%（§1.2 令牌系）； 圆角=结果面板带 93-121 #E6EEEA 通栏容器（无独立卡片圆角诉求）； 字号=选项/说明带节拍 10-13px（132-145/169-181/216-228）； 间距=条目间 ~8-10px（145→169/181→216 带距实测）； 素材缺失=0（纯排版页）； 空态文案=非空态（内容带至 y=529）； 层级遮挡=0 处断裂； 可达性=结果面板双按钮（重测 244/完成 254 行）在滚动区内可达，热区 88rpx 档（press-feedback 绑定）； 文案=按钮文案走 t(contentPages.mbti.retake)/t(contentPages.mbti.resultClose)（mbti.vue:251/261）； 需新建=0 项

### R7-L13　legal/privacy top 帧逐轴核对
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`30c16d1babda970c`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=页头标题墨带 y=108-129px、正文首带 y=168px（状态栏带 y=0-30px 之下，仅一张标题脸=同文卡片头不渲染 LegalTextPage.vue:106）； 尺寸比例=正文墨迹右缘 x=362px ⇒ 右页边距 16px=32rpx（探针 y=300 取样）； 颜色token=页面底取样 #EEF7F2 = var(--c-bg-page)（LegalTextPage.vue:284，全帧占位 64.2%）； 圆角=0 个卡片容器（均色带扫描仅页面底色带，纯文本页）； 字号=正文行墨带节拍 9-13px（带 202-215/224-237/246-260），对应 --fs-md 28rpx 行高 1.75（LegalTextPage.vue:378/382）； 间距=段间空白带 261-311=50px≈100rpx（行扫描实测）； 素材缺失=0（模板无 image 诉求，纯文本页 legal/privacy/index.vue 全文 20 行）； 空态文案=非空态：正文墨带 y=168-435px 连续（后端 CMS 正文已渲染）； 层级遮挡=0 处墨带断裂（内容带连续无浮层压字）； 可达性=页面滚动真实生效（bottom 帧墨带起始 y=161 与本帧 y=168 带序不同）； 文案=页头标题走 i18n legal.privacyPolicy.title（LegalTextPage.vue:298 --fs-2xl 档）； 需新建=0 项（共用组件已实现，本页仅声明类型 privacy/index.vue:15）

### R7-L13　legal/privacy bottom 帧逐轴核对
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`831a0b89e86413ae`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=底部「我已阅读」CTA 带 y=724-781px（视口 814px，距底 33px≈66rpx 安全区内 LegalTextPage.vue:262）； 尺寸比例=CTA 带高 57px≈114rpx、横向满宽收边（724-781 均色带扫描）； 颜色token=CTA 深绿取样 #36C99A = var(--c-brand)（全帧 4.0% 像素）、按钮浅绿底 #E4F8F2（LegalTextPage.vue:360 按钮 background 档）； 圆角=CTA 两端收边为胶囊档（.legal-footer__btn LegalTextPage.vue:395，带两端 15px 内收渐变）； 字号=正文带节拍 9-13px 与 top 帧一致（161-174/184-196/205-217）； 间距=末正文带 717→CTA 顶 724 间 7px、CTA 底 781→屏底 814=33px； 素材缺失=0（纯文本页无图）； 空态文案=非空态（正文带至 y=717 仍有墨迹）； 层级遮挡=0 处断裂（CTA 未压正文带）； 可达性=CTA 完整在屏内（724-781 未与 home 指示器带 799-813 重叠）； 文案=CTA 文本走 t(legal.privacyPolicy.accept)（LegalTextPage.vue:269 legal-footer__btn-text）； 需新建=0 项

### R7-L13　legal/agreement top 帧逐轴核对
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`e0596fc6b79e59f2`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=页头标题墨带 y=108-129px、正文首带 y=168px（与 privacy top 同构，共用 LegalTextPage）； 尺寸比例=正文墨带右缘约 x=362px ⇒ 页边距 16px=32rpx（带 290-303/312-325 取样）； 颜色token=页面底 #EEF7F2 = var(--c-bg-page)（LegalTextPage.vue:284，占位 63.4%）； 圆角=0 个卡片容器（纯文本帧）； 字号=正文行墨带节拍 9-13px（202-215/224-237/246-259），--fs-md 28rpx 行高 1.75（LegalTextPage.vue:378/382）； 间距=段间空白带 130-167=38px≈76rpx、239-289=50px≈100rpx； 素材缺失=0（纯文本页）； 空态文案=非空态（正文带 168-434 连续）； 层级遮挡=0 处断裂； 可达性=滚动生效（bottom 帧带序 141-152/161-174 与本帧 168-176/202-215 不同）； 文案=页头标题走 i18n legal.userAgreement.title（LegalTextPage.vue:298）； 需新建=0 项（agreement/index.vue 仅声明类型，20 行）

### R7-L13　legal/agreement bottom 帧逐轴核对
- 帧：`tmp/qa/frames/R7/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`89323754a7500ac2`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=底部「我已阅读」CTA 带 y=724-781px（距底 33px≈66rpx LegalTextPage.vue:262）； 尺寸比例=CTA 带高 57px≈114rpx 满宽收边； 颜色token=CTA 深绿 #36C99A = var(--c-brand)（4.0% 像素）、浅绿底 #E2F8F1（LegalTextPage.vue:360）； 圆角=胶囊档收边（.legal-footer__btn LegalTextPage.vue:395）； 字号=正文带节拍 9-13px（141-152/161-174/182-195）； 间距=末带 717→CTA 724 间 7px、CTA 底 781→屏底 814=33px； 素材缺失=0； 空态文案=非空态（正文带至 y=717）； 层级遮挡=0 处断裂； 可达性=CTA 完整在屏内（未与 799-813 home 指示器带重叠）； 文案=CTA 走 t(legal.userAgreement.accept)（LegalTextPage.vue:269）； 需新建=0 项

