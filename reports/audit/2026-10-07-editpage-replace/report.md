# 资料编辑页替换与全链路真实验证 — 验收报告

- 日期：2026-10-07
- 范围：小程序资料编辑页（`subpackages/setup/profile/index?entry=edit`）行为层替换 + 微信开发者工具模拟器 real 档全链路实测 + 管理后台三方一致性核查 + 视觉评审
- 账号：userId=100158（13800006666，`scripts/qa/r-exec.cjs:493` IDENT_DEFS.A 测试账号）
- 报告撰写说明：本报告由报告撰写员汇总各执行腿（实现/门禁/环境/驱动/管理后台/视觉评审）的结果写成。撰写员本轮亲自核实的内容（源码行、落盘产物、截图文件）均标注「本轮核实」；未能亲自复跑的检查如实注明，不以他人回报冒充实测。

---

## ① 结论

**本轮目标达成：编辑资料页替换以行为层修复完成——回显、保存闭环、入口一致三项均经真机 automator 全链路实测通过，服务端持久化、媒体字节回读、管理后台 UI/API/DB 三方一致全部核销，门禁（typecheck/vitest/real 档构建）第 2 轮通过；残留问题有二：视觉评审的 1 条 medium（hero 副标题被表单卡裁切）代码修复已落工作区、dist 产物也已含新几何，但重截截图仍渲染旧几何、修复的实机效果未获任何截图证实，另有 VIP 账单页无数据（后端 DB total=0，属数据缺失而非功能缺陷）如实记为不通过。**

- 实测结论：全链路 `chainOk=true`、`echoVerified=true`（回显 13/13 逐字段一致）；管理后台 7 项同步核查 6 项通过、1 项（VIP 账单有数据）不通过；console 终轮 error=0。
- 修了 4 个问题：MP-R1-SETUPPROFILE-003（弱网误报保存失败）、PFI15 根因（编辑模式回显失效）、设置页入口缺 `entry=edit`、保存后 60s TTL 缓存假失败——后两条为本次排查新发现。

---

## ② 页面替换改动

### 文件清单（均为工作区未提交改动，本轮以 `git status --porcelain` 核实）

| 文件 | 改动 |
| --- | --- |
| `apps/client/src/stores/profile.ts` | 新增 `mapBasicProfileToEditForm` 纯函数、`loadBasicForEdit`、`saveBasicUpdate`（diff 约 +209 行） |
| `apps/client/src/subpackages/setup/profile/index.vue` | 编辑模式回显/保存链路改造、`refreshSession` 解耦、hero 状态栏几何修复（diff 约 +130/-61 行） |
| `apps/client/src/subpackages/profile-extra/settings/index.vue` | 「编辑资料」入口补 `?entry=edit` |
| `apps/client/src/tests/profile-store.spec.ts` | 新增 store 映射层用例（详见下） |

### 要点：模板本就共用，「替换」的缺口在行为层

编辑模式（`?entry=edit`）与本文件内向导模式本就共用同一模板：hero 全出血+渐隐、白色表单卡骑压 -64rpx=32px、96rpx/圆角 24rpx 图标字段、聚焦光环 `rgba(54,201,154,.12)`、错误 #FEF5F6+抖动、渐变主按钮，逐项对照 `deliverables/注册页/寻觅注册页-设计规范.md` §2/§4/§5 核实（样式行本轮复核：`.card` margin -64rpx、`.field` 96rpx/24rpx、`.field--focus` 光环 6rpx rgba(54,201,154,.12)、`.submit-btn` 96rpx，`index.vue` 样式区均在位）。本轮修了三处行为：

**1. 回显可靠性（PFI15 根因）**：原页面 onMounted 读 `profileStore.load()` 的四端点 Promise.all（本轮复核：Promise.all 实际位于 `stores/profile.ts:415` 的 `load()` 内），任一端点失败整个 catch、`basicProfile` 保持 null，编辑页整页空白——即 PFI15「编辑模式回显从未被拍到」的根因，且受 60s TTL 跳过影响。修法：
- 新增纯函数 `mapBasicProfileToEditForm`（`stores/profile.ts:126`，本轮核实，对照后端 `ProfileController.java:267` BasicProfileView 全字段）+ `store.loadBasicForEdit()`：real 模式仅 `GET /v1/profile/basic` 单端点、每次真拉；mock 分支复用 `load()` 演示数据（避免 fixtures.getBasicProfile 只有 4 基础字段把照片墙演示态清空）。
- 页面编辑模式走新链路，两模式共用同一 `applyEditEcho`（`index.vue:487`，本轮核实）。头像/照片墙 6 槽/昵称/简介/年级/称谓/身高/学历/感情状态/籍贯省市/未来城市/期待伴侣/身份全部落表单；回显失败降级为 store 既有状态映射，表单仍可编辑可保存。

**2. 保存闭环**：保存改走 `store.saveBasicUpdate()`——`PUT /v1/profile/basic` 正常返回即成功，同步合并 basicProfile 视图并 `removeCache("profile:load")`，修掉保存后返回我的页命中 60s TTL 缓存看到旧资料的假失败。MP-R1-SETUPPROFILE-003 落地：`sessionStore.refreshSession()` 移出保存主 try、单独 try/catch（`index.vue:644-648`，本轮核实代码在位），失败仅 console.warn，弱网刷新失败不再误报「保存失败」。

**3. 入口一致**：设置页「编辑资料」原裸路径进向导模式（显示「第 n/4 步」进度条且保存后被 redirectTo 进注册流程下一步），已补 `?entry=edit`（`settings/index.vue:95-101`，本轮核实）。我的页 hero 与 more 菜单（`pages/profile/index.vue:840,1114`）、`tasks.vue:90,122` 核实本就带 `entry=edit`；返回流 navigateBack/无栈兜底 switchTab 我的页不变。

