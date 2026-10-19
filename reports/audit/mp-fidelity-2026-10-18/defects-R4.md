# R4 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=64　涉及页面=8　涉及帧=16　泳道卡=3
- 严重度分布：P2=31　P1=25　P0=6　P3=2
- 轴分布：文案=18　素材缺失=13　层级遮挡=6　需新建=6　空态文案=5　尺寸比例=4　位置=3　颜色token=3　可达性=2　字号=2　圆角=2
- 批次归属：64 个批次收录，**卡上有而 fixlist 没有的=0**

## pages/home/index（7 条）

### R4-L01-D01　P1 / 素材缺失　批次 R4-B02
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__home__index__top.png`（sha16=`1009278d182a4c7b`）
- 源码证据：`apps/client/src/components/home/HomeHeader.vue:78`
- 理想图依据：首页.png 顶栏区域，标题右侧有红色爱心、最右有铃铛+红色未读角标「6」
- 现象：帧上顶栏「首页」右侧无爱心图标、右侧边缘无铃铛与未读角标，整条头部右侧空掉
- 建议改法：确认 HEART_FILLED/HEADER_BELL 素材可解析并渲染，notifyBadge>0 时补出角标
- 修复类别：单页

### R4-L01-D02　P1 / 文案　批次 R4-B06
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__home__index__top.png`（sha16=`1009278d182a4c7b`）
- 源码证据：`apps/client/src/components/home/TodayRecommendationCard.vue:108`
- 理想图依据：首页.png 今日推荐左图右下角「♥ 92% 合拍度」为干净百分比
- 现象：合拍度徽章渲染成乱码「e2..45%」，百分比前混入残破 token 串，非理想图的纯数字百分比
- 建议改法：校验 item.matchScore 为纯数值再拼接「%」，异常值兜底为 0
- 修复类别：单页

### R4-L01-D03　P2 / 层级遮挡　批次 R4-B07
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__home__index__top.png`（sha16=`1009278d182a4c7b`）
- 源码证据：`apps/client/src/components/layout/TabBar.vue:107`
- 理想图依据：首页.png 底部 TabBar 为贴底平直栏，不遮内容
- 现象：悬浮圆角 TabBar 卡片上压，把「关系动态 / 全部」分区标题下缘遮住，内容被切
- 建议改法：TabBar 底部净空与内容区 padding-bottom 对齐，避免浮层覆盖最后一段标题
- 修复类别：CSS/token

### R4-L01-D04　P2 / 文案　批次 R4-B05
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__home__index__top.png`（sha16=`1009278d182a4c7b`）
- 源码证据：`apps/client/src/components/home/TodayLoveProgress.vue:67`
- 理想图依据：首页.png 今日恋爱进度四格为「完善资料/认识新的人/回复悄悄话/参与兴趣互动」
- 现象：帧上步骤名显示「认识新人/同校悄悄话/兴趣圈互动」，与理想图用词不一致
- 建议改法：步骤标题统一取 i18n 规范词「回复悄悄话/参与兴趣互动」
- 修复类别：单页

### R4-L01-D05　P1 / 素材缺失　批次 R4-B01
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__home__index__bottom.png`（sha16=`e2533c8c64ab4279`）
- 源码证据：`apps/client/src/components/home/CommunityFeed.vue:232`
- 理想图依据：首页.png 社区动态每条帖子下方有 3 张真实照片缩略图
- 现象：社区动态卡片图片位为灰空白块，post.images 解析失败停在灰占位，无实拍图
- 建议改法：修正 resolveMediaUrl 对帖子图的取源，失败时换本地占位而非纯灰块
- 修复类别：单页

### R4-L01-D06　P2 / 素材缺失　批次 R4-B04
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__home__index__bottom.png`（sha16=`e2533c8c64ab4279`）
- 源码证据：`apps/client/src/components/home/InviteBanner.vue:17`
- 理想图依据：首页.png 邀请好友横幅左侧有礼盒🎁图标、右侧有带翅膀爱心
- 现象：邀请横幅左侧只剩一块粉色空方块，礼盒图标与右侧翅膀爱心均未渲染
- 建议改法：确认 ICONS_EMOJI.GIFT 素材路径可解析并渲染
- 修复类别：单页

