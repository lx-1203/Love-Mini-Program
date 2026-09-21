# 历史问题清单基线（historical-issues baseline）

- 生成日期：2026-09-19
- 生成方式：通读 `reports/audit/` 下全部 21 个审计目录共 27 份报告/矩阵（round-1..5、2026-09-12-round1、2026-09-13-final / -independent / -r3 / -r5、2026-09-14-r6、2026-09-15-r7、2026-09-16-r8 / -r9、2026-09-17-r10-visual（audit+fix）、2026-09-18-r11-full-acceptance（acceptance-plan）、r11-acceptance（audit / chain-results / ideal-comparison / screenshot-matrix / tti-baseline）、r12-independent、independent、final×2）。`reports/regression/`、`reports/final/`（顶层）实测为空目录，无遗漏载体。
- 用途：**本轮回归核对的线索库**。任何条目不因最近一轮截图"看起来正常"而视为已解决；"最后状态"只是该问题最后一次被观测到的结果，本轮必须作为回归线索逐条重新核验。
- 范围约束：本文件为唯一写入产物，未改动任何代码/脚本/配置。

---

## 一、反复出现的系统性问题（回归第一优先级）

以下主题在 ≥2 轮中重复出现或一次性暴露系统性根因，是历史复发率最高的区域：

### T1 状态栏叠印 / 避让链路断裂（复发之王：≥6 轮、≥17 处真实缺陷）
- 首发与蔓延：R1 STATUS-017（10/12 页状态栏时间不可见）→ R3 六处（HOME-001、HOME-006、PROFILE-001、DAILY-001/003、MSUCCESS-001/002、SETTINGS-001）→ R8 四处（STATUS-001 likes、002 album、003 heart-signals、004 CardDetailOverlay）→ R9 一处（STATUS-005 兴趣页）→ R10 系统性收口（≥5 页叠印实拍 + 全仓 103 处 `env(safe-area-inset-top)`、~50 页 env-only、`usePageMetaStyle` 注入路径 0 引用死代码、第三套变量 `--statusbar-height`）→ R12 一处待查（PROFILE-INDEX-001 未登录态头部）。
- 根因模式：页面写了 `var(--statusbar, env(...))` 但**没有接 `useMenuButtonRect()` 注入源**（R3 SETTINGS-001 漏实例化即此类），或裸用 `env()`（DevTools/多数机型恒 0）。
- 现有防线：`scripts/check-statusbar-offset.mjs`（R10 建，R11 收紧到 0 err 0 warn + fail-fast 挂 real 构建链）。R10 修复报告遗留的 29 条 warn 已在 R11 清零（r11-acceptance/audit-report.md §0 G2）。
- 来源：round-1/audit-report.md:36；round-3/audit-report.md:31-36；2026-09-16-r8/audit-report.md:22-25；2026-09-16-r9/audit-report.md:36；2026-09-17-r10-visual/audit-report.md:45-69；r12-independent/audit-report.md:17。

### T2 胶囊按钮碰撞 / 避让宽度算错（≥5 轮）
- R1 POST-001（发布钮与胶囊挤在一起）、VILLAGE-002（搜索框伸进胶囊下）→ R2 HOME-007（「全部›」被裁）→ R4 CAMPUS-001（认证钮被胶囊压住 85%，根因 padding 公式 `7+8` 漏算胶囊本体，改 `7+104`）→ R4 MSUCCESS-001（标题被胶囊叠压）→ R4 PUBLISH-001/002 → R8 CAPSULE-001（「管理」钮压进胶囊，按 87px 胶囊全宽+间隙预留 96px）→ R12 SEARCH-001（搜索输入条右端伸进胶囊下）、NEARBY-LC-002（返回键被 space-between 推到胶囊正下方完全遮挡）。
- 根因模式：只预留右缘间隙而漏算胶囊全宽（≈87–104px）；或布局（space-between/flex）把元素推进胶囊带。
- 来源：round-1/audit-report.md:15-16；round-4/audit-report.md:34-39；2026-09-16-r8/audit-report.md:26；r12-independent/audit-report.md:12,20。

### T3 冷启动/深链直达时的空态竞态与误判（≥4 轮）
- R10-P1-001：圈子主页冷启动/深链直连被误判「圈子不存在或已解散」（`circle-home.vue` 空态判定不等 `fetchCircles()` 落定，store 冷启动必空）——分享直达是核心入口。修复：`circlesFetchSettled` 门。
- 同类：R4 CHAT-001（userId 深链标题回退「聊天」）、R5/INDEP-002（conv- 业务键被误判临时会话/当会话 id 调接口）、R12 TOPICS-001（campus 话题详情 401 静默 → 误渲染「话题不存在」）、R12 PROFILE-OTHER-001（他人主页 401 笼统渲染）。
- R11 方案已把「每个带参页 reLaunch 冷启动直连、首屏严禁闪现错误空态」列为独立测试维度与 G6 断言（acceptance-plan.md §5/§10.1 G6）。
- 来源：2026-09-17-r10-visual/audit-report.md:71-101；round-5/audit-report.md:13；independent/indep-fix-verification.md:8；r12-independent/audit-report.md:14。

### T4 数据契约矛盾 / 静默假数据 / 假空态假零（≥5 轮）
- IA-TOPIC-01：话题「回复 5」徽标与「暂无回复」同屏（seed reply_count 与明细表脱节）。
- IA-STATS-01：`/profile/stats` 半数字段硬编码 0、获赞语义与前端「我喜欢」错位。
- R3-PROFILE-001（2026-09-13-r3 轮）：我的页四格冷启动假 0（页面从不触发 `likesStore.fetchLikes()`，昨晚 2/1 只因测试路径恰好把 store「焐热」）。
- R8-LIKES-001：「喜欢我的」永远空态（`isUnlocked = isProfileComplete` 守卫致 fetchLikes 永不触发，与我的页数据直接矛盾）。
- R7-PROFILE-004 / R8-LOCK-001：资料完成度前端口径恒 10% vs 后端权威 30%（R7 只修 profile 页，R8 发现 LockScreen 两页同病）。
- IA-CIRCLEHOME-01：circle-home 缺参/错参时 real 模式静默渲染成套 mock 假数据（network 取证未发任何请求）。
- final-verify MP-R6-PROFILE-001：「我的帖子」永远空态（`loadMyPosts()` 全仓无调用点，DB 有 3 篇）。
- 根因模式：空态判定与数据加载不分离（idle/loading/empty/error 未收敛）、前端快照口径与服务端权威值并存、mock 兜底无水印。
- 来源：2026-09-13-independent/INDEPENDENT-AUDIT.md:59-82；2026-09-13-r3/audit-report.md:19-31；2026-09-15-r7/audit-report.md:23；2026-09-16-r8/audit-report.md:27-29；final/final-verify-20260912.md:50-57。

