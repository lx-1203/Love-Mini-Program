# 收官闭环总报告（v3.8，2026-10-16）

## 0. 本报告的身份（生成器自证，全部现读，供复核）

- 轮次=`v3.8`（来源：命令行）｜日期=`2026-10-16`（来源：命令行）
- 裁定册=`reports/audit/ui-audit-2026-10-16/decisions-v38.md` sha1=33870246701d bytes=95041；册子 H1 自述轮次=`v3.8` 日期=`2026-10-16`
- 落点=`reports/audit/ui-audit-2026-10-16/round-final-report-v38.md`（已存在 ⇒ 本轮复量覆盖，覆盖前已通过溯源守卫）
- git 区间：`c9e5d863..HEAD`（HEAD=c9e5d863，提交 0 发）
- 终局读数件=`.zcode/tmp/final-verify/summary.json`（headBefore=c9e5d863 headAfter=c9e5d863 producedBy=?；**这一发是不是本轮的，由载具写入时机保证**）
- 溯源守卫：落盘前判定，判红即 exit 3 且不写任何字节；见进程末尾的 `GENREPORT_PROVENANCE` 机器行

## 1. 起点账单（缺口账单件，Node 22 实测）

门禁并行实测 3 项，红 2 项：verify-real-coverage、emit-open-items。（此句读的是**缺口账单件**，其 HEAD=c9e5d863；终局复量那一发在第 7 节，两份件不同源、口径以第 7 节为准。本件 HEAD 与终局复量同源（同一枚提交的两发读数）)
- 起点 HEAD=c9e5d863，工作树脏 37 项。

## 2. 工作流本身改了什么（生成器不产叙事）

**（未跑，故此处不留结论。）** 本节属**收口车道的叙事**，生成器不代拟：它能落的只有盘上可导出的读数（见 §0/§1/§4/§5/§6/§7），"本轮改了什么、收了多少账"这类判断没有测量来源，写出来就是编。要并入车道撰写的文本，给生成器传 `--prose <文件>`，其内容会逐字追加在本节末尾。 上一轮（v3.3）同位置的那段散文已从代码里删除——它曾被硬编码进生成器，任何别的轮次用它都会读到别人的故事。

## 3. 工具与证据侧的实质修复（生成器不产叙事）

**（未跑，故此处不留结论。）** 本节属**收口车道的叙事**，生成器不代拟：它能落的只有盘上可导出的读数（见 §0/§1/§4/§5/§6/§7），"本轮改了什么、收了多少账"这类判断没有测量来源，写出来就是编。要并入车道撰写的文本，给生成器传 `--prose <文件>`，其内容会逐字追加在本节末尾。

## 4. 台账：未结行与阻断（机械归置）

- 剩余未结 38 行，机械归置：现在可落账 32 条（明细见 `reports/audit/ui-audit-2026-10-16/openrows-blockers-v38.json`）。
- 阻断归因：{"code":17,"reverify":8,"decision":4,"probe":3,"unverified":2,"UNCLASSIFIED":2,"backend":1,"frame":1}

## 5. 真实模式交互腿

**（未跑，故此处不留结论。）**

## 6. 需你拍板 28 项（本轮一律未自裁）

> **本节读的是裁定册的具名机器名册**（`PENDING_RULINGS` 第 528–573 行，open=28 half-closed=7 closed=9；名册自带对账：尾部计数与实际行数一致）。标题分桶那一套仍照常算，用作**交叉核对**：分类器判 10 条 ⇒ 差 18 条，差因是分类器只读标题措辞、读不到状态对账节里的闭合（不是谁算错）。

> 口径钉死：本节的分母是裁定册 `reports/audit/ui-audit-2026-10-16/decisions-v38.md`（sha1=33870246701d，95041 字节）里**全部 11 条 `## N.` 标题**；原先的写法直接把标题总数当待拍板数（结构派生计数会随收账虚增），现按语义分桶：**待拍板 10 / 已裁定 0 / 已闭或状态对账 1 / 流水与自我纠正 0**，守恒 10+0+1+0=11（应等于 11）。默认桶是待拍板，只有命中显式规则才移出，每条移出项在下面 6.2 附一行依据。

