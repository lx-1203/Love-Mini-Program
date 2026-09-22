# 历史问题清单基线（historical-issues baseline）

- 生成日期：2026-09-22（本版取代 2026-09-19 版；新增「第三周期 R21 交互审计」全部发现）
- 生成方式：通读 `reports/audit/` 下全部 21 个审计目录共 29 份报告/矩阵/证据（round-1..5 及其 issue-matrix/screenshot-matrix、2026-09-12-round1、2026-09-13-final / -independent / -r3 / -r5、2026-09-14-r6、2026-09-15-r7、2026-09-16-r8 / -r9、2026-09-17-r10-visual（audit+fix）、2026-09-18-r11-full-acceptance（acceptance-plan）、r11-acceptance（audit / chain-results / ideal-comparison / screenshot-matrix）、r12-independent、independent、final×2），并逐条解析 `round-1/interact/*.json`（第三周期交互取证，20 份、527 项 check）与修复提交 `5e2d050c` 的代码 diff 交叉核对。
- 用途：**本轮回归核对的线索库**。任何条目不因最近一轮截图"看起来正常"而视为已解决；"最后状态"只是该问题最后一次被观测到的结果，本轮必须作为回归线索逐条重新核验。
- 轮次对照：round-1..5（2026-09-10/11 视觉周期）＜ 2026-09-12-round1 ~ r12-independent（2026-09-12~19 真实环境周期 R1-R12）＜ round-1/interact（2026-09-19~21 第三周期「R21 交互审计」，修复批 = HEAD 提交 `5e2d050c`，口径 P1×11+P2×26+P3×23=60 项）。
- 范围约束：本文件为唯一写入产物，未改动任何代码/脚本/配置。

---

## 一、反复出现的系统性问题（回归第一优先级）

以下主题在 ≥2 轮中重复出现或一次性暴露系统性根因，是历史复发率最高的区域：

### T1 状态栏叠印 / 避让链路断裂（复发之王：≥6 轮、≥17 处真实缺陷）
- 首发与蔓延：R1 STATUS-017（10/12 页状态栏时间不可见）→ R3 六处（HOME-001、HOME-006、PROFILE-001、DAILY-001/003、MSUCCESS-001/002、SETTINGS-001）→ R8 四处（STATUS-001 likes、002 album、003 heart-signals、004 CardDetailOverlay）→ R9 一处（STATUS-005 兴趣页）→ R10 系统性收口（≥5 页叠印实拍 + 全仓 103 处 `env(safe-area-inset-top)`、~50 页 env-only、`usePageMetaStyle` 注入路径 0 引用死代码、第三套变量 `--statusbar-height`）→ R12 一处待查（PROFILE-INDEX-001 未登录态头部）。
- 根因模式：页面写了 `var(--statusbar, env(...))` 但**没有接 `useMenuButtonRect()` 注入源**（R3 SETTINGS-001 漏实例化即此类），或裸用 `env()`（DevTools/多数机型恒 0）。
- 现有防线：`scripts/check-statusbar-offset.mjs`（R10 建，R11 收紧到 0 err 0 warn + fail-fast 挂 real 构建链）。
- 第三周期 R21 交互审计未新增状态栏叠印项（其新增胶囊/TabBar 遮挡类见 T2/T13），但该防线只查静态语法，**运行时注入失效仍无守卫**。
- 来源：round-1/audit-report.md:36；round-3/audit-report.md:31-36；2026-09-16-r8-independent/audit-report.md:22-25；2026-09-16-r9-newuser-lifecycle/audit-report.md:36；2026-09-17-r10-visual/audit-report.md:45-69；r12-independent/audit-report.md:17。

### T2 胶囊按钮碰撞 / 底部净空 / 元素被原生层遮挡（≥6 轮，第三周期仍复发）
- 历史：R1 POST-001（发布钮与胶囊挤在一起）、VILLAGE-002（搜索框伸进胶囊下）→ R2 HOME-007（「全部›」被裁）→ R4 CAMPUS-001（认证钮被胶囊压住 85%，根因 padding 公式 `7+8` 漏算胶囊本体，改 `7+104`）→ R4 MSUCCESS-001 → R8 CAPSULE-001（「管理」钮压进胶囊，96px 全宽预留）→ R12 SEARCH-001、NEARBY-LC-002。
- **第三周期新增复发**：R21-VISITORS-002（访客页头部「访客记录 · 22」被胶囊遮挡，标题行未避让）、R21-PROFILE-001（我的页「发动态」FAB 约 80% 被自定义 tabBar 白面板遮盖）、R21-DISCOVER-INDEX-003（寻觅页游客入口胶囊 `position:fixed bottom:120rpx` 被自定义 tabBar **原生层**整体遮挡——DOM 在、可点、不可见）。
- 根因模式：只预留右缘间隙漏算胶囊全宽（≈87-104px）；或 fixed 定位元素与 tabBar/胶囊带的层叠与净空冲突。
- 来源：round-1/audit-report.md:15-16；round-4/audit-report.md:34-39；2026-09-16-r8-independent/audit-report.md:26；r12-independent/audit-report.md:12,20；round-1/interact/次要18.json、PAGES-PROFILE-INDEX.json、PAGES-DISCOVER-INDEX.json。

### T3 冷启动/深链直达时的空态竞态与栈底行为（≥5 轮）
- R10-P1-001：圈子主页冷启动/深链直连被误判「圈子不存在或已解散」（空态判定不等 `fetchCircles()` 落定）。修复：`circlesFetchSettled` 门。
- 同类：R4 CHAT-001（userId 深链标题回退「聊天」）、R5/INDEP-002（conv- 业务键被误判临时会话）、R12 TOPICS-001（campus 话题详情 401 静默 → 误渲染「话题不存在」）、R12 PROFILE-OTHER-001（他人主页 401 笼统渲染）。
- **第三周期把"深链直开"从空态扩展到整条返回/兜底链**（见 T14）：tag-posts/history/dnd/settings/verification/real-name/official-chat 等 ≥8 页在栈=1 时返回键失效或抛 unhandledRejection。
- R11 方案已把「每个带参页 reLaunch 冷启动直连、首屏严禁闪现错误空态」列为独立测试维度与 G6 断言（acceptance-plan.md §5/§10.1 G6）。
- 来源：2026-09-17-r10-visual/audit-report.md:71-101；round-5/audit-report.md:13；independent/indep-fix-verification.md:8；r12-independent/audit-report.md:14；2026-09-18-r11-full-acceptance/acceptance-plan.md:112。

### T4 数据契约矛盾 / 静默假数据 / 假空态假零（≥6 轮，且已蔓延进 mock 层）
- 历史主案：IA-TOPIC-01（话题「回复 5」徽标与「暂无回复」同屏，seed reply_count 脱节）→ R3-PROFILE-001（我的页四格冷启动假 0，页面从不触发 fetchLikes）→ R8-LIKES-001（「喜欢我的」永远空态）→ R7-PROFILE-004 / R8-LOCK-001（完成度前端口径 10% vs 后端权威 30%）→ IA-CIRCLEHOME-01（circle-home 缺参静默渲染成套 mock）→ final-verify MP-R6-PROFILE-001（「我的帖子」永远空态，loadMyPosts 无调用点）。
- **IA-TOPIC-01 已三次复发**：2026-09-12 seed 层（R1-CIRCLE-002）→ 2026-09-13 topic 25-28（V2026.09.13.0001）→ **2026-09-20 第三周期 mock 层再犯**（R21-TOPICDETAIL-001：「回复 46」vs「暂无回复」，topic-1 亦 12 vs 3）。
- **第三周期新增 mock/契约矛盾族**：HOME-015（社区动态映射缺 authorId → 作者行可点击元素静默失效）、HOME-016（joinCircle 传 `'1'` 而 mock 圈 id 为 `'circle-photo'`，find 不中静默 return → 「加入」按钮态永不变化）、VISITORS-001（`Number('user-2003')→NaN` 静默 return → 访客卡点击无响应）、CIRCLEHOME-003（缺 `friendJoinedCount` 字段 `|| 0` 兜底成「等 0 位朋友已加入」）、HEARTSIGNALS-002（mock accept/decline 写穿共享固件对象，会话内 pending 永不恢复）、OTHER-001（mock likedBy 不含目标 → alreadyLiked 守卫永不触发，重复喜欢重复成功 toast）、PUB-016（publish 页上限 1000 vs store 校验 500 的前后端契约矛盾）、CHAT-SESSION-001（转发后目标会话 preview 写成非转发内容）。
- 根因模式：空态判定与数据加载不分离（idle/loading/empty/error 未收敛）、前端快照口径与服务端权威值并存、mock 兜底无水印、**字符串/数字 id 与字段名在映射层静默失配**。
- 来源：2026-09-13-independent/INDEPENDENT-AUDIT.md:59-82；2026-09-13-r3/audit-report.md:19-31；2026-09-15-r7/audit-report.md:23；2026-09-16-r8-independent/audit-report.md:27-29；final/final-verify-20260912.md:50-57；round-1/interact/次要14.json、次要17.json、次要18.json、PAGES-HOME-INDEX.json。

