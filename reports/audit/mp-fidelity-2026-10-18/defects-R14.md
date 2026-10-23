# R14 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=204　涉及页面=67　涉及帧=132　泳道卡=14
- 严重度分布：P2=124　P3=63　P1=17
- 轴分布：颜色token=49　可达性=36　文案=26　字号=23　间距=19　位置=15　圆角=9　尺寸比例=8　素材缺失=8　层级遮挡=4　空态文案=4　需新建=3
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0
- 批次归属：204 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/discover/index（3 条）

### R14-L01-D05　P1 / 可达性　批次 R14-B18
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__discover__index__top.png`（sha16=`3a8b55654a5509bc`）
- 源码证据：`apps/client/src/pages/discover/index.vue:491`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 右上角漏斗筛选钮（深色、显著、可点）
- 现象：页头筛选钮实体 72×72rpx（:491 width:72rpx），低于 88rpx 最小可点件口径；它还是筛选抽屉 FilterDrawer（:382）在全页的唯一入口（tap 只挂在此钮 ：263 openFilterDrawer，页内无其它筛选出口）。按口径属「必点控件热区 <88rpx 且没有替代出口」：用户拿不到点得中的筛选功能——36×36px 热区，偏 6px 即落空或误入卡片区。
- 建议改法：视觉 72rpx 保留，外包 88rpx 透明热区（同 register .agree__hit 的 padding+负 margin 口径），tap 移到热区层。
- 修复类别：单页

### R14-L01-D06　P2 / 间距　批次 R14-B09
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__discover__index__top.png`（sha16=`3a8b55654a5509bc`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:336`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片底部——简介两行与卡底缘之间有整段留白
- 现象：顶帧「今日剩余 10 次」胶囊压缩卡高后，简介第二行「步。」字形底缘实测 y≈517、卡底缘 y≈519，间距 ≤2px，直接贴卡底圆角；而 .match-card__info 声明的 padding-bottom 为 --sp-7（32rpx=16px，:336），实测未兑现，信息列底部内衬在实拍帧失效。
- 建议改法：mp 端给 .match-card__info 底部内衬加固定安全高度（min-height 或 px 兜底），复拍核末行距卡底 ≥16px；勿用 :deep 跨组件写法兜底。
- 修复类别：单页

### R14-L01-D07　P2 / 间距　批次 R14-B09
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__discover__index__bottom.png`（sha16=`bacc0942df1151a4`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:343`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png——简介文字列止于卡宽约 42%，与右侧 92% 匹配环之间留白约 30% 卡宽
- 现象：R11-L01-D16 用 `.match-card :deep(.match-info){max-width:60%}`（:343）给 160rpx 匹配环让位，但底帧实测简介首行「岭南学院，爱在西门买糖水，晚自习后散」延伸到 x≈268，占内容盒约 75%——60% 限宽在 mp-weixin 跨组件样式隔离下未生效；环白心左缘实测 x≈275、环带 x≈272，文字与环仅剩 4px 余量（上一轮该轴修得不对：约束没落到真机渲染），文案稍长即压环。
- 建议改法：把限宽写进 MatchInfo.vue 自身根节点（.match-info{max-width:60%}），或给 .match-info__intro-text 加 padding-right:176rpx 兜底，不用 ：deep 跨组件选择器承担布局。
- 修复类别：单页

## pages/home/index（2 条）

### R14-L01-D08　P3 / 字号　批次 R14-B07
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__home__index__top.png`（sha16=`038d8a9d61097e62`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:196`
- 理想图依据：素材/理想效果图/首页.png 今日恋爱进度四瓷贴——「回复悄悄话」等标签全部单行
- 现象：瓷贴标题「回复悄悄话」折成两行带孤字：帧实测两条文字带 y≈572–581（整行 5 字位）与 y≈587–597（稀疏 4–7 像素命中＝孤字短行），加 y≈611–617 的「待开始」共三段。R11-L01-D18 把标题归档 --fs-md(26rpx≈13px)（:196）后，5 字 ×13px=65px 超出瓷贴内容盒约 61px，R21 的 white-space:normal（:200）放行后落成孤字折行，与理想图单行标签不一致。
- 建议改法：瓷贴标题按「单行可容」重取档（--fs-base 24rpx 或压缩瓷贴水平内距），保 5 字标题单行，改完复拍核四格标签行数一致。
- 修复类别：单页

### R14-L01-D09　P2 / 尺寸比例　批次 R14-B06
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__home__index__bottom.png`（sha16=`4e6ed866a08997d5`）
- 源码证据：`apps/client/src/components/home/InterestRecommendation.vue:170`
- 理想图依据：素材/理想效果图/首页.png 兴趣推荐行——4 张圈卡满排一屏（单卡约占屏宽 21%）
- 现象：圈卡定宽 216rpx（:170，另 ：194 同值），底帧像素实测卡 1 x≈18–124＝106px≈212rpx、一屏只容 2.9 张（第三张 x≈254–360 已贴屏缘）；理想图同位置 4 张满排（单卡 ≈155–168rpx）。卡片横向超档约 29%，用户一屏少看到约 1.1 张圈卡。
- 建议改法：卡宽降到 160–168rpx 档并对齐理想图 4 卡节奏（间距同步归 --sp-* 阶梯），复拍核一屏 4 张。
- 修复类别：单页

## pages/messages/index（2 条）

### R14-L02-D01　P2 / 文案　批次 R14-B19
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__messages__index__top.png`（sha16=`e093fe59ad97e4e2`）
- 源码证据：`apps/client/src/pages/messages/index.vue:86`
- 理想图依据：素材/理想效果图/消息.png 助手卡区域（横幅计活动数）＋ deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3.6
- 现象：助手卡横幅读数「今天附近有 3 场活动适合你参加」，计数取 dashboard.assistant 数组 length（:86）；同屏底部活动推荐同源共 3 卡，其中第 3 卡是「有人喜欢你／1 人喜欢了你」社交提醒（绿心图标，非活动、无时间地点），即 3 条里只有 2 条是活动，「3 场活动」计数虚高 1。
- 建议改法：计数只统计活动类条目：后端给 assistant 条目补 type 字段按真值过滤（接真字段），或前端按 activityIconFor 同款语义判定排除社交条目后再计数。
- 修复类别：单页

### R14-L02-D02　P3 / 文案　批次 R14-B19
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__messages__index__bottom.png`（sha16=`683f46e5e2bb1d45`）
- 源码证据：`apps/client/src/pages/messages/index.vue:89`
- 理想图依据：素材/理想效果图/消息.png（无活动推荐混排社交卡）＋规范文档 §3.6（活动推荐列表=活动卡口径）
- 现象：活动推荐列表第 3 卡读数「有人喜欢你／1 人喜欢了你／查看详情」，与本屏顶部快捷卡「有人喜欢你／1 人喜欢了你／去看看」同文重复；activityRecommendations（:89-94）直接映射 dashboard.assistant 全量、仅按 title 过滤，无类型区分，社交提醒混进活动列表冒充活动卡。
- 建议改法：映射时排除社交提醒类条目（或单列「互动通知」卡样式），不与活动混排；来源真相仍走 dashboard.assistant 的真实字段。
- 修复类别：单页

## pages/nearby/index（2 条）

### R14-L01-D10　P3 / 文案　批次 R14-B20
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__nearby__index__top.png`（sha16=`e7e6b0c408c9d240`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:669`
- 理想图依据：素材/理想效果图/附近的首页.png 同屏无逐字重复的分区命名（规范文档§3.5 虽要求「附近的人」分区，但未要求分区名与卡内标题逐字同名）
- 现象：「附近的人」一词同屏出现三处——①分区标题（:669 NearbySection title=t('nearby.peopleTitle')，帧 y≈296）、②其下首张入口卡标题同为「附近的人」（帧 y≈337，副题「按距离找到身边的人」）、③再往下分段 tab 又是「附近的人/同城的人」（帧 y≈460）。同屏三行同名，标题层级读成重复，理想图与规范均无此逐字重复。
- 建议改法：入口卡标题改语义短句（如「找附近同学」/复用副题档），或分区标题在入口卡在场时隐藏，保留一处命名；文案键走 i18n 不新造硬编码。
- 修复类别：单页

### R14-L01-D11　P2 / 素材缺失　批次 R14-B20
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__nearby__index__bottom.png`（sha16=`6ca356ab30f58ffe`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:586`
- 理想图依据：素材/理想效果图/附近的首页.png 右下角绿色悬浮「+」快速发布钮（动态流区常驻）
- 现象：理想图右下角有常驻悬浮「+」发布钮；bottom 帧（动态流满屏）与 top 帧右下角均无此钮，页内发布入口仅剩页头「发动态」胶囊（:586）。功能可经页头到达，用户拿不到的只是理想图承诺的常驻快捷发布入口，写不出 P0/P1 级实质损失，故降 P2。
- 建议改法：二选一并登记裁决：补常驻 FAB（56–88rpx，tap 接既有 goToPublishPost，避让 tabBar），或在对账表登记「理想图差异——以页头入口为准」的已裁决结论；不许第三种含糊态。
- 修复类别：单页

## pages/profile/index（2 条）

### R14-L02-D03　P2 / 文案　批次 R14-B12
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__profile__index__top.png`（sha16=`8a5b50f7617cf807`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:73`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 页头（姓名/♀/年龄学校城市/距离在线/签名）＋规范文档 §3.8 布局行
- 现象：页头姓名读数「曦风QA链」、简介行读数「修复复验简介·第二轮 2026-10-06T23:06:22 写入」——QA 修复验证种子文案直接上屏；且理想图要求的 ♀ 性别图标、年龄学校城市行、距离在线行全缺，仅剩「在线」胶囊（:69 metaLine 为空被 v-if 隐藏）。QA 种子人格在 profile 头部形成在册族（仅登记 nearby people、home/segment 两处）之外的第三处渲染点，属新偏差。
- 建议改法：种子治理给该账号灌真实资料（接真字段：昵称/简介/性别/年龄/学校/城市/距离），或撤掉「修复复验」测试文案，不让 QA 字样出现在用户侧。
- 修复类别：需新建目标功能

### R14-L02-D04　P2 / 文案　批次 R14-B17
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__profile__index__bottom.png`（sha16=`d361aafda8d632c6`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:1686`
- 理想图依据：无基准图对应卡（理想图无语音介绍模块），依据=组件规范（profile/index.vue:1680 语音介绍卡模板）＋ zh-CN 文案自证
- 现象：「语音介绍」卡内主 CTA 按钮读数「录制语音状态」——状态名词而非动作引导（zh-CN.ts:1686 字面即「录制语音状态」，en-US.ts:1631 同错 "Record voice status"）；同文件 :1687 已有现成动作文案「开始录制」未被使用。用户无法从措辞得知点下即开始录音。
- 建议改法：profile.voiceRecord 改为动作式文案（「点击录制语音」或复用 :1687「开始录制」），中英文案同步修正。
- 修复类别：单页

## pages/register/index（2 条）

### R14-L01-D01　P3 / 层级遮挡　批次 R14-B21
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__register__index__top.png`（sha16=`d62b0df5586fb630`）
- 源码证据：`apps/client/src/pages/register/index.vue:742`
- 理想图依据：无基准，依据=组件规范（register/index.vue:742-752 `<picker mode=date>` 字段模板无此元素）+ 规范文档§1.6 渲染铁律
- 现象：出生日期选择框值区渲染出一条无模板归属的深色渐变横条，帧像素实测 x≈140–250、y≈799–805（约 218×12rpx，中心色值 #080808，两端 #767676/#4A4A4A），叠在「出生日期」占位与「需满 18 周岁」提示之间的值区上；bottom 帧同字段同位置无此条（实测全为输入底 #F3FAF6），属渲染杂质/瞬态泄漏盖住值区。
- 建议改法：复拍确认是否复现；如复现，给 .field__picker-inner（:751 起）加 overflow:hidden 并排查 `<picker>` 在该机型内联指示条泄漏，勿新增常量造内容。
- 修复类别：单页

### R14-L01-D02　P2 / 可达性　批次 R14-B21
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__register__index__bottom.png`（sha16=`3b9906639a417597`）
- 源码证据：`apps/client/src/pages/register/index.vue:1318`
- 理想图依据：无基准，依据=规范文档§1.2 边框档（--c-border-* 真值）+ WCAG 非文字 3:1 口径
- 现象：协议勾选框（注册必经门槛控件）位于白卡外的页底上，未勾选态描边取 --c-border-default #DDE3E0（:1318），帧实测框缘像素 (229,235,232) 压页底 #EEF7F2(238,247,242)，亮度比 ≈1.1:1（远低于非文字 3:1），32×32rpx 的必勾框在帧上几乎隐形，用户拿不到「一眼定位必须勾选的协议框」这一目标。
- 建议改法：未勾选态描边提档到 --c-text-tertiary #6B7571（对页底 ≈4.4:1）或 --c-text-secondary 档，勾选态保持 --c-brand，纯令牌替换。
- 修复类别：CSS/token

## pages/register/success（2 条）

### R14-L01-D03　P2 / 可达性　批次 R14-B22
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__register__success__top.png`（sha16=`e97eef4b8a7d802d`）
- 源码证据：`apps/client/src/pages/register/success.vue:249`
- 理想图依据：无基准，依据=规范文档§1.2 次级/三级文本档 + 严重度口径 P2（次级文字对比 3:1–4.5:1）
- 现象：「稍后再说，先随便逛逛」是本页不进 12 步资料向导的唯一出口（:46 goBrowse），字色取 --c-text-tertiary #6B7571（:249），帧实测字形像素 #6D7773 压页底 #EEF7F2，实算对比 4.36:1 < 4.5:1，次级动作文字对比落在 3:1–4.5:1 档（top 帧 y≈684 采样）。
- 建议改法：该行字色提档 --c-text-secondary #4A524E（压 #EEF7F2 ≈7.4:1），与同页 R11-L01-D10 提档的清单状态字同口径，纯令牌替换。
- 修复类别：CSS/token

### R14-L01-D04　P2 / 可达性　批次 R14-B22
- 帧：`tmp/qa/frames/R14/real-f0677920/pages__register__success__bottom.png`（sha16=`15377454b5d66c6d`）
- 源码证据：`apps/client/src/pages/register/success.vue:249`
- 理想图依据：无基准，依据=规范文档§1.2 次级/三级文本档 + 严重度口径 P2（次级文字对比 3:1–4.5:1）
- 现象：bottom 帧（12:52 拍）与 top 帧同屏，「稍后再说，先随便逛逛」字色同为 --c-text-tertiary #6B7571（:249），本帧实测字形像素 #6E7874 压 #EEF7F2（y≈678–686 采样），对比 4.36:1 < 4.5:1，同一出口在本帧同样读得吃力。
- 建议改法：同 D03——该行提档 --c-text-secondary #4A524E，一改动覆盖两帧。
- 修复类别：CSS/token

## subpackages/campus/campus/certification（2 条）

### R14-L05-D05　P2 / 颜色token　批次 R14-B23
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`fbc609e9f0b9130b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:756`
- 理想图依据：无基准，依据=规范文档§1.2（边框令牌 `--c-border-default` #DDE3E0 的「分隔 · 描边」用途，非文本 3:1 口径）
- 现象：「学生证照片」上传区以 2rpx dashed --c-border-default #DDE3E0 描边压在白卡 #FFFFFF 上，实测对比 1.31:1（<3:1 非文本门槛），认证流程必经步骤的可点区域只剩一圈几乎不可见的虚线， boundary 可感知性不足（文案仍在，故 P2）。
- 建议改法：虚线描边取深一档 --c-border-strong #C2CAC6（对白 1.65:1 仍不足）或直接用 --c-brand-300 系品牌浅描边/补 brand-50 浅底，使边界 ≥3:1。
- 修复类别：CSS/token

### R14-L05-D06　P3 / 文案　批次 R14-B23
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`e591a6b3ccd00da9`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:405`
- 理想图依据：无基准，依据=规范文档§1.3/组件规范（表单 hint 与所属字段一一对应）
- 现象：「学信网验证码」与「学信网截图」两卡共用同一句组合提示 chsiHint「选填：提供学信网在线验证码或学历截图可加快审核」（:390 与 :405 两次渲染），截图卡上的提示以「验证码」开头、验证码卡上的提示又预告「截图」，指代互相错位。
- 建议改法：拆成两键——验证码卡「选填：填写在线验证码可加快审核」、截图卡「选填：上传学历截图可加快审核」。
- 修复类别：单页

## subpackages/campus/campus/hub（1 条）

### R14-L04-D07　P1 / 可达性　批次 R14-B24
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`5b94c1bb8fa4f07b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:643`
- 理想图依据：素材/理想效果图/校园圈.png 分段控件区（我加入的 / 推荐圈子）
- 现象：分段 tab 纵向 padding 20rpx×2 + 28rpx 文本行高≈39rpx，热区高≈79rpx < 88rpx 项目口径，且无任何替代出口——「我加入的」学校列表只能从这条 ≈79rpx 高的窄带进入：用户拿不到的是点偏上下约 5px 即落空、进不了已加入学校列表（帧 13:14「我加入的 / 推荐圈子」可见）。R10-L04-D18 修过同排选中态对比度，热区未修，属同控件另一轴。
- 建议改法：.campus-hub__tab 补 min-height:88rpx（纵向 padding 归 12rpx 保持视觉高度），与 R12-L04-D06 返回钮同口径。
- 修复类别：CSS/token

## subpackages/campus/campus/index（2 条）

### R14-L04-D08　P3 / 颜色token　批次 R14-B25
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`2e868bef337ff136`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:535`
- 理想图依据：无基准，依据=规范文档§1.2（未认证=兴趣紫 --c-purple 档）+ 同域 hub.vue:810 同语义徽章已定档
- 现象：页头「北京大学」旁「未认证」徽章底是 var(--c-overlay-bg-light) 半透明白（帧 13:16 页头白蒙胶囊）；同域 hub 页同一「未认证」语义徽章是 var(--c-lavender-100, #EDE9FE) 淡紫底紫字（R1-L05-D15 + R10-L04-D20 两轮对齐理想图定的档）——同域同语义两档色，与 R13-L04-D09/D10（作者名色/引导卡宽）不同象。
- 建议改法：cert-badge--unverified 底/字对齐 lavender 档（页头渐变上取加深紫字保对比），或两页统一改走 XunmiStatusTag 一处定义。
- 修复类别：CSS/token

### R14-L04-D09　P3 / 可达性　批次 R14-B25
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`4911a28a362cfa70`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:1015`
- 理想图依据：无基准，依据=组件规范 88rpx 热区口径（EmptyState.vue:224 先例）
- 现象：「热门兴趣圈」卡头「查看更多 ›」（帧 13:17 可见）是裸 text 直接挂 @tap（:313），.cert-recommend__more 只有 font-size/color 无 padding/min-height，热区≈24rpx 文本高≈34rpx，远低于 88rpx 口径；因下方 8 片兴趣圈瓷片（:316）同为 goCircles 归宿、有替代出口，落 P3。
- 建议改法：.cert-recommend__more 补 padding 8rpx 0 并用等值负 margin 抵消行高，或把热区扩到整行 header。
- 修复类别：CSS/token

## subpackages/campus/campus/post-topic（2 条）

### R14-L05-D01　P1 / 颜色token　批次 R14-B26
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`9f8b91fab17f8132`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:885`
- 理想图依据：无基准，依据=规范文档§1.2（主色 `--c-brand` #36C99A 与 brand-50 #E8FAF3 浅底的对比口径，「一令牌一值」）+ §1.1 两色角色令牌
- 现象：选中分类「课程交流」的标签取 $green-primary #36C99A 压在 selected 底 linear-gradient($green-light=#E8FAF3, --c-tint-green-50) 上，实测对比 ≈1.9:1（<4.5:1 正文级门槛，也低于 3:1），26rpx/600 字重的选中态分类名读不清——用户拿不到「当前选中哪个分类」的可读确认。
- 建议改法：选中态标签色按同文件 R9-L05-D06 同口径换深绿档 --c-brand-700 #1F8D6A 或 --c-text-primary，浅底保持不动（同页 .cert-banner__btn 已有先例）。
- 修复类别：CSS/token

### R14-L05-D02　P1 / 可达性　批次 R14-B16
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`92e9726951cad143`）
- 源码证据：`apps/client/src/components/village/TopicSelector.vue:474`
- 理想图依据：无基准，依据=组件规范（88rpx 最小命中区口径，同页 .cert-banner__btn R11-L05-D06 已按此裁定）
- 现象：「创建新话题」行内绿色「创建」按钮无自身高度定义，随 align-items:stretch 贴 72rpx 输入框，实帧实测 31×35px ≈62×69rpx（<88rpx）；这是创建热门列表之外新话题的唯一入口、无替代出口——想发自定义话题的用户点不中唯一入口。
- 建议改法：.topic-selector__create-btn 补 min-height:88rpx（同 post-topic.vue .cert-banner__btn 的 R11-L05-D06 盒模型写法），输入框行高同步抬齐。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（2 条）

### R14-L05-D03　P1 / 文案　批次 R14-B27
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`3a1c8730467dc34b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:249`
- 理想图依据：无基准，依据=规范文档§1.1（真实数据原则，头像/内容不得为占位测试数据）
- 现象：话题详情正文位渲染的是 QA 探针数据——标题「PRB-A-202609251631」、正文「probe minimal body」（2026/09/26，作者「阿辰」），用户打开话题详情拿到的是测试探针帖，真实话题内容不可交付；在册种子治理族只登记了 nearby people、home/segment 两处人格渲染点，本处是同一族在新渲染点（话题详情正文）的新偏差。
- 建议改法：按 §12 撤掉假数据——探针/种子帖落隔离数据源（按环境过滤或清理 PRB-* 前缀帖），real 档话题流不回流测试数据；不在页面侧改文案遮盖。
- 修复类别：需新建目标功能

### R14-L05-D04　P2 / 可达性　批次 R14-B27
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`266c95c4e6d4ded0`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:882`
- 理想图依据：无基准，依据=组件规范（88rpx 最小命中区口径）
- 现象：回复条「发送」按钮 padding 18rpx×2 + 26rpx 文本 ≈73rpx 高，实帧实测 37px ≈73rpx（<88rpx）；因键盘 confirm-type="send"（:366）构成替代出口故不判 P1。注意 R13-L05-D05 只把同条上的「实名」开关补到 88rpx（实帧已达标），同排「发送」这枚漏改——上一轮修得不对（同条控件只修一半）。
- 建议改法：.reply-btn 补 min-height:88rpx + box-sizing:border-box，与同排 .anonymous-toggle 同批写法。
- 修复类别：CSS/token

## subpackages/chat/chat-session/index（3 条）

### R14-L11-D09　P2 / 颜色token　批次 R14-B28
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`f677b5fe3a2c5a2c`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2755`
- 理想图依据：无基准，依据=规范 §1.2「卡片 --c-bg-container #FFFFFF / 主色浅 brand-100 #D1F5E7 浅底」+ §1.4 非文本件边界对比口径（本页错误态唯一出口键须读得出是按钮）
- 现象：底部白色输入条实测 y=730..814 为 #FFFFFF，其上两枚出口键「返回」「消息」底取 --c-bg-brand，帧上实测 (232,251,242)=#E8FBF2，对白底只有 1.08:1，且 .chat-input-error__btn 没有任何描边 ⇒ 键面轮廓在帧上完全读不出，画面只剩两个深绿词浮在白条上（键体实测各 50×43px、间距 21px，热区本身达标）。
- 建议改法：键底换更深一档（--c-brand-100 #D1F5E7 对白 1.3:1 仍不够，建议补 2rpx --c-brand-800 描边或底改 --c-brand-800 + 白字，与本页 :2761 深绿字同族）。
- 修复类别：CSS/token

### R14-L11-D10　P3 / 文案　批次 R14-B28
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`db6e35aaa13ac1bd`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2090`
- 理想图依据：无基准，依据=规范 §1.1 视觉一致性（同域空态/错误态主句同一标点档）；对照 src/i18n/locales/zh-CN.ts 同文件兄弟键
- 现象：错误态主句实测为「缺少会话标识，请从聊天列表或匹配结果进入。」带全句句号，而同仓同用途的兄弟串一律不带句末标点（zh-CN.ts:1297「会话标识缺失」、:1299「创建会话失败，请稍后重试」、feedback/history 空态「暂无反馈记录」），本页作为 EmptyState 的 title 传入后被当标题渲染，句末句号在标题位上读起来与全站两行式空态不一致。
- 建议改法：该串去掉末尾「。」（或本页改传 hide-sub 的短句档），与同域空态主句标点归一。
- 修复类别：单页

