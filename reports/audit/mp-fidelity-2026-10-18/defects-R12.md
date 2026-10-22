# R12 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）

- 缺陷条数=159　涉及页面=67　涉及帧=131　泳道卡=14
- 严重度分布：P2=82　P3=57　P1=17　P0=3
- 轴分布：颜色token=35　文案=30　可达性=23　字号=17　素材缺失=12　需新建=12　间距=7　尺寸比例=6　位置=6　圆角=5　空态文案=4　层级遮挡=2
- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=0
- 批次归属：159 个批次收录，**卡上有而 fixlist 没有的=0**

## /subpackages/circles/circles/index（2 条）

### R12-L03-D10　P2 / 素材缺失　批次 R12-B32
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__index__top.png`（sha16=`362753bbf632cb35`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:505`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 卡片封面同位为实拍摄影素材（摄影圈=持相机摄影师、音乐圈=演唱会现场、运动圈=滑板少年）；§3.10 素材条目「circle-cover-*@3x 差异化封面」
- 现象：帧上摄影圈/音乐圈/运动圈封面为淡彩占位插画（相机静物/茶杯/粉色静物），与理想图同位实拍图不对题；源码 :498-503 已自记：前四圈命中的 covers/circle-cover-*.jpg meanS=0.112–0.142 发白，与美食/阅读/宠物实拍照（meanS=0.34–0.60）两套质感。映射在 config/circle-covers.ts，素材本身缺实拍替换。
- 建议改法：更换 circle-cover-{photography,travel,music,sports} 四张为与理想图同题的实拍素材（或改 config/circle-covers.ts 指向既有实拍图库），不改页面代码。
- 修复类别：单页

### R12-L03-D11　P2 / 颜色token　批次 R12-B32
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__index__bottom.png`（sha16=`6195d6fc9831e903`）
- 源码证据：`apps/client/src/subpackages/circles/circles/index.vue:1026`
- 理想图依据：素材/理想效果图/兴趣圈列表.png 分类行未选中 chips（摄影/旅行/音乐/运动/美食）为页底上明确可见的灰胶囊（源码 :1024 自记理想同位实测 #F5F6F6 vs #FEFEFE，明度差约 10 级）；§3.10「chips 选中 --c-brand」
- 现象：帧上（吸顶头内）未选中 chips 胶囊底 --c-bg-surface #F3FAF6(R243 G250 B246) 压在页面底 #EEF7F2(R238 G247 B242) 上，三通道差仅 5/3/4 级——「摄影/旅行/音乐/运动/美食」只剩文字，胶囊形不可辨，与理想图可见灰胶囊不符。上一轮（R8-L03-D21 口径）把胶囊底按「与卡面 #FFFFFF 拉开一档」校准，但 chip 行实际坐在页面底 #EEF7F2 上，没按页底校准——画面变了但该轴仍未对齐理想图，报「上一轮修得不对」。
- 建议改法：未选中胶囊底取比页底 #EEF7F2 深一档的中性档（如 --c-neutral-100），校准目标从「对卡面」改成「对页底」，使帧上胶囊形可辨。
- 修复类别：CSS/token

## /subpackages/village/village/detail（2 条）

### R12-L03-D04　P0 / 需新建　批次 R12-B71
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__detail__top.png`（sha16=`e020ea6ee93da328`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:1389`
- 理想图依据：素材/理想效果图/帖子.png 全页 7 段：作者行（头像/昵称/学校chip/关注）→ 正文 → 1 大图+3 缩略图 → 位置距离行 → 点赞/评论/分享 → 全部评论（楼中楼）→ 底部输入栏
- 现象：帧上导航栏以下只有未找到卡（骨架圆+两条灰线、「帖子不存在或已被删除」「校园村口，看看大家在聊什么」、返回/返回广场），理想图 7 段内容 0 段渲染。用户拿不到帖子正文、图片、评论区、点赞/分享——页面唯一可用的动作是离开。R11 修的是未找到态自身的文案与热区（已生效），本轮帧证仍未变：捕获态下没有任何一条可被详情页解析的帖子记录（village store 无 currentPost 可载入，恒走 :1389 的 v-else 未找到支）。
- 建议改法：需新建详情数据真相源——后端 GET /api/v1/posts/:id 返回可解析记录，或 mock fixture 提供按 id 可命中的帖子（与 tag-posts/history 页可见的 mock 帖子同源贯通）；页侧已按 §12 合法形态「撤掉承诺」（不伪造内容），缺的是数据不缺页面。
- 修复类别：需新建目标功能

### R12-L03-D05　P3 / 颜色token　批次 R12-B71
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__detail__bottom.png`（sha16=`20f8f1a17c2f158a`）
- 源码证据：`apps/client/src/subpackages/village/village/detail.vue:2934`
- 理想图依据：无基准，依据=组件规范（卡片容器 --c-bg-container 白底须与页面底有色阶差才成卡形，§1.2 卡片 #FFFFFF vs 页面底 #EEF7F2 的成对关系）；detail.vue:2923 自注「卡宽与正文卡同档（--page-padding 侧缩 + --card-radius 圆角 + --c-bg-container 白底）」
- 现象：帧上页面内容区为白底，notfound-card 亦取 --c-bg-container 白底（:2934），白上白 ⇒ 帧上卡片圆角/边界 0px 可辨，标题、副标题、双按钮读作悬浮裸文本，R8-L03-D07 设计的「本页专用卡」在帧上不成形。
- 建议改法：未找到卡底改 --c-bg-surface（或给卡 1rpx --c-border-light 描边），使卡形在白底页面上可辨；不动页面容器底色。
- 修复类别：CSS/token

## /subpackages/village/village/history（2 条）

### R12-L03-D08　P2 / 可达性　批次 R12-B72
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__history__top.png`（sha16=`946f769a599967a4`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:388`
- 理想图依据：无基准，依据=规范文档 §1 组件口径（操作胶囊热区 88rpx=44px；同族先例 detail.vue:3001 记 P2）
- 现象：帧上右上「清空记录」胶囊 padding 8rpx 24rpx + 24rpx 字号（:388/:395），实测高约 50rpx(25px)，低于 88rpx 热区口径；它是本页唯一清空出口（:112 确认弹窗是其后置确认，不是替代入口）。浏览主链路（看记录/点卡片）不受影响，按 R11-L03-D04 先例记 P2。
- 建议改法：.history-clear 补 min-height:88rpx（或扩 hit 区域），与确认弹窗链路不冲突。
- 修复类别：单页

### R12-L03-D09　P3 / 文案　批次 R12-B72
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__history__bottom.png`（sha16=`6256bb3572cea3e3`）
- 源码证据：`apps/client/src/subpackages/village/village/history.vue:251`
- 理想图依据：无基准，依据=同域组件口径：tag-posts 帖子卡互动栏为「图标+数字」档（tag-posts.vue:464-488），本页为「赞 N 藏 N 看 N 评 N」纯文本档
- 现象：帧上每条记录卡底部计数实渲染「赞 0 藏 0 看 88 评 21」四段中文标签文本，同域 tag-posts 页同语义数据用图标+数字（评论泡 1 / 心形 / 分享）——同域两页取档不一（detail 页理想图 帖子.png 同位也是图标+数字档）。
- 建议改法：与同域统一为图标+数字档（复用 tag-posts 的 stateIcons 资产），或最低成本统一两页措辞口径；不新造图标。
- 修复类别：单页

## /subpackages/village/village/post（3 条）

### R12-L03-D01　P1 / 素材缺失　批次 R12-B73
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__post__top.png`（sha16=`bd1316b86617529f`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:1036`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部工具栏首项标签逐字为「图片 / 视频」（图标+双词标签）；规范文档 §3.14 工具栏口径同样含视频
- 现象：帧上底部工具栏 5 项实渲染为「图片 / 话题 / 位置 / 提及 / 更多」，首项标签只有「图片」，@tap 只走 chooseImage（post.vue:1033）——理想图首项「图片 / 视频」中的视频入口整块缺席。
- 建议改法：首项改「图片 / 视频」并补 uni.chooseVideo 分支（媒体类型选择），对齐理想图首项口径；不撤发布能力。
- 修复类别：单页

### R12-L03-D02　P3 / 文案　批次 R12-B73
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__post__top.png`（sha16=`bd1316b86617529f`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:897`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文输入区右下计数逐字为「0/1000」；规范文档 §3.14 亦记「正文输入（0/1000）」
- 现象：帧上正文计数实渲染「0/500」（:897 maxlength 绑 POST_MAX_LENGTH），与理想图「0/1000」数字档不一致，可输入字数被砍半。
- 建议改法：正文上限提到 1000，与理想图/§3.14 口径一致（标题 0/30 维持）。
- 修复类别：单页

### R12-L03-D03　P2 / 颜色token　批次 R12-B73
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__post__bottom.png`（sha16=`d6851ae3e0fd5b2d`）
- 源码证据：`apps/client/src/subpackages/village/village/post.vue:957`
- 理想图依据：素材/理想效果图/发布帖子页面.png 附加行与工具栏的位置图钉均为绿色单色线性图标（§1.1「绿=行动」单色系）
- 现象：帧上「添加位置」行与工具栏「位置」的图钉图标呈彩色 emoji 质感（青蓝帽彩色底，非品牌绿单色），理想图同位是绿色线性图钉；来源是 ICONS_EMOJI.* 位图素材族（:957/:1056 同款），非 §1.1-4 要求的标准 SVG 线性图标。R11 那轮颜色token 修的是发布到卡描边（:1289 已对齐），此图标不在其范围内。
- 建议改法：行内与工具栏位置图标换成绿色单色 SVG 线性图钉（与话题 #、提及 @ 同族单色），去 emoji 彩色素材。
- 修复类别：单页

## /subpackages/village/village/tag-posts（2 条）

### R12-L03-D06　P3 / 文案　批次 R12-B75
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__tag-posts__top.png`（sha16=`ded8681a97918ebc`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:500`
- 理想图依据：无基准，依据=同域词条口径：village.noMorePosts 逐字「— 没有更多了 —」（zh-CN.ts:1905，history 页 :265 在用，全角破折号）；本页走 village.tagPosts.noMore 逐字「-- 没有更多了 --」（zh-CN.ts:2063）
- 现象：帧上列表终止提示实渲染「-- 没有更多了 --」，两端是半角连字符「--」；同域 history 页同一语义提示用全角破折号「— 没有更多了 —」，同域两页取档不一（标点全半角）。R11-B83 的文案轴修的不是这条（该串当前仍是半角）。
- 建议改法：改词条 village.tagPosts.noMore 值为「— 没有更多了 —」，或 :500 直接复用 village.noMorePosts，与 history 同档。
- 修复类别：单页

### R12-L03-D07　P1 / 可达性　批次 R12-B75
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__tag-posts__bottom.png`（sha16=`e183076219d539e5`）
- 源码证据：`apps/client/src/subpackages/village/village/tag-posts.vue:620`
- 理想图依据：无基准，依据=规范文档 §1 组件口径（主操作胶囊热区 88rpx=44px，同族先例 detail.vue:3001 R11-L03-D04）
- 现象：帧上标签头卡右侧主出口「去发布」胶囊 padding 14rpx 28rpx + 24rpx 字号（:620/:627），实测高约 62rpx(31px)，低于 88rpx(44px) 热区口径；且它是本页唯一的发布出口（空态入口仅在列表为空时渲染，:392-408），想从标签页发帖的用户拿不到一个可达标的主操作热区。
- 建议改法：.tag-hero__btn 补 min-height:88rpx + 纵向 padding 归零 flex 居中（detail.vue:3001 同款修法），文字基线不塌。
- 修复类别：单页

## pages/discover/index（2 条）

### R12-L01-D08　P2 / 层级遮挡　批次 R12-B08
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__discover__index__top.png`（sha16=`8664e989c31b8a03`）
- 源码证据：`apps/client/src/components/match/MatchCard.vue:343`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 卡片底部——简介两行居左、92% 匹配度环居右，两者不争位；帧上简介第一行顶进环体
- 现象：帧实测（378px 帧宽）简介第一行白色字形延伸到 x≈271px（≈538rpx），与右下匹配度环左缘（x≈271）相接，"晚自习后(散)步。"的「散」字被环体压住不可见、次行只剩「步。」；上一轮 R11-L01-D16 声称用 max-width:60%（:343）把文字列收到 412rpx 避让环——按 60% 文字应在 x≈221px 处换行，帧上没生效，上一轮修得不对（deep 选择器未命中或被内层宽度顶开）
- 建议改法：把宽度约束改挂到必然命中的内层元素（如 .match-info 简介块自身类，或 .match-card__info 加 padding-right:200rpx），并在简介末行与环之间留 ≥24rpx 间隙；修后简介任意字符不得落在环外接矩形内
- 修复类别：单页

### R12-L01-D09　P1 / 文案　批次 R12-B09
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__discover__index__bottom.png`（sha16=`8664e989c31b8a03`）
- 源码证据：`apps/client/src/components/match/MatchInfo.vue:58`
- 理想图依据：素材/理想效果图/寻觅匹配卡片页面.png 姓名区三段式「星野 25 ♀」+「北京大学 · 设计学院」；帧上无年龄、无性别标识，且校名出现两次
- 现象：帧上姓名行只有「演示·中山大学」（card.name 原样含校名，view-models/match.ts:30 直传），下方校名行再渲染「中山大学 · 大三」——校名重复展示；user.age / user.gender 为空被 :58-59 的 v-if 跳过，理想图的年龄、性别标识整段缺席。后端推荐卡缺 age/gender 真值列（或该字段未下发、种子 persona 未填），前端模板已按理想图三段式就位但拿不到字段。用户拿不到什么：匹配决策所需的年龄/性别信息在卡片上拿不到
- 建议改法：后端/种子补 persona 的 age、gender 真值并随推荐卡下发（toMatchCardUser 已透传 ：31/:35）；name 撤掉校名拼接（校名只保留在 :66 校名行）；前端不改模板
- 修复类别：需新建目标功能

## pages/home/index（4 条）

### R12-L01-D10　P2 / 文案　批次 R12-B05
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__home__index__bottom.png`（sha16=`04ba11e316cee4a6`）
- 源码证据：`apps/client/src/components/home/InterestRecommendation.vue:110`
- 理想图依据：素材/理想效果图/首页.png 兴趣推荐——「摄影圈 1.2w 人加入 / 旅行圈 8,932 人加入 / 美食圈 9,210 人加入」（w 档或逗号千分位两档）
- 现象：帧上同一排三张兴趣卡人数三种格式：「1.2w 人加入 / 8,932 人加入 / 8.124 人加入」——第三张是点号形态，中文语境读作"8.124 人"（假小数）。formatMemberCount（:12-17）只处理 number（≥1w 转 w、≥1000 toLocaleString 千分位），「8.124」说明后端 member_count 到达前端时已是格式化字符串/非数值，函数原样透传
- 建议改法：后端将 member_count 以数值型下发（现接口若回格式化字符串，需补数值字段或约定纯数字格式）；前端 formatMemberCount 入参先做非数值归一兜底（剥千分位符再 Number），非法值落「—」不编造
- 修复类别：需新建目标功能

### R12-L01-D11　P2 / 尺寸比例　批次 R12-B07
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__home__index__bottom.png`（sha16=`04ba11e316cee4a6`）
- 源码证据：`apps/client/src/components/layout/TabBar.vue:165`
- 理想图依据：素材/理想效果图/首页.png 与 寻觅匹配卡片页面.png 底栏——中央「寻觅」项为凸出栏体上沿的圆形品牌绿主按钮（白心），高于两侧四项
- 现象：帧上底栏中央项与其余四项同尺寸平铺（:165 自述"无任何凸起底盘"，R2b 按"理想图=五项等大平铺"的判读取消了 128rpx 凸起圆盘）；本轮两张理想图底栏中央均明确画了凸起绿圆主按钮，该判读与理想图素材不符，主行动入口的视觉层级缺失
- 建议改法：中央项恢复纯 CSS 凸起形态（品牌绿圆底 + 白心图标，直径 96–128rpx、上浮 -24~-40rpx），沿用现有 --c-brand 渐变令牌，不复活已移除的 match-heart.png 浮岛素材
- 修复类别：单页

### R12-L01-D12　P3 / 文案　批次 R12-B07
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__home__index__bottom.png`（sha16=`04ba11e316cee4a6`）
- 源码证据：`apps/client/src/components/layout/TabBar.vue:51`
- 理想图依据：素材/理想效果图/首页.png 与 寻觅匹配卡片页面.png 底栏中央项标签均为「寻觅」
- 现象：中央项标签硬编码「匹配」（:51 注释称"对齐理想图「匹配」"，与理想图素材不符），且与页内标题「寻觅♥」（discover/index.vue:256）同一功能两种叫法
- 建议改法：中央项标签回归 tabs.discover 的「寻觅」（删除 ：51 的三元硬编码），全站单一叫法
- 修复类别：单页

### R12-L01-D13　P2 / 文案　批次 R12-B06
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__home__index__bottom.png`（sha16=`04ba11e316cee4a6`）
- 源码证据：`apps/client/src/components/home/NearbyPeople.vue:89`
- 理想图依据：素材/理想效果图/首页.png 附近的人——头像下为人昵称（小满/阿辰/草莓奶昔/星辰）+ 距离
- 现象：帧上前三个头像下标签是校名「浙江大学 / 武汉大学 / 南开大学」，后两个才是昵称（远山/阿辰）——同一行人称混杂。R6-L02-D03 只剥了「演示·」前缀（:14-22 明写根因在 seed 数据、回填真实昵称归后端车道），种子/后端 persona 的 name 字段至今仍是校名真值缺失，前端宁缺不造没写。用户拿到的是"学校附近的人"而非"人"
- 建议改法：seed/后端为这批 persona 回填昵称到 name（或下发 nickname 字段、前端渲染 nickname || name），校名移到独立小标；前端已按可用字段渲染，不改兜底口径
- 修复类别：需新建目标功能

## pages/login/index（3 条）

### R12-L01-D01　P2 / 颜色token　批次 R12-B19
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__login__index__top.png`（sha16=`8d20c6643ec22203`）
- 源码证据：`apps/client/src/pages/login/index.vue:1439`
- 理想图依据：素材/理想效果图/登录页面.png 底部协议行「登录即同意…」——理想图勾选位为品牌绿描边圆（✓ 形制清晰可辨）；帧上空态勾选框描边与页底几乎同色
- 现象：协议勾选框空态描边取 --c-neutral-300（真值 #C2CAC6，design-variables.scss:93），压页面底 --c-bg-page #EEF7F2 实算 1.53:1（< WCAG 1.4.11 非文本 3:1），34rpx 小圆的边界在帧上近乎隐形，只能靠行文案猜位置
- 建议改法：空态描边提到压 #EEF7F2 ≥3:1 的既有档（如 --c-text-tertiary #6B7571 = 4.36:1 或 --c-text-secondary #4A524E），选中态绿底不变
- 修复类别：CSS/token

### R12-L01-D02　P2 / 可达性　批次 R12-B19
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__login__index__top.png`（sha16=`8d20c6643ec22203`）
- 源码证据：`apps/client/src/pages/login/index.vue:964`
- 理想图依据：素材/理想效果图/登录页面.png 头部「寻觅」下副标题「遇见同频的人」——理想图为清晰可读的灰字
- 现象：.logo-subtitle 取 --c-text-tertiary（真值 #6B7571），压页底 #EEF7F2 实算 4.36:1；28rpx（14px）正文级文字需 4.5:1，落在 3:1–4.5:1 档，帧上副标题明显发虚
- 建议改法：归档到 --c-text-secondary（#4A524E，压 #EEF7F2 = 7.38:1），与 :1469 协议行 R10 已落的口径一致
- 修复类别：CSS/token

### R12-L01-D03　P3 / 文案　批次 R12-B19
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__login__index__bottom.png`（sha16=`ee7e70dc0ec49d8c`）
- 源码证据：`apps/client/src/pages/login/index.vue:643`
- 理想图依据：素材/理想效果图/登录页面.png 按钮区第二档为「手机号登录」（本文件 :71 自述理想按钮区三档文案时也写「手机号登录」）
- 现象：帧上次按钮文案为「手机号快捷登录」，与理想图「手机号登录」不一致（同页 i18n 兜底入口 :657 仍叫「手机号登录」，同屏两个手机号入口两种叫法）
- 建议改法：主档文案对齐理想图「手机号登录」，快捷能力用副文案或 aria-label 表达，同屏两处统一叫法
- 修复类别：单页

## pages/messages/index（2 条）

