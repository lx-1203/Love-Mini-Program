# 裁定包 v3.8（2026-10-16）—— 你一次性能裁完的那一叠

**这份册子怎么来的**：v3.7 包（`reports/audit/ui-audit-2026-10-13/decisions-v37.md`） roster 我按文件逐节数了一遍是
**23 条**（§A 11 + §B 4 + §C-2 1 + §E 5 + §G 2；包底那句话写的"约 22"是散文数，不作数）。
这 23 条**每一条都回盘上重验过**，没有一条是把 v3.7 的话当现状复述。
本程另加 **7 条本轮新挡下来的**。
所有数字都是本程当场从盘上量的，每条带 `文件:行`；凡引用 v3.7 的旧读数都标了"（v3.7 史值）"。

**复验结论一句话**：23 条里 **23 条仍开放**（没有一条被今天四支提交悄悄关掉），
但其中 **A7 的一半、A11 的一半已经落地**，所以那两条的射程变小了；
另有 **8 件事是已经落地的**（§H，其中包括周报里两条"零进展"的陈述其实已经过期），
**5 件事我判不了**（§I，都缺同一个东西：活的服务/凭据/一次重拍）。

**今天四支提交对账本的影响**（`b2f38215` / `b5afba52` / `73988a95` / `9403369d`）：
它们动的是 api / client / admin 三侧的功能面，**没有一支动过台账或裁定名册**——
实测 `reports/audit/ui-audit-2026-10-09/tour-ledger.json` 最后一次入库是 `b679b4fb`（2026-10-13 19:35），
`reports/audit/round-7/decisions-v33.md` 最后一次入库是 `f9fd17b1`（2026-10-09）。
所以"提交把某条账悄悄关掉了"这件事在 §A/§E 里**没有发生**；发生的只有 §H 那八件"周报与旧包口径过期"。

**本程副作用（一次，必须留档）**：为拿现值我跑了一次 `node scripts/qa/emit-open-items.mjs`（它只读主表、但会覆写自己的产物），
于是 `reports/audit/round-7/open-items.json` 被重生成过；我已按 `git checkout --` **还原回 HEAD 原状**（还原前 `git diff --stat` 记的是
`76 insertions(+), 389 deletions(-)`——顺带量到一件事：**HEAD 里那份 `open-items.json` 是一份比台账落后的旧快照**，
与 v3.7 §C 认的那次"把陈旧快照当现状"是同一个失效模式，下轮谁再用它当分母要先重跑生成器）。
除此之外本程对盘上任何代码/门/台账/`.dwf.ts` 零写入，未碰 UI 租约、未启停服务、未跑任何 git 变更。

---

## 0. 一屏总表

| id | 一句话问题 | 它卡住什么 | 不裁的代价 |
|---|---|---|---|
| A1 | 未成年/未实名那一态，授权铺测试专号，还是把判据降级？ | 覆盖门 `UNCOVERED 次要20\|VRN07 缺=login`（realcov-before.log:98） | VRN07 每轮重述同一句话，已是 5 条真档欠账之一 |
| A2 | 计划件承诺的「storage 明文嗅探」算承诺还是算不存在？ | 安全通道口径；73 份 security 交付件与计划件各说各话 | 下轮审查员继续拿这条当判据再报一次 |
| A3 | console 判据上限：换载具，还是正式承认重放路径就是天花板？ | 「73 页 console 零错误」整条主张的可信度 | 全零分不清"真清白"与"没采到" |
| A4 | VIP 账单页 VB03：开 flag 重测原判据，还是以「封存弹回」结案？ | VOIDED 四分之一起（`次要22\|VB03`，log:82 令牌 F06） | 门禁算判过、台账算没测，第 1 轮立项挂到今天 |
| A5 | 资料完成度拦截，对村庄广场到底适不适用？ | 四条腿的共同前提（VI34 七态、VI25 夹具+重跑、NET-04/OT 网络判点腿） | 一条不裁四条不能动；已悬三轮 |
| A6 | 只读注入动词要不要豁免 strict-verbs？ | `OT06`/`OC09` 的游客轴（log:96,99 缺=login+guest） | 这两条腿永远不可能补——不是能力不够，是规则不给跑 |
| A7 | 后端到底把不把 `/api/v1/config/campuses` 列入 permitAll？ | mock 档与 real 档校区数据源不一致这件事 | 两档数据源分叉继续挂账，且限制若干"要真实模式"的条目 |
| A8 | `--navto-open` 按整条腿生效还是按单步生效？ | 重跑 OT05/06/09/OC09 后"是页面变了还是开页方式变了"这个问题能否回答 | 开页形态在行级不可审计 |
| A9 | 首屏网络判点缺口该不该把整条腿扣住（现状=拒发）？ | 带旗标重跑时点名判据成批 SKIPPED 的读法 | 看起来"腿没跑成"，实际是规则在正确把守 |
| A10 | 匹配卡那条：判夹具/态不可达，还是维持产品缺陷？ | matrix:201 那一行的修法与重拍成本 | 若判 (b)，该行重做且重拍要另算 |
| A11 | 「点不准同名多枚钮」这笔账，现在还剩什么？ | G-14 25 条盖章行 + G-13 42 条（射程已比 v3.7 小） | 这些行在任何一轮重跑里停在 dispatched=0 |
| B5 | `.json.json` 双后缀要不要做带迁移的重命名？ | 证据件可携性那半边 | 56 条既有引用与改名并存，风险自己背 |
| B6 | `prod-sanitize.sql` 的 COMMIT 由谁在哪个库执行？ | 库里的历史测试数据能否清干净 | 不可逆操作没人签，账永远半闭 |
| B9 | 高 dpr 帧那两行要不要按词表标免检？ | HOME-005 / TMP-TOUR-R2-004 的账面归属 | 「免检 0 条」这个账眼一直对不上 |
| B14 | 溯源集合要 11 还是 12（GIT_SHA 那枚算不算生产者）？ | 溯源门的常红判点 | 名册说 A、盘上已有 B 的形状 |
| C2 | VIS 类条目能不能用源码结构谓词结案（一次定原则）？ | 99 条已按源码谓词闭案的行是否站得住 | 下一批 VIS 条目再争一遍——第三次返工 |
| E1 | `decisions-v33.md` 的散文计数与机器块计数，以谁为准？ | 名册唯一真值源这件事 | 同一个数永远要人读散文才能定 |
| E2 | 12 行 `NAV_FAIL` 的 `landing` 历史数据要不要回头修？ | 下游把"被弹回"读成"已到达" | 数据不标不改，靠守卫注释挡 |
| E3 | 「73/73 console 全 0」这句要不要在账面上标成未采到？ | console 主张的机器含义 | 与 A3 叠加后这句话没有机器读数 |
| E4 | VB03 那两处自相矛盾（已判过 vs 原判据未测）裁定后一起改吗？ | 就是 A4 的账面半边 | 台账与门禁继续各印一份相反的话 |
| E5 | `tour-ledger.json` 是活账（去掉 round 戳）还是轮次快照？ | 头部自述与正文不一致 | 每次读都要先猜这本账新不新 |
| G1 | 加不加「红已撤、绿未证、待重判」这一档？ | 撤红未证绿的所有行怎么写 | 每条都要重新争怎么写，且容易写成掉出账面 |
| G2 | `已修复待复验` 一词三义要不要拆？ | 派哪条车道、"复验做完没有"的机器判据 | 7 行同词不同义务，账面看不出该派谁 |
| N1 | 谁有权在台账行上写 `coverageEffect:"revalidated"`、按什么证据写？ | 4 条 VOIDED 全部回到 COVERED 的唯一入口 | 门只能一直红着这一格，重跑也不涨分 |
| N2 | `反馈工单` 页要不要从后台导航里放出来（还是只留直连 URL）？ | 一个已接线、已实跑证明的页面没人看得见 | 工单功能对运营不存在；改一次要两支刀 |
| N3 | 新鲜度那把尺只看 `config/env.js`，接受还是把更多产物输入折进戳里？ | EXPIRED 桶的判决力（现在 3 行） | "按戳新鲜"≠"按内容新鲜"，假绿只是换了位置 |
| N4 | 档位戳命名空间这条规矩，落在哪才算持久（现在主要活在注释里）？ | 下一程会不会又用提交号当 band 键 | 生产者文件还没入库（untracked） |
| N5 | 附近要不要改成真 GPS 半径口径（后端已就绪，客户端 0 调用点）？ | LBS Phase 2 关键路径 | 后端那条腿白建，客户端继续按校区筛 |
| N6 | 「恋爱咨询」内容谁供给、什么形态？ | R12 遗留终验的第三项 | 页面结构在、内容恒空 |
| N7 | lint 要不要进门禁？门槛定多少（现在 3 error / 10358 warning）？ | 治理节奏；现在 lint 根本不在门里 | 3 枚 error 可以在无人察觉下继续长 |

> **一次裁完的最短路径**：A5 + A4 + N1 三刀先落 → 4 条 VOIDED 与四条腿同时松动；
> A6 独立一刀；A2/A3/E3 是同一件事的三个面，可以一起裁；
> N2/N5/N6 是纯产品问题，跟 QA 账本无关，但只有你能答。

---

## 1. N 组：本轮（v3.8 在途）新挡下来的

### N1 `REALCOV-VOIDED-4` —— 四条出列用例怎么回去，卡点不是判决而是"谁签字"

**现状（实测出处）**
- 覆盖门读数：`REALCOV_VOIDED=4`，四条逐行点名在 `.zcode/tmp/pre-wave-20261015/realcov-before.log:79-82`；
  守恒 `免检=28 + 覆盖=196 + 欠账=5 + 待判=4 + 过期=3 = 236／236`（同文件 `:100`），
  结论 `REALCOV_RESULT=FAIL`（`:103`）。
- 阻塞令牌就两个，写在同一格：`:80`/`:81` 两条（`SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI25`、`|VI34`）
  都写 `待拍板=REAL-VI34-04-Q`，`:82` 那条（`次要22|VB03`）写 `待拍板=F06`。
  **这两个令牌就是本包的 A5 与 A4——所以 N1 不重复它们的问题，只补一个此前没人说清的事实**：
- ** operative 约束（原话，`:84`）**：「想让门把一条用例放回 COVERED，只有一个形状有用——
  台账行上声明 `coverageEffect:"revalidated"`（prose 无论怎么写都洗不成绿，包括"原出列作废"这种重开行）」。
  我在**当前工作树**的门里复核了这句话还成立：`scripts/qa/verify-real-coverage.mjs:449`
  （`coverageEffect === "revalidated" ⇒ state=revalidated（唯一能放回）`）、
  `:705`（同样一句）、`:734-736`（正向对照自测：声明该字段的行确实能把桶倒回去，证明这不是单向棘轮）。
- 盘上有没有这种行？**没有**：`reports/audit/ui-audit-2026-10-09/tour-ledger.json` 的
  `corrections` 11 行、`fixlane` 5 行，**0 行带 `coverageEffect` 字段**（本程逐行数出来的）。
- 第四条（`:79` `PAGES-PROFILE-INDEX|PFI25`）**没有任何 needsUser 令牌**，
  判词是 `re-run-pending(待重跑)+write-back-pending(待回写)`；台账 `corrections`「REAL-PFI25-05/F07」行
  原文（本程读出）自述「**红已撤、绿未证**，PFI25 仍无有效判决行，待实带重跑重排后配方定谳——不得读作已修复或判过」。

**这条裁的到底是什么**
不是"VI34/VB03 对不对"（那是 A4/A5），而是**签字权与签字门槛**：
一条腿重跑成功之后，"这行覆盖了"这个断言由谁落到台账上。
现在的事实是：只有人能在 JSON 里写一个机读字段，prose 不管写多狠都不算。

**选项**
- (a) **授权 QA 车道在"重跑落第一条有效判决行"之后自行写 `coverageEffect:"revalidated"`**，
  代价是多一个写台账的车道，必须同时要求那行带 run 目录指针（否则就是自己给自己发绿）。
- (b) **只由你签字**：每条要回 COVERED 的行都走你一句话。最保守，代价是 4 条（以及以后所有出列行）
  都要排队等你，A4/A5 裁完也只是"可以重跑"，跑完还堵在这里。
- (c) **改门的形状**：让"当前 real 带上有一条 EXECUTED 且判点为绿的行"自动等价于 revalidated。
  代价最大——那等于回到"任何一条 EXECUTED 都能把自己洗绿"，正是 VOIDED 桶被造出来要防的那件事
  （`bdef64ef` 加这个桶的理由记在 `reports/audit/round-6/issue-matrix.md:198`）。
- (d) PFI25 特判：它没有产品侧争议，只差重跑；可单独按 (a) 走，其余三条按 (b)。

**建议 + 理由**：**先 (a) + (d) 同一把尺**，并且把"写这个字段"本身做成一条可核判点
（要求同带、同身份、status=EXECUTED 且判点绿的 run 件指针在行上，缺一即门拒绝该声明）。
理由：(b) 的真实成本不是"你少说一句"，而是 A4/A5 裁完之后**还要再来一轮才能涨覆盖**；
(c) 直接销毁 VOIDED 桶的意义。(a) 的风险可以用一条判点兜住。

**判后动作**
- 判 (a)/(d)：ledger 车道加一个"带校验的 `coverageEffect` 写入位"（约 1 个车道程，含 verify-ledger 回读）；
  然后腿车道按 A4/A5 各跑一条腿。
