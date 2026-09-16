# Round 8 独立审计报告（2026-09-16）

## 0. 本轮定位

按总控提示词继续执行独立审计轮（Round-8）。不继承 R1-R7 结论，把项目当作新项目重新全量走查：真实环境（real 后端 8080 + MySQL + Redis）、真实账号登录、72 个已注册页面全量截图（首轮 81 张 + 补测 25 张 + 修复回归 20+ 张）、console 抓取、七链路行为级回归、管理后台浏览器级核查与真实管理操作。

## 1. 环境与构建

| 项 | 状态 |
|---|---|
| MySQL 3306 / Redis 6379 / API 8080 | ✅ 全程在线（本轮重启后端 2 次以加载修复，健康检查 UP） |
| wechatide 门禁（versionRelation=equal、loginExpired=false、tokenRequired=false） | ✅ |
| 前端构建 `build:mp-weixin:real:dev`（Node 22.17.0） | ✅ 5 次通过（含修复迭代） |
| 后端编译 `mvnw package -DskipTests` | ✅ 2 次通过 |
| vue-tsc | ✅ 46 个错误，与 R7 基线完全一致，本轮改动 0 新增 |
| 测试账号 | 曦风 13800006666 / Abc12345（本轮重置为已知值，userId=100158，实名 cert id=151 APPROVED）；验收君 13800139999 / Abc12345 实测可登录 |

## 2. 本轮发现并修复的问题（10 项）

| ID | 级别 | 页面/文件 | 问题与修复 | 回归证据 |
|---|---|---|---|---|
| MP-R8-STATUS-001 | **P1** | likes/index.vue | 「匹配列表」标题叠印状态栏：top padding 只用 `env(safe-area-inset-top)`（DevTools 恒 0）。改 `var(--statusbar, env(...))` + 注入 useMenuButtonRect | r3-fix-likes 截图标题下移 |
| MP-R8-STATUS-002 | **P1** | profile/album.vue | 「我的相册」标题被状态栏时间叠印（同根因） | r3-fix-album 截图 |
| MP-R8-STATUS-003 | P2 | tools/heart-signals/index.vue | 关闭钮位置同缺陷（page 级同修） | r3-fix-heart-signals |
| MP-R8-STATUS-004 | P2 | CardDetailOverlay.vue | 卡片详情浮层顶栏同缺陷（同修，防患） | 构建通过+视觉走查 |
| MP-R8-CAPSULE-001 | P2 | likes/index.vue | 状态栏修复后「管理」钮压进胶囊：--capsule-right 仅为右缘间隙，按 87px 胶囊全宽+间隙预留 96px，标题/pills nowrap 防挤压折行 | r8-likes-final4 截图三元素齐整 |
| MP-R8-LIKES-001 | **P1** | likes/index.vue | 「喜欢我的」永远空态：`isUnlocked = isProfileComplete`，未完善用户 onShow 守卫永不触发 fetchLikes → 页面「正常 UI + 假空态」，与我的页四格「喜欢我的 1」及 likes-visitors 页直接矛盾。门槛降为 isLoggedIn（交互仍由服务端 per-item unlocked 把关） | r7c/r8-likes 截图显示小满+双徽标 |
| MP-R8-CIRCLE-001 | P2 | 后端 CircleController/RealCircleService/MockCircleService + 前端 circle.ts | 回复接口 DTO 无 authorAvatarUrl 字段 → 话题详情回复全部渲染字母占位头像（DB 中作者均有包内头像）。后端补字段（复用 resolveAuthorAvatar 批量解析），前端 mapToReplyItem 原硬编码空串改读字段 | r3-fix-topic37 截图全部真实头像 |
| MP-R8-LOCK-001 | P2 | village/index.vue + heart-signals/index.vue | LockScreen「当前完成度 10%」与我的页 30% 矛盾——R7-PROFILE-004 只修了 profile 页，LockScreen 数据源仍读 session 快照。两页统一改为优先 /profile/basic 服务端权威值 + onShow 懒加载（60s TTL） | r3-fix-village 截图显示 30% |
| MP-R8-OWNPOST-001 | P2 | village/detail.vue | 自己的帖子详情显示「+关注」按钮（可关注自己）。computed isOwnPost + v-if 隐藏 | r3-fix-village225 截图无关注钮 |
| MP-R8-DRAFT-001/002 | **P1** | 后端 RealDraftService + 前端 post.vue/publish.vue | 草稿「发布成功后永不清除」闭环：①后端 `DELETE /drafts/current` 恒 500（RealDraftService.delete 缺 @Transactional → TransactionRequiredException，DB 实证 draft id=8 残留）；②前端两发布页成功后只清本地不清后端，而 restoreDraft 优先后端 → 每次发布后重新进入都恢复已发布内容（重复发布风险）。后端补 @Transactional（curl 实测 500→200+DB 清零），前端成功分支补 clientApi.deleteDraft() | 链路 E：post id=226 落库后 draft_remaining=0 |
| MP-R8-CONTRACT-001 | P3 | 后端 MatchController | /matches/liked-me、/visitors 返回裸 List 违反全端点 ApiResponse 信封约定（my-likes 为信封，双形态不一致）。统一 ApiResponse.ok()（http.ts 两种形态均兼容，安全） | curl 实测信封返回 |
| MP-R8-CAMPUS-001 | P3 | campus/hub.vue | 推荐圈子卡「中国人民大学/上海交通大学」校名被 badge+申请按钮挤压硬折行（R2 同类问题复发于本页）。name flex:1+nowrap+ellipsis，badge flex-shrink:0 | r3-fix-campus-hub 截图单行省略号 |