### R12-L02-D04　P3 / 文案　批次 R12-B20
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__messages__index__top.png`（sha16=`951c1e5f9bc87c2a`）
- 源码证据：`apps/client/src/pages/messages/index.vue:485`
- 理想图依据：素材/理想效果图/消息.png 页头左摘要卡（「有人喜欢你」标题下副标为「3 个人想认识你」）
- 现象：「有人喜欢你」摘要卡副标帧上为「1 人喜欢了你」（:485 绑 i18n zh-CN.ts:2804 likedMeCount = "{n} 人喜欢了你"），理想图同位为「3 个人想认识你」——句式不同，且副标与卡标题「有人喜欢你」语义重复，丢了理想图「想认识你」的转化表述（数字 1 vs 3 是真实数据差异，不计缺陷）。卡片位置/结构是 R11-B23 位置轴已修项，本条只报文案轴。
- 建议改法：把 zh-CN.ts:2804 改为「{n} 个人想认识你」句式，与理想图及卡标题形成信息递进。
- 修复类别：单页

### R12-L02-D05　P2 / 位置　批次 R12-B20
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__messages__index__bottom.png`（sha16=`7a61b0009da2a572`）
- 源码证据：`apps/client/src/pages/messages/index.vue:92`
- 理想图依据：素材/理想效果图/消息.png 整页信息架构（「有人喜欢你」只出现在页头摘要卡；页内无「活动推荐」混排社交事件）
- 现象：「活动推荐」组第 3 张卡是社交事件「有人喜欢你 / 1 人喜欢了你 / 查看详情 ›」，与「周末篮球友谊赛」「骑行踏春活动」两张真活动卡并列——社交通知被装进活动分组。数据侧 dashboard.assistant 数组未区分活动与社交事件（缺事件类型字段，前端 :90-98 只按 title 非空过滤即整包渲染，:92 .filter((a) => a && a.title)）。用户看到的是把「被人喜欢」当「活动」点「查看详情」，分组语义错位但主链路可用，故 P2。
- 建议改法：后端给 assistant 条目补事件类型字段（或拆活动/社交两条数组），前端按类型把社交事件滤出「活动推荐」；在后端字段落地前不得用前端常量猜类型。
- 修复类别：需新建目标功能

## pages/nearby/index（3 条）

### R12-L02-D01　P1 / 素材缺失　批次 R12-B21
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__nearby__index__top.png`（sha16=`4dadb333894e631c`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:768`
- 理想图依据：素材/理想效果图/附近的首页.png 中部「热门兴趣圈」横滑封面卡区（摄影/旅行/音乐/运动 四张封面卡，含「1.2w 人加入」计数与「全部 ›」）
- 现象：帧上分区①「附近的人」人卡横滑（示范-中山大学/武汉大学/南开大学）与页底「校园圈 全部›」标题之间没有任何内容——理想图此位置的「热门兴趣圈」整段缺席，连代码为游客态准备的「登录后看」空态引导分支（:768 v-else-if="hotCircles.length === 0 && protectedBlocked"）也没有在帧上出现，三态（:765 骨架 / :768 登录引导 / :783 空态文案）一个都没渲染出来。用户（游客/未登录侧）拿不到：附近页的热门兴趣圈发现区及其「N 人加入」入口，只剩页顶小图标可跳圈子列表。上一轮 R11-B24 动的是颜色token/需新建两轴（发动态药丸与人卡横滑），非本轴，不构成重报。
- 建议改法：排查游客态下分区②（:759-790）为何整段零渲染（外层条件短路或高度塌陷），保证至少渲染「登录后看」引导行或公开圈子横滑之一。
- 修复类别：单页

### R12-L02-D02　P3 / 素材缺失　批次 R12-B21
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__nearby__index__top.png`（sha16=`4dadb333894e631c`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:635`
- 理想图依据：素材/理想效果图/附近的首页.png 顶部五宫格（「兴趣圈」= 绿色盾形对勾、「活动」= 橙色礼盒）
- 现象：五宫格中「兴趣圈」帧上为青色双人像图标（:621 绑 NEARBY_ICONS.CIRCLE），「活动」帧上为橙色日历图标（:635 绑 NEARBY_ICONS.ACTIVITY）；理想图同位是盾形对勾与礼盒——日历图形与「活动」语义错位（日历更像「日程」）。色板统一的浅底方 tile（:1713-1717 --c-bg-surface）与理想图一致，不在此列。
- 建议改法：更换 NEARBY_ICONS.CIRCLE / NEARBY_ICONS.ACTIVITY 两枚素材为盾形勾/礼盒档（或新增语义正确素材），不动布局。
- 修复类别：单页

### R12-L02-D03　P3 / 尺寸比例　批次 R12-B21
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__nearby__index__bottom.png`（sha16=`90494b92085b6c59`）
- 源码证据：`apps/client/src/pages/nearby/index.vue:1421`
- 理想图依据：素材/理想效果图/附近的首页.png「校园圈」区（单卡约一屏 3.5 张宽、卡图约占卡高六成，卡内还有计数十全宽胶囊按钮一行）
- 现象：帧上校园圈四张卡一屏完整放下（单卡实测约 163rpx 宽、卡间距 16rpx），封面高度仅 132rpx（:1421 .campus-entry__cover-img height），理想图单卡约 250rpx 宽、卡图约 260rpx 高、一屏约露 3.5 张（第 4 张被右缘裁切）——卡被压小后放不下理想图的卡图比例与底部按钮行空间（「N 位同学」计数仍按 §12 等后端真值，不在本条建议范围）。卡底/标题/状态胶囊配色是 R8-L02-D06 已修项，不重报。
- 建议改法：单卡宽度提到约 248rpx（一屏 3.5 张）并同步封面高至约 260rpx，恢复理想图的卡内纵向三段结构。
- 修复类别：单页

## pages/profile/index（2 条）

### R12-L02-D06　P3 / 颜色token　批次 R12-B13
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__profile__index__top.png`（sha16=`a8311bc438e6c4a1`）
- 源码证据：`apps/client/src/components/profile/NotLoggedProfile.vue:279`
- 理想图依据：素材/理想效果图/未登录个人主页.png 顶栏（右上两枚为无底座裸图标；全站色板 §1.2 无半透明白档）
- 现象：帧上顶栏 ▦ 与设置两枚图标各套一枚白色圆形底座，底色为色板外硬编码字面量 rgba(255, 255, 255, 0.7)（:279）；理想图未登录主页右上是无底座的裸图标（:286-304 注释只修过图标墨色，底座未动）。「去完善」深绿胶囊是 R10-L02-D09 已裁决对比度修复，不重报。
- 建议改法：按理想图去掉圆形底座（或把底色令牌化为 --c-bg-container 并与理想图核对形态），消除色板外字面量。
- 修复类别：单页

### R12-L02-D07　P2 / 颜色token　批次 R12-B12
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__profile__index__bottom.png`（sha16=`b9bdf4c8762c8e75`）
- 源码证据：`apps/client/src/components/profile/mine/MyMore.vue:60`
- 理想图依据：素材/理想效果图/未登录个人主页.png + 已经填完资料的个人主页.png「更多功能」区（两图均为无底座深色描边线性图标：星形收藏/放大镜找人/相册/齿轮）
- 现象：「更多功能」四枚图标帧上为彩色浅底 chip——收藏 #FFB020、访客 #4D8DFF、相册 #FF6B81、隐私 #A29BFE（:22-25），chip 底 = 同色 +22 透明度字面量（:60 background: ${iconTint(item.key)}22）；两张理想图该区都是无彩色底座的深色描边图标，且图形语义也不同（帧上书签/眼睛/盾牌 vs 理想图星形/放大镜/齿轮）。上一轮 R11-B12 动的正是本文件颜色token，改后帧上仍是彩底 chip——同轴报「上一轮修得不对」。
- 建议改法：去掉 chip 彩底，四枚图标统一为深色描边档（--c-text-primary 系）并按理想图换星形/放大镜/相册/齿轮素材。
- 修复类别：单页

## pages/register/index（2 条）

### R12-L01-D04　P3 / 字号　批次 R12-B22
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__register__index__top.png`（sha16=`79c7290ee1493efa`）
- 源码证据：`apps/client/src/pages/register/index.vue:924`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级（辅助 14/15px=28/30rpx、小字 13/12px=26/24rpx，无 25rpx 档）
- 现象：头图副标题「用手机号注册，开始遇见同频的人」写死 font-size:25rpx，是 24/26 之间的档外孤值（同页 :1358 R11 刚把 21rpx 孤值归档，同型问题残留）
- 建议改法：归档到 --fs-md（24rpx）或 --fs-base（26rpx）档位令牌，不用裸 25rpx
- 修复类别：CSS/token

### R12-L01-D05　P1 / 颜色token　批次 R12-B22
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__register__index__bottom.png`（sha16=`8f9d633e930b1dbe`）
- 源码证据：`apps/client/src/pages/register/index.vue:1364`
- 理想图依据：无基准，依据=规范文档 §1.2（#9AA39F 是 placeholder 专用档，禁作正文/法务字色；同域登录页协议行 R10 已落 --c-text-secondary 7.38:1 档）
- 现象：注册按钮下法务行「注册即代表你已满 18 周岁；信息仅用于校园身份核验，严格保密」取 --c-text-placeholder（真值 #9AA39F），压页底 #EEF7F2 实算 2.37:1（文件 :1361 自注同数、R11-D08 明写"未动"）；帧上该行淡到与背景几乎融合。用户拿不到什么：成年声明与数据用途/保密承诺这条法定告知在低视力与户外强光下读不出
- 建议改法：字色提到 --c-text-secondary（#4A524E，压 #EEF7F2 = 7.38:1），与登录页协议行同档
- 修复类别：CSS/token

## pages/register/success（2 条）

### R12-L01-D06　P2 / 字号　批次 R12-B23
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__register__success__top.png`（sha16=`384e1513222c716b`）
- 源码证据：`apps/client/src/pages/register/success.vue:131`
- 理想图依据：无基准，依据=规范文档 §1.3 字体层级（页面主标题 26–28px = 52–56rpx；44rpx 属 --fs-5xl 22px 卡片大标题档）
- 现象：页面主标题「注册成功」font-size:44rpx（22px），比规范页面主标题档（52–56rpx）低一整档，帧上标题与下方 26rpx 副标题的层级差只有字重差
- 建议改法：主标题提到 52–56rpx 档（52rpx，与 register/index.vue:919 的 .hero__title 同档），行高 1.2 不变
- 修复类别：CSS/token

### R12-L01-D07　P2 / 可达性　批次 R12-B23
- 帧：`tmp/qa/frames/R12/real-f0677920/pages__register__success__bottom.png`（sha16=`384e1513222c716b`）
- 源码证据：`apps/client/src/pages/register/success.vue:249`
- 理想图依据：无基准，依据=规范文档 §1.2/§1.3（26rpx=13px 说明文字需 ≥4.5:1，#6B7571 在浅绿页底达不到）
- 现象：「稍后再说，先随便逛逛」（不进 12 步向导的唯一出口，R11-D11 修的是热区、未动字色）与副标题两行（:147 同 token）都取 --c-text-tertiary #6B7571 压页底 #EEF7F2 = 4.36:1（帧实测字色 RGB(107,117,113)、页底 RGB(238,247,242)），26rpx 字 <4.5:1，落在 3:1–4.5:1 档。用户拿到的是一条发虚的退出路径文字
- 建议改法：两处归档到 --c-text-secondary（#4A524E = 7.38:1）；若要保留弱化观感可用 600 字重补层级
- 修复类别：CSS/token

## subpackages/campus/campus/certification（2 条）

### R12-L05-D12　P2 / 圆角　批次 R12-B24
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__certification__top.png`（sha16=`42f9061c0049de81`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:670`
- 理想图依据：无基准，依据=同规范文档 §1.4：卡片圆角标准档 --card-radius 40rpx（design-variables.scss:699「20px @2x 设计基准」）；同域 campus/index 卡走 .card-base 40rpx 档
- 现象：认证页全部主卡片（.info-card「为什么要认证/学校名称/专业/学生证照片」等）用 var(--r-xl)=24rpx（12px），比卡片标准档 40rpx（20px）小一档——帧上认证卡圆角明显小于同域 campus/index 卡（同域两页取档不一）。
- 建议改法：.info-card（及 ：641/:713 等同族卡片规则）统一改 var(--card-radius)。
- 修复类别：CSS/token

### R12-L05-D13　P2 / 颜色token　批次 R12-B24
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__certification__bottom.png`（sha16=`1afd4edceb1573e2`）
- 源码证据：`apps/client/src/subpackages/campus/campus/certification.vue:905`
- 理想图依据：无基准，依据=同规范文档 §1.2 令牌表（--c-text-tertiary 仅限弱说明）；WCAG 小字正文 ≥4.5:1
- 现象：提交按钮下方隐私承诺文案「你的信息仅用于学生身份认证，我们承诺保护你的隐私安全」用 --c-text-tertiary #6B7571（:903-906）压页面底 #EEF7F2，复算对比 ≈4.4:1 <4.5:1（fs-sm 12px 小字，不适用大字豁免），落在 3:1–4.5:1 区间。
- 建议改法：.privacy-tip__text 改 var(--c-text-secondary) #4A524E（复算 ≈7.4:1）。
- 修复类别：CSS/token

## subpackages/campus/campus/hub（1 条）

### R12-L04-D10　P3 / 位置　批次 R12-B25
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__hub__top.png`（sha16=`f70f099d3f95b3ea`）
- 源码证据：`apps/client/src/subpackages/campus/campus/hub.vue:133`
- 理想图依据：素材/理想效果图/校园圈.png 分段控件（激活段 = 第 1 段「我加入的」，绿色下划线在第 1 段下方）
- 现象：帧上分段控件激活段是第 2 段「推荐圈子」（深绿字+绿下划线），理想图激活段是第 1 段「我加入的」——激活态默认位与理想图取档不一（hub.vue:133 默认值 "recommend"，2026-08-27 有在册决策理由，但仍属与理想图可测的位置偏差，判 P3）。
- 建议改法：保持默认落点也可对齐理想图观感：在「我加入的」为空时于该段下渲染空态引导而非整体右移默认段；或产品侧确认后把理想图差异登记为已接受偏差。
- 修复类别：单页

## subpackages/campus/campus/index（4 条）

### R12-L05-D01　P2 / 素材缺失　批次 R12-B26
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`7987b5551acf86de`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:299`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §1.5 组件规范（SafeImage）+ 本文件：381-390 已知机制 §1 自证
- 现象：认证引导卡左侧 64×64rpx 学校图标位为空——尺寸走 custom-class 跨不过 data-v 边界（本文件：385-387 已用同机制自证过 avatar 同款 bug），帧上横幅左侧看不到任何图标。
- 建议改法：比照 ：391-396 头像的修法，把 cert-guide-card__icon 类从 custom-class 挪到 SafeImage 组件标签（宿主节点）上。
- 修复类别：单页

### R12-L05-D02　P3 / 间距　批次 R12-B26
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__index__top.png`（sha16=`7987b5551acf86de`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:302`
- 理想图依据：无基准，依据=同规范文档 §1.4 间距规范（正文整句可读、不成孤字）
- 现象：引导卡说明文「上传学生证即可认证，与同校同学畅聊校园话题」在帧上折成两行，第二行只剩孤字「题」（右侧 去认证 按钮挤占文本宽所致）。
- 建议改法：缩短 certGuideDesc 文案（zh-CN.ts:3542）或给 .cert-guide-card__body 增加 padding-right/最小宽度，消除单字孤行。
- 修复类别：单页

### R12-L05-D03　P2 / 可达性　批次 R12-B26
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`713af16a45fe5b27`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:330`
- 理想图依据：无基准，依据=页面自身认证门语义（横幅文案「完成学生认证，解锁校园专区」）+ 规范文档 §1.2（未认证=兴趣紫档的门槛态）
- 现象：帧上「未认证」徽标与认证引导横幅（isVerified=false，:298 v-if 命中）同屏出现校园话题流与分类 chips——:330 的 v-if="isVerified || viewSchool" 使 viewSchool 直达时未认证用户可浏览北京大学全部话题，认证门未拦，横幅「认证后解锁」承诺落空。
- 建议改法：收紧 ：330 条件（viewSchool 分支仅放公开档或对未认证用户折叠正文只留标题），或改横幅文案承认「可浏览、认证后可发言」——不许反向放宽任何门。
- 修复类别：单页

### R12-L05-D04　P2 / 颜色token　批次 R12-B26
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__index__bottom.png`（sha16=`713af16a45fe5b27`）
- 源码证据：`apps/client/src/subpackages/campus/campus/index.vue:849`
- 理想图依据：无基准，依据=同规范文档 §1.2 配色表：--c-romance-500 用途=喜欢/匹配/品牌点缀；作者名应走 --c-text-secondary #4A524E 档
- 现象：帖卡作者名「远山」用 $pink-primary（=var(--c-romance-500) #FF6B81，:436 定义）渲染，白卡上复算对比 ≈2.7:1（<4.5:1，24rpx 小字号），且 romance 色被用于无语义装饰。
- 建议改法：.topic-card__author 改 var(--c-text-secondary)（≈7.4:1），romance 色留给喜欢/匹配语义。
- 修复类别：CSS/token

## subpackages/campus/campus/post-topic（5 条）

### R12-L05-D05　P3 / 间距　批次 R12-B27
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`67dc12e7bcdd27aa`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:466`
- 理想图依据：无基准，依据=代码内既有结论 :768-770（「整句仍是单行，不引入新的折行/增高」）——上一轮（R9-L05-D06）修得不对：帧上实测两行
- 现象：认证横幅整句「校园话题仅限本校已认证同学发布，请先完成校园认证」在帧上折成两行且第二行只剩孤字「证」，与 ：768-770 注释声称的单行结论相悖。
- 建议改法：缩短 certRequired 文案或压缩 .cert-banner__btn 水平 padding（:778 24rpx→16rpx）还宽于文本，保证单行。
- 修复类别：单页

### R12-L05-D06　P3 / 可达性　批次 R12-B27
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__post-topic__top.png`（sha16=`67dc12e7bcdd27aa`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:506`
- 理想图依据：无基准，依据=同规范文档 §1.2 令牌表：占位应走 --c-text-placeholder #9AA39F 档，与已填文本可辨
- 现象：标题输入框无 placeholder-style/placeholder-class，占位「输入一个吸引人的标题」继承 .title-input 的 font-weight:600 与深色（:884-890），帧上与真实已填文本不可区分，新用户会误以为已预填内容（同页内容 textarea 占位为正常浅灰，两输入档不一）。
- 建议改法：给 input 补 placeholder-style="color:var(--c-text-placeholder);font-weight:400"。
- 修复类别：单页

### R12-L05-D07　P1 / 需新建　批次 R12-B17
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`53d7cac723c20a9b`）
- 源码证据：`apps/client/src/components/village/TopicSelector.vue:257`
- 理想图依据：无基准，依据=§12 硬规矩（常量式不是真值；帧上「#校园日常 1280」等 12 枚热度为展示性数据）
- 现象：热门话题 12 枚热度数字（1280/1024/856/712/634/521/…）来自前端常量 apps/client/src/config/popular-topics.ts:43-48 的写死 usageCount，TopicSelector.vue:257 直接渲染——后端无话题热度真相源，用户拿到的是编造热度数字（假计数承诺），无法据此判断真实使用量。
- 建议改法：需新建目标功能：话题表补 usage_count 统计列 + 热度查询接口，TopicSelector 改接 GET 真实字段；接口落地前先撤掉数字只留话题名（不许换一组新常量接着编）。
- 修复类别：需新建目标功能

### R12-L05-D08　P3 / 文案　批次 R12-B17
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`53d7cac723c20a9b`）
- 源码证据：`apps/client/src/components/village/TopicSelector.vue:200`
- 理想图依据：无基准，依据=组件规范（TopicSelector 已选区标题与计数是两个信息位，不应重复用词）
- 现象：帧上已选话题区标题「已选话题」（TopicSelector.vue:197）与同行计数「已选 0/3」（:200，i18n selectedCount="已选 {n}/{max}" zh-CN.ts:3076）重复出现「已选」二字。
- 建议改法：计数位改纯「0/3」（或删去标题只留计数），一处措辞即可。
- 修复类别：单页