- 判 (b)：无需改工具，只是把四条挂在你名下排队。
- 判 (c)：改 `verify-real-coverage.mjs` 的 `applyVoidBook` 一处 + 拆掉 `:734-736` 那条正向对照——不建议。

---

### N2 `ADMIN-FEEDBACK-NAV` —— `反馈工单` 页已接线且已实跑证明，但导航里看不见

**现状（实测出处）**
- 路由在：`apps/admin/src/router/index.ts:49` `"views/content/Feedback.vue": () => import(...)`。
- 菜单行被按死：`apps/admin/src/stores/menu.ts:257`
  `{ id: 204, parentId: 200, title: "layout.navFeedback", path: "/content/feedback", … hidden: true }`
  （同批还有 202/203/205/207/208 五枚同形状，`:255-260`）。
- **这不是漏配，是 10-14 菜单重排的主动决定**：`database/flyway/sql/V2026.10.14.0003__reshape_admin_menus.sql:113`
  明写「原 200 用户与内容：202 校园认证 203 举报管理 **204 反馈管理** 205 敏感词管理」，
  `:122` 把这六枚一起塞进 hidden 批，`:5` 的注释是「**未入选的页面 隐藏而非删除**（hidden=1），路由必须仍能按 URL 直达」，
  `:43-44` 还声明该迁移**可重跑自愈**（重跑会把 hidden 拉回方案规定的形状）。
- 前端那棵树是**兜底**，真值在库里：`menu.ts:42-46` 自述「后端 `GET /v1/admin/menus/current` **不按 hidden 过滤**……
  『隐藏』这件事最终由 `Layout.vue` 的侧边栏过滤负责」；`menu.ts:216`/`:229` 说明静态树只在 mock 档（该端点未实现）时生效。
- 端点已实跑证明（本轮 wave）：`scripts/verify-admin-auditor.mjs` 的 17 项全绿
  （`.zcode/tmp/pre-wave-20261015/admaud.log:21` `ADMAUD_RESULT=PASS pass=17 fail=0`）、
  `admscope.log:22` `ADMSCOPE_RESULT=PASS pass=17`、`admwrites.log:21` `ADMWRITE_RESULT=PASS pass=15`、
  `postdetail2.log:46` `POSTDETAIL_RESULT=PASS pass=30`。
  控制器本体：`AdminFeedbackController.java:70 @Profile("real")`、`:72 @RequestMapping("/api/v1/admin/feedback/tickets")`、
  `:97 @GetMapping`、`:163 @PostMapping("/{id}/handle")`。
- ⚠ **两处与派活口径不完全一致，我按盘上读数写**：
  ① 上面四份 wave 日志里 **`tickets` / `feedback` 零命中**（我 grep 过），
    即 17/17/15/30 这 79 项断言**没有任何一项点名反馈工单端点**；
    "AUDITOR 读 200 / POST handle 403"这一对我在盘上**没找到出处**，
    只在 `9403369d` 的提交说明与 `CapabilityOverview.vue` 的更正里读到定性描述。
  ② 该控制器是 `@Profile("real")` 专属 ⇒ **mock 档这条列表必然 404**，这是配置事实不是缺陷
    （`9403369d` 提交说明自己已经把这句写进 `CapabilityOverview.vue`）。
  ③ 「tickets total=0 现在没数据」我也**没有盘上出处**（见 §I 的 U1）。

**要你裁的**：一个已接线、后端在 real 档已上线、且被 10-14 那次重排**主动判为"不进侧边栏"**的页面，
现在因"能不能真用"这件事变了——要不要把它放出来。

**选项**
- (a) **放出来**（进侧边栏）。要做**两处**：新增一支前向迁移（不能改 `.0003`，它会自愈覆盖你的手改），
  把 menus 表 id=204 的 hidden 置 0；同时改 `menu.ts:257` 的 `hidden`——两处不同步的话，
  mock 档走静态树、real 档走库，两档导航会长得不一样（这正是本包 A7 那一族的同一个失效形状）。
- (b) **维持直连 URL 专用**（运营用收藏/文档给链接）。代价：`9403369d` 那条接线对不持链接的人等于不存在；
  且 `hidden=1` 语义是"隐藏但可达"，收藏坏 URL 会掉 404（`menu.ts:44-46` 已经警告过这件事）。
- (c) **折中：只放给 SUPER_ADMIN / ADMIN，AUDITOR 不放**（它对该页的写要 403）。
  代价是多一条可见性规则要落进迁移，且要一个新的实跑断言（现在一个都没有——见上面 ①）。
- (d) 先补一条"工单端点实跑断言"（读 200/写 403/mock 404 三格），再回来裁 (a)/(b)。

**建议 + 理由**：**(d) 然后 (a)**。理由：这个页面的**产品问题**（放不放）我已经能替你答"放"——
它是唯一能让运营看见用户反馈的入口；但它**现在的证据面撑不住**：79 项断言里没有一项读过工单列表，
而列表信封形状 `{items,total,page,pageSize,totalPages}` 只在提交说明里被描述过。
先补三条断言（成本很小，`scripts/verify-admin-auditor.mjs` 加三格），放出来才是有依据的放。

**判后动作**：admin 车道 1 小程（迁移 + `menu.ts` 一处 + 三格断言）；不需要设备腿、不占 UI 租约。

---

### N3 `BAND-STAMP-BOUND` —— 新鲜度那把尺的界：它只哈希 2392 字节

**现状（本程实测，不引旧读数）**
- 尺的定义：`scripts/qa/artifact-band.mjs:14-22`，`sha8 = sha256(在盘产物 config/env.js 字节).slice(0,8)`（`:22`）。
  门用它当"当前尺"：`scripts/qa/verify-real-coverage.mjs` 工作树版第 13-16 行的注释与 `readApiMode` import。
- 我**自己算了一遍今天盘上的尺**：
  `apps/client/dist/build/mp-weixin-real/config/env.js` = **2392 字节，sha8 = `f0677920`**（本程直读现算），
  与门报的 `REALCOV_BAND_STAMP=real@f0677920`（`realcov-before.log:85`）逐字一致 ⇒ 门和我读的是同一枚。
- **"重新构建但戳不动"这件事我复现到了**：该 `env.js` 的 mtime 是 `2026-10-15T16:00:02Z`（今天凌晨那次全量 real 重建），
  而同一个 `real@f0677920` 已经出现在 **2026-10-06 的判决行**上
  （`reports/audit/round-7/decisions-v33.md:1052`、`:1059`、`:1065` 三处 `band=real@f0677920`）。
  中间这十天里 `73988a95`（客户端 401 回落旗标）与 `b5afba52`/`9403369d` 都改了源码，
  今天也全量重扫过 ⇒ **戳确实没变**。你给的派活口径（`real@f0677920` 重建后 IDENTICAL）在盘上成立。
- 界有多大：该 real 产物目录共 **2150 个文件、30,090,489 字节**，`config/env.js` 只占 **0.008%**（本程递归实测）。
  也就是说 **99.992% 的产物字节不参与新鲜度判定**。
- 尺不是死的：`realcov-before.log:89-91` 三条 EXPIRED 行带着 `real@ed1cd82c`（另一枚戳）⇒
  历史上 `env.js` 内容变过时戳确实会动，**变的是配置面，不变的是代码/素材面**。

**为什么这是你的决定而不是我顺手能修的**
把更多产物输入折进戳里 = **主动让历史行大批过期**（今天 COVERED=196 里凡在旧构建上拍的全部会掉进 EXPIRED），
这等于一次重拍预算；不折 = 承认"按戳新鲜"弱于"按内容新鲜"并把这句写在能看见的地方。

**选项**
- (a) **折进戳**：把 `app.js` + `app.json` + 主包 `pages/**` 目录树（或全量文件清单的哈希）并入 sha8。
  代价：**今天这批 196 条覆盖会成批过期**，需要一次全量 real 重拍（按本仓口径量：单道约 1h49m、每轮每档约 1023 帧，
  这个数是 v3.7 史值，见 `decisions-v37.md:235`，本程未重测）。收益：戳真的代表产物。
- (b) **接受这把尺的界，并把界写成机读事实**：门在 `REALCOV_BAND_STAMP` 那一行旁边固定印一句
  `尺覆盖面=config/env.js（2392B/30090489B ≈0.008%），代码/素材重建不注销覆盖`，
  另在终报里禁止把 `REALCOV_FRESHNESS=MEASURED` 读成"按内容新鲜"。代价：几乎为零，收益是没人再把它当内容指纹。
- (c) **双戳**：行上同时带 `band`（现有 env.js 尺，管归属）与 `contentStamp`（全产物清单哈希，管注销），
  过期判定只在 `contentStamp` 存在时生效。代价：四个生产者都要多盖一枚（`r-exec-cli.mjs`、`r-exec-ws.mjs`、
  `verify-device-leg.mjs`、DSL），是一个车道程。
- (d) **触发式重扫**：不折进戳，但在 `scripts/qa/verify-band-freshness.mjs` 那一格里额外比一条
  "产物里任一枚 `.wxml`/`.js` 的 mtime 晚于行上 band 的产生时间 ⇒ 点名提示（不撤覆盖）"。
  代价：多一条只报不判的读数，容易被忽略。

**建议 + 理由**：**(b) 立刻做，(c) 排下轮**。理由：(a) 会把 196 条覆盖一次清零，
在 A4/A5/N1 还堵着的时候做这件事等于自己把分母拆了；(b) 是零成本止损——
本包 §E3 那一族的失效原因就是"读数被读成了比它实际能支持的更强的主张"，(c) 才是根治。

**判后动作**：(b) = 覆盖门车道改两行打印 + 终报口径一句；(c) = 四个生产者 + 门各一处（约一个车道程，含自测）。

---

### N4 `BAND-NAMESPACE-RULE` —— 哪个生产者拥有哪种戳：规矩现在主要活在注释里

**现状（实测出处）**
- 事故形状（本轮那条）：腿发 `real@<git HEAD sha8>`，门期待 `real@<env.js sha8>` ⇒ 每一行被摘进 EXPIRED、
  该腿跑出 0 覆盖。
- 生产者已修，**但修的是一个还没入库的文件**：`scripts/verify-device-leg.mjs` 现在是 **untracked**
  （`git status --short` 里在 `??` 段；`git ls-files` 对它报 `did not match any file(s) known to git`）。
  修的内容：`:49` `import { readApiMode } from "./qa/artifact-band.mjs"`、`:300-303` 由 `readApiMode` 现算 band、
  `:228-231` 把 git HEAD 降级为 `gitSha` + `gitShaScope:"provenance-only"`。
- 已经有机器自测了，而且它会被跑到：`scripts/qa/test-device-leg-tally.mjs:17`（判点声明 band 必须 mode@sha8）、
  `:182-190`、`:202-205`（头部与行同戳且 band 里不含提交号）、`:214-215`（**修复前的形状必须被门读成 stale**，防负例空转）；
  该文件按文件名被 `scripts/qa/run-qa-selftests.mjs:25`（glob `^test-.+\.(cjs|mjs)$`）自动收，
  而 `run-qa-selftests` 是门里的一步：`scripts/qa/run-final-verify-v33.sh:95`。
- v3.8 已把"规矩"写成了名册块：`.zcode/workflows/miniprogram-ui-audit-v38.dwf.ts:313-332`
  （`BAND_STAMP_RULE.authority` 指向 `artifact-band.mjs:14-22`、`:317` 点名生产者二 `verify-device-leg.mjs`、
  `:332` 点名消费者 `verify-real-coverage.mjs:251-252/:984-995`），并在运行时对了两把尺：`:689-715`
  （主读数走 `readApiMode`，另跑一遍 v3.7 那套内联探针，`sha8` 不等就 `blockers.push(...)`）。
  对照 v3.7 的原状：`miniprogram-ui-audit-v37.dwf.ts:552-557` 那段内联正则自算 hash——**这就是它现在要交叉核对的那枚旧尺**。

**所以要裁的只剩一件事**：这条规矩的**权威落点**。现在它同时活在
① v3.8 DSL 的名册块（会随版本换文件而重写）、② 注释（`verify-device-leg.mjs` 四处）、③ 一个自测（会被跑到）。
① 的问题：DSL 一版一换名（v36→v37→v38），写在里面的规矩每轮都可能被抄漏；② 的问题：注释不可判；
③ 已经够硬，但它只保护 `device-leg` 这一条生产者，**不保护 r-exec-cli / r-exec-ws / DSL 自己**。

**选项**
- (a) **把尺的定义钉在 `artifact-band.mjs` 头部**（唯一算法权威），并要求 `run-final-verify-v33.sh` 的门清单里
  有一条"每个产 band 的文件必须 import 这个模块，不许自算"的静态普查（`verify-gate-list-sync.cjs` 那类载体）。
- (b) 维持现状（v3.8 名册块 + 运行时交叉核对 + device-leg 自测），只在 `verify-device-leg.mjs` 入库时把这三处连起来。
- (c) 让门自己拒绝"形状对但尺源可疑"的行（例如行上多一个 `bandSource` 字段，门要求它等于
  `readApiMode(...)` 那条码路串）——最硬，成本是四个生产者都要加字段。

