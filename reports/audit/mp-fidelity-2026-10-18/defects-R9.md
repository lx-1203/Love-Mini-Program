# R9 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=140　涉及页面=50　涉及帧=100　泳道卡=10　段内继承哈希=28（同段第二条起未重复抄录，非逐条见证）
- 严重度分布：P2=102　P3=24　P1=14
- 轴分布：可达性=45　颜色token=26　字号=12　文案=11　位置=11　素材缺失=10　尺寸比例=8　间距=7　层级遮挡=6　圆角=4
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=10　涉及车道：R9-L10
- 批次归属：140 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/discover/index（3 条）

### R9-L01-D07　P2 / 颜色token　批次 R9-B09
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__discover__index__top.png`（sha16=`eb8080d9a8cab5bd`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:289`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片右下「92% 匹配度」圆环（环体绿、内圈透出卡片底部深色渐变、数字与「匹配度」为白字）
- 现象：**上一轮修得不对（同一条轴仍未对齐）**。R8-L01-D07 把环体由 `--c-gradient-romance` 换成 `--c-gradient-brand`（第273行）在帧上确已生效——实测环 stroke 为 #44CFA0/#3CD0A0 绿族；但同批连带把内圈底由黑色 scrim 改成 `--c-overlay-bg-solid`(0.9 白罩)、把 value/label 由白字改成 `--c-brand-800` 深绿（第301/309行），实测内圈 #ECFAF5、数字 #1E7158，整枚徽章在深色照片上读成「绿环＋白心＋绿字」的浅色糖豆；理想图同位置内圈透出的是卡片底部渐变的深色（实测 #221D12/#241B10）配白字，颜色族与理想图仍相反（判级：80% 数值清晰可读（实测 5.96:1），用户拿得到匹配度，偏的是配色族反向 ⇒ P2）
- 建议改法：内圈底改回 transparent 让第177-190行 `.match-card__overlay` 的深渐变透出，value/label 恢复 `--c-text-inverse` 白字（白字压 #221D12 约 15:1，无需白罩即过 4.5:1，第285-288行担心的 2.71:1 是「白字压绿心」那一档，透出深底后不存在）
- 修复类别：CSS/token

### R9-L01-D08　P2 / 尺寸比例　批次 R9-B17
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__discover__index__bottom.png`（sha16=`1ef8682937bd0314`）
- 源码证据：`apps/client/src/pages/discover/index.vue:595`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 主卡整块（规范§3.3 记「全屏卡片」）
- 现象：`.match-card-area` 的 `height:calc(100vh - …)` 实测卡带 x=16..362（346px=687rpx）× y=158..511（353px=700rpx）⇒ 高宽比 1.03、占视口高 43.4%；理想图同卡 x=36..827（791）× y=355..1425（1070）⇒ 高宽比 1.35、占视口高 58.5%。等宽下理想卡应 ≈930rpx 高，本帧短 230rpx（25%）。第177行 `.match-card__overlay` 的 62% 渐变蒙层随之被压薄，第312行 `.match-card__info`（其第317行 `padding:40rpx 32rpx 170rpx`）只剩 47rpx 余量，签名「岭南学院，爱在西门买糖水，晚自习后想找人跑步。」被迫折出孤字第二行「步。」（实测第二行仅 2 字宽）
- 建议改法：重算本行 calc 里让给页头(170rpx)/配额行(64rpx)/越出余量(48rpx)的三档，使卡高回到视口实高 ≈58%（≈930rpx），与理想图 1.35 比例一致
- 修复类别：单页

### R9-L01-D09　P2 / 层级遮挡　批次 R9-B17
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__discover__index__top.png`（sha16=`eb8080d9a8cab5bd`）
- 源码证据：`apps/client/src/pages/discover/index.vue:643`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片下缘——理想图卡底边界完整无叠压，三键行在卡下留空
- 现象：游客提示胶囊 `.discover-login-hint`（`position:fixed`）实测 x=110..267、y=499..530（高 32px=63rpx），而卡片下缘实测在 y=511（x=60 列 #151818→#555C5B→#E8ECEB 硬边）⇒ 本条上沿有 12px≈24rpx 压在卡片内，盖掉卡底居中一段照片与下缘圆角。第639-642行注释显示 R2b-L01-D01 为躲三键行把 `bottom` 抬到 `tab-bar-h+128rpx+210rpx`，抬完后落点正好跨在卡边上，遮挡从「压住打招呼钮」变成「咬住卡片下缘」，未收口
- 建议改法：把本行 `bottom` 再抬到卡片下缘之上（按实测卡高反推，或改由 `.match-card-area` 之下以文档流排布而非 fixed），使胶囊与卡底之间留出 ≥16rpx 净空
- 修复类别：单页

## pages/home/index（2 条）

### R9-L01-D10　P2 / 文案　批次 R9-B16
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__home__index__top.png`（sha16=`5ab3a4ae0b24e0a8`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:666`
- 理想图依据：素材/理想效果图/首页.png「今日恋爱进度」卡四步骤标题行（自左至右：完善资料 / 认识新的人 / 回复悄悄话 / 参与兴趣互动）
- 现象：帧上四步骤标题实测读作「完善资料 / 认识新人 / 回复悄悄话 / 兴趣互动」，第2、4档各比理想图少 1 字（zh-CN.ts:666 `"loveStepDiscover":"认识新人"`、:668 `"loveStepInterest":"兴趣互动"`）。组件自身口径也与之打架：TodayLoveProgress.vue:23 注释写「用户看到『完善资料/认识新人/回复悄悄话/参与兴趣互动』」（同句内第2档短、第4档长），:189 注释仍按「参与兴趣互动」5 字标题留的换行规则，而实值只有 4 字 ⇒ 那笔换行修复成了无消费者的空档（判级：短版仍可理解步骤语义、不阻断点击 ⇒ P2）
- 建议改法：两枚键值补回理想图档「认识新的人」「参与兴趣互动」，并同步 TodayLoveProgress.vue:23 注释的用词
- 修复类别：单页

### R9-L01-D11　P2 / 尺寸比例　批次 R9-B08
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__home__index__bottom.png`（sha16=`beda2ccc2319f138`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:403`
- 理想图依据：素材/理想效果图/首页.png 底部「社区动态」区——三张帖子卡并排铺满内容宽（实测单卡占屏宽 ≈29.6%）
- 现象：`.post-card{width:320rpx}`，实测一屏只排下 2 张：白卡 x=17..174 与 x=186..343，各 158px=314rpx（与 320rpx 对上），单卡占屏宽 41.8%，理想图同档 29.6%。内容区 686rpx 下理想档宽应 ≈218rpx，本帧宽出 47%；卡变宽后正文与缩略图区反而更空——正文两行即截（「…收获满满，晚上…」「…《你的名字》，映后有…」），下方只放得下 1 枚 88rpx 级缩略图，理想图每卡 3 枚。第185行容器是 `scroll-view scroll-x`，故这是单卡宽度取档错档、不是列数写死
- 建议改法：`.post-card` 宽度收到 ≈218rpx（或 `width:calc((100% - 64rpx)/3)`）并把 `.community-feed__list` gap 保持 16rpx，使首屏同理想图露出 3 张
- 修复类别：单页

## pages/login/index（2 条）

### R9-L01-D01　P2 / 尺寸比例　批次 R9-B18
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__login__index__top.png`（sha16=`923ef07e744d621a`）
- 源码证据：`apps/client/src/pages/login/index.vue:868`
- 理想图依据：素材/理想效果图/登录页面.png 中部纯插画区（品牌区之下、slogan「遇见同频的人」之上），理想图为 1024 方图（另见 素材/理想效果图/登录页.png 全幅：前景草地占下方约 1/4、两人坐姿含小腿）
- 现象：`.login-page__hero` 与 `.hero-image`（第899行）定高写死 `520rpx`，实测插画带 y=142..407＝265px≈526rpx（含第890行 100rpx 底部渐隐带），带宽满幅 378px=750rpx ⇒ 高宽比 0.70；理想图同区 y=248..784＝536px 对机宽 642px ⇒ 0.84，等比换算到 750rpx 带宽应为 ≈626rpx 高，本帧短 106rpx（17%）。模板第593行 `mode="aspectFill"` 在正方形原图上按这条矮带居中裁切，把前景草地与两人坐姿下半身整段裁掉：帧上插画底缘 y=396..404 采样已是浅土色步道 #C2CCC8/#D5C1AE，理想图 y=700 处那片 #669972 前景草地在本帧零像素，人物在腰部被平切
- 建议改法：把 hero 定高按理想图比例抬到 ≈626rpx（同步第899行 image 高），或改 `mode="aspectFit"`＋等高容器，让前景草地与坐姿小腿入画
- 修复类别：CSS/token

### R9-L01-D02　P2 / 可达性　批次 R9-B18
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__login__index__bottom.png`（sha16=`6cfd4ef1adc1b200`）
- 源码证据：`apps/client/src/pages/login/index.vue:1272`
- 理想图依据：素材/理想效果图/登录页面.png 按钮列下方区域（本行是 MP-R7-GUEST-LANDING-REGENTRY-001 新增的默认态唯一注册出口，见本文件第697-701行注释）
- 现象：注册入口「没有账号？去注册」挂 `.btn-text{height:80rpx}`，实测该行盒 y=670..710＝40px=80rpx（文字墨迹 y=684..696、中心 690），比同文件第1299行 `.terms-wrap` 自述并已落地的「88rpx 最小可点件口径」少 8rpx；同帧紧邻的协议行实测 y=720..764＝44px=88rpx，两行相邻高差正好差出这 8rpx。内联注册模式已按第19行注释删除，本行是默认态唯一注册出口（判级：40px 落点仍可命中、用户仍拿得到注册页，写不出「拿不到什么」⇒ 按口径降 P2 不升 P1）
- 建议改法：`.btn-text` 由 `height:80rpx` 抬到 `min-height:88rpx`（或单给 `.login-register-entry` 补 88rpx），与本页协议行同档
- 修复类别：单页

## pages/messages/index（8 条）

### R9-L02-D08　P1 / 素材缺失　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__top.png`（sha16=`b5dcf93967863d8b`）
- 源码证据：`apps/client/src/pages/messages/index.vue:495`
- 理想图依据：素材/理想效果图/消息.png 左栏「寻觅助手」卡左侧一枚绿色嫩芽吉祥物头像（浅绿圆角底）
- 现象：助手卡左端 88rpx 头像槽整枚空白——帧实测卡内 x≈35-100、y≈245-300 为纯白，「寻觅助手」标题从 x≈110 起排，卡左半成一空槽；素材文件 src/static/assets/images/mascot/mascot_smile.png 存在（129 个 mascot 素材内），同页 :466/:478 的 <image> 均正常出图 ⇒ 该组件的 /static 绝对路径分支在本构建下没画出来。用户拿不到理想图要求的助手身份件。
- 建议改法：核对 XunmiMascot.vue:117 的 imgSrc 在 mp-weixin 下的解析，必要时本页改直挂 <image>（同 :466 口径）并补浅绿底容器。
- 修复类别：单页

### R9-L02-D09　P2 / 颜色token　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__top.png`（sha16=`b5dcf93967863d8b`）
- 源码证据：`apps/client/src/pages/messages/index.vue:978`
- 理想图依据：素材/理想效果图/消息.png 顶部两枚摘要卡：卡底浅绿填充、两枚图标底板同为浅绿（心形为绿色）
- 现象：摘要卡①图标底板为粉 rgba(255,107,129,.12)（帧实测 x≈32-62 一枚粉底），与卡②的 rgba(54,201,154,.12) 不同族；两枚卡底为纯白 #FFFFFF（:962）+ 1rpx 描边，理想图为浅绿填充无描边 ⇒ 上一轮新增的这组卡片在颜色 token 轴上未对齐基准。
- 建议改法：--pink 变体改与 --green 同档浅绿，.quick-card 卡底改 var(--c-bg-brand)。
- 修复类别：CSS/token

### R9-L02-D10　P2 / 位置　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__top.png`（sha16=`b5dcf93967863d8b`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1005`
- 理想图依据：素材/理想效果图/消息.png 两枚摘要卡右下「去看看 / 去回复」小胶囊均与卡缘留出一档内缩
- 现象：同一 `.quick-card__btn` 两枚实例内缩不一致：左卡「去看看」右缘 x≈172、距卡缘 x≈180 有 8px(≈16rpx) 内缩；右卡「去回复」右缘 x≈358 与卡缘 x≈358 重合，未按 :960 的 padding 28rpx 24rpx 内缩，末字「复」右半被卡缘裁掉。
- 建议改法：给 .quick-card__btn 补 margin-right:24rpx 或把两枚按钮包进与卡内边距同宽的容器，统一内缩一档。
- 修复类别：单页

### R9-L02-D11　P2 / 素材缺失　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__top.png`（sha16=`b5dcf93967863d8b`）
- 源码证据：`apps/client/src/pages/messages/index.vue:518`
- 理想图依据：素材/理想效果图/消息.png 活动提示行首为一枚绿色嫩芽 🌱
- 现象：「今天附近有 3 场活动适合你参加」行首图标未出图，帧上是一枚约 10×8px 的灰色下三角残形（IMAGE_PATHS.ICONS_EMOJI.LEAF 路径在本构建无对应素材），非绿色嫩芽；同页 :562 已有可用的 ICONS_V2.SPROUT。
- 建议改法：该 <image> 换 ICONS_V2.SPROUT，或补 LEAF 素材并加 @error 兜底。
- 修复类别：单页

### R9-L02-D12　P2 / 颜色token　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__top.png`（sha16=`b5dcf93967863d8b`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1109`
- 理想图依据：素材/理想效果图/消息.png 助手卡下半的活动提示是一枚浅绿填充圆角子卡（内含两行文案 + 右下红色计数角标）
- 现象：`.assistant-card__activity` 只给了 1rpx 上分隔线、无填充、无圆角、无内边距，帧上两行活动文案直接坐在白卡底上，与理想图的「推送子卡」层级差一整档（右下红色计数角标亦无，但理想图该角标即活动数，已由 :519 行内文案承担，不另记）。
- 建议改法：该块加 background: var(--c-bg-brand) + border-radius:20rpx + padding:20rpx，去掉上边框。
- 修复类别：CSS/token

### R9-L02-D13　P2 / 层级遮挡　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__bottom.png`（sha16=`80f9072269819af8`）
- 源码证据：`apps/client/src/pages/messages/index.vue:833`
- 理想图依据：素材/理想效果图/消息.png 左栏各分区标题始终整行可读，不与状态栏/胶囊带重叠
- 现象：bottom 帧里「正在升温」分区标题升入 y≈33-50 的状态栏/胶囊带（遮罩覆盖区 0→statusBar+28≈75px），字形被冲淡、上缘裁切。:828 注释自述修法为「页头升到 z-index:10 后顺势充当本页固定导航底板，滚上来的正文永远停在胶囊带下方」，但 .header 是 position:relative（:833）随页面一起滚走，无法充当底板，遮罩（:809-814，z-index:9）也未把该标题压成实色 ⇒ 上一轮 R8-L02-D11 只解决了页头自身被压纱，正文升入状态带这一半未达成。
- 建议改法：页头改 position:sticky;top:0（或 fixed + 占位），使实底色真正常驻状态带；遮罩保留在页头之下。
- 修复类别：单页