### T5 媒体链路（上传/鉴权/渲染/兜底）全链脆弱（≥3 轮集中爆发，4 项 P1「从未通过」级）
- R5（4×P1）：AVATAR-500（`normalizeType` 白名单缺 `avatar` → 头像上传 100% 失败，功能自上线即不可用）；MEDIA404（`extractSubPath` 属性语义错 → 所有上传图片读取 404）；MEDIAAUTH（`resolveMediaUrl` 不给 `/api/v1/media/**` 新前缀拼 token → 小程序 `<image>` 全体回落默认图）；ADMINTHUMB（后台裸 `<img>` 401 → 后台「看不到」任何图）。
- R7（6 项）：PROFILE-001/002（相对路径直连 `<image>` 被当包内文件 → 头像白圈/相册白板，network 0 次图片请求）、PROFILE-003（`toLocalImage` 不兜底媒体代理路径）、REALNAME-001（DevTools tmp 路径 `http://tmp/xxx` 被 `/^https?:\/\//` 误判为服务器 URL → 实名证件落库 `http://tmp/*`）、UPLOAD-001（`uni.uploadFile` 不走拦截器 → 缺 Idempotency-Key，**所有文件上传 422**）、ADMIN-IMG（后台直链 401）。
- R10-P1-004：匹配成功页/实名页头像空白白圆（`default-avatar.jpg` 两份同名资源路径歧义 + 远程 http 图被 base lib 拒渲染）。
- R4-MATCHING-001：`heart_pink.png` 为全透明空文件。
- 现有约定：媒体代理 URL 一律 `appendTokenIfMissing`；头像兜底唯一真身 `assets/default-avatar.jpg`；`isUploadedMediaUrl()` 判上传。
- 来源：2026-09-13-r5/audit-report.md:15-20；2026-09-15-r7/audit-report.md:19-27；2026-09-17-r10-visual/audit-report.md:120-125；round-4/audit-report.md:38。

### T6 草稿 / 发布闭环（≥2 轮）
- R8-DRAFT-001/002（P1）：后端 `DELETE /drafts/current` 恒 500（`RealDraftService.delete` 缺 `@Transactional`，DB 实证 draft 残留）+ 前端发布成功只清本地不清后端、而 restoreDraft 优先后端 → **每次发布后重进都恢复已发布内容（重复发布风险）**。
- INDEP-001（P2）：`publish.vue` snapshotDraft 越界引用 `mergedTopics` → 每次编辑抛 ReferenceError，草稿双写从不生效。
- publish/post 双实现并存：R10-P2-013 判「设计如此」保留（publish=快速动态、post=带标题帖子），两页功能不一致仍是技术债线索。
- 来源：2026-09-16-r8/audit-report.md:31；independent/indep-fix-verification.md:7；2026-09-17-r10-visual/audit-report.md:133,141。

### T7 聊天 / 会话（≥5 轮）
- R1-OFFICIAL-003（P0）：官方号最后一条消息被输入栏截断（从未滚底）。R2-OFF-005：时间条显示未来时间。
- R2-MSG-006（P1）：助手卡/角标未读数据源不含通知未读；**遗留 tabBar 消息角标接 custom-tab-bar（P2 待办）**，后续轮未见闭环记录。
- INDEP-003（P2）：WebSocket 重连不关旧 socketTask → exceed max task count（13+ 次触发）。
- R11-6B：会话 `last_message_preview` 残留已删审计消息并在消息页渲染（R10 清理只删消息行未清 preview）→ V2026.09.19.0001。
- R4-CHAT-001 / R5：深链标题回退、conv- 前缀误判。
- 来源：round-1/audit-report.md:17；round-2/audit-report.md:14,38；independent/indep-fix-verification.md:9；r11-acceptance/ideal-comparison.md:24-25。

### T8 审计/验收数据污染正式库（每轮产生、需清理迁移）
- R10-P3-015：聊天「Round-8 audit: …」、验收帖 225/226、同文案 3 连发、相册同图 2 格 → V2026.09.17.0001 清理。
- R11：QA 帖残留 3 条 → V2026.09.18.0002；会话 preview 残留 → V2026.09.19.0001；**巡检参数表 `?id=225` 因清理失效**（参数表引用会随数据清理腐烂，V2026.09.19 后改 `?id=1`）。
- R11 chain-results 遗留事实：客户端无「删除帖子/评论」端点，清理只能 SQL 删行；like/评论会写 `interaction_events` 副作用行；`cancel-like` 是软删除。
- 来源：2026-09-17-r10-visual/audit-report.md:150；r11-acceptance/audit-report.md:53-55,86-88；r11-acceptance/chain-results.md:139-142。

### T9 数字格式混用「1.2w vs 8,932」（跨 4 轮反复提示，产品级未终审）
- R1-HOME-008 修为千分位 → R3-HOME-007 复发提示（R21 裁决对齐理想图）→ R4 再次升级为产品确认项（三轮 judges 均提示）→ R10-P2-007 把校园圈数字统一为 k 格式（与 R21 裁决口径又不一致）。**口径至今摇摆，回归时任何数字格式变化都要对照当时裁决记录。**
- 来源：round-1/audit-report.md:27；round-3/audit-report.md:87；round-4/audit-report.md:53；2026-09-17-r10-visual/audit-report.md:135。

### T10 商业化封存开关接线不一致（R10 根因 C）
- 同一 `commerce.*=false` 策略在同一 App 三种表现：market×3 正确封存 / consulting 页未接线照常展示 ¥99-159 课程+报名（R10-P1-002，P1）/ vip 三页 onLoad 守卫跳转。修复后 R11/R12 复验通过，但「带交易动作页面逐个确认闸门接线」的覆盖面审计未见专门产物。
- 来源：2026-09-17-r10-visual/audit-report.md:98-102；r12-independent/audit-report.md:39。

### T11 双身份巡检证据失效（R12 P0 级方法论问题）
- R12-IND-GLOBAL-001（P0）：上一轮双身份截图 B 侧与 A 侧像素级相同（巡检会话未建立，全为未登录态）——**意味着此前所有"双身份"证据都可能是无效的**。修复：tour 脚本 boot 后强制校验 `session.isLoggedIn` + `boot-verify-*.log`。
- 关联：R10 §6.1 已指出巡检账号完成度仅 30% 导致约 1/3 截图是门槛态而非内容态；R11 起固定双身份（满配 A=100158 + 新用户 B=100159）。
- 来源：r12-independent/audit-report.md:10；2026-09-17-r10-visual/audit-report.md:176-178；r11-acceptance/audit-report.md:6。

