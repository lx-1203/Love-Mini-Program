# 独立质量审查报告（Independent Audit）

- 审查人：独立审查 Agent（与既有任何报告无关，未读取 reports/audit、.workbuddy、deliverables 下任何文件）
- 日期：2026-09-13（模拟器内时间 2026-09-12 深夜至 09-13）
- 被审对象：
  - 前端构建产物 `D:\6\恋爱小程序\apps\client\dist\build\mp-weixin`（real 模式，API=127.0.0.1:8080）
  - 后端 real profile `http://127.0.0.1:8080`（/actuator/health = UP，已用 curl 确认）
  - MySQL `campus_love`（只读查询）
- 测试账号：13811119999（UI验收用户，userId=100155，token 经 curl 获取后 `wx.setStorageSync('token', …)` 注入）

---

## 1. 审查范围与方法（实际执行记录）

| 方法 | 实际执行内容 |
|---|---|
| 逐页截图 | wechatide `simulator_screenshot` 共 17 张（shots/01~17），覆盖：登录、注册、首页、附近、寻觅、消息、我的、兴趣圈列表、圈子主页（×2 次，见 IA-CIRCLEHOME-01 复测）、话题详情、发布页、校园圈 hub、帖子详情、发布页空提交、注册页空提交、登录页复测。每页与 `素材/理想效果图/` 同名理想图做了并排拼图（cmp-*.png，共 11 张）后逐级比对 |
| 行为抽查 | ① 注册页空表单点「注册」；② 发布页空内容点提交（element_action tap 成功返回，但 toast 未在 1s 后截图中捕获，见方法局限）；③ switchTab×3 连续切换 + navigateBack delta=2/delta=4 深层返回，pageStack 校验正确 |
| console | `get_simulator_console grep -n -i error` 全量取证（结果见 §2 IA-CONSOLE-01/02），error 集中共 3 类；后续遍历页面后的复查未出现第 4 类 |
| network | `get_simulator_network grep topics` 取证：topic 详情/回复均为真实 HTTP 200，响应体逐字段核对 |
| 后端契约 curl | /auth/me、/recommendations/people、/profile/stats、/matches/liked-me、/sms/send-code、/posts/{221,223,224}、/posts/221/comments、/circles/8（探测） |
| 代码级抽查 | pages/register/index.vue（校验顺序、协议默认态）、pages/login/index.vue（自动前进逻辑）、pages/profile/index.vue（stats 消费字段 713-749 行）、subpackages/circles/circles/circle-home.vue（mock 兜底 210-235 行）、post-topic.vue（submitTopic 校验 263-300 行）、stores/circle.ts + stores/helpers/use-mock.ts、utils/location.ts、后端 ProfileQueryService.getProfileStats / calculateTotalLikesCount |
| MySQL 一致性 | user_follows、likes、profile_visitors、circle_memberships、circle_topics（含 reply_count）、circle_replies、posts（status/audit_status/visibility）、interest_circles、post_likes、comment_likes 共 10 项核对 |

方法局限（如实声明）：
1. `automation_element_action` 对自定义组件内部节点不可达：发布页空提交的 toast 未能截图固化，仅以源码（post-topic.vue submitTopic 空值分支 uni.showToast）佐证。
2. console 有历史缓冲，行号 9-31 的错误可能部分来自接管前的会话；但 `TypeError: k is not a function`、`reportLocation is not defined` 均为 real 包内真实堆栈，且 `reportLocation` 在源码中的 3 处调用点已定位。
3. 登录页"游客直达 discover"的第一次观察被证明是测试方法伪影（见 §3 N-10），已复测并更正，未计入问题。

---

## 2. 问题清单

### IA-CONSOLE-01  real 包存在 Vue 全局运行时错误 `TypeError: k is not a function`
- 页面：归属未定（堆栈为压缩产物 getmainpackagebundle.js:44822，`e.watch.immediate`；发生时机与小程序启动/首页会话恢复阶段吻合）
- 截图：无 UI 表现；证据为 console 取证（行 10-11、14-15，各伴随 `[Global Error][Vue Error]` 与 `[captureException]` 双通道上报）
- Severity：**P1 严重**
- 当前行为：watch(immediate) 回调内调用了一个未定义/非函数的引用，Vue 全局错误处理器与 Sentry（captureException）均捕获到，同一错误出现 ≥2 次。
- 理想行为：console 零未捕获运行时错误。
- 修复建议：对登录页/首页带 `immediate: true` 的 watch（如 pages/login/index.vue 106 行起的 session 前进 watch）及其依赖的 store getter 做未定义防护，用 sourcemap 复原 44822 行确权。
- 备注：console 中该错误伴随 `https://vuejs.org/error-reference/#runtime-3`，非网络原因。

