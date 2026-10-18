# R1 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=119　涉及页面=12　涉及帧=17　泳道卡=6
- 严重度分布：P2=64　P1=39　P3=14　P0=2
- 轴分布：素材缺失=16　尺寸比例=15　位置=14　文案=13　颜色token=11　可达性=10　需新建=9　间距=8　圆角=8　字号=7　层级遮挡=6　空态文案=2
- 批次归属：119 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/discover/index（8 条）

### R1-L01-D01　P0 / 层级遮挡　批次 R1-B23
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/pages/discover/index.vue:377`
- 理想图依据：寻觅匹配卡片页面.png — 卡片正下方一整行三枚圆形按钮（跳过 / 打个招呼 / 喜欢，「喜欢」为粉色实心大圆），位于卡片与 tabBar 之间
- 现象：帧状态已是 bottom，但画面里卡片下缘（y≈683/866）与 tabBar 上缘（y≈700/866）之间只剩约 17px，MatchActions 三键整行（128rpx 圆钮 + 标签 + 32rpx 上内边距 ≈ 100px 实高）完全不在可视区内，主 CTA 不可见也不可点
- 建议改法：把 .match-page 的 padding-bottom 与 .match-card-area 的 70vh 卡高按 scroll 视口实高反向约束（卡高 = 视口 − 页头 − 配额行 − MatchActions 实高 − tabBar 净空），保证滚到底时三键整行露出
- 修复类别：CSS/token

### R1-L01-D02　P1 / 尺寸比例　批次 R1-B10
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:306`
- 理想图依据：寻觅匹配卡片页面.png — 卡内左下信息块完整落在卡片圆角之内，姓名/学校/距离/标签/签名五行全部在卡片底边以上留有余量
- 现象：卡内信息块被卡片 overflow:hidden 横切——"演示男生A" 下方那一行只露出字的上半截（约裁掉 50% 行高），说明 .match-card__info 的 bottom:0 + padding-bottom:170rpx 预留量与卡高不匹配；需量测：卡高 70vh（400pt 宽屏上 ≈606px）vs scroll 可视区实高（页高 − 页头 − padding-bottom ≈505px）
- 建议改法：信息块改自下向上排版并给 .match-card__info 设 max-height/overflow 可见的截断策略（行数不足时收缩 padding-bottom），不要靠 overflow:hidden 硬裁
- 修复类别：CSS/token

### R1-L01-D03　P1 / 素材缺失　批次 R1-B10
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:97`
- 理想图依据：寻觅匹配卡片页面.png — 卡片左上角浅底粉字「5km」距离胶囊（与右上「在线」胶囊同一水平线）
- 现象：卡片左上角整块空着，距离胶囊未渲染（右上「在线」胶囊正常出现，两角不对称）；distanceText 在 distanceText 为空且非同校时返回空串，v-if 直接不渲染，既不显示「未知距离」也不占位
- 建议改法：距离缺失时给一个兜底胶囊文案（如「附近」）或让该位与「在线」胶囊同宽占位，避免卡片顶部左右失衡
- 修复类别：单页

### R1-L01-D04　P1 / 素材缺失　批次 R1-B10
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:246`
- 理想图依据：寻觅匹配卡片页面.png — 卡片右下角 92% 环形匹配度徽章、姓名下方 4 枚兴趣标签胶囊（旅行/摄影/音乐/电影）、引号条 + 两行个性签名
- 现象：卡面右下无任何圆环徽章（该节点无 v-if、恒渲染，说明其落在可视区外或被卡底裁切），同时 MatchInfo 的 tags/intro 两块在画面上完全缺席，卡内只剩一行姓名，信息密度约为理想图的 1/5
- 建议改法：先修 D02 让信息块整体回到可视区；再核 mock/real 两档 cards[0] 的 tags、headline、matchScore 是否有值，无值时按设计给占位行而非整块消失
- 修复类别：单页

### R1-L01-D05　P2 / 位置　批次 R1-B23
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/pages/discover/index.vue:426`
- 理想图依据：寻觅匹配卡片页面.png — 右上筛选（漏斗）按钮贴屏幕右缘，与「寻觅♥」标题同一水平线右端
- 现象：筛选圆钮中心落在 x≈250/400（约屏宽 62%），距右缘约 150px，视觉上悬在标题行中段而不是贴右对齐；padding-right 用胶囊间隙 7px + 胶囊本体 104px 一把算死，把整行内容整体左推了约 1 个按钮宽
- 建议改法：避让量只用于 .discover-header__filter 自身（margin-right 让出胶囊），不要写在整行的 padding-right 上；标题行保持左右贴边基线
- 修复类别：CSS/token

### R1-L01-D06　P2 / 需新建　批次 R1-B23
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/pages/discover/index.vue:259`
- 理想图依据：寻觅匹配卡片页面.png — 「推荐 / 附近」分段行最右端另有一枚描边心形按钮（喜欢列表入口）
- 现象：.discover-header__tabs 只放了 recommend / nearby 两个 tab，右端整段是空白，理想图的分段行右侧功能位在本页无任何实现与占位
- 建议改法：在 tabs 行尾补一枚描边心形按钮（justify-content: space-between 或 margin-left:auto），入口指向喜欢/匹配列表页
- 修复类别：需新建目标功能

### R1-L01-D07　P2 / 可达性　批次 R1-B23
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/pages/discover/index.vue:486`
- 理想图依据：寻觅匹配卡片页面.png — 未选中态「附近」为可辨识的深灰字，与选中态「推荐」形成层级但不失可读性
- 现象：未选中 tab 文字取 --c-text-tertiary 兜底 #9AA39F，落在白底上实测对比度 ≈2.6:1（36rpx/500 非大字号），低于 WCAG AA 4.5:1，真机上「附近」明显发虚
- 建议改法：未选中态改用 --c-text-secondary（#6B7571 一档，≈4.6:1），层级差靠 font-weight 而不是把颜色压到三级灰
- 修复类别：CSS/token

### R1-L01-D08　P3 / 间距　批次 R1-B23
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__discover__index__bottom.png`（sha16=`16a04e95d6d2fc56`）
- 源码证据：`apps/client/src/pages/discover/index.vue:505`
- 理想图依据：寻觅匹配卡片页面.png — 卡片左缘与「寻觅♥」标题左缘、tab 左缘同一条栅格基线
- 现象：页头左右内边距是 32rpx（:417），卡片区与配额行却各写 40rpx，同一列上下错位 8rpx（≈4px）；需量测：帧上卡片左缘与标题左缘的 x 差值
- 建议改法：两处统一收敛到 var(--page-padding)，页内不再出现 32rpx/40rpx 两套左基线
- 修复类别：CSS/token

## pages/home/index（18 条）

### R1-L01-D09　P1 / 素材缺失　批次 R1-B05
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/HomeHeader.vue:68`
- 理想图依据：首页.png — 页头右上为铃铛图形 + 红色数字角标（设计稿里角标显示 6）
- 现象：页头最右只剩一枚空的白色圆底（有阴影、无内容），铃铛笔画完全未出现；素材文件本身在库内存在（src/static/assets/icons/home/tabbar-top/icon_row1_07.png，8502B），故属运行时路径解析/渲染未出图而非文件缺失；需量测：确认 resolveMediaUrl 在该图标上返回的实际 src
- 建议改法：核 HOME_ICONS.HEADER_BELL 经 resolveMediaUrl 后的落地路径与 STATIC_BASE 前缀是否一致，出图失败时按 CommunityFeed 的做法退到本地占位而非留空圆底
- 修复类别：单页

### R1-L01-D10　P2 / 文案　批次 R1-B05
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/HomeHeader.vue:70`
- 理想图依据：首页.png — 铃铛右上红底白字角标随未读数变化
- 现象：角标有两套来源互斥——组件里 v-if="notifyBadge > 0" 动态渲染，而图标素材 icon_row1_07.png 把红底「6」直接烘焙进了 PNG 像素；真机上动态值为 0 时角标消失（本帧即无角标），一旦出图又会出现素材自带的假 6
- 建议改法：换一张不带角标的纯铃铛素材，数字只由 notifyBadge 单点驱动
- 修复类别：需新建目标功能

### R1-L01-D11　P2 / 圆角　批次 R1-B05
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/HomeHeader.vue:135`
- 理想图依据：首页.png — 页头右侧「● 北京大学 · 3km」是绿色 pin + 裸文字，无容器底、无投影
- 现象：真机把定位区套进一枚 999rpx 全圆角白底胶囊并加 0 4rpx 16rpx 阴影，页头右侧因此出现「圆底头像 + 白胶囊 + 白圆底」三块同尺寸圆形/胶囊底，层级比理想图多一层容器
- 建议改法：去掉 .header-location 的 border-radius/background/box-shadow，保留 pin + 文字，与理想图同级
- 修复类别：CSS/token

### R1-L01-D12　P1 / 颜色token　批次 R1-B09
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:219`
- 理想图依据：首页.png / 寻觅匹配卡片页面.png — 「在线」标记为白（半透白）底 + 绿点 + 绿字
- 现象：首页今日推荐卡的在线徽章是实底 #36C99A + 白字，与理想图配色反转；同仓 MatchCard.vue:222 已按理想图改成白底绿字并写明「原为绿底白字，配色反转」，本页未同步，两页同一语义元素两种配色；且 #36C99A 为裸写值未取 --c-brand
- 建议改法：与 MatchCard 在线胶囊统一为 var(--c-overlay-bg-solid) 底 + var(--c-brand) 字 + 绿点
- 修复类别：CSS/token

### R1-L01-D13　P1 / 素材缺失　批次 R1-B09
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:98`
- 理想图依据：首页.png — 今日推荐卡右栏自上而下 6 段：姓名 / 「22岁·北京大学·本科」/ 4 枚兴趣标签 / 两行签名 / 「1.2km·已认证·双子座」/ 4 张相册缩略图，最后才是两枚按钮
- 现象：真机右栏只有姓名「校园小助手」和最下方两枚按钮，中间整段空白（约占卡高 55%）；meta / tags / bio / expect / distanceLine 五项因数据为空被 v-if 摘掉或渲染成空 text，且理想图的 4 图相册条在本组件根本没有对应节点
- 建议改法：空值时按设计给降级行（如「暂无简介」占位）而非整块塌陷；相册缩略图行需新建节点，数据取 item.photos
- 修复类别：单页

### R1-L01-D14　P2 / 字号　批次 R1-B09
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:262`
- 理想图依据：首页.png — 照片右下「92% 合拍度」实心粉圆内两行字，数字明显大于标签且可读
- 现象：合拍度圆内「65%」为 22rpx（11px）、「合拍度」为 18rpx（9px），徽章外径仅 112rpx（56px）；理想图同徽章直径约为照片短边的 1/3 且数字约 30rpx，真机两行字在 56px 圆内挤成一团
- 建议改法：徽章放大到 140rpx 并把数字/标签提到 32rpx / 22rpx，与 MatchCard .match-card__score-ring（160rpx / 40rpx / 22rpx）同档
- 修复类别：CSS/token