### T12 环境级坑（反复出现，直接影响本轮回归证据可信度）
1. **DevTools 陈旧编译缓存**：dist 已更新但模拟器跑旧包（R3 首次定位 WeappCompileCache 87MB；R6 模拟器白屏 `module not defined`；R7 复现）。可靠流程=关窗→删 WeappCompileCache→删 dist→全新构建→重开，或 `debug_clear_cache cleanCompileCache+cleanProjectFileListCache`+refresh。
2. **系统代理 127.0.0.1:7897（Clash）复活**：模拟器全部请求失败 / uploadFile 挂起 3 分钟（R1/R3/R7 三轮记录）。
3. **Node 版本**：PATH 默认解析 DevTools 自带 Node16 → uni 编译 `crypto.getRandomValues` 报错；需 Node22 前置（R1/final-verify/R7 三轮记录）。
4. **reLaunch 风暴假死**：>40 次连续 reLaunch 后 DevTools 假死、全白屏（R8 81 张中 39 张白屏伪影；R11 >150 次导航 runtimeid 丢失 3 次；R12 长跑假死 2 次）。教训：navigateTo 为主、分段 refresh。
5. **token 单会话互踢**：同账号二次 curl 登录使小程序 storage token 失效 → 页面 401 空态（R8/R9）。
6. **自动化怪癖**：automation_navigate 全路由报错（R1）；automator tap/trigger 对自定义组件内部元素（BottomActionBar、CardSwiper 喜欢钮）不生效（R6/R7/R9/R11 反复记录）；automation input 不受 maxlength 约束（R8）；`automation_wx_api mock getLocation` 规避授权弹窗（R3）。
7. **Git Bash 坑**：`/pages/...` 被转成 Windows 路径（需 `MSYS2_ARG_CONV_EXCL="*"`）；curl 中文 JSON 以 GBK 发送 → 后端 500（R1/R8/R9）。
8. **登录态取证两步法**：注入 token 后还需触发 `session.bootstrap()`（R10 固化 eval_boot/eval_state 脚本）。
- 来源：round-3/audit-report.md:106-111；2026-09-12-round1/audit-report.md:17-31；2026-09-15-r7/audit-report.md:51-57；2026-09-16-r8/audit-report.md:37-43；2026-09-16-r9/audit-report.md:67-71；r11-acceptance/audit-report.md:70；r12-independent/audit-report.md:55。

---

## 二、P0 全量清单（历史全部）

| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-POST-001 | village/post | 「发布」按钮与微信胶囊碰撞 | 已修（R1） | round-1/audit-report.md:15 |
| MP-R1-VILLAGE-002 | village/index | 搜索框右端伸进胶囊下方被遮挡 | 已修（R1） | round-1/audit-report.md:16 |
| MP-R1-OFFICIAL-003 | official-chat | 最后一条消息被输入栏截断（加载后从未滚底） | 已修（R1） | round-1/audit-report.md:17 |
| MP-R1-CIRCLE-004 | circles/index | 统计行「…1 条动」半字硬裁 | 已修（R1） | round-1/audit-report.md:18 |
| MP-R2-CHAT-001 | chat-session | 15 号截图为「缺少会话标识」错误页 | 复核为截图脚本参数误用（非产品缺陷） | round-2/audit-report.md:9 |
| MP-R2-PUB-002 | village/publish | 渠道弹层缺「兴趣圈子」组 | 已修（R2） | round-2/audit-report.md:10 |
| MP-R3-MATCHING-001 | matching | 匹配页「打不开」 | 证伪：无上下文 200ms goBack 兜底为设计内行为 | round-3/audit-report.md:25 |
| R12-IND-GLOBAL-001 | 全局（巡检方法论） | 双身份证据整体无效：B 侧与 A 侧像素级相同（全为未登录态） | 已修：boot 强制校验，复验 A/B 4/4 ok | r12-independent/audit-report.md:10 |

## 三、P1 全量清单（回归核对主线索）

> 「最后状态」= 该问题在其来源轮次或后续轮次被记录的最后观测。**不视为已解决，仅作本轮核对起点。**

### R1–R5 轮（视觉/布局期）
| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-NEARBY-005 | nearby | 热门兴趣圈第 4 卡被右缘裁切 | 已修 | round-1/audit-report.md:24 |
| MP-R1-HOME-006 | home/match | 合拍度徽章 conic-gradient 在 mp-weixin 不稳、样式串文本泄漏 | 已修（弃用内联渐变改实心粉圆） | round-1/audit-report.md:25 |
| MP-R1-HOME-007 | home | 关系动态 4 格同色不可辨 | 已修（恢复四色底） | round-1/audit-report.md:26 |
| MP-R1-HOME-008 | home | 人数英文单位与理想图千分位不一致 | 已修；后演化为 T9 数字格式混用反复项 | round-1/audit-report.md:27 |
| MP-R1-HOME-009 | home | 恋爱进度第 4 卡截断+数字序号 | 已修 | round-1/audit-report.md:28 |
| MP-R1-HOME-010 | home | 社区动态「刷新」语义错（误跳发帖页） | 已修（改「查看更多›」跳动态流） | round-1/audit-report.md:29 |
| MP-R1-HOME-011 | home | 社区动态相邻卡同作者 | 已修（后端按作者去重） | round-1/audit-report.md:30 |
| MP-R1-HOME-012 | home | 「25岁 ·」尾点残留 | 已修；R2-HOME-008 复发一次后以 computed 收口 | round-1/audit-report.md:31 |
| MP-R1-HOME-013 | home | banner 后约 1/3 屏空白 | 已修（--tab-bar-clear-zone 收敛） | round-1/audit-report.md:32 |
| MP-R1-PUB-014 | publish/post | 「公开广场」vs「个人动态」命名不一致 | 已修 | round-1/audit-report.md:33 |
| MP-R1-PUB-015 | publish/post | 行 hint 冗长 | 已修 | round-1/audit-report.md:34 |
| MP-R1-TOPICS-016 | topics | 圈头像灰色相机占位 | 已修 | round-1/audit-report.md:35 |
| MP-R1-STATUS-017 | 全局 | 10/12 状态栏时间不可见 | 已修；演化为 T1 系统性主题 | round-1/audit-report.md:36 |
| MP-R2-MSG-006 | messages | 助手卡无红色未读角标（数据源缺通知未读） | 修复，遗留 tabBar 角标接 custom-tab-bar（P2 待办，未见闭环） | round-2/audit-report.md:14,38 |
| MP-R2-HOME-012 | home | 社区动态仅 1 卡（后端去重后不足） | 已修（查询上限×6） | round-2/audit-report.md:20 |
| MP-R2-VILL-013 | village | 晚霞帖配热饮图（图文不符） | 已修（语义映射）；R3/R10 持续同类数据修正 | round-2/audit-report.md:21 |
| MP-R3-HOME-001 | home | 铃铛+角标"3"侵入状态栏/刘海带 | 已修 | round-3/audit-report.md:31 |
| MP-R3-HOME-006 | home | 滚动后统计区与系统时间/刘海叠印 | 已修（onPageScroll 渐变遮罩）；R4-HOME-002 加高优化；INDEP-004 把同方案复制到消息页 | round-3/audit-report.md:32 |
| MP-R3-PROFILE-001 | profile | 右上分享/设置图标进状态栏带、文字被胶囊遮挡 | 已修 | round-3/audit-report.md:33 |
| MP-R3-DAILY-001/003 | daily-question | 头部标题与系统时间叠印、返回钮被盖 | 已修 | round-3/audit-report.md:34 |
| MP-R3-MSUCCESS-001/002 | match-success | 返回/截图钮侵入状态栏、右上钮与胶囊碰撞 | 已修 | round-3/audit-report.md:35 |
| MP-R3-SETTINGS-001 | settings | 自绘导航整体顶进状态栏（根因=漏实例化 useMenuButtonRect） | 已修；「写了变量没接注入源」成为 T1 根因模式 | round-3/audit-report.md:36 |
| MP-R4-PROFILE-001 | profile/官方号 | 游客秋薇(女)头像为男性素材（GuestPersona 性别-素材映射错） | 已修 | round-4/audit-report.md:33 |
| MP-R4-CAMPUS-001 | campus-hub | 认证按钮被胶囊压住 85%（padding 公式漏加胶囊全宽 87px） | 已修（7+104） | round-4/audit-report.md:34 |
| R3-回归击穿 | profile-other | 小满封面女性化修复未生效（迁移守卫条件永不命中+封面实际取 profile_background_url） | R4 已 UPDATE 修复——**回归核对需覆盖"修复本身未生效"类** | round-4/audit-report.md:25 |