模板仅保留三条允许差异：wizard 才显示 SetupProgress（`index.vue:690` `v-if="entryMode === 'wizard'"`，本轮核实）、按钮文案「保 存」、保存后返回来源页（另有无进度条时的 `card__cap--first` 上边距补偿，属隐藏进度条的布局后果）。

### 测试（已编写；门禁腿实跑，见 ③）

新增 6 条 store 映射层用例（`tests/profile-store.spec.ts`，本轮以 grep 核实用例行号 156/178/194/209/218/241，落在所述 124-248 区间）：
1. `mapBasicProfileToEditForm`：GET /v1/profile/basic 全字段映射，缺字段不丢回显；
2. 身份推导——服务端校园信号优先，否则回退本地身份；
3. null 安全——basic 为 null 时回退空值且 photoGallery 为空数组；
4. `loadBasicForEdit`：返回回显视图并同步 store（mock 分支复用 load()，不清空照片墙）；
5. `saveBasicUpdate`：PUT 成功即保存成功——合并 basicProfile 视图并失效 60s TTL 缓存；
6. `saveBasicUpdate`：PUT 失败时向上抛出且不污染本地视图。

另有后续补充的 3 条 `uploadPhotoAtIndex` 回归用例（spec 行 254/277/291，针对视觉评审 medium「上传后照片墙即时回显缺失」）。

### 已修问题清单

| 问题 | 处置 |
| --- | --- |
| MP-R1-SETUPPROFILE-003：refreshSession 与 updateBasicProfile 同 try，弱网下保存成功却误报「保存失败」 | 已修（round-1/issue-matrix.md:656 查证仍在，按审计建议单独 try/catch 静默降级） |
| PFI15（round-7/case-cost-census.json:6813）指向的编辑模式回显失效根因 | 已修：回显不再依赖四端点 Promise.all 与 60s TTL，补 store 映射层测试；帧级截图取证本身属 QA 拍摄流程，不在代码范围 |
| 设置页「编辑资料」入口缺 entry=edit，编辑用户被误投递进注册向导流程 | 本次排查新发现，已修 |
| 保存成功后我的页 60s TTL 缓存不失效、显示旧资料的「假保存失败」 | 本次排查新发现，已修 |

### 实现说明与有意不改

- **身份回显**：`GET /v1/profile/basic` 的 BasicProfileView 无显式 identity 字段（已核后端 `ProfileController.java:267` 字段清单），按仓库既有约定（`config/identity.ts:5-9`「后端以校园身份信号区分」）用 `verificationBadgeLevel==="school"` 或 `session.campusVerified` 推导 student，否则回退本地持久化身份——这是服务端数据能做到的完全回显，已写入映射函数文档并在测试中固化。
- 有意不改：`stores/unlock-guide.ts:119`、`view-models/home.ts:81`、`guards/profile-guard.ts:67` 的无参路径属注册未完成引导流（向导语义正确，不属四个编辑入口）；mock 模式下身高/学历等扩展字段回显为空与改造前一致（fixtures.getBasicProfile 不合并 extendedBasicProfile，为不扰动 mock-fixtures.spec 未动）；后端无需任何改动即可达成目标，未 escalate；工作区其余在途改动（发布档减负等）一律未触碰。

---

## ③ 门禁记录

- **typecheck / vitest / real 档构建：第 2 轮通过；命令为 node20 npm-cli 实跑**（由脚本门禁腿执行）。
- 如实说明：实现腿自述「已编写、未运行」（任务明确要求门禁由脚本在后执行）；报告撰写员本轮亦未复跑这三道门禁，且在磁盘未找到门禁日志留痕（本轮以 `find reports .zcode -newermt "2026-10-07 02:00"` 核查，非截图产物仅 `.zcode/tmp/mpcompile-real/` 下的采集件，无 typecheck/vitest/build 日志文件）。**本节结论以门禁腿的回报为准，撰写员无法凭落盘物独立复证。**

---

## ④ 环境连通

**后端真实健康，未做任何伪装**（环境腿回报）：

- 后端已在运行（8080 监听，PID 32156），无需启动。
- 检查 1：`curl -s -m 5 http://127.0.0.1:8080/actuator/health` → `{"status":"UP"}`（含 MySQL/Redis 指示器，依赖可用）。
- 检查 2：裸调 `curl -s -m 5 http://127.0.0.1:8080/api/v1/config/legal` 三次均 HTTP 500 INTERNAL_ERROR；按 traceId 查 `apps/api/logs/campus-love-api-error.log` 定位根因为 `MissingServletRequestParameterException: Required request parameter 'type'`——接口签名（`apps/api/src/main/java/com/campuslove/api/clientconfig/ConfigController.java:119-121`）中 type 为必填参数，**裸调用 500 是调用方式问题而非服务故障**。
- 带参重验（合法取值依 `LegalTextProvider.java:134-141`）：`?type=privacy_policy` → HTTP 200、2784 字节非空 JSON；`?type=user_agreement` → HTTP 200、2676 字节非空 JSON。
- 唯一偏差：任务给的裸 URL 因缺必填 type 参数会得 500，需带 `?type=` 才命中。

---

## ⑤ 编译清白与页面截图

### 自动化通道（驱动腿回报）

WS 9420 裸连 miniprogram-automator（绕过 checkVersion 握手）做 console 监听+会话注入 × 微信开发者工具 CLI 桥(9430) 做 simulator_refresh/导航/simulator_screenshot。通道判据：`scripts/qa/ws-channel-up.mjs` 实跑打印 `WS_UP=ALREADY_UP port=9420` + `WS_UP_BAND=match`（应用内 `require(config/env.js)`=OK|real，落点 pages/login/index）exit=0；另 `open-project-window.mjs` `OPENWIN_RESULT=OK` 验窗活。（注：`.zcode/tmp/ws-channel-up.log` 现存内容为 CLI 启动输出、mtime 03:43，判据行以驱动腿当时实跑回报为准。）

