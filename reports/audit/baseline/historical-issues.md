# 历史问题清单基线（historical-issues baseline）

- 生成日期：2026-09-22（本版取代同日 01:23 版；新增「第四周期 R1/R2/R3 代码审查」round-1/2/3 code-findings 全部发现 +「第五周期 R13 真实链路验收」2026-09-22-r13-goal 全部发现）
- 生成方式：通读 `reports/audit/` 下全部 25 个审计目录共 40+ 份报告/矩阵/证据（round-1..5 及其 issue-matrix/regression/screenshot-matrix、2026-09-12-round1、2026-09-13-final / -independent / -r3 / -r5、2026-09-14-r6、2026-09-15-r7、2026-09-16-r8 / -r9、2026-09-17-r10-visual（audit+fix）、2026-09-18-r11-full-acceptance、r11-acceptance（audit / chain-results / ideal-comparison / screenshot-matrix）、r12-independent、independent、final×2、2026-09-22-r13-goal（R13-ACCEPTANCE + design-parity-findings）），并逐条解析 `round-1/issue-matrix.md`（405+69 条）、`round-2/issue-matrix.md`（295 条）、`round-2/audit-report.md`、`round-1/regression-report.md`、`round-1/interact/*.json`（R21 交互取证）、`round-3/code-findings/*.json`（14 份 149 条，用 python 逐份解析）、R13 两份报告；交叉参照 `baseline/ideal-baseline.md` 与 `baseline/regression-index.json`。
- 用途：**本轮回归核对的线索库**。任何条目不因最近一轮截图"看起来正常"而视为已解决；"最后状态"只是该问题最后一次被观测到的结果，本轮必须作为回归线索逐条重新核验。
- 轮次对照：round-1..5 目录内 2026-09-10/11 报告（视觉周期）＜ 2026-09-12-round1 ~ r12-independent（真实环境周期 R1-R12）＜ round-1/interact（第三周期「R21 交互审计」，修复批 = `5e2d050c`，P1×11+P2×26+P3×23=60 项）＜ **round-1/2/3 code-findings（第四周期「R1/R2/R3 代码审查」，2026-09-22，修复批含 `b3d31fcd`/`29a2b1df` 及当日并行修复；R1=405+69 条、R2=295 条、R3=149 条）** ＜ **2026-09-22-r13-goal（第五周期「R13 真实链路验收」，2026-09-22，HEAD≈`aefd8a72` 之后）**。
- 范围约束：本文件为唯一写入产物，未改动任何代码/脚本/配置。

---

## 一、反复出现的系统性问题（回归第一优先级）

以下主题在 ≥2 轮中重复出现或一次性暴露系统性根因，是历史复发率最高的区域：

### T1 状态栏叠印 / 避让链路断裂（复发之王：≥7 轮、≥20 处真实缺陷）
- 首发与蔓延：R1 STATUS-017（10/12 页状态栏时间不可见）→ R3 六处（HOME-001、HOME-006、PROFILE-001、DAILY-001/003、MSUCCESS-001/002、SETTINGS-001）→ R8 四处（STATUS-001 likes、002 album、003 heart-signals、004 CardDetailOverlay）→ R9 一处（STATUS-005 兴趣页）→ R10 系统性收口（≥5 页叠印实拍 + 全仓 103 处 `env(safe-area-inset-top)`、~50 页 env-only、`usePageMetaStyle` 注入路径 0 引用死代码、第三套变量 `--statusbar-height`）→ R12 一处待查（PROFILE-INDEX-001 未登录态头部）。
- **第四周期 R3 新增同族**：MP-R3-CAMPUS-INDEX-002 / MP-R3-POSTTOPIC-002 / MP-R3-VILLAGE-INDEX-004——**真机口径「双重避让」**：全局 `page { padding-top: var(--statusbar, env()) }`（App.vue:336）在真机取 env()≈状态栏高，页面页头又自带一份 `--statusbar`（JS 测量），两者相加整体下移约一个状态栏高（DevTools env 恒 0 不可见，**静态守卫 check-statusbar-offset 查不出这类叠加**）。campus/index 叠加还导致 `.campus-page` 定高 overflow:hidden 时列表底部被裁。
- 根因模式：①写了 `var(--statusbar,...)` 但没接 `useMenuButtonRect()` 注入源；②裸用 `env()`；③**page 级与页头级双重让位叠加（新确认，真机专属）**。
- 现有防线：`scripts/check-statusbar-offset.mjs`（R10 建、R11 收紧 0/0 + fail-fast）——只防①②，不防③。
- 来源：round-1/audit-report.md:36；round-3/audit-report.md:31-36；2026-09-16-r8-independent/audit-report.md:22-25；2026-09-16-r9-newuser-lifecycle/audit-report.md:36；2026-09-17-r10-visual/audit-report.md:45-69；r12-independent/audit-report.md:17；round-3/code-findings/SUBPACKAGES-CAMPUS-CAMPUS-INDEX.json、SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC.json、SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json。

