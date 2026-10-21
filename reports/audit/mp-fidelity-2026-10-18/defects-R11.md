# R11 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=285　涉及页面=69　涉及帧=136　泳道卡=14　段内继承哈希=21（同段第二条起未重复抄录，非逐条见证）
- 严重度分布：P2=174　P1=56　P3=38　P0=17
- 轴分布：可达性=56　颜色token=45　文案=39　字号=26　位置=24　间距=18　尺寸比例=16　素材缺失=16　需新建=15　空态文案=13　圆角=12　层级遮挡=5
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0
- 批次归属：285 个批次收录，**卡上有而 fixlist 没有的=0**

## (未点名页面)（9 条）

### R11-L05-D02　P2 / 圆角　批次 R11-B29
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`ce5c9f1dc53244b0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:665`
- 理想图依据：无基准，依据=规范文档§1.4（卡片圆角 --card-radius=40rpx；--r-xl=24rpx）
- 现象：.category-tabs 声明了 background:var(--c-bg-container)+box-shadow 却没有 border-radius、也没有左右 margin ⇒ 帧上是一条左右顶到屏幕边缘（x=0 与 x=480）的直角白带，而同页 .cert-guide-card(:596 margin 20rpx 24rpx + radius 24rpx)、.topic-card(:776) 都是内缩圆角卡；实测圆角 0rpx vs 同页 24rpx / 规范 40rpx。
- 建议改法：给 .category-tabs 补 margin:20rpx 24rpx + border-radius:var(--card-radius,40rpx)，或整带改为与其它卡同族的 SectionCard。
- 修复类别：CSS/token

### R11-L05-D03　P2 / 素材缺失　批次 R11-B29
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`ce5c9f1dc53244b0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:273`
- 理想图依据：无基准，依据=组件规范 src/components/common/SafeImage.vue:319-345（custom-class 落在组件内部 data-v 节点，宿主 scoped 尺寸规则命中 0 个节点 ⇒ 槽位塌陷）
- 现象：两处 SCHOOL 图标（页头校名左侧 .school-icon{width:40rpx} index.vue:506、认证引导卡左 .cert-guide-card__icon{width:64rpx} index.vue:605）都用 custom-class 传类 ⇒ 帧上「北京大学」与「<」之间、以及「完成学生认证，解锁校园专区」左侧均读不到任何图标像素（0×0），素材 school.png（48×48，在盘）没有渲染出口；同卡右侧「去认证」有像素，可反证是槽位塌陷而非缺档。
- 建议改法：把 custom-class="school-icon" / custom-class="cert-guide-card__icon" 改成组件标签上的原生 class（同 index.vue:393 .topic-card__avatar 与 certification.vue:414 的 R10-L05-D11 收口写法）。
- 修复类别：单页

### R11-L05-D05　P2 / 尺寸比例　批次 R11-B29
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`995cca25fa03b1fb`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:625`
- 理想图依据：无基准，依据=规范文档§1.4（--card-padding=32rpx）+ §1.3 正文行高 1.55–1.6
- 现象：认证引导卡正文「上传学生证即可认证，与同校同学畅聊校园话题」在帧上第 2 行只落 1 个孤字「题」（y≈185..200 单字成行）：卡内可用宽被 padding 28rpx×2 + gap 20rpx + nowrap 的「去认证」按钮（padding 16rpx 32rpx）挤到只剩约 484rpx，24rpx 字号下 20 字正文刚好溢出。
- 建议改法：正文行首尾用 text-wrap:pretty/或把 desc 字号提到 26rpx 并给 body 让出 1 个字宽（缩按钮左右 padding 到 24rpx），消除孤字行。
- 修复类别：单页

### R11-L05-D07　P2 / 可达性　批次 R11-B30
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`9bfe1039ad19d739`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:675`
- 理想图依据：无基准，依据=规范文档§3.14（发布按钮为页头胶囊，微信导航规范内）+ 本仓 88rpx 热区标准
- 现象：页头主操作「发布」胶囊热区实测 = padding 14rpx×2 + 26rpx 标签 ≈64rpx（帧上 x≈254..322 / y≈40..72，高 32px≈50rpx），低于 88rpx；同排「取消」胶囊同值。因表单尾部还有一条 .bottom-submit__btn（padding 28rpx 0，高≈106rpx）作替代出口，按口径记 P2。
- 建议改法：.post-header__back / .post-header__submit 各补 min-height:88rpx，与 certification.vue:512 的 R10-L05-D09 同档。
- 修复类别：单页

### R11-L05-D09　P2 / 圆角　批次 R11-B30
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`3c05f6f06393b1bb`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:797`
- 理想图依据：无基准，依据=规范文档§1.4（卡片圆角 --card-radius=40rpx=20px）
- 现象：本页 5 张白卡（.category-section:797 / .content-section / .images-section:923 / .topic-selector-section:1047 等）圆角统一取 var(--r-xl, 24rpx)，令牌真值 --r-xl=24rpx（theme/design-variables.scss:446），而规范给卡片的档位是 --card-radius=40rpx（design-variables.scss:699）⇒ 帧上卡角实测 12px 半径，比规范档小一档；同页 .category-option 又取 var(--r-lg,16rpx)（真值 20rpx），一页两档写法。
- 建议改法：卡片层统一改 border-radius:var(--card-radius,40rpx)（或按 theme/global.scss:142 .card-base 的唯一出口收口），瓷片/输入框保留 --r-lg 档。
- 修复类别：CSS/token

### R11-L05-D13　P3 / 字号　批次 R11-B27
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`d00e3cbeea7cd307`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:529`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（--fs-base=12px / --fs-lg=14px）+ §1.1 原则 3「一令牌一值」
- 现象：同域三页的页头返回件取档不一致：本页 .back-icon 取 var(--fs-base)=24rpx，而 topic-detail.vue:424 与 post-topic.vue:655 同名单均取 var(--fs-lg,28rpx) ⇒ 帧上「返回」二字实测字高 12px vs 另两页 14px，同域两页取档差一档。
- 建议改法：本页 .back-icon 字号对齐 var(--fs-lg)，或把三页页头返回件抽成同一组件档位。
- 修复类别：CSS/token

### R11-L05-D15　P3 / 文案　批次 R11-B27
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`db30668c13c5615d`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:405`
- 理想图依据：无基准，依据=规范文档§1.1 原则 3 + §6 文案级差异归类先例（第 3 条）
- 现象：「学信网截图」这个图片上传槽的提示语与上方「学信网验证码」输入框的提示语是同一个 key（:390 与 :405 都渲染 t("campus.certification.chsiHint")）⇒ 帧上两行逐字相同「选填：提供学信网在线验证码或学历截图可加快审核」（y≈228 与 y≈478），落在截图槽上时「在线验证码」这一半指不到任何可填对象。
- 建议改法：给截图槽补独立 key（如 chsiScreenshotHint=「选填：上传学信网学历截图，可加快人工审核」），验证码槽保留原文案。
- 修复类别：单页

### R11-L05-D17　P2 / 位置　批次 R11-B10
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`2c02f16b0277b577`，自同段前条继承）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:434`
- 理想图依据：素材/理想效果图/匹配中页面.png 进度卡行结构区（理想图：图标+标签一行，其下是横贯卡内的进度条）
- 现象：.match-loading__row 是单行 flex（图标 56rpx + 标签 + bar flex:1）⇒ 帧上「旅行爱好」条只占卡内可用宽约 62%（x≈180..420 / 可用 x≈46..434），且与标签挤在同一基线；理想图里条是独立第二行、横贯整卡（理想图 x≈440..790 位于标签行下方）。四条律动动画也因此只能在 240px 的窄轨里跑，读起来像装饰线而不是进度。
- 建议改法：.match-loading__row 改 flex-wrap 两档（图标+标签占第一行，.match-loading__row-bar 换行后 width:100%），与理想图行结构对齐；不引入百分比数字（§12 冻结契约：本页不显示算法百分比）。
- 修复类别：单页

### R11-L05-D19　P2 / 可达性　批次 R11-B41
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`2b0bf1967c60c95e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/matching.vue:292`
- 理想图依据：素材/理想效果图/匹配中页面.png 左上返回区（理想图为 44×44px 独立返回键）
- 现象：左上返回圆钮实测 72×72rpx（matching.vue:292-293 定死宽高；帧上圆钮 x≈18..60，42px≈66rpx），低于 88rpx/44px 标准 16rpx；因同屏右上「跳过」胶囊与微信胶囊均可退出，按口径记 P2。
- 建议改法：width/height 由 72rpx 提到 88rpx（内部 ‹ 字形 48rpx 不动），与本页 R7-L05-D08 已收口的跳过带同档。
- 修复类别：单页

## pages/discover/index（4 条）

### R11-L01-D13　P1 / 可达性　批次 R11-B21
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__discover__index__top.png`（sha16=`2e546ebf14d8a680`）
- 源码证据：`apps/client/src/pages/discover/index.vue:661`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片与三键之间区域（理想图为已登录态、无此胶囊；本页游客态新增的这枚胶囊是游客唯一转化入口，必须可读）
- 现象：游客提示胶囊"登录后可与 TA 互动"为 28rpx 白字压 :653 的 --c-brand→--c-brand-400 渐变，两端实算 2.11:1（#36C99A）与 1.83:1（#55D5A7），帧上白字与薄荷绿底同明度档、五个字发糊；这是游客在本页唯一的登录召唤，读不出即丢转化。
- 建议改法：底改 --c-brand-800（#156B51，白字 6.45:1），与 register/index.vue:1113 .sms-btn、success.vue:178 主 CTA 已收口的同一档保持一致。
- 修复类别：CSS/token

### R11-L01-D14　P1 / 颜色token　批次 R11-B09
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__discover__index__top.png`（sha16=`2e546ebf14d8a680`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:246`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片右上角「在线」白胶囊（理想图为深绿字，非亮绿）
- 现象：「在线」胶囊字色取 --c-brand #36C99A 压 :226 的 --c-overlay-bg-solid（90% 白，合成近白），实算 2.11:1 < 3:1，帧上"在线"两字与白底几乎相融——卡片上唯一的在线状态标识读不出来（同胶囊的绿点 :234 用同色尚可，文字不行）。
- 建议改法：文字走 §1.2「主色深 brand-700 #1F8D6A」或 --c-brand-800 档（≥4.5:1），绿点保留 --c-brand 作氛围色。
- 修复类别：CSS/token

### R11-L01-D15　P1 / 可达性　批次 R11-B09
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__discover__index__bottom.png`（sha16=`f825c721e87fd14f`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:101`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片左上「5km」距离胶囊 + 姓名下方「2.3km · 在线」行（理想图明确要求距离信息上卡）
- 现象：帧上卡片左上角距离胶囊整块缺席、姓名下方那一行只剩"在线"——推荐流卡片把"离我多远"这一理想图明确要求的判据整项丢失，游客/用户无法据此判断可约性；根因是 MatchCardUser 只有 distanceText 字段、推荐接口不下发距离，:61 的选择是"缺数据即隐藏胶囊"，页面也没有"距离未知"的替代出口。
- 建议改法：推荐流补 distanceText 下发（附近 tab 已有 filterNearby 的距离口径可复用）；短期在 :101 的 v-if 分支补一枚"距离未知"占位胶囊，避免整块信息凭空消失。
- 修复类别：需新建目标功能

### R11-L01-D16　P2 / 间距　批次 R11-B09
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__discover__index__bottom.png`（sha16=`f825c721e87fd14f`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:317`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片下缘（理想图里引言最后一行与卡片底边之间只留一枚胶囊的呼吸位，与右侧匹配度环同基线）
- 现象：.match-card__info 底部预留 padding-bottom: 170rpx（为 160rpx 匹配度环让位），但环是绝对定位在右侧（:250-253），左侧引言并不与它争位 ⇒ 帧上引言"步。"这一行下方拖出一条约 85rpx 的空带，文字块整体被顶到卡片中上部，与理想图"文字贴卡底"的版式不齐。
- 建议改法：让 .match-card__info 左侧文字列与右侧环分栏（文字 max-width 约 60%），底部 padding 降到 --sp-7（32rpx）档。
- 修复类别：CSS/token

## pages/home/index（4 条）

### R11-L01-D17　P0 / 文案　批次 R11-B08
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__home__index__top.png`（sha16=`aa1796151b6ef0bf`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:51`
- 理想图依据：素材/理想效果图/首页.png「今日恋爱进度」模块（计数「2/4 项完成」与四格状态互相自洽：1 已完成 + 1 进行中）
- 现象：帧上计数读作"1/4项完成"、进度条 :54 按 completed/total 只填到 25%，但同一模块四格里「完善资料」「认识新人」两格都渲染成白对勾 + "已完成"（:63/:69 走 step.completed）⇒ 2 个已完成对上 1/4 的假计数，用户拿不到今日真实完成数，进度条也被一起带错。completed 与 steps[].completed 由同一 feed 对象原样透传（view-models/home-dashboard.ts:86），渲染前无人对齐。
- 建议改法：计数改为按四格现算（completed = steps.filter(s => s.completed).length），或在 :51 处取 max(两者) 并把不一致上报；后端 loveProgress 补一致性校验。
- 修复类别：单页

### R11-L01-D18　P2 / 字号　批次 R11-B08
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__home__index__top.png`（sha16=`aa1796151b6ef0bf`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:186`
- 理想图依据：素材/理想效果图/首页.png「今日恋爱进度」四格（步骤名与状态字两档明显高于 11px/10px）
- 现象：四格步骤名写死 font-size: 22rpx（≈11px）、状态字 :196 写死 20rpx（≈10px），双双落在 §1.3「小字 --fs-md/base 13/12px」之下、借用只有"角标 · 法务"可用的极小档；帧上四格的两行文字挤成一小片，且全组件（:99 字号、:101 色值 #333A37、:120 字号）无一使用 --fs-*/--c-* 令牌，全是裸写 rpx/hex 字面量。
- 建议改法：步骤名归口 var(--fs-md, 26rpx)、状态字 var(--fs-sm, 22rpx)，色值同步换 --c-* 令牌。
- 修复类别：CSS/token

### R11-L01-D19　P3 / 文案　批次 R11-B08
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__home__index__top.png`（sha16=`aa1796151b6ef0bf`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:30`
- 理想图依据：素材/理想效果图/首页.png 第四格标题「参与兴趣互动」
- 现象：第四格取 home.loveStepInterest，zh-CN 值为"兴趣互动"（i18n/locales/zh-CN.ts:668），而理想图与本组件 :23 自述的口径都是"参与兴趣互动"——同域两页（首页四格 vs 组件注释/理想图）取档不一，帧上短了一截。
- 建议改法：zh-CN.ts:668 补回"参与"前缀（en-US 同步），或统一按理想图定档。
- 修复类别：单页

### R11-L01-D20　P2 / 位置　批次 R11-B07
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__home__index__bottom.png`（sha16=`cabf95eda4b1a2ae`）
- 源码证据：`apps/client/src/components/home/InterestRecommendation.vue:201`
- 理想图依据：素材/理想效果图/首页.png「兴趣推荐」四张卡（圈名 + 「1.2w 人加入」白字压在封面下缘的暗部上，封面下方只剩「加入」描边按钮）
- 现象：帧上"摄影圈 / 1.2w 人加入"两行落在封面之下的白底 .interest-card__body 里（216rpx 封面 :183 之外另起一段），封面与文字之间多出一条白带，整卡比理想图高一截、一屏只容得下 3 张；理想图把这两行叠在封面下缘并用暗部遮罩承托白字。
- 建议改法：标题/人数移到 .interest-card__cover-wrap 内绝对定位压底 + 复用 MatchCard.vue:177 那档渐变遮罩，体外只留「加入」按钮。
- 修复类别：单页

## pages/login/index（4 条）

### R11-L01-D01　P2 / 尺寸比例　批次 R11-B22
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__login__index__top.png`（sha16=`398eb3fc9b722e9e`）
- 源码证据：`apps/client/src/pages/login/index.vue:899`
- 理想图依据：素材/理想效果图/登录页面.png 中部插画区（两人全身坐于草坪，草坪带完整入画，仅最底缘轻微渐隐）
- 现象：插画框被定成 750×520rpx 且 mode="aspectFill"（:593），正方形构图原图上下各裁约 27%，帧上两人腰部以下与整条前景草坪带消失，再被 .login-page__hero::after 的 100rpx 渐隐吃掉一截，插画读成"半身头像条"。
- 建议改法：.hero-image 高度抬到与方图同档（750rpx）或改 mode="aspectFit"，让草坪带与人物全身按理想图比例完整入画。
- 修复类别：CSS/token

### R11-L01-D02　P2 / 颜色token　批次 R11-B22
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__login__index__bottom.png`（sha16=`d9cd163269a64b75`）
- 源码证据：`apps/client/src/pages/login/index.vue:1084`
- 理想图依据：素材/理想效果图/登录页面.png 主按钮内左侧——白色微信标压在绿色主按钮上
- 现象：微信标用的是 #07C160 实心气泡（static/assets/icons/login/wechat-green.svg），压在 rgba(255,255,255,.25) 圆片（合成 ≈#4F5D54）上，实算 2.88:1 < 3:1，帧上只剩一颗发暗的绿点，品牌标（"这是微信登录"）识别度丢失。
- 建议改法：换白色档微信标，或把 .btn-icon-wrap 底色提到 --c-overlay-bg-solid（90% 白）档，使图形对比 ≥3:1。
- 修复类别：CSS/token

### R11-L01-D03　P1 / 可达性　批次 R11-B22
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__login__index__bottom.png`（sha16=`d9cd163269a64b75`）
- 源码证据：`apps/client/src/pages/login/index.vue:1278`
- 理想图依据：素材/理想效果图/登录页面.png 按钮区（三档按钮 + 协议行）；本页无"稍后再看/去注册"以外注册出口
- 现象：「没有账号？去注册」热区 .btn-text 高 80rpx < 88rpx 最小可点件口径，且按本文件 :697-701 的说明它是默认态唯一注册入口（内联注册模式已删）——帧上该行只是按钮下方一条细文字带，点不中的新用户在本页没有任何第二条注册路径。
- 建议改法：.btn-text 高度抬到 88rpx，或按 pages/register/index.vue:1262 .agree__hit 的口径加等量负 margin 的透明热区层（视觉尺寸不动）。
- 修复类别：单页

### R11-L01-D04　P1 / 可达性　批次 R11-B22
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__login__index__bottom.png`（sha16=`d9cd163269a64b75`）
- 源码证据：`apps/client/src/pages/login/index.vue:1292`
- 理想图依据：素材/理想效果图/登录页面.png 协议行下方留白区（理想图无此行，但它是新用户唯一注册出口，必须可读）
- 现象：该链接字色取 --c-text-quaternary（#9AA39F，design-variables.scss:126）压页底 --c-bg-page #EEF7F2，实算 2.37:1（同仓 EmptyState.vue:194 已算过这一对），帧上"没有账号？去注册"与背景几乎同明度，链接色还比同页 .terms-link（--c-brand-800，5.92:1）暗两档。
- 建议改法：改 --c-brand-800（#156B51，压 #EEF7F2 5.92:1），与本文件 :1432 协议链接 R10-L01-D03 的收口口径一致。
- 修复类别：CSS/token

## pages/messages/index（2 条）

### R11-L02-D03　P2 / 位置　批次 R11-B23
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__messages__index__top.png`（sha16=`de75f28113f69811`）
- 源码证据：`apps/client/src/pages/messages/index.vue:991`
- 理想图依据：消息.png 顶部两张摘要卡——图标在左、标题+计数在右的横排结构
- 现象：.quick-card 为 flex-direction:column，图标堆在标题/计数上方（竖排），与理想图「图标左、文案右」的横排结构不符（游客/登录两态同用此类）
- 建议改法：.quick-card 改 flex-direction:row，图标列与文案列并排、按钮贴右下
- 修复类别：单页

### R11-L02-D04　P2 / 空态文案　批次 R11-B23
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__messages__index__bottom.png`（sha16=`dd0d1aca5ea54d0e`）
- 源码证据：`apps/client/src/pages/messages/index.vue:781`
- 理想图依据：消息.png「最近聊天」为真实会话行（头像+昵称+预览+时间+未读角标）
- 现象：游客「私信」区用 4 条加载骨架条（Skeleton variant=list）当作终态呈现，会话列表以「永远在加载」的灰条外观出现，而非可读的空态说明
- 建议改法：游客态改用带文案的空态卡（StatusState/ErrorState），不用无限骨架条
- 修复类别：单页

## pages/nearby/index（2 条）

### R11-L02-D01　P2 / 颜色token　批次 R11-B24
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__nearby__index__top.png`（sha16=`4dce37143c665cc3`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1713`
- 理想图依据：附近的首页.png 顶部五宫格入口——五枚底板各自浅绿/浅绿/浅蓝/浅橙/浅蓝的彩色底（粉/绿/蓝/橙/紫五色系）
- 现象：五枚功能入口底板全部塌成同一枚中性 --c-bg-surface #F3FAF6，理想图要求的五色系彩色底只剩图标滤镜承载，底板色彩层级丢失、五宫格读不出「按枚分层」
- 建议改法：给 --people/--circle/--campus/--activity/--dynamic 五枚分别上理想图的五色系浅底 token，而非共用 --c-bg-surface
- 修复类别：CSS/token

### R11-L02-D02　P2 / 需新建　批次 R11-B24
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__nearby__index__bottom.png`（sha16=`676c9ea342d8ac10`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:846`
- 理想图依据：附近的首页.png「校园圈」卡次行为「N 位同学」成员计数（如「3.2k 位同学」）
- 现象：校园圈卡次行显示 school.city（南京/杭州/上海/武汉），理想图明确要求的「N 位同学」成员计数整块缺席（后端无 campuses.member_count 列，前端拒绝捏造假计数）
- 建议改法：后端补 campuses.member_count（或 /config/campuses 的 studentCount）后接回次行；无字段前保留 city 但在台账登记为「缺列未修」
- 修复类别：需新建目标功能

## pages/profile/index（3 条）

### R11-L02-D05　P2 / 位置　批次 R11-B13
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__profile__index__top.png`（sha16=`5faca9697844b752`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:130`
- 理想图依据：未登录个人主页.png 头部右侧只有「编辑资料」白底胶囊，其后无箭头
- 现象：「编辑资料」胶囊之后又渲染一支游离的绿色「›」箭头（.nlp-header__arrow），理想图此处无该元素，头部右侧多出一个冗余控件
- 建议改法：删除 .nlp-header__arrow（胶囊本身已表达可点，箭头属 R8 补胶囊时未清的残留）
- 修复类别：单页

### R11-L02-D06　P2 / 颜色token　批次 R11-B13
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__profile__index__top.png`（sha16=`5faca9697844b752`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:155`
- 理想图依据：未登录个人主页.png 统计行四枚为纯彩色图标（紫心/粉双人/橙赞/蓝眼），无圆形底板
- 现象：统计四枚图标各加了一层 `${s.color}1F` 彩色浅底圆片，理想图统计图标为无底板的纯色字形，多出的色底片抢出装饰层级
- 建议改法：去掉 .nlp-stats__icon 的彩色底（background 归透明），只保留纯色图标对齐理想图
- 修复类别：CSS/token

### R11-L02-D07　P2 / 颜色token　批次 R11-B12
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__profile__index__bottom.png`（sha16=`b5b04f2369ccefc7`）
- 源码证据：`apps/client/src/components/profile/mine/MyMore.vue:60`
- 理想图依据：未登录个人主页.png / 已经填完资料的个人主页.png「更多功能」四枚为单色灰线性图标（星形/放大镜/相册/齿轮），无底板
- 现象：四枚图标各坐在彩色浅底圆片上（橙/蓝/粉/紫，:22-25），字形也换成书签/眼睛/图片/盾牌，与理想图的灰线性图标（星/放大镜/相册/齿轮）+ 无底板不符
- 建议改法：去掉 .my-more__icon 的彩色底、图标归一为 --c-text-tertiary 灰线性，并换回理想图字形
- 修复类别：CSS/token

## pages/register/index（4 条）

### R11-L01-D05　P1 / 可达性　批次 R11-B25
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__index__top.png`（sha16=`b0f364f45ed2a188`）
- 源码证据：`apps/client/src/pages/register/index.vue:1007`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（占位 #9AA39F 仅用于 placeholder）+ §1.3 正文档；组件规范 src/components/common/Button.vue 输入件口径
- 现象：六个字段行内没有独立 label 文本，字段名全靠 placeholder 承载，而 .field__ph 取 --c-text-placeholder #9AA39F 压输入底 --c-bg-surface #F3FAF6，实算 2.43:1，帧上"请输入手机号 / 短信验证码 / 设置密码（8-20 位）/ 再次输入密码 / 昵称（1-20 字）/ 出生日期"六行全部发灰，未聚焦时读不出该填什么。
- 建议改法：placeholder 提到 --c-text-tertiary #6B7571（压 #F3FAF6 4.48:1），并给每行补一条 --fs-md 可见 label（同 login 的 .sr-only 但需可见）。
- 修复类别：CSS/token

### R11-L01-D06　P1 / 可达性　批次 R11-B25
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__index__top.png`（sha16=`b0f364f45ed2a188`）
- 源码证据：`apps/client/src/pages/register/index.vue:1211`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（禁用 #DCE5E2 是"置灰"档，非文字底）
- 现象：.submit-btn--disabled 只覆盖 background（#DCE5E2），字色仍继承 :1207 的 --c-text-inverse 白 ⇒ 白字压 #DCE5E2 实算 1.28:1，帧上主按钮"注 册"两字与灰底近乎同色、整条主操作读不出是什么动作。
- 建议改法：禁用档同时改文字色（--c-text-tertiary #6B7571，压 #DCE5E2 ≥4.5:1），不要只翻底。
- 修复类别：CSS/token

### R11-L01-D07　P1 / 可达性　批次 R11-B25
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__index__bottom.png`（sha16=`248e1324fe3c3ed0`）
- 源码证据：`apps/client/src/pages/register/index.vue:1345`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（主色深 brand-700 #1F8D6A 档专用于"深色文字"）
- 现象：页尾"去登录"是本页回到登录流的唯一出口，字色取 --c-brand #36C99A 压页底 #EEF7F2，实算 1.93:1（与本仓 login/index.vue:1430 记的同值同缺陷），帧上它是淡到几乎与背景融在一起的绿字。
- 建议改法：改 --c-brand-800（#156B51，5.92:1），与登录页 .terms-link 已收口的档位对齐。
- 修复类别：CSS/token

### R11-L01-D08　P2 / 字号　批次 R11-B25
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__index__bottom.png`（sha16=`248e1324fe3c3ed0`）
- 源码证据：`apps/client/src/pages/register/index.vue:1323`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.3 字体层级（极小档只允许 --fs-xs 20 / --fs-sm 22rpx）
- 现象：法务说明行 .safety-note 写死 font-size: 21rpx，是夹在 --fs-xs(20) 与 --fs-sm(22) 之间的档外值，同页 .agree__text 取 24rpx，两行相邻文字取档不一致（帧上可看出两档字高不齐）。
- 建议改法：归口 var(--fs-sm, 22rpx)，法务行统一走 --fs-xs/--fs-sm 两档之一。
- 修复类别：CSS/token

## pages/register/success（4 条）

### R11-L01-D09　P2 / 素材缺失　批次 R11-B26
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__success__top.png`（sha16=`bacefe37b8953f43`）
- 源码证据：`apps/client/src/pages/register/success.vue:54`
- 理想图依据：无基准（规范文档 §3 无该页条目，回落 §1.2 页面底色 #EEF7F2 分层口径 + 本文件 :81 头注「设计稿 05 成功屏：插图 236×236 居中」= 透明底吉祥物悬浮）
- 现象：REGISTER.SUCCESS 素材自带不透明方形浅绿底，帧上 472×472rpx（:92-95）区域读出一块四边生硬的方块，与页底 #EEF7F2 之间出现明显接缝，成功屏顶部像贴了一张纸而不是插画。
- 建议改法：换透明底出图；短期兜底可给 .reg-success__img 加与页底同色的圆形/羽化遮罩（mask-image radial-gradient）消接缝。
- 修复类别：单页

### R11-L01-D10　P1 / 可达性　批次 R11-B26
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__success__top.png`（sha16=`bacefe37b8953f43`）
- 源码证据：`apps/client/src/pages/register/success.vue:159`
- 理想图依据：无基准（§3 无该页条目，回落 §1.2：#9AA39F 是 placeholder 档，不用于卡内正文状态字）
- 现象：已解锁清单三行右侧的状态字（帧上"完成 / 已解锁 / 建议"）取 --c-text-placeholder #9AA39F 压白卡 --c-bg-container #FFFFFF，实算 2.58:1 < 3:1，而这三枚标签是清单里唯一说明"到哪一步"的文字；同一行的主文字 :154 走 #1A1E1C，两档落差在帧上把状态字读成水印。
- 建议改法：状态字提到 --c-text-tertiary #6B7571（白底 5.0:1），placeholder 档只留给输入框。
- 修复类别：CSS/token

### R11-L01-D11　P1 / 可达性　批次 R11-B26
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__success__bottom.png`（sha16=`bacefe37b8953f43`）
- 源码证据：`apps/client/src/pages/register/success.vue:193`
- 理想图依据：无基准（§3 无该页条目；依据=本文件 :75 注释自述的"次级出口"定位 + 任务书 88rpx 热区口径）
- 现象：次级出口"稍后再说，先随便逛逛"是裸 <text>，只有 margin-top: 32rpx、font-size: 26rpx，无 padding/min-height ⇒ 可点区约 40rpx 高，不足 88rpx 口径一半；而它是本页唯一不进资料 12 步流程的出口（主按钮 :71 只会把用户送进 goSetupProfile），点偏即被推进向导。
- 建议改法：按 register/index.vue:1262 .agree__hit 的口径套 88rpx 透明热区层（padding + 等量负 margin，视觉不动）。
- 修复类别：单页

### R11-L01-D12　P2 / 间距　批次 R11-B26
- 帧：`tmp/qa/frames/R11/real-f0677920/pages__register__success__bottom.png`（sha16=`bacefe37b8953f43`）
- 源码证据：`apps/client/src/pages/register/success.vue:169`
- 理想图依据：无基准（§3 无该页条目，依据=全站设计规范与逐页设计稿说明.md §1.4 间距档 + theme/design-variables.scss:546-557 的 --sp-0~sp-10 令牌阶梯）
- 现象：主按钮与清单卡之间写死 margin-top: 56rpx，56rpx 不在 --sp-* 阶梯（…32/48）任一档上，帧上这段留白比清单卡自己的内距（:124 padding 16rpx 32rpx）还大一档，节奏与全站卡片间距不齐；同块 :179 的阴影 rgba(54,201,154,.28) 也是裸写字面量而非 --s-brand。
- 建议改法：margin-top 归口 var(--sp-9, 48rpx)，阴影换 --s-brand（design-variables.scss:508 等值档）。
- 修复类别：CSS/token

## subpackages/campus/campus/certification（2 条）

### R11-L05-D12　P2 / 素材缺失　批次 R11-B27
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`d00e3cbeea7cd307`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:315`
- 理想图依据：无基准，依据=组件规范 src/components/common/SafeImage.vue:319-345（custom-class 命中不到宿主尺寸 ⇒ 槽位塌陷）+ 本页 certification.vue:409-414 的 R10-L05-D11 同机理裁定
- 现象：「为什么要认证?」卡顶部应有一枚 44rpx 校徽（.info-card__icon{width:44rpx;height:44rpx} :677），但传类走的是 custom-class ⇒ 帧上卡片首行直接就是标题文字，标题上方 0 图标像素；同页下方「点击上传学生证照片」的相机图标（:414 已改成标签 class）在帧上正常出图，可反证这一处仍是塌陷而非缺档（school.png 48×48 在盘）。
- 建议改法：把 custom-class="info-card__icon" 改成组件标签上的 class="info-card__icon"（同文件 :414 的写法）。
- 修复类别：单页

### R11-L05-D14　P2 / 可达性　批次 R11-B27
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`db30668c13c5615d`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:905`
- 理想图依据：无基准，依据=规范文档§1.2（--c-text-tertiary #6B7571 / --c-bg-page #EEF7F2）+ §1.3 极小档（--fs-sm=11px，法务行）
- 现象：提交按钮下方那行「你的信息仅用于学生身份认证，我们承诺保护你的隐私安全」实测 22rpx(--fs-sm) 取 --c-text-tertiary #6B7571，压在 .cert-page 的 var(--c-bg-page,#EEF7F2)（:493）上 ⇒ 对比度 (0.9111+0.05)/(0.1704+0.05)=4.36:1，落在 3:1–4.5:1 档；帧上该行位于 y≈955..975，是全页最淡的一行正文级说明。
- 建议改法：法务/隐私行改取 --c-text-secondary #4A524E（压 #EEF7F2 ≈6.4:1），或字号提到 --fs-base 24rpx 走非正文小字豁免外的同档加深。
- 修复类别：CSS/token

## subpackages/campus/campus/hub（5 条）

### R11-L04-D15　P0 / 文案　批次 R11-B28
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`edd9ce3ee2abce23`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:102`
- 理想图依据：素材/理想效果图/校园圈.png 学校卡数据行「3.2k 位同学 · 2.8w 条动态 · 等 342 位同学」（理想图为示意，工程须取真实后端计数）
- 现象：帧上 4 张学校卡的三行数字（北大 3.2k/2.8w/342、清华 2.6k/2.1w/256、人大 2.1k/9.8k/301、复旦 1.8k/1.5w/210）不是后端读数，而是 hub.vue:87-97 一张按学校 id 硬编码的字面量表，:100-102 `statsOf()` 对表外学校一律回退同一组「1.0k 位同学 · 8k 条动态 · 等 120 位同学」。用户拿不到任何真实校园规模，且列表一旦超过 11 所就会出现多卡同数——典型假计数 + 张冠李戴，直接误导「选哪所学校」的决策。
- 建议改法：删掉 schoolStats 字面量表，改消费学校接口返回的成员数/动态数（无字段时整行不渲染），fallback 常量一并清除。
- 修复类别：需新建目标功能

### R11-L04-D16　P2 / 颜色token　批次 R11-B28
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`edd9ce3ee2abce23`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:577`
- 理想图依据：素材/理想效果图/校园圈.png 认证引导横幅（整条均匀绿浅底）
- 现象：帧上实测横幅左缘底色 #E9FAF4、右缘 #FCFFFD——:577 写成 `linear-gradient(135deg, var(--c-brand-50,#EAF8F2) 0%, #FFFFFF 100%)`，右半褪色到纯白并含一个 `#FFFFFF` 私有色字面量；规范 §3.12 要求该横幅为 `--c-brand-bg-tint` 均匀绿浅底。横幅右侧「去认证」按钮因此坐在白底上，与左侧不再是同一块氛围面。
- 建议改法：底色收成单色 `var(--c-brand-bg-tint)`（或 --c-brand-50），去掉渐变里的 #FFFFFF 字面量。
- 修复类别：CSS/token