### IA-CONSOLE-02  未处理的 Promise rejection：`ReferenceError: reportLocation is not defined`
- 页面：首页 / 附近（调用点：`pages/home/index.vue:70、199`，`pages/nearby/index.vue:92`）
- 截图：无 UI 表现；证据为 console 行 23-25（`[Global Error][uni.onUnhandledRejection]` + captureException）
- Severity：**P1 严重**
- 当前行为：`utils/location.ts` 明确 `export async function reportLocation(...)`（96 行），但 real 构建产物运行时抛 `ReferenceError: reportLocation is not defined`，且调用点 `void reportLocation(...)` 未 catch（nearby 处 `.catch(() => {})` 也未生效，说明错误发生在模块引用解析层），定位上报链路在 real 包中断裂并污染错误监控。
- 理想行为：定位上报静默成功或被兜底 catch，无 ReferenceError。
- 修复建议：排查 utils/location 在分包/主包的循环依赖或被 tree-shake/重命名冲突问题；调用点改为显式 try/catch。

### IA-POSTTOPIC-01  发布页自定义导航栏与状态栏/胶囊按钮重叠
- 页面：subpackages/circles/circles/post-topic（`?circleId=8`）
- 截图：shots/11-post-topic.png、shots/14-post-topic-empty-submit.png（左上"返回"胶囊压在系统状态栏 `7:34/100%` 一行上，标题"发布话题"被右上胶囊按钮遮挡，导航区右上还有异常红粉色渐变块）
- Severity：**P2 明显影响**
- 当前行为：导航栏未计入状态栏高度（safe-area 缺失），返回/标题与系统 UI 叠压。
- 理想行为：同 app 内 topic-detail 页（shots/10）的同款绿色导航正常避开状态栏；发布页应对齐。
- 修复建议：发布页自定义导航补状态栏高度占位（对照 topic-detail 的实现差异即可定位）。

### IA-TOPIC-01  话题详情「回复 5」徽标与「暂无回复」空态同屏矛盾
- 页面：subpackages/circles/circles/topic-detail?id=28
- 截图：shots/10-topic-detail.png（正文下方"回复 5"徽标，列表区"暂无回复，快来抢沙发吧"）
- 证据链：GET /api/v1/circles/topics/28 → `replyCount: 5`；GET …/28/replies?page=0 → `content: [], totalElements: 0`；DB `circle_topics.reply_count=5` 而 `circle_replies WHERE topic_id=28` = 0 行。
- Severity：**P2 明显影响**
- 当前行为：计数来自 seed 写死的 reply_count，与回复明细表不同步；后端原样返回，前端同屏自相矛盾。
- 理想行为：徽标数 = 明细数（0）。
- 修复建议：后端返回 `replies 表 COUNT` 或同步 seed 数据；topic 25/26/27 的 6/4/8 同样存疑。

### IA-STATS-01  `/api/v1/profile/stats` 半数字段为硬编码占位，字段语义与前端消费错位
- 页面：后端契约（pages/profile/index.vue 消费）
- 证据：curl 返回 `{"followingCount":0,"followersCount":0,"likesCount":0,"likedMeCount":0,"visitorCount":0,"matchCount":0}`；源码 `ProfileQueryService.getProfileStats()` 第 200-206 行字面量 `0,0,0`（注释自认"likedMe/visitor/match 暂无独立统计源，返回 0 占位"）；`likesCount=calculateTotalLikesCount` 只聚合**帖子被赞数**（post_likes=0），而前端 profile/index.vue 742/749 行把它当作"我喜欢"消费。DB 事实：`likes` 表中我发出的 active 喜欢=2、我被喜欢=1。
- Severity：**P2 明显影响**
- 当前行为：接口语义（获赞）与前端文案（我喜欢）不一致；likedMe/visitor/match 恒 0。前端靠 748 行"QA 修复：优先取 likes store 实时列表"兜住了"喜欢我的=1"，但"我赞 0/访客 0"页面展示值与 `likes` 表真实数据脱节，接口作为契约不可信。
- 理想行为：stats 各字段与真实业务表一致且语义对齐前端文案。
- 修复建议：likedMe/likes(发出) 改从 `likes` 表聚合；前端"我喜欢"改用 likesStore.myLikes.length 与 748 行同策略，或后端拆分"获赞/发出喜欢"两个字段。