### console 清白度

- **终轮（正式采集轮，simulator_refresh 重编译+重启后经 App.enableLog+管道自测确认回流可用）console error=0 条**——无产品级错误可判。
- 本轮复核：对落盘的 `console.log` / `console-chain.log` / `console-reshoot.log` 逐一 `grep -c "[error]"`，均 **0**。
- 已知非缺陷项：`[error] "[captureException]" EnhancedApiError network_error {http_url:/app-config/login-hero} 与 {http_url:/auth/me}`（诊断轮采到）——重装后的 IDE 冷态对 `http://127.0.0.1:8080` 报 `request:fail url not in domain list`（域名校验开关只认 project.private.config.json，该文件缺失），补 `urlCheck=false` + refresh 后 app 内 /auth/me 实测 200、终轮未复现；`[warn] [Perf] App.onLaunch took 53ms` 为框架打点噪声；2 条 info 级 preloadSubpackages 成功回执；IDE/CLI 侧 node punycode DeprecationWarning 属工具自身进程，不属小程序 console。

### 截图（终轮 4 张，v1/v2 未登录轮已覆盖）

| 步骤 | 截图（相对路径） | 结果 |
| --- | --- | --- |
| 登录页 | `reports/audit/2026-10-07-editpage-replace/screenshots/step-01-login-page.png` | ✓ 匿名态完整渲染（寻觅标题+三登录方式+稍后再看+去注册+协议勾选） |
| 注册向导模式资料页 | `reports/audit/2026-10-07-editpage-replace/screenshots/step-02-register-wizard-profile.png` | ✓ A 会话（profileCompleted=false 向导语境）：「第 1/4 步」进度条+头像+照片墙 1 张+昵称已填 |
| 编辑模式 `?entry=edit` | `reports/audit/2026-10-07-editpage-replace/screenshots/step-03-edit-mode-profile.png` | ✓ 进度条消失（对应 index.vue:690），昵称/签名/年级带真实数据，与向导帧肉眼可辨为两态 |
| 我的 tab | `reports/audit/2026-10-07-editpage-replace/screenshots/step-04-tab-mine.png` | ✓ 真实登录渲染（曦风+在线徽章+编辑资料+完整度 30%+tabBar 高亮），非未登录占位 |

### 本环节问题

1. **【已修】IDE Stable 2.02.2608040 × miniprogram-automator@0.12.1 握手不兼容**：Tool.getInfo 只回 `{version}` 不回 SDKVersion，SDK checkVersion 拿 undefined 过 cmpVersion 的 `v1.split('.')` ⇒ `A.connect()` 必抛 reading 'split'（四轮同炸，曾被误归因为「会话没就绪」）。修法：`ws-channel-up.mjs` 改为 Connection.create+new MiniProgram 绕过握手（补丁已落盘并注释）。上游其他腿若还用 A.connect 直连会继续踩。
2. **【已修】新版 IDE 冷态把域名校验按开处理**（产物 project.config.json 的 urlCheck=false 不被认，开关在缺失的 project.private.config.json）⇒ 127.0.0.1:8080 全被拦、SessionStore 离线模式。已补 `apps/client/dist/build/mp-weixin-real/project.private.config.json`（urlCheck:false，文件内注明天只属 IDE 配置非构建产物）+ refresh——大概率即本轮「real 档会话打不通」体感的环境面根因。（本轮核实该文件在位，mtime Oct 7 04:04。）
3. **【登录通道结论】real 档登录不需要碰短信**：短信网关未接时 send-code 503 是设计行为（`SmsCodeController.java:10,68-69` 仅 mock profile 回码）；既有通道=A 账号走 `/api/v1/auth/phone-login` 密码登录，token 经 WS evaluate 写 storage 并 `await session.bootstrap()`（r-exec-ws.mjs:381 的 2026-10-06 教训：点火不等结果在 real 档恒 not-logged-in）。本次照做，`VERIFY_LOGIN=logged-in userId=100158` 实测通过，未伪造任何会话。
4. console 采集窗口留痕：refresh 重启 app 后日志转发失效，以「补发 App.enableLog + evaluate 打标记自测回流」兜底（CONSOLE_PIPE=OK 才继续）；refresh→重挂之间有未监听窗口期。
5. 环境现态：IDE 窗口（mp-weixin-real，pid 11084）与 9420/9430 通道保持存活未关（仓库口径不许 close 自动化实例）；UI 租约 wechat-automation-cli.lock 已由驱动退出时释放。v1/v2 两轮拍到过的未登录态截图均已被终轮同名文件覆盖，目录只保留终轮（ls 时间戳 04:06-04:07）。

---

## ⑥ 全链路实测

**`chainOk=true`、`echoVerified=true`**（驱动腿回报，截图与落盘物本轮逐一核实存在）。

- 账号与通道：userId=100158（13800006666，IDENT_DEFS.A），既有通道 `POST /v1/auth/phone-login` 密码登录（不碰短信网关），token 经 WS evaluate 写 storage 并 `await session.bootstrap()`，`VERIFY_LOGIN=logged-in userId=100158` 实测通过。本轮后昵称=曦风QA链，简介已改为 QA 全链路验证简介。
- 回显逐字段核对：DOM 读数（input.value/picker 文案/槽位 src）× curl 独立会话 `GET /v1/profile/basic` 对照 **13 项全部一致**——昵称/简介/年级(大三)/称谓(TA)/身高(141cm)有值回显；学历/感情状态/籍贯省市/未来城市/期待伴侣服务端为 null 页面即为空，无错位无错字段（明细 `.zcode/tmp/mpcompile-real/echo-compare.json`，本轮核实存在且含逐字段 ok=true 记录）。
- 服务端持久化核对：新开 curl 会话 GET basic，nickname/bio 已持久化，photoGallery 新增 `/api/v1/media/100158/202610/019a7479-dd52-489e-a486-5b94826cbf9e.png`；GET 该 url → 200 image/png 2150B，md5 与上传源文件完全一致（17f5630e…）⇒ media_asset 行真实落库且可服务。（本轮复核落盘 `media-fetch.bin`：2150 字节、头部 `89 50 4E 47` PNG magic 吻合。）