### R4-L01-D07　P2 / 素材缺失　批次 R4-B03
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__home__index__bottom.png`（sha16=`e2533c8c64ab4279`）
- 源码证据：`apps/client/src/components/home/InterestRecommendation.vue:102`
- 理想图依据：首页.png 兴趣推荐四张卡片各有实拍封面（摄影/旅行/音乐/美食）
- 现象：兴趣推荐卡片为浅绿纯色块无封面图，且仅 3 张（摄影/旅行/游戏）缺第 4 张
- 建议改法：coverSrc 回退本地 circle-cover 映射，保证每卡出图并补齐四张
- 修复类别：单页

## pages/nearby/index（5 条）

### R4-L01-D08　P2 / 文案　批次 R4-B14
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__nearby__index__top.png`（sha16=`2b3c0ddbed98fef0`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:460`
- 理想图依据：附近的首页.png 五宫格入口标签为短词「兴趣圈」「活动」
- 现象：帧上入口标签仍显示长词「热门兴趣圈」「附近活动」，上一轮 R2b-L02-D02 改短词未落地（上一轮修得不对）
- 建议改法：核对 nearby.tabCircles/tabActivities 实际取值，入口位强制用短词
- 修复类别：单页

### R4-L01-D09　P1 / 素材缺失　批次 R4-B14
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__nearby__index__top.png`（sha16=`2b3c0ddbed98fef0`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:586`
- 理想图依据：附近的首页.png 校园圈四卡为竖版校园实景封面图
- 现象：校园圈卡片为浅绿纯色块+校名，coverUrl 为空未出校园实景封面
- 建议改法：coverUrl 缺失时兜底本地 CAMPUS_COVER 实景素材而非纯色底
- 修复类别：单页

### R4-L01-D10　P2 / 空态文案　批次 R4-B14
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__nearby__index__top.png`（sha16=`2b3c0ddbed98fef0`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:567`
- 理想图依据：附近的首页.png 校园圈卡第二行为「3.2k 位同学」成员数
- 现象：校园圈卡副行显示城市名（南京/杭州等），非理想图的「N 位同学」成员数，缺该数据源
- 建议改法：补校园圈成员数字段并按「N 位同学」格式渲染
- 修复类别：需新建目标功能

### R4-L01-D11　P2 / 层级遮挡　批次 R4-B07
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__nearby__index__bottom.png`（sha16=`075cbe45657fe99f`）
- 源码证据：`apps/client/src/components/layout/TabBar.vue:114`
- 理想图依据：附近的首页.png 附近动态整卡完整可见，TabBar 贴底不遮内容
- 现象：悬浮 TabBar 卡片上压，把「附近动态」首条 feed 卡下缘与正文遮住，内容被切一半
- 建议改法：增大页面底部 padding-bottom 至 TabBar 净空，避免浮层覆盖动态卡
- 修复类别：CSS/token

### R4-L01-D12　P1 / 素材缺失　批次 R4-B14
- 帧：`tmp/qa/frames/R4/real-f0677920/pages__nearby__index__bottom.png`（sha16=`075cbe45657fe99f`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1003`
- 理想图依据：附近的首页.png 校园圈封面为满幅竖版校园实景
- 现象：校园圈封面位仅一小块浅绿缩略占位，未铺满成理想图的实景封面
- 建议改法：cover-img 撑满卡片高度并兜底本地校园实景素材
- 修复类别：单页

## subpackages/campus/campus/hub（8 条）

### R4-L03-D01　P1 / 文案　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`3d3ffbbeb40fcffa`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:92`
- 理想图依据：素材/理想效果图/校园圈.png，推荐圈子列表第 1–5 张卡片的标题行（「北京大学圈 / 清华大学圈 / 北京电影学院圈 / 复旦大学圈 / 中国人民大学圈」，每枚校名末尾均带「圈」）
- 现象：帧上全部校园卡标题为「北京大学 / 清华大学 / 中国人民大学 / 复旦大学 / 上海交通大学」，缺理想图要求的「圈」后缀；源码 schoolTitle() 已实现 endsWith('圈') 守卫拼接，帧上未生效 ⇒ 上一轮修得不对（R2b-L05-D11 文案轴未落到运行时）
- 建议改法：确认该页实际渲染的构建产物包含 hub.vue:344 的 schoolTitle(school.name) 调用（而非直出 school.name），重新构建后以 top 帧复量标题为「×××大学圈」
- 修复类别：单页

### R4-L03-D02　P2 / 字号　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`3d3ffbbeb40fcffa`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:715`
- 理想图依据：素材/理想效果图/校园圈.png，卡片标题「北京大学圈」字高约占屏宽 6.5%（≈48rpx），明显大于其下统计行；帧上校名与统计行字号几乎等大
- 现象：校园卡标题字号 30rpx，与理想图约 48rpx 低一档，导致卡片内「标题 / 统计行 / 等 N 位同学」三行层级被压平（帧上三行视觉重量接近）
- 建议改法：将 .campus-school-card__name 的 font-size 由 30rpx 提到 44–48rpx（走 --fs-4xl 档 token），统计行保持 26rpx
- 修复类别：CSS/token

