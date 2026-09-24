# R1 · 需求与功能目标对照 · pages/profile/index（我的 / tabBar）

- 审查员：A4 需求对照员（R1-PAGES-PROFILE-INDEX）
- 日期：2026-09-24
- 理想基线：素材/理想效果图/已经填完资料的个人主页.png（唯一页面级对照依据）；未登录态对照 素材/理想效果图/未登录个人主页.png
- 规范链：git show 29a2b1df:docs/design/v3.1-contract.md（Hero 节奏红线「我的=极浅绿区」、§13 我的主页冻结条款、§19 page-05 行）；git show 29a2b1df:docs/profile-design-spec.md（375×812、卡片 radius 20px）
- 执行证据：reports/audit/round-1/interact/exec-results.json（manifest=PAGES-PROFILE-INDEX，71 例）；操作截图 reports/screenshots/round-1-interact/PAGES-PROFILE-INDEX-PFI*.png；静态截图 reports/screenshots/round-1-tour/A/pages_profile_index__{默认,滚动-中部,滚动-底部,交互后}.png
- 源码：apps/client/src/pages/profile/index.vue（3937 行）+ components/profile/ProfileShell.vue + components/profile/mine/{MyProfile,MyHeader,MyCompletion,MyStats,MyStory,MyInteraction,MyMore}.vue + components/profile/NotLoggedProfile.vue
- 注：报告/像素级对比还原报告.md:439 起「我的主页」节为旧基线快照，其「签名缺失/编辑资料胶囊缺失/右上图标缺失」等结论已被现行实现修复（本轮截图与代码证实签名、白胶囊编辑钮、右上双图标均在位），本轮以现行代码 + 本轮截图为准。

---

## 一、功能目标清单（target → current / gap / fix）