| 步骤 | 截图（相对路径） | 结果 |
| --- | --- | --- |
| 登录后的我的页 | `screenshots/chain-01-mine-logged-in.png` | ✓ clearSession 后重新铸票注入，logged-in userId=100158，hero 完整 |
| hero「编辑资料」进入编辑模式 | `screenshots/chain-02-edit-entry.png` | ✓ 落点 `subpackages/setup/profile/index` 且 options={"entry":"edit"}（MP-R6-EDITPAGE 编辑语义） |
| 编辑模式整页（顶部） | `screenshots/chain-02b-edit-top.png` | ✓ 头像+照片墙 6 槽（1 占 5 空）+昵称/简介表单 |
| 编辑模式整页（底部） | `screenshots/chain-03-edit-bottom.png` | ✓ 籍贯/未来城市/期待伴侣/身份与保存按钮区，与顶部合计覆盖整页 |
| 修改昵称简介+上传照片到第一个空槽 | `screenshots/chain-04-photo-uploaded.png` | ✓ 输入回读一致；桥 tap [aria-label=照片墙 2] 触发真实链路（chooseImage 已 mock 返回沙箱内真实 PNG → uploadPhotoAtIndex → POST /v1/profile/photos 真实落库），photoGallery 1→2 |
| 保存并返回我的页 | `screenshots/chain-05-after-save-mine.png` | ✓ PUT /v1/profile/basic 成功后自动 navigateBack，我的页 hero 即时显示新昵称与新简介 |
| 重进编辑模式核新值回显 | `screenshots/chain-06-edit-reentry.png` | ✓ 昵称=曦风QA链✓ 简介新值✓ 照片墙第 2 槽渲染刚上传的图（slots=imgimg----）✓ |

（上表截图路径均在 `reports/audit/2026-10-07-editpage-replace/` 之下；无独立截图的两步——回显逐字段核对、服务端持久化核对——以 `echo-compare.json` 与 `media-fetch.bin` 落盘为证。）

上传资产：`019a7479-dd52-489e-a486-5b94826cbf9e.png`。

### 本环节问题

1. hero「编辑资料」按钮物理点击不可自动化：`.my-header__edit` 位于 profile-shell→MyProfile→MyHeader 三层自定义组件内，WS page.$（含 >>> 深选择器）与 CLI 桥 automation_element_action 均报 no such element；降级为 wx.navigateTo 按钮目标路由 `/subpackages/setup/profile/index?entry=edit`（源码 `pages/profile/index.vue:840` 路由表 + `:1114` goToProfileSetup），落点与 entry 语义已实测一致。
2. 照片墙空槽 UI tap 不稳定：本轮（及历史 probe7 一次）桥 tap [aria-label=照片墙 N] 能触发完整上传链；但中间 5 次同选择器 tap 返回 success 而 handler 未执行（showModal/uploadFile 日志壳证实），v-for+动态 bindtap 节点的 automator tap 派发疑似有缺陷。**本链路最终走的是真实 UI tap 路径**；建议后续排查 IDE(2.02.2608040) 自动化 tap 对 wx:for 节点的派发。
3. 上传文件格式教训：IDE simulator_screenshot 产物是 JPEG 字节但扩展名 .png，后端 magic bytes 校验如实拒绝（HTTP500「文件内容与扩展名声明不一致，疑似伪装文件」，traceId=30969ee97fb7408bb0f0c8f7ca7133f4，`apps/api/logs/campus-love-api-error.log:1562`）——**后端防伪装文件特性工作正常**；改用仓库内真 PNG（static/assets/icons/tabbar/nearby-active.png）后通过。
4. 登录态导航重定向：reLaunch pages/profile/index 后产品逻辑一度把栈顶改到 pages/discover/index（寻觅=已登录落点，round-7 裁定行为），驱动以 switchTab 归位后双通道路由一致，不影响链路结果。
5. console 采集伪影：refresh 后重挂的 WS 连接与旧连接并存导致每条 console 双份记录（console-chain.log 可见成对行），属采集端伪影非产品双日志；全程产品级 console error=0、exception=0。
6. 回显核对时点说明：本轮 nickname 与上一轮持久化值同名（重新输入），回显判定以「页面显示=服务端 GET /v1/profile/basic」逐字段一致性为准（13/13），bio 每轮带新时间戳可区分写入批次。

---

## ⑦ 管理后台核查与三方一致性

**loginOk=true**（管理后台腿回报）：playwright-core（chromium-1217 headless）真实登录 `http://localhost:5177`（该实例在我启动前已在跑 admin vite dev，/api 代理 8080 已验证可用；我方新实例落 5180，已停掉）。

可见资产：media_asset 1831（019a7479….png，审核队列命中→已通过列表可见，预览弹窗图片真实渲染 naturalWidth=81）、user 100158 曦风QA链（用户详情弹窗可见）、wallet 1（用户 100000，余额 20.00）、VIP 账单页（打开正常但 0 条，DB total=0）、数据看板（总用户数 280）。

管理动作：媒体审核通过——UI 审核弹窗对资产 1831 勾选「通过」并提交，`POST /api/v1/admin/media-assets/1831/audit` → HTTP 200 `{"auditStatus":"approved",...}`。

