# v3.8 决策包（28 条待裁 + 挂起项，机器派生）

> 生成器：scripts/qa/emit-ruling-menu.mjs --packet。**title/options/premise/basis 全部原样抄自名册机器块**，我没有改写任何选项文字或依据文字。
> 名册块行区间 528-573；status=open 逐行数出 28 条，本包渲染 28 条（守恒由同一把尺判，见文末）。
> 回答方式与菜单一致：回「编号+字母」（如「69c 50d」），不想选的写 skip。

## 先看这三行

- 有实测依据（名册带 basis=）的：**27/28**；缺依据的 1 条：№69。缺依据 ≠ 不能裁，而是拍之前要有人去量。
- 名册文内自带"建议"字样的：**8** 条：№41、№47、№48、№50、№51、№52、№53、№54（这些建议出自名册原文，不是我给的）。
- 分组承自 ruling-menu（人按关键词粗筛），**不是权威归类**；分错请直接无视分组。

## 逐条

### 1. №30 — A1（R3-03）未成年/未实名那一态怎么测

- 分组：C 类·与计划书禁止项或产品／数据行为相关
- 选项（原样）：(a)授权铺测试专号|(b)VRN07 表单分支降级为组件级单测并记需 DB 授权|(c)维持挂账
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §2 A1：门点名 NO_A_JUDGED 次要20|VRN07（realcov-before.log:34）与 UNCOVERED 次要20|VRN07 缺=login（:98）；scripts/build-demo-accounts.mjs（untracked）全文只按学校/校区建演示号，minor/birth_date/实名 零命中"

### 2. №31 — A2（R3-10）计划件承诺的 storage 明文嗅探算承诺还是算不存在

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)73 页全量补做|(b)高敏页抽样|(c)计划件正式改写为安全动作抽测并入册
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §2 A2：承诺原句仍在 reports/audit/ui-audit-2026-10-09/tour-plan.json 的 capture[3]；security/ 交付件 73 份（本程数）键集合只有 route/securityActions/guardPolicy/notes，含 storage 的 0 份；台账 securityMethod 自述已收窄 ⇒ 与计划件不同口径"

### 3. №32 — A3（R3-11）console 判据上限：换载具还是承认重放路径就是天花板

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)立项换载具|(b)正式承认重放路径=判据上限并回写计划件|(c)维持现状
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §2 A3：tour-ledger.json 顶层 consoleOriginal 自述「73/73 全 0 字节（通道失效未采到）……重放加载路径 console 为可达上限」，但没有任何一处把它写成判据上限的裁定"

### 4. №33 — A4（F06）VIP 账单页 VB03 原判据重测还是封存结案

- 分组：C 类·与计划书禁止项或产品／数据行为相关
- 选项（原样）：(a)real/showcase 开 membershipEnabled 重测本体|(b)以封存弹回结案|(c)showcase 代测本体、real 只证封存|(d)维持挂账
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §2 A4：apps/client/src/config/feature-flags.ts:40 membershipEnabled=false（声明在 :15）；realcov-before.log:82 VOIDED 次要22|VB03 待拍板=F06、:83 明写算判过靠的是替换判点、原判据 MP-R2-次要22-010 仍部分开放"

### 5. №34 — A5（REAL-VI34-04-Q）资料完成度拦截对村庄广场适不适用——四条腿的共同前提

- 分组：C 类·与计划书禁止项或产品／数据行为相关
- 选项（原样）：(a)放行，修 profile-guard.ts:18 后按七态重跑 VI34|(b)维持拦截，VI34 判据改成拦截页行为断言、另用完整身份测七态
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §2 A5：两条 VOIDED 都挂它（realcov-before.log:80,81）；本程实跑 emit-open-items.mjs 得 decision:1，唯一一条即 MP-R3AUDIT-VI25-VI34-PARKED-001（需裁决，REAL-VI34-04-Q 未拍板）⇒ v3.7 那句 decision 桶 7→0（decisions-v37.md:246，史值）已被推翻；apps/client/src/guards/profile-guard.ts:14-19 LOCKED_PAGES 含 ROUTES.TAB.VILLAGE、:33 人话名村口/讨论圈，而 village/index.vue:35 只 import ensureCertified"

