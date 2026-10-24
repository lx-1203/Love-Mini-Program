# R15 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=210　涉及页面=68　涉及帧=136　泳道卡=14　段内继承哈希=45（同段第二条起未重复抄录，非逐条见证）
- 严重度分布：P2=136　P3=62　P1=11　P0=1
- 轴分布：颜色token=41　字号=29　可达性=28　文案=26　间距=24　尺寸比例=14　位置=14　素材缺失=9　圆角=9　空态文案=8　层级遮挡=5　需新建=3
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0
- 批次归属：210 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/discover/index（2 条）

### R15-L01-D12　P2 / 素材缺失　批次 R15-B20
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__discover__index__top.png`（sha16=`1a68fd803e0d7a0b`）
- 源码证据：`apps/client/src/pages/discover/index.vue:272`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 右上角筛选钮（上宽下窄的漏斗轮廓 + 3 粒圆点，约 44×44px）
- 现象：帧右上 72rpx 白圆钮内渲染的是 8 齿齿轮（外圈 8 个凸齿 + 中心圆孔，读作「设置」），理想图同一坐标是漏斗筛选图标；`IMAGE_PATHS.ICONS_V2.SLIDERS` 落盘的那枚资源与理想图不同族，入口语义从「筛选」变成了「设置」。
- 建议改法：把 :272 的图标换成理想图的漏斗 SVG（同目录补 filters/funnel 资源并注册进 IMAGE_PATHS.ICONS_V2），或复用仓内既有筛选漏斗图标，不再挂 SLIDERS。
- 修复类别：单页

### R15-L01-D13　P2 / 尺寸比例　批次 R15-B20
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__discover__index__bottom.png`（sha16=`e0831c3970b63b9d`）
- 源码证据：`apps/client/src/pages/discover/index.vue:617`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片区（实测 796×969px，高宽比 1.22）+ 规范 §3.3「全屏卡片 375×约 600」
- 现象：帧上卡片 x=16..362（346px 宽）、y=165..500（335px 高），高宽比 0.97；理想图同卡 796×969 ⇒ 1.22，规范写「375×约 600」⇒ 1.6。卡片被压矮约 20%（比理想图少 ≈75px 高），照片区从竖构图变近方形，姓名/学校/标签/签名四层几乎贴到卡底。
- 建议改法：把 :617 的 height 计算里固定扣减项按实测收紧（-170rpx 页头 / -206rpx dock / -64rpx 配额共 440rpx），或给 `.match-card-area` 加 `min-height: 880rpx`，把高宽比拉回 ≥1.2。
- 修复类别：CSS/token

## pages/home/index（4 条）

### R15-L01-D14　P1 / 素材缺失　批次 R15-B08
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__home__index__top.png`（sha16=`3e93b85e568ce831`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:123`
- 理想图依据：素材/理想效果图/首页.png 今日推荐卡右栏（星座行下方横排 4 张 80×80 缩略图）+ 规范 §3.2「距离/认证/星座 + 4 张缩略图 + 看看TA/喜欢」
- 现象：帧上「今日推荐」卡右栏顺序是 name→meta→tags→bio（2 行）→「白羊座」→ 看看TA/喜欢，:123 的 distance 行之后直接跳到 :127 的 actions，模板内没有任何缩略图容器/循环，理想图与规范 §3.2 都要求的 4 张 80×80 缩略图整块缺席（不是 404，而是从未渲染）。
- 建议改法：在 :123 与 :127 之间补 `.today-card__gallery`（4 枚 80rpx 方图、gap 12rpx、圆角 --r-lg），数据取 item.photos 切片；无图时整行不占位。
- 修复类别：需新建目标功能

### R15-L01-D15　P2 / 尺寸比例　批次 R15-B07
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__home__index__top.png`（sha16=`3e93b85e568ce831`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:196`
- 理想图依据：素材/理想效果图/首页.png 今日恋爱进度四格（每格 ≈190px 宽，「回复悄悄话」单行不断行）
- 现象：4 格塞进 330px 宽卡（.love-progress__steps gap 20rpx、.love-step padding 24rpx 16rpx ⇒ 每格内容宽 ≈51px），标题 26rpx（13px）×5 字需 65px ⇒ 帧上第三格被折成「回复悄悄 / 话」两行，「待开始」被顶下一行，第三格比邻格多出约 16px 一行高、四格状态字基线全部错位。
- 建议改法：`.love-step__title` 收到 22rpx 并把 `.love-step` 横向 padding 由 16rpx 收到 8rpx（内容宽回到 61px 以上），或四格改 2×2 / 横向滚动，保证 5 字标题单行。
- 修复类别：CSS/token

### R15-L01-D16　P2 / 位置　批次 R15-B06
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__home__index__bottom.png`（sha16=`e84a8b567934d57f`）
- 源码证据：`apps/client/src/components/home/NearbyPeople.vue:255`
- 理想图依据：素材/理想效果图/首页.png 附近的人行（4 个头像 + 右侧浅绿引导卡完整可见，卡宽 ≈90px）
- 现象：`.nearby-people__bar` 120rpx（60px）宽的引导卡是 scroll-view 内最后一个 flex 子项，排在 5 枚头像之后；帧上它只剩屏幕右缘 x=362..378 的 16px 一条（绿图标与「附近」「5」被右边框裁断），卡左缘在视口外 ⇒ 60px 中 ≈44px 不可见，必须横滑才露全，而理想图同位置是完整可见的定宽卡。
- 建议改法：把引导卡移出 scroll-view、固定在该行右端（外层 flex：scroll-view flex:1 + 卡 120rpx），或卡改 `position: sticky; right: 0` 常驻可见。
- 修复类别：单页

### R15-L01-D17　P2 / 字号　批次 R15-B79
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__home__index__bottom.png`（sha16=`e84a8b567934d57f`，自同段前条继承）
- 源码证据：`apps/client/src/custom-tab-bar/index.wxss:55`
- 理想图依据：素材/理想效果图/首页.png 底部 tabBar（5 个标签「首页/附近/寻觅/消息/我的」，字形高 ≈13px、两字宽 ≈26px）
- 现象：`.tab-bar__label` 写死 20rpx = 10px，帧上「匹配」两字只占 20×10px、放大 4 倍仍辨不出字形（其余「首页/附近/消息/我的」同样 10px），理想图同位置标签 ≈13px、两字宽 ≈26px，本帧比理想图小 30%。
- 建议改法：`.tab-bar__label` 提到 26rpx（13px，与 `.tab-bar__item` 的 20rpx 解耦），必要时把 tab 高度从 160rpx 加到 168rpx，保证图标+标签不互相挤压。
- 修复类别：CSS/token

## pages/login/index（4 条）

### R15-L01-D01　P2 / 字号　批次 R15-B21
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__top.png`（sha16=`06925bf6d980511f`）
- 源码证据：`apps/client/src/pages/login/index.vue:981`
- 理想图依据：素材/理想效果图/登录页面.png 插画下方居中三行文字区（「遇见同频的人 / 慢慢成为特别的人 / 校园里的每一次相遇都有美好记录」）
- 现象：规范 §3.1 明写该页「主标题两行（28px）→ 副标题（14px）」，实测 `.hero-desc` 取 40rpx（20px）、`.hero-desc--sub` 取 30rpx（帧内逐字扫描：副句 8 字占 118px ⇒ 14.75px/字 ≈ 15px，与代码 30rpx 吻合）、`.hero-desc-discover` 取 --fs-sm 22rpx（11px），三行全部低于规范档位（20/15/11 vs 28/28/14），主标题比理想图同位置小一档以上。
- 建议改法：`.hero-desc` 提到 56rpx（28px）、`.hero-desc--sub` 同步 56rpx、`.hero-desc-discover` 提到 --fs-lg（28rpx=14px），与 §3.1 档位对齐。
- 修复类别：CSS/token

### R15-L01-D02　P2 / 素材缺失　批次 R15-B21
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__top.png`（sha16=`06925bf6d980511f`，自同段前条继承）
- 源码证据：`apps/client/src/pages/login/index.vue:601`
- 理想图依据：无基准图内该件 ⇒ 依据 deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3.1「主标题两行（28px，第二行品牌绿 + 粉色小爱心）」
- 现象：规范 §3.1 要求第二行「慢慢成为特别的人」行尾带一枚粉色小爱心，帧上该行到「人」字即结束、右侧留白，模板里 `.hero-desc hero-desc--sub` 只有纯文本、没有任何爱心 image/装饰节点。
- 建议改法：在 :601 的 `.hero-desc--sub` 之后补一枚 `--c-romance-500` 爱心 SVG（走 IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED 同族资源，不新增素材）。
- 修复类别：需新建目标功能

### R15-L01-D03　P3 / 文案　批次 R15-B21
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__bottom.png`（sha16=`888ca7afd0f35925`）
- 源码证据：`apps/client/src/pages/login/index.vue:643`
- 理想图依据：素材/理想效果图/登录页面.png 第二枚白底描边按钮（画面读作「手机号登录」四字）
- 现象：帧上第二枚按钮渲染 `t('login.phoneQuickLogin')` = zh-CN.ts:2212「手机号快捷登录」（7 字），理想图为「手机号登录」（4 字），按钮内文字比理想图多出「快捷」二字、行宽与上下两枚按钮的字距节奏不齐。
- 建议改法：把 zh-CN.ts:2212 的 phoneQuickLogin 收为「手机号登录」，或本行改取已存在的 `login.phoneLogin` 键。
- 修复类别：单页

### R15-L01-D04　P3 / 圆角　批次 R15-B21
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__bottom.png`（sha16=`888ca7afd0f35925`，自同段前条继承）
- 源码证据：`apps/client/src/pages/login/index.vue:1031`
- 理想图依据：素材/理想效果图/登录页面.png 按钮区直接铺在页面底色上（无独立卡片容器）
- 现象：`.login-card` 声明了 `border-radius: var(--r-xl)`（:1031），但同一个类块内 :1030 `background: transparent`、:1032 `padding: 0`、:1034 `border: none`、:1035 `box-shadow: none` 把它的全部可见属性清零 ⇒ 该圆角声明在帧上没有任何消费者（帧上按钮区读不出任何卡片圆角/边界），属规范 §6 第 6 项同型的孤儿样式令牌债。
- 建议改法：删掉 `.login-card` 内无消费者的 border-radius 声明（连同模板上的 `login-card card-base` 类名一并收口），或按理想图真正启用卡片底与圆角。
- 修复类别：CSS/token

## pages/messages/index（4 条）

### R15-L02-D06　P2 / 颜色token　批次 R15-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__messages__index__top.png`（sha16=`1f3f83f046a4064d`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1035`
- 理想图依据：素材/理想效果图/消息.png 左栏两张快入口卡（y≈240-340）：左侧图标是**实心品牌绿图形**（心形/对话气泡）压在浅绿圆上，图形与圆底可辨
- 现象：帧上两张卡的图标块（x=24-56）取样：圆底 #D1F5E7、卡底 #E8FBF2，两者对比 ≈1.1:1；圆内的吉祥物图（36rpx）同属浅绿档，整块在帧上只剩一枚淡影，理想图同位是饱和绿图标（ΔE 级差）
- 建议改法：图标圆底改 --c-brand-100 之外的更沉一档（如 #A3EBCF）或把圆内图形换成实心 brand-600 图标，保证图形对圆底 ≥3:1
- 修复类别：CSS/token

### R15-L02-D07　P2 / 可达性　批次 R15-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__messages__index__top.png`（sha16=`1f3f83f046a4064d`，自同段前条继承）
- 源码证据：`apps/client/src/pages/messages/index.vue:1063`
- 理想图依据：素材/理想效果图/消息.png 快入口卡「去看看 / 去回复」药丸（高约 76px / 852 宽图，折算 ≈34px）；本仓最小可点件口径 88rpx=44px
- 现象：帧上「去看看」药丸 y=200-224（高 24px=48rpx）、「去回复」同高，:1063 padding:12rpx 32rpx + 22rpx 文字算出 48rpx；作为卡内唯一显式动作键低于 88rpx 口径一半（靠整卡 @tap 兜底，故记 P2）
- 建议改法：:1061-:1071 给 .quick-card__btn 加 min-height:88rpx + align-items:center，视觉高度可用负 margin 收，热区保持 88rpx
- 修复类别：CSS/token

### R15-L02-D08　P2 / 文案　批次 R15-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__messages__index__bottom.png`（sha16=`e9a4c06695db9a52`）
- 源码证据：`apps/client/src/pages/messages/index.vue:692`
- 理想图依据：素材/理想效果图/消息.png/规范 §3.6「活动推荐列表」：活动卡只有活动名 + 时间地点 + 查看详情；「有人喜欢你」属于页头快入口卡的语义，不在活动列表内
- 现象：帧上「活动推荐」第 3 张卡（y=553-628）标题是「有人喜欢你」、副标「1 人喜欢了你」，与上方两条真实活动（周末篮球友谊赛 / 骑行踏春活动）同列同版式，卡内 CTA 仍是「查看详情」；点进去落的是喜欢我的人而不是任何活动
- 建议改法：dashboard.assistant 里按 targetUrl/type 过滤掉非活动项（点赞/通知类）再进 activityRecommendations，或把该条改投页头快入口卡
- 修复类别：单页

### R15-L02-D09　P3 / 位置　批次 R15-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__messages__index__bottom.png`（sha16=`e9a4c06695db9a52`，自同段前条继承）
- 源码证据：`apps/client/src/pages/messages/index.vue:657`
- 理想图依据：素材/理想效果图/消息.png 会话列表：每行右侧时间列都对齐在同一竖线（17:32 / 16:48 / 昨天），未读角标在其下方
- 现象：帧上第 1 行「小满」右侧有 2026/09/16（墨迹 x=303-362，y=224-233），第 2 行「小新生」右侧 x=280-370、y=270-340 区间 0 个非白像素——:657 的 formatTime 在该会话 lastMessageSentAt 为空时返回空串，时间列被留空而列宽仍占位，两行右缘不齐
- 建议改法：无时间时用会话创建时间兜底，或把 .chat-item__right 在空值时不占位（宽度随内容），保证同列两行右缘一致
- 修复类别：单页

## pages/nearby/index（5 条）

### R15-L02-D01　P2 / 颜色token　批次 R15-B23
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__nearby__index__top.png`（sha16=`3eb6f1cfa9ef695d`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1729`
- 理想图依据：素材/理想效果图/附近的首页.png 五宫格（y≈200-300）：五枚入口是**各自不同色系的浅底圆角块**（绿 #E6F9F1 / 绿 #E9F9F0 / 青 #E6F6F8 / 橙 #FFF3E6 / 蓝紫 #EDF0FF），图标为同色系实心图形；规范 §3.5 同条写「快捷入口彩色浅底圆图标（绿/粉/蓝/橙/紫）」
- 现象：帧上五枚入口底板（x=35-85/96-146/157-207/218-268/279-329，y=195-245）取样全部为同一个 #F3FAF6（五条 CSS 声明 :1729-:1733 也全部写 var(--c-bg-surface,#F3FAF6)），五种语义的入口在画面上只剩同一种近白底，与理想图的五色浅底 0/5 对齐
- 建议改法：把 :1729-:1733 五条背景拆成五档浅底（如 #E8FAF3 / #FFECEF / #E8F4FF / #FFF3E0 / #EEEBFF），字形 filter 已按项分色，底板跟随同族浅档
- 修复类别：CSS/token

### R15-L02-D02　P2 / 颜色token　批次 R15-B23
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__nearby__index__top.png`（sha16=`3eb6f1cfa9ef695d`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:579`
- 理想图依据：素材/理想效果图/附近的首页.png 页头（x≈66-100，y≈100-140）：定位针为品牌绿 #36C99A 实心针；规范 §1.2 主色 --c-brand=#36C99A
- 现象：帧上标题左侧定位针（x=18-38，y=100-128）最深取样 #B3C0CC、副标题针（x=16-28，y=148-162）取样 #CCD7DC，两枚都是灰蓝档；理想图同位是 #36C99A 绿针，页头因此丢掉「定位」的品牌色信号
- 建议改法：:579/:604 的 IMAGE_PATHS.ICONS_EMOJI.LOCATION 换成品牌绿定位针素材（或按 .nearby-entry__img 的做法加 filter 烘成 #36C99A）
- 修复类别：CSS/token

### R15-L02-D03　P2 / 字号　批次 R15-B23
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__nearby__index__top.png`（sha16=`3eb6f1cfa9ef695d`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1048`
- 理想图依据：素材/理想效果图/附近的首页.png 页头标题「附近」相对屏宽占比 ≈10%（宽 852 图上约 86px），折算 378px 宽 ≈38px 字号；规范 §1.3「页面主标题 26–28px」
- 现象：标题「附近」在帧上墨迹仅 x=38-78、y=102-122（宽 40px、高 21px），对应 CSS :1048 font-size:48rpx=24px，比规范页头主标题 26–28px 低一档，视觉上被右上「发动态」胶囊（41px 高）压过，页头没有主标题量级
- 建议改法：:1048 提到 56rpx（28px）；同时把 .nearby-home__title 的 line-height 固定，避免行盒把定位针推离基线
- 修复类别：CSS/token

### R15-L02-D04　P2 / 位置　批次 R15-B17
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__nearby__index__bottom.png`（sha16=`db71adddbe27bd96`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:643`
- 理想图依据：素材/理想效果图/附近的首页.png「附近动态」卡（y≈1560-1590）：点赞心+128、评论+24 两枚计数在卡片**左下角**，时间戳在上方作者行（9分钟前 · 3km），底栏左侧没有独立时间
- 现象：帧上两条动态的互动栏（第一条 y≈205、第二条 y≈600）是「3 天前」贴左（x=27-60）+ 点赞/评论/收藏三枚图标贴右（x=300-348），即 :643 的 justify-content:space-between 把时间与计数分置两端；理想图同位计数在左下、时间不在底栏，横向落点差 ≈270px
- 建议改法：底栏改为 flex-start 排列「点赞/评论/收藏」，时间戳移到作者行右侧（与理想图同构），或给 .post-card__actions 加 margin-left:0 并去掉 space-between
- 修复类别：单页

### R15-L02-D05　P2 / 字号　批次 R15-B17
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__nearby__index__bottom.png`（sha16=`db71adddbe27bd96`，自同段前条继承）
- 源码证据：`apps/client/src/components/village/PostCard.vue:541`
- 理想图依据：素材/理想效果图/附近的首页.png 动态正文「今天在图书馆自习到傍晚的日落…」墨迹高约 34px（852 宽图），折算 378px 宽 ≈16px 字号
- 现象：帧上正文「七点到八点半这一段基本是我的泳道…」行高 21px、字面高 13px，对应 :541 font-size:var(--fs-base,28rpx)=14px，比理想图正文 16px 低一档，正文成为全卡最弱的一层
- 建议改法：:541 改 var(--fs-2xl,32rpx)=16px，行高保持 1.6；同步检查 card 内 vertical rhythm 不被撑破
- 修复类别：CSS/token

## pages/profile/index（3 条）

### R15-L02-D10　P2 / 颜色token　批次 R15-B12
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__profile__index__top.png`（sha16=`db5644e1fbd6bd38`）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:71`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 资料完整度卡（y≈340-390）：填充段是品牌绿实心、槽是浅绿，填充段一眼可读出「已走部分」；同仓 LockScreen.vue:695 的进度条按填充 #156B51 压槽 #A3EBCF=4.72:1 落地
- 现象：帧上进度条（y=236-238）填充段取样 #3ACA9C、槽取样 #E8FBF3（:71 background:#36C99A 压 :64 #E8FBF3），两者对比 ≈1.9:1，低于非文本图形 3:1 下限；「30%」数字是画面唯一读数，而条本身几乎看不出走过哪一段
- 建议改法：与 LockScreen 同档：:71 改 #156B51、:64 改 #A3EBCF（4.72:1），保持条高 10rpx 不变
- 修复类别：CSS/token

### R15-L02-D11　P2 / 文案　批次 R15-B13
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__profile__index__top.png`（sha16=`db5644e1fbd6bd38`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:73`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 头部（y≈180-270）：「21岁 · 北京大学 · 北京」+「2.3km · 在线」+ 一句签名，共三行结构化信息
- 现象：帧上姓名下方只有一行 bio「修复复验简介：第二轮 2026-10-06T23:06:22 写入」，折成两行（第二行 x=112-365 顶到屏幕右缘 13px 处），ISO 时间戳原样上屏；年龄/学校/城市/距离/在线四要素在帧上一条都没有
- 建议改法：:73 的 bio 渲染前过滤形如 20\d\d-\d\d-\d\dT 的时间戳片段，并把 age/campus/city/distance 按既有 DTO 字段补成独立信息行（理想图三行结构）
- 修复类别：单页

### R15-L02-D12　P1 / 层级遮挡　批次 R15-B01
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__profile__index__bottom.png`（sha16=`ba40603fd3f7b488`）
- 源码证据：`apps/client/src/App.vue:739`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 底部（y≈1720-1790）：最后一屏内容完整落在 tabBar 上方，卡底与 tabBar 之间有安全区；规范 §1.4 页边距/安全区不得被固定件吃掉
- 现象：帧上「推荐给好友」卡的绿色面板（y=540-652）被 tabBar（顶边实测 y=653，到 y=790）直接切断，卡内分享图标与文案只剩上半，滑到底部（本帧状态=bottom）仍不可见；页面底部安全区 .page-bottom-safe 只有 112rpx=56px，比 tabBar 实际高度（帧上 653→790=137px）少 81px
- 建议改法：本人主页底部占位改 calc(160rpx + env(safe-area-inset-bottom)) 或按 tabBar 实测高度注入变量，保证末卡可完整滚出固定栏
- 修复类别：CSS/token

## pages/register/index（4 条）

### R15-L01-D05　P2 / 间距　批次 R15-B24
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__top.png`（sha16=`148914496ff3a924`）
- 源码证据：`apps/client/src/pages/register/index.vue:944`
- 理想图依据：无基准页，依据=规范文档 §1.4「卡片内边距 --card-padding = 32rpx = 16px」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:85）
- 现象：`.card` 内边距裸写 40rpx（20px）而非 --card-padding（32rpx/16px）。帧实测：白卡左边缘 x=17px（=32rpx 页边距，正确），卡内输入条左边缘 x≈37px ⇒ 内衬实算 20px=40rpx，比规范档多 8rpx；同页 `.field` 之间的纵向节奏也因此整体外扩，六行表单在 814px 视口内被挤到需要滚动才见全。
- 建议改法：`padding: 40rpx` 改 `padding: var(--card-padding, 32rpx)`，与全站卡片内衬同档。
- 修复类别：CSS/token

### R15-L01-D06　P2 / 字号　批次 R15-B24
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__top.png`（sha16=`148914496ff3a924`，自同段前条继承）
- 源码证据：`apps/client/src/pages/register/index.vue:957`
- 理想图依据：无基准页，依据=规范文档 §1.3 字体层级表「标题 --fs-3xl/4xl = 18/20px 700 · 区块标题」
- 现象：分区标题「账号信息」「基础身份」是本页仅有的两级区块标题，`.card__cap text` 取 24rpx（12px），落在规范 §1.3 的「小字 --fs-md/base 13/12px · 标签·时间戳」档，比区块标题应取的 18px 低两档；帧上它与紧邻的字段标签 `.field__label`（var(--fs-md)=26rpx/13px）字号几乎相同，仅靠 font-weight:700 区分，两级层级读不出来。
- 建议改法：`.card__cap text` 取 `var(--fs-3xl, 36rpx)`（18px）或至少与 `.field__label` 拉开一档（28rpx 以上）。
- 修复类别：CSS/token