### 真实环境验收期（2026-09-12 起接入真实后端）
| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-ENV-001 | 构建环境 | Node16 缺 WebCrypto → uni 构建必挂 | 已固化 PATH 方案（环境类） | 2026-09-12-round1/audit-report.md:41 |
| IA-CONSOLE-01 | 全局（login watch） | real 包 `TypeError: k is not a function`（immediate watch 未初始化句柄），Vue+Sentry 双通道上报 ≥2 次 | 已修；R12 轮 console 全量落盘无复现 | 2026-09-13-final/FINAL-ACCEPTANCE.md:33；2026-09-13-independent/INDEPENDENT-AUDIT.md:34-41 |
| IA-CONSOLE-02 | home/nearby | `ReferenceError: reportLocation is not defined`（未 import），定位上报整体断裂 | 已修（补 import） | 2026-09-13-final/FINAL-ACCEPTANCE.md:34；INDEPENDENT-AUDIT.md:43-49 |
| MP-R5-AVATAR-500 | profile 编辑页 | 头像上传 100% 失败 500（normalizeType 白名单缺 avatar），功能自上线即不可用 | 已修 | 2026-09-13-r5/audit-report.md:17 |
| MP-R5-MEDIA404 | 媒体服务 | 所有用户上传图片读取 404（子路径切割错） | 已修 | 2026-09-13-r5/audit-report.md:18 |
| MP-R5-MEDIAAUTH | 小程序全局 | resolveMediaUrl 不给 `/api/v1/media/**` 拼 token → 头像/照片墙全体回落默认图 | 已修；R7 发现渲染端仍有多处遗漏（PROFILE-001~003）补齐 | 2026-09-13-r5/audit-report.md:19 |
| MP-R5-ADMINTHUMB | admin | 后台所有 `<img>` 裸媒体 URL 401 → 后台看不到任何图 | 已修（withMediaToken 7 处） | 2026-09-13-r5/audit-report.md:20 |
| MP-R6-EDITFLOW | setup/profile | 编辑模式保存后误 redirectTo 注册向导下一步（编辑流程断裂） | 已修（entry=edit/wizard 双模式）；R7/R8 链路 G 回归通过 | 2026-09-14-r6/audit-report.md:22-25 |
| MP-R6-PROFILE-001 | profile/我的帖子 | 「我的帖子」永远空态（loadMyPosts 全仓无调用点，DB 有 3 篇） | 已修（onShow 重试接线） | final/final-verify-20260912.md:50-57 |
| MP-R7-PROFILE-001 | profile | 头像白圈：媒体相对路径直连 `<image>` 被当包内文件 | 已修（resolveMediaUrl）；R8 复测无回归 | 2026-09-15-r7/audit-report.md:20 |
| MP-R7-PROFILE-002 | profile | 我的相册缩略图白板（同根因） | 已修 | 2026-09-15-r7/audit-report.md:21 |
| MP-R7-PROFILE-005 | profile | `ROUTES.ALBUM` 不存在 → 「恋爱相册」入口点击无效 | 已修 | 2026-09-15-r7/audit-report.md:24 |
| MP-R7-REALNAME-001 | 实名/认证 5 页 | DevTools tmp 路径被误判为服务器 URL → 实名证件落库 `http://tmp/*`，后台不可看、路径随时失效 | 已修（isUploadedMediaUrl 5 处） | 2026-09-15-r7/audit-report.md:25 |
| MP-R7-UPLOAD-001 | 全局上传 | `uni.uploadFile` 不经过拦截器 → 缺 Idempotency-Key，**所有文件上传 422**（头像/照片墙/发帖配图/实名证件） | 已修（uploadFileViaUni 补幂等键） | 2026-09-15-r7/audit-report.md:26 |
| MP-R8-STATUS-001 | likes | 「匹配列表」标题叠印状态栏 | 已修 | 2026-09-16-r8/audit-report.md:22 |
| MP-R8-STATUS-002 | profile/album | 「我的相册」标题被状态栏时间叠印 | 已修 | 2026-09-16-r8/audit-report.md:23 |
| MP-R8-LIKES-001 | likes | 「喜欢我的」永远空态（isUnlocked=isProfileComplete 守卫永不触发 fetchLikes） | 已修（门槛降为 isLoggedIn） | 2026-09-16-r8/audit-report.md:27 |
| MP-R8-DRAFT-001/002 | 发布/后端 | 草稿发布成功后永不清除：后端 DELETE 恒 500（缺 @Transactional）+ 前端只清本地 → 每次发布后重进恢复已发布内容（重复发布风险） | 已修（@Transactional + deleteDraft） | 2026-09-16-r8/audit-report.md:31 |
| R10-P1-001 | circle-home | 冷启动/深链进入有效圈子被误判「圈子不存在或已解散」（空态判定不等 fetch 落定） | 已修（circlesFetchSettled 门）；R11 列为 G6 断言持续防回归 | 2026-09-17-r10-visual/audit-report.md:14,83-93 |
| R10-P1-002 | love-center/consulting | 封存态（commerce.consult=false）仍展示 ¥99/129/159 课程+报名按钮 | 已修（isCommerceOn 接线）；R11/R12 复验封存通过 | 2026-09-17-r10-visual/audit-report.md:15,98-102 |
| R10-P1-003 | 全站 ≥5 页 | 状态栏叠印系统性复发（根因 A：103 处 env()、~50 页 env-only、usePageMetaStyle 死代码、第三套变量） | 已修（60 文件+12 页接线+守卫脚本 fail-fast）；R11 收紧 0/0 | 2026-09-17-r10-visual/audit-report.md:16,45-69；fix-report.md:17 |
| R10-P1-004 | match-success / real-name | 头像渲染为空白白圆（default-avatar 双份同名资源 + http 图被拒渲染） | 已修（resolveMediaUrl+@error 兜底+删重复副本） | 2026-09-17-r10-visual/audit-report.md:17,120-125；fix-report.md:18 |
| N1–N6（9.18 复核） | home/campus topic-detail/search/tag-posts/discussions/album | 首页偶发空白、campus 话题详情加载失败、搜索占位文案不符、tag-posts 裸"#"标题、讨论圈同文案、相册重复图 | R11 声明「全项修复」（N5 走接口层去重、N6 走 V2026.09.18.0001）；N1 在 R12 复验仍偶发（见下） | 2026-09-18-r11-full-acceptance/acceptance-plan.md:36-39,311-312；r11-acceptance/audit-report.md:97 |
| R11 五处类型级真 bug | 后端契约/messages/nearby-people/upload | 3 处幂等键 `header`→`headers`（**幂等键从未生效**，POST /matches/like 缺失即 422）、nearby-people 漏 import `tagLabelsFor`（渲染即 ReferenceError，R10 的 R34 骨架屏即此因）、uploadPostImage 缺 name、messages store mock 分支写未声明字段 | R11 修复（typecheck 46→0、测试 40 失败→1280 全绿） | r11-acceptance/audit-report.md:26-33 |
| R12-IND-NEARBY-LC-001 | love-center/nearby | 「附近的人」功能全灭：后端距离过滤剔除全部距离未知条目（全库无距离数据 → 恒 0 人） | 已修（距离未知保留）；R7 曾有同接口暂态空列表观察项 | r12-independent/audit-report.md:11 |
| R12-IND-NEARBY-LC-002 | love-center/nearby | 返回键被 space-between 推到胶囊正下方完全遮挡 | 已修（移至标题左侧） | r12-independent/audit-report.md:12 |
| R12-IND-PROFILE-OTHER-001 | profile/other | 深链 401 被笼统渲染，错误态仍显示互动 FAB | 已修（401 区分文案+错误态藏 FAB） | r12-independent/audit-report.md:13 |
| R12-IND-TOPICS-001 | campus/topic-detail | 401 静默成空错误信息 → 页面误渲染「话题不存在」 | 已修（store 层 401 透出） | r12-independent/audit-report.md:14 |
| R12-IND-HOME-001 | home | 首页偶发白屏（连 TabBar 全无） | **未闭环**：复验判定 DevTools 渲染层偶发，代码无全遮挡路径；blank 自动重拍兜底；巡检 2/144 复现 | r12-independent/audit-report.md:15,53 |