记录不修（决策）：campus hub 6 字校名在「封面+名称+badge+申请按钮」四列挤压下显示省略号——彻底解法需改卡片布局，偏离理想图，记 P4。

## 3. 环境伪影甄别（非应用缺陷，重要）

1. **reLaunch 风暴崩溃**：首轮 81 页截图脚本对每页用 reLaunch 导航，40+ 次后（pageId 已达 90+）DevTools 应用服务假死（automator timeout、页面白屏、"is not registered" 报错），43-81 号截图全为同图白屏。**补测脚本在新鲜会话中逐页复测，全部正常渲染**（r2-* 系列 25 张），确认是 DevTools 资源耗尽伪影，非应用缺陷。教训：自动化导航应优先 navigateTo+back，reLaunch 需分段。
2. **清缓存后首次导航白屏/欢迎页**：debug_clear_cache 后立即 reLaunch 会命中编译竞态，等待 20-30s 或二次刷新后恢复。与 R6/R7 记录一致。
3. **token 会话互踢**：多次 curl phone-login 会使小程序 storage 中旧 token 失效（单会话语义），表现为页面 401 空态。测试时注入 token 后不可再用其他登录覆盖。
4. **automation input 不受 maxlength 约束**：直填 41 字标题显示 39/20 计数超限并触发提交校验拦截——真实键入会被 maxlength 截断，属自动化伪影；同时反向证明提交校验存在且生效。

## 4. 七条用户链路真实验证（曦风 100158，DB 双证）

| 链路 | 路径 | 证据 | 结果 |
|---|---|---|---|
| A 登录/浏览 | 真实登录态注入→首页→附近→附近的人→他人主页(小满)→返回 | chain-a1~a4 截图（他人主页 hero/标签/生活瞬间/CTA 全真实） | **PASS** |
| B 匹配 | 寻觅页真实卡片 → 真实鼠标点击「喜欢」→ likes 表 id=2275（100158→100155）实时落库，实名门控正确放行 | chain-b1 截图 + DB | **PASS** |
| C 兴趣圈 | 兴趣圈列表→摄影圈(circleId=8 深链)→话题详情(37)→回复头像真实渲染 | chain-c1/c2 + r3-fix-topic37 | **PASS** |
| D 校园圈 | hub 认证墙+推荐圈子（北大/清华/人大/复旦/上交 计数）| chain-d1 + r3-fix-campus-hub | **PASS** |
| E 发布 | 编辑器填单→真实点击发布→posts id=226 落库→后端草稿同步清除（draft_remaining=0）| chain-e1/e2 截图 + DB | **PASS** |
| F 消息/聊天 | 与小满会话→输入→真实点击发送→private_messages id=3897 sent 落库→气泡渲染 | chain-f1/f2 截图 + DB | **PASS** |
| G 编辑资料 | ?entry=edit 编辑模式（返回键/无进度条）→保存校验正确拦截空必填→向导模式保存并继续正确进入下一步（campus）| chain-g1~g5 截图；完整改值保存路径 R6/R7 已有 DB 级证据 | **PASS** |

