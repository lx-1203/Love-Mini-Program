# 裁定包 v3.7（2026-10-13）—— 要你拍板的，和 QA 这边已经自己闭掉的

口径先说清：**这份册子里的条目不是"待修复的缺陷"，而是"没有一次人的决定就永远闭不掉的账"**。
每一条都写了：要裁什么、可选项、不裁的后果、被它阻塞的其它条目、出处。
数字全部当场从盘上量出来（量的方法写在括号里），没有一条沿用旧报告里的计数。

| 组 | 条数 | 谁能量 | 本册章节 |
|---|---|---|---|
| A 本轮分拣出的待拍板 **+ 本轮实测新增 1 条** | 7（6 条来自 `sort-round3.json` needsUser 数组长度，1 条来自 2026-10-13 带/不带 token 对照实测） | 只能你 | §A |
| B 历史裁定册里仍是 half-closed | 4（`decisions-v33.md` 机器块 1050–1072 行尾行 `half_closed=4`） | 只能你 | §B |
| C 「判据台未覆盖本条，缺的载体＝需人复判后指定」 | 17（`open-items.json` items 按 status 全文分组） | 你指定载体 / 你接受降级 | §C |
| D 其它桶：decision 7、frame 4、unverified 1 | 12（同上 bucket 计数） | 混合，见 §D | §D |
| E 账本自相矛盾（要定谁算数） | 5 处 | 只能你 | §E |
| F QA 已自己闭掉、你不用管 | 见 §F | 已完成 | §F |

---

## A. 本轮新冒出来的 6 条（v3.6 跑完三轮才提出，且三轮都没推进）

### A1 `R3-03` — VRN07 未成年形态要不要给它铺一个专用测试账号
- **要裁的**：`VRN07`（实名/未成年分支）唯一可行路径是往测试库铺「实名未认证 + birth_date NULL」的专号并回填 mint 凭据。产品 API 造不出这个态（`registerUser` 会抛 `MinorNotAllowedException`），所以要么授权铺数据，要么改判据。
- **可选项**：(a) 授权在测试库铺专号 → 四步照跑到判过；(b) 判据降级：verified 分支已实证结案，表单分支转组件级单测，欠账销账并记「需 DB 授权」；(c) 维持挂账。
- **不裁的后果**：`VRN07` 继续挂在覆盖门 `UNCOVERED` 里，每轮都重述一遍同一句话；它已经是**当前 5 条真档欠账之一**。
- **出处**：`reports/audit/ui-audit-2026-10-09/sort-round3.json` needsUser[0]；第 2 轮同案 `R2-VRN07-07`/`R2-04`。

### A2 `R3-10` — 巡检计划里承诺的「storage 明文嗅探」这一路，算承诺还是算不存在
- **要裁的**：`tour-plan.json` 的 security 通道写了「② 页面 onLoad 期 storage 键嗅探（token/身份键明文落盘）」，但巡检 prompt 从未要求采这一路，`security/` 目录三轮只有准入/入口/注入三项，storageKeys 零命中。**这是一个从未有人兑现的承诺**。
- **可选项**：(a) 补做嗅探探针、73 页全量落证据件；(b) 折中——只对高敏页（login/profile/wallet 等）抽样补嗅探，其余页口径收窄；(c) 正式把计划件口径改写为「安全动作抽测」，放弃 storage 明文嗅探主张并入册。
- **不裁的后果**：口径与交付件继续漂移，下一轮审查员还会拿这条计划件当判据、再报一次同一件事。**v3.7 已把这条通道标成 `deliverable=no` 并要求计划件如实写 NOT_SHOOTABLE**（缺陷 D10），但计划件正文属历史产物，改写要你的字。

### A3 `R3-11` — console 判据的上限：换载具，还是正式承认「重放路径」就是天花板
- **要裁的**：页面**真实加载期**的 console 原文在本仓任何一条既有通道下都拿不到（重放路径能拿，MARK 预验证据件 `console-mark-r2con01.log` 在案并已入册为能力边界）。
- **可选项**：(a) 立项换载具（真机/预览构建导出首帧 console）补全量采集；(b) 正式接受重放路径为 console 判据上限并回写 `tour-plan` 口径入册；(c) 维持现状（不建议——能力边界与计划件口径会继续各说各话）。
- **不裁的后果**：「73 页 console 零错误」这类主张只能落在重放路径上，而收割台账里 **73/73 行的 console 计数全是 0**（含 12 行状态与备注互斥，见 §E2）——全零既可能是真清白也可能是没采到，不裁就无法区分。

