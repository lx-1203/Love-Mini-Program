# R1 · 需求对照 · pages/register/success（注册成功页）

- 审查员：A4 需求对照员（与视觉审查员分文件；交互取证判定见 `reports/audit/round-1/interact/PAGES-REGISTER-SUCCESS-judge.json`，其已立 MP-R1-PAGES-REGISTER-SUCCESS-004/005，本报告不重复立项）
- 基线：`素材/寻觅注册页-素材_assets/69340cfc-miora_text_to_image-1789186341708-0-8c365c88ce83.jpg`（reg-success 主视觉，唯一页面级对照依据）+ `素材/注册/个人资料填写/01-注册登录/DEV_PAGE_MAP-流程基准.md`（实名规则/解锁点）+ `reports/audit/baseline/ideal-baseline.md:83`（「注册成功插图 + 引导进入主流程；成功页即解锁点」）
- 源码：`apps/client/src/pages/register/success.vue`（193 行）； findings：`reports/audit/round-1/findings/PAGES-REGISTER-SUCCESS-req.json`

## 1. 应该具备什么功能（target）

| # | target（依据） | current（读码+执行证据） | gap | fix |
|---|---|---|---|---|
| T1 | 注册成功主视觉=寻觅芽欢呼插图（ask；理想素材 69340cfc） | `IMAGE_PATHS.REGISTER.SUCCESS` → `static/assets/images/register/reg-success-illustration.jpg`（images.ts:628；实测 12876B，600×600）；目视比对与理想素材同图源（同欢呼姿势/漂浮爱心/薄荷底） | 无 | — |
| T2 | 内容顺序：插图→引导文案→进入主流程按钮（ask） | success.vue:52-74：插图(472rpx)→标题「注册成功」→两行引导文案→解锁清单卡(3行)→主 CTA→次级出口；顺序一致，清单卡为设计包 05 成功屏插入层级（success.vue:79 注释「设计稿 05 成功屏」），不破坏顺序 | 无 | — |
| T3 | 主 CTA 进入主流程（DEV_PAGE_MAP 流程：注册→基础资料→…） | `goSetupProfile()` → `uni.navigateTo(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE)`（success.vue:40-42；routes.ts:233-234）；interaction-matrix OP2 实测 tap 后 route=subpackages/setup/profile/index、栈深 1→2（interaction-matrix.md:377「✅ 符合」） | 无 | — |
| T4 | CTA：进入首页（ask 字面） | 主 CTA=完善资料（T3）；首页为次级出口「稍后再说，先随便逛逛」`uni.switchTab(ROUTES.TAB.HOME)`（success.vue:45-47），1 跳可达。OP4 实测 tap ok、分时采样 +1s route=pages/home/index（interaction-matrix.md:379）；RS08-after 截图终态=home（judge 仲裁②：RS06 的 FAILED 系 automator 执行失败，非死按钮） | 功能无缺失；与 ask 字面存在「主次倒挂」（主=向导、次=首页），但与 ideal-baseline.md:83「引导进入主流程」一致 | 无必改项；主次取向建议产品确认留档（不计缺陷） |
| T5 | 成功页即解锁点：立即解锁首页/附近/匹配/消息（DEV_PAGE_MAP-流程基准.md:26「实名必须，阻塞核心入口」、:31「实名成功立即允许进入首页/附近/匹配/消息」；ask 页面目标） | 首页/附近/匹配可达（page-access.ts discover requiresAuth:false 等，无门槛）；**消息 Tab（/pages/messages/index）与村口/讨论圈被锁**：profile-guard.ts:14-20 LOCKED_PAGES 含 ROUTES.TAB.CHAT（routes.ts:41）与 ROUTES.TAB.VILLAGE，usePageAccess.ts:116-130 在 profileCompleted=false 时弹 UnlockGuideModal 并 return（App.vue:276-284 全局挂载）；新注册用户 profileCompletion 远低于阈值 50（RealAuthService.java:1237-1244），必然被拦。而 success.vue:35 却声明「可开始匹配、加兴趣圈、发消息=已解锁」 | **有**：解锁键错位（规格=实名成功解锁；实现=资料完善≥50 解锁，实名门槛未落地）+ 页面解锁声明与守卫状态不一致 → **Issue MP-R1-PAGES-REGISTER-SUCCESS-R01（Function P2）** | 文案对齐守卫 或 守卫迁移到实名状态，二选一并全局一致 |
| T6 | phone 参数脱敏展示、非法回退（页面入参语义） | success.vue:25-30 onLoad 正则脱敏 11 位；非 11 位回退 tag「完成」（success.vue:34）；OP1 DOM 实测 tag0=138****8888、OP5 无参 tag0=完成、OP13 身份B 139****9999（interaction-matrix.md:376/380/386）。本轮 R1 exec 的 RS02/03/04 因 automator 截图超时判 UNVERIFIED（judge，conf 0.2-0.3），以早期 OP DOM 实测为旁证 | 无（本轮通道证据未闭合，见 §4） | 修复取证通道后复跑（judge 004 已立） |
| T7 | 承接注册主链路（注册成功即自动登录，无需二次输密） | register/index.vue:351-360：registerUser 签发 JWT → refreshSession → `uni.redirectTo(ROUTES_REGISTER_SUCCESS?phone=…)`；success 页纯展示不读写 store | 无 | — |