**建议 + 理由**：**(a)**，且**这一轮必须先把 `scripts/verify-device-leg.mjs` 入库**。
理由：一个还没进 HEAD 的修复等于没修——worktree 一清就回到"腿发提交号"的状态；
而规矩落在 DSL 名册块里注定跟着版本漂，落在 import 普查里不会。
(b) 的问题是它只保证"这一程的人记得"。

**判后动作**：提交侧 1 枚文件（我没动 git，只报状态）+ 一条静态普查（约半车道）。
**派活里点名的那句"如果修好了就把规矩记到持久处"——修好了，但持久处只有 ②③，①会漂，所以这一条要在册。**

---

### N5 `LBS-CLIENT-CONSUMPTION` —— 半径查询那半边其实已经建好了，缺的是客户端调用点

**现状（实测出处，与周报口径相反）**
- 周报说：`报告/汇报/恋爱小程序技术部周四汇报_2026-10-15.md:20`「本周无真实 GPS 半径查询实质进展；仍待实质启动」。
  **这句已经过期**：
  · 经纬度列在：`apps/api/.../entity/User.java:191-196`（`@Column(name="latitude", precision=10, scale=6)` 一对）；
  · 半径查询在：`.../location/GeoService.java:76 findNearby(lat,lng,radiusKm,maxResults)`，
    `:79` 夹到 1–20km、`:81-83` bounding box 预筛、`:99` 圆内二次筛、`:104` 按距离排序；
  · ADR-16 的距离模糊化在：`GeoService.java:123-127`（>1km 取整、<1km 显示 `<1km`）；
  · 端点在：`.../location/LocationController.java:73 @GetMapping("/nearby")`，带 `@RateLimit(capacity=30,...)`。
- 客户端那半边**确实一个调用点都没有**：我在 `apps/client/src` 里 grep `location/nearby` 与 `radiusKm` ⇒ **0 命中**
  （命中的全是 `border-radius` 那类 CSS 噪音）。附近页走的是校区池：`pages/nearby/index.vue:29`（`loadSchools`）、
  `:74-77`（`schoolPool`）、`:100`（`villageStore.nearbyPosts`），`:39` 只 import 了 `reportLocation`（上报，不消费）。
  定位能力本身在：`apps/client/src/utils/location.ts:61` `uni.getLocation({...})`。

**所以要裁的不是"要不要启动 LBS"（后端已经启动了），而是切换口径这一刀**：
附近/村口的"附近"从**按校区筛**改成**按真实 GPS 半径筛**，是产品语义变更 + 隐私面变更，不是补个调用点那么小。

**选项**
- (a) **切**：附近页主数据源改 `/location/nearby`（客户端拿 `uni.getLocation` 的坐标去查），
  校区池退化为"没有授权时的兜底"。代价：需要授权弹窗文案、拒绝授权后的兜底态、以及"距离显示"这条观感变化
  （ADR-16 那套 `<1km` 口径要进文案）。
- (b) **并**：两维并存——现有校区维度不动，另开一个"按距离"的排序/筛选开关（默认关）。代价：两套排序的可解释性、
  以及覆盖门要为新增态补判点。
- (c) **不切，只把后端端点标记为"未消费"**：避免下轮又有人以为 Phase 2 没做而重建一遍。代价零，
  但 LBS 在产品上继续等于不存在。

**建议 + 理由**：**(b)**。理由：(a) 动的是主路径观感与隐私口径，而本仓在"两档数据源不一致"（A7）上已经
吃过一次账面对不上；(b) 能把"半径查询已实现"变成看得见的功能，同时不改既有默认态的判据面。
无论选哪个，**周报里那句"零进展"要更正**——它现在会让人重建一支已经建好的腿。

**判后动作**：客户端车道（(a) 约一整轮含文案；(b) 半程：一个开关 + 一次筛选请求 + 空态兜底）。
不涉及设备腿，不占 UI 租约。

---

### N6 `LOVE-CONSULT-CONTENT` —— 「恋爱咨询」页结构在、H5 恒空，这是内容供给问题不是代码问题

**现状（实测出处）**
- 周报 `..._2026-10-15.md:22` 把「恋爱咨询内容建设」列进 R12 遗留终验。
- 代码侧：`apps/client/src/config/content-pages.ts:4` 自述「内容页（附近的人 / MBTI 人格测试 / **恋爱咨询课程**）支持后台配置 H5 URL」，
  `:22` 字段注释「恋爱咨询课程 H5 URL（R4-00243：**空默认，配置下发后填充**）」。
  即：**页面壳与配置通道都在，缺的只是一条真实 URL 与它背后的内容**。

**选项**
- (a) **产品供给**：给出 H5 内容源（自建课程页 / 第三方嵌入 / 静态图文页），QA 侧再按"有内容"补判据。
- (b) **本期不供给**：正式把该入口在 UI 层摘掉或标"敬请期待"，并把它从 R12 终验清单里划出去。
- (c) **维持现状**：壳在、URL 空。

**建议 + 理由**：**(b)**。理由：(c) 让每一轮巡检都要重判一次"空页算不算缺陷"（本包 §G1 那一族的同一个形状）；
(a) 不是这轮能落的事。判 (b) 只需要一句文案与一个入口开关，能把这条从关键路径上摘干净。

**判后动作**：客户端半车道（入口隐藏或文案一行）+ 台账把它改记「不立账/产品决定」，无需重拍。

---

### N7 `LINT-GATE` —— lint 根本不在门里；今天盘上是 3 error / 10358 warning

**现状（本程实测）**
- 命令口径来自 `package.json:15`（`eslint apps/admin/src apps/client/src tools eslint.config.mjs`）；
  我只跑了客户端那一层（未跑全口径）：`eslint apps/client/src --ext .js,.ts,.vue` ⇒
  **`✖ 10361 problems (3 errors, 10358 warnings)`**（件：`.zcode/tmp/lane-ruling/lint.txt`，本程生成）。
- 三枚 error 逐枚定位：`apps/client/src/env.d.ts:42:24`、`apps/client/src/env.d.ts:49:23`（均 `@typescript-eslint/no-explicit-any`）、
  `apps/client/src/subpackages/profile-extra/profile/other.vue:181:7`（`no-constant-condition`）。
- **lint 不在门里**：`scripts/qa/run-final-verify-v33.sh` 里 `lint` 零命中（本程 grep）。
- 周报把它列在 `..._2026-10-15.md:24`「lint warnings 治理 + typecheck 0 error 维持」。

**这条要区分清**：**10358 枚 warning 的清扫是工程活，不需要你任何裁定**（不改变行为，随时可做）。
要你裁的只有一件：**要不要把 lint 变成一道门，以及第一刀的门限**。

**选项**
- (a) **只把 3 枚 error 进门**（`--quiet` 口径：warnings 不计入门色），warning 治理不设门槛、按周推进。
- (b) **进门并设 warning 预算**（如 ≤10358 且单调不增），超预算即红。代价：门一红就堵所有车道，且 warning 面这么大。
- (c) **继续不进门**，只在终报里印一行读数。代价：与现在一样，3 枚 error 可以在无人察觉下继续长。

**建议 + 理由**：**(a)**。理由：`other.vue:181` 那枚 `no-constant-condition` 是真会短路一段逻辑的形状，
而它今天不在任何门的判点里；把 error 进门成本几乎为零（一门一步），warning 与 error 分色是本仓一贯口径
（`REALCOV_*` 那套"报而不判"就是这个思路）。

**判后动作**：QA 车道一步（`run-final-verify-v33.sh` 加一步 `g lint`）+ 三枚 error 各一改（工程，无裁定）。

---

## 2. A 组复验结果（11 条：全部仍开放，其中 2 条射程变小）

| id | 判决 | 本程实测出处 |
|---|---|---|
| A1 `R3-03`（VRN07 专号） | **仍开放** | 门点名 `NO_A_JUDGED 次要20\|VRN07`（`realcov-before.log:34`）与 `UNCOVERED 次要20\|VRN07 缺=login`（`:98`）。新落的建号脚本 `scripts/build-demo-accounts.mjs`（untracked）全文只按学校/校区建**演示号**，`minor/birth_date/实名` 零命中 ⇒ 未成年/未实名夹具仍未铺。 |
| A2 `R3-10`（storage 嗅探） | **仍开放** | 承诺原句仍在 `reports/audit/ui-audit-2026-10-09/tour-plan.json` 的 `capture[3]`（「② 页面 onLoad 期 storage 键嗅探（token/身份键明文落盘）」）；交付件侧 `security/` 共 **73 份**（本程数），键集合只有 `{route,securityActions,guardPolicy,notes}`，含 `/storage/i` 的文件 **0 份**（本程逐份读）。台账 `securityMethod` 自述已收窄成「安全动作抽测（rows.actions）」——**与计划件不同口径**。 |
| A3 `R3-11`（console 上限） | **仍开放** | 能力边界在台账头部已有自述（`tour-ledger.json` 顶层 `consoleOriginal`：「73/73 全 0 字节（通道失效未采到）……重放加载路径 console 为可达上限」），**但没有任何一处把它写成"判据上限"的裁定**。缺的还是那一句"重放路径就是天花板"。 |
| A4 `F06`（VB03） | **仍开放** | `apps/client/src/config/feature-flags.ts:40` `membershipEnabled: false`（声明在 `:15`）。门里 `VOIDED 次要22\|VB03 … 待拍板=F06`（`realcov-before.log:82`），且 `:83` 明写它算判过靠的是**替换判点**、原判据 `MP-R2-次要22-010` 仍「部分开放」。 |
| A5 `REAL-VI34-04-Q` | **仍开放（且已升格为台账 `decision` 桶唯一一条）** | 两条 VOIDED 都挂它（`realcov-before.log:80,81`）。**新事实**：本程实跑 `scripts/qa/emit-open-items.mjs` 得 `decision:1`，那条正是 `MP-R3AUDIT-VI25-VI34-PARKED-001`，状态原文以「需裁决（去向：needsUser REAL-VI34-04-Q 未拍板……）」开头、载体列写「（无：这一桶要的是人的一次拍板，脚本只能把它钉在账上）」——v3.7 那句 `decision 桶 7 → 0`（`decisions-v37.md:246`，史值）已被推翻，它现在是**唯一一条纯靠拍板才能动的账**。拦截确实作用在村口：`apps/client/src/guards/profile-guard.ts:14-19` 的 `LOCKED_PAGES` 含 `ROUTES.TAB.VILLAGE`，`:33` 给它的人话名是「村口/讨论圈」；而页面本体 `subpackages/village/village/index.vue:35` 只 import `ensureCertified`（校区认证那道），完成度门槛不在页内 ⇒ 换口径要改的是 guard 名单不是页面。**这条是四条腿的共同前提，原样成立。** |
| A6 `GUEST-VERB-Q` | **仍开放** | 动词表 `scripts/qa/r-exec-cli.mjs:409` 仍把 `networkFault` 列为任何模式都发不出；拒发函数 `:488 verbRefusal()`；闸 `:150 STRICT_VERBS`；**且有一条自测专门要求它继续被拒**（`:290`「全旗标开着也仍拒发：swipe / nativeModal / networkFault」）。账面后果原样：`UNCOVERED 次要20\|OT06 缺=login+guest`、`次要21\|OC09 缺=login+guest`（`realcov-before.log:96,99`）。 |
| A7 `V37-CAMPUS-PUBLIC` | **仍开放（半边已落地，见 §H1）** | 后端半边没动：`SecurityConfig.java:210` 仍是 `/api/v1/** → authenticated()`，permitAll 白名单里 `/config/**` 只有 `:145` 的 `/api/v1/config/legal`；`MockSecurityConfig.java:225` 同形。**注意行号相对 v3.7 漂了**（v3.7 史值 194/225），原因是 `b5afba52` 在 `:189-197` 插了 AUDITOR 四条写方法规则。客户端半边已落（§H1）。 |
| A8 `V37-NAVTO-SCOPING` | **仍开放** | `scripts/qa/exec-capabilities.mjs:352-363` 的 `resolveOpenForm(step, opts)` 函数体**只读 `step.page` 与 `step.query`，从不读 `step.via`**；`:356` 是纯旗标闸（`if (!o.navTo) return {via:"bridge",…}`）。`r-exec-ws.mjs:794` 传的是 `Object.assign({}, step, {query})`，而 `:812` 对 `step.via === "navto"` 的读取**只用于生成一句备注**，不改分发 ⇒ 旗标级这一事实没变。 |
| A9 `V37-MS06-REFUSAL` | **仍开放（影响面比 v3.7 写的更大）** | 规则在册：`r-exec-cli.mjs:1403` 把 `netFaultFirstLoad` 作"第五条诚实的不"进 `VERB_RULES`；`:394` 自述**实测全判据台命中 3 条：VI34 / AC10 / MS06**（v3.7 只点了 MS06）。自测 `:287` 专门断言"全旗标下仍拒发"，并要求只点名故障或只点名冷启动的判据都不许被误扣。 |
| A10 `V37-R309-DISPOSITION` | **仍开放** | 行在：`reports/audit/round-6/issue-matrix.md:201` `MP-R3AUDIT-DISCOVER-MATCHCARD-BLANK-001`（R3-09）。没有新证据推翻 v3.7 那三条反对读数（素材 200/47595B、三分支 `v-if`、配对帧实为 login 页），本轮未重拍 ⇒ 我沿用其定性但**不把它当现值**。 |
| A11 `V37-NTH-TAP` | **仍开放（射程已缩小，见 §H2）** | 欠款名册原样：`reports/audit/round-7/c21-executor-capability-matrix.md:308` G-14「nth / multi-instance disambiguation」**25 stamped rows**；同页 `:307` G-13「component-subtree scope」**42 stamped**。新增事实：CTA 一族**作者侧唯一类名已落**（`apps/client/src/components/profile/public/RelationshipCTA.vue:43/52/58/64` 四枚各带 `--like/--hello/--whisper/--follow` 修饰类；编译产物 `apps/client/dist/build/mp-weixin-real/components/profile/public/RelationshipCTA.wxml` 里 `relationship-cta__btn--like` 出现 **1 次**，本程 grep 计数）。⇒ **G-13（进不去组件子树）取代 G-14 成了这族的主要瓶颈**，A11 的选项 (c)（用 `triggerEvent` 验接线）与 (a)（补类名）里，**(a) 对 CTA 已完成**。 |