### A4 `F06` — VIP 账单页 VB03：开 flag 重测，还是以「封存弹回」结案
- **要裁的**：`membershipEnabled=false`（`apps/client/src/config/feature-flags.ts:29`）使 real/showcase 档下 VIP 页被弹回。VB03 已用**替换断言**（封存弹回）计入覆盖，但原判据本体（onShow 缓存不重拉、下拉回读差异）从未验证。
- **可选项**：(a) real/showcase 开 flag 后按原判据重测功能本体；(b) 以封存弹回判据结案；(c) showcase 代测本体、real 只证封存；(d) 维持挂账。
- **不裁的后果**：覆盖门把 VB03 算「已判过」，台账算「原判据未测」——**这是门禁与台账 4 处分歧里的第 ④ 条**（`R3-01`）。第 1 轮立项，至今悬挂。

### A5 `REAL-VI34-04-Q` — 资料完成度拦截，对村庄广场到底适不适用
- **要裁的**：real 带 30% 完成度用户进广场被拦，mock 带同页 268 元素全量渲染还有「先逛逛公开内容」的放行暗示。两种档两种行为，必须定一个是对的。
- **可选项**：(a) 广场放行——修拦截条件后按七态重跑 VI34；(b) 维持拦截——VI34 判据改成「拦截页行为断言」，另以完整度达标的身份另测广场七态。
- **不裁的后果**：**它是四条腿的共同前提**：VI34 七态重跑、VI25 夹具修复+重跑、`R3-NET-04`/`R3-08` 建议首条网络判点腿。已悬两轮，一条不裁四条不能动。

### A6 `GUEST-VERB-Q` — 只读注入动词要不要豁免 strict-verbs
- **要裁的**：`networkFault` 的 fail-all/record 注入不产生写操作，但 strict-verbs 把它一并拒发，于是 `OT06`/`OC09` 的游客轴补不出来。
- **可选项**：(a) 白名单豁免只读注入动词，guest 轴照跑；(b) 维持拒发——OT06/OC09 判据收敛为 login 单轴，欠账改记「缺=login」，guest 轴销账。
- **不裁的后果**：覆盖门继续按 `缺=login+guest` 记两条欠账，而这**两条腿永远不可能补**（不是能力不够，是规则不给跑）。

> **A 组内部有依赖**：A5 一旦裁了，A4/A6 的处置口径会跟着变；A2/A3 是同一件事（口径 vs 交付）的两个面。建议**先裁 A5、A6，再裁 A4，A2/A3 一起裁**。

---

### A7 `V37-CAMPUS-PUBLIC` — `/api/v1/config/campuses` 到底该不该公开（本轮实测新增）
- **要裁的**：客户端把校区列表当**公开配置**消费——`pages/nearby/index.vue` 在 `onLoad`(:159)/`onShow`(:166) 无条件调 `refreshSchools()` → `config/schools.ts:loadSchools()` → `services/config.ts:loadCampuses()`，代码注释自述前提是「校区列表是公开端点」；但后端两态鉴权配置都要求登录（`SecurityConfig.java:194`、`MockSecurityConfig.java:225` 的 `/api/v1/** → authenticated()`，permitAll 白名单里只有 `/config/legal` 与 `/location/ip-city`）。
- **本轮实测（2026-10-13 19:2x，backend=HEAD real profile）**：
  - 带 token `GET /api/v1/config/campuses` → **HTTP 200**，返回体是 `[{id,name,city}, …]`（纯公开参考数据，无 PII、无用户维度）；
  - 不带 token → **HTTP 401**。
  ⇒ 已登录真档用户不会被弹走；**「附近 tab 打不开」是 mock 档专属**（mock 会话不带可校验 token ⇒ 401 ⇒ http 层 `redirectToLogin` 强踢登录页 ⇒ 登录页见 mock 会话"已登录"又 `switchTab` 到 discover ⇒ 观测到的 `nearby→login→discover` 全链闭合）。测试装置侧已排除（探针不清 token、不用桥 open、不带 query）。
- **已做的（不需要你裁）**：产品诊断线给 `loadCampuses()` 加了 `skipAuthRefresh: true`，与 `services/auth.ts:454` 同口径——401 直接抛回调用方 `loadSchools()` 的既有静态兜底，不再驱动认证状态机。**这条修复与档位无关**：真档 token 过期时，一个纯装饰性的配置读也会把登录态用户整页踢到登录页，加了豁免后不会。
- **要你裁的是另一半**：后端是否把 `/api/v1/config/**`（或至少 `/config/campuses`）列入 permitAll。
  - (a) 放行：与客户端既有假设一致，mock 档从此可达，省一次兜底；代价是公开面变大（当前返回体实测只有 id/name/city）。
  - (b) 不放行，维持现状 + 客户端豁免（已做）：公开面不变，代价是 mock 档永远只能拿本地静态校区表，两档数据源不一致的账继续挂着。
  - (c) 放行但只放 `/config/campuses` 单条（不开 `/**` 通配）。