### R12-L05-D09　P1 / 需新建　批次 R12-B27
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__post-topic__bottom.png`（sha16=`53d7cac723c20a9b`）
- 源码证据：`apps/client/src/subpackages/campus/campus/post-topic.vue:174`
- 理想图依据：无基准，依据=§12 硬规矩（缺后端真相源只能接真字段或撤掉承诺；本帧为 real 捕获却仍展示承诺文案）
- 现象：帧上匿名发布开关仍展示承诺文案「开启后，你的信息将显示为"匿名校友"」，但后端发帖契约无 isAnonymous（:167-174 注释自证 real 下硬编码 false，anonymousBlocked 仅在非 mock 生效）——用户打开开关后拿不到承诺的匿名发帖，帖子照常实名落库。
- 建议改法：需新建目标功能：话题表补 is_anonymous 列并全链路落库/回显；落地前 real 档按 ：575-576 的文案替换逻辑彻底撤掉承诺（本帧证明该替换未在捕获档生效，需复核 isMockMode 判定）。
- 修复类别：需新建目标功能

## subpackages/campus/campus/topic-detail（2 条）

### R12-L05-D10　P0 / 需新建　批次 R12-B28
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__topic-detail__top.png`（sha16=`0f1ccc6a8977fe61`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:327`
- 理想图依据：无基准，依据=页面自身语义（列表页 topic-card 可点入详情，index.vue:372 @tap="goToTopicDetail(topic.id)"）；R11-B31 修复后的空态帧即本帧
- 现象：列表页明明展示帖子「高数期中复习资料分享」，点进详情后整页只有「话题不存在或已被删除」空态（currentTopic 为空走 ：324-328 分支）——正文、作者、评论区整块缺席，用户拿不到任何帖子内容；列表说有、详情说无，属于张冠李戴级数据断裂（real 捕获中列表与详情数据链路不通）。
- 建议改法：需新建目标功能：real 后端 GET /campus/topics/{id} 须能返回列表同源的话题行（排查学校可见性过滤把列表可见的帖在详情侧滤空/种子数据缺失），前端链路 fetchCampusTopicDetail 本身无改动空间。
- 修复类别：需新建目标功能

### R12-L05-D11　P2 / 文案　批次 R12-B28
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__topic-detail__bottom.png`（sha16=`25fb5f9d51fdb963`）
- 源码证据：`apps/client/src/subpackages/campus/campus/topic-detail.vue:324`
- 理想图依据：无基准，依据=代码内既有结论 :310（「错误态与『话题不存在』区分，提供重试」）——归因粒度不足
- 现象：帧上详情把非存在性结果一律折叠为「话题不存在或已被删除」，且该态唯一出口是「返回」（无重试）——结合 D10（列表内帖子被判不存在），瞬态失败/权限失败也会被误报成「不存在」并引导用户直接离开，:310 注释声称的区分在本帧未兑现。
- 建议改法：store 侧区分 404 与其他失败：仅真 404 走 ：324 分支，其余走 ：311-321 的带「重试」错误态。
- 修复类别：单页

## subpackages/chat/chat-session/index（2 条）

### R12-L11-D08　P3 / 素材缺失　批次 R12-B01
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__chat__chat-session__index__top.png`（sha16=`ddb5cda0555919e2`）
- 源码证据：`apps/client/src/components/common/EmptyState.vue:68`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:68（type="network" 预设图映射 ICONS_COMMON.CLOSE）+ 规范文档§1.5（StatusState/ErrorState 为状态组件）
- 现象：错误态插画（index.vue:2090 `<EmptyState type="network">`）渲染的是 CLOSE 关闭叉图形——帧上 y≈388-460 是一枚大号灰 ✕，「出错/缺会话」的示意素材缺位，拿"关闭"图标顶替，用户第一读感是"可关闭"而不是"出错了"；与同组件 no-data 的立方体、no-chat 等预设不成语义体系。
- 建议改法：EmptyState 的 network 预设换错误示意 SVG（icons/common 内既有 error/no-data 族），或本页改传自定义 image，不动布局。
- 修复类别：单页

### R12-L11-D09　P3 / 文案　批次 R12-B29
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__chat__chat-session__index__bottom.png`（sha16=`75e4ce59c7b50d20`）
- 源码证据：`apps/client/src/subpackages/chat/chat-session/index.vue:798`
- 理想图依据：无基准，依据=规范文档§1.1（用户可读性）+ §3.7 页面定位（面向普通用户的会话页）
- 现象：帧上错误主句「缺少会话标识，请从聊天列表或匹配结果进入。」把后端术语"会话标识"（sessionId）直出给用户——用户无从知道"会话标识"是什么、也无从判断自己哪步丢了它；同期同页错误族文案（friendlyPageError）已是"会话不存在/已失效"口径，两句并存口径不一。
- 建议改法：chat.missingSessionId 文案改为用户语言（如「会话不存在或已失效，从聊天列表重新进入吧」），复用既有 locale 键不改键名。
- 修复类别：单页

## subpackages/chat/official-chat/index（3 条）