- decisions#30：A1（R3-03）未成年/未实名那一态怎么测（可选：(a)授权铺测试专号|(b)VRN07 表单分支降级为组件级单测并记需 DB 授权|(c)维持挂账）
- decisions#31：A2（R3-10）计划件承诺的 storage 明文嗅探算承诺还是算不存在（可选：(a)73 页全量补做|(b)高敏页抽样|(c)计划件正式改写为安全动作抽测并入册）
- decisions#32：A3（R3-11）console 判据上限：换载具还是承认重放路径就是天花板（可选：(a)立项换载具|(b)正式承认重放路径=判据上限并回写计划件|(c)维持现状）
- decisions#33：A4（F06）VIP 账单页 VB03 原判据重测还是封存结案（可选：(a)real/showcase 开 membershipEnabled 重测本体|(b)以封存弹回结案|(c)showcase 代测本体、real 只证封存|(d)维持挂账）
- decisions#34：A5（REAL-VI34-04-Q）资料完成度拦截对村庄广场适不适用——四条腿的共同前提（可选：(a)放行，修 profile-guard.ts:18 后按七态重跑 VI34|(b)维持拦截，VI34 判据改成拦截页行为断言、另用完整身份测七态）
- decisions#35：A6（GUEST-VERB-Q）只读注入动词要不要豁免 strict-verbs（可选：(a)豁免 networkFault 的 fail-all/record 让游客轴照跑|(b)维持拒发并把 OT06/OC09 收敛为 login 单轴、销游客轴欠账）
- decisions#36：A7（V37-CAMPUS-PUBLIC）后端到底把 /api/v1/config/campuses 列入 permitAll 吗（可选：(a)放 /config/**|(b)不放、维持客户端豁免|(c)只放 /config/campuses 单条） ｜⚠ 前提changed
- decisions#38：A9（V37-MS06-REFUSAL）首屏网络判点缺口该不该把整条腿扣住（现状=拒发）（可选：(a)维持整腿拒发|(b)降级为发但标 NOT-EVIDENCED|(c)逐案豁免） ｜⚠ 前提changed
- decisions#39：A10（V37-R309-DISPOSITION）匹配卡那条判夹具不可达还是维持产品缺陷（可选：(a)改判 NOT_SHOOTABLE（夹具/态不可达）|(b)维持产品缺陷（先给一条与素材 200＋三分支 v-if 都不矛盾的机制说明）|(c)撤行）
- decisions#40：A11（V37-NTH-TAP）点不准同名多枚钮这笔账现在还剩什么（可选：(a)继续补作者侧唯一类名并想法拉进组件子树|(b)补执行器（先证坐标 tap 可用）|(c)判据降级为接线正确并写清换了什么） ｜⚠ 前提changed
- decisions#41：C-2 VIS 类条目能不能用源码结构谓词结案（一次定原则）（可选：(a)允许——凡帧里不存在可对照的机器物件即可用谓词结案（现状即此）|(b)分档——结构/令牌/i18n 可用谓词，主张看起来对齐/间距/层级的仍必须帧或量测（本册建议）|(c)不允许——VIS 一律要帧，99 行重新排队拍摄）
- decisions#43：E2 12 行 NAV_FAIL 的 landing 历史数据要不要回头修（可选：(a)按 notes 的实测落点回写|(b)永久保持只靠守卫不采信）
- decisions#44：E3 「73/73 console 全 0」要不要在账面上标成未采到（可选：(a)统一标未采到（配合 A3 的选择）|(b)不标）
- decisions#45：E4 VB03 已判过 vs 原判据未测的三处相反记账（就是 A4 的账面半边）（可选：A4 裁定后一起改（把 fixlane[0] 那句已判过按判词改写、原文留档）|或不改）
- decisions#46：E5 tour-ledger.json 是活账（去掉 round 戳）还是轮次快照（可选：(a)活账：删掉 round/generatedAt 头部自述|(b)轮次快照：每轮另存一件）
- decisions#47：G1 加不加「红已撤、绿未证、待重判」这一档（可选：(a)新增一档 撤销待重判（要同改 normalize-ledger-status.mjs 的 VOCAB、emit-open-items.mjs 的 OPEN_RE、verify-ledger 词表校验三处）|(b)维持权宜写法|(c)拆两档：状态=撤销 ＋ 独立的欠重跑字段（本册建议，它和 N1 要的 coverageEffect 是同一个机读字段））
- decisions#48：G2 已修复待复验 一词三义要不要拆（可选：(a)拆成 已修复待带内复验／已修复待静态复量 两档（动词表三处）|(b)保留一档但强制处置列按固定格式写载体命令（门可解析；本册建议先做，(a) 与 G1 同批）|(c)不动）
- decisions#50：N2（ADMIN-FEEDBACK-NAV）反馈工单页要不要从后台导航里放出来（可选：(a)放出来：新增一支前向迁移把 menus id=204 的 hidden 置 0 并同步改 menu.ts:257（两处不同步会让 mock 档与 real 档导航长得不一样）|(b)维持直连 URL 专用|(c)折中：只放给 SUPER_ADMIN/ADMIN、AUDITOR 不放|(d)先补读 200／写 403／mock 404 三格实跑断言再回来裁；本册建议 (d) 然后 (a)）
- decisions#51：N3（BAND-STAMP-BOUND）新鲜度那把尺只哈希 config/env.js 的 2392 字节，接受还是折宽（可选：(a)把 app.js＋app.json＋主包 pages 树（或全量清单哈希）折进 sha8——今天 COVERED=196 会成批过期、需一次全量 real 重拍|(b)接受这把界并把它写成机读事实（在 REALCOV_BAND_STAMP 旁固定印覆盖面 2392B/30090489B≈0.008%、代码/素材重建不注销覆盖）|(c)双戳：band 管归属＋contentStamp 管注销|(d)触发式重扫，只点名提示不撤覆盖；本册建议 (b) 立刻做、(c) 排下轮）
- decisions#52：N4（BAND-NAMESPACE-RULE）哪个生产者拥有哪种戳，这条规矩落在哪才算持久（可选：(a)把尺的定义钉在 artifact-band.mjs 头部为唯一算法权威，并在门清单加一条每个产 band 的文件必须 import 它、不许自算的静态普查|(b)维持现状（v3.8 DSL 名册块＋运行时交叉核对＋device-leg 自测），只在 verify-device-leg.mjs 入库时把三处连起来|(c)让门自己拒绝形状对但尺源可疑的行（行上加 bandSource 字段，四个生产者都要加）；本册建议 (a)，且这一轮必须先把 scripts/verify-device-leg.mjs 入库）
- decisions#53：N5（LBS-CLIENT-CONSUMPTION）附近要不要改成真 GPS 半径口径（后端已就绪，客户端 0 调用点）（可选：(a)切：附近页主数据源改 /location/nearby、校区池退为无授权时的兜底（要授权文案、拒绝兜底态与距离观感变更）|(b)并：校区维度不动，另开按距离排序/筛选开关（默认关）|(c)不切，只把后端端点标为未消费；本册建议 (b)，且无论选哪个周报那句零进展都要更正）
- decisions#54：N6（LOVE-CONSULT-CONTENT）恋爱咨询内容谁供给、什么形态（可选：(a)产品给出 H5 内容源（自建课程页／第三方嵌入／静态图文），QA 再按有内容补判据|(b)本期不供给：UI 层摘掉该入口或标敬请期待，并从 R12 终验清单划出去|(c)维持现状（壳在、URL 空）；本册建议 (b)）
- decisions#64：U1 反馈工单列表现在到底有几条（无法判定，派活口径给的 total=0 没有盘上出处）（可选：没有可选项可裁：这条缺的是读数不是选择——要么给一次带库实测，要么正式记未取证） ｜⚠ 前提缺一个活的 8080（real profile）＋Redis 6379；本程按指令没有启动/停止任何服务
- decisions#65：U2 R12 的「profile 未登录头部叠印」终验（无法判定）（可选：没有可选项可裁：源码级判点买不到这一帧——要么排一次真机/IDE 重拍，要么把它记成不可终验） ｜⚠ 前提缺一次真机或 IDE 帧重拍（要占 UI 租约；本程按指令未碰租约）
- decisions#66：U3 A7 的两态实测（带 token 200／不带 401）今天是否仍成立（无法判定）（可选：没有可选项可裁：规则逐字没变不等于实测过——要么补一次带活 8080 的两态实测，要么把 10-13 那组读数永久标史值） ｜⚠ 前提缺一个活的 8080（real profile）；本程未启停服务
- decisions#67：U4 「实名未认证＋birth_date NULL」专号是否已被谁偷偷铺进库（无法判定）（可选：没有可选项可裁：要么给一次 DB 读权限，要么维持覆盖面上的未销账） ｜⚠ 前提缺 DB 读权限（本程未连库）
- decisions#68：U5 把更多产物输入折进戳之后到底会过期多少条（无法判定）（可选：没有可选项可裁：若倾向 N3 的 (a)/(c)，这条要先补一次试算） ｜⚠ 前提缺一次全量 real 重建＋覆盖门重跑（本程没有构建权限指令）
- decisions#69：Q1（RESHOOT-CREDIT）守卫弹回造成的 FAILED 算不算量到（可选：(a)接受：FAILED 也是 JUDGED，弹回本身是被量到的产品事实，PC06/VB10 继续抵账（现 COVERED=198）|(b)不接受：这两行退回未取证并删除该腿目录（回到 196/3）|(c)接受但分档：抵账照计，行上另标 guard-bounce，使绿不被读成功能已验）