### T2 胶囊按钮碰撞 / 底部净空 / 元素被原生层遮挡（≥7 轮）
- 历史：R1 POST-001（发布钮与胶囊挤在一起）、VILLAGE-002（搜索框伸进胶囊下）→ R2 HOME-007（「全部›」被裁）→ R4 CAMPUS-001（认证钮被胶囊压住 85%，根因 padding 公式 `7+8` 漏算胶囊本体，改 `7+104`）→ R4 MSUCCESS-001 → R8 CAPSULE-001（「管理」钮压进胶囊，96px 全宽预留）→ R12 SEARCH-001、NEARBY-LC-002。
- 第三周期（R21）新增复发：R21-VISITORS-002、R21-PROFILE-001（FAB 80% 被 tabBar 白面板遮盖）、R21-DISCOVER-INDEX-003（游客入口胶囊被自定义 tabBar 原生层整体遮挡）。
- **第四周期回归核对结论**：MP-R3-VILLAGE-POST-R001（P0 回归核对，post.vue `calc(var(--capsule-right,7px)+104px)` 修复在位，但该页只接 useStatusBarHeight 未接 useMenuButtonRect，--capsule-right 恒走 7px 静态兜底）；MP-R3-PAGES-DISCOVER-INDEX-001（R2 修复批把游客胶囊 bottom 80→128rpx，几何复核 safe=0 ✓、safe=34px iPhone 下仍差约 2-4rpx 圆弧相切，**终验仍需真机游客态截图**）；MP-R3-PAGES-PROFILE-INDEX-004（FAB/BottomSheet 修复在位待终验）；R13 design-parity 再报：相册页「1/6」计数器压在胶囊下（album.vue `.album-header` 只避让状态栏未预留 `--capsule-right`）、兴趣圈列表搜索钮被胶囊占位区吞掉、campus hub 头部绿钮塞进胶囊带——**胶囊避让在非 header 位置仍是活跃缺陷面**。
- 根因模式：只预留右缘间隙漏算胶囊全宽（≈87-104px）；fixed 元素与 tabBar/胶囊带层叠冲突；非 header 元素（计数器/搜索钮/FAB）漏避让。
- 来源：round-1/audit-report.md:15-16；round-4/audit-report.md:34-39；2026-09-16-r8-independent/audit-report.md:26；r12-independent/audit-report.md:12,20；round-1/interact/次要18.json、PAGES-PROFILE-INDEX.json、PAGES-DISCOVER-INDEX.json；round-3/code-findings/*.json；2026-09-22-r13-goal/design-parity-findings.md §2.13/2.7/2.9。

### T3 冷启动/深链直达时的空态竞态与栈底行为（≥5 轮）
- R10-P1-001：圈子主页冷启动/深链直连被误判「圈子不存在或已解散」（空态判定不等 `fetchCircles()` 落定）。修复：`circlesFetchSettled` 门。R1-CIRCLEHOME-R002/R3 复核在位。
- 同类：R4 CHAT-001（userId 深链标题回退「聊天」）、R5/INDEP-002（conv- 业务键被误判临时会话；**R1-CHAT-005 复核：冷启动深链场景 400 仍可复现，修复不彻底**）、R12 TOPICS-001（campus 话题详情 401 静默 → 误渲染「话题不存在」；**R1-TOPICDETAIL-001：同病在 circles/topic-detail 复发**）、R12 PROFILE-OTHER-001（他人主页 401 笼统渲染）、MP-R1-DETAIL-006（进详情页 setCurrentPost 不 await + onError 页面兜底 → real 误报「帖子不存在」）。
- R21 把「深链直开」扩展到整条返回/兜底链（T14：tag-posts/history/dnd/settings/verification/real-name/official-chat 等 ≥8 页栈=1 返回失效）。
- R11 方案把「每个带参页 reLaunch 冷启动直连、首屏严禁闪现错误空态」列为 G6 断言；**R13 实操再次踩中**：65 号补拍漏传 circleId 页面正确落入空态（取证无效），证明「路由→截图映射」必须先校验当前页面路径。
- 来源：2026-09-17-r10-visual/audit-report.md:71-101；round-5/audit-report.md:13；independent/indep-fix-verification.md:8；r12-independent/audit-report.md:14；round-1/issue-matrix.md（DETAIL-006/TOPICDETAIL-001/CHAT-005 条目）；2026-09-22-r13-goal/R13-ACCEPTANCE.md §3.4。

### T4 数据契约矛盾 / 静默假数据 / 假空态假零（≥7 轮，mock 层已成重灾区）
- 历史主案：IA-TOPIC-01（回复徽标 vs 暂无回复，三次复发：seed 层→topic 25-28→R21 mock 层）→ R3-PROFILE-001（四格冷启动假 0）→ R8-LIKES-001（「喜欢我的」永远空态）→ R7-PROFILE-004 / R8-LOCK-001（完成度 10% vs 30%）→ IA-CIRCLEHOME-01（circle-home 缺参静默渲染 mock）→ final-verify MP-R6-PROFILE-001（「我的帖子」永远空态）。
- **第四周期新增 mock/契约矛盾族（全部待修复）**：
  - MP-R3-VILLAGE-INDEX-001：**mock 今日广场 feed 批量图文不符 ≥13 帖**——修复批注释声称的图片内容与静态资源实图相反（post-4.jpg 实为热饮杯特写、post-5 实为海岸悬崖、post-1 实为水珠、post-3 实为城堡草坪，注释恰好写反）；MP-R2-VILL-013「晚霞帖」只是该族一例，**实读图片核对是唯一可靠验证法**。
  - MP-R3-PAGES-DISCOVER-INDEX-007：寻觅每日配额设备级单键 `discover_daily_record` 无 userId 命名空间——跨账号继承配额/排除名单/rewind 快照，登出不清。
  - MP-R1-PAGES-MESSAGES-INDEX-011：寻觅助手卡 `?? 2` 兜底 + 硬编码「周末露营」假活动文案。
  - MP-R1-PAGES-HOME-INDEX-013：「附近有 N 位」用 `Math.max(items.length,4)` 虚构保底人数；HomeHeader 兜底「北京大学 · 3km」虚构距离。
  - MP-R1-CAMPUS-HUB-009：11 校成员数/动态数前端硬编码假数据 + 通用假兜底「1.0k 同学 · 8k 动态」（R13 复核确认「约」前缀是 MP-R2-CAMPUS-HUB-007 刻意加的诚实标注，**去「约」反而违规**）。
  - MP-R1-CIRCLEHOME-001：real 模式圈内无话题时仍回退渲染 3 条写死演示动态（假校名/假点赞）；MP-R1-CIRCLEHOME-002「等 0 位朋友已加入」real 模式依旧可见。
  - MP-R1-PUBLISH-006：「添加位置 · 自动定位」读 `nearby:city` 全库无写入方 → 恒「北京市」。
  - MP-R1-VERIFY-INDEX-003：「重新认证/删除人工认证」real 模式只重置本地 ref 无 API，假状态骗用户。
  - MP-R1-PRIVACY-001：隐私两开关「假保存」（只写本地 storage 从不调后端，real 也不回填）。
  - MP-R1-HSIGNALS-101：real 模式「已拒绝」被折叠回「待处理」（mapToHeartSignal 缺 declined 分支）。
- 根因模式：空态判定与数据加载不分离、前端快照口径与服务端权威值并存、mock 兜底无水印、字符串/数字 id 与字段名在映射层静默失配、**注释/文案声称的数据与磁盘实图/真实接口不符**。
- 来源：2026-09-13-independent/INDEPENDENT-AUDIT.md:59-82；2026-09-13-r3/audit-report.md:19-31；2026-09-15-r7/audit-report.md:23；2026-09-16-r8-independent/audit-report.md:27-29；final/final-verify-20260912.md:50-57；round-1/issue-matrix.md；round-3/code-findings/*.json。

### T5 媒体链路（上传/鉴权/渲染/兜底/构建裁剪）全链脆弱（≥4 轮集中爆发）
- R5（4×P1「从未通过」级）：AVATAR-500（normalizeType 白名单缺 avatar）；MEDIA404（extractSubPath 语义错 → 上传图片读取 404）；MEDIAAUTH（resolveMediaUrl 不给 `/api/v1/media/**` 拼 token）；ADMINTHUMB（后台裸 `<img>` 401）。
- R7（6 项）：PROFILE-001/002（相对路径直连 `<image>`）、PROFILE-003（toLocalImage 不兜底媒体代理路径）、REALNAME-001（DevTools tmp 路径 `http://tmp/xxx` 被误判为服务器 URL → 证件落库 `http://tmp/*`）、UPLOAD-001（uni.uploadFile 不走拦截器 → **所有文件上传 422**）、ADMIN-IMG（后台直链 401）。
- R10-P1-004：匹配成功/实名页头像空白白圆（default-avatar 两份同名资源 + http 图被拒渲染——**R13 已证伪「mp 基础库拒载 http 图」**：`wx.getImageInfo` 直取 8080 app-assets 图成功）。R4-MATCHING-001：heart_pink.png 全透明空文件。
- **第四/五周期新增**：MP-R2-MATCHING-002（匹配动画双头像未过 resolveMediaUrl，real 空圆）；MP-R2-SEGMENT-001 / MP-R2-SEARCH-001 / MP-R2-OTHER-001（segment/搜索/他人主页头像配图裸直连——**「resolveMediaUrl 漏网之鱼」每次全站扫描都能扫出新一批**）；MP-R3-PAGES-HOME-INDEX-002（首页 3 组图片绑定绕过统一出口：TodayRecommendationCard 主图 + RelationActivity 四组头像）；MP-R3-PAGES-HOME-INDEX-003（mock 旅行圈 icon 指向磁盘不存在文件且 `/` 开头路径无条件信任 → 恒空白）；MP-R1-CAMPUSINDEX-003（话题作者头像裸绑定）；MP-R1-ALBUM-001（相册 uni.previewImage 直传原始 URL 数组）；MP-R1-PROFILE-201（我的故事配图裸直连，**MP-R7-PROFILE-002 同病回归复发**）。
- **R13-P1（已修+验证）**：real 构建下库内头像必然空白——`prepare-static --real` 为守主包门禁把 `avatars`+`people`（≈4MB）剪出包外，而库内 265 个 `users.avatar_url` 存的正是这些包内路径，`resolveMediaUrl` 对 `/static/` 原样返回 → 两头落空；且 `Avatar.vue` 模板**裸绑 `:src` 从不调 resolveMediaUrl**，全站头像都经该组件故修复必须在组件内。修复=media.ts 对 `assets/images/{avatars,people}/` 两前缀改写为后端 app-assets 绝对地址 + Avatar.vue 组件内 resolvedSrc。**回归要点：任何动 prepare-static/包体积门禁/Avatar.vue 的改动都要重验全站头像。**
- 现有约定：媒体代理 URL 一律 `appendTokenIfMissing`；默认头像唯一真身 `assets/default-avatar.jpg`；`isUploadedMediaUrl()` 判上传（**MP-R3-VILLAGE-POST-001：post.vue 提交链路仍用裸 `/^https?:\/\//` 判定，DevTools tmp 路径会再落死链——R7 修复只改了草稿侧**）；`<image>` mode 有静态守卫。
- 来源：2026-09-13-r5/audit-report.md:15-20；2026-09-15-r7-full-verify/audit-report.md:19-27；2026-09-17-r10-visual/audit-report.md:120-125；round-4/audit-report.md:38；round-1/round-2/round-3 issue 数据；2026-09-22-r13-goal/R13-ACCEPTANCE.md §3.2。

### T6 草稿 / 发布闭环（≥4 轮）
- R8-DRAFT-001/002（P1）：后端 `DELETE /drafts/current` 恒 500（缺 `@Transactional`）+ 前端只清本地不清后端 → 每次发布后重进恢复已发布内容（重复发布风险）。MP-R1-PUBLISH-009 复核：deleteDraft 失败仍 `.catch(()=>{})` 静默，restoreDraft 无条件优先后端草稿——**二次发布通道未彻底关闭**。
- INDEP-001（P2）：snapshotDraft 越界引用 → 草稿双写从不生效（R1/R3 复核已修复）。
- R21：PUB-016（上限 1000 vs 500）、PUB-017（兴趣圈子分组静默消失）、POSTTOPIC-001（circleId 未生效）、CAMPUSPOST-001（空表单静默）——**R1/R2/R3 三轮回归核对全部判定已修复**（MP-R3-VILLAGE-PUBLISH-001/002/003、MP-R3-POSTTOPIC-008 已验证/已修复待终验）。
- **第四周期新增（待修复）**：MP-R1-POST-101（发圈成功后草稿残留 → 下次进页 UI 显示个人动态、实际提交进圈——UI 与提交目标不一致）；MP-R1-PUBLISH-002（草稿 watch 对 images/topics 的 push/splice 原地变异无感知，deep:false）；MP-R1-PUBLISH-003（防抖定时器三条路径都丢尾帧：「保留草稿」最终快照永不落盘）；MP-R1-PUBLISH-004（publish 与 post 共用存储键 `village:post-draft` 但快照结构不同互不兼容）；MP-R1-PUBLISH-005（friends 入口可被旧草稿改写隐私语义）；MP-R2-PUB-101（restoreDraft 缺 friends 分支 → 目标卡与可见性矛盾）；MP-R3-VILLAGE-POST-002（圈子目标下已选话题两条路径仍被静默带走）；MP-R1-CAMPUSPOST-002（real 配图上传 Idempotency-Key 恒定冲突：每张图同名 campus-topic.jpg → 同键 409/去重）；MP-R1-PUBLISH-001（visibility 后端 CreatePostRequest 无字段被静默丢弃）；MP-R1-CAMPUSPOST-004（发布成功 800ms 窗口 isSubmitting 已复位 → 可重复提交重复帖）。
- publish/post 双实现并存（R10-P2-013 判「设计如此」保留），但 MP-R1-PUBLISH-012 实测两页 733/1528 行大面积重复且已发生行为分叉（上限/分组/草稿结构/话题能力 PUBLISH-006 单话题 toggle vs post 弹层），合并立项悬而未决。
- 来源：2026-09-16-r8-independent/audit-report.md:31；independent/indep-fix-verification.md:7；round-5/audit-report.md:16；round-1/interact/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json、次要14.json；round-1/2/3 issue 数据。

### T7 聊天 / 会话（≥7 轮，第五周期再爆 P0）
- R1-OFFICIAL-003（P0）：官方号最后一条消息被输入栏截断 → R21-OFFICIALCHAT-001 同病复发（发送后内容增高场景）→ 次要22 coverage 称已改 scroll-into-view 底部锚方案（**运行时终验未见**）。
- R2-MSG-006（P1）：角标数据源——R3-PAGES-MESSAGES-INDEX-002 复核两个半项（助手卡角标 + tabBar 消息角标 useUnreadBadge→custom-tab-bar 全链路）均已代码层闭环，待终验。
- INDEP-003（P2）：WebSocket 重连不关旧 socketTask（与「WS connect 0 接线封存决议」并存）。
- 会话 preview 写错/残留：R11-6B（V2026.09.19.0001）、R21-CHAT-SESSION-001（转发后 preview 写错，R1 复核已修复）。
- R21：CHAT-SESSION-002（临时匿名会话功能面破碎）、MESSAGES-INDEX-002/003（置顶/免打扰零反馈，R3 复核已修复）、OFFICIALCHAT-002（官方号三处死按钮，R1 复核**证实仍未修**：`···`/表情/`+` 均无 @tap）。
- **第四周期新增（待修复）**：MP-R1-PAGES-MESSAGES-INDEX-004（会话列表「时间」整列永不显示——模板读不存在的 `lastMessageTime`，真实字段 `lastMessageSentAt`）；MP-R1-PAGES-MESSAGES-INDEX-005（未登录「手机号登录」死交互，goPhoneLogin 无监听者）；MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-001/002/003（临时会话倒计时不启动/发送失败仍清草稿/失败渲染假空会话）；-004（**real 模式图片消息被两处 kind 映射降级为 text，图片气泡渲染器永不生效**）；-005（conv- 冷启动深链 400 仍复现）；-006~012（上拉无 catch、i18n key `chat.muteLocalOnly` 双语言包均缺失上屏原始 key、发图逐张吞错全失败仍 toast 成功、免打扰失败静默、空 catch、ChatHeader 裸 hex、6 处硬编码中文+拍一拍把中文写进消息正文）。
- **第五周期 R13-P0（已修+已验证）**：聊天会话页二次进入整页不可用——http 拦截器按 method+URL+body 生成**稳定**幂等键，`POST /messages/conversations` 是 get-or-create，同对方第二次进入必复用同键 → 后端 409 `IDEMPOTENT_CONFLICT`，页面只剩后端技术串；`friendlyPageError` 正则不覆盖中文技术串原样外露。修复=createSession 显式唯一幂等键 + 错误净化器补 `Idempotency|幂等|重复请求|拦截|冲突`。API 级验证：稳定键 200→409→唯一键 200/200（同 id=466），修复后 409 delta=0。**回归要点：一切 get-or-create 语义端点 + 幂等键生成策略联动改动。**
- 来源：round-1/audit-report.md:17；round-2/audit-report.md:14,38；independent/indep-fix-verification.md:9；r11-acceptance/ideal-comparison.md:24-25；round-1/interact/次要19.json；round-1/2/3 issue 数据；2026-09-22-r13-goal/R13-ACCEPTANCE.md §3.2。

### T8 审计/验收数据污染正式库（每轮产生、需清理迁移；R12「全 0」结论已被推翻一次）
- R10-P3-015 → V2026.09.17.0001；R11 → V2026.09.18.0002 + V2026.09.19.0001（会话 preview 残留）；巡检参数表 `?id=225` 因清理失效（参数表会随数据清理腐烂，后改 `?id=1`）。
- R11 chain-results 遗留事实：客户端无「删除帖子/评论」端点，清理只能 SQL 删行；like/评论写 `interaction_events` 副作用行；`cancel-like` 是软删除。
- **第五周期 R13 推翻 R12 §3「审计残留 SQL 全 0」**：`private_messages` id=3894「全链路验收测试消息 2026-09-12」直接外露在消息列表预览位（id 3334「你好呀，测试消息」似种子文案建议保留）；删除不可逆，**停在等授权未执行**。回归时任何「残留已清」结论都要用 SQL+页面实拍双证。
- 来源：2026-09-17-r10-visual/audit-report.md:150；r11-acceptance/audit-report.md:53-55,86-88；r11-acceptance/chain-results.md:139-142；2026-09-22-r13-goal/R13-ACCEPTANCE.md §7。

### T9 数字格式混用「1.2w vs 8,932 vs 9.8k」（跨 4 轮反复提示，产品级未终审）
- R1-HOME-008 → R3-HOME-007 复发提示（R21 裁决对齐理想图）→ R4 产品确认项 → R10-P2-007 统一 k 格式（与裁决口径又不一致）。R11 ideal-comparison 记「理想原图 9,823 → 实拍 9.8k，一致性优先」。R1-HOME-008 复核：该函数在 4 个文件里逐份复制（InterestRecommendation/nearby/village-tag-posts/HotTopicsSection），单点改动不防回归。
- 来源：round-1/audit-report.md:27；round-3/audit-report.md:87；round-4/audit-report.md:53；2026-09-17-r10-visual/audit-report.md:135。

### T10 商业化封存开关接线不一致（R10 根因 C + R21 key 契约风险）
- 同一 `commerce.*=false` 策略三种表现：market×3 正确封存 / consulting 曾未接线（R10-P1-002 已修，R1-LCONSULT-201 已验证）/ vip 三页 onLoad 守卫跳转。R11/R12 复验封存通过。
- R21-CONSULTING-001：实现读 `switches['consult']`，注释口径 `commerce.consult`——若后台按注释下发，闸永不放行（后端真实 key 契约至今未接口级确认）。**MP-R1-MP-VIP-001 另发**：自动续费原生 switch 取消确认后 UI 与 store 脱节（忽略 e.detail.value，取消后不回拨）；MP-R1-BILLS-001：会员开关关闭时 bills 页仍无条件发起后端请求。
- 来源：2026-09-17-r10-visual/audit-report.md:98-102；r12-independent/audit-report.md:39；round-1/interact/次要17.json；round-1/issue-matrix.md 次要24 节。

### T11 双身份巡检证据失效 / 取证方法学（P0 级方法论问题发生过两次）
- R12-IND-GLOBAL-001（P0）：双身份截图 B 侧与 A 侧像素级相同（巡检会话未建立）——修复=boot 强制校验 `session.isLoggedIn` + `boot-verify-*.log`。
- R10 §6.1：巡检账号完成度仅 30% → 约 1/3 截图是门槛态；R11 起固定双身份（满配 A=100158 + 新用户 B=100159）。
- R21：mock 构建下「未登录态不可达」（bootstrap 恒注入 mockUserSession）——未登录态回归需专门手段。
- **第五周期 R13 再犯**：`shots/01-pages-login-index.png` 与 05/16 三图内容完全相同（均为寻觅页）——登录页、匹配成功页整轮失去有效实拍；R13 结论「巡检脚本『路由→截图』映射不可信，截图前必须校验当前页面路径」。**回归取证必须先过 boot 校验 + 页面路径校验两道门。**
- 来源：r12-independent/audit-report.md:10；2026-09-17-r10-visual/audit-report.md:176-178；r11-acceptance/audit-report.md:6；round-1/interact/PAGES-NEARBY-INDEX.json；2026-09-22-r13-goal/R13-ACCEPTANCE.md §0/design-parity §0。

### T12 环境级坑（反复出现，直接影响回归证据可信度）
1. **DevTools 陈旧编译缓存**：dist 已更新但模拟器跑旧包（R3 定位 WeappCompileCache 87MB；R6/R7/R13 反复复现；R13 曾因此产生一次假阴性验证）。可靠流程=关窗→删 WeappCompileCache→删 dist→全新构建→重开；R13 补充：冷编译需 ~200s，`success:true` 只代表指令下发。
2. **系统代理 127.0.0.1:7897（Clash）复活**：模拟器请求失败/uploadFile 挂起 3 分钟（R1/R3/R7）。
3. **Node 版本**：PATH 默认 DevTools 自带 Node16 → uni 编译 `crypto.getRandomValues` 报错；需 Node22 前置（R1/final-verify/R7）。
4. **reLaunch 风暴假死**：>40 次连续 reLaunch 后 DevTools 假死全白屏（R8 81 张中 39 张伪影；R11 >150 次 runtimeid 丢失；R12 长跑假死）。教训：navigateTo 为主、分段 refresh。
5. **token 单会话互踢**：同账号二次 curl 登录使小程序 storage token 失效（R8/R9）。
6. **自动化怪癖**：automator 对自定义组件内部元素 tap/trigger 不生效（R6/R7/R9/R11/R21/R13 反复记录）；**@catchtap 编译为非标准 `bindcatchtap`**（R21-NEARBY-001 根因）；合成 touch 驱动不了 catchtouchmove 手势链/scroll-view 原生滚动/slider/maxlength（R21 大量「无法验证」项）；原生 ActionSheet/showModal 不入元素树；automation input 不受 maxlength 约束（R8）；**R13 新增：以仓库根开窗模拟器长期停在占位页，必须以 `dist/build/mp-weixin` 产物目录开窗；绝不从 shell 直接启动 wechatdevtools.exe（Electron 崩溃）**。
7. **Git Bash 坑**：`/pages/...` 转 Windows 路径（`MSYS2_ARG_CONV_EXCL="*"`）；curl 中文 JSON 以 GBK 发送 → 后端 500。
8. **登录态取证两步法**：注入 token 后还需触发 `session.bootstrap()`（R10 固化 eval_boot/eval_state）。
9. **prepare-static --real 副作用**：会把 ~1175 个 `src/static/` 跟踪文件移入 `static-local-backup/`（R13 记录，构建后需 `git checkout -- apps/client/src/static/` 还原，还原前复核无真实改动）。
- 来源：round-3/audit-report.md:106-111；2026-09-12-round1/audit-report.md:17-31；2026-09-15-r7-full-verify/audit-report.md:51-57；2026-09-16-r8-independent/audit-report.md:37-43；r11-acceptance/audit-report.md:70；r12-independent/audit-report.md:55；2026-09-22-r13-goal/R13-ACCEPTANCE.md §3.1/3.5。

### T13 事件绑定失效 / 组件 emit-props 接线断裂类（≥3 轮、全仓高频缺陷类）
- 根因 ①：uni-app Vue3 mp-weixin 下 `@catchtap` 编译为非标准 `bindcatchtap`（R21-NEARBY-001，已修 PostCard 10 处；**全仓清零复查仍未见执行记录**）。
- 根因 ②：元素无 @tap handler 或页面未监听组件 emit：R21-HOME-014/015、CIRCLEHOME-002/004、OFFICIALCHAT-002（仍未修）、CAMPUS-HUB-003、SETTINGS-001、MESSAGES-INDEX-001（已以「移除元素」解决，R3 复核）、TASKS-003。
- **根因 ③（第四周期确认的大族）：stopPropagation 补丁失效 + 子组件 emit 父页未监听 + props 未声明**：
  - MP-R1-VILLAGE-INDEX-102：ActivityCard 报名按钮靠 `e?.stopPropagation?.()` 阻断冒泡，uni-app Vue3 小程序端补丁不存在 → 点报名同时打开详情（须改 `@tap.stop`）；MP-R1-POSTTOPIC-009 同组件 emit 未接线（open-detail/enroll 无监听）。
  - MP-R1-PAGES-MESSAGES-INDEX-005 / MP-R1-LIKES-102：NotLoggedWaiting emit goPhoneLogin，页面只监听 @go-login —— 同款缺陷两页各自复发。
  - MP-R1-PROFILE-204：页面给 ProfileShell 传 `:growth-items`/`@growth-tap`，组件既未声明 prop 也未转发事件。
  - MP-R1-OTHER-002（P1）：whisper 事件链上游无人 emit，「送心动卡/悄悄话」在他人主页完全不可达。
  - MP-R1-VILLAGE-INDEX-101：ChannelTabs 先 emit update:modelValue 再 emit change，v-model 同步改值后 @change 内旧值判断恒提前 return → 频道切换主链路死代码。
  - MP-R1-VILLAGE-INDEX-108：PostCard 分享按钮 `@tap.stop="noop"` 死控件（store 有完整 sharePost）；MP-R1-CIRCLEHOME-003：动态卡「···」无绑定（修复只覆盖了分享）。
  - MP-R3-VILLAGE-INDEX-003：`village:post-created` 事件契约断裂——唯一 emit 方是 circles/post-topic，标准发帖页 post.vue 从不 emit → real 模式发帖返回不刷新（与 MP-R1-POST-109 同源）。
  - MP-R1-MESSAGES-INDEX-004 类（字段名失配 lastMessageTime vs lastMessageSentAt）也属接线失配族。
- 回归要点：任何"看起来能点"的元素必须验证 500ms 内有可观测反馈；组件 props/emits 改动必须双向核对消费方。
- 来源：round-1/interact/*.json；round-1/issue-matrix.md 各页条目；round-3/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json。

### T14 返回 / 栈底守卫缺失类（≥3 轮，R21 修复批刚落地、极易互相污染）
- 症状 A：栈=1 时 `uni.navigateBack()` 无处可退 → `navigateBack:fail cannot navigate back at first page` unhandledRejection（R21-VERIFY-INDEX-001 ×4、REAL-NAME-001 ×4、OFFICIALCHAT-003 ×3、DND-001、SETTINGS-002）。
- 症状 B：兜底用 `uni.switchTab` 跳非 tabBar 页 → 静默失败（R21-TAGPOSTS-002、HISTORY-001、SETTINGS-001）。修复口径=栈深判断 + reLaunch 兜底。
- **第四周期仍在新增同类**：MP-R1-CAMPUS-HUB-006（hub goBack 裸调 navigateBack 无守卫，同模块 campus/index 已有标准写法未复用）；MP-R1-CAMPUSPOST-009（post-topic 取消/发布成功跳转均裸 navigateBack）；MP-R1-TOPICDETAIL-004（circles/campus topic-detail 两页同病，且返回前清空共享 store）；MP-R1-VIP-002（vip/promo-code/bills 三页返回均无空栈兜底）；MP-R1-DETAIL-006 关联的 DETAIL-002 死代码 page 背景等。
- 关联历史：matching 200ms goBack 兜底（R3/R1/R2 三轮 P0 回归核对均判「证伪维持，防修坏兜底」）；401 → reLaunch 登录页劫持（R12 书面豁免）。
- 来源：round-1/interact/次要13/17/18/19/20.json；round-1/issue-matrix.md；round-2/round-3 回归核对条目。

### T15 渲染层文案/编码/缺失资源缺陷类（≥3 轮）
- R21：SEGMENT-001（i18n 裸 key）、CAMPUSINDEX-001/CAMPUS-HUB-002（URL 编码原文）、HEARTSIGNALS-001（「已过期后过期」）、FEEDBACK-001（ISO 原始串）、TOPIC-DETAIL-002（无 maxlength 140 静默截断）、CAMPUS-HUB-001（badge 恒「认证中」无修饰类）。
- **第四周期新增**：MP-R3-CAMPUS-INDEX-001（P1：未认证视角渲染 i18n 裸 key `campus.index.hotCirclesTitle`/`viewMore`——键实际只在 campus.postTopic 下）；MP-R1-CHAT-007（`chat.muteLocalOnly` 双语言包均缺失，toast 直接显示 key）；MP-R1-CAMPUSPOST-007（i18n 占位符名不匹配 `{max}` vs `{n}`，数字永远插值不出）；MP-R1-DETAIL-107/POST-111/CIRCLEHOME-007 等大批硬编码中文绕过 i18n；MP-R1-OFFICIALCHAT-006（官方号整页绕过 i18n）；R13：3 处图标引用指向不存在的 key（`ICONS_MATCH.HEART_WHITE/HEART_PINK`、`ICONS_EMOJI.SHARE` → src undefined 图标必不显示）、7 个 i18n 同对象重复 key（last-wins 静默覆盖）、`statsShare`「转发→分享」文案错位、circles banner 取错 i18n key（正确 key 存在却从未被引用）。
- 回归要点：i18n 改 key / 路由传参 / 时间格式化 / 文案拼接 / 图标常量，任何一环改动都要重查渲染终端；**存在性核对（key 是否在语言包、资源是否在盘）应脚本化**。
- 来源：round-1/interact/*.json；round-1/issue-matrix.md；round-3/code-findings；2026-09-22-r13-goal/R13-ACCEPTANCE.md §5/§6。

### T16 作用域 / 初始化 / 未导入引用类运行时崩溃（第四/五周期确认的新系统性主题）
- IA-CONSOLE-01（immediate watch 未初始化句柄 `k is not a function`）、IA-CONSOLE-02（reportLocation 未 import，定位上报整体断裂）——真实环境周期已有两案。
- **第四周期**：MP-R3-PAGES-HOME-INDEX-001（P1：TodayRecommendationCard 在 defineProps 声明之前的 watch 回调引用 props → 编译产物 TDZ `ReferenceError: Cannot access 'props' before initialization`，watch 从未建立，每挂载必报一条错误）；MP-R3-POSTTOPIC-001（P1：catch 引用 try 内常量 campusPostFallback → 发布失败路径二次抛 ReferenceError、失败 toast 永不展示、**isSubmitting 永不复位按钮永久锁死**——该缺陷由 R2 修复批引入）。
- **第五周期 vue-tsc 33→0 时清出的同族真实缺陷**：`setup/schedule/index.vue` 用 ref 未 import（运行时 ReferenceError 崩溃）、`verification` 用 resolveMediaUrl 未 import、`history.vue` 绑定不存在的 `isRefreshing`（下拉刷新态不回收）、nearby-people 漏 import tagLabelsFor（R11 已修同类）。
- 教训：**「能编译过 ≠ 能运行」，vue-tsc 曾长期 46 errors 与基线持平掩盖了这族缺陷；静态类型门禁必须 0 error 而非「与基线持平」。**
- 来源：2026-09-13-final/FINAL-ACCEPTANCE.md:33-34；r11-acceptance/audit-report.md:26-33；round-3/code-findings；2026-09-22-r13-goal/R13-ACCEPTANCE.md §5。

### T17 固定元素被 tabBar 原生层遮挡 / 布局无界高度类（跨周期小程序专属）
- tabBar 原生层遮挡：R21-DISCOVER-INDEX-003（游客胶囊）、R21-PROFILE-001（FAB 80%）、MP-R2-PAGES-MESSAGES-INDEX-002（消息页底部无 tabBar 避让，最后一条会话无法滚出）、MP-R2-PAGES-DISCOVER-INDEX-002（MatchActions 三键下缘被半透明 tabBar 层覆盖——页面 padding 仍按旧 112rpx，MP-R1-DISCOVER-INDEX-006 同源未修）。
- scroll-view 无界高度：MP-R2-CAMPUSINDEX-001（P1：scroll-view 无有界高度 → scrolltolower 翻页永不触发，10 条之后帖子永不可见）；MP-R1-FAVORITES-001（scroll-view 高度未计状态栏 → 双重滚动）；MP-R1-HISTORY-003（`calc(100vh - 88rpx)` 未扣返回键/工具栏）；MP-R1-DISCOVERACTIVITIES-001（AppShell 无确定高度链，flex:1+height:0 失效）；MP-R1-MATCHING-009（min-height:100% 逐级叠用无确定高度）；MP-R1-CIRCLEHOME-005（100vh + 全局 page safe-area padding → 多余整页滚动）；MP-R1-SCROLLVIEW-001（scroll-y 无约束内部滚动永不生效）；MP-R1-CAMPUS-INDEX-002 连带（定高 overflow:hidden 裁底）。
- 回归要点：改 tabBar/custom-tab-bar/AppShell/page 级样式的提交，必须回归「底部净空、fixed 元素、scroll-view 触底」三件套；DevTools env=0 掩护下真机差异大。
- 来源：round-1/interact；round-2/code-findings；round-1/issue-matrix.md 各页条目。

---

## 二、P0 全量清单（历史全部）

| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-POST-001 | village/post | 「发布」按钮与微信胶囊碰撞 | 已修；MP-R3-VILLAGE-POST-R001 回归核对修复在位（--capsule-right 恒 7px 兜底未接实测） | round-1/audit-report.md:15；round-3/code-findings |
| MP-R1-VILLAGE-002 | village/index | 搜索框右端伸进胶囊下方被遮挡 | 已修；R1-VILLAGE-INDEX-112/R2-VILLAGE-INDEX-R01 两轮回归核对在位 | round-1/audit-report.md:16 |
| MP-R1-OFFICIAL-003 | official-chat | 最后一条消息被输入栏截断（从未滚底） | 已修；R21-OFFICIALCHAT-001 同病复发再修（scroll-into-view 底部锚），运行时终验未见 | round-1/audit-report.md:17；round-1/interact/次要19.json |
| MP-R1-CIRCLE-004 | circles/index | 统计行「…1 条动」半字硬裁 | 已修；R21-CIRCLE-005 再犯再修；R1-CIRCLES-R001 回归核对在位（待 375px 复拍） | round-1/audit-report.md:18 |
| MP-R2-CHAT-001 | chat-session | 15 号截图「缺少会话标识」错误页 | 复核为截图脚本参数误用（非产品缺陷）；R1-014 维持 | round-2/audit-report.md:9 |
| MP-R2-PUB-002 | village/publish | 渠道弹层缺「兴趣圈子」组 | 已修；MP-R3-VILLAGE-PUBLISH-001（P0 回归核对）判定已修复：三级分组+懒加载+三态 | round-2/audit-report.md:10；round-3/code-findings |
| MP-R3-MATCHING-001 | matching | 匹配页「打不开」 | 证伪：无上下文 200ms goBack 兜底为设计内行为；R1-MATCHING-001/R2-MATCHING-001 两轮维持 | round-3/audit-report.md:25 |
| R12-IND-GLOBAL-001 | 全局（巡检方法论） | 双身份证据整体无效（B 侧=A 侧像素级相同） | 已修：boot 强制校验；R13 又犯「路由→截图映射不可信」（T11） | r12-independent/audit-report.md:10 |
| MP-R3-VILLAGE-POST-R001 | village/post | 【第四周期 P0 回归核对】MP-R1-POST-001 胶囊碰撞 | 已修复待终验（padding calc 在位；未接 useMenuButtonRect） | round-3/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-POST.json |
| MP-R3-VILLAGE-PUBLISH-001 | village/publish | 【第四周期 P0 回归核对】渠道弹层兴趣圈子组 | 已修复待终验 | round-3/code-findings/SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH.json |
| R13-CHAT-409 | chat-session | 【第五周期 P0】get-or-create 稳定幂等键 → 二次进会话 409 IDEMPOTENT_CONFLICT 整页只剩后端技术串；错误净化器不覆盖中文技术串 | 已修+已验证（唯一键+净化器补词；409 delta=0） | 2026-09-22-r13-goal/R13-ACCEPTANCE.md §3.2 |
| R13-AVATAR-REAL | 全站头像 | 【第五周期 P1（按影响面近 P0）】real 构建库内头像必然空白（prepare-static 裁剪 avatars/people + Avatar.vue 裸绑 src 不走 resolveMediaUrl） | 已修+已验证（media.ts 两前缀改写 + Avatar 组件内解析；60-messages.png 头像全渲染） | 2026-09-22-r13-goal/R13-ACCEPTANCE.md §3.2 |

## 三、P1 全量清单（回归核对主线索）

> 「最后状态」= 该问题在其来源轮次或后续轮次被记录的最后观测。**不视为已解决，仅作本轮核对起点。**

### 3.1 视觉周期与真实环境周期 R1–R12（保留原表）

| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R1-NEARBY-005 | nearby | 热门兴趣圈第 4 卡被右缘裁切 | 已修；R1-NEARBY-005/R2-NEARBY-005/R3-NEARBY-005/LNEARBY-203 四轮回归核对均无回归（150rpx 算术验证） | round-1/audit-report.md:24 |
| MP-R1-HOME-006 | home/match | 合拍度徽章 conic-gradient 在 mp-weixin 不稳 | 已修（弃用内联渐变）；**R13 确认理想图确为绿色环形、且现成 XunmiMatchRing.vue 是半成品（--ring-pct 从未绑定+conic-gradient 曾致样式串泄漏）→ 需 SVG stroke-dasharray 方案，未修** | round-1/audit-report.md:25；R13-ACCEPTANCE §6.1 |
| MP-R1-HOME-007 | home | 关系动态 4 格同色不可辨 | 已修；R1-HOME-REG-007 复核在位 | round-1/audit-report.md:26 |
| MP-R1-HOME-008 | home | 人数单位与千分位不一致 | 已修；后演化为 T9；R1-HOME-008 复核：函数 4 文件复制 | round-1/audit-report.md:27 |
| MP-R1-HOME-009 | home | 恋爱进度第 4 卡截断+数字序号 | 已修；R1-HOME-REG-009 复核在位 | round-1/audit-report.md:28 |
| MP-R1-HOME-010 | home | 社区动态「刷新」误跳发帖页 | 已修；R1-HOME-REG-010 复核在位 | round-1/audit-report.md:29 |
| MP-R1-HOME-011 | home | 社区动态相邻卡同作者 | 已修（mock 口径）；real 端待后端轮 | round-1/audit-report.md:30 |
| MP-R1-HOME-012 | home | 「25岁 ·」尾点残留 | 已修；残留距离行=MP-R1-HOME-011(代码审查) 待修 | round-1/audit-report.md:31 |
| MP-R1-HOME-013 | home | banner 后约 1/3 屏空白 | 已修（token 300rpx）；fallback/注释仍 360rpx（MP-R1-HOME-006/R2-HOME-007） | round-1/audit-report.md:32 |
| MP-R1-PUB-014/015 | publish/post | 命名不一致 / hint 冗长 | 已修并验证 | round-1/audit-report.md:33-34 |
| MP-R1-TOPICS-016 | topics | 圈头像灰色相机占位 | 已修 | round-1/audit-report.md:35 |
| MP-R1-STATUS-017 | 全局 | 10/12 状态栏时间不可见 | 已修；演化为 T1（第四周期新增真机双重避让亚型） | round-1/audit-report.md:36 |
| MP-R2-MSG-006 | messages | 助手卡未读角标数据源缺通知未读 + tabBar 角标 | R3 复核两半项代码层闭环（useUnreadBadge→custom-tab-bar 全链），待终验 | round-2/audit-report.md:14,38 |
| MP-R2-HOME-012 | home | 社区动态仅 1 卡 | 已修（mock 口径） | round-2/audit-report.md:20 |
| MP-R2-VILL-013 | village | 晚霞帖配热饮图（图文不符） | R2-VILL-013-R/R3-VILLAGE-POST-R002 判已修；**但 R3-VILLAGE-INDEX-001 证实同族批量 ≥13 帖仍在（实图与注释相反）** | round-2/audit-report.md:21；round-3/code-findings |
| MP-R3-HOME-001 | home | 铃铛+角标侵状态栏 | 已修；R1-HOME-REG-015 复核在位 | round-3/audit-report.md:31 |
| MP-R3-HOME-006 | home | 滚动后统计区与时间叠印 | 已修（top-scrim）；INDEP-004 复制到消息页 | round-3/audit-report.md:32 |
| MP-R3-PROFILE-001 | profile | 右上图标进状态栏带 | 已修；R3-PAGES-PROFILE-INDEX-001 复核在位 | round-3/audit-report.md:33 |
| MP-R3-DAILY-001/003 | daily-question | 头部标题与时间叠印 | 已修 | round-3/audit-report.md:34 |
| MP-R3-MSUCCESS-001/002 | match-success | 返回/截图钮状态栏+胶囊碰撞 | 已修（--statusbar/--capsule-right 注入链勿回归） | round-3/audit-report.md:35 |
| MP-R3-SETTINGS-001 | settings | 自绘导航顶进状态栏（漏实例化 useMenuButtonRect） | 已修；「写了变量没接注入源」成为 T1 根因模式 | round-3/audit-report.md:36 |
| MP-R4-PROFILE-001 | profile/官方号 | 游客秋薇头像男性素材 | 已修 | round-4/audit-report.md:33 |
| MP-R4-CAMPUS-001 | campus-hub | 认证按钮被胶囊压住 85% | 已修（7+104）；R4-CAMPUS-001 回归核对在位 | round-4/audit-report.md:34 |
| R3-回归击穿 | profile-other | 小满封面修复未生效（守卫条件永不命中） | R4 修复——回归需覆盖「修复本身未生效」类 | round-4/audit-report.md:25 |
| IA-CONSOLE-01 | 全局 | `TypeError: k is not a function`（watch 未初始化句柄） | 已修；T16 族首案 | 2026-09-13-final:33 |
| IA-CONSOLE-02 | home/nearby | `reportLocation is not defined` 定位上报断裂 | 已修（补 import） | 2026-09-13-final:34 |
| MP-R5-AVATAR-500 | 编辑页 | 头像上传 100% 失败 500 | 已修 | 2026-09-13-r5:17 |
| MP-R5-MEDIA404 | 媒体服务 | 上传图片读取 404 | 已修 | 2026-09-13-r5:18 |
| MP-R5-MEDIAAUTH | 全局 | resolveMediaUrl 不拼 token → 头像全体默认图 | 已修；R7 渲染端遗漏补齐；**R13 Avatar.vue 裸绑是同族末案** | 2026-09-13-r5:19 |
| MP-R5-ADMINTHUMB | admin | 后台 `<img>` 401 | 已修；**R13 又修 /static 遗留路径 404（withMediaToken 不覆盖）→ admin api/media.ts 再改** | 2026-09-13-r5:20；R13 §4 |
| MP-R6-EDITFLOW | setup/profile | 编辑模式保存误 redirectTo 向导 | 已修（entry=edit）；R7/R8 回归通过 | 2026-09-14-r6:22-25 |
| MP-R6-PROFILE-001 | profile/我的帖子 | 「我的帖子」永远空态 | 已修 | final/final-verify-20260912.md:50-57 |
| MP-R7-PROFILE-001/002 | profile | 头像白圈/相册白板 | 已修；**MP-R1-PROFILE-201「我的故事→我的帖子」配图同病回归复发（待修）** | 2026-09-15-r7:20-21 |
| MP-R7-PROFILE-005 | profile | ROUTES.ALBUM 不存在入口无效 | 已修；R3-PAGES-PROFILE-INDEX-003 复核在位 | 2026-09-15-r7:24 |
| MP-R7-REALNAME-001 | 实名等 5 页 | tmp 路径误判为服务器 URL 落库死链 | 已修（isUploadedMediaUrl）；**R3-VILLAGE-POST-001：post.vue 提交链路仍裸正则（待修）** | 2026-09-15-r7:25 |
| MP-R7-UPLOAD-001 | 全局上传 | uploadFile 缺幂等键全部 422 | 已修；R11 又修 3 处 header→headers | 2026-09-15-r7:26 |
| MP-R8-STATUS-001/002 | likes、album | 标题叠印状态栏 | 已修 | 2026-09-16-r8:22-23 |
| MP-R8-LIKES-001 | likes | 「喜欢我的」永远空态 | 已修；R1 复核在位 | 2026-09-16-r8:27 |
| MP-R8-DRAFT-001/002 | 发布/后端 | 草稿发布后永不清除 | 已修；MP-R1-PUBLISH-009 复核：deleteDraft 失败仍静默，二次发布通道未彻底关闭 | 2026-09-16-r8:31 |
| R11 五处类型级真 bug | 幂等键/nearby-people/upload | header→headers、漏 import、缺 name | R11 修复（typecheck 46→0）——**R13 起点又见 33 errors（新缺陷），说明「0 error」必须持续维持** | r11-acceptance/audit-report.md:26-33 |
| R10-P1-001 | circle-home | 冷启动误判「圈子不存在」 | 已修（circlesFetchSettled）；R1-CIRCLEHOME-R002 复核在位 | 2026-09-17-r10:14,83-93 |
| R10-P1-002 | consulting | 封存态仍展示 ¥ 课程 | 已修；R1-LCONSULT-201 已验证 | 2026-09-17-r10:15 |
| R10-P1-003 | 全站 | 状态栏叠印系统性 | 已修+守卫；第四周期新增真机双重避让亚型（T1） | 2026-09-17-r10:16 |
| R10-P1-004 | match-success/real-name | 头像空白白圆 | 已修；R2-MATCHING-002 同页族新发（动画双头像，待修） | 2026-09-17-r10:17 |
| N1–N6 | home/campus/search/tag-posts/discussions/album | 首页偶发空白等 | N1=R12-IND-HOME-001 未闭环（偶发）；tag-posts 又修过分页 | 2026-09-18-r11 acceptance-plan:36-39 |
| R12-IND-NEARBY-LC-001 | love-center/nearby | 附近的人恒 0 人（后端距离过滤） | 已修；R1-LNEARBY-201 已验证 | r12-independent:11 |
| R12-IND-NEARBY-LC-002 | love-center/nearby | 返回键被推到胶囊下 | 已修；R1-LNEARBY-202 已验证（残留标题贴右缘） | r12-independent:12 |
| R12-IND-PROFILE-OTHER-001 | profile/other | 深链 401 笼统渲染+FAB | 已修 | r12-independent:13 |
| R12-IND-TOPICS-001 | campus/topic-detail | 401 静默误渲染「话题不存在」 | 已修（campus 侧）；**circles 侧复发=MP-R1-TOPICDETAIL-001 待修** | r12-independent:14 |
| R12-IND-HOME-001 | home | 首页偶发白屏 | **未闭环**：DevTools 渲染层偶发判定，blank 自动重拍兜底，巡检 2/144 复现 | r12-independent:15,53 |

### 3.2 第三周期 R21 交互审计（2026-09-19~21，修复批 `5e2d050c`；第四周期已对绝大多数项做代码层回归核对，标注见后）

| ID | 页面 | 问题 | 最后状态 |
|---|---|---|---|
| MP-R1-NEARBY-001/002 | PostCard 全用点 | @catchtap 编译 bindcatchtap 内层交互全失效且冒泡误跳详情；关注 chip 无反馈 | 已修；**@catchtap 全仓清零复查未见执行** |
| MP-R1-DETAIL-001(interact) | village/detail | 详情点赞单击无效（3 次干净会话复现） | 已修；R1-DETAIL-R001 复核在位待运行时终验 |
| MP-R1-VILLAGE-001 | village/index | mock 新帖不进 feed | 已修；R2-VILLAGE-INDEX-R03 已验证 |
| MP-R1-TAGPOSTS-001/002 | tag-posts | 分页 off-by-one 恒空；栈=1 返回失效 | 已修；R1-TAGPOSTS-R001/R002 复核在位 |
| MP-R1-HISTORY-001 | history×2 | 栈=1 返回失效；反馈详情恒 404 | 已修（反馈详情 404 仍属预置数据缺口） |
| MP-R1-CIRCLE-005 | circles/index | 375px 统计/好友行截断 | 已修；R1-CIRCLES-R001 待复拍 |
| MP-R1-TOPICDETAIL-001 | circles/topic-detail | 回复 46 vs 暂无回复（IA-TOPIC-01 第三次复发） | 已修；R1-TOPICDETAIL-R001 复核在位 |
| MP-R1-POSTTOPIC-001 | circles/post-topic | circleId 未生效错进村口流 | 已修；R3-POSTTOPIC-008 已验证 |
| MP-R1-CIRCLEHOME-001..004 | circle-home | 点赞恒 0/卡点击无响应/等 0 位朋友/分享更多死钮 | 已修 3 项；**「···」更多钮仍死（R1-CIRCLEHOME-003 待修）、等 0 位朋友 real 模式仍现（-002 待修）** |
| MP-R1-CAMPUSINDEX-001 | campus/index | 校名 URL 编码原文+列表恒空 | 已修；R1-CAMPUSINDEX-001 已验证 |
| MP-R1-CAMPUS-HUB-001/003 | campus/hub | badge 恒「认证中」；查看更多无 handler | 已修；推荐 Tab badge 语义矛盾残留（R1-CAMPUS-HUB-013） |
| MP-R1-CAMPUSPOST-001 | campus/post-topic | 空表单静默无拦截 | 已修；R1-CAMPUSPOST-001 复核在位 |
| MP-R1-TOPIC-DETAIL-001/002 | campus/topic-detail | mock 回复重复追加 3→6；输入无 maxlength | 已修 |
| MP-R1-SEGMENT-001 | segment | i18n 裸 key 上屏 | 已修；R1 复核在位 |
| MP-R1-LIKES-001 | likes | 标题截断/胶囊压钮 | 已修；R1 复核在位 |
| MP-R1-HELP-001 | help | 复制到的是文案标签非邮箱 | **R1-HELP-101 回归证实仍未修（待修复）** |
| MP-R1-HEARTSIGNALS-001/002 | heart-signals | 「已过期后过期」；mock 写穿固件 | 已修；R1-HSIGNALS-201 已验证（declined 折叠另立 HSIGNALS-101 待修） |
| MP-R1-CONSULTING-001 | consulting | 封存子闸 key 契约 commerce.consult vs consult | 已修代码侧；后端真实 key 契约未接口级确认 |
| MP-R1-SETTINGS-001/002 | settings | 我的动态死链；栈=1 返回 | 已修；**001 语义回归=MP-R1-SETTINGS-003 待修（?tab=mine 无消费）** |
| MP-R1-VERIFY-INDEX-001 / REAL-NAME-001 | verification | 栈=1 navigateBack:fail ×4 | 已修；**R1-VERIFY-INDEX-001 新发：nav-bar 在 safe-top 前顶进状态栏（待修）** |
| MP-R1-VISITORS-001/002 | visitors | 访客卡点击 NaN 静默；头部被胶囊遮挡 | 已修 |
| MP-R1-OTHER-001 | profile/other | 重复喜欢重复成功 toast | 已修 |
| MP-R1-TASKS-001/002/003 | tasks | 签到 toast 成功当页全不更新；文案错；点击无响应 | 已修；**R1-TASKS-004/005：claim 后 load-once 守卫不刷新；refreshSession void 剥离 catch（待修）** |
| MP-R1-DND-001 | settings/dnd | 栈=1 返回无反应 | 已修；**R1-DND-002 新发：nav 顶进状态栏（待修）** |
| MP-R1-OFFICIALCHAT-001/003 | official-chat | 滚底失效复发；栈=1 返回 fail ×3 | 已修（滚底改底部锚，终验未见） |
| MP-R1-OFFICIALCHAT-002 | official-chat | 「···」/「+」/表情三死钮 | **R1 回归证实仍未修（待修复）** |
| MP-R1-SETUPCAMPUS-001 | setup/campus | showModal:fail cancel 未处理 rejection | **R1 回归证实仍未修（待修复）** |
| MP-R1-SETUPINTEREST-001/002 | setup/interest | 保存 navigateBack unhandledRejection；部分载荷 PUT | 已修；R1 复核在位 |
| MP-R1-FEEDBACK-001 | feedback | 时间渲染 ISO 原始串 | 已修；R1 复核在位 |
| MP-R1-PUB-016/017 | publish | 上限 1000 vs 500；兴趣圈子分组消失 | 已修；R3-VILLAGE-PUBLISH-002/003 复核在位 |
| MP-R1-HOME-014/015/016 | home | 关注无 handler 冒泡误跳；作者行静默失效；加入态不变 | 已修；R1-HOME-REG-018 复核在位 |
| MP-R1-PAGES-DISCOVER-INDEX-001/002 | discover/matching | 匹配页重复消费卡→虚假错误横幅+未处理拒绝；重试死键 | 已修 |
| MP-R1-PAGES-DISCOVER-INDEX-003/004 | discover | 游客胶囊被 tabBar 原生层遮挡；配额用尽仍放行 | 003 已修（R2 提高到 128rpx，iPhone 安全区下残余 2-4rpx）；004 已修（计数顺序残留=INDEX-010 待修） |
| MP-R1-PAGES-MESSAGES-INDEX-001 | messages | header「+」死元素 | 已修（移除元素+搜索接线）；R3-PAGES-MESSAGES-INDEX-003 已复核 |
| MP-R1-PAGES-MESSAGES-INDEX-002/003 | messages | 置顶/免打扰零可见反馈 | 已修；R3-PAGES-MESSAGES-INDEX-004 已复核 |
| MP-R1-PROFILE-001/002 | profile | FAB 80% 被遮；点头像 ActionSheet 不可见 | 已修（BottomSheet 方案）；R3-PAGES-PROFILE-INDEX-004 复核在位 |
| MP-R1-CHAT-CHAT-SESSION-INDEX-001/002 | chat-session | 转发污染 preview；临时会话功能面破碎 | 001 已修；002 部分（no-session 守卫已加；假空会话/倒计时/清草稿残留=R1-CHAT-001/002/003 待修） |
| MP-R1-PAGES-REGISTER-INDEX-001 | register | 业务 400 captureException 噪音 | **仍未修（服务层漏 reportError:false）** |
| MP-R1-PAGES-REGISTER-SUCCESS-001 | register/success | 环境级原生弹窗 | 环境伪影留档 |

### 3.3 第四周期 R1 代码审查（round-1 code-findings，405 条；P1×46 全列）

| ID | 页面 | 问题（摘要） | 状态 |
|---|---|---|---|
| MP-R1-PAGES-HOME-INDEX-001 | home | InviteBanner「去邀请」CTA 静默失效（profile 不消费 invite 桥接参数） | 待修复 |
| MP-R1-HOME-REG-007/009/010/011/012/013/014/015/016/018 | home | 历史首页 10 项回归核对（四色/第4卡/刷新语义/同作者/尾点/空白/1卡/铃铛/滚动遮罩/关注三连） | 已修复待终验 |
| MP-R1-HOME-REG-017 | home | R12-IND-HOME-001 偶发白屏 | 保留（巡检监控） |
| MP-R1-PAGES-MESSAGES-INDEX-004 | messages | 会话「时间」整列永不显示（读不存在字段） | 待修复 |
| MP-R1-PAGES-MESSAGES-INDEX-005 | messages | 未登录「手机号登录」死交互 | 待修复 |
| MP-R2-MSG-006 | messages | 助手卡角标回归核对 | 已修复待终验 |
| MP-R1-PAGES-NEARBY-INDEX-001 | nearby | 未登录（real）onLoad 无条件打受保护接口 → 401 强踢登录 | 待修复 |
| MP-R1-NEARBY-005 | nearby | 第 4 卡裁切回归核对 | 已修复待终验 |
| MP-R1-PROFILE-201 | profile | 我的故事配图裸直连 /api/v1/media/**（R7 同病复发） | 待修复 |
| MP-R1-PROFILE-202 | profile | 语音介绍/背景图上传 UI 全在不可达分支（v-if=false legacy 槽） | 待修复 |
| MP-R1-CAMPUSPOST-002 | campus/post-topic | real 配图上传幂等键恒定冲突（同名文件同键） | 待修复 |
| MP-R1-POSTTOPIC-001 | circles/post-topic | circleId 未生效回归核对 | 已修复待终验 |
| MP-R1-...-MATCH-SUCCESS-001 | match-success | 状态栏/胶囊避让回归核对（机制完整勿回归） | 已验证 |
| MP-R1-VILLAGE-INDEX-101 | village/index | 频道切换死代码（v-model/change 时序） | 待修复 |
| MP-R1-VILLAGE-INDEX-102 | village/index | ActivityCard 报名冒泡未阻断（stopPropagation 失效） | 待修复 |
| MP-R1-VILLAGE-INDEX-103 | village/index | mock 图文不符族（post-7 日落配城堡图） | 待修复 |
| MP-R1-POST-101 | village/post | 发圈成功后草稿残留 → UI 目标与提交目标不一致 | 待修复 |
| MP-R1-PUBLISH-001 | publish | visibility 后端无字段被静默丢弃 | 待修复 |
| MP-R1-PUB-016 | publish | 上限 500 回归核对 | 已修复待终验 |
| MP-R2-VILL-013 | village | 晚霞帖图文不符（POST_SUNRISE_1 占位+历史修复 SQL 失败） | 待修复 |
| MP-R1-DETAIL-001 | village/detail | 全屏查看层样式孤立在 `</style>` 后整体失效（SFC 解析实证） | 待修复 |
| MP-R1-TAGPOSTS-R001/R002 | tag-posts | 分页/返回回归核对 | 已修复待终验 |
| MP-R1-CIRCLEHOME-R002 | circle-home | 冷启动误判回归核对 | 已修复待终验 |
| MP-R1-CAMPUSTOPIC-R001 | campus/topic-detail | 401 回归核对（campus 侧） | 已修复待终验 |
| MP-R8-LIKES-001 | likes | 「喜欢我的」空态回归核对 | 已修复待终验 |
| MP-R3-DAILY-001/003 | daily-question | 状态栏回归核对 | 已修复待终验 |
| MP-R1-HELP-101 | help | 复制文案标签而非邮箱（回归证实未修） | 待修复 |
| MP-R1-LNEARBY-101 | love-center/nearby | 滑动链路与 discover store 脱节（卡片永不推进） | 待修复 |
| MP-R1-LMBTI-101 | love-center/mbti | 返回键与胶囊矩形几乎完全重叠 | 待修复 |
| MP-R1-LNEARBY-201/202/203 | nearby 系 | R12 三项回归核对 | 已验证 |
| MP-R1-LCONSULT-201 | consulting | 封存回归核对 | 已验证 |
| MP-R1-VERIFY-INDEX-001 | verification/index | nav-bar 在 safe-top 之前顶进状态栏 | 待修复 |
| MP-R1-OTHER-002 | profile/other | whisper 事件链断裂功能不可达 | 待修复 |
| MP-R1-DND-002 | settings/dnd | 自绘导航顶进状态栏 | 待修复 |

（R1 其余 P0×4 见第二节；P2×94/P3×175/P4×86 全量见 round-1/issue-matrix.md。）

### 3.4 第四周期 R2 代码审查（round-2 code-findings，295 条；P1×21 全列）

| ID | 页面 | 问题（摘要） | 状态 |
|---|---|---|---|
| MP-R2-PAGES-LOGIN-INDEX-001 | login | input type="password" 非法（mp 无此值，密码明文显示） | 待修复（落盘时点工作区已修，终验未见） |
| MP-R2-PAGES-MESSAGES-INDEX-010 | messages | MP-R2-MSG-006 回归核对 | 已验证 |
| MP-R2-PAGES-NEARBY-INDEX-001 | nearby | reportLocation 在登录门外执行 → 未登录授权定位后 401 强踢 | 待修复 |
| MP-R2-NEARBY-005 | nearby | 第 4 卡回归核对 | 已修复待终验 |
| MP-R2-PROFILE-001 | profile | 他人态顶栏状态栏/胶囊回归核对 | 已修复待终验 |
| MP-R2-PROFILE-002 | profile | 媒体路径 resolveMediaUrl 统一回归核对 | 已修复待终验 |
| MP-R2-PROFILE-003 | profile | ROUTES.ALBUM 回归核对 | 已修复待终验 |
| MP-R2-PROFILE-004 | profile | FAB/BottomSheet 回归核对 | 已修复待终验 |
| MP-R2-CAMPUSINDEX-001 | campus/index | scroll-view 无有界高度 → 翻页永不触发 | 待修复 |
| MP-R2-CHAT-CHAT-SESSION-INDEX-001 | chat-session | errorMessage 差分检测连续同文案失效 → 消息丢失无反馈 | 待修复 |
| MP-R2-POSTTOPIC-001 | circles/post-topic | 帖子模式本地临时图片直出（未经 upload）→ 裂图 | 待修复 |
| MP-R1-POSTTOPIC-001 | circles/post-topic | circleId 回归复核 | 已修复待终验 |
| MP-R2-...-MATCH-SUCCESS-001 | match-success | 状态栏修复链复核 | 已验证 |
| MP-R2-MATCHING-002 | matching | 匹配动画双头像未过 resolveMediaUrl（real 空圆） | 待修复 |
| MP-R2-VILLAGE-INDEX-R03 | village/index | mock 新帖进 feed 闭环复核 | 已验证 |
| MP-R2-PUB-101 | publish | restoreDraft 缺 friends 分支 → 目标/可见性矛盾 | 待修复 |
| MP-R2-PUB-016-R | publish | 上限 500 回归核对 | 已验证 |
| MP-R2-VILL-013-R | publish | 晚霞图文不符复核（该对已修） | 已验证 |
| MP-R2-SEGMENT-001 | segment | 头像裸直连相对路径 | 待修复 |
| MP-R2-SEARCH-001 | search | 两处头像裸直连 | 待修复 |
| MP-R2-OTHER-001 | profile/other | 相册缩略图/动态配图/头像裸直连 | 待修复 |

（R2 其余 P0×3 见第二节；P2×47/P3×134/P4×90 全量见 round-2/issue-matrix.md。）

### 3.5 第四周期 R3 代码审查（round-3 code-findings，149 条；P1×17 全列）

| ID | 页面 | 问题（摘要） | 状态 |
|---|---|---|---|
| MP-R3-PAGES-HOME-INDEX-001 | home | TodayRecommendationCard watch 先于 defineProps → TDZ ReferenceError，photoFailed 重置 watch 从未建立 | 待修复 |
| MP-R3-PAGES-MESSAGES-INDEX-002 | messages | 角标+tabBar 角标全链回归核对 | 已修复待终验 |
| MP-R3-NEARBY-005 | nearby | 第 4 卡回归核对（无回归） | 已修复待终验 |
| MP-R3-PAGES-PROFILE-INDEX-001 | profile | 他人态顶栏避让回归核对 | 已修复待终验 |
| MP-R3-PAGES-PROFILE-INDEX-002 | profile | 头像/相册媒体解析双保险回归核对 | 已修复待终验 |
| MP-R3-PAGES-PROFILE-INDEX-003 | profile | ROUTES.ALBUM 回归核对 | 已修复待终验 |
| MP-R3-PAGES-PROFILE-INDEX-004 | profile | FAB/BottomSheet 回归核对 | 已修复待终验 |
| MP-R3-CAMPUS-INDEX-001 | campus/index | 未认证视角渲染 i18n 裸 key（hotCirclesTitle/viewMore 缺失） | 待修复 |
| MP-R3-CAMPUS-INDEX-002 | campus/index | 真机状态栏双重叠加（page env + 页头 --statusbar） | 待修复 |
| MP-R3-POSTTOPIC-001 | circles/post-topic | catch 引用 try 内 campusPostFallback → 失败路径 ReferenceError+提交锁死（R2 修复批引入；**R13 vue-tsc 批已修**） | 待修复（修复证据=R13 §5，未单独回归） |
| MP-R3-POSTTOPIC-008 | circles/post-topic | circleId 生效回归核对 | 已验证 |
| MP-R3-VILLAGE-INDEX-001 | village/index | mock feed 批量图文不符 ≥13 帖（实图与注释相反） | 待修复 |
| MP-R3-VILLAGE-INDEX-002 | village/index | 热度榜上拉加载「替换」而非「追加」（前 20 条消失） | 待修复 |
| MP-R3-VILLAGE-POST-R001 | village/post | P0 胶囊碰撞回归核对 | 已修复待终验（见第二节） |
| MP-R3-VILLAGE-POST-R002 | village(mock-data) | 晚霞帖回归核对（实读核对已修） | 已修复待终验 |
| MP-R3-VILLAGE-PUBLISH-001 | publish | P0 兴趣圈子组回归核对 | 已修复待终验（见第二节） |
| MP-R3-VILLAGE-PUBLISH-002/003 | publish | 上限 500/分组懒加载回归核对 | 已修复待终验 |
| MP-R3-VILLAGE-PUBLISH-016 | publish | 晚霞信号记录（归口 village/index） | 已修复待终验 |

（R3 P0×2 见第二节；P2×21 见 4.3 节；P3×49/P4×60 在 code-findings JSON 内。）

### 3.6 第五周期 R13 真实链路验收新增（2026-09-22）

| ID/主题 | 页面 | 问题 | 状态 |
|---|---|---|---|
| R13-CHAT-409 | chat-session | P0 幂等键 409 整页不可用+技术串外露 | 已修+已验证（见第二节） |
| R13-AVATAR-REAL | 全站 | real 构建头像空白（prepare-static+Avatar 裸绑） | 已修+已验证 |
| R13-TSC-DEFECTS | schedule/verification/history/match 等 | vue-tsc 33→0 清出的真实缺陷：schedule ref 未 import（崩溃）、verification resolveMediaUrl 未 import、history isRefreshing 绑定不存在、3 处图标 key 不存在、7 个 i18n 重复 key、campusPostFallback 作用域 | 已修（代码级；逐项运行时回归未见） |
| R13-DATA-3894 | messages/数据 | `private_messages` id=3894 巡检残留外露消息预览位（推翻 R12「残留全 0」） | **未修（等授权删除，需同步查 conversation preview）** |
| R13-ADMIN-IMG-STATIC | admin | withMediaToken 不改写遗留 /static 路径 → 后台裂图（users 2/9 加载） | 已修（/static→app-assets 改写；9/9+25 图 0 裂图） |
| R13-PARITY | 首页/附近/寻觅/消息/帖子详情/圈子主页/校园圈/聊天 | 设计一致性未达成：已修 6-7 条（Avatar 裸绑、circle-home 两处空容器渲染成空白/空绿带、circles banner 取错 key、非活跃 chip 与页面同色不可见、消息单卡通栏、寻觅距离/在线胶囊配色反转、statsShare 转发→分享）；**未修布局级：匹配度绿色环形（需 SVG 方案）、circle-home hero 层级（暗罩白字 vs 白卡叠压）、相对时间（circle/campus store 已收敛但未进 dist 未截图）、帖子详情（圈子归属/话题标签位置/定位胶囊/多「发送」钮）、首页结构（多本人头像/缺缩略行/徽章压文案/关系动态竖排）、寻觅 tab 行缺收藏入口、话题详情导航绿渐变不一致、相册「1/6」压胶囊** | 部分已修、大部分未修 |
| R13-UNITTEST | 测试 | 串行全量 1245 通过/1 失败（campus store fetchTopics mock 期望，测试侧）；profile-index.spec 3 例失败为既有问题（mock 缺 onTabItemTap 已修） | 已修/留档 |
| R13-PROJECTCFG | 工程 | 仓库根 project.config.json 开窗不编译真因未定位（现绕过：以 dist 目录开窗） | 未定位 |

## 四、P2 全量/重点清单

### 4.1 真实环境周期及以前（保留原表，全部有来源）

| ID | 页面 | 问题 | 最后状态 | 来源 |
|---|---|---|---|---|
| MP-R2-OFF-004 | official-chat | hero 遮挡首条消息 | 复核为滚动中间态 | round-2/audit-report.md:12 |
| MP-R2-HOME-007 | home | 「全部›」被裁 | 已修 | round-2/audit-report.md:15 |
| MP-R2-TAB-010 | tabBar | 游离绿色短横线 | 已修 | round-2/audit-report.md:18 |
| MP-R2-NEAR-011 | nearby | 校园圈徽标硬换行 | 已修；R8-CAMPUS-001 hub 复发同类 | round-2/audit-report.md:19 |
| MP-R3-MSG-001 | messages | 「最近聊天」被挤出首屏 | 已修 | round-3/audit-report.md:42 |
| MP-R3-CIRCLES-001/002 | circles | 统计省略/按钮内边距 | 已修 | round-3/audit-report.md:43 |
| MP-R3-CAMPUS-001 | campus-hub | 「态」字孤行 | 已修 | round-3/audit-report.md:44 |
| MP-R3-POST-001/003 | post-detail | 图文不符/互动数缺失 | 已修（数据迁移） | round-3/audit-report.md:46-47 |
| MP-R3-CIRCLEHOME-001/002 | circle-home | 返回钮状态栏/三图不符 | 已修 | round-3/audit-report.md:48-49 |
| MP-R3-DISCOVER-002 | discover | 匹配度粉圆糊化 | 已修（放大） | round-3/audit-report.md:50 |
| MP-R3-PUBLISH-001 | publish | 禁用态对比度 1.36:1 | 已修 | round-3/audit-report.md:51 |
| MP-R3-SETTINGS-002 | settings | 恋爱认证双入口 | 已修 | round-3/audit-report.md:52 |
| MP-R4-OTHER-001 | profile/other | 返回钮侵状态栏 | 已修 | round-4/audit-report.md:35 |
| MP-R4-CHAT-001 | chat-session | userId 深链标题回退「聊天」 | 已修 | round-4/audit-report.md:36 |
| MP-R1-CIRCLE-001 | circle-home | 作者头像全体默认图 | 已修；R8-CIRCLE-001 回复 DTO 再犯已修 | 2026-09-12-round1:40 |
| MP-R1-LOGIN-001 | login | 授权拒绝后无注册/登录路径 | 已修；R1/R2/R21 三轮回归核对在位 | 2026-09-12-round1:38,89 |
| MP-R1-CIRCLE-002 | topic-detail | 回复计数有数无明细 | 已修；IA-TOPIC-01 三次复发史见 T4 | 2026-09-12-round1:39 |
| IA-POSTTOPIC-01 | circles/post-topic | 导航叠压状态栏 | 已修（模拟器口径）；真机双重叠加=MP-R3-POSTTOPIC-002 待修 | 2026-09-13-final:36 |
| IA-STATS-01 | 后端契约 | profile/stats 硬编码 0/语义错位 | 已修 | 2026-09-13-final:37 |
| IA-CIRCLEHOME-01 | circle-home | 缺参静默渲染 mock | 已修 | 2026-09-13-final:38 |
| INDEP-001 | publish | snapshotDraft ReferenceError | 已修；R1/R3 复核在位 | independent/indep-fix-verification.md:7 |
| INDEP-002 | chat-session | conv- 当会话 id 调接口 400 | 已修；R1-CHAT-005：冷启动深链仍可复现 | independent/indep-fix-verification.md:8 |
| INDEP-003 | WS | 重连不关旧 socketTask | 已修（与 WS 封存决议并存） | independent/indep-fix-verification.md:9 |
| INDEP-004 | messages | 消息页无滚动遮罩 | 已修；R3-PAGES-MESSAGES-INDEX-005 已复核 | independent/indep-fix-verification.md:10 |
| MP-R7-PROFILE-003/004 | profile | toLocalImage 不兜底；完成度 10% vs 30% | 已修；R3-PAGES-PROFILE-INDEX-005 复核在位（残留 100→85 魔改） | 2026-09-15-r7:22-23 |
| MP-R7-ADMIN-IMG | admin | 直链不带 Authorization 401 | 已修；R13 再修 /static 遗留路径 | 2026-09-15-r7:27 |
| MP-R8-STATUS-003/004 | heart-signals、CardDetailOverlay | 同状态栏缺陷 | 已修 | 2026-09-16-r8:24-25 |
| MP-R8-CAPSULE-001 | likes | 「管理」钮压胶囊 | 已修；R1 复核在位 | 2026-09-16-r8:26 |
| MP-R8-LOCK-001 | village/heart-signals | LockScreen 完成度矛盾 | 已修 | 2026-09-16-r8:29 |
| MP-R8-OWNPOST-001 | village/detail | 自己的帖子显示「+关注」 | 已修；R1-DETAIL-R002 代码层复核在位，**运行时终验仍欠** | 2026-09-16-r8:30 |
| MP-R9-STATUS-005 | setup/interest | 标题叠印 | 已修；R1 复核在位 | 2026-09-16-r9:36 |
| R10-P2-005 | likes | 标题与返回钮重叠 | 已修 | fix-report.md:22 |
| R10-P2-006 | love-center/nearby | `?...`昵称/徽标压简介 | 已修（根因反转） | fix-report.md:23 |
| R10-P2-007 | campus-hub | 校名截断/数字混用 | 已修 | fix-report.md:24 |
| R10-P2-008 | search | 缺返回/空态双文案 | 已修 | fix-report.md:25 |
| R10-P2-012 | market×3/real-name | 缺自定义导航 | 已修 | fix-report.md:29 |
| R10-P2-014 | consulting | 导航不一致/MBTI 重复入口 | 已修 | fix-report.md:30 |
| R10-P3-015/016/018/019/020/022 | 多页 | 审计残留/标签映射/讨论圈/官方消息/分类文案/相册空位 | 各有修复；残留清理 R13 又发现漏网（T8） | audit-report.md:28-34 |
| R12-IND-EVIDENCE-001 | 方法论 | console 证据缺失 | 已修 | r12-independent:19 |
| R12-IND-HTTP-401-001 | 全局 | 401 reLaunch 劫持 | 书面豁免（产品决议） | r12-independent:16 |
| R12-IND-AUTH-GATE-001 | 多页 | 公开内容鉴权口径不一致 | 书面豁免（产品决议） | r12-independent:18 |
| R12-IND-PROFILE-INDEX-001 | profile（未登录） | 未登录头部叠印 | **待查（R13 未验证：登录页实拍错位）** | r12-independent:17 |

### 4.2 第四周期 R1 代码审查 P2 重点（94 条中的高价值条目，全量见 issue-matrix.md）

- 登录/注册：MP-R1-LOGIN-002（双导航竞争）、-003（未登录 bindPhone 401）、-004（倒计时定时器不清理）；MP-R1-PAGES-REGISTER-INDEX-001（业务 400 上报噪音，**服务层仍未修**）、-002/003。
- 消息：MP-R1-PAGES-MESSAGES-INDEX-006（空 catch）、-007（dashboard 并发整表覆盖 sessions）、-008（长按失败打成全屏错误态）、-009（下拉刷新 30s TTL 空转）、-010（--statusbar/--capsule-right 未注入）、-011（助手卡假数据）。
- 首页/附近：MP-R1-PAGES-HOME-INDEX-002/003/004（换一位无错误处理；加入态破口；**逆地理编码 key=YOUR_KEY 恒失败**——与 NEARBY-005/LOCATION-001 同源三连立）；MP-R1-PAGES-NEARBY-INDEX-002/003/004（死数据链；**下拉刷新空操作**；附近动态整会话不更新）。
- 发布/村口：MP-R1-VILLAGE-INDEX-104（失败后 30s 内重试/下拉全空操作）；MP-R1-PUBLISH-002/003/004/005/006/012（见 T6）；MP-R1-POST-102（圈内发帖失败取错数据源）；MP-R1-POSTTOPIC-003/004/007（tags/favorite real 丢弃；**兴趣分类 slug 必然 500**；占位符 {n}/{max}）。
- 个人资料：MP-R1-PROFILE-203（850+ 行不可达模板/5 孤儿组件）、-204（growth 接线断裂）、-205（他人态「动态」Tab 空白）、-206（VIP 卡渲染位置颠倒）、-207（targetUserId 无复位）。
- 校园/圈子：MP-R1-CAMPUS-HUB-004（状态栏叠加两次）；MP-R1-CAMPUSINDEX-002/003/004；MP-R1-TOPICDETAIL-001（401 误渲染「话题不存在」circles 复发）；MP-R1-CIRCLEHOME-001。
- 二线：MP-R1-CERT-101（实名门槛 onMounted 一次）、MP-R1-LIKES-102/103（手机号登录死钮；余额不足死路）、MP-R1-HSIGNALS-101、MP-R1-PRIVACY-001、MP-R1-VERIFY-INDEX-002/003、MP-R1-DISCOVERACTIVITIES-001/002（scroll 高度链；**报名失败弹成功 toast**）、MP-R1-SETUPINTEREST-003（4 组标签只存 1 组静默丢数据）、MP-R1-VIP-001、MP-R1-SAFEAREA-001、MP-R1-TASKS-004/005、MP-R1-FEEDBACKHIST-001（store 吞错→错误 UI 死代码）、MP-R1-OFFICIALCHAT-002（回归证实未修）/004（活动卡封面硬编码）。
- R2 P2 重点：MP-R2-PAGES-DISCOVER-INDEX-001（游客胶囊残余遮挡：浮岛越出 40rpx，R2 修 128rpx 后 R3 判 iPhone 下残余 2-4rpx）、-002（MatchActions 被 tabBar 半透明层覆盖）；MP-R2-PAGES-HOME-INDEX-001（未登录 401 强踢）；MP-R2-CAMPUS-HUB-001/003；MP-R2-POSTTOPIC-002/003；MP-R2-MSG-001/002（muted 重拉丢失；**消息页底部无 tabBar 避让**）。

### 4.3 第四周期 R3 代码审查 P2 全列（21 条）

MP-R3-PAGES-DISCOVER-INDEX-001（游客胶囊残余，回归核对）· -007（配额跨账号不隔离）· MP-R3-PAGES-HOME-INDEX-002（首页 3 组图片绕过统一出口）· -003（旅行圈 icon 文件不存在恒空白）· MP-R3-PAGES-MESSAGES-INDEX-003/004/005（三项回归核对已修复）· MP-R3-PAGES-PROFILE-INDEX-005（媒体/完成度回归核对+100→85 魔改残留）· -006（邀请弹窗幻影 token --f-*，字号层级塌平）· -009（mine/* 五组件 27 处零 token+内联透明度 hack）· MP-R3-CAMPUS-HUB-001（搜索框与容器同 token 不可见）· MP-R3-CAMPUS-INDEX-003（发布回流新帖挂错 Tab）· MP-R3-POSTTOPIC-002（真机双重避让）· -009（IA-POSTTOPIC-01 回归核对）· MP-R3-VILLAGE-INDEX-003（village:post-created 事件契约断裂）· -004（状态栏疑似双重避让）· MP-R3-VILLAGE-POST-001（提交链裸正则误判 tmp 路径）· -002（圈子目标话题静默丢弃）· MP-R3-VILLAGE-PUBLISH-004（snapshotDraft 回归核对）· -005（19 处裸 hex dark 模式实害）· -006（添加话题硬编码单话题 vs post 弹层能力分叉）。

## 五、P3/P4 与书面豁免/产品决策（回归时验证"仍然只是记录"即可）

| 主题 | 内容 | 来源 |
|---|---|---|
| 数字格式裁决 | 「1.2w vs 8,932」混用=理想图自身口径（R21 裁决维持）；R10 统一 k——产品终审悬置（T9） | round-3/audit-report.md:87；round-4:53 |
| 附近页 IA 冻结 | 分区顺序「严格冻结」为产品决策；「附近动态」板块列入迭代 | round-3/audit-report.md:88 |
| publish/post 双实现 | 设计如此保留（R10-P2-013）；但行为分叉仍是活风险（T6） | 2026-09-17-r10:133 |
| tabBar 中央浮岛 | 「寻觅」差异化设计（产品确认）；R2/R3 胶囊几何计算都以浮岛实高 184rpx+越出 40rpx 为准 | round-1/audit-report.md:68 |
| 匹配度环形 vs 实心粉圆 | R11 记 L4 ⚠️；**R13 裁决：理想图确为绿环，但 XunmiMatchRing（conic-gradient+mask，--ring-pct 从未绑定）不可直接接入，需 SVG stroke-dasharray 新实现——待办** | R13-ACCEPTANCE §6.1 |
| 「约」前缀/统计省略号 | 均为防「假数据冒充真实/孤字折行」的刻意修复，**不应回退**（R13 复核 design-parity 报告有误两例） | R13-ACCEPTANCE §6 |
| 添加日常 vs 添加故事 | 同文件两处注释互相矛盾，需产品定夺 | R13-ACCEPTANCE §6 |
| 素材缺口 | 星野/叶清欢纹理头像、heart_pink 透明图（已换）等 | round-4:60 |
| backlog | 帖子来源圈子行、他人主页学校距离行、本校 CTA 差异化、关系动态真实头像数据源（**R13 证实 likesAvatars 写死 [] 头像行永不渲染**）、圈子头像堆叠真实好友数据 | round-3:92；R13 §3.2 |
| MBTI 双 IA / love-center 内容单薄 / circles 空态 CTA | 保留观察/书面豁免/后续 | 2026-09-17-r10:135；r12:22-23 |
| 三处 0 接线决议 | getPhoneNumber / ContentSecurityChecker / WS connect 维持「正式封存」 | 2026-09-18-r11 acceptance-plan:38 |
| release 链三步未本地执行 | verify-env-release（HTTPS 域名）+ 主包 ≤2MB 严格门禁 + 真机隐私授权链——发布前必须执行；R13 重申该门禁本地结构性不可满足（未绕过，未跑） | r11-acceptance/audit-report.md:61；R13 §2 |
| lint warnings | 0 error 达标；14432 格式 warn 建议单独批次 | r11-acceptance/audit-report.md:69 |
| 协议默认勾选差异 | 登录页默认勾选 vs 注册页不预选（行业惯例记录） | 2026-09-12-round1:46 |
| 微信登录生产化 | 未配 WECHAT_APPID/SECRET → /v1/auth/wechat 502 降级 | final/final-verify-20260912.md:85 |
| 真机手势人工抽检 | 侧滑返回/下拉刷新 + R21「无法验证」清单（滑块/横滑/confirm/原生截断/原生弹窗/web-view 返回/分享/「有新消息」提示条） | round-5:32；round-1/interact |
| INDEP-006 Vue TypeError | 压缩产物 2 次未归因，登记监控 | independent:12 |
| media-query-token-strict | 上线时置 true + 客户端改 5 分钟媒体令牌 | 2026-09-13-r5:51 |
| 照片墙当次不回显 | IA-VISUAL-EDIT-01 P3 决策接受 | 2026-09-14-r6:70 |
| campus hub 校名省略号 | 布局级重排 P4 维持（R13 复核：回退会重新引入「态」孤字） | 2026-09-16-r8:35,94 |
| 校区字段混用/推荐池性别 | 有意种子/预期行为 | fix-report.md:41,43 |
| 「注册无一对一理想图」等 4 页 | register/village index/topic-detail/album 无理想稿，不硬凑对照 | R13 design-parity §3 |

## 六、R11 截图矩阵 blank/stuck 场景（R12 已定性，本轮仍需复核）

- BLANK：pages/home/index（A+B）、profile/other（A+B）、vip/index（A）。
- STUCK/骨架：village/tag-posts、village/history、circles/index、circles/topic-detail、campus/topic-detail、love-center/index、tools/search、profile/other、profile/favorites、feedback/history、discover/activities、market/detail（A+B）。
- R12 结论：修复页脱离 blank/stuck；home 偶发白屏 2/144 重拍恢复；其余定性合理空态/骨架等待。**回归应重跑该矩阵对照此清单；tag-posts/circles-index 等在 R21/R1 又修过分页/统计行，需确认不再退化为永久骨架；R13 教训：截图前必须校验当前页面路径（01 号图错位案）。**

## 七、回归高风险区梳理（对应本轮任务第 2 点）

1. **底部导航（TabBar）**：R2-TAB-010 游离线（已修）；消息角标 useUnreadBadge→custom-tab-bar 全链（R3 复核代码层闭环，**待运行时终验：红点→进入→清除**）；首页偶发白屏连 TabBar 全无（R12-IND-HOME-001 未闭环）；**tabBar 原生层遮挡 fixed 元素三案（游客胶囊残余 2-4rpx、FAB、消息页底部避让缺失）——凡 fixed/bottom 定位、tabBar 高度 token（--tab-bar-h 160rpx/浮岛 184rpx/净空 --tab-bar-clear-zone 300rpx）改动都要对照净空**；tab 切换状态保持从未逐点验证；automator 点不到 tabBar 项（独立渲染层）。
2. **页面高度/滚动**：banner 空白区 token（300rpx vs fallback 360rpx 漂移）；滚动遮罩三处（home/messages 同构）；scroll-view 无界高度族（T17：campus/index 翻页失效、favorites 双滚动、history 100vh 失准、activities AppShell 高度链、matching/circle-home min-height）；热度榜上拉「替换而非追加」（R3-VILLAGE-INDEX-002）；campus topic-detail mock 分页（已修）；**R13 相对时间收敛未进 dist**；合成 touch 无法驱动 scroll-view（滚动回归需程序化 scrollTo+截图双证）。
3. **弹窗/弹层**：渠道弹层三级分组+懒加载+三态（R3 复核在位，勿回归）；ActionSheet→BottomSheet 方案（profile 头像菜单，勿回退原生）；showModal cancel 未处理 rejection（SETUPCAMPUS-001 未修）；**原生弹层自动化不可达（须真机人工）**；位置授权弹窗遮挡取证（mock getLocation 规避）；邀请好友弹窗幻影字号 token（R3-PROFILE-006）。
4. **聊天**：**幂等键 409（R13-P0 刚修，回归重点：同会话二次进入、任意 get-or-create 端点、幂等键生成策略联动）**；滚底「发送后内容增高仍贴底」；图片消息 kind 降级（R1-CHAT-004）；临时会话功能面（倒计时/清草稿/假空会话三残留）；置顶/免打扰可见反馈+持久化（muted 重拉丢失 R2-MSG-001 未修）；conv-/userId 深链；preview 写错/残留；官方号死按钮（未修）+内容与封存矛盾；未读角标双口径；WS 重连上限；`chat.muteLocalOnly` 缺 key。
5. **发布**：草稿闭环（deleteDraft 静默失败残留通道、双页草稿键互兼容性、watch 原地变异、500ms 尾帧丢失、friends 入口语义覆写）；上传幂等键（同名文件恒定冲突 CAMPUSPOST-002；tmp 路径裸正则误判 VILLAGE-POST-001）；正文/标题上限契约（500 单源已修，post.vue POST_MAX_LENGTH=1000 残留清理项）；圈子分组懒加载；发帖流向 circleId（已修勿回归）；空提交拦截（circles 版有 toast、campus 版已修）；**village:post-created 事件契约断裂**（post.vue 不 emit）；报名失败弹成功 toast（DISCOVERACTIVITIES-002）；发布页 19 处裸 hex dark 实害。
6. **匹配**：matching 无上下文 200ms goBack 兜底（三轮 P0 证伪，**防"修坏兜底"**）；匹配动画双头像 resolveMediaUrl（R2-MATCHING-002 待修）；返回寻觅页错误横幅/卡片重复消费（已修，易回归）；错误横幅重试与 30s 缓存；配额跨账号隔离（R3-DISCOVER-INDEX-007）；打招呼计数顺序（INDEX-010）；love-center/nearby 卡片推进（LNEARBY-101 待修）；重复喜欢守卫；喜欢幂等键（422/header→headers 史）；cancel-like 软删；互赞→heart_signals→会话建立链；匹配度环形=未决设计项（勿照 design-parity 字面接入 conic-gradient 组件）。
7. **个人资料**：四格计数假 0 史；完成度口径（服务端权威已修，残留 100→85 魔改）；编辑模式 entry=edit 返回（勿回归）；**不可达分支族（语音介绍/背景图 UI 在 v-if=false 槽、他人态「动态」Tab 空白、VIP 卡颠倒）**；growth 接线断裂；我的故事配图裸直连（R7 同病复发）；targetUserId 无复位；头像 ActionSheet（BottomSheet 勿回退）；访客卡 NaN 与胶囊；tasks 签到状态不更新族；实名/认证提交防重入（isSubmitting 守卫缺失三页：certification/verification×2/schedule）；「重新认证/删除」real 假状态。
8. **图片**：媒体链全套（T5+T17）；**R13 双修复（media.ts 两前缀改写 + Avatar.vue 组件内解析）是全站头像的承重墙，动 prepare-static/包体积门禁/Avatar.vue 必须全站回归头像**；preview/album 直传原始 URL；首页 3 组绕过出口；mock 资源存在性（travel.svg 不存在恒空白）；图文语义映射（R3-VILLAGE-INDEX-001 批量 ≥13 帖待修，**验证必须实读图片文件**）；default-avatar 唯一真身；admin /static 改写。
9. **返回**：T14 全类（R21 刚补 8+ 页栈底守卫，兜底目标不统一：switchTab tab 页 vs reLaunch 非 tabBar 页，改动易互相污染）；新增裸 navigateBack 四处（campus hub/post-topic×2/topic-detail×2/vip×3）；深层返回链 pageStack；编辑模式 navigateBack vs redirectTo；401 reLaunch 劫持（豁免但观察影响面）；matching 200ms goBack；navigateBack unhandledRejection console 取证应回归为 0。
10. **状态（页面状态机/鉴权态/i18n/主题）**：状态栏体系（T1+真机双重避让亚型）；空态四态竞态（「不存在/已解散」必须 gate 在 fetch 落定）；错误态渲染与横幅清除（retry 死键史）；封存闸（consult key 契约、VIP switch 脱节、bills 无条件请求）；冷启动假 0；**i18n 完整性（裸 key 上屏两案+占位符名不匹配+重复 key last-wins+图标 key 不存在）**；URL 编码解码；时间格式（ISO 原始串史、相对时间未进 dist）；dark 模式裸 #fff（publish 页实害）；未登录态在 mock 构建不可达。
11. **数据合规/种子质量**：审计残留（**private_messages 3894 待授权删除，删前删后都要 SQL+页面双证**）；标签映射字典；讨论圈去重；相册重复；数字格式（T9）；mock 固件写穿；反馈历史预置详情 404；campus hub 硬编码「约」标注勿去掉；nearby:city 无写入方。
12. **证据可信度（先于一切缺陷判定）**：boot 校验（T11）+ 截图前页面路径校验（R13 新规）+ DevTools 清缓存流程 + dist 目录开窗 + 双身份；**R21 的 59 项交互修复与第四周期 R1/R2/R3 三轮共 849 条发现中的「已修复待终验」批次（合计 100+ 项）全部只做了代码层/静态复核，运行时终验欠账是本轮回归的第一优先对象**。

## 八、截至最近一轮（R13，2026-09-22）的未闭环项（下一轮输入）

1. **数据残留**：`private_messages` id=3894 外露消息预览位（等授权删除，需同步 `private_conversations.last_message_preview`）。
2. **第四周期确认仍未修的历史项**：MP-R1-HELP-101（复制邮箱）、MP-R1-OFFICIALCHAT-002（官方号三死钮）、MP-R1-SETCAMPUS-001（showModal cancel rejection）、MP-R1-PAGES-REGISTER-INDEX-001（服务层 captureException 噪音）、@catchtap 全仓清零复查。
3. **第四周期新发 P1/P2 待修复代表**（全量见 §3.3-3.5/4.2/4.3）：home TDZ watch、campus i18n 裸 key、campus/village/publish 真机状态栏双重避让、mock feed 批量图文不符、热度榜分页替换、邀请弹窗幻影 token、login type="password"（待终验）、nearby reportLocation 强踢、campus scroll-view 翻页失效、chat-session 差分检测、post-topic 临时图片直出、matching 双头像、publish restoreDraft friends、segment/search/other 头像裸直连、messages lastMessageTime、配额跨账号、messages 底部 tabBar 避让、publish 草稿五连、VILLAGE-INDEX-101/102/108、VERIFY-INDEX-001、DND-002、LMBTI-101、LNEARBY-101、OTHER-002、PROFILE-201/202/204/205/206/207、CAMPUSPOST-002/003/004、PUBLISH-001..009、DETAIL-001（样式孤立）、DISCOVERACTIVITIES-001/002、HSIGNALS-101、PRIVACY-001、VERIFY-INDEX-003、SETUPINTEREST-003、VIP-001、SAFEAREA-001、TASKS-004/005、FEEDBACKHIST-001 等。
4. R12 遗留：R12-IND-PROFILE-INDEX-001（未登录头部叠印，R13 因截图错位仍未验证）；R12-IND-HTTP-401-001 / R12-IND-AUTH-GATE-001（产品决议）；R12-IND-HOME-001（首页偶发白屏）；R12-IND-LOVECENTER-IDX-001 / R12-IND-CIRCLES-001。
5. R13 遗留：设计一致性布局级清单（匹配度环形/hero 层级/相对时间进 dist/帖子详情/首页结构/收藏入口/话题详情导航/相册胶囊避让）；仓库根 project.config.json 开窗不编译真因；XunmiMatchRing 半成品勿直接接入（需 SVG 方案）；「添加日常 vs 添加故事」产品定夺。
6. 工程/流程：release 链三步（HTTPS 域名、主包 ≤2MB、真机隐私授权）发布前必跑；lint warnings 批次；G4 交互逐点点验工具建设；微信登录生产化；media-query-token-strict 上线切换；CONSULTING-001 后端真实 key 契约接口级确认；CONSULTING/BILLS/VIP 封存联动三案。
7. **运行时终验欠账（最大风险面）**：R1/R2/R3 三轮回归核对结论为「已修复待终验」的 100+ 项 + R21 修复批 59 项 + R13 已修但未单独回归的 vue-tsc 族——本轮回归应优先用运行时证据（截图+console+DB）闭环，而非再堆静态复核。

---

### 附：本轮（2026-09-22 晚）生成时执行的取证动作
- Read 工具通读：round-1/audit-report.md、round-1/issue-matrix.md（753 行全文）、round-1/regression-report.md、round-2/audit-report.md、round-2/issue-matrix.md（前 120 行+目录统计）、round-3/audit-report.md（旧周期）、round-3/issue-matrix.md（旧周期）、round-4/audit-report.md、round-5/audit-report.md、2026-09-12-round1、2026-09-13-final、2026-09-13-independent、2026-09-13-r3、2026-09-13-r5、2026-09-14-r6、2026-09-15-r7、2026-09-16-r8、2026-09-16-r9、2026-09-17-r10-visual（audit+fix）、r11-acceptance（audit+ideal-comparison+chain-results）、r12-independent、independent/indep-fix-verification、2026-09-22-r13-goal（R13-ACCEPTANCE+design-parity-findings）、baseline/historical-issues.md（旧版全文 372 行）、baseline/regression-index.json 与 ideal-baseline.md（头部）。
- `find reports/audit -type f`（排除 shots/图片）清点全部报告文件；`wc -l` 核对规模。
- `ls -la` 核对 round-1/2/3 与 baseline 各文件 mtime，确认 round-3/code-findings（Sep 22 10:19-10:54）为第四周期产物而 round-3/audit-report.md（Sep 11）为旧周期留档。
- python 逐份解析 round-3/code-findings/*.json（14 份、149 条：P0×2 P1×17 P2×21 P3×49 P4×60），全量提取 P0-P2 的 id/severity/category/status/description。
- `ls 素材/理想效果图`：19 张 png 在位（R13 design-parity 的理想图基准有效）。
- 未执行任何构建/测试/代码修改；本文件为唯一写入产物。