**A 组问题正文（一次一行可答版）**

- **A1**：往测试库铺「实名未认证 + birth_date NULL」的专号（授权我铺），还是把 `VRN07` 表单分支降级为组件级单测并记「需 DB 授权」？（a 铺 / b 降级 / c 维持挂账）
- **A2**：`tour-plan.json` 的「storage 明文嗅探」——补做（73 页全量 / 高敏页抽样），还是把计划件正式改写为「安全动作抽测」并入册？（a 全量 / b 抽样 / c 改口径）
- **A3**：页面**真实加载期** console 原文——立项换载具去拿，还是正式承认"重放路径 = 判据上限"并回写计划件？（a 换载具 / b 承认上限 / c 维持现状）
- **A4**：VB03 原判据（onShow 不重拉、下拉回读差异）——real/showcase 开 `membershipEnabled` 重测本体，还是以「封存弹回」结案？（a 开 flag 重测 / b 封存结案 / c showcase 代测本体、real 只证封存 / d 维持挂账）
- **A5**：30% 完成度用户能不能进村庄广场？（a 放行——修 `profile-guard.ts:18` 后按七态重跑 VI34 / b 维持拦截——VI34 判据改成"拦截页行为断言"，另用完整身份测七态）
- **A6**：`networkFault` 的 fail-all/record 这类**不产生写操作**的注入动词，豁免 strict-verbs 让游客轴照跑，还是维持拒发、把 OT06/OC09 收敛为 login 单轴并销游客轴欠账？（a 豁免 / b 收敛销账）
- **A7**：后端把 `/api/v1/config/campuses` 列入 permitAll 吗？（a 放 `/config/**` / b 不放、维持客户端豁免 / c 只放 `/config/campuses` 单条）
- **A8**：`--navto-open` 接受旗标级（要求每行回显 open form），还是改回步级（`step.via` 优先、旗标只作总闸）？（a/b/c 维持现状）
- **A9**：首屏网络判点缺口——维持整腿拒发（宁空转不留假绿），降级为"发但标 NOT-EVIDENCED"，还是逐案豁免？（a/b/c）
- **A10**：匹配卡那条改判"夹具/态不可达"（NOT_SHOOTABLE），还是维持产品缺陷（需先给一条与"素材 200 + 三分支 v-if"都不矛盾的机制说明），还是撤行？（a/b/c）
- **A11**：剩下的 G-13/G-14——(a) 继续补作者侧唯一类名并想法拉进组件子树，(b) 补执行器（先证坐标 tap 可用），(c) 判据降级为"接线正确"并**写清换了什么**？三选一。

---

## 3. B 组复验（4 条 half-closed，全部仍开放）

| id | 没动的那半边 | 本程实测出处 |
|---|---|---|
| `decisions#5` | `.json.json` 双后缀未改 | 盘上 `reports/**` 里**文件名以 `.json.json` 结尾的件 42 枚**（本程 `find` 计数）；文本引用 458 处（`scripts/qa` + `reports/audit/round-7`）。名册行：`reports/audit/round-7/decisions-v33.md:1053`。 |
| `decisions#6` | COMMIT 要你在目标库执行 | `database/sanitize/prod-sanitize.sql` 在盘（9298 B，本程 `ls`），名册行 `decisions-v33.md:1054`。**这是本包唯一一条我无法替你判断"做没做"的**——它只在目标库上才有状态（§I 之外另需你自证）。 |
| `decisions#9` | 高 dpr 两行未标免检 | `issue-matrix.md:98`（`MP-R2VIS-PAGES-HOME-INDEX-005`，状态仍 `已修复待复验（去向：closer=待人裁决…）`）与 `:180`（`MP-R2VIS-TMP-TOUR-R2-004`，状态仍 `待修复（去向：closer=closer 无记录…）`）。全表 `免检` 命中 **3 处**，逐处读原文都是「**不是**放宽成免检」那类反义用法（`:61`/`:97` 等），⇒ 免检标记确实一条都没落。名册行 `decisions-v33.md:1057`。 |
| `decisions#14` | 若要 B（GIT_SHA 重回集合）说一句就改 | 名册行 `decisions-v33.md:1061`。**但盘上已经有 B 的形状了**：`scripts/qa/r-exec-cli.mjs:786` `const GIT_SHA = git("rev-parse --short HEAD")`，`:921` 行上同时写 `gitSha` + `gitShaSource`；`scripts/verify-device-leg.mjs:228-231` 写 `gitSha` + `gitShaScope:"provenance-only"`。⇒ 要裁的真问题从"要不要改名"变成**"这两枚 gitSha 字段算不算溯源生产者，集合是 11 还是 12"**。 |

**一次一行可答版**
- **#5**：`.json.json` 双后缀——做带迁移的重命名（42 枚件 + 458 处引用一起走），还是永久接受？
- **#6**：`prod-sanitize.sql` 的 COMMIT——你在哪个库执行、什么时候；或正式判"本轮不清"。
- **#9**：HOME-005 / TMP-TOUR-R2-004 两行按台账词表标免检（2 枚），还是继续让它们占"未结案"？
- **#14**：溯源集合要 11（现状口径）还是 12（把 `r-exec-cli.mjs:786` 与 `verify-device-leg.mjs:228` 这两枚 gitSha 算进去）？

---

## 4. C-2 复验：源码谓词能不能闭 VIS 类条目——**仍开放**

**现状（实测出处）**
- 这条口径**从没被裁过**：`reports/audit/round-7/decisions-v33.md` 里 `grep "源码谓词\|源码级判点"` **0 命中**（本程），
  机器名册 `:1049-1073` 里 `status=open` 的行 **0 条**（`grep -n "status=open"` 只命中 `:1092` 那句守卫说明）。
  ⇒ 这条决定**不在任何名册里**，它一直悬在两份 v13 车道文档之间（`decisions-v37.md`、`imggrid-lane.md`）。
- 现状事实：**统计口径先说清**——本程按列切分 `reports/audit/round-6/issue-matrix.md` 里全部以 `| MP-` 开头的行，
  共 **245 行**（含撤销段、并案段、回归核对段），而台账生成器 `scripts/qa/emit-open-items.mjs` 本程实跑报的是
  **`主表=179 未结案=16`**（分桶 `reverify:8 unverified:2 backend:1 frame:1 decision:1 probe:2 code:1`，
  结论 `OPEN_ITEMS_RESULT=OK`）⇒ 下面这组状态词计数取的是**那 245 行全集**，不是 179 主表，两套数别混用。
  全集里状态以「已修复（源码级」开头的行 **99 条**，
  这就是已经被这条未裁口径放出去的量级；能红的那半边也复量到：
  门自述 `SRC_SHAPE` 判据台在册（见 `decisions-v37.md:184-185`，**v3.7 史值**：成立 99/99、注入点 42 全红）。

**一次一行可答版**：(a) 允许——凡"帧里不存在可对照的机器可判物件"，VIS 类可用源码谓词结案（现状即此）；
(b) 分档——结构/令牌/i18n 可用谓词，凡主张"看起来对齐/间距/层级"的仍必须帧或量测；
(c) 不允许——VIS 一律要帧，则这 99 行要重新打开排队拍摄。
**建议**：**(b)**，并把名册里那 0 条 `status=open` 补上这一条——**一个已经影响 99 行的口径不该不在名册上**。

---

## 5. E 组复验：5 处自相矛盾全部**仍开放**（一处都没被今天四支提交关掉）

前置事实（本程）：`tour-ledger.json` 最后入库 `b679b4fb`（2026-10-13 19:35）、
`decisions-v33.md` 最后入库 `f9fd17b1`（2026-10-09）⇒ 今天没有提交动过这两件。

| id | 判决 | 本程实测出处（都是现值） |
|---|---|---|
| **E1** 散文 vs 机器块计数 | **仍开放** | 机器块尾行：`decisions-v33.md:1072` = `PENDING_RULINGS_END open=0 half_closed=4 closed=16`；散文：同文件 `:1108` = 「尾部计数 `open=0 half_closed=7 closed=13`（20 行守恒：0+7+13=20）」。两处并存，原样未改。（我另核了机器块自洽性：块内 `status=half-closed` 的行**恰好 4 条**——`:1053 #5`、`:1054 #6`、`:1057 #9`、`:1061 #14` ⇒ **机器块那个 4 是对的**，散文的 7 是 10-06 当时的状态。） |
| **E2** 12 行 `NAV_FAIL` 的 `landing` | **仍开放** | 本程逐行数：`tour-ledger.json` 里含 `NAV_FAIL` 的路由 **12 行**（与 v3.7 同数，但这次是我数的）。逐行 `consoleRecap.landing` **恒等于请求路由**，而 `notes` 写的是另一个落点，例：`pages/login/index` landing=`pages/login/index` / notes=「落点=pages/discover/index」；`subpackages/vip/bills` landing=`subpackages/vip/bills` / notes=「落点=pages/profile/index」；`subpackages/campus/campus/index` landing=自身 / notes=「落点=subpackages/campus/campus/hub」。逐行清单已导出 `.zcode/tmp/lane-ruling/a2a3e.txt:24-36`。⚠ 同账 `fixlane[2] CON-EV-01` 自述生成器已在 2026-10-10 修（landing 改实测路由栈），但**历史 12 行数据一字未动**。 |
| **E3** console 全零 | **仍开放** | 本程按字段数：`consoleRecap` 在 73/73 行都有 `{lines,errors,warns,landing,file}` 五个键；`lines`/`errors`/`warns` 三枚**数值行各 73 条、非零 0 条、取值集合只有 `[0]`**。⇒ 台账头部那句"通道失效未采到"与这些 0 之间的区别，账面完全读不出来。 |
| **E4** VB03 两处相反记账 | **仍开放** | `tour-ledger.json` `fixlane[0] REAL-VB03-03` 的 `ledgerEffect` 原文：「**VB03=已判过（EXECUTED）**，原 FAILED 出列依据……作废留档」；同一本账 `corrections[2] REAL-VB03-03` 写「原 FAILED 出列作废（判据/配方错误）」；覆盖门第 5 次报：`realcov-before.log:82` `VOIDED … 判词=off-list+voided+re-run-pending`、`:83` 「原判据=MP-R2-次要22-010 部分开放」。⇒ 三处三个说法，且这句"已判过"正是 §G1 说的"prose 洗不成绿"的典型（它没带 `coverageEffect`）。 |
| **E5** 头部自述陈旧 | **仍开放** | `tour-ledger.json` 顶层仍是 `round: 1`、`generatedAt: "2026-10-09T22:25:53.827Z"`；同一件正文有 `routes=73 / corrections=11 / fixlane=5`（本程数），而 `fixlane[0]` 行上带 `band=real@f0677920`、`corrections[4]` 带「【回写落定 2026-10-13·ledger 车道】」⇒ **头部比正文晚了两轮以上**。 |

**一次一行可答版**
- E1：以机器块为准（我的建议，它已自证 4/16 守恒）还是以散文为准？定了我就把那一句散文改成附注。
- E2：12 行历史 `landing` 回头修（按 notes 的实测落点回写）还是永久保持"只靠守卫不采信"？
- E3：73 个 0 要不要统一标成"未采到"（配合 A3 的选择）？
- E4：A4 裁定后，`fixlane[0]` 那句"已判过"要不要我按判词改写（原文留档）？
- E5：这本账算活账（删 round/generatedAt）还是轮次快照（每轮另存一件）？

---

## 6. G 组复验：两处词表缺档**仍开放**（现值都量过）

### G1 缺「红已撤、绿未证、待重判」这一档
- 词表现值（本程读）：`scripts/qa/normalize-ledger-status.mjs:30`
  `VOCAB = [待修复（需产品裁决, 已修复待复验, 保留-判据不成立, 判据不成立, 未取证/需裁决, 未取证, 需裁决, 撤销, 回归核对, 并入-不另立案, 待复验, 待修复, 不立账, 已修复]` = **14 档，没有 `撤销待重判`**。
- 权宜写法仍在盘上：主表里状态写作 `未取证（红已撤…` 的行 **1 条**（本程按列切分统计；`PFI25` 那一族）。
  括号里那句中文不被任何门解析——门的解析器只认机读字段（见 `verify-real-coverage.mjs:448-449`：
  `prose / coverageEffect ∈ {…} ⇒ disputed`，`coverageEffect === "revalidated" ⇒ 唯一能放回`）。