GENREPORT_DECISION_BUCKETS ledger=reports/audit/ui-audit-2026-10-16/decisions-v38.md sha1=33870246701d headings_total=11 pending=10 ruled=0 closed=1 log=0 sum=11

GENREPORT_SECTION6_SELFCOUNT heading_number=28 listed_items=28 source=roster crosscheck_classification=10 matches_title=true

GENREPORT_BUCKET_GUARD=OK removed=1/11 pending_zero_guard=clear ask_override_held=0

GENREPORT_LEDGER_DECLARED marker_line=585 marker_section=10 latest_section=10 declared_lag=0 pending_declared=31 diff_vs_generator=10 diff_items=#0,#1,#2,#3,#4,#5,#6,#7,#8,#9

### 6.1 各桶条数（按标题总数计的原始数一并印出，便于核对没漏项）

- 待拍板：10 条
- 已裁定（册内已记录用户裁定）：0 条
- 已闭或状态对账：1 条
- 流水与自我纠正：0 条
- 原始数（裁定册 `## N.` 标题总数，含以上四桶，即修复前 §6 会印的数）：11 条

### 6.2 已从「待拍板」移出的条目（每条一行移出依据，逐条可复核）

- 10. 待裁名册做成机器可读块（2026-10-16；状态对账，§0–§9 各节原文一字未动）
  ｜桶=「已闭或状态对账」｜移出依据：标题命中显式规则 `/状态对账|现状态只写在|已闭|已结案|已销账|已归档/`（原文片段「状态对账」）—— 标题声明本节是状态对账/结案，不是要用户选