### R4-L03-D03　P2 / 颜色token　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`3d3ffbbeb40fcffa`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:547`
- 理想图依据：素材/理想效果图/校园圈.png，「加入校园圈，发现更多同校的TA」引导横幅左侧学士帽图标底衬为浅薄荷绿圆角方（约 #E3F7EC），与右侧实心绿「去认证」同色系
- 现象：帧上该图标底衬为近白/浅灰底（与横幅底色几乎无差别），理想图是明确的浅绿 tint 方块，图标区失去品牌绿承托
- 建议改法：把 background 从 var(--c-bg-container, #FFFFFF) 改为品牌绿浅 tint（如 var(--c-brand-green-50, #E3F7EC)）
- 修复类别：CSS/token

### R4-L03-D04　P2 / 位置　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`3d3ffbbeb40fcffa`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:275`
- 理想图依据：素材/理想效果图/校园圈.png，搜索入口是页面右上角标题行内的放大镜图标（与「校园圈」大标题同一水平线），引导横幅与 Tab 之间没有任何输入控件
- 现象：帧上搜索被做成一整条圆角输入胶囊，插在引导横幅与「我加入的/推荐圈子」Tab 之间，把理想图里紧贴横幅的 Tab 往下顶开约 100rpx，标题行右侧反而只剩微信胶囊、无放大镜
- 建议改法：按理想图把搜索入口收为标题行右侧图标（点击展开输入），或至少将输入条移到 Tab 之下，恢复「横幅 → Tab」直接相邻的纵向顺序
- 修复类别：单页

### R4-L03-D05　P1 / 文案　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`9d0e7754607d6cb2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:69`
- 理想图依据：素材/理想效果图/校园圈.png，每张校园卡第二行统计串为「3.2k 位同学 · 2.8w 条动态」，无量词前缀
- 现象：bottom 帧全部卡片统计行渲染为「约1.4k 同学 · 约1.1w 动态」「约1.6k 同学 · 约1.2w 动态」等，多出「约」前缀且丢了量词「位/条」；同帧「等 163 位同学」却带量词，同一行内口径不一致；源码 schoolStats 已写成「1.4k 位同学」⇒ 上一轮修得不对（R2b-L05-D11 未生效）
- 建议改法：核对该页运行时实际取数路径是否仍走带 prefixTilde 的旧口径，重新构建后以 bottom 帧复量统计行为「1.4k 位同学 · 1.1w 条动态」
- 修复类别：单页

### R4-L03-D06　P2 / 文案　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`9d0e7754607d6cb2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:382`
- 理想图依据：素材/理想效果图/校园圈.png 列表末尾一行「查看更多校园圈」+ 向下箭头（灰色文字居中）
- 现象：bottom 帧列表末尾渲染为静态说明行「更多校园圈持续接入中」且无向下箭头，理想图的可点入口文案「查看更多校园圈」未出现（canToggleMore 为假时整行退化为提示语）⇒ 上一轮修得不对（R2b-L05-D15 需新建轴未生效）
- 建议改法：让 moreLabel 分支在该数据量下为真（预览数阈值按实际 11 校下调），使末行恒为「查看更多校园圈 ⌄」可点入口
- 修复类别：单页

### R4-L03-D07　P2 / 层级遮挡　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`9d0e7754607d6cb2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:461`
- 理想图依据：素材/理想效果图/校园圈.png 无吸顶标题带——「校园圈」大标题与副标题只在页面顶部随列表滚出，滚动后列表内容可占满整屏
- 现象：bottom 帧顶部仍常驻白色吸顶标题带（含状态栏避让内衬，高约 150rpx），其下方第一张校园卡被这条不透明带压掉上半截（只剩统计行与头像行可见），理想图该位置应是完整卡片
- 建议改法：去掉 .campus-hub__header 的 position: sticky（或改为随滚动淡出的非吸顶），让列表首卡不被标题带遮住
- 修复类别：单页

### R4-L03-D08　P2 / 需新建　批次 R4-B15
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`9d0e7754607d6cb2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:385`
- 理想图依据：素材/理想效果图/校园圈.png 底部为 5 枚 Tab 的常驻标签栏（首页/附近/匹配/消息/我的，「附近」为绿色选中态）
- 现象：bottom 帧滚到列表末尾后只有 .campus-hub__footer 空白占位，整页没有任何底部标签栏，理想图的 5 枚 Tab 一枚都不在，用户无法从本页直接切回首页/匹配/消息
- 建议改法：本页接入应用自定义 TabBar 组件（与 pages/nearby/index 同一实例、选中态置「附近」），替换现有纯占位 footer
- 修复类别：需新建目标功能

## subpackages/circles/circles/circle-home（11 条）

### R4-L02-D21　P1 / 位置　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`3985a4a00ede1472`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:489`
- 理想图依据：圈子详情，摄影圈参考.png 顶部——「摄影圈 / 用镜头记录生活的美好瞬间 / 1.2w 人加入 · 362 条动态 / 等 8 位朋友已加入 / 加入圈子」整块直接叠在深色 Hero 照片内，白字
- 现象：帧上这块信息只靠 `margin-top:-96rpx` 压住 Hero 底边一小条，名称以下全部落在 Hero 之外的白卡上，理想图的「文字在照片上」版式没有成立
- 建议改法：把 info-main 移入 `.hero` 内做绝对定位叠层（或给 hero 足够高度 + info-card 透明底），文字改白色口径
- 修复类别：单页

### R4-L02-D22　P1 / 素材缺失　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`3985a4a00ede1472`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:470`
- 理想图依据：圈子详情，摄影圈参考.png Hero 背景——压暗的深绿调人像摄影大图（人物持相机），白色文字可直接读
- 现象：帧上 Hero 素材是一张高亮度的浅色桌面静物照（白底 + 盆栽 + 青色相机），整体偏白，`hero-mask` 也不足以把底色压暗，理想图的暗色沉浸氛围与白色文字对比全部丢失
- 建议改法：摄影圈封面素材换成理想图同口径的暗调摄影图，并给 `.hero-mask` 补 `linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.65))`
- 修复类别：单页

### R4-L02-D23　P2 / 文案　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`3985a4a00ede1472`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:494`
- 理想图依据：圈子详情，摄影圈参考.png Hero 内主标题「摄影圈」三字
- 现象：帧上主标题读作「摄影」，是后端分类本名，未补「圈」后缀，与理想图及列表页口径不一致
- 建议改法：复用列表页 `circleTitle()` 的 endsWith 守卫在展示层补「圈」
- 修复类别：单页

### R4-L02-D24　P2 / 颜色token　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`3985a4a00ede1472`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:836`
- 理想图依据：圈子详情，摄影圈参考.png「摄影圈」右侧「热门」徽标——半透明暗红底 + 红字、全圆角胶囊
- 现象：徽标写死 `color:#e6731c` + `background:#fdf0e3`（浅橙底橙字）且 `border-radius:8rpx` 近直角，帧上呈一颗淡橙方块，理想图是暗红半透明胶囊，色相与圆角两头都不符
- 建议改法：底色改 `rgba(127,29,29,.55)`、文字 `--c-danger-400`，圆角取 `--r-full`
- 修复类别：CSS/token

### R4-L02-D25　P1 / 需新建　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`3985a4a00ede1472`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:525`
- 理想图依据：圈子详情，摄影圈参考.png Hero 底部一行四枚半透明胶囊「摄影技巧 / 风景拍摄 / 人像写真 / 城市漫游」
- 现象：帧上标签行整行不渲染（`circleTags.length` 为 0，后端无圈标签字段），理想图这一行是圈子定位的关键入口
- 建议改法：为 interest_circle 补 tags 字段或在 real 模式用圈内热门话题名降级填充，保证该行有 3-4 枚胶囊
- 修复类别：需新建目标功能

### R4-L02-D26　P2 / 尺寸比例　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`3985a4a00ede1472`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:967`
- 理想图依据：圈子详情，摄影圈参考.png 页签行——「动态 / 精华 / 活动 / 作品墙 / 成员 1.2w」五项各占一行宽、同一基线单行排列
- 现象：帧上最右「成员」与「1.2w」被折成上下两行，页签行高度比其余四项多出一截，绿色指示条也偏到第二行下方
- 建议改法：`.tab-item` 改 `flex:0 0 auto` + 行内 `white-space:nowrap`，「1.2w」用独立小号 `<text>` 与「成员」同行
- 修复类别：CSS/token

### R4-L02-D27　P0 / 层级遮挡　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`b9a970713946eaf0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:946`
- 理想图依据：圈子详情，摄影圈参考.png 滚动态——吸顶页签行之上不应压住任何正文，正文行完整可读
- 现象：bottom 帧里吸顶 `.tabs` 白底条把上方「预算 2000 想拍人像和夜景，在 35 定焦和 50 定焦之…」整行切成半截残字，且微信原生胶囊（•••|◎）直接压在页签行右端「作品墙 / 成员」上方，两处遮挡同时发生
- 建议改法：给滚动内容加与吸顶行等高的 `padding-top`，并把 `.tabs` 的 `z-index` 与胶囊避让区（`--statusbar + menuButton` 宽度）一并算进去
- 修复类别：CSS/token

### R4-L02-D28　P1 / 素材缺失　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`b9a970713946eaf0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:581`
- 理想图依据：圈子详情，摄影圈参考.png 每条动态正文下方 3 张等宽 1:1 方格配图（第二组末格带 00:12 视频角标）
- 现象：bottom 帧 5 条动态全部 0 配图，`item.images.length > 0` 分支从不命中，理想图里占据半屏的作品墙素材在实帧完全不存在
- 建议改法：圈内话题下发 images 时透传到 feed 项，无图话题也要按理想图给出 1:1 占位格而不是整块不渲染
- 修复类别：单页

### R4-L02-D29　P2 / 圆角　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`b9a970713946eaf0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1032`
- 理想图依据：圈子详情，摄影圈参考.png 动态流——通栏白色 sheet，条目之间只用一条 1px 浅灰分隔线，卡片无外圆角
- 现象：帧上每条动态是 `margin:24rpx` + `border-radius:24rpx` 的独立浮起圆角卡，卡间露出页面浅绿底，与理想图的连续白 sheet + 细线分隔口径不符
- 建议改法：`.feed-card` 去掉左右 margin 与圆角，改通栏 + `border-bottom: 1rpx solid var(--c-line)`
- 修复类别：CSS/token

### R4-L02-D30　P2 / 文案　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`b9a970713946eaf0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:569`
- 理想图依据：圈子详情，摄影圈参考.png 作者行时间——「30 分钟前」「2 小时前」「3 小时前」相对时间
- 现象：帧上时间一律读作绝对短日期「8-26」「9-09」，理想图与帖子详情页都用相对时间口径
- 建议改法：演示数据分支的 `timeText` 也走 `relativeTime()`，不要预格式化字符串直出
- 修复类别：单页

### R4-L02-D31　P2 / 需新建　批次 R4-B16
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`b9a970713946eaf0`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:576`
- 理想图依据：圈子详情，摄影圈参考.png 每条动态正文前的浅绿底绿字话题胶囊「# 校园风景」「# 人像写真」「# 器材交流」
- 现象：帧上 5 条动态都没有话题胶囊（`item.tag` 为空），话题信息被降级成列表尾一整条「查看全部话题 ›」，与理想图逐条打标签的版式不同
- 建议改法：真实话题映射 feed 项时把首个话题名/分类写入 `tag`，胶囊沿用 `--c-brand` 浅底口径
- 修复类别：需新建目标功能

## subpackages/circles/circles/index（10 条）

### R4-L02-D11　P1 / 文案　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`7f5472cc7dbee73b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:457`
- 理想图依据：兴趣圈列表.png 卡片标题列——「摄影圈 / 旅行圈 / 音乐圈 / 运动圈 / 美食圈 / 天文圈」，一律三字带「圈」后缀
- 现象：帧上八张卡标题全部读作两字分类名「摄影 / 旅行 / 音乐 / 运动 / 美食 / 游戏 / 阅读 / 宠物」，`circleTitle()` 的「圈」后缀在画面上没有生效——上一轮 R2b-B28 的 R2b-L04-D11 修得不对
- 建议改法：确认 `.circle-card__name` 实际渲染节点走的是 `circleTitle(circle.name)` 且未被同名 scoped 样式/缓存构建绕过，重跑该帧取三字标题
- 修复类别：单页

### R4-L02-D12　P2 / 文案　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`7f5472cc7dbee73b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:496`
- 理想图依据：兴趣圈列表.png 每张卡右侧描边绿胶囊内只有「加入」二字
- 现象：帧上八枚按钮一律读作「+ 加入」，`joinLabel()` 剥加号未体现于画面，胶囊因此比理想图宽出一截——上一轮 R2b-L04-D19 修得不对
- 建议改法：直接把按钮文案写成常量「加入」/`circle.joinedBtn`，不依赖运行时 replace 兜底
- 修复类别：单页

### R4-L02-D13　P1 / 素材缺失　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`7f5472cc7dbee73b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:421`
- 理想图依据：兴趣圈列表.png 副标题下方分类行——「全部(实心绿) / 摄影 / 旅行 / 音乐 / 运动 / 美食」六枚带字胶囊 + 右端带绿点的汉堡
- 现象：帧上分类行只有 4 枚空白浅色胶囊，一枚都读不出文字，行首还出现原始码点串「e1_39」（`ICONS_EMOJI.LIST` 未取到字形），理想图的六个分类名全部不可见（素材文件本身在 `apps/client/dist/build/mp-weixin/static/assets/icons/common/list.svg` 存在，按运行时未解码 + 文字标签未渲染定性）
- 建议改法：去掉 `tab.iconSrc` 分支对文字标签的互斥（`v-if/v-else` 改为图标 + 文字并存），使六个分类名恒定可读；汉堡位按运行时解码问题排查，不要重复投递已存在的 list.svg
- 修复类别：单页

### R4-L02-D14　P1 / 位置　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`7f5472cc7dbee73b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:381`
- 理想图依据：兴趣圈列表.png 顶部第一行——「‹ 兴趣圈」在左、「🔍」在同一行最右；第二行灰字副标题；第三行分类胶囊
- 现象：帧上返回键独占一行且贴左上角，「兴趣圈」与分类胶囊行挤在同一行，搜索放大镜掉到第三行左端，理想图里标题行右端的搜索位为空——`#header` 插槽四组元素被排成三行错位
- 建议改法：给 `.circles-header__row` 设 `display:flex; align-items:center` 且搜索钮 `margin-left:auto` 回到同一行右端，分类行另起一行，与标题行之间留 `--sp-4`
- 修复类别：单页

### R4-L02-D15　P2 / 颜色token　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`7f5472cc7dbee73b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:605`
- 理想图依据：兴趣圈列表.png 摄影圈/旅行圈/音乐圈标题右侧「热门」徽标——浅粉底（≈#FEE2E2）+ 红字（≈#EF4444）
- 现象：徽标用 `rgba(255,77,92,0.92)` 实心红底 + `#FFFFFF` 白字，帧上呈一颗高饱和实心红块，比理想图的浅底红字重一档，且未走设计令牌
- 建议改法：`--hot-badge-bg` 改浅底令牌（如 `--c-danger-50`），`--hot-badge-text` 改 `--c-danger-500`
- 修复类别：CSS/token

### R4-L02-D16　P2 / 尺寸比例　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`7f5472cc7dbee73b`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:596`
- 理想图依据：兴趣圈列表.png 卡片封面——约 140pt 见方圆角块，占卡片高度约 75%，与右侧四行文字等高
- 现象：帧上封面只有约 60pt 见方（`.circle-card__cover` 100%/100% 但 `__cover-wrap` 容器偏小），明显小于卡片文字列高度，卡片左半大面积留白，封面与理想图比例差约 2.3 倍
- 建议改法：把 `.circle-card__cover-wrap` 固定为理想图口径 240rpx×240rpx（与卡片 `align-items: stretch` 联动）
- 修复类别：CSS/token

### R4-L02-D17　P0 / 需新建　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`a36e42fdb71e7bd7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:367`
- 理想图依据：兴趣圈列表.png 最底部主导航——首页 / 附近(绿·选中) / 匹配 / 消息 / 我的 五项常驻 TabBar
- 现象：bottom 帧滚到列表尾后底部只剩一条 home indicator，整条五项主导航不存在，用户在兴趣圈列表无法切到首页/匹配/消息/我的
- 建议改法：本页挂上全局 TabBar（`tab-bar-safe` 改 true 并渲染共用的 TabBar 组件），列表尾留 `padding-bottom` 避让
- 修复类别：需新建目标功能

### R4-L02-D18　P2 / 文案　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`a36e42fdb71e7bd7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:466`
- 理想图依据：兴趣圈列表.png 每张卡第二行——「1.2w 人加入 · 362 条动态」「8,932 人加入 · 245 条动态」
- 现象：帧上统计行一律读作「1.2w 人 · 5 条动态」，「加入」二字被 R3 精简掉，与理想图口径不符；且行首群组图标位显示成一个「只」形残字而非三人图标
- 建议改法：`circle.cardStats` 词条恢复「{members} 人加入 · {posts} 条动态」，图标位排查 ICONS_EMOJI.GROUP 资源
- 修复类别：单页

### R4-L02-D19　P2 / 字号　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`a36e42fdb71e7bd7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:462`
- 理想图依据：兴趣圈列表.png 卡片描述行——单行灰字（「用镜头记录生活的美好瞬间」），不换行、不与标题争宽度
- 现象：帧上描述字号偏大且未做单行截断，「分享你喜欢的音乐，发现更多好声音」把末字「音」甩成孤字第二行、「分享你的味蕾体验」甩成「验」独占一行，卡片高度被撑成两档不齐
- 建议改法：`.circle-card__desc` 取 `--fs-sm` 并加 `lines:1 / -webkit-line-clamp:1 + ellipsis`
- 修复类别：CSS/token

### R4-L02-D20　P3 / 空态文案　批次 R4-B17
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`a36e42fdb71e7bd7`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:502`
- 理想图依据：兴趣圈列表.png 列表尾（天文圈为第 6 张卡）之后应有一行收尾提示
- 现象：bottom 帧「宠物」卡之后是一整段无文案的纯白留白（`list-bottom-spacer`），既无「没有更多圈子了」也无加载到底指示，用户无法判断列表是否结束
- 建议改法：在 spacer 前补一行居中灰字「没有更多了」，并把 spacer 高度改为与吸底 TabBar 等高的避让值
- 修复类别：单页

## subpackages/profile-extra/profile/other（8 条）

### R4-L03-D09　P0 / 层级遮挡　批次 R4-B18
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b5a21516fc167530`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/other.vue:510`
- 理想图依据：素材/理想效果图/他人显示主页.png 全页为纯白底 + 白卡，正文为深灰字，无任何覆盖内容区的暗色层
- 现象：帧上整页（含 fixed 底部动作条，其自身 background 为 rgba(255,255,255,0.97)）被一层均匀暗色蒙层压住，白卡变深灰、正文与「资料暂未完善」等文字对比度接近 0，理想图该处为清晰可读的白底页；本页唯一的全屏高 z-index 暗色层即 .photo-viewer（position:fixed; inset:0; z-index:2000; rgba(0,0,0,0.92)），其 v-if 为真而 photoViewerSrc 为空时正是「整屏变黑、无大图」
- 建议改法：排查 previewAvatar/tap-photo 链路：src 为空时不得置 photoViewerVisible 为真（或在 .photo-viewer 内对空 src 直接不渲染该层）
- 修复类别：单页

### R4-L03-D10　P1 / 文案　批次 R4-B12
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b5a21516fc167530`）
- 源码证据：`apps/client/src/components/profile/public/PublicInterest.vue:18`
- 理想图依据：素材/理想效果图/他人显示主页.png「兴趣标签」一节，6 枚胶囊全为中文（旅行 / 摄影 / 音乐 / 电影 / 美食 / 猫咪）
- 现象：帧上四枚胶囊直出服务端英文原值「running / movies / reading / photography」，与理想图（及本页其余全中文界面）语言不一致；源码 labels 已改走 tagLabelsFor() 中文映射 ⇒ 上一轮修得不对（R2b-L06-D16 文案轴未落到运行时）
- 建议改法：确认渲染该页的构建产物包含 tagLabelsFor 映射且别名表覆盖 running/movies/reading/photography 四个值，重新构建后复量胶囊为「跑步/电影/阅读/摄影」
- 修复类别：单页

### R4-L03-D11　P2 / 文案　批次 R4-B11
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b5a21516fc167530`）
- 源码证据：`apps/client/src/components/profile/public/PublicIdentity.vue:81`
- 理想图依据：素材/理想效果图/他人显示主页.png 身份卡左侧文本块：第一行昵称「星野」+ 性别标 + 绿色「在线」徽标，第二行「21岁 · 北京大学 · 北京」，第三行「2.3km · 在线」
- 现象：帧上身份卡昵称行与 meta 行整体塌成一句「资料暂未完善」，理想图要求的昵称、年龄·学校·城市、距离·在线三行信息一行都没有（mock 用户已有 bio 与 tags，说明是取数/字段映射缺 name/age/school/distance，而非无数据）
- 建议改法：让 profileForRender 的 basic.name/age/school/distance 走真实 mock 字段，仅在字段确实全缺时才落到 --empty 分支
- 修复类别：单页

### R4-L03-D12　P2 / 空态文案　批次 R4-B08
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b5a21516fc167530`）
- 源码证据：`apps/client/src/components/profile/public/PublicCommon.vue:84`
- 理想图依据：素材/理想效果图/他人显示主页.png 共同点一节：标题「我们有 3 个共同点」，下方 3 条（圆形图标 + 主文案「都喜欢旅行/音乐/猫猫」+ 副文案「通过 12 个国家 / 听网易云音乐 / 家里有 2 只猫」）
- 现象：帧上该节只有孤零零一行「我们还没有共同点」，3 条共同点卡与其图标/副文案全部不出现；理想图为「有 3 个共同点」的填充态，且本页 mock 已有兴趣标签，共同点理应有命中
- 建议改法：用与 tags 同源的 mock 数据喂 commonInterests（≥3 条带 label+detail），使 v-else 空态不再在该账号上出现
- 修复类别：单页

### R4-L03-D13　P2 / 尺寸比例　批次 R4-B10
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`b5a21516fc167530`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:50`
- 理想图依据：素材/理想效果图/他人显示主页.png 顶部封面人像大图，可见高度约占屏高 22%，身份白卡上沿压在封面下约 1/5 处
- 现象：帧上封面可见高度约占屏高 35%，明显高于理想图的约 22%，把身份卡、简介卡整体下压，首屏看不到「兴趣标签」以下任何内容
- 建议改法：将 .public-hero 的 height 由 640rpx 降到约 400rpx（对齐理想图 22% 屏高），保持头像 bottom:-40rpx 的压卡关系不变
- 修复类别：CSS/token

### R4-L03-D14　P1 / 素材缺失　批次 R4-B09
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`04b19afaab4af6ce`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:40`
- 理想图依据：素材/理想效果图/他人显示主页.png「生活瞬间」一节，标题下方为 4 张等宽方形真实照片横排（人像 / 猫 / 人像 / 篝火）
- 现象：bottom 帧「生活瞬间」标题下方 4 格全为无内容占位（走「暂无照片」骨架格分支），理想图该处是 4 张满格照片；同帧同页的封面与 bio 均有内容，说明 media.photos 未取到数据
- 建议改法：给该 mock 账号补 media.photos 4 项（复用 IMAGE_PATHS.CIRCLE_COVERS / assets 既有素材），使 v-if="photo" 出图分支生效
- 修复类别：单页

### R4-L03-D15　P1 / 可达性　批次 R4-B13
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`04b19afaab4af6ce`）
- 源码证据：`apps/client/src/components/profile/public/PublicProfile.vue:80`
- 理想图依据：素材/理想效果图/他人显示主页.png 生活瞬间之下还有「最近动态」节（作者头像 + 昵称 + 「3 天前 · 北京」+ 正文 + 3 张配图），需下滑可达
- 现象：bottom 帧与 top 帧内容几乎一致（仅上移约 40px），滚到底时「生活瞬间」即为最后一节，其下只剩一段空白与 fixed 底栏；PublicMoment（最近动态）在帧上任何滚动位置都不出现，理想图要求的该节内容不可达 ⇒ 上一轮修得不对（R2b-L06-D18 可达性轴未落到运行时）
- 建议改法：确认 posts 非空使 PublicMoment 真实渲染，并给 .public-profile 末尾加不低于 RelationshipCTA 高度（92rpx + 上下内衬）的 padding-bottom，避免最后一节被固定底栏压住
- 修复类别：单页

### R4-L03-D16　P3 / 圆角　批次 R4-B09
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`04b19afaab4af6ce`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:51`
- 理想图依据：素材/理想效果图/他人显示主页.png 纵向堆叠的各节白卡（简介卡 / 兴趣标签卡 / 共同点卡 / 生活瞬间卡）四角弧度目测一致，为同一档卡片圆角
- 现象：同页同级节卡圆角分两档混用——PublicIdentity.vue:95 / PublicInterest.vue:38 / PublicCommon.vue:109 为 40rpx，PublicBio.vue:16 / PublicGallery.vue:51 / PublicMoment.vue:132 为 32rpx；bottom 帧上「兴趣标签」卡与「生活瞬间」卡上下相邻即可看出两档弧度不齐
- 建议改法：各节容器统一改用同一圆角 token（如 var(--r-card)），删除 40rpx/32rpx 两套硬写值
- 修复类别：CSS/token

## subpackages/village/village/detail（10 条）

### R4-L02-D01　P1 / 尺寸比例　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`90a9de6b21b9f692`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:894`
- 理想图依据：帖子.png 正文下方配图区——1 张通栏大图 + 下方 3 张等宽 1:1 方格，单格高度约为屏宽 1/3
- 现象：无真图时占位配图网格渲染成 4 个横扁细长条（高约 12rpx、宽约 60rpx），整块高度不足理想图单格的 1/10，与代码自述「恒 1:1 方格」口径不符——上一轮 R2b-B31 补了占位网格但占位格比例修得不对
- 建议改法：给 `.post-media-grid__cell--placeholder` 补与真图同一口径的 1:1 容器高度（`padding-bottom:100%` 或与 `--2/--3` 列宽等高的 aspect-ratio），不要只留一条背景色
- 修复类别：CSS/token

### R4-L02-D02　P1 / 素材缺失　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`90a9de6b21b9f692`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:866`
- 理想图依据：帖子.png 正文下方整块照片素材（云海山脉大图 + 盘山公路/人物/雪峰三格）
- 现象：帧上 `currentPost.images.length > 0` 分支未命中，帖子全程 0 张真实图片，理想图里占据半屏的照片素材在实帧完全不存在
- 建议改法：让该详情帧走带图帖子（后端/ mock 下发 images 非空），或把 POST_PLACEHOLDER 换成理想图同规格的照片占位素材
- 修复类别：单页

### R4-L02-D03　P1 / 文案　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`90a9de6b21b9f692`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:942`
- 理想图依据：帖子.png 互动栏——实心红心 + 256、气泡 + 32、分享弯箭头 + 「分享」，全行无长句
- 现象：互动栏把 `likePostAria` 的值「点赞帖子」当可见文本渲染，图标位显示成原始码点串「e8_f1」，右端「全部评论」同样是 aria 文案，理想图的三枚图标 + 数字全部缺失（码点串按运行时未解码定性：`heart.svg`/`list.svg` 在 `apps/client/dist/build/mp-weixin/` 产物中确实存在，非文件缺失）
- 建议改法：互动栏只渲染 `<image>` 图标 + 计数文本，aria-label 保持仅作无障碍属性不外泄为可见文本；图标位排查 iconfont 回退与 `<image>` 解码，不要去补已被证实存在的 svg 文件
- 修复类别：单页

### R4-L02-D04　P2 / 需新建　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`90a9de6b21b9f692`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:931`
- 理想图依据：帖子.png 配图区下方绿色定位胶囊「北京大学·未名湖校区」+「距你 1.2km」整行
- 现象：帧上定位行整行不可见；即使 campusName 命中，距离槽位已被写成空注释节点，理想图的「距你 x km」没有数据来源
- 建议改法：为帖子详情补 distance 字段绑定与格式化文案（`距你 {{ distanceText }}`），无数据时按理想图保留校区胶囊并隐藏距离段
- 修复类别：需新建目标功能

### R4-L02-D05　P1 / 文案　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`90a9de6b21b9f692`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:998`
- 理想图依据：帖子.png 评论区标题行——左「全部评论 (32)」黑粗体，右「最热 ∨」灰字小号
- 现象：排序控件可见文本渲染成「切换为最新排序」+ 绿色胶囊「(c10_c9)」+「false ∨」，即把 aria-label、内部 token 串与布尔值一起当文案输出，理想图的「最热」二字完全没出现
- 建议改法：该控件可见文本严格取 `commentSort === 'hot' ? '最热' : '最新'`，aria-label 与调试 token 不得进入文本节点
- 修复类别：单页

### R4-L02-D06　P1 / 空态文案　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`90a9de6b21b9f692`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1006`
- 理想图依据：帖子.png 评论区——3 条根评论 + 2 条作者楼中楼，含昵称、学校标签、正文、时间、「回复」
- 现象：帧上 `loading` 分支常驻，只有一个转圈环，`loadingComments`（「加载评论中...」）文案没显示出来，评论列表 0 条且无「暂无评论」空态收尾，整块区域空白
- 建议改法：给 loading 态补可见文案，并为 `sortedComments.length === 0` 增加理想图口径的空态行；同时排查详情帧评论请求不返回导致 loading 不复位
- 修复类别：单页

### R4-L02-D07　P0 / 可达性　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`85a10ec5a4d6e56f`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:801`
- 理想图依据：帖子.png 全页——顶部作者/正文/配图，中段 5 条楼层评论，底部吸底输入栏，bottom 帧应看到列表尾与输入栏
- 现象：bottom 帧与 top 帧内容逐元素完全一致（作者行仍在最上、时间仅 10:59→11:00），页面滚不动，评论区后半段与吸底输入栏在画面上永远不可达
- 建议改法：给 `.detail-body` 这个 `scroll-view` 显式高度约束（`height: calc(100vh - 导航 - 吸底栏)` / flex:1 + min-height:0），使内容溢出时可滚
- 修复类别：单页

### R4-L02-D08　P2 / 层级遮挡　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`85a10ec5a4d6e56f`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1005`
- 理想图依据：帖子.png 评论区为完整文字楼层，无遮罩残形
- 现象：top 帧的加载环是闭合圆环，bottom 帧同一位置只剩一段被切开的「)」弧，加载指示器被卡片 overflow/相邻层裁切，属渲染残缺而非动画相位
- 建议改法：给 `.comments-loading` 固定行高与 `overflow: visible`，确认 spinner 尺寸未被父卡片裁切
- 修复类别：CSS/token