### R9-L02-D14　P2 / 素材缺失　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__bottom.png`（sha16=`80f9072269819af8`）
- 源码证据：`apps/client/src/pages/messages/index.vue:656`
- 理想图依据：无该模块基准（活动推荐按 :6 页面顺序与组件规范比）：本页其余图标均为 PNG/SVG 素材件（:466/:518/:562/:660）
- 现象：活动推荐三张卡图标走「非 URL ⇒ <text> 直接上屏」分支，帧上是三枚系统 emoji（🏀 / 🚴 / ❤️），约 44px 满坐浅绿方块，与同页线性素材图标两种口径；第三枚 ❤️ 与页头摘要卡①「有人喜欢你」同义重复，读者会以为是两个不同入口。
- 建议改法：act.icon 非 URL 时按语义映射到既有 PNG 图标集（活动/球类/心形），emoji 不再直接渲染。
- 修复类别：单页

### R9-L02-D15　P2 / 素材缺失　批次 R9-B19
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__messages__index__bottom.png`（sha16=`80f9072269819af8`）
- 源码证据：`apps/client/src/pages/messages/index.vue:557`
- 理想图依据：素材/理想效果图/消息.png「正在升温」4 枚 + 「最近聊天」4 行均为互不相同的人物头像
- 现象：帧上「小新生」「小满」两枚升温头像与「最近聊天」小满头像是同一张夜景人群照（三处像素一致），两个不同 userId 共用一张脸 ⇒ 用户无法按头像区分人，与理想图「四位不同好友」的辨识口径不符。
- 建议改法：种子/mock 按 userId 分散 avatarUrl，失败兜底才走 DEFAULT_AVATAR（:557 分支本身正确）。
- 修复类别：单页

## pages/nearby/index（7 条）

### R9-L02-D01　P1 / 层级遮挡　批次 R9-B20
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__nearby__index__top.png`（sha16=`1f9c99bc5ab4f7c2`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:993`
- 理想图依据：素材/理想效果图/附近的首页.png 右上角「发动态」为独立、完整、可读的绿色胶囊
- 现象：页头「发动态」药丸与系统胶囊同带叠压——帧实测药丸 y≈43-63、x≈305-375，胶囊 y≈29-57、x≈302-374，横向区间几乎完全重合，药丸上沿约 14px(≈28rpx) 被胶囊压住、白字顶部笔画被裁；:997-1002 注释记账「页头实测落在 y≈70-95，已在胶囊下方，胶囊避让由 padding-top 承担」被本帧读数推翻 ⇒ 上一轮删横向缓冲后纵向避让不足，同一条轴修得不对。用户拿不到可读、可点稳的发布入口。
- 建议改法：:537 的 paddingTop 由 statusBar+12 抬到 statusBar+胶囊高+12（或给 .nearby-home__header 加 margin-top≈40rpx），使页头行顶缘落在胶囊底缘之下。
- 修复类别：单页

### R9-L02-D02　P1 / 可达性　批次 R9-B20
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__nearby__index__top.png`（sha16=`1f9c99bc5ab4f7c2`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1067`
- 理想图依据：素材/理想效果图/附近的首页.png「发动态」绿底白字两字可读
- 现象：白字（:1073 --c-text-inverse）压 --c-brand #36C99A，相对亮度 0.4542 对白色 1.0 ⇒ 实测对比 2.08:1，24rpx/700 不享 WCAG 大字号豁免，远低于 4.5:1；同仓 LockScreen.vue:705-712 已按同一算法把「白字压 #45CFA0=1.97:1」判为可达性 P1 并升档 --c-brand-800。用户在本页唯一发布入口上读不清按钮文字。
- 建议改法：钮面改 var(--c-brand-800,#156B51)（白字 6.45:1），与 LockScreen 主 CTA 同档。
- 修复类别：CSS/token

### R9-L02-D03　P2 / 尺寸比例　批次 R9-B20
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__nearby__index__top.png`（sha16=`1f9c99bc5ab4f7c2`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1065`
- 理想图依据：素材/理想效果图/附近的首页.png 右上「发动态」胶囊高度与放大镜按钮同排且明显厚于一行的 1/3
- 现象：热区 = 24rpx 文字 + 上下 12rpx padding ≈ 53rpx，帧实测药丸高 20px≈40rpx，低于本页 :1044 注释自述的「全站 88rpx 最小可点件」口径；:1045 更声称「发动态胶囊…均为 88rpx」，与 :1065 实际值互相矛盾（该注释引用的 :1257 实为 .circle-scroll{width:100%}，指针也已失效）。
- 建议改法：.nearby-home__publish 加 min-height:88rpx + align-items:center，或按 :1047 search-btn 范式用 padding 撑热区。
- 修复类别：CSS/token

### R9-L02-D04　P2 / 颜色token　批次 R9-B20
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__nearby__index__top.png`（sha16=`1f9c99bc5ab4f7c2`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1665`
- 理想图依据：素材/理想效果图/附近的首页.png 五宫格区——五枚底板同为一张中性浅灰绿底，色彩只出现在图标本身（仅第 5 枚偏淡蓝紫）
- 现象：五宫格底板被刷成五种色系（粉 #FFF0F3 / 浅绿 #E8F5E4 / 浅蓝 #EEF3FF / 奶油 #FFF5E6 / 薰衣草 #F0EEFF），帧上实测五块彩色底板并排，理想图是一整条中性底板带；色彩层级被底板抢掉，读不出「同一组入口」。
- 建议改法：五枚底板统一 var(--c-bg-surface)，保留 :1665-1669 的色系只作用于图标。
- 修复类别：CSS/token

### R9-L02-D05　P2 / 素材缺失　批次 R9-B03
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__nearby__index__top.png`（sha16=`1f9c99bc5ab4f7c2`）
- 源码证据：`apps/client/src/components/common/GlobalPublishFab.vue:86`
- 理想图依据：素材/理想效果图/附近的首页.png 右下角（tabBar 上方）一枚绿色圆形 ＋ 悬浮发帖按钮
- 现象：本组件是全站既有悬浮发帖件（profile/index.vue:1824 已挂载并在帧上出图），附近页两帧均未挂载（全文件 grep 无 GlobalPublishFab）⇒ 理想图要求的右下 FAB 整枚缺席，本页发布只剩 D01/D02 那颗被遮挡的页头胶囊，无替代出口。
- 建议改法：与个人页同口径在 nearby 根节点挂 GlobalPublishFab。
- 修复类别：单页

### R9-L02-D06　P2 / 可达性　批次 R9-B20
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__nearby__index__bottom.png`（sha16=`95cdb0d85e9c77da`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1577`
- 理想图依据：素材/理想效果图/附近的首页.png 附近动态区为帖子卡（含关注按钮），按钮件均为完整胶囊
- 现象：附近动态登录引导卡内「去登录」绿胶囊热区 = 24rpx 文字 + 12rpx 上下 padding ≈ 53rpx（帧实测 y≈648-672，24px≈48rpx），同样低于 :1044 自述的 88rpx 口径；白字压 #36C99A（:1579）= 2.08:1，与 D02 同一条对比缺陷的第二处实例。
- 建议改法：min-height:88rpx 且钮面升 --c-brand-800，与 D02/D03 一并归一。
- 修复类别：CSS/token

### R9-L02-D07　P3 / 颜色token　批次 R9-B20
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__nearby__index__bottom.png`（sha16=`95cdb0d85e9c77da`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1464`
- 理想图依据：无基准条目（活动分区为逐页说明既有模块），依据=组件规范：文字色须有消费者
- 现象：`.activity-entry` 在白色卡底（:1465 --c-bg-container #FFFFFF）上声明 `color: var(--c-text-inverse,#FFFFFF)`，而该卡全部子节点各自带色（__title :1494 / __desc :1500 / __arrow :1513），白字声明零消费者，属同页 :1056 已清理过的「对节点无效的 color 遗留」同类。
- 建议改法：删除 :1464 该行。
- 修复类别：CSS/token

## pages/profile/index（5 条）

### R9-L02-D16　P1 / 素材缺失　批次 R9-B12
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__profile__index__top.png`（sha16=`aa4bf3f96461e09f`）
- 源码证据：`apps/client/src/components/profile/mine/MyStory.vue:64`
- 理想图依据：素材/理想效果图/未登录个人主页.png 与 已经填完资料的个人主页.png 的「我的故事」区均为 3 枚分类卡（生活日常/旅行足迹/我的心愿，含 0 计数）+ 1 枚虚线添加卡
- 现象：本帧「我的故事」只剩一枚虚线「添加故事」卡（实测 x≈20-90、y≈530-620，宽 70px≈139rpx），三枚分类位整块缺席；组件 :191 注释自述理想口径即「3 卡 + 添加故事虚线卡」，但 :64 是纯数据 v-for，stories 为空即零卡。用户看不到理想图明确给出的故事分类结构与计数口径。
- 建议改法：stories.length===0 时渲染三枚固定分类占位卡（含 0 计数），添加卡常驻。
- 修复类别：单页

### R9-L02-D17　P2 / 位置　批次 R9-B21
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__profile__index__top.png`（sha16=`aa4bf3f96461e09f`）
- 源码证据：`apps/client/src/pages/profile/index.vue:2594`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 右上角两枚功能图标贴页面右缘同栏
- 现象：页头右上「扫码 + 设置」停在 x≈218-278，右缘距内容右缘 x≈362 空出 84px≈166rpx 死档；来源是 .profile-top-bar 的 `padding-right: calc(var(--capsule-right,7px) + 104px)`，而本帧图标行实测 y≈62-80 已在胶囊带（y≈29-57）下方，横向让位属重复避让。同域两页上一轮已按完全相同的理由删掉该缓冲（nearby :997、messages :842），本页未同步 ⇒ 三页取档不一。
- 建议改法：删 :2594，回到 32rpx 页边距口径，纵向避让由 :2580 的 top 承担。
- 修复类别：单页

### R9-L02-D18　P2 / 文案　批次 R9-B21
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__profile__index__top.png`（sha16=`aa4bf3f96461e09f`）
- 源码证据：`apps/client/src/pages/profile/index.vue:1980`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 简介位为「热爱生活，喜欢探索世界 ✨」这类可读中文签名
- 现象：简介位原样渲染测试夹具串「修复复验简介：第二轮 2026-10-06T23:06:22 写入」（帧实测 y≈155-200 两行），含裸 ISO-8601 的 T 分隔与「写入」字样 ⇒ 用户读到一段运维日志式文本当作个人签名。
- 建议改法：种子 bio 换可读中文；渲染前对 bio 内的 ISO 时间做 formatDateTime 归一。
- 修复类别：单页

### R9-L02-D19　P1 / 位置　批次 R9-B21
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__profile__index__bottom.png`（sha16=`0fd7ee7cb53721a6`）
- 源码证据：`apps/client/src/pages/profile/index.vue:1683`
- 理想图依据：无该分区基准图（个人页两张理想图无语音介绍块），依据=组件规范：分区标题整词不成半行、提示语不得被裁切
- 现象：语音介绍分区头把标题、角标、提示语三件塞进同一不换行 flex 行（.section-header__left :3434 无 flex-wrap、标题无 flex-shrink:0）——帧实测标题 4 字断成「语音介 / 绍」两行（x≈40-95、y≈100-135），角标「仅语音 · 无视频」压在提示语左半上，提示语右半出卡缘被裁。用户拿不到「最长 60 秒」这条录制约束，且分区标题以断词形态呈现。
- 建议改法：标题 flex-shrink:0、行加 flex-wrap:wrap，提示语换第二行整行显示（或移到 CTA 下方）。
- 修复类别：单页

### R9-L02-D20　P3 / 文案　批次 R9-B16
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__profile__index__bottom.png`（sha16=`0fd7ee7cb53721a6`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:1689`
- 理想图依据：无基准，依据=同页取档：分区标题「语音介绍」(:1684 走 profile.voiceStatus)
- 现象：虚线录制位的主 CTA 文案为「录制语音状态」（帧实测 y≈255-270），动宾搭配不通（录的是语音，不是状态），与同一张卡标题「语音介绍」(:1672) 自相矛盾；:1740 recordVoiceAria 与 :1763 FAQ 复用同一串。
- 建议改法：改「录制语音介绍」，同步 aria 与 FAQ 三处。
- 修复类别：单页

## pages/register/index（2 条）