### R12-L11-D10　P1 / 可达性　批次 R12-B30
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`6b86e5cfdd25b063`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:670`
- 理想图依据：无基准，依据=规范文档§1.2（非文本 UI 组件对相邻底 ≥3:1）+ 同仓组件规范 components/layout/ChatHeader.vue:103-107（返回钮既有配方）
- 现象：本页自定义导航的返回箭头 .nav-back-icon 写死 color: #36C99A 压页面底 #EEF7F2，帧实测箭头区域最暗墨 #4DCFA5（brand-500 族），对比仅 1.93:1，低于非文本 3:1 地板——这是本页唯一显式返回出口（无系统导航栏），用户拿不到看得见的返回；同型场景 chat-session 错误态页头已改 --c-brand-800 并在 index.vue:2650-2652 注释明说"不复制低对比读数"，本页没跟，同域取档不一。
- 建议改法：.nav-back-icon 颜色归口 var(--c-brand-800, #156B51)（对 #EEF7F2 约 5.2:1），line-height/margin 配方不动。
- 修复类别：CSS/token

### R12-L11-D11　P3 / 颜色token　批次 R12-B30
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__chat__official-chat__index__top.png`（sha16=`6b86e5cfdd25b063`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:691`
- 理想图依据：无基准，依据=规范文档§1.1-3 一令牌一值（页面只引用 var(--c-*)，禁止私有色值）+ §1.2 主文本令牌 #1A1E1C
- 现象：导航主标题「寻觅助手」.nav-title 写死 color: #222（帧实测最暗墨 #1F1F1F），既不是 --c-text-primary #1A1E1C 也不是任何令牌档；同页气泡正文/活动卡标题（:923/:957）也是 #333/#222 私有色——本页是全站私有色值重灾区（#999/#666/#888/#E94D87/#FF9F43/#e8e8e8 及两组渐变字面量），帧上可见的导航标题是其中最显眼的一处。
- 建议改法：.nav-title 归口 var(--c-text-primary, #1A1E1C)，其余私有色随同文件令牌化批次一并清（本卡只锚导航标题这一帧上可见处）。
- 修复类别：CSS/token

### R12-L11-D12　P3 / 颜色token　批次 R12-B30
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__chat__official-chat__index__bottom.png`（sha16=`6b86e5cfdd25b063`）
- 源码证据：`apps/client/src/subpackages/chat/official-chat/index.vue:1103`
- 理想图依据：无基准，依据=规范文档§1.2（占位符令牌 --c-text-placeholder #9AA39F；§1.1-3 一令牌一值）
- 现象：底部输入栏占位符「对我说点什么吧～」.input-placeholder 写死 color: #bbb，输入文字本体（:1100）写死 #333——双双私有色值；帧实测占位符最暗墨 ≈#909090，与令牌 #9AA39F 不同值（也说明 placeholder-class 未必按 #bbb 生效），占位符取色脱离全站档。
- 建议改法：.input-placeholder 归口 var(--c-text-placeholder, #9AA39F)、输入文字归口 var(--c-text-primary)，两处一并令牌化。
- 修复类别：CSS/token

## subpackages/circles/circles/circle-home（2 条）

### R12-L04-D08　P0 / 需新建　批次 R12-B31
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`f1fa8216c685fe5e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:255`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png hero 区「等 8 位朋友已加入」+3 头像行；对照 §12（编造内容不诈真）
- 现象：帧 hero 第三行渲染好友头像组（3 枚）+「等 12 位 … 已加入」计数。计数取 circle.value.friendJoinedCount（:255），而 R11-L04-D01（P0 假计数）已在册判定后端该字段「不是好友加入数」，同域 topics.vue:556-558 因此把同一行整行撤下；头像更是在 :243-250 恒由圈 id 字符码对 3 张公共头像池取模拼出、无任何 mock/real 门控——真实模式下把编造的「好友脸」和语义不实的计数当真数据展示（张冠李戴、假计数）。用户据此做「朋友都在这个圈」的社交判断即被误导。
- 建议改法：与 topics.vue 同口径先把「头像组 + 计数行」整块撤下；要恢复需后端新增「以 viewer 为锚的好友-圈子加入统计 + 好友头像 id 列」（缺列清单已在 topics.vue:280 登记），接真后再渲染。
- 修复类别：需新建目标功能

### R12-L04-D09　P2 / 间距　批次 R12-B31
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__circle-home__top.png`（sha16=`f1fa8216c685fe5e`）
- 源码证据：`apps/client/src/subpackages/circles/circles/circle-home.vue:1051`
- 理想图依据：素材/理想效果图/圈子详情，摄影圈参考.png 页签行（动态/精华/活动/作品墙/成员 1.2w 铺满卡宽，末签右缘 ≈94% 帧宽）
- 现象：帧页签行右侧恒留胶囊空档：padding-right = capsule-right(7px)+104px（:1051），帧上末签「成员 1.2w」右缘 x≈270/378 ≈71% 帧宽，理想图同排铺到 ≈94%——右侧 ~23% 帧宽空白，五签被压向左半边（:1075 在册注释自证可用宽仅 ≈255px）。不影响点击，判 P2 间距档次偏差。
- 建议改法：胶囊预留只在吸顶态生效（与 :1046-1049「只在吸顶态补内衬」的 R10-L03-D19 同思路拆分 padding），未吸顶顶帧让页签铺满卡宽对齐理想图。
- 修复类别：单页

## subpackages/circles/circles/post-topic（2 条）

### R12-L04-D06　P2 / 可达性　批次 R12-B33
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__post-topic__top.png`（sha16=`e2714a3ae1a63bad`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:799`
- 理想图依据：无基准，依据=同域 topic-detail 页头返回钮 88rpx 热区基准（EmptyState.vue:224 同口径）
- 现象：帧页头「返回」浅色胶囊源码纵向 padding 仅 12rpx（:799 padding: 12rpx 20rpx），实测高 ≈30px(378px 宽帧)≈60rpx < 88rpx；替代出口只有系统手势（页内无其他返回件）判 P2：发布页唯一页头出口难点中，误触率高的表单页尤其如此。
- 建议改法：.post-header__back 补 min-height:88rpx + flex 居中（同 EmptyState.vue:224），与 topic-detail 返回钮热区归一。
- 修复类别：单页

### R12-L04-D07　P1 / 需新建　批次 R12-B33
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__post-topic__bottom.png`（sha16=`e2714a3ae1a63bad`）
- 源码证据：`apps/client/src/subpackages/circles/circles/post-topic.vue:401`
- 理想图依据：无基准，依据=帧上「发布到」分段（校园圈 | 兴趣圈 两态皆可选）承诺 + §12 硬规矩（缺后端真相源只许接真字段或撤承诺）
- 现象：帧上「兴趣圈」目标可选，但选中后解析出的目标是兴趣分类 slug（study/sports/…），提交守卫（:401 if (!useMock() && !/^\d+$/.test(resolvedCircleId))）在 real 模式直接拦截并 toast、不再发请求——因为后端圈子话题仅支持数字兴趣圈 ID（@PathVariable Long，见 :397-399 在册注释）。用户选「兴趣圈」发布必被拦，拿不到「发布到兴趣圈」的能力；缺「兴趣分类 → 数字兴趣圈 ID」映射接口/列（apps/api CircleController 话题路由）。
- 建议改法：后端为兴趣分类补数字圈 ID 映射（或话题路由支持分类 slug）后前端接真字段；在此之前按 §12 应把「兴趣圈」态改为只读提示而非可选项，不许再编一组常量绕过。
- 修复类别：需新建目标功能

## subpackages/circles/circles/topic-detail（2 条）

### R12-L04-D04　P2 / 可达性　批次 R12-B34
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__topic-detail__top.png`（sha16=`4fa1dd65ce238617`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:489`
- 理想图依据：无基准，依据=本页在册热区标准（topic-detail.vue 自述 min-height 88rpx 档）+ src/components/common/EmptyState.vue:224 动作钮 min-height:88rpx 同域基准
- 现象：帧页头左上「返回」深色胶囊实测高 ≈30px（378px 宽帧）≈60rpx，源码 padding: var(--sp-3) var(--sp-5)（:489）纵向只有一档小间距，热区 <88rpx；因页内空态另有 88rpx 大「返回」钮（EmptyState.vue:224 min-height:88rpx）作替代出口判 P2：触达本页唯一页头出口时难点中。
- 建议改法：.detail-header__back 补 min-height:88rpx 并用 flex 居中（同 EmptyState.vue:224 口径），视觉宽度不变。
- 修复类别：单页

### R12-L04-D05　P3 / 颜色token　批次 R12-B34
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__topic-detail__bottom.png`（sha16=`8b4a707e68fef3a9`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topic-detail.vue:475`
- 理想图依据：无基准，依据=同域发布话题页页头取档（post-topic.vue:795）与本页页底在册渐变（topic-detail.vue:475）
- 现象：帧页头带是平涂薄荷绿（源为页面底 180° 渐变 var(--c-bg-brand) 0% → var(--c-bg-page) 20% 的顶部平段），同域「发布话题」页页头却是 135° 三档渐变（$green-primary → --c-brand-300 → --c-romance-300，post-topic.vue:795，帧右端明显泛粉）——同域两页页头语言取档不一。
- 建议改法：二取一归一：本页页底渐变改用与 post-topic 同一条 135° 页头渐变档，或 post-topic 页头回落 180° bg-brand→bg-page 档；不许新调私有色。
- 修复类别：CSS/token

## subpackages/circles/circles/topics（3 条）

### R12-L04-D01　P3 / 文案　批次 R12-B35
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__topics__top.png`（sha16=`fa6e1cb12e517747`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:569`
- 理想图依据：无基准，依据=同域已对齐页理想图 素材/理想效果图/圈子详情，摄影圈参考.png 的「加入圈子」实心主按钮口径 + zh-CN.ts 词条
- 现象：帧右上 hero 加入钮读作「+ 加入」（词条 circle.joinBtn，zh-CN.ts:3733 =「+ 加入」），而同域 circle-home 帧与理想图同一动作的按钮是「加入圈子」（topics.vue:759 底栏也复用同一短文案）——同域同一「加入圈子」动作两种按钮文案，取档不一。
- 建议改法：本页 hero 与底栏加入钮统一改用与 circle-home 一致的「加入圈子」词条（或给 circle.joinBtn 补整句档），不改布局。
- 修复类别：单页

### R12-L04-D02　P1 / 层级遮挡　批次 R12-B35
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`af9ee1d4e9b4c6e5`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1486`
- 理想图依据：无基准，依据=R11-L04-D05 自述口径（页签行 top:0 吸顶 + 吸顶态补 --statusbar 内衬，对齐 circle-home.vue:1040-1054 在册解法）
- 现象：滚动帧帧顶 y≈0..30px 处是第一张话题卡逃逸出来的「认识 TA」白胶囊，与系统状态栏带（时钟/电量）同带叠印；而应吸顶的五页签行（:1487 top:0、:1493 不透明底）整行不在帧顶——position:sticky 在本页滚动容器内未生效，「上一轮修得不对」（R11-L04-D05 承诺的吸顶 + :1500 .circle-tabs--pinned 状态栏内衬在帧上都不存在；同构的 circle-home bottom 帧吸顶正常）。
- 建议改法：把 .circle-tabs 的吸顶改为滚动容器内的等效实现（scroll-view 内改用固定头部槽位或在 onScroll 里对页签行置 fixed 并补 --statusbar 内衬），确保滚动帧页签带自 y=0 铺满、feed 从带下穿过。
- 修复类别：单页

### R12-L04-D03　P2 / 可达性　批次 R12-B35
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__topics__bottom.png`（sha16=`af9ee1d4e9b4c6e5`）
- 源码证据：`apps/client/src/subpackages/circles/circles/topics.vue:1477`
- 理想图依据：无基准，依据=topics.vue:1477 在册注释「页签行是本页唯一吸顶的头部元素」
- 现象：滚动帧内页面自备导航全部离屏：标题/返回随 hero 滚走、唯一应常驻的页签行未吸顶（见 R12-L04-D02），帧内没有任何页内返回或换 tab 出口，只剩系统手势与胶囊——因系统手势可返回（有替代出口）判 P2：用户滚动浏览后拿不到页内返回与页签切换。
- 建议改法：随 D02 把页签行做成真实吸顶后本条即销；吸顶行内保留返回箭头槽位（与 circle-home 吸顶带同构）。
- 修复类别：单页

## subpackages/discover-extra/discover/history（2 条）

### R12-L06-D10　P2 / 圆角　批次 R12-B36
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__history__top.png`（sha16=`104e7c0815ebb18d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:367`
- 理想图依据：无基准，依据=规范文档§1.4（卡片圆角 --card-radius 40rpx=20px）
- 现象：帧上顶部统计白卡（0 已浏览/0 已喜欢/0 已跳过）圆角实测约 12px（源码 var(--r-xl, 24rpx)=12px），低于 §1.4 卡片圆角 40rpx=20px 档一整档；本页其余圆角轴 R11-B39 收过，这张主卡没对齐——上一轮修得不对。
- 建议改法：.stats-bar 圆角改 var(--card-radius, 40rpx)。
- 修复类别：CSS/token

### R12-L06-D11　P2 / 可达性　批次 R12-B36
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__history__bottom.png`（sha16=`737601f83eeb739f`）
- 源码证据：`apps/client/src/subpackages/discover-extra/discover/history.vue:309`
- 理想图依据：无基准，依据=同分包返回键热区口径（segment.vue:227 / people.vue:299 已扩 88rpx）+ 组件规范热区 ≥88rpx
- 现象：帧上左上返回白圆实测直径约 36px（源码 .back-btn width/height 72rpx），热区=视觉区无外扩，低于 88rpx 热区口径；同分包 segment/people 的返回键 R11 已同法补到 88rpx 热区，本页漏收（R11-B39 只动了圆角/尺寸比例/颜色token），同域取档不一。
- 建议改法：与 segment.vue:226 同法——热区撑 88rpx、视觉白圆挪 ::before 居中、负外边距补位防标题移位。
- 修复类别：单页

## subpackages/discover-extra/discover/match-success（3 条）

### R12-L06-D01　P1 / 需新建　批次 R12-B11
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`d0a9112cc792c6ec`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:117`
- 理想图依据：素材/理想效果图/匹配成功页面.png 中部「我们正在分享你们的共同点」卡（4 行共同点+匹配度进度条，占画布纵向约 49%~74%）
- 现象：帧上头像下缘 y≈360 到「立即聊天」上缘 y≈655 约 295px（近 4 成屏高）整段空白，理想图要求的共同点卡整卡未渲染——上游没有喂 props.reasons（后端无共同点/匹配维度真值列），v-if 分支恒不进。用户拿不到「和对方的共同点」这一整块内容，破冰无抓手。上一轮 R11-B11/B40 撤掉假分数符合 §12（不回填常量），但画面只做了"撤"、没有以真数据形态把理想图模块补回，中部空白比改前更空——上一轮修得不对。
- 建议改法：后端补匹配共同点真值字段/接口（如 recommendation 详情的 reasons 列表）并接入 props.reasons，渲染分支 MatchSuccess.vue:117 已就绪；接口落地前按 §12 维持整卡隐藏，不许用常量分数回填。
- 修复类别：需新建目标功能

### R12-L06-D02　P3 / 文案　批次 R12-B18
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__match-success__top.png`（sha16=`d0a9112cc792c6ec`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:462`
- 理想图依据：素材/理想效果图/匹配成功页面.png 标题下副标题「你和 星野 互相喜欢了彼此」
- 现象：帧上副标题逐字为「你和 TA 互相喜欢上了」，理想图同位置为「互相喜欢了彼此」——句式「喜欢上了」与理想图「喜欢了彼此」逐字不符（zh-CN.ts:1144 同域另一处又作「互相喜欢了对方」，同句三档）。上一轮 R11-B40 修的是「对方昵称加载失败」兜底（现已稳落「TA」），这句措辞仍未对齐理想图。
- 建议改法：i18n `matchSuccess.matchedWith` 文案改为「你和 {name} 互相喜欢了彼此」，并同收 zh-CN.ts:1144 的「喜欢了对方」档；昵称仍按 §12 只用真值、无真值落「TA」。
- 修复类别：单页

### R12-L06-D03　P2 / 颜色token　批次 R12-B11
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__match-success__bottom.png`（sha16=`0848e3cb26343a19`）
- 源码证据：`apps/client/src/components/match/MatchSuccess.vue:228`
- 理想图依据：素材/理想效果图/匹配成功页面.png 标题行左侧爱心为心动粉深档（--c-romance-500 #FF6B81 档）
- 现象：帧上标题「匹配成功」左侧爱心呈浅粉（源码写死 #FF9DB5，MatchSuccess.vue:228/232 两处），明显浅于理想图左心的 #FF6B81 心动粉档，且 #FF9DB5 不在 §1.2 任何令牌档（romance-500 #FF6B81 / romance-50 #FFECEF），违反 §1.1.3 一令牌一值。
- 建议改法：两侧装饰爱心色值收进令牌——左侧取 var(--c-romance-500, #FF6B81)（SVG 烘焙 fill 不响应 color，需与 :236 同法用 filter 调档或换色值相符的素材），删除 #FF9DB5 私有色。
- 修复类别：CSS/token

## subpackages/discover-extra/discover/matching（4 条）

### R12-L05-D14　P2 / 文案　批次 R12-B10
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`3a98658d0c428aaa`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:93`
- 理想图依据：素材/理想效果图/匹配中页面.png · 顶部主标题区域（理想：「正在寻找有缘的Ta...」）
- 现象：帧上主标题为 t("matching.searching")=「正在寻找适合你的 TA」（zh-CN.ts:447），与理想图「正在寻找有缘的Ta...」不一致——上一轮 R11-B10 修了文案轴但只对齐了副标题（「分析彼此兴趣，缘分匹配中」已与理想一致），主标题没修全（上一轮修得不对）。
- 建议改法：改 zh-CN.ts:447 searching 文案为「正在寻找有缘的Ta...」对齐理想图。
- 修复类别：单页

### R12-L05-D15　P2 / 尺寸比例　批次 R12-B10
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__matching__top.png`（sha16=`3a98658d0c428aaa`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:339`
- 理想图依据：素材/理想效果图/匹配中页面.png · 双头像轨道区域（理想头像直径/页宽 ≈255px/853px ≈ 30%）
- 现象：双头像实装 168rpx（=84px@375，≈页宽 22%，:339-340 width/height:168rpx），理想图比例折算 ≈224rpx（≈112px、页宽 30%）——头像整体偏小约 25%，帧上双头像轨道存在感明显弱于理想图。
- 建议改法：.match-loading__avatar 放大到 ≈224rpx（心形与轨道间距按比例同步），或按理想图重新量取后取整档。
- 修复类别：单页

### R12-L05-D16　P3 / 颜色token　批次 R12-B10
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`77848375dd4b6f44`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:409`
- 理想图依据：素材/理想效果图/匹配中页面.png · 进度卡四行行首图标区域（理想四行 chip 底色各异：绿/紫/橙/粉浅底）
- 现象：四行行首图标底统一 var(--c-brand-50) #E8FAF3 圆形（:409-413），压白卡几乎不可辨，帧上读作裸图标；理想图四行 chip 各有可辨的异色浅底，四行同色不匹配。
- 建议改法：四行 chip 底按理想图分别取 brand-50/purple-50/warning-50/romance-50 四档浅底（全部走既有令牌，不新增色值）。
- 修复类别：CSS/token

### R12-L05-D17　P3 / 素材缺失　批次 R12-B10
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__discover__matching__bottom.png`（sha16=`77848375dd4b6f44`）
- 源码证据：`apps/client/src/components/match/MatchLoading.vue:349`
- 理想图依据：素材/理想效果图/匹配中页面.png · 双头像之间心形区域（理想：粉色心形置于白色圆形底座上）
- 现象：双头像之间的心形（:349-353 .match-loading__heart 无任何背景，内嵌 80rpx 心形图）在帧上是裸粉心直接浮在渐变底上；理想图心形带白色圆形底座（带阴影的白色圆 chip）。
- 建议改法：给 .match-loading__heart 增加白色圆底（background var(--c-neutral-0)+同族阴影，尺寸 ≈96rpx），心形图居中其上。
- 修复类别：单页

## subpackages/discover-extra/home/segment（3 条）

### R12-L06-D04　P2 / 圆角　批次 R12-B37
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`42cba88b84a4ed80`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:309`
- 理想图依据：无基准，依据=规范文档§1.4（卡片圆角 --card-radius 40rpx=20px）
- 现象：帧上 9 张白卡圆角实测约 10px（源码 var(--r-lg, 20rpx)=10px），只有规范「卡片圆角 40rpx=20px」档的一半；列表行是白底卡片容器，按 §1.4 应落 --card-radius 档。R8-L06-D14 只把 18rpx 收敛到阶梯档 20rpx，未对齐卡片圆角规范档——上一轮修得不对。
- 建议改法：.segment-row 圆角改 var(--card-radius, 40rpx)，同分包 people.vue:438（裸 20rpx）同批收口。
- 修复类别：CSS/token

### R12-L06-D05　P3 / 位置　批次 R12-B37
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__home__segment__top.png`（sha16=`42cba88b84a4ed80`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:148`
- 理想图依据：无基准，依据=同分包同域页头取档（people/history 两页页头标题均水平居中）
- 现象：帧上页头标题「细分发现 · 在线」紧贴返回键左对齐（标题左缘 x≈55），而同分包 people 帧（标题「附近的人」）、history 帧（「今日已看」）标题均落在画布中轴 x≈187 居中——同域二级页两种页头版式并存。
- 建议改法：本页页头改与 people.vue:296 同法（返回键定宽 + 标题居中补位），统一二级页页头版式。
- 修复类别：单页

### R12-L06-D06　P2 / 字号　批次 R12-B37
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__home__segment__bottom.png`（sha16=`ba17e278448812f2`）
- 源码证据：`apps/client/src/subpackages/discover-extra/home/segment.vue:265`
- 理想图依据：无基准，依据=规范文档§1.3（页面主标题 26–28px / 700–800）
- 现象：帧上页头标题「细分发现 · 在线」字面高实测约 22px（源码 44rpx=22px），低于 §1.3 页面主标题 26–28px 档；且与同分包 people 页标题 32rpx、history 页标题 38rpx 三页三个档（44/32/38rpx），无一把齐规范。
- 建议改法：二级页页头标题统一一档落在规范区间（如 52rpx=26px），segment.vue:265 / people.vue:338 / history.vue:338 三处同批取齐。
- 修复类别：CSS/token

## subpackages/discover-extra/likes-visitors/index（2 条）

### R12-L07-D01　P1 / 需新建　批次 R12-B38
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__likes-visitors__index__top.png`（sha16=`d7141ee4b913100a`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:130`
- 理想图依据：无基准，依据=规范文档 §1.2 + 本页页头文案承诺（「谁在喜欢你，谁来看过你」+ 概览栏三格口径）；代码注释 R7-L07-D01/D02 自证后端字段缺失
- 现象：概览栏「总浏览量 0 / 今日访客 0 / 今日浏览量 0」中两项无后端真相源——真实后端 ProfileStatsView 只有 followingCount/followersCount/likesCount，缺 visitorsCount 与按日浏览计数字段（:119-126 注释自证），:130 `totalViews = stats?.visitorsCount ?? 0` 恒 0；:134「今日浏览量 = Math.min(totalViews, likedBy.length)」是把「喜欢我的条数」夹进总浏览量编造的假读数（mock 值下会显示 22=喜欢数）。用户拿不到：本页标题承诺的「谁来看过你」统计对真实账号永远不可交付，今日浏览量是张冠李戴的假计数。
- 建议改法：后端 ProfileStatsView 补 visitorsCount 与今日浏览计数字段后按真字段渲染；字段落地前撤掉「总浏览量/今日浏览量」两项承诺（§12 两选一，不许换常量续编）。
- 修复类别：需新建目标功能

### R12-L07-D02　P2 / 颜色token　批次 R12-B38
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__likes-visitors__index__bottom.png`（sha16=`d7141ee4b913100a`）
- 源码证据：`apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:567`
- 理想图依据：无基准，依据=规范文档 §1.2（--c-text-tertiary #6B7571 用途=弱说明）+ WCAG 4.5:1 正文门槛；帧实测
- 现象：页头副标题「谁在喜欢你，谁来看过你」（--fs-sm 24rpx=12px）取 --c-text-tertiary，帧上文字最深采样 #68726E、所在栏底 #DFF3EA–#EEF7F2，对比 4.1–4.3:1 < 4.5:1，12px 次级文字不达标。上一轮 R11-B43 的颜色token 卡（D06）只针对登录按钮且建议被裁定不采纳，副标题这处未在销卡清单内，为同轴新象。
- 建议改法：副标题提到 --c-text-secondary（#4A524E，压页底 ≈7.4:1），与同页 guest-guide__desc 的用墨档对齐。
- 修复类别：CSS/token

## subpackages/discover-extra/likes/index（4 条）

### R12-L06-D12　P2 / 位置　批次 R12-B04
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__likes__index__top.png`（sha16=`cb24ce68ff8abb01`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:354`
- 理想图依据：无基准，依据=规范文档§3.15（2×2 功能卡：精确匹配绿/聊天互动粉/校园相遇蓝/关系成长紫四色浅底）
- 现象：帧上「精确匹配/聊天互动/校园偶遇/关系成长」四项排成单行 1×4 裸图标（y≈555–605，图标无任何卡底），规范 §3.15 为 2×2 功能卡且四项各带绿/粉/蓝/紫浅色卡底——布局形态与四色底双双未落。用户拿得到文字但拿不到规范的功能卡视觉分层。
- 建议改法：.not-logged__features 改 2×2 网格并给每格浅色底卡（四色依次 brand/romance/info/purple 浅底档，§1.2），图标+标签居中卡内。
- 修复类别：CSS/token

### R12-L06-D13　P2 / 字号　批次 R12-B04
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`96c0b3e472eff4c6`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:338`
- 理想图依据：无基准，依据=规范文档§3.15（标题「正在为你寻找同频的那个人」28px 绿）
- 现象：帧上两行标题「正在为你寻找 / 同频的那个人」字面高实测约 22px（源码 var(--fs-5xl, 44rpx)=22px），低于 §3.15 明确标注的 28px 档（对应 §1.3 页面主标题 26–28px 区间），标题强调位弱了一档。
- 建议改法：.not-logged__title 字号提至 56rpx=28px（可用 var(--fs-7xl)），两行行高按 §1.3 标题 1.2–1.3 复核。
- 修复类别：CSS/token

### R12-L06-D14　P2 / 素材缺失　批次 R12-B04
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`96c0b3e472eff4c6`）
- 源码证据：`apps/client/src/components/discover/NotLoggedWaiting.vue:105`
- 理想图依据：无基准，依据=规范文档§3.15（中心吉祥物 120px 浮动）+ §1.1.4（吉祥物 4 张唯一真相源 = api app-assets）
- 现象：帧上轨道中心主视觉是一只约 70px 宽的 sprout 卡通（容器 200rpx=100px，aspectFit 后墨迹更小），既小于 §3.15 的 120px 档，素材也不是 app-assets 吉祥物真相源——源码绑的是 ICONS_EMOJI.SPROUT emoji 素材（NotLoggedWaiting.vue:105），违反 §1.1.4 吉祥物唯一真相源。
- 建议改法：中心改绑 app-assets 吉祥物素材（走 resolveMediaUrl 真相源通道，后端 media_asset 无该资产则先登记缺素材），容器提到 240rpx=120px。
- 修复类别：CSS/token

### R12-L06-D15　P2 / 文案　批次 R12-B18
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__likes__index__bottom.png`（sha16=`96c0b3e472eff4c6`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:686`
- 理想图依据：无基准，依据=规范文档§3.15（副标题「附近有 N 位同频的你」，N 为真实计数）
- 现象：帧上副标题逐字为「发现更多同频的人」，规范 §3.15 同位置为「附近有 N 位同频的你」——计数位整个缺失。组件注释（NotLoggedWaiting.vue:20）明确"不设计数位"，即上轮主动放弃该句；但缺的是接口总数字段（推荐列表 total/count），按 §12 只有接真字段一条路能把规范句落下来，用户拿不到「附近有多少同频的人」这个决策信息。
- 建议改法：后端推荐/附近接口补 total 真值字段，前端加 subtitleWithCount 档渲染「附近有 {n} 位同频的你」；字段就绪前维持现句，不编造计数。
- 修复类别：需新建目标功能

## subpackages/discover-extra/nearby/people（3 条）

### R12-L06-D07　P1 / 需新建　批次 R12-B39
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__nearby__people__top.png`（sha16=`92ef8b2ddd10ad05`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:160`
- 理想图依据：无基准，依据=规范文档§3.5 附近页说明（附近的人 = 真实按距离人卡列表）+ §1.1.4 真相源口径
- 现象：帧 top 前 3 行「用户」名字逐字读作「中山大学 / 武汉大学 / 南开大学」，与各自第二行校名完全同名、三行均无年龄槽位、标签同为「摄影 阅读 运动」——recommendations 接口返回的 QA 种子行被当真人渲染。上一轮 R11-L06-D13 只剥掉「演示·」前缀（people.vue:160 正则），画面变了但种子行反而更像真人，用户拿不到真实的附近的人列表，无法分辨真假、据此发起搭讪即指向假身份。
- 建议改法：后端推荐接口清理 QA 种子行并接入真实用户数据源（缺真实数据列/种子治理接口）；前端 :160 剥前缀逻辑保留只作兜底，不许用新造常量数据顶替。
- 修复类别：需新建目标功能

### R12-L06-D08　P2 / 字号　批次 R12-B39
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`149791b134dd125d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:338`
- 理想图依据：无基准，依据=规范文档§1.3（页面主标题 26–28px / 700–800）
- 现象：帧上页头标题「附近的人」字面高实测约 16px（源码 32rpx=16px），仅及 §1.3 页面主标题 26–28px 档的六成；同分包 segment 44rpx、history 38rpx、本页 32rpx 三页三个档。
- 建议改法：与 segment.vue:265 / history.vue:338 同批统一到 52rpx=26px 档（§1.3 页面主标题下限）。
- 修复类别：CSS/token

### R12-L06-D09　P2 / 圆角　批次 R12-B39
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover-extra__nearby__people__bottom.png`（sha16=`149791b134dd125d`）
- 源码证据：`apps/client/src/subpackages/discover-extra/nearby/people.vue:438`
- 理想图依据：无基准，依据=规范文档§1.4（卡片圆角 --card-radius 40rpx=20px）
- 现象：帧上人卡白卡圆角实测约 10px，源码是裸值字面量 `border-radius: 20rpx`（people.vue:438），既低于 §1.4 卡片圆角 40rpx=20px 档一半，又没走令牌（同页 segment.vue:309 至少还有 var(--r-lg) 兜底），违反 §1.1.3 一令牌一值。
- 建议改法：.people-row 圆角改 var(--card-radius, 40rpx)，与 segment 行卡同批收口。
- 修复类别：CSS/token

## subpackages/discover/activities/index（3 条）

### R12-L13-D06　P2 / 颜色token　批次 R12-B40
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`ef12dd21834334a8`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:869`
- 理想图依据：无基准，依据=规范 §1.2 边框令牌表（描边档 --c-border-default #DDE3E0 / 分隔档 --c-border-light #EEF2F0 两档语义分立）
- 现象：帧上三张活动卡的「感兴趣」按钮描边逐像素实测 #F0F2F1（≈--c-border-light #EEF2F0，:869 吃的是分隔线档），压白卡对比 ≈1.1:1，按钮边界几乎隐形；按钮是报名前必点控件，描边应吃描边档 --c-border-default（#DDE3E0，2.0:1 档）。
- 建议改法：.enroll-btn 边框改 `2rpx solid var(--c-border-default)`；enroll-btn--active 已用 brand-700 描边不动。
- 修复类别：CSS/token

### R12-L13-D07　P2 / 可达性　批次 R12-B40
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover__activities__index__top.png`（sha16=`ef12dd21834334a8`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:1173`
- 理想图依据：无基准，依据=规范 §1.2 主色族对比口径（同族深档实测先例 LegalTextPage.vue:533「brand-600 2.81:1 不达标」）
- 现象：帧上选中筛选 chip「全部」底实测 #E8FAF3（--c-brand-50）、字吃 --c-brand-600（#2AAE83，:1173，兜底值还错写成 brand-500 的 #36C99A），实算对比 2.60:1，低于 3:1；24rpx/700 字重不享豁免。同帧未选中的「今天/周末」白底 --c-text-secondary 反而清晰，选中态比未选中态更难读。
- 建议改法：.quick-filter--active .quick-filter__text 改 --c-brand-700（#1F8D6A 压 #E8FAF3 ≈3.9:1）并顺手把 :1173 兜底字面量改写成 #2AAE83 真值。
- 修复类别：CSS/token

### R12-L13-D08　P2 / 字号　批次 R12-B40
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover__activities__index__bottom.png`（sha16=`9ad415cc585d368a`）
- 源码证据：`apps/client/src/subpackages/discover/activities/index.vue:898`
- 理想图依据：无基准，依据=规范 §1.2 次级文字对比口径（#6B7571 压各底 ≥4.5:1 才算达标次级文本）
- 现象：帧上列表尾「没有更多活动了」（y≈598..612）为 --fs-sm 22rpx=11px + --c-text-tertiary #6B7571（:897-898），但它直接坐在页面底 #EEF7F2 上（不在白卡内），实算对比 4.36:1，落 3:1–4.5:1 区间；同页卡片内三级文本压白卡是 4.74:1 达标，同一档色换底即破线。
- 建议改法：.loading-more__text 颜色提到 --c-text-secondary（#4A524E 压 #EEF7F2 ≈7:1），或给该行垫白卡底；字号不动。
- 修复类别：CSS/token

## subpackages/discover/discussions/index（2 条）

### R12-L13-D04　P1 / 需新建　批次 R12-B41
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover__discussions__index__top.png`（sha16=`8dad71a8c7a71480`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:71`
- 理想图依据：无基准，依据=组件规范（列表「标题+摘要」两级结构，SectionCard/feed-row）+ 本文件 :71 契约自述
- 现象：帧上第 4 行标题「傍晚绕着操场慢跑，抬头看见整片橘粉色的晚霞，一天的疲惫都没了…」以省略号截断收尾；契约只有 id/title/summary/heatLabel 四个字段（:71），没有承载话题正文/完整文本的列，点条目弹窗里 title+summary 还是同一句（:78）。用户拿不到：任何一条被截断话题的完整内容——列表看不全、弹窗也看不全、无详情页，核心浏览内容整块缺席。
- 建议改法：后端讨论推荐接口补「正文/全文」列（如 content 字段），前端列表显示截断标题、弹窗/详情展示全文；不许用前端常量补写正文。
- 修复类别：需新建目标功能

### R12-L13-D05　P2 / 文案　批次 R12-B41
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__discover__discussions__index__bottom.png`（sha16=`7b5cd41a09c18bf6`）
- 源码证据：`apps/client/src/subpackages/discover/discussions/index.vue:66`
- 理想图依据：无基准，依据=组件规范（标题+摘要两级结构应保留信息增量）+ R8-L13-D05 上一轮修得不对
- 现象：上一轮修得不对：帧上「我自去吃了顿小火锅，不用迁就任何人的口味，锅底全球，快乐加倍…」同样以 … 截断且无摘要行——R8-L13-D05 改出的去重守卫 `b.startsWith(a) || a.startsWith(b)`（:66）把「标题是摘要的截断前缀」也判为同文；一旦后端 summary 比标题长（真摘要），整条更长的摘要会被这条守卫吃掉、屏幕只剩截断标题。注释 :56 自称「避免把有信息的摘要吃掉」，startsWith 分支恰好做不到。
- 建议改法：去重只保留归一化后全等（a===b）一种判据，删掉两个 startsWith 分支；截断形态的互补交给 D04 的正文字段，不在前端猜前缀。
- 修复类别：单页

## subpackages/legal/agreement/index（2 条）

### R12-L13-D11　P3 / 文案　批次 R12-B02
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__legal__agreement__index__top.png`（sha16=`cec3fc54b1fad7cf`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:230`
- 理想图依据：无基准，依据=本组件 :227-228 自陈「i18n 键抽取登记给文案车道」未落地 + en-US.ts 同页其余文案均已走 t()
- 现象：帧上卡顶披露药丸文案「本地兜底文本 · 非正式版本」是模板里硬编码的中文字面量（:229-231，注释自证「本行是状态标识、非业务文案；i18n 键抽取登记给文案车道」）——en-US 用户在同一位置会看到中文状态文案，是本页唯一不走 i18n 的上屏文字。
- 建议改法：抽成 i18n 键（如 legal.localFallbackBadge），zh-CN「本地兜底文本 · 非正式版本」/ en-US "Local fallback text · unofficial"，模板改 t()。
- 修复类别：单页

### R12-L13-D12　P3 / 文案　批次 R12-B18
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__legal__agreement__index__bottom.png`（sha16=`47e1ada0f1381caf`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4723`
- 理想图依据：无基准，依据=规范口径「同域两页取档不一」；对照同批 privacy bottom 帧末条
- 现象：帧上末条为「11. 联系方式：如对本协议有疑问…」，同批 privacy bottom 帧同角色末条却是「10. 联系我们：如需行使上述权利…」——两页法律文本的收尾联系条款一个叫「联系方式」一个叫「联系我们」，句式（「如对本协议有疑问或需要协助」vs「如需行使上述权利或对本政策有疑问」）也分叉，同域取档不一。
- 建议改法：统一两条收尾条款的术语与句式（条款名二选一，句式对齐），在 zh-CN.ts:4723/4731 与 en-US 对应键同步改；这是措辞对齐，不新增承诺。
- 修复类别：单页

## subpackages/legal/privacy/index（2 条）

### R12-L13-D09　P2 / 需新建　批次 R12-B02
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__legal__privacy__index__top.png`（sha16=`369c51543f868832`）
- 源码证据：`apps/client/src/components/common/LegalTextPage.vue:145`
- 理想图依据：无基准，依据=本组件 :12-14「后端 CMS 为正式真相源、i18n 仅兜底」的既有架构口径（config/legal-texts.ts:153-159 GET /api/v1/config/legal）
- 现象：帧上卡顶披露药丸「本地兜底文本 · 非正式版本」（实测 y183..196、h14px、底 #FEF5E6 系 warning-tint）在屏，即 `legalText.version === "local-fallback"`（:145）成立——截图环境后端 CMS 的 GET /api/v1/config/legal 没有返回隐私政策 items，用户签署前通读的是本地兜底条款；客户端「接真字段」的管道已建好，缺的是后端正式法务文本数据（type/title/content/version/updatedAt 列内容）。
- 建议改法：需新建目标功能：后端 LegalConfigController 对应 CMS 侧录入正式《隐私政策》文本（含 version/updatedAt），前端零改动即可把披露药丸换成版本药丸（:232-237 既有出口）；在正式文本上线前披露药丸必须保留，不许撤。
- 修复类别：需新建目标功能

### R12-L13-D10　P3 / 文案　批次 R12-B18
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__legal__privacy__index__bottom.png`（sha16=`ec457d3f4be601c4`）
- 源码证据：`apps/client/src/i18n/locales/zh-CN.ts:4731`
- 理想图依据：无基准，依据=规范 §1.1 文案面向用户的口径（正文级条款不得暴露实现符号）
- 现象：帧上第 6 条正文一行印着「我们使用本地存储（uni.setStorage）保存登录态与偏好设置。」——`uni.setStorage` 是客户端开发 API 名，直接暴露在用户须通读的法律正文里（同段还并列「访问 IP、崩溃日志」等用户可懂项，语言档位不一致）。
- 建议改法：zh-CN.ts:4731 该句改写为用户语言，如「我们使用小程序本地存储能力保存登录态与偏好设置」；en-US 对应键同步。注意：改写措辞属文案修正，不是新编条款内容。
- 修复类别：单页

## subpackages/market/detail/index（2 条）

### R12-L14-D01　P2 / 尺寸比例　批次 R12-B42
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__market__detail__index__top.png`（sha16=`05374718eef5005c`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:547`
- 理想图依据：无基准，依据=规范文档§1.4/§1.5 组件规范 + components/common/EmptyState.vue:159-160（.empty-icon 固定 120rpx×120rpx，无 token 的固定布局尺寸）
- 现象：封存卡内锁图标墨迹实测 40×43px（≈79×85rpx，帧 y161–203），样式盒 detail:547-548 只有 96rpx×96rpx，比组件规范 EmptyState 空态图标 120rpx 档小一档；它是封存态整页唯一图形线索，在 378px 帧宽里只占约 11%。本帧主体与 R11 改前逐字节一致（R11→R12 帧差只在状态栏时钟 y18–26 与底部横条），B48 没碰这条轴；R11 只报过该图标的颜色（D06 opacity 0.55 → 实测 #C0C9D5 对白卡 1.67:1），尺寸档为 detail 帧首报。
- 建议改法：.product-state__sealed-icon 宽高提到 120rpx 与 EmptyState .empty-icon 同档（同值同步 shop:776 / wallet:401，三页同写法），不动 commerce 开关。
- 修复类别：CSS/token

### R12-L14-D02　P2 / 空态文案　批次 R12-B42
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__market__detail__index__bottom.png`（sha16=`d2786fb8db8cd79c`）
- 源码证据：`apps/client/src/subpackages/market/detail/index.vue:309`
- 理想图依据：无基准，依据=规范文档§1.5 组件规范（空态件说明行须给可执行出口）+ 本帧封存卡自证：内容带实测仅 4 条（图标 y161–203/标题 y215–228/说明 y240–252/返回钮 y262–310），无提醒控件
- 现象：说明行逐字「该功能暂未开放，开放时间将另行通知」（detail:309 ← i18n/locales/zh-CN.ts:804）承诺「另行通知」，但封存卡模板 detail:306-320 里只有图标/标题/说明/返回钮四件，整页 0 个提醒或订阅入口——文案给出的下一步在页面上不存在；bottom 帧与 top 帧除时钟 y18–26 外逐像素相同，滚到底也没有兑现路径。此轴在 detail 帧为新增（R11 的 D02/D05/D06 报的是底色/位置/图标色，未含文案）。
- 建议改法：守封存口径二选一：摘掉「开放时间将另行通知」这半句无出口的承诺；或接真实公告/开闸时间字段（需新建公告下发）后再谈提醒入口。不改 commerce 开关。
- 修复类别：单页

## subpackages/market/shop/index（2 条）

### R12-L14-D03　P2 / 空态文案　批次 R12-B43
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__market__shop__index__top.png`（sha16=`ca9bc11c1c3e3389`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:387`
- 理想图依据：无基准，依据=规范文档§1.5 组件规范（EmptyState 空态件标配动作槽）+ 同域 detail:310-319 已落的「返回」胶囊作对照
- 现象：上一轮修得不对——B49 声称销 R11-L14-D11（空态文案），帧确实变了（页头收到 #EEF7F2、说明字升 secondary、卡内衬改档），但这条轴没对齐：本帧内容带实测仍只有 3 条（图标 y148–191/标题 y203–216/说明 y228–240），封存卡内 0 个可点控件；说明行仍逐字承诺「开放时间将另行通知」（shop:387 ← zh-CN.ts:804）且无提醒入口，卡内也没有 detail 那枚「返回」胶囊——文案给出的下一步依旧不存在，页头左上白盘仍是唯一退出件。
- 建议改法：守封存口径：摘掉「另行通知」半句，或按 EmptyState 动作槽口径在卡内补与 detail 同档的「返回」胶囊；不许换一句文案接着承诺。
- 修复类别：单页

### R12-L14-D04　P2 / 间距　批次 R12-B43
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__market__shop__index__bottom.png`（sha16=`471becf5174479a0`）
- 源码证据：`apps/client/src/subpackages/market/shop/index.vue:765`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue:144（padding: 80rpx 40rpx）+ 规范文档§1.4 卡片内边距档
- 现象：上一轮修得不对——shop:765 已按 R11-L14-D08 收到 var(--card-padding)（32rpx 单值），本帧实测卡 y131–258（高 128px）、图标顶距卡顶 17px（≈34rpx）、说明底距卡底 18px（≈36rpx）；但 EmptyState 组件规范上下衬 80rpx、同域 detail 同内容卡实测上下衬 41px（≈81rpx，detail:540 仍是 80rpx 48rpx）——统一落在了比规范和 detail 都低的档，三页两档没消掉（源码注释 shop:762 自己登记了 wallet:390 与 detail:540 未同步）。
- 建议改法：三页封存卡内衬一批改齐：要么全走 var(--card-padding)，要么全对齐 EmptyState 80rpx 40rpx（detail:540 / wallet:390 同批同步），别一页一值。
- 修复类别：CSS/token

## subpackages/market/wallet/index（2 条）

### R12-L14-D05　P2 / 空态文案　批次 R12-B44
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__market__wallet__index__top.png`（sha16=`4b60356e17fff487`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:215`
- 理想图依据：无基准，依据=规范文档§1.5 组件规范（空态件说明行须给可执行出口）+ 同域 detail:310-319 封存卡动作钮对照
- 现象：说明行逐字承诺「开放时间将另行通知」（wallet:215 ← zh-CN.ts:804），本帧内容带实测只有 3 条（图标 y132–174/标题 y186–199/说明 y212–224），封存卡内 0 个控件——既无提醒/订阅入口，也无同域 detail 那枚「返回」胶囊（页头左上白盘成唯一退出件）；文案给出的下一步在页面上不存在。wallet 帧主体与 R11 改前逐字节一致（帧差仅时钟 y18–26），B50 没碰这条轴；R11 wallet 卡报的是封存/内衬/图标/页头/落位/兜底色，文案轴首报。
- 建议改法：守封存口径：摘掉「另行通知」半句，或接真实公告字段后再给提醒入口；并补与 detail 同档的卡内「返回」胶囊作替代出口。
- 修复类别：单页

### R12-L14-D06　P2 / 可达性　批次 R12-B44
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__market__wallet__index__bottom.png`（sha16=`8de74bb7f56a0c3a`）
- 源码证据：`apps/client/src/subpackages/market/wallet/index.vue:282`
- 理想图依据：无基准，依据=规范文档§1.2 非文本对比 ≥3:1 档 + 组件规范（退出控件字形须可辨）
- 现象：返回盘内 ‹ 字形实测墨色 #97A6BA（盘心采样 (33,72)），对白盘 #FFFFFF 仅 2.48:1，低于非文本 3:1 下限；盘本身对深绿页头 #156B51 有 6.45:1 ⇒ 盘可见、字形几乎不可辨。封存卡内 0 控件（内容带仅图标/标题/说明三条），这枚盘是本页唯一退出控件（wallet:282-291 白盘 + :297-298 ::after 88rpx 命中盒，热区达标故不升 P1）。同族字形问题 R11 只在 detail（D03，#99A8BB 2.4:1）与 shop（D09）报过，wallet 帧首报；shop 本轮已修好（同素材实测 #161A18，对页头 16.08:1），本页未同步。
- 建议改法：BACK 字形素材换 --c-text-primary 档描线（对齐 shop 本轮已落的深色档），使对白盘 ≥3:1；三页同一素材一处替换，不动登录门与开关。
- 修复类别：CSS/token

## subpackages/profile-extra/feedback/history（2 条）

### R12-L11-D06　P2 / 空态文案　批次 R12-B45
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__feedback__history__top.png`（sha16=`b29e83b8c0597eb6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:350`
- 理想图依据：无基准，依据=组件规范 components/common/EmptyState.vue（组件自带 action 按钮插槽与按钮样式 :207-224，min-height:88rpx）
- 现象：空态只传 title+description（「暂无反馈记录」「提交反馈后将在此处显示」），EmptyState 的动作按钮插槽没用（history.vue:350-355 仅两个 prop），页内也没有任何跳反馈提交页的出口——文案承诺"提交反馈后…"，帧上却无处可去：用户拿不到从空态直达"去提交"的路，只能退出本页回我的页再找入口。
- 建议改法：给该 EmptyState 传 action 文案（复用既有 feedback 提交页路由，openAppPath 跳转），按钮样式走组件既有 88rpx 档，不新增组件。
- 修复类别：单页

### R12-L11-D07　P3 / 字号　批次 R12-B45
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__feedback__history__bottom.png`（sha16=`28b001b8c9c29ee3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/feedback/history.vue:496`
- 理想图依据：无基准，依据=规范文档§1.3 字体层级（说明类文字=辅助档 14/15px；12px 属"小字·标签/时间戳"档）
- 现象：页头副标题「按类型筛选，点开记录看详情」取 --fs-base 24rpx=12px，帧上明显小于主标题（52rpx，:474）两档多——页面级说明文字落在"标签/时间戳"小字档而非辅助档 14px，与同包 dnd 页 .switch-row__desc 同为 24rpx 的取档一致地偏小。
- 建议改法：.history-header__subtitle 升到 var(--fs-lg, 28rpx)（14px 辅助档），颜色 --c-text-secondary 不动。
- 修复类别：单页

## subpackages/profile-extra/profile/album（2 条）

### R12-L10-D08　P2 / 可达性　批次 R12-B46
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__album__top.png`（sha16=`1cbaad1882d50984`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:888`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=组件规范热区口径 88rpx（AppShell.vue:334；同页 R11-L10-D14 只修了这颗钮的文字对比、未修热区；location.vue:590 96rpx / EmptyState.vue:224 min-height:88rpx 同域主按钮均已达标）
- 现象：主 CTA「添加照片」高度只由 padding: var(--sp-4) var(--sp-8)（16rpx 上下，album.vue:888）撑出，无 min-height，实算 ≈71rpx；帧实测按钮 y≈355..390 ≈35px ≈70rpx，低于 88rpx 最小热区档约 18rpx（5 个「+」空位格是替代出口，故不判 P1）。
- 建议改法：.album-add-btn 补 min-height:88rpx（flex 居中已就位，视觉只上下各涨 ~8rpx），与同页空位格 88rpx 口径、location.vue 主按钮 96rpx 档取齐。
- 修复类别：CSS/token

### R12-L10-D09　P3 / 文案　批次 R12-B46
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__album__bottom.png`（sha16=`9651045fa18e7877`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/album.vue:541`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=同屏指引只说一次的组件规范口径（同域 privacy 页 R7-L10-D11 把手势/规则收进单一说明块）
- 现象：同一屏两条重复指引：按钮下提示行「长按照片可删除或设为头像」（album.vue:541，帧 y≈412）与下方「照片使用说明」卡第 3 条「轻点照片可全屏查看，长按照片可设为头像或删除」（album.vue:566，帧 y≈577）说的是同一件事，同屏逐字近重复。
- 建议改法：二选一保留——提示行（album.vue:541）删除或把说明卡第 3 条（:566）收为唯一出处；不新增 locale 键，直接少渲染一条。
- 修复类别：单页

## subpackages/profile-extra/profile/favorites（2 条）

### R12-L10-D10　P2 / 位置　批次 R12-B47
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__favorites__top.png`（sha16=`66e8ac5d489fb520`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:149`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=R11-L10-D18 修复自述口径「空态落在剩余可用区居中」（favorites.vue:145-148 注释）+ EmptyState.vue:145-153 组件侧 flex:1 居中配方
- 现象：上一轮修得不对：R11-L10-D18 称 height:100vh（favorites.vue:149）+ EmptyState flex:1 0 auto（EmptyState.vue:154）会让空态在剩余可用区居中，但复拍帧上空态块仍压在上部——星标顶 y≈148、按钮底 y≈307，内容中心 y≈228，而页头下缘（≈100px）到屏底（812px）的可用区中心 y≈456，偏上 ≈228px，下方 ≈500px 全空——flex 链路在真机上仍未撑开，与修前「内容中心 y≈218」几乎没动。
- 建议改法：不要再依赖 flex 链路：给 EmptyState 的宿主用法补可解析高度（.favorites-page 用 height:100vh 且确认 mp-weixin 编译产物根节点无中间滚动层包裹），或在页面侧给空态分支显式 min-height:calc(100vh - 页头) 并保留组件 justify-content:center；修完以「内容中心 ±40px 内对准可用区中心」验收。
- 修复类别：单页

### R12-L10-D11　P2 / 字号　批次 R12-B47
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__favorites__bottom.png`（sha16=`e2af674a64deb50b`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/favorites.vue:198`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=规范文档 §1.3 页头标题档 --fs-7xl=56rpx（design-variables.scss:572；R6-B57/D10 已把同域 location.vue:345 / album.vue:699 / privacy.vue:312 三页页头统一到该档）
- 现象：页头标题「我的收藏（0）」取 --fs-xl=30rpx（favorites.vue:198），帧上字面 ≈13px；同域 location/album 页头标题 --fs-7xl=56rpx 帧上 ≈23px——同分包四个二级页页头两档，favorites 被留在小字档（R6-B57/D10 统一时漏掉本页，R11-B53 也未动这条）。
- 建议改法：.favorites-header__title 字号换 var(--fs-7xl)（56rpx），与 location.vue:345 同档；若嫌（0）计数随标题放大，可仿 album.vue:467-469 把计数拆成右侧 --fs-md 灰字，不动标题档。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/location（2 条）

### R12-L10-D04　P3 / 颜色token　批次 R12-B48
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__location__top.png`（sha16=`40411888c9ff7ea6`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:297`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=同域组件规范页头配方——album.vue:641（透明页头无底色）、favorites.vue:162（透明页头）、privacy.vue:262（品牌绿渐变）四页页头三档，location 独用第四档
- 现象：location 页头独有「白底带 + 1rpx 分隔线」（location.vue:297 background --c-bg-container 白 + :298 border-bottom #EEF2F0），帧上 y≈0..110 是一条白带压在薄荷页底上；同域 album/favorites 页头透明无带、privacy 深绿——同域四页页头四档，location 的白带 + 分隔线是孤档。
- 建议改法：去掉 .location-header 的白底与 border-bottom（background 改透明、删 :298），页头直接落在 --c-bg-page 上与 album/favorites 同配方；返回圆底已是薄荷档不受影响。
- 修复类别：单页

### R12-L10-D05　P3 / 字号　批次 R12-B48
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__location__bottom.png`（sha16=`e58253ac27550cd3`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/location.vue:576`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=规范文档 §1.3 字阶——同页同角色（改位置主操作）标签应同档
- 现象：同页两颗改位置主按钮标签两档：「地图选点」26rpx（location.vue:576）vs「重新定位」28rpx（location.vue:603），两钮在 bottom 帧同屏且同为 brand-800 实心主按钮，标签字面一大一小。
- 建议改法：.location-map__pick-text 由 26rpx 升到 28rpx 与 .location-btn__text 同档（88rpx 热区容得下，无需动按钮高度）。
- 修复类别：单页

## subpackages/profile-extra/profile/other（3 条）

### R12-L10-D01　P2 / 尺寸比例　批次 R12-B15
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__other__top.png`（sha16=`466e3f2e56abba69`）
- 源码证据：`apps/client/src/components/profile/public/PublicHero.vue:50`
- 理想图依据：素材/理想效果图/他人显示主页.png 顶部封面区——封面下缘（白卡顶+头像骑压处）在屏高 ≈23.7%（300px/1265px），封面高/宽 ≈0.44（≈332rpx 折算）；规范 §3.9「白卡顶部：头像 72px 浮动骑压」
- 现象：封面高写死 640rpx，实帧身份卡顶被推到 y≈272..286px（≈540..568rpx，高/宽 ≈0.72），姓名行落在 y≈310px ≈38% 屏高；理想图同位在 ≈23.7% 屏高——实帧封面比理想高约五成，首屏少显示一整段身份卡内容。
- 建议改法：.public-hero height 由 640rpx 收到 ≈340..400rpx 档（对齐理想图 0.44~0.48 高宽比），PublicIdentity.vue:130 的 margin-top:-72rpx 骑压量与头像 bottom:-40rpx 联动核一遍，不动其余三行布局。
- 修复类别：CSS/token

### R12-L10-D02　P2 / 可达性　批次 R12-B14
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`80051aded0237a32`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:107`
- 理想图依据：无基准（他人主页基准为理想图），依据=规范文档 §1.2 色板文字档（--c-text-quaternary 不作卡内文字色用）+ 同页 PublicCommon.vue:193/R11-L10-D05 已定的空态文字口径（--c-text-tertiary 压白 ≥4.5:1）
- 现象：「生活瞬间」4 个灰骨架格的占位字「暂无照片」取 --c-text-quaternary #9AA39F（L=0.3557），压骨架格底 #EEF2F0（--c-line，L=0.8801）实算 2.29:1，低于次级文字 3:1 底线更低于正文 4.5:1——帧上 4 格灰字发糊；同页 PublicCommon 空态行同一现象上一轮已按 4.76:1 档修过，本组件漏改。
- 建议改法：.public-gallery__cell-hint 色由 var(--c-text-quaternary, #9AA39F) 换 --c-text-tertiary #6B7571（对 #EEF2F0 ≈3.9:1、对白 4.76:1，与 PublicCommon.vue:193 同档），不动 20rpx 字号与骨架底色。
- 修复类别：CSS/token

### R12-L10-D03　P3 / 字号　批次 R12-B14
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__other__bottom.png`（sha16=`80051aded0237a32`）
- 源码证据：`apps/client/src/components/profile/public/PublicGallery.vue:68`
- 理想图依据：素材/理想效果图/他人显示主页.png——「兴趣标签」「我们有 3 个共同点」「生活瞬间」「最近动态」四个节标题同档同级（同字号同字重）
- 现象：同页四个同级节标题两个字重档：PublicGallery「生活瞬间」与 PublicMoment「最近动态」font-weight:800（PublicGallery.vue:68 / PublicMoment.vue:128），PublicInterest「兴趣标签」与 PublicCommon「我们还没有共同点」font-weight:700（PublicInterest.vue:47 / PublicCommon.vue:120）；bottom 帧四条标题同屏，粗细肉眼可分。
- 建议改法：四个节标题统一取一档（建议 700，与 30rpx 字号搭配），PublicGallery.vue:68、PublicMoment.vue:128 两条改 font-weight:700，理想图上四条标题等重。
- 修复类别：单页

## subpackages/profile-extra/profile/privacy（2 条）

### R12-L10-D06　P2 / 间距　批次 R12-B49
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__privacy__top.png`（sha16=`f3f7788b5bafc736`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:256`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=规范文档 §1.4 页边距档 --page-padding=32rpx（design-variables.scss:575；同域 location/album 内容左缘均按此档，favorites 由 R11-L10-D21 同批归档）
- 现象：页面根节点横向内衬取 --sp-4=16rpx（privacy.vue:256 第二个值），实帧开关卡左缘 x≈10px（≈20rpx），比同域 location/album 内容左缘 x≈17px（≈34rpx≈--page-padding）整整少一档；帧上 privacy 卡片明显更贴屏边，页边距不成全站一条竖边。
- 建议改法：.privacy-page 根节点横向内衬由 var(--sp-4) 换 var(--page-padding, 32rpx)（顶部 calc 内的 --sp-4 不动），note 卡的 --page-padding 外边距随之核对避免双倍内衬。
- 修复类别：CSS/token

### R12-L10-D07　P3 / 字号　批次 R12-B49
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__privacy__bottom.png`（sha16=`f3f7788b5bafc736`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/privacy.vue:448`
- 理想图依据：无基准（规范文档 §3 无该页条目），依据=规范文档 §1.3 字阶层级——分组标题不得小于其下辖条目标题
- 现象：分组标题「隐私安全」取 --fs-lg=28rpx/600（privacy.vue:448），而它下辖的条目标题（安全中心/隐私政策/我的位置/帮助与客服）取 --fs-xl=30rpx/600（privacy.vue:480，.privacy-entry__title）——帧上组标题字面（≈12px）比条目标题（≈14px）还小一档，分组层级倒挂。
- 建议改法：.privacy-page__group-title 升 --fs-xl=30rpx（或条目标题升一档），保证组标题 ≥ 条目标题；字重 600 两边不动。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/tasks（3 条）

### R12-L11-D01　P1 / 颜色token　批次 R12-B50
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__tasks__top.png`（sha16=`df8557d29b287e8e`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:657`
- 理想图依据：无基准，依据=规范文档§1.2（主文本 --c-text-primary #1A1E1C、次文本 #4A524E；brand 绿定位"主按钮·选中态·链接"）+ §1.1-2 绿色=行动
- 现象：四张任务卡的奖励值「+5/+50/+20/+100 积分」用 var(--c-brand) #36C99A、--fs-sm 22rpx=11px/600 压白卡，帧实测墨色 #39CA9C，对 #FFFFFF 对比 2.10:1，远低于正文级 4.5:1——用户拿不到"做这个任务得多少积分"的决策数据，低视力/强光下四行绿字全部糊掉。R11 只把「已完成态文字」收到 brand-800（:704-706 注释），同页积分值漏改，属同轴漏网。
- 建议改法：.task-item__points 颜色归口 var(--c-brand-800, #156B51)（对白卡 6.45:1），与同页 :701 已完成态同一档，字号不动。
- 修复类别：CSS/token

### R12-L11-D02　P1 / 颜色token　批次 R12-B50
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`df8557d29b287e8e`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:588`
- 理想图依据：无基准，依据=规范文档§1.2（数据读数属正文级文字，需 ≥4.5:1）
- 现象：积分概览卡右上角完成度「0%」用 var(--c-brand) #36C99A、--fs-xl 15px/700 压白卡，帧实测 #38CA9B，对比 2.10:1（15px/700 未达 WCAG 大字豁免的 18.66px 粗体门槛）——用户拿不到本页唯一的目标完成度读数；进度条 0 填充时这个百分比是唯一可读的进度表达。
- 建议改法：.tasks-summary__percent 颜色改 var(--c-brand-800, #156B51)，与 D01 同一批归口。
- 修复类别：CSS/token

### R12-L11-D03　P2 / 颜色token　批次 R12-B50
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__tasks__bottom.png`（sha16=`df8557d29b287e8e`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/tasks.vue:563`
- 理想图依据：无基准，依据=规范文档§1.2（--c-text-tertiary #6B7571 定位"弱说明"）
- 现象：页头「0/4 已完成」取 --c-text-tertiary #6B7571 直接压页面底 --c-bg-page #EEF7F2（.tasks-header 无卡底），帧上区域最暗墨实测 #646E6A，算得对比 4.36:1——次级文字落在 3:1–4.5:1 区间，按口径记 P2；与左侧白圆钮内 40rpx 图标的清晰度并排看明显发灰。
- 建议改法：.tasks-header__count 升一档到 var(--c-text-secondary, #4A524E)（对 #EEF7F2 约 7.4:1），字号 --fs-md 不动。
- 修复类别：CSS/token

## subpackages/profile-extra/profile/visitors（2 条）

### R12-L09-D09　P2 / 可达性　批次 R12-B51
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__visitors__top.png`（sha16=`19ca2b340256ea6f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:400`
- 理想图依据：无基准，依据=组件规范可达性口径（仓内热区标准 88rpx：同页空态按钮 visitors.vue:546 注释「低于仓内 88rpx 热区口径」已按 88rpx 补齐；consulting.vue:186 同口径）
- 现象：本页 navigationStyle:custom 无系统返回栏，页头唯一显式返回出口 `.visitors-header__back` 只有 64×64rpx（:403-404 = 32×32px，内含 40rpx 图标），低于仓内 88rpx 热区口径；同页空态「编辑资料」按钮已按同口径补到 min-height:88rpx（visitors.vue:543-546，R10-L09-D10），页头返回钮漏补。因仍有 iOS 侧滑/系统返回手势兜底，不判 P1，但帧上左上角白圆钮的可点热区确实只有 32px 见方。
- 建议改法：`.visitors-header__back` 补 min-width/min-height 88rpx（或扩 hit padding 至 88rpx 方位），视觉圆钮 64rpx 不变。
- 修复类别：CSS/token

### R12-L09-D10　P3 / 文案　批次 R12-B51
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__profile__visitors__bottom.png`（sha16=`19ca2b340256ea6f`）
- 源码证据：`apps/client/src/subpackages/profile-extra/profile/visitors.vue:266`
- 理想图依据：无基准，依据=规范 §1.1 全站一致性原则（同一功能全站同名）；对照基准为同车道 settings 帧
- 现象：同一功能两处命名：本帧页头标题为「谁看过我」（visitors.vue:266 渲染 profile.visitorsTitle，zh-CN.ts:1614），而同车道 settings 帧的入口行写作「访客记录」（settings 菜单键 settings.visitors，zh-CN.ts:1526 "访客记录"），且本页空态标题自身又叫「暂无访客记录」（zh-CN.ts:1616）——入口叫访客记录、进去叫谁看过我、空态又叫访客记录，用户从设置页找不到与入口同名的页面。
- 建议改法：统一功能名为「谁看过我」或「访客记录」其一（改 zh-CN.ts:1526 或 :1614 一处入口名，空态 :1616 随名对齐），不新增键。
- 修复类别：单页

## subpackages/profile-extra/settings/dnd（2 条）

### R12-L11-D04　P3 / 间距　批次 R12-B52
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__settings__dnd__top.png`（sha16=`f9f79fb47d1b1f88`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:702`
- 理想图依据：无基准，依据=规范文档§1.4（卡片内边距 --card-padding=32rpx；间距令牌列 2/4/6/8/10/12/16/32/48 无 28 档）+ §1.1-3 一令牌一值
- 现象：「开启免打扰/当前状态」「紧急消息仍会通知」两张卡的行内衬 .switch-row 写死 padding: 28rpx（非 --sp-* 任何档，也不是 --card-padding 32rpx），帧上卡内文字左缩进实测 14px，与同页 .section 归口 --page-padding 后 16px 的节奏差一拍；同文件 .radio-row（:821）纵向也带 28rpx，同源问题。
- 建议改法：.switch-row 水平内衬归口 var(--card-padding, 32rpx)（或 --sp-8=16rpx 的成对档），帧上内衬从 14px 回到 16px。
- 修复类别：单页

### R12-L11-D05　P2 / 颜色token　批次 R12-B52
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__settings__dnd__bottom.png`（sha16=`72625ecb07198f8a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:536`
- 理想图依据：无基准，依据=规范文档§1.1-1（主题底色统一浅绿 #EEF7F2，页面间不得出现白/灰断层）+ §1.2 页面底色令牌
- 现象：本页底是 linear-gradient(180deg, var(--c-bg-page), var(--c-tint-blue-50))，滚动到下部帧实测背景 #E2F1FA/#E3F2FC（蓝族，B 通道最高），同域 tasks/history 恒为 #EEF7F2（tasks.vue:509-510 注释明确"同域底色归口 var(--c-bg-page)"）——同域两页取档不一，页面间出现绿→蓝断层，且 --c-tint-blue-50 不在规范文档 §1.2 色板表内。
- 建议改法：.dnd-page 背景归口纯 var(--c-bg-page, #EEF7F2)，去掉向蓝 tint 的渐变（如需层次用卡底/描边表达）。
- 修复类别：单页

## subpackages/profile-extra/settings/index（2 条）

### R12-L09-D03　P2 / 字号　批次 R12-B53
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__settings__index__top.png`（sha16=`083376bfbc3ad9b2`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:878`
- 理想图依据：无基准，依据=规范 §1.3 字体层级表：「正文 --fs-xl/2xl（15/16px）用途=正文 · 列表主文字」，「辅助 --fs-lg/xl（14/15px）用途=说明」
- 现象：全页菜单行（反馈与帮助/推荐给好友/编辑资料/恋爱认证/我的动态/访客记录/浏览记录/我的相册/时间安排/免打扰，帧上 10 行）的行主文字统一取 `.menu-item__label { font-size: var(--fs-lg, 28rpx) }`（:878）= 14px「说明」档，帧上实测墨迹 ~14px；行主文字属 §1.3 的「列表主文字」，应在 --fs-xl/2xl（30/32rpx = 15/16px）档。与 R11-L09-D07 修的页头标题是两个元素，行标签本身上一轮未动、仍停留辅助档。
- 建议改法：`.menu-item__label` 的 font-size 升 `var(--fs-xl, 30rpx)`（15px 列表主文字档），行高/行距随档微调，不动图标与箭头。
- 修复类别：CSS/token

### R12-L09-D04　P3 / 文案　批次 R12-B53
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__settings__index__bottom.png`（sha16=`c9f7520c4be31fca`）
- 源码证据：`apps/client/src/subpackages/profile-extra/settings/index.vue:698`
- 理想图依据：无基准，依据=规范 §3.1（登录页 Logo 区「Logo 40×40 圆 + 「寻觅」+ slogan」，规范题名「寻觅小程序」）——全站品牌名为「寻觅」
- 现象：帧底部版本行墨迹为「校园恋爱 v1.0.0」（index.vue:698 渲染 i18n 键 settings.footerVersion，zh-CN.ts:3936 = "校园恋爱 v1.0.0"），与规范在册品牌名「寻觅」不一致；同帧上方还有「检查更新/关于我们」等页脚组，版本行是品牌名的唯一帧上出口，向用户露出第二套产品名。
- 建议改法：settings.footerVersion 文案统一为品牌名「寻觅 v1.0.0」（改 zh-CN.ts:3936 一处即可），不动版本号取值。
- 修复类别：单页

## subpackages/profile-extra/verification/index（2 条）

### R12-L09-D05　P2 / 素材缺失　批次 R12-B54
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__verification__index__top.png`（sha16=`2f6741ff7e6c16ab`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:557`
- 理想图依据：无基准，依据=规范 §1.2（警告 --c-warning #F59E0B 用于「待审核 · 中强度」语义色）+ §1.1 第 4 条（视觉元素对照令牌体系）
- 现象：未认证门控横幅（帧上琥珀浅底 --c-tint-amber-50 #FFF8E1 一条）左侧警示三角取 IMAGE_PATHS.ICONS_EMOJI.WARNING（:557），该素材描边烘焙为 slate #94A3B8（static/assets/icons/common/warning.svg:1）——帧上三角呈灰蓝色，与整条横幅的琥珀警示语义色脱节；:953-954 注释自述「警示三角图标保留资产原色……仓内无琥珀色警示三角素材，改色需要新素材」，即缺口在册但素材至今未补。
- 建议改法：新增一枚 stroke 用警告色（#F59E0B 族）的 warning 琥珀版 SVG 资产（icons 三树同步 + images.ts 注册），:557 引用替换为琥珀版。
- 修复类别：单页

### R12-L09-D06　P3 / 颜色token　批次 R12-B54
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__verification__index__bottom.png`（sha16=`6865fcdf4f7c154e`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/index.vue:1144`
- 理想图依据：无基准，依据=规范 §1.2 配色表：「占位 --c-text-placeholder #9AA39F 用途=placeholder」（与三级文本 --c-text-tertiary #6B7571「弱说明」是两个角色档）
- 现象：认证表单三处占位文字（帧上「请输入学生姓名」「请输入学号」「请输入学校全称」）走 `.form-item__placeholder { color: var(--c-text-tertiary) }`（:1144）= 三级说明档 #6B7571，不是 §1.2 为 placeholder 专设的 --c-text-placeholder #9AA39F 档，帧上占位墨迹比全站占位档深一档，与「已填值」(:1139 同用 --c-text-primary 的输入正文)之外又多出一档灰阶。
- 建议改法：`.form-item__placeholder` 的 color 改 `var(--c-text-placeholder, #9AA39F)`，与 §1.2 占位角色档归一（如担心可读性可全站占位档一并复核，不在本页私调）。
- 修复类别：CSS/token

## subpackages/profile-extra/verification/real-name（2 条）

### R12-L09-D07　P2 / 颜色token　批次 R12-B55
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__verification__real-name__top.png`（sha16=`c6f62c71199f714a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:89`
- 理想图依据：无基准，依据=规范 §1.2（成功 --c-success #10B981/#36C99A 用于「成功」语义）+ §1.1 第 2 条（色角色不混用）
- 现象：已实名成功态卡（帧上首卡）图标取 IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE（:89），素材描边烘焙为 slate #94A3B8（static/assets/icons/common/check-circle.svg:1）——帧上圆勾图标呈灰蓝色，而紧邻的标题「已实名认证」是 statusInfo.color = --c-brand-800 #156B51 深绿（real-name.vue:99，R9-L09-D07 定档）：同一张状态卡里图标与标题两套语义色，成功态图标不走成功/品牌色族。
- 建议改法：补一枚成功色描边的 check-circle SVG 资产（#10B981/#156B51 族，icons 三树同步 + images.ts 注册），verified 分支（:89）换用成功色素材。
- 修复类别：单页

### R12-L09-D08　P3 / 字号　批次 R12-B55
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__profile-extra__verification__real-name__bottom.png`（sha16=`c6f62c71199f714a`）
- 源码证据：`apps/client/src/subpackages/profile-extra/verification/real-name.vue:824`
- 理想图依据：无基准，依据=规范 §1.3 字体层级表：「正文 --fs-xl/2xl（15/16px）400–500 用途=正文 · 列表主文字」
- 现象：【上一轮修得不对】R11-L09-D17 把已认证信息行的值（帧上「林曦风」「110101**********1234」，本页唯一正文级数据）从 --fs-md 26rpx 升到 --fs-lg，帧上墨迹 ~14px；但该值行现取 `var(--fs-lg, 28rpx)`（.form-item__input :824，标签 :815 同档）仍是 §1.3 的 14px「说明」档，未到正文/列表主文字档 15/16px（--fs-xl/2xl 30/32rpx），且标签与值继续同档，主次依旧没拉开——只修了半档。
- 建议改法：值行（.form-item__input）font-size 升 `var(--fs-xl, 30rpx)`，标签保持 --fs-lg 形成主次；随档核对行高与 160rpx 标签列宽。
- 修复类别：CSS/token

## subpackages/setup/campus/index（2 条）

### R12-L12-D03　P3 / 颜色token　批次 R12-B56
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__campus__index__top.png`（sha16=`f33702f14cccecbd`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:316`
- 理想图依据：无基准，依据=规范文档 §1.2（--c-status-disabled #DCE5E2 置灰档）+ 同流程 schedule/interest/profile 三帧对照
- 现象：上一轮 R11-L12-D09 摘掉 :disabled 后（:309-314 注释自述），本帧 0/3 字段全空时主按钮「保存并继续」仍是满亮深绿可点态；而同流程 schedule 帧、interest 帧（R9-L12-D11 / R11-L12-D20 修后）同状态走 #DCE5E2 灰档、profile 帧走 submit-btn--disabled 灰档（profile:1475）——四步向导里唯独本步用满绿表示「未完成」，绿色承诺「现在能保存成功」，点击实际被 save() toast 拒绝。上一轮修的是「死按钮不可达」，修完后状态色口径与同域三页反向。
- 建议改法：按 profile `submit-btn--disabled` 口径改为「置灰仍可点」：`:class` 派生未完成档底色 `var(--c-status-disabled, #DCE5E2)`，保留 @tap 与 save() 既有 errIncomplete toast，不恢复 :disabled 死按钮。
- 修复类别：单页

### R12-L12-D04　P2 / 颜色token　批次 R12-B56
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__campus__index__bottom.png`（sha16=`c843c8a73819939e`）
- 源码证据：`apps/client/src/subpackages/setup/campus/index.vue:436`
- 理想图依据：无基准，依据=规范文档 §1.2（正文/说明文字对比 ≥4.5:1；3:1–4.5:1 为次级档）
- 现象：「完成校园认证，解锁同校专属匹配、校友圈子权限…」两行说明段按 `.value-card__text` 取 --c-brand-700 #1F8D6A、--fs-base 12px 常规字重，底为 `var(--c-bg-brand)` #E8FBF2（:429），帧上实测对比 3.84:1，落在 3:1–4.5:1 档；这是本卡唯一正文段落而非装饰色。
- 建议改法：文字色升一档取 `var(--c-brand-800, #156B51)`（对 #E8FBF2 ≈5.97:1，即 schedule:308 同族修法），底色不动。
- 修复类别：CSS/token

## subpackages/setup/interest/index（2 条）

### R12-L12-D09　P3 / 文案　批次 R12-B57
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__interest__index__top.png`（sha16=`e2dbce96f395f285`）
- 源码证据：`apps/client/src/subpackages/setup/interest/index.vue:127`
- 理想图依据：无基准，依据=组件规范 TagSelector.vue:170-172（组件自带 header「选择你的标签」+副标题）与页头 subtitle 的分工
- 现象：帧上同一屏竖排两组几乎同义的引导文案：页头副标题「选择你的兴趣，让匹配更懂你（至少 3 个）」（本页 :127）紧跟着组件自带 header「选择你的标签 / 选择最能代表你的标签，让别人快速了解你」（TagSelector:170-172）——两段标题+副标题相隔约一个行距、语义重叠，用户会当成两个不同步骤。
- 建议改法：给 TagSelector 加 `hide-header` prop（默认不传不影响既有消费页），本页 :133 传 true，只留页头一组文案。
- 修复类别：单页

### R12-L12-D10　P3 / 文案　批次 R12-B16
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__interest__index__bottom.png`（sha16=`67e3229e4e17ed4a`）
- 源码证据：`apps/client/src/components/profile/TagSelector.vue:220`
- 理想图依据：无基准，依据=组件规范 TagSelector.vue:179-182（已选区计数）与 :219-222（分组行计数）两处同源计数
- 现象：帧上同一屏两处计数：绿盒内「已选标签 已选 0/5」（TagSelector:179-182）与分组行右侧「兴趣 0/5」（TagSelector:220-222），同屏同值重复；且页头副标题承诺「至少 3 个」，两处计数都只表达上限 /5、不表达 3 的下限，0/3 与 0/5 时按钮同为灰，用户无从判断还差几个。
- 建议改法：已选区可见时隐藏分组行计数（或反之，二留一），并把计数键改为同时表达下限的既有口径（如「已选 n/至少 3」，locale 走并行车道登记，不新编上限常量）。
- 修复类别：单页

## subpackages/setup/profile/index（2 条）

### R12-L12-D01　P2 / 颜色token　批次 R12-B58
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__profile__index__top.png`（sha16=`42e276056158d5c7`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1639`
- 理想图依据：无基准，依据=规范文档 §1.2（--c-text-placeholder #9AA39F 用途仅 placeholder；常驻说明文字应取 --c-text-secondary/tertiary 档）+ §1.3 小字档
- 现象：照片墙标题行右侧常驻提示「最多 6 张，点击空位添加」按 `.media-photo-head__hint` 取 --c-text-placeholder #9AA39F、22rpx(11px)，帧上该行压白卡实测对比约 2.56:1，低于次级文字 3:1 档下限；同卡内头像说明行（:1620）上一轮已修为 --c-text-tertiary #6B7571（≈4.8:1），同一张卡两行说明取档不一。
- 建议改法：`.media-photo-head__hint` 颜色改 `var(--c-text-tertiary, #6B7571)`，与 :1620 头像说明行同档。
- 修复类别：CSS/token

### R12-L12-D02　P2 / 可达性　批次 R12-B58
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__profile__index__bottom.png`（sha16=`1278ff2a7ff88cbd`）
- 源码证据：`apps/client/src/subpackages/setup/profile/index.vue:1059`
- 理想图依据：无基准，依据=组件规范（同流程 schedule/index.vue:134 已修先例：字段名必须是常驻可见 .field-label，不能只靠占位文承载字段语义）
- 现象：「理想型画像」多行输入框（:1054-1071）没有任何可见字段标签——字段名只存在于 aria-label（:1065）与占位文「用关键词描述你期望的TA，如：…」（#9AA39F，压 #F3FAF6 约 2.4:1）；帧上该绿框直接贴在未来城市输入框下方，同卡内籍贯省份/籍贯城市/未来城市三栏上方都有可见 .field-label，唯此栏没有，与 schedule 页 R11-L12-D13 修掉的同象一致但本页漏改。
- 建议改法：在 :1054 view 上方按 schedule:134 同式补一行 `<text class="field-label">{{ t("setup.profile.labelExpectedPartner") }}</text>`（i18n key 已存在，不新造文案）。
- 修复类别：单页

## subpackages/setup/recommend-pref/index（2 条）

### R12-L12-D07　P2 / 颜色token　批次 R12-B59
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__recommend-pref__index__top.png`（sha16=`8f506df4546c1b8b`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:332`
- 理想图依据：无基准，依据=规范文档 §1.2（文字对比档：≥18.66px bold 才豁免 4.5:1）
- 现象：帧上选中态选项「12:00」「同校优先」的 14px/700 绿字按 `.option-item--active .option-label` 取 --c-brand-700 #1F8D6A，底为 `var(--c-bg-brand)` #E8FBF2（:330），实测对比 3.84:1——14px bold 不满足大字豁免、低于 4.5:1，且这是页面上唯一表达「当前选中值」的文字。
- 建议改法：选中态 label 色改 `var(--c-brand-800, #156B51)`（对 #E8FBF2 ≈5.97:1），边框/底色保持。
- 修复类别：CSS/token

### R12-L12-D08　P3 / 文案　批次 R12-B59
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__recommend-pref__index__bottom.png`（sha16=`1bbf2ceb8ae02bbd`）
- 源码证据：`apps/client/src/subpackages/setup/recommend-pref/index.vue:179`
- 理想图依据：无基准，依据=同流程其余四帧页头对照（profile/campus/schedule/interest 帧标题下均有一行灰色副标题）
- 现象：帧上页头「推荐偏好」大标题下没有副标题行，标题直接接「第 4/5 步」进度卡；AppShell 调用（:179）只传了 `:title` 未传 `:subtitle`，而同流程 profile「完善你的资料…」、campus「认证后解锁同校专属匹配…」、schedule「这里会驱动首页推荐和闲聊时段。」、interest「选择你的兴趣…」四帧都有该行，向导五屏仅此屏页头缺说明。
- 建议改法：:179 补 `:subtitle="t('recommendPref.pageSubtitle')"` 口径的既有 i18n 键（locale 归属并行车道，先在报告登记 key，勿自造正文）。
- 修复类别：单页

## subpackages/setup/schedule/index（2 条）

### R12-L12-D05　P2 / 素材缺失　批次 R12-B60
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__schedule__index__top.png`（sha16=`fe1de3dbda9628cf`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:113`
- 理想图依据：无基准，依据=组件规范 SetupProgress.vue（全流程进度组件）+ 同流程 profile:753 / campus:221 / recommend-pref:181 三帧均在屏
- 现象：本页是注册向导第 3 步（组件注释与 save() 跳转 RECOMMEND_PREF 均可证），但帧上标题下方直接是「偏好设置」卡——没有「第 3/5 步 / 时间安排」SetupProgress 进度卡；同流程其余四帧（profile 第 1/5、campus 第 2/5、recommend-pref 第 4/5）都有该卡，仅此页缺席，用户在此步看不到自己在五步中的位置。该页 imports（:15-24）也未引入 SetupProgress。
- 建议改法：在 :113 AppShell 内 `card-stack` 之前挂 `<SetupProgress :current-step="3" :variant="identity === 'non_student' ? 'non-student' : 'student'" />`（组件现成，LEGACY_STEP_MAP 已兼容旧编号）。
- 修复类别：单页

### R12-L12-D06　P2 / 颜色token　批次 R12-B60
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__setup__schedule__index__bottom.png`（sha16=`3d010e9d0248e46c`）
- 源码证据：`apps/client/src/subpackages/setup/schedule/index.vue:244`
- 理想图依据：无基准，依据=规范文档 §1.2「边框」档 --c-border-default #DDE3E0；同域 profile 帧输入框描边对照
- 现象：帧上「常去区域」「常用空闲时段」两个输入框只有 #F3FAF6 浅底、绕框一周取不到描边——`.field` 的 `border: var(--c-border-card)`（= 1rpx solid rgba(15,23,42,0.08)，design-variables.scss:541）压在同系浅底上近似不可见；同域 profile 输入框 R11-L12-D06 修后是 2rpx solid --c-border-default #DDE3E0（profile:1337，帧上清晰可见），同流程两页输入框描边档不一。
- 建议改法：`.field` 描边改 `2rpx solid var(--c-border-default, #DDE3E0)`，与 profile:1337 逐字同值。
- 修复类别：CSS/token

## subpackages/support/feedback/index（3 条）

### R12-L13-D01　P2 / 颜色token　批次 R12-B61
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__support__feedback__index__top.png`（sha16=`5675faf6e06e586f`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:660`
- 理想图依据：无基准，依据=全站设计规范与逐页设计稿说明.md §1.2（白字压 #36C99A 的既有否定口径，见 BottomActionBar.vue:105-108 同族实测）+ 组件规范（.chip--active）
- 现象：帧上选中分类 chip「反馈」底色实测逐像素 #36C99A（--c-brand 原值，y232..275、高 87rpx≈88rpx 高度已达标），但白字压 #36C99A 实算对比仅 2.11:1（L=0.4476），低于 3:1；本仓对白字主 CTA 的既定裁判尺是 brand-800 #156B51=6.45:1（LegalTextPage.vue:528-538、BottomActionBar.vue:108 已落地），同页同类控件两把尺。
- 建议改法：.chip--active 底色由 var(--c-brand) 改 var(--c-brand-700)（#1F8D6A，白字 4.14:1）不达标则同 BottomActionBar 口径取 var(--c-brand-800)，文字保持 --c-text-inverse。
- 修复类别：CSS/token

### R12-L13-D02　P2 / 可达性　批次 R12-B61
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`fd2186aceda2da7c`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:847`
- 理想图依据：无基准，依据=规范 §1.2 次级文字对比口径 + 仓内 AppShell.vue:334「≥4.5:1」自陈标准；组件规范 .history-header__btn-text
- 现象：帧上「反馈历史」卡内「历史记录」入口药丸（y470..512，高≈85rpx，热区已达标）文字实测最深墨 ≈#1F8D6A（--c-brand-700），底 #E8FBF2（--c-bg-brand，design-variables.scss:131），实算对比 3.87:1；24rpx/600 字重不享大字号豁免，差 4.5:1 半档——这是进反馈历史列表的唯一入口（goHistory，:367）。
- 建议改法：.history-header__btn-text 颜色降到 --c-brand-800（#156B51 压 #E8FBF2 ≈5.6:1），或药丸底改白 --c-bg-container 提开对比；药丸尺寸不动。
- 修复类别：CSS/token

### R12-L13-D03　P3 / 文案　批次 R12-B61
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__support__feedback__index__bottom.png`（sha16=`fd2186aceda2da7c`）
- 源码证据：`apps/client/src/subpackages/support/feedback/index.vue:577`
- 理想图依据：无基准，依据=组件规范（提示行语义）+ i18n 键真值 zh-CN.ts:3319
- 现象：帧上空态分支正确（spacer 占位、无 hint，R6-L15-D30 已落地）；但同一行的孪生分支把 v-if 写反——`submissions.length > 0`（非空态）时渲染的是 t("feedback.historyEmptyDesc")＝「提交反馈后将在此处显示」（zh-CN.ts:3319），此刻列表下方正印着真实提交记录，文案与画面自相矛盾；空态（本帧）反而不显示它。
- 建议改法：非空态 hint 换中性文案（如「共 N 条记录」）或删掉该行；「提交反馈后将在此处显示」只属于空态（且空态已由 EmptyState 主标题承担，可直接删键）。
- 修复类别：单页

## subpackages/tools/activities/detail（2 条）

### R12-L08-D05　P2 / 字号　批次 R12-B62
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__activities__detail__top.png`（sha16=`f4cb2c247f00829a`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:748`
- 理想图依据：无基准，依据=规范§1.3 正文档 --fs-xl/2xl 15/16px + R11-L08-D12 自述「正文级披露行」
- 现象：示例内容披露行「示例活动」（标题卡内描边浅底行）上一轮 R11-L08-D12 自述「提到正文级字号挂在标题下方」，但落地取 --fs-base（真值 24rpx=12.1px，design-variables.scss:562）＝§1.3 标签·时间戳档；帧上该行墨迹带 y=485..495 实测 11px，而同卡真正的正文「活动介绍」段（R11-L08-D13 已提到 --fs-xl 15px）墨迹带 y=602..613 为 12px，披露行比正文还小一档——上一轮修得不对：修复意图（正文级）与落地字号不符。
- 建议改法：.detail-sample-note__text 字号与 .detail-intro 同档提至 var(--fs-xl, 30rpx)，保持 --c-text-secondary 墨色（15px 下对比 7:1 不变）。
- 修复类别：单页

### R12-L08-D06　P3 / 间距　批次 R12-B62
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__activities__detail__bottom.png`（sha16=`a038a67e46b7bf62`）
- 源码证据：`apps/client/src/subpackages/tools/activities/detail.vue:873`
- 理想图依据：无基准，依据=规范§1.4 页边距 --page-padding(32rpx)=本页内容卡既有取档（R11-L08-D14 已归位）
- 现象：底部报名栏水平内衬取 --sp-4(16rpx≈8px)（:873），帧上「分享」钮左缘 x≈8、「立即报名」右缘 x≈369；而同页两张内容卡按 --page-padding(32rpx) 卡缘 x=18..360——同一页主操作栏与内容网格左右缘各差约 10px，两条边线不共线。
- 建议改法：.detail-action-bar 水平内衬由 var(--sp-4) 改 var(--page-padding)，按钮行与卡片网格左右缘对齐（总宽收窄 16px 由 flex 弹性吸收）。
- 修复类别：单页

## subpackages/tools/daily-question/index（2 条）

### R12-L07-D03　P2 / 可达性　批次 R12-B63
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__daily-question__index__top.png`（sha16=`91c4a30be4bb126f`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:369`
- 理想图依据：无基准，依据=规范文档 §1.4 触控下限口径（88rpx）+ 本任务书 P1/P2 热区条款；帧实测
- 现象：页头「返回」是纯文字钮（帧上字面 21×11px），样式只有 `min-width: 80rpx` + 纵向 `padding: var(--sp-2) 0`，实测热区约 80×44rpx——高度只有 88rpx 下限的一半；本页 navigationStyle=custom 无系统返回，游客锁定态下页内另有 .lock-back「返回」为替代出口，故按 P2 报。R10-L07-D03 只治了这一栏的颜色（文字已实测 #0D4F3B 深墨达标），热区从未被治。
- 建议改法：.dq-header__back 补 `min-height: 88rpx` 并纵向居中（对齐 AppShell .shell__back:359-360 同款 min-height/min-width 双 88rpx 口径）。
- 修复类别：单页

### R12-L07-D04　P3 / 字号　批次 R12-B63
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__daily-question__index__bottom.png`（sha16=`aca2af746c1fbb4b`）
- 源码证据：`apps/client/src/subpackages/tools/daily-question/index.vue:394`
- 理想图依据：无基准，依据=规范文档 §1.3「页面主标题 26–28px 700–800」；同域 love-center 页头实测对照
- 现象：页头标题「每日一问」取 --fs-2xl=32rpx=16px，帧上字面高实测 12px；同包二级页 love-center 走 AppShell --fs-7xl=56rpx=28px（帧上字面高实测 27px）——同域两页页头标题 16px/28px 两档并存，本页低于 §1.3 页头档下限 10px。R10-L07-D03 只裁了页头用墨，字号档未在销卡清单内。
- 建议改法：标题升至 --fs-7xl（56rpx）或同域裁定的页头档；若维持 16px 需在规范文档补「自定义导航栏标题」豁免档，二选一收口。
- 修复类别：单页

## subpackages/tools/help/index（2 条）

### R12-L07-D07　P2 / 文案　批次 R12-B64
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__help__index__top.png`（sha16=`8c1ba20797ef6e31`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:166`
- 理想图依据：无基准，依据=本行自身语义承诺（行标题「客服邮箱」+「复制」钮）；MP-R1-HELP-101 注释自证
- 现象：「客服邮箱」行（帧上 top/bottom 两帧同见）desc 绑定的是 t('help.serviceHours')=「服务时间：9:00-21:00」，真实地址 APP_CONFIG.SUPPORT_EMAIL（:79 被复制进剪贴板的那个常量）在页面上任何位置都不展示——行标题承诺邮箱、内容区给的是服务时间。用户拿不到：复制前后都看不到邮箱地址是什么，无法核验复制产物、也无法在别处手抄该地址。
- 建议改法：desc 或新增一行绑定展示 APP_CONFIG.SUPPORT_EMAIL 字面量（前端常量即真值，无需新建后端），「服务时间」口径可并入在线客服行。
- 修复类别：单页

### R12-L07-D08　P2 / 颜色token　批次 R12-B64
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__help__index__bottom.png`（sha16=`ee3f8056c7620f17`）
- 源码证据：`apps/client/src/subpackages/tools/help/index.vue:321`
- 理想图依据：无基准，依据=规范文档 §1.2 三级文本仅授权「弱说明」+ WCAG 4.5:1；帧实测（bottom 帧页脚全文可见）
- 现象：页脚服务承诺「若问题仍未解决，欢迎通过在线客服或意见反馈联系我们，我们会尽快回复你。」（--fs-xs 20rpx=10px 法务小字，bottom 帧实测完整可见）取 --c-text-tertiary #6B7571 直接压 --c-bg-page #EEF7F2 页底，对比 0.9610/0.2219=4.33:1 < 4.5:1——这是全文最有信息量的一句客服承诺，不是装饰性弱说明。R11-L07-D23 只治了该行被 home indicator 裁切（间距），用墨未治。
- 建议改法：.help-footer__text 提到 --c-text-secondary（#4A524E，压页底 ≈7.4:1）；字号维持 --fs-xs 法务档。
- 修复类别：CSS/token

## subpackages/tools/love-center/consulting（2 条）

### R12-L09-D01　P2 / 可达性　批次 R12-B65
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__consulting__top.png`（sha16=`eec854d6762878de`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:200`
- 理想图依据：无基准，依据=规范 §1.2（brand-700 #1F8D6A 用途仅「按压态 · 深色文字」，文字对比 ≥4.5:1 口径）+ 组件规范同型出口 visitors 空态按钮（visitors.vue:558 注释在册：白底文字取 --c-brand-800 实测 6.46:1）
- 现象：封存卡整页唯一出口「帮助与客服」的文字色取 `var(--c-brand-700, #1f8d6a)`（consulting.vue:200，brand-700 真值 #1F8D6A = design-variables.scss:17），压白底实测对比 4.14:1（相对亮度 0.2037），低于 4.5:1 正文字号口径；帧上按钮墨迹为绿字白底。同型既有口径（visitors 空态「编辑资料」）用的是更深一档的 --c-brand-800 #156B51（6.46:1 达标）——R11 新补的这枚出口没跟上。
- 建议改法：`.consult-sealed__action-text` 的 color 从 --c-brand-700 改 --c-brand-800（#156B51，白底 ≈6.5:1），与 visitors 空态出口同配方。
- 修复类别：CSS/token

### R12-L09-D02　P3 / 位置　批次 R12-B65
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__consulting__bottom.png`（sha16=`145ac2c37be4faa4`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/consulting.vue:74`
- 理想图依据：无基准，依据=组件规范 AppShell 全站统一页头口径（consulting.vue:13 注释自述「全站统一 AppShell（白底 + 居中标题 + 返回）」）
- 现象：同一车道 5 个二级页出现三种页头取档：本帧为 AppShell 大标题式（左置大标题「恋爱咨询课程」+「‹ 返回」胶囊，:74）；settings/verification/real-name 三帧为白底居中标题栏（real-name.vue:646 .nav-bar 88rpx + 居中 .nav-bar__title）；visitors 帧为手写左置行内标题（visitors.vue:255-266）。consulting.vue:13 自称 AppShell 是「全站统一」口径，但帧上其余 4 页均未归口，页头标题的横向位置/字号档在车道内互不成一轨。
- 建议改法：二级页页头归口 AppShell 单一来源（settings/verification/real-name/visitors 按文件所有权由各自修复批次迁移），本页保持 AppShell 不动。
- 修复类别：单页

## subpackages/tools/love-center/index（2 条）

### R12-L07-D05　P3 / 素材缺失　批次 R12-B66
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__index__top.png`（sha16=`c65fcdc3bb4901cb`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:30`
- 理想图依据：无基准，依据=规范文档 §1.1（视觉元素 100% 还原）+ R8-L07-D09 在册封存视觉策略（灰稿=封存信号）；帧实测
- 现象：四板块中两张开放卡的图标一彩一灰：恋爱咨询 DOUBLE_HEART 帧上饱和度实测 sat=154（粉彩），社交咨询 SPEECH 为纯灰稿（卡内图标区最高通道差实测 sat=2），与两张封存卡（BOOK/GRAD_CAP，saturate(0.2) 后 sat=11）在灰度上不可区分——开放/封存仅剩 2rpx #DCE5E2 描边（压白 1.29:1，低于非文本 3:1）加角标来区分。缺一张彩显版 SPEECH 素材。
- 建议改法：F1 素材车道补彩显版 SPEECH（与 DOUBLE_HEART 同烘焙口径），或在开放卡图标上不用灰稿资产。
- 修复类别：单页

### R12-L07-D06　P3 / 字号　批次 R12-B66
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__index__bottom.png`（sha16=`c65fcdc3bb4901cb`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/index.vue:115`
- 理想图依据：无基准，依据=规范文档 §1.3 页头档 26–28px；同包 daily-question 页头实测对照（同域两页取档不一，P3 定义内）
- 现象：本页经 AppShell(:115) 渲染的页头标题「恋爱中心」为 --fs-7xl=28px（帧上字面高实测 27px），而同包 daily-question 自绘页头标题 16px（帧上字面高 12px）——同一 tools 包两个二级页页头两档并存，且 daily-question 低于 §1.3 页头档。本卡落在本页作对照锚点（本页是达标方，取档不一一并登记，避免与 R12-L07-D04 重复计数）。
- 建议改法：以本页 AppShell 页头为同域基准，daily-question 页头标题收成同档（或按 D04 的豁免档方案在规范侧收口）。
- 修复类别：单页

## subpackages/tools/love-center/mbti（2 条）

### R12-L08-D09　P2 / 颜色token　批次 R12-B67
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__mbti__top.png`（sha16=`233f74b58f90058c`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:435`
- 理想图依据：无基准，依据=规范§1.2 + 本项目判例 R10-L08-D14/R11-L08-D27（同算术档 4.14:1 在 activities 状态签上被判不达标并改 --c-brand-800）
- 现象：16 枚类型码（ENFP…ISTJ）与 4 枚维度码（E/I…J/P）是网格内唯一类型识别文字，取 --c-brand-700 #1F8D6A（:435/:401）12px(--fs-base)/700：压白卡 1.05/0.25381=4.14:1、压维度胶囊底 #E8FBF2 仅 0.97567/0.25381=3.84:1（后一算式即 activities/detail.vue:730 同式），均低于 4.5:1 且无大字号豁免；帧上 ENFP 码最深墨 (48,150,117) 与 #1F8D6A 加 AA 吻合。
- 建议改法：两处 code 色按 activities/detail.vue:734 既有口径改 var(--c-brand-800, #156B51)（压白 6.45:1、压 #E8FBF2 6.00:1），20 处一并替换。
- 修复类别：CSS/token

### R12-L08-D10　P3 / 颜色token　批次 R12-B67
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__mbti__bottom.png`（sha16=`5350b700ee97fa26`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/mbti.vue:393`
- 理想图依据：无基准，依据=规范§1.2 令牌可辨性 + 同项目判例 R11-L08-D02（search 页「控件边界 0 像素」判为缺陷并换可辨配方）
- 现象：4 枚维度胶囊底 --c-bg-brand #E8FBF2（:393，帧上采样 (20,172)=(232,251,242)）直接落在页底 #EEF7F2（(370,172)=(238,247,242)）上，ΔRGB≈(6,4,0)、对比 ≈1.02:1——胶囊形边界 0 像素，读成一串散文字，与 R11-L08-D02 在 search 页判掉的同象一致（该处判例给的是换可辨浅底+描边）。
- 建议改法：胶囊改 R11-L08-D02 同配方：底 --c-bg-surface(#F3FAF6)+描边 --c-border-default(#DDE3E0)（若仍贴白卡则底用白 + 描边），或至少补 --c-border-default 描边使形状可辨。
- 修复类别：CSS/token

## subpackages/tools/love-center/nearby（2 条）

### R12-L08-D07　P3 / 可达性　批次 R12-B68
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__nearby__top.png`（sha16=`7f9646f614a11751`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:352`
- 理想图依据：无基准，依据=组件规范 AppShell.vue:334 自陈触控下限 88rpx + nearby.vue:351 行内自陈同一把尺
- 现象：「看看全部推荐」（页尾批量出口，:231）源码声明 min-height:88rpx，但 R12 现帧实测按钮包围盒 y=761..798 高仅 38px≈76rpx（同帧缩放基准：三枚动作钮声明 116rpx 实测 56px，1rpx≈0.5px 成立）——声明未兑现（被父级 flex 链压缩），热区差 12rpx。屏内还有卡片滑动这个替代出口故判 P3。
- 建议改法：给 .nearby-tail__more 补 flex-shrink:0（或把 min-height 提为 height 声明），并排查 .nearby-tail 外层 flex 链使 88rpx 真正兑现。
- 修复类别：单页

### R12-L08-D08　P3 / 字号　批次 R12-B68
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__love-center__nearby__bottom.png`（sha16=`2b47276649595a91`）
- 源码证据：`apps/client/src/subpackages/tools/love-center/nearby.vue:266`
- 理想图依据：无基准，依据=规范§1.3 页面主标题档 26-28px 与同域判例 R7-L08-D07（activities/detail 同角色导航标题已升 --fs-5xl 22px）
- 现象：本页导航标题「附近的人」取 --fs-xl(30rpx=15px)（:266，帧上墨迹带 y≈68..84 约 13px 量级吻合），而同域工具页 activities/detail 的同角色 .detail-header__title 经 R7-L08-D07 升到 --fs-5xl(44rpx=22px)——同域两页导航标题取档不一，本页塌到正文档。
- 建议改法：.content-header__title 字号升 var(--fs-5xl, 44rpx) 与 activities/detail 对齐（标题变宽后需同步核 :262 胶囊避让注释的右缘余量）。
- 修复类别：单页

## subpackages/tools/search/index（4 条）

### R12-L08-D01　P2 / 颜色token　批次 R12-B69
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`5322f695da94fb37`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:589`
- 理想图依据：无基准，依据=规范§1.1「主题底色统一浅绿 #EEF7F2，不得出现白/灰断层」
- 现象：帧上顶部整条头部带（状态栏+搜索行 y=0..105，采样 (200,100)=#FFFFFF）与分组条带（.search-tabs，index.vue:840 同引 --c-bg-container 白底）都是纯白，y≈160 以下页身才是 #EEF7F2（采样 (200,200)=(238,247,242)），页内形成约 165px 高的白/绿断层带，违反 §1.1 验收定论。
- 建议改法：.search-header(:589) 与 .search-tabs(:840) 底色由 --c-bg-container 改引 --c-bg-page（#EEF7F2），分组签未选中态保持 --c-bg-surface 浅底+描边即可继续与底色区分。
- 修复类别：CSS/token

### R12-L08-D02　P2 / 颜色token　批次 R12-B69
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__search__index__top.png`（sha16=`5322f695da94fb37`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:882`
- 理想图依据：无基准，依据=规范§1.2「主色 #36C99A」+本项目判例 R10-L08-D14（同算术 2.06:1 判「几乎读不出来」）
- 现象：选中分组签「用户」为页内主切换控件，帧上钮面实测 #36C99A（采样众数 (54,201,154)，1281 px 命中），标签却是裸字面量 #ffffff（index.vue:882 写死，非 --c-neutral-0），实测白墨 72 px 压 #36C99A = 2.10:1，13px(--fs-md)/600 无大字号豁免，低于 4.5:1 且低于 3:1；同帧未选中签墨色走 --c-text-primary 15.9:1，同排两档。
- 建议改法：选中档标签色按同项目 R9/R10 收敛口径改 --c-brand-800（#156B51 压白 6.45:1 的反向用法不成立时，可将选中钮面改 --c-brand-100/#D1F5E7 浅底 + 墨色 --c-brand-800 文字），并把 #ffffff 字面量归位 --c-neutral-0。
- 修复类别：CSS/token

### R12-L08-D03　P3 / 圆角　批次 R12-B69
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`5322f695da94fb37`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:690`
- 理想图依据：无基准，依据=规范§1.4 圆角令牌阶梯 --r-sm→full = 4/8/12/20/24/32/9999rpx + §1.1 规则3「禁止私有色值」
- 现象：同页圆角全走裸值不引令牌：预检索校名胶囊 30rpx（:690，帧上「北京大学」等 8 枚）、热搜/历史条 30rpx（:743/:773）、搜索框 36rpx（:609）、结果行 18rpx（:897/:937/:954）——18/30/36 三档均不在 §1.4 阶梯内（最近邻 20/32），与同页返回键(:552)、分组签(:853) 的 --r-full 令牌引法同页两套写法。
- 建议改法：胶囊类（30/36rpx，视觉即全圆）统一改 --r-full；行容器 18rpx 归到 --r-lg(20rpx) 档，逐处删裸值。
- 修复类别：CSS/token

### R12-L08-D04　P3 / 可达性　批次 R12-B69
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__search__index__bottom.png`（sha16=`5322f695da94fb37`）
- 源码证据：`apps/client/src/subpackages/tools/search/index.vue:643`
- 理想图依据：无基准，依据=组件规范 AppShell.vue:334 自陈触控下限 88rpx（同页 .search-tab:848、.search-back 已按此执行）
- 现象：「取消」是裸 <text>（:301-303），样式块（:643-663）只有字号/颜色/max-width，无 padding 无 min-height；帧上墨迹包围盒 y=61..80 实测高 19px≈38rpx，不足 88rpx 热区下限的一半，且墨迹即热区（无透明外扩）。有替代出口（左侧返回键同动作）故判 P3。
- 建议改法：.search-cancel 补 min-height:88rpx + 负 margin 纵向居中（或 padding: 0 var(--sp-3) 配 align-self:stretch），热区到位而墨迹位置不变。
- 修复类别：单页

## subpackages/tools/security/index（3 条）

### R12-L07-D09　P2 / 尺寸比例　批次 R12-B70
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`c773293474982a0d`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:640`
- 理想图依据：无基准，依据=徽标（pill/tag）单行语义 + §1.4 圆角令牌口径；帧实测
- 现象：首条设备行「手机号登录 · iPhone 12/13 (Pro)」的「当前设备」徽标被长机型名挤到内部折行，帧上渲染成「当前设」+「备」两行（徽标区高实测约为单行徽标两倍），主标题同步折成两行。badge(:981-987) 无 white-space:nowrap，外层 label-row 也无收缩/省略策略——徽标作为状态标记被拆词破相。
- 建议改法：.sec-item__badge 补 `white-space: nowrap; flex-shrink: 0`，.sec-item__label 补 min-width:0 + ellipsis，让长机型名截断、徽标保形单行。
- 修复类别：单页

### R12-L07-D10　P2 / 颜色token　批次 R12-B70
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__security__index__top.png`（sha16=`c773293474982a0d`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:983`
- 理想图依据：无基准，依据=规范文档 §1.2 对比门槛 + R11-L07-D21 在 help 页对同款配色的在册修法；帧实测
- 现象：「当前设备」徽标文字取 --c-brand-600 #2AAE83（帧上最深采样 #25AC80），底取未注册令牌 var(--c-tint-brand, #E8FAF3)（design-variables.scss 无 --c-tint-brand 定义，帧上实测底 #E8FAF3=私值兜底生效），对比 0.9756/0.3740=2.61:1——连非文本 3:1 都不过，11px 标签文字读不出。同一配色（brand-600 压 #E8FAF3=2.59:1）在 R11-L07-D21 已于 help 页「复制」钮被判不达线并改成 --c-brand-800，本页这枚未在 R11-B77 销卡清单内。
- 建议改法：与 help 页同案：文字改 --c-brand-800 #156B51（压 #E8FAF3 ≈6.0:1），底改已注册的 --c-bg-brand，去掉未注册令牌引用。
- 修复类别：CSS/token

### R12-L07-D11　P2 / 文案　批次 R12-B70
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__security__index__bottom.png`（sha16=`38ab4b65fad6d3af`）
- 源码证据：`apps/client/src/subpackages/tools/security/index.vue:639`
- 理想图依据：无基准，依据=本页自述（:7 登录设备管理 real 走 GET /auth/devices，下线为吊销会话的危险操作）；帧实测
- 现象：bottom 帧设备列表四行名称为「手机号登录 · in-a」「· vice」「（无名）」「· udit」，top 帧另有「· -R11」「· -R10」——:639 直接渲染后端 /auth/devices 的 device 字段，内容是 UA/标识串碎片而非可读设备型号（唯一可读的「iPhone 12/13 (Pro)」来自前端 uni.getDeviceInfo 的当前设备行）。用户拿不到：无法凭名称辨认哪台设备是自己，仅有的危险操作「下线」（吊销会话）失去决策依据。
- 建议改法：后端 /auth/devices 回传登录时采集的真实设备型号字段（缺什么：devices 表的 device/model 列现无规范化真值），前端按真字段渲染；无真值时回退展示「未知设备 + 时间」而不是标识碎片。
- 修复类别：需新建目标功能

## subpackages/village/village/index（2 条）

### R12-L02-D08　P3 / 素材缺失　批次 R12-B03
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__index__top.png`（sha16=`e3af9d02b4220018`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:127`
- 理想图依据：无基准，依据=deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §2 对账表（village/index.vue 无对应理想图）+ src/components/common/LockScreen.vue 组件注释（:122-124 头像素材须为「人像裁切」以支撑「和你一样的同学在寻觅」叙事）
- 现象：锁定页中央圆形锁标下方左右两枚头像气泡在帧上呈深色模糊图块（左≈深绿黑团块、右≈暗底竖形亮条，均色约 #3C3A21 档），读不出人像——组件注释 :122-124 自述旧素材（avatars/avatar-1.jpg 航拍树冠）正是这个观感并已改绑 PEOPLE.AVATAR_1/2（:127-128），本轮帧上渲染出的仍是暗色非人像图，「和你一样的同学在寻觅」叙事不成立，属上一轮改绑后画面仍未对齐。
- 建议改法：核查 PEOPLE.AVATAR_1/2 实际指向的素材文件（当前渲染结果即暗色杂图），换成真实人像裁切档素材。
- 修复类别：单页

### R12-L02-D09　P1 / 可达性　批次 R12-B03
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__index__bottom.png`（sha16=`390736db0f053ca0`）
- 源码证据：`apps/client/src/components/common/LockScreen.vue:184`
- 理想图依据：无基准，依据=src/components/common/LockScreen.vue 组件规范（:8「提供×关闭…与『先逛逛公开内容』备选路径」）+ 规范文档 §2 对账表（该页无理想图）
- 现象：本帧（bottom 滚动后）与 top 帧画面完全一致——整页只有「完善资料」锁定页，村社频道/帖子流零内容；唯一备选路径「先逛逛公开内容」按组件实现 :184 是「切换到公开 Tab（匹配推荐页）」，点了会离开村社，村社公开帖子没有任何站内可达入口。用户拿不到：已登录未完善用户在村社页看不到任何一条村社公开内容，也无路径可达。上一轮 R11-B80 加的正是这条备选路径，未兑现「公开内容」标签承诺——同轴（可达性）报「上一轮修得不对」。
- 建议改法：短期把链接文案诚实化（如「先去逛逛匹配推荐」）；若产品要求真「村社公开内容」，需新建未完善用户的帖子流公开只读态（依赖帖子接口公开可读，另行立项）。
- 修复类别：单页

## subpackages/village/village/publish（2 条）

### R12-L02-D10　P3 / 文案　批次 R12-B74
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__publish__top.png`（sha16=`63fa704ce0aabdd4`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:856`
- 理想图依据：素材/理想效果图/发布帖子页面.png 正文计数位（「0/1000」）
- 现象：正文字数计数帧上为「12/500」（:856 渲染 {{ currentLength }}/{{ MAX_CONTENT_LENGTH }}，:23 从 stores/village 引入，值 500，:21 注释载明与 store 校验同源），理想图计数位为「0/1000」——上限差一倍。正文输入框内「QAna97tPUB34」为采集脚本注入的测试文本，不计缺陷。
- 建议改法：把上限真值提至 1000：需同步 stores/village MAX_CONTENT_LENGTH 与服务端发布校验（后端同限确认后才可改）；只改 :856 的显示数字即造假，不做。
- 修复类别：需新建目标功能

### R12-L02-D11　P2 / 需新建　批次 R12-B74
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__village__village__publish__bottom.png`（sha16=`5ecf0a03a9da364c`）
- 源码证据：`apps/client/src/subpackages/village/village/publish.vue:274`
- 理想图依据：素材/理想效果图/发布帖子页面.png 底部工具条首项（「图片 / 视频」）
- 现象：底部工具条首项帧上为「图片」，选取只走 chooseImages（:274，count 上限 POST_MAX_IMAGES），全页无视频选取/上传/缩略图链路（:393 注释载明帖子表列仅 title/content/images 等，无视频列）；理想图同位为「图片 / 视频」。文字+图片发帖主链路可用，视频是理想图承诺的能力整段缺席，故 P2 不升级 P1。底栏第 5 项「谁可以看」替换理想图「更多」是既往裁决（:411-413 注释），不重报。
- 建议改法：后端帖子表加视频列与上传接口后，前端换 chooseMedia 支持视频选取/压缩/封面，工具条文案同步「图片 / 视频」。
- 修复类别：需新建目标功能

## 无缺陷（CLEAN）帧（4 张）

> 这些帧泳道逐轴量过、判"没有可测缺陷"。轴名与读数照卡原样。

### R12-L04　圈子主页下半屏（circle-home bottom）
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__circles__circles__circle-home__bottom.png`（sha16=`36b687477cd5f0e8`）
- 依据：素材/理想效果图/圈子详情，摄影圈参考.png
- 逐轴读数：位置=吸顶页签行钉在帧顶 y=0 且自带状态栏内衬，「动态」绿字下划线位于状态栏带下方；底栏「加入圈子」实心胶囊+笔形 FAB 与理想图底部操作栏同构; 尺寸比例=帖内头像 ≈40px(≈80rpx)圆、单图卡全宽等比无拉伸; 颜色token=「查看全部话题 ›」取 --c-brand-800（circle-home.vue:1318-1319，帧上深绿档），评论数灰档，无越板色; 圆角=feed 卡 ≈16rpx，与理想图帖子卡一致; 字号=帖名 ≈17px(34rpx) 粗体、正文 ≈14px(28rpx)，落在正文档; 间距=卡间距 ≈12px(24rpx) 均匀，页签带与首卡无叠压; 素材缺失=帖无点赞位/校名徽章/话题标签——后端无 likeCount/likedByMe 列、无帖主校名列，按 §12 撤承诺口径不渲染（circle-home.vue:173-174、298-299 在册），非素材丢失; 空态文案=本帧有内容不涉及，feed 以「查看全部话题 ›」收束（zh-CN.ts:3739）与理想图链路一致; 层级遮挡=吸顶带不透明底压住滚过的「💬 0」卡尾无透印，底栏不遮链接（帧上链接完整可见）; 可达性=「查看全部话题」热区为整条白条 padding 24rpx（circle-home.vue:1305，全宽×≈84rpx），另有 FAB ActionSheet 同链路（circle-home.vue:446）; 文案=「查看全部话题」与理想图措辞一致; 需新建=0 个新缺口：在册缺列 2 项（likeCount/likedByMe、帖主校名列，登记于 circle-home.vue:173-174、298-299 撤承诺注释），本帧假计数/假头像 0 处（点赞位 0 个、头像行 0 行）

### R12-L04　校园圈列表下半屏（hub bottom）
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__campus__campus__hub__bottom.png`（sha16=`04f595db6b3f590f`）
- 依据：素材/理想效果图/校园圈.png
- 逐轴读数：位置=「未认证」徽章紧跟校名不压右侧 CTA（7 字校名「上海交通大学圈」徽章完整，R11-L04-D18 修后 hub.vue:743-745），CTA 右缘留 ≈12px 页边; 尺寸比例=校封图 ≈88px(≈176rpx) 方形圆角，与理想图卡内封面同档; 颜色token=未认证=淡紫底紫字（hub.vue:799-813 在册对比度 5.99:1–6.48:1），CTA=白底绿描边绿字（hub.vue:876 口径），帧上读数一致; 圆角=卡 ≈16rpx、封面 ≈12rpx、CTA 全圆角; 字号=校名 ≈17px(34rpx) 粗体、「未认证」≈11px(22rpx)，与理想图层级同构; 间距=卡间距 ≈12px(24rpx)，紧凑单行布局上下留白均分; 素材缺失=卡内无「3.2k 位同学 · 2.8w 条动态」「等 342 位同学」行——该行原是按校 id 硬编码的字面量表，R11-L04-D15 已按无后端列整块撤下（hub.vue:351），合法撤承诺; 空态文案=本帧列表满、空态 0 处：校圈卡 5 张整卡（清华/人大/复旦/上海交通/同济）+ 首卡卡尾，帧上空态文案位 0 个; 层级遮挡=徽章/校名/CTA 三者无重叠，页头仅「校园圈」标题+返回无内容透印; 可达性=「申请加入」胶囊 ≈152×88rpx（hub.vue:903 R2b-L05-D16 档），「查看更多校园圈 ⌄」列表尾出口在帧底完整可点（hub.vue:360）; 文案=「查看更多校园圈」整句与理想图一致（hub.vue:177 词条方案），「未认证」措辞与理想图一致; 需新建=0 个新缺口：在册缺列 3 项（同学数/动态数/距离列，hub.vue:351 为 R11-L04-D15 撤下的字面量行），本帧假计数 0 处（「3.2k 位同学」类读数 0 个）

### R12-L08　heart-signals 未登录门态（LockScreen 完整形态；比对依据=规范§1 全局规范 + LockScreen.vue:344-458 几何声明）
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__heart-signals__index__top.png`（sha16=`8ea2c528c83a1545`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=CTA 钮 x=50..328 实测中点 189 与屏宽 378 中点 189 重合（水平居中），关闭圆钮圆心 (32,72) 在状态栏时刻文字带 y≤25 之下；尺寸比例=CTA 包围盒 y=602..646 实测高 44px=88rpx（LockScreen.vue:797 min-height:88rpx 声明兑现）；颜色token=CTA 钮面众数色 (21,107,81)=#156B51 即 --c-brand-800（白字 6.01:1，LockScreen.vue:757 算式），装饰爱心众数色 (255,107,129)=#FF6B81 即 --c-romance-500（左颗命中 298px/右颗 113px，R11 修前 #EF4444 已不在帧上）；圆角=CTA 端部全圆（半径=高 44px 之半 22px），关闭钮正圆实测直径 42-44px=88rpx（LockScreen.vue:453-454 声明兑现）；字号=主标最深墨 (19,22,20)≈--c-text-primary #1A1E1C，墨迹带 y=352..370 高 18px=--fs-3xl 区块标题档；间距=CTA 下缘 y=646 至链接墨迹上缘 y≈670 间隔实测 24px，与同页权益行节距 26px 同量级；素材缺失=装饰元素 6 处全出图（锁形 1、对勾徽章 1、头像 2、爱心 2，爱心像素命中 298px+113px），0×0 空槽 0 个；空态文案=门态主文案「登录后解锁心动信号」+三条权益均为登录后既有能力，无真相源计数 0 个；层级遮挡=关闭钮 (y=53..95)、状态栏时刻 (y≤25)、右上胶囊 (x≥294, y=58..90) 三者互不叠印；可达性=关闭钮实测直径 42-44px≈88rpx 且 CTA 高 44px=88rpx，双出口热区达标；文案=「立即登录并完善」「完成登录授权与基础资料填写」逐字无错别字，全半角混排 0 处；需新建=0 个（12 轴逐项实测均由既有令牌/既有组件承接，本 CLEAN 卡无 D0x 缺列登记）

### R12-L08　heart-signals 未登录门态（下半屏：权益行/链接/脚注；比对依据=规范§1.2/§1.3 + LockScreen.vue:789-858）
- 帧：`tmp/qa/frames/R12/real-f0677920/subpackages__tools__heart-signals__index__bottom.png`（sha16=`20b8c2629daa9be2`）
- 依据：deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md
- 逐轴读数：位置=「先逛逛公开内容」墨迹中心 x≈188 与屏中轴 187.5 重合，脚注墨迹带 y=726..742 距屏底 72px（LockScreen.vue:844 声明 112rpx=56px+安全区同量级）；尺寸比例=链接按 LockScreen.vue:789-797 配方 min-height:88rpx+纵向 --sp-6，帧上墨迹带 y≈670..690 高 20px 居中无压缩；颜色token=链接最深墨 (36,118,92)≈--c-brand-800 #156B51 压页底 #EEF7F2 实测 ≈5.7:1（LockScreen.vue:815 算式 5.75:1 吻合），脚注最深墨 (82,89,85)≈--c-text-secondary #4A524E；圆角=权益行行首对勾为圆形图标（行首图标盒 ≈15px 见方正圆轮廓），本帧下半屏方角容器 0 个、可点容器 CTA 端半径=高 44px 之半 22px；字号=权益行墨迹带实测 ≈15px=--fs-xl（LockScreen.vue:734 --fs-xl 兑现），脚注 ≈12-13px=--fs-base（LockScreen.vue:857 兑现）；间距=权益三行节距实测 26px（行高 15px+间隙 11px），三行等距；素材缺失=权益行 3/3 行首对勾图标出图（三行墨迹带 y≈440..455、466..481、492..507），0×0 空槽 0 个；空态文案=权益行 3 条均为登录后既有能力，「12人已报名」型无真相源数字 0 个；层级遮挡=脚注墨迹止于 y≈742 与底部手势条 y≥790 无交叠；可达性=链接命中盒 LockScreen.vue:790-797 声明 88rpx、帧上无压扁迹象，CTA 实测高 44px；文案=「解锁精准匹配推荐」「双向心动，从这里开始」「发起私信与匿名聊天」「资料越完善，匹配越精准，曝光机会越多」逐字无错，错别字 0 个；需新建=0 个（下半屏 12 轴逐项实测均由既有令牌/既有文案承接，本 CLEAN 卡无 D0x 缺列登记）