### R4-L02-D09　P1 / 文案　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`85a10ec5a4d6e56f`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1233`
- 理想图依据：帖子.png 全页任何位置都没有卡片式「私信」区块，理想图卡片副标题一律是一句人话
- 现象：卡片副标题位显示「给相似作者发消息」（`sendMessageSimilarAria` 外泄为可见文本），正文位显示「[object Object]」，即 `author.headline` 传进来的是对象未做字符串化
- 建议改法：副标题改取 `village.detail.similarSubtitle`，`headline` 渲染前做 `typeof === 'string'` 兜底与字段映射
- 修复类别：单页

### R4-L02-D10　P1 / 需新建　批次 R4-B19
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`85a10ec5a4d6e56f`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1319`
- 理想图依据：帖子.png 最底部吸底输入栏——浅灰胶囊「说点什么...」+ 右端 @ / 笑脸 / 图片三枚图标
- 现象：已滚动到页面末端（bottom 帧底部只剩大片留白与 home indicator），`.detail-input-bar` 整条输入栏在画面上不出现，理想图的发言入口缺失
- 建议改法：把输入栏移出滚动容器并 `position: fixed; bottom: 0; z-index` 高于 `.detail-body`，同时给滚动区补 `padding-bottom` 避让
- 修复类别：单页

## subpackages/village/village/publish（5 条）

### R4-L01-D13　P0 / 素材缺失　批次 R4-B20
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`c36e5e791ceea846`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:838`
- 理想图依据：发布帖子页面.png 添加话题行首为绿色 # 图标、添加位置行首为绿色定位针图标
- 现象：行首图标位直接显示原始素材 URL 文本「…/icons/location.svg」，图标未加载且路径串外露
- 建议改法：修正 ICONS_EMOJI.LOCATION 解析，破图时不回落成裸 URL 文本
- 修复类别：单页

