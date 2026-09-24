# R1 需求与功能目标对照 · pages/login/index（登录页）

- 审查员：A4 需求对照员（与视觉审查员分文件；视觉线结论见 `../findings/PAGES-LOGIN-INDEX.json` 101–105）
- 轮次：R1 · gitSha aefd8a72（exec-results.json `updatedAt=2026-09-23T12:00:00.115Z`）
- 理想图：`素材/理想效果图/登录页.png`（任务锚定主参考；实测为 1200×1200 纯插画主视觉稿，无 UI 文字层）＋ `素材/理想效果图/登录页面.png`（整页 UI 变体：Logo→hero 插画→slogan→三按钮→协议行，作为逐元素对照依据）
- 实拍证据：`reports/screenshots/round-1-interact/PAGES-LOGIN-INDEX-LG01-after.png`（154098B，无 token 冷启动默认态）、`00-base.png`/`05-after.png`（同状态低清重拍）、`LG16-after.png`（手机号登录点击后）
- 执行结果：`reports/audit/round-1/interact/exec-results.json` manifest=PAGES-LOGIN-INDEX 共 34 例（EXECUTED 25 / FAILED 9）
- 源码：`apps/client/src/pages/login/index.vue`（1501 行）

## 一、功能目标逐条对照（target → current/gap/fix）

| # | target（任务给定） | current（代码+执行证据） | gap/fix |
|---|---|---|---|
| 1 | 校园情侣插画 hero 占上部主体 | `index.vue:648-656` 纯插画容器 520rpx + `aspectFill`，资源 `static/assets/images/posters/login-illustration.jpg`（60874B，实测存在）；LG01 实拍插画正常渲染，上下缘渐隐过渡（:968-989）消除断层 | 无 gap |
| 2 | Logo「寻觅」+ slogan | 品牌区 `index.vue:638-646`：寻觅 + 嫩芽 SVG（`ICONS_V2.SPROUT`）+ 副标「遇见同频的人」；slogan 区 ：658-664 三行「遇见同频的人 / 慢慢成为特别的人 / 校园里的每一次相遇都有美好记录」，与《登录页面.png》逐字一致（i18n zh-CN.ts:2153-2157） | 无 gap |
| 3 | 漂浮爱心 | 理想两稿中漂浮元素均为插画内落叶/花瓣（非独立 UI 层）；运行态插画与实拍中可见漂浮落叶。无独立动画层，属视觉细节 | 记录不立项（视觉线范畴） |
| 4 | CTA 微信一键登录（绿主钮） | `index.vue:674-690` `.btn-primary` `var(--c-brand)` + 自绘微信绿气泡 SVG（:687）；点击走 `sessionStore.loginWithWechat()`（:300）→ `services/auth.ts:224`。LG01 dom present；LG13 失败 toast+停留+loading 解除 EXECUTED；LG14 防连点×5 仅 1 次提交 EXECUTED。成功路径本轮环境不可证（mock 后端 502 WechatLoginError，LG12 toast「微信服务暂时不可用」）——需真实微信凭证环境，代码链路完整 | 成功路径证据受环境限制，非功能缺失；建议真机补验 |
| 5 | CTA 手机号登录（次钮） | 微信端为 `open-type="getPhoneNumber"` 快捷授权钮（`index.vue:693-705`，文案「手机号登录」zh-CN.ts:2196）；验证码/密码表单仅在授权拒绝/404/401 回调后自动展开（:349/:387/:396）；手动表单入口已于 R11 按用户要求删除（注释 ：707-710），仅非微信端保留（:711-723）。**本轮表单链路零正向执行证据**：LG15/16 点击后实拍无状态变化（LG16-after=默认态），LG11/22/23-29/31 全部 FAILED（`element not found: #login-phone/.form-btns .btn-primary`——用例缺 logout 前置，已登录态自动前进 discover） | **→ Issue MP-R1-PAGES-LOGIN-INDEX-201（Function P2）** |
| 6 | CTA 临时看看/先逛逛 | 「稍后再看」（zh-CN.ts:2162）guest-login 链路：LG17 成功 toast「已进入体验模式，先逛逛吧」+1500ms 落 discover EXECUTED；LG18 防连点×5 EXECUTED；LG04 消费 pendingLoginRedirect 落资料完善页 EXECUTED | 无 gap |
| 7 | 协议勾选（年满18+用户协议/隐私政策） | 勾选切换 LG06 EXECUTED（默认勾选=理想图绿勾态，index.vue:58-59）；《用户协议》/《隐私政策》链接 LG07/08 EXECUTED，legal 分包已注册（pages.json `subpackages/legal` → privacy/index + agreement/index，文件实测存在），跳转经 `openLegalPage`→`openAppPath`（:609-622，navigation.ts:53）。「年满 18」不在登录行文案——由注册出生日期校验（:50-51/:812-822，后端 403 MINOR_NOT_ALLOWED :464-467）与《用户协议》正文第 2 条（zh-CN.ts:4637「您须年满 18 周岁」）承担；理想图协议行同样无 18+ 字样 | 18+ 表述缺口视觉线已立 105，不重复立项 |
| 8 | 协议未勾选拦截 | 三个入口均有 `!agreed` 守卫（:283-286/:413-416/:494-497）；LG10 未勾选点「稍后再看」toast「请先阅读并同意用户协议」EXECUTED。LG09（微信钮）pre-FAIL 未成功取消勾选、实际走了已勾选请求——该路径拦截未直接证实，由代码+LG10 同型守卫佐证 | 证据局限，记录不立项 |
| 9 | 无底部导航 | pages.json tabBar 仅 home/nearby/discover/messages/profile，login 非 tab（实测 grep）；LG01/00-base 实拍无 tabBar | 无 gap |
| 10 | 未登录态用价值说明不用「禁止访问」 | 未登录可完整看到价值文案 + 三入口，「稍后再看」可无门槛进入；无任何访问拦截文案 | 无 gap |
| 11 | 附加：已登录自动前进 | onShow（:96-99）+ watch（:120-134）单次导航去重；LG02/03（含重复进出）EXECUTED 落 discover | 无 gap |
| 12 | 附加：B6 登录/注册开关 | 关闭横幅+卡片禁用+兜底 toast（:669-672/:1107-1136）；LG33/34 EXECUTED | 无 gap |
| 13 | 附加：dev/showcase 入口 | 仅 dev/mock（:69）/VITE_SHOWCASE_MODE 构建渲染，生产隐藏；LG01 截图 DEV 行即此（测试构建）；LG21 showcase 用例 FAILED 属条件用例（非 showcase 构建不渲染），非缺陷 | 不立项 |