### R1-L01-D15　P1 / 字号　批次 R1-B08
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:237`
- 理想图依据：首页.png — 今日恋爱进度四格每格只有图标 + 标题 + 状态两行文字，标题约 28-30rpx 清晰可读
- 现象：四格文字被折成中文断词三行——「让更多人了解/你」「回复一条悄悄/话」「参与一个兴趣/要」「关系更近/一步」，标题 22rpx（11px）+ 描述 18rpx（9px）叠加 word-break: break-all，字形在真机上已糊到难以辨认
- 建议改法：去掉 break-all（中文按词换行即可），标题回到 26-28rpx，描述 20rpx 且只保留一行
- 修复类别：CSS/token

### R1-L01-D16　P2 / 尺寸比例　批次 R1-B08
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:173`
- 理想图依据：首页.png — 四格等分后单格约 200rpx 宽、内部只两行文字，格与格之间留 16rpx 缝
- 现象：.love-step flex:1 + min-width:0 在 32rpx 卡内边距 + 16rpx 格间距下把单格压到约 145rpx 宽，六字标题必然折行；同时 .love-step overflow:visible 与 .love-step__desc 的 -webkit-line-clamp:2 相互抵消，第三行描述顶到格子内边距外沿
- 建议改法：四格改 2×2 栅格或横向 scroll-view 固定单格 min-width 200rpx，让标题单行放得下
- 修复类别：CSS/token

