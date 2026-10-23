# R13 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=146　涉及页面=64　涉及帧=121　泳道卡=14
- 严重度分布：P3=69　P2=59　P1=17　P0=1
- 轴分布：颜色token=42　文案=30　可达性=25　字号=14　素材缺失=7　位置=6　间距=6　尺寸比例=5　层级遮挡=4　圆角=4　空态文案=2　需新建=1
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0
- 批次归属：146 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/discover/index（2 条）

### R13-L01-D05　P2 / 层级遮挡　批次 R13-B05
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__discover__index__top.png`（sha16=`17fb5d672bf6de29`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:343`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png——简介两行整体位于匹配度环左侧，环不压任何文字
- 现象：上一轮修得不对：R11-L01-D16 用 `.match-card :deep(.match-info) { max-width: 60% }`（:339-344）收窄文字列避免与右下 160rpx 匹配度环争位，但实拍帧上简介首行「岭南学院，爱在西门买糖水，晚自习惯后…」延伸到约卡宽 90%+，环（左缘约卡宽 73% 处）直接压在简介首行尾部字符上——mp-weixin 组件样式隔离下该 :deep 规则未生效，环压文字的原缺陷原样还在
- 建议改法：不依赖父页 :deep 穿透——把 max-width/右侧预留写进 MatchInfo.vue 自身样式（或对 MatchCard 开 virtualHost/shared 样域），按 160rpx 环位给简介列留出实体右内衬
- 修复类别：单页

### R13-L01-D06　P3 / 素材缺失　批次 R13-B06
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__discover__index__bottom.png`（sha16=`af2230f08f6e02d3`）
- 源码证据：`apps/client/src/components/match/MatchInfo.vue:241`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png——简介首行前是引号图形（❝ 形 SVG），不是色条
- 现象：简介引言符被实现为一根宽 var(--sp-1) 的半透明白竖条（.match-info__intro-quote:241-247，帧上实测约 3px 竖条），理想图同位的引号图形缺失，引言语义只剩一根没有符号含义的色条
- 建议改法：按规范 §1.1-4 用引号 SVG 图形替换竖条（沿用既有 ICONS 通道），尺寸对齐理想图约为单行字高
- 修复类别：单页

## pages/home/index（3 条）

### R13-L01-D07　P1 / 素材缺失　批次 R13-B04
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__home__index__top.png`（sha16=`092023273faa249f`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:92`
- 理想图依据：素材/理想效果图/首页.png——今日推荐卡简介下方有 4 格相册缩略条（4 张生活照小图一排）
- 现象：实拍推荐卡在简介/星座之下直接是动作按钮行，相册缩略条整块不存在；组件只有单张主照 photoUrl 一个图源（:91-97），全文件无 album/photos 节点——用户拿不到理想图承诺的推荐人相册预览，只看得到一张主照
- 建议改法：给推荐卡视图模型接真实相册字段（person photo list，后端已有人格池素材），渲染 3–4 格缩略条；无真值时整条不渲染，不放常量占位图
- 修复类别：需新建目标功能

### R13-L01-D08　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__home__index__top.png`（sha16=`092023273faa249f`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:666`
- 理想图依据：素材/理想效果图/首页.png——今日恋爱进度四步为「完善资料／认识新的人／回复悄悄话／参与兴趣互动」
- 现象：帧上四步实测为「完善资料／认识新人／回复悄悄话／兴趣互动」：zh-CN.ts:666「认识新人」缺「的」、:668「兴趣互动」缺「参与」前缀，与理想图措辞不一，且同卡内两长两短不齐（组件注释 TodayLoveProgress.vue:31 自己声称的目标文案也含「参与兴趣互动」，与 i18n 现值自相矛盾）
- 建议改法：zh-CN.ts:666/:668 对齐理想图改「认识新的人／参与兴趣互动」（en-US 同步），不改组件
- 修复类别：单页

### R13-L01-D09　P2 / 文案　批次 R13-B03
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__home__index__bottom.png`（sha16=`2eeef3dfa2d4851f`）
- 源码证据：`apps/client/src/components/home/InterestRecommendation.vue:16`
- 理想图依据：素材/理想效果图/首页.png——兴趣推荐人数为「1.2w 人加入／8,932 人加入」整数口径；同帧相邻卡实测「旅行圈 8,932 人加入」用千分位逗号
- 现象：帧上「游戏圈 8.124人加入」把小数人数原样透传：formatMemberCount 对 <1000 的值走 `String(count)`（:16），种子侧传来 8.124 这种分数人数时直接渲染成「8.124 人加入」，同一屏与「8,932」口径互相矛盾，人数显示失真
- 建议改法：formatMemberCount 对非整数输入取整（Number.isInteger 不成立则 Math.round）再走既有万/千分位分支；不改数据源，不引入新常量
- 修复类别：单页

## pages/messages/index（2 条）