| # | 应该具备的功能（target，依理想图+契约） | current（代码+执行证据） | gap / fix |
| --- | --- | --- | --- |
| T1 | 未登录 = LockScreen（点击登录/完整度0%/故事0/互动0/更多宫格，全元素→登录页），游客深链不发起受保护请求 | NotLoggedProfile.vue 完整实现；PFI01–07 全部 EXECUTED（tap→登录页）；PFI08 游客深链 ?userId=4001 停 LockScreen 零受保护请求（游客门禁 index.vue:297-309） | 无功能缺口。视觉偏差（未登录四格标签「关注/粉丝/获赞/匹配」vs 理想「我喜欢/喜欢我的/我赞/访客」）已由视觉审查员 MP-R1-PAGES-PROFILE-INDEX-003 立项，本文件不重复 |
| T2 | 本人态 Hero：头像(白描边+认证勾)、姓名、性别、在线徽章、年龄·学校·城市、签名、右上分享+设置、右侧编辑资料白胶囊 | 头像+认证勾（MyHeader.vue:56-68 identity.verified）、姓名、在线徽章、城市、签名、双右上图标、编辑胶囊均在；**年龄恒不显示**（index.vue:731 `age: null` 硬编码）、**学校不渲染**（view-models/profile.ts:129-132 已算出 school，MyHeader 模板无学校节点）、**性别图标恒不显示**（mineProfileDTO 无 gender 字段→MyHeader.vue:38-42 恒 ""） | 缺口→Issue -102（Consistency P3）；分享钮为占位死端→Issue -101（Function P2） |
| T3 | 在线徽章反映真实在线状态 | MyHeader.vue:74 无条件渲染「在线」，无 presence 字段消费 | 缺口→Issue -103（Data P3） |
| T4 | 资料完整度卡：百分比+进度条+去完善绿胶囊，点击进完善/编辑 | MyCompletion.vue 全在位（title/percent/bar/tip/去完善）；整卡 tap→complete→goToProfileSetup（index.vue:783-785,1110-1114，entry=edit）；percent 取服务端权威值（index.vue:428-434）；目标页 subpackages/setup/profile/index 已注册（pages.json:255-259） | 无功能缺口。R13 已知低优先：卡 2 行拆 3 行 |
| T5 | 4 格等宽统计（我喜欢/喜欢我的/我赞/访客，图标+黑粗数字+灰标签+竖线），可点跳转 | MyStats.vue 四格+分隔线（:66-74）+彩色图标底；数值 iLikeCount/likedMeCount/praisedCount/visitorCount（mineSocialProof index.vue:678-694，likesStore 实时列表兜底）；tap→statTap→喜欢页/访客页（index.vue:808-820）；onShow 拉取 fetchLikes（index.vue:1589）；本轮截图实值 2/22/356/104 证明数据链路活 | 无功能缺口 |
| T6 | 我的故事横滑 3:4 卡（渐变蒙层+篇数）+ 虚线添加卡 → 发布 | MyStory.vue:60-94 横滑 scroll-view+蒙层(:226-233)+虚线卡；数据 = /posts/my-dailies 真实日常（index.vue:700-716，带退避重试 ：1521-1528）；添加日常→publish?target=friends（index.vue:804-807；publish.vue:155-159 消费 entryTarget）；故事卡→日常详情（index.vue:787-794） | 无功能缺口。L4 微差：角标为日期/「审核中」而非理想「N 篇」；「添加日常」≠理想「添加故事」（R13 已知低优先） |
| T7 | 我的相册/照片墙 → 相册页 | MyStory.vue:96-119 相册 3 缩略图+空态；tap→ROUTES.PROFILE.ALBUM（index.vue:798-800，MP-R7-PROFILE-005 修正）；album 页已注册 | 无功能缺口 |
| T8 | 我的帖子卡（赞/评数）→ 帖子详情；冻结契约 §13「动态区只展示最近 2–3 条 + **查看全部**」 | MyStory.vue:122-165 卡片+赞评+空态；tap→village/detail（MyStory.vue:49-52）；数据 slice(0,3)（view-models/profile.ts:141-148）；**无「查看全部」入口**——moreTap 的 posts 分支（index.vue:832-836）只切已删除的 ProfileTabs，为不可达死代码；village index/history 均无「我的帖子」列表入口（grep 无结果） | 缺口→Issue -104（Function P2） |
| T9 | 我的互动 4 行（喜欢我的人/我的匹配/我喜欢的人/最近访客，头像预览堆+箭头）→ 对应列表页 | MyInteraction.vue 4 行+图标+计数+箭头；interactionItems（index.vue:753-758）likesStore/profileStats 实数；tap→likes/visitors（index.vue:821-831） | 功能无缺口；行构成偏差（头像堆缺失、计数无「人」后缀、「0」被 v-if 隐藏）已由视觉审查员 -005/-004 立项 |
| T10 | 更多功能宫格：我的收藏/谁看过我/恋爱相册/隐私设置 → 各自页 | MyMore.vue 25% 四宫格；moreItems（index.vue:760-766）与 moreTap 路由（index.vue:832-849）；favorites/visitors/album/settings 四页均在 pages.json 注册 | 无功能缺口 |
| T11 | 语音介绍（60s 录/放/重/删，真实链路） | index.vue:1152-1416 完整实现（RecorderManager+InnerAudioContext+/media/upload?type=audio）；PFI34/35/37/38/39 EXECUTED | 功能在位（渲染于本人态附加区）；契约 §13「语音默认折叠」未实现——常开展示，归入加性结构偏差（见 structureNotes），视觉问题已由视觉审查员 -001/-006 立项 |
| T12 | 背景图上传（隐私门+chooseImage+上传淡入） | index.vue:1437-1492 完整链路+上传态；PFI42 EXECUTED（隐私门+chooseImage 触发）；PFI43 FAILED 系 harness 选择器 .profile-bg__edit（该类仅存在于他人态分支 index.vue:1982-2001，本人态入口为 video-cta CTA） | 无功能缺口（执行未达，代码在位） |
| T13 | 邀请好友 3-K（real POST /invites + 奖励汇总；mock showShareMenu） | index.vue:1014-1105 完整实现+弹窗三态（:2095-2151）；首页「去邀请」桥接 invite=1 已消费（index.vue:234-242，登录门禁）；PFI44 EXECUTED 但 tap 首个 .video-cta 误中语音 CTA，弹窗未被打开→PFI45-47 连锁 FAILED | 无产品功能缺口（harness 定位误差；mock 态弹窗本就不展开，属设计） |
| T14 | 他人态（深链 userId）：对方视图完整渲染、打个招呼、右上分享/设置/匹配chip、tabBar 切回复位 | loadOtherProfile 三源（mock 推荐池/作者池/real GET /recommendations/{id}/profile，index.vue:297-396）+游客门禁；PFI59-61 EXECUTED（三深链不崩）；tabBar 复位 MP-R1-PROFILE-207（index.vue:217-220,1548-1555）PFI64/65 EXECUTED；greet/share/settings/chip 模板在位（index.vue:1841-2020）；PFI62/63/66-68 FAILED 均系 harness 在 pre:logout（游客）状态下点选他人态元素——被 LockScreen 正确门禁，非产品缺陷 | 无产品功能缺口（登录态点击链路无执行取证，代码在位，建议 R2 复验） |
| T15 | 认证体系入口：未认证→校园认证页；头像认证勾 | VerificationBadge CTA→/subpackages/campus/campus/certification（index.vue:513-516，页面已注册）；头像认证勾 MyHeader.vue:65-67；B5 三级认证名牌行（CertBadgeRow）+详情面板（CertDetailSheet）**仅渲染于他人态分支**（index.vue:1965 位于 v-else 内），本人态无入口——与理想图一致（理想本人页无名牌行），但 certBadges 的本人态数据分支（index.vue:477-501）不可达，属死代码风险 | 无需求缺口；建议开发清理本人态 certBadges 数据分支或补挂载点（不立项） |
| T16 | 全局发帖 FAB | GlobalPublishFab→village/post（index.vue:1419-1422，页面已注册）；PFI48/49 EXECUTED（含防连点） | 无功能缺口（理想图无此元素，加性偏差） |
| T17 | VIP 开通卡（商业化闸控） | v-if=appConfig.isCommerceOn('vip') && !isVip（index.vue:1807）默认封存（PFI50 observed `.vip-card:absent` 即默认态合规）；闸实现 stores/app-config.ts:64-74；目标页 subpackages/vip/index 已注册（pages.json:330-331） | 无功能缺口（开闸场景无执行取证） |
| T18 | 五 Tab 底部导航，本页高亮「我的」 | pages.json:390-428 五 Tab（custom:true，selectedColor #34C98A）；useTabBar(4)（index.vue:120）；本轮截图五 Tab 在位、我的高亮 | 无功能缺口。中Tab文案「寻觅」vs 理想「匹配」为品牌命名既定差异 |