### R1-L01-D17　P2 / 颜色token　批次 R1-B08
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__top.png`（sha16=`ff52a99cfae8567f`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:156`
- 理想图依据：首页.png — 「今日恋爱进度」进度条轨道为浅绿底（品牌 50 档）+ 绿色渐变填充，轨道全程可见
- 现象：轨道底色裸写 #EEF2F0（近白），落在白色卡面上几乎看不出轨道边界，真机上只见一截绿色短条悬在空白里；同组件另有 #333A37 / #36C99A / #9AA39F / #F0F2F5 / linear-gradient(#36C99A→#55D5A7) 共 6 处裸写值，未走 --c-brand-50 / --c-brand / --c-text-* / --c-gradient-* token
- 建议改法：轨道改 var(--c-brand-50, #E8FAF3)，填充与计数色统一取 --c-brand / --c-brand-400，文本色收敛到 --c-text-* 档位
- 修复类别：CSS/token

### R1-L01-D18　P1 / 层级遮挡　批次 R1-B24
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/pages/home/index.vue:522`
- 理想图依据：首页.png — 各分区标题（关系动态 / 兴趣推荐 / 附近的人 / 社区动态）在任何滚动位置都完整可读，不被顶部元素吃掉
- 现象：分区标题「附近的人」在帧顶只露出字的下半截，上半被一层固定遮罩抹平成页面底色——.home-page__top-scrim 为 position:fixed / top:0 / z-index:9 / 高 statusBar+28px，且滚动态 opacity 恒为 1，前 82% 是不透明 #EEF7F2，正好压在标题行上
- 建议改法：遮罩高度收到 statusBar 以内（不侵入内容区），或给页面加与遮罩等高的顶部 padding，让滚到顶的标题落在遮罩下沿之外
- 修复类别：CSS/token

### R1-L01-D19　P1 / 素材缺失　批次 R1-B04
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:229`
- 理想图依据：首页.png — 社区动态每条帖子底部是 3 张并排小缩略图（约 88rpx 方格），图下方才是点赞/评论/分享
- 现象：两张帖子卡内各有一块约 220rpx 见方的纯灰占位块（无图、无图注、无加载态），是图片加载失败后的兜底色；理想图为 3 图并排，真机只有 1 格且是灰块，卡片下半部几乎全被它占住
- 建议改法：mock/real 两档都要保证 post.images 有可解析的包内路径；失败兜底换成带图标的空态图而非纯灰块，并把单图格尺寸限到与三图格同档
- 修复类别：单页

### R1-L01-D20　P2 / 素材缺失　批次 R1-B04
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:247`
- 理想图依据：首页.png — 帖子底部为「♡ 128 · 💬 24 · 分享」三组带图标带文字的计数
- 现象：真机底部只剩两组裸数字「3  3」「2  8」，三枚图标（TB_LIKE / TB_COMMENT / TB_SHARE）均未出图，分享位整组不可见，用户无法区分哪个是点赞哪个是评论；素材 PNG 在库内存在（toolbar_row7_01/02/03.png），属解析未出图
- 建议改法：与 D09 同一根因一并排查 resolveMediaUrl 前缀；图标缺位时补文字标签（赞/评/转）兜底语义
- 修复类别：单页

### R1-L01-D21　P1 / 可达性　批次 R1-B07
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/components/home/NearbyPeople.vue:241`
- 理想图依据：首页.png — 「附近还有 32 位值得认识的人」绿色文字压在同色系浅绿条上，但字重与色深足以阅读
- 现象：条内文字 #36C99A 压在 #E8FBF2 底上，按 WCAG 相对亮度算对比度 ≈2.0:1（22rpx/600 非大字号），真机上该行文字明显发灰、几乎与底色融在一起；箭头 › 同色同问题
- 建议改法：文字改 --c-brand-700 或 --c-text-primary 档（≥4.5:1），浅绿底只作背景不承担文字对比
- 修复类别：CSS/token

### R1-L01-D22　P2 / 文案　批次 R1-B07
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/components/home/NearbyPeople.vue:84`
- 理想图依据：首页.png — 附近的人行尾卡文案「附近还有 32 位值得认识的人」（尚未展示的余量）
- 现象：真机写的是「附近有 {{ items.length }} 位值得认识的人」，而上方横排恰好已把这 items.length 个人全部列出（帧上 5 个头像 + 「附近有 5 位」），文案变成把已见内容重述一遍，既不给余量也不给行动理由
- 建议改法：改为「附近还有 N 位」并用 total - items.length 的余量口径，无余量时隐藏该行
- 修复类别：单页

### R1-L01-D23　P2 / 文案　批次 R1-B04
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:199`
- 理想图依据：首页.png — 帖子作者行下方为相对时间「15 分钟前 / 1 小时前 / 2 小时前」，作者名右侧是「★ 北京大学」校区徽章
- 现象：真机时间显示绝对日期「2026-09-09」，与理想图的相对时间口径不一致；且作者名后跟的是「· 活动」「· 兴趣圈」纯文字圈名，没有理想图那枚带星形的校区徽章，两行信息量都低于设计
- 建议改法：timeText 走相对时间格式化（分钟/小时/天前），校区徽章按 profile.school 补 star + 校名胶囊，圈名移到正文上方单独一行
- 修复类别：单页

### R1-L01-D24　P1 / 素材缺失　批次 R1-B06
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/components/home/InviteBanner.vue:17`
- 理想图依据：首页.png — 邀请 banner 左侧是一枚礼物盒插画，右侧文字与「去邀请」之间还有一张带翅膀的粉色爱心插画
- 现象：banner 左侧只剩一块 64rpx 纯粉渐变圆角方块，礼物图形不见——gift.svg 用 stroke="currentColor" fill="none"，作为 <image> 资源时 CSS color 注入不进去（同仓 discover/index.vue:446 已记过这条教训：CSS color 对图片资源不生效），:60-66 的 color:#ffffff 是死规则
- 建议改法：把 gift.svg 的 stroke 烘焙成白色字面值（或改走 mask/内联 SVG），使图标在粉底上可见；同理排查其它 stroke="currentColor" 素材
- 修复类别：需新建目标功能

### R1-L01-D25　P2 / 间距　批次 R1-B24
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/pages/home/index.vue:537`
- 理想图依据：首页.png — 邀请 banner 之后直接接 tabBar，页面末尾无空白段
- 现象：banner 下方到 tabBar 之间是一整块约 185px 的空白（帧上 y≈560→745），.home-section-gap 取 300rpx + safe ≈184px，而 custom-tab-bar 实高为 160rpx + 24rpx + safe ≈116px，净空多撑了约 68px，滚到底时页面尾巴是一段死白
- 建议改法：净空收到与 tabBar 实高一致（复用 --tab-bar-total-h），不要另立 300rpx 一档
- 修复类别：CSS/token

### R1-L01-D26　P3 / 层级遮挡　批次 R1-B06
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__home__index__bottom.png`（sha16=`93c3de5f1fdcb833`）
- 源码证据：`apps/client/src/components/home/InviteBanner.vue:104`
- 理想图依据：首页.png — 飞心装饰位于「邀请好友…」文字与「去邀请」按钮之间的空隙，完整可见
- 现象：装饰 wing 定在 right:-16rpx / bottom:-16rpx 且 z-index:0，一半被 .invite-banner 的 overflow:hidden 裁掉、另一半压在「去邀请」按钮（z-index:1）之下，真机上该插画完全看不见；且它取的是 HEART_FILLED 实心粉心，并非理想图的带翅膀心形
- 建议改法：移到 flex 流内（放在 body 与 btn 之间，right/bottom 归零），并换成带翅膀的专用素材
- 修复类别：单页

## pages/messages/index（9 条）

### R1-L02-D10　P1 / 素材缺失　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:505`
- 理想图依据：消息.png — 「正在升温」为 4 枚带绿色描边环的大圆头像，每枚右下角一枚绿色心形角标，名字在头像正下方
- 现象：帧上「正在升温」两列只剩芽苗角标和「小新生/小满」两行名字，100rpx 圆头像与 4rpx 绿描边环整体不可见（头像圆是空白的）；同页最近聊天行有 @error→DEFAULT_AVATAR 兜底（:537），升温行没有，坏链直接留空
- 建议改法：warm-item__avatar 补 @error 兜底切 DEFAULT_AVATAR，并给 avatar-wrap 加浅绿底避免空块
- 修复类别：单页

### R1-L02-D11　P2 / 尺寸比例　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:982`
- 理想图依据：消息.png — 「正在升温」头像直径明显大于「最近聊天」列表头像，整行高度约占一屏 12%
- 现象：帧上「正在升温」标题到名字的行内距离只有角标大小的一截，与 CSS 规定的 100rpx 头像 + 12rpx 间距（≈54px + 6px）不成比例，头像盒疑似塌陷为 0 高；需量测：.warm-item__avatar-wrap 在真机的渲染高度是否等于 100rpx
- 建议改法：量测后若确为塌陷，给 wrap 补 min-width/min-height 与 flex-shrink:0
- 修复类别：单页

### R1-L02-D12　P1 / 间距　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:636`
- 理想图依据：消息.png — 列表最后一条会话完整露出并停在 tabBar 上沿之上，未被裁切
- 现象：底部避让写死 calc(112rpx + safe + 16rpx)=128rpx，而同一文件 :634 注释自证自定义 tabBar 实高 160rpx+safe，滚到底最后一张卡仍被 tabBar 切掉只剩标题一截（帧底「有人喜欢你」卡），差额约 32rpx
- 建议改法：把 112rpx 抬到与 tabBar 实高一致（160rpx）或改读同一常量，勿两处各写一份
- 修复类别：CSS/token

### R1-L02-D13　P1 / 文案　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:595`
- 理想图依据：消息.png — 「活动推荐」区在理想图不存在；若保留，卡内文案应为活动（标题+时间地点+报名入口）
- 现象：帧底活动推荐第 3 张卡标题是「有人喜欢你」，既无「周日 10:00-12:00 · 校体育馆」式副标题也无「查看详情」出口——它是一条通知被当作活动渲染进列表，文案语义与所在分区互相矛盾
- 建议改法：对 dashboard.assistant 下发项按 type 过滤，非 activity 项不进取活动推荐分区
- 修复类别：单页

### R1-L02-D14　P2 / 需新建　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1045`
- 理想图依据：消息.png — 卡内图形位（如「有人喜欢你」卡的绿色心形芽苗吉祥物）始终有内容，无纯色空块
- 现象：act.icon 缺失时走 .activity-rec-card__icon--placeholder，只有一块 96rpx 纯色浅绿方块、零图形零字形（帧底那张卡的左侧即为此），与上方两张有篮球/摩托实图的卡形成明显缺件
- 建议改法：占位分支补一枚默认图标（IMAGE_PATHS.ICONS_EMOJI.FIRE），别留空色块
- 修复类别：需新建目标功能

### R1-L02-D15　P2 / 位置　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:438`
- 理想图依据：消息.png — 页头正下方并排两枚汇总卡「有人喜欢你 / 正在等待回复」，各带「去看看」「去回复」，属首屏第一层
- 现象：「正在等待回复」卡带 v-if="waitingReplyCount > 0"，计数为 0 时整块消失、两列栅格塌成一枚孤卡；帧上这两枚汇总卡一枚都不在首屏可见位（顶部只剩寻觅助手卡残角），而「有人喜欢你」出现在滚到底的位置，层级顺序与设计稿相反
- 建议改法：两枚卡常驻（0 值走灰态文案「暂无新喜欢」），把汇总卡钉在 header 之下首屏内
- 修复类别：单页

### R1-L02-D16　P2 / 颜色token　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:631`
- 理想图依据：消息.png — 页面为纯白底板，白卡靠描边分层（该色值应由令牌承载而非字面量）
- 现象：页面根容器底色写成字面量 `background: #FFFFFF`，同文件 header(:661) 用的是 var(--c-bg-container, #FFFFFF)，顶部遮罩渐变(:646) 亦写死 #FFFFFF/rgba(255,255,255,0)——暗色档下这三处不跟随令牌，页面底板会与卡片色脱节
- 建议改法：三处字面量统一替换为 var(--c-bg-container) / 配套渐变令牌
- 修复类别：CSS/token

### R1-L02-D17　P3 / 圆角　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1030`
- 理想图依据：消息.png — 汇总卡/助手卡/活动卡圆角同档（约 --r-lg 20rpx 视觉档）
- 现象：活动推荐卡圆角写死 24rpx、内部图标写死 16rpx，均为字面量而非 --r-* 档位（项目档位 --r-lg=16/--r-xl=24，见 styles/tokens.scss:96-97），同页其它卡片走令牌，档位一旦调整该卡不跟随
- 建议改法：24rpx→var(--r-xl)、16rpx→var(--r-lg)
- 修复类别：CSS/token

### R1-L02-D18　P2 / 可达性　批次 R1-B25
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__messages__index__bottom.png`（sha16=`ed5d4e92c63ac395`）
- 源码证据：`apps/client/src/pages/messages/index.vue:494`
- 理想图依据：消息.png — 「正在升温」右侧「更多 ›」为可点行动入口
- 现象：「更多 ›」是裸 `<text>` 直接挂 @tap，无 role="button"、无 aria-label、无 hover-class，读屏与点击热区（仅文字宽）都不可达；帧上它是该分区唯一行动出口
- 建议改法：外层包 view 补 role="button" + :aria-label + hover-class，与同页 quick-card 的按钮写法对齐
- 修复类别：单页

## pages/nearby/index（9 条）

### R1-L02-D01　P1 / 素材缺失　批次 R1-B21
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:191`
- 理想图依据：附近的首页.png — 底部「附近动态」卡正文下方为满宽 3 格日落/楼阁实景照片网格
- 现象：帧内两条帖子（夜北/沈亦舟）的配图区都是 1 个无任何内容的浅灰圆角方块（resolveMediaUrl 出的图 100% 没渲染出来），一屏 2/2 帖子零配图，理想图同一位置是铺满卡宽的真实照片
- 建议改法：给 .post-media-grid__img 补 @error 兜底（换 POST_PLACEHOLDER 图形而非空格子），并修 real 档 images[] 里空串/坏链的映射
- 修复类别：单页

### R1-L02-D02　P1 / 层级遮挡　批次 R1-B26
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:399`
- 理想图依据：附近的首页.png — 右上「发动态」绿色胶囊独占顶栏带，动态卡「关注」按钮在卡片右上角无遮挡
- 现象：首帖（夜北）作者行右侧的「关注」芯片在帧上完全看不见，而第二帖有——该芯片在组件里是无条件渲染的，说明它被固定在右上区的系统胶囊（⋯◉）压在下面；页头写在 scroll-view 内部，滚到底时页头让位、feed 卡片直接顶进胶囊带
- 建议改法：把 nearby-home__header 提到 scroll-view 外做常驻顶栏（或给滚动容器加与胶囊等高的 padding-top 占位）
- 修复类别：单页

### R1-L02-D03　P2 / 尺寸比例　批次 R1-B02
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/theme/global.scss:279`
- 理想图依据：附近的首页.png — 「附近动态」配图横向铺满卡片内宽（3 格等分），卡内无成块空白
- 现象：单图帖的配图格被定成两列网格的一格，实测约占卡片内宽 48%，右半 52% 宽度整块留白（帧上两块灰格右侧都是空），视觉上像版式没排完
- 建议改法：单图分支改 width:100% + 固定高（或 4:3 横幅），仅 ≥2 图时才用半宽格
- 修复类别：CSS/token

### R1-L02-D04　P2 / 颜色token　批次 R1-B26
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:676`
- 理想图依据：附近的首页.png — 页面底板为中性浅灰白，白色卡片靠描边/阴影分层
- 现象：附近页底板走 var(--c-bg-page) 且回退值是 #EEF7F2 薄荷绿，而同项目 messages/index.vue:624 的注释把「发现/附近/消息白底」写成 v3.1 契约，帧上页面底色偏绿、与白卡几乎同明度，卡片描边成了唯一分层手段；需量测：--c-bg-page 运行时实际值与理想图灰阶差
- 建议改法：三页统一口径——要么附近页改用 --c-bg-container 白底，要么改契约注释，别两页互指对方违规
- 修复类别：CSS/token

### R1-L02-D05　P2 / 需新建　批次 R1-B21
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:151`
- 理想图依据：附近的首页.png — 「小满」名字右侧为绿色描边认证胶囊「🛡 北京大学」，与「9分钟前 · 3km」同行
- 现象：帧上两条帖子的校名（武汉大学/复旦大学）只是第三行灰色纯文本，名字行右侧零胶囊；校友徽章只在 isAlumni 为真时才出，非本校作者在真机上没有任何认证标识形态
- 建议改法：作者名行新增常显校名胶囊（本校绿描边/外校中性描边），把 headline 行的校名收进胶囊
- 修复类别：需新建目标功能

### R1-L02-D06　P2 / 需新建　批次 R1-B26
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:668`
- 理想图依据：附近的首页.png — 右下角 tabBar 之上悬浮一枚绿色圆形「+」发帖按钮（压在「附近动态」卡右缘）
- 现象：全页 grep 无 fab/悬浮按钮，滚动到底后画面里没有任何发帖入口（唯一入口「发动态」在页头，已随 scroll-view 滚走），理想图的常驻发帖位缺失
- 建议改法：在 scroll-view 之外补一枚 fixed「+」FAB，复用 goToPublishPost
- 修复类别：需新建目标功能

### R1-L02-D07　P1 / 需新建　批次 R1-B21
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:281`
- 理想图依据：附近的首页.png — 卡片底部互动栏为「♡ 128 / 💬 24」两个有数字、可反馈的行动点
- 现象：帧上互动栏第 3 枚图标（分享）是可见可点的按钮，但 @tap 绑的是 PostCard.vue:67 的 `function noop() {}`，点下去恒无响应，是画面上最典型的死按钮
- 建议改法：接 open-detail 的分享面板（或先隐藏该枚图标），别留空 handler
- 修复类别：需新建目标功能

### R1-L02-D08　P2 / 可达性　批次 R1-B21
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:267`
- 理想图依据：附近的首页.png — 互动栏心形/评论均带数值，读屏可播报「点赞 128」
- 现象：互动栏 4 枚按钮（评论/点赞/分享/收藏）都是裸 `<view class="action-btn">`，无 role="button"、无 aria-label，且计数走 `v-if="post.likes > 0"`——帧上心形就是零文字零标签的裸图标，读屏播报为空
- 建议改法：4 枚补 role="button" + aria-label（含计数为 0 时播报「点赞」），与同页 nearby/index.vue:406 已有写法对齐
- 修复类别：单页

### R1-L02-D09　P3 / 间距　批次 R1-B21
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__nearby__index__bottom.png`（sha16=`8ecef3e7d1e5c60e`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:500`
- 理想图依据：附近的首页.png — 动态卡内正文/配图/互动栏的纵向节奏等距
- 现象：同一张卡内正文/配图/活动/标签四段块间距都是 var(--sp-4)，唯独评论预览块用 var(--sp-3)，帧上「#电竞」胶囊到灰色评论块的距离明显比上面几段紧一档
- 建议改法：.post-card__comments 的 margin-top 统一改 var(--sp-4)
- 修复类别：CSS/token

## pages/profile/index（14 条）

### R1-L03-D01　P2 / 字号　批次 R1-B13
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:228`
- 理想图依据：已经填完资料的个人主页.png｜页头「星野」昵称与右侧「在线」胶囊同行，昵称字高约为头像直径的 1/3.5
- 现象：昵称字号写死 52rpx（26pt），比理想图昵称档（约 40rpx）大一档；真机昵称「曦风QA链」在 52rpx 下已占满信息列宽
- 建议改法：降到 var(--fs-xl, 40rpx) 档并给昵称加 max-width + ellipsis，把宽度让给同行徽章
- 修复类别：CSS/token

### R1-L03-D02　P2 / 位置　批次 R1-B13
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:220`
- 理想图依据：已经填完资料的个人主页.png｜「在线」绿色胶囊紧跟在昵称右侧同一基线（昵称 ▸ 性别  在线 一行排完）
- 现象：name-row 为 flex-wrap:wrap，真机上「在线」胶囊被换行甩到昵称正下方第二行（帧内 y≈137），理想图它与昵称同行；第二行又被简介文案顶掉，页头比理想图多占一行高
- 建议改法：昵称先省略号截断，胶囊设 flex-shrink:0 并改 nowrap，保证同行
- 修复类别：单页

### R1-L03-D03　P2 / 位置　批次 R1-B13
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:274`
- 理想图依据：已经填完资料的个人主页.png｜「编辑资料」白胶囊位于信息块下半部（与「2.3km·在线」/简介行同带），右缘贴页边距
- 现象：.my-header__right 只有 padding-top:20rpx 且 content 为 align-items:flex-start，真机「编辑资料」被顶到页头最上一行（帧内 y≈108，紧贴右上图标行下方），与理想图的下沉位置差约一整行
- 建议改法：右列改 align-self:flex-end（或 margin-top:auto），把按钮压到与简介行对齐
- 修复类别：CSS/token

### R1-L03-D04　P2 / 尺寸比例　批次 R1-B13
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:151`
- 理想图依据：已经填完资料的个人主页.png｜头像直径约占屏宽 18%，昵称列与右侧按钮瓜分剩余宽度
- 现象：头像 180rpx（含 6rpx 白描边后≈192rpx，占屏 25.6%），比理想图约 139rpx 大一档；头像吃掉宽度是 D02 昵称换行的共因。需量测：以理想图头像/屏宽比例换算目标值后回填
- 建议改法：收敛到 var(--sp-*) 体系内的 144rpx 档并同步缩 border
- 修复类别：CSS/token

### R1-L03-D05　P3 / 圆角　批次 R1-B13
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:93`
- 理想图依据：已经填完资料的个人主页.png｜页头薄荷绿向下自然渐变到页面底色，无独立卡片轮廓
- 现象：页头被 border-radius:0 0 40rpx 40rpx 切成一块圆角卡（帧内 y≈360 处可见两道圆角收口与色差硬边），理想图该处是连续渐变背景，无「页头卡」轮廓
- 建议改法：去掉页头下缘圆角，改为整页顶部渐变底（或把圆角并入页面背景层）
- 修复类别：CSS/token

### R1-L03-D06　P2 / 位置　批次 R1-B12
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:15`
- 理想图依据：已经填完资料的个人主页.png｜资料完整度卡内为「标题独占一行 → 进度条 + 85% + 去完善按钮同一行 → 提示文案在下方」
- 现象：真机把百分比放进标题行右端（帧内 y≈230），进度条独占一行，「去完善」按钮落到第三行与提示文案同行；理想图的百分比是贴在进度条右端、按钮与进度条同行
- 建议改法：按理想图重排为 bar-row（bar+percent+btn）+ tip-row 两段结构
- 修复类别：单页

### R1-L03-D07　P2 / 颜色token　批次 R1-B12
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:57`
- 理想图依据：已经填完资料的个人主页.png｜完整度百分比为中性深色文字，进度条与按钮取品牌绿
- 现象：该组件 6 个色值全部硬编码（#36C99A/#333A37/#E8FBF3/#9AA39F/#ffffff），无一处 var(--c-*)；且百分比用品牌绿，理想图为中性深色，导致「30%」在浅绿卡上抢视觉焦点
- 建议改法：换成 var(--c-brand)/var(--c-text-primary)/var(--c-text-tertiary)，百分比颜色回退到 text-primary
- 修复类别：CSS/token

### R1-L03-D08　P3 / 字号　批次 R1-B12
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:83`
- 理想图依据：已经填完资料的个人主页.png｜「完善资料可以获得更多曝光和匹配机会」与「去完善」按钮文字处于同一可读档位（约 24rpx/28rpx）
- 现象：提示文案 20rpx（10pt）、按钮文字 22rpx，均低于理想图档位；真机上该两行明显比卡内标题小两号，接近不可读
- 建议改法：提示文案提到 var(--fs-sm, 24rpx)，按钮文字提到 28rpx 并同步加大按钮 padding
- 修复类别：CSS/token

### R1-L03-D09　P2 / 可达性　批次 R1-B12
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyCompletion.vue:12`
- 理想图依据：已经填完资料的个人主页.png｜完整度卡只有「去完善」一个明确动作入口
- 现象：根 view 整卡挂 @tap + hover-class 却无 role="button"/aria-label（同仓其余可点节点均补齐），内部又嵌一个「去完善」可点区，形成嵌套点击目标与无障碍名的读屏黑洞
- 建议改法：外层补 role="button" aria-label，或去掉外层 @tap 只保留按钮
- 修复类别：单页

### R1-L03-D10　P2 / 尺寸比例　批次 R1-B14
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyStory.vue:267`
- 理想图依据：已经填完资料的个人主页.png｜我的故事行为「3 张封面卡 + 1 张添加故事虚线卡」四格同尺寸横排，单格约占内容行宽 1/4
- 现象：添加故事卡 208×264rpx 竖版单卡，占行宽 27.7%（理想图单格约 25% 但为四格并排）；真机 0 故事时整行只有左侧一格、右侧约 2/3 宽度全空。需量测：目标宽度应取 (750rpx − 2×页边距 − 3×间距)/4
- 建议改法：故事卡/添加卡统一按四等分栅格给宽，空态下让添加卡占满行宽或补空态引导
- 修复类别：CSS/token

### R1-L03-D11　P3 / 位置　批次 R1-B14
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/profile/mine/MyStory.vue:183`
- 理想图依据：已经填完资料的个人主页.png｜「我的故事」小标题在白色故事卡片内部左上角，与卡片同呼吸
- 现象：标题是 .story-cards 的兄弟节点（margin-bottom var(--sp-4)），而 .story-cards 自身无背景/内边距/圆角（:192 只有 margin-bottom），真机上「我的故事」是一行裸文本落在页面底色上、下面直接跟一张虚线卡；理想图该标题在白色故事卡内部左上角，与四格同属一张卡
- 建议改法：给故事区补一张白卡容器并把标题收进卡内，或统一全站「区块标题在卡外」口径并给出间距依据
- 修复类别：单页

### R1-L03-D25　P1 / 尺寸比例　批次 R1-B01
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/theme/design-variables.scss:462`
- 理想图依据：已经填完资料的个人主页.png｜tabBar 为「图标+文字」两行，文字下方只剩 Home Indicator 一条窄带
- 现象：.tab-bar 同时写了 height:calc(160rpx + env(safe-area-inset-bottom))（:17）与 padding-bottom:calc(env(safe-area-inset-bottom) + 24rpx)，且 box-sizing:content-box（:19）——安全区被计两次，容器实高 = 184rpx + 2×安全区；真机帧内标签文字下方多出约 55pt 纯白空带，理想图无此空带
- 建议改法：改 box-sizing:border-box（或 height 只留 160rpx，安全区只由 padding-bottom 承担）
- 修复类别：CSS/token

### R1-L03-D12　P1 / 层级遮挡　批次 R1-B03
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/components/common/GlobalPublishFab.vue:112`
- 理想图依据：已经填完资料的个人主页.png｜个人主页无悬浮发帖球，内容区直达 tabBar，各节小标题完整可读
- 现象：FAB 以 bottom:calc(env(safe-area-inset-bottom)*2 + 200rpx)、z-index:1000 悬停，安全区同样被乘 2，落点正好压在「这条内容仅互相喜欢或你关注的人可见」提示行右端与下一节小标题之上，帧内该节标题只剩上半截
- 建议改法：偏移量改按实测 tabBar 高度 + FAB 自身高度给一次安全区，或本人主页分支不渲染该 FAB
- 修复类别：单页

### R1-L03-D13　P2 / 尺寸比例　批次 R1-B22
- 帧：`tmp/qa/frames/R1/real-f0677920/pages__profile__index__top.png`（sha16=`bb5e5b650e0f0bb2`）
- 源码证据：`apps/client/src/custom-tab-bar/index.js:65`
- 理想图依据：已经填完资料的个人主页.png｜tabBar 五项（首页/附近/匹配/消息/我的）图标同尺寸线性排布，无凸起中心按钮
- 现象：中央项是 112rpx 渐变实心圆（其余四项图标 44rpx），视觉权重约为邻项 2.5 倍并把五等分栅格压成「两侧挤、中间鼓」；理想图中央项与其余项完全同构
- 建议改法：中央项回退为 44rpx 线性图标 + 文字，凸起样式若保留需同步放大其余四项并给出栅格依据
- 修复类别：CSS/token

## subpackages/campus/campus/hub（9 条）

### R1-L05-D12　P1 / 位置　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:392`
- 理想图依据：素材/理想效果图/校园圈.png — 大标题「校园圈」贴左栅格起排，搜索图标在右上角同一基线
- 现象：header 用 `justify-content: space-between`（line 384）且右侧预留 `calc(var(--capsule-right,7px) + 104px)`，标题列被顶到屏宽约 26% 处悬空；帧内卡片左边缘在 14px、标题左边缘在约 105px，与理想图"标题/副标题与卡片同一条左边线"的栅格关系不符
- 建议改法：标题列改绝对左对齐（header 用 grid 或把 padding-right 只作用在右侧插槽），使标题左边线与 `.campus-school-card` 对齐
- 修复类别：CSS/token

### R1-L05-D13　P2 / 字号　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:420`
- 理想图依据：素材/理想效果图/校园圈.png — 页面主标题约 48rpx，副标题约 28rpx
- 现象：`.campus-hub__title` 只有 36rpx、`.campus-hub__subtitle` 24rpx（line 426），比理想图各降一档，主标题与卡片校名（30rpx, line 622）只差 6rpx，层级差被压平
- 建议改法：标题提到 48rpx/800，副标题 28rpx，拉开与卡片名的档位差
- 修复类别：CSS/token

### R1-L05-D14　P2 / 圆角　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:783`
- 理想图依据：素材/理想效果图/校园圈.png — 搜索入口是带底色/描边的胶囊容器（理想图为右上角独立搜索图标按钮）
- 现象：`.campus-search` 写了 `border-radius: 999rpx`（line 782）但底色取 `var(--c-bg-page, #EEF7F2)`，与页面容器底色（line 370 同一 token）完全同色 ⇒ 帧里看不到任何胶囊容器，只剩一行裸放大镜+占位文字浮在背景上，圆角等于没生效
- 建议改法：底色换成 `var(--c-bg-container, #FFFFFF)` 或 `--c-neutral-100` 并补 1rpx 描边，使容器与页面底形成一档差
- 修复类别：CSS/token

### R1-L05-D15　P1 / 颜色token　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:663`
- 理想图依据：素材/理想效果图/校园圈.png — 「未认证」是淡紫底+紫字胶囊（已认证为淡绿底+绿字）
- 现象：`--unverified` 底色写成硬编码 `#9AA39F`（同组 `--verified` line 646、`--pending` line 654 都走 `var()`），既脱离 token 体系，色相也从理想图的紫档整体落到中灰档，帧内四张卡的徽标全部呈灰底白字
- 建议改法：改为 `background: var(--c-accent-50, #F1ECFB)` + `color: var(--c-accent, #8B5CF6)`，与理想图紫档对齐
- 修复类别：CSS/token

### R1-L05-D16　P1 / 文案　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:81`
- 理想图依据：素材/理想效果图/校园圈.png — 头像堆叠右侧写「等 342 位同学」
- 现象：`prefixTilde` 对每条统计无差别加「约」前缀，而 peers 原值已是「等 342 位同学」（line 62）⇒ 帧内渲染成「约等 342 位同学」，双重限定词语法错误；同一行 members/posts 也被加成「约3.2k 同学 · 约2.8w 动态」，与理想图「3.2k 位同学 · 2.8w 条动态」相比还丢了量词
- 建议改法：prefixTilde 只作用于纯数字字段，peers 走模板 `等 ${n} 位同学`；统计串补回「位/条」量词
- 修复类别：单页

### R1-L05-D17　P1 / 需新建　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:304`
- 理想图依据：素材/理想效果图/校园圈.png — 列表内「已认证」（绿）与「未认证」（紫）混排，按学校各自成态
- 现象：v-for 卡片里 badge 绑的是页面级 `joinedBadge.class`（line 304）而不是 school 级字段，导致帧内北京大学圈/清华大学圈/中国人民大学圈/复旦大学圈 四枚徽标恒为同一枚「未认证」，理想图里前两所应为「已认证」；推荐列表数据源缺 per-school 认证态字段
- 建议改法：给 schools 数据补 `verified` 字段并在卡片内用 `school.badgeClass`，页面级 joinedBadge 只服务头部
- 修复类别：需新建目标功能

### R1-L05-D18　P2 / 素材缺失　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:330`
- 理想图依据：素材/理想效果图/校园圈.png — 列表末尾有「查看更多校园圈 ⌄」带下箭头的一整行模块
- 现象：`.campus-hub__more` 只剩静态文案（line 328 注释自述已按审计建议删掉箭头），箭头模块与可点语义都没了，且该行在 bottom 帧里完全不可见（被压在不可滚的 scroll-view 内），理想图这一整块模块等于缺失
- 建议改法：恢复箭头并绑定真实动作（切到全量列表页），或明确改成无箭头分组标题并与理想图重排
- 修复类别：单页

### R1-L05-D19　P1 / 层级遮挡　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:371`
- 理想图依据：素材/理想效果图/校园圈.png — 末卡与 tab bar 之间有完整留白，任何卡片不被底栏裁切
- 现象：`.campus-hub` 的 padding 底值为 0（line 371），列表又包在 `scroll-view.campus-hub__feed`（line 269 / line 375 flex:1）里 ⇒ 帧内第 5 张卡在屏幕最底边被硬裁一半、与 home indicator 区域重叠，且 bottom 帧与 top 帧内容逐像素相同（页面级滚动带不动内层 scroll-view，48rpx footer line 775 也在滚动容器内部），底部内容被视口边缘遮挡
- 建议改法：给 scroll-view 加 `padding-bottom: calc(32rpx + env(safe-area-inset-bottom))`，或去掉内层 scroll-view 改页面级滚动
- 修复类别：CSS/token

### R1-L05-D20　P2 / 可达性　批次 R1-B27
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`76ca378ed03543e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:671`
- 理想图依据：素材/理想效果图/校园圈.png — 徽标文字与「等 N 位同学」在 750rpx 基准下约 24-28rpx
- 现象：`.campus-school-card__badge-text` 字号 20rpx（≈10.8px CSS）低于可读下限，还叠在 `#9AA39F` 灰底白字（line 663/667）上；`.campus-school-card__peers` 22rpx（line 722）同样偏小，帧内这两处文字已糊成灰点不可读
- 建议改法：badge-text 提到 24rpx、peers 提到 26rpx，并把徽标改为淡底深字以提高对比度
- 修复类别：CSS/token

## subpackages/circles/circles/circle-home（11 条）

### R1-L05-D01　P1 / 空态文案　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`a4ae68b7e708826a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:447`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 右上/左上均有返回+分享+更多操作，底部固定「加入圈子」主 CTA；空态应给出可继续逛圈子的动作
- 现象：描述行写「去看看别的圈子吧」，但同一空态里唯一动作是 line 448 的 `@tap="goBack"`（退回上一页），页面上没有任何圈子列表/发现入口可"去看看"，文案与动作不对应
- 建议改法：把按钮文案与跳转改成 `goToCirclesIndex()` 指向 subpackages/circles/circles/index，或在「返回」旁补一枚次级「去逛圈子」按钮
- 修复类别：单页

### R1-L05-D02　P1 / 素材缺失　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`a4ae68b7e708826a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:97`
- 理想图依据：无基准页空态；依据=组件规范（空态插画不得自带文字标签）
- 现象：空态插画直接引用 `/static/assets/images/mascot/mascot_cry.png`，已核对原 PNG 底部把「流泪」二字烘焙进图内，真机上它作为一行来历不明的小字挂在插画下方（帧内插画正下方可见），且这截文字带占了插画约 15% 高度、使本体看起来更小
- 建议改法：重切 mascot_cry.png 去掉文字带（或改用 mascot_tearful.png 等无字版本），文字只由 UI 文案承担
- 修复类别：CSS/token

### R1-L05-D03　P2 / 颜色token　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`a4ae68b7e708826a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:640`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 页面底色为统一的浅薄荷绿一档
- 现象：外层 `.circle-home` 底色写成硬编码 `#f4f6f5`（灰绿），而内层 `.circle-notfound` 用 `var(--c-bg-page, #eef7f2)`（line 651，薄荷绿），同页两层底色不同 token 体系；下拉回弹或空态未铺满时会露出与帧内可见底色不一致的另一层绿
- 建议改法：line 640 改成 `background-color: var(--c-bg-page, #eef7f2)`，删掉第二套底色
- 修复类别：CSS/token

### R1-L05-D04　P2 / 文案　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`a4ae68b7e708826a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:446`
- 理想图依据：无基准页空态；依据=组件规范（页面文案走 i18n）
- 现象：「圈子不存在或已解散」「去看看别的圈子吧」「返回」三条字符串以字面量写在模板里（446/447/449），而同文件其它空态走 `t("circle.home.emptyTab")`（line 548），空态文案游离在 i18n 之外
- 建议改法：三条字面量替换为 `t('circle.home.unknownTitle' / 'unknownDesc' / 'back')` 并补 locale key
- 修复类别：单页

### R1-L05-D05　P2 / 间距　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`a4ae68b7e708826a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:664`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 标题/副标题/操作三档信息组按 8rpx 栅格递进（同图内 16/24/32 关系清晰）
- 现象：空态四段间距为 32rpx（插画→标题, line 657）/ 12rpx（标题→描述, line 664）/ 40rpx（描述→按钮, line 670），12 与 40 不成档位，帧内可见标题与描述两行几乎粘连、而按钮又离得过远
- 建议改法：统一为 24rpx / 12rpx / 48rpx（或全部取 `--space-*` token），使组内/组间形成 1:2 关系
- 修复类别：CSS/token

### R1-L05-D06　P2 / 尺寸比例　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`a4ae68b7e708826a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:674`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 底部「加入圈子」实心胶囊高约 88rpx（屏高 5.2%）
- 现象：「返回」按钮 `padding: 18rpx 64rpx` + 28rpx 字 ⇒ 实高约 62rpx（帧内量得约 33px/828px ≈ 4.0% 屏高），比理想图主 CTA 档（约 5.2% 屏高）小一档；插画 220rpx（line 655）在整屏里只占 29% 宽，空态视觉体量整体偏小。需量测：按钮实高与理想图 CTA 高的精确比值
- 建议改法：按钮改 `padding: 24rpx 72rpx`（落到 88rpx 高），插画提到 280rpx
- 修复类别：CSS/token

### R1-L05-D07　P2 / 可达性　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`a4ae68b7e708826a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:448`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 顶部左上角有独立返回箭头（屏宽 8% 处）
- 现象：「返回」是裸 `<view>`，没有 `role="button"` / `aria-label`（同包 hub.vue:288 的卡片都带 `role="button"` + `:aria-label`），读屏下不可发现；且该分支未渲染任何导航栏返回入口，帧内顶部导航带完全空白，键盘/读屏用户只剩这一个不可读目标
- 建议改法：给 line 448 补 `role="button" :aria-label="t('common.back')"`，并在空态分支复用页面自定义导航栏返回按钮
- 修复类别：单页

### R1-L05-D08　P0 / 需新建　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`75972138d40d3bee`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:443`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 动态/精华/活动/作品墙/成员 五 Tab、置顶圈规条、三宫格图片流、底部固定「加入圈子」+ 发帖圆钮
- 现象：bottom 帧与 top 帧画面逐像素相同（只有时钟 23:42→23:43），页面没有任何可滚动内容——理想图的全部主体模块在 real 档缺参路径下不渲染，而这些样式的 CSS 其实都在（.tabs line 899、.pinned-card line 939、.bottom-bar line 1162、.bottom-fab line 624），说明是"进不了主体分支"而不是"没写样式"
- 建议改法：给取景/深链补可解析的 circleId 前置（或 real 档下允许回退到演示圈），使 bottom 帧能拍到主体内容
- 修复类别：需新建目标功能

### R1-L05-D09　P1 / 素材缺失　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`75972138d40d3bee`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:686`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 顶部 440rpx 圈子封面 + 圆形圈子头像 + 「热门」标签 + 1.2w 人加入/362 条动态 + 成员头像堆叠 + 摄影技巧/风景拍摄/人像写真/城市漫游 标签行
- 现象：理想图的 Hero 区（CSS 已定义 `.hero{height:440rpx}` line 686、`.tag-row` line 880）在真机整块不存在，帧内屏高 0~40% 是一段纯色空白，没有任何封面/头像/统计/标签信息层
- 建议改法：让空态之外的主体分支在 real 档可达，补齐 hero 与 tag-row 的渲染
- 修复类别：单页

### R1-L05-D10　P2 / 位置　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`75972138d40d3bee`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:649`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 主操作锚在屏底（约 92% 屏高）并带底部安全区
- 现象：空态用 `min-height: 100vh` 做几何居中，未扣除状态栏/导航带与底部安全区，实测插画中心落在屏高 41%、按钮中心 61%，按钮下方约 36% 屏高是纯空白；理想图的操作件是贴底锚定的，两者锚定关系完全不同
- 建议改法：改为 `min-height: calc(100vh - 导航带高)` 并把按钮下缘按 `env(safe-area-inset-bottom)` 贴底或上提固定距离
- 修复类别：CSS/token

### R1-L05-D11　P2 / 间距　批次 R1-B28
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`75972138d40d3bee`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:650`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png — 底部固定条与内容之间有明显留白带
- 现象：`.circle-notfound` 只写了 `padding: 0 96rpx`（左右），上下内衬为 0，导致空态内容在 100vh 里上下留白完全由居中算法决定、与同包页面统一的 `--space-page-y` 顶部起排间距不一致（帧内顶部空白 ≈ 21% 屏高，底部 ≈ 36% 屏高，不对称）
- 建议改法：补 `padding: 96rpx 96rpx calc(96rpx + env(safe-area-inset-bottom))`，使上下留白受控对称
- 修复类别：CSS/token

## subpackages/circles/circles/index（4 条）

### R1-L04-D08　P2 / 尺寸比例　批次 R1-B29
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f959e85ca4df3a97`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:558`
- 理想图依据：兴趣圈列表.png 每张圈子卡左侧缩略图为大方图，几乎撑满卡片正文高度
- 现象：真机圈子缩略图定尺 144rpx，明显小于理想图（理想图缩略图高≈正文四行高≈200rpx）；真机缩略图垂直居中、上下留白，比例偏小。需量测：理想图缩略图实际边长。
- 建议改法：将 cover-wrap 尺寸上调至贴近理想图（≈200rpx）或按正文高度自适应。
- 修复类别：CSS/token

### R1-L04-D09　P3 / 文案　批次 R1-B29
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f959e85ca4df3a97`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:435`
- 理想图依据：兴趣圈列表.png 统计行为「1.2w 人加入 · 362 条动态」
- 现象：真机统计行显示「1.2w 人 · 5 条动态」，较理想图丢失「加入」二字（cardStats 文案被精简，line434 注释自认），动词与理想图不一致。
- 建议改法：恢复「人加入」措辞或统一理想图口径，动态数走真实字段。
- 修复类别：单页

### R1-L04-D10　P2 / 位置　批次 R1-B29
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f959e85ca4df3a97`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:241`
- 理想图依据：兴趣圈列表.png 分类胶囊行右端常驻「≡」筛选按钮且带绿色通知点
- 现象：真机筛选/更多入口是 scroll-x 内第 7 个 tab（key=more，图标 ICONS_EMOJI.LIST），被挤出可视区，末位「美食」胶囊已被右边缘裁切，理想图钉在行尾的「≡」+绿点在真机上不可见。
- 建议改法：将「≡」筛选钮从滚动 tab 中拆出、固定在胶囊行右槽并保留通知点。
- 修复类别：单页

### R1-L04-D11　P3 / 文案　批次 R1-B29
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`f959e85ca4df3a97`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:426`
- 理想图依据：兴趣圈列表.png 圈子标题为「摄影圈/旅行圈/音乐圈…」带「圈」字
- 现象：真机圈子标题仅显示「摄影/旅行/音乐/运动/美食」，缺理想图的「圈」后缀，读作分类而非圈子。
- 建议改法：数据侧圈子名补「圈」后缀，或模板按理想图统一拼接。
- 修复类别：单页

## subpackages/discover-extra/discover/match-success（7 条）

### R1-L06-D01　P1 / 位置　批次 R1-B11
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`03b5c8b9ece728bc`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:387`
- 理想图依据：匹配成功页面.png 底部动作区——「立即聊天 / 继续探索 / 分享喜悦」三级动作贴屏幕底边排列，分享行距底栏安全区仅约 4%屏高
- 现象：三枚动作整体悬在视口约 62%~83% 处，下方残留约 15% 视口高的空带；`margin-top:auto` 的锚底链没生效（宿主 `:host{min-height:100%}` 叠在 `.success-page{min-height:100%}` 上，父级无确定高度 ⇒ auto 边距退化为 0）
- 建议改法：给 `.success-page` 落到 `min-height:100vh` 并把 `.match-success` 改为 `flex:1` + `justify-content:space-between`，实测动作块底沿与 safe-area 间距≈设计稿 60rpx
- 修复类别：CSS/token

### R1-L06-D02　P2 / 颜色token　批次 R1-B11
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`03b5c8b9ece728bc`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:180`
- 理想图依据：匹配成功页面.png 整页底——单一薄荷绿→浅粉洗色，自上而下连续无接缝（对应 design-variables.scss:179 `$gradient-match: linear-gradient(135deg,#E8FAF3,#FDF2F8)`）
- 现象：组件把 `.match-success` 底色硬编码成另一条渐变 `linear-gradient(180deg,#E8FBF2,#F0FFF5)`（无粉色端），页面层 match-success.vue:182 已声明 `var(--c-gradient-match)` 为「单一来源」，两层渐变在「分享喜悦」下方撞出一条可见横向色带接缝，接缝以下突然转粉
- 建议改法：删掉组件内 background 声明，只保留页面 `var(--c-gradient-match)` 一处来源
- 修复类别：CSS/token

### R1-L06-D03　P1 / 尺寸比例　批次 R1-B11
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`03b5c8b9ece728bc`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:234`
- 理想图依据：匹配成功页面.png 中部主视觉——两枚头像直径各约占屏宽 31%，内缘互相交叠，粉色心形徽标压在交叠点正中并盖住两头像
- 现象：真机头像只有 192rpx（≈25.6% 屏宽），且 `__avatars` 用 `gap:32rpx` 把「头像-心-头像」排成三个并列 flex 子项，两头像之间被撕开一道约 176rpx 的空槽，心形徽标落在槽里没有压盖任何头像；庆祝主视觉被拆散
- 建议改法：头像提到 232rpx、`gap` 归零并给 `__heart` 负 margin（或绝对定位居中 + z-index:3）还原交叠压盖关系；需量测：理想图头像内缘重叠量约 -12rpx
- 修复类别：单页

### R1-L06-D04　P1 / 素材缺失　批次 R1-B30
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`03b5c8b9ece728bc`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:149`
- 理想图依据：匹配成功页面.png 右上角——导航行右侧有一枚深色「扫一扫/取景框」线性图标
- 现象：右上第一个圆底按钮在真机上渲染成空白白圆（无图标）；它引用的 `IMAGE_PATHS.LOGIN_SPLIT['r06_c01']` 实际文件是 apps/client/src/static/assets/images/login-split/登录页_r06_c01.png —— 一张微信双气泡 LOGO 登录图标，与同文件 120 行注释声称的「素材库 r06_c01 相机图标」不是同一个东西，语义与视觉双错
- 建议改法：换成 `ICONS_SOCIAL`/`svg-spec` 里的取景框图标资源并补 alt 文案；若「截图」功能未接入，先隐藏该按钮而不是留一个空白圆
- 修复类别：需新建目标功能

### R1-L06-D05　P2 / 尺寸比例　批次 R1-B11
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`03b5c8b9ece728bc`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:372`
- 理想图依据：匹配成功页面.png 共同点卡——每行是「左：图标+标签｜右：匹配度百分比 + 其下一条只占右半栏的进度条」两列结构
- 现象：进度条 `width:100%` 横穿整张卡片，压在标签行正下方，把四行拉成「文字行 + 满宽条」八段节奏；理想图里条宽只有卡内宽的约 45%，与右侧百分比同栏对齐
- 建议改法：`__score-item` 改两列 grid（左标签列固定、右栏放百分比+条），`__score-track` 宽度收进右栏
- 修复类别：单页

### R1-L06-D06　P2 / 圆角　批次 R1-B11
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`03b5c8b9ece728bc`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:350`
- 理想图依据：匹配成功页面.png 共同点卡行首——每枚图标坐在一个圆角方块底衬里（约 64rpx 见方、圆角约 18-20rpx、绿/粉浅色底），生活方式那枚是粉底
- 现象：`__score-icon` 只有 36rpx 裸图标直接贴在白卡上，没有任何圆角底衬层，四行行首缺一个视觉锚点，导致整卡比理想图扁一档
- 建议改法：加 `__score-icon` 外层 64rpx 圆角方块（border-radius:18rpx；前三行 `--c-tint-green` 底、末行粉底），图标缩到 32rpx 居中
- 修复类别：单页

### R1-L06-D07　P3 / 字号　批次 R1-B11
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`03b5c8b9ece728bc`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:323`
- 理想图依据：匹配成功页面.png 共同点卡标题「我们正在分享你们的共同点」——卡内最大字号、粗体，明显大于右侧「匹配度 90%」
- 现象：卡标题与行标签、百分比同为 26rpx（标题仅 font-weight:500，MatchSuccess.vue:327），卡内没有字号层级；真机上标题读起来像第五行普通条目
- 建议改法：标题提到 32rpx / 700 并走 `--t-title-sm` 一档，与 26rpx 行文字拉开层级
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（12 条）

### R1-L06-D08　P1 / 文案　批次 R1-B18
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`dfe624b28448653f`）
- 源码证据：`apps/client/src/components/profile/public/PublicInterest.vue:14`
- 理想图依据：他人显示主页.png「兴趣标签」区——旅行 / 摄影 / 音乐 / 电影 / 美食 / 猫咪，全部中文
- 现象：标签直接渲染原始英文 slug「running / movies / reading / photography」。`<InterestTag :label="tag" />` 把 `profile.intro.tags` 的 value 当展示文案，未走 labelKey 经 t() 映射——而 apps/client/src/config/profile-tags.ts:69 明确写着「展示层…通过 labelKey 经 t() 映射，勿直接渲染 label」，属违反本项目自有约定
- 建议改法：在 PublicInterest 里按 value 查 profile-tags 取 labelKey 再 `t()`，查不到才兜底 label
- 修复类别：单页

### R1-L06-D09　P1 / 空态文案　批次 R1-B19
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`dfe624b28448653f`）
- 源码证据：`apps/client/src/components/profile/public/PublicProfile.vue:70`
- 理想图依据：他人显示主页.png 中段——「我们有 3 个共同点」「生活瞬间」「最近动态」三块依次排在兴趣标签之下
- 现象：三块全部 `v-if="*.length > 0"`（PublicCommon.vue:22 / PublicGallery.vue:10 / PublicMoment.vue:41），数据一空就连标题一起吞掉，页面上没有任何「暂无共同点 / 还没有发过动态」的占位文案，只留一片白
- 建议改法：保留标题行 + 给每块一个浅色空态卡（图标 + 一句引导文案），别整块 v-if 掉
- 修复类别：单页

### R1-L06-D10　P1 / 间距　批次 R1-B19
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`dfe624b28448653f`）
- 源码证据：`apps/client/src/components/profile/public/PublicProfile.vue:136`
- 理想图依据：他人显示主页.png 整页——内容连续铺到「最近动态」卡并被底栏自然遮住，页内无成屏的空白段
- 现象：兴趣标签卡下方出现约 40% 视口高的空白带。底栏预留被算了两次：`.public-profile__spacer` 220rpx（136 行）＋ `.public-profile` 的 `padding-bottom: calc(220rpx + safe-area + 60rpx)`（106 行）＝ 约 500rpx 纯空
- 建议改法：二选一——去掉流内 spacer，只留 padding-bottom；或 spacer 保留、padding-bottom 降为 `calc(60rpx + env(safe-area-inset-bottom))`
- 修复类别：CSS/token

### R1-L06-D11　P2 / 颜色token　批次 R1-B16
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`dfe624b28448653f`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:89`
- 理想图依据：他人显示主页.png 头像——白色描边圆环浮在封面上，环宽约 6-8px，环内是头像照片
- 现象：头像环写成 `border: 8rpx solid #36C99A`（裸 hex，非 var），真机是一圈饱和品牌绿；理想图为白环。绿环还与同卡内绿色「在线」徽标、底栏绿「打招呼」抢色，头像与封面之间失去留白缓冲
- 建议改法：改 `border: 8rpx solid var(--c-neutral-0, #fff)` 并把环外阴影补回，与 PublicHero.vue:100 已有的 `var(--r-full)` 同档
- 修复类别：CSS/token

### R1-L06-D12　P2 / 圆角　批次 R1-B17
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`dfe624b28448653f`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:174`
- 理想图依据：他人显示主页.png 个人卡右上——两枚「喜欢」「打招呼」胶囊按钮（border-radius 全圆药丸、浅粉底/浅绿底、带文字），上下两行右对齐
- 现象：`__btn` 是 80rpx×80rpx 的 `border-radius:50%` 正圆图标钮（171-178 行），理想图是横向自适应的药丸胶囊；圆/药丸档位不同，导致卡片右侧只有两个小圆点、撑不出设计稿的按钮块
- 建议改法：改 `height:64rpx; padding:0 24rpx; border-radius:999rpx; width:auto` 并回到胶囊形态
- 修复类别：单页

### R1-L06-D13　P1 / 可达性　批次 R1-B31
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`dfe624b28448653f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:494`
- 理想图依据：他人显示主页.png 封面右上——「···」更多入口清晰排在胶囊之下/左侧，可点
- 现象：`.other-header` 右内边距只有 28rpx，未按本项目既有做法避让微信胶囊（同仓 match-success.vue:199 用了 `calc(var(--capsule-right,7px) + 104px)`），top 帧里头部 `···`（407 行）被系统胶囊整枚盖住、画面不可见也不可点；举报/拉黑/关注入口实际只剩那个绿色 FAB
- 建议改法：右内边距改 `calc(var(--capsule-right, 7px) + 104px)`，与 match-success 同口径避让
- 修复类别：单页

### R1-L06-D14　P2 / 尺寸比例　批次 R1-B16
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`dfe624b28448653f`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:48`
- 理想图依据：他人显示主页.png 封面——hero 只占屏高约 23%，个人卡上沿即压住封面下缘，首屏还能看到兴趣标签与共同点
- 现象：`.public-hero { height: 640rpx }`（≈39% 屏高，需量测：真机顶帧封面占 31%~39%），比设计稿高一档，把个人卡整体下推、首屏只剩 3 个模块，是「首屏空」的第二个来源
- 建议改法：降到 480rpx 量级并复核个人卡压边量，使首屏至少露出兴趣标签 + 共同点标题
- 修复类别：CSS/token

### R1-L06-D15　P1 / 需新建　批次 R1-B15
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`a1f8b8a8db0ca3e8`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:10`
- 理想图依据：他人显示主页.png「生活瞬间」——一行 4 张圆角约 12rpx 的方形照片，点击进入大图
- 现象：这是滚到底的那一帧，照片墙仍未出现在画面任何位置（`photos.length>0` 才渲染，`profile.media.photos` 在 real 档为空）；页面已实现点击放大层 other.vue:447-455 却永远拿不到入口，属功能有壳无数据
- 建议改法：给他人主页补 photos 取数（或封面兜底 1 张），同时按 D09 补空态卡，别让整块消失
- 修复类别：需新建目标功能

### R1-L06-D16　P2 / 位置　批次 R1-B31
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`a1f8b8a8db0ca3e8`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:535`
- 理想图依据：他人显示主页.png——页面没有悬浮 FAB，「更多」只出现在封面导航行右上「···」
- 现象：bottom 帧与 top 帧画面几乎重合（封面仍在视口内，说明可滚行程不足一屏），一枚 96rpx 绿色实心 FAB 固定在 `bottom: calc(safe-area + 200rpx)`，正落在 D10 那片空白带里、悬在底栏上方，与理想图的入口位置方案冲突
- 建议改法：撤掉 FAB、把 BottomSheet 挂到避让胶囊后的头部 `···`（见 D13），或至少移到内容流末尾而非 fixed 悬空
- 修复类别：单页

### R1-L06-D17　P2 / 颜色token　批次 R1-B20
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`a1f8b8a8db0ca3e8`）
- 源码证据：`apps/client/src/components/profile/public/RelationshipCTA.vue:110`
- 理想图依据：他人显示主页.png 底栏——「喜欢」是浅粉底 + 粉色描边心 + 粉字（约 #FCE4EC 档），「打招呼」才是唯一实心绿主按钮
- 现象：`--like` 用 `var(--c-gradient-pink)`（design-variables.scss:176 = `#FF6B81→#FF8DA1` 饱和渐变）+ 白字，底栏同时出现饱和粉与饱和绿两枚实心主按钮，主次关系被抹平；仓内已有浅档 token `--c-tint-pink-50: #FCE4EC`（design-variables.scss:795）未被使用
- 建议改法：`background: var(--c-tint-pink-50)`、文字/图标取 `--c-pink-500`，把实心绿留给「打招呼」
- 修复类别：CSS/token

### R1-L06-D18　P2 / 文案　批次 R1-B17
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`a1f8b8a8db0ca3e8`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:171`
- 理想图依据：他人显示主页.png 个人卡右侧——两枚胶囊分别带文字「喜欢」「打招呼」
- 现象：卡内两枚按钮（49-53 行）只塞了 40rpx 图标、无任何文字，真机读作「粉心 + 绿气泡」两个匿名圆点；与底栏同名动作重复出现，用户无法判断点哪个
- 建议改法：补 `<text>喜欢</text>` / `<text>打招呼</text>`（走 i18n `profile.other.like` / `.hello`），与底栏二选一保留
- 修复类别：单页

### R1-L06-D19　P2 / 素材缺失　批次 R1-B16
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`a1f8b8a8db0ca3e8`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:38`
- 理想图依据：他人显示主页.png 头像——白环内是一张真实人像照片，与封面同一人物
- 现象：`profile.basic.avatar` 为空时直接落 `charAt(0)` 首字母占位，真机头像是一个绿底白字「小」圆片；同页 PublicMoment.vue:64-65 也有同样的首字母兜底，整页没有一处真实头像
- 建议改法：头像为空时回落到 `IMAGE_PATHS.DEFAULT_AVATAR`（与 match-success.vue:32 同口径）而不是首字母，或在 fetchPublicProfile 侧补 avatar 字段
- 修复类别：单页

## subpackages/village/village/detail（7 条）

### R1-L04-D01　P2 / 文案　批次 R1-B32
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`bc9ef5f8bfe4c57b`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:938`
- 理想图依据：帖子.png 行内互动栏右侧分享动作，文案为「分享」
- 现象：真机帖子正文下方互动栏最右侧动作显示「↗ 转发」，理想图同一位置文案为「分享」，动词不一致。
- 建议改法：将 village.detail.shareAction 文案对齐理想图改为「分享」（或明确产品口径后统一）。
- 修复类别：单页

### R1-L04-D02　P2 / 圆角　批次 R1-B32
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`bc9ef5f8bfe4c57b`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:2853`
- 理想图依据：帖子.png 正文下方位置标签为浅绿色圆角胶囊底（含 pin+校名+距离）
- 现象：真机位置标签「◎ 北京大学」为纯绿文字裸排，无圆角胶囊背景；.post-location 只有 padding、无 background/border-radius，与理想图的绿色圆角药丸差异明显。
- 建议改法：给 .post-location 加浅绿胶囊底（background var(--c-tint-green-soft)+border-radius var(--r-full)+左右 padding）。
- 修复类别：CSS/token

### R1-L04-D03　P3 / 文案　批次 R1-B32
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`bc9ef5f8bfe4c57b`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:895`
- 理想图依据：帖子.png 位置胶囊内含「· 距你 1.2km」距离文案
- 现象：真机位置标签只有校名，无距离文案；post-location__distance 节点被清空（写死假距离移除），理想图该处有「距你 1.2km」。
- 建议改法：接入真实距离字段后恢复距离文案，缺失时按理想图口径给占位，勿留空节点。
- 修复类别：单页

### R1-L04-D04　P2 / 素材缺失　批次 R1-B32
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`bc9ef5f8bfe4c57b`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:842`
- 理想图依据：帖子.png 正文下为大图封面+三宫格图片区（设计核心模块）
- 现象：真机整帖纯文本、无任何图片宫格；.post-images 由 v-if images.length>0 门控，取证帖无图时整段消失且无占位，理想图的核心图片模块在真机上不可见。需量测：确认该帖是否应带图，若确为纯文本帖则此条降级为数据问题。
- 建议改法：用带图帖子复拍验证宫格渲染；纯文本帖保留现状但补空态说明。
- 修复类别：单页

### R1-L04-D05　P2 / 位置　批次 R1-B32
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`bc9ef5f8bfe4c57b`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:803`
- 理想图依据：帖子.png 作者名右侧紧跟绿色「北京大学」认证胶囊（与名字同行）
- 现象：真机作者行只有「阿辰」+下方「1 天前」，名字右侧无校徽认证胶囊（author-inline__badge 由 isAlumni 门控，本帖为 false）；校名被挪到正文下方当位置标签，理想图作者行内的认证胶囊缺失。
- 建议改法：认证帖作者名右侧渲染校徽胶囊（口径对齐理想图，勿仅靠 isAlumni 单条件）。
- 修复类别：单页

### R1-L04-D06　P1 / 可达性　批次 R1-B32
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`bc9ef5f8bfe4c57b`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:783`
- 理想图依据：帖子.png 评论区可下滚展开多条评论与嵌套回复
- 现象：bottom 帧与 top 帧 sha16 完全相同（bc9ef5f8bfe4c57b），说明「滚到底」取景时内部 scroll-view(.detail-body) 未推进；两帧底部都被裁切的「你可能还想认识」第二张卡与后续评论在真机帧中不可达、不可验证。
- 建议改法：取景脚本对内部 scroll-view 用 scrollTop 编程滚动而非窗口滚动，确保 bottom 帧反映真实底部内容。
- 修复类别：单页

### R1-L04-D07　P3 / 位置　批次 R1-B32
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`bc9ef5f8bfe4c57b`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1321`
- 理想图依据：帖子.png 底部输入栏静置态仅 @/表情/图片 三图标，无发送按钮
- 现象：真机底部栏常驻一个绿色「发送」胶囊（input-bar__send），理想图静置态无此按钮，属新增控件、与理想图栅格不一致。
- 建议改法：与产品确认是否保留；若对齐理想图则空输入态隐藏发送钮。
- 修复类别：单页

## subpackages/village/village/publish（11 条）

### R1-L03-D14　P2 / 位置　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1020`
- 理想图依据：发布帖子页面.png｜导航栏「发布动态」严格居中于屏幕中线，「发布」按钮贴右页边距
- 现象：头部 padding-right 预留 calc(var(--capsule-right,7px) + 104px)，标题在「X—发布」剩余区间居中，真机上「发布动态」视觉中心落在屏宽约 31% 处（帧内 x≈118/378），相对理想图左偏约 70pt
- 建议改法：标题改绝对居中（position:absolute + left:50% translateX(-50%)），按钮仍走胶囊避让
- 修复类别：CSS/token

### R1-L03-D15　P2 / 圆角　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1090`
- 理想图依据：发布帖子页面.png｜添加话题/位置/提及/谁可以看四行为通栏列表，行间只有贯穿全宽的细分割线，无外框卡片
- 现象：四行被 .publish-rows 包成 margin:16rpx 32rpx + border-radius:24rpx + 1rpx 边框的圆角卡，行分割线随之缩进到卡内（帧内 y≈518-680），比理想图少一层通栏呼吸感且多出一圈描边
- 建议改法：去掉容器边框与圆角、左右 margin 归零，只保留行底部分割线
- 修复类别：CSS/token

### R1-L03-D16　P1 / 文案　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:825`
- 理想图依据：发布帖子页面.png｜「添加位置」行右侧是可点的校区名 + › 箭头，点击进入位置选择
- 现象：行内 meta 文案为「选择位置」（动词短语，承诺可选），但该行根节点（:820）无 @tap、无 hover-class、无 role="button"、无 › 箭头，真机点上去零响应——文案与能力相反
- 建议改法：要么恢复选择交互，要么把 meta 改成陈述式（如当前城市名）并去掉动词口吻
- 修复类别：单页

### R1-L03-D17　P2 / 尺寸比例　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1082`
- 理想图依据：发布帖子页面.png｜图片区一行四格（3 张已选 + 1 个虚线添加格），单格宽约为 (屏宽−2×37px)/4
- 现象：单格 200×200rpx，一行只放得下 3 格（3×200+2×16=632rpx），理想图为 4 格一行；真机空态下整行仅左侧一格、右侧约 2/3 宽度留白（帧内 y≈418-540）。需量测：目标单格宽 = (750 − 2×32 − 3×16)/4 = 161.5rpx
- 建议改法：单格宽度改按四等分栅格计算，gap 同步对齐理想图
- 修复类别：CSS/token

### R1-L03-D18　P2 / 素材缺失　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:755`
- 理想图依据：发布帖子页面.png｜「发布到」卡左侧是 1 枚圆形真实封面/头像图，占满头像位
- 现象：非圈子目标（默认「个人动态」）走 v-else 分支，88rpx 圆形浅绿底里塞一枚 44rpx SCHOOL 象形图标当占位，帧内 y≈150 处呈现为「灰底小方块图标」，既非头像也非品牌图形
- 建议改法：个人动态目标改取当前用户头像（无头像时用首字母底），并让图占满 88rpx 圆
- 修复类别：单页

### R1-L03-D19　P3 / 尺寸比例　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1046`
- 理想图依据：发布帖子页面.png｜「发布到」卡内头像明显大一档（约占卡高 70%），卡整体更高
- 现象：头像位 88rpx 而卡内 padding 24rpx + 两行文字，头像只占卡高约一半；理想图头像与两行文字（标题+副标题）等高。需量测：按理想图头像/卡高比例换算目标值
- 建议改法：头像位放大到 112rpx 档并复核卡高
- 修复类别：CSS/token

### R1-L03-D20　P3 / 字号　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1077`
- 理想图依据：发布帖子页面.png｜右下角字数计数「0/1000」为次级灰但可读档（约 28rpx）
- 现象：计数 22rpx（11pt）且色值 --c-text-tertiary，真机「12/500」在帧内几乎糊成一团，比理想图小约两档；正文输入 30rpx 也低于理想图正文档
- 建议改法：计数提到 var(--fs-sm, 24rpx)~28rpx 并复核正文档位与理想图一致
- 修复类别：CSS/token

### R1-L03-D21　P1 / 需新建　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1135`
- 理想图依据：发布帖子页面.png｜屏幕最底部有固定工具栏，5 项等分：图片/视频、话题、位置、提及、更多
- 现象：理想图的底部工具栏整块不存在——样式表里 .publish-toolbar 已写好（space-around + 安全区 padding + 上边框），但全文件模板中无任何节点引用它，属于「有 CSS 无 DOM」的半成品；bottom 帧与 top 帧逐像素相同（同 sha16），也印证页面下方没有该固定栏
- 建议改法：在 scroll-view 之后按 :1135 的既有类名补 DOM 并接上选图/话题/位置/提及四个已有动作
- 修复类别：需新建目标功能

### R1-L03-D22　P1 / 间距　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1133`
- 理想图依据：发布帖子页面.png｜「发帖小贴士」卡与底部工具栏之间仍有整卡高度的留白，卡片四边内边距一致
- 现象：滚动容器尾部占位只有 height:24rpx 且不含 env(safe-area-inset-bottom)（.publish-body 亦无下内边距，见 :1041），真机小贴士卡描述行「真实分享校园生活…」贴到屏幕底缘、下半截被 Home Indicator 吃掉，卡内下内边距视觉上为 0
- 建议改法：占位高改 calc(env(safe-area-inset-bottom) + 48rpx)，若补上底部工具栏则改为工具栏高度 + 安全区
- 修复类别：CSS/token

### R1-L03-D23　P2 / 可达性　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1131`
- 理想图依据：发布帖子页面.png｜小贴士卡右上角 × 为独立可点关闭控件，视觉尺寸与行高相称
- 现象：关闭图标 28rpx（14pt）且 .publish-tip__close 未见最小点击区约束，落在屏幕最底缘一行——拇指可达区里一个 14pt 目标，误触即把提示永久关掉
- 建议改法：给 close 容器加 min-width/min-height 88rpx 命中区，图标尺寸对齐理想图
- 修复类别：CSS/token

### R1-L03-D24　P2 / 颜色token　批次 R1-B33
- 帧：`tmp/qa/frames/R1/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`d20eabca234d7648`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1126`
- 理想图依据：发布帖子页面.png｜页面底色与卡片/分割线/提示底应同属一套中性色阶（提示卡为极浅品牌绿）
- 现象：提示卡底色 #EAF9F3、卡外边框 #EEF2F0、行分割线 #F2F5F3、图片占位 #EAF6F1 全是就地硬编码近似色（同页另有 :1006 background:#ffffff），彼此差 3~8 个色阶却无 token 出处，与理想图的单一浅绿底不属同一色系管理
- 建议改法：收敛到 var(--c-brand-50)/var(--c-border-card)/var(--c-bg-page) 三档，删掉就近取色
- 修复类别：CSS/token