| 同步核查 | 结果 | 要点 |
| --- | --- | --- |
| a) 后台 UI 该资产状态=已通过 | ✓ | pending 队列唯一行 innerText="1831\|曦风QA链\|照片墙\|2.1KB\|81×81\|qa-upload.png\|待审核"；提交后待审核队列「暂无图片数据」；切「已通过」后该行可见；缩略图/预览 naturalWidth=81（真实资产内容非占位） |
| b) 管理员 API 查同一资产 DB=APPROVED | ✓ | `GET /api/v1/admin/media-assets/1831`（Bearer，admin login+Idempotency-Key）→ 200 `auditStatus:"approved", auditorId:100000, auditedAt:2026-10-07T05:34:39`；审核前基线同接口 pending（tmp/asset_1831_pre.json）。注意：审核接口主键是数字 id（`AdminMediaAssetController.java:141` @PathVariable @Positive Long id），UUID 是存储 key，拿 UUID 当 id 调用会 500 |
| c) 审核前后照片对外可见性变化 | ✓ | 媒体端点审核前后均为：匿名 401、admin JWT 200 image/png 2150B——该端点是 JWT 归属者/管理员鉴权（`MediaAccessController.java:263`），审核状态不是读闸门（MediaAccessService 无 audit 判断）；可见性变化体现在资产状态 pending→approved（客户端业务视图消费该状态，如 `ProfileController.java:310` PhotoItemView.auditStatus、MediaAssets.vue「通过后对外展示」），已由 b) 前后对比证实 |
| 用户数据同步：昵称/简介 | ✓ | UI 用户详情弹窗与 `GET /api/v1/admin/users/100158` 双证一致（曦风QA链 / QA全链路验证简介：由真机 automator 于 2026-10-06T21:22 写入），审核前后两次一致，与小程序保存值吻合 |
| VIP 账单页可打开且有数据 | ✗ | 页面正常渲染但表格空；API `GET /api/v1/admin/business/vip/bills` → `{"items":[],"total":0}`——后端本就无账单数据，非 UI 不同步；**如实记为不通过（数据缺失，非功能缺陷）** |
| 钱包页可打开且有数据 | ✓ | /business/wallets 渲染钱包 ID=1/用户 100000/可用 20.00；API total=1，UI 与 API 一致 |

截图（相对路径，均在 `reports/audit/2026-10-07-editpage-replace/screenshots/` 下）：
`admin-00-login-page.png`、`admin-01-dashboard.png`、`admin-02-media-queue.png`、`admin-02b-preview-modal.png`、`admin-03-audit-modal.png`、`admin-03b-after-approve.png`、`admin-03c-approved-list.png`、`admin-04-user-detail.png`、`admin-05-vip-bills.png`、`admin-06-wallets.png`。

本环节问题：① VIP 账单页无数据（见上表，唯一不通过项）；② 5177 端口在我启动前已有 admin vite dev 实例（新实例落 5180 已停），本轮直接使用 5177 现有实例并验证其 SPA 服务与 /api 代理正常；③ 第一次浏览器会话出现 1 条 console 404，复跑 4 个页面监听所有 HTTP>=400 为 0 条，未能复现、来源未定位（疑似 favicon 或瞬时资源），无功能影响；④ 目标照片内容本身是绿色定位标 81×81 PNG（qa-upload.png, 2.1KB）——UI 显示绿标是真实资产内容而非加载失败（img naturalWidth=81、直接 curl 字节 PNG 2150B、预览元信息三重证据）；⑤ **建议**：后端以数字 id 暴露审核接口，拿 UUID 当 id 调 `GET /api/v1/admin/media-assets/{id}` 返回 500(INTERNAL_ERROR)，建议改为 404/400 避免调用方误用存储 key 时拿到 500。

---

## ⑧ 视觉评审发现

### 首轮（对照 `deliverables/注册页/寻觅注册页-设计规范.md` 全文 + 高保真稿 CSS 令牌区 + 素材/理想效果图/已经填完资料的个人主页.png、未登录个人主页.png、登录页面.png）

**overallMatch=true：编辑模式/向导资料页整体符合注册页设计语言，我的页与理想图高度一致；共 2 medium + 4 low，无一票 high。**

已核对的符合项（只读实证）：hero 全出血+渐隐（复用 `IMAGE_PATHS.REGISTER.HERO`，底部 104rpx≈52px 渐隐=规范 §1.2）；白色表单卡骑压 -64rpx=32px、卡圆角 40rpx/内边距 40rpx/阴影逐值一致=§1.2/§4.3；图标字段 96rpx/24rpx、默认底 #F7FAF9 边框 #EEF2F0=§5.1；聚焦光环 `0 0 0 6rpx rgba(54,201,154,.12)`=§2.2、错误态 #FEF5F6+1.5px 红边+红色光环=§5.1；主按钮 96rpx/24rpx + 135° #36C99A→#55D5A7 渐变=§5.5；行内错误+抖动代码存在（index.vue:762-763、95-106、568-607）。step-01 登录页判定合规（胶囊/hero 渐隐/协议行与理想图一致；胶囊圆角是该页自有规范）。向导有步进器、编辑无——属模式差异非违反。

未能验证项（如实说明）：11 张截图全部为正常态，**错误红框+抖动与聚焦光环只有代码证据、无现场截图**。

首轮 findings：