### R9-L01-D03　P1 / 可达性　批次 R9-B22
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__register__index__top.png`（sha16=`87480776e88e4d3e`）
- 源码证据：`apps/client/src/pages/register/index.vue:1090`
- 理想图依据：无基准，依据=规范文档§1.4 间距/控件档 + 本仓已落地口径（login/index.vue:1297-1299「88rpx 最小可点件」、register/index.vue:1237-1250 `.agree__hit` 88rpx 透明热区层）
- 现象：`.sms-btn` 定高 `64rpx`，实测「获取验证码」绿胶囊 x=238..324、y=370..400 ⇒ 87×31px＝173×62rpx，比 88rpx 口径少 26rpx（30% 不足）。该钮是取短信验证码的唯一触发点（本文件第281行为发码前置互斥 `if (smsSending ‖ smsCountdown>0 ‖ submitting) return`，页面另无第二条发码路径），用户点不中就拿不到验证码、注册整条流程走不完 ⇒ 命中口径「必点控件热区 <88rpx 且没有替代出口」
- 建议改法：`.sms-btn` 高度抬到 88rpx；若要保持 64rpx 视觉档，照本文件第1242-1250行 `.agree__hit` 的做法加 `padding:28rpx`＋等量负 margin 的透明热区层，视觉尺寸不动
- 修复类别：CSS/token

### R9-L01-D04　P2 / 颜色token　批次 R9-B22
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__register__index__bottom.png`（sha16=`5c22b1524a526cea`）
- 源码证据：`apps/client/src/pages/register/index.vue:1059`
- 理想图依据：无基准，依据=规范文档§1.2 配色（次级文字需可读）+ §1.3 字体层级（辅助文字档）
- 现象：出生日期行右侧提示「需满 18 周岁」（模板第751行）`.field__hint` 字色取 `--c-text-placeholder`(#9AA39F)，实测该文字区最暗像素 #A8B1AD 压在输入框底 #F3FAF6 上＝2.07:1（令牌理论值 2.43:1），连 3:1 下限都不到，帧上这五个字几乎与浅绿框底融成一片；18 周岁门槛是本页唯一的合规提示，压到不可辨等于没提示（判级：与 R8-L01-D04 记的同帧「注 册」禁用白字（第1191行）是两个不同控件实体、非同一条；提示读不清不阻断填写、18 岁门槛仍在提交校验里 ⇒ P2）
- 建议改法：`.field__hint` 字色由 `--c-text-placeholder` 换 `--c-text-tertiary`(#6B7571，对 #F3FAF6 实测 4.0:1)
- 修复类别：CSS/token

## pages/register/success（2 条）

### R9-L01-D05　P2 / 颜色token　批次 R9-B23
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__register__success__top.png`（sha16=`c2d830050ea522d7`）
- 源码证据：`apps/client/src/pages/register/success.vue:156`
- 理想图依据：无基准，依据=规范文档§1.2 配色（次级文字对比下限）+ `src/components/common/` StatusState/Tag 口径（状态标签须自成一眼可辨的一档）
- 现象：清单卡三行右端状态标签「完成 / 已解锁 / 建议」（模板第65行）`.reg-success__row-tag` 取 `--c-text-placeholder`(#9aa39f)，实测「完成」区最暗像素 #9CA4A1 压在白卡 #FFFFFF 上＝2.55:1，低于 3:1；24rpx 字号下帧上三枚标签与白卡几乎同明度，行首 ✓ 绿图标与行尾标签之间失去「状态」这一档层次（判级：标签属次级冗余，行文本已含状态语义，未达 P1「正文级文字 <4.5:1」条款 ⇒ P2）
- 建议改法：标签字色换 `--c-text-tertiary`(#6B7571，白底 4.6:1)，或与行首 ✓ 同族走 `--c-brand-700`(#1F8D6A)
- 修复类别：CSS/token

### R9-L01-D06　P2 / 可达性　批次 R9-B23
- 帧：`tmp/qa/frames/R9/real-f0677920/pages__register__success__bottom.png`（sha16=`c2d830050ea522d7`）
- 源码证据：`apps/client/src/pages/register/success.vue:184`
- 理想图依据：无基准，依据=规范文档§1.4 控件档 + 组件规范 BottomActionBar/Button（次级出口需自成可点件）
- 现象：次级出口「稍后再说，先随便逛逛」是裸 `<text @tap>`（模板第76行），`.reg-success__alt` 只有 `margin-top:32rpx;font-size:26rpx`，无 min-height、无 padding；实测主按钮绿带 y=604..652＝48px=96rpx（与第165行 `height:96rpx` 对上 ✓）、其文字墨迹 y=623..634，本行墨迹 y=670..681＝12px ⇒ 行盒仅 ≈18px=36rpx 可点，为 88rpx 口径的 41%。本页无 tabBar、无返回箭头（第83-88行容器仅 min-height:100vh），「不填资料直接逛」这条路径只有这一个 36rpx 落点（判级：第69-70行注释已把主按钮 27rpx 点击死区修掉，本行是同口径漏项；36rpx 仍可命中、可重试，用户不致拿不到首页 ⇒ P2 不升 P1）
- 建议改法：`.reg-success__alt` 补 `min-height:88rpx;display:flex;align-items:center;justify-content:center`，或照 register/index.vue:1242-1250 加透明热区层
- 修复类别：单页

## subpackages/campus/campus/certification（2 条）

### R9-L05-D11　P2 / 可达性　批次 R9-B24
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`f292a7c1f9ae4e47`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:515`
- 理想图依据：无基准，依据=规范 §1.2 主文本档 + 同域基准 校园圈.png 页头深字；实测帧 x=200,y=40 页头底 #6ADDB2，标题字身 near-#FFFFFF
- 现象：页头标题「学生认证」白字压 --c-brand-300 段，实测 1.67:1，页面主标题不可读
- 建议改法：与 D01/D07/D08 同批收口 campus 子包页头文字档
- 修复类别：CSS/token

### R9-L05-D12　P2 / 可达性　批次 R9-B24
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`b311668e91808a1a`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:496`
- 理想图依据：无基准，依据=规范 §1.2（白纱底只用于覆盖层前景，状态/导航胶囊须给可读底或深字）；实测帧胶囊合成底 #8DE2C5（x=22..30,y=62..78 取色），字身 --c-text-inverse
- 现象：页头「返回」胶囊在 rgba(255,255,255,0.25) 白纱上压 95% 白字，实测底 #8DE2C5 → 1.45:1，唯一的页内退出控件标签不可辨（同族缺陷在 topic-detail.vue:412 同写法，帧上实测底 #8BE1C4）
- 建议改法：白纱底改实色 --c-bg-container + --c-text-primary 字，或保留白纱但把字改 --c-text-primary
- 修复类别：CSS/token

## subpackages/campus/campus/hub（2 条）

### R9-L04-D10　P2 / 颜色token　批次 R9-B25
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`947914d6efd127b3`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:572`
- 理想图依据：校园圈.png（认证引导横幅为整块均匀浅绿底）+ 规范 §3.12「横幅 --c-brand-bg-tint 绿浅底」
- 现象：`.campus-guide` 背景 `linear-gradient(135deg, var(--c-brand-50,#EAF8F2) 0%, #FFFFFF 100%)`，横幅由浅绿斜向渐变到纯白，帧上右半（去认证按钮一带）已近白；理想图与 §3.12 均要求整块均匀绿浅底。且 #FFFFFF 为裸色、#EAF8F2 与真 token --c-brand-50 #E8FAF3 不同值。
- 建议改法：改纯色 `background: var(--c-brand-bg-tint)`（或 --c-brand-50），去掉到 #FFFFFF 的渐变与私色 fallback。
- 修复类别：CSS/token

### R9-L04-D11　P2 / 位置　批次 R9-B25
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`902a03e6cdf474d3`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:750`
- 理想图依据：校园圈.png（每张学校卡的「未认证」状态徽标与校名同处一行、行内右靠）
- 现象：`.campus-school-card__name-row` 设 `flex-wrap:wrap`，7 字校名（中国人民大学圈 / 上海交通大学圈）放不下时状态徽标被挤到第二行，帧上这两张卡校名独占首行、「未认证」pill 单独掉到下一行，卡头变两行高，与其余 5 字卡（清华/复旦/同济，徽标仍行内）以及理想图（全部行内）不一致。上一轮为治校名截断（R6-L05-D25/D30）改整行换行，代价是徽标脱离行内，未对齐理想图那条轴。
- 建议改法：收紧校名/徽标可用宽（缩校名字号档或减 CTA/封面占比）使 7 字名+徽标能同排；确需换行时让徽标留在名末同行而非整段下移。
- 修复类别：单页

## subpackages/campus/campus/index（5 条）

### R9-L05-D01　P2 / 可达性　批次 R9-B26
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`480a7b8a9cd0b8a2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:488`
- 理想图依据：无基准，依据=同域基准 素材/理想效果图/校园圈.png 页头（深黑标题压浅底）+ 规范 §1.2 主文本档；实测帧 x=45,y=70 页头底 #76DDB9，「北京大学」字身取到 #FFFFFF
- 现象：页头主标题「北京大学」用 --c-text-inverse（95% 白）压在渐变 60% 档 --c-brand-300 段上，实测底 #76DDB9 → 白字对比 1.64:1，页面上最重要的「这是哪个学校」几乎读不出
- 建议改法：页头文字改走 --c-text-primary（或把渐变 60% 档换成 brand-600/700 深档 + 白字），使 ≥4.5:1
- 修复类别：CSS/token

### R9-L05-D02　P2 / 可达性　批次 R9-B26
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`480a7b8a9cd0b8a2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:510`
- 理想图依据：无基准，依据=规范 §1.2 状态胶囊口径 + 同域基准 校园圈.png「未认证」胶囊（浅紫底+紫字，非白纱底+白字）；实测帧 x=150 胶囊带 y=57..80 合成底 #8AE5C2，字身峰值 #E4F8F1
- 现象：「未认证」状态胶囊在 rgba(255,255,255,0.2) 白纱底上再压 95% 白字，实测合成底 #8AE5C2 → 1.49:1，认证状态在帧上不可辨
- 建议改法：未认证态改浅紫底 + --c-purple 深字（与 D03 同一处改法），文字色不再走 --c-text-inverse
- 修复类别：CSS/token

### R9-L05-D03　P2 / 颜色token　批次 R9-B26
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`95edecb3b0185d28`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:510`
- 理想图依据：无基准，依据=规范 §1.2「兴趣紫 --c-purple #A29BFE · 用途：未认证 · 兴趣分类」+ 同域基准 校园圈.png 中「未认证」胶囊实测浅紫底紫字；帧上该胶囊为白纱底白字
- 现象：未认证状态胶囊取 --c-overlay-bg-light（白纱 0.2），而规范把「未认证」明确分配给兴趣紫 --c-purple；同域基准页 校园圈.png 的「未认证」即浅紫底紫字，本帧读成「页头上一个白亮块」，状态色语义丢失
- 建议改法：.cert-badge--unverified 底改 --c-purple 的浅底档、文字改 --c-purple（已认证/审核中/驳回同族一并按 §1.2 对号）
- 修复类别：CSS/token

### R9-L05-D04　P2 / 字号　批次 R9-B26
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`95edecb3b0185d28`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:943`
- 理想图依据：无基准，依据=规范 §1.3「标题 --fs-3xl/4xl = 18/20px（36/40rpx）· 700 · 用途：区块标题」；帧上「热门兴趣圈」为 30rpx 字面量，比同页卡内话题标题（--fs-2xl 32rpx，index.vue:762）还小
- 现象：区块标题「热门兴趣圈」30rpx 字面量，既不在 §1.3 字阶上，又低于其下卡片标题 32rpx，帧上区块层级倒挂（区块名比条目名小）
- 建议改法：改 var(--fs-3xl, 36rpx)/700，与同域其它区块标题取同一档
- 修复类别：CSS/token

### R9-L05-D05　P3 / 圆角　批次 R9-B26
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`95edecb3b0185d28`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:968`
- 理想图依据：无基准，依据=规范 §1.4 圆角档 4/8/12/20/24/32/9999rpx（design-variables.scss:198-204 同值）；帧上 8 片推荐瓷片圆角按 code 落地为 16rpx（8px 小圆角），与同页卡片 var(--r-xl) 24rpx 不同族
- 现象：推荐瓷片 border-radius 写死 16rpx，圆角档位里没有这一档（12 与 20 之间），同页同族还有 .public-browse-banner 的 18rpx（:913）也是表外值
- 建议改法：瓷片改 var(--r-md, 12rpx) 或 var(--r-lg, 20rpx)，18rpx 同批归档
- 修复类别：CSS/token

## subpackages/campus/campus/post-topic（2 条）

### R9-L05-D06　P1 / 可达性　批次 R9-B27
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`47f8a8372531f852`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:733`
- 理想图依据：无基准，依据=规范 §1.2 文字档（警告色只作中强度提示，正文须落 --c-text-primary/secondary）；实测帧门槛条底 #EFEEDA（= --c-warning-bg-tint 0.1 压在 #EEF7F2 上的合成值）、字身 #F59E0B → 1.83:1
- 现象：页顶门槛说明整句「校园话题仅限本校已认证同学发布，请先完成校园认证」用 24rpx 正文级 --c-warning 压 --c-warning-bg-tint 合成底，实测 1.83:1，用户读不到本页唯一的解释性正文（不知道为什么不能发、要先做什么），只剩一个同样低对比的「去认证」色块
- 建议改法：条底保留 warning tint，文字改 --c-text-primary（≥12:1），仅左侧图标/描边用 warning 作强度提示
- 修复类别：CSS/token

### R9-L05-D07　P2 / 可达性　批次 R9-B27
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`47f8a8372531f852`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:656`
- 理想图依据：无基准，依据=规范 §1.2 文字档 + 同域基准 校园圈.png 页头取色；实测帧 x=40,y=70 页头底 #9CE5CD，「取消」字身取到 #FFFFFF
- 现象：页头「取消」与「发布话题」用 --c-text-inverse 压渐变 60% 档，实测底 #9CE5CD → 1.45:1，退出入口的标签在帧上不可辨
- 建议改法：与 D01 同批收口（页头文字统一 --c-text-primary 或把渐变段加深），三页 campus 一次改完
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（3 条）

### R9-L05-D08　P2 / 可达性　批次 R9-B28
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`36e67d0abedc621f`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:432`
- 理想图依据：无基准，依据=规范 §1.2 主文本档 + 同域基准 校园圈.png 页头深字；实测帧 x=200,y=40 页头底 #6ADDB2，标题字身 near-#FFFFFF
- 现象：页头标题「话题详情」白字压 --c-brand-300 段，实测 1.67:1；同页唯一标识页面身份的文字不可读
- 建议改法：与 D01/D07 同批改页头文字档（统一 --c-text-primary 或加深渐变段）
- 修复类别：CSS/token

### R9-L05-D09　P3 / 字号　批次 R9-B28
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`36e67d0abedc621f`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:430`
- 理想图依据：无基准，依据=规范 §1.3 字阶（--fs-xl 30 / --fs-2xl 32 / --fs-3xl 36rpx，无 34 档）+ 同域两页取档对照：post-topic.vue:661 var(--fs-xl,34rpx)=实跑 30rpx、certification.vue:513 var(--fs-2xl)=32rpx、本页 34rpx 字面量
- 现象：同一子包的页头标题三个页取三档（30/32/34rpx），本页写死 34rpx 且不在 §1.3 字阶上；post-topic.vue:661 的 fallback 也写成 34rpx 与 --fs-xl 实际值 30rpx 不符
- 建议改法：三页页头统一 var(--fs-2xl, 32rpx)，并清掉与令牌值不一致的 fallback 字面量
- 修复类别：CSS/token

### R9-L05-D10　P3 / 文案　批次 R9-B28
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`36e67d0abedc621f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:329`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue（actionText 传入即渲染动作按钮）；帧上页头 x=27..50 一个「返回」胶囊、y=468..509 一个「返回」按钮，同名同页
- 现象：空态动作按钮文案 campus.topicDetail.backText=「返回」与页头返回胶囊 back=「返回」同页同名（zh-CN.ts:3607/3615），两个控件一个语义，用户无法区分「回到上一页」与「离开错误态」
- 建议改法：空态动作改「回到校园圈」并 navigateBack 到校园列表，或与页头合并只留一个出口
- 修复类别：单页

## subpackages/circles/circles/circle-home（3 条）

### R9-L04-D01　P1 / 可达性　批次 R9-B29
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`8bf16be2a935322b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:742`
- 理想图依据：圈子详情，摄影圈参考.png（头图底部叠层：白字圈名「摄影圈」+ 简介压在深色照片上，对比充足）
- 现象：hero-scrim 渐变 `rgba(0,0,0,0)→.55(42%)→.82(100%)`，高 360rpx=181px（覆盖帧 y≈81–262），α≥.55 只落在下半段；而 .hero-info 叠层（圈名 34rpx + 简介两行 line-clamp:2 + 人数行，自 bottom 起约 104rpx 高）顶端落在 y≈142–160、即 α≈0.44–0.5 段，摄影圈封面（circle-cover-photography@3x.jpg）为浅绿植物+白色相机的亮图，合成底 ≈130–143，白字（简介 0.92/0.85 透明）对比实测约 3.4–4.2:1，圈名与首行简介 <4.5:1。用户拿不到：页面主身份文字（圈名+简介）在亮封面上发灰难读。上一轮把信息并入叠层并加遮罩，但遮罩暗带只盖住叠层下半，属修得不对。
- 建议改法：把 hero-scrim 抬高/加陡（如 height 440rpx、α 从 30% 起即 ≥.6），或在 .hero-info 顶部再叠一层实底 rgba(0,0,0,.5) 内衬，使圈名/简介整段落到 α≥.6 段。
- 修复类别：单页

### R9-L04-D02　P2 / 尺寸比例　批次 R9-B29
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`8bf16be2a935322b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:714`
- 理想图依据：圈子详情，摄影圈参考.png（白 sheet 顶缘实测约帧高 27%）
- 现象：`.hero height:520rpx`=262px=帧高 32.2%，理想图白 sheet 顶缘 27%（≈220px≈436rpx）。上一轮 R8-L04-D07 注释自述把 440rpx「抬到 520rpx」以容纳两行简介叠层，结果头图比参考高约 84rpx（≈19%），把 tab/公告/feed 整体下压。头图过 tall 属对参考的过修正。
- 建议改法：头图回落到 ≈440–460rpx（约帧高 27%），叠层内衬改用更紧的 gap/单行简介，避免为塞内容抬高整块封面。
- 修复类别：单页

### R9-L04-D03　P2 / 位置　批次 R9-B29
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`95a2a925ce9e0493`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1001`
- 理想图依据：圈子详情，摄影圈参考.png（tab 行「动态/精华/活动/作品墙/成员 1.2w」五项均单行等高）
- 现象：`.tab-text{font-size:28rpx}` 无 `white-space:nowrap`，`.tab-item` 为 `flex:1` 等宽；末位 tab 文案「成员 1.2w」（tabLabel 拼人数）超出等宽槽，帧上「成员」与「1.2w」折成两行，该 tab 比其余四项高，页签行基线不齐。理想图为单行。
- 建议改法：给 `.tab-text` 加 `white-space:nowrap`，或让成员 tab `flex` 权重按内容放大，保证「成员 1.2w」单行显示。
- 修复类别：单页

## subpackages/circles/circles/index（2 条）

### R9-L03-D01　P2 / 颜色token　批次 R9-B30
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`9e1cfbaf3c804436`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:1003`
- 理想图依据：兴趣圈列表.png 分类行——非选中「摄影/旅行/音乐/运动/美食」各为一枚清晰浅灰胶囊（实测灰底与白/浅绿底明显分层）
- 现象：非选中 chip 底取 `var(--c-bg-surface,#F3FAF6)`，而 chip 实际坐在吸顶页头的浅绿底 #EEF7F2 上（帧测 x95y117 底=#F3FAF6、周边页底=#EEF7F2，仅 1rpx --c-line #EEF2F0 描边）；实测二者对比 1.03:1，胶囊边界不可辨，读作裸文字——R8-L03-D21 那次「chip 填充改档」是拿卡面 #FFFFFF 做参照算的，参照面选错（chip 不在卡上），仍等于没拉开。
- 建议改法：非选中 chip 底改与页头浅绿拉开一档的档（如 --c-neutral-100 或加深描边到 --c-border-default），使胶囊轮廓在 #EEF7F2 上可见。
- 修复类别：CSS/token

### R9-L03-D02　P3 / 素材缺失　批次 R9-B30
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`e50bfe4b870b9e7f`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:470`
- 理想图依据：兴趣圈列表.png 行末 ☰ 圆钮右上角常驻一枚绿色小圆点（提示可筛选）
- 现象：筛选圆钮的绿点写成 `v-if="filterMode !== 'all'"`，默认态 filterMode='all' ⇒ 帧上 ☰ 圆钮（实测白圆 x310..345）右上角无任何状态点，理想图明确常驻的那枚绿点缺席。
- 建议改法：让绿点常驻（或至少默认态保留），把「已启用筛选」改成点的深浅/描边区分，而非默认隐藏。
- 修复类别：单页

## subpackages/circles/circles/post-topic（2 条）

### R9-L04-D08　P2 / 颜色token　批次 R9-B31
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`b5a4c3972a9c92d4`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:796`
- 理想图依据：无基准，依据=规范文档 §1.1 原则2「绿色=行动，粉色=喜欢，两色禁止混用」
- 现象：`.post-header` 背景 `linear-gradient(135deg, $green-primary 0%, var(--c-brand-300) 60%, var(--c-romance-300) 100%)`，导航条由品牌绿一路渐变到心动粉，帧上右半（胶囊一带）明显发粉。把「行动绿」与「喜欢粉」在同一控件里混用，直接违反 §1.1 两色禁止混用。
- 建议改法：头图去掉 --c-romance-300 粉端，改纯品牌绿档（如 --c-brand→--c-brand-600 或复用同域 topics-header 的 --c-gradient-brand）。
- 修复类别：CSS/token

### R9-L04-D09　P3 / 字号　批次 R9-B31
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`b5a4c3972a9c92d4`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:820`
- 理想图依据：无基准，依据=规范文档 §1.3 辅助/正文档 + 同域两页取档一致性（topics.vue:723、topic-detail.vue:475 导航标题均 --fs-xl=30rpx）
- 现象：`.post-header__title` 字号 34rpx，而同属 circles 域的 topics / topic-detail 导航标题都用 `var(--fs-xl)`=30rpx。同一分包三页导航标题取档不一（34 vs 30rpx），post-topic 高出一档。
- 建议改法：改 `font-size: var(--fs-xl)`，与同域 topics/topic-detail 导航标题对齐。
- 修复类别：CSS/token

## subpackages/circles/circles/topic-detail（2 条）

### R9-L04-D06　P2 / 可达性　批次 R9-B02
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`7ae10a8a294757cd`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:184`
- 理想图依据：无基准，依据=组件规范 EmptyState（次级说明行应达 --c-text-tertiary 档）+ 规范 §1.2 文本色板
- 现象：空态副标题「这里空空如也」`.empty-sub` 取 `--c-text-quaternary`=#9AA39F（design-variables.scss:126），落在页面底 --c-bg-page #EEF7F2 上，实测对比约 2.4:1，帧上该行几乎看不清；且与主标题「话题不存在或已被删除」语义重复（组件已提供 hideSub 却未用）。次级文字低于 3:1 下限。
- 建议改法：本页对 EmptyState 传 `hide-sub`（标题已表意），或把 `.empty-sub` 提到 `--c-text-tertiary`(#6B7571，≈3.9:1)。
- 修复类别：CSS/token

### R9-L04-D07　P2 / 位置　批次 R9-B32
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`2a541a84e68a5780`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:401`
- 理想图依据：无基准，依据=组件规范 EmptyState（注释 line 152 明示组件不自证居中，居中由消费页容器负责）
- 现象：「话题不存在」分支的 `<EmptyState>` 直接挂在定高 flex 列根容器里，无 flex:1/居中包裹，帧上图标+文案+返回钮整体贴顶（约帧高 14–36%），下方约 55% 视口全空，空态未垂直居中，视觉重心严重偏上。
- 建议改法：用一个 `flex:1; display:flex; align-items:center; justify-content:center` 的宿主包住 EmptyState（或给 .detail-body 补居中），使空态在可视区内居中。
- 修复类别：单页

## subpackages/circles/circles/topics（2 条）

### R9-L04-D04　P3 / 颜色token　批次 R9-B33
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`44c31b2c50cdef39`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:773`
- 理想图依据：无基准，依据=规范文档 §1.1 原则3「一令牌一值，禁止私有色值」+ §1.2 边框档 --c-border-light/default/strong
- 现象：置顶【圈规】条 `.topic-rule` 描边写成裸十六进制 `border:1rpx solid #B8EDDA`，非 --c-border-* 任一档（#EEF2F0/#DDE3E0/#C2CAC6），脱离令牌体系、深色模式不跟随。属页内私有色值。
- 建议改法：改 `border:1rpx solid var(--c-brand-100)`（或既有浅绿描边令牌），去掉硬编码 #B8EDDA。
- 修复类别：CSS/token

### R9-L04-D05　P3 / 颜色token　批次 R9-B33
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`2b6cfc903a61e6c7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1309`
- 理想图依据：无基准，依据=规范文档 §1.2 品牌绿阶（500 #36C99A / 600 #2AAE83 / 700 #1F8D6A，无 #2DB98A 档）
- 现象：每张 feed 卡「认识 TA」描边胶囊文字 `.topic-card__meet-text` 用裸色 `color:#2DB98A`，既非 --c-brand-500(#36C99A) 亦非 600(#2AAE83)；同处 `.topic-card__meet` 边框 fallback 也误写成 `var(--c-brand-500,#2DB98A)`（真值应为 #36C99A）。页内出现一个色板外私绿。
- 建议改法：文字与边框统一走 `var(--c-brand-600)`（或 --c-brand-500），删除 #2DB98A 与错误 fallback。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/history（2 条）

### R9-L06-D07　P3 / 文案　批次 R9-B34
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`8bf7c00620c94dc0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:157`
- 理想图依据：无基准，依据=同分包 segment.vue:135、people.vue:163、match-success.vue:145 返回符号均为 "‹"（U+2039 单尖左引号），本页用 "←"（U+2190 左箭头），同域不一致
- 现象：.back-icon 渲染 "←"（U+2190），同分包其余三页均为 "‹"（U+2039），字形宽度与视觉重量不同，实帧返回钮内箭头比同域其他页明显偏宽。
- 建议改法：将 history.vue:157 的 "←" 改为 "‹"，与分包其余页统一。
- 修复类别：单页

### R9-L06-D08　P3 / 颜色token　批次 R9-B34
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`8bf7c00620c94dc0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:345`
- 理想图依据：无基准，依据=规范文档 §1.1 "绿色=行动"，页标题为信息性文本非可点行动件；同分包 segment/people 标题均取 --c-text-primary
- 现象：.page-title 在 mp-weixin 分支 color: var(--c-brand)（品牌绿），"今日已看"标题读起来像可点行动件；同分包 segment.vue:238、people.vue:293 标题均用 --c-text-primary（深色），两页取档不一。
- 建议改法：mp-weixin 分支的 .page-title color 改为 var(--c-text-primary)，与同分包其余页对齐；若需保留渐变语义，可用 --c-brand-800 深色档。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/match-success（2 条）

### R9-L06-D01　P2 / 文案　批次 R9-B11
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`7c3d52aa912654ce`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:98`
- 理想图依据：匹配成功页面.png 副标题区域，理想原文为"你和 星野 互相喜欢了彼此"
- 现象：实帧副标题渲染为"你和 TA 互相喜欢上了"，i18n 模板 matchSuccess.matchedWith（zh-CN.ts:462）写的是"互相喜欢上了"，理想图为"互相喜欢了彼此"，句尾动词与"彼此"二字均缺失。
- 建议改法：将 zh-CN.ts:462 的 matchedWith 值改为"你和 {name} 互相喜欢了彼此"，同步 en-US.ts:347。
- 修复类别：单页

### R9-L06-D02　P2 / 颜色token　批次 R9-B11
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`e6189fd0d0cfb735`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:465`
- 理想图依据：匹配成功页面.png 共同点卡 4 行进度条区域，理想图轨道为可辨识的浅灰色圆角条（约 #E5E5E5 档，与白卡明度差 >=10）
- 现象：.match-success__score-track 底色 #F0F0F0 压在白卡 #FFFFFF 上，实测对比度 1.06:1，实帧 4 行进度条轨道完全不可见，仅剩绿色填充条；理想图轨道清晰可辨。
- 建议改法：将 __score-track 的 background 由 #F0F0F0 改为 --c-neutral-200（#E5E7EB 档）或同族可辨识灰，使轨道在白卡上可见。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/matching（6 条）

### R9-L05-D13　P2 / 层级遮挡　批次 R9-B10
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`554662e108a8d0d7`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:565`
- 理想图依据：匹配中页面.png 轨道外环顶点 y=476、头像组中心 y=755 ⇒ 节点轨迹半径 279px=245rpx（环径 ≈490rpx），其最高点 y=476 落在副标题（y=400..427）之下；本帧外环 520rpx、节点半径 260rpx（MatchLoading.vue:565）
- 现象：轨道节点（18rpx 圆点 + 6rpx 光环）本帧实测占 x=200..208 / y=138..149，正落在标题字带 y=142..158 之内——同列 x=204 只有 y=151..158 读得出字，左右相邻列 x=196/198/210/214 的字带都从 y≈142-145 起，标题「你」字上半部被节点盖掉
- 建议改法：节点半径 260rpx 收到 220rpx（或把 avatar-area 的 margin-top:64rpx 抬到 100rpx+），使节点轨迹最高点退到标题带 y=142 之下；「跳过→标题→副标题→轨道」这个顺序是对的，不要回退
- 修复类别：CSS/token

### R9-L05-D14　P2 / 素材缺失　批次 R9-B10
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`554662e108a8d0d7`，自同段前条继承）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:349`
- 理想图依据：匹配中页面.png 中央爱心区——爱心垫一枚白色圆碟，实测碟径 100px(88rpx)、爱心 63px(55rpx)；本帧 x=150..230 / y=240..330 区域近白像素仅 100 个（全部来自两侧头像白描边），无碟形
- 现象：中央爱心直接压在浅渐变底上，理想图那枚 88rpx 白底圆碟没有做出来，爱心与背景同为高饱和浅色调，中心焦点塌掉
- 建议改法：.match-loading__heart 加 width/height 88rpx + background: var(--c-bg-container) + border-radius 50%，内图保持 80rpx
- 修复类别：CSS/token

### R9-L05-D15　P2 / 可达性　批次 R9-B10
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`554662e108a8d0d7`，自同段前条继承）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:212`
- 理想图依据：匹配中页面.png 右上「跳过」胶囊（理想图胶囊含绿点图标 + 文字，实测高 22px 文字 + 内边距）；本帧胶囊实测 x=308..360 / y=89..120 = 53×32px = 105×63rpx
- 现象：「跳过」胶囊热区高实测 63rpx，低于仓内 88rpx 触摸档；且理想图胶囊里的绿点图标没有落件，只剩文字
- 建议改法：padding 改 22rpx 30rpx（使总高 ≥88rpx），并按理想图补一枚 --c-brand 圆点前缀图标
- 修复类别：CSS/token

### R9-L05-D16　P2 / 颜色token　批次 R9-B10
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`0a042af52c5f0749`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:554`
- 理想图依据：匹配中页面.png 轨道节点为品牌绿系；规范 §1.1 原则 3「一令牌一值，禁止私有色值」+ §1.2 主色 --c-brand #36C99A（色板无 #4CDC9D 档）
- 现象：轨道节点底色写死 #4CDC9D，帧上实测节点像素 #4EDC9E/#4BDC9D，比品牌绿亮一档，是 R8-L05-D18 那批「7 枚裸 hex 收敛」后本组件仅剩的一枚表外实色
- 建议改法：改 var(--c-brand, #36C99A)（需更亮就补 brand-400 令牌再引用），不留字面量
- 修复类别：CSS/token

### R9-L05-D17　P2 / 字号　批次 R9-B10
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`0a042af52c5f0749`，自同段前条继承）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:366`
- 理想图依据：匹配中页面.png 标题「正在寻找有缘的Ta...」实测字身带 42px 高 = 37rpx（同法量本页标题得 16px=32rpx，量法一致）
- 现象：主标题字号写死 34rpx，帧上实测字高 32rpx，比理想图同位置标题（37rpx）小一档，且 34rpx 不在 §1.3 字阶（32/36/40）上，页面第一屏视觉重量比理想图轻
- 建议改法：改 var(--fs-3xl, 36rpx)/800，与理想图 37rpx 取同一档
- 修复类别：CSS/token

### R9-L05-D18　P3 / 颜色token　批次 R9-B10
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`0a042af52c5f0749`，自同段前条继承）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:531`
- 理想图依据：匹配中页面.png 轨道环/涟漪为品牌绿淡档；规范 §1.1 原则 3 要求引用 var(--c-*)，同族已有 --c-brand-border-tint（design-variables.scss:830 系）
- 现象：同组件还留着 6 处 rgba(54, 201, 154, α) 字面量（:268 :283 :288 :531 :543 :555）与 :331 的 rgba(255,255,255,0.85)、:345/:389 阴影字面量——值就是 --c-brand 的 α 档，但没走令牌，深色模式不会反色
- 建议改法：统一换成 var(--c-brand-border-tint) 系列或补 α 档令牌；与 D16 同批清干净本组件字面量
- 修复类别：CSS/token

## subpackages/discover-extra/home/segment（2 条）

### R9-L06-D03　P2 / 字号　批次 R9-B35
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`0e740d3636de7ed0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:336`
- 理想图依据：无基准，依据=规范文档 §1.3 正文/标签最小档 12px（24rpx）
- 现象：.segment-row__meta 字号 22rpx = 11px，低于 §1.3 规定的 12px 正文最小档；实帧学校名与距离文字笔画偏细，在 378px 画布上可读性下降。
- 建议改法：将 .segment-row__meta font-size 由 22rpx 提到 var(--fs-base, 24rpx)，与同页 __online 同档。
- 修复类别：CSS/token

### R9-L06-D04　P2 / 间距　批次 R9-B35
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`766e5077bd99cfbf`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:295`
- 理想图依据：无基准，依据=同分包 people.vue .people-row__info gap 同为 6rpx 但行内含标签第三行使视觉更拥挤，segment 仅两行时 3px 间距导致姓名行与 meta 行粘连
- 现象：.segment-row__info gap: 6rpx = 3px，姓名行（含在线点）与 meta 行之间仅 3px 垂直间距，实帧两行文字笔画几乎相接，低于 --sp-2（8rpx=4px）最小间距档。
- 建议改法：将 .segment-row__info gap 由 6rpx 提到 var(--sp-2, 8rpx) 或 12rpx，拉开两行呼吸感。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（2 条）

### R9-L07-D01　P2 / 字号　批次 R9-B36
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`b49e1aeac05ceb62`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:708`
- 理想图依据：无基准，依据=规范§1.3「极小 --fs-xs/sm=10/11px」为角标下限；本页角标用裸 18rpx 落在令牌刻度之外
- 现象：「喜欢我的」Tab 红角标里的数字「1」字号为硬编码 18rpx（9px），比全站最小字号令牌 --fs-xs(20rpx=10px) 还小一档，且未走 --fs-* 令牌族
- 建议改法：把 .tabs__badge-text 的 font-size 由 18rpx 改为 var(--fs-xs)，与其余角标同档
- 修复类别：CSS/token

### R9-L07-D02　P2 / 可达性　批次 R9-B36
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`b49e1aeac05ceb62`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:540`
- 理想图依据：无基准，依据=规范§1.2 次级文字应达 4.5:1（本页为可读副标题而非纯装饰）
- 现象：页头副标题「谁在喜欢你，谁来看过你」用 --c-text-tertiary(#6B7571) 压在 --c-gradient-page 顶部（≈#EEF7F2）上，实测对比 4.36:1，落在 3:1–4.5:1 之间，11px 小字读感偏弱
- 建议改法：副标题色由 --c-text-tertiary 升到 --c-text-secondary(#4A524E，对白底 8.06:1)
- 修复类别：CSS/token

## subpackages/discover-extra/likes/index（2 条）

### R9-L06-D09　P2 / 尺寸比例　批次 R9-B01
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`5f99122f06103359`）
- 源码证据：`apps/client/src/components/common/BaseTabs.vue:52`
- 理想图依据：无基准，依据=BaseTabs 组件规范（pill 变体 + equal-split 时标签应单行），实帧"喜欢我的"和"我发出的喜欢"均折行为两行，标签高度不一致
- 现象：equal-split 给每个 tab flex:1 1 0（各占 1/3 宽），"喜欢我的"(4字)+badge 与"我发出的喜欢"(5字)+badge 在 1/3 容器宽内放不下，.base-tab-label 无 white-space:nowrap 导致折行，实帧前两枚 tab 高度约为第三枚的 1.7 倍。
- 建议改法：在 .base-tabs--pill .base-tab-label 补 white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 或在 likes 页取消 equal-split 改用自然宽度。
- 修复类别：单页

### R9-L06-D10　P2 / 颜色token　批次 R9-B37
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`05f7a071fe010a7d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1693`
- 理想图依据：无基准，依据=规范文档 §1.1 文字对比度（UI 控件标签 >=3:1）；--c-brand 实测约 #3CCA9C 压白底 #FFFFFF 对比度约 2.1:1，低于 3:1
- 现象：.likes-header__manage-text 色取 var(--c-brand)（品牌绿），压在 .likes-header__manage 的 --c-bg-container（白底）上，实测对比度约 2.1:1，低于 UI 控件标签 3:1 门槛；实帧"管理"二字偏淡。
- 建议改法：将管理按钮文字色改 --c-brand-700（#1F8D6A，压白约 4.14:1）或 --c-brand-800（#156B51，压白约 6.45:1），与同分包 segment/people 在线文字色同档。
- 修复类别：CSS/token

## subpackages/discover-extra/nearby/people（2 条）

### R9-L06-D05　P2 / 颜色token　批次 R9-B38
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`77d4b5482333bfb4`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:331`
- 理想图依据：无基准，依据=规范文档 §1.1 文字对比度要求（正文级 >=4.5:1）；--c-brand-600 实测 #2AAE83 压 --c-brand-50 #E8FAF3 对比度约 2.7:1，远低于 4.5:1
- 现象：.people-tab--active .people-tab__text 色取 --c-brand-600（#2AAE83），底色 --c-brand-50（#E8FAF3），实测对比度约 2.7:1，26rpx/700 字重不享 WCAG 大字号豁免（需 >=18.67px bold），低于正文 4.5:1 门槛。
- 建议改法：将激活态文字色改 --c-brand-800（#156B51，压 #E8FAF3 约 5.9:1），与同页 __online 文字色同档。
- 修复类别：CSS/token

### R9-L06-D06　P2 / 字号　批次 R9-B38
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`f2869c394c6f4e00`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:449`
- 理想图依据：无基准，依据=规范文档 §1.3 正文/标签最小档 12px（24rpx）
- 现象：.people-row__meta 字号 22rpx = 11px，低于 §1.3 规定的 12px 正文最小档；底帧学校名/距离文字笔画偏细，与同页标签行 24rpx 形成倒挂（meta 比 tag 还小）。
- 建议改法：将 .people-row__meta font-size 由 22rpx 提到 var(--fs-base, 24rpx)，与 segment.vue 同批收口。
- 修复类别：CSS/token

## subpackages/discover/activities/index（2 条）

### R9-L13-D05　P2 / 颜色token　批次 R9-B39
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`3e9ee3b4d5ea01cb`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:686`
- 理想图依据：无基准，依据=§1.2（输入底 --c-bg-surface 与页底 --c-bg-page 需可辨）+ 组件规范；分段控件轨道须可识别
- 现象：「列表 / 日历」分段控件轨道 `.view-toggle` 底取 `--c-bg-surface` #F3FAF6，压在页面底 `--c-bg-page` #EEF7F2 上实测 ≈1.03:1（非文字需 3:1），轨道边界不可辨；top 帧只见「列表」绿块、而「日历」像裸文字浮在绿底上，看不出是一个可点的分段切换。
- 建议改法：轨道底改与页底可辨的档（如 `--c-brand-50` 或加 `--border-subtle` 描边），使控件边界达非文字 3:1。
- 修复类别：CSS/token

### R9-L13-D06　P2 / 可达性　批次 R9-B39
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`d89190aac3dc63c7`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:805`
- 理想图依据：无基准，依据=§1.2 + 组件规范；分类标签文字应达次级文字对比
- 现象：卡片「综合」分类标签 `.row-category-tag` 文字取 `--c-brand` #36C99A、底取 `--c-brand-50` #E8FAF3，实测对比 ≈1.94:1，远低于 10px 小标签所需 4.5:1（同族 brand 字压 brand 浅底、色相同向），bottom 帧两卡的「综合」几乎糊成一片浅绿。
- 建议改法：标签文字改 `--c-brand-700`/`--c-tag-green-text` 深档或底换中性浅底，使标签文字 ≥4.5:1。
- 修复类别：CSS/token

## subpackages/discover/discussions/index（2 条）

### R9-L13-D03　P2 / 可达性　批次 R9-B06
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`2e993507837aa1ff`）
- 源码证据：`apps/client/src/components/common/StatusState.vue:89`
- 理想图依据：无基准，依据=§1.2 + 组件规范；热度药丸文字应达次级文字对比
- 现象：每行热度药丸（「热度上升 / 13 人参与」等）文字取 `--c-warning` #F59E0B、底取 `--c-warning-bg-tint`（同色 12% 叠白 ≈#FDF3E2），实测对比 ≈1.95:1，远低于 11px 标签所需 4.5:1、甚至低于非文字 3:1；R8-B47 只把图标从 ✕ 换成火苗（素材轴），配色沿用 warning 未动，故这是同组件上的独立对比轴缺陷。
- 建议改法：heat 档文字改吃更深档（如 warning-700 / `--c-accent-400` 级）或把底换成中性 `--c-neutral-50`，使药丸文字 ≥4.5:1。
- 修复类别：CSS/token

### R9-L13-D04　P3 / 间距　批次 R9-B40
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`2be496e85ee5f070`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:174`
- 理想图依据：无基准，依据=§1.4（间距 4/8/12/16/20/24/32/48rpx 阶梯 + 分隔线 1rpx 令牌）
- 现象：`.feed-row` 行间分隔线写死 `border-top: 1px`（物理 px，≈2rpx）而非全站 1rpx 分隔令牌；同行 `gap:10rpx`（:172）、`padding:22rpx 0`（:173）两值均落在 §1.4 --sp 阶梯（8/12/16/20/24）之外，与同页 SectionCard 走 --sp-8(32rpx) 的取档不齐（同域两卡取档不一）。
- 建议改法：分隔线改 `1rpx solid var(--border-subtle)`，gap/padding 收敛到 --sp-3(12rpx)/--sp-6(24rpx) 阶梯档。
- 修复类别：CSS/token

## subpackages/legal/agreement/index（2 条）

### R9-L13-D09　P2 / 可达性　批次 R9-B04
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`0694d5b059b42f6d`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:443`
- 理想图依据：无基准，依据=§1.2 + 组件规范；唯一确认出口 CTA 文字应达 4.5:1
- 现象：用户协议页与隐私页共用 LegalTextPage，首屏吸底「我已阅读并同意」同样文字 `--c-text-inverse` 压 `--c-brand` #36C99A ≈2.0:1（<4.5:1）；R8 的 fixed 位置修复对本页同样确认到位（CTA 在首屏），残留为同组件的对比/令牌误配轴。
- 建议改法：与 D07 同源——CTA 底改 brand-700/800 深档或前景换成与绿底成对的高对比令牌。
- 修复类别：CSS/token

### R9-L13-D10　P2 / 间距　批次 R9-B04
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`3606cb2af6df8e2a`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:286`
- 理想图依据：无基准，依据=§1.4 + §1.1 原则1；文末白卡与吸底白条之间不应露绿断层
- 现象：同隐私页根因——`.legal-page` 的 200rpx 占位高于吸底条 ~136rpx，滚到底（bottom 帧，末段第 11 条「…15 个工作日内回复。」之后）白卡圆角底与白底吸底条之间露出约 64rpx `--c-bg-page` 绿色横带，把「一张白卡」又切出底部断层（未压字）。
- 建议改法：与 D08 同源——占位收敛到吸底条等高 + 安全区，消除绿缝。
- 修复类别：单页

## subpackages/legal/privacy/index（2 条）

### R9-L13-D07　P2 / 可达性　批次 R9-B04
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`3d026c7523caf2cb`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:443`
- 理想图依据：无基准，依据=§1.2 + 组件规范；唯一确认出口 CTA 文字应达 4.5:1
- 现象：首屏吸底「我已阅读并同意」按钮（R8 改 fixed 后确已在首屏，位置轴已修对）文字取 `--c-text-inverse`（tokens 归口为图片遮罩白字 rgba(255,255,255,.95) design-variables.scss:369）、底取 `--c-brand` #36C99A，实测对比 ≈2.0:1，远低于 28rpx 粗体按钮文字所需 4.5:1；且 --c-text-inverse 语义是「图片遮罩白字」，用作按钮前景属令牌误配。
- 建议改法：CTA 底改 `--c-brand-700`/`--c-brand-800` 深档（白字对比升至 ≥4.5:1），或前景改与绿底成对的高对比档。
- 修复类别：CSS/token

### R9-L13-D08　P2 / 间距　批次 R9-B04
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`073ed19b6d95bf92`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:286`
- 理想图依据：无基准，依据=§1.4 + §1.1 原则1；文末白卡与吸底白条之间不应露绿断层
- 现象：为避让吸底条给 `.legal-page` 加 `padding-bottom:200rpx`，但吸底条实高仅 ~136rpx（钮 96 + 上 sp-4 16 + 下 sp-6 24），滚到底（bottom 帧）白卡圆角底与白底吸底条之间露出约 64rpx（≈32px）的 `--c-bg-page` 绿色横带——同一条间距轴上一轮补得过头、把 R8-L13-D13 刚抹平的「白卡」又切出底部断层（未压字，仅露底）。
- 建议改法：占位收到与吸底条等高（约 136rpx + 安全区）或直接把正文容器底部内距并入吸底条避让值，消除绿缝。
- 修复类别：单页

## subpackages/profile-extra/profile/album（2 条）

### R9-L10-D15　P2 / 可达性　批次 R9-B41
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`5965abd5c8c35140`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:880`
- 理想图依据：无基准，依据=design-variables.scss 真值 $brand-500 #36C99A 文字对比口径
- 现象：「添加照片」主 CTA 走 R7-L10-D14 定的品牌绿实底白字配方，实测 #fff on #36C99A=2.10:1（28rpx/600），钮可点但标签低可读
- 建议改法：与 D08 同一 token 级修法（品牌绿实底配字统一加深），勿两页各修各的
- 修复类别：CSS/token

### R9-L10-D16　P2 / 可达性　批次 R9-B41
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`42f47fe6aea8ede8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:805`
- 理想图依据：无基准，依据=非文字控件对比 ≥3:1 口径（components/common 组件规范）
- 现象：R8-B52 补的空位「+」格本身达标，但取色低于非文字 3:1 线：虚线描边 --c-brand-300 #75E1B7 压 --c-brand-50 #E8FAF3 底实测 1.46:1、「+」字形 --c-brand #36C99A 同底 1.94:1，帧上第二行三格几乎看不见
- 建议改法：虚线与「+」各加深一档（如描边 brand-500、字形 brand-600），保证 ≥3:1
- 修复类别：CSS/token

## subpackages/profile-extra/profile/favorites（4 条）

### R9-L10-D17　P2 / 位置　批次 R9-B42
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`32aa057e9674e49b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:152`
- 理想图依据：无基准，依据=EmptyState 组件规范（flex:1 撑满宿主可用区垂直居中，EmptyState.vue:147-154 自述）
- 现象：上一轮修得不对——R7-L10-D17 给宿主页补了 display:flex 列，帧上星+文案+按钮块仍整体偏上（内容中心 y≈218，y=300..800 约 500px 整块空白），居中未生效
- 建议改法：核实 flex:1 是否作用到 EmptyState 根节点（scoped 穿透/根类名），不足则宿主给 .favorites-page 内 EmptyState 包一层 flex:1 容器实测居中后复拍
- 修复类别：单页

### R9-L10-D18　P1 / 可达性　批次 R9-B02
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`32aa057e9674e49b`，自同段前条继承）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:184`
- 理想图依据：无基准，依据=design-variables.scss 真值 $text-quaternary #9AA39F/$bg-page #EEF7F2 正文对比口径
- 现象：空态描述「在帖子页点收藏，喜欢的帖子会出现在这里」是用户学会本页功能的唯一指引，--fs-base 24rpx 正文档压 --c-bg-page 实测 2.37:1，低于 3:1——首次进页的用户拿不到"怎么收藏"这句话
- 建议改法：EmptyState 描述统一 --c-text-secondary（组件级一处修，30+ 消费点同收益）
- 修复类别：CSS/token

### R9-L10-D19　P2 / 可达性　批次 R9-B42
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`32aa057e9674e49b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:165`
- 理想图依据：无基准，依据=仓内热区口径 AppShell.vue:334（88rpx），同域 location/privacy/album 返回钮均已按此修到 88rpx 热区
- 现象：返回钮热区仍是 64rpx×64rpx（帧实测白圆底≈32px 见方），是同域唯一未达 88rpx 口径的返回钮；系统右滑可退故不判 P1
- 建议改法：热区撑到 88rpx、64rpx 圆底移进内层 circle（照抄 privacy.vue:254-267 配方）
- 修复类别：单页

### R9-L10-D20　P3 / 位置　批次 R9-B42
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`32aa057e9674e49b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:175`
- 理想图依据：无基准，依据=同域一致性：location「我的位置」/album「我的相册」/privacy「隐私权限设置」页题均居中、--fs-4xl
- 现象：本页页题「我的收藏 (0)」左置贴返回钮、30rpx 档，同域其余三页居中 40rpx+ 档——同分包两页取档不一
- 建议改法：页题居中并升 --fs-4xl，返回钮绝对定位左侧
- 修复类别：单页

## subpackages/profile-extra/profile/location（4 条）

### R9-L10-D08　P2 / 可达性　批次 R9-B43
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`5b6a325d22add24f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:539`
- 理想图依据：无基准，依据=design-variables.scss 真值 $brand-500 #36C99A 与正文/标签对比口径
- 现象：「重新定位」「地图选点」两枚主操作钮均为 --c-brand #36C99A 实底 + #ffffff 字，实测 2.10:1（26-28rpx 粗体标签），钮内文字低可读；钮形状本身可点可辨，判 P2
- 建议改法：品牌绿实底钮文字统一改深色档或绿底加深到 ≥3:1 档（同根因连带 album D15、EmptyState 钮，一次 token 级修）
- 修复类别：CSS/token

### R9-L10-D09　P2 / 可达性　批次 R9-B43
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`5b6a325d22add24f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:397`
- 理想图依据：无基准，依据=正文级文字对比口径（次级 3:1–4.5:1 记 P2）
- 现象：空态辅助句「暂时获取不到位置，可点下方…」用 --c-text-tertiary #6B7571 压白卡实测 4.33:1，差 4.5:1 一档
- 建议改法：该指引句提到 --c-text-secondary #4A524E（7.3:1）
- 修复类别：CSS/token

### R9-L10-D10　P2 / 文案　批次 R9-B43
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`5b6a325d22add24f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:89`
- 理想图依据：无基准，依据=规范文档口径：空态不得呈现误导性定位
- 现象：卡片明写「暂无位置信息」，地图却把 callout 标成「当前位置」钉在 DEFAULT_CENTER 北京坐标（帧上红针+白牌"当前位置"）——同帧两个互相矛盾的口径，用户可能误信自己定位在北京
- 建议改法：无真实坐标时 callout 改「示例位置（未定位）」或隐藏 callout，仅留中心点
- 修复类别：单页

### R9-L10-D11　P3 / 圆角　批次 R9-B43
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`ea26fa16539f1f30`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:456`
- 理想图依据：无基准，依据=同页同级卡片应同档（components/common 卡片规范取 --r-xl 24rpx 或 --r-2xl 32rpx 一档）
- 现象：同页两张一级卡圆角取档不一：信息卡 32rpx（:347）硬写、地图卡衬层 24rpx（:456）硬写，均未走 --r-* 令牌，帧上两卡圆角肉眼可见不同档
- 建议改法：两卡统一 var(--r-xl, 24rpx)（或同选 32rpx 档），删裸值
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（7 条）

### R9-L10-D01　P2 / 位置　批次 R9-B15
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`ac224f6208a3bf01`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:101`
- 理想图依据：他人显示主页.png 身份卡区——「星野 ♀ 在线」姓名行紧贴头像右侧、与头像垂直中线同排，「喜欢」胶囊同行最右
- 现象：帧上姓名行渲染在头像正下方（y362-375，头像底 y≈342），身份卡 padding-top 148rpx 把整行推到头像以下，姓名与头像不成基准的左右同排结构
- 建议改法：头像移入卡内左列（负 margin 跨卡缘），姓名行与头像并排、右侧动作胶囊顶对齐姓名行
- 修复类别：单页

### R9-L10-D02　P2 / 尺寸比例　批次 R9-B14
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`ac224f6208a3bf01`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:88`
- 理想图依据：他人显示主页.png 头像圆片≈135px/678px 屏宽≈19.9%（≈150rpx 含白环）
- 现象：帧上头像外径实测≈90px=23.8%屏宽（代码 176rpx+8rpx×2 白环=192rpx），比基准大出约 1/6 屏宽占比，压得身份卡头部失衡
- 建议改法：头像档降到 ≈144rpx+6rpx 环（总≈156rpx），与基准 19.9% 屏宽对齐
- 修复类别：单页

### R9-L10-D03　P2 / 字号　批次 R9-B15
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`ac224f6208a3bf01`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:129`
- 理想图依据：他人显示主页.png 姓名字形≈27px/678px 屏宽≈4.0%（≈30rpx 档）
- 现象：帧上「小新生」字形宽≈19.3px/378px=5.1% 屏宽（代码 44rpx），姓名字号比基准比例放大约一档半
- 建议改法：姓名字号降至 --fs-3xl(40rpx) 以下一档（≈32rpx），与基准 4% 屏宽占比对齐
- 修复类别：单页

### R9-L10-D04　P1 / 可达性　批次 R9-B15
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`ac224f6208a3bf01`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:259`
- 理想图依据：无基准页此项；依据=design-variables.scss 正文级文字对比口径（本域正文 4.5:1）
- 现象：「资料暂未完善」是解释年龄/学校/城市整排缺席的唯一一行正文级（--fs-md 26rpx）说明，却用 --c-text-quaternary #9AA39F 压白卡，实测 2.59:1，低于 3:1 非文字底线——用户读不到"为什么这页没有资料"
- 建议改法：可读性空态文案改 --c-text-tertiary #6B7571（4.33:1）以上档；quaternary 只留给纯装饰（同规则连带 PublicCommon.vue:190）
- 修复类别：CSS/token

### R9-L10-D05　P2 / 可达性　批次 R9-B15
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`ac224f6208a3bf01`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:238`
- 理想图依据：他人显示主页.png 身份卡右侧「喜欢/打招呼」两枚浅底胶囊
- 现象：「打招呼」标签 --c-brand #36C99A 压 #E8FBF3 浅绿底实测 1.95:1、「喜欢」#FF6B81 压 #FCE4EC 实测 2.18:1，22rpx 标签文字两枚都读不清；因底栏有同动作大号实心钮（替代出口在），判 P2 不判 P1
- 建议改法：胶囊文字取品牌绿深档（--c-brand-700 级 ≥4.5:1）或 tint 底加深一档，两枚同修
- 修复类别：CSS/token

### R9-L10-D06　P2 / 层级遮挡　批次 R9-B44
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`1f8ff2414d95d3ef`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:463`
- 理想图依据：他人显示主页.png 为整页静态稿，返回/更多控件只浮在封面照片上，不与姓名文字叠压
- 现象：R6-B58/D05 把头部改 position:fixed 后，滚到底帧上返回深芯片（x≈8..44/y≈55..90）直接压在「小新生」姓名（x≈18..75/y≈55..78）左半，姓名首字被遮——修可达性引入了叠字新伤
- 建议改法：芯片滚入白卡区后加不透明底衬或滚动超过头像区后头部换实底条，保证任何滚动位置不与卡内文字叠压
- 修复类别：单页

### R9-L10-D07　P2 / 间距　批次 R9-B13
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`1f8ff2414d95d3ef`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:71`
- 理想图依据：他人显示主页.png「生活瞬间」区——标题与 4 张照片直接排在页面底上，照片行无包卡、左右缘与标题对齐
- 现象：帧上 4 张照片被再包进一层白卡（margin 24rpx + padding 28rpx + radius 32rpx），照片行比基准内缩约 56rpx/侧，出现「卡中卡」双层圆角
- 建议改法：去掉外层白卡，标题+照片行直接落页面底，照片左右缘对齐 32rpx 页边距
- 修复类别：单页

## subpackages/profile-extra/profile/privacy（3 条）

### R9-L10-D12　P2 / 可达性　批次 R9-B45
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`a778d1b79657f0a0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:298`
- 理想图依据：无基准，依据=design-variables.scss 真值渐变亮端 $brand-400 #55D5A7 与文字对比口径
- 现象：副标题「控制你的信息展示范围」用 --c-text-inverse（rgba(255,255,255,.95)）压在 135° 渐变亮端 #55D5A7 上实测≈1.77:1，22rpx 小字在帧上几乎化进绿底
- 建议改法：副标题改深绿压浅端或渐变限定在 brand-500 深档，保证 ≥4.5:1
- 修复类别：CSS/token

### R9-L10-D13　P2 / 可达性　批次 R9-B45
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`a778d1b79657f0a0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:410`
- 理想图依据：无基准，依据=次级文字 3:1–4.5:1 记 P2 口径
- 现象：「账号安全与隐私保护」等四行副题用 --c-text-tertiary #6B7571 压白卡实测 4.33:1，全部次级说明文字统一差档
- 建议改法：行副题提到 --c-text-secondary，tertiary 留给纯计数类
- 修复类别：CSS/token

### R9-L10-D14　P3 / 字号　批次 R9-B45
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`dc8d9a0beccaa9c2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:371`
- 理想图依据：无基准，依据=同域区块标题档（PublicGallery.vue:80 区块题 30rpx/800）
- 现象：区块标题「隐私安全」用 --fs-lg(28rpx) 且 --c-text-secondary，行内条目标题用 --fs-xl(30rpx) --c-text-primary——区块题比条目题还小半档，帧上分组头读不出层级
- 建议改法：区块题对齐同域 30rpx/800 + --c-text-primary
- 修复类别：单页

## subpackages/support/feedback/index（2 条）

### R9-L13-D01　P2 / 可达性　批次 R9-B46
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`5107cf609d2bd501`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:651`
- 理想图依据：无基准，依据=§1.2（次级文字档）+ 组件规范；分类选择器未选中态文字应达正文对比
- 现象：未选中分类 chip「建议 / 活动提案」文字取 `--c-brand-700` #1F8D6A、底取 `--c-bg-brand` #E8FBF2，实测对比 ≈3.85:1，低于 ~12px 标签所需的 4.5:1（同族 brand-700 压 brand 浅底、色相同向致边界发虚）。
- 建议改法：未选中态文字加深到 `--c-brand-800` #156B51 或改用 `--c-text-secondary`，把该标签对比抬到 ≥4.5:1。
- 修复类别：CSS/token

### R9-L13-D02　P2 / 间距　批次 R9-B46
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`403550d2f86e2e56`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:569`
- 理想图依据：无基准，依据=§1.4 间距 + 组件规范；吸底条出流后占位应只在文末留一份
- 现象：「提交」用 BottomActionBar `fixed` 出流吸底，却在第一张卡「新建提交」内部（:569、卡闭合 :570 之前）塞了 `.action-bar-spacer{height:120rpx}`（:895），bottom 帧可见上传框下方到卡片圆角底之间有一整条约 60px 的空白死区；页尾另有 `.fixed-bar-clear`（:622，同样 120rpx）承担真正的避让，两处占位重复。
- 建议改法：删除卡内的 `.action-bar-spacer`（吸底条只盖视口底、不盖卡片底），仅保留文末 `.fixed-bar-clear`，让「新建提交」卡贴合内容收口。
- 修复类别：单页

## subpackages/tools/activities/detail（2 条）

### R9-L08-D05　P1 / 可达性　批次 R9-B47
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`7fecf6e746e9d78f`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:704`
- 理想图依据：无基准，依据=规范文档§1.1/§1.2（行动色须承载白字）+ 本页唯一主转化控件
- 现象：底部主按钮「立即报名」底为 `var(--c-gradient-brand)`（brand-500→400，:704）、字为 --c-text-inverse 白（:728），白字压渐变中段实测约 2.0:1，字号 --fs-xl(30rpx=15px) 不享 WCAG 大字号豁免（需 4.5:1）。这是本页存在的唯一目的动作（报名），用户拿不到的是：读不清这颗主 CTA 的标签文字。本页上一轮 UNTOUCHED，该档从未被处理；仓内 R8-L07-D03 已把 LockScreen 同一 `--c-gradient-brand` 白字 CTA 判为可达性 P1 并改 --c-brand-800。
- 建议改法：报名钮底色改 --c-brand-800（#156B51，白字 6.45:1），与 LockScreen 那颗同口径。
- 修复类别：CSS/token

### R9-L08-D06　P2 / 可达性　批次 R9-B47
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`cbb9ef1b176105cf`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:457`
- 理想图依据：无基准，依据=规范文档§1.2（导航栏标题须可读）+ 本页绿头规范
- 现象：顶部绿导航栏底 `linear-gradient(135deg, var(--c-brand-500 #36C99A), var(--c-brand-400))`（:457），标题「活动详情」白字（:483）压 brand-500 端约 2.1:1。虽 22px bold 属大字号（3:1 线），仍不达标；bottom 帧与 top 帧同图。比 D05 轻（是栏内标题非主转化动作，且短词易辨），故 P2。
- 建议改法：导航栏渐变两端整体压深一档（如 brand-700→brand-800），或标题改深墨压浅绿头，使白字 ≥3:1。
- 修复类别：CSS/token

## subpackages/tools/daily-question/index（2 条）

### R9-L07-D03　P2 / 颜色token　批次 R9-B48
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`ee4ec6aa73db10bf`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:21`
- 理想图依据：无基准，依据=规范§1.1 第3条禁私有色值；LockScreen.vue:101 已把同语义锁从 #94A3B8 改到 register/lock.svg #4A524E(=--c-text-secondary)
- 现象：上一轮把锁图标从 ×(CLOSE) 换成 LOCK 解决了「素材缺失」，但选的是 common/lock.svg，其描边硬编码 #94A3B8（青灰、非色板档），与 LockScreen 已改档的 register/lock.svg #4A524E 不同；index.vue:18 注释却称「与 LockScreen 同一条素材」，实为两枚不同 SVG
- 建议改法：lockIconSrc 改指 IMAGE_PATHS.REGISTER_ICONS.LOCK（register/lock.svg #4A524E），与 LockScreen 同档同色
- 修复类别：单页

### R9-L07-D04　P2 / 可达性　批次 R9-B48
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`0245f165e274c05d`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:484`
- 理想图依据：无基准，依据=规范§1.2「--c-text-inverse 适用前提是深底」；同仓 LockScreen 主钮取 brand-800(白字 6.45:1) 为达标档
- 现象：上一轮 R6-L08-D16 为「承载白字」把 CTA 底从 brand-500 改深到 --c-brand-600(#2AAE83)，但白字对 brand-600 实测仅 2.81:1，仍远低于 4.5:1（14px 不享大字号豁免），改档未改到位
- 建议改法：CTA 底色由 --c-brand-600 升到 --c-brand-800(#156B51，白字约 6.4:1)，与 likes-visitors/LockScreen 主钮同档
- 修复类别：CSS/token

## subpackages/tools/heart-signals/index（2 条）

### R9-L08-D03　P2 / 可达性　批次 R9-B05
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`90ef6c3e7ac09fab`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:662`
- 理想图依据：无基准，依据=规范文档§1.2（前景色须与所在底档成对）+ LockScreen 组件规范
- 现象：「当前完善度 30%」`.lock-screen__progress` 取 `var(--c-brand)`（#36C99A）压在 --c-gradient-page 中段（约 #E8F5EE）上，实测 1.88:1，是本页最低的一档，且这行是画面里唯一给出完善度数值的地方。R8-B04 只改了锁/勾/叉、徽章碰撞、footer/btn-link 色，未触及此 progress 档。
- 建议改法：该档改走 --c-brand-800（#156B51，压浅绿底约 5.2:1）或与 subtitle 同档 --c-text-secondary，勿用 brand-500 做浅底前景。
- 修复类别：CSS/token

### R9-L08-D04　P2 / 可达性　批次 R9-B05
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`03cbfedae5fb415d`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:109`
- 理想图依据：无基准，依据=规范文档§1.2（非文本图形 ≥3:1）+ LockScreen 组件规范
- 现象：checkIconSrc 指向 REGISTER_ICONS.CHECK_GREEN（描线 #36C99A，见 :104 注释），该勾既作环底白徽内勾（压 --c-bg-container 白=2.11:1）又作权益清单三条前的勾（压浅绿页底=1.88:1），两处均低于非文本 3:1。R8-L08-D03 为让勾与环同色把描线定成 brand-500，浅底档反而看不清——属该次改色的新现象。
- 建议改法：权益勾与徽内勾改用 --c-brand-800 档素材/加 filter 压深（同 close 钮 grayscale+brightness 口径），使浅/白底上 ≥3:1。
- 修复类别：CSS/token

## subpackages/tools/help/index（2 条）

### R9-L07-D07　P2 / 字号　批次 R9-B49
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`c5d576223bd02ee8`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:274`
- 理想图依据：无基准，依据=规范§1.3「正文·列表主文字 --fs-xl/2xl=15/16px」；本页 index.vue:204-207 注释自认列表主文字应 15px
- 现象：上一轮 R7 把 FAQ 主问句升到 --fs-xl(15px) 并声明「改用标准 --fs-* 不再走 --f-* 短名族」，但同页可点列表行「在线客服/意见反馈/客服邮箱」标题仍留 --f-md(13px)、仍走 --f-* 短名族 ⇒ 迁移半吊子，同为整卡 role=button 的主文字却差一档
- 建议改法：.help-contact__label 字号由 var(--f-md) 改 var(--fs-xl)，与 FAQ 主问句同档同族
- 修复类别：CSS/token

### R9-L07-D08　P2 / 可达性　批次 R9-B49
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`b596819e2d946f4d`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:291`
- 理想图依据：无基准，依据=规范§1.2 次级文字应 4.5:1、§1.1 第3条禁私有色值（回落值 #E8FAF3 实为私值兜底）
- 现象：「复制」小角标文字用 --c-brand-600(#2AAE83) 压在 --c-tint-brand 上，而 --c-tint-brand 全仓无定义 ⇒ 回落兜底 #E8FAF3，实测对比 2.60:1，10px 角标几乎读不出；同缺陷在 security「当前设备」角标复现
- 建议改法：先在 theme 定义 --c-tint-brand 令牌，再把角标文字色由 --c-brand-600 升到 --c-brand-700(#1F8D6A) 或对底改浅档使对比≥4.5
- 修复类别：CSS/token

## subpackages/tools/love-center/index（2 条）

### R9-L07-D05　P2 / 字号　批次 R9-B50
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`5b6a7d59fca2be13`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:300`
- 理想图依据：无基准，依据=规范§1.3「辅助 --fs-lg/xl=14/15px 用于说明」「小字 --fs-md/base=13/12px 用于标签·时间戳」
- 现象：上一轮把说明行从 --fs-xs 提到 --fs-md(26rpx=13px)，但 13px 在 §1.3 属「标签·时间戳」档，卡片说明应落「辅助 14/15px」档，仍差一档、与 15px 主标题层级拉不开
- 建议改法：.love-center__board-desc 字号由 var(--fs-md) 升到 var(--fs-lg)(28rpx=14px)
- 修复类别：CSS/token

### R9-L07-D06　P3 / 间距　批次 R9-B50
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`5b6a7d59fca2be13`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:211`
- 理想图依据：无基准，依据=规范§1.4「区块间距 --section-gap=24rpx=12px」
- 现象：三个区块（快捷入口/恋爱咨询/恋爱测试）的上下外边距用 --sp-5(10px)，比规范区块间距令牌 --section-gap(12px) 小 2px，同域 help/security 卡片走 SectionCard 的 section-gap 档，两页取档不一
- 建议改法：.love-center__section margin 竖向由 var(--sp-5) 改 var(--section-gap)
- 修复类别：CSS/token

## subpackages/tools/love-center/mbti（3 条）

### R9-L08-D09　P3 / 字号　批次 R9-B51
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`25ad39235b9aff45`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:299`
- 理想图依据：无基准，依据=规范文档§1.3（同域工具页绿头标题取档需一致）
- 现象：mbti 绿头标题「MBTI 人格测试」取 `var(--fs-xl)`（30rpx=15px），而同为 tools 域、同为绿头页标题的 activities/detail.vue:481 与 heart-signals index.vue:476 已由 R7-L08-D07 统一到 `--fs-5xl`（44rpx=22px）——同域两页取档不一，mbti 落后一档。
- 建议改法：本页页头标题字号对齐兄弟页 --fs-5xl，或反向把整域工具页头统一到一个档并登记规范。
- 修复类别：单页

### R9-L08-D10　P2 / 可达性　批次 R9-B51
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`28f384cb578d4d54`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:475`
- 理想图依据：无基准，依据=规范文档§1.2（行动色承载白字需成对）+ mbti 提交控件
- 现象：「提交并查看结果」钮底 `var(--c-gradient-brand)`（brand-500→400，:475）、文字 --c-text-inverse 白（:482），白字压渐变约 2.0:1，--fs-xl(15px) 不享大字号豁免。与 D05 同机制，但本页是 4 题示例测验（脚本头注明「本地示例内容」）、提交前还有未答 toast 兜底、钮体量大易辨，业务权重低于活动报名，故降 P2。
- 建议改法：提交钮底色改 --c-brand-800（白字 6.45:1），与全站深档承载白字一致。
- 修复类别：CSS/token

### R9-L08-D11　P2 / 可达性　批次 R9-B51
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`25ad39235b9aff45`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:399`
- 理想图依据：无基准，依据=规范文档§1.2（16 型代码是网格内主要语义色块）+ mbti 网格组件
- 现象：16 型速览格代码（ENFP/INTJ…）`.type-cell__code` 取 `var(--c-brand-700)`（#1F8D6A，:399）压在白卡（--c-bg-container，:392）上实测 4.14:1，字号 --fs-base(12px) 不享大字号豁免，差 4.5:1 一档；顶排 4 枚维度 chip 代码同色压 --c-bg-brand 更降到 3.72:1。
- 建议改法：代码字色改 --c-brand-800（#156B51，压白约 5.2:1）达标，或把该档登记为规范允许的小字号例外。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（2 条）

### R9-L08-D07　P2 / 可达性　批次 R9-B07
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`8ff9d0c4a6c5f215`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:2114`
- 理想图依据：无基准，依据=规范文档§1.2（前景须与所在底成对）+ CardSwiper 组件规范
- 现象：卡片底部「80% 匹配」胶囊底为 romance-400→500 粉渐变（:2099），数值与「匹配」二字均写死 #ffffff（:2114/:2121），白字压粉渐变实测 2.03~2.10:1，字号 --fs-2xl(16px) 不享大字号豁免。R8-B05 只改了三枚动作钮的图标/标签/跳过底色，这颗匹配胶囊未纳入。
- 建议改法：匹配胶囊文字改深墨 --c-text-primary（压 romance 两端 ≥6:1，与刚改过的动作钮标签同口径），或胶囊底压深一档。
- 修复类别：CSS/token

### R9-L08-D08　P2 / 可达性　批次 R9-B52
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`4e81ae57e64c6238`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:353`
- 理想图依据：无基准，依据=规范文档§1.1/§1.2（绿=行动但浅底上不能作前景字色）+ nearby 尾部组件
- 现象：尾部「看看全部推荐」加载更多钮底为 --c-bg-container 白（:347）、文字 `var(--c-brand)`（#36C99A，:353），绿字压白实测 2.11:1，字号 --fs-sm(11px) 远低于 4.5:1。R7-L08-D09/D10 新增此尾部时直接用了 brand-500 作字色。
- 建议改法：该钮文字改 --c-brand-800（#156B51，压白 6.45:1），保留 brand 描边即可。
- 修复类别：CSS/token

## subpackages/tools/search/index（2 条）

### R9-L08-D01　P2 / 位置　批次 R9-B53
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`0613c74027cb0c7c`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:520`
- 理想图依据：无基准，依据=规范文档§1.4（控件间距需留呼吸位）+ search 页头部几何；「取消」为返回行次要操作，须完整落在微信胶囊左侧
- 现象：R8-L08-D01 把头部右内边距从 96px 常量收敛为 `calc(var(--capsule-right,7px)+73px)`=80px，令内容右缘正好贴系统胶囊左缘（x=298），结果「取消」末字「消」右半被胶囊圆角吃掉、读成截断——这是一次修死区修过头（零净空）的新缺陷，非上一轮已销项。
- 建议改法：右内边距常量再留一档呼吸位（如 73px→84~88px），使「取消」止于胶囊左缘前 ≥16rpx，不与胶囊相切。
- 修复类别：单页

### R9-L08-D02　P2 / 可达性　批次 R9-B53
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`0613c74027cb0c7c`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:741`
- 理想图依据：无基准，依据=规范文档§1.1/§1.2（绿=行动档须能承载白字）+ search-tabs 组件规范
- 现象：选中分组「用户」胶囊底取 `var(--c-brand)`（brand-500 #36C99A）、字色 #ffffff（:751），白字压 brand-500 实测 2.11:1，低于正文 4.5:1 亦低于非文本 3:1；bottom 帧与 top 帧同图（该页不滚动），分组切换是本页主路径。
- 建议改法：选中态底色改 --c-brand-800（#156B51，白字 6.45:1）或至少 --c-brand-600 以上深档，与全站「深档承载白字」一致。
- 修复类别：CSS/token

## subpackages/tools/security/index（2 条）

### R9-L07-D09　P2 / 尺寸比例　批次 R9-B54
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`d19a32292a332099`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:981`
- 理想图依据：无基准，依据=徽标为单行状态标签；.sec-item__label-row 为 flex(index.vue:961) 时徽标须 nowrap+不收缩
- 现象：「手机号登录·iPhone 12/13（Pro）」设备名较长，同行 flex 的「当前设备」徽标因缺 white-space:nowrap 与 flex-shrink:0，被挤成两行「当前设 / 备」，胶囊形被打断
- 建议改法：.sec-item__badge 增补 white-space:nowrap; flex-shrink:0（必要时设备名 ellipsis）
- 修复类别：单页

### R9-L07-D10　P2 / 可达性　批次 R9-B54
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`0088a3cb837f736e`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:973`
- 理想图依据：无基准，依据=规范§1.2 危险操作行主文字属可读正文级，应≥4.5:1
- 现象：「危险操作」区主标题「注销账号」用 --c-error(#E5454D) 压在白卡上，实测对比 3.97:1（14px 不享大字号豁免），落在 3:1–4.5:1 之间偏弱
- 建议改法：危险行主标题文字色由 --c-error 升到深档（如 error-700 或叠加 --c-text-primary 语义），使对白底≥4.5:1
- 修复类别：CSS/token

## subpackages/village/village/detail（2 条）

### R9-L03-D03　P2 / 文案　批次 R9-B55
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`ceaa757f2d23d42a`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1410`
- 理想图依据：无基准（帖子.png 为正常详情态）；依据=规范文档§3.13 + 组件规范（未找到态说明行须为可读中文）
- 现象：未找到卡副标题 `t("share.shareVillage")` 在帧上直接吐出裸键「share.shareVillage」——该键实际挂在 `profile` 命名空间（zh-CN.ts:1685 值「校园村口，看看大家在聊什么」），`share.shareVillage` 路径无定义，vue-i18n 回落成键名字符串，正文级出现一串程序键。
- 建议改法：把该行改指一个真实存在的未找到说明键（如 village.detail 下新增/复用一句人话副标题），别再引用跨命名空间的 share.* 键。
- 修复类别：单页

### R9-L03-D04　P3 / 颜色token　批次 R9-B55
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`ceaa757f2d23d42a`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:2930`
- 理想图依据：无基准；依据=组件规范（卡片须与页面底有分层：--card-shadow 或描边）
- 现象：`.notfound-card` 底取 --c-bg-container #ffffff + border-radius 40rpx，但本页 --c-bg-page 被强制为 #FFFFFF（detail.vue:1643）、--c-bg-container 同为 #FFFFFF（:1644），且该卡无 box-shadow/描边——帧测卡区与页面均 #FFFFFF（色差 0），所谓「卡」完全隐形，声明的圆角成无消费者的孤儿样式。
- 建议改法：给 .notfound-card 补 --card-shadow 或 1rpx --c-border 描边（或把卡底改 --c-bg-surface），使容器在纯白页上可见。
- 修复类别：CSS/token

## subpackages/village/village/history（2 条）

### R9-L03-D09　P3 / 圆角　批次 R9-B56
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__history__top.png`（sha16=`05870786a445bddd`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:389`
- 理想图依据：无基准；依据=组件规范（破坏性动作胶囊须与仓内既有同口径）
- 现象：「清空记录」`.history-clear` 圆角 24rpx（:389），注释（:385-386）自称与 campus/index.vue:528、wallet/index.vue:231「同口径」，但实测那两处分别是 --r-lg 20rpx（campus:527）与 16rpx（wallet:230）——同一「破坏性胶囊」跨三页取了 24/20/16 三个档，且 history 与它引用的两页哪个都不一致。
- 建议改法：三页破坏性胶囊圆角统一取一档（建议 --r-full 真做成胶囊，或统一 --r-lg 20rpx），并修正 history 注释里对不上的「同口径」引用。
- 修复类别：CSS/token

### R9-L03-D10　P3 / 颜色token　批次 R9-B56
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`d5a06a540468c9ac`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:374`
- 理想图依据：无基准；依据=规范文档§1.1 原则1（主题底色统一浅绿，页面间不得出现白/灰断层）
- 现象：顶部工具栏 `.history-toolbar` 底取 --c-bg-container（白）且为通栏无侧缩无圆角（:368-375，帧测 y150 白带从 x=1 铺到 x=377），夹在浅绿页头（#EEF7F2）与浅绿列表（#EEF7F2）之间形成一条满宽白带；而本页所有记录卡都是 32rpx 侧缩 + 40rpx 圆角的白卡——工具栏破坏了卡片的侧缩节奏并造成白断层。
- 建议改法：工具栏底改随页底（透明/浅绿）或做成与记录卡同档的侧缩圆角白卡，避免通栏白带断层。
- 修复类别：CSS/token

## subpackages/village/village/index（4 条）

### R9-L02-D21　P1 / 可达性　批次 R9-B05
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__index__top.png`（sha16=`46fc616f48c95b39`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:662`
- 理想图依据：无基准页，依据=组件规范 LockScreen.vue 自身裁定链（:746-754、:778-790 两次按 4.5:1 抬档）+ 全站设计规范 §1.2 色板
- 现象：「当前完善度 30%」整行取 --c-brand #36C99A 压 --c-gradient-page 浅绿底（≈#EEF7F2），相对亮度 0.4542 vs 0.9131 ⇒ 实测对比 1.91:1，--fs-base(24rpx) 不享大字号豁免，远低于 4.5:1；帧上该行明显比上下两行淡一档。同组件已两次按同一算法把相邻两行升到 --c-text-secondary（7.37:1），唯独漏掉本行。用户拿不到自己当前完善度数值这一决策依据。
- 建议改法：与 :753/:789 同档升 --c-text-secondary，或数字用 --c-brand-800。
- 修复类别：CSS/token

### R9-L02-D22　P2 / 颜色token　批次 R9-B05
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__index__top.png`（sha16=`46fc616f48c95b39`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:717`
- 理想图依据：无基准页，依据=全站主 CTA 取档一致性（附近页发动态 :1067、附近动态去登录 :1579、个人页去完善均为 --c-brand #36C99A）
- 现象：主出口「立即完善」钮面为 --c-brand-800（#156B51，帧实测深林绿实心大胶囊），与全站其余三枚同角色主 CTA 的 #36C99A 差两档 ⇒ 同一「主按钮」语义两种颜色。该深档是 :703-712 为白字对比做的正当选择，但只修了组件、没同步回页面，导致「正确的那一档」反而是少数。
- 建议改法：把 nearby :1067 / :1579 / profile 去完善一并升 --c-brand-800，全站单一主按钮档。
- 修复类别：CSS/token

### R9-L02-D23　P1 / 层级遮挡　批次 R9-B05
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`74e6232829082c4c`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:339`
- 理想图依据：无基准页，依据=逐页说明该页应有村庄正文（集市/帖子流）+ 组件规范 LockScreen 模态层口径
- 现象：bottom 帧与 top 帧内容逐块相同（仅状态栏时间 4:37 与 sha 变化，261101B→261131B）：.lock-screen 是 position:fixed + inset:0 + overflow:hidden 的满视口模态层，页面级滚动不产生任何位移 ⇒ 两帧内村庄页正文 0 可见，滚动验收退化为同一张图。因有「×」与「先逛逛公开内容」两个出口，不判 P0；用户拿不到的是本页任何一条村庄内容与其可核验性。
- 建议改法：村庄宿主把门槛降为页内非模态引导卡（或让 __body 承接页面滚动），使 top/bottom 两态能呈现正文。
- 修复类别：单页

### R9-L02-D24　P2 / 文案　批次 R9-B05
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`74e6232829082c4c`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:184`
- 理想图依据：无基准页，依据=组件规范：出口文案须与落点一致（:8 自述「保留游客浏览路径」）
- 现象：「先逛逛公开内容」的实现是切到公开 Tab（匹配推荐页），不是留在本页看村庄公开内容；帧上该链接是模态层内唯一的非登录出口，用户点它会被送出村庄页 ⇒ 文案承诺（在本页逛逛）与行为相反。
- 建议改法：村庄宿主下改为关闭遮罩进入本页公开态；若保持 switchTab，文案改「去匹配页先逛逛」。
- 修复类别：单页

## subpackages/village/village/post（2 条）

### R9-L03-D05　P2 / 素材缺失　批次 R9-B57
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__post__top.png`（sha16=`35038011c2b19ecb`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1046`
- 理想图依据：无基准；依据=规范文档§5.2（发帖页底部工具栏图标须走工程 lucide SVG）+ §1.1 原则4（禁 emoji/裸字符）
- 现象：底部工具栏五枚里，「话题」「提及」两枚的图标是裸文字字形 `#`（:1046）与 `@`（:1066），而相邻「图片/位置/更多」都是 `<image>` SVG——帧上工具栏第 2、4 位读作一个井号、一个 at 符号，与另三枚矢量图标不成一套。
- 建议改法：按 §5.2 把 # / @ 换成同族 lucide SVG 资源（话题=hash 图标、提及=at 图标），与图片/位置/更多统一走 ICONS 体系。
- 修复类别：需新建目标功能

### R9-L03-D06　P2 / 颜色token　批次 R9-B57
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`7ae242fdc821a4d5`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1591`
- 理想图依据：无基准；依据=组件规范（提示卡须与页面底分层）
- 现象：「发帖小贴士」卡底取 --c-brand-50 #EAF9F3（帧测卡区 y660-690=#E8FAF3），而页面底为 --c-bg-page #EEF7F2（帧测 y710/页边=#EEF7F2），且 .post-tip 无描边/阴影——实测二者对比 1.01:1，提示卡容器几乎与页面融为一体，只剩标题图标与文字浮在页上。
- 建议改法：提示卡补 1rpx --c-brand-100 描边或 --s-card-soft 阴影，或把底改到与 #EEF7F2 拉开一档的浅底，让卡片可辨。
- 修复类别：CSS/token

## subpackages/village/village/publish（5 条）

### R9-L02-D25　P1 / 素材缺失　批次 R9-B58
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`5763384a98343041`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1209`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部一整条五枚工具栏（图片/视频 · 话题 · 位置 · 提及 · 更多，图标+文字+顶部分割线）
- 现象：底部工具栏整块缺席，两帧最后一屏元素都是发帖小贴士卡（帧实测卡底 y≈770 直落 Home Indicator）；样式 .publish-toolbar/.publish-tool* 仍在 :1209-1212，模板无对应 DOM（:8 页面顺序注释仍写「发帖小贴士 → 底部工具栏」，台账 R1-B33/D21 标「有 CSS 无 DOM，不修待裁定」）。用户拿不到发布页的一键插入图片/话题/位置/提及入口。
- 建议改法：按 :1209-1212 既有样式补 DOM（五枚复用页内 chooseImage/topicSheet/openMentionPicker 等现成 handler），或正式裁掉该模块并回写页面顺序注释。
- 修复类别：单页

### R9-L02-D26　P2 / 可达性　批次 R9-B58
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`5763384a98343041`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1145`
- 理想图依据：素材/理想效果图/发布帖子页面.png 四行右列值（已选 0 / 5、北京大学·未名湖校区、圈内成员可见）为可读中灰
- 现象：`.publish-row__meta` 取 --c-text-tertiary #9AA39F 压白底，相对亮度 0.3606 ⇒ 实测对比 2.56:1，24rpx 不享大字号豁免，连 3:1 都不到；帧上「已选 0/5」「位置选择即将开放」「所有人可见」三行右列比左列标签淡一整档，是这些行的唯一信息位。
- 建议改法：升 --c-text-secondary #4A524E（对白底 8.06:1），与同页 :1146 箭头档分开。
- 修复类别：CSS/token

### R9-L02-D27　P2 / 位置　批次 R9-B58
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`5763384a98343041`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:831`
- 理想图依据：素材/理想效果图/发布帖子页面.png 四条功能行右缘同为「值 + ›」且落在同一竖列
- 现象：上一轮为消「一个箭头 + 三行裸文本」的参差，把四行的 › 全部删除（:832-834 注释自述「本行箭头一并移除」），但「添加话题」是该组唯一真可点行（:827 打开话题弹层、role="button"），三行只读才是问题来源 ⇒ 修正方向取反：削掉可用行的可点线索，四行现在外观完全同构，用户分不清哪行能点。样式 .publish-row__arrow(:1146) 已无 DOM 消费者。
- 建议改法：恢复交互行的 ›（同右列同竖列），三行只读行改用 --c-text-quaternary 弱化标签色以示不可点。
- 修复类别：单页

### R9-L02-D28　P2 / 文案　批次 R9-B58
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`0111aacf2022965c`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:798`
- 理想图依据：素材/理想效果图/发布帖子页面.png 计数位「0/1000」
- 现象：计数上限实为 500（帧实测「12/500」），比理想图少一半 ⇒ 501-1000 字的长文在本页发不出去，:maxlength(:790) 与计数串同源。:21-22 记的是「与 store MAX_CONTENT_LENGTH 同源」，即把 UI 收敛到后端旧限，理想图那条口径未被实现，属可测的能力偏差。
- 建议改法：store 校验与本页上限同步抬到 1000；若后端维持 500，则回写逐页说明并撤掉理想图该读数依据。
- 修复类别：单页

### R9-L02-D29　P3 / 颜色token　批次 R9-B58
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`0111aacf2022965c`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1132`
- 理想图依据：无基准条目，依据=组件规范：对 <image> 节点声明 color 属无效声明（同仓 nearby/index.vue:1056 已按此口径清理）
- 现象：`.publish-image__remove-icon` 对应 :806 的 <image> 节点，却声明 `color: #fff`——图片节点不吃 color，零消费者；且白色应烙在 CLOSE 素材里而非靠 CSS。同页 :1131 的半透明黑底已保证对比，本行属遗留噪声。
- 建议改法：删除 :1132 的 `color: #fff`。
- 修复类别：CSS/token

## subpackages/village/village/tag-posts（2 条）

### R9-L03-D07　P3 / 圆角　批次 R9-B59
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`725704e164bf3844`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:738`
- 理想图依据：无基准；依据=规范文档§1.4（卡片圆角统一 --card-radius 40rpx）
- 现象：同页两档卡圆角——顶部 `.tag-hero`（#运动/共 2 条记录）用 --card-radius 40rpx（:591），下方帖子列表 `.post-card` 却用 --r-xl 24rpx（:738）；帧上首屏 hero 卡与列表卡转角明显不同曲率，同域两卡取档不一。
- 建议改法：列表 `.post-card` 圆角对齐 --card-radius 40rpx（或整页统一取一档），消除同页卡角双标。
- 修复类别：CSS/token

### R9-L03-D08　P3 / 文案　批次 R9-B59
- 帧：`tmp/qa/frames/R9/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`2b11d497e6be9db1`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:500`
- 理想图依据：无基准；依据=组件规范/同域一致性（终止提示全站统一用全角破折号）
- 现象：列表尾「-- 没有更多了 --」用半角连字符 `--`（t village.tagPosts.noMore，zh-CN.ts:2066），而兄弟页同义串用全角破折号「— 没有更多了 —」（zh-CN.ts:1908 noMorePosts、:3850 topicsLoadMoreEnd）——帧底实测为半角两横，标点全半角与他页不一致。
- 建议改法：把 village.tagPosts.noMore 值改为全角破折号「— 没有更多了 —」，与仓内其余终止提示同档。
- 修复类别：单页

## 空帧段（未交代，不算已审）（10 段）

- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`ac224f6208a3bf01`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`1f8ff2414d95d3ef`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`5b6a325d22add24f`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`ea26fa16539f1f30`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`a778d1b79657f0a0`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`dc8d9a0beccaa9c2`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`5965abd5c8c35140`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`42f47fe6aea8ede8`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`32aa057e9674e49b`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审
- `R9-L10` 帧 `tmp/qa/frames/R9/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`32aa057e9674e49b`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审