- **这条和 N1 是同一堵墙的两面**：G1 缺"怎么写"，N1 缺"谁能签"。
- 选项：(a) 新增一档 `撤销待重判`（要同改 `normalize-ledger-status.mjs` 的 VOCAB、`emit-open-items.mjs` 的 OPEN_RE、`verify-ledger` 的词表校验三处）；(b) 维持权宜写法；(c) 拆成两档（状态=撤销 + 独立的"欠重跑"字段）。**建议 (c)**：它和 N1 要的 `coverageEffect` 是同一个机读字段，一次做两件事都闭。

### G2 `已修复待复验` 一词三义
- 现值（本程按列切分，取 §4 说明的那 245 行全集）：状态以 `已修复待复验` 开头的行 **7 条**（其中 6 条带「（去向…）」括注、1 条裸写）；
  同集里 `保留-判据不成立` 39 条、`已修复（源码级…）` 99 条、`并入-不另立案` 26 条（对照量级，便于你看这 7 条在账上的比重）。
- 三种义务仍挤在同一词里（带内重跑 / 两档行为复测 / 静态复量），账面派不出车道，也没有"复验做完没有"的机器判据。
- 选项：(a) 拆成 `已修复待带内复验` / `已修复待静态复量` 两档（动词表三处）；(b) 保留一档但强制 `处置` 列以固定格式写载体命令（门可解析）；(c) 不动。**建议 (b) 先做、(a) 与 G1 同批**。

---

## 7. 已落地，从包中划掉（8 件 —— 包变小是因为量到了落点，不是有人弄丢了条目）

| # | 被划掉的条目 | 落点（本程实测 `文件:行`） |
|---|---|---|
| **H1** | **A7 的客户端半边**（v3.7 §A7「已做的（不需要你裁）」那一半，现在确认在 HEAD） | `apps/client/src/config/feature-flags.ts:29`（接口声明 `mockOn401Enabled: boolean`）+ `:47`（默认 `false`），由 `73988a95`「fix(client): 401 不再静默回落 mock 数据（默认关，加 mockOn401Enabled 旗标）」带入。⇒ A7 只剩后端 permitAll 那半边。 |
| **H2** | **A11 的 CTA 一族"补作者侧唯一类名"那一半**（v3.7 §A11 选项 (a) 的前半已发生） | `apps/client/src/components/profile/public/RelationshipCTA.vue:43`（`relationship-cta__btn--like`）、`:52`（`--hello`）、`:58`（`--whisper`）、`:64`（`--follow`）；编译产物同名类在 `apps/client/dist/build/mp-weixin-real/components/profile/public/RelationshipCTA.wxml` 出现 **1 次**（本程 grep 计数）。另 `apps/client/src/components/village/PostCard.vue:71` 现在有 `defineExpose({ noop, handleLike })` ⇒ v3.7 §A11 里"方法名根本不在产物里"那句只对 CTA 一族过期。 |
| **H3** | **v3.7 §C-1b 里那条「197 门禁 voided 分桶已闭」** | 载体在 `reports/audit/round-6/issue-matrix.md:198`（`MP-R3AUDIT-GATE-VOIDED-BUCKET-001`，注明 commit `bdef64ef` 给门加 voided/pending 分桶）。**本轮该门的读数已把它要的效果量到盘上**：`realcov-before.log:78 REALCOV_VOIDED=4`、`:100` 四项守恒 `28+196+5+4+3=236／236`。⇒ 该行的复验不必再等人，是工程复跑活。 |
| **H4** | **周报 §二 那条「WS `connect()` 真实接线仍未做」** | 已做：`apps/client/src/stores/session.ts:298-309` `syncRealtimeConnection()`——已登录 + 非 mock + 有 token ⇒ `:305 wsClient.connect(token)`，其余分支 `:300/:307 disconnect()`；三处调用点在 `:585`、`:659`、`:718`（本程 grep 全量）。⇒ 从"待产品决议"清单里划掉；**残留的是消费面**：`wsClient.subscribe(...)` 在业务代码里 0 处（只在 `constants/api-params.ts:17` 的示例注释里），推送经 `services/websocket/store-dispatch.ts` 写 store。 |
| **H5** | **周报 §二 那条「LBS Phase 2 本周零进展」** | 服务端已完整（见 N5 的四条出处：`User.java:191-196` 列、`GeoService.java:76/:79/:81-83/:99/:104` 半径查询、`:123-127` ADR-16 模糊化、`LocationController.java:73` 端点 + 限流）。⇒ 条目缩小为"客户端调用点与产品口径"（N5）。 |
| **H6** | **周报 §二 那条「后台 RBAC 多级权限设计评审」的第一层** | `b5afba52` + `9403369d` 落了第三角色 AUDITOR 读写分离：`SecurityConfig.java:189-197`（POST/PUT/PATCH/DELETE 四类写规则**声明在通用 admin 规则之前**，`:197` 通用规则含 `AUDITOR`）、`MockSecurityConfig.java:216`（mock 档 admin 仍 `hasRole("ADMIN")` ⇒ **AUDITOR 只在 real 档存在**，这是档位事实）；迁移 `database/flyway/sql/V2026.10.14.0001__add_auditor_role.sql`；实跑背书 `admaud.log:21`（17/17，含"读放宽/写 403/超管对照/跨校区拦截"四族）。⇒ 剩下的"多层圈层数据域"是工程 + 一次设计评审，不再是"零进展"。 |
| **H7** | **反馈工单的接线本身**（注意：只有接线，导航可见性仍在 N2） | `9403369d` 提交说明自述「`api/feedback.ts` + `views/content/Feedback.vue`：改吃后端新增的 tickets 信封」；`git show --stat 9403369d` 里 `apps/admin/src/api/feedback.ts` **+164 行**、`apps/admin/src/router/index.ts` ±19 行、zh-CN/en-US 各 +255/+256 行；`CapabilityOverview.vue` 那条「没有任何 /api/v1/admin/feedback 路由」的断言已按 `@file:line` 普查更正。⇒ 裁的只剩"要不要放进侧边栏"。 |
| **H8** | **R12 三项里的「圈子空态 CTA」那一项** | 两条在册行都已按判据结案、不再需要裁定：`reports/audit/round-6/issue-matrix.md:46`（`MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-001`，`保留-判据不成立`）与 `:182`（`…-CIRCLE-HOME-003`，`撤销（原判 P3）` + `保留-判据不成立`）。⇒ R12 遗留实际只剩两项：profile 未登录头部叠印（进 §I U2）与恋爱咨询（进 N6）。 |

**另外三条"其实不算裁定"的，也一并说清，免得下轮再当待办数一遍**
- **工作树分批提交评审（周报 §二 第 6 行）**：现状本程实测 `git status --short` = **41 条目**
  （5 枚 `M`：`scripts/probe-real-env.mjs`、`scripts/qa/run-final-verify-v33.sh`、`verify-gate-list-sync.cjs`、`verify-real-coverage.mjs`、`reports/audit/round-7/evidence-holes-verdict.sidecar.json`；其余为 `??`，
  含 `scripts/verify-device-leg.mjs`、`scripts/qa/device-leg-tally.mjs`、`scripts/qa/test-device-leg-tally.mjs`、`doc/后台权限与隐患整改设计方案.md`）。
  周报正文写的是「在途 273 文件」——**那是 10-13 那批的史值**（`..._2026-10-15.md:25`/`:45`），今天这个数已不适用。这是提交纪律工程活，不要裁定。
- **lint warning 清扫**（N7 的另一半）：10358 枚 warning 的清法不需要你点头，需要点头的只有"进不进门"。
- **A11 的执行器选项 (b)（先证坐标 tap 可用）**：这是一条 capability 车道，不是裁定。

---

## 8. 无法判定（5 件 —— 每件都写清缺什么）

| # | 判不了的事 | 缺什么 | 我不想假装的部分 |
|---|---|---|---|
| **U1** | 反馈工单列表**现在到底有几条**（派活口径给的是 `total=0`） | 一个活的 8080（real profile）+ Redis 6379；本程按指令**没有启动/停止任何服务** | 我只在 `database/flyway/sql/…` 与 `tables.txt:33` 确认 `feedback_tickets` 表存在，**没有任何一份盘上读数给我 total**。所以"没人见过它带内容渲染"这句我只能写成"未取证"，不能写"已证伪"。 |
| **U2** | R12 的「profile 未登录头部叠印」终验 | 一次真机/IDE 帧重拍（要占 UI 租约；本程按指令**没碰租约**） | 台账 `issue-matrix.md:41` 那行状态是 `已修复（源码级判点…）`，但行内处置原文自己写着「**HEAD 已修，待下轮真机帧复验**」——源码级判点只能证明 padding 走了 `--statusbar` 令牌，证明不了叠印没了。这正是 §C-2 那条口径的活例子。 |
| **U3** | A7 的两态实测（带 token 200 / 不带 401）今天是否仍成立 | 活的 8080 | v3.7 在 `decisions-v37.md:62-64` 给过 2026-10-13 的实测，**那是史值**；今天 `SecurityConfig.java:210`/`MockSecurityConfig.java:225` 的规则我逐字读过没变，但"没变"不等于"实测过"。 |
| **U4** | `VRN07` 要的「实名未认证 + birth_date NULL」专号是否已被谁偷偷铺进库 | DB 读权限（本程未连库） | 我只能证 `scripts/build-demo-accounts.mjs` 没有铺它（关键词 0 命中），且门今天仍报 `UNCOVERED 次要20\|VRN07 缺=login`（`realcov-before.log:98`）⇒ **覆盖面上它确实还没被销**，但库里有没有专号是另一件事。 |
| **U5** | 「把更多产物输入折进戳」之后到底会过期多少条 | 一次全量 real 重建 + 重跑覆盖门（本程没有构建权限指令） | N3 我给的 0.008% 是**直接量出来的**（2392 B / 30,090,489 B），但"折进去会让 196 条里多少条掉进 EXPIRED"我算不出来，只能给"成批"这个定性。若你倾向 (a)/(c)，这条要先补一次试算。 |

---

## 9. 一句话版本

**23 条旧账全部复验为仍开放（今天四支提交没关掉任何一条），本程再加 7 条新的 ⇒ 30 条待裁；
其中真正卡住腿的只有四刀：A5（村口拦截口径）、A4（VIP 原判据）、N1（谁有权写 `coverageEffect:"revalidated"`——
没有它，A4/A5 裁完还得再等一轮才涨覆盖）、A6（游客轴豁免）。
其余里：E1 我已替你核出机器块那个 `half_closed=4` 是自证的、散文的 7 是过期数，你只需点头"以机器块为准"；
C-2 那条约影响 99 行的口径根本不在名册上（`status=open` 实测 0 条），这一条建议优先补进名册；
另有 8 件已落地被我划掉——包括周报里"WS `connect()` 未接线"与"LBS Phase 2 零进展"两条其实已经过期的陈述。**

---

## 10. 待裁名册做成机器可读块（2026-10-16；状态对账，§0–§9 各节原文一字未动）

**为什么要加本节**：`scripts/qa/gen-round8-report.mjs` 有两条路——册子里有 `PENDING_RULINGS_BEGIN/END` 块就**优先读块**
（`source=roster`），没有就退回**数 `## N.` 标题**并明印「⚠ 未读名册」。本册上线前实测的就是退回那一发：
`GENREPORT_SECTION6_SELFCOUNT … source=heading-classification`、分桶判 10 条，而盘上真有 30 条待裁 ⇒
那道"防裁定清单悄悄塌掉"的守卫是好的，但它在这里是**瞎的**：本册体例是"分组标题 + 表格里逐条判决"，
标题分类器读不到表格里的条目。修的一侧是账本，不是生成器（生成器一字未动）。

**本块的算术**（逐节复点，与 §9 那句「30 条待裁」一致）：§2 A 组 11 ＋ §3 B 组 4 ＋ §4 C-2 的 1 ＋ §5 E 组 5
＋ §6 G 组 2 ＝ **23**（= v3.7 传下来的那 23 条，见本册开头第 3–4 行），再加 §1 本轮新挡下来的 N1–N7 ＝ **30 条待裁**；
另 §7 已落地 **8** 件、§8 无法判定 **5** 件。⇒ 名册共 **43 行**。

**三态词表怎么落**（生成器只过 `open`/`half-closed`/`closed`，没有第四态，也不该造一个）：
- §3 那 4 条本册自己写的就是 half-closed ⇒ `status=half-closed`；
- §7 那 8 件已量到落点 ⇒ `status=closed`，落点证据写进 `basis`；
- 其余 26 条待裁 ⇒ `status=open`；
- §8 那 5 条无法判定 ⇒ **`status=open`**（它们没被裁掉，也不该被算成已闭），缺什么写进 `premise`、
  "我不想假装的部分"写进 `basis`。
⇒ 于是 **`open=31`（待裁 26 ＋ 无法判定 5）、`half_closed=4`、`closed=8`，31+4+8=43**。
`open=31` 与本册「30 条待裁」那句**不矛盾**：30 条待裁里有 4 条是半闭（不计 open），而 5 条无法判定是**另一叠**，
按词表只能挂 open。谁要是拿 31 去对 30，就该看到这行解释，而不是去改名册。