## 二、结构对照（L1–L10）

- **L1（区块构成）达标**：Hero→资料完整度→4格统计→我的故事（+我的相册+我的帖子）→我的互动→更多功能→五Tab，与理想图区块齐备、顺序一致；未登录 LockScreen 独立成态。
- **L2（区块内构成）基本达标，3 处偏差**：①本人态头部身份行缺 年龄/学校/性别（理想「21岁 · 北京大学 · 北京」+♀；实况仅「北京」+恒亮在线徽章，性别图标因 DTO 缺字段恒不渲染）→ Issue -102；②理想图没有的 4 个加性区块（语音介绍/编辑背景图/推荐给好友/VIP 卡）迁入本人态主体尾部（MP-R1-PROFILE-202/206 死代码激活迁移，功能有据但改变页面节奏，契约 §13「语音默认折叠」未实现）；③互动行缺头像预览堆与「人」后缀（视觉审查员 -005 已立项）。R13 已知低优先两项维持：完整度卡 2 行拆 3 行、「添加日常」≠「添加故事」。
- **L3（元素形态）**：统计/互动/宫格图标为 emoji 系贴图 vs 理想线性彩色图标；右上分享图标用文本字形「▦」占位（理想为四宫格线性图标）且点击仅 toast（Issue -101）；GlobalPublishFab 悬浮钮为理想图没有的加性元素。
- **L4（内容映射）**：未登录态四格标签「关注/粉丝/获赞/匹配」vs 理想「我喜欢/喜欢我的/我赞/访客」（视觉 -003 已立项）；「我的匹配」0 值被 v-if 整体隐藏（视觉 -004）；故事卡角标为日期/审核态而非理想「N 篇」篇数；故事卡无理想中的播放钮 overlay；「在线」为硬编码假状态（Issue -103）。
- **L5–L10（色彩/布局/交互态/动效/空态/容错）**：极浅绿 Hero 区（MyHeader 渐变 #E8F5E9→#F0FFF0、页底 #EEF7F2）符合 v3.1「我的=极浅绿区」红线；卡片白底大圆角、Primary 绿 CTA、按压反馈/空态文案/骨架/错误重试（ProfileShell.vue:71-79）在位；像素级裁量归视觉审查员（其 001–006 已覆盖语音卡折行、未登录图标叠印、空带等）。

