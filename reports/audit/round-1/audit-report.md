# Round 1 审计报告（R1 · 2026-09-24 整理落盘版）

- **范围**：微信小程序客户端（apps/client）主包 6 个 tab 页 + 注册链路 + 村口/圈子/校园/聊天/匹配/发布等分包页簇 + tools/profile-extra/market 封存页簇（次要20~26 组）。后端仅在与前端契约交叉处对照（以前端证据为限）。
- **本报告性质**：书记员-R1 按 2026-09-24 任务给定来源清单整理落盘；**数据仅来自清单内来源**（code-findings 27 / findings 27 / findings-req 26 / interact-judge 27 / regression 21 / page-compare 27 / baseline 历史清单 / reports/screenshots 本轮目录 / 任务给定覆盖记录）。书记员未重跑任何交互用例、未重拍截图、未读取 reports/audit 下其他轮次（round-2~5、R6~R13）结论文作为依据；历史线索仅用 baseline/historical-issues.md 与任务给定两条（R13「三图相同」线索、MP-R2-PAGES-LOGIN-INDEX-001）。
- **代码基线**：HEAD aefd8a72（git rev-parse 本会话实测）；来源文件内部声明口径见各分节（findings evidenceValidation：screenshot-manifest/exec-results gitSha=aefd8a72=当前 HEAD ✅；round-1-interact 内 09-20 编号系列（00~21b）为过期证据已排除——为视觉审查员原文声明，书记员未复跑核验）。

## 一、数据来源与规模（本会话逐一实读统计）

| 来源 | 份数 | 规模（实读统计） |
|---|---:|---|
| reports/audit/round-1/code-findings/ | 27 | 发现 417 条（P1×47、P2×52、P3×170、P4×143、P0×5） |
| reports/audit/round-1/findings/（含 26 份 -req） | 27+26 | 视觉/覆盖线发现 143 条；需求线发现 141 条 + pageCompares 65 页 |
| reports/audit/round-1/interact/*-judge.json | 27 | 用例 1283 条（✅249/❌35/⚠️999）+ 交互层发现 88 条 + 无法验证清单 1002 项 |
| reports/audit/round-1/regression/ | 21 | 核对 117 条 + 立项 20 条 |
| reports/audit/round-1/page-compare/ | 27 | 每页需求/使用对照 md（结构见第三节） |
| reports/audit/baseline/historical-issues.md | 1 | 系统性主题 17 个 + 全量历史清单（514 行） |
| reports/screenshots/round-1{,-after,-interact,-tour} | 4 目录 | 3892 个文件（逐目录清点见 screenshot-matrix.md） |

## 二、总量结论

- 五个发现类来源合计 **809 条记录（按 ID 去重 784 个）**：级别 P1×100、P2×208、P3×316、P4×180、P0×5；状态 待修复×674、已验证×16、已修复待终验×92、保留×26、已修复×1。
- 代码审查（A2/Layer A 只读）：**417 条**（P1×47、P2×52、P3×170、P4×143、P0×5）；状态 待修复×314、已验证×11、已修复待终验×83、保留×8、已修复×1。
- 视觉/覆盖审查（A3）：**143 条**；需求对照（A4）：**141 条**；两类 27+26 份文件的逐页「13 项举证」覆盖记录与观察原文见第四节。
- 交互取证判定（A6 仲裁）：**1283 条用例**，✅ 符合 249（19%）、❌ 偏差 35、⚠️ 无法验证 999；交互层补充发现 88 条。无法验证主因：automator 输入/手势通道限制、mock 已登录自动前进致用例前置不可达、执行侧故障（详见第五节边界声明与 interaction-matrix.md 各页 unverifiable 清单）。
- 历史回归核对：**117 条**，粗分 未复发×97、证据不足×2、保留×2、已复发×11、仍开放×4、其他×1（原文逐条见 regression-report.md）。

### P0 全量（5 条，含全部来源）

| ID | 来源 | 页面 | 状态 | 问题（摘要） |
|---|---|---|---|---|
| MP-R1-VILLAGE-INDEX-112 | code-findings | subpackages/village/village/index | 已修复待终验 | 【回归核对：修复在位】搜索框右端伸进微信胶囊下方被遮挡（历史 P0，对应线索 MP-R1-VILLAGE-002）。头部行 padding-right = var(--capsule-right, 7px) + 112px（R3 轮由 104px 加至 112… |
| MP-R1-CIRCLES-INDEX-001 | code-findings | subpackages/circles/circles/index | 已修复待终验 | 【回归核对 MP-R1-CIRCLE-004「统计行半字硬裁」+ R21 375px 再犯】代码层确认修复在位，与既有 MP-R1-CIRCLES-R001（次要18.json）结论一致：①省略号移到文本节点自身——.circle-card__count 自带… |
| MP-R1-MATCHING-001 | code-findings | subpackages/discover-extra/discover/matc… | 已验证 | 回归核对历史线索 MP-R3-MATCHING-001「匹配页『打不开』」：代码层证伪维持，非缺陷。无上下文进入 matching（无 pendingCardId/pendingAction 且 URL 无 cardId/action/userId）时的「20… |
| R13-CHAT-409 | code-findings | subpackages/chat/chat-session/index | 已修复待终验 | 【ask 历史线索回归核对】get-or-create 稳定幂等键→二次进会话 409 IDEMPOTENT_CONFLICT 整页只剩后端技术串：代码层验证修复本体已在工作树（未提交，git log -S "idem-conv" 无命中、git diff 可… |
| MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-007 | code-findings | subpackages/chat/official-chat/index | 已修复待终验 | 回归核对历史线索 MP-R1-OFFICIAL-003（P0：最后一条消息被输入栏截断，R21 同病复发后改 scroll-into-view 底部锚方案）：代码层验证修复已正确落地。① 底部锚点节点存在于 scroll-view 末尾（:502-503 <v… |

### P1 全量（100 条，含全部来源）

| ID | 来源 | 页面 | 状态 | 问题（摘要） |
|---|---|---|---|---|
| MP-R1-PAGES-LOGIN-INDEX-004 | code-findings | pages/login/index | 待修复 | 「手机号快捷登录」（getPhoneNumber）在真实后端 + 未登录场景下，页面级 401 兜底（toast + 展开手机号表单，MP-R1-LOGIN-003 修复）会被 http 层通用 401 分支的 reLaunch 重载登录页摧毁：展开的表单在 … |
| MP-R2-PAGES-LOGIN-INDEX-001 | code-findings | pages/login/index | 已验证 | 历史问题线索（R2）复核：密码输入框 type="password" 非法值（mp 不支持，密码明文显示）——代码层验证：已修复且无回归。当前代码为 type="text" + :password="true"（uni-app 规范的布尔密文写法），全文件无 … |
| MP-R1-PAGES-HOME-INDEX-018 | code-findings | pages/home/index | 待修复 | MP-R3-PAGES-HOME-INDEX-001 复发（回归）：TodayRecommendationCard 的 photoFailed 重置 watch 写在 defineProps 之前，编译产物中 watch getter 在注册时立即求值，此时 … |
| MP-R1-PAGES-HOME-INDEX-001 | code-findings | pages/home/index | 已修复待终验 | 回归核对（上一周期 INDEX-001 InviteBanner「去邀请」CTA 静默失效）：代码层确认已修复——首页 switchTabWithQuery 写入 storage 桥接（带路径匹配防跨 Tab 误消费），profile 页 onShow 消费 … |
| MP-R1-HOME-REG-AGG | code-findings | pages/home/index | 已修复待终验 | 回归核对汇总（MP-R1-HOME-REG-007/009/010/011/012/013/014/015/016/018 十项，逐项代码层复核，不依赖历史报告表述）：修复实现全部仍在位——①四色底：RelationActivity.vue:143-154 粉… |
| MP-R1-HOME-REG-017 | code-findings | pages/home/index | 保留 | 回归核对（MP-R1-HOME-REG-017 / R12-IND-HOME-001 首页偶发白屏，连 TabBar 全无）：代码层复核维持原判定——代码侧防御均在位（page height:auto + .home-page display:block/fl… |
| MP-R1-PAGES-NEARBY-INDEX-001 | code-findings | pages/nearby/index | 已修复待终验 | 回归核对线索「未登录用户（real）进入附近页 onLoad 无条件打受保护接口 → 401 强踢登录页」：当前代码已修复。受保护数据源拉取统一收敛为 canFetchProtected()（useMock() \|\| getToken().length>0），… |
| MP-R2-PAGES-NEARBY-INDEX-001 | code-findings | pages/nearby/index | 已修复待终验 | 回归核对线索「reportLocation 在登录门外无条件执行 → 未登录授权定位后仍 401 强踢（001 的残留口子）」：当前代码已修复。登录门收敛进 utils/location.ts 的 reportLocation 内部：real 模式无 toke… |
| MP-R1-NEARBY-005 | code-findings | pages/nearby/index | 已修复待终验 | 历史回归项「热门兴趣圈第 4 卡被右缘裁切」：当前代码算术核验仍为已修复。卡片 150rpx（R21 由 166 收窄，源码注释自证），4 卡 + 3 gap = 4×150 + 3×10 = 630rpx；可用宽 = 750 − 页面左右 2×32rpx −… |
| MP-R1-PAGES-MESSAGES-INDEX-004 | code-findings | pages/messages/index | 已修复待终验 | 回归核对：会话列表「时间」整列永不显示（模板读不存在的 lastMessageTime）——当前工作区已修复。模板改读真实字段 lastMessageSentAt，在线绿点（同根源假字段 online）已删除，formatTime 补了 NaN 防护并收敛到 … |
| MP-R1-PAGES-MESSAGES-INDEX-005 | code-findings | pages/messages/index | 已修复待终验 | 回归核对：未登录态「手机号登录」死交互（NotLoggedWaiting emit goPhoneLogin 无监听者，likes 页 LIKES-102 同款）——当前工作区已修复。消息页已补 @go-phone-login 监听，处理器跳转登录页。 |
| R13-DATA-3894 | code-findings | pages/messages/index + 数据 | 待修复 | 回归核对：private_messages id=3894「全链路验收测试消息 2026-09-12」外露消息预览位——代码层确认仍未修复且修复路径已核实为双表：①该字符串在全仓受控文件中仅存在于 reports 基线文档（git grep 仅命中 repor… |
| MP-R1-PROFILE-201 | code-findings | pages/profile/index | 已修复待终验 | 回归核对：「我的故事→我的帖子」配图裸 image 直连 /api/v1/media/** 白图（MP-R7-PROFILE-002 同病复发）——当前工作区已修复。页面在 minePosts 数据边界统一经 resolveMediaUrls 解析（拼 api… |
| MP-R1-PROFILE-202 | code-findings | pages/profile/index | 已修复待终验 | 回归核对：「语音介绍」「背景图上传」UI 挂载点位于不可达分支（v-if=false legacy 槽）——当前工作区已修复。四块功能（语音介绍/背景图编辑/邀请好友/VIP 开通卡）已迁入本人态活代码路径（ProfileShell 之后的 <template… |
| MP-R3-VILLAGE-INDEX-001 | code-findings | subpackages/village/village/index | 待修复 | 【回归核对：仍未修复】mock 今日广场/热度榜 feed 批量图文不符 ≥15 帖（R3 口径 ≥13）。本轮按要求实读 8 张 post-N.jpg 源图建立图像真值：post-1=城堡草坪砾石路、post-2=热饮杯冒热气特写、post-3=暗色海岸礁石… |
| MP-R3-VILLAGE-INDEX-002 | code-findings | subpackages/village/village/index | 待修复 | 【回归核对：仍未修复】热度榜上拉加载「替换」而非「追加」。页面 onLoadMore 对 hot 频道调 villageStore.fetchHotBoard(page+1) 期望追加分页，但 fetchHotBoard 两个分支均为整体替换：mock `th… |
| MP-R1-VILLAGE-INDEX-101 | code-findings | subpackages/village/village/index | 已修复待终验 | 【回归核对：修复在位】频道切换主链路死代码（ChannelTabs 双 emit + v-model 先改值致 selectChannel 同值守卫恒 return，切频道不拉数据/不记忆/不恢复滚动）。现页面已去掉 v-model，改单向 `:model-v… |
| MP-R1-VILLAGE-INDEX-102 | code-findings | subpackages/village/village/index | 已修复待终验 | 【回归核对：修复在位】ActivityCard 报名按钮 mp 端 stopPropagation 补丁失效→点报名同时打开详情。现报名按钮已改模板 `@tap.stop`（uni-app Vue3 mp-weixin 编译为 catchtap，与 PostC… |
| MP-R1-PUBLISH-101 | code-findings | subpackages/village/village/publish | 待修复 | 圈子目标草稿回退「个人动态」后 visibility 卡在 interest：目标卡显示「个人动态/默认公开·所有人可见」，「谁可以看」行显示「兴趣圈」，实际提交后端按 targetType=general 推导为 public_——UI 承诺「兴趣圈（窄）」… |
| MP-R1-POST-201 | code-findings | subpackages/village/village/post | 待修复 | submitPublish 的本地图片判定仍用裸 /^https?:\/\// 正则（post.vue:491 过滤待上传、:500 回拼已上传），未走同文件已导入的 isUploadedMediaUrl（post.vue:25 导入，仅草稿链路 318/38… |
| MP-R1-POST-101 | code-findings | subpackages/village/village/post | 已验证 | 回归核对历史 P1「发圈成功后草稿残留→下次进页 UI 显示个人动态但提交进圈」：修复链完整在位，逐层验证通过——① suppressDraftSave 标志（post.vue:349）在成功路径先置位再清表单（:546-553），清表单触发的 watch 不… |
| MP-R2-VILL-013 | code-findings | subpackages/village/village | 已验证 | 回归核对历史 P1「晚霞帖配热饮图」（线索页面为 village/village 首页，非本页 post；就本页共享数据链代码层核对）：病灶已清除——① stores/village/mock-data.ts 全文 grep「晚霞」0 命中，咖啡类帖（:468… |
| MP-R1-POSTTOPIC-001 | code-findings | subpackages/circles/circles/post-topic | 待修复 | 顶部导航栏右上「发布」按钮（主 CTA）未做微信胶囊避让。全局 navigationStyle:custom（pages.json:36），项目自身在 campus/post-topic.vue:444-446 以真机修复记录了胶囊几何「占位约右缘 7~94p… |
| MP-R1-CAMPUSINDEX-001 | code-findings | subpackages/campus/campus/index | 待修复 | 回归确认：历史 MP-R3-CAMPUS-INDEX-001（未认证视角渲染 i18n 裸 key）仍未修复，且本轮工作区 diff 中的修复放错了命名空间。页面读取 t('campus.index.hotCirclesTitle')/t('campus.in… |
| MP-R1-CAMPUSINDEX-002 | code-findings | subpackages/campus/campus/index | 待修复 | 回归确认：历史 MP-R3-CAMPUS-INDEX-002（真机状态栏双重避让）代码链路完整保留。① 页头自带避让：.campus-header padding-top = calc(var(--statusbar, env(safe-area-inset-… |
| MP-R1-CAMPUSINDEX-009 | code-findings | subpackages/campus/campus/index | 已验证 | 回归核对（历史线索 MP-R2-CAMPUSINDEX-001：scroll-view 无有界高度 → scrolltolower 翻页永不触发，10 条之后帖子永不可见）：代码层验证为已修复。有界高度链闭合：App.vue:334 page{height:1… |
| MP-R1-CAMPUSPOST-002 | code-findings | subpackages/campus/campus/post-topic | 已修复待终验 | 回归核对【real 配图上传 Idempotency-Key 恒定冲突（每张图同名 campus-topic.jpg 同键 → 同帖第 2 张起 409 重复拦截、且 4h TTL 内任何带图发帖被同一 key 拦截）】：代码层验证已修复。文件名改为 camp… |
| MP-R1-MATCHING-002 | code-findings | subpackages/discover-extra/discover/matc… | 已修复待终验 | 回归核对历史线索 MP-R2-MATCHING-002「匹配动画双头像未过 resolveMediaUrl，real 模式渲染空圆」：代码层确认已修复。页面侧 myAvatar/partnerAvatar 两个 computed 均以 resolveMedia… |
| MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-001 | code-findings | subpackages/discover-extra/discover/matc… | 已验证 | 回归核对 MP-R3-MSUCCESS-001/002「返回/截图钮侵入状态栏、右上钮与胶囊碰撞」：本轮重读代码确认修复机制完好且未回退。nav 纵向位置由 JS 注入 --statusbar（getSystemInfoSync().statusBarHeig… |
| MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-001 | code-findings | subpackages/chat/chat-session/index | 待修复 | temp 深链 loadSession 失败后 chatStore.activeSession 残留上一次会话，页面「!chatStore.activeSession」失败判定（MP-R2-001 修复引入的确定性信号）存在盲区：渲染出上一个临时会话的消息，且… |
| MP-R2-CHAT-CHAT-SESSION-INDEX-001 | code-findings | subpackages/chat/chat-session/index | 已修复待终验 | 【ask 历史线索回归核对】「以 errorMessage 变化判失败的差分检测在连续同文案时失效→发送失败无反馈/假空会话」：页面级差分检测已彻底移除。① temp 发送：chatStore.sendText 改返回 Promise<boolean>（mes… |
| MP-R1-VILLMOCK-101 | code-findings | subpackages/village/village/detail（数据源 s… | 待修复 | MP-R2-VILL-013 同族批量图文语义不符在 mock 帖子数据中仍成批存在：post-10《想去冰岛看极光》配 posts/post-4.jpg（实读为一只冒热气的杯子——与原始线索「晚霞帖配热饮图」同型的风景帖×热饮图组合）；post-9《学做咖啡… |
| MP-R1-DETAIL-101 | code-findings | subpackages/village/village/detail | 已验证 | 历史 P1 线索 MP-R1-DETAIL-001（全屏图片查看层样式孤立在 </style> 之后被 SFC 解析器丢弃）复核：已修复。样式已移回 style 块内，并用项目实际 vue 3.4.21 compiler-sfc 做了解析实证。 |
| MP-R1-LSV-001 | code-findings | subpackages/discover-extra/likes-visitor… | 待修复 | 错误态重试按钮点击零响应：ErrorState 组件常驻渲染「重试」按钮并 emit('retry')，但 likes-visitors 页使用 ErrorState 时未监听 @retry，网络失败后用户停留在本页点「重试」无任何反馈，只能退出页面重进（on… |
| MP-R1-HELP-101 | code-findings | subpackages/tools/help/index | 已修复待终验 | 【历史线索回归核对】「客服邮箱-复制」复制文案标签而非邮箱地址——本轮代码层验证已修复：copyEmail 现复制 APP_CONFIG.SUPPORT_EMAIL 真实地址，并留有 MP-R1-HELP-101 修复注释。附带发现（随本条跟踪建议）：该邮箱地… |
| MP-R2-SEGMENT-001 | code-findings | subpackages/discover-extra/home/segment | 已修复待终验 | 【历史线索回归核对】头像裸 image 直连相对路径（real 裂图）——本轮代码层验证已修复：头像经 resolveMediaUrl() 统一出口解析（/uploads/→鉴权代理、/static/assets/images/avatars\|people→a… |
| MP-R1-LNEARBY-201 | code-findings | subpackages/tools/love-center/nearby | 待修复 | R12-IND-NEARBY-LC-002 修复不彻底，胶囊遮挡从返回键转移到了页面标题：.content-header 仍保留 justify-content: space-between，而模板里只剩 [返回键, 标题] 两个子节点，标题被推到最右缘（右侧… |
| MP-R1-LNEARBY-202 | code-findings | subpackages/tools/love-center/nearby | 已修复待终验 | 历史线索 MP-R1-LNEARBY-101（滑动链路与 discover store 脱节：本地 cards 不进 store，滑动后报「卡片不存在或已被处理」）——代码层验证已修复：store swipeLeft/swipeRight 均新增调用方快照入参… |
| MP-R1-LMBTI-201 | code-findings | subpackages/tools/love-center/mbti | 已修复待终验 | 历史线索 MP-R1-LMBTI-101（自定义返回键固定右上角，与微信胶囊矩形几乎完全重叠）——代码层验证已修复：返回键已移入 .content-header 弹性行、位于标题左侧，全文件无 absolute 定位的返回键。 |
| MP-R1-SEARCH-201 | code-findings | subpackages/tools/search/index | 已修复待终验 | 历史线索 MP-R2-SEARCH-001（用户/校园两处头像裸 image 直连相对路径）——代码层验证已修复：两处头像均经 resolveMediaUrl 重写（/uploads 鉴权代理、静态与绝对地址原样），空值回退 IMAGE_PATHS.DEFAU… |
| MP-R1-VERIFY-INDEX-001 | code-findings | subpackages/profile-extra/verification/i… | 已修复待终验 | 【回归核验·原缺陷】nav-bar 在 safe-top 之前渲染 → 标题/返回键顶进状态栏与时间叠印。 |
| MP-R1-OTHER-002 | code-findings | subpackages/profile-extra/profile/other | 已修复待终验 | 【回归核验·原缺陷】whisper（送心动卡/悄悄话）事件链上游无人 emit，功能在他人主页完全不可达。 |
| MP-R2-OTHER-001 | code-findings | subpackages/profile-extra/profile/other | 已修复待终验 | 【回归核验·原缺陷】相册缩略图/最近动态配图/头像裸直连，同数组大图查看层却已解析（双重待遇）。 |
| MP-R1-SETUPPROFILE-001 | code-findings | subpackages/setup/profile/index | 待修复 | 资料编辑页返回键与标题组固定定位（top:88rpx / top:208rpx），未做状态栏高度补偿。项目全局 navigationStyle=custom（pages.json:36 globalStyle），页面自 y=0 布局；在状态栏高度 >44px … |
| MP-R1-DND-002 | code-findings | subpackages/profile-extra/settings/dnd | 已修复待终验 | 历史回归核对：免打扰页自绘导航顶进状态栏（safe-top 在 nav-bar 之后）。代码层验证已修复：模板 .safe-top 占位（:314）先于 .nav-bar（:317）渲染；--statusbar 经 useMenuButtonRect 的 st… |
| MP-R1-SHOWCASE-001 | code-findings | subpackages/setup/showcase/index | 待修复 | 展示页「村口」条目标记 isTab:true，点击走 uni.switchTab，但村口不是 tabBar 页：pages.json tabBar.list 仅 5 个 tab（home/nearby/discover/messages/profile，pag… |
| MP-R1-BILLS-001 | code-findings | subpackages/vip/bills | 待修复 | 账单页没有任何初始加载路径：onShow 生命周期被误嵌在 goBack() 函数体内注册，且原「初始化加载」代码只剩孤儿注释。页面进入时 store.bills 初始为 []、loading=false、loaded=false（无任何调用方触发 listB… |
| MP-R1-PAGES-REGISTER-INDEX-013 | findings | pages/register/index | 待修复 | 本页双身份（A/B）静态截图全部缺失：直连 reLaunch 被应用侧会话守卫重定向至 pages/login/index（logout 后亦然，2 次尝试一致）。导致本页无默认/滚动-中部/滚动-底部/弹层态/校验错误/键盘弹起等任何静态巡检像素留档，理想图… |
| MP-R1-PAGES-REGISTER-SUCCESS-008 | findings | pages/register/success | 待修复 | 本页在 R1 标准静态巡检矩阵中 A/B 双身份均未取得任何截图（默认/滚动/交互后三态全缺）：巡检记录失败原因为「A/B 均未截：依赖注册流程态，直连重定向至 login（2 次一致）」——未登录/logout 态直连本页被应用侧登录守卫重定向至 pages… |
| MP-R1VIS-PAGES-NEARBY-INDEX-001 | findings | pages/nearby/index | 待修复 | 历史线索 MP-R1-PAGES-NEARBY-INDEX-001 / MP-R2-PAGES-NEARBY-INDEX-001（未登录进入附近页 401 强踢登录页）在本轮同 gitSha（aefd8a72）运行时复现，与代码层「已修复待终验」结论矛盾：ex… |
| MP-R1-VILLAGE-INDEX-201 | findings | subpackages/village/village/index | 待修复 | 整页 window 滚动取代 scroll-view 内部滚动：滚动后头部（标题+搜索+5 频道 Tab）完全滚出视口不可达，feed 内容直接顶入状态栏/胶囊投影区——滚动-中部截图帖子图片直达屏幕最顶、贴在胶囊下方；滚动-底部截图上一帖操作栏（1 天前 ·… |
| MP-R1-CAMPUSINDEX-010 | findings | subpackages/campus/campus/index | 待修复 | 本页双身份静态截图零覆盖（巡检失败原因：A/B 均未截，直连落在 subpackages/campus/campus/hub，2 次一致）。根因为规格内入口守卫而非页面故障：onLoad 无 ?school= 参数即 redirectTo hub（index.… |
| MP-R1-CAMPUSINDEX-011 | findings | subpackages/campus/campus/index | 待修复 | 话题分类 Tab（页面主导航）在 mp-weixin 真实渲染中为纵向堆叠的全宽列表，横向滚动条形态完全失效：6 个 Tab（课程交流/社团招新/校园活动/学习互助/生活服务/校友动态）各独占一行、文字居中，合计占首屏约 28%（812px 帧中约 230px… |
| MP-R1-MATCHING-101 | findings | subpackages/discover-extra/discover/matc… | 待修复 | 本页本轮静态截图缺失，A/B 双身份均未截（ask 指定记录）。失败原因（引用巡检产出）：「?target=10003 直连落在 pages/discover/index（2 次一致）」。根因取证：页面 onLoad 仅读取 cardId/action/use… |
| MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-010 | findings | subpackages/chat/official-chat/index | 待修复 | 历史 P0 线索 MP-R1-OFFICIAL-003（最后一条消息被输入栏截断）在当前 HEAD 默认态仍复现：mock 冷启动进入本页滚动位置停在顶部（时间条「9月21日 03:14」与首条消息完整可见即证 scrollTop=0），末条助手消息只显示到第… |
| MP-R1-ACTDETAIL-301 | findings | subpackages/tools/activities/detail | 待修复 | 本页 A 身份静态截图缺失：screenshot-manifest.json :1376-1380 仅登记 B 身份 1 张，磁盘 stat 核验 A 路径不存在。失败原因（任务书提供）：?id=11 直连被流程态守卫重定向落在 pages/discover/… |
| MP-R1-MBTI-301 | findings | subpackages/tools/love-center/mbti（波及整个 … | 待修复 | 交互取证截图集与 HEAD(aefd8a72) 源码的渲染结果不符，属过期构建产物，但其 exec-results.json 仍标 gitSha=aefd8a72——证据指纹失真。铁证一：MBTI-03-after.png 头部为「标题居中、无可见返回键」，该… |
| MP-R1-DND-002 | findings | subpackages/profile-extra/settings/dnd | 已验证 | 历史回归项「免打扰页自绘导航顶进状态栏（safe-top 在 nav-bar 之后）」视觉终验通过：A/B 双身份默认态与数据态共 4 张截图中，系统状态栏（时间/信号/电量）区域无任何页面内容叠印，返回箭头、「免打扰」标题与系统胶囊均起于状态栏之下，safe… |
| MP-R1-PAGES-REGISTER-INDEX-201 | findings-req | pages/register/index | 待修复 | 注册页 R1 交互取证大面积失真：32 条用例中约 20 条的 observed 与其标题场景不符却标 EXECUTED。根因是 automator 文本输入驱动全程失效（REG24/REG26 pre-FAIL『input el.input is not a… |
| MP-R1-PAGES-NEARBY-INDEX-901 | findings-req | pages/nearby/index | 待修复 | 5宫格第5入口「我的人脉」功能目标页全库不存在，且落点为村口帖子列表（与分区⑤「全部」同落点），标签承诺的关系功能缺失并误导导航。 |
| MP-R1-PAGES-MESSAGES-INDEX-101 | findings-req | pages/messages/index | 待修复 | 测试残留消息「全链路验收测试消息2026-09-12」外露在最近聊天预览位，待清理（数据侧）。本轮复核：全仓 grep 该字符串仅命中 reports 基线文档（apps/client/src、apps/api 零命中），属运行时数据库残留（private_m… |
| MP-R1-VILLAGE-INDEX-REQ-001 | findings-req | subpackages/village/village/index | 待修复 | 需求三入口之「关注」流整体缺失：页面为频道化结构（今日广场/兴趣圈/学校圈/活动/热度榜五 Tab），无任何关注 Feed 入口；store 侧分类常量 FOLLOWING_CATEGORY_ID="cat-following"（stores/village/… |
| MP-R1-CAMPUSINDEX-REQ-002 | findings-req | subpackages/campus/campus/index | 待修复 | 未认证视角「推荐兴趣圈」功能区块的标题与「查看更多」入口文案整体缺失：页面消费 t('campus.index.hotCirclesTitle')/t('campus.index.viewMore')（index.vue:259-260），但两个 key 被错… |
| MP-R1-CAMPUSPOSTTOPIC-201 | findings-req | subpackages/campus/campus/post-topic | 待修复 | 校园圈发帖配图链路 real 模式端到端断裂，图片被创建接口静默丢弃：客户端侧承诺并实现完整（「上传图片 0/6」UI、隐私授权前置、chooseImage 选图、× 删除、提交前逐张 uploadPostImage 上传换 URL——post-topic.v… |
| MP-R1-CAMPUSPOSTTOPIC-202 | findings-req | subpackages/campus/campus/post-topic | 待修复 | 匿名发布开关在 real 模式为安慰剂，实名信息照常暴露：页面恒显示「匿名发布」开关并承诺「开启后，你的信息将显示为『匿名校友』」（post-topic.vue:383-395 + zh-CN.ts:3544，未像 circles 同族页那样以 useMock… |
| MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-101 | findings-req | subpackages/chat/chat-session/index | 待修复 | spec §2.2 普通聊天页四段结构中的「关系状态区（RelationshipTag + SuggestedAction）」整段缺失：页面从 ChatHeader 直接进入消息流，普通会话无任何关系标签（刚认识/聊天中/暧昧中/互相关注）与建议动作（回复/邀… |
| MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-102 | findings-req | subpackages/chat/chat-session/index | 已验证 | R13 曾判本页最严重偏差的 P0 幂等键问题（同文案重发/同对方二次进会话被后端幂等去重拦截，整页报错且无消息）：本轮回归复核通过。会话 get-or-create 改为按调用唯一键、消息发送改为每次随机键且请求头字段名已修正，深链 ?userId=1000… |
| MP-R1-REQ20-001 | findings-req | subpackages/village/village/detail | 待修复 | 村口帖子详情 goBack 为裸 uni.navigateBack，无栈底兜底：分享卡/扫码/通知深链直开（栈=1）时点击顶部返回键无任何路由/DOM/Toast 反馈，构成导航无响应死路。同仓 tag-posts.vue:250-256 与 history.… |
| MP-R1-REQ20-002 | findings-req | subpackages/campus/campus/topic-detail | 待修复 | 校园圈话题详情 goBack=clearCurrentTopic+裸 uni.navigateBack，无栈底兜底（对比 circles 版 topic-detail.vue:145-152 有 MP-R2-NAV-001 守卫）：深链直开（栈=1）点击返回无… |
| MP-R1-C26REQ-001 | findings-req | subpackages/vip/bills | 待修复 | VIP 账单页「进入即加载账单」核心功能缺失：onShow 生命周期被误嵌进 goBack() 函数体内（bills.vue:152-154），页面 setup 时未注册；运行时 tap 阶段 getCurrentInstance()=null，uni-app… |
| MP-R1-N02-01 | interact-judge | pages/nearby/index | 待修复 | 未登录（token 移除）进入附近页时未按设计呈现「静态空态+分区⑤登录引导卡」，而是发生受保护请求 401→redirectToLogin 强跳：页面被 uni.reLaunch 换成登录页并 toast「登录已过期，请重新登录」。expected 明确要求… |
| MP-R1-DISCOVER-INDEX-101 | interact-judge | pages/discover/index | 已修复待终验 | 点击推荐卡片无任何反应（死按钮）：automator 对 .match-card 派发 tap×3，路由栈始终停留 pages/discover/index，无 Toast/DOM 变化，console 连续 3 条 warn「Component SwipeC… |
| MP-R1-PROFILE-003 | interact-judge | pages/profile/index | 待修复 | 点击语音状态「播放」无播放动效，反而弹出「录音失败，请重试」（播放动作误用录音失败文案），console 出现 readFile:fail no such file or directory /static/assets/mock/voice-status.m… |
| MP-R1-PROFILE-002 | interact-judge | pages/profile/index | 已修复待终验 | 本人态点头像弹层：旧构建 uni.showActionSheet 仅渲染遮罩、菜单面板不可见（三路取证）；当前源码已重写为项目统一 BottomSheet（四项：查看大图/从相册选择/拍照/取消） |
| MP-R1J-VILLAGE-INDEX-005 | interact-judge | subpackages/village/village/index | 待修复 | A1 取证管线缺陷（非产品缺陷，但它使本页 42/48 用例不可判定，为轮内最大影响面）：①dom 探针 present 与 tap element not found 自相矛盾（VI38/VI42/VI43/VI44，wxml 证实元素均在 DOM）；②候选… |
| MP-R1-PUB-018 | interact-judge | subpackages/village/village/publish | 待修复 | general 目标下「谁可以看」残留「学校圈」（目标卡与可见范围同屏矛盾）：?circleId=8（未加入圈）进入后 targetType 回退 general，但 visibility 未重算，残留 school。后端 CreatePostRequest … |
| MP-R1-VPOST-101 | interact-judge | subpackages/village/village/post | 待修复 | R1 执行器取证工具链缺陷导致本页 34 用例中 32 个不可判（含全部 8 条 critical 发布链路）：(a) input 步骤报 el.input is not a function（VP03/04/07/08/21/27/28）；(b) __CAN… |
| MP-R1-CAMPUSINDEX-003 | interact-judge | subpackages/campus/campus/index（波及 S06–S… | 待修复 | R1 交互执行会话（r1-exec.cjs，S06 circles-campus / S07 campus-matching / S08 match-chat 批次）tap 派发系统性失效：元素可寻址（tap 不报 element not found、act … |
| MP-R1-CHAT-CHAT-SESSION-INDEX-201 | interact-judge | subpackages/chat/chat-session/index | 待修复 | 失效数字 sessionId（99999999）深链渲染「假空会话」：MatchGreetingTip 破冰卡+「会话刚建立，还没有消息。」+BreakQuestion+可用输入栏全部照常渲染，错误态（friendlyPageError「加载失败」）未到达。此… |
| MP-R1-J20-001 | interact-judge | subpackages/village/village/detail | 待修复 | 村口帖子详情 goBack 为裸 uni.navigateBack，无栈底兜底：分享卡/深链直开（栈=1）时点击顶部返回键 500ms 内无路由/DOM/Toast 任一反馈，构成「导航无响应」缺陷（R11§5）。同仓 tag-posts.vue:250-25… |
| MP-R1-J20-002 | interact-judge | subpackages/campus/campus/topic-detail | 待修复 | 校园圈话题详情 goBack=clearCurrentTopic+裸 uni.navigateBack，无栈底兜底（对比 circles 版 topic-detail.vue:148-152 有 MP-R2-NAV-001 reLaunch 守卫）：深链直开（… |
| MP-R1-SC12-01 | interact-judge | subpackages/tools/security/index | 待修复 | 安全中心「危险操作·注销账号」行点击无可观测反馈（死按钮嫌疑）：automator 按文本定位并成功 tap「注销账号」，但点击后弹层未入 DOM、页面零变化，违反 R11§5「点击 500ms 内必须有可观测反馈」铁律。 |
| MP-R1-HS04-01 | interact-judge | subpackages/tools/heart-signals/index | 待修复 | 心动信号页深链栈=1 时点击返回键无任何路由反馈：预期 uni.switchTab('/pages/home/index') 兜底未发生，违反「无静默无反应」返回兜底铁律。 |
| MP-R1-ST03-01 | interact-judge | subpackages/profile-extra/settings/index | 待修复 | 设置页深链栈=1 时点击返回键无任何路由反馈：预期 uni.switchTab('/pages/profile/index') 兜底未发生，与 HS04 同模式（返回兜底铁律违规）。 |
| MP-R1-次要25-1 | interact-judge | subpackages/discover/activities/index | 待修复 | 活动页核心交互点击零反馈：筛选 chip「周末」（ACT04）点击后画面零变化（MD5 与点击前完全一致，仍「全部」4 条）；报名「感兴趣」/取消报名「已感兴趣」（ACT05/06/07）点击后按钮状态不翻转、人数不变、无 toast——ACT05 befor… |
| MP-R1-次要25-3 | interact-judge | subpackages/support/feedback/index | 待修复 | 空提交校验拦截零反馈（critical 用例 FB07）：tap「提交」成功记录存在，但 toast 数组为空、无路由变化、无请求记录、无任何可观测反馈。同 round toast 捕获机制正常（他页 126 条 toast 成功捕获，含 LG10「请先阅读并… |
| MP-R1-次要25-4 | interact-judge | subpackages/support/feedback/index | 待修复 | 「历史记录」入口点击无导航（FB15）：act:tap "历史记录" 执行成功，但 getCurrentPages 始终为反馈页单层栈，未发生 navigateTo；目标页 /subpackages/profile-extra/feedback/history… |
| MP-R1-次要25-5 | interact-judge | subpackages/discover/discussions/index | 待修复 | 讨论圈底部主按钮「去寻觅」点击无导航（DC03）：act:tap "去寻觅" 执行成功（DC02 modal 未打开，命中的唯一「去寻觅」为 BottomActionBar primary，文案=i18n discussions.goExplore，discu… |
| MP-R1-PAGES-LOGIN-INDEX-020 | regression | pages/login/index | 待修复 | 历史问题 MP-R2-PAGES-LOGIN-INDEX-001（P1：input type="password" 非法值致 mp 端密码明文显示）回归核对发现修复效果反证：缺陷写法（type="password"）确凿未回归——源码与构建产物均为规范的 ty… |
| MP-R1-PAGES-HOME-INDEX-027 | regression | pages/home/index | 待修复 | MP-R3-PAGES-HOME-INDEX-001 复发（回归）：TodayRecommendationCard 的 photoFailed 重置 watch 写在 defineProps 之前，引用 props 的 watcher getter 在编译产物… |
| R13-DATA-3894 | regression | pages/messages/index + 数据 | 待修复 | 回归核对：private_messages id=3894「全链路验收测试消息 2026-09-12」外露消息预览位——非本轮复发（历史上从未修复，无「修复被改回」可言），维持待修复。本轮复核确认：①该字符串在本轮全部 round-1 证据中仅命中报告文档（g… |
| MP-R1-VILLAGE-INDEX-001 | regression | subpackages/village/village/index | 待修复 | 【已复发：历史 P1（MP-R3-VILLAGE-INDEX-001，R3 口径 ≥13 帖）未见修复落地，非本轮新改坏】mock 今日广场/热度榜 feed 批量图文不符仍在，本轮独立实读 8 张 post-N.jpg 建立图像真值：post-1=城堡草坪砾… |
| MP-R1-VILLAGE-INDEX-002 | regression | subpackages/village/village/index | 待修复 | 【已复发：历史 P1（MP-R3-VILLAGE-INDEX-002）未见修复落地，非本轮新改坏】热度榜上拉加载仍为「替换」而非「追加」：页面 onLoadMore hot 分支调 fetchHotBoard(page+1) 期望追加分页，但 fetchHot… |
| MP-R1-POST-301 | regression | subpackages/village/village（feed 渲染页为 vi… | 待修复 | 【已复发】R3 家族批量图文不符（MP-R3-VILLAGE-INDEX-001 族，R3 口径 ≥13 帖，「注释声称内容与静态资源实图相反；实读图片核对是唯一可靠验证法」）未见修复落地。本轮对 8 张 posts 图库逐一实读定标：post-1=阴天海岸礁… |
| MP-R1-REG-CAMPUSINDEX-001 | regression | subpackages/campus/campus/index | 待修复 | 【已复发：历史 MP-R3-CAMPUS-INDEX-001（未认证视角渲染 i18n 裸 key）未见修复落地——修复把键补进了错误命名空间，渲染效果与原缺陷一致，非本轮新改坏】页面消费 t('campus.index.hotCirclesTitle')/t… |
| MP-R1-REG-CAMPUSINDEX-002 | regression | subpackages/campus/campus/index | 待修复 | 【已复发：历史 MP-R3-CAMPUS-INDEX-002（真机状态栏双重避让）代码链路完整保留，未见修复落地】双重避让三要素现码俱在：① 页头自带避让 .campus-header padding-top = calc(var(--statusbar, e… |
| MP-R1-VILLAGE-REG-001 | regression | subpackages/village/village（index 主 feed… | 待修复 | MP-R2-VILL-013（晚霞帖配热饮图，P1）未彻底修复、同族批量图文语义不符复发成立：services/mocks/fixtures.ts 仅修 p6.jpg 一处文案（674-675，MP-R1-VILLAGE-INDEX-103 注释），主 fee… |
| MP-R1-CAMPUSTOPIC-REG-001 | regression | subpackages/campus/campus/topic-detail | 待修复 | MP-R1-TOPIC-DETAIL-001-002（campus/topic-detail mock 分页重复追加/maxlength，P1）的 maxlength 子项复发（修复缺失）：historical-issues.md:248 记「mock 回复重… |
| MP-R1-HELP-101 | regression | subpackages/tools/help/index | 已修复待终验 | 【历史线索回归核对·未复发（代码级）】「客服邮箱-复制」复制文案标签而非邮箱地址——本轮源码直读证实已修复：copyEmail 复制 APP_CONFIG.SUPPORT_EMAIL 真实地址并留有修复注释。运行时终验未达成：本轮交互执行 HP06 虽标记 E… |
| MP-R2-SEGMENT-001 | regression | subpackages/discover-extra/home/segment | 已修复待终验 | 【历史线索回归核对·未复发（代码级）】头像裸 image 直连相对路径（real 裂图）——本轮源码直读证实已修复：列表头像全量经 resolveMediaUrl() 统一出口解析并带 DEFAULT_AVATAR 兜底，不再裸连相对路径。且本轮 utils/… |

## 三、每页使用对比与功能目标汇总

数据来源：findings/*-req.json 的 pageCompares 字段（结构化：route/baseline/usageNotes/functionGaps/verdict）+ page-compare/*.md（逐页全文，含 L1–L10 structureNotes）。verdict 为需求对照员原文。

### 3.1 主包 6 tab + 注册链路 + 分包页簇（20 页）

| 页面（route） | 理想基线（摘要） | verdict | 功能目标缺口（functionGaps） | 使用路径结论（摘要） | 详见 |
|---|---|---|---|---|---|
| pages/login/index | 素材/理想效果图/登录页.png（任务锚定主参考；实测为纯插画主视觉稿）+ 素材/理想效果图/登录页面.png（整页 U… | 基本达标 | 手机号验证码/密码登录链路可达且可验证（理想：手机号登录次钮可完成手机号登录任务）（fix：补『验证码登录』兜底入口或 mock 授权回调；自动化表单用例补 logout 前置重跑；真机补拍两…） | 核心任务『进入小程序』三路均通：稍后再看 1 步落 discover（LG17 EXECUTED，toast『已进入体验模式，先逛逛吧』）；已登录任意时刻打开登录页自动前进 discover（LG02… | page-compare/PAGES-LOGIN-INDEX.md |
| pages/register/index | 素材/寻觅注册页-素材_assets/b5163cb0-*.jpg（主视觉构成，R13 判定无整页理想稿）+ 素材/注册… | 基本达标 | 核心成功链路可验证：合法全表单→签发 JWT→redirectTo 注册成功页（DEV_PAGE_MAP 流程第 1 步的完成判定）（fix：按 Issue 201 修 automator 驱动（trigger('input',{value}…）；人脸认证可选步骤存在且可跳过（DEV_PAGE_MAP 页面全集 #6、流程基准 06/06-1/06-2）（fix：按 Issue 202 二选一：增补可选人脸认证（真实活体需资质，可先落手持证件照+人工审核降级链路…）；实名必须（阻塞核心产品入口），实名成功后立即允许进入首页/附近/匹配/消息（DEV_PAGE_MAP 认证规则）（fix：改 success.vue:33-37 清单文案为『互动前完成实名认证』语义或增实名直达入口；产品如…）；步骤式资料填写 + CTA『下一步』（b5163cb0 与参考-注册页面.png 的内容顺序）（fix：→Issue 204 保留：拍板提升到 docs/design 契约文档留痕；待 R13 候补整页理…） | 核心任务『创建账号并进入产品』按代码路径完整可达：注册→redirectTo 成功页→『完善我的资料』1 步进向导或『随便逛逛』1 步进首页，任意页 2 步内回 tab 体系，单页表单无迷路结构；返回… | page-compare/PAGES-REGISTER-INDEX.md |
| pages/register/success | 素材/寻觅注册页-素材_assets/69340cfc-miora_text_to_image-178918634170… | 基本达标 | 成功页即解锁点：注册/实名成功立即解锁首页/附近/匹配/消息（DEV_PAGE_MAP-流程基准.md:26,31；ask 页面目标）（fix：① 文案对齐守卫（最小改）：rows[1] 拆行、消息/圈 tag 改「完善资料后解锁」；或 ② 守…） | 理想路径（DEV_PAGE_MAP 流程）：注册成功→主按钮进完善资料 12 步（基础资料→实名→…），或「稍后再说」1 跳进首页 tab。实际：两出口均验证工作（OP2、OP4/A04b-repro… | page-compare/PAGES-REGISTER-SUCCESS.md |
| pages/home/index | 素材/理想效果图/首页.png（19 张整页高保真稿中本页唯一对照依据）+ v3.1 契约 Token 裁决链（首页=白… | 基本达标 | 今日推荐信息列含 4 张生活缩略图一行（理想图签名下方、按钮上方）（fix：API 增 photos:string[]（real 取相册前 4 张、mock 补本地生活图）；组…）；第 3 卡状态词「1 条待处理」（数据驱动待办计数，橙色）（fix：后端 whisper 步骤输出 pendingCount（可由 inbox 派生，mock 同步）；…）；关系动态每格底部 3 枚重叠头像（fix：mock fixture 补四组 avatar 数组（复用 person-01..09））；兴趣推荐实景照片封面（摄影/旅行/音乐/美食主题图）（fix：mock icon 改照片路径，或 coverSrc 对已知图形 svg 强制走 circle-co…） | 核心任务可达：看推荐/喜欢/换一位/进主页、关系动态四路跳转（H17-H22）、兴趣圈加入（H25/H26）、附近查看（H29/H30）、社区关注/作者主页（H36-H39）、邀请（H43）、定位弹层… | page-compare/PAGES-HOME-INDEX.md |
| pages/nearby/index | 素材/理想效果图/附近的首页.png（唯一页面级对照依据）+ 本轮 ask 理想描述；辅助 Token 链 git sh… | 基本达标 | 5宫格「我的人脉」进入人脉/关系页（关注/粉丝/互关）（fix：新建人脉页承接（复用 village follow 关系或 relations API）；短期不建页…）；校园圈入口卡按状态显示「已加入/去认证」chip（fix：消费 campus store 认证态：verified→已加入，否则去认证跳 certificat…）；未登录可停留附近页浏览公开内容+登录引导卡（fix：排查 mock 未登录 401 来源，未登录短路公开空态或收敛 canFetchProtected …）；顶部放大镜图标式搜索入口（无整行搜索框）（fix：改放大镜图标按钮复用 goSearch，补标题/小字定位针（MP-R1-PAGES-NEARBY-I…）；热门兴趣圈 4 张约 170×290rpx 竖版海报卡完整落视口（fix：170×290rpx+收敛 gap 使 4 卡满一屏（MP-R1-PAGES-NEARBY-INDE…）；校园圈 4 联竖版封面卡（校名+同学数+双态chip）（fix：重排竖版 4 联排+接入同学数数据源（MP-R1-PAGES-NEARBY-INDEX-906，P2…）；右下角绿色➕FAB 发动态快捷入口（fix：补 FAB 或产品确认头部胶囊为终态后放行（MP-R1-PAGES-NEARBY-INDEX-907…）；定位小字含距离粒度（北京大学 · 3km）（fix：定位成功后计算/消费距离字段拼入 homeSubtitle（MP-R1-PAGES-NEARBY-I…） | 核心任务均可完成且多数经自动化证实：发动态（N03/N04 快击×5 无重复压栈）、搜索带词/空值进搜索页（N05/N06）、附近的人/同城的人分流 scope 参数被 people.vue:53-5… | page-compare/PAGES-NEARBY-INDEX.md |
| pages/discover/index | 素材/理想效果图/寻觅匹配卡片页面.png（唯一页面级对照图）+ reports/audit/baseline/idea… | 不达标 | 顶部右侧空心收藏心形入口（收藏 TA）（fix：裁决口径后补 heart-outline 入口+Person 收藏 store/api+收藏页 pe…）；「今日剩余 N 次」配额展示（fix：分段行下方加配额 chip 绑定 remainingCount，文案接入 discover 域 i1…）；左右滑手势=跳过/喜欢（fix：改用 touch 序列注入或真机手势脚本重跑 DC12-15，补飞出动画与副作用断言）；实名认证门控（未实名点喜欢→弹窗去认证/取消）（fix：修复 harness 身份 B（未实名账号）后重跑 DC21，断言 modal 标题/去认证跳转/取…）；打招呼频控（同卡 3 次/日，第 4 次拦截）（fix：以真实栈顶 cardId 解析键名重跑 DC23，断言 Toast=greetLimitReache…）；推荐/附近独立空态文案+错误横幅重试+筛选控件语义（fix：按现行页内分段结构重写 DC05/06/07/10 与筛选序列的选择器后重跑） | 核心任务链可走通：浏览→喜欢/打招呼→matching→返回下一张（DC17/18/19/22/44 机证 tapped），未登录点按 Toast 拦截不强跳（DC20），登录胶囊↔登录页往返落点正确… | page-compare/PAGES-DISCOVER-INDEX.md |
| pages/messages/index | 素材/理想效果图/消息.png（唯一页面级对照依据）+ 任务书页面 target + reports/audit/bas… | 不达标 | 头部右侧放大镜+加号（发起会话）（消息.png；ideal-baseline.md:87）（fix：header__right 增补 + 钮→选择联系人/ROUTES.CHAT.SESSION?use…）；空态=推荐认识的人兜底（任务书 target；ideal-baseline.md:87）（fix：#empty 接入推荐数据源渲染 3-4 枚头像卡，无数据时保留现文案（P2-103））；正在升温横滑（消息.png；任务书 target）（fix：scroll-view scroll-x 替换并放开截断（P3-107））；消息预览位仅真实用户消息（数据卫生，任务书明示待修）（fix：授权后删消息行+重算 last_message_preview，SQL+实拍双证（P1-101）） | 核心任务「看未读→进会话→回复→返回红点清零」顺畅：MSG27/MSG35/MSG34 EXECUTED，onShow 未读闭环在（index.vue:274-278）。断点①：无法从消息页主动发起会… | page-compare/PAGES-MESSAGES-INDEX.md |
| pages/profile/index | 素材/理想效果图/已经填完资料的个人主页.png（本人态唯一页面级对照）+ 素材/理想效果图/未登录个人主页.png（L… | 基本达标 | 页内分享入口（理想图右上四宫格图标）可用，可将本人主页分享给好友（fix：改 <button open-type="share"> 消费既有 onShareAppMessag…）；我的帖子区『最近 2–3 条 + 查看全部』（v3.1 契约 §13 冻结）（fix：区头加『查看全部 ›』→本人帖子列表页（复用 village/history 或新建 my-post…）；头部身份行完整展示 年龄·学校·城市+性别（理想图『21岁 · 北京大学 · 北京』+♀）（fix：DTO 补 age/gender 映射，MyHeader metaLine 并入 school、性别…）；「在线」徽章表达真实在线状态（v3.1 状态 Token online/offline）（fix：透出 isOnline/lastActiveAt（mock 同步），按字段渲染双态，无数据时隐藏）；本页 71 例交互用例的执行级验证（R1 交互取证覆盖目标）（fix：R2 修复 harness：登录 fixture 身份对齐、tap 前重取页面树、选择器按登录态/他…） | 核心任务代码级全通：编辑资料/去完善同入口 entry=edit（index.vue:1110-1114，目标页 pages.json:255-259 已注册）；头像四项菜单（BottomSheet，… | page-compare/PAGES-PROFILE-INDEX.md |
| subpackages/village/village/index | 素材/理想效果图/帖子.png（帖子卡结构）+ 29a2b1df v3.1-后台对齐 §三 圈子/动态广场 + idea… | 不达标 | 三入口「关注」：已关注作者动态流（fix：增「关注」频道或今日广场筛选 chip，走既有 cat-following 分类参数）；三入口「同城」：按城市过滤动态（fix：增同城入口/频道，复用 city 参数，定位缺失回退 cat-samecity）；右下角绿色发布 FAB（fix：改右下 FAB 或 FAB+输入条双轨，与回顶钮错位布局；或产品登记豁免）；顶部「发帖」入口（顶部搜索+发帖）（fix：随 FAB 决策一并处理头部发帖位）；帖子卡「学校」字段（fix：作者行增校名徽章（对齐帖子.png ✓北京大学样式））；相对时间（fix：增 N周前/N个月前分段替代绝对回退，或登记豁免）；分享动作（帖子.png 底栏）（fix：补 share 事件链或移除按钮，禁止死控件）；九宫格图仅在有图时渲染（fix：删除 v-else 占位分支） | 核心任务顺畅：浏览→详情（VI28 ✓）、搜索（VI09 ✓ 落地搜索页）、关注 toggle（VI32 ✓）、频道切换+记忆+深链（VI14/20/23/24/25 ✓）、分页/下拉穿透 TTL（V… | page-compare/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.md |
| subpackages/village/village/publish | 素材/理想效果图/发布帖子页面.png；实际证据：reports/screenshots/round-1/A\|B/SUB… | 基本达标 | 话题 0/5：可从话题列表多选（理想图「添加话题·已选 0/5」）（fix：移植 circles/post-topic 预设话题 chips 弹层（上限 5），保留正文 #ta…）；提及好友：可进入好友选择并回填 @提及（fix：短期弱化 affordance；长期接关注/喜欢列表多选，@昵称注入正文随 payload 提交）；谁可以看权限选择（需求文本明示）（fix：降级为只读信息行（对齐位置行）或后端补 visibility 字段后恢复真实选择）；位置 POI 级可选（理想=北京大学·未名湖校区+chevron）（fix：产品裁决：维持城市级（改文案+无缓存引导授权）或恢复 chooseLocation）；底部工具条：图片/视频·话题·位置·提及·更多（理想图+本轮需求顺序文本）（fix：产品裁决：确认移除则删残壳样式并更新需求文本；恢复则各项锚定既有行为）；正文计数 0/1000（理想图）（fix：更新理想稿为 0/500（推荐）或后端放宽后三方同步）；圈场景（发布到摄影圈）下保留话题行（理想图）（fix：后端 CreateTopicRequest 支持 tags 后移除 v-if 恢复；在此之前保持隐藏） | 理想路径：进入发布→（选目标）→写正文→（配图/话题/位置/提及/权限）→发布。实际：我的→添加故事 1 步进入（?target=friends 默认个人日常，R21 统一命名「个人动态」与需求文本一… | page-compare/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.md |
| subpackages/village/village/post | 素材/理想效果图/发布帖子页面.png（唯一页面级对照依据）+ 静态截图 reports/screenshots/rou… | 基本达标 | 位置随帖保存并在帖子中展示（理想图「添加位置：北京大学·未名湖校区」）（fix：全链路增补 location 并展示；后端短期不支持则发布时明示或隐藏入口）；提及好友：选择好友、解析目标并通知（fix：好友选择弹层+发布时解析 userId 触发通知；短期降级文案「插入 @ 符号」）；发布图片/视频附件（理想图底栏「图片 / 视频」）（fix：改 chooseMedia 支持 video 并打通上传展示链路，或书面裁剪并修订理想图口径）；圈子目标发帖可带话题（理想图摄影圈目标+话题行并存）（fix：后端扩展 tags 后放开入口；或在契约中确认裁剪）；发布目标覆盖全部已加入兴趣圈（fix：移除 slice 全量渲染（面板已可滚动）或加「查看全部圈子」入口） | 核心任务「写内容→发布」：输入与发布钮同屏，2 步内完成，成功后 800ms 自动返回并清表单/清草稿（post.vue:541-561）。返回链路：X→脏表单「保留/放弃」modal（:430-46… | page-compare/SUBPACKAGES-VILLAGE-VILLAGE-POST.md |
| subpackages/circles/circles/index | 素材/理想效果图/兴趣圈列表.png | 基本达标 | 搜索（理想图头部放大镜 / 代码自锚规格书 14.4）（fix：goSearch 接 openAppPath(ROUTES.SEARCH)；圈子域搜索按产品决策补数…）；筛选圆钮 + 筛选面板（理想图 chips 末端 ≡+绿点）（fix：已立案：视觉 INDEX-002（Function P2），本文件不重复；若裁剪需契约记录关闭 R1…）；我的圈子/发现圈子 Tab（ask 页面摘要所列）（fix：更正锚定单摘要（删除或注明裁剪依据）；产品若恢复需求再立项）；加入 CTA 快击可靠性（CI11 验收条件）（fix：REQ2：in-flight 锁 + mock 按终态赋值；重跑 CI11）；错误态/空态验收（fix：真实模式（或拦截 request 注入失败）补错误态/空态取证，闭环 CI18）；深链 ?category 高亮同步（fix：category 参数映射进 QUICK_TABS 激活态；是否立案归交互判定员（视觉 observ…） | 核心任务路径：浏览（三重兜底拉取，14 卡完整渲染）✓；分类过滤（chips CI05/06/07 + 深链 CI13 实证）✓，但深链 ?category 时 chips 高亮留「全部」为小迷路点（… | page-compare/SUBPACKAGES-CIRCLES-CIRCLES-INDEX.md |
| subpackages/circles/circles/post-topic | 素材/理想效果图/发布帖子页面.png（功能语义参照——锚定仲裁见下；像素级锚归 village/publish）；实际… | 基本达标 | 话题标签多选（理想图「# 添加话题 已选 0/5」）（fix：后端 CreateTopicRequest+落库加 tags（posts 先例 @Size(max=…）；添加位置（理想 POI 级「北京大学·未名湖校区 ›」）（fix：族级产品裁决：维持裁剪则理想稿标注；恢复则 chooseLocation+DTO location …）；提及好友（理想「@ 提及好友 ›」）（fix：族级裁决：弱化占位或接关注/喜欢列表实现（并入 Issue MP-R1-POSTTOPIC-302，…）；谁可以看（理想「👁 圈内成员可见 ›」+目标卡 pill）（fix：最低成本：目标行补「圈内成员可见」只读 badge（circleStore 数据在位）；真实选择需后…）；图片/视频（理想工具条首项）（fix：族级裁决 uni.chooseMedia+后端视频承载，或理想稿标注仅图片（Issue MP-R1-…）；正文计数 0/1000（理想图）（fix：理想稿改 0/500 或客户端三方放宽至 1000+超长用例（Issue MP-R1-POSTTOP…）；发布到圈卡（理想：头像+圈内成员可见 pill+1.2w 成员+chevron）（fix：目标行升级圈卡（头像/成员数/可见 badge），数据 circleStore.circles 在位…）；发帖小贴士卡+底部五项工具条（理想结构元素）（fix：产品裁决：建议理想稿标注裁剪；若保留贴士为纯静态卡成本低） | 理想路径（发布到摄影圈）：进入→目标卡确认→写正文→（配图/话题/位置/提及/权限）→发布。实际生产路径：圈详情/话题列表→「去圈内发帖」→带 circleId 进入（目标锁定只读）→标题+正文→（首… | page-compare/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.md |
| subpackages/campus/campus/hub | 素材/理想效果图/校园圈.png（唯一页面级对照图）+ reports/audit/baseline/ideal-bas… | 基本达标 | 未认证已绑校用户可浏览/申请本校校园圈（hub.vue:7 自述「点击学校：已认证本校→私域；其他→公开浏览」应含未认证本校的公开浏览出口）（fix：hub.vue:93 改为仅 isVerified 时排除本校（未认证时本校卡以「未认证」badge…）；已认证本校卡「进入」→ 私域视角的端到端取证（CH16）（fix：store 直注 verified + schoolName 后 reLaunch → tap jo…）；认证状态拉取失败错误条 + 重试（MP-R2-CAMPUS-HUB-004）的 E2E 取证（CH17）（fix：real 模式 + 可注入 500 的 mock server 重跑，或测试钩子注入 errorMe…） | 核心任务链可走通且全程机证：附近 Tab 入口（nearby/index.vue:253）→默认落推荐 Tab 浏览（CH01 冷启动深链）→搜索过滤/清空/超长输入（CH06/07/09）→点卡或「… | page-compare/SUBPACKAGES-CAMPUS-CAMPUS-HUB.md |
| subpackages/campus/campus/index | 无页面级理想稿（素材/理想效果图/校园圈.png=hub 页，A3 读图同判定）；基准=页面 docblock（inde… | 基本达标 | 空态引导发布：文案与发布入口一致（fix：空态文案按 isOwnCertifiedView/viewSchool 三分支；新增 key 放 c…）；推荐兴趣圈区块：标题与查看更多文案（fix：key 迁回 campus.index 块（zh/en 同步）或页面改消费 postTopic 命名…）；六分类 Tab：单行横向滚动导航形态（fix：scroll-view 内包 inner flex 层（A3 -011 fix）；随修回填 -005…）；触底翻页（TOPIC_PAGE_SIZE=10）（fix：mock 种子补 ≥10 条/分类，健康会话重跑 CX13 取 append+防抖证据）；公开浏览 banner（已认证+非本校）与认证徽章四态、错误重试、返回兜底的运行时实证（fix：带 ?school= 参数+real 认证数据预置重跑 CX05/06/15/16/17，并按 A3…） | 核心任务健康会话全部走通（平行线次要14.json CAMPUSINDEX OP01-OP10+fix2 E，9-21 早于 HEAD 仅旁证）：浏览（OP03 ✓ 未认证+本校参数可浏览）、看详情（… | page-compare/SUBPACKAGES-CAMPUS-CAMPUS-INDEX.md |
| subpackages/campus/campus/post-topic | 素材/理想效果图/发布帖子页面.png（ideal-baseline.md:101 发布功能族语义锚定；像素级 L1-L… | 不达标 | 配图随帖发布并可见（页面「上传图片 0/6」承诺 + 理想图格）（fix：DTO 增 @Size(max=6) images + service serialize 落库；补…）；匿名发布（承诺「显示为匿名校友」）（fix：DTO+service+store 透传落库并视图脱敏；或短期 real 隐藏开关撤承诺（回复链路同…）；添加位置（理想 POI 级）（fix：族级产品裁决（MP-R1-CAMPUSPOSTTOPIC-203，保留））；提及好友（fix：族级裁决（并入 203，保留））；谁可以看（显式展示）（fix：最低成本「同校可见」只读 badge（并入 203））；图片/视频（fix：族级 uni.chooseMedia 裁决（MP-R1-CAMPUSPOSTTOPIC-204，保留…）；正文 0/1000、话题 0/5（理想稿口径）（fix：理想稿标注项目口径或三方放宽（MP-R1-CAMPUSPOSTTOPIC-205，保留））；分类深链参数健壮性（fix：onLoad 白名单校验回落默认（MP-R1-CAMPUSPOSTTOPIC-206，待修复））；发帖小贴士卡 + 底部五项工具条（理想稿结构元素）（fix：不立案；建议理想稿标注结构裁剪） | 实际路径：campus/index（认证视角 FAB）→ 分类已按当前 Tab 预选 → 填标题/正文 →（选图 0/6、选话题 0/3、开匿名）→ 发布 → toast「发布成功」→ 800ms 自… | page-compare/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.md |
| subpackages/discover-extra/discover/matching | 素材/理想效果图/匹配中页面.png（唯一页面级理想稿）+ git show 29a2b1df:docs/design/… | 不达标 | 匹配中视觉进度：文案『正在寻找适合你的TA』+ 纯视觉模拟，不显示虚假算法百分比（v3.1-contract §12 冻结）（fix：删假百分比数字渲染改纯视觉律动；标题接 t("matching.searching")+● ● ● …）；视觉进度→候选卡→CTA ❤️/×/取消；跳过=pass（§19 行07）（fix：路线A：动画结束落候选卡+MatchActionButton+取消钮，重连死键；路线B：修订契约 §…）；状态：次数用尽/看完=空态（§19 行07）（fix：随 REQ-02 路线 A/B 一并裁决落地）；行为：喜欢=like/单向已送出/互喜→成功（§19 行07 行为列）（fix：Toast 改 t("matching.crushSent")（随 REQ-05 修复单）；按 RE…）；取消返回匹配中心（ask 目标行）（fix：—（aria 语义可随 REQ-02 路线 B 补『取消匹配，返回匹配中心』）） | 理想路径（契约行07）：匹配中心开始→视觉进度（可取消/跳过=pass）→候选卡→❤️/×→互喜进成功页/单向已送出→返回中心。实际路径：寻觅 tab 浏览卡（×/打招呼/❤️）→点❤️/打招呼→本页… | page-compare/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.md |
| subpackages/discover-extra/discover/match-success | 素材/理想效果图/匹配成功页面.png（唯一页面级对照依据，本次逐要素目视）+ reports/audit/baseli… | 基本达标 | 「分享喜悦」提供真实分享能力（ask目标CTA『继续探索（+分享喜悦）』；理想图底部分享链接）（fix：注册onShareAppMessage(path=MATCH_SUCCESS?userId=part…）；共同点4行进度反映真实匹配数据（contract §19-08『共同 tags』；baseline:96『共同点4行进度』）（fix：匹配结果透出共同点分值/标签，删除恒定defaultScores，无数据不伪造；详见REQ-02）；右上截图/更多具备真实能力（代码注释自证规格书7.1/7.2 P0）（fix：裁决键数后实现截图/分享真实链路（更多可并入REQ-01分享）；详见REQ-04）；「立即聊天」→chat-session落页（critical，contract §19-08『发消息→chat-session』）（fix：修harness（栈顶断言+截图前路径校验）后重跑MS10/MS13；在机证补齐前该项不得记为通过）；返回栈>1 navigateBack回来源（contract §19-08『返回=匹配中心』）（fix：以真实多级栈（寻觅→matching→成功）重拍返回案）；Hero主色三源一致（v3.1粉Hero红线 vs 理想PNG浅绿底 vs 实现浅绿）（fix：基线员裁决后三源收敛（改码或修订规范文本）；详见REQ-03） | 核心任务链 matching→redirectTo(?userId)→match-success→立即聊天→chat-session→返回→继续探索→寻觅Tab 代码层全通（matching.vue:… | page-compare/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.md |
| subpackages/chat/chat-session/index | git show 29a2b1df:docs/design/message-v3-spec.md §2.2（普通聊天页四… | 基本达标 | 关系状态区（RelationshipTag+SuggestedAction，spec §2.2 第二段）（fix：ChatHeader 下接入现成两组件，数据源 session.relationship/relat…）；恋爱输入区语音入口（后台对齐 §三 聊天五要素）（fix：维持下线则反向修订 spec；恢复则先补麦克风隐私声明再接回 sendVoiceMessage 链路）；发送失败保留重试（任务书给定状态）（fix：ChatBubble 补 failed 分支+tap-resend；私信失败消息以本地 failed…）；错误净化不外露技术串（任务书给定状态）（fix：抽 sanitizeChatError 纯函数，发送 toast 两处统一净化）；失效深链健壮性（spec §9 错误态）（fix：加载后无会话无消息无错误 → 渲染会话不存在错误态；temp 加载失败保留 banner+禁用按钮（…）；任意入口返回有确定去向（500ms 反馈铁律）（fix：goBack fail/catch 加 switchTab 公开 Tab 兜底）；核心交互链路执行级证据（发送/表情/长按四件套/转发/拉黑/举报等）（fix：修复 ops 清单参数与前置后重跑 S08，回填 exec-results/judge） | 核心任务顺畅：消息 Tab 点会话即达；深链 ?userId=10003 冷启动自动建会话+破冰引导（CS05 VERIFIED，R13e 51-chat-entry2.png 无整页报错）；返回 C… | page-compare/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.md |
| subpackages/chat/official-chat/index | 素材/理想效果图/消息.png 右半（寻觅助手会话页整页稿；19 张中无本页专属稿，本图为唯一页面级对照依据）+ 素材/… | 基本达标 | T6/T8 按钮消息形态：理想稿「去看看/稍后再说」可渲染可点击（去看看→活动列表；稍后再说→本地插入用户消息）（fix：见 Issue -101：后端/mock 补生产者，或产品裁剪后删死分支与用例）；T11 报名成功回流：报名成功后寻觅助手会话出现确认消息（理想稿第 3 段）（fix：见 Issue -102：后端 enroll 成功写 official_chat_messages，…）；T11 延伸 「活动开始前一天我会提醒你」提醒能力（fix：见 Issue -103：改文案或补每日定时提醒任务）；页面定位「官方/AI 聊天」的 AI 回复能力（fix：见 Issue -104：接入模型或修正命名/预期）；证据缺口（非产品缺陷，不入 Issue）：real 模式 LockScreen（OC25）、加载失败重试（OC23）、发送失败回滚+幂等键重…（fix：修复 r1-exec 身份花名册与 input 动作后，在 real 包补跑 OC03/OC09/O…） | 核心任务「消息页助手卡进页→读历史→发消息→收回复→点活动卡看详情→返回」链路完整：发送 OC12 VERIFIED（本轮解析 OC12-after.wxml：right 行=1、bubble--us… | page-compare/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX.md |

### 3.2 次要页簇（次要20~24、26 来自 -req pageCompares；次要25 来自 page-compare/次要25.md）

| 页面（route） | verdict | 功能目标缺口（摘要） |
|---|---|---|
| subpackages/village/village/detail | 基本达标 | 栈=1 深链直开可返回来源兜底；位置胶囊含距离（理想：距你 1.2km）；互动行第三钮=分享；空态 CTA 用语统一 |
| subpackages/village/village/tag-posts | 达标 | 深链内容态可复核证据；作者头像→主页 |
| subpackages/village/village/history | 达标 | 清空全流程交互留证；空态 CTA 用语 |
| subpackages/circles/circles/topics | 基本达标 | 置顶圈规条可点且落点合理；加入/退出防连点 |
| subpackages/circles/circles/topic-detail | 基本达标 | 头像→作者主页不丢上下文；深链内容态留证 |
| subpackages/circles/circles/circle-home | 基本达标 | 动态卡评论可点；点赞持久化+真实计数；加入/退出防连点；标签 chips/置顶规约；五 Tab 内容 |
| subpackages/campus/campus/topic-detail | 基本达标 | 深链 ?id= 变体兼容；栈=1 返回兜底；头像→主页/长按举报 |
| subpackages/campus/campus/certification | 达标 | 合法提交全流程留证 |
| subpackages/discover-extra/home/segment | 不达标 | 发现页快捷入口可达本页（契约 §19 页01 点击行为）；下拉刷新；错误态+重试可走通 |
| subpackages/discover-extra/nearby/people | 达标 | 错误态+重试可走通；Tab 切换高亮+重载正向证据 |
| subpackages/discover-extra/discover/history | 不达标 | 寻觅页可达历史页；栈=1 直开可退出；挽回功能可用且可验收 |
| subpackages/discover-extra/likes/index | 基本达标 | myLikes 批量取消喜欢；已解锁项点击分流（互喜→聊天/普通→主页）；错误态+重试 |
| subpackages/discover-extra/likes-visitors/index | 基本达标 | 双 Tab 切换高亮+列表切换+badge；已解锁项点击分流；解锁全部弹窗三路链路 |
| subpackages/tools/daily-question/index | 基本达标 | 提交回答全链可用且可验收；栈=1 直开可退出；拉题失败错误态+重试 |
| subpackages/tools/love-center/index | 不达标 | 生产可进入恋爱中心；附近的人/MBTI/板块跳转到达证据 |
| subpackages/tools/help/index | 基本达标 | 生产可进入帮助中心；复制邮箱反馈可见；客服/反馈跳转到达证据 |
| subpackages/tools/security/index | 达标 | 无 gap |
| subpackages/tools/search/index | 基本达标 | 用户 Tab 输入防抖 300ms 自动搜索用户（SE03 目标）；全文案 i18n 化（品牌视觉/国际化契约） |
| subpackages/tools/heart-signals/index | 基本达标 | 已拒绝 Tab 内信号状态标签语义正确（declined→已拒绝） |
| subpackages/tools/activities/detail | 达标 | 无 gap |
| subpackages/tools/love-center/nearby | 达标 | 无 gap |
| subpackages/tools/love-center/mbti | 达标 | 无 gap |
| subpackages/tools/love-center/consulting | 达标 | 无 gap |
| subpackages/profile-extra/settings/index | 基本达标 | 「本周安排」开关开启后首页展示课表区块（已报名活动+自编辑条目） |
| subpackages/profile-extra/verification/index | 基本达标 | 认证权益 5 项图标+门控横幅警示图标可见 |
| subpackages/profile-extra/verification/real-name | 达标 | 无 gap |
| subpackages/profile-extra/profile/visitors | 达标 | 无 gap |
| subpackages/profile-extra/profile/other | 基本达标 | CTA 按状态机切换（互喜=发消息绿）；取消匹配入口可达（治理菜单）；Hero 头像点击行为；共同点 3 项横排（彩底圆图标+标题+副题）；CTA 形态（信息卡右上文字药丸；底部三钮；喜欢粉浅底） |
| subpackages/profile-extra/profile/location | 达标 | 无 gap |
| subpackages/profile-extra/profile/privacy | 达标 | 无 gap |
| subpackages/profile-extra/profile/album | 达标 | 无 gap |
| subpackages/profile-extra/profile/favorites | 达标 | 无 gap |
| subpackages/profile-extra/profile/tasks | 基本达标 | 点击未完成任务跳转对应功能页（TK04-TK06）；first-post/verify 任务完成态 |
| subpackages/profile-extra/settings/dnd | 基本达标 | 快击保存仅 1 次 PUT（DND08 验收）；自定义未选星期/起止相等校验（DND06/DND07） |
| subpackages/profile-extra/feedback/history | 达标 | 附件图片全屏预览（FH06）；深链 ?id=N 自动展开（FH05） |
| subpackages/setup/profile/index | 基本达标 | 保存成功链路（PUT→Toast→600ms 返回）；快击保存反馈次数（EP03：×5 点击 6 条 Toast） |
| subpackages/setup/campus/index | 达标 | 三级联动清空语义（CA02）与保存场景路由（CA03/CA05） |
| subpackages/setup/schedule/index | 基本达标 | 课表录入/导入（路由与页面自述的「课表」职责）；时段增删与保存校验（SC02-SC04） |
| subpackages/setup/recommend-pref/index | 达标 | 范围单选迁移与开关取反（RP03/RP04） |
| subpackages/setup/interest/index | 基本达标 | 返回/跳过出口；保存链路（≥3 校验→GET 合并→PUT→返回）（IN05/IN06） |
| subpackages/market/shop/index | 基本达标 | 解封态功能全量：积分条+5 分类切换过滤+6 商品网格+商品卡进详情；real 模式商品列表可达全部商品（分页浏览）；积分兑换入口（签到积分→商城闭环） |
| subpackages/market/wallet/index | 基本达标 | 充值防连点：快击×5 仅 1 次提交；解封态：余额 ¥800.00 与流水正负号/颜色、失败 -- 不误显 0 元+重试恢复 |
| subpackages/vip/index | 基本达标 | 开通前协议可查看（服务协议/自动续费协议）；解封态功能全量：权益弹层/套餐切换价联动/mock 开通闭环+防连点/自动续费双向确认+受控回显/real 不假成功/两入口跳转 |
| subpackages/vip/promo-code | 基本达标 | 输入三态：空码/格式非法/金额非法 + 超长 32 截断；解封态功能全量：合法码五行走电卡/无效红卡/兑换闭环+防连点/重置清空 |
| subpackages/vip/bills | 不达标 | 进入即加载账单列表（mock 3 条：订阅/续费/退款）；重进/onShow 刷新（store 缓存短路兜底，VIP 页开通/兑换后进入可见新数据）；下拉刷新真实重拉/筛选 4 chips 过滤/账单卡字段徽标 |

**次要25（8 页功能目标核对）汇总表（page-compare/次要25.md 原文摘录）**：

| 页面 | verdict | 新立 Issue（Function） | 引用他线 |
|---|---|---|---|
| setup/dev | **不达标** | MP-R1-REQ25-DEV-001（P2：DEV 条件无激活链路，页面所有构建未注册） | MP-R1-DEV-001/002/003 |
| setup/showcase | 基本达标 | MP-R1-REQ25-SHOWCASE-001（P2：村口 isTab 死链，1/49） | MP-R1-SHOWCASE-001/002 |
| support/feedback | 达标 | — | MP-R1-FEEDBACK-001/002/003 |
| discover/discussions | **不达标** | MP-R1-REQ25-DISCUSS-001（P2：生产零入口孤岛页） | MP-R1-DISCUSSIONS-001 |
| discover/activities | 达标 | — | MP-R1-ACTIVITIES-001/002/003 |
| legal/privacy | 达标 | — | — |
| legal/agreement | 达标 | — | — |
| market/detail | 达标 | — | MP-R1-MARKET-101 |

下轮建议：① 产出 dev-debug 平台构建 + showcase 构建（build:mp-weixin:showcase）各一包，补 DEV01–10/SC01/SC03/SC07/SC08 取证；② SC01 期望「6 分组 44 项」与代码 7 分组 49 项漂移需同步 manifest；③ 讨论圈入口补齐后复测 DC 链路；④ 匹配中页面.png/未登录个人主页.png/他人显示主页.png 仍待逐对 L1–L4 比较（本组不涉及，移交相应线）。

- 使用对比 verdict 分布（26 份 req 的 pageCompares 合计 65 页）：基本达标×38、不达标×9、达标×18。page-compare/*.md（27 份）为逐页 L1–L10 结构笔记 + usageNotes + functionGaps 全文，本表为其结构化摘要。

## 四、覆盖记录与观察证据（视觉/覆盖线 27 份原文收录）

任务给定「覆盖记录与观察证据」与 findings/*.json 的 coverage/observations 字段同源；本节收录 27 份 findings 文件的 coverage 完整原文（逐页「13 项举证」清单）与 observations 摘要。

### PAGES-LOGIN-INDEX.json（pages/login/index｜视觉审查员-R1-PAGES-LOGIN-INDEX (A3)｜2026-09-23）

- 覆盖核对（原文）：pages/login/index —— 13 项举证（本页有 5 项 Issue，以下为已执行核对清单）：①截图已看：A/B 巡检 6 张 + LG 系列 8 张（LG01/04/06/09/12/15/16/17）逐张目视+MD5+像素采样；②理想图已对照：素材/理想效果图/登录页.png（画稿级一致）+ 任务给定结构描述 L1-L8 逐层（L1 结构/L2 层级/L3 交互位置/L4 尺寸/L5 间距/L8 颜色有实测，L6/L7/L9/L10 目视级）；③滚动已测：LG05 EXECUTED（scrollPos=top 无卡死）+ 单屏内容无滚动需求；④点击已测：LG04/06/07/08/09/10/12-20/30/32/33/34 EXECUTED；⑤返回已测：LG32 EXECUTED（注册页返回落登录页）；⑥safe-area 已查：内容单屏止于约 y700/820，代码 env(safe-area-inset-bottom) 兜底（index.vue:1088，A2 已核）；⑦TabBar 已查：本页无 TabBar（符合理想）；⑧空态已查：N/A（登录页无列表数据态）；⑨长文已查：N/A 默认态（表单长输入因 101 项证据缺失未验证，已如实标注）；⑩加载态已查：btn--loading 样式在位（index.vue:1167），mock 快速失败未捕获 loading 帧，如实标注；⑪错误态已查：见 observations 第 6 条（4 类 toast 全有记录）；⑫组件一致性已查：主/次/三钮圆角与全屏宽度风格与 discover 页 guest-hint 并读（PAGES-DISCOVER-INDEX-34 截图），无风格冲突；主色全局偏差单列 103 项；⑬历史 Bug 回归已查：MP-R2-PAGES-LOGIN-INDEX-001 代码层已验证（observations 第 3 条）；R13『三图相同』线索经 MD5 坐实为 101 项。边界声明：交互失败用例的根因判定与 LG09 时序矛盾归交互判定员复审；需求/理想语义冲突（稍后再看措辞、年满18+ 是否硬性）归需求对照员；本报告未读取 reports/audit 下其他轮次结论文作为依据（历史线索仅用了任务给定的两条）。
- 覆盖核对（原文）：证据时效声明：screenshot-manifest.json gitSha=aefd8a72=当前 HEAD ✅；exec-results.json gitSha=aefd8a72 ✅；round-1-interact 内 09-20 编号系列（00~21b）为过期证据已排除，未据其下任何结论。

| 观察 | 证据 |
|---|---|
| 默认态结构与理想一致：Logo寻觅+芽苗图标+slogan「遇见同频的人」→ hero 校园情侣插画（与素材/理想效果图/登录页.png 同一画稿：绿衣男+白衣女背坐草地远眺校园，飘浮元素为叶非心，两图一致无偏差）→ 三行价值主张（大标题/绿副标题/灰注释）→ CTA 三钮（微信一键登录绿主钮→手机号登录白次钮→稍后再看）→ 协议行 → DEV 演示入口；无底部导航（符合理想「无底部导航」）；胶囊按钮独立于 Logo 行右上，无叠印；页… | reports/screenshots/round-1-tour/A/pages_login_index__默认.png + 素材/理想效果图/登录页.png 对照；PIL 竖直色带扫描 y380-700 与水平扫描 y=514（本会话运行，输出在案） |
| LG09 取证内部矛盾（移交交互判定员，未立 Issue）：该用例声称「未勾选协议点微信一键登录应 toast 拦截」，但实拍 after 图协议框为未勾选（灰空心圆）而 console 显示微信登录请求已发出（[SessionStore] 微信登录失败）、toast 为「微信服务暂时不可用」而非 agreeFirst。代码层守卫存在且为函数首行（index.vue:282-285 onWechatLogin），LG10 证明同款守卫在… | reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-LG09-after.png（未勾选）对照 LG12-after.png（勾选）；exec-results.json LG09 observed/console 字段；a… |
| 历史回归 MP-R2-PAGES-LOGIN-INDEX-001（密码明文）：代码层已验证修复无回归——index.vue:769-780 为 type="text" + :password="true"（uni-app mp 规范密文写法），全文件无 type="password" 字面量（本会话 Read+grep 实证）。视觉层无法复验：密码输入框位于手机号表单内，而表单展开态在整个 R1 证据集中零实拍（见 101 项），不据此… | apps/client/src/pages/login/index.vue:769-780（本会话 Read）；MD5 三图相同（101 项证据）；exec-results.json LG25 FAILED（密码三态用例未执行成功） |
| B 身份巡检登录页与 A 身份同病：三状态 MD5 相同（6af01f84…），仅与 A 巡检字节级不同（154097B vs 154069B，双身份渲染差异），状态覆盖缺陷与 A 身份一致；双身份在本页未产生任何差异化信息。 | 本会话 python hashlib 对 reports/screenshots/round-1-tour/B/pages_login_index__*.png 三张实测 |
| CTA 文案「稍后再看」对照理想描述「临时看看/先逛逛」：语义同类（跳过登录先浏览）且理想描述自身给出两种措辞变体，实拍为第三种等义措辞；LG04/17 实测该按钮 toast「已进入体验模式，先逛逛吧」沿用理想语汇。判定为措辞变体非偏差，不立 Issue；如需逐字对齐由需求对照员裁决。 | reports/screenshots/round-1-tour/A/pages_login_index__默认.png；exec-results.json LG04 toast 字段；apps/client/src/i18n/locales/zh-CN.ts:2162 "gue… |
| 错误态 toast 可达性已由交互证据证实（视觉截图未含 toast 瞬时帧）：微信登录失败「微信服务暂时不可用，请稍后重试」（LG09/12/13/14）、协议拦截「请先阅读并同意用户协议」（LG10）、体验模式「已进入体验模式，先逛逛吧」（LG04/17/18/19）均有 exec-results toast 记录；防连点（LG14/LG18 ×5 仅 1 次提交）通过。toast 文案与表单能力错位（验证码 vs 密码口径）已由代… | reports/audit/round-1/interact/exec-results.json LG09/LG10/LG12-LG14/LG17-LG19 的 toast/console 字段（gitSha=aefd8a72） |
- 证据时效（原文）：manifestGitSha=aefd8a72；currentHead=aefd8a72f2231e8df7affd09004c14c3e4e73745；match=true；interactGitSha=aefd8a72（exec-results.json 顶层字段，updatedAt 2026-09-23T12:00:00.115Z）；过期排除：reports/screenshots/round-1-interact/ 内 PAGES-LOGIN-INDEX-00~21b 编号系列截图（文件 mtime 2026-09-20 02:37~06:52）早于当前代码基线，非 aefd8a72 产物，按过期处理未据其下结论；本轮有效交互证据为同目录 LG 系列（exec-results.json 引用且 gitSha=aefd8a72）。

### PAGES-REGISTER-INDEX.json（pages/register/index｜视觉审查员-R1-PAGES-REGISTER-INDEX（A3，截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：pages/register/index —— 13 项举证式核对说明（本页有 2 个 Issue，非「无问题」页，仍逐项列明核对路径）：
- 覆盖核对（原文）：1. 截图已看：REG01/REG09（HEAD 新鲜）逐张目验+局部 3x 放大；REG08 实拍漂移至协议页已识别并排除；编号 01-22（旧构建）抽验 01-after 用于 29a2b1df 前后对照。
- 覆盖核对（原文）：2. 理想图已对照：素材 b5163cb0 主视觉 + reg-hero-illustration.jpg 实读比对 REG01（L1 结构/构图同族）；ask 注明 R13「无整页理想稿」，L5-L10 以设计规范 token 表 + 代码为准（规范：deliverables/注册页/寻觅注册页-设计规范.md 实读 §65/72/95/164/176/190/194/205）。
- 覆盖核对（原文）：3. 滚动已测（受限）：REG29 observe-only（scrollPos=top，safety-note/to-login DOM present 证可达），HEAD 无滚动-中/底部像素留档——归入 Issue 013 缺口，未据旧批次替代。
- 覆盖核对（原文）：4. 点击已测（交互判定员职责域）：REG04/05/06/07/16/17/18/23/24/28 已执行，A6 仲裁多数 UNVERIFIED（执行侧故障），视觉侧不复判。
- 覆盖核对（原文）：5. 返回已测（交互判定员职责域）：REG03/04/30 均 UNVERIFIED（.hero__back 快照竞态），A6 已仲裁，不重复。
- 覆盖核对（原文）：6. safe-area 已查：底部 env(safe-area-inset-bottom)+24rpx（index.vue:770）在案；顶部 --statusbar 补偿查出 Issue 014（副标题-卡片零间距/真机裁切）。
- 覆盖核对（原文）：7. TabBar 已查：pages.json 实读——register 非 tabBar 页（'tabBar' 首现处为注释块，list 与 register 无关），无 TabBar 遮挡问题。
- 覆盖核对（原文）：8. 空态已查：本页默认即空表单态（REG01），渲染完整无错误空态。
- 覆盖核对（原文）：9. 长文已查：REG09（17 位手机号截断）HEAD 像素在案；昵称 20 字/emoji（REG14）与生日回显（REG15）仅有 DOM 证词+旧批次像素，如实标注证据层级。
- 覆盖核对（原文）：10. 加载态已查：submit-btn--loading/sms-btn spinner 样式在码（index.vue:1109-1120/1043-1050），HEAD 无运行态像素（未触发成功链路，A6 亦判 REG25 UNVERIFIED）——归入 013 缺口如实说明。
- 覆盖核对（原文）：11. 错误态已查：行内错误+抖动+Toast 三件套有 DOM 证词（REG16/19/20/21/22）与旧批次像素（02-after-toast 等），HEAD 新鲜错误态像素因截图 timeout 未落盘——部分依赖旧批次佐证，如实标注。
- 覆盖核对（原文）：12. 组件一致性已查：字段体系（96rpx 高/24rpx 圆角/36rpx 图标/焦点描边）与登录页同一设计语言（设计规范同一族）；未逐 token 并排 login 工作区版本（login/index.vue 有未提交修改，超出本页范围）。
- 覆盖核对（原文）：13. 历史 Bug 回归已查：A2 代码审查 MP-R1-PAGES-REGISTER-INDEX-001（R21 captureException 噪音回归）已核为「已修复待终验」，本审查不重复；R13 判定（素材/参考图/拆分图标_参考_* 禁作页面级对照）已遵守，本页对照仅用 b5163cb0 主视觉素材。
- 覆盖核对（原文）：未做/不可做（如实声明）：真机（44px+ 状态栏）实拍验证——本轮环境无真机通道，Issue 014 的越界量为代码几何推演；DEV 构建专属页面（subpackages/setup/dev）不属本页范围。

| 观察 | 证据 |
|---|---|
| HEAD 默认态完整渲染且与理想素材同族（L1 结构/L2 信息层级/L4 卡片尺寸一致）：REG01-after.png 目验——hero 插画（萌芽吉祥物抱粉心+校园背景，与素材/寻觅注册页-素材_assets/b5163cb0 主视觉及 apps/client/src/static/assets/images/register/reg-hero-illustration.jpg 同图源构图）、左上白底圆形返回键、XUNMI·CAM… | reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-REG01-after.png（105237B，2026-09-23 落盘）；对照 素材/寻觅注册页-素材_assets/b5163cb0-miora_text_t… |
| 手机号输入态渲染正确：REG09-after.png 目验 17 位超长输入被截断格式化为「138 8888 8888」（3-4-4），行内清除图标出现，无溢出无换行破坏 96rpx 字段高度。 | reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-REG09-after.png（HEAD 新鲜批次）；exec-results.json#REG09（value 实测 11 位） |
| 品牌色 token 谱系核对（不作为缺陷）：页面全链渲染 --c-brand=#36C99A（CTA 渐变/获取验证码按钮/协议链接/去登录/聚焦边框），与 v3.1-contract.md:21 冻结值 Primary #34C98A 存在偏差；但注册页自身设计规范已明文裁决该差异——deliverables/注册页/寻觅注册页-设计规范.md:95「主色（青藤绿）#34C38F → #36C99A 采用工程值，两色肉眼难辨，避免全站… | git show 29a2b1df:docs/design/v3.1-contract.md:21（#34C98A）vs deliverables/注册页/寻觅注册页-设计规范.md:95（裁决原文）vs apps/client/src/theme/design-variable… |
| 置灰主按钮白字对比度实测约 1.28:1（#FFFFFF on #DCE5E2，逐通道相对亮度计算），低于常规可读标准——但该态为设计规范 §205 明文规定「disabled：#DCE5E2 纯色/白字/无阴影」，且 WCAG 1.4.3 豁免非活动控件；REG01-after.png 中「注 册」字样仍可辨认。符合设计稿，不立 Issue，仅留档供后续设计演进参考。 | apps/client/src/pages/register/index.vue:1104-1107（.submit-btn--disabled background var(--c-status-disabled,#dce5e2)）+ :1097-1102（__text col… |
| 证据时效与分工边界：① 编号 01-22 截图（2026-09-20）为旧构建佐证（pre-29a2b1df），未据其下结论；② 小控件热区<88rpx（hero__back 68 / field__clear 32 / field__eye 40 / agree__chk 32 rpx）已由交互判定员立 MP-R1-PAGES-REGISTER-INDEX-002（Interaction P3）、代码审查员立 MP-R1-PAGES-… | reports/audit/round-1/interact/PAGES-REGISTER-INDEX-judge.json issues[0]（id -002）；reports/audit/round-1/code-findings/PAGES-REGISTER-INDEX.j… |

### PAGES-REGISTER-SUCCESS.json（pages/register/success｜A3-视觉审查员（截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：pages/register/success 13 项举证（R11 §10.3）：①截图已看——实读 8 张：A05b-13812345678/RS05-after/RS08-after/01-after 全图 + 4 组放大裁切（a05b-tile/rs05-tile/a05b-row1/a05b-bottom/rs05-bottom/op02-bottomleft/rs08-bottomleft）；②理想图已对照——三源：素材 69340cfc jpg（1024 主视觉）、寻觅注册页-高保真设计稿.html:439-453/:700/:704/:732/:781（05 成功屏逐元素）、600×600 资产本体，L1 结构/L6 字号/L9 阴影逐项吻合，插图同 artwork 不同裁切导出（observation 2）；③滚动已测——本席未直接执行滚动操作，引用 OP10（SelectorQuery pageH=812=vpH 单屏无滚动）与 RS12（scrollPos=top），来源 exec-results/OP 文件，非本席操作已如实标注；④点击已测——本席未直接执行点击，引用 OP2/OP4/OP6（tap ok、压栈 1→2、防重）与 RS05/RS07/RS08（主按钮 present、快击×5、alt 命中 120×16 并跳首页）；⑤返回已测——引用 OP3/OP7/OP8/OP9/RS11（回退落点正确、redirectTo 语义返回=登录页）与 RS09/RS10（navError 为 harness 栈底裸调，页面无 navigateBack 调用，源码实读佐证；真机原生返回手势 DevTools 不可复现，列入 unverifiable）；⑥safe-area 已查——success.vue:86 公式 + 双机型截图实证（observation 3）；⑦TabBar 已查——本页非 tab 页无 TabBar；RS08-after 证实出口后 TabBar 正常；⑧空态已查——纯静态成功态无数据空态分支（源码 :50-75 无 v-if、OP11 输入组件 0、rows 为静态 computed）；⑨长文已查——文案固定最长 14 字/行，375 宽下清单行约 260px < 311px 可用宽（RS05 667 机型无溢出实证）；极端长 phone 参数经 onLoad :26-29 剥除非数字后长度≠11 即保持空串回退「完成」，无超长渲染路径（RS03/RS04 非法变体用例 EXECUTED 佐证）；⑩加载态已查——页面零 API 零 loading（源码实读），插图/图标为打包本地资产（check-green.svg src+dist 在盘实测）即时渲染，截图无占位/空白/闪烁残影；⑪错误态已查——页面自身无错误分支；环境级弹窗已归档 001（本席核对遮挡/干净对照成立）；RS06 单次 Vue Error 已立案 009；⑫组件一致性已查——按压反馈缺失/死样式已由 003/005 立案（不重复）；i18n 一致性实测并作出不立案判定（observation 5）；与全站主 CTA 的渐变 token 化已由 007 收口；未做本页与他页按钮的并排像素对照（无同轮双页同框素材，如实标注未执行）；⑬历史 Bug 回归已查——code-findings 001（环境弹窗伪影维持）/002（主按钮热区已修）/007（渐变 token 已修）三条收口条目经本席源码+截图复核无复发（RS/OP 双轮通过）；旧 t…

| 观察 | 证据 |
|---|---|
| 干净渲染与设计包 05 成功屏逐项吻合（L1-L10 核对）：A05b（带参 ?phone=13812345678）与 RS05（无参）两轮截图实读，结构顺序均为 插图→标题「注册成功」→两行引导文案→三行清单卡→主按钮「完善我的资料 →」→次级出口「稍后再说，先随便逛逛」，与 deliverables/注册页/寻觅注册页-高保真设计稿.html:439-453（05 屏：清单三行/主按钮/次级文案）逐项一致；typography 实测… | reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-A05b-13812345678.png；同目录 RS05-after.png；放大裁切 tmp/r1-regsuccess-crops/a05b-row1.p… |
| 插图资产三源核对无缺陷：页面实际渲染的 600×600 资产（src/static/assets/images/register/reg-success-illustration.jpg，dist 同名文件 12876B 与 src 字节数一致）与后端副本 apps/api/uploads/app-assets/.../reg-success-illustration.jpg MD5 相同（AAF16856ACEFBAD06A58730… | tmp/r1-regsuccess-crops/a05b-tile.png 与 rs05-tile.png（同 270×290 窗裁切对比）；理想图 素材/寻觅注册页-素材_assets/69340cfc-miora_text_to_image-1789186341708-0-8… |
| 小程序专项（safe-area/胶囊/机型/滚动）：success.vue:86 顶部 calc(var(--statusbar, env(safe-area-inset-top)) + 96rpx)、底部 env(safe-area-inset-bottom)+48rpx；实测两机型渲染均无遮挡无裁切——A05b（375×812 刘海机型，胶囊与内容无叠印）与 RS05（375×667 传统机型，内容单屏完整、无底部裁切）；单屏无滚动… | reports/screenshots/round-1-interact/PAGES-REGISTER-SUCCESS-A05b-13812345678.png（812 机型）、RS05-after.png（667 机型）、RS08-after.png（switchTab 后首页… |
| 环境伪影定界（均非页面缺陷，避免误报）：①OP 轮（09-20）截图底部左下角「te…」残字跨页面出现——本席裁切实比 PAGES-REGISTER-SUCCESS-01-after.png（本页）与 02-after.png（setup/profile 页）同位置均有，而 RS 轮 RS05/RS08 同位置裁切干净 → 模拟器窗口级伪影；②OP 轮「获取手机号失败」原生弹窗为跨页环境级，已由交互侧立案 MP-R1-PAGES-REG… | tmp/r1-regsuccess-crops/a05b-bottom.png（残字可见）、rs05-bottom.png（干净）、op02-bottomleft.png（他页同残字）、rs08-bottomleft.png（干净）；reports/screenshots/rou… |
| 一致性维核对（含两项不立案判定，防凑数）：①i18n——本页 0 处 useI18n/$t、全部文案硬编码中文（success.vue:23/34-36/53/70/74），zh-CN.ts 无「注册成功/稍后再说/完善我的资料」key，而相邻 login 页（login/index.vue:5,31）与 5 个 tab 页均接 i18n；但 apps/client/src/i18n/index.ts:19-23 明示 mp-weixi… | grep 实测：success.vue useI18n 计数 0、login/index.vue:5,31、全库 145/222 vue 文件用 useI18n、i18n/index.ts:19-23；exec-results.json RS08 measureTap size=… |
| 行为面总览：上一轮交互取证 OP1-OP13（interact/PAGES-REGISTER-SUCCESS.json，构建 2026-09-20 01:50 与源码内容抽查一致）13 项全部「符合」（带参/无参脱敏、主按钮 navigateTo 压栈 1→2、次级出口 switchTab、连点防重、回退链、双身份 B tag0=139****9999）；最新一轮 RS01-RS12 中 11 例 EXECUTED、1 例 FAILED… | reports/audit/round-1/interact/PAGES-REGISTER-SUCCESS.json（OP1-13 全符合 + issues/unverifiable/notes）；reports/audit/round-1/interact/exec-resul… |

### PAGES-HOME-INDEX.json（pages/home/index｜视觉审查员-R1-PAGES-HOME-INDEX（A3，截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：pages/home/index 本轮实际执行的全部核对：① 证据校验：git rev-parse HEAD=aefd8a72 与 screenshot-manifest.json 一致（过期证据无一采信）；exec-results.json 同 gitSha，PAGES-HOME-INDEX 59 条（H01-H59）全部过读。② 截图审查：分配的 A 默认/滚动-中部/滚动-底部、B 交互后/弹层态 5 帧逐一全图审看 + 9 个局部 3-8 倍放大裁片（header/today-right/today-photo-bottom/progress/pcard2-4/relation/tabbar/mid-interest）；另以 PIL 实跑五帧 md5+两两 pixel-diff（发现 036 证据缺口）；真实弹层证据 H02-after.png 单独审看。③ 理想图对照：素材/理想效果图/首页.png 按 L1 结构→L2 层级→L3 交互位置→L4 卡片尺寸→L5 间距→L6 字型→L7 图标→L8 颜色→L9 阴影→L10 微细节逐区比对（头部/今日推荐/恋爱进度/关系动态/兴趣推荐/附近的人/社区动态/邀请横幅/TabBar 九区）；L1-L4 偏差均已立项（030-035/038-039），L5-L10 未发现可证实的间距/字型/阴影级偏差（92% 圆缺 ♥ 记 037 于 L7/L10）。④ 行为证据交叉：H02 弹层帧证实 ×/遮罩/重新定位/我知道了/tabBar 隐藏全部真实存在 → H45/H47/H48 的 FAILED 判定为自动化选择器不命中（.location-sheet__btn--primary/.bottom-sheet-close/.bottom-sheet-mask 未命中而 .location-sheet__btn tapIndex 可命中），非 UI 缺失，不计入问题。⑤ 小程序专项：状态栏/胶囊无叠印（header padding var(--statusbar)+胶囊 104px 预留，截图验证）；滚动到底 InviteBanner 完整露出、TabBar 不遮内容（H51 scrollPos=bottom + 滚动-底部帧）；TabBar 五 tab+寻觅中央浮岛+消息角标渲染正常；页面级滚动回弹/骨架/空态经 H11/H41/H51/H52 观察（冷启动无错误空态闪现 EXECUTED）。⑥ 历史回归线索核对（本页职责内仅视觉面）：偶发白屏——5 帧巡检截图均正常渲染未复现（维持监控，归 R12 巡检线）；InviteBanner CTA——横幅在滚动-底部帧完整渲染、H43 EXECUTED；四色底/第4卡/刷新语义/尾点/1卡/铃铛角标(6)/关注三连——截图面均未见回退迹象（终验归交互/历史回归员）。⑦ 不越界声明：H08「已喜欢」toast×4+、H25「操作成功」toast×3+ 的防连点语义、H50 pullDown ERR(uni is not defined)、H07/H13/H15/H35 元素未命中的归因，均属交互判定员/自动化证据域，本轮仅留档不立项；代码层 018（TDZ）已由代码审查员立项，本轮 console 每次首页挂载的 [Global Error][Vue Error] runtime-2 仅作其运行时佐证记录。⑧ 未核对项（如实声明）：未驱动 DevTools 复拍/复现（只读审查）；vitest 未运行（ask 未要求）；real 模式未验证（全部截图为…

### PAGES-NEARBY-INDEX.json（pages/nearby/index｜视觉审查员-R1-PAGES-NEARBY-INDEX（A3，截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：证据校验：screenshot-manifest.json gitSha=aefd8a72 == 当前 HEAD（aefd8a72f223…）== exec-results.json gitSha，证据未过期，全部采用。
- 覆盖核对（原文）：截图已看：pages/nearby/index A/B 双身份 默认/滚动-中部/滚动-底部/交互后 共 8 张逐张审查（指定图 滚动-底部 另做 2x crop 与像素级量测）。
- 覆盖核对（原文）：理想图已对照：素材/理想效果图/附近的首页.png 按 L1 结构→L2 层级→L3 交互位置→L4 卡片尺寸→L5 间距→L6 文案→L7 图标→L8 颜色（含对比度量测）逐层对照；L9 阴影/L10 微细节目检无独立缺陷。4 张未锚定理想图（等待页面等）与本页无关。
- 覆盖核对（原文）：滚动已测：滚动-中部/滚动-底部两状态已审；「滚到底真伪」未能验证且现有证据矛盾（issue 006，N36 交互证据无效）。
- 覆盖核对（原文）：点击已测（证据层）：exec-results N01-N43 全量已读（43 例：1 FAILED=N02、1 VERIFIED=N01、41 UNVERIFIED，PNG 证据全损）；点击/路由判定归交互判定员，本稿仅取 route/toast 证据，未自行判定交互成败。
- 覆盖核对（原文）：返回已测：N39/N40 有执行记录但通道不稳（navigateBack Uncaught），判 UNVERIFIED——本项未基于有效运行时证据，如实标注为未验证。
- 覆盖核对（原文）：safe-area 已查：底部让位链 160rpx+safe（page-bottom-safe 112rpx+footer-space 48rpx = custom-tab-bar 160rpx+safe）代码在位；默认态截图内容未被 TabBar 遮挡；滚动-底部疑点见 issue 006。
- 覆盖核对（原文）：TabBar 已查：选中态=附近 ✓、五 tab 顺序 ✓、消息 badge ✓、中央浮岛 ✓；「寻觅 vs 匹配」文案偏差已留档（观察 3，归产品裁定）。
- 覆盖核对（原文）：空态已查：无有效截图（N33 证据损）；代码层三态结构已由代码层 006 记录，本稿不重复。
- 覆盖核对（原文）：长文已测：帖子正文最长（阿萍 2 行、小鹿 3 行）完整展示无截断异常；圈名/校名最长（北京电影学院圈）在横排行内完整。
- 覆盖核对（原文）：加载态已查：无有效截图（N31 证据损）；骨架组件存在性由代码层记录。
- 覆盖核对（原文）：错误态已查：无有效截图（N32 证据损）；error-first 顺序由代码层 006 记录。
- 覆盖核对（原文）：组件一致性已查：PostCard 与村口/首页同组件复用；入口砖底图标风格与全局语言一致（跨页对照 pages_home_index 默认）；与理想图的图标形态差异记 issue 007。
- 覆盖核对（原文）：历史 Bug 回归已查：线索 MP-R1-PAGES-NEARBY-INDEX-001 / MP-R2-PAGES-NEARBY-INDEX-001 运行时复现（issue 001，待历史回归员终裁）；MP-R1-NEARBY-005 视觉复核通过（观察 5）；代码层 001-006 已修复声明中 001/002 与运行时矛盾已转记，其余 003-006 未重复报。
- 覆盖核对（原文）：数据极值（静态可判部分）：成员数千分位（8,932）✓、万单位（1.2w）✓、双图/单图/三图帖均正常布局；头像兜底链、50/500 字长文、图片 fallback 无有效静态证据（交互通道截图全损），如实标注为未验证。
- 覆盖核对（原文）：本轮已执行命令：git rev-parse/log、manifest 与 exec-results 解析（python json）、v3.1 合同与 DESIGN_GUIDE 检索（git show/grep）、nearby 页源码通读（template/script/style 关键段 sed/grep）、PIL 像素量测（对比度 5 卡+理想图、照片底缘/TabBar 顶缘/卡片边界 bg-runs 扫描）、8 张截图逐张目检+4 组 crop 放大复核；未运行测试套件、未构建、未驱动开发者工具（A3 职责边界）。

| 观察 | 证据 |
|---|---|
| 五区聚合结构成立且与 v3.1 合同组件面相符：默认态自上而下 头部（附近+发动态+搜索行）→五宫格入口→附近的人双行入口卡（ask 注明 R11 放行的功能增强）→分区②热门兴趣圈横滑→分区③校园圈→分区④附近活动→分区⑤附近动态；v3.1 合同 §19「02 附近」组件面本就含 SchoolList/ActivityList，分区存在性合规。分段 Tab（合同「四 Tab」/ask 理想文字「分段Tab」）未实现（.nearby-t… | reports/screenshots/round-1-tour/A/pages_nearby_index__默认.png、同目录滚动-中部.png；git show 29a2b1df:docs/design/v3.1-contract.md §19（SchoolList/Act… |
| 附近动态 PostCard 结构与理想一致（头像+昵称+校徽 badge+关注 chip+时间·距离+正文+图组+互动栏）：滚动-中部 小鹿帖（+关注、单图）完整；滚动-底部 南风帖（已关注态、图文齐全）、阿萍帖文字与图片可见。分区⑤渲染 3 条与代码 slice(0,3) 一致（数量口径分裂为代码层 009 已记，不重复报）。 | reports/screenshots/round-1-tour/A/pages_nearby_index__滚动-中部.png（y≈455 以下）、同目录滚动-底部.png；apps/client/src/pages/nearby/index.vue:88,550（代码层 00… |
| TabBar 本页表现：五 tab、选中态=附近（绿色高亮）✓、消息 badge「12」、中央绿色浮岛白心与 DESIGN_GUIDE.md:13「绿色圆形浮岛，图标为白色爱心」一致；但中央 tab 文案实现为「寻觅」（custom-tab-bar/index.js:60），而 DESIGN_GUIDE.md:12、v3.1 合同 §4 与理想图均为「匹配」——跨页全局命名问题，归产品/设计裁定，本页如实留档不判缺陷。 | reports/screenshots/round-1-tour/A/pages_nearby_index__默认.png（tabBar 区）；素材/匹配/寻觅1/DESIGN_GUIDE.md:12-13；git show 29a2b1df:docs/design/v3.1-c… |
| 滚动-中部状态：内容从透明状态栏与胶囊下穿过属自定义导航标准行为，无 sticky 头部设计、无文字叠印障碍；胶囊按钮与「公开浏览」chip 短暂重叠为滚动中间态的不可避免叠压，回顶即恢复。 | reports/screenshots/round-1-tour/A/pages_nearby_index__滚动-中部.png（顶部清华行与状态栏/胶囊叠压） |
| 代码层回归项 MP-R1-NEARBY-005（热门兴趣圈第 4 卡右缘裁切）视觉复核通过：实测 card4（运动）右缘 x=327 < scroll-view 裁切界 x=357（=750rpx−32rpx 页边距），第 4 卡完整可见；card5（美食）露出 26px 为横滑 affordance、未被屏缘裁切。该历史修复项本轮视觉确认有效。 | 本轮像素量测（y450/470/490/510/530 五行 bg/fg runs：card4 fg 至 x=327、gap x328-331、card5 x332-357、页边距 x358-372）；对照 reports/audit/round-1/code-findings/… |
| 证据覆盖面如实声明：已登录静态态有 A/B 双身份 × 4 状态共 8 张有效截图（本轮全部逐张审查，A/B 滚动-底部内容一致=同城 feed 非身份差异）；未登录态、骨架/错误/空三态无有效静态截图（interact 通道 saveFile 全部超限失败、automator 多例 timeout），仅存 dom 探针/WXML 转储与 route/toast 运行时证据，三态视觉形态本轮未能核对（代码层 006 已记三态结构在位）。 | reports/audit/round-1/screenshot-manifest.json（nearby 仅 8 张已登录态）；reports/audit/round-1/interact/exec-results.json N02/N31/N32/N33 evidence 字… |
- 证据时效（原文）：currentHead=aefd8a72f2231e8df7affd09004c14c3e4e73745；match=true；reports/audit/round-1/screenshot-manifest.json gitSha=aefd8a72 与当前 HEAD 一致，round-1-tour A/B 全部截图按未过期证据采用；interact/exec-results.json gitSha 同为 aefd8a72…

### PAGES-DISCOVER-INDEX.json（pages/discover/index｜视觉审查员-R1-PAGES-DISCOVER-INDEX（A3，截图与证据的视觉/布局/状态审查，以小程序真实表现为准…｜2026-09-23）

- 覆盖核对（原文）：证据基线：screenshot-manifest.json gitSha=aefd8a72=HEAD ✓；exec-results.json gitSha=aefd8a72 ✓；过期证据处理——round-1-interact 下未被 exec-results 引用的编号截图（1..38、A 系列部分）来源不可证，未引用、未据其下结论。
- 覆盖核对（原文）：13 项举证（pages/discover/index）：①截图已看✓（B轮 默认/弹层态/交互后 三张 + DC05/06/07 现场三张，逐张+11 张派生放大图）；②理想图已对照✓（素材/理想效果图/寻觅匹配卡片页面.png，L1-L10 逐层，取色/占比实测）；③滚动已测△（本轮静态审查不驱动滚动；DC42 EXECUTED 引用，另记 379×834 折叠观察）；④点击已测△（44 例交互结果引用，判定归交互判定员）；⑤返回已测△（DC25/DC41 EXECUTED 引用）；⑥safe-area 已查✓（抽屉 footer env(safe-area-inset-bottom) 代码在位；登录胶囊避让属代码层 003 已修待终验，本轮无游客态落盘截图未做视觉复核）；⑦TabBar 已查✓（默认态五 Tab 中央凸起寻觅选中正确、消息红点样式正常；弹层态 tabBar 隐藏✓）；⑧空态已查△（本轮无成功落盘截图——证据缺口如实记录，非「无问题」）；⑨长文已查△（DC35 FAILED 无截图，缺口）；⑩加载态已查△（DC01 EXECUTED 但截图保存失败 exceeded storage limit，缺口）；⑪错误态已查△（DC07 FAILED 无截图，缺口）；⑫组件一致性已查✓（筛选 chips/底部双按钮与全 App chip、pill button 形态一致；CTA 圆钮与理想图同构；抽屉 Tab 因 026 缺样式属不一致项已立案）；⑬历史 Bug 回归已查✓（005-013 簇：006 视觉复核通过——CTA 三键+标签滚动前完整可见于 tabBar 之上；009 初始态视觉正常落在「推荐」；013 视觉复核确认 ❝ 仍渲染、仍开放；005/010 交互层归交互判定员、008/011/012 维持代码层立案；R11 挂起三项全部复核：环形仍粉盘（028）、收藏入口仍缺（029）、性别符已补但样式差（030））。
- 覆盖核对（原文）：Token 裁决链执行：git show 29a2b1df:docs/design/v3.1-contract.md 核对 Primary #34C98A/Love #FF6FA3/Whisper #4D8DFF ✓；现行 --c-love=#FF6B81（design-variables.scss:272）与契约字面有差，但理想图渲染粉（#FE6687/#FE5D7E）与现行值同族，按「理想图为唯一页面级对照依据」不立案 token 漂移；环色以理想图实测绿 RGB(68,184,130) 为准（028 证据）。
- 覆盖核对（原文）：不重复报清单：代码层 findings 003-025 全部读过；本轮 026/027（FilterDrawer Tab 零样式/内容区右溢）、028（匹配环）、029（收藏入口+filter 图标 L7）为其未覆盖的新视觉/功能面发现；030/031 与代码层 013 显式标注并案关系；DC43 热区 72rpx、DC28-39 交互失败判定等属交互判定员职责，未在视觉层重复立案。
- 覆盖核对（原文）：本轮未做（职责/能力边界）：未驱动模拟器/真机（静态审查+已有行为证据）；未运行单测/vue-tsc；未复核 en-US 语言下页面渲染（无截图证据）；027 的运行时根因未定位（源码样式与编译产物均无显性错误，需运行时排查，视觉结果与量测已固化）；DC02 observed 中 .discover-login-hint:present（已登录态）疑为 v-show 存在性判定口径问题，属交互层，未立案。

| 观察 | 证据 |
|---|---|
| 默认态与理想图逐层对照：L1 结构（寻觅♥标题+右上筛选 / 推荐\|附近分段 / 沉浸式大图卡信息位自上而下=左上白底粉字距离chip、右上白底绿点绿字在线徽标、姓名+年龄+性别徽章、学校·专业、距离·在线、4枚兴趣标签、bio、右下匹配度、CTA 行、五Tab 中央凸起寻觅）与理想图完全同构；L3 交互位置全部同位（含 CTA 底部横排 跳过\|打个招呼\|喜欢——理想图本身即为该布局，与 ideal 描述文字的「右侧竖列」不符处以理想图… | reports/screenshots/round-1-tour/B/pages_discover_index__默认.png + tmp-a3/def-segment.png、def-cta.png、def-chips.png + scan2.ps1 取色输出（ideal li… |
| 弹层态遮罩与层级正确：全屏弹层打开时遮罩同时压暗页头（页头空白区 RGB 由默认态 (255,255,255) 变为 (147,150,159)），面板白色圆角顶起于页头之下，自定义 tabBar 被隐藏（截图底部无 tabBar，与 DC27 observed「全屏弹层+自定义 tabBar 隐藏」一致）；底部重置/确认按钮右缘正常（≈x359），确认按钮品牌绿填充、重置浅底描边，无 safe-area 缺失迹象（代码含 env(sa… | reports/screenshots/round-1-tour/B/pages_discover_index__弹层态.png + tmp-a3/pop-footer.png + mask.ps1 像素对比输出（header-bg 255→147）+ exec-results.… |
| 行为证据档核对：exec-results.json gitSha=aefd8a72 与当前 HEAD 一致；PAGES-DISCOVER-INDEX 清单 44 例（EXECUTED 28 / FAILED 15 / SKIPPED 1），FAILED 集中在筛选抽屉细粒度交互（DC28/29/31/32/35-39 的 element not found）与空态/错误态构造（DC05/06/07/10/21）——判定归交互判定员；对本… | reports/audit/round-1/interact/exec-results.json（gitSha 字段与 FAILED 清单）+ reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-DC05-after… |
| 设备尺寸差异观察（不立案）：交互取证设备的 DC05-after（379×834）首屏中 CTA 三键圆钮下半被 tabBar 折叠遮挡、文字标签不可见（需滚动可达）；tour-B 设备（373×820）同内容完整可见。差异源于同 rpx 布局在不同宽高比设备上的折叠位置，滚动可达（代码层 padding-bottom 280rpx+safe 已修，DC42 滚动用例 EXECUTED），不构成缺陷；如需首屏免滚完整 CTA，可在后续设… | reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX-DC05-after.png 对比 reports/screenshots/round-1-tour/B/pages_discover_index__默认.png |

### PAGES-MESSAGES-INDEX.json（pages/messages/index｜A3 视觉审查员（截图与证据视觉/布局/状态审查；代码层 A2 findings 024 之前序号已被占用，本文件从 0…｜2026-09-23）

- 覆盖核对（原文）：pages/messages/index（R1 视觉审查，证据基线 gitSha=aefd8a72 一致）：
- 覆盖核对（原文）：✅ 截图已看：A 组三张+B 组默认逐张审看，关键区域（头部/快捷卡/助手卡/五行列表/tabBar）3x 放大复核（reports/audit/round-1/tmp-a3/*.png）。
- 覆盖核对（原文）：✅ 理想图已对照：素材/理想效果图/消息.png 左屏逐区对比（L1 结构：区块顺序一致；L3 交互位置：CTA 侧/搜索+加号入口偏差已记 024/019；L4 尺寸：双卡等宽半屏一致；L8 颜色：按钮实心vs浅绿、互相关注蓝vs灰已记 024/025）。
- 覆盖核对（原文）：✅ 滚动已测：行为证据 MSG09（exec-results.json idx232）pageScrollTo bottom/top EXECUTED，top-scrim 显隐 present、chat-item present；页面 padding-bottom 预留 tabBar（index.vue:575）。
- 覆盖核对（原文）：⚠️ 点击已测（部分）：行为证据 MSG02/03/04/08 FAILED（未登录三键在 mock 构建不可达——NotLoggedWaiting v-if 排除 mock，属环境限制非回归；错误态 tap 目标未找到），MSG05 默认态全模块 present EXECUTED；hover 反馈为 class 方案（--hover 类，index.vue:645/695/759/906/965/1034）。
- 覆盖核对（原文）：✅ 返回已查（口径适配）：本页为 tabBar 页，无返回栈语义；任意页 2 步回 tab 的口径不适用本页自身。
- 覆盖核对（原文）：✅ safe-area 已查：header padding 注入 --statusbar/--capsule-right（index.vue:594-598）+实拍无状态栏叠印；底部 calc(112rpx+safe-area+16rpx) 预留。
- 覆盖核对（原文）：✅ TabBar 已查：五 tab 渲染、消息态高亮、最后一条会话不被遮挡（MSG09 + padding-bottom）。
- 覆盖核对（原文）：❌ 空态已查（证据缺失）：空态截图为默认态字节副本（027），MSG07 未触发成功——空态视觉未取证，仅代码层核实（且发现缺推荐兜底，026）。
- 覆盖核对（原文）：⚠️ 长文已查（代码层）：预览行 ellipsis 三件套齐备（index.vue:1105-1111），50/100 字极值未做视觉实测。
- 覆盖核对（原文）：❌ 加载态已查（证据缺失）：骨架 list×5 代码存在（index.vue:357-359），MSG06 观测 absent（首屏过快），无骨架截图。
- 覆盖核对（原文）：❌ 错误态已查（证据缺失）：MSG08 触发失败，ErrorState 视觉未取证（重试穿透缓存逻辑已由代码层 008 核实）。
- 覆盖核对（原文）：⚠️ 组件一致性已查（本页内）：关系标签/未读徽章/官方徽章三组件页内自洽；与 chat-session/likes 页的跨页芯片对比未在本轮展开（一致性维跨页并排留待汇总轮）。
- 覆盖核对（原文）：✅ 历史 Bug 回归已查：004 视觉证实修复、010 视觉证实修复、019 视觉证实仍在、005 mock 下不可达（代码层已证接线完整）、R13-DATA-3894 mock 不可见维持待修、006..018 P2 簇按代码层 findings 复核不重复报。
- 覆盖核对（原文）：未基于新代码验证的项：无——manifest gitSha 与当前一致，本轮所有结论基于 aefd8a72 工作区代码与同基线截图。

| 观察 | 证据 |
|---|---|
| 默认态整体结构与理想图层级一致且信息顺序正确：Header（消息+绿苗+副标）→快捷双卡等宽半屏→寻觅助手官方卡（官方标+未读徽章+箭头）→最近聊天列表（头像+昵称+关系标签+预览+相对时间+免打扰图标）。「正在升温」「活动推荐」两区块因 mock dashboard 无 assistant/warmPeople 数据按 011 修复约定整体隐藏（v-if 守卫），非缺块缺陷。 | reports/screenshots/round-1-tour/A/pages_messages_index__默认.png；index.vue:425/439/535 v-if 守卫；mock stores/messages/mock-data.ts 无 assistant/… |
| 历史 004（时间列永不显示）视觉证实已修复：列表右侧时间列真实渲染（00:55 / 昨天 / 00:28 / 周一 / 周日，B 组为 01:58 / 昨天 / 01:31 / 昨天 / 周日），无 NaN、无空串；陈默行免打扰图标+时间同排显示（003 修复视觉证实）。 | tmp-a3/rows.png 放大可读；index.vue:518 formatTime(session.lastMessageSentAt)；utils/time.ts:384-433 formatChatListTime（diffDays=0→HH:mm，1→昨天，<7→星… |
| 历史 010 视觉证实已修复：自定义导航头部不与模拟器状态栏（1:08/100%电池）及右上胶囊叠印，搜索圆钮位于胶囊正下方留白处；019（缺「+」发起会话入口）视觉证实仍在：header 右侧仅搜索一枚按钮。 | tmp-a3/header.png：胶囊与搜索钮无重叠、右侧仅 1 枚圆形按钮；index.vue:342-346 header__right 仅 toggleSearch。 |
| 列表排序非乱序：实拍顺序=置顶组（夏言📌暧昧中）→高意向组（叶知秋 mutual_follow/88）→普通组（陈默 chatting/32、星河、顾言），组内按 lastMessageSentAt 降序。陈默「聊天中」排叶知秋（昨天）之后不违反排序规则——chatting 不在高意向状态白名单且其 relationship.score=32<51（index.vue:122-131），mock 数据核实无误。与理想图的差异仅在「分组… | tmp-a3/rows.png（夏言行名后可见置顶图钉）；mock-data.ts:19/36/56（pinned:true、score:32、mutual_follow/88）；stores/messages.ts:609-611 时间降序；index.vue:120-141。 |
| 行级未读粉色角标（理想图 2/1 红点）在实拍中全部为 0：mock 数据带 unreadCount 2/1/1/5，但 onShow 即 markAllSessionsRead 红点闭环自动清零，角标只在进入页面前存在（tabBar 层）。这与理想图「页内可见未读数」存在产品级冲突，属既定设计（index.vue:260/276 注释），不判缺陷，留需求对照员裁决；行级角标渲染链本身存在（index.vue:520-522）但本轮无截… | tmp-a3/rows.png 五行均无角标；mock-data.ts:19/53/65/72 unreadCount=2/1/1/5；index.vue:274-278 onShow→markAllSessionsRead；助手卡 6+ 徽章=通知未读合计，链路自洽。 |
| R13-DATA-3894「全链路验收测试消息 2026-09-12」在 mock 构建五会话预览中未出现（预览均为 [语音]/[图片]/普通文本）——该残留属真实后端库行（代码层已证仓库无种子来源），mock 截图无法证实/证伪其真实环境表现，维持代码层「待修复（等授权删双表）」结论不变。 | tmp-a3/rows.png 各行预览文案；stores/messages/mock-data.ts:14-81 五会话预览值；reports/audit/round-1/code-findings/PAGES-MESSAGES-INDEX.json R13-DATA-3894… |
| 四态关系标签颜色与代码定义一一对应（聊天中=绿、暧昧中=粉、互相关注=蓝、刚认识=灰），字体 20rpx/浅底圆角 8rpx，与理想图芯片形制一致；仅互相关注色相偏离（另立 025）。tabBar 五 tab、消息 tab 绿色高亮、中心寻觅凸起钮，与全 app 自定义 tabBar 口径一致（理想图中心为平面「匹配」tab，属全局导航设计差异，非本页缺陷）。 | tmp-a3/rows.png + tmp-a3/tabbar.png；index.vue:1077-1104 status-* 四组样式；index.vue:286-304 标签映射。 |

### PAGES-PROFILE-INDEX.json（pages/profile/index（我的，tabBar）｜A3 visual reviewer（截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：截图已看：round-1-tour A/B 双轮 × 默认/滚动-中部/滚动-底部/交互后共 8 张逐张审查；round-1-interact 本页 97 张中按 MD5 去重后抽验 00-base/01-before/02-before/25-guest-other/ISSUE-FAB-zoom 共 5 张；关键区域 4 处 PowerShell 3x 放大裁剪复核（语音 header/登录态顶栏/FAB/区间距）。
- 覆盖核对（原文）：理想图已对照：已经填完资料的个人主页.png（登录态 L1 结构/L2 层级/L3 交互位置/L4 卡片尺寸/L8 配色通过，L3/L6 偏差见 Issue 005）+ 未登录个人主页.png（未登录态 L1/L2 偏差见 Issue 003、状态栏叠印见 Issue 002）；素材/参考图/拆分图标_参考_* 未作页面级对照（R13 判定：仅 26×26~356×35 图标裁切件，禁用）。
- 覆盖核对（原文）：滚动已测：滚动-中部（相册/帖子/互动区）与滚动-底部（更多功能/语音/背景/邀请区）两态审查；顶部滚动裁切（最近访客行半行入状态栏带）属正常滚动中态，非 sticky/fixed 缺陷。
- 覆盖核对（原文）：点击已测：本层未亲自执行模拟器点击（无 devtools 会话）；以 reports/audit/round-1/interact/exec-results.json S04-profile #264-303（登出/登录/头像菜单/语音录制播放删除/统计/故事/相册/帖子/互动/更多/编辑跳转全部 act 记录）与 round-1-interact 97 张操作截图为行为证据，交互正误判定归交互判定员。
- 覆盖核对（原文）：返回已测：本页为 tabBar 页无系统返回；未登录态 topbar ‹ 返回钮在 25-guest-other 可见（落位缺陷见 Issue 002）；深链他人态（interact #271 reLaunch?userId=4001）无截图留档——未验证。
- 覆盖核对（原文）：safe-area 已查：登录态 MyHeader.vue:96-98 消费 --statusbar 让位正常（截图无叠印）；未登录态缺失即 Issue 002；页面底部 page-bottom-safe（index.vue:1641）与 FAB 双倍 env 兜底（GlobalPublishFab.vue:112）截图无遮挡。
- 覆盖核对（原文）：TabBar 已查：5 Tab 齐全（首页/附近/寻觅/消息/我的），中央寻觅凸起心形完整，FAB 与 TabBar 无重叠，滚动-底部最后一条内容（推荐给好友卡）在 TabBar 上方完整可见。
- 覆盖核对（原文）：空态已查：我的故事空态=仅虚线添加卡（无日常数据）；未登录 0 占位齐全；「我的匹配」0 值空白为缺陷（Issue 004）；相册 4 张/帖子 3 篇非空态。
- 覆盖核对（原文）：长文已查：未验证——mock 数据文案均短（bio 21 字/帖子 20-24 字），长昵称/500 字极端态在本轮截图集中无留档。
- 覆盖核对（原文）：加载态已查：未验证——骨架屏代码在位（ProfileShell.vue:71-73 LoadingSpinner + 骨架），本轮截图集无加载中间态留档。
- 覆盖核对（原文）：错误态已查：未验证——error/retry UI 代码在位（ProfileShell.vue:74-79），本轮截图集无错误态留档。
- 覆盖核对（原文）：组件一致性已查：统计/互动图标配色登录-未登录两态对照完成（未登录统计 schema 不一致见 Issue 003）；按钮/卡片圆角与阴影跨区块一致；字面色值/token 违反簇已由 A2 MP-R1-PROFILE-221 提报不重复；与理想图的 tabBar/统计配色一致。
- 覆盖核对（原文）：历史 Bug 回归已查：MP-R1-PROFILE-201 视觉层不复现（observation 3）；MP-R1-PROFILE-202 视觉层成立（observation 4）；R12-IND-PROFILE-INDEX-001 截图确认未修复（Issue 002）；R1-PROFILE-203..214 簇视觉层无新增复发（VIP 卡未显示属 commerce 开关门禁非颠倒回归；targetUserId 复位/分享假实现/空 catch 属代码层已报；自定义 tabBar 无 backdrop-filter 白斑）；ISSUE-FAB-zoom 为已修复项 MP-R1-PROFILE-001 历史证据（observation 7）；MP-R1-PROFILE-219 他人态胶囊几何因无本页他人态截图——未验证，留交互判定员/终验。
- 覆盖核对（原文）：数据极值已查：0 值（Issue 004）；85% 完成度魔数由 A2 MP-R1-PROFILE-225 提报不重复；无头像/缺字段态 mock 未覆盖未验证；图片 fallback 链视觉层正常（相册/头像直显）。

| 观察 | 证据 |
|---|---|
| 登录态默认屏 L1-L4 与理想图 已经填完资料的个人主页.png 一致：资料完整度卡（85%+去完善绿胶囊）→4 格等宽统计→我的故事（虚线添加卡）→我的相册（横滑）→我的互动→更多功能 顺序齐备；统计四格标签（我喜欢/喜欢我的/我赞/访客）与图标配色（紫/粉/橙/蓝）和理想图一致；底部 5 Tab（首页/附近/寻觅凸起心形/消息/我的）与理想图一致。 | reports/screenshots/round-1-tour/A/pages_profile_index__默认.png vs 素材/理想效果图/已经填完资料的个人主页.png 逐区对照 |
| 登录态顶栏分享/设置两图标与微信胶囊同排但无叠印：3x 放大件中图标右缘与胶囊左缘横向间隙 ~20px，编辑资料白胶囊位于图标行下方无遮挡——登录态胶囊避让合格（未登录态不合格，见 Issue 002）。 | reports/audit/round-1/findings/tmp-top-crop.png（A 默认 x150-373/y30-100 3x） |
| MP-R1-PROFILE-201（配图裸连 /api/v1/media/** 白图）视觉层不复现：相册 4 张缩略图与页头头像均正常加载显示；我的帖子 3 卡无图系 mock 数据本身无 images 字段（stores/profile.ts:195-217 三条均无 images），非加载失败，白图回归不成立。 | reports/screenshots/round-1-tour/A/pages_profile_index__滚动-中部.png（相册 3 张可见+帖子 3 卡）+ stores/profile.ts:195-217 |
| MP-R1-PROFILE-202（语音/背景/邀请 UI 不可达）视觉层确认已修复：滚动-底部截图中语音介绍卡（已录制态：播放钮+12 柱波形+0:42+重录/删除双胶囊）、编辑背景图卡、推荐给好友卡依次可见且形态完整。 | reports/screenshots/round-1-tour/A/pages_profile_index__滚动-底部.png + tmp-voice-crop.png |
| A/B 双巡检本页 8 张截图逐对完全一致（仅状态栏时钟 1:08/1:09 与 2:11/2:12 差异）：本轮 A、B 两 identity boot 自检均为 logged-in userId=user-1001，双身份在本轮等价，截图全同为预期，非页面缺陷。 | 8 张 tour 截图逐对目视比对 + reports/audit/round-1/screenshot-matrix.md §二（boot-verify-A/B 均为 user-1001） |
| 交互后截图与默认态无视觉差异（A/B 均是）：本轮交互（tap 头像/统计/故事卡等）未改变首屏视觉状态，符合预期（无态变交互）。 | A pages_profile_index__默认.png vs A pages_profile_index__交互后.png（B 同）逐像素目视比对 |
| 历史证据 ISSUE-FAB-zoom.png（绿 FAB 被白色面板盖住下半）为已修复项 MP-R1-PROFILE-001 的历史留档：现行全部截图中 FAB 完整位于 tabBar 上方无遮挡（bottom: calc(env*2+200rpx)，GlobalPublishFab.vue:112，z-index:1000），该回归不成立。 | reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-ISSUE-FAB-zoom.png vs A 滚动-底部/中部现行 FAB 形态 + components/common/GlobalPublishFab.vue:… |

### SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json（subpackages/village/village/index｜视觉审查员-R1-SUBPACKAGES-VILLAGE-VILLAGE-INDEX（A3，截图与证据的视觉/布局/状态…｜2026-09-23）

- 覆盖核对（原文）：截图已看：本页 6 张静态（A/B × 默认/滚动-中部/滚动-底部，manifest 702-715/1472-1485 行，磁盘逐一核验存在）+ 4 张交互帧（VI01/VI14/VI22/VI23/VI38），全部逐张目视审查。
- 覆盖核对（原文）：理想图已对照：素材/理想效果图/帖子.png（ask 指定的帖子卡结构依据）逐元素对照→偏差记 MP-R1-VILLAGE-INDEX-203；本页无一对一理想图，内容顺序对照 ask 给定理想描述（顶部搜索+发帖→三入口→Feed）→搜索行挤压记 202；频道结构差异（现实 5 频道 Tab vs 理想描述「三入口关注/同城/发现」）属产品结构演进且 R13 判定未列为偏差，如实记录此处不立项、留需求对照员裁决。
- 覆盖核对（原文）：滚动已测：滚动-中部/底部双身份 4 帧已审→发现 201（页面级滚动+头部滚走+状态栏叠印）。
- 覆盖核对（原文）：点击已测：本页 48 条交互记录全量读取（exec-results.json manifest=SUBPACKAGES-VILLAGE-VILLAGE-INDEX，EXECUTED 25/FAILED 23）；判定权在交互判定员，我仅取截图态作视觉证据（VI22 报名态正常、VI14/VI23/VI01 实际画面与记录声称频道不符已如实标注）。
- 覆盖核对（原文）：返回已测：视觉层未获有效证据（VI47 证据字段 ERROR:timeout），如实标注未验证。
- 覆盖核对（原文）：safe-area 已查：发帖条底部安全区留白可见（滚动-底部帧），通过。
- 覆盖核对（原文）：TabBar 已查：本页非 Tab 页（pages.json 无 village），无 TabBar 遮挡问题；头部胶囊避让在默认态有效（见观察 2）。
- 覆盖核对（原文）：空态已查：mock 数据下空态未出现，VI48（发帖开关关闭态）截图 ERROR:timeout——空态视觉未验证，如实标注。
- 覆盖核对（原文）：长文已查：本批帧内帖子正文均为 1-3 行中短文案，500/1000 字长文与多图九宫格极限态未被捕获，如实标注未验证（北鸟卡 2 图并排为多图唯一实样，渲染正常）。
- 覆盖核对（原文）：加载态已查：骨架屏（VI08）证据缺失（top=login、无截图），未验证；下拉刷新中态（VI40）截图存在但未逐帧审（refresher 收起态正常）。
- 覆盖核对（原文）：错误态已查：无错误态截图证据，未验证，如实标注。
- 覆盖核对（原文）：组件一致性已查：页面白底+绿色 accent 选中态符合 v3.1 节奏红线（村口=白底非 Hero 区）；发帖条占位随频道切换、状态 chip（预告/进行中/已报名）与全站语义色一致；PostCard/ActivityCard/ChannelTabs/ChannelComposerBar 与其他 village 子页（detail/history/post）共用组件未见风格分裂。
- 覆盖核对（原文）：历史 Bug 回归已查（7 条线索逐一核对）：MP-R1-VILLAGE-002/INDEX-112 修复在位（默认态截图终验证据归档，观察 2）；INDEX-101 代码已修+VI24 频道记忆/VI41 滚动恢复 EXECUTED 旁证（但频道切换截图态与记录不符，视觉终验缺口已标注）；INDEX-102 修复在位（VI22 行为旁证）；MP-R1-VILLAGE-INDEX-103/MP-R3-VILLAGE-INDEX-001 图文不符仍在（视觉确认，观察 4，不重复立项）；MP-R2-VILL-013 同族在案同上；MP-R3-VILLAGE-INDEX-002 热度榜替换语义代码在案（热度榜视觉态未被捕获，无法截图补证，维持代码审查结论）。R13 三判定：标题挤一行仍在（202）、帖子卡结构相反仍在（203）、绝对日期已修复（观察 3）。
- 覆盖核对（原文）：未执行项（A3 边界）：未运行开发者工具/模拟器、未重新构建、未修改任何业务代码；仅归档 2 张放大裁剪证据件（findings/evidence-MP-R1-VILLAGE-INDEX-201/202-*.png）。

| 观察 | 证据 |
|---|---|
| 默认态双身份一致且结构完整：头部（圈子+校园恋爱社区+搜索）→5 频道 Tab（今日广场选中态绿色下划线+填充图标）→「置顶 1 条」折叠条→帖子流（头像+昵称+校友 pill+参数行+正文+配图+话题 chip+动作栏）→底部发帖条（在今日广场发帖…+绿色发帖钮）。A/B 两身份渲染逐像素级一致（同 mock 数据），无身份分支差异。 | reports/screenshots/round-1-tour/A/subpackages_village_village_index__默认.png 与 B 同名帧对照；i18n zh-CN.ts:1814-1815 文案一致 |
| 【回归通过·MP-R1-VILLAGE-002 / INDEX-112 终验视觉证据】搜索框右端未伸入胶囊区：默认态下头部整行起画于胶囊底缘之下（胶囊 y≈17-38，搜索行 y≈57-77，纵向已错行），横向搜索框右缘 x≈332/373 与胶囊左缘 x≈283 无投影冲突；112px 预留在所截机型上有效。归档供「已修复待终验」转终验证据。 | reports/screenshots/round-1-tour/A、B …__默认.png 头部区放大核对；index.vue:902-904 padding-right 计算在位 |
| 【回归通过·R13「绝对日期」线索】全部帖子时间均为相对格式（11分钟前 / 4小时前 / 5小时前 / 7小时前 / 1 天前），未出现绝对日期串；PostCard.vue:256 实证 formatRelativeTime 在用。该 R13 判定项已修复。 | reports/screenshots/round-1-tour/A …__默认/滚动-中部/滚动-底部.png 三态全部时间字段目视核对；PostCard.vue:256 |
| 【支撑既有发现·不重复立项】mock 图文不符族在首屏用户可见：图书馆自习区帖配水珠微距图（默认态第 2 卡）、学咖啡拉花帖配海岸悬崖图（滚动-中部橙子卡）、雨天泡茶看书帖配风暴海岸礁石图（滚动-底部叶青卡）、走遍中国西部帖配欧式城堡图（滚动-底部夏言卡）。与代码审查 MP-R3-VILLAGE-INDEX-001（15 对清单）同族，视觉证据补充归档，不另立项。 | reports/screenshots/round-1-tour/A 三张静态截图帖子卡图文并读；对照 reports/audit/round-1/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json MP-R3-VILLAGE… |
| 活动频道版式正常：推荐活动区头+副题、活动卡（封面图+标题+状态 chip「预告/进行中(橙)/已报名(置灰)」+时间·地点·人数元信息行+绿色报名钮）层级清晰；底部发帖条占位随频道切换为「发帖推荐活动…」。INDEX-102 修复的行为旁证：VI22 实测点「报名」弹「报名成功」toast 且路由停留本页（.activity-card__enroll--done 出现），未误触详情跳转。 | reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI14-after.png、VI22-before/after.png；exec-results.json VI22 toast:[报名… |
| 【视觉证据缺口·如实标注】以下状态在本批证据中未被真实捕获，视觉层不验证：①学校圈认证门——VI14 截图实为活动频道（Tab 绿色下划线在「活动」），VI15/16/17 选择器未命中与之一致；②热度榜——VI23 截图仍是今日广场；③LockScreen 锁定态——VI01 记录声称锁定态但截图为普通页面且 dom .lock-screen:absent；④回到顶部按钮、骨架屏、空态、错误态、下拉刷新中态、发帖开关关闭态——对应截图… | reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-VI01/VI14/VI23-after.png 目视比对；exec-results.json 对应条目 dom/evidence 字段 |
| 安全区与非 Tab 页核对：底部发帖条固定且与 home indicator 之间保留安全区留白（page-bottom-safe），滚动-底部帧末卡完整可见无遮挡；本页已移出 TabBar（pages.json tabBar.list 无 village），顶部无原生导航栏与 TabBar 遮挡问题，与 routes.ts「社区二级页」定位一致。 | reports/screenshots/round-1-tour/A …__滚动-底部.png 底部区；pages.json tabBar.list |

### SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json（subpackages/village/village/publish（村口·发布帖子）｜A3 视觉审查员（Layer A3，截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：证据校验：screenshot-manifest.json gitSha=aefd8a72 == git rev-parse HEAD (aefd8a72f2231e8df7affd09004c14c3e4e73745)，buildMode=build:mp-weixin:mock，证据未过期；interact/exec-results.json 同 gitSha。
- 覆盖核对（原文）：截图已看：本页 A 身份 5 态（默认/交互后/弹层态/校验错误/键盘弹起-输入后）逐张 + B 身份默认态 + post.vue 默认态（对照）+ PUB27-after（3x 局部放大取证，临时裁剪件已清理）。
- 覆盖核对（原文）：理想图已对照：素材/理想效果图/发布帖子页面.png，L1 结构（模块顺序/缺底部工具条=有需求注释）/L2 层级/L3 交互位置/L4 卡片尺寸逐层比对；L5 间距（textarea 实测略高于理想稿，量级不大且利输入，不作缺陷）/L6 字号/L7 图标/L8 颜色（CTA 禁用态=有意偏差已溯源）/L9 阴影/L10 细节。
- 覆盖核对（原文）：滚动已测：PUB36 EXECUTED（pageScrollTo bottom/top + scrollElement，scrollPos=bottom，无白屏卡死）。
- 覆盖核对（原文）：点击已测：PUB08（发布校验 toast）、PUB22/23（弹层开/双路关）、PUB27（图格添加入口）EXECUTED；PUB09/10/15-21/24-31/33/34 因输入/选择器工具失败（el.input is not a function、__CAND__ element not found）未完成，如实标注。
- 覆盖核对（原文）：返回已测：PUB02 空内容 X 直接返回村口、PUB03 栈=1 兜底 reLaunch、PUB37 重复进出无残留，均 EXECUTED。
- 覆盖核对（原文）：safe-area 已查：弹层面板 env(safe-area-inset-bottom)（publish.vue:811）+ 弹层态截图底部无裁切；头部状态栏 JS 注入（587 行）五态截图无叠印。
- 覆盖核对（原文）：TabBar 已查：本页为 subpackages 非 tabBar 页，五态截图均无 TabBar，符合预期。
- 覆盖核对（原文）：空态已查：表单空态=默认态截图（placeholder/0/500/禁用 CTA 正确）；列表空态不适用于表单页。
- 覆盖核对（原文）：长文已查：未跑通——输入工具失败（PUB09/10/15/16/17 FAILED），500 上限截断与剩 50 字警示色未能运行验证（代码层已实现：maxlength=MAX_CONTENT_LENGTH、--c-warning #FF9F43）。
- 覆盖核对（原文）：加载态已查：提交 showLoading(mask:true) 代码路径在（publish.vue:515），发布成功全链路未跑通（PUB10 工具失败），运行态未验证。
- 覆盖核对（原文）：错误态已查：PUB08 空内容 toast「请输入内容」运行证据；发布失败 toast+留页路径为代码层 109 号已立项（hideLoading/toast 顺序），本轮无运行态反证。
- 覆盖核对（原文）：组件一致性已查：与同构页 post.vue 并排（CTA 禁用/启用样式、页底色、底部工具条三处分叉→归 MP-R1-PUBLISH-103）；弹层选项行结构与 post 版统一（R21 注释+截图印证）。
- 覆盖核对（原文）：历史 Bug 回归已查：MP-R2-PUB-002 无回归；MP-R2-PUB-101 无回归；MP-R1-PUBLISH-001 目验一致；MP-R2-VILL-013 本页同族新实例已立 MP-R1-SVVP-001；R1-PUBLISH-002..014 簇以代码层复核结论为准，本轮未产生运行态反证。
- 覆盖核对（原文）：未运行项汇总：软键盘弹起表现（模拟器截图无键盘）；长文 500 截断/警示色；发布成功 loading→toast→400ms 返回全链路；深色模式下白底页面表现（代码层 102 号已立项）。以上均为工具或轮次能力限制，非本页通过项。

| 观察 | 证据 |
|---|---|
| 五态静态截图（默认/交互后/弹层态/校验错误/键盘弹起-输入后）逐张已审 + B 身份默认态抽查：L1 结构顺序与理想图一致（发布到→正文→图格→话题→位置→提及→谁可以看→小贴士），L2-L3 行项图标/右侧 meta/箭头位置一致。两处与理想图的结构差异均为有据可查的刻意决策，不立项：①正文计数 0/500（理想 0/1000）——constants/village.ts:15 注明与 stores/village MAX_CONT… | reports/screenshots/round-1-tour/A/subpackages_village_village_publish__默认.png；素材/理想效果图/发布帖子页面.png；apps/client/src/constants/village.ts:15；a… |
| 「校验错误」静态截图与默认态无差异、无可见 toast，但交互证据 PUB08（status EXECUTED）toast 数组记录 showToast「请输入内容」成功触发——系截图未抓到 1.5s toast 时窗，非缺陷。「键盘弹起-输入后」截图输入成功（巡检输入test123，计数 11/500 逐字核对正确，发布钮由禁用薄荷态翻为实心品牌绿，canSubmit 状态机目验通过）但软键盘未在模拟器截图中呈现；长文输入/500 截… | reports/audit/round-1/interact/exec-results.json（PUB08 toast 请输入内容；PUB09/10/15/16/17 failureReason el.input is not a function）；reports/scree… |
| 弹层态截图证实渠道弹层三级分组完整（公域·所有人可见 / 校园私域·同校可见 / 兴趣圈子·圈内成员可见）+「已加入」标签+成员数短格式（音乐 8,123 / 美食 7,240）+ 当前选项绿色 ✓ → MP-R2-PUB-002 无回归。PUB22/23（弹层开/遮罩关/卡再点关）EXECUTED。PUB27-after 经 3x 放大核验：friends 草稿恢复后目标卡「个人日常 / 日常·仅互相喜欢或关注我的人可见」目标与可见性… | reports/screenshots/round-1-tour/A/subpackages_village_village_publish__弹层态.png；reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VIL… |
| CTA 禁用态（#C7E9DC 底/#2A7A5E 字，publish.vue:788-789）与理想图「恒实心绿白字」的有意偏差系 R3 记录在案的对比度修复（禁用白字对浅绿底 1.36:1），不立项。与同构发布页 post.vue 并排对照发现双页视觉分叉：post.vue 禁用=中性灰底灰字+启用=品牌渐变+投影（post.vue:1086-1096），本页=薄荷禁用+平涂启用；post.vue 页底浅绿 vs 本页纯白；post… | reports/screenshots/round-1-tour/A/subpackages_village_village_publish__默认.png 与 reports/screenshots/round-1-tour/A/subpackages_village_vill… |
| 设备行为项：状态栏高度 JS 注入生效——「发布动态」标题与模拟状态栏时间无叠印（R20 修复目验，五态截图一致）；头部右 padding 210rpx 胶囊避让，「发布」钮与 •••\|◎ 胶囊无遮挡（默认/弹层态截图）；弹层面板含 env(safe-area-inset-bottom)（publish.vue:811）；scroll-view 走 flex:1+min-height:0（792 行），PUB36 滚动到底/顶 EXEC… | reports/screenshots/round-1-tour/A/subpackages_village_village_publish__默认.png；reports/audit/round-1/interact/exec-results.json（PUB01/02/03/… |
| 历史线索回归核对：MP-R2-PUB-002 兴趣圈子分组=无回归（弹层态三级分组目验）；MP-R2-PUB-101 friends 分支=无回归（PUB27-after 目标卡自洽）；MP-R1-PUBLISH-001 visibility=general 下「谁可以看=所有人可见 ›」与后端 deriveVisibility(general→public_) 口径一致（目验）；MP-R2-VILL-013 图文不符族=晚霞帖对属 v… | reports/screenshots/round-1-tour/A/subpackages_village_village_publish__弹层态.png；reports/screenshots/round-1-interact/SUBPACKAGES-VILLAGE-VIL… |

### SUBPACKAGES-VILLAGE-VILLAGE-POST.json（subpackages/village/village/post（任务名义「村口·帖子详情」，实测对象为「发布动态」表单页：截图导航标题「发布动态」、zh-CN headerTitle、post.vue:3 注释三证一致；帖子详情实际由同目录 detail.vue 承载）｜A3 视觉审查员（Layer A3，截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：{"subpackages/village/village/post":"13 项举证：【截图已看】✓ A 组 3 张全部逐张审查+局部 2×/4× 放大（默认/交互后/弹层态；弹层态经像素 diff 证实为默认态复制，见 VPOST-104）。【理想图已对照】✓ 发布帖子页面.png 已逐层对照并完成锚定消歧（锚定 publish.vue，本页仅作同族 L2/L3 参照；结构差异属两页分工非缺陷）。【滚动已测】△ VP32 执行 scroll 到底/回顶、终态 scrollPos=top、无 console 异常，但无吸底/遮挡视觉断言；本角色以默认态截图+bottom-space 占位代码（post.vue:1445-1448）静态核对，滚到底遮挡解除未见证。【点击已测】△ 仅空表单 tap 发布（7 例 Toast「请输入内容」一致）与 tap 发布到卡开弹层成功；其余 30 用例因执行器缺陷 UNVERIFIED（VPOST-101 已立），输入/选图/话题/位置链路零覆盖。【返回已测】△ VP07/08 空表单 X→reLaunch 村口 index（route 终态一致）；带草稿 modal「保留/放弃」分支未行使。【safe-area 已查】✓ 代码三处（工具栏 1459/弹层 1496/占位 1447）+截图底缘实测无裁切。【TabBar 已查】✓ 非 tab 分包页无 TabBar，截图确认。【空态已查】✓ 默认截图即空表单全要素（placeholder/计数/贴士）。【长文已查】✗ 未验证——VP26（30 字标题/600 字正文截断）执行器 input 失败，无任何长文视觉证据。【加载态已查】△ 本页仅弹层圈子分组存在加载场景，其加载中/失败/空态缺失已由 A2 立项（POST-202），无其他加载态。【错误态已查】✗ 未验证——VP33（发布失败 Toast）无失败注入、无截图，错误文案分支零覆盖。【组件一致性已查】✓ 与 publish.vue 并排对照（弹层文案逐字一致/工具栏同源/导航同构）；热区缺陷与 publish 页 SVVP-002 同族，本页独立实例已立 VPOST-106。【历史 Bug 回归已查】✓ 三线索全部核对（001 视觉确认/101 无反证维持已验证/013 本页不适用）。本角色未运行构建/单测/真机，未改动任何业务文件；审查载体为现有截图+像素测量脚本（PIL）+源码只读引用。"}

| 观察 | 证据 |
|---|---|
| 默认态整页布局与 token 逐项核对通过：页面底色实测 RGB(238,247,242)=#EEF7F2，与 .post-page 的 var(--c-bg-page,#EEF7F2)（post.vue:1046）及 design-variables.scss:119 $bg-page 完全一致；导航区白底+底部 1rpx 分隔线、「发布」禁用态灰胶囊（禁用色 #9DA5A1 系、白字）、发布到白卡、四行项白卡、发帖小贴士浅绿卡（#E… | reports/screenshots/round-1-tour/A/subpackages_village_village_post__默认.png（像素采样 (5,300)/(187,155)/(187,770) 等）；apps/client/src/subpackages/… |
| 导航行胶囊避让实测（历史 P0 MP-R1-POST-001 的视觉回归确认）：y=57 行像素 run-length 分析——「发布」灰胶囊右缘 x≈259，微信胶囊容器左缘 x≈278，实測间隙 19px（数学预期 111px 预留-87px 胶囊-5px 误差相符）；胶囊「···\|◎」右缘距屏 21px，布局对称。标准机型无碰撞；A2 指出的 --capsule-right 恒 7px 静态兜底（未接 useMenuButtonR… | 默认态截图 y=57 行分类扫描（DARK/GRAY/MID 分段：pill 195-259、白隙 260-277、胶囊 278-365）；apps/client/src/subpackages/village/village/post.vue:1057 |
| 弹层开启态几何与状态核对（以「交互后」截图为载体，见 VPOST-104）：遮罩实测约 50% 黑（白 255→123-138），微信胶囊以原生层级浮于遮罩之上（(320,40)=(207,209,213) 未被暗化），层级正确；白色面板顶部 y=282（占屏 66%）、顶部圆角、底缘最后一条「宠物」行文字止于 y=791、其下 28px 纯白 padding 到屏底，无内容裁切；「个人动态」行右侧灰色 ✓ 选中态可见；三分组标题「公域… | reports/screenshots/round-1-tour/A/subpackages_village_village_post__交互后.png（逐点采样+底缘暗行扫描）；裁剪件 reports/audit/round-1/findings/_tmp_crops/_tmp… |
| 跨页一致性对照（与同题「发布动态」的 village/publish 并排）：①目标弹层标题/三分组/「个人动态 默认公开，所有人可见」选项文案两页逐字一致；②底部工具栏本页保留（图片/话题/位置/提及/更多）、publish 已按需求移除（publish.vue:751-752 注释）——本页保留与理想图一致（发布帖子页面.png 底部即含五项工具栏），且「行项+工具栏」双入口在理想图中并存，属设计意图非冗余缺陷；③工具栏样式同源（p… | apps/client/src/subpackages/village/village/publish.vue:616-689（弹层）、751-752（工具栏移除注释）、856-859（样式）；apps/client/src/subpackages/village/village… |
| 底部工具栏与滚动预留核对：默认态截图工具栏白底、五项等距、图标 40rpx+标签 20rpx；「图片」「更多」标签最底暗像素分别止于 y=813/811，距视口底 7-9px，即 12rpx 底 padding 如实渲染、无标签裁切；fixed 工具栏（post.vue:1453-1461，z-index 120）与滚动预留占位 .post-body__bottom-space calc(200rpx+env(safe-area-ins… | reports/screenshots/round-1-tour/A/subpackages_village_village_post__默认.png（底缘暗像素测量：图片 y=813/x=43、更多 y=811/x=320）；apps/client/src/subpackage… |
| 证据链与回归线索核对：①manifest 与 exec-results 双 gitSha=aefd8a72 == HEAD，证据未过期；②本页 S05 console（console-S05-village.log）中 switchTab:fail timeout 未处理拒绝 3+ 次全部挂在 village/index 的 VI07 用例段落下，非本页用例，本页 VP01/VP02 console 为空；③历史回归三条：MP-R1-P… | reports/audit/round-1/screenshot-manifest.json（gitSha）；reports/audit/round-1/interact/exec-results.json（gitSha/updatedAt）；reports/audit/roun… |

### SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json（subpackages/circles/circles/index｜视觉审查员-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX（A3，截图与证据的视觉/布局/状态…｜2026-09-23）

- 覆盖核对（原文）：证据缓存校验：screenshot-manifest.json gitSha=aefd8a72 ✓、interact/exec-results.json gitSha=aefd8a72（round=R1, updatedAt=2026-09-23T12:00:00.115Z, 1283 条）✓，与要求的当前 sha 一致，全部证据按当前代码有效采信。
- 覆盖核对（原文）：截图已看：本页 10/10 张巡检截图全部逐张查看（A/B 双身份 × 默认/交互后/数据态/滚动-中部/滚动-底部），另看交互截图 CI09-before/after、CI10-after、CI13-after、CI19-after（CI04/CI05/CI11/CI12/CI17 的 after 截图为 automation timeout 未产出，如实记录）。
- 覆盖核对（原文）：理想图已对照：素材/理想效果图/兴趣圈列表.png 按 L1 结构→L2 层级→L3 交互位置→L4 卡片尺寸→L5 间距→L6 文案→L7 图标→L8 颜色→L9 阴影→L10 微细节逐层比对（差异记录见 observations-04，其中 L3 两处缺失立案 001/002）。
- 覆盖核对（原文）：放大取证：PowerShell System.Drawing 对头部（4x）/chips（3-5x）/卡1（3x）/头像（8x）/美食卡（2x）/天文圈封面（4x/8x）/学习搭子（4x）做放大裁片核对；像素取样确认激活/非激活 chip 底色。
- 覆盖核对（原文）：滚动已测：滚动-中部/滚动-底部两态实拍核对 14 卡全序与内容连续性（自动化 CI16 pageScrollTo bottom/top 亦执行）。
- 覆盖核对（原文）：点击/返回已测：交互取证 CI01-CI19 共 16 条本页用例记录在案（返回 CI02/CI03、搜索 CI04、tab CI05、加退圈 CI09/CI10、快击 CI11、失败分支 CI12、深链 CI13、错误态 CI18 FAILED、空态 CI19）——判定归交互判定员，本审查仅消费其截图与 toast 记录。
- 覆盖核对（原文）：safe-area 已查：滚动-底部最后一张卡完整可见 + 底部留白；分包非 tab 页无 TabBar（平台正确行为），AppShell :tab-bar-safe=false + list-bottom-spacer 60rpx + 全局 safe-area-inset-bottom 兜底，无遮挡。
- 覆盖核对（原文）：TabBar 已查：本页为 subpackages 分包页不显示原生 tabBar，与全站分包页行为一致；理想图五 Tab 属 tab 页对照项，不适用本页（记录）。
- 覆盖核对（原文）：空态/加载态/错误态已查：见 observations-06——空态因 mock 恒非空未取证、CI18 注入失败 FAILED、加载态 dom 探测失效，三项均如实标注『视觉未验证』。
- 覆盖核对（原文）：长文已查：两行描述换行完整无裁切；统计行/好友行单行省略链在 373px 下未触发截断（observations-01）。
- 覆盖核对（原文）：数据极值已查：万位(1.2w)/千分位(8,932)/无千位(740 以下)三种计数格式实渲染核对；热门徽阈值边界（8,123 有徽 vs 7,240 无徽）正确；头像堆三档（5/6/7/10/12 位）计数与头像组渲染正常。
- 覆盖核对（原文）：组件一致性已查：封面映射走 config/circle-covers 单一真相源（与圈子主页/首页共用）；加入按钮描边胶囊样式与卡片体系自洽；A/B 双身份五态逐像素一致（每对 diff 仅 24 采样点噪声）。
- 覆盖核对（原文）：历史 Bug 回归已查：MP-R1-CIRCLE-004（P0 统计行半字硬裁）按『375px 双身份复拍』口径实测通过（observations-01），与 A2 INDEX-001 代码层结论互证，闭环判定移交终验；未发现其他历史线索指向本页。
- 覆盖核对（原文）：与代码层 findings 去重：A2 已立案 12 项（INDEX-001~012：统计行回归/深色模式/校园拦截死代码/朋友加入伪造数据/token 违规/死样式/i18n 硬编码/reLaunch 兜底/并发去重/命名遮蔽/scroll-view 高度链）全部不重复；本文件 5 项均为截图/素材/热区层新证据。
- 覆盖核对（原文）：执行命令留痕：gitSha 校验（node 读 JSON 字段）、grep/sed 读 index.vue(288-421/185-232/640-790/805-870)/AppShell.vue(270-340)/circle-covers.ts/images.ts/mock-data.ts/zh-CN.ts、PNG 尺寸读取、System.Drawing 裁片与像素 diff（A/B 五态 + CI09 前后）、素材文件 circle-sky.png 直接检视。

| 观察 | 证据 |
|---|---|
| 【历史回归 MP-R1-CIRCLE-004（P0 统计行半字硬裁）实测复核通过】巡检视口 373px 逻辑宽（373×820 物理，≈375 类机型，窄于 375 属更严场景）：A/B 双身份全部统计行完整单行无半字裁切——「1.2w 人 · 486 条动态」「8,932 人 · 352 条动态」「8,123 人 · 301 条动态」「6,532 人 · 244 条动态」「7,240 人 · 287 条动态」「4,860 人 · 13… | reports/screenshots/round-1-tour/A/subpackages_circles_circles_index__默认.png + B 同名默认 + A/B __滚动-底部.png；A/B 五态两两像素 diff 均 24 采样点（噪声级）= 双身份渲染… |
| 【热门徽标阈值渲染正确】≥8000 阈值有徽：摄影(12000→1.2w)/旅行(8,932)/音乐(8,123)/游戏(8,123)/考研(8,750)；<8000 无徽：运动(6,532)/美食(7,240)/阅读(6,532)/宠物(5,621)/天文圈(4,860)/篮球(3,980)/桌游(3,120)/学习搭子(5,230)/萌宠(4,305)。渲染与 mock 数据及 HOT_THRESHOLD=8000（index.vu… | A 默认（卡1-5）+ A 滚动-中部（游戏/阅读/宠物/天文圈）+ A 滚动-底部（篮球/桌游/考研/学习搭子/萌宠）逐卡核对 |
| 【滚动与底部安全区正常】滚动-中部/滚动-底部内容与默认态首屏连续（14 卡全序：摄影→旅行→音乐→运动→美食→游戏→阅读→宠物→天文圈→篮球→桌游→考研→学习搭子→萌宠）；滚动-底部最后一张卡（萌宠）完整可见，其下为 list-bottom-spacer + 安全区留白，无内容被裁、无遮挡。长文核对：长描述（如「分享光影与构图，一起扫街、看展、记录生活」「自习打卡、组队学习，一起上岸」）两行换行完整、无尾部裁切。 | A/B __滚动-中部.png、__滚动-底部.png；学习搭子卡 4x 放大裁片确认「上岸」换行完整 |
| 【理想图 L1-L10 对照记录（差异点如实记录，均不复立案）】L1-L3 结构/层级/交互位置总体对应：返回+标题（趣下划线品牌字形 ✓）+副标题+chips+圈卡列；卡片内封面/圈名/热门徽/描述/统计/头像堆/加入钮七要素齐备且顺序一致。记录在案的不复立案差异：①热门徽配色——理想图浅粉底粉字 vs 实做红底白字（R11 理想图对比已通过，A2 已立案无 token 色值问题，不重复）；②激活 chip——理想图实心绿底白字 vs… | 素材/理想效果图/兴趣圈列表.png（852×1846）与 A 默认逐区对照；激活 chip 像素取样 (60,150)=RGB(238,247,242) 薄荷底、非激活 chip (265,160)=纯白底 |
| 【交互证据呈报（判定归交互判定员，不立案）】①CI13-after（?category=travel 深链）：过滤生效仅剩旅行卡 ✓，但 chips 高亮仍停在「全部」——列表内容与高亮态不一致（代码注释称 category query 与 quick tab『互不干扰』index.vue:228，属有意为之，是否合理请交互判定）；②CI09-after（加入旅行圈）：截图未见按钮翻转（仍「+ 加入」、人数仍 8,932），wxml 快… | reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI13-after.png、CI09-after.png、wxml/SUBPACKAGES-CIRCLES-CIRCLES-INDEX-… |
| 【加载态/错误态/空态视觉未取证（如实声明）】巡检未产出本页加载/错误/空态截图：页面 mock 恒非空故无空态（CI19 条件用例 dom .circlesEmpty:absent 与非空现状相符）；CI18（错误态重试）FAILED——无法注入错误态（element not found __CAND__），错误态 UI 视觉未验证；CI01（Loading→Success 时序）EXECUTED 但 dom 探测在该页失效，加载态视… | exec-results.json .results[471]（CI18 FAILED: action tap __CAND__ failed: element not found）、.results[454]（CI01 dom 全 absent）、.results[472]（C… |

### SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json（subpackages/circles/circles/post-topic｜A3 视觉审查员（截图与证据的视觉/布局/状态审查，未改动任何业务文件）｜2026-09-23）

- 覆盖核对（原文）：截图已看：本页静态 10 张（A/B × 默认/滚动-中部/滚动-底部/键盘弹起-输入后/交互后，manifest 逐一列载、磁盘逐一核验存在）逐张目视审查；另审 interact 帧 7 张（PT02/06-before/08/09/27/28/33）+ 自制放大裁片 8 张（A 默认/滚动-中部/滚动-底部顶部、campus 默认/campus 滚动-底部、PT27 弹层、PT28 移除关联×2、底部安全区），全部为本轮 gitSha=aefd8a72 证据。
- 覆盖核对（原文）：理想图已对照：素材/理想效果图/发布帖子页面.png 逐元素核对→判定其对应 village/post.vue 而非本页（观察4），本页在 19 张理想稿中无一对一锚定→未硬对照、未据错稿立项；品牌视觉总谱（寻觅品牌视觉设计系统图谱.png）下本页头部渐变/绿色主 CTA/浅绿卡底与 v3.1 冻结色系观感一致，token 级裁决已有 A2 覆盖（20+ var 逐一定义核对），未发现新增裸 hex 异常。
- 覆盖核对（原文）：滚动已测：滚动-中部/底部双身份 4 帧 + 顶部裁片叠印验证 → MP-R1-POSTTOPIC-201。
- 覆盖核对（原文）：点击已测（读证）：interact 34 例全量读取——EXECUTED 19（PT01/02/05/06/07/08/09/10/11/13/20/26/27/28/29/30/31/32/33）、FAILED 14（PT03/04/12/14/15/16/17/18/19/22/23/24/25/34，主因 candidate 文案元素未找到与截图超时）、SKIPPED 1（PT21 不可自动化）；执行层判定归交互判定员。
- 覆盖核对（原文）：返回已测（读证）：PT29（来源页 circle-home→本页→返回）与 PT30（栈底直达）navError 均为 harness 首页伪影；头部返回钮滚动不可达已立 201；系统侧滑手势不在 DevTools 取证范围，如实标注。
- 覆盖核对（原文）：safe-area 已查：App.vue:336-337 全局兜底 + 滚动-底部实测余量正常（观察8）；刘海南场景未验已标注。
- 覆盖核对（原文）：TabBar 已查：本页为分包非 tab 页（pages.json:109 注册于 subpackages），无 TabBar 遮挡问题；各帧截图亦无 tabbar 渲染。
- 覆盖核对（原文）：空态已查：表单空态即默认态（PT01 三时刻采样无错误空态闪现）；活动弹层「暂无可用活动」空态分支无截图帧（PT27 实为 4 条非空数据），如实标注未验。
- 覆盖核对（原文）：长文已测：PT08 500 字边界（观察5）。
- 覆盖核对（原文）：加载态已查：PT20 loading→列表 ≤10 条执行成功但截图落盘 ERROR:timeout 无帧，仅 observed 文本佐证，视觉样式未验、如实标注。
- 覆盖核对（原文）：错误态已查：PT14-17（帖子模式标题拦截/未选分类/发布失败/slug 拦截）全部在执行层 FAILED（candidate 未找到），失败 toast 视觉帧未捕获——留交互判定员；隐私拒绝 PT33 无 toast 帧亦如实标注。
- 覆盖核对（原文）：组件一致性已查：与姊妹页 campus/campus/post-topic 头部逐像素对照（返回 pill/居中标题/右侧发布钮结构同族；发布钮-胶囊位置差异即代码层 001，本批以截图证实）；target-chip/tag-chip/section-card 样式与圈内其余表单页同族一致。
- 覆盖核对（原文）：历史 Bug 回归已查：MP-R2-POSTTOPIC-001/MP-R3-POSTTOPIC-001 视觉侧无反证（观察9）；运行时回归归历史回归员。13 项举证中「空态-活动列表分支」「加载态视觉」「错误态视觉」「真机键盘/真机 safe-area」4 个子项因本轮证据缺失或环境限制未能完成，均如实标注而非判无问题。

| 观察 | 证据 |
|---|---|
| 「缺静态截图」前提核实为不成立：ask 称本批页面本轮没有静态截图并要求记 P1，但证据清单 manifest（gitSha=aefd8a72，与当前 HEAD 逐一相符）与磁盘均证实本页静态截图存在且完整——round-1-tour 下 A/B 双身份各 5 张（默认/滚动-中部/滚动-底部/键盘弹起-输入后/交互后，共 10 张）逐一存在（50~53KB/张）并已逐张实审。ask 附带的失败原因清单（dev/register/reg… | reports/audit/round-1/screenshot-manifest.json（gitSha=aefd8a72，本页 10 条 shots 记录）+ 磁盘逐一 fs 核验存在；git rev-parse HEAD 输出 aefd8a72f2231e8df7affd0… |
| 默认态结构完整且双身份一致：绿色渐变自定义头（返回 pill + 居中「发布话题」+ 右侧发布钮）→ 标题输入卡 → 内容卡（placeholder「分享你的想法...」+ 右下 0/500 计数）→ 发布到（两枚 target-chip，校园圈默认高亮）→ 话题标签 7 枚（脱单/学习/组队/树洞/分享/求助/吐槽 + 「最多选择 3 个」）→ 喜爱 switch → 添加图片 0/9。A/B 两身份逐帧一致（仅状态栏时钟不同），无身… | reports/screenshots/round-1-tour/A\|B/subpackages_circles_circles_post-topic__默认.png；放大件 reports/audit/round-1/tmp-a3/crop-top-默认.png（发布钮没入胶囊… |
| 双身份证据实质单身份：interact 全部 34 例 observed 均带「pre:login A ok userId=user-1001 MISMATCH!」标记（scripts/qa/r1-exec.cjs:890，match=false 即会话 userId 与期望身份 A=100158/B=100159 不符）；screenshot-matrix.md 亦载 tour boot 自检 logged-in userId=use… | reports/audit/round-1/interact/exec-results.json（PT01-PT34 全部条目 MISMATCH! 标记）；reports/audit/round-1/screenshot-matrix.md 第二节 boot 自检原文；scrip… |
| 理想图归属澄清（防错配）：素材/理想效果图/发布帖子页面.png（标题「发布动态」、左上 × 关闭、发布到圈卡带头像/圈内成员可见 pill/1.2w 成员、0/1000 计数、三图网格、添加话题/添加位置/提及好友/谁可以看四行、发帖小贴士卡、底部五宫格工具栏）与本仓 village/village/post.vue 的实现逐项对应（post.vue:7-8 结构注释、:606 发布到卡片、:786 添加话题、:798 添加位置），并… | 素材/理想效果图/发布帖子页面.png 逐元素目视 vs apps/client/src/subpackages/village/village/post.vue:7-8/:606/:786/:798 实读对应 |
| 数据极值视觉通过：①500 字边界（PT08）：计数器「500/500」正常灰显未误报超限红、textarea 文字密排无溢出（末行随内滚裁切属 scroll 正常行为）；②特殊字符（PT09）：标题「🌸<img src=x onerror=alert(1)>」按字面渲染、无脚本执行、无崩溃、布局无破坏；③空提交（PT05）/仅标题（PT06）分别 toast「请输入标题」「请输入内容」由 showToast 捕获为证。 | reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT08-after.png（500/500）、PT09-after.png（特殊字符）；exec-results.json P… |
| 弹层遮罩实测生效（排除一处疑似）：活动选择弹层打开帧（PT27）与同机位无弹层帧（PT28）同坐标像素对比，背景 (255,255,255)→(127,128,127)、约 45% 压暗，与遮罩 var(--c-overlay-bg, rgba(0,0,0,0.45)) 兜底值一致——缩略图目视「背景未变暗」的印象被像素证据否定，不立项。弹层内列表 4 条、行结构（名称+时间·地点+chevron）完整，× 关闭钮偏小问题并入 MP-R… | reports/screenshots/round-1-interact/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-PT27-after.png vs PT28-after.png 同坐标采样 (60,545)/(60,250)/(180,70… |
| 键盘与返回的取证边界（如实标注不可验项）：「键盘弹起-输入后」帧（A/B）实际不含软键盘（DevTools automator 注入输入不弹键盘），cursor-spacing=20（:490/:508）与 :show-confirm-bar=false（:512）仅代码核对，真机键盘避让未验；返回行为 PT29/PT30 的 navigateBack:fail cannot navigate back at first page 为 … | reports/screenshots/round-1-tour/A\|B/subpackages_circles_circles_post-topic__键盘弹起-输入后.png（无键盘）；post-topic.vue:490/:508/:512；exec-results.jso… |
| safe-area 与底部发布钮：全局 page 级 padding-top/padding-bottom env 兜底在位（App.vue:336-337），DevTools（env=0）滚动-底部帧中发布钮下方实测余量 ≈20-25px 正常不贴边；真机 home-indicator（env>0）行为 DevTools 截图无法体现、未验。刘海南双倍避让已由代码层 MP-R1-POSTTOPIC-002 跟踪，不重复。 | reports/audit/round-1/tmp-a3/crop-bottom-a.png（底部放大）；apps/client/src/App.vue:336-337 实读 |
| 历史回归视觉侧复核：MP-R2-POSTTOPIC-001（本地临时路径直出 createPost）与 MP-R3-POSTTOPIC-001（catch 引用 try 内常量致锁死）经 A2 代码层判已修；本轮视觉证据无反证——PT10/PT26 发布成功 toast「发布成功」均被捕获（isSubmitting 锁死会使成功路径不可达），全部截图未见裂图帧。运行时逐项回归归历史回归员，此处仅记录视觉侧无矛盾。 | exec-results.json PT10/PT26 toast=[发布成功]；tour A/B 全部 10 帧目视无裂图；reports/audit/round-1/code-findings/SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.js… |

### SUBPACKAGES-CAMPUS-CAMPUS-HUB.json（subpackages/campus/campus/hub｜视觉审查员-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB（A3，截图与证据的视觉/布局/状态审查）｜2026-09-23）

- 覆盖核对（原文）：【截图已看】tour/A 全部 5 态（默认/交互后/弹层态/滚动-中部/滚动-底部）+ tour/B 默认态 + interact 证据图 CH01-after2/CH04-after/CH06-after/CH08-after/CH16-before/CH16-after/CH17-before/CH17-after，共 14 张逐张过目并做放大裁片复核（hub_card1_zoom/hub_header_zoom/hub_guide_zoom/hub_scrollbottom_top_zoom/hub_scrollbottom_bottom_zoom）。
- 覆盖核对（原文）：【理想图已对照】素材/理想效果图/校园圈.png 按 L1 结构→L2 信息层级→L3 交互位置→L4 卡片尺寸→L5 间距→L6 Typography→L7 Icon→L8 颜色→L9 阴影→L10 微细节 逐层过：L1-L4 无偏差（Issue-001 缺卡除外）、L5-L9 一致、L10 措辞差异见观察1。
- 覆盖核对（原文）：【滚动已测】滚动-中部/滚动-底部静态截图 + CH22（pageScrollTo bottom→top，observed scrollPos=top，底部提示完整可见）。
- 覆盖核对（原文）：【点击已测】exec-results.json hub 25 条：CH04/05(tab 切换)、CH06/07/09(搜索/清空/超长)、CH10/11(卡片/CTA)、CH12/13(双去认证入口)、CH18/19(连点防抖)、CH25(confirm 键)；其中 CH08/16/17/20 FAILED 已逐条核其失败原因与证据图。
- 覆盖核对（原文）：【返回已测】CH02 栈底 switchTab 兜底回附近、CH03 栈中 navigateBack、CH19 连点×5 只回一层——返回链路实机证据齐（交互判定员复核口径）。
- 覆盖核对（原文）：【safe-area 已查】底部截图末卡(深圳大学)+提示完整、页脚留白可见；顶部状态栏偏移正常（默认态）。代码层缺 env(safe-area-inset-bottom) 已由代码发现 012 立项——模拟器截图无 Home 指示条，不据其证实或证伪，维持「未基于新截图验证」标注。
- 覆盖核对（原文）：【TabBar 已查】本页为 navigateTo 分包栈页，截图证实无 TabBar 渲染；理想图中五 Tab 底栏为「附近页承载」模型，现行返回键+栈模型与 R11/R13 锚定语义一致，不另立项。
- 覆盖核对（原文）：【空态已查】joined 空态（CH04）、搜索空态（CH06）文案分 Tab 正确、无崩溃；空态样式为纯文本（观察7）。
- 覆盖核对（原文）：【长文已测】CH09 60 字符搜索输入 EXECUTED（observed dom 正常；其证据截图超时未落盘，采信 observed 行并如实标注）。
- 覆盖核对（原文）：【加载态已查】列表数据为前端静态表（hub.vue:54-73），无异步首屏加载态；认证态 onShow 刷新（hub.vue:150-152）。页面无骨架屏/loading 态可触发——如实在案。
- 覆盖核对（原文）：【错误态已查】CH17 模拟认证拉取失败未成功触发（retry 元素 absent——正常态本就不应存在，失败注入未生效），错误条+重试的实机渲染未取证；代码层 005 已实现该链路（status 已修复待终验），维持「错误态未基于本轮截图验证」。
- 覆盖核对（原文）：【组件一致性已查】badge/CTA/搜索框/引导卡/pill 与理想图及双身份截图对照一致；空态跨页对照因对照证据失真中止（观察7）；搜索图标、毕业帽图标、返回 chevron 风格与全站绿系一致。
- 覆盖核对（原文）：【历史 Bug 回归已查】代码层已修复待终验 7 项中：004/003 视觉终验通过（观察2）、017 运行态复现（观察3）；001/005/006/007/010 的交互/数据终验归交互判定员与代码回归员，不越界。代码层待修复 008/009/011/012/013/014/015/016/018 不重复立项；其中 014 的运行期背离实证并入 Issue-001。
- 覆盖核对（原文）：【未执行项】未运行编译/lint/真机（视觉审查轮职责外）；未重跑截图（以 manifest gitSha=aefd8a72 与 HEAD 一致采信现有证据）；错误态实机渲染、真机 Home 指示条遮挡未取证——均如实标注，未以推测补位。

| 观察 | 证据 |
|---|---|
| 理想图 L1-L10 对照（未认证视角）：结构逐层对齐——引导条(图标+双行文案+去认证绿pill)→搜索框→双tab(推荐圈子active+绿下划线)→校圈卡(左封面图/标题/「未认证」灰badge/统计行/头像堆×3/右「申请加入」绿描边pill)→底部静态提示；L4 卡片比例、L5 间距节奏、L6 粗细层级、L8 品牌绿系与理想图一致；L1-L4 无结构偏差（缺卡见 Issue-001）。L10 措辞级差异如实记录不立项：引导卡副… | reports/screenshots/round-1-tour/A/subpackages_campus_campus_hub__默认.png 对照 素材/理想效果图/校园圈.png |
| 代码层「已修复待终验」项视觉终验通过：MP-R1-CAMPUS-HUB-004（状态栏高度双计）——默认/交互后态 header 顶部偏移正常，与胶囊无异常间距、无双重下坠；MP-R1-CAMPUS-HUB-003（死元素）——滚动-底部截图示「更多校园圈持续接入中」为纯静态文本、无点击暗示样式。 | reports/screenshots/round-1-tour/A/subpackages_campus_campus_hub__默认.png、subpackages_campus_campus_hub__滚动-底部.png（对照 hub.vue:377-382 修复注释） |
| 代码层 MP-R1-CAMPUS-HUB-017（「约」前缀盲拼 peers）运行态复现证实：放大裁片显示卡片第二行实际渲染「约等 256 位同学」（清华）、「约等 210 位同学」（复旦）等，代码推演的「约等」拼接在真机渲染属实、全部渲染卡受影响。该项已由代码层立项（待修复），此处仅补运行态截图证据，不重复立项。 | reports/audit/round-1/tmp-a3/hub_card1_zoom.png（默认.png 第一卡放大）+ 滚动-中部/底部.png 各卡同行文本 |
| R13-ACCEPTANCE §7 已裁决项维持原样、无新增偏差：统计行「约2.6k 同学 · …」单行省略（动态数整段被省略号截断，为裁决保留形态）、「约」前缀诚实标注、数字统一 k/w 格式——三态截图口径一致。 | reports/screenshots/round-1-tour/A/subpackages_campus_campus_hub__默认.png / 滚动-中部.png / 滚动-底部.png 统计行 |
| 双身份一致性：Tour B（身份B）默认态与 Tour A 逐元素一致（同为未认证 10 卡视角、布局无漂移），无跨身份状态错位。 | reports/screenshots/round-1-tour/B/subpackages_campus_campus_hub__默认.png vs tour/A 同名默认.png |
| 弹层态/交互后与默认态一致：本页无弹层组件，两态截图与默认态仅时间戳不同、无布局差异，符合页面能力边界。 | reports/screenshots/round-1-tour/A/subpackages_campus_campus_hub__弹层态.png、__交互后.png |
| 空态/搜索态文案分 Tab 正确：joined 空态「暂未加入任何校园圈」（CH04-after）、搜索空态「暂无推荐圈子」（CH06-after），均含底部静态提示；空态为纯文本无插画，跨页一致性对照因 messages 页「空态」截图实为数据态（证据失真）无法成立，如实记录不下结论。 | reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH04-after.png、CH06-after.png；对照 pages_messages_index__空态.png（实为数据态） |
| 证据链完整性缺陷（移交交互判定员参考）：CH05-after.png 与 CH04-after.png md5 相同（2e230f36d6d4，47601B），「我加入的→推荐圈子 11 校恢复」的截图证据实为 CH04 空态图副本，不构成恢复态证据；CH16-before≡CH08-after（04720fc6571f）、CH17-before≡CH16-after≡CH17-after（f81c8039572e）；且本页 25 条 … | md5 实测（本会话 hashlib 计算）：reports/screenshots/round-1-interact/ 下 CH04/CH05/CH08/CH16×2/CH17×2 七文件；reports/audit/round-1/interact/exec-results.… |

### SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json（subpackages/campus/campus/index｜视觉审查员-R1-SUBPACKAGES-CAMPUS-CAMPUS-INDEX（A3，截图与证据的视觉/布局/状态审查…｜2026-09-23）

- 覆盖核对（原文）：页面：subpackages/campus/campus/index（校园圈·话题列表）。审查口径：A3 视觉/布局/状态审查，证据=操作截图逐张读图 + exec-results 行为记录 + 页面源码行号；静态巡检轮本页 0 张截图（已按要求将缺截图立为 MP-R1-CAMPUSINDEX-010 P1）。
- 覆盖核对（原文）：证据新鲜度：manifest gitSha=aefd8a72 == HEAD（git rev-parse 输出）；exec-results gitSha=aefd8a72/updatedAt 2026-09-23；CAMPUSINDEX-01..10（Sep 21，早于 HEAD 提交 Sep 22 11:24+0800）按过期处理未采用；工作区 i18n/campus store 未提交改动的漂移已如实注记，index.vue 相对 HEAD 零改动。
- 覆盖核对（原文）：已看截图清单（逐张）：SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX03/04/10/12/14/15/16-after.png 共 7 文件 5 独立帧；CX15/16 读图确认为 hub 页，排除出本页判定；CAMPUSINDEX-01..10 未读（过期）。
- 覆盖核对（原文）：理想图对照：素材/理想效果图/校园圈.png 读图核对为 hub 学校圈列表页（对应 hub.vue），素材库 19 张中无本页（话题列表）页面级对照稿 → L1–L10 理想图逐层对照对本页不可执行；结构对照基准降级为源码设计意图（scroll-x 单行 Tab，index.vue:279）与 mp-weixin 真实渲染。此为证据缺口，非免检。
- 覆盖核对（原文）：五维覆盖——UI：Tab 形态（立 011）、推荐圈栅格（立 012）、裸 key（观察 1）、作者名粉色 token（核对为设计选择）；UX 路径：空态 CTA 错位线索已移交（观察 4），热区铁律 CX20 因落 hub 实际未在本页测得（exec observed 全 absent）——本页 88rpx 热区无有效测量，如实注明；小程序维：onLoad 守卫/返回兜底（CX06 EXECUTED）/非 tab 页无 TabBar 遮挡问题/状态栏避让（DevTools 帧不可判，归代码层 002）/键盘（本页无输入框 N/A）；数据维：非法参数空态（CX04 帧）、解码校名（CX03 帧）、翻页（CX13 EXECUTED 无帧）、长文/长昵称/加载态/错误态——无帧，未验证，如实注明；一致性：话题卡与 hub 卡片同为白卡+绿 CTA 体系（CX15/16 hub 帧旁证，弱证据），作者名用 --c-romance-500 系 token 与品牌粉一致。
- 覆盖核对（原文）：13 项举证核对（本页不适用『无问题』判定，仅列缺口）：截图已看（5 独立帧）/理想图已对照（无本页稿，如实注记）/滚动已测（CX13 EXECUTED 无帧）/点击已测（CX10-12 EXECUTED 帧重复）/返回已测（CX06 EXECUTED 无帧）/safe-area 已查（DevTools 不可判）/TabBar 已查（非 tab 页 N/A）/空态已查（CX04 帧 ✓）/长文已查（未测）/加载态已查（未捕获）/错误态已查（未捕获）/组件一致性已查（弱旁证）/历史 Bug 回归已查（3 条均有结论，见观察 6）。
- 覆盖核对（原文）：角色边界：本文件只立视觉/证据缺陷；历史回归终判归历史回归员、CX 执行结论复核归交互判定员、功能目标对照归需求对照员；代码层 9 条（MP-R1-CAMPUSINDEX-001~009）未重复立案，其中 011 与 005 的关系已在 011 description 内划清。

| 观察 | 证据 |
|---|---|
| 裸 i18n key 获截图级实锤：4 张独立帧均在未认证推荐区块标题/链接处渲染字面量『campus.index.hotCirclesTitle』『campus.index.viewMore ›』。不另立 issue（代码层 MP-R1-CAMPUSINDEX-001 已立，P1 待修复），本条将其证据从 sources:[code] 升级为 screenshot+code 双口径。 | reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX03/CX04/CX10/CX12-after.png（4 帧均可见裸 key 大字标题与右侧绿色裸 key 链接）；reports/au… |
| 未认证+本校参数视角默认态主链路渲染完整、无破图：头部校名『北京大学』URL 解码正确（CX03）、『%E4%8D』非法序列回退原值不崩溃（CX04）、未认证徽章、去认证引导卡、话题卡（标题/相对时间 33 分钟前/预览/作者名粉色 $pink-primary——index.vue:708-712 为 token 化设计选择，非缺陷/回复数绿色徽章）、「没有更多了」页脚、空态文案齐全，SafeImage 无加载失败占位异常。 | reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX03-after.png、CX04-after.png；apps/client/src/subpackages/campus/campus… |
| CX03 帧中推荐圈栅格整行缺失而 CX04 同位置存在：栅格每项固定高 120rpx（index.vue:868），布局上不可能塌陷，且父节点 v-if="!isVerified" 依赖认证状态异步翻转——判定为认证状态返回前的捕获时序伪影（首帧渲染竞态），非稳定缺陷，不立 issue；如需收敛可给 isVerified 初始态显式 loading 骨架。 | CX03-after.png（标题行下直接是 Tab 卡）与 CX04-after.png（同位置有 8 封面行）对比；apps/client/src/subpackages/campus/campus/index.vue:257、868 |
| 未认证视角空态文案『该分类下还没有话题，快来发布第一个吧』引导发布，但发布 FAB 为 v-if="isOwnCertifiedView"（index.vue:356），未认证视角无任何发布入口——CTA 文案与可用动作错位。属交互路径判定范畴，移交交互判定员，本文件不立 issue。 | CX04-after.png（空态文案在场、右下角无 FAB）；apps/client/src/subpackages/campus/campus/index.vue:306-309、356 |
| 交互帧重复（证据质量缺口）：CX10≡CX11、CX12≡CX14 字节级相同（md5 01aa62f6…/0fff51ef…）；且所有在盘帧的激活 Tab 均为「课程交流」——Tab 切换后的高亮迁移、翻页加载态（CX13 截图超时）、no-more 态均无可信独立视觉帧。CX10–CX14 的 EXECUTED 判定仅有 DOM 观察支撑，无像素佐证；该执行结论的复核归交互判定员。 | md5sum 输出（CX10-after=CX11-after=01aa62f6b3debfe0396cb9a443623a10；CX12-after=CX14-after=0fff51ef8101d474e2cba52abca7b9a8）；exec-results.json C… |
| 历史问题线索回归核对（视觉口径，最终判定归历史回归员）：① MP-R3-CAMPUS-INDEX-001（裸 key）——未修复，4 帧实锤（见观察 1）；② MP-R2-CAMPUSINDEX-001（scroll-view 无界高度致翻页失效）——运行时行为证据 EXECUTED：CX13 以 pageScrollTo bottom + 真实 swipe up on .topic-scroll 触发翻页、dom .loading-m… | exec-results.json CX13（status=EXECUTED，act:swipe up touch-seq on .topic-scroll）；CX03/CX04 帧（DevTools 状态栏、页头间距目测无叠加）；code-findings MP-R1-CAMP… |
| CX15/CX16 执行均落在 hub（exec observed top=subpackages/campus/campus/hub），读图核对两张 after 帧实为 hub 页（校园圈·推荐圈子列表）——归 hub 页审查员口径，对本页错误态（CX15 目标场景）与认证徽章四态（CX16 目标场景）无证据价值；本页错误态至今零截图。 | reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX15-after.png、CX16-after.png（读图均为 hub 页）；exec-results.json CX15/CX16 o… |

### SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json（subpackages/campus/campus/post-topic｜视觉审查员-R1-SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC（A3，截图与证据的视觉/布局…｜2026-09-23）

- 覆盖核对（原文）：subpackages/campus/campus/post-topic —— 核对清单（本页 3 项 Issue，观察证据 8 条）：①截图已看：13/13 帧实体全部目验（tour A6+B5、静态 A/B）+2 张 3x 裁切（header 区）+逐列像素扫描 3 组；②理想图已对照：19 张理想稿无本页锚定稿，最近似的发布帖子页面.png 经目验判定为圈子发帖语义（L1 即不同），如实记「无法对照」而非「已对照」（observations-8）；③滚动已测：滚动-中部/滚动-底部 A/B 4 帧目验+像素扫描证实 header 滚出与内容贴 y=0（→Issue 101），PT15 act:pageScrollTo bottom 生效为窗口级滚动佐证；④点击已测：38 条交互记录由交互判定员执行，本岗核对 PT07/PT08/PT13/PT24/PT29/PT37 observed 字段与对应帧；⑤返回已测：PT06 EXECUTED（返回落点正常）；goBack 栈守卫缺口已由 A2 009 覆盖不重复；⑥safe-area 已查：全局 page padding-bottom 承担底部避让（A2 010 结论未推翻），本岗实测 DevTools 侧 --statusbar 注入层级与 014 机制吻合（observations-4）；⑦TabBar 已查：本页为 subpackage 非 tabBar 页，全部帧无 TabBar、无遮挡问题；⑧空态已查：『暂未选择任何话题』空态行在滚动-中部/底部帧可见；表单空态校验提示归 PT16/17（交互判定员）；⑨长文已查：标题 maxlength=50（:329）、内容 :maxlength=500（:341）+0/500 计数帧内可见，超限红态因 maxlength 拦截实际不可达（PT13 .content-count--over:absent EXECUTED）；⑩加载态已查：本页纯表单无远程列表加载态；「发布中」文案变体（:289/:406）代码在位但本轮无实拍帧——未验证项如实声明；⑪错误态已查：发布失败 toast（PT20 FAILED）、选图失败 toast 均无实拍帧，toast 原生层截图不捕获为取证环境限制（observations-7）；⑫组件一致性已查：header 绿→粉渐变/半透明白钮/胶囊避让与 campus/hub 同口径（A2 003 引 hub.vue:383），circles/post-topic 同结构页滚动帧对照目验（同患窗口滚动模式，归该页审查员）；chip 选中态语言与列表页分类 chip 一致；⑬历史 Bug 回归已查：002 本岗独立代码核验通过（observations-6）；001/003/004/007/008 修复在当前代码+帧内可见（003 视觉证实，observations-3）；010 维持保留；005/006/009/011/012/013/014/015 维持 A2 判定不重复立 issue。
- 覆盖核对（原文）：未执行/未验证项（如实声明）：本岗未驱动微信开发者工具（无自动化环境），所有点击/滚动结论基于巡检与交互岗已产出的帧与记录；real 模式上传与 409 幂等路径、软键盘弹起避让（cursor-spacing）、深色模式、带图状态（图片墙/删除×/满图 6/6）均无视觉证据；「校验错误」toast 可视性无法在本环境定论；静态 pass 已过期，其帧内胶囊遮叠等表现未采信。
- 覆盖核对（原文）：与任务模板的偏差说明：任务称「本批页面本轮没有静态截图——把缺截图记 P1」，经核对本页不成立：tour manifest-detail.json 失败清单 21 条均不含本页，且 gitSha=aefd8a72 证据链下本页实有 11 帧当前构建截图+2 帧过期静态帧；据「证据优先/不得据过期证据下结论」规则，本岗未虚构缺图 P1，改为在 meta.evidenceBaseline 与 observations-1 如实标注静态 pass 过期事实。任务给定的失败原因清单（dev/register/campus index/matching/activities detail/showcase 等）均为同批其他页面，与本页无关。

| 观察 | 证据 |
|---|---|
| 证据基线核验：screenshot-manifest.json gitSha=aefd8a72 与当前 HEAD（aefd8a72f223…）一致、buildMode=build:mp-weixin:mock；本页 13 张截图（tour A6 帧：默认/交互后/校验错误/滚动-中部/滚动-底部/键盘弹起-输入后；B5 帧同名单校验错误；静态 pass A/B 默认）逐一验证实体存在。tour manifest-detail.json … | python 读 manifest 输出（gitSha/buildMode/shots=305/本页 21 条含 circles）；13 文件 stat 全部存在（68451/68324/61589/61437/72437/68982/61256/61483/72496/6908… |
| 默认态整页布局与双身份一致性：6 分类 chip 两行三列（课程交流选中=品牌绿描边+浅绿渐变底+文字变绿加粗，其余灰绿底）、话题标题/话题内容白卡+浅色输入底、内容计数 0/500 右对齐、上传图片 0/6+虚线「+添加图片」格、选择话题区（已选话题 0/3、『暂未选择任何话题』空态行、搜索话题输入、热门话题 12 枚 chip 带热度数字 #话题日常1280…#美食探店234）、匿名发布开关行、底部发布话题置灰钮——A/B 双身份帧… | tour A/B 默认帧逐张目验；A 默认 x=30/186 双列像素扫描（header 绿带 y1-92、白卡、chipbg 分段）。 |
| MP-R1-CAMPUSPOST-003（header 发布钮避让胶囊）修复在当前构建视觉证实：3x 放大帧中白色「发布」钮完整位于胶囊左侧、右缘与胶囊左缘有明显间隙无遮叠；header 渐变绿→粉与白字标题、半透明白「取消」钮渲染正常。 | reports/audit/round-1/tmp-a3/header-zoom-tour.png（自 tour A 默认帧 0-115px 裁切 3x）；对照静态 pass 过期帧的同区域遮叠残影。 |
| A2 代查 MP-R1-CAMPUSPOST-014（状态栏双份叠加，代码链推证置信 0.6）的 DevTools 侧机制实测互证：默认帧 header 绿色背景自 y≈1 开始（App.vue page padding-top 的 var(--statusbar,env) 在 page 节点回退 env=0），而「取消」钮顶缘 y≈55（--statusbar≈44px 仅注入 .post-page 后作用于 .post-header… | 默认帧 x=30 逐行色变扫描（y0 灰/y1 绿/取消钮白 y55-90）；useMenuButtonRect.ts:47-52（styleVars 注入 .post-page 节点）；App.vue page 规则 padding-top: var(--statusbar, … |
| 输入回显与提交态联动正确：键盘弹起-输入后帧标题框实显「巡检输入test123」、字数计数保持 0/500（内容未动）、顶部与底部发布钮均维持置灰（canSubmit 要求内容非空，:112-114）——视觉与逻辑一致。DevTools automator 不渲染软键盘，cursor-spacing=20（:325/:337）的键盘避让无法视觉验证，如实列为未验证项。 | tour A/B 键盘弹起-输入后帧目验（A 帧 1:25、B 帧 2:29，内容一致）。 |
| 历史回归 MP-R1-CAMPUSPOST-002（real 配图 Idempotency-Key 恒定冲突，P1）本岗独立代码核验通过：①文件名 campus-topic-${Date.now()}-${uploaded.length}.jpg（post-topic.vue:213，循环内 uploaded.length 严格单调）②幂等键=hashString(endpoint\|file.name)（services/api.ts:… | sed 读取 api.ts:200-210 与 http.ts:240-255 原文；post-topic.vue:203-217 循环体。 |
| 交互证据质量缺口（如实记录，不作页面缺陷，判定归交互判定员）：①PT24「选图成功 1 张」EXECUTED 但 before/after 帧 MD5 相同（d492d9a8…）且 DOM 记录 .image-item:absent——DevTools 自动化无法完成系统选图，图片墙 3 列网格/缩略图/删除×/满图 6/6 加号格隐藏等状态本轮 0 帧实拍；②PT29 observed 含 pre-FAIL:input element… | MD5 分组输出（SAME-GROUP 4 组）；exec-results.json PT24/PT29/PT37 observed 字段原文；PT37-after.png 目验。 |
| 理想图对照结论：素材/理想效果图/ 19 张整页稿中无本页（校园圈·发帖）锚定稿。目验最接近的「发布帖子页面.png」语义对应圈子发帖（发布到摄影圈/添加位置/谁可以看/发帖小贴士/底部工具栏，X 关闭钮）、「校园圈.png」对应圈层列表——结构（L1）即不同，不作本页 L1-L10 对照依据；本页视觉评价以现行 token 链与跨页一致性为准。 | 素材/理想效果图/ 目录 19 文件清单；发布帖子页面.png 整图目验（标题『发布动态』、发布到摄影圈）。 |

### SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json（subpackages/discover-extra/discover/matching｜视觉审查员-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING（A3，截图与…｜2026-09-23）

- 覆盖核对（原文）：证据前置校验：screenshot-manifest.json gitSha=aefd8a72 与 HEAD aefd8a72f2231e8df7affd09004c14c3e4e73745 一致；interact/exec-results.json 顶层 gitSha=aefd8a72、updatedAt 2026-09-23 同批；MT* 截图 mtime 2026-09-23 为有效证据；MATCHING-OP*/PROBE* mtime 2026-09-20 为上轮遗留且当前 exec-results 无对应条目 → 按过期证据未采信（如实标注）。
- 覆盖核对（原文）：subpackages/discover-extra/discover/matching（寻觅-匹配中）13 项举证：①截图已看——静态巡检 0 张（记 P1=101）；改以同批次交互截图 MT01/MT04/MT24 三张目检+裁切放大复核（有效替代静态默认态：dev-preview/观察窗口与默认态同模板）。②理想图已对照——匹配中页面.png 逐要素 L1-L8：双头像+爱心+轨道环+涟漪/标题/副标题/四维进度卡（旅行 90/音乐 85/电影 80/生活 79）/总进度 89%/跳过/返回/漂浮爱心 均在，顺序（103）、叠压（102）、跳过样式（106）、百分比（104）偏差已列。③滚动已测——本页 overflow:hidden 不可滚（MT17 EXECUTED『swipe down unsupported；内容无裁切』引用，自身未驱动工具）。④点击已测——MT07（栈>1 返回）/MT08（栈=1 switchTab 落发现）EXECUTED；MT09-12/MT20/MT21 skip/back 点击 FAILED 均为『element not found』且 route 终点=pages/discover/index，系自动化会话中页面先经 200ms 兜底退场所致的会话伪影，非页面缺陷——交互判定归交互判定员，不越界。⑤返回已测——MT06/MT07/MT08（见④）；goBack 双分支代码复核 matching.vue:54-61。⑥safe-area 已查——matching.vue:244 top=calc(var(--statusbar,env(safe-area-inset-top))+24rpx)，useMenuButtonRect JS 注入（DevTools env 恒 0 兜底）；MT01/MT24 截图中返回钮/内容与状态栏、胶囊无叠印。⑦TabBar 已查——本页非 tab 页，截图中无 TabBar，无遮挡问题。⑧空态已查——匹配动画页无列表空态场景；ask 所述『次数用尽/看完=空态』属匹配中心（§19 03）页面语义，映射核对归需求对照员，本页不适用。⑨长文已查——标题/副标题为固定文案非用户输入；partnerName prop 声明未消费（代码审查员 006 已报），无长昵称溢出路径，不适用。⑩加载态已查——本页即加载/动画态本身，2.6s 兜底 finish（MatchLoading.vue:39-41；MT18 EXECUTED『2.6s 兜底必触发 finished』）。⑪错误态已查——MT04-after（failed 分支观察窗口）整页渲染与常态一致、无破相；MT03/MT15 出现「卡片不存在或已被处理」toast 属交互/状态机域，移交交互判定员（如实记录，不判）。⑫组件一致性已查——进度条品牌绿/胶囊圆角/返回钮样式与理想图对照（106）；token 残留归代码审查员 005，未重复。⑬历史 Bug 回归已查——MP-R3-MATCHING-001：200ms goBack 兜底在位且行为证实（代码 matching.vue:54-61/:143-147 + MT06/MT22 EXECUTED），兜底未被修坏，维持「非缺陷」结论；MP-R2-MATCHING-002：双头像渲染非空圆（MT01/MT24 中我的头像、对方虚化头像均渲染出图像，代码出口 resolveMediaUrl matching.vue:38-45 在位）→ 已修复待终验（本证据为 mock 模式，re…
- 覆盖核对（原文）：未执行/超范围（如实说明）：未驱动微信开发者工具（全部行为证据取自本轮巡检产出文件，本审查为事后目检+代码复核）；静态基线截图缺失致 L4/L5/L9 像素级对照（卡片尺寸/间距/阴影）未逐项执行——已并入 101 的修复项；real 模式（非 mock）头像渲染未验证；MT02/MT09-12/MT20/MT21 的 FAILED 判定、MT03/MT15 的「卡片不存在或已被处理」toast 归因，归交互判定员。

### SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json（subpackages/discover-extra/discover/match-success｜视觉审查员-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS（A…｜2026-09-23）

- 覆盖核对（原文）：截图已看：B/默认 全图 + nav/title/avatars/scorecard_top/scorecard_bot/cta/bottom 七区裁切放大（3x-8x）+ MS14-after/MT24-after 交互与对照截图；A/交互后、B/交互后 已看（均为错拍内容，如实标注）。
- 覆盖核对（原文）：理想图已对照：素材/理想效果图/匹配成功页面.png 按 L1结构/L2层级/L3交互位置/L4尺寸/L5间距/L6 Typography/L7 Icon/L8颜色/L9阴影/L10微细逐层比对（L1 结构顺序一致；L3 CTA 位置偏差=-107；L4 头像/卡尺寸偏差=-107；L7 图标偏差=-105/106；L8 颜色偏差=-101/102/108；L6 文案偏差=-109）。
- 覆盖核对（原文）：滚动已测：MS16 pageScrollTo bottom/top 已执行（本页内容短于视口，滚动无状态变化）；底部空置带为像素实测（bottom.png）。
- 覆盖核对（原文）：点击已测：MS06/07/08/09/10/11/12 点击用例均 EXECUTED（返回、右上两钮、分享喜悦、立即聊天×5 防连点、继续探索），toast/路由留证。
- 覆盖核对（原文）：返回已测：MS05（栈>1 navigateBack）/MS06（栈=1 switchTab 兜底）已执行；落点与 navError 细节归交互判定员。
- 覆盖核对（原文）：safe-area 已查：B/默认 顶部 nav 三钮无状态栏叠印、右钮未触胶囊（截图 + OP02 几何引用）；代码层 010 双通道隐患归代码审查，不在本报告重复。
- 覆盖核对（原文）：TabBar 已查：本页非 tab 页，截图确认无 TabBar，无遮挡问题。
- 覆盖核对（原文）：空态已查：本页为庆祝页无空态设计，恒渲染成功态；partner 缺失渲染伪成功页的缺陷已由代码层 009 立案，本报告不重复。
- 覆盖核对（原文）：长文已查（未取得直接证据）：未跑长昵称/50字用例（无对应截图）；代码层 subtitle max-width:560rpx 可换行（MatchSuccess.vue:216），如实标注为未基于截图验证。
- 覆盖核对（原文）：加载态已查：页面无 loading UI（代码层 008 死代码 loading ref 佐证），onLoad 即渲染；本页视觉无骨架/占位需求冲突，未另立案。
- 覆盖核对（原文）：错误态已查：头像 @error 兜底链在码（MatchSuccess.vue:13-18）且 MS14 实证默认头像路径；接口失败伪成功=代码层 009 已立案，不重复。
- 覆盖核对（原文）：组件一致性已查：与匹配中心页（MT24-after）同构四行卡并排对照——本页图标语义与风格均不一致（-105/106）；nav 白圆钮风格两页一致；Toast 为全局 uni.showToast（MS09 实录），与他页同制。
- 覆盖核对（原文）：历史 Bug 回归已查：MP-R3-MSUCCESS-001/002（状态栏/胶囊叠压）视觉复核通过（B/默认 nav 区无叠印）；代码层 001 已验证几何，本页未见回归。
- 覆盖核对（原文）：证据缓存校验：screenshot-manifest.json gitSha=aefd8a72=当前 HEAD=exec-results.json gitSha，证据未过期；ask 给定 A/默认 路径不存在与 A/B 交互后错拍已如实标注（evidenceValidation.notes）。

| 观察 | 证据 |
|---|---|
| B/默认（有效基准截图，gitSha=aefd8a72 构建链）整页渲染健康度核对：标题「匹配成功」绿色 #36C99A 系（标题带饱和色主簇 (48,192,144)，与代码及理想图绿标题一致；初审小图误判粉色已被像素取证纠正）；标题-副语-双头像-粉心-四行计分卡-立即聊天-继续探索-分享喜悦 结构齐全且顺序与理想图 L1 一致；头像直径 96px（=192rpx 代码值）、心形圆 60px（=120rpx）、计分卡四行 90/85… | reports/screenshots/round-1-tour/B/subpackages_discover-extra_discover_match-success__默认.png + reports/audit/round-1/findings/_tmp_crops_MS/… |
| 证据链缺陷（如实标注，非页面缺陷）：tour A 与 tour B 的 match-success__交互后 截图内容均为发现页筛选抽屉（非本页），两轮交互后截屏均错拍；且 ask 给定的 A/…__默认.png 路径不存在（默认 截图在 B 目录）。本页 tour 级有效证据仅 B/默认；后续轮次的「交互后」取证需重拍。 | reports/screenshots/round-1-tour/A/subpackages_discover-extra_discover_match-success__交互后.png 与 .../B/...__交互后.png 均显示寻觅/推荐/附近+全部筛选面板+TabBar… |
| 行为证据核对（exec-results.json，gitSha=aefd8a72 一致）：本页 MS01-MS16 共 16 例全部 EXECUTED，覆盖 dev-preview 直达渲染（MS01）、无参兜底 TA+默认头像（MS02）、带参兜底（MS03/04）、返回分流（MS05/06）、右上两钮 toast（MS07/08）、分享喜悦 toast=「分享功能即将上线」（MS09 实录 toast title）、立即聊天跳转与防… | reports/audit/round-1/interact/exec-results.json（results 内 manifest=SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS 共 16 条，status 均 EXECUT… |
| 数据态视觉核对：MS14-after（partner=星野、真实 tags）渲染正常，但坐实 -105 的图标-文案错配在数据态同样发生（「都喜欢日落」配跑者、「喜欢同一种浪漫」配书本）；头像双圆均加载（dev-preview 本地图）无空白圆，-002 修复链路在该态视觉无异常。 | reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-MS14-after.png |
- 证据时效（原文）：currentHead=aefd8a72f2231e8df7affd09004c14c3e4e73745

### SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json（subpackages/chat/chat-session/index｜视觉审查员-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX（A3，截图与证据的视觉/布局/…｜2026-09-23）

- 覆盖核对（原文）：证据缓存校验：screenshot-manifest.json gitSha=aefd8a72=ask 要求值✓；exec-results.json gitSha=aefd8a72、updatedAt 2026-09-23✓——本轮全部结论基于未过期证据。
- 覆盖核对（原文）：静态截图已看：tour 默认态 1 张逐区审查（L1 结构✓四区齐备/L2 信息层级—RelationshipTag 缺失→205/L3 交互位置✓破冰 chips 与输入区位置合spec/L4-L10 空会话态下无可比卡片流；色值漂移→203）；交互截图逐张已看 CS06/07/08/09/13/15/33/44/45 共 9 张 + 2 张 2x/3x 放大裁切。
- 覆盖核对（原文）：理想图对照：本页无理想图（ask 明示），按 git show 29a2b1df:docs/design/message-v3-spec.md §2.2 四区结构+§3 token+§8 组件清单执行；29 张整页稿无本页锚定图，素材/参考图拆分图标件按 R13 判定未作页面级对照。
- 覆盖核对（原文）：滚动已测：CS10（scrollPos=top）/CS11（observe-only .chat-scroll:present）状态 EXECUTED 但无有效滚动截图/滚动位置序列证据——滚动三行为（贴底滚底/历史浏览新消息提示条 CS45 act-FAIL/上拉视口保持）实机表现未验证，不计通过。
- 覆盖核对（原文）：点击/返回已测：CS41/CS42 状态 EXECUTED（act:tap .chat-header__back 执行）但无截图，返回落点/未读红点恢复归交互判定员复核，本审查不越界判定。
- 覆盖核对（原文）：safe-area 已查：SE 档截图无 home indicator 无法视觉复核底部 inset；代码层双重 inset 已由代码审查 005 立项（本审查不重复）；顶部状态栏叠印 CS45 单帧→204。
- 覆盖核对（原文）：TabBar 已查：本页非 tab 页无 TabBar，全部截图确认无 TabBar 遮挡问题✓。
- 覆盖核对（原文）：空态已查：默认空会话态「会话刚建立，还没有消息。」居中非空屏✓（tour+CS08）；greeting/chips/推荐开场兜底链完整✓。
- 覆盖核对（原文）：长文已查：消息流多消息/长文/500-1000 字极端态无有效截图证据（CS16-22 缺参连锁失败），未验证——如实标注。
- 覆盖核对（原文）：加载态已查：CS06 dom 观察 .uni-skeleton:absent（骨架未在采样帧出现，永驻性无法证伪）；加载态视觉未验证。
- 覆盖核对（原文）：错误态已查：缺参（CS07/13/15）✓双区一致；temp 失效（CS09）✓；数字失效（CS08）✗假空会话→201；fromSignal 无效参（CS44）✓面板渲染但证据受脚本污染。
- 覆盖核对（原文）：组件一致性已查：ChatHeader 仅本页消费（grep 实跑）→202/203 影响面即本页；状态标签与消息列表同类组件不同实现→205；「聊天」vs「对方」兜底口径→206。
- 覆盖核对（原文）：历史 Bug 回归已查：R13-CHAT-409 代码层修复本体在位（代码审查员已核对 idem-conv 唯一键+净化器），本轮无运行时 409 复测（未验证，需 Layer B/终验）；MP-R2-001 布尔契约在 temp 主链路生效（CS09 错误态正确到达佐证），其派生残留（001/004）归代码审查条目。
- 覆盖核对（原文）：未执行/越界声明：未运行任何构建/单测（视觉审查不适用）；未读取其他轮次审计结论当答案；功能目标对照、交互成败判定、历史回归终裁分别归需求对照员/交互判定员/历史回归员。
- 覆盖核对（原文）：产出物：本 findings JSON + 3 张证据裁切（reports/audit/round-1/findings/_tmp_crops/：CS45-after_top2x.png、CS13-after_top2x.png、CS08_chips_3x.png）。

| 观察 | 证据 |
|---|---|
| 默认态（tour A 组）四区结构与 message-v3-spec §2.2 逐区对应：顶部导航（返回‹+头像+对方+♡认识1天粉徽标+离线+···+原生胶囊）、关系状态区（「你们已互相匹配成功…」greeting+2 条破冰 chips）、消息流空态（「会话刚建立，还没有消息。」居中灰字，非空屏白板）、恋爱输入区（表情+加号+输入框+发送置灰钮）。语音按钮缺失经代码核实为产品决策非缺陷（index.vue:1220-1224「按产品… | reports/screenshots/round-1-tour/A/subpackages_chat_chat-session_index__默认.png + apps/client/src/subpackages/chat/chat-session/index.vue:122… |
| 缺参错误态（无 sessionId 直开）在两种设备档位下渲染一致：错误文案「缺少会话标识，请从聊天列表或匹配结果进入。」顶部+底部双区展示（index.vue:1876+1971），输入栏不渲染，header 完整（CS07 SE 档 10:49；CS13/CS15 刘海档 19:30-19:31），无布局溢出或裁切。 | reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS07-after.png、CS13-after.png、CS15-after.png |
| temp 失效深链（session-100158-100159-deadbeef）错误态正确到达：「会话不存在或已失效」顶部+底部双区展示、无假会话渲染——证明 temp 分支 `!chatStore.activeSession` 失败门（index.vue:621-628，MP-R2-001 修复本体）在 mock 运行时生效；与数字分支 CS08 假空会话（201）形成同页两分支行为对照。 | reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS09-after.png |
| fromSignal=1 渐进解锁面板渲染完整：白卡「已互动 0 条消息 / 0% 进度条 / 五档位（地区年岁学校=绿勾已解锁，兴趣爱好2/照片3/语音状态4/主页5 灰序号）/ 再互动 5 条解锁「兴趣爱好」」（index.vue:217-231 档位规则一致）。证据局限：该用例 route sessionId={id} 为脚本占位符未插值，面板叠于「会话不存在或已失效」错误态之上（toast「暂无法获取对方信息」）——CS44 截… | reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS44-after.png + exec-results.json CS44 route options {"fromSignal"… |
| 破冰 chips 文案问号渲染宽度存疑但不立 Issue：3x 放大（_tmp_crops/CS08_chips_3x.png）中「最近过得怎么样?」「平时喜欢去哪里逛?」的 ？窄于同句全角「，」「！」，疑似半角；但源码 zh-CN.ts:4554-4555 为全角「？」，模拟器字体度量差异不能排除——按观察证据制（禁止无证据推测）记观察不上报。 | reports/audit/round-1/findings/_tmp_crops/CS08_chips_3x.png vs apps/client/src/i18n/locales/zh-CN.ts:4554-4555 |
| 证据卫生与局限（如实记录）：① reports/screenshots/round-1-interact/ 混有 2026-09-20 21:2x 旧轮孤儿截图 CHAT-CHAT-SESSION-INDEX-01..49（无 SUBPACKAGES 前缀），未被本轮 exec-results.json 任何条目引用，已按过期证据处理未采信；② 本轮 45 用例中 CS15-CS45 均以缺参 route（options={}）执行致 … | ls -la 文件时间戳（CHAT-* 2026-09-20 vs SUBPACKAGES-CS* 2026-09-23）；exec-results.json CS15-CS45 route options 均为 {}；409 全文检索输出 |

### SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX.json（subpackages/chat/official-chat/index｜视觉审查员-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX（A3，截图与证据的视觉/布局…｜2026-09-23）

- 覆盖核对（原文）：证据校验：reports/audit/round-1/screenshot-manifest.json gitSha=aefd8a72 与当前 HEAD（git rev-parse HEAD → aefd8a72f2231e8df7affd09004c14c3e4e73745）一致；exec-results.json gitSha=aefd8a72 同步一致——全部证据按未过期采用，未基于过期证据下结论。
- 覆盖核对（原文）：截图已看：A/B 双身份 默认+交互后 4 张全部逐张实读；round-1-interact 落盘件 OC11/OC12/OC25 实读，OC15/OC16/OC17/OC22/OC24 经 judge md5 仲裁为失败用例同帧空基础态（未重复实读）；7 张 ERROR:timeout 截图磁盘不存在（judge 清点）如实标注。
- 覆盖核对（原文）：理想图已对照：素材/理想效果图/ 19 张清单核对，无本页锚定稿；ChatGPT Image 11_37_17.png 实读为吉祥物立绘——页面级 L1-L10 对照不可执行，如实标注而非虚构达标。
- 覆盖核对（原文）：滚动已测（部分）：默认态滚动位置=顶部（时间条+首条完整可见）由 A/B 默认截图证实；发送路径滚底由 OC12-after 证实；OC18 的 pageScrollTo 对内部 scroll-view 无效（judge 仲裁 UNVERIFIED），滚动后末条完整可见性以 OC12 截图间接证实（发送态）、默认态证实为不滚底（010）。
- 覆盖核对（原文）：点击已测：OC07（···→Toast 会话设置敬请期待）、OC08（+→Toast 更多功能敬请期待）、OC11（空发送×5 零副作用）、OC12（正常发送全链路）EXECUTED；OC09/OC10/OC13-OC17/OC21-OC24 因 harness el.input 错误或 mock 环境无承载元素而 FAILED/UNVERIFIED（judge 已逐条仲裁），本审查不对这些用例的目标行为下结论。
- 覆盖核对（原文）：返回已测：OC05 栈深 1 时返回键兜底 switchTab 回消息 tab 终态 route=pages/messages/index VERIFIED（视觉层无落点异常截图问题）。
- 覆盖核对（原文）：safe-area 已查：输入栏 padding-bottom: calc(16rpx + env(safe-area-inset-bottom))（index.vue:913）+导航 statusBarHeight JS 注入（:364 附近，代码核对）；模拟器截图无法验证真机安全区，如实标注为代码层核对。
- 覆盖核对（原文）：TabBar 已查：本页为 subpackages 非 tab 页无 TabBar 遮挡问题；自定义导航与胶囊按钮、状态栏在 A/B 截图均无叠印。
- 覆盖核对（原文）：空态已查：mock 恒 3 条消息空态不可达；real 模式错误态（errorMessage+重试）在 mock 包不可呈现（OC23 UNVERIFIED）——空态/错误态视觉本轮无运行证据，不判达标也不判缺陷。
- 覆盖核对（原文）：长文已测：OC15（300 字发送折行+末条完整可见回归）因 harness el.input is not a function 未执行——长文本场景本轮未验证，010 的修复验证建议中已包含该场景。
- 覆盖核对（原文）：加载态已查：OC01 骨架「后隐」终态有单次采样、「先现」无直接证据（judge 已注记）；骨架占位视觉本身在落盘截图中无异常帧。
- 覆盖核对（原文）：组件一致性已查：输入栏[表情][+][输入框][发送]结构与私聊页 R20 统一口径一致（代码+截图）；助手/用户气泡、SVG emoji（🌱✨😊）同源渲染正常；时间条 #bbb 裸色属代码审查 005 已报的裸 hex 同类，不重复报。
- 覆盖核对（原文）：历史 Bug 回归已查：MP-R1-OFFICIAL-003（P0 末条截断）→ 已验证为默认态仍复现（010，P1 Regression，mock 分支缺滚底调用）；代码审查 007「已修复待终验」结论被运行时证据部分推翻——real 分支修复未测（无 real 环境），mock 分支确认未接线。
- 覆盖核对（原文）：职责边界：功能目标对照（报名成功消息链路语义）、历史回归全量复核、交互行为仲裁归需求对照员/历史回归员/交互判定员；本审查仅补视觉/布局/状态/数据极值呈现层缺陷（010-013），不重复代码审查 001-009 已报项（键盘互斥、emoji 口径、token、onShow 消费、死代码等）。
- 覆盖核对（原文）：未运行/未覆盖项：未启动微信开发者工具自行取证（以巡检+交互轮既有截图为证据源）；未验证 real 模式（mock 包无 real 环境）；真机 safe-area/键盘弹起/300 字长文/表情面板开合的视觉终态无有效落盘证据，均如实标注未验证。
- 覆盖核对（原文）：工作产物：放大证据件留存于 reports/audit/round-1/findings/_tmp_A_default_bottom.png、_tmp_A_default_junction.png、_tmp_A_bubble1.png、_tmp_OC12_avatar.png。

| 观察 | 证据 |
|---|---|
| A 身份默认态：自定义导航「寻觅助手」+绿描边「官方」徽章+副标题「你的恋爱小管家」渲染正确，与右上胶囊按钮无重叠、与模拟状态栏无叠印；英雄区吉祥物（绿色芽苗娃娃，IMAGE_PATHS.MASCOT.SMILE）+问候文案完整；三条 mock 助手消息全左对齐带头像，首条时间条「9月21日 03:14」；首条气泡内 🌱/✨ 经 EmojiText 渲染为品牌 SVG（放大图 _tmp_A_bubble1.png 可见芽苗 SVG 与… | reports/screenshots/round-1-tour/A/subpackages_chat_official-chat_index__默认.png；放大件 reports/audit/round-1/findings/_tmp_A_default_bottom.png… |
| B 身份默认态：与 A 身份逐元素一致（双身份无差异，符合 mock 消息与身份解耦的预期）；时间条「9月21日 03:23」随进入时刻生成（mock publishedAt=Date.now()-2d，预期行为）；末条消息同样截断于「✅ 活动开始前一天我会提醒」（010 在 B 身份稳定复现）。 | reports/screenshots/round-1-tour/B/subpackages_chat_official-chat_index__默认.png |
| A/B 交互后截图均为点击活动卡片/「查看详情」后的活动详情页实拍：证明本页卡片→详情跳转链路在巡检会话中真实可达（与 A1 run 中 OC19/OC20 路由不变的坏探针记录形成对照，judge 已仲裁巡检为准）；到达页为「新人礼遇」构成本轮 011 号发现（卡片内容与目标不符）的直接证据。 | reports/screenshots/round-1-tour/A/subpackages_chat_official-chat_index__交互后.png；reports/screenshots/round-1-tour/B/subpackages_chat_officia… |
| OC12-after（critical 发送链路）：用户消息右侧品牌绿气泡+白字+「已读」回执渲染正常；用户头像为深色纹理圆（judge 已比对为 avatar 资产本体，非裂图）；发送后滚底生效（用户消息与已读完整可见于输入栏上方），同一屏内消息 103 全文 4 行完整可见——与默认态截图对照坐实 010「默认态未滚底」；消息 103 上方出现「11:08」时间条（idx=3 恰命中 idx%3==0，行为偶合正常）；助手消息文案与… | reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC12-after.png；放大件 reports/audit/round-1/findings/_tmp_OC12_avatar… |
| OC11-after（空输入快击发送×5+单击）：零新增气泡、输入框空、发送键保持浅绿禁用态（#C7E9DC 与样式一致），无 Toast 无路由变化——空输入防误触的视觉终态正确；该截图同时第三次复现默认态末条截断（010）。 | reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC11-after.png |
| OC25-after（未登录+token 移除冷启动，mock 包）：聊天主体照常渲染无 LockScreen——为 mock 包 isUnlocked=isLoggedIn\|\|useMock() 的预期旁路（judge 判 UNVERIFIED/mock 正确表现），非缺陷；页面视觉与登录态无差异，无闪烁/错误态。 | reports/screenshots/round-1-interact/SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-OC25-after.png |
| 理想图对照：素材/理想效果图/ 19 张整页稿中无本页锚定稿；唯一疑似「ChatGPT Image 2026年8月20日 11_37_17.png」实为吉祥物立绘（与素材/吉祥物体系同源），与本页 hero 吉祥物形象一致（绿色芽苗娃娃），可证品牌形象一致，但页面级 L1-L10 对照无法进行——本页以代码内注释声明「理想图还原版」+品牌视觉总谱为间接依据，L1-L4 页面级达标性留待理想稿锚定后补审。 | 素材/理想效果图/ 目录清单（19 张无 official/助手/聊天整页稿）；素材/理想效果图/ChatGPT Image 2026年8月20日 11_37_17.png（已实读，吉祥物立绘非整页稿） |

### 次要20.json（—｜视觉审查员-R1-次要20（A3，截图/行为证据的视觉·布局·状态审查）｜2026-09-24）

- 覆盖核对（原文）：subpackages/village/village/detail（13 项举证）：截图已看（默认/数据态/滚动-中部/滚动-底部 A+B 共 8 张+VD 系列 6 张交互截图）；理想图已对照（帖子.png，L1-L5 逐项，产出 DETAIL-204 五项偏差）；滚动已测（巡检滚动截图两页位，暴露 DETAIL-201）；点击已测/返回已测（行为证据 VD01/02/04/05/12/16/19/21/22/25/27——VD02 暴露 goBack 无守卫 DETAIL-202，VD 系列 FAILED 均因巡检用无参 route 打开渲染空态，属巡检脚本问题非产品缺陷，已甄别）；safe-area 已查（默认态头部避让正常，滚动态失效即 DETAIL-201）；TabBar 已查（本页非 tab 页，底部输入条 fixed 正常不遮内容尾部）；空态已查（VD27 截图「帖子不存在/返回广场」完整）；长文已查（正文两行+评论列表正常）；加载态已查（VD01 dom .detail-skeleton:absent 内容直出）；错误态已查（VD27）；组件一致性已查（空态/输入条与项目组件库一致）；历史 Bug 回归已查（MP-R1-DETAIL-001 亲跑 compiler-sfc 通过；MP-R2-VILL-013 巡检帖未见复现）。未覆盖：全屏图片查看层运行态（无交互截图，编译层已证）、键盘弹起。
- 覆盖核对（原文）：subpackages/village/village/tag-posts（13 项举证）：截图已看（默认/空态 A+B 4 张+VT03 交互截图）；理想图已对照（*：无本页专属理想图，按 19 张整页稿无锚定如实记录）；滚动已测（无滚动截图——列表恒空无内容可滚，本身即缺陷 TAGPOSTS-201 的表现）；点击已测（VT03/VT05 行为证据：缺参 toast 守卫正常、卡片点击路径存在但被列表断链阻断）；返回已测（tag-posts.vue:244-256 守卫在位，A2 证实）；safe-area 已查（头部避让在位截图无叠印）；TabBar 已查（非 tab 页 N/A）；空态已查（截图完整）；长文已查（N/A 空列表）；加载态已查（代码 600ms mock 延迟+骨架，无截图）；错误态已查（缺参 toast）；组件一致性已查（空态图标/文案与 village 族一致）；历史 Bug 回归已查（TAGPOSTS-001/002/006 修复在位——1 基分页注释、goBack 守卫、?id= 直达）。
- 覆盖核对（原文）：subpackages/village/village/history（13 项举证）：截图已看（默认 A+B 2 张+放大裁切件+VH06 行为证据）；理想图已对照（无本页专属理想图，如实记录）；滚动已测（无滚动截图，但默认态已暴露 A2 HISTORY-102 的末条裁切，作佐证）；点击已测（VH01-VH09 中 VH06 EXECUTED，清空弹窗/卡片点击存在）；返回已测（goBack 守卫在位 history.vue:41-48）；safe-area 已查（暴露 MP-R1-HISTORY-201：返回键叠状态栏、清空记录叠胶囊）；TabBar 已查（非 tab 页）；空态已查（代码 EmptyState @action 接线，无空态截图如实注明）；长文已查（6 条记录正常）；加载态已查（loadingHistory 骨架在位）；错误态已查（@error 占位逻辑在位）；组件一致性已查（工具栏/卡片风格与 village 族一致，唯 token 拼错 A2 已报）；历史 Bug 回归已查（HISTORY-001 reLaunch 兜底在位）。
- 覆盖核对（原文）：subpackages/circles/circles/topics（13 项举证）：截图已看（默认 A+B 2 张）；理想图已对照（无本页专属理想图；Tab 文案与 circle-home/理想图互证为「作品墙」）；滚动已测（无滚动截图，A2 TOPICS-101 静态推断未复核，如实标注未验证）；点击已测（CT03/CT10/CT11/CT12/CT14/CT16——EXECUTED 仅 CT12 下拉刷新；FAILED 均为巡检无参/选择器问题已甄别）；返回已测（守卫在位 A2 证实）；safe-area 已查（头部避让在位截图无叠印）；TabBar 已查（非 tab 页）；空态已查（截图完整+CT16 空态路径）；长文已查（N/A 空态）；加载态已查（N/A）；错误态已查（无参 toast「兴趣圈 ID 无效」守卫正常）；组件一致性已查（置顶条/Tab/空态与 circle-home 同款）；历史 Bug 回归已查（joinCircle 失败 toast 修复在位 A2 证实）。
- 覆盖核对（原文）：subpackages/circles/circles/topic-detail（13 项举证）：截图已看（默认 A+B 2 张+CD 系列 5 张交互截图）；理想图已对照（无本页专属理想图）；滚动已测（无滚动截图；A2 CTOPIC-102 回复栏非 fixed 静态推断未复核，如实标注）；点击已测（CD03-CD12：CD12 返回 EXECUTED，其余 FAILED 为无参空态下选择器不可达，已甄别）；返回已测（CD12 通过+守卫在位）；safe-area 已查（头部避让在位）；TabBar 已查（非 tab 页）；空态已查（截图完整）；长文已查（N/A 空态）；加载态已查（N/A）；错误态已查（空态即错误态，渲染正确）；组件一致性已查（与 campus 版空态逐像素对照一致，按钮色值取样相同）；历史 Bug 回归已查（回复分页游标正确 A2 证实）。
- 覆盖核对（原文）：subpackages/circles/circles/circle-home（13 项举证）：截图已看（默认/数据态/滚动-中部/滚动-底部 A+B 共 8 张+CH 系列 5 张交互截图）；理想图已对照（圈子详情，摄影圈参考.png L1-L10 逐项：结构偏差产出 CIRCLEHOME-201，动态卡图文产出 CIRCLEHOME-202，FAB 并存/作品墙文案/置顶条核实为一致不报）；滚动已测（滚动-中部/底部截图：暴露 sticky 吸顶叠印，佐证 A2 CIRCLEHOME-103）；点击已测（CH03/CH04/CH07/CH10/CH11/CH12——加入双入口/分享钮在位）；返回已测（守卫在位 A2 证实）；safe-area 已查（hero 按钮 --statusbar 避让在位，底部 fixed 栏+placeholder 正常）；TabBar 已查（非 tab 页）；空态已查（未知圈空态代码在位 CH11 选择器未达）；长文已查（动态卡长文案正常）；加载态已查（骨架防误判 R10-P1-001 在位）；错误态已查（real 空数据分支在位）；组件一致性已查（Tab/置顶条/topics 同款）；历史 Bug 回归已查（MP-R1-CIRCLEHOME-001/003/004 修复在位——置顶条有文案、好友头像三张不同、原生分享按钮）。
- 覆盖核对（原文）：subpackages/campus/campus/topic-detail（13 项举证）：截图已看（默认 A+B 2 张+XT 系列 6 张交互截图）；理想图已对照（无本页专属理想图）；滚动已测（无滚动截图；A2 CAMPUSTOPIC-101 静态推断未复核）；点击已测（XT04-XT11：XT11 返回 EXECUTED，回复提交类 FAILED 为无参空态所致已甄别）；返回已测（XT11 通过）；safe-area 已查（头部避让在位）；TabBar 已查（非 tab 页）；空态已查（截图完整）；长文已查（N/A 空态）；加载态已查（N/A）；错误态已查（空态渲染正确）；组件一致性已查（与 circles 版空态一致）；历史 Bug 回归已查（R10-P1-003 statusbar 注释在位）。未覆盖：正常内容态全部视觉（巡检未产出该场景截图）。
- 覆盖核对（原文）：subpackages/campus/campus/certification（13 项举证）：截图已看（默认/滚动-中部/滚动-底部 A+B 共 6 张+XC 系列 4 张交互截图）；理想图已对照（无本页专属理想图，按表单完整性核对）；滚动已测（暴露 MP-R1-CERT-201 头部滚走+状态栏叠印）；点击已测（XC10 提交快击 EXECUTED；XC03-XC08 输入/上传类 FAILED 且 XC03 交互截图内容错位为发现页，已如实标注证据无效）；返回已测（goBack 守卫在位 A2 证实）；safe-area 已查（默认态头部避让正常，滚动态失效即 CERT-201）；TabBar 已查（非 tab 页）；空态已查（表单页无空态概念，选填标注清晰）；长文已查（超长输入行为未获有效证据，如实标注）；加载态已查（提交 loading 在位）；错误态已查（N/A 无截图）；组件一致性已查（渐变头/白卡/大钮与 campus 族一致）；历史 Bug 回归已查（实名门槛/幂等键/隐私授权 A2 证实在位）。
- 覆盖核对（原文）：横切说明：① 本轮全部结论基于 manifest gitSha=aefd8a72（=当前 HEAD）的巡检证据与当前工作区源码互证；工作区 6 个本批文件有未提交 M 状态，引用行号已逐条与截图表现核对无冲突。② A2 已报 31 项均未重复立条；A2 请求运行时复核的 sticky 项已由滚动-底部截图证实并在 observation 附证。③ 撤销的候选疑点（避免编造）：tab「作品辑」系缩略图误读（放大为「作品墙」与理想一致）、非成员 FAB 并存与理想图一致、两 topic-detail 空态按钮色值一致——三者均不成立为缺陷。④ 未运行小程序/未真机：键盘、真机 safe-area、手势返回未实测；topics/tag-posts/campus topic-detail/circles topic-detail 的正常内容态无截图素材，相关视觉未审查。

| 观察 | 证据 |
|---|---|
| 默认态视觉整体健康：作者行（头像/昵称/复旦大学徽标/相对时间/关注钮）、单图、赞评计数、全部评论+最热排序切换、楼中楼评论卡（阿泽/橙子+回复入口+右侧心形计数）、底部 fixed 输入条（说点什么…+@/表情/图片）均正常渲染；巡检帖子 id=1《520诚友帖》配电车人像图与交友文案语义匹配——历史线索 MP-R2-VILL-013 在巡检所用帖子上未见复现（其批量图文不符 A2 已以 VILLMOCK-101 立条，本条为截图侧回… | reports/screenshots/round-1-tour/A/subpackages_village_village_detail__默认.png；__数据态.png 同版（A/B 双身份一致） |
| 历史 P1 线索 MP-R1-DETAIL-001（全屏查看层样式孤立 </style> 后被解析器丢弃）回归通过：本会话亲跑 node compiler-sfc parse（vue 3.4.21，命令与输出见 coverage），parse errors:0、style blocks:1、.image-viewer 与 .image-viewer__img 规则均在 style 块内、</style> 后无任何内容。与 A2 的 DE… | 命令输出（本会话运行）：parse errors: 0 \| style blocks: 1 \| has .image-viewer rule: true \| has .image-viewer__img rule: true \| </style> count: 1 \| trail… |
| 空态路径视觉正常：#摄影 渐变头部（返回钮与胶囊无叠印，--statusbar/--capsule-right 避让在位 tag-posts.vue:74-76/459）、书签图标空态、文案层级清晰；缺参直开有「缺少标签参数」toast+返回兜底（行为证据 VT03，设计行为非缺陷）。缺陷在数据链路（MP-R1-TAGPOSTS-201/101）而非视觉。 | reports/screenshots/round-1-tour/A/subpackages_village_village_tag-posts__默认.png；exec-results.json VT03 toast=[缺少标签参数] top 落回 village/index |
| 列表卡渲染健康：作者/标题/摘要/赞·阅·评数据行/相对时间均正常，6 条 mock 记录滚动可达；清空确认弹窗、下拉刷新（VH06 EXECUTED）行为正常。除 MP-R1-HISTORY-201 外，A2 已报的 HISTORY-102（末条初始裁切一半）在本轮默认截图中同样可见，作为其截图侧佐证（不重复立条）。 | reports/screenshots/round-1-tour/A/subpackages_village_village_history__默认.png（第 6 条小鹿卡在视口底部被裁约半）；exec-results.json VH06 refresherPull ok |
| 空态场景视觉正常：绿色 hero 头部避让（--statusbar/--capsule-right，topics.vue:633-635）生效，「话题列表」标题/编辑/···钮与胶囊无叠印；五 Tab（动态/精华/活动/作品墙/成员）与 circle-home 文案一致（放大核对为「作品墙」，与理想图一致）；置顶【圈规】条正常渲染；「暂无话题/来发第一个话题吧/去发布」空态完整。行为证据：下拉刷新 CT12 EXECUTED、无参 to… | reports/screenshots/round-1-tour/A/subpackages_circles_circles_topics__默认.png；exec-results.json CT12/CT03 |
| 「话题不存在」空态渲染完整（搜索图标/标题/副文案/返回钮），与 campus/topic-detail 空态同构；两页空态 CTA 按钮放大对比均为实心品牌绿 #36C99A 白字圆角钮，跨页一致（取样 (54,201,154)）。行为证据 CD12：tap「返回」EXECUTED（circles 版 goBack 有守卫，A2 coverage 证实）。巡检无正常内容态截图，正文/回复区视觉未覆盖。 | reports/screenshots/round-1-tour/A/subpackages_circles_circles_topic-detail__默认.png；reports/audit/round-1/findings/次要20-evidence/ 下放大对比已核（tm… |
| 多项理想图要点已达成：底部固定「加入圈子」大钮+右下铅笔 FAB 并存与理想图非成员态画法一致（理想图同样两者并存，非缺陷）；「热门」徽标、好友头像 3 张不同脸（MP-R1-CIRCLEHOME-003 修复在位）、置顶规约条有文案（非空绿带）、Tab 吸顶时机正常。运行时证据支持 A2 的 CIRCLEHOME-103（sticky top:0 侵入状态栏）：滚动-底部截图中吸顶 Tab 栏文字「精华/活动/作品辑…」与状态栏「We… | reports/screenshots/round-1-tour/A/subpackages_circles_circles_circle-home__滚动-底部.png（Tab 与状态栏叠印）；exec-results.json CH03/CH04/CH12 |
| 「话题不存在」空态完整（与 circles 版一致），绿粉渐变头部避让正常（campus/topic-detail.vue:21-22/331 statusbar 注入在位），标题「话题详情」白字居中与胶囊无叠印；行为证据 XT11：tap「返回」EXECUTED。巡检无正常内容态截图，回复流/匿名切换等视觉未覆盖（相关功能缺陷 A2 已报 CAMPUSTOPIC-101/102/103）。附带记录：交互截图 SUBPACKAGES-C… | reports/screenshots/round-1-tour/A/subpackages_campus_campus_topic-detail__默认.png；exec-results.json XT11；reports/screenshots/round-1-interac… |
| 表单默认态结构完整：为什么要认证要点卡/学校名称/专业/学生证照片虚线上传框/学信网验证码（选填）/学信网截图/「提交审核」大钮/底部隐私声明，token 化视觉与品牌绿一致；行为证据 XC10：提交钮快击×5 done=5（为 A2 CERT-101 无重入守卫提供行为佐证，不重复立条）。滚动缺陷见 MP-R1-CERT-201。 | reports/screenshots/round-1-tour/A/subpackages_campus_campus_certification__默认.png；__滚动-底部.png（提交审核钮+隐私说明）；exec-results.json XC10 |

### 次要21.json（—｜视觉审查员-R1-次要21（A3，截图与证据的视觉/布局/状态审查）｜2026-09-24）

- 覆盖核对（原文）：证据校验：git rev-parse HEAD=aefd8a72f2231e8df7affd09004c14c3e4e73745 与 screenshot-manifest.json/interact exec-results.json 的 gitSha=aefd8a72 一致——全部证据基于当前代码，无过期证据。本批静态截图 26/26 存在于磁盘（node fs.existsSync 核验 26 ok/0 missing）并逐张审查；任务书「本批没有静态截图→记 P1 缺截图」前提与证据矛盾（其失败原因列表均属其他页面），按观察证据制未记录该 P1，详见 meta.askPremiseCorrection。
- 覆盖核对（原文）：subpackages/discover-extra/home/segment：截图已看(A/B)✓ 理想图对照：19 张整页稿无本页映射→以品牌链像素核对替代（在线徽标/按钮/底色均 token 命中）✓ 滚动已测：SG07 pageScrollTo 顶/底 EXECUTED（无分页设计）✓ 点击已测：SG04 行跳转、SG05 返回兜底 ✓ 返回已测：goBack 带 switchTab 兜底（代码+SG05）✓ safe-area：--statusbar 注入，头部无叠印 ✓ TabBar/胶囊：本页无 TabBar，胶囊区无叠印 ✓ 空态：SG02 sameSchool 过滤 0 行不崩 ✓ 长文：文案均短串 ✓ 加载态：骨架 SG01 ✓ 错误态：mock 不可触发（SG06 元素不存在，如实记录）✓ 组件一致性：行结构与 nearby 页一致 ✓ 历史回归：MP-R2-SEGMENT-001 视觉证实已修（mock）✓。结论：无新缺陷。
- 覆盖核对（原文）：subpackages/discover-extra/nearby/people：截图已看(A/B)✓ 理想图对照：「附近的首页.png」为附近 Tab 首页非本页，不适用→品牌链替代 ✓ 滚动已测：NP05 触底分页 EXECUTED ✓ 点击已测：NP08 行跳转、NP04 同 Tab 防重 ✓ 返回已测：NP06 栈兜底 ✓ safe-area：头部无叠印 ✓ 空态：NP09 错误态 mock 不可触发 ✓ 加载态：骨架 NP01 ✓ 组件一致性：与 segment/likes 行对照（头像唯独本页缺失→MP-R1-NP-001）✓ 历史回归：MP-R2-PEOPLE-001 定高滚动已修模式在位 ✓。
- 覆盖核对（原文）：subpackages/discover-extra/discover/history：截图已看(A/B)✓ 理想图对照：无映射→品牌链（标题绿字/统计卡/空态图标均 token 系）✓ 空态已查：0/0/0+空态组件✓ 点击已测：DH07/DH08 ✓ 返回已测：DH07（栈=1 死按钮已由代码层 MP-R1-HIS-002 立案，行为佐证，不重复）✓ 加载态：骨架 DH01 ✓ 错误态/有记录态/挽回流：mock 无数据不可触发（DH02-DH06 失败行如实记录为环境限制）✓ 组件一致性：统计卡三列与 likes-visitors 概览卡同构 ✓。
- 覆盖核对（原文）：subpackages/discover-extra/likes/index：截图已看(A/B×3态)✓ 理想图对照：无映射→品牌链（Tab 胶囊/搜索框/认证徽章色一致）✓ 滚动已测：滚动-中部/底部帧+LK 系 ✓ 点击已测：LK03/05/07/08/09/10/13/14/16 ✓ 空态：LK05 searchEmpty 断言 ✓ 长文：搜索 120 字边界 LK06（元素未中，环境限制如实记录）✓ 错误态：LK15 mock 不可触发 ✓ 组件一致性：与 likes-visitors 行对照→排序折返共享（MP-R1-LIK-005）、图标塌陷（MP-R1-LIK-006）✓ 历史回归：MP-R1-LIKES-102 未登录按钮接线已修（LK01 通过）✓。
- 覆盖核对（原文）：subpackages/discover-extra/likes-visitors/index：截图已看(A/B×3态)✓ 理想图对照：无映射→品牌链 ✓ 滚动已测：三态帧 ✓ 点击已测：LV03/05/09/10 ✓ 空态：未登录 LockScreen（LV01）✓ 数据极值：badge 99+ 封顶逻辑在 Tab 徽标（LV03 断言）✓ 时间格式：LV11 M/D 无 NaN ✓ 组件一致性：与 likes 页对照→MP-R1-LIK-005 ✓ 历史回归：R4-00019 iOS 时间归一化在位（LV11）✓。
- 覆盖核对（原文）：subpackages/tools/daily-question/index：截图已看(A/B)✓ 理想图对照：无映射→品牌链（CTA 像素=#36c99a token 精确命中）✓ 点击已测：DQ01/02/04（去签到/空提交拦截）✓ 返回已测：DQ12（栈=1 死按钮已由代码层 MP-R1-DQ-004 立案，不重复）✓ safe-area：--statusbar 头部无叠印（dq-header-zoom.png）✓ 滚动已测：DQ10 scrolltolower ✓ 空态/长文：600→500 截断 DQ07（输入元素未中，环境限制如实记录）✓ 错误态：DQ11 mock 不可触发 ✓ 组件一致性：锁定卡与 likes 未登录引导不同构（NotLoggedWaiting/LockScreen/lock-card 三种引导并存，跨页提示为代码层已留意面，本批无页面级缺陷）✓。
- 覆盖核对（原文）：subpackages/tools/love-center/index：截图已看(A/B×3态)✓ 理想图对照：无映射→品牌链 ✓ 点击已测：LC01/03/04/06 ✓ 返回已测：LC05（AppShell 返回元素未中，环境限制）✓ 空态：封存板块不渲染=配置正确 ✓ 组件一致性：入口行图标/行高与帮助页联系行同构 ✓ 缺陷：MP-R1-LC-001（标题）、MP-R1-LC-002（尾部空白）。
- 覆盖核对（原文）：subpackages/tools/help/index：截图已看(A/B)✓ 理想图对照：无映射→品牌链 ✓ 点击已测：HP01/02/04/05/06/08/09 ✓ 返回已测：HP07（元素未中，环境限制）✓ 空态：未登录放行 HP09 ✓ 长文：FAQ 答案展开 HP02 行为断言（after 帧未落盘，如实记录）✓ 组件一致性：三联系入口图标底/复制胶囊同构 ✓ 历史回归：MP-R1-HELP-101 行为证实已修（HP06 剪贴板=真实邮箱）；遗留视觉缺口立案为 MP-R1-HELP-002。
- 覆盖核对（原文）：横向：① 编号与 code-findings/次要21.json（A2 代码层 15 项）零重叠：本审查 6 项均为其遗漏或仅作附带建议未立案者（NP-001 为其 people.vue「未发现新问题」的补漏；HELP-002 为其附带建议升级立案；LIK-005 为其未覆盖的数据排序面；LIK-006/LC-001/LC-002 为其扫描维度外视觉面）。② 交互判定归交互判定员：本审查对 exec-results 中 FAILED 行仅区分「页面缺陷」与「错误态/元素在 mock 不可触发」，未下交互结论。③ 品牌链注记：实现品牌绿 #36C99A（design-variables.scss:15 $brand-500=--c-brand）渲染像素精确命中；设计文档链内部不一致（v2 #34C38F / v3.1 契约 #34C98A / DESIGN_GUIDE.md:38 #34C38F），实现自成体系且全项目统一，不作为页面级缺陷。④ 未运行：真机/real 后端验证、错误态/封存商业态的视觉触发（mock 限制）。

| 观察 | 证据 |
|---|---|
| 头像链路修复的 mock 视觉证实：9 行头像全部渲染真实 mock 照片、无裂图（MP-R2-SEGMENT-001 已修复待终验的视觉佐证；real 模式仍需终验）。行布局 头像96rpx+昵称+在线徽标+学校·距离+chevron 与 nearby/likes 页行结构一致；在线徽标（绿点+文字 #36C99A 系）仅对 status=online 行渲染，与 isOnline() 逻辑一致。标题「细分发现 · 在线」与 SG01… | reports/screenshots/round-1-tour/A/subpackages_discover-extra_home_segment__默认.png + B 同名图；对照 segment.vue:149（resolveMediaUrl+DEFAULT_AVATAR… |
| 除 MP-R1-NP-001 头像塌陷外其余视觉面健康：顶部「附近的人/同城的人」双 Tab 高亮态清晰（激活态浅绿底+描边），行内 昵称+年龄+在线徽标 / 学校·距离 / 兴趣标签×3 三层信息层级分明，标签胶囊浅绿底绿字一致；列表排序在线组(1.2/2.1/2.4km)与离线组(0.5/1.6/3.4/3.5/4.2km)各自距离升序，符合「在线优先→距离」规则；下拉刷新已启用（NP07 行为通过）。 | reports/screenshots/round-1-tour/A\|B/subpackages_discover-extra_nearby_people__默认.png；np-rows-zoom.png（行结构 2x 放大）。 |
| 空态健康：统计栏 0/0/0（已浏览/已喜欢/已跳过）与 DH01 冷启动断言一致，不闪错误；铃铛空态图标+主文案「还没有浏览记录」+引导文案「快去寻觅页发现有趣的TA吧」层级正常；标题「今日已看」品牌绿字白底、返回圆钮白底绿箭头，无状态栏叠印。A/B 一致。 | reports/screenshots/round-1-tour/A\|B/subpackages_discover-extra_discover_history__默认.png。有记录态/挽回按钮未能在此构建触达（DH02-DH06 元素不存在，mock 无浏览记录所致），已如实… |
| 主列表视觉健康：搜索框 placeholder「搜索昵称、学校、城市」、三 Tab 胶囊（喜欢我的 22 / 我发出的喜欢 2 / 访客）徽标渲染正确；行内头像/已认证(绿)/未认证(粉)徽章/日期右对齐/chevron 一致（LK05 搜索、LK07 批量模式、LK14 下拉行为均 EXECUTED 佐证可交互）。缺陷见 MP-R1-LIK-005（时间序折返，跨窗口可见）与 MP-R1-LIK-006（心动信号图标缺失）。 | reports/screenshots/round-1-tour/A\|B/subpackages_discover-extra_likes_index__默认.png 及 滚动-中部/滚动-底部；lk-signal-zoom.png。 |
| 概览卡三数字（104 总访问量 / 5 今日访客 / 22 今日浏览量）与双 Tab（喜欢我的 22 / 我的访客 5）渲染正确；解锁/打码态在 mock 下全部按已解锁渲染（P0-17 契约），头像、日期 M/D、学校·年级·标签三层信息完整；fixed 解锁条在封存态不渲染（LV06 断言一致）。缺陷见 MP-R1-LIK-005（该页单帧即见乱序，为本问题主证据页）。 | reports/screenshots/round-1-tour/A\|B/subpackages_discover-extra_likes-visitors_index__默认.png 及 滚动-中部/滚动-底部。 |
| 锁定态视觉健康：绿色渐变头部（135deg --c-brand→--c-brand-300）白字标题、--statusbar 注入使「返回/每日一问」行位于状态栏之下无叠印（代码注释与渲染一致）；锁定卡「签到后解锁」+副文案+「去签到」CTA 居中，CTA 底色像素实测 #36c99a 与 --c-brand token 精确一致。A/B 一致。签到后解锁态经行为证据 DQ02（tap CTA→锁定卡消失→问题卡渲染）佐证可达，静态轮未… | reports/screenshots/round-1-tour/A\|B/subpackages_tools_daily-question_index__默认.png；dq-header-zoom.png；exec-results DQ01/DQ02/DQ04。 |
| 快捷入口行（定位图标+附近的人）、恋爱测试行（拼图图标+MBTI 人格测试）图标渲染正常、行高与点击热区充足；封存态下四板块与 consulting 入口不渲染（LC01 断言一致）。缺陷见 MP-R1-LC-001（标题「恋爱咨询」错位）与 MP-R1-LC-002（尾部空白滚动区）。三态（默认/滚动-中部/滚动-底部）A/B 均已逐张核对。 | reports/screenshots/round-1-tour/A\|B/subpackages_tools_love-center_index__默认.png 及 滚动-中部/滚动-底部。 |
| 页面结构健康：眉题「常见问题与联系我们」+大标题「帮助与客服」；FAQ 六项全部默认收起（HP01 断言一致），问题行字号层级与右 chevron 一致；联系我们三入口（在线客服/意见反馈/客服邮箱）图标底色圆角一致、复制胶囊浅绿底。底部服务说明文案在视口底部截断属正常滚动裁切（页可滚）。缺陷见 MP-R1-HELP-002（邮箱不可见）。FAQ 展开态未获静态帧（HP02 after 截图 automator 超时未落盘），仅行为断言… | reports/screenshots/round-1-tour/A\|B/subpackages_tools_help_index__默认.png；exec-results HP01/HP02/HP06。 |

### 次要22.json（—｜次要22（A3 / 视觉审查员：截图与证据的视觉/布局/状态审查）｜2026-09-24）

- 覆盖核对（原文）：subpackages/tools/security/index：截图已看（A/B×3 态共 6 张+放大件）；理想图无映射（如实声明）；滚动已测（tour 含滚动-中部/底部，发现叠印）；点击已测（interact 集过期不可采信，弹层态无有效截图=未覆盖项）；返回已测（默认态返回钮在位，滚动态随头部滚出=叠印问题一部分）；safe-area 已查（默认态头部让开状态栏，滚动态失守）；TabBar 已查（非 tab 页无 TabBar，正确）；空态已查（设备列表兜底单设备在位）；长文已查（副标题/描述均单行省略正常）；加载态已查（无骨架/ loading 残留）；错误态已查（无错误态截图，interact 集过期）；组件一致性已查（SectionCard/箭头/徽标与 settings 页菜单行同构）；历史 Bug 回归已查（无本页历史线索；代码层 LNEARBY-201 为本页头部几何，截图实证见 nearby 页）。列 Issue：SECURITY-301/302。
- 覆盖核对（原文）：subpackages/tools/search/index：截图已看（A/B 默认共 2 张+放大件）；理想图无映射；滚动已测（默认态无内容可滚，tour 未提供滚动态=覆盖缺口如实声明）；点击已测（interact 集过期不可采信）；返回已测（返回圆钮在位、「取消」键被胶囊裁切=SEARCH-301）；safe-area 已查（padding-bottom: env(safe-area-inset-bottom) 在码，:425-429）；TabBar 已查（非 tab 页，正确）；空态已查（空态插画+文案正常）；长文/加载/错误态未覆盖（无结果态截图）；组件一致性已查（页签胶囊与全站 tab 口径一致）；历史 Bug 回归已查（MP-R2-SEARCH-001 无结果态截图无法视觉复核，如实声明）。列 Issue：SEARCH-301。
- 覆盖核对（原文）：subpackages/tools/heart-signals/index：截图已看（A/B 默认 2 张+放大件）；理想图无映射；滚动已测（列表短无滚动态截图，代码层滚动容器问题已在代码层 HEARTSIGNALS-203 立案，不重复）；点击已测（interact 集过期不可采信）；返回已测（返回键在位且与过期集的 :absent 观察矛盾，佐证 MBTI-301）；safe-area 已查（头部 padding-top 让开状态栏）；TabBar 已查（非 tab 页，正确）；空态已查（本态有数据，空态未截图=未覆盖）；长文已查（文案单行正常）；加载态已查（无 loading 残留）；错误态已查（无错误态截图）；组件一致性已查（页签/卡片/按钮与全站绿色主 CTA 口径一致，接受钮=品牌绿、拒绝钮=中性灰）；历史 Bug 回归已查（无本页历史线索）。列 Issue：HEARTSIGNALS-301。
- 覆盖核对（原文）：subpackages/tools/activities/detail：截图已看（仅 B 默认 1 张+2 放大件）；理想图无映射；滚动已测（tour 无滚动态；interact AD07 已过期不可采信=未覆盖）；点击已测（interact 集过期=未覆盖）；返回已测（返回键在位，chevron 对比度偏低仅记录）；safe-area 已查（底部 footer 为白底 bar，未见小黑条压内容）；TabBar 已查（非 tab 页，正确）；空态/长文/加载/错误态未覆盖（单态截图）；组件一致性已查（导航绿带+白字标题与 mbti 头部同口径）；历史 Bug 回归已查（无本页历史线索；A 身份截图缺失=ACTDETAIL-301）。列 Issue：ACTDETAIL-301。
- 覆盖核对（原文）：subpackages/tools/love-center/nearby：截图已看（A/B 默认 2 张+2 放大件）；理想图无映射（附近的首页.png 为 pages/nearby 非本页）；滚动已测（卡片浏览页无页级滚动）；点击已测（interact 集过期不可采信，NB03/04/05 的 tap 观察搁置）；返回已测（返回键在位；标题「附近的人」被胶囊遮挡=代码层 LNEARBY-201 的截图实证，不重复立案）；safe-area 已查（卡片下缘与操作钮区间距正常）；TabBar 已查（非 tab 页，正确）；空态已查（本态有数据，空态/看全部 CTA 未截图=未覆盖）；长文已查（简介长文+展开链接在位）；加载态已查（无 loading 残留）；错误态已查（无错误态截图）；组件一致性已查（CardSwiper 与 discover 卡同组件）；历史 Bug 回归已查（MP-R1-LNEARBY-101 视觉无反证，行为终验待过期集重跑；LNEARBY-201 截图实证）。无新 Issue（问题均在代码层已立，本轮补截图证据）。
- 覆盖核对（原文）：subpackages/tools/love-center/mbti：截图已看（A/B 默认 2 张+放大件 2）；理想图无映射；滚动已测（tour 默认态外无滚动截图；interact MB08 已过期不可采信；代码层确认 content-scroll flex:1;height:0 定高链在位）；点击已测（interact 集过期不可采信）；返回已测（返回键左置与胶囊无相交——MP-R1-LMBTI-101 视觉闭环）；safe-area 已查（头部渐变带让开状态栏）；TabBar 已查（非 tab 页，正确）；空态已查（16 型网格+4 题在位无空缺）；长文已查（类型名/描述无溢出）；加载态已查（无 loading 残留）；错误态已查（无错误态截图）；组件一致性已查（绿色头部与全站 Hero 口径一致）；历史 Bug 回归已查（LMBTI-101 闭环）。列 Issue：MBTI-301（证据集失真，波及全集）。
- 覆盖核对（原文）：subpackages/tools/love-center/consulting：截图已看（A/B 默认 2 张）；理想图无映射；滚动已测（封存态页面短于视口无滚动）；点击已测（封存态唯一可点为返回，interact 集过期不可采信）；返回已测（返回胶囊钮在位）；safe-area 已查（头部让开状态栏）；TabBar 已查（非 tab 页，正确）；空态已查（封存态即本页唯一态，锁卡文案完整）；长文已查（无长文）；加载/错误态已查（无残留）；组件一致性已查（大标题+卡片与 security 头部口径一致）；历史 Bug 回归已查（MP-R1-CONSULTING-001 封存口径代码层在位，视觉吻合）。无 Issue。
- 覆盖核对（原文）：subpackages/profile-extra/settings/index：截图已看（A/B×3 态共 6 张+放大件 3）；理想图无映射；滚动已测（滚动-中部/底部均审，发现叠印 SETTINGS-301）；点击已测（interact 集过期不可采信，「推荐给好友」死入口已在代码层 SETTINGS-201 立案不重复）；返回已测（nav-bar 返回键在位，滚动态滚出=301 一部分）；safe-area 已查（safe-top 占位静态有效、滚动失守）；TabBar 已查（非 tab 页，正确）；空态已查（菜单全量渲染无空组）；长文已查（菜单文案无溢出）；加载/错误态已查（无残留/无错误态截图）；组件一致性已查（menu 行/图标/箭头/switch 与全站口径一致；页脚版本=SETTINGS-302）；历史 Bug 回归已查（MP-R2-SETTINGS-001 重复隐私入口已删视觉吻合；MP-R1-SETTINGS-003 我的动态语义修正未在截图直接可见，代码层口径维持）。列 Issue：SETTINGS-301/302。

| 观察 | 证据 |
|---|---|
| A/B 双身份 默认/滚动-中部/滚动-底部 共 6 张逐一已看：默认态头部（返回胶囊钮+眉题+大标题）、账号安全/第三方绑定/登录设备/隐私保护四卡片、危险操作注销行渲染完整，微信/Apple 绑定行图标与徽标正常，未发现空态/长文/加载态异常；滚动态发现状态栏叠印（已立 SECURITY-301）与设备行文案重复（SECURITY-302）。三个写操作弹层（换手机号/改密/注销）在本轮任何截图中均未出现（interact 集 SC0… | reports/screenshots/round-1-tour/{A,B}/subpackages_tools_security_index__默认.png 等 6 张；v22-security-scrolltop.png；interact 集 SC 条目仅文本证据 repor… |
| A/B 默认态 2 张已看：搜索条（返回圆钮+放大镜+占位文案）、「用户/标签/学校」三页签（用户态绿色胶囊高亮）、空态放大镜插画+引导文案渲染正常，无热搜/历史（空数据符合默认态）；发现「取消」被胶囊裁切（已立 SEARCH-301）。本轮无输入后/结果态截图（interact 集 SE03/SE10 输入动作无截图产出），结果列表/校园分组视觉表现未覆盖；MP-R2-SEARCH-001（头像裸路径）因无结果态截图无法视觉复核，维持… | reports/screenshots/round-1-tour/{A,B}/subpackages_tools_search_index__默认.png；v22-search-rightedge.png；exec-results.json SE 条目 |
| A/B 默认态 2 张已看：粉色渐变头部+返回键、「待处理(2)/已接受/已拒绝」页签、信号卡（头像/昵称/倒计时标签/心动文案/拒绝+接受按钮/倒计时进度条）渲染完整；tour 截图中返回键清晰存在，与过期 interact 集的 .page-header__back:absent 观察矛盾（佐证 MBTI-301 证据失真）；发现已过期信号仍带激活 CTA（已立 HEARTSIGNALS-301）。TabBar 无（非 tab 页）… | reports/screenshots/round-1-tour/{A,B}/subpackages_tools_heart-signals_index__默认.png；v22-hs-card1.png |
| 仅 B 默认态 1 张已看：绿色导航（白字「活动详情」清晰、返回键半透明白圆内 chevron 对比度偏低——放大件目视可辨，属观感项不立案）、封面图+「报名中」角标、「新人礼遇」卡（时间/地点行）、活动介绍卡、底部「分享+立即报名」bar 渲染完整，封面与卡片间无裁切。A 身份无截图（已立 ACTDETAIL-301）。滚动/报名态视觉未覆盖（interact 集已判过期，AD07 的 scroll 证据不可靠）。 | reports/screenshots/round-1-tour/B/subpackages_tools_activities_detail__默认.png；v22-actdetail-nav.png、v22-actdetail-back.png |
| A/B 默认态 2 张已看：卡片浏览主体（遮罩卡「互为喜欢解锁头像」提示、????匿名昵称、21岁/北京大学/已认证徽标、距离/在线、兴趣标签、简介+展开、80% 匹配徽标、跳过/超级喜欢/喜欢三圆钮）渲染完整。截图实证代码层 MP-R1-LNEARBY-201：「附近的人」标题渲染于右上角胶囊正下方被其遮挡（4x 放大件 v22-nearby-topright.png，「附近的人」字形压在胶囊下缘）——不重复立案，证据补强。超级喜欢钮… | reports/screenshots/round-1-tour/{A,B}/subpackages_tools_love-center_nearby__默认.png；v22-nearby-topright.png、v22-nearby-actions.png；config/im… |
| A/B 默认态 2 张已看：固定绿色渐变头部、返回键位于标题左侧（4x 放大件核对：返回键+左对齐标题与胶囊无相交）——历史回归 MP-R1-LMBTI-101 经本轮 tour 截图目视闭环，与代码层「已修复待终验」一致；16 型速览网格（4 维度芯片+16 格）、简化测试 4 题选项、底部「提交并查看结果」按钮渲染完整，MBTI-03-after（interact）中 3 题选中态高亮亦正常，但该集整体已判过期（MBTI-301）。… | reports/screenshots/round-1-tour/{A,B}/subpackages_tools_love-center_mbti__默认.png；v22-mbti-top.png；对照 v22-mbti-interact-header.png |
| A/B 默认态 2 张已看：封存态一致——「返回」胶囊钮+「恋爱咨询课程」大标题+锁形插画「功能封存中/该功能暂未开放，开放时间将另行通知」卡片，与代码层 commerceSealed 缺省封存口径一致；无多余入口、无残缺文案。页面短无滚动、无 TabBar、无空态异常。interact 集 CONSULTING-01~07R 截图因证据集过期未采信。 | reports/screenshots/round-1-tour/{A,B}/subpackages_tools_love-center_consulting__默认.png |
| A/B 双身份 默认/滚动-中部/滚动-底部 共 6 张逐一已看：默认态 nav-bar（‹+居中「设置」）、帮助/账号管理/社交资产/通知设置四组菜单（图标、箭头、本周安排与深色模式 switch 关态）渲染完整；滚动态发现状态栏叠印（已立 SETTINGS-301）；页脚「校园恋爱 v1.0.0」版本硬编码（已立 SETTINGS-302）；「关于」组含 用户协议/隐私政策/检查更新/关于我们，无重复隐私入口（MP-R2-SETTI… | reports/screenshots/round-1-tour/{A,B}/subpackages_profile-extra_settings_index__默认.png 等 6 张；v22-settings-scrolltop.png、v22-settings-footer… |
| 证据缓存校验：screenshot-manifest.json gitSha=aefd8a72 与 HEAD 一致，27 张本批截图逐一在盘（stat 核验大小非 0）——任务书「本批没有静态截图」前提被证据推翻，缺截图仅 activities/detail A 身份一项真实成立；exec-results.json 的 gitSha 指纹与其实际截图内容不符（过期构建），该集按规则全部按过期处理。ideal 图核对：素材/理想效果图/ … | reports/audit/round-1/screenshot-manifest.json（gitSha 字段 + 本批 27 条 shots）；ls 素材/理想效果图/ 输出；exec-results.json gitSha 字段 vs v22-mbti-interact-h… |

### 次要23.json（—｜视觉审查员-R1-次要23｜2026-09-24）

- 覆盖核对（原文）：证据校验：screenshot-manifest.json gitSha=aefd8a72 == 当前 HEAD aefd8a72f2231e8df7affd09004c14c3e4e73745；exec-results.json gitSha 同值——全部证据未过期。
- 覆盖核对（原文）：审查方式：B 轮 8 页 17 张静态截图逐张审查 + A 轮同位截图交叉复现（所有 P2 级发现均双轮复现）+ 10 张本地裁切放大图（reports/audit/round-1/tmp-a3/）+ 关键疑点像素采样 + 交互轮 wxml 快照/console 日志比对 + 理想图他人显示主页.png L1-L3 对照。未运行应用（本轮为截图/证据审查，非运行轮）；点击/返回/滚动行为以双轮截图序列与 exec-results.json 为据。
- 覆盖核对（原文）：verification/index：截图已看(4 态×2 轮)/理想图无对应稿(19 张无此页，如实标注)/滚动已测(滚动-中部+底部)/点击未直接测(exec VI 系列 6 FAILED 系自动化选择器问题，移交交互判定员)/safe-area 已查(默认态通过)/TabBar 不适用(push 页)/空态已查(=默认，表单页语义合理)/长文不适用/加载态已查(VI01 骨架)/错误态已查(exec)/组件一致性已查(权益图标空块=新发现)/历史回归已查(001 默认态通过)。
- 覆盖核对（原文）：verification/real-name：截图已看(3 态×2 轮)/滚动未单独截图(内容一屏内，如实标注)/键盘态已查(DevTools 不渲染键盘，输入值上屏证实)/空态已查(=默认)/safe-area 已查/TabBar 不适用/一致性已查(CHECK_CIRCLE=代码层 REAL-NAME-002 视觉证实)/历史回归已查(与 index 同构 safe-top 默认态通过)。
- 覆盖核对（原文）：profile/visitors：截图已看(3 态×2 轮)/滚动已测(中部+底部双轮)/空态已查(exec VS06 空态卡执行记录)/加载骨架已查(VS01)/返回已查(VS02/VS08)/safe-area 已查(默认态通过，滚动态叠印=新发现)/TabBar 不适用/头像兜底已查(全真头像，无兜底样本)/一致性已查/历史回归无本页线索。
- 覆盖核对（原文）：profile/other：截图已看(3 态×2 轮)/理想图已逐段对照(L1 结构/L2 信息层级/L3 CTA 位置，共同点区为有记录刻意偏离)/滚动已测/空缺参态已查(PO02 13KB 截图)/加载失败态未获样本(PO21 FAILED 自动化问题，如实标注)/照片查看层未获样本(PO15 FAILED)/历史回归三条全部核验(002 部分+003 项即 MP-R2-OTHER-001 通过)/分享 stub 与双入口(代码层 006B)不重复报。
- 覆盖核对（原文）：profile/location：截图已看(1 态×2 轮)/滚动不适用(一屏)/点击未直接测(LC02-04 FAILED 移交交互判定员)/safe-area 已查/TabBar 不适用/地图 marker 已查/一致性已查(绿钮/白钮层次与全仓按钮体系一致)。
- 覆盖核对（原文）：profile/privacy：截图已看(1 态×2 轮)/像素级采样已做(绿头连续性)/开关默认态已查(与 PV01 互证)/滚动不适用/一致性已查(=新发现 PRIVACY-101)/返回已查(PV06)。
- 覆盖核对（原文）：profile/album：截图已看(2 态×2 轮)/空态已查(发现证据缺口：空态从未渲染，md5 与默认相同)/滚动不适用(一屏)/safe-area 已查/胶囊安全距离已查(=新发现 ALBUM-101)/上传蒙层未获样本(AL02/AL04 FAILED 移交交互判定员)/AL08 超 10MB toast 与 AL09 取消选图交互轮已执行/一致性已查(空位虚线格与设为头像提示文案完整)。
- 覆盖核对（原文）：profile/favorites：截图已看(1 态×2 轮)/滚动不适用(2 条数据，FA06 记录 scrollPos=top)/空态未获样本(如实标注)/加载骨架已查(FA01)/取消收藏按钮样式已查/一致性已查(封面 160rpx SafeImage 正常=对照组)/历史回归无本页视觉线索。
- 覆盖核对（原文）：越界声明：功能目标对照未做（归需求对照员）；历史回归的代码级结论未重复推导（归历史回归员，本报告仅做视觉终验）；PO/VI/AL 系列 FAILED 用例的交互定性未展开（归交互判定员）；无问题页未声称「13 项全齐」——凡未能执行的检查项均在上述条目如实标注。
- 覆盖核对（原文）：遗留待办移交：① 巡检轮补拍相册真·空态（清空 photoGallery）；② OTHER-102 建议补拉一次完整态他人主页 wxml（现有 PO 快照均为错误态 882B）；③ SafeImage 若采纳 virtualHost 根治方案，须全仓回归头像/封面/空态图标四类调用点。

| 观察 | 证据 |
|---|---|
| 默认态导航干净：「恋爱认证」标题+返回键完整渲染于状态栏下方，无叠印——历史回归 MP-R1-VERIFY-INDEX-001（nav-bar 顶进状态栏）在默认态视觉终验通过（滚动态的叠印是另一问题，见 VERIFY-INDEX-101）。「空态」截图与「默认」md5 完全相同（a3b917950357b8e3c428d77fc90aaa88），该表单页默认即未认证态，语义上等同空态、不算证据缺口。黄色门控横幅内无警示图标=代码层 P… | reports/screenshots/round-1-tour/B/subpackages_profile-extra_verification_index__默认.png、__空态.png（md5 均为 a3b91795…）、__滚动-底部.png；exec-results.… |
| 页面渲染完整：状态卡（白圆 CHECK_CIRCLE 图标可见=原生 image 路径）+「未实名认证」+表单两字段+身份证正/反面两张上传卡+脱敏提示行+渐变提交钮，导航无状态栏叠印。「键盘弹起-输入后」截图输入值「巡检输入test123」已上屏但无键盘渲染（DevTools 自动化不渲染软键盘，非产品缺陷）；「空态」与「默认」md5 相同（5e272900…）同表单页语义合理。代码层 REAL-NAME-002（未认证态图标语义）在… | reports/screenshots/round-1-tour/B/subpackages_profile-extra_verification_real-name__默认.png、__键盘弹起-输入后.png；md5 校验输出 |
| 默认态正常：大标题「谁看过我」+「访客记录 · 22」计数、分组标签「更早」、10+ 张访客卡头像全部真实渲染（原生 image 固定类，对照组排除 SafeImage 全局塌陷）、姓名/学校/社团/时间戳排版整齐；计数文本距胶囊约 10px 未叠压（未达缺陷阈）。滚动后状态栏/胶囊叠印见 VISITORS-101。VS04 下拉刷新、VS06 空态卡在交互轮已执行。 | reports/screenshots/round-1-tour/B/subpackages_profile-extra_profile_visitors__默认.png（头部 2x 放大 reports/audit/round-1/tmp-a3/visitors-header-… |
| 三项历史回归终验：① MP-R2-OTHER-001（媒体裸直连）视觉通过——封面木纹大图、信息卡圆头像、生活瞬间四格、动态食物配图全部真实加载，无灰块/裂图；② MP-R1-OTHER-002（whisper 不可达）部分通过——心动卡按钮存在于固定底栏且与 like/message/follow 并列，但文字不可见致不可辨识（见 OTHER-101）；③ 他人主页无底部 Tab（push 进入）符合预期。信息结构 L1 对照理想图成… | reports/screenshots/round-1-tour/B/subpackages_profile-extra_profile_other__默认.png、__滚动-中部.png、__滚动-底部.png；素材/理想效果图/他人显示主页.png；PublicCommon.… |
| 渲染完整无新增视觉缺陷：定位卡（当前位置/南京·附近/经纬度）+腾讯地图真实渲染（道路/地标/注记清晰、marker 可见、右下角「腾讯地图 ©2025 Tencent」署名完整）+「地图选点」绿钮+「重新定位」「返回首页」双按钮层次清楚；导航无状态栏叠印。代码层 LOCATION-001（文案硬编码）/LOCATION-002（裸 rpx）为非视觉维度，本轮不重复举证。 | reports/screenshots/round-1-tour/B/subpackages_profile-extra_profile_location__默认.png |
| 两开关默认态与交互轮 PV01 记录一致（允许推荐=关、接收信息=开，绿色 switch 品牌色）——交互判定归交互判定员，此处仅记录视觉相符；像素采样证实绿色导航头连续覆盖状态栏区（y=5 起即 #37C99A），无白绿割裂；页面内容简单无滚动/裁切问题。跨页一致性偏差见 PRIVACY-101。 | reports/screenshots/round-1-tour/B/subpackages_profile-extra_profile_privacy__默认.png；像素采样（y=5/15/25/90 RGB 值）；exec-results.json PV01 |
| 照片墙渲染正常：4 张真实照片（原生 image）+2 个虚线空位+「+」占位、「添加照片」胶囊按钮、「长按照片可删除或设为头像」提示行，导航无状态栏叠印。重大证据缺口：「空态」截图与「默认」md5 完全相同（ab24a53dc84081b2f489d23a2fbcf09f）——manifest 标注的空态从未真正渲染（photoCount=0 的专用空态卡分支 album.vue:431-447 未被捕获），该空态内的代码层缺陷 PR… | reports/screenshots/round-1-tour/B/subpackages_profile-extra_profile_album__空态.png 与 __默认.png（md5 均为 ab24a53d…）；A 轮同页同象限（时钟 1:49 vs 3:48 证明为… |
| 渲染完整无新增视觉缺陷：标题行「我的收藏（2）」+两张收藏卡——封面图（SafeImage 160rpx 固定包裹层，渲染正常，进一步佐证「class+custom-class 双传/固定包裹」模式有效）、作者头像+昵称+学校、帖子标题+摘要、收藏人数、右下「取消收藏」描边按钮，间距对齐无裁切。代码层 FAVORITES-003（scroll-view 高度链断裂）在仅 2 条数据下无法视觉复现（无需内滚），留待长列表回归。FA01 记… | reports/screenshots/round-1-tour/B/subpackages_profile-extra_profile_favorites__默认.png |

### 次要24.json（—｜视觉审查员-R1-次要24（A3 截图与证据视觉/布局/状态审查）｜—）

- 覆盖核对（原文）：证据校验：screenshot-manifest.json gitSha=aefd8a72 与 HEAD 一致；本批 8 页 30 张 A/B 截图全部存在且生成于 aefd8a72 之后——任务书「本批无静态截图」前提不成立，未据其记 P1 缺截图，全部截图逐张审看。
- 覆盖核对（原文）：证据校验：interact/exec-results.json gitSha=aefd8a72 一致；本批 89 条结果（EXECUTED 72 / FAILED 17）已通读，FAILED 项逐条核对失败原因（多为候选选择器未命中/取证超时），其中视觉相关的旁证已纳入 observations；交互成败判定留予交互判定员。
- 覆盖核对（原文）：理想图对照：素材/理想效果图/ 19 张整页稿与本批 8 页无页面级映射（R11 已锚定稿均为首页/发现/匹配/圈子/村子/消息/登录类），L1-L10 整页对照不适用；对照依据为 v3.1 token 契约链（29a2b1df）与跨页组件一致性，已在各页 observation 注明。
- 覆盖核对（原文）：A/B 双身份一致性：15 对截图程序化像素比对（ImageChops），除状态栏时钟与输入值差异外全部结构一致；campus/setup-profile 差异 bbox 经 40 阈值复核均为时钟数字，无双身份渲染分歧。
- 覆盖核对（原文）：tasks：截图已看/A/B 一致/积分卡与任务文案逐字核对/图标像素级取证/跨页（hub、TagSelector）对照/交互截图复现（TASKS-02-after）/历史 MP-R1-TASKS-001（积分即时更新）不在本轮视觉可判范围——缺陷 1 项（P2 图标不可见）。
- 覆盖核对（原文）：dnd：截图已看/A/B 一致/默认+数据态/状态栏与安全区逐像素看/开关单选控件与 token 绿核对/文案重复取证/历史 MP-R1-DND-002 视觉终验通过（已验证）——缺陷 1 项（P3 tip 重复）+ 回归闭环 1 项。
- 覆盖核对（原文）：feedback/history：截图已看/A/B 一致/筛选 chips 三态中两态可见（激活/默认）/状态徽标放大取证/时间本地化格式核对/空态与错误态在本数据态不可达（如实注明）——缺陷 2 项（P3 徽标语义、P4 标题重复）。
- 覆盖核对（原文）：setup/profile：六态逐张看/A/B 一致/滚动三态已测（中部/底部）/键盘态输入验证/校验错误态证据缺口如实记录/保存按钮置灰合法性核对（formComplete + 置灰仍可点注释）/头像资产溯源到文件/与 MP-R1-SETUPPROFILE-001（代码层已报）去重——新增缺陷 2 项（P2 滚动叠印、P3 头像纹理）。
- 覆盖核对（原文）：setup/campus：截图已看/A/B 一致/步骤条与选择行核对/? 热区代码级取证/返回样式跨页对照/历史 MP-R1-SETUPCAMPUS-002（注释腐烂）为代码层不重复——新增缺陷 2 项（P4 热区、P4 向导返回一致性）。
- 覆盖核对（原文）：setup/schedule：默认+键盘态已看/A/B 一致/输入功能视觉验证/行语义标签缺失取证（截图+代码）/SC04-06 取证脚本问题不作为页面缺陷——新增缺陷 1 项（P4 无行标签）。
- 覆盖核对（原文）：setup/recommend-pref：截图已看/A/B 一致/步骤条/chips 选中态/开关 ON 态核对/文案重复取证——新增缺陷 1 项（P4 标题重复）。
- 覆盖核对（原文）：setup/interest：截图已看/A/B 一致/空态/标签图标渲染/无返回入口归 code-findings 不重复/13 项举证在 observation 列明（滚动/长文/加载/错误态在本页不适用或未触发，均已注明）——无新增缺陷。
- 覆盖核对（原文）：未越界声明：交互成败判定（TK02 签到后状态未变、EP04/08 tap 超时、TK07 返回钮未找到等）仅以旁证记录并留予交互判定员；功能目标对照未做；历史回归除 MP-R1-DND-002（任务书指定）外未展开。
- 覆盖核对（原文）：未运行项：未运行构建/测试/模拟器复拍（A3 只读证据审查角色）；「校验错误」与「键盘弹起」两态的系统级表现（错误 UI、软键盘遮蔽）无有效截图证据，未据其下结论。

| 观察 | 证据 |
|---|---|
| 布局与文案渲染正确：状态栏无叠印，导航行=圆形返回钮+「任务中心」+「0/4 已完成」，积分卡「累计获得 0 积分 / 0%」带灰轨道进度条，4 个任务项（完善个人资料+50/每日签到+5/发布首条动态+20/完成校园认证+100）标题、副文案、绿色「去完成」胶囊齐全；A/B 像素比对仅状态栏时钟差异（结构一致）。缺陷：4 个任务图标不可见（MP-R1-TASKS-007）。交互旁证（判定归交互判定员）：TK02 after 截图与 w… | reports/screenshots/round-1-tour/A\|B/subpackages_profile-extra_profile_tasks__默认.png；reports/screenshots/round-1-interact/TASKS-02-after.png… |
| 三态渲染正确：开关卡（开启免打扰+说明）、当前状态已关闭、免打扰时段 22:00/08:00 绿色数值、重复方式单选（每天选中绿点）、紧急消息开关 ON 绿色、保存按钮品牌绿；MP-R1-DND-002 视觉终验通过（状态栏无叠印）；「数据态」与「默认」像素一致（mock 默认回显相同，无差异可判）；A/B 结构一致。缺陷：tip 文案重复（MP-R1-DND-003）。 | reports/screenshots/round-1-tour/A\|B/subpackages_profile-extra_settings_dnd__默认.png、__数据态.png |
| 渲染正确：返回胶囊低于状态栏、页头标题+说明、筛选 chips（全部=绿色激活实底，反馈/建议/活动提案=白底描边）、记录卡（标题/状态徽标/回复摘要/本地化时间 2026/05/18 09:18/查看详情绿链）；A/B 结构一致。缺陷：× 处理中徽标语义（MP-R1-FEEDBACKHIST-004）、卡题与页题重复（MP-R1-FEEDBACKHIST-005）。附：FH06/FH07 因附件图/错误卡元素不存在而 FAILED——… | reports/screenshots/round-1-tour/A\|B/subpackages_profile-extra_feedback_history__默认.png；reports/audit/round-1/tmp-a3/tmp_fh_card_zoom.png |
| 六态逐张审看：hero 渐变+吉祥物插画+XUNMI·CAMPUS 眉题渲染佳；步骤条 1/4（基本信息激活绿）；照片墙 4 填 2 空+删除角标+加号槽正确；基础信息/基本资料/身份单选（在校学生选中绿框）正常；A/B 六态结构一致（像素比对仅时钟+输入值差异）。键盘态输入成功（昵称变「巡检输入test123」）但 DevTools 模拟器不渲染软键盘（工具行为，非页面缺陷）；「校验错误」态截图与默认无可见差异——错误 UI 未被捕获… | reports/screenshots/round-1-tour/A\|B/subpackages_setup_profile_index__默认/数据态/校验错误/滚动-中部/滚动-底部/键盘弹起-输入后.png；reports/audit/round-1/tmp-a3/tmp_… |
| 渲染正确：返回胶囊、步骤条 2/4（步骤1绿✓、步骤2激活、3/4灰）、学校资料三行带值（北京/北京大学/工业设计）+右侧箭头、保密说明卡、非学生跳过链接、绿色「保存并继续」；无状态栏叠印；A/B 结构一致。缺陷：? 帮助钮 40rpx 热区（MP-R1-SETUPCAMPUS-003）、向导返回控件不一致（MP-R1-SETUPCAMPUS-004）。 | reports/screenshots/round-1-tour/A\|B/subpackages_setup_campus_index__默认.png |
| 渲染正确：返回胶囊、页头说明「这里会驱动首页『叮』推荐和可聊时间段。」、时间安排标题、偏好设置卡三行输入+×删除钮、+添加时段虚线钮、绿色「保存并进入应用」；键盘态首行输入成功（巡检输入test123；DevTools 无软键盘渲染）；无状态栏叠印；A/B 结构一致。缺陷：三行无字段标签（MP-R1-SETUPSCHEDULE-002）。SC04-06 候选元素未命中属取证脚本选择器问题，无页面缺陷证据。 | reports/screenshots/round-1-tour/A\|B/subpackages_setup_schedule_index__默认.png、__键盘弹起-输入后.png |
| 渲染正确：返回胶囊、步骤条 3/4（1✓2✓3激活4灰）、推荐时间 chips（12:00 绿色描边选中）、推荐范围 chips（同校优先选中）、校园优先开关 ON 绿色、绿色保存；无状态栏叠印；A/B 结构一致（除时钟外仅步骤高亮微差）。缺陷：卡题与行标签重复（MP-R1-SETUPPREF-002）。 | reports/screenshots/round-1-tour/A\|B/subpackages_setup_recommend-pref_index__默认.png；reports/audit/round-1/tmp-a3/tmp_pref_steps_2x.png |
| 渲染正确：标题选择兴趣+说明（至少 3 个）、选择你的标签卡、已选标签空态（已选 0/5+「暂未选择任何标签」浅绿占位）、10 个带图标标签 chips（阅读/运动/音乐/电影/旅行/摄影/游戏/美食/生活/舞蹈，图标经普通 <image> 全部可见——旁证任务页图标缺失非全局渲染问题）、完成选择绿色主按钮；无状态栏叠印；A/B 结构一致。无新增缺陷：无返回入口已由 code-findings MP-R1-SETUPINTEREST-0… | reports/screenshots/round-1-tour/A\|B/subpackages_setup_interest_index__默认.png |

### 次要25.json（—｜视觉审查员-R1-次要25（A3 截图与证据的视觉/布局/状态审查）｜—）

- 覆盖核对（原文）：{"page":"subpackages/setup/dev/index","checks":"13 项举证不适用：本页无任何本轮有效视觉证据（截图已看=无、理想图已对照=无本页理想稿、滚动/点击/返回/空态/长文/加载/错误态均因页面未注册不可达）。按「观察证据制」如实产出不可达观察，不判无问题、不编造缺陷；13 项中仅「历史 Bug 回归」可间接确认（DEV 页相关缺陷已由代码审查员 DEV-001/002/003 记录）。证据缺口已上报（showcase/dev 双页静态+交互证据缺失）。","verdict":"无视觉证据，不判定"}
- 覆盖核对（原文）：{"page":"subpackages/setup/showcase/index","checks":"同 dev：13 项举证不适用（页面本体未渲染过任何一张本轮截图；四张交互截图内容均为回落后的发现页）。回落守卫行为本身已验证通过（SC02）。页面本体视觉维度零证据，不判定；不使用 r10/r11 旧轮截图（过期证据）。","verdict":"无视觉证据，不判定"}
- 覆盖核对（原文）：{"page":"subpackages/support/feedback/index","checks":"截图已看（tour A×4+interact×3）✓；理想图已对照=无本页理想稿（19 张无对应）如实记录 ✓；滚动已测（中部/底部两态截图）✓；键盘=devtools 不渲染软键盘，输入回显已核 ✓；空态已查（历史区占位文案）✓；长文已查（maxlength=5000 代码层+FB05 条目）✓；加载态=store onMounted 加载无独立骨架（轻页可接受，记录）；错误态=上传失败 toast 代码在位、无视觉证据如实标注；safe-area=滚动态叠印已报 P2；TabBar=show-tab-bar=false 正确无预留遮挡 ✓；组件一致性已查（SectionCard/chip/StatusState 与 discussions 同源）✓；历史 Bug 回归归历史回归员。发现缺陷 3 条（1 共享叠印+1 本页 placeholder+1 共享图标）。","verdict":"有缺陷，已报"}
- 覆盖核对（原文）：{"page":"subpackages/discover/discussions/index","checks":"截图已看（默认态；无滚动态——内容一屏内）✓；理想图=无本页理想稿 ✓；点击/返回归交互判定员；空态/加载/错误三态代码在位但无有效视觉证据（DISCUSSIONS-01-before 实为 feedback 页，如实标注）⚠；safe-area/TabBar=代码层已由 DISCUSSIONS-001 覆盖；组件一致性已查（SectionCard/BottomActionBar/StatusState）✓。发现缺陷 1 条（共享图标语义）。","verdict":"有缺陷，已报"}
- 覆盖核对（原文）：{"page":"subpackages/discover/activities/index","checks":"截图已看（tour×3+interact×7）✓；滚动已测（默认/中部/底部）✓；空态/日历/错误态三态截图 capture timeout 无有效视觉证据，不据其下结论 ⚠；长文=卡片文案均短、无截断 ✓；加载态=下拉刷新 TTL 行为 ACT09 EXECUTED（视觉无独立 loading 截图）⚠；safe-area=滚动态叠印已并入 P2；TabBar=show-tab-bar=false ✓；一致性=卡片结构 4 张逐一对齐、按钮双态对比清晰 ✓。发现缺陷 1 条（共享叠印）。","verdict":"有缺陷，已报"}
- 覆盖核对（原文）：{"page":"subpackages/legal/privacy/index","checks":"截图已看×3 ✓；滚动已测（PRI02 EXECUTED+两态截图）✓；长文已查（10 节完整渲染）✓；空态=不适用（长文页）；加载/错误态=LegalTextPage 内置 spinner/重试代码在位、无视觉证据如实标注 ⚠；safe-area=滚动态叠印已报；点击/返回=「我已阅读」落点归交互判定员（PRI03 FAILED 在案）；一致性=与 agreement 同构 ✓。观察项 2 条（占位热线、双标题）不计缺陷。","verdict":"共享缺陷已报（叠印）"}
- 覆盖核对（原文）：{"page":"subpackages/legal/agreement/index","checks":"截图已看×2（A 侧缺滚动-中部态，B 侧三态——A 证据覆盖不全如实记录）⚠；滚动已测（底部态+AGR02）✓；长文已查（11 节完整）✓；safe-area=滚动态叠印并入 P2；一致性=与 privacy 完全同构 ✓；其余同 privacy。","verdict":"共享缺陷已报（叠印）"}
- 覆盖核对（原文）：{"page":"subpackages/market/detail/index","checks":"截图已看（封存态默认图+MD01/MD04 交互图）✓；空态已查（notFound 态视觉+文案缺陷已报）✓；错误态=notFound/sealed 两态有视觉证据、loading/error 态无截图（如实标注）⚠；滚动=封存态无内容滚动、未封存态 scroll-view 无视觉证据 ⚠；safe-area=封存/空态居中布局无遮挡；未封存态购买栏 fixed+160rpx 留白仅代码层确认（代码审查员已核）；一致性=导航样式与 AppShell 页差异记为观察；图片 fallback 链（halfBodyPhotoUrl→photoGallery→avatarUrl→默认）不适用本页（商品图走 SafeImage，未封存态无视觉证据）⚠。发现缺陷 2 条。","verdict":"有缺陷，已报"}

| 观察 | 证据 |
|---|---|
| 本页在本轮全部证据中从未渲染：静态巡检 manifest（305 张，gitSha=aefd8a72）0 条目；交互 10 用例（DEV01-10）观测点全部停在 subpackages/setup/interest/index（DEV01 observed：top=interest \| navError=Uncaught [object Object]，DEV02-06 均 action-not-performed）；SETUPDEV… | reports/audit/round-1/screenshot-manifest.json（setup/dev 0 hits）；reports/audit/round-1/interact/exec-results.json DEV01-10；reports/screensho… |
| ask 指定的静态截图 subpackages_setup_showcase_index__默认.png 在磁盘与 manifest 中均不存在（find 全树无 showcase/setup_dev 命中）；全部 round-1 交互证据中该页从未渲染——SC01/SC02 observed top=pages/discover/index（reLaunch 后被 onShow 回落），SHOWCASE-01-before/after… | reports/screenshots/round-1-interact/SHOWCASE-01-after.png 与 SC08-after.png（均为发现页内容）；exec-results.json SC01-SC08；screenshot-manifest.json se… |
| 4 张 tour A 截图逐张核对：首屏表单完整（类型 chip 三枚、选中态实底绿/未选中浅绿底对比清晰、标题/微信号 placeholder 正常、上传格+提交按钮齐全），历史区空态占位「提交反馈后將在此处显示」+「历史记录」入口可见，列表项标题/摘要/时间戳/状态标签排版整齐无截断；键盘弹起-输入后截图标题回显「巡检输入test123」正常（devtools 不渲染软键盘属模拟器行为，cursor-spacing=20 已配置）；… | reports/screenshots/round-1-tour/A/subpackages_support_feedback_index__默认.png、__滚动-中部.png、__滚动-底部.png、__键盘弹起-输入后.png；reports/screenshots/rou… |
| 默认态截图核对：页面头部（返回/标语/标题）正确偏移状态栏下方；「正在讨论」卡两条话题（标题+摘要+热度标签）与「下一步」卡（反馈讨论建议/去寻觅双按钮）渲染完整，内容一屏内无滚动，故无滚动态截图可查叠印（该页 AppShell 未传 show-tab-bar=false 的底部留白已由代码审查员 DISCUSSIONS-001 覆盖）；热度标签 × 前缀语义错位记为 MP-R1-DISCUSSIONS-101。加载骨架（Skeleto… | reports/screenshots/round-1-tour/A/subpackages_discover_discussions_index__默认.png；discussions/index.vue:76-101（三态与标签绑定）；exec-results.json DC… |
| 默认+滚动-中部+滚动-底部 3 张 tour 截图与 ACT03/05/06/07/09/10/14 交互截图核对：列表 4 张活动卡信息层级一致（标题/已报名计数/简介/地点行/时间行/报名按钮），「感兴趣」（描边）与「已感兴趣」（浅绿实底）双态对比清晰，「没有更多活动了」收尾提示正常，「下一步」卡双按钮齐全；滚动态列表/日历切换胶囊滚入状态栏区（→MP-R1-APPSHELL-101）。日历视图、今天筛选空态、首拉错误态三态均无有… | reports/screenshots/round-1-tour/A/subpackages_discover_activities_index__默认.png、__滚动-中部.png、__滚动-底部.png；round-1-interact/SUBPACKAGES-DISCOV… |
| 3 张截图逐张核对：fallback 正文完整渲染 10 节（信息收集/使用/共享/存储/用户权利/Cookie/第三方 SDK/未成年人/更新/联系），长文排版行高正常无截断（PRI02 滚动到底/顶 EXECUTED 佐证滚动可达）；卡片头含版本 pill 与「最后更新」双日期；底部「我已阅读并同意」按钮在滚动态常驻可见。观察项（不计缺陷）：① fallback 文案含占位客服热线「400-xxx-xxxx」与示例邮箱 campus… | reports/screenshots/round-1-tour/A/subpackages_legal_privacy_index__默认.png、__滚动-中部.png、__滚动-底部.png；LegalTextPage.vue:160-231（结构）；exec-result… |
| 默认+滚动-底部 2 张截图核对：与 privacy 同构（LegalTextPage 复用），正文 11 节完整、版本/更新日期、底部接受按钮常驻、滚动态同样存在状态栏叠印（并入 MP-R1-APPSHELL-101）。tour A 目录缺「滚动-中部」状态（manifest 中 B 身份有 3 态、A 仅 2 态），A 证据覆盖不全如实记录；同属 fallback 文案的占位热线观察项与 privacy 相同。 | reports/screenshots/round-1-tour/A/subpackages_legal_agreement_index__默认.png、__滚动-底部.png；screenshot-manifest.json（A 侧 agreement 仅 默认/滚动-底部 两… |
| 封存态默认图（MD01 EXECUTED 佐证 .sealed:present）与 MD04 交互截图（notFound 态）逐项核对：两态均为居中图标+主标题+副标题+主按钮的干净布局，页面无内容滚动故无叠印问题；导航栏（白底、居中标题「商品详情」、左圆 chevron）与本组 AppShell 页的「←返回」pill 是两种导航样式——属不同页面语境的形态差异，记录为观察不计缺陷。发现的缺陷：notFound 副标题恒为兜底文案（:… | reports/screenshots/round-1-tour/A/subpackages_market_detail_index__默认.png（封存态）；reports/screenshots/round-1-interact/SUBPACKAGES-MARKET-DETA… |

### 次要26.json（—｜视觉审查员-R1-次要26（A3 截图与证据的视觉/布局/状态审查）｜—）

- 覆盖核对（原文）：{"subpackages_market_shop_index":"截图已看（A/B 默认 + SH06-after 共 3 张）；理想图已对照——19 张理想稿中无商城/逛逛对应页面（已列目录核实），L1-L10 逐层对照无参照系，如实标注缺参照而非硬比；滚动——封存态内容单屏以内无滚动需求（未单测滚动，如实记录）；点击/返回已测（SH03 栈>1、SH04 栈=1 兜底均 EXECUTED，本席未复跑）；safe-area 已查（截图无状态栏叠印）；TabBar 已查（非 tab 页无 TabBar 正确）；空态已查（SH01 断言封存态无空态闪现）；长文/加载态/错误态——封存态替代业务态，SH06 无 loading 残留；组件一致性已查（封存卡与 wallet 同构、返回键与 wallet 异构已报 MP-R1-MARKET-022）；历史 Bug 回归归历史回归员，未越界。","subpackages_market_wallet_index":"截图已看（A/B 默认 + WA05-after + WA07-before 共 4 张）；理想图无对应稿（同上如实标注）；滚动——封存态单屏内；点击/返回已测（WA03/WA04 EXECUTED）；safe-area 已查（绿底延伸至状态栏、黑字无叠印，pages.json:39 全局 black 与截图一致）；TabBar 已查（无，正确）；空态已查（WA01）；加载/错误态——封存态替代；组件一致性已查（封存卡同构、返回键弱可视已报 MP-R1-WALLET-021）；历史回归不越界。","subpackages_vip_index":"13 项举证无法完成：页面本体在当前构建不可达（flag=false 拦截），无静态截图（任务清单所列路径不存在）、无解封态截图（预案注入失败）、无滚动/点击/空态/加载/错误态任何可视化证据——本页不作「无问题」判定，如实记为零证据待补取证。已完成的核对：拦截行为与 i18n 文案一致（exec toast 记录）、弹回落点为 profile tab（VP01-after 截图内容证实）。","subpackages_vip_promo-code":"同 vip/index：零视觉证据，13 项举证无法完成，不作「无问题」判定；已核对拦截 Toast 文案与弹回落点（PC01/PC02 + PC06-after 内容为 profile 页）。","subpackages_vip_bills":"同 vip/index：零视觉证据，13 项举证无法完成，不作「无问题」判定；已核对拦截 Toast 文案与弹回落点（BI01/BI02），并确认 BI04 下拉刷新预案因 snippet 报错未触达页面（ERR uni is not defined）。","limitations":"本席为只读视觉审查：未自行构建、未驱动微信开发者工具复拍截图、未复跑交互用例；全部行为证据取自巡检产出 exec-results.json 与 screenshots 目录（gitSha=aefd8a72 与 HEAD 一致，未过期）。解封态（commerce.enabled=true / membershipEnabled=true）在本轮巡检中注入失败（input element not found: .enabled / .membershipEnabled），五页的业务态 UI（商品网格/余额流水/VIP 权益套餐/优惠码表单/账单列表）全无截图，属本轮取证缺口，建议下…

| 观察 | 证据 |
|---|---|
| 封存态渲染正确且双身份一致：A/B 两组默认截图均为浅绿渐变底 + 白圆 SVG chevron 返回键 + 44rpx 绿色左对齐标题「逛逛」，封存卡（锁形 SVG 图标 + 「功能封存中」+ 「该功能暂未开放，开放时间将另行通知」）位于顶部白卡，卡下方留白干净，无错误空态闪现、无 loading 残留、无状态栏叠印；非 tab 页无 TabBar 属正确表现；SH01 dom 断言 .shop-sealed:present 且积分条… | reports/screenshots/round-1-tour/A/subpackages_market_shop_index__默认.png; reports/screenshots/round-1-tour/B/subpackages_market_shop_index__… |
| 封存态渲染正确且双身份一致：绿色渐变沉浸式导航（状态栏区域同为绿底，状态栏黑字无叠印、可读）+ 居中反白 34rpx 标题「我的钱包」，封存卡内容与 shop 完全同构（同锁图标同文案），无空态/错误闪现；WA01 dom 断言封存卡 present 且余额卡/充值/流水 absent，WA02 确认封存态零请求，与截图互证。缺陷侧：返回键可视性弱（MP-R1-WALLET-021）、热区 64rpx（MP-R1-MARKET-020）… | reports/screenshots/round-1-tour/A/subpackages_market_wallet_index__默认.png; reports/screenshots/round-1-tour/B/subpackages_market_wallet_ind… |
| 当前构建下页面本体不可达、零视觉证据：membershipEnabled=false 时进入即 Toast「会员功能暂未开放」并自动弹回「我的」tab（exec-results.json VP01/VP02/VP03 三次拦截均有 showToast 记录；VP01-after 截图实际内容为 pages/profile/index，不是 vip 页）；任务清单所列静态截图 reports/screenshots/round-1-tou… | exec-results.json VP01-VP12（toast 数组均含「会员功能暂未开放」）；reports/screenshots/round-1-interact/SUBPACKAGES-VIP-INDEX-VP01-after.png（内容为 profile 页）；m… |
| 与 vip/index 同因不可达、零视觉证据：PC01/PC02 冷启动与有栈进入均被 Toast「会员功能暂未开放」+ 弹回拦截；PC03-PC09 全部预案 FAILED（pre-FAIL input element not found / 元素 absent）；PC06-after 截图实际内容为 pages/profile/index。表单、结果卡、兑换按钮等全部 UI 无截图可审，四维无法审查（非「无问题」）。代码层已有 M… | exec-results.json PC01-PC09；reports/screenshots/round-1-interact/SUBPACKAGES-VIP-PROMO-CODE-PC06-after.png（内容为 profile 页）；manifest 无 promo-c… |
| 与 vip/index 同因不可达、零视觉证据：BI01/BI02 均拦截弹回；BI03-08 预案失败（BI04 的 pullDown snippet 报 ERR uni is not defined，未执行到页面）；BI03-after/BI04-after/BI05-after 截图内容均非账单页。账单列表、筛选 chips、账单卡样式无截图可审，四维无法审查（非「无问题」）。行为侧 BI03 用例标题已自记「onShow 误嵌缺… | exec-results.json BI01-BI08；reports/screenshots/round-1-interact/SUBPACKAGES-VIP-BILLS-BI03-after.png；manifest 无 bills 条目 |
- 证据时效（原文）：git rev-parse --short HEAD = aefd8a72，与 screenshot-manifest.json.gitSha 一致，本轮全部证据未过期。

## 五、边界声明与证据缺口（如实汇总）

以下为各来源文件自带的边界/缺口声明，书记员逐条摘录未改写：

- **PAGES-LOGIN-INDEX-judge.json**（pages/login/index）：无法验证 15 条。主因摘要：LG11|复跑批表单不可达（mock 已登录自动前进 discover，.btn-phone-quick/#login-phone/.checkbox 均未找到）致动作未执行；op 批亦未覆盖「未勾选协议+表单提交」组合|2；LG12|后端对测试号微信 code 恒返 502（curl+console 双证），成功路径前置无法构造；失败分支行为已由 LG13 单独验证|1；LG16|个人测试号 getPhoneNumber 仅返回失败回调（DevTools 平台限制），授权成功→401 兜底链路无法自动化触发|2
- **PAGES-REGISTER-INDEX-judge.json**（pages/register/index）：无法验证 26 条。主因摘要：REG02|动作被替换为直呼 navigateTo，登录页「去注册」入口 tap 未执行（同批次 LG31 该入口 element not found）|1；REG03|页面上下文丢失：先行 navigateBack 后 tap .hero__back element not found，终态路由漂移 [discover]|1；REG04|tap 已执行但终态 route 仍 [register] 与 dom 全 absent 自相矛盾（疑似快照竞态/句柄失效）|1
- **PAGES-REGISTER-SUCCESS-judge.json**（pages/register/success）：无法验证 10 条。主因摘要：RS01|要求的首帧+2s复拍双拍截图均 ERROR:timeout waiting for automator response 文件未产出，卡死检测未完成|1；RS02|脱敏 tag 文本无本轮截图/DOM 双证据（截图超时），act (param-map) 后缀语义无法对证（本页不在 r11-param-map.json）|1；RS03|三个非法变体仅执行 1 次无参 reLaunch，变体执行与截图证据全缺|1
- **PAGES-HOME-INDEX-judge.json**（pages/home/index）：无法验证 32 条。主因摘要：H01|落点证据被下一用例显式 pre:reLaunch 覆盖，自身稳定采样窗内未见跳转且无截图|1；H04|角标数值未记录、after 截图采集失败(timeout)，0/>99 态未构造（截图放大角标=「6」，代码绑定真实未读数，来源待核）|1；H07|执行时页面被 H06 落点 profile/other 占用，目标元素不在当前页（wxml 证实按钮存在）|1
- **PAGES-NEARBY-INDEX-judge.json**（pages/nearby/index）：无法验证 41 条。主因摘要：N03|tap 已送达但终栈无 village/post 路由证据，通道/页面态不稳（N08 对照证明同族 tap 可导航）|1；N04|×5 快击未执行（act 仅 1 次 tap），防连点语义零证据|1；N05|input 已送达但 confirm 未触发、搜索页未入栈、截图丢失|1
- **PAGES-DISCOVER-INDEX-judge.json**（pages/discover/index）：无法验证 34 条。主因摘要：DC01|A1 after 截图 saveFile 超限失败，登录胶囊避让浮岛与骨架消失断言无视觉/时序证据（dom/console 已证卡片渲染无报错）|1；DC02|登录注入前置未执行（observed 无 login 步骤），页面停留游客态（.discover-login-hint:present），登录态断言全部未验|1；DC05|automator navError（getPageMetaByWebviewId null）页面栈崩溃+login $vm 读取失败，空筛选未制造（after 截图无空态）|1
- **PAGES-MESSAGES-INDEX-judge.json**（pages/messages/index）：无法验证 23 条。主因摘要：MSG01|未登录前置在存活进程未生效（storageRemove 后 in-memory 会话仍在，NotLoggedWaiting 未渲染），截图通道超时无视觉证据，产品/通道归因不明|1；MSG02|同 MSG01 前置未建立，.not-logged__btn--primary 不存在，tap 未执行|1；MSG03|同 MSG01 前置未建立，.not-logged__btn--secondary 不存在，死按钮修复回归未能复跑（模板绑定仅代码层旁证）|1
- **PAGES-PROFILE-INDEX-judge.json**（pages/profile/index）：无法验证 46 条。主因摘要：PFI02|导航落点无采证（exec route/observed 均为动作前快照，post-action 无证据）|1；PFI03|落点无采证+窗口内 Vue Error runtime-2 归因不明|1；PFI04|落点无采证+窗口内 navigateTo:fail timeout（通道拥塞与产品缺陷不可区分）|1
- **SUBPACKAGES-VILLAGE-VILLAGE-INDEX-judge.json**（subpackages/village/village/index）：无法验证 42 条。主因摘要：VI01|身份A前提不可构造：固件token过期+mock会话层有token即返回profileCompleted=true（fixtures.ts:1383-1396），A1自标MISMATCH user-1001，锁定态未渲染|1；VI02|同VI01：解锁弹窗因isUnlocked=true未渲染，三路tap元素不存在|1；VI03|同VI01：.lock-screen__close不存在（未锁定态）|1
- **SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-judge.json**（subpackages/village/village/publish）：无法验证 32 条。主因摘要：PUB01|当前构建执行截图超时（ERROR:timeout waiting for automator response）+ 登录身份 userId=user-1001 与 Manifest 身份 A=100158 不符（执行器自标 MISMATCH）+ 计数文本未采样；路由/console/五节点 DOM 已证|1；PUB03|栈=1 点关闭后路由采样仍停留 publish（预期 reLaunch 兜底村口 index），tap 已执行但导航结果未捕获——采样时序或执行器双 publish 页栈干扰，无法裁定|…
- **SUBPACKAGES-VILLAGE-VILLAGE-POST-judge.json**（subpackages/village/village/post（村口·发布动态表单页；Manifest.pageNotes 已裁定任务名「帖子详情」与源码不符，实为发布页））：无法验证 32 条。主因摘要：VP03|执行器 input 失败（el.input is not a function）标题未填入，tap 命中空内容拦截，成功发布链路未执行|1；VP04|执行器 input 失败（el.input is not a function）正文未填入，标题回退逻辑未验证|1；VP05|前置未建立：无 input 步骤记录、表单为空，rapidTap×5 全部命中空内容拦截（5×请输入内容 Toast），防连点去重未验证|1
- **SUBPACKAGES-CIRCLES-CIRCLES-INDEX-judge.json**（subpackages/circles/circles/index）：无法验证 17 条。主因摘要：CI02|tap 落地性无法证明（头部返回钮被 harness 报 :absent 但 wxml 证明存在）；且前置『来源页栈≥2』未建立（A1 实际 reLaunch 直达栈深=1）；console 无 navigateBack:fail 拒绝（同套件 PT 用例证明该类拒绝必被落盘，反证 tap 未落地）|1；CI03|同 CI02：tap 未落地（无 navigateBack:fail 拒绝落盘 + route 不变），goBack 兜底链从未被触发|1；CI05|tap「摄影」效果零留痕：after 截图捕…
- **SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC-judge.json**（subpackages/circles/circles/post-topic）：无法验证 26 条。主因摘要：PT03|执行器 __CAND__ 文本定位「兴趣圈/音乐」失败，宫格未被打开，动作链断裂（截图证实 chip 正常渲染，非页面缺陷）|1；PT04|前置兴趣圈分类宫格未渲染（承接 PT03 执行失败），.category-chip 不存在，动作未执行|1；PT07|执行偏差：action 未按规格执行（输入 10 字非 35 字、未清空），maxlength=30 钳制未验证|1
- **SUBPACKAGES-CAMPUS-CAMPUS-HUB-judge.json**（subpackages/campus/campus/hub）：无法验证 17 条。主因摘要：CH02|tap 上报成功但终栈仍=[hub] 无 switchTab 路由证据；dom 探针 back:absent 与终栈=hub 互斥、证据自相矛盾；CH19 同元素可导航对照成立，判执行竞态不可采信|1；CH03|前置未达成：nearby「校园圈」入口 element not found（SDK $ 不穿透组件），fallback reLaunch 栈=1 非设计的 navigateTo 栈=2；navigateBack 落点与状态恢复零证据|1；CH05|tapIndex 成功但 CH05-after 与…
- **SUBPACKAGES-CAMPUS-CAMPUS-INDEX-judge.json**（undefined）：无法验证 20 条。主因摘要：CX01|三时刻 DOM 采样未落盘，仅末态单样本（success 已证实），loading→success 时序与严禁闪现负向断言无时序证据|1；CX05|前置未建立：兜底 auto-reLaunch 未带 ?school 触发设计内重定向回 hub，返回钮不存在，tap 未执行|1；CX06|tap 上报成功但事件未达应用（同会话 S06–S08 tap 系统性失效，hub CH10/11/12 同模式；平行线 OP09 同交互符合），终态未落 pages/home/index|1
- **SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-judge.json**（subpackages/campus/campus/post-topic）：无法验证 36 条。主因摘要：PT02|路由参数已证但选中项文本/截图/wxml 均未采集，『学习互助唯一高亮』无直接证据|1；PT03|dom 采集为表达式碎片（.trim/.length），选中项文本与截图缺失|1；PT04|?category=__proto__ 深链未执行（route options={}），tap 校园活动文本定位失败；探针未发生|1
- **SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-judge.json**（subpackages/discover-extra/discover/matching）：无法验证 20 条。主因摘要：MT02|寻觅页『喜欢』动作未执行（tap 候选 __CAND__("按") element not found；before 截图实证停留本页，寻觅页+存活卡前置未建立）|1；MT03|互喜欢数据无法预置（manifest 预授权 UNVERIFIED）；实测 Toast=卡片不存在或已被处理+swipeRight error×2+navError timeout，matched 分支未到达；after 截图超时|1；MT04|接口失败注入未执行/未留痕，Toast 未捕获、600ms 返回未观测，failed …
- **SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-judge.json**（subpackages/discover-extra/discover/match-success）：无法验证 5 条。主因摘要：MS02|S08 批次无参 reLaunch 后仅无效选择器探测（.partnerDefaultName 非 DOM 类名）且截图 timeout，身份B 登录实测与身份A 同为 user-1001（MISMATCH，前置未达成）；OP 批次未覆盖无参场景；等效渲染态（TA+默认头像+4 行默认标签）有 MS04-after/OP12b 双源实拍但入口分支不同，无参 onLoad 分支无实测|2；MS03|Manifest 指定 userId=10003 不在 mock fixtures（fixtures.ts 推…
- **SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-judge.json**（subpackages/chat/chat-session/index）：无法验证 40 条。主因摘要：CS01|未登录前置无法建立：移除 storage+reLaunch 不重置内存 sessionStore（isUnlocked=isLoggedIn||useMock，index.vue:520），LockScreen 未渲染；after 截图超时证据缺失|1；CS02|.lock-screen__btn 不存在（同 CS01 前置失效，页面呈内存登录态会话 UI），动作未执行|1；CS03|同 CS01 前置失效，.lock-screen__btn-link 不存在；discover 路由与「登录已过期」toa…
- **SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-judge.json**（subpackages/chat/official-chat/index）：无法验证 18 条。主因摘要：OC03|SKIPPED action-not-automatable（消息页助手卡点击未自动化）；另身份B登录 MISMATCH（user-1001，与身份A同账号）前置不成立|1；OC04|前置栈深2未成立（OC03跳过，harness auto-reLaunch 实为栈深1）+ harness 自身 navigateBack NAV_ERROR:Uncaught [object Object] + .nav-left:absent 探针与 OC12 wxml 矛盾 + 终态路由与 OC05 同操作成功相悖 →…
- **次要20-judge.json**（multi(8 pages): village/detail, village/tag-posts, village/history, circles/topics, circles/topic-detail, circles/circle-home, campus/topic-detail, campus/certification）：无法验证 91 条。主因摘要：VD03|执行器 pre:auto-reLaunch 裸路径丢 ?id=1（r1-exec.cjs:1314），页面落入「帖子不存在」空态（VD04-after.wxml 证实同族状态），关注按钮未渲染，操作未执行|1；VD04|同上丢参污染：after wxml+截图证实页面为 EmptyState「帖子不存在或已被删除」，互动栏不存在，点赞未执行（VD01 已证 ?id=1 时内容正常渲染，属执行侧而非产品缺陷实证）|1；VD05|tap 已落在互动栏#2 且无路由/Toast 变化，但 focus 态（键盘/…
- **次要21-judge.json**（undefined）：无法验证 63 条。主因摘要：SG02|同校列表 .segment-row:absent（环境无 isSameSchool 数据），过滤与 slice(0,50) 截断无法验证；标题文本未采样|1；SG04|tap 首行后路由零变化（顶栈仍 segment），行内 .userId:absent 跳转分支未触发，after 截图 ERROR:timeout，无法区分死按钮/合法拦截/automator 点击未冒泡|1；SG05|.segment-header__back automator 采样 absent（类名与 segment.vue:12…
- **次要22-judge.json**（undefined）：无法验证 70 条。主因摘要：SC03|runner输入定位符__CAND__未解析，弹层未开两段校验未执行|1；SC04|同上弹层未开，mock提交链路未执行|1；SC05|tap .sec-item选择器歧义命中手机号行(截图证误开绑定手机号弹层)+el.input失败|1
- **次要23-judge.json**（undefined）：无法验证 75 条。主因摘要：VI02|observed：pre:navigateTo 后 act:navigateBack delta1 + act:tap .nav-bar__back，但终态 route=[veri|1；VI03|observed：pre:reLaunch 后 harness navigateBack 报 NAV_ERROR: Uncaught [object Object]（栈=1 预期现|1；VI05|observed：仅执行 act:input #verification-student-name="自动化输入-VI…
- **次要24-judge.json**（undefined）：无法验证 60 条。主因摘要：TK02|tapIndex .task-item#2 已执行但 toast:[]/勾选态 absent，前后截图双 ERROR、after wxml 为错页快照，TK02-06 同页四连零反馈无法归因产品或自动化|1；TK03|rapidTap 目标元素未确证（__CAND__），toast:[]、无网络记录|1；TK04|tap 后 route 停留 tasks 未跳转，产品代码与零反馈矛盾，automator 派发失败无法排除|1
- **次要25-judge.json**（undefined）：无法验证 65 条。主因摘要：DEV01|前置构建不符：执行构建为 mock 构建，dev/index 仅 #ifdef DEV 注册（pages.json:272-277），reLaunch 全部 NAV_ERROR，页面未到达（DEV03 wxml 证实栈顶=选择兴趣页）|1；DEV02|前置构建不符：执行构建为 mock 构建，dev/index 仅 #ifdef DEV 注册（pages.json:272-277），reLaunch 全部 NAV_ERROR，页面未到达（DEV03 wxml 证实栈顶=选择兴趣页）|1；DEV03|前置…
- **次要26-judge.json**（undefined）：无法验证 43 条。主因摘要：SH02|A1 未采集 network/console 请求清单，零请求断言无直接证据（CONSOLE 空=未采集与零请求不可分）|1；SH03|A1 采样器故障：.shop-header__back 判 absent 与巡检截图/源码矛盾，tap 生效性与落点均无证据|1；SH04|同 SH03：back absent 采样矛盾，route 未见兜底 home|1
- **回归核对证据不足项**：PAGES-LOGIN-INDEX.json#P3-ZERO-WIRE-DECISIONS、PAGES-MESSAGES-INDEX.json#R13-DATA-3894（详见 regression-report.md 第一节）。
- **环境受限**（需求/视觉/判定线原文）：微信一键登录成功路径需真实微信凭证环境（mock 后端 502 WechatLoginError）；getPhoneNumber 回调在 DevTools/自动化不触发；合成触摸无法驱动 swiper 手势链；slider 原生 change 不被 element.tap 触发——上属均为来源 JSON 内如实标注的执行侧限制，非产品缺陷结论。
- **书记员边界**：本会话仅做来源实读、统计与落盘；存在性核对（fs.existsSync）、目录清点、MD5（round-1-tour 全量）与 git 命令为本会话实际运行，其余判定/结论均为来源文件原文转写。任务清单未列的盘上相邻文件（code-findings/次要18、次要19、次要22.bak-20260922；findings/次要25-req.json；interact 非 judge 文件；round-1/screenshot-manifest.json 等）未读取、未采用。

## 六、产出物清单

- audit-report.md（本文件）；issue-matrix.md（五来源逐条发现矩阵 + 跨来源同 ID 对照）；interaction-matrix.md（27 份判定文件逐用例 PRE/ACTION/EXPECTED/OBSERVED/EVIDENCE/STATUS）；screenshot-matrix.md（目录清点 + 双身份清单 + tour MD5 复核 + 引用存在性 + 逐截图反查）；regression-report.md（21 份回归核对明细）；git-summary.md（Git 状态与命令记录）。