**id 口径**：v3.3 那份名册用的是 `decisions#1…#29c` 与 `r10new#A…E`，数字最大到 29 ⇒ 本册从 `decisions#30` 起接，
两册同读时不撞号。§3 B 组那 4 条与 v3.3 名册是**同一条裁定**（本册逐条给了 v33 的行号），所以沿用其原号
（5 / 6 / 9 / 14）不重新编号——这是同一件事的两次复验，不是两条账。每条把自己的本册锚点（A5、N3、H1、U4…）
写进 `title`，人可回溯。

**字段装不下的部分（诚实交代，不硬塞）**：名册只有 `status`/`title`/`options`/`premise`/`basis` 五个字段，
本册 §0 总表的「它卡住什么」「不裁的代价」两列、以及每条的「判后动作」都**没有对应字段** ⇒ 只把"卡住什么"
压进 `title`，其余仍以 §0–§9 原文为准。本块不新增、不改写、不重排任何一条裁定，也不替你选任何一项。
§7 末尾那三条"其实不算裁定"的（工作树分批提交评审、10358 枚 lint warning 清扫、A11 的执行器选项 (b)）
**故意没进名册**：它们不是裁定项，塞进来就会把 30/8/5 的算术改坏。

```machine
PENDING_RULINGS_BEGIN producedBy=decisions-v38-roster-writer head=4541fec0
RULING id=decisions#30 status=open title=A1（R3-03）未成年/未实名那一态怎么测 options=(a)授权铺测试专号|(b)VRN07 表单分支降级为组件级单测并记需 DB 授权|(c)维持挂账 premise=unchanged basis="decisions-v38.md §2 A1：门点名 NO_A_JUDGED 次要20|VRN07（realcov-before.log:34）与 UNCOVERED 次要20|VRN07 缺=login（:98）；scripts/build-demo-accounts.mjs（untracked）全文只按学校/校区建演示号，minor/birth_date/实名 零命中"
RULING id=decisions#31 status=open title=A2（R3-10）计划件承诺的 storage 明文嗅探算承诺还是算不存在 options=(a)73 页全量补做|(b)高敏页抽样|(c)计划件正式改写为安全动作抽测并入册 premise=unchanged basis="decisions-v38.md §2 A2：承诺原句仍在 reports/audit/ui-audit-2026-10-09/tour-plan.json 的 capture[3]；security/ 交付件 73 份（本程数）键集合只有 route/securityActions/guardPolicy/notes，含 storage 的 0 份；台账 securityMethod 自述已收窄 ⇒ 与计划件不同口径"
RULING id=decisions#32 status=open title=A3（R3-11）console 判据上限：换载具还是承认重放路径就是天花板 options=(a)立项换载具|(b)正式承认重放路径=判据上限并回写计划件|(c)维持现状 premise=unchanged basis="decisions-v38.md §2 A3：tour-ledger.json 顶层 consoleOriginal 自述「73/73 全 0 字节（通道失效未采到）……重放加载路径 console 为可达上限」，但没有任何一处把它写成判据上限的裁定"
RULING id=decisions#33 status=open title=A4（F06）VIP 账单页 VB03 原判据重测还是封存结案 options=(a)real/showcase 开 membershipEnabled 重测本体|(b)以封存弹回结案|(c)showcase 代测本体、real 只证封存|(d)维持挂账 premise=unchanged basis="decisions-v38.md §2 A4：apps/client/src/config/feature-flags.ts:40 membershipEnabled=false（声明在 :15）；realcov-before.log:82 VOIDED 次要22|VB03 待拍板=F06、:83 明写算判过靠的是替换判点、原判据 MP-R2-次要22-010 仍部分开放"
RULING id=decisions#34 status=open title=A5（REAL-VI34-04-Q）资料完成度拦截对村庄广场适不适用——四条腿的共同前提 options=(a)放行，修 profile-guard.ts:18 后按七态重跑 VI34|(b)维持拦截，VI34 判据改成拦截页行为断言、另用完整身份测七态 premise=unchanged basis="decisions-v38.md §2 A5：两条 VOIDED 都挂它（realcov-before.log:80,81）；本程实跑 emit-open-items.mjs 得 decision:1，唯一一条即 MP-R3AUDIT-VI25-VI34-PARKED-001（需裁决，REAL-VI34-04-Q 未拍板）⇒ v3.7 那句 decision 桶 7→0（decisions-v37.md:246，史值）已被推翻；apps/client/src/guards/profile-guard.ts:14-19 LOCKED_PAGES 含 ROUTES.TAB.VILLAGE、:33 人话名村口/讨论圈，而 village/index.vue:35 只 import ensureCertified"
RULING id=decisions#35 status=open title=A6（GUEST-VERB-Q）只读注入动词要不要豁免 strict-verbs options=(a)豁免 networkFault 的 fail-all/record 让游客轴照跑|(b)维持拒发并把 OT06/OC09 收敛为 login 单轴、销游客轴欠账 premise=unchanged basis="decisions-v38.md §2 A6：scripts/qa/r-exec-cli.mjs:409 仍把 networkFault 列为任何模式都发不出、:488 verbRefusal()、:150 STRICT_VERBS、:290 自测专门要求它继续被拒；账面 OT06/OC09 缺=login+guest（realcov-before.log:96,99）"
RULING id=decisions#36 status=open title=A7（V37-CAMPUS-PUBLIC）后端到底把 /api/v1/config/campuses 列入 permitAll 吗 options=(a)放 /config/**|(b)不放、维持客户端豁免|(c)只放 /config/campuses 单条 premise=changed basis="decisions-v38.md §2 A7：SecurityConfig.java:210 仍是 /api/v1/** → authenticated()，permitAll 白名单里 /config/** 只有 :145 的 /api/v1/config/legal；MockSecurityConfig.java:225 同形；行号相对 v3.7 漂移（史值 194/225）因 b5afba52 在 :189-197 插了 AUDITOR 四条写方法规则。客户端半边已落 ⇒ 射程比 v3.7 小（本册 §7 H1）"
RULING id=decisions#37 status=half-closed title=A8（V37-NAVTO-SCOPING）--navto-open 按整条腿还是按单步生效 options=(a)接受旗标级并要求每行回显 open form|(b)改回步级，step.via 优先、旗标只作总闸|(c)维持现状 premise=unchanged basis="decisions-v38.md §2 A8：scripts/qa/exec-capabilities.mjs:352-363 resolveOpenForm(step,opts) 只读 step.page 与 step.query、从不读 step.via，:356 是纯旗标闸；r-exec-ws.mjs:794 传 Object.assign({}, step, {query})、:812 读 step.via 只用于生成一句备注不改分发"
RULING id=decisions#38 status=open title=A9（V37-MS06-REFUSAL）首屏网络判点缺口该不该把整条腿扣住（现状=拒发） options=(a)维持整腿拒发|(b)降级为发但标 NOT-EVIDENCED|(c)逐案豁免 premise=changed basis="decisions-v38.md §2 A9：r-exec-cli.mjs:1403 把 netFaultFirstLoad 作第五条诚实的不进 VERB_RULES，:394 自述实测全判据台命中 3 条 VI34/AC10/MS06（v3.7 只点了 MS06 ⇒ 影响面比原述更大），:287 自测专门断言全旗标下仍拒发"
RULING id=decisions#39 status=open title=A10（V37-R309-DISPOSITION）匹配卡那条判夹具不可达还是维持产品缺陷 options=(a)改判 NOT_SHOOTABLE（夹具/态不可达）|(b)维持产品缺陷（先给一条与素材 200＋三分支 v-if 都不矛盾的机制说明）|(c)撤行 premise=unchanged basis="decisions-v38.md §2 A10：行在 reports/audit/round-6/issue-matrix.md:201 MP-R3AUDIT-DISCOVER-MATCHCARD-BLANK-001（R3-09）；本轮未重拍 ⇒ 沿用 v3.7 三条反对读数（素材 200/47595B、三分支 v-if、配对帧实为 login 页）但不当现值"
RULING id=decisions#40 status=open title=A11（V37-NTH-TAP）点不准同名多枚钮这笔账现在还剩什么 options=(a)继续补作者侧唯一类名并想法拉进组件子树|(b)补执行器（先证坐标 tap 可用）|(c)判据降级为接线正确并写清换了什么 premise=changed basis="decisions-v38.md §2 A11：round-7/c21-executor-capability-matrix.md:308 G-14 25 stamped rows、:307 G-13 42 stamped；RelationshipCTA.vue:43/52/58/64 四枚唯一修饰类已落、产物 dist/build/mp-weixin-real/.../RelationshipCTA.wxml 里同名类出现 1 次 ⇒ G-13 取代 G-14 成主瓶颈，选项 (a) 对 CTA 一族已完成（本册 §7 H2）"
RULING id=decisions#5 status=half-closed title=B5（.json.json 双后缀）要不要做带迁移的重命名 options=C已选定（接受绑定采集机并把那句写死进模板）；剩 .json.json 双后缀未改——做带迁移重命名（42 枚件＋458 处引用一起走）还是永久接受 premise=unchanged basis="decisions-v38.md §3：reports/** 里文件名以 .json.json 结尾的件 42 枚（本程 find 计数）、文本引用 458 处（scripts/qa ＋ reports/audit/round-7）；v33 名册行 decisions-v33.md:1053"
RULING id=decisions#6 status=half-closed title=B6（prod-sanitize.sql）COMMIT 由谁在哪个库执行 options=分环境处置已采纳（生产/准生产清、开发库可留），剩 COMMIT 要所有者在目标库执行；或正式判本轮不清 premise=unchanged basis="decisions-v38.md §3：database/sanitize/prod-sanitize.sql 在盘 9298B（本程 ls）；v33 名册行 decisions-v33.md:1054；本包唯一一条我无法替你判断做没做的——它只在目标库上才有状态"
RULING id=decisions#9 status=half-closed title=B9（高 dpr 帧两行）要不要按台账词表标免检 options=B已选定（接受长期 NOT_SHOOTABLE 并记理由）；剩 HOME-005/TMP-TOUR-R2-004 两行未标免检——标 2 枚还是继续占未结案 premise=unchanged basis="decisions-v38.md §3：issue-matrix.md:98 状态仍「已修复待复验（去向：closer=待人裁决…）」、:180 仍「待修复（去向：closer=closer 无记录…）」；全表 免检 命中 3 处逐处都是反义用法（:61/:97）⇒ 免检标记一条都没落；v33 名册行 decisions-v33.md:1057"
RULING id=decisions#14 status=half-closed title=B14（溯源集合）要 11 还是 12——两枚 gitSha 算不算生产者 options=A维持（11 是诚实数，已按此落定）|B把派生常量命名为 GIT_SHA 让它重回集合 premise=changed basis="decisions-v38.md §3：v33 名册行 decisions-v33.md:1061；但盘上已有 B 的形状——scripts/qa/r-exec-cli.mjs:786 GIT_SHA、:921 行上同时写 gitSha＋gitShaSource，scripts/verify-device-leg.mjs:228-231 写 gitSha＋gitShaScope=provenance-only ⇒ 真问题从要不要改名变成这两枚算不算、集合是 11 还是 12"
RULING id=decisions#41 status=open title=C-2 VIS 类条目能不能用源码结构谓词结案（一次定原则） options=(a)允许——凡帧里不存在可对照的机器物件即可用谓词结案（现状即此）|(b)分档——结构/令牌/i18n 可用谓词，主张看起来对齐/间距/层级的仍必须帧或量测（本册建议）|(c)不允许——VIS 一律要帧，99 行重新排队拍摄 premise=unchanged basis="decisions-v38.md §4：这条口径从没被裁过——decisions-v33.md 里 grep 源码谓词|源码级判点 0 命中，其机器名册 :1049-1073 里 open 行 0 条（只命中 :1092 那句守卫说明）⇒ 它一直悬在 decisions-v37.md 与 imggrid-lane.md 之间；本程按列切分 issue-matrix.md 全部以 | MP- 开头的行共 245 行（生成器口径是 主表=179 未结案=16，两套数别混用），其中状态以「已修复（源码级」开头的 99 条"
RULING id=decisions#42 status=closed title=E1 decisions-v33 的散文计数与机器块计数以谁为准 options=(a)以机器块为准（本册已核出它是自洽的那一份）|(b)以散文为准 premise=unchanged basis="decisions-v38.md §5 E1：decisions-v33.md:1072 机器块尾行 open=0 half_closed=4 closed=16 与同文件 :1108 散文 open=0 half_closed=7 closed=13 两处并存、原样未改；本程另核块内 half-closed 恰 4 行（:1053 :1054 :1057 :1061）⇒ 机器块的 4 是对的、散文的 7 是 10-06 当时的状态"
RULING id=decisions#43 status=open title=E2 12 行 NAV_FAIL 的 landing 历史数据要不要回头修 options=(a)按 notes 的实测落点回写|(b)永久保持只靠守卫不采信 premise=unchanged basis="decisions-v38.md §5 E2：本程逐行数 tour-ledger.json 含 NAV_FAIL 的路由 12 行，逐行 consoleRecap.landing 恒等于请求路由而 notes 写另一落点（pages/login/index 的 notes 落点=pages/discover/index、subpackages/vip/bills 的 notes 落点=pages/profile/index、subpackages/campus/campus/index 的 notes 落点=…hub）；清单导出 .zcode/tmp/lane-ruling/a2a3e.txt:24-36；⚠ 同账 fixlane[2] CON-EV-01 自述生成器已在 2026-10-10 修，但历史 12 行一字未动"
RULING id=decisions#44 status=open title=E3 「73/73 console 全 0」要不要在账面上标成未采到 options=(a)统一标未采到（配合 A3 的选择）|(b)不标 premise=unchanged basis="decisions-v38.md §5 E3：本程按字段数——consoleRecap 在 73/73 行都有 lines/errors/warns/landing/file 五键，三枚数值行各 73 条、非零 0 条、取值集合只有 [0] ⇒ 台账头部那句通道失效未采到与这些 0 之间的区别账面完全读不出来"
RULING id=decisions#45 status=open title=E4 VB03 已判过 vs 原判据未测的三处相反记账（就是 A4 的账面半边） options=A4 裁定后一起改（把 fixlane[0] 那句已判过按判词改写、原文留档）|或不改 premise=unchanged basis="decisions-v38.md §5 E4：tour-ledger.json fixlane[0] REAL-VB03-03 的 ledgerEffect 原文写 VB03=已判过（EXECUTED）；同一本账 corrections[2] 写原 FAILED 出列作废（判据/配方错误）；覆盖门 realcov-before.log:82 判词 off-list+voided+re-run-pending、:83 原判据 MP-R2-次要22-010 部分开放 ⇒ 三处三个说法，且这句已判过正是 §6 G1 说的 prose 洗不成绿（它没带 coverageEffect）"
RULING id=decisions#46 status=open title=E5 tour-ledger.json 是活账（去掉 round 戳）还是轮次快照 options=(a)活账：删掉 round/generatedAt 头部自述|(b)轮次快照：每轮另存一件 premise=unchanged basis="decisions-v38.md §5 E5：tour-ledger.json 顶层仍是 round: 1、generatedAt 2026-10-09T22:25:53.827Z，同一件正文有 routes=73/corrections=11/fixlane=5（本程数），而 fixlane[0] 行上带 band=real@f0677920、corrections[4] 带【回写落定 2026-10-13·ledger 车道】⇒ 头部比正文晚两轮以上"
RULING id=decisions#47 status=open title=G1 加不加「红已撤、绿未证、待重判」这一档 options=(a)新增一档 撤销待重判（要同改 normalize-ledger-status.mjs 的 VOCAB、emit-open-items.mjs 的 OPEN_RE、verify-ledger 词表校验三处）|(b)维持权宜写法|(c)拆两档：状态=撤销 ＋ 独立的欠重跑字段（本册建议，它和 N1 要的 coverageEffect 是同一个机读字段） premise=unchanged basis="decisions-v38.md §6 G1：scripts/qa/normalize-ledger-status.mjs:30 VOCAB 共 14 档、没有 撤销待重判；主表里状态写作「未取证（红已撤…」的行 1 条（PFI25 一族）；括号里那句中文不被任何门解析——verify-real-coverage.mjs:448-449 只认 prose/coverageEffect ∈ {…} ⇒ disputed、coverageEffect=revalidated ⇒ 唯一能放回。与 N1 是同一堵墙的两面：G1 缺怎么写、N1 缺谁能签"
RULING id=decisions#48 status=open title=G2 已修复待复验 一词三义要不要拆 options=(a)拆成 已修复待带内复验／已修复待静态复量 两档（动词表三处）|(b)保留一档但强制处置列按固定格式写载体命令（门可解析；本册建议先做，(a) 与 G1 同批）|(c)不动 premise=unchanged basis="decisions-v38.md §6 G2：按 §4 说明的那 245 行全集切列，状态以 已修复待复验 开头的行 7 条（6 条带「（去向…）」括注、1 条裸写）；同集 保留-判据不成立 39 条、已修复（源码级…）99 条、并入-不另立案 26 条作对照量级；三种义务（带内重跑／两档行为复测／静态复量）仍挤在同一词里 ⇒ 账面派不出车道，也没有复验做完没有的机器判据"
RULING id=decisions#49 status=half-closed title=N1（REALCOV-VOIDED-4）谁有权在台账行上写 coverageEffect:revalidated、按什么证据写 options=(a)授权 QA 车道在重跑落第一条有效判决行后自行写该字段（须同带 run 目录指针）|(b)只由用户签字，每条要回 COVERED 的行排队等|(c)改门形状让当前 real 带一条 EXECUTED 且判点为绿自动等价 revalidated（等于销毁 VOIDED 桶）|(d)PFI25 特判按 (a)、其余三条按 (b)；本册建议 (a)＋(d) 同一把尺并把写入本身做成可核判点 premise=unchanged basis="decisions-v38.md §1 N1：REALCOV_VOIDED=4 四条逐行点名在 .zcode/tmp/pre-wave-20261015/realcov-before.log:79-82、守恒 28+196+5+4+3=236/236（:100）、结论 REALCOV_RESULT=FAIL（:103）；:84 原话只有一个形状有用；工作树 scripts/qa/verify-real-coverage.mjs:449/:705 复核仍成立、正向对照自测 :734-736；tour-ledger.json 的 corrections 11 行＋fixlane 5 行里 0 行带该字段（本程逐行数）；第四条 :79 PAGES-PROFILE-INDEX|PFI25 无任何 needsUser 令牌"
RULING id=decisions#50 status=open title=N2（ADMIN-FEEDBACK-NAV）反馈工单页要不要从后台导航里放出来 options=(a)放出来：新增一支前向迁移把 menus id=204 的 hidden 置 0 并同步改 menu.ts:257（两处不同步会让 mock 档与 real 档导航长得不一样）|(b)维持直连 URL 专用|(c)折中：只放给 SUPER_ADMIN/ADMIN、AUDITOR 不放|(d)先补读 200／写 403／mock 404 三格实跑断言再回来裁；本册建议 (d) 然后 (a) premise=unchanged basis="decisions-v38.md §1 N2：路由在 apps/admin/src/router/index.ts:49；菜单行被按死在 apps/admin/src/stores/menu.ts:257（同批 202/203/205/207/208，:255-260）；这是 V2026.10.14.0003__reshape_admin_menus.sql:113/:122 的主动决定（:5 隐藏而非删除、路由仍可按 URL 直达；:43-44 声明可重跑自愈）；menu.ts:42-46 自述后端不按 hidden 过滤、真值在库里；⚠ 四份 wave 日志（admaud.log:21 等 17/17/15/30）里 tickets/feedback 零命中 ⇒ 那 79 项断言没有一项读过工单端点"
RULING id=decisions#51 status=open title=N3（BAND-STAMP-BOUND）新鲜度那把尺只哈希 config/env.js 的 2392 字节，接受还是折宽 options=(a)把 app.js＋app.json＋主包 pages 树（或全量清单哈希）折进 sha8——今天 COVERED=196 会成批过期、需一次全量 real 重拍|(b)接受这把界并把它写成机读事实（在 REALCOV_BAND_STAMP 旁固定印覆盖面 2392B/30090489B≈0.008%、代码/素材重建不注销覆盖）|(c)双戳：band 管归属＋contentStamp 管注销|(d)触发式重扫，只点名提示不撤覆盖；本册建议 (b) 立刻做、(c) 排下轮 premise=unchanged basis="decisions-v38.md §1 N3：尺定义 scripts/qa/artifact-band.mjs:14-22；本程直读现算 apps/client/dist/build/mp-weixin-real/config/env.js=2392B、sha8=f0677920，与 realcov-before.log:85 REALCOV_BAND_STAMP=real@f0677920 逐字一致；该 real 产物目录 2150 文件/30,090,489B ⇒ 99.992% 的字节不参与新鲜度判定；env.js mtime=2026-10-15T16:00:02Z 而同戳已在 decisions-v33.md:1052/:1059/:1065 三处 2026-10-06 判决行上 ⇒ 重建而戳不动复现到了；尺不是死的：realcov-before.log:89-91 三条 EXPIRED 带着另一枚 real@ed1cd82c"
RULING id=decisions#52 status=open title=N4（BAND-NAMESPACE-RULE）哪个生产者拥有哪种戳，这条规矩落在哪才算持久 options=(a)把尺的定义钉在 artifact-band.mjs 头部为唯一算法权威，并在门清单加一条每个产 band 的文件必须 import 它、不许自算的静态普查|(b)维持现状（v3.8 DSL 名册块＋运行时交叉核对＋device-leg 自测），只在 verify-device-leg.mjs 入库时把三处连起来|(c)让门自己拒绝形状对但尺源可疑的行（行上加 bandSource 字段，四个生产者都要加）；本册建议 (a)，且这一轮必须先把 scripts/verify-device-leg.mjs 入库 premise=unchanged basis="decisions-v38.md §1 N4：scripts/verify-device-leg.mjs 现在是 untracked（git ls-files 不认）；其 :49 import readApiMode、:300-303 现算 band、:228-231 把 git HEAD 降级为 gitSha＋gitShaScope=provenance-only；自测 scripts/qa/test-device-leg-tally.mjs:17/:182-190/:202-205/:214-215（含修复前的形状必须被读成 stale 的负例）经 run-qa-selftests.mjs:25 收进 run-final-verify-v33.sh:95；规矩另活在 .zcode/workflows/miniprogram-ui-audit-v38.dwf.ts:313-332 与运行时对尺 :689-715（对照 v3.7 那枚旧尺 miniprogram-ui-audit-v37.dwf.ts:552-557）"
RULING id=decisions#53 status=open title=N5（LBS-CLIENT-CONSUMPTION）附近要不要改成真 GPS 半径口径（后端已就绪，客户端 0 调用点） options=(a)切：附近页主数据源改 /location/nearby、校区池退为无授权时的兜底（要授权文案、拒绝兜底态与距离观感变更）|(b)并：校区维度不动，另开按距离排序/筛选开关（默认关）|(c)不切，只把后端端点标为未消费；本册建议 (b)，且无论选哪个周报那句零进展都要更正 premise=unchanged basis="decisions-v38.md §1 N5：后端已建齐——entity/User.java:191-196 经纬度列、GeoService.java:76 findNearby 与 :79 夹到 1–20km、:81-83 bounding box 预筛、:99 圆内二次筛、:104 按距离排序、:123-127 ADR-16 模糊化、LocationController.java:73 /nearby ＋ @RateLimit；客户端 apps/client/src 里 location/nearby 与 radiusKm grep 0 命中，附近页走校区池 pages/nearby/index.vue:29/:74-77/:100、:39 只 import reportLocation，定位能力本身在 utils/location.ts:61；与周报 报告/汇报/恋爱小程序技术部周四汇报_2026-10-15.md:20 相反"
RULING id=decisions#54 status=open title=N6（LOVE-CONSULT-CONTENT）恋爱咨询内容谁供给、什么形态 options=(a)产品给出 H5 内容源（自建课程页／第三方嵌入／静态图文），QA 再按有内容补判据|(b)本期不供给：UI 层摘掉该入口或标敬请期待，并从 R12 终验清单划出去|(c)维持现状（壳在、URL 空）；本册建议 (b) premise=unchanged basis="decisions-v38.md §1 N6：apps/client/src/config/content-pages.ts:4 自述内容页（附近的人／MBTI／恋爱咨询课程）支持后台配置 H5 URL、:22 字段注释恋爱咨询课程 H5 URL（R4-00243：空默认，配置下发后填充）⇒ 壳与配置通道都在，缺的只是一条真实 URL 与其背后内容；周报 …_2026-10-15.md:22 把它列进 R12 遗留终验"
RULING id=decisions#55 status=half-closed title=N7（LINT-GATE）lint 要不要进门禁、第一刀门限定多少 options=(a)只把 3 枚 error 进门（--quiet 口径，warnings 不计入门色，warning 治理不设门槛按周推进）|(b)进门并设 warning 预算（如 ≤10358 且单调不增，超预算即红）|(c)继续不进门，只在终报印一行读数；本册建议 (a) premise=unchanged basis="decisions-v38.md §1 N7：命令口径 package.json:15，本程只跑客户端层 eslint apps/client/src ⇒ ✖ 10361 problems (3 errors, 10358 warnings)（件：.zcode/tmp/lane-ruling/lint.txt）；三枚 error 在 apps/client/src/env.d.ts:42:24、env.d.ts:49:23（no-explicit-any）、subpackages/profile-extra/profile/other.vue:181:7（no-constant-condition）；scripts/qa/run-final-verify-v33.sh 里 lint 零命中 ⇒ 根本不在门里；10358 枚 warning 的清扫是工程活不需要裁定（本册 §7 末尾）"
RULING id=decisions#56 status=closed title=H1（A7 的客户端半边）401 不再静默回落 mock options=无需裁定：已落地，从包中划掉 premise=resolved basis="decisions-v38.md §7 H1：apps/client/src/config/feature-flags.ts:29 接口声明 mockOn401Enabled、:47 默认 false，由 73988a95「fix(client): 401 不再静默回落 mock 数据（默认关，加 mockOn401Enabled 旗标）」带入 ⇒ A7 只剩后端 permitAll 那半边"
RULING id=decisions#57 status=closed title=H2（A11 的一半）CTA 一族作者侧唯一类名 options=无需裁定：已落地，从包中划掉 premise=resolved basis="decisions-v38.md §7 H2：apps/client/src/components/profile/public/RelationshipCTA.vue:43/:52/:58/:64 四枚带 --like/--hello/--whisper/--follow 修饰类；编译产物 apps/client/dist/build/mp-weixin-real/components/profile/public/RelationshipCTA.wxml 里 relationship-cta__btn--like 出现 1 次（本程 grep 计数）；另 components/village/PostCard.vue:71 现有 defineExpose({ noop, handleLike }) ⇒ v3.7 §A11 那句方法名根本不在产物里只对 CTA 一族过期"
RULING id=decisions#58 status=closed title=H3 v3.7 §C-1b 那条「197 门禁 voided 分桶已闭」 options=无需裁定：效果已量到盘上，复验不必再等人 premise=resolved basis="decisions-v38.md §7 H3：载体在 reports/audit/round-6/issue-matrix.md:198 MP-R3AUDIT-GATE-VOIDED-BUCKET-001（注明 commit bdef64ef 给门加 voided/pending 分桶）；本轮读数 realcov-before.log:78 REALCOV_VOIDED=4、:100 四项守恒 28+196+5+4+3=236/236"
RULING id=decisions#59 status=closed title=H4 周报那条「WS connect() 真实接线仍未做」 options=无需裁定：已接线，从待产品决议清单划掉 premise=resolved basis="decisions-v38.md §7 H4：apps/client/src/stores/session.ts:298-309 syncRealtimeConnection()（已登录＋非 mock＋有 token ⇒ :305 wsClient.connect(token)，其余分支 :300/:307 disconnect()），三处调用点 :585/:659/:718（本程 grep 全量）；残留的是消费面——wsClient.subscribe 在业务代码 0 处（只在 constants/api-params.ts:17 示例注释里），推送经 services/websocket/store-dispatch.ts 写 store"
RULING id=decisions#60 status=closed title=H5 周报那条「LBS Phase 2 本周零进展」 options=无需裁定：服务端那半已完整，条目缩小为客户端口径（进 N5） premise=resolved basis="decisions-v38.md §7 H5：四条出处见本块 N5（User.java:191-196、GeoService.java:76/:79/:81-83/:99/:104/:123-127、LocationController.java:73）；原陈述在 报告/汇报/恋爱小程序技术部周四汇报_2026-10-15.md:20"
RULING id=decisions#61 status=closed title=H6 周报「后台 RBAC 多级权限设计评审」的第一层 options=无需裁定：第一层已落地，剩下的多层圈层数据域是工程＋一次设计评审 premise=resolved basis="decisions-v38.md §7 H6：b5afba52＋9403369d 落了第三角色 AUDITOR 读写分离——SecurityConfig.java:189-197（POST/PUT/PATCH/DELETE 四类写规则声明在通用 admin 规则之前，:197 通用规则含 AUDITOR）、MockSecurityConfig.java:216（mock 档 admin 仍 hasRole('ADMIN') ⇒ AUDITOR 只在 real 档存在）、迁移 database/flyway/sql/V2026.10.14.0001__add_auditor_role.sql、实跑背书 .zcode/tmp/pre-wave-20261015/admaud.log:21（17/17，含读放宽/写 403/超管对照/跨校区拦截四族）"
RULING id=decisions#62 status=closed title=H7 反馈工单的接线本身 options=无需裁定：接线已落地；导航可见性仍在 N2 premise=resolved basis="decisions-v38.md §7 H7：9403369d 提交说明自述 api/feedback.ts＋views/content/Feedback.vue 改吃后端新增的 tickets 信封；git show --stat 9403369d 里 apps/admin/src/api/feedback.ts +164 行、apps/admin/src/router/index.ts ±19 行、zh-CN/en-US 各 +255/+256 行；CapabilityOverview.vue 那条「没有任何 /api/v1/admin/feedback 路由」的断言已按 @file:line 普查更正"
RULING id=decisions#63 status=closed title=H8 R12 三项里的「圈子空态 CTA」 options=无需裁定：两条在册行都已按判据结案 premise=resolved basis="decisions-v38.md §7 H8：reports/audit/round-6/issue-matrix.md:46 MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-001 状态 保留-判据不成立；同文件 :182 …-CIRCLE-HOME-003 状态 撤销（原判 P3）＋保留-判据不成立 ⇒ R12 遗留实际只剩两项：profile 未登录头部叠印（本块 U2）与恋爱咨询（本块 N6）"
RULING id=decisions#64 status=open title=U1 反馈工单列表现在到底有几条（无法判定，派活口径给的 total=0 没有盘上出处） options=没有可选项可裁：这条缺的是读数不是选择——要么给一次带库实测，要么正式记未取证 premise=缺一个活的 8080（real profile）＋Redis 6379；本程按指令没有启动/停止任何服务 basis="decisions-v38.md §8 U1：只在 database/flyway/sql/… 与 tables.txt:33 确认 feedback_tickets 表存在，没有任何一份盘上读数给出 total ⇒ 「没人见过它带内容渲染」这句只能写成未取证，不能写成已证伪；N2 的 ③ 同条"
RULING id=decisions#65 status=open title=U2 R12 的「profile 未登录头部叠印」终验（无法判定） options=没有可选项可裁：源码级判点买不到这一帧——要么排一次真机/IDE 重拍，要么把它记成不可终验 premise=缺一次真机或 IDE 帧重拍（要占 UI 租约；本程按指令未碰租约） basis="decisions-v38.md §8 U2：reports/audit/round-6/issue-matrix.md:41 那行状态是 已修复（源码级判点…），但行内处置自己写着「HEAD 已修，待下轮真机帧复验」⇒ 源码级判点只能证明 padding 走了 --statusbar 令牌，证明不了叠印没了——这正是本块 C-2（decisions#41）那条口径的活例子"
RULING id=decisions#66 status=open title=U3 A7 的两态实测（带 token 200／不带 401）今天是否仍成立（无法判定） options=没有可选项可裁：规则逐字没变不等于实测过——要么补一次带活 8080 的两态实测，要么把 10-13 那组读数永久标史值 premise=缺一个活的 8080（real profile）；本程未启停服务 basis="decisions-v38.md §8 U3：v3.7 在 decisions-v37.md:62-64 给过 2026-10-13 的实测，那是史值；今天 SecurityConfig.java:210 与 MockSecurityConfig.java:225 的规则本程逐字读过没变，但没变不等于实测过"
RULING id=decisions#67 status=open title=U4 「实名未认证＋birth_date NULL」专号是否已被谁偷偷铺进库（无法判定） options=没有可选项可裁：要么给一次 DB 读权限，要么维持覆盖面上的未销账 premise=缺 DB 读权限（本程未连库） basis="decisions-v38.md §8 U4：只能证 scripts/build-demo-accounts.mjs 没有铺它（关键词 0 命中），且门今天仍报 UNCOVERED 次要20|VRN07 缺=login（realcov-before.log:98）⇒ 覆盖面上确实还没销账，但库里有没有专号是另一件事（与本块 A1 decisions#30 同一条欠账的两个面）"
RULING id=decisions#68 status=open title=U5 把更多产物输入折进戳之后到底会过期多少条（无法判定） options=没有可选项可裁：若倾向 N3 的 (a)/(c)，这条要先补一次试算 premise=缺一次全量 real 重建＋覆盖门重跑（本程没有构建权限指令） basis="decisions-v38.md §8 U5：N3 给的 0.008% 是直接量出来的（2392B／30,090,489B），但折进去会让 196 条里多少条掉进 EXPIRED 算不出来，只能给成批这个定性"
RULING id=decisions#69 status=open title=Q1（RESHOOT-CREDIT）守卫弹回造成的 FAILED 算不算量到 options=(a)接受：FAILED 也是 JUDGED，弹回本身是被量到的产品事实，PC06/VB10 继续抵账（现 COVERED=198）|(b)不接受：这两行退回未取证并删除该腿目录（回到 196/3）|(c)接受但分档：抵账照计，行上另标 guard-bounce，使绿不被读成功能已验
PENDING_RULINGS_END open=28 half_closed=7 closed=9
```

