# R1 需求对照 · pages/register/index（注册页）

- 审查角色：A4 需求对照员（与视觉审查员分文件；本页视觉结论见 `findings/PAGES-REGISTER-INDEX.json`（013/014），本文件只做「需求/功能目标 → 实现 → 验证证据」对照）
- 审查日期：2026-09-24（R1，git aefd8a72 工作区含未提交改动）
- 源码：`apps/client/src/pages/register/index.vue`（1256 行）、承接页 `apps/client/src/pages/register/success.vue`
- 执行证据：`reports/audit/round-1/interact/exec-results.json`（PAGES-REGISTER-INDEX 共 32 条：REG01–REG32，30 EXECUTED / 2 FAILED）；操作截图 `reports/screenshots/round-1-interact/PAGES-REGISTER-INDEX-*`（98 个文件）
- 需求基准：
  - `素材/寻觅注册页-素材_assets/b5163cb0-*.jpg`（主视觉构成：顶部插画 + 氛围背景 + 装饰；R13 判定：本页无整页理想稿，实拍留档）
  - `素材/注册/个人资料填写/流程/DEV_PAGE_MAP.md` 与 `01-注册登录/DEV_PAGE_MAP-流程基准.md`（同文：20 页面全集、实名必须阻塞核心入口、学生/人脸可跳过）
  - `素材/注册/个人资料填写/01-注册登录/参考-注册页面.png`（引导页 + 8 步资料填写流程图：基础资料 1/8 → 实名认证 2/8(必选) → 实名成功 → 学生认证(可选) → 人脸认证(可选) → 兴趣偏好 7/8 → 恋爱名片 8/8）
  - `git show 29a2b1df:docs/design/v3.1-contract.md` §14（注册阶段兴趣引导可跳过；主动进入必须 ≥3）

---

## 1. 功能目标（target）清单与逐条核对

