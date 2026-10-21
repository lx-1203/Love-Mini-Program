# R10 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=220　涉及页面=68　涉及帧=127　泳道卡=14　段内继承哈希=23（同段第二条起未重复抄录，非逐条见证）
- 严重度分布：P2=132　P1=69　P3=17　P0=2
- 轴分布：颜色token=75　可达性=57　字号=25　文案=17　间距=12　位置=8　圆角=6　尺寸比例=5　素材缺失=5　需新建=4　层级遮挡=3　空态文案=3
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0

## pages/discover/index（1 条）

### R10-L01-D09　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__discover__index__bottom.png`（sha16=`2cd7987e829a1214`）
- 源码证据：`apps/client/src/pages/discover/index.vue:661`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡下三键行上方的逗留提示（游客态提示条），理想图同位置为深色字压浅底
- 现象：游客提示胶囊 `.discover-login-hint` 底是 `--c-brand`→`--c-brand-400` 渐变、字取 `--c-neutral-0`(#FFFFFF) 28rpx/600（帧上胶囊 x≈110..272、y=500..528，底采样 (71,208,161)），白字压渐变实算 2.10→1.85:1；「登录后可与 TA 互动」这行是本页唯一解释「为什么三个键都点不动」的文案，帧上它是一团浅绿糊字（提示语义仍可从登录弹窗兜回，故 P2）。
- 建议改法：胶囊底改 `--c-brand-800`（白字 6.45:1）或字改 `--c-brand-800`、底改 `--c-bg-brand`(#E8FBF2)。
- 修复类别：CSS/token

## pages/home/index（3 条）

### R10-L01-D10　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__home__index__top.png`（sha16=`1fd67ccad6c1b90c`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:340`
- 理想图依据：素材/理想效果图/首页.png 今日推荐卡姓名下的兴趣标签行（理想图标签为深灰绿字压浅灰胶囊，三/四枚可逐字读出）
- 现象：兴趣标签 `.today-card__tag` 写死 `color:#36C99A` + `background:#E8FAF3`（第339行），实算 1.93:1；帧上 y=276 横切「摄影/阅读/运动」三枚胶囊，字形最暗像素仅 (58,202,156)、胶囊底 (232,250,243)——三枚标签的**字**几乎与胶囊同色，只剩三个空心药丸，用户读不到 TA 的兴趣词（标签是次级信息、姓名/学校仍在，故 P2）。
- 建议改法：字色改 `--c-brand-800`(#156B51 压 #E8FAF3 约 5.6:1) 或走 `--c-tag-green-text`(#279B70)，底色保留 #E8FAF3。
- 修复类别：CSS/token

### R10-L01-D11　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__home__index__bottom.png`（sha16=`c1091cc55fcf72ca`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:492`
- 理想图依据：素材/理想效果图/首页.png 社区动态卡右上「关注」胶囊（理想图为深色描边字/深灰字压白底，一颗清晰可点的实心钮）
- 现象：「关注」胶囊字色写死 `#36C99A`、底 `#E8FBF2`（第473行），实算 1.94:1；帧上两张帖卡右上各一枚（约 x=133..165、y=356..378），绿字压浅绿底，胶囊轮廓在，字读不出——用户看不出这枚药丸是「关注」还是「已关注」，作者粒度状态不可辨（可点、可按已关注态判别，故 P2）。
- 建议改法：字色改 `--c-brand-800`，或改走「白底+`--c-brand-700` 描边」的次级按钮档，使关注/已关注两态靠字色与底反差分得开。
- 修复类别：CSS/token

### R10-L01-D12　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__home__index__bottom.png`（sha16=`c1091cc55fcf72ca`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:471`
- 理想图依据：无基准，依据=规范文档 §1.4 控件档 + 本仓已落地口径（login/index.vue:1297-1299「88rpx 最小可点件」、register/index.vue:1242-1250 `.agree__hit` 透明热区层）
- 现象：`.post-card__follow` 只有 `padding:6rpx 18rpx`，块内无 `min-height`、无透明热区层，帧上「关注」胶囊实测高约 21px＝42rpx，为 88rpx 口径的 48%；它挂在 20rpx 小字帖卡右上，是关注作者的唯一落点（换关注 = 重新命中这枚 42rpx 药丸），误触就落到卡片跳详情（第74-77行注释明写冒泡风险）。
- 建议改法：照 register/index.vue:1242-1250 的做法给本块加 `min-height:88rpx` + 等量负 margin 的透明热区层，视觉胶囊尺寸不动。
- 修复类别：CSS/token

## pages/login/index（3 条）

### R10-L01-D01　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__login__index__top.png`（sha16=`b307df7d4372f853`）
- 源码证据：`apps/client/src/pages/login/index.vue:969`
- 理想图依据：素材/理想效果图/登录页面.png 图下 slogan 区第二行「慢慢成为特别的人」（理想图为可读的中绿色，紧接黑色主句之下）
- 现象：slogan 副句 `.hero-desc--sub` 取 `--c-brand`(#36C99A) 压页面底 #EEF7F2，实算 1.93:1，帧上该行（y=458..468）最暗像素 (31,195,143) 与底色 (238,247,242) 几乎同明度，30rpx/700 的「慢慢成为特别的人」在强光或低视力下整行消失——这行是理想图指定的品牌主张，用户拿不到主句之下的这条核心文案。
- 建议改法：副句字色由 `--c-brand`(500) 换成 `--c-brand-800`(#156B51，压 #EEF7F2 实算 5.92:1)，保留 brand-500 只作装饰色块。
- 修复类别：CSS/token

### R10-L01-D02　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__login__index__bottom.png`（sha16=`d3e3b7d24ff4f655`）
- 源码证据：`apps/client/src/pages/login/index.vue:1056`
- 理想图依据：素材/理想效果图/登录页面.png 主按钮「微信一键登录」（帧上同一按钮在 y=502..546，x=17..361）
- 现象：`.btn-primary` 底取 `--c-brand`(#36C99A)，帧上采样 (54,201,154) 与令牌逐字一致，标签字色为第1093行 `--c-text-inverse`（合成近白 #FFFFFF），实算 2.10:1；这是本页唯一主操作，按钮上的「微信一键登录」六个字与绿底同明度档，读不出按钮做什么，用户拿不到主入口的语义（视觉上只剩一颗无字绿胶囊）。
- 建议改法：`.btn-primary` 底改 `--c-brand-800`(#156B51，白字 6.45:1)，与 BottomActionBar 主 CTA 已落地的档位一致。
- 修复类别：CSS/token

### R10-L01-D03　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__login__index__bottom.png`（sha16=`d3e3b7d24ff4f655`）
- 源码证据：`apps/client/src/pages/login/index.vue:1415`
- 理想图依据：素材/理想效果图/登录页面.png 底行「登录即同意《用户协议》和《隐私政策》」（理想图该行为可读深灰＋绿色链接＋绿色实心勾）
- 现象：协议行 `.terms-text` 取 `--c-text-quaternary`(#9AA39F) 压 #EEF7F2 实算 2.37:1，同行的 `.terms-link`（第1421行 `--c-brand`）只有 1.93:1，帧上 y=736..745 整行最暗像素仅 (148,157,154)，「登录即同意」与两个协议链接都淡进底色——法务必读条款与两个可点链接读不出来（仍是 20rpx 极小字档，故按次级文字口径 P2，未升 P1）。
- 建议改法：行文本换 `--c-text-tertiary`(#6B7571，4.36:1)，两个链接换 `--c-brand-800`(5.92:1)，勾选框保持 34rpx 视觉尺寸。
- 修复类别：CSS/token

## pages/messages/index（3 条）

### R10-L02-D05　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__messages__index__top.png`（sha16=`dfcea60664b99603`）
- 源码证据：`apps/client/src/pages/messages/index.vue:1563`
- 理想图依据：消息.png 左栏绿色主按钮区；游客态登录墙无直接基准，依据=§1.2 主色/白字口径 + WCAG 4.5:1
- 现象：微信一键登录白字压 brand-500→brand-600 渐变（帧取色 51,194,148 → 44,179,135），对比只有 2.10–2.81:1，26rpx 粗体不享大字号豁免，主登录文案读不出。
- 建议改法：主按钮改 --c-brand-800 纯色（白字 6.45:1），与 LockScreen/附近发动态同档。
- 修复类别：CSS/token

### R10-L02-D06　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__messages__index__top.png`（sha16=`dfcea60664b99603`，自同段前条继承）
- 源码证据：`apps/client/src/pages/messages/index.vue:1572`
- 理想图依据：消息.png 左栏摘要区次级按钮；游客态无直接基准，依据=§1.2 + WCAG 4.5:1
- 现象：手机号登录文字取 --c-text-brand #36C99A、描边同色，白底均 2.10:1；用户看不清这个备选登录入口的文字与边界。
- 建议改法：次按钮文字与描边改 brand-800（6.45:1），或改实心浅底深字。
- 修复类别：CSS/token

### R10-L02-D07　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__messages__index__bottom.png`（sha16=`f5edccab1e5d4afd`）
- 源码证据：`apps/client/src/pages/messages/index.vue:914`
- 理想图依据：消息.png 页头放大镜/加号为大热区裸图标；同仓 nearby 的搜索钮已按 88rpx 修
- 现象：页头搜索与「＋」两枚 .header__icon-btn 都是 72rpx（36px）热区，低于 88rpx 下限；两枚是本页唯一的搜索与发起会话入口。
- 建议改法：两枚热区提到 88rpx，图标 40rpx 不动。
- 修复类别：CSS/token

## pages/nearby/index（4 条）

### R10-L02-D01　P2 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__nearby__index__top.png`（sha16=`c3ff9f9501ffbf94`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:81`
- 理想图依据：附近的首页.png 顶部标题行（标题「附近」在屏幕最上沿，定位行紧随，五宫格约在 y≈104/378 宽处开始）
- 现象：标题墨迹 y=104-125、搜索/发动态 y=92-133，胶囊底 y=79；整页 headerTopPad 取 capsuleBottom+12 后把标题/搜索也一起下推，标题距胶囊底 25px，按 1846 高理想图折算标题顶应约 y=40，整页内容低约 64px，首屏因此看不到热门兴趣圈。
- 建议改法：只把「发动态」胶囊纵向让开胶囊，标题组与搜索回到状态栏行（headerTopPad 回 statusBar+12，胶囊避让仅作用于右侧按钮）。
- 修复类别：CSS/token

### R10-L02-D02　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__nearby__index__top.png`（sha16=`c3ff9f9501ffbf94`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1713`
- 理想图依据：附近的首页.png 五宫格快捷入口（绿/粉/蓝/橙/紫五色浅底），§3.5 明确「快捷入口彩色浅底圆图标」
- 现象：五个 88rpx 图标底板全部取 --c-bg-surface #F3FAF6（帧取色 243,250,246），第 2 枚「兴趣圈」与第 1 枚同为绿色、第 5 枚「我的人脉」为蓝色；五色浅底与粉/紫两档语义色整块丢失。
- 建议改法：五枚底板分别取绿/粉/蓝/橙/紫浅色 token，并改用同色 SVG；现有 filter 只留兜底。
- 修复类别：CSS/token

### R10-L02-D03　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__nearby__index__top.png`（sha16=`c3ff9f9501ffbf94`，自同段前条继承）
- 源码证据：`apps/client/src/pages/nearby/index.vue:584`
- 理想图依据：附近的首页.png 顶部（绿色定位针 + 近黑放大镜）
- 现象：标题/副标题定位针与放大镜都沿用 common/location.svg、search.svg 写死的 stroke #94A3B8（帧取色 171,184,199），压 #EEF7F2 仅 2.35:1，低于非文本 3:1；理想图定位针为品牌绿、放大镜为近黑。
- 建议改法：定位针换品牌绿素材，放大镜沿用 messages 页的 filter: brightness(0) 压近黑。
- 修复类别：CSS/token

### R10-L02-D04　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__nearby__index__bottom.png`（sha16=`7327d1b2dfb3ca26`）
- 源码证据：`apps/client/src/components/nearby/NearbySection.vue:67`
- 理想图依据：附近的首页.png 各分区标题右侧「全部 ›」为深灰近黑；本页沿用 NearbySection 的品牌绿
- 现象：校园圈/附近活动/附近动态三处「全部 ›」取 --c-brand #36C99A，压 #EEF7F2 只有 1.93:1（帧内最暗 80,208,167 的 1x 抗锯齿值）；用户几乎看不见进入完整校园圈、活动、动态列表的唯一入口。
- 建议改法：「全部」改 --c-text-secondary（7.37:1）或 brand-800（6.45:1），不取 brand-500。
- 修复类别：CSS/token

## pages/profile/index（4 条）

### R10-L02-D08　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__profile__index__top.png`（sha16=`feaba3fa54ecf86c`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:414`
- 理想图依据：未登录个人主页.png 资料完整度卡（0% 为深色）
- 现象：0% 取 --c-brand #36C99A，白卡上 2.10:1；这是整张完整度卡唯一的进度读数，用户读不出当前进度。
- 建议改法：0% 改 --c-text-primary（16.85:1）或 brand-800（6.45:1）。
- 修复类别：CSS/token

### R10-L02-D09　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__profile__index__top.png`（sha16=`feaba3fa54ecf86c`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:444`
- 理想图依据：未登录个人主页.png 资料完整度卡右侧「去完善」胶囊
- 现象：去完善胶囊底 --c-brand #36C99A + 白字（22rpx/11px），2.10:1；这是完整度卡唯一主行动，白字读不出。
- 建议改法：胶囊底改 brand-800（白字 6.45:1）。
- 修复类别：CSS/token

### R10-L02-D10　P2 / 尺寸比例　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__profile__index__top.png`（sha16=`feaba3fa54ecf86c`，自同段前条继承）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:535`
- 理想图依据：未登录个人主页.png 我的故事四枚卡（约 73×120px，比例≈1:1.64）
- 现象：故事卡实测 82×150px（163.5rpx×300rpx，比例 1:1.83），每卡比理想图高约 30px、宽约 9px；四张叠加页头后把「我的互动」整段挤出首屏。
- 建议改法：卡高收到约 240rpx（120px），保持四等分与 3:4 竖版目标比例。
- 修复类别：CSS/token

### R10-L02-D11　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__profile__index__bottom.png`（sha16=`916ed5c739f5d5de`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:649`
- 理想图依据：未登录个人主页.png 我的互动四行（右侧人数为深色）
- 现象：我的互动四行「0人」取 #9AA39F，白底 2.59:1；这是每行唯一的计数数据，字号 26rpx，明显低于正文可读档。
- 建议改法：计数值改 --c-text-secondary（8.06:1）或 primary。
- 修复类别：CSS/token

## pages/register/index（3 条）

### R10-L01-D04　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__register__index__bottom.png`（sha16=`a800d37b0bcff4f2`）
- 源码证据：`apps/client/src/pages/register/index.vue:1102`
- 理想图依据：无基准，依据=规范文档 §1.2 配色（彩色底上的前景须可读）+ §1.3 小字档 12px 仍需 4.5:1
- 现象：「获取验证码」胶囊 `.sms-btn` 底取 `--c-brand`(#36C99A)、字色第1109行 `--c-text-inverse`（近白），实算 2.10:1；帧上该胶囊位于短信验证码行右端（x=242..321，y=280..322），白字与绿底同明度档，24rpx 的「获取验证码」五个字在低视力/强光下不可辨——而这颗胶囊是本页唯一的发码入口（第281行发码前置互斥，页面无第二条发码路径），读不出它等于用户拿不到验证码这一步。
- 建议改法：`.sms-btn` 底改 `--c-brand-800`（白字 6.45:1），倒计时/发送中两态（第1125/1129行）的深色字保持不动。
- 修复类别：CSS/token

### R10-L01-D05　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__register__index__bottom.png`（sha16=`a800d37b0bcff4f2`）
- 源码证据：`apps/client/src/pages/register/index.vue:920`
- 理想图依据：无基准，依据=规范文档 §1.4「页边距 `--page-padding` 32rpx」，且登录页/注册页/注册成功页属同一引导流，左右基准须一档
- 现象：表单卡 `.card` 左右 margin 写 `40rpx`（帧上卡边 x=20..357，实测留白 20px＝40rpx），而同一页表头文字块 `.hero__txt` 第886行写 `left:48rpx`（帧上「创建账号」左缘 x=24），两者在同一页内相差 8rpx、且都不等于规范页边距 32rpx（login 实测按钮左缘 17px＝34rpx≈32rpx，success 用 48rpx）；帧上头图标题与白卡左缘看不出同一条竖基准线。
- 建议改法：第886行 `left` 与第920行卡片左右 margin 统一改 `var(--page-padding)`（32rpx），使「XUNMI · CAMPUS / 创建账号」与白卡、login 按钮同一条左基准。
- 修复类别：单页

### R10-L01-D06　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__register__index__bottom.png`（sha16=`a800d37b0bcff4f2`）
- 源码证据：`apps/client/src/pages/register/index.vue:895`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级（极小档 `--fs-xs`＝10px＝20rpx 为全表最小档）
- 现象：表头眉标「XUNMI · CAMPUS」`.hero__eyebrow` 定 19rpx（9.5px），比 §1.3 的最小档 20rpx 还小 1rpx，是字号表外的孤值；叠加 `--c-brand-700`(#1F8D6A) 压头图薄荷底（实测底 (231,248,240)）实算 3.87:1，帧上这行 9.5px 的全大写小字在渐变上几乎是虚影，读不出品牌英文行。
- 建议改法：字号回 `var(--fs-xs)`（20rpx = 10px），字色换 `--c-brand-800`(#156B51，压薄荷底约 5.9:1）。
- 修复类别：CSS/token

## pages/register/success（2 条）

### R10-L01-D07　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__register__success__top.png`（sha16=`ec9e1c71c1ffb526`）
- 源码证据：`apps/client/src/pages/register/success.vue:171`
- 理想图依据：无基准，依据=规范文档 §1.2 配色（主按钮前景须可读）+ §1.3 正文档 15px
- 现象：主 CTA `.reg-success__btn` 是 `--c-brand`(#36C99A)→`--c-brand-400`(#55D5A7) 的 135° 渐变（帧上两端实测 (57,202,155)/(83,212,166)），文字第181行写死 `#ffffff`：左端 2.10:1、右端 1.85:1，30rpx/700 的「完善我的资料 →」整行压在同明度绿上——这是本页唯一的下一步入口，低视力/强光下读不出按钮指向哪个流程。
- 建议改法：渐变改为 `--c-brand-700`→`--c-brand-800`（或去渐变走纯 brand-800，白字 6.45:1），文字改 `--c-text-inverse` 保持语义。
- 修复类别：CSS/token

### R10-L01-D08　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/pages__register__success__bottom.png`（sha16=`ec9e1c71c1ffb526`）
- 源码证据：`apps/client/src/pages/register/success.vue:137`
- 理想图依据：无基准，依据=规范文档 §1.4「边框 `--c-border-light/default/strong`＝#EEF2F0/#DDE3E0/#C2CAC6」+ 组件规范 Card 的行分组口径
- 现象：已解锁清单卡三行之间的分隔线取 `--c-border-light`(#EEF2F0) 压白卡，实算 1.13:1（描边档里最浅的一档被当成行分隔用），帧上 y=484/522 两条线几乎与白底同值——三行「账号已创建并自动登录／可开始匹配…／下一步…」被读成一整段连续文字，「哪几条是并列清单项」这一层分组信息丢掉了（文本本身仍可读，故 P2）。
- 建议改法：行分隔改 `--c-border-default`(#DDE3E0)，或按 §1.4 的三档描边把分隔线抬到 `--c-border-strong`(#C2CAC6)。
- 修复类别：CSS/token

## subpackages/campus/campus/certification（4 条）

### R10-L05-D09　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`1a4f207e38497815`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:515`
- 理想图依据：无基准；依据=design-variables.scss:749 `--c-text-inverse` + post-topic.vue:663/671 同域口径
- 现象：「学生认证」标题 rgba(255,255,255,.95) 压 #6DDEB3 ≈1.6:1（32rpx/16px 粗体）；「返回」胶囊同色白字压 25% 白（合成 #9FE7CC）≈1.4:1，实测胶囊仅 88×60rpx。用户读不出页名、认不出返回，也就不知道自己在认证流程里。
- 建议改法：标题与返回文字改 `--c-text-primary`；返回胶囊 min-height 补到 88rpx。
- 修复类别：CSS/token

### R10-L05-D11　P2 / 素材缺失　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`1a4f207e38497815`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:357`
- 理想图依据：无基准；依据=模板自身要求（certification.vue:357 渲染 48rpx 相机图标）+ 组件规范 SafeImage
- 现象：学生证上传区（约 340rpx 高）顶部本应显示相机图标，帧内图标位置整块空白，只有两行文字偏在下半部；学信网截图上传区同样空。素材 `/static/assets/icons/common/camera.svg` 在 real 帧没有渲染。
- 建议改法：换已在 IMAGE_PATHS 注册的 PNG 版 camera.png，或给 SafeImage 传可见 fallback，保证上传区有图标锚点。
- 修复类别：单页

### R10-L05-D10　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`2eb95e6d29fd36dd`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:854`
- 理想图依据：无基准；依据=design-variables.scss:265 `--c-brand` / :749 `--c-text-inverse` + 正文 4.5:1
- 现象：主操作「提交审核」rgba(255,255,255,.95) 压实底 #36C99A = 2.02:1（实测按钮 x12–365 / y680–730，高 100rpx，标签 30rpx/15px 600）；用户看不清主操作文字，认证流程在这一步断掉。
- 建议改法：按钮底改 `--c-brand-800` #156B51（白字 6.01:1）或文字改 `--c-text-primary`；不要取 brand-700（4.14:1 仍不达标）。
- 修复类别：CSS/token

### R10-L05-D12　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`2eb95e6d29fd36dd`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:334`
- 理想图依据：无基准；依据=design-variables.scss:373 `--c-text-placeholder` 与 4.5:1 正文门槛
- 现象：三个 input 都没有显式 placeholder 样式，帧内平台默认灰实测 #A1A4A3 压字段底 #F3FAF6 = 2.35:1；「请输入你的学校全称/专业/在线验证码」这类填写指引读不清（上方虽有字段名，但输入框内只剩一片浅灰）。
- 建议改法：显式 placeholder-class/color，走 `--c-text-secondary` #4A524E（≥7:1），至少不低于 4.5:1。
- 修复类别：CSS/token

## subpackages/campus/campus/hub（4 条）

### R10-L04-D17　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`30f6de9051bced74`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:879`
- 理想图依据：素材/理想效果图/校园圈.png · 每张学校卡右侧「申请加入」描边胶囊；规范文档 §1.4 88rpx 热区 + §1.2 文字对比
- 现象：每行的「申请加入」实测仅 66×36px（131×71rpx），高度比 88rpx 少 17rpx；文字 `--c-brand-600` #2AAE83 白底 2.81:1，逐行主按钮既难点又读不清（顶帧四行同款）。
- 建议改法：描边胶囊 min-height 提到 88rpx，文字改 brand-700（4.14:1）或描边加粗加深。
- 修复类别：CSS/token

### R10-L04-D18　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`30f6de9051bced74`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:668`
- 理想图依据：素材/理想效果图/校园圈.png · 「我加入的 / 推荐圈子」分段，选中项深绿字+绿下划线
- 现象：选中段「推荐圈子」用 `--c-brand` #36C99A 压白底，实测 2.10:1（帧上 y286–300），同排未选「我加入的」#7D8783 约 3.7:1；选中段比未选段还浅，分段控件读不出当前态。
- 建议改法：选中段改 brand-600/700（≥4.14:1），下划线同色，未选段保持 text-tertiary。
- 修复类别：CSS/token

### R10-L04-D19　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`30f6de9051bced74`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:507`
- 理想图依据：无基准（校园圈.png 无返回钮），依据=规范文档 §1.4 热区 ≥88rpx
- 现象：页头返回圆钮 `width/height: 64rpx` 实测 32×32px，只有 88rpx 标准的 73%，且与标题行不同高（钮心 y≈97、标题行 y80–100）；系统返回可兜底，故记 P2。
- 建议改法：圆钮扩到 88rpx（或透明外扩热区到 88rpx），并与标题行垂直对齐。
- 修复类别：CSS/token

### R10-L04-D20　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`705e5b2525723e39`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:808`
- 理想图依据：素材/理想效果图/校园圈.png · 校名右侧「未认证」淡紫胶囊；规范文档 §1.2 次级文字 3:1–4.5:1 记 P2
- 现象：底帧 5 张卡的「未认证」胶囊用 #8B5CF6 压 #F5F3FF，实测 3.86:1，落在次级文字 3:1–4.5:1 档；连续五行的认证状态是选圈关键信息，读起来发虚。
- 建议改法：紫字下沉到 lavender-700 档（≥4.5:1）或加深底到 lavender-100，保持淡紫语义不变。
- 修复类别：CSS/token

## subpackages/campus/campus/index（5 条）

### R10-L05-D01　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`f60eaa5fdfd75f48`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:615`
- 理想图依据：无基准（规范文档§3 无本页条目）；依据=design-variables.scss:265 `--c-brand` / :749 `--c-text-inverse` 令牌真值 + 正文 4.5:1 门槛
- 现象：认证引导卡「去认证」胶囊实测 x296–356 / y135–173 = 120×76rpx，标签 rgba(255,255,255,.95) 压 #36C99A→#75E1B7 渐变（实测底 #4ACFA3–#68DCB1），合成对比仅 1.6–1.8:1、热区 76rpx 也低于 88rpx——未认证用户读不出按钮文字，而这是本页唯一的认证入口，等于拿不到认证流程。
- 建议改法：标签改 `--c-text-primary` #1A1E1C（对 #36C99A 8.0:1），或底改 `--c-brand-800`；同时给按钮 min-height:88rpx。
- 修复类别：CSS/token

### R10-L05-D02　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`f60eaa5fdfd75f48`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:265`
- 理想图依据：无基准；依据=组件规范（返回控件需可辨 + 88rpx 热区，参 EmptyState.vue:203-207 同域口径）
- 现象：左上返回圆实测 64rpx（帧内 28px），圆内箭头最深处只有 #8FB0B8，压在 20% 白圆合成底 #75DDB9 上 ≈1.4:1，箭头近乎不可见；热区 64rpx < 88rpx，页内没有第二个返回控件。
- 建议改法：返回图标换深色/白色前景（`--c-text-primary` 或纯白）并给圆形按钮外扩到 88rpx 热区。
- 修复类别：单页

### R10-L05-D03　P2 / 素材缺失　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`f60eaa5fdfd75f48`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:379`
- 理想图依据：无基准；依据=模板自身要求（index.vue:379 渲染 40rpx 作者头像）+ 组件规范 SafeImage
- 现象：话题卡页脚左侧 40rpx 头像位整块空白（未渲染任何像素），作者名「远山」因此被 space-between 推到卡片水平中心（x161–183，卡内 12–366，左端 27–47 全白）；页脚读成「中间一撮字 + 右边一个数」。
- 建议改法：查 author.avatar 的 real 档解析与 `<image>` 对 .svg/默认头像的支持，缺图时给 SafeImage 传 PNG fallback；无头像时不要把 40rpx 空位留在 flex 里。
- 修复类别：单页

### R10-L05-D04　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`f60eaa5fdfd75f48`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:389`
- 理想图依据：无基准；依据=模板自身要求（index.vue:389 渲染 24rpx 评论图标）+ 令牌对比门槛
- 现象：回复胶囊内 24rpx 评论图标没有渲染，只剩一个「12」；计数 #36C99A 压 #E8FAF3 = 1.94:1，用户既看不出这是回复数、也读不清数。
- 建议改法：图标换可在 mp-weixin 渲染的 PNG（或改用深色字形），计数改 `--c-brand-800`/`--c-text-primary`；缺图标时胶囊不应退化成孤立数字。
- 修复类别：单页

### R10-L05-D17　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`f60eaa5fdfd75f48`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:515`
- 理想图依据：无基准；依据=design-variables.scss:749 `--c-text-inverse` + 正文 4.5:1 / 非文本 3:1 门槛
- 现象：「未认证」徽章白字 rgba(255,255,255,.95) 压在 25% 白+渐变的合成底 #97E3C4 上实测 ≈1.4:1（22rpx），认证状态读不出；因下方引导卡重复了同一状态、不影响任务，故记 P2。
- 建议改法：徽章底改深色（`--c-brand-800`）或文字改 `--c-text-primary`；或删掉徽章、只留引导卡表达状态。
- 修复类别：CSS/token

## subpackages/campus/campus/post-topic（2 条）

### R10-L05-D05　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`514b039116cd18b5`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:845`
- 理想图依据：无基准；依据=design-variables.scss:265 `--c-brand` 与 126 文本档 + 正文 4.5:1/非文本 3:1
- 现象：选中分类「课程交流」标签实测 #24C592 压 chip 底 #E8FAF3 ≈2.05:1（26rpx），2rpx 描边 #36C99A 对同底也只有 1.94:1（<3:1）；选中的两个信号都不过门槛，6 个分类的默认选中态几乎读不出。
- 建议改法：选中态文字改 `--c-brand-700/800` 或 `--c-text-primary`，描边加深到对底 ≥3:1。
- 修复类别：CSS/token

### R10-L05-D06　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`5bf7b5e49089627f`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:815`
- 理想图依据：无基准；依据=组件规范热区 ≥88rpx（EmptyState.vue:203-207 自述的 44px 标准）
- 现象：分类 chip 高 = 20rpx×2 padding + 26rpx 字 = 66rpx（帧内实测 33px），低于 88rpx 热区；6 个 chip 是改分类的唯一入口，两行排布下第二行更难点。
- 建议改法：给 `.category-option` 加 min-height:88rpx（或把纵向 padding 提到 31rpx）。
- 修复类别：CSS/token

## subpackages/campus/campus/topic-detail（2 条）

### R10-L05-D07　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`fb5ab11ab82eed55`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:432`
- 理想图依据：无基准；依据=design-variables.scss:749 `--c-text-inverse` + 同域已修口径 post-topic.vue:663/671（头部改 #1A1E1C）
- 现象：导航标题「话题详情」rgba(255,255,255,.95) 压在渐变中段实测底 #6DDEB3 上 ≈1.6:1（34rpx/17px 粗体，未达 18.66px 大字豁免）；同带「返回」胶囊是白字压 25% 白，更低。用户读不出自己在哪一页，同域 post-topic 已改深色，这里是取档倒退。
- 建议改法：标题与返回文字按 post-topic 口径改 `--c-text-primary`（对 #6DDEB3 10.2:1）。
- 修复类别：CSS/token

### R10-L05-D08　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`ea16a52f7591e5dc`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:216`
- 理想图依据：无基准；依据=组件规范 components/common/EmptyState.vue:198-217（空态唯一动作）
- 现象：空态唯一按钮「返回」rgba(255,255,255,.95) 压 `--c-brand` #36C99A = 2.02:1（24rpx/12px 600），热区 62×44px=123×88rpx 已达标；按钮可点但读不出是唯一出口，空态用户离开这一步没有可读标识。
- 建议改法：底改 `--c-brand-800` #156B51（白字合成 6.01:1）或文字改 `--c-text-primary`；不要只加深到 brand-700（4.14:1 仍不足）。
- 修复类别：CSS/token

## subpackages/chat/chat-session/index（2 条）

### R10-L11-D09　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`374cc400040bbda4`）
- 源码证据：`apps/client/src/components/chat/ChatHeader.vue:221`
- 理想图依据：规范文档§3.7 聊天会话（组件清单含 ChatHeader，页头需承载会话级操作）
- 现象：上一轮 R9-L11-D12 的遮挡确实解了（本帧「···」墨迹 x≈250..266、系统胶囊左缘 x≈288，不再被盖住），但解出来的控件本身仍是 `56rpx×56rpx`=28×28px 的盒（:221-222），比 88rpx（44px）少 16px，而且它就贴着系统胶囊左缘只留 4px 缝（:127-130 注入的 padding-right），手指落点极易打到胶囊；这枚 more 是页面 `@more="openNavMenu"` 会话菜单的唯一入口，没有第二处出口。用户拿不到的是：会话级操作（菜单）点不稳、也无处替代。
- 建议改法：`.chat-header__more`（连同 :137 的 `.chat-header__back` 同型）抬到 `min-width/min-height: 88rpx`，图标尺寸不变、只扩热区，并保持与胶囊的 4px 视觉间隙。
- 修复类别：单页

### R10-L11-D10　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`374cc400040bbda4`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:2769`
- 理想图依据：规范文档§1.3 字体层级（正文 15/16px、辅助说明 14/15px、小字 13/12px 仅用于标签·时间戳）
- 现象：错误态这条「缺少会话标识，请从聊天列表或匹配结果进入。」是本页当前唯一一条正文，却复用元信息样式 `.meta-copy`（`font-size: var(--fs-base)` = 24rpx = 12px，消费点 :2057），取的是「标签·时间戳」档；帧上该行墨迹高约 9px，比同页头「聊天」16px 小一档，用户要凑近才读得清唯一的提示句。同页另有 `.chat-empty-hint` 走 `--fs-sm`（:2778），两条空态各取一档。
- 建议改法：页面级错误/空态提示改取 `--fs-lg`（28rpx=14px）辅助档并与 `.chat-empty-hint` 统一为一条空态字号口径。
- 修复类别：单页

## subpackages/chat/official-chat/index（2 条）

### R10-L11-D11　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`9a5a794feed8e379`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:662`
- 理想图依据：无基准，依据=规范文档§1.2 配色方案（brand 档只有 #36C99A/#2AAE83/#1F8D6A/#156B51）+ §1.1 原则 3「禁止私有色值」
- 现象：页头「官方」徽章文字取私有色 `#1F9A75`，色板内没有这一档（最近的是 --c-brand-700 #1F8D6A），徽章描边另写 `#36C99A`（:658）也是裸色；10px 字压白底实测对比 3.54:1，落在次级文字 3:1–4.5:1 区间，徽章这枚身份标记在小字号下偏灰。
- 建议改法：`color` 改 `var(--c-brand-700)`、`border-color` 改 `var(--c-brand)`，并把 `.official-badge__text` 字号抬到 `--fs-xs` 以上一档（22rpx）。
- 修复类别：CSS/token

### R10-L11-D12　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`625f0bb0ab86238b`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:667`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（辅助说明 14/15px；极小 10/11px 只用于角标·法务）
- 现象：页头副标题「你的恋爱小管家」写死 `font-size: 22rpx`（=11px，非 --fs-* 档位表里的说明档），落在规范「极小：角标·法务」档；它是对「寻觅助手」的身份说明，属 §1.3 辅助级，应取 28rpx/14px。同帧标题 34rpx（:647）也是表外私档，页头两行文字与全站页头 26–28px 主标题 + 14px 副标题的两档口径都对不上。
- 建议改法：`.nav-subtitle` 改 `font-size: var(--fs-lg)`（28rpx），`.nav-title` 的 34rpx 一并归口到 `--fs-2xl/--fs-3xl` 档。
- 修复类别：单页

## subpackages/circles/circles/circle-home（11 条）

### R10-L03-D17　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`248b9fbebd2b0213`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1295`
- 理想图依据：圈子详情，摄影圈参考.png 右上「加入圈子」实心绿钮；§1.2 主色阶
- 现象：头图「加入圈子」与底部同色主 CTA 的底都取 --c-brand-600 #2AAE83（帧上 hero 钮 (42,174,131)、底栏钮同值），白字 26rpx/30rpx 只有 2.81:1；底栏钮是该页唯一常驻主操作，低视力用户读不出按钮文案。
- 建议改法：底改 brand-800 #156B51（白字 6.45）或深一档绿，hero 与底栏同步，视觉语义不变。
- 修复类别：CSS/token

### R10-L03-D18　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`248b9fbebd2b0213`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1028`
- 理想图依据：圈子详情，摄影圈参考.png 页签行「动态」选中态
- 现象：选中页签「动态」取 --c-brand-500 #36C99A 压白，2.06:1（帧上实测 (53,201,154)）；28rpx/600 不属大字号，且下方的选中下划线同为 brand-500（2.06 <3:1 非文本），当前分区在画面上几乎不可辨。
- 建议改法：选中字/下划线改 brand-800（6.45）或深墨绿，未选中 #5D6C7B（5.36）不动。
- 修复类别：CSS/token

### R10-L03-D19　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`248b9fbebd2b0213`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:996`
- 理想图依据：圈子详情，摄影圈参考.png 白 sheet 顶缘 y=504→页签墨迹 y=560（56px@882≈24px@378≈48rpx）
- 现象：实帧 hero 下沿 y≈221 到页签墨迹 y≈279 之间是 58px（≈115rpx）纯白空带，约为理想图同位 24px 的 2.4 倍；成因是 .tabs 的 padding-top 无条件吃掉 --statusbar，未吸顶时这段也照占。
- 建议改法：未吸顶态不预留状态栏高度（仅 sticky 生效时补），或把该内衬从白 sheet 顶部移出，页签回到离 sheet 顶缘 ≈48rpx。
- 修复类别：CSS/token

### R10-L03-D20　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`98985dd974722588`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1242`
- 理想图依据：摄影圈参考.png 文末「查看全部话题」入口；§1.2 主色/正文 4.5
- 现象：「查看全部话题」文字取 --c-brand-500 #36C99A 压白，2.06:1（帧 y≈690，26rpx/600），入口淡到像占位；它是该 tab 下唯一的查看更多出口。
- 建议改法：改 brand-800（6.45）或深墨绿，箭头同色。
- 修复类别：CSS/token

### R10-L03-D21　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`98985dd974722588`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1217`
- 理想图依据：摄影圈参考.png feed 互动计数（深灰可读）；§1.2 三级文本
- 现象：feed 互动计数「0/0」写死 #8595A4，压白 3.08:1（帧上字心 (158,172,191)），24rpx 次级数据低于 4.5；同页时间行已改 --c-text-tertiary（circle-home.vue:1148），互动行漏改。
- 建议改法：改 --c-text-tertiary #6B7571（4.76）与时间行同口径。
- 修复类别：CSS/token

### R10-L04-D11　P1 / 需新建　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`248b9fbebd2b0213`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:532`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png · 头图底部一排 4 枚标签胶囊（摄影技巧 / 风景拍摄 / 人像写真 / 城市漫游）
- 现象：理想图头图里压在封面照上的 4 枚标签胶囊整排缺席（帧上「等 12 位朋友已加入」下方 y215–225 直接接白 sheet）；模板 `v-if="circleTags.length"` 依赖 real 档没有的圈标签字段，故 real 模式永远不渲染这一排。
- 建议改法：补齐圈标签数据源（圈详情接口返回 tags，或按圈 id 映射既有标签库），让 hero 的 tag-row 在 real 模式有内容可渲染。
- 修复类别：需新建目标功能

### R10-L04-D12　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`248b9fbebd2b0213`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:947`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png · 头图右下与底栏的「加入圈子」主 CTA；规范文档 §1.2 白字对比
- 现象：头图「加入圈子」与底栏同款 CTA 都是 `color:#ffffff` 压在 `--c-brand-600` #2AAE83 上（帧上 fill 实测 #2AAE83），对比 2.81:1，两个主行动按钮的文字都不达标。
- 建议改法：CTA 底色下沉到 brand-700（#1F8D6A，4.14:1）配白字，或改白底 brand-700 字，统一两处。
- 修复类别：CSS/token

### R10-L04-D13　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`248b9fbebd2b0213`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1325`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png · 底栏右侧白底描边铅笔（发帖）按钮，图标为绿色可见
- 现象：底栏圆形发帖 FAB 内 40rpx 铅笔图标实测最暗 #9AAABD，底 #E8FAF3，非文本对比仅 2.19:1，图标在浅薄荷圆里几乎看不见，用户找不到发帖入口。
- 建议改法：换用品牌绿线性铅笔图标（brand-600/700）或给 image 加同色 filter/蒙层，图标对底 ≥3:1。
- 修复类别：CSS/token

### R10-L04-D14　P1 / 需新建　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`98985dd974722588`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:555`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png · tab 下第一条「置顶【圈规】」浅绿公告条；规范文档 §3.11 组件清单 PinnedPostsBar/公告条
- 现象：理想图 tab 下方的「置顶【圈规】…」公告条整条缺席，帧上 tab 行下面直接是第一张帖子卡；模板 `v-if="pinnedNotice"` 的 pinnedNotice 只在 mock 档有值（:113-119），real 模式恒不渲染。
- 建议改法：给圈主页补真实公告数据源（圈公告接口或本地圈规常量），让置顶公告条在 real 模式可渲染并可点。
- 修复类别：需新建目标功能

### R10-L04-D15　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`98985dd974722588`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1028`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png · tab 行（选中态为绿字+绿下划线）；规范文档 §1.2 文字对比
- 现象：吸顶 tab 行选中项「动态」是 `--c-brand-500` #36C99A 白底（实测 2.10:1），未选中项 #5D6C7B 反而已到 5.4:1；选中态比未选中更淡，用户第一眼分不出当前在哪个 tab。
- 建议改法：选中 tab 文字与下划线改 brand-600/700（≥4.14:1），保留字重差做二次区分。
- 修复类别：CSS/token

### R10-L04-D16　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`98985dd974722588`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1242`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png · feed 末尾「查看全部话题」入口；规范文档 §1.2 链接对比
- 现象：feed 底部「查看全部话题 ›」用 `--c-brand-500` #36C99A 压在白底上，实测 2.10:1（帧上 y672–700 白块内），这是本页唯一进话题列表的入口，文字偏淡到容易被当成说明文字。
- 建议改法：链接文字改品牌 600/700 档（≥4.14:1），必要时加左图标强化可点性。
- 修复类别：CSS/token

## subpackages/circles/circles/index（5 条）

### R10-L03-D12　P1 / 层级遮挡　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`aa151a02952c0853`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:944`
- 理想图依据：兴趣圈列表.png 分类行「全部/摄影/旅行/音乐/运动/美食 + ☰」六枚全可见
- 现象：分类行可用宽 610rpx（686 内宽 − 64 筛选钮 − 12 gap），6 枚 chip 实测需约 652rpx；第 6 枚「美食」在 x≈313 被横滚容器裁断、后半压进 64rpx 筛选圆钮，帧上只读到「美」＋半个「食」（y116–143）。用户看不到、也点不全「美食」分类。
- 建议改法：收 chip 左右 padding（22→16rpx）与 gap（12→8rpx），或把筛选钮移出本行，保证 6 枚首屏完整。
- 修复类别：单页

### R10-L03-D13　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`aa151a02952c0853`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:1028`
- 理想图依据：兴趣圈列表.png 选中 chip 绿底白字（理想本身 2.06:1，仍须过 AA）
- 现象：选中分类「全部」白字压 --c-brand #36C99A，2.06:1；26rpx/700 不属大字号，低于正文 4.5，低视力用户读不出当前选中的分类。
- 建议改法：选中底改 brand-800 #156B51（白字 6.45），或深墨字压浅绿底；两态对比都要 ≥4.5。
- 修复类别：CSS/token

### R10-L03-D14　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`aa151a02952c0853`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:802`
- 理想图依据：兴趣圈列表.png 卡片右侧「加入」浅绿描边胶囊
- 现象：卡片主操作「加入」字与 2rpx 描边都取 --c-brand-500 #36C99A 压白，字 2.06:1、描边 2.06:1（<3:1 非文本）；帧上字心 #3ACB9C。主操作读不清、边界也不成立。
- 建议改法：字与描边改 brand-800（6.45），或改实心钮白字压 brand-800。
- 修复类别：CSS/token

### R10-L03-D15　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`04ad576ce9c6e2a0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:778`
- 理想图依据：兴趣圈列表.png 统计行约 13px；§1.3 极小档只给角标·法务
- 现象：卡片统计行「1.2w 人加入 · 6 条动态」压到 --fs-xs 20rpx=10px（令牌真值，非 .vue 兜底 22rpx；为 375px 不省略），低于列表数据的小字档 12–13px；好友行硬编码 22rpx=11px 同病（bottom 帧每卡可见）。
- 建议改法：恢复 --fs-base 24rpx 或 --fs-md 26rpx，靠省略号/放宽按钮列兜底，不再以缩字换宽度。
- 修复类别：CSS/token

### R10-L03-D16　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`04ad576ce9c6e2a0`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:672`
- 理想图依据：兴趣圈列表.png「热门」角标（浅粉底红字）
- 现象：「热门」角标字 --c-romance-700 #CC4A5F 压 --c-romance-50 #FFECEF，实测 3.94:1；--fs-xs 20rpx=10px 极小字（bottom 帧「游戏圈」可见）落在 3–4.5 的次级档。
- 建议改法：角标字加深到 ≥4.5（必要时补 romance-800 令牌或直接用 --c-text-primary），底与红语义不动。
- 修复类别：CSS/token

## subpackages/circles/circles/post-topic（3 条）

### R10-L04-D08　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`a8391a6f7e597895`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:822`
- 理想图依据：无基准页；依据=规范文档 §1.2（白字压浅底必须 ≥4.5:1）+ §1.3 页头标题层级
- 现象：页头标题「发布话题」是 `--c-text-inverse` 白字，压在 135° 薄荷→粉渐变的中段（实测标题带 #67DCB1–#6DDEB3），对比 1.65:1；标题正落在渐变最浅的一段，整句几乎融进底色。
- 建议改法：标题改深墨（如 --c-text-primary，brand-300 底上 9:1 以上），或把渐变整体压深两档，保证标题/图标全程可读。
- 修复类别：CSS/token

### R10-L04-D09　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`a8391a6f7e597895`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:978`
- 理想图依据：无基准页；依据=规范文档 §1.2 选中态令牌与 §1.1「一令牌一值」
- 现象：「发布到」里已选中的「校园圈」chip 用 `$green-primary` 着色在 `$green-light`(#E8FAF3) 底上，实测 1.94:1；同排未选中的「兴趣圈」是 #5F6763 深灰（约 5.3:1），选中项反而比未选中更看不清，选中态靠浅绿底区分几乎失效。
- 建议改法：选中 chip 文字改 brand-700/brand-800（底上 ≥4.5:1），保留浅绿底做选中提示。
- 修复类别：CSS/token

### R10-L04-D10　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`30b850e9e82de8db`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:1246`
- 理想图依据：无基准页；依据=规范文档 §1.2 禁用令牌（--c-status-disabled #DCE5E2）与页面/卡片底色规则
- 现象：底部「发布话题」禁用态 `background: $border-light`（#EEF2F0）铺在页面底 #EEF7F2 上，两个底色实测只差 1.03:1，按钮圆角边界完全看不出来，整颗主提交看起来像一截裸文字（帧上 y719–763）。
- 建议改法：禁用底改用专用 `--c-status-disabled`(#DCE5E2) 或 #E3EAE7 一档，让禁用按钮仍有可见轮廓（≥1.5:1 的形）。
- 修复类别：CSS/token

## subpackages/circles/circles/topic-detail（4 条）

### R10-L04-D04　P2 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`ef5a8be50e1a7cf5`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:810`
- 理想图依据：无基准页；依据=组件规范 EmptyState「flex:1 + justify-content:center 垂直居中」+ 规范文档 §1.4 间距
- 现象：空态块实测 bbox x121–256 / y161–319（中心 y=240），而页头下内容区 y122–780 的中线是 451，整块偏上 211px≈419rpx；`topic-detail.vue:810` 那条 `.empty-state{flex:1;justify-content:center}` 是模板无对应节点的死样式，宿主没给高度，EmptyState 的 flex:1 无处伸展，所以「居中」不成立。
- 建议改法：把空态包进 `.page-body` 这类可解析高度的 flex 列容器（或用模板上真实存在的 class 承接 810 行那段规则），让空态在页头与底栏之间真正垂直居中。
- 修复类别：单页

### R10-L04-D05　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`ef5a8be50e1a7cf5`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:202`
- 理想图依据：无基准页；依据=规范文档 §1.2 主按钮白字对比 ≥4.5:1
- 现象：空态唯一操作「返回」是白字压在 `--c-brand` #36C99A 实心胶囊上，实测 2.10:1（帧上按钮 fill #36C99A、字 #FFFFFF），本页没有其它出口时这颗主按钮的文字读不清。
- 建议改法：空态主按钮底色下沉到 brand-700（#1F8D6A，4.14:1）或改用白底 + brand-700 描边深字，保证按钮文字 ≥4.5:1。
- 修复类别：CSS/token

### R10-L04-D06　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`ef5a8be50e1a7cf5`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:470`
- 理想图依据：无基准页；依据=规范文档 §1.2 文字对比 ≥4.5:1
- 现象：页头左上「返回」是 `color: var(--c-neutral-0)` 白字压在 `rgba(255,255,255,.25)` 半透明白胶囊上（叠实测头图 #48D0A1 后胶囊成 #D1F3E8），实测对比仅 1.19:1，导航返回文字与胶囊边界一起消失。
- 建议改法：头图胶囊上改用 brand-800 深字或提高叠层不透明度并加深头图，把返回文字做到 ≥4.5:1。
- 修复类别：CSS/token

### R10-L04-D07　P3 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`0f5598055b20ce24`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:401`
- 理想图依据：无基准页；依据=EmptyState 组件规范 `hideSub`「空态只留一句」（EmptyState.vue:26/92-94）
- 现象：空态同时显示主标题「话题不存在或已被删除」与副标题「这里空空如也」，两句语义重复；组件专门为这一页加了 `hide-sub`，但这里没传，于是滚到底仍是同一句重复文案。
- 建议改法：该 `<EmptyState>` 加 `hide-sub`（或传更有信息量的 description，例如回圈子列表的指引）。
- 修复类别：单页

## subpackages/circles/circles/topics（3 条）

### R10-L04-D01　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`87f50d289253d66d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:725`
- 理想图依据：无基准页；依据=规范文档 §1.2 配色令牌（主文本/主色不得承载白字低对比）+ §1.3 页头标题层级
- 现象：页头「摄影」用 `color: var(--c-neutral-0)` 白字压在实测 #49D0A1 的薄荷头图上，对比 1.94:1（同排返回「‹」、铅笔、「···」图标同样 1.94:1，非文本也远低于 3:1），页名与三个头图控件在浅绿底上几乎消失。
- 建议改法：头图改用 brand-700/800 档实色或给标题/图标加同色深色叠层，白字对底至少做到 4.5:1（非文本 3:1）。
- 修复类别：CSS/token

### R10-L04-D02　P1 / 尺寸比例　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`87f50d289253d66d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1090`
- 理想图依据：无基准页；依据=规范文档 §1.4 间距令牌与组件规范 88rpx 最小热区
- 现象：底部固定栏「+ 加入」主 CTA 写死 `height: 84rpx`（帧上实心高 40–42px ≈ 79–83rpx），比 88rpx 热区标准少 4–9rpx；且头部另有一个同样偏小的半透明「+ 加入」胶囊（白字压半透明绿底实测 3.2–3.5:1，仍低于 4.5:1），全页没有达标替代出口。
- 建议改法：`.circle-bottom__join` 高度提到 ≥88rpx（44px），并把底部 FAB 同步对齐同一档。
- 修复类别：CSS/token

### R10-L04-D03　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`87f50d289253d66d`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1309`
- 理想图依据：无基准页；依据=规范文档 §1.2 动作控件文字对比 ≥4.5:1
- 现象：每条帖子底部唯一的动作胶囊「认识 TA」实测文字 #A9E7D3 落在白卡上（1.39:1，描边 #92E2C8 同样不足），源码声明 #2DB98A 而帧上是 35% 淡化的效果，胶囊读起来像一枚空描边框，用户看不出这里可点。
- 建议改法：定位该胶囊透明度来源（父级 opacity 或覆盖样式）并去掉，文字改 brand-600/700 深绿、描边同色，确保 ≥4.5:1。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/history（6 条）

### R10-L06-D15　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`a77d1a5c682a1fe5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:345`
- 理想图依据：无基准，依据=规范文档 §1.1.2（绿色只给行动件）与 §1.2 主文本档；页标题不属于行动件。
- 现象：页标题「今日已看」#36C99A 压顶部渐变 #E8F5E9 = 1.87:1（38rpx=19px/700，按大字 3:1 也不达）；同时这是本页最大的标题，却用了行动绿，和下方「去寻觅」抢强调位。
- 建议改法：标题改 `--c-text-primary`；绿色只保留给「去寻觅」。
- 修复类别：CSS/token

### R10-L06-D16　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`a77d1a5c682a1fe5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:382`
- 理想图依据：无基准，依据=规范文档 §1.2 色板与「统计数字是本页唯一数据读数」的信息层级。
- 现象：三个统计数字（实帧 0/0/0）#36C99A 压白卡 = 2.10:1（44rpx=22px/800，大字 3:1 未达）；用户要读的就是这三个数。
- 建议改法：取 `--c-brand-800`（6.45:1）或 `--c-text-primary`，标签保持灰。
- 修复类别：CSS/token

### R10-L06-D17　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`a77d1a5c682a1fe5`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:388`
- 理想图依据：无基准，依据=规范文档 §1.2（三级文本 #6B7571 / 四级 #9AA39F）与正文 4.5:1。
- 现象：统计标签「已浏览/已喜欢/已跳过」#9AA39F 压白卡 = 2.59:1（24rpx=12px/500），低于 4.5；这三个标签是数字的唯一释义，不能当装饰。
- 建议改法：改 `--c-text-tertiary`（#6B7571，白底 4.76:1）或 `--c-text-secondary`。
- 修复类别：CSS/token

### R10-L06-D18　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`593a2eca1757d652`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:202`
- 理想图依据：无基准，依据=规范文档 §1.2 行动按钮色档与正文 4.5:1；该按钮是空态唯一行动。
- 现象：「去寻觅」白字（`--c-text-inverse` 0.95 白）压 #36C99A 药丸 = 2.10:1（24rpx=12px/600，实帧药丸 x153–225 / y531–573）；绿底白字在本帧发虚，是整页唯一的可点件。
- 建议改法：底色压到 `--c-brand-800`（白字 6.45:1），或文字改深色；色值只改 EmptyState 一处，30+ 消费点同收益。
- 修复类别：CSS/token

### R10-L06-D19　P3 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`593a2eca1757d652`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:157`
- 理想图依据：无基准，依据=同分包页头一致性（segment/people 的返回件都是「‹」单书名号）。
- 现象：本页返回字形写的是「←」（U+2190，实帧渲染为横线+左箭头），而同分包 segment.vue:135、people.vue:163 都是「‹」；同一分包两种返回符号。
- 建议改法：统一为「‹」，或三页统一改用 `icons/common/back` 位图。
- 修复类别：单页

### R10-L06-D20　P3 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`593a2eca1757d652`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:263`
- 理想图依据：无基准，依据=规范文档 §1.3 文案标点/全半角口径与 match-success 正文「你和 TA」的既有空格写法。
- 现象：空态描述实帧「快去寻觅页发现有趣的TA吧」：中文夹拉丁缩写「TA」前后无空格，整句没有句末标点；同页与 match-success 的「你和 TA 」是带空格的。
- 建议改法：改为「快去寻觅页看看，发现有趣的 TA 吧」，并同步 zh-CN 的 `discoverHistory.emptyDesc`。
- 修复类别：单页

## subpackages/discover-extra/discover/match-success（7 条）

### R10-L06-D01　P0 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`a0d766c018d4dbce`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:53`
- 理想图依据：匹配成功页面.png 共同点卡「匹配度 90% / 85% / 80% / 79%」是匹配度真值的展示位；本页把设计稿示例值当常量输出。
- 现象：四行百分比恒为 `defaultScores = [90,85,80,79]`，`getScorePercent()` 只按行号取这张常量表，完全不读 partner、也不读任何接口分值；后端 reasons 不足 4 项时 :68 还会用默认标签补满四行，于是「匹配度 90%」对任何匹配对象都成立，属假计数。
- 建议改法：接真实分值字段/按共同点计算并透传；取不到真值时隐藏百分比（或整行不渲染），禁止用常量表冒充匹配度。
- 修复类别：需新建目标功能

### R10-L06-D02　P1 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`a0d766c018d4dbce`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/match-success.vue:181`
- 理想图依据：匹配成功页面.png 正文「你和 星野 互相喜欢了彼此」直接点名对方；实帧是匿名「TA」。
- 现象：实帧正文为「你和 TA 互相喜欢上了」，整页（标题/正文/卡片/按钮）没有任何一处显示对方昵称；`partner?.name ?? t('discover.partnerDefaultName')` 在 name 缺失时静默落成 i18n 的「TA」，右侧头像却有真实照片，用户看不到自己匹配的是谁。
- 建议改法：partner 缺 name 时按 userId 补拉资料；仍取不到就显示「对方昵称加载失败」并禁用「立即聊天」，不要用匿名 TA 冒充。
- 修复类别：单页

### R10-L06-D03　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`a0d766c018d4dbce`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:262`
- 理想图依据：匹配成功页面.png 正文实测最暗 #222633（深灰蓝），压页底约 13:1；实帧 #999999。
- 现象：副标题 #999999 压实测页底 #EDF8F4 = 2.62:1（32rpx=16px 正文），既低于 4.5:1，也比理想图同句浅了约两个色阶。
- 建议改法：改用 `--c-text-secondary`（#4A524E，压同底 7.37:1），与理想图深灰档对齐。
- 修复类别：CSS/token

### R10-L06-D04　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`a0d766c018d4dbce`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:271`
- 理想图依据：匹配成功页面.png 该行实测 #2C3045（深灰蓝，约 12:1），是正文不是强调色；实帧被画成品牌绿。
- 现象：「快去打个招呼吧~」#36C99A 压 #EDF8F4 = 1.94:1（28rpx=14px/500），低于 4.5:1；同时 §1.1.2 规定绿色=行动，这句话不是可点件却占用了行动色。
- 建议改法：改 `--c-text-secondary`，绿色只留给「立即聊天」。
- 修复类别：CSS/token

### R10-L06-D05　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`0775e306287e9cd1`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:457`
- 理想图依据：匹配成功页面.png 同区实测 #01B263（白卡上 2.82:1），实帧 #36C99A 更浅。
- 现象：四行「匹配度 xx%」#36C99A 压白卡 = 2.10:1（26rpx=13px/700），是卡片里唯一的读数文字，却比理想图再浅一档、低于 4.5:1。
- 建议改法：取 `--c-brand-800`（#156B51，6.45:1）或 `--c-brand-700`（4.14:1，仍不足），并同步设计确认色档。
- 修复类别：CSS/token

### R10-L06-D06　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`0775e306287e9cd1`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:492`
- 理想图依据：匹配成功页面.png 按钮实测 #22B97A（白字约 2.9:1），上一轮 R8-L06-D03 取 #2AAE83（Δ9,16,8）作为最接近档。
- 现象：「立即聊天」白字压 #2AAE83 = 2.81:1（30rpx=15px/800，属正文级）；上一轮把渐变 2.10 抬到 2.81 仍未过 4.5，属同轴未修净，不是新花样。
- 建议改法：底色压到 `--c-brand-800`（白字 6.45:1），或按钮文字改深色；若坚持理想图的亮绿，需要设计对「白字档 vs 4.5:1」做裁定。
- 修复类别：CSS/token

### R10-L06-D07　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`0775e306287e9cd1`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:516`
- 理想图依据：匹配成功页面.png 次按钮文字为深灰（白底高对比），实帧 #8A9694。
- 现象：「继续探索」#8A9694 压白按钮 = 3.06:1（28rpx=14px），落在 3:1–4.5:1 的次级文字带，比主按钮还难读。
- 建议改法：改 `--c-text-tertiary`（#6B7571，白底 4.76:1），保持弱于主按钮但不低于 4.5。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/matching（4 条）

### R10-L05-D13　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`d0e8d8ce5f3cdea6`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:329`
- 理想图依据：匹配中页面.png · 双头像轨道（理想图右头像为人像照，无覆盖标签）
- 现象：右头像上的「匹配中」标签 #43CCA1 压在 rgba(255,255,255,.85) 合成底 #F4F4F2 上 = 1.84:1（22rpx/11px 700）；标签读不出，右圆只剩一块灰面，用户无法判断是在「加载中」还是「头像坏了」。
- 建议改法：标签文字改 `--c-brand-800`/`--c-text-primary`（对白 ≥6:1），底改实白并保留描边。
- 修复类别：CSS/token

### R10-L05-D14　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`d0e8d8ce5f3cdea6`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:321`
- 理想图依据：匹配中页面.png · 双头像轨道（右侧人像应能辨出是照片）
- 现象：右侧头像整圆取样 #B5B4A7±3，没有五官/发际结构，只有中心一块 #F4F4F2 高光；R8-L05-D19 把白罩 0.35 提到 0.6（`--c-overlay-bg-strong`）后，2rpx 模糊的人像被压平为均匀灰面——属于修过头，理想图该圆是清晰人像。
- 建议改法：白罩回落到 0.3–0.4（补一档低透明度 token）或只保留 2rpx 模糊，保证圆内仍能读出人像轮廓。
- 修复类别：CSS/token

### R10-L05-D15　P2 / 尺寸比例　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`d62a108ab5a2c7d2`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:339`
- 理想图依据：匹配中页面.png · 双头像（理想图人像直径 252/853=29.5% 屏宽，折合 378px 屏 112px/222rpx）
- 现象：帧内双头像整圆 83px=165rpx（占屏宽 22.0%），比理想图小 26%；同时两圆间距 77px 大于理想折合 57px，轨道读成「小头像 + 大空档」。
- 建议改法：`.match-loading__avatar` 168rpx→224rpx，`.match-loading__avatars` gap 28rpx→14rpx，把间距收回理想比例。
- 修复类别：CSS/token

### R10-L05-D16　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`d62a108ab5a2c7d2`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:212`
- 理想图依据：匹配中页面.png · 右上「跳过」胶囊 + 组件规范热区 ≥88rpx（EmptyState.vue:203-207 口径）
- 现象：「跳过」胶囊实测 52×24px = 104×48rpx（padding 14rpx + 26rpx 字），左返回圆 72×72rpx，两个出口都低于 88rpx 热区；跳过属可选操作且有返回/自动跳转兜底，故记 P2 而非 P1。
- 建议改法：跳过改 padding 20rpx 30rpx + min-height:88rpx；返回圆补外扩热区到 88rpx。
- 修复类别：CSS/token

## subpackages/discover-extra/home/segment（4 条）

### R10-L06-D08　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`83fe0df2cc3f189e`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:124`
- 理想图依据：无基准，依据=规范文档 §1.3（列表主文字+辅助行）与同页 8 行「学校 · 附近/230km」的既有句式。
- 现象：顶帧第 5 行「小新生」卡内只有姓名+在线，第二行整行空白（实测 y445–465 墨迹 0 像素）；`metaText()` 在校名和距离都为空时直接 `return distance` 返回空串，而同列其余 8 行都有「学校 · 附近/230km」。
- 建议改法：两字段都空时给统一兜底（如「暂未填写学校」），或隐藏 meta 行并补垂直节奏，至少与同列表其他行保持两行结构。
- 修复类别：单页

### R10-L06-D09　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`83fe0df2cc3f189e`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:342`
- 理想图依据：无基准，依据=规范文档 §1.2 三级/四级文字档与 WCAG 非文本 3:1；行尾箭头是整行可点的唯一方向提示。
- 现象：9 行行尾「›」全部取 `--c-text-quaternary` #C8CFCD，压白卡 = 1.58:1，低于非文本 3:1；帧内箭头只在 x345–347 三列有墨，几乎看不见。
- 建议改法：换 `--c-text-tertiary`（#6B7571，白底 4.76:1）或 `--c-brand-700`，保持 30rpx。
- 修复类别：CSS/token

### R10-L06-D10　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`1b8b943529bfbde2`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:216`
- 理想图依据：无基准，依据=规范文档页头范式（返回圆形控件）与必点热区 88rpx 下限。
- 现象：页头返回热区 `width:56rpx; height:56rpx` = 28px（实帧白圆 x17–42 / y65–91），低于 88rpx；有系统返回手势兜底，所以不判 P1，但同分包其余页是 64–72rpx，本页最小。
- 建议改法：提到 88rpx，或用透明外扩热区保住 28px 视觉圆。
- 修复类别：CSS/token

### R10-L06-D11　P3 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`1b8b943529bfbde2`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:235`
- 理想图依据：无基准，依据=规范文档 §1.3「页面主标题 26–28px」及同分包页头同层级对照。
- 现象：同分包页头标题四种取档：本页 44rpx=22px（实帧字面 21px）、people.vue:291 为 32rpx=16px（实帧 13px）、history 38rpx=19px、likes 44rpx；同一层级标题跨页跳档。
- 建议改法：分包统一到 44rpx 或统一到 38rpx，people 跟随，不再逐页私有。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（2 条）

### R10-L07-D01　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`be1f188ad2352cef`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:517`
- 理想图依据：无基准页，依据=仓内自陈触控下限「≥88rpx(44px)」（security/index.vue:996 注释引 AppShell.vue:334）+ 本页自定义导航无原生返回键（pages.json:49 `navigationStyle: custom`）
- 现象：页头返回是 `width/height: 64rpx` 的白圆钮（:517-518），帧上实测墨圈 x=18..46、y=59..86 约 29×28px（含 1rpx 描边≈32px=64rpx），只有 88rpx(44px) 口径的 73%；本包 pages.json:49 全局 navigationStyle=custom、本页无原生导航返回键，页内也没有第二个返回出口（游客态唯一去向是「立即登录并完善」）⇒ 两种身份都只能点这枚 32px 圆钮离页，低于热区口径且无替代出口
- 建议改法：`.page-header__back` 的 width/height 由 64rpx 提到 88rpx（内层 icon 仍 40rpx），或给 `.page-header__top` 整行 88rpx 命中区
- 修复类别：单页

### R10-L07-D02　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`be1f188ad2352cef`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:655`
- 理想图依据：无基准页，依据=规范§1.3「小字 --fs-md/base=13/12px 用于标签·时间戳」「极小 --fs-xs/sm=10/11px 用于角标·法务」
- 现象：数据概览三栏的说明字「总浏览量/今日访客/今日浏览量」走 `--fs-xs`=20rpx=10px（:655），帧上量得墨迹 y=151..159=9px；§1.3 把这类标签定在 小字档 13/12px，10px 是「角标·法务」档。同卡数字是 18px（--fs-3xl），标签只有其 55%，甚至比同页页头副标题（11px）还小一档，三栏读数失去说明层级
- 建议改法：`.overview__label` 由 `var(--fs-xs)` 改 `var(--fs-base)`（24rpx=12px），与 §1.3 小字档对齐
- 修复类别：CSS/token

## subpackages/discover-extra/likes/index（6 条）

### R10-L06-D21　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`bdd604904eac16a0`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1135`
- 理想图依据：无基准，依据=规范文档 §1.1.2（绿色只给行动件）与 §1.2 主文本档；页标题不是行动件。
- 现象：页标题「匹配列表」#36C99A 压 #EEF7F2 = 1.93:1（44rpx=22px/700，大字 3:1 未达）；H5 的渐变在 mp 被降级成纯绿，标题直接吃行动色。
- 建议改法：mp 分支改 `--c-text-primary`（或 brand-800），标题不要用行动绿。
- 修复类别：CSS/token

### R10-L06-D22　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`bdd604904eac16a0`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:403`
- 理想图依据：无基准，依据=规范文档 §1.2 行动按钮（brand 渐变 + 白字）与正文 4.5:1。
- 现象：「微信一键登录」白字压 brand 渐变，实测左端 #35C698 = 2.17:1、右端 #2BB085 = 2.74:1（30rpx=15px/600），整条按钮都不达 4.5；这是登录墙的主行动。
- 建议改法：渐变两端都压到 `--c-brand-800`，或按钮文字改深色；需设计对「白字档」做裁定。
- 修复类别：CSS/token

### R10-L06-D23　P1 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`bdd604904eac16a0`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:247`
- 理想图依据：无基准，依据=规范文档 §1.6 安全区口径与「登录墙三个按钮在首屏内」的既有规格（NotLoggedWaiting 注释 12.7-12.9）。
- 现象：游客墙第三按钮「稍后再看」被顶到画布底：文字墨迹 y800–812，home indicator y805–808 正压字面；按钮 96rpx 热区约 785–833，画布 814 只留约 30px，约 19px 热区出屏；页头返回键是返回上一页、不是同一出口。根因是 100vh 组件挂在带页头的宿主里，整页高约 1 屏+页头（滚到底时内容上移约 220px）。
- 建议改法：游客态把组件高度改为 `calc(100vh - 页头高)`，或页头改 fixed 不占流，保证三按钮完整落在首屏安全区内。
- 修复类别：单页

### R10-L06-D24　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`eebddc97b508e140`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:369`
- 理想图依据：无基准，依据=规范文档 §1.3「小字 12px」与 §1.2 次级文字 4.5:1；这 4 个标签是图标唯一释义。
- 现象：4 个功能标签「精确匹配/聊天互动/校园邂逅/关系成长」#6B7571 压 #EEF7F2 = 4.36:1（22rpx=11px，实帧字高 10px），落在 3–4.5 的次级文字带且字号低于 §1.3 小字档。
- 建议改法：字号提到 `--fs-base`(24rpx)，色档改 `--c-text-secondary`（7.37:1）。
- 修复类别：CSS/token

### R10-L06-D25　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`eebddc97b508e140`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:1077`
- 理想图依据：无基准，依据=规范文档 §1.4 间距档与登录墙纵向平衡（同组件顶帧把第三按钮顶出画布）。
- 现象：底帧滚到底后内容止于「稍后再看」y593，画布 814 余 221px 空带（27% 帧高）；同一页顶帧则把第三按钮压到 home indicator 上，两个极端同源于 `.likes-page--guest` 页头与 100vh 子组件各占一遍高。
- 建议改法：与 D23 一并收口：页面高度按「视口 - 页头」计算，底部安全区只留一份，末屏不再出现 221px 死区。
- 修复类别：单页

### R10-L06-D26　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`eebddc97b508e140`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes/index.vue:627`
- 理想图依据：无基准，依据=WCAG 非文本 3:1 与同分包返回件（history/segment 均为深色 #1A1E1C 档）。
- 现象：页头返回图标是烘焙成 #A4B1C2 的位图（实帧最暗 164,177,194），压在 64rpx 白圆上 = 2.18:1，低于非文本 3:1；同分包 history/segment 的返回件是深色，视觉权重也不一致。
- 建议改法：换深色 back 素材或加 filter 压到 `--c-text-primary`，与同分包统一。
- 修复类别：CSS/token

## subpackages/discover-extra/nearby/people（3 条）

### R10-L06-D12　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`fdd81b15a4030b38`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:331`
- 理想图依据：无基准，依据=规范文档 §3.5 分段控件与 §1.2 选中态色档；选中态必须与非选中态可辨。
- 现象：选中 tab「附近的人」文字 #2AAE83 压 #E8FAF3 = 2.59:1（26rpx=13px/700），2rpx 选中描边 #36C99A 压同底仅 1.94:1；选中/未选中只剩这两档，未过正文 4.5 也未过非文本 3:1。
- 建议改法：文字取 `--c-brand-800`（压 #E8FAF3 约 6:1），描边取 brand-700/800；或选中底改实心深绿+白字（需重算对比）。
- 修复类别：CSS/token

### R10-L06-D13　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`fdd81b15a4030b38`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:308`
- 理想图依据：无基准，依据=规范文档 §3.5 的「附近/同城」分段是切换列表的唯一入口。
- 现象：tab 外框实测 y100–132 = 33px ≈ 65rpx 高（`padding:18rpx 0` + 26rpx 文本），低于 88rpx；「同城的人」没有第二个切换入口，纵向命中区比最低热区少 11px。
- 建议改法：纵向 padding 18→30rpx 或加 `min-height:88rpx`，用 flex 居中保持文字基线不动。
- 修复类别：CSS/token

### R10-L06-D14　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`fdd81b15a4030b38`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:240`
- 理想图依据：无基准，依据=规范文档 §3.5「附近的人（按距离/同城分段 + 人卡列表）」；距离是该页的排序依据。
- 现象：全帧 6 个完整行的第二行只有校名（东南大学/北京师范大学…）而无任何距离，两个残行同样；本页排序用的正是 distanceText（people.vue:91-95），但整页不显示该值；同域 segment.vue:119-125 已有「学校 · 距离/附近」的 metaText 口径。
- 建议改法：复用 segment 的 metaText：distanceText 为空落「附近」，有值显示「学校 · 230km」。
- 修复类别：单页

## subpackages/discover/activities/index（2 条）

### R10-L13-D05　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`0c278acd12b1a609`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:805`
- 理想图依据：无基准页；依据=规范文档 §1.2（--c-brand #36C99A 用于主色/选中，浅底标签应配深字）+ 同组件 StatusState heat 档 R9-L13-D03「浅底换深字」收口口径（StatusState.vue:97-100）
- 现象：每张活动卡标题旁的分类标签「综合」用 --c-brand #36C99A 字（:805）压 --c-brand-50 #E8FAF3 底（:806），实测对比≈1.95:1（#36C99A L=0.449 / #E8FAF3 L=0.922），连非文字 3:1 都不到，20rpx(10px) 小标签几乎读不出；top 帧三张卡（周末篮球/骑行踏青/城市露营）同病。
- 建议改法：.row-category-tag 前景由 --c-brand 改吃同族深档 --c-brand-700（#1F8D6A，压 #E8FAF3≈3.9:1）或更深，浅底不变。
- 修复类别：CSS/token

### R10-L13-D06　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`2c5364ed60e833de`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:897`
- 理想图依据：无基准页；依据=规范文档 §1.2（三级文本 --c-text-tertiary #6B7571）+ §1.1（页面底 --c-bg-page #EEF7F2）；本行为次级状态提示
- 现象：列表末尾「没有更多活动了」由 .loading-more__text 用 --c-text-tertiary #6B7571（:897）直接印在页面底 --c-bg-page #EEF7F2 上（该行不在白卡内），实测对比≈4.36:1（L 0.170 / 0.911），低于 22rpx(11px，--fs-sm) 小字应达的 4.5:1；bottom 帧可见该灰字发虚。
- 建议改法：.loading-more__text 由 --c-text-tertiary 升到 --c-text-secondary（#4A524E，压页底≈6.4:1），或把该行并入白卡。
- 修复类别：CSS/token

## subpackages/discover/discussions/index（2 条）

### R10-L13-D03　P3 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`5adcfa2d874bd5ba`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:183`
- 理想图依据：无基准页；依据=规范文档 §1.3（正文·列表主文字档 = --fs-xl/2xl 15/16px；--fs-lg 14px 属「说明」档）
- 现象：feed 行主标题 .row-title 取 --fs-lg（28rpx=14px），比 §1.3 给「列表主文字」的 15/16px 低一档；top 帧每条讨论主句（如「图书馆自习day5，打卡坚持住」「博物馆新展开放，值得一看」）均按 14px 渲染，作为列表第一级文字偏小。（同帧热度药丸 R9-L13-D03 已把文字升到 --c-text-warning-dark，画面可见，本条不重报。）
- 建议改法：.row-title 字号由 --fs-lg 升到 --fs-xl（30rpx=15px），与 §1.3 列表主文字取齐。
- 修复类别：CSS/token

### R10-L13-D04　P3 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`cf8db6de40925a78`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:190`
- 理想图依据：无基准页；依据=规范文档 §1.3（说明档 = --fs-lg/xl 14/15px；--fs-base 12px 属「标签·时间戳」档）
- 现象：feed 行摘要 .row-subtitle 与 .empty-state 共用一条规则取 --fs-base（24rpx=12px），落在「标签·时间戳」档；但它是正文级说明（bottom 帧「图书馆后门、南门传达室、三食堂侧门三个点位，猫粮由社团统一采购。」），§1.3 说明应为 14/15px，故摘要比规范小一档。
- 建议改法：.row-subtitle 升到 --fs-lg（28rpx=14px）；把 .empty-state 从合并选择器里拆出单独保 12px，避免误伤空态文案。
- 修复类别：CSS/token

## subpackages/legal/agreement/index（2 条）

### R10-L13-D09　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`03dca813473f4131`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:394`
- 理想图依据：无基准页；依据=规范文档 §1.3（页面主标题/页头标题 = 26–28px；--fs-5xl 22px 明确属「卡片大标题」档）
- 现象：页头标题「用户协议」由 AppShell .shell__title 渲染，取 --fs-5xl（44rpx=22px），即 §1.3 的「卡片大标题」档，而非「页面主标题」26–28px 档；top 帧页头标题比规范要的小一档，与卡片内 16px 的 .card__title 拉不开层级（此档全站页头共用，fix 走组件）。
- 建议改法：.shell__title 字号由 --fs-5xl 升到 §1.3 页头档（约 52rpx/26px），或明确改判该档为 22px 并同步 §1.3 文档。
- 修复类别：CSS/token

### R10-L13-D10　P3 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`8efa6952ef06d62a`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:314`
- 理想图依据：无基准页；依据=R8-L13-D13「.legal-header 与 .legal-content 连成同一张白卡（同色同列）」的组件口径
- 现象：既然 header 与 content 已合成一张白卡（同底色、上下圆角相接），.legal-header 仍保留 border-bottom:1rpx（:314），在「最后更新」元信息行与正文之间留一条内部分隔线，把一张卡从中间切成两截，与连卡口径相悖；bottom 帧元信息/正文同处一卡却带横线残留。
- 建议改法：去掉 .legal-header 的 border-bottom，改由 header 的 padding-bottom 控制元信息与正文的间距。
- 修复类别：CSS/token

## subpackages/legal/privacy/index（2 条）

### R10-L13-D07　P3 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`324a227de5920212`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:409`
- 理想图依据：无基准页；依据=规范文档 §1.3（可读正文 15/16px；「极小」档 10/11px 明确标注「角标·法务」）；LegalTextPage.vue:411-412 已把字号一半登记为 NEEDS-RULING（本轮画面未变，非重报）
- 现象：隐私政策正文 .legal-content__text 取 --fs-md（13px），落在「标签·时间戳」档；§1.3 把「法务」列在极小档（10/11px）、可读正文列在 15/16px，13px 两档都不贴，top 帧整页正文按此渲染。（R9-B05 改的是 footer 可达性/间距，本条字号轴未被触碰。）
- 建议改法：给法务正文定档——按 §1.3 法务取 --fs-sm（11px）或按可读正文取 --fs-xl（15px），别再留 13px 的中间值。
- 修复类别：CSS/token

### R10-L13-D08　P3 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`1cb58aaad4dbf996`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:403`
- 理想图依据：无基准页；依据=规范文档 §1.4（卡片阴影单一来源 --card-shadow）+ R8-L13-D13「.legal-header 与 .legal-content 连成同一张白卡」的组件口径
- 现象：一张法务白卡被拆成 .legal-header（无 box-shadow，:306）与 .legal-content（box-shadow: var(--s-card-soft)，:403）两段——卡上半无投影、下半有投影，且两段都没吃 §1.4 的 --card-shadow；同域再叠 SectionCard(--c-elevation-1)、活动卡(--s-sm)，全站三套卡片投影并存、取档不一。
- 建议改法：把投影上移到 .legal-page 容器、或对 header/content 用同一枚 --card-shadow，收口成单一来源。
- 修复类别：CSS/token

## subpackages/market/detail/index（3 条）

### R10-L14-D01　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`e4d8958e824f2017`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:465`
- 理想图依据：无基准页，依据=规范文档§1.3 字体层级表（"页面主标题 26–28px / 700–800 / 页头标题"，正文档为 --fs-xl/2xl 15/16px）+ 同域两页页头同屏读数
- 现象：页头标题「商品详情」取 var(--fs-2xl)＝32rpx＝16.1px/700（帧内字带 y60–73 高 14px），落在 §1.3 的**正文档**（15/16px）而不是页面主标题 26–28px 档；同域 shop「逛逛」与 wallet「我的钱包」均为 --fs-5xl 44rpx＝22.2px/800（帧内 y64–83 / y61–78），同一分包三页页头标题两套档、字重 700 与 800 两制，且无一到 §1.3 页头档 ⇒ 从逛逛进详情，页头层级掉回正文级，标题与正文说明（13.1px）只差 3px。
- 建议改法：三页页头标题统一提到 §1.3 页面主标题档（52–56rpx＝26–28px/700–800），过渡期至少先把本页 --fs-2xl 与同域 --fs-5xl 取齐。
- 修复类别：CSS/token

### R10-L14-D02　P3 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`e4d8958e824f2017`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:520`
- 理想图依据：无基准页，依据=规范文档§1.2 配色角色表（--c-brand #36C99A 用途＝主按钮；brand-600/700 用途＝按压态·深色文字，未登记 brand-800 作按钮底色）+ 组件规范 common/EmptyState.vue:198-212 状态卡动作钮
- 现象：状态卡动作钮底色本页已按 R9-L14-D01 改到 --c-brand-800 #156B51（帧内实测 (14,103,76)，6.0:1 达标），而组件库里同一角色的"状态卡动作钮"EmptyState.vue:202 仍是 --c-brand #36C99A（0.95 白字只有 2.02:1）⇒ 全站同一类按钮两套底色，§1.2 只把 --c-brand 登记为"主按钮"用途，brand-800 作为大色块底色无规范条目；用户在不同页看到的"可点主钮"深浅不一致。
- 建议改法：把 EmptyState .empty-action 一并升到同一深档（或新增 --c-btn-primary-strong 令牌供两处引用），在组件侧收口一致性，不要回退本页已达标的高对比度。
- 修复类别：CSS/token

### R10-L14-D03　P2 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`d88eb00b526cbeff`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:537`
- 理想图依据：无基准页，依据=组件规范 common/EmptyState.vue:144-154（同一现象"空态块贴顶不居中、下方留白 487px"在 R6-L05-D02 被判位置 P2 并以 flex:1＋justify-content:center 收口）＋本页基类 .product-state 自身口径（detail/index.vue:484-488 flex:1 + justify-content:center）
- 现象：上一轮 R9-L14-D05 为"对齐 shop"给封存卡加了 `flex: 0 0 auto` + `margin: 60rpx`，`flex:0 0 auto` 直接抵消了基类 .product-state 自己的 flex:1＋垂直居中 ⇒ 帧内卡顶锚在 y120–348、卡心 234，而内容区（导航底 87 → home 条 790）心在 439，整块偏上 205px，卡下方 442px 是纯页底；改前该块心在 429（只偏上 10px）。**上一轮修得不对**：同一条位置轴上，它把一个本来居中的块改成了贴顶。
- 建议改法：删掉 `flex: 0 0 auto` 与 `margin` 的上外边距，保留白卡外观（margin 只留左右 --page-padding），让卡沿用基类 flex:1＋justify-content:center 居中；shop/wallet 同口径一起改。
- 修复类别：单页

## subpackages/market/shop/index（3 条）

### R10-L14-D04　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`9cc209dfab253470`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:733`
- 理想图依据：无基准页，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx＝16px」+ 同域 wallet 卡（wallet/index.vue:370 走 var(--sp-8) var(--sp-6)）实测对照
- 现象：封存卡内边距写成私字面值 `80rpx 48rpx`＝40px/24px，是 §1.4 卡片内边距档（--card-padding 32rpx＝16px）的 2.5 倍；同域 wallet 同一张封存卡用令牌 var(--sp-8) var(--sp-6)＝16px/12px ⇒ 帧内 shop 卡 343×176px、wallet 卡 344×124px，同一面墙两张卡高差 52px、左右内距差 12px，三页里 detail 又因多一个钮到 228px，同域三套卡高。
- 建议改法：三页封存卡统一 `padding: var(--card-padding) var(--sp-6)`（32/24rpx），去掉 80rpx/48rpx 私值，卡高随之成同一档。
- 修复类别：CSS/token

### R10-L14-D05　P3 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`9cc209dfab253470`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:760`
- 理想图依据：无基准页，依据=规范文档§1.2 文字色角色表（--c-text-secondary #4A524E 说明／--c-text-tertiary #6B7571 弱说明）+ 同域 detail 同一 i18n 串（commerce.sealedDesc）同屏读数
- 现象：同一句「该功能暂未开放，开放时间将另行通知」在白卡上取 --c-text-tertiary #6B7571（帧内笔画最暗 (91,102,97)，y252–263），detail 同句上一轮已升 --c-text-secondary #4A524E（帧内 (56,64,60)，y240–252）⇒ 两帧并排一眼深浅不同；R9-L14-D03 的升档理由是"当时 detail 无白卡、铺在页底只有 4.36:1"，本轮 detail 补卡后该前提消失，同域三页却固定成两套文字色档（本页与 wallet 三档、detail 二档）。
- 建议改法：三页封存说明统一取一档（白卡上 --c-text-tertiary 4.76:1 或 --c-text-secondary 7.37:1 都可接受，定一个并写进规范 §3 补登记）。
- 修复类别：CSS/token

### R10-L14-D06　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`9cc209dfab253470`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:377`
- 理想图依据：无基准页，依据=同域 detail 封存分支的页内出口控件（detail/index.vue:310-319 返回钮）+ 组件规范 EmptyState.vue:122-132（状态块自带 actionText 出口）
- 现象：本页封存分支只渲染锁图标＋标题＋说明三行，卡内可点控件实测 0 个，而同一面墙在 detail 是带「返回」钮的（帧内 detail 卡 228px 高含钮、shop 卡 176px 无任何钮）；用户读完"暂未开放"后页内没有下一步，退出只剩页头一枚 30px 白盘（命中盒 44px），两页同一状态给出两套出口能力。
- 建议改法：按 detail 同口径补页内出口钮（复用 .product-state__btn 档：min-height --btn-height-md 96rpx、--c-brand-800 底），或三页统一"不放页内钮"并在规范里定档，别一页有一页没有。
- 修复类别：单页

## subpackages/market/wallet/index（4 条）

### R10-L14-D07　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`574bde41f97d75b8`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:278`
- 理想图依据：无基准页，依据=88rpx（44.4px）触控下限 + 同域两页上一轮已落地的同一控件口径（shop/index.vue:437-444、detail/index.vue:444-451 均以透明 ::after 把 64rpx 视觉圆的命中盒扩到 88rpx）
- 现象：页头返回键 .wallet__back 只有 64rpx＝32.3px（帧内白盘实测 30×30px，x17–46/y54–83），没有同域两页上一轮补的 ::after 命中盒；本页 navigationStyle 为 custom（pages.json:49）没有系统返回箭头，封存分支内又没有任何控件（wallet/index.vue:212-216）⇒ 唯一退出控件热区 <88rpx 且无替代出口：点不中这 30px 的用户走不出"我的钱包"，只能杀掉小程序。上一轮批次 R9-B49 改了本页的颜色token/素材/字号/间距四条，独独漏了 shop、detail 同轮补掉的这条可达性轴。
- 建议改法：与 shop/detail 同口径给 .wallet__back 加 `&::after { content:""; position:absolute; top/right/bottom/left:-12rpx }`，视觉圆保持 64rpx、命中盒提到 88rpx。
- 修复类别：CSS/token

### R10-L14-D08　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`574bde41f97d75b8`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:393`
- 理想图依据：无基准页，依据=规范文档§1.3 字体层级表（小字档 --fs-md/base 13/12px；极小 --fs-xs/sm 10/11px 仅供角标·法务）+ 同域两页同一 i18n 串（commerce.sealedDesc）读数
- 现象：本页封存说明仍是 --fs-sm，令牌实值 22rpx＝11.1px（design-variables.scss:561；.vue 里 fallback 写 24rpx 是过期字面量），帧内说明字带 y211–220 实测高约 10px；同域 shop（:759）与 detail（:563）上一轮已按 R9-L14-D11 提到 --fs-md 26rpx＝13.1px（帧内 12–13px），该卡建议原文写"三页同改"，实际只改了两页 ⇒ 全站唯一一句"为什么这页是空的"在钱包页仍与角标/法务同档，比同屏的封存标题（15.1px）小 4px。
- 建议改法：wallet/index.vue:393 改 `font-size: var(--fs-md)`，与 shop:759/detail:563 取齐，并清掉 24rpx 过期 fallback。
- 修复类别：CSS/token

### R10-L14-D09　P3 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`574bde41f97d75b8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:369`
- 理想图依据：无基准页，依据=规范文档§1.4 间距表（--sp-* 阶梯，无 60rpx 档）+ 同域两页封存卡上外边距读数
- 现象：封存卡上外边距取 var(--sp-10)＝48rpx＝24px（帧内页头底 90→卡顶 115 净距 25px），同域 detail/shop 写死私值 60rpx＝30px（detail 导航底 87→卡顶 120 净距 33px）⇒ 同一面墙的卡在三页离头 25/48/33px 三种落位；上一轮 R9-L14-D16 只把左右边距收到 --page-padding，纵向这一半仍留在两套值里（60rpx 也不在 §1.4 的 sp 阶梯上）。
- 建议改法：三页统一 `margin: var(--sp-10) var(--page-padding)`（把 detail:539/shop:732 的 60rpx 私值换成令牌）；若采纳 D03 的居中口径，则三页一起改成居中并删掉上外边距，二者取一后写进规范 §3。
- 修复类别：CSS/token

### R10-L14-D10　P3 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`574bde41f97d75b8`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:268`
- 理想图依据：无基准页，依据=规范文档§1.4 页边距 --page-padding 32rpx＝16px + 同域两页"卡与页头同左缘"口径（R9-L14-D07 对 shop 的同一判据）
- 现象：页头左右内缩写 --sp-4＝16rpx＝8px，帧内返回盘左缘落 x≈9（shop 同控件左缘 x≈16、detail≈12），而本页封存卡左缘是 15.5px（上一轮 R9-L14-D16 刚收到 --page-padding）⇒ 卡比自己的页头内容向右缩 7px，页头与卡不成一条竖边；同域三页页头内缩 8/12/16px 三套值。
- 建议改法：页头横向内缩改 var(--page-padding)（32rpx），与本页封存卡及 shop/detail 的 16px 左缘对齐。
- 修复类别：CSS/token

## subpackages/profile-extra/feedback/history（2 条）

### R10-L11-D07　P2 / 空态文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`2d2d8113aa4ffde2`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:301`
- 理想图依据：无基准，依据=组件规范 `apps/client/src/components/common/EmptyState.vue`（props 支持 `actionText`/`action` 事件，:31/:124-131 渲染动作按钮）
- 现象：空态只传 `type/title/description`，没有传组件已支持的 `actionText` ⇒ 帧上「暂无反馈记录 / 提交反馈后将在此处显示」下方约 440px 全空，页面把「提交后才有内容」讲清楚了，却没给「去哪儿提交」的出口；用户在这页只能靠左上角返回自己找反馈表单。
- 建议改法：给 EmptyState 传 `action-text`（复用既有反馈提交入口路由）并接 `@action` 跳转，让空态自带一条出口。
- 修复类别：单页

### R10-L11-D08　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`d9bc16362995e1f5`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:401`
- 理想图依据：无基准，依据=规范文档§1.1 原则 3「一令牌一值：只准引用 var(--c-*)/--sp-*/--r-*/--s-*」+ §1.4 间距档
- 现象：筛选芯片内衬写死 `padding: 12rpx 22rpx`、条间 `gap: 12rpx`（:396），其中 22rpx 在间距档位表里根本没有对应档（--sp-* 实盘为 4/8/12/16/20/24/32/48rpx，design-variables.scss:547-557），是页面私值；帧上四枚芯片因此高矮一致但左右内衬与同站其它 chip 取档不同，横向节奏（22rpx 内衬 + 12rpx 间隙）与规范 16/20rpx 档差 2–6px。
- 建议改法：`padding: var(--sp-3) var(--sp-5)`、`gap: var(--sp-3)`，把 22rpx 私值收进现有档位。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/album（3 条）

### R10-L10-D15　P0 / 素材缺失　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`4e97df511e28645f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:83`
- 理想图依据：无基准页，依据 = 规范 §1.1 第 5 条「除头像/人物照片外其余视觉元素对照理想效果图 100% 还原」+ §3.9「生活瞬间…无占位」的同域照片格口径 + 本页自陈判据（album.vue:67-83 已认定「photoGallery 里存着功能图标路径」是脏数据）
- 现象：6 格里第 2、3 格渲染的是整枚绿色定位针功能图标（实测品牌绿笔画 x≈155..223、x≈272..340 / y≈117..217），不是照片，只有第 1 格是真人照片（同带 x≈20..120 的暗色像素）。R8-L10-D10 留下的判据 NON_PHOTO_ASSET_RE 只拦「icons / svg-spec 目录段 + .svg 后缀」，而这两条条目照样通过 :511 的 <image> 出图 ⇒ 说明它们的真实路径既不是 .svg 结尾也不含这两个目录段，判据形态没覆盖到（帧与 R8 之前一致，本页上一轮无批次）。更糟的是页头 :459 仍显示「3 / 6」、说明卡 :555 仍显示「已上传 3 张，剩余 3 个空位」——photoCount 按 filled 计数，而这 2 枚图标被判成 filled。用户拿不到：相册 3 张照片里 2 张看不见（点进去也只是图标大图），并且被"已上传 3 张"的假计数误导，以为不需要再补照片。
- 建议改法：判据从"黑名单路径形态"改成"白名单扩展名"——只放行 .jpg/.jpeg/.png/.heic/.webp 或含 /uploads/ 段的条目，其余（含任何 .svg、任何 pin/icon 形态）降级为空槽走 :522 的「+」分支，photoCount/「3 / 6」/「已上传 N 张」三处同口径；store 侧 photoGallery 清洗按 :81 已登记的 HANDOFF 继续跟。
- 修复类别：单页

### R10-L10-D16　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`d09360579e2e8b91`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:946`
- 理想图依据：无基准页，依据 = 规范 §1.3 字号表（说明文字该走「辅助 --fs-lg/xl = 14/15px」，「极小 --fs-xs/sm = 10/11px」只用于角标·法务）
- 现象：bottom 帧「照片使用说明」卡的汇总行与规则正文（实测墨迹行 y≈506..515、531..540、556..565、580..589，字高仅 10px）与卡上方那行长按提示（y≈456..467）全部取 --fs-sm = 22rpx = 11px，即 §1.3 的「极小·角标/法务」档：:946 规则正文、:925 汇总行、:938 圆点、:905 提示行四处同档；而这些句子承担的是操作指引（上限 6 张 / 单张 10MB / 长按删除 / 设为头像），不是角标。同页主按钮文字 :894 已在 R8 归到 --fs-lg(14px) ⇒ 同一页两套说明档。
- 建议改法：:905/:925/:938/:946 四处由 var(--fs-sm) 升 var(--fs-lg)，与 §1.3 辅助档和同页 CTA 对齐。
- 修复类别：CSS/token

### R10-L10-D17　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`d09360579e2e8b91`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:879`
- 理想图依据：无基准页，依据 = 仓内热区口径 AppShell.vue:334（88rpx）+ 同域 location.vue:524 .location-btn height 96rpx、R6-B57/D09 已按该口径把「地图选点」提到 88rpx
- 现象：主 CTA「添加照片」（实测全宽绿胶囊 y≈355..389，高 35px ≈ 70rpx）高度只由 padding: var(--sp-4) var(--sp-8) 撑出、无 min-height ⇒ 低于同域两枚主按钮（location.vue:524 声明 96rpx、实测 y≈566..615 = 50px）与本仓 88rpx 口径。因点空位格（:505 handleAddPhoto）也能进选图，有替代出口 ⇒ 不判 P1。
- 建议改法：.album-add-btn 补 min-height: 88rpx（或对齐同域 96rpx），flex 居中保持文字视觉位置不动。
- 修复类别：单页

## subpackages/profile-extra/profile/favorites（3 条）

### R10-L10-D18　P2 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`a3ae5b319271e3c0`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:152`
- 理想图依据：无基准页，依据 = 组件规范 src/components/common/EmptyState.vue:145-154（R6-L05-D02 自陈口径：空态块应在可用区垂直居中，"另一半在宿主：父级必须给可解析高度"）
- 现象：实测（378×814 帧）空态内容块占 y≈144..296（星标 144..192、主标题 207..219、副标题 228..239、按钮 252..296），中心 y≈220 远高于视口中心 407，y≈297..813（517px ≈ 1025rpx）整屏只有薄荷底 ⇒ R7-L10-D17 给本页补的 display:flex + flex-direction:column（:152-153）配 min-height:100vh 在帧上不成立：mp-weixin 下 <EmptyState> 外面还包一层自定义组件节点，组件内 .empty{flex:1 0 auto}（EmptyState.vue:154）传不到本页 flex 父级，宿主这一半实际没生效。用户拿不到：空态没有落在视觉中心，页面读起来像只加载了一半。
- 建议改法：在页面里给 <EmptyState> 套一层 .favorites-empty-wrap{display:flex;flex:1;justify-content:center;min-height:0}（宿主这一半补齐即居中），不要再只依赖组件内那条 flex:1 0 auto。
- 修复类别：单页

### R10-L10-D19　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`a3ae5b319271e3c0`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:44`
- 理想图依据：无基准页，依据 = 组件规范 EmptyState.vue:30-31（actionText「传入即渲染按钮」，按钮文案必须指得动真实目的地）+ 本仓 zh-CN 语料对同一页的自陈名（i18n/locales/zh-CN.ts:315「村口动态」、:1589「去村口发第一条 ›」）
- 现象：同一个目的地在本帧出现三个名字：副标题写「在帖子页点收藏」（实测 y≈228..239）、按钮写「去广场逛逛」（y≈252..296，取键 village.history.backToVillage），而 :116 goVillage 跳的是 ROUTES.TAB.VILLAGE = /subpackages/village/village/index，该域在语料里自陈为「村口」⇒ 用户按完按钮落地页的标题与刚看到的"广场"对不上，而文案让他去的"帖子页"在本页没有任何同名入口。
- 建议改法：本页动作文案改指「村口」（复用 profile.publishFirst 的措辞或 village 域标题键），副标题的"帖子页"同步改成同一称呼。
- 修复类别：单页

### R10-L10-D20　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`a3ae5b319271e3c0`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:178`
- 理想图依据：无基准页，依据 = 规范 §1.3 字号表（「极小 --fs-xs/sm = 10/11px 角标·法务」「辅助 --fs-lg/xl = 14/15px 说明」「标题 --fs-3xl/4xl = 18/20px 区块标题」）+ 组件规范 src/components/common/EmptyState.vue
- 现象：空态主标题「还没有收藏」取 --fs-lg = 28rpx = 14px（实测墨迹高 ≈13px，y≈207..219），副标题取 --fs-base = 24rpx = 12px（实测 ≈12px，y≈228..239）⇒ 主/副只差 2rpx、两行都落在 §1.3 的「辅助/小字」档，帧上没有任何一句是"标题"，本页唯一的状态宣告读起来和补充说明同权重。R9-B03 那批改的是 .empty-sub 的颜色（可达性轴，帧上确实变深了），字号档这条轴没动。
- 建议改法：.empty-msg 升 var(--fs-xl)/var(--fs-2xl)（30/32rpx）与 .empty-sub 拉开两档，让空态有主句。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/location（3 条）

### R10-L10-D09　P1 / 空态文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`cd4f03c802e34602`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:89`
- 理想图依据：无基准页，依据 = 规范 §1.1 第 5 条（视觉元素须与真实状态一致）+ §3 无该页条目 ⇒ 按「空态不得自证有数据」口径比
- 现象：同一帧里空态与地图互相打脸：白卡（实测 x≈13..365 / y≈123..204）写「暂无位置信息」+「经度 — · 纬度 —」，下方地图（y≈220..440）却钉着一枚红色定位针（实测红像素 y≈354..380）并挂白底气泡「当前位置」。针的坐标来自 :76 写死的 DEFAULT_CENTER(39.9042/116.4074)，气泡文案在 :89 兜底成「当前位置」四个字。用户拿不到：看地图会判定"我已经定位成功了"，实际系统里没有任何位置数据，于是既不会去点「重新定位」也不会点「地图选点」。
- 建议改法：hasAnyLocationFact 为 false 时 mapMarkers 返回空数组（地图只留默认中心、不出针不出气泡），或把 callout 文案改成「默认视图 · 尚未定位」。
- 修复类别：单页

### R10-L10-D10　P3 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`cd4f03c802e34602`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:382`
- 理想图依据：无基准页，依据 = 规范 §1.1 第 3 条「页面只引用 var(--c-*)/--fs-*/--sp-*，禁止私写值」+ §1.3 字号档位表
- 现象：本页只有页头标题走了令牌（:325 var(--fs-4xl)，R6-B57/D10 那一批改的），卡内三行仍是裸写数字：值 32rpx（:382）、标签 24rpx（:377）、坐标 22rpx（:389）、提示 22rpx（:492）。数值本身落在 --fs-2xl/--fs-base/--fs-sm 三档上，但绕过令牌 ⇒ 帧上与同域 album.vue:894（已归 var(--fs-lg)）取档方式不一致，改档位时本页不跟随。
- 建议改法：32/24/22rpx 分别替成 var(--fs-2xl)/var(--fs-base)/var(--fs-sm)，并清掉 :378/:390/:432/:479/:493 上写成 #9AA39F 的假兜底（--c-text-tertiary 真值 #6B7571）。
- 修复类别：CSS/token

### R10-L10-D11　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`55ff8d5935ca0448`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:493`
- 理想图依据：无基准页，依据 = 规范 §1.3（--fs-sm 11px 属「极小·角标/法务」档，此处却是唯一的手动选点指引正文）+ §1.2 页面底色 #EEF7F2 的文字对比口径（同 R9-L10-D18 判定）
- 现象：bottom 帧（与 top 同画面，本页不滚动）地图下方那行唯一的手动选点指引「轻点右侧「地图选点」，在地图上选择新位置」（实测墨迹行 y≈476..495）= 22rpx 裸值 + --c-text-tertiary #6B7571 压在 --c-bg-page #EEF7F2 薄荷底上，实算对比度 4.33:1，低于正文级 4.5:1（11px 小字不享大字号豁免）；该行兜底还写成 #9AA39F（= quaternary 档，同底 2.37:1）。同页 :397 的卡内提示因压在白卡上是 4.76:1 ⇒ 同一角色两行一处达标一处不达标。用户拿不到：读不清"怎么手动改位置"这句指引。
- 建议改法：与 R9-L10-D18 同口径升 var(--c-text-secondary) #4A524E（同底 7.37:1），字号取 var(--fs-base) 起步，并删掉假兜底。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/other（8 条）

### R10-L10-D01　P1 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b141692bb4a6fe88`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:87`
- 理想图依据：他人显示主页.png · 身份卡区（头像圆片在左，姓名+♀+在线 / 年龄学校城市 / 距离在线 三行排在头像右侧同一排）；规范 §3.9 逐字「白卡顶部：头像 72px 浮动骑压（下探约一半）+ 右侧三行」
- 现象：实测（378×814 帧）头像圆片 x≈20..105 / y≈255..345，白卡上缘 y≈285（骑压量 ≈56px/85px ≈ 66%，这一半符合 §3.9「下探约一半」），但姓名「小新生」落在 y≈365..378（x 36..76）、资料行 y≈430..445，两枚胶囊在右侧 y≈355..385 / y≈395..415 ⇒ 文字块整体在头像下缘（y≈345）之外，身份卡读成「头像→姓名→资料」竖排，而不是理想图/§3.9 的「头像在左 + 右侧三行」两栏；根因是 PublicIdentity.vue:101 的 padding-top:148rpx 把 __main 推到 y≈360。上一轮批次 R9-B17 改的正是本页身份卡位置档（帧 sha16 ac224f62→b141692b 画面确实变了），但头像与文字块仍不同排 ⇒ 上一轮修得不对。用户拿不到：首屏无法把「这张脸」和「姓名/在线状态」当成一组信息读。
- 建议改法：保持头像骑压量不变，把 .public-identity 的 padding-top 由 148rpx 收到 ≈40rpx 并给 .public-identity__main 加 padding-left ≈120rpx（让开头像宽），使姓名三行回到头像右侧。
- 修复类别：单页

### R10-L10-D02　P2 / 尺寸比例　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b141692bb4a6fe88`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:88`
- 理想图依据：他人显示主页.png · 身份卡头像圆片（相对屏宽约 16.7%）；规范 §3.9 逐字「头像 72px」＝144rpx
- 现象：头像写死 176rpx×176rpx（378px 帧换算 88.7px，实测外径 x≈20..105 = 85px、y≈255..345 = 90px，含 8rpx 白描边），比 §3.9 规定的 72px 大一档（+18~23%）；理想图同区域头像占屏宽 ≈16.7%，本帧占 ≈22.5%。头像偏大 + 卡内 padding-top 148rpx 一起把文字块顶到头像下沿之外，是 D01 竖排的放大器。
- 建议改法：width/height 收 144rpx 对齐 §3.9 的 72px，描边 8rpx 保留。
- 修复类别：CSS/token

### R10-L10-D03　P1 / 需新建　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b141692bb4a6fe88`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:92`
- 理想图依据：他人显示主页.png · 身份卡第三行「2.3km · 在线」；规范 §3.9「右侧三行（姓名+♀+在线胶囊 / 年龄学校城市 / 距离在线）」——第三行在本帧整行不存在
- 现象：帧上身份卡只有姓名（y≈365..378）+ 「资料暂未完善」（y≈430..445）两行文字，§3.9 要求的第三行「距离 · 在线」不渲染（v-if="distanceText"，而 :91 注释自陈「后端 /profile/{id} 目前不下发 distanceText/online 字段，真机常为空」）；姓名行右侧也读不到「在线」胶囊（:45 分支，实测姓名墨迹止于 x≈76，其右到胶囊 x≈286 之间是空档）。用户拿不到：他人主页上「离我多远 / 此刻在不在线」这两个决定是否打招呼的字段永久缺席，且没有任何空态占位提示它们"暂时取不到"。
- 建议改法：distanceText 为空时不再整行开关，按 :88「资料暂未完善」同口径给固定占位「距离待更新」；在线胶囊补 profile.online 缺省为 true 的兜底渲染，或页面侧接 nearby 距离做数据源。
- 修复类别：需新建目标功能

### R10-L10-D04　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b141692bb4a6fe88`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:239`
- 理想图依据：他人显示主页.png · 身份卡右上「喜欢」胶囊（浅粉底 + 心动粉字）；规范 §1.1 第 3 条「一令牌一值，页面只引用 var(--c-*)，禁止私有色值」+ §1.2「心动粉 --c-romance-500 #FF6B81 / romance-50 #FFECEF」
- 现象：「喜欢」胶囊文字写死 `color: #B3264A`（实测该胶囊 tint 底 x≈286..342 / y≈355..385，内部字形呈深玫红，明显比理想图的心动粉暗两档）。全量 grep theme/design-variables.scss 对 B3264A 零命中 ⇒ 这是上一轮 R9-L10-D05 为把 2.27:1 拉到 5.30:1 自造的私有色：对比度那条轴修对了，但违反 §1.1 第 3 条「禁止私有色值」，色相也偏离 §1.2 的粉色角色（粉=喜欢）。同帧底栏「喜欢」按钮仍是 var(--c-love) #FF6B81（RelationshipCTA.vue:175）⇒ 同一屏两处"喜欢"两种粉。
- 建议改法：走既有深档令牌（--c-romance-700 #CC4A5F 配更深一档 tint 底，或把胶囊底由 --c-tint-pink-50 换 romance-50 后取 romance-600/700 字色），不在组件里造新色值。
- 修复类别：CSS/token

### R10-L10-D05　P2 / 层级遮挡　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`97a819e026a9f0d5`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:482`
- 理想图依据：他人显示主页.png · 顶部导航区（左上返回钮独立成行，不与任何正文文字同排）；规范 §3.9「全屏头图 + 左上返回/右上更多」
- 现象：bottom 帧顶部，滚上来的姓名「小新生」墨迹落在 y≈56..93 / x≈47 起，而 position:fixed 的返回钮深色圆底实测 y≈56..93 / x≈16..44 —— 两者同带、水平只剩 3px 缝，姓名读起来像返回钮的标签；再往上是头像残片滚到 y≈0..30（状态栏带内）。根因是页头 :463 fixed + :482 background: transparent，正文滚过时没有任何底衬或避让，页头与正文挤在同一行。理想图/§3.9 的页头只有两枚控件、不与正文同排。用户拿不到：滚到中段时"这是页头还是正文"分不清，返回钮的字形识别性被旁边文字拉低。
- 建议改法：给 .other-header 常驻一层与头图同色的向下渐变底衬（复用 PublicHero 的 __top-gradient 配方），或给姓名行加 padding-left 让开 88rpx 热区，消除文字与圆底的叠印。
- 修复类别：单页

### R10-L10-D06　P2 / 圆角　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`97a819e026a9f0d5`）
- 源码证据：`apps/client/src/components/profile/public/PublicBio.vue:16`
- 理想图依据：他人显示主页.png · 全页白卡（签名卡/兴趣卡/共同点卡/生活瞬间卡/最近动态卡圆角同档）；规范 §1.4「卡片圆角 --card-radius = 40rpx = 20px」
- 现象：同一屏 6 张卡圆角取了两档：签名卡 32rpx（PublicBio.vue:16）、生活瞬间卡 32rpx（PublicGallery.vue:72）对身份卡 40rpx（PublicIdentity.vue:102）、兴趣卡 40rpx（PublicInterest.vue:38）、共同点卡 40rpx（PublicCommon.vue:109）⇒ bottom 帧上相邻两张卡（兴趣/共同点卡与下方生活瞬间卡，实测白卡带 y≈221..261 与 y≈317..362）一个 20px 圆角一个 16px 圆角，角部弧线跳档；§1.4 只有 --card-radius 40rpx 一档。
- 建议改法：三处 32rpx 统一改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R10-L10-D07　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`97a819e026a9f0d5`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:100`
- 理想图依据：他人显示主页.png · 全页卡片左右边缘对齐成一条竖线；规范 §1.4「页边距 --page-padding = 32rpx = 16px」
- 现象：身份卡横向外边距 40rpx，而它下面每一张卡都是 24rpx（PublicBio.vue:14、PublicInterest.vue:36、PublicCommon.vue:107、PublicGallery.vue:70 同一行写法）⇒ 实测 top 帧身份卡白底 x≈21..356，其下签名卡/兴趣卡白底 x≈13..365：左右各内收 8px（≈16rpx），两栏卡片边缘不成一条线；理想图里全页卡片左右缘是对齐的，且 §1.4 页边距 --page-padding = 32rpx，两档都不是它。
- 建议改法：六张卡横向统一 var(--page-padding)，纵向间距保留现档。
- 修复类别：CSS/token

### R10-L10-D08　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`97a819e026a9f0d5`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:208`
- 理想图依据：他人显示主页.png · 身份卡右侧两枚胶囊（与底栏三枚按钮同体量）；仓内热区口径 AppShell.vue:334 的 88rpx（同域 RelationshipCTA.vue:97 已按 92rpx 落地）
- 现象：身份卡「喜欢」「打招呼」两枚首屏主操作热区高只有 56rpx（源码 :208；实测 tint 底 y≈355..385 与 y≈395..415，即 ≈30px 与 ≈20px 可见带，含内衬不足 88rpx 档的一半）；同页底栏同名两枚按钮是 92rpx（RelationshipCTA.vue:97）⇒ 同一屏同一动作两种可点体量。因底栏有同动作替代出口，不判 P1。
- 建议改法：height 提到 88rpx（图标 28rpx / 文字 --fs-sm 不动，靠 flex 居中吸收），与底栏 92rpx 拉平一档。
- 修复类别：单页

## subpackages/profile-extra/profile/privacy（3 条）

### R10-L10-D12　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`c87729fe39520734`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:299`
- 理想图依据：无基准页，依据 = 规范 §1.2（主色 #36C99A 是品牌绿底，反色文字须按 §1.2 深档 brand-700/800 承托）+ §1.3 字号档（--fs-sm 属角标档）
- 现象：页头副标题「控制你的信息展示范围」（绿色页头实测 y≈0..101，副标题墨迹行 y≈76..89）是 --c-text-inverse + opacity:0.85 压在 brand-500→brand-400 渐变上：0.85 白混色后实算 #E1F7EF vs #36C99A = 1.88:1（纯白也只有 2.10:1），帧上这一行几乎糊成一条绿底浅痕，必须眯眼才认得出字。主标题 40rpx 粗体还能靠字号撑住，副标题 22rpx 直接不可读。用户拿不到：这页是干什么的（信息展示范围控制）这句唯一说明读不出来。
- 建议改法：去掉 opacity，把页头渐变底色由 brand-500/400 换成同族深档 --c-brand-700 #1F8D6A→--c-brand-800 #156B51（白字 4.1:1 / 6.4:1），或副标题改深色字压浅绿头；字号从 --fs-sm 提到 --fs-lg。
- 修复类别：CSS/token

### R10-L10-D13　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`c87729fe39520734`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:427`
- 理想图依据：无基准页，依据 = 规范 §1.2 色板（brand-100 #D1F5E7 / brand-50 #E8FAF3 / 页面底 #EEF7F2 三档必须能拉开层次）+ §1.4 卡片阴影口径
- 现象：页尾说明块底取 var(--c-brand-50) = #E8FAF3，而页面底是 --c-bg-page #EEF7F2，两色差 ΔR6/ΔG3/ΔB1（肉眼不可辨）⇒ 实测该块三行文字落在 y≈540..594，其周围（y≈525..605）与页面底同色、没有任何容器边界，四行文字像直接浮在薄荷底上的一坨灰字，R7-L10-D11 补的"说明卡"在画面上等于不存在；同帧上方两张真白卡（y≈105..245、y≈255..520，#FFFFFF）层次反而清楚。
- 建议改法：说明块底改 var(--c-bg-container) 白 + var(--card-shadow)（与上方两卡同一容器配方），或按 §1.2 用 brand-100 #D1F5E7 拉开一档明度。
- 修复类别：CSS/token

### R10-L10-D14　P2 / 圆角　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`c87729fe39520734`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:313`
- 理想图依据：无基准页，依据 = 规范 §1.4「卡片圆角 --card-radius = 40rpx = 20px」；同域对照 subpackages/profile-extra/profile/other 的 5 张卡（PublicIdentity.vue:102 等，40rpx）
- 现象：本页两张白卡（开关卡实测 y≈105..245、入口卡 y≈255..520）圆角走 var(--r-xl, 24rpx) = 12px，比 §1.4 规定的卡片圆角 40rpx(20px) 小一档，帧上卡角明显比同分包他人主页那批卡"方"；同域两页同一角色（页面分组白卡）取了两档圆角。
- 建议改法：.privacy-page__section 与 .privacy-page__note 的圆角统一 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/tasks（3 条）

### R10-L11-D01　P2 / 素材缺失　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`61945df33196e714`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:286`
- 理想图依据：无基准，依据=规范文档§1.1 原则 4「emoji/图形一律走标准 SVG 图标集」+ §1.5 组件规范（SafeImage/图标资产）
- 现象：第 3 行「发布首条动态」的行图标直接复用底部导航栅格图 `/static/assets/icons/tabbar/chat-active.png`（config/images.ts:648），帧上该格是实心填充的气块，与同列另外三枚（check/edit/star 描边 SVG，stroke #36C99A）不是同一套图形语言；缺一张描边版 chat 列表图标，40rpx 缩放的 PNG 在 72rpx 绿底格内发虚。
- 建议改法：为任务列表新建 `svg-spec/03-icons/chat.svg` 描边版（stroke #36C99A，与 edit/star 同规格）并把 :286 的 `ICONS_TABBAR.CHAT_ACTIVE` 换成它，tabbar 栅格图不再复用到列表。
- 修复类别：需新建目标功能

### R10-L11-D02　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`61945df33196e714`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:590`
- 理想图依据：无基准，依据=规范文档§1.4「卡片内边距 --card-padding 32rpx = 16px」
- 现象：5 张卡的 `.task-item`/`.tasks-summary` 内边距写 `var(--sp-6) var(--sp-8)`（24/32rpx），帧上积分卡白面顶缘 y=102、首行文字墨迹起 y=117 ⇒ 上下内衬实测 ≈12px（24rpx），比规范卡片内边距 16px 少 4px，且同一张卡上下 24rpx、左右 32rpx 两档不一；基类 `.card-base` 自身 padding 又取 `--sp-4`（global.scss:153=8px），三处三个值。
- 建议改法：卡片内衬统一归口 `padding: var(--card-padding)`（32rpx），删掉 `.task-item`/`.tasks-summary` 的 `--sp-6/--sp-8` 局部覆盖。
- 修复类别：CSS/token

### R10-L11-D03　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`61945df33196e714`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:636`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（说明 14/15px；10/11px 为极小档，只用于角标·法务）
- 现象：本帧与 top 帧 sha16 相同（页面无滚动位移）。四条任务说明（「今日完成签到即可领取」等）与 CTA 标签「去完成」都取 `--fs-sm`（22rpx=11px，:636/:675）；帧上实测说明墨迹高 10px（y=207..216）对同行标题 12px（y=188..199），说明文字落在极小档，比 §1.3 说明档 28rpx/14px 低 3px，而 11px 同时是页内唯一可点动作的字档。与 R9-L11-D03（页头标题 22px vs 26–28px）不同元素、不同现象。
- 建议改法：`.task-item__desc` 与 `.task-item__status-text` 由 `--fs-sm` 抬到 `--fs-lg`（28rpx），奖励值 `+N 积分` 可保留角标档。
- 修复类别：单页

## subpackages/profile-extra/profile/visitors（2 条）

### R10-L09-D10　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`d7d0b789c4723db7`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:536`
- 理想图依据：无基准，依据=规范文档§1.4 最小触摸目标 88rpx；同域按钮（consulting.vue:227/345）均已补 min-height:88rpx
- 现象：空态唯一出口"编辑资料"按钮 .visitors-empty__btn 只有 padding:12rpx 32rpx、无 min-height，实高约 62rpx(<88rpx)，且本页再无其它进入"编辑资料"的替代出口。
- 建议改法：给 .visitors-empty__btn 补 min-height:88rpx 并居中，与 consulting.vue:227 同口径。
- 修复类别：CSS/token

### R10-L09-D11　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`cd583e73cf38ce40`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:517`
- 理想图依据：无基准，依据=规范文档§1.1 原则3"一令牌一值、禁私有色值"；同域 consulting.vue:252 已确立图标不用 opacity 压淡而应用令牌/filter
- 现象：空态眼睛图标用裸 opacity:0.5 压淡（非令牌色），落到白卡上比任何文字档都浅，且与"图标不用 opacity 表达状态"的既有约定（consulting 已删 opacity）冲突。
- 建议改法：去掉 opacity:0.5，改由图标素材令牌色或 saturate/brightness filter 落到 --c-text-tertiary 档。
- 修复类别：CSS/token

## subpackages/profile-extra/settings/dnd（3 条）

### R10-L11-D04　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`1e07ef8dbc5ee8f3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:879`
- 理想图依据：无基准，依据=规范文档§1.4 触控档 + `EmptyState/Button` 组件规范自述的 `min-height:88rpx` 口径（EmptyState.vue:207）
- 现象：重复方式已选「自定义」（帧上第 4 枚单选为选中态），此时星期芯片是唯一可点控件，但 `.weekday-item { padding: 20rpx 0 }` + `--fs-md` 只撑出实测高 37px（x=120 列连通域 y=564..600 / 609..645 两行各 37px）=74rpx，比 88rpx 少 11px；行与行之间还只有 8px 间隙，用户拿不到一个稳定点中的星期入口，且整行不可点、没有列表视图等替代出口。
- 建议改法：`.weekday-item` 补 `min-height: 88rpx` 并用 flex 居中保持文字视觉位置不变（同 EmptyState.vue:207 的既有做法）。
- 修复类别：单页

### R10-L11-D05　P2 / 圆角　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`1e07ef8dbc5ee8f3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:689`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20px」
- 现象：本页自绘 `.card` 取 `border-radius: var(--r-xl)`（=24rpx=12px，design-variables.scss:202），而全站卡片基类 `.card-base` 已按 R8-L11-D03 抬到 `--card-radius` 40rpx（global.scss:150）。逐行拟合同一个左上角曲率：dnd 卡白面从 x=25 收到 x=17 只用了 7 行（半径≈12px），tasks 卡用了 15 行（半径≈20px）⇒ 同站两页卡片圆角差 8px，dnd 一侧低于规范档。
- 建议改法：`.card` 的 `border-radius` 改 `var(--card-radius, 40rpx)`，或直接复用 `.card-base` 不再页内自绘卡片壳。
- 修复类别：CSS/token

### R10-L11-D06　P2 / 位置　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`c3f6aa32196d165b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:900`
- 理想图依据：无基准，依据=规范文档§1.4「页边距 --page-padding 32rpx = 16px」
- 现象：上一轮 R9-L11-D06 只把 `.section` 的水平外边距归口 `--page-padding`（:668，帧上卡片白面左缘实测 x=17=16px，已修对），但同页主操作键 `.save-btn { margin: 40rpx 24rpx 0 }` 没跟着改：实测绿键左缘 x=13、右缘 x=365，卡片左缘 x=17、右缘 x=361 ⇒ 保存键两侧各外扩 4px，与它正上方的卡片群不同轨。用户看到的是「主按钮比内容区宽一圈」的错位。
- 建议改法：`margin: 40rpx var(--page-padding, 32rpx) 0`，让保存键与卡片左右缘同轨。
- 修复类别：单页

## subpackages/profile-extra/settings/index（2 条）

### R10-L09-D03　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`4ae3da78a40fc5e1`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:359`
- 理想图依据：无基准，依据=规范文档§1.1 原则2"绿色=行动、粉色=喜欢，两色禁止混用" + §1.2 角色令牌
- 现象："社交资产"分组图标底色把品牌绿（访客记录 --c-bg-brand #E8FAF3，:359）与心动粉（我的动态/相册 --c-tint-pink-soft #FFF0F5，:354/:361）混排在同一列表，违反绿粉两色禁止混用。
- 建议改法：同组图标底色收敛到单一绿族/中性浅底令牌，移除粉绿并置。
- 修复类别：单页

### R10-L09-D04　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`0f37a07d0c4fcbf9`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:396`
- 理想图依据：无基准，依据=规范文档§1.2（卡片内图标底应取 tint-* 浅底令牌；--c-bg-page 是页面底，非卡内图标底）
- 现象："关于"分组四项（用户协议/隐私政策/检查更新/关于我们）图标底一律用 --c-bg-page #EEF7F2，落在白卡(#FFFFFF)上几乎与卡同色，图标"色片"消失，与上方各组可见浅底不一致。
- 建议改法：关于组图标底改用与其它组一致的 tint 浅底令牌（如 --c-brand-50/--c-tint-blue-soft），不要用页面底色。
- 修复类别：单页

## subpackages/profile-extra/verification/index（3 条）

### R10-L09-D05　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`6f1f257aac940900`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:514`
- 理想图依据：无基准，依据=规范文档§1.2（警告角色 = --c-warning #F59E0B）
- 现象：门控横幅是琥珀警告底（--c-tint-amber-50），但左侧警示三角走 warning.svg 烘焙的 #94A3B8 冷灰蓝、不是警告橙，图标与警告语义/底色脱节（本道 R9-B60 只改了状态卡紫/提交按钮绿，未动此图标）。
- 建议改法：补一枚琥珀色(--c-warning)警示三角素材替换，或对位图套 consulting.vue:255 同法的 filter 压到警告色。
- 修复类别：需新建目标功能

### R10-L09-D06　P2 / 尺寸比例　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`6f1f257aac940900`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:1006`
- 理想图依据：无基准，依据=规范文档§1.4 栅格节奏（2 列权益格应等宽）
- 现象：认证权益 2 列网格里第 5 项"互动资格"因 .benefit-item flex:1 1 在末行独占而被拉伸成整行宽，与前 4 个半宽卡尺寸不一致、卡内右侧留大片空白。
- 建议改法：末项不拉伸（flex-grow 置 0 或让第 5 项仍占半宽并留白），保持 2 列等宽。
- 修复类别：单页

### R10-L09-D07　P2 / 圆角　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`1e6f3e8a16572533`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:1056`
- 理想图依据：无基准，依据=规范文档§1.4 卡片圆角 --card-radius=40rpx(20px)；同域 consulting.vue:220/287 已按此档
- 现象：本页"填写认证信息"表单卡与上传卡圆角走 --r-xl=24rpx(12px)，只有规范卡片圆角 40rpx(20px)的一半，与同流程 consulting 课程卡(40rpx)取档不一。
- 建议改法：.form-card/.upload-card 的 border-radius 由 --r-xl 改 --card-radius(40rpx)。
- 修复类别：CSS/token

## subpackages/profile-extra/verification/real-name（2 条）

### R10-L09-D08　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`6aa0ea53b2d04bad`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:87`
- 理想图依据：无基准，依据=规范文档§1.2（成功/已认证角色 = --c-success/--c-brand 绿）
- 现象："已实名认证"卡的状态图标 check-circle.svg 描边烘焙为 #94A3B8 冷灰蓝（见 static/assets/icons/common/check-circle.svg:1），而同卡标题已修成品牌绿(#156B51)、§1.2 成功态应为绿，图标色与成功语义/标题脱节（R9-B61 只修了标题文字色，未动图标）。
- 建议改法：换用绿色系已认证图标素材，或对该位图套 consulting.vue:255 同法的 filter 落到绿档。
- 修复类别：需新建目标功能

### R10-L09-D09　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`753aeffd5e044ea0`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:452`
- 理想图依据：无基准，依据=规范文档§3 认证流程闭环 + 同域 visitors R8-L09-D23"副标动作须给入口"结论
- 现象：verified 态文案声明"可进行校园认证（学历认证）"，但 :452-466 的已认证模板只渲染姓名/证号卡，页内无任何进入校园认证的按钮/链接，用户须自行点返回退到认证中心才能继续。
- 建议改法：verified 模板补一枚跳校园认证（verification/index 或学历认证路由）的次级按钮，与 visitors 空态出口同口径。
- 修复类别：需新建目标功能

## subpackages/setup/campus/index（2 条）

### R10-L12-D03　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`6a6b85fd6d55c1a8`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:448`
- 理想图依据：无基准，依据=规范 §1.1 第 1 条"主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层（2026-08-31 用户验收定论）"+ §1.2 页面底色令牌 --c-bg-page
- 现象：页面底色被写成纯白 --c-bg-container（#FFFFFF），而底部动作条区是 --c-bg-page #EEF7F2（BottomActionBar.vue:90）——帧上"保存并继续"条上缘可见一条白→浅绿的横向断层，页头区整片白底与全站浅绿底不符。
- 建议改法：page 背景改引 var(--c-bg-page)，与 AppShell/动作条底色同档（R16"统一纯白"的定档与规范 §1.1 冲突，应以规范为准回退）。
- 修复类别：CSS/token

### R10-L12-D04　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`4207abaaf1f88c68`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:425`
- 理想图依据：无基准，依据=仓内自陈热区口径 88rpx（本页 R6 修复注释 campus/index.vue:331-335 所引同口径）+ 任务书 P1 条"必点控件热区 <88rpx 且没有替代出口"
- 现象："非学生？跳过此步，稍后认证 ›"是非学生用户在本页的唯一出口（主按钮在 3 个字段填全前一直禁用，campus/index.vue:307），但 .skip-bar 纵向 padding 只有 var(--sp-4)(8rpx)+var(--sp-2)(4rpx)，整行实测高约 48–56rpx，远低于 88rpx 热区口径——非学生用户拿不到一条可靠的离开路径。
- 建议改法：.skip-bar 补 min-height: 88rpx 并 content-box 居中（与本页 R6 已把帮助徽标热区提到 88rpx 的同一手法，campus/index.vue:331-335）。
- 修复类别：单页

## subpackages/setup/interest/index（2 条）

### R10-L12-D09　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`318f9eb0c940807a`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:188`
- 理想图依据：无基准，依据=规范 §1.3"页面主标题 26–28px / 700–800；--fs-5xl 22px 是卡片大标题档"
- 现象：页主标题"选择兴趣"写死 44rpx=22px——落在卡片大标题档，低于规范页面主标题档 4–6px；且为裸字面量未引令牌（同流程校园页标题走 AppShell .shell__title 的 var(--fs-5xl, 44rpx)，AppShell.vue:394，两页同低于规范但一个引令牌一个写死，档位管理也不一致）。
- 建议改法：标题升到页面主标题档（52–56rpx）并引 --fs-* 令牌；若要全站页头统一抬档，则连同 AppShell.vue:394 一处改齐。
- 修复类别：CSS/token

### R10-L12-D10　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`faff04fe2266692b`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:207`
- 理想图依据：无基准，依据=同流程未满足条件时主按钮的禁用档（BottomActionBar.vue:123-125 --c-status-disabled 灰底，campus/schedule 帧同象）
- 现象：已选 0/5（校验要求至少 3 个，interest/index.vue:39）时"完成选择"按钮仍是亮绿渐变常态外观，画面上没有任何未达门槛提示——误导用户以为可直接完成；因点击后有 toast 兜底出口（:40）不构成死路，记 P2。
- 建议改法：selected 数 <3 时给 .interest-save 加禁用档（--c-status-disabled 底 + --c-text-secondary 字，同 BottomActionBar 口径），达 3 个再恢复渐变。
- 修复类别：单页

## subpackages/setup/profile/index（2 条）

### R10-L12-D01　P1 / 素材缺失　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`26ea7a8808d26336`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:473`
- 理想图依据：无基准，依据=《全站设计规范与逐页设计稿说明》§1.1 第 4 条（禁止把功能图标当内容素材）+ 本页 R6-B67/D10 处置记录（index.vue:461-468 自陈同一现象）
- 现象：照片墙第 2、3 槽仍是一枚大绿色定位针图标占位并带 × 删除徽标（帧上 x157-230 / x250-323、y540-632），实际只有第 1 槽是人像——用户拿不到照片墙的真实内容，会把功能图标误认为"已上传待审核的照片"。R6 加的过滤只拦 `/assets/icons/` 前缀，photoGallery 里实际混入的针形图标路径没有命中该正则，槽位仍照单当照片渲染。
- 建议改法：把 isPhotoAssetPath 反转为白名单（仅 assets/images/portraits 等照片子树放行，其余一律落"+"空槽分支），并把 photoGallery 落库污染源头另登记 NOT-FIXABLE-HERE。
- 修复类别：单页

### R10-L12-D02　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`003896de0df158f1`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1035`
- 理想图依据：无基准，依据=同流程校园页的"标签 + placeholder"字段结构（campus/index.vue:393 字段标签档）+ 规范 §1.3 正文档
- 现象：籍贯省/籍贯市/未来城市三行输入框均无可见字段标签，且籍贯市与未来城市的 placeholder 逐字同为"如：广州"（zh-CN.ts:3138/3140），区分只写在 aria-label（:1038，画面不可见）——用户填完后无从判断哪行是"现在的城市"哪行是"未来想去的城市"，两行示例文案也不构成字段身份。
- 建议改法：按校园页字段结构为每行补可见标签（"籍贯省""籍贯市""未来城市"），并把未来城市 placeholder 改为可自证的示例（如"如：毕业想去的城市"）。
- 修复类别：单页

## subpackages/setup/recommend-pref/index（2 条）

### R10-L12-D07　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`75dfbc48e524129e`）
- 源码证据：`apps/client/src/components/common/BottomActionBar.vue:108`
- 理想图依据：无基准，依据=规范 §1.2"主按钮=--c-brand #36C99A（brand-500），brand-600/700 只用于按压态·深色文字"（brand-800 不在档位表内）
- 现象：本页主按钮"保存"实心得是深绿 --c-brand-800 #156B51，而同为注册流程的 profile 页主按钮是 #36C99A→#55D5A7 渐变（profile/index.vue:1433）、interest 页走 --c-gradient-brand（interest/index.vue:207）——走完四步时最后一步的主按钮色档与前面各页不一致，且该深绿档不符合规范主按钮令牌。
- 建议改法：.bar__primary 底色改引 var(--c-gradient-brand)（或 --c-brand），组件一处改齐后全仓动作条同步复核按压档。
- 修复类别：CSS/token

### R10-L12-D08　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`4eb10a75a3423d69`）
- 源码证据：`apps/client/src/components/common/SectionCard.vue:61`
- 理想图依据：无基准，依据=规范 §1.3"辅助/说明=--fs-lg/xl（14/15px），--fs-md/base（13/12px）是标签·时间戳档"
- 现象：本页三张卡的副标说明（"每天在这个时间为你刷新推荐卡片""优先推荐哪些范围的人""启用后同校用户推荐权重+30%并排序靠前"）全部走 .card__subtitle 的 var(--fs-base)=24rpx=12px，落在"小字/时间戳"档——正文级说明用极小档，低于规范说明档两个身位。
- 建议改法：.card__subtitle 升到 var(--fs-lg)（28rpx），改后全站 SectionCard 使用页统一复拍确认不溢出。
- 修复类别：CSS/token

## subpackages/setup/schedule/index（2 条）

### R10-L12-D05　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`0459f6a00018ce00`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:129`
- 理想图依据：无基准，依据=同流程校园页"标签 + placeholder"字段结构（campus/index.vue:393 有独立字段标签行）
- 现象："偏好设置"卡下唯一输入框没有字段标题，"常去区域"只以 placeholder 形式存在——用户一旦输入区域名，placeholder 消失，该字段在画面上不再有任何身份说明（区分"常去区域"与下方"空闲时段"输入只剩卡标题语境）。
- 建议改法：在 input 上方补可见标签"常去区域"，placeholder 换成示例文案（如"如：图书馆 / 食堂 / 操场"）。
- 修复类别：单页

### R10-L12-D06　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`0459f6a00018ce00`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:303`
- 理想图依据：无基准，依据=规范 §1.1 第 1 条"主题底色统一浅绿 #EEF7F2，不得出现白/灰断层"+ §1.2 --c-bg-page
- 现象：本页 page 底色同样被定为纯白 --c-bg-container，而底部固定动作条区是 --c-bg-page 浅绿（BottomActionBar.vue:90）——帧上内容止于 y≈45% 后，大片白底与底部浅绿条之间可见整幅白/绿断层（本页 top/bottom 两帧同象，帧 hash 相同）。
- 建议改法：page 背景改 var(--c-bg-page)；与 campus 页同族一次改齐（campus/index.vue:448 同象另见 D03）。
- 修复类别：CSS/token

## subpackages/support/feedback/index（2 条）

### R10-L13-D01　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`f246982ceecc848d`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:661`
- 理想图依据：无基准页；依据=规范文档 §1.2（主色 --c-brand #36C99A、深档 brand-700 #1F8D6A）+ 组件口径 LegalTextPage.vue:445-455 / BottomActionBar.vue:104-108（白字主色须压 brand-800）
- 现象：选中的分类药丸「反馈」用白字（--c-text-inverse）压在 --c-brand #36C99A 上（.chip--active 底 :660 / 字 :661），实测对比≈2.10:1（#36C99A L=0.449 / 白 L=1 ⇒ 1.05/0.499），低于 12px 粗体标签的 4.5:1；同页未选中药丸用 brand-700 深绿（≈3.86:1）反而更清楚，选中态成了整排里最不易读的一档。
- 建议改法：.chip--active 前景改吃 --c-brand-800 深档，或把底色由 --c-brand 降到 brand-700/800，使白字对比≥4.5:1（与 LegalTextPage.vue:455 同一收口）。
- 修复类别：CSS/token

### R10-L13-D02　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`fd03ec0d40d19bf1`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:835`
- 理想图依据：无基准页；依据=组件规范 AppShell.vue:333-335 自述触控下限「≥88rpx(44px)」+ 同页 .chip 的 R7-L13-D01 修复结论（index.vue:635-641）
- 现象：「历史记录」是去反馈历史（功能10）的唯一入口、无替代出口，其热区只靠 .history-header__btn 的 min-height:88rpx(:835) 撑起；但本页 .chip 的 R7-L13-D01 注释（:635-641）已实测「min-height 在运行时整条没参与盒计算」，此按钮沿用同一失效写法（只有 min-height、无显式 height），药丸实高≈padding(10×2)+行高≈54rpx，仍 <88rpx。
- 建议改法：照 .chip 已验证的改法给 .history-header__btn 补显式 height:88rpx（配既有 box-sizing:border-box），不要只留 min-height。
- 修复类别：单页

## subpackages/tools/activities/detail（3 条）

### R10-L08-D09　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`69dbca8364ac2d64`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:33`
- 理想图依据：无基准，依据=组件规范非文本控件 3:1 线（同 lane search 页 R8-L08-D02 注释 search/index.vue:250-254 已把这条线写死：#94A3B8 压浅底 2.19–2.35:1 判为缺陷并改 ICONS_V2.BACK #333333）
- 现象：帧上导航是绿渐变（:462 `--c-brand-500→--c-brand-400`，实测 #4CD0A5），返回箭头却仍吃 `ICONS_COMMON.BACK`（#94A3B8 档），帧上字形最暗实测 #8BA8B6，压绿底 = 1.30:1，远低于非文本 3:1 ⇒ 画面上只剩一个淡弧，用户找不到页内返回出口（微信胶囊只有「更多/关闭」）。
- 建议改法：与同 lane search 页同口径换 `IMAGE_PATHS.ICONS_V2.BACK`（#333333，压 #4CD0A5 ≥5:1），或改白字压深绿底。
- 修复类别：单页

### R10-L08-D10　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`69dbca8364ac2d64`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:588`
- 理想图依据：无基准，依据=规范文档§1.3「小字 --fs-md/base 13/12px：标签·时间戳」「极小 --fs-xs/sm 10/11px：角标·法务」
- 现象：标题行右侧状态标签「报名中」实测字高 11px 档（--fs-xs 20rpx=10px），是这页唯一的活动状态标识；同帧下方「时间 每日 18:00-20:00」值行是 13px ⇒ 标签比正文还小一档，落进 §1.3 只给角标·法务的极小档。
- 建议改法：`.detail-status__text` 字号升 `var(--fs-base, 24rpx)`，与 `.detail-meta__value` 同档。
- 修复类别：CSS/token

### R10-L08-D11　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`69dbca8364ac2d64`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:643`
- 理想图依据：无基准，依据=规范文档§1.4「区块间距 --section-gap 24rpx」+ 仓内既有裁定（search/index.vue:468-472 把「内容止于上半区、下半屏空底」定性为缺陷）
- 现象：帧上「活动介绍」卡止于 y≈470，底部固定操作栏起于 y≈690，中间 220px（≈437rpx）是纯 #EEF7F2 空底，信息区只占屏高约 58%；模板里介绍卡之后只有一个 140rpx 占位 view(:387/:643)，没有任何后续模块。
- 建议改法：介绍卡之后补既有可承载模块（报名截止/主办方/已报名头像组任一），或让 `.detail-scroll` 的内容按 `--section-gap` 撑开而不是留整块空底。
- 修复类别：需新建目标功能

## subpackages/tools/daily-question/index（4 条）

### R10-L07-D03　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`ef3fac06dc47b063`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:357`
- 理想图依据：无基准页，依据=规范§1.2「主色 brand-500 用于主按钮 · 深色文字取 brand-600/700」——白字只能压深档；对照 likes-visitors 游客 CTA 已取 brand-800（白字 6.45:1）
- 现象：顶栏底是 `linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-300) 100%)`（:357），标题「每日一问」与左「返回」均为 --c-text-inverse 白字（:374-375、:382）。帧上采样标题处底 #59D6AA(89,214,170) ⇒ 白字 1.81:1；「返回」处底 #48D0A2(72,208,162) ⇒ 1.94:1；渐变两端理论值 brand-500 2.09:1、brand-300 1.59:1。16px 标题不享大字号豁免，页名在顶栏上几乎糊进底面（R9-L07 前言第 6 条把它留待批次、未立项，本轮补测读数后立项）
- 建议改法：顶栏渐变整体压深（brand-700→brand-600）或两端统一到 brand-800（#156B51，白字 6.45:1），字号不动
- 修复类别：CSS/token

### R10-L07-D04　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`ef3fac06dc47b063`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:484`
- 理想图依据：无基准页，依据=规范§1.2「--c-text-inverse 适用前提是深底」；同仓 LockScreen 主钮取 brand-800（白字 6.45:1）为达标档
- 现象：登记项复核——锁定卡主钮「去签到」底仍为 `background: var(--c-brand-600, #2AAE83)`（:484），文字 --fs-lg(14px) #FFFFFF（:496）。帧上钮面采样 (42,174,131)=#2AAE83 与令牌逐字对上，白字对算 2.81:1（<4.5 亦 <3.0）。R9-L07-D04 已按同一实体立过项、本帧 UNTOUCHED 未修，本轮按任务书要求带算术复核保留
- 建议改法：底改 `var(--c-brand-800, #156B51)`（白字 6.45:1），与本批 likes-visitors 游客 CTA 同档
- 修复类别：CSS/token

### R10-L07-D05　P1 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`d4b585a52f9f4ef6`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:481`
- 理想图依据：无基准页，依据=仓内自陈「≥88rpx(44px)」触控下限（security/index.vue:996 注释引 AppShell.vue:334）；同文件 .lock-back 已写 min-height:88rpx（:503）自证该档是本页口径
- 现象：锁定卡主钮实测 x=110..268、y=425..462 ⇒ 159×38px=315×75rpx；样式只有 `padding: 20rpx 48rpx`（:481）+ 14px 文字，没有 min-height（同文件 :503 的次级出口 .lock-back 反而写了 min-height:88rpx）。38px 只有 88rpx(44px) 的 86%，而「去签到」是本题唯一解锁动作——页内第二个按钮是「返回」，签到没有替代出口
- 建议改法：`.lock-card__cta` 补 `min-height: 88rpx; box-sizing: border-box;`，与 `.lock-back` 同档
- 修复类别：CSS/token

### R10-L07-D06　P2 / 圆角　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`d4b585a52f9f4ef6`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:447`
- 理想图依据：无基准页，依据=规范§1.4「卡片圆角 --card-radius=40rpx=20px」
- 现象：锁定白卡 `border-radius: var(--r-xxl)`（:447）=32rpx=16px，而 §1.4 的卡片语义圆角是 --card-radius=40rpx=20px；同批 love-center 宫格卡与 help/security 的 SectionCard 都取 40rpx。这张卡是占满首屏的 341px 宽大卡，16px 弧跨比同域卡小 4px，同屏（同一 App 内）两种卡片圆角并存
- 建议改法：改 `border-radius: var(--card-radius, 40rpx)`，与同域卡片同档
- 修复类别：CSS/token

## subpackages/tools/heart-signals/index（4 条）

### R10-L08-D05　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`2fe7990028c413df`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:743`
- 理想图依据：无基准，依据=规范文档§1.2「主色 --c-brand(brand-500) #36C99A：主按钮·选中态」；表内深色档只到 brand-600 #2AAE83 / brand-700 #1F8D6A（用途＝按压态·深色文字）
- 现象：帧上主 CTA「立即登录并完善」钮面实测众数 #156B51（= `--c-brand-800`，design-variables.scss:18），比 §1.2 给主按钮的 #36C99A 深两档、且该档不在 §1.2 角色表内；同一帧上方锁环实测 #42CE9F（brand-500 族）、勾与心走 #36C99A/#FF6B81 ⇒ 同页两套绿档。
- 建议改法：钮面回到 `var(--c-brand)`，白字不达 4.5:1 时按同 lane activities/detail.vue:500 的既有裁定改深墨字（--c-brand-900），而不是把钮面压暗两档。
- 修复类别：CSS/token

### R10-L08-D06　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`2fe7990028c413df`）
- 源码证据：`apps/client/src/subpackages/tools/heart-signals/index.vue:61`
- 理想图依据：无基准，依据=组件规范 LockScreen 登录/未登录分支口径（LockScreen.vue:59-61）+ 本页门槛自证（index.vue:39）
- 现象：帧上主标题「登录后解锁心动信号」只能来自 `lock.titleLoggedIn` 分支（:61 要求 `sessionStore.isLoggedIn` 为真）⇒ 取景会话已登录，而真正的门槛是 `isUnlocked = isProfileComplete`(:39)；已登录用户被告知「登录后解锁」，与同帧副标题「完成资料完善即可解锁」自相矛盾，用户据此判断不出自己到底缺登录还是缺资料。
- 建议改法：登录态分支改取「完善资料后解锁{页名}」口径（复用既有 lock 键或补一条 titleCompleted 键），与副标题同门槛。
- 修复类别：单页

### R10-L08-D07　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`c240f610ccfce2a2`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:764`
- 理想图依据：无基准，依据=组件规范触控下限 88rpx（本文件 :772-776 注释自陈同页正文档口径）+ §1.4 sp 阶梯
- 现象：帧上「先逛逛公开内容」墨迹实测 x=147–232、y=590–601（86×12px），上下只挂 `--sp-2`(4rpx=2px) padding ⇒ 可点体约 170×32rpx，高度不足 88rpx 下限的一半；同帧主 CTA 钮高实测 46px(91rpx) 达标，两者差近 3 倍。
- 建议改法：`.lock-screen__btn-link` 纵向 padding 提到 `var(--sp-6)` 并补 `min-height: 88rpx; display:flex; align-items:center;`。
- 修复类别：CSS/token

### R10-L08-D08　P3 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`c240f610ccfce2a2`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:284`
- 理想图依据：无基准，依据=规范文档§1.1 一致性（标点与全半角）
- 现象：帧上副标题渲染为「完成资料完善即可解锁 心动信号」，动词与宾语之间是一个裸半角空格（模板 zh-CN.ts:2895 `"完成资料完善即可解锁 {name}"`），同帧主标题「登录后解锁心动信号」却是连写 ⇒ 同一屏同一动宾结构两种写法。
- 建议改法：删掉 `{name}` 前的空格（或统一改「：」），与主标题连写口径一致。
- 修复类别：单页

## subpackages/tools/help/index（2 条）

### R10-L07-D10　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`f3525f67267e9c7f`）
- 源码证据：`apps/client/src/components/common/SectionCard.vue:55`
- 理想图依据：无基准页，依据=规范§1.3「标题 --fs-3xl/4xl=18/20px 用于区块标题」
- 现象：SectionCard 的 `.card__title` 走 `--fs-2xl`=32rpx=16px（SectionCard.vue:55），本页两个区块标题「常见问题/联系我们」帧上字高 13px；§1.3 区块标题档是 18/20px。16px 与卡内 FAQ 主问句 15px（--fs-xl）只差 1px，区块标题失去层级。同源复现于 security 五个卡标题（账号安全/第三方账号绑定/登录设备/隐私保护/危险操作，帧上字高 14px），与 love-center 自带区块标题 18px 也不同档
- 建议改法：`.card__title` 由 `var(--fs-2xl)` 改 `var(--fs-3xl)`（36rpx=18px），与 love-center 区块标题同档
- 修复类别：CSS/token

### R10-L07-D11　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`49a0311d2b984d6c`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:298`
- 理想图依据：无基准页，依据=规范§1.4 页边距口径 + 同批 love-center/index.vue:204 已用 `padding-bottom: env(safe-area-inset-bottom)` 的页底安全区做法
- 现象：页脚说明两行墨迹实测 y=777..788、793..799，系统 home indicator 实测 y=800..804（x=134..244）；末行底缘距指示条只有 2px，整段落进 34px 安全区且末行只剩「您。」两字孤行。`.help-footer` 只有 `padding: 32rpx 24rpx 16rpx`（help/index.vue:298），全页没有任何 `env(safe-area-inset-bottom)` 兜底；同批 love-center/index.vue:204、likes-visitors/index.vue:495 都把安全区写进了页容器 ⇒ 本页缺档
- 建议改法：页容器（或 `.help-footer`）补 `padding-bottom: env(safe-area-inset-bottom)`，与 love-center 同口径
- 修复类别：单页

## subpackages/tools/love-center/consulting（2 条）

### R10-L09-D01　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`c6ce2c0346f068cf`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:307`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（课程描述属"说明/辅助"级，应 ≥12–14px）
- 现象：课程描述行（如"掌握高情商沟通，让相处更舒服"）字号走 --fs-xs=20rpx(10px)，落在极小/角标档，比规范"说明"档低两档，作为卖点正文过小。
- 建议改法：.course-card__desc 的 font-size 由 --fs-xs 提到 --fs-md(26rpx) 说明档。
- 修复类别：CSS/token

### R10-L09-D02　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`c6ce2c0346f068cf`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:203`
- 理想图依据：无基准，依据=规范文档§1.3（区块标题 = --fs-3xl/4xl，18/20px，700）
- 现象：区块标题"精选课程，助你提升恋爱能力"字号走 --fs-lg=28rpx(14px)，低于规范区块标题档 18–20px，与下方课程标题同尺寸、层级拉不开。
- 建议改法：.content-section__title font-size 由 --fs-lg 提到 --fs-3xl(36rpx)。
- 修复类别：CSS/token

## subpackages/tools/love-center/index（3 条）

### R10-L07-D07　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`ee37c6dc5e36509e`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:380`
- 理想图依据：无基准页，依据=规范§1.2「主色 --c-brand 用于主按钮/链接」，浅绿底承载 12px 文字须 ≥4.5:1；同仓 brand-800 白字 6.45:1 为已用达标档
- 现象：顶部「‹ 返回」胶囊内文字 `color: var(--c-brand, #36C99A)`（AppShell.vue:380）压在 `--c-bg-container` 白胶囊上（:358），帧上采样文字 (57,202,156) ⇒ 2.09:1；12px（--fs-base）不享大字号豁免。该胶囊是 love-center/help/security 三页共用的 AppShell 页头，三页 same 面同病
- 建议改法：`.shell__back-text` 由 --c-brand 改 --c-brand-800(#156B51，白底 6.45:1)；brand-700 仅 4.14:1 仍不达标，不可停在 700 档
- 修复类别：CSS/token

### R10-L07-D08　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`b5452e0c1301cfb3`）
- 源码证据：`apps/client/src/components/layout/AppShell.vue:394`
- 理想图依据：无基准页，依据=规范§1.3「页面主标题 26–28px，字重 700–800」
- 现象：页头主标题「恋爱中心」`font-size: var(--fs-5xl, 44rpx)`（AppShell.vue:394）=22px，帧上字高 y=108..128=21px；§1.3 的页头档是 26–28px。22px 比下限小 4px，与同页区块标题（--fs-3xl=18px）只差 4px，页头与区块塌成一档；同源使 help「帮助与客服」、security「安全中心」两帧也是 21px 字高
- 建议改法：`.shell__title` 提到 --fs-7xl(56rpx=28px) 或 52rpx(26px)，落 §1.3 页头档
- 修复类别：CSS/token

### R10-L07-D09　P2 / 间距　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`b5452e0c1301cfb3`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:239`
- 理想图依据：无基准页，依据=规范§1.4「卡片内边距 --card-padding=32rpx=16px」
- 现象：四宫格卡 `.love-center__board` 的 `padding: var(--sp-5)`（:239）=20rpx=10px；帧上卡左缘 x=17、卡内标题墨迹起于 x=28..30 ⇒ 内边距 11px。§1.4 卡片内边距是 32rpx=16px（同页 SectionCard 口径一致），10px 让 20px 圆角与文字之间只剩 10px 呼吸位，两列卡文字均贴边
- 建议改法：`padding` 改 `var(--card-padding, 32rpx)`，与规范卡内距对齐
- 修复类别：CSS/token

## subpackages/tools/love-center/mbti（5 条）

### R10-L08-D16　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`aec31e8ca4f68108`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:301`
- 理想图依据：无基准，依据=规范文档§1.3「页面主标题 26–28px/700–800」＋正文级文字 4.5:1 线；同 lane activities/detail.vue:486-502 已把同一算式（纯白压 brand-500 = 2.10:1）判为缺陷并改 --c-brand-900
- 现象：帧上导航标题「MBTI 人格测试」用 `--c-text-inverse` 白字压 brand 渐变（:295，实测 #49D0A2）= 1.89:1，连大字号 3:1 线都不到，标题在绿底上糊成一片。
- 建议改法：与同 lane detail.vue:502 同口径改 `var(--c-brand-900, #0B4A38)`（压该渐变 4.87–5.59:1）。
- 修复类别：CSS/token

### R10-L08-D17　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`aec31e8ca4f68108`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:299`
- 理想图依据：无基准，依据=规范文档§1.3「页面主标题 26–28px」档；同域两页同一条绿底自定义导航对档
- 现象：本页导航标题实测字高 16px（`--fs-xl`=30rpx=15px，兜底字面量还写成 34rpx），同域 activities/detail 的导航标题实测 20px（`--fs-5xl`=44rpx，detail.vue:500），两页同角色差 7px，且都低于 §1.3 的 26–28px 主标题档。
- 建议改法：`.content-header__title` 取 `var(--fs-5xl)` 与 detail.vue:500 对齐，兜底字面量改回 30rpx 真值。
- 修复类别：CSS/token

### R10-L08-D18　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`aec31e8ca4f68108`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:46`
- 理想图依据：无基准，依据=规范文档§1.1 一致性原则 + 同帧自证（同排四枚维度标签的取词顺序）
- 现象：帧上维度行第二枚写「S/N 直觉/实感」，而 S=实感(Sensing)、N=直觉(iNtuition)，中文顺序与代码位刚好反了；同帧其余三枚「E/I 外向/内向」「T/F 思考/情感」「J/P 判断/知觉」都是正序 ⇒ 用户按位置读会把两极记反。
- 建议改法：zh-CN.ts:845 `dimensionSN` 改「实感/直觉」，与 :844/:846/:847 同构。
- 修复类别：单页

### R10-L08-D19　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`69fd2f47bc8bc35f`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:482`
- 理想图依据：无基准，依据=规范文档§1.2「主色 --c-brand：主按钮」＋正文/控件文字 4.5:1 线；同 lane LockScreen.vue:730-743 已因同一算式把主 CTA 钮面改 #156B51 拿到 6.45:1
- 现象：帧上唯一主操作「提交并查看结果」白字压 `--c-gradient-brand` 钮面（:475，实测 #4ED2A4）= 1.73:1，比同 lane 两页 CTA（#156B51，6.4–6.7:1）低 4 倍，标签在帧上发虚。
- 建议改法：钮面改 `var(--c-brand-800)`（或白底 + --c-brand-700 字），与 heart-signals / activities 两页 CTA 取同一档。
- 修复类别：CSS/token

### R10-L08-D20　P2 / 圆角　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`69fd2f47bc8bc35f`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:420`
- 理想图依据：无基准，依据=规范文档§1.4「卡片圆角 --card-radius 40rpx = 20px」「圆角档 4/8/12/20/24/32/9999rpx」
- 现象：帧上四张白底问题卡（「周末更愿意怎么过?」等）左上角实测曲率约 8px（令牌 `--r-xl` 24rpx=12px 档，兜底字面量同为 24rpx），而 §1.4 给白卡的圆角令牌是 --card-radius 40rpx=20px；同 lane activities/detail 的白卡实测 14px/20px 档 ⇒ 同角色两页取档不一。
- 建议改法：`.quiz-item` 圆角改 `var(--card-radius, 40rpx)`，与同域卡片同档。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（4 条）

### R10-L08-D12　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`65c530c73d3f6d8c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:270`
- 理想图依据：无基准，依据=组件规范触控下限 88rpx（本文件 :342 注释自陈「热区下限 88rpx(44px)，与仓内自陈标准 AppShell.vue『≥88rpx』一致」）
- 现象：帧上左上返回圆底实测 31×32px = 64rpx（样式写死 width/height 64rpx），低于同页 :343 的 88rpx 下限，也低于同帧卡下三枚动作钮（CardSwiper.vue:2243 的 116rpx）⇒ 同一屏两类必点控件差近一倍。
- 建议改法：`.content-header__back` 的 width/height 改 `88rpx`（图标 :278 同步 32→40rpx，与 search 页 :487-502 同口径）。
- 修复类别：CSS/token

### R10-L08-D13　P2 / 层级遮挡　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`65c530c73d3f6d8c`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:1623`
- 理想图依据：无基准，依据=规范文档§3.3 同款卡片蒙层口径「底部 40% 渐变蒙层」+ §1.1 规则1（浅绿底体系内不得出现整块深色断层）
- 现象：帧上卡片整块（实测 x=10–368、y=95–619，占视口高约 65%）被压到 #101525–#1B1D2D 死黑：`.card__mask-scrim` 自身一层 `rgba(15,23,42,.7)`，其 `::after`(:1629) 又叠同色一层，文件注释自算有效不透明度 0.91 ⇒ 头像底图与卡片信息层全部不可辨，只剩一句「互发喜欢解锁头像」。
- 建议改法：删掉 `::after` 的第二层叠加，并把 `inset:0` 全幅遮罩改为只覆盖卡上部头像区（或按 §3.3 收成底部 40% 渐变）。
- 修复类别：CSS/token

### R10-L08-D14　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`083746931ac87d0a`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:353`
- 理想图依据：无基准，依据=规范文档§1.2「主色 --c-brand 用途＝主按钮·选中态·链接」＋正文/控件文字 4.5:1 线；同组件 LockScreen.vue:772-779 已因同一算法把次入口文字从 2.87:1 升到 7.37:1
- 现象：帧上「查看全部推荐」标签墨迹实测 #3BCA9C（= `--c-brand` #36C99A 族）压白底钮面（:347 `--c-bg-container`）= 2.06:1，字号还只有 11px（:351 --fs-sm）⇒ 这行字在帧上几乎读不出来，用户拿不到「这里还有一个批量出口」的信息。
- 建议改法：标签色改 `var(--c-brand-700)`(#1F8D6A，压白 4.6:1) 或 `--c-brand-800`(#156B51，6.4:1)，钮面描边保留 --c-brand。
- 修复类别：CSS/token

### R10-L08-D15　P2 / 空态文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`083746931ac87d0a`）
- 源码证据：`apps/client/src/components/discover/CardSwiper.vue:536`
- 理想图依据：无基准，依据=规范文档§1.5 组件库 StatusState/EmptyState「空态要给形态与出路」口径
- 现象：页名是「附近的人」，但帧上每张卡的距离槽恒落「同城 · 距离未知」（:536 兜底分支），既没说明为什么未知，也没有「开启定位」的补救出口，用户拿不到这页唯一的核心变量（距离）。
- 建议改法：该兜底分支改写成可点句（如「开启定位后可看距离」并挂授权动作），或在 nearby 头部补定位授权入口。
- 修复类别：需新建目标功能

## subpackages/tools/search/index（4 条）

### R10-L08-D01　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`915151c4c93815d7`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:723`
- 理想图依据：无基准，依据=规范文档§1.1 规则1「主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层」+ §1.2「页面底色 --c-bg-page #EEF7F2 / 卡片 --c-bg-container #FFFFFF」
- 现象：帧上 y≈48–140 整条（搜索行 + 用户/标签/学校分组条）实测众数 #FFFFFF，压在下方主体 #EEF7F2 上形成一条 92px（≈183rpx）高的白/绿断层；分组条这层还是硬编码 `#ffffff`，连令牌都没走。
- 建议改法：`.search-tabs` 与 `.search-header`(:521) 背景统一改 `var(--c-bg-page)`，输入框靠已有的 `--c-bg-surface`(:539) 浮出层次。
- 修复类别：CSS/token

### R10-L08-D02　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`915151c4c93815d7`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:263`
- 理想图依据：无基准，依据=规范文档§1.2「占位 `--c-text-placeholder` #9AA39F：placeholder」档唯一性（§1.1 规则3 一令牌一值）
- 现象：输入框占位「用户/标签/学校」在帧上墨迹最暗实测 #7C7C7C（= mp-weixin `<input>` 平台默认灰），压输入底 #F3FAF6 = 4.0:1，落在次级文字 3:1–4.5:1 档；该 `<input>` 没挂 `placeholder-class`/`placeholder-style`，占位色根本没进令牌体系。
- 建议改法：给该 `<input>` 补 `placeholder-class` 指向 `color: var(--c-text-placeholder)`。
- 修复类别：CSS/token

### R10-L08-D03　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`1abc0c06128a4e3a`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:575`
- 理想图依据：无基准，依据=组件规范触控下限（本页 :483/:731 两处自陈 AppShell.vue「min-height: 88rpx(44px)」同口径）
- 现象：帧上「取消」墨迹实测 x=274–298、y=56–82，即 25×27px ≈ 50×54rpx 的可点体，`.search-cancel` 块内没有任何 min-height/padding；同帧下方「用户」选中胶囊是 83rpx，两者差一档。
- 建议改法：`.search-cancel` 补 `min-height: 88rpx; display:flex; align-items:center; padding: 0 var(--sp-4);`，与 `.search-tab`(:731) 同口径。
- 修复类别：CSS/token

### R10-L08-D04　P3 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`1abc0c06128a4e3a`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:351`
- 理想图依据：无基准，依据=规范文档§1.1 一致性原则 + 同帧自证（同一页两处叫法）
- 现象：帧上空态主文案「输入关键词，搜索感兴趣的人、标签和学校」用「人」，而同一帧上方的分组 tab 与输入框占位都是「用户」（zh-CN.ts:2887 vs :2879），同页两类词指同一对象。
- 建议改法：`search.emptyHint` 的「人」改「用户」，与 `search.tabUsers` 对齐。
- 修复类别：单页

## subpackages/tools/security/index（2 条）

### R10-L07-D12　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`eca53f2186e88511`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:1015`
- 理想图依据：无基准页，依据=规范§1.2「错误 --c-error #E5454D」需可读；次级 11px 文字应落在 3:1–4.5:1 的 P2 带内并尽量达标
- 现象：「下线」胶囊文字 `color: var(--c-error, #f43f5e)`（:1015，真令牌 #E5454D）压在 `--c-error-soft`（:1009 → design-variables.scss:857 `#fef5f6`）上；帧上采样胶囊底 (254,245,246)=#fef5f6、文字墨 (229,69,77)=#E5454D ⇒ 3.71:1，11px（--fs-sm）不享豁免。R9-L07-D10 立的是「注销账号」白底 3.97:1，这里是同一错误色在浅红底的另一处实体（底不同、比值不同、控件不同），故单列
- 建议改法：文字改 `--c-text-error-dark`(#991b1b，压 #fef5f6 约 7.7:1) 或把胶囊底加深到 --c-error-bg-tint-strong；同一修法可一并覆盖注销账号行
- 修复类别：CSS/token

### R10-L07-D13　P3 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`75be93e87dfc9708`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:152`
- 理想图依据：无基准页，依据=规范§1.3 列表主文字档 + 「同一列表每行须能被区分」的组件规范
- 现象：登录设备第 4 行标签只有裸「手机号登录」（帧上 y=394..407），同列其余行是「手机号登录 · in-a / vice / udit」。根因 :152-153：`deviceId` 缺失或为 "unknown" 时 tail 置空、标签退回 method。两条无尾号设备会渲染成逐字相同的两行（只有下方时间不同），用户无法判断该下线哪一台 ⇒ 吊销会话可能点错
- 建议改法：tail 为空时改用可区分段（platform + 最近活跃日，如「手机号登录 · 9/16」或序号），保证每行标签唯一
- 修复类别：单页

## subpackages/village/village/detail（4 条）

### R10-L03-D04　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`f2e98b66f1414926`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1410`
- 理想图依据：not-found 无基准；依据=§3.13 说明副标题 + 组件规范「空态只留一句可读说明」
- 现象：空态副标题直接渲染内部键名「share.shareVillage」（帧 y≈470），中文环境下不可读；这是页面唯一一句说明文案，返回/返回广场两条出口仍在。
- 建议改法：改引用仓内已有 shareVillage 真值键（zh-CN.ts:1685 的父级命名空间）或补齐 share.shareVillage 词条，不要留裸键。
- 修复类别：单页

### R10-L03-D05　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`f2e98b66f1414926`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:2930`
- 理想图依据：not-found 无基准；依据=§1.2 卡片面 token + §1.4 卡片圆角/阴影
- 现象：not-found 卡底取 --c-bg-container，而本页 :1643-1644 把页面底与卡底同时覆成 #FFFFFF；帧上卡区与页底同为 (255,255,255)，40rpx 圆角与 32rpx 内衬零边界，所谓专用卡读成裸骨架＋居中文字。
- 建议改法：给卡补 --s-card-soft 阴影或 1rpx 中性描边，或把页底恢复 #EEF7F2，让卡面成立。
- 修复类别：CSS/token

### R10-L03-D06　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`f2e98b66f1414926`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1643`
- 理想图依据：帖子.png 底部白底连续 + §1.1「页面间不得出现白/绿断层」
- 现象：页面整体白底，但 y786–814 整条 28px 为 #EEF7F2：白色内容在上、薄荷页底在下，形成横向断层；该页把 --c-bg-page 强制改白后没有覆盖到底部安全区。
- 建议改法：把该页窗口/页面背景也设 #FFFFFF，或让根节点铺满底部安全区，消掉 28px 绿带。
- 修复类别：CSS/token

### R10-L03-D07　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`f2e98b66f1414926`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:3003`
- 理想图依据：not-found 无基准；依据=WCAG 非文本 3:1 + §1.2 描边档
- 现象：空态「返回」幽灵钮只靠 2rpx #D8E0DC 描边界定热区，压白实测约 1.3:1（帧 x113–171 / y500–533），在相邻深绿实心钮旁读成一行纯文字而不是按钮。
- 建议改法：描边提到 ≥3:1 的中性色（如 --c-text-tertiary）或改浅底实心＋描边，保持与「返回广场」同高。
- 修复类别：CSS/token

## subpackages/village/village/history（2 条）

### R10-L03-D10　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__history__top.png`（sha16=`8feca45c8614ea9b`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:397`
- 理想图依据：无基准页；依据=§1.2 错误色语义 + 正文 4.5:1
- 现象：破坏性动作「清空记录」字取 --c-error #E5454D 压 rgba(229,69,77,.1) 叠白（实测 #FCECED），3.46:1；24rpx/600 的删除入口低于 4.5。
- 建议改法：字色改 --c-text-error-dark #991B1B（或等价深红）到 ≥4.5，红色语义不变。
- 修复类别：CSS/token

### R10-L03-D11　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`15408e35494060af`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:342`
- 理想图依据：无基准页；依据=§1.4 页头控件 + 同域 detail 的 88rpx 最小热区口径
- 现象：页头返回圆钮 CSS 64rpx=32px（帧上白圆约 28–32px、y66–95），低于 88rpx/44px；同域 detail 已把返回热区做到 min 88rpx（detail.vue:1680-1682），两页不同档。系统侧滑可替代，故不判 P1。
- 建议改法：可视圆仍 64rpx，热区外扩到 min 88rpx，与 detail 统一。
- 修复类别：单页

## subpackages/village/village/index（1 条）

### R10-L02-D12　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`09bad32f6acc7da6`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:764`
- 理想图依据：无基准页；LockScreen 组件自身 close 已按 88rpx 修，主 CTA 高 96rpx，本链接为同页唯一公开内容出口
- 现象：「先逛逛公开内容」点击盒只有 44rpx（22px）高（padding 8rpx + 26rpx 文本行），远低于 88rpx；且与正文同为 #4A524E、无箭头/下划线，游客唯一的公开内容出口既小又不像可点。
- 建议改法：链接本体补到 88rpx 高，并加下划线/箭头或品牌深色，明确可点。
- 修复类别：CSS/token

## subpackages/village/village/post（3 条）

### R10-L03-D01　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__post__top.png`（sha16=`a7dc6142e293134f`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1429`
- 理想图依据：无基准页；依据=§1.2（占位/三级文本档）+ §1.3（正文 15px）
- 现象：标题占位「填写标题会有更多赞哦～」以 36rpx 正文级字号压在 #EEF7F2 页底上，帧上实测字形最暗 #7C7C7C（≈3.8:1）；即便按本行声明的 --c-text-quaternary #9AA39F 复算也只有 2.37:1，两种取值都 <4.5。
- 建议改法：占位色改到压 #EEF7F2 ≥4.5 的档（--c-text-secondary #4A524E=6.9），正文 textarea 同步补 placeholder-class，别让平台默认灰兜底。
- 修复类别：CSS/token

### R10-L03-D02　P2 / 字号　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__post__top.png`（sha16=`a7dc6142e293134f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1667`
- 理想图依据：无基准页；依据=§1.3（小字 12–13px；10/11px 仅角标·法务）
- 现象：底栏 5 个工具标签「图片/话题/位置/提及/更多」取 20rpx=10px，落在规范只给角标·法务的极小档；它们是底栏唯一可读文字，帧上 y≈775 一排明显小于正文。
- 建议改法：标签提到 --fs-base 24rpx=12px（或 --fs-md 26rpx），图标 40rpx 不动。
- 修复类别：CSS/token

### R10-L03-D03　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__post__top.png`（sha16=`a7dc6142e293134f`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1056`
- 理想图依据：无基准页；依据=§1.2 + §1.6 铁律（图标统一素材）
- 现象：底栏「位置」用 LOCATION 素材，帧上实测墨色 #AFBACC，压白仅 2.0:1；同排图片/话题/提及/更多为 #333（12.6:1），位置项在一排里读成禁用态。
- 建议改法：换深墨定位图标或可着色的 glyph，使非文本对比 ≥3:1，并与其他四枚同墨色。
- 修复类别：CSS/token

## subpackages/village/village/publish（6 条）

### R10-L02-D13　P1 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`4012b3174955487b`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1160`
- 理想图依据：发布帖子页面.png 页头「发布」胶囊（主操作）
- 现象：发布按钮底 --c-brand #36C99A + 白字（28rpx/14px），2.10:1；这是发布页唯一主操作，白字读不出。
- 建议改法：发布按钮改 brand-800（白字 6.45:1），与全站深档白字口径一致。
- 修复类别：CSS/token

### R10-L02-D14　P1 / 需新建　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`4012b3174955487b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:362`
- 理想图依据：发布帖子页面.png「添加位置 → 北京大学 · 未名湖校区」
- 现象：无城市缓存时「添加位置」行显示「位置选择即将开放」，整行无 @tap、无选择器；底栏「位置」也只弹同一句 toast，用户发帖无法带位置。
- 建议改法：接真实位置选择器（或至少展示当前城市并允许确认），不要把「即将开放」作为唯一状态。
- 修复类别：需新建目标功能

### R10-L02-D15　P2 / 文案　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`4012b3174955487b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:21`
- 理想图依据：发布帖子页面.png 正文计数 0/1000；§3.14 正文输入（0/1000）
- 现象：正文计数为 12/500（MAX_CONTENT_LENGTH=500），与规范的 0/1000 不一致；用户最多只能写 500 字，超出即被截断。
- 建议改法：上限与 §3.14 对齐到 1000，store 校验与页内计数同源改。
- 修复类别：单页

### R10-L02-D16　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`4012b3174955487b`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1145`
- 理想图依据：发布帖子页面.png 左上关闭钮（约 40px 圆形热区）
- 现象：左上关闭钮 .publish-header__close 只有 64rpx（32px），低于 88rpx；这是不发布离开页面的显式出口。
- 建议改法：关闭钮热区补到 88rpx，36rpx 字形不动。
- 修复类别：CSS/token

### R10-L02-D17　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`9827795cef9683c9`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1282`
- 理想图依据：发布帖子页面.png 发帖小贴士（绿色标题）
- 现象：小贴士标题取 --c-brand #36C99A 压 --c-brand-50 #E8FAF3，只有 1.94:1；26rpx/13px 粗体不享大字号豁免，标题读不清。
- 建议改法：标题改 brand-800（压 brand-50 5.96:1）或 text-secondary。
- 修复类别：CSS/token

### R10-L02-D18　P2 / 可达性　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`9827795cef9683c9`，自同段前条继承）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:1307`
- 理想图依据：发布帖子页面.png 底部工具栏（五枚均为整列大按钮）
- 现象：底栏五枚 .publish-tool 无最小高度，图标 40rpx + gap 6rpx + 标签 20rpx ≈70rpx（35px）高，低于 88rpx；这是图片/话题/位置/提及/谁可以看的入口排。
- 建议改法：每个 .publish-tool 补 min-height:88rpx。
- 修复类别：CSS/token

## subpackages/village/village/tag-posts（2 条）

### R10-L03-D08　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`77c73c1f026877fb`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:846`
- 理想图依据：无基准页；依据=§1.2 主色/浅底 + 正文 4.5:1
- 现象：帖子卡标签「运动」取 --c-brand #36C99A 压 --c-tint-green-50 #E8F5E9，实测 1.82:1（帧上字心 #5CD2AB、底 (232,245,233)），24rpx 标签几乎融底。
- 建议改法：标签字改 brand-800 #156B51（白底 6.45/浅绿底更高）或深墨，浅绿底不动。
- 修复类别：CSS/token

### R10-L03-D09　P2 / 颜色token　批次 -
- 帧：`tmp/qa/frames/R10/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`9e7d6641634ba220`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:910`
- 理想图依据：无基准页；依据=§1.2 三级文本 + 4.5:1
- 现象：列表终止提示「— 没有更多了 —」取 $text-tertiary（实为 --c-text-quaternary #9AA39F）压 #EEF7F2，实测 2.37:1；这是本页唯一的到底信号（帧 y≈684）。
- 建议改法：改 --c-text-secondary #4A524E（6.9:1），与 history 终止行同口径。
- 修复类别：CSS/token