### R13-L02-D01　P2 / 位置　批次 R13-B13
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__messages__index__top.png`（sha16=`7feaa93a07e849fd`）
- 源码证据：`apps/client/src/pages/messages/index.vue:991`
- 理想图依据：素材/理想效果图/消息.png 顶部两张摘要卡——图标圆与「有人喜欢你」标题同排（图标左、标题右），副标与按钮纵向堆叠其下
- 现象：帧上摘要卡为 `.quick-card` 单列布局，64rpx 图标圆独占一行、标题「有人喜欢你」另起一行压在图标下方；理想图同位是图标与标题同一水平行，整卡因此比理想图高一档且头部留白错位
- 建议改法：把 `.quick-card` 的图标圆与 `.quick-card__body` 包进一行横向 flex 头部（图标左、标题+副标右），按钮保持右下角，恢复理想图的横排头部结构
- 修复类别：单页

### R13-L02-D02　P1 / 颜色token　批次 R13-B13
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__messages__index__bottom.png`（sha16=`dc5008d80880017a`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1355`
- 理想图依据：素材/理想效果图/消息.png——链接/行动文字为可辨识的品牌绿；正文级可读文字需 ≥4.5:1
- 现象：「活动推荐」三张卡的行动文字「查看详情›」取 `var(--c-brand, #36C99A)` 22rpx(11px) 压白卡，实算对比 2.10:1（帧取样绿墨迹与 design-variables.scss $brand-500 同值）——低于 P2 档下限 3:1 更低于正文级 4.5:1。用户拿不到的是这条唯一常驻出口的可读性：弱视/强光环境下整排「查看详情」不可读，活动详情入口形同虚设
- 建议改法：「查看详情」文字色升同族深档 `--c-brand-800`（#156B51，白底 6.45:1，与 LockScreen.vue:787 全站深档承载口径一致），字号 22rpx 不动
- 修复类别：单页

## pages/nearby/index（2 条）

### R13-L01-D10　P2 / 位置　批次 R13-B14
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__nearby__index__top.png`（sha16=`fa21793cfe02bd8b`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:671`
- 理想图依据：素材/理想效果图/附近的首页.png——五宫格下方首屏第二区块是「热门兴趣圈」四张封面大卡（规范 §3.5 分区①也只要求「按距离/同城分段 + 人卡列表」，未含入口卡）
- 现象：五宫格与分段胶囊之间插入两张规范外全宽入口卡（「附近的人/按距离找到身边的人」「同城的人/同城更多心动可能」，:671/:681，帧上约占 y=340–455 两整行），加上分段胶囊与人卡横滑把首屏占满，理想图首屏主体「热门兴趣圈」封面卡区被压到滚动视口底缘、帧上只露区块标题切边——首屏构成与理想图对不上
- 建议改法：两张入口卡与「附近的人/同城的人」分段控件二选一（入口卡降级合并进分段行），让热门兴趣圈卡区回到首屏理想图位
- 修复类别：单页

### R13-L01-D11　P1 / 可达性　批次 R13-B11
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__nearby__index__bottom.png`（sha16=`a099acd4b20dfc24`）
- 源码证据：`apps/client/src/components/village/PostCard.vue:335`
- 理想图依据：素材/理想效果图/附近的首页.png——附近动态卡互动栏含可用的「分享」动作；实拍帧上每张动态卡互动栏第三枚即这枚分享图标
- 现象：附近动态互动栏的分享键是死按钮：`@tap.stop="noop"`（:335，R1-L02-D07 挂账未修，:332-334 注释自认「仍是 noop 死按钮」），可见、可点、零反馈零功能，还因是死钮故意不播报（无 role/aria-label）——用户拿不到分享能力，理想图承诺的分享动作不可达
- 建议改法：二选一守住 §12：接真分享（button open-type="share" + 页面 onShareAppMessage），或撤掉这枚分享图标不放空承诺；不许保留 noop 死钮
- 修复类别：需新建目标功能

## pages/profile/index（2 条）

### R13-L02-D03　P1 / 颜色token　批次 R13-B09
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__profile__index__top.png`（sha16=`73b531136758797c`）
- 源码证据：`apps/client/src/components/profile/mine/MyHeader.vue:210`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 页头——「在线」绿底徽标白字清晰可辨；小字号白字压色底需 ≥4.5:1
- 现象：页头「在线」徽标为白字 20rpx(10px) 压 `background: #36C99A`（:210），实算 2.10:1，比 P2 档下限 3:1 还低。用户拿不到的是在线状态的可读性：10px 白字压品牌绿在实机户外/低视力场景几乎隐形，状态信息交付失败
- 建议改法：徽标底色改 `--c-brand-800`（#156B51，白字 6.45:1）或白字改深档 `--c-brand-800` 压现有 `--c-brand-100` 浅底，取其一保持同族
- 修复类别：单页

### R13-L02-D04　P2 / 颜色token　批次 R13-B15
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__profile__index__bottom.png`（sha16=`9b0b420b6a54a439`）
- 源码证据：`apps/client/src/pages/profile/index.vue:3037`
- 理想图依据：素材/理想效果图/已经填完资料的个人主页.png 底部功能区（理想图为深色可读文字压浅底）；次级文字对比应 ≥4.5:1，3:1–4.5:1 落 P2 档
- 现象：语音介绍/编辑背景图/推荐给好友三张大槽 CTA 文字（「录制语音状态」等）取 `--c-brand-700` #1F8D6A 压 `--c-bg-brand` #E8FBF2（.video-cta__text，--fs-md=26rpx/13.5px semibold），实算 3.82:1，落在次级 3:1–4.5:1 的 P2 档，低于正文级 4.5:1
- 建议改法：`.video-cta__text` 色升 `--c-brand-800` #156B51（压 #E8FBF2 ≈5.3:1），与同屏 LockScreen 系深档文字口径对齐
- 修复类别：单页

## pages/register/index（2 条）

### R13-L01-D01　P2 / 层级遮挡　批次 R13-B16
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__register__index__top.png`（sha16=`fb0645673cb4c520`）
- 源码证据：`apps/client/src/pages/register/index.vue:742`
- 理想图依据：无基准，依据=规范文档 §1.4 输入框浅底规范 + 组件规范（表单输入行）；帧上「出生日期」行在占位文本与右侧「需满 18 周岁」提示之间渲染出一条深色圆角原生控件条（帧上实测约 x=130–260、纵贯行高），压在 --c-bg-surface 浅底输入行上
- 现象：出生日期行的 `<picker mode="date">`（:742-757，行内仅 icon+占位文案，页面 CSS 无任何深色元素）在真机档渲染出一条深色原生日期控件条叠在浅底输入行中部，整行读成「占位文字 + 黑条 + 提示」三截
- 建议改法：给 .field__picker-inner 固定浅底并自绘当前值/占位文案（保留原生弹层），把原生控件条收敛为整行一致的浅底样式
- 修复类别：单页

### R13-L01-D02　P2 / 颜色token　批次 R13-B16
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__register__index__bottom.png`（sha16=`fb476b5d42d7aaf0`）
- 源码证据：`apps/client/src/pages/register/index.vue:1387`
- 理想图依据：无基准，依据=规范文档 §1.2（三级文本 #6B7571 用于白底弱说明；压页底 #EEF7F2 应取 --c-text-secondary #4A524E，同文档 .safety-note R12-L01-D05 收口口径）
- 现象：底部「已有账号？」（.to-login__text:1387 = --c-text-tertiary #6B7571，节点在白卡外、压页面底 #EEF7F2）实算对比 4.36:1 <4.5:1，落在 3:1–4.5:1 次级文字档；同排协议行 .agree__text（:1348，同色同样压页底）同档
- 建议改法：两处提档 --c-text-secondary（#4A524E 压 #EEF7F2 实算 7.38:1），与 R12-L01-D05 的 .safety-note 同口径
- 修复类别：CSS/token

## pages/register/success（2 条）

### R13-L01-D03　P2 / 颜色token　批次 R13-B17
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__register__success__top.png`（sha16=`d93d8bd9745c95cd`）
- 源码证据：`apps/client/src/pages/register/success.vue:147`
- 理想图依据：无基准，依据=规范文档 §1.2/§1.3（正文档说明文字压页底 #EEF7F2 需 ≥4.5:1）
- 现象：副标题两行「欢迎加入寻觅…／把资料填成一张「恋爱名片」」用 .reg-success__sub-line:147 = --c-text-tertiary #6B7571 压页面浅底（渐变收 #EEF7F2），实算 ≈4.36:1 <4.5:1，标题下这段唯一的流程说明文字落在 3:1–4.5:1 档
- 建议改法：提档 --c-text-secondary #4A524E（压 #EEF7F2 实算 7.38:1），与注册页 .safety-note 同口径
- 修复类别：CSS/token

### R13-L01-D04　P2 / 颜色token　批次 R13-B17
- 帧：`tmp/qa/frames/R13/real-f0677920/pages__register__success__bottom.png`（sha16=`d8523b4b9b9e5893`）
- 源码证据：`apps/client/src/pages/register/success.vue:249`
- 理想图依据：无基准，依据=规范文档 §1.2（次级文字压页底对比档）＋组件规范（兜底出口与主 CTA 需可辨层级）
- 现象：兜底出口「稍后再说，先随便逛逛」（.reg-success__alt:249 = --c-text-tertiary #6B7571，压页面浅底）实算 ≈4.36:1 <4.5:1；R11-L01-D11 只修了这行的 88rpx 热区，字色对比仍落在 3:1–4.5:1 档
- 建议改法：字色提档 --c-text-secondary #4A524E（7.38:1），热区口径保持不动
- 修复类别：CSS/token

## subpackages/campus/campus/certification（2 条）

### R13-L05-D06　P2 / 可达性　批次 R13-B18
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`8b55d9d8846dd416`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:734`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.4（间距令牌：--sp-5=20rpx、--fs-lg=28rpx）+ 本页 certification.vue:507-513 自立的 88rpx 热区标准
- 现象：「学校名称」「专业」两个必填输入框 `.form-input` 高 = padding 20rpx×2 + 28rpx 字 + 2rpx 描边×2 ≈83.2rpx（帧上实测 ≈42px，与算值一致）< 本页自己给返回钮立的 88rpx 热区档（certification.vue:512）；输入框是本页必点控件、无替代出口，两枚全部差 ≈5rpx。
- 建议改法：`.form-input` 补 `min-height: 88rpx; box-sizing: border-box;`，内衬不动。
- 修复类别：CSS/token

### R13-L05-D07　P2 / 可达性　批次 R13-B18
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`7aa4b1b284e2e9cb`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:905`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.2（--c-text-tertiary #6B7571 用途限「弱说明」；法务行高档 1.75）+ §1.2 次级文字对比带
- 现象：页底隐私承诺「你的信息仅用于学生身份认证，我们承诺保护你的隐私安全」取 --c-text-tertiary #6B7571 直接压页底 --c-bg-page #EEF7F2（certification.vue:952 自注页底唯一来源即此值），实测 4.36:1 <4.5:1，22rpx 法务档小字处于次级文字 3:1–4.5:1 带内但低于正文档要求（帧 bottom 帧底 y≈773 一行浅灰小字）。
- 建议改法：`.privacy-tip__text` 改 --c-text-secondary #4A524E（对 #EEF7F2 7.4:1），并补 `line-height: 1.75`（规范 §1.3 法务行高档）。
- 修复类别：CSS/token

## subpackages/campus/campus/hub（1 条）

### R13-L04-D08　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`15d461c38b61d374`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3628`
- 理想图依据：素材/理想效果图/校园圈.png 认证引导横幅（标题「加入校园圈，发现更多同校的TA」/副文案「认证学校后可加入专属校园圈」）
- 现象：横幅副文案词条 `"guideDesc": "完成学校认证，即可加入该校专属校园圈"`（:3628）与理想图「认证学校后可加入专属校园圈」整句不同词；同卡标题词条「发现更多同校的 TA」（:3627）比理想图「同校的TA」多出前后空格——§1.1 第 5 条要求除头像/照片外对照理想图 100% 还原，文案属可还原项。
- 建议改法：两条 i18n 词条按理想图措辞改写（guideDesc 改「认证学校后可加入专属校园圈」、guideTitle 去 TA 两侧空格），不动布局。
- 修复类别：单页

## subpackages/campus/campus/index（2 条）

### R13-L04-D09　P1 / 颜色token　批次 R13-B19
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`9e9ac977d9f58d04`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:849`
- 理想图依据：无基准，依据=规范文档§1.2（次级文字对比 ≥3:1 下限；「心动粉 #FF6B81」用途清单=喜欢·匹配·品牌点缀，不含用户名）
- 现象：话题卡作者名 `.topic-card__author` 取 `color: $pink-primary` = `--c-romance-500` #FF6B81（:436、:849），帧上「远山」二字以粉字压白卡，实算对比 ≈2.7:1——低于次级文字 3:1 下限（正文级 <4.5:1 档），且把「喜欢粉」挪用作普通用户名色。用户拿不到：可靠辨认这条校园话题的作者是谁——白底粉字在低视力/强光场景几乎融掉，作者归属这一内容元信息不可辨。
- 建议改法：`.topic-card__author` 色收 `--c-text-secondary`（同域卡片作者名通用档），一处 token 替换；「喜欢粉」保留给喜欢/匹配语义。
- 修复类别：CSS/token

### R13-L04-D10　P3 / 文案　批次 R13-B19
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`cefe1b138b1867d4`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:302`
- 理想图依据：无基准，依据=规范文档§1.4 版面节奏（正文断行不得产生孤字行）+ 组件规范文案宽度预留
- 现象：认证引导卡描述「上传学生证即可认证，与同校同学解锁校园话题」（:302 词条 `campus.index.certGuideDesc`）在帧上折成「……解锁校园话 / 题，」——孤字「题」带逗号独占第二行，描述容器被左侧图标+右侧「去认证」钮挤压到放不下整句。
- 建议改法：词条收短两字（如「上传学生证即可认证，与同校同学聊校园话题」句式重排）或描述区右让位收 8rpx，消灭孤字行；改词条或一处容器内衬，不动门槛逻辑。
- 修复类别：单页

## subpackages/campus/campus/post-topic（3 条）

### R13-L05-D01　P3 / 间距　批次 R13-B20
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`f07171e6457da1e9`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:759`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.4（区块内衬/间距令牌）+ R12-L05-D05 修复自己承诺的「横幅正文回到单行」版式
- 现象：页顶认证横幅正文「校园话题仅限本校已认证同学发布，请先完成校园认证」仍折成两行、第二行只剩孤字「证」（帧 y≈131-175 实测两行文本块）。R12-B27 注释（post-topic.vue:752-757）声称内衬 28→20rpx、gap 12→8rpx 合计还 36rpx 后「回到单行、横幅不增高」，R13 帧 sha 已从 67dc12e7 变为 f07171e6 但横幅依旧两行——上一轮修得不对，还宽度没到 24 字×24rpx=576rpx 的门槛。
- 建议改法：别再压缩内衬——把「去认证」按钮改为横幅第二行右对齐（正文整段独占首行），或正文缩为「仅限本校已认证同学发布，请先完成认证」减 4 字，令 24rpx 正文在可用宽内真实单行。
- 修复类别：单页

### R13-L05-D02　P1 / 可达性　批次 R13-B20
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`4c543c931e73cbf9`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:1123`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.2（警告档令牌表：--c-warning 仅「待审核·中强度」，正文可读档另有 --c-text-secondary #4A524E / warning 深色档）
- 现象：匿名发布说明「校园话题暂未开放匿名发布，内容将以你的昵称公开」取 `.option-desc--warn { color: var(--c-warning) }` 即 #F59E0B，压白卡（--c-bg-container #FFFFFF）实测对比 2.01:1，连 P2 带（3:1–4.5:1）下限都不到，帧内为 22rpx 橙色小字。用户拿不到什么：real 档匿名永不生效（后端硬编码 false），这句是全页唯一解释「开了也不会匿名」的告知，2:1 下用户拿不到这条功能限制说明。
- 建议改法：色值改同族 warning 深色档 --c-text-warning-dark #92400E（本页横幅左轨同款，白底 7.1:1 ≥4.5:1），不加新色。
- 修复类别：CSS/token

### R13-L05-D03　P2 / 可达性　批次 R13-B20
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`4c543c931e73cbf9`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:1162`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.2（--c-text-tertiary 仅限「弱说明」，按钮主标签属正文级）+ 本页 R7-L05-D04 自立的「禁用 ≠ 不可读」口径
- 现象：底部「发布话题」提交钮禁用态文字 $text-tertiary（--c-text-tertiary #6B7571）压禁用底 $border-light（--c-border-light #EEF2F0），实测 4.22:1 <4.5:1；同页顶栏「发布」禁用态 R7-L05-D03/D04 已按同一套「禁用≠不可读」道理收口到 ≈7.4:1，同页两处提交钮取档不一（帧 bottom 帧底 y≈755 一枚浅底浅字大按钮）。
- 建议改法：`.bottom-submit__btn--disabled .bottom-submit__text` 改 --c-text-secondary #4A524E（对 #EEF2F0 7.1:1），与顶栏禁用态同口径。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（2 条）

### R13-L05-D04　P3 / 可达性　批次 R13-B21
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`f777185b1f74033b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:432`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.2/§1.4 + 同域组件规范（certification.vue:507-513 自注「热区标准 …补齐 min-height」88rpx 口径）
- 现象：左上「返回」胶囊仅 `padding: 12rpx 20rpx` + 28rpx 图标，热区高 ≈57.6rpx（帧上实测 ≈29px），低于全站 88rpx 热区档；同域 campus/campus/certification.vue:512 与 post-topic.vue:654 的返回/取消钮都已 min-height:88rpx，本页（R12-B28 刚动过、sha 已变）仍是同域三页里唯一没达标的一枚。
- 建议改法：`.detail-header__back` 补 `min-height: 88rpx; box-sizing: border-box;` 并让文字在新高度垂直居中（照抄 certification.vue:512 同款改法）。
- 修复类别：单页

### R13-L05-D05　P1 / 可达性　批次 R13-B21
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`f777185b1f74033b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:845`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.4（间距/热区档）+ 本文件 R13-L05-D04 同域 88rpx 口径
- 现象：底栏「实名/匿名」身份切换胶囊仅 `padding: 14rpx 22rpx` + 24rpx 字，热区高 ≈57–62rpx（帧上实测 ≈29px）<88rpx；它是回复身份的唯一开关，页面内不存在任何替代出口。用户拿不到什么：想以匿名身份回复的用户只有这枚 29px 小胶囊可点，热区不达标且极易误触/漏触，等于拿不到可靠的匿名切换入口。
- 建议改法：`.anonymous-toggle` 补 `min-height: 88rpx`（同页顶栏 D04 同批），或把实名/匿名切换并进输入框聚焦时的可点选项行作为替代出口。
- 修复类别：单页

## subpackages/chat/chat-session/index（2 条）

### R13-L11-D05　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`4e2ab13c87f4fab5`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:1301`
- 理想图依据：无基准，依据=规范文档§1.3 行高/文案档 + 同域空态错误文案标点口径（i18n/locales/zh-CN.ts 全域错误句不加句号）
- 现象：帧上错误主句「缺少会话标识，请从聊天列表或匹配结果进入。」以句号收尾，而同文件同域错误/空态句一律不带句号（:1299「创建会话失败，请稍后重试」、:2926/:3938「请检查网络后重试」、:2917「这里空空如也」），全 app 唯一带句号的错误文案，标点取档不一。
- 建议改法：删掉 zh-CN.ts:1301 该句尾部句号，与其余错误文案标点口径拉齐。
- 修复类别：单页

### R13-L11-D06　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`8421ca344524e2e4`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:1301`
- 理想图依据：无基准，依据=规范文档§1.1 设计原则（面向用户可读）+ 组件规范 EmptyState（空态主句是本页唯一状态宣告，须让用户看懂）
- 现象：帧上唯一一句正文「缺少会话标识，请从聊天列表或匹配结果进入。」把开发术语「会话标识」直出给终端用户；同域 :1297 moreMenuSessionMissing「会话标识缺失」同病——普通用户不知道"会话标识"是什么，拿不到"这条会话不存在/已失效"的直白解释。
- 建议改法：改写为用户语言（如「会话不存在或已失效，请从聊天列表或匹配结果重新进入」），:1297 一并改。
- 修复类别：单页

## subpackages/chat/official-chat/index（2 条）

### R13-L11-D07　P3 / 颜色token　批次 R13-B22
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`dbc0fd8d67a15a01`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:726`
- 理想图依据：无基准，依据=规范文档§1.1 原则3「一令牌一值，页面只引用 var(--c-*)，禁止私有色值」+ §1.2 文本色档
- 现象：页头副标题「你的恋爱小管家」取私有色 #5A6B64（帧上该行最暗墨迹实测 ≈#607069），§1.2 全量色板无此档（次文本 #4A524E / 三级 #6B7571 才是在册档）；同页 R12-L11-D12 已把输入文字/占位色归 token，副标题漏改。
- 建议改法：.nav-subtitle 色归口既有档 --c-text-secondary #4A524E（帧上可读档）或 --c-text-tertiary，删私有色值。
- 修复类别：CSS/token

### R13-L11-D08　P3 / 颜色token　批次 R13-B22
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`56594ee611bcfc8f`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:1100`
- 理想图依据：无基准，依据=规范文档§1.2 输入底档 --c-bg-surface（#F3FAF6/#F7FAF9）+ §1.1 原则3 禁私有色值
- 现象：底部输入框（「对我说点什么吧～」）底色写死 #f5f6f8（帧上 x=190,y=760 实测恰为 #F5F6F8），不是 §1.2 在册输入底档 --c-bg-surface；同输入栏的 border #f0f0f0（:1042）、表情图标 #666（:1066）同为私有色，R12-L11-D12 只收了输入文字与占位符两处。
- 建议改法：.input-bar__field 底改 var(--c-bg-surface)，连带 :1042 边线归 --c-divider-light、:1066 图标归 --c-text-tertiary，全部用既有令牌。
- 修复类别：CSS/token

## subpackages/circles/circles/circle-home（1 条）

### R13-L04-D07　P1 / 需新建　批次 R13-B23
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`d960440022e70bfd`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:644`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png hero 区下缘「摄影技巧/风景拍摄/人像写真/城市漫游」四枚话题 chips 行；帧上 hero 底直接接页签带，无任何 chips 行
- 现象：理想图要求的圈子话题直达 chips 行整块缺席，话题入口被收进 feed 尾部「查看全部话题 ›」链接（:644）。用户拿不到：圈子主页首屏（hero+页签）没有任何话题入口，必须滚完整个 feed 才能进话题列表——与 hero 同排的话题浏览模块按理想图应存在，且圈子话题列表接口已有真数据（topics 链路在跑），不是无源可接。
- 建议改法：hero 底部按理想图补话题 chips 行，数据接既有圈子话题列表接口取前 N 个真话题；接口无数据时整行不渲染，不编常量话题名。
- 修复类别：需新建目标功能

## subpackages/circles/circles/index（3 条）

### R13-L03-D10　P2 / 颜色token　批次 R13-B24
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`73a4c364211ecd5e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:904`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 页头——「兴趣圈」为深墨 #1A1E1C 级粗黑字 +「趣」下 3rpx 品牌绿短下划线
- 现象：帧上页头标题「兴趣圈」实测为品牌绿墨（≈#2AAE83 档），既不是理想图深墨也不是本页 :904 声明的 --c-text-primary #1A1E1C（运行时被页头插槽色覆盖）；「趣」下绿下划线在帧上不可辨
- 建议改法：排查 AppShell #header 插槽对标题墨色的覆盖链，让标题回落 :904 的 --c-text-primary，并恢复 .circles-header__under 下划线可见
- 修复类别：CSS/token

### R13-L03-D11　P2 / 颜色token　批次 R13-B24
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`73a4c364211ecd5e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:925`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 分类行——未选中 chips（摄影/旅行/音乐/运动/美食）为白底上清晰可辨的浅灰胶囊
- 现象：未选中 chip 底 --c-bg-surface #F3FAF6 压在页面底 #EEF7F2 上，两者明度差≈0，帧上摄影/旅行/音乐/运动/美食读作裸文字、胶囊轮廓完全不可辨（选中态除外）
- 建议改法：未选中 chip 底/描边与页底拉开一档（如 --c-neutral-100 级底或 --c-border-default #DDE3E0 描边），或页头区改白底贴合理想图
- 修复类别：CSS/token

### R13-L03-D12　P3 / 素材缺失　批次 R13-B24
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`5827257ea02b9f8e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:470`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 分类行尾——「≡」筛选钮右上角常驻品牌绿圆点
- 现象：帧上吸顶头行尾筛选「≡」钮无绿点（代码仅 filterMode≠'all' 才渲染），理想图同位常驻绿点做「筛选可用」指示
- 建议改法：绿点改常驻渲染（或未用筛选时以低饱和档显示），对齐理想图的筛选可用性指示
- 修复类别：单页

## subpackages/circles/circles/post-topic（2 条）

### R13-L04-D05　P2 / 颜色token　批次 R13-B25
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`eec91b0382ad02cc`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:987`
- 理想图依据：无基准，依据=规范文档§1.2 次级文字对比下限（次级 ≥3:1）+ 同文件禁用钮同族修法（不靠糊字/透明表达禁用）
- 现象：上一轮 R12-L04-D07 把 real 档「兴趣圈」目标降级只读禁用（方向正确），但禁用档实现是整枚 chip `opacity: 0.5`（:986-988）——`$text-secondary` ≈#5F6763 字压白卡再叠半透明，有效对比 ≈2.1:1，帧上「兴趣圈」三字几乎读不出，用户拿不到「第二个发布目标写的是什么」这一信息。上一轮修的是假目标轴，本条是禁用呈现档的新偏差。
- 建议改法：去 `opacity`，改同文件 :1282-1283 禁用钮同族语言——`--c-status-disabled` 底 + `$text-secondary` 字（均为既有 token），禁用语义由底色+`aria-disabled`（:582 已有）承担。
- 修复类别：CSS/token

### R13-L04-D06　P2 / 颜色token　批次 R13-B25
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`eec91b0382ad02cc`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:812`
- 理想图依据：无基准，依据=规范文档§1.1 视觉角色令牌（「绿色=行动，粉色=喜欢，两色禁止混用」）
- 现象：页头带 135° 渐变第三档落到 `--c-romance-300` 粉（:812），帧页头右端明显泛粉——发布话题是纯行动语境，头带却混入「喜欢」角色的粉色端档（非关键装饰色不对，P2）。与 R12-L04 在册的「跨页页头取档不一」不同象：那条修法是拉平两页，本条修法是去掉行动页头里的粉色档。
- 建议改法：渐变第三档 `--c-romance-300` 换 `--c-brand-100`（既有 token），头带收纯绿系。
- 修复类别：CSS/token

## subpackages/circles/circles/topic-detail（4 条）

### R13-L04-D01　P2 / 字号　批次 R13-B26
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`b843784c2bf7dbdd`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:621`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（标题档 18/20px `--fs-3xl/4xl`，正文档 15/16px）
- 现象：话题标题「城市夜景拍摄攻略」取 `--fs-xl`=15px 700（:621-622），正文取 `--fs-lg`=14px——标题只比正文大 1px，低于规范标题档 18–20px，详情页首屏标题与正文视觉层级几乎拉不开。
- 建议改法：`.topic-title` 字号提档到 `var(--fs-3xl, 18px)`，正文保持 `--fs-lg`，纯 token 档位替换。
- 修复类别：CSS/token

### R13-L04-D02　P3 / 可达性　批次 R13-B26
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`b843784c2bf7dbdd`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:299`
- 理想图依据：无基准，依据=组件规范（举报类入口须有可见示能；同域 village/detail 备 PostReportDialog 组件）
- 现象：本页唯一的举报话题通道挂在正文 `@longpress="handleReportTopic"`（:299）隐藏手势上，帧上整页无任何可见举报入口/菜单项，不知道长按就等于没有举报。
- 建议改法：在作者行或标题行补可见「举报」入口（复用 PostReportDialog 与既有 handleReportTopic 链路），不新增门槛。
- 修复类别：单页

### R13-L04-D03　P3 / 颜色token　批次 R13-B26
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`b091cd55f077bc23`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:946`
- 理想图依据：无基准，依据=同域组件规范（同族 post-topic.vue 禁用提交钮 R10-L04-D10 已定档：禁用底+描边+深字三件套）
- 现象：底部回复栏禁用态「发送」钮只给 `--c-border-default` #DDE3E0 平底、无描边（:946-948），文字仍取 `--c-text-tertiary`（:959，压该底 ≈3.7:1）；同族 post-topic.vue:1282-1296 同一问题已收敛为 `--c-status-disabled` 底 + `--c-neutral-400` 描边 + `$text-secondary` 字——同域两页禁用钮取档不一，本页钮在白输入框旁只剩一团浅灰。
- 建议改法：照同族已定档三件套替换（三个值均为既有 token，不引入私有色）：底 `--c-status-disabled`、2rpx `--c-neutral-400` 描边、禁用字 `$text-secondary`。
- 修复类别：CSS/token

### R13-L04-D04　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`b091cd55f077bc23`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:3813`
- 理想图依据：无基准，依据=规范文档§1 全站文案全半角一致性（zh-CN.ts 同文件已有 6 处全角「…」取档）
- 现象：回复输入框占位符词条 `"topicDetailReplyPlaceholder": "写下你的回复..."`（:3813）用半角三点收尾，帧上「写下你的回复...」与同文件其余 6 处全角「…」词条取档不一。
- 建议改法：该词条三点换全角「…」，一处 i18n 改动，不动样式。
- 修复类别：单页

## subpackages/circles/circles/topics（3 条）

### R13-L03-D13　P3 / 字号　批次 R13-B27
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`26e6d7d4c0e62900`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:305`
- 理想图依据：无基准，依据=规范文档§1.3「辅助 14/15px（28/30rpx）」+ 同域参考 素材/理想效果图/圈子详情，摄影圈参考.png hero 简介为一行完整可读句（≈28rpx 档）
- 现象：hero 圈简介字号 22rpx（11px，规范极小档）且单行省略号截断，帧上「分享光影与构图，一起扫街、看展、记录…」，低于 §1.3 辅助档 28rpx，也小于同域参考图简介的读感
- 建议改法：.circle-hero__desc 字号提到 var(--fs-lg) 28rpx 档；文案超长时保留单行截断即可
- 修复类别：CSS/token

### R13-L03-D14　P3 / 尺寸比例　批次 R13-B27
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`26e6d7d4c0e62900`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1414`
- 理想图依据：无基准，依据=同域参考 素材/理想效果图/圈子详情，摄影圈参考.png hero 头像（圆角方、宽约占屏宽 15.8%，≈118rpx）
- 现象：帧上 hero 圈头像 88rpx（44px，约占屏宽 11.7%），比同域参考图头像小约四分之一，hero 左侧视觉权重明显弱于理想构图
- 建议改法：.circle-hero__icon 提到 ≈120rpx 档并保留 22rpx 圆角比例，向参考图构图靠拢
- 修复类别：CSS/token

### R13-L03-D15　P1 / 可达性　批次 R13-B27
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`2993a7be03dd7cb2`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:597`
- 理想图依据：无基准，依据=规范文档§3.11 tab 常驻结构 + 组件规范（页签行为该页主导航）
- 现象：上一轮修得不对——帧已深滚到第 4 张卡（hero 与页签行均滚出视口），R12-L04-D02/D03 声称的 tabsPinned fixed 吸顶页签行与页内返回钮在帧上整条缺席（帧顶直接是上一卡溢出的「认识 TA」胶囊 + 微信胶囊，无「‹ 动态/精华/活动/作品墙/成员」吸顶带）；滚动态下用户拿不到 tab 切换（动态/精华/活动/作品墙/成员 全部不可点），页内返回出口也归零，只剩系统手势
- 建议改法：复核 tabsPinned 阈值与 scroll-view onScroll 在真机滚动帧上的触发链（fixed 层未渲染 = 阈值未命中或事件未绑定），确保过阈值后吸顶带 + 88rpx 返回钮真实上屏
- 修复类别：单页

## subpackages/discover-extra/discover/history（2 条）

### R13-L06-D07　P1 / 可达性　批次 R13-B28
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`40dcf062af680ed7`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:309`
- 理想图依据：无基准，依据=组件规范（可点件热区 ≥88rpx 口径，EmptyState.vue 同口径自注）
- 现象：返回钮热区实测 72×72rpx=36px（:309 width、:310 height），低于 88rpx 热区口径；返回是本页唯一退出件（goBack 的 switchTab 只是 navigateBack fail 兜底，帧上胶囊只有 ···/◎ 无返回箭头）——同分包 segment/people 返回钮 R11 已扩到 88rpx 热区，本页漏改（P1：必点控件热区<88rpx 且没有替代出口）。
- 建议改法：按 segment.vue:226 配方把热区扩到 88rpx，::before 承载 72rpx 视觉白圆，负外边距补偿占位不移版。
- 修复类别：单页

### R13-L06-D08　P3 / 间距　批次 R13-B28
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`40dcf062af680ed7`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:406`
- 理想图依据：无基准，依据=规范文档 §1.4（--page-padding 32rpx）
- 现象：列表与统计卡左右留白实测 24rpx=12px（:406 padding: 0 24rpx，统计卡 margin 同取 24rpx），低于 §1.4 --page-padding 32rpx=16px；同分包 likes/segment/people 页左右均 32rpx——同域两页页边距取档不一（帧上 history 统计卡比 likes 页搜索框更贴屏幕边 4px）。
- 建议改法：页边距统一 var(--page-padding, 32rpx)。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/match-success（2 条）

### R13-L05-D10　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`cfda9d4f206820f2`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:462`
- 理想图依据：素材/理想效果图/匹配成功页面.png 副标题区（「你和 星野 互相喜欢了彼此」）
- 现象：副标题渲染 matchedWith=「你和 {name} 互相喜欢上了」（MatchSuccess.vue:84-86），理想图同位为「你和 星野 互相喜欢了彼此」；「TA」占位兜底是 R10-L06-D02/R11-L06-D01 在册口径不重报，本条只报固定短语差异——「互相喜欢上了」≠理想图「互相喜欢了彼此」，整句语感与理想图不符。
- 建议改法：zh-CN.ts matchSuccess.matchedWith 改「你和 {name} 互相喜欢了彼此」，en-US 同步。
- 修复类别：单页

### R13-L05-D11　P3 / 文案　批次 R13-B08
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`98399e7e97339af7`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:166`
- 理想图依据：素材/理想效果图/匹配成功页面.png 底部操作区（「分享喜悦」入口，帧 y≈777 同位）
- 现象：底部「分享喜悦」是模板里硬编码的中文字面量 `<text class="match-success__share-text">分享喜悦</text>`，未走 t()；同卡其余全部文案（匹配成功/立即聊天/继续探索/共同点标题）都走 i18n 词条，唯独这处绕过 zh-CN.ts:460-470 的 matchSuccess 段，en-US 档会漏翻成中文。
- 建议改法：matchSuccess 段新增 "shareJoy": "分享喜悦" 词条，模板改 `t('matchSuccess.shareJoy')`；不新增后端依赖。
- 修复类别：单页

## subpackages/discover-extra/discover/matching（2 条）

### R13-L05-D08　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`eefe5cc30cddb8f7`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:447`
- 理想图依据：素材/理想效果图/匹配中页面.png 标题区（「正在寻找有缘的Ta...」）
- 现象：页面主标题渲染 matching.searching=「正在寻找适合你的 TA」（MatchLoading.vue:93），理想图同位为「正在寻找有缘的Ta...」，两条文案语义相近但措辞整句不同；副标题「分析彼此兴趣，缘分匹配中」与理想图逐字一致，差异仅在主标题。
- 建议改法：zh-CN.ts matching.searching 词条对齐理想图措辞「正在寻找有缘的Ta...」（en-US 同步改），不动组件。
- 修复类别：单页

### R13-L05-D09　P2 / 尺寸比例　批次 R13-B07
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`f11708e0172299a3`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:339`
- 理想图依据：素材/理想效果图/匹配中页面.png 双头像主视觉区（y≈630-880，头像直径 229px/853 宽）
- 现象：双头像 `.match-loading__avatar` 168rpx（帧上 ≈85px），理想图同位头像 229px ÷2.275（853/375）≈100.7px ≈201rpx，实机比理想图缩小约 16%，主视觉双头像明显弱于理想图的占比，轨道环占比随之偏大。
- 建议改法：头像提到 200rpx 档，`.match-loading__avatar-area`（现 400×240rpx，MatchLoading.vue:241-242）同步加宽到 ≈560rpx 并重排 gap/爱心位，保证两圆+徽标仍在内容盒内。
- 修复类别：单页

## subpackages/discover-extra/home/segment（4 条）

### R13-L06-D01　P0 / 文案　批次 R13-B29
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`2c6ef56a6dc18ccf`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:177`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.1（内容真实可交付/素材唯一真相源口径）
- 现象：顶帧 9 行「在线」列表全是种子人格：4 行昵称是校名（「中山大学」「浙江大学」「武汉大学」「南开大学」，R11 剥掉的只是「演示·」前缀，剥完剩下的仍是校名非人名），「浙江大学 · 230km」同一句假距离在两帧共出现 3 次（顶帧「浙江大学」行＋底帧「程碩秋」「霍去病」两行，三个不同 userId 同一常量公里数）——页面标题承诺「细分发现 · 在线」，用户拿不到任何一个真实在线用户，点进 openProfile 拿到的也是占位档案（P0：关键内容整块缺席＋数据错到误导决策；nearby 页同象已 R12 在册，本页不在册）。
- 建议改法：getRecommendations 真实模式接真实在线用户（昵称/距离真值字段），种子行整批撤出真实模式；按 §12 只许接真字段或撤掉承诺，不得换一组常量续编。
- 修复类别：需新建目标功能

### R13-L06-D02　P2 / 字号　批次 R13-B29
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`2c6ef56a6dc18ccf`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:265`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级（页面主标题 26–28px）
- 现象：页头主标题「细分发现 · 在线」实测 44rpx=22px（帧上标题字面约 22px），低于 §1.3 页面主标题档 26–28px 下限 4px；同分包 nearby 页头同角色标题在 R12-L06-D08 已收到 52rpx=26px（其注释原文把「segment 44rpx」点名为三页三档之一），本页漏改——上一轮修了 people 没修 segment，同域两页页头字号两档。
- 建议改法：.segment-header__title 收到 52rpx（与 people 页同档），走字号令牌。
- 修复类别：CSS/token

### R13-L06-D03　P2 / 圆角　批次 R13-B29
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`ee9a25adb35197ed`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:309`
- 理想图依据：无基准，依据=规范文档 §1.4 圆角（卡片档 --card-radius 40rpx）
- 现象：列表行圆角 var(--r-lg)=20rpx=10px，只有 §1.4 卡片档 40rpx=20px 的一半（帧上卡角≈10px）；同域 nearby/people.vue 同角色列表行在 R12-L06-D09 已收口 var(--card-radius, 40rpx)（帧上 nearby 卡角≈20px）——上一轮同轴只修了 people 一页，segment 漏网，同域两页卡片圆角两档。
- 建议改法：.segment-row 圆角改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R13-L06-D04　P1 / 素材缺失　批次 R13-B29
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`ee9a25adb35197ed`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:174`
- 理想图依据：无基准，依据=规范文档 §1.1（素材唯一真相源）
- 现象：「武汉大学」行（顶帧第 3 行）与「聂云帆」行（底帧第 7 行）两个不同昵称的行渲染同一张蓝球衣足球场头像，两帧墨迹一致（同姿态/同球衣/同场地）；头像是用户识人的第一凭据，用户无法判断这是不是同一个人，点进两行拿到的是共享同一张脸的两个档案（P1：拿不到可辨识的真实用户身份）。
- 建议改法：头像与 userId 一一绑定走真媒体资产；推荐源接真实用户头像，种子人格池撤出真实模式（§12 接真字段或撤承诺）。
- 修复类别：需新建目标功能

## subpackages/discover-extra/likes-visitors/index（3 条）

### R13-L06-D11　P2 / 颜色token　批次 R13-B30
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`02dab6f4eebcee88`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:729`
- 理想图依据：无基准，依据=规范文档 §1.2 令牌档＋非文本图形 3:1 对比口径
- 现象：选中 Tab「喜欢我的」下方 48×4rpx 选中指示条取 --c-brand #36C99A（帧上绿色短横），压白/页底 #EEF7F2 实测约 1.9–2.1:1，低于非文本 3:1，选中态信号几乎读不出；同域 nearby people.vue 同类选中信号在 R10-L06-D12 已收 --c-brand-800 #156B51（约 6:1），本页漏改。
- 建议改法：指示条底色改 var(--c-brand-800, #156B51)。
- 修复类别：CSS/token

### R13-L06-D12　P3 / 字号　批次 R13-B30
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`02dab6f4eebcee88`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:744`
- 理想图依据：无基准，依据=规范文档 §1.3（极小档 10/11px 为全站下限）
- 现象：Tab 红角标内数字字号实测 18rpx=9px（帧上「喜欢我的」红点内「1」），低于 §1.3 极小档下限 10px（--fs-xs 20rpx），是全站最小档以下又私开的一档，且与 likes 页计数「1/2」的字面档不一致。
- 建议改法：角标字号收 --fs-xs（20rpx）档。
- 修复类别：CSS/token

### R13-L06-D13　P3 / 文案　批次 R13-B30
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`02dab6f4eebcee88`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:335`
- 理想图依据：无基准，依据=组件规范/既有 i18n 档（likes.monthDay 中英双档，zh-CN.ts:1441）
- 现象：同一条喜欢记录的时间，本页硬编码「9/15」（:335 模板串 `${m}/${d}`，绕过 i18n），同域 likes 页对同一事件渲染「9月15日」（小满·同日，两帧对照）——同域两页同一数据两种日期句式（同域两页取档不一）。
- 建议改法：formatTime 改走 t('likes.monthDay')，与 likes 页同一日期句式档。
- 修复类别：单页

## subpackages/discover-extra/likes/index（2 条）

### R13-L06-D09　P1 / 可达性　批次 R13-B31
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`9a2cb05be5411b7d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1125`
- 理想图依据：无基准，依据=组件规范（可点件热区 ≥88rpx 口径）
- 现象：返回钮热区实测 64×64rpx=32px（:1125 width、:1126 height，无任何热区补偿），低于 88rpx 口径；返回是本页唯一退出控件，帧上白圆字面仅约 32px——同分包 segment/people 同件均已是 88rpx 热区档（P1：必点控件热区<88rpx 且没有替代出口）。
- 建议改法：热区扩到 88rpx，::before 承载 64rpx 视觉白圆＋负外边距占位补偿（同 segment.vue:226 配方）。
- 修复类别：单页

### R13-L06-D10　P3 / 圆角　批次 R13-B31
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`665bdd07ac859ba1`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1271`
- 理想图依据：无基准，依据=规范文档 §1.4（卡片档 --card-radius 40rpx）
- 现象：「喜欢我的」粉卡圆角 var(--r-xl)=24rpx=12px（帧上卡角≈12px），而同域 likes-visitors 页卡片在 R11-L07-D05 已统一 --card-radius 40rpx=20px（帧上其概览卡角≈20px）——同域两页卡片圆角两档，likes 页漏收。
- 建议改法：.likes-card 圆角收 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

## subpackages/discover-extra/nearby/people（2 条）

### R13-L06-D05　P3 / 间距　批次 R13-B32
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`ba47b99b5142e179`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:437`
- 理想图依据：无基准，依据=规范文档 §1.4 间距（--sp 阶梯与 --card-padding 32rpx）
- 现象：列表行内边距实测 22rpx 24rpx——22rpx 不在 §1.4 间距阶梯（2/4/6/8/10/12/16/32/48）上，是页内私有一档；同域同角色 segment.vue:305 行是 20rpx 24rpx，规范 --card-padding 是 32rpx，同一身份的列表卡三档并存（帧上 nearby 卡内上留白≈11px、segment≈10px、规范 16px）。种子行/缺年龄等在册现象不在此卡范围。
- 建议改法：两页列表行内边距统一收同一档（--card-padding 32rpx 或同一阶梯值），删除 22rpx 私有值。
- 修复类别：CSS/token

### R13-L06-D06　P3 / 空态文案　批次 R13-B32
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`446ece39aadc5975`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:274`
- 理想图依据：无基准，依据=组件规范（列表尾态文案惯例）
- 现象：列表末尾只有一个恒空的 48rpx 占位 view：触底翻页（scroll-view @scrolltolower → loadMoreVisible，前端切片分页）请求进行中和翻完之后都没有「加载中…/没有更多了」任何尾态提示，bottom 帧滚到底只见下一张卡被截断（「陶然 22」半行），用户无从知道后面还有没有数据。
- 建议改法：footer 按状态渲染「加载中…」与「没有更多了」，复用站内既有尾态文案档（中英双档）。
- 修复类别：单页

## subpackages/discover/activities/index（5 条）

### R13-L13-D03　P1 / 颜色token　批次 R13-B33
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`44662a4ce8cc702c`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:715`
- 理想图依据：无基准，依据=规范文档 §1.2（主色深 brand-700 #1F8D6A 仅限按压态/深色文字）+ LegalTextPage.vue:553 已实测「brand-700 底白字 4.14:1 不达 4.5:1」的同仓结论
- 现象：「列表/日历」切换选中态（top 帧深绿药丸「列表」白字）底吃 --c-brand-700 #1F8D6A（:706），文字吃 --c-text-inverse = rgba(255,255,255,0.95)（design-variables.scss:749），实算约 4.0–4.14:1 <4.5:1；24rpx=12px/600 非大字号、不享豁免。LegalTextPage 同一结论处已改用 brand-800（LegalTextPage.vue:554），本页没跟。用户拿不到什么：低视力/强光环境下读不出选中项，「当前处于列表还是日历视图」这一页面主切换态不可辨。
- 建议改法：选中态底改 --c-brand-800 #156B51（同 token 族，白字 6.45:1，LegalTextPage.vue:554 同口径），前景归位 --c-neutral-0；未选中态白底灰字不动。
- 修复类别：CSS/token

### R13-L13-D04　P3 / 字号　批次 R13-B33
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`44662a4ce8cc702c`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:798`
- 理想图依据：无基准，依据=规范文档 §1.3（极小档 10/11px 只分配给「角标 · 法务」，标签档为 12–13px）
- 现象：每张活动卡右上角的「综合」分类标签字号 --fs-xs 20rpx=10px，落在 §1.3 的极小（角标/法务）档；top 帧 5 枚「综合」比同卡 12px 描述行还小一档，低于标签档 12–13px 下限两格。
- 建议改法：提到 --fs-md 26rpx=13px（标签档下限），padding/圆角不动。
- 修复类别：CSS/token

### R13-L13-D05　P2 / 颜色token　批次 R13-B33
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`44662a4ce8cc702c`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:869`
- 理想图依据：无基准，依据=规范文档 §1.2（边框 default #DDE3E0 / light #EEF2F0 的用途分层：light 只作分隔，描边交互件应取 default）
- 现象：卡内主操作「感兴趣」按钮描边 2rpx solid var(--c-border-light)＝#EEF2F0，压白卡 #FFFFFF 实算约 1.07:1，轮廓几乎不可辨——top 帧 3 张卡的「感兴趣」按钮只剩极淡一圈，按钮边界形近虚设。非关键描边取错档。
- 建议改法：描边改 var(--c-border-default) #DDE3E0（同 token 族上一档），其余样式不动。
- 修复类别：CSS/token

### R13-L13-D06　P2 / 颜色token　批次 R13-B33
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`623c59d6bb32c51c`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:898`
- 理想图依据：无基准，依据=规范文档 §1.2/§1.3（三级文本 #6B7571 与页底 #EEF7F2 同对色 4.36:1 已有在册实测，见 subpackages/market/detail/index.vue:559 注释）
- 现象：列表尾「没有更多活动了」footer 文字吃 --c-text-tertiary #6B7571 + --fs-sm 22rpx=11px（:897），且直接铺在页底 #EEF7F2 上（bottom 帧绿底灰字逐字可见），实算 4.36:1 <4.5:1——11px 次级文字落在 3:1–4.5:1 不达标区间。
- 建议改法：色提一档 --c-text-secondary #4A524E（同页底 7.37:1，market/detail/index.vue:559 同口径已落地），字号可不动。
- 修复类别：CSS/token

### R13-L13-D07　P3 / 素材缺失　批次 R13-B33
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`623c59d6bb32c51c`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:434`
- 理想图依据：无基准，依据=组件规范（列表卡头部「标题 + 分类标签 + 计数」三件套，本页 :427-:437 自定的行头结构）
- 现象：bottom 帧「环湖夜走第六期」「秋冬季草地音乐会」两卡头部右侧整块没有「N 人已报名」计数（只剩「综合」标签），而 top 帧三张卡都有（21/43/12）——计数为 0 时 v-if 把整块撤掉，同列卡片头部右缘取档不一、标题行右侧留白宽度逐卡漂移。
- 建议改法：计数为 0 时仍渲染「0 人已报名」占位（数据真值仍取后端 enrollmentCount，不造常量），保持行头三件套结构恒在。
- 修复类别：单页

## subpackages/discover/discussions/index（2 条）

### R13-L13-D01　P2 / 文案　批次 R13-B34
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`90e7eafeaa8eaa7f`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:135`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级 + 组件规范 SectionCard/feed-row「粗体标题 + 摘要」两级结构（subpackages/discover/discussions/index.vue:135/:146）
- 现象：列表首行（「热度上升」行）没有粗体主标题，整行只剩一行非粗摘要「今天在操场跑步遇到了很美的晚霞，随手拍了下来，分享给你们。」；同卡其余各行均为「粗体标题 + 可选摘要」两级（如「猫咪名字征集」+摘要）。两级列表首行塌成一级，扫读主键缺席——row-title 节点对空标题照样渲染空串、无兜底。
- 建议改法：数据侧按 §9 接真字段：getDiscussionRecommendations 契约把 title 补成必填（空标题行不出流水）；渲染侧在 title 为空时把该行摘要升级为主行字重，不新造常量文案。
- 修复类别：单页

### R13-L13-D02　P3 / 尺寸比例　批次 R13-B34
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`0e21e7e309623cf1`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:176`
- 理想图依据：无基准，依据=规范文档 §1.4 间距/描边走 rpx 令牌阶梯 + BottomActionBar.vue:136 同类描边用 1rpx 的同仓口径
- 现象：讨论行之间的分隔线写死 `border-top: 1px solid`（绝对物理像素），bottom 帧上 5 条行分隔线逐条可见；同仓按钮描边口径是 1rpx（BottomActionBar.vue:136）。1px 在 2x/3x 屏等于 2-3rpx，比令牌发丝线粗一倍且粗细随机型 DPR 漂移，与全站 rpx 阶梯不一。
- 建议改法：单位改 1rpx（色仍吃 --c-border-light 不动），与全站描边阶梯对齐。
- 修复类别：CSS/token

## subpackages/legal/agreement/index（2 条）

### R13-L13-D10　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`588234303570252a`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4719`
- 理想图依据：无基准，依据=规范文档 §1.3 法务文案口径 + 同串内全角标点体系（zh-CN.ts:4719 同串「反馈中心」等）
- 现象：导语「（以下简称"本服务"）（以下简称"我们"）」与第 1 条「点击"同意并继续"」共三处用半角直引号包中文（top 帧导语与第 1 条逐字可见），与同文档第 11 条「反馈中心」的全角引号口径不一。
- 建议改法：zh 侧三处统一改全角引号，与「反馈中心」写法对齐；内容零增删。
- 修复类别：单页

### R13-L13-D11　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`dada53f11c95d321`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4719`
- 理想图依据：无基准，依据=同文档内自有一致性口径（zh-CN.ts:4719 第 11 条「反馈中心」写法）
- 现象：同一份协议里第 8 条写「您可于 7 天内通过反馈中心申诉」（反馈中心无括号），第 11 条写「通过小程序内「反馈中心」提交」（有全角引号）——同一申诉入口两种写法，bottom 帧 8、11 两条同屏可对。
- 建议改法：第 8 条补全角引号作「反馈中心」，与第 11 条对齐；同串一次改齐。
- 修复类别：单页

## subpackages/legal/privacy/index（2 条）

### R13-L13-D08　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`4235795692afa606`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4727`
- 理想图依据：无基准，依据=规范文档 §1.3 法务文案口径 + 同页全角标点体系（《》、「」、（），见 zh-CN.ts:4727 同串内其余标点）
- 现象：正文首段「我们（"校园恋爱"运营方）」用半角直引号 \" 包中文（top 帧首段逐字可见），与同句全角圆括号、全文《》「」的全角标点体系混排不一。
- 建议改法：zh 侧统一改全角引号（「校园恋爱」或“校园恋爱”），en 侧文案不动；只改标点，不改承诺内容。
- 修复类别：单页

### R13-L13-D09　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`4bcf72b09eb6ba23`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4727`
- 理想图依据：无基准，依据=规范文档 §1.3 法务文案口径（面向用户解读，非开发语法）
- 现象：第 6 条面向用户的法务文案写「我们使用本地存储（uni.setStorage）保存登录态与偏好设置」，把内部代码 API 名 uni.setStorage 直接暴露在用户文本里（bottom 帧首两行逐字可见），非用户语言。
- 建议改法：撤掉括号内的代码名，只保留「本地存储」的通俗表述；不新增任何承诺。
- 修复类别：单页

## subpackages/market/detail/index（2 条）

### R13-L13-D12　P3 / 颜色token　批次 R13-B35
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`c0a9a2c3fcd13686`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:424`
- 理想图依据：无基准，依据=规范文档 §1.1 第 1 条「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ 同域 shop 页头透明底口径（subpackages/market/shop/index.vue:427）
- 现象：自绘导航带 .nav-bar 底色 --c-bg-container #FFFFFF，与其下页底 --c-bg-page #EEF7F2 在导航下缘形成一条清晰的白/绿断层（top 帧分界逐像素可辨）；同域 shop 页头是 transparent 吃页底绿，AppShell 系页头也吃 --c-bg-page（AppShell.vue:344），本页是全站少见的白底页头。封存卡内容本身按 ADR-2 封存口径不审不补。
- 建议改法：.nav-bar 底改 var(--c-bg-page) 与页底同色（阴影 :425 可一并删或保留），断层消失、与同域 shop 口径对齐。
- 修复类别：CSS/token

### R13-L13-D13　P3 / 空态文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`c0a9a2c3fcd13686`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:804`
- 理想图依据：无基准，依据=规范文档 §1.3 法务/说明句标点口径（全站说明句均带句末句号，如 discussions 副标题 zh-CN.ts:789、法务正文各条）
- 现象：封存空态说明句「该功能暂未开放，开放时间将另行通知」句末无标点（bottom 帧封存卡说明行逐字可见，本帧与 top 帧同图：页面不滚动、两态同屏），与全站说明句带句末句号的口径不一。封存卡内容按 ADR-2 不补，只修这一句标点。
- 建议改法：zh 串句末补全角句号（i18n 一处改齐，封存结构与开关逻辑零改动）。
- 修复类别：单页

## subpackages/market/shop/index（2 条）

### R13-L14-D01　P2 / 字号　批次 R13-B36
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`0b7271e904d5ab21`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:477`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.3 字体层级表「页面主标题 — 26–28px 700–800 页头标题」
- 现象：页头标题「逛逛」消费 `var(--fs-5xl, 44rpx)`（design-variables.scss:569 实值 44rpx），帧上 2 字墨迹宽约 45px@375px 帧 ⇒ 字高约 22.2px、字重 800，落在 §1.3 的「大标题 --fs-5xl 22px（卡片大标题）」档，比页头标题档 26–28px 低一整档（差约 4–6px）；wallet 页 R9-L14-D15 当年就是提来与 shop:477「同档」，两页同落错档。
- 建议改法：页头标题按 §1.3 页面主标题档取值（52–56rpx 一档，同域 wallet:318 同步），不要继续借卡片大标题档 --fs-5xl。
- 修复类别：CSS/token

### R13-L14-D02　P3 / 间距　批次 R13-B36
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`5099458c640e3c8f`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:765`
- 理想图依据：无基准，依据=design-variables.scss 令牌真值（--card-padding=32rpx:698、--sp-10=48rpx:557、--sp-8=32rpx、--sp-6=24rpx:552）+ 同域 wallet 封存卡同状态对照
- 现象：本页封存卡内衬 `padding: var(--card-padding)`＝32rpx 单值（帧上卡内左衬约 16px）、顶部 `margin-top: 60rpx`＝30px；同状态 wallet:390 仍是 `var(--sp-8) var(--sp-6)`＝32/24rpx（wallet 帧同位置左衬约 12px）、`margin: var(--sp-10) …`＝48rpx=24px ⇒ 同一句话同一张封存卡，两页横向内衬差 8rpx(4px)、顶部落位差 12rpx(6px)。R11-L14-D08 卡上已写明「三页完全对齐还依赖 wallet(:390) 同步」，本轮帧证实 wallet 未落——上一轮只修了一半，不对齐。
- 建议改法：wallet:389-390 与本页对齐——`margin: 60rpx var(--page-padding); padding: var(--card-padding);`（属 wallet 所在修复车道，本卡登记跨文件依赖）。
- 修复类别：单页

## subpackages/market/wallet/index（4 条）

### R13-L14-D03　P2 / 可达性　批次 R13-B37
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`fbf4b050d43bfd68`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:155`
- 理想图依据：无基准，依据=shop:278-284 R11-L14-D09 已实测结论（ICONS_COMMON.BACK 折线 #94A2B7/#9AA8BC 压白盘 2.4:1，非文本控件 3:1 底线）+ 同域 shop 返回盘互证
- 现象：返回盘内箭头仍消费 `IMAGE_PATHS.ICONS_COMMON.BACK`（config/images.ts:442 = common/back.png，折线 #94A2B7/#9AA8BC），帧上白盘内笔画为浅灰细线，对白盘约 2.4:1 < 3:1；封存分支（wallet:212-216）内这是全页唯一出口控件。shop:285 在 R11-L14-D09 已同轴换成 REGISTER_ICONS.BACK（images.ts:949，stroke #1A1E1C = --c-text-primary），wallet 没跟——同域同一控件两页两种描线素材，上一轮修得不对（只落了 shop）。盘本身白底压 brand-800 页头 6.45:1 且命中盒已 88rpx（wallet:298-305），用户仍可点 ⇒ 不升 P1。
- 建议改法：wallet:155 的 `:src` 换成 `IMAGE_PATHS.REGISTER_ICONS.BACK`（与 shop:285 同一枚既有 SVG，不新增素材）。
- 修复类别：单页

### R13-L14-D04　P3 / 颜色token　批次 R13-B37
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`fbf4b050d43bfd68`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:419`
- 理想图依据：无基准，依据=规范文档 §1.2 配色表（--c-text-secondary #4A524E 次文本 / --c-text-tertiary #6B7571 三级文本）+ design-variables.scss:363/364 + 同域 shop 同句互证
- 现象：同一句封存说明「该功能暂未开放，开放时间将另行通知」两页两档色——本页 `var(--c-text-tertiary, #94a3b8)`（真值 #6B7571，对白卡约 4.7:1，帧上为较浅灰），shop:797 在 R11-L14-D12 已改 `var(--c-text-secondary, #4A524E)`（约 8:1，shop 帧明显更深）；R11 该卡口径是「三页同域同状态同一行统一档」，本轮帧证实 wallet 未落——同域同句肉眼可辨的深浅差。4.7:1 仍过 4.5:1 底线 ⇒ 归 P3 取档不一，不按对比度升 P2。
- 建议改法：wallet:419 改 `color: var(--c-text-secondary);` 并清掉过期 tertiary 字面量兜底，与 shop:797 逐字同写法。
- 修复类别：CSS/token

### R13-L14-D05　P2 / 字号　批次 R13-B37
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`fbf4b050d43bfd68`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:318`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.3 字体层级表「页面主标题 — 26–28px 700–800 页头标题」
- 现象：页头标题「我的钱包」消费 `var(--fs-5xl, 44rpx)`，帧上 4 字墨迹宽约 89px ⇒ 约 22px/字、字重 800，落在卡片大标题档，比页头标题档 26–28px 低一整档。上一轮 R9-L14-D15 把它从 15px 提到 22px 只是为了与 shop「同档」，画面变了但仍没对齐规范那条轴——上一轮修得不对（与 R13-L14-D01 同根，两页需各自改）。
- 建议改法：与 shop:477 同批提到 §1.3 页头标题档（52–56rpx 一档），两页同一取值，不再互相引用错档。
- 修复类别：CSS/token

### R13-L14-D06　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`fbf4b050d43bfd68`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:804`
- 理想图依据：无基准，依据=apps/client/src/i18n/locales/zh-CN.ts:804（帧上文案逐字同源）+ 全仓机制核查
- 现象：帧上封存卡写「该功能暂未开放，开放时间将另行通知」（与 zh-CN.ts:804 逐字一致），但全仓没有任何兑现渠道——`requestSubscribeMessage` 仅出现在 stores/likes.ts:746（点赞通知场景），commerce 开闸无订阅消息、无「开放时间」字段、无公告拉取；「另行通知」是对用户的空头承诺（两页共用同一 key，shop 帧同象，在此登记一次）。不承诺任何时间的中性文案不属此类。
- 建议改法：二选一且按任务书 §9 合法形态——撤掉承诺：文案改「该功能暂未开放」（zh-CN.ts:804 一处，en-US.ts:715 同步）；或接真字段：由 app-config 下发开放时间/公告再恢复本句。不得编常量时间。
- 修复类别：单页

## subpackages/profile-extra/feedback/history（2 条）

### R13-L11-D03　P2 / 位置　批次 R13-B38
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`65022bf92cc3d22a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:349`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue:157-165（R6-L05-D02 空态垂直居中，组件侧 flex:1 已补、"宿主必须给可解析高度"登记给页面车道）
- 现象：空态块贴顶不居中：帧上图标+「暂无反馈记录」+副句整块实测 y=234..334，块中心 y≈284，而筛选条以下可用区（y≈180..790）中心 ≈485，整块偏高约 200px、其下 ~456px 全空——EmptyState 的 flex:1 居中因宿主未给高度而不生效（与 R6-L05-D02 在 circles/campus topic-detail 记录的同一现象）。
- 建议改法：给本页 EmptyState 的宿主链补可解析高度（页面内容区 flex:1 / EmptyState 外包一层 flex:1 容器），让组件侧 justify-content:center 生效。
- 修复类别：单页

### R13-L11-D04　P3 / 可达性　批次 R13-B38
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`c2bbdd7a500da675`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:353`
- 理想图依据：无基准，依据=组件规范 EmptyState.vue（actionText 即空态唯一行动出口的既有槽位）
- 现象：空态文案承诺「提交反馈后将在此处显示」，但本页没有任何去提交的出口：EmptyState 未传 action-text（:349-354），页内仅有 navigateBack（:209）；真正的提交页在 subpackages/support/feedback/index.vue，用户必须退回设置页另找入口。
- 建议改法：给 EmptyState 传 action-text（如「去提交反馈」）并 navigateTo 支持页的反馈提交页，与组件既有 action 槽位接通。
- 修复类别：单页

## subpackages/profile-extra/profile/album（2 条）

### R13-L10-D05　P2 / 可达性　批次 R13-B39
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`4e7c88a6e4e467cd`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:706`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2/§1.3（正文级对比 ≥4.5:1；13px 小字无大字豁免；仓内同判例 tasks.vue R12-L11-D03 把「0/4 已完成」从 tertiary 升 secondary）
- 现象：页头计数「1 / 6」用 --c-text-tertiary #6B7571、--fs-md=26rpx≈13px（:705-706）。帧实测字形墨色 (109,119,115)、字后底 (224,243,235)（渐变顶部档），实算对比 4.14:1 <4.5:1；即便页面底归口 #EEF7F2 也只有 4.33:1，仍不过线。它是用户判断相册容量的唯一读数。
- 建议改法：「1 / 6」升 --c-text-secondary #4A524E（同域 tasks 页头计数同配方），底色按 D06 归平后同过线。
- 修复类别：CSS/token

### R13-L10-D06　P3 / 颜色token　批次 R13-B39
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`4e7c88a6e4e467cd`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:633`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1（主题底色统一浅绿 #EEF7F2，页面间不得出现断层）
- 现象：页面底用 `var(--c-gradient-page)`（= linear-gradient(180deg,#DFF3EA,#EEF7F2)，design-variables.scss:181），顶部比规范值 #EEF7F2 深 13/255。帧实测本页 (8,60)=(224,243,234)=#E0F3EA、(8,120)=#E1F3EB，而同批同域 tasks 页同位置 (8,60)=#EEF7F2（tasks.vue:512 已按同判例归平）、location/favorites 亦恒 #EEF7F2 ⇒ 同域底色取档不一。tasks.vue:506-510 注释即此判例原文。
- 建议改法：.album-page 底改 var(--c-bg-page)，与同域各页同轨（相册页无渐变铺底场景）。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/favorites（3 条）

### R13-L10-D07　P2 / 位置　批次 R13-B40
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`3a1636b7830312c0`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:149`
- 理想图依据：无基准，依据=组件规范 src/components/common/EmptyState.vue:158-165（flex:1 + justify-content:center，要求父级「flex 列 + 有高度」）+ 全站设计规范与逐页设计稿说明.md §1.4
- 现象：上一轮修得不对：R11-L10-D18 用 `height:100vh` 想让空态垂直居中，但本帧（该修复已在源码生效后的新编译产物）空态块实测仍压在 y=151..308（星标 151-204、标题 219-231、说明 240-251、按钮 265-308），块中心 y≈229，而页头以下可用区（y≈100..814）中心是 y≈457 —— 内容仍顶在上三分之一，只比修前的 y≈218 下移了 11px。根因是仓内已写明的平台事实：album.vue:634 注释「mp-weixin 不支持 100vh」，本页却仍用 100vh 撑高度，EmptyState 的 flex:1 拿不到可解析的伸展空间。
- 建议改法：按 album.vue:634 同款配方把 height:100vh 改 height:100%（页面根元素铺满可视区域），让 EmptyState 的 flex:1 真正居中；修后复拍核空态块中心应落在 y≈457±20。
- 修复类别：单页

### R13-L10-D08　P2 / 字号　批次 R13-B40
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`3a1636b7830312c0`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:198`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.3（页面主标题 26–28px/700–800；--fs-7xl=56rpx=28px 为页头档，design-variables.scss:572）
- 现象：页头标题「我的收藏（0）」用 var(--fs-xl, 32rpx)=30rpx=15px（正文档）充当页头标题，帧实测字形带高 13px 渲染；同域 location（:345）/album（:699）/privacy 三页页头均已是 --fs-7xl=56rpx，帧实测 27px —— 同域五页两种页头档，本页标题小了近一半，且 :198 兜底 32rpx 与令牌真值 30rpx 不符（又一处假兜底）。
- 建议改法：标题升 var(--fs-7xl) 并删 32rpx 假兜底，与 location/album/privacy 三页同批取齐。
- 修复类别：CSS/token

### R13-L10-D09　P3 / 颜色token　批次 R13-B40
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`3a1636b7830312c0`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:244`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1/§1.2（一令牌一值；--c-text-primary #1A1E1C / secondary #4A524E / tertiary #6B7571 / $brand-500 #36C99A = design-variables.scss:15）
- 现象：全页文字色兜底是一套外来色系：:200/:208/:232/:234 写 #1E1E1E、:204/:209/:236 写 #666666、:233/:240 写 #999999，全部与对应令牌真值不符（真值 #1A1E1C/#4A524E/#6B7571），是永不生效假兜底；:244-245 的「取消收藏」描边和文字兜底写 #2DB98A，而 --c-brand-500 真值是 #36C99A。另 :206-209 的 .favorites-empty* 四条规则自 R6-B56 改用 EmptyState 组件起模板已无消费者，属携带这套非法值的孤儿样式。
- 建议改法：清全套假兜底归 var(--c-text-*)、brand 兜底改 #36C99A；.favorites-empty* 孤儿块整块删除。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/location（2 条）

### R13-L10-D01　P3 / 颜色token　批次 R13-B41
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`dc76ff254aaf2d5e`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:452`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1（一令牌一值，页面只引用 var(--c-*)）+ §1.2（--c-bg-page 真值 #EEF7F2，design-variables.scss:127）
- 现象：白卡内「经度 — · 纬度 —」信息条的底写 `var(--c-bg-page, #F4F7F5)`：令牌真值是 #EEF7F2（design-variables.scss:127），兜底却写 #F4F7F5，永不生效的假兜底；且把「页面底色」令牌当卡内浅底块用（规范里该角色是 --c-bg-surface）。帧实测该条底色 (238,247,242) 与页面底 (8,500) 同值。同款假兜底还有 :496（地图层底写 `var(--c-bg-page, #E8EEF2)`，兜底又是一个第三种色值）。
- 建议改法：浅底块角色改引 --c-bg-surface 并清掉 :452/:496 两处与真值不符的假兜底数字。
- 修复类别：CSS/token

### R13-L10-D02　P3 / 圆角　批次 R13-B41
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`bb93d84e89de2903`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:428`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.4（圆角档 4/8/12/20/24/32/9999rpx，无 16rpx 档；--r-lg 真值 20rpx = design-variables.scss:445）
- 现象：「所属校区」chip 与「经度 — · 纬度 —」信息条（:428/:451 两处）裸写 `border-radius: 16rpx`，16rpx 不在 §1.4 圆角七档里，也不引 var(--r-*)；帧上该信息条圆角实测约 8px 渲染高 ≈16rpx，与同页地图引导卡 var(--r-lg)=20rpx（:517）同屏两档。
- 建议改法：两处 16rpx 归 var(--r-lg, 20rpx)，与同页 :517 同轨。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（1 条）

### R13-L09-D06　P2 / 层级遮挡　批次 R13-B42
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`ab0c4cd0078d6823`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:463`
- 理想图依据：素材/理想效果图/他人显示主页.png 为静态首屏不含滚动态；依据=规范文档§1.6 mp-weixin 渲染铁律（胶囊避让）+ 仓内同域配方（visitors.vue:386 注释「右侧计数被微信胶囊遮挡，预留胶囊宽度（约 96px）」）
- 现象：滚动到底帧实测：身份卡右侧「喜欢」胶囊（PublicIdentity.vue:77）顶缘 y≈3px、压住状态栏电量/wifi 图标区（y≈15..27）；「打招呼」胶囊顶缘 y≈73 与微信胶囊（下缘 y≈77）交叠 ≈4px，胶囊白底盖住其右上角。R6-B58/D05 的 fixed 头部只给返回/更多两钮做了 --statusbar/--capsule-right 避让（:454-461 注释逐字），滚动内容层没有同款顶部避让/渐变遮罩，内容可一路顶进状态栏与胶囊区
- 建议改法：给滚动内容层加 --statusbar 高度的顶部渐变遮罩（把 hero 顶已有的 --overlay-hero 延长到滚动态），或滚动态给身份卡加 padding-top 避让，沿用 messages 头部同一条已验证配方；判 P2 因底栏 RelationshipCTA 有同两动作的 92rpx 复本，不构成「无替代出口」的 P1
- 修复类别：单页

## subpackages/profile-extra/profile/privacy（2 条）

### R13-L10-D03　P3 / 颜色token　批次 R13-B43
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`928fb4f7d05893a9`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:370`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（--c-text-primary 真值 #1A1E1C）
- 现象：设置行主文字 `.privacy-item__title` 写 `color: var(--c-text-primary, #333A37)`，令牌真值 #1A1E1C，兜底 #333A37 是第三种色值、永不生效的假兜底；同页 `.privacy-entry__title`（:477）同角色已是无兜底纯 var 引用，同页两制。帧上「允许将我推荐给本校学生」等行主文字渲的是真值，视觉无差，属令牌卫生问题。
- 建议改法：删掉 #333A37 假兜底，与 :477 同款写纯 var(--c-text-primary)。
- 修复类别：CSS/token

### R13-L10-D04　P3 / 颜色token　批次 R13-B43
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`5b0466ca83f64291`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:349`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（分隔线应走边框令牌族；--c-divider-light 真值 rgba(15,23,42,0.06) = design-variables.scss:150/:660）
- 现象：开关卡行分隔与入口卡行分隔（:349/:464 两处）写 `border-bottom: 1rpx solid var(--c-divider-light, #f0f0f0)`，令牌真值是 6% 黑 rgba(15,23,42,0.06)，兜底 #f0f0f0 与真值不符（永不生效假兜底）。帧上「允许推荐…/接收同校信息…」两行间的分隔线渲的是真值细线，代码与令牌表不一致。
- 建议改法：删两处 #f0f0f0 假兜底，写纯 var(--c-divider-light)。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/tasks（2 条）

### R13-L10-D10　P2 / 字号　批次 R13-B44
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`3b64c3daff7f24f7`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:556`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.3（页面主标题 26–28px；--fs-7xl=56rpx=28px 页头档 design-variables.scss:572；--fs-5xl=44rpx=22px 是卡片大标题档）
- 现象：页头标题「任务中心」用 --fs-5xl=44rpx=22px（§1.3 卡片大标题档），帧实测字形带高 20px 渲染；同域 location（:345）/album（:699）页头均已按 R11-L10-D07 判例升 --fs-7xl=56rpx、帧实测 27px —— 同域页头两种档，本页漏在同一批收口之外。R12-B50 只动了本页颜色token，此轴未在其批次内。
- 建议改法：:556 归 var(--fs-7xl)，与 location/album/privacy 页头同档。
- 修复类别：CSS/token

### R13-L10-D11　P2 / 可达性　批次 R13-B44
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`ce89760e5f83ebaa`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:602`
- 理想图依据：无基准，依据=组件规范（仓内同判例 privacy.vue R7-L10-D12：近白控件压白卡 Δlum≤12 不可辨判可达性 P2，改深描边配方）+ 全站设计规范与逐页设计稿说明.md §1.2（非文字 UI 件边界 ≥3:1）
- 现象：进度条轨道 `.tasks-summary__bar` 底为 --c-neutral-100 #EEF2F0（design-variables.scss:91），直接压白卡。帧实测轨道 (238,242,240) vs 卡底 (255,255,255)，对比 ≈1.13:1，远低于非文字 UI 件 3:1 下限；0% 填充时这条轨道是「进度条存在」的唯一视觉证据，边界几乎不可辨（帧上仅隐约一条浅痕）。
- 建议改法：按 privacy 自绘开关同配方给轨道加深一档底色或补 --c-border-default 描边，使轨道对白卡 ≥3:1；填充色 --c-gradient-brand 不动。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/visitors（2 条）

### R13-L09-D04　P2 / 可达性　批次 R13-B45
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`036bea2d205e3729`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:403`
- 理想图依据：无基准，依据=组件规范/仓内热区口径（同文件 visitors.vue:543 注释逐字「低于仓内 88rpx 热区口径」——本页自家已执行的标准）
- 现象：自定义导航返回钮 .visitors-header__back 写死 64rpx×64rpx（:403-404），低于同文件 :543 自认的 88rpx 热区口径 24rpx；本页 navigationStyle=custom，页头返回是唯一站内出口（空态页无其他可点节点），热区不足靠系统手势兜底
- 建议改法：.visitors-header__back 补 min-width/min-height 88rpx + box-sizing:border-box（保 64rpx 视觉圆底、热区外扩），复用同页 R10-L09-D10 给「编辑资料」钮补热区的既有配方；判 P2 因胶囊/系统返回手势仍构成替代出口，未达 P1「没有替代出口」
- 修复类别：单页

### R13-L09-D05　P3 / 位置　批次 R13-B45
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`036bea2d205e3729`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:418`
- 理想图依据：无基准，依据=规范文档§3 同域页头取档（settings/verification/real-name 三页帧实测标题均居中 x≈188、≈17px 档）
- 现象：本页页头标题「谁看过我」实测左置（贴返回钮 margin-left --sp-4，--fs-5xl 22px 大字档，:418-423），是本轮 5 页 10 帧中唯一非居中标题页；与同分包同域页头的居中导航标题档不一致（注：R8-L09-D22 修的是 space-between 分布孤儿化，非标题取档，本条不与其重复）
- 建议改法：与同域统一取居中导航标题档（或全站统一大标题档后归口），改 .visitors-header__title 对齐与字号两处即可，属一致性收口
- 修复类别：单页

## subpackages/profile-extra/settings/dnd（2 条）

### R13-L11-D01　P2 / 颜色token　批次 R13-B46
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`9f392634dd82881e`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:844`
- 理想图依据：无基准，依据=规范文档§1.2（边框档 border-strong=#C2CAC6，theme/design-variables.scss:191）+ 组件规范（表单行选中/未选中双态必须可辨）
- 现象：「重复方式」未选中单选圈环 2rpx 取 --c-border-strong #C2CAC6，白卡上标称对比 1.67:1；帧上「每天」行圈环（x≈346,y≈386）最暗墨迹实测 #E2E6E3（≈1.24:1），低于非文本 UI 组件 3:1 下限——未选项的圆圈几乎看不见，用户分不清"这一行是单选控件"。
- 建议改法：未选中态圈环升到 3:1 以上的既有深档（如 --c-neutral-500 系描边或把 2rpx 提到 4rpx 同色加粗），选中态绿环不动。
- 修复类别：CSS/token

### R13-L11-D02　P3 / 可达性　批次 R13-B46
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`153b69bedc45a8ee`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:812`
- 理想图依据：无基准，依据=规范文档§1.2（--c-border-strong #C2CAC6 为描边档非文字档）+ 组件规范（可点 affordance 需可辨）
- 现象：「开始/结束时间」行 22:00、08:00 右侧的「›」picker 箭头取 --c-border-strong #C2CAC6（帧上 y≈262、x≥336 区域采样无任何深于 #C2CAC6 档的墨迹，白底上 ≈1.7:1），32rpx 字重 300 的箭头在帧上几乎不可见，用户读不出"时间可点改"。
- 建议改法：箭头色升 --c-text-tertiary #6B7571（白卡 4.8:1）并保留 32rpx 档，与全站列表行箭头同轨。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/index（2 条）

### R13-L09-D01　P2 / 字号　批次 R13-B47
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`438c67a108e48a62`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:878`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（「正文 --fs-xl/2xl 15/16px，用途：正文·列表主文字」档）
- 现象：全部菜单行主文字（反馈与帮助/编辑资料/我的动态等 13 行）实测墨迹高 ≈14px，代码写 --fs-lg 28rpx（:878），比 §1.3 给「列表主文字」定的 15/16px 正文档低一档；同屏 section 标题（24rpx）与行文字只差一档，列表主文字读成辅助档
- 建议改法：.menu-item__label 收 --fs-xl 30rpx（15px）正文档，内衬与行高不动，一处换档全局生效
- 修复类别：CSS/token

### R13-L09-D02　P3 / 颜色token　批次 R13-B47
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`62c56a038253cbfc`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:396`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（--c-bg-page 用途注记「全站页面背景」，非图标底座）+ 同页其余分组实测取档
- 现象：「关于」组 4 枚图标底座（用户协议/隐私政策/检查更新/关于我们）全部写 var(--c-bg-page, #EEF7F2)（:396/402/408/414），帧上实测 ≈(233,242,239)——与页面底色同值，白卡上读作「无底座裸图标」；同页其余 7 组底座均为彩色令牌（帧上存储管理组实测 (237,233,254) 淡紫、隐私组淡蓝/淡粉），本页 4:7 取档不一
- 建议改法：aboutMenus 4 项 bgColor 换既有彩底令牌（如 --c-lavender-100 / --c-tint-blue-soft 按语义分配），与全页图标底座体系对齐
- 修复类别：单页

## subpackages/profile-extra/verification/index（1 条）

### R13-L09-D03　P3 / 颜色token　批次 R13-B48
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`7c686f3e67186fb1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:155`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（语义色相按角色取档；R8-L09-D12 已裁定本页未认证态走紫色族）
- 现象：「认证权益」同组三枚图标实测两种色相体系：专属标识扳手 (168,184,199)≈#A8B8C7、互动资格气泡 (184,200,209)≈#B8C8D1（灰蓝族），专属权益礼盒 (245,197,142)≈#F5C58E（琥珀族），三卡底座同为薄荷 #E8FAF3；组内 2:1 双色相与标题无语义对应，与刚裁定的「未认证=紫字紫底」状态卡也不相干，读作素材随手混排
- 建议改法：benefits 三枚图标（:155-157 ICONS_EMOJI.TARGET/GIFT/CHAT）换同一色相族的既有素材，或出一版单色 token 化图标随语义上色；跨树素材批处理登记共享车道，不在本页散改
- 修复类别：单页

## subpackages/setup/campus/index（2 条）

### R13-L12-D01　P3 / 文案　批次 R13-B49
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`8d92aab5b0ad77e3`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:298`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1/§3 组件规范（同屏信息不重复承诺）
- 现象：页头副标题「认证后解锁同校专属匹配与校友圈子」（zh-CN.ts:3192，本文件 :219 传入 AppShell）与页尾绿色价值卡「完成校园认证，解锁同校专属匹配、校友圈子权限。认证信息仅用于匹配推荐，严格保密。」（zh-CN.ts:3206，本文件 :298 渲染）同屏重复同一承诺——「解锁同校匹配 + 校友圈子」首尾各出现一次，帧上两段绿字只差措辞。
- 建议改法：价值卡只保留隐私承诺句「认证信息仅用于匹配推荐，严格保密」（复用 privacyContent 键），解锁承诺只留页头副标题一处。
- 修复类别：单页

### R13-L12-D02　P3 / 字号　批次 R13-B49
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`7bd26beee541fc66`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:381`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.3 字体层级表（「标签」档 12–13px；10/11px 仅限角标·法务）
- 现象：帧上表单字段标签「城市 / 学校 / 专业」取 --fs-sm=22rpx=11px（design-variables.scss:561，本文件 :381 font-size:var(--fs-sm)），落在 §1.3 的「角标·法务」档，低于「标签·时间戳」档下限 12px；与同流程 schedule 的 .field-label（schedule/index.vue:227 同档）一致地整体偏小一档，与 R11-L12-D03 把进度条文字从 10px 角标档抬到 12px 标签档的判法同族。
- 建议改法：.form-row__label 与 schedule .field-label 一并提到 --fs-base（24rpx=12px，§1.3 标签档下限）。
- 修复类别：CSS/token

## subpackages/setup/interest/index（2 条）

### R13-L12-D08　P2 / 字号　批次 R13-B50
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`f7a4941be9440484`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:212`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.3（页面主标题档 26–28px 700–800）+ AppShell.vue:405（.shell__title=--fs-7xl 56rpx=28px 既有页头口径）
- 现象：帧上页头主标题「选择兴趣」仅 44rpx=22px/800（:212 font-size:44rpx），落在 §1.3 的「卡片大标题」档而非页头档（26–28px）；同流程 campus/schedule/recommend-pref/feedback 四页页头走 AppShell .shell__title=56rpx=28px，帧间对比「选择兴趣」明显小一档——22px 正是 R10-L07-D08 在其他页判为字号 P2 的同象（AppShell.vue:399-405 注释自陈该档为已修缺陷档）。
- 建议改法：标题提到 var(--fs-7xl, 56rpx)，或整页并入 AppShell 页头（同时消掉自建返回键与 AppShell 返回胶囊的款式差）。
- 修复类别：单页

### R13-L12-D09　P3 / 文案　批次 R13-B10
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`f7a4941be9440484`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:221`
- 理想图依据：无基准，依据=组件规范（同屏计数单一份原则，R6-B68/D11 删重复标签的既定判法）
- 现象：帧上同一屏出现两枚同值计数——「已选标签」横幅右上「已选 0/5」（zh-CN.ts:3060，TagSelector.vue:182）与「兴趣」组头右侧「0/5」（TagSelector.vue:221）；本页只渲染 interest 一个分组（interest/index.vue:133 传 groups=['interest']），totalMax 恒等于该组 max=5，两枚读数永远相同，是同一信息的双份渲染。
- 建议改法：二留一：保留横幅计数与「暂未选择任何标签」空态句，单分组场景下隐去组头计数（TagSelector 内按 visibleGroups.length===1 判断）。
- 修复类别：单页

## subpackages/setup/profile/index（3 条）

### R13-L11-D09　P1 / 可达性　批次 R13-B51
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`a8b39a3985b7bfdb`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1571`
- 理想图依据：无基准，依据=规范文档§1.2（主色 #36C99A 压白字 ≈2.1:1 为全站已判废组合，见 EmptyState.vue:221-229 R10-L04-D05「全站深绿实心+白字口径归一」）+ §1.3 小字档可读前提
- 现象：头像左下「换头像」胶囊标签（帧上 x≈48..101,y≈482..506）为 20rpx 白字压 --c-brand #36C99A 实底（:1571 底 + :1578 #ffffff），对比 2.10:1——用户拿不到这个入口的可读标签：10px 字在帧上糊成一片，头像更换功能只能靠猜整颗头像可点；这正是 R10-L04-D05 已在全站判废并归一为「深绿实心+白字」的同型组合，本页漏改。
- 建议改法：徽标底换 --c-brand-800 #156B51（白字 6.45:1，与 BottomActionBar/LegalTextPage 主 CTA 同档），字号升到 22rpx 档。
- 修复类别：CSS/token

### R13-L11-D10　P3 / 可达性　批次 R13-B51
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`a8b39a3985b7bfdb`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1715`
- 理想图依据：无基准，依据=组件规范（photos 删除控件热区按 AppShell.vue:334 仓内 88rpx 口径）
- 现象：照片墙已传照片右上角的「×」删除钮热区仅 40×40rpx（=20px，:1715-1716），且是页内唯一移除已传照片的出口（照片本体无点击处理）——想删错传的照片要命中 20px 见方的小目标，低于仓内 88rpx 触控下限过半。
- 建议改法：保持 40rpx 视觉图标不动，把热区宿主扩到 ≥88rpx（负 margin/透明外扩，同 official-chat :1046 R11-L11-D23 配方）。
- 修复类别：单页

### R13-L11-D11　P2 / 可达性　批次 R13-B51
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`1c30bbcc2d9ceaaa`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1503`
- 理想图依据：无基准，依据=规范文档§1.3（法务/注释档 12px 走 --fs-sm，次级文字 ≥3:1、正文级 ≥4.5:1）+ §1.2 文本色档
- 现象：页底安全说明「资料仅用于校园身份核验与匹配推荐，保存后即时生效」取 --c-text-tertiary #6B7571（:1503）压页面浅绿底（帧上该行 y≈754..764，行底实测 ≈#EDF6F1），对比 ≈4.3:1，落在 3:1–4.5:1 的次级文字不达标带——11px 说明文字是本页唯一的数据用途告知，读起来发虚。
- 建议改法：色升 --c-text-secondary #4A524E（同底 ≈7.2:1），字号档与行高 1.75 不动。
- 修复类别：CSS/token

## subpackages/setup/recommend-pref/index（3 条）

### R13-L12-D05　P2 / 颜色token　批次 R13-B52
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`44fc4c8671c3e281`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:390`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1（主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层）
- 现象：帧上整页白底——:390 page{background:var(--c-bg-container)}（#FFFFFF），违反 §1.1；:387 注释自陈这只是一次「裸字面量换令牌、渲染值同为 #FFFFFF 零像素变化」，而同流程 campus/interest 已是浅绿 #EEF7F2（campus/index.vue:482、interest/index.vue:155），注册流 2/4 步绿底、3/4 步白底，页间切换出现白/绿断层。
- 建议改法：:390 改 background:var(--c-bg-page, #EEF7F2)。
- 修复类别：CSS/token

### R13-L12-D06　P3 / 文案　批次 R13-B52
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`44fc4c8671c3e281`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:240`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1 + 交底规矩 §12（无后端真相源的内容只能接真字段或撤掉承诺，不许常量式充当真值）
- 现象：帧上「校园优先」卡副标题「启用后同校用户推荐权重+30%并排序靠前」（zh-CN.ts:3242，本文件 :240 绑定）把一个前端写死的数字承诺成推荐算法权重；本页提交体只有 preferredTime/scope/campusPriority 三字段（recommend-pref/index.vue:130-139），后端契约没有「+30%」可接的真值字段；另有「权重+30%并」全半角/缺空格问题。
- 建议改法：撤掉具体数字——副标题改「启用后同校用户优先推荐排序」（不引入新常量）；或由后端下发真实权重字段后再展示数值。
- 修复类别：单页

### R13-L12-D07　P3 / 位置　批次 R13-B52
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`06d0bcc3d69dc243`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:257`
- 理想图依据：无基准，依据=组件规范（BottomActionBar.vue:11-19 吸底变体约定；同流程 campus:316-320 / schedule:199-204 / interest:143-148 均已传 fixed）
- 现象：帧上「保存」按钮未吸底——:257-260 的 BottomActionBar 没传 fixed，按钮随内容流落位、下缘与视口底之间留有空白带且无 safe-area 内边距；组件自陈注释（BottomActionBar.vue:13-14）里点名的旧象「recommend-pref 帧按钮底距 home 指示条 94px」正是这个未接入口径，同流程其余三页均已修，本页是注册流里唯一没吸底的主 CTA。
- 建议改法：传 fixed 并在正文尾部补 .cta-spacer（height:calc(152rpx + env(safe-area-inset-bottom))，同 schedule/index.vue:220-222 档）。
- 修复类别：单页

## subpackages/setup/schedule/index（2 条）

### R13-L12-D03　P2 / 颜色token　批次 R13-B53
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`82d58909db35614f`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:318`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1（主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层）
- 现象：帧上整页白底——:318 page{background:var(--c-bg-container)}（#FFFFFF），违反 §1.1 浅绿底铁律；同注册流程 campus 已按 R10-L12-D03 把同一处白底回退为 --c-bg-page #EEF7F2（campus/index.vue:482），interest 也是浅绿底（interest/index.vue:155），用户从 campus/interest 步进到本页时页面底色绿→白跳变。R10 的浅绿统一批漏掉了本页。
- 建议改法：:318 改 background:var(--c-bg-page, #EEF7F2)（与 campus/index.vue:482 同档）。
- 修复类别：CSS/token

### R13-L12-D04　P3 / 可达性　批次 R13-B53
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`f8aa20b42b4d7fd8`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:201`
- 理想图依据：无基准，依据=组件规范（同流程同口径：campus/index.vue:309-314 R11-L12-D09 的既定判法）
- 现象：帧上「保存并继续」为 #DCE5E2 灰钮（BottomActionBar.vue:123-127 禁用档）；组件 @tap 是 `!disabled && emit`（BottomActionBar.vue:64），空表单时点击被整口吞掉，save() 里两条必填定位 toast（schedule/index.vue:85-94）成为不可达死代码——点按钮零反馈。同一注册流程里 campus 的同象已被 R11-L12-D09 反向修掉（campus/index.vue:309-314：去 disabled、按钮常亮、由 save() toast 给缺失提示），本页是同流程里口径相反的漏改页。
- 建议改法：与 campus 同口径去掉 :disabled（canSave 仅保留视觉灰档或一并去掉），让 save() 的 toast 守卫可达。
- 修复类别：单页

## subpackages/support/feedback/index（2 条）

### R13-L12-D10　P1 / 颜色token　批次 R13-B54
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`6c3e6c2950c3afa9`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:660`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（主按钮/选中态用色与对比要求）+ BottomActionBar.vue:105-108 对同一 #36C99A 底白字实测 1.83–2.10:1 的在案读数
- 现象：帧上选中的「反馈」分类 chip 为白字压 --c-brand #36C99A（.chip--active，:659-663 background:var(--c-brand); color:var(--c-text-inverse)），对比 ≈2.1:1（与 R6-L14-D15 对主按钮同底色测得的 1.83–2.10:1 同值），远低于正文级 4.5:1；用户拿不到的是「当前提交类别」的可读性——切到「建议」或「活动提案」后被选项同样变白字压浅绿，三个 chip 里被选中的那个永远是画面上最不可读的标签，主按钮同底色已因这条读数改档 #156B51（BottomActionBar.vue:108），chip 漏改。
- 建议改法：选中档改「--c-bg-brand 浅绿底 + --c-brand-800 #156B51 文字 + --c-brand-700 描边」（同 recommend-pref/index.vue:328-335 .option-item--active 已定档），文字对比 6.45:1。
- 修复类别：CSS/token

### R13-L12-D11　P3 / 间距　批次 R13-B54
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`e9f2a073d5ffcbae`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:569`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.4（区块间距 --section-gap 24rpx / 卡片内边距 --card-padding 32rpx 档）
- 现象：帧上「新建提交」卡内相机占位格下方有约 60px 的空白色带——.action-bar-spacer（:569，height:120rpx，:894-896）是 R7-L13-D04 给「主 CTA 出流后在原位保留同等高度」用的占位，但 CTA 现在是吸底 fixed（:563-567），且本页底部另有页面级 .fixed-bar-clear（:622、:899-901）承担滚动避让；卡内这 120rpx 成为纯死空间，使第一张卡在相机格之后拖出一段与 §1.4 间距档都不对应的空白，bottom 帧（卡片尾段可见）读数最直观。
- 建议改法：删除卡内 .action-bar-spacer（模板 :569 与样式 :894-896），滚动避让职责全权交给页面级 .fixed-bar-clear。
- 修复类别：单页

## subpackages/tools/activities/detail（1 条）

### R13-L08-D06　P3 / 字号　批次 R13-B55
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`1e1848656887b355`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:898`
- 理想图依据：无基准，依据=规范文档§1.3 字号令牌真值表（--fs-lg=28rpx、--fs-base=24rpx，design-variables.scss:562-564）+ 本文件 R11-L08-D16 已清 color 假真值的同款口径
- 现象：底部操作栏「分享」「退出报名」标签声明 var(--fs-lg, 32rpx)（:898、:937），兜底 32rpx(16px) 与 --fs-lg 真值 28rpx(14px) 不符，:811 var(--fs-base, 26rpx) 同款（真值 24rpx）——帧上当前靠活令牌渲染 14px/12px，令牌一旦未注入三处标签同时跳 16px/13px 档
- 建议改法：三处兜底字面量改回令牌真值（28rpx/24rpx），不改任何帧面表现；与 R11-L08-D16 清 color 假真值同批次收尾
- 修复类别：CSS/token

## subpackages/tools/help/index（2 条）

### R13-L07-D03　P3 / 文案　批次 R13-B56
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`4b11c15f4dd0e102`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:79`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1 第 3 条（承诺与产物一致）+ 组件规范列表行（标签+值）惯例
- 现象：「客服邮箱」行的唯一动作是复制邮箱（copyEmail 把 APP_CONFIG.SUPPORT_EMAIL 写进剪贴板），但行内只渲染标签「客服邮箱」+ 说明「服务时间：9:00-21:00」（:165-166），邮箱地址本身在页面上不存在——用户复制了一个全程不可见、不可核对的字符串
- 建议改法：:166 说明行并列展示真实邮箱地址（i18n 走既有键拼 APP_CONFIG.SUPPORT_EMAIL），或复制成功 toast 带出地址
- 修复类别：单页

### R13-L07-D04　P2 / 可达性　批次 R13-B56
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`0030eb1826fcc136`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:320`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（--c-text-tertiary 用途=弱说明）+ §1.3（20rpx=10px 属「极小：角标·法务」档，不享对比豁免）
- 现象：页脚服务说明为 --f-xs(20rpx=10px) + --c-text-tertiary：帧实测页脚最暗墨 (106,116,112)≈#6A7470（即令牌 #6B7571 的渲染），压页面底 #EEF7F2 对比 4.31:1 <4.5:1，落在 3:1–4.5:1 次级带——10px 法务小字读得吃力
- 建议改法：:321 墨色升一档 --c-text-secondary（#4A524E 对 #EEF7F2 ≈7:1），字号不动
- 修复类别：CSS/token

## subpackages/tools/love-center/consulting（2 条）

### R13-L08-D04　P2 / 颜色token　批次 R13-B57
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`aca053fc3147e893`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:200`
- 理想图依据：无基准，依据=规范文档§1.2 色板 + 同仓裁定先例 R10-L08-D14（brand-700 压白 4.14:1 已被明判「不达 4.5:1 ⇒ 不采」）
- 现象：封存卡内本页（除返回钮外）唯一可交互出口「帮助与客服」的 14px/600 标签取 --c-brand-700 #1F8D6A（帧上墨迹实测 (3,127,87) 同族）压白卡面实算 4.14:1 <4.5:1；封存态下用户唯一的功能性出口标签落在次级可读带
- 建议改法：:200 标签色改 --c-brand-800 #156B51（压白 6.45:1）；2rpx 描边可保留 --c-brand-500 标示可点边界
- 修复类别：CSS/token

### R13-L08-D05　P3 / 字号　批次 R13-B57
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`ef2bcc86dc35c4b5`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:218`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（卡片大标题 22px/标题 18px 档）+ 组件规范（同域门卡 LockScreen.vue:702 主标题取 --fs-3xl 18px）
- 现象：封存卡主标题「功能封存中」取 --fs-xl(真值 30rpx=15px)，帧上墨迹带仅 12px（y259–270），比同域同为「门卡主标题」的 LockScreen 帧墨迹 15px（--fs-3xl 18px）低一整档，同域两页取档不一；且该行兜底字面量写 34rpx 与 --fs-xl 真值 30rpx（design-variables.scss:565）不符，令牌一断即跳 17px
- 建议改法：升 --fs-3xl(36rpx=18px) 与 LockScreen 门卡标题同档，兜底字面量同步改 36rpx；R11-L09-D02 在同文件已把区块标题升档，此行为漏网卡
- 修复类别：CSS/token

## subpackages/tools/love-center/index（2 条）

### R13-L07-D01　P3 / 颜色token　批次 R13-B58
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`0d01d9f43fab27a2`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:28`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（--c-romance-500 角色=喜欢·匹配·品牌点缀）+ §1.5 组件规范；帧实测恋爱咨询宫格
- 现象：同一 2×2 宫格四枚同角色入口图标两种视觉档：「恋爱咨询」为粉色实心爱心（帧实测主色 (255,107,129)=#FF6B81 与 --c-romance-500 逐字同值），「恋爱课程/社交咨询/社交课程」三枚为深灰线稿 SVG，实心彩色 vs 深灰线稿同格并存
- 建议改法：boards 数组（:28-31）四枚图标统一视觉档——或全部换同族线稿、或全部走彩底浅盘（素材由 F1 素材车道重烘焙，不新增文件）
- 修复类别：单页

### R13-L07-D02　P2 / 颜色token　批次 R13-B58
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`92b3f65bfaa8e4d7`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:49`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.5 组件规范（非文本控件 3:1 线）+ 同仓 R8-L08-D02 已判先例（search 返回键 #94A3B8@2.35:1 判可达性 P2 并换深色变体）
- 现象：快捷入口「附近的人」定位图标墨色为浅蓝灰：帧实测该图标最暗墨 (149,164,185)=#95A4B9，压白卡只有 2.53:1，低于非文本控件 3:1 线；同页「MBTI 人格测试」拼图图标实测最暗 (10,15,13) 近黑——同页两行同角色入口图标一浅一深两档墨
- 建议改法：:49 的 ICONS_COMMON.LOCATION 换 icons/v2 深色变体（同 search 返回键 R8-L08-D02 口径，素材三棵树已在盘，不新增素材）
- 修复类别：单页

## subpackages/tools/love-center/mbti（1 条）

### R13-L08-D03　P2 / 颜色token　批次 R13-B59
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`ba53b982d64d8e81`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:401`
- 理想图依据：无基准，依据=规范文档§1.2 色板品牌色阶用法 + §1.3 小字号对比门槛
- 现象：「16 型人格速览」上方四枚维度章的字母段（E/I、S/N、T/F、J/P）为 --fs-base 12px/700 绿墨（帧上实测 #1B8B67≈--c-brand-700 #1F8D6A），压章底 --c-bg-brand #E8F8F0（帧面实测 #E7F9F1）实算 3.77:1，不足 4.5:1；同排维度中文名（--fs-xs 10px 次级墨 7.2:1）反而达标
- 建议改法：:401 改 --c-brand-800 #156B51（压 #E8F8F0 5.87:1），章底/字号不动
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（2 条）

### R13-L08-D01　P2 / 颜色token　批次 R13-B02
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`fba766ff418adc08`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:2033`
- 理想图依据：无基准，依据=规范文档§1.2 色板（--c-brand-500 白字 2.10:1 的同款算式已在 R9-L08-D05 判废）+ 组件规范 src/components/discover/CardSwiper.vue 卡片数据章档
- 现象：卡片姓名行「22岁」年龄章为白字（帧上最亮 (250,254,252)）压 --c-brand-400→brand-500 绿渐变（帧面实测 #4DD2A4），对比 1.90:1，低于大字号 3:1 线；同屏「在线」章、「距离未知」行等白字均压深色蒙版可读，唯此章把白字放在最亮的品牌绿上
- 建议改法：章底由绿渐变改纯色深档 --c-brand-800 #156B51（白字 6.45:1），与 LockScreen.vue:793、detail.vue:917 两处已落地的主出口深档同口径，不动字号与圆角
- 修复类别：CSS/token

### R13-L08-D02　P2 / 颜色token　批次 R13-B60
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`eafd89a94927202a`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:343`
- 理想图依据：无基准，依据=规范文档§1.2 文本色阶 + 组件规范（同家族 LockScreen.vue:900 页脚提示行 R8-L08-D05 已因同值 4.36:1 升 --c-text-secondary）
- 现象：卡片区尾部说明行「点击卡片查看主页后可发起聊天」取 --c-text-tertiary（帧上墨迹实测 #6D7873≈#6B7571），压页面底 #EEF7F2 实算 4.36:1，--fs-lg 14px 正文级说明不足 4.5:1；R7 加尾块时只修了同排「看看全部推荐」的字色（R10-L08-D14），这行漏修
- 建议改法：:343 色值改 --c-text-secondary #4A524E（压 #EEF7F2 7.37:1），字号间距不动
- 修复类别：CSS/token

## subpackages/tools/search/index（2 条）

### R13-L07-D09　P2 / 层级遮挡　批次 R13-B61
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`379b6d3b98d298a4`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:588`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.6 第 6 条（胶囊避让）+ 组件规范；同仓 R11-L08-D01 在册修复的本轴复核
- 现象：「取消」末字「消」右上角仍压进系统胶囊：本帧实测胶囊左缘 x=286（y=64 行首个非白像素）、取消墨迹最右 x=289-290（局部 4×/8× 放大帧均见「消」右上与胶囊左下弧线交叠）。R11-L08-D01 是按上一轮帧胶囊左缘 x=293 校定的 85px 写死常量（:588 `calc(var(--capsule-right, 7px) + 85px)`），本帧胶囊几何左移 ~7px 后预留仍不足——上一轮修得不对：常量锚死单次实测，没吃实时胶囊几何。因左侧返回圆钮是替代出口，不判 P1
- 建议改法：右避让改为消费 AppShell/useMenuButtonRect 注入的实时胶囊左缘（页内已有 --statusbar 同机制），删除写死的 85px 常量
- 修复类别：单页

### R13-L07-D10　P2 / 颜色token　批次 R13-B61
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`80bcd06c61a9182f`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:589`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1 第 1 条「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层（2026-08-31 用户验收定论）」
- 现象：页头整幅白带：本帧实测 y=0..158 全宽 #FFFFFF（x=8 与 x=200 两列同值）、y=159 渐变过渡、y≥160 才落到 #EEF7F2——页首 ~160px（首屏 20%）是纯白横带并以硬缝接浅绿页底，违反 §1.1 浅绿统一断言；同域 tools 其余四页顶部均为渐变收敛到页底色（AppShell 渐变 280rpx 收敛 / daily-question 品牌渐变），仅本页是硬白板
- 建议改法：:589 .search-header 底色改 var(--c-bg-page)（或浅绿→页底色渐变），让头部融入 §1.1 统一底色，输入框已有 --c-bg-surface+描边自成边界
- 修复类别：CSS/token

## subpackages/tools/security/index（4 条）

### R13-L07-D05　P1 / 可达性　批次 R13-B62
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`58b604d311667819`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:983`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2 + 同仓 R11-L07-D21 已判先例（help 复制钮同型配对 brand-600 压 #E8FAF3=2.59:1 判 P1，改 brand-800+bg-brand=6.00:1）
- 现象：「当前设备」徽章墨色 --c-brand-600 #2AAE83 压未注册令牌 --c-tint-brand 的私有兜底 #E8FAF3：帧实测墨 (37,172,128)、底 (232,250,243)，对比 2.62:1——11px 小字既低于 4.5:1 也低于 3:1。用户拿不到什么：读不出「当前设备」标记，设备列表里无法分辨哪台是本机（同型配对在 help 页已被 R11-L07-D21 定 P1 并修复，本页未同步）
- 建议改法：照 help 同款改 color: var(--c-brand-800) + background: var(--c-bg-brand)（6.00:1），一行 CSS
- 修复类别：CSS/token

### R13-L07-D06　P2 / 尺寸比例　批次 R13-B62
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`58b604d311667819`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:981`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.4（--r-full 胶囊语义=单行徽章）+ §1.5 徽标组件（UnreadBadge 等）单行惯例
- 现象：登录设备首行标题「手机号登录 · iPhone 12/13 (Pro)」较长，把行尾徽章挤窄后 CJK 逐字折行：帧上（局部 4× 放大核验）徽章渲染成两行胶囊「当前设/备」，pill 高度翻倍、圆角语义破坏；.sec-item__badge 无 white-space:nowrap / flex-shrink 保护
- 建议改法：:981-987 徽章补 white-space: nowrap（flex 行内配合 flex-shrink:0），长标题行走省略号
- 修复类别：单页

### R13-L07-D07　P2 / 可达性　批次 R13-B62
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`c358d3304ca050d3`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:972`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（--c-error 用途=错误·删除）+ §1.3（15px/600 不享 WCAG 大字号豁免，门槛 4.5:1）
- 现象：「注销账号」危险标签 --c-error #E5454D 15px/600 压白卡：帧实测墨 (230,81,90)（#E5454D 渲染），对比 3.97:1，落在 3:1–4.5:1 次级带——本页最高危操作的标签是页内对比最低的大字之一
- 建议改法：由 theme 车道按 F1 先例（design-variables.scss:846-857 给 --c-error-soft 补注册的同族做法）增补错误色深档并在此引用；不改则本行升 700 字重 + 18px 进入大字档
- 修复类别：CSS/token

### R13-L07-D08　P3 / 颜色token　批次 R13-B62
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`c358d3304ca050d3`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:634`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.1 第 3 条「一令牌一值：页面只引用 var(--c-*)，禁止私有色值」
- 现象：页面引用三个未注册令牌、渲染全吃私有兜底：--c-tint-green-soft（:593/:634，design-variables.scss 只注册了 tint-pink-soft:825 / tint-blue-soft:830）与 --c-tint-brand（:984）；bottom 帧上四条设备行的图标圆底即兜底私值 #E8FAF3，帧实测该圆底像素 (232,250,243)
- 建议改法：改引已注册的 --c-bg-brand（#E8FBF2，design-variables.scss:379，help 页 R11-L07-D22 同款改法），不新增页面级私值
- 修复类别：CSS/token

## subpackages/village/village/detail（4 条）

### R13-L03-D01　P1 / 素材缺失　批次 R13-B63
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`823668035e1ff671`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:892`
- 理想图依据：素材/理想效果图/帖子.png 作者行区域——阿辰名右侧有绿底校徽「北京大学」；规范文档 §3.13 布局亦列「作者行（头像 + 昵称 + 学校 chip + 关注按钮）」
- 现象：帧上作者行「演示·南开大学」右侧无任何校徽 chip，只有纯文字昵称 +「3 天前」+「+ 关注」；学校身份信息只剩昵称里的演示前缀，校徽控件整块缺席
- 建议改法：校徽 chip 不要只挂在 isAlumni 上——campusName 是真字段（本页 :1001 位置行已消费），按 §12 接真字段：有 campusName 即渲染校徽，文案取该字段
- 修复类别：单页

### R13-L03-D02　P3 / 文案　批次 R13-B12
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`823668035e1ff671`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:1874`
- 理想图依据：素材/理想效果图/帖子.png 作者行右侧——按钮逐字「关注」，无加号
- 现象：帧上关注按钮渲染为「+ 关注」（带半角加号 + 空格），理想图同位为「关注」二字整句
- 建议改法：zh-CN.ts:1874「follow」词条「+ 关注」改「关注」，与理想图及 topics 页已统一的整句档取齐
- 修复类别：单页

### R13-L03-D03　P3 / 文案　批次 R13-B63
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`823668035e1ff671`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1060`
- 理想图依据：素材/理想效果图/帖子.png 评论区头——逐字「全部评论（32）」全角括号
- 现象：帧上评论区头渲染「全部评论 (1)」，计数括号为半角 ( )，与理想图全角（）取档不一
- 建议改法：comments-count 模板把半角括号换全角（）或并入 commentsTitle 词条统一交付
- 修复类别：单页

### R13-L03-D04　P2 / 尺寸比例　批次 R13-B63
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`152c8f54324fd104`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:935`
- 理想图依据：素材/理想效果图/帖子.png 配图区——通栏大图，宽约占屏宽 90%（785/825px）、横幅比例
- 现象：帧上单图帖（id=408）配图渲染为 ≈170/378 ≈ 45% 屏宽的 1:1 方格（grid--1 档 = 2 列口径），理想图为 ≈90% 屏宽通栏横幅，图片宽度只有理想图一半
- 建议改法：详情页 grid--1（单图）档改单列全宽展示，2 图及以上保留方格口径；若产品认定列表口径优先，需在规范文档登记推翻理想图
- 修复类别：CSS/token

## subpackages/village/village/history（2 条）

### R13-L03-D08　P2 / 可达性　批次 R13-B64
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__history__top.png`（sha16=`658104e2acaf83c6`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:388`
- 理想图依据：无基准，依据=规范文档§1.4 + 88rpx 命中口径（任务书 P1 口径同源），仓内同类修复见 tag-posts.vue:626 min-height:88rpx
- 现象：「清空记录」胶囊 padding 8rpx 24rpx + 24rpx 字号，整钮热区高约 50rpx（帧上实测约 25px），低于 88rpx 命中口径，且它是本页唯一清空入口、无替代出口
- 建议改法：照 tag-posts.vue:626 同款修法补 min-height:88rpx + flex 居中，纵向 padding 归零
- 修复类别：CSS/token

### R13-L03-D09　P3 / 文案　批次 R13-B64
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`e7ddc47ecc5058a5`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:237`
- 理想图依据：无基准，依据=规范文档§1.3 时间戳小字档 + utils/time.ts:111-112 具名时间档（'full'/'date' 含年份口径）
- 现象：同一列表同屏混排两档时间：前四卡「3 分钟前 / 2 天前 / 3 天前」相对档，末卡谢如意为「2026/10/06」半角斜杠绝对档，且绝对档无「前」类后缀也无统一分隔口径
- 建议改法：绝对档改走 time.ts 具名 'date' 档（如「2026/10/06」→ 统一带年月日分隔规范），并在本列表内保持单一兜底档
- 修复类别：单页

## subpackages/village/village/index（2 条）

### R13-L02-D05　P3 / 文案　批次 R13-B01
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__index__top.png`（sha16=`78935cfb7a899e77`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:316`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §2 对账表（village/index 无理想图条目）+ components/common/LockScreen.vue 组件注释（权益清单=「解锁后能拿到什么」）
- 现象：锁屏三条权益「解锁精准匹配推荐 / 查看同校校友主页 / 发起私信与匿名聊天」行首全部渲染绿色 ✓（checkIconSrc=REGISTER_ICONS.CHECK_GREEN，:109）——✓ 的既定语义是「已完成」，而同屏 80px 上方明写「当前完善度 30%」、三条恰恰全部未解锁，勾选图形与门槛事实相反
- 建议改法：行首图标换锁形/中性圆点（仓内既有 REGISTER_ICONS.LOCK 同族素材），把 ✓ 语义留给真正的已完成态
- 修复类别：单页

### R13-L02-D06　P3 / 文案　批次 R13-B01
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`594fcb097dc11f7c`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:138`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §2 对账表（village/index 无理想图条目）+ 同站「不展示捏造用户」既定口径
- 现象：插画两侧「同校头像」实为静态素材 PEOPLE.AVATAR_8 / PEOPLE.AVATAR_3（:138-139 写死），并非真实同校用户；与 messages 页 2026-09-03 删除捏造用户（小林/小雨/小周/阿杰，见 pages/messages/index.vue:125-127 注释）的全站口径相悖——画面在暗示「同校校友在等你」，后端并无这两人
- 建议改法：两条合法形态二选一：接真（dashboard/nearby 真实同校用户头像接口，无数据时 @error 隐藏，现有 v-if 已支持），或撤掉人像只留徽章+爱心插画
- 修复类别：需新建目标功能

## subpackages/village/village/post（3 条）

### R13-L02-D10　P2 / 素材缺失　批次 R13-B65
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__post__top.png`（sha16=`58648ce04744539c`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:961`
- 理想图依据：无基准，依据=规范文档 §2 表注（post.vue 为旧发帖页保留兼容）+ 同族理想图 素材/理想效果图/发布帖子页面.png「添加位置」行首绿色线性图钉
- 现象：「添加位置」行首图标槽全空——帧实测该行图标区（x18–58）最深像素 #E1E3E2＝纯底色无墨迹，而同列「添加话题」#（#4CCFA5）、「提及好友」@（#58D2AC）、「谁可以看」眼睛（#9DAABD）均出图。上一轮修得不对：R12-L03-D03 把图标从彩色 emoji 换成 MESSAGE_ICONS.LOCATION SVG（:961，spec 桶线性图钉），real 档该 SVG 未出图，图标从「颜色不对」修成了「整枚消失」
- 建议改法：换回 real 档验证过出图的位图族图标（如同页 :985 ICONS_EMOJI.EYE 同桶的 ICONS_EMOJI.LOCATION），或改用包内 v2 桶已验证的线性图钉素材并用 resolveMediaUrl 解析
- 修复类别：单页

### R13-L02-D11　P2 / 文案　批次 R13-B65
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`b621971132f12a58`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1081`
- 理想图依据：无基准，依据=规范文档 §2 表注（post.vue 旧发帖页）+ 素材/理想效果图/发布帖子页面.png 底栏第 5 项「更多」（省略号语义，展开更多选项）
- 现象：底栏第 5 项标签写「更多」（:1081）配眼睛图标（:1080 ICONS_EMOJI.EYE），点击只开「谁可以看」弹层（:1078 @tap visibilitySheetOpen=true）——「更多」承诺的扩展菜单不存在，名实不符；同域 publish.vue 同位置已诚实标「谁可以看」，两页同位取档不一
- 建议改法：标签改「谁可以看」与 publish.vue 对齐（图标眼睛本就匹配）；若要保住理想图的「更多」位，则需后端/产品真的提供更多项后再启用该标签
- 修复类别：单页

### R13-L02-D12　P2 / 文案　批次 R13-B65
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__post__top.png`（sha16=`58648ce04744539c`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:897`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文计数「0/1000」；规范文档 §3.14「正文输入（0/1000）」（同族发帖页口径）
- 现象：帧上正文计数实测「0/500」（:897 :maxlength="POST_MAX_LENGTH"，constants/village.ts 共享常量=500），理想图/规范承诺 1000 字——用户拿不到第 501–1000 字的发布额度；与 D07 同根因（后端容量）不同页实例，与在册「视频发布入口」不同轴
- 建议改法：后端正文中量扩到 1000 后共享常量同步放宽；前端维持与后端真值一致的诚实计数
- 修复类别：需新建目标功能

## subpackages/village/village/publish（3 条）

### R13-L02-D07　P2 / 文案　批次 R13-B66
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`03571f5b57888c32`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:856`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文区右下计数「0/1000」；规范文档 §3.14「正文输入（0/1000）」
- 现象：帧上正文计数实测「12/500」（:856 渲染 `{{ currentLength }}/{{ MAX_CONTENT_LENGTH }}`，stores/village 上限 500），理想图与规范 §3.14 均承诺 1000 字额度——用户拿不到理想图承诺的第 501–1000 字：超出 500 字的内容无法发布。计数本身是与后端真值对齐的诚实显示（MP-R1-PUB-016），缺口在后端容量，与在册「视频列」同性质但不同轴
- 建议改法：后端帖子表/校验把正文中量上限扩到 1000 后，前端 MAX_CONTENT_LENGTH 同步放宽即自动对齐；在此之前保留 500 诚实计数，不回改文案
- 修复类别：需新建目标功能

### R13-L02-D08　P2 / 颜色token　批次 R13-B66
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`03571f5b57888c32`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1209`
- 理想图依据：素材/理想效果图/发布帖子页面.png 页头左侧——黑色粗 ✕ 关闭钮，非文本图形需 ≥3:1
- 现象：帧实测页头 ✕ 字形最深像素 #9CA9BD（close.png 素材自带浅蓝灰）压白底仅 2.38:1，低于非文本 3:1 下限；:1209 声明的 `color: var(--c-text-primary)` 挂在 `<image>`（:804）上是零消费者（与 :1390 注释自证的「位图图标不吃 color」同型），理想图的黑色 ✕ 没有兑现
- 建议改法：按 LockScreen.vue:519 同口径给 `.publish-header__x` 加 `filter: grayscale(1) brightness(0.55)`（不动素材文件），把字形压到 ≥3:1 的深灰
- 修复类别：单页

### R13-L02-D09　P2 / 颜色token　批次 R13-B66
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`abf0819a0d797256`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:984`
- 理想图依据：素材/理想效果图/发布帖子页面.png 发帖小贴士卡——右上 ✕ 为深色可辨图形；非文本图形需 ≥3:1
- 现象：帧实测小贴士卡右上 ✕ 字形最深像素 #9EAEBF 压卡底 #E8FAF3（帧取样 232,250,243）＝2.10:1，低于非文本 3:1；且这是永久关闭提示的唯一开关（:983 @tap tipVisible=false，误触即不可恢复），浅到难辨认放大了误触/找不到的双向风险
- 建议改法：与 D08 同批给 `.publish-tip__close-icon` 加同一条 grayscale+brightness filter（LockScreen.vue:519 口径），88rpx 热区（:1370 已达标）不动
- 修复类别：单页

## subpackages/village/village/tag-posts（3 条）

### R13-L03-D05　P3 / 颜色token　批次 R13-B67
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`74fd8c7a9d8a1e9b`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:553`
- 理想图依据：无基准，依据=规范文档§1.2 + 同域取档：同域 detail 帧导航为白底深字、history 帧为浅底深字，本页为第三种档
- 现象：帧上导航带为 brand-800→900 深绿渐变 + 白字「#运动」，同域 detail（白底深字）/history（--c-bg-page 浅底深字）两页各是一档，村口域三页三种页头档
- 建议改法：与 history 取同档（浅底深字）或把深绿渐变登记为标签页专属档并写入规范文档，消除同域三档不一
- 修复类别：单页

### R13-L03-D06　P3 / 圆角　批次 R13-B67
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`4237e40355b66607`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:749`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx」+ 同域 history 卡（--card-radius 40rpx，帧上实测圆角明显更大）
- 现象：帖卡圆角取 --r-xl（24rpx，帧上实测约 12px），同域 history.vue:446 卡用 --card-radius 40rpx（帧上约 20px），同为村口列表卡两档并存
- 建议改法：.post-card 圆角统一改 var(--card-radius, 40rpx)，与 history 卡及 §1.4 对齐
- 修复类别：CSS/token

### R13-L03-D07　P3 / 间距　批次 R13-B67
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`4237e40355b66607`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:746`
- 理想图依据：无基准，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx」+ 同域 history 卡横向 32rpx
- 现象：.post-card 四向内边距写死 28rpx（帧上卡内文字距卡边约 14px），低于全站 --card-padding 32rpx 档，也窄于同域 history 卡横向 32rpx
- 建议改法：padding 改 var(--card-padding, 32rpx)，与同域卡片取齐
- 修复类别：CSS/token

## 无缺陷（CLEAN）帧（12 张）

> 这些帧泳道逐轴量过、判"没有可测缺陷"。轴名与读数照卡原样。

### R13-L04　circle-home 底帧（feed 流 + 收束链接 + 底部操作栏）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`bf00543fa9aec87b`）
- 依据：素材/理想效果图/圈子详情，摄影圈参考.png
- 逐轴读数：位置=吸顶页签行「动态/精华/活动/作品墙/成员 1.2w」钉在帧顶且白底不透明，选中「动态」绿字+短下划线与理想图页签同构；「查看全部话题 ›」居中收束（帧 y≈690）；底部「加入圈子」实心胶囊全宽 + 笔形 FAB 右下与理想图底部操作栏同位; 尺寸比例=三张帖卡（苏奈/草莓/阿辰）头像均 ≈40px 圆、卡宽=全幅-32rpx 页边距，CTA 胶囊高帧测 ≈56px(112rpx); 颜色token=选中页签草绿 `--c-brand` 档、评论计数「💬 1/💬 0/💬 0」灰字档、「查看全部话题」绿字档、CTA 深绿 600 档（R2b 收敛档），帧上无越板色; 圆角=feed 白卡帧测 ≈16rpx、CTA/FAB 全圆角胶囊，与理想图帖子卡一致; 字号=帖名 ≈17px 粗、正文 ≈14px、时间「9-09」≈12px 灰，落 §1.3 正文档+小字档; 间距=卡间距帧测 ≈12px 均匀，页签带下缘（y≈82）与首卡上缘（y≈95）无叠压; 素材缺失=帖无点赞位/话题标签/帖主校名徽章——后端无 likeCount/likedByMe/帖主校名列，R11-L04-D14 与 R12 在册撤承诺口径不渲染（circle-home.vue:173-174、287、623-624 注释在案），非本轮素材丢失；三卡头像均实图加载; 空态文案=本帧 feed 有 3 条内容不涉空态，列表尾为「查看全部话题 ›」功能链接非空态占位; 层级遮挡=吸顶页签白底压过滚出卡无透印，FAB 悬浮不压「查看全部话题」链接（帧上链接整行完整可见）; 可达性=「查看全部话题」宿主整行可点（circle-home.vue:644），CTA 胶囊 112rpx 高全宽热区，FAB ≈96rpx，均≥88rpx; 文案=页签「动态/精华/活动/作品墙/成员 1.2w」「查看全部话题」与理想图措辞一致，帖时间 M-DD 档与 top 帧同档; 需新建=0 个新缺口：hero 话题 chips 缺口已记本车道 R13-L04-D07（top 帧），本帧视野内无新增缺口

### R13-L04　hub 底帧（学校圈列表滚动态）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`b7f840f41304aa4a`）
- 依据：素材/理想效果图/校园圈.png
- 逐轴读数：位置=学校卡纵向全宽单列，封面左 160rpx 方块、校名+「未认证」胶囊同排首行、白底绿描边「申请加入」胶囊右缘对齐，与理想图卡内三段结构同构；列表尾「查看更多校园圈 ∨」居中（帧 y≈718）与理想图列表尾链接同位; 尺寸比例=封面 160×160rpx 方形（hub.vue:702-704）帧测 ≈80×80px，5 卡等高 ≈90px；卡身比理想图矮一截系统计行撤除（见素材缺失轴），比例本身无拉伸变形; 颜色token=「未认证」淡紫底紫字=--c-purple 系（§1.2 未认证档）、「申请加入」白底绿描边绿字（hub.vue:876 注释明确对齐理想图「仅去认证实心」层级）、校名 --c-text-primary（hub.vue:761），帧上无越板色; 圆角=白卡帧测 ≈20rpx、封面 ≈16rpx、两胶囊全圆角，落 §1.4 卡片圆角档; 字号=校名 28rpx 700（hub.vue:758）、胶囊/按钮字 24rpx，落 §1.3 正文+标签档; 间距=卡间距帧测 ≈12px 均匀、页边距 32rpx 一条栅格线（R2b-L05-D13 已统一），末卡与「查看更多」无叠压; 素材缺失=卡无「N 位同学 · N 条动态」/好友头像行——原字面量假统计已按 R11-L04-D15 撤承诺整块不渲染（hub.vue:351 注释在案），非本轮素材丢失；各校封面为 CAMPUS_COVER 实拍图非占位（§3.12 通用封面口径）; 空态文案=本帧列表有 5 卡内容不涉空态; 层级遮挡=吸顶白页头压滚出卡无透印，末卡「同济大学圈」整卡完整、不被「查看更多」链接压叠; 可达性=「申请加入」胶囊 min-height 88rpx（hub.vue:900）整钮可点、搜索框 76rpx 高为输入位非按钮、「查看更多校园圈」整行热区（hub.vue:944 高 48rpx 但宿主为全宽页脚链接）; 文案=「未认证」「申请加入」「查看更多校园圈」与理想图措辞逐字一致（未认证/已认证差异为真实认证状态数据，不编造）; 需新建=0 个新缺口：学校卡统计行接真字段属 R11-L04-D15 在册撤承诺，本帧无新增

### R13-L07　daily-question 锁定态（top）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`5a226a50a2b8b50f`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=白卡 x≈19..356 水平居中; 内容簇（锁 y≈300-340 / 题 y≈363 / CTA y≈425-462）在卡（y≈100-695）内垂直居中，簇心≈381 vs 卡心≈397; 尺寸比例=锁图标盒 80rpx=40px（帧上墨迹 26×30px 内含于 40px 盒，非 0×0）; 颜色token=CTA 底逐像素实测 (21,107,81)=#156B51 与 --c-brand-800（design-variables.scss:267）逐字同值，白字 6.45:1; 圆角=锁定卡实测 ≈20px=40rpx=--card-radius（R10-L07-D06 兑现），CTA 全圆胶囊; 字号=卡题 ≈16px/700（--fs-2xl）、说明 ≈13px（--fs-md）、CTA 字 ≈14px/600（--fs-lg），对齐 §1.3 正文/辅助两档; 间距=卡内四元素 gap --sp-5(20rpx=10px)，卡底到返回 pill ≈12px，无 <8px 拥挤; 素材缺失=0 个空槽：锁形 SVG（与 LockScreen 同源 common/lock.svg）帧上实测墨迹 26×30px 出图于 80rpx 盒（daily-question/index.vue:505），灰条/占位符 0 个; 空态文案=锁定态三件齐：「签到后解锁」+「完成今日签到即可参与每日一问」+「去签到」; 层级遮挡=0 处叠压：状态栏黑字 y≤24、胶囊 x≈294..344/y≈58..90、渐变头部、白卡 y≈100..695、CTA y≈425..462、底部返回 pill 逐带探针区间无交叠; 可达性=双出口均 ≥88rpx：主 CTA（R10-L07-D05）+ 底部「返回」pill（R6-L08-D17），头部返回墨 4.87:1; 文案=「返回／每日一问／去签到」全角标点、无错别字、无半角混排; 需新建=0 个：解锁动作就地签到完成（daily-question/index.vue:30 批注），不承诺后端新字段

### R13-L07　daily-question 锁定态（bottom）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`d5df3c58df322a9b`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=卡实测 y≈100..695 垂直填充内容区，底部返回 pill 白底 run 实测 x=120 处 y=680..712，卡/pill/屏底三段无粘连; 尺寸比例=卡宽实测 x=19..360（@y400 探针）=341px≈677rpx，与内容区 750rpx-2×32rpx 页边距-2×16rpx 卡边距档吻合; 颜色token=CTA 底实测 (21,107,81)@(240,447)=#156B51=--c-brand-800（index.vue:518），说明行墨实测最暗 (101,108,104)≈#656C68（13px 反锯齿上包络，源令牌 --c-text-secondary #4A524E，白底 7.5:1，R6-L08-D15 兑现）; 圆角=卡四角实测 ≈20px 圆弧无直角，CTA 两端半圆收口（r=高/2）; 字号=「签到后解锁」实测字面高 ≈16px、说明 ≈13px，与 §1.3 的 16/13px 两档逐档对齐; 间距=锁→题→说明→CTA 实测 ≈10-16px 递进（gap --sp-5 + margin --sp-3/--sp-4），无 40px+ 断层; 素材缺失=0 个空槽：页内仅 1 枚锁形图标且出墨（实测墨迹 26×30px），破图/占位符 0 个; 空态文案=「完成今日签到即可参与每日一问」逐字完整无截断无省略号; 层级遮挡=无：home indicator 不压返回 pill（pill 白底止于 y≈713，指示条在 y≈800）; 可达性=页内两个可点目标（CTA/返回 pill）源级均有 min-height:88rpx 下限、帧上白底/墨迹完整可辨; 文案=与 top 帧同画面（两帧仅 8KB 差=状态栏时钟），文案逐字一致无抖动; 需新建=0 个（本帧 0 处缺列登记，解锁动作就地签到完成见 daily-question/index.vue:30 批注）

### R13-L08　heart-signals 锁定门上画（双帧门页完整、多轮修复全数在帧）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`e17ff5e2b2421d78`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=主标题墨迹 x94–283、中心 x≈188=378px 画布正中，关闭钮圆心 (33,72) 与右上胶囊 (295–365,55–75) 对角不抢位; 尺寸比例=关闭钮实测 42×43px≈88rpx 圆（LockScreen.vue:482-483），主环绿圆 y130 横径 135px≈270rpx（280rpx 声明含抗锯齿差）;

### R13-L08　heart-signals 锁定门下画（主出口对比度修复在帧）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`e742216075f948da`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=主按钮墨 x57–320（中心 x≈188＝画布 378px 正中）、链接行墨迹 y671–683、页脚行墨迹 y732–742，三段纵向排布; 尺寸比例=CTA 钮面实测 263×44px（x57–320/y602–646）＝88rpx 级高（--btn-height-md 档，LockScreen.vue:792 同块），链接墨迹宽 104px;

### R13-L08　activities/detail 示例回退态上画（导航与封面区全令牌在帧）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`cb39b241d7d148a1`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=内容白卡 x17–361（画布 378px，左右留白 17px≈34rpx≈--page-padding 32rpx 档）; 尺寸比例=封面纵跨 y90–422＝333px≈640rpx 声明（detail.vue:652）;

### R13-L08　mbti 简化测试下画（四题+提交全达标）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`a1a99c99bbaa509a`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=提交钮 x17–361 全宽（画布 378px，左右页边 17px≈34rpx≈32rpx 档）; 尺寸比例=x300 列逐行实测 8 个选项框每格 44px=88rpx（y198-241/245-288、334-377/381-425、471-514/518-561、606-649/653-697）;

### R13-L09　verification 表单/上传/提交半页（表单卡+上传卡+提交钮）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`8cac2e4884ab936d`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=表单卡/上传卡/提交钮左缘实测 x=17-18 同轨（--page-padding 32rpx=16px，verification/index.vue:872 同配方），表单 label 列起 x≈30、输入列起 x≈102 三行两列各自对齐无错位; 尺寸比例=提交钮实测 y≈709..755 高 46px=92rpx ≥仓内 88rpx 热区口径，上传虚线框实测 x=33..345 满卡内衬; 颜色token=提交钮实测 (13,82,62)→(18,98,74)=brand-900→brand-800 渐变（R11-L09-D16 已裁的白字对比度方案，real-name.vue:985-989 注释逐字同口径，非偏差），占位/提示字为 --c-text-placeholder #9AA39F 档（§1.2）; 圆角=提交钮两端实测全圆 ≈23px（--r-full 档），表单卡圆角 --r-xl 24rpx（verification/index.vue:874，帧上实测曲率 ≈12px 与 24rpx=12px 同档）; 字号=表单 label 实测 ≈14px（--fs-lg 28rpx 档）、上传主句 ≈16px、提示行 ≈12px，符合 §1.3 辅助/小字分档; 间距=上传卡底→提交钮顶实测 ≈26px（卡 margin-bottom --sp-6 加 钮 margin-top 32rpx 叠加，无 0/负距异常）; 素材缺失=相机图标 CAMERA 渲染正常非 0×0（verification/index.vue:733-737 原生 image 方案，R10-P4 同款注释逐字）; 空态文案=「点击上传学生证照片」「支持 JPG / PNG，大小 ≤ 5MB」逐字在帧，与 R11-L09-D21 落地的 5MB 拦截同源（verification/index.vue:173 MAX_IMAGE_BYTES = 5 * 1024 * 1024）; 层级遮挡=表单/上传/提交三层实测 y=340..790 区间无 fixed 浮层叠压（帧上该区间仅白卡 (255,255,255) 与页底两色），导航白底 (255,255,255) 不透内容; 可达性=提交钮 92rpx 热区达标且带 press-feedback hover 态，上传框整框可点实测高 ≈210rpx; 文案=「学生姓名」「学号」「学校」「提交认证申请」与 i18n verification.* 键一致，「大小 ≤ 5MB」与代码拦截值 5MB 一致; 需新建=0 个（三字段+上传+提交在页内闭环，与 real-name 共用 /media/upload 链路，real-name.vue:9）

### R13-L09　real-name 已实名认证上半页（导航+状态卡+脱敏信息卡）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`f97ac4b3364d210f`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=导航标题「实名认证」实测居中（墨迹中心 x≈188=视口中线 378/2），返回键左缘实测 x≈16; 尺寸比例=状态卡图标白圆实测 y≈125..185 高 60px=120rpx，状态卡左右缘实测 x=17..361 满页边距轨道; 颜色token=状态卡底实测 (233,250,243)=#E8FAF3=--c-brand-50（verified 分支同键），标题绿实测 (63,135,113)≈--c-brand-700 档，打勾图标为 #94A3B8 族（§9 在册共享素材硬编码，非本轮新偏差，不计缺陷）; 圆角=状态卡实测 ≈12px=--r-xl 24rpx（real-name.vue:712）; 字号=「已实名认证」实测 ≈20px 700 档、两行描述实测 ≈13px 三级档，符合 §1.3 标题/辅助分档; 间距=状态卡→信息卡实测 ≈26px=margin --sp-6（real-name.vue:710）加 section margin-top --sp-6（real-name.vue:776）叠加，与代码节奏一致; 素材缺失=打勾 icon 渲染正常（real-name.vue:458 注释 R10-P4 起 改原生 image，实测非 0×0 塌陷）; 空态文案=「您的实名认证已通过」「可进行校园认证（学历认证）」逐字来自 realName.statusVerified*（real-name.vue:90-91），文案承诺的出口由 R11-L09-D18 补的 CTA 兑现; 层级遮挡=帧上 y=95..465 内容区实测无 fixed 浮层叠压，状态卡 z-index 1（real-name.vue:705）; 可达性=返回键 role="button"+aria-label（real-name.vue:440），表单态 input 带 aria（real-name.vue:525/542）; 文案=「真实姓名/身份证号」值「林曦风」「110101**********1234」来自接口字段 userName/maskedIdCardNo（real-name.vue:471/477），非页内常量编造（§12 合法形态：接真字段）; 需新建=0 个（verified 态信息+CTA 出口已齐，CTA 实测 y≈420..465 在页内闭环）

### R13-L09　real-name 已实名认证下半页（恋爱认证 CTA+收尾区）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`f97ac4b3364d210f`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=CTA 左右缘实测 x=17..361 与上方信息卡同一条 --page-padding 竖轨（real-name.vue:980 margin 归口注释逐字）; 尺寸比例=CTA 实测 y≈420..465 高 45px=90rpx ≥仓内 88rpx 热区口径; 颜色token=CTA 实测 (13,82,62)→(18,98,74)=brand-900→brand-800 渐变（real-name.vue:985-989 注释逐字「6.01:1」「9.42:1」白字对比，R11-L09-D16 已裁方案，非偏差）; 圆角=CTA 两端实测全圆 ≈22px（--r-full 胶囊档）; 字号=CTA 文字「恋爱认证」实测 ≈16px 白字 700（--fs-2xl 档）; 间距=信息卡底→CTA 顶实测 ≈18px，与 real-name.vue:980 margin-top 32rpx 落点一致; 素材缺失=下半页 y=465..814 区间实测 0 图 0 卡、无裂图，整页唯一位图资产（打勾图标）已在 top 帧核对渲染正常; 空态文案=verified 态直出非空态，帧上逐字可见「恋爱认证」与状态卡文案，无「暂无/未认证」类空态占位出现; 层级遮挡=CTA z-index 1（real-name.vue:977）无叠压，其下 y=465..814 共 ≈349px 为 R9-L09-D08 已裁的 --c-bg-page→--c-brand-50 180° 渐变裸底（real-name.vue:639），无浮层无内容被遮; 可达性=CTA role="button"+aria-label（real-name.vue:484-485）+hover 态（real-name.vue:486）; 文案=页头「实名认证」与 CTA「恋爱认证」各归其页不混用（real-name.vue:426 注释逐字「文案复用既有 verification.navTitle」）; 需新建=0 个（verified 态仅状态卡+信息卡+CTA 三块已闭环，实测 y=95..465 节点齐全）

### R13-L09　other 他人主页首屏（对照理想图逐区核对）
- 帧：`tmp/qa/frames/R13/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`8e934d462769ede7`）
- 依据：素材/理想效果图/他人显示主页.png
- 逐轴读数：位置=头像实测外缘 y≈271..340 直径 ≈69px=144rpx 骑压白卡顶（下探约半，§3.9 同构）；返回/更多 fixed 圆钮实测 y≈45..105 悬于头图，右钮让出胶囊带无交叠（R6-B58/D05 配方生效）; 尺寸比例=身份卡右侧「喜欢/打招呼」胶囊实测宽 ≈56px 高 ≈33px，与理想图等比（理想 94px@682 屏宽折算 ≈52px@378）; 颜色token=签名卡底实测 (254,254,254) 白卡——R2b-L06-D15 已按理想图「白卡+淡投影」裁决（PublicBio.vue:19-24 注释逐字），本次实测理想图简介区 (255,255,255) 证实白卡正确，§3.9「#F7FAF9」文字与基准图冲突时以图为准；兴趣标签薄荷底深灰字、「美食」琥珀高亮与理想图逐粒对应; 圆角=身份卡/签名卡/兴趣卡实测 ≈12-16px，与理想图卡片曲率同档; 字号=昵称实测 ≈16px（R9-L10-D03 收至 --fs-2xl 32rpx）；签名/标签 13-14px 辅助档; 间距=签名卡→兴趣卡→共同点卡实测节距 ≈12px=--section-gap 档; 素材缺失=头图为账号真实 media（暗调海景）非裂图、头像非 0×0；「生活瞬间」4 格为 R11-L10-D03 裁定的灰骨架+「暂无照片」（宁缺毋造，在册不再重报）; 空态文案=「未填写」「● 离线」「资料暂未完善」「距离待更新」「我们还没有共同点」「TA 还没有发布过动态」全部为诚实空态（PublicGallery.vue:21「宁缺毋造」同口径），无编造数据（§12 合法形态）; 层级遮挡=首屏内容不压胶囊（胶囊带内只有头图）；身份卡右侧两胶囊 y≈310..390 在胶囊带之下; 可达性=返回/更多 64rpx 圆钮+喜欢/打招呼胶囊可点，底栏另有 92rpx 高同动作复本; 文案=「小新生」及资料缺省为接口真值+诚实占位，对应理想图三行资料在「数据缺省」分支的形态; 需新建=无（§3.9 模块清单：签名/兴趣/共同点/瞬间/动态/底栏全部在页）