| # | target（应该具备） | current（代码/执行证据） | 结论 |
|---|---|---|---|
| T1 | 账号创建四要素：手机号 + 短信验证码 + 密码 + 协议（默认不勾选） | `index.vue:46-55`（四态 + 协议不预选）、`:151-166`（数字过滤/3-4-4 格式化/6 位截断）、`:733-748`（协议行，链接不改勾选 `:443-450`）；REG01（渲染+协议未勾）、REG06（协议链接跳分包且不改勾选）真实通过 | ✅ 代码完整，部分有正向执行证据 |
| T2 | 密码策略与强度反馈（8–20 位、字母+数字、三档强度条、明密文切换） | `index.vue:200-207`（validatePassword 文案表）、`:112-135`（强度 0-3 + CSS 变量色）、`:585-607`（眼睛切换/强度条）；但 REG12 执行中 `.strength:absent`（密码未真正输入成功） | ⚠️ 代码完整，交互未证实（→Issue 201） |
| T3 | 未成年人保护：出生日期必填 + 满 18 预检（客户端 + 后端 AgePolicy） | `index.vue:52-53,103-109,221-222`（picker end=今天、isAdult、首错文案「未满 18 岁暂无法注册」）、`:390-395`（后端拒绝映射）；REG21 仅触发 picker(2009-01-01) 后提交即被「手机号格式」拦截，18 岁分支未到达 | ⚠️ 代码完整，预检分支未证实（→Issue 201） |
| T4 | 昵称 1–20 字（后端契约必填） | `index.vue:50,219-220,408-412`；REG14 输入目标错配到手机号字段（`.field__input` 首匹配），昵称分支未证实 | ⚠️ 代码完整，交互未证实（→Issue 201） |
| T5 | 验证码：发送成功提示 + 60s 倒计时 + 重发防抖 + 切后台时钟补偿 | `index.vue:255-288`（时间戳基准）、`:295-302`（onShow 回前台刷新）、`:272`（mockCode 提示）；REG17/REG18 的 toast 均为「请先输入正确的手机号」——合法手机号发送成功与倒计时两条场景本轮均未到达 | ⚠️ 代码完整，正向链路零证据（→Issue 201） |
| T6 | 已注册手机号：行内错误 +「用这个手机号登录」次级出口 | `index.vue:77-78,160,377-382,727-729`；REG26 前置输入失败（`pre-FAIL:input el.input is not a function`）ghost 按钮未出现，REG27 FAILED（元素不存在可点） | ⚠️ 代码完整，出口未证实（→Issue 201） |
| T7 | 返回登录双落点（栈深 navigateBack / 栈底 reLaunch）+ 底部「去登录」 | `index.vue:434-441,755-758`；REG05 真实通过（route 落 `pages/login/index`）；REG04/REG30 点 `hero__back` 后 route 快照仍停留本页、dom 读数 `hero__back:absent`（automator 抖动），返回按钮场景未取到落点证据；REG03 FAILED（脚本先 navigateBack 再 tap 顺序错误） | ⚠️ 「去登录」✅；「返回按钮」未证实（→Issue 201） |
| T8 | B6 注册开关兜底（register_open=false → 提示 + 800ms 退回登录） | `index.vue:38-39,303-312,330-334` + `stores/app-config.ts:37` + `services/api.ts:272`；REG28 仅 observe-only：无开关注入、无 toast、route 未变——B6 分支本轮完全未执行 | ⚠️ 代码完整，分支未执行（→Issue 201） |
| T9 | 防重复提交（提交期 + toast 窗口不响应） | `index.vue:89,328-329,453`（createButtonGuard 2000ms）；REG24 空表单快击只得「请输入手机号」单 toast，与守卫行为一致但「只提交 1 次」需合法表单方能成立，未证实 | ⚠️ 代码完整，未证实（→Issue 201） |
| T10 | 注册成功：签发 JWT 自动登录 → redirectTo 注册成功页 → 衔接完善资料向导 | `index.vue:348-360`（Promise.all + refreshSession + redirectTo REGISTER_SUCCESS）、`services/auth.ts:337`（registerUser）、`success.vue:39-47`（→ SETUP_PROGRESS.PROFILE / 逛首页）；REG25 toast=「手机号格式不正确」且 route 停留本页、after 截图 automator 超时——**核心成功链路本轮零正向证据**；服务层单测亦无（`tests/services/auth.spec.ts` grep register 0 命中） | ❌ 代码完整但验收证据缺失（→Issue 201，P1） |
| T11 | 实名认证必须，阻塞核心产品入口（流程基准） | 实现为「浏览自由、互动门槛」：`guards/campus-gate.ts:33-40,72-97`（ensureCertified("realname") 拦截 + 引导弹窗跳 `/subpackages/profile-extra/verification/real-name`），挂点：发现页喜欢/超喜欢（`pages/discover/index.vue:144,150`）、他人主页 CTA（`profile/other.vue:236,247`）、圈子帖子（`circles/topic-detail.vue:110`）、村庄（`village/index.vue:387`）；实名页本身存在（`real-name.vue`：姓名/身份证/正反面→审核→idCardVerified）。注意 `campus-gate.ts:34` mock 模式恒通过（演示约定） | ✅ 语义以懒门控达成（架构拍板，campus-gate.ts:10-16）；衍生矛盾见 Issue 203 |
| T12 | 学生认证可选可跳过 | `subpackages/campus/campus/certification.vue` + `verification/index.vue`（学生证上传→审核）；向导分支：`components/setup/SetupProgress.vue:41,75-81`（非学生 3 步跳过校园步骤） | ✅ |
| T13 | 人脸认证可选可跳过（流程基准 06） | **全链路缺失**：`apps/client/src` 与 `apps/api/src` grep「人脸/faceVerify/face-verify/FACE」均 0 命中；认证中心仅学生证认证；素材 `素材/注册/个人资料填写/06-人脸认证/` 有完整稿（真人认证 6/8、拍摄指引 06-1、认证成功 06-2） | ❌ 功能缺失（→Issue 202，P2） |
| T14 | 注册阶段兴趣可跳过（v3.1 §14）；主动进入必须 ≥3 | 注册链路（register→success→setup 向导）不强制兴趣；`subpackages/setup/interest/index.vue:3,36-39`（主动进入 <3 拦截保存） | ✅ |
| T15 | 主视觉：顶部插画（reg-hero）+ 氛围背景（reg-bg fa78925c）+ 装饰（reg-decor 700fa92a） | reg-hero ✅：`IMAGE_PATHS.REGISTER.HERO`（`config/images.ts:626-630`）→ `static/assets/images/register/reg-hero-illustration.jpg`（实看 = b5163cb0 同图，750×480）；**reg-bg / reg-decor 未落地**：注册素材四图中仅 b5163cb0（hero）与 69340cfc（cheer，用于 success 页）被引用，fa78925c（氛围长图）、700fa92a（3D 爱心装饰组）零引用，页面底色为平铺 `--c-bg-page #eef7f2`（`index.vue:767-771`） | ⚠️ 视觉层缺失，归视觉线本页档案（013/014 未覆盖此项，特此留痕） |
| T16 | 步骤式资料填写 + CTA「下一步」（素材 b5163cb0 内容顺序） | 实现为单表单一次性注册（CTA「注 册」，`index.vue:723`），步骤式移至注册后向导（SetupProgress 全量 5 步/学生 4 步/非学生 3 步）；`index.vue:2-19` 头注记载契约拍板（方案 B：后端要求 nickname/birthDate 注册期必填，07 契约对齐变体合并实现） | ⚠️ 有拍板记录的信息架构偏差（→Issue 204，保留） |