## 三、使用路径对照（理想 vs 实际操作）

核心任务可顺畅完成：编辑资料/去完善（同一入口 entry=edit，保存回本页）、头像换装四项菜单、四格统计与互动四行分流到喜欢/访客页、故事/相册/帖子三级内容各自落位、添加日常直达 friends 可见性发布、语音与背景真实上传、邀请与 VIP 闸控齐备；未登录全元素收敛到登录页且零受保护请求；他人态深链可看可打招呼且 tabBar 切回可靠复位本人态；任意位置经恒在自定义 tabBar ≤2 步回 tab，无迷路点。

**重大执行保留（不影响上述代码级结论，但本页交互「执行通过率」不可用）**：exec-results.json 中本页 71 例 = 33 EXECUTED / **37 FAILED** / 1 SKIPPED，其中 45 例观测串带 `pre:login … userId=user-1001 MISMATCH!` 标记；失败形态高度一致——dom 探测 `:present` 后 tap 报 `element not found`（登录身份错位后页面树失同步），另有四组系统性误差：①他人态 5 例（PFI62/63/66-68）在 pre:logout 游客态点选他人态元素，被 LockScreen 正确门禁；②邀请弹窗 3 例（PFI45-47）因 PFI44 tap 首个 `.video-cta` 误中语音 CTA，弹窗从未打开；③cert-badge 4 例（PFI51-55）选择对象仅渲染于他人态分支（index.vue:1965），本人态无该行恰与理想图一致；④PFI43 选择器 `.profile-bg__edit` 仅存在于他人态分支。以上 FAILED 均不能独立定罪为产品功能缺失；对应功能一律以本轮代码读证为准，建议 R2 修复 harness（登录 fixture 身份、tap 前重取页面树、按状态分支选择器）后复验本页 37 例。

## 四、功能缺口汇总（functionGaps）

见 findings/PAGES-PROFILE-INDEX-req.json `pageCompares[0].functionGaps`：①页内分享占位死端（Function P2）；②我的帖子缺「查看全部」（Function P2）；③头部身份信息年龄/学校/性别缺展示（Consistency P3）；④「在线」硬编码假状态（Data P3）；⑤37 例交互无有效执行取证（复核缺口，非产品缺陷）。

## 五、Verdict

**基本达标。** 未登录/本人/他人三态齐备且核心任务链路代码级全通、极浅绿 Hero 红线合规；扣分项为页内分享占位死端与「查看全部」缺失（两项 Function P2）、头部身份信息展示不全与假在线状态（P3），以及本轮交互执行取证大面积失效需 R2 复验。

## 六、Issues 索引

| ID | 类别 | 级别 | 摘要 |
| --- | --- | --- | --- |
| MP-R1-PAGES-PROFILE-INDEX-101 | Function | P2 | 页内「分享」图标点击仅 toast「分享功能即将上线」，未接已有 onShareAppMessage/open-type=share 真链路 |
| MP-R1-PAGES-PROFILE-INDEX-102 | Consistency | P3 | 本人态头部缺 年龄/学校/性别（age 硬编码 null、DTO 无 gender、school 算出未渲染） |
| MP-R1-PAGES-PROFILE-INDEX-103 | Data | P3 | 「在线」徽章无条件硬编码，无真实 presence 字段 |
| MP-R1-PAGES-PROFILE-INDEX-104 | Function | P2 | 我的帖子区缺冻结契约 §13 的「查看全部」入口，全页无本人全部帖子列表路径；posts 死分支残留 |

（与视觉审查员 PAGES-PROFILE-INDEX.json 的 001–006 无重叠：003/004/005 涉及的未登录四格标签、0 值隐藏、互动行头像堆等本文件仅在 T1/T9/L4 引用不重复立项。）