### R11-L04-D17　P2 / 颜色token　批次 R11-B28
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`edd9ce3ee2abce23`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:589`
- 理想图依据：素材/理想效果图/校园圈.png 横幅左侧绿色学士帽（无白色托盘，图形直接铺在浅底上）
- 现象：帧上实测图标托盘为 #FFFFFF，压在横幅左缘 #E9FAF4 底上，两者相对亮度差 1.04:1，托盘轮廓完全读不出来（只剩一枚深色图形悬在浅底上）；根因是 :583-590 `.campus-guide__icon` 的 `background: var(--c-bg-container, #FFFFFF)`。理想图该位置没有托盘、学士帽为品牌绿。
- 建议改法：托盘底改为 transparent（或 --c-brand-100 让图形有底），图标着色改走 --c-brand 族，与理想图层级一致。
- 修复类别：CSS/token

### R11-L04-D18　P2 / 位置　批次 R11-B28
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`033bb4cbc90e3653`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:760`
- 理想图依据：素材/理想效果图/校园圈.png 学校卡首行「校名 + 认证胶囊」恒同排（含 8 字的「中国人民大学圈」）
- 现象：帧上实测同一列表里「未认证」胶囊有两个档位：清华大学圈 / 复旦大学圈 / 同济大学圈 与校名同排（胶囊 x=195..242），中国人民大学圈 / 上海交通大学圈 掉到第二行（胶囊 x=117..164、y 比校名行低约 26px≈52rpx），5 张卡 2 张换档，卡高随之不齐。根因是 :760 `flex-wrap: wrap` 让胶囊整体让行，而 :770 校名 30rpx + :785 胶囊内衬 14rpx 在卡内可用宽里放不下 7 字校名；理想图同位 8 字校名仍与胶囊同排。
- 建议改法：收窄胶囊左右内衬或把校名档降到 28rpx，使 8 字校名 + 胶囊能在首行并存；保留 wrap 作为极端长名的兜底。
- 修复类别：单页

### R11-L04-D19　P3 / 文案　批次 R11-B28
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`033bb4cbc90e3653`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:89`
- 理想图依据：素材/理想效果图/校园圈.png 中国人民大学圈数据行「2.1k 位同学 · 9,823 条动态」
- 现象：帧上同列数字混用三档缩写：「2.6k 位同学 · 2.1w 条动态」（清华）、「2.1k 位同学 · 9.8k 条动态」（人大）、「1.8k 位同学 · 1.5w 条动态」（复旦）——理想图对同一所人大圈写的是原样数字「9,823 条动态」，工程侧 :89 却写成 9.8k。千/万两档在同一行、同一列里自由切换，读数无法横向比较。
- 建议改法：定一条阈值口径（如 ≥1w 才用 w 档、其余原样千分位），把 :87-97 的字面量按该口径重排。
- 修复类别：单页

## subpackages/campus/campus/index（2 条）

### R11-L05-D01　P2 / 可达性　批次 R11-B29
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`ce5c9f1dc53244b0`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:683`
- 理想图依据：无基准，依据=规范文档§1.4（--sp-*/热区收口口径）+ 本仓已采信标准（同页 index.vue:631 的 R10-L05-D01 注记写明「低于 88rpx/44px 热区标准」）
- 现象：分类 Tab 行（「课程交流 / 社团招新 / 校园活动 / 学习互助 / 生…」）单片热区实测 = padding 18rpx×2 + 26rpx 标签行高 ≈72rpx（帧上「社团招新」胶囊 y≈543..577，34px≈53rpx），低于本仓 88rpx 标准 16rpx 以上；因默认分类已有可见列表、切类不是必经动作，按口径降 P2。
- 建议改法：给 .category-tab 补 min-height:88rpx + box-sizing:border-box（与 index.vue:637 .cert-guide-card__btn 同一条写法）。
- 修复类别：单页

### R11-L05-D04　P2 / 位置　批次 R11-B29
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`995cca25fa03b1fb`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:842`
- 理想图依据：无基准，依据=规范文档§3.13 作者行口径（头像 + 昵称 相邻成组）
- 现象：.topic-card__footer 用 justify-content:space-between 排 3 个子节点（头像 40rpx / 作者名 / 回复胶囊），帧上「远山」被推到整行正中：头像右缘 x≈52 到「远山」左缘 x≈215 之间空出约 254rpx，作者名与头像不成组，读起来像行中间的孤立标签。
- 建议改法：把头像与作者名包进一个 .topic-card__author-group（display:flex;align-items:center;gap:8rpx），页脚只留 group 与回复胶囊两端对齐。
- 修复类别：单页

## subpackages/campus/campus/post-topic（2 条）

### R11-L05-D06　P1 / 可达性　批次 R11-B30
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`9bfe1039ad19d739`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:757`
- 理想图依据：无基准，依据=本页源码自述（post-topic.vue:464「页顶常驻可读原因 + 唯一出口『去认证』」）+ 本仓 88rpx 热区标准（index.vue:631、certification.vue:506 两处 R10 同口径收口注记）
- 现象：顶部提示条「校园话题仅限本校已认证同学发布，请先完成校园认证」右侧的「去认证」胶囊热区实测 = padding 12rpx×2 + 22rpx 标签 ≈51rpx（帧上胶囊 y≈105..133，28px≈44rpx），比 88rpx 标准少 37rpx；用户拿不到的是：未认证态下这是全页唯一的前进出口（不点它就只能空着一个填不动的表单），按 P1 口径「必点控件热区 <88rpx 且没有替代出口」成立。
- 建议改法：.cert-banner__btn 补 min-height:88rpx + box-sizing:border-box（照抄 index.vue:633-637 的 flex 居中写法），标签字号 22rpx 一并提到 24rpx。
- 修复类别：单页

### R11-L05-D08　P1 / 层级遮挡　批次 R11-B30
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`3c05f6f06393b1bb`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:719`
- 理想图依据：无基准，依据=规范文档§3.14 逐页布局清单（本页应有：正文输入 → 添加话题 → 图片九宫格 → 匿名/可见性选项 → 底部提交条）
- 现象：bottom 帧与 top 帧内容逐像素同图（取景清单 sameAsTop=true，字节差 42B 只来自状态栏时钟 3:36→3:37），帧底「+ 添加图片」瓷片被视口下缘横向切掉一半 ⇒ .post-body 只有 flex:1 没有 min-height:0，在 .post-page{height:100%;overflow:hidden} 下被内容撑高后由父级裁掉，用户拿不到的是：话题选择区（:560 .topic-selector-section）、匿名开关（:565 .options-section）与底部提交条（:583）整块不可见且滚不到。certification.vue:551-556 的 R6-L06-D15 对同一机理（同页 .cert-body）已判过并补了 min-height:0，本页漏改。
- 建议改法：.post-body 补 min-height:0 + box-sizing:border-box（逐字照抄 certification.vue:556/:560 两条修复）。
- 修复类别：单页

## subpackages/campus/campus/topic-detail（2 条）

### R11-L05-D10　P2 / 空态文案　批次 R11-B31
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`ce560db0c400e44f`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:327`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue:6-9（type 预设 + 显式 title/description/actionText 优先级）+ 规范文档§6 第 4 条同类先例（深链无参时「空态提示可再友好」）
- 现象：整页只有一句「话题不存在或已被删除」（帧上 y≈558..580 单行）+ 一枚 120rpx 空箱图标 + 「返回」胶囊：本页 v-else-if="!loading" 把「URL 未带 topicId 直开」（:143 topicId="" → :150 只弹一次 toast，不请求）与「话题真被删除」合并成同一句断言，用户拿不到的是——无法分辨是自己链接错还是内容没了，且这条分支没有重试、也没有回「校园话题列表」的出口（只有 goBack）。
- 建议改法：按 :143 的 topicId 是否为空拆两条文案（无参=「链接不完整，请从校园话题列表进入」+ 去列表出口；有参查不到=保留现文案 + 重试），复用 EmptyState 的 :action-text 第二出口。
- 修复类别：单页

### R11-L05-D11　P2 / 可达性　批次 R11-B31
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`ce560db0c400e44f`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:410`
- 理想图依据：无基准，依据=本仓 88rpx 热区标准（certification.vue:506 R10-L05-D09 同页同构件收口注记）
- 现象：页头「返回」胶囊热区实测 = padding 12rpx×2 + 28rpx 标签 ≈68rpx（帧上 x≈18..78 / y≈88..118，高 30px≈47rpx），比 88rpx 少 20rpx 以上；同域 certification.vue:512 的同一个页头返回件在 R10 已补 min-height:88rpx，本页漏改。因正文空态那颗返回按钮（EmptyState.vue:224 min-height:88rpx）可作替代出口，按口径记 P2。
- 建议改法：.detail-header__back 补 min-height:88rpx + display:flex 居中，与 certification.vue:509-515 逐字同档。
- 修复类别：单页

## subpackages/chat/chat-session/index（4 条）

### R11-L11-D15　P0 / 空态文案　批次 R11-B32
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`c001e42c88907dbc`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:980`
- 理想图依据：无基准，依据=规范文档§3.7（顶部应为「对方头像/昵称/相识天数」真实关系数据）+ 组件规范 ChatHeader；画面实测为页头 x63-207 / y47-86 整条身份带
- 现象：本帧是 sessionId 缺失的错误态（正文实测唯一一句「缺少会话标识，请从聊天列表或匹配结果进入。」，:790 落 `chat.missingSessionId`，会话根本没解析成功），但页头照样断言了一整套关系数据：粉色「认识 1 天」（实测墨带 x147-207 / y52-63）由 :980 `if (!sessionId.value) return 1;` 前端自造，「离线」（:1962 把初值 null 折叠成 false → ChatHeader.vue:110 无条件渲染），再配一枚固定第三人头像（:1562 兜底 `AVATARS.AVATAR_3` = assets/images/avatars/person-03-avatar.png，实测 x63-103 / y47-86）与写死标题「聊天」（:938 `t("chat.chatTitle")`）⇒ 用户拿到的是「和某个人认识了 1 天、对方离线」的假关系读数，而实际上一段会话都不存在，据此判断该不该等对方回复直接被误导。
- 建议改法：错误态整条身份带按 :998 `relationshipInfo` 已确立的「宁缺毋造」口径整段不渲染（relationDays/online 收成正值、null 时由 ChatHeader 侧整块隐藏，:975-978 已记为 NOT-FIXABLE-HERE→F2），头像与昵称取不到真值时连同「认识 N 天/在线状态」一起撤下，只留返回与错误提示。
- 修复类别：单页

### R11-L11-D16　P2 / 位置　批次 R11-B32
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`c001e42c88907dbc`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2057`
- 理想图依据：无基准，依据=规范文档§3.7 四段结构（顶部导航→关系状态区→消息流→输入区）+ §1.5 组件库清单（基础 common 含 ErrorState · StatusState）；画面实测为错误提示行的落位
- 现象：错误提示用裸 `<view class="meta-copy meta-copy--padded">` 渲染，实测贴在页头正下方 y110-122、左缘 x14（`--sp-4`=8px 内缩，域内其它页统一 16px `--page-padding`），其下 y122-730 共 608px 是一整块无内容的浅绿空白 ⇒ 提示既没有按 §1.5 走 ErrorState/StatusState 组件（无图标、无动作位），也没有落在它所指代的空消息区中央，用户视线从页头扫下来会先错过这行小字。
- 建议改法：错误态改用既有 ErrorState/StatusState 组件在消息流区垂直居中展示（左内缩随域内 16px 口径），把 :2166 的返回动作与它合成一组，不留 608px 空档。
- 修复类别：单页

### R11-L11-D17　P1 / 素材缺失　批次 R11-B32
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`7acf15988269e693`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2166`
- 理想图依据：规范文档§3.7 聊天会话（`全站设计规范与逐页设计稿说明.md` :201 布局四段与 :203 组件清单点名「输入栏（语音/文字/表情/加号）+ 发送」，组件 ChatInput）；画面实测为页底 y730-814 输入区带
- 现象：本帧页底白色输入条（实测 y730-814，84px 高）里只剩一枚「返回」胶囊（实测 x161-217 / y733-776），§3.7 点名的语音/文字/表情/加号/发送五件套 0 件在场（`:v-if="pageErrorMessage"` 把 :2178 起的整个 `<template v-else>` 输入区一并裁掉）⇒ 用户在这页既发不了消息，也没有任何「重新选择聊天对象 / 重试」的出口，唯一动作是返回；页头却仍按可聊状态渲染（见 D15）。
- 建议改法：错误态输入区保留一条动作出口（复用页面既有 `openAppPath` 去消息列表 / 或 `loadSession` 重试），把「返回」与该动作并排放进 `.chat-input-error`，不要让 84px 输入带只挂一颗胶囊。
- 修复类别：单页

### R11-L11-D18　P2 / 可达性　批次 R11-B32
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`7acf15988269e693`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2671`
- 理想图依据：无基准，依据=规范文档§1.2（`--c-brand-700` 深色档用途=按压态·深色文字）+ §1.3（辅助 14/15px）；画面实测为页底「返回」胶囊标签
- 现象：「返回」标签取 `--c-brand-700` 压 `--c-bg-brand` 浅绿底，帧实测墨色 (19,134,98)、底色 (232,251,242) ⇒ 4.23:1，落在 3:1–4.5:1 之间、差 0.27 未达正文 AA；字号 `--fs-lg`=14px/600（:2669-2670）不享大字号豁免，而这颗键是本帧唯一出口。
- 建议改法：标签色抬一档到 `--c-brand-800` #156B51（design-variables.scss:267，同底实测约 5.9:1，配方与 dnd.vue:805、AppShell.vue:383 一致），底 `--c-bg-brand` 不动。
- 修复类别：CSS/token

## subpackages/chat/official-chat/index（6 条）

### R11-L11-D19　P1 / 可达性　批次 R11-B33
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`4c48c645f4ac3c51`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:797`
- 理想图依据：无基准，依据=规范文档§1.2（占位/弱文字最低取 `--c-text-placeholder` #9AA39F）+ §1.3（小字 13/12 用于时间戳）；画面实测为消息流中缝的时间戳「8月26日 06:16」
- 现象：时间戳色值硬写 `#bbb`（未过令牌），实测该字带 y464-474 最暗墨像素仅到 (196,196,196)，压页面底 #EEF7F2 = 1.60:1（按 CSS 原值 #BBB 算也只有 1.76:1），字号 `--fs-base` 档以下（22rpx=11px，:796）⇒ 用户拿不到消息时间，无法判断这批助手推送是今天还是几天前的（帧上唯一一条时间戳正好承担分组作用）。
- 建议改法：`.msg-time__text` 改 `var(--c-text-tertiary)` #6B7571（压 #EEF7F2 实测 4.36:1，与私聊页时间档同轨）并把字号抬到 `--fs-md` 26rpx，去掉私有色值。
- 修复类别：CSS/token

### R11-L11-D20　P2 / 尺寸比例　批次 R11-B33
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`4c48c645f4ac3c51`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:710`
- 理想图依据：无基准，依据=规范文档§3.7 会话页四段结构（顶部导航→关系状态区→消息流→输入区，消息流为主区）；画面实测为导航条与消息流之间的吉祥物英雄区
- 现象：英雄区（实测 y83-270，高 187px=23% 屏高）在 `.chat-body` 里以 `flex-shrink: 0` 常驻，不随消息流滚动，把可视消息带压到 y270-730 共 460px（实测一屏只装得下 5 条气泡 + 1 条顶边被裁的气泡）⇒ 会话页的主区（消息流）被一块非消息、非导航的品牌装饰挤掉近三分之一，历史消息要反复推屏才看得完。
- 建议改法：把英雄区移进 `.chat-scroll` 内作为首块随消息滚走（或给它 `max-height` + 折叠态），让消息流拿到导航与输入栏之间的全部高度。
- 修复类别：单页

### R11-L11-D21　P2 / 可达性　批次 R11-B33
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`4c48c645f4ac3c51`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:662`
- 理想图依据：无基准，依据=规范文档§1.2（深色文字取 brand-600/700 档）+ §1.3（极小 10/11 用于角标）；画面实测为标题右侧「官方」角标
- 现象：「官方」角标文字硬写 `#1F9A75`（非令牌，仓内既有档是 brand-600 #2AAE83 / brand-700 #1F8D6A），压白底实测 3.54:1，字号 20rpx=10px（:661）已到 §1.3 极小档下沿 ⇒ 10px 小字 + 3.5:1 让这枚决定「这是官方号还是真人」的可信度标记几乎读不出笔画（帧实测角标位 x210-242 / y45-69，整块只有 25px 高）。
- 建议改法：角标文字改 `var(--c-brand-800)` #156B51（白底 6.45:1，design-variables.scss:267 既有档），描边保留 `--c-brand`，字号抬到 `--fs-xs` 22rpx。
- 修复类别：CSS/token

### R11-L11-D22　P2 / 层级遮挡　批次 R11-B33
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`4c48c645f4ac3c51`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:618`
- 理想图依据：无基准，依据=规范文档§1.6 mp-weixin 渲染铁律（原生层与页面层不得互压）+ 组件规范 ChatHeader（同仓已有胶囊避让配方）；画面实测为导航条右侧自绘「···」位
- 现象：`.nav-bar` 只给 `padding: 0 24rpx`（:598），`.nav-right` 以 `justify-content: flex-end` 贴右缘 ⇒ 自绘「···」盒落在 x326-366；帧实测微信原生胶囊占 x288-368 / y50-78（胶囊三点墨色实测 x300/308/316，⊙ 实测 x348-356），自绘盒整块被原生层盖住（实测该带内除胶囊墨迹外无页面自绘点）⇒ 会话设置入口不可见不可点。同仓 ChatHeader.vue:125-129 已按实测胶囊左缘注入 padding-right 解决过同一问题，本页自绘导航没接同一口径。
- 建议改法：本页导航右侧预留与 ChatHeader 同款的胶囊避让（用 useMenuButtonRect 量到的 rect.left 反推 padding-right），或干脆复用 ChatHeader 承载页头，不再自绘第二套导航。
- 修复类别：单页

### R11-L11-D23　P1 / 可达性　批次 R11-B33
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`4c48c645f4ac3c51`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:967`
- 理想图依据：无基准，依据=规范文档§3.7（输入栏为该页点名模块）+ 组件规范 ChatInput；画面实测为页底输入栏三枚控件
- 现象：输入栏三枚控件全部低于 88rpx：表情与「+」宿主 `width/height: 64rpx`（=32px，:967-968），发送键 `height: 72rpx`（=36px，:1031，帧实测胶囊 x314-364 内标签墨带 y749-760）；表情面板只有 :540 这一枚入口（`toggleEmojiPanel`）、「+」只有 :543 一枚（`onPlusTap`），页内无替代出口 ⇒ 用户想插入表情只能命中 32px 目标。
- 建议改法：`.input-bar__icon` 抬到 `min-width/min-height: 88rpx`（图标 40rpx 不动），`.input-bar__send` 高度补到 88rpx，与私聊页 ChatInput 同轨。
- 修复类别：CSS/token

### R11-L11-D24　P2 / 尺寸比例　批次 R11-B33
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`4c48c645f4ac3c51`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:822`
- 理想图依据：规范文档§3.7 气泡规格（`全站设计规范与逐页设计稿说明.md` :204「max-width 58% · padding 14/22rpx · 圆角 20rpx + 尾 4rpx」）+ 令牌 `--bubble-max-width: 58%`（design-variables.scss:646）；画面实测为助手气泡体量
- 现象：本页自绘 `.msg-content { max-width: 70% }`，帧实测助手气泡宽 246px（x57-302，占屏 65%），比 §3.7/令牌规定的 58%（=219px）宽 27px，长句气泡右缘几乎贴到屏边；同时 `.bubble { border-radius: 24rpx }`（:832）四角等圆，缺规格里的 4rpx 尾角（`--bubble-radius-main` 20rpx，design-variables.scss:649）⇒ 同一站两套气泡规格，与私聊页 ChatBubble 并排看宽窄、圆角都不同轨。
- 建议改法：`.msg-content` 的 max-width 改 `var(--bubble-max-width)`，圆角改 `var(--bubble-radius-main) var(--bubble-radius-tail) var(--bubble-radius-main) var(--bubble-radius-main)`（左行取镜像档），或直接换用 ChatBubble 组件。
- 修复类别：CSS/token

## subpackages/circles/circles/circle-home（3 条）

### R11-L04-D12　P1 / 需新建　批次 R11-B34
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`70a1c30adee666fc`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:146`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 封面下沿一排 4 枚深色胶囊「摄影技巧 / 风景拍摄 / 人像写真 / 城市漫游」
- 现象：帧上封面带从「等 12 位朋友已加入」直接收到页签行，理想图那排 4 枚标签胶囊整块不存在。根因是 :145-147 `circleTags` 在 real 模式恒返回 `[]`（注释：后端无圈子标签字段），:568 `v-if="circleTags.length"` 于是连容器一起不渲染；样式侧 :1003-1020 已按理想图配好深色玻璃胶囊，属纯数据缺口。用户拿不到圈内分类入口，理想图明确要求的模块缺失。
- 建议改法：后端补 circle tags 字段并映射进 CircleItem，:146 改为优先读真实字段（mock 兜底保留），无字段时也不要静默吞掉整排。
- 修复类别：需新建目标功能

### R11-L04-D13　P1 / 需新建　批次 R11-B34
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`70a1c30adee666fc`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:155`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 白 sheet 首行「置顶」绿徽章 +「【圈规】友善交流，尊重原创，分享美好瞬间」+ 右箭头
- 现象：帧上页签行下面直接是第一条动态，理想图/规范 §3.11 都要求的置顶公告条整块缺席：:154-156 `pinnedNotice` 在 real 模式恒返回 ""，:591 `v-if="pinnedNotice"` 整条不渲染（注释标注后端圈公告接口 TODO）。用户在本圈首页拿不到圈规/公告，而同一模块在同域 topics.vue:535 却是常显的写死词条——同域两页一档有一档无。
- 建议改法：落圈公告接口并把字段接进 pinnedNotice；接口未就绪期间与 topics.vue 取同一档（要么都显、要么都隐）。
- 修复类别：需新建目标功能

### R11-L04-D14　P1 / 需新建　批次 R11-B34
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`31c5252d5254b891`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:295`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 每条动态互动栏「♥ 256 / 💬 32」「♥ 128 / 💬 18」
- 现象：帧上 3 条形卡（苏奈 / 草莓 / 阿辰）互动栏点赞数全部读作 ♥ 0，同屏评论数却有 1、0、0 的真实差异；根因是 :295 真实数据映射里写死 `likes: 0`（:297 同时写死 `liked: false`），而 stores/circle.ts:38-49 的 BackendCircleTopicView 只有 replyCount、没有点赞字段。用户在本圈首页看不到任何真实热度，且点赞态永远复位。
- 建议改法：后端 CircleTopicView 补 likeCount/likedByMe 并替换 :295/:297 两个字面量；补上前互动栏应隐藏点赞位而不是显示 0。
- 修复类别：需新建目标功能

## subpackages/circles/circles/index（2 条）

### R11-L03-D09　P2 / 颜色token　批次 R11-B35
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`9da790a1f3cdd9cc`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:1026`
- 理想图依据：兴趣圈列表.png（分类 chips 为可见浅灰胶囊，理想图同位实测 #F5F6F6 对卡面有明显明度差）
- 现象：非活跃分类 chip 底 --c-bg-surface #F3FAF6（:1026）与浅绿页面底几乎同色，帧上「摄影/旅行/音乐/运动/美食」胶囊轮廓不可辨、读作裸文字，与理想图清晰的灰胶囊组不符。
- 建议改法：非活跃 chip 底与页面底拉开一档明度（如中性 --c-bg-muted / 加可见描边），使分类组可辨。
- 修复类别：CSS/token

### R11-L03-D10　P2 / 尺寸比例　批次 R11-B35
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`62dd40629cddb56d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:648`
- 理想图依据：兴趣圈列表.png（封面为撑满卡片高度的大方形缩略图）
- 现象：圈子封面定尺 144rpx 方形（:648/:649），小于卡片文字块（圈名+简介+统计+好友 4 行）实际高度，帧上封面下方留白、未如理想图那样撑满缩略位，卡片左轻右重。
- 建议改法：封面尺寸随卡片内容高度撑满（如 align-self:stretch + 高度自适应，或提到与理想图同档的方形尺寸）。
- 修复类别：CSS/token

## subpackages/circles/circles/post-topic（4 条）

### R11-L04-D08　P2 / 间距　批次 R11-B36
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`1c4004c9af3b816d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:871`
- 理想图依据：无基准，依据=规范文档§1.4 页边距 `--page-padding` = 32rpx
- 现象：帧上实测四张表单白卡左缘都在 x=13px（≈26rpx，含 1rpx 描边），即页边距只有 24rpx（.post-body `padding: 24rpx`），比规范 §1.4 的 32rpx 少 25%，也比同包 hub.vue:417 的 32rpx 窄一档；输入卡因此比全站栅格宽出一截，跨页对齐被打破。
- 建议改法：.post-body 左右内衬改 `padding: 24rpx var(--page-padding, 32rpx)`。
- 修复类别：CSS/token

### R11-L04-D09　P2 / 文案　批次 R11-B36
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`1c4004c9af3b816d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:529`
- 理想图依据：无基准，依据=规范文档§3.14「正文输入（0/1000）」
- 现象：帧上正文计数器读数「0/500」，来自 :529 `maxlength="500"` 与 :152 `MAX_LENGTH = 500`；规范 §3.14 对发布类正文的统一口径是 0/1000。用户在「发布话题」里写长文会被比广场帖少一半的额度提前截断，且截断提示（:301）也只报 500。
- 建议改法：与 village/publish 对齐到 1000 字（:152/:529 同改），或明确按页种差异化并在词条里写清上限。
- 修复类别：单页

### R11-L04-D10　P2 / 位置　批次 R11-B36
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`6e944a2d3cb0818e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:708`
- 理想图依据：无基准，依据=规范文档§3.14「发布按钮 --c-brand 胶囊（微信导航规范内，非理想图标题右侧位）」——发布出口只应有一处
- 现象：帧上同一个提交动作出现两枚控件且状态互相矛盾：导航标题右侧的白底胶囊读作「发布」（:500-506，禁用态 :850 只把底色换成半透白、字仍是 :859 的深绿 #156B51，看起来完全可点），页面底部的整行按钮读作「发布话题」（:706-714，禁用态 :1277 灰底 #DCE5E2 + 深字，看起来完全不可点）。两枚共用同一 :288 submitTopic，文案还不一致。用户无法判断该点哪个、当前到底能不能发。
- 建议改法：按 §3.14 保留一处发布出口（建议留底部主 CTA），导航胶囊改为不承担提交动作；若两枚都留，禁用态必须同档表达。
- 修复类别：单页

### R11-L04-D11　P1 / 需新建　批次 R11-B36
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`6e944a2d3cb0818e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:601`
- 理想图依据：无基准，依据=规范文档§3.14「→ 添加话题 / 位置 / 提及好友 / 谁可以看 →」模块链
- 现象：页面标题是「发布话题」，但帧上从「发布到」直接跳到「添加图片（可选）」，话题标签区块整块不存在——:601 `v-if="useMock()` 把 .tags-section 关在 mock 档，注释 :598-600 说明 real 模式 createTopic 请求体不含 tags、后端无该字段。用户拿不到任何归类入口，发出去的内容只能落进默认流，与 §3.14 要求的「添加话题」模块缺失一致。
- 建议改法：后端补 tags 字段并接进 createTopic 请求体，随后去掉 :601 的 useMock 门槛；补不上前应在页面明示「暂不支持选择话题标签」。
- 修复类别：需新建目标功能

## subpackages/circles/circles/topic-detail（2 条）

### R11-L04-D06　P1 / 空态文案　批次 R11-B37
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`68b92e9f3a31fd8a`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:414`
- 理想图依据：无基准，依据=src/components/common/EmptyState.vue 组件规范（type 与文案需匹配成因）
- 现象：帧上整页只剩空箱图标 +「话题不存在或已被删除」。成因其实是 :217 取不到 topicId（`query?.topicId ?? query?.id ?? ""`）→ :219 不发请求、:226 只弹一条 toast，errorMessage 恒空 ⇒ :396 的「重试」分支进不去，只能落到 :410-418 这条「已被删除」分支。用户拿不到真实成因（参数缺失 ≠ 话题被删），也拿不到任何自助出口（无重试、无回圈子列表的链接，只有返回）。
- 建议改法：为 topicId 缺失单独一档空态文案（「链接不完整」）并给「返回圈子」+「重试」双出口，或按 :226 的 toast 文案统一驱动 EmptyState 分支。
- 修复类别：单页

### R11-L04-D07　P1 / 可达性　批次 R11-B01
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`68b92e9f3a31fd8a`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:206`
- 理想图依据：无基准，依据=src/components/common/EmptyState.vue 组件规范（.empty-action 为该态唯一动作件）
- 现象：本帧与 top 帧 sha16 完全相同（68b92e9f3a31fd8a，整页无滚动内容），帧上实测本页仅有的两个可点件都低于 88rpx 热区档：导航「返回」胶囊 y=76..107（32px ≈ 63rpx 高 × 93rpx 宽），空态「返回」按钮 y=495..536（42px ≈ 83rpx 高 × 121rpx 宽）。根因是 EmptyState.vue:206-208 的 `.empty-action` 只有 `padding: var(--sp-4) 40rpx`（纵向 8rpx）无 min-height。二者互为唯一替代且都不达标 ⇒ 本页没有任何一个符合 88rpx 的出口，用户脱困全靠系统手势。
- 建议改法：给 .empty-action 补 `min-height: 88rpx` + flex 垂直居中（同 topics.vue:1265 已落地的口径），本页导航返回键同步扩到 88rpx。
- 修复类别：CSS/token

## subpackages/circles/circles/topics（5 条）

### R11-L04-D01　P0 / 文案　批次 R11-B38
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`a9ceb514b4d336f5`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:266`
- 理想图依据：无基准，依据=规范文档§3.11（圈子主页「圈子头图（封面 + 圈名 + 人数/动态）」）+ 同域帧 circle-home__top（同一条摄影圈读数为「等 12 位朋友已加入」）
- 现象：帧上 hero 第 4 行读数为「等 5 位朋友已加入」，该数由 topics.vue:266-269 `5 + (seed % 8)` 按圈 id 字符哈希现算，函数无 useMock 守卫、real 模式照旧伪造（形参 _memberCount 被显式弃用）；同一个摄影圈在 circle-home 帧上读作「等 12 位朋友已加入」（circle-home.vue:252-258 后端 friendJoinedCount 优先、:545 缺值即隐藏）。用户拿不到真实好友加入数，且两页对同一实体给出 5 / 12 两个互斥读数——假计数直接误导「有没有朋友在这个圈」的决策。
- 建议改法：删掉本地哈希推导，改读 circle.friendJoinedCount 并对齐 circle-home.vue:545 的 `count > 0` 才渲染该行。
- 修复类别：需新建目标功能

### R11-L04-D02　P2 / 尺寸比例　批次 R11-B38
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`a9ceb514b4d336f5`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1170`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 顶部封面带（整屏宽、自状态栏起铺满、约 409rpx 高）
- 现象：帧上实测封面本体只占 y=120..242（123px ≈ 244rpx 高），其上还压一条 y=30..118 的纯绿导航带（≈235rpx）；理想图与同域 circle-home（circle-home.vue:754 `height: 440rpx`）同一位置都是自屏幕 y=0 起的全幅封面。封面被导航带挤掉近一半高度，圈子视觉身份在本页明显矮一档。
- 建议改法：本页 .circle-hero 由「绿导航 + padding 撑高的深色卡」改为全幅封面（min-height 440rpx、封面下沿叠 --c-gradient-mask-strong），导航按钮改为压在封面上的透明底图标。
- 修复类别：单页

### R11-L04-D03　P2 / 文案　批次 R11-B38
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`a9ceb514b4d336f5`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:535`
- 理想图依据：无基准，依据=规范文档§3.11「→ 公告条 →」+ 素材/理想效果图/圈子详情，摄影圈参考.png 的「置顶【圈规】…」条
- 现象：帧上公告条读数「【圈规】友善交流，尊重原创，分享美好瞬间」是 topics.vue:535 直接取写死词条 `t('circle.home.pinnedNotice')`，不来自任何圈子数据：任何圈子（摄影/音乐/运动）进本页都显示同一条「圈规」；而同域 circle-home.vue:155 在 real 模式对该字段恒返回 ""、:591 整条不渲染。同一模块两页一档有一档无，且本页这条是冒充本圈公告的固定文案。
- 建议改法：接圈公告字段（后端 TODO），无值时与 circle-home 同口径整条不渲染，不再直接取 circle.home.pinnedNotice。
- 修复类别：需新建目标功能

### R11-L04-D04　P3 / 文案　批次 R11-B38
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`ff7c0ffb87bc3c42`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:600`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级「小字 13/12px 标签·时间戳」+ 同域两页取档一致性
- 现象：帧上卡脚时间戳读作「2026/09/09」（草莓、阿辰两条），同两条动态在 circle-home__bottom 帧上读作「9-09」——topics.vue:600 走 formatCircleTime（绝对日期），circle-home.vue:291 走 relativeTime（短格式/相对时间）。同域两页对同一数据给出三种时间档，用户无法判断哪条更新。
- 建议改法：两页统一消费 relativeTime（>7 天才落日期），本页 :600 换掉 formatCircleTime。
- 修复类别：单页

### R11-L04-D05　P2 / 位置　批次 R11-B38
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`ff7c0ffb87bc3c42`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:685`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png（封面随页面上滚收起、仅页签行吸顶）
- 现象：bottom 帧与 top 帧的导航带 + 封面卡 + 页签行位置完全一致（只有列表区在滚），帧上实测头部固定带占到 y=242（≈480rpx，屏高 29%），单屏只剩 2.5 张话题卡；根因是 :685-687 根容器 `height:100% + overflow:hidden`、:905-906 列表 `min-height:0 + overflow-y:auto` 做成了内滚区，头部不参与滚动。同域 circle-home 的头部会随滚动收起（其 bottom 帧只剩吸顶页签行 + 3.5 张卡）。
- 建议改法：头部随页面滚走、只让 .circle-tabs 吸顶（对齐 circle-home.vue:1040 的 position:sticky 方案），或至少把封面高度收进 D02 的整改里。
- 修复类别：单页

## subpackages/discover-extra/discover/history（3 条）

### R11-L06-D15　P2 / 圆角　批次 R11-B39
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`7044045c68852af0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:367`
- 理想图依据：无基准，依据=规范文档 §1.4 间距/圆角表（卡片圆角 --card-radius = 40rpx = 20px；圆角阶梯 4/8/12/20/24/32/9999）
- 现象：顶部三计数统计卡实测圆角弧高约 7px（帧上白块自 y=107 起、左沿 x 由 20 收到 13 用了 6 行）⇒ ≈14rpx，源码取 var(--r-xl, 24rpx)；无论按实测还是按源码档位，都低于 §1.4 规定的卡片圆角 40rpx，同页 .people-row/列表卡亦为 20rpx ⇒ 全站唯一一张"卡"比列表行还方。
- 建议改法：.stats-bar 改 var(--card-radius, 40rpx)（或明确按列表行档取 --r-lg 并把该卡降级命名为 list-row，别占卡片档）。
- 修复类别：CSS/token

### R11-L06-D16　P3 / 尺寸比例　批次 R11-B39
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`7044045c68852af0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:309`
- 理想图依据：无基准，依据=规范文档 §1.1.3 一令牌一值（同域同名控件必须同档）
- 现象：同一个「页头返回圆钮」在本泳道 5 页里取了 3 档：history 72rpx（:309）、match-success 72rpx（match-success.vue:246）、people 64rpx、likes 64rpx、segment 56rpx；帧上可直接比出 segment 顶帧钮白块 26px（≈52rpx）与 history 顶帧钮白块 35px（≈69rpx）的大小差。三档全部 <88rpx，且无统一令牌。
- 建议改法：抽一枚 --tap-header-back（或直接 88rpx）令牌，五页返回钮同批引用，消掉 56/64/72 三档并存。
- 修复类别：CSS/token

### R11-L06-D17　P2 / 颜色token　批次 R11-B39
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`7044045c68852af0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:264`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（中性文字档全部带绿味：#4A524E / #6B7571 / #9AA39F，表内无纯中性灰）+ §1.1.3 禁止私有色值
- 现象：空态主视觉（type="no-data" 预设空箱）实测取样 RGB(113,113,113)，R=G=B 纯中性灰 #717171，不在 §1.2 任何一档；同帧其余灰字（统计标签 104,114,110 / 描述 54,62,57）均带绿味 ⇒ 唯一一枚脱靶色，且该灰是素材烘焙值、页面 CSS 改不动（R8-L06-D19 换素材时只换了图形没换色档）。
- 建议改法：给 .empty-icon--preset 的归色 filter 补一档把 #717171 压到 --c-text-tertiary 同族（#6B7571），或换一枚带绿味的 box.svg。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/match-success（6 条）

### R11-L06-D01　P0 / 文案　批次 R11-B40
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`c6770b8e0e738b08`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:50`
- 理想图依据：素材/理想效果图/匹配成功页面.png — 副标题区「你和 星野 互相喜欢了彼此」（人名槽位为真实昵称）
- 现象：帧上副标题实测读作「你和 对方昵称加载失败 互相喜欢上了」，昵称槽位直出开发者兜底串；同一状态下 match-success.vue:125 的 goChat 守卫把「立即聊天」拦成 toast（:126），用户既不知道匹配对象是谁、也发不出第一条消息。
- 建议改法：补拉失败时保留可识别出口（用 userId 兜底渲染「TA（@id）」并允许发起聊天，或整页降级为可重试的错误态），不把内部取证串当用户名给用户看。
- 修复类别：单页

### R11-L06-D02　P2 / 颜色token　批次 R11-B11
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`c6770b8e0e738b08`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:494`
- 理想图依据：素材/理想效果图/匹配成功页面.png — 底部主按钮「立即聊天」整块填充色
- 现象：主按钮底色帧上实测取样 RGB(21,107,81)=#156B51（brand-800），理想图同区实测 RGB(33,188,122)=#21BC7A（≈§1.2 --c-brand #36C99A 档），比理想图深两档、明度差 ΔL≈40；按钮仍可见可点（框高实测 44px≈87rpx），故按口径落 P2。
- 建议改法：主按钮底色回到 §1.2 主按钮档 --c-brand，白字不达 4.5:1 时改用理想图同档的深色字或把 brand-600 定为 CTA 档并同步令牌表，别单页压到 brand-800。
- 修复类别：CSS/token

### R11-L06-D03　P2 / 位置　批次 R11-B11
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`c6770b8e0e738b08`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:277`
- 理想图依据：素材/理想效果图/匹配成功页面.png — 两枚头像之间的心形徽标落点
- 现象：帧上实测两枚头像圆 y 跨度 225~337（圆心 281），心形徽标 y 跨度 249~323（中心 286）⇒ 徽标与圆心齐平、骑在两圆水平中线；理想图头像圆心 626、徽标中心 736 ⇒ 徽标应下沉约 108px（折算 ≈95rpx）压两圆下缘内交点。行内 align-items:center 把它锁在了水平中线上。
- 建议改法：给 .match-success__heart 补 translateY（≈96rpx）或把该行改 align-items:flex-end，使徽标中心落在两圆下缘交点处。
- 修复类别：CSS/token

### R11-L06-D04　P2 / 位置　批次 R11-B40
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`c6770b8e0e738b08`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:199`
- 理想图依据：素材/理想效果图/匹配成功页面.png — 右上角仅一枚「扫一扫」线性图标
- 现象：帧上页头右侧并排出现三枚控件：相机圆钮(x≈250)、页内自绘「···」圆钮(x≈293)、系统胶囊「•••|◎」(x≈310~370)；理想图右上只有一枚图标。页内「···」与系统胶囊的 ••• 同形同义且相距仅 17px，点击只弹「分享功能即将上线」toast（handleShare），是重复的假控件。
- 建议改法：删掉页内自绘「···」钮，把分享收进唯一一枚右上图标（对齐理想图的扫一扫位），避免与系统胶囊并排重复。
- 修复类别：单页

### R11-L06-D05　P1 / 需新建　批次 R11-B11
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`590dc7176a45ccbe`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:124`
- 理想图依据：素材/理想效果图/匹配成功页面.png — 头像下方「我们正在分享你们的共同点」白卡（慢跑爱好/音乐品味/电影偏好/生活方式 + 匹配度进度条）
- 现象：底帧整块共同点卡 0 像素：头像行下沿实测 y=350，「立即聊天」上沿 y=664，中间 314px（≈39% 视口高）为空带；理想图该带是整块白卡（占屏高约 24%）。用户在本页拿不到任何「为什么匹配」的依据。根因是 displayReasons 只吃后端真值，而当前链路没有真共同点/匹配度数据源（view-models/match.ts:57 的 buildMatchReasons 只产文案兜底，props.matchScore 缺省即整卡隐藏）。
- 建议改法：补后端真实共同点与 matchScore 字段并接进本页（禁止恢复写死的 90/85/80/79 假百分比），数据未就绪时给一张「共同点整理中」的骨架/说明卡，而不是留 39% 空带。
- 修复类别：需新建目标功能

### R11-L06-D06　P2 / 需新建　批次 R11-B40
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`590dc7176a45ccbe`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:140`
- 理想图依据：素材/理想效果图/匹配成功页面.png — 底部「分享喜悦」出口（上箭头图标 + 文字）
- 现象：底帧「分享喜悦」(墨迹 y≈778~790，距画布底 24px) 与页头「···」钮点击后只弹「分享功能即将上线」toast，页面上没有任何真实分享出口（无 onShareAppMessage / 无分享卡片），庆祝时刻的分享链路整条不存在。
- 建议改法：接 uni.onShareAppMessage + 分享卡片图（带对方昵称脱敏），拿不到真实现前把该入口置灰并标注不可用，不要用 toast 冒充已上线。
- 修复类别：需新建目标功能

## subpackages/discover-extra/discover/matching（2 条）

### R11-L05-D16　P2 / 素材缺失　批次 R11-B10
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`2c02f16b0277b577`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:56`
- 理想图依据：素材/理想效果图/匹配中页面.png「我们正在分析你们的共同点」卡内 4 行行首图标区（理想图为 4 枚同族线性图标，垫 56rpx 圆角浅绿片）
- 现象：四维行图标取的是吉祥物位图（第 1 行 IMAGE_PATHS.MASCOT.STAR、第 3 行 MASCOT.SPARKLE），只有第 2 行是线性图标 ⇒ 帧上「旅行爱好」「电影偏好」两行行首读成两团彩色小色块（各 56rpx 圆片内不可辨识图形），与理想图 4 枚同族线性图标不同族；违反§1.1 原则 4「emoji/装饰位图一律替换为标准 SVG」。
- 建议改法：4 行统一取 src/static/assets/icons/common 下既有线性 SVG（同 :58 的 ICONS_EMOJI.MUSIC 一族），不新建素材。
- 修复类别：单页

### R11-L05-D18　P3 / 文案　批次 R11-B10
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`2b0bf1967c60c95e`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:93`
- 理想图依据：素材/理想效果图/匹配中页面.png 主标题区（y≈230..290 那行大字）
- 现象：主标题帧上实读「正在寻找适合你的 TA」（zh-CN.ts:447 matching.searching），理想图逐字为「正在寻找有缘的Ta...」⇒ 用词不同且理想图带省略号（进行态语气），本页无；副标题「分析彼此兴趣，缘分匹配中」逐字相同，可证差异只在标题这一条。
- 建议改法：与产品确认后把 matching.searching 收口为理想图逐字文案（含全角/半角省略号），或按§6 第 3 条正式登记为文案级已知差异。
- 修复类别：单页

## subpackages/discover-extra/home/segment（4 条）

### R11-L06-D07　P1 / 可达性　批次 R11-B42
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`e014d259b4ce02e5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:216`
- 理想图依据：无基准，依据=Qoder 任务书严重度口径「必点控件热区 <88rpx 且没有替代出口」+ 规范文档 §1.4 间距表
- 现象：帧上实测吸顶页头的返回圆钮白色块为 26×25px（≈52rpx，源码 56rpx），低于 88rpx 热区口径；本页正文全是列表行，返回钮是页内唯一退出件，帧上系统胶囊只渲染「•••|◎」两枚、无返回箭头可替代 ⇒ 手指偏一点就点不到出口。
- 建议改法：.segment-header__back 补 min-width/min-height:88rpx（视觉圆底可仍为 56rpx，用 padding/伪元素撑热区），与 people.vue 的返回钮一并收口。
- 修复类别：CSS/token

### R11-L06-D08　P2 / 文案　批次 R11-B42
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`e014d259b4ce02e5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:166`
- 理想图依据：无基准，依据=规范文档 §1.1.5「除头像/人物照片外视觉元素对照理想效果图 100% 还原」+ 同仓既有兜底 components/home/NearbyPeople.vue:21 userVisibleName
- 现象：顶帧 9 行里 4 行（行1/行3/行4/行9）姓名槽位实测渲染为「演示·中山大学 / 演示·武汉大学 / 演示·南开大学 / 演示·…」，把 QA 种子数据的取证前缀当用户名给真实用户看，且 meta 行再重复一次同校名（「中山大学 · 附近」）。行可点、信息不缺，故按口径落 P2。
- 建议改法：本页渲染昵称前套 NearbyPeople.vue:20 的 DEMO_NAME_PREFIX 剥离兜底（剥空则不编造名字），根因前缀归 seed 数据治理车道。
- 修复类别：单页

### R11-L06-D09　P2 / 字号　批次 R11-B42
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`e014d259b4ce02e5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:336`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表（小字档 --fs-md/base = 13/12px，11px 只留给 --fs-xs 角标·法务）
- 现象：meta 行（「中山大学 · 附近」「浙江大学 · 230km」）字号 22rpx=11px，落在 §1.3 的极小档而非列表辅文档；同页「在线」二字在 R8-L06-D11 已按同一条口径提到 --fs-base(24rpx)，meta 这一行漏收，同一行内两档字号（30/24/22rpx）取档不齐。
- 建议改法：.segment-row__meta 改 var(--fs-base, 24rpx)，与同页 __online 及 people.vue 的 meta 行同批收口。
- 修复类别：CSS/token

### R11-L06-D10　P2 / 可达性　批次 R11-B42
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`1a8a644e581dc9f8`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:342`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（三级文本 --c-text-tertiary #6B7571 / 占位 --c-text-placeholder #9AA39F，无 #C8CFCD 档）+ 非文本图形 3:1 口径
- 现象：底帧 9 行的行尾「›」可点指示符实测最暗像素 RGB(190,195,193) ⇒ 压白卡约 1.8:1，低于非文本图形 3:1；源码令牌 --c-text-quaternary 真值为 #9AA39F（白底 2.59:1，本身已不达），行内写的兜底 #C8CFCD（1.5:1）又与令牌真值不一致，令牌一旦失效会静默变浅。
- 建议改法：「›」改走 --c-text-tertiary #6B7571（白底 4.76:1）并把兜底值改成与令牌同值，全站 53 个 --c-text-quaternary 消费点另车道统一核档。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（8 条）

### R11-L07-D01　P0 / 可达性　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:85`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（除头像/照片外画面须与业务口径一致）+ 页自述 :7「数据概览栏：总浏览量/今日访客/今日浏览量」
- 现象：画面为游客态（列表区被 :406 的「登录解锁完整交友功能」引导整块替换、概览三格读 0/0/0），但「喜欢我的」Tab 右侧仍挂红底角标「1」——该 1 来自 `likedBy.value.length`（mock 人格池，非本人数据），游客拿不到任何一条喜欢记录，却被告知有 1 条，且与同屏概览的 0 直接矛盾（假计数 + 张冠李戴）。
- 建议改法：游客态（`!isUnlocked`）下 `tabItems` 的 badge 一律置 `undefined`，登录成功再按真实 likedBy 计数。
- 修复类别：单页

### R11-L07-D02　P2 / 圆角　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:636`
- 理想图依据：无基准，依据=规范文档§1.4 圆角表「卡片圆角 --card-radius = 40rpx = 20px」
- 现象：顶部三格概览白卡的圆角取 `--r-xl`，实测值 24rpx=12px（design-variables.scss:202），只有规范卡片档 40rpx=20px 的六成，帧上白卡四角明显比同域 love-center 卡（已改 --card-radius）更方。
- 建议改法：`.overview` 的 border-radius 改 `var(--card-radius, 40rpx)`。
- 修复类别：CSS/token

### R11-L07-D03　P2 / 字号　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:536`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「页面主标题 26–28px / 700–800」
- 现象：本页自绘页头标题「喜欢与访客」取 `--fs-4xl`（真值 40rpx=20px，design-variables.scss:568），比 §1.3 页头档下限 26px 低 6px；同泳道另四页走 AppShell `.shell__title` 的 `--fs-7xl` 56rpx=28px（AppShell.vue:405），帧对帧可见「喜欢与访客」比「恋爱中心／帮助与客服／安全中心」小一整档。
- 建议改法：`.page-header__title` 改 `var(--fs-7xl, 56rpx)`，与 shell 页头同档。
- 修复类别：CSS/token

### R11-L07-D04　P1 / 可达性　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:677`
- 理想图依据：无基准，依据=组件规范 BaseTabs/仓内自陈触控下限 AppShell.vue:361「min-height 确保 ≥88rpx(44px)」
- 现象：「喜欢我的／我的访客」两个 Tab 是切换列表的唯一控件，`.tabs__item` 只有 `padding: var(--sp-3) var(--sp-2)`（上下各 12rpx）+ 28rpx 文本行，实测热区高约 63rpx=31px，低于 88rpx 下限 25rpx；页面上没有任何替代出口能进入「我的访客」列表。
- 建议改法：`.tabs__item` 加 `min-height: 88rpx;` 并把纵向 padding 提到 `var(--sp-5)`。
- 修复类别：单页

### R11-L07-D05　P2 / 圆角　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:553`
- 理想图依据：无基准，依据=规范文档§1.4 圆角表「卡片圆角 --card-radius = 40rpx = 20px」
- 现象：游客登录引导白卡的圆角取 `--r-lg`（真值 20rpx=10px，design-variables.scss:201），是规范卡片档 40rpx=20px 的一半，帧上与同卡上方概览卡（12px）又各自一档，三块白卡圆角不同数。
- 建议改法：`.guest-guide` 改 `border-radius: var(--card-radius, 40rpx)`。
- 修复类别：CSS/token

### R11-L07-D06　P2 / 颜色token　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:587`
- 理想图依据：无基准，依据=规范文档§1.2 配色表「主色 --c-brand #36C99A，用途：主按钮」
- 现象：页内唯一主操作「立即登录并完善」的钮面底色取 `--c-brand-800`（真值 #156B51，design-variables.scss:18），帧上呈近墨绿的深按钮，与 §1.2 指定的主按钮档 #36C99A 相差一整条色阶（同域 daily-question「去签到」同病，见 D14）。
- 建议改法：主按钮底改 `--c-brand`（配白字不达 4.5:1 时按 §1.2 取 brand-600 #2AAE83 档，而不是 brand-800）。
- 修复类别：CSS/token

### R11-L07-D07　P2 / 空态文案　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:434`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue（列表空态须自带占位文案）
- 现象：bottom 帧与 top 帧 sha16 逐字节相同（46a3d4f010b68777），整页零可滚——引导卡下缘 y≈433 到 home indicator y≈790 之间约 357px（视口 44%）是纯页面底，无占位、无空态；因为 EmptyState 分支挂在 `v-else-if`，游客态被 :406 的 `v-if="!isUnlocked"` 短路，永远命中不到。
- 建议改法：游客引导卡之下补一条与已登录态同款的 EmptyState/占位文案（或把引导卡撑到列表区高度），消掉半屏空白。
- 修复类别：单页

### R11-L07-D08　P3 / 间距　批次 R11-B43
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`46a3d4f010b68777`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:495`
- 理想图依据：无基准，依据=规范文档§1.4 间距表 + 页自述 :33-34（statusBar 注入改造）
- 现象：`.likes-visitors-page` 的 padding 简写里仍留着 `calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-6))` 作为 padding-top，而 :338 的行内 `paddingTop`（statusBarHeightPx 注入）优先级更高，这条声明从落不了画——是 R8 改造后残留的孤儿间距，改它不影响渲染、不改又会被下一轮误读为生效值。
- 建议改法：把 :495 的 padding 简写拆成 `padding-right/bottom/left`，顶部只留行内注入这一个来源。
- 修复类别：CSS/token

## subpackages/discover-extra/likes/index（2 条）

### R11-L06-D18　P0 / 需新建　批次 R11-B44
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`d20c823e2d73ed8d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:668`
- 理想图依据：无基准，依据=规范文档 §3 逐页说明缺该页 ⇒ 以页面自声明结构（likes/index.vue:673 搜索框 / :698 双 tab 卡 / :728 列表）为交付内容基准
- 现象：帧上标题为「匹配列表」，正文 100% 是复用寻觅页的未登录等待墙（吉祥物 + 6 枚环绕头像 + 4 枚功能图标 + 三枚登录钮），本页应有的「谁喜欢我 / 我喜欢TA」两个 tab、搜索框、列表卡 0 像素出现 ⇒ 用户在这页拿不到任何匹配列表信息。另记：任务书身份前提 A 写「页面未声明门槛」，实测该页在 :668 自带 v-if="!sessionStore.isLoggedIn" 游客墙，帧是游客态所摄，与前提不符。
- 建议改法：给本页做专属游客态（保留 tab 骨架 + 打码头像预览 + 单枚登录钮），并让 QA 帧按登录态取；若产品裁定游客不可进，则该路由应显式声明门槛并跳登录，而不是渲染他页等待墙。
- 修复类别：需新建目标功能

### R11-L06-D19　P2 / 颜色token　批次 R11-B06
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`d20c823e2d73ed8d`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:186`
- 理想图依据：无基准，依据=规范文档 §3.15 未登录等待态「2×2 功能卡（精确匹配绿/聊天互动粉/校园相遇蓝/关系成长紫）…功能卡四色浅底」
- 现象：底帧 y535~605 带内做饱和像素聚类，只有两簇有色：x≈40~119 平均 RGB(61,213,155) 绿、x≈280~359 平均 RGB(253,115,135) 粉；中间两枚（聊天互动 x≈150、校园偶遇 x≈225）0 个饱和像素 ⇒ 渲染为灰。对照 §3.15 的四色档（绿/粉/蓝/紫），第2、3 枚丢色，第4 枚落成粉而非紫。
- 建议改法：4 枚 featureIconSrcs 换成 §3.15 四色档素材（或给 .not-logged__feature-icon 按 index 加 filter 归色到 --c-romance-500 / --c-status-info / --c-purple），别让两枚图标吃 SVG 烘焙灰。
- 修复类别：CSS/token