## 四、P2 全量清单

| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R2-OFF-004 | official-chat | 顶部 hero 遮挡首条消息 | 复核为滚动中间态，保留 | round-2/audit-report.md:12 |
| MP-R2-HOME-007 | home | 「关系动态」右上「全部›」被裁成「全」 | 已修 | round-2/audit-report.md:15 |
| MP-R2-TAB-010 | tabBar | TabBar 下方游离绿色短横线 | 已修（删激活指示条） | round-2/audit-report.md:18 |
| MP-R2-NEAR-011 | nearby | 校园圈徽标「北京大/学」硬换行 | 已修；R8-CAMPUS-001 在 hub 页复发同类 | round-2/audit-report.md:19 |
| MP-R3-MSG-001 | messages | 「最近聊天」被活动卡挤出首屏 | 已修（IA 顺序交换） | round-3/audit-report.md:42 |
| MP-R3-CIRCLES-001/002 | circles | 统计文案被省略号吃掉/按钮内边距过大 | 已修 | round-3/audit-report.md:43 |
| MP-R3-CAMPUS-001 | campus-hub | 统计文案「态」字孤行 | 已修 | round-3/audit-report.md:44 |
| MP-R3-POST-001/003 | post-detail | 帖 221 图文不符、互动数缺失 | 已修（数据迁移） | round-3/audit-report.md:46-47 |
| MP-R3-CIRCLEHOME-001/002 | circle-home | hero 返回钮状态栏/灰 chevron 不可读、云海帖三图不符 | 已修 | round-3/audit-report.md:48-49 |
| MP-R3-DISCOVER-002 | discover | 匹配度粉圆糊化不可读 | 已修（放大） | round-3/audit-report.md:50 |
| MP-R3-PUBLISH-001 | publish | 禁用态发布按钮对比度 1.36:1 | 已修（4.6:1+） | round-3/audit-report.md:51 |
| MP-R3-SETTINGS-002 | settings | 「恋爱认证」双入口重复 | 已修（去重） | round-3/audit-report.md:52 |
| MP-R4-OTHER-001 | profile/other | 他人主页返回钮侵入状态栏 | 已修 | round-4/audit-report.md:35 |
| MP-R4-CHAT-001 | chat-session | userId 深链标题回退「聊天」 | 已修（deepLinkPartnerName 回退链） | round-4/audit-report.md:36 |
| MP-R4-CIRCLEHOME-001 | circle-home | 云海帖三图山感不足 | 已修 | round-4/audit-report.md:40 |
| MP-R4-HOME-002 | home | 滚动遮罩数字硬裁切 | 已修（遮罩加高） | round-4/audit-report.md:46 |
| MP-R1-CIRCLE-001 | circle-home | 信息流作者头像全体绑死默认图 | R2 已修（authorAvatarUrl 接线）；R8-CIRCLE-001 回复 DTO 再犯同类（字母占位头像）已修 | 2026-09-12-round1/audit-report.md:40；2026-09-16-r8/audit-report.md:28 |
| MP-R1-LOGIN-001 | login | 授权拒绝后新用户无注册/登录路径（死路） | 已修（拒绝也展开表单，代码级验证——原生回调无法自动化） | 2026-09-12-round1/audit-report.md:38,89 |
| MP-R1-CIRCLE-002 | topic-detail | 回复计数有数无明细（12/8/6/4 vs 0 行） | 已修（V2026.09.12.0005）；IA-TOPIC-01 在 topic 25-28 复发同类 → V2026.09.13.0001 全量重算 | 2026-09-12-round1/audit-report.md:39 |
| IA-POSTTOPIC-01 | circles/post-topic | 导航叠压状态栏（env(safe-area-inset-top) 模拟器为 0） | 已修（JS 注入 statusBarHeight） | 2026-09-13-final/FINAL-ACCEPTANCE.md:36 |
| IA-STATS-01 | 后端契约 | /profile/stats 半数字段硬编码 0、获赞/我喜欢语义错位 | 已修（真实聚合） | 2026-09-13-final/FINAL-ACCEPTANCE.md:37 |
| IA-CIRCLEHOME-01 | circle-home | real 模式缺参静默渲染成套 mock 假数据 | 已修（真实空态）；R8 复测通过 | 2026-09-13-final/FINAL-ACCEPTANCE.md:38 |
| INDEP-001 | village/publish | snapshotDraft ReferenceError，草稿双写从不生效 | 已修（buildMergedTopics 提取） | independent/indep-fix-verification.md:7 |
| INDEP-002 | chat-session | conv- 业务键被当会话 id 调消息接口 → 400 | 已修（uid 解析+错误横幅） | independent/indep-fix-verification.md:8 |
| INDEP-003 | 全局 WS | WebSocket 重连不关旧 socketTask → exceed max task count | 已修；注意与「WS connect 0 接线封存决议」（R11 G5）并存 | independent/indep-fix-verification.md:9 |
| INDEP-004 | messages | 消息页无滚动遮罩（与首页不一致） | 已修（复用渐变遮罩） | independent/indep-fix-verification.md:10 |
| MP-R7-PROFILE-003 | profile | toLocalImage 不兜底媒体代理路径 | 已修（统一 resolveMediaUrl） | 2026-09-15-r7/audit-report.md:22 |
| MP-R7-PROFILE-004 | profile | 资料完成度前端恒 10% vs 后端权威 30% | 已修；R8-LOCK-001 发现 LockScreen 两页同病再修 | 2026-09-15-r7/audit-report.md:23；2026-09-16-r8/audit-report.md:29 |
| MP-R7-ADMIN-IMG | admin | 后台「查看图片」直链不带 Authorization → 401 | 已修（fetch→blob） | 2026-09-15-r7/audit-report.md:27 |
| MP-R8-STATUS-003 | heart-signals | 关闭钮位置同状态栏缺陷 | 已修 | 2026-09-16-r8/audit-report.md:24 |
| MP-R8-STATUS-004 | CardDetailOverlay | 卡片详情浮层顶栏同缺陷 | 已修 | 2026-09-16-r8/audit-report.md:25 |
| MP-R8-CAPSULE-001 | likes | 「管理」钮压进胶囊（96px 全宽预留） | 已修 | 2026-09-16-r8/audit-report.md:26 |
| MP-R8-LOCK-001 | village/heart-signals | LockScreen 完成度 10% 与我的页 30% 矛盾 | 已修（服务端权威值+onShow 懒加载 60s TTL） | 2026-09-16-r8/audit-report.md:29 |
| MP-R8-OWNPOST-001 | village/detail | 自己的帖子显示「+关注」（可关注自己） | 已修 | 2026-09-16-r8/audit-report.md:30 |
| MP-R9-STATUS-005 | setup/interest | 「选择兴趣」标题被状态栏时间叠印 | 已修；R10 证明此类问题仍有 ~50 页隐患（T1） | 2026-09-16-r9/audit-report.md:36 |
| R10-P2-005 | likes | 「匹配列表」标题与返回按钮重叠 | 已修 | 2026-09-17-r10-visual/audit-report.md:18；fix-report.md:22 |
| R10-P2-006 | love-center/nearby | 昵称 `?...`+「亲密度」徽标压简介 | 已修（根因反转：schoolLabel 兜底拆了自由简介 headline；`?...` 为 masked 设计） | 2026-09-17-r10-visual/audit-report.md:19；fix-report.md:23 |
| R10-P2-007 | campus-hub | 校名截断、数字格式混用 | 已修（badge 下沉+k 格式——注意与 T9 裁决口径关系） | 2026-09-17-r10-visual/audit-report.md:20；fix-report.md:24 |
| R10-P2-008 | tools/search | 缺返回入口；空态双文案矛盾；tab 语义不符 | 已修 | 2026-09-17-r10-visual/audit-report.md:21；fix-report.md:25 |
| R10-P2-012 | market×3/real-name | 封存页与实名页缺自定义导航栏 | 已修（real-name safe-top 移位+注入；market 补注入） | 2026-09-17-r10-visual/audit-report.md:25；fix-report.md:29 |
| R10-P2-014 | love-center/consulting | 导航绿色实心不一致；MBTI 入口重复 | 已修（AppShell 统一+去重） | 2026-09-17-r10-visual/audit-report.md:27；fix-report.md:30 |
| R10-P3-015 | 多页 | 审计测试数据污染正式库 | 已修（V2026.09.17.0001）；R11/R12 又各清一次（T8） | 2026-09-17-r10-visual/audit-report.md:28；fix-report.md:37 |
| R10-P3-016 | discover/nearby | 标签英文 key 未映射中文 | 已修（tag-label.ts 字典；R11 验证 5 个英文值全覆盖） | 2026-09-17-r10-visual/audit-report.md:29；fix-report.md:38 |
| R10-P3-018 | discover/discussions | 副标题重复、条目缺元信息、同句霸榜 | 部分修复（后端本无作者/时间字段不做假数据；R11 接口层指纹去重 10/10 distinct） | 2026-09-17-r10-visual/audit-report.md:30；fix-report.md:39；r11-acceptance/audit-report.md:54 |
| R10-P3-019 | official-chat | 9 月推「春季联谊会」、推「交友币」与封存矛盾 | 已修（迁移修正文案） | 2026-09-17-r10-visual/audit-report.md:31；fix-report.md:40 |
| R10-P3-020 | discover/activities | 分类兜底文案「其他」语义不清 | 已修（改「综合」） | 2026-09-17-r10-visual/audit-report.md:32；fix-report.md:41 |
| R10-P3-022 | profile/album | 相册空位边框近乎不可见、按钮弱可点击感 | 已修（虚线描边+品牌色） | 2026-09-17-r10-visual/audit-report.md:34；fix-report.md:42 |
| R12-IND-EVIDENCE-001 | 巡检方法论 | console 证据缺失 | 已修（每页 console-evidence-*.log 全量落盘） | r12-independent/audit-report.md:19 |
| R12-IND-HTTP-401-001 | 全局 | 401 → reLaunch 登录页劫持当前页 | **书面豁免**（会话语义全局策略，产品决议项） | r12-independent/audit-report.md:16 |
| R12-IND-AUTH-GATE-001 | 多页 | 公开内容鉴权口径不一致（home/discover 匿名可看，village/activities 强制登录） | **书面豁免**（产品决议项） | r12-independent/audit-report.md:18 |
| R12-IND-PROFILE-INDEX-001 | profile（未登录态） | 未登录头部图标与状态栏叠印 | **待查**（登录态正常） | r12-independent/audit-report.md:17 |