### R14-L11-D11　P3 / 颜色token　批次 R14-B28
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`db6e35aaa13ac1bd`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2633`
- 理想图依据：无基准，依据=规范 §1.1 原则 3「一令牌一值：页面只引用 var(--c-*)，禁止私有色值」+ §1.2 边框档 --c-border-light #EEF2F0
- 现象：错误态页头分隔线写死字面量 #EEF2F0（同值令牌 --c-border-light 已存在），且它压在 :2632 的 --c-bg-page 上——帧上实测分隔行 (238,245,241) 对页面底 (238,247,242) 差 2 个通道值、约 1.01:1，等于画了一条看不见的线（声明存在、无视觉消费者）。
- 建议改法：改 var(--c-border-light) 并把分隔线抬到 --c-border-default 档（或直接删掉这条读不出的线）。
- 修复类别：CSS/token

## subpackages/chat/official-chat/index（6 条）

### R14-L11-D12　P2 / 间距　批次 R14-B29
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`644dc814dcf4e294`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:909`
- 理想图依据：无基准，依据=规范 §3.7 聊天会话「气泡规格（R20）：padding 14/22rpx」+ theme/design-variables.scss:647-648 --bubble-padding-y:14rpx / --bubble-padding-x:22rpx
- 现象：.bubble 内边距写死 20rpx 28rpx，而同一条规则族里 max-width(:894)、圆角(:908/:916) 都已走 --bubble-* 令牌，只有 padding 没走 ⇒ 帧上助手气泡左缘 x=57、正文墨迹左缘 x=70，实测左内衬 13px，比令牌的 22rpx(11.1px) 多约 3px；纵向同一条声明给的是 20rpx(10.1px) 而非令牌的 14rpx(7.1px)，同一枚气泡四边各多 3px，与私聊页 ChatBubble 并排看气泡宽高不同轨。
- 建议改法：padding 改 var(--bubble-padding-y) var(--bubble-padding-x)，与 ChatBubble 同一来源。
- 修复类别：CSS/token

### R14-L11-D13　P2 / 颜色token　批次 R14-B29
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`644dc814dcf4e294`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:913`
- 理想图依据：无基准，依据=规范 §3.7 聊天会话「双方阴影统一禁用（--bubble-shadow: none，2026-08-09 定论）」+ §1.2 边框档（#EEF2F0/#DDE3E0/#C2CAC6）
- 现象：.bubble--assistant 同时写了 border:1rpx solid #f0f0f0（非 §1.2 任一档）与 box-shadow:0 2rpx 8rpx rgba(0,0,0,.04)，而令牌侧早有 --bubble-shadow:none ⇒ 帧上助手气泡四边都带一层投影：下缘 y=215..218 实测 (235,242,239)、右缘 x=261..262 实测 (237,243,240)、左缘 x=54..55 实测 (235,244,239)，均比页面底 (238,247,242) 暗 3~5，与私聊页「纯白无阴影」定论两套观感。
- 建议改法：删掉 box-shadow（或改 var(--bubble-shadow)），border 归 var(--c-border-light) 或与私聊一致去描边。
- 修复类别：CSS/token

### R14-L11-D14　P2 / 尺寸比例　批次 R14-B29
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`644dc814dcf4e294`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:884`
- 理想图依据：无基准，依据=规范 §3.7「头像 64rpx 顶对齐」+ theme/design-variables.scss:655 --bubble-avatar-size:64rpx
- 现象：.msg-avatar 自写 width/height:72rpx，帧上实测助手头像（含 #e8e8e8 圆底）横向 x≈11..48=38px≈72rpx，比令牌的 64rpx(32.3px) 大一档；同一屏内它与气泡左缘 x=57 的间距被挤成 9px，与私聊页 ChatBubble 的 64rpx 头像并排看大小不同轨。
- 建议改法：改 width/height: var(--bubble-avatar-size)，与私聊页同源。
- 修复类别：CSS/token