### T5 媒体链路（上传/鉴权/渲染/兜底）全链脆弱（≥3 轮集中爆发，4 项 P1「从未通过」级）
- R5（4×P1）：AVATAR-500（normalizeType 白名单缺 avatar → 头像上传 100% 失败）；MEDIA404（extractSubPath 属性语义错 → 所有上传图片读取 404）；MEDIAAUTH（resolveMediaUrl 不给 `/api/v1/media/**` 拼 token → `<image>` 全体回落默认图）；ADMINTHUMB（后台裸 `<img>` 401）。
- R7（6 项）：PROFILE-001/002（相对路径直连 `<image>` 被当包内文件）、PROFILE-003（toLocalImage 不兜底媒体代理路径）、REALNAME-001（DevTools tmp 路径 `http://tmp/xxx` 被误判为服务器 URL → 证件落库 `http://tmp/*`）、UPLOAD-001（uni.uploadFile 不走拦截器 → 缺 Idempotency-Key，**所有文件上传 422**）、ADMIN-IMG（后台直链 401）。
- R10-P1-004：匹配成功页/实名页头像空白白圆（default-avatar 两份同名资源 + 远程 http 图被 base lib 拒渲染）。R4-MATCHING-001：heart_pink.png 全透明空文件。
- 现有约定：媒体代理 URL 一律 `appendTokenIfMissing`；头像兜底唯一真身 `assets/default-avatar.jpg`；`isUploadedMediaUrl()` 判上传；`<image>` mode 有静态守卫。
- 来源：2026-09-13-r5/audit-report.md:15-20；2026-09-15-r7-full-verify/audit-report.md:19-27；2026-09-17-r10-visual/audit-report.md:120-125；round-4/audit-report.md:38。

### T6 草稿 / 发布闭环（≥3 轮）
- R8-DRAFT-001/002（P1）：后端 `DELETE /drafts/current` 恒 500（缺 `@Transactional`）+ 前端发布成功只清本地不清后端 → 每次发布后重进恢复已发布内容（重复发布风险）。
- INDEP-001（P2）：publish.vue snapshotDraft 越界引用 → 每次编辑抛 ReferenceError，草稿双写从不生效。
- **第三周期新增**：R21-PUB-016（正文上限页面 1000 vs store 500：输入 501-1000 字必然发布失败且仅在提交时报错——R5 曾以 720/1000 判 PASS，说明两版发布页/校验层口径不一致）、R21-PUB-017（直入发布页不 fetchCircles，「兴趣圈子」分组静默消失，无加载/空态）、R21-POSTTOPIC-001（圈内发话题发布成功但帖子进村口流而非目标圈，circleId 未生效）、R21-CAMPUSPOST-001（campus 发话题空表单提交静默无 toast）。
- publish/post 双实现并存：R10-P2-013 判「设计如此」保留，但两页上限/校验/分组行为已实测不一致（PUB-016/017 均在 publish 版）。
- 来源：2026-09-16-r8-independent/audit-report.md:31；independent/indep-fix-verification.md:7；round-5/audit-report.md:16；round-1/interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json、次要14.json。

### T7 聊天 / 会话（≥6 轮）
- R1-OFFICIAL-003（P0）：官方号最后一条消息被输入栏截断（从未滚底）。**第三周期 R21-OFFICIALCHAT-001 同病复发**：发送后 `lastMsgBottom-inputTop=+68px` 助手气泡仍被输入栏遮挡（scrollToBottom 交替 99999/100000 在内容增高后失效），长消息发送后视窗完全不滚——R1 的修复对"发送后内容增高"场景不成立。
- R2-MSG-006（P1）：助手卡/角标未读数据源不含通知未读；**遗留 tabBar 消息角标接 custom-tab-bar（P2 待办）**，至今未见闭环记录。
- INDEP-003（P2）：WebSocket 重连不关旧 socketTask → exceed max task count（与「WS connect 0 接线封存决议」并存）。
- R11-6B：会话 `last_message_preview` 残留已删审计消息 → V2026.09.19.0001。**第三周期 R21-CHAT-SESSION-001 再犯同类**：转发消息后目标会话 preview 被写成与转发内容无关的文本（`[语音] 30″` → `哈哈，我也觉得`）。
- **第三周期新增**：R21-CHAT-SESSION-002（临时匿名会话功能面破碎：气泡数 0、长按找不到自己的消息、交换联系方式 `no-session`、结束会话无效果）、R21-MESSAGES-INDEX-002/003（置顶/免打扰操作 store 已生效但页面零可见反馈——分组渲染无 pinned 标识、行内无 muted 图标）、R21-OFFICIALCHAT-002（官方号「···」/「+」/表情三处死按钮，**未见修复引用**）。
- 来源：round-1/audit-report.md:17；round-2/audit-report.md:14,38；independent/indep-fix-verification.md:9；r11-acceptance/ideal-comparison.md:24-25；round-1/interact/次要19.json、SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json、PAGES-MESSAGES-INDEX.json。

### T8 审计/验收数据污染正式库（每轮产生、需清理迁移）
- R10-P3-015：聊天「Round-8 audit: …」、验收帖 225/226、同文案 3 连发 → V2026.09.17.0001 清理。
- R11：QA 帖残留 3 条 → V2026.09.18.0002；会话 preview 残留 → V2026.09.19.0001；**巡检参数表 `?id=225` 因清理失效**（参数表引用会随数据清理腐烂，后改 `?id=1`）。
- R11 chain-results 遗留事实：客户端无「删除帖子/评论」端点，清理只能 SQL 删行；like/评论会写 `interaction_events` 副作用行；`cancel-like` 是软删除。
- 第三周期为 mock 构建取证，未再污染正式库，但反馈历史预置数据「查看详情 404」（R21-FEEDBACK-001 关联项）属演示数据缺口。
- 来源：2026-09-17-r10-visual/audit-report.md:150；r11-acceptance/audit-report.md:53-55,86-88；r11-acceptance/chain-results.md:139-142；round-1/interact/次要21.json、次要19.json。

### T9 数字格式混用「1.2w vs 8,932 vs 9.8k」（跨 4 轮反复提示，产品级未终审）
- R1-HOME-008 修为千分位 → R3-HOME-007 复发提示（R21 裁决对齐理想图）→ R4 升级为产品确认项 → R10-P2-007 把校园圈数字统一为 k 格式（与 R21 裁决口径又不一致）。**口径至今摇摆，回归时任何数字格式变化都要对照当时裁决记录。**
- 来源：round-1/audit-report.md:27；round-3/audit-report.md:87；round-4/audit-report.md:53；2026-09-17-r10-visual/audit-report.md:135。

### T10 商业化封存开关接线不一致（R10 根因 C，第三周期发现 key 契约风险）
- 同一 `commerce.*=false` 策略三种表现：market×3 正确封存 / consulting 未接线照常展示 ¥99-159（R10-P1-002）/ vip 三页 onLoad 守卫跳转。R11/R12 复验封存通过。
- **第三周期 R21-CONSULTING-001**：实现读取 `switches['consult']`，而 consulting.vue:33 注释口径为 `commerce.consult`——注入 `commerce.consult=true` 不生效、`consult=true` 才生效。若后端/管理后台按注释命名下发，该闸永不放行（后端真实 key 无法在 mock 环境取证）。
- 来源：2026-09-17-r10-visual/audit-report.md:98-102；r12-independent/audit-report.md:39；round-1/interact/次要17.json。

### T11 双身份巡检证据失效（R12 P0 级方法论问题）
- R12-IND-GLOBAL-001（P0）：上一轮双身份截图 B 侧与 A 侧像素级相同（巡检会话未建立，全为未登录态）——**此前所有"双身份"证据都可能是无效的**。修复：tour 脚本 boot 后强制校验 `session.isLoggedIn` + `boot-verify-*.log`，复验 A/B 8/8 ok。
- 关联：R10 §6.1 巡检账号完成度仅 30% 导致约 1/3 截图是门槛态；R11 起固定双身份（满配 A=100158 + 新用户 B=100159）。
- **第三周期 R21 在 mock 构建下发现「未登录态不可达」**：mock bootstrap 恒注入 mockUserSession（stores/session.ts:613-615），真实未登录分支在本构建无法取证（R21-NEARBY C37/C39 记录）——未登录态回归仍需专门构建或注入手段。
- 来源：r12-independent/audit-report.md:10；2026-09-17-r10-visual/audit-report.md:176-178；r11-acceptance/audit-report.md:6；round-1/interact/PAGES-NEARBY-INDEX.json。