## 五、P3/P4 与书面豁免/产品决策（回归时验证"仍然只是记录"即可）

| 主题 | 内容 | 来源 |
|---|---|---|
| 数字格式裁决 | 「1.2w vs 8,932」混用=理想图自身口径，R21 裁决维持；R10 又统一为 k——建议产品终审（T9） | round-3/audit-report.md:87；round-4/audit-report.md:53；final/final-acceptance-report.md:86 |
| 附近页 IA 冻结 | 分区顺序「严格冻结」注释为产品决策；「附近动态」板块列入迭代需求 | round-3/audit-report.md:88；2026-09-13-final/FINAL-ACCEPTANCE.md:49 |
| 圈名短名口径 | 理想图两处互相矛盾，取附近页口径 | round-2/audit-report.md:41 |
| publish 版底部工具栏 | publish=简化发布入口（产品决策），与 post 版两实现并存（R10-P2-013 维持） | round-2/audit-report.md:23；2026-09-17-r10-visual/audit-report.md:133 |
| tabBar 中央浮岛 | 「寻觅」差异化设计（产品确认） | round-1/audit-report.md:68 |
| 素材缺口 | 星野/叶清欢纹理头像、复旦封面跑道图、云海帖无真山景、heart_pink 透明图（已换） | round-4/audit-report.md:60；final/final-acceptance-report.md:87 |
| backlog 项 | 帖子来源圈子行（posts.circle_id）、他人主页学校距离行/共同点结构、本校 CTA 差异化、关系动态真实头像数据源、圈子头像堆叠真实好友数据 | round-3/audit-report.md:92；round-4/audit-report.md:56-57；2026-09-12-round1/audit-report.md:105；2026-09-13-final/FINAL-ACCEPTANCE.md:52 |
| MBTI 双 IA | 「16 型速览+4 题测试」混排保留观察，拆分需产品定夺 | 2026-09-17-r10-visual/audit-report.md:135；fix-report.md:46 |
| love-center 内容单薄 | 恋爱咨询页仅 2 入口——书面豁免（内容建设项） | 2026-09-18-r11-full-acceptance/acceptance-plan.md:312；r12-independent/audit-report.md:23 |
| circles 空态 CTA | 空态文案含糊，pageState 已区分 error/empty，CTA 增强列后续 | r12-independent/audit-report.md:22 |
| 三处 0 接线决议 | getPhoneNumber / ContentSecurityChecker / WS connect 维持「正式封存」（9.17 汇报口径，R11 G5 复核无变更） | 2026-09-18-r11-full-acceptance/acceptance-plan.md:38；r11-acceptance/audit-report.md:57 |
| release 链三步未本地执行 | verify-env-release（HTTPS 生产域名）+ 主包 ≤2MB 严格门禁 + 真机隐私授权链——**发布前必须执行**；real:dev 形态主包 27.68MB（书面豁免口径） | r11-acceptance/audit-report.md:61 |
| lint warnings 14432 | 0 error 达标；格式类 warn 建议单独批次 --fix | r11-acceptance/audit-report.md:69 |
| G4 交互未逐点 | 809 绑定仅七链路+抽样点验，未逐点执行（工具限制：automator 对自定义组件不生效） | r11-acceptance/audit-report.md:66 |
| 非法 JSON 500→400 | 后端 P4 待办（小程序端不产生该形态） | 2026-09-13-final/FINAL-ACCEPTANCE.md:53 |
| 协议默认勾选差异 | 登录页默认勾选 vs 注册页不预选（行业惯例，仅记录） | 2026-09-12-round1/audit-report.md:46,107 |
| 微信登录生产化 | 未配 WECHAT_APPID/SECRET → /v1/auth/wechat 502 预期降级；生产前置条件 | final/final-verify-20260912.md:85 |
| 真机手势人工抽检 | 侧滑返回/下拉刷新无法自动化，登记为人工抽检项（R5/R11 均记录） | round-5/audit-report.md:32；r11-acceptance/audit-report.md:68 |
| INDEP-006 Vue TypeError | 压缩产物 2 次未归因，登记监控：复现开 dev sourcemap | independent/indep-fix-verification.md:12；final/final-acceptance-report.md:89 |
| media-query-token-strict | 上线时置 true + 客户端改 5 分钟媒体令牌（端点已就绪） | 2026-09-13-r5/audit-report.md:51 |
| 照片墙当次不回显 | IA-VISUAL-EDIT-01 P3 决策接受（重进回显）；乐观回显列为后续 | 2026-09-14-r6/audit-report.md:70 |
| campus hub 校名省略号 | 6 字校名四列挤压，根治需布局重排偏离理想图，记 P4 维持 | 2026-09-16-r8/audit-report.md:35,94 |
| 校区字段混用 | 「北校区/南校区」为有意种子（校区过滤键），设计如此 | 2026-09-17-r10-visual/fix-report.md:41 |
| 推荐池性别分布 | 库内 116 女/93 男；未设性别账号默认女性候选为预期行为 | 2026-09-17-r10-visual/fix-report.md:43 |
| 首页横滑无露头/瓦片字号/标签微偏 | P4 记录维持 | round-3/audit-report.md:89；round-4/audit-report.md:58-59 |