## 2. PageCompare · structureNotes（L1-L10）

- **L1 信息架构/骨架**：独立全屏页，非 tab 页；globalStyle navigationStyle custom（pages.json:35）且本页无返回键/无自定义导航——真实链路 redirectTo 进入（register/index.vue:360），系统返回落登录页；冷启动深链（reLaunch）栈底无上级。
- **L2 布局/内容顺序**：插图→标题→两行副标题→清单卡→主 CTA→次级出口，与 ask「插图→引导文案→进入主流程按钮」一致；达标。
- **L3 组件/主视觉**：打包插图与理想素材同图源（目视比对一致）；CTA 96rpx 全宽绿渐变（@tap 绑在 view 上，MP-R2-…-002 已修点击死区，success.vue:67-71）；清单卡白底 40rpx 圆角三行。达标。
- **L4 内容真实性**：脱敏手机号来自真实入参（OP1/OP13 DOM 实测），无占位假数据。达标。
- **L5 色彩/品牌**：CTA `var(--c-brand,#36c99a)` 绿渐变、页底 `#eef7f2` 浅绿；本页不在 v3.1 Hero 红线页清单（匹配中心/匹配成功/我的），无红线冲突；fallback 值与 v3.1 冻结 Primary #34C98A 的差异属视觉审查员 Token 裁决范围，不在此定性。
- **L6 文案/i18n**：中文硬编码，未接 i18n（与 register/index.vue 同模式，注册链内部一致）。
- **L7 状态完备性**：单成功态静态页，无 loading/错误态需求；无参深链回退已处理（OP5）。
- **L8 交互/导航**：主 CTA 导航已实证（OP2）；次级出口已实证（OP4 + RS08-after 终态 home）；主按钮无代码级防抖（success.vue:40-47 无锁；OP6 因 CLI 秒级间隔未复现重复压栈，RS07 rapidTap×5 后 route 仍本页，风险低未立项）；次级出口热区 120×16px（RS08 实测）低于 88rpx 铁律——interaction judge 已立 005（Interaction P3），不重复。
- **L9 数据联动**：入参仅 phone；会话由注册链路建立，本页无 store 依赖。
- **L10 平台适配**：`--statusbar` JS 注入（useMenuButtonRect，success.vue:13-15）；单屏无滚动（OP10 pageH=812=vpH）、无下拉刷新（OP12 + pages.json:48-50 无 enablePullDownRefresh）。

## 3. PageCompare · usageNotes

- 理想路径（DEV_PAGE_MAP 流程）：注册成功 → 主按钮进入完善资料 12 步（基础资料→实名→…）；或「稍后再说」1 跳进首页 tab。
- 实际：两出口均工作（OP2、OP4/A04b-repro 实证，A04b 截图确认落 home 且五 tab 可用）；**任意页 2 步回 tab 满足**——本页本身 1 跳即 home tab。
- 迷路风险：低。无返回键但双出口常驻；冷启动深链+系统返回在栈底（RS09 记 `NAV_ERROR: Uncaught [object Object]`，与早期 OP8「ok:true 无跳转无崩溃」冲突，低置信——建议复跑确认，未立项）。
- 误导风险：清单卡「已解锁」声明与消息/村口实际锁定状态不符（Issue R01），用户按声明点消息 tab 会遭遇 UnlockGuideModal。

## 4. 证据与置信度说明（诚实边界）

- 本轮 R1 exec（exec-results.json，git=aefd8a72）12 条中 10 条 UNVERIFIED、RS08 FAILED（热区）、RS09 VERIFIED——主因 automator 截图超时（judge MP-R1-…-004，Architecture P2 已立）。
- 本轮所有本页截图（01/03/05/13-after 等）均被 **harness 自身登录预置的「获取手机号失败」系统弹窗**遮盖（页面源码无任何 uni.show* 调用，OP12 srcHasToastLike=false）；干净证据 = RS05-after（完整渲染旁证）、RS08-after（switchTab 终态 home）、A04b-repro（home 落地）。
- R1 本轮截图矩阵核对：screenshot-matrix.md:532-554 本页 24 引用截图全部在案（但同受弹窗污染）。
- T5 解锁语义为**代码静态推证**（守卫链 5 文件互相印证），无「新注册用户点消息 tab」的执行trace（exec 身份为 user-1001 既有号，MISMATCH 见 judge 004）；故 R01 confidence=0.85 而非 1.0。
- 未执行/未核对项：无。本轮未运行自动化（审查员只读约束），全部执行证据引自 exec-results.json / interaction-matrix.md / judge 文件并逐条比对源码。

## 5. verdict

**基本达标** —— 结构/主视觉/文案/双出口/脱敏/注册链承接均达理想基线；唯「解锁点」语义（T5）存在规格级偏差（Function P2 一项），不影响主流程可用性。
