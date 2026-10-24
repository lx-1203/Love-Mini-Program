# R16 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=214　涉及页面=68　涉及帧=136　泳道卡=14　段内继承哈希=38（同段第二条起未重复抄录，非逐条见证）
- 严重度分布：P2=150　P3=64
- 轴分布：颜色token=43　字号=29　可达性=27　文案=26　间距=25　尺寸比例=14　位置=14　圆角=11　素材缺失=9　空态文案=9　层级遮挡=4　需新建=3
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0
- 批次归属：214 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/discover/index（2 条）

### R15-L01-D12　P2 / 素材缺失　批次 R16-B21
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__discover__index__top.png`（sha16=`1a68fd803e0d7a0b`）
- 源码证据：`apps/client/src/pages/discover/index.vue:272`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 右上角筛选钮（上宽下窄的漏斗轮廓 + 3 粒圆点，约 44×44px）
- 现象：帧右上 72rpx 白圆钮内渲染的是 8 齿齿轮（外圈 8 个凸齿 + 中心圆孔，读作「设置」），理想图同一坐标是漏斗筛选图标；`IMAGE_PATHS.ICONS_V2.SLIDERS` 落盘的那枚资源与理想图不同族，入口语义从「筛选」变成了「设置」。
- 建议改法：把 :272 的图标换成理想图的漏斗 SVG（同目录补 filters/funnel 资源并注册进 IMAGE_PATHS.ICONS_V2），或复用仓内既有筛选漏斗图标，不再挂 SLIDERS。
- 修复类别：单页

### R15-L01-D13　P2 / 尺寸比例　批次 R16-B21
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__discover__index__bottom.png`（sha16=`e0831c3970b63b9d`）
- 源码证据：`apps/client/src/pages/discover/index.vue:617`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片区（实测 796×969px，高宽比 1.22）+ 规范 §3.3「全屏卡片 375×约 600」
- 现象：帧上卡片 x=16..362（346px 宽）、y=165..500（335px 高），高宽比 0.97；理想图同卡 796×969 ⇒ 1.22，规范写「375×约 600」⇒ 1.6。卡片被压矮约 20%（比理想图少 ≈75px 高），照片区从竖构图变近方形，姓名/学校/标签/签名四层几乎贴到卡底。
- 建议改法：把 :617 的 height 计算里固定扣减项按实测收紧（-170rpx 页头 / -206rpx dock / -64rpx 配额共 440rpx），或给 `.match-card-area` 加 `min-height: 880rpx`，把高宽比拉回 ≥1.2。
- 修复类别：CSS/token

## pages/home/index（4 条）

### R16-L01-D18　P2 / 素材缺失　批次 R16-B07
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__home__index__top.png`（sha16=`b79c8338a505b3e5`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:131`
- 理想图依据：素材/理想效果图/首页.png 今日推荐卡右栏（星座行下方横排 4 张 80×80 缩略图）+ 规范 §3.2「距离/认证/星座 + 4 张缩略图 + 看看TA/喜欢」
- 现象：帧上今日推荐卡右栏仍是 name→meta→tags→bio→「白羊座」→看看TA/喜欢，照片墙 0 枚缩略图。但这条与 R15 的成因已经不同，必须分开记：渲染出口本轮已建好（:131 `.today-card__gallery` 节点 + `galleryPhotos` computed，后端 `TodayRecommendationView.photos` 已下发，实测 GET /api/v1/home/dashboard 返回 `"photos":[]`），空的原因是当前候选人 userId=100171（演示·中山大学）的 `user_basic_profile.photo_gallery` 逐字为 `[]`（实测 SQL），即此人确实没有上传任何照片 ⇒ 组件按「无图整行不占位」的正确分支走，没有伪造占位图。残留可测偏差因此从「模块从未渲染」(P1) 降到「照片墙在本语料里从未被任何一帧证明过渲染成功」(P2)：全库 217 个 profile 里 211 个只有 1 张、1 个 2 张、5 个 0 张，没有任何一个用户够得上理想图的 4 张，所以这条轴在当前数据下不可能出绿帧。
- 建议改法：要拿到理想图那一帧只有两条路，且都不许由前端伪造：①给推荐池里的演示账号补 photo_gallery（真实上传流或具名 seed，属库内数据变更，需业主点头并先备份）；②把 §3.2 的「4 张」按语料实际能力改成「按人数 1–4 张自适应」并同步理想图说明。本轮两条都不自行动手，只把证据与缺口挂账。
- 修复类别：单页

### R15-L01-D15　P2 / 尺寸比例　批次 R16-B06
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__home__index__top.png`（sha16=`b79c8338a505b3e5`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:196`
- 理想图依据：素材/理想效果图/首页.png 今日恋爱进度四格（每格 ≈190px 宽，「回复悄悄话」单行不断行）
- 现象：4 格塞进 330px 宽卡（.love-progress__steps gap 20rpx、.love-step padding 24rpx 16rpx ⇒ 每格内容宽 ≈51px），标题 26rpx（13px）×5 字需 65px ⇒ 帧上第三格被折成「回复悄悄 / 话」两行，「待开始」被顶下一行，第三格比邻格多出约 16px 一行高、四格状态字基线全部错位。
- 建议改法：`.love-step__title` 收到 22rpx 并把 `.love-step` 横向 padding 由 16rpx 收到 8rpx（内容宽回到 61px 以上），或四格改 2×2 / 横向滚动，保证 5 字标题单行。
- 修复类别：CSS/token

### R15-L01-D16　P2 / 位置　批次 R16-B05
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__home__index__bottom.png`（sha16=`16b513b679106374`）
- 源码证据：`apps/client/src/components/home/NearbyPeople.vue:255`
- 理想图依据：素材/理想效果图/首页.png 附近的人行（4 个头像 + 右侧浅绿引导卡完整可见，卡宽 ≈90px）
- 现象：`.nearby-people__bar` 120rpx（60px）宽的引导卡是 scroll-view 内最后一个 flex 子项，排在 5 枚头像之后；帧上它只剩屏幕右缘 x=362..378 的 16px 一条（绿图标与「附近」「5」被右边框裁断），卡左缘在视口外 ⇒ 60px 中 ≈44px 不可见，必须横滑才露全，而理想图同位置是完整可见的定宽卡。
- 建议改法：把引导卡移出 scroll-view、固定在该行右端（外层 flex：scroll-view flex:1 + 卡 120rpx），或卡改 `position: sticky; right: 0` 常驻可见。
- 修复类别：单页

### R15-L01-D17　P2 / 字号　批次 R16-B81
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__home__index__bottom.png`（sha16=`16b513b679106374`，自同段前条继承）
- 源码证据：`apps/client/src/custom-tab-bar/index.wxss:55`
- 理想图依据：素材/理想效果图/首页.png 底部 tabBar（5 个标签「首页/附近/寻觅/消息/我的」，字形高 ≈13px、两字宽 ≈26px）
- 现象：`.tab-bar__label` 写死 20rpx = 10px，帧上「匹配」两字只占 20×10px、放大 4 倍仍辨不出字形（其余「首页/附近/消息/我的」同样 10px），理想图同位置标签 ≈13px、两字宽 ≈26px，本帧比理想图小 30%。
- 建议改法：`.tab-bar__label` 提到 26rpx（13px，与 `.tab-bar__item` 的 20rpx 解耦），必要时把 tab 高度从 160rpx 加到 168rpx，保证图标+标签不互相挤压。
- 修复类别：CSS/token

## pages/login/index（4 条）

### R15-L01-D01　P2 / 字号　批次 R16-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__top.png`（sha16=`06925bf6d980511f`）
- 源码证据：`apps/client/src/pages/login/index.vue:981`
- 理想图依据：素材/理想效果图/登录页面.png 插画下方居中三行文字区（「遇见同频的人 / 慢慢成为特别的人 / 校园里的每一次相遇都有美好记录」）
- 现象：规范 §3.1 明写该页「主标题两行（28px）→ 副标题（14px）」，实测 `.hero-desc` 取 40rpx（20px）、`.hero-desc--sub` 取 30rpx（帧内逐字扫描：副句 8 字占 118px ⇒ 14.75px/字 ≈ 15px，与代码 30rpx 吻合）、`.hero-desc-discover` 取 --fs-sm 22rpx（11px），三行全部低于规范档位（20/15/11 vs 28/28/14），主标题比理想图同位置小一档以上。
- 建议改法：`.hero-desc` 提到 56rpx（28px）、`.hero-desc--sub` 同步 56rpx、`.hero-desc-discover` 提到 --fs-lg（28rpx=14px），与 §3.1 档位对齐。
- 修复类别：CSS/token

### R15-L01-D02　P2 / 素材缺失　批次 R16-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__top.png`（sha16=`06925bf6d980511f`，自同段前条继承）
- 源码证据：`apps/client/src/pages/login/index.vue:601`
- 理想图依据：无基准图内该件 ⇒ 依据 deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3.1「主标题两行（28px，第二行品牌绿 + 粉色小爱心）」
- 现象：规范 §3.1 要求第二行「慢慢成为特别的人」行尾带一枚粉色小爱心，帧上该行到「人」字即结束、右侧留白，模板里 `.hero-desc hero-desc--sub` 只有纯文本、没有任何爱心 image/装饰节点。
- 建议改法：在 :601 的 `.hero-desc--sub` 之后补一枚 `--c-romance-500` 爱心 SVG（走 IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED 同族资源，不新增素材）。
- 修复类别：需新建目标功能

### R15-L01-D03　P3 / 文案　批次 R16-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__bottom.png`（sha16=`888ca7afd0f35925`）
- 源码证据：`apps/client/src/pages/login/index.vue:643`
- 理想图依据：素材/理想效果图/登录页面.png 第二枚白底描边按钮（画面读作「手机号登录」四字）
- 现象：帧上第二枚按钮渲染 `t('login.phoneQuickLogin')` = zh-CN.ts:2212「手机号快捷登录」（7 字），理想图为「手机号登录」（4 字），按钮内文字比理想图多出「快捷」二字、行宽与上下两枚按钮的字距节奏不齐。
- 建议改法：把 zh-CN.ts:2212 的 phoneQuickLogin 收为「手机号登录」，或本行改取已存在的 `login.phoneLogin` 键。
- 修复类别：单页

### R15-L01-D04　P3 / 圆角　批次 R16-B22
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__login__index__bottom.png`（sha16=`888ca7afd0f35925`，自同段前条继承）
- 源码证据：`apps/client/src/pages/login/index.vue:1031`
- 理想图依据：素材/理想效果图/登录页面.png 按钮区直接铺在页面底色上（无独立卡片容器）
- 现象：`.login-card` 声明了 `border-radius: var(--r-xl)`（:1031），但同一个类块内 :1030 `background: transparent`、:1032 `padding: 0`、:1034 `border: none`、:1035 `box-shadow: none` 把它的全部可见属性清零 ⇒ 该圆角声明在帧上没有任何消费者（帧上按钮区读不出任何卡片圆角/边界），属规范 §6 第 6 项同型的孤儿样式令牌债。
- 建议改法：删掉 `.login-card` 内无消费者的 border-radius 声明（连同模板上的 `login-card card-base` 类名一并收口），或按理想图真正启用卡片底与圆角。
- 修复类别：CSS/token

## pages/messages/index（4 条）

### R16-L02-D06　P2 / 素材缺失　批次 R16-B23
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__messages__index__top.png`（sha16=`8312c8c4f351a752`）
- 源码证据：`apps/client/src/pages/messages/index.vue:485`
- 理想图依据：素材/理想效果图/消息.png 左栏快入口卡 1 图标（1203 宽图圆底 x=60-113、y=200-257）：浅绿圆内是一枚**实心品牌绿心形**，最饱和取样 #03CB7A，圆内 62x62 区域里 luma<170 的像素 645/3844=16.8%（最低 luma 0）
- 现象：帧上同位圆底 #D1F5E7 实测 31x31px（x=28-58、y=154-184），压卡底 #E8FBF2 只有 1.09:1；圆内 34x34 窗口里 luma<170 的像素 11/1156=1.0%（最低 luma 148，最饱和档仅 #18D58D 的零星像素）——:485 绑的是 IMAGE_PATHS.MASCOT.HEART_GREEN（浅绿吉祥物），不是理想图那枚实心绿心形，整块图标在帧上只剩一层淡影，「喜欢」的语义读不出。R15-L02-D06 未修。
- 建议改法：:485/:499 改绑实心图形图标（既有 ICONS_EMOJI.HEART / CHAT 同族）并把 :1035/:1038 圆底压深一档到 #A3EBCF，保证图形对圆底 ≥3:1。
- 修复类别：CSS/token

### R16-L02-D07　P2 / 可达性　批次 R16-B23
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__messages__index__top.png`（sha16=`8312c8c4f351a752`，自同段前条继承）
- 源码证据：`apps/client/src/pages/messages/index.vue:1063`
- 理想图依据：素材/理想效果图/消息.png 快入口卡「去看看 / 去回复」药丸（1203 宽图 x≈195-275、y≈265-295，折算 378 宽 ≈ 高 19px 视觉 + 本仓 88rpx=44px 热区口径）
- 现象：帧上「去看看」描边药丸实测上缘 y=200、下缘 y=231（高 31px=62rpx，宽 x=118-163=46px），:1063 padding:12rpx 32rpx + :1073 22rpx 文字算出 62rpx，仍低于 88rpx 口径 26rpx；它是卡内唯一显式动作键，靠整卡 @tap 兜底故记 P2。R15-L02-D07 未修。
- 建议改法：:1061-1071 .quick-card__btn 加 min-height:88rpx;align-items:center（视觉高度用 :1070 margin-top 负值回收），热区补到 88rpx。
- 修复类别：CSS/token

### R16-L02-D08　P2 / 文案　批次 R16-B23
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__messages__index__bottom.png`（sha16=`e45b2f4b40e4d55b`）
- 源码证据：`apps/client/src/pages/messages/index.vue:692`
- 理想图依据：素材/理想效果图/消息.png 左栏「活动推荐」列表（1203 宽图 y≈1010-1180）：卡内只有活动名 + 时间地点 + 查看详情；「有人喜欢你」在理想图里属于页头快入口卡（y≈230）的语义，不在活动列表内；规范 §3.6 同口径
- 现象：帧上「活动推荐」第 3 张卡（标题墨迹 y=576-587、x=86-152 = 「有人喜欢你」，副标 y=596-606、x=40-148 = 「1 人喜欢了你」，CTA y=615-625 = 「查看详情 ›」）与前两张真活动（周末篮球友谊赛 y=400-450、骑行踏春活动 y=488-537）同列同版式，:692 直接把 act.title 绑到 dashboard 项上、没有按 type 过滤，点进去落的是「喜欢我的人」而不是任何活动，CTA 文案「查看详情」是骗的。R15-L02-D08 未修。
- 建议改法：activityRecommendations 计算属性按 targetUrl/type 先滤掉点赞/通知类项，或把该条改投页头快入口卡，禁止非活动项进活动列表。
- 修复类别：单页

### R16-L02-D09　P3 / 位置　批次 R16-B23
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__messages__index__bottom.png`（sha16=`e45b2f4b40e4d55b`，自同段前条继承）
- 源码证据：`apps/client/src/pages/messages/index.vue:657`
- 理想图依据：素材/理想效果图/消息.png 会话列表：每行右侧时间列对在同一竖线上（17:32 / 16:48 / 昨天，1203 宽图 x≈500-540），未读角标在其下方
- 现象：帧上第 1 行「小满」右侧时间墨迹 x=304-361、y=224-232（右缘贴到页边距 362），第 2 行「小新生」（聊天中 / 暂无消息）在 x=285-370、y=280-330 整块 0 个非白像素——:657 formatTime 在 lastMessageSentAt 为空/非法时返回空串（:390-392），时间列留空但列位仍占，两行右缘不齐、第二行看起来像缺件。R15-L02-D09 未修。
- 建议改法：无时间时兜底会话创建时间，或空值时 .chat-item__right 不占位（宽度随内容），同列两行右缘对齐。
- 修复类别：单页

## pages/nearby/index（5 条）

### R16-L02-D01　P2 / 颜色token　批次 R16-B24
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__nearby__index__top.png`（sha16=`4e70cb5decf287e1`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1069`
- 理想图依据：素材/理想效果图/附近的首页.png 页头定位针（852 宽图 x≈45-100、y≈100-165）逐像素取样最饱和档为 #04C077/#03BF78/#02BE79（品牌绿实心针）；规范 §1.2 主色 --c-brand=#36C99A
- 现象：帧上标题左侧定位针（墨迹 x=18-38、y=104-128）最饱和取样 #B3C0CC（次档 #B0BDCA/#B6C3CF，全是灰蓝），:1069 .nearby-home__pin 只给 40rpx 尺寸、无 color/filter，SVG 走 currentColor 在 <image> 里落回收成色；#B3C0CC 不在 §1.2 任何一档（最近的是边框档 #C2CAC6），理想图同位是 #04C078 绿针，页头丢掉「定位」这一层品牌色信号。R15-L02-D02 未修，本帧同一读数复现。
- 建议改法：:1069 给 .nearby-home__pin 加 filter 把针烘成 #36C99A（同页 .nearby-entry__img 已有先例），或换绑品牌绿定位针素材；副标题那枚 --sm 同治。
- 修复类别：CSS/token

### R16-L02-D02　P2 / 字号　批次 R16-B24
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__nearby__index__top.png`（sha16=`4e70cb5decf287e1`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1048`
- 理想图依据：素材/理想效果图/附近的首页.png 页头标题「附近」墨迹 x≈88-175、y≈100-160（852 宽图）折算 378 宽 ≈ 39x27px；规范 §1.3「页面主标题 26–28px / 700–800」
- 现象：帧上「附近」墨迹仅 x=42-85、y=104-125（44x22px，两字各 22px 见方），对应 :1048 font-size:48rpx=24px，比 §1.3 页头主标题 26–28px 低一档；同排「发动态」胶囊实测高 42px（y=92-133）已高于标题字面高，页头没有主标题量级。R15-L02-D03 未修。
- 建议改法：:1048 改 56rpx（28px）并固定 line-height:1.2，同时把 :579 那枚针随字号提到 48rpx，避免针字比例失衡。
- 修复类别：CSS/token

### R16-L02-D03　P2 / 文案　批次 R16-B24
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__nearby__index__top.png`（sha16=`4e70cb5decf287e1`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:663`
- 理想图依据：素材/理想效果图/附近的首页.png 全图「附近的人」只出现 1 次（五宫格首枚标签，852 宽图 x≈55-145、y≈350-380）；理想图五宫格下方直接接「热门兴趣圈」，没有第二个「附近的人」标题
- 现象：帧上同一串「附近的人」在 250px 内出现 4 次：五宫格标签 y=248-257（x=34-64）、:663 分区标题 y=292-303（x=20-74）、分区内入口卡标题 y=330-342（x=75-126）、分段控件选中项 y=454-496 内；理想图同屏 1 次。分区标题与它下面的第一张卡同名，读起来标题像是那张卡的标题，五宫格第一枚又指向同一个 goPeople，三层同词把「附近的人」到底是入口还是分区糊掉了。
- 建议改法：:663 分区标题改投既有键「距离/同城」（或「身边的人」），入口卡标题 :670 改「按距离找人」，保证一屏内该串最多出现 1 次。
- 修复类别：单页

### R16-L02-D04　P2 / 位置　批次 R16-B17
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__nearby__index__bottom.png`（sha16=`f76279a88721e3e6`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:643`
- 理想图依据：素材/理想效果图/附近的首页.png「附近动态」卡底栏（852 宽图 y≈1700-1725、墨迹 x=49-260）：♡ 128 与 💬 24 两枚计数贴在卡片**左下角**，底栏没有独立时间戳（时间在作者行「9分钟前 · 3km」）
- 现象：帧上卡 2 底栏（墨迹 y=587-599）是「4 天前」贴左（x=32-57）+ 三枚互动图标贴右（x=268-279 / 309-314 / 335-344），:643 的 justify-content:space-between 把时间与计数拉到两端，中段 x=57-268 共 211px 空带；理想图同位计数在左下（折算 378 宽 x=22-115），横向落点差 ≈210-230px。R15-L02-D04 未修。
- 建议改法：:640-645 .post-card__footer 改 justify-content:flex-start + gap:var(--sp-6)，时间戳移到作者行右侧（与理想图同构）。
- 修复类别：单页

### R16-L02-D05　P2 / 可达性　批次 R16-B17
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__nearby__index__bottom.png`（sha16=`f76279a88721e3e6`，自同段前条继承）
- 源码证据：`apps/client/src/components/village/PostCard.vue:672`
- 理想图依据：素材/理想效果图/附近的首页.png 底栏计数件（852 宽图 ♡ 字形 x≈50-72、y≈1702-1725，折算 378 宽 ≈10x10px 字形 + 同行「128」读数）；本仓自陈最小可点件口径 88rpx=44px（App.vue 口径，同页 nearby/index.vue:1080 注释亦引 88rpx）
- 现象：帧上三枚互动件墨迹分别 x=268-279、309-314、335-344（各 ≈12px 见方，行高仅 y=587-599=13px），:676 图标 36rpx(18px) + :672 padding:4rpx(2px) ⇒ 热区 44rpx=22px，只有 88rpx 口径的一半，三枚中心间距 34px/28px 也已小于热区应有的 44px；靠整卡 @tap 进详情可兜底，故记 P2 不记 P1。
- 建议改法：:668-673 .action-btn 加 min-width:88rpx;min-height:88rpx;align-items:center;justify-content:center，字形仍 36rpx，:665 gap 由 --sp-4 收到 --sp-2 以免按钮互挤。
- 修复类别：CSS/token

## pages/profile/index（6 条）

### R16-L02-D10　P2 / 文案　批次 R16-B12
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__profile__index__top.png`（sha16=`3ebb2518bea6f357`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:73`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 头部（1208 宽图 y≈175-270）三行结构化信息「21岁 · 北京大学 · 北京」/「2.3km · 在线」/「热爱生活，喜欢探索世界 ✨」；规范 §3.8 同条列「年龄学校城市 + 距离在线 + 签名」
- 现象：帧上姓名下方只有一行 bio，折成两行（第 1 行 y≈140-155，第 2 行墨迹 y=162-172、x=120-230），逐字为「修复复验简介：第二轮 2026-10-06T23:06:22 写入」——ISO 时间戳原样上屏；理想图要求的年龄/学校/城市/距离/在线五要素在帧上 0 条呈现。R15-L02-D11 未修。
- 建议改法：:73 渲染前剥掉 20\d\d-\d\d-\d\dT[0-9:]+ 片段，并把 age/campus/city/distance 按既有 DTO 字段补成独立信息行（对齐理想图三行结构）。
- 修复类别：单页