## 5. 管理后台核查（浏览器级，SUPER_ADMIN local-dev-admin-openid-123456）

| 项 | 证据 | 结果 |
|---|---|---|
| 登录 | IAB 浏览器真实表单登录成功，角色「超级测试账号」 | PASS |
| 图片可见 | 图片审核页：曦风照片墙 id=1807 缩略图+预览大图完整渲染（带鉴权 blob 加载） | PASS |
| 图片可管理 | 点击「审核」→ 弹窗（通过/拒绝/备注）→ 提交通过 → DB media_asset 1807 approved，auditor_id=100000，audited_at 即时落库，待审列表实时清空 | PASS |
| 实名认证 | 列表全部状态可见（151 林曦风 已通过等），详情含脱敏证件号 110101********1234 与正反面链接；图片 API 带 admin token 实测 200 image/png（25149/22090 字节）。IAB 阻止 window.open blob 新窗（环境限制，非应用缺陷） | PASS |
| 数据同步 | 用户管理页曦风「资料完善度 30%」= 小程序我的页 30% = DB profile_completion=30，三端一致 | PASS |

## 6. 历史问题回归（本轮重点复核）

- R7-PROFILE-001~005（头像/相册渲染、完成度、相册入口）→ 本轮我的页截图复测 ✅ 无回归
- R7-REALNAME-001 / UPLOAD-001 → 链路 E 发布图链路（本链无图）、编辑页照片墙 2 张真实渲染 ✅
- R6-EDITFLOW → 链路 G 双模式行为正确 ✅
- R3 四格计数 → 我的页 我喜欢1/喜欢我1/我赞0/访客0 与 DB 一致 ✅
- IA-CIRCLEHOME-01 → 无参/错参 circle-home 显示真实空态（本轮回归确认）✅
- IA-TOPIC-01 → topic 37 回复 12 = DB 12 ✅
- R1-STATUS 体系 → 本轮新发现 4 处漏网 env() 用法已收编 --statusbar 体系（STATUS-001~004）

## 7. 截图清单（reports/screenshots/r8-audit/）

- 01-81：全页面首轮截图（含 43-81 环境伪影白屏，见 §3）
- r2-*：25 张新鲜会话补测（证明伪影）
- r3-fix-* / r4/r5/r6/r7/r8-*：10 项修复的 Before/After 回归证据
- chain-*：七链路行为级证据
- 管理后台：图片审核页（缩略图可见）、审核弹窗、实名详情（浏览器截图）

## 8. 结论

- P0 = 0；本轮登记 P1 共 4 项（STATUS-001/002、LIKES-001、DRAFT-001/002）全部修复并回归验证
- 72 个注册页面全部真实截图走查（含多状态），console 无应用级 error
- 七链路全部真实打通，关键写操作有 DB 落库证据
- 管理后台与小程序数据三端一致，图片「可见 + 可真实管理」双验证
- vue-tsc 46 错误与基线持平（0 新增）；全部改动已 Git 提交

## 9. 最终遗留项

1. （P4）campus hub 卡 6 字校名省略号显示——需布局级重排才能根治，偏离理想图，维持现状
2. （P4）likes 页「喜欢我的/我发出的喜欢」tab 文案 2 行折行——3+5 字在 1/3 宽度内自然折行，不影响点击
3. （观察）reLaunch 风暴下 DevTools 资源耗尽属工具链限制，建议后续自动化采用 navigateTo 为主
4. （观察）vip/market 封存页对未完善资料用户为静默重定向/封存态，产品可考虑增加提示文案