| 级别 | 位置 | 问题 |
| --- | --- | --- |
| medium | chain-02b-edit-top.png（step-02/03、chain-02/06 同现） | hero 副标题「完善你的…基础信息」下半行被白色表单卡上缘裁切：hero__txt 顶部随状态栏下移而表单卡骑压缘固定，状态栏>66rpx 时副标题底缘越过卡顶，真机必现 |
| medium | chain-04-photo-uploaded.png | 该步声称已上传照片到第一个空槽，但截图里第二格仍为空「+」；直到 chain-06 重进才出现——上传后即时回显缺失或截图早于异步渲染，截图无法判定哪种 |
| low | chain-03-edit-bottom.png | 滚动到底后左上角状态栏行内出现「基础资料」字样与系统时间并排；该页 navigationStyle:custom 且代码无吸顶逻辑（grep 0 命中），疑似模拟器/截图工具叠加，建议人工复核 |
| low | step-04-tab-mine.png | 完整度卡与理想图一行错位：「去完善」下移到说明文字行右侧、30% 位于标题行右侧 |
| low | step-04-tab-mine.png | 底部 tab 中央凸起绿色心形「寻觅」按钮，理想图为平底五 tab；全站性差异、疑似有意，仅记录 |
| low | chain-05-after-save-mine.png | 保存（改昵称简介+新增照片）后资料完整度仍 30%；若照片计入应上涨——可能待审核暂不计入，业务规则无法从截图判定，标不确定 |

### 复判（范围仅两张新截图：chain-02b-edit-top.png、chain-06-edit-reentry.png，mtime 05:52/05:53）

**overallMatch=true（其余项维持合规），但首轮 hero 裁切 medium 在新截图中仍未修复**：

- 证据链：PIL 裁切放大目视可见副标题被卡缘拦腰截断；像素测量（numpy 求卡片白区起始行与深色文字行分布）两图 card_top=209px、深色文字延伸至 y=208 紧贴卡缘——209px×2=418rpx 即旧几何 480rpx−64rpx=416rpx（未含状态栏）；若修复生效（--statusbar≈88rpx）卡顶应在 ≈252px。
- 代码侧：修复本体在工作区未提交改动（`index.vue:1078` hero 高度改为 `calc(480rpx + var(--statusbar, env(safe-area-inset-top)))`，含 MP-R7-EDITPAGE-2 注释，本轮核实代码在位）；HEAD 最新触达该文件的提交 18c91ccf 是 2026-09-24 旧提交。
- **本轮撰写员补充核查**：dist 产物 `apps/client/dist/build/mp-weixin-real/subpackages/setup/profile/index.wxss`（mtime 05:48）已包含新几何 calc 表达式，且重截（05:52/05:53）晚于该构建——即「磁盘构建过期」不成立；重截仍渲染旧几何，剩下两种解释：**运行中的模拟器实例未加载重编译后的新 bundle，或 calc(480rpx+var(--statusbar)) 在运行时未生效**，两者无法从静态文件区分（复判腿与撰写员均未执行构建/模拟器验证），需负责构建的腿用真机/模拟器重截确认。
- chain-06 其余项复核通过：bio 新值「复拍验证简介：上游重建后 2026-10-06T21:52 写入」正确回显，照片墙第二格照片+× 角标正常；eyebrow、hero 渐隐、白卡 40rpx/骑压、字段样式与规范一致（几何值重读 index.vue:1070-1078,1123-1128,1156-1162 确认未回退）。
- 未验证项：修复在真机的实际效果；错误态/抖动（两图仍为正常态，无现场可评）。
- 另：首轮 medium「上传后照片墙即时回显缺失」的代码修复已落工作区——`tests/profile-store.spec.ts:254-291` 新增 3 条 uploadPhotoAtIndex 回归用例（含「BasicProfileView 形态响应→照片墙整面权威同步、即时回显」，本轮核实），但 chain-04 未重拍，UI 即时回显同样未获截图证实。

---

## ⑨ 未覆盖项与遗留问题

**测试面未覆盖：**
- 真机未测：全部自动化在微信开发者工具 IDE 模拟器（2.02.2608040）内完成，无任何真机（iOS/Android）取证。
- H5 端未测。
- 支付链路封存未测（本轮不涉及 VIP 购买/钱包支付）。
- 错误态（红框+抖动）与聚焦光环无现场截图，仅代码证据；视觉两轮截图均为正常态。
- 门禁（typecheck/vitest/real 构建）由门禁腿第 2 轮实跑通过（node20 npm-cli），实现腿与报告撰写员均未复跑，磁盘无门禁日志留痕可独立复证（见 ③）。

**遗留问题（未解决，需后续处理）：**
1. **hero 副标题被表单卡裁切（medium，视觉评审）**：代码修复在工作区（index.vue:1078）、dist 产物已含新几何，但重截截图仍渲染旧几何——修复效果未获视觉证实，需重编译+模拟器/真机重截确认（参见 ⑧ 复判）。
2. **上传后照片墙即时回显缺失（medium，视觉评审）**：代码修复+3 条回归用例已落工作区（spec:254-291），UI 未重拍证实。
3. **VIP 账单页无数据**：DB total=0（API 同证），任务要求「有数据」不满足，属数据缺失非功能缺陷。
4. 资料完整度保存后仍 30% 不涨：业务规则无法从截图判定（可能照片待审核暂不计入），未核实。
5. 我的页完整度卡「去完善」按钮与理想图一行错位、底部凸起心形 tab 与理想图平底五 tab 差异：全站性设计差异，仅记录未处置。
6. 管理后台媒体审核接口拿 UUID 当 id 返回 500：建议改 404/400（`AdminMediaAssetController.java:141`）。
7. IDE 自动化 tap 对 wx:for+动态 bindtap 节点派发不稳（5 次 success 但 handler 未执行）：建议排查 IDE(2.02.2608040) automator；上游腿若仍用 A.connect 直连也会继续踩握手不兼容（ws-channel-up.mjs 的绕过补丁未上游化）。
8. chain-03 底部截图状态栏「基础资料」字样来源未定位（代码 grep 0 命中，疑似模拟器/截图工具叠加），建议人工复核。
9. 管理后台第一次会话 1 条 console 404 未复现、来源未定位。
10. 环境现态：IDE 窗口（pid 11084）与 9420/9430 通道保持存活未关（仓库口径不许 close 自动化实例），后续腿可直接复用。