---

## 2. PageCompare

### route / baseline
- route：`pages/register/index`
- baseline：`素材/寻觅注册页-素材_assets/b5163cb0-*.jpg`（主视觉构成，R13：无整页理想稿）+ `素材/注册/个人资料填写/流程/DEV_PAGE_MAP.md` + `01-注册登录/DEV_PAGE_MAP-流程基准.md` + `01-注册登录/参考-注册页面.png`（8 步流程基准）+ v3.1-contract §14

### structureNotes（L1–L10）
- **L1 页面级**：构成 = 顶部插画 Hero（480rpx 全出血 + 底部渐隐）→ 表单卡骑压（-64rpx）→ 协议行 → 安全说明 → 去登录出口。与 b5163cb0 主视觉构成（插画在上、内容在下）同构；与参考-注册页面.png 的「引导页 + 分步卡」形态不同（见 L2 与 Issue 204）。
- **L2 区块级**：账号信息（手机号/验证码/密码/确认）+ 基础身份（昵称/出生日期）双分组卡片 `index.vue:476-712`；参考流程的「基础资料 1/8」（头像/性别/学校/年级/所在地）不在本页——由注册成功页 → `subpackages/setup/profile/index` 向导承接（success.vue:39-42），分组顺序符合「先账号后身份」。
- **L3 元素级**：表单图标 14 枚走本地 SVG（`config/images.ts:636-661`，固定 /static 防弱网空白）；主视觉 reg-hero=b5163cb0 同图落地 ✅；氛围背景 reg-bg（fa78925c）与装饰 reg-decor（700fa92a）未落地、页面为平铺底色（T15，视觉线未立项，此处留痕交修复轮裁决）。
- **L4 布局关系**：卡片骑压插画 64rpx、字段高 96rpx/圆角 24rpx、按钮 96rpx（`index.vue:856-911,1084-1095`），与设计稿 375×812（rpx=px×2）注释一致；返回按钮与标题组做 `--statusbar` 动态补偿（:26,42,803,827，修复号 MP-R2-…-002）。
- **L5 字型层级**：hero__title 52rpx/800 → 卡片标题 24rpx/700 → 字段 30rpx/500 → 错误 24rpx/500 → 说明 21rpx，层级完整（:833-853,874,931,994,1200）。
- **L6 色彩**：全部走 CSS 变量（--c-brand #36C99A 系、错误 #E5454D、警告 #F59E0B），修复号 MP-R2-…-005 弃硬编码 hex；与 v3.1 冻结 Primary #34C98A 存在既知 token 偏差（归视觉线/token 裁决链，本文件不重复立项）。
- **L7 组件规范**：验证码胶囊钮 64rpx/999rpx 三态（idle/sending/countdown/disabled，:1001-1050）；协议勾选 32rpx 圆角 8rpx；强度条 3×64rpx。
- **L8 间距栅格**：页边 40rpx、卡内 40rpx、字段间距 24rpx（:856-902）。
- **L9 动效**：press-feedback 按压、shake-x 错误抖动 0.28s×2（含协议抖动强制重启动画的 30ms 摘挂技巧 :227-248）、spin 加载；无越权动效。
- **L10 状态**：聚焦/错误/抖动/加载/禁用/已注册出口/B6 关闭态在代码层齐备且互斥处理；但**错误态、倒计时态、成功跳转态、已注册出口、B6 态均无有效执行证据**（详见 §3 执行审读：表单内容类用例的输入驱动全部失败）。