### R15-L01-D07　P3 / 文案　批次 R15-B24
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__bottom.png`（sha16=`fb65a7a7535a9eda`）
- 源码证据：`apps/client/src/pages/register/index.vue:774`
- 理想图依据：无基准页，依据=规范文档 §1.3「正文/动作行取档」+ §1.1 第 3 条「一令牌一值、禁止私写」的排版口径（同页动作行统一由 letter-spacing 控制字距）
- 现象：主提交钮文案硬编码为 `"注 册"`（两字之间塞了一个 ASCII 空格，加载中态同样写成 `"注 册 中"`）。同块 `.submit-btn__text` 已带 `letter-spacing: 0.8rpx`（:1236）负责字距，再手插空格等于双重加距，且与同页其余动作行（「获取验证码」「已有账号？ 去登录」）无内插空格的写法不一致。
- 建议改法：改为 `"注册"` / `"注册中"`，字距只由 letter-spacing 单点决定。
- 修复类别：单页

### R15-L01-D08　P2 / 间距　批次 R15-B24
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__bottom.png`（sha16=`fb65a7a7535a9eda`，自同段前条继承）
- 源码证据：`apps/client/src/pages/register/index.vue:1295`
- 理想图依据：无基准页，依据=规范文档 §1.4「页边距 --page-padding = 32rpx」+ 同页 `.card` 的左基准线
- 现象：`.agree { margin: 30rpx 48rpx 0 }` 左右写死 48rpx，而它正上方的白卡 `.card` 走 `var(--page-padding, 32rpx)`（:941，帧上实测卡左缘 x=17px=32rpx）。协议行因此比卡片左缘再内缩 16rpx（≈8px），帧上勾选方框明显比白卡边缘往里错开一条；上边距 30rpx 也是 --sp-* 阶梯外孤值（--sp-5=20rpx / --sp-6=24rpx，design-variables.scss:551-552）。
- 建议改法：`margin: var(--sp-6, 24rpx) var(--page-padding, 32rpx) 0`，与卡片同一条左右基线。
- 修复类别：CSS/token

## pages/register/success（3 条）

### R15-L01-D09　P2 / 间距　批次 R15-B25
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__success__top.png`（sha16=`e4af9f141ba2d8cd`）
- 源码证据：`apps/client/src/pages/register/success.vue:93`
- 理想图依据：无基准页，依据=规范文档 §1.4「页边距 --page-padding = 32rpx = 16px」
- 现象：根容器 `.reg-success` 左右内衬裸写 48rpx（24px），不是 --page-padding（32rpx）。帧实测：清单白卡左边缘落在 x=25px（378px 宽帧 ⇒ 50rpx，含卡自身描边 AA），而同帧宽下首页卡片左缘 x=17px（34rpx）、注册页白卡左缘 x=17px（33rpx）⇒ 本页比全站页边距基线多出约 16rpx，三页并排看卡宽明显窄一档。
- 建议改法：`padding: calc(...) var(--page-padding, 32rpx) calc(...)`，与 login/register/home 同一条左右基线。
- 修复类别：CSS/token

### R15-L01-D10　P2 / 可达性　批次 R15-B25
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__success__top.png`（sha16=`e4af9f141ba2d8cd`，自同段前条继承）
- 源码证据：`apps/client/src/pages/register/success.vue:76`
- 理想图依据：无基准页，依据=规范文档 §1.5 组件库清单「登录 WechatBtn/PhoneBtn」+ 同域 login/index.vue:616-624 主 CTA 的 role/aria-label/hover-class 口径
- 现象：本页唯一主操作「完善我的资料 →」的容器 `<view class="reg-success__btn" @tap="goSetupProfile">` 没有 `role="button"`、没有 `aria-label`、也没有 `hover-class`/`press-feedback`；对照同域登录页同一档主 CTA（login/index.vue:617-620 带 press-feedback + hover-class + hover-stay-time + role="button" + aria-label）。帧上按压缩放/透明度反馈缺失，读屏侧只读到一段裸文本，拿不到「这是按钮、点了去哪」。
- 建议改法：给 :76 的 view 补 `role="button" :aria-label="'完善我的资料'"` 与 `class="press-feedback" hover-class="press-feedback--active" hover-stay-time="40"`（本页 :252-259 已有这两个类，直接挂上即可）。
- 修复类别：单页

### R15-L01-D11　P2 / 颜色token　批次 R15-B25
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__success__bottom.png`（sha16=`e4af9f141ba2d8cd`）
- 源码证据：`apps/client/src/pages/register/success.vue:147`
- 理想图依据：无基准页，依据=规范文档 §1.1 色彩令牌「次级正文取 --c-text-secondary」+ §1.3 字号层级（26rpx=13px 属正文/次级文字档，需 ≥4.5:1）
- 现象：副标题两行「欢迎加入寻觅，接下来用 1 分钟 / 把资料填成一张「恋爱名片」」取 `--c-text-tertiary #6B7571` 压页面底 `--c-bg-page #EEF7F2`，实测对比度 4.38:1（L1=0.9115、L2=0.1697），落在 3:1–4.5:1 带内；帧上 13px 副标题比下方白卡内同色 tag（压白卡 4.76:1）明显更淡，两行读成水印。
- 建议改法：`.reg-success__sub-line` 改取 `--c-text-secondary`（#4A524E，压 #EEF7F2 ≈ 8.0:1），或把副标题放到白卡底上承载。
- 修复类别：CSS/token

## subpackages/campus/campus/certification（2 条）

### R15-L05-D10　P3 / 圆角　批次 R15-B26
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`08e19a93a37a45bd`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:713`
- 理想图依据：无基准页；依据=规范文档§1.4 卡片圆角 --card-radius 40rpx + 同域 post-topic.vue:835-837（R11-L05-D09 已把卡片档从 --r-xl 24rpx 收到 40rpx）
- 现象：本页全部表单卡（为什么要认证/学校名称/专业/学生证照片）圆角取 var(--r-xl)≈24rpx(12px)，帧上与同域发帖页卡（40rpx/20px）并排对比明显偏小——R11 统一卡片档时只改了 post-topic，certification 漏改，同域两页取档不一。
- 建议改法：.form-group border-radius 改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R15-L05-D11　P3 / 文案　批次 R15-B26
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`497107a9a98f53bd`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:405`
- 理想图依据：无基准页；依据=规范文档§1.1 逐元素对照还原原则 + 表单说明应指向本字段
- 现象：「学信网验证码」卡（:390）与「学信网截图」卡（:405）复用同一个 chsiHint 键，帧上两卡说明逐字相同「选填：提供学信网在线验证码或学历截图可加快审核」——验证码字段下的提示提「学历截图」，指代错位且相邻两屏复读。
- 建议改法：拆两个 i18n 键，验证码卡只述验证码、截图卡只述截图。
- 修复类别：单页

## subpackages/campus/campus/hub（2 条）

### R15-L04-D12　P1 / 颜色token　批次 R15-B27
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`34925b46fe21b6f3`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:611`
- 理想图依据：素材/理想效果图/校园圈.png 顶部横幅右侧「去认证」为实心绿胶囊 + 白字（853px 稿实测 x 656–782、y 268–323）；规范文档§1.2 正文文字对比 ≥4.5:1
- 现象：.campus-guide__btn 底色是 --c-brand-600 #2AAE83（:611），字 --c-text-inverse #FFFFFF（:617），实算 2.83:1（帧上按钮底色实测 rgb(42,174,131)）；白字压这颗绿只有 2.8:1，低于正文 4.5:1。同页「申请加入」描边钮与分段 tab 已在 R10-L04-D17 / R10-L04-D18 收到 --c-brand-800，唯独横幅这颗实心 CTA 没跟上，同页三种绿取档不一。
- 建议改法：.campus-guide__btn 底色改 var(--c-brand-800, #156B51)（白字 6.45:1），与列表 CTA、分段 tab 同档。
- 修复类别：CSS/token

### R15-L04-D13　P2 / 尺寸比例　批次 R15-B27
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`2bc9aab202b287a9`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:714`
- 理想图依据：素材/理想效果图/校园圈.png 学校卡封面：853px 稿实测 x 78–228、y 474–628（150×154px ≈ 132rpx），卡内封面与文字块等高的方形缩略图
- 现象：.campus-school-card__cover 取 160rpx×160rpx（:714-715），帧上封面实测 ≈81×80px（同济/上交两张卡同一尺寸），按 750rpx=378px 折算正好 160rpx；理想图同位置封面 150px@853 宽 = 132rpx，帧上每张卡的封面比理想图大 28rpx（14px），卡片高度随之从理想的 175rpx 抬到 202rpx，同屏可见的学校条数随之变少。
- 建议改法：封面收到 132rpx（或 128rpx 档），卡片内衬同步回到 --card-padding 32rpx。
- 修复类别：CSS/token

## subpackages/campus/campus/index（3 条）

### R15-L05-D01　P1 / 可达性　批次 R15-B28
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`eca825a9a8bce54e`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:513`
- 理想图依据：无基准页；依据=规范文档§1.2（文本令牌）+ 同域已采信口径 topic-detail.vue:463-469（R10-L05-D07 把页头白字标题改深色墨）与本页徽章 R10-L05-D17（cert-badge 白字 1.4:1 已改深墨）
- 现象：页头「北京大学」用 --c-text-inverse 白字压在 135° 绿渐变（index.vue:467 起点 $green-primary #36C99A）上，帧上实测约 2.1:1，连大字 3:1 豁免线都不到——用户读不清这页归属哪所学校；同页返回键、认证徽章、同域三页页头标题都已收深色墨，唯独校名仍是白字。
- 建议改法：.school-name 的 color 改 var(--c-text-primary)，与同域 topic-detail/post-topic/certification 页头标题同口径。
- 修复类别：单页

### R15-L05-D02　P3 / 字号　批次 R15-B28
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`eca825a9a8bce54e`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:825`
- 理想图依据：无基准页；依据=规范文档§1.3（小字档「标签·时间戳」= --fs-md/base 13/12px，极小档 10/11px 仅角标·法务）
- 现象：话题卡日期胶囊「2026/08/22」取 var(--fs-sm, 22rpx)=11px，落在时间戳应取的 12–13px 档之下；且 $text-tertiary #6B7571 压 $bg-page #EEF7F2 胶囊底约 4.3:1，双档都取低了。
- 建议改法：.topic-card__time 字号提到 var(--fs-base, 24rpx)，与全站时间戳档对齐。
- 修复类别：CSS/token

### R15-L05-D03　P2 / 位置　批次 R15-B28
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`8cb4e8e4656d0297`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:851`
- 理想图依据：无基准页；依据=组件规范（社区卡片作者行范式：头像+昵称左聚簇，见首页/圈子 feed 卡）+ 本文件 :384-387 自陈「作者名被 space-between 推到卡片水平中心」为已知症状
- 现象：帖子卡底栏 .topic-card__footer 三子项（头像/作者名/回复胶囊）space-between 平铺，帧上「远山」被推到卡片水平中心、与左侧头像脱开约 140px，作者行读成「头像…（空）…名字…（空）…12」，R10 只修了头像锚点没修名字归位。
- 建议改法：头像+作者名包一层左聚簇 view（gap 8rpx），回复胶囊单独靠右。
- 修复类别：单页

## subpackages/campus/campus/post-topic（4 条）

### R15-L05-D04　P3 / 颜色token　批次 R15-B29
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`ffee91d30f6ea98a`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:914`
- 理想图依据：无基准页；依据=规范文档§1.2（输入底 --c-bg-surface）+ 同域 certification.vue:743-744 输入框已按 R6-L06-D16 收「#F3FAF6 底 + 2rpx --c-border-default 描边」
- 现象：「话题标题」输入框 border: 2rpx solid transparent、底 $bg-page，与同域认证页输入框（浅底+可见描边）取档不一：同是白卡内输入控件，一页有框一页无框，靠色块勉强分辨。内容框（:944）同款。
- 建议改法：.title-input/.content-input 边框改 var(--c-border-default)，与 certification.vue 输入角色同口径。
- 修复类别：CSS/token

### R15-L05-D05　P3 / 间距　批次 R15-B29
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`ffee91d30f6ea98a`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:850`
- 理想图依据：无基准页；依据=规范文档§1.4 间距档位表（--sp-1~10 = 2/4/6/8/10/12/16/32/48rpx，无 14rpx 档）
- 现象：分类瓷片行/列 gap 写死 14rpx（:845 与 :850 两处），不在 --sp 档位表内，帧上瓷片横向间隙 7px，与全站 12/16rpx 档都对不上，属私设值。
- 建议改法：gap 收 var(--sp-3, 12rpx) 或 var(--sp-4, 16rpx) 档内取值。
- 修复类别：CSS/token

### R15-L05-D06　P2 / 可达性　批次 R15-B18
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`b9d3a27b3e9687b2`）
- 源码证据：`apps/client/src/components/village/TopicSelector.vue:363`
- 理想图依据：无基准页；依据=规范文档§1.2（quaternary #9AA39F 为占位档）+§1.3（10/11px 极小档仅限角标·法务）
- 现象：「暂未选择任何话题」空态提示 20rpx(10px) + --c-text-quaternary #9AA39F 压 --c-bg-secondary 浅绿底，帧上实测约 2.3:1 且字号低于正文两档，空态引导基本读不到。
- 建议改法：.topic-selector__empty-text 改 var(--fs-sm) + var(--c-text-tertiary)。
- 修复类别：CSS/token

### R15-L05-D07　P2 / 可达性　批次 R15-B18
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`b9d3a27b3e9687b2`）
- 源码证据：`apps/client/src/components/village/TopicSelector.vue:377`
- 理想图依据：无基准页；依据=全站 88rpx 热区档（同文件 R14-L05-D02 已把创建输入框 72→88rpx）
- 现象：「搜索话题」输入框 height 仍是 60rpx(30px) < 88rpx——上一轮 R14-B16 把同卡「创建新话题」输入框抬到 88rpx，搜索框漏修，同排两个输入一高一低（帧上搜索框明显矮一截），属上一轮只修一半。
- 建议改法：.topic-selector__search-input height 60rpx → 88rpx，与创建输入框同批抬齐。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（2 条）

### R15-L05-D08　P2 / 位置　批次 R15-B30
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`f55954ca5bd6ada1`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:479`
- 理想图依据：无基准页；依据=规范文档§1.4 页边距 --page-padding 32rpx + 同域 index.vue 帖子卡左右均留 24rpx 的既有画面
- 现象：.detail-body 声明 padding 24rpx，但帧上作者卡/正文卡/回复卡右缘全部顶穿屏幕右缘（左缘留白正常），日期「2026/09/26」贴死屏边、卡片右侧圆角整段不可见——内容横向溢出约一个右内衬宽，top/bottom 两帧同态。
- 建议改法：给 .detail-body 补 box-sizing: border-box（或排查其内 scroll-view 内容撑宽），恢复右侧 24rpx 留白。
- 修复类别：单页

### R15-L05-D09　P2 / 可达性　批次 R15-B30
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`71d84ea772a0dbfc`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:632`
- 理想图依据：无基准页；依据=同域 index.vue:893-899 R10-L05-D04 已裁定的同型口径（#36C99A 压 #E8FAF3 = 1.94:1 → 收 --c-brand-800 5.96:1）
- 现象：「回复」计数胶囊「0」$green-primary #36C99A 压 $green-light #E8FAF3 ≈1.94:1，帧上回复数几乎与底同色——同一条缺陷同域 index.vue 上轮已修，本页漏网。
- 建议改法：.replies-count 色改 var(--c-brand-800, #156B51)，与 index.vue 同口径。
- 修复类别：CSS/token

## subpackages/chat/chat-session/index（2 条）

### R15-L11-D07　P2 / 文案　批次 R15-B31
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`b34615087376c525`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:1986`
- 理想图依据：无基准页；依据=§3.7 聊天会话布局第一段「顶部对方头像/昵称」+ 同域 official-chat/tasks 页头恒有页名；实测页头带 x60-290/y40-100 墨迹 0 像素
- 现象：错误态页头 .chat-error-header 只渲染了一枚返回键（‹ 在 x30 附近），标题带 y40-100、x60-290 实测 0 个墨迹像素 —— 整页没有任何标题文字。撤身份带（头像/昵称/在线态）是对的，但连「聊天」这种不编造关系的页名也一起撤掉了，用户从深链落到「缺少会话标识」时，屏幕顶部是一条空白带。
- 建议改法：在 .chat-error-header 内补一枚居中 <text class="chat-error-header__title">聊天</text>（18px/--c-text-primary），只恢复中性页名，不恢复昵称/认识天数/在线态。
- 修复类别：单页

### R15-L11-D08　P2 / 颜色token　批次 R15-B31
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`054ff6333e0ef0f4`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2755`
- 理想图依据：无基准页；依据=规范文档 §1.2 主色浅档 --c-brand-100 #D1F5E7/描边档 + 控件轮廓 3:1；实测键底取样 (140,750)=(228,248,239)
- 现象：错误态底部的两枚动作键（返回 / 消息，实测 y734-776、合计 x127-252）底取 --c-bg-brand #E8FBF2，压在纯白输入条（y733 起 #FFFFFF）上实测 (228,248,239) ≈1.10:1，键形完全不可见，屏上只剩两段绿字浮在白条里；两枚键在无描边、无阴影的情况下没有可识别边界（非文本 3:1 不达）。
- 建议改法：键底改 --c-brand-100 #D1F5E7（对白 1.17:1）并补 1rpx var(--c-brand-800) 描边（5.5:1），或直接改实心 --c-brand-800 + 白字；文字色与 88rpx 热区不动。
- 修复类别：CSS/token

## subpackages/chat/official-chat/index（2 条）

### R15-L11-D09　P2 / 位置　批次 R15-B32
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`b078385c1dcfb138`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:683`
- 理想图依据：无基准页（§3 未收录该页）；依据=§3.7 聊天页头居中档 + 微信胶囊安全距；实测标题组 x94-201（组心 147.5）vs 屏宽中心 189
- 现象：页头标题组「寻觅助手」+「官方」角标实测 x94-201，组心 x147.5；屏宽 378 的中心是 x189，整组左偏 41px（82rpx）。右缘到微信胶囊（x288）空 87px，左缘到返回键只 61px —— 头部重心明显偏左。根因：.nav-bar 右侧同时留 184rpx(94px) 胶囊位（:639）和 40px 的 .nav-right，.nav-center 的 flex:1 只在 x52-244 这 192px 里居中。
- 建议改法：.nav-center 改 position:absolute;left:0;right:0;top:0;bottom:0 全宽居中（胶囊位只作用于右侧按钮的 padding），或保持 flex 但把 .nav-right 改 position:absolute;right:0。
- 修复类别：CSS/token

### R15-L11-D10　P2 / 可达性　批次 R15-B32
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`5b0f3230c578fd11`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:1113`
- 理想图依据：无基准页；依据=规范文档 §1.3 正文 28rpx 不享大字豁免 + §1.2 三级文本 #6B7571；实测占位符最暗墨 (133,748)=(144,144,144)
- 现象：输入框占位「对我说点什么吧～」实测最暗墨 (144,144,144)=#909090，压 #F5F6F8 输入底 = 2.99:1；若按 :1113 的 token #9AA39F 算只有 2.39:1。28rpx=14px 正文级不达 4.5:1，弱光下这句唯一的输入指引读不出。且实测像素是 R=G=B 的中性灰，说明 placeholder-class 没吃到 --c-text-placeholder（该 token 是绿相灰 #9AA39F）。
- 建议改法：确认 placeholder-class="input-placeholder" 在 mp-weixin 生效，并把颜色抬到 --c-text-tertiary #6B7571（对 #F5F6F8 约 4.7:1）；字号 28rpx 不动。
- 修复类别：单页

## subpackages/circles/circles/circle-home（3 条）

### R15-L04-D09　P2 / 尺寸比例　批次 R15-B33
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`b0528a4e5f6a841a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1017`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png hero 底部标签行：4 枚短标签（摄影技巧/风景拍摄/人像写真/城市漫游）同一行排布（853px 稿 y≈400–448，单行高 48px），行内无截断
- 现象：.topic-chip-row 是 `flex-wrap: wrap`（:1017）+ 单条 max-width:100%（:1031），real 档话题标题长，帧上 4 条 chips 被拆成 2 行（第 1 行基线 y≈150、第 2 行 y≈190，行距 40px≈79rpx），第 2 条「# 交换一张最近拍得最满意的…」在行末以省略号截断；理想图同位是单行 4 枚、全文可见。R13-L04-D07 补的这条 chips 行只对齐了"入口存在"，没对齐理想图"单行 4 枚"的排布。
- 建议改法：该行改单行 `flex-wrap: nowrap; overflow-x: auto`（或每条限 max-width 22% + 文案 ellipsis），保证 hero 底部只占一行、且不留半句截断。
- 修复类别：CSS/token

### R15-L04-D10　P2 / 可达性　批次 R15-B33
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`25ce0d054dba4c31`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1243`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png feed 卡右上「⋯」为独立三点菜单；按 §1.4 触控口径 88rpx 要求命中区
- 现象：每张 feed 卡右上角的「⋯」（苏奈/草莓/阿辰三张卡 y≈130/300/475 处）是 32rpx×32rpx=16px×16px 的 <image>（.feed-more:1243-1245），直接挂 @tap.stop（:633）；命中区只有 16px，远低于 88rpx=44px，点偏就冒泡成卡片的 @tap 直接进详情，与「⋯」的动作相反。
- 建议改法：给 .feed-more 外套一枚 88rpx×88rpx 的透明命中盒（图标仍 32rpx），并把 @tap.stop 移到命中盒上。
- 修复类别：CSS/token