- **不裁的后果**：mock 档与 real 档的校区数据源不一致这件事会一直存在于账面上；而 §C 里若干"需真实模式才能验后端确实落库"的条目，其可跑范围也跟着这条走。

## B. 历史裁定册里剩下的 4 条 half-closed（每条只剩半轴）

| id | 标题 | 已定的那半边 | **没动的半边（要你一句话）** |
|---|---|---|---|
| `decisions#5` | 证据可携（帧与清单路径） | 选 C：接受绑定采集机并把这句写死进模板；绝对路径轴已自愈，HEAD 仍跟踪 10457 枚图片 | `.json.json` 双后缀未改——改它会与 `tapfix-merged.json` 里 56 条既有引用并存，属带迁移的重命名，不是顺手活 |
| `decisions#6` | 各轮写进库的测试数据要不要清 | 分环境处置已采纳：生产/准生产清、开发库可留；执行件 `database/sanitize/prod-sanitize.sql` 就绪（事务包裹、默认 ROLLBACK） | **COMMIT 要你在目标库执行**。不可逆数据操作按建议书由所有者执行；另外其 SQL 是「先 DELETE 再 INSERT」，`--apply` 前必须把 DELETE 作用域钉死在这一批 |
| `decisions#9` | 高 dpr 机型档巡检帧 | 选 B：接受长期 NOT_SHOOTABLE 并记理由 | 实现未做——`HOME-005`/`TMP-TOUR-R2-004` 两行还没按台账词表标免检。本册一直以「免检 0 条」为账眼，不该在同一程里悄悄变成 2 条 |
| `decisions#14` | 一枚生产者退出溯源集合 | 选 A：维持 11 为诚实数，已按此落定 | 若要 B（把派生常量命名为 `GIT_SHA` 让它重回集合）——说一句就改 |

---

## C. 17 条「已修复、待复验，但判据台未覆盖本条」—— 缺的是**载体**，不是修复

这是账面最大的一坨。它们的共同状态是：`已修复待复验（去向：判据台未覆盖本条（不在本轮修复波 116 条条目集内），缺的载体=需人复判后指定）`。
**换句话说：代码可能早就对了，但没有任何机器判点能证明它对，所以永远闭不掉。** 要裁的是「用什么去证明」，不是「要不要修」。

条目（17，含唯一一条 P1）：
`MP-R2-POST-009`(P1) `MP-R2-PROFILE-023` `MP-R2-PROFILE-022` `MP-R2-POST-012` `MP-R2-PUB-113`
`MP-R2VIS-PAGES-HOME-INDEX-001` `MP-R2VIS-PAGES-HOME-INDEX-002` `MP-R2-PAGES-LOGIN-INDEX-016`
`MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-003` `MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-002`
`MP-R2-POST-010` `MP-R2-POST-011` `MP-R2-POST-014` `MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-001`
`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-003` `MP-R2VIS-THEME-DESIGN-VARIABLES-001` `MP-R2VIS-THEME-DESIGN-VARIABLES-002`

三种可选处置，可以按条目分别选：
1. **指定载体**（你或我提名：某条真实档腿 / 某一帧 / 某条单测 / 某个静态判点），v3.7 就能把它纳入判据台并跑完；
2. **降级为「保留-判据不成立」**，即承认这一条没有机器可判的表达方式，按台账词表标免检并记理由（与 `decisions#9` 的 B 选项同一条尺子）；
3. **维持挂账**（每轮重述，不闭）。

⚠ 注意：`MP-R2-POST-009` 是全部账面里**唯一的 P1**，它现在的阻塞原因就是这个「没人指定载体」，不是缺陷没修。

出处：`reports/audit/round-7/open-items.json`（`generatedAt=2026-09-27T04:53Z`，故这是一份**约 2.5 周前的快照**；本轮会重取，但分组口径来自它）。

---

## D. 其它桶（12 条，性质不一，逐条给方向即可）

| 桶 | 条数 | 代表条目 | 要的是什么 |
|---|---|---|---|
| `decision` | 7 | `MP-R2-PAGES-MESSAGES-INDEX-020`（全清语义的后端同步）、`MP-R2-CIRCLES-INDEX-005`（滚动轴，与两条既有裁定打架）、`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-001`（500 还是 1000 字文案） | 产品口径决定；其中「500 字」那条已有 `decisions#7` 裁过以实现为准，若产品要 1000 字属**另开需求单** |
| `frame` | 4 | `MP-R2VIS-TMP-TOUR-R2-004`（高 dpr 帧，已裁长期 NOT_SHOOTABLE，只差标免检＝§B #9）、`MP-R2VIS-PAGES-HOME-INDEX-003`（首页渲染帧） | 帧要在新档位重拍才能判；`TMP-TOUR-R2-004` 实质是 §B 的尾巴 |
| `unverified` | 1 | 同页同身份的两张「不同状态」帧逐字节相同 | 要定：算采集侧问题还是产品状态确实无差异。承接已改判，产品侧未定 |
| `backend` | 1 | 需后端重启才能判的 API 侧条目 | 8080 本轮已由你授权重启，重启后可判——**这条大概不需要你裁，等读数** |