### usageNotes（理想 vs 实际操作路径）
- 核心任务「创建账号并进入产品」：按代码路径完整可达（注册 → redirectTo 成功页 → 完善资料向导 1 步 / 逛首页 1 步；向导与首页均属 tab/向导体系，任意页 2 步内回 tab 不迷路）。注册页本身返回出口双保险（返回按钮 + 底部去登录），REG05 已证「去登录」落点。
- 迷路风险点：无。本页为单页表单，无层级分叉；协议/隐私为分包只读页（REG06 证返回链路完好）。
- 挫点（按严重度）：① 「注册成功」这一步在 R1 自动化中从未真正走通（REG25 实际被手机号校验拦截），核心漏斗零正向证据（→Issue 201）；② 注册成功页宣称「可开始匹配…已解锁」与真实模式实名门控相悖，用户按文案操作会被弹窗拦截（→Issue 203）；③ 人脸认证无承载页，「可选跳过」无从谈起（→Issue 202）；④ 取证环境噪音：编号截图 `PAGES-REGISTER-INDEX-01-after.png` 中出现「获取手机号失败」系统弹窗——本页代码无 getPhoneNumber 调用（grep 0 命中），为 DevTools 账号态/会话守卫所致，非页面缺陷。

### functionGaps
见 JSON pageCompares[0].functionGaps（4 条：核心链路可验证性 / 人脸认证 / 实名承诺一致性 / 步骤式形态）。

### verdict
**基本达标** —— 功能面：target 16 项中 12 项代码完整且部分有正向证据（T1/T7 部分/T11/T12/T14 等），人脸认证缺失（T13）；证据面：32 条交互用例仅约 10 条观测与标题自洽，核心成功链路（T10）零正向证据且有 20 条 EXECUTED 与观测矛盾。不给「达标」因 T10/T13；不给「不达标」因无任何证据表明已实现功能损坏，代码防御与契约对齐完整。

---

## 3. 执行结果逐条审读（REG01–REG32）

根因：mini-program automator 的文本输入驱动在本套件全程失效——`el.input is not a function`（REG24/26 pre-FAIL）、`__CAND__` 占位未替换（REG08/11/32）、选择器首匹配错配（`.field__input` 恒为手机号框、`.agree__link` 恒为用户协议），后段截图 automator 超时（REG25/26 after.png ERROR:timeout）。凡需「往表单里填内容」的用例均未到达其标题场景，却被标 EXECUTED。

