# R1 历史回归核对报告（regression-report）

- 生成：2026-09-24（书记员-R1 整理落盘）。数据**仅**来自任务给定来源 `reports/audit/round-1/regression/` 全部 21 份 JSON（20 页/分包 + 次要20~24；不含 CAMPUS-HUB 与 MATCH-SUCCESS，任务清单未列）+ `reports/audit/baseline/historical-issues.md`（历史线索库）。
- 核对条目：**117 条**（checked）；回归核对新立项：**20 条**（逐条见下）。
- 结论粗分（按状态前缀归并，括注原文逐条保留在分节表内）：未复发×97、证据不足×2、保留×2、已复发×11、仍开放×4、其他×1。
- 历史线索库：baseline/historical-issues.md，生成日期 2026-09-22，系统性主题 17 个（T1~T17），全量历史条目未因「最近截图看起来正常」视为解决；本轮各页核对以 riskFiles/线索索引指派。
- 状态列为审查员原文（含括注细分），书记员未改写；证据列超长截断（…）。

## 一、复发与未闭合项（重点）

| 来源 | ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|---|
| PAGES-LOGIN-INDEX.json | P3-ZERO-WIRE-DECISIONS | 全局（getPhoneNumber/ContentSecurityChecker/WS connect 封存决议） | 证据不足 | 回归索引该条目仅列 id/page/riskFiles/verification（three-zero-wire-points-still-sealed），无「三处封存点」的具体定义（哪个文件哪三处、封存态的可观测特征），本页源码中 open-type="getPhoneNumber" 处于接线态（index.vue:… |
| PAGES-HOME-INDEX.json | MP-R3-PAGES-HOME-INDEX-001 | pages/home/index | 已复发 | TDZ watch/defineProps 顺序缺陷在当前工作区与 HEAD 均存在：源码 TodayRecommendationCard.vue:8-14（watch 引用 props）先于 :16（defineProps）；本轮以仓库锁定版 @vue/compiler-sfc@3.4.21 compileScrip… |
| PAGES-DISCOVER-INDEX.json | R1-DISCOVER-INDEX-008 | pages/discover/index | 仍开放（历史即待修复态，非复发；范围缩小） | 该条历史上从未被修复，无「复发」语义；本轮差分发现现状较历史稿变化：grep -rn CheckinPopup apps/client/src --include=*.vue --include=*.ts 仍仅命中 components/discover/CheckinPopup.vue 自身（0 消费，待删除部分不变… |
| PAGES-DISCOVER-INDEX.json | R1-DISCOVER-INDEX-011 | pages/discover/index | 仍开放（历史即待修复态，非复发） | 裸色 token 残留与历史稿一致、未被修复亦未被改回 token：index.vue:374 #fff0f0、:380 #c34a5f、:385 #e94d87、:424 #FF6B81（image 元素 color 死属性）、:471 #FF6B81 分段指示条、:500 #4DD0A8 渐变第二色、:502 rg… |
| PAGES-DISCOVER-INDEX.json | R1-DISCOVER-INDEX-012 | pages/discover/index | 仍开放（历史即待修复态，非复发） | i18n 硬编码残留与历史稿一致：index.vue:268/281 分段可见文案硬编码「推荐」「附近」（同元素 aria-label :265/:278 走 t()）；MatchCard.vue onlineText 返回硬编码「在线」、distanceText 硬编码「同校」（本轮重读确认）；MatchInfo.v… |
| PAGES-DISCOVER-INDEX.json | R1-DISCOVER-INDEX-013 | pages/discover/index | 仍开放（历史即待修复态，非复发） | MatchInfo.vue 模板可见文本 ❝（U+275D）仍在位：本轮 sed :78-90 区间确认 <text class="match-info__intro-quote">❝</text> 原样存在，未替换为 IMAGE_PATHS 图标或 CSS 绘制。 |
| PAGES-MESSAGES-INDEX.json | R13-DATA-3894 | pages/messages/index + 数据 | 证据不足 | 缺：①private_messages id=3894 行级 SQL 实查（本轮无连库，索引 verification 要求 private-messages-3894-authorized-deletion-sql-and-page-proof 未满足）；②private_conversations.last_mes… |
| PAGES-PROFILE-INDEX.json | R12-IND-PROFILE-INDEX-001 | pages/profile/index（未登录态） | 已复发（历史待查项，本轮代码确认问题仍在/未修复） | 见 Issue R12-IND-PROFILE-INDEX-001：NotLoggedProfile.vue:153-182 无状态栏让位（固定 32rpx 起排 + 64rpx 圆钮），对照 MyHeader.vue:94-98 同页已修先例；页面根已注入 --statusbar（index.vue:1641 + u… |
| PAGES-PROFILE-INDEX.json | R1-PROFILE-203..214#胶囊避让不足 | pages/profile/index（他人态） | 已复发（簇内残留未修，几何推算 → MP-R1-PROFILE-219） | index.vue:2577-2580 top≈statusbar+30px 落入胶囊带（+6..+38px）；:2610-2617 横向内缩仅 ≈31px vs 胶囊左缘距右 ≈94px。PFI66-68 他人态顶栏元素未取到（pre 环境缺他人态 reLaunch），无运行时反证；需真机截图终验。 |
| PAGES-PROFILE-INDEX.json | R1-PROFILE-203..214#分享假实现 | pages/profile/index | 已复发（簇内残留未修 → MP-R1-PROFILE-215） | MyHeader.vue:22-24 handleShare 仅 toast「分享功能即将上线」（亲验）；对照 index.vue:1498-1507 onShareAppMessage 真实现并存口径不一。PFI10 交互取证因 .my-header__icon 元素未找到未达成本条。 |
| PAGES-PROFILE-INDEX.json | R1-PROFILE-203..214#空-catch | pages/profile/index | 已复发（簇内残留未修 → MP-R1-PROFILE-217） | grep 亲验 index.vue:1571/:1589 两处 `likesStore.fetchLikes().catch(() => {})`；try/catch 字面空块零命中（grep 零命中，Promise 版为残留形态）。 |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json | MP-R3-VILLAGE-INDEX-001 | subpackages/village/village/index | 已复发 | 问题路径仍在（历史 P1 未见修复落地）：按索引 verification「实读图片核对」要求，本轮 Read apps/client/src/static/assets/images/posts/post-{1..8}.jpg 八文件建立图像真值（post-1 城堡 / post-2 热饮杯 / post-3 海岸礁… |
| SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json | MP-R3-VILLAGE-INDEX-002 | subpackages/village/village/index | 已复发 | 问题路径仍在（历史 P1 未见修复落地）：stores/village/index.ts:356（mock `this.posts = pageItems;`）与 :363（real `this.posts = data.items.map(mapToPostItem);`）均为整体替换、无追加；对照 fetchPos… |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json | MP-R3-CAMPUS-INDEX-001 | subpackages/campus/campus/index | 已复发 | 见 issue MP-R1-REG-CAMPUSINDEX-001。核心：页面消费 campus.index.hotCirclesTitle/viewMore（index.vue:259-260），键实际在两语言包 campus.postTopic 段（zh-CN.ts:3549-3550、en-US.ts:3470-… |
| SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json | MP-R3-CAMPUS-INDEX-002 | subpackages/campus/campus/index | 已复发 | 见 issue MP-R1-REG-CAMPUSINDEX-002。核心：页头避让（index.vue:395）+ App.vue page 级 env() 回退避让（App.vue:336）+ --statusbar 仅注入 .campus-page（index.vue:23/:219，本子包 page-meta 零… |
| 次要20.json | MP-R2-VILL-013 | subpackages/village/village（detail 等 scope 页渲染） | 已复发 | 同族批量图文不符仍在：mock-data.ts:483-493 post-10 极光帖配 post-4.jpg，本会话 Read 实读该图=冒热气的杯子（与原始线索同型）；fixtures.ts:674-675 仅修一处。详见 Issue MP-R1-VILLAGE-REG-001。 |
| 次要20.json | MP-R1-TOPIC-DETAIL-001-002 | subpackages/campus/campus/topic-detail | 已复发 | maxlength 子项修复缺失（historical-issues.md:248 标『已修』）：input 无 maxlength（:271-277，全文件 0 命中）、store 提交无长度校验（campus.ts:696-709）、git -S maxlength 该文件 0 提交（本会话实跑）。重复追加子项未复… |

## 二、分页核对明细（21 份）

### PAGES-LOGIN-INDEX.json — pages/login/index