⚠ 三条使用限制，免得这块被读成"权威且自动正确"：
① **本块由车道手写维护**，它不会自己跟着新裁定更新 ⇒ 下一位若替用户做了选择，必须回来改 `status`，
否则生成器会继续把它算进待办（宁可多报不可漏报）。
② 计数口径：**`open=28` 是本块逐行数出来的**（2026-10-17 复算：E1 裁定以机器块为准；期间 #42 闭案、#37/#49/#55 转 half-closed，新增 #69 Q1），它 = 待裁 30 条里除去 4 条 half-closed 的 26 条 ＋ 无法判定 5 条；
与本册 §9 那句「30 条待裁」不矛盾，与生成器按标题判的那个数**分母不同**（那个数读的是 `## N.` 标题，不是条目），
两者并存可比、不许互相冒充。
③ 每条 `basis` 只给"依据在哪"（一律指回本册自己的节与册内已抄的 `文件:行`），不复述正文、不上升成我没查过的代码主张；
`options` 里若写了"本册建议"，那是册子原本就有的建议，**不是裁定**。

**仍等你裁定（一条都没替你选；本节与上方名册块是本册唯一新增文字，§0–§9 各节原文一字未动）**
open 31 条 = 待裁里的 26 条（A 组 11、C-2 的 1、E 组 5、G 组 2、N 组 7）＋ 无法判定 5 条：
decisions#30 #31 #32 #33 #34 #35 #36 #37 #38 #39 #40 #41 #42 #43 #44 #45 #46 #47 #48 #49 #50 #51 #52 #53 #54 #55 #64 #65 #66 #67 #68
另 4 条半闭（沿用 v3.3 原号那四条，不计入 open）、8 条已落地（不计入待办）；守恒 31+4+8 = 名册 43 行。
算术与本册 §9 那句一致：11+4+1+5+2 = 23 条旧账，加本轮 7 条新的 = 30 条待裁。