### T12 环境级坑（反复出现，直接影响本轮回归证据可信度）
1. **DevTools 陈旧编译缓存**：dist 已更新但模拟器跑旧包（R3 首次定位 WeappCompileCache 87MB；R6 模拟器白屏 `module not defined`；R7 复现）。可靠流程=关窗→删 WeappCompileCache→删 dist→全新构建→重开。
2. **系统代理 127.0.0.1:7897（Clash）复活**：模拟器全部请求失败 / uploadFile 挂起 3 分钟（R1/R3/R7 三轮记录）。
3. **Node 版本**：PATH 默认解析 DevTools 自带 Node16 → uni 编译 `crypto.getRandomValues` 报错；需 Node22 前置（R1/final-verify/R7 三轮记录）。
4. **reLaunch 风暴假死**：>40 次连续 reLaunch 后 DevTools 假死全白屏（R8 81 张中 39 张白屏伪影；R11 >150 次导航 runtimeid 丢失 3 次；R12 长跑假死 2 次）。教训：navigateTo 为主、分段 refresh。
5. **token 单会话互踢**：同账号二次 curl 登录使小程序 storage token 失效 → 页面 401 空态（R8/R9）。
6. **自动化怪癖（第三周期大规模补充取证）**：automator 对自定义组件内部元素 tap/trigger 不生效（R6/R7/R9/R11 记录，R21 再证 BottomActionBar/CardSwiper/PostCard catchtap 目标）；**@catchtap 编译产物为非标准 `bindcatchtap`，合成 tap 冒泡到卡片根**（R21-NEARBY-001 根因）；合成 touch 无法驱动 catchtouchmove 手势链、scroll-view 原生滚动、slider 拖动、input confirm/原生 maxlength（R21 大量「无法验证」项）；`element.trigger('longpress')` 可触发但原生 ActionSheet 面板/原生 showModal 按钮不入元素树且截图通道不稳定；DevTools 对原生 modal 自动确认；automator 单次截图协议往返 1-10s（动画帧不可捕获）；automation input 不受 maxlength 约束（R8）。
7. **Git Bash 坑**：`/pages/...` 被转成 Windows 路径（需 `MSYS2_ARG_CONV_EXCL="*"`）；curl 中文 JSON 以 GBK 发送 → 后端 500。
8. **登录态取证两步法**：注入 token 后还需触发 `session.bootstrap()`（R10 固化 eval_boot/eval_state 脚本）。
9. **interact 通道超时**：R21 interact-log.txt 记录 `timeout waiting for automator response`、reLaunch 后 currentPage 短暂不一致（attempt 1 err → "实际已生效"），自动化断言需重试+状态复核双保险。
- 来源：round-3/audit-report.md:106-111；2026-09-12-round1/audit-report.md:17-31；2026-09-15-r7-full-verify/audit-report.md:51-57；2026-09-16-r8-independent/audit-report.md:37-43；r11-acceptance/audit-report.md:70；r12-independent/audit-report.md:55；reports/screenshots/round-1-interact/interact-log.txt；round-1/interact/*.json 各「无法验证」条目。

### T13 事件绑定失效 / 死交互元素类（第三周期新确认的系统性主题，≥12 处）
- 根因 ①：uni-app Vue3 mp-weixin 下 `@catchtap` 编译为非标准 `bindcatchtap`，handler 永不触发且 tap 冒泡到卡片根 → **PostCard 全部内层交互（作者行/标签/点赞/收藏/关注）失效且误跳详情**（R21-NEARBY-001/002，修复=全部改 `@tap.stop`，HEAD diff PostCard.vue 10 处）。
- 根因 ②：元素无任何 @tap handler 或页面未监听组件 emit → 完全死交互：R21-HOME-014（首页社区动态「关注」无 handler 且冒泡误跳详情）、HOME-015（作者行静默失效）、CIRCLEHOME-002/004（圈主页动态卡/分享/更多无响应）、OFFICIALCHAT-002（官方号三处死按钮，未修）、CAMPUS-HUB-003（「查看更多校园圈⌄」无 handler）、SETTINGS-001（「我的动态」switchTab 非 tabBar 页死链）、MESSAGES-INDEX-001（消息页 header「+」死元素，未修）、TASKS-003（profileCompleted=false 时点击无响应）。
- 回归要点：**任何"看起来能点"的元素必须验证 500ms 内有可观测反馈**（R11 §5 通用铁律）；mock 构建下需区分「绑定缺失」与「自动化派发失真」。
- 来源：round-1/interact/PAGES-HOME-INDEX.json、次要13.json、次要14.json、次要17.json、次要19.json；HEAD 提交 5e2d050c diff（PostCard.vue 修复注释自述根因）。

### T14 返回 / 栈底守卫缺失类（第三周期新确认的系统性主题，≥8 页）
- 症状 A：栈=1（reLaunch 直达/分享卡深链）时 `uni.navigateBack()` 无处可退 → 页面原地停留，console 抛 `navigateBack:fail cannot navigate back at first page` 未处理 rejection（R21-VERIFY-INDEX-001 ×4、REAL-NAME-001 ×4、OFFICIALCHAT-003 ×3、DND-001、SETTINGS-002 落到发现页行为未定义）。
- 症状 B：兜底用 `uni.switchTab` 跳**非 tabBar 页** → 静默失败无后续兜底（R21-TAGPOSTS-002 缺参时卡死空页 3.5s、HISTORY-001 返回键完全失效、SETTINGS-001）。修复口径=栈深判断 + `reLaunch` 兜底（HEAD diff tag-posts.vue/history.vue/dnd.vue/official-chat 自述注释）。
- 关联历史：matching 200ms goBack 兜底（R3 P0 证伪项，防"修坏了兜底"）；R12 返回键被布局推入胶囊带；401 → reLaunch 登录页劫持（R12 书面豁免，回归时应观察其影响面）。
- 来源：round-1/interact/次要13.json、次要17.json、次要18.json、次要19.json、次要20.json；HEAD 提交 5e2d050c diff。

### T15 渲染层文案/编码缺陷类（第三周期新确认）
- R21-SEGMENT-001：细分发现页标题/空态渲染 i18n 裸 key（`home.segmentHighMatch`/`home.segmentEmpty` 在 zh-CN home 命名空间缺失）。
- R21-CAMPUSINDEX-001 / CAMPUS-HUB-002：hub → campus/index 传 `encodeURIComponent(校名)`，落地页未解码直接渲染 `%E4%B8%AD%E5%9B%BD…`（人大/清华/复旦复现）。
- R21-HEARTSIGNALS-001：过期倒计时无条件拼接「后过期」→「已过期后过期」。
- R21-FEEDBACK-001：反馈记录时间渲染原始 ISO 串（`2026-09-21T11:03:29.703Z`）。
- R21-TOPIC-DETAIL-002：回复输入框未设 maxlength → 微信默认 140 字符静默截断。
- R21-CAMPUS-HUB-001：「我加入的」badge 恒显示「认证中」（从未提交认证）且无 `--verified/--pending/--unverified` 修饰类 → 无底色样式（对比推荐 Tab 灰底「未认证」胶囊）。
- 回归要点：i18n 改 key / 路由传参 / 时间格式化 / 文案拼接，任何一环改动都要重查渲染终端。
- 来源：round-1/interact/次要14.json、次要15.json、次要17.json、次要18.json、次要21.json、SUBPACKAGES-CAMPUS-CAMPUS-HUB.json。

---

## 二、P0 全量清单（历史全部）

| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-POST-001 | village/post | 「发布」按钮与微信胶囊碰撞 | 已修（视觉周期 R1） | round-1/audit-report.md:15 |
| MP-R1-VILLAGE-002 | village/index | 搜索框右端伸进胶囊下方被遮挡 | 已修（视觉周期 R1） | round-1/audit-report.md:16 |
| MP-R1-OFFICIAL-003 | official-chat | 最后一条消息被输入栏截断（加载后从未滚底） | 已修；**R21-OFFICIALCHAT-001 同病复发（发送后内容增高场景），第三周期再修** | round-1/audit-report.md:17；round-1/interact/次要19.json |
| MP-R1-CIRCLE-004 | circles/index | 统计行「…1 条动」半字硬裁 | 已修（视觉周期 R1）；R21-CIRCLE-005 375px 下统计/好友行再截断，第三周期再修 | round-1/audit-report.md:18；round-1/interact/次要13.json |
| MP-R2-CHAT-001 | chat-session | 15 号截图为「缺少会话标识」错误页 | 复核为截图脚本参数误用（非产品缺陷） | round-2/audit-report.md:9 |
| MP-R2-PUB-002 | village/publish | 渠道弹层缺「兴趣圈子」组 | 已修（视觉周期 R2）；R21-PUB-017 无参直入时该分组再静默消失，第三周期再修 | round-2/audit-report.md:10；round-1/interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R3-MATCHING-001 | matching | 匹配页「打不开」 | 证伪：无上下文 200ms goBack 兜底为设计内行为 | round-3/audit-report.md:25 |
| R12-IND-GLOBAL-001 | 全局（巡检方法论） | 双身份证据整体无效：B 侧与 A 侧像素级相同（全为未登录态） | 已修：boot 强制校验，复验 A/B 8/8 ok | r12-independent/audit-report.md:10 |

## 三、P1 全量清单（回归核对主线索）

> 「最后状态」= 该问题在其来源轮次或后续轮次被记录的最后观测。**不视为已解决，仅作本轮核对起点。**

### 视觉周期与真实环境周期 R1–R12
| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-NEARBY-005 | nearby | 热门兴趣圈第 4 卡被右缘裁切 | 已修 | round-1/audit-report.md:24 |
| MP-R1-HOME-006 | home/match | 合拍度徽章 conic-gradient 在 mp-weixin 不稳、样式串文本泄漏 | 已修（弃用内联渐变改实心粉圆）；R11 理想图对照记 L4 ⚠️ 环形 vs 实心形态 P4 遗留 | round-1/audit-report.md:25；r11-acceptance/ideal-comparison.md:11 |
| MP-R1-HOME-007 | home | 关系动态 4 格同色不可辨 | 已修（恢复四色底） | round-1/audit-report.md:26 |
| MP-R1-HOME-008 | home | 人数英文单位与理想图千分位不一致 | 已修；后演化为 T9 反复项 | round-1/audit-report.md:27 |
| MP-R1-HOME-009 | home | 恋爱进度第 4 卡截断+数字序号 | 已修 | round-1/audit-report.md:28 |
| MP-R1-HOME-010 | home | 社区动态「刷新」语义错（误跳发帖页） | 已修（改「查看更多›」） | round-1/audit-report.md:29 |
| MP-R1-HOME-011 | home | 社区动态相邻卡同作者 | 已修（后端按作者去重） | round-1/audit-report.md:30 |
| MP-R1-HOME-012 | home | 「25岁 ·」尾点残留 | 已修；R2-HOME-008 复发一次后以 computed 收口；R21 interact 以其作回归断言通过 | round-1/audit-report.md:31 |
| MP-R1-HOME-013 | home | banner 后约 1/3 屏空白 | 已修（--tab-bar-clear-zone 收敛） | round-1/audit-report.md:32 |
| MP-R1-PUB-014/015 | publish/post | 命名不一致 / 行 hint 冗长 | 已修 | round-1/audit-report.md:33-34 |
| MP-R1-TOPICS-016 | topics | 圈头像灰色相机占位 | 已修 | round-1/audit-report.md:35 |
| MP-R1-STATUS-017 | 全局 | 10/12 状态栏时间不可见 | 已修；演化为 T1 系统性主题 | round-1/audit-report.md:36 |
| MP-R2-MSG-006 | messages | 助手卡无红色未读角标（数据源缺通知未读） | 修复，遗留 tabBar 角标接 custom-tab-bar（P2 待办，至今未见闭环） | round-2/audit-report.md:14,38 |
| MP-R2-HOME-012 | home | 社区动态仅 1 卡 | 已修（查询上限×6） | round-2/audit-report.md:20 |
| MP-R2-VILL-013 | village | 晚霞帖配热饮图（图文不符） | 已修（语义映射） | round-2/audit-report.md:21 |
| MP-R3-HOME-001 | home | 铃铛+角标"3"侵入状态栏/刘海带 | 已修 | round-3/audit-report.md:31 |
| MP-R3-HOME-006 | home | 滚动后统计区与系统时间叠印 | 已修（onPageScroll 渐变遮罩）；R4 加高；INDEP-004 复制到消息页 | round-3/audit-report.md:32 |
| MP-R3-PROFILE-001 | profile | 右上分享/设置图标进状态栏带 | 已修 | round-3/audit-report.md:33 |
| MP-R3-DAILY-001/003 | daily-question | 头部标题与系统时间叠印 | 已修 | round-3/audit-report.md:34 |
| MP-R3-MSUCCESS-001/002 | match-success | 返回/截图钮侵入状态栏、与胶囊碰撞 | 已修 | round-3/audit-report.md:35 |
| MP-R3-SETTINGS-001 | settings | 自绘导航整体顶进状态栏（根因=漏实例化 useMenuButtonRect） | 已修；「写了变量没接注入源」成为 T1 根因模式 | round-3/audit-report.md:36 |
| MP-R4-PROFILE-001 | profile/官方号 | 游客秋薇(女)头像为男性素材 | 已修 | round-4/audit-report.md:33 |
| MP-R4-CAMPUS-001 | campus-hub | 认证按钮被胶囊压住 85%（padding 公式漏加胶囊全宽） | 已修（7+104） | round-4/audit-report.md:34 |
| R3-回归击穿 | profile-other | 小满封面女性化修复未生效（迁移守卫条件永不命中+封面取另一字段） | R4 已 UPDATE 修复——**回归核对需覆盖"修复本身未生效"类** | round-4/audit-report.md:25 |
| IA-CONSOLE-01 | 全局（login watch） | real 包 `TypeError: k is not a function`（immediate watch 未初始化句柄） | 已修；R12 console 全量落盘无复现 | 2026-09-13-final/FINAL-ACCEPTANCE.md:33 |
| IA-CONSOLE-02 | home/nearby | `ReferenceError: reportLocation is not defined`，定位上报整体断裂 | 已修（补 import） | 2026-09-13-final/FINAL-ACCEPTANCE.md:34 |
| MP-R5-AVATAR-500 | profile 编辑页 | 头像上传 100% 失败 500，功能自上线即不可用 | 已修 | 2026-09-13-r5/audit-report.md:17 |
| MP-R5-MEDIA404 | 媒体服务 | 所有用户上传图片读取 404 | 已修 | 2026-09-13-r5/audit-report.md:18 |
| MP-R5-MEDIAAUTH | 小程序全局 | resolveMediaUrl 不给新前缀拼 token → 头像/照片墙全体回落默认图 | 已修；R7 发现渲染端遗漏（PROFILE-001~003）补齐 | 2026-09-13-r5/audit-report.md:19 |
| MP-R5-ADMINTHUMB | admin | 后台所有 `<img>` 裸媒体 URL 401 | 已修（withMediaToken 7 处） | 2026-09-13-r5/audit-report.md:20 |
| MP-R6-EDITFLOW | setup/profile | 编辑模式保存后误 redirectTo 注册向导下一步 | 已修（entry=edit/wizard 双模式）；R7/R8 链路 G 回归通过 | 2026-09-14-r6-editpage/audit-report.md:22-25 |
| MP-R6-PROFILE-001 | profile/我的帖子 | 「我的帖子」永远空态（loadMyPosts 全仓无调用点） | 已修（onShow 重试接线） | final/final-verify-20260912.md:50-57 |
| MP-R7-PROFILE-001/002 | profile | 头像白圈 / 相册白板（相对路径直连 `<image>`） | 已修（resolveMediaUrl）；R8 复测无回归 | 2026-09-15-r7-full-verify/audit-report.md:20-21 |
| MP-R7-PROFILE-005 | profile | `ROUTES.ALBUM` 不存在 → 「恋爱相册」入口点击无效 | 已修 | 2026-09-15-r7-full-verify/audit-report.md:24 |
| MP-R7-REALNAME-001 | 实名/认证 5 页 | DevTools tmp 路径被误判为服务器 URL → 证件落库 `http://tmp/*` | 已修（isUploadedMediaUrl 5 处） | 2026-09-15-r7-full-verify/audit-report.md:25 |
| MP-R7-UPLOAD-001 | 全局上传 | uni.uploadFile 不走拦截器 → 缺 Idempotency-Key，**所有文件上传 422** | 已修（uploadFileViaUni 补幂等键）；R11 又发现 3 处 `header`→`headers` 笔误（幂等键从未生效，POST /matches/like 缺失即 422）已修 | 2026-09-15-r7-full-verify/audit-report.md:26；r11-acceptance/audit-report.md:26-33 |
| MP-R8-STATUS-001/002 | likes、profile/album | 标题叠印状态栏 | 已修 | 2026-09-16-r8-independent/audit-report.md:22-23 |
| MP-R8-LIKES-001 | likes | 「喜欢我的」永远空态（isUnlocked 守卫永不触发 fetchLikes） | 已修（门槛降为 isLoggedIn） | 2026-09-16-r8-independent/audit-report.md:27 |
| MP-R8-DRAFT-001/002 | 发布/后端 | 草稿发布成功后永不清除（后端 DELETE 恒 500 + 前端只清本地）→ 重复发布风险 | 已修（@Transactional + deleteDraft） | 2026-09-16-r8-independent/audit-report.md:31 |
| R11 五处类型级真 bug | 后端契约/messages/nearby-people/upload | 3 处幂等键 `header`→`headers`、nearby-people 漏 import `tagLabelsFor`（渲染即 ReferenceError）、uploadPostImage 缺 name、messages store mock 分支写未声明字段 | R11 修复（typecheck 46→0、测试 40 失败→1280 全绿） | r11-acceptance/audit-report.md:26-33 |
| R10-P1-001 | circle-home | 冷启动/深链进入有效圈子被误判「圈子不存在或已解散」 | 已修（circlesFetchSettled 门）；R11 列为 G6 断言 | 2026-09-17-r10-visual/audit-report.md:14,83-93 |
| R10-P1-002 | love-center/consulting | 封存态仍展示 ¥99/129/159 课程+报名 | 已修（isCommerceOn 接线）；R21-CONSULTING-001 又发现 key 契约风险（T10） | 2026-09-17-r10-visual/audit-report.md:15,98-102 |
| R10-P1-003 | 全站 ≥5 页 | 状态栏叠印系统性复发（103 处 env()、~50 页 env-only） | 已修（60 文件+12 页接线+守卫 fail-fast）；R11 收紧 0/0 | 2026-09-17-r10-visual/audit-report.md:16,45-69；fix-report.md:17 |
| R10-P1-004 | match-success / real-name | 头像渲染空白白圆（default-avatar 双份同名资源+http 图被拒渲染） | 已修（resolveMediaUrl+@error 兜底+删重复副本） | 2026-09-17-r10-visual/audit-report.md:17,120-125 |
| N1–N6（9.18 复核） | home/campus topic-detail/search/tag-posts/discussions/album | 首页偶发空白、campus 话题详情加载失败、搜索占位文案、tag-posts 裸"#"、讨论圈同文案、相册重复图 | R11 声明全项修复；N1 在 R12 复验仍偶发（见 R12-IND-HOME-001）；**R21-TAGPOSTS-001 又发现 tag-posts 分页 off-by-one 恒空列表，第三周期再修** | 2026-09-18-r11-full-acceptance/acceptance-plan.md:36-39；r12-independent/audit-report.md:30-31 |
| R12-IND-NEARBY-LC-001 | love-center/nearby | 「附近的人」功能全灭：后端距离过滤剔除全部距离未知条目（恒 0 人） | 已修（距离未知保留）；R7 曾有同接口暂态空列表观察项 | r12-independent/audit-report.md:11 |
| R12-IND-NEARBY-LC-002 | love-center/nearby | 返回键被 space-between 推到胶囊正下方完全遮挡 | 已修 | r12-independent/audit-report.md:12 |
| R12-IND-PROFILE-OTHER-001 | profile/other | 深链 401 被笼统渲染，错误态仍显示互动 FAB | 已修 | r12-independent/audit-report.md:13 |
| R12-IND-TOPICS-001 | campus/topic-detail | 401 静默成空错误信息 → 误渲染「话题不存在」 | 已修（store 层 401 透出） | r12-independent/audit-report.md:14 |
| R12-IND-HOME-001 | home | 首页偶发白屏（连 TabBar 全无） | **未闭环**：判定 DevTools 渲染层偶发；blank 自动重拍兜底；巡检 2/144 复现 | r12-independent/audit-report.md:15,53 |

### 第三周期 R21 交互审计新增（2026-09-19~21，修复批 = HEAD `5e2d050c`，单项级别未留档）
| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-NEARBY-001 | PostCard（nearby/village/search 全用点） | @catchtap 编译为非标准 bindcatchtap：作者行/标签/点赞/收藏永不触发且冒泡误跳帖子详情（受控复测 100% 复现） | 已修（@tap.stop 10 处）；**同类写法是否全仓清零需静态复查** | round-1/interact/PAGES-NEARBY-INDEX.json；HEAD diff PostCard.vue |
| MP-R1-NEARBY-002 | nearby、love-center/nearby | 关注 chip 无反馈（bindcatchtap+页面未监听 follow/favorite）；跳过/喜欢后视觉卡不推进（store 移除但本地 cards 未同步）→ 后续操作全报「卡片不存在或已被处理」 | 已修（HEAD diff 15 处引用） | round-1/interact/PAGES-NEARBY-INDEX.json；次要17.json |
| MP-R1-DETAIL-001 | village/detail | 帖子详情点赞单击无效（渲染+store 双通道无变化，3 次干净会话复现；评论点赞正常） | 已修 | round-1/interact/次要13.json |
| MP-R1-VILLAGE-001 | village/index | mock 发布的新帖不进今日广场 feed（阻断 own-post 回归复核） | 已修 | round-1/interact/次要13.json |
| MP-R1-TAGPOSTS-001 | village/tag-posts | 分页 off-by-one（from=page*PAGE_SIZE）→ 列表恒空 | 已修（(页码-1)*PAGE_SIZE） | HEAD diff tag-posts.vue |
| MP-R1-TAGPOSTS-002 | village/tag-posts | 栈=1 返回键失效；缺参兜底 switchTab 到非 tabBar 页静默失败卡死空页 | 已修（栈深判断+reLaunch 兜底） | round-1/interact/次要13.json |
| MP-R1-HISTORY-001 | village/history、feedback/history | 浏览历史栈=1 返回键失效（switchTab 村口失败无兜底）；反馈历史查看详情恒 404、?id=2 自动展开命中同一缺口 | 已修（reLaunch 兜底） | round-1/interact/次要13.json、次要19.json |
| MP-R1-CIRCLE-005 | circles/index | 375px 宽度下统计行/好友行省略号截断语义不可读 | 已修 | round-1/interact/次要13.json |
| MP-R1-TOPICDETAIL-001 | circles/topic-detail | 「回复 46」徽标+「暂无回复」同屏（IA-TOPIC-01 在 mock 层第三次复发） | 已修 | round-1/interact/次要14.json |
| MP-R1-POSTTOPIC-001 | circles/post-topic | 圈内发话题发布成功但帖子进村口流而非目标圈（circleId 未生效） | 已修 | round-1/interact/次要14.json |
| MP-R1-CIRCLEHOME-001/002/003/004 | circles/circle-home | 点赞恒 0 无激活态；动态卡点击无响应；「等 0 位朋友已加入」+三头像同默认图；分享/更多按钮无绑定 | 已修 | round-1/interact/次要14.json |
| MP-R1-CAMPUSINDEX-001 | campus/index | 校名渲染 URL 编码原文 + 话题列表恒空 | 已修 | round-1/interact/次要14.json |
| MP-R1-CAMPUS-HUB-001/003 | campus/hub | 「我加入的」badge 恒「认证中」且无修饰类无底色；「查看更多校园圈⌄」无 handler | 已修 | round-1/interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json |
| MP-R1-CAMPUSPOST-001 | campus/post-topic | 空表单点发布静默无拦截 toast | 已修 | round-1/interact/次要14.json |
| MP-R1-TOPIC-DETAIL-001/002 | campus/topic-detail | mock 回复无分页滚到底重复追加 3→6；回复输入框未设 maxlength（140 静默截断） | 已修 | round-1/interact/次要15.json |
| MP-R1-SEGMENT-001 | discover-extra/home/segment | 标题/空态渲染 i18n 裸 key（home.segmentHighMatch/segmentEmpty 缺失） | 已修 | round-1/interact/次要15.json |
| MP-R1-LIKES-001 | discover-extra/likes | 喜欢页整体判偏差（探针多项在位；细项以证据文件为准） | 已修（HEAD diff 4 处引用） | round-1/interact/次要15.json |
| MP-R1-HELP-001 | tools/help | 「客服邮箱-复制」复制到的是文案标签而非邮箱地址 | **未见修复引用（HEAD diff 无此 ID），需本轮复核** | round-1/interact/次要16.json |
| MP-R1-HEARTSIGNALS-001/002 | tools/heart-signals | 「已过期后过期」拼接缺陷；mock accept/decline 写穿共享固件，pending 永不恢复 | 已修 | round-1/interact/次要17.json |
| MP-R1-CONSULTING-001 | love-center/consulting、stores/app-config | 封存子闸 key 契约：实现读 switches['consult']，注释口径 commerce.consult，若后台按注释下发则闸永不放行 | 已修（app-config.ts 改动，**后端真实 key 契约需接口级复核**） | round-1/interact/次要17.json |
| MP-R1-SETTINGS-001/002 | profile-extra/settings | 「我的动态」switchTab 非 tabBar 页死链；栈=1 返回键落到发现页行为未定义 | 已修 | round-1/interact/次要17.json |
| MP-R1-VERIFY-INDEX-001 / REAL-NAME-001 | verification 两页 | 栈=1 返回键 navigateBack:fail ×4 unhandledRejection | 已修（栈深守卫） | round-1/interact/次要18.json |
| MP-R1-VISITORS-001/002 | profile/visitors | 访客卡点击无响应（Number('user-2003')→NaN 静默 return）；头部「访客记录 · 22」被胶囊遮挡 | 已修 | round-1/interact/次要18.json |
| MP-R1-OTHER-001 | profile/other | 重复点喜欢重复成功 toast、状态不变（alreadyLiked 守卫不触发） | 已修 | round-1/interact/次要18.json |
| MP-R1-TASKS-001/002/003 | profile/tasks | 签到 toast 成功但当页 UI 全不更新（对 computed 临时对象赋值）；文案缺陷；profileCompleted=false 时点击完全无响应 | 已修 | round-1/interact/次要19.json |
| MP-R1-DND-001 | settings/dnd | 栈=1 返回键 navigateBack 失败无反应 | 已修（switchTab 我的兜底） | round-1/interact/次要19.json |
| MP-R1-OFFICIALCHAT-001 | chat/official-chat | 滚底失效复发：发送后助手气泡被输入栏遮挡 +68px，长消息后视窗完全不滚（R1 P0 OFFICIAL-003 同病） | 已修 | round-1/interact/次要19.json |
| MP-R1-OFFICIALCHAT-002 | chat/official-chat | 「···」/「+」/表情三处死按钮 | **未见修复引用（HEAD diff 无此 ID），需本轮复核** | round-1/interact/次要19.json |
| MP-R1-OFFICIALCHAT-003 | chat/official-chat | 栈=1 返回键 navigateBack:fail ×3 unhandledRejection | 已修（switchTab 消息 tab 兜底） | round-1/interact/次要19.json |
| MP-R1-SETUPCAMPUS-001 | setup/campus | 「?」隐私弹窗取消路径 `showModal:fail cancel` 未处理 rejection + captureException 上报 | **未见修复引用（HEAD diff 无此 ID），需本轮复核** | round-1/interact/次要20.json |
| MP-R1-SETUPINTEREST-001/002 | setup/interest | 保存后多次 `navigateBack:fai…` unhandledRejection；另项细节未留档（diff 引用） | 已修 | round-1/interact/次要20.json |
| MP-R1-FEEDBACK-001 | support/feedback | 提交成功但记录时间渲染原始 ISO 串 | 已修 | round-1/interact/次要21.json |
| MP-R1-PUB-016 | village/publish | 正文上限页面 1000 vs store 校验 500：501-1000 字必然发布失败且仅提交时报错 | 已修 | round-1/interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R1-PUB-017 | village/publish | 直入发布页不 fetchCircles，「兴趣圈子」分组静默消失无加载/空态 | 已修 | round-1/interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| MP-R1-HOME-014/015/016 | pages/home | 「关注」无 handler 且冒泡误跳详情；作者行点击静默失效（映射缺 authorId）；「加入」按钮态永不变化（id 口径失配+数据源不同） | 已修 | round-1/interact/PAGES-HOME-INDEX.json |
| MP-R1-PAGES-DISCOVER-INDEX-001/002 | pages/discover、matching | 匹配页返回后寻觅页「卡片不存在或已被处理」错误横幅（匹配页重复消费同一卡）+console error 簇；错误横幅「重试」不清除（30s 缓存守卫跳过 fetchCards） | 已修 | round-1/interact/PAGES-DISCOVER-INDEX.json；SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json |
| MP-R1-PAGES-DISCOVER-INDEX-003 | pages/discover | 游客态入口胶囊 fixed bottom:120rpx 被自定义 tabBar 原生层整体遮挡（DOM 在、可点、不可见） | 已修 | round-1/interact/PAGES-DISCOVER-INDEX.json |
| MP-R1-PAGES-DISCOVER-INDEX-004 | pages/discover | 细节未留档（仅 HEAD diff 引用一次） | 已修 | HEAD diff 5e2d050c |
| MP-R1-PAGES-MESSAGES-INDEX-001 | pages/messages | header「+」死交互元素（tap 后无任何变化） | **未见修复引用（messages/index.vue 有 79 行改动但未标注此 ID），需本轮复核** | round-1/interact/PAGES-MESSAGES-INDEX.json |
| MP-R1-PAGES-MESSAGES-INDEX-002/003 | pages/messages | 置顶/免打扰 store 已生效但页面零可见反馈（无 pinned 标识、无 muted 图标） | 已修 | round-1/interact/PAGES-MESSAGES-INDEX.json |
| MP-R1-PROFILE-001/002 | pages/profile | 「发动态」FAB 约 80% 被 tabBar 白面板遮盖；点头像 ActionSheet 面板不可见（遮罩出现无选项） | 已修 | round-1/interact/PAGES-PROFILE-INDEX.json |
| MP-R1-CHAT-CHAT-SESSION-INDEX-001 | chat/chat-session | 转发后目标会话 preview 被写成非转发内容 | 已修 | round-1/interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json |
| MP-R1-CHAT-CHAT-SESSION-INDEX-002 | chat/chat-session | 临时匿名会话功能面破碎：气泡 0、长按撤回找不到消息、交换联系方式 no-session、结束会话无效果 | 已修 | round-1/interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json |
| MP-R1-PAGES-REGISTER-INDEX-001 | pages/register | 重复注册拦截正确；副作用：业务 400 触发多条 captureException console 噪音 | 未见修复引用（低危，verdict 符合） | round-1/interact/PAGES-REGISTER-INDEX.json |
| MP-R1-PAGES-REGISTER-SUCCESS-001 | pages/register/success | 页面三态正确；主跑截图有环境级原生弹窗（同页补测无弹窗） | 环境伪影记录，非产品缺陷 | round-1/interact/PAGES-REGISTER-SUCCESS.json |

### R21「无法验证」清单（工具限制，本轮回归须真机/人工补验）
身高滑块拖动、CardSwiper 左/右滑手势（合成 touch 驱动不了 catchtouchmove）、custom-tab-bar 项点击（独立渲染层）、scroll-view 原生滚动/横滑/scrolltolower 稳定性、input confirm（键盘搜索键）、原生 maxlength 截断、下拉刷新动画帧、原生 ActionSheet/showModal 面板视觉与按钮、discussions 原生确认弹窗按钮回调、MBTI web-view 页自身返回键、分享菜单、未登录态在 mock 构建不可达、「有新消息」提示条（依赖未贴底状态）。
来源：round-1/interact/PAGES-DISCOVER-INDEX.json、PAGES-NEARBY-INDEX.json、PAGES-MESSAGES-INDEX.json、次要13/16/18/20/21.json、SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json、SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json。

## 四、P2 全量清单（真实环境周期及以前，全部有来源）

| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R2-OFF-004 | official-chat | 顶部 hero 遮挡首条消息 | 复核为滚动中间态，保留 | round-2/audit-report.md:12 |
| MP-R2-HOME-007 | home | 「全部›」被裁成「全」 | 已修 | round-2/audit-report.md:15 |
| MP-R2-TAB-010 | tabBar | TabBar 下方游离绿色短横线 | 已修（删激活指示条） | round-2/audit-report.md:18 |
| MP-R2-NEAR-011 | nearby | 校园圈徽标「北京大/学」硬换行 | 已修；R8-CAMPUS-001 在 hub 页复发同类 | round-2/audit-report.md:19 |
| MP-R3-MSG-001 | messages | 「最近聊天」被活动卡挤出首屏 | 已修（IA 顺序交换） | round-3/audit-report.md:42 |
| MP-R3-CIRCLES-001/002 | circles | 统计文案省略号/按钮内边距过大 | 已修 | round-3/audit-report.md:43 |
| MP-R3-CAMPUS-001 | campus-hub | 统计文案「态」字孤行 | 已修 | round-3/audit-report.md:44 |
| MP-R3-POST-001/003 | post-detail | 帖 221 图文不符、互动数缺失 | 已修（数据迁移） | round-3/audit-report.md:46-47 |
| MP-R3-CIRCLEHOME-001/002 | circle-home | hero 返回钮状态栏/灰 chevron、云海帖三图不符 | 已修 | round-3/audit-report.md:48-49 |
| MP-R3-DISCOVER-002 | discover | 匹配度粉圆糊化不可读 | 已修（放大） | round-3/audit-report.md:50 |
| MP-R3-PUBLISH-001 | publish | 禁用态发布按钮对比度 1.36:1 | 已修（4.6:1+） | round-3/audit-report.md:51 |
| MP-R3-SETTINGS-002 | settings | 「恋爱认证」双入口重复 | 已修（去重） | round-3/audit-report.md:52 |
| MP-R4-OTHER-001 | profile/other | 他人主页返回钮侵入状态栏 | 已修 | round-4/audit-report.md:35 |
| MP-R4-CHAT-001 | chat-session | userId 深链标题回退「聊天」 | 已修（deepLinkPartnerName 回退链） | round-4/audit-report.md:36 |
| MP-R1-CIRCLE-001 | circle-home | 信息流作者头像全体绑死默认图 | 已修；R8-CIRCLE-001 回复 DTO 再犯同类（字母占位头像）已修 | 2026-09-12-round1/audit-report.md:40 |
| MP-R1-LOGIN-001 | login | 授权拒绝后新用户无注册/登录路径（死路） | 已修（拒绝也展开表单） | 2026-09-12-round1/audit-report.md:38,89 |
| MP-R1-CIRCLE-002 | topic-detail | 回复计数有数无明细 | 已修（V2026.09.12.0005）；IA-TOPIC-01 两次复发见 T4 | 2026-09-12-round1/audit-report.md:39 |
| IA-POSTTOPIC-01 | circles/post-topic | 导航叠压状态栏 | 已修（JS 注入 statusBarHeight） | 2026-09-13-final/FINAL-ACCEPTANCE.md:36 |
| IA-STATS-01 | 后端契约 | /profile/stats 半数字段硬编码 0、语义错位 | 已修（真实聚合） | 2026-09-13-final/FINAL-ACCEPTANCE.md:37 |
| IA-CIRCLEHOME-01 | circle-home | real 模式缺参静默渲染成套 mock 假数据 | 已修（真实空态）；R8 复测通过 | 2026-09-13-final/FINAL-ACCEPTANCE.md:38 |
| INDEP-001 | village/publish | snapshotDraft ReferenceError，草稿双写从不生效 | 已修（buildMergedTopics） | independent/indep-fix-verification.md:7 |
| INDEP-002 | chat-session | conv- 业务键被当会话 id 调消息接口 → 400 | 已修（uid 解析+错误横幅） | independent/indep-fix-verification.md:8 |
| INDEP-003 | 全局 WS | WebSocket 重连不关旧 socketTask | 已修；与「WS connect 0 接线封存决议」并存 | independent/indep-fix-verification.md:9 |
| INDEP-004 | messages | 消息页无滚动遮罩 | 已修（复用渐变遮罩） | independent/indep-fix-verification.md:10 |
| MP-R7-PROFILE-003/004 | profile | toLocalImage 不兜底媒体代理路径；完成度前端恒 10% vs 后端 30% | 已修；R8-LOCK-001 发现 LockScreen 两页同病再修 | 2026-09-15-r7-full-verify/audit-report.md:22-23 |
| MP-R7-ADMIN-IMG | admin | 后台「查看图片」直链不带 Authorization → 401 | 已修（fetch→blob） | 2026-09-15-r7-full-verify/audit-report.md:27 |
| MP-R8-STATUS-003/004 | heart-signals、CardDetailOverlay | 关闭钮/浮层顶栏同状态栏缺陷 | 已修 | 2026-09-16-r8-independent/audit-report.md:24-25 |
| MP-R8-CAPSULE-001 | likes | 「管理」钮压进胶囊（96px 全宽预留） | 已修 | 2026-09-16-r8-independent/audit-report.md:26 |
| MP-R8-LOCK-001 | village/heart-signals | LockScreen 完成度 10% 与我的页矛盾 | 已修（服务端权威值+onShow 60s TTL） | 2026-09-16-r8-independent/audit-report.md:29 |
| MP-R8-OWNPOST-001 | village/detail | 自己的帖子显示「+关注」 | 已修；R21 因 VILLAGE-001 阻断未能运行时复核，**本轮应补验** | 2026-09-16-r8-independent/audit-report.md:30；round-1/interact/次要13.json |
| MP-R9-STATUS-005 | setup/interest | 「选择兴趣」标题被状态栏时间叠印 | 已修 | 2026-09-16-r9-newuser-lifecycle/audit-report.md:36 |
| R10-P2-005 | likes | 「匹配列表」标题与返回按钮重叠 | 已修 | 2026-09-17-r10-visual/fix-report.md:22 |
| R10-P2-006 | love-center/nearby | 昵称 `?...`+「亲密度」徽标压简介 | 已修（根因反转：schoolLabel 兜底拆了自由简介） | 2026-09-17-r10-visual/fix-report.md:23 |
| R10-P2-007 | campus-hub | 校名截断、数字格式混用 | 已修（badge 下沉+k 格式——注意与 T9 裁决口径关系） | 2026-09-17-r10-visual/fix-report.md:24 |
| R10-P2-008 | tools/search | 缺返回入口；空态双文案矛盾 | 已修 | 2026-09-17-r10-visual/fix-report.md:25 |
| R10-P2-012 | market×3/real-name | 封存页与实名页缺自定义导航栏 | 已修 | 2026-09-17-r10-visual/fix-report.md:29 |
| R10-P2-014 | love-center/consulting | 导航绿色实心不一致；MBTI 入口重复 | 已修（AppShell 统一+去重） | 2026-09-17-r10-visual/fix-report.md:30 |
| R10-P3-015/016/018/019/020/022 | 多页 | 审计残留数据/标签英文未映射/讨论圈重复缺元信息/官方消息矛盾/分类「其他」/相册空位弱 | 各有修复或部分修复（详见 fix-report §P3）；R11/R12 又各清一次残留 | 2026-09-17-r10-visual/audit-report.md:28-34；fix-report.md:37-42 |
| R12-IND-EVIDENCE-001 | 巡检方法论 | console 证据缺失 | 已修（每页 console-evidence-*.log 全量落盘） | r12-independent/audit-report.md:19 |
| R12-IND-HTTP-401-001 | 全局 | 401 → reLaunch 登录页劫持当前页 | **书面豁免**（会话语义全局策略，产品决议项） | r12-independent/audit-report.md:16 |
| R12-IND-AUTH-GATE-001 | 多页 | 公开内容鉴权口径不一致 | **书面豁免**（产品决议项） | r12-independent/audit-report.md:18 |
| R12-IND-PROFILE-INDEX-001 | profile（未登录态） | 未登录头部图标与状态栏叠印 | **待查**（登录态正常） | r12-independent/audit-report.md:17 |

## 五、P3/P4 与书面豁免/产品决策（回归时验证"仍然只是记录"即可）

| 主题 | 内容 | 来源 |
|---|---|---|
| 数字格式裁决 | 「1.2w vs 8,932」混用=理想图自身口径（R21 裁决维持）；R10 又统一为 k——建议产品终审（T9） | round-3/audit-report.md:87；round-4/audit-report.md:53 |
| 附近页 IA 冻结 | 分区顺序「严格冻结」为产品决策；「附近动态」板块列入迭代需求 | round-3/audit-report.md:88；2026-09-13-final/FINAL-ACCEPTANCE.md:49 |
| 圈名短名口径 | 理想图两处互相矛盾，取附近页口径 | round-2/audit-report.md:41 |
| publish 版底部工具栏 | publish=简化发布入口（产品决策），与 post 版两实现并存（R10-P2-013 维持；但 R21-PUB-016/017 证明两版行为不一致仍是活风险） | round-2/audit-report.md:23；2026-09-17-r10-visual/audit-report.md:133 |
| tabBar 中央浮岛 | 「寻觅」差异化设计（产品确认） | round-1/audit-report.md:68 |
| 素材缺口 | 星野/叶清欢纹理头像、复旦封面跑道图、云海帖无真山景、heart_pink 透明图（已换） | round-4/audit-report.md:60；final/final-acceptance-report.md:87 |
| backlog 项 | 帖子来源圈子行、他人主页学校距离行/共同点结构、本校 CTA 差异化、关系动态真实头像数据源、圈子头像堆叠真实好友数据 | round-3/audit-report.md:92；round-4/audit-report.md:56-57 |
| MBTI 双 IA | 「16 型速览+4 题测试」混排保留观察 | 2026-09-17-r10-visual/audit-report.md:135；fix-report.md:46 |
| love-center 内容单薄 | 恋爱咨询页仅 2 入口——书面豁免（内容建设项） | 2026-09-18-r11-full-acceptance/acceptance-plan.md:312；r12-independent/audit-report.md:23 |
| circles 空态 CTA | 空态文案含糊，pageState 已区分 error/empty，CTA 增强列后续 | r12-independent/audit-report.md:22 |
| 三处 0 接线决议 | getPhoneNumber / ContentSecurityChecker / WS connect 维持「正式封存」（R11 G5 复核无变更） | 2026-09-18-r11-full-acceptance/acceptance-plan.md:38；r11-acceptance/audit-report.md:57 |
| release 链三步未本地执行 | verify-env-release（HTTPS 生产域名）+ 主包 ≤2MB 严格门禁 + 真机隐私授权链——**发布前必须执行**；real:dev 形态主包 27.68MB（书面豁免口径） | r11-acceptance/audit-report.md:61 |
| lint warnings 14432 | 0 error 达标；格式类 warn 建议单独批次 --fix | r11-acceptance/audit-report.md:69 |
| G4 交互未逐点 | 809 绑定仅七链路+抽样点验（automator 对自定义组件不生效）；R21 交互审计已对主包 6 tab+核心分包补 500+ 项 check，但同样受工具边界限制 | r11-acceptance/audit-report.md:66；round-1/interact/*.json |
| 非法 JSON 500→400 | 后端 P4 待办 | 2026-09-13-final/FINAL-ACCEPTANCE.md:53 |
| 协议默认勾选差异 | 登录页默认勾选 vs 注册页不预选（行业惯例，仅记录） | 2026-09-12-round1/audit-report.md:46,107 |
| 微信登录生产化 | 未配 WECHAT_APPID/SECRET → /v1/auth/wechat 502 预期降级 | final/final-verify-20260912.md:85 |
| 真机手势人工抽检 | 侧滑返回/下拉刷新无法自动化（R5/R11 记录）；R21「无法验证」清单大幅扩充（见上文） | round-5/audit-report.md:32 |
| INDEP-006 Vue TypeError | 压缩产物 2 次未归因，登记监控 | independent/indep-fix-verification.md:12 |
| media-query-token-strict | 上线时置 true + 客户端改 5 分钟媒体令牌 | 2026-09-13-r5/audit-report.md:51 |
| 照片墙当次不回显 | IA-VISUAL-EDIT-01 P3 决策接受（重进回显） | 2026-09-14-r6-editpage/audit-report.md:70 |
| campus hub 校名省略号 | 四列挤压根治需布局重排，记 P4 维持（R10-P2-007 后已缓解） | 2026-09-16-r8-independent/audit-report.md:35,94 |
| 校区字段混用 | 「北校区/南校区」为有意种子，设计如此 | 2026-09-17-r10-visual/fix-report.md:41 |
| 推荐池性别分布 | 未设性别账号默认女性候选为预期行为 | 2026-09-17-r10-visual/fix-report.md:43 |
| 首页横滑无露头/瓦片字号/标签微偏 | P4 记录维持 | round-3/audit-report.md:89；round-4/audit-report.md:58-59 |
| campus/topic-detail 回复 mock 分页 | R21-TOPIC-DETAIL-001 已修，但「mock 分页语义」仍是演示数据口径问题 | round-1/interact/次要15.json |

## 六、R11 截图矩阵中的 blank/stuck 场景（R12 已逐张定性，本轮仍需复核）

来自 r11-acceptance/screenshot-matrix.md（stamp b0919-r12b，72 路由×双身份=144 场景）：
- **BLANK**：pages/home/index（A+B 双侧熵 0.98-0.99）、profile/other（A+B 熵 0.97）、vip/index（A 侧熵 0.99）。
- **STUCK/骨架**：village/tag-posts、village/history、circles/index、circles/topic-detail、campus/topic-detail、love-center/index、tools/search、profile/other（BLANK+STUCK）、profile/favorites、feedback/history、discover/activities、market/detail（A+B 两侧）。
- B 侧 MISSING 6 场景（settings/dnd、setup/profile、setup/interest、discover/activities、market/shop）——R12-IND-GLOBAL-001 双身份失效的表象。
- R12 结论：修复页脱离 blank/stuck；home 偶发白屏 2/144 复现后重拍恢复；其余定性为合理空态/骨架等待/偶发（r12-independent/audit-report.md:30-31）。**本轮回归应重跑该矩阵并对照此清单；注意 tag-posts/circles-index 等骨架页在 R21 又修过分页/统计行，需重点确认不再退化为永久骨架。**

## 七、回归高风险区梳理（对应本轮任务第 2 点）

1. **底部导航（TabBar）**：R2-TAB-010 游离线（已修）；R2-MSG-006 消息角标接 custom-tab-bar 至今未闭环；R12 首页偶发白屏连 TabBar 全无；**R21 新增：tabBar 原生层遮挡 fixed 元素两案（DISCOVER-INDEX-003 游客入口胶囊、PROFILE-001 FAB 80% 遮盖）——凡 fixed/bottom 定位元素改动都要对照 tabBar 净空**；tab 切换状态保持（滚动位/已加载数据不丢）从未逐点验证（R11 G4 偏差）；automator 点不到 tabBar 项（独立渲染层）。
2. **页面高度/滚动**：R1-HOME-013 banner 空白区；R3/R4/INDEP-004 滚动遮罩三处；R11「滚到底最后一条内容完整可见」；**R21：official-chat 滚底失效复发（发送后内容增高场景）、tag-posts 分页 off-by-one、campus topic-detail mock 分页重复追加、village 加载更多/回顶按钮自动化不可达待真机**；合成 touch 无法驱动 scroll-view（滚动类回归需程序化 scrollTo+截图双证）。
3. **弹窗/弹层**：R2 渠道弹层 78vh+安全区；R11 modal 三路关闭/遮罩行为规范；**R21：ActionSheet 面板不可见案（PROFILE-002，遮罩出现无选项）、showModal cancel 未处理 rejection 案（SETUPCAMPUS-001，未修）、原生弹窗自动化不可达**；位置授权弹窗遮挡取证（mock getLocation 规避）。
4. **聊天**：滚底（R1 P0 → R21 复发再修，**重点回归"发送后内容增高仍贴底"**）；气泡方向/时间条未来时间（R2）；未读角标数据源；tabBar 角标遗留；WS 重连上限；conv-/userId 深链；preview 写错/残留（R11-6B、R21-CHAT-SESSION-001 两案）；临时会话功能面（R21-002）；置顶/免打扰可见反馈（R21-002/003）；官方号内容与封存矛盾（R10-P3-019）；官方号死按钮（R21-002，未修）。
5. **发布**：草稿残留闭环（R8 P1）；snapshotDraft 崩溃（INDEP-001）；上传 422 幂等键（R7+R11 header→headers）；**正文上限契约（R21-PUB-016：页面 1000 vs store 500，两版发布页口径不一致）**；圈子分组加载（R21-PUB-017）；发帖流向（R21-POSTTOPIC-001 圈内发话题进村口流）；空提交拦截（R5 PASS 但 R21-CAMPUSPOST-001 在 campus 版静默）；publish/post 双实现差异；图片 ≤10MB/相册 ≤6 上限校验（R11 规范，无实测记录）。
6. **匹配**：matching 无上下文 200ms goBack 兜底（P0 证伪项，防"修坏了兜底"）；match-success 双头像兜底（R10-P1-004）；nav/胶囊避让（R3/R4）；**返回寻觅页后的错误横幅与卡片重复消费（R21-DISCOVER-INDEX-001/002、MATCHING-001，刚修完极易回归）**；错误横幅重试不清除（30s 缓存守卫路径）；love-center/nearby 卡不推进（R21-NEARBY-002）；重复喜欢守卫（R21-OTHER-001）；喜欢幂等键（R11 header→headers）；cancel-like 软删语义；互赞→heart_signals→会话建立链（R7/R8/R11 验证过，改动易碎）。
7. **个人资料**：四格计数假 0（R3/R7 两轮根因）；完成度口径（10/30/70% 三处来源）；编辑模式 entry=edit 返回逻辑（R6 P1）；照片墙回显时序（IA-VISUAL-EDIT-01）；ROUTES.ALBUM 类路由常量错；picker 可测试性（R9-TEST-001）；头像 ActionSheet（R21-PROFILE-002）；访客卡点击 NaN 与头部胶囊（R21-VISITORS-001/002）；tasks 页签到状态不更新（R21-TASKS-001/003，对 computed 赋值类缺陷模式）；own-post 无关注钮（R8-OWNPOST-001 复核被 R21 阻断，本轮补验）。
8. **图片**：媒体链全套（T5：token 拼接、相对路径、tmp 误判、上传白名单/幂等、默认头像唯一真身 assets/default-avatar.jpg）；`<image>` mode 守卫；图文语义映射（R1-R4 多轮数据修复）；**R21 无新增图片缺陷，但 POST-016 类契约改动可能影响图片上传路径，上传链（头像/照片墙/发帖配图/实名证件）任一环节都要打 DB 证据**。
9. **返回**：**T14 全类为本轮最高风险区（8+ 页刚补栈底守卫，个别页兜底目标不同：switchTab tab 页 vs reLaunch 非 tabBar 页，改动极易互相污染）**；深层返回链 pageStack（R3/R11 验证）；编辑模式 navigateBack vs redirectTo；401 reLaunch 劫持（豁免但观察影响面）；matching 200ms goBack 兜底；navigateBack unhandledRejection 上报（console 取证应回归为 0）。
10. **状态（页面状态机/鉴权态）**：状态栏体系（T1）；空态四态竞态（T3：任何"不存在/已解散"判定必须 gate 在 fetch 落定）；错误态渲染与横幅清除（R12 三项+R21-DISCOVER-INDEX-002）；封存闸（T10+R21-CONSULTING-001 key 契约）；冷启动假 0（T4）；i18n 裸 key/编码未解码/ISO 时间（T15——任何文案、路由参数、时间渲染改动都要查渲染终端）；未登录态在 mock 构建不可达（T11）。
11. **数据合规/种子质量**：审计残留（T8，本轮验收自身又会写入新数据）；标签映射字典；讨论圈去重（接口层）；相册重复；数字格式（T9）；**mock 固件写穿（R21-HEARTSIGNALS-002——mock 层可变性契约）**；反馈历史预置数据详情 404。
12. **证据可信度**：T12 全部环境坑先排除再定缺陷；双身份 boot 校验必须先过（T11）；**R21 的 59 项交互修复全部只做了代码修复批提交，回归截图复验记录未见专项产物——本轮回归的第一优先对象就是这批刚落地的修复**。

## 八、截至最近一轮（R21 修复批 HEAD 5e2d050c）的未闭环项（下一轮输入）

1. **R21 未见修复引用的四项**：OFFICIALCHAT-002（官方号三处死按钮）、SETUPCAMPUS-001（showModal cancel 未处理 rejection）、PAGES-MESSAGES-INDEX-001（消息页 header「+」死元素）、HELP-001（复制到文案标签而非邮箱）——另 HUB-002（校名 URL 编码）可能随 CAMPUSINDEX-001 一并修复，需复验。
2. R12-IND-PROFILE-INDEX-001：profile 未登录态头部与状态栏叠印（待查）。
3. R12-IND-HTTP-401-001 / R12-IND-AUTH-GATE-001：401 全局 reLaunch 策略、公开内容鉴权口径（需产品决议）。
4. R12-IND-HOME-001：首页偶发白屏（已知偶发；blank 自动重拍兜底）。
5. R12-IND-LOVECENTER-IDX-001 / R12-IND-CIRCLES-001：恋爱咨询内容建设、circles 空态 CTA。
6. R2-MSG-006 遗留：消息 TabBar 角标接 custom-tab-bar（P2 待办，至今未见闭环记录）。
7. release 链三步未本地执行（HTTPS 域名、主包 ≤2MB 严格门禁、真机隐私授权链）。
8. lint warnings 14432 批次清理；G4 交互逐点点验工具建设（automator 对自定义组件/手势/原生弹层的边界）。
9. 「9.17 周汇报」LBS Phase 2（后续轮未见处置记录）。
10. 真机手势人工抽检（侧滑返回/下拉刷新 + R21「无法验证」清单：滑块/横滑/confirm/原生截断/原生弹窗/web-view 返回/分享/「有新消息」提示条）。
11. 微信登录生产化（WECHAT_APPID/SECRET）；MBTI/love-center 双 IA 产品定夺；media-query-token-strict 上线切换。
12. CONSULTING-001 的后端真实 key 契约（commerce.consult vs consult）接口级确认。
13. `@catchtap` 是否全仓清零的静态复查（R21 只修了 PostCard 10 处，同款写法可能还有）。

---

### 附：本轮（2026-09-22）生成时执行的取证动作
- Read 工具逐份通读上列 29 份报告全文；`find reports/audit -type f -name "*.md"` 清点并 `wc -l` 确认无遗漏。
- `git log --oneline` + `git show --stat HEAD`：确认 HEAD `5e2d050c`（2026-09-21）为第三周期 round-1 修复批（P1×11+P2×26+P3×23=60 项）+ R21 交互取证留档 + 旧版基线两份。
- Python 脚本解析 `reports/audit/round-1/interact/*.json` 全部 20 份、527 项 check：提取 59 个唯一 issueId 及全部「偏差/符合但带 issueId/无法验证」条目全文。
- `git show HEAD -- apps/client | grep -oE "MP-R1-[A-Z0-9-]+"`：54 个唯一 ID 与 interact 证据交叉；逐一验证 OFFICIALCHAT-002 / SETUPCAMPUS-001 / PAGES-MESSAGES-INDEX-001 / HELP-001 / REGISTER 两项 / HUB-002 在修复 diff 中 0 引用。
- `ls 素材/理想效果图`（19 张 png 在位）、`ls reports/screenshots/r11-ideal`（cur-*.png 在位）；`docs/design/v3.1-contract.md`、`docs/design/xunmi-match-design.md` **不存在**（旧版 baseline 引用有误，本版 idealRefs 不再引用）。
- 未执行任何构建/测试/代码修改。