| 用例 | 状态 | 观测要点 | 与标题是否自洽 |
|---|---|---|---|
| REG01 冷启动渲染+协议不勾 | EXECUTED | top=register；REG01-after.png 全量渲染、协议未勾 | ✅ |
| REG02 登录页去注册入口 | EXECUTED | route login→register | ✅ |
| REG03 栈深返回按钮 | **FAILED** | 脚本先 `navigateBack delta1` 再 `tap .hero__back`（页面已出栈故元素不存在）；产品代码 `:463,:434-441` 存在 | ❌ 驱动脚本顺序错误，非产品缺陷 |
| REG04 直开点返回→reLaunch 登录 | EXECUTED | dom `hero__back:absent`，tap 后 route 仍 register | ⚠️ 落点未取到证据（automator 抖动窗） |
| REG05 底部去登录 | EXECUTED | route 落 `pages/login/index` | ✅ |
| REG06 协议链接不改勾选 | EXECUTED | route register→legal/agreement | ✅ |
| REG07 隐私政策链接 | EXECUTED | tap 的仍是 `.agree__link` 首匹配（用户协议），route 未变 | ❌ 标题场景未发生 |
| REG08 手机号 3-4-4 格式化 | EXECUTED | `act-FAIL:inputSeq(__CAND__) element not found` | ❌ 未输入成功 |
| REG09 超长截断 11 位 | EXECUTED | input 无值断言 | ⚠️ 无效证据 |
| REG10 清空按钮 | EXECUTED | pre:input 无效则按钮本就不在，tap 无从谈起 | ⚠️ 歧义证据 |
| REG11 验证码过滤截断 | EXECUTED | `__CAND__` 占位 | ❌ 未输入成功 |
| REG12 强度条三档+明密文 | EXECUTED | 输入密码后 `.strength:absent`（强度条未出现=密码未进状态） | ❌ 标题场景未发生 |
| REG13 确认密码不一致行内错 | EXECUTED | 目标错配（`.field__input`=手机号框），`field--error:absent` | ❌ |
| REG14 昵称 emoji/截断 | EXECUTED | emoji 输入进 number 键盘手机号框 | ❌ |
| REG15 生日 picker 回显 | EXECUTED | `trigger change {value:2008-06-01}` 回显成功 | ✅ |
| REG16 无效手机号点获取验证码 | EXECUTED | toast「请先输入正确的手机号」 | ✅（无效分支与标题一致） |
| REG17 合法手机号发送+60s 倒计时 | EXECUTED | toast 同上=合法分支未到达 | ❌ 标题场景未发生 |
| REG18 倒计时防重发 | EXECUTED | 倒计时从未启动 | ❌ |
| REG19 空表单首错定位 | EXECUTED | toast=「手机号格式不正确」（空手机号应为「请输入手机号」，说明有残留输入） | ⚠️ 首错定位到 phone ✅，文案分支错位 |
| REG20 验证码/密码非法组合 | EXECUTED | toast=手机号格式（组合未到达） | ❌ |
| REG21 未成年生日拦截 | EXECUTED | picker 触发成功，但提交先被手机号拦，18 岁预检未到达 | ❌ |
| REG22 未勾协议抖动拦截 | EXECUTED | toast=手机号格式，协议分支未到达 | ❌ |
| REG23 协议勾选切换 | EXECUTED | 双 tap，无勾选态断言 | ⚠️ 弱证据 |
| REG24 主按钮快击×5 | EXECUTED | `pre-FAIL:input el.input is not a function`，单 toast「请输入手机号」与守卫一致但网络侧「仅 1 次」不可证 | ⚠️ |
| REG25 **合法注册→JWT→成功页** | EXECUTED | toast=「手机号格式不正确」、route 停留、after 截图超时 | ❌ **核心链路未走通** |
| REG26 已注册出口出现 | EXECUTED | `pre-FAIL:input el.input is not a function`，ghost-btn:absent | ❌ |
| REG27 次级出口返回登录 | **FAILED** | 前置态未建立故 ghost-btn 不存在可点 | ❌ 驱动前置失败，非产品缺陷 |
| REG28 B6 关闭兜底 | EXECUTED | observe-only：无开关注入、无 toast、route 未变 | ❌ B6 分支未执行 |
| REG29 滚动可达 | EXECUTED | safety-note/to-login present | ✅ |
| REG30 打开即返回 | EXECUTED | dom `hero__back:absent`，route 未变 | ⚠️ 同 REG04 |
| REG31 重复进出状态复位 | EXECUTED | navError 噪音，落登录 | ⚠️ 弱证据 |
| REG32 热区测量 | EXECUTED | hero__back/field__eye/agree__chk present | ✅ |

**小结**：自洽 ✅ 9 条（REG01/02/05/06/15/16/29/32 + REG19 部分）、歧义 ⚠️ 8 条、与标题不符 ❌ 15 条（含 2 FAILED）。修复方向：automator 对 `input` 元素改用元素句柄 `.input(value)` 的可用替代（`trigger input {value}` 与 picker 同法）或 per-field class 选择器（`.field__input--confirm`、昵称/验证码独立 class、`.agree__link:last-child`），并给 REG28 注入 `register_open=false` 开关前置。

---

## 4. Issue 汇总（详见 findings/PAGES-REGISTER-INDEX-req.json）

| ID | category | severity | 一句话 | status |
|---|---|---|---|---|
| MP-R1-PAGES-REGISTER-INDEX-201 | Function | P1 | 注册套件 20/32 观测与标题不符（伪 EXECUTED），核心成功链路（合法注册→JWT→redirectTo 成功页）零正向证据；服务层亦无单测兜底 | 待修复 |
| MP-R1-PAGES-REGISTER-INDEX-202 | Function | P2 | 人脸认证（流程基准 06，可选）全链路缺失：client/api 0 命中、认证中心仅学生证、素材稿无承载页 | 待修复 |
| MP-R1-PAGES-REGISTER-INDEX-203 | Consistency | P3 | 注册成功页「可开始匹配、加兴趣圈、发消息｜已解锁」与真实模式实名门控矛盾（campus-gate 会在首次互动时拦截） | 待修复 |
| MP-R1-PAGES-REGISTER-INDEX-204 | Consistency | P3 | 「步骤式资料填写 + CTA 下一步」实现为单表单 + CTA 注册；步骤式移至注册后向导，有 2026-09-12 设计包拍板记录（index.vue 头注 §10 方案 B） | 保留 |