全文与每条的可选方向见 `reports/audit/ui-audit-2026-10-16/decisions-v38.md`。判据冲突、令牌值、测试数据去留、证据入库方式都是政策选择，我不替你写。

### 6.3 与册内自述的对账（只印对照，不参与分桶）

- 裁定册第 585 行（属 §10）有一处**声明式**的「仍等你裁定」，它列出的待裁项是 31 条：#30 #31 #32 #33 #34 #35 #36 #37 #38 #39 #40 #41 #42 #43 #44 #45 #46 #47 #48 #49 #50 #51 #52 #53 #54 #55 #64 #65 #66 #67 #68；册内最新的节已到 §10 ⇒ **该声明落后 0 节没重写**（引用它点评旧清单的那些行不算声明，已按措辞排除）。
- 本节（按标题语义分桶）判为待拍板的有 10 条；两者差 10 条：#0 #1 #2 #3 #4 #5 #6 #7 #8 #9。
  - #0 0. 一屏总表
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #1 1. N 组：本轮（v3.8 在途）新挡下来的
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #2 2. A 组复验结果（11 条：全部仍开放，其中 2 条射程变小）
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #3 3. B 组复验（4 条 half-closed，全部仍开放）
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #4 4. C-2 复验：源码谓词能不能闭 VIS 类条目——**仍开放**
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #5 5. E 组复验：5 处自相矛盾全部**仍开放**（一处都没被今天四支提交关掉）
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #6 6. G 组复验：两处词表缺档**仍开放**（现值都量过）
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #7 7. 已落地，从包中划掉（8 件 —— 包变小是因为量到了落点，不是有人弄丢了条目）
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #8 8. 无法判定（5 件 —— 每件都写清缺什么）
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #9 9. 一句话版本
    ｜册内另有原文称其已收（照抄，不据此移桶）：「| `decisions#9` | 高 dpr 两行未标免检 | `issue-matrix.md:98`（`MP-R2VIS-PAGES-HOME-IND」
- 为什么**不**拿那行声明来分桶：它是编排方手写在册子里的一段汇总文本，会滞后（册内 §30 之后新增/翻转的节它不覆盖）。拿它当事实源就又把「清单靠人记得改」这个病请回来了。这里只印差集，让人一眼看出是「生成器漏了」还是「册内声明滞后」。

## 7. 终局复量读数

```
dryrun-workflow exit=0
emit-round-bill exit=0
emit-round-report exit=0
gen-round8-report exit=0
lint-gate exit=0
prove-gates-can-fail exit=0
run-qa-selftests exit=1
settle-discipline exit=0
tcheck-workflow exit=0
verify-admin-auditor exit=0
verify-admin-post-detail exit=0
verify-admin-scope exit=0
verify-admin-writes exit=0
verify-backend-fresh exit=0
verify-backend-restarted exit=0
verify-band-freshness exit=0
verify-carrier-wiring exit=0
verify-case-automatable exit=0
verify-case-selectors-exist exit=0
verify-criteria-frame-debt exit=0
verify-degraded-conclusion exit=0
verify-device-leg exit=0
verify-disproof-anchors exit=0
verify-dry-no-lease exit=0
verify-evidence-corpus exit=0
verify-evidence-holes exit=0
verify-fixes-against-artifact exit=0
verify-frame-debt-coverage exit=1
verify-frame-debt-triage exit=0
verify-gate-list-sync exit=0
verify-guest-landing exit=0
verify-i18n-orphan exit=0
verify-lane-report-complete exit=0
verify-ledger-after-panel exit=0
verify-ledger exit=0
verify-openqueue-lanes exit=0
verify-ops-stamp exit=0
verify-provenance-all exit=1
verify-push-credentials exit=1
verify-queue-reconcile exit=0
verify-real-coverage-disposition exit=0
verify-real-coverage exit=1
verify-rulings-landed exit=2
verify-source-shape exit=0
verify-staged-secrets exit=0
verify-state-truth-after-panel exit=0
verify-state-truth exit=0
verify-status-vs-disposition exit=0
verify-tab-bar-single-source exit=0
```
红项：run-qa-selftests、verify-frame-debt-coverage、verify-provenance-all、verify-push-credentials、verify-real-coverage、verify-rulings-landed

## 8. 本轮把「排在后面做」的账收掉了多少（生成器不产叙事）

**（未跑，故此处不留结论。）** 本节属**收口车道的叙事**，生成器不代拟：它能落的只有盘上可导出的读数（见 §0/§1/§4/§5/§6/§7），"本轮改了什么、收了多少账"这类判断没有测量来源，写出来就是编。要并入车道撰写的文本，给生成器传 `--prose <文件>`，其内容会逐字追加在本节末尾。

## 附. 收口车道撰写的叙事（生成器原样并入，未改一字）

# 本程收尾正文（v3.8 · 2026-10-15 夜 → 10-16 凌晨）

> 这一节由编排方写，数字一律指向盘上件，不在这里重抄——本仓已经吃过四次"散文里的数字过期"的亏
> （门禁条数写死成「十项」、未结案数 7 与 16 打架、坏 band 行数 10 复算只到 2、
> 名册条数 30 与机器读数 31 口径不同）。每一处需要数字的地方给路径与机器行名。

## 1. 起点与终点

起点是盘上三件不对齐的事实：HEAD 停在 10-13 22:46，工作树 136 项未提交（后台 AUDITOR
只读角色 + 校区/圈层数据域整波改动，含 7 支已实跑的迁移），而 10-14 那一程把设备腿、
后台门、圈层重排都跑完了却没有任何一件进库、也没有一行判决进台账。

终点见 `reports/audit/ui-audit-2026-10-16/dsl-run-manifest.json` 的 `commits` 数组，
以及 `git log` 自 `e026d1e6` 之后的区间——提交清单由生成器从 git 现取，不在本文抄。
分批口径按用户当天定的顺序：迁移 → api → client → admin → 工具/门 → 工作流 → 证据 → 台账。
每发的 message 都写明它载的是哪条车道的读数，且每一发都先过
`scripts/qa/verify-staged-secrets.mjs`（读索引，非零即不提交）。

## 2. 为什么"提交"排在"终验"之前

这不是整理习惯，是门的形状决定的：`scripts/qa/verify-backend-fresh.mjs:81` 在
`apps/api` 有未提交改动时**必红**（"运行实例不可能代表 HEAD"）。
所以那 136 项不入库，`phase("门禁终验与构建")` 就结构性红一整程。
先提交、再复量，才是让那一格绿有意义的顺序；反过来做只会得到一个要么红、
要么靠旧字节蒙绿的读数。

## 3. 工作流本身改了什么

定义从 v3.7 进到 `.zcode/workflows/miniprogram-ui-audit-v38.dwf.ts`。
八条改动逐条落在该文件与提交记录里，这里只说共同指向的一件事：
**把"绿"的语义从"没报错"收紧成"这一格量的是它声称的那个东西"**。具体形状包括
——门必须先有机器判决行才允许被登记；会抢租约/写库的腿只能进顺序段而不是并行清单；
台账出处与"上一程产物目录"是两个键，混用会把待判决桶静默清空（实测：错指一次
就得到 待判 0/覆盖 200，正指才是 待判 4/覆盖 196）；报告器在提交之后再跑，
否则 §7 永远印提交前的数；提交前的密钥预检 fail-closed，"量不到"也拦下提交。

三条本程之后又追加的修正，都属于同一类"载具读错账/写错靶"：
总报告生成器原本没有默认靶以外还硬写着上一轮的标题与正文（现在 `--out/--ledger`
无默认，且写之前比对现件身份，不合即拒，故意不留 --force）；
面板的去向判点读的是 10-06 已被裁定降级为归档的那本账，而真值源那侧报的是
"五条欠账条条有去向"——两个载具对同一件事给出相反结论时，先问各自读的是哪本账；
裁定包缺机器名册，导致报告的"待你拍板"一节数的是 10 个节标题而不是 31 条真实待裁项。

## 4. 环境与前端的真实状态

Redis、真档后端、开发者工具自动化通道（9420，绑 real 产物）、后台 dev server（5173）
全部由本程拉起并保持在线；三档产物重建后 `verify-band-freshness` 报
`FRESH_RESULT=PASS bands=3`。后台那一波的权限与数据域判定这次是真跑出来的，
不是源码级推断：四条门各自的判决行见 manifest 的 `gatesMeasuredGreen`。
其中一条尤其值得记：圈层绑定确实在驱动可见性（同一审核员改绑后 126→22、复原后回 126，
未绑定圈层的管理员只看到 11/291 而不是全平台）。

设计文档 `doc/后台权限与隐患整改设计方案.md` 已入库，但它 §0 那句
"没有任何一处数据查询读它们"是**写作时的基线**，本程实测已推翻；
引用那份文档时以门读数为准。

## 5. 覆盖欠账：这一程最重要的一个认知修正

起初按"再跑一轮腿"排产。腿跑了，分桶一格没动——
原因写在 `reports/audit/ui-audit-2026-10-16/dsl-run-manifest.json` 的
`lanesInFlight` 与 `rulings.hardBlocker`，一句话版本是：
**这批欠账卡的是前置条件能不能注入，不是腿够不够多**；
而"作废"的四条更是要等台账行上那个机读字段，不等人拍板。
`SKIPPED` 按定义不算量到，这是门对的、我们排产错的。
后续排产请按去向件的分类（需要新能力 / 现在可落 / 身份不可达 / 需换档）来，
不要按条数来。

## 6. 明确没做、也不该在本程做的事

并存的两个发布页不合并；会员/showcase 旗标不开；回复长度上限不抬到服务端值；
11 个 CRC32 与历史账不符的迁移不动（已应用脚本按 `database/flyway/sql/README.md` 不可改）；
密钥轮换备份不删（用户选了补 ignore 规则并保留原文件）；
带活会话票的设备腿证据（8 份 `verdict.txt`、14 份网络流水）与三份库表快照
**不进版本库**——不是遗漏，是提交前那道门把它们判红了，
而恢复件一旦脱敏就不再是恢复件。生产侧落盘脱敏是下一程的活。

推送、以及"是否授权入册车道写 `coverageEffect`"，都等用户明示，本程没有代替决定。