---

## 回归补验（第二轮，2026-10-07 收尾腿）

**结论：hero 裁切 medium 已修复并经模拟器像素级复验通过（clipResolved=true）；照片墙即时回显 medium 查实为无 bug（当轮 store 修复已在包内，本轮实传+≤3s 截图证实即时回显，instantEcho=resolved）；门禁三连（typecheck / test:unit / build:mp-weixin:real:isolated）在终版代码上全部 EXIT=0；console 产品级 error=0。**

### 改了什么

| 文件 | 改动 |
| --- | --- |
| `apps/client/src/subpackages/setup/profile/index.vue` | ① 样式区 `.hero` 高度 calc 保留（本轮实测验证其本身可编译可生效，词序不是根因，见下），注释改写为 MP-R7-EDITPAGE-3 记录本轮证据链；② script 新增 `useStatusBarHeight` + `getWindowWidth` 导入与 `heroStyle` computed（480/750×窗宽 + 状态栏 px，状态栏为 0 时回空串回落 CSS calc）；③ 模板 `.hero` 加 `:style="heroStyle"` 内联兜底（与 AppShell.vue 状态栏占位的 inline 绑定同模式）。diff 约 +23/-8 行 |

### 缺陷 1 根因（与上轮「两种可能」的裁决）

上轮复判在「模拟器没吃新构建」与「calc 运行时不生效」之间无法裁决。本轮用运行时几何探针 + dist 实验钉死：**两者都发生过，根子是 IDE(2.02.2608040) 编译态翻车，calc 写法本身无罪**。证据链：

1. **缺陷现场复现（修复前运行时探针，WS element.offset/size 实测）**：模拟器 iPhone 12/13 Pro（statusBarHeight=47、windowWidth=390）上 `.hero` 高度恒 249.6px（=480rpx，**未**计入状态栏），而同文件同写法的 `.hero__txt` top=155.2px（=208rpx+47，状态栏补偿生效）——`.hero__sub` 底缘 230.5px 越过卡顶 216px，**裁切 14.5px 当场在线复现**（旧截图 chain-02b/06：card_top=209px、深色文字延伸到 y=207、gap=2px，与探针吻合）。
2. **排除词序假设**：把 dist wxss 的 calc 改成 var 在前（`calc(var(--statusbar,…)+480rpx)`）refresh 后整页**无样式**（非本缺陷形态）；再改成纯 `height:480rpx` → styled 恢复；再改回与源码相同的 value-first calc → **styled 且状态栏生效（hero=296px）**。同一表达式三种结果 ⇒ 词序不是机制。
3. **钉死编译缓存翻车**：往 dist wxml 注入标记元素后 refresh，标记出现在运行时 ⇒ refresh 确实重编译；但 06:50 全新构建（标记已不存在于 dist）连续两次 refresh 后标记仍在 ⇒ IDE 一直供给旧 bundle；`compile_wxml` 对**所有**页面（含正在正常渲染的 register/discover）统一报 10040「编译 .wxml 文件错误」⇒ 工程级编译上下文被毒化。`debug_clear_cache --action cleanCompileCache + cleanProjectFileListCache` 后 `compile_wxml` 立即 OK（$gwx 688687B），refresh 后新 bundle 装载（标记消失、hero=296.6）。

**修复取向**：CSS calc 保留（清缓存后验证可编译可生效），另加内联像素绑定作确定性保险丝——内联 style 由运行时 CSSOM 求值、不经过 wxss 编译器，即使编译态再翻车（此次事故类）或 calc 求值漂移（05:48–05:56 事故类），hero 骑压几何仍正确。实测运行中页面 `.hero` 的 style 属性即 `height: 296.6px;`（=480rpx 换算 249.6 + 状态栏 47）。

### 复验测量（模拟器 iPhone 12/13 Pro，378×814 截图 ≈0.969× CSS 像素）

| 项 | 修复前（chain-02b/06） | 修复后（fix-01/02/03b） | 判定 |
| --- | --- | --- | --- |
| 卡顶 y | 209px（=416rpx 旧几何） | 255px（≈CSS 263.6，=hero 296.6 − 64rpx 骑压） | 随状态栏下移 ✓ |
| 副标题文字墨迹底 | y=207（紧贴卡缘，gap=2px，被拦腰截断） | y=217（CSS 底 230.5），距卡缘 **38px**（CSS ≈33px） | 完整可见，无裁切 ✓ |
| 骑压重叠 | 32px（设计规范 §1.2/§4.3） | 33px（=64rpx×390/750，rpx 随宽缩放） | 保持设计规范 ✓ |
| 运行时几何（WS offset/size） | hero=249.6 / card.top=216 / sub.bottom=230.5（越卡顶 14.5px） | hero=296.6 / card.top=263.6 / sub.bottom=230.5（余量 33.1px） | ✓ |

新截图（均在 `reports/audit/2026-10-07-editpage-replace/screenshots/`，-fix 新文件名，未覆盖旧证据）：