## §11 用户 2026-10-16 的四项裁定（原样入账，不改写措辞）

> 来源：用户在本次会话的四个问答选项，逐字记录。本节不新增裁定、不替用户选任何一项，只把已选的记进册子。

| # | 问题 | 用户所选 | 本程落地状态 |
|---|---|---|---|
| 1 | 「apply the 31 pending rulings」按哪种口径执行 | 只落地我能自证的，其余待你选 | 生效范围限定：口径/工具类我自证落地；产品行为、DB 迁移、旗标、需新写权的仍留 open |
| 2 | E1（decisions#42）散文计数 vs 机器块计数以谁为准 | 归入第 1 项的可自证类 | **closed**：实现早已存在——gen-round8-report.mjs:187-188 取 PENDING_RULINGS 机器块、:318-319 §6 读它，本轮 §6 与名册同数（31=31） |
| 3 | N1（decisions#49）谁有权写 coverageEffect:"revalidated" | 授权：重跑有第一条有效判过读数时由我写 | **half-closed**：授权落地为工具 scripts/qa/apply-coverage-revalidation.mjs（band 戳运行时派生、量不到即拒、默认 --dry、行数守恒）；四个 VOIDED key 是否真有条合格读数由实测决定，不足额不写 |
| 4 | 设备腿证据件（exec-results.json 与帧目录）怎么处理 | 永久排除：继续 untracked，并在载具里加禁令 | **half-closed**：禁令要落在读索引的门上而不是 .gitignore（本仓规矩：屏蔽只是看不见，拦不住 git add -f），由车道实施并证明能红 |
| 5 | N7（decisions#55）lint 要不要进门禁、第一刀门限定多少 | 归入第 1 项：只把 error 进门、warnings 不计入门色 | **half-closed**：车道按实测错误数建 gate，两载具同登、prove-gates-can-fail 证可红 |
| 6 | 这 63 个本地提交要不要 push | 推之前先做一轮 security 扫描 | 未推。扫描完成前 push 保持禁止 |

口径修正：§0 与 §6 原来的「31 条待拍板」在本节之后是 28 条 open（closed 9、half-closed 6）。

### §11.1 按第 1 项口径自证的四条实测现状（只报现状，不替用户选）

| 裁定 | 盘上现状（我实测） | 我怎么处置 | 为什么不算「我已替你决定」 |
|---|---|---|---|
| A8 #37 --navto-open 作用域 | 现状已等于选项 (a)：每行都回显 openForm（r-exec-ws.mjs:1154、:1173），且 :1171 写明读法「没有 openForm=navto 就是没用过」 | half-closed，附上述行号 | 我没有选 (a)；是把「代码早就是 (a) 的形状」记下来。你若同意即闭案，若选 (b) 我照改 |
| E5 #46 tour-ledger 是活账还是快照 | 未落地任一选项：文件头仍写 round:1 / generatedAt:2026-10-09，而正文已长到后续轮次的读数 | 保持 open | 两个选项都会改历史账本的头，方向由你定 |
| G1 #47 加不加「撤销待重判」一档 | 未落地：normalize-ledger-status.mjs 里 grep 撤销待重判 命中 0 | 保持 open | 新增状态词要同改 VOCAB 与分类器，会动全账口径 |
| G2 #48 「已修复待复验」一词三义拆不拆 | 未落地：词表仍只一枚 已修复待复验，无 带内复验／静态复量 之分 | 保持 open | 拆档会改写既有行的状态列，属账本迁移，需你点头 |

另外 E3 #44 是**耦合项**：它的选项 (a) 原文写「配合 A3 的选择」，而 A3 未裁 ⇒ 不在可自证范围内，保持 open。