## 二、R13「01/05/16 三图相同」复核

本轮实测（md5）：`01-after e483d33c…(183805B)`、`05-after a85bdc83…(34780B)`、`16-after cc7ea739…(103587B)` 三图互不相同——R13「三图相同」判定在 round-1-interact 现存文件上不成立。但 00-base 与 05-after 为同默认态低清重拍（≈34KB），且**全部现存登录页实拍中不存在「表单展开态」画面**，表单链路证据缺口与视觉线 101（巡检状态缺失）相互印证。

## 三、PageCompare 详情

### structureNotes（L1–L10）
- **L1 页面级**：竖屏单页，骨架 品牌→插画→slogan→CTA→协议行 自上而下与《登录页面.png》一致；无底部导航；状态栏+胶囊留白正常。达标。
- **L2 区块级**：五区块齐全；另有两个条件区块（B6 关闭横幅、dev/showcase 入口——生产隐藏，不构成偏差）。
- **L3 元素级**：寻觅+嫩芽 SVG、微信绿气泡 SVG、三按钮文案/层级（绿主钮/白次钮/灰弱钮）、圆形绿勾 checkbox、绿色协议链接，逐元素与理想变体一致（zh-CN.ts:2153-2208）。
- **L4 布局关系**：内容顺序 hero→CTA→协议行 与任务给定一致；协议行位于按钮区卡内 `margin-top` 拉开（:1366-1375）。L1–L4 无偏差。
- **L5 字型层级**：slogan 40rpx/800 主句 + 30rpx/700 绿副句 + 灰说明（:1050-1077），层级对应理想图。
- **L6 色彩**：主钮/勾选/链接走 `var(--c-brand)`；实拍 #36C99A 与 v3.1 冻结 #34C98A 的偏差视觉线已立 103，此处不重复。
- **L7 圆角/阴影**：全宽胶囊钮 `--r-xl` + `--s-float-btn`，与理想图一致。
- **L8 间距**：`--sp-*` 栅格；协议行与按钮区间距 `--sp-5`。
- **L9 动效**：press-feedback 按压态/H5 active 缩放；理想图为静态稿无动效约束；漂浮爱心为插画内元素非独立层（见上表 #3）。
- **L10 状态**：关闭态（横幅+禁用）、按钮 loading（loginFlowActive，MP-R2-…-007 修复后真绑定）、错误 toast、表单展开态、注册模式——代码齐备；关闭态/默认态/错误态有执行证据，**表单展开态无任何执行/实拍证据**（→201）。

### usageNotes（理想 vs 实际操作路径）
- 核心任务「进入小程序」三路均通：微信一键登录（环境内失败但有明确文案+停留）、稍后再看 1 步落 discover（LG17 实证，30.5s 含 1500ms toast 停留）、已登录自动前进（LG02/03）。不迷路；登录后落 discover（tab），任意后续页 2 步内可回 tab 体系。
- 挫点①：手机号表单登录在微信端无直接入口，需「点手机号登录→授权拒绝/失败」才展开表单（R11 用户决定的交互）；DevTools/自动化下 getPhoneNumber 回调不触发 → 该钮在测试环境是死点，表单链路 15 例自动化全 FAILED（→201）。
- 挫点②：「去注册」入口藏在表单视图内，快捷视图不可见——与理想图（无注册入口）一致，且新用户主路径为独立注册页（REG02 EXECUTED：login→register 栈深 2），不算缺陷。
- LockScreen 引流链路：pendingLoginRedirect 消费后落资料完善页（LG04 EXECUTED），闭环成立。

### functionGaps
1. target：手机号验证码/密码登录链路可达且可验证；current：微信端唯一入口为 getPhoneNumber 回调失败分支，R1 自动化 15 例全 FAILED、LG16 实拍点击后无状态变化，整链路（表单展开/输入校验/登录成败/注册入口）零正向证据；gap：链路可达性在实机与自动化下均未证实；fix：微信端快捷视图补低调「验证码登录」文字兜底入口或支持 mock 授权回调；自动化表单用例补 logout 前置后重跑。

### verdict
**基本达标** —— L1–L4 结构、三 CTA、协议行、价值说明、无底部导航全部达标且主路径有强执行证据；唯一缺口为手机号表单链路的可达性证据（P2 Function，→201）。