### 6. №35 — A6（GUEST-VERB-Q）只读注入动词要不要豁免 strict-verbs

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)豁免 networkFault 的 fail-all/record 让游客轴照跑|(b)维持拒发并把 OT06/OC09 收敛为 login 单轴、销游客轴欠账
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §2 A6：scripts/qa/r-exec-cli.mjs:409 仍把 networkFault 列为任何模式都发不出、:488 verbRefusal()、:150 STRICT_VERBS、:290 自测专门要求它继续被拒；账面 OT06/OC09 缺=login+guest（realcov-before.log:96,99）"

### 7. №36 — A7（V37-CAMPUS-PUBLIC）后端到底把 /api/v1/config/campuses 列入 permitAll 吗

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)放 /config/**|(b)不放、维持客户端豁免|(c)只放 /config/campuses 单条
- 前提（原样）：changed
- 依据（原样，含文件:行号）："decisions-v38.md §2 A7：SecurityConfig.java:210 仍是 /api/v1/** → authenticated()，permitAll 白名单里 /config/** 只有 :145 的 /api/v1/config/legal；MockSecurityConfig.java:225 同形；行号相对 v3.7 漂移（史值 194/225）因 b5afba52 在 :189-197 插了 AUDITOR 四条写方法规则。客户端半边已落 ⇒ 射程比 v3.7 小（本册 §7 H1）"

### 8. №38 — A9（V37-MS06-REFUSAL）首屏网络判点缺口该不该把整条腿扣住（现状=拒发）

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)维持整腿拒发|(b)降级为发但标 NOT-EVIDENCED|(c)逐案豁免
- 前提（原样）：changed
- 依据（原样，含文件:行号）："decisions-v38.md §2 A9：r-exec-cli.mjs:1403 把 netFaultFirstLoad 作第五条诚实的不进 VERB_RULES，:394 自述实测全判据台命中 3 条 VI34/AC10/MS06（v3.7 只点了 MS06 ⇒ 影响面比原述更大），:287 自测专门断言全旗标下仍拒发"

### 9. №39 — A10（V37-R309-DISPOSITION）匹配卡那条判夹具不可达还是维持产品缺陷

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)改判 NOT_SHOOTABLE（夹具/态不可达）|(b)维持产品缺陷（先给一条与素材 200＋三分支 v-if 都不矛盾的机制说明）|(c)撤行
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §2 A10：行在 reports/audit/round-6/issue-matrix.md:201 MP-R3AUDIT-DISCOVER-MATCHCARD-BLANK-001（R3-09）；本轮未重拍 ⇒ 沿用 v3.7 三条反对读数（素材 200/47595B、三分支 v-if、配对帧实为 login 页）但不当现值"

### 10. №40 — A11（V37-NTH-TAP）点不准同名多枚钮这笔账现在还剩什么

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)继续补作者侧唯一类名并想法拉进组件子树|(b)补执行器（先证坐标 tap 可用）|(c)判据降级为接线正确并写清换了什么
- 前提（原样）：changed
- 依据（原样，含文件:行号）："decisions-v38.md §2 A11：round-7/c21-executor-capability-matrix.md:308 G-14 25 stamped rows、:307 G-13 42 stamped；RelationshipCTA.vue:43/52/58/64 四枚唯一修饰类已落、产物 dist/build/mp-weixin-real/.../RelationshipCTA.wxml 里同名类出现 1 次 ⇒ G-13 取代 G-14 成主瓶颈，选项 (a) 对 CTA 一族已完成（本册 §7 H2）"

### 11. №41 — C-2 VIS 类条目能不能用源码结构谓词结案（一次定原则）

- 分组：B 类·会动账本口径或历史数据
- 选项（原样）：(a)允许——凡帧里不存在可对照的机器物件即可用谓词结案（现状即此）|(b)分档——结构/令牌/i18n 可用谓词，主张看起来对齐/间距/层级的仍必须帧或量测（本册建议）|(c)不允许——VIS 一律要帧，99 行重新排队拍摄
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §4：这条口径从没被裁过——decisions-v33.md 里 grep 源码谓词|源码级判点 0 命中，其机器名册 :1049-1073 里 open 行 0 条（只命中 :1092 那句守卫说明）⇒ 它一直悬在 decisions-v37.md 与 imggrid-lane.md 之间；本程按列切分 issue-matrix.md 全部以 | MP- 开头的行共 245 行（生成器口径是 主表=179 未结案=16，两套数别混用），其中状态以「已修复（源码级」开头的 99 条"

### 12. №43 — E2 12 行 NAV_FAIL 的 landing 历史数据要不要回头修

- 分组：B 类·会动账本口径或历史数据
- 选项（原样）：(a)按 notes 的实测落点回写|(b)永久保持只靠守卫不采信
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §5 E2：本程逐行数 tour-ledger.json 含 NAV_FAIL 的路由 12 行，逐行 consoleRecap.landing 恒等于请求路由而 notes 写另一落点（pages/login/index 的 notes 落点=pages/discover/index、subpackages/vip/bills 的 notes 落点=pages/profile/index、subpackages/campus/campus/index 的 notes 落点=…hub）；清单导出 .zcode/tmp/lane-ruling/a2a3e.txt:24-36；⚠ 同账 fixlane[2] CON-EV-01 自述生成器已在 2026-10-10 修，但历史 12 行一字未动"

### 13. №44 — E3 「73/73 console 全 0」要不要在账面上标成未采到

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)统一标未采到（配合 A3 的选择）|(b)不标
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §5 E3：本程按字段数——consoleRecap 在 73/73 行都有 lines/errors/warns/landing/file 五键，三枚数值行各 73 条、非零 0 条、取值集合只有 [0] ⇒ 台账头部那句通道失效未采到与这些 0 之间的区别账面完全读不出来"

### 14. №45 — E4 VB03 已判过 vs 原判据未测的三处相反记账（就是 A4 的账面半边）

- 分组：C 类·与计划书禁止项或产品／数据行为相关
- 选项（原样）：A4 裁定后一起改（把 fixlane[0] 那句已判过按判词改写、原文留档）|或不改
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §5 E4：tour-ledger.json fixlane[0] REAL-VB03-03 的 ledgerEffect 原文写 VB03=已判过（EXECUTED）；同一本账 corrections[2] 写原 FAILED 出列作废（判据/配方错误）；覆盖门 realcov-before.log:82 判词 off-list+voided+re-run-pending、:83 原判据 MP-R2-次要22-010 部分开放 ⇒ 三处三个说法，且这句已判过正是 §6 G1 说的 prose 洗不成绿（它没带 coverageEffect）"

### 15. №46 — E5 tour-ledger.json 是活账（去掉 round 戳）还是轮次快照

- 分组：B 类·会动账本口径或历史数据
- 选项（原样）：(a)活账：删掉 round/generatedAt 头部自述|(b)轮次快照：每轮另存一件
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §5 E5：tour-ledger.json 顶层仍是 round: 1、generatedAt 2026-10-09T22:25:53.827Z，同一件正文有 routes=73/corrections=11/fixlane=5（本程数），而 fixlane[0] 行上带 band=real@f0677920、corrections[4] 带【回写落定 2026-10-13·ledger 车道】⇒ 头部比正文晚两轮以上"

### 16. №47 — G1 加不加「红已撤、绿未证、待重判」这一档

- 分组：B 类·会动账本口径或历史数据
- 选项（原样）：(a)新增一档 撤销待重判（要同改 normalize-ledger-status.mjs 的 VOCAB、emit-open-items.mjs 的 OPEN_RE、verify-ledger 词表校验三处）|(b)维持权宜写法|(c)拆两档：状态=撤销 ＋ 独立的欠重跑字段（本册建议，它和 N1 要的 coverageEffect 是同一个机读字段）
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §6 G1：scripts/qa/normalize-ledger-status.mjs:30 VOCAB 共 14 档、没有 撤销待重判；主表里状态写作「未取证（红已撤…」的行 1 条（PFI25 一族）；括号里那句中文不被任何门解析——verify-real-coverage.mjs:448-449 只认 prose/coverageEffect ∈ {…} ⇒ disputed、coverageEffect=revalidated ⇒ 唯一能放回。与 N1 是同一堵墙的两面：G1 缺怎么写、N1 缺谁能签"

### 17. №48 — G2 已修复待复验 一词三义要不要拆

- 分组：B 类·会动账本口径或历史数据
- 选项（原样）：(a)拆成 已修复待带内复验／已修复待静态复量 两档（动词表三处）|(b)保留一档但强制处置列按固定格式写载体命令（门可解析；本册建议先做，(a) 与 G1 同批）|(c)不动
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §6 G2：按 §4 说明的那 245 行全集切列，状态以 已修复待复验 开头的行 7 条（6 条带「（去向…）」括注、1 条裸写）；同集 保留-判据不成立 39 条、已修复（源码级…）99 条、并入-不另立案 26 条作对照量级；三种义务（带内重跑／两档行为复测／静态复量）仍挤在同一词里 ⇒ 账面派不出车道，也没有复验做完没有的机器判据"

### 18. №50 — N2（ADMIN-FEEDBACK-NAV）反馈工单页要不要从后台导航里放出来

- 分组：C 类·与计划书禁止项或产品／数据行为相关
- 选项（原样）：(a)放出来：新增一支前向迁移把 menus id=204 的 hidden 置 0 并同步改 menu.ts:257（两处不同步会让 mock 档与 real 档导航长得不一样）|(b)维持直连 URL 专用|(c)折中：只放给 SUPER_ADMIN/ADMIN、AUDITOR 不放|(d)先补读 200／写 403／mock 404 三格实跑断言再回来裁；本册建议 (d) 然后 (a)
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §1 N2：路由在 apps/admin/src/router/index.ts:49；菜单行被按死在 apps/admin/src/stores/menu.ts:257（同批 202/203/205/207/208，:255-260）；这是 V2026.10.14.0003__reshape_admin_menus.sql:113/:122 的主动决定（:5 隐藏而非删除、路由仍可按 URL 直达；:43-44 声明可重跑自愈）；menu.ts:42-46 自述后端不按 hidden 过滤、真值在库里；⚠ 四份 wave 日志（admaud.log:21 等 17/17/15/30）里 tickets/feedback 零命中 ⇒ 那 79 项断言没有一项读过工单端点"

### 19. №51 — N3（BAND-STAMP-BOUND）新鲜度那把尺只哈希 config/env.js 的 2392 字节，接受还是折宽

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)把 app.js＋app.json＋主包 pages 树（或全量清单哈希）折进 sha8——今天 COVERED=196 会成批过期、需一次全量 real 重拍|(b)接受这把界并把它写成机读事实（在 REALCOV_BAND_STAMP 旁固定印覆盖面 2392B/30090489B≈0.008%、代码/素材重建不注销覆盖）|(c)双戳：band 管归属＋contentStamp 管注销|(d)触发式重扫，只点名提示不撤覆盖；本册建议 (b) 立刻做、(c) 排下轮
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §1 N3：尺定义 scripts/qa/artifact-band.mjs:14-22；本程直读现算 apps/client/dist/build/mp-weixin-real/config/env.js=2392B、sha8=f0677920，与 realcov-before.log:85 REALCOV_BAND_STAMP=real@f0677920 逐字一致；该 real 产物目录 2150 文件/30,090,489B ⇒ 99.992% 的字节不参与新鲜度判定；env.js mtime=2026-10-15T16:00:02Z 而同戳已在 decisions-v33.md:1052/:1059/:1065 三处 2026-10-06 判决行上 ⇒ 重建而戳不动复现到了；尺不是死的：realcov-before.log:89-91 三条 EXPIRED 带着另一枚 real@ed1cd82c"

### 20. №52 — N4（BAND-NAMESPACE-RULE）哪个生产者拥有哪种戳，这条规矩落在哪才算持久

- 分组：A 类·工具与判据口径（多数我能自证，仍列给你确认）
- 选项（原样）：(a)把尺的定义钉在 artifact-band.mjs 头部为唯一算法权威，并在门清单加一条每个产 band 的文件必须 import 它、不许自算的静态普查|(b)维持现状（v3.8 DSL 名册块＋运行时交叉核对＋device-leg 自测），只在 verify-device-leg.mjs 入库时把三处连起来|(c)让门自己拒绝形状对但尺源可疑的行（行上加 bandSource 字段，四个生产者都要加）；本册建议 (a)，且这一轮必须先把 scripts/verify-device-leg.mjs 入库
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §1 N4：scripts/verify-device-leg.mjs 现在是 untracked（git ls-files 不认）；其 :49 import readApiMode、:300-303 现算 band、:228-231 把 git HEAD 降级为 gitSha＋gitShaScope=provenance-only；自测 scripts/qa/test-device-leg-tally.mjs:17/:182-190/:202-205/:214-215（含修复前的形状必须被读成 stale 的负例）经 run-qa-selftests.mjs:25 收进 run-final-verify-v33.sh:95；规矩另活在 .zcode/workflows/miniprogram-ui-audit-v38.dwf.ts:313-332 与运行时对尺 :689-715（对照 v3.7 那枚旧尺 miniprogram-ui-audit-v37.dwf.ts:552-557）"

### 21. №53 — N5（LBS-CLIENT-CONSUMPTION）附近要不要改成真 GPS 半径口径（后端已就绪，客户端 0 调用点）

- 分组：C 类·与计划书禁止项或产品／数据行为相关
- 选项（原样）：(a)切：附近页主数据源改 /location/nearby、校区池退为无授权时的兜底（要授权文案、拒绝兜底态与距离观感变更）|(b)并：校区维度不动，另开按距离排序/筛选开关（默认关）|(c)不切，只把后端端点标为未消费；本册建议 (b)，且无论选哪个周报那句零进展都要更正
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §1 N5：后端已建齐——entity/User.java:191-196 经纬度列、GeoService.java:76 findNearby 与 :79 夹到 1–20km、:81-83 bounding box 预筛、:99 圆内二次筛、:104 按距离排序、:123-127 ADR-16 模糊化、LocationController.java:73 /nearby ＋ @RateLimit；客户端 apps/client/src 里 location/nearby 与 radiusKm grep 0 命中，附近页走校区池 pages/nearby/index.vue:29/:74-77/:100、:39 只 import reportLocation，定位能力本身在 utils/location.ts:61；与周报 报告/汇报/恋爱小程序技术部周四汇报_2026-10-15.md:20 相反"

### 22. №54 — N6（LOVE-CONSULT-CONTENT）恋爱咨询内容谁供给、什么形态

- 分组：C 类·与计划书禁止项或产品／数据行为相关
- 选项（原样）：(a)产品给出 H5 内容源（自建课程页／第三方嵌入／静态图文），QA 再按有内容补判据|(b)本期不供给：UI 层摘掉该入口或标敬请期待，并从 R12 终验清单划出去|(c)维持现状（壳在、URL 空）；本册建议 (b)
- 前提（原样）：unchanged
- 依据（原样，含文件:行号）："decisions-v38.md §1 N6：apps/client/src/config/content-pages.ts:4 自述内容页（附近的人／MBTI／恋爱咨询课程）支持后台配置 H5 URL、:22 字段注释恋爱咨询课程 H5 URL（R4-00243：空默认，配置下发后填充）⇒ 壳与配置通道都在，缺的只是一条真实 URL 与其背后内容；周报 …_2026-10-15.md:22 把它列进 R12 遗留终验"

### 23. №64 — U1 反馈工单列表现在到底有几条（无法判定，派活口径给的 total=0 没有盘上出处）

- 分组：D 类·标着「无法判定」，要的是测量或事实而不是选项
- 选项（原样）：没有可选项可裁：这条缺的是读数不是选择——要么给一次带库实测，要么正式记未取证
- 前提（原样）：缺一个活的
- 依据（原样，含文件:行号）："decisions-v38.md §8 U1：只在 database/flyway/sql/… 与 tables.txt:33 确认 feedback_tickets 表存在，没有任何一份盘上读数给出 total ⇒ 「没人见过它带内容渲染」这句只能写成未取证，不能写成已证伪；N2 的 ③ 同条"

### 24. №65 — U2 R12 的「profile 未登录头部叠印」终验（无法判定）

- 分组：D 类·标着「无法判定」，要的是测量或事实而不是选项
- 选项（原样）：没有可选项可裁：源码级判点买不到这一帧——要么排一次真机/IDE 重拍，要么把它记成不可终验
- 前提（原样）：缺一次真机或
- 依据（原样，含文件:行号）："decisions-v38.md §8 U2：reports/audit/round-6/issue-matrix.md:41 那行状态是 已修复（源码级判点…），但行内处置自己写着「HEAD 已修，待下轮真机帧复验」⇒ 源码级判点只能证明 padding 走了 --statusbar 令牌，证明不了叠印没了——这正是本块 C-2（decisions#41）那条口径的活例子"

### 25. №66 — U3 A7 的两态实测（带 token 200／不带 401）今天是否仍成立（无法判定）

- 分组：D 类·标着「无法判定」，要的是测量或事实而不是选项
- 选项（原样）：没有可选项可裁：规则逐字没变不等于实测过——要么补一次带活 8080 的两态实测，要么把 10-13 那组读数永久标史值
- 前提（原样）：缺一个活的
- 依据（原样，含文件:行号）："decisions-v38.md §8 U3：v3.7 在 decisions-v37.md:62-64 给过 2026-10-13 的实测，那是史值；今天 SecurityConfig.java:210 与 MockSecurityConfig.java:225 的规则本程逐字读过没变，但没变不等于实测过"

### 26. №67 — U4 「实名未认证＋birth_date NULL」专号是否已被谁偷偷铺进库（无法判定）

- 分组：D 类·标着「无法判定」，要的是测量或事实而不是选项
- 选项（原样）：没有可选项可裁：要么给一次 DB 读权限，要么维持覆盖面上的未销账
- 前提（原样）：缺
- 依据（原样，含文件:行号）："decisions-v38.md §8 U4：只能证 scripts/build-demo-accounts.mjs 没有铺它（关键词 0 命中），且门今天仍报 UNCOVERED 次要20|VRN07 缺=login（realcov-before.log:98）⇒ 覆盖面上确实还没销账，但库里有没有专号是另一件事（与本块 A1 decisions#30 同一条欠账的两个面）"

### 27. №68 — U5 把更多产物输入折进戳之后到底会过期多少条（无法判定）

- 分组：D 类·标着「无法判定」，要的是测量或事实而不是选项
- 选项（原样）：没有可选项可裁：若倾向 N3 的 (a)/(c)，这条要先补一次试算
- 前提（原样）：缺一次全量
- 依据（原样，含文件:行号）："decisions-v38.md §8 U5：N3 给的 0.008% 是直接量出来的（2392B／30,090,489B），但折进去会让 196 条里多少条掉进 EXPIRED 算不出来，只能给成批这个定性"

### 28. №69 — Q1（RESHOOT-CREDIT）守卫弹回造成的 FAILED 算不算量到

- 分组：Z 类·机器补录（原菜单没印的）
- 选项（原样）：(a)接受：FAILED 也是 JUDGED，弹回本身是被量到的产品事实，PC06/VB10 继续抵账（现 COVERED=198）|(b)不接受：这两行退回未取证并删除该腿目录（回到 196/3）|(c)接受但分档：抵账照计，行上另标 guard-bounce，使绿不被读成功能已验
- 前提（原样）：（名册这条没有 premise=，实测缺）
- 依据（原样，含文件:行号）：（名册这条没有 basis= ⇒ 拍之前要先有人量）

## 守恒自证

- 名册 open=28 ｜ 本包逐条=28 ｜ 相等=是
- 口径只认 `RULING id=… status=open` 行；散文里的"待裁 N 条"一律不算数。

## 挂起项（原文照抄自 D:\6\恋爱小程序\reports\audit\mp-fidelity-2026-10-18\parked.md，不是我复述的）

- **#11 反馈工单页在后台导航里被隐藏**：属产品方向，需用户拍；本轮保真审计会在 §4 目标功能清单里
  如实标注该页在小程序侧/后台侧的可见性事实，但**不擅自合并或改动导航**。
- **#26 Q1(c) 重做**：见上一条（与 `decisions#69` 同一条欠账）。
- **#27 VI34 七态前置配方**：原计划。本轮取景会对「圈子/广场」页拍到真实状态，
  但**七态注入（空态/Disabled/错误态）不属保真取景**，配方那条腿仍未接进任何载具
  （`--recipes` 在两个载具里点名数实测为 0）。条目原样留着。