- 核对人：历史回归员-R1-PAGES-LOGIN-INDEX (A5)｜日期：2026-09-24｜核对条数：7｜立项：1 条
- 方法（摘要）：回归索引差分模式：以 reports/audit/baseline/regression-index.json 中 riskFiles 含 apps/client/src/pages/login/index.vue 的全部条目为核对集（IA-CONSOLE-01 / MP-R1-LOGIN-001 / MP-R1-LOGIN-002-004 / MP-R2-PAGES-LOGIN-INDEX-001 / P3-ZERO-WIRE-DECISIONS / P4-AGREEMENT-DEFAULT / T16-login 部分），逐条以本会话实际执行的 Read/grep/git diff/截图目检取证。只读核对，未改代码、未驱动开发者工具。
- 实际运行命令（摘要）：grep -n 'type="password"' apps/client/src/pages/login/index.vue → 零命中（exit=1）；grep -n ':password' apps/client/src/pages/login/index.vue → :774 :password="true"；git diff -- apps/client/src/pages/login/index.vue | grep -E '^[+-].*password' → 零命中（本轮工作区改动未触及密码框）；git show HEAD:apps/client/src/pages/login…
- 历史线索入口（摘要）：historical-issues.md:321：MP-R2-PAGES-LOGIN-INDEX-001 | login | input type="password" 非法（mp 无此值，密码明文显示）| 待修复（落盘时点工作区已修，终验未见）

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R2-PAGES-LOGIN-INDEX-001 | pages/login/index | 未复发（缺陷路径层确证；修复效果现象层存疑，另立 Issue MP-R1-PAGES-LOGIN-INDEX-020） | 历史缺陷写法 type="password" 已不存在：本会话 grep 'type="password"' apps/client/src/pages/login/index.vue 零命中（exit=1）；index.vue:773-774 为 type="text" + :password="true"（uni-app 规范布尔密文… |
| IA-CONSOLE-01 | pages/login（login watch immediate TypeError） | 未复发 | 代码修复在位：apps/client/src/pages/login/index.vue:110-134——stopSessionForwardWatch 声明为可空句柄，immediate 同步回调内经 :124 stopSessionForwardWatch?.() 可选调用（历史缺陷「k is not a function」的直接路… |
| MP-R1-LOGIN-001 | pages/login（授权拒绝后死路） | 未复发（页面层修复在位并经双批交互取证；MP-WEIXIN 真实后端剩余缺口由本批代码审查员以 MP-R1-PAGES-LOGIN-INDEX-004 登记，非回归） | 代码：index.vue:340-351（errMsg!=='getPhoneNumber:ok' → addBreadcrumb + showPhoneLogin=true，注释标注 MP-R1-LOGIN-001 修复）、:865-873（表单内「去注册」→goRegisterPage :225-227 navigateTo(ROUT… |
| MP-R1-LOGIN-002-004 | pages/login（双导航竞争 / 未登录 bindPhone 401 / 倒计时定时器不清理） | 未复发 | 三项修复代码均在位：①单飞导航——loginSuccessNavigate 统一入口先置 autoForwardedToMain（index.vue:203-214）+ loginFlowActive 在途压制（:119、:296、:367、:434、:506）+ onShow/watch 共用一次性标记（:96-134）；②401 gr… |
| T16 | 全局（作用域/初始化类运行时崩溃；login 相关子项=IA-CONSOLE-01） | 未复发（仅就 riskFiles 含 pages/login/index.vue 的子项核对） | T16 描述列明 login 侧子项即 IA-CONSOLE-01（watch immediate TypeError）；该子项核对结论见本文件 IA-CONSOLE-01 条：修复代码 index.vue:110-134 在位 + console-evidence log 运行时错误模式 0 命中。其余子项（home/nearby TD… |
| P3-ZERO-WIRE-DECISIONS | 全局（getPhoneNumber/ContentSecurityChecker/WS connect 封存决议） | 证据不足 | 回归索引该条目仅列 id/page/riskFiles/verification（three-zero-wire-points-still-sealed），无「三处封存点」的具体定义（哪个文件哪三处、封存态的可观测特征），本页源码中 open-type="getPhoneNumber" 处于接线态（index.vue:694-705 ha… |
| P4-AGREEMENT-DEFAULT | pages/login、pages/register（协议默认勾选差异，仅记录） | 未复发（状态与记录一致，符合 verification「unchanged-as-recorded」） | index.vue:59 agreed = ref(true)（登录页默认勾选）在位；交互取证 op00 实测 aria-checked=true（interact/PAGES-LOGIN-INDEX.json#checks[0]），op02/op04 取消/恢复切换正常（02-after 空心 / 04-after 绿勾）。该条目为「仅… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-PAGES-LOGIN-INDEX-020 | P1 | Regression | 待修复 | — | 历史问题 MP-R2-PAGES-LOGIN-INDEX-001（P1：input type="password" 非法值致 mp 端密码明文显示）回归核对发现修复效果反证：缺陷写法（type="password"）确凿未回归——源码与构建产物均为规范的 type="text" + :password="true" 密文写法，且本轮工作区… | 修复写法在位三证：apps/client/src/pages/login/index.vue:773-774（type="text" + :password="true"；本会话 grep 'type="password"' 零命中 exit=1）；apps/client/dis… | reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-13-after.png | 先人工仲裁：真机 + DevTools 手动聚焦键入密码各验一次掩码显示。若真机掩码正常 → 判 automator 程序化赋值/模拟器渲染假象，在 interact/PAGES-… |

- 覆盖声明（原文摘要）：核对集=回归索引中 riskFiles 含 apps/client/src/pages/login/index.vue 的全部 7 条（IA-CONSOLE-01、MP-R1-LOGIN-001、MP-R1-LOGIN-002-004、MP-R2-PAGES-LOGIN-INDEX-001、P3-ZERO-WIRE-DECISIONS、P4-AGREEMENT-DEFAULT、T16），其中任务给定主条目 MP-R2-PAGES-LOGIN-INDEX-001 完成源码+产物+diff+截图四层取证并立 Issue 020；5 条判未复发（附代码/取证/console 证据）；1 条判证据不足（P3-ZERO-WIRE-DECISIONS 缺封存点清单）。本会话实际执行：grep×5、git diff/show、Read 源码全文、回归索引相关段、historical-issues.md:…

### PAGES-HOME-INDEX.json — pages/home/index

- 核对人：历史回归员-R1-PAGES-HOME-INDEX（A5，回归索引差分模式，只读）｜日期：2026-09-24｜核对条数：6｜立项：1 条
- 方法（摘要）：按 regression-index.json 中 pages/home/index 相关条目（MP-R1-PAGES-HOME-INDEX-001 / MP-R1-HOME-REG-007..018 / MP-R3-PAGES-HOME-INDEX-001 / R12-IND-HOME-001 / R1-PAGES-HOME-INDEX-002..017）做机器差分：源码逐行核对历史修复路径是否仍在位 + 本轮交互执行结果（exec-results.json 59 例）与交互 judge 判定（PAGES-HOME-INDEX-judge.json）回代验证。未改任何代码、未驱动 DevTools。

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-PAGES-HOME-INDEX-001 | pages/home/index | 未复发 | InviteBanner「去邀请」CTA 全链路在位：InviteBanner.vue:15 整卡 @tap emit invite → pages/home/index.vue:319-321 openInvite → switchTabWithQuery(ROUTES.PROFILE.INDEX, { invite: "1" }) →… |
| MP-R1-HOME-REG-007..018 | pages/home/index | 未复发 | 10 项历史修复（不含 018 白屏，另列）逐项源码+运行时差分，全部仍在位：①四色底 RelationActivity.vue:34-70 四 cell（MASCOT.HEART/SHY/WAVE/CHEER 吉祥物图）+ :144-150 粉/绿/紫/橙四色底；②第4卡 TodayLoveProgress.vue:82-87 序号圆语… |
| MP-R1-HOME-REG-017 | pages/home/index | 保留 | 白屏项（=R12-IND-HOME-001）：本轮 59 例首页交互无白屏记录（H11 冷启动末态 Success 无错误空态、H59 深链直达正常渲染）；代码层防御在位（index.vue:490-515 page height:auto + .home-page display:block/flex:none；四组件骨架/空态分支在位… |
| MP-R3-PAGES-HOME-INDEX-001 | pages/home/index | 已复发 | TDZ watch/defineProps 顺序缺陷在当前工作区与 HEAD 均存在：源码 TodayRecommendationCard.vue:8-14（watch 引用 props）先于 :16（defineProps）；本轮以仓库锁定版 @vue/compiler-sfc@3.4.21 compileScript 实证产物 wat… |
| R12-IND-HOME-001 | pages/home/index | 保留 | 首页偶发白屏（判定 DevTools 渲染层偶发 2/144）：本轮交互轮 59 例无白屏复现（H11/H59 冷启动正常、H51 滚动内容完整）；代码层防御与重拍兜底脚本在位（index.vue:490-515 + scripts/r20-reshoot-home.cjs）；原判定「非本页代码缺陷，巡检监控」维持。r20-capture… |
| R1-PAGES-HOME-INDEX-002..017 | pages/home/index | 未复发 | P2 簇逐项差分：②换一位（原无错误处理/竞态）index.vue:162-186 rotateLoading 防重入+try/catch 失败 toast+likeSent 移入成功路径——H09（快击5次推荐人更换）/H10（池底 toast 暂无更多推荐）/H57（未登录请先登录 toast）运行时佐证；③加入态破口 index.v… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-PAGES-HOME-INDEX-027 | P1 | Regression | 待修复 | — | MP-R3-PAGES-HOME-INDEX-001 复发（回归）：TodayRecommendationCard 的 photoFailed 重置 watch 写在 defineProps 之前，引用 props 的 watcher getter 在编译产物注册时立即求值，此时 props 尚在 TDZ——每挂载必抛 Reference… | ① 源码顺序（本轮 Read）：apps/client/src/components/home/TodayRecommendationCard.vue:8-14 为 watch(() => props.item?.photoUrl, ...)，:16 才是 const props… | 无（console 证据案；交互轮运行时 console 见 reports/audit/round-1/interact/exec-results.json … | 把 const props = defineProps<...>() 与 defineEmits 移到 TodayRecommendationCard.vue script set… |

- 覆盖声明（原文摘要）：本轮实际执行：① 读 regression-index.json 全量并筛出 pages/home/index 相关条目 6 组（MP-R1-PAGES-HOME-INDEX-001 / MP-R1-HOME-REG-007..018 / MP-R3-PAGES-HOME-INDEX-001 / R12-IND-HOME-001 / R1-PAGES-HOME-INDEX-002..017，另关联确认 MP-R2-PAGES-HOME-INDEX-001 未登录 401 强踢——H54 未登录预览可加载+点喜欢仅 toast「请先登录」，index.vue:88 登录门在位，未复发）；② 源码逐行核对 11 个文件（pages/home/index.vue、components/home/{TodayRecommendationCard,InviteBanner,HomeHeader,Re…

### PAGES-NEARBY-INDEX.json — pages/nearby/index

- 核对人：历史回归员-R1-PAGES-NEARBY-INDEX (A5)｜日期：2026-09-24｜核对条数：2｜立项：0 条
- 方法（摘要）：回归索引差分模式：以 ask 指定的两条历史条目（MP-R1-PAGES-NEARBY-INDEX-001 / MP-R2-PAGES-NEARBY-INDEX-001）为核对集，并以 regression-index.json 中 riskFiles 含 pages/nearby/index.vue 或 utils/location.ts 的条目（IA-CONSOLE-02 / MP-R1-NEARBY-001/002/005 / MP-R2-NEAR-011 / P3-NEARBY-IA-FREEZE）做 riskFiles 差分。逐条以本会话实际执行的 Read/grep/git diff/node 解析/截图目检取证。只读核对，未改代码、未驱动开发者工具。
- 实际运行命令（摘要）：grep -in 'nearby' reports/audit/baseline/regression-index.json → 定位 11 条 nearby 相关条目行号，sed 3079-3140 / 3307-3365 读两条原始条目全文（riskFiles/verification/severity）；git status --porcelain → 本轮改动清单：pages/nearby/index.vue、utils/location.ts、services/http.ts、SecurityConfig.java 均不在其中；本页相关被改文件仅 tests/pages/nearby…
- 历史线索入口（摘要）：MP-R1-PAGES-NEARBY-INDEX-001（P1）：未登录用户（real）进入附近页 onLoad 无条件打受保护接口 → 401 强踢登录页；MP-R2-PAGES-NEARBY-INDEX-001（P1）：reportLocation 在登录门外无条件执行 → 未登录授权定位后仍 401 强踢（上条残留口子）

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-PAGES-NEARBY-INDEX-001 | pages/nearby/index | 未复发 | 【代码层·修复在位】apps/client/src/pages/nearby/index.vue:66-68（canFetchProtected = useMock() \|\| getToken().length>0）、:170（loadNearbyData 首行门控，onLoad:124 唯一调用方）、:117（initLocation … |
| MP-R2-PAGES-NEARBY-INDEX-001 | pages/nearby/index | 未复发 | 【代码层·修复在位】apps/client/src/utils/location.ts:152-153（reportLocation 首行 `if (!useMock() && getToken().length === 0) return;` real 无 token 短路）、:142-146（修复注释 MP-R2-PAGES-HOME… |


### PAGES-DISCOVER-INDEX.json — pages/discover/index

- 核对人：历史回归员-R1-PAGES-DISCOVER-INDEX（A5 索引差分模式：只核对历史条目是否复发，只读清单/代码/证据，不改代码、不碰开发者工具）｜日期：2026-09-24｜核对条数：14｜立项：1 条
- 方法（摘要）：回归索引 reports/audit/baseline/regression-index.json 中 riskFiles 含 apps/client/src/pages/discover/index.vue 的条目做差分：R1-DISCOVER-INDEX-005..013 簇（ask 指定）+ T2 游客胶囊 + MP-R1-PAGES-DISCOVER-INDEX-001..004 + MP-R3-DISCOVER-002。因 git status 显示 index.vue/SwipeContainer.vue/MatchCard.vue/matching.vue/i18n locales 本轮仍有未提交改动，全部结论以当前工作树源码重读为准（不沿用 code-findings 稿结论），交互层以 reports/audit/round-1/interact/exec-results…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| R1-DISCOVER-INDEX-005 | pages/discover/index | 未复发 | MatchCard tap 双通道重复触发的修复在当前工作树完整在位：SwipeContainer.vue:13-21（card-tap emit 声明+MP-R1-005 注释）、:39-41（手势层 onTap→emit('card-tap')）、:78（catchtap="onCatchTap"，注：该层运行时失效另立案 MP-R1… |
| R1-DISCOVER-INDEX-006 | pages/discover/index | 未复发 | padding-bottom 未回退到旧 112rpx 口径：index.vue:355-358 padding-bottom:calc(232rpx + 48rpx + env(safe-area-inset-bottom))，MP-R2-PAGES-DISCOVER-INDEX-002 注释（tabBar 实高 184rpx+浮岛越出… |
| R1-DISCOVER-INDEX-007 | pages/discover/index | 未复发（已验证） | 本轮重读 index.vue 全文（512 行）独立重做样式↔模板全量比对：:347-512 全部 scoped 选择器均有 :238-344 模板引用——.match-page:238、.match-scroll:287、.match-error:288/__text:289/__retry:290、.match-state:295/2… |
| R1-DISCOVER-INDEX-008 | pages/discover/index | 仍开放（历史即待修复态，非复发；范围缩小） | 该条历史上从未被修复，无「复发」语义；本轮差分发现现状较历史稿变化：grep -rn CheckinPopup apps/client/src --include=*.vue --include=*.ts 仍仅命中 components/discover/CheckinPopup.vue 自身（0 消费，待删除部分不变）；但 CardSw… |
| R1-DISCOVER-INDEX-009 | pages/discover/index | 未复发 | 分段双源初始矛盾修复在位：stores/discover/index.ts:122（activeFilter:"all"）+ :121-125 MP-R2-PAGES-DISCOVER-INDEX-004 三处对齐注释、:129 matchScope:"all"；index.vue:51 activeMode 默认 "recommend"… |
| R1-DISCOVER-INDEX-010 | pages/discover/index | 未复发 | 打招呼计数顺序修复在位（本轮重读 index.vue:148-179 确认执行顺序）：:154-157 isLimitReached 配额门控 → :165-175 try/catch 读 greet:count:* 判 3 次上限 → :176 setStorageSync 自增 → :178 enterMatching；配额用尽期点击… |
| R1-DISCOVER-INDEX-011 | pages/discover/index | 仍开放（历史即待修复态，非复发） | 裸色 token 残留与历史稿一致、未被修复亦未被改回 token：index.vue:374 #fff0f0、:380 #c34a5f、:385 #e94d87、:424 #FF6B81（image 元素 color 死属性）、:471 #FF6B81 分段指示条、:500 #4DD0A8 渐变第二色、:502 rgba(54,201,… |
| R1-DISCOVER-INDEX-012 | pages/discover/index | 仍开放（历史即待修复态，非复发） | i18n 硬编码残留与历史稿一致：index.vue:268/281 分段可见文案硬编码「推荐」「附近」（同元素 aria-label :265/:278 走 t()）；MatchCard.vue onlineText 返回硬编码「在线」、distanceText 硬编码「同校」（本轮重读确认）；MatchInfo.vue activeL… |
| R1-DISCOVER-INDEX-013 | pages/discover/index | 仍开放（历史即待修复态，非复发） | MatchInfo.vue 模板可见文本 ❝（U+275D）仍在位：本轮 sed :78-90 区间确认 <text class="match-info__intro-quote">❝</text> 原样存在，未替换为 IMAGE_PATHS 图标或 CSS 绘制。 |
| T2 | pages/discover/index（verification: discover-guest-pill-vs-tabbar-native-layer） | 未复发 | 游客登录胶囊避让修复在位：index.vue:487-493 bottom:calc(var(--tab-bar-h, 160rpx) + 128rpx + env(safe-area-inset-bottom))，MP-R1-PAGES-DISCOVER-INDEX-003 与 MP-R2-PAGES-DISCOVER-INDEX-00… |
| MP-R1-PAGES-DISCOVER-INDEX-001-002 | pages/discover/index + discover/matching（返回后错误横幅/重复消费） | 未复发（代码层）；交互层证据不足 | 代码层：retryDiscover 强制刷新在位（index.vue:207-210 removeCache("discover:data") 后直调 fetchCards，MP-R1-002 注释）；onShow 仅缓存不新鲜时清横幅（index.vue:220-224）；matching.vue:145 页面刷新兜底 setTimeo… |
| MP-R1-PAGES-DISCOVER-INDEX-003 | pages/discover/index（游客胶囊 vs tabBar） | 未复发 | 与 T2 同源证据：index.vue:487-493 修复值+两代注释在位，dist 编译产物同值命中；DC01/DC25 EXECUTED。custom-tab-bar/index.wxss 本轮无未提交改动（git status 不含该文件），遮挡几何前提未变。 |
| MP-R1-PAGES-DISCOVER-INDEX-004 | pages/discover/index（整页 probe 套件回归） | 未复发（套件已执行） | 本轮 exec-results.json 含 PAGES-DISCOVER-INDEX manifest 共 44 条（DC01-DC44）：28 EXECUTED / 15 FAILED / 1 SKIPPED。FAILED 逐条核对均为自动化环境问题而非页面回归：DC05 navError 为 automator 内部错误（getPa… |
| MP-R3-DISCOVER-002 | pages/discover/index（匹配度粉圆糊化） | 未复发 | 匹配环放大修复在位：MatchCard.vue .match-card__score-ring-inner width/height:132rpx，注释「R3：内圈 104→132rpx（文字实际容器），value/label 同步放大后『匹配度』不再糊化」在位（本轮 sed :225-245 区间确认）。交互佐证：DC03 EXECUT… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-PAGES-DISCOVER-INDEX-026 | P3 | MiniProgram | 待修复 | — | 本轮回归核对 005（MatchCard tap 双通道）时由执行证据新发现：SwipeContainer 根节点 catchtap="onCatchTap" 在 mp-weixin 运行时找不到处理方法——DC16（点击卡片×3）console 每次点击输出 warn "Component \"components/common/swi… | reports/audit/round-1/interact/exec-results.json id=DC16（status EXECUTED，console 3 条 does not have a method "onCatchTap" warn，时间戳 2026-09-22… | 无（console 运行时证据；关联交互截图 reports/screenshots/round-1-interact/PAGES-DISCOVER-INDEX… | 二选一：①SwipeContainer.vue 模板改用 @tap.stop="onCatchTap"（Vue3 编译器可识别并生成 catchtap 产物，方法同时被模板引用不再… |

- 覆盖声明（原文摘要）：差分范围：回归索引全量 4430 行中筛出 riskFiles 含 apps/client/src/pages/discover/index.vue 的条目（T2、MP-R1-PAGES-DISCOVER-INDEX-001..004、MP-R3-DISCOVER-002）+ ask 指定簇 R1-DISCOVER-INDEX-005..013，共 14 条 checked，无遗漏。；取证手段：①当前工作树源码重读（index.vue 512 行全量 + SwipeContainer.vue/MatchCard.vue/MatchInfo.vue 关键区 + stores/discover/index.ts/filter.ts/matching.vue 关键区）——因 git status 显示相关文件均有未提交改动，未沿用 code-findings 稿结论；②grep/git 证据（C…

### PAGES-MESSAGES-INDEX.json — pages/messages/index

- 核对人：历史回归员-R1-PAGES-MESSAGES-INDEX（A5 索引差分模式：只核对历史条目是否复发，只读清单/代码/证据，不改代码、不碰开发者工具）｜日期：2026-09-24｜核对条数：4｜立项：1 条
- 方法（摘要）：回归索引 reports/audit/baseline/regression-index.json 中 page=riskFiles 含 apps/client/src/pages/messages/index.vue / stores/messages.ts 的条目做差分：MP-R1-PAGES-MESSAGES-INDEX-004、005、R13-DATA-3894、R1-PAGES-MESSAGES-INDEX-006..018（ask 指定 4 组）。因 git status 显示 index.vue 与 stores/messages.ts 本轮均有未提交改动，全部结论以当前工作树源码重读为准（不沿用 A2 code-findings 稿结论）；交互层佐证取 reports/audit/round-1/interact/exec-results.json（round R1，git…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-PAGES-MESSAGES-INDEX-004 | pages/messages/index | 未复发 | 代码（本轮工作树重读）：index.vue:518 模板读真实字段 formatTime(session.lastMessageSentAt)，假字段 lastMessageTime 在 apps/client/src 全域 grep 零命中（本轮执行 `grep -rn lastMessageTime apps/client/src/ … |
| MP-R1-PAGES-MESSAGES-INDEX-005 | pages/messages/index | 未复发 | 代码（本轮工作树重读，emit→监听→跳转链完整）：components/discover/NotLoggedWaiting.vue:22-25 defineEmits 含 goPhoneLogin、:31-33 emit("goPhoneLogin")、:90-99 手机号登录按钮 @tap=goPhoneLogin；index.vue… |
| R13-DATA-3894 | pages/messages/index + 数据 | 证据不足 | 缺：①private_messages id=3894 行级 SQL 实查（本轮无连库，索引 verification 要求 private-messages-3894-authorized-deletion-sql-and-page-proof 未满足）；②private_conversations.last_message_previ… |
| R1-PAGES-MESSAGES-INDEX-006..018 | pages/messages/index | 未复发 | P2 簇六症状（对应索引条目 MP-R1-PAGES-MESSAGES-INDEX-006-011）逐项以当前工作树重读，修复全部仍在：006 空 catch→index.vue:256-258 fetchLikes().catch(console.warn)；007 dashboard 并发整表覆盖→stores/messages.ts… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| R13-DATA-3894 | P1 | Regression | 待修复 | — | 回归核对：private_messages id=3894「全链路验收测试消息 2026-09-12」外露消息预览位——非本轮复发（历史上从未修复，无「修复被改回」可言），维持待修复。本轮复核确认：①该字符串在本轮全部 round-1 证据中仅命中报告文档（grep -rn "全链路验收测试消息" reports/audit/round-… | 本轮执行的检查：grep -rn "3894" 与 grep -rn "全链路验收测试消息" reports/audit/round-1/ → 仅命中 reports/audit/round-1/code-findings/PAGES-MESSAGES-INDEX.json:45… | （mock 构建五会话预览无该文案——reports/audit/round-1/findings/PAGES-MESSAGES-INDEX.json:117；… | （等授权执行，删除不可逆）双表同步清理：DELETE private_messages 残留行 id=3894 + 将对应会话（conv 461）private_conversat… |


### PAGES-PROFILE-INDEX.json — pages/profile/index（我的，tabBar）

- 核对人：A5 历史回归员（索引差分模式：只核对回归索引中本页相关条目，逐条独立复核源码/执行结果/截图，不采信 A2 结论本身）｜日期：2026-09-24｜核对条数：13｜立项：7 条
- 方法（摘要）：核对结论：两条 P1 历史复发项（MP-R1-PROFILE-201/202）经源码逐链复核未复发且运行时可达（PFI34-44）；R12-IND-PROFILE-INDEX-001（未登录头部叠印）代码层确认问题仍在——NotLoggedProfile 无任何状态栏让位（对照 MyHeader 有），生成 Issue 原级 P2；203..214 簇五个主项（不可达模板/growth 接线/他人态动态 Tab/VIP 卡/targetUserId 复位）全部未复发（含 PFI64 运行时复位取证、PFI50 VIP 封存取证、TabBar backdrop-filter H5 条件编译合规），簇内残留 5 项（胶囊避让/分享假实现/空 catch/死 CSS/3 孤儿组件）+ 修复引入的深链误复位边界 1 项，逐项立 Issue。本页运行时缺口：PFI01（未登录首屏截图）与多数截图因 …

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-PROFILE-201 | pages/profile/index | 未复发 | 解析链逐环亲验：apps/client/src/pages/profile/index.vue:664-676 minePosts `images: resolveMediaUrls(post.images ?? [])`（:668 注释明示本条目号）；:700-710 我的故事封面 `resolveMediaUrl(d.images[0… |
| MP-R1-PROFILE-202 | pages/profile/index | 未复发 | 代码：index.vue:1648 已登录 template v-else 内 :1677 `<template v-if="isOwnProfile">` 含语音/背景/邀请/VIP 四块（与 :1650 ProfileShell 同态必渲染），全文件无字面 v-if="false"（仅 :60/:1673 注释提及）；处理器 open… |
| R12-IND-PROFILE-INDEX-001 | pages/profile/index（未登录态） | 已复发（历史待查项，本轮代码确认问题仍在/未修复） | 见 Issue R12-IND-PROFILE-INDEX-001：NotLoggedProfile.vue:153-182 无状态栏让位（固定 32rpx 起排 + 64rpx 圆钮），对照 MyHeader.vue:94-98 同页已修先例；页面根已注入 --statusbar（index.vue:1641 + useMenuButt… |
| R1-PROFILE-203..214#850-行不可达模板 | pages/profile/index | 未复发（残留死 CSS 另立 MP-R1-PROFILE-216） | index.vue 全文 3936 行，模板 1640-2153，grep v-if="false" 零命中（仅注释）；文件内 :60/:768-770/:1671-1676/:1806/:2027 等多处注释明示死块/孤儿引用已删。 |
| R1-PROFILE-203..214#5-孤儿组件 | pages/profile/index | 部分未复发（MyGrowth 已删；ProfileTabs/ProfileEmptyState/SocialProgressIndicator 3 个仍在 → MP-R1-PROFILE-222） | ls 亲验：MyGrowth.vue 不存在；ProfileTabs.vue/ProfileEmptyState.vue/SocialProgressIndicator.vue 存在；ProfileTabs 在 pages/+components/ 无 import。 |
| R1-PROFILE-203..214#growth-接线断裂 | pages/profile/index | 未复发 | MyGrowth.vue 已删（ls 亲验）；components/profile/mine/MyProfile.vue:34-35 注释明示 growthTap 死 emit 已删；index.vue:768-770 注释明示 growthItems/onProfileShellGrowthTap 已移除。 |
| R1-PROFILE-203..214#他人态动态-Tab-空白 | pages/profile/index | 未复发 | ProfileTabs 已卸载（grep 零 import，index.vue:59 注释）；index.vue:2027 注释「资料内容常显——原 ProfileTabs 渲染动态 Tab 但内容块被 isOwnProfile 门禁」；运行时 PFI59-61 他人态深链（userId=4001/user-3001/10003）全部 E… |
| R1-PROFILE-203..214#VIP-卡颠倒 | pages/profile/index | 未复发 | index.vue:1806-1807 唯一 vip-card 位于 :1677 本人态 template 内，门禁 `appConfig.isCommerceOn('vip') && !isVip`（isVip=index.vue:646 取 profileView），:1806 注释明示原误置他人态分支已迁；运行时 PFI50 `.v… |
| R1-PROFILE-203..214#targetUserId-无复位 | pages/profile/index | 未复发（修复在位且运行时生效；修复实现边界风险另立 MP-R1-PROFILE-218） | index.vue:214-220 onTabItemTap 置位 + :1546-1556 onShow 复位块（loadPageUserIdParam 之后执行，注释明示 MP-R1-PROFILE-207）；运行时 PFI64「他人态下 tabBar 主动切回我的→复位本人态」EXECUTED。 |
| R1-PROFILE-203..214#胶囊避让不足 | pages/profile/index（他人态） | 已复发（簇内残留未修，几何推算 → MP-R1-PROFILE-219） | index.vue:2577-2580 top≈statusbar+30px 落入胶囊带（+6..+38px）；:2610-2617 横向内缩仅 ≈31px vs 胶囊左缘距右 ≈94px。PFI66-68 他人态顶栏元素未取到（pre 环境缺他人态 reLaunch），无运行时反证；需真机截图终验。 |
| R1-PROFILE-203..214#分享假实现 | pages/profile/index | 已复发（簇内残留未修 → MP-R1-PROFILE-215） | MyHeader.vue:22-24 handleShare 仅 toast「分享功能即将上线」（亲验）；对照 index.vue:1498-1507 onShareAppMessage 真实现并存口径不一。PFI10 交互取证因 .my-header__icon 元素未找到未达成本条。 |
| R1-PROFILE-203..214#空-catch | pages/profile/index | 已复发（簇内残留未修 → MP-R1-PROFILE-217） | grep 亲验 index.vue:1571/:1589 两处 `likesStore.fetchLikes().catch(() => {})`；try/catch 字面空块零命中（grep 零命中，Promise 版为残留形态）。 |
| R1-PROFILE-203..214#自定义-tabBar-backdrop-filter | pages/profile/index（引用组件） | 未复发 | components/layout/TabBar.vue:166-170 backdrop-filter: blur(20px) 位于 `/* #ifdef H5 */ ... /* #endif */` 条件编译内（sed 亲验），mp-weixin 不编译该行；本页组件树无其它 backdrop-filter 使用。 |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| R12-IND-PROFILE-INDEX-001 | P2 | Regression | 待修复 | — | 回归核对（R12 提报待查、R13 因截图错位未验证 → 本轮代码确认问题仍在）：未登录态头部「返回 ‹ / 应用中心 / 设置」按钮行与状态栏叠印未修复。NotLoggedProfile 根节点 padding-top 固定 32rpx，未消费页面根已注入的 --statusbar（也未用 env(safe-area-inset-top… | 本轮亲验：apps/client/src/components/profile/NotLoggedProfile.vue:153-157 `.not-logged-profile { min-height:100vh; padding: 32rpx 24rpx 140rpx; }… | （无有效截图——PFI01-after.png 落盘失败 ERROR:timeout waiting for automator response；本轮为代码层… | NotLoggedProfile.vue 根节点 padding-top 与 .nlp-topbar 改 `calc(var(--statusbar, env(safe-area-… |
| MP-R1-PROFILE-215 | P3 | Regression | 待修复 | — | 203..214 簇「分享假实现」子项残留（簇主体 P2 修复已落地，此子项历史上未随簇修掉，非修复后回退；A2 同轮同定级 P3，位于 ask 描述的 P2/P3 簇带内）：本人态 MyHeader 头部分享图标仍是假实现——点击仅 toast「分享功能即将上线」。页面级 onShareAppMessage（index.vue:1498… | 本轮亲验：apps/client/src/components/profile/mine/MyHeader.vue:22-24 `function handleShare() { uni.showToast({ title: "分享功能即将上线", icon: "none" })… | （无截图——代码复核；PFI10 交互取证因选择器 element not found 未取到该图标行为） | MyHeader 分享图标改 `<button open-type="share">`（样式重置参照 index.vue .profile-share），或移除该图标保留设置入口。 |
| MP-R1-PROFILE-216 | P3 | Regression | 待修复 | — | 203..214 簇「850+ 行不可达模板」清理的残留（不可达模板本身已删、未复发）：style 块内约 90 个选择器族（约 600 行）成为死 CSS——对应模板节点均已不存在；另 .profile-top-bar 内连续两条相同的 top: 声明为复制粘贴残留（本轮亲验确认）。纯技术债，无行为影响。 | 本轮亲验：pages/profile/index.vue 全文件 grep 无字面 v-if="false"（仅 :60/:1673 两处注释提及死块已删），模板 1640-2153 干净；:2578-2579 `.profile-top-bar` 连续两条完全相同的 `top:… | （无截图——代码复核） | 按死选择器清单整段删除死 CSS 与重复 top 声明（纯删除，无行为影响）。 |
| MP-R1-PROFILE-217 | P3 | Regression | 待修复 | — | 203..214 簇「空 catch」子项残留（try/catch 字面空块已清零，Promise 版漏网；非修复后回退，A2 同轮同定级 P3）：onShow 内两处 `likesStore.fetchLikes().catch(() => {})` 为无注释的空 Promise 拒绝处理器——401/网络失败被完全吞掉，连 dev 诊… | 本轮亲验 grep：apps/client/src/pages/profile/index.vue:1571 `void likesStore.fetchLikes().catch(() => {});`（profileRequestedOnce 分支）；:1589 同句（首次拉… | （无截图——代码复核） | 两处改 `.catch((error) => { if (isDev) console.warn("[ProfilePage] fetchLikes 失败:", error); }… |
| MP-R1-PROFILE-218 | P3 | Interaction | 待修复 | — | MP-R1-PROFILE-207（targetUserId 无复位）主修复确认在位且运行时生效（PFI64），但修复实现引入一处边界回归风险：onTabItemTap 置位的一次性信号未按 tab index 过滤，且复位块在 loadPageUserIdParam 之后无条件执行——「在他人主页点其它 tab 离开（置位 tabRee… | 本轮亲验：pages/profile/index.vue:216-220 `let tabReentered = false; onTabItemTap(() => { tabReentered = true; });`（未按 event.index 过滤）；:1546-1556… | （无截图——代码推演；onTabItemTap 实机触发方向无法静态证实） | onTabItemTap 回调改 `({ index }) => { if (index === 4) tabReentered = true; }`；复位前检查本次 onShow… |
| MP-R1-PROFILE-219 | P3 | Regression | 待修复 | — | 203..214 簇「胶囊避让不足」子项残留（几何推算，非修复后回退；A2 同轮同定级 P3）：他人态右上角操作条（分享/设置/MatchCountChip）行顶 ≈ statusbar+20px+--sp-5(10px)=statusbar+30px，落入微信胶囊带（约 statusbar+6..+38px）底部 6~8px 纵向重叠；… | 本轮亲验：pages/profile/index.vue:2577-2580 `.profile-top-bar { position:absolute; top: calc(calc(var(--statusbar, env(safe-area-inset-top)) + 20… | （无截图——几何推算；PFI66-68 他人态顶栏元素取证因 pre 环境缺 reLaunch?userId 未取到） | top 调 `calc(var(--statusbar) + 48px)` 下移整行出胶囊带；或 padding-right 改 `calc(var(--capsule-right… |
| MP-R1-PROFILE-222 | P4 | Regression | 待修复 | — | 203..214 簇「5 孤儿组件」清理残留（MyGrowth.vue 已删，其余 3 个仍在源码树；技术债收尾，A2 同轮同定级 P4）：ProfileTabs.vue（页面已卸载，仅自身测试引用）、ProfileEmptyState.vue（全仓 0 引用）、SocialProgressIndicator.vue（0 业务引用）。 | 本轮亲验 ls：components/profile/ProfileTabs.vue、components/profile/ProfileEmptyState.vue、components/social/SocialProgressIndicator.vue 均存在；compon… | （无截图——代码复核） | 删除 3 个孤儿组件文件及其专属 spec，或注明保留理由。 |

- 覆盖声明（原文摘要）：核对范围 = ask 给出的本页 4 条历史条目（MP-R1-PROFILE-201 / MP-R1-PROFILE-202 / R12-IND-PROFILE-INDEX-001 / R1-PROFILE-203..214 簇），逐条独立复核，未做全量索引重读（差分模式）。；执行取证：exec-results.json 中 PAGES-PROFILE-INDEX 全部 71 条（PFI01-71）逐条过目——EXECUTED 33 / FAILED 37 / SKIPPED 1；FAILED 均为自动化选择器 element not found 或截图 saveFile 超限，其中与本回归直接相关者已在各 checked/issue 注明（PFI10 分享、PFI26/27 帖子配图、PFI01 未登录首屏、PFI66-68 他人态顶栏）。多数截图落盘失败（saveFile:fail e…

### SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json — subpackages/village/village/index

- 核对人：历史回归员-R1-SUBPACKAGES-VILLAGE-VILLAGE-INDEX（A5，索引差分模式，只读）｜日期：2026-09-24｜核对条数：7｜立项：2 条
- 方法（摘要）：按 regression-index.json 中本页 7 条相关条目（MP-R1-VILLAGE-002 / MP-R1-VILLAGE-INDEX-101~103 / MP-R2-VILL-013 / MP-R3-VILLAGE-INDEX-001~002）做 riskFiles 差分：逐条实读现码；图文不符族按索引要求实读 src/static/assets/images/posts/post-{1..8}.jpg 八个图片文件建立图像真值后与 mock-data.ts 文案逐对比对；交互证据取本轮 reports/audit/round-1/interact/SUBPACKAGES-VILLAGE-VILLAGE-INDEX-judge.json（48 例：5 VERIFIED / 1 FAILED / 42 UNVERIFIED）与 exec-results.json 引用。未运…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-VILLAGE-002 | subpackages/village/village/index | 未复发 | 修复在位（P0 搜索框伸进胶囊下方）：index.vue:904 `padding-right: calc(var(--capsule-right, 7px) + 112px)`（R3 由 104 加至 112）；:577 页面根节点 `:style="menuStyleVars"` 注入变量；:594-604 搜索框节点（.villag… |
| MP-R1-VILLAGE-INDEX-101 | subpackages/village/village/index | 未复发 | 修复在位（频道切换死代码）：index.vue:607-612 `<ChannelTabs :model-value="currentChannelId" ... @change="onChannelChange">` —— v-model 已移除、页面不监听 update:modelValue，ChannelTabs.vue:28-31… |
| MP-R1-VILLAGE-INDEX-102 | subpackages/village/village/index | 未复发 | 修复在位（报名按钮冒泡误触详情）双证：①代码 components/village/ActivityCard.vue:129 `@tap.stop="enroll"`（mp-weixin 编译为 catchtap）、:62-68 函数内 stopPropagation 保留为 H5 兜底并载明 patchMPEvent NOOP 原因；页… |
| MP-R1-VILLAGE-INDEX-103 | subpackages/village/village/index | 未复发 | 单例已修复且保持（post-7 日落配城堡图 → 已语义一致化）：本轮实读 post-7.jpg 为「热气球 + 金色晨昏原野」，mock-data.ts:427-430 文案「周末去坐了热气球，清晨的日光太治愈了」配同一图，图文一致；:425-426 注释载明改法。tags（:430 #热气球）与标题映射 :969「周末热气球初体验」一… |
| MP-R2-VILL-013 | subpackages/village/village | 未复发 | 原对已消且保持（晚霞帖配热饮图）：services/mocks/fixtures.ts:674-676 文案已由「晚霞」改为「傍晚的光线太适合拍照了。」配 p6.jpg（人像街拍，本轮按注释口径核对为光线/街拍语义，自洽），注释载明「仓库无晚霞实拍图，避免图文不符」；后端 apps/api/src/main/java/com/campus… |
| MP-R3-VILLAGE-INDEX-001 | subpackages/village/village/index | 已复发 | 问题路径仍在（历史 P1 未见修复落地）：按索引 verification「实读图片核对」要求，本轮 Read apps/client/src/static/assets/images/posts/post-{1..8}.jpg 八文件建立图像真值（post-1 城堡 / post-2 热饮杯 / post-3 海岸礁石 / post-4… |
| MP-R3-VILLAGE-INDEX-002 | subpackages/village/village/index | 已复发 | 问题路径仍在（历史 P1 未见修复落地）：stores/village/index.ts:356（mock `this.posts = pageItems;`）与 :363（real `this.posts = data.items.map(mapToPostItem);`）均为整体替换、无追加；对照 fetchPosts :266/:2… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-VILLAGE-INDEX-001 | P1 | Regression | 待修复 | — | 【已复发：历史 P1（MP-R3-VILLAGE-INDEX-001，R3 口径 ≥13 帖）未见修复落地，非本轮新改坏】mock 今日广场/热度榜 feed 批量图文不符仍在，本轮独立实读 8 张 post-N.jpg 建立图像真值：post-1=城堡草坪砾石路、post-2=热饮杯冒热气特写、post-3=暗色海岸礁石、post-4=… | 图像真值：本轮用 Read 工具逐一目视判读 apps/client/src/static/assets/images/posts/post-{1..8}.jpg（非小程序截图）。文案/配图对照 apps/client/src/stores/village/mock-data.t… | 无小程序内截图；图像证据为本轮实读 src/static/assets/images/posts/post-{1..8}.jpg 八文件 | 以实读真值重排配图组：热饮杯=post-2（咖啡/饮品组）、海岸悬崖=post-5、水珠微距=post-4、城堡=post-1、商业街=post-6、海岸礁石=post-3；无对应… |
| MP-R1-VILLAGE-INDEX-002 | P1 | Regression | 待修复 | — | 【已复发：历史 P1（MP-R3-VILLAGE-INDEX-002）未见修复落地，非本轮新改坏】热度榜上拉加载仍为「替换」而非「追加」：页面 onLoadMore hot 分支调 fetchHotBoard(page+1) 期望追加分页，但 fetchHotBoard 两分支均整体替换 this.posts、无拼接——mock `thi… | stores/village/index.ts:356（mock 分支 `this.posts = pageItems;`）、:363（real 分支 `this.posts = data.items.map(mapToPostItem);`）均无追加；对照同文件 fetchPo… | 无截图（代码层实读 + 本轮交互用例 VI39 未取证） | fetchHotBoard 增加追加语义（与 fetchPosts 同法）：mock 分支 `this.posts = page === 1 ? pageItems : [...t… |

- 覆盖声明（原文摘要）：索引差分范围：regression-index.json 全文检索定位本页 7 条相关条目（:377 MP-R1-VILLAGE-002、:690 MP-R2-VILL-013、:3132 INDEX-101、:3147 INDEX-102、:3163 INDEX-103、:3482 R3-INDEX-001、:3498 R3-INDEX-002），逐条核对其 riskFiles 现码与 verification 可用证据，未做全量重读。；代码证据（本轮实读）：subpackages/village/village/index.vue（:178-260 selectChannel/loadChannelData/onPostCreated、:430-448 onLoadMore、:575-619 头部模板/ChannelTabs 接线、:904 搜索框样式）；components/vill…

### SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json — subpackages/village/village/publish（村口·发布帖子）

- 核对人：A5 历史回归审查员（索引差分模式：只核对 riskFiles 与本轮改动/证据相关条目，不全量重读）｜日期：2026-09-24｜核对条数：5｜立项：0 条
- 历史线索入口（摘要）：reports/audit/baseline/regression-index.json

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R2-PUB-002 | subpackages/village/village/publish | 未复发 | 三级分组+懒加载+三态修复全部在位（publish.vue 本轮无改动）：①三级分组 publish.vue:622「公域 · 所有人可见」/628「校园私域 · 同校可见」/645「兴趣圈子 · 圈内成员可见」；②懒加载 watch(targetOpen) 108-112 → ensureCirclesLoaded 92-104；③三态… |
| MP-R1-PUBLISH-001 | subpackages/village/village/publish | 未复发（主体修复在位；死参数残留属历轮未修，已由本批 MP-R1-PUBLISH-107 立项 P3，不重复立项） | 危险面已修：publish.vue:271-291 cycleVisibility 按目标单值收敛（general 仅 ["public"]，272-274 注释引本条），UI 承诺=服务端推导；后端 VillagePostService.java:284-296 deriveVisibility general→public_/camp… |
| MP-R2-VILL-013 | subpackages/village/village | 未复发（晚霞对修复在位）；同族批量不符为历轮已知残留，非本轮回归 | 晚霞对：fixtures.ts:674-676 文案已改「傍晚的光线太适合拍照了。」配 portraits/p6.jpg（人像街拍语义），注释 MP-R1-VILLAGE-INDEX-103 记录改文案对齐画面；grep 热饮/奶茶 在 fixtures.ts 仅命中 whisper 文案(:397)与话题 label(:839)，无帖图… |
| MP-R2-PUB-101 | subpackages/village/village/publish | 未复发（修复在位）；同族新路径病灶（loadTarget 回退不复位 visibility）由本批 MP-R1-PUBLISH-101 另行立项 P1，非本条复发 | friends 分支在位：publish.vue:413-418（注释引 MP-R2-PUB-101）+ 425-433 按 targetType 重算 legalVisibility（general:public/campus:school/circle:interest/friends:friends）。运行时：PUB32 EXECU… |
| R1-PUBLISH-002..014 | subpackages/village/village/publish | 未复发（已修子项全部在位；未修残留为历轮未修非回归，已由本批 MP-R1-PUBLISH-102/103/109 立项） | 已修子项逐一核实：①watch deep=false→已修：publish.vue:460 getter 摊平 () => [...images.value]；②定时器三路径→已修：cancelDraftTimers 337-346 + flushDraftSave 353-360（「保留」路径 476 调用）+ onUnmounted … |


### SUBPACKAGES-VILLAGE-VILLAGE-POST.json — subpackages/village/village/post

- 核对人：A5 历史回归员-R1-SUBPACKAGES-VILLAGE-VILLAGE-POST｜日期：2026-09-24｜核对条数：3｜立项：1 条

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-POST-001 | subpackages/village/village/post | 未复发 | 原 P0「发布钮与微信胶囊碰撞」的 R21 calc 避让修复在位未被改回：post.vue:1057 padding-right: calc(var(--capsule-right, 7px) + 104px)，:1055-1056 注释言明历史碰撞。运行时佐证：R1 实拍 reports/screenshots/round-1-int… |
| MP-R1-POST-101 | subpackages/village/village/post | 未复发 | 「发圈成功后草稿残留→UI 显示个人动态但提交进圈」的六层修复链本轮逐条复核全部在位，未被改回：① suppressDraftSave（post.vue:349）在成功路径先置位（:546）→ clearDraft（:547，其内 :416-426 先取消在途定时器再删 storage）→ 再清表单（:549-553），清表单触发的 wa… |
| MP-R2-VILL-013 | subpackages/village/village（数据链 stores/village/mock-data.ts + fixtures.ts，与本页共享） | 未复发 | 指名问题「晚霞帖配热饮图」未复发：① grep「晚霞」stores/village/mock-data.ts 0 命中（exit=1）、apps/api VillageController.java 0 命中；② services/mocks/fixtures.ts:674-675 注释记载改写（「p6.jpg 实读核对为人像街拍——文案… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-POST-301 | P1 | Regression | 待修复 | — | 【已复发】R3 家族批量图文不符（MP-R3-VILLAGE-INDEX-001 族，R3 口径 ≥13 帖，「注释声称内容与静态资源实图相反；实读图片核对是唯一可靠验证法」）未见修复落地。本轮对 8 张 posts 图库逐一实读定标：post-1=阴天海岸礁石、post-2=欧式城堡、post-3=水珠微距、post-4=冒热气的咖啡杯… | 实读定标：post-4.jpg=咖啡杯特写、post-5.jpg=海岸悬崖（本轮 Read 工具直读两文件）；mock-data.ts:469-470（注释称 post-5=咖啡杯 + post-9 咖啡文案实配 post-5）、:489（post-10 极光清单配 post-4… | 无运行时截图；证据为 8 张 repo 图片实读定标（apps/client/src/static/assets/images/posts/post-1..8.… | 按本轮 8 张实读定标重排 mock-data.ts 21 帖配图（最低限度：:470 post-9 改配 post-4.jpg 咖啡杯；:489/:510 post-10/pos… |


### SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json — subpackages/circles/circles/index

- 核对人：历史回归员-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX（A5，回归索引差分模式）｜日期：2026-09-24｜核对条数：3｜立项：0 条
- 方法（摘要）：回归索引（baseline/regression-index.json）中 riskFiles=apps/client/src/subpackages/circles/circles/index.vue 的全部 3 条条目（MP-R1-CIRCLE-004 P0 指定 + MP-R1-CIRCLE-005 P1 / MP-R3-CIRCLES-001-002 P2 同文件补充）逐一差分：源码实读 × 本轮执行证据（interact/exec-results.json）× 本轮截图目检（含 3x/4x 局部放大）。未改代码、未跑开发者工具。

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-CIRCLE-004 | subpackages/circles/circles/index | 未复发（375px 复拍闭环达成） | 【源码】修复链在位（当前树=HEAD 该区块）：index.vue:742-753 .circle-card__count flex:1+min-width:0+nowrap+ellipsis+fs-xs（R21 注释「省略号必须落在文本节点自身，否则统计行在加入按钮列被硬裁成半字」）；index.vue:721-733 meta now… |
| MP-R1-CIRCLE-005 | subpackages/circles/circles/index | 未复发（达标） | verification 点 circles-stats-and-friends-rows-readable-375px：修复提交 5e2d050c 后构建的 373px 视口截图（CI09-after/CI10-after，Sep 23）显示统计行与好友行均完整可读（详见 MP-R1-CIRCLE-004 证据），与代码注释宣称一致（i… |
| MP-R3-CIRCLES-001-002 | subpackages/circles/circles/index | 未复发 | verification 点 circles-stats-ellipsis-and-button-padding：省略号兜底落在文本节点自身（index.vue:742-753 统计行、945-954 好友行，均 flex:1/min-width:0/nowrap/ellipsis）；加入按钮水平内边距 sp-3/sp-4（index.v… |


### SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json — subpackages/circles/circles/post-topic（兴趣圈·发帖）

- 核对人：—｜日期：2026-09-24｜核对条数：2｜立项：0 条
- 历史线索入口（摘要）：reports/audit/baseline/regression-index.json

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R2-POSTTOPIC-001 | subpackages/circles/circles/post-topic | 未复发 | 源码（本轮实读 post-topic.vue）：上传转换在分支判断之前统一执行——:325-342 `localTopicImages = images.value.filter((img) => !isUploadedMediaUrl(img))`，非 mock 时逐图 `await clientApi.uploadPostImage(… |
| MP-R3-POSTTOPIC-001 | subpackages/circles/circles/post-topic | 未复发 | 源码（本轮实读 post-topic.vue）：`campusPostFallback` 已提升为函数级 let——:318-319 `// catch 分支需按失败来源取 store 文案，故声明在 try 之外` + `let campusPostFallback = false;`（try 之外），:346-347 try 内赋值；… |


### SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json — subpackages/campus/campus/index

- 核对人：历史回归员-R1-SUBPACKAGES-CAMPUS-CAMPUS-INDEX（A5，索引差分模式，只读）｜日期：2026-09-24｜核对条数：3｜立项：2 条
- 方法（摘要）：按 regression-index.json 本页 3 条指定条目（MP-R2-CAMPUSINDEX-001 / MP-R3-CAMPUS-INDEX-001 / MP-R3-CAMPUS-INDEX-002）做 riskFiles 差分：逐条实读现码（index.vue 全文 889 行、App.vue 全文、useMenuButtonRect.ts、useStatusBarHeight.ts、stores/campus.ts 分页段、zh-CN.ts/en-US.ts campus 段、theme/global.scss 头部、check-statusbar-offset.mjs 全文）。实跑 1 项只读静态守卫：node scripts/check-statusbar-offset.mjs（无 --fix）。交互证据取本轮 reports/audit/round-1/intera…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R2-CAMPUSINDEX-001 | subpackages/campus/campus/index | 未复发 | 原缺陷路径（scroll-view 无有界高度 → scrolltolower 永不触发）在现码已不存在，有界高度链闭合（本轮逐行实读）：App.vue:334 page{height:100%} → index.vue:383-387 .campus-page{height:100%; overflow:hidden}（MP-R2-CA… |
| MP-R3-CAMPUS-INDEX-001 | subpackages/campus/campus/index | 已复发 | 见 issue MP-R1-REG-CAMPUSINDEX-001。核心：页面消费 campus.index.hotCirclesTitle/viewMore（index.vue:259-260），键实际在两语言包 campus.postTopic 段（zh-CN.ts:3549-3550、en-US.ts:3470-3471），camp… |
| MP-R3-CAMPUS-INDEX-002 | subpackages/campus/campus/index | 已复发 | 见 issue MP-R1-REG-CAMPUSINDEX-002。核心：页头避让（index.vue:395）+ App.vue page 级 env() 回退避让（App.vue:336）+ --statusbar 仅注入 .campus-page（index.vue:23/:219，本子包 page-meta 零接线）三要素并存，真… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-REG-CAMPUSINDEX-001 | P1 | Regression | 待修复 | — | 【已复发：历史 MP-R3-CAMPUS-INDEX-001（未认证视角渲染 i18n 裸 key）未见修复落地——修复把键补进了错误命名空间，渲染效果与原缺陷一致，非本轮新改坏】页面消费 t('campus.index.hotCirclesTitle')/t('campus.index.viewMore')（index.vue:259-… | 代码（本轮实读）：apps/client/src/subpackages/campus/campus/index.vue:259-260（t 消费 campus.index.*）；apps/client/src/i18n/locales/zh-CN.ts:3508-3526（ca… | reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-INDEX-CX03-after.… | zh-CN.ts 与 en-US.ts 将 hotCirclesTitle、viewMore 两条键从 campus.postTopic 块移入 campus.index 块（zh… |
| MP-R1-REG-CAMPUSINDEX-002 | P1 | Regression | 待修复 | — | 【已复发：历史 MP-R3-CAMPUS-INDEX-002（真机状态栏双重避让）代码链路完整保留，未见修复落地】双重避让三要素现码俱在：① 页头自带避让 .campus-header padding-top = calc(var(--statusbar, env(safe-area-inset-top)) + 20rpx)（index.… | 代码（本轮实读）：apps/client/src/subpackages/campus/campus/index.vue:395（页头避让）、:23+:219（--statusbar 仅注入 .campus-page）、:386-387（定高+overflow:hidden）；a… | 无（真机 env() 行为 DevTools 不可见；本轮静态截图 0 张、交互取证均为 DevTools 会话 env=0，无真机截图可用） | 二选一收敛（与全局导航页统一口径）：A. 本页页头去掉独立状态栏避让（index.vue:395 padding-top 改 20rpx，避让交给 App.vue page 级）；… |


### SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC.json — subpackages/campus/campus/post-topic

- 核对人：历史回归员-R1-SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC（A5，索引差分模式：只核 riskFiles 与本轮改动/证据相关条…｜日期：2026-09-24｜核对条数：1｜立项：0 条
- 方法（摘要）：本页指定核对条目 1 项（MP-R1-CAMPUSPOST-002，P1）。判定未复发：修复代码在位且本轮改动零波及。运行时确认（real 模式多图上传网络面板核键）仍属 A2 已声明的『已修复待终验』范畴，非本轮回归缺口。

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-CAMPUSPOST-002 | subpackages/campus/campus/post-topic | 未复发 | 代码级差分验证，四环节逐一实证：(1) 页面侧唯一文件名修复在位——post-topic.vue:212-215 `name: `campus-topic-${Date.now()}-${uploaded.length}.jpg``，逐图循环 :203-217，已上传 URL 经 isUploadedMediaUrl 跳过但 upload… |

- 覆盖声明（原文摘要）：回归索引 reports/audit/baseline/regression-index.json 与本页相关条目核对：直接指定项 MP-R1-CAMPUSPOST-002（P1）；索引中同根主题 T5（uploadfile-carries-idempotency-key，riskFiles 含 media.ts/http.ts/api.ts）、MP-R7-UPLOAD-001、R11-FIVE-TYPE-BUGS（uploadpostimage name）——其 riskFiles 已被本轮 diff 差分覆盖（api.ts/http.ts 零改动，media.ts 改动不波及），不另立条目；本轮改动差分（git status 快照 + git diff 实读）：本页上传链 5 文件中 post-topic.vue/services/api.ts/services/http.ts 零改动…

### SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json — subpackages/discover-extra/discover/matching

- 核对人：—｜日期：2026-09-24｜核对条数：2｜立项：0 条

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R3-MATCHING-001 | subpackages/discover-extra/discover/matching | 未复发 | 「匹配页打不开」证伪维持，200ms 无上下文 goBack 兜底未被修坏。① 代码在位：apps/client/src/subpackages/discover-extra/discover/matching.vue:143-147（无 pendingCardId/pendingAction 且 URL 无 cardId/action/… |
| MP-R2-MATCHING-002 | subpackages/discover-extra/discover/matching | 未复发 | 匹配动画双头像统一媒体出口修复未被改回。① 代码在位：matching.vue:14-15（import { resolveMediaUrl } from "../../../utils/media"，注释 MP-R2-MATCHING-002）；matching.vue:38-40（myAvatar = resolveMediaUrl(… |

- 覆盖声明（原文摘要）：按索引差分仅核对指派的两条页面相关条目；回归索引中 riskFiles 含 matching.vue 的另一条目 MP-R1-PAGES-DISCOVER-INDEX-001-002（matching-back-no-card-consumed-error-banner）不在本轮指派清单，未做独立核对（其修复面 consumeCardFromDeck 守卫 matching.vue:171-181 在位仅作旁证记录）。静态截图 0 张（如预期）；运行时证据全部来自 reports/audit/round-1/interact/ 三源（exec-results.json 原始观测为权威，A1 交互 JSON 与 A6 仲裁 JSON 交叉核对，关键截图本轮逐张目验）。

### SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json — subpackages/chat/chat-session/index

- 核对人：历史回归员-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX（A5，索引差分模式：只核对 ask 给出的 2 条页面相关历史条目，只…｜日期：2026-09-24｜核对条数：2｜立项：0 条
- 方法（摘要）：逐条差分结论：两条历史条目修复本体均在当前工作树验证在场，均未复发。R13-CHAT-409 的核心修复（幂等键+净化器）经 git diff HEAD 确认为工作树未提交状态（git log -S "idem-conv" 零命中）；MP-R2-001 的布尔契约修复已随 29a2b1df 入库。运行时局限如实记录：本轮交互用例（exec-results.json，45 例中 33 例 FAILED 均为 element not found 取证失败）未真正跑通发送/二次进入流，409 delta 与连续同文案错误两条 verification 键（chat-session-second-entry-no-409 / chat-consecutive-same-error-still-surfaced）无运行时覆盖——回归结论建立在代码层证据上，运行时复测留给终验轮。未复发，不生成 Reg…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| R13-CHAT-409 | subpackages/chat/chat-session/index | 未复发 | 代码层三道防线本轮逐一实读在场：① 幂等键唯一化 apps/client/src/stores/messages.ts:885-896——createSession POST /messages/conversations 携带按调用唯一键 `idem-conv-${userBId}-${Date.now()}-${random}`，注释… |
| MP-R2-CHAT-CHAT-SESSION-INDEX-001 | subpackages/chat/chat-session/index | 未复发 | 「errorMessage 文案差分检测」已彻底移除，替换为确定性信号，本轮实读在场：① store 布尔契约 apps/client/src/stores/chat/actions/messaging.ts:55-64、115-124——sendText 返回 Promise<boolean>，成功 true / 失败写 errorMe… |

- 覆盖声明（原文摘要）：索引差分范围：regression-index.json 全 288 条中筛出本页面相关 11 条（T3/T4/T7/MP-R2-CHAT-001/MP-R1-CHAT-SESSION-001/002/MP-R4-CHAT-001/INDEP-002/R13-CHAT-409/MP-R2-CHAT-CHAT-SESSION-INDEX-001/MP-R1-CHAT-CHAT-SESSION-INDEX-001-005/006-012），按 ask 指定仅深核 R13-CHAT-409（P0，回归重点）与 MP-R2-CHAT-CHAT-SESSION-INDEX-001（P1）两条；其余条目未在本次 ask 范围内不展开。；源码实读：messages.ts:875-984（createSession/sendMessage 幂等键与契约）、chat-session/index.vue:85…

### SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX.json — subpackages/chat/official-chat/index

- 核对人：历史回归员-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX（A5 索引差分模式：只核对历史条目是否复发，只读清单/代码/证据，不…｜日期：2026-09-24｜核对条数：1｜立项：0 条
- 方法（摘要）：回归索引 reports/audit/baseline/regression-index.json 共 288 条，其中 riskFiles 含 apps/client/src/subpackages/chat/official-chat/index.vue 的 11 条；ask 指定本轮核对条目 MP-R1-OFFICIAL-003（P0）。差分基线：当前工作树源码逐行重读 + git 提交差分（该文件本轮两笔提交 5e2d050c / b3d31fcd、工作树 diff 为空）+ 本轮交互执行结果 reports/audit/round-1/interact/exec-results.json（gitSha aefd8a72，OC01-OC26 共 26 条）+ 截图目检 reports/screenshots/round-1-interact/（OC12 before/after +…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-OFFICIAL-003 | subpackages/chat/official-chat/index | 未复发 | 历史问题「最后一条消息被输入栏截断（P0）；R21 同病复发再修（scroll-into-view 底部锚）」的修复路径在当前工作树完整存在且本轮未被触碰。①代码：apps/client/src/subpackages/chat/official-chat/index.vue:176 BOTTOM_ANCHOR_ID、:191-199 s… |


### 次要20.json — subpackages/village: detail/tag-posts/history；subpackages/circles: topics/topic-detail/circle-home；subpackages/campus: topic-detail/certification

- 核对人：历史回归审查员-R1-次要20（A5，索引差分模式：只核对 riskFiles 与本轮改动/证据相关的条目）｜日期：2026-09-24｜核对条数：14｜立项：2 条
- 实际运行命令（摘要）：git status --porcelain / git diff HEAD（改动面确认）；node compiler-sfc(vue 3.4.21) parse 8 页：errors:0、styles:1、orphan-after-style:no、detail.vue viewer-css-in-block:true；Read apps/client/src/static/assets/images/posts/post-4.jpg（视觉实证：冒热气的杯子）；git log --oneline -S maxlength -- campus/topic-detail.vue → 空输出（该文…
- 历史线索入口（摘要）：reports/audit/baseline/regression-index.json（4430 行全读，按 riskFiles 与 8 页面 + 本轮改动文件差分）

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R2-VILL-013 | subpackages/village/village（detail 等 scope 页渲染） | 已复发 | 同族批量图文不符仍在：mock-data.ts:483-493 post-10 极光帖配 post-4.jpg，本会话 Read 实读该图=冒热气的杯子（与原始线索同型）；fixtures.ts:674-675 仅修一处。详见 Issue MP-R1-VILLAGE-REG-001。 |
| MP-R1-DETAIL-001 | subpackages/village/village/detail | 未复发 | 双案由均核：①查看层样式案（historical-issues:300 原『待修复』）——detail.vue:3223-3237 .image-viewer/.image-viewer__img 已在 style 块内（R19 修复注释在位），本会话以项目 vue 3.4.21 compiler-sfc 实跑 parse：errors:… |
| MP-R1-TAGPOSTS-001 | subpackages/village/village/tag-posts | 未复发 | tag-posts.vue:128-142 mock 分页 from 错位修复注释在位（『原 from=page*PAGE_SIZE 整体错位一页』）+ real 分页 hasMore=data.length>=PAGE_SIZE（:191）；exec-results VT06（下拉重置页码）/VT07（上拉+没有更多）EXECUTED。 |
| MP-R1-TAGPOSTS-002 | subpackages/village/village/tag-posts | 未复发 | tag-posts.vue:250-254 goBack 栈深判断+reLaunch 村口兜底在位；VT02（栈=1 reLaunch 兜底）/VT08（缺参 Toast+600ms 返回）EXECUTED。 |
| MP-R1-HISTORY-001 | subpackages/village/village/history | 未复发 | history.vue:38-46 MP-R1-HISTORY-001 修复注释+goBack 栈底 reLaunch 兜底在位；VH02 EXECUTED。本轮 refresher-triggered 改动（isRefreshing→loadingHistory，loadingHistory 来自 storeToRefs :26）经 V… |
| MP-R1-TOPICS-016 | subpackages/circles/circles/topics | 未复发 | topics.vue:524-535 头像三态：resolveMediaUrl(image)→@error 占位→initialOf 文字兜底，无灰色相机占位；CT06（作者头像进主页）EXECUTED；historical-issues.md:191 标已修与现状一致。 |
| MP-R1-TOPICDETAIL-001 | subpackages/circles/circles/topic-detail | 未复发 | circles/topic-detail.vue:46-48 hasMoreReplies=replies.length<服务端 replyCount、:318-319 徽标用服务端 replyCount（review #54 注释）；本会话 mock 徽标-回复一致性脚本核对 0 矛盾。 |
| MP-R1-TOPICDETAIL-001-401 | subpackages/circles/circles/topic-detail | 未复发 | 401 误渲染主案由修复在位：:231-232 network 分支注释（『401/网络失败被误渲染成话题不存在；现加 network 分支+重试』）、:391 错误态与不存在态区分、CD12 EXECUTED。备注：goBack 仍调 clearCurrentTopic（:146），验证项 topic-detail-back-does-… |
| R10-P1-001 | subpackages/circles/circles/circle-home | 未复发 | circle-home.vue:88-90 circlesFetchSettled 骨架防误判（useMock 直返/useMock() true 前不判空）在位；CH01 EXECUTED（冷启动骨架→内容，未闪『圈子不存在』）。 |
| MP-R1-CIRCLEHOME-001-004 | subpackages/circles/circles/circle-home | 未复发 | ①朋友已加入 real 恒 0：:212 useMock() false 返回 0；②动态卡点击：CH06 EXECUTED（MP-R1-CIRCLEHOME-002 修复）；③分享按钮：CH03 EXECUTED（open-type=share 原生分享）；④点赞接线在位（toggleLike 本地翻转）；CH07/CH08 快击 FA… |
| MP-R1-CIRCLEHOME-001-002 | subpackages/circles/circles/circle-home（第四周期 real 演示动态） | 未复发 | circle-home.vue:110/:116 circleTags/pinnedNotice real 恒空数组、:267-268 feedItems real 空时返回 [] 不回退 mock；本轮 +v-if 改动（tag-row/pinned-card 空容器抑制）与该修复同向强化，diff 已逐行核对无冲突。 |
| R12-IND-TOPICS-001 | subpackages/campus/campus/topic-detail | 未复发 | campus/topic-detail.vue:254-256 errorMessage→EmptyState type=network 分支在位（401/网络与『话题不存在』区分）；XT01（冷启动渲染正常）EXECUTED；campus/topic-detail.vue 本轮无改动。 |
| MP-R1-TOPIC-DETAIL-001-002 | subpackages/campus/campus/topic-detail | 已复发 | maxlength 子项修复缺失（historical-issues.md:248 标『已修』）：input 无 maxlength（:271-277，全文件 0 命中）、store 提交无长度校验（campus.ts:696-709）、git -S maxlength 该文件 0 提交（本会话实跑）。重复追加子项未复发（campus.t… |
| MP-R1-CERT-101 | subpackages/campus/campus/certification | 未复发 | certification.vue:13-15 修复注释（『onMounted 不再执行——需 onShow 重拉实名门槛』）+ :261-263 onShow(()=>void loadRealNameGate()) 在位；XC11 FAILED 为脚本 .gate-banner__btn 选择器未解析（工具失败非业务反证）。 |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-VILLAGE-REG-001 | P1 | Regression | 待修复 | — | MP-R2-VILL-013（晚霞帖配热饮图，P1）未彻底修复、同族批量图文语义不符复发成立：services/mocks/fixtures.ts 仅修 p6.jpg 一处文案（674-675，MP-R1-VILLAGE-INDEX-103 注释），主 feed 数据源 stores/village/mock-data.ts 成批未治理—… | stores/village/mock-data.ts:483-493（post-10 images=[resolveMediaUrl×3('/static/assets/images/posts/post-4.jpg')]，无治理注释）；Read post-4.jpg=热饮杯特… | 不适用（回归核对：代码 + 图片素材实读 post-4.jpg） | 按文案语义重排 mock-data.ts mockPostsRaw 的 images 映射（post-10 换风景素材或改文案；post-9/19、post-16/24/33 同批… |
| MP-R1-CAMPUSTOPIC-REG-001 | P1 | Regression | 待修复 | — | MP-R1-TOPIC-DETAIL-001-002（campus/topic-detail mock 分页重复追加/maxlength，P1）的 maxlength 子项复发（修复缺失）：historical-issues.md:248 记「mock 回复重复追加 3→6；输入无 maxlength \| 已修」，但当前代码输入框无 ma… | campus/topic-detail.vue:271-277（<input v-model=replyContent> 属性串无 maxlength，全文件 grep maxlength 0 命中）；:46-49 submitReply 仅 trim 判空；stores/cam… | 不适用（回归核对：代码 + git -S 历史） | campus/topic-detail.vue:273 input 补 :maxlength="140"（确认后端上限后对齐常量），必要时 submitReply 前置长度校验+t… |

- 覆盖声明（原文摘要）：索引差分口径：regression-index.json 全文 4430 行通读，riskFiles 命中本 8 页面或本轮改动文件（circle-home.vue/history.vue/circle.ts/campus.ts）的条目逐条核对；与页面无 riskFile 交集的条目（如 publish/post/hub/messages 族）未展开。；本轮 4 个改动文件与历史修复的相容性逐行核对：circle-home.vue v-if 改动强化 real 不渲染空容器、history.vue refresher 绑定改绑定既有 store 字段、circle.ts/campus.ts 仅时间格式化收敛（utils/time.ts:188 formatDateTime/:358 getCurrentLocale 导出实证），均未触碰 401/点赞/分页/栈底守卫等历史修复路径。；两条指…

### 次要21.json — subpackages/discover-extra/home/segment、subpackages/discover-extra/nearby/people、subpackages/discover-extra/discover/history、subpackages/discover-extra/likes/index、subpackages/discover-extra/likes-visitors/index、subpackages/tools/daily-question/index、subpackages/tools/love-center/index、subpackages/tools/help/index

- 核对人：历史回归审查员-R1-次要21（A5，回归索引差分模式，只读）｜日期：2026-09-24｜核对条数：2｜立项：2 条
- 方法（摘要）：先读 reports/audit/baseline/regression-index.json（4430 行全量 grep 定位本 8 页相关条目），仅核对指派的 2 条页面相关历史条目（MP-R1-HELP-101 / MP-R2-SEGMENT-001）的 riskFiles+verification 差分；源码本人直读，运行时证据取 reports/audit/round-1/interact/exec-results.json（manifest=次要21 的 S11-c21a/S12-c21b 套件）。未改任何代码，未运行开发者工具。
- 历史线索入口（摘要）：regression-index.json:3216 subpackages/tools/help（第四周期 R1 回归证实仍未修：复制到的是文案标签而非邮箱地址）→ 本轮 MP-R1-HELP-101；regression-index.json:3388 subpackages/discover-extra/home/segment（第四周期 R2：头像裸直连相对路径，verification=segment-avatar-via-media-resolver）→ 本轮 MP-R2-SEGMENT-001；关联上下文（未列入核对产出，属其他维度）：:1449 MP-R1-SEGMENT-00…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-HELP-101 | subpackages/tools/help/index | 未复发 | 代码级直证已修复：help/index.vue:60-71 copyEmail 复制 APP_CONFIG.SUPPORT_EMAIL（config/app.ts:47='support@campuslove.app'，grep 验证），带 MP-R1-HELP-101 修复注释；i18n toast 键 emailCopied（zh-C… |
| MP-R2-SEGMENT-001 | subpackages/discover-extra/home/segment | 未复发 | 代码级直证已修复：segment.vue:149 头像 :src=resolveMediaUrl(item.avatar) \|\| resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR)（import 见 :15）；utils/media.ts:129-243 空值守卫（:131-140）+ /uploads… |

| ID | 级别 | 类别 | 状态 | 关联交互用例 | 问题（摘要） | 证据（摘要） | 截图 | 修复建议（摘要） |
|---|---|---|---|---|---|---|---|---|
| MP-R1-HELP-101 | P1 | Regression | 已修复待终验 | — | 【历史线索回归核对·未复发（代码级）】「客服邮箱-复制」复制文案标签而非邮箱地址——本轮源码直读证实已修复：copyEmail 复制 APP_CONFIG.SUPPORT_EMAIL 真实地址并留有修复注释。运行时终验未达成：本轮交互执行 HP06 虽标记 EXECUTED，但 observed 为 navError=timeout、全部… | help/index.vue:60-71 copyEmail → uni.setClipboardData({ data: APP_CONFIG.SUPPORT_EMAIL })，:62-64 留有「MP-R1-HELP-101：复制真实邮箱地址」修复注释并注明原实现复制 t("… | reports/screenshots/round-1-interact/SUBPACKAGES-TOOLS-HELP-INDEX-HP02-after.png… | 原缺陷无需再改；补一轮有效终验：重跑 HP06 取剪贴板读回值（automator 超时为环境问题，可参考同页 HP04/HP05 的 tap 成功路径），或手工真机复制后回贴验证… |
| MP-R2-SEGMENT-001 | P1 | Regression | 已修复待终验 | — | 【历史线索回归核对·未复发（代码级）】头像裸 image 直连相对路径（real 裂图）——本轮源码直读证实已修复：列表头像全量经 resolveMediaUrl() 统一出口解析并带 DEFAULT_AVATAR 兜底，不再裸连相对路径。且本轮 utils/media.ts 的未提交改动（git diff +18 行）为纯新增 R13 … | segment.vue:149 `:src="resolveMediaUrl(item.avatar) \|\| resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR)"`；segment.vue:15 import resolveMediaUrl；u… | reports/screenshots/round-1-interact/SUBPACKAGES-DISCOVER-EXTRA-HOME-SEGMENT-SG0… | 原缺陷无需再改；补终验：real 构建下打开 /subpackages/discover-extra/home/segment 并断言 .segment-row__avatar 图… |

- 覆盖声明（原文摘要）：回归索引：4430 行 grep 全量定位本 8 页相关条目（segment×2、help×2、likes×4、daily-question×1、love-center×5、nearby/people×2 关联），确认指派 2 条的原始出处与 verification 项。；MP-R1-HELP-101：help/index.vue 全文 294 行直读 + config/app.ts、zh-CN.ts/en-US.ts、images.ts 关键值 grep 直证 + HP01-HP09 运行时记录逐条核对。；MP-R2-SEGMENT-001：segment.vue 全文 306 行直读 + utils/media.ts resolveMediaUrl 函数体（129-243）直读 + git diff 本轮未提交改动核对 + SG01-SG08 运行时记录逐条核对。；未运行任何写操作/…

### 次要22.json — —

- 核对人：历史回归员-R1-次要22（A5）｜日期：2026-09-24｜核对条数：3｜立项：0 条
- 方法（摘要）：索引差分模式：读 reports/audit/baseline/regression-index.json 按 riskFiles/verification 对本页 3 条历史条目逐一核对；证据 = 源码 Read/grep + 本轮 git diff + reports/audit/round-1/interact/exec-results.json（1283 条结果过滤）+ reports/screenshots/round-1-interact/ 截图目视（MBTI/NB01/NB03 共 3 张）。未改代码、未跑开发者工具。未复核 A2 层 code-findings/次要22.json 之外的全量条目（按任务仅核对指定的 3 条页面相关历史条目）。

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-LNEARBY-101 | subpackages/tools/love-center/nearby | 未复发 | 代码：nearby.vue:99-107 左滑传本地快照 swipeLeft(cardId, snapshot)、右滑 swipeRight(cardId,false,本地card)，:111 matched 分支 userId 取本地 card?.userId，:119/:143/:155-157 removeLocalCard 同步推… |
| MP-R1-LMBTI-101 | subpackages/tools/love-center/mbti | 未复发 | 代码：mbti.vue:139-145 返回键与标题同处 .content-header 弹性行（返回键在前、标题随后）；:284-296 .content-header 为普通 flex 行 + .content-header__back 64rpx 流内元素，grep「absolute」全文件仅 :283 历史注释 1 处（记载原右上… |
| MP-R2-SEARCH-001 | subpackages/tools/search/index | 未复发 | 代码：search/index.vue:331 用户结果头像 :src="resolveMediaUrl(u.avatarUrl) \|\| resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR)"、:375 校园预览头像同模式；全文件仅此两处 avatar 绑定（:657/:735 为样式），其余 image… |

- 覆盖声明（原文摘要）：核对范围与命令：① reports/audit/baseline/regression-index.json（288 条）python 过滤 8 个页面关键词，确认任务指定的 3 条为本页需核对条目及其 verification 钩子（lnearby-swipe-advances-card / lmbti-back-btn-clear-of-capsule / search-avatars-via-media-resolver）；② exec-results.json（gitSha aefd8a72，1283 条）python 过滤 page∈8 页共 29+ 条目，NB01-NB09/MB01-MB08/CO01-CO04/AD01-AD08/SC01-SC13/SE01-SE11/HS01-HS11/ST01-ST25 状态逐一过目，重点取 NB03/04/05、MB01、SE03；③…

### 次要23.json — subpackages/profile-extra/{verification/index,verification/real-name,profile/visitors,profile/other,profile/location,profile/privacy,profile/album,profile/favorites}；回归索引条目差分：MP-R1-VERIFY-INDEX-001、MP-R1-OTHER-002、MP-R2-OTHER-001（对应索引 verification key：verification-navbar-below-statusbar / other-whisper-entry-reachable-and-functional / other-page-images-via-media-resolver）

- 核对人：历史回归员-R1-次要23｜日期：2026-09-24｜核对条数：3｜立项：0 条
- 方法（摘要）：索引差分 + 只读核验：①读 reports/audit/baseline/regression-index.json（288 条）筛出本 8 页 riskFiles/verification 相关条目；②逐条读当前工作区源码核验问题路径是否仍存在；③读 reports/audit/round-1/interact/exec-results.json（gitSha aefd8a72，1283 条）按 page 过滤 profile-extra 145 条并逐条看 failureReason/observed；④核对 reports/screenshots/round-1-interact/ 与 round-1/{A,B} 截图；⑤git diff 核对本轮工作区未提交改动（verification/index.vue、album.vue、RelationshipCTA.vue 各 1 处 …

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-VERIFY-INDEX-001 | subpackages/profile-extra/verification/index | 未复发 | 代码级：verification/index.vue:462 `<view class="safe-top" />` 前置于 :465 `<view class="nav-bar">`（:458-460 注释记录 R10-P2-012 根因模式）；--statusbar 经 useMenuButtonRect 注入（index.vue:2… |
| MP-R1-OTHER-002 | subpackages/profile-extra/profile/other | 未复发（代码级链路闭合）；运行时正图缺，留交互轮终验 | 代码级（全链闭合，修复提交 b3d31fcd 2026-09-22 05:49）：发射点 RelationshipCTA.vue:54 `@tap="emit('whisper')"`（emits 声明 :22，心动卡按钮在 CTA bar 第 3 位、无 v-if 条件渲染 :53-57）→ PublicProfile.vue:86 `… |
| MP-R2-OTHER-001 | subpackages/profile-extra/profile/other | 未复发 | 代码级（三处裸直连均已收敛到统一解析出口，与图片查看层同源）：①相册缩略图 PublicGallery.vue:20 `:src="resolveMediaUrl(photo)"`；②最近动态头像/配图 PublicMoment.vue:60/:78 均 resolveMediaUrl；③封面/头像 PublicHero.vue:13/:… |


### 次要24.json — subpackages/profile-extra/{profile/tasks,settings/dnd,feedback/history}、subpackages/setup/{profile/index,campus/index,schedule/index,recommend-pref/index,interest/index}；回归索引条目差分（riskFiles 命中本批页面）：MP-R1-TASKS-001-003、MP-R1-TASKS-004-005、T13(tasks 部分)、MP-R1-DND-001、MP-R1-DND-002、T14(dnd 部分)、MP-R1-FEEDBACK-001、MP-R1-HISTORY-001(feedback/history 部分)、MP-R1-FEEDBACKHIST-001、R11-MATRIX-STUCK(feedback-history 部分)、T15(feedback-history 部分)、MP-R5-AVATAR-500、MP-R6-EDITFLOW、P4-PHOTOWALL-NO-ECHO、MP-R1-SETUPCAMPUS-001、R13-TSC-DEFECTS(schedule 部分)、T16(schedule 部分)、MP-R1-SETUPINTEREST-001-002、MP-R1-SETUPINTEREST-003、MP-R9-STATUS-005

- 核对人：历史回归员-R1-次要24｜日期：2026-09-24｜核对条数：20｜立项：0 条
- 方法（摘要）：索引差分 + 只读核验：①读 reports/audit/baseline/regression-index.json，按 riskFiles 命中本批 8 页筛出 20 条相关条目；②逐条读当前工作区源码（8 页 .vue + stores/{session,feedback,profile}.ts + composables/{useMenuButtonRect,useStatusBarHeight}.ts + utils/time.ts + apps/api MediaUploadController/LocalMediaStorageService）核验问题路径是否仍存在，全部行号亲读；③读 reports/audit/round-1/interact/exec-results.json（gitSha aefd8a72，1283 条，按 page 过滤本批页面 106 条逐条看 s…

| ID | 页面 | 状态（原文） | 证据（摘要） |
|---|---|---|---|
| MP-R1-TASKS-001-003 | subpackages/profile-extra/profile/tasks | 未复发 | 修复在位（提交 5e2d050c 引入）：tasks.vue:269-284 签到走真实 clientApi.checkIn() 后置 checkinDone.value=true（:275）驱动 localTasks/积分卡/进度条当页重算（MP-R1-TASKS-001），toast 用 task.points 真实积分而非连续天数（… |
| MP-R1-TASKS-004-005 | subpackages/profile-extra/profile/tasks | 未复发 | 修复在位（b3d31fcd）：tasks.vue:186-187 loadRealTasks(force) 保留 load-once 守卫但领取成功后 :324 await loadRealTasks(true) 强制刷新（MP-R1-TASKS-004）；onShow 内 :343-344、:357-358 均为 await sessi… |
| T13 | subpackages/profile-extra/profile/tasks（T13 全用点中与本批相关的 tasks 部分） | 未复发 | tasks.vue 交互全部为 @tap 实绑定（:377 返回键 goBack、:411 任务项 handleTaskTap），无死交互；本批 8 个页面文件 grep catchtap 零命中（grep -l catchtap 对 8 文件无输出）。运行时 TK02-TK06 点击均有响应/跳转。备注：全仓 .vue 仍存 48 处 … |
| MP-R1-DND-001 | subpackages/profile-extra/settings/dnd | 未复发 | 修复在位（5e2d050c 引入）：dnd.vue:281-288 goBack 深链栈守卫——getCurrentPages().length>1 走 navigateBack，栈=1 兜底 uni.switchTab({url:'/pages/profile/index'})，与入口链路（设置→我的）一致。运行时 DND11 EXEC… |
| MP-R1-DND-002 | subpackages/profile-extra/settings/dnd | 未复发 | 修复在位（b3d31fcd 引入）：dnd.vue:314 .safe-top 先于 :317 .nav-bar 渲染（DOM 顺序已纠正），:309 根节点 :style="menuStyleVars" 注入，:560-564 .safe-top 高度 calc(var(--statusbar, env(safe-area-inset-… |
| T14 | subpackages/profile-extra/settings/dnd（T14 返回/栈底守卫族中 dnd 点位） | 未复发 | T14 对 dnd 的核验点 stack1-back-dnd-switchtab-profile 与 console-zero-navigateback-unhandled-rejection：前者即 MP-R1-DND-001（dnd.vue:281-288 栈守卫在位）；后者 dnd.vue 全文无裸 navigateBack-wit… |
| MP-R1-FEEDBACK-001 | subpackages/profile-extra/feedback/history | 未复发 | 修复在位（5e2d050c 引入）：history.vue:195-203 formatSubmissionTime= formatDateTime(iso,'full',getCurrentLocale())，不再直出 ISO 串；模板 :331 record__time 用该函数；utils/time.ts:188 formatDat… |
| T15 | subpackages/profile-extra/feedback/history（T15 文案/编码族中 feedback-history-time-human-format 点位） | 未复发 | 与 MP-R1-FEEDBACK-001 同点同证：history.vue:195-203+331 本地化时间格式化在位（5e2d050c），utils/time.ts:188 依赖存在；FH01-FH09 EXECUTED 页面无渲染异常。 |
| MP-R1-HISTORY-001 | subpackages/profile-extra/feedback/history（MP-R1-HISTORY-001 双页条目的 feedback/history 部分） | 未复发 | history.vue:210-251 loadQueryId 深链 ?id=N 双端解析（MP-WEIXIN options / H5 URLSearchParams）300ms 后自动展开，且 SubTask 1.5.2 定时器引用保存+onUnmounted 清理（:47-57）；:145-172 toggleExpand 懒加载 … |
| MP-R1-FEEDBACKHIST-001 | subpackages/profile-extra/feedback/history | 未复发 | 修复在位（b3d31fcd）：stores/feedback.ts:25-36 load() 内 try/catch 写 this.errorMessage（不再裸吞），history.vue:108-114 loadList 读 store.errorMessage 映射页面错误态（死代码激活），:288-298 error-card+… |
| R11-MATRIX-STUCK | subpackages/profile-extra/feedback/history（R11 STUCK/骨架场景族中 feedback-history 点位） | 未复发 | history.vue:260-262 onShow 必调 loadList，页面无永驻骨架分支（空态走 :301-306 EmptyState）；FH01 EXECUTED 且 dom .filter-chip:present .error-card:absent——页面正常出内容非 STUCK。R11 当时 12 页 STUCK 已由… |
| MP-R5-AVATAR-500 | subpackages/setup/profile/index（头像上传 500，风险文件在 apps/api 与 api/profile.ts/voice-upload.ts） | 未复发 | 白名单在位：apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java:437-451 normalizeType 将 'image'/'background'/'avatar' 归一为 image（:442 明含 avatar），avatar… |
| MP-R6-EDITFLOW | subpackages/setup/profile/index | 未复发 | 修复在位（2026-09-14 重写携带，87ffeb16 提交）：setup/profile/index.vue:52-57 onLoad 解析 entry=edit 置 entryMode；:519-534 navigateAfterSave——edit 模式 navigateBack（栈=1 兜底 switchTab ROUTES.… |
| P4-PHOTOWALL-NO-ECHO | subpackages/setup/profile/index（照片墙当次不回显，P4 决策记录项） | 未复发 | 无回归性复发；基线决策记录已过期：stores/profile.ts:827-847 uploadPhotoAtIndex 成功后即时 this.photoGallery=next（:845）并 syncBasicProfileGallery（审核项 pending），setup/profile/index.vue:419 照片墙渲染绑定… |
| MP-R1-SETUPCAMPUS-001 | subpackages/setup/campus/index | 未复发 | 结构性不存在：campus/index.vue 全文件仅 1 处 showModal（:106-113 showPrivacyInfo）且 showCancel:false 单确认键——无 cancel 路径可产生 unhandled rejection；grep captureException 全文件零命中。该页自 628d5f06（… |
| R13-TSC-DEFECTS | subpackages/setup/schedule/index（R13 vue-tsc 族中 schedule-ref-import 点位） | 未复发 | 本轮工作区 1 行 diff 即该修复本体：git diff HEAD -- apps/client/src/subpackages/setup/schedule/index.vue = import 由 { onMounted, reactive } 补为 { onMounted, reactive, ref }；HEAD（aefd8a… |
| T16 | subpackages/setup/schedule/index（T16 作用域/未导入引用崩溃族中 schedule 点位） | 未复发 | 与 R13-TSC-DEFECTS schedule 点位同点同证：工作区 schedule/index.vue:9 import { onMounted, reactive, ref } from 'vue'（:50 ref(false) 可解析）；SC01 EXECUTED 页面挂载正常（boot/page-mount 无 Refer… |
| MP-R1-SETUPINTEREST-001-002 | subpackages/setup/interest/index | 未复发 | 修复在位（5e2d050c + aefd8a72 补强）：interest/index.vue:42-53 保存前先 GET 全量资料合并 interestTags 再 PUT（-002 全量语义不再清空其余资料；拉取失败提示重试不盲提）；:55-63 保存后 600ms 栈守卫——栈>1 navigateBack，栈=1 switchT… |
| MP-R1-SETUPINTEREST-003 | subpackages/setup/interest/index | 未复发 | 修复在位（aefd8a72 引入）：interest/index.vue:82-84 仅渲染 :groups="['interest']" 一组，初始化（:17）、回填（:20-30）、校验（:36-39）、保存（:35/:53）均只处理 interest——原「4 组可见可选、保存静默丢弃其余 3 组」的问题路径已不存在。关键证据辨析：… |
| MP-R9-STATUS-005 | subpackages/setup/interest/index | 未复发 | 修复在位（a5916844 09-16，早于探针运行，运行时证据有效）：interest/index.vue:7-8/15 引入 useMenuButtonRect 注入 --statusbar，:96-97 padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + 24… |