## 六、R11 截图矩阵中的 blank/stuck 场景（R12 已逐张定性，本轮仍需复核）

来自 r11-acceptance/screenshot-matrix.md（stamp b0919-r12b，72 路由×双身份=144 场景）：
- **BLANK**：pages/home/index（A+B 双侧熵 0.98-0.99）、profile/other（A+B 熵 0.97）、vip/index（A 侧熵 0.99）。
- **STUCK/骨架**：village/tag-posts、village/history、circles/index、circles/topic-detail、campus/topic-detail、love-center/index、tools/search、profile/other（BLANK+STUCK）、profile/favorites、feedback/history、discover/activities、market/detail（A+B 两侧）。
- B 侧 MISSING 6 场景（settings/dnd、setup/profile、setup/interest、discover/activities、market/shop）——即 R12-IND-GLOBAL-001 双身份失效的表象。
- R12 结论：修复页（nearby-lc、search、messages、topic-detail×2、profile-other）脱离 blank/stuck；home 偶发白屏 2/144 复现后重拍恢复；其余定性为合理空态/骨架等待/偶发（r12-independent/audit-report.md:30-31）。**本轮回归应重跑该矩阵并对照此清单。**

## 七、回归高风险区梳理（对应本轮任务第 2 点）

1. **底部导航（TabBar）**：R2-TAB-010 游离线；R2-MSG-006 消息角标接 custom-tab-bar 未见闭环；R4-HOME-004 底部横幅/tabBar 净空 360rpx；R12 首页偶发白屏连 TabBar 全无；R11 要求 tab 切换状态保持（滚动位/已加载数据不丢）从未逐点验证（G4 偏差）。
2. **页面高度/滚动**：R1-HOME-013 banner 空白区；R3-HOME-006/R4-HOME-002/INDEP-004 滚动遮罩三处；R10-P2-009/010（兴趣页/MBTI 溢出，复核为误报但复发条件=内容变化）；R11「滚到底最后一条内容完整可见」检查；R2 渠道弹层 78vh+安全区。
3. **弹窗/弹层**：R2 渠道弹层缺组；R3 位置授权弹窗遮挡；R4 亲密度徽标压简介（根因反转类）；R11 modal 三路关闭/遮罩行为规范；R12 错误态仍显示互动 FAB。
4. **聊天**：滚底（R1-P0）、气泡方向、时间条未来时间、未读角标数据源、tabBar 角标遗留、WS 重连上限、conv-/userId 深链、preview 残留（R11）、官方号内容与封存矛盾（R10-P3-019）。
5. **发布**：草稿残留（R8 P1）、snapshotDraft 崩溃（INDEP-001）、空提交阻断/长文 720-1000 计数（R5）、上传 422 幂等键（R7）、publish/post 双实现差异、标题贴胶囊（R4/R5）、图片 ≤10MB/相册 ≤6 上限校验（R11 规范，未见实测记录）。
6. **匹配**：matching 无上下文兜底（P0 证伪项，防"修坏了兜底"）；match-success 双头像兜底（R10-P1-004）；nav/胶囊避让（R3/R4）；喜欢幂等键（R11 header→headers）、cancel-like 软删语义、互赞→heart_signals→会话建立链（R7/R8/R11 验证过，改动易碎）。
7. **个人资料**：四格计数假 0（R3/R7 两轮根因）、完成度口径（10/30/70% 三处来源：profile、LockScreen×2、/profile/basic 权威）、编辑模式 entry=edit 返回逻辑（R6 P1）、照片墙回显时序、ROUTES.ALBUM 类路由常量错、picker 类名可测试性、头像渲染白圈。
8. **图片**：媒体链全套（T5：token 拼接、相对路径、tmp 误判、上传白名单/幂等、默认头像唯一真身 assets/default-avatar.jpg）、图文语义映射（R1-R4 多轮数据修复）、`<image>` mode 规范（已有守卫）。
9. **返回**：深层返回链 pageStack（R3/R11 验证）、编辑模式 navigateBack vs redirectTo、401 reLaunch 劫持（豁免但回归时应观察其影响面）、R12 返回键被布局推入胶囊带、matching 200ms goBack 兜底。
10. **状态（页面状态机/鉴权态）**：状态栏体系（T1，改任何页头都易复发）；空态四态竞态（T3：circle-home 模式——**新增任何"不存在/已解散"判定必须 gate 在 fetch 落定**）；鉴权错误态渲染（R12 三项修复点）；封存闸（T10）；冷启动假 0（T4：任何"进页面才显示的统计"都要核对触发点）。
11. **数据合规/种子质量**：审计残留（T8，本轮验收自身又会写入新数据）；标签映射字典；讨论圈同句去重（接口层）；相册重复；数字格式（T9）。
12. **证据可信度**：DevTools 编译缓存/代理/Node 版本/reLaunch 假死/token 互踢（T12）——本轮任何"页面表现异常"先排除环境再定缺陷；双身份 boot 校验必须先过（T11）。