## subpackages/discover-extra/nearby/people（4 条）

### R11-L06-D11　P1 / 可达性　批次 R11-B45
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`e636c9ec342bf492`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:289`
- 理想图依据：无基准，依据=任务书严重度口径「必点控件热区 <88rpx 且没有替代出口」（同页 R10-L06-D13 已按此口径给 .people-tab 补了 min-height:88rpx）
- 现象：帧上实测页头返回圆钮白色块 30×30px（≈59rpx，源码 64rpx），低于 88rpx；同一控件在同分包内三页三档（segment 56rpx / people 64rpx / history 72rpx）。本轮 R10-L06-D13 把本页 tab 补到 88rpx，却漏了返回钮——返回是本页唯一退出件，帧上胶囊无返回箭头。
- 建议改法：.people-header__back 补 min-width/min-height:88rpx（视觉尺寸不动，撑热区），并与 segment.vue/history.vue 的返回钮取同一档。
- 修复类别：CSS/token

### R11-L06-D12　P2 / 颜色token　批次 R11-B45
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`e636c9ec342bf492`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:343`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（--c-brand-50 #E8FAF3 用途「浅底/氛围」，--c-bg-page #EEF7F2 为页面底）+ §1.1.2 选中态须可辨
- 现象：选中态「附近的人」实测底色 RGB(232,250,243)=#E8FAF3，页面底实测 RGB(238,247,242)=#EEF7F2 ⇒ 两者亮度比 1.01:1（ΔE≈3），选中框的"浅底"与页面底完全同色、不成立块边界；未选中的「同城的人」走白底 #FFFFFF（2.0:1）反而更清楚。两态之间只剩 2rpx（1px）描边在区分。
- 建议改法：选中态底色改 --c-brand-100 #D1F5E7（与 #EEF7F2 拉开一档）或直接给白底 + 品牌色描边，别把 brand-50 压在 bg-page 上。
- 修复类别：CSS/token

### R11-L06-D13　P2 / 文案　批次 R11-B45
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`e636c9ec342bf492`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:242`
- 理想图依据：无基准，依据=规范文档 §1.1.5 + 同仓既有兜底 components/home/NearbyPeople.vue:21 userVisibleName（该组件注释已把此现象判为 R6-L02-D03）
- 现象：顶帧 7 行里 3 行姓名槽位实测为「演示·中山大学 / 演示·武汉大学 / 演示·南开大学」，且这三行同时缺 age 槽位（其余行为「远山 25」「阿辰 20」），三枚标签还完全相同（摄影/阅读/运动）⇒ 同一列表出现两种行式，用户看到的是 QA 取证串而不是人名。
- 建议改法：渲染前套 DEMO_NAME_PREFIX 剥离兜底（同 segment 一并收口），并让 age/标签缺失时行式保持同构（缺项留位不塌）。
- 修复类别：单页

### R11-L06-D14　P2 / 字号　批次 R11-B45
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`da743d0d2c7b9aeb`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:472`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表（列表辅文/小字档 13/12px；11px 属 --fs-xs 角标档）
- 现象：底帧每行第二行 meta（「东南大学 · 附近」「北京师范大学 · 附近」）字号 22rpx=11px，低于 §1.3 列表辅文下限；同页 .people-row__online 已按同一条口径提到 --fs-base(24rpx)（people.vue:467 注释自证），meta 漏收 ⇒ 同一张卡内 30/26/24/22rpx 四档混排，且与 segment.vue:336 同元素同值同漏（同域两页一致地错）。
- 建议改法：.people-row__meta 改 var(--fs-base, 24rpx)，色档保持 --c-text-secondary，与 segment 同批改。
- 修复类别：CSS/token

## subpackages/discover/activities/index（6 条）

### R11-L13-D10　P2 / 位置　批次 R11-B46
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`9a108bcda944d1b9`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:1145`
- 理想图依据：无基准页；依据=§1.4「页边距 --page-padding = 32rpx = 16px」（theme/design-variables.scss:575）——同屏所有块应落同一内容列
- 现象：同一屏出现三套横向内缩。实测卡片列 x=17..361（左右各 16px，即 --page-padding 一档，:766 的 `.activity-row` 走这条线）；但 :1145 `.quick-filters` 又自带 `padding: 0 32rpx 20rpx`，叠在卡片列已有的 16px 之上 ⇒ top 帧「全部」chip 的绿色描边实测起于 x=31，比卡片左缘右移 14px；:681 `.view-toggle-bar` 同理写 `padding: 0 28rpx 16rpx` ⇒ 「列表/日历」切换器右缘实测落在 x≈348，比卡片右缘 x=361 左移 13px。三行控件左右各错开一档。
- 建议改法：:1145 与 :681 的左右内距都归 0（横向对齐全靠外层卡片列），只保留下边距并改吃 `var(--sp-6)`；若确需二次内缩，改 `var(--page-padding)` 而不是 28/32rpx 字面量。
- 修复类别：CSS/token

### R11-L13-D11　P2 / 颜色token　批次 R11-B46
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`9a108bcda944d1b9`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:686`
- 理想图依据：无基准页；依据=§1.2 配色表「输入底 --c-bg-surface #F3FAF6」用于「输入框 · 浅底块」、页面底 --c-bg-page #EEF7F2；§1.1 原则 1「页面间不得出现白/灰断层」的反面即分段控件轨道与页面底色无对比
- 现象：`.view-toggle` 轨道底取 `--c-bg-surface`（#F3FAF6），压在页面底 `--c-bg-page`（#EEF7F2）上，两色逐通道只差 (5,3,4)，实测相对亮度 0.9401 vs 0.9111 ⇒ 对比 **1.03:1**，轨道边界在帧上完全不可辨（本车道用 #F3FAF6±7 与 #EEF7F2±9 两套阈值扫描 y=280..345 带，两者互相串色、无法切出轨道轮廓，即为该读数的直接复现）。结果：选中态「列表」有品牌绿实心块（实测 #1F8D6A 团 x=245..294 / y=204..246），而另一半「日历」只是浮在页面底上的一串深灰字，看不出它是同一个二选一分段控件里的另一档。
- 建议改法：:686 轨道底改与页面底拉开一档的令牌（`var(--c-status-disabled)` #DCE5E2 或 `var(--c-border-light)` 描边 + `--c-bg-container` 白底），使轨道轮廓可见；选中态 `--c-brand-700`（:706）不动。
- 修复类别：CSS/token

### R11-L13-D12　P3 / 字号　批次 R11-B46
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`9a108bcda944d1b9`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:798`
- 理想图依据：无基准页；依据=§1.3 字体层级表（「标签 · 时间戳」= --fs-md/base 13/12px；「角标 · 法务」= --fs-xs/sm 10/11px）
- 现象：活动分类标签「综合」的字号取 `--fs-xs`（20rpx=10px，theme/design-variables.scss:560），落在 §1.3 明确标注给「角标 · 法务」的极小档，比同页正文摘要 `.row-desc`（:829 `--fs-base`=12px）还低两档。帧实测该药丸整高仅 16~17px（y=338..353、y=525..541、y=712..728 三枚同读），是卡片头三个元素（标题 14px / 综合 10px / 「21 人已报名」数字 14px）中唯一掉到极小档的一档。
- 建议改法：:798 改 `var(--fs-base)`（24rpx=12px，§1.3「标签」档），:796 的 `padding: 4rpx 14rpx` 同步改 `var(--sp-1) var(--sp-4)`。
- 修复类别：CSS/token

### R11-L13-D13　P2 / 空态文案　批次 R11-B46
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`ec02a890bd91c69f`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:434`
- 理想图依据：无基准页；依据=§1.5 组件库清单「基础 common · StatusState / EmptyState」的「空态要有可读出口」口径；同页前 3 张卡与后 2 张卡同一字段两种画法
- 现象：报名人数块用 `v-if="(item.enrollmentCount ?? item.enrollCount ?? 0) > 0"` 整块吞掉。bottom 帧实测：同一张列表里「环湖夜走第六期」「秋冬草地音乐会」两张卡的卡片头右侧**完全没有人数位**（卡片头只有「综合」药丸，实测该带 x=249..364 内无人数字墨），而 top 帧前三张卡分别印「21 / 43 / 12 人已报名」。用户在屏幕上无法区分「还没人报名（0）」与「后端没给这个字段」，两种情况画面上都是空白，且没有任何占位或「暂无」文案。
- 建议改法：:434 的条件从 `> 0` 改为「字段存在即渲染」，0 时印「0 人已报名」；若确要区分缺字段，缺值一侧补一条 `t('activities.enrollUnknown')` 之类占位文案（需 F7 加键），不要留空白。
- 修复类别：单页

### R11-L13-D14　P2 / 文案　批次 R11-B46
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`ec02a890bd91c69f`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:449`
- 理想图依据：无基准页；依据=本页页头副标题自陈的承诺「从时间清晰、地点明确的小活动开始」（activities.sectionSubtitle），与帧上实测读数对照
- 现象：时间行直接吐后端原始串 `{{ item.scheduleText }}`，同一列表里混了四种格式：top 帧「周日 10:00-12:00」「3月22日 09:00 集合」「周六 14:00-18:00」，bottom 帧「每周三 20:00 集合，约五公里」「11月8日 周六 19:00-21:30」。5 条里 3 条只有星期没有日期，用户无法判断是哪一天；:319 的 `formatDateLabel` 已能把 YYYY-MM-DD 归一成 `activities.dateLabel`（月+日），但它只服务日历视图，列表侧没接。
- 建议改法：列表侧 :449 也走归一：有 `item.date` 时用 `formatDateLabel(item.date) + 时段`，把星期/时段拆成第二行；后端未给 date 的条目补「时间待定」出口文案，不再原样吐串。
- 修复类别：需新建目标功能

### R11-L13-D15　P2 / 可达性　批次 R11-B46
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`ec02a890bd91c69f`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:897`
- 理想图依据：无基准页；依据=§1.2 配色表「三级文本 --c-text-tertiary #6B7571」+ 任务书 P2 条「次级文字对比落在 3:1–4.5:1」
- 现象：列表收尾提示「没有更多活动了」吃 :897 `--fs-sm`（11px）+ :898 `--c-text-tertiary`（#6B7571），而它压在页面底 `--c-bg-page` #EEF7F2 上（bottom 帧实测该串墨迹 x=154..225 / y=628..638，周围底色 (238,247,242)，最暗像素 (128,138,133)）。按令牌真值算：L(#6B7571)=0.1704、L(#EEF7F2)=0.9111 ⇒ **4.36:1**，低于正文 4.5:1 门槛；按帧上最暗像素读则只有 3.26:1。11px 不享大字号豁免。它是这一屏唯一说明「列表已到底、不是加载失败」的文字。
- 建议改法：:898 的 `color` 从 `var(--c-text-tertiary)` 提到 `var(--c-text-secondary)`（#4A524E，压 #EEF7F2 实测 6.85:1），或把 :723-728 一带的容器补 `--c-bg-container` 白底让文字回到白卡上（压白 4.73:1 达标）。
- 修复类别：CSS/token

## subpackages/discover/discussions/index（4 条）

### R11-L13-D06　P2 / 字号　批次 R11-B47
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`66a78972ebd90f24`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:190`
- 理想图依据：无基准页；依据=§1.3 字体层级表（「正文 · 列表主文字」= --fs-xl/2xl 15/16px；「小字」= --fs-md/base 13/12px，用途写的是「标签 · 时间戳」）
- 现象：讨论条目的摘要正文（如 top 帧 y=378..387 / y=397..406 两行「后门新来的三花小猫求起名，目前候选：汤圆、煤球、布丁，评论区投票～」）实测墨高 10px，对应 :190 的 `--fs-base`（24rpx=12px，theme/design-variables.scss:562）。同页粗体标题（y=354..366 墨高 13px）吃 `--fs-lg`=14px。两句都是要读的散文，却整体落在 §1.3 明确标注为「标签 · 时间戳」的 12px 档，比正文档下限 15px 低三档；这是本页除标题外唯一的可读内容。
- 建议改法：`.row-subtitle` 的 font-size 从 `var(--fs-base, 24rpx)` 提到 `var(--fs-lg, 28rpx)`（14px，§1.3「说明」档），行高 1.6 不动；`.row-title`（:183）同步提到 `var(--fs-xl)` 以保持两级差。
- 修复类别：CSS/token

### R11-L13-D07　P3 / 间距　批次 R11-B47
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`66a78972ebd90f24`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:172`
- 理想图依据：无基准页；依据=§1.4 间距令牌表（--sp-2=8rpx / --sp-3=12rpx，design-variables.scss:548-549）+ §1.1 原则 3「页面只引用 var(--sp-*)」
- 现象：feed-row 的纵向节奏三处全是私值：:172 `gap: 10rpx`、:173 `padding: 22rpx 0`、:166 `gap: 16rpx`。10rpx 与 22rpx 都不在 §1.4 阶梯上（阶梯给 8 / 12 / 16 / 20 / 24rpx），16rpx 虽是 --sp-4 的真值但写成字面量、不经令牌。帧实测：热度药丸带 y=330..339 与标题带 y=354..366 之间空 14px（应为 gap 10rpx=5px + 药丸底内距 4px + 行盒余量），标题带 y=354..366 与摘要带 y=378..387 之间空 11px，读起来三种间距互相不齐。
- 建议改法：:166 改 `gap: var(--sp-4)`、:172 改 `gap: var(--sp-3)`、:173 改 `padding: var(--sp-6) 0`，全部回令牌。
- 修复类别：CSS/token