### R14-L11-D15　P2 / 颜色token　批次 R14-B29
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`644dc814dcf4e294`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:1100`
- 理想图依据：无基准，依据=规范 §1.2「输入底 --c-bg-surface #F3FAF6 / #F7FAF9」+ §1.1 原则 3 禁止私有色值
- 现象：.input-bar__field 底写死 #f5f6f8，帧上实测输入槽 (245,246,248)——蓝通道最高、是三通道里唯一偏冷的面，坐在白条 #FFFFFF 与页面浅绿 #EEF7F2 之间形成一处灰蓝断层；同文件 :1088 的 .plus-btn 已经在用 var(--c-neutral-50, #F5F6F8)，说明令牌在册，只有输入槽漏走字面量。
- 建议改法：改 var(--c-bg-surface)（浅绿档，与全站输入底同轨），至少归口 var(--c-neutral-50)。
- 修复类别：CSS/token

### R14-L11-D16　P3 / 颜色token　批次 R14-B29
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`644dc814dcf4e294`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:930`
- 理想图依据：无基准，依据=规范 §1.2 主文本 --c-text-primary #1A1E1C；同文件 R12-L11-D12 已把 .input-bar__input 的 #333 归口该令牌
- 现象：气泡正文 .bubble__text（:928-930）仍写死 color:#333，帧上正文最暗墨像素实测 (44,47,46)，落在 #333 这一档而不是令牌主文本 --c-text-primary (26,30,28)；同一页 :1107 的输入文字已在 R12-L11-D12 归口 var(--c-text-primary)，同屏两套墨色。
- 建议改法：改 var(--c-text-primary, #1A1E1C)，与 :1107 同档。
- 修复类别：CSS/token

### R14-L11-D17　P3 / 颜色token　批次 R14-B29
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`644dc814dcf4e294`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:1068`
- 理想图依据：无基准，依据=本任务书 P3 判据「无消费者的孤儿样式」
- 现象：.voice-btn（含 :1072 私有色 #f0f0f0 圆底）与 .voice-btn__icon 在本文件模板里没有任何使用者（全文件 grep voice-btn 只命中样式块，输入区实测渲染的是表情 image + .plus-btn 两枚），属孤儿规则，且其色值 #f0f0f0 不在 §1.2 色板内。
- 建议改法：删除 .voice-btn / .voice-btn__icon 两条死规则；若语音入口待接，改建成带注释的 TODO 而不是留无主样式。
- 修复类别：CSS/token

## subpackages/circles/circles/circle-home（2 条）

### R14-L04-D05　P3 / 可达性　批次 R14-B30
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`ade54ccb0e3b3473`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1030`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 头部标签行区域（R13-L04-D07 新增的话题直达 chips 行）
- 现象：上一轮新加的 hero 话题 chips（帧 13:13「# 城市夜景拍摄攻略」等 4 枚，对照理想图头部 4 标签行位置已对齐）纵向 padding 10rpx×2 + 24rpx 文本（:1040），热区高≈54rpx，低于 88rpx 口径；因 feed 尾「查看全部话题」（:674）是替代出口，不构成 P1，落 P3。这是新增元素自带的可达性偏差，不是对 D07 的重报。
- 建议改法：.topic-chip 补 min-height:88rpx 或纵向 padding 提到 ≥20rpx，用负 margin 保持现有行距不变。
- 修复类别：CSS/token

### R14-L04-D06　P3 / 文案　批次 R14-B30
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`891e016d8bf514b9`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:264`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png feed 帖子卡时间字段（§3.11）+ 同域 topic-detail 页对照
- 现象：帧（13:14）3 张帖子卡日期逐字为「9-09」（M-DD 档）——页内私有 relativeTime（:254-265）≥7 天降级输出；而同一条「城市夜景拍摄攻略 / 林晓 8-26」进话题详情页（13:10 帧）显示「2026/08/26」全日期档（topic-detail.vue:295 走 stores/circle.ts:270 formatCircleTime 统一档）。同域两页同一数据两种日期取档。
- 建议改法：circle-home 删页内 relativeTime，改用 utils/time 的统一 formatter（与 topic-detail 同源），≥7 天输出同一绝对日期档。
- 修复类别：单页

## subpackages/circles/circles/index（2 条）

### R14-L03-D07　P3 / 素材缺失　批次 R14-B31
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`2facd1af4ba58f63`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:423`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 页头左侧返回键为线性箭头图标；规范§1.1 规则4「emoji/字符图形一律替换为标准 SVG」
- 现象：帧上返回键是文本字符「‹」（U+2039）直接充当图标（细窄字面、无图标规格）；同域 detail.vue:844 / history.vue:175 / tag-posts.vue:333 的返回键全部走 ICONS_COMMON.BACK / ICONS_V2.BACK 标准 SVG，本页是这批页里唯一字符顶替的返回键（与 R6-L03-D20 把「···」字符换 MORE SVG 的裁定同象）
- 建议改法：换 IMAGE_PATHS.ICONS_COMMON.BACK 标准 SVG（同域三页同款资源），删除字符分支
- 修复类别：单页

### R14-L03-D08　P2 / 可达性　批次 R14-B31
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`e64893c4bbb069b2`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:807`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 卡右「加入」描边胶囊 + 任务书 88rpx 命中口径（命中不足属 P1 档现象，本卡因有替代出口落 P2）
- 现象：帧上「加入」胶囊实测高约 22px≈44rpx（bottom 帧 x330 绿描边 y489-510），padding sp-3(10rpx) + 26rpx 文本的组合远低于 88rpx 命中口径，且它是列表里逐卡重复的主操作；卡体 @tap=goToCircleHome 可进圈主页替代加入，故记 P2
- 建议改法：.circle-card__action 补 min-height:88rpx + flex 居中（或纵向 padding 提档），热区达标且不破卡内排版
- 修复类别：CSS/token

## subpackages/circles/circles/post-topic（2 条）

### R14-L04-D03　P3 / 颜色token　批次 R14-B32
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`636c62f6a4aad067`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:812`
- 理想图依据：无基准，依据=规范文档§1.2 页头用色档（--c-gradient-brand）+ 同域 topic-detail 页头对照
- 现象：页头底为 135deg 绿→brand-300→romance-300 三段渐变，帧（13:12）页头右缘明显泛粉；同域 topic-detail 页头（topic-detail.vue:484）是 var(--c-gradient-brand) 纯绿档——同族两页页头取档不一，且粉尾蹭到「粉=喜欢」语义色的禁混边缘（§1.1 第 2 条）。
- 建议改法：.post-header 底统一回 var(--c-gradient-brand) 或收敛为 brand 单色系两档渐变，与 topic-detail 同档。
- 修复类别：CSS/token

### R14-L04-D04　P3 / 文案　批次 R14-B17
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`e24f149e21786de2`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3756`
- 理想图依据：无基准，依据=规范文档§1（标点全半角口径）
- 现象：正文输入框占位符逐字为「分享你的想法...」，句尾半角三点；帧（13:13）内容区左上可见。与 D01 同族（同域两页占位符同一半角写法）。
- 建议改法：词条句尾改「……」，与 D01 一并统一全站表单占位符省略号档。
- 修复类别：单页

## subpackages/circles/circles/topic-detail（2 条）

### R14-L04-D01　P3 / 文案　批次 R14-B17
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`27b8667b487c6bae`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3813`
- 理想图依据：无基准，依据=规范文档§1（标点全半角口径）+ circles 同族页文案一致性
- 现象：底部回复栏输入框占位符逐字为「写下你的回复...」，句尾是 3 个半角句点，不是中文省略号「……」；帧（13:10）底部输入条左端清晰可见。
- 建议改法：zh-CN.ts 该词条句尾改「……」，并同帧排查同族占位符（对照 D04）一次统一。
- 修复类别：单页

### R14-L04-D02　P2 / 可达性　批次 R14-B33
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`f4e0af5cdff946ab`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:931`
- 理想图依据：无基准，依据=组件规范 88rpx 热区口径（EmptyState.vue:224 先例；R12-L04-D06 同族返回钮已按此归一）
- 现象：底部「发送」钮纵向 padding 18rpx×2 + --fs-md(26rpx) 文本行高≈36rpx，热区高≈72rpx，低于 88rpx 项目口径；帧（13:11）右下角发送钮可见。有键盘 confirm-type="send"（:447）替代出口，故不到 P1。
- 建议改法：.reply-btn 补 min-height:88rpx + box-sizing:border-box（同 post-topic.vue:819 做法），不改配色。
- 修复类别：CSS/token

## subpackages/circles/circles/topics（2 条）

### R14-L03-D09　P3 / 文案　批次 R14-B34
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`5d99389c71cb89dd`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:550`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png hero 标题逐字「摄影圈」；同域 circles/index.vue:363 circleTitle 同口径补「圈」尾
- 现象：帧上 hero 圈名逐字「摄影」（顶部导航行同字），理想参考图 hero 逐字「摄影圈」；同一圈子在列表页卡名显示「摄影圈」（circleTitle 补尾）——跨页两个名字，详情页少「圈」字
- 建议改法：hero/导航圈名改走与 index.vue:361 circleTitle 相同的取名口径（或数据源统一存全名），两页逐字一致
- 修复类别：单页

### R14-L03-D10　P2 / 素材缺失　批次 R14-B34
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`358a4e3a1c046954`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:705`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png feed 卡互动栏「♡ 256 ｜ 💬 32」双位并置；规范文档§3.11 帖子卡构成含「互动栏」
- 现象：帧上三张卡的互动位实测只有「💬 n + 日期」（💬1 9-09 / 💬0 9-09 ×2），无点赞位也无赞数；参考图同位是「♡ 128 ｜ 💬 18」双位互动栏——卡模板 :705-714 只渲染回复图标 + 回复数 + 时间，点赞字段整块没接（卡 @tap 进详情页可点赞，故记 P2）
- 建议改法：卡 meta 补点赞位、读 topic 真字段（列表接口无该列则按 §12 接真字段补列透传，详情同源接口已在出赞数），不许前端编常量填充
- 修复类别：单页

## subpackages/discover-extra/discover/history（4 条）

### R14-L06-D06　P2 / 字号　批次 R14-B35
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`2fc1ac4408c13fb3`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:358`
- 理想图依据：无基准，依据=规范文档§1.3 页面主标题 26–28px / 700–800 档
- 现象：顶帧页头标题「今日已看」墨迹实测 y67~83（字面高约 17px ⇒ 字号 19px=38rpx），比 §1.3 页面主标题档下限 26px 低 7px；同分包 segment.vue:269、people.vue:340 已在 R12/R13 收到 52rpx=26px，likes-visitors/index.vue:547 取 56rpx=28px，本页原地不动 ⇒ 同分包四页四档（19/22/26/28px）。people.vue:338 的收口注释当年就点名「history 38rpx」是三档之一，却只改了自己。
- 建议改法：.page-title 字号改 52rpx 与 segment/people 同档（整分包更好统一吃一枚页标题令牌）。
- 修复类别：CSS/token

### R14-L06-D07　P2 / 颜色token　批次 R14-B02
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`2fc1ac4408c13fb3`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:186`
- 理想图依据：无基准，依据=规范文档§1.2 文本色表（三级文本 #6B7571 / 占位 #9AA39F，全站无纯中性灰档）+ §1.1.4 素材归色口径
- 现象：顶帧空态空箱图标逐像素实测为纯中性灰 RGB(104,104,104)~(113,113,113)（R=G=B 完全相等），而该 filter 的注释（EmptyState.vue:181-185）自述落点应是三级文本色档 #6B7571（绿相灰，R≠G≠B）⇒ grayscale(1) 把色相全部抹平，永远落不到任何 §1.2 档，帧上图标是全站唯一一枚中性灰件，与页面浅绿底不成体系（R8-L06-D19 换素材、R7-L13-D03 加 filter 都没解决归色）。
- 建议改法：.empty-icon--preset 的 filter 换成能落到 #6B7571 的组合（如 grayscale(1) sepia(0.15) hue-rotate(60deg) saturate(1.2) brightness(0.62)），或改内联 SVG + currentColor 直接吃 --c-text-tertiary。
- 修复类别：CSS/token

### R14-L06-D08　P2 / 可达性　批次 R14-B35
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`c8bc46203b87ed93`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:157`
- 理想图依据：无基准，依据=同分包可点件语义口径（segment.vue:145 / people.vue:188 / likes、likes-visitors 均带 role+aria-label）
- 现象：底帧左上返回件（白圆实测 35×35px、热区 88rpx 已由 R13-L06-D07 达标）在模板上是裸 <view @tap>，无 role="button" 也无 aria-label；本页 role= 出现 3 次（list/status/alert）而 aria-label 为 0，同分包其余四页 aria-label 计数为 3/4/13/6 ⇒ 读屏用户在这页唯一退出件上只拿到一个无名分组，听不出「返回」。
- 建议改法：.back-btn 补 role="button" :aria-label="t('common.back')"（照 segment.vue:145 写法），同页 :192 的重试钮一并补。
- 修复类别：单页

### R14-L06-D09　P3 / 颜色token　批次 R14-B35
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`c8bc46203b87ed93`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:413`
- 理想图依据：无基准，依据=规范文档§1.1.2「绿色=行动，粉色=喜欢，两色禁止混用」+ §3.8 四格统计「黑色粗体数字 + 灰标签」
- 现象：底帧三个统计数字「0」与空态「去寻觅」主按钮是同一枚绿——帧上实测数字最暗像素 RGB(16,104,77)、按钮填充 RGB(15,103,76)，同为 --c-brand-800 #156B51；数字是数据不是行动件，却占了本页最大字号（44rpx/800）与唯一 CTA 抢同一强调档，主次读不出。同页 R10-L06-D15 已用同一理由把页头标题从行动绿改回 --c-text-primary（:371），数字这处漏网。
- 建议改法：mp 分支 .stat-num 改 var(--c-text-primary, #1A1E1C)（数值走主文本，行动绿只留给 CTA），与 §3.8 四格统计同口径。
- 修复类别：单页

## subpackages/discover-extra/discover/match-success（3 条）

### R14-L05-D09　P2 / 可达性　批次 R14-B36
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`2d54902e79f34d5a`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:279`
- 理想图依据：素材/理想效果图/匹配成功页面.png 左上返回 ‹ 与右上图标位（均在状态栏下的独立导航带）
- 现象：顶部导航两枚圆形按钮（返回 ‹、相机截图）.success-nav__btn 固定 72×72rpx（<88rpx）；返回有系统侧滑手势兜底故不判 P1，但相机钮无任何替代出口（其唯一行为见 D10），热区不足叠加功能空转。
- 建议改法：.success-nav__btn 72rpx → 88rpx（右上与胶囊间距同步复核），与 R13 topic-detail 返回钮 D04 同口径。
- 修复类别：CSS/token

### R14-L05-D10　P2 / 需新建　批次 R14-B36
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`24a8039682dbf008`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:191`
- 理想图依据：素材/理想效果图/匹配成功页面.png 右上导航图标位（理想图为换一换式图标，实帧为相机图标）
- 现象：右上相机图标（aria-label「截图」，R11-L06-D04 删掉假「···」钮后保留的「唯一一枚图标位」）点击只弹 toast「截图功能即将上线」——页内唯一保留的右上功能钮是个空承诺，用户拿不到任何截图/保存能力；§12 口径：接真能力或撤掉承诺，二选一。
- 建议改法：二选一：接真截图保存（canvas 快照 + 相册授权写入，客户端能力不涉后端真相源），或按 §12 撤掉该按钮留白右上导航带。
- 修复类别：需新建目标功能

### R14-L05-D11　P2 / 可达性　批次 R14-B11
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`24a8039682dbf008`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:504`
- 理想图依据：素材/理想效果图/匹配成功页面.png 底部「分享喜悦」文字按钮行（锚底、带上传图标）
- 现象：「分享喜悦」可点区 .match-success__share 仅 padding 14rpx×0 + 26rpx 文本行 ≈64rpx 高（实帧约 32px，<88rpx）；有胶囊「···」转发替代出口故不判 P1，但三枚底部出口里唯它不达热区规范（立即聊天/继续探索两枚均 ≥88rpx 档）。
- 建议改法：.match-success__share 上下内衬 14rpx → 24rpx 或补 min-height:88rpx，锚底链常量同步按 components/match/MatchSuccess.vue:190 注释口径吸收。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/matching（2 条）

### R14-L05-D07　P2 / 颜色token　批次 R14-B10
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`60d8ba7c168cdbcc`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:409`
- 理想图依据：素材/理想效果图/匹配中页面.png 下部共同点卡四行行首图标芯片：旅行=绿底、音乐=青绿底、电影=琥珀黄底、生活方式=珊瑚红底的四色 pastel 圆角芯片
- 现象：四行维度图标芯片统一 `--c-brand-50` #E8FAF3 一档浅绿（.match-loading__row-icon-wrap 单一 background），实帧四枚芯片同色、与理想图四色各异（绿/青/黄/红）不符——R8-L05-D18⑤ 只收了令牌合规没收与理想图的色相还原。
- 建议改法：四枚芯片底色按理想图取既有多档浅色令牌（brand-50 / status-info 浅档 / warning-50 / romance-50），一令牌一值不新造色。
- 修复类别：CSS/token

### R14-L05-D08　P2 / 尺寸比例　批次 R14-B10
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`41b5befd844b47ef`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:339`
- 理想图依据：素材/理想效果图/匹配中页面.png 中部双头像：外沿各 ≈245px/825px 图宽 ≈29.7% 屏宽
- 现象：双头像 .match-loading__avatar 168rpx（含 8rpx 描边 ≈184rpx），实帧实测 83px/378px 帧宽 ≈22% 屏宽，理想图为 ≈30%——头像整组偏小约 1/4，双头像交汇的主视觉权重不足（中央心形 32px 同步偏小）。
- 建议改法：.match-loading__avatar 168rpx → 208–224rpx 档（参考 MatchSuccess.vue R1-L06-D03 已裁定的 232rpx≈31% 口径），心形与轨道半径按比例放大。
- 修复类别：CSS/token

## subpackages/discover-extra/home/segment（3 条）

### R14-L06-D01　P2 / 文案　批次 R14-B37
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`88e1a6e93e2eb87c`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:134`
- 理想图依据：无基准，依据=规范文档§3 无该页条目 ⇒ 按 §1.1.5「视觉元素对照理想效果图 100% 还原」+ 本页 metaText 自述口径（segment.vue:123-129：meta 行存在的意义是补 name 之外的信息）
- 现象：顶帧 9 行中 4 行（中山大学 / 浙江大学 / 武汉大学 / 南开大学）标题串与其下 meta 行首段是同一串字符，同一张卡里"中山大学"连读两遍，meta 只剩「 · 附近」半截信息；R11 剥取证前缀后残留此现象（前缀没了，重复留下了）。
- 建议改法：metaText 里当 campus 段与 displayName(item.name) 相同时只输出距离段（无距离则整行留空），或改露另一字段（认证/星座），别把 name 复读一遍。
- 修复类别：单页

### R14-L06-D02　P2 / 间距　批次 R14-B37
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`88e1a6e93e2eb87c`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:309`
- 理想图依据：无基准，依据=规范文档§1.4 卡片内边距 --card-padding 32rpx=16px（design-variables.scss:698）
- 现象：行卡内衬写死 20rpx 24rpx（上下 10px / 左右 12px），帧上实测卡高 65px（头像 96rpx=48px + 上下各约 8~10px），比卡片档 --card-padding 32rpx=16px 少约 6px；同域 nearby/people.vue:437 同角色列表行取 22rpx ⇒ 同分包两套裸值、都不吃令牌（R13 只收了这一行的圆角，内衬漏收）。
- 建议改法：.segment-row 的 padding 改 var(--card-padding, 32rpx)，people.vue:437 同批改到同一令牌。
- 修复类别：CSS/token

### R14-L06-D03　P3 / 颜色token　批次 R14-B37
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`f7af02d25691799b`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:376`
- 理想图依据：无基准，依据=规范文档§1.2 三级文本 --c-text-tertiary #6B7571 / 主文本 --c-text-primary #1A1E1C（design-variables.scss:105、362、364）
- 现象：底帧 9 行 meta 行走 --c-text-tertiary 但行内兜底写影子值 #666666（真值 #6B7571），同文件 :386 的箭头在 R11-L06-D10 已按「兜底写成与令牌同值」改对，:271/:345 的主文本兜底仍留 #222222（真值 #1A1E1C）⇒ 一个文件两套兜底口径；同域 people.vue:515 的同一枚 meta 元素又走 --c-text-secondary(#4A524E)，底帧这行辅文比 people 页同位辅文浅一档。
- 建议改法：三处兜底统一改成令牌真值（#6B7571 / #1A1E1C），并与 people.vue:515 二选一把列表 meta 色档归一。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（4 条）

### R14-L06-D13　P3 / 文案　批次 R14-B38
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`95e28aa490e6cb3f`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:335`
- 理想图依据：无基准，依据=规范文档§1.1.3「一令牌一值」同域文案同档 + 既有 i18n 令牌 likes.monthDay（zh-CN.ts:1441 "{m}月{d}日" / en-US.ts:1363 "{m}/{d}"）
- 现象：顶帧列表行时间渲染成「9/15」，而同一条喜欢记录（同一人「小满 / 北京师范大学」、同一时间戳）在 likes 页顶帧渲染成「9月15日」（likes/index.vue:416 走 i18n 档）⇒ 同域两页同一枚日期两种写法；本页 :335 把分隔符硬编码进模板串，绕过 likes.monthDay，中英双档同时失效（en 档也拿不到）。
- 建议改法：formatTime 改 return t("likes.monthDay", { m: date.getMonth() + 1, d: date.getDate() })，与 likes 页共用同一出口。
- 修复类别：单页

### R14-L06-D14　P2 / 字号　批次 R14-B38
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`95e28aa490e6cb3f`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:744`
- 理想图依据：无基准，依据=规范文档§1.3 极小档下限 --fs-xs 10px（角标用途）
- 现象：顶帧「喜欢我的」右侧红角标里的数字「1」字号写死 18rpx=9px（帧上角标实测 13×14px），低于 §1.3 极小档下限 --fs-xs 20rpx=10px，是本页唯一不吃 --fs-* 阶梯的字面值；同域 likes 页的页签计数由 BaseTabs.vue:207 走 --fs-sm(22rpx=11px) ⇒ 同一枚「未读/计数角标」两页两档。
- 建议改法：.tabs__badge-text 的 font-size 改 var(--fs-sm, 22rpx)，与 BaseTabs 角标同档（角标盒 32rpx 同步复核）。
- 修复类别：单页

### R14-L06-D15　P2 / 圆角　批次 R14-B38
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`d6a035ecc77878c8`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:762`
- 理想图依据：无基准，依据=规范文档§1.4 卡片圆角 --card-radius 40rpx=20px（design-variables.scss:699）
- 现象：底帧列表卡左上曲率逐行拟合弧高约 7px（半径约 24rpx=12px，走 --r-xl），而同域 likes 页同一张卡在 R13-L06-D10 已收口 var(--card-radius,40rpx)，帧上拟合弧高约 13px（半径≈20px），两页实测差 1.9 倍；且 likes/index.vue:1291 的收口注释写着「同域 likes-visitors 页卡片 R11-L07-D05 已统一 --card-radius 40rpx」——本页 :762 实际仍是 --r-xl，该前提不成立 ⇒ 上一轮单向把 likes 抬到 40rpx，两页反而从同档拉成两档（上一轮修得不对）。本页自证：同页 .overview(:662) 已吃 --card-radius 40rpx，列表卡却走 --r-xl，同页两档。
- 建议改法：.list__item 的 border-radius 改 var(--card-radius, 40rpx)，与同页 .overview、likes 页卡片归一。
- 修复类别：CSS/token

### R14-L06-D16　P2 / 字号　批次 R14-B38
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`d6a035ecc77878c8`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:553`
- 理想图依据：无基准，依据=规范文档§1.3 辅助档 --fs-lg/xl 14/15px（用途=说明）
- 现象：底帧页头副标题「谁在喜欢你、谁来看过你」取 --fs-sm=22rpx=11px（帧上该行墨迹实测 y104~114，字面高约 11px），它是本页唯一的功能说明行，却低于 §1.3 辅助档 14/15px 乃至小字档 12px；同页 .tabs__text(:711) 取 --fs-lg(14px)、.overview__label(:687) 取 --fs-base(12px) ⇒ 页级说明比卡片标签还小一档，层级倒挂。
- 建议改法：.page-header__subtitle 提到 var(--fs-lg, 28rpx)，与 §1.3 辅助档对齐。
- 修复类别：单页

## subpackages/discover-extra/likes/index（3 条）

### R14-L06-D10　P1 / 可达性　批次 R14-B39
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`efc978c80a9c2b8c`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1737`
- 理想图依据：无基准，依据=规范文档§1.2（--c-brand 授权用于主按钮底/选中态，未授权作浅底上的文字色）+ §1.4 触控档（同分包 88rpx 热区口径）
- 现象：顶帧页头「管理」胶囊实测 39×31px（高 62rpx，样式块 :1723-1732 无 min-height），标签色走 --c-brand #36C99A 压白胶囊，帧上字素最暗实测 RGB(61,203,158) ⇒ 2.05:1，13px 文字远低于正文 4.5:1 与次级 3:1 双下限；用户拿不到的是：这枚控件同时是进入与退出批量模式的唯一出口（:655 batchMode ? finish : manage），批量态下既读不清也按不准。
- 建议改法：.likes-header__manage 补 min-height:88rpx + flex 居中，.likes-header__manage-text 改 var(--c-brand-800, #156B51)（白底 6.45:1）。
- 修复类别：单页

### R14-L06-D11　P1 / 颜色token　批次 R14-B01
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`efc978c80a9c2b8c`）
- 源码证据：`apps/client/src/components/common/BaseTabs.vue:270`
- 理想图依据：无基准，依据=规范文档§1.2 主色 #36C99A 作选中态底时前景须达 4.5:1 + §1.1.2 色彩角色
- 现象：顶帧选中页签「喜欢我的 1」胶囊底实测 RGB(54,201,154)=#36C99A（:266），前景走 --c-text-inverse（rgba(255,255,255,.95)，:270）⇒ 帧上 13px 页签白字对底 2.10:1，不达正文 4.5:1；同一判据在 EmptyState.vue:217-230 段（R10-L06-D18）已被实测否掉并把空态主按钮底换成 --c-brand-800，pill/block 两个变体的选中态出口漏改，全站共用该组件的页签选中文字同病。
- 建议改法：:266 底色改 var(--c-brand-800, #156B51)（白字 6.45:1），或按同分包 people.vue:379 的 tab 口径改成浅绿底 + brand-800 深绿字。
- 修复类别：CSS/token

### R14-L06-D12　P2 / 颜色token　批次 R14-B39
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`dbec0756a0484b79`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1455`
- 理想图依据：无基准，依据=规范文档§1.1.2「绿色=行动，粉色=喜欢，两色禁止混用」
- 现象：底帧唯一一张互相喜欢卡右侧圆钮底为粉渐变（帧上实测填充 RGB(255,196,206)，:1313 romance-200→romance-100），钮里的「›」字形却仍吃 .likes-card__arrow-icon 的行动绿（:1455 --c-brand，帧上最暗像素实测 RGB(54,201,154)）⇒ 粉底绿字 1.41:1，既违反两色不混用，又让「可点进聊天」这枚唯一提示几乎读不出。
- 建议改法：给 .likes-card--mutual .likes-card__arrow-icon 单列一条 color: var(--c-romance-500, #FF6B81)（或深粉档），绿只留给非 mutual 态。
- 修复类别：单页

## subpackages/discover-extra/nearby/people（2 条）

### R14-L06-D04　P2 / 可达性　批次 R14-B40
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`cd3f48d9ef0c38d7`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:538`
- 理想图依据：无基准，依据=规范文档§1.2（次级/图形对比下限）+ 同分包 segment.vue:379-387 已确立的箭头色档口径
- 现象：顶帧 7 行右侧「›」仍走 --c-text-quaternary，令牌真值 #9AA39F 压白卡 2.59:1、行内兜底 #C8CFCD 只有 1.5:1，帧上箭头最暗像素实测 RGB(210,213,212) ⇒ 低于非文本图形 3:1；同分包 segment.vue:386 的同一枚「›」在 R11-L06-D10 已改 --c-text-tertiary(#6B7571, 4.76:1)，本页漏改，两页箭头深浅肉眼可分。
- 建议改法：.people-row__arrow 的 color 改 var(--c-text-tertiary, #6B7571)，兜底写令牌真值。
- 修复类别：CSS/token

### R14-L06-D05　P2 / 间距　批次 R14-B40
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`cbbff5c470b58709`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:437`
- 理想图依据：无基准，依据=规范文档§1.4 卡片内边距 --card-padding 32rpx=16px（design-variables.scss:698）
- 现象：底帧行卡内衬 22rpx 24rpx（上下 11px / 左右 12px）——既不吃 --card-padding 32rpx=16px，又与同域 segment.vue:309 的 20rpx 差 2rpx：同一分包两页、同一角色列表行两套裸值，卡内文字到卡片上沿的留白两页不齐（本页 11px / segment 10px，规范 16px）。
- 建议改法：.people-row 的 padding 改 var(--card-padding, 32rpx)，与 segment.vue:309 同批同档。
- 修复类别：CSS/token

## subpackages/discover/activities/index（2 条）

### R14-L13-D03　P2 / 可达性　批次 R14-B41
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`9803d2aa1c33af23`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:818`
- 理想图依据：无基准，依据=规范文档§1.2（brand-500 #36C99A / brand-50 #E8FAF3）+ §1.3 标签档；同仓先例 StatusState.vue:97-109（R9-L13-D03 同款「彩字压彩底 1.99:1→深档 6.57:1」）
- 现象：每张卡头部的「综合」分类标签用 --c-brand #36C99A 字压 --c-brand-50 #E8FAF3 底，实算 1.94:1（L 0.4489/0.9198），13px 粗体在帧上已发飘近不可读；上一轮 R13-L13-D04 只把这枚标签的字号从 10px 提到 13px，颜色轴原样未动（画面变了但这条轴没对齐）
- 建议改法：前景降到同族深档 --c-brand-800 #156B51（压 brand-50 实算约 5.96:1，同文件 :714 选中态已用此档），底色不动
- 修复类别：CSS/token

### R14-L13-D04　P3 / 间距　批次 R14-B41
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`0737b83c2200d509`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:806`
- 理想图依据：无基准，依据=规范文档§1.4 间距阶梯（--sp-1~10=2/4/6/8/10/12/16/32/48rpx，一令牌一值）
- 现象：本帧「环湖夜走第六期」「秋冬草地音乐会」卡头的「综合」标签内衬写死 4rpx 14rpx，14rpx 不在 §1.4 阶梯任何一档（最近档 --sp-4=16rpx），同页其他 chip（.quick-filter :1174）走 12rpx 32rpx，同域两档私值并存
- 建议改法：padding 改 var(--sp-2) var(--sp-4)（4rpx 16rpx），消除 14rpx 私值
- 修复类别：CSS/token

## subpackages/discover/discussions/index（2 条）

### R14-L13-D01　P2 / 字号　批次 R14-B42
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`00132ac2fa1ec8c9`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:185`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表「正文/列表主文字 --fs-xl/2xl 15/16px」
- 现象：feed-row 标题（如「猫咪名字征集」「图书馆自习day5，打卡坚持住」）取 --fs-lg=28rpx=14px 粗体，落在 §1.3「辅助说明」档，列表主文字比规范下限小一档
- 建议改法：.row-title 字号提到 var(--fs-xl, 30rpx)（15px），与全站列表主文字同档
- 修复类别：CSS/token

### R14-L13-D02　P2 / 间距　批次 R14-B42
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`9844258806a44d2e`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:175`
- 理想图依据：无基准，依据=规范文档§1.4 间距阶梯（--sp-1~10=2/4/6/8/10/12/16/32/48rpx，「一令牌一值，禁止私有色值/私值」）
- 现象：feed-row 上下内衬写死 22rpx（本帧「博物馆新展开放」「大提琴独奏练习中」等行分隔带实测即此值），不在 §1.4 任何一档，同页「下一步」卡走 SectionCard --sp-8=32rpx，两类间距取档私值
- 建议改法：padding 改 var(--sp-6) var(--sp-0) 或 --sp-5 等阶梯值，去掉 22rpx 私值
- 修复类别：CSS/token

## subpackages/legal/agreement/index（2 条）

### R14-L13-D07　P3 / 文案　批次 R14-B03
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`f432b9810c214361`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:301`
- 理想图依据：无基准，依据=规范文档§1.3「法务」行 + 中文全角标点惯例（同帧内《个人信息保护法》式书名号为全角）
- 现象：本帧正文「（以下简称"本服务"）」「点击"同意并继续"」均为半角直引号（zh-CN.ts:4719 兜底文本 \" 写死），与同页全角标点混排；与 D05 同根因、不同页帧各记一笔，修复可一次收编
- 建议改法：兜底文本内引号统一改全角“”（两页同批改）
- 修复类别：单页

### R14-L13-D08　P3 / 文案　批次 R14-B03
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`219af5bea51ec4a0`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:301`
- 理想图依据：无基准，依据=规范文档§1.3「法务」行；同帧自证（同一术语两种写法）
- 现象：本帧第 8 条写「您可于 7 天内通过反馈中心申诉」（裸词），第 11 条写「请通过小程序内「反馈中心」提交」（带「」），同一帧内同一入口术语两种标注形态
- 建议改法：产品内入口名统一加「」或统一裸写，两页兜底文本一并过一遍
- 修复类别：单页

## subpackages/legal/privacy/index（2 条）

### R14-L13-D05　P3 / 文案　批次 R14-B03
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`a622551c2971010e`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:301`
- 理想图依据：无基准，依据=规范文档§1.3「法务」行 + 中文排版全角标点惯例（同段内（）、《》均为全角）
- 现象：本帧首段「我们（"校园恋爱"运营方）」的引号是半角直引号 "（zh-CN.ts:4727 兜底文本以 \" 转义写死），与同页全角（）《》混排，法务正文引号体系不统一
- 建议改法：兜底文本内引号统一改全角“”，与《》（）同体系
- 修复类别：单页

### R14-L13-D06　P2 / 位置　批次 R14-B03
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`48a1ebf19e51d11a`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:249`
- 理想图依据：无基准，依据=规范文档§1.1 原则 5 + R11-L13-D19 披露要求（兜底态必须上屏披露「非正式版本」）；本帧为文末签署位
- 现象：本帧（滚到第 7~10 条、手指点在吸底「我已阅读并同意」上的签署位）里，披露药丸「本地兜底文本 · 非正式版本」随 .legal-header 早已滚出视口，吸底条（:521 fixed）不带任何兜底状态标识 ⇒ 用户实际作出同意动作的那一刻看不到"这不是 CMS 正式文本"的披露
- 建议改法：吸底条内按钮上方补一行 --fs-xs 法务小字「当前为本地兜底文本 · 非正式版本」（isLocalFallback 时出），或让药丸随 footer 常驻
- 修复类别：单页

## subpackages/market/detail/index（2 条）

### R14-L13-D09　P2 / 颜色token　批次 R14-B43
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`a07a16f1aad60637`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:307`
- 理想图依据：无基准，依据=规范文档§1.2 色板 + §1.1 原则 3「一令牌一值，禁止私有色值」
- 现象：封存卡中央的锁图标（static/assets/icons/common/lock.svg）描边硬编码 #94A3B8（蓝灰，Tailwind slate 系，不在 §1.2 任何一档），再叠 :549 opacity .55，帧上呈淡蓝紫色，与全站绿中性（#6B7571/#9AA39F/#DCE5E2）和绿色系断层
- 建议改法：图标描边改仓内绿中性（如 --c-text-placeholder #9AA39F 同值）或绿系深档，去掉 #94A3B8 私值
- 修复类别：CSS/token

### R14-L13-D10　P3 / 圆角　批次 R14-B43
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`bc32ff54a82059ce`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:516`
- 理想图依据：无基准，依据=规范文档§1.4 圆角阶梯 + 同域主 CTA 取档（BottomActionBar.vue:98 / LegalTextPage.vue:547 均 --r-xl 24rpx）
- 现象：本帧（页面不可滚，与 top 帧同屏）「返回」钮圆角取 --r-full 全胶囊，而同为页面唯一主行动钮的「去寻觅」「我已阅读并同意」全走 --r-xl(24rpx=12px) 方圆角，同域两页取档不一
- 建议改法：.product-state__btn border-radius 改 var(--r-xl, 24rpx)，与全站主 CTA 同档
- 修复类别：CSS/token

## subpackages/market/shop/index（6 条）

### R14-L14-D01　P2 / 位置　批次 R14-B44
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`f8d0102a2045fdbf`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:407`
- 理想图依据：无基准，依据=组件规范 apps/client/src/components/common/EmptyState.vue:152-153（空态块 align-items:center + justify-content:center，:159 注释「撑满可用区即垂直居中」）
- 现象：378×814 帧上封存卡落在 y130–260（贴页头下方），卡下 554px＝68% 视口是纯 #EEF7F2 空底；.shop-page 本身已是 flex column + min-height:100%（:406-411），居中只差一步没做。
- 建议改法：给 .shop-sealed 加 `margin: auto var(--page-padding)`（或外包 flex:1 居中容器），把卡压回视口中线。
- 修复类别：CSS/token

### R14-L14-D02　P2 / 圆角　批次 R14-B44
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`f8d0102a2045fdbf`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:766`
- 理想图依据：无基准，依据=规范文档《全站设计规范与逐页设计稿说明.md》§1.4「卡片圆角 --card-radius 40rpx=20px」（design-variables.scss:699）
- 现象：帧上卡左上角从 dy=14px 起才转为直边（minx 17 稳定）⇒ 实测圆角 ≈14–16px；代码取 --r-xxl 32rpx=16px，比规范卡片圆角 40rpx=20px 少 8rpx，且与本页自己白卡的 --r-xl 24rpx（:501）也不是一档。
- 建议改法：border-radius 改 var(--card-radius, 40rpx)，与 §1.4 卡圆角令牌对齐。
- 修复类别：CSS/token

### R14-L14-D03　P2 / 颜色token　批次 R14-B44
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`f8d0102a2045fdbf`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:778`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（表内无 #94A3B8 这枚值）+ §1.1 规则 3「一令牌一值…禁止私有色值」
- 现象：锁图标素材 assets/icons/common/lock.svg 自带 stroke="#94A3B8"（对白卡仅 2.56:1），再叠 opacity:0.55 ⇒ 帧上图标墨色实测 #C0C9D6、对白卡 1.67:1，低于非文本图形 3:1 下限；它是本页唯一的状态图形（卡内除两行字外无其他视觉件）。
- 建议改法：换成描线走 --c-text-tertiary / --c-border-strong 档的 lock 素材并去掉 opacity:0.55（若保留减淡，需 ≥0.75 使合成值回到 3:1 以上）。
- 修复类别：CSS/token

### R14-L14-D04　P3 / 间距　批次 R14-B44
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`f8d0102a2045fdbf`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:764`
- 理想图依据：无基准，依据=规范文档 §1.4 间距阶梯 --sp-1~sp-10 = 2/4/6/8/10/12/16/32/48rpx（60rpx 不在档上）；同域 wallet/index.vue:389 同一封存态卡上边距走 var(--sp-10)
- 现象：卡上外边距写死私有值 60rpx（横向同行走 --page-padding，纵向却不用令牌），比 wallet 同状态卡的 --sp-10(48rpx) 多 12rpx；帧上实测「返回盘下缘→卡上缘」shop 42px vs wallet 31px，同域两页同一状态差 11px。
- 建议改法：`margin: var(--sp-10) var(--page-padding)`，纵向也回令牌档并与 wallet 同值。
- 修复类别：CSS/token

### R14-L14-D05　P2 / 位置　批次 R14-B44
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`f8d0102a2045fdbf`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:748`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:155（空态块自带 80rpx×40rpx 内衬）+ 帧实测（bottom 与 top 两帧 sha16 逐字节相同）
- 现象：bottom 帧 sha16 与 top 帧同为 f8d0102a2045fdbf ⇒ 滚到底没有任何增量内容，屏底 554px 仍是空 #EEF7F2；.shop-footer 底部留白（:379 消费点）整块在 `v-if="!commerceSealed"` 分支里，封存分支既无底部占位也无 safe-area 处理。
- 建议改法：把 .shop-footer / env(safe-area-inset-bottom) 占位移出 v-if，让封存分支同样有底部留白（并顺带把卡居中，见 D01）。
- 修复类别：单页

### R14-L14-D06　P2 / 空态文案　批次 R14-B44
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`f8d0102a2045fdbf`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:387`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:135-142 + :235（空态自带 action 控件且 min-height:88rpx）
- 现象：封存卡只有「图标＋两行字」，末句写「开放时间将另行通知」，但 :384-388 分支内没有任何可点控件（无提醒/订阅、无返回按钮），帧上整页除页头返回盘外零控件 ⇒ 文案承诺的「另行通知」在页内没有落点。
- 建议改法：复用 EmptyState 的 action 槽补「开放提醒我」（或「先回首页」）按钮，热区 ≥88rpx；做不到就把「另行通知」半句删成不承诺的写法。
- 修复类别：单页

## subpackages/market/wallet/index（6 条）

### R14-L14-D07　P3 / 颜色token　批次 R14-B45
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`f4ee8cc6434b8b5b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:419`
- 理想图依据：无基准，依据=规范文档 §1.2（次文本 --c-text-secondary #4A524E / 三级 --c-text-tertiary #6B7571，design-variables.scss:122/125）；同域 shop/index.vue:797 同一句已归到 secondary
- 现象：同一句 sealedDesc、同一白卡、同字号，shop 帧实测墨色 #575F5B（对白卡 6.58）而本页实测 #747E7A（4.19，令牌真值 4.76 仍达 4.5 线），同域两页同状态取了两档；行内兜底 #94a3b8 还是 §1.2 表外的石板蓝（真值应为 #6B7571）。
- 建议改法：与 shop 对齐为 `color: var(--c-text-secondary, #4A524E)`，并清掉过期兜底字面量。
- 修复类别：CSS/token

### R14-L14-D08　P2 / 可达性　批次 R14-B45
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`f4ee8cc6434b8b5b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:301`
- 理想图依据：无基准，依据=同域 shop/index.vue:459-468 已就同一机制把四边补到 -14rpx（并写明「::after 的定位基准是 padding 盒」）；EmptyState.vue:235 min-height:88rpx 为全站最小可点档
- 现象：.wallet__back 视觉 64rpx（:284-285）带 1rpx --c-border-card 描边（:291），全局 box-sizing:border-box（App.vue:343）⇒ ::after 定位基准的 padding 盒只有 62rpx，四边 -12rpx 后命中盒 = 86rpx = 43.35px，比 88rpx=44.4px 保底少 2rpx；这枚白盘是本页唯一退出控件（navigationStyle:custom，封存分支 :212-216 内无其他控件）。不判 P1：差的是 1px，写不出用户点不中什么。
- 建议改法：四边补到 -13rpx（62+26=88rpx），与 shop「按 border 宽度回补」同一口径。
- 修复类别：CSS/token

### R14-L14-D09　P3 / 位置　批次 R14-B45
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`f4ee8cc6434b8b5b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:267`
- 理想图依据：无基准，依据=同域 shop/index.vue:432-436 页头写法（flex + gap，标题左对齐贴返回盘）；两帧实测横向读数
- 现象：本页页头用 space-between + 64rpx spacer（:158/:324）把「我的钱包」推到视口正中（实测标题墨迹 x148–229、中心 188≈页心 189），而 shop 同子包同自定义页头标题左对齐（实测墨迹 x55–95、中心 75）⇒ 同域两页页头标题两套排布，标题基线也差 4px（y60 vs y64）。
- 建议改法：两页统一一种排布（建议都左对齐贴返回盘，删掉 spacer 改 gap），另一页同批改。
- 修复类别：单页

### R14-L14-D10　P2 / 尺寸比例　批次 R14-B45
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`f4ee8cc6434b8b5b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:401`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:170-171（空态图标 120rpx×120rpx）
- 现象：图标盒 96rpx=48.4px，帧上实测锁形墨迹只有 40×44px（x170–209 / y132–174，≈79×87rpx），比组件规范状态图形 120rpx 小 24rpx（-20%），在 130px 高的卡里撑不起视觉重心；shop:776 同盒同值，两页一起偏档。
- 建议改法：图标盒提到 120rpx×120rpx 与 EmptyState 同档（shop:776 同步）。
- 修复类别：CSS/token

### R14-L14-D11　P2 / 位置　批次 R14-B45
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`f4ee8cc6434b8b5b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:251`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:152-153（空态块 justify-content:center 垂直居中）+ 帧实测（bottom 与 top 两帧 sha16 逐字节相同）
- 现象：bottom 帧 sha16 与 top 帧同为 f4ee8cc6434b8b5b ⇒ 滚到底零增量；.wallet 只有 min-height:100vh 的块级容器（:250-254），封存卡顶置（实测卡 y114–243），其下 571px＝70% 视口是纯 #EEF7F2 空底，页底唯一留白来自 :253 的 env(safe-area-inset-bottom)。
- 建议改法：.wallet 改 display:flex;flex-direction:column 并让 .wallet__sealed `margin:auto var(--page-padding)` 居中（与 shop D01 同口径）。
- 修复类别：CSS/token

### R14-L14-D12　P2 / 圆角　批次 R14-B45
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`f4ee8cc6434b8b5b`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:391`
- 理想图依据：无基准，依据=规范文档 §1.4「卡片圆角 --card-radius 40rpx=20px」（design-variables.scss:699）
- 现象：实测左上角 dy=14px 才转直边 ⇒ 圆角 ≈14–16px；代码写 --r-2xl，而 --r-2xl 只是 --r-xxl 的别名（tokens.scss:114）实值 32rpx=16px，比规范卡片圆角少 8rpx；同页余额卡（:330）亦走 --r-2xl，整页没有一处用 --card-radius。
- 建议改法：封存卡 border-radius 改 var(--card-radius, 40rpx)（与 shop D02 同批同改）。
- 修复类别：CSS/token

## subpackages/profile-extra/feedback/history（4 条）

### R14-L11-D05　P2 / 位置　批次 R14-B46
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`919b72c3ad64bd1f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:350`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue:156-165（R6-L05-D02 已裁定「空态块贴顶不居中」为缺陷，组件侧已补 flex:1 + justify-content:center，并写明另一半在宿主：父级须给可解析高度）
- 现象：空态块实测图标顶 y=233、描述底 y=334（中心 y≈284），而筛选芯片底 y≈172 到屏底 814 的可用区中心是 493 ⇒ 空态上方只留 61px、下方堆 480px 空底，整页重心吊在画面上 1/3；本页把 EmptyState 直接放在 AppShell 默认内容流里，没给可解析高度，组件的 flex:1 失效。
- 建议改法：给包一层 .empty-wrap{display:flex;flex-direction:column;min-height:60vh} 之类可解析高度的宿主，兑现组件侧已声明的居中。
- 修复类别：单页

### R14-L11-D06　P2 / 颜色token　批次 R14-B46
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`919b72c3ad64bd1f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:520`
- 理想图依据：无基准，依据=规范 §1.2 边框档 --c-border-light/default/strong = #EEF2F0/#DDE3E0/#C2CAC6（非文本件边界须 ≥3:1）
- 现象：三枚未选中筛选芯片实测白底 (255,255,255) 坐在页面底 (238,247,242)=#EEF7F2 上只有 1.09:1，:520 的描边又取 rgba(15,23,42,0.04)（对白 ≈1.02:1）⇒ 帧上「反馈/建议/活动提案」读起来是三个裸灰词，芯片容器完全不存在；选中芯片实测底 (232,251,242)=#E8FBF2 与未选白底之间也只有 1.08:1，选中态全靠 --c-brand-800 描边一条线表意。
- 建议改法：未选中描边抬到 var(--c-border-default)（1.30:1）或底改 --c-bg-surface 并加可见描边，使四枚芯片同一档、选中态除描边外还有底色差。
- 修复类别：CSS/token

### R14-L11-D07　P2 / 空态文案　批次 R14-B46
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`9a9ccbc66d39d968`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:354`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue:133-143 + :217-240（actionText 传入即渲染深绿动作键，为全站空态既定出口）
- 现象：空态描述实测两行文案「暂无反馈记录 / 提交反馈后将在此处显示」把用户支使去「提交反馈」，但本页没有传 actionText ⇒ 帧上除四枚筛选芯片外没有任何出口，用户在本页无法完成「去提交反馈」这一步（只能自己退到设置页重找入口）。
- 建议改法：复用既有 actionText + @action 跳 ROUTES 反馈提交页（组件侧样式与对比度已达标，实测同族深绿键 6.45:1）。
- 修复类别：单页

### R14-L11-D08　P3 / 颜色token　批次 R14-B46
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`9a9ccbc66d39d968`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:571`
- 理想图依据：无基准，依据=本任务书 P3 判据「无消费者的孤儿样式」+ 组件规范 EmptyState.vue:211-216（空态副标题已归 --c-text-secondary）
- 现象：样式块里仍留着 .empty-card / __title / __subtitle 三条规则（:571-589），而模板空态分支早已改渲染 <EmptyState>（:350），全文件无一处 empty-card 节点 ⇒ 孤儿样式；且其中 __subtitle 取 --c-text-tertiary、__title 取 --fs-lg，与帧上真正渲染的组件档（--c-text-secondary / --fs-xl）不同，后续照孤儿档改空态字号会改到不渲染的那一份。
- 建议改法：删掉 :571-589 三条无消费者规则，空态档位统一由 EmptyState 组件收口。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/album（7 条）

### R14-L10-D13　P2 / 颜色token　批次 R14-B47
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`97303aa7ac662d91`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:633`
- 理想图依据：无基准，依据=规范文档§1.1 原则 1「主题底色统一浅绿 #EEF7F2」+ §1.2 页面底色行 `--c-bg-page = #EEF7F2`（表内无「页面渐变底」这一角色）
- 现象：本页底色取 var(--c-gradient-page)（design-variables.scss:181 = linear-gradient(180deg,#DFF3EA 0%,#EEF7F2 100%)），顶档 #DFF3EA 比规范规定的唯一页面底色 #EEF7F2 深 Δ(15,4,8)，帧上页头一带明显比 location/privacy/tasks 三页（:289 / :248 / :512 均写 var(--c-bg-page) 平涂）更饱和一档绿。更要紧的是 :803 已上传格底写的是平涂 --c-bg-page #EEF7F2，压在这条渐变上——同一个色令牌在本页对不上它所在的底色，读数随 y 变化。
- 建议改法：.album-page 的 background 改 var(--c-bg-page)，与同分包其余四页取同一平涂档。
- 修复类别：CSS/token

### R14-L10-D14　P2 / 可达性　批次 R14-B47
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`97303aa7ac662d91`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:706`
- 理想图依据：无基准，依据=规范文档§1.2 三级文本 --c-text-tertiary #6B7571 + §1.1 原则 1（页面底色须是 #EEF7F2 平涂，本页实际底为渐变顶档 #DFF3EA）
- 现象：页头计数「1 / 6」取 --c-text-tertiary #6B7571、--fs-md 13px，直接压在本页渐变顶档 #DFF3EA 上（:704 的 .album-header__count 无任何卡底）。实算对比 4.12:1（L 0.85734 / 0.17044），比 tasks.vue:562-566 那一条同样压在页面底上的计数（4.36:1）还低，两页都低于 4.5:1 正文地板；而本页 D13 的渐变使这个读数随页面高度继续往下掉。
- 建议改法：与 tasks.vue:567 同批改 var(--c-text-secondary, #4A524E)（压 #DFF3EA 约 6.9:1），字号 --fs-md 不动。
- 修复类别：CSS/token

### R14-L10-D15　P2 / 颜色token　批次 R14-B47
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`97303aa7ac662d91`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:808`
- 理想图依据：无基准，依据=规范文档§3.8「我的故事…+ **虚线添加卡**」（虚线添加格是全站既有范式）+ §1.2 边框行三档 #EEF2F0/#DDE3E0/#C2CAC6
- 现象：5 个空格的虚线描边取 --c-brand-300 #75E1B7，而它压在的正是 :809 自己那层 --c-brand-50 #E8FAF3 格底——实算 1.47:1（L 0.6106 / 0.9194），同族浅绿压同族浅绿。帧上这 5 格的边界确实只剩一层若有若无的浅痕，:806 注释自陈的「空位近不可见 → 虚线描边 + 浅绿底，明确可上传」只做到了「浅绿底」、描边这一半没立起来。另：兜底写的 #7DDBC0 与令牌真值 #75E1B7 不符（假兜底）。
- 建议改法：描边改 §1.2 已登记的 --c-border-strong #C2CAC6（压 #E8FAF3 约 1.6:1 仍不够）→ 直接取 --c-brand-500 深两档的 var(--c-brand-700, #1F8D6A)（压格底约 4.0:1），并清掉假兜底。
- 修复类别：CSS/token

### R14-L10-D16　P2 / 字号　批次 R14-B47
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`75ed3aff17fc046a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:914`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（极小 --fs-xs/sm = 10/11px 用途为「角标·法务」；辅助 --fs-lg/xl = 14/15px 用途为「说明」）
- 现象：长按提示「长按照片可删除或设为头像」取 --fs-sm=22rpx（11px），落在 §1.3 的「角标·法务」档。这一句是本页删除/设头像两个操作的唯一发现路径（:506 的 @longpress 没有任何可视标记），却比它上方那颗按钮的文案（:903 --fs-lg 14px）小三档；帧上这行字在「添加照片」按钮下方缩成一条 11px 灰痕。
- 建议改法：升 var(--fs-lg, 28rpx)（14px，§1.3 辅助档），色 --c-text-secondary 不动。
- 修复类别：CSS/token

### R14-L10-D17　P3 / 位置　批次 R14-B47
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`75ed3aff17fc046a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:643`
- 理想图依据：无基准，依据=规范文档§1.1 原则 3「一令牌一值」延伸的同域一致性 + 同域 location.vue:292-296 / privacy.vue:252-256 已定的页头排布（back + 居中标题 + 等宽占位）
- 现象：.album-header 用 `align-items: baseline` + `justify-content: space-between`，标题紧跟返回键左排、计数被推到 :653 预留的 104px 安全距前。帧上「我的相册」左缘起于 x≈70、整组左贴；同域 location.vue:195 用一个 88rpx 等宽占位把「我的位置」顶成水平居中、privacy.vue:325 同款占位居中「隐私权限设置」。同分包五页里 album/favorites 左贴、location/privacy 居中，两套页头版式并存。
- 建议改法：与 location/privacy 取同一配方（back + 标题 + 等宽 spacer 居中），或把左贴定为域内唯一版式并同步 location/privacy。
- 修复类别：单页

### R14-L10-D18　P3 / 字号　批次 R14-B47
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`75ed3aff17fc046a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:833`
- 理想图依据：无基准，依据=规范文档§1.3（--fs-7xl=56rpx 是页头/品牌大标题档，design-variables.scss:572 注释自陈「大标题 28pt = 56rpx，对应登录页主标题」）
- 现象：空格加号写裸 `font-size: 56rpx`，既没归 var()（本页 :699 页头标题、:705 计数都已归），又正好把页头大标题档借来当一个装饰字形用——帧上 5 个「+」与标题「我的相册」同字号，装饰件的视觉重量压过了内容行的 :658 任务标题档。同页 :687 的返回字形同样裸写 52rpx，两处裸值。
- 建议改法：加号降一档并归令牌 var(--fs-5xl, 44rpx)；:687 的 52rpx 按 :683-685 注释自陈保留为固定布局尺寸，但登记进注释口径。
- 修复类别：CSS/token

### R14-L10-D19　P3 / 间距　批次 R14-B47
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`75ed3aff17fc046a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:786`
- 理想图依据：无基准，依据=规范文档§1.4 间距表（区块间距 --section-gap = 24rpx = 12px）
- 现象：6 格照片墙格间隙取 var(--sp-3)=12rpx（6px），而 :792/:794 的格宽算式 `(100% - 2*var(--sp-3))/3` 把这个间隙同时喂给了宽和高——间隙每升一档，格子就缩一档，改不动。帧上 6 个格子的横向白缝只有 6px，比页面左右内衬（:634 var(--sp-8)=32rpx=16px）窄一倍多，格与格的缝读起来比格内虚线还弱。同域 tasks.vue:617 卡片间隙用的是 --sp-5=20rpx。
- 建议改法：间隙升 var(--sp-6, 24rpx)（=§1.4 --section-gap 同值），并同步 :792/:794 两处 calc 里的 --sp-3。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/favorites（6 条）

### R14-L10-D20　P1 / 可达性　批次 R14-B48
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`75ce37ef39a8069f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:14`
- 理想图依据：无基准，依据=同域 location.vue:183-188 对该素材的实测结论（「common/back.svg 的栅格化，stroke #94A3B8 蓝灰，24 viewBox 里折线只占 x9..15/y6..18，留白过大，压白色页头实测字形 (183,193,207)~(215,221,229)、对比度≈1.6:1、可见带高≈8px」）+ 组件规范 §1.5 基础 common 组
- 现象：本页返回键仍在用那张蓝灰 back.png，且 :196 把它压到 36rpx×36rpx（比 location.vue 当年实测的 40rpx 更小）。帧上左上白圆里那枚箭头是浅灰一痕，与圆底几乎分不开——同帧对比 album.vue:686（52rpx 深色 ‹ 字形）一目了然。用户拿不到什么：本页 navigationStyle 自定义、无系统返回栏，这枚是唯一退出口，箭头看不见就只能靠猜或系统侧滑离开「我的收藏」。location.vue:183-188 与 album.vue:683 两处注释已把这张 png 判为不可读并换成深色 ‹ 字形，本页漏改。
- 建议改法：按 location.vue:189-193 / album.vue:672-691 已验证配方，删 :14 的 image，改 52rpx 深色 ‹ 字形 + var(--c-text-primary)。
- 修复类别：单页

### R14-L10-D21　P2 / 字号　批次 R14-B48
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`75ce37ef39a8069f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:198`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级「页面主标题 26–28px / 700–800 / 页头标题」+ 同域三页已统一到 --fs-7xl 的既有定论（location.vue:342-345、privacy.vue:309-312、album.vue:695-699 同批 R11-L10-D07）
- 现象：页头标题「我的收藏（0）」取 var(--fs-xl, 32rpx)，令牌真值 30rpx=15px（design-variables.scss:565），比 §1.3 页头档下限 26px 低 11px，比同分包同批改完的三页（location/privacy/album 均 --fs-7xl=56rpx=28px）低整整四档。帧上「我的收藏（0）」明显比「我的相册」「我的位置」小一圈，页头读起来像列表行标题而不是页标题。同一行的兜底 32rpx 与真值 30rpx 不符（假兜底，:198）。
- 建议改法：改 var(--fs-7xl) 与同域三页取齐，并删掉 32rpx 假兜底。
- 修复类别：CSS/token

### R14-L10-D22　P2 / 颜色token　批次 R14-B48
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`75ce37ef39a8069f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:44`
- 理想图依据：无基准，依据=规范文档§1.1 原则 2「**绿色 = 行动，粉色 = 喜欢，两色禁止混用**」+ §1.2 心动粉 --c-romance-500 #FF6B81 用途「喜欢 · 匹配 · 品牌点缀」
- 现象：空态主视觉星标绑的是 IMAGE_PATHS.ICONS_EMOJI.STAR，:35-41 的注释明确记着这枚的描边写死 #36C99A（= --c-brand 主绿）。帧上那颗大星是品牌绿描边，而它服务的语义是「收藏 / 喜欢的帖子」——同一句副标题（:46 渲染的 favoritesEmptyDesc）原文就是「喜欢的帖子会出现在这里」。按 §1.1 原则 2，「喜欢」这一语义全站归心动粉 #FF6B81，这里用主绿正好踩在禁止混用的那条线上；同页 :47 那颗动作按钮「去广场逛逛」是行动、用绿（EmptyState.vue:230 brand-800）是对的，于是同一张空态卡上「喜欢」和「行动」两色被用反了。
- 建议改法：收藏语义的星标换 romance 档素材（或给这枚 SVG 传 --c-romance-500 描边），绿色只留给 :47 那颗行动按钮。
- 修复类别：单页

### R14-L10-D23　P2 / 位置　批次 R14-B48
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`9088decf6b52d9c3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:149`
- 理想图依据：无基准，依据=组件规范 §1.5 基础 common 组 EmptyState（自带 justify-content:center 的整块居中语义，EmptyState.vue:149-165）
- 现象：空态整块贴在页头下方、没有居中。帧上星标+「还没有收藏」+副标题+按钮的实测跨度是 y≈145..318（块中心 y≈231），而页头之下可用区是 y≈95..814（中心 y≈454）——块中心比可用区中心高 223px，其下 496px 全是空薄荷底。:145-149 那条 R11-L10-D18 注释写「改明确 height:100vh，EmptyState 的 flex:1 0 auto 才有伸展对象」，帧读数证明没生效：mp-weixin 下自定义组件的 flex 子项是组件宿主节点，EmptyState.vue:165 的 `flex: 1 0 auto` 挂在组件内部 .empty 上，宿主节点没拿到 flex ⇒ .empty 只按自身内容高（40px padding + 内容 + 40px padding = 255px，正好对上帧上 95..350 的跨度）排在页头下面。
- 建议改法：在宿主侧给 EmptyState 加 custom-class 或 :style 把 flex:1 打到组件宿主节点上（或本页改回自绘空态并直接给 .favorites-page 加 justify-content:center）。
- 修复类别：单页

### R14-L10-D24　P3 / 圆角　批次 R14-B48
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`9088decf6b52d9c3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:189`
- 理想图依据：无基准，依据=规范文档§1.4 圆角阶梯 + design-variables.scss:198-204 实盘（无 --r-circle 这一枚）
- 现象：返回圆底写 `border-radius: var(--r-circle, 50%)`，--r-circle 在 design-variables.scss 里 0 命中，这条 var() 恒走兜底。同域同类圆底 album.vue:675 / location.vue:317 / tasks.vue:542 三处都写的真令牌 var(--r-full)，只有 favorites 与 privacy.vue:285 两页留幽灵令牌。帧上那颗 64rpx 白圆渲得是圆的（50% 生效），所以这是纯代码口径不一致，但同一族圆底五页两种写法。
- 建议改法：改 var(--r-full)，与同域其余三处取齐。
- 修复类别：CSS/token

### R14-L10-D25　P3 / 尺寸比例　批次 R14-B48
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`9088decf6b52d9c3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:207`
- 理想图依据：无基准，依据=组件规范 §1.5 基础 common 组 EmptyState（图标位实渲 120rpx，EmptyState.vue:170-171）
- 现象：页内还留着整套已废弃的自绘空态样式：:206 .favorites-empty、:207 .favorites-empty__icon（写死 80rpx×80rpx）、:208 __title、:209 __desc、:204 .favorites-state__text——grep 模板段（1..141 行）命中 0 次，空态早已改走 :42 的 <EmptyState>。于是同一条空态主视觉在本文件里存着两套尺寸：死掉的 80rpx 和帧上真正渲出来的 120rpx（EmptyState.vue:170），差 40rpx，后来人照 :207 调图标只会调不到东西上。
- 建议改法：删 :204 与 :206-209 五条无消费者规则，空态尺寸只在 EmptyState 侧维护。
- 修复类别：单页

## subpackages/profile-extra/profile/location（6 条）

### R14-L10-D01　P2 / 圆角　批次 R14-B49
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`6d3032a5f7631988`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:517`
- 理想图依据：无基准，依据=规范文档§1.4 圆角阶梯（--r-md 12 / --r-lg 20 / --r-xl 24 / --r-full 9999rpx）+ 本页 :227-231 自陈的「12rpx 内衬把方形地图让开角部弧线，几何下限≈7rpx」意图
- 现象：地图占位卡外层 __frame 圆角取 --r-xl=24rpx、内衬 padding 12rpx，内层薄荷引导块却取 --r-lg=20rpx；两层同心弧的几何应值是 24−12=12rpx（--r-md），多出的 8rpx 使内层弧线在 45° 对角上顶到外层弧线之外（内圆心偏移 5.66rpx√、半径 20rpx > 外半径 24rpx−偏移），被 :487 的 overflow:hidden 硬切 ⇒ 帧上地图块四角那圈白内衬厚度归零、薄荷直接顶到卡片外沿，而上下直边仍是 6px 白缝，内衬宽窄一眼可见不匀。
- 建议改法：.location-map__guide 的 border-radius 由 var(--r-lg) 改 var(--r-md, 12rpx)，与 24rpx 外弧 − 12rpx 内衬取齐。
- 修复类别：CSS/token

### R14-L10-D02　P2 / 字号　批次 R14-B49
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`6d3032a5f7631988`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:415`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（小字 --fs-md/base=13/12px 用于「标签·时间戳」；极小 --fs-xs/sm=10/11px 只用于「角标·法务」）
- 现象：坐标行「经度 — · 纬度 —」取 --fs-sm=22rpx（11px），落在 §1.3 的「角标·法务」档；这一行是本页唯一的坐标读数（数据行），同页 :401 的字段名「当前位置」都还有 12px，读数比它的标签更小。紧接的 :421 可行动指引「…可点下方「重新定位」，或用「地图选点」手动选位置」同样 11px，两行 11px 灰字在帧上挤成卡内最小的一块。
- 建议改法：坐标行与指引行升到 var(--fs-md, 26rpx)（13px，§1.3 小字档），字段名保持 --fs-base 不动。
- 修复类别：CSS/token

### R14-L10-D03　P3 / 文案　批次 R14-B49
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`6d3032a5f7631988`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:265`
- 理想图依据：无基准，依据=规范文档§1.1 设计原则（逐页口径统一）+ 本页 :261-264 自陈的「方位词与实际可点对象对齐」定论
- 现象：同一个「地图选点」按钮的用法说明在一屏内被写了三遍且三种口径——:209「或用「地图选点」手动选位置」、:250「也可点右侧「地图选点」手动选择」、:265「轻点右侧「地图选点」，在地图上选择新位置」。帧上三句同时在场（白卡内两行灰字、地图块内两行灰字、地图块下方一行灰字），动词分别是「手动选位置/手动选择/在地图上选择新位置」，标点一处用逗号一处用「，」一处不带。
- 建议改法：保留 :265 那一句（方位与热区实测一致），删掉 :250 尾句的重复指引，:209 只留失败原因不带指引。
- 修复类别：单页

### R14-L10-D04　P2 / 间距　批次 R14-B49
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`6d3032a5f7631988`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:359`
- 理想图依据：无基准，依据=规范文档§1.4 间距表（--page-padding 32rpx）+ 同域 privacy.vue:249 已落地的 `padding-bottom: env(safe-area-inset-bottom)` 口径
- 现象：`.location-body` 四边等值 `padding: 32rpx`，底部没有 safe-area 内衬（同域 privacy.vue:249 有）。帧上「返回首页」下缘停在 y≈670、屏高 814，其下 144px（≈286rpx）薄荷死白全部由 :288 的 min-height:100vh 富余撑出，而页头到首卡只有 16px——一旦 :213 校区行或 :218 地址行的 v-if 命中（真机定位成功后必然命中），末钮就会直接贴到 home indicator。
- 建议改法：`.location-body` 的 padding 拆成 `32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom))`，与 privacy.vue:249 取同一配方。
- 修复类别：CSS/token

### R14-L10-D05　P3 / 圆角　批次 R14-B49
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`6d3032a5f7631988`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:566`
- 理想图依据：无基准，依据=规范文档§1.4 圆角阶梯（design-variables.scss:198-204 实盘只有 4/8/12/20/24/32/9999rpx 七档）
- 现象：「地图选点」胶囊写 `border-radius: 999rpx`，:589 的「重新定位」「返回首页」两颗也写 999rpx——三颗胶囊全部用同一个不在 --r-* 阶梯上的裸值（阶梯里对应档是 --r-full=9999rpx）。同页 :317 的返回圆底、:484 的地图框都已归 var()，唯独这三颗胶囊漏归。
- 建议改法：三处 999rpx 统一改 var(--r-full, 9999rpx)（渲染零差，纯归令牌）。
- 修复类别：CSS/token

### R14-L10-D06　P3 / 尺寸比例　批次 R14-B49
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`6d3032a5f7631988`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:564`
- 理想图依据：无基准，依据=规范文档§1.4（按钮高度不入令牌阶梯，但同域同族控件须同档）+ 本页 :558-561 自陈的「同页三钮取同档」意图
- 现象：一屏三颗胶囊按钮两个高度档：:564「地图选点」height 88rpx，:588「重新定位」「返回首页」height 96rpx。:558-561 的注释写的是「提到同档 88rpx」，实际只提了胶囊自己，另两颗仍是 96rpx ⇒ 帧上「地图选点」明显比下方两颗通栏钮矮一截（44px vs 48px），三钮同族却不同高。
- 建议改法：三颗统一 96rpx（或统一 88rpx），并把 :558-561 注释里的实测值与代码取齐。
- 修复类别：单页

## subpackages/profile-extra/profile/other（2 条）

### R14-L09-D08　P3 / 颜色token　批次 R14-B14
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`4b08650cb931df0a`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:177`
- 理想图依据：他人显示主页.png 身份卡（姓名+♀+在线胶囊区）；依据=§1.1 原则3（禁私有色值，页面只准 var(--c-*)）
- 现象：顶帧身份卡姓名「小新」墨色写死私有色 #333A37（:177），未走 §1.2 主文本令牌 --c-text-primary(#1A1E1C)；同卡容器底亦为裸 #ffffff(:138) 而非 --c-bg-container——other.vue:448 已注明「裸 hex 不随深色主题切换」应收敛到令牌，此组件仍留私有色，与全站令牌口径不一致。
- 建议改法：把 .public-identity__name 的 color 由 #333A37 改为 var(--c-text-primary)，.public-identity 的 background 由 #ffffff 改为 var(--c-bg-container)。
- 修复类别：CSS/token

### R14-L09-D09　P2 / 空态文案　批次 R14-B13
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`6c96806fa10f09d4`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:48`
- 理想图依据：他人显示主页.png「生活瞬间」为 4 张真实方形照片；依据=§3.9 明确「生活瞬间（4 列正方形网格，无占位）」
- 现象：底帧「生活瞬间」恒定渲染 4 格、缺图格填灰色占位并写「暂无照片」文字（CELLS=4 硬铺满），而 §3.9 对该模块明确写「无占位」——理想图此处是真实照片网格、空时不应铺占位格；实帧用 4 个「暂无照片」灰格替代，与规范「无占位」口径相反。
- 建议改法：无照片时按 §3.9 撤下占位格（仅渲染真实照片，photos 为空则整节只留标题或隐藏网格），不再用灰色「暂无照片」占位铺满 4 格。
- 修复类别：单页

## subpackages/profile-extra/profile/privacy（6 条）

### R14-L10-D07　P3 / 圆角　批次 R14-B50
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`ebe101f2ae43aec6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:285`
- 理想图依据：无基准，依据=规范文档§1.4 圆角阶梯 + design-variables.scss:198-204 实盘（--r-* 只有 xs/sm/md/lg/xl/xxl/full 七枚，无 --r-circle）
- 现象：返回圆底写 `border-radius: var(--r-circle, 50%)`，但 --r-circle 在 design-variables.scss 里 0 命中（grep 实测计数 0），这条 var() 永远走兜底 50%。同页 :400/:415 两处圆形控件用的是真存在的 var(--r-full)，同一文件里「圆」两种写法，其中一种是永不解析的幽灵令牌——正是 :308、:365 自陈要清的「假兜底」同类。
- 建议改法：改 var(--r-full)（64rpx 圆底上 9999rpx 与 50% 同渲），与 :400/:415 取同一枚令牌。
- 修复类别：CSS/token

### R14-L10-D08　P2 / 颜色token　批次 R14-B50
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`ebe101f2ae43aec6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:262`
- 理想图依据：无基准，依据=规范文档§1.1 原则 1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ §1.2 配色表（brand-600/700 的角色写的是「按压态·深色文字」，表内无页头深绿档）
- 现象：本页页头是 brand-700→brand-800 的深绿渐变（帧上整条页头实测深林绿、白字），而同分包同族的 location.vue:297 页头是白底 --c-bg-container + 深色字。两页在真机上是相邻跳转（privacy 的 :214「我的位置」入口直接进 location），帧对帧看页头一深绿一纯白，是 §1.1 原则 1 明确禁止的「页面间断层」，且深绿档在 §1.2 里登记的角色是按压态。
- 建议改法：同域四页（location/privacy/album/favorites/tasks）页头底色定一档：要么统一浅绿底 + 深字，要么把深绿页头补写进 §1.2 角色表并全族取齐。
- 修复类别：CSS/token

### R14-L10-D09　P3 / 颜色token　批次 R14-B50
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`ebe101f2ae43aec6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:349`
- 理想图依据：无基准，依据=规范文档§1.2 边框行（--c-border-light/default/strong = #EEF2F0 / #DDE3E0 / #C2CAC6）+ §1.1 原则 3「禁止私有色值」
- 现象：开关行分隔线写 `1rpx solid var(--c-divider-light, #f0f0f0)`，兜底色 #f0f0f0 是纯中性灰，不在 §1.2 三档边框色（全部带绿味：#EEF2F0/#DDE3E0/#C2CAC6）里；:464 那行入口列表分隔线又抄了一遍同一个假兜底。实际渲的是令牌真值 rgba(15,23,42,.06)（design-variables.scss:150），兜底永不生效——但一旦哪天 --c-divider-light 被摘掉，帧上这 5 条分隔线就会掉进体系外的纯灰。
- 建议改法：两处兜底改 §1.2 已登记的 var(--c-border-light, #EEF2F0)，或直接去掉假兜底只留令牌。
- 修复类别：CSS/token

### R14-L10-D10　P2 / 间距　批次 R14-B50
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`ebe101f2ae43aec6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:519`
- 理想图依据：无基准，依据=规范文档§1.4 区块间距 --section-gap=24rpx + 本页 :164-166 自陈的「消解 y=250 以下整屏空薄荷底」目标
- 现象：`.privacy-page__footer-space` 仍是一条 height 120rpx 的空 view（:240 渲染、无任何兄弟依赖），叠在 :246 的 min-height:100vh 之上。帧上说明卡下缘停在 y≈400、屏高 814，其下 414px（≈822rpx）整块空薄荷底——:164 那条注释声称要消解的「y=250..800 整屏空薄荷底」只是从 550px 缩到 414px，而这 120rpx 空块在内容不满一屏时是纯死重。
- 建议改法：删掉 .privacy-page__footer-space（:240/:518-520），底部留白交给 .privacy-page 的 padding-bottom + safe-area。
- 修复类别：单页

### R14-L10-D11　P2 / 颜色token　批次 R14-B50
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`ebe101f2ae43aec6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:436`
- 理想图依据：无基准，依据=规范文档§1.2 配色表「主色 --c-brand（brand-500）#36C99A：主按钮 · **选中态** · 链接 · 进度」
- 现象：「接收同校信息」ON 态轨道（帧上第二枚开关，深林绿实心）取 --c-brand-800 #156B51，而 §1.2 把「选中态」这个角色明确登记给 brand-500 #36C99A；同页 :401/:402 的开关芯片底/描边用的仍是 brand-50/brand-300 浅档。结果帧上两枚开关同框——OFF 那枚是浅薄荷芯片 + 灰轨，ON 那枚直接跳到体系最深处的一档绿，选中态跨过了 §1.2 表里的 500/600/700 三档。
- 建议改法：ON 态轨道改 var(--c-brand) 或 var(--c-brand-600, #2AAE83)（轨道是色块非文字，不受 4.5:1 正文门槛约束，仅需与白滑块 ≥3:1），把 brand-800 留给按压态。
- 修复类别：CSS/token

### R14-L10-D12　P3 / 圆角　批次 R14-B50
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`ebe101f2ae43aec6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:429`
- 理想图依据：无基准，依据=规范文档§1.4 圆角阶梯（圆只用 --r-full 一档）
- 现象：同一个自绘开关里，轨道 :415 用 var(--r-full)、滑块 :429 用裸 `50%`、页头圆底 :285 用幽灵的 var(--r-circle,50%)——一份文件里「圆」三种写法并存。帧上两枚开关的白滑块与轨道两端弧读数是同心的（34rpx 圆在 48rpx 轨内），但代码口径不统一，后续谁改 --r-full 只会改到一半。
- 建议改法：:429 改 var(--r-full)，与 :415 同档；:285 按 D07 一并归令牌。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/tasks（7 条）

### R14-L10-D26　P2 / 字号　批次 R14-B51
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`191424ad741fdfdc`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:556`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级「页面主标题 26–28px / 700–800 / 页头标题」；--fs-5xl=44rpx(22px) 在 §1.3 里的用途登记是「卡片大标题」不是页头
- 现象：页头标题「任务中心」取 var(--fs-5xl)=44rpx=22px，比 §1.3 页头档下限 26px 低 4px，且用的是「卡片大标题」档充当页头。同分包同批收敛过的三页（location.vue:345 / privacy.vue:312 / album.vue:699）都已升 var(--fs-7xl)=56rpx=28px，tasks 与 favorites 两页留在旧档。帧上「任务中心」的字面带高明显比「我的相册」矮一档，同一条 profile-extra 列表页链路上页头字号三页 28px、两页 22px/15px 三种读法。
- 建议改法：改 var(--fs-7xl)，与 location/privacy/album 三页同档。
- 修复类别：CSS/token

### R14-L10-D27　P1 / 可达性　批次 R14-B51
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`191424ad741fdfdc`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:433`
- 理想图依据：无基准，依据=同域 location.vue:183-188 对 ICONS_COMMON.BACK 的实测结论（stroke #94A3B8 蓝灰、素材留白过大、压白色页头对比度≈1.6:1、可见带高≈8px）+ 本页 :529-536 自陈「这枚小圆键是帧上唯一出口」
- 现象：返回键仍绑那张蓝灰 back.png，:551 给 40rpx×40rpx。帧上左上那颗白圆里的箭头是一道浅灰痕，圆底本身（:543 白底 + :544 卡片描边）看得见、里面的箭头读不出方向——同帧对比 album.vue:690（52rpx 深色 ‹）差距明显。用户拿不到什么：:237 注释自证本页 navigationStyle:custom、无 TabBar、无底部操作栏，这枚是唯一出口，箭头不可见时用户只能靠猜热区位置或系统侧滑离开「任务中心」。location.vue:183-193 与 album.vue:683-691 已把这张 png 判为不可读并换深色字形，本页漏改。
- 建议改法：删 :433 的 image，按 location.vue:189-193 配方改 52rpx 深色 ‹ 字形 + var(--c-text-primary)，热区 88rpx 不动。
- 修复类别：单页

### R14-L10-D28　P3 / 尺寸比例　批次 R14-B51
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`191424ad741fdfdc`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:543`
- 理想图依据：无基准，依据=同域已验证配方 location.vue:303-324 / album.vue:661-681 / favorites.vue:169-194（三处一致：88rpx 透明热区 + 64rpx 视觉圆底分两层）
- 现象：.tasks-header__back 把白底（:543）和卡片描边（:544）直接挂在 88rpx 的热区节点上，没有拆出 __back-circle 那层 ⇒ 可见圆底 = 热底 = 88rpx(44px)。帧上左上那颗白圆明显比同域其余四页的 64rpx(32px) 圆底大一圈，五页同族页头里只有 tasks 的返回钮读起来是一个「大圆盘」而不是「小圆钮」。:536 注释写的是「放大的是热区/圆底，不是字形」——热区放对了，圆底被一起放大了。
- 建议改法：按 location.vue:303-324 把 64rpx 圆底（含 background/border）移进新建的 .tasks-header__back-circle，:538-541 的 88rpx 只留透明热区。
- 修复类别：单页

### R14-L10-D29　P2 / 字号　批次 R14-B51
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`5e0639baaad638ac`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:733`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（极小 --fs-xs/sm = 10/11px 用途「角标·法务」；按钮文案属正文/辅助档 14–16px）
- 现象：「去完成」是本页 4 张任务卡上唯一的主动作文案，取 var(--fs-sm)=22rpx（11px）+ 600 字重，落在 §1.3 的「角标·法务」档。帧上四颗深绿胶囊里的「去完成」比它们左边 :658 的任务名（--fs-xl 15px）小近四成，读起来像胶囊上的角标而不是按钮文字；控件本身 min-height 88rpx（:693）够点，问题只在字号取档。
- 建议改法：升 var(--fs-lg, 28rpx)（14px），与 album.vue:903 那颗「添加照片」按钮文案同档。
- 修复类别：CSS/token

### R14-L10-D30　P2 / 字号　批次 R14-B51
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`5e0639baaad638ac`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:668`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（小字 --fs-md/base = 13/12px 用于「标签·时间戳」；极小 10/11px 用于「角标·法务」）
- 现象：积分奖励值「+5 积分」「+50 积分」「+20 积分」「+100 积分」取 var(--fs-sm)=22rpx（11px）+ 600，与 :674 的任务说明行同字号。帧上这四枚数字是每行的激励值（用户据此决定先做哪条），却和它下面那句解释性小字同档、比左边的任务名小 4px；:669 还给它单独上了 --c-brand-800 深色想强调，字号把强调又抵消回去了。
- 建议改法：奖励值升 var(--fs-md, 26rpx)（13px，§1.3 小字档），说明行 :674 保持 --fs-sm 或一并升 13px，两档拉开。
- 修复类别：CSS/token

### R14-L10-D31　P3 / 间距　批次 R14-B51
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`5e0639baaad638ac`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:617`
- 理想图依据：无基准，依据=规范文档§1.4 区块间距 --section-gap = 24rpx = 12px
- 现象：同一列白卡的纵向间隙有两个值：:573 概览卡到第一张任务卡是 margin-bottom var(--sp-6)=24rpx，:617 任务卡彼此之间是 gap var(--sp-5)=20rpx。帧上「累计获得 0 积分」卡到「每日签到」卡的白缝，比「每日签到」到「完善个人资料」的白缝宽 2px——四张同族卡被排成「头一张松、后面紧」，而 §1.4 只登记了 24rpx 这一档区块间距。
- 建议改法：:617 改 var(--section-gap, 24rpx)（或 :573 一并取 --sp-5），同列单一间隙档。
- 修复类别：CSS/token

### R14-L10-D32　P3 / 位置　批次 R14-B51
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`5e0639baaad638ac`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:524`
- 理想图依据：无基准，依据=同域 album.vue:645-653 已定论的胶囊避让原式 `calc(var(--capsule-right, 7px) + 104px)`（R6-B55/D16 层级遮挡 P1 的落地口径）
- 现象：页头右侧给微信胶囊留的安全距写裸值 `padding-right: 180rpx`（90px），没走同域 album.vue:653 那套由 useMenuButtonRect 注入的 --capsule-right 实测式（本页 :513 也没绑 menuStyleVars，帧上标题组左贴、计数右缘停在 x≈265，与实测胶囊左缘 x≈285 只剩 20px）。90px 这个数是按当前中文胶囊宽手调的，切 en-US locale 或胶囊加宽时「0/4 已完成」会直接压进胶囊——album.vue:645-651 记的正是同一次踩坑。
- 建议改法：换 calc(var(--capsule-right, 7px) + 104px) 并在根节点绑 :style="menuStyleVars"，与 album.vue:653 同式。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/visitors（2 条）

### R14-L09-D06　P3 / 字号　批次 R14-B52
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`6adafc0d383dd491`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:421`
- 理想图依据：无基准，依据=§1.3 字体层级（页头标题档）；同分包 settings/index.vue:767、verification/index.vue:843、real-name.vue:680 页头标题均取 --fs-2xl(32rpx=16px)
- 现象：顶帧页头标题「谁看过我」取 --fs-5xl(22px)，比同分包其余三页页头标题（设置/恋爱认证/实名认证，均 --fs-2xl=16px）整整大一档，帧上「谁看过我」明显比「设置」粗大，同域多页页头取档不一。
- 建议改法：把 .visitors-header__title 的 font-size 由 --fs-5xl 降到 --fs-2xl，与同分包其余页头标题同档。
- 修复类别：CSS/token

### R14-L09-D07　P2 / 颜色token　批次 R14-B52
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`6adafc0d383dd491`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:370`
- 理想图依据：无基准，依据=§1.1 原则1（主题底色统一浅绿 #EEF7F2，页面间不得断层）；同分包 settings/index.vue:715 用单色 --c-bg-page(#EEF7F2)、verification/index.vue:790 与 real-name.vue:639 渐变起点亦为 --c-bg-page
- 现象：底帧（与顶帧同屏未滚动）页面底用 var(--c-gradient-page)，其真值为 linear-gradient(180deg,#DFF3EA,#EEF7F2)（design-variables.scss:181）——顶部起色 #DFF3EA 比全站统一浅绿 #EEF7F2 更绿一档，且与吸顶头部 .visitors-header 的实底 --c-bg-page(#EEF7F2)(:396) 在头部下缘形成一条绿深不一致的横向接缝，与其余三页浅绿底断层。
- 建议改法：把 .visitors-page 背景改为与兄弟页同口径的 var(--c-bg-page) 单色，或 linear-gradient(180deg,var(--c-bg-page),var(--c-brand-50))，起色回到 #EEF7F2。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/dnd（4 条）

### R14-L11-D01　P1 / 可达性　批次 R14-B53
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`70f8027a2c45304b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:416`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.4 卡片内边距/热区口径 + 本任务书 P1 判据「必点控件热区 <88rpx 且没有替代出口」
- 现象：「开始时间 / 结束时间」两行的可点盒只有右侧「22:00 ›」一块——帧上实测值墨迹 x=304..338、y=263..272（10px 字高），行盒高约 19px≈38rpx，只有 88rpx 地板的四成；左侧「开始时间」标签（实测墨迹 x=24..78）与整行其余 300px 都不响应点击（@change 只挂在 :411 的 picker 上，.time-row 无 @tap）。
- 建议改法：把 picker 提到 .time-row 外层（或给 .time-row__picker 补 min-height:88rpx + 左右铺满），让整行都是热区；本页无第二个改时段的出口。
- 修复类别：单页

### R14-L11-D02　P2 / 层级遮挡　批次 R14-B53
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`70f8027a2c45304b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:610`
- 理想图依据：无基准，依据=规范 §1.4 安全区/间距口径（页面底 --c-bg-page 与固定操作件须留 safe-area 净空）
- 现象：未滚动的 top 帧里保存键占 y=765..811，键底距屏底（814）仅 3px，iOS 横条实测压在键面上（y=799..806、x=133..245 取样为 (5,7,7) 纯黑，而左右同行为 (21,107,81) 绿底）；bottom 帧滚动后同一键底到 y=753、下方留 61px 净空，说明 .safe-bottom 的 env(safe-area-inset-bottom) 只挂在按钮之后的流内占位上，首屏不滚动时主操作键整块落进系统手势带。
- 建议改法：把 safe-area 净空做成 .content 的 padding-bottom（或给保存键包一层 sticky 底栏并自带 env 内边距），保证 scroll=0 时键面不被系统横条压住。
- 修复类别：CSS/token

### R14-L11-D03　P2 / 颜色token　批次 R14-B53
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`99d77f9478533eda`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:536`
- 理想图依据：无基准，依据=规范 §1.1 设计原则 1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ §1.2 页面底色 --c-bg-page
- 现象：页底渐变终点取 --c-tint-blue-50，实测 x=6 列自上而下 (237,247,243)=#EDF7F3 → (232,244,248) → (229,243,252)=#E5F3FC，下半屏蓝通道已高出绿通道 9，bottom 帧整页下半部肉眼偏冷蓝，脱离 §1.2 的 #EEF7F2 单一页面底档。
- 建议改法：终点改回 var(--c-bg-page)（或 --c-brand-50 #E8FAF3），本页不再引入蓝色氛围档。
- 修复类别：CSS/token

### R14-L11-D04　P2 / 颜色token　批次 R14-B53
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`99d77f9478533eda`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:887`
- 理想图依据：无基准，依据=规范 §1.2「主色浅 brand-100/50 浅底 · 标签底」+ §1.1 原则 3「一令牌一值」；组件规范同页 .filter-chip--active 的「浅底+描边」双通道口径
- 现象：星期芯片未选中底取 --c-bg-page，实测 (238,247,242)=#EEF7F2 压白卡 #FFFFFF 只有 1.09:1，且 :889 的 border 是 transparent ⇒ 芯片容器在帧上几乎不存在；选中底取 --c-bg-brand，实测 (232,251,242)=#E8FBF2 亮度 L≈0.925 反而比未选中的 0.911 更浅（方向反了），两态只差一圈 2rpx --c-brand 描边（对白 2.08:1，低于非文本 3:1）。
- 建议改法：未选中底降到 --c-bg-surface 或加 --c-border-default 描边，选中底换更深一档（如 --c-brand-100 #D1F5E7）并把描边抬到 --c-brand-800，使「选中比未选中更重」。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/index（2 条）

### R14-L09-D01　P2 / 可达性　批次 R14-B54
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`373c753d64ee0dc9`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:746`
- 理想图依据：无基准，依据=§1.4 全站最小热区口径（88rpx=44px）+ 组件规范（返回钮为 navigationStyle:custom 下本页唯一返回出口）
- 现象：顶帧页头返回键热区 .nav-bar__back 为 64rpx×64rpx（=32×32px），低于全站 88rpx 最小可点档约 12px，且该键是本页唯一返回入口。
- 建议改法：把 .nav-bar__back 的 width/height 由 64rpx 提到 88rpx（视觉圆底尺寸不动，仅撑热区），与同分包 other.vue .other-header__back 的 88rpx 档对齐。
- 修复类别：单页

### R14-L09-D02　P2 / 颜色token　批次 R14-B54
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`931ec1a44b99940b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:396`
- 理想图依据：无基准，依据=§1.1 原则3（一令牌一值/禁私有色）+ §1.2（--c-bg-page 是页面底色，非图标底）；同页其余分组图标底均用独立 tint（blue/pink/cream/lavender）
- 现象：底帧「关于」分组四行（用户协议/隐私政策/检查更新/关于我们）图标底取 var(--c-bg-page,#EEF7F2)——即页面底色，铺在白卡(--c-bg-container #FFFFFF)上仅差一档浅绿、几乎与卡片融为一体，读不出图标容器；同页其余分组用的是可辨识的 tint 底，取档不一致。
- 建议改法：把 aboutMenus 四项 bgColor 由 --c-bg-page 换成一枚既有浅 tint 令牌（如 --c-brand-50/--c-tint-blue-soft），与其余分组图标底同族但可辨。
- 修复类别：CSS/token

## subpackages/profile-extra/verification/index（1 条）

### R14-L09-D03　P2 / 尺寸比例　批次 R14-B55
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`75c18f7696fcb83a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:1057`
- 理想图依据：无基准，依据=§1.4 栅格节奏 + 组件规范（权益卡应成对铺满整行，不留孤格半行空白）
- 现象：顶帧「认证权益」用两列 flex 栅格放 3 张卡（专属标识/专属权益/互动资格），第三张「互动资格」按 flex:1 1 calc(50% - 8rpx) 独占半行、右侧留一整格空白，栅格不成对、底部出现半屏宽的空白洞。
- 建议改法：3 项时让末项跨满整行（.benefit-item:last-child:nth-child(odd){flex-basis:100%}），或权益数改 4 项成对，消除孤卡半行。
- 修复类别：单页

## subpackages/profile-extra/verification/real-name（2 条）

### R14-L09-D04　P2 / 间距　批次 R14-B56
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`4c310068aa6c95b6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:650`
- 理想图依据：无基准，依据=§1.4 页边距 --page-padding(32rpx=16px)；同分包 settings/index.vue:737、verification/index.vue:813 页头均已归口 --page-padding
- 现象：顶帧页头 .nav-bar 水平内边距裸写 24rpx(=12px)，而本页状态卡/信息卡/主按钮(:710/:776/:980)已全部归口 var(--page-padding)=32rpx(16px) ⇒ 返回键与标题所在竖轨比下方卡片左缘外突 4px，页头与卡缘不成一条竖边（R11-L09-D16 归口时漏改页头）。
- 建议改法：把 .nav-bar 的 padding 由 `0 24rpx` 改为 `0 var(--page-padding, 32rpx)`，与同页卡片及兄弟页页头同轨。
- 修复类别：CSS/token

### R14-L09-D05　P2 / 可达性　批次 R14-B56
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`23949fac9b31cca4`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:659`
- 理想图依据：无基准，依据=§1.4 全站最小热区 88rpx=44px；本页 navigationStyle:custom，返回键为唯一返回出口（bottom 帧与 top 帧同屏，页未滚动）
- 现象：底帧页头返回键 .nav-bar__back 热区 64rpx×64rpx(=32×32px)，低于 88rpx 最小可点档约 12px；本页 navigationStyle:custom 无系统返回栏，此为唯一返回出口。
- 建议改法：.nav-bar__back width/height 由 64rpx 提到 88rpx（圆底视觉不动，仅撑热区），与同分包 other.vue .other-header__back 88rpx 档一致。
- 修复类别：单页

## subpackages/setup/campus/index（3 条）

### R14-L12-D01　P2 / 颜色token　批次 R14-B57
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`88304dd6122b0b48`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:429`
- 理想图依据：无基准，依据=规范 §1.2「主色浅 brand-100/50 → 浅底·标签底·氛围」+ §1.1.3 一令牌一值（价值提示卡自陈要用 --c-bg-brand 做区分，campus/index.vue:14「空白填补」）
- 现象：价值提示卡（帧 y=602..670）内部 5 点实测均 #FFFFFF，整卡区域 0 像素落在 --c-bg-brand(#E8FBF2) 或 --c-brand-200(#A3EBCF) ±6 内 ⇒ 声明的浅绿底与绿描边都没落到画面，这张卡与上方表单白卡完全同色同边，"填补空白"只剩一行字、没有任何分区感（对照：同一条 --c-bg-brand 写在 SetupProgress 圆点内层时实测 #E8FBF2 正常命中，recommend-pref 帧）
- 建议改法：宿主 scoped 里覆写子组件根类 .card 的 background 会被 SectionCard.vue:38 同权吞掉——改由 SectionCard 提供 tone prop（或把底色写进卡内层 view），让 --c-bg-brand / --c-brand-200 真正参与盒绘制
- 修复类别：CSS/token

### R14-L12-D02　P2 / 字号　批次 R14-B57
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`88304dd6122b0b48`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:333`
- 理想图依据：无基准，依据=规范 §1.3「标题 18/20px = 区块标题档」+ 组件规范 SectionCard.vue:69 .card__title = var(--fs-3xl) 36rpx
- 现象：区块标题「学校资料」墨迹 y=336..349（14 行）、4 字宽 57px（≈14px 字身），而同为 SectionCard 标题的同域两页实测「推荐时间」16 行 / 4 字 68px、「反馈历史」17 行 / 4 字 68px（--fs-3xl 36rpx=18px）⇒ 本页自写 .card-header__title 取 --fs-2xl(32rpx/16px) 比同域低一档，且只比卡内字段文字（--fs-lg 28rpx=14px，实测「请选择城市」墨迹 406..418＝13 行）多 1 行，卡内标题与正文层级塌成近同档
- 建议改法：:333 改 font-size: var(--fs-3xl)（与 recommend-pref / feedback 同卡同档），或直接用 SectionCard 的 :title 承载，不再自写标题行字号
- 修复类别：CSS/token

### R14-L12-D03　P2 / 层级遮挡　批次 R14-B08
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`2466591619681c96`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:344`
- 理想图依据：无基准，依据=AppShell.vue:331-336 自陈「is-fixed 时头部吸顶（sticky 保留布局位、无遮挡补偿问题）」——本帧把这句证伪
- 现象：bottom 帧内容较 top 帧上移约 46px，吸顶页头（position:sticky + z-index:100 + background:var(--c-bg-page) 实底）把 SetupProgress 卡上缘约 31px（圆角 + 顶部内边距）整段盖住，并把「第 2/5 步」拦腰切掉上 5–6 行：top 帧该行墨迹 y=212..223（首行仅 7 个暗像素＝起笔渐变），bottom 帧只剩 y=171..177（首行即 27 个暗像素＝无起笔、被硬切），卡顶圆角在画面上消失
- 建议改法：吸顶头下沿不要直接用页色实底压滚动内容——补一层 8–12rpx 渐变 mask（或 1rpx --c-border-light 分隔 + 内容侧 scroll-padding-top 预留页头高度），使 SetupProgress 卡上缘与首行文字不被裁
- 修复类别：CSS/token

## subpackages/setup/interest/index（4 条）

### R14-L12-D11　P2 / 字号　批次 R14-B58
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`6c78b42b00e81add`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:212`
- 理想图依据：无基准，依据=规范 §1.3「页面主标题 26–28px / 700–800」+ 组件规范 AppShell.vue:405 .shell__title = var(--fs-7xl, 56rpx)（同流程 campus/schedule/feedback 三页页头均走此档）
- 现象：自建页头主标题「选择兴趣」墨迹 20 行高 / 4 字 81px（≈20px 字身，:212 硬写 font-size: 44rpx = 22px），同域 campus「校园认证」实测 27 行 / 4 字 108px（--fs-7xl 56rpx = 28px）⇒ 同为注册引导页头本页低 6px、落在 §1.3 的「卡片大标题 22px」档，页头与其下副标题（24rpx）只差 10px，层级压平；且 44rpx 是裸值不走 --fs-* 令牌（违 §1.1.3）
- 建议改法：:212 改 font-size: var(--fs-7xl, 56rpx)，或整页页头改由 AppShell 承载（与 campus/index.vue:219 同写法），顺带把返回键补成兄弟页同款的「‹ 返回」文字胶囊（本页帧上只有 64rpx 圆底箭头、无文字）
- 修复类别：CSS/token

### R14-L12-D12　P2 / 可达性　批次 R14-B15
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`6c78b42b00e81add`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:314`
- 理想图依据：无基准，依据=规范 §1.2 文本色阶（#9AA39F 是 placeholder 档，design-variables.scss:373 与 --c-text-quaternary 同值，只该承载输入框占位）+ §1.3「极小 10/11px 只用于角标·法务」
- 现象：已选区空态句「暂未选择任何标签」（实测 x=24..101 / y=242..252，8 字 78px＝--fs-xs 10px）最深字色 #9BA4A0，压 --c-bg-secondary(#D1F5E7) 底实算 2.21:1，低于 3:1 下限；同一绿底上一行「已选标签」实测 #545F5A＝5.67:1 ⇒ 空态提示在画面上几乎读不出，用户无法确认这栏是「还没选」还是「没渲染」
- 建议改法：:314 文字提到 var(--c-text-tertiary)（#6B7571 压同底 3.99:1）、字号提到 --fs-sm，或把已选区底色由 brand-100 降到 --c-bg-surface(#F3FAF6) 让现档重新达标
- 修复类别：CSS/token

### R14-L12-D13　P3 / 文案　批次 R14-B15
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`b7b9531fb842ad12`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:181`
- 理想图依据：无基准，依据=zh-CN.ts:3059 selectedTags「已选标签」与 :3060 selectedCount「已选 {n}/{max}」两串同屏拼接；规范 §1.1 逐页文案一致性
- 现象：已选区首行整句渲染成「已选标签 已选 0/5」（实测该行墨迹 x=25..107 连续一行，两段之间只隔 --sp-2=8rpx）——「已选」在同一行内重复两次，读起来像漏排的残字；同组件分组标题行（:220-222）用的是裸「0/5」写法，同组件内两种计数写法并存
- 建议改法：计数侧只留「0/5」（复用 :221 的裸计数写法），或把行标题改「标签」，二选一，别在同一行叠两个「已选」
- 修复类别：单页

### R14-L12-D14　P3 / 颜色token　批次 R14-B58
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`b7b9531fb842ad12`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:238`
- 理想图依据：规范 §1.1.1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层（2026-08-31 用户验收定论）」；同域 campus/index.vue:477-483 已按 R10-L12-D03 把同一条 R16 白底规则回退成 --c-bg-page
- 现象：本页仍保留 R16 的 page{background:var(--c-bg-container)}（#FFFFFF），但帧上整幅（含 y=500 空底区、y=795 吸底条下沿）实测均 #EEF7F2、无任何 #FFFFFF 页面底命中——该白底被 :155 .interest-page 的 --c-bg-page 全覆盖，画面上是零消费者的孤儿规则，且与 §1.1.1 及 campus 已定档相反（内容一旦超一屏即复现 campus 当年那条白→浅绿横向断层）
- 建议改法：按 campus/index.vue:481 同写法把 :238 改为 background: var(--c-bg-page, #EEF7F2)，或整条删除由 .interest-page 单源承担
- 修复类别：CSS/token

## subpackages/setup/profile/index（4 条）

### R14-L11-D18　P2 / 可达性　批次 R14-B59
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`f9034b2941965603`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1647`
- 理想图依据：无基准，依据=规范 §1.2 次文本 --c-text-secondary #4A524E / 三级 --c-text-tertiary #6B7571，--c-text-placeholder 只用于 placeholder；本任务书 P2「次级文字对比落在 3:1–4.5:1」，本条实测低于 3:1
- 现象：照片墙说明行「最多 6 张，点击空位添加」是本页唯一的功能指引，实测最暗墨像素 (153,162,158)=#99A29E，即 :1647 的 --c-text-placeholder #9AA39F，压白卡 #FFFFFF 只有 2.59:1（22rpx=11px，不享大字号豁免），比同屏上一行「照片墙」标题（实测 (25,30,27)）低了整整两档，弱光下几乎读不到。
- 建议改法：归 var(--c-text-tertiary)（对白 4.76:1），placeholder 档只留给输入框占位符。
- 修复类别：CSS/token

### R14-L11-D19　P2 / 可达性　批次 R14-B59
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`f9034b2941965603`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1691`
- 理想图依据：无基准，依据=规范 §1.2 边框档 + 非文本件边界 ≥3:1；同页 .field 在 R11-L12-D06 已因同型问题抬到 --c-border-default
- 现象：5 个空照片槽的边界只有 2rpx dashed --c-border-default #DDE3E0（对白卡 1.30:1）+ 底 --c-bg-surface #F3FAF6（对白 1.09:1），帧上槽位边缘实测 (239,242,241)（虚线被反锯齿摊到约 1.06:1），5 枚「点击空位添加」的可点目标在画面上基本等于一片空白，只有中间一枚 56rpx 深绿加号在表意。
- 建议改法：虚线抬到 --c-border-strong #C2CAC6（对白 2.1:1）或改 dashed --c-border-default + 底色降一档，让空槽边界达到非文本 3:1。
- 修复类别：CSS/token

### R14-L11-D20　P1 / 可达性　批次 R14-B59
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`492beffc944d4542`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1815`
- 理想图依据：无基准，依据=规范 §1.2「主色深 brand-600/700 #2AAE83/#1F8D6A 用于按压态 · 深色文字」+ 本任务书 P1「正文级文字对比 <4.5:1」
- 现象：选中身份项的主句「在校学生 / 毕业生」实测最暗墨像素 (38,144,111)，即 :1815 写死的 #1f8d6a（brand-700，未走令牌），压本项白底 #FFFFFF 只有 4.15:1，28rpx/600 不享大字号豁免 ⇒ 本页唯一决定后续认证链路的选择项标题低于正文 4.5:1 地板；同页 R13-L11-D09 已把更换头像徽标、R11-L10-D15 已把照片墙加号统一抬到 --c-brand-800 #156B51（6.45:1），只有这一处漏改。
- 建议改法：改 var(--c-brand-800, #156B51)，与同页 :1568 / :1712 两处已收口的深绿同一档。
- 修复类别：CSS/token

### R14-L11-D21　P2 / 颜色token　批次 R14-B59
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`492beffc944d4542`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1760`
- 理想图依据：无基准，依据=规范 §1.2 边框三档（light #EEF2F0 / default #DDE3E0 / strong #C2CAC6）；同页 .field 于 R11-L12-D06 已判定 --c-border-light 压在 --c-bg-surface 上「框线不存在」并抬档
- 现象：未选中身份项「非学生职场人士」的卡片底 :1759 取 --c-bg-surface（帧上实测 (243,250,246)=#F3FAF6），而 :1760 的描边取 --c-border-light #EEF2F0——同一条 2rpx 线压在比它更深的底上，实测边界 (239,242,241)，与非学生项内部几乎无差 ⇒ 未选项读起来是一块没有轮廓的浅底；同页上方三行输入框（.field，描边已归 :1337 的 --c-border-default）同型问题早已抬档，两档并存在同一屏。
- 建议改法：与 .field 同轨改 var(--c-border-default, #DDE3E0)，未选/已选两态都靠描边区分。
- 修复类别：CSS/token

## subpackages/setup/recommend-pref/index（3 条）

### R14-L12-D08　P2 / 颜色token　批次 R14-B60
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`b293f015e485e199`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:332`
- 理想图依据：无基准，依据=规范 §1.2「主色 --c-brand #36C99A：主按钮 · 选中态 · 链接 · 进度」+ tokens.ts:311 selected = { bg:#36C99A, text:#FFFFFF }
- 现象：选中项「12:00」「同校优先」实测底 #E8FBF2（--c-bg-brand）、描边 #1F8D6A（1px 环，边缘混合值 #93CCB8）、文字 #1F8D6A，未选中项底 #FFFFFF ⇒ 选中态没取 §1.2 的 --c-brand 档；且 brand-700 压 #E8FBF2 本次复算 3.84:1，低于 14px 选项文字的 4.5:1（同域 feedback/index.vue:661-662 已自证这组色值 3.85:1 不达标并把文字提到 --c-brand-800=6.00:1，本页没跟上）
- 建议改法：:332 文字改 var(--c-brand-800)（与 feedback 已定档同轨），或整档按 §1.2 改 --c-brand 实底白字（tokens.ts:311），setup/support 两域同一枚选中态令牌
- 修复类别：CSS/token

### R14-L12-D09　P3 / 间距　批次 R14-B60
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`b293f015e485e199`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:306`
- 理想图依据：无基准，依据=规范 §1.1.3「一令牌一值：页面只准引用 var(--c-*) / --sp-* / --r-* / --s-*」+ §1.4 间距表
- 现象：选项药丸组间距裸写 gap: 16rpx（帧实测药丸间 8px），而同为「选项药丸组」这一角色的另两处写 12rpx：feedback/index.vue:629（裸值）与 TagSelector.vue:347（var(--sp-3)，实测 6px）⇒ 同域三处同角色间距取到两个档，且两处绕开 --sp-* 令牌硬写
- 建议改法：裁定一档后三处同写令牌（统一 var(--sp-3)，或本页保留 var(--sp-4) 而另两处也改令牌），不留裸 rpx
- 修复类别：CSS/token

### R14-L12-D10　P2 / 位置　批次 R14-B60
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`c4a7dc2772b57c27`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:351`
- 理想图依据：无基准，依据=组件规范同域「开关行」惯例（可见标签与开关同排：左文右控；本页 R6-B68/D11 只删了可见标签、未补回同排元素，recommend-pref/index.vue:234-239 注释自陈）
- 现象：「校园优先」卡末行 justify-content:flex-end，帧上开关轨道实测 x≈296..340 / y=664..687（#1F8D6A）单独贴在卡右缘，其左 x=40..296 共 256px 全空，卡内没有任何一行文字与该开关同排配对 ⇒ 开关成孤儿控件，只能靠上方两行标题反推它管什么；本帧与 top 帧逐点抽样比对（7.7 万采样点）仅状态栏时钟处 37 点不同，内容区像素级同位 ⇒ 该空列是常驻版式而非滚动中间态
- 建议改法：改 space-between 并恢复行内可见标签（或把开关上移到副标题同排右对齐），消掉 256px 空列
- 修复类别：单页

## subpackages/setup/schedule/index（4 条）

### R14-L12-D04　P2 / 空态文案　批次 R14-B61
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`aab0ad58eb0c6111`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:136`
- 理想图依据：无基准，依据=同流程 campus 同类输入位有灰占位（campus 帧「请选择城市」墨迹命中，campus/index.vue:251）+ 规范 §1.2 占位档 --c-text-placeholder
- 现象：「常去区域」输入框（帧 y=256..295，实测底 #F3FAF6、高 88rpx）内部墨迹像素 = 0（x=60/189/300 三列逐行扫描无任何暗像素）——:placeholder="''" 把占位写死为空串，画面上是一整块空洞；同页第二个输入框有「常用空闲时段，例如今晚或本周三下午」灰占位，两个同档输入框一有一无，第一框读起来像没渲染完的骨架块
- 建议改法：补一句与字段名不重复的示例占位（如「教学楼 / 图书馆附近」，需新增 i18n 键）或在框内渲染「未填写」次级提示，别把 88rpx 输入位留成零墨
- 修复类别：单页

### R14-L12-D05　P2 / 需新建　批次 R14-B61
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`aab0ad58eb0c6111`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:113`
- 理想图依据：无基准，依据=同流程 campus/index.vue:221 与 recommend-pref/index.vue:181 均渲染 SetupProgress，且该组件步骤表把「时间安排」列为第 3 步（campus top 帧步骤标签实测第 3 枚＝「时间安排」）
- 现象：本页 AppShell 之后直接进 .card-stack，整帧 y=140..728 无任何进度条像素——前后两步都有「第 N/5 步」卡（campus top 帧 y=185..271、recommend-pref 帧 y=186..262），唯独第 3 步没有 ⇒ 用户在流程中段看不到自己走到哪、还剩几步（SetupProgress 组件已存在，非新建件，只是本页没接）
- 建议改法：在 :113 的 AppShell 首槽补 <SetupProgress :current-step="3" variant="student" />，与 campus(:221) 同写法
- 修复类别：单页

### R14-L12-D06　P2 / 位置　批次 R14-B61
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`aab0ad58eb0c6111`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:221`
- 理想图依据：无基准，依据=campus 同区段已按「空白填补」定档放价值提示卡（campus/index.vue:14 文件头自陈 + :297 实装，帧 y=602..670）
- 现象：末卡下沿 y=511 到吸底条上沿 y=728 之间 206px（视口 25%）为纯 #EEF7F2 空底；.cta-spacer 只声明 152rpx(76px) 让位，其余约 130px 无人消费，且本页 top/bottom 两帧 sha16 逐字相同（均为 aab0ad58eb0c6111）＝该空底在两态下像素级一致，是常驻版式而非滚动中间态 ⇒ 同流程两步的下半屏节奏不一，本页像缺一个模块
- 建议改法：按 campus 同档在 .card-stack 之后补一张提示卡（或给两卡内容列设 min-height 撑满），把 206px 空底压到一档卡距以内
- 修复类别：单页

### R14-L12-D07　P2 / 可达性　批次 R14-B61
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`aab0ad58eb0c6111`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:201`
- 理想图依据：无基准，依据=campus/index.vue:309-314 已按 R11-L12-D09 撤掉 :disabled 并写明「置灰仍可点、给定位提示」口径；规范 §1.2 禁用档 --c-status-disabled
- 现象：吸底「保存并继续」实测底 #DCE5E2 / 文字 #4A524E（禁用档），:disabled="!canSave || saving" 使 BottomActionBar.vue:64 的 @tap 守卫永久吞掉点击；本页正文没有任何「还差什么才能保存」的可见说明（副标题只说「这里会影响首页推荐和可聊时段」）⇒ 用户点灰钮零反馈、零定位，同一根因在 campus 已按卡修掉、本页仍是修前写法
- 建议改法：与 campus 同口径去掉 :disabled（防重复提交交给 save() 内 saving 守卫），缺项时给 toast + 高亮目标字段；若坚持禁用态则在按钮上方常驻一行可达条件文案
- 修复类别：单页

## subpackages/support/feedback/index（3 条）

### R14-L12-D15　P2 / 颜色token　批次 R14-B62
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`217820fff172f0b6`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:649`
- 理想图依据：无基准，依据=规范 §1.2「主色 --c-brand：选中态」+ 同域同角色对照 recommend-pref/index.vue:324/330（未选白底、已选浅绿底）；上一轮批次 R13-B54（销 R13-L12-D10，轴 颜色token/间距）
- 现象：上一轮把选中 chip 改成「浅底深字 + 描边」，但 .chip:649 与 .chip--active:665 的底是同一枚 --c-bg-brand——帧上三枚药丸内部实测均 #E8FBF2（x=40 处 241..267 连续 27 行同值），选中态只剩 1px 描边环 + 文字 #1F8D6A→#156B51 一档之差；而未选项本身已是浅绿底绿字，看起来比选中项更"像被选中"，与反档取色的 recommend-pref 同屏对比时读不出当前分类 ⇒ 这条轴上一轮修得不彻底
- 建议改法：未选底按 recommend-pref:324 回 var(--c-bg-container) 白 + --c-border-default 描边，选中才用 --c-bg-brand + 描边，让两态有底差而不只靠 1px 环
- 修复类别：CSS/token

### R14-L12-D16　P2 / 可达性　批次 R14-B62
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`217820fff172f0b6`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:650`
- 理想图依据：无基准，依据=feedback/index.vue:661-662 注释自证「brand-700 压 #E8FBF2 实算 3.85:1 不达 4.5:1」——该判据只用在选中项，未选中项未同治；规范 §1.2 文本色阶
- 现象：上一轮只把选中 chip 文字提到 --c-brand-800，未选中两枚仍走 .chip 的 color: var(--c-brand-700)——帧上实测「活动提案」最深字色 #1D8D69 压 #E8FBF2 = 3.85:1、「建议」#2F9775 = 3.36:1（14px 文字，低于正文级 4.5:1），而选中项 #13694F = 6.17:1 ⇒ 同一行里可读性反而向"未选中"倾斜，最需要看清的两个分类最不可读
- 建议改法：:650 未选文字同提到 var(--c-brand-800)（6.00:1），或按 D15 把未选底改白后保留 brand-700（#1F8D6A 压白 4.56:1 达标）
- 修复类别：CSS/token

### R14-L12-D17　P2 / 位置　批次 R14-B62
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`8df944d5499b720f`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:577`
- 理想图依据：无基准，依据=组件规范「区块标题 + 右侧入口同排」（SectionHeader 语义），同页非空态分支 feedback/index.vue:576 正是 hint 与按钮同排写法
- 现象：空态下 .history-header__hint 被 v-if 摘掉、换成 .history-header__spacer 占位，「历史记录」入口药丸（实测 x≈281..355 / y=470..512，底 #E8FBF2）于是单独落在卡标题「反馈历史」（y=444..460）下方一行，左侧 x=40..281 共 241px 全空，其下再空 60px 才到空态图标（y=572..624）⇒ 入口与标题不成组，读起来像卡在中间的第二块内容，且整卡高度被 spacer 撑出一段无内容区
- 建议改法：把入口按钮上移到与卡标题同排（SectionCard 标题右侧槽 / SectionHeader 的 action 槽），空态时不再插 .history-header__spacer 行
- 修复类别：单页

## subpackages/tools/activities/detail（3 条）

### R14-L08-D03　P1 / 位置　批次 R14-B63
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`73eacd9c60c5b230`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:870`
- 理想图依据：无基准，依据=组件规范 §1.5 结构组 BottomActionBar（底部固定操作栏）+ 本页自证 detail.vue:828「底部留白（避免遮挡报名按钮）」的前提就是该栏固定悬浮
- 现象：.detail-action-bar 没有 position:fixed，而 .detail-page:556 只给 min-height:100% ⇒ .detail-scroll:630 的 `flex:1; height:0` 拿不到确定高度、退化成整页滚动，操作栏跟着内容走。top 帧实测白色栏顶缘 y=799、报名钮绿面只露 y=806..813 共 8px（钮高 44px 的 18%）⇒ 首屏看不到也点不到唯一转化动作「立即报名」，用户拿不到报名入口。
- 建议改法：.detail-page 改 height:100vh（让 scroll-view 内部滚），或给 .detail-action-bar 补 position:fixed; bottom:0 + env(safe-area-inset-bottom) 并把 .detail-footer-space 保留为避让位。
- 修复类别：单页

### R14-L08-D04　P1 / 位置　批次 R14-B63
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`3bad876d4a3a38f9`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:561`
- 理想图依据：无基准，依据=本文件自证 detail.vue:575-577「本页 navigationStyle=custom，页内没有第二个返回出口」+ §1.6 mp 渲染铁律（自定义导航需自带避让）
- 现象：同一根因的另一面：top 帧绿栏占 y=0..101（含 :580-583 的 88rpx 返回钮），bottom 帧页面滚走 77px 后栏只剩 y=0..24 一条，返回钮整枚离屏；此时页内唯一返回出口消失，微信胶囊只给「更多/关闭」（关闭＝退出小程序），用户读完介绍想回活动列表要先把页面滚回顶。
- 建议改法：.detail-header 加 position:sticky; top:0; z-index:10（或随 D03 的 100vh 方案移出滚动链），栏底渐变色不变。
- 修复类别：单页

### R14-L08-D05　P3 / 颜色token　批次 R14-B63
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`3bad876d4a3a38f9`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:824`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（--c-text-secondary #4A524E / --c-bg-surface #F3FAF6 / --c-border-light #EEF2F0 / --c-bg-page #EEF7F2）+ §1.1.3「一令牌一值，禁止私有色值」
- 现象：R11-L08-D16 只清了同文件 :788/:827 三处假兜底，本行仍是 `var(--c-text-secondary, #5b6470)`（slate 残留，真值 #4A524E，theme/design-variables.scss:122）；同族漏网 :886/:932 `#F1F5F9`（--c-bg-surface 真值 #F3FAF6）、:900 `#475569`、:866 `#1d9e63`、:778 `#eef0f4`、:557 `#f4f6fa`。bottom 帧上令牌全部命中（卡底实测 #FFFFFF、页底 #EEF7F2、钮面 #136A4F），兜底不显形 ⇒ 无消费者的一致性债。
- 建议改法：六处兜底字面量一次改回 design-variables.scss 真值（或直接去掉兜底，只留 var(--c-*)），与 R11-L08-D16 已清的三处同口径。
- 修复类别：CSS/token

## subpackages/tools/daily-question/index（4 条）

### R14-L07-D01　P2 / 位置　批次 R14-B64
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`8c8206c1e2f311b2`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:535`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx=16px」+ 同帧自身对照（锁定卡白卡左缘 x=17、右缘 x=360，实测）
- 现象：卡下方那枚「返回」条横向铺满整屏（实测白底 x=2..376，宽 374px，两侧各只剩 2px），而同屏上方的锁定卡是 x=17..360（宽 343px）⇒ 同一列内容出现两根左缘线，且胶囊两端已贴屏幕边、圆角被视口裁掉。
- 建议改法：给 .lock-back 补与 .lock-card 同一档水平内衬（margin 横向改 var(--sp-8) 或交给 AppShell 内容容器统一 gutter），使两枚表面左右缘对齐到 x=17/x=360。
- 修复类别：单页

### R14-L07-D02　P3 / 文案　批次 R14-B64
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`8c8206c1e2f311b2`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:140`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单（结构组 BottomActionBar/AppShell 导航只出一枚返回控件）+ 同域 love-center/help/security/search 四页实测均只有导航栏一枚
- 现象：同一屏出现两枚字面完全相同的「返回」控件——导航栏左上角纯文本「返回」（实测墨迹 x=17..38 / y=63..73，12px 文本，无图标无底）与卡下方胶囊按钮「返回」（白底 y=679..719），两者都走 goBack，读起来像两个不同功能。
- 建议改法：卡下出口改语义化文案（复用既有键，如「返回工具集」/「先返回」），或按 R6-L08-D17 的三选一出口把该位换成今日题目占位，避免与导航栏同名。
- 修复类别：单页

### R14-L07-D03　P2 / 颜色token　批次 R14-B64
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`f49edf8b726fa310`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:479`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（中性档只有 #1A1E1C/#4A524E/#6B7571/#9AA39F 与边框 #EEF2F0/#DDE3E0/#C2CAC6，全表无任何蓝灰档）+ §1.1 第 3 条「一令牌一值」
- 现象：锁定卡 80rpx 锁图标（实测墨迹 x=172..206 / y=301..338）被 `opacity: .6` 压在纯白卡上，帧上合成色实测 #BBC7D5（反推素材本色 ≈#8E9EB2），是一枚蓝灰；§1.2 全站中性色阶全是绿灰系，页内没有任何一处蓝灰档可以对应它。
- 建议改法：去掉 opacity 改直接引最弱一档令牌色（--c-text-placeholder #9AA39F 或 --c-border-strong #C2CAC6 档），由素材侧出绿灰描边变体，不在宿主页用透明度造第三档中性色。
- 修复类别：CSS/token

### R14-L07-D04　P3 / 间距　批次 R14-B64
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`f49edf8b726fa310`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:461`
- 理想图依据：无基准，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx=16px」+ 同域 love-center/help/security 卡片实吃 SectionCard --sp-8(32rpx)
- 现象：锁定卡纵向内衬写裸值 `60rpx`（=30px），既不在 --sp-1~sp-10 的任何一档上（20/24/32/48rpx 皆无 60），也不等于卡片语义档 --card-padding(32rpx)；帧上表现为卡内首元素（锁图标顶 y=301）距卡顶 y≈94 有 207px 留白，其中只有 30px 由 padding 提供、其余是 justify-content:center 的余量。
- 建议改法：纵向内衬改引 var(--card-padding)（或 --sp-9=48rpx 档），把「撑高」交回 min-height 一处承担，避免同屏两套卡片内衬档。
- 修复类别：单页

## subpackages/tools/heart-signals/index（2 条）

### R14-L08-D01　P2 / 间距　批次 R14-B04
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`4e2b743c929d6be9`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:519`
- 理想图依据：无基准，依据=规范文档 §1.4 间距阶梯（--sp-1~sp-10，顶档 48rpx）+ 组件规范（锁定层由 src/components/common/LockScreen.vue 承载，§3 未覆盖本页）
- 现象：body 用 `justify-content: space-between` 分配视口余量，帧上实测留下两条不落在 sp 阶梯上的无主空带——插画块底缘 y≈241 → 主标题墨迹起 y=353 = 112px（222rpx）；权益清单第 3 行墨迹止 y=507 → 主按钮顶缘 y=601 = 94px（187rpx）；两值都随屏高浮动，声明的 --sp-8/--sp-6 被余量吃掉。
- 建议改法：space-between 改回定值（插画 margin-bottom --sp-8、.lock-screen__action margin-top --sp-9），视口余量集中交给 .lock-screen__footer 一处吸收。
- 修复类别：CSS/token

### R14-L08-D02　P2 / 需新建　批次 R14-B04
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`5a90c1a53e0068ef`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:293`
- 理想图依据：无基准，依据=规范文档 §3.8（我的页「资料完整度＝细进度条 + 百分比 + 说明 + 去完善」）+ §1.5 组件库在册进度件 XunmiProgressRing / XunmiStepProgress
- 现象：bottom 帧与 top 帧逐像素同构（锁定层是 position:fixed 满屏模态，页不滚），完成度只有「当前完整度 30%」一行 12px 文字（实测墨迹 y=469..480），整屏没有任何可视进度条/进度环，用户看不出 30% 离解锁还差多少、也看不出解锁线在哪。
- 建议改法：在 .lock-screen__progress 下方挂一条 4rpx 细进度条（--c-brand-100 槽 + --c-brand 填充，宽度按 completionPercent），或复用 XunmiProgressRing；同域我的页已用条状档，勿再引圆形。
- 修复类别：单页

## subpackages/tools/help/index（5 条）

### R14-L07-D09　P2 / 颜色token　批次 R14-B65
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`9267b42bce2b1d5e`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:188`
- 理想图依据：无基准，依据=规范文档§1.2（卡片 --c-bg-container #FFFFFF / 输入底 --c-bg-surface #F3FAF6 两档语义分工）+ §1.4 卡片阴影档；同域 search/index.vue:603-608 已按「同色压同色⇒边界 0 像素」定过判据
- 现象：6 条 FAQ 条目底色 --c-neutral-0（design-variables.scss:89 真值 #FFFFFF）压在 SectionCard 容器 --c-bg-container（同样 #FFFFFF，SectionCard.vue:38）上，条目间 gap 只有 2rpx(1px) ⇒ 帧上 y=248..476 六行之间零像素分隔：没有分隔线、没有色差、没有阴影，6 个独立可点条目读成一整段连续文字（实测全行扫描 y=200..500 无任何横向分隔带）。
- 建议改法：条目底改一档浅底 var(--c-bg-surface, #F3FAF6) 或给 .help-faq__item 之间加 --c-border-light 分隔线，使「一行一个可点条目」在帧上读得出来。
- 修复类别：CSS/token

### R14-L07-D10　P3 / 字号　批次 R14-B65
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`9267b42bce2b1d5e`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:215`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（令牌名以 --fs-* 为准）+ 本页 :204-207 在册裁定「改用标准令牌名 --fs-*，不再走 --f-* 短名族」
- 现象：同一次字号归位只落到 :208（FAQ 问句 --fs-xl），折叠箭头仍吃短名族 var(--f-lg)（tokens.scss:147 只是 --fs-lg 的别名），:231 答案 --f-sm、:290 联系行箭头 --f-lg、:320 页脚 --f-xs 同病 ⇒ 同页两套字号命名并存，帧上箭头墨高实测 14px 与相邻 15px 问句差一档，读成「比正文小一号的杂色符号」。
- 建议改法：四处 --f-* 一并换成 --fs-* 标准名（值不变），与 :208/:277/:285 同页已改的三处收口成一套。
- 修复类别：单页

### R14-L07-D11　P1 / 文案　批次 R14-B65
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`a6825bb2dc75aef9`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:166`
- 理想图依据：无基准，依据=规范文档§1.5 组件规范（列表行 label=名称 / desc=该行的可读内容）+ 本页自述 :7「客服联系方式（复制邮箱）」——行标题承诺「客服邮箱」，画面必须给出邮箱
- 现象：「客服邮箱」行整行只有标题 + 服务时间（帧上 y=647..659 标题「客服邮箱」、y=668..680 副行「服务时间：9:00-21:00」），**邮箱地址一个字符都没出现**：副行绑的是 help.serviceHours，地址只存在于 :79 的 APP_CONFIG.SUPPORT_EMAIL 里被静默写进剪贴板（全 locales 无地址字面量，见 :75-77 在册说明）。用户拿不到：既看不到、也无法核对自己复制到的到底是什么；一旦剪贴板被系统拦截、或需要在另一台设备上手动输入，本页没有任何出口。
- 建议改法：副行改渲染地址本身（或标题下新增一行明文地址 + selectable/user-select），服务时间挪到第三档，「复制」按钮保留为快捷出口。
- 修复类别：单页

### R14-L07-D12　P2 / 可达性　批次 R14-B65
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`a6825bb2dc75aef9`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:305`
- 理想图依据：无基准，依据=仓内自陈触控下限 AppShell.vue:334「min-height: 88rpx(44px)」（本页 :295 注释与 search/security 同页控件均按该下限收口）
- 现象：「复制」胶囊实测 39×21px（78×42rpx，帧上 x=303..341 / y=653..673），两个方向都低于 88rpx 触控下限，只有下限的 48%；字号 --fs-sm 22rpx(11px) + 上下各 4px 内衬，是全页最小的一枚可点控件。
- 建议改法：给 .help-contact__copy 补 min-height: 88rpx + min-width: 88rpx（box-sizing:border-box，视觉仍保持胶囊），与同页 :242 行级热区（实测 64px）双保险。
- 修复类别：单页

### R14-L07-D13　P2 / 字号　批次 R14-B65
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`a6825bb2dc75aef9`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:320`
- 理想图依据：无基准，依据=规范文档§1.3（10/11px 极小档只授给「角标 · 法务」，说明档是 --fs-lg/xl 14/15px）+ §1.2 三级文本档
- 现象：页脚是一整句说明文案「若问题仍未解决，欢迎通过在线客服或意见反馈联系我们，我们会尽快回复。」，字号却是 --f-xs（→ --fs-xs 20rpx = 10px）：帧上实测首行墨迹 y=742..751（墨高 10px、x=31..348）、行距 17px，折行后末行只剩「你。」两字（y=759..767 / x=181..191）；颜色 --c-text-tertiary #6B7571 压在页面底 #EEF7F2 上实测 4.36:1，落在 3:1–4.5:1 次级带不达正文线。同页 :285 的三条说明行已由 R11-L07-D24 按同一判据升到 --fs-lg(14px)，页脚这一处漏改。
- 建议改法：升到 var(--fs-lg)（14px）说明档，与 :285 同档；若坚持留法务档则把色档提到 --c-text-secondary 以补回 4.5:1。
- 修复类别：单页

## subpackages/tools/love-center/consulting（3 条）

### R14-L08-D13　P3 / 颜色token　批次 R14-B66
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`2e30c64994d9edeb`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:225`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级（--fs-sm 真值 11px / --fs-xl 真值 15px）+ §1.1.3「一令牌一值」
- 现象：R11-L09-D05 把本文件的**颜色**兜底全改回 §1.2 真值，但**字号**兜底仍是假的：本行 `var(--fs-sm, 26rpx)` 真值 22rpx（theme/design-variables.scss:561，差 4rpx≈2px）、:218 `var(--fs-xl, 34rpx)` 真值 30rpx（:565）。top 帧实测封存卡说明行墨迹带高 11px（y=283..293）、主标 13px（y=259..271）⇒ 走的是令牌真值，假兜底无消费者，但同域两页同令牌一旦失效就翻成两种字号。
- 建议改法：两处兜底改成令牌真值 22rpx / 30rpx，与 R11-L09-D05 的颜色收口同批补齐。
- 修复类别：CSS/token

### R14-L08-D14　P2 / 间距　批次 R14-B66
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`2e30c64994d9edeb`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:145`
- 理想图依据：无基准，依据=规范文档 §1.4 间距/区块间距（--section-gap 24rpx）+ 同 lane 先例 activities/detail.vue:638-652（R10-L08-D11 判「不留整块空底」）
- 现象：bottom 帧与 top 帧字节相同（52691B / 同一 sha16，页不滚），最后一行内容「咨询/课程内容筹备中，敬请期待」墨迹止于 y=456，视口高 814 ⇒ 下方 358px（≈712rpx，占屏 44%）是整块无归属的 #EEF7F2 空底，不落在 §1.4 任何 sp 档上；「精选课程，助你提升恋爱能力」这个区块标题承诺有内容，落位后只留一行弱态文字 + 半屏空白。
- 建议改法：该区块改用 §1.5 在册的 EmptyState/StatusState（插画 + 主副文案 + 出口），或按 R10-L08-D11 口径把封存卡纵向铺满（.content-section 补 min-height 与居中），消掉整块死白。
- 修复类别：单页

### R14-L08-D15　P3 / 字号　批次 R14-B66
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`2e30c64994d9edeb`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:198`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue:133-143（icon+主标+说明+动作钮四件套，即本卡结构）+ §1.3 字体层级
- 现象：封存卡是 EmptyState 同一结构的手写复刻，但同角色动作钮标签取 --fs-lg（14px），而组件标准 .empty-action__text 是 --fs-base（12px，EmptyState.vue:242）；bottom 帧实测该「帮助与客服」标签墨迹带高 13px（y=324..336）⇒ 同域两档，全站次级出口钮字号不统一。
- 建议改法：与 EmptyState 对齐取 --fs-base，或直接把 .consult-sealed 换成 <EmptyState :icon :title :description action-text> 复用同一把尺。
- 修复类别：CSS/token

## subpackages/tools/love-center/index（4 条）

### R14-L07-D05　P2 / 文案　批次 R14-B67
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`948a9c3f891c5aa7`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:145`
- 理想图依据：无基准，依据=规范文档§1.5 组件规范 SectionHeader/SectionCard（区块标题用于概括其下多条内容）+ 本页 R7-L07-D05 在册裁定（:116-119 已因同一「逐字重复」判据改掉页头那一份）
- 现象：区块标题与它下面 2×2 宫格的第一张卡标题是同一个 i18n 键 `home.loveConsulting`，帧上 y=264..280（区块标题「恋爱咨询」）与 y=336..349（卡标题「恋爱咨询」）两处逐字重复，读成「标题套标题」，且区块实际含 4 个板块（含社交咨询/两门课程），用其中一项的名字概括整块。
- 建议改法：区块标题换成概括四板块的既有键（如 contentPages.entries.consultingSection 一类），或按 R7-L07-D05 同款做法把区块标题与卡标题错开命名。
- 修复类别：单页

### R14-L07-D06　P2 / 颜色token　批次 R14-B67
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`948a9c3f891c5aa7`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:28`
- 理想图依据：无基准，依据=规范文档§1.2 配色表（心动粉 --c-romance-500 #FF6B81 用途=喜欢·匹配·品牌点缀，禁用于表单状态）+ §1.1 第 2 条「绿=行动、粉=喜欢，两色禁止混用」
- 现象：同一张 2×2 宫格里四枚 56rpx 图标色档/风格不一：恋爱咨询是实心 #FF6B81 红心（帧上实测填充 (255,107,129)，与 --c-romance-500 逐字对上），其余三枚（社交咨询/恋爱课程/社交课程）是蓝灰线性描边（实测 ≈#A3B0C2 / #9EA1A5）⇒ 一格之内「实心彩色 + 线性灰」两档并存，且粉色被用在「咨询服务入口」这一非喜欢语义位上。
- 建议改法：本页 :28 的 icon 改绑同族线性图标（与 :30/:31 的 chat/grad-cap 同描边档），粉色只保留给喜欢/匹配动作；素材侧若缺 heart-outline 变体另记 F1 车道。
- 修复类别：单页

### R14-L07-D07　P3 / 颜色token　批次 R14-B67
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`fedd3946e6d227a0`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:203`
- 理想图依据：无基准，依据=规范文档§1.1 第 1 条「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ 第 3 条「禁止私有色值」
- 现象：页面根容器底色写成 `var(--c-bg-page, #f4f6fa)` —— 兜底字面量 #f4f6fa 是蓝灰，与令牌真值 --c-bg-page #EEF7F2（绿灰）不同族；同页 :221/:294/:334/:371 的 --c-text-primary 兜底 #1f2937、:301 的 --c-text-secondary 兜底 #6b7280、:339/:376 的 --c-text-tertiary 兜底 #9ca3af 全是 Tailwind 蓝灰系过期兜底（真值分别为 #1A1E1C/#4A524E/#6B7571）⇒ 令牌一旦不注入，整页从浅绿体系翻成蓝灰体系。
- 建议改法：逐处把行内兜底换成与 design-variables.scss 真值同字面量（或直接去掉兜底只留 var()），与同域 search 页 R6-L09-D17 已批的「兜底债归位」口径一致。
- 修复类别：CSS/token

### R14-L07-D08　P2 / 素材缺失　批次 R14-B67
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`fedd3946e6d227a0`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:159`
- 理想图依据：无基准，依据=规范文档§1.5 组件库清单（结构/基础组件统一以箭头指示可跳转型列表项）+ 同帧自身对照（.love-center__quick :138、.love-center__test :183 两行均出「›」）
- 现象：恋爱咨询 / 社交咨询 两张卡是可跳转入口（:86-88 navigateTo ROUTES.HELP），但卡内只有图标+标题+说明，没有任何入口指示；同页另两类入口行（附近的人 y=222..233、MBTI y=589..600）右端都有「›」⇒ 同一页三套列表控件里，恰恰是最主要的两张卡读成「纯展示块」，帧上看不出可点。
- 建议改法：给 .love-center__board 补与 :138/:183 同档同色的「›」指示节点（封存两卡按 .love-center__board--sealed 一并置灰），使同页可点性表达一致。
- 修复类别：单页

## subpackages/tools/love-center/mbti（3 条）

### R14-L08-D10　P2 / 可达性　批次 R14-B68
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`7b48f3bf403f18c9`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:435`
- 理想图依据：无基准，依据=规范文档 §1.2（brand-700 #1F8D6A 用途为「按压态·深色文字」，非正文档）+ 同域先例 activities/detail.vue:729-734（R10-L08-D10 同缺陷已升 brand-800）
- 现象：16 枚类型卡的代码行（ENFP…ISTJ，网格唯一强标识）取 --c-brand-700 压白卡面，top 帧实测墨迹 #1C8B69（y=195..212），--fs-base 12.1px/700 不享大字号豁免 ⇒ 对比 4.14:1 < 4.5:1；同页 :401 的维度代码（E/I、S/N…）压 --c-bg-brand #E8F8F0 更低到 3.77:1（实测墨迹 #1B8B67，y=168..192）。
- 建议改法：两处 color 由 --c-brand-700 升 --c-brand-800（#156B51，压白 6.45:1），与 activities/detail.vue:734 同口径。
- 修复类别：CSS/token

### R14-L08-D11　P2 / 字号　批次 R14-B68
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`7b48f3bf403f18c9`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:375`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级（说明档 --fs-lg/xl = 14/15px；--fs-base 12px 只给「标签·时间戳」）
- 现象：区块说明行「了解四种性格维度，认识自己和他人。」取 --fs-base（24rpx=12.1px），top 帧实测墨迹带高 10px（y=143..152），比上方区块标题（--fs-3xl 18px，实测 y=116..132）低两档、落进标签档；同域 consulting.vue:163 的同角色说明行取 --fs-lg（14px），两页差 2px。
- 建议改法：.content-section__desc 由 --fs-base 升 --fs-lg（28rpx=14px），行高 1.6 不动。
- 修复类别：CSS/token

### R14-L08-D12　P3 / 颜色token　批次 R14-B68
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`cf20b6e3cefa816c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:301`
- 理想图依据：无基准，依据=规范文档 §1.1.3「一令牌一值，禁止私有色值」+ §1.2 色板（brand-400 真值 #55D5A7）
- 现象：页头渐变第二档写 `var(--c-brand-400, #6fe0b0)`，而 --c-brand-400 真值是 #55D5A7（theme/design-variables.scss:14）；同域 activities/detail.vue:571 同一令牌、同一条 135deg 渐变，兜底写的是真值 #55D5A7。bottom 帧页头仍命中令牌（实测栏底 #3FCD9E→#55D5A7 段），兜底不显形 ⇒ 属同域两页同令牌两档的一致性债（令牌失效时两页会翻成两种绿）。
- 建议改法：兜底字面量改成 #55D5A7，与 activities/detail.vue:571 逐字对齐。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（4 条）

### R14-L08-D06　P2 / 层级遮挡　批次 R14-B05
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`d2326615440e80bf`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1612`
- 理想图依据：无基准，依据=规范文档 §3.3（寻觅卡「底部 40% 渐变蒙层」是全站唯一在册卡片遮罩档）+ §1.1.5「除头像/人物照片外其余视觉元素 100% 还原」
- 现象：蒙面卡在 :1612 一层 rgba(15,23,42,.7) 之上又叠了 :1618 同色 ::after（自注有效不透明度 0.91），再乘 :1601 的 brightness(.72)。帧上卡片实占 x=10..368 / y=107..596，平均亮度实测 27/255（10.6%），人像细节全部消失、只剩轮廓，卡面读作一块黑底占位——blur 的「隐身份细节但仍看得出是人」语义被双层遮罩做没了。
- 建议改法：删掉 .card__mask-scrim::after 这层重复令牌（单层 0.7 + blur 已够），或按 §3.3 收成底部 40% 渐变、上半保留可辨人像。
- 修复类别：CSS/token

### R14-L08-D07　P2 / 可达性　批次 R14-B69
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`d2326615440e80bf`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:343`
- 理想图依据：无基准，依据=规范文档 §1.2（--c-text-tertiary #6B7571 为弱说明档）+ 组件规范同仓先例 LockScreen.vue:827-839（R8-L08-D05 同角色文字已升档）
- 现象：尾部交互说明「点击卡片查看主页后可发起聊天」取 --c-text-tertiary，压实测页底 #EEF7F2 只有 4.36:1（帧上墨迹最暗实测 #6D7873，y=738..749，14px 字不享大字号豁免），落在 3:1–4.5:1 之间；同仓 LockScreen 的同角色页脚提示经 R8-L08-D05 已升 --c-text-secondary（7.37:1），本页未跟。
- 建议改法：.nearby-tail__hint 的 color 由 --c-text-tertiary 升 --c-text-secondary，字号 --fs-lg 不动。
- 修复类别：CSS/token

### R14-L08-D08　P2 / 间距　批次 R14-B69
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`a55f97f0e3482764`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:298`
- 理想图依据：无基准，依据=本仓自陈安全区净空标准 LockScreen.vue:806-812（R8-L02-D21：距 Home Indicator ≥68rpx）+ §1.4 间距阶梯
- 现象：.content-page 是 height:100vh 不滚，卡片区下内距只给 --sp-6（12px）且未减 env(safe-area-inset-bottom)：bottom 帧实测「查看全部推荐」白盒底缘 y=798，系统手势条墨迹 y=799..805 ⇒ 净空 1px（≈2rpx），钮直接坐进 iOS 手势条，下滑手势与点击热区重叠。
- 建议改法：.nearby-card-area 的下内距改 calc(var(--sp-6) + env(safe-area-inset-bottom, 0px))，或按 LockScreen 口径给 .nearby-tail 一条 --safe-bottom 静态下限。
- 修复类别：CSS/token

### R14-L08-D09　P2 / 字号　批次 R14-B69
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`a55f97f0e3482764`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:360`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级表（--fs-xs/sm 10/11px 只分配给「角标·法务」；正文/按钮档为 15/16px，辅助 14/15px）
- 现象：「查看全部推荐」是本页唯一的批量出口钮，钮内标签取 --fs-sm（真值 22rpx=11.1px，theme/design-variables.scss:561），bottom 帧实测墨迹带高仅 10px（y=775..784）；同域 activities/detail.vue:898 同角色次级钮（分享）标签是 --fs-lg（14px），两页差 3px。R10-L08-D14 只升了这行的颜色（:370 brand-800），字号留在极小档。
- 建议改法：.nearby-tail__more-text 由 --fs-sm 升 --fs-lg（28rpx=14px），与同域次级钮同档；88rpx min-height 已够容纳。
- 修复类别：CSS/token

## subpackages/tools/search/index（4 条）

### R14-L07-D18　P1 / 可达性　批次 R14-B70
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`cc8e185cc84eac3f`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:869`
- 理想图依据：无基准，依据=规范文档§1.2（主色 --c-brand #36C99A 用途=主按钮·选中态）+ §1.3 字号档；同域 daily-question :511-518 已按「白字压 brand 档不达线」把 CTA 底降到 --c-brand-800 取得 6.45:1
- 现象：选中分组「用户」是白字压实心主色胶囊——帧上实测胶囊底 x=17..73 / y=110..152，底色采样 (32,195,143)≈#36C99A 与令牌逐字对上，白字对它的对比度 2.10:1，既不达 4.5:1 也不达 3:1；标签字号 .search-tab__text 是 --fs-md 26rpx(13px)/600（实测墨高 12px，y=125..136），不享 WCAG 大字号豁免 ⇒ 当前选中的是哪一个分组，在帧上是靠「绿底」而不是靠「读得出字」表达的。
- 建议改法：与 daily-question :518 同口径，把选中档底色降到 --c-brand-700/--c-brand-800（白字 4.14:1 / 6.45:1），或选中档改浅底 brand-50 + 深墨字，二选一保证 13px 白字 ≥4.5:1。
- 修复类别：CSS/token

### R14-L07-D19　P2 / 间距　批次 R14-B70
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`cc8e185cc84eac3f`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:670`
- 理想图依据：无基准，依据=规范文档§1.4「区块间距 --section-gap 24rpx=12px」+ 同页 :703 自身 .section{margin-bottom:40rpx} 档
- 现象：预检索面板在 flex:1 容器里被 justify-content:center 垂直居中，实测内容块只占 y=314..589（275px），而可用区是 y≈153..799（646px）⇒ 分组 tab 下缘到首个内容「学校」标题之间是 161px（≈320rpx，是 --section-gap 的 13 倍）纯页面底空带，空态文案下方另留 210px；top 帧与 bottom 帧逐像素相同（页面无处可滚），用户首屏看到的是上半屏一片空白。
- 建议改法：.suggest-wrap 改 justify-content:flex-start + 顶部 padding 走 var(--sp-6)/--section-gap 档，把居中留给空态组件自身，不让整块内容被顶到视口中线。
- 修复类别：单页

### R14-L07-D20　P2 / 文案　批次 R14-B70
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`dcd4acc31dcb3209`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:378`
- 理想图依据：无基准，依据=规范文档§1.5 组件规范（layout/TabBar 与分组控件语义=切换其下内容区）+ 本页 :306 自述「v3 搜索分组：用户 / 标签 / 学校」
- 现象：帧上选中分组是「用户」（实心胶囊 x=17..73），而预检索区唯一可点的内容块标题写「学校」（实测墨迹 x=17..50 / y=314..330）+ 8 枚学校 chip（y=351..437），且 :376 的 showPreSearchEntries 分支整块不引用 activeTab ⇒ 点「标签」「学校」两枚 tab 时这一屏一字不变（本帧与 top 帧逐像素相同即其证据）：分组条承诺「切换内容区」，画面给的却是一份与所选分组无关、且只通向学校检索的兜底名录。
- 建议改法：兜底条目按 activeTab 出对应分组的名录（用户/标签各取其既有名录键），或在 :378 标题旁加一行「预检索起点，与所选分组无关」的说明，使分组条与内容区语义对齐。
- 修复类别：单页

### R14-L07-D21　P3 / 颜色token　批次 R14-B70
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`dcd4acc31dcb3209`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:882`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值：页面只引用 var(--c-*) / --sp-* / --r-* / --s-*，禁止私有色值」+ §1.2 反白档（--c-text-inverse）
- 现象：选中分组标签的字色写成裸字面量 `#ffffff`，而本页其余文字节点（:697/:719/:759/:878 等）一律走 var(--c-text-*)；同仓已有反白令牌 --c-text-inverse（daily-question :530 同场景用的就是它）⇒ 同页两档取色口径并存，深色主题/主题翻色时这一处不跟随。
- 建议改法：换成 var(--c-text-inverse, #ffffff)，与同域 daily-question/index.vue:530 的 CTA 文字同档。
- 修复类别：CSS/token

## subpackages/tools/security/index（4 条）

### R14-L07-D14　P1 / 可达性　批次 R14-B71
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`76229eea7cf347c8`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:1050`
- 理想图依据：无基准，依据=规范文档§1.2（错误 --c-error #E5454D / 浅底档）+ 本页 R13-L07-D05 在册算式（:1007-1013 已把同列「当前设备」角标按「小字必须 ≥4.5:1」提到 6.00:1）
- 现象：「下线」控件唯一那两字是 --c-error #E5454D 压 .sec-item__kick 的 --c-error-soft #FEF5F6（design-variables.scss:857→:844 真值），实测 3.71:1，字号 --fs-sm 22rpx(11px) 不享 WCAG 大字号豁免 ⇒ 远低于 4.5:1。同列上方「当前设备」角标（实测底 (232,251,242)、字 #156B51）已按同一算式修到 6.00:1，本控件是那次修复的同型漏项。用户拿不到：在 5 台同名「手机号登录 · xxxx」设备之间，看不清哪一行右侧写的是「下线」，而这是会吊销会话的危险操作。
- 建议改法：与 :1013 同口径，把 .sec-item__kick-text 提到 --c-error 深档（新增/复用 error-700 一档）或把 .sec-item__kick 底色由 #FEF5F6 退到纯白卡底，使 11px 控件字回到 ≥4.5:1。
- 修复类别：CSS/token

### R14-L07-D15　P2 / 颜色token　批次 R14-B71
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`76229eea7cf347c8`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:570`
- 理想图依据：无基准，依据=规范文档§1.2（浪漫粉底 romance-50 用途=粉色浅底，心动粉「禁用于表单状态」）+ §1.1 第 2 条「绿=行动、粉=喜欢，两色禁止混用」
- 现象：「修改密码」是打开改密弹层（:569 openPasswordModal）的表单入口，其 40rpx 图标底圈用的是心动粉浅底 --c-tint-pink-soft #FFF0F5（帧上实测粉圈 x=37..74 / y=307..345，与上方 y=244..281 的蓝色档「绑定手机号」并排）⇒ 粉色被用在表单/安全操作位上，违反 §1.2 对 romance 档的用途限定；同卡「绑定手机号」用 --c-tint-blue-soft、「绑定微信」用 --c-bg-brand，本行独取粉档。
- 建议改法：该行图标底改与同卡一致的中性/信息档（--c-tint-blue-soft 或 --c-bg-surface），粉档只留给喜欢/匹配类入口。
- 修复类别：单页

### R14-L07-D16　P2 / 字号　批次 R14-B71
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`741b9594732bf497`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:1001`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级表（说明档 --fs-lg/xl = 14/15px；10/11px 极小档只授「角标 · 法务」）+ 同域 help 页 R11-L07-D24 在册裁定（:283-285 已把同类说明行由 10px 升到 --fs-lg）
- 现象：.sec-item__desc 一档承载了本页全部整句说明文案，帧上实测墨高只有 10px（「控制你的信息展示范围」y=569..578 十占 104px=10.4px/字、「了解我们如何保护你的个人信息」y=632..641、「注销后账号与数据将被删除」y=774..782），即 --fs-sm 22rpx=11px，比 §1.3 说明档下限 14px 小 3px，落在只该给角标/法务的极小档；同页主标题 .sec-item__label 是 --fs-lg 28rpx(14px)，两行只差 3px 拉不开层级。
- 建议改法：与 help 页 :285 同口径升到 var(--fs-lg)（28rpx=14px）；时间戳若要保持 11px 应另立一档，不与整句说明共用同一类。
- 修复类别：单页

### R14-L07-D17　P3 / 颜色token　批次 R14-B71
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`741b9594732bf497`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:696`
- 理想图依据：无基准，依据=规范文档§1.1 第 3 条「一令牌一值，禁止私有色值」+ §1.2 边框/浅底档表
- 现象：「隐私政策」行图标底写 `var(--c-sky-50, #E0F2FE)`，而 --c-sky-50 的注册真值是 #F0F9FF（design-variables.scss:55→:316）⇒ 兜底字面量是 Tailwind sky-100，比真值深一档，属「令牌一旦失效就换色」的孤儿兜底（帧上实测该圈 x=37..74 / y=607..645 渲成 #F0F9FF，证明兜底当前无消费者）；同页 :552 的 --c-tint-blue-soft 兜底 #E8F4FF 与注册真值 #E8F4FD（:830）同样不同字面量。
- 建议改法：两处行内兜底改成与 design-variables.scss 逐字一致的真值（#F0F9FF / #E8F4FD），或直接去掉兜底只留 var(--c-*)。
- 修复类别：CSS/token

## subpackages/village/village/detail（2 条）

### R14-L03-D01　P2 / 素材缺失　批次 R14-B72
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`0f4ad41901b2c584`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:152`
- 理想图依据：素材/理想效果图/帖子.png 作者行——名字下元信息行逐字「摄影圈 · 30 分钟前」，频道名在时间之前
- 现象：帧上作者行元信息实测只剩「3 天前」（墨迹带 y198-205 自信息列左缘 x84 起、其前无任何频道文字），理想图元信息行的频道段「摄影圈 ·」整段缺席；代码 categoryLabel 只认 post.categoryId（:151）而 real 接口 PostDetailView.java:13 暴露的字段名是 category（真值 interest/campus 等），且兜底映射 POST_CATEGORY_FALLBACK_LABELS 键全为 cat-* 前缀——真数据两条路都匹配不上，频道标签恒为空串
- 建议改法：categoryLabel 改读接口真字段 category 并与 villageStore.categories 的 id 口径对齐（把真实枚举值接进兜底映射），频道段有真值即渲染，不新造常量文案
- 修复类别：单页

### R14-L03-D02　P2 / 素材缺失　批次 R14-B72
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`dbb87c3a10f2b805`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1113`
- 理想图依据：素材/理想效果图/帖子.png 评论区——每条评论作者名右侧均有绿底校徽 chip（「清华大学」「复旦大学」）
- 现象：帧上评论作者「演示•中山大学」名右侧实测 0 个绿底徽章像素（名行 y507-517、向右扫 x165-330 无绿底命中），理想图评论行名右的校徽 chip 整体缺席；前端分支 v-if="comment.author.campusName"（:1113）恒假——后端 CommentAuthorView.java:6 只出 (userId, nickname, avatarUrl) 三字段，campusName 根本不在评论作者载荷里（发帖作者 PostAuthorView 有、评论作者没有）
- 建议改法：接真字段——CommentAuthorView 按 PostAuthorView 同款补 campusName 透传（用户表已有校名真值），前端渲染分支已就绪无需改动
- 修复类别：单页

## subpackages/village/village/history（2 条）

### R14-L03-D05　P3 / 字号　批次 R14-B73
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__history__top.png`（sha16=`e7c03235732fc9e1`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:354`
- 理想图依据：无基准，依据=规范文档§1.3 页头标题档 + 同域取档对照（tag-posts.vue:573 页头 36rpx / circles index.vue:902 页头 44rpx）
- 现象：帧上页头「浏览记录」墨迹高实测 14px（y74-87，对应 32rpx 字面），代码取 --fs-2xl 32rpx 落在规范「正文 15/16px」档；同域 tag-posts 页头 36rpx、circles 页头 44rpx——同一批内容页的页头标题三档并存
- 建议改法：页头标题提到 var(--fs-3xl, 36rpx) 与 tag-posts 取同档（或反向把 36rpx 降 32rpx 并登记），二选一消除同域三档
- 修复类别：CSS/token

### R14-L03-D06　P3 / 字号　批次 R14-B73
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`c64a335816c3c866`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:498`
- 理想图依据：无基准，依据=规范文档§1.3「小字 13/12px（26/24rpx）用于标签·时间戳，极小档 10/11px 只给角标·法务」
- 现象：帧上列表行时间戳（「2 分钟前」「2026/10/06」等）字号 22rpx=11px，落在规范极小档；本页互动计数「赞/藏/看/评」已按同一条规范从 22rpx 提到 24rpx（:527-532 修复注释自证「22rpx(=11px) 落在极小档」），时间戳是同批漏改的最后一处
- 建议改法：.history-item__time 提到 var(--fs-base, 24rpx)，与本页 stats 同批口径收口
- 修复类别：CSS/token

## subpackages/village/village/index（2 条）

### R14-L02-D05　P3 / 文案　批次 R14-B04
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__index__top.png`（sha16=`629956c41ec44790`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:264`
- 理想图依据：无基准，依据=组件规范（LockScreen.vue:104-132 既有语义裁定注释）＋ §12 语义一致性
- 现象：锁定主视觉：大绿圆内为锁形图标，圆底仍叠一枚白圆绿✓徽章（:264 继续消费 register/check-green.svg）；✓ 语义是「已完成/已解锁」，与同屏「当前完善度 30%」、三条权益全部未解锁矛盾。上一轮修得不对：R13-B01（D05）只把权益清单行首图标换成锁（:599 注释），主视觉圆徽这处 ✓ 漏改，语义矛盾仍在新帧上。
- 建议改法：主视觉徽章改中性/进度语义（百分比或进度环），或直接撤掉 ✓ 徽章，不再输出「已解锁」暗示。
- 修复类别：单页

### R14-L02-D06　P2 / 文案　批次 R14-B17
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`c504f84d70b5fb9b`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:2911`
- 理想图依据：无基准，依据=组件规范（LockScreen 权益清单 = 真实能力清单）＋ §12「撤掉承诺」硬规矩
- 现象：权益清单第 3 条读数「发起私信与匿名聊天」（zh-CN.ts:2911）；全仓无「匿名聊天」功能——「匿名」仅存在于附近的人蒙面模式（discover/CardDetailOverlay.vue、CardSwiper.vue），聊天链路无匿名形态。锁定页向用户承诺一个不存在的能力：用户解锁后照文案找不到任何匿名聊天入口。
- 建议改法：文案撤掉「匿名聊天」，改为真实存在的能力（如「发起私信」），或先建匿名聊天真功能再上该文案；不换新常量接着编。
- 修复类别：单页

## subpackages/village/village/post（2 条）

### R14-L02-D09　P3 / 文案　批次 R14-B74
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__post__top.png`（sha16=`0e5c5dc06a5aea2b`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1081`
- 理想图依据：无基准，依据=规范文档 :146 注（post.vue 为旧发帖页）＋同域 publish.vue 组件规范对照
- 现象：底部工具栏第 5 项图标为眼睛、读数「更多」（:1081），点按行为却是打开「谁可以看」可见范围弹层（:1078 visibilitySheetOpen = true）；同域 publish.vue:1060 同一能力命名为「谁可以看」。眼形图标＋「更多」文案与实际功能三不对位，同域两页取档不一。
- 建议改法：label 改「谁可以看」与 publish.vue 对齐（或改「⋯」图标并接真实扩展菜单），让图标、文案、行为指向同一能力。
- 修复类别：单页

### R14-L02-D10　P2 / 颜色token　批次 R14-B74
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`f2832e437b9dd7bc`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1267`
- 理想图依据：无基准，依据=同域 publish.vue:1228-1230 既有对比度裁定（1.36:1 判废改深绿）＋ WCAG 文本对比档
- 现象：头部「发布」禁用态实测浅灰绿胶囊（--c-neutral-200 #D8E2DE）上浅灰字（--c-text-quaternary #C2CAC6，:1267），实算对比约 1.26:1，帧上「发布」二字几乎不可辨；同域 publish.vue 同一问题已在 R3 判为缺陷并改深绿（publish.vue:1228-1230 注释），post.vue 这处漏改，两页禁用态取档不一。
- 建议改法：禁用态文字按 publish.vue 同口径改深绿（var(--c-brand-800) 或 #2A7A5E），底色维持浅档，保证按钮字可辨认。
- 修复类别：CSS/token

## subpackages/village/village/publish（2 条）

### R14-L02-D07　P2 / 颜色token　批次 R14-B75
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`04d5b2aa419c9eae`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1227`
- 理想图依据：素材/理想效果图/发布帖子页面.png 头部「发布」亮绿胶囊＋规范文档 §3.14 配色「发布按钮 --c-brand 胶囊」
- 现象：头部主操作「发布」胶囊实测深绿：publish.vue:1227 background: var(--c-brand-800, #156B51)；规范 §3.14 指定 --c-brand（#36C99A，同文件 :1321 可证色值），理想图同为亮绿。同域 post.vue:1253 主按钮用的正是 --c-brand 渐变——同域两页发帖主按钮取档不一，本页明显偏暗一档。
- 建议改法：.publish-header__submit 背景改回 var(--c-brand)（或与 post.vue 同款品牌渐变），--c-brand-800 深绿档只留给需要降调的次级元素。
- 修复类别：CSS/token

### R14-L02-D08　P1 / 素材缺失　批次 R14-B75
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`a701ecabb082c306`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1383`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部工具栏首项「图片 / 视频」＋规范文档 §3.14「图/视频/话题/位置/提及/更多」
- 现象：底部工具栏实测仅 5 项：图片／话题／位置／提及／谁可以看，无任何视频入口（:1383 自陈「没有为『视频』…摆位置」）。用户拿不到什么：统一发布页完全不能发布视频内容，理想图明确要求的「图片 / 视频」控件缺失。在册族「village/post 视频入口」只登记了旧发帖页，publish.vue 这处新页面实例此前未被该族覆盖，属新偏差。
- 建议改法：需新建目标功能：接视频上传/审核后端真相源后在工具栏补「视频」入口；在真值具备前维持撤承诺形态（不摆死按钮），但本缺陷登记不销。
- 修复类别：需新建目标功能

## subpackages/village/village/tag-posts（2 条）

### R14-L03-D03　P2 / 素材缺失　批次 R14-B76
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`97d3973816e2e345`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:441`
- 理想图依据：无基准，依据=规范文档§3.11 帖子卡口径「正文/图 ≤3 缩略图」+ 同域 detail.vue:937 与 global.scss .post-media-grid 的帖卡图格既定口径
- 现象：帧上两张帖卡（演示•南开大学 / 演示•中山大学）正文与话题 chip 之外无任何配图位；卡模板正文段（:440-442）只有 content 一个 text 节点、没有 images 渲染分支——而库里种子帖带真图（如游泳馆帖 images=["/static/assets/images/posts/post-8.jpg"]），带图帖进本页图片整块不可见
- 建议改法：卡内补 .post-media-grid 图格分支渲染 post.images（直接复用 global.scss 既有口径），无图时不渲染该块，不造占位假图
- 修复类别：单页

### R14-L03-D04　P2 / 可达性　批次 R14-B76
- 帧：`tmp/qa/frames/R14/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`7a49ca19083fde87`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:899`
- 理想图依据：无基准，依据=任务书 88rpx 命中口径 + 组件规范（评论/点赞/分享为卡级互动控件），仓内同类修复先例 tag-posts.vue:626 min-height:88rpx
- 现象：帧上卡脚互动图标墨迹带实测 y370-380 高约 11px（≈22rpx 墨迹 / 28rpx 字面）；代码 28rpx 图标 + 6rpx 纵向 padding（:888、:899-900）合成热区约 40rpx，不足 88rpx 命中口径的一半——有卡级 goToDetail 替代出口故记 P2
- 建议改法：.action-btn 补 min-height:88rpx + flex 居中、纵向 padding 归零（照本文件 :626 已修先例同款）
- 修复类别：CSS/token