## 八、截至最近一轮（R12）的未闭环项（下一轮输入）

1. R12-IND-PROFILE-INDEX-001：profile 未登录态头部与状态栏叠印（待查）。
2. R12-IND-HTTP-401-001 / R12-IND-AUTH-GATE-001：401 全局 reLaunch 策略、公开内容鉴权口径（需产品决议）。
3. R12-IND-HOME-001：首页偶发白屏（列为已知偶发；巡检 blank 自动重拍兜底）。
4. R12-IND-LOVECENTER-IDX-001 / R12-IND-CIRCLES-001：恋爱咨询内容建设、circles 空态 CTA。
5. R2-MSG-006 遗留：消息 TabBar 角标接 custom-tab-bar（P2 待办，R2 之后未见闭环记录）。
6. release 链三步未本地执行（HTTPS 域名、主包 ≤2MB 严格门禁、真机隐私授权链）。
7. lint warnings 14432 批次清理；G4 交互逐点点验工具建设。
8. 「9.17 周汇报」LBS Phase 2（R11 方案列入待闭环，后续轮未见处置记录）。
9. 真机手势（侧滑返回/下拉刷新）人工抽检；微信登录生产化（WECHAT_APPID/SECRET）。
10. MBTI 双 IA、love-center 双 IA 观察项的产品定夺。

---

### 附：本轮生成时执行的取证动作
- 通读上列 27 份报告全文（Read 工具，逐份）。
- `find reports/audit -type f -name "*.md" -exec wc -l`（清点 27 份、确认无遗漏文件）；`find reports -maxdepth 2 -name "*regression*"`（顶层 regression/final 目录为空，确认无其他报告载体）。
- `ls 素材/理想效果图 deliverables/注册页 archive/design/design-system 等`（核对理想基准引用路径真实存在，见 submit_result.idealRefs）。
- 未执行任何构建/测试/代码修改。