### R15-L04-D11　P2 / 圆角　批次 R15-B33
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`25ce0d054dba4c31`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1327`
- 理想图依据：无对应元素（理想图 feed 卡为无底色分隔行）；依据=规范文档§1.4「卡片圆角 --card-radius 40rpx=20px」+ 同页 .feed-card 24rpx 取档
- 现象：底部白条「查看全部话题 ›」取 `border-radius: 16rpx`（=8px，:1327），而它正上方的 .feed-card 取 24rpx（=12px，:1171）；帧上 y≈675–705 这条白条的四角明显比上方三张 feed 卡更方，同页两套圆角档并存，二者又都低于 §1.4 的 40rpx。
- 建议改法：.topics-link 圆角改 var(--card-radius, 40rpx)，与 .feed-card 一并收档。
- 修复类别：CSS/token

## subpackages/circles/circles/index（3 条）

### R15-L03-D15　P2 / 颜色token　批次 R15-B34
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`93859223a80c3ef0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:1026`
- 理想图依据：兴趣圈列表.png 分类行——「全部」外每枚未选中分类均为可辨浅灰胶囊（理想图实测底 ≈#F5F6F6 压白页，明度差约 10 级）
- 现象：帧上未选中 chip 底色 PIL 实测 #F3FAF6(243,250,246)，页面底实测 #EEF7F2(238,247,242)，RGB 差仅 (5,3,4)≈不可辨——「摄影/旅行/音乐/运动/美食」在帧上读作裸文字，胶囊轮廓整排消失；R8-L03-D21 对此轴的既往修法参照系取错（注释按「对卡面 #FFFFFF 拉开一档」选色，而 chip 实际坐在 #EEF7F2 页面底上，浅绿叠浅绿仍无档），本轮画面未变、按同轴新缺陷计
- 建议改法：未选中底改比页面底深一档的令牌（如 brand-100 反相档或 --c-border-light #EEF2F0 加深 + 可见描边），保证对 #EEF7F2 页面底 ΔL≥8
- 修复类别：CSS/token

### R15-L03-D16　P3 / 颜色token　批次 R15-B34
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`93859223a80c3ef0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:947`
- 理想图依据：兴趣圈列表.png 页头右端放大镜 = 深墨色裸图标（无圆底、无浅化）
- 现象：帧上搜索钮放大镜实测灰档（.circles-header__search-icon color --c-text-tertiary #6B7571）且压在 64rpx 浅底圆上（:925 背景 #F3FAF6 对页面底同样不可辨），理想图为无底的深墨放大镜，色档与承托两层都不一致
- 建议改法：图标墨色升 --c-text-primary 档，去圆底或让圆底对页面底成档
- 修复类别：单页

### R15-L03-D17　P3 / 素材缺失　批次 R15-B34
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`5154ed7531844887`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:505`
- 理想图依据：兴趣圈列表.png 全列封面均为同族实拍摄影图（人像/房车/演唱会/滑板/餐食/星空，质感一致）
- 现象：帧上同列封面实测两套画风混排——摄影/旅行/音乐/运动四枚为马卡龙扁平插画（circle-cover-*.jpg，§5 本批 AI 素材），美食/游戏/阅读/宠物四枚为实拍照片（含金毛犬、机械键盘），列表内插画压照片，风格断层且与理想图全实拍族不符
- 建议改法：按理想图锚点把 4 张插画封面重制为实拍风（或反向统一其余圈为插画风并改判理想图），映射在 config/circle-covers.ts 一处换资产
- 修复类别：需新建目标功能

## subpackages/circles/circles/post-topic（3 条）