### R4-L01-D14　P1 / 空态文案　批次 R4-B20
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`c36e5e791ceea846`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:789`
- 理想图依据：发布帖子页面.png 正文空态占位「分享一点最近发生的事…」，右下「0/1000」计数
- 现象：正文输入区无占位文案，只显示孤立的「12」和右下角一个「/」，空态残缺
- 建议改法：恢复 placeholder 空态文案并让计数渲染完整「0/上限」
- 修复类别：单页

### R4-L01-D15　P2 / 文案　批次 R4-B20
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`c36e5e791ceea846`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:777`
- 理想图依据：发布帖子页面.png 发布到卡副行为「1.2w 成员」，标题为圈名
- 现象：发布到卡副行显示裸数字「500」且标题仍为「默认公开·所有人可见」，上一轮 R2b-L03-D18 去重未落地（上一轮修得不对）
- 建议改法：subtitle 走 formatMemberShort 出「500 成员」类格式并去除重复可见性文案
- 修复类别：单页

### R4-L01-D16　P0 / 素材缺失　批次 R4-B20
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`4354a89f04705a1b`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:865`
- 理想图依据：发布帖子页面.png 添加位置/谁可以看行首为定位针、眼睛图标
- 现象：行首图标位再次外露原始 URL 文本「…/icons/common/eye.svg」，破图未渲染
- 建议改法：修正 ICONS_EMOJI.EYE 解析路径，破图给占位字形而非裸 URL
- 修复类别：单页

### R4-L01-D17　P2 / 文案　批次 R4-B20
- 帧：`tmp/qa/frames/R4/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`4354a89f04705a1b`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:866`
- 理想图依据：发布帖子页面.png 谁可以看行右侧有值「圈内成员可见」+箭头
- 现象：谁可以看行右侧空白，未渲染 visibilityText 值与箭头，成一行裸标签
- 建议改法：补渲染 visibilityText 右侧值与 chevron，与理想图信息行同构
- 修复类别：单页