---

## E. 五处账本自相矛盾 —— 要你定「以谁为准」（我不自动改，改了就是把矛盾抹平而不是解决）

1. **`decisions-v33.md` 内部两处计数打架**：§36.2 散文（L1108）说 `open=0 half_closed=7 closed=13`，机器块尾行（L1072）说 `open=0 half_closed=4 closed=16`。差在 #3/#11/#29c 三条后来因设备腿跑完挪到了 closed，散文没跟着改。**要定：机器块算数（我的建议），还是散文算数。**
2. **`tour-ledger.json` 有 12 行 `NAV_FAIL` 的 `consoleRecap.landing` 仍写请求路由，而 notes 记的是另一个落点**（例：nearby 行 landing=nearby、notes=落点 discover；vip/bills 行 landing=bills、notes=落点 profile）。这正是同一本账里 `CON-EV-01` 自己警告过的失效形状，但数据从没被标记。下游若读 landing，**会把"被弹回"读成"已到达"**。v3.7 已加守卫：复用收割件时不采信 landing 字段（只做落地判定用新腿），但**要不要回头修这 12 行历史数据，是你的字**。
3. **同一本账 73/73 行的 console 计数全为 0**，与 A3 的能力边界叠加后，「console 清白」没有机器含义。
4. **`fixlane[0] REAL-VB03-03` 写「VB03 已判过（EXECUTED）」，`R3-01④` 写原判据从未测** —— 这条就是 A4，裁定后两处必须一起改。
5. **账本头部自述陈旧**：`tour-ledger.json` 顶层仍写 `round: 1` / `generatedAt 2026-10-09T22:25Z`，而正文已含 R2-* corrections 与 round-2 fixlane、并刚吸收了三处 round-3 改判。要定：这本账是"活账"（去掉 round 戳）还是"轮次快照"（每轮另存一件）。

---

## F. 不用你管的：QA 这轮已经自己闭掉的

- **v3.7 工作流定义 11 条结构缺陷已改完并静态验证**：`PARSE_DIAGNOSTICS=0`、13 个顶层函数无重名遮蔽（v3.2 曾因同名函数静默覆盖产生每轮假 blocker）、干跑三画像全部跑到总报告并压过晚期分支、`.ask` 站点 0 处 `.catch` 误型。
- **D6 假绿路径**：新增 `scripts/qa/verify-degraded-conclusion.mjs`，用 v3.6 作正对照——它**当场抓到我自己新写的 v3.7 也有一处假绿**（循环里的提前停守卫修好了，终局 conclusion 的判据却漏了降级状态，照样会印"闭环完成"），已补第二条腿并复验 `DEGRADE_RESULT=PASS`。
- **三条门禁清单载具对齐**：DSL `GATE_SUITE` 19 条 + 面板 3 条 + 红探针 = 23 步，与 `scripts/qa/run-final-verify-v33.sh` 的 23 个 `g` 步骤一致；两处都补了 `--file`（此前 bash 与 DSL 都在干跑 v3.3，即"工作流干跑预检"从来没测过当前文件）。
- **上一轮那 14 条分拣出的可执行项**：3 条前端实现刀、11 条覆盖补腿——派给四条车道分头处理（详见 `ui-audit-2026-10-13/*-lane.md`），其中挂在 A4/A5/A6 上的腿**故意不去跑**：判决要等人裁的腿，跑了也只是空帧。
- **台账两处自相矛盾已按"原文逐字留档 + 追加改判与证据指针"的方式处理**，没有删历史、没有把撤红写成判绿（守恒实测：`corrections` 11、`routes` 73、`fixlane` 5，前后行数一致，只 6 个字段是追加）。
- **若干"工作树已改但未进 HEAD"的旧限定已失效**（实测 `TodayLoveProgress.vue:105` 的 `var(--page-padding)` 已在 HEAD，`campus-hub__cert-btn` 在源码里 0 命中）——这类是复量活，不是裁定活。

---

## 一句话版本

**裁 A5 + A6 + A2/A3，就能解锁 4 条腿和一整条 console 口径；C 组那 17 条要么给载体要么准降级；E 组那 5 处矛盾请定"以谁为准"——其余我能自己闭的都在闭，且没有一条是靠改判据或改台账措闭的。**