### IA-CIRCLEHOME-01  circle-home 参数缺失/错误时静默渲染 mock 演示数据
- 页面：subpackages/circles/circles/circle-home
- 截图：shots/09-circle-home.png（`?id=8` 进入：展示假动态"阿辰/云海 256 赞"、假统计"1.2w 人加入 · 362 条动态"，network 取证**未发出任何 topics 请求**）；对照 shots/16-circle-home-correct-param.png（`?circleId=8`：真实数据"5 条动态"、真实话题"城市夜景拍摄攻略/微单镜头求推荐"与 DB 一致）
- Severity：**P2 明显影响**
- 当前行为：onLoad 只认 `query.circleId`；拿不到 id 时按源码 222-225 行"静默回退 mock feed、store 内部已置 errorMessage 但本页不提示"，real 模式下用户会看到成套虚构内容且无任何异常标识。
- 理想行为：缺参/拉取失败应显示错误/空态，而非伪造数据。
- 修复建议：real 模式禁用 mock 兜底或至少展示"演示数据"水印；分享路径参数名已在源码内自洽（`?circleId=`），建议对 `?id=` 做兼容或忽略。

### IA-VISUAL-01  附近页与理想图结构差异较大
- 页面：pages/nearby/index；理想图 `附近的首页.png`
- 截图：shots/cmp-04-nearby.png
- Severity：**P3 细节**
- 差异明细：① 理想有「附近动态」feed（动态卡+图片+关注按钮+悬浮发布球），实机首屏无此板块，取而代之是「附近的人/同城的人」两个入口卡（理想图不存在）；② 理想「热门兴趣圈/校园圈」为实拍照片卡+「已加入/去认证」操作，实机兴趣圈为水彩插画卡、校园圈为文字列表卡+「公开浏览」；③ 实机顶部多了搜索框与"北京大学·附近"小字条。信息层级与理想图明显不同。
- 建议：按理想图补「附近动态」板块或与产品确认以实机结构为准。

### IA-VISUAL-02  发布页与理想图《发布帖子页面》为两套信息结构
- 页面：subpackages/circles/circles/post-topic；理想图 `发布帖子页面.png`
- 截图：shots/cmp-11-post-topic.png
- Severity：**P3 细节**
- 差异明细：理想为「发布动态」：右上"发布"主按钮、发布到圈子卡（成员数+可见性）、0/1000 正文、图片九宫格、添加话题/位置/提及好友/谁可以看/发帖小贴士/底部工具栏。实机为「发布话题」：标题+正文(0/500)+校园圈/兴趣圈切换+话题标签 chips+喜爱开关+0/9 图片；缺位置、谁可以看、小贴士、底部工具栏；提交按钮在顶部导航而非理想位置。
- 建议：与设计确认目标形态；至少统一字数上限与提交位置。

### IA-DISCOVER-01  寻觅卡片匹配度徽标样式与理想图不符，缺距离文案
- 页面：pages/discover/index；理想图 `寻觅匹配卡片页面.png`
- 截图：shots/cmp-05-discover.png
- Severity：**P3 细节**
- 差异明细：理想为绿色进度环「92% 匹配度」+左上「5km」距离胶囊；实机为粉色圆形徽标「80% 匹配度」、无距离（后端 `distanceText: null`，数据侧未产出）。其余（推荐/附近 tab、在线徽标、标签、三按钮区）高度一致。
- 建议：前端补距离兜底文案（如同校/在线）或后端补 distanceText；徽标样式对齐绿色环。

### IA-HOME-01  首页「关系动态」头像位渲染为模糊卡通占位，弱于理想图
- 页面：pages/home/index；理想图 `首页.png`
- 截图：shots/cmp-03-home.png
- Severity：**P4 优化**
- 差异明细：理想图关系动态为真实用户小头像叠放+数字（3 人喜欢了你等）；实机为 4 个模糊卡通占位图，数字被裁切在折叠线附近；首页较理想图缺「兴趣推荐/附近的人/社区动态/邀请好友」板块（可能位于折叠下方，未滚动取证）。今日恋爱进度 1/4 vs 理想 2/4 为数据差异，不算问题。
- 建议：占位图替换为初始字母头像或真实头像；核对首屏板块完整度。

---

## 3. 未发现问题项清单（均附证据）