### R16-L02-D11　P2 / 颜色token　批次 R16-B11
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__profile__index__top.png`（sha16=`3ebb2518bea6f357`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:84`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 资料完整度卡说明行「完善资料可以获得更多曝光和匹配机会」（1208 宽图 y≈395-412）逐像素取样最暗 #595B5F、主档 #6B6E71/#7D7E7F（压白底 ≈5.0:1）；规范 §1.2 说明文本 = --c-text-secondary #4A524E，#9AA39F 在表内只分配给「占位」
- 现象：帧上该行说明（y=246-260 区域）在 luma<150 阈值下 0 个像素，实测色档 #9AA39F（:84 写死），压卡底白 2.59:1，低于次级文字 3:1 下限；理想图同位是 #6B6E71 档（≈5:1）。同卡 :96 的按钮文字吃 #ffffff 压 :92 绿底另计一条，本条只判说明行。
- 建议改法：:84 改 var(--c-text-secondary, #4A524E)（同组件 :51 标题已是深档），并把 :83 的 20rpx 提到 --fs-base 28rpx 与理想图说明档一致。
- 修复类别：CSS/token

### R16-L02-D12　P2 / 颜色token　批次 R16-B11
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__profile__index__top.png`（sha16=`3ebb2518bea6f357`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:92`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png「去完善」钮面（1208 宽图 x≈820-940、y≈350-395）取样主档 #1FC78C/#1FCA8D——理想图钮面本身就是低对比绿，故本条不按理想图取色，按同仓既有裁决：nearby/index.vue:1111 注记 R9-L02-D02 已把同型白字绿底 CTA 收敛到 --c-brand-800
- 现象：帧上「去完善」钮面（x=285-345、y=250-280 区域）主档实测 #36C99A（614 像素），:98 白字压其上实算 2.10:1（L=0.4489 vs 1.0），既低于正文 4.5:1 也低于大字号 3:1；钮面字号只有 :96 的 22rpx=11px，不享大字号豁免。同仓 LockScreen.vue:850 主 CTA 与 nearby 发动态胶囊都已收在 --c-brand-800（白字 6.45:1），本卡是同屏唯一漏改的白字绿底件。
- 建议改法：:92 改 var(--c-brand-800, #156B51)，与同仓主 CTA 同档；:96 字号一并提到 24rpx。
- 修复类别：CSS/token

### R16-L02-D13　P2 / 位置　批次 R16-B11
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__profile__index__top.png`（sha16=`3ebb2518bea6f357`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:15`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 资料完整度卡：条 y=366-379、读数「85%」y=355-392（x=748-790）——读数与条**同一行**、中心线只差 1px，条因此在 x=782 处让出右端；「去完善」钮（x≈820-940）也在这一行
- 现象：帧上读数「30%」被 :15 放进 head 行（与标题「资料完整度」同排，墨迹 y=210-222、右缘 x=330），条在下一排 y=235-238，两者中心线相差 20px；条 :60-66 用 align-self:stretch 铺满整列 x=47-330（284px），把理想图留给读数的右端 ≈70px 吃掉，「去完善」又被 :20 的 foot 行推到第三排（y=248-279）——理想图一排放三件，帧上拆成三排。
- 建议改法：把 :15 的读数移到 :17 条那一行右侧（条改 flex:1 + 读数 flex-shrink:0），钮仍留 foot 行，卡高回到理想图那一档。
- 修复类别：单页

### R16-L02-D14　P2 / 颜色token　批次 R16-B25
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__profile__index__bottom.png`（sha16=`9c130855df6fb67c`）
- 源码证据：`apps/client/src/pages/profile/index.vue:1702`
- 理想图依据：无该区块基准，依据=规范文档 §1.2（图标色须落在色板档内：主色 #36C99A / 次文本 #4A524E / 边框 #DDE3E0）+ §1.4 非文本图形 ≥3:1 口径；同页同卡文字档 :3037 .video-cta__text 取 --c-brand-700 绿
- 现象：三张卡的图标全部糊成灰蓝：麦克风（墨迹 x=182-196、y=158-177）在 26x30 窗口内 luma<170 的像素 1/780=0.1%（最低 luma 169），主色档实测 #B5C0CC（次档 #CED5DF/#D8DDE5）压白圆 1.85:1；相机（y=352-370）、分享（y=506-526）同色同档。:1702/:1779/:1801 三枚 <image> 走 currentColor SVG、:3019 .video-cta__icon 只有 48rpx 尺寸没有取色，而同一块下面的标签文字是品牌绿 #1F8D6A 档——钮面读得出、钮上的图标读不出。
- 建议改法：给 .video-cta__icon 加 filter 把三枚图标烘成 --c-brand-700 #1F8D6A（与 :3037 标签同源），或在组件内改绑已烘色的同语义素材。
- 修复类别：CSS/token

### R16-L02-D15　P3 / 文案　批次 R16-B25
- 帧：`tmp/qa/frames/R16/real-f0677920/pages__profile__index__bottom.png`（sha16=`9c130855df6fb67c`，自同段前条继承）
- 源码证据：`apps/client/src/pages/profile/index.vue:1764`
- 理想图依据：规范文档 §3.8 同页组件口径「卡片标题 + 说明 + 面板」三段式（我的互动/更多功能两节的既有口径）；素材/理想效果图/已经填完资料的个人主页.png 各区块一律「标题只出现一次」
- 现象：本帧同一列三张卡的层级件数不一致：卡 1 有标题（y=74-86、x=48-186）+ 提示（y=100-110）+ 面板标签（y=196-208）三段；卡 2 只有标题（y=290-302、x=48-119）+ 面板标签（y=391-403、x=158-220），且两处逐字同为「编辑背景图」——同一句在一张卡里写两遍、提示段缺席；卡 3（推荐给好友）连标题行都没有，只剩面板标签（y=546-558）。三卡标题行起点因此落在 y=74 / y=290 / 无，扫读时第三张卡像一张按钮而不是一节。
- 建议改法：三卡统一「标题 + 一句提示 + 面板」三段：卡 2 面板标签改「点击更换背景图」，卡 3 补 section-header（复用 :1764 那套类）并把面板标签改「分享给同学」。
- 修复类别：单页

## pages/register/index（4 条）

### R15-L01-D05　P2 / 间距　批次 R16-B26
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__top.png`（sha16=`148914496ff3a924`）
- 源码证据：`apps/client/src/pages/register/index.vue:944`
- 理想图依据：无基准页，依据=规范文档 §1.4「卡片内边距 --card-padding = 32rpx = 16px」（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:85）
- 现象：`.card` 内边距裸写 40rpx（20px）而非 --card-padding（32rpx/16px）。帧实测：白卡左边缘 x=17px（=32rpx 页边距，正确），卡内输入条左边缘 x≈37px ⇒ 内衬实算 20px=40rpx，比规范档多 8rpx；同页 `.field` 之间的纵向节奏也因此整体外扩，六行表单在 814px 视口内被挤到需要滚动才见全。
- 建议改法：`padding: 40rpx` 改 `padding: var(--card-padding, 32rpx)`，与全站卡片内衬同档。
- 修复类别：CSS/token

### R15-L01-D06　P2 / 字号　批次 R16-B26
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__top.png`（sha16=`148914496ff3a924`，自同段前条继承）
- 源码证据：`apps/client/src/pages/register/index.vue:957`
- 理想图依据：无基准页，依据=规范文档 §1.3 字体层级表「标题 --fs-3xl/4xl = 18/20px 700 · 区块标题」
- 现象：分区标题「账号信息」「基础身份」是本页仅有的两级区块标题，`.card__cap text` 取 24rpx（12px），落在规范 §1.3 的「小字 --fs-md/base 13/12px · 标签·时间戳」档，比区块标题应取的 18px 低两档；帧上它与紧邻的字段标签 `.field__label`（var(--fs-md)=26rpx/13px）字号几乎相同，仅靠 font-weight:700 区分，两级层级读不出来。
- 建议改法：`.card__cap text` 取 `var(--fs-3xl, 36rpx)`（18px）或至少与 `.field__label` 拉开一档（28rpx 以上）。
- 修复类别：CSS/token

### R15-L01-D07　P3 / 文案　批次 R16-B26
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__bottom.png`（sha16=`fb65a7a7535a9eda`）
- 源码证据：`apps/client/src/pages/register/index.vue:774`
- 理想图依据：无基准页，依据=规范文档 §1.3「正文/动作行取档」+ §1.1 第 3 条「一令牌一值、禁止私写」的排版口径（同页动作行统一由 letter-spacing 控制字距）
- 现象：主提交钮文案硬编码为 `"注 册"`（两字之间塞了一个 ASCII 空格，加载中态同样写成 `"注 册 中"`）。同块 `.submit-btn__text` 已带 `letter-spacing: 0.8rpx`（:1236）负责字距，再手插空格等于双重加距，且与同页其余动作行（「获取验证码」「已有账号？ 去登录」）无内插空格的写法不一致。
- 建议改法：改为 `"注册"` / `"注册中"`，字距只由 letter-spacing 单点决定。
- 修复类别：单页

### R15-L01-D08　P2 / 间距　批次 R16-B26
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__index__bottom.png`（sha16=`fb65a7a7535a9eda`，自同段前条继承）
- 源码证据：`apps/client/src/pages/register/index.vue:1295`
- 理想图依据：无基准页，依据=规范文档 §1.4「页边距 --page-padding = 32rpx」+ 同页 `.card` 的左基准线
- 现象：`.agree { margin: 30rpx 48rpx 0 }` 左右写死 48rpx，而它正上方的白卡 `.card` 走 `var(--page-padding, 32rpx)`（:941，帧上实测卡左缘 x=17px=32rpx）。协议行因此比卡片左缘再内缩 16rpx（≈8px），帧上勾选方框明显比白卡边缘往里错开一条；上边距 30rpx 也是 --sp-* 阶梯外孤值（--sp-5=20rpx / --sp-6=24rpx，design-variables.scss:551-552）。
- 建议改法：`margin: var(--sp-6, 24rpx) var(--page-padding, 32rpx) 0`，与卡片同一条左右基线。
- 修复类别：CSS/token

## pages/register/success（3 条）

### R15-L01-D09　P2 / 间距　批次 R16-B27
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__success__top.png`（sha16=`e4af9f141ba2d8cd`）
- 源码证据：`apps/client/src/pages/register/success.vue:93`
- 理想图依据：无基准页，依据=规范文档 §1.4「页边距 --page-padding = 32rpx = 16px」
- 现象：根容器 `.reg-success` 左右内衬裸写 48rpx（24px），不是 --page-padding（32rpx）。帧实测：清单白卡左边缘落在 x=25px（378px 宽帧 ⇒ 50rpx，含卡自身描边 AA），而同帧宽下首页卡片左缘 x=17px（34rpx）、注册页白卡左缘 x=17px（33rpx）⇒ 本页比全站页边距基线多出约 16rpx，三页并排看卡宽明显窄一档。
- 建议改法：`padding: calc(...) var(--page-padding, 32rpx) calc(...)`，与 login/register/home 同一条左右基线。
- 修复类别：CSS/token

### R15-L01-D10　P2 / 可达性　批次 R16-B27
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__success__top.png`（sha16=`e4af9f141ba2d8cd`，自同段前条继承）
- 源码证据：`apps/client/src/pages/register/success.vue:76`
- 理想图依据：无基准页，依据=规范文档 §1.5 组件库清单「登录 WechatBtn/PhoneBtn」+ 同域 login/index.vue:616-624 主 CTA 的 role/aria-label/hover-class 口径
- 现象：本页唯一主操作「完善我的资料 →」的容器 `<view class="reg-success__btn" @tap="goSetupProfile">` 没有 `role="button"`、没有 `aria-label`、也没有 `hover-class`/`press-feedback`；对照同域登录页同一档主 CTA（login/index.vue:617-620 带 press-feedback + hover-class + hover-stay-time + role="button" + aria-label）。帧上按压缩放/透明度反馈缺失，读屏侧只读到一段裸文本，拿不到「这是按钮、点了去哪」。
- 建议改法：给 :76 的 view 补 `role="button" :aria-label="'完善我的资料'"` 与 `class="press-feedback" hover-class="press-feedback--active" hover-stay-time="40"`（本页 :252-259 已有这两个类，直接挂上即可）。
- 修复类别：单页

### R15-L01-D11　P2 / 颜色token　批次 R16-B27
- 帧：`tmp/qa/frames/R15/real-f0677920/pages__register__success__bottom.png`（sha16=`e4af9f141ba2d8cd`）
- 源码证据：`apps/client/src/pages/register/success.vue:147`
- 理想图依据：无基准页，依据=规范文档 §1.1 色彩令牌「次级正文取 --c-text-secondary」+ §1.3 字号层级（26rpx=13px 属正文/次级文字档，需 ≥4.5:1）
- 现象：副标题两行「欢迎加入寻觅，接下来用 1 分钟 / 把资料填成一张「恋爱名片」」取 `--c-text-tertiary #6B7571` 压页面底 `--c-bg-page #EEF7F2`，实测对比度 4.38:1（L1=0.9115、L2=0.1697），落在 3:1–4.5:1 带内；帧上 13px 副标题比下方白卡内同色 tag（压白卡 4.76:1）明显更淡，两行读成水印。
- 建议改法：`.reg-success__sub-line` 改取 `--c-text-secondary`（#4A524E，压 #EEF7F2 ≈ 8.0:1），或把副标题放到白卡底上承载。
- 修复类别：CSS/token

## subpackages/campus/campus/certification（2 条）

### R15-L05-D10　P3 / 圆角　批次 R16-B28
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`08e19a93a37a45bd`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:713`
- 理想图依据：无基准页；依据=规范文档§1.4 卡片圆角 --card-radius 40rpx + 同域 post-topic.vue:835-837（R11-L05-D09 已把卡片档从 --r-xl 24rpx 收到 40rpx）
- 现象：本页全部表单卡（为什么要认证/学校名称/专业/学生证照片）圆角取 var(--r-xl)≈24rpx(12px)，帧上与同域发帖页卡（40rpx/20px）并排对比明显偏小——R11 统一卡片档时只改了 post-topic，certification 漏改，同域两页取档不一。
- 建议改法：.form-group border-radius 改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R15-L05-D11　P3 / 文案　批次 R16-B28
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`497107a9a98f53bd`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:405`
- 理想图依据：无基准页；依据=规范文档§1.1 逐元素对照还原原则 + 表单说明应指向本字段
- 现象：「学信网验证码」卡（:390）与「学信网截图」卡（:405）复用同一个 chsiHint 键，帧上两卡说明逐字相同「选填：提供学信网在线验证码或学历截图可加快审核」——验证码字段下的提示提「学历截图」，指代错位且相邻两屏复读。
- 建议改法：拆两个 i18n 键，验证码卡只述验证码、截图卡只述截图。
- 修复类别：单页

## subpackages/campus/campus/hub（7 条）

### R16-L04-D01　P2 / 颜色token　批次 R16-B29
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`25e13c542eb507ab`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:251`
- 理想图依据：素材/理想效果图/校园圈.png 横幅左侧学士帽：853px 稿实测 x73–117、y273–312（45×40px），实心品牌绿 #0FBB99
- 现象：横幅左端那枚 40rpx 学士帽在帧上只有 19×17px 的灰蓝描边（暗部实测 #AAB8C7，来自素材 graduation-cap.svg:1 硬编码 stroke=#94A3B8），理想图同位是 45×40px 的实心绿 #0FBB99。R11-L04-D17 只撤掉了白色托盘（见 :566-571），"换/改素材"那半至今未落地 ⇒ 横幅唯一的图形标记仍是整条横幅上最淡的一笔。
- 建议改法：换一枚 brand 绿描边的学士帽 SVG（本页引用改指向新素材），或在本页改用 mask + var(--c-brand-600) 着色。
- 修复类别：单页

### R16-L04-D02　P2 / 位置　批次 R16-B29
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`25e13c542eb507ab`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:662`
- 理想图依据：素材/理想效果图/校园圈.png 分段 tab 行：853px 稿「我加入的」x97–191、「推荐圈子」x284–378
- 现象：帧上「我加入的」首字 x=19px（38rpx），只比卡片左缘 16px 内缩 3px；理想图同排首字 97px@853=85rpx，相对卡片左缘（39px）内缩 58px（51rpx）。两枚 tab 的间距帧上 26px（52rpx），理想 93px（82rpx）。.campus-hub__tab 只有 margin-right:48rpx（:662）、没有左内衬 ⇒ 整排 tab 压到栅格左线上，比理想左移约 47rpx。
- 建议改法：.campus-hub__tab 补左右内衬 24rpx、两枚间距放到 80rpx 档（或 .campus-hub__tabs 加 padding-left:40rpx）。
- 修复类别：CSS/token

### R16-L04-D03　P2 / 可达性　批次 R16-B29
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`25e13c542eb507ab`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:601`
- 理想图依据：素材/理想效果图/校园圈.png 横幅右侧「去认证」胶囊（853px 稿 x656–782、y268–322=127×55px）+ 规范文档§1.4 触控口径 88rpx
- 现象：横幅「去认证」钮命中盒实测 59×32px=117×63rpx（绿底 bbox x288–346、y163–194），高度只有 88rpx 口径的 72%；同页学校卡「申请加入」同款 CTA 已在 :926 有 min-height:88rpx（帧上实测 45px=89rpx），唯独横幅这颗仍只靠 padding:14rpx（:601）撑高。白字压深绿底 5.9:1 已达标（R15-L04-D12 已落地），本条只剩热区高度；因非必点入口，按 P2 不升 P1。
- 建议改法：.campus-guide__btn 补 min-height:88rpx，行高内垂直居中不变。
- 修复类别：单页

### R16-L04-D04　P2 / 尺寸比例　批次 R16-B29
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`25e13c542eb507ab`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:548`
- 理想图依据：素材/理想效果图/校园圈.png 横幅：853px 稿 y233–358=126px（111rpx），x45–807
- 现象：横幅帧上 y147–212=66px（131rpx），比理想 111rpx 高 20rpx；上下内衬 28rpx×2（:548）对比理想约 18rpx×2，多出的 20rpx 把搜索框（y226–263，76rpx）、tab 行、首卡整体下推约 10px，首屏能完整看到的学校卡因此少一张。
- 建议改法：.campus-guide 纵向内衬 28rpx→18rpx（左右不变），横幅回到 111rpx 档。
- 修复类别：CSS/token

### R16-L04-D05　P3 / 文案　批次 R16-B19
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`25e13c542eb507ab`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3627`
- 理想图依据：素材/理想效果图/校园圈.png 横幅主句逐字「加入校园圈，发现更多同校的TA」
- 现象：帧上主句是「加入校园圈，发现更多同校的 TA」，TA 前有一个半角空格（词条原文 zh-CN.ts:3627 含空格，帧上 TA 前可见约 4px 空档）；理想图同句无空格。
- 建议改法：删掉词条里「的」与「TA」之间的空格，与理想图逐字一致。
- 修复类别：单页

### R16-L04-D06　P2 / 可达性　批次 R16-B29
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`960024faaa631e19`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:947`
- 理想图依据：素材/理想效果图/校园圈.png 列表尾「查看更多校园圈 ⌄」（853px 稿 x263–503、y1690–1712）+ 规范文档§1.4 触控口径 88rpx
- 现象：页尾「查看更多校园圈 ⌄」是列表唯一的展开入口（:364-373，role=button），命中盒 = 上 32rpx + 下 20rpx（:947）+ 24rpx 文本行（:956，约 29rpx）≈81rpx；帧上文字墨迹 y706–718（12px），加上下内衬 26px 合计约 40px=79rpx，低于 88rpx（:946 注释称「合计 ≥88rpx」，但 32+20+24×1.2≈81rpx 并不成立）。同页卡片 CTA 均为 88rpx，本行是页内最矮的可点控件。
- 建议改法：纵向内衬改 32rpx 0 32rpx（或直接补 min-height:88rpx），并把 :946 的注释同步成实算值。
- 修复类别：CSS/token

### R16-L04-D07　P2 / 间距　批次 R16-B29
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`960024faaa631e19`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:774`
- 理想图依据：素材/理想效果图/校园圈.png 学校卡名行：853px 稿校名止于 x390、「未认证」胶囊起于 x415（间距 25px=22rpx）
- 现象：名行 gap 取 8rpx（:774，R11-L04-D18 为把 7 字校名挤进一行而收窄）；帧上首卡校名墨迹止于 x167、胶囊底色起于 x174，只剩 7px（14rpx），胶囊几乎贴住校名。理想图同位间距 25px@853，折 378 宽为 11px。本轮封面已从 160rpx 收到 132rpx（实测 67px，正文因此多出 28rpx 宽），7 字名仍在单行，这段间距已有回档空间。
- 建议改法：.campus-school-card__name-row 的 gap 8rpx→20rpx（:774），7 字名 + 胶囊仍可同排。
- 修复类别：CSS/token

## subpackages/campus/campus/index（4 条）

### R16-L05-D01　P2 / 颜色token　批次 R16-B30
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`55ddf994d1f754ea`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:732`
- 理想图依据：无基准页；依据=规范文档§1.2 选中态色档（--c-brand 只作主按钮底色，浅底上作字须取 brand-700/800）+ 同域已采信同型口径 index.vue:924-929（R10-L05-D04 把计数从 #36C99A 收 --c-brand-800 5.96:1）
- 现象：选中分类瓷片「课程交流」的标签取 $green-primary #36C99A，压在 .category-tab--active 的浅绿渐变底上（index.vue:721-723，帧上取样 #E8F6EB / #E8F9F1）：帧像素实测对比 1.91:1（令牌真值 #36C99A 对 #E8FAF3 = 1.94:1），26rpx(13px)/700 不属大字豁免，选中态唯一的文字信号读不出；同排未选中的「社团招新」是 #676F6B 压 #EEF7F2 ≈ 4.8:1，选中项反而比未选中更淡。
- 建议改法：`.category-tab--active .category-tab__label` 的 color 改 var(--c-brand-800, #156B51)（对同底 5.96:1），选中态靠深绿字+浅绿底双信号区分。
- 修复类别：CSS/token

### R16-L05-D02　P2 / 间距　批次 R16-B30
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`55ddf994d1f754ea`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:1029`
- 理想图依据：无基准页；依据=规范文档§1.4 页边距 --page-padding 32rpx / 同页引导卡 .cert-guide-card margin 20rpx 24rpx（index.vue:616）与话题卡 .topic-card 左右 24rpx 内缩的既有画面
- 现象：「热门兴趣圈」卡只有 `margin-top: 24rpx`、没有左右外边距，帧上卡体白底横跨 x=3..375（=整屏 750rpx），而同屏上方引导卡占 x=12..366、下方话题卡占 x=14..364（左右各 24rpx）；卡内 24rpx 内衬因此把「热门兴趣圈」标题推到 x≈18px，比「完成学生认证」「高数期中复习资料分享」两处标题的起排线（x≈30px / x≈36px）左移 12–18px，竖排栅格断一档。
- 建议改法：`.cert-recommend` 补 `margin: 24rpx 24rpx 0`（左右与 .cert-guide-card / .topic-card 同吃 24rpx 页边），标题回到同一条起排线。
- 修复类别：单页

### R16-L05-D03　P3 / 圆角　批次 R16-B30
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`55ddf994d1f754ea`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:803`
- 理想图依据：无基准页；依据=规范文档§1.4 卡片圆角单档 --card-radius 40rpx（theme/design-variables.scss:699）+ .card-base 全站统一出口（theme/global.scss:150）
- 现象：同屏两张卡取两个圆角档：「热门兴趣圈」走 .card-base 得 40rpx（帧角弧拟合半径≈16px≈32rpx，左上角 y=215 行白区左端从 x=15 收到 x=3），下方话题卡 `.topic-card` 取 var(--r-xl) 24rpx（design-variables.scss:446 → 202，帧角弧拟合半径≈10px≈20rpx，y=458 行左端从 x=21 收到 x=14）；两张卡上下相距不到 40px，圆角一大一小并置可见。
- 建议改法：`.topic-card`（及同页 .cert-guide-card）圆角统一改 var(--card-radius, 40rpx)，与 .card-base 收同一档。
- 修复类别：CSS/token

### R16-L05-D04　P2 / 可达性　批次 R16-B30
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`b3726a175a00cb4d`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:965`
- 理想图依据：无基准页；依据=规范文档§1.2 次文本档（--c-text-tertiary #6B7571 用途＝占位/尾注）+ 正文 4.5:1 门槛；同页时间戳 R15-L05-D02 已因同一 4.36:1 收档，尾态提示未跟上
- 现象：列表尾态「没有更多了」取 $text-tertiary #6B7571 压 $bg-page #EEF7F2，令牌真值 4.36:1（帧上 bottom 帧 y=615..623、x=161..217 的实测最深处 #7A847F ≈3.54:1），24rpx(12px) 正体不属大字豁免，低于 4.5:1；同页日期胶囊已按同一读数改 $text-secondary（7.37:1），这条到底是本页唯一的“列表已完”信号却仍是全页最淡的一档字。
- 建议改法：`.no-more__text` 的 color 改 $text-secondary（对同底 7.37:1），与 .topic-card__time 同档。
- 修复类别：CSS/token

## subpackages/campus/campus/post-topic（4 条）

### R15-L05-D04　P3 / 颜色token　批次 R16-B31
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`ffee91d30f6ea98a`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:914`
- 理想图依据：无基准页；依据=规范文档§1.2（输入底 --c-bg-surface）+ 同域 certification.vue:743-744 输入框已按 R6-L06-D16 收「#F3FAF6 底 + 2rpx --c-border-default 描边」
- 现象：「话题标题」输入框 border: 2rpx solid transparent、底 $bg-page，与同域认证页输入框（浅底+可见描边）取档不一：同是白卡内输入控件，一页有框一页无框，靠色块勉强分辨。内容框（:944）同款。
- 建议改法：.title-input/.content-input 边框改 var(--c-border-default)，与 certification.vue 输入角色同口径。
- 修复类别：CSS/token

### R15-L05-D05　P3 / 间距　批次 R16-B31
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`ffee91d30f6ea98a`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:850`
- 理想图依据：无基准页；依据=规范文档§1.4 间距档位表（--sp-1~10 = 2/4/6/8/10/12/16/32/48rpx，无 14rpx 档）
- 现象：分类瓷片行/列 gap 写死 14rpx（:845 与 :850 两处），不在 --sp 档位表内，帧上瓷片横向间隙 7px，与全站 12/16rpx 档都对不上，属私设值。
- 建议改法：gap 收 var(--sp-3, 12rpx) 或 var(--sp-4, 16rpx) 档内取值。
- 修复类别：CSS/token

### R15-L05-D06　P2 / 可达性　批次 R16-B18
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`b9d3a27b3e9687b2`）
- 源码证据：`apps/client/src/components/village/TopicSelector.vue:363`
- 理想图依据：无基准页；依据=规范文档§1.2（quaternary #9AA39F 为占位档）+§1.3（10/11px 极小档仅限角标·法务）
- 现象：「暂未选择任何话题」空态提示 20rpx(10px) + --c-text-quaternary #9AA39F 压 --c-bg-secondary 浅绿底，帧上实测约 2.3:1 且字号低于正文两档，空态引导基本读不到。
- 建议改法：.topic-selector__empty-text 改 var(--fs-sm) + var(--c-text-tertiary)。
- 修复类别：CSS/token

### R15-L05-D07　P2 / 可达性　批次 R16-B18
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`b9d3a27b3e9687b2`）
- 源码证据：`apps/client/src/components/village/TopicSelector.vue:377`
- 理想图依据：无基准页；依据=全站 88rpx 热区档（同文件 R14-L05-D02 已把创建输入框 72→88rpx）
- 现象：「搜索话题」输入框 height 仍是 60rpx(30px) < 88rpx——上一轮 R14-B16 把同卡「创建新话题」输入框抬到 88rpx，搜索框漏修，同排两个输入一高一低（帧上搜索框明显矮一截），属上一轮只修一半。
- 建议改法：.topic-selector__search-input height 60rpx → 88rpx，与创建输入框同批抬齐。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（2 条）

### R15-L05-D08　P2 / 位置　批次 R16-B32
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`f55954ca5bd6ada1`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:479`
- 理想图依据：无基准页；依据=规范文档§1.4 页边距 --page-padding 32rpx + 同域 index.vue 帖子卡左右均留 24rpx 的既有画面
- 现象：.detail-body 声明 padding 24rpx，但帧上作者卡/正文卡/回复卡右缘全部顶穿屏幕右缘（左缘留白正常），日期「2026/09/26」贴死屏边、卡片右侧圆角整段不可见——内容横向溢出约一个右内衬宽，top/bottom 两帧同态。
- 建议改法：给 .detail-body 补 box-sizing: border-box（或排查其内 scroll-view 内容撑宽），恢复右侧 24rpx 留白。
- 修复类别：单页

### R15-L05-D09　P2 / 可达性　批次 R16-B32
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`71d84ea772a0dbfc`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:632`
- 理想图依据：无基准页；依据=同域 index.vue:893-899 R10-L05-D04 已裁定的同型口径（#36C99A 压 #E8FAF3 = 1.94:1 → 收 --c-brand-800 5.96:1）
- 现象：「回复」计数胶囊「0」$green-primary #36C99A 压 $green-light #E8FAF3 ≈1.94:1，帧上回复数几乎与底同色——同一条缺陷同域 index.vue 上轮已修，本页漏网。
- 建议改法：.replies-count 色改 var(--c-brand-800, #156B51)，与 index.vue 同口径。
- 修复类别：CSS/token

## subpackages/chat/chat-session/index（2 条）

### R15-L11-D07　P2 / 文案　批次 R16-B33
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`d4fad20dffe9e3d1`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:1986`
- 理想图依据：无基准页；依据=§3.7 聊天会话布局第一段「顶部对方头像/昵称」+ 同域 official-chat 页头恒有页名；实测 R16 重拍帧页头带 x60-290/y40-100 墨迹 0 像素
- 现象：R16 重拍帧仍是「缺少会话标识，请从聊天列表或匹配结果进入。」错误态，此状态不渲染 LockScreen（无插画/进度条/权益图标，本轮唯一改动到不了这里）。页头 .chat-error-header（:1986）只渲染一枚返回键 ‹（实测 x30 附近），标题带 y40-100、x60-290 实测 0 个墨迹像素——整页没有任何页名。撤身份带（头像/昵称/在线态）是对的，但连「聊天」这种不编造关系的中性页名也一并撤掉了，深链落到错误态时屏幕顶部是一条空白带。
- 建议改法：在 .chat-error-header 内补一枚居中 <text class="chat-error-header__title">聊天</text>（18px/--c-text-primary），只恢复中性页名，不恢复昵称/认识天数/在线态。
- 修复类别：单页

### R15-L11-D08　P2 / 颜色token　批次 R16-B33
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`6142ec6dbae71182`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2755`
- 理想图依据：无基准页；依据=规范文档 §1.2 主色浅档 --c-brand-100 #D1F5E7/描边档 + 非文本控件轮廓 3:1；实测键底 --c-bg-brand #E8FBF2 压白输入条 ≈1.08:1
- 现象：R16 重拍帧底部两枚动作键「返回 / 消息」（实测 y734-776、合计 x127-252）底取 --c-bg-brand #E8FBF2（:2755），压在纯白输入条（y733 起 #FFFFFF）上实测 ≈1.08:1，远低于非文本控件 3:1 地板——键体几乎无边界，屏上只剩两段深绿字（--c-brand-800 #156B51，对白 5.9:1 已达标）浮在白底里；此状态不渲染 LockScreen。热区 min-height:88rpx（:2748）与文案均达标，故为可辨识性偏差、非阻断，判 P2。
- 建议改法：键底改 --c-brand-100 #D1F5E7（对白 1.17:1）并补 1rpx var(--c-brand-800) 描边（5.5:1），或直接改实心 --c-brand-800 + 白字；文字色与 88rpx 热区不动。
- 修复类别：CSS/token

## subpackages/chat/official-chat/index（2 条）

### R15-L11-D09　P2 / 位置　批次 R16-B34
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`817fdf2da90f9377`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:683`
- 理想图依据：无基准页（§3 未收录该页）；依据=§3.7 聊天页头居中档 + 微信胶囊安全距；实测 R16 重拍帧标题组 x88-205（组心 146）vs 屏宽中心 189
- 现象：R16 重拍帧页头标题组「寻觅助手」+「官方」角标（含副标「你的恋爱小管家」）实测 x88-205，组心 x146；屏宽 378 的中心是 x189，整组左偏 43px（86rpx）。右缘到微信胶囊（x288）空 83px，左缘到返回键只 60px——头部重心明显偏左。此页此状态不渲染 LockScreen。根因：.nav-bar 右侧同时留 184rpx(92px) 胶囊位（:639）与 80rpx(40px) 的 .nav-right，.nav-center 的 flex:1（:683）只在 x52-246 这 194px 里居中，居中点 x149 天然比屏心偏左 40px。
- 建议改法：.nav-center 改 position:absolute;left:0;right:0;top:0;bottom:0 全宽居中（胶囊位只作用于右侧按钮的 padding），或保持 flex 但把 .nav-right 改 position:absolute;right:0。
- 修复类别：CSS/token

### R15-L11-D10　P2 / 可达性　批次 R16-B34
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`468766fb4f76027d`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:1113`
- 理想图依据：无基准页；依据=规范文档 §1.3 正文 28rpx 不享大字豁免 + §1.2 三级文本 #6B7571；实测占位符 token #9AA39F 压输入底 #F5F6F8 = 2.39:1
- 现象：R16 重拍帧输入框占位「对我说点什么吧～」取 --c-text-placeholder #9AA39F（:1113），压 .input-bar__field 底 #f5f6f8（:1100）算得 2.39:1；帧上占位墨迹最暗约 #909090（R=G=B 中性灰，说明 placeholder-class 在 mp-weixin 未吃到绿相灰 token、回落默认灰）≈2.99:1。28rpx=14px 正文级不达 4.5:1，弱光下这句唯一的输入指引读不出。此页此状态不渲染 LockScreen。输入框仍可点、发送键可见，属可读性偏差、非阻断，判 P2。
- 建议改法：确认 placeholder-class="input-placeholder" 在 mp-weixin 生效，并把颜色抬到 --c-text-tertiary #6B7571（对 #f5f6f8 约 4.4:1，较现值近翻倍）；字号 28rpx 不动。
- 修复类别：单页

## subpackages/circles/circles/circle-home（3 条）

### R15-L04-D09　P2 / 尺寸比例　批次 R16-B35
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`b0528a4e5f6a841a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1017`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png hero 底部标签行：4 枚短标签（摄影技巧/风景拍摄/人像写真/城市漫游）同一行排布（853px 稿 y≈400–448，单行高 48px），行内无截断
- 现象：.topic-chip-row 是 `flex-wrap: wrap`（:1017）+ 单条 max-width:100%（:1031），real 档话题标题长，帧上 4 条 chips 被拆成 2 行（第 1 行基线 y≈150、第 2 行 y≈190，行距 40px≈79rpx），第 2 条「# 交换一张最近拍得最满意的…」在行末以省略号截断；理想图同位是单行 4 枚、全文可见。R13-L04-D07 补的这条 chips 行只对齐了"入口存在"，没对齐理想图"单行 4 枚"的排布。
- 建议改法：该行改单行 `flex-wrap: nowrap; overflow-x: auto`（或每条限 max-width 22% + 文案 ellipsis），保证 hero 底部只占一行、且不留半句截断。
- 修复类别：CSS/token

### R15-L04-D10　P2 / 可达性　批次 R16-B35
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`25ce0d054dba4c31`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1243`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png feed 卡右上「⋯」为独立三点菜单；按 §1.4 触控口径 88rpx 要求命中区
- 现象：每张 feed 卡右上角的「⋯」（苏奈/草莓/阿辰三张卡 y≈130/300/475 处）是 32rpx×32rpx=16px×16px 的 <image>（.feed-more:1243-1245），直接挂 @tap.stop（:633）；命中区只有 16px，远低于 88rpx=44px，点偏就冒泡成卡片的 @tap 直接进详情，与「⋯」的动作相反。
- 建议改法：给 .feed-more 外套一枚 88rpx×88rpx 的透明命中盒（图标仍 32rpx），并把 @tap.stop 移到命中盒上。
- 修复类别：CSS/token

### R15-L04-D11　P2 / 圆角　批次 R16-B35
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`25ce0d054dba4c31`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1327`
- 理想图依据：无对应元素（理想图 feed 卡为无底色分隔行）；依据=规范文档§1.4「卡片圆角 --card-radius 40rpx=20px」+ 同页 .feed-card 24rpx 取档
- 现象：底部白条「查看全部话题 ›」取 `border-radius: 16rpx`（=8px，:1327），而它正上方的 .feed-card 取 24rpx（=12px，:1171）；帧上 y≈675–705 这条白条的四角明显比上方三张 feed 卡更方，同页两套圆角档并存，二者又都低于 §1.4 的 40rpx。
- 建议改法：.topics-link 圆角改 var(--card-radius, 40rpx)，与 .feed-card 一并收档。
- 修复类别：CSS/token

## subpackages/circles/circles/index（3 条）

### R15-L03-D15　P2 / 颜色token　批次 R16-B36
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`93859223a80c3ef0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:1026`
- 理想图依据：兴趣圈列表.png 分类行——「全部」外每枚未选中分类均为可辨浅灰胶囊（理想图实测底 ≈#F5F6F6 压白页，明度差约 10 级）
- 现象：帧上未选中 chip 底色 PIL 实测 #F3FAF6(243,250,246)，页面底实测 #EEF7F2(238,247,242)，RGB 差仅 (5,3,4)≈不可辨——「摄影/旅行/音乐/运动/美食」在帧上读作裸文字，胶囊轮廓整排消失；R8-L03-D21 对此轴的既往修法参照系取错（注释按「对卡面 #FFFFFF 拉开一档」选色，而 chip 实际坐在 #EEF7F2 页面底上，浅绿叠浅绿仍无档），本轮画面未变、按同轴新缺陷计
- 建议改法：未选中底改比页面底深一档的令牌（如 brand-100 反相档或 --c-border-light #EEF2F0 加深 + 可见描边），保证对 #EEF7F2 页面底 ΔL≥8
- 修复类别：CSS/token

### R15-L03-D16　P3 / 颜色token　批次 R16-B36
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`93859223a80c3ef0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:947`
- 理想图依据：兴趣圈列表.png 页头右端放大镜 = 深墨色裸图标（无圆底、无浅化）
- 现象：帧上搜索钮放大镜实测灰档（.circles-header__search-icon color --c-text-tertiary #6B7571）且压在 64rpx 浅底圆上（:925 背景 #F3FAF6 对页面底同样不可辨），理想图为无底的深墨放大镜，色档与承托两层都不一致
- 建议改法：图标墨色升 --c-text-primary 档，去圆底或让圆底对页面底成档
- 修复类别：单页

### R15-L03-D17　P3 / 素材缺失　批次 R16-B36
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`5154ed7531844887`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:505`
- 理想图依据：兴趣圈列表.png 全列封面均为同族实拍摄影图（人像/房车/演唱会/滑板/餐食/星空，质感一致）
- 现象：帧上同列封面实测两套画风混排——摄影/旅行/音乐/运动四枚为马卡龙扁平插画（circle-cover-*.jpg，§5 本批 AI 素材），美食/游戏/阅读/宠物四枚为实拍照片（含金毛犬、机械键盘），列表内插画压照片，风格断层且与理想图全实拍族不符
- 建议改法：按理想图锚点把 4 张插画封面重制为实拍风（或反向统一其余圈为插画风并改判理想图），映射在 config/circle-covers.ts 一处换资产
- 修复类别：需新建目标功能

## subpackages/circles/circles/post-topic（3 条）

### R15-L04-D06　P2 / 颜色token　批次 R16-B37
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`2392a6f74655024d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:1048`
- 理想图依据：无基准，依据=规范文档§1.2 文本档（次文本 --c-text-secondary #4A524E / 占位 --c-text-placeholder）+ 同页 R10-L04-D09 已定的选中态实算档
- 现象：「已选：校园圈」这行字色是 $green-primary（:772 = var(--c-brand) 真值 #36C99A，design-variables.scss:15）压在 .target-name 的 $bg-page（:777 = var(--c-bg-page) #EEF7F2，:127）上，实算约 2.05:1，低于次级文字 4.5:1、也低于非文本 3:1；同页同根因的 .target-chip--active 文字已在 R10-L04-D09 收进 --c-brand-800（:1002），这条同族回显行漏改，帧上它是全页最淡的一行绿字。
- 建议改法：.target-name__text 颜色同步收成 var(--c-brand-800, #156B51)，与同页已选 chip 同档。
- 修复类别：CSS/token

### R15-L04-D07　P2 / 圆角　批次 R16-B37
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`2392a6f74655024d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:886`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx=20px」（design-variables.scss:699）+ §3.14 统一发布页卡片档
- 现象：版面上 4 张白卡（话题标题 .title-section:886、想法 .content-section:913、发布到 .target-section:955、添加图片 .images-section:1146）圆角一律 var(--r-xl, 24rpx)=12px，帧上四角圆弧实测约 12px，比 §1.4 卡片档 40rpx（20px）小 16rpx=8px；同域 topics.vue 的 .topic-card 也是 24rpx，全站发布/列表卡一起落在小一档的圆角上。
- 建议改法：四处卡片圆角统一改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R15-L04-D08　P2 / 可达性　批次 R16-B37
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`2392a6f74655024d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:987`
- 理想图依据：无基准，依据=规范文档§1.4 触控口径 88rpx（同页 .bottom-submit__btn 高 28rpx×2+30rpx 行高已 ≥88rpx）+ §1.2 次文本对比档
- 现象：「兴趣圈」这枚发布去向 chip 走 .target-chip--disabled 的 `opacity: 0.5`，字色 $text-secondary #5F6763 半透后与 $bg-page #EEF7F2 合成约 (166,174,170)，实算 ≈2.0:1；帧上这枚 chip 的字几乎读不出，且整块没有任何"为何不可选"的说明，用户只能看到一个灰掉的去向选项。
- 建议改法：禁用态改用专用底 + 不小于 4.5:1 的深墨字（不靠 opacity 整体压淡），并在 chip 下方补一句禁用原因文案。
- 修复类别：单页

## subpackages/circles/circles/topic-detail（2 条）

### R15-L04-D04　P2 / 间距　批次 R16-B38
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`5667a08a089d5990`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:536`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」
- 现象：滚动区 .detail-body 只有 `padding: var(--sp-6)`（24rpx=12px，design-variables.scss:552），帧上作者卡、正文卡、回复卡左右各离屏边约 12px，比 §1.4 页边距档少 8rpx=4px；同页页头内衬却用 var(--sp-8)（:483），同页两套横向栅格档，正文比页头更贴边。
- 建议改法：.detail-body 左右内衬改 var(--page-padding, 32rpx)，与页头、同域 topics/circle-home 收同一档。
- 修复类别：CSS/token

### R15-L04-D05　P2 / 素材缺失　批次 R16-B38
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`7991387f6cfbd5a8`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:823`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue（空态必带预设图标，:123-127 默认落 ICONS_COMMON.BOX_SVG）+ §1.5 基础 common 组件 StatusState/EmptyState 清单
- 现象：回复为空时（帧上「回复 0」卡内）只有一行居中灰字「暂无回复，快来抢沙发吧」，.replies-empty(:823-828) 仅 padding:60rpx 0 + flex 居中，模板 :372-373 也只挂一个 text —— 没有 common 空态组件那枚预设图形，空态块读起来像一句孤零零的说明文字，与同包 topics 列表尾「— 没有更多了 —」一样都缺图形层。
- 建议改法：该分支改挂 EmptyState（type 默认 box 图标）或在 .replies-empty 内补一枚 96rpx 预设 svg，再排文案。
- 修复类别：单页

## subpackages/circles/circles/topics（3 条）

### R15-L04-D01　P2 / 位置　批次 R16-B39
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`fe5f98d4f175c73e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:667`
- 理想图依据：无基准，依据=规范文档§3.11「feed 帖子卡流（头像/昵称/时间/正文/图/互动栏）」作者行起排 + 同域 circle-home 同一条帖的卡序对照
- 现象：话题卡内元素顺序为 标题(:667)→正文(:670)→图(:673)→作者行+时间沉到卡尾 footer(:687-703)；帧上「城市夜景拍摄攻略」这张卡标题顶格、作者「林晚 8-26」压在卡底分隔线下方。同一条帖在 circle-home（b0528a4e 帧）是头像+昵称+时间起排、正文在下 ⇒ 同域两页同一数据卡序上下颠倒。
- 建议改法：把 .topic-card__footer（作者+时间+回复数）整块上移到 .topic-card__title 之前，与 circle-home .feed-author 同序。
- 修复类别：单页

### R15-L04-D02　P2 / 圆角　批次 R16-B39
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`a6ec868e73fe2b4e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1095`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx=20px」（theme/design-variables.scss:699）
- 现象：三张话题卡（苏奈/草莓/阿辰）圆角实测约 12px，源码 .topic-card 取 var(--r-xl)（design-variables.scss:446 → $radius-xl 24rpx 定于 :202），比全站卡片档 --card-radius 40rpx（20px，:699）低 16rpx；同包 circle-home 的 .feed-card 也是 24rpx，两页一起偏离卡片圆角单一档。
- 建议改法：.topic-card 圆角改 var(--card-radius, 40rpx)，与 §1.4 卡片档统一。
- 修复类别：CSS/token

### R15-L04-D03　P2 / 间距　批次 R16-B39
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`a6ec868e73fe2b4e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1092`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」
- 现象：.topic-card 外边距 `margin: var(--sp-3) var(--sp-6)`（--sp-6=24rpx=12px，design-variables.scss:552），帧上三张卡左右各只缩进约 12px、卡与卡竖向只隔 6px（--sp-3=12rpx），比 §1.4 页边距 32rpx（16px）少 8rpx=4px、比区块间距 --section-gap 24rpx（12px）少 6px，整屏比同域页更"贴边"。
- 建议改法：左右外边距改 var(--page-padding, 32rpx)、竖向改 var(--section-gap, 24rpx)。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/history（3 条）

### R16-L06-D05　P2 / 圆角　批次 R16-B40
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`dbb5a1f98c0a76b5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:389`
- 理想图依据：无基准页；依据=规范文档§1.4 卡片圆角单档 --card-radius 40rpx=20px（design-variables.scss:699）+ 同分包 segment.vue:316 / people.vue:442 / likes/index.vue:1293 同角色卡均已收口 40rpx
- 现象：新帧统计卡（0/0/0 白卡）角弧实测：卡顶边 y=105、左边 x=16，白区左端起排 y=106→x=26、y=110→x=19、y=114→x=17（内缩归零）⇒ 拟合半径≈9~12px＝24rpx 档，正是 :389 的 var(--r-xl, 24rpx)；同分包其余三页同角色卡 R12/R13 已统一到 --card-radius 40rpx=20px，本页 R15-L06-D08 的改法未落地（:389 与 :438 原样未动），同域两档圆角继续并存。
- 建议改法：:389 与 :438 的 border-radius 改 var(--card-radius, 40rpx)，与同分包三页归一。
- 修复类别：CSS/token

### R16-L06-D06　P2 / 字号　批次 R16-B40
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`dbb5a1f98c0a76b5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:358`
- 理想图依据：无基准页；依据=规范文档§1.3 字体层级表「页面主标题 26–28px / 700–800 页头标题」+ 同分包两页页头同角色标题的在册改法（people.vue:340、segment.vue:269 均 52rpx=26px，其注释点名「history 38rpx」为三页三档之一）
- 现象：顶帧「今日已看」墨迹包围盒实测 x=153~225、y=67~83 ⇒ 4 字占 73px、单字步进 18.3px、墨高 17px，对应 :358 裸值 38rpx=19px，比 §1.3 页头档下限 26px 少 7px；同分包另两页 R12-L06-D08 / R13-L06-D02 已因同一条数各收到 52rpx，唯独本页没进那一批（帧上首次立案）⇒ 三页页头现在是 26/26/19 三档，同一分包切页时标题明显缩一号。
- 建议改法：:358 改 52rpx（与 people.vue:340 / segment.vue:269 同档同字面），或三页一并吃同一枚页头标题令牌后归一。
- 修复类别：CSS/token

### R16-L06-D07　P3 / 间距　批次 R16-B40
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`7991ce180c6c743d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:383`
- 理想图依据：无基准页；依据=规范文档§1.4 卡片内边距 --card-padding 32rpx=16px（design-variables.scss:698）
- 现象：底帧统计卡 :383 写死 `padding: 28rpx 32rpx` ⇒ 上下 14px、左右 16px 不等档：帧上卡顶边 y=105→数字「0」墨迹顶 y=126（21px 含行盒留白）、标签「已喜欢」墨迹底 y=163→卡底边 y=180（17px），反推 CSS 上下内衬 14px，比 §1.4 卡片内衬档 32rpx=16px 少 2px，而左右已吃 32rpx ⇒ 同一枚卡上下紧、左右松。R15-L06-D09 的改法未落地（:383 原样），本轮在新帧上复测仍在。
- 建议改法：.stats-bar 上下 padding 改 var(--card-padding, 32rpx)（与左右档配齐），:439 的 .history-card padding 28rpx 同批。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/match-success（4 条）

### R16-L06-D01　P2 / 空态文案　批次 R16-B10
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`54e045e41d6e2732`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:146`
- 理想图依据：素材/理想效果图/匹配成功页面.png 中部白卡区——标题「我们正在分享你们的共同点」+ 慢跑爱好/音乐品味/电影偏好/生活方式 4 行实文案；规范文档§3.4 亦把该模块列为本页「破冰引导」
- 现象：新帧 y=360~494 的空态卡里只有 1 行标题 + 2 组灰条，行内 0 个文字节点（:148~:155 两行只放 __score-empty-box / __score-empty-bar 两个空 view），却沿用真实卡的标题「我们正在分享你们的共同点」（:146 直接复用 :119 同一串）——进行时肯定句配两枚静态灰条（.match-success__score-empty-bar :506~:512 只有 height/background，无 shimmer、无 role=status、无 aria-live），既不说明"暂时拿不到共同点"也不给下一步出口；用户读到的是"正在加载却卡住"，而该状态其实是永久态（后端无 match_reasons 列）。骨架未伪造任何数字或理由，这一半是合格的。
- 建议改法：空态分支换独立文案（如「共同点还在准备中，先打个招呼吧」）并给一条出口（把「立即聊天」语义在标题行点明，或补「换一位看看」），灰条补 aria-live/动效；真值列就绪后再回收为真实四行。
- 修复类别：单页

### R16-L06-D02　P2 / 尺寸比例　批次 R16-B10
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`54e045e41d6e2732`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:152`
- 理想图依据：素材/理想效果图/匹配成功页面.png 共同点卡纵向占 y=920~1386（467px，×0.441=206px 帧当量），卡底到主按钮顶 y=1386→1455（69px，×0.441=30px 帧当量）
- 现象：帧上白卡实测 y=359~495＝136px（理想当量 206px 的 66%），因为占位只给 2 行（:148~:151、:152~:155）而理想图是 4 行；卡底 495 到主按钮顶 664 之间残留 169px 纯渐变空带＝屏高 814 的 20.8%，理想图同段只留 30px。R15 的整块空洞（约 320px）确实被骨架吃掉一截，但模块体量仍不足理想档的一半。
- 建议改法：骨架行按理想图给满 4 行（行距沿用 __score-empty 的 gap 24rpx，行高 64rpx ⇒ 卡高≈206px 帧当量），使卡底—按钮顶收回到理想图 30px 档；勿用 margin 撑高。
- 修复类别：单页

### R16-L06-D03　P2 / 颜色token　批次 R16-B10
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`eeee930eeca6d794`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:538`
- 理想图依据：素材/理想效果图/匹配成功页面.png 底部主 CTA——x=426/y=1462~1563 八点取样 #21BA7A~#24BA7C（平色绿）+ 纯白字
- 现象：R15-L06-D03 的修法只落地了一半：前景按卡归到纯白（:546，帧上字素比底亮 ⇒ 已确认），但底色按同一条建议从 --c-brand #36C99A 又降一档到 --c-brand-800 #156B51（:538），帧上按钮体 20 点连续实测 RGB(21,107,81)，与理想取样 #21BA7A 相差 明度 L≈39 vs 66（理想档在 brand #36C99A 与 brand-800 之间偏上）。结果是"前景对、背景比修前更偏离理想图"——色档偏差从字挪到了底，且与 §1.1.5 视觉 100% 还原口径的偏离量变大而非变小。
- 建议改法：底色回到理想档（--c-brand #36C99A 或就近的 brand-600 档）并保留纯白字，同时按 §2 口径登记该处对比度例外（白字压 #36C99A 约 2.1:1 需例外审批）；若维持 brand-800，请把理想图色档偏差与"深绿主按钮"决策写进 decisions 台账，别让两页各说一套。
- 修复类别：CSS/token

### R16-L06-D04　P2 / 可达性　批次 R16-B10
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`eeee930eeca6d794`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:550`
- 理想图依据：无基准尺寸档；依据=规范文档§1.2 可点件热区下限 88rpx(44px) + 同帧主按钮实测 89rpx 对照（同屏两钮一达标一不达标）
- 现象：底帧「立即聊天」白底绿字钮实测 y=664~708＝45px（89rpx ✓），其下「继续探索」白胶囊实测 y=717~757＝40px（≈80rpx），比 88rpx 下限少 4px、比同屏主钮矮 5px——根因是 :550 只有 padding 22rpx 0、无 min-height，热区完全由 28rpx 文本行高撑出。两钮纵向净距仅 9px，拇指按次钮时上沿易蹭到主钮区。
- 建议改法：.match-success__secondary 补 min-height:88rpx 并用 flex 垂直居中保持文字视觉位置不动（同 EmptyState.vue:259 已验证写法），.match-success__primary 同批补一道 min-height 兜底。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/matching（2 条）

### R15-L05-D12　P2 / 层级遮挡　批次 R16-B09
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`c96eb28367325357`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:188`
- 理想图依据：匹配中页面.png 标题区——理想图装饰爱心全部散布画面边缘/头像轨道四周，标题行「正在寻找有缘的Ta...」上无任何粒子压字
- 现象：装饰绿心 .match-loading__deco--7 定在 top:12%/left:50%（z-index:1，标题无层叠上下文），恰落标题行正中，top 帧实测该绿心压在「适合你的 TA」字面上沿并随 ±20rpx 浮动扫字——标题是本页第一信息位，被装饰件常态遮挡。
- 建议改法：deco--7 移到标题带之外（如 top:6% 或 left 偏至 15%/85%），或给标题行立 z-index 高于装饰层。
- 修复类别：单页

### R15-L05-D13　P2 / 尺寸比例　批次 R16-B09
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`9910966f9dfb70b1`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:339`
- 理想图依据：匹配中页面.png 头像轨道区——理想图两枚头像直径约 250px@750 基准（≈250rpx），占轨道环主体，是画面第一视觉
- 现象：实际头像 168rpx+8rpx 描边（帧上实测含描边约 92px@400 宽 ≈172rpx），仅为理想档的 ~69%，轨道区整块偏小偏空，bottom 帧与理想图对比「双头像交汇」的存在感明显不足。
- 建议改法：.match-loading__avatar 宽高提到 240rpx 档，同步校核 .match-loading__avatar-area 400×240rpx 盒与轨道环 520rpx 的比例。
- 修复类别：CSS/token

## subpackages/discover-extra/home/segment（2 条）

### R15-L06-D04　P3 / 文案　批次 R16-B41
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`04973190832537de`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:135`
- 理想图依据：无基准，依据=本页 R8-L06-D10 已确立的 meta 行句式同构口径（segment.vue:123-129 注释自述「缺失时回落『附近』占位，同一列表不出现两种句式」）
- 现象：顶帧「小新生」一行（y≈437~497）meta 行整体缺席——campus 与 distance 双缺时 metaText 直接 return distance（空串），其余 8 行都是「X · 附近」或「X · 230km」句式，唯独这行只剩姓名，同列表两种行式，R8-L06-D10 的同构收口漏了双缺分支。
- 建议改法：双缺分支也回落 t("home.segmentNearby")（本页 type=online，「附近」占位口径与 :134 一致），或统一给整行留空行高。
- 修复类别：单页

### R15-L06-D05　P3 / 间距　批次 R16-B41
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`8175a57cdb0d6521`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:302`
- 理想图依据：无基准，依据=规范文档§1.4 区块间距 --section-gap 24rpx=12px（design-variables.scss:427）+ 同分包 likes/index.vue:1264 列表 gap 已吃该令牌
- 现象：底帧卡与卡之间留白实测约 8px——.segment-list gap 写死 16rpx，只有 §1.4 区块间距档 24rpx=12px 的三分之二；同分包 likes 页 .likes-list 同角色列表间距已吃 var(--section-gap)（index.vue:1264），people.vue:438 行 margin-bottom 也留 16rpx ⇒ 同分包两档、本页不吃令牌（与 R14-L06-D02 的卡内衬是两条独立留白，非重报）。
- 建议改法：.segment-list 的 gap 改 var(--section-gap, 24rpx)，people.vue:438 同批。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（5 条）

### R16-L07-D01　P2 / 字号　批次 R16-B42
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`5fad85532aaa8ddc`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:553`
- 理想图依据：无基准页，依据=全站设计规范与逐页设计稿说明.md §1.3 字体层级「辅助 14/15px」，页头说明句不得落进只给角标/法务的「极小 10/11px」档（R15-L07-D01 未修，新帧复现）
- 现象：页头说明「谁在喜欢你，谁来看过你」帧测 11 字墨宽 117px（x=17..133）＝10.6px/字、墨高 11px（y=104..114），样式为 var(--fs-sm)=22rpx=11px，比 §1.3 说明档 14px 小 3px，与 27px 页标题（y=66..92）落差过大
- 建议改法：.page-header__subtitle 改 var(--fs-lg, 28rpx)=14px，行高 1.5
- 修复类别：CSS/token

### R16-L07-D02　P2 / 字号　批次 R16-B42
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`5fad85532aaa8ddc`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:855`
- 理想图依据：无基准页，依据=§1.3「小字 13/12px 用于标签·时间戳」，时间戳不得取只给角标/法务的 10px 档（R15-L07-D02 未修，新帧复现）
- 现象：列表行右侧时间「9/15」取 var(--fs-xs)=20rpx=10px，帧上墨迹 x=333..340、y=255..262 仅 8px 高，比同页 15px 姓名（墨高 15px，y=261..275）小两档，与 §1.3 时间戳 12–13px 档不符
- 建议改法：.list__time 改 var(--fs-md, 26rpx)=13px
- 修复类别：CSS/token

### R16-L07-D03　P3 / 尺寸比例　批次 R16-B42
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`5fad85532aaa8ddc`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:726`
- 理想图依据：无基准页，依据=组件规范 Tab 选中条应覆盖标签主体宽度；同页 tab 文字 14px×4 字=56px（R15-L07-D03 未修，新帧复现）
- 现象：选中 tab 指示条固定 width:48rpx=24px（帧实测绿色线段 x=46..68 共 23px、y=235..236 共 2px），而「喜欢我的」4 字×14px≈56px，指示条只覆盖标签的 41%，两端各空约 16px
- 建议改法：指示条宽度改为跟随标签（width:100% 或 56px/112rpx）
- 修复类别：CSS/token

### R16-L07-D04　P2 / 间距　批次 R16-B42
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`b143c4b536e78237`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:496`
- 理想图依据：无基准页，依据=§1.4 页边距 32rpx / 区块间距 24rpx，列表结束应自然收口而非整屏空底（R15-L07-D04 未修，新帧复现）
- 现象：唯一一行卡片白底止于 y=304，视口底 812 之间 508px（按 1px≈2rpx 合 1016rpx）整片空底，占视口 62%；top 帧与本帧逐像素只差状态栏时钟行（y=18..26），这 508px 滚不动，来自容器 min-height:100vh
- 建议改法：.likes-visitors-page 去掉 min-height:100vh（改 min-height:auto），列表尾补 48rpx 收口
- 修复类别：CSS/token

### R16-L07-D05　P2 / 空态文案　批次 R16-B42
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`b143c4b536e78237`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:443`
- 理想图依据：无基准页，依据=§1.3/组件规范列表应有结束语，非空列表不能「到一条就断」（R15-L07-D05 口径收窄后新帧复现）
- 现象：空数组已有 EmptyState（:435-439），但非空列表 v-else 分支（:443）之后没有任何尾部节点：帧上「小满」一条止于 y=304，其后到视口底无一字符，既无「没有更多了」也无条数说明，用户无法判断是加载完还是中断
- 建议改法：list 分支尾部补「没有更多了」尾注（复用既有 i18n 键）
- 修复类别：单页

## subpackages/discover-extra/likes/index（3 条）

### R16-L06-D08　P2 / 可达性　批次 R16-B01
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`f781d5261ae9a0da`）
- 源码证据：`apps/client/src/components/common/BaseTabs.vue:276`
- 理想图依据：无基准页；依据=规范文档§1.2 可点件热区下限 88rpx(44px) + 同分包 nearby/people 同角色页签在册改法 people.vue:361 min-height:88rpx（R10-L06-D13 因同一条数 65rpx 立案）
- 现象：顶帧三枚页签胶囊实测高一致为 28px（选中「喜欢我的」y=171~198、「我发出的喜欢」y=170~198）＝56rpx，只有 88rpx 下限的 64%，且胶囊之间纵向无热区可借（.base-tabs-list 的 padding 在胶囊之外）——根因是 :276 的 padding 只有 var(--sp-3)=12rpx 上下、组件与三枚 tab 均无 min-height。本页签是切到「我发出的喜欢」的页内唯一出口（访客另有 likes-visitors 独立页可退），故按"可测偏差但不影响使用"落 P2：28px 目标能点中，但相邻两枚胶囊横向仅隔 8px，易误触换页。
- 建议改法：.base-tabs--pill .base-tab-item 补 min-height:88rpx（同 people.vue:361 口径），flex 居中保持文字基线不动；改组件一处，全仓 pill/block 消费点同收益。
- 修复类别：CSS/token

### R16-L06-D09　P2 / 圆角　批次 R16-B43
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`f781d5261ae9a0da`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1228`
- 理想图依据：无基准页；依据=规范文档§1.4 卡片圆角单档 --card-radius 40rpx=20px + 同页列表卡 .likes-card 已在 R13-L06-D10 收口 40rpx（index.vue:1293 注释自证）
- 现象：顶帧包裹页签的白卡角弧实测：卡顶 y=159、左边 x=17，白区左端 y=160→x=23、y=163→x=20、y=168→x=18（内缩归零）⇒ 拟合半径≈10~12px＝:1228 的 var(--r-xl) 24rpx；同页下方 mutual 列表卡同一帧量得卡顶 y=222、左边 x=16，边框左端 y=224→x=26、y=228→x=21、y=232→x=18、y=242→x=16（归零）⇒ 拟合半径≈20px＝--card-radius 40rpx。两卡纵向相距不到 20px 并置，一大一小肉眼可分；R15-L06-D10 的改法未落地（:1228 原样）。
- 建议改法：.likes-tabs-card 的 border-radius 改 var(--card-radius, 40rpx)，与同页 .likes-card 归一。
- 修复类别：CSS/token

### R16-L06-D10　P3 / 间距　批次 R16-B43
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`170dac542dec8a6e`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1229`
- 理想图依据：无基准页；依据=规范文档§1.4 卡片内边距 --card-padding 32rpx=16px（design-variables.scss:698）+ 同页 .likes-card padding var(--sp-7)=32rpx（index.vue:1288）
- 现象：底帧页签白卡内衬上下不等档：卡顶 y=159→胶囊顶 y=170＝11px、卡底 y=209→胶囊底 y=198＝11px，而卡左边 x=17→胶囊左边 x=33＝16px。根因是 :1229 的 `padding: var(--sp-2)`（4px）只给四个方向铺 4px，纵向再叠 BaseTabs 自身 list 的 --sp-4（8px）＝12px（帧测 11px），横向叠 --sp-6（12px）＝16px ⇒ 同一枚卡左右按 --page-padding 档、上下比 §1.4 卡片内衬档 16px 少 4px。本条按新帧读数重写，不沿用 R15-L06-D12 的「贴死 4~5px」说法（该读数漏算组件内层 padding，新帧复测不成立）。
- 建议改法：.likes-tabs-card 的 padding 改 var(--card-padding, 32rpx) 后同步复核 BaseTabs list 内层 padding 是否重复计入（二者取一，勿两层各撑一半凑出第三档）。
- 修复类别：CSS/token

## subpackages/discover-extra/nearby/people（2 条）

### R15-L06-D06　P2 / 文案　批次 R16-B44
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`00b67a09b19e1cb2`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:267`
- 理想图依据：无基准，依据=规范文档§1.3 行卡「主文字 + 辅文互补」层级 + 同域 segment 页 R14-L06-D01 已立的 metaText 判据（campus 与 name 同源时不复读）
- 现象：顶帧「中山大学」「武汉大学」「南开大学」三行（y≈100~240）姓名与其下 meta 行首段是同一串字符——「中山大学 / 中山大学 · 附近」连读两遍，meta 行 50% 内容是姓名复读，辅文只剩「· 附近」半截信息；R14-L06-D01 在 segment 页同判据已立案，people 页 metaText 同构漏网（本页帧首次立案）。
- 建议改法：metaText 中 campus 段与 displayName(name) 相同时只输出距离/占位段，与 segment.vue:130-135 同批改法。
- 修复类别：单页

### R15-L06-D07　P3 / 尺寸比例　批次 R16-B44
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`199bb60de452bbd0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:321`
- 理想图依据：无基准，依据=同分包同角色件归一（§1.1.3 一令牌一值精神）：返回白圆三页三档
- 现象：底帧左上返回白圆实测直径约 32px（::before 64rpx），同分包 segment.vue:248 同角色白圆 56rpx=28px、history.vue:331 又取 72rpx=36px——三页三档，帧间肉眼可分大小不一；热区三页均已 88rpx（R11 收口），唯独视觉圆底没归档。
- 建议改法：三页返回圆底统一取一档（建议 64rpx 或补 --c-control-back 尺寸令牌），同批收口。
- 修复类别：CSS/token

## subpackages/discover/activities/index（3 条）

### R15-L13-D05　P2 / 颜色token　批次 R16-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`cdbdacf0b88c3ff5`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:818`
- 理想图依据：无基准，依据=规范§1.2 文字对比 +§1.1「绿=行动」；组件规范 .row-category-tag
- 现象：活动卡分类标签「综合」文字 `--c-brand` #36C99A 压 `--c-brand-50` #E8FAF3 底，实算 1.94:1，连非文本 3:1 下限都不到，26rpx(13px) 标签几乎读不出（R13-L13-D04 只改了字号档，未动此低对比配色）。
- 建议改法：标签文字改 --c-brand-700/--c-brand-800 深档或 --c-text-secondary，底改 --c-bg-surface。
- 修复类别：CSS/token

### R15-L13-D06　P2 / 颜色token　批次 R16-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`cdbdacf0b88c3ff5`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:1192`
- 理想图依据：无基准，依据=规范§1.2 次文本对比；组件规范 .quick-filter--active
- 现象：快捷筛选选中态「全部」文字 `--c-brand-600` #2AAE83 压 `--c-brand-50` #E8FAF3 底（:1182），实算 2.59:1 <4.5:1，24rpx(12px)/700 选中态标签偏淡。
- 建议改法：选中文字提到 --c-brand-800 #156B51（同底 6.4:1），与本页其它选中态归一。
- 修复类别：CSS/token

### R15-L13-D07　P2 / 字号　批次 R16-B45
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`7b6e4f083e7a608a`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:842`
- 理想图依据：无基准，依据=规范§1.3「辅助正文 14/15px；12px 只给标签/时间戳」
- 现象：活动卡描述段（如"不计时不拉速度，走完在湖边长椅坐一会儿就散。第三次之后人比较固定…"整句）取 `--fs-base` 24rpx=12px，落在 §1.3 小字档，正文级描述偏小一档。
- 建议改法：.row-desc 提到 var(--fs-lg, 28rpx)。
- 修复类别：CSS/token

## subpackages/discover/discussions/index（2 条）

### R15-L13-D03　P2 / 字号　批次 R16-B46
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`5348471b109dbcce`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:185`
- 理想图依据：无基准，依据=规范§1.3 字阶「正文·列表主文字 --fs-xl/2xl 15/16px」
- 现象：讨论流每行主标题（列表主文字）取 `--fs-lg` 28rpx=14px，比 §1.3 列表主文档下限 15px 低一档，与同卡 18px 区块标题层级压缩。
- 建议改法：.row-title 提到 var(--fs-xl, 30rpx)。
- 修复类别：CSS/token

### R15-L13-D04　P2 / 字号　批次 R16-B46
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`4fe76ed33e32b512`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:192`
- 理想图依据：无基准，依据=规范§1.3「辅助正文 --fs-lg/xl 14/15px；12px 只给标签/时间戳」
- 现象：讨论流摘要行（如"图书馆后门、南门传达室、三食堂侧门三个点位，猫粮由社团统一采购。"整句正文）取 `--fs-base` 24rpx=12px，落在 §1.3「小字·标签/时间戳」档，承载完整句子偏小一档。
- 建议改法：.row-subtitle 提到 var(--fs-lg, 28rpx)。
- 修复类别：CSS/token

## subpackages/legal/agreement/index（2 条）

### R16-L13-D03　P3 / 间距　批次 R16-B02
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`961748716c4a73d7`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:442`
- 理想图依据：无基准，依据=规范§1.4 间距档（--sp-2/3/6）+ 同组件 .legal-header 自述净空 22px（LegalTextPage.vue:438）
- 现象：R15-D08 把兜底卡头下内距 12px 收到 `--sp-3` 6px（:442），但药丸同步由 10px 升到 12px 后盒高 15px→18px，把收回的 6px 吃掉 3px：与 R15 同帧逐行比对，正文首行墨迹只从 y=231 移到 y=228（3px），药丸盒底 y=200 到正文墨迹 y=228 仍有 28px，比该规则自述的净空 22px 多 6px；卡头「药丸上方 12px / 下方 28px」上下比 ≈1:2.3，白卡里仍是一条偏厚的空带。
- 建议改法：`.legal-header--meta-only` 下内距再收一档到 `--sp-2` 4px（净空约 26px），或把药丸行盒 leading 去掉（line-height:1）后再复测，别让字号提升把内距回收抵消。
- 修复类别：CSS/token

### R16-L13-D04　P3 / 字号　批次 R16-B02
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`6eb4a5bf5862ab3c`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:636`
- 理想图依据：无基准，依据=规范§1.3 字号档 + 同组件卡头/吸底两处同源（LegalTextPage.vue:160）
- 现象：文末帧上「非正式版本」只剩吸底行一处，取 `--fs-xs` 20rpx=10px（墨迹 y=711..718、墨高 8px、字宽 107px），而同页卡头同句已取 `--fs-base` 24rpx=12px（:477，墨高 10px、药丸盒宽 149px）；同一状态两种字宽/字高，且本帧留在签署按钮（y=726..768）上方的是更小的一档，与协议正文 15px 的层级落差达 5px。
- 建议改法：两处同档（吸底行同步 24rpx，或卡头回 22rpx），并在组件层用一个 token 收口，避免下一次单边改字号再拆档。
- 修复类别：CSS/token

## subpackages/legal/privacy/index（2 条）

### R16-L13-D01　P3 / 字号　批次 R16-B02
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`5421161ae8d16a5e`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:477`
- 理想图依据：无基准，依据=规范§1.3 字号档（10/11px=角标·法务，12px=小字·标签）+ 同组件两处同一 `fallbackBadgeText`（LegalTextPage.vue:160）
- 现象：R15-D10 把卡头兜底药丸从 `--fs-xs` 20rpx=10px 提到 `--fs-base` 24rpx=12px（:477），但吸底条内同一句「本地兜底文本 · 非正式版本」仍取 `--fs-xs`（:636）；本帧同屏可见两档——卡头药丸盒 y=183..200（高 18px，墨高 10px，宽 149px），吸底行墨迹 y=711..718（墨高 8px，字宽 107px），同一合规状态同句差 2px（20%），且卡头那档已离开 §1.3「角标·法务」10/11px 档。
- 建议改法：两处归一（优先吸底行同步 --fs-base；若坚持吸底为法务脚注保持 20rpx，则卡头回 --fs-sm 22rpx），同句同档、同源不拆。
- 修复类别：CSS/token

### R16-L13-D02　P3 / 字号　批次 R16-B02
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`5cbc584403dbd0e0`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:636`
- 理想图依据：无基准，依据=规范§1.3 字号档 + 同组件卡头/吸底两处同源（LegalTextPage.vue:160）
- 现象：本帧是滚动到文末、用户点「我已阅读并同意」的签署状态（按钮实心 y=726..768），此时卡头药丸已滚出视口，唯一在场的「非正式版本」披露是吸底行 `--fs-xs` 20rpx=10px（墨迹 y=711..718、墨高 8px、字宽 107px）；同句卡头已升到 24rpx/12px（:477）⇒ R15-D10 的单边提升让签署瞬间留在屏上的是两档中更弱的一档，修复只落了一半。
- 建议改法：与 R16-L13-D01 同批归一，并把「签署时刻在场」这一处作为归一基准（不低于 24rpx/12px）。
- 修复类别：CSS/token

## subpackages/market/detail/index（5 条）

### R15-L14-D01　P2 / 可达性　批次 R16-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:299`
- 理想图依据：无基准页，依据=规范文档§1.2 配色表（导航图标只允许 --c-text-primary/--c-text-tertiary 等中性档，无蓝灰档）+ 同域 shop 页头箭头写法（shop/index.vue:285 已换 --c-text-primary 档描线）
- 现象：页头返回箭头仍用 `ICONS_COMMON.BACK`（common/back.png，描线 #94A3B8 档蓝灰），压在白导航条上实测核心色 (174,185,201)、最暗像素 (153,168,187) ⇒ 对白底 1.98:1（最好像素也只有 2.42:1），低于非文本控件 3:1 下限；同域 shop 在 R11-L14-D09 已把同一枚换成 `REGISTER_ICONS.BACK`（#1A1E1C，本帧实测 10.84:1），detail 这一侧漏改，且白底盘叠白导航条（--c-border-card 对白底 1.06:1）⇒ 控件外形在帧上完全不可辨，只剩一枚淡灰箭头。
- 建议改法：与 shop:285 同档换成 `IMAGE_PATHS.REGISTER_ICONS.BACK`（#1A1E1C 描线），或给 .nav-bar__back-icon 换深色描线素材；同时把 .nav-bar__back 的描边抬到 2rpx --c-neutral-500（同 shop:451 口径）。
- 修复类别：CSS/token

### R15-L14-D02　P3 / 字号　批次 R16-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:465`
- 理想图依据：无基准页，依据=规范文档§1.3 字体层级（页面主标题 26–28px/700–800，大标题 --fs-5xl 22px）+ 同域两页页标题实测档
- 现象：本页页标题「商品详情」取 `--fs-2xl`（真值 32rpx=16.1px，design-variables.scss:566），帧上墨迹实测高 14px、字宽 15.2px；同域 shop「逛逛」/wallet「我的钱包」均为 `--fs-5xl` 44rpx=22.2px/800（帧上墨迹高 20–27px，且 wallet:314 注释写明 R9-L14-D15 就是为「与 shop 同档」才提到 44rpx）⇒ 同域三页页标题两档，本页比另两页小 6px、字重 700 vs 800。
- 建议改法：`.nav-bar__title` 字号与字重对齐同域档：`font-size: var(--fs-5xl, 44rpx); font-weight: 800;`（颜色仍留 --c-text-primary）。
- 修复类别：CSS/token

### R15-L14-D03　P3 / 颜色token　批次 R16-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:424`
- 理想图依据：无基准页，依据=规范文档§1.1 原则1「主题底色统一浅绿 #EEF7F2，不得出现白/灰断层」+ §1.2 页面底色 --c-bg-page
- 现象：`.nav-bar` 铺 `--c-bg-container`（白 #FFFFFF），页身是 `--c-bg-page` #EEF7F2 ⇒ 帧上 y=88 处有一道硬台阶（实测 y=86 为 (255,255,255)、y=89 为 (234,242,238)、y=91 起 (238,247,242)），白底带高 43px（=88rpx 导航条）压在浅绿页面上；同域 shop 页头是 `background: transparent` 平铺 --c-bg-page（shop:427，R11-L14-D10 刚为「页头与页身台阶」归位过一次），wallet 是 --c-brand-800 深绿实心带 ⇒ 同域三页页头三种底色，detail 是唯一出现白断层的一页。
- 建议改法：`.nav-bar` 的 `background` 改 `var(--c-bg-page)`（与 shop 同写法），需要分隔时只留 `box-shadow` 一条 1rpx 线。
- 修复类别：CSS/token

### R15-L14-D04　P2 / 间距　批次 R16-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:540`
- 理想图依据：无基准页，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx=16px」+ 同域两页同状态卡实测内衬（shop/wallet 各 15px）
- 现象：封存卡内衬仍是 `padding: 80rpx 48rpx`（上下 40.3px、左右 24.2px），帧上实测上内衬 39px（卡顶 y=119 → 锁图标盒顶 y≈158），卡总高 231px（y=119–349）；同域 shop 已按 R11-L14-D08 收到 `var(--card-padding)`（实测上内衬 15px、卡高 128px）、wallet 是 `var(--sp-8) var(--sp-6)`（实测 15px、卡高 128px）⇒ 三页三档内衬（纵向 40.3/16.1/16.1，横向 24.2/16.1/12.1），同一状态卡在本页比另两页高一倍。上一轮那条只落了 shop 一侧（shop:762 注释自陈「detail:540 不在可写集」），detail 这一侧至今未动 ⇒ 同轴新缺陷。
- 建议改法：`.product-state--sealed` 的 `padding` 改 `var(--card-padding)`（32rpx 单值），与 shop:765 逐字同写法。
- 修复类别：CSS/token

### R15-L14-D05　P3 / 位置　批次 R16-B47
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`31962bb171fe4b9e`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:422`
- 理想图依据：无基准页，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」+ 同域两页页头与卡缘同竖边的实测写法（shop:425 / wallet:273）
- 现象：`.nav-bar` 横向内缩是私有 `24rpx`（12.1px），而本页封存卡左缘走 `--page-padding` 32rpx（16.1px）⇒ 帧上实测箭头墨迹中心 x=27.5（=12.1+16.1 的盘心）、卡左缘 x=18，页头控件比自己的卡向左越出 4px，两者不成一条竖边；同域 shop（页头 padding 32rpx + 卡 --page-padding，实测盘左缘 x=16 / 卡左缘 x=17）与 wallet（R10-L14-D10 已把 --sp-4 改成 --page-padding，实测盘左缘 x=18 / 卡左缘 x=17）都已对齐，只有本页仍是两档。
- 建议改法：`.nav-bar` 的 `padding: 0 24rpx` 改 `padding: 0 var(--page-padding, 32rpx)`。
- 修复类别：CSS/token

## subpackages/market/shop/index（4 条）

### R15-L14-D06　P2 / 可达性　批次 R16-B48
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`fb921a092832f726`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:778`
- 理想图依据：无基准页，依据=规范文档§1.2 配色表（全站中性档为绿灰系 #6B7571/#9AA39F/#DDE3E0，无蓝灰 #94A3B8 这一枚）+ §1.1 原则3「一令牌一值，禁止私有色值」
- 现象：封存卡主图标 `static/assets/icons/common/lock.svg` 自带硬编码 `stroke="#94A3B8"`（蓝灰，非令牌色），再叠 `opacity: 0.55` ⇒ 帧上实测图标核心色 (192,201,214)=#C0C9D6，对白卡 1.67:1（未降透明前也只有 2.56:1），低于非文本图形 3:1 下限；这枚锁是「为什么这页是空的」唯一的图形线索。三页同一写法（shop:778 / detail:549 / wallet:403 实测图标墨迹块完全一致：40×44px、核心 #C0C9D6），本条按同域首现页记一次，不逐页重复计数。
- 建议改法：图标去 `opacity: 0.55`，并换用描线走 `--c-text-tertiary`/`--c-neutral-400` 档的锁形 SVG（对白卡 ≥3:1）；不改共享位图时可在本页用同色 SVG 覆盖。
- 修复类别：CSS/token

### R15-L14-D07　P3 / 需新建　批次 R16-B48
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`fb921a092832f726`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:384`
- 理想图依据：无基准页，依据=同域 detail 同状态卡实测出口（detail 帧 y=263–309 有一枚 57×47px 的「返回」胶囊，--c-brand-800 底白字 6.45:1）
- 现象：封存分支 `v-else` 卡内只有锁图标 + 两行文字（帧实测卡 y=131–258 内无任何可点控件），而同一封存态在 detail 卡内是「图标+标题+说明+返回钮」四件套 ⇒ 同域两页同状态，出口件数不一致；本页唯一出口是页头那枚白盘箭头（shop:271），卡内没有第二条路。
- 建议改法：与 detail:310-319 同写法在 `.shop-sealed` 内补一枚「返回」胶囊（复用 .product-state__btn 那套 --btn-height-md/--c-brand-800 档），或反向把 detail 的按钮去掉，三页取同一件套。
- 修复类别：单页

### R15-L14-D08　P3 / 空态文案　批次 R16-B48
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`fe650fbe4976ab1d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:387`
- 理想图依据：无基准页，依据=规范文档§3 全站逐页说明对空态的写法（同域其余空态如 detail「商品不存在」/EmptyState 组件均点名对象并给下一步）+ 组件规范 src/components/common/EmptyState.vue
- 现象：说明行是三页逐字共用的 `commerce.sealedDesc`「该功能暂未开放，开放时间将另行通知」（帧实测三页同一行墨迹完全重合：x=83–295、w=213px、13.1px 档）⇒ 文案不点名本页封存的是什么（商品/积分兑换），也不给任何下一步（无「开放时间」「返回」去处），用户读完后无法区分 shop/detail/wallet 三页；bottom 帧与 top 帧除状态栏时钟外像素一致（页面无第二区块），整页信息量只有这一句不指名的说明。
- 建议改法：本页改点名文案（如「礼物商城暂未开放」+ 一行「可先逛逛兴趣圈」并给出口），保留通用句作 fallback；三页各自传 `:desc` 而非共用同一 key。
- 修复类别：单页

### R15-L14-D09　P3 / 圆角　批次 R16-B48
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`fe650fbe4976ab1d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:766`
- 理想图依据：无基准页，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20px」
- 现象：封存卡圆角取 `--r-xxl`（32rpx=16.1px），帧上按左上角逐行描边拟合实测半径 16.0px（detail 14.5px、wallet 15.5px，三页同为 32rpx 档），比规范卡片圆角档 --card-radius 40rpx=20.2px 少 4.2px（约 8rpx）；同页 .shop-card 系列卡亦非 40rpx ⇒ 全站卡片圆角实际落在 32rpx 档，与 §1.4 交付口径差一档。
- 建议改法：三页封存卡统一改 `border-radius: var(--card-radius, 40rpx)`（与 §1.4 口径对齐），或在规范里把卡片圆角定档改注为 32rpx，二者取一，不要一页一值。
- 修复类别：CSS/token

## subpackages/market/wallet/index（6 条）

### R16-L14-D10　P2 / 可达性　批次 R16-B49
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`7ab1b81b1c70db42`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:155`
- 理想图依据：无基准页，依据=规范文档§1.2 配色表（导航图标只允许中性文本档，无 #94A3B8 蓝灰档）+ 同域 shop:285 已换 #1A1E1C 描线的实测写法
- 现象：页头白盘（帧实测 30×30px，盘心 x=31/y=68）里的返回箭头仍是 `IMAGE_PATHS.ICONS_COMMON.BACK`（back.png，8/29 版未换），盘内箭头最暗像素 (151,166,186)，对白盘 2.48:1，低于非文本控件 3:1；封存卡面（y=114–244）内无任何可点控件 ⇒ 这枚盘是唯一出口（命中盒已由 wallet:298 的 ::after 补到 88rpx，故不判 P1）。R15-L14-D11 同根因，R16 新帧该箭头像素与 R15 完全一致、源行未改（back.png 仍是 8/29 版）⇒ 上一轮修复未落到本页，按 NEW 重报。
- 建议改法：与 shop:285 同档换 `IMAGE_PATHS.REGISTER_ICONS.BACK`（stroke #1A1E1C）；或给 .wallet__back-icon 换深色描线素材。
- 修复类别：CSS/token

### R16-L14-D11　P2 / 间距　批次 R16-B49
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`7ab1b81b1c70db42`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:389`
- 理想图依据：无基准页，依据=规范文档§1.4 间距表（同域同状态卡顶部外边距一档）+ detail:539 / shop:764 的 60rpx 实测
- 现象：封存卡上外边距取 `var(--sp-10)`（design-variables.scss:557 = 48rpx = 24.2px），帧上实测页头深绿带底 y=90 → 卡顶 y=114，空 24px；同域 detail（导航条底 y=88 → 卡顶 y=119，31px）与 shop（页头盒底 y≈100 → 卡顶 y=131，31px）都是 60rpx=30.2px ⇒ 三页两档，本页卡顶比另两页高 6px。
- 建议改法：顶部外边距改 `60rpx`（与 detail:539 / shop:764 同值），或三页统一走 `--section-gap` 一档。
- 修复类别：CSS/token

### R16-L14-D12　P3 / 颜色token　批次 R16-B49
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`7ab1b81b1c70db42`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:419`
- 理想图依据：无基准页，依据=规范文档§1.2（次文本 --c-text-secondary #4A524E / 三级 --c-text-tertiary #6B7571 各一档，同句不得两页两档）+ 同句同卡在 shop:797 / detail:564 已改 secondary 的实测
- 现象：封存说明行仍是 `var(--c-text-tertiary, #94a3b8)`：token 真值为 #6B7571（design-variables.scss:364），帧内该行最暗像素 (92,103,99)，对白卡 4.76:1（已过正文 4.5:1，故不判 P1）；同句在 shop:797 / detail:564 已是 --c-text-secondary #4A524E（约 8.05:1）⇒ 三页两档。行内兜底仍是过期的蓝灰 #94a3b8，与另两页 #4A524E 的兜底也不同档。R15-L14-D10 同根因，R16 新帧该行暗像素仍为 (92,103,99)、源行未改 ⇒ 上一轮修复未落到本页，按 NEW 重报。
- 建议改法：`color` 改 `var(--c-text-secondary, #4A524E)`，与 detail:564 / shop:797 逐字同写法。
- 修复类别：CSS/token

### R16-L14-D13　P2 / 圆角　批次 R16-B49
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`7ab1b81b1c70db42`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:391`
- 理想图依据：无基准页，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20.2px」（design-variables.scss:699）
- 现象：卡圆角取 `var(--r-2xl, 32rpx)`，`--r-2xl` 现已在 tokens.scss:114 注册为 `var(--r-xxl)`（32rpx）⇒ 令牌名本身有效，R15 卡里「未注册」的前提不成立，本轮不沿用；帧上按左上角逐行拟合半径 15.5px，比 §1.4 的 40rpx=20.2px 少 4.7px（同域 detail:541 / shop:766 同为 32rpx 档）。本卡 R15-L14-D09 已按 shop 记过一次同根因，本条是 wallet 文件的可写落点。
- 建议改法：三页封存卡统一 `border-radius: var(--card-radius, 40rpx)`，或把 §1.4 卡片圆角档改注为 32rpx 并删掉两套值。
- 修复类别：CSS/token

### R16-L14-D14　P3 / 空态文案　批次 R16-B49
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`7ab1b81b1c70db42`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:215`
- 理想图依据：无基准页，依据=规范文档§3 空态写法（点名对象并给下一步）+ 组件规范 src/components/common/EmptyState.vue
- 现象：说明行取共享 key `commerce.sealedDesc`「该功能暂未开放，开放时间将另行通知」，帧内一行墨迹 x=83–295、宽 213px、墨高 12px；句子不点名「钱包/交友币」，也不给下一步，且与 shop/detail 逐字同一句 ⇒ 三页封存态读起来无法区分。卡内除此行外只有「功能封存中」与锁图标，无第二处解释。
- 建议改法：本页传独立 desc（如「钱包功能暂未开放」+ 一个去处），保留通用句作 fallback。
- 修复类别：单页

### R16-L14-D15　P3 / 需新建　批次 R16-B49
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`7ab1b81b1c70db42`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:212`
- 理想图依据：无基准页，依据=同域 detail 封存卡实测出口（detail 帧 y=263–309 的「返回」胶囊）+ 组件规范 LockScreen.vue 的主 CTA（:833）
- 现象：封存分支只有图标/标题/说明三件（wallet:213–215），帧上卡面 y=114–244 内没有任何可点控件；同域 detail 同状态卡内有「返回」胶囊，本页没有。另外 R16 改过的共用 LockScreen 在本页没有接入点：wallet 的 import 段（:9–17）不含 LockScreen，模板只有 `.wallet__sealed` 自绘卡 ⇒ LockScreen 的插画 310rpx（LockScreen.vue:602）、进度条 2rpx 描边（:767）、CTA margin-top:auto（:833）三项改动在本帧上不可见。无基准图，不判 P1。
- 建议改法：接入 LockScreen 承载封存/锁定态，或在本卡补一枚同款「返回」胶囊（复用 .product-state__btn 的 --btn-height-md / --c-brand-800 档）。
- 修复类别：需新建目标功能

## subpackages/profile-extra/feedback/history（2 条）

### R15-L11-D05　P2 / 位置　批次 R16-B50
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`0003f81b8012036d`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:350`
- 理想图依据：无基准页；依据=§1.4 页面结构（空态占满内容区并居中：EmptyState.vue:165 flex:1 0 auto + justify-content:center，宿主 AppShell.vue:420-426 .shell__body 已备 flex:1）；实测空态墨迹 y233-334
- 现象：空态块（图标 y233-284 / 标题 y292-306 / 副标 y316-330，整块 y233-334）块心 y283；筛选条下缘 y172 到屏底 814 的可用内容区中心是 y493，空态整体上浮 210px，下方留白 480px（占帧高 59%）。EmptyState 的 flex:1 0 auto 在这条链上没有拿到伸展高度（R6-L05-D02 登记过的同型机制），空态被按内容高度排在筛选条下方 ⇒ 贴顶、页面下半屏全空。
- 建议改法：把 :350 的 EmptyState 包进一个 flex:1 的容器（或给 AppShell 内容槽补 height:100%），让 EmptyState.vue:165 的 flex:1 生效；筛选条与空态之间不再加定高。
- 修复类别：单页

### R15-L11-D06　P2 / 空态文案　批次 R16-B50
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`0003f81b8012036d`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:353`
- 理想图依据：无基准页；依据=组件规范 EmptyState.vue:31 actionText「传入即渲染按钮」+ 同仓 campus/campus/topic-detail.vue:327 已用该出口；实测本页空态仅两行字、无任何按钮墨迹
- 现象：空态只有标题「暂无反馈记录」和副标「提交反馈后将在此处显示」两句陈述，整块 y233-334 内没有第三块墨迹（无 actionText 按钮）；而仓内已有反馈提交页 subpackages/profile-extra/feedback/index（pages.json:309），用户在「提交反馈后将在此处显示」这句唯一的指引上读完，仍然没有任何入口去提交第一条反馈，只能靠返回键离开。
- 建议改法：给 :350 的 EmptyState 传 :action-text="t('feedback.goSubmit')"（文案如「去反馈」）并监听 @action 调 openAppPath('/subpackages/profile-extra/feedback/index')，复用组件既有的 empty-action 按钮（88rpx 热区、#156B51 底已达标）。
- 修复类别：单页

## subpackages/profile-extra/profile/album（2 条）

### R15-L10-D08　P3 / 字号　批次 R16-B51
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`bf5e28f31b11d3f1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:933`
- 理想图依据：无基准，依据=规范文档§1.3 字阶层级（区块标题 --fs-3xl/4xl＝18/20px；正文 15/16px；辅助 14/15px）
- 现象：「照片使用说明」卡标题取 --fs-xl＝30rpx＝15px（:933），卡内汇总与四条规则取 --fs-lg＝28rpx＝14px（:961），帧上标题墨迹 13px（y=456..468）、规则正文 11px（y=514..525 等四行）——标题只比正文高 1px、整卡落在正文档，没有区块标题档；R11-L10-D17 把整卡从 11px 提到 14px 已生效（帧上正文确为 11px 墨迹），本条是标题与正文仍同档的残留。
- 建议改法：`.album-rules__title` 升到 var(--fs-3xl)（18px）或 var(--fs-4xl)（20px），汇总/规则维持 28rpx，卡内三段重新分层。
- 修复类别：单页

### R15-L10-D09　P3 / 尺寸比例　批次 R16-B51
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`c497d97b8f42dd84`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:794`
- 理想图依据：无基准，依据=本组件 :789-795 自陈的「1:1 方格（padding-top 百分比）」意图 + 规范 §1.4 方格栅格
- 现象：空位格实测 x=135..242（108px）× y=113..222（110px）＝108×110，纵向比横向多 2px；行间隙 9px（222→232）而列间隙 10px（242→253）。padding-top 的 (100%-2*sp-3)/3 与 width 同基，但 2rpx 虚线边框在 border-box 下又加进高度，方格不是正方形。
- 建议改法：padding-top 里补回边框：`calc((100% - 2 * var(--sp-3)) / 3 + 4rpx)`，或直接给 .album-cell 设高（等于宽）并让虚线走 inset box-shadow，保证全六格 1:1。
- 修复类别：单页

## subpackages/profile-extra/profile/favorites（2 条）

### R15-L10-D10　P3 / 字号　批次 R16-B52
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`5032102067df1a59`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:23`
- 理想图依据：无基准，依据=同分包同角色取档：album 的页头计数 13px / --c-text-tertiary（album.vue:704-706，帧 x=228..255、墨迹 11px），计数是次级信息
- 现象：本页把计数拼进标题字符串（:23 `favoritesTitle {n}`），帧上「（0）」与「我的收藏」同为 28px/700 黑色（标题整体 x=68..234、墨迹高 27px），数据计数读成标题正文；同一分包两页同一「页头计数」角色取了 28px 标题档与 13px 三级档两档。R14-B48 修的是标题本身 15px→28px（已生效），本条是计数未从标题里拆出的另一个现象，不复用那条。
- 建议改法：标题只渲染「我的收藏」，计数拆成独立 text 走 --fs-md / --c-text-tertiary（与 .album-header__count 同档），或另取 locale 键，不在标题里拼括号计数。
- 修复类别：单页

### R15-L10-D11　P3 / 位置　批次 R16-B52
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`5032102067df1a59`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:254`
- 理想图依据：无基准，依据=本页 :245-248 自述的居中口径「空态块中心落到可用区中线 y≈454」（页头下 95..814，中心 454.5）
- 现象：空态块实测 y=386..540（心形 386..434、标题 453..464、副标题 473..485、按钮 498..540），块中心 463，比可用区中心 454.5 低 8.5px；R14-B48 的 flex 居中已生效（改前中心 y≈231），但 120rpx 图标盒内只有 49px 实墨、上下 80rpx 内衬不等分，残留向下偏置。
- 建议改法：在 `.favorites-empty-slot` 补 `padding-bottom: 17rpx`（=8.5px 补偿），或把 EmptyState 的图标盒收到与实墨同高，让整块回到 454.5。
- 修复类别：单页

## subpackages/profile-extra/profile/location（2 条）

### R15-L10-D04　P3 / 空态文案　批次 R16-B53
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`910a97306541205a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:248`
- 理想图依据：无基准，依据=规范文档§1.1 原则「同一状态一种说法」+ 本页 :57-68 的 hasAnyLocationFact 单条件（城市/校区/坐标/地址四项全空才走空态）
- 现象：同一个「无定位」条件在一屏出现三句不同标题：「暂无位置信息」墨迹 y≈166（:204 displayText）、「暂时获取不到位置」y≈205（:208-209 hint）、「尚未取得你的位置」y≈358（:248 地图占位块），前两句在信息卡、第三句在地图块；三句主语与动词都不同，用户读到三个状态。
- 建议改法：地图块标题复用信息卡主值同一句（locationPage.locationEmpty），或把地图块改成纯说明（删标题只留「定位成功后这里会显示地图」），一屏只保留一个空态标题。
- 修复类别：单页

### R15-L10-D05　P2 / 颜色token　批次 R16-B53
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`4681c42505045e3c`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:590`
- 理想图依据：无基准，依据=规范文档§1.2 边框档（--c-border-light/default/strong）+ 非文字控件 ≥3:1 的仓内口径；同页地图框 :486 用了 --c-border-card 描边
- 现象：「返回首页」白钮填充实测 (255,255,255) 压页面底 (238,247,242)，边界对比 1.09:1；:587-594 无 border、无 shadow，帧上第二颗通栏钮只剩深色文字可辨，48px 高的胶囊形状与第一颗「重新定位」的轮廓完全不对称。
- 建议改法：给 `.location-btn` 补 `border: 1rpx solid var(--c-border-default)`（或与地图框同用 --c-border-card），保留白底与 17:1 的文字对比。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（3 条）

### R15-L10-D01　P2 / 位置　批次 R16-B14
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`c627161209d82d89`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:100`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡右列——姓名墨迹起 x≈480、资料行起 x≈489、距离行起 x≈492（屏宽 682，三行同在屏左缘 33% 一列）；规范 §3.9「白卡顶部：头像 72px 浮动骑压 + 右侧三行（姓名+♀+在线胶囊 / 年龄学校城市 / 距离在线）」
- 现象：帧上姓名「小新生」墨迹 x=98..183 / y=307..319，而「资料暂未完善」x=33..106 / y=407..419、「距离待更新」x=32..94 / y=427..439——两行资料比姓名左移 65px（屏宽 378 的 17%）、并下沉 88px 落到头像正下方，身份卡右列只剩姓名一行，中间留出 y=320..406 的 87px 空带。
- 建议改法：把 `public-identity__meta-row`(:100) 与 `__distance-row`(:117) 移进 `__info` 列（姓名行 :52-72 之后），沿用 :156 的 padding-left:132rpx，三行与姓名同一条左轨，卡高同步收回 ≈88px。
- 修复类别：单页

### R15-L10-D02　P2 / 尺寸比例　批次 R16-B14
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`c627161209d82d89`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:290`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡「喜欢」胶囊 tint 区 x=817..915 / y=323..362 ＝ 98×39（屏宽 682），长宽比 2.5:1，折算 378 屏 ≈54×22
- 现象：帧上身份卡「喜欢」胶囊 tint 实测 x=290..345 / y=304..345 ＝ 56×42px，长宽比 1.33:1，宽度与理想折算件（54）接近但高度是理想件（22）的 1.9 倍；:290 的 height:88rpx 把可点热区与胶囊本体写成同一个 44px，R10-L10-D08 提高热区时把视觉件一起抬高，理想图同件只有 22px 等效高，帧上读成一枚高胖圆角块而非细胶囊。
- 建议改法：视觉胶囊回到 56~64rpx（28~32px）高、padding 0 20rpx 不动；88rpx 热区外移到一层 wrapper（min-height:88rpx 内居中），同页其他大热区也是「视觉件 + 外扩热区」双层。
- 修复类别：单页

### R15-L10-D03　P3 / 空态文案　批次 R16-B13
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`4f2d99a16b56b1a1`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:48`
- 理想图依据：素材/理想效果图/他人显示主页.png「生活瞬间」四张照片直接铺在页面底上、逐格无占位文案；规范 §1.1 同一状态一种说法
- 现象：帧上「生活瞬间」4 个 78×78px 灰格（x=26..103 / 109..185 / 192..269 / 275..352，y≈447..524）每格各居中写一遍 10px「暂无照片」，同一句空态文案在一屏同一模块内重复 4 次；四格同色同文，读成四张失败图而不是「本节暂无照片」。
- 建议改法：只在四个骨架格上保留一处文案（例如本节标题下一行「暂无照片」），其余三格留纯骨架；或把四格合成一条空态行，文案只出现一次。
- 修复类别：单页

## subpackages/profile-extra/profile/privacy（2 条）

### R15-L10-D06　P3 / 字号　批次 R16-B54
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`805da41d896cf257`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:294`
- 理想图依据：无基准，依据=同域返回字形的已落地档：location.vue:330-335 / album.vue:686-691 / favorites.vue:228-233 三页均 52rpx（本帧实测墨迹 6×9px）
- 现象：本页返回字形取 `--fs-3xl`＝36rpx＝18px（:294，兜底 40rpx 是假兜底，design-variables.scss:567 真值 36rpx），帧上深色圆底里的白 ‹ 墨迹仅 5×6px（x=28..32 / y=80..85），比同域三页的 6×9px 小一档；同一枚「唯一退出口」在四个同域页里两种字形大小。
- 建议改法：`.privacy-page__back-text` 与同域取齐 `font-size: 52rpx; font-weight: 700;`，删掉写错的 40rpx 兜底；64rpx 圆底与 88rpx 热区不动。
- 修复类别：单页

### R15-L10-D07　P2 / 可达性　批次 R16-B20
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`805da41d896cf257`）
- 源码证据：`apps/client/src/pages.json:52`
- 理想图依据：无基准，依据=规范文档§1.2 反色文字用于深色底 + 状态栏小字 ≥4.5:1；同页页头是 brand-700→brand-800 深绿渐变（privacy.vue:262）
- 现象：状态栏时间/信号/电量帧上仍是纯黑 (0,0,0)，压在页头渐变 (29,131,98)→(21,107,81) 上实算 4.47:1→3.26:1，低于 10px 状态字 4.5:1；pages.json:52 全局 `navigationBarTextStyle: "black"`，而 :237 起的 profile/privacy 路由只有 path、无 style 覆盖，深绿页头没有配白字状态栏。
- 建议改法：pages.json 给 `profile/privacy` 加 `"style": { "navigationStyle": "custom", "navigationBarTextStyle": "white" }`（或在页面 onShow 调 uni.setNavigationBarColor 设白字），与深绿页头配对。
- 修复类别：单页

## subpackages/profile-extra/profile/tasks（2 条）

### R15-L11-D01　P3 / 尺寸比例　批次 R16-B55
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`53324f44437b6960`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:688`
- 理想图依据：无基准页（§3 未收录该页）；依据=§1.5 组件库既有线稿图标档 + §1.4 图标盒/底托令牌；实测四枚图标同 40rpx 盒、墨迹 13×14 / 17×16 / 16×15 / 18×19px
- 现象：四张任务卡的图标盒同为 40rpx（实测底托 72rpx=35px，墨迹在 x34-66 内），但实心墨迹量差 2.25 倍：第 1 枚「+」13×14px（占底托 37%）、第 2 枚 17×16、第 3 枚 16×15 且是实心 tabbar 位图（框内墨迹密度 0.14，另三枚 0.04/0.09/0.11）、第 4 枚 18×19px（占 51%）；同一列四个圆角方块里的图形一大一小、一线一实，最大最小差 5px=10rpx。
- 建议改法：四枚统一成同 viewBox 边距的矢量线稿（现有 assets/svg-spec/03-icons 档），并把第 3 枚 tabbar/chat-active.png 位图换线稿；若保留现图，给每枚单独补 calc 盒（13→18px 之间归一）而不是共用 40rpx。
- 修复类别：单页

### R15-L11-D02　P3 / 颜色token　批次 R16-B55
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`53324f44437b6960`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:645`
- 理想图依据：无基准页（§3 未收录该页）；依据=§1.2 配色表浅底/描边档 #EEF2F0 / #DDE3E0 / #C2CAC6 + §1.4 卡片白底 #FFFFFF；实测轨道取样 (180,155)=(241,242,242)
- 现象：积分概览卡里的进度轨道 16rpx 取 --c-neutral-100，帧上实测 (241,242,242)=#F1F2F2 压白卡 = 1.12:1，0% 态整条轨道（y151-158，宽 x32-346）与卡面同值，只剩一条 8px 浅灰带；这是本页唯一的进度可视化件，用户在 0 进度时看不到"进度条"这个控件本身（百分比 0% 之外没有任何形状提示）。
- 建议改法：轨道改 var(--c-border-strong) #C2CAC6（对白 1.67:1）并把高度提到 20rpx；0% 时在轨道左端渲染一枚 16rpx 的品牌绿圆点，让 0% 也有可见的前景形状。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/visitors（4 条）

### R15-L09-D15　P2 / 颜色token　批次 R16-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`5060249e7914bf30`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:370`
- 理想图依据：无基准；依据=§1.1 原则1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ App.vue 已定 page 底色改平面 --c-bg-page
- 现象：页面根取 --c-gradient-page（#DFF3EA→#EEF7F2）：帧上 y=40 实测 #DFF3EA(223,243,234)、y=780 才到 #EEF7F2；同一页吸顶头部（:396）却是纯 #EEF7F2，y=96–100 处出现 #EEF7F2→#E5F4ED 的横向色缝，与 settings/consulting 的纯色页底不同调。
- 建议改法：.visitors-page 的 background 改 var(--c-bg-page)，删掉渐变；头部与正文同底后色缝自然消失。
- 修复类别：CSS/token

### R15-L09-D16　P2 / 字号　批次 R16-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`5060249e7914bf30`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:421`
- 理想图依据：无基准；依据=§1.3（22px 属「卡片大标题」档，页头档为 26–28px）+ 同域设置/认证页 nav 标题 16px
- 现象：标题「谁看过我」取 --fs-5xl(44rpx=22px)，帧上墨高 21px；同域 settings、verification、real-name 三个自绘 nav 页都是 16px（墨高 13–14px），本页独一档 22px，既与兄弟页不一致，又落在卡片大标题档而非页头档。
- 建议改法：与 D14 一并统一页头档（本页改同 settings 的 16px 或统一升 18px），并把 --fs-5xl 这档从页头槽撤出。
- 修复类别：CSS/token

### R15-L09-D17　P3 / 文案　批次 R16-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`5060249e7914bf30`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:266`
- 理想图依据：无基准；依据=§1.5 文案一致性（同一列表全站同名）+ 设置页入口指向本页
- 现象：页面标题「谁看过我」（zh-CN.ts:1614），而设置页入口叫「访客记录」（zh-CN.ts:1526，settings/index.vue:359 的 label 直接指向本页）；同一列表两个名字，空态正文又写「暂无访客记录」，与标题不同词。
- 建议改法：统一为一个词（建议标题改「访客记录」，与设置入口、空态同词），或同时改 i18n 的 profile.visitorsTitle 与 profile.visitors。
- 修复类别：单页

### R15-L09-D18　P2 / 可达性　批次 R16-B56
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`5060249e7914bf30`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:403`
- 理想图依据：无基准；依据=§1.4 间距/热区口径（同页 .visitors-empty__btn 已按 88rpx 修，见 :546）
- 现象：返回钮 .visitors-header__back 为 64×64rpx（32×32px），小于 88rpx(44px)：帧上白色圆形返回钮直径仅 32px，比同页「编辑资料」44px 热区小 12px，且该钮无文字标签。
- 建议改法：width/height 改 88rpx（白色圆底保持，图标仍 40rpx），与同页空态按钮统一热区。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/dnd（2 条）

### R15-L11-D03　P2 / 层级遮挡　批次 R16-B57
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`0218871df13a4427`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:967`
- 理想图依据：无基准页（§3 未收录该页）；依据=§1.4 区块间距 24rpx（吸底主操作键与内容之间须留净空）+ 可点控件须完整可见；实测卡体 y682-744（62px）、保存键 y711-755
- 现象：top 帧（scroll=0）里 sticky 的保存键占 y711-755，压住最后一张「紧急消息仍会通知，避免错过重要信息」卡：该卡卡体实测 y682-744（62px，bottom 帧同卡 y625-687），首屏只露出 y682-706 的 25px（40%），卡片右侧的开关（bottom 帧实测 y638-674=37px，加 57px 滚动差即 y695-731）自 y711 起被键面盖住下半约 18px；用户首屏看到的是一行被切断的文案和半个开关。上一轮 R14-L11-D02 用 position:sticky 消掉了手势带遮挡，但同一改动把键面顶进了内容区，这一条是那次修法新引入的遮挡。
- 建议改法：给滚动内容 .content 补 padding-bottom: calc(保存键实测高 88rpx + 底部吸底净空 48rpx)，让 sticky 键在任何滚动位置都只压在净空里；不改键本身的位置与 z-index。
- 修复类别：单页

### R15-L11-D04　P2 / 颜色token　批次 R16-B57
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`4969d7fad51061af`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:873`
- 理想图依据：无基准页；依据=规范文档 §1.2 描边三档 --c-border-light/default/strong + 非文本控件轮廓 3:1；实测圆环描边取样 (333,330)=(222,225,224)
- 现象：「重复方式」四行里三枚未选中单选圆环（36rpx=18px、2rpx 描边，帧上实测外径 x331-350/y326-344）取 --c-border-strong #C2CAC6，对白卡只有 1.67:1，1px 描边再被抗锯齿摊薄，实测最暗像素 (222,225,224)=#DEE1E0 ≈1.34:1 —— 四个选项里只有「自定义」那一枚（--c-brand 实心）看得出是可选项，每天/工作日/周末三行右侧等于空白，用户读不出这三行是单选控件。
- 建议改法：未选中圆环描边改 --c-text-tertiary #6B7571（对白 4.76:1），选中态维持 --c-brand 实心不动。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/index（5 条）

### R15-L09-D04　P2 / 素材缺失　批次 R16-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`99ab4b4a096d1c95`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:321`
- 理想图依据：无基准；依据=components/common 图标语义一一对应约定（§1.5 组件清单：菜单行图标应按行语义取图）+ 同页其它行各自不同图标
- 现象：「编辑资料」与「时间安排」两行都用 IMAGE_PATHS.ICONS_PROFILE.SETTINGS（:321 与 :362），帧上「账号管理·编辑资料」与「社交资产·时间安排」两枚 32×32px 底座里的图标形状完全相同（同一齿轮/太阳字形），与「编辑」「日程」语义都不符；同文件「隐私权限设置」(:370) 又复用第三枚。
- 建议改法：补 pencil / calendar 两枚 ICONS_PROFILE 图标并分别用于 :321/:362，隐私权限设置换 shield；缺图登记素材车道，勿继续借用 SETTINGS。
- 修复类别：需新建目标功能

### R15-L09-D05　P2 / 可达性　批次 R16-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`99ab4b4a096d1c95`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:746`
- 理想图依据：无基准；依据=§1.4 间距（--sp-* 以 88rpx 为热区口径，同仓 .consult-sealed__action/.visitors-empty__btn 均已 min-height:88rpx）
- 现象：返回钮 .nav-bar__back 实测 64×64rpx（32×32px），小于 88rpx(44px) 热区；帧上只有一枚 5×10px 的「‹」墨迹（x=30–34/y=65–74），右侧胶囊之外没有第二个可视化返回入口。
- 建议改法：.nav-bar__back 的 width/height 改 88rpx（‹ 图标仍 56rpx），88rpx 导航条仍装得下；同分包 verification/real-name 一并改。
- 修复类别：CSS/token

### R15-L09-D06　P2 / 素材缺失　批次 R16-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`9a68dbcf8bd3d673`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:395`
- 理想图依据：无基准；依据=§1.5 组件/图标语义约定 + 同页社交分组已有专用图标（POSTS/VISITORS）
- 现象：「用户协议」直接复用「我的动态」的 POSTS 图标（:395 vs :353），「隐私政策」复用「访客记录」的 VISITORS 眼睛图标（:401 vs :359）；帧上关于分组第一行仍是社交分组那枚波形图标、第二行仍是眼睛图标，法律文本入口没有任何文档/盾牌语义。
- 建议改法：关于分组补 doc / shield / refresh / info 四枚语义图标（可沿用 ICONS_PROFILE 体系新增），不再借用社交分组图标。
- 修复类别：需新建目标功能

### R15-L09-D07　P2 / 颜色token　批次 R16-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`9a68dbcf8bd3d673`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:396`
- 理想图依据：无基准；依据=§1.2 色表（--c-bg-page #EEF7F2 用作页面底、卡片用 #FFFFFF）+ 同页其它分组图标底座 #FFF8E7/#EDE9FE/#FFF0F5
- 现象：关于分组四项的图标底座用 var(--c-bg-page) #EEF7F2，压在 #FFFFFF 卡上对比仅 1.09:1（帧上取色 #EEF7F2 vs #FFFFFF）；上方「存储管理」底座为 #EDE9FE、「隐私安全」为 #EDE9FE/#F3E8FF，到关于分组突然断成近乎无底，四枚图标像裸图标。
- 建议改法：bgColor 换与分组语义匹配的浅色令牌（如 --c-lavender-100/#EDE9FE 或 --c-tint-cream-50/#FFF8E7），至少与白卡保持可见边界。
- 修复类别：CSS/token

### R15-L09-D08　P2 / 颜色token　批次 R16-B58
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`9a68dbcf8bd3d673`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:926`
- 理想图依据：无基准；依据=§1.2 错误色 --c-error #E5454D + WCAG 正文 4.5:1（同页次级文字已按 4.5:1 调过，见 :896-898）
- 现象：「退出登录」文字 --c-error #E5454D 压白卡，帧上墨色实测 #E54A52(229,74,82)，对比 3.97:1（字号 15px/字重 500），低于 4.5:1；同页箭头文字已刻意调到 4.76:1，唯独这枚危险操作文字反而更浅。
- 建议改法：退出登录文字改更深一档红（同底 ≥4.5:1，如 #C0392B 或新增 --c-error-700），保持危险色语义。
- 修复类别：CSS/token

## subpackages/profile-extra/verification/index（3 条）

### R16-L09-D01　P2 / 颜色token　批次 R16-B59
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`a41a02542c88c98e`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:563`
- 理想图依据：无基准；依据=§1.2 警告色 --c-warning #F59E0B（待审核/警告语义，design-variables.scss:324）+ 门控横幅底 --c-tint-amber-50 #FFF8E1（design-variables.scss:827）
- 现象：门控横幅警示三角走 IMAGE_PATHS.ICONS_EMOJI.WARNING（src/static/assets/icons/common/warning.svg，stroke 烘焙为 #94A3B8），帧上压在 #FFF8E1 琥珀底实测三角描边 #94A3B8(148,163,184)、对比 2.41:1；同横幅文字已改 #1A1E1C，唯独警告图标仍是冷灰、与 --c-warning #F59E0B 不同相（R15-L09-D10 未修，资产车道无琥珀 SVG）。
- 建议改法：新增 #F59E0B stroke 的 warning-amber.svg（三树同步）替换 :563 的 src，或在图标外加琥珀底/描边，文字不动。
- 修复类别：需新建目标功能

### R16-L09-D02　P2 / 可达性　批次 R16-B59
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`a41a02542c88c98e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:828`
- 理想图依据：无基准；依据=§1.4 热区口径 88rpx（同仓 .consult-sealed__action / .visitors-empty__btn 均 min-height:88rpx）
- 现象：返回钮 .nav-bar__back 为 64×64rpx（32×32px），小于 88rpx(44px) 热区；本页 navigationStyle:custom 无原生返回钮，帧上左上角仅一枚约 5×10px 的「‹」墨迹，落点偏小（同域 settings/visitors 已按同口径记 R15-L09-D05/D18，本页帧未列）。
- 建议改法：.nav-bar__back 的 width/height 改 88rpx（‹ 图标仍 56rpx），88rpx 导航条装得下；与同分包 settings/visitors 一并归口。
- 修复类别：CSS/token

### R16-L09-D03　P2 / 颜色token　批次 R16-B59
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`c20d9158e3f54bcb`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:1197`
- 理想图依据：无基准；依据=§1.2 --c-text-tertiary #6B7571 用于次级文字（design-variables.scss:364）+ 小字正文须 ≥4.5:1（本行 22rpx=11px）
- 现象：重拍后 bottom 帧已完整露出「填写认证信息」表单、上传学生证卡与「提交认证申请」按钮（R15-L09-D11 的 P0 系取景失败、非产品缺陷，本轮撤销）；唯上传卡空态末行约束提示「支持 JPG / PNG，大小 ≤ 5MB」取 --c-text-tertiary #6B7571 压 --c-bg-surface #F3FAF6 虚线框底，实测对比 4.47:1，落在次级文字 3:1–4.5:1 档、低于小字 4.5:1 一档；同框主行「点击上传学生证照片」为 #1A1E1C 无碍。
- 建议改法：.upload-card__hint 文字改 --c-text-secondary #4A524E（同底实测 7.6:1）或把虚线框底由 #F3FAF6 提白至 #FFFFFF（同字 4.73:1），二者取一即可回到 4.5:1 之上。
- 修复类别：CSS/token

## subpackages/profile-extra/verification/real-name（3 条）

### R15-L09-D12　P2 / 文案　批次 R16-B60
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`65398203be5b43e8`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:490`
- 理想图依据：无基准；依据=§1.5 组件/文案一致性（同一动作在全站应同名）+ 本页状态卡说明
- 现象：已实名卡正文写「可进行校园认证（学历认证）」（zh-CN.ts:3444），按钮却写「恋爱认证」（t('verification.navTitle')，zh-CN.ts:3380），目标页正文又称「校园身份认证」——帧上按钮文案「恋爱认证」与上方说明不是同一个词，同一动作三处三个名字。
- 建议改法：按钮文案改「去校园认证」（新增 i18n 键）并与状态卡说明、目标页导航统一为「校园认证」；不要复用 verification.navTitle。
- 修复类别：单页

### R15-L09-D13　P3 / 颜色token　批次 R16-B60
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`65398203be5b43e8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:100`
- 理想图依据：无基准；依据=§1.2 卡片 #FFFFFF / 品牌浅底 #D1F5E7 + 同域 verification 未认证卡 #F5F3FF 的块感
- 现象：已实名状态卡底取 --c-brand-50 #E8FAF3，压在同为浅绿的页底渐变（#EEF7F2→#E8FAF3）上：帧上卡内实测 #E8FAF3(232,250,243)、卡外 #EEF7F2(238,247,242)，对比 1.01:1，卡边界只剩 4rpx 阴影，几乎与页底同块。
- 建议改法：状态卡底换可区分色（--c-brand-100 #D1F5E7 或白底 + 1rpx 描边），与页底至少 1.3:1，仍保持绿色成功语义。
- 修复类别：CSS/token

### R15-L09-D14　P3 / 字号　批次 R16-B60
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`be2235eb9084d48d`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:680`
- 理想图依据：无基准；依据=§1.3 页头主标题 26–28px 档（AppShell .shell__title 取 28px）
- 现象：导航标题「实名认证」取 --fs-2xl(32rpx=16px)，帧上墨高 14px（y=61–73）；同域「谁看过我」取 --fs-5xl(44rpx=22px)、墨高 21px，consulting 走 AppShell 的页头 28px——同一页头槽三档并存，本页 16px 比规范页头下限还低 10px。
- 建议改法：本组四个自绘 nav 页统一页头档（建议 28px；若要维持 88rpx 导航条则统一 18px 并同步 AppShell），先消除 16/22/28 三档。
- 修复类别：CSS/token

## subpackages/setup/campus/index（3 条）

### R16-L12-D01　P2 / 颜色token　批次 R16-B61
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`6c1418832e9abbba`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:429`
- 理想图依据：无基准；依据=规范 §1.2「brand-100/50 浅底 --c-bg-brand（design-variables.scss:131 = #E8FBF2）= 提示底」+ §1.1「一令牌一值」；价值提示卡的声明底/边框必须在帧上有像素
- 现象：价值提示卡声明 `background: var(--c-bg-brand)`（#E8FBF2）与 `border-color: var(--c-brand-200)`（#A3EBCF），但新帧卡内非文字区 (200,640)/(300,660) 取样 (255,255,255)，x=18..360 / y=602..672 的 4px 网格无一个 #E8FBF2 像素；左缘 x=17 取样 (247,248,249) 与上方白卡同位置 (247,248,248) 同值 ⇒ 宿主页 scoped 的 .value-card 没落到 SectionCard 根节点（schedule:120 注释已记该 mp-weixin 坑），本页唯一「价值提示」块与普通表单卡同底同框，提示层级丢失
- 建议改法：不再给 SectionCard 标签写宿主 scoped 类：由 SectionCard 增 `variant="brand"`（组件内写根节点背景/边框），或在卡外再包一层带 class 的 view 承载 #E8FBF2 底；改后核对卡内取样为 #E8FBF2
- 修复类别：单页

### R16-L12-D02　P2 / 颜色token　批次 R16-B16
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`6c1418832e9abbba`）
- 源码证据：`apps/client/src/components/setup/SetupProgress.vue:424`
- 理想图依据：无基准；依据=规范 §1.2 brand-700 #1F8D6A 作「深色文字」时对白卡只有 4.14:1，正文/标签下限 4.5:1；同族 brand-800 #156B51 对白 6.45:1
- 现象：已完成步骤名「基本信息」取 --c-brand-700，帧上该字全墨点实测 (31,141,106)=#1F8D6A，字号 --fs-base 12px（x=28..74 / y=266..282），压白卡实算 4.14:1（<4.5:1），比同排当前步名 #1A1E1C（15.3:1）、未到达名 --c-text-tertiary（4.79:1）都低；步骤名是这条进度条唯一可读的导航文字
- 建议改法：`.setup-progress__label-item--completed .setup-progress__label-text` 的 color 改 `var(--c-brand-800, #156B51)`（同卡跳过入口 R15 修法同档），已完成圆点填充/连线不动
- 修复类别：CSS/token

### R16-L12-D03　P2 / 层级遮挡　批次 R16-B08
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`7bf6380b83ec4227`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:344`
- 理想图依据：无基准；依据=组件规范 SetupProgress 头部两行（第 n/5 步 12px + 步骤名 13px）必须完整可读 + 规范 §1.4 区块间距
- 现象：bottom 帧较 top 仅滚 46px（吸顶页头底缘固定在 y=170），不透明页头把进度卡首行「第 2/5 步」（top 帧 y=195..206）整行盖没，下一行「校园认证」（top 帧 y=212..224）只剩 y=171..178 共 8/13 行可见、上行笔画被切；即吸顶条始终压在本页第一块内容上
- 建议改法：在 .shell__body 顶部补一段与吸顶页头（含 statusbar + 上下 20rpx padding）等高的占位，或给 is-fixed 页头改非遮挡方案（吸顶时只保留返回按钮的浮动胶囊、不覆盖正文），使滚 46px 后被盖住的是占位而不是进度卡首行
- 修复类别：单页

## subpackages/setup/interest/index（2 条）

### R15-L12-D13　P2 / 空态文案　批次 R16-B15
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`8eb7e22a1c3d61b0`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:314`
- 理想图依据：无基准；依据=规范 §1.2 三级文本 #6B7571 / 次文本 #4A524E，空态提示不得低于 3:1
- 现象：空选区提示「暂未选择任何标签」font-size --fs-xs（20rpx=10px）、color --c-text-quaternary #9AA39F 压 --c-bg-secondary #D1F5E7，帧上最深墨 #9BA4A0 实测 2.2:1（<3:1）；它是空选区唯一文案，同一行「已选 0/5」也只有 10px
- 建议改法：改 `font-size: var(--fs-sm)` + `color: var(--c-text-secondary)`（对 #D1F5E7 6.9:1），「已选 N/5」同步升档
- 修复类别：CSS/token

### R15-L12-D14　P2 / 字号　批次 R16-B62
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`8eb7e22a1c3d61b0`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:212`
- 理想图依据：无基准；依据=规范 §1.3「页面主标题 26–28px」+ AppShell 页头令牌 --fs-7xl 56rpx（campus/schedule/recommend 三帧墨高均 27px）
- 现象：页头「选择兴趣」44rpx=22px，帧上墨高 20px；同流程 campus「校园认证」、schedule「时间安排」、recommend「推荐偏好」都走 AppShell --fs-7xl 56rpx，帧上墨高 27px ⇒ 本页页头比另三页矮一档，落在 §1.3 的 22px 大标题档
- 建议改法：改 `font-size: var(--fs-7xl, 56rpx)`（与另三页同令牌），副标题档不动
- 修复类别：CSS/token

## subpackages/setup/profile/index（4 条）

### R15-L12-D01　P2 / 间距　批次 R16-B63
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`74a1b13edafed44d`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1274`
- 理想图依据：无基准；依据=规范 §1.4「页边距 --page-padding 32rpx = 16px」，并量同流程 campus 卡左缘为参照
- 现象：表单白卡左右外边距写死 40rpx（=20px），帧上卡左缘 x=21px、右缘 x=356px；同流程 campus 卡左缘 x=18px（32rpx+2rpx 描边），本页卡比全站页边距多缩进 8rpx，且与 hero 标题左缘 x=25px 不同轴
- 建议改法：把 `margin: -64rpx 40rpx 0` 改为 `-64rpx var(--page-padding, 32rpx) 0`，卡宽与 campus/recommend 同步
- 修复类别：单页

### R15-L12-D02　P3 / 字号　批次 R16-B63
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`74a1b13edafed44d`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1249`
- 理想图依据：无基准；依据=规范 §1.3「极小档 --fs-xs/sm = 10/11px（20/22rpx）」字级表
- 现象：hero 眉标「XUNMI · CAMPUS」font-size 19rpx=9.5px（帧上墨高仅 7px、字距 4rpx），落在 §1.3 字级表之外（极小档 20/22rpx），比同屏最小正文 25rpx 再小一档，且是硬编码而非 --fs-* 令牌
- 建议改法：改 `font-size: var(--fs-sm, 22rpx)` 并用现有字级令牌，去掉 19rpx 字面量
- 修复类别：CSS/token

### R15-L12-D03　P2 / 尺寸比例　批次 R16-B63
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`f933b426d46df519`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1459`
- 理想图依据：无基准；依据=规范 §1.4 页边距 32rpx + 同流程 BottomActionBar 主键高度 88rpx（组件 :96）
- 现象：本页主 CTA 是卡内 .submit-btn，帧上宽 296px（x=41..336，被卡片 40rpx 外边距 + 40rpx 内边距二次缩进）且 CSS 高度写 96rpx；同流程 campus/schedule 的吸底 CTA 宽 342px（x=18..360）、高 88rpx ⇒ 同一步注册流程两套按钮几何
- 建议改法：把保存按钮移出卡体改用 BottomActionBar（88rpx 高、满 page-padding），或宽度补 `margin: 0 -40rpx`、高度改 `var(--r-lg)` 同档 88rpx
- 修复类别：单页

### R15-L12-D04　P2 / 文案　批次 R16-B63
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`f933b426d46df519`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:979`
- 理想图依据：无基准；依据=组件规范「同列字段标签一致」+本页 R11-L12-D05 已给三行补的 .field-label（11px 可见字段名）
- 现象：帧首行只有 ♡ 图标 + 「请选择」+ 右箭头，「感情状态」四个字画面上不存在（只写在 aria-label）；同屏 籍贯省份/籍贯城市/未来城市 三行都有可见字段名 —— 上一轮 R11-L12-D05 只补了那三行，同一轴（画面上无字段名）在本行未修
- 建议改法：在该 .field 上方补一行 `<text class="field-label">`（与三行同档 22rpx/#4A524E），或把占位文改成带字段名的「请选择感情状态」；文案 key 交 locale 车道
- 修复类别：单页

## subpackages/setup/recommend-pref/index（2 条）

### R15-L12-D11　P3 / 间距　批次 R16-B64
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`340cc83f15783258`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:351`
- 理想图依据：无基准；依据=规范 §1.4「卡片内边距 32rpx / 区块间距 24rpx」与同页另两卡的紧凑节奏
- 现象：「校园优先」卡高 131px（y=580..711），其中 88rpx（44px）开关行只有右端 88×48rpx 轨道（帧上 x=306..350），左端约 270px 全空 —— R6-B68/D11 删掉行内「校园优先」标签后行高与留白未回收
- 建议改法：把开关收进副标题同一行右端（卡头 flex 两端对齐），行高回到 48rpx 视觉刻度，卡高回收约 44px；整卡保持可点
- 修复类别：CSS/token

### R15-L12-D12　P3 / 文案　批次 R16-B64
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`76adabe22fde2e66`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:258`
- 理想图依据：无基准；依据=规范 §1.1「一令牌一值」同域口径 + 同流程另三步 BottomActionBar 主键文案
- 现象：主按钮文案「保存」（帧上 2 字、344px 宽居中），同流程 campus/schedule/interest 的同一组件都是「保存并继续」（5 字）；本页保存后同样进入下一步（discover），按钮承诺与另三步不一致
- 建议改法：`:primary-label` 改取 `t('setup.campus.saveLabel')`（zh-CN 已有「保存并继续」），四页统一
- 修复类别：单页

## subpackages/setup/schedule/index（4 条）

### R16-L12-D04　P2 / 颜色token　批次 R16-B16
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`c2a5d4fd941e0cdc`）
- 源码证据：`apps/client/src/components/setup/SetupProgress.vue:424`
- 理想图依据：无基准；依据=规范 §1.2 brand-700 #1F8D6A 对白 4.14:1 / brand-800 对白 6.45:1，12px 标签不享大字号豁免
- 现象：本页新增进度条后，前两步已完成标签「基本信息」「校园认证」同取 --c-brand-700：帧上 x=28..74 / x=103..149 的全墨点实测 (31,141,106)=#1F8D6A，12px 压白卡 4.14:1（<4.5:1）；同排当前步「时间安排」#1A1E1C 15.3:1、未到达「推荐偏好」4.79:1，已完成档反而最弱
- 建议改法：同 R16-L12-D02，组件内已完成标签改 `--c-brand-800 #156B51`；两页共用一处即可同时修掉本帧与 campus 帧
- 修复类别：CSS/token

### R16-L12-D05　P2 / 圆角　批次 R16-B16
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`c2a5d4fd941e0cdc`）
- 源码证据：`apps/client/src/components/setup/SetupProgress.vue:271`
- 理想图依据：无基准；依据=规范 §1.4「卡片圆角 --card-radius 40rpx = 20px」（同类 SectionCard 实测同值）
- 现象：进度卡取 `--r-lg`（design-variables.scss:445 → 20rpx=10px），帧上卡顶 y=185 首行白像素起于 x=26、dy=3 时 x=19 ⇒ 半径≈10px；同一帧下方两张 SectionCard 顶 y=306 首行白起于 x=32、dy=5 时 x=23 ⇒ 半径≈20px。同一列三张卡两种圆角，10px 只有规范卡片档的一半
- 建议改法：`.setup-progress` 的 border-radius 改 `var(--card-radius, 40rpx)`，与 SectionCard 同档（padding/阴影不动）
- 修复类别：CSS/token

### R16-L12-D06　P2 / 颜色token　批次 R16-B65
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`324af2fcedfca480`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:177`
- 理想图依据：无基准；依据=规范 §1.3 小字 12px 不享豁免 + 对照度下限 4.5:1（次级文字 3:1–4.5:1 记 P2）
- 现象：**NEW：R15-L12-D09 的修法已落地但不足。** 时段框示例改为 i18n 占位后未挂 placeholder-class，走 UA 默认灰：帧上 y=538..549 墨点实测 (137,137,137)=#898A89，压框底 #F3FAF6 实算 3.30:1，12px 远低于 4.5:1；同卡副标题 #4A524E 约 7.9:1。它是本必填项在空态下唯一的填写引导
- 建议改法：给两处 input 挂同一 placeholder-class（`color: var(--c-text-tertiary #6B7571)`，对 #F3FAF6 约 4.9:1）或直接把 `--c-text-placeholder` 全局升档；常去区域框（:151）同批处理
- 修复类别：CSS/token

### R16-L12-D07　P3 / 颜色token　批次 R16-B65
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`324af2fcedfca480`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:337`
- 理想图依据：无基准；依据=规范 §1.1「页面底色 --c-bg-page #EEF7F2，页面间不得出现白/灰断层」+ 同流程 campus:490 已按该档回退
- 现象：本页 `page { background: var(--c-bg-container) }`（#FFFFFF），但帧上页面底取样 (5,600)=(238,247,242)、(370,500)=(237,246,241)，均落在 #EEF7F2 档（AppShell 铺满 100vh），声明的白底在整帧零像素；同域 campus 同一条规则已回退到 --c-bg-page，两页取档不一
- 建议改法：与 campus:490 同值改回 `background: var(--c-bg-page, #EEF7F2)`（零像素变化，消除孤儿声明与同域分叉），并在注释里同步撤回「统一纯白」的旧结论
- 修复类别：CSS/token

## subpackages/support/feedback/index（2 条）

### R15-L13-D01　P2 / 颜色token　批次 R16-B66
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`feb078a1f441ef91`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:649`
- 理想图依据：无基准，依据=规范§1.1「绿色=行动/选中态」+§1.2 brand 档；组件规范 SectionCard 内 chip
- 现象：新建提交卡的三个分类药丸「反馈/建议/活动提案」共用同一 `--c-bg-brand`(#E8FBF2) 浅绿底（.chip 与 .chip--active 底色逐字相同，见 :649/:665），选中态只靠 2rpx 描边区分，"绿=选中"语义失效；且未选中 chip 标签 `--c-brand-700`(#1F8D6A) 压 #E8FBF2 实算 3.85:1 <4.5:1。
- 建议改法：未选中 chip 底色改中性档（--c-bg-surface/--c-bg-container），仅选中态保留 brand 浅底；未选中标签色提到 --c-brand-800。
- 修复类别：CSS/token

### R15-L13-D02　P2 / 颜色token　批次 R16-B66
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`4e20996001b01a91`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:853`
- 理想图依据：无基准，依据=规范§1.2 次文本对比；组件规范 .history-header__btn
- 现象：「反馈历史」卡头右侧「历史记录」按钮（去历史列表唯一入口）标签 `--c-brand-700` #1F8D6A 压 `--c-bg-brand` #E8FBF2 药丸底，实算 3.85:1，24rpx(12px) 标签低于正文 4.5:1。
- 建议改法：标签色提到 --c-brand-800 #156B51（同底 6.4:1），或药丸底改 --c-bg-surface。
- 修复类别：CSS/token

## subpackages/tools/activities/detail（3 条）

### R16-L08-D05　P2 / 字号　批次 R16-B67
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`08dc3a4979d2e287`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:810`
- 理想图依据：无基准，依据=规范文档 §1.3 正文档 15/16px；同页「活动介绍」正文已是 --fs-xl 15px（墨迹 y=629..640 / 653..665）
- 现象：「每日 18:00-20:00」墨迹实测 x=78..167（90px 宽）、y=523..533（11px 高），「校园咖啡角」y=545..555 ⇒ 两行值仍是 --fs-base 24rpx=12px，与 12px 标签「时间/地点」（x=51..69）同档、比隔一张卡的活动介绍正文低两档；这两行是全页唯一的时间与地点事实。
- 建议改法：`.detail-meta__value` 的 font-size 提到 --fs-xl（30rpx=15px），`.detail-meta__label` 保持 24rpx（13px 档），行距 1.55。
- 修复类别：CSS/token

### R16-L08-D06　P3 / 文案　批次 R16-B67
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`08dc3a4979d2e287`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:746`
- 理想图依据：无基准，依据=规范文档 §1.1 规则 3「一屏只说一件事」与 R11-L08-D12 自陈「封面小徽标保留，两处同时在场」
- 现象：「示例活动」四字在同屏出现两次：封面左上角徽标（x=10..60、y=113..133，10px 字压半透明底）与标题下描边框（x=31..344、y=476..500，312×24px，#F3FAF6 底 + 1px #C2CAC6 描边 + 6px 圆角）逐字相同；第二处造型在卡内读起来像一枚禁用的标题输入框，且不说明卡里哪些字段是示例值。
- 建议改法：去掉标题下描边框的 border/底色，文案改整句（如「以下为示例活动内容」）；封面徽标只留「示例」二字，避免同词重复。
- 修复类别：单页

### R16-L08-D07　P2 / 间距　批次 R16-B67
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`e51b6da37e0e6d68`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:835`
- 理想图依据：无基准，依据=规范文档 §1.4 --section-gap 24rpx（12px）与同页 .detail-footer-space 自身的 140rpx 声明
- 现象：滚到底后「活动介绍」卡底缘实测 y=609，底部操作栏白底顶缘 y=722，中间 113px，其中 y=615..710 共 96px 是纯页底 #EEF7F2（占屏高 12%）；`.detail-footer-space` 仍是 calc(140rpx + env(safe-area-inset-bottom)) = 70px+34px，R15 实测 114px、本轮 108→113px，修法未落地。
- 建议改法：`.detail-footer-space` 收到 --sp-8（32rpx=16px）并只在 env(safe-area-inset-bottom)>0 时叠加，使卡底到操作栏只剩 --section-gap 一档。
- 修复类别：单页

## subpackages/tools/daily-question/index（4 条）

### R16-L07-D06　P2 / 尺寸比例　批次 R16-B68
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`e6f716e4aabcf0c4`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:460`
- 理想图依据：无基准页，依据=§1.4 卡片高度应由内容+32rpx 内边距决定；组件规范空/锁态卡不应超过内容 2 倍（R15-L07-D06 未修，新帧复现）
- 现象：锁态大卡占 y=100..665 共 566px（视口 814 的 70%，来自 min-height:70vh），卡内实际内容只有 y=303..465 共 163px（锁图标 303..358、标题 387..399、说明 407..419、CTA 423..465），卡内 403px（71%）是空白
- 建议改法：.lock-card 的 min-height:70vh 改为内容自适应（如 min-height:520rpx）+ padding 60rpx
- 修复类别：CSS/token

### R16-L07-D07　P3 / 文案　批次 R16-B68
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`e6f716e4aabcf0c4`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:199`
- 理想图依据：无基准页，依据=组件规范「同一出口一页只出现一次」，自定义导航与底部胶囊不应同文重复（R15-L07-D07 未修，新帧复现）
- 现象：同一帧「返回」出现两次：绿色自定义导航左侧「返回」(y≈63..78) 与卡下白胶囊「返回」(y=679..718)，两者都绑 goBack，锁态下底部胶囊无新增信息
- 建议改法：锁态下去掉 .lock-back 胶囊（或改文案为「稍后再来」并指向首页），保留导航唯一出口
- 修复类别：单页

### R16-L07-D08　P2 / 可达性　批次 R16-B68
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`cda3104c991bfc2e`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:537`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）（R15-L07-D09 未修，新帧复现）
- 现象：底部「返回」胶囊实测 y=673..712 共 40px（按 1px≈2rpx 合 80rpx），只有 88rpx 下限的 91%；样式已写 min-height:88rpx，帧上未兑现（同帧正文随页面整体上移 6px，疑为 flex 子项被压缩）；顶部导航仍有返回文字，故记 P2 不记 P1
- 建议改法：.lock-back 改 height:88rpx + flex-shrink:0 + box-sizing:border-box，复测盒高 ≥44px
- 修复类别：CSS/token

### R16-L07-D09　P2 / 位置　批次 R16-B68
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`cda3104c991bfc2e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:535`
- 理想图依据：无基准页，依据=§1.4 页边距 --page-padding 32rpx（16px）：同屏控件左右边缘应落在同一竖线上（R15-L07-D10 未修，新帧复现）
- 现象：底部「返回」胶囊实测 x=7..370 共 364px，而锁卡 x=18..360 共 343px，胶囊左右各多出 11px（22rpx），页边距在胶囊上只剩 3.5px；.lock-back 的 `margin: … auto …` 在 mp-weixin 列 flex 中被拉满未生效
- 建议改法：.lock-back 加 margin-left/right:32rpx 并 align-self:stretch，或显式定宽与卡片同缘
- 修复类别：CSS/token

## subpackages/tools/heart-signals/index（2 条）

### R16-L08-D03　P2 / 间距　批次 R16-B03
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`d6552d8eb0211ed1`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:833`
- 理想图依据：无基准，依据=规范文档 §1.4 sp 阶梯（--sp-9=48rpx=24px 是该段声明呼吸位）与「满屏页不留大段无主空带」；LockScreen.vue:817-833 自陈 action 贴底后「按钮之下只剩 --sp-9 + --sp-4」
- 现象：权益第 3 行「发起私信与匿名聊天」墨迹止于 y=407，主按钮「立即完善」胶囊顶缘 y=601，中间 194px 纯页面底（24px 声明值的 8 倍）；页脚提示仍钉在 y=733（R15 为 732）⇒ R15-L08-D07 并没有消掉空带，只是把 171px 从按钮下方整体搬到按钮上方并涨了 23px。
- 建议改法：让空带回到 sp 阶梯：`.lock-screen__body` 改 justify-content:space-between（插画/文案/权益三段之间各吃一档），或 CTA 去掉 margin-top:auto、改用 --sp-10 上边距并把余量交给页脚 —— 两种都能让权益→按钮这段不再是随屏高浮动的 194px。
- 修复类别：单页

### R16-L08-D04　P2 / 颜色token　批次 R16-B03
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`fa56747c996e3f1e`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:767`
- 理想图依据：无基准，依据=规范文档 §1.2 品牌梯 + WCAG 非文本图形 3:1；LockScreen.vue:760-768 自陈「边 vs 页底 3.34:1、边 vs 槽 3.02:1，两侧都 ≥3:1」
- 现象：进度条（y=313..319）未完成段 70% 的描边实拍只有一层混色 (134,212,183)=#86D4B7（x=135..326 顶边 y=313），压条外页面底 (226,232,228) 实算 1.39:1、压槽底 (163,235,207) 1.27:1 ⇒ 仍不到 3:1；源声明 #1F8D6A 应得 3.33:1，但 2rpx≈1px 的描边在 8px 条高上被子像素摊成 1/4 强度。「还差 70%」那 192px 段在这帧上仍只是一条比页底略深的浅绿带。
- 建议改法：描边由 2rpx 加到 4rpx（2px，取整到像素格），或把槽底由 --c-brand-200 #A3EBCF 加深到 --c-brand-300/400（对页底 ≥3:1），让完成/未完成的分界不再依赖 1px 线。
- 修复类别：CSS/token

## subpackages/tools/help/index（4 条）

### R15-L07-D17　P2 / 可达性　批次 R16-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`15fc5de5c1a94ed3`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:201`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）：整行 role=button 的折叠条目必须 ≥88rpx
- 现象：6 条 FAQ 条目文字基线 y=248/291/333/377/421/464，条目浅底实测 42px=84rpx（含 1px 白缝后步距 43px），比 88rpx 下限少 4rpx；条目上下 padding 只有 24rpx（12px）
- 建议改法：.help-faq__item 纵向 padding 改 26rpx（或 min-height:88rpx），条目高落 88rpx 整
- 修复类别：CSS/token

### R15-L07-D18　P2 / 可达性　批次 R16-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`15fc5de5c1a94ed3`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:329`
- 理想图依据：无基准页，依据=§1.4/AppShell 触控下限 88rpx（44px）；同页 :322 注释自陈已补 88rpx 两向
- 现象：「复制」胶囊帧测 x=300..341 共 42px=84rpx 宽（高 44px=88rpx 已达标），宽向仍差 4rpx；R14-L07-D12 已写 min-width:88rpx，但帧上只兑现 84rpx，「复制」是本页唯一剪贴板出口（上一轮修得不够）
- 建议改法：.help-contact__copy 用 width:88rpx（定宽替 min-width）+ box-sizing:border-box，或 padding 横向改 24rpx，复测宽度 ≥44px
- 修复类别：CSS/token

### R15-L07-D19　P2 / 字号　批次 R16-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`74e2f488d4a2e8c3`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:358`
- 理想图依据：无基准页，依据=§1.3 正文/辅助档 14–15px；同卡说明行已取 --fs-lg 14px，邮箱地址不应比它更小
- 现象：明文邮箱行取 var(--fs-base)=24rpx=12px（帧 y=730..744，墨高 12px），比同卡「在线客服 9:00-21:00 在线」说明行 14px 还小一档，而邮箱是本行最需要核对的字符，也是可选中复制的对象
- 建议改法：.help-contact__email 改 var(--fs-lg, 28rpx)=14px，与说明行同档，靠色重（--c-text-primary）拉层级
- 修复类别：CSS/token

### R15-L07-D20　P3 / 间距　批次 R16-B69
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`74e2f488d4a2e8c3`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:338`
- 理想图依据：无基准页，依据=§1.4 区块间距 --section-gap 24rpx（12px）：页脚块上下留白应同档
- 现象：滚动到底后「联系我们」卡底 y=689 到页脚首行 730 为 41px，页脚末行 764 到 home indicator 顶边 800 为 36px，上下差 5px；页脚上下 padding 一个 32rpx(16px) 一个 12px，与 24rpx 区块间距不成档
- 建议改法：.help-footer padding 改 24rpx 24rpx calc(env(safe-area-inset-bottom) + 24rpx)，上下取同一 --section-gap
- 修复类别：CSS/token

## subpackages/tools/love-center/consulting（3 条）

### R15-L09-D01　P2 / 字号　批次 R16-B70
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`68f0cbf46e723815`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:218`
- 理想图依据：无基准；依据=《全站设计规范与逐页设计稿说明》§1.3 字号层级（区块标题 --fs-3xl=18px，卡片状态标题不应低于区块标题）
- 现象：封存卡主标题「功能封存中」取 --fs-xl(30rpx=15px)，帧上墨高 14px（y=258–271）；其下方区块标题「精选课程，助你提升恋爱能力」取 --fs-3xl(36rpx=18px)，墨高 17px（y=412–428）——页面唯一状态标题反而比次级区块标题小 3px，字号层级倒挂。
- 建议改法：.consult-sealed__title 改 var(--fs-3xl, 36rpx)（与 verification/index.vue .status-card__title 同档），兜底字面量同步 36rpx。
- 修复类别：CSS/token

### R15-L09-D02　P2 / 空态文案　批次 R16-B70
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`68f0cbf46e723815`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:102`
- 理想图依据：无基准；依据=§1.3 正文档（--fs-lg 14px）+ 同域封存态出口约定（R6-L10-D16 已给封存卡补「帮助与客服」）
- 现象：课程区只剩一行「咨询/课程内容筹备中，敬请期待」（14px，墨迹 y=443–456），其下无任何可点节点；上方封存卡已说「该功能暂未开放」，同页两条「不可用」叠加，hint 末行以下到视口底共 358px 空白，页内唯一的次级出口仍在卡片内部（「帮助与客服」）。
- 建议改法：课程区空态补一个同级出口（复用 goHelpCenter 的描边按钮）或整块删掉，避免同一页两次「暂未开放」却只有卡片内一个出口。
- 修复类别：单页

### R15-L09-D03　P3 / 颜色token　批次 R16-B70
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`68f0cbf46e723815`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:214`
- 理想图依据：无基准；依据=§1.2 色表（--c-text-tertiary #6B7571；表内无 #707070 灰档）+ 同为空态的 visitors 眼睛图标（资产原色 #94A3B8）
- 现象：锁图标用 filter saturate(0) brightness(0.71) 压成纯灰，帧上描边实测 #707070(112,112,112)；同域空态眼睛图标保持 #94A3B8(148,163,184)（visitors 帧实测），两页空态图标一灰一蓝灰，且 #707070 不在 §1.2 色表。
- 建议改法：与 visitors.vue:514-524 同口径先去掉 filter，再由资产车道把两枚图标的 stroke 统一改 --c-text-tertiary #6B7571，避免继续用 CSS 滤镜分叉出第三种灰。
- 修复类别：CSS/token

## subpackages/tools/love-center/index（2 条）

### R16-L07-D10　P3 / 文案　批次 R16-B71
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`5980f1f646e46199`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:145`
- 理想图依据：无基准页，依据=§1.3 层级命名：区块标题与其下条目不应逐字同名（R15-L07-D15 未修，新帧复现）
- 现象：区块标题「恋爱咨询」(y=264..279，墨高 16px) 与宫格第一张卡标题「恋爱咨询」(y=336..350，墨高 13px) 逐字重复，两者相距仅 57px，同屏两次出现后用户分不清哪个是可点入口
- 建议改法：区块标题改用更上位键（如「情感服务」），或把四宫格首卡改名（如「1v1 情感咨询」）
- 修复类别：单页

### R16-L07-D11　P2 / 间距　批次 R16-B71
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`5980f1f646e46199`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:204`
- 理想图依据：无基准页，依据=§1.4 区块间距 24rpx/页底收口，页面不应在视口内提前 196px 断尾（R15-L07-D12 未修；本帧与 top 帧同 hash 5980f1f646e46199，逐像素相同）
- 现象：「恋爱测试」MBTI 卡白底止于 y=616，视口底 812，其下 196px（按 1px≈2rpx 合 392rpx）纯页面底空白，占视口 24%；bottom 帧与 top 帧同 hash 说明这 196px 滚不动，页底只有 padding-bottom:env(safe-area-inset-bottom)=0
- 建议改法：「恋爱测试」区补第二条测试入口（需新建目标页），或把该区改成两列宫格填掉空底；单纯加 padding-bottom 不改变画面
- 修复类别：需新建目标功能

## subpackages/tools/love-center/mbti（4 条）

### R15-L08-D16　P2 / 颜色token　批次 R16-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`b4dbdc41f441547b`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:488`
- 理想图依据：无基准，依据=规范文档 §1.2 边框三档（最深 --c-border-strong #C2CAC6 对白 1.67:1，是本页可取的唯一深档）与 WCAG 非文本控件边界 3:1；同页 .card-action/.quiz-submit 等可点件均已按可辨档落地
- 现象：8 个作答选项是页面上唯一的可点控件，实测填充 #F3FAF6 对白卡 1.04:1、描边 1px 实测像素 (240,244,242)≈#F0F4F2 对白 1.13:1 ⇒ 选项框边界 <3:1，帧上两个选项几乎并成一片白，只能靠文字位置判断哪里能点。
- 建议改法：.quiz-option 的 border 由 --c-border-light #EEF2F0 换到色板最深档 --c-border-strong #C2CAC6 并保持 2rpx（1.67:1，色板内无 3:1 浅边框档，属 token 债）；可点提示由选中态 --c-brand-700 描边（4.7:1）承担。
- 修复类别：CSS/token

### R15-L08-D17　P2 / 字号　批次 R16-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`b4dbdc41f441547b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:405`
- 理想图依据：无基准，依据=规范文档 §1.3（10/11px 只给角标·法务；标签走 12–13px），同页题干 --fs-lg 14px、选项 15px
- 现象：16 型速览上方的四维图例是唯一解释 E/I·S/N·T/F·J/P 的说明，帧上整行墨迹仅 y=172..180（9px 高），其中中文档取 --fs-xs 20rpx=10px，比同页题干预（14px）低两档；一屏 16 个英文缩写没有它就读不懂。
- 建议改法：.dimension-chip__label 的 font-size 由 --fs-xs 提到 --fs-md（26rpx=13px）或 --fs-base（12px），chip 纵向 padding 同步收到 4rpx 避免行高溢出。
- 修复类别：CSS/token

### R15-L08-D18　P2 / 间距　批次 R16-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`078e3fb1e07e7ba8`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:542`
- 理想图依据：无基准，依据=规范文档 §1.4 sp 阶梯与 R11-L08-D28 自陈「钮下不再有阶梯外的空段」；.content-footer-space 声明 --sp-8=16px
- 现象：滚到底后主 CTA「提交并查看结果」墨迹止于 y=757，其后 y=758..814 共 56px 纯 #EEF7F2 空底，是声明值 16px 的 3.5 倍；CTA 下缘距 Home Indicator（y=800..806）43px，中间这 56px 既不是安全区也不是 sp 档。
- 建议改法：.content-footer-space 保持 --sp-8 的同时把 scroll-view 尾部余量交给它（改为 flex:1 吸收），或把提交钮移入固定底栏（BottomActionBar 同款），使钮下只剩安全区。
- 修复类别：单页

### R15-L08-D19　P2 / 字号　批次 R16-B72
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`078e3fb1e07e7ba8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:501`
- 理想图依据：无基准，依据=规范文档 §1.3（区块标题 18/20px、正文 15/16px）；题干应比选项高一档
- 现象：每题题干「周末更愿意怎么过？」墨迹 y=420..431（11px，字号 14px=--fs-lg），选项「约朋友出去玩」墨迹 y=456..467（同为 11px，字号 15px=--fs-xl）⇒ 选项比题干大 1px，四张题卡上题干与选项读成同一层级，题与答案的边界只能靠卡片间距分辨。
- 建议改法：题干 .quiz-item__question 提到 --fs-3xl（18px）/700，选项维持 --fs-xl 15px，把两组墨迹高拉开 ≥3px。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（4 条）

### R15-L08-D12　P2 / 字号　批次 R16-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`2e6eb4f82eee8b2e`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:266`
- 理想图依据：无基准，依据=规范文档 §1.3 页面主标题 26–28px / 大标题 22px；同域 mbti 页头「MBTI 人格测试」墨迹 20px（字号 22px）、activities 页头已按 --fs-5xl 22px 落地
- 现象：页头标题「附近的人」墨迹实测 x=63..117、y=69..80（4 字 54px 宽、12px 高）⇒ 字号 15px（--fs-xl），落在 §1.3 正文档；同域另两页页头均为 22px（mbti 墨迹 20px），本页比它们矮两档。
- 建议改法：.content-header__title 的 font-size 由 --fs-xl 提到 --fs-5xl（44rpx=22px）并与 mbti.vue 页头同档，保持 700 字重与 --c-text-primary 墨色。
- 修复类别：CSS/token

### R15-L08-D13　P2 / 颜色token　批次 R16-B04
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`2e6eb4f82eee8b2e`，自同段前条继承）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1836`
- 理想图依据：无基准，依据=规范文档 §1.2（brand-500 #36C99A 作「主色/选中态」，未给白字档）与正文 4.5:1 门槛；同族深档 --c-brand-800 已在全站 4 处 CTA 收敛
- 现象：卡右上「在线」徽章底实测 (16,177,124)≈#10B17C（0.95 不透明品牌绿压暗底），白字 11px 对其 2.76:1；「22岁」胶囊底 (61,204,157)≈#3DCC9D，白字 16px 对其 2.10:1 —— 两处都 <4.5:1，16px/600 不享大字号豁免，卡上在线状态与年龄几乎读不出。
- 建议改法：.card__online-badge 底改 --c-brand-800（#156B51，白字 6.45:1）、.card__age 底由 brand-400/500 渐变收成 --c-brand-800 纯色，两处文字保持 --c-text-inverse。
- 修复类别：CSS/token

### R15-L08-D14　P2 / 位置　批次 R16-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`f75fd3e806f380d4`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:298`
- 理想图依据：无基准，依据=规范文档 §1.4 页边距/安全区口径与 LockScreen.vue:837-843 同口径裁定（底部文字距手势条 ≥68rpx=34px）；本帧与 top 帧逐像素相同（状态栏同为 18:01）
- 现象：「查看全部推荐」胶囊实测 y=759..799（44px 高，热区达标），底缘距系统 Home Indicator（y=800..806）仅 1px，胶囊与手势条在帧上几乎相贴；根因是 .nearby-card-area 底部只吃 --sp-6（12px），没有叠加 env(safe-area-inset-bottom)。
- 建议改法：.nearby-card-area 的 padding-bottom 由 var(--sp-6) 改成 calc(var(--safe-bottom, env(safe-area-inset-bottom)) + 72rpx)（与 .lock-screen__footer 同配方），让唯一批量出口离手势条 ≥34px。
- 修复类别：单页

### R15-L08-D15　P2 / 间距　批次 R16-B73
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`f75fd3e806f380d4`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:323`
- 理想图依据：无基准，依据=规范文档 §1.4 --section-gap 24rpx=12px；R7-L08-D09/D10 自陈尾部块是「低密度收尾」，不是吸收余量
- 现象：三枚动作钮底缘 y=668 到尾部提示墨迹 y=738 之间 70px 空带（--section-gap 的 5.8 倍），而同一尾部块内「提示→按钮」只有 9px（y=750→759）；同屏一段 70px、一段 9px，两段都不在 sp 阶梯上。
- 建议改法：去掉 .nearby-tail 的 margin-top:auto（或把 .card-swiper-host 恢复 flex:1 吸收余量），让钮到提示回到 --sp-8/--sp-9 一档，提示到按钮保持 --sp-3。
- 修复类别：单页

## subpackages/tools/search/index（2 条）

### R16-L08-D01　P2 / 可达性　批次 R16-B74
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`f44bd758169a8d33`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:786`
- 理想图依据：无基准，依据=规范文档 §1.4 触控下限 88rpx 与仓内自陈 AppShell.vue:334「min-height: 88rpx(44px)」；同帧已修到 88rpx 的历史 chip（y=204..247=44px）与返回键（44px）为同页对照
- 现象：右上「清除」墨迹实测 x=340..361、y=177..188（22×11px = 44×22rpx），`.section-clear` 只有 font-size/color 两条声明，没有 padding 也没有 min-height ⇒ 可点区就是这 22×11px，只有同帧 chip 热区的 1/4 高；清空搜索历史在页内没有第二个出口（无长按菜单、无结果区入口）。
- 建议改法：给 `.section-clear` 补 min-height:88rpx + padding: 0 0 0 24rpx 并用 flex 居中（视觉 12px 字不动），或把热区扩到整个 `.section-head` 右半段。
- 修复类别：单页

### R16-L08-D02　P2 / 颜色token　批次 R16-B74
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`b61ffd2f7e318fa4`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:633`
- 理想图依据：无基准，依据=规范文档 §1.2 输入底/描边令牌表与 WCAG 非文本控件边界 3:1；同页 R15 已按同一口径修过「清除」墨色
- 现象：本帧（与 top 仅状态栏时钟 0:38/0:37 不同）上唯一输入入口的胶囊填充实测 (243,250,246)=#F3FAF6，压白色 sticky 头部实算 1.04:1；1rpx 描边 `--c-border-light` 实拍落成 (240,243,242)，压白 1.09:1 ⇒ 输入框边界 <3:1，帧上胶囊只是白头部里一块几乎同白的浅绿，边界完全靠 placeholder 文字给出。
- 建议改法：`.search-box` 描边换色板最深档 `--c-border-strong` #C2CAC6（压白 1.67:1，色板内无 3:1 浅边框，属 token 债，口径同 R15-L08-D16），或把 `.search-header` 底色由 #FFFFFF 改为 `--c-bg-page` #EEF7F2 让 #F3FAF6 反相浮出。
- 修复类别：CSS/token

## subpackages/tools/security/index（3 条）

### R16-L07-D12　P2 / 文案　批次 R16-B75
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`12d8372f2069776e`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:46`
- 理想图依据：无基准页，依据=§1.2/§1.3 信息真实性：已绑定手机号必须给出可核对的脱敏尾号（R15-L07-D21 未修，新帧复现）
- 现象：「绑定手机号」副行只渲染「已绑定（号码脱敏）」这句占位短语（i18n zh-CN.ts:1785 逐字同；帧 y=310..323 整行无一数字），用户点进「修改密码/注销账号」前核不到自己绑的是哪个号
- 建议改法：phoneBound 时按 `138****8888` 渲染；未下发时改「已绑定 · 尾号未知」并给出「更换手机号」入口
- 修复类别：单页

### R16-L07-D13　P2 / 字号　批次 R16-B08
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`12d8372f2069776e`，自同段前条继承）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:415`
- 理想图依据：无基准页，依据=§1.3 字体层级「辅助 14/15px」用于说明；页头描述句不应落在「小字 12/13px（标签·时间戳）」档
- 现象：页头描述「账号安全与隐私保护」取 var(--fs-base)=24rpx=12px，帧测 9 字墨宽 104px（x=17..120）＝11.5px/字、墨高 11px（y=147..157），比 §1.3 说明档 14px 小 2px，与 27px 页标题落差 15px；该副标题是 AppShell 共用出口，同批 9 个宿主同受影响
- 建议改法：.shell__subtitle 改 var(--fs-lg, 28rpx)=14px，行高 1.5
- 修复类别：CSS/token

### R16-L07-D14　P2 / 层级遮挡　批次 R16-B08
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`7de6300ad553bd74`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:128`
- 理想图依据：无基准页，依据=§1.4 底部安全区：内容/容器不得与 home indicator 重叠（R15-L07-D25 未修，新帧复现）
- 现象：「危险操作」卡白底从 y=683 一直铺到 y=811，系统 home indicator 黑条实测 y=801..803、x=135..244，直接压在这张卡最后 10px 上；AppShell 未开 tabBarSafe 时底部内边距返回 '0'，页面与卡片都没有安全区留白
- 建议改法：页面容器补 padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx)，或 AppShell 传 tab-bar-safe 让 bodyPaddingBottom 生效
- 修复类别：CSS/token

## subpackages/village/village/detail（3 条）

### R15-L03-D05　P2 / 颜色token　批次 R16-B76
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`7a71abf08fb72dd6`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1492`
- 理想图依据：帖子.png 底部输入栏右端三枚图标（@/笑脸/图片）为深墨色线性图形，无彩色填充底块
- 现象：帧上输入栏「添加图片」钮实测为品牌绿实心圆角方块（素材 assets/icons/match/chat-image.png 逐像素取样主色 ≈#36C99A 满幅绿），与理想图同位深灰线性图标色相、图底关系双双不符；同栏 @ 与笑脸均为灰色，单枚绿色破坏同组一致性
- 建议改法：换用仓内深灰线性图片图标（如 SVG_SPEC_DIR image.svg，images.ts:849 已注册），与 @/笑脸同墨色
- 修复类别：单页

### R15-L03-D06　P2 / 需新建　批次 R16-B76
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`7a71abf08fb72dd6`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1006`
- 理想图依据：帖子.png 大图下方位置行 =「📍北京大学·未名湖校区」绿胶囊 + 灰字「距你 1.2km」；规范文档§3.13 亦写明「位置距离行」
- 现象：帧上位置行实测只有 📍南开大学 胶囊，理想图同位的「距你 X.Xkm」距离文字整段缺席——源码 :1006 距离节点被清空为注释占位（MP-R2-DETAIL-001 移除写死假距离），后端无真实距离字段可绑定
- 建议改法：后端补作者/帖子距离字段后接真值渲染「距你 N km」；字段就绪前保持隐藏并在 §3.13 登记为已知差异，勿留空 text 节点
- 修复类别：需新建目标功能

### R15-L03-D07　P2 / 颜色token　批次 R16-B76
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`b8350dd83965a341`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:2567`
- 理想图依据：帖子.png「全部评论 (32)」计数为括号内灰色纯文本（≈#9AA39F），无底色、无胶囊
- 现象：帧上「全部评论」后的计数实测为绿底胶囊（.comments-count 取 $green-primary 字色 + $green-light 底 + r-full 圆角），理想图同位是无底色灰字「(32)」；R13-L03-D03 仅把括号半全角对齐（:1064 注释），胶囊底/字色这条颜色轴从未动过，非重报
- 建议改法：去掉 background/padding/圆角，计数改 --c-text-placeholder 灰字（fs-md），仅保留全角括号形态
- 修复类别：单页

## subpackages/village/village/history（4 条）

### R15-L03-D11　P2 / 可达性　批次 R16-B77
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__top.png`（sha16=`d47253de5c2db7fb`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:388`
- 理想图依据：无基准，依据=任务书严重度口径热区基线 88rpx（44px）
- 现象：帧上「清空记录」胶囊实测高 ≈25px（.history-clear 纵向 padding 仅 8rpx + 24rpx 文本），热区不足 88rpx 基线六成，且为破坏性动作、误触成本高（本页唯一清空出口）
- 建议改法：纵向 padding 8rpx→30rpx 或 min-height:88rpx 居中，参照 tag-posts.vue:626 同款修法
- 修复类别：单页

### R15-L03-D12　P3 / 颜色token　批次 R16-B77
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__top.png`（sha16=`d47253de5c2db7fb`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:327`
- 理想图依据：无基准，依据=规范文档§1.2 页面底色 --c-bg-page 唯一真值 #EEF7F2
- 现象：页根背景写 var(--c-bg-page, #f5f6fa)——兜底字面量是蓝灰 #f5f6fa，与全站浅绿 #EEF7F2 不同族；令牌未注册环境（H5 预览/暗色注入失败）整页变灰断层。当前 mp 帧上因变量已注册未现色差，属无消费者孤儿兜底值
- 建议改法：兜底字面量改为与 --c-bg-page 真值同值的 #EEF7F2（或直接去兜底，让缺令牌显性暴露）
- 修复类别：CSS/token

### R15-L03-D13　P3 / 文案　批次 R16-B77
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`ddfd2da8ae210842`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:254`
- 理想图依据：无基准，依据=组件规范（同列表零值口径应一致）
- 现象：帧上每张卡统计行实测「赞 0 藏 0 看 N 评 N」——赞/藏/看零值照印（:251-253 无 v-if），评论却 >0 才显示（:254 v-if），同一行内两套零值取档，满屏「赞 0 藏 0」冗余噪声
- 建议改法：四计数统一口径：要么零值全隐（与评一致），要么产品定稿全显，并同步 village 域其它卡
- 修复类别：单页

### R15-L03-D14　P3 / 文案　批次 R16-B77
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`ddfd2da8ae210842`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:237`
- 理想图依据：无基准，依据=规范文档§1.3 小字档（标签·时间戳）一致性要求
- 现象：帧上同一列时间戳实测三种形态混排：「刚刚」「2 天前/3 天前/4 天前」「2026/09/06」，且日期用斜杠分隔——同域 detail.vue 帖内时间同为 formatRelativeTime 但理想图基线是「N 分钟前」相对档；斜杠日期与站点文档/其余页 yyyy-MM-dd 横杠档不一致
- 建议改法：统一超过 7 天的时间戳分隔符档（横杠或中文「9月6日」二选一），全 village 域同 formatter 出口
- 修复类别：单页

## subpackages/village/village/index（4 条）

### R16-L02-D16　P3 / 尺寸比例　批次 R16-B03
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__village__village__index__top.png`（sha16=`bfea6200724dfc11`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:710`
- 理想图依据：无基准，依据=规范文档 §1.3「行高 正文 1.55–1.6，中文不得在词中拆行」+ 组件规范 LockScreen.vue .lock-screen__subtitle
- 现象：副标题仍折成两行且断在词中：首行墨迹 x=55-323（268px、20 字 ⇒ 实测字宽 13.4px）、次行 x=136-242（106px、8 字 = 首行的 40%），「校园活动」被拆成「校」/「园活动等全部功能」。R15-L02-D14 的修复不足：:710 按「14px/字」把 max-width 定成 550rpx(275px) 想断在第 19 字后，但帧上真实字宽是 13.4px ⇒ 20 字 = 268px ≤ 275px 仍然塞得下，断点一格没动。要落在顿号后需 max-width ≤ 19.5*13.4 ≈ 261px ⇒ ≤ 520rpx。
- 建议改法：:710 改 max-width:520rpx（或直接给副标题写手动断行「…聊天、」/「校园活动等全部功能」两行等长），并在卡上标注真实字宽 13.4px 以免下次又按 14px 反推。
- 修复类别：CSS/token

### R16-L02-D17　P2 / 间距　批次 R16-B03
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__village__village__index__top.png`（sha16=`bfea6200724dfc11`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:833`
- 理想图依据：无基准，依据=规范文档 §1.4 间距阶梯（--section-gap 24rpx=12px、--sp-9 48rpx=24px，组间间隙必须落在 sp 阶梯上）+ 组件规范 LockScreen.vue .lock-screen__action
- 现象：权益清单第 3 行墨迹止 y=430，主按钮顶缘 y=601，中间 171px(342rpx) 是一条不落在 §1.4 任何一档的无主空带，是同屏其余组间隙（标题→副标题 13px、读数→条 9px、条→权益 13px、链接→页脚 49px）的 7–19 倍。R15-L08-D07 的修复不足：:833 margin-top:auto 只是把原来「链接之下 171px」的空带搬到「权益之下」，视口余量没有被任何一档令牌吸收，只是换了位置。
- 建议改法：取消 :833 的 margin-top:auto，改由 .lock-screen__body 的 justify-content 定值分配（或把余量给 :923 .lock-screen__footer 一处吸收），使权益→按钮回到 --sp-9(24px) 一档。
- 修复类别：CSS/token

### R16-L02-D18　P3 / 文案　批次 R16-B19
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`6d5568f1784e6d93`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:2890`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 资料完整度卡标题逐字「资料完整度」（1208 宽图 x≈270-380、y≈330-350）；规范文档 §3.8 同条写「资料完整度（细进度条 + 百分比…）」
- 现象：同一个数在两页叫两个名：本帧读数行墨迹 x=136-242、y=312-324 逐字「当前完善度 30%」（zh-CN.ts:2890 completionProgress），而本人主页同一指标叫「资料完整度」（MyCompletion.vue:14）且理想图/§3.8 都用「完整度」；本帧条填充实测 x=50-132（83px）/ 槽 x=50-329（280px）= 29.6% 与 30% 对得上，数值没错，错的是同域两页取档不一（完善度 vs 完整度、且锁屏条目还漏掉「资料」二字）。
- 建议改法：:2890 值改「资料完整度 {n}%」（en 同键同治），或让锁屏复用主页那一条 i18n 键，全站一名。
- 修复类别：单页

### R16-L02-D19　P2 / 间距　批次 R16-B03
- 帧：`tmp/qa/frames/R16/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`6d5568f1784e6d93`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:833`
- 理想图依据：无基准，依据=规范文档 §1.4 间距阶梯 + 组件规范 LockScreen.vue .lock-screen__action（R14-L08-D01/R15-L08-D07 两条注记都要求组间间隙为定值）
- 现象：本帧（状态=bottom）与 top 帧逐像素比对只有 645/307692 个像素不同（0.21%），且全部落在 x=26-282、y=18-107 那条状态栏+漂浮爱心带内，y=107 以下整块内容一模一样——说明这一屏根本不滚，:833 margin-top:auto 造出的那条空带是**固定版式**而不是滚动余量：权益第 3 行止 y=430 → 主按钮顶缘 y=601 = 171px(342rpx)，而按钮之下只剩链接（y=671-683）与页脚（y=732-742），空带占满屏高 21%。R15-L08-D07 的 auto 修法在本帧被证实只是搬位不减量。
- 建议改法：:833 去掉 margin-top:auto，把视口余量集中交给 :923 .lock-screen__footer 一处（或 body 用 --sp-9/--sp-10 定值 + 底部 padding 吸收），使权益→按钮回到 24px 一档。
- 修复类别：CSS/token

## subpackages/village/village/post（4 条）

### R15-L03-D01　P2 / 素材缺失　批次 R16-B78
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__top.png`（sha16=`116538009c21f501`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1031`
- 理想图依据：无基准，依据=规范文档§3.14（统一发布页布局：底部工具栏「图/视频/话题/位置/提及/更多 6 图标」）；另§5.2 遗留清单第 1 项「发帖页底部 6 工具栏图标（P2）」
- 现象：帧上底部工具栏实测仅 5 枚（图片/话题/位置/提及/更多），规范 §3.14 要求的第 6 枚「视频」入口整枚缺席（源码 .post-toolbar 内亦无任何 video/视频节点）
- 建议改法：在 .post-toolbar 补第 6 枚「视频」工具位（lucide 单色 SVG + 既有 post-tool 结构），后端无能力前可置灰并 toast 说明；post.vue 系旧发帖页（规范§2 注 146 行），若产品裁定只保 publish.vue 则在文档撤销该 6 图标要求
- 修复类别：需新建目标功能

### R15-L03-D02　P3 / 文案　批次 R16-B78
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__top.png`（sha16=`116538009c21f501`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:897`
- 理想图依据：无基准，依据=规范文档§3.14（正文输入 0/1000）
- 现象：帧上正文计数器实测「0/500」，规范 §3.14 逐页说明写「正文输入（0/1000）」；实现取 constants/village.ts:18 POST_MAX_LENGTH=500（publish.vue:22 注释载明 500 为后端校验真相），规范文档与实现两处口径互斥
- 建议改法：以 500 为准回改规范文档 §3.14 的 0/1000 表述（文档侧勘误），避免下轮按 1000 误修
- 修复类别：单页

### R15-L03-D03　P3 / 文案　批次 R16-B78
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__top.png`（sha16=`116538009c21f501`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1081`
- 理想图依据：无基准，依据=规范文档§3.14（工具栏末位「更多」应为聚合入口）
- 现象：帧上工具栏末枚标「更多」，实测点击只打开「谁可以看」可见范围弹层（@tap="visibilitySheetOpen = true"，:1078），与上方「谁可以看」行（:986）完全重复，名不符实、无「更多」聚合内容
- 建议改法：该枚图标/文案二选一对齐功能：改标「可见」配眼睛图标，或扩成含举报/草稿等的聚合面板
- 修复类别：单页

### R15-L03-D04　P3 / 颜色token　批次 R16-B78
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`70858eaae52f81a7`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1595`
- 理想图依据：无基准，依据=规范文档§1.2（brand-50 唯一真值 #E8FAF3）+§1.1 一令牌一值
- 现象：帧底「发帖小贴士」卡浅绿底取 var(--c-brand-50, #EAF9F3)，兜底字面量 #EAF9F3 是过期私值（同文件 :1610-1612 注释自证「不信 .vue 里那句 #EAF9F3 过期兜底」），令牌未注册环境下将渲染成非规范色
- 建议改法：兜底字面量统一改 #E8FAF3（与 design-variables $brand-50 真值同值），消灭孤儿兜底色
- 修复类别：CSS/token

## subpackages/village/village/publish（2 条）

### R15-L02-D15　P2 / 文案　批次 R16-B79
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`fd9635d1f4270775`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:856`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文右下计数「0/1000」；规范 §3.14「正文输入（0/1000）」
- 现象：帧上计数器（x=303-355，y=388-400）显示「12/500」，上限 500 与理想图/规范 1000 相差一半；正文写到 500 字就被硬截，用户按理想图预期写长文拿不到后 500 字
- 建议改法：stores/village 的 MAX_CONTENT_LENGTH 提到 1000（:848 maxlength 与 :856 计数同源，一处改两处生效），并复核 store 侧校验口径
- 修复类别：单页

### R15-L02-D16　P3 / 字号　批次 R16-B79
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`cbe3b84a5c27afb5`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1398`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部工具栏标签「图片/视频·话题·位置·提及·更多」墨迹高约 26px（853 宽图）折算 378px 宽 ≈11.5-12px；规范 §1.3 小字档 12-13px
- 现象：帧上工具栏五枚标签（图片/话题/位置/提及/谁可以看，y=745-756）字面高仅 7px，:1398 font-size:20rpx=10px，落进 §1.3「极小（角标·法务）」档而不是工具栏小字档，比理想图同位 11.5px 低一档且与 40rpx 图标（20px）比例失衡
- 建议改法：:1398 改 24rpx（12px），图标维持 40rpx；行高同步 1.2 防止工具栏总高被撑破
- 修复类别：CSS/token

## subpackages/village/village/tag-posts（3 条）

### R15-L03-D08　P3 / 颜色token　批次 R16-B80
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`c8999773a7dc81da`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:553`
- 理想图依据：无基准，依据=规范文档§1.1 原则 1「主题底色统一浅绿，页面间不得出现断层」+ 同域 detail/post/history 三页页头实测均为浅底深字
- 现象：帧上页头实测为深绿渐变横幅（linear-gradient 135deg #156B51→#0B4A38）+ 白字标题，同域其余页（detail「帖子详情」/history「浏览记录」/post「发布动态」）页头都是浅底深字，同域两页取档不一、页头成全站唯一深色断层
- 建议改法：页头改浅底（--c-bg-page 或卡白）+ --c-text-primary 标题，返回钮沿用其余浅页头族口径
- 修复类别：单页

### R15-L03-D09　P3 / 文案　批次 R16-B80
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`c8999773a7dc81da`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:350`
- 理想图依据：无基准，依据=组件规范（量词按对象取档：帖子用「篇」，浏览行为才用「条记录」）
- 现象：帧上标签头卡副行实测「共 2 条记录」——直接复用浏览记录页文案键 village.history.count，把「帖子列表」说成「记录」，与本页列表实体（帖子卡流）不符
- 建议改法：换用帖子计数键（如 village.tagPosts.postCount「共 N 篇帖子」），不再借用 history 键
- 修复类别：单页

### R15-L03-D10　P2 / 可达性　批次 R16-B80
- 帧：`tmp/qa/frames/R15/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`1e56b85938ec7b9e`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:888`
- 理想图依据：无基准，依据=任务书严重度口径热区基线 88rpx（44px）+ 组件规范互动栏钮族
- 现象：帧上卡片脚注三枚互动钮（评论/点赞/分享）实测图标 28rpx、.action-btn 纵向 padding 仅 6rpx，整钮热区高 ≈40rpx(20px)，不足 88rpx 基线一半；其中「分享」（:480-487）在本页无第二出口
- 建议改法：.action-btn 纵向 padding 6rpx→30rpx 或加 min-height:88rpx 负外边距补偿，与 tag-hero__btn（:626 已按此法修达标）同口径
- 修复类别：单页