- `fix-01-edit-top.png` — 编辑模式顶部：hero 标题组完整、副标题单行完整可见、白卡骑压区与规范一致；
- `fix-02-photo-instant-echo.png` — 真实上传（桥 tap `[aria-label="照片墙 3"]` 触发，`mockWxMethod` 仅 mock chooseImage，POST /v1/profile/photos 真实落库）**响应返回后立即**（起拍距响应 ≤0.6s，shot 用时 1.87s，满足 ≤3s）拍摄：照片墙第 3 格已渲染刚上传的图（DOM 槽位读数 `imgimgimg---`，服务端 GET /v1/profile/basic photoGallery=3，新增 `533e765e-3c3d-4a5e-9ef1-fafa56c125de.png`）；
- `fix-03b-edit-reentry.png` — 改 bio → tap 保存（PUT 持久化经 curl 独立会话证实 `bio="修复复验简介：第二轮 2026-10-06T23:06:22 写入"`）→ 自动 navigateBack 我的页（1s 内，route=pages/profile/index）→ 重进编辑模式：bio 新值回显 ✓、照片墙 3 张保持 ✓、几何同 fix-01 ✓。
  - 诚实说明：`fix-03-edit-reentry.png`（本轮早一步所拍）对应的那次保存 tap 落在仓库已知的 automator tap 不派发问题上（tap 返回 success 但 handler 未执行，diff 为空无 PUT 无导航），该图仅作中间态留档，正式证据以 `fix-03b` 为准。

### 缺陷 2 裁决：instantEcho=resolved（当轮修复在包内生效，无新增缺陷）

上轮 chain-04「上传后第二格仍空」未再复现：本轮走真实 UI tap 上传链路（onPhotoSlotTap → chooseImage(唯一 mock) → uploadPhotoFile → store.uploadPhotoAtIndex → POST /v1/profile/photos），store 响应返回后 0.5s 轮询即检出 photoGallery 2→3，截图与 DOM 读数（第 3 格即渲染 img+× 角标）一致。上轮工作区已落的 `stores/profile.ts` `uploadPhotoAtIndex` 整面权威同步修复（BasicProfileView 形态响应取 photoGallery[index]，杜绝 undefined 写槽）+ `tests/profile-store.spec.ts:254/277/291` 三条回归用例（本轮 test:unit 121 文件/1366 用例全绿覆盖）即为修复本体；chain-04 的旧截图属「截图早于异步渲染」而非现存 bug。

### 门禁（终版代码，跑批器实跑，node20 npm-cli）

- `typecheck` → EXIT=0（`tmp/qa/wf-fix-typecheck-r2.log`）
- `test:unit` → EXIT=0，Test Files 121 passed / Tests 1366 passed（`tmp/qa/wf-fix-test-unit-r2.log`）
- `build:mp-weixin:real:isolated` → EXIT=0（`tmp/qa/wf-fix-build-r2.log`；产物 mtime Oct 7 06:50）
- 中间态（heroStyle 落码前）另有一轮同样全绿：`wf-fix-typecheck.log` / `wf-fix-test-unit.log`（121/1366）/ `wf-fix-build.log`。

### 通道与 console

- 通道：`scripts/qa/ws-channel-up.mjs` 实跑 `WS_UP=ALREADY_UP port=9420` + `WS_UP_BAND=match`（应用内 require(config/env.js)=OK|real）exit=0；新构建装载自证：dist 已无的 `qa-refresh-marker` 标记在 refresh 后从运行时消失（前两轮 refresh 里它持续在场，即旧 bundle），且运行中 `.hero` 带内联 `height: 296.6px;`（源码 heroStyle 产物）。
- console：修复复验腿全程监听（管道自测 CONSOLE_PIPE=OK），产品级 error=0、EXCEPTION=0（`tmp/qa/console-fix.log`，仅 info 级 preloadSubpackages 与管道标记）；保存闭环腿同样 0 error（`tmp/qa/console-save.log`）。
- 环境现态：`project.private.config.json`（urlCheck=false）在 real 产物目录在位（隔离构建不清除它）；IDE 窗口与 9420/9430 通道保持存活未关；UI 租约由各腿退出时释放。

### 本轮新增的遗留问题（如实记录）

1. **IDE 编译缓存可被「构建落盘 × 模拟器刷新」的时序毒化**：症状为 refresh 名义成功但持续供给旧 bundle / 全页无样式 / compile_wxml 全文件 10040。解法已验证：`debug_clear_cache --action cleanCompileCache` + `cleanProjectFileListCache` 后 refresh。建议后续腿在「refresh 后几何与 dist 预期不符」时先走这条，再怀疑代码。
2. dist 实验期间注入的 `qa-refresh-marker` 与临时 wxss 改动已被 06:50 终版门禁构建整体再生覆盖，产物与源码一致（marker 计数=0）。

---

## 附：截图总清单（相对 `reports/audit/2026-10-07-editpage-replace/screenshots/`）

编译与页面（4）：`step-01-login-page.png`、`step-02-register-wizard-profile.png`、`step-03-edit-mode-profile.png`、`step-04-tab-mine.png`
全链路（7）：`chain-01-mine-logged-in.png`、`chain-02-edit-entry.png`、`chain-02b-edit-top.png`、`chain-03-edit-bottom.png`、`chain-04-photo-uploaded.png`、`chain-05-after-save-mine.png`、`chain-06-edit-reentry.png`
管理后台（10）：`admin-00-login-page.png`、`admin-01-dashboard.png`、`admin-02-media-queue.png`、`admin-02b-preview-modal.png`、`admin-03-audit-modal.png`、`admin-03b-after-approve.png`、`admin-03c-approved-list.png`、`admin-04-user-detail.png`、`admin-05-vip-bills.png`、`admin-06-wallets.png`
固定名关键证据（4，本轮由对应截图复制生成）：`01-编辑模式整页.png`（←chain-02b-edit-top.png）、`02-上传照片.png`（←chain-04-photo-uploaded.png）、`03-保存后回显.png`（←chain-06-edit-reentry.png）、`04-后台媒体审核通过.png`（←admin-03c-approved-list.png）——**四张全部在位，无缺**。
第二轮修复复验（3）：`fix-01-edit-top.png`、`fix-02-photo-instant-echo.png`、`fix-03b-edit-reentry.png`（另有中间态留档 `fix-03-edit-reentry.png`，见「回归补验（第二轮）」诚实说明）