### R15-L04-D06　P2 / 颜色token　批次 R15-B35
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`2392a6f74655024d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:1048`
- 理想图依据：无基准，依据=规范文档§1.2 文本档（次文本 --c-text-secondary #4A524E / 占位 --c-text-placeholder）+ 同页 R10-L04-D09 已定的选中态实算档
- 现象：「已选：校园圈」这行字色是 $green-primary（:772 = var(--c-brand) 真值 #36C99A，design-variables.scss:15）压在 .target-name 的 $bg-page（:777 = var(--c-bg-page) #EEF7F2，:127）上，实算约 2.05:1，低于次级文字 4.5:1、也低于非文本 3:1；同页同根因的 .target-chip--active 文字已在 R10-L04-D09 收进 --c-brand-800（:1002），这条同族回显行漏改，帧上它是全页最淡的一行绿字。
- 建议改法：.target-name__text 颜色同步收成 var(--c-brand-800, #156B51)，与同页已选 chip 同档。
- 修复类别：CSS/token

### R15-L04-D07　P2 / 圆角　批次 R15-B35
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`2392a6f74655024d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:886`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx=20px」（design-variables.scss:699）+ §3.14 统一发布页卡片档
- 现象：版面上 4 张白卡（话题标题 .title-section:886、想法 .content-section:913、发布到 .target-section:955、添加图片 .images-section:1146）圆角一律 var(--r-xl, 24rpx)=12px，帧上四角圆弧实测约 12px，比 §1.4 卡片档 40rpx（20px）小 16rpx=8px；同域 topics.vue 的 .topic-card 也是 24rpx，全站发布/列表卡一起落在小一档的圆角上。
- 建议改法：四处卡片圆角统一改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R15-L04-D08　P2 / 可达性　批次 R15-B35
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`2392a6f74655024d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:987`
- 理想图依据：无基准，依据=规范文档§1.4 触控口径 88rpx（同页 .bottom-submit__btn 高 28rpx×2+30rpx 行高已 ≥88rpx）+ §1.2 次文本对比档
- 现象：「兴趣圈」这枚发布去向 chip 走 .target-chip--disabled 的 `opacity: 0.5`，字色 $text-secondary #5F6763 半透后与 $bg-page #EEF7F2 合成约 (166,174,170)，实算 ≈2.0:1；帧上这枚 chip 的字几乎读不出，且整块没有任何"为何不可选"的说明，用户只能看到一个灰掉的去向选项。
- 建议改法：禁用态改用专用底 + 不小于 4.5:1 的深墨字（不靠 opacity 整体压淡），并在 chip 下方补一句禁用原因文案。
- 修复类别：单页

## subpackages/circles/circles/topic-detail（2 条）

### R15-L04-D04　P2 / 间距　批次 R15-B36
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`5667a08a089d5990`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:536`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」
- 现象：滚动区 .detail-body 只有 `padding: var(--sp-6)`（24rpx=12px，design-variables.scss:552），帧上作者卡、正文卡、回复卡左右各离屏边约 12px，比 §1.4 页边距档少 8rpx=4px；同页页头内衬却用 var(--sp-8)（:483），同页两套横向栅格档，正文比页头更贴边。
- 建议改法：.detail-body 左右内衬改 var(--page-padding, 32rpx)，与页头、同域 topics/circle-home 收同一档。
- 修复类别：CSS/token

### R15-L04-D05　P2 / 素材缺失　批次 R15-B36
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`7991387f6cfbd5a8`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:823`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue（空态必带预设图标，:123-127 默认落 ICONS_COMMON.BOX_SVG）+ §1.5 基础 common 组件 StatusState/EmptyState 清单
- 现象：回复为空时（帧上「回复 0」卡内）只有一行居中灰字「暂无回复，快来抢沙发吧」，.replies-empty(:823-828) 仅 padding:60rpx 0 + flex 居中，模板 :372-373 也只挂一个 text —— 没有 common 空态组件那枚预设图形，空态块读起来像一句孤零零的说明文字，与同包 topics 列表尾「— 没有更多了 —」一样都缺图形层。
- 建议改法：该分支改挂 EmptyState（type 默认 box 图标）或在 .replies-empty 内补一枚 96rpx 预设 svg，再排文案。
- 修复类别：单页

## subpackages/circles/circles/topics（3 条）

### R15-L04-D01　P2 / 位置　批次 R15-B37
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`fe5f98d4f175c73e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:667`
- 理想图依据：无基准，依据=规范文档§3.11「feed 帖子卡流（头像/昵称/时间/正文/图/互动栏）」作者行起排 + 同域 circle-home 同一条帖的卡序对照
- 现象：话题卡内元素顺序为 标题(:667)→正文(:670)→图(:673)→作者行+时间沉到卡尾 footer(:687-703)；帧上「城市夜景拍摄攻略」这张卡标题顶格、作者「林晚 8-26」压在卡底分隔线下方。同一条帖在 circle-home（b0528a4e 帧）是头像+昵称+时间起排、正文在下 ⇒ 同域两页同一数据卡序上下颠倒。
- 建议改法：把 .topic-card__footer（作者+时间+回复数）整块上移到 .topic-card__title 之前，与 circle-home .feed-author 同序。
- 修复类别：单页

### R15-L04-D02　P2 / 圆角　批次 R15-B37
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`a6ec868e73fe2b4e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1095`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx=20px」（theme/design-variables.scss:699）
- 现象：三张话题卡（苏奈/草莓/阿辰）圆角实测约 12px，源码 .topic-card 取 var(--r-xl)（design-variables.scss:446 → $radius-xl 24rpx 定于 :202），比全站卡片档 --card-radius 40rpx（20px，:699）低 16rpx；同包 circle-home 的 .feed-card 也是 24rpx，两页一起偏离卡片圆角单一档。
- 建议改法：.topic-card 圆角改 var(--card-radius, 40rpx)，与 §1.4 卡片档统一。
- 修复类别：CSS/token

### R15-L04-D03　P2 / 间距　批次 R15-B37
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`a6ec868e73fe2b4e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1092`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」
- 现象：.topic-card 外边距 `margin: var(--sp-3) var(--sp-6)`（--sp-6=24rpx=12px，design-variables.scss:552），帧上三张卡左右各只缩进约 12px、卡与卡竖向只隔 6px（--sp-3=12rpx），比 §1.4 页边距 32rpx（16px）少 8rpx=4px、比区块间距 --section-gap 24rpx（12px）少 6px，整屏比同域页更"贴边"。
- 建议改法：左右外边距改 var(--page-padding, 32rpx)、竖向改 var(--section-gap, 24rpx)。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/history（2 条）

### R15-L06-D08　P2 / 圆角　批次 R15-B38
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`b2b9d54b1c5c2178`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:389`
- 理想图依据：无基准，依据=规范文档§1.4 卡片圆角 --card-radius 40rpx=20px（design-variables.scss:699）+ 同分包 segment.vue:316 / people.vue:442 / likes/index.vue:1290 同角色卡均已收口 40rpx
- 现象：顶帧统计卡（0/0/0 白卡，y≈115~195）曲率拟合半径约 12px——border-radius 取 --r-xl 24rpx（design-variables.scss:202），只有卡片档 40rpx=20px 的六成；同分包其余三页列表卡 R12/R13 已统一到 --card-radius，本页统计卡与 :438 列表卡同漏 ⇒ 同域两档圆角并存。另记：R14-L06-D07 空箱图标归色本轮帧上已见绿相灰（EmptyState.vue:210 新 filter 链），该轴不重报。
- 建议改法：:389 与 :438 的 border-radius 改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R15-L06-D09　P3 / 间距　批次 R15-B38
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`b2b9d54b1c5c2178`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:383`
- 理想图依据：无基准，依据=规范文档§1.4 卡片内边距 --card-padding 32rpx=16px（design-variables.scss:698）
- 现象：底帧统计卡数字/标签到卡片上下沿留白实测约 14px——padding 写死 28rpx 32rpx（上下 14px），不吃 --card-padding 32rpx=16px；同分包同角色卡内衬已三套裸值（segment 20rpx / people 22rpx / history 28rpx，R14-L06-D02/D05 各立各页），本页这枚是第三档、帧上首次立案。
- 建议改法：.stats-card 上下 padding 改 var(--card-padding, 32rpx)（与 :386 的 --page-padding 左右档配齐）。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/match-success（3 条）

### R15-L06-D01　P1 / 需新建　批次 R15-B11
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`089b2524b8679402`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:117`
- 理想图依据：素材/理想效果图/匹配成功页面.png 中部白卡区——「我们正在分享你们的共同点」标题 + 慢跑爱好/音乐品味/电影偏好/生活方式 4 行（行首圆角图标底衬 + 行尾「匹配度 90%/85%/80%/79%」绿字 + 进度条），约占屏高 25%
- 现象：帧上双头像（y≈240~390）与「立即聊天」钮（y≈715）之间整块空白，理想图要求的共同点卡 0 渲染——v-if="displayReasons.length > 0"（:117）在真理由为空时整卡隐藏，且 match-success.vue:232-237 裁定百分比撤除等后端真值列；用户拿不到理想图明确要求的整个匹配度模块，页面中段约 320px 空洞。
- 建议改法：登记的后端匹配度真值列（§12.3 在册缺列）就绪后按理想图重建卡；就绪前至少给空态占位（卡头标题 + 骨架行），不留整屏空洞。
- 修复类别：需新建目标功能

### R15-L06-D02　P3 / 文案　批次 R15-B11
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`089b2524b8679402`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:85`
- 理想图依据：素材/理想效果图/匹配成功页面.png 副标题区——「你和 星野 互相喜欢了彼此」
- 现象：帧上副标题渲染「你和 TA 互相喜欢上了」，句式与理想图「互相喜欢了彼此」不一致（zh-CN.ts:462 即此串）；名字槽「TA」是 R11-L06-D01 裁定的无 id 兜底（数据侧，不重报），但句式偏差属文案未对表理想图（§1.1.5 视觉元素 100% 还原口径）。
- 建议改法：zh-CN.ts:462 改「你和 {name} 互相喜欢了彼此」，en-US 同批复核。
- 修复类别：单页

### R15-L06-D03　P2 / 颜色token　批次 R15-B11
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`b1eb916cbc0664c7`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:476`
- 理想图依据：素材/理想效果图/匹配成功页面.png 底部主 CTA——绿底（#36C99A 档）白字「立即聊天」
- 现象：底帧主按钮底为 --c-brand #36C99A（:469，与理想图同档✓）但字色取 --c-brand-900 #0B4A38 深绿（:476），帧上「立即聊天」四字读作深绿压绿；理想图同区是纯白字。R11-L06-D02 为救 4.5:1 把白字换深绿，方向与理想图相悖——同判据在 EmptyState 主按钮已有第三条出口（深底 brand-800 + 白字 6.45:1）。
- 建议改法：底色降档 --c-brand-800 #156B51 + 字色 --c-neutral-0 纯白（6.45:1 达标且前景归白，与理想图白字语义一致），或按理想图维持 #36C99A 底则字色至少提到纯白并登记对比度例外。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/matching（2 条）

### R15-L05-D12　P2 / 层级遮挡　批次 R15-B10
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`c96eb28367325357`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:188`
- 理想图依据：匹配中页面.png 标题区——理想图装饰爱心全部散布画面边缘/头像轨道四周，标题行「正在寻找有缘的Ta...」上无任何粒子压字
- 现象：装饰绿心 .match-loading__deco--7 定在 top:12%/left:50%（z-index:1，标题无层叠上下文），恰落标题行正中，top 帧实测该绿心压在「适合你的 TA」字面上沿并随 ±20rpx 浮动扫字——标题是本页第一信息位，被装饰件常态遮挡。
- 建议改法：deco--7 移到标题带之外（如 top:6% 或 left 偏至 15%/85%），或给标题行立 z-index 高于装饰层。
- 修复类别：单页

### R15-L05-D13　P2 / 尺寸比例　批次 R15-B10
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`9910966f9dfb70b1`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:339`
- 理想图依据：匹配中页面.png 头像轨道区——理想图两枚头像直径约 250px@750 基准（≈250rpx），占轨道环主体，是画面第一视觉
- 现象：实际头像 168rpx+8rpx 描边（帧上实测含描边约 92px@400 宽 ≈172rpx），仅为理想档的 ~69%，轨道区整块偏小偏空，bottom 帧与理想图对比「双头像交汇」的存在感明显不足。
- 建议改法：.match-loading__avatar 宽高提到 240rpx 档，同步校核 .match-loading__avatar-area 400×240rpx 盒与轨道环 520rpx 的比例。
- 修复类别：CSS/token

## subpackages/discover-extra/home/segment（2 条）

### R15-L06-D04　P3 / 文案　批次 R15-B39
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`04973190832537de`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:135`
- 理想图依据：无基准，依据=本页 R8-L06-D10 已确立的 meta 行句式同构口径（segment.vue:123-129 注释自述「缺失时回落『附近』占位，同一列表不出现两种句式」）
- 现象：顶帧「小新生」一行（y≈437~497）meta 行整体缺席——campus 与 distance 双缺时 metaText 直接 return distance（空串），其余 8 行都是「X · 附近」或「X · 230km」句式，唯独这行只剩姓名，同列表两种行式，R8-L06-D10 的同构收口漏了双缺分支。
- 建议改法：双缺分支也回落 t("home.segmentNearby")（本页 type=online，「附近」占位口径与 :134 一致），或统一给整行留空行高。
- 修复类别：单页

### R15-L06-D05　P3 / 间距　批次 R15-B39
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`8175a57cdb0d6521`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:302`
- 理想图依据：无基准，依据=规范文档§1.4 区块间距 --section-gap 24rpx=12px（design-variables.scss:427）+ 同分包 likes/index.vue:1264 列表 gap 已吃该令牌
- 现象：底帧卡与卡之间留白实测约 8px——.segment-list gap 写死 16rpx，只有 §1.4 区块间距档 24rpx=12px 的三分之二；同分包 likes 页 .likes-list 同角色列表间距已吃 var(--section-gap)（index.vue:1264），people.vue:438 行 margin-bottom 也留 16rpx ⇒ 同分包两档、本页不吃令牌（与 R14-L06-D02 的卡内衬是两条独立留白，非重报）。
- 建议改法：.segment-list 的 gap 改 var(--section-gap, 24rpx)，people.vue:438 同批。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（5 条）

### R15-L07-D01　P2 / 字号　批次 R15-B40
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`16e33ceee65bd38a`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:553`
- 理想图依据：无基准页，依据=全站设计规范与逐页设计稿说明.md §1.3 字体层级「辅助 14px / 正文 15–16px」，说明句不得落进 10–11px 的极小档
- 现象：页头说明「谁在喜欢你，谁来看过你」帧测墨高仅 11px（y=104..114），样式为 var(--fs-sm)=22rpx=11px，比 §1.3 说明档 14px 小 3px，与 26px 标题落差过大
- 建议改法：.page-header__subtitle 字号改 var(--fs-lg, 28rpx)=14px，行高 1.5
- 修复类别：CSS/token

### R15-L07-D02　P2 / 字号　批次 R15-B40
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`16e33ceee65bd38a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:855`
- 理想图依据：无基准页，依据=§1.3「小字 13/12px 用于标签·时间戳」，时间戳不应取 10px 极小档
- 现象：列表行右侧时间「9/15」取 var(--fs-xs)=20rpx=10px，帧上墨高约 8px（x=296..314,y=262..270），比同页 14px 姓名小两档，也与 §1.3 时间戳 12–13px 档不符
- 建议改法：.list__time 改 var(--fs-md, 26rpx)=13px
- 修复类别：CSS/token

### R15-L07-D03　P3 / 尺寸比例　批次 R15-B40
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`16e33ceee65bd38a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:726`
- 理想图依据：无基准页，依据=组件规范 Tab 选中条应覆盖标签主体宽度；同页 tab 文字 14px×4 字=56px
- 现象：选中 tab 指示条固定 width:48rpx=24px（帧实测 x=46..68 共 23px、y=235..236 共 2px），而「喜欢我的」标签 4 字×14px=56px，指示条只覆盖 41%，两端各空 16px
- 建议改法：指示条宽度改为 100%，或 56px（112rpx）随标签等宽
- 修复类别：CSS/token

### R15-L07-D04　P2 / 间距　批次 R15-B40
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`16e33ceee65bd38a`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:496`
- 理想图依据：无基准页，依据=§1.4 页边距 32rpx / 区块间距 24rpx；列表尾部应有收口留白而非整屏空底
- 现象：列表唯一一行卡片底边止于 y=302，页面到视口底 814 之间 512px（1024rpx）整片空底；min-height:100vh 把容器撑满，单条数据时 63% 视口是空白，且 top/bottom 两帧同 hash 说明这 512px 滚不动
- 建议改法：容器去掉 min-height:100vh（改 min-height:auto），列表尾补 48rpx 收口，空底交页面背景自然结束
- 修复类别：CSS/token

### R15-L07-D05　P2 / 空态文案　批次 R15-B40
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`16e33ceee65bd38a`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:443`
- 理想图依据：无基准页，依据=§1.3/组件规范 StatusState 空态要求：列表结束必须有尾部说明，不能「到一条就断」
- 现象：列表 v-else 分支（:443）之后没有任何尾部节点：帧上「小满」一条结束后（y=302）直到视口底都没有一个字符，既无「没有更多了」也无「暂无更多访客」；空列表时也走同一 list 分支，用户分不清是加载完还是断了
- 建议改法：列表尾补「没有更多了」尾注（复用既有 i18n 键），空列表改走 StatusState 空态卡片
- 修复类别：单页

## subpackages/discover-extra/likes/index（3 条）

### R15-L06-D10　P2 / 圆角　批次 R15-B41
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`8a4dac74e0425d25`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1228`
- 理想图依据：无基准，依据=规范文档§1.4 卡片圆角 --card-radius 40rpx=20px + 同页 .likes-card 已在 R13-L06-D10 收口 40rpx（index.vue:1290 注释自证）
- 现象：顶帧包裹页签的白卡（y≈180~240）曲率拟合半径约 12px——.likes-tabs-card 取 --r-xl（design-variables.scss:202=24rpx），而同页下方列表卡 .likes-card 已收 --card-radius 40rpx=20px ⇒ 同页两张白卡两档圆角并存，R13 收口只改了列表卡。
- 建议改法：.likes-tabs-card 的 border-radius 改 var(--card-radius, 40rpx)，与同页 .likes-card 归一。
- 修复类别：CSS/token

### R15-L06-D11　P2 / 颜色token　批次 R15-B02
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`8a4dac74e0425d25`）
- 源码证据：`apps/client/src/components/common/BaseTabs.vue:137`
- 理想图依据：无基准，依据=规范文档§1.2 选中态前景/背景须成对可辨（徽章档独立可识别）+ 同帧未选中页签徽章对照
- 现象：顶帧选中页签「喜欢我的 1」的计数徽章底与胶囊底同为 --c-brand-800（:137 badgeColor 默认 brand[800]，:298 选中底同值）⇒ 徽章圆片在帧上完全隐形，只剩一个裸白「1」；未选中页签「我发出的喜欢 2」的徽章是深绿片压浅底、清晰成块。上一轮修得不对（不完整）：R14-B01 把选中底从 #36C99A 换到 brand-800 时只核算了文字对比（:284-296 注释），没复算同色徽章的共存撞色，把撞色从「浅底浅字 2.10:1」换成了「同底同色不可辨」。
- 建议改法：.base-tabs--pill .base-tab-item.is-active .base-tab-badge 反相（底 --c-neutral-0 + 字 --c-brand-800），或徽章默认色避开选中档。
- 修复类别：CSS/token

### R15-L06-D12　P3 / 间距　批次 R15-B41
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`2a2653cf9bed916e`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1229`
- 理想图依据：无基准，依据=规范文档§1.4 卡片内边距 --card-padding 32rpx=16px（design-variables.scss:698）
- 现象：底帧页签白卡内衬仅 var(--sp-2)=8rpx=4px（design-variables.scss:548），三枚页签胶囊上下几乎贴死白卡边缘（帧上量得约 4~5px），比 --card-padding 16px 档少 12px，白卡读成「给胶囊描了个边」而非容器卡；同页 .likes-card 内衬为 var(--sp-7) ⇒ 同页两卡两档内衬。
- 建议改法：.likes-tabs-card 的 padding 改 var(--card-padding, 32rpx)（或至少 --sp-5=20rpx 档），与 .likes-card 同档。
- 修复类别：CSS/token

## subpackages/discover-extra/nearby/people（2 条）

### R15-L06-D06　P2 / 文案　批次 R15-B42
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`00b67a09b19e1cb2`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:267`
- 理想图依据：无基准，依据=规范文档§1.3 行卡「主文字 + 辅文互补」层级 + 同域 segment 页 R14-L06-D01 已立的 metaText 判据（campus 与 name 同源时不复读）
- 现象：顶帧「中山大学」「武汉大学」「南开大学」三行（y≈100~240）姓名与其下 meta 行首段是同一串字符——「中山大学 / 中山大学 · 附近」连读两遍，meta 行 50% 内容是姓名复读，辅文只剩「· 附近」半截信息；R14-L06-D01 在 segment 页同判据已立案，people 页 metaText 同构漏网（本页帧首次立案）。
- 建议改法：metaText 中 campus 段与 displayName(name) 相同时只输出距离/占位段，与 segment.vue:130-135 同批改法。
- 修复类别：单页

### R15-L06-D07　P3 / 尺寸比例　批次 R15-B42
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`199bb60de452bbd0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:321`
- 理想图依据：无基准，依据=同分包同角色件归一（§1.1.3 一令牌一值精神）：返回白圆三页三档
- 现象：底帧左上返回白圆实测直径约 32px（::before 64rpx），同分包 segment.vue:248 同角色白圆 56rpx=28px、history.vue:331 又取 72rpx=36px——三页三档，帧间肉眼可分大小不一；热区三页均已 88rpx（R11 收口），唯独视觉圆底没归档。
- 建议改法：三页返回圆底统一取一档（建议 64rpx 或补 --c-control-back 尺寸令牌），同批收口。
- 修复类别：CSS/token

## subpackages/discover/activities/index（3 条）

### R15-L13-D05　P2 / 颜色token　批次 R15-B43
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`cdbdacf0b88c3ff5`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:818`
- 理想图依据：无基准，依据=规范§1.2 文字对比 +§1.1「绿=行动」；组件规范 .row-category-tag
- 现象：活动卡分类标签「综合」文字 `--c-brand` #36C99A 压 `--c-brand-50` #E8FAF3 底，实算 1.94:1，连非文本 3:1 下限都不到，26rpx(13px) 标签几乎读不出（R13-L13-D04 只改了字号档，未动此低对比配色）。
- 建议改法：标签文字改 --c-brand-700/--c-brand-800 深档或 --c-text-secondary，底改 --c-bg-surface。
- 修复类别：CSS/token

### R15-L13-D06　P2 / 颜色token　批次 R15-B43
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`cdbdacf0b88c3ff5`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:1192`
- 理想图依据：无基准，依据=规范§1.2 次文本对比；组件规范 .quick-filter--active
- 现象：快捷筛选选中态「全部」文字 `--c-brand-600` #2AAE83 压 `--c-brand-50` #E8FAF3 底（:1182），实算 2.59:1 <4.5:1，24rpx(12px)/700 选中态标签偏淡。
- 建议改法：选中文字提到 --c-brand-800 #156B51（同底 6.4:1），与本页其它选中态归一。
- 修复类别：CSS/token

### R15-L13-D07　P2 / 字号　批次 R15-B43
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`7b6e4f083e7a608a`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:842`
- 理想图依据：无基准，依据=规范§1.3「辅助正文 14/15px；12px 只给标签/时间戳」
- 现象：活动卡描述段（如"不计时不拉速度，走完在湖边长椅坐一会儿就散。第三次之后人比较固定…"整句）取 `--fs-base` 24rpx=12px，落在 §1.3 小字档，正文级描述偏小一档。
- 建议改法：.row-desc 提到 var(--fs-lg, 28rpx)。
- 修复类别：CSS/token

## subpackages/discover/discussions/index（2 条）

### R15-L13-D03　P2 / 字号　批次 R15-B44
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`5348471b109dbcce`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:185`
- 理想图依据：无基准，依据=规范§1.3 字阶「正文·列表主文字 --fs-xl/2xl 15/16px」
- 现象：讨论流每行主标题（列表主文字）取 `--fs-lg` 28rpx=14px，比 §1.3 列表主文档下限 15px 低一档，与同卡 18px 区块标题层级压缩。
- 建议改法：.row-title 提到 var(--fs-xl, 30rpx)。
- 修复类别：CSS/token

### R15-L13-D04　P2 / 字号　批次 R15-B44
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`4fe76ed33e32b512`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:192`
- 理想图依据：无基准，依据=规范§1.3「辅助正文 --fs-lg/xl 14/15px；12px 只给标签/时间戳」
- 现象：讨论流摘要行（如"图书馆后门、南门传达室、三食堂侧门三个点位，猫粮由社团统一采购。"整句正文）取 `--fs-base` 24rpx=12px，落在 §1.3「小字·标签/时间戳」档，承载完整句子偏小一档。
- 建议改法：.row-subtitle 提到 var(--fs-lg, 28rpx)。
- 修复类别：CSS/token

## subpackages/legal/agreement/index（2 条）

### R15-L13-D10　P3 / 字号　批次 R15-B03
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`d6975744b49a3903`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:453`
- 理想图依据：无基准，依据=规范§1.3 极小档 10/11px 只给「角标·法务脚注」；组件规范 .legal-header__fallback
- 现象：兜底披露药丸「本地兜底文本 · 非正式版本」取 `--fs-xs` 20rpx=10px（全站最小档），而该披露是 R11-L13-D19 定为 P0 的"非正式版本"状态标识，用最小字号承载关键合规信号，弱于其披露优先级。
- 建议改法：披露药丸字号提到 --fs-sm(22rpx) 或 --fs-base(24rpx)。
- 修复类别：CSS/token

### R15-L13-D11　P3 / 文案　批次 R15-B03
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`59859bb0cd019d58`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:644`
- 理想图依据：无基准，依据=同域两页取档不一（对照 BottomActionBar .bar__primary / feedback「提交」均不设字距）
- 现象：吸底 CTA「我已阅读并同意」加 `letter-spacing: 2rpx`，把 7 个 CJK 字逐字撑开；全站其它主 CTA（BottomActionBar.vue:99-101、feedback 提交）均不设字距，同档按钮字距取档不一。
- 建议改法：删除 .legal-footer__btn-text 的 letter-spacing，与全站主 CTA 归一。
- 修复类别：CSS/token

## subpackages/legal/privacy/index（2 条）

### R15-L13-D08　P3 / 间距　批次 R15-B03
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`6d5466f2a49124fa`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:415`
- 理想图依据：无基准，依据=规范§1.4 卡片内边距 --card-padding/--section-gap；组件规范 LegalTextPage .legal-header
- 现象：兜底态卡片头 `.legal-header` 只渲染一行 10px 披露药丸（无标题/版本/日期），却保留 `--sp-6`(12px) 上下对称内距 + `--sp-4` 外边距，叠加正文 16px 上内距，白卡顶部出现约 28px 空带、正文首行被推离药丸。
- 建议改法：仅含元信息（无 cardTitle）时收紧 header padding-bottom 到 --sp-2/--sp-3。
- 修复类别：CSS/token

### R15-L13-D09　P3 / 尺寸比例　批次 R15-B03
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`6dc10fbf8d7fb019`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:621`
- 理想图依据：无基准，依据=规范§1.4 组件规范；同域两页取档不一（对照 BottomActionBar.vue:96 主按钮 88rpx）
- 现象：吸底主 CTA「我已阅读并同意」高 `--btn-height-md` 96rpx=48px，而全站 BottomActionBar 主按钮高 88rpx=44px（BottomActionBar.vue:96），同档主按钮两页取高不一。
- 建议改法：.legal-footer__btn 高度对齐 88rpx（或统一 --btn-height-md=88rpx）。
- 修复类别：CSS/token

## subpackages/market/detail/index（5 条）

### R15-L14-D01　P2 / 可达性　批次 R15-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:299`
- 理想图依据：无基准页，依据=规范文档§1.2 配色表（导航图标只允许 --c-text-primary/--c-text-tertiary 等中性档，无蓝灰档）+ 同域 shop 页头箭头写法（shop/index.vue:285 已换 --c-text-primary 档描线）
- 现象：页头返回箭头仍用 `ICONS_COMMON.BACK`（common/back.png，描线 #94A3B8 档蓝灰），压在白导航条上实测核心色 (174,185,201)、最暗像素 (153,168,187) ⇒ 对白底 1.98:1（最好像素也只有 2.42:1），低于非文本控件 3:1 下限；同域 shop 在 R11-L14-D09 已把同一枚换成 `REGISTER_ICONS.BACK`（#1A1E1C，本帧实测 10.84:1），detail 这一侧漏改，且白底盘叠白导航条（--c-border-card 对白底 1.06:1）⇒ 控件外形在帧上完全不可辨，只剩一枚淡灰箭头。
- 建议改法：与 shop:285 同档换成 `IMAGE_PATHS.REGISTER_ICONS.BACK`（#1A1E1C 描线），或给 .nav-bar__back-icon 换深色描线素材；同时把 .nav-bar__back 的描边抬到 2rpx --c-neutral-500（同 shop:451 口径）。
- 修复类别：CSS/token

### R15-L14-D02　P3 / 字号　批次 R15-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:465`
- 理想图依据：无基准页，依据=规范文档§1.3 字体层级（页面主标题 26–28px/700–800，大标题 --fs-5xl 22px）+ 同域两页页标题实测档
- 现象：本页页标题「商品详情」取 `--fs-2xl`（真值 32rpx=16.1px，design-variables.scss:566），帧上墨迹实测高 14px、字宽 15.2px；同域 shop「逛逛」/wallet「我的钱包」均为 `--fs-5xl` 44rpx=22.2px/800（帧上墨迹高 20–27px，且 wallet:314 注释写明 R9-L14-D15 就是为「与 shop 同档」才提到 44rpx）⇒ 同域三页页标题两档，本页比另两页小 6px、字重 700 vs 800。
- 建议改法：`.nav-bar__title` 字号与字重对齐同域档：`font-size: var(--fs-5xl, 44rpx); font-weight: 800;`（颜色仍留 --c-text-primary）。
- 修复类别：CSS/token

### R15-L14-D03　P3 / 颜色token　批次 R15-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:424`
- 理想图依据：无基准页，依据=规范文档§1.1 原则1「主题底色统一浅绿 #EEF7F2，不得出现白/灰断层」+ §1.2 页面底色 --c-bg-page
- 现象：`.nav-bar` 铺 `--c-bg-container`（白 #FFFFFF），页身是 `--c-bg-page` #EEF7F2 ⇒ 帧上 y=88 处有一道硬台阶（实测 y=86 为 (255,255,255)、y=89 为 (234,242,238)、y=91 起 (238,247,242)），白底带高 43px（=88rpx 导航条）压在浅绿页面上；同域 shop 页头是 `background: transparent` 平铺 --c-bg-page（shop:427，R11-L14-D10 刚为「页头与页身台阶」归位过一次），wallet 是 --c-brand-800 深绿实心带 ⇒ 同域三页页头三种底色，detail 是唯一出现白断层的一页。
- 建议改法：`.nav-bar` 的 `background` 改 `var(--c-bg-page)`（与 shop 同写法），需要分隔时只留 `box-shadow` 一条 1rpx 线。
- 修复类别：CSS/token

### R15-L14-D04　P2 / 间距　批次 R15-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:540`
- 理想图依据：无基准页，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx=16px」+ 同域两页同状态卡实测内衬（shop/wallet 各 15px）
- 现象：封存卡内衬仍是 `padding: 80rpx 48rpx`（上下 40.3px、左右 24.2px），帧上实测上内衬 39px（卡顶 y=119 → 锁图标盒顶 y≈158），卡总高 231px（y=119–349）；同域 shop 已按 R11-L14-D08 收到 `var(--card-padding)`（实测上内衬 15px、卡高 128px）、wallet 是 `var(--sp-8) var(--sp-6)`（实测 15px、卡高 128px）⇒ 三页三档内衬（纵向 40.3/16.1/16.1，横向 24.2/16.1/12.1），同一状态卡在本页比另两页高一倍。上一轮那条只落了 shop 一侧（shop:762 注释自陈「detail:540 不在可写集」），detail 这一侧至今未动 ⇒ 同轴新缺陷。
- 建议改法：`.product-state--sealed` 的 `padding` 改 `var(--card-padding)`（32rpx 单值），与 shop:765 逐字同写法。
- 修复类别：CSS/token

### R15-L14-D05　P3 / 位置　批次 R15-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:422`
- 理想图依据：无基准页，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」+ 同域两页页头与卡缘同竖边的实测写法（shop:425 / wallet:273）
- 现象：`.nav-bar` 横向内缩是私有 `24rpx`（12.1px），而本页封存卡左缘走 `--page-padding` 32rpx（16.1px）⇒ 帧上实测箭头墨迹中心 x=27.5（=12.1+16.1 的盘心）、卡左缘 x=18，页头控件比自己的卡向左越出 4px，两者不成一条竖边；同域 shop（页头 padding 32rpx + 卡 --page-padding，实测盘左缘 x=16 / 卡左缘 x=17）与 wallet（R10-L14-D10 已把 --sp-4 改成 --page-padding，实测盘左缘 x=18 / 卡左缘 x=17）都已对齐，只有本页仍是两档。
- 建议改法：`.nav-bar` 的 `padding: 0 24rpx` 改 `padding: 0 var(--page-padding, 32rpx)`。
- 修复类别：CSS/token

## subpackages/market/shop/index（4 条）

### R15-L14-D06　P2 / 可达性　批次 R15-B46
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`fb921a092832f726`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:778`
- 理想图依据：无基准页，依据=规范文档§1.2 配色表（全站中性档为绿灰系 #6B7571/#9AA39F/#DDE3E0，无蓝灰 #94A3B8 这一枚）+ §1.1 原则3「一令牌一值，禁止私有色值」
- 现象：封存卡主图标 `static/assets/icons/common/lock.svg` 自带硬编码 `stroke="#94A3B8"`（蓝灰，非令牌色），再叠 `opacity: 0.55` ⇒ 帧上实测图标核心色 (192,201,214)=#C0C9D6，对白卡 1.67:1（未降透明前也只有 2.56:1），低于非文本图形 3:1 下限；这枚锁是「为什么这页是空的」唯一的图形线索。三页同一写法（shop:778 / detail:549 / wallet:403 实测图标墨迹块完全一致：40×44px、核心 #C0C9D6），本条按同域首现页记一次，不逐页重复计数。
- 建议改法：图标去 `opacity: 0.55`，并换用描线走 `--c-text-tertiary`/`--c-neutral-400` 档的锁形 SVG（对白卡 ≥3:1）；不改共享位图时可在本页用同色 SVG 覆盖。
- 修复类别：CSS/token

### R15-L14-D07　P3 / 需新建　批次 R15-B46
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`fb921a092832f726`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:384`
- 理想图依据：无基准页，依据=同域 detail 同状态卡实测出口（detail 帧 y=263–309 有一枚 57×47px 的「返回」胶囊，--c-brand-800 底白字 6.45:1）
- 现象：封存分支 `v-else` 卡内只有锁图标 + 两行文字（帧实测卡 y=131–258 内无任何可点控件），而同一封存态在 detail 卡内是「图标+标题+说明+返回钮」四件套 ⇒ 同域两页同状态，出口件数不一致；本页唯一出口是页头那枚白盘箭头（shop:271），卡内没有第二条路。
- 建议改法：与 detail:310-319 同写法在 `.shop-sealed` 内补一枚「返回」胶囊（复用 .product-state__btn 那套 --btn-height-md/--c-brand-800 档），或反向把 detail 的按钮去掉，三页取同一件套。
- 修复类别：单页

### R15-L14-D08　P3 / 空态文案　批次 R15-B46
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`fe650fbe4976ab1d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:387`
- 理想图依据：无基准页，依据=规范文档§3 全站逐页说明对空态的写法（同域其余空态如 detail「商品不存在」/EmptyState 组件均点名对象并给下一步）+ 组件规范 src/components/common/EmptyState.vue
- 现象：说明行是三页逐字共用的 `commerce.sealedDesc`「该功能暂未开放，开放时间将另行通知」（帧实测三页同一行墨迹完全重合：x=83–295、w=213px、13.1px 档）⇒ 文案不点名本页封存的是什么（商品/积分兑换），也不给任何下一步（无「开放时间」「返回」去处），用户读完后无法区分 shop/detail/wallet 三页；bottom 帧与 top 帧除状态栏时钟外像素一致（页面无第二区块），整页信息量只有这一句不指名的说明。
- 建议改法：本页改点名文案（如「礼物商城暂未开放」+ 一行「可先逛逛兴趣圈」并给出口），保留通用句作 fallback；三页各自传 `:desc` 而非共用同一 key。
- 修复类别：单页

### R15-L14-D09　P3 / 圆角　批次 R15-B46
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`fe650fbe4976ab1d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:766`
- 理想图依据：无基准页，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20px」
- 现象：封存卡圆角取 `--r-xxl`（32rpx=16.1px），帧上按左上角逐行描边拟合实测半径 16.0px（detail 14.5px、wallet 15.5px，三页同为 32rpx 档），比规范卡片圆角档 --card-radius 40rpx=20.2px 少 4.2px（约 8rpx）；同页 .shop-card 系列卡亦非 40rpx ⇒ 全站卡片圆角实际落在 32rpx 档，与 §1.4 交付口径差一档。
- 建议改法：三页封存卡统一改 `border-radius: var(--card-radius, 40rpx)`（与 §1.4 口径对齐），或在规范里把卡片圆角定档改注为 32rpx，二者取一，不要一页一值。
- 修复类别：CSS/token

## subpackages/market/wallet/index（4 条）

### R15-L14-D10　P3 / 颜色token　批次 R15-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`5db835ecb98de953`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:419`
- 理想图依据：无基准页，依据=规范文档§1.2 配色表（次文本 --c-text-secondary #4A524E / 三级 --c-text-tertiary #6B7571 各一档，同句不得两页两档）+ 同域 detail/shop 同状态说明行实测档
- 现象：封存说明行仍是 `--c-text-tertiary`，帧上实测该行最暗像素 (92,103,99)；同句同卡在 detail:564 / shop:797 已改 `--c-text-secondary`，两帧实测最暗像素 (56,64,60)/(55,64,59) ⇒ 三页里只有本页这行明显更淡（对白卡 4.76:1 vs 8.05:1，比值差 3.29）。上一轮 R11-L14-D12 的口径就是「三页两档 ⇒ 与 detail 对齐」，实际只改了 shop 一处（其注释自陈「本页/wallet 走 --c-text-tertiary」）⇒ 同轴新缺陷，上一轮修得不对（三页对齐没闭环，wallet 漏改）。另：本行行内兜底字面量仍是 `#94a3b8`（蓝灰档，非 tertiary 真值 #6B7571），与 detail:564/shop:797 的 `#4A524E` 兜底也不同档。
- 建议改法：`color` 改 `var(--c-text-secondary, #4A524E)`，与 detail:564 / shop:797 逐字同写法。
- 修复类别：CSS/token

### R15-L14-D11　P2 / 可达性　批次 R15-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`5db835ecb98de953`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:155`
- 理想图依据：无基准页，依据=规范文档§1.2（图标描线只允许中性文本档）+ 同域 shop:285 已换 #1A1E1C 档描线的实测写法
- 现象：白盘内的返回箭头仍是 `ICONS_COMMON.BACK`（#94A3B8 档蓝灰描线），帧上实测盘内箭头核心色 (167,179,196)、最暗像素 (151,166,186) ⇒ 对白盘 2.12:1（最好像素 2.48:1），低于非文本 3:1；本页 `navigationStyle: custom`（无系统返回箭头）且封存分支（:212–216）内再无其他控件，这枚盘是唯一出口——白盘本体对深绿页头 6.45:1 尚可辨，故不判 P1，但箭头字形在本页几乎看不清。R9-L14-D14 当年只把「字形 ‹ → 40rpx 素材」的尺寸档对齐了，颜色档没动 ⇒ 同轴新缺陷。与 detail 的 D01 同一根因、不同文件，分条登记便于修复泳道按文件 ownership 落地。
- 建议改法：与 shop:285 同档换 `IMAGE_PATHS.REGISTER_ICONS.BACK`（stroke #1A1E1C）。
- 修复类别：CSS/token

### R15-L14-D12　P3 / 间距　批次 R15-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`5db835ecb98de953`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:389`
- 理想图依据：无基准页，依据=规范文档§1.4 间距表（同域同状态卡顶部外边距应一档）+ 同域 detail/shop 封存卡顶距实测
- 现象：封存卡顶部外边距取 `var(--sp-10)`（48rpx=24.2px），帧上实测页头深绿带底 y=90 → 卡顶 y=115 之间空 25px；同域 detail（`margin: 60rpx`，实测导航条底 y=88 → 卡顶 y=119 = 31px）与 shop（`margin: 60rpx`，实测页头盒底 ≈y=100 → 卡顶 y=131 = 31px）都是 60rpx ⇒ 同域三页顶部外边距两档（48 vs 60rpx，差 6px），三张卡卡宽/卡高/内衬以外的落位差就出在这一档上。
- 建议改法：顶部外边距改 `60rpx`（与 detail:539 / shop:764 同值），或三页统一改走 `--section-gap` 一档。
- 修复类别：CSS/token

### R15-L14-D13　P3 / 圆角　批次 R15-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`5db835ecb98de953`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:391`
- 理想图依据：无基准页，依据=规范文档§1.4 圆角表（`--r-sm → --r-full` 只有 4/8/12/20/24/32/9999rpx 七档，无 `--r-2xl`）
- 现象：卡圆角写的是 `var(--r-2xl, 32rpx)`，但 `--r-2xl` 在 design-variables.scss 里从未注册（实盘只有 --r-xs/sm/md/lg/xl/xxl/full，见 :442–448），同页 :289 的 `var(--r-circle, 50%)` 同样未注册 ⇒ 帧上实测卡圆角 15.5px 完全靠行内 32rpx 字面量兜住，属规范§1.4 警告过的「行内过期字面量」型令牌债：清一次字面量本页圆角即掉回 0，且与 detail:541/shop:766 的 `var(--r-xxl, 32rpx)` 不是同一枚令牌名。
- 建议改法：本页两处改 `var(--r-xxl, 32rpx)`（与同域两页同名），或按 D09 一并改 `var(--card-radius, 40rpx)`；不要保留未注册令牌名。
- 修复类别：CSS/token

## subpackages/profile-extra/feedback/history（2 条）

### R15-L11-D05　P2 / 位置　批次 R15-B48
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`0003f81b8012036d`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:350`
- 理想图依据：无基准页；依据=§1.4 页面结构（空态占满内容区并居中：EmptyState.vue:165 flex:1 0 auto + justify-content:center，宿主 AppShell.vue:420-426 .shell__body 已备 flex:1）；实测空态墨迹 y233-334
- 现象：空态块（图标 y233-284 / 标题 y292-306 / 副标 y316-330，整块 y233-334）块心 y283；筛选条下缘 y172 到屏底 814 的可用内容区中心是 y493，空态整体上浮 210px，下方留白 480px（占帧高 59%）。EmptyState 的 flex:1 0 auto 在这条链上没有拿到伸展高度（R6-L05-D02 登记过的同型机制），空态被按内容高度排在筛选条下方 ⇒ 贴顶、页面下半屏全空。
- 建议改法：把 :350 的 EmptyState 包进一个 flex:1 的容器（或给 AppShell 内容槽补 height:100%），让 EmptyState.vue:165 的 flex:1 生效；筛选条与空态之间不再加定高。
- 修复类别：单页

### R15-L11-D06　P2 / 空态文案　批次 R15-B48
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`0003f81b8012036d`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:353`
- 理想图依据：无基准页；依据=组件规范 EmptyState.vue:31 actionText「传入即渲染按钮」+ 同仓 campus/campus/topic-detail.vue:327 已用该出口；实测本页空态仅两行字、无任何按钮墨迹
- 现象：空态只有标题「暂无反馈记录」和副标「提交反馈后将在此处显示」两句陈述，整块 y233-334 内没有第三块墨迹（无 actionText 按钮）；而仓内已有反馈提交页 subpackages/profile-extra/feedback/index（pages.json:309），用户在「提交反馈后将在此处显示」这句唯一的指引上读完，仍然没有任何入口去提交第一条反馈，只能靠返回键离开。
- 建议改法：给 :350 的 EmptyState 传 :action-text="t('feedback.goSubmit')"（文案如「去反馈」）并监听 @action 调 openAppPath('/subpackages/profile-extra/feedback/index')，复用组件既有的 empty-action 按钮（88rpx 热区、#156B51 底已达标）。
- 修复类别：单页

## subpackages/profile-extra/profile/album（2 条）

### R15-L10-D08　P3 / 字号　批次 R15-B49
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`bf5e28f31b11d3f1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:933`
- 理想图依据：无基准，依据=规范文档§1.3 字阶层级（区块标题 --fs-3xl/4xl＝18/20px；正文 15/16px；辅助 14/15px）
- 现象：「照片使用说明」卡标题取 --fs-xl＝30rpx＝15px（:933），卡内汇总与四条规则取 --fs-lg＝28rpx＝14px（:961），帧上标题墨迹 13px（y=456..468）、规则正文 11px（y=514..525 等四行）——标题只比正文高 1px、整卡落在正文档，没有区块标题档；R11-L10-D17 把整卡从 11px 提到 14px 已生效（帧上正文确为 11px 墨迹），本条是标题与正文仍同档的残留。
- 建议改法：`.album-rules__title` 升到 var(--fs-3xl)（18px）或 var(--fs-4xl)（20px），汇总/规则维持 28rpx，卡内三段重新分层。
- 修复类别：单页

### R15-L10-D09　P3 / 尺寸比例　批次 R15-B49
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`c497d97b8f42dd84`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:794`
- 理想图依据：无基准，依据=本组件 :789-795 自陈的「1:1 方格（padding-top 百分比）」意图 + 规范 §1.4 方格栅格
- 现象：空位格实测 x=135..242（108px）× y=113..222（110px）＝108×110，纵向比横向多 2px；行间隙 9px（222→232）而列间隙 10px（242→253）。padding-top 的 (100%-2*sp-3)/3 与 width 同基，但 2rpx 虚线边框在 border-box 下又加进高度，方格不是正方形。
- 建议改法：padding-top 里补回边框：`calc((100% - 2 * var(--sp-3)) / 3 + 4rpx)`，或直接给 .album-cell 设高（等于宽）并让虚线走 inset box-shadow，保证全六格 1:1。
- 修复类别：单页

## subpackages/profile-extra/profile/favorites（2 条）

### R15-L10-D10　P3 / 字号　批次 R15-B50
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`5032102067df1a59`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:23`
- 理想图依据：无基准，依据=同分包同角色取档：album 的页头计数 13px / --c-text-tertiary（album.vue:704-706，帧 x=228..255、墨迹 11px），计数是次级信息
- 现象：本页把计数拼进标题字符串（:23 `favoritesTitle {n}`），帧上「（0）」与「我的收藏」同为 28px/700 黑色（标题整体 x=68..234、墨迹高 27px），数据计数读成标题正文；同一分包两页同一「页头计数」角色取了 28px 标题档与 13px 三级档两档。R14-B48 修的是标题本身 15px→28px（已生效），本条是计数未从标题里拆出的另一个现象，不复用那条。
- 建议改法：标题只渲染「我的收藏」，计数拆成独立 text 走 --fs-md / --c-text-tertiary（与 .album-header__count 同档），或另取 locale 键，不在标题里拼括号计数。
- 修复类别：单页

### R15-L10-D11　P3 / 位置　批次 R15-B50
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`5032102067df1a59`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:254`
- 理想图依据：无基准，依据=本页 :245-248 自述的居中口径「空态块中心落到可用区中线 y≈454」（页头下 95..814，中心 454.5）
- 现象：空态块实测 y=386..540（心形 386..434、标题 453..464、副标题 473..485、按钮 498..540），块中心 463，比可用区中心 454.5 低 8.5px；R14-B48 的 flex 居中已生效（改前中心 y≈231），但 120rpx 图标盒内只有 49px 实墨、上下 80rpx 内衬不等分，残留向下偏置。
- 建议改法：在 `.favorites-empty-slot` 补 `padding-bottom: 17rpx`（=8.5px 补偿），或把 EmptyState 的图标盒收到与实墨同高，让整块回到 454.5。
- 修复类别：单页

## subpackages/profile-extra/profile/location（2 条）

### R15-L10-D04　P3 / 空态文案　批次 R15-B51
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`910a97306541205a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:248`
- 理想图依据：无基准，依据=规范文档§1.1 原则「同一状态一种说法」+ 本页 :57-68 的 hasAnyLocationFact 单条件（城市/校区/坐标/地址四项全空才走空态）
- 现象：同一个「无定位」条件在一屏出现三句不同标题：「暂无位置信息」墨迹 y≈166（:204 displayText）、「暂时获取不到位置」y≈205（:208-209 hint）、「尚未取得你的位置」y≈358（:248 地图占位块），前两句在信息卡、第三句在地图块；三句主语与动词都不同，用户读到三个状态。
- 建议改法：地图块标题复用信息卡主值同一句（locationPage.locationEmpty），或把地图块改成纯说明（删标题只留「定位成功后这里会显示地图」），一屏只保留一个空态标题。
- 修复类别：单页

### R15-L10-D05　P2 / 颜色token　批次 R15-B51
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`4681c42505045e3c`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:590`
- 理想图依据：无基准，依据=规范文档§1.2 边框档（--c-border-light/default/strong）+ 非文字控件 ≥3:1 的仓内口径；同页地图框 :486 用了 --c-border-card 描边
- 现象：「返回首页」白钮填充实测 (255,255,255) 压页面底 (238,247,242)，边界对比 1.09:1；:587-594 无 border、无 shadow，帧上第二颗通栏钮只剩深色文字可辨，48px 高的胶囊形状与第一颗「重新定位」的轮廓完全不对称。
- 建议改法：给 `.location-btn` 补 `border: 1rpx solid var(--c-border-default)`（或与地图框同用 --c-border-card），保留白底与 17:1 的文字对比。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（3 条）

### R15-L10-D01　P2 / 位置　批次 R15-B15
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`c627161209d82d89`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:100`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡右列——姓名墨迹起 x≈480、资料行起 x≈489、距离行起 x≈492（屏宽 682，三行同在屏左缘 33% 一列）；规范 §3.9「白卡顶部：头像 72px 浮动骑压 + 右侧三行（姓名+♀+在线胶囊 / 年龄学校城市 / 距离在线）」
- 现象：帧上姓名「小新生」墨迹 x=98..183 / y=307..319，而「资料暂未完善」x=33..106 / y=407..419、「距离待更新」x=32..94 / y=427..439——两行资料比姓名左移 65px（屏宽 378 的 17%）、并下沉 88px 落到头像正下方，身份卡右列只剩姓名一行，中间留出 y=320..406 的 87px 空带。
- 建议改法：把 `public-identity__meta-row`(:100) 与 `__distance-row`(:117) 移进 `__info` 列（姓名行 :52-72 之后），沿用 :156 的 padding-left:132rpx，三行与姓名同一条左轨，卡高同步收回 ≈88px。
- 修复类别：单页

### R15-L10-D02　P2 / 尺寸比例　批次 R15-B15
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`c627161209d82d89`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:290`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡「喜欢」胶囊 tint 区 x=817..915 / y=323..362 ＝ 98×39（屏宽 682），长宽比 2.5:1，折算 378 屏 ≈54×22
- 现象：帧上身份卡「喜欢」胶囊 tint 实测 x=290..345 / y=304..345 ＝ 56×42px，长宽比 1.33:1，宽度与理想折算件（54）接近但高度是理想件（22）的 1.9 倍；:290 的 height:88rpx 把可点热区与胶囊本体写成同一个 44px，R10-L10-D08 提高热区时把视觉件一起抬高，理想图同件只有 22px 等效高，帧上读成一枚高胖圆角块而非细胶囊。
- 建议改法：视觉胶囊回到 56~64rpx（28~32px）高、padding 0 20rpx 不动；88rpx 热区外移到一层 wrapper（min-height:88rpx 内居中），同页其他大热区也是「视觉件 + 外扩热区」双层。
- 修复类别：单页

### R15-L10-D03　P3 / 空态文案　批次 R15-B14
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`4f2d99a16b56b1a1`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:48`
- 理想图依据：素材/理想效果图/他人显示主页.png「生活瞬间」四张照片直接铺在页面底上、逐格无占位文案；规范 §1.1 同一状态一种说法
- 现象：帧上「生活瞬间」4 个 78×78px 灰格（x=26..103 / 109..185 / 192..269 / 275..352，y≈447..524）每格各居中写一遍 10px「暂无照片」，同一句空态文案在一屏同一模块内重复 4 次；四格同色同文，读成四张失败图而不是「本节暂无照片」。
- 建议改法：只在四个骨架格上保留一处文案（例如本节标题下一行「暂无照片」），其余三格留纯骨架；或把四格合成一条空态行，文案只出现一次。
- 修复类别：单页

## subpackages/profile-extra/profile/privacy（2 条）

### R15-L10-D06　P3 / 字号　批次 R15-B52
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`805da41d896cf257`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:294`
- 理想图依据：无基准，依据=同域返回字形的已落地档：location.vue:330-335 / album.vue:686-691 / favorites.vue:228-233 三页均 52rpx（本帧实测墨迹 6×9px）
- 现象：本页返回字形取 `--fs-3xl`＝36rpx＝18px（:294，兜底 40rpx 是假兜底，design-variables.scss:567 真值 36rpx），帧上深色圆底里的白 ‹ 墨迹仅 5×6px（x=28..32 / y=80..85），比同域三页的 6×9px 小一档；同一枚「唯一退出口」在四个同域页里两种字形大小。
- 建议改法：`.privacy-page__back-text` 与同域取齐 `font-size: 52rpx; font-weight: 700;`，删掉写错的 40rpx 兜底；64rpx 圆底与 88rpx 热区不动。
- 修复类别：单页

### R15-L10-D07　P2 / 可达性　批次 R15-B19
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`805da41d896cf257`）
- 源码证据：`apps/client/src/pages.json:52`
- 理想图依据：无基准，依据=规范文档§1.2 反色文字用于深色底 + 状态栏小字 ≥4.5:1；同页页头是 brand-700→brand-800 深绿渐变（privacy.vue:262）
- 现象：状态栏时间/信号/电量帧上仍是纯黑 (0,0,0)，压在页头渐变 (29,131,98)→(21,107,81) 上实算 4.47:1→3.26:1，低于 10px 状态字 4.5:1；pages.json:52 全局 `navigationBarTextStyle: "black"`，而 :237 起的 profile/privacy 路由只有 path、无 style 覆盖，深绿页头没有配白字状态栏。
- 建议改法：pages.json 给 `profile/privacy` 加 `"style": { "navigationStyle": "custom", "navigationBarTextStyle": "white" }`（或在页面 onShow 调 uni.setNavigationBarColor 设白字），与深绿页头配对。
- 修复类别：单页

## subpackages/profile-extra/profile/tasks（2 条）

### R15-L11-D01　P3 / 尺寸比例　批次 R15-B53
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`53324f44437b6960`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:688`
- 理想图依据：无基准页（§3 未收录该页）；依据=§1.5 组件库既有线稿图标档 + §1.4 图标盒/底托令牌；实测四枚图标同 40rpx 盒、墨迹 13×14 / 17×16 / 16×15 / 18×19px
- 现象：四张任务卡的图标盒同为 40rpx（实测底托 72rpx=35px，墨迹在 x34-66 内），但实心墨迹量差 2.25 倍：第 1 枚「+」13×14px（占底托 37%）、第 2 枚 17×16、第 3 枚 16×15 且是实心 tabbar 位图（框内墨迹密度 0.14，另三枚 0.04/0.09/0.11）、第 4 枚 18×19px（占 51%）；同一列四个圆角方块里的图形一大一小、一线一实，最大最小差 5px=10rpx。
- 建议改法：四枚统一成同 viewBox 边距的矢量线稿（现有 assets/svg-spec/03-icons 档），并把第 3 枚 tabbar/chat-active.png 位图换线稿；若保留现图，给每枚单独补 calc 盒（13→18px 之间归一）而不是共用 40rpx。
- 修复类别：单页

### R15-L11-D02　P3 / 颜色token　批次 R15-B53
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`53324f44437b6960`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:645`
- 理想图依据：无基准页（§3 未收录该页）；依据=§1.2 配色表浅底/描边档 #EEF2F0 / #DDE3E0 / #C2CAC6 + §1.4 卡片白底 #FFFFFF；实测轨道取样 (180,155)=(241,242,242)
- 现象：积分概览卡里的进度轨道 16rpx 取 --c-neutral-100，帧上实测 (241,242,242)=#F1F2F2 压白卡 = 1.12:1，0% 态整条轨道（y151-158，宽 x32-346）与卡面同值，只剩一条 8px 浅灰带；这是本页唯一的进度可视化件，用户在 0 进度时看不到"进度条"这个控件本身（百分比 0% 之外没有任何形状提示）。
- 建议改法：轨道改 var(--c-border-strong) #C2CAC6（对白 1.67:1）并把高度提到 20rpx；0% 时在轨道左端渲染一枚 16rpx 的品牌绿圆点，让 0% 也有可见的前景形状。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/visitors（4 条）

### R15-L09-D15　P2 / 颜色token　批次 R15-B54
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`5060249e7914bf30`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:370`
- 理想图依据：无基准；依据=§1.1 原则1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ App.vue 已定 page 底色改平面 --c-bg-page
- 现象：页面根取 --c-gradient-page（#DFF3EA→#EEF7F2）：帧上 y=40 实测 #DFF3EA(223,243,234)、y=780 才到 #EEF7F2；同一页吸顶头部（:396）却是纯 #EEF7F2，y=96–100 处出现 #EEF7F2→#E5F4ED 的横向色缝，与 settings/consulting 的纯色页底不同调。
- 建议改法：.visitors-page 的 background 改 var(--c-bg-page)，删掉渐变；头部与正文同底后色缝自然消失。
- 修复类别：CSS/token

### R15-L09-D16　P2 / 字号　批次 R15-B54
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`5060249e7914bf30`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:421`
- 理想图依据：无基准；依据=§1.3（22px 属「卡片大标题」档，页头档为 26–28px）+ 同域设置/认证页 nav 标题 16px
- 现象：标题「谁看过我」取 --fs-5xl(44rpx=22px)，帧上墨高 21px；同域 settings、verification、real-name 三个自绘 nav 页都是 16px（墨高 13–14px），本页独一档 22px，既与兄弟页不一致，又落在卡片大标题档而非页头档。
- 建议改法：与 D14 一并统一页头档（本页改同 settings 的 16px 或统一升 18px），并把 --fs-5xl 这档从页头槽撤出。
- 修复类别：CSS/token

### R15-L09-D17　P3 / 文案　批次 R15-B54
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`5060249e7914bf30`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:266`
- 理想图依据：无基准；依据=§1.5 文案一致性（同一列表全站同名）+ 设置页入口指向本页
- 现象：页面标题「谁看过我」（zh-CN.ts:1614），而设置页入口叫「访客记录」（zh-CN.ts:1526，settings/index.vue:359 的 label 直接指向本页）；同一列表两个名字，空态正文又写「暂无访客记录」，与标题不同词。
- 建议改法：统一为一个词（建议标题改「访客记录」，与设置入口、空态同词），或同时改 i18n 的 profile.visitorsTitle 与 profile.visitors。
- 修复类别：单页

### R15-L09-D18　P2 / 可达性　批次 R15-B54
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`5060249e7914bf30`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:403`
- 理想图依据：无基准；依据=§1.4 间距/热区口径（同页 .visitors-empty__btn 已按 88rpx 修，见 :546）
- 现象：返回钮 .visitors-header__back 为 64×64rpx（32×32px），小于 88rpx(44px)：帧上白色圆形返回钮直径仅 32px，比同页「编辑资料」44px 热区小 12px，且该钮无文字标签。
- 建议改法：width/height 改 88rpx（白色圆底保持，图标仍 40rpx），与同页空态按钮统一热区。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/dnd（2 条）

### R15-L11-D03　P2 / 层级遮挡　批次 R15-B55
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`0218871df13a4427`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:967`
- 理想图依据：无基准页（§3 未收录该页）；依据=§1.4 区块间距 24rpx（吸底主操作键与内容之间须留净空）+ 可点控件须完整可见；实测卡体 y682-744（62px）、保存键 y711-755
- 现象：top 帧（scroll=0）里 sticky 的保存键占 y711-755，压住最后一张「紧急消息仍会通知，避免错过重要信息」卡：该卡卡体实测 y682-744（62px，bottom 帧同卡 y625-687），首屏只露出 y682-706 的 25px（40%），卡片右侧的开关（bottom 帧实测 y638-674=37px，加 57px 滚动差即 y695-731）自 y711 起被键面盖住下半约 18px；用户首屏看到的是一行被切断的文案和半个开关。上一轮 R14-L11-D02 用 position:sticky 消掉了手势带遮挡，但同一改动把键面顶进了内容区，这一条是那次修法新引入的遮挡。
- 建议改法：给滚动内容 .content 补 padding-bottom: calc(保存键实测高 88rpx + 底部吸底净空 48rpx)，让 sticky 键在任何滚动位置都只压在净空里；不改键本身的位置与 z-index。
- 修复类别：单页

### R15-L11-D04　P2 / 颜色token　批次 R15-B55
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`4969d7fad51061af`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:873`
- 理想图依据：无基准页；依据=规范文档 §1.2 描边三档 --c-border-light/default/strong + 非文本控件轮廓 3:1；实测圆环描边取样 (333,330)=(222,225,224)
- 现象：「重复方式」四行里三枚未选中单选圆环（36rpx=18px、2rpx 描边，帧上实测外径 x331-350/y326-344）取 --c-border-strong #C2CAC6，对白卡只有 1.67:1，1px 描边再被抗锯齿摊薄，实测最暗像素 (222,225,224)=#DEE1E0 ≈1.34:1 —— 四个选项里只有「自定义」那一枚（--c-brand 实心）看得出是可选项，每天/工作日/周末三行右侧等于空白，用户读不出这三行是单选控件。
- 建议改法：未选中圆环描边改 --c-text-tertiary #6B7571（对白 4.76:1），选中态维持 --c-brand 实心不动。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/index（5 条）

### R15-L09-D04　P2 / 素材缺失　批次 R15-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`99ab4b4a096d1c95`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:321`
- 理想图依据：无基准；依据=components/common 图标语义一一对应约定（§1.5 组件清单：菜单行图标应按行语义取图）+ 同页其它行各自不同图标
- 现象：「编辑资料」与「时间安排」两行都用 IMAGE_PATHS.ICONS_PROFILE.SETTINGS（:321 与 :362），帧上「账号管理·编辑资料」与「社交资产·时间安排」两枚 32×32px 底座里的图标形状完全相同（同一齿轮/太阳字形），与「编辑」「日程」语义都不符；同文件「隐私权限设置」(:370) 又复用第三枚。
- 建议改法：补 pencil / calendar 两枚 ICONS_PROFILE 图标并分别用于 :321/:362，隐私权限设置换 shield；缺图登记素材车道，勿继续借用 SETTINGS。
- 修复类别：需新建目标功能

### R15-L09-D05　P2 / 可达性　批次 R15-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`99ab4b4a096d1c95`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:746`
- 理想图依据：无基准；依据=§1.4 间距（--sp-* 以 88rpx 为热区口径，同仓 .consult-sealed__action/.visitors-empty__btn 均已 min-height:88rpx）
- 现象：返回钮 .nav-bar__back 实测 64×64rpx（32×32px），小于 88rpx(44px) 热区；帧上只有一枚 5×10px 的「‹」墨迹（x=30–34/y=65–74），右侧胶囊之外没有第二个可视化返回入口。
- 建议改法：.nav-bar__back 的 width/height 改 88rpx（‹ 图标仍 56rpx），88rpx 导航条仍装得下；同分包 verification/real-name 一并改。
- 修复类别：CSS/token

### R15-L09-D06　P2 / 素材缺失　批次 R15-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`9a68dbcf8bd3d673`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:395`
- 理想图依据：无基准；依据=§1.5 组件/图标语义约定 + 同页社交分组已有专用图标（POSTS/VISITORS）
- 现象：「用户协议」直接复用「我的动态」的 POSTS 图标（:395 vs :353），「隐私政策」复用「访客记录」的 VISITORS 眼睛图标（:401 vs :359）；帧上关于分组第一行仍是社交分组那枚波形图标、第二行仍是眼睛图标，法律文本入口没有任何文档/盾牌语义。
- 建议改法：关于分组补 doc / shield / refresh / info 四枚语义图标（可沿用 ICONS_PROFILE 体系新增），不再借用社交分组图标。
- 修复类别：需新建目标功能

### R15-L09-D07　P2 / 颜色token　批次 R15-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`9a68dbcf8bd3d673`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:396`
- 理想图依据：无基准；依据=§1.2 色表（--c-bg-page #EEF7F2 用作页面底、卡片用 #FFFFFF）+ 同页其它分组图标底座 #FFF8E7/#EDE9FE/#FFF0F5
- 现象：关于分组四项的图标底座用 var(--c-bg-page) #EEF7F2，压在 #FFFFFF 卡上对比仅 1.09:1（帧上取色 #EEF7F2 vs #FFFFFF）；上方「存储管理」底座为 #EDE9FE、「隐私安全」为 #EDE9FE/#F3E8FF，到关于分组突然断成近乎无底，四枚图标像裸图标。
- 建议改法：bgColor 换与分组语义匹配的浅色令牌（如 --c-lavender-100/#EDE9FE 或 --c-tint-cream-50/#FFF8E7），至少与白卡保持可见边界。
- 修复类别：CSS/token

### R15-L09-D08　P2 / 颜色token　批次 R15-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`9a68dbcf8bd3d673`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:926`
- 理想图依据：无基准；依据=§1.2 错误色 --c-error #E5454D + WCAG 正文 4.5:1（同页次级文字已按 4.5:1 调过，见 :896-898）
- 现象：「退出登录」文字 --c-error #E5454D 压白卡，帧上墨色实测 #E54A52(229,74,82)，对比 3.97:1（字号 15px/字重 500），低于 4.5:1；同页箭头文字已刻意调到 4.76:1，唯独这枚危险操作文字反而更浅。
- 建议改法：退出登录文字改更深一档红（同底 ≥4.5:1，如 #C0392B 或新增 --c-error-700），保持危险色语义。
- 修复类别：CSS/token

## subpackages/profile-extra/verification/index（3 条）

### R15-L09-D09　P2 / 颜色token　批次 R15-B57
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`848081a9fb83c009`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:121`
- 理想图依据：无基准；依据=§1.2 色表（兴趣紫 --c-purple #A29BFE 用于未认证）+ 正文/标题 4.5:1
- 现象：未认证状态卡标题取 --c-lavender-500 #8B5CF6，压 #F5F3FF 卡底；帧上墨色实测 #9063F6(144,99,246)，对比 3.6:1（令牌值计算 3.86:1），18px/700 的页面主状态词低于 4.5:1。
- 建议改法：标题色换更深一档紫（同底 ≥4.5:1，如 #6D3FE0 或新增 --c-lavender-700），卡底与图标不动。
- 修复类别：CSS/token

### R15-L09-D10　P3 / 颜色token　批次 R15-B57
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`848081a9fb83c009`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:557`
- 理想图依据：无基准；依据=§1.2 警告色 --c-warning #F59E0B（待审核/警告）+ 门控横幅底 #FFF8E1
- 现象：门控横幅的警示三角用 warning.svg 资产原色 #94A3B8（帧上描边实测 #99A8BA），压 #FFF8E1 底对比约 2.4:1，同横幅文字已是 #1A1E1C，图标却仍是冷灰、与 #F59E0B 警告色不同相。
- 建议改法：新增 #F59E0B stroke 的 warning-amber.svg（资产车道三树同步）替换 :557 的 src，或在图标外加琥珀色底/描边，不改文字。
- 修复类别：需新建目标功能

### R15-L09-D11　P0 / 可达性　批次 R15-B57
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`848081a9fb83c009`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:761`
- 理想图依据：无基准；依据=§1.3 正文层级 + 本页模板自身结构（认证流程之后是「填写认证信息」表单、上传学生证与唯一提交按钮）
- 现象：bottom 帧与 top 帧 sha16 同为 848081a9、逐像素零位移；帧底 y=790–812 只到「认证通过」步骤标题与半行描述，其后的「填写认证信息」表单（:656）、上传学生证（:713）与唯一提交按钮（:761「提交认证申请」）在两帧中均未出现 ⇒ 未认证用户的主操作不可见、不可达。
- 建议改法：先修取景/滚动：确认 .verification-page（min-height:100%）在 mp 下可滚，必要时改 min-height:100vh 或把正文包进 scroll-view；再重拍 bottom 帧，要求露出提交按钮。
- 修复类别：单页

## subpackages/profile-extra/verification/real-name（3 条）

### R15-L09-D12　P2 / 文案　批次 R15-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`65398203be5b43e8`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:490`
- 理想图依据：无基准；依据=§1.5 组件/文案一致性（同一动作在全站应同名）+ 本页状态卡说明
- 现象：已实名卡正文写「可进行校园认证（学历认证）」（zh-CN.ts:3444），按钮却写「恋爱认证」（t('verification.navTitle')，zh-CN.ts:3380），目标页正文又称「校园身份认证」——帧上按钮文案「恋爱认证」与上方说明不是同一个词，同一动作三处三个名字。
- 建议改法：按钮文案改「去校园认证」（新增 i18n 键）并与状态卡说明、目标页导航统一为「校园认证」；不要复用 verification.navTitle。
- 修复类别：单页

### R15-L09-D13　P3 / 颜色token　批次 R15-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`65398203be5b43e8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:100`
- 理想图依据：无基准；依据=§1.2 卡片 #FFFFFF / 品牌浅底 #D1F5E7 + 同域 verification 未认证卡 #F5F3FF 的块感
- 现象：已实名状态卡底取 --c-brand-50 #E8FAF3，压在同为浅绿的页底渐变（#EEF7F2→#E8FAF3）上：帧上卡内实测 #E8FAF3(232,250,243)、卡外 #EEF7F2(238,247,242)，对比 1.01:1，卡边界只剩 4rpx 阴影，几乎与页底同块。
- 建议改法：状态卡底换可区分色（--c-brand-100 #D1F5E7 或白底 + 1rpx 描边），与页底至少 1.3:1，仍保持绿色成功语义。
- 修复类别：CSS/token

### R15-L09-D14　P3 / 字号　批次 R15-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`be2235eb9084d48d`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:680`
- 理想图依据：无基准；依据=§1.3 页头主标题 26–28px 档（AppShell .shell__title 取 28px）
- 现象：导航标题「实名认证」取 --fs-2xl(32rpx=16px)，帧上墨高 14px（y=61–73）；同域「谁看过我」取 --fs-5xl(44rpx=22px)、墨高 21px，consulting 走 AppShell 的页头 28px——同一页头槽三档并存，本页 16px 比规范页头下限还低 10px。
- 建议改法：本组四个自绘 nav 页统一页头档（建议 28px；若要维持 88rpx 导航条则统一 18px 并同步 AppShell），先消除 16/22/28 三档。
- 修复类别：CSS/token

## subpackages/setup/campus/index（3 条）

### R15-L12-D05　P1 / 可达性　批次 R15-B59
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`8ba36dab6d48b951`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:456`
- 理想图依据：无基准；依据=规范 §1.2 品牌色分档（brand-700 #1F8D6A / brand-800 #156B51）+ 正文 4.5:1 下限
- 现象：跳过入口「非学生？跳过此步，稍后认证」13px、色 --c-brand-700 #1F8D6A，帧上最深墨 #2C9372 压页面底 #EEF7F2 实测 3.48:1（<4.5:1），而它是非学生用户在本页唯一出口（主按钮三项未选不可用）
- 建议改法：色改 --c-brand-800 #156B51（对 #EEF7F2 5.9:1），字号/下划线/88rpx 热区不动
- 修复类别：CSS/token

### R15-L12-D06　P2 / 颜色token　批次 R15-B59
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`8ba36dab6d48b951`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:436`
- 理想图依据：无基准；依据=规范 §1.2「次文本 --c-text-secondary #4A524E」，说明文字不得落在 3:1–4.5:1 区间
- 现象：价值提示卡正文 24rpx=12px、色 --c-brand-700 #1F8D6A 压 --c-bg-brand #E8FAF3，帧上最深墨 #2C9372 实算 3.51:1，低于正文 4.5:1，也低于同屏其他说明文字（#4A524E 对白 7.9:1）
- 建议改法：色改 --c-brand-800 #156B51（对 #E8FAF3 6.4:1）或 --c-text-secondary，#E8FAF3 底与边框保留
- 修复类别：CSS/token

### R15-L12-D07　P2 / 层级遮挡　批次 R15-B09
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`ad1318d631a1ade0`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:344`
- 理想图依据：无基准；依据=规范 §1.4 区块间距 + 组件规范 SetupProgress 头部两行（第 n/5 步 12px + 步骤名 13px）必须完整可读
- 现象：top 帧进度卡头部「第 2/5 步」是一整行 12px 墨迹，bottom 帧（页面只多滚约 10px）该行只剩 y=173-174 两行像素（≈20%），被吸顶页头的不透明底 --c-bg-page 遮住，下方步骤名随之贴到页头底缘
- 建议改法：给 is-fixed 页头补与自身高度等值的 scroll-padding-top，或在 SetupProgress 外套一个 top 补偿（min-height 撑住首屏），使吸顶条底缘不落在进度卡首行上
- 修复类别：单页

## subpackages/setup/interest/index（2 条）

### R15-L12-D13　P2 / 空态文案　批次 R15-B16
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`8eb7e22a1c3d61b0`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:314`
- 理想图依据：无基准；依据=规范 §1.2 三级文本 #6B7571 / 次文本 #4A524E，空态提示不得低于 3:1
- 现象：空选区提示「暂未选择任何标签」font-size --fs-xs（20rpx=10px）、color --c-text-quaternary #9AA39F 压 --c-bg-secondary #D1F5E7，帧上最深墨 #9BA4A0 实测 2.2:1（<3:1）；它是空选区唯一文案，同一行「已选 0/5」也只有 10px
- 建议改法：改 `font-size: var(--fs-sm)` + `color: var(--c-text-secondary)`（对 #D1F5E7 6.9:1），「已选 N/5」同步升档
- 修复类别：CSS/token

### R15-L12-D14　P2 / 字号　批次 R15-B60
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`8eb7e22a1c3d61b0`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:212`
- 理想图依据：无基准；依据=规范 §1.3「页面主标题 26–28px」+ AppShell 页头令牌 --fs-7xl 56rpx（campus/schedule/recommend 三帧墨高均 27px）
- 现象：页头「选择兴趣」44rpx=22px，帧上墨高 20px；同流程 campus「校园认证」、schedule「时间安排」、recommend「推荐偏好」都走 AppShell --fs-7xl 56rpx，帧上墨高 27px ⇒ 本页页头比另三页矮一档，落在 §1.3 的 22px 大标题档
- 建议改法：改 `font-size: var(--fs-7xl, 56rpx)`（与另三页同令牌），副标题档不动
- 修复类别：CSS/token

## subpackages/setup/profile/index（4 条）

### R15-L12-D01　P2 / 间距　批次 R15-B61
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`74a1b13edafed44d`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1274`
- 理想图依据：无基准；依据=规范 §1.4「页边距 --page-padding 32rpx = 16px」，并量同流程 campus 卡左缘为参照
- 现象：表单白卡左右外边距写死 40rpx（=20px），帧上卡左缘 x=21px、右缘 x=356px；同流程 campus 卡左缘 x=18px（32rpx+2rpx 描边），本页卡比全站页边距多缩进 8rpx，且与 hero 标题左缘 x=25px 不同轴
- 建议改法：把 `margin: -64rpx 40rpx 0` 改为 `-64rpx var(--page-padding, 32rpx) 0`，卡宽与 campus/recommend 同步
- 修复类别：单页

### R15-L12-D02　P3 / 字号　批次 R15-B61
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`74a1b13edafed44d`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1249`
- 理想图依据：无基准；依据=规范 §1.3「极小档 --fs-xs/sm = 10/11px（20/22rpx）」字级表
- 现象：hero 眉标「XUNMI · CAMPUS」font-size 19rpx=9.5px（帧上墨高仅 7px、字距 4rpx），落在 §1.3 字级表之外（极小档 20/22rpx），比同屏最小正文 25rpx 再小一档，且是硬编码而非 --fs-* 令牌
- 建议改法：改 `font-size: var(--fs-sm, 22rpx)` 并用现有字级令牌，去掉 19rpx 字面量
- 修复类别：CSS/token

### R15-L12-D03　P2 / 尺寸比例　批次 R15-B61
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`f933b426d46df519`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1459`
- 理想图依据：无基准；依据=规范 §1.4 页边距 32rpx + 同流程 BottomActionBar 主键高度 88rpx（组件 :96）
- 现象：本页主 CTA 是卡内 .submit-btn，帧上宽 296px（x=41..336，被卡片 40rpx 外边距 + 40rpx 内边距二次缩进）且 CSS 高度写 96rpx；同流程 campus/schedule 的吸底 CTA 宽 342px（x=18..360）、高 88rpx ⇒ 同一步注册流程两套按钮几何
- 建议改法：把保存按钮移出卡体改用 BottomActionBar（88rpx 高、满 page-padding），或宽度补 `margin: 0 -40rpx`、高度改 `var(--r-lg)` 同档 88rpx
- 修复类别：单页

### R15-L12-D04　P2 / 文案　批次 R15-B61
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`f933b426d46df519`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:979`
- 理想图依据：无基准；依据=组件规范「同列字段标签一致」+本页 R11-L12-D05 已给三行补的 .field-label（11px 可见字段名）
- 现象：帧首行只有 ♡ 图标 + 「请选择」+ 右箭头，「感情状态」四个字画面上不存在（只写在 aria-label）；同屏 籍贯省份/籍贯城市/未来城市 三行都有可见字段名 —— 上一轮 R11-L12-D05 只补了那三行，同一轴（画面上无字段名）在本行未修
- 建议改法：在该 .field 上方补一行 `<text class="field-label">`（与三行同档 22rpx/#4A524E），或把占位文改成带字段名的「请选择感情状态」；文案 key 交 locale 车道
- 修复类别：单页

## subpackages/setup/recommend-pref/index（2 条）

### R15-L12-D11　P3 / 间距　批次 R15-B62
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`340cc83f15783258`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:351`
- 理想图依据：无基准；依据=规范 §1.4「卡片内边距 32rpx / 区块间距 24rpx」与同页另两卡的紧凑节奏
- 现象：「校园优先」卡高 131px（y=580..711），其中 88rpx（44px）开关行只有右端 88×48rpx 轨道（帧上 x=306..350），左端约 270px 全空 —— R6-B68/D11 删掉行内「校园优先」标签后行高与留白未回收
- 建议改法：把开关收进副标题同一行右端（卡头 flex 两端对齐），行高回到 48rpx 视觉刻度，卡高回收约 44px；整卡保持可点
- 修复类别：CSS/token

### R15-L12-D12　P3 / 文案　批次 R15-B62
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`76adabe22fde2e66`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:258`
- 理想图依据：无基准；依据=规范 §1.1「一令牌一值」同域口径 + 同流程另三步 BottomActionBar 主键文案
- 现象：主按钮文案「保存」（帧上 2 字、344px 宽居中），同流程 campus/schedule/interest 的同一组件都是「保存并继续」（5 字）；本页保存后同样进入下一步（discover），按钮承诺与另三步不一致
- 建议改法：`:primary-label` 改取 `t('setup.campus.saveLabel')`（zh-CN 已有「保存并继续」），四页统一
- 修复类别：单页

## subpackages/setup/schedule/index（3 条）

### R15-L12-D08　P2 / 位置　批次 R15-B63
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`f6d6cc7f0f864c7a`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:113`
- 理想图依据：无基准；依据=同流程组件规范 SetupProgress（profile:753 / campus:221 / recommend-pref:181 三页同一位置均挂载 5 步进度条）
- 现象：页头副标题墨迹到 y=156 结束，正文 y=187 直接起「偏好设置」卡；campus/recommend 在本页这一位置都有进度卡（campus 占 y=166..265，含 56rpx 圆点与步骤名），本页第 3/5 步无任何进度指示，用户看不出自己在流程哪一步
- 建议改法：在 AppShell 之后、.card-stack 之前插入 `<SetupProgress :current-step="3" variant="student" />`（与另三页同一个组件、同一个 variant 口径）
- 修复类别：单页

### R15-L12-D09　P2 / 空态文案　批次 R15-B63
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`f6d6cc7f0f864c7a`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:136`
- 理想图依据：无基准；依据=规范 §1.2 占位档 --c-text-placeholder 的用途「输入框 placeholder」+ 本页时段框已有完整示例占位
- 现象：「常去区域」输入框 `:placeholder="''"`，帧上 88rpx 高（44px）×296px 宽的框内最深像素只有 #ECF1EF（等于空白），零字符引导；同一卡下方的时段框却有「常用空闲时段，例如今晚或本周三下午」完整示例
- 建议改法：占位文恢复为示例值（如「如：图书馆 / 北草坪」），标签行 .field-label 保留，与时段框同档
- 修复类别：单页

### R15-L12-D10　P1 / 可达性　批次 R15-B63
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`ad4a7915dbf8a863`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:201`
- 理想图依据：无基准；依据=组件规范 BottomActionBar 禁用档（#DCE5E2 底）只用于「不可继续」，且同流程 campus 已按 R11-L12-D09 去掉禁用走 toast 反馈
- 现象：空态下主 CTA 整条填充 #DCE5E2（帧上 y=731..770 全部为该灰），画面无任何就地说明缺哪项（常去区域框空白、时段框空白）；campus 同一按钮已常亮 #156B51，而本页 save() 里两条 toast 守卫（:85-94）在 :disabled 下永不可达 ⇒ 用户点了没有反馈、也不知道本步怎么才能交付
- 建议改法：去掉 `:disabled`（canSave 只驱动样式提示），空态点击交给 save() 的 toast 定位缺项，与 campus 同口径
- 修复类别：单页

## subpackages/support/feedback/index（2 条）

### R15-L13-D01　P2 / 颜色token　批次 R15-B64
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`feb078a1f441ef91`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:649`
- 理想图依据：无基准，依据=规范§1.1「绿色=行动/选中态」+§1.2 brand 档；组件规范 SectionCard 内 chip
- 现象：新建提交卡的三个分类药丸「反馈/建议/活动提案」共用同一 `--c-bg-brand`(#E8FBF2) 浅绿底（.chip 与 .chip--active 底色逐字相同，见 :649/:665），选中态只靠 2rpx 描边区分，"绿=选中"语义失效；且未选中 chip 标签 `--c-brand-700`(#1F8D6A) 压 #E8FBF2 实算 3.85:1 <4.5:1。
- 建议改法：未选中 chip 底色改中性档（--c-bg-surface/--c-bg-container），仅选中态保留 brand 浅底；未选中标签色提到 --c-brand-800。
- 修复类别：CSS/token

### R15-L13-D02　P2 / 颜色token　批次 R15-B64
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`4e20996001b01a91`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:853`
- 理想图依据：无基准，依据=规范§1.2 次文本对比；组件规范 .history-header__btn
- 现象：「反馈历史」卡头右侧「历史记录」按钮（去历史列表唯一入口）标签 `--c-brand-700` #1F8D6A 压 `--c-bg-brand` #E8FBF2 药丸底，实算 3.85:1，24rpx(12px) 标签低于正文 4.5:1。
- 建议改法：标签色提到 --c-brand-800 #156B51（同底 6.4:1），或药丸底改 --c-bg-surface。
- 修复类别：CSS/token

## subpackages/tools/activities/detail（3 条）

### R15-L08-D09　P2 / 字号　批次 R15-B65
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`12fd90ea473e18b9`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:811`
- 理想图依据：无基准，依据=规范文档 §1.3 正文档 15/16px；同页「活动介绍」正文已按 R11-L08-D13 提到 --fs-xl 15px（墨迹两行 y=634..680）
- 现象：「每日 18:00-20:00」（墨迹 y=523..532）与「校园咖啡角」（y=545..555）两行值取 --fs-base 24rpx=12px，墨迹高 10px，比同屏介绍正文 15px 低两档、比卡内标题「新人礼遇」18px 低三档；这两行是本页唯二的活动时间/地点事实。
- 建议改法：.detail-meta__value 的 font-size 提到 --fs-xl（30rpx=15px），.detail-meta__label 由 24rpx 提到 --fs-md（26rpx=13px），行距保持 §1.3 正文 1.55。
- 修复类别：CSS/token

### R15-L08-D10　P3 / 文案　批次 R15-B65
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`12fd90ea473e18b9`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:464`
- 理想图依据：无基准，依据=规范文档 §1.1 规则 3「一屏只说一件事」与 R11-L08-D12 自陈「封面小徽标保留，两处同时在场」
- 现象：「示例活动」四字同屏出现两次：封面左上角的 10px 徽标（--fs-xs 20rpx）与标题下 314×30px 描边框（实测 x=32..346、y=474..503），两处文字逐字相同；第二处造型是「浅底 #F3FAF6 + 1px #C2CAC6 描边 + 6px 圆角」，在卡内读起来像一枚禁用的标题输入框，且不说明卡里哪些字段是示例值。
- 建议改法：去掉标题下描边框的 border/底色（或以 role=note 的正文行呈现），文案改为可解释的整句（如「以下为示例活动内容」），封面徽标改为只标「示例」二字避免同词重复。
- 修复类别：单页

### R15-L08-D11　P2 / 间距　批次 R15-B65
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`f5e4c3c0d6a91741`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:836`
- 理想图依据：无基准，依据=规范文档 §1.4 --section-gap 24rpx（12px）与 R10-L08-D11 自陈「不留整块空底」，同页 .detail-footer-space 声明 140rpx=70px
- 现象：滚到底后「活动介绍」卡底缘实测 y=604，底部操作栏顶缘 y=718，中间 114px 纯 #EEF7F2 空带（占屏高 14%）；.detail-footer-space 只解释其中 70px，余下 44px 是 scroll-view 内容止于 674 而栏顶在 718 的空白，非 sp 阶梯上任何一档。
- 建议改法：.detail-footer-space 由 140rpx 收到 --sp-8（32rpx=16px）并改为 flex:1 吸收 scroll 余量，使「活动介绍」卡底到操作栏之间只剩 --section-gap 一档。
- 修复类别：单页

## subpackages/tools/daily-question/index（5 条）

### R15-L07-D06　P2 / 尺寸比例　批次 R15-B66
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`ec7757eaf451dc11`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:460`
- 理想图依据：无基准页，依据=§1.4 卡片高度应由内容+32rpx 内边距决定；组件规范空/锁态卡不应超过内容 2 倍
- 现象：锁态大卡占 y=106..659 共 553px（视口 814 的 68%，来自 min-height:70vh），而卡内内容（锁图标 288..330、标题 359..372、说明 387..399、CTA 423..465）只有 177px，卡内 376px（68%）是空白
- 建议改法：.lock-card 的 min-height:70vh 改为按内容自适应（min-height:520rpx）+ padding 48rpx，锁态卡不再整屏撑满
- 修复类别：CSS/token

### R15-L07-D07　P3 / 文案　批次 R15-B66
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`ec7757eaf451dc11`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:199`
- 理想图依据：无基准页，依据=组件规范「同一出口一页只出现一次」，顶部导航与底部胶囊不应同文重复
- 现象：同一帧里「返回」出现两次：顶部导航左侧文字「返回」(y≈60..76) 与卡下白色胶囊「返回」(y=679..718)，两者都绑 goBack，底部胶囊在锁态下无新增信息
- 建议改法：锁态下去掉 .lock-back 胶囊（或改成「稍后再来」并指向首页），保留顶部导航唯一出口
- 修复类别：单页

### R15-L07-D08　P2 / 间距　批次 R15-B66
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`ec7757eaf451dc11`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:461`
- 理想图依据：无基准页，依据=§1.4 卡片内边距 32rpx（16px），锁态内容在卡内应上下等距
- 现象：卡内上留白 106→288 为 182px，下留白 465→659 为 194px，相差 12px（24rpx）；声明的 padding 60rpx=30px 只占其中一小部分，其余空白来自 70vh 定高后的 flex 分布
- 建议改法：定高改自适应后 padding 统一 60rpx，上下留白由 padding 单点决定
- 修复类别：CSS/token

### R15-L07-D09　P2 / 可达性　批次 R15-B66
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`82c89b1e87e8ef43`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:537`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）
- 现象：底部「返回」胶囊实测 y=679..718 共 40px=80rpx（含抗锯齿约 42px=84rpx），低于 88rpx 下限；样式虽写了 min-height:88rpx，帧上未兑现（整页仅此一处底出口，顶部返回文字更小）
- 建议改法：.lock-back 改 height:88rpx + box-sizing:border-box，并核对 mp-weixin 下 min-height 与 flex 子项是否被压扁
- 修复类别：CSS/token

### R15-L07-D10　P2 / 位置　批次 R15-B66
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`82c89b1e87e8ef43`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:535`
- 理想图依据：无基准页，依据=§1.4 页边距 --page-padding 32rpx（16px）：同屏控件左右边缘应落在同一条 32rpx 竖线上
- 现象：底部「返回」胶囊实测 x=3..376（374px 宽），而锁卡 x=18..360（343px），胶囊左右各多出 15px（30rpx），页边距在胶囊上只剩 1.5px；.lock-back 的 `margin: … auto …` 在 mp-weixin flex 列里没生效，被拉满
- 建议改法：.lock-back 加 `margin-left:32rpx;margin-right:32rpx;align-self:stretch`（或去掉 auto 改 `margin: var(--sp-5) var(--sp-8)`），与卡片左右缘对齐
- 修复类别：CSS/token

## subpackages/tools/heart-signals/index（4 条）

### R15-L08-D05　P2 / 间距　批次 R15-B04
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`2aeca7597123cfd8`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:567`
- 理想图依据：无基准，依据=规范文档 §1.4 sp 阶梯（--sp-8=32rpx=16px）与 LockScreen.vue 自身声明「插画 margin-bottom --sp-8 是组间唯一定值」（:552-553）
- 现象：主视觉环实测 x=119..258、y=75..214（140px=280rpx），环底缘 y=214 到主标题墨迹 y=281 净空 67px；.lock-screen__illustration 定高 400rpx(200px) 而环只占 280rpx 且 top:30rpx ⇒ 容器底部余 45px 空尾，再叠 --sp-8 16px，声明值被放大 4 倍。
- 建议改法：.lock-screen__illustration 高度由 400rpx 收到 280rpx + 30rpx(top) = 310rpx（或让环改用 align-items:center 撑满容器），使环下净空回到 --sp-8 一档。
- 修复类别：单页

### R15-L08-D06　P2 / 字号　批次 R15-B04
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`2aeca7597123cfd8`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:677`
- 理想图依据：无基准，依据=规范文档 §1.3 正文档 15/16px 与「一屏唯一数值应至少到正文档」；同屏权益正文已是 --fs-xl 15px
- 现象：「当前完整度 30%」墨迹实测 y=336..345 仅 10px 高（字号 24rpx=12px，--fs-base），比同屏权益文案（--fs-xl 15px，墨迹 383..396）低一档，而它是整屏唯一的进度读数，且贴在 8px（16rpx）高的进度条上方。
- 建议改法：.lock-screen__progress 的 font-size 提到 --fs-md/--fs-xl（13–15px）并加 font-weight:600，颜色保持 --c-text-secondary（压底 6.5:1）。
- 修复类别：CSS/token

### R15-L08-D07　P2 / 间距　批次 R15-B04
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`9976ec890a535ce5`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:559`
- 理想图依据：无基准，依据=规范文档 §1.4 sp 阶梯与 LockScreen.vue:537-546 自陈「钮下不再有阶梯外的空段」；本帧 bottom 与 top 仅插画胶囊区（x=108..284,y=61..107，爱心浮动动画）不同，其余逐像素同图
- 现象：「先去逛逛匹配推荐」墨迹止于 y=561，页脚提示「资料越完善…」墨迹起于 y=732，中间 171px（≈342rpx）无内容空带；上一批 R11-L08-D10 实测是 131px、R14-L08-D01 把 body 改 flex-start 收口后本帧反而涨到 171px ⇒ 上一轮修得不够，余量只是从「两组之间」挪到了「action 之下」。
- 建议改法：让 .lock-screen__body 吸收余量（把 action 用 margin-top:auto 贴到 body 底缘、或给 body 加 justify-content:space-between 只保留插画/文案/action 三段），把 171px 压到 --sp-9~--sp-10 一档。
- 修复类别：单页

### R15-L08-D08　P2 / 颜色token　批次 R15-B04
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`9976ec890a535ce5`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:701`
- 理想图依据：无基准，依据=规范文档 §1.2 品牌梯与 WCAG 非文本图形 3:1；LockScreen.vue:694 自陈槽压页底 1.22:1「可辨」
- 现象：进度槽实测 (163,235,207)=#A3EBCF，压同帧页底 y=357 处 (213,236,227)≈#D5ECE3 实算 1.10:1（<3:1），「还差 70%」那 192px 槽段在帧上几乎看不出边界；30% 填充 (21,107,81) 对槽 4.7:1 达标，坏的是未完成段。
- 建议改法：给 .lock-screen__progress-bar 加 2rpx solid var(--c-brand-700, #1F8D6A) 描边（#1F8D6A 压页底 #D5ECE3 = 3.34:1，槽右端与「100%」终点边界由这圈线给出），槽底保持 #A3EBCF 只作填充背景。
- 修复类别：CSS/token

## subpackages/tools/help/index（4 条）

### R15-L07-D17　P2 / 可达性　批次 R15-B67
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`15fc5de5c1a94ed3`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:201`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）：整行 role=button 的折叠条目必须 ≥88rpx
- 现象：6 条 FAQ 条目文字基线 y=248/291/333/377/421/464，条目浅底实测 42px=84rpx（含 1px 白缝后步距 43px），比 88rpx 下限少 4rpx；条目上下 padding 只有 24rpx（12px）
- 建议改法：.help-faq__item 纵向 padding 改 26rpx（或 min-height:88rpx），条目高落 88rpx 整
- 修复类别：CSS/token

### R15-L07-D18　P2 / 可达性　批次 R15-B67
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`15fc5de5c1a94ed3`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:329`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）；同页 :322 注释自陈已补 88rpx 两向
- 现象：「复制」胶囊帧测 x=300..341 共 42px=84rpx 宽（高 44px=88rpx 已达标），宽向仍差 4rpx；R14-L07-D12 已写 min-width:88rpx，但帧上只兑现 84rpx，「复制」是本页唯一剪贴板出口（上一轮修得不够）
- 建议改法：.help-contact__copy 用 width:88rpx（定宽替 min-width）+ box-sizing:border-box，或 padding 横向改 24rpx，复测宽度 ≥44px
- 修复类别：CSS/token

### R15-L07-D19　P2 / 字号　批次 R15-B67
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`74e2f488d4a2e8c3`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:358`
- 理想图依据：无基准页，依据=§1.3 正文/辅助档 14–15px；同卡说明行已取 --fs-lg 14px，邮箱地址不应比它更小
- 现象：明文邮箱行取 var(--fs-base)=24rpx=12px（帧 y=730..744，墨高 12px），比同卡「在线客服 9:00-21:00 在线」说明行 14px 还小一档，而邮箱是本行最需要核对的字符，也是可选中复制的对象
- 建议改法：.help-contact__email 改 var(--fs-lg, 28rpx)=14px，与说明行同档，靠色重（--c-text-primary）拉层级
- 修复类别：CSS/token

### R15-L07-D20　P3 / 间距　批次 R15-B67
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`74e2f488d4a2e8c3`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:338`
- 理想图依据：无基准页，依据=§1.4 区块间距 --section-gap 24rpx（12px）：页脚块上下留白应同档
- 现象：滚动到底后「联系我们」卡底 y=689 到页脚首行 730 为 41px，页脚末行 764 到 home indicator 顶边 800 为 36px，上下差 5px；页脚上下 padding 一个 32rpx(16px) 一个 12px，与 24rpx 区块间距不成档
- 建议改法：.help-footer padding 改 24rpx 24rpx calc(env(safe-area-inset-bottom) + 24rpx)，上下取同一 --section-gap
- 修复类别：CSS/token

## subpackages/tools/love-center/consulting（3 条）

### R15-L09-D01　P2 / 字号　批次 R15-B68
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`68f0cbf46e723815`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:218`
- 理想图依据：无基准；依据=《全站设计规范与逐页设计稿说明》§1.3 字号层级（区块标题 --fs-3xl=18px，卡片状态标题不应低于区块标题）
- 现象：封存卡主标题「功能封存中」取 --fs-xl(30rpx=15px)，帧上墨高 14px（y=258–271）；其下方区块标题「精选课程，助你提升恋爱能力」取 --fs-3xl(36rpx=18px)，墨高 17px（y=412–428）——页面唯一状态标题反而比次级区块标题小 3px，字号层级倒挂。
- 建议改法：.consult-sealed__title 改 var(--fs-3xl, 36rpx)（与 verification/index.vue .status-card__title 同档），兜底字面量同步 36rpx。
- 修复类别：CSS/token

### R15-L09-D02　P2 / 空态文案　批次 R15-B68
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`68f0cbf46e723815`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:102`
- 理想图依据：无基准；依据=§1.3 正文档（--fs-lg 14px）+ 同域封存态出口约定（R6-L10-D16 已给封存卡补「帮助与客服」）
- 现象：课程区只剩一行「咨询/课程内容筹备中，敬请期待」（14px，墨迹 y=443–456），其下无任何可点节点；上方封存卡已说「该功能暂未开放」，同页两条「不可用」叠加，hint 末行以下到视口底共 358px 空白，页内唯一的次级出口仍在卡片内部（「帮助与客服」）。
- 建议改法：课程区空态补一个同级出口（复用 goHelpCenter 的描边按钮）或整块删掉，避免同一页两次「暂未开放」却只有卡片内一个出口。
- 修复类别：单页

### R15-L09-D03　P3 / 颜色token　批次 R15-B68
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`68f0cbf46e723815`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:214`
- 理想图依据：无基准；依据=§1.2 色表（--c-text-tertiary #6B7571；表内无 #707070 灰档）+ 同为空态的 visitors 眼睛图标（资产原色 #94A3B8）
- 现象：锁图标用 filter saturate(0) brightness(0.71) 压成纯灰，帧上描边实测 #707070(112,112,112)；同域空态眼睛图标保持 #94A3B8(148,163,184)（visitors 帧实测），两页空态图标一灰一蓝灰，且 #707070 不在 §1.2 色表。
- 建议改法：与 visitors.vue:514-524 同口径先去掉 filter，再由资产车道把两枚图标的 stroke 统一改 --c-text-tertiary #6B7571，避免继续用 CSS 滤镜分叉出第三种灰。
- 修复类别：CSS/token

## subpackages/tools/love-center/index（6 条）

### R15-L07-D11　P1 / 可达性　批次 R15-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`0843ed91ca851eff`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:354`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）；同页代码注释 :353 自陈「热区 ≥88rpx」
- 现象：快捷入口行「附近的人」整行白卡占 y=211..243 只有 33px=66rpx（宽 343px），只有 88rpx 下限的 75%；上一轮 R6-L09-D07② 声称已把纵向 padding 撑到 88rpx，帧上并未兑现（这一行是进入「附近的人」的唯一入口，无可替代出口）
- 建议改法：.love-center__quick 加 min-height:88rpx（或 padding 改 30rpx var(--sp-5)），并用 box-sizing:border-box 核帧
- 修复类别：CSS/token

### R15-L07-D12　P2 / 间距　批次 R15-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`0843ed91ca851eff`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:204`
- 理想图依据：无基准页，依据=§1.4 区块间距 24rpx；页面内容应收口，不留整屏空底
- 现象：「恋爱测试」MBTI 卡底止于 y=609，视口底 814，其下 205px（410rpx）纯页面底空白，占视口 25%；bottom 帧与 top 帧画面一致（同为 73724B），这 205px 滚不动，页底只有 padding-bottom:env(safe-area-inset-bottom)=0
- 建议改法：页面容器补 padding-bottom:48rpx，或给「恋爱测试」区补第二条测试入口（如恋爱观测试）填掉空底
- 修复类别：CSS/token

### R15-L07-D13　P2 / 字号　批次 R15-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`0843ed91ca851eff`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:300`
- 理想图依据：无基准页，依据=§1.3 字体层级「辅助 14px / 说明 14px」，13px 属「小字（标签·时间戳）」档
- 现象：四张宫格卡的说明行「情感问题，专业解答」等取 var(--fs-md, 26rpx)=13px（帧 y=358..371 墨高 13px），比同卡标题 15px 只差 2px 且比 §1.3 说明档 14px 小 1px，四张卡副行读起来像标签
- 建议改法：.love-center__board-desc 改 var(--fs-lg, 28rpx)=14px，行高 1.5
- 修复类别：CSS/token

### R15-L07-D14　P1 / 可达性　批次 R15-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`89fe04d148418519`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:316`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）；同页 :315 注释自陈「热区 ≥88rpx」
- 现象：「恋爱测试」MBTI 行整行白卡占 y=577..609 仅 33px=66rpx（与快捷入口行同病），低于 88rpx 下限 25%，而它是进入 MBTI 测试的唯一入口
- 建议改法：.love-center__test 同样加 min-height:88rpx + box-sizing:border-box
- 修复类别：CSS/token

### R15-L07-D15　P3 / 文案　批次 R15-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`89fe04d148418519`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:145`
- 理想图依据：无基准页，依据=§1.3 层级命名：区块标题与其下条目不应同名
- 现象：区块标题「恋爱咨询」(y=227) 与宫格第一张卡标题「恋爱咨询」(y=336) 逐字重复，同屏两次出现后用户分不清哪个是可点入口；页头已按 R7-L07-D05 改叫「恋爱中心」，区块这一处漏改
- 建议改法：区块标题改用更上位的键（如「情感服务」），或把四宫格首卡改名为「1v1 情感咨询」
- 修复类别：单页

### R15-L07-D16　P2 / 颜色token　批次 R15-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`89fe04d148418519`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:254`
- 理想图依据：无基准页，依据=§1.2 分级降饱和（封存态应有一档可辨底色，见 love-center__board--sealed 自述）；同屏左列开放卡 #FFFFFF
- 现象：封存卡只有 2rpx=1px 的 --c-status-disabled #DCE5E2 描边（帧 x=194 处取样 rgb(220,229,226)），卡底仍 #FFFFFF 与左列开放卡完全同色；「功能封存中」角标底也是同一个 #DCE5E2（帧 y=379..395 取样同值），封存/开放两态只靠 1px 灰线区分
- 建议改法：.love-center__board--sealed 卡底改 var(--c-bg-surface, #F3FAF6)、描边去掉，角标底改白/深一档，与开放卡在底色上即可分辨
- 修复类别：CSS/token

## subpackages/tools/love-center/mbti（4 条）

### R15-L08-D16　P2 / 颜色token　批次 R15-B70
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`b4dbdc41f441547b`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:488`
- 理想图依据：无基准，依据=规范文档 §1.2 边框三档（最深 --c-border-strong #C2CAC6 对白 1.67:1，是本页可取的唯一深档）与 WCAG 非文本控件边界 3:1；同页 .card-action/.quiz-submit 等可点件均已按可辨档落地
- 现象：8 个作答选项是页面上唯一的可点控件，实测填充 #F3FAF6 对白卡 1.04:1、描边 1px 实测像素 (240,244,242)≈#F0F4F2 对白 1.13:1 ⇒ 选项框边界 <3:1，帧上两个选项几乎并成一片白，只能靠文字位置判断哪里能点。
- 建议改法：.quiz-option 的 border 由 --c-border-light #EEF2F0 换到色板最深档 --c-border-strong #C2CAC6 并保持 2rpx（1.67:1，色板内无 3:1 浅边框档，属 token 债）；可点提示由选中态 --c-brand-700 描边（4.7:1）承担。
- 修复类别：CSS/token

### R15-L08-D17　P2 / 字号　批次 R15-B70
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`b4dbdc41f441547b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:405`
- 理想图依据：无基准，依据=规范文档 §1.3（10/11px 只给角标·法务；标签走 12–13px），同页题干 --fs-lg 14px、选项 15px
- 现象：16 型速览上方的四维图例是唯一解释 E/I·S/N·T/F·J/P 的说明，帧上整行墨迹仅 y=172..180（9px 高），其中中文档取 --fs-xs 20rpx=10px，比同页题干预（14px）低两档；一屏 16 个英文缩写没有它就读不懂。
- 建议改法：.dimension-chip__label 的 font-size 由 --fs-xs 提到 --fs-md（26rpx=13px）或 --fs-base（12px），chip 纵向 padding 同步收到 4rpx 避免行高溢出。
- 修复类别：CSS/token

### R15-L08-D18　P2 / 间距　批次 R15-B70
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`078e3fb1e07e7ba8`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:542`
- 理想图依据：无基准，依据=规范文档 §1.4 sp 阶梯与 R11-L08-D28 自陈「钮下不再有阶梯外的空段」；.content-footer-space 声明 --sp-8=16px
- 现象：滚到底后主 CTA「提交并查看结果」墨迹止于 y=757，其后 y=758..814 共 56px 纯 #EEF7F2 空底，是声明值 16px 的 3.5 倍；CTA 下缘距 Home Indicator（y=800..806）43px，中间这 56px 既不是安全区也不是 sp 档。
- 建议改法：.content-footer-space 保持 --sp-8 的同时把 scroll-view 尾部余量交给它（改为 flex:1 吸收），或把提交钮移入固定底栏（BottomActionBar 同款），使钮下只剩安全区。
- 修复类别：单页

### R15-L08-D19　P2 / 字号　批次 R15-B70
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`078e3fb1e07e7ba8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:501`
- 理想图依据：无基准，依据=规范文档 §1.3（区块标题 18/20px、正文 15/16px）；题干应比选项高一档
- 现象：每题题干「周末更愿意怎么过？」墨迹 y=420..431（11px，字号 14px=--fs-lg），选项「约朋友出去玩」墨迹 y=456..467（同为 11px，字号 15px=--fs-xl）⇒ 选项比题干大 1px，四张题卡上题干与选项读成同一层级，题与答案的边界只能靠卡片间距分辨。
- 建议改法：题干 .quiz-item__question 提到 --fs-3xl（18px）/700，选项维持 --fs-xl 15px，把两组墨迹高拉开 ≥3px。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（4 条）

### R15-L08-D12　P2 / 字号　批次 R15-B71
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`2e6eb4f82eee8b2e`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:266`
- 理想图依据：无基准，依据=规范文档 §1.3 页面主标题 26–28px / 大标题 22px；同域 mbti 页头「MBTI 人格测试」墨迹 20px（字号 22px）、activities 页头已按 --fs-5xl 22px 落地
- 现象：页头标题「附近的人」墨迹实测 x=63..117、y=69..80（4 字 54px 宽、12px 高）⇒ 字号 15px（--fs-xl），落在 §1.3 正文档；同域另两页页头均为 22px（mbti 墨迹 20px），本页比它们矮两档。
- 建议改法：.content-header__title 的 font-size 由 --fs-xl 提到 --fs-5xl（44rpx=22px）并与 mbti.vue 页头同档，保持 700 字重与 --c-text-primary 墨色。
- 修复类别：CSS/token

### R15-L08-D13　P2 / 颜色token　批次 R15-B05
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`2e6eb4f82eee8b2e`，自同段前条继承）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1836`
- 理想图依据：无基准，依据=规范文档 §1.2（brand-500 #36C99A 作「主色/选中态」，未给白字档）与正文 4.5:1 门槛；同族深档 --c-brand-800 已在全站 4 处 CTA 收敛
- 现象：卡右上「在线」徽章底实测 (16,177,124)≈#10B17C（0.95 不透明品牌绿压暗底），白字 11px 对其 2.76:1；「22岁」胶囊底 (61,204,157)≈#3DCC9D，白字 16px 对其 2.10:1 —— 两处都 <4.5:1，16px/600 不享大字号豁免，卡上在线状态与年龄几乎读不出。
- 建议改法：.card__online-badge 底改 --c-brand-800（#156B51，白字 6.45:1）、.card__age 底由 brand-400/500 渐变收成 --c-brand-800 纯色，两处文字保持 --c-text-inverse。
- 修复类别：CSS/token

### R15-L08-D14　P2 / 位置　批次 R15-B71
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`f75fd3e806f380d4`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:298`
- 理想图依据：无基准，依据=规范文档 §1.4 页边距/安全区口径与 LockScreen.vue:837-843 同口径裁定（底部文字距手势条 ≥68rpx=34px）；本帧与 top 帧逐像素相同（状态栏同为 18:01）
- 现象：「查看全部推荐」胶囊实测 y=759..799（44px 高，热区达标），底缘距系统 Home Indicator（y=800..806）仅 1px，胶囊与手势条在帧上几乎相贴；根因是 .nearby-card-area 底部只吃 --sp-6（12px），没有叠加 env(safe-area-inset-bottom)。
- 建议改法：.nearby-card-area 的 padding-bottom 由 var(--sp-6) 改成 calc(var(--safe-bottom, env(safe-area-inset-bottom)) + 72rpx)（与 .lock-screen__footer 同配方），让唯一批量出口离手势条 ≥34px。
- 修复类别：单页

### R15-L08-D15　P2 / 间距　批次 R15-B71
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`f75fd3e806f380d4`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:323`
- 理想图依据：无基准，依据=规范文档 §1.4 --section-gap 24rpx=12px；R7-L08-D09/D10 自陈尾部块是「低密度收尾」，不是吸收余量
- 现象：三枚动作钮底缘 y=668 到尾部提示墨迹 y=738 之间 70px 空带（--section-gap 的 5.8 倍），而同一尾部块内「提示→按钮」只有 9px（y=750→759）；同屏一段 70px、一段 9px，两段都不在 sp 阶梯上。
- 建议改法：去掉 .nearby-tail 的 margin-top:auto（或把 .card-swiper-host 恢复 flex:1 吸收余量），让钮到提示回到 --sp-8/--sp-9 一档，提示到按钮保持 --sp-3。
- 修复类别：单页

## subpackages/tools/search/index（4 条）

### R15-L08-D01　P1 / 可达性　批次 R15-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`42a48d6f1cd3e2f8`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:610`
- 理想图依据：无基准，依据=规范文档 §1.4 与仓内自陈触控下限 88rpx（AppShell.vue:334「min-height: 88rpx(44px)」），同页 .search-tab 已按此档落地
- 现象：搜索输入胶囊在帧上实测 y=57..92、x=68..254（36px 高 = 72rpx），比同帧「用户」选中胶囊（y=112..152，41px）矮一档，也低于 88rpx 下限 8px；这是本页唯一的输入入口，失焦后只能再点这枚 36px 高的胶囊，没有第二个出口。
- 建议改法：.search-box 的 height 由 72rpx 提到 88rpx（min-height:88rpx 兜底），头部行高随之 +8px，不影响下方分组条与历史区左缘。
- 修复类别：单页

### R15-L08-D02　P2 / 颜色token　批次 R15-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`42a48d6f1cd3e2f8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:753`
- 理想图依据：无基准，依据=规范文档 §1.2 次/三级文本令牌表 + §1.3 小字 12px 档；同页其余正文已按 7:1 档取色
- 现象：右侧「清除」取 --c-text-tertiary，帧上墨迹最暗采样 (108,118,114)=#6C7672，压页底 #EEF7F2 实算 4.27:1（<4.5:1），字号仅 12px（墨迹 y=181..190 高 10px），是本页唯一带清除动作的文字控件。
- 建议改法：.section-clear 的 color 由 --c-text-tertiary 提到 --c-text-secondary #4A524E（压 #EEF7F2 7.28:1），字号保持 24rpx。
- 修复类别：CSS/token

### R15-L08-D03　P2 / 间距　批次 R15-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`806ac7b06fb29259`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:683`
- 理想图依据：无基准，依据=规范文档 §1.4 --section-gap 24rpx=12px 与「满屏页不留大段无主空带」；该帧 bottom 与 top 除状态栏时钟（x=32..41,y=17..27）外逐像素相同
- 现象：空态文案墨迹止于 y=375，此后到 y=800（Home Indicator 之上）共 425px 纯 #EEF7F2，占内容区 65%；空态文案下方空白由 R14 之前的 210px 涨到 425px —— R14-L07-D19 把 .suggest-wrap 改 flex-start 只是把内容顶到上缘，余量整段落到 EmptyState 之下，bottom 帧与 top 帧除状态栏时钟外整页同图 ⇒ 页面不可滚，这段空底没有任何内容可沉降进去。
- 建议改法：空态块改为在剩余高度内居中（.suggest-wrap 回收 flex-start，把 EmptyState 包一层 flex:1 + justify-content:center），或让空态插画按剩余高度缩放，使文案下缘距屏底不再有超过 200px 的无主空带。
- 修复类别：单页

### R15-L08-D04　P2 / 可达性　批次 R15-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`806ac7b06fb29259`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:768`
- 理想图依据：无基准，依据=仓内自陈 88rpx 触控下限（AppShell.vue:334）；同页 .search-tab、.search-back 均已按 88rpx 落地
- 现象：搜索历史 chip 实测 81×26px（x=17..97、y=205..230，padding 12rpx 上下 + 26rpx 文字），热区 26px=52rpx，不到同帧分组胶囊（41px）的 2/3；点 chip 是复跑该词的最短路径（重新键入可替代，故不判 P1）。
- 建议改法：.hot-item/.history-item/.entry-item 三处同配方补 min-height:88rpx（视觉胶囊可保持 26px，用 padding 撑热区）或整体把纵向 padding 提到 --sp-4 以上并补 min-height。
- 修复类别：单页

## subpackages/tools/security/index（6 条）

### R15-L07-D21　P2 / 文案　批次 R15-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`0f0fa9bf4891004e`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:46`
- 理想图依据：无基准页，依据=§1.2/§1.3 信息真实性：已绑定手机号必须给出可核对的脱敏尾号
- 现象：「绑定手机号」副行只渲染「已绑定（号码脱敏）」这句占位短语（帧 y=299..311），没有任何数字尾号；用户点进「修改密码/注销账号」前核不到自己绑的是哪个号
- 建议改法：后端下发 phone 后按 `138****8888` 渲染，未下发时改「已绑定 · 尾号未知」并给出「更换手机号」入口
- 修复类别：单页

### R15-L07-D22　P2 / 文案　批次 R15-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`0f0fa9bf4891004e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:991`
- 理想图依据：无基准页，依据=§1.3 列表主文字 15px 下标题不应被省略号截断到语义不完整
- 现象：当前设备行主标题被 nowrap+ellipsis 截成「手机号登录 · iPhone 12/13 (…」（帧 y=651..663，墨迹止于 x≈255 后接省略号），型号后半段（Pro/尺寸）丢失，加括号未闭合读起来是半句话
- 建议改法：设备型号生成时先 trim 括号与长度（超过 12 字截断加「…」），或把「当前设备」徽章下移一行给标题让出整行宽
- 修复类别：CSS/token

### R15-L07-D23　P1 / 可达性　批次 R15-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`0f0fa9bf4891004e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:1053`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）；同页 :1053 自陈「min-height + 内边距撑到规范档」
- 现象：「下线」胶囊帧测 x=295..341（47px=94rpx 宽）、y=711..749（39px=78rpx 高），高向只有 88rpx 下限的 89%；样式已写 min-height:88rpx，帧上只兑现 39px（上一轮 R6-L09-D15 的 88rpx 未落地，需查 mp-weixin 下该 flex 子项的高度来源）
- 建议改法：.sec-item__kick 改 height:88rpx（定高替 min-height）+ box-sizing:border-box，或给所在 .sec-item 加 min-height:128rpx 复测
- 修复类别：CSS/token

### R15-L07-D24　P2 / 文案　批次 R15-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`dacbda979bf6ca71`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:152`
- 理想图依据：无基准页，依据=§1.3「点『下线』前要能判断是哪台设备」；同页 :146 注释亦承诺给可辨识标签
- 现象：4 条非当前设备行主标题只有「手机号登录 · in-a」「· vice」「· udit」（帧 y=196..208 起逐行），后缀是 deviceId 末四位随机片段，既非型号也非地点，用户无法分辨哪台是自己要踢的设备
- 建议改法：deviceRowLabel 改为「平台 · 首次登录日期」或末四位前加「设备尾号」，并在副行补 model（后端 View 已有 platform/createdAt）
- 修复类别：单页

### R15-L07-D25　P2 / 层级遮挡　批次 R15-B09
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`dacbda979bf6ca71`，自同段前条继承）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:128`
- 理想图依据：无基准页，依据=§1.4 底部安全区：内容不得与 home indicator 重叠
- 现象：「危险操作」卡底止于 y=804，系统 home indicator 黑条覆盖 y=800..809，压在卡片最后 4px 上；AppShell 在未开 tabBarSafe 时底部内边距直接返回 '0'，安全区留白完全没给（帧底黑条宽度覆盖 x≈130..243）
- 建议改法：页面容器补 padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx)，或 AppShell 传 tab-bar-safe 让 bodyPaddingBottom 生效
- 修复类别：CSS/token

### R15-L07-D26　P2 / 颜色token　批次 R15-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`dacbda979bf6ca71`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:1064`
- 理想图依据：无基准页，依据=§1.2 禁止「白上浅白」；非文本控件边界对比应 ≥3:1
- 现象：「下线」胶囊底色 --c-error-soft 帧取样 rgb(254,245,246)=#FEF5F6，压在白卡 #FFFFFF 上对比约 1.04:1，胶囊边界在白底上完全消失，只能靠 11px 深红文字猜热区（4 处胶囊同样）
- 建议改法：.sec-item__kick 底色改 --c-error-bg-solid 或加 2rpx solid #F3C9CB 描边，使非文本对比 ≥3:1
- 修复类别：CSS/token

## subpackages/village/village/detail（3 条）

### R15-L03-D05　P2 / 颜色token　批次 R15-B74
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`7a71abf08fb72dd6`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1492`
- 理想图依据：帖子.png 底部输入栏右端三枚图标（@/笑脸/图片）为深墨色线性图形，无彩色填充底块
- 现象：帧上输入栏「添加图片」钮实测为品牌绿实心圆角方块（素材 assets/icons/match/chat-image.png 逐像素取样主色 ≈#36C99A 满幅绿），与理想图同位深灰线性图标色相、图底关系双双不符；同栏 @ 与笑脸均为灰色，单枚绿色破坏同组一致性
- 建议改法：换用仓内深灰线性图片图标（如 SVG_SPEC_DIR image.svg，images.ts:849 已注册），与 @/笑脸同墨色
- 修复类别：单页

### R15-L03-D06　P2 / 需新建　批次 R15-B74
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`7a71abf08fb72dd6`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1006`
- 理想图依据：帖子.png 大图下方位置行 =「📍北京大学·未名湖校区」绿胶囊 + 灰字「距你 1.2km」；规范文档§3.13 亦写明「位置距离行」
- 现象：帧上位置行实测只有 📍南开大学 胶囊，理想图同位的「距你 X.Xkm」距离文字整段缺席——源码 :1006 距离节点被清空为注释占位（MP-R2-DETAIL-001 移除写死假距离），后端无真实距离字段可绑定
- 建议改法：后端补作者/帖子距离字段后接真值渲染「距你 N km」；字段就绪前保持隐藏并在 §3.13 登记为已知差异，勿留空 text 节点
- 修复类别：需新建目标功能

### R15-L03-D07　P2 / 颜色token　批次 R15-B74
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`b8350dd83965a341`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:2567`
- 理想图依据：帖子.png「全部评论 (32)」计数为括号内灰色纯文本（≈#9AA39F），无底色、无胶囊
- 现象：帧上「全部评论」后的计数实测为绿底胶囊（.comments-count 取 $green-primary 字色 + $green-light 底 + r-full 圆角），理想图同位是无底色灰字「(32)」；R13-L03-D03 仅把括号半全角对齐（:1064 注释），胶囊底/字色这条颜色轴从未动过，非重报
- 建议改法：去掉 background/padding/圆角，计数改 --c-text-placeholder 灰字（fs-md），仅保留全角括号形态
- 修复类别：单页

## subpackages/village/village/history（4 条）

### R15-L03-D11　P2 / 可达性　批次 R15-B75
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__top.png`（sha16=`d47253de5c2db7fb`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:388`
- 理想图依据：无基准，依据=任务书严重度口径热区基线 88rpx（44px）
- 现象：帧上「清空记录」胶囊实测高 ≈25px（.history-clear 纵向 padding 仅 8rpx + 24rpx 文本），热区不足 88rpx 基线六成，且为破坏性动作、误触成本高（本页唯一清空出口）
- 建议改法：纵向 padding 8rpx→30rpx 或 min-height:88rpx 居中，参照 tag-posts.vue:626 同款修法
- 修复类别：单页

### R15-L03-D12　P3 / 颜色token　批次 R15-B75
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__top.png`（sha16=`d47253de5c2db7fb`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:327`
- 理想图依据：无基准，依据=规范文档§1.2 页面底色 --c-bg-page 唯一真值 #EEF7F2
- 现象：页根背景写 var(--c-bg-page, #f5f6fa)——兜底字面量是蓝灰 #f5f6fa，与全站浅绿 #EEF7F2 不同族；令牌未注册环境（H5 预览/暗色注入失败）整页变灰断层。当前 mp 帧上因变量已注册未现色差，属无消费者孤儿兜底值
- 建议改法：兜底字面量改为与 --c-bg-page 真值同值的 #EEF7F2（或直接去兜底，让缺令牌显性暴露）
- 修复类别：CSS/token

### R15-L03-D13　P3 / 文案　批次 R15-B75
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`ddfd2da8ae210842`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:254`
- 理想图依据：无基准，依据=组件规范（同列表零值口径应一致）
- 现象：帧上每张卡统计行实测「赞 0 藏 0 看 N 评 N」——赞/藏/看零值照印（:251-253 无 v-if），评论却 >0 才显示（:254 v-if），同一行内两套零值取档，满屏「赞 0 藏 0」冗余噪声
- 建议改法：四计数统一口径：要么零值全隐（与评一致），要么产品定稿全显，并同步 village 域其它卡
- 修复类别：单页

### R15-L03-D14　P3 / 文案　批次 R15-B75
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`ddfd2da8ae210842`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:237`
- 理想图依据：无基准，依据=规范文档§1.3 小字档（标签·时间戳）一致性要求
- 现象：帧上同一列时间戳实测三种形态混排：「刚刚」「2 天前/3 天前/4 天前」「2026/09/06」，且日期用斜杠分隔——同域 detail.vue 帖内时间同为 formatRelativeTime 但理想图基线是「N 分钟前」相对档；斜杠日期与站点文档/其余页 yyyy-MM-dd 横杠档不一致
- 建议改法：统一超过 7 天的时间戳分隔符档（横杠或中文「9月6日」二选一），全 village 域同 formatter 出口
- 修复类别：单页

## subpackages/village/village/index（2 条）

### R15-L02-D13　P2 / 素材缺失　批次 R15-B04
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__index__top.png`（sha16=`e228324c2a2e6462`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:326`
- 理想图依据：无基准，依据=规范文档 §1.5 组件库（图标一件一义、同组图标须区分语义）+ common/LockScreen.vue 权益清单组件规范（三行权益各自指向匹配/同校/私信三种不同能力）
- 现象：帧上三行权益（图标墨迹中心 y≈405/431/457）左侧图标逐像素同形同尺寸（约 12px 见方，均为一枚锁形），因为 :326 三行共用同一 :src="lockIconSrc"；「解锁精准匹配推荐 / 查看同校校友主页 / 发起私信与匿名聊天」三条不同能力在图标层 0 区分
- 建议改法：给 benefits 增加 icon 字段（匹配/校园/私信三枚既有图标），:326 改绑 benefit.icon，锁形只保留在主插画
- 修复类别：CSS/token

### R15-L02-D14　P3 / 尺寸比例　批次 R15-B04
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`e56c4d2241030435`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:643`
- 理想图依据：无基准，依据=规范文档 §1.3 行高（正文 1.55-1.6，中文不得在词中拆行）+ 同组件 .lock-screen__content 的 560rpx 行盒
- 现象：帧上副标题折成两行：首行「完成基础资料填写，即可开启匹配、聊天、校」x=76-300（224px），次行只剩「园圈活动等全部功能」x=76-212（136px）——「校园圈」被拆成「校」「园圈」，次行宽度仅首行 61%；:643 max-width:560rpx(282px) 的容器容不下整句（R14 改过文案后未复核行盒）
- 建议改法：:643 max-width 放到 620rpx 让「校园圈」不被拆开，或把副标题按语义手动断成两行时长相当的句子（首行≈次行）
- 修复类别：CSS/token

## subpackages/village/village/post（4 条）

### R15-L03-D01　P2 / 素材缺失　批次 R15-B76
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__top.png`（sha16=`116538009c21f501`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1031`
- 理想图依据：无基准，依据=规范文档§3.14（统一发布页布局：底部工具栏「图/视频/话题/位置/提及/更多 6 图标」）；另§5.2 遗留清单第 1 项「发帖页底部 6 工具栏图标（P2）」
- 现象：帧上底部工具栏实测仅 5 枚（图片/话题/位置/提及/更多），规范 §3.14 要求的第 6 枚「视频」入口整枚缺席（源码 .post-toolbar 内亦无任何 video/视频节点）
- 建议改法：在 .post-toolbar 补第 6 枚「视频」工具位（lucide 单色 SVG + 既有 post-tool 结构），后端无能力前可置灰并 toast 说明；post.vue 系旧发帖页（规范§2 注 146 行），若产品裁定只保 publish.vue 则在文档撤销该 6 图标要求
- 修复类别：需新建目标功能

### R15-L03-D02　P3 / 文案　批次 R15-B76
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__top.png`（sha16=`116538009c21f501`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:897`
- 理想图依据：无基准，依据=规范文档§3.14（正文输入 0/1000）
- 现象：帧上正文计数器实测「0/500」，规范 §3.14 逐页说明写「正文输入（0/1000）」；实现取 constants/village.ts:18 POST_MAX_LENGTH=500（publish.vue:22 注释载明 500 为后端校验真相），规范文档与实现两处口径互斥
- 建议改法：以 500 为准回改规范文档 §3.14 的 0/1000 表述（文档侧勘误），避免下轮按 1000 误修
- 修复类别：单页

### R15-L03-D03　P3 / 文案　批次 R15-B76
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__top.png`（sha16=`116538009c21f501`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1081`
- 理想图依据：无基准，依据=规范文档§3.14（工具栏末位「更多」应为聚合入口）
- 现象：帧上工具栏末枚标「更多」，实测点击只打开「谁可以看」可见范围弹层（@tap="visibilitySheetOpen = true"，:1078），与上方「谁可以看」行（:986）完全重复，名不符实、无「更多」聚合内容
- 建议改法：该枚图标/文案二选一对齐功能：改标「可见」配眼睛图标，或扩成含举报/草稿等的聚合面板
- 修复类别：单页

### R15-L03-D04　P3 / 颜色token　批次 R15-B76
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`70858eaae52f81a7`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1595`
- 理想图依据：无基准，依据=规范文档§1.2（brand-50 唯一真值 #E8FAF3）+§1.1 一令牌一值
- 现象：帧底「发帖小贴士」卡浅绿底取 var(--c-brand-50, #EAF9F3)，兜底字面量 #EAF9F3 是过期私值（同文件 :1610-1612 注释自证「不信 .vue 里那句 #EAF9F3 过期兜底」），令牌未注册环境下将渲染成非规范色
- 建议改法：兜底字面量统一改 #E8FAF3（与 design-variables $brand-50 真值同值），消灭孤儿兜底色
- 修复类别：CSS/token

## subpackages/village/village/publish（2 条）

### R15-L02-D15　P2 / 文案　批次 R15-B77
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`fd9635d1f4270775`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:856`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文右下计数「0/1000」；规范 §3.14「正文输入（0/1000）」
- 现象：帧上计数器（x=303-355，y=388-400）显示「12/500」，上限 500 与理想图/规范 1000 相差一半；正文写到 500 字就被硬截，用户按理想图预期写长文拿不到后 500 字
- 建议改法：stores/village 的 MAX_CONTENT_LENGTH 提到 1000（:848 maxlength 与 :856 计数同源，一处改两处生效），并复核 store 侧校验口径
- 修复类别：单页

### R15-L02-D16　P3 / 字号　批次 R15-B77
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`cbe3b84a5c27afb5`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1398`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部工具栏标签「图片/视频·话题·位置·提及·更多」墨迹高约 26px（853 宽图）折算 378px 宽 ≈11.5-12px；规范 §1.3 小字档 12-13px
- 现象：帧上工具栏五枚标签（图片/话题/位置/提及/谁可以看，y=745-756）字面高仅 7px，:1398 font-size:20rpx=10px，落进 §1.3「极小（角标·法务）」档而不是工具栏小字档，比理想图同位 11.5px 低一档且与 40rpx 图标（20px）比例失衡
- 建议改法：:1398 改 24rpx（12px），图标维持 40rpx；行高同步 1.2 防止工具栏总高被撑破
- 修复类别：CSS/token

## subpackages/village/village/tag-posts（3 条）

### R15-L03-D08　P3 / 颜色token　批次 R15-B78
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`c8999773a7dc81da`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:553`
- 理想图依据：无基准，依据=规范文档§1.1 原则 1「主题底色统一浅绿，页面间不得出现断层」+ 同域 detail/post/history 三页页头实测均为浅底深字
- 现象：帧上页头实测为深绿渐变横幅（linear-gradient 135deg #156B51→#0B4A38）+ 白字标题，同域其余页（detail「帖子详情」/history「浏览记录」/post「发布动态」）页头都是浅底深字，同域两页取档不一、页头成全站唯一深色断层
- 建议改法：页头改浅底（--c-bg-page 或卡白）+ --c-text-primary 标题，返回钮沿用其余浅页头族口径
- 修复类别：单页

### R15-L03-D09　P3 / 文案　批次 R15-B78
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`c8999773a7dc81da`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:350`
- 理想图依据：无基准，依据=组件规范（量词按对象取档：帖子用「篇」，浏览行为才用「条记录」）
- 现象：帧上标签头卡副行实测「共 2 条记录」——直接复用浏览记录页文案键 village.history.count，把「帖子列表」说成「记录」，与本页列表实体（帖子卡流）不符
- 建议改法：换用帖子计数键（如 village.tagPosts.postCount「共 N 篇帖子」），不再借用 history 键
- 修复类别：单页

### R15-L03-D10　P2 / 可达性　批次 R15-B78
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`1e56b85938ec7b9e`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:888`
- 理想图依据：无基准，依据=任务书严重度口径热区基线 88rpx（44px）+ 组件规范互动栏钮族
- 现象：帧上卡片脚注三枚互动钮（评论/点赞/分享）实测图标 28rpx、.action-btn 纵向 padding 仅 6rpx，整钮热区高 ≈40rpx(20px)，不足 88rpx 基线一半；其中「分享」（:480-487）在本页无第二出口
- 建议改法：.action-btn 纵向 padding 6rpx→30rpx 或加 min-height:88rpx 负外边距补偿，与 tag-hero__btn（:626 已按此法修达标）同口径
- 修复类别：单页