| # | 项目 | 证据与结果 |
|---|---|---|
| N-1 | 注册页空表单校验 | shots/15-register-empty-submit.png：空表单点「注册」→ 手机号红框+「请输入手机号」错误文案、按钮置灰禁用；源码校验顺序 手机号→验证码→密码→昵称→生日→协议（register/index.vue:193-206） |
| N-2 | 注册协议默认未勾选（合规） | 源码 `const agreed = ref(false)`（49 行注释"进入页面一律未勾选，不预选"）+ 截图 15 底部复选框为空 |
| N-3 | 帖子可见性过滤正确 | GET /posts/221（visibility=friends、作者 100151 非好友）→ 404 `RESOURCE_NOT_FOUND`；GET /posts/223、/posts/224（public/本人）→ 200。前端对 404 显示优雅空态"帖子不存在或已被删除"+返回按钮（shots/13-post-detail.png），非崩溃 |
| N-4 | 我的页统计与 DB 一致 | 页面显示 我喜欢 2 / 喜欢我的 1 / 访客 0；DB：`likes WHERE user_id=100155 AND status='active'`=2、`target_user_id=100155`=1、`profile_visitors WHERE host_id=100155`=0，逐项相符（经 likesStore 实时列表接口，见 IA-STATS-01 的接口层备注） |
| N-5 | 消息页数字与 DB 一致 | 「1 人喜欢了你」= likes 表 1 行；「最近聊天 Pair-QA-B」= /matches/liked-me 返回 userId 100156，真实数据贯通 |
| N-6 | 话题详情真实契约 | GET /circles/topics/28 200：作者 夏言/头像/标题/内容与 DB 逐字一致；回复列表 totalElements=0 与 circle_replies 0 行一致（计数徽标问题单列 IA-TOPIC-01） |
| N-7 | circle-home 正确参数下真实数据 | shots/16：`?circleId=8` 时「5 条动态」与 DB circle_topics(circle_id=8)=5 一致，feed 展示 DB 内真实话题标题 |
| N-8 | 推荐流契约 | /recommendations/people 返回的 name/campusName/tags/bio/online 状态在寻觅卡片（shots/05）逐项正确渲染；包裹结构为数组（无 code/data 包装），前端按数组直接消费，匹配 |
| N-9 | 短信 mock 链路 | POST /sms/send-code → `mockCode:"123456"`、expiresIn 300 秒，结构完整 |
| N-10 | 登录页可达性（更正一次误报） | 初测"清 storage 后 reLaunch 登录页却落到 discover"（shots/01、17，currentPage=/pages/discover/index）经源码核对为**测试伪影**：login/index.vue 106-117 行 watch(immediate) 检测 `sessionStore.isLoggedIn`（内存态仍为已登录）自动前进，属 2026-08-31/09-06 有意为之的会话恢复逻辑，且有 autoForwardedToMain 单次标记防双跳转竞态。冷启动无 token 场景不触发。不列为缺陷 |
| N-11 | 导航/返回逻辑 | switchTab×3、navigateTo 5 层、navigateBack delta=2/4 全部成功；pageStack 路由与参数逐层正确（取证见过程输出） |
| N-12 | 校园圈 hub 数据与理想图一致 | shots/cmp-12：北大 3.2k 同学·2.8w 动态、清华 2.6k·2.1w、人大 9,823 动态等与理想图 seed 数字完全一致；按钮态（申请加入 vs 已认证进入）与当前用户 campusVerified=false 匹配 |
| N-13 | 后端健康与登录 | /actuator/health = UP；phone-login 签发 JWT（249 字符）可用；/auth/me 返回 userId/displayName/featureFlags 结构完整 |
| N-14 | console/network 总体 | 遍历 13+ 页面后 error 仅 §2 所述 3 类，无新增类别；network 无 5xx（唯一 404 为 N-3 设计内行为） |
| N-15 | 注册页视觉 | shots/02、15：绿色主视觉+吉祥物「创建账号」，字段分组（账号信息/基础身份）、错误提示、协议区齐整，无裁切/遮挡（无理想图对照基线，按通用标准检查通过） |

---

## 4. 独立结论

**当前状态：不可直接交付（Not ready for release），距可交付差一轮 P1/P2 修复。**

理由：
1. real 构建产物存在两个未捕获运行时错误（IA-CONSOLE-01 的 Vue 全局 TypeError、IA-CONSOLE-02 的 reportLocation ReferenceError），其中后者意味着定位上报功能整体失效，且两者都会持续污染 Sentry 类监控。
2. 数据契约层有三处会让用户直接感知的矛盾：话题「回复 5 vs 暂无回复」、profile/stats 占位 0 与页面真实数据并存、circle-home 静默 mock。
3. 发布页导航栏与状态栏叠压是肉眼可见的 P2 视觉缺陷。

不阻塞交付的共识项：视觉还原类（IA-VISUAL-01/02、IA-DISCOVER-01、IA-HOME-01）可与产品确认基线后另行排期；核心链路（注册校验、登录、tab 导航、帖子可见性、真实数据页面）经独立验证均正常。

建议修复顺序：IA-CONSOLE-01 → IA-CONSOLE-02 → IA-TOPIC-01 → IA-POSTTOPIC-01 → IA-STATS-01 → IA-CIRCLEHOME-01。

## 附录：产物清单
- 截图（17 张原始 + 11 张对照）：`reports/audit/2026-09-13-independent/shots/`
  - 原始：01-login … 17-login-recheck（命名见上文引用）
  - 对照：cmp-01/03/04/05/06/07/08/09/10/11/12-*.png（左红字 ACTUAL，右蓝字 IDEAL）
- 关键取证：console 错误全文、network 请求/响应原文、curl 响应、SQL 数值均已在上文各条目内联记录。