### R11-L13-D08　P2 / 字号　批次 R11-B04
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`e9b386ea3fd913be`）
- 源码证据：`apps/client/src/components/common/StatusState.vue:54`
- 理想图依据：无基准页；依据=§1.3 字体层级表（极小档 --fs-xs/sm = 10/11px 的用途只写「角标 · 法务」；「标签 · 时间戳」档是 13/12px）+ §1.5 组件库清单「基础 common · StatusState」
- 现象：bottom 帧上 5 枚热度药丸（y=197..218 / 272..292 / 388..407 / 462..482 / 554..575，均 x=33..105）的标签「9 人参与 / 8 人参与」实测墨高 11px、整枚药丸只有 20~22px 高，对应 :54 的 `--fs-sm`（22rpx=11px，theme/design-variables.scss:561）。这枚药丸是讨论列表里唯一带数量的一行字（后端 heatLabel，帧上 12/10/9/9/8 的排序键就靠它），却被放在 §1.3 只分配给「角标 · 法务」的极小档，比同页 12px 摘要还小一档。
- 建议改法：`.pill` 的 font-size 从 `var(--fs-sm, 22rpx)` 提到 `var(--fs-md)`（26rpx=13px，§1.3「标签」档下限），:52 的 `padding: 8rpx 16rpx` 同步吃 `var(--sp-2) var(--sp-4)`；颜色 `--c-text-warning-dark` 不动（实测压底 6.57:1 已达标）。
- 修复类别：CSS/token

### R11-L13-D09　P3 / 尺寸比例　批次 R11-B47
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`e9b386ea3fd913be`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:174`
- 理想图依据：无基准页；依据=同域两页对同一枚 hairline 取了两种单位（本页 :174 用 1px，LegalTextPage.vue:460 与 feedback/index.vue:817 用 1rpx），按 §1.1 原则 3 应同档
- 现象：行分隔线写成 `border-top: 1px solid var(--c-border-light)`，用的是物理像素而非本仓其余 hairline 统一采用的 1rpx（LegalTextPage.vue:460 `border-top: 1rpx`、feedback/index.vue:817 `border-bottom: 1rpx`、activities/index.vue:954 `border-bottom: 1rpx`）。bottom 帧实测这些线落在 y=313 / 430 / 503..504 / 596 / 670 / 745，色值 (243,246,245)~(250,250,250)，在 375pt 屏上比 1rpx 那一档粗一倍且不能随屏宽缩放。
- 建议改法：:174 的 `1px` 改 `1rpx`，与同域另两页收口成一把尺；feedback/index.vue:868 同批处理（见 R11-L13-D05）。
- 修复类别：CSS/token

## subpackages/legal/agreement/index（3 条）

### R11-L13-D19　P0 / 文案　批次 R11-B02
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`31a93fa748914a23`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:139`
- 理想图依据：无基准页；依据=LegalTextPage.vue:14 自陈契约「顶部展示标题、版本号、最后更新时间」+ 本页为提审合规页（agreement/index.vue:3）
- 现象：与 R11-L13-D16 同一根因在协议页的第二处实测：帧上卡片头只印「最后更新：2026-10-22」（前端现造，config/legal-texts.ts:142），而唯一能揭穿「这是本地兜底文案、不是后台正式文本」的版本号被 :139 `if (legalText.value.version === "local-fallback") return "";` 主动抹掉——注释写的理由是「避免误导用户」，实际效果恰好相反：兜底态被彻底隐藏，一个编造的日期独占整行元信息、以官方口径呈现。用户拿不到「我读的这份用户协议是不是当前生效版本」这个判断依据，等于把兜底文案当成 CMS 正式文本签署。判 P0（数据显示错到误导决策 / 假日期 + 真状态被吞）。
- 建议改法：:139 反过来用：`local-fallback` 时仍出一枚标「本地兜底 · 非正式版本」的提示药丸（走 `--c-warning` 档），同时按 D16 把 :147 的现造日期置空；正式口径只认后端 updatedAt + version。
- 修复类别：单页

### R11-L13-D20　P2 / 文案　批次 R11-B02
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`31a93fa748914a23`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:269`
- 理想图依据：无基准页；依据=帧内正文自陈与帧内控件的对账（协议第 1 条点名的按钮标签 vs 吸底条实际标签），§1.5「基础 common · LegalTextPage」的确认出口唯一
- 现象：协议正文与屏幕上的确认控件不同名。top 帧正文第 1 条印「您通过点击"同意并继续"或开始使用本服务，即视为您已充分理解并同意本协议全部条款」，而本页唯一的确认按钮实测文案是「我已阅读并同意」（:269-271 取 `${i18nPrefix}.accept`，i18n/locales/zh-CN.ts:4733/4741）。仓内确有「同意并继续」这一串（zh-CN.ts:4746 的 `agree` 键），但它不是本页按钮用的键。用户在协议里被指向一个画面上不存在的按钮名。
- 建议改法：让两者同名：要么 :269 改取已存在的 `legal.userAgreement.agree`（需 F7 确认 privacy 侧同键，两页一并改），要么由文案车道（F1/i18n/**）把 zh-CN.ts:4731 正文第 1 条的引号串改成「我已阅读并同意」；本车道只登记，不改 i18n。
- 修复类别：单页

### R11-L13-D21　P2 / 圆角　批次 R11-B02
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`d2ede345a883f55e`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:459`
- 理想图依据：无基准页；依据=§1.4「卡片圆角 --card-radius = 40rpx = 20px」「卡片阴影 --card-shadow」（与 R11-L13-D18 同根因，两页共用 LegalTextPage，故两帧各记一条）
- 现象：agreement bottom 帧沿 x=200 逐像素读，与 privacy bottom 完全同形：白卡内容到 y=711 为止，y=714..718 是 :460 的 1rpx 上描边，其下 :459 的吸底条底色 `--c-bg-container`（白）与卡片白无缝相接，品牌绿按钮 y=722..768。整屏 0 个 `--c-bg-page` 像素落在卡底与条之间 ⇒ :412 的 40rpx 下圆角与 :416 的 `--card-shadow` 在这份协议文末同样一次都没渲染出来，协议正文直接插进确认条。
- 建议改法：与 D18 同一处改动一并收口：:459 吸底条底色改 `--c-bg-page`（与 BottomActionBar.vue:90 同口径），或 :295 的 `padding-bottom` 追加 `var(--section-gap)` 让卡底露出绿底；两页共用组件，改一次两帧同修。
- 修复类别：CSS/token

## subpackages/legal/privacy/index（3 条）

### R11-L13-D16　P0 / 文案　批次 R11-B02
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`c8f29a2540415b30`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:147`
- 理想图依据：无基准页；依据=LegalTextPage.vue:14 自陈契约「顶部展示标题、版本号、最后更新时间」+ §1.2 令牌表（法务元信息为合规页唯一非正文数据行）；本页为微信提审合规页（privacy/index.vue:3「微信小程序提审合规必备」）
- 现象：帧上卡片头唯一的数据行「最后更新：2026-10-22」是**前端在渲染当天现造的日期**，不是这份隐私政策的修订日期。证据链：① :147 `new Date(legalText.value.updatedAt)` 的入参来自 config/legal-texts.ts:142 `updatedAt: new Date().toISOString()`（本地兜底分支，同支 :141 把 version 置为 `local-fallback`）；② :139 遇 `local-fallback` 把版本号返回空串 ⇒ 帧上「最后更新」左侧确实没有任何版本药丸，证明本页走的就是这条兜底支；③ i18n 标签已被清成纯「最后更新」（i18n/locales/zh-CN.ts:4732），日期只剩这一个来源；④ 帧上读数 2026-10-22 与本批帧拍摄日（real-f0677920，2026-10-22 03:57）逐字相同，agreement 帧（03:58 拍）也是同一个 2026-10-22。用户拿不到政策的真实生效/修订日期，只会读到「我打开的这天就是它最后更新的这天」；合规文本的时间戳被前端自造 ⇒ 按任务书「数字/日期在源码里由前端自造即假数据」判 P0。
- 建议改法：:147 的取值链加一条来源判定：`legalText.version === 'local-fallback'` 时 `displayUpdatedAt` 返回空串（:160 的 `showMeta` 随之为 false，整行不出），改由后端 CMS 的 updatedAt 单点供给；不要在兜底支现造日期。
- 修复类别：单页

### R11-L13-D17　P2 / 位置　批次 R11-B02
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`c8f29a2540415b30`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:409`
- 理想图依据：无基准页；依据=§1.4「页边距 --page-padding = 32rpx = 16px」+ LegalTextPage.vue:304-306（R8-L13-D13 定稿口径：header 与正文连成一张「上圆角、左右同吃 --page-padding」的白卡）
- 现象：整张正文卡脱离站点内容列并右移、右侧贴出屏外。实测白卡横向范围 x=33..376（top 帧 y=250/400/550/700 四行同读），左内缩 33px、右内缩仅 **2px**；同批另三页的卡片列实测 x=17..361 / 18..360 / 17..361（左右各 16px）。原因是 :409 的 `margin: 0 var(--page-padding)` 加在已是 `scroll-view` 的 :251 上：左缘被外层内容列的 16px 与自身 16px 叠成 32px，而 scroll-view 宽度按父容器 100% 解析、不随右边距收缩 ⇒ 卡整体右移 16px，右侧 16px 页边距归零，:412 的右下圆角与 :416 的 `--card-shadow` 被推到屏外。正文墨列因此落在 x=49..349，比站点标准内容列 x=33..345 右移 16px。
- 建议改法：:409 去掉左右 margin（`margin: 0`），让卡片宽度由外层内容列决定；若必须留内缩，改 `width: 100%` + `box-sizing: border-box` + 外层包一层带 `--page-padding` 的 view，别把横向 margin 压在 scroll-view 上。
- 修复类别：CSS/token

### R11-L13-D18　P2 / 圆角　批次 R11-B02
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`dc43aa96550fa722`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:412`
- 理想图依据：无基准页；依据=§1.4「卡片圆角 --card-radius = 40rpx = 20px」「卡片阴影 --card-shadow」+ LegalTextPage.vue:400-404（R8-L13-D13 定稿：正文与 header 连成一张带上下圆角的白卡）
- 现象：正文卡的下圆角在帧上从未出现。bottom 帧沿 x=200 逐像素读：白卡内容一路白到 y=711，y=714..718 是 :460 那条 1rpx 上描边，其下 :459 的吸底条底色同为 `--c-bg-container` 白，再往下就是品牌绿按钮（y=722..768）——**中间没有任何一段 `--c-bg-page` 绿**，卡片白与吸底条白连成一片。于是 :412 的 `border-radius: 0 0 40rpx 40rpx` 与 :416 的 `--card-shadow` 没有可分辨的落点，用户滚到文末看到的是「文字直接插进按钮条」，这份 2000px 长文在屏幕上没有可见的结尾。根因是 R9-L13-D08（:286-298 注释）把 `.legal-page` 的 `padding-bottom` 调成与吸底条等高、把绿缝差归零，却没同步处理 :459 的吸底条底色也是白。
- 建议改法：二选一：① :459 吸底条底色从 `--c-bg-container` 改回 `--c-bg-page`（与 BottomActionBar.vue:90 同口径），让白卡下圆角重新可见；② 保留白吸底条，但把 :295 的 `padding-bottom` 再加 `var(--section-gap)`（24rpx），在卡底与条之间留出一段绿底。
- 修复类别：CSS/token

## subpackages/market/detail/index（6 条）

### R11-L14-D01　P0 / 需新建　批次 R11-B48
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`15ed3b9978d44c82`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:306`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单（基础 common 含商品卡/状态件）+ 本页路由名 detail/index（商品详情）承诺的信息层；帧内可见区 0 个商品要素
- 现象：378×814 帧上「商品详情」页整页只有一张封存卡（y119–348），商品大图、价格、规格、库存/销量、购买栏 0 渲染——主操作「立即购买」不可见；`v-if="commerceSealed"` 命中最高优先级分支，而 `commerce.enabled` 缺省即封存（stores/app-config.ts:67 `!== true` 直接 return false），real 档（real-f0677920）从未下发该开关 ⇒ 用户拿不到任何商品信息，也下不了单。
- 建议改法：把 real 档 `commerce.enabled` 置 true（后台 app_switch）或按 ADR-2 明确该页在真档不上线并从入口摘掉，别让用户从商品卡点进一个空壳页。
- 修复类别：需新建目标功能

### R11-L14-D02　P2 / 颜色token　批次 R11-B48
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`15ed3b9978d44c82`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:424`
- 理想图依据：无基准，依据=规范文档§1.1 定论 1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ §1.2 页面底色 --c-bg-page
- 现象：导航条底色实测 #FFFFFF（帧 y≈48–87 整条，采样点 (60,75)/(300,75)/(100,60) 全为 #FFFFFF），其上状态栏与其后页面主体都是 #EEF7F2 ⇒ 页头被压成一条 40px 高纯白横带，正是 §1.1 禁止的白断层；同域 shop 页头是 transparent 叠浅绿、wallet 是深绿，三页三套。
- 建议改法：把 .nav-bar 的 background 从 --c-bg-container 改为 --c-bg-page（或 transparent 让页底透出），阴影改走 --s-* 令牌区分层次。
- 修复类别：CSS/token

### R11-L14-D03　P2 / 可达性　批次 R11-B48
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`15ed3b9978d44c82`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:437`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:207-224（动作件白底+--r-full+min-height 88rpx）与 §1.2 文本/非文本对比档
- 现象：返回盘 background 走 --c-bg-container（#FFFFFF）叠在同样是 #FFFFFF 的 .nav-bar 上 ⇒ 帧内该控件区域（x8–52, y52–98）除字形外 100% 是 #FFFFFF，盘缘仅 #F1F2F3（对白盘 1.12:1），白盘完全不可见；盘内 ‹ 字形实测墨迹仅 6×9px（≈12×18rpx）、色值 #99A8BB，对白盘 2.4:1，低于非文本 3:1 下限。命中盒已扩到 88rpx（:444 ::after）且卡内有绿「返回」钮（实测 54×48px=107×95rpx，#156B51 底白字 6.45:1）作替代出口，故不升 P1。
- 建议改法：页头改浅绿底后给 .nav-bar__back 换 --c-bg-container 白盘+可见盘缘（同 wallet:274 口径），或把 BACK 素材换成 --c-text-primary 档描线，使字形 ≥3:1。
- 修复类别：CSS/token

### R11-L14-D04　P2 / 圆角　批次 R11-B48
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`15ed3b9978d44c82`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:541`
- 理想图依据：无基准，依据=规范文档§1.4 圆角表「卡片圆角 --card-radius 40rpx = 20px」
- 现象：封存卡圆角实测左上角曲率回缩 14px（y0+0 行首个白像素自卡左缘偏移 14px，到 y0+14 才归零）≈ 28–32rpx 档，走的是 :541 --r-xxl 32rpx；§1.4 规定的卡片圆角是 --card-radius 40rpx=20.4px ⇒ 帧上差约 6px，同域 shop 回缩 12px、wallet 回缩 11px，三页同状态卡各差规范档 6–9px。
- 建议改法：三页封存卡 border-radius 统一改 var(--card-radius, 40rpx)，与全站卡片同档。
- 修复类别：CSS/token

### R11-L14-D05　P2 / 位置　批次 R11-B48
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`15ed3b9978d44c82`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:537`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:142-155（同族空态件 R6-L05-D02 已定口径：flex:1 0 auto + justify-content:center，禁止贴顶留大片空白）
- 现象：bottom 帧与 top 帧 sha16 逐字节相同（15ed3b9978d44c82，26462B）⇒ 整页无第二屏可滚；帧实测卡底 y=348，其下 y349–814 共 465px（922rpx，占帧高 57%）是纯 #EEF7F2 空底，卡贴顶锚定——正是 :537 `flex: 0 0 auto` 把基类 .product-state 的 `flex: 1`（:484）覆盖掉所致，与组件规范刚定下的「空态块垂直居中」口径相反。
- 建议改法：.product-state--sealed 去掉 flex:0 0 auto（保留基类 flex:1 + align/justify center），让封存卡落在可视区中线。
- 修复类别：单页

### R11-L14-D06　P2 / 颜色token　批次 R11-B48
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`15ed3b9978d44c82`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:549`
- 理想图依据：无基准，依据=规范文档§1.2 边框/三级文本档 + §1.1 定论 4「emoji 一律替换为标准 SVG」下 SVG 素材需自带可读色
- 现象：锁图标实测墨色均值 #C0C9D5，对白卡 #FFFFFF 只有 1.67:1（bottom 帧同点位复测一致），低于状态图形 3:1 下限——`opacity: 0.55` 把 LOCK_SVG 原色又整体压掉一档；该图标是「为什么这页是空的」的唯一图形线索，帧上已淡到与卡底几乎不分。
- 建议改法：去掉 opacity:0.55，改走 --c-status-disabled(#DCE5E2)/--c-text-placeholder(#9AA39F) 档实色，使图标对白卡 ≥3:1。
- 修复类别：CSS/token

## subpackages/market/shop/index（6 条）

### R11-L14-D07　P0 / 需新建　批次 R11-B49
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`a71c358a6eedde5d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:285`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单 + 本页路由名 shop/index（逛逛/商城）承诺的信息层；帧内可见区 0 个商品要素
- 现象：378×814 帧上「逛逛」页除页头与一张封存卡（y131–307）外整页空白：积分条、5 个分类标签、商品网格、价格 ¥ 0 渲染（`<template v-if="!commerceSealed">` 整段被摘，:32 `isCommerceOn()` 无 module 参 ⇒ 只看总闸，app-config.ts:67 缺省 false）。用户从入口进「逛逛」拿不到任何可逛的内容，也点不到任何商品。
- 建议改法：real 档打开 commerce.enabled 后重拍，或把该页入口在真档摘除；勿保留「有标题无内容」的空壳页。
- 修复类别：需新建目标功能

### R11-L14-D08　P2 / 间距　批次 R11-B49
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`a71c358a6eedde5d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:733`
- 理想图依据：无基准，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx=16px」+ 组件规范 components/common/EmptyState.vue:144（padding: 80rpx 40rpx）
- 现象：同状态卡在两页内边距不同档：本页 :733 `80rpx 48rpx`，wallet :390 `var(--sp-8) var(--sp-6)`=32rpx 24rpx。帧实测两卡内容墨迹块完全相同（图标+标题+说明＝91px 高），卡高却是本页 177px vs wallet 129px，单侧上下内衬差 24px（48rpx）、左右差 12px（24rpx）；且 48rpx 横向内衬比组件规范 40rpx 又多 8rpx。
- 建议改法：三页封存卡内衬统一走 var(--card-padding) 一档（或统一 80rpx 40rpx 对齐 EmptyState），别一页一值。
- 修复类别：CSS/token

### R11-L14-D09　P1 / 可达性　批次 R11-B49
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`a71c358a6eedde5d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:428`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:207-224（空态件标配一个 min-height 88rpx 的可见动作钮）+ §1.2 非文本对比下限 3:1
- 现象：返回白盘（:428 --c-bg-container #FFFFFF）叠在浅绿页头 #E9F5EA 上，实测盘缘像素 #E6EEE9/#EBF4EC（对白盘 1.12–1.18:1）⇒ 底盘边界在帧上完全不可辨，盘内 ‹ 字形实测墨迹仅 7×12px（≈14×24rpx）、色值 #9AA8BC，对白盘 2.4:1（<3:1）。用户实际看到的「退出控件」是 378px 帧上一个 14rpx 宽的淡灰勾。判 P1 而非 P2 的依据：本页封存卡（:377-381）内实测 0 个控件，卡内没有 detail:310-319 那种「返回」胶囊作替代出口，这枚几乎不可见的盘是唯一出口——热区本身已由 :437 ::after 扩到 88rpx=44.4px（所以不是热区问题），坏的是可见性：规范要求存在的可见控件在帧上等于缺失。
- 建议改法：盘底与页头拉开一档实色（或给盘加可见描边 ≥3:1），BACK 素材换成 --c-text-primary 档描线；同时按 D11 在卡内补一个可见「返回」胶囊作替代出口。
- 修复类别：CSS/token

### R11-L14-D10　P3 / 颜色token　批次 R11-B49
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`a71c358a6eedde5d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:405`
- 理想图依据：无基准，依据=规范文档§1.1 定论 1「主题底色统一浅绿 #EEF7F2」+ §1.2 页面底色 --c-bg-page + §1.1 定论 3「一令牌一值，禁止私有色值」
- 现象：页头渐变起点 --c-tint-green-50 实值 #E8F5E9（design-variables.scss:823），帧上页头/状态栏实测 #E9F5EA–#EAF6EC，与全站页底 --c-bg-page #EEF7F2 不是一条值（R 差 5、B 差 8），页头与页身之间有一道肉眼可分的浅绿台阶；同名令牌在 styles/tokens.scss:320 另有一处定义为 #14291D，两处同名不同值，属 §1.1 定论 3 禁止的私有色档。
- 建议改法：页头渐变起点改走 brand-50/--c-bg-page 同族令牌，并清掉 tokens.scss:320 那条同名冲突定义。
- 修复类别：CSS/token

### R11-L14-D11　P2 / 空态文案　批次 R11-B49
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`a71c358a6eedde5d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:377`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单（基础 common 含 EmptyState/StatusState，带动作槽）+ 组件规范 components/common/EmptyState.vue:207-224（空态件自带 min-height 88rpx 动作钮）
- 现象：bottom 帧与 top 帧 sha16 逐字节相同（a71c358a6eedde5d，30968B）⇒ 滚到底无新增内容，卡下 506px（1004rpx，占帧高 62%）为空底。封存卡内实测只有 3 个要素（图标 y173–214 / 标题 y227–240 / 说明 y252–264），0 个可点控件；说明行「该功能暂未开放，开放时间将另行通知」（zh-CN.ts:804）承诺「另行通知」，但卡内没有任何订阅/提醒/留资入口，也没有同域 detail:310-319 那枚「返回」胶囊 ⇒ 文案给出的下一步在页面上不存在。
- 建议改法：按 EmptyState 动作槽补两件事——「开放时间提醒」入口（或摘掉「另行通知」这句无出口的承诺）+ 与 detail 同档的「返回」胶囊钮。
- 修复类别：单页

### R11-L14-D12　P3 / 颜色token　批次 R11-B49
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`a71c358a6eedde5d`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:760`
- 理想图依据：无基准，依据=规范文档§1.2 次文本 --c-text-secondary #4A524E / 三级文本 --c-text-tertiary #6B7571 分档 + §1.1 定论 3「一令牌一值」
- 现象：同一句 sealedDesc 在三页取了两档：本页 :760 与 wallet :419 走 --c-text-tertiary，帧实测墨色 #6C7672（对白卡 4.70:1）、wallet #6B7571（4.76:1）；detail :564 已改 --c-text-secondary，实测 #4E5652（7.56:1）。同域三页同一状态同一行说明，两档色、比值差 2.86，属同域取档不一（未破 4.5:1 故不升 P1）。
- 建议改法：shop/wallet 两处 --c-text-tertiary 与 detail 对齐为 --c-text-secondary，三页同写法。
- 修复类别：CSS/token

## subpackages/market/wallet/index（6 条）

### R11-L14-D13　P0 / 需新建　批次 R11-B50
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`e9b5b0e10b3ff70a`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:162`
- 理想图依据：无基准，依据=本页路由名 wallet/index 与页头标题「我的钱包」承诺的信息层（余额/流水/充值）；帧内可见区 0 个账务要素
- 现象：378×814 帧上「我的钱包」页只有一张封存卡（y115–243）：余额数值、¥ 符号、收支明细、充值入口 0 渲染（:162 `<template v-if="!commerceSealed">` 整段被摘；:34 走 `isCommerceOn("coin")` 双重闸，总闸 app-config.ts:67 缺省 false 即封）。页头标题承诺的是钱包，用户进来拿不到余额、看不到流水、也充不了值——钱包页在真档等于不存在。
- 建议改法：real 档下发 commerce.enabled + commerce.coin 后重拍；未开放前把「我的钱包」入口从 profile 页一并摘除，避免点进空壳。
- 修复类别：需新建目标功能

### R11-L14-D14　P2 / 间距　批次 R11-B50
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`e9b5b0e10b3ff70a`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:390`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:144（padding: 80rpx 40rpx）+ 规范文档§1.4 卡片内边距 --card-padding 32rpx
- 现象：封存卡内衬 `var(--sp-8) var(--sp-6)`=32rpx 24rpx，帧实测卡高 129px（上下内衬各约 19px），而同状态同内容（图标+标题+说明三行墨迹均为 91px）的 shop 卡是 177px（内衬各约 43px）、EmptyState 组件规范是 80rpx 上下内衬 ⇒ 本页比组件规范少 48rpx 上下、16rpx 左右，卡在三页里最扁，说明行几乎贴到卡缘。
- 建议改法：与 shop/detail 取同一档内衬（80rpx 40rpx 或统一 --card-padding），三页一并改。
- 修复类别：CSS/token

### R11-L14-D15　P2 / 尺寸比例　批次 R11-B50
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`e9b5b0e10b3ff70a`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:401`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:157-161（.empty-icon 固定 120rpx×120rpx）
- 现象：锁图标盒 96rpx（:401-402），帧实测墨迹 38×43px＝75×85rpx，比组件规范空态图标的 120rpx 小一档；再叠 :403 `opacity: 0.55` 后实测墨色 #C0C8D5（对白卡 1.68:1），「又小又淡」，作为整页唯一图形线索在 378px 帧上只占 10% 宽。
- 建议改法：图标盒提到 120rpx 与 EmptyState 同档，并去掉 opacity 走 --c-text-placeholder 实色（≥3:1）。
- 修复类别：CSS/token

### R11-L14-D16　P3 / 颜色token　批次 R11-B50
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`e9b5b0e10b3ff70a`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:274`
- 理想图依据：无基准，依据=规范文档§1.1 定论 1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ §1.2 主色深档用途表（brand-600/700 标注用途为「按压态·深色文字」，未含整条页头底）
- 现象：同域三页页头实测三套底色：本页 #156B51 深绿整条（y≈36–90，采样 (60,25)/(100,75) 均 #156B51）、detail #FFFFFF 纯白带、shop #E9F5EA 浅绿带；页头标题字号也两档（本页 :318 与 shop:453 均 --fs-5xl 44rpx=22.2px，实测墨高 19px，detail:465 --fs-2xl 32rpx=16.1px，实测墨高 14px）。三页同为 market 子包同一条业务链，页头不成一套。
- 建议改法：market 三页页头底色与标题字号统一取一档（建议浅绿 --c-bg-page + --fs-5xl，深绿只留给余额卡这类强调块）。
- 修复类别：CSS/token

### R11-L14-D17　P2 / 位置　批次 R11-B50
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`e9b5b0e10b3ff70a`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:251`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:142-155（R6-L05-D02 定论：空态块 flex:1 0 auto + justify-content:center，不得贴顶留大片空白）
- 现象：bottom 帧与 top 帧 sha16 逐字节相同（e9b5b0e10b3ff70a，27052B）⇒ 无可滚内容。:251 给 .wallet 定了 min-height:100vh 却没有任何 flex/居中约束，卡（:389 margin 48rpx 顶）就贴在页头下方：帧实测卡底 y=243，其下 y244–814 共 570px（1131rpx）纯 #EEF7F2 空底，占帧高 70%，是三页里最空的一屏；同时 :389 顶部外衬 48rpx 与 shop:732/detail:539 的 60rpx 又差 12rpx。
- 建议改法：.wallet 改 display:flex; flex-direction:column 并给 .wallet__sealed flex:1 + 居中（同 EmptyState 口径），顶部外衬三页统一一档。
- 修复类别：单页

### R11-L14-D18　P3 / 颜色token　批次 R11-B50
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`e9b5b0e10b3ff70a`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:419`
- 理想图依据：无基准，依据=规范文档§1.1 定论 3「一令牌一值，页面只引用 var(--c-*)，禁止私有色值」+ §1.2 文本色板（次文本 #4A524E / 三级 #6B7571 / 占位 #9AA39F）
- 现象：:419 行内兜底写 `#94a3b8`（蓝灰，非 §1.2 色板值），:252 页底兜底写 `#f4f6fa`（冷灰白）——两处都是无消费者的孤儿字面量：令牌当前有定义所以帧上读不到（实测说明行 #6B7571、页底 #EEF7F2），一旦令牌缺失本页会直接跳成蓝灰族，与同域两页的 #6B7571/#4A524E 兜底不同族；detail:555/shop:752 标题兜底 #1a2332 同样不在 §1.2（主文本实值 #1A1E1C）。
- 建议改法：把这三处行内兜底换成 §1.2 表内同族值（#6B7571 / #EEF7F2 / #1A1E1C）或直接去掉兜底，让 lint 能抓到未定义令牌。
- 修复类别：CSS/token

## subpackages/profile-extra/feedback/history（4 条）

### R11-L11-D11　P1 / 可达性　批次 R11-B51
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`9267c2978936cc40`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:401`
- 理想图依据：无基准，依据=规范文档§1.4（可点控件体量档）+ 组件规范 ChannelTabs/village 频道条；画面实测为「全部/反馈/建议/活动提案」筛选芯片条
- 现象：四枚筛选芯片实测高 31-32px（x17-63 / y186-217 与后三枚同 y 带）=62-64rpx，低于 88rpx 门槛约 24rpx；padding 只给 `12rpx 22rpx`（6px/11px）撑不出热区。这排芯片是本页唯一的筛选出口（反馈/建议/活动提案没有第二个入口，页内也没有下拉或分段控件替代）⇒ 用户想按类型看记录只能命中 62rpx 高的目标。
- 建议改法：`.filter-chip` 补 `min-height: 88rpx` 并把纵向 padding 抬到 `var(--sp-4)`（同仓 EmptyState.vue:224 与 dnd.vue:885 都是这个配方），字号 26rpx 不动。
- 修复类别：CSS/token

### R11-L11-D12　P2 / 文案　批次 R11-B51
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`9267c2978936cc40`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:268`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（副标题=说明文字，应描述本页而非重复空态提示）+ 组件规范 EmptyState；画面实测为页头副标题与空态描述两处
- 现象：同一句「提交反馈后将在此处显示」在本帧出现两次——一次是 AppShell 副标题（:268 取 `feedback.historyEmptyDesc`，实测墨带 y≈150-180），一次是 EmptyState 描述（:305 取同一个键，实测 y≈375）⇒ 页头副标题承担了空态提示的活，用户读到两行一模一样的话，页头没有给出本页真正的说明（列表按类型筛选、点行展开详情）。
- 建议改法：:268 改取 dnd 域已有的说明类键（或新增 `feedback.historySubtitle`，写清「按类型筛选、点击记录查看详情」），`historyEmptyDesc` 只留给 :305 空态。
- 修复类别：单页

### R11-L11-D13　P1 / 可达性　批次 R11-B51
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`9267c2978936cc40`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:418`
- 理想图依据：无基准，依据=规范文档§1.2（`--c-brand` #36C99A 主色/选中态）+ 组件规范 Tag/ChannelTabs；画面实测为选中态筛选芯片「全部」
- 现象：选中芯片底实测 #36C99A（帧采样 (54,201,154) 767 像素），标签走 `--c-text-inverse`（帧内实测纯白 (255,255,255)），白字压品牌绿 = 2.10:1，字号 `--fs-md`=13px/600（:413）不享大字号豁免 ⇒ 用户看不出当前停在哪一档筛选（「全部」两字糊进绿底），而这一档决定下面列出哪些记录。
- 建议改法：选中态改「浅底+深字」这一档（`--c-bg-brand` 浅绿底，帧实测该档约 (232,251,242) + `--c-brand-800` #156B51 字，与 dnd.vue:805 时间值同配方，实测约 5.9:1），或把底压深到能过 4.5:1 的档位再配白字。
- 修复类别：CSS/token

### R11-L11-D14　P3 / 位置　批次 R11-B51
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`9267c2978936cc40`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:266`
- 理想图依据：无基准，依据=规范文档§1.3（页面主标题 26-28px/700 与页头结构）+ 组件规范 AppShell/SectionHeader；画面实测为页头返回件与标题的排布
- 现象：本页页头是「返回胶囊独占一行（实测 x17-82 / y54-94）+ 26px 左对齐大标题在下一行（墨带 y≈100-148）」的纵向结构，而同域另三页都是一行式横向页头：tasks 返回键+标题+完成度同排（y55-81）、dnd 88rpx 居中导航条、official-chat 居中标题+官方角标 ⇒ 同域页头结构两套档，跨页返回件位置从 y68 漂到 y72-88 不等。
- 建议改法：统一走一行式页头（返回件与标题同排、标题按域内口径取居中或左对齐其中一种），AppShell 侧用既有 `variant`/slot 收，不再让单页自堆纵向标题。
- 修复类别：单页

## subpackages/profile-extra/profile/album（4 条）

### R11-L10-D14　P1 / 可达性　批次 R11-B52
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`898a4c0c023ad2db`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:880`
- 理想图依据：无基准，依据=规范文档 §1.2 主按钮角色色 + 仓内同问题收口口径 components/common/EmptyState.vue:219（「深绿实心+白字」全站归一）
- 现象：主按钮「添加照片」帧上逐枚取色：底 (54,201,154)=#36C99A、字形纯白 ⇒ 2.10:1，28rpx 正文级标签远低于 4.5:1。R7-L10-D14 为解决「按钮与空位格、页面底三色同值」只把底从 --c-brand-50 提到 --c-brand，明度拉开了但前景对比一步没动，反而从浅底深字（可达）换成深底白字 2.10:1（不可达）
- 建议改法：:880/:881 底色改 var(--c-brand-800, #156B51)（白字 6.45:1），与 :875 注释点名的 .album-empty__btn / .album-error__retry 及 EmptyState 主 CTA 同档
- 修复类别：CSS/token

### R11-L10-D15　P2 / 颜色token　批次 R11-B52
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`898a4c0c023ad2db`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:832`
- 理想图依据：无基准，依据=规范文档 §1.2（--c-brand 用途=主按钮/选中态/链接，不用于浅底上的图形提示符）+ §1.1 第 3 条一令牌一值
- 现象：五个空位格内唯一标示「此处可上传」的「+」取 --c-brand #36C99A 压格底 --c-brand-50 #E8FAF3（帧上格底实测 (232,250,243)）⇒ 1.94:1，低于非文字图形件 3:1 下限；R10-P3-022 那轮把加号从「浅灰压白」改成品牌绿，只解决了压白底的情形，落到同族浅绿底上仍然几乎不可见
- 建议改法：「+」改用 var(--c-brand-800, #156B51)（压 #E8FAF3 ≈5.9:1）或把格底降到 --c-bg-surface、加号留品牌绿，两色不再同族相邻
- 修复类别：CSS/token

### R11-L10-D16　P2 / 可达性　批次 R11-B52
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`898a4c0c023ad2db`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:906`
- 理想图依据：无基准，依据=规范文档 §1.2（次文本 --c-text-secondary #4A524E / 三级 --c-text-tertiary #6B7571）+ §1.1 第 1 条浅绿底
- 现象：长按提示「长按照片可删除或设为头像」是本页唯一说明删除/设头像手势的一行，取 --c-text-tertiary #6B7571 压在页面底 --c-bg-page #EEF7F2（帧实测底 (226,244,235)~(238,247,242)）⇒ 4.36:1，落在次级文字 3:1–4.5:1 档、不达正文 4.5:1；同域 location.vue 的同行指引文字已在 R10-L10-D11 因同一算法升到 --c-text-secondary（7.37:1），两页同角色两档
- 建议改法：:906 改 var(--c-text-secondary)，与 location.vue:512 已落地的同角色行同档
- 修复类别：CSS/token

### R11-L10-D17　P2 / 字号　批次 R11-B52
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`898a4c0c023ad2db`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:946`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表（正文 15/16px、辅助 14/15px；「极小 --fs-xs/sm 10/11px」用途限定为角标·法务）
- 现象：「照片使用说明」卡内四条规则 + 汇总行全部取 var(--fs-sm)=22rpx=11px（帧上四条正文行墨迹实测行高 10/10/11/11px，行距 24–25px），落在 §1.3 明确限定给「角标·法务」的极小档；这四条是本页唯一的操作契约（张数上限、10MB 上限、轻点/长按手势、头像重审），却比同卡标题（--fs-lg 14px）还小一档半，正文级内容取到了全站最小字级
- 建议改法：:946/:925 的规则与汇总正文升到 var(--fs-lg, 28rpx=14px) 辅助档（卡内标题再升到 --fs-xl），把 --fs-sm 留给真正的角标类
- 修复类别：CSS/token

## subpackages/profile-extra/profile/favorites（4 条）

### R11-L10-D18　P2 / 位置　批次 R11-B53
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`bf53c1efe7f6d60b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:152`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:145-154（R6-L05-D02 要求空态块在「flex 列 + 有可解析高度」的宿主里垂直居中）
- 现象：帧上逐行扫描实测空态内容只占 y=140..297（星标 140..193 / 主句 207..220 / 副句 228..240 / 按钮 253..297），内容中心 y≈218，而视口中心 y=407 ⇒ 整块仍高出中线 189px，y=300..814（514px，屏高 63%）为空薄荷底。R7-L10-D17 声称「补 flex 列 + min-height:100vh 即落在可用区垂直居中」，本帧读数与上一轮完全一致，该半条未生效
- 建议改法：给 .favorites-page 明确 height:100vh（min-height 在 mp-weixin 下不给 flex 子项可解析高度）或让 EmptyState 宿主分支自带 min-height:60vh，改后必须重拍本帧复核 y 中心
- 修复类别：单页

### R11-L10-D19　P1 / 可达性　批次 R11-B53
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`bf53c1efe7f6d60b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:165`
- 理想图依据：无基准，依据=规范文档 §1.4 间距档 + 仓内最小热区口径 AppShell.vue:334 的 88rpx；同域收口先例 location.vue:295、album.vue:664、privacy.vue:258 均已提到 88rpx
- 现象：返回热区 width/height 均为 64rpx（=32px），只有全站 88rpx 口径的 73%；pages.json:49 globalStyle.navigationStyle=custom 且本页 profile/favorites 无覆盖 ⇒ 无系统返回栏，帧上这枚白圆是本页唯一退出口（唯一另一枚「去广场逛逛」是向前跳村口，不构成返回替代），点不中即被困在空态页
- 建议改法：:165-166 提到 88rpx，64rpx 白圆底移进内层 circle，沿用同域 location.vue:294-315 已验证的「热区/视觉分离」配方
- 修复类别：CSS/token

### R11-L10-D20　P3 / 文案　批次 R11-B53
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`bf53c1efe7f6d60b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:43`
- 理想图依据：无基准，依据=规范文档 §3 无该页条目 ⇒ 按组件规范 components/common/EmptyState.vue 的「说明句与动作按钮指向同一目的地、同一称呼」口径
- 现象：空态两行指引对同一目的地给了两个名字——副标题（zh-CN.ts:1628）说「在帖子页点收藏」，紧贴其下的按钮（village.history.backToVillage，zh-CN.ts:1854）说「去广场逛逛」，而 goVillage(:116) 跳的是 ROUTES.TAB.VILLAGE，域内该页正名为「村口／今日广场」（zh-CN.ts:315/2143）。用户按副标题去找「帖子页」会找不到同名入口
- 建议改法：副标题的目的地称呼与按钮、与域内正名取齐（如「在村口帖子页点收藏…」），一处改 locale 键值即可
- 修复类别：单页

### R11-L10-D21　P3 / 间距　批次 R11-B53
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`bf53c1efe7f6d60b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:144`
- 理想图依据：无基准，依据=规范文档 §1.4「页边距 --page-padding = 32rpx = 16px」；同域收口先例 privacy.vue:318 已归 var(--page-padding)
- 现象：页面根容器横向内衬取 var(--sp-6, 24rpx)=24rpx，比 §1.4 页边距档少 8rpx；同域 privacy.vue:318 上一轮已把同角色容器收到 --page-padding(32rpx)，两页收藏/隐私列表卡左右缘相差 8rpx。本帧为空态、列表卡未渲染，故只按同域取档不一致登记
- 建议改法：:144 横向改 var(--page-padding, 32rpx)，与 privacy/location 同档；纵向留 0 不动页头
- 修复类别：CSS/token

## subpackages/profile-extra/profile/location（4 条）

### R11-L10-D06　P1 / 可达性　批次 R11-B54
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`095f2b68b824e138`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:552`
- 理想图依据：无基准，依据=规范文档 §1.2（主按钮角色色）+ §1.3 正文字阶；仓内同问题收口口径见 components/common/EmptyState.vue:219
- 现象：帧上逐枚取色：主按钮「重新定位」底实测 (54,201,154)=#36C99A、字形纯白 = 2.10:1；同帧「地图选点」胶囊（:524 同一条 --c-brand 配方）底字同为 2.10:1；而同行旁边的白底「返回首页」为 #1A1E1C 压白 = 17.17:1。本页两颗唯一改位置出口的主按钮标签都读不出，白底那颗却达标，同页三钮两档
- 建议改法：:552/:524 的底色改 var(--c-brand-800, #156B51)（白字 6.45:1），与 EmptyState.vue:219、BottomActionBar 已归一的「深绿实心+白字」主 CTA 口径取齐
- 修复类别：CSS/token

### R11-L10-D07　P2 / 字号　批次 R11-B54
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`095f2b68b824e138`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:333`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表「页面主标题 26–28px / 700–800（页头标题）」，「标题 --fs-3xl/4xl 18/20px」是区块标题档
- 现象：页头「我的位置」取 var(--fs-4xl)，design-variables.scss:568 真值 40rpx=20px；帧上标题墨迹实测 y=69..85（17px 字面高，对应 20px 字号）⇒ 页头标题落在 §1.3 的区块标题档，比页面主标题档低 6–8px。R6-B57/D10 那批把同域三页统一到 --fs-4xl 只做到「彼此一致」，未对 §1.3 的页头档
- 建议改法：页头标题另立一档（新增/引用 --fs-page-title=52–56rpx），同域 location/album/privacy 三页同批取齐，不再用区块标题档充当页头
- 修复类别：CSS/token

### R11-L10-D08　P2 / 空态文案　批次 R11-B54
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`095f2b68b824e138`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:76`
- 理想图依据：无基准，依据=规范文档 §1.1 第 5 条与 §6 遗留差异口径（不得以布景冒充真值）；本页空态要求见组件规范 components/common/EmptyState.vue
- 现象：零定位事实时（白卡实测「暂无位置信息」+「经度 — · 纬度 —」）地图区仍按写死的 DEFAULT_CENTER(39.9042/116.4074) 渲染一整幅北京街景（帧上可读地名：天安门东、王府井、长安大厦、翰林院遗址），且地图上下无任何一行「默认视图·非你的位置」说明；R10-L10-D09 只摘掉了红针与气泡（帧实测无 marker），视图本体依旧以「你的位置周边」的版式出现，非北京用户会把它读成定位已成功，从而不再点「重新定位」
- 建议改法：无定位事实时在 .location-map__frame 上叠一层「默认视图，尚未取得你的位置」说明条（或按 :86 同口径把地图整块降级为引导卡），有坐标后再出实景
- 修复类别：单页

### R11-L10-D09　P2 / 圆角　批次 R11-B54
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`095f2b68b824e138`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:355`
- 理想图依据：无基准，依据=规范文档 §1.4「卡片圆角 --card-radius = 40rpx = 20px」；同域收口先例 privacy.vue:322 已由 --r-xl(24rpx) 归到 var(--card-radius, 40rpx)
- 现象：本页唯一信息卡 .location-card 圆角裸写 32rpx（16px），既非 §1.4 卡片档 40rpx 也不在 --r-* 阶梯上；同域隐私页两张同类白卡上一轮已归 40rpx，两页同角色容器差 8rpx，profile-extra 域内卡片圆角不成一档
- 建议改法：:355 改 var(--card-radius, 40rpx)，与 privacy.vue:322/:436 同档；顺带把 :469 地图外框的 24rpx 一并登记到 --r-xl 或卡片档
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（5 条）

### R11-L10-D01　P1 / 素材缺失　批次 R11-B16
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`42b5dbb8fb2451c4`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:45`
- 理想图依据：他人显示主页.png 身份卡姓名行「星野 ♀ 在线」= 姓名 + 性别圆徽 + 在线胶囊四元素同排；规范 §3.9 同口径「姓名+♀+在线胶囊」
- 现象：姓名行实测只剩「小新生」一枚文字——在 x=120..370/y=290..370 区域内性别徽底色（#FF6B81 / #54A0FF）命中 0 像素、在线胶囊的 12rpx 品牌绿圆点（#36C99A）命中 0 像素；两枚控件按 :42/:45 的 v-if 整块塌陷、不留占位，用户在本页读不出对方性别与在线状态便要点「喜欢」
- 建议改法：与同文件 :88「资料暂未完善」/ :99「距离待更新」同一口径，性别与在线各给一枚恒渲染的「未填写/未知」占位徽，不再整块消失
- 修复类别：单页

### R11-L10-D02　P2 / 间距　批次 R11-B17
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`42b5dbb8fb2451c4`）
- 源码证据：`apps/client/src/components/profile/public/PublicInterest.vue:36`
- 理想图依据：他人显示主页.png 五张卡左缘成一条竖边；规范 §1.4 页边距 --page-padding = 32rpx
- 现象：帧上逐行取色实测身份卡左缘 x=17px（=32rpx，PublicIdentity.vue:111 已归 --page-padding），而兴趣/共同点/生活瞬间等其余各卡左缘 x=13px（本行 `margin: 24rpx 24rpx 0`）⇒ 同页五张卡差 8rpx、卡缘不成一条竖边
- 建议改法：把 PublicInterest/PublicCommon/PublicGallery/PublicBio 四张卡的横向 margin 由 24rpx 归到 var(--page-padding, 32rpx)，与身份卡同档
- 修复类别：CSS/token

### R11-L10-D03　P0 / 素材缺失　批次 R11-B15
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`6ac5504e1feb3515`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:36`
- 理想图依据：他人显示主页.png「生活瞬间」= 本人 4 张生活照；规范 §3.9 逐字「生活瞬间（4 列正方形网格，无占位）」
- 现象：帧上「生活瞬间」四格与写死常量表逐格同序命中——格1=activities/activity-1.jpg（竹林）、格2=activity-2.jpg、格3=activity-3.jpg（码头鹈鹕）、格4=products/food-1.jpg（麦田落日），四张皆仓内活动/商品装饰素材，与本页主角「小新生」无关；该账号 photoGallery 为空 ⇒ `props.photos[index] || DEMO_PHOTOS[index]` 全格走兜底，:14 自陈的「骨架 ≠ 假数据，不伪造照片 URL」与 :60 的灰骨架分支永不执行。用户拿到的是一整排别人的（实为素材库的）照片并被当作本人生活照呈现，据此判断对方长相/兴趣即被误导
- 建议改法：删掉 DEMO_PHOTOS 这一层兜底，无照片时回到 :60 的灰骨架 +「暂无照片」，或整节按空态呈现；素材库图不得以本人照片身份出现在他人主页
- 修复类别：单页

### R11-L10-D04　P1 / 可达性　批次 R11-B18
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`6ac5504e1feb3515`）
- 源码证据：`apps/client/src/components/profile/public/RelationshipCTA.vue:175`
- 理想图依据：他人显示主页.png 底部固定操作栏三枚（喜欢粉 / 打招呼绿 / 关注描边）文字标签清晰可读；规范 §1.1 第 2 条粉=喜欢、绿=行动的角色色
- 现象：底栏三枚标签帧上逐枚取色：「喜欢」字形实测 (255,108,130)=#FF6B81 压浅粉底 #FCE4EC = 2.27:1、「关注」字形实测 (56,201,154)=#36C99A 压白底 = 2.10:1，两枚 28rpx 正文级标签都远低于 4.5:1；同页身份卡的两枚同名标签已在 R10 分别收到 #B3264A（5.30:1，PublicIdentity.vue:278）与 --c-brand-800（6.00:1，:284），底栏这一处漏改，同一页同一动作两种可读档
- 建议改法：:175 换 #B3264A（与身份卡同值）、:179 换 var(--c-brand-800, #156B51)，沿用本页已验证的两档深色系，不新增色值
- 修复类别：CSS/token

### R11-L10-D05　P1 / 可达性　批次 R11-B14
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`6ac5504e1feb3515`）
- 源码证据：`apps/client/src/components/profile/public/PublicCommon.vue:190`
- 理想图依据：他人显示主页.png「我们有 3 个共同点」次行为灰色说明文字；规范 §1.2 三级文本 --c-text-tertiary #6B7571（占位档 #9AA39F 仅供 placeholder）
- 现象：共同点为空时本页唯一解释句「还没有匹配到的共同点，先打个招呼聊聊看」取 --c-text-quaternary #9AA39F 压白卡，实算 2.59:1 —— 既低于正文 4.5:1，也低于 3:1 非文字底线；同页 :181 的卡内副标题用 tertiary #6B7571（4.76:1）达标，PublicIdentity.vue:308 的「资料暂未完善」上一轮正是为这条理由从 quaternary 升到 tertiary，本行是同一改法的漏网处
- 建议改法：:190 改 var(--c-text-tertiary, #6B7571)，与本页其余说明行同档
- 修复类别：CSS/token

## subpackages/profile-extra/profile/privacy（4 条）

### R11-L10-D10　P1 / 需新建　批次 R11-B55
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`5141440171efd4e3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:29`
- 理想图依据：无基准，依据=规范文档 §3 该页说明缺项 + 本页页尾自陈文案「后端同校推荐策略接入后才会改变实际推荐结果」（帧上实测该四行说明卡已渲染）
- 现象：本页唯一的两枚主控件（「允许将我推荐给本校学生」「接收同校信息」）写入只落 profileStore 本机持久化，后端偏好接口未接入 ⇒ 用户在本页把推荐关掉后，服务端的同校推荐行为一字不变；页尾说明卡如实承认了这一点（未构成误导，故不升 P0），但「隐私权限设置」页的核心交付——改变谁能看到自己——拿不到
- 建议改法：后端补偏好接口（PUT /users/me/privacy-preferences 落 allowSameSchoolRecommend / receiveSameSchoolInfo 两列并在推荐查询侧生效），前端 set 改为写后端 + 失败回滚开关态
- 修复类别：需新建目标功能

### R11-L10-D11　P2 / 可达性　批次 R11-B55
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`5141440171efd4e3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:372`
- 理想图依据：无基准，依据=组件规范 src/components/common/（开关控件需在任意态可辨边界）+ 规范 §1.2 边框档 --c-border-default #DDE3E0
- 现象：OFF 态那枚开关逐像素实测（y=143 一行）：轨道 x=295..321 为纯白 (255,255,255) 压白卡 = 1.00:1，滑块右缘仅一道 (229,229,229) 灰线 = 1.27:1，芯片薄荷底 (226,242,236) 对白色轨道 1.16:1 —— R7-L10-D12 加的芯片只在外面套了一圈描边环，开关本体的轨道/滑块边界仍然不可辨，用户要靠环内白块的位置猜 ON/OFF
- 建议改法：弃用原生 switch 的写死 OFF 轨道色，改自绘轨道（OFF 底取 --c-status-disabled #DCE5E2、滑块白 + --c-border-default 描边），使轨道/滑块边界 ≥3:1
- 修复类别：CSS/token

### R11-L10-D12　P2 / 字号　批次 R11-B55
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`5141440171efd4e3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:296`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表「页面主标题 26–28px / 700–800（页头标题）」
- 现象：页头「隐私权限设置」帧上墨迹实测 y=57..74（18px 字面高 ⇒ 字号 ≈20px），对应 var(--fs-4xl)=40rpx（design-variables.scss:568）；副标题「控制你的信息展示范围」墨迹 y=84..95（12px ⇒ --fs-lg 14px）。页头标题落在 §1.3 的「标题 18/20px 区块标题」档，比页面主标题档低 6–8px，与同域 location 帧实测 17px 同一偏差
- 建议改法：与 location/album 同批把页头标题升到页面主标题档（26–28px），副标题留在 --fs-lg，两级不再同档
- 修复类别：CSS/token

### R11-L10-D13　P3 / 颜色token　批次 R11-B55
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`5141440171efd4e3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:359`
- 理想图依据：无基准，依据=规范文档 §1.1 第 3 条「一令牌一值，禁止私有色值」+ §1.2 色板（--c-text-tertiary #6B7571、--c-bg-page #EEF7F2）
- 现象：两处永不生效的假兜底：:359 写 `var(--c-text-tertiary, #9AA39F)`（tertiary 真值 #6B7571，兜底写成 quaternary 档）、:234 写 `var(--c-bg-page, #f4f6fa)`（真值 #EEF7F2，兜底是 §1.2 没有的蓝灰档）。帧上渲的确实是令牌真值（页面底实测 (238,247,242)、说明行按 tertiary 4.76:1 达标），故画面无偏差，但兜底值会把后续读代码的人引向错误色档；R10-L10-D10 已在同域 location.vue:386/:400/:444 逐条清过同类，privacy 漏清
- 建议改法：删掉这两处兜底色值（或改成与真值逐字相同），与 location.vue 已完成的口径归一
- 修复类别：CSS/token

## subpackages/profile-extra/profile/tasks（5 条）

### R11-L11-D01　P1 / 可达性　批次 R11-B56
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`d5da5241cc134b3b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:666`
- 理想图依据：无基准，依据=规范文档§1.2（`--c-brand` #36C99A 主色）+ §1.3（正文 15/16px）；画面实测为该页 4 张任务卡右下角的主操作胶囊
- 现象：四枚「去完成」胶囊（实测 x296-345 / y191-211，四行各一枚）底为 #36C99A（帧采样 (54,201,154)），标签走 `--c-neutral-0` 纯白（胶囊内实测 397 枚 (255,255,255) 像素），白字压品牌绿实测对比 2.10:1、字号 `--fs-sm`=11px/600（:675-676），远不到 4.5:1 ⇒ 用户拿不到本页唯一主操作的文字内容（看不清是「去完成」还是别的三字动作），只能靠猜。
- 建议改法：标签与底同轨换档——底取 `--c-brand-800` #156B51 实底再配白字（95% 白压 #156B51 约 6:1，配方同 dnd.vue:916 保存键）；注意不要照抄同页 :662 已完成态的 `--c-brand-700` 压 `--c-bg-brand`（实测仅约 3.8:1，同样不过线）。
- 修复类别：CSS/token

### R11-L11-D02　P1 / 可达性　批次 R11-B56
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`d5da5241cc134b3b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:514`
- 理想图依据：无基准，依据=规范文档§1.4 间距/圆角（可点控件档）+ 组件规范 Button；画面实测为页头左上返回键
- 现象：页头返回键 `.tasks-header__back` 宽高各 64rpx（=32px，帧实测白色圆底跨 x18-46、y56-87，扣掉抗锯齿后圆径约 29px），低于 88rpx 门槛 24rpx；本页 navigationStyle 为 custom（:237 注释自证「自定义导航栏返回键，navigationStyle: custom 无系统返回栏」），帧上除这枚小圆键外没有任何其它出口（无 TabBar、无底部操作栏）⇒ 用户想离开这页只能命中一个 64rpx 的目标。
- 建议改法：给 `.tasks-header__back` 补 `min-height: 88rpx; min-width: 88rpx;`（同仓 AppShell.vue:362-363 的 `.shell__back` 已是这个配方），40rpx 图标尺寸不动、只放大热区。
- 修复类别：单页

### R11-L11-D03　P2 / 尺寸比例　批次 R11-B56
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`d5da5241cc134b3b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:648`
- 理想图依据：无基准，依据=规范文档§1.4（`--sp-*` 间距档）；画面实测为任务卡右侧状态胶囊体量
- 现象：「去完成」胶囊实测 50×21px（x296-345 / y191-211）=100×42rpx，高度只有 88rpx 门槛的一半；padding 只给 `var(--sp-2) var(--sp-5)`（4px/10px），11px 字撑不出可点体量 ⇒ 与 D02 同页第二处小热区（此处因整行 :453 `@tap="handleTaskTap(task)"` 可点，尚有替代出口，故只记 P2）。
- 建议改法：`.task-item__status` 补 `min-height: 88rpx`（靠既有 flex 居中保持视觉位置），或把纵向 padding 抬到 `var(--sp-5)`，与 :662 已完成态同一套体量。
- 修复类别：CSS/token

### R11-L11-D04　P2 / 文案　批次 R11-B56
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`d5da5241cc134b3b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:283`
- 理想图依据：无基准，依据=规范文档§1.1 规则4（emoji 一律替换为标准 SVG、图形须表意准确）+ 组件规范 StatusState；画面实测为第 1 张任务卡行首图标位
- 现象：本帧与 top 帧逐字节相同（同一 sha16），四张卡状态全部为「去完成」、页头「0/4 已完成」、积分卡「累计获得 0 积分 / 0%」，但第 1 卡行首（实测 x43-70 / y189-211 的薄荷胶囊内）已经是一枚绿色对勾 `CHECK_GREEN`；同一页 :476 又用 `CHECK_CIRCLE` 表示「已完成态」⇒ 同页两枚对勾语义互相打脸，未完成的签到任务在帧上先长出「已完成」的图形。
- 建议改法：把 :283 的签到图标换成不带完成语义的日历/签到图形（仓内既有 SVG 素材内选一枚），把「对勾」这一图形只留给 :476 的已完成态，避免同页两套解释。
- 修复类别：单页

### R11-L11-D05　P3 / 颜色token　批次 R11-B56
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`d5da5241cc134b3b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:494`
- 理想图依据：无基准，依据=规范文档§1.1 规则1（主题底色统一浅绿 `#EEF7F2`）+ §1.2 页面底色 `--c-bg-page`；画面实测为整页底色
- 现象：本页底走 `--c-gradient-page`，帧实测上缘 (8,120)=#E1F3EB、下缘 (8,700)=#EDF7F1，是一条绿色渐变；同 subpackage 的 feedback/history 帧实测恒为 #EEF7F2（(8,120)/(8,400)/(8,700) 三点同值）、chat 两页亦恒 #EEF7F2 ⇒ 同域多页底色取档不一，本页顶部比规范值 #EEF7F2 深 13/255 一档。
- 建议改法：与其它子包页统一 `background: var(--c-bg-page)`；确需渐变时把渐变两端都收在 brand-50/#EEF7F2 之间，并在规范 §1.2 里给这档渐变立一个令牌再引用。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/visitors（3 条）

### R11-L09-D19　P2 / 位置　批次 R11-B57
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`85f39a086359de10`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:255`
- 理想图依据：无基准，依据=§1.3「页面主标题 26–28px」+ §1.5 结构组件（AppShell 为全站页头单一来源）；同域对照帧=consulting__top 页头标题独占一行、墨迹左缘 x=14、实高 27px
- 现象：本页未接 AppShell，页头是手写的「返回钮 + 标题」同一行（:255-270，样式 :376-397 flex-start + align-items:baseline）⇒ 帧上标题「谁看过我」左缘被返回钮推到 x≈45（consulting 为 x=14），且字号走 --fs-5xl(44rpx=22px，实测墨迹 20px，:421)，比同域 AppShell 页头（实测 27px）低一档半：同一分包两种页头结构、两条左轨、两档标题字号
- 建议改法：页头改用 AppShell（show-back + title），或至少把 :421 升到 var(--fs-7xl) 并与 AppShell 同排布（返回钮在上、标题独占一行贴 x=16 轨）
- 修复类别：单页

### R11-L09-D20　P2 / 颜色token　批次 R11-B57
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`85f39a086359de10`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:370`
- 理想图依据：无基准，依据=§1.1 条1「主题底色统一浅绿 #EEF7F2，页面间不得出现断层」+ §1.2 页面底 --c-bg-page #EEF7F2；帧读数=visitors 顶帧页面底实测 #E2F4EB（y=150）、y=500 处 #E8F6EF
- 现象：页面底走 background: var(--c-gradient-page)，该令牌真值是 linear-gradient(180deg,#DFF3EA,#EEF7F2)（design-variables.scss:181）⇒ 帧顶实测 #E2F4EB 比规范浅绿 #EEF7F2 偏绿 12/暗 3/偏青 7 个 RGB 单位，且自身一屏内向下漂到 #E8F6EF；同域另四帧（consulting/settings/verification/real-name 页面底）实测均为 #EEF7F2 平铺 ⇒ 从设置页点进本页会出现一次可测的底色断层，另 :396 吸顶头部又用平铺 --c-bg-page，滚动时头部带与渐变底不同值
- 建议改法：:370 改 background: var(--c-bg-page, #EEF7F2) 平铺（与 :396 同值），需要氛围层时用页面内卡片表达，不再整页铺渐变
- 修复类别：CSS/token

### R11-L09-D22　P2 / 素材缺失　批次 R11-B57
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`85f39a086359de10`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:515`
- 理想图依据：无基准，依据=§1.1 条4「图形一律标准 SVG 素材、颜色走令牌」+ §1.5 组件规范（主页 ProfileEmptyState / 基础 StatusState 承载空态）；帧读数=bottom 帧空态眼睛图标墨迹实测 #8C9CB3（对白卡 #FFFFFF 计算 2.8:1）
- 现象：空态唯一视觉件是 120rpx 的 IMAGE_PATHS.ICONS_SOCIAL.VISITOR（icons/social/visitor.svg），其描边色烘焙在素材里（#94A3B8 slate，不在 §1.2 任何令牌内），帧上实测墨迹 #8C9CB3、落在白卡上仅 2.8:1；:517-524 注释已自证「素材底色由资产自身持有、改色要跨三树同步」并挂 HANDOFF ⇒ 本页没有可令牌化的空态素材，R10 删掉 opacity 后色值偏差原样留在帧上（与同域 consulting 的 lock 图标同族债务）
- 建议改法：由资产车道出一枚描边取 currentColor（或 --c-text-tertiary #6B7571）的 visitor 空态 SVG 并三树同步，本页 :515 的 image 换指新素材；过渡期可先按 consulting.vue:255 的既有配方加 filter: saturate(0) brightness(0.71) 压到三级文字档
- 修复类别：需新建目标功能

## subpackages/profile-extra/settings/dnd（5 条）

### R11-L11-D06　P2 / 颜色token　批次 R11-B58
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`73689ae900a4983b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:536`
- 理想图依据：无基准，依据=规范文档§1.1 规则1（主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层）+ §1.2 页面底色 `--c-bg-page`；画面实测为整页底色
- 现象：页底写成 `linear-gradient(180deg, --c-bg-page → --c-tint-blue-50)`，`--c-tint-blue-50` 真值 #E3F2FD（design-variables.scss:829，Material 蓝），帧实测同一条竖直线上 (8,120)=#ECF6F3 → (8,400)=#E9F5F7 → (8,700)=#E6F3FB，越往下越偏蓝（B−R 从 7 涨到 21），与规范定论的浅绿 #EEF7F2 完全不同色族；本泳道同域另外四页（tasks 绿色渐变、history 与 chat 两页恒 #EEF7F2）都不跑蓝，只有本页从绿渐变到蓝。
- 建议改法：本页底色收敛为 `var(--c-bg-page)`（与 history/verification 同档）；确需渐变时两端都取绿色档（brand-50→#EEF7F2），蓝色档留给信息类控件。
- 修复类别：CSS/token

### R11-L11-D07　P2 / 层级遮挡　批次 R11-B58
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`73689ae900a4983b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:610`
- 理想图依据：无基准，依据=规范文档§1.4（卡片/按钮体量）+ 组件规范 BottomActionBar；画面实测为页底主操作「保存」键
- 现象：未滚动状态下主操作「保存」键（实测深绿底 x17-360 / y766-809）下缘压在系统 home indicator 上（实测指示条墨迹 y800-804），叠掉键底约 9px；根因是 `.safe-bottom` 只写 `calc(env(safe-area-inset-bottom) + 24rpx)`，而本拍摄环境 env 恒为 0（同文件 :31-33 已为顶部引入 `useMenuButtonRect` 注入 `--statusbar` 真值，底部没有对应接线）。
- 建议改法：底部安全区同样吃 JS 注入真值（复用 useMenuButtonRect/`safeAreaInsets.bottom`），或给 `.content` 末尾补 `padding-bottom: 34px` 一档，使保存键在 top 帧即与指示条留出可见间隙。
- 修复类别：单页

### R11-L11-D08　P2 / 可达性　批次 R11-B58
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`73689ae900a4983b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:844`
- 理想图依据：无基准，依据=规范文档§1.2（边框档 `--c-border-light/default/strong`）+ 组件规范 StatusState；画面实测为「重复方式」四行单选控件
- 现象：未选中的三枚单选环（每天/工作日/周末）用 `2rpx solid var(--c-border-strong)`=#C2CAC6 压白卡，实测 1.67:1、环径 18px 且描边只有 1 物理像素（帧上 x321-337 区段仅命中 4 枚 #C2CAC6 像素），低于非文本控件 3:1 地板；同帧上方开关槽底已按 R9 抬到 `--c-neutral-500` #6B7571（对白卡 4.76:1）⇒ 同页两枚单选类控件深浅差三档。
- 建议改法：`.radio-row__indicator` 描边改 `--c-neutral-500`（与 :735 的开关槽底同档，4.76:1），选中态仍走 `--c-brand`，两态与开关控件同轨。
- 修复类别：CSS/token

### R11-L11-D09　P3 / 文案　批次 R11-B58
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`76ba1815840860aa`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:371`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（区块标题档）+ 组件规范 SectionHeader/SectionCard；画面实测为四张分组卡的标题层
- 现象：本帧可见的四组里只有两组有组标题（「免打扰时段」实测 y≈128、「重复方式」y≈272），第 1 组（:371 起的开关卡）与第 4 组（紧急消息卡）没有 `section__title` —— 是 R8-L11-D06 为去重把两处标题删了、另两组没删的结果 ⇒ 同一页分组表意层级不一：有的组先给标题再给卡，有的组直接一张卡。
- 建议改法：四组统一口径：要么都补分组标题（开关组改「总开关」、紧急组改「紧急穿透」这类与行标题不同字的键），要么都去掉标题只留卡内行标题，别一页两制。
- 修复类别：单页

### R11-L11-D10　P2 / 字号　批次 R11-B58
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`76ba1815840860aa`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:678`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（「标题 `--fs-3xl/4xl` 18/20 700 用途=区块标题」「小字 `--fs-md/base` 13/12 用途=标签·时间戳」）；画面实测为「免打扰时段」「重复方式」两枚组标题
- 现象：组标题取 `--fs-base`=24rpx=12px/500（帧实测「免打扰时段」「重复方式」墨带高约 12px），比同帧卡内行标题 `--fs-lg`=14px（:739「开始时间」「每天」等）还小一档，区块标题被压到规范里「标签·时间戳」那一档；同域 tasks 页头标题走 `--fs-5xl`=22px（tasks.vue:530），两页层级取档差 10px。
- 建议改法：`.section__title-text` 抬到 `--fs-xl`(15px)/600 或按 §1.3 走 `--fs-3xl`(18px)/700，与卡内 14px 行标题拉开一档。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/index（7 条）

### R11-L09-D06　P2 / 素材缺失　批次 R11-B59
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`e18eb093020f9eec`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:362`
- 理想图依据：无基准，依据=§1.1 条4（图标一律标准 SVG 素材）+ §1.5 组件规范（列表行图标须语义可辨）；帧读数=top 帧「编辑资料」与「时间安排」两枚底板内图形逐像素同形，bottom 帧「隐私权限设置」再同形
- 现象：15 行菜单只用了 6 个图标文件：:321 编辑资料、:362 时间安排、:370 隐私权限设置 三行同引 ICONS_PROFILE.SETTINGS（common/settings.png），:353 我的动态与 :395 用户协议同引 POSTS（heart-signal.svg），:359 访客记录与 :401 隐私政策同引 VISITORS（visitor.svg），:376 安全中心与 :407 检查更新同引 LAB（ai.png）⇒ 用户扫列表时无法靠图标区分「编辑资料/时间安排/隐私权限」这三行语义不同的入口
- 建议改法：给 ICONS_PROFILE 补 schedule/privacy/safety/agreement/privacy-policy/update 语义档（仓内已有 settings-gear.svg、info.svg、robot.svg 等 SVG 变体可接），逐行改指各自素材
- 修复类别：单页

### R11-L09-D07　P2 / 字号　批次 R11-B59
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`e18eb093020f9eec`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:767`
- 理想图依据：无基准，依据=§1.3 字体层级表「页面主标题 26–28px / 700–800」；同域对照帧=consulting__top 页头「恋爱咨询课程」实测墨迹高 27px（AppShell --fs-7xl 56rpx=28px，R10-L07-D08 已升档）；帧读数=「设置」墨迹实高 13px（y=61–73）
- 现象：页头标题「设置」走 --fs-2xl（32rpx=16px，实测墨迹 13px），比 §1.3 页头档下限 26px 低 10px，也比同域 consulting 帧的页头（实测 27px）小一档半；本页标题与下方行标签（:878 --fs-lg=14px）实测只差 3px，页头与列表行塌成同一层级
- 建议改法：.nav-bar__title 与同分包 verification/real-name 一并归口 AppShell 页头档 var(--fs-7xl)（56rpx=28px），不再各页自取 --fs-2xl
- 修复类别：CSS/token

### R11-L09-D08　P2 / 素材缺失　批次 R11-B59
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`e18eb093020f9eec`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:453`
- 理想图依据：无基准，依据=§1.1 条4「图形符号一律替换为标准 SVG」+ §1.5 组件规范；同域对照=visitors.vue:264 的返回件已用 IMAGE_PATHS.ICONS_COMMON.BACK 素材；帧读数=top 帧页头「‹」与 15 行右端「›」均为字符字形（细笔画、随字重 300 变化）
- 现象：页头返回键是 <text>‹</text> 文本字符（:453，样式 :759-764 给 font-size:56rpx/font-weight:300），15 行右端的进入指示符同样是字符「›」（:480 等，样式 .menu-item__arrow :894）⇒ 字形随系统字体渲染、粗细不可控，且与同分包 visitors 用 BACK 素材的做法分家；读屏侧这两处只有一处补了 aria-label
- 建议改法：返回键与行箭头改 <image> 引 IMAGE_PATHS.ICONS_COMMON.BACK / 既有 chevron SVG（与 visitors.vue:264 同素材），并给每行 .menu-item 补 role="button"+aria-label
- 修复类别：单页

### R11-L09-D09　P2 / 颜色token　批次 R11-B59
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`7d32023759515745`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:578`
- 理想图依据：无基准，依据=§1.1 条3「一令牌一值」+ §1.2 卡片 #FFFFFF / 输入底 #F3FAF6 分层；帧读数=bottom 帧「本周安排」行底板区（x=31–61，y≈30–122）实测 #FFFFFF，同组「深色模式」行同位置实测 #EDE9FE
- 现象：「本周安排」行的图标底板挂 class="menu-item__icon settings-card--mint"，但 settings-card--mint 在本文件（样式块 :859-869 只有 --cream/--page/--lavender）与全仓 scss 中均无定义 ⇒ 底板底色塌成卡片白，日历图标直接坐在白卡上，是整页 15 行里唯一一枚丢底板的行（帧实测 #FFFFFF vs 邻行 #EDE9FE）
- 建议改法：在样式块补 .settings-card--mint { background: var(--c-brand-50, #E8FAF3) }（与 :578 的日历语义同族浅绿），或把该行改挂既有 .settings-card--cream
- 修复类别：CSS/token

### R11-L09-D10　P2 / 圆角　批次 R11-B59
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`7d32023759515745`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:819`
- 理想图依据：无基准，依据=§1.4 间距/圆角表「卡片圆角 --card-radius = 40rpx = 20px」；同域对照帧=consulting__top 课程卡（consulting.vue:287 已归口 --card-radius 40rpx）
- 现象：六个分组卡 .menu-group 与 .logout-btn(:911)、图标底板 .menu-item__icon(:851) 全取 var(--r-xl)（design-variables.scss:202 真值 24rpx=12px），只有规范卡片档 20px 的 60%；同域 consulting 的课程卡在 R8 已升到 --card-radius(40rpx) ⇒ 两页卡片圆角差一档，帧上并排看设置页卡更方
- 建议改法：.menu-group / .logout-btn 改 var(--card-radius, 40rpx)（图标底板 64rpx 见方保留 --r-xl 不属卡片档），与 consulting.vue:287 同口径
- 修复类别：CSS/token

### R11-L09-D11　P2 / 文案　批次 R11-B59
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`7d32023759515745`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:75`
- 理想图依据：无基准，依据=§1.1 条5 + 组件规范（行右侧 value 须是该行动作的结果量）；帧读数=bottom 帧「清除缓存」行右侧 value 实测文案「1 KB」
- 现象：行右侧「1 KB」取 uni.getStorageInfo().currentSize —— 那是整站 storage 总量（含登录态 token、主题、语言、开关偏好、草稿），而本行真正删除的只有 CACHE_KEYS_TO_CLEAR(:61) 里的一个 USER_CACHE key ⇒ 文案承诺「可清除量」与实删范围不是同一件事，点完确认框后该数字基本不变，用户读不到「缓存已清干净」
- 建议改法：数值改为按 CACHE_KEYS_TO_CLEAR 逐 key 统计（JSON.stringify 长度求和）后再 formatSizeKB，行文案与确认框 content 同口径
- 修复类别：单页

### R11-L09-D12　P3 / 颜色token　批次 R11-B59
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`7d32023759515745`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:396`
- 理想图依据：无基准，依据=§1.2 令牌角色表（--c-bg-page #EEF7F2 用途=全站页面背景，卡内装饰底另有 --c-bg-surface #F3FAF6 / brand-50 / romance-50）；帧读数=bottom 帧关于组四行底板区（x≈46，y=520/540/600/630）实测 #EEF7F2
- 现象：关于组四行（:396/:402/:408/:414）与隐私权限设置行（:371）的图标底板 bgColor 写 var(--c-bg-page, #EEF7F2) —— 把「全站页面背景」角色令牌当卡内装饰底用，实测与页面底逐字同值，四枚底板在白卡上呈淡绿一片、与其余行的粉/橙/紫底不成一族；另 :377 的 var(--c-tint-pink-50, #F3E8FF) 兜底写的是紫值而令牌真值是粉 #FCE4EC，属兜底与令牌不同值的孤儿字面量
- 建议改法：六处底板改走卡内装饰档（--c-bg-surface #F3FAF6 或 --c-brand-50 #E8FAF3），并把 :377 兜底改成令牌真值 #FCE4EC
- 修复类别：CSS/token

## subpackages/profile-extra/verification/index（4 条）

### R11-L09-D13　P0 / 需新建　批次 R11-B60
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`ac5111eb94c16f90`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:136`
- 理想图依据：无基准，依据=§1.1 条5 + §1.2「兴趣紫 --c-purple 用途=未认证」；帧读数=top 帧认证权益第 3 格「匹配加权 / 匹配概率提升 1.5 倍」
- 现象：权益格承诺「匹配概率提升 1.5 倍」，该数字是前端 i18n 写死串（zh-CN.ts:3401 benefitMatchDesc），后端 discover 链路里 machineVerified/humanVerified 只作为 RecommendedPersonView 的展示字段透传（RecommendationRanker.java:615-616、690-691），全仓无任何按认证态施加的排序倍率实现；同仓另一处同义文案还写着「匹配概率提升 2 倍」(zh-CN.ts:2524) ⇒ 用户为这个不存在的倍率交出真实姓名+学号+学生证照片，属假数据误导决策
- 建议改法：后端补认证态排序权重（并把实际倍率回写文案）前，把该格描述改成可兑现的定性表述（如「认证用户在推荐中优先展示」），同时收敛 zh-CN.ts 两处不同倍率的同义串
- 修复类别：需新建目标功能

### R11-L09-D14　P3 / 颜色token　批次 R11-B60
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`ac5111eb94c16f90`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:1020`
- 理想图依据：无基准，依据=§1.4 圆角表（--r-lg 为单一档位）+ §1.1 条3「一令牌一值」；帧读数=top 帧权益卡与权益图标底板实测同为 10px 档圆角（令牌已解析）
- 现象：同一个令牌 --r-lg 在本页写了两种兜底：:879 门控横幅、:1009 权益卡、:1117 上传框均写 var(--r-lg, 20rpx)，而 :1020 权益图标底板写 var(--r-lg, 16rpx)（design-variables.scss:201 真值 20rpx）⇒ 兜底位与令牌真值不符且同页自相矛盾，一旦令牌解析失败这四块圆角会分叉成 8px/10px 两档；同页 :1037 的 .benefit-item__emoji 类在模板中零引用（图标已改走 :1031 的 __icon-img），属孤儿样式
- 建议改法：把 :1020 兜底统一为 20rpx（与 :879/:1009/:1117 同写），并删除 :1036-1038 无消费者的 .benefit-item__emoji 规则
- 修复类别：CSS/token

### R11-L09-D15　P2 / 可达性　批次 R11-B60
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`7dc0e2ef3ce79453`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:713`
- 理想图依据：无基准，依据=§1.5 组件规范（基础 common：Button 组件自带 role/aria）+ 同页既有范式（:489 返回钮、:672 上传卡均带 role="button" + aria-label）；帧读数=bottom 帧底部深绿整宽「提交认证申请」按钮（实测 x=17–361、y≈700–752）
- 现象：本页唯一提交出口是一个裸 <view @tap>，既无 role="button" 也无 aria-label（同页返回钮 :489、上传卡 :677-678 都补了），提交中态只靠 :1224 的 opacity:0.6 表达、也无 aria-busy ⇒ 读屏用户在表单末尾只读到一段文字，拿不到「这里可以提交认证申请」这个动作节点
- 建议改法：给 :713 这个 view 补 role="button" :aria-label="t('verification.submitBtn')" 与 :disabled 语义（aria-busy=submitting），或直接换用 §1.5 的 common/Button 组件
- 修复类别：单页

### R11-L09-D21　P2 / 文案　批次 R11-B60
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`7dc0e2ef3ce79453`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:171`
- 理想图依据：无基准，依据=§1.1 条5 + 组件规范（上传区约束须与实现同口径）；帧读数=bottom 帧上传框第二行「支持 JPG / PNG，大小 ≤ 5MB」
- 现象：上传空态承诺「大小 ≤ 5MB」，但选图回调只取 res.tempFilePaths[0] 赋值（:171），全文件不读 tempFiles[i].size、无任何大小判断，chooseImage(:164-167) 也只给 sizeType:['compressed'] ⇒ 帧上写的约束在本页没有执行点，用户选一张超限图仍会走到提交，失败只以通用 toast 出现
- 建议改法：在 :171 前按 tempFiles[0].size > 5*1024*1024 拦一次并给 verification 专属文案（新增 i18n 键「学生证照片需 ≤ 5MB」），约束与文案同口径
- 修复类别：单页

## subpackages/profile-extra/verification/real-name（3 条）

### R11-L09-D16　P2 / 间距　批次 R11-B61
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`87c4c2143b798cbc`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:743`
- 理想图依据：无基准，依据=§1.4「页边距 --page-padding = 32rpx = 16px」；同域对照帧=settings__index / verification__index 卡片左缘实测 x=17–18
- 现象：本页两块卡（状态卡 :681 margin:24rpx、分组 :743 margin:24rpx 24rpx 0）水平外缘都是裸 24rpx(=12px)，实测帧上卡片左缘 x=11；同分包 verification/index.vue:983 与 settings/index.vue:803 已归口 var(--page-padding)（实测 x=17–18）⇒ 两页页边距差 5–6px，卡片左缘不成同一条竖轨
- 建议改法：:681 与 :743 的水平 margin 改 var(--page-padding, 32rpx)（纵向仍留 24rpx=--sp-6），与同分包另两页同轨
- 修复类别：CSS/token

### R11-L09-D17　P2 / 字号　批次 R11-B61
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`87c4c2143b798cbc`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:926`
- 理想图依据：无基准，依据=§1.3 字体层级（正文/列表主文字 --fs-xl/2xl 15/16px；--fs-md/base 13/12px 为「标签·时间戳」档）；帧读数=「林徽风」墨迹实高 9px（y=325–333）
- 现象：已认证信息行的值（真实姓名、脱敏身份证号，本页唯一的正文级数据）与标签同取 --fs-md(26rpx=13px，实测墨迹 9px)，两档同字号无主次；且两处兜底都写成 24rpx（:921/:926），与令牌真值 26rpx 不符 ⇒ 令牌一旦解析失败，本页数据行会比同域其它页正文再小一档
- 建议改法：.verified-card__value 升到 var(--fs-xl)（30rpx=15px）并保留 500 字重，标签留 --fs-md，两处兜底改为令牌真值 26rpx/30rpx
- 修复类别：CSS/token

### R11-L09-D18　P1 / 可达性　批次 R11-B61
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`87c4c2143b798cbc`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:452`
- 理想图依据：无基准，依据=§3 无该页条目 ⇒ 按组件规范（§1.5 结构：BottomActionBar / common/Button 承载页级出口）+ 本页自身文案承诺；帧读数=bottom 帧与 top 帧 sha16 逐字相同（87c4c2143b798cbc），内容止于 y≈370，其下约 440px 为裸页面底
- 现象：实名认证通过态整页只有状态卡（:437-444）与两行信息（:452-466），卡内文案明写「可进行校园认证（学历认证）」（:443 status-card__desc），但 verified 分支里没有任何按钮/链接指向恋爱认证页——页面上唯一可点节点是页头返回键，而 :410 那条跳 verification/index 的分支只在页面栈为空时兜底触发 ⇒ 用户读完指引后拿不到通往校园认证的出口，只能退回设置页重找
- 建议改法：在 :452 的 verified 分支信息卡下方补一枚跳 SUBPACKAGE_ROUTES 认证中心（/subpackages/profile-extra/verification/index）的主操作按钮，文案复用既有 realName/verification i18n 键，不新增假数据
- 修复类别：单页

## subpackages/setup/campus/index（4 条）

### R11-L12-D08　P2 / 颜色token　批次 R11-B62
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`f009bf7b3d5dad19`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:381`
- 理想图依据：无基准，依据=规范文档§1.2「输入底 `--c-bg-surface` #F3FAF6 —— 输入框 · 浅底块」「页面底色 `--c-bg-page` #EEF7F2 —— 全站页面背景」（两档各有用途）；区域=「学校资料」卡内 城市/学校/专业 三个选择框
- 现象：帧上三个选择框底实测 **#EEF7F2**，与同帧页面底 #EEF7F2 逐字同值（`:453` 的 `page{background:var(--c-bg-page)}`）⇒ 输入框在白卡上「没有自己的底」，只靠一圈描边与卡分区；同域 schedule 同类 `.field` 实测 #F3FAF6（schedule/index.vue:226 已按 §1.2 走 `--c-bg-surface`）、profile 实测 #F3FAF6 —— 同一条注册流程里三页两档，本页仍是 R6-B69/D02 在 schedule 上已修掉的同一个写法。
- 建议改法：`:381` 由 `background: var(--c-bg-page)` 改 `var(--c-bg-surface, #F3FAF6)`，与 schedule:226 同档。
- 修复类别：CSS/token

### R11-L12-D09　P1 / 可达性　批次 R11-B62
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`f009bf7b3d5dad19`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:307`
- 理想图依据：无基准，依据=规范文档§1.2 禁用档 `--c-status-disabled` #DCE5E2 + 组件规范 components/common/BottomActionBar.vue:64（`@tap="!disabled && emit('primary')"` 的吞点击约定）；区域=页面底部主按钮「保存并继续」
- 现象：帧上主按钮底实测 #DCE5E2（禁用档），因 `:307` `:disabled="!isComplete || saving"` 在三项未选全时禁用；而 BottomActionBar 的 `@tap` 守卫把点击整个吞掉，**永不 emit primary** ⇒ 本页 `:176-178` 写好的「三项未选完」提示 toast（`setup.campus.errIncomplete`）成为不可达死代码。用户拿不到的是：点灰钮没有任何反馈，不知道是页面卡死、还是缺哪一项，只能靠猜（页面也没有必填星号或行内提示）。同页虽有「非学生？跳过此步」出口，但那不是继续注册的正路。
- 建议改法：`:307` 去掉 `:disabled`（保留 `save()` 内 `:176` 的 toast 守卫，与 profile:1092「置灰仍可点、给定位提示」同口径），或给灰钮加行内缺失项提示。
- 修复类别：单页

### R11-L12-D10　P2 / 素材缺失　批次 R11-B62
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`9ef7fba47a5ba59b`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:251`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条「图标一律走标准 SVG」+ 同域前例 R6-B66/D22（interest/index.vue:11-12 记录：字符箭头换包内登记素材）；区域=三个选择框右端的尖括号
- 现象：帧上 城市/学校/专业 三行右端的「›」是**文本字符**（`:251`/`:270`/`:289` 三处 `<text class="field__arrow">›</text>`，字号取 `--fs-2xl`），而包内 `/static/assets/icons/register/chevron-right.svg` 已登记（config/images.ts:961）且同域 profile 的 8 个滚轮字段全部走这枚素材（profile/index.vue:888 `IMAGE_PATHS…CHEVRON_RIGHT`）⇒ 同一条流程两页两套箭头实现，字符档在不同字体环境下粗细与基线漂移，且 `:302` 跳过入口的箭头同样是字符。
- 建议改法：`:251`/`:270`/`:289`/`:302` 四处 `<text>›</text>` 换 `<image :src="IMAGE_PATHS.REGISTER_ICONS.CHEVRON_RIGHT" mode="aspectFit">`，尺寸与 profile:888 的 `.field__chevron` 同档。
- 修复类别：单页

### R11-L12-D11　P3 / 位置　批次 R11-B62
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`9ef7fba47a5ba59b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:305`
- 理想图依据：无基准，依据=组件规范 components/common/BottomActionBar.vue:11-16（R6-L15-D07/D14：组件本体无 `position:fixed` 与安全区，须由宿主显式传 `fixed` 才吸底）；区域=页面底部主按钮条
- 现象：本页 `<BottomActionBar>` 未传 `fixed`，同域 schedule 传了（schedule/index.vue:195）⇒ 帧上两页按钮条落位不同：campus 钮底实测 y=778（距帧底 36px=71rpx）、schedule 钮底实测 y=770（距帧底 44px=87rpx），且 campus 这条走文档流、不带 `env(safe-area-inset-bottom)`，页面内容一长（键盘弹起或后续加字段）就会被顶走，而组件注释里这正是要靠 `fixed` 修的问题。
- 建议改法：`:305` 补 `fixed`，并按 schedule:213 的做法在正文尾部加 `cta-spacer` 让位，与同域两页取同一档。
- 修复类别：单页

## subpackages/setup/interest/index（4 条）

### R11-L12-D19　P1 / 可达性　批次 R11-B63
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`a3cd4b6c67169983`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:207`
- 理想图依据：无基准，依据=规范文档§1.2 主按钮档 + 仓内已落地前例 components/common/BottomActionBar.vue:105-108（白字压 `--c-gradient-brand` 实测 1.83–2.10:1 已被判不达标并改 `--c-brand-800`）；区域=页中主按钮「完成选择」
- 现象：帧上「完成选择」底实测 #46CC9E（`--c-gradient-brand` #36C99A→#55D5A7 中段），白字标签实测 #FDFEFE ⇒ **对比度 2.00:1**，只有正文级 4.5:1 下限的 44%；`:214` 标签 `color: #ffffff`、字号 30rpx=15px bold 不达 WCAG 大字豁免线。用户拿不到的是：这一页唯一主操作的按钮文字在浅绿底上糊成一片，低亮/户外屏下读不出「完成选择」四个字。
- 建议改法：`:207` 底由 `var(--c-gradient-brand)` 改 `var(--c-brand-800, #156B51)`（同仓已达标档，纯白 6.45:1），与 D16 一并定档。
- 修复类别：单页

### R11-L12-D20　P2 / 颜色token　批次 R11-B63
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`a3cd4b6c67169983`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:122`
- 理想图依据：无基准，依据=规范文档§1.2 禁用档 `--c-status-disabled` #DCE5E2（用途「置灰」）+ 同域 campus/index.vue:307、schedule/index.vue:194 均以 `:disabled` 驱动该档；区域=主按钮「完成选择」的状态表达
- 现象：帧上 0 个标签已选（「已选 0/5」），而 `:122` 的按钮盒没有任何禁用类绑定，仍取满亮品牌渐变底 #46CC9E；同流程另两步在未完成时按钮实测 #DCE5E2 灰档（campus 帧 y=737..778、schedule 帧 y=731..770）。⇒ 按钮用颜色承诺「现在就能完成」，实际点下去被 `:39` 的 `<3` 守卫弹 toast 拒绝，同域两页对「未完成」的色档口径与本页相反。
- 建议改法：`:122` 按 `selected.interest.length >= 3` 加 `--disabled` 类并取 `--c-status-disabled` 档（与 campus/schedule 同口径），或统一改为「置灰仍可点 + 定位提示」那一档，四步取一个口径。
- 修复类别：单页

### R11-L12-D21　P2 / 空态文案　批次 R11-B19
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`a3cd4b6c67169983`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:313`
- 理想图依据：无基准，依据=规范文档§1.3（`--fs-xs` 10px 档用途为「角标 · 法务」，正文/说明应取 `--fs-md/base` 13/12px）+ §1.2 占位档 `--c-text-placeholder` #9AA39F；区域=浅绿「已选标签」盒内的空态行
- 现象：空态文案「暂未选择任何标签」实测字号档 `--fs-xs`=20rpx=10px（`:313`）、色取 `--c-text-quaternary`（`:314`，= #9AA39F，与占位同档），墨迹实测 #9AA49F 压在 `--c-brand-100` 底实测 #CCEFE1 上 ⇒ **对比度 2.08:1**，连 §1.2 非文本 3:1 的下限都不到；这是用户未选标签时该盒内唯一的说明文字，读不到就等于这块空态没有内容。
- 建议改法：`:313` 字号提到 `var(--fs-base)`(24rpx) 以上、`:314` 由 `--c-text-quaternary` 改 `--c-text-secondary` #4A524E（压 #D1F5E7 ≈ 7:1）。
- 修复类别：CSS/token

### R11-L12-D22　P2 / 位置　批次 R11-B63
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`a3cd4b6c67169983`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:204`
- 理想图依据：无基准，依据=组件规范 components/common/BottomActionBar.vue:11-16（R6-L15-D07/D14：主 CTA 须吸底 + 安全区，否则悬在内容流末尾、其下整片空底）+ 同域 schedule/index.vue:191-197 已按该结论落地；区域=主按钮以下到 home 指示条之间的空底
- 现象：本帧与 top 帧 sha16 逐字相同（a3cd4b6c67169983）⇒ 页面无任何可滚内容；帧上主按钮实测占 y=399..443（视口 54% 高度处），其下 **371px（46% 视口）是纯 #EEF7F2 空底**，`:204` 只给了 `margin-top: 32rpx` 的文档流位置、`:135` 底部内边距仅 64rpx，主 CTA 不吸底。用户拿不到的是：拇指自然位（屏底）点不到唯一主操作，必须抬手去够屏中部的按钮；同流程另三步的 CTA 都贴在屏底。
- 建议改法：`:122-124` 的自建按钮盒换成 `<BottomActionBar fixed :primary-label :disabled>`，并按 schedule:213 补 `cta-spacer` 让位，与同域三步同档。
- 修复类别：单页

## subpackages/setup/profile/index（7 条）

### R11-L12-D01　P2 / 尺寸比例　批次 R11-B64
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`e53dfa6af0baf2c1`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1622`
- 理想图依据：无基准，依据=规范文档§1.4（卡片内边距 --card-padding 32rpx、页边距 --page-padding 32rpx）+ §1.1 第 5 条「除头像/人物照片外其余视觉元素 100% 还原」；区域=照片墙两行三列九宫格
- 现象：照片墙空位格实测宽 90px(179rpx)×高 101px(200rpx)，宽高比 0.89 不是正方形——`:1621` 宽走 `calc((100% - 32rpx)/3)` 随屏浮动、`:1622` 高写死 `200rpx`，两轴不同源；帧上 6 格（1 张已传 + 5 个「+」位）全部呈竖长形，`mode="aspectFill"` 会按短边裁切，用户上传的方图上下被削。
- 建议改法：高度与宽度同档（`height: calc((100% - 32rpx)/3)` 或改用 `aspect-ratio: 1/1` + 同宽），保证槽位为正方形后再谈裁切。
- 修复类别：CSS/token

### R11-L12-D02　P2 / 素材缺失　批次 R11-B64
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`e53dfa6af0baf2c1`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:802`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条「图标一律走标准 SVG 素材」+ 同域前例 interest/index.vue:11-13（R6-B66/D22 把字符箭头换成包内登记素材）；区域=照片墙「+」空位格与已传照片右上角删除钮
- 现象：帧上 5 个空位格中间的加号与已传照片右上角的叉都是**文本字符**（`:802` `<text>+</text>`、`:808` `<text>×</text>`），而包内 `/static/assets/icons/plus.svg`、`/static/assets/icons/common/close.svg` 均已登记（config/images.ts:770、:846），同域 schedule 页删除钮已改用 `IMAGE_PATHS.ICONS_EMOJI.CLOSE`（schedule/index.vue:166）⇒ 同一注册流程里两套图标实现，字符档在不同机型上字重/基线漂移。
- 建议改法：`:802`/`:808` 两处 `<text>` 换 `<image :src="IMAGE_PATHS…PLUS/CLOSE_SVG" mode="aspectFit">`，尺寸沿用现有 `--fs-*` 档。
- 修复类别：单页

### R11-L12-D03　P2 / 字号　批次 R11-B20
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`e53dfa6af0baf2c1`，自同段前条继承）
- 源码证据：`apps/client/src/components/setup/SetupProgress.vue:367`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（`--fs-xs/sm` 10/11px 标注用途为「角标 · 法务」，「标签」应取 `--fs-md/base` 13/12px）；区域=卡内「第 1/4 步」与圆点下方 基本信息/校园认证/推荐偏好/完成 四个步骤名
- 现象：步骤名与「第 n/4 步」两行都取 `--fs-xs`（theme/design-variables.scss:560 = 20rpx = 10px），是全站字号表里的「角标/法务」档；而它是用户判断「我走到哪一步、还剩几步」的唯一导航文字，帧上四枚步骤名实测墨迹高约 10px，与同卡内 `--fs-md`(26rpx) 的「基本信息」标题只差一档，主次几乎拉不开。
- 建议改法：`:367` 与 `:239` 由 `var(--fs-xs)` 提到 `var(--fs-base)`(24rpx) 或 `var(--fs-md)`(26rpx)，与 §1.3 的「标签」档对齐。
- 修复类别：CSS/token

### R11-L12-D04　P1 / 可达性　批次 R11-B64
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`7dc125f7d73420b4`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1433`
- 理想图依据：无基准，依据=规范文档§1.2（主按钮 `--c-brand` #36C99A / 主色深 brand-600~700 用于深色与按压态）+ 仓内已落地前例 components/common/BottomActionBar.vue:105-109（同一条「白字压渐变」已被判不达标并改色）；区域=页面底部主按钮「保存并继续」
- 现象：帧上「保存并继续」按钮底实测 #48D0A1（渐变 135deg #36C99A→#55D5A7 中段），白字标签实测 #F4FCF9 ⇒ **对比度 1.86:1**，正文级 4.5:1 下限的 41%；`:1442` 标签字号 30rpx=15px bold，达不到 WCAG 大字豁免（≥18.66px bold），必须按 4.5:1 判。用户拿不到的是：户外/低亮屏下这页唯一主操作的按钮文字读不出来，且看不出它是可点的行动钮。同域 recommend-pref 同一枚主钮实测 #146950 底 / 白字 5.73:1 已达标 ⇒ 本页是漏改的自建按钮。
- 建议改法：`:1433` 渐变底改 `background: var(--c-brand-800, #156B51)`（与 BottomActionBar.vue:108 同档，纯白 6.45:1），或直接弃用自建 `.submit-btn` 改挂 BottomActionBar。
- 修复类别：单页

### R11-L12-D05　P1 / 文案　批次 R11-B64
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`7dc125f7d73420b4`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1035`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（除人物照片外 100% 还原）+ §1.2 输入底/占位色档；区域=帧下半部三行连续文本框「如：广东 / 如：广州 / 如：广州」
- 现象：帧上第 4、5 行输入框占位文字逐字相同，都是「如：广州」（locale zh-CN.ts:3138 `placeholderHometownCity` 与 :3140 `placeholderFutureCity` 同值），而本页 12 个字段**全部没有可见字段名**——只有左侧一枚图标 + 占位文（`:1012`/`:1030` 分别给 MAP_PIN 与 BUILDING，`:999`/`:1020`/`:1038` 只把字段名塞进 `aria-label`，画面上不渲染）。用户拿不到的是：无法区分「籍贯市」和「未来城市」哪个框填哪个城市，填错的资料按 `hometownCity` / `futureCity` 分别落库，之后在匹配推荐里张冠李戴。
- 建议改法：给三行加可见字段名（复用已有 key `labelHometownProvince`/`labelHometownCity`/`labelFutureCity`，`:999`/`:1020`/`:1038` 已在引用，只是没渲染），并把 `placeholderFutureCity` 改成与语义不同的示例（如「如：毕业后想留的城市」）。
- 修复类别：单页

### R11-L12-D06　P2 / 颜色token　批次 R11-B64
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`7dc125f7d73420b4`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1313`
- 理想图依据：无基准，依据=规范文档§1.2 边框档（`--c-border-light` #EEF2F0 / `--c-border-default` #DDE3E0 / `--c-border-strong` #C2CAC6，用途「分隔 · 描边」）+ 同域前例 recommend-pref/index.vue:312-314（R6-B68/D10 已把选项描边由 --c-border-light 提到 --c-border-default）；区域=下半部每一行输入框的描边
- 现象：输入框底实测 #F3FAF6，描边写 `2rpx solid var(--c-border-light, #eef2f0)` ⇒ 描边与框底三通道最大差仅 16（对比 1.02:1），帧上绕框一圈取样得到的全是 #FBFCFB/#F5F7F6 这类过渡值，**描边在画面上不存在**；同域 recommend-pref 同类控件已按 §1.2 取 `--c-border-default`。用户侧表现为「看不出这是可以点的输入区」。
- 建议改法：`:1313` 描边令牌由 `--c-border-light` 换 `--c-border-default`（#DDE3E0），与 recommend-pref:323 同档。
- 修复类别：CSS/token

### R11-L12-D07　P3 / 文案　批次 R11-B64
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`7dc125f7d73420b4`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:163`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值」的同族一致性要求 + 严重度口径 P3「标点与全半角」；区域=「你的身份」首个单选项标题
- 现象：帧上首个身份选项渲染为「在校学生 / 毕业生」——半角斜杠 `/` 前后各带一个空格（locale zh-CN.ts:3110 原值），而同卡第二项「非学生职场人士」与本页其余标签（如「头像与照片」「照片墙」）一律无分隔符；中文 UI 里同义并列应走全角「／」或顿号，半角加空格在 30rpx 字号下与词间空格难分辨。
- 建议改法：`:163` 引用的 key 值改为「在校学生／毕业生」（全角），或统一去掉斜杠改用顿号，与同域选项写法一致。
- 修复类别：单页

## subpackages/setup/recommend-pref/index（4 条）

### R11-L12-D15　P0 / 文案　批次 R11-B20
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`fe5b70feb07a203e`）
- 源码证据：`apps/client/src/components/setup/SetupProgress.vue:67`
- 理想图依据：无基准，依据=规范文档§1.5 组件清单在册的引导步骤条 + 本页自身声明的链路（recommend-pref/index.vue:5-8 头注释）；区域=卡内「第 3/4 步 / 推荐偏好」与四枚圆点下方的步骤名
- 现象：帧上步骤条渲染的是 `STEP_DEFS_STUDENT`（`:67-72` 四项：基本信息→校园认证→推荐偏好→完成），**「时间安排」整步不在表内**；而实际学生链路是 profile→campus→schedule→recommend-pref（campus/index.vue:190 保存后跳 `SETUP_PROGRESS.SCHEDULE`，schedule/index.vue:101 保存后跳 RECOMMEND_PREF），本页是用户真实走过的**第 4 屏**，`recommend-pref/index.vue:33` 却按这张缺项的表把 `currentStep` 报成 3。⇒ 帧上「第 3/4 步」是假计数，且第 3 号位标的名「推荐偏好」、实际第 3 屏是「时间安排」（张冠李戴）；非学生分支同理（`STEP_DEFS_NON_STUDENT:78-82` 三项，仍无时间安排，而 profile:179 非学生第一跳就是 SCHEDULE）。用户拿不到的是：照这条进度条判断「还剩 1 步就完成」，走完推荐偏好后却发现还要再过一屏才到「完成」，无法据此决定要不要继续填。
- 建议改法：`:67-72` 与 `:78-82` 两份步骤表补入 `stepSchedule`（时间安排），`effectiveTotal` 随之变 5/4，并把 `recommend-pref/index.vue:33` 的当前步改为按真实链路取 4/3；`setupProgress.stepSchedule` 现值「课表导入」（zh-CN.ts:3095）需同步改成「时间安排」，与页头 `setup.schedule.pageTitle` 一致。
- 修复类别：需新建目标功能

### R11-L12-D16　P2 / 颜色token　批次 R11-B65
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`fe5b70feb07a203e`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:257`
- 理想图依据：无基准，依据=规范文档§1.2「主色 `--c-brand` #36C99A —— 主按钮 · 选中态」+ §1.1 第 3 条「一令牌一值，禁止页面级私有色值体系」；区域=页面底部主按钮「保存」
- 现象：帧上「保存」底实测 **#146950**（= `--c-brand-800`，BottomActionBar.vue:108 的达标改色），而同一条注册流程里 profile「保存并继续」底实测 #48D0A1、interest「完成选择」底实测 #46CC9E（都走 `--c-gradient-brand` #36C99A→#55D5A7）⇒ 三步走完主 CTA 出现两套绿，且 §1.2 规定的 #36C99A 一档谁都没落。用户从按钮颜色判断不出这三枚是不是同一个「继续」动作，第 3 步的按钮明显比第 1 步深两级。
- 建议改法：先定档（本页 #156B51 是已过对比度判点的档），把 profile:1433 / interest:207 两处自建按钮底统一到同档；若维持 §1.2 的 #36C99A，则本页钮底回到 `--c-brand` 并把标签改深色以保住 4.5:1。
- 修复类别：CSS/token

### R11-L12-D17　P3 / 位置　批次 R11-B65
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`497758425266d4d2`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:179`
- 理想图依据：无基准，依据=组件规范 components/layout/AppShell.vue 的 title/subtitle 两段式页头 + 同域两页取档；区域=页头「推荐偏好」下方一行
- 现象：`:179` 的 AppShell 只传 `:title`，未传 `:subtitle`，而同流程 campus（`:217` 传「认证后解锁同校专属匹配与校友圈子」）、schedule（`:113` 传「这里会驱动首页默认推荐和可聊天时段。」）都带副标题 ⇒ 帧上本页页头比邻页少一行，首张卡顶边实测 y=162，campus 为 y=186，**内容列整体比同域两步高 24px**，四步走下来页头高度与正文起点每页都不一样。
- 建议改法：`:179` 补 `:subtitle`（`recommendPref` 命名空间已有副标题语义的 key 则复用，不自造文案），与 campus/schedule 同档。
- 修复类别：单页

### R11-L12-D18　P3 / 圆角　批次 R11-B65
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`497758425266d4d2`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:322`
- 理想图依据：无基准，依据=规范文档§1.4 圆角档（`--r-sm → --r-full` = 4/8/12/20/24/32/9999 rpx，「一令牌一值」）；区域=「推荐时间/推荐范围」两卡内的 10:00、同校优先 等选项盒
- 现象：`:322` 写 `border-radius: var(--r-lg, 18rpx)`，但 `--r-lg` 的真值是 20rpx（theme/design-variables.scss:197 明示「与实测编译产物一致（--r-lg: 20rpx）」、:445 注册），18rpx **不在 §1.4 的圆角档位上**，是一个永不生效又误导后续改档的孤儿兜底值；同页 `:360` 的 `var(--r-xl, 24rpx)` 同型。对照同域 profile 输入框直接写死裸值 `24rpx`（profile/index.vue:1309）⇒ 一条流程里同类控件圆角出现 20rpx / 24rpx / 字面量 24rpx 三种取法。
- 建议改法：`:322`/`:360` 去掉与真值不符的兜底字面量（直接 `var(--r-lg)`），profile:1309 的裸 `24rpx` 换成对应档位令牌。
- 修复类别：CSS/token

## subpackages/setup/schedule/index（3 条）

### R11-L12-D12　P1 / 位置　批次 R11-B66
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`d02cb225cdebb4f7`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:113`
- 理想图依据：无基准，依据=组件规范 components/setup/SetupProgress.vue（§1.5 组件清单「寻觅视觉」在册的引导流程进度条）+ 同域三页均在 AppShell 首位渲染该模块（profile:753、campus:219、recommend-pref:181）；区域=页头标题与首张卡之间的进度区
- 现象：本页是注册流程实际第 3 屏（campus 保存后 `:190` 跳 `SETUP_PROGRESS.SCHEDULE`，本页保存后 `:101` 跳 RECOMMEND_PREF），但 `:113` 的 AppShell 之后直接进 `card-stack`，**整块步骤进度条缺席**——文件里连 SetupProgress 都没 import。用户拿不到的是：走到这一屏时看不到「第几步/共几步/还剩几步」，前后三屏都有、唯独这屏断档，无法判断自己离注册完成还有多远。
- 建议改法：`:113` 之后按 campus:219 同写法插进步骤条（需先把 schedule 步骤补进 SetupProgress 的步骤表，见 D15），并同步 `第 n/总` 计数。
- 修复类别：单页

### R11-L12-D13　P2 / 可达性　批次 R11-B66
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`d02cb225cdebb4f7`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:129`
- 理想图依据：无基准，依据=规范文档§1.2 占位档 `--c-text-placeholder` #9AA39F（用途 placeholder，不承担字段名）+ 同域 campus 每个字段都有可见 `form-row__label`（campus:240/258/277）；区域=「偏好设置」卡内唯一的输入框
- 现象：帧上该框内只有灰色占位文字「常去区域」（locale zh-CN.ts:3223 `placePlaceholder`），**没有字段名行**：卡片标题是泛指的「偏好设置」（:127），一旦用户输入「图书馆」占位即消失，画面上再无任何文字说明这一栏是什么；同域 campus 三栏都在框上方另起一行标签。占位实测最深墨迹 #A0A2A1 压 #F3FAF6 仅 2.42:1，也不足以承载字段语义。
- 建议改法：`:128` 之前补一行可见标签（复用 `setup.schedule` 命名空间既有 key，与 campus `.form-row__label` 同档 `--fs-sm`/`--c-text-secondary`），占位改为示例值。
- 修复类别：单页

### R11-L12-D14　P2 / 尺寸比例　批次 R11-B66
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`3d8e5a830d3a06b6`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:213`
- 理想图依据：无基准，依据=规范文档§1.4（`--section-gap` 24rpx / `--card-padding` 32rpx 的内容节奏）+ 同域 campus、recommend-pref 两页的内容列占比；区域=第二张卡「＋ 添加时段」与吸底按钮之间整片空底
- 现象：帧上正文最后一行墨迹止于 y≈390，吸底按钮顶边实测 y=731 ⇒ 中间 **341px（42% 视口）是纯 #EEF7F2 空底**；同流程 campus 内容一直排到 y≈735、recommend-pref 到 y≈700，只有本页下半屏空着。`:213` 的 `.cta-spacer` 只预留了 152rpx+安全区的按钮位，不解决内容占比；且本帧与 top 帧内容逐像素相同（页面无可滚内容），说明这不是被裁掉而是确实没有内容。
- 建议改法：按 R8-L12-D07 的同一思路把本页补到与 campus 同档——常去区域加区域点选（而非单输入框）、空闲时段卡内给「本周/今晚」快捷档，或在 `:126` 的 card-stack 上方补步骤说明，使正文列占比回到 80% 以上。
- 修复类别：单页

## subpackages/support/feedback/index（5 条）

### R11-L13-D01　P2 / 字号　批次 R11-B67
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`e83ad7a97c78d417`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:680`
- 理想图依据：无基准页；依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.3 字体层级表（极小档 --fs-xs/sm=10/11px 的用途只写「角标 · 法务」；「标签 · 时间戳」=13/12px；「正文 · 列表主文字」=15/16px）
- 现象：帧上正文框下方的字数上限提示「0/5000」实测墨迹 y=490..497（高 8px）、x=311..345（宽 35px），按 CJK/数字墨高≈字号-3 反推字号≈11px，正是 :680 的 `--fs-sm`（22rpx，theme/design-variables.scss:561）——一个 11px 档；而这条提示是本页唯一承载「正文可写到 5000 字」这一契约信息（:69 `FEEDBACK_CONTENT_MAX = 5000`）的可见文字，被放到 §1.3 只分配给「角标 · 法务」的极小档。
- 建议改法：`.field-counter` 的 font-size 从 `var(--fs-sm)` 提到 `var(--fs-md)`（26rpx=13px，§1.3「标签 · 时间戳」档下限），颜色 `--c-text-tertiary` 不动（压白卡实测 4.73:1 已达标）。
- 修复类别：CSS/token

### R11-L13-D02　P2 / 可达性　批次 R11-B67
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`e83ad7a97c78d417`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:443`
- 理想图依据：无基准页；依据=§1.5 组件库清单「基础 common」的表单口径 + §1.3 字体层级表（字段名属「正文 · 列表主文字」15/16px 档，不是 placeholder 档）
- 现象：三个输入控件（标题 / 反馈内容 / 选填微信号）的可见名称只有 placeholder：:443、:456、:477 三处 `<label class="sr-only">` 把真实字段名收进屏幕阅读器，画面上没有任何常驻标签。帧实测标题框（y=283..325）、正文框（y=334..478）、微信号框（y=509..551）上方均无标签墨迹行——标题框上方最近的墨迹是 y=231..274 的分类 chip 带，两带之间 275..282 是 8px 纯白。用户一旦开始输入，placeholder 消失，该字段在屏幕上不再有任何名字，只能靠输入顺序猜。
- 建议改法：把 :443/:456/:477 三个 `.sr-only` label 改为可见行（`--fs-md` 13px + `--c-text-secondary`，压在各自控件上方，间距吃 `--sp-2`），placeholder 退居提示位；`aria-label` 保留不删。
- 修复类别：单页

### R11-L13-D03　P3 / 间距　批次 R11-B67
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`e83ad7a97c78d417`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:668`
- 理想图依据：无基准页；依据=§1.4 间距令牌表（`--sp-1~sp-10` = 4/8/12/16/20/24/32/48rpx，theme/design-variables.scss:547-557）+ §1.1 原则 3「一令牌一值：页面只引用 var(--c-*)/--sp-*/--r-*/--s-*」
- 现象：输入控件内边距写成裸 `padding: 18rpx`，18rpx 不在 §1.4 的间距阶梯上（阶梯里 18 这一档不存在：--sp-4=16rpx、--sp-5=20rpx）；同一文件 :645 的 chip 内距 `24rpx 28rpx`、:852 的空态内距 `40rpx 0` 同样是私值。帧实测标题框整高 43px（y=283..325）= 内容 23px + 上下各 10px，即 18rpx 落到画面上是 9px，既不是 sp-4 的 8px 也不是 sp-5 的 10px 的整数档读法。
- 建议改法：:668 改 `padding: var(--sp-4) var(--sp-5)`（16rpx 20rpx），:645 改 `var(--sp-6) var(--sp-7)`，:852 改 `var(--sp-9) 0`，把本页内距全部收回阶梯。
- 修复类别：CSS/token

### R11-L13-D04　P2 / 位置　批次 R11-B67
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`23d0159078d049b4`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:895`
- 理想图依据：无基准页；依据=§1.5 组件库清单「结构 BottomActionBar」+ §1.1 原则 5（视觉元素按分区还原，卡片不留无主空带）
- 现象：bottom 帧实测「新建提交」白卡在相机格（SURF 块 y=229..319，91px）之后还有 **90px 纯白空带**（x=60 列 y=320..409 连续 WHITE），卡片底缘就断在 y≈406..409。这 90px 的来源是 :569 的 `.action-bar-spacer`（:895 `height: 120rpx` = 60px）——它被写在 `<SectionCard>` 内部（卡到 :570 才闭合），而它替 :563 `<BottomActionBar fixed>` 留位的吸底条是相对视口定位的（BottomActionBar.vue:82-91 `position: fixed`），不占卡片空间。结果占位没有顶住任何东西，只在第一张卡底部留下一段没人用的空白，把「反馈历史」卡整体下推 60px。
- 建议改法：把 :569 的 `.action-bar-spacer` 移出 :570 的 SectionCard（放到两卡之外、页面末尾），或按 R9-L13-D08 在 LegalTextPage.vue:295-298 的口径改成与吸底条同源算式 `calc(var(--btn-height-md) + var(--sp-4) + var(--sp-6) + env(safe-area-inset-bottom))` 并挂在滚动容器上。
- 修复类别：单页

### R11-L13-D05　P3 / 尺寸比例　批次 R11-B67
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`23d0159078d049b4`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:868`
- 理想图依据：无基准页；依据=§1.4 令牌表未给分隔线档位，但同域两处在同一文件内取了两种单位（:817 用 1rpx、:868 用 1px），按 §1.1 原则 3「一令牌一值」应同档
- 现象：同一文件内两条分隔线单位不一致：:817 `.history-header` 的下划线写 `border-bottom: 1rpx`，:868 `.submission` 的上划线写 `border-top: 1px`。1px 是物理像素、1rpx 是 750 设计宽度单位（375pt 屏上 1rpx=0.5px），所以提交记录列表的分隔线在真机上比「反馈历史」卡头那条粗一倍。bottom 帧实测卡头下划线落在 y=518..519 两行、色值 (249,251,250)→(245,248,247)（半像素抗锯齿），与 :868 一档的整像素线读法不同。
- 建议改法：:868 的 `1px` 改 `1rpx`，与 :817 及 discussions 页统一；顺带把 :868 的 `--c-border-light` 兜底值删掉（该令牌在 theme/design-variables.scss:402 有真值，兜底属第二真相源）。
- 修复类别：CSS/token

## subpackages/tools/activities/detail（7 条）

### R11-L08-D11　P1 / 可达性　批次 R11-B68
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`c8ae84089061ef51`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:475`
- 理想图依据：无基准，依据=组件规范 src/components/common/（返回键为 custom 导航页唯一页内出口）+ 仓内自陈触控下限 88rpx（同 lane nearby.vue:275-279 已按该下限把 64rpx 提到 88rpx）
- 现象：顶部栏返回圆钮写死 `width/height: 64rpx`（=32.3px），帧上实测半透明白圆底 x≈7..40（约 34×34px=68rpx），比本页自陈下限 88rpx 少 20rpx；同帧底部两枚动作钮实测 88rpx 高（分享 x=0..69、报名钮 x=67..368 / y=733..774=42px）⇒ 同一屏两类必点控件差 1.37 倍；本域 pages.json 为 navigationStyle=custom，页内没有第二个返回出口。
- 建议改法：`.detail-header__back` 补 `width/height: 88rpx; min-width/min-height: 88rpx`，与 nearby.vue:279、search/index.vue:487 同口径。
- 修复类别：CSS/token

### R11-L08-D12　P1 / 文案　批次 R11-B68
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`c8ae84089061ef51`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:134`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条 + 本页自述 :7「未匹配时回退到内置示例活动」
- 现象：帧上整页正文全部来自 .vue 内置示例常量表（:57-110 的 buildSampleActivities）：标题「新人礼遇」、时间「每日 18:00-20:00」、地点「校园咖啡角」、介绍「为首次注册的新同学准备的一场轻松见面会，和同校的朋友一起喝杯咖啡，聊聊校园生活。」、状态「报名中」，均为写死字面量（示例项 :68 `enrollCount: 0`），URL 带真实活动 id 时用户拿不到该活动的任何字段；全页唯一披露只有封面左上角一枚「示例活动」小徽标（:357，实测 --fs-xs 10px 档），下方信息卡与状态标签不再区分示例/真实。
- 建议改法：解析失败时不要静默落到示例常量：给 `isSample` 分支改出「未找到该活动」错误态（复用 :400 的 detail-error + retryLoad），示例内容仅在显式 demo 入口下渲染。
- 修复类别：需新建目标功能

### R11-L08-D13　P2 / 字号　批次 R11-B68
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`c8ae84089061ef51`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:669`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「正文 --fs-xl/2xl = 15/16px；小字 --fs-md/base = 13/12 只给标签·时间戳」
- 现象：本页唯一成段阅读文本「活动介绍」正文取 `--fs-base`（真值 24rpx=12.1px，design-variables.scss:562；兜底字面量另写 26rpx，与令牌真值不符），帧上两行正文墨迹带高 11px（y=568..578 / 588..598）⇒ 与上方「时间/地点」值行同档，比卡片大标题（.detail-title --fs-2xl 32rpx=16px）低两档；正文落在 §1.3 的标签档。
- 建议改法：`.detail-intro` 改 `var(--fs-xl, 30rpx)`（15px），行高保持 1.7；兜底字面量同步改成 30rpx。
- 修复类别：CSS/token

### R11-L08-D14　P2 / 间距　批次 R11-B68
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`c8ae84089061ef51`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:568`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px / 卡片内边距 --card-padding 32rpx=16px」
- 现象：两张白卡（标题卡、活动介绍卡）共用 `.detail-section`，左右外边距取 `--sp-4`（16rpx=8.1px）、内边距取 `--sp-5`（20rpx=10.1px）；帧上实测卡片左缘 x=10、右缘 x=368（左右各约 10px 含阴影），卡内文字左缘 x=27 ⇒ 页边距只有 §1.4 标准的一半，内边距比标准少 6px；同域 love-center/mbti.vue:347 的 `.content-section` 已按 R6-L10-D10 改成 `var(--page-padding, 32rpx)`（帧上实测卡缘 x=18）⇒ 同域两页同一角色容器取档不一。
- 建议改法：`.detail-section` 的 margin 横向改 `var(--page-padding, 32rpx)`、padding 改 `var(--card-padding, 32rpx)`，与 mbti.vue:347 对齐。
- 修复类别：CSS/token

### R11-L08-D15　P1 / 素材缺失　批次 R11-B68
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`3774f577456d18b3`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:675`
- 理想图依据：无基准，依据=本页自述 :3-8 活动详情语义 + 规范文档§1.1 第 5 条（详情页须给全决策要素）
- 现象：bottom 帧与 top 帧同构（295905B vs 310891B，画面同带），信息区止于「活动介绍」卡底 y≈625，其下到固定操作栏顶 y≈715 是 90px 纯 #EEF7F2 空底（:675 `height: calc(140rpx + env(...))`，模拟器 env()=0 ⇒ 实测 70px 死白 + 卡外边距）；这 90px 里没有任何模块：无报名人数/参与头像、无主办、无报名截止、无活动流程、无位置地图——用户在帧上拿不到判断「要不要报名」的第二条依据，只有标题+两行元信息+一段介绍。
- 建议改法：先补有真实字段支撑的两项（`enrollCount` 计数行 + `activity.date` 报名截止），把 :675 的死白让给它们；主办/流程属后端缺列，另记 NEEDS-DATA 而不是留空。
- 修复类别：需新建目标功能

### R11-L08-D16　P3 / 颜色token　批次 R11-B68
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`3774f577456d18b3`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:649`
- 理想图依据：无基准，依据=规范文档§1.2「三级文本 --c-text-tertiary = #6B7571」
- 现象：「时间」「地点」两个字段名取 `var(--c-text-tertiary, #9aa1ab)`——兜底字面量 #9aa1ab 既不在 §1.2 色板、也不等于该令牌真值 #6B7571（design-variables.scss 内为 slate 系残留），同页 :688 `.detail-loading__text`、:713 与 search/index.vue:627/:648/:695 也各自写死 #8f959e 作同角色兜底 ⇒ 同一令牌在两页挂着两个不同的假真值，令牌一旦失效即各页翻成不同灰。
- 建议改法：全站把 `--c-text-tertiary` 的兜底字面量统一改回 #6B7571（或删兜底），一并清 :688/:713 与 search 页同角色残留。
- 修复类别：CSS/token

### R11-L08-D17　P2 / 空态文案　批次 R11-B68
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`3774f577456d18b3`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:193`
- 理想图依据：无基准，依据=规范文档§1.2「状态色：警告 #F59E0B / 成功 #36C99A」+ §1.1 第 2 条（绿色=行动）
- 现象：帧上唯一状态读数是一枚「报名中」绿底胶囊（:193 statusText，实测标签墨迹 x=295..361 / y=420..461，墨色 #126A4F 压 #FFFFFF 底 6.56:1，对比合格），但示例常量项 `enrollCount: 0`（:68）且模板内没有任何名额/截止槽 ⇒ 页面一边宣告「报名中」这一可行动状态，一边给不出「报到哪里、什么时候截止、还有没有名额」的任何一句兜底说明，状态标签成为帧上不可核验的孤句。
- 建议改法：`.detail-status` 旁并排挂 `已报名 N 人 · 截止 X`（字段缺失时整槽改落「名额与时间以现场为准」一句可读弱态，不留空）。
- 修复类别：单页

## subpackages/tools/daily-question/index（6 条）

### R11-L07-D09　P2 / 尺寸比例　批次 R11-B69
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`4e576b85c1add1b3`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:460`
- 理想图依据：无基准，依据=规范文档§1.4 卡片内边距 32rpx / 页边距 32rpx（容器须随内容收口）
- 现象：锁定卡 `.lock-card` 写死 `min-height: 70vh`，帧上白卡从 y≈78 撑到 y≈655（约 577px），而卡内实有内容（锁图标+「签到后解锁」+说明+「去签到」）只占 y≈300-460 约 160px，卡内 72% 是空白，主操作被顶在一张空卡正中。
- 建议改法：去掉 `min-height: 70vh`，改由内容 + `padding: var(--sp-9)` 自然定高。
- 修复类别：单页

### R11-L07-D10　P2 / 颜色token　批次 R11-B69
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`4e576b85c1add1b3`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:363`
- 理想图依据：无基准，依据=规范文档§1.1 第 1 条「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」
- 现象：页头整条铺 `linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-300) 100%)`（#36C99A→#75E1B7），帧上是本泳道唯一一块饱和绿导航面；同域 help/security/love-center 页头均为浅绿底 + 白底胶囊返回钮，两页相邻跳转即出现整块色带断层。
- 建议改法：页头底色改 `--c-bg-page` 档（或 AppShell 同款浅渐变），返回钮与其余页统一为白底胶囊。
- 修复类别：CSS/token

### R11-L07-D11　P3 / 文案　批次 R11-B69
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`4e576b85c1add1b3`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:181`
- 理想图依据：无基准，依据=规范文档§3.1 已知差异条目口径（文案走 i18n 键，不做字面量）
- 现象：主按钮文案在模板里硬写中文字面量 `"签到中…" : "去签到"`，而同页页头标题、锁定标题、说明、返回全部走 `t("dailyQuestion.*")`——本页唯一一处无消费者的取档旁路，切 en-US 后该钮仍留中文。
- 建议改法：两个串改走 `t("dailyQuestion.checkinCta")` / `t("dailyQuestion.checkingIn")` 既有或新增键。
- 修复类别：单页

### R11-L07-D12　P2 / 文案　批次 R11-B69
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`005454f3b2a68372`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:199`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（画面须与业务口径一致，不叠加同义控件）
- 现象：bottom 帧同一屏内出现两枚逐字相同的「返回」控件——页头绿条左侧一枚（:140）、白卡下方白底胶囊一枚（:199），两者都调 `goBack`；帧上「每日一问」页的离页出口重复，用户无法判断哪枚才是主出口。
- 建议改法：页头返回改回胶囊图标钮，底部只保留 D09 收口后确需的次级出口（或反之，二选一）。
- 修复类别：单页

### R11-L07-D13　P2 / 可达性　批次 R11-B69
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`005454f3b2a68372`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:368`
- 理想图依据：无基准，依据=组件规范 AppShell.vue:361「min-height 确保 ≥88rpx（44px）」
- 现象：页头「返回」是纯文字钮，热区只有 `padding: var(--sp-2) 0`（上下各 8rpx）+ `--fs-base` 24rpx 文本，实测高约 50rpx=25px，为 88rpx 下限的 57%；因底部另有 :199 同功能出口，未构成无出口，故记 P2。
- 建议改法：`.dq-header__back` 加 `min-height: 88rpx; min-width: 88rpx;` 并居中。
- 修复类别：单页

### R11-L07-D14　P2 / 颜色token　批次 R11-B69
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`005454f3b2a68372`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:518`
- 理想图依据：无基准，依据=规范文档§1.2 配色表「主色 --c-brand #36C99A，用途：主按钮」
- 现象：本页主操作「去签到」钮面取 `--c-brand-800`（#156B51），bottom 帧上与上方浅绿页头、下方白卡并置时呈一块近黑绿，比 §1.2 主按钮档暗两级；与 likes-visitors D06 同一条根因（两帧同档不同页复现）。
- 建议改法：与 likes-visitors 一并收敛到同一主按钮档（brand / brand-600），不要各页自取 brand-800。
- 修复类别：CSS/token

## subpackages/tools/heart-signals/index（5 条）

### R11-L08-D06　P1 / 空态文案　批次 R11-B70
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`d649b5b0f61e6c31`）
- 源码证据：`apps/client/src/subpackages/tools/heart-signals/index.vue:247`
- 理想图依据：无基准，依据=本页自述 :3-4「心动信号页 — 双向心动通知列表…支持接受/拒绝操作及倒计时」+ 规范文档§1.1 第 5 条
- 现象：帧上 100% 是通用锁定层（LockScreen），本页主题内容 0 命中——无「待处理/已接受/已拒绝」任一分组、无一条信号卡、无接受/拒绝按钮、无倒计时，画面 14 条墨迹带里唯一可点的是 :301 的「立即登录并完善」；即页名所指的「心动信号」在帧上不存在，不成其为该页（锁定层自身有登录出口与 :308「先逛逛公开内容」替代出口，故不判 P0）。
- 建议改法：取景口径按任务书身份前提 A 取登录态重拍本域；同时在锁定分支下保留一张不可交互的信号卡骨架（SkeletonBlock），让页面语义在锁态也成立。
- 修复类别：单页

### R11-L08-D07　P2 / 文案　批次 R11-B70
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`d649b5b0f61e6c31`）
- 源码证据：`apps/client/src/subpackages/tools/heart-signals/index.vue:66`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（文案须与画面实际状态一致）+ 组件规范 LockScreen 的登录/未登录分支
- 现象：帧上主标题走的是未登录分支（zh-CN.ts:2908 titleLoggedOut ⇒ 渲染为「登录后解锁心动信号」），而副标题 :66-68 不分身份一律塞 `lock.unlockHintModal`（zh-CN.ts:2895 =「完成资料完善即可解锁{name}」），于是同一屏自相矛盾：上面要用户先登录，下面告诉用户「完成资料完善即可解锁」——游客没有资料可完善，该指引在帧上不可执行；组件其实备有 `subtitleLoggedOut`（zh-CN.ts:2909）这一条正确分支，本页没接。
- 建议改法：`lockSubtitle` 与 `lockTitle` 同口径按 `sessionStore.isLoggedIn` 二选一：未登录取 `lock.subtitleLoggedOut`，已登录未完善才取 `unlockHintModal`。
- 修复类别：单页

### R11-L08-D08　P2 / 字号　批次 R11-B03
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`d649b5b0f61e6c31`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:716`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「正文 --fs-xl/2xl = 15/16px；小字 --fs-md/base = 13/12 只给标签·时间戳」
- 现象：锁定层三条权益清单是这屏唯一的「解锁后能拿到什么」正文，`.benefit__text` 取 `--fs-md`（真值 26rpx=13.1px，design-variables.scss:563），帧上三行墨迹带高仅 12-13px（y=441..453 / 464..476 / 488..499），落在 §1.3 的「标签·时间戳」档；比同屏主标题（--fs-3xl）低两级，与它「本页价值主张」的层级不匹配。
- 建议改法：`.benefit__text` 改 `var(--fs-xl, 30rpx)`（15px 正文档），行距保持 1.5。
- 修复类别：CSS/token

### R11-L08-D09　P2 / 颜色token　批次 R11-B03
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`0d66417ba79ce6c8`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:745`
- 理想图依据：无基准，依据=规范文档§1.2 配色表「主色 --c-brand（brand-500）#36C99A：主按钮·选中态」
- 现象：主出口「立即登录并完善」钮面取 `--c-brand-800`，帧上钮面实测 #156B51（众数，钮带 y=517..564 / x=49..329），既不是 §1.2 主按钮档 brand-500 #36C99A，也不在 §1.2 列出的 brand-600/700 深档内（brand-800 只存在于 design-variables.scss:18 色阶）；同域 activities/detail.vue:766 的「立即报名」、love-center/mbti.vue:505 的「提交并查看结果」同样吃 brand-800，而 search/index.vue:741 的选中态 Tab 吃 brand-500 #36C99A（帧上实测 x=13..68）⇒ 同一「绿色=行动」角色在三个 tools 页里两档取值并存。
- 建议改法：全站主按钮钮面按 §1.2 定档一次（brand-500 + 白字不达 4.5:1 的，连 §1.2 表一起补 brand-800 为主按钮深档），三页同改，避免继续逐页自选。
- 修复类别：CSS/token

### R11-L08-D10　P2 / 间距　批次 R11-B03
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`0d66417ba79ce6c8`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:820`
- 理想图依据：无基准，依据=规范文档§1.4 间距表（sp 阶梯内无该档）+ 同页元素须由令牌定义纵向节奏
- 现象：bottom 帧与 top 帧同构（仅状态栏时钟 3:43→3:44，256389B vs 256420B），锁定层内容止于「先逛逛公开内容」墨迹 y=601，底部提示起于 y=732，中间 131px（≈260rpx）无任何内容的空带；提示自身止于 y=742，其下到 home 指示条（实测 y=800..804）又剩 58px——:819-820 的 `padding-bottom: calc(var(--safe-bottom, env(safe-area-inset-bottom)) + 72rpx)` 在模拟器 env()=0 下只兑现 36px，余下 22px 与上面那 131px 空带都不落在 §1.4 的 sp 阶梯上。
- 建议改法：把 `.lock-screen__body` 与 `.lock-screen__footer` 之间的空段改由 `--sp-9/--sp-10` 定值收口（或 body 用 `justify-content: space-between` 把三组内容铺满），钮下不再留 260rpx 无主空白。
- 修复类别：CSS/token

## subpackages/tools/help/index（5 条）

### R11-L07-D20　P2 / 字号　批次 R11-B71
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`6facb16ddcf51116`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:274`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「正文 --fs-xl/2xl 15/16px＝正文·列表主文字」
- 现象：「在线客服／意见反馈／客服邮箱」三行列表主标题取 `var(--f-md)`（tokens.scss:146 → --fs-md 26rpx=13px，属 §1.3「小字：标签·时间戳」档），top 帧上与上方 FAQ 问句（同页 :208 已按 R7 升到 --fs-xl 15px）并排时明显矮一档，同类控件两档并存。
- 建议改法：`.help-contact__label` 改 `var(--fs-xl)`，与 FAQ 问句同档。
- 修复类别：CSS/token

### R11-L07-D21　P1 / 可达性　批次 R11-B71
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`6facb16ddcf51116`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:290`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（--c-brand-600 #2AAE83 / brand-50 #E8FAF3）+ §1.3 极小档仅授「角标·法务」
- 现象：「客服邮箱」行右端「复制」控件标签字号取 `var(--f-xs)`（20rpx=10px），墨色 `--c-brand-600` #2AAE83 落在 `--c-tint-brand` 兜底私值 #E8FAF3 上，实测对比 2.59:1，低于 4.5:1 正文线、也低于 P2 档的 3:1 下限；用户拿不到的是：看不清这枚控件写的是什么动作，只能凭位置盲点整行。
- 建议改法：字号提到 `--fs-sm`(22rpx) 并把墨色改 `--c-brand-700`/`--c-brand-800`（白/浅绿底 ≥4.5:1）。
- 修复类别：CSS/token

### R11-L07-D22　P3 / 颜色token　批次 R11-B71
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`6facb16ddcf51116`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:161`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值，禁止私有色值」
- 现象：「客服邮箱」图标圆底走行内 `var(--c-tint-green-soft, #E8FAF3)`，而 `--c-tint-green-soft` 在 theme/ 与 styles/ 全仓无定义（同族只有 :825 --c-tint-pink-soft、:830 --c-tint-blue-soft），帧上这块浅绿实际由行内私色值渲染；同文件 :292 的 `--c-tint-brand` 同样未注册。
- 建议改法：令牌侧补 `--c-tint-green-soft`/`--c-tint-brand` 定义，页面侧删掉行内十六进制兜底。
- 修复类别：CSS/token

### R11-L07-D23　P2 / 间距　批次 R11-B71
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`6c265f39e0edc749`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:298`
- 理想图依据：无基准，依据=规范文档§1.4 间距表 + 组件规范 AppShell.vue:125-129（未开 tabBarSafe 时 body 底部 padding 为 '0'）
- 现象：页脚提示 `.help-footer` 的 padding 为 `32rpx 24rpx 16rpx`，底部只留 8px 且不含 `env(safe-area-inset-bottom)`，而本页 AppShell 未开 tabBarSafe ⇒ 容器底距为 0；bottom 帧上「若问题仍未解决，欢迎通过在线客服或意见反馈联系我们…」一行下缘被 iOS home indicator 横条压住并被画面下缘裁掉半截字高。
- 建议改法：`.help-footer` 底部 padding 改 `calc(env(safe-area-inset-bottom) + var(--sp-6))`。
- 修复类别：单页

### R11-L07-D24　P2 / 字号　批次 R11-B71
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`6c265f39e0edc749`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:280`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「辅助 --fs-lg/xl 14/15px＝说明」「极小 --fs-xs/sm 10/11px＝角标·法务」
- 现象：三条联系入口的说明行（「恋爱助手 9:00-21:00 在线」「告诉我们你的建议或遇到的问题」「服务时间: 9:00-21:00」）取 `var(--f-xs)`=20rpx=10px，落在 §1.3 只授给「角标·法务」的极小档，比说明档下限 14px 小 4px；bottom 帧上这三行明显读不出，且与同页 :231 答案行 `--f-sm`(11px) 也各成一档。
- 建议改法：`.help-contact__desc` 改 `var(--fs-lg)`（28rpx=14px），与 §1.3 说明档对齐。
- 修复类别：CSS/token

## subpackages/tools/love-center/consulting（5 条）

### R11-L09-D01　P0 / 需新建　批次 R11-B72
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`4135b39dee8c6363`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:50`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.1 条5 + §3 无该页条目（按组件规范）；帧读数=三张课程卡右下价格 ¥99 / ¥129 / ¥159
- 现象：帧上三档课程价与三条课程（恋爱沟通课/脱单攻略课/亲密关系修复课、讲师林老师/陈老师/王老师）全部出自前端写死常量表 COURSE_PRICES(:50-54)+courses(:57-61)，页面不请求任何课程接口（onLoad 只读 contentPageUrls.consultingUrl），handleSignup 只弹 toast ⇒ 用户拿到一张可下单的价目表，但没有任何一门课、任何一个价格有后端真相源
- 建议改法：课程与价格改由后端课程配置下发；接口未就绪前整段课程列表随封存卡一并隐藏，或把 ¥ 数字撤下、标注「示例课程·非售卖」
- 修复类别：需新建目标功能

### R11-L09-D02　P2 / 字号　批次 R11-B72
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`4135b39dee8c6363`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:203`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.3 字体层级表（区块标题 = --fs-3xl/4xl 18/20px 700）；帧读数=「精选课程，助你提升恋爱能力」墨迹实高 14px（y=411–424）
- 现象：区块标题「精选课程，助你提升恋爱能力」走 --fs-lg（真值 28rpx=14px，实测墨迹 14px），比 §1.3 区块标题档 18px 低两档，且与同页课程卡标题（:301 同为 --fs-lg，实测 13px）只差 1px，区块级/条目级字号塌成同一档
- 建议改法：.content-section__title 升到 var(--fs-3xl)（36rpx=18px）并把兜底 32rpx 改成与令牌真值一致的 36rpx
- 修复类别：CSS/token

### R11-L09-D03　P2 / 字号　批次 R11-B72
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`4135b39dee8c6363`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:307`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.3（说明文字 = --fs-lg/xl 14/15px；--fs-xs/sm 10/11px 只给「角标·法务」）；帧读数=「掌握高效沟通，让相处更舒服」墨迹实高 9px（y=467–475）
- 现象：课程描述（用户判断要不要报名的正文级说明）走 --fs-xs=20rpx(10px)，实测墨迹 9px，落在 §1.3 的极小档（角标/法务专用）；同页讲师行 :320 也取 --fs-xs 但兜底写成 20rpx，而本行兜底写成 22rpx ⇒ 同一令牌两档兜底
- 建议改法：.course-card__desc 提到 var(--fs-lg)（28rpx=14px），并把 :307/:320 两处 --fs-xs 的兜底统一为令牌真值 20rpx
- 修复类别：CSS/token

### R11-L09-D04　P2 / 可达性　批次 R11-B72
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`8b547ce708d23bd0`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:355`
- 理想图依据：无基准，依据=§1.5 组件库清单（基础 common：Button/Ripple 统一按压反馈）+ 同页非封存分支 consulting.vue:163 的报名件写法；帧读数=bottom 帧三枚「报名」胶囊（浅底 #F3FAF6 + 描边，实测 x≈290–361）
- 现象：封存态的「报名」在 :137 标了 aria-disabled="true"，却仍绑 @tap 且 :355 这条样式类没挂 press-feedback/hover-class（同页 :163 可点态挂了）⇒ 读屏把它念成「已禁用的按钮」、点下去又确实有响应（弹 commerce.sealedToast），且按下时画面零反馈；状态由「浅底+描边」表达，可访问性树里的状态与真实行为互相矛盾
- 建议改法：要么真禁用（去掉 @tap、加 pointer-events:none 并保留 aria-disabled），要么改 aria-disabled="false" + 文案「暂未开放」，并给 :355 补 hover-class="press-feedback--active" 与同页一致
- 修复类别：单页

### R11-L09-D05　P3 / 颜色token　批次 R11-B72
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`8b547ce708d23bd0`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:180`
- 理想图依据：无基准，依据=§1.1 条3「一令牌一值，禁止私有色值」+ §1.2 色表（页面底 #EEF7F2 / 主文本 #1A1E1C / 次文本 #4A524E / 三级 #6B7571）；帧读数=页面底实测 #EEF7F2（令牌已解析）
- 现象：本页 var() 兜底位写的是另一套 slate 调色板 —— :180 #f4f6fa、:205/:261/:303 #1f2937、:266/:308 #5b6470、:321/:362 #9aa1ab，四个值均不在 §1.2 色表内；帧上因令牌解析成功看不出问题，但它们是零消费者的孤儿值，任一令牌在别的端/暗色块里解析失败，整页会掉进蓝灰 slate 底（与全站浅绿断层）
- 建议改法：把本页全部兜底字面量替换为 §1.2 真值（#EEF7F2 / #1A1E1C / #4A524E / #6B7571），或直接去掉兜底只留 var(--c-*)
- 修复类别：CSS/token

## subpackages/tools/love-center/index（5 条）

### R11-L07-D15　P2 / 文案　批次 R11-B73
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`12ba9a74d858a6be`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:145`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条 + 页自述 :3「恋爱中心 - 恋爱咨询（4 板块）+ 恋爱测试入口」
- 现象：区块标题与它下面第一张板块卡标题引同一个键 `home.loveConsulting`，top 帧上「恋爱咨询」四个字在 24rpx 内连排两遍（区块头一次、卡片标题一次），层级语义塌成重复；R7-L07-D05 只把页头那一处改掉（:115），区块头这一处漏了。
- 建议改法：区块标题改走「咨询服务」一类新键或直接用 `home.loveConsultingSection`，与卡内标题脱开。
- 修复类别：单页

### R11-L07-D16　P2 / 素材缺失　批次 R11-B73
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`12ba9a74d858a6be`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:138`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条「emoji/字符图标一律替换为标准 SVG」
- 现象：行尾指示箭头是裸文本字符「›」（:138 快捷入口、:183 测试入口各一处），top 帧上「附近的人」「MBTI 人格测试」两行右端的箭头细、墨色浅、基线偏上，与同泳道 security 页 8 处同一字符的观感一致，均非 SVG 图标资源。
- 建议改法：统一换用 `IMAGE_PATHS.ICONS_COMMON` 的 chevron SVG（与 :src 图标同一烘焙链）。
- 修复类别：CSS/token

### R11-L07-D17　P3 / 间距　批次 R11-B73
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`12ba9a74d858a6be`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:238`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条 / §0 第 5 条「一令牌一值，页面只准 var(--sp-*)」
- 现象：板块卡内图标/标题/说明的纵向间距硬写 `gap: 8rpx`，同文件其余间距全走 `var(--sp-*)`（:211/:222/:229/:234），且角标 padding 也硬写 `4rpx 12rpx`（:274）——裸值脱离间距档位表，后续统一调档时这两处会漏改。
- 建议改法：`gap: var(--sp-2)`、角标 `padding: var(--sp-1) var(--sp-3)`。
- 修复类别：CSS/token

### R11-L07-D18　P3 / 颜色token　批次 R11-B73
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`a1ffa3236bcf6122`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:203`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（--c-bg-page #EEF7F2 / --c-text-secondary #4A524E / --c-text-tertiary #6B7571）
- 现象：页底 `background: var(--c-bg-page, #f4f6fa)` 的行内兜底是蓝灰 #f4f6fa，与令牌真值 #EEF7F2（design-variables.scss:127）不同色相；同文件 :301 兜底 #6b7280、:339 兜底 #9ca3af 同样与 §1.2 表值不符——一旦变量未注册即整页底色断层，帧上现在靠变量生效才没暴露。
- 建议改法：全部去掉行内兜底色值（或改成与 §1.2 同值），页面只引令牌。
- 修复类别：CSS/token

### R11-L07-D19　P2 / 尺寸比例　批次 R11-B73
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`a1ffa3236bcf6122`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:204`
- 理想图依据：无基准，依据=规范文档§1.4 区块间距 24rpx（末块之后只留安全区，不留整屏空底）
- 现象：bottom 帧与 top 帧除状态栏时钟（3:41→3:42）外逐像素相同 ⇒ 整页零可滚；「MBTI 人格测试」白卡下缘止于 y≈605，其下到 home indicator（y≈799）之间 194px（视口 24%）是纯页面底，页底只留 `padding-bottom: env(safe-area-inset-bottom)` 一项，R6-L09-D07①/R8-L07-D11 删掉留白后空档被留在末块之后而非收口。
- 建议改法：末块之后补一条与 §1.4 同档的区块间距并让内容自然收口（或给页面加一条既有「恋爱报告/更多」入口块），使两帧不再同图。
- 修复类别：单页

## subpackages/tools/love-center/mbti（6 条）

### R11-L08-D23　P1 / 可达性　批次 R11-B74
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`a6c41bb5e47eb826`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:323`
- 理想图依据：无基准，依据=仓内自陈触控下限 88rpx（同 lane nearby.vue:275-279 已按该下限把同角色 64rpx 返回钮提到 88rpx）
- 现象：绿导航栏左侧返回圆钮写死 `width/height: 64rpx`，帧上实测半透明白圆底 x≈8..38（约 31×31px=62rpx，钮心 y≈72），比 88rpx 下限少 26rpx、比同帧底部「提交并查看结果」钮（:494 的 88rpx，bottom 帧实测 y=668..711=44px）矮 1.4 倍；本域 navigationStyle=custom，页内没有第二个返回出口。
- 建议改法：`.content-header__back` 补 `min-width/min-height: 88rpx`（图标 :333 同步 36→40rpx），与 nearby.vue:279 同档。
- 修复类别：CSS/token

### R11-L08-D24　P2 / 字号　批次 R11-B74
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`a6c41bb5e47eb826`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:352`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「标题 --fs-3xl/4xl = 18/20px：区块标题」
- 现象：两个区块标题「16 型人格速览」「简化测试（4 题）」取 `--fs-lg`（真值 28rpx=14.1px，design-variables.scss:564；兜底字面量另写 32rpx，与真值不符），帧上实测墨迹带高仅 12-13px（y=104..115 x=18..103 / y=368..380 x=17..113），落在 §1.3 的「辅助/说明」档；而它下面 16 枚类型卡的代码行（.type-cell__code :415 取 --fs-base 12.1px）与它只差 2px，区块标题与卡内标签层级几乎不分。
- 建议改法：`.content-section__title` 改 `var(--fs-3xl, 36rpx)`（18px 区块档），兜底字面量同步改成 36rpx。
- 修复类别：CSS/token

### R11-L08-D25　P2 / 圆角　批次 R11-B74
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`a6c41bb5e47eb826`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:409`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius = 40rpx = 20px」
- 现象：同一屏两批白底容器圆角取两档：16 枚类型卡（:409 `--r-lg` = 20rpx = 10px）与四张问题卡（:441 `--card-radius` = 40rpx = 20px，R10-L08-D20 已按 §1.4 收敛并点名「同角色两页取档不一」）。帧上类型卡实测单格 x=19..95 / 107..184 / 195..271 / 282..358（4 格 + 3 缝，左右对称 19px，网格本身对齐无误），但四角曲率明显比下方问题卡小一档 ⇒ 同一页内同角色容器两种圆角。
- 建议改法：`.type-cell` 改引 `var(--card-radius, 40rpx)`；若判定小卡应留小档，则在 §1.4 增补「网格小卡 --r-lg」一行并把 :441 一并回落到该档，两页同改，不要一页两档。
- 修复类别：CSS/token

### R11-L08-D26　P3 / 颜色token　批次 R11-B74
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`a6c41bb5e47eb826`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:335`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条（令牌须有实际消费者）+ 同 lane activities/detail.vue:487-489 已删的同一条孤儿声明
- 现象：`.content-header__back-icon` 挂着 `color: var(--c-text-inverse, #ffffff)`，而 :149 该节点是裸 `<image>`（src 取 IMAGE_PATHS.ICONS_V2.BACK，:33 单色 #333333 PNG），CSS color 对位图无效——帧上返回折线实测为深墨（x≈24 处 #40CC9E 之下的 #0F513E/#0B4937 系），声明与实际渲染不符；同一条孤儿声明在 activities/detail.vue:487 已由 R10-L08-D09 删除，本页未同步。
- 建议改法：删掉 :335 这条 `color`（与 detail.vue:487 同处理），需要改墨色时换素材档而不是挂 CSS color。
- 修复类别：CSS/token

### R11-L08-D27　P2 / 字号　批次 R11-B74
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`99a9cab13bafea65`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:480`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「正文 --fs-xl / 2xl = 15 / 16px：正文·列表主文字」
- 现象：bottom 帧上 8 个单选项（约朋友出去玩 / 一个人安静休息 / 具体的事实细节 / 未来的可能性 / 逻辑分析 / 内心感受 / 提前规划 / 随性灵活）是测试唯一的决策输入，其文字取 `--fs-base`（真值 24rpx=12.1px，低于 §1.3 正文线），帧上实测各选项墨迹带高 11px（y=170..180 / 217..227 / 306..316 / 353..363 / 442..453 / 490..500 / 579..589 / 626..636），8 行全部落在 §1.3 的「标签·时间戳」档；选项行容器 min-height 88rpx（:464）与 12px 字面之间留白过大，读起来像占位框而不是可选项。
- 建议改法：`.quiz-option__text` 改 `var(--fs-xl, 30rpx)`（15px），与同页题干 :448 的 --fs-lg 拉开一档层级。
- 修复类别：CSS/token

### R11-L08-D28　P2 / 间距　批次 R11-B74
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`99a9cab13bafea65`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:516`
- 理想图依据：无基准，依据=规范文档§1.4 间距表（满屏页底段须由 sp 阶梯 + 安全区收口，不留无主死白）
- 现象：末位控件「提交并查看结果」实测钮带 y=668..711（x=16..361，高 44px=88rpx 达标），其下到系统 home 指示条（实测 y=800..804）之间剩 89px 纯 #EEF7F2 空底；该段由 :516 `height: calc(120rpx + env(safe-area-inset-bottom))` 造出——模拟器 env()=0 时只兑现 60px，余下 29px 来自 :506 的 `margin-top: var(--sp-4)` 与滚动容器尾部，两笔都不落在 §1.4 的 sp 阶梯上，且真机上这 60px 会与 safe-area 叠加成 96px 的另一档。
- 建议改法：`.content-footer-space` 改 `height: calc(var(--sp-8) + env(safe-area-inset-bottom, 0px))` 单一定义，钮下不留无令牌归属的空段。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（6 条）

### R11-L08-D18　P0 / 文案　批次 R11-B05
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`5b977cefd3172450`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:355`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（画面读数须来自真实数据）+ 组件规范 CardSwiper 匹配度位（:1298 注释自陈「设计稿：♥ 80% 与你很合拍」）
- 现象：帧上卡片左下粉圈读数「80% 匹配」是前端常量算式的产物，不是任何兼容性计算：`matchScore = Math.min(98, MATCH_SCORE_BASE + base * MATCH_SCORE_STEP)`，三枚常量在 constants/match.ts:92/95/98 写死为 80/5/98，`base = card.commonCircleCount ?? 1`，而 stores/discover/utils.ts:51 把该字段归一为 `raw.commonCircleCount ?? 0` ⇒ 后端不下发共同圈时读数恒等于底数 80。帧上「80%」正是这个裸常量：这张卡与当前用户的共同圈数为 0（一个共同点都没有），却被展示成「80% 匹配」，且 :362 因 80<85 只挂「匹配」二字，用户据此排序喜欢/跳过 ⇒ 直接误导决策的假数据。
- 建议改法：后端不下发共同圈/兼容性字段时该位整块不渲染（与 :366 aria 同源判定），禁止用 MATCH_SCORE_BASE 冒充读数；需要展示时改成语义确定的「暂无共同圈」而不是百分比。
- 修复类别：单页

### R11-L08-D19　P1 / 文案　批次 R11-B05
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`5b977cefd3172450`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:300`
- 理想图依据：无基准，依据=规范文档§1.1 第 4 条（视觉元素用标准素材，禁裸符号占位）+ 本页 :210 注释自陈「masked 蒙面模式」
- 现象：本页 :216 传 `:masked="true"`，昵称槽于是把四个 ASCII 问号当文案硬编码进模板（`props.masked ? "????" : ...`），帧上落在卡片身份带的最大字号位（实测昵称行白字带 x=24..200 / y=463..500，昵称段即该带左端一组），一排「?????」占满整页第一视觉锚点——不是脱敏姓名而是一串字面问号，既读不出是缺字段、素材失败还是刻意匿名，也没有 aria 兜底（:300 只给文本节点）；同帧 :1236-1238 已经挂了一句语义正确的「互发喜欢解锁头像」，问号串与之重复且信息量更低。
- 建议改法：昵称槽改引既有脱敏口径（如「同城同学 · 待解锁」一句，取 discover 段内已有键）并保留 aria-label，删掉 ASCII 问号字面量。
- 修复类别：单页

### R11-L08-D20　P1 / 空态文案　批次 R11-B05
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`5b977cefd3172450`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:536`
- 理想图依据：无基准，依据=本页自述 :52-58「与寻觅页"附近"语义对齐——透传 distanceMax 距离上限筛选」+ 规范文档§1.1 第 5 条
- 现象：页名「附近的人」（nearby.vue:183）承诺的唯一决策要素是距离，而 :58 虽按 `NEARBY_MAX_DISTANCE_KM` 过滤，后端未下发 distanceText 时左上徽章整条落 `同城 · 距离未知`（实测该带白字墨迹 x=48..122 / y=124..133，全帧无任何 km 数值读数）⇒ 卡片照常进入「附近」结果集却给不出「近」在哪里；同帧 :1267-1268 的 meta 行因 `v-if="identityDistance"` 又把距离槽整块删掉，一屏内距离「出现一次弱态、缺席一次」，两处口径不自洽。
- 建议改法：距离缺失时把该卡降级出「附近」列表（或落到「同城」分组并在页头给一句「未开启定位，当前展示同城」），并让 :1267 meta 行与顶部徽章同一显隐口径。
- 修复类别：单页

### R11-L08-D21　P2 / 文案　批次 R11-B05
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`5b977cefd3172450`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1269`
- 理想图依据：无基准，依据=组件规范 CardSwiper 卡内信息分层（:1186「顶部信息条：左上距离 / 右上在线」、:1266「③ 距离 · 活跃状态」）
- 现象：同一个 `activeStatusLabel`（:398 单一 computed）在一屏内被渲染两次：:1197 的右上绿底胶囊「在线」（实测胶囊带 x=280..368 / y=110..150）与 :1269 的 meta 行「● 在线」（实测该带白字起于 x=23 / y=498..522），两条读数同值、同色、同义，帧上白占一行垂直空间，把兴趣标签行（摄影/阅读/运动）与简介整体下压一挡。
- 建议改法：蒙面/纯匹配版只保留右上胶囊（:1269 加 `v-if="!masked"` 或与 :1268 同删距离槽后整行收起）。
- 修复类别：单页

### R11-L08-D22　P2 / 间距　批次 R11-B75
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`f3da2cf13760c06a`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:298`
- 理想图依据：无基准，依据=规范文档§1.4 间距表（满屏页底段须由 sp 阶梯与安全区收口）
- 现象：本页 `.content-page` 为 `height: 100vh` 不滚动（nearby.vue:221-226 自证），尾部 `.nearby-tail` 用 `margin-top: auto` 锚到视口底，而卡片区只给了 `padding: var(--sp-2) 0 var(--sp-6)`（下内边距 24rpx=12.1px）、**没有任何 `env(safe-area-inset-bottom)`**；帧上「看看全部推荐」钮（min-height 88rpx，:352）文字墨迹止于 y≈784、钮底约落在 y≈797，与系统 home 指示条实测带 y=800..804 直接相接 ⇒ 该页唯一批量出口的下沿触控位压在 home 指示条上。
- 建议改法：`.nearby-card-area` 底部 padding 改 `calc(var(--sp-6) + env(safe-area-inset-bottom, 0px))`，与同 lane LockScreen.vue:820 的收口口径一致。
- 修复类别：CSS/token

### R11-L08-D29　P2 / 位置　批次 R11-B05
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`f3da2cf13760c06a`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1299`
- 理想图依据：规范文档§3.3 寻觅页说明（本页 nearby.vue:8-10 自述「复用寻觅的卡片组件 CardSwiper」，故按该节卡片要素表比对）：「底部 40% 渐变蒙层上叠 姓名/年龄性别/学校专业/距离在线/兴趣标签/签名、**右下匹配度绿圆环**」
- 现象：匹配度读数落在卡片**左下**而非右下（实测粉白墨迹带 x=20..200 / y=571..600，左缘贴卡内 24rpx 内边距），形态是 28rpx 高的实心胶囊而非圆环，配色取心动粉 #FF6B81（帧上该带实测众数 #FF6B81，与同卡右下空位无物）⇒ 与 §3.3 明确的「右下 + 绿圆环」两处同时偏离；:1241 注释记录这是 2026-08-14 有意改版（「匹配度粉圈置顶 → …」），改版未回写 §3.3，形成规范与实现的口径分叉。
- 建议改法：二选一并写进规范：要么把 :1299 的 badge 移到蒙层右下并改 `XunmiMatchRing` 绿圆环档，要么在 §3.3 增补「匹配度＝左下粉胶囊」一行，别让下一轮继续按旧口径判。
- 修复类别：单页

## subpackages/tools/search/index（5 条）

### R11-L08-D01　P2 / 层级遮挡　批次 R11-B76
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`c788231c9c17a2ef`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:520`
- 理想图依据：无基准，依据=规范文档§1.1 第 5 条（视觉元素须完整可辨）+ 同帧系统胶囊几何
- 现象：头部行右内边距按 `calc(var(--capsule-right, 7px) + 73px)` 只预留 80px，而本帧系统胶囊矩形左缘实测在 x=293（屏宽 378 ⇒ 占位 85px）；「取消」墨迹起于 x=274、可见止于 x=292（宽 19px），按同帧标定（「标签」二字 13px 档实测 25px 宽 ≈ 12.5px/字）该 14px 字号两字应占 ~27px，即 x=274..301 ⇒ 末字「消」右半约 9px 被胶囊白底吞掉。
- 建议改法：把 `.search-header` 右内边距常量从 73px 提到 `--capsule-right + 85px`（或直接用胶囊左缘算式），并给 `.search-cancel` 加 `max-width` 约束使其整体落在胶囊左侧。
- 修复类别：CSS/token

### R11-L08-D02　P2 / 颜色token　批次 R11-B76
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`c788231c9c17a2ef`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:723`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值，禁止私有色值」+ §1.2「卡片 --c-bg-container #FFFFFF」
- 现象：分组条底色写死裸值 `#ffffff`（非令牌），而未选中 Tab 的 `.search-tab` 底色取 `--c-bg-container`（真值同为 #FFFFFF，见 :737）⇒ 帧上分组条整带 #FFFFFF（实测 y=110..159 全域），「标签」「学校」两枚 Tab 的胶囊底与其容器同色、边界 0 像素，只剩两坨 12.5px/字的黑字（墨迹 x=92..116、x=156..180），与左侧选中态那枚 #36C99A 实心胶囊（x=13..68）并置后读起来像「一个按钮 + 两段说明文字」，不像三选一分组控件。
- 建议改法：`.search-tabs` 底色改引 `var(--c-bg-container)`，`.search-tab` 未选中档改吃与容器可区分的浅底（如 `var(--c-bg-surface, #F3FAF6)` 或 `--c-brand-50`）并补 `--c-border-light` 描边。
- 修复类别：CSS/token

### R11-L08-D03　P2 / 素材缺失　批次 R11-B76
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`c788231c9c17a2ef`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:351`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue（type 分档配图）+ 规范文档§1.1 第 4 条（视觉元素一律标准 SVG 素材）
- 现象：未输入的检索引导态复用 `type="no-data"` 的通用「无数据」插画——帧上是一枚 3D 立方体线框（实测墨迹 x=165..214 / y=431..482，约 50×52px=100rpx），与「搜索」语义无关，且与同页结果空态（:361/:383/:438 同一 type）共用同一张图，用户无法从插画区分「还没搜」与「搜了没有」。
- 建议改法：给 EmptyState 增/接一个 `type="search-empty"`（放大镜+气泡类）插画档，本页 :351 改引该档，结果空态继续用 no-data，两态配图分离。
- 修复类别：需新建目标功能

### R11-L08-D04　P1 / 空态文案　批次 R11-B76
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`c788231c9c17a2ef`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:302`
- 理想图依据：无基准，依据=本页自述 :5「顶部搜索框（自动聚焦）+ 热搜词/搜索历史（未输入时）」+ 规范文档§1.1 第 5 条
- 现象：bottom 帧与 top 帧逐字节同图（两帧 sha16 均为 c788231c9c17a2ef），全页除头部两行外只有一枚空态：「热搜」区被 :302 的 `v-if="hotSearches.length > 0"` 挡死、「搜索历史」区被 :323 的 `v-if="history.length > 0"` 挡死，帧上 y=160..814（占视口 81%）内 0 条热搜 chip、0 条历史 chip、0 个入口，页面自述的两大预检索模块整块缺席，用户不逐字敲键盘就没有任何可点的检索起点。
- 建议改法：热搜为空时按 :345-350 已批口径落「本地历史 + 分组默认词（用户/标签/学校各取既有键）」兜底列表，不把整块让给一枚 no-data 空态；后端 /search/hot 缺数据另记 NEEDS-DATA。
- 修复类别：单页

### R11-L08-D05　P2 / 间距　批次 R11-B76
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`c788231c9c17a2ef`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:595`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding = 32rpx = 16px」
- 现象：未搜索态容器 `.suggest-wrap` 写死 `padding: 24rpx`（=12.1px），比 §1.4 页边距令牌 32rpx 少 8rpx；同页其余三处内容容器各自另写一档（:686 `.result-wrap` 16rpx、:699/.703 24rpx、:755 `.group-list` 16rpx 24rpx），帧上热搜/历史/结果区一旦出内容，左右留白会互不对齐。
- 建议改法：`.suggest-wrap` 与同页其余三处统一改引 `var(--page-padding, 32rpx)`。
- 修复类别：CSS/token

## subpackages/tools/security/index（6 条）

### R11-L07-D25　P2 / 尺寸比例　批次 R11-B77
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`847b5275a6d0a09b`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:982`
- 理想图依据：无基准，依据=规范文档§1.3「极小 --fs-xs/sm＝角标」+ 组件规范 UnreadBadge/Tag 角标须单行成胶囊
- 现象：「登录设备」首行的「当前设备」角标在帧上折成两行（「当前设」/「备」），胶囊被拆成两截——`.sec-item__badge` 只有 font-size/color/padding，没有 `flex-shrink: 0` 与 `white-space: nowrap`，而同行主标题「手机号登录 · iPhone 12/13 (Pro)」占满 `.sec-item__label-row`（:960 flex 行）余宽。
- 建议改法：角标补 `flex-shrink: 0; white-space: nowrap;`，并给 `.sec-item__label` 加 `min-width: 0` 让长设备名先截断。
- 修复类别：单页

### R11-L07-D26　P2 / 字号　批次 R11-B77
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`847b5275a6d0a09b`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:967`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「正文 --fs-xl/2xl 15/16px＝正文·列表主文字」
- 现象：本页 9 行列表主标题（绑定手机号/修改密码/绑定微信/绑定 Apple/各设备行/权限设置/隐私政策/注销账号）取 `var(--fs-lg)`=28rpx=14px，落在 §1.3「辅助·说明」档；同分包 love-center 的同类行标题已按 R8-L07-D10 升到 `--fs-xl`(15px)（love-center/index.vue:292），两页同域取档不一。
- 建议改法：`.sec-item__label` 改 `var(--fs-xl)`，与 love-center 行标题同档。
- 修复类别：CSS/token

### R11-L07-D27　P3 / 颜色token　批次 R11-B77
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`847b5275a6d0a09b`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:984`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值，禁止私有色值」
- 现象：「当前设备」角标底 `var(--c-tint-brand, #E8FAF3)` 与设备行图标圆底 `var(--c-tint-green-soft, #E8FAF3)`（:634）、:670 `--c-lavender-100`、:688 `--c-sky-50` 四处行内令牌在 theme/ 与 styles/ 均无定义，帧上这几块浅底其实全部由行内十六进制私值渲染；:670/:680 的紫、蓝底更不在 §1.2 色板内（表内只有 --c-purple #A29BFE / --c-status-info #4D8DFF）。
- 建议改法：缺的定义进 design-variables.scss 并删行内兜底，紫/蓝两底改指 §1.2 已登记的 tint 档。
- 修复类别：CSS/token

### R11-L07-D28　P2 / 层级遮挡　批次 R11-B77
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`db0f190cd3810ae6`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:712`
- 理想图依据：无基准，依据=组件规范 AppShell.vue:125-129（tabBarSafe 关闭时 body 底部 padding 返回 '0'）
- 现象：bottom 帧（滚动终态）上「危险操作」卡最后一行的说明「注销后账号与数据将被删除」下缘被 iOS home indicator 横条压住、并被画面下缘切掉，末行整块贴死视口底——注销账号是本页唯一的不可逆操作，其风险提示文字处于半遮状态。
- 建议改法：给 `.sec-list` 末块或页容器补 `padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-8))`。
- 修复类别：单页

### R11-L07-D29　P2 / 文案　批次 R11-B77
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`db0f190cd3810ae6`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:152`
- 理想图依据：无基准，依据=页自述 :138-145「点『下线』前根本判断不出是哪台设备」（R6-L09-D13 改造口径）
- 现象：bottom 帧 y≈352 那一行主标题只剩「手机号登录」四个字（无型号、无尾号），而上下相邻行是「手机号登录 · in-a」「· vice」「· udit」——`deviceRowLabel` 在 deviceId 缺失或为 "unknown" 时把尾号整段丢掉，只剩登录方式，用户无法把这行与任何一台设备对上，却仍带着一枚可点的「下线」。
- 建议改法：尾号为空时回落到 `t("security.unknownDevice")` 占位（同 :166 当前设备行口径），不给裸登录方式。
- 修复类别：单页

### R11-L07-D30　P3 / 颜色token　批次 R11-B77
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`db0f190cd3810ae6`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:1015`
- 理想图依据：无基准，依据=规范文档§1.2 配色表「错误 --c-error #E5454D」
- 现象：「下线」控件文字（以及 :973 注销账号标题、:1068 弹层错误、:1099 危险按钮底）四处写 `var(--c-error, #f43f5e)`，兜底是 Tailwind red-200 系私值，与令牌真值 #E5454D（design-variables.scss:66）不同色相；R6-L09-D14 已按同一口径清掉 `#fee2e2` 行内兜底（:1005-1009 注释），这批同性质兜底漏清。
- 建议改法：四处删掉行内十六进制兜底，只留 `var(--c-error)`。
- 修复类别：CSS/token

## subpackages/village/village/detail（2 条）

### R11-L03-D03　P1 / 文案　批次 R11-B78
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`0e70889619505535`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1410`
- 理想图依据：帖子.png（正常帖子详情；副标题位绝不应出现工程字符串）
- 现象：未找到卡副标题直接渲染成裸 i18n 键「share.shareVillage」（:1410 t("share.shareVillage")，该键无中文词条故回落键名），画面上「帖子不存在或已被删除」下方是一串用户读不懂的工程字符串。
- 建议改法：副标题改指一个已有中文键（如 village.detail.postNotExistDesc）或补 share.shareVillage 词条，禁止回落键名上屏。
- 修复类别：单页

### R11-L03-D04　P2 / 可达性　批次 R11-B78
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`e0f11a0f4fabb1ad`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:2994`
- 理想图依据：帖子.png（详情页动作区控件尺寸）
- 现象：未找到卡「返回 / 返回广场」两颗动作钮上下内距仅 16rpx（:2994），实测热区高约 66rpx < 88rpx；因顶部导航返回箭头可作替代出口故降 P2，但主恢复动作仍偏小。
- 建议改法：动作钮上下内距提到使热区 ≥88rpx（padding 纵向 ~22rpx 或设 min-height:88rpx）。
- 修复类别：CSS/token

## subpackages/village/village/history（2 条）

### R11-L03-D07　P2 / 文案　批次 R11-B79
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__history__top.png`（sha16=`9e2be5170f4c2857`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:237`
- 理想图依据：无基准，依据=组件规范（同一列表时间戳取档一致性）
- 现象：同一 4 条记录列表时间粒度不一致——前三条相对「1/2/3 天前」、第四条绝对「2026/10/06」（均走 :237 formatRelativeTime），用户无法判断第四条距今多久。
- 建议改法：统一时间口径（同列表内要么全相对、要么超阈值项也带相对提示），避免一屏两制。
- 修复类别：单页

### R11-L03-D08　P2 / 可达性　批次 R11-B79
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`f3cae3b25150ca1b`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:388`
- 理想图依据：无基准，依据=组件规范 §1.3 控件热区档
- 现象：破坏性动作「清空记录」胶囊上下内距仅 8rpx（:388 padding: 8rpx 24rpx），实测热区高约 50rpx < 88rpx；因有确认弹窗兜底故降 P2，但误触/漏点概率高。
- 建议改法：纵向内距提到使热区 ≥88rpx（padding 纵向 ~20rpx 或 min-height:88rpx）。
- 修复类别：CSS/token

## subpackages/village/village/index（2 条）

### R11-L02-D08　P1 / 可达性　批次 R11-B80
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__index__top.png`（sha16=`7039a3906ecef14a`）
- 源码证据：`apps/client/src/subpackages/village/village/index.vue:616`
- 理想图依据：无基准页，依据=规范文档§3（村口 feed 应有 village-header + ChannelTabs + 帖子列表）+ src/components/common/LockScreen.vue 组件规范
- 现象：以 A（登录态）口径取帧，整屏却是 LockScreen 登录门（文案走 logged-out 支），村口 feed 主体（:622-665 的标题/搜索/频道 Tab/帖子列表）在帧上完全缺席，登录态能否绕过该门未证
- 建议改法：用 A 登录态（profileComplete=true）重拍确认 feed 可达；若门槛按 profileComplete 卡，按 §3 补该页门槛与游客可达性说明
- 修复类别：单页

### R11-L02-D09　P1 / 可达性　批次 R11-B80
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`f534f717788e1547`）
- 源码证据：`apps/client/src/subpackages/village/village/index.vue:616`
- 理想图依据：无基准页，依据=规范文档§3（村口 feed 为可滚动的频道 Tab + 帖子列表）
- 现象：底帧与顶帧逐像素相同（56 字节差为状态栏时钟，非内容），滚动到底仍停在同一张锁定门——可滚动的 feed 内容从未出现，「bottom」状态无内容可交付
- 建议改法：以 A 登录态重拍，确认 channel-feed（:653 scroll-view）能滚出帖子列表；游客门控另立一条门槛说明
- 修复类别：单页

## subpackages/village/village/post（2 条）

### R11-L03-D01　P2 / 素材缺失　批次 R11-B81
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__post__top.png`（sha16=`d5b0b79441153a7b`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1027`
- 理想图依据：无基准，依据=规范文档 §3.14 统一发布页「底部工具栏（图/视频/话题/位置/提及/更多 6 图标）」
- 现象：底部工具栏实测只有 5 个入口（图片/话题/位置/提及/更多，:1036/:1047/:1057/:1067/:1077），缺规范点名的「视频」项，工具栏比 §3.14 少一格。
- 建议改法：按 §3.14 补第 6 个「视频」工具入口（或与规范确认后正式裁掉该项并同步文档）。
- 修复类别：单页

### R11-L03-D02　P1 / 颜色token　批次 R11-B81
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`29cf45fcab6a9494`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1606`
- 理想图依据：无基准，依据=组件规范 §1.1 色义分工 + 正文级文字对比 4.5:1 口径
- 现象：底部「发帖小贴士」标题「发帖小贴士」取 --c-brand #36C99A 压在 --c-brand-50 #EAF9F3 浅绿底（:1591/:1606）上，实测对比约 1.9:1，低于正文 4.5:1 也低于 3:1，用户读不出这条提示的标题。
- 建议改法：标题改用深档 brand-800 #156B51（对白/对浅绿底 6.45:1），与本页其它主色文字同档。
- 修复类别：CSS/token

## subpackages/village/village/publish（2 条）

### R11-L02-D10　P2 / 文案　批次 R11-B82
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`bdc16a7fe353bb7c`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:848`
- 理想图依据：发布帖子页面.png 正文计数「0/1000」；规范文档§3.14「正文输入（0/1000）」
- 现象：正文框计数上限为 500（帧上「12/500」），理想图与 §3.14 均要求 1000，实际只放开了规定字数的一半
- 建议改法：将 stores/village MAX_CONTENT_LENGTH 与后端校验同步提到 1000（否则改 §3.14/理想图口径，二者取一）
- 修复类别：需新建目标功能

### R11-L02-D11　P2 / 需新建　批次 R11-B82
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`869327eae591993b`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1060`
- 理想图依据：发布帖子页面.png 底部工具栏第 5 枚为「更多(···)」，首枚为「图片/视频」；规范§3.14 列 6 图标（图/视频/话题/位置/提及/更多）
- 现象：底栏第 5 枚渲染成「谁可以看」（眼睛图标），理想图明确要求的「更多」控件缺失，首枚「图片/视频」也降级为仅「图片」
- 建议改法：补「更多」溢出菜单与「视频」入口（需后端/弹层支撑），或按理想图把第 5 枚恢复为「更多」
- 修复类别：需新建目标功能

## subpackages/village/village/tag-posts（2 条）

### R11-L03-D05　P2 / 颜色token　批次 R11-B83
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`52a33b8e4f4de268`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:895`
- 理想图依据：无基准，依据=规范文档 §1.6 令牌铁律（样式一律走运行时 --c-* 令牌）
- 现象：帖子卡正文/时间/互动计数（:812/:864/:895 用 $text-primary/$text-tertiary、:846 用 $green-primary）吃编译期 SCSS 变量，而同文件标题/按钮已走 var(--c-*)，两套令牌混用，深色档下这些文字不随主题翻转。
- 建议改法：把上述 $text-*/$green-primary 统一替换为对应运行时令牌 var(--c-text-primary/--c-text-secondary/--c-brand-800)。
- 修复类别：CSS/token

### R11-L03-D06　P2 / 文案　批次 R11-B83
- 帧：`tmp/qa/frames/R11/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`9f1dd1a70010e456`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:477`
- 理想图依据：帖子.png（互动栏明确显示点赞 256 / 评论 32 计数）
- 现象：互动计数 v-if="post.likes > 0"（:477，转发 :488 同），计数为 0 时整段消失，帧上心形与转发图标旁空白、评论却显「1/2」，右簇参差且用户分不清「0」还是「未加载」。
- 建议改法：计数恒显示（0 也渲染「0」），与理想图互动栏一致，避免图标旁空缺。
- 修复类别：单页

