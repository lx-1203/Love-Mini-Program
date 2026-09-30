# round-8 收官闭环总报告（v3.3 续作轮，2026-09-29）

本轮不重跑已完成的轮次。起点是盘上事实：上一程 `dwfrun-e9907ebc` 在宿主会话转 `cold` 后停摆（`reportPersisted=false`，盘上只剩两条被门自己覆写的判决件，缺口账单无处续跑），所以本程把 v3.3 的六个阶段用子代理车道逐段执行，同时把工作流本身修到能安全续跑。

## 1. 起点账单（唯一事实源，Node 22 实测）

门禁并行实测 10 项，红 3 项：verify-evidence-corpus、verify-provenance-all、verify-real-coverage。（此句读的是**缺口账单件**，其 HEAD=a4c8f995；终局复量那一发在第 7 节，两份件不同源、口径以第 7 节为准。缺口账单那一发只有整条 v3.3 工作流真跑时才会重打，只跑终验脚本时它是上一程的旧件。）

- 后端 8080 UP；起点自动化端口为空，本程用零点击冷启打通（9420/9430 实测 LISTENING）。
- 起点 HEAD=a4c8f995，工作树脏 145 项。
- 纠正一处长期误读：PATH 上的 node 是 v16.13.1，会把 verify-source-shape.mjs:22 与 verify-evidence-holes.mjs:15（用 import.meta.dirname，需 >=20.11）崩成假红；钉死 Node 22 后这两条门为绿，账单由「5 红」收正为「3 红」。

## 2. 工作流本身改了什么（本轮一等主要交付）

每条都有盘上证据，完整判定见 `.zcode/research/WF-V33-AUDIT-2026-09-29.md`。

1. `runGate` 与端口探针改用 `WORKFLOW.nodeBin`（假红来源）。
2. 账单阶段 `verify-source-shape` 加 `--dry`：不再覆写自己依赖的事实源。
3. 新增 `persistJson`：账单与终验复量落盘，宿主会话死掉也能续跑。
4. 新增 `scripts/qa/dryrun-workflow.mjs`（stub 宿主三画像 + 分支覆盖标记）。实测抓到 v3.3 原样复发的 F2：代理返回缺字段即炸在终报之前。修后 3/3 画像跑到「提交与总报告」；正向对照同一工具跑 v3.2 仍 CRASHED（exit 1，:1227）。
5. UI 腿提示词换成实测可通的零点击冷启（`check_wechatide_status` + `ws-channel-up --wait 150`），撤掉「需用户手动开开发者工具」这条假 fallback；`--wait 60` 会给误导性的 `WS_UP=FAIL`。
6. UI 腿加阳性对照硬前置：`wsApplied` 全空时 WS 派生的 `STATE_NOT_APPLIED` 一律记 `UNVERIFIED-INSTRUMENT`，不得记成产品失败（register 页 `.field__input` 三条就是这么被误判的，物件在源码与产物里都在）。
7. 车道提示词按实测 150 轮硬上限要求：先落骨架、逐行落盘、每批不超过 15 行。
8. 提交后复量 sha 敏感门并落 `post-commit-gates-v33.json`：本程 HEAD 连续推进，同一条 corpus 门的 `resolvableOlder` 从 42 读到 45，绿可能只是提交前快照。
9. `WORKFLOW.version` 不再是死配置键（F5 复判：九键里只有它 0 处消费）。
10. 新增 `scripts/qa/prove-gates-can-fail.mjs`：变异只打临时副本，四类变异 4/4 RED-PROVEN，已接进终验阶段。

## 3. 工具与证据侧的实质修复

- 分诊台认得「选择器已改名」那一型：`unclassified` 1→0，但门仍 exit 2（剩 5 组落地对无裁定，未硬造分类、未塞手写表）。
- 语料门把 sha 读数拆成三类轴（可解析的旧 / 不可解析 / 空），实测 42+0+1=43 守恒，判红条件一字未改；新测试 34 断言 + 两次变异检验。
- 溯源门 `LITERAL_SHA` 1→0；那枚写死的 `deadbeef` 实为内嵌自检负例夹具，代价是 `PROV_PRODUCERS` 12→11（诚实数，已登记待拍板）。
- 4867 帧 `PRE_STAMP` 归因到生产者打的是「转换时刻 HEAD」而非采集带（同文件 `resultsGitSha` 早记着真带），按既有约定补每行 `bandSha`，夹具双向可证。
- 报告器把 observe-only 的 dom 结论计入四格取数；分句建模补上「变更动词切句」。同时纠正一条错误归因：§4.5 那条红不是四格空集，HEAD 真实读数是 85 而非 118。
- `verify-fixes-against-artifact.cjs` 两条守恒规则共用一个旗标导致空集自相矛盾，拆成分别归因，退出码与判决逐字不变。

## 4. 台账：能落的都落了，剩下的不是「没干活」

- 已落账 9 行：`已修复 118→127`、`已修复待复验 12→3`；独立复算 diff 恰 9 增 9 删，6 行受保护行与 HEAD 逐格相同；`verify-ledger`/`verify-state-truth`/`verify-queue-reconcile` 回读全 exit 0。
- 剩余未结 8 行，机械归置：现在可落账 0 条，需拍板 4 条、需环境 4 条（明细见 reports/audit/round-7/openrows-blockers-v33.json）。
- 关键易误读点：交互腿那 49 个是「用例号」而非台账 `MP-*` 行号，两套命名空间，所以帧覆盖度不等于台账结案依据；页面级唯一命中的 `VILLAGE-PUBLISH-001` 缺的是设计依据与阈值语义，任何帧都答不了，故按不可落处理。

## 5. 真实模式交互腿（§4.1 的账）

结果行数 53（计划 49 条真实模式交互用例全部试过，另补游客轴与对照行），分布：NOT_SHOOTABLE 25 / EXECUTED 19 / UNCHANGED_AFTER_INTERACTION 6 / LEFT_PAGE 1 / VEHICLE_DENY 2。
门复跑：REALCOV_CASES=236 EXEC_ROWS=15206 结果目录=D:\6\恋爱小程序\reports\audit\round-7；exit=1。
独立复核：内部自洽 5/5（帧存在性、sha 一致、EXECUTED 前后必不同、UNCHANGED 前后必相同、每条有具名原因，均由主会话重算，不信车道自报）。
- WS 腿不通且根因被纠正：不是取页也不是等不够，而是 `connect()` 里 `MiniProgram.checkVersion()` 把 `(await send("Tool.getInfo")).SDKVersion` 喂给 `licia/cmpVersion.js:4` 的 `v1.split('.')`；9421 只回 `{version}` 没有 SDKVersion ⇒ 握手当场抛。
- CLI 桥腿可用：showcase 载体 band `real@ed1cd82c`（门 `REAL_BAND=/^real(@|$)/` 只看 mode），四步全绿并出帧。
- 在册陷阱：`mp-weixin-real` 窗口已死却过地板——`open_project_window` 回 success/type:reuse、截图 11290B，画面实为「模拟器启动失败」。过字节数不等于可采。
- 载具误挡：按载具口径复算 `DENY` 只命中 2/49（TD03、OT09），不是整批拦路虎；本轮未擅自改载具，待授权。

## 6. 需你拍板 26 项（本轮一律未自裁）

> 口径钉死：本节的分母是裁定册 `reports/audit/round-7/decisions-v33.md`（sha1=10dc7fa774d5，111940 字节）里**全部 36 条 `## N.` 标题**；原先的写法直接把标题总数当待拍板数（结构派生计数会随收账虚增），现按语义分桶：**待拍板 26 / 已裁定 3 / 已闭或状态对账 1 / 流水与自我纠正 6**，守恒 26+3+1+6=36（应等于 36）。默认桶是待拍板，只有命中显式规则才移出，每条移出项在下面 6.2 附一行依据。

- 1. `--r-lg` 令牌值与判据正面冲突
- 2. `--c-text-inverse` 与 `--c-bg-container` 浅色值完全相同
- 3. `MP-R2-PAGES-MESSAGES-INDEX-002` 判据与已生效裁定只能动一个
- 4. AppShell 的左右内距到底是 28rpx 还是 32rpx
- 5. 帧像素与清单路径要不要长期可查
- 6. 各轮写进库的测试数据要不要清
- 7. `village-publish-001` 的提示元素与文案缺设计依据
- 8. 几百个非 png 的文本 dump 要不要入库
- 9. 高 dpr 机型档的巡检帧要不要补
- 10. 主包体积超微信上限，需要你定怎么瘦
- 11. 五组游客落地对没有裁定，分诊台因此一直 exit 2
- 12. round-1 那 144 帧没有 gitSha，要不要给个显式豁免
- 13. 18 份在途 exec-* 清单要不要授权代跑
- 14. 一枚生产者退出溯源集合，要不要把它拉回来
- 15. verify-openqueue-lanes.mjs：修成真的门，还是归档
- 16. run-round7-closeout.mjs：唯一能答"stage-8 过了吗"的载具，现在没人跑
- 17. 面板每跑一次就重打一份权威判决件
- 18. 分诊台的判据台目录是从结果路径反推的
- 19. 那 5 组落地对仍是真欠账（与第 11 项同源，这里补一条新证据）
- 22. 一条会删无回滚产物的载具（本轮实测，未修）
- 23. 体积达标了，但"达的是哪一个口径"必须你认定
- 24. 剩下 0.76MB 的最大单一来源：`utils/person-avatars.ts` 的 21 条强制收集 import
- 25. provenance 那 4886 张帧：三种改法我都量过了，**买不到绿**
- 27. B7「给 switch 补名字」是必要的，但**不足以**让那 7 条变绿
- 28. CH22 只落了不依赖滚动裁决的那半，另半是三件事互斥，得你选一个解释
- 29. `landingMissing=5` 不是产品欠账：分诊台在向一份"零行声明身份"的语料索要**游客**处置

GENREPORT_DECISION_BUCKETS ledger=reports/audit/round-7/decisions-v33.md sha1=10dc7fa774d5 headings_total=36 pending=26 ruled=3 closed=1 log=6 sum=36

GENREPORT_SECTION6_SELFCOUNT heading_number=26 listed_items=26 matches_title=true

GENREPORT_BUCKET_GUARD=OK removed=10/36 pending_zero_guard=clear ask_override_held=0

GENREPORT_LEDGER_DECLARED marker_line=337 marker_section=30 latest_section=34 declared_lag=4 pending_declared=15 diff_vs_generator=11 diff_items=#5,#7,#10,#11,#15,#16,#17,#18,#19,#22,#27

### 6.1 各桶条数（按标题总数计的原始数一并印出，便于核对没漏项）

- 待拍板：26 条
- 已裁定（册内已记录用户裁定）：3 条
- 已闭或状态对账：1 条
- 流水与自我纠正：6 条
- 原始数（裁定册 `## N.` 标题总数，含以上四桶，即修复前 §6 会印的数）：36 条

### 6.2 已从「待拍板」移出的条目（每条一行移出依据，逐条可复核）

- 0. 用户已裁定（2026-09-29 06:20；下列四项口径已定，本轮按此执行）
  ｜桶=「已裁定（册内已记录用户裁定）」｜移出依据：标题命中显式规则 `/已裁定|用户裁定|裁定[一二三四五六七八九十\d]+项|裁定只写/`（原文片段「已裁定」）—— 标题声明该节的裁定已经下过，不是新的选择题
- 20. 提交前自我纠一处我自己造成的文件损伤
  ｜桶=「流水与自我纠正」｜移出依据：标题命中显式规则 `/流水|收口(?:流水|记录|台账)|自我纠|纠正|纠出|勘误|更正|已量成实测|已经?跑完|复盘/`（原文片段「自我纠」）—— 标题声明本节是流水/实测纠正的记录，没有要用户选的方向
- 21. 第 5 项的两处"传闻"已量成实测，结论比原记载更糟
  ｜桶=「流水与自我纠正」｜移出依据：标题命中显式规则 `/流水|收口(?:流水|记录|台账)|自我纠|纠正|纠出|勘误|更正|已量成实测|已经?跑完|复盘/`（原文片段「已量成实测」）—— 标题声明本节是流水/实测纠正的记录，没有要用户选的方向
- 26. 纠正我写进库的一处错：命名闸**并不**拒作用域哈希
  ｜桶=「流水与自我纠正」｜移出依据：标题命中显式规则 `/流水|收口(?:流水|记录|台账)|自我纠|纠正|纠出|勘误|更正|已量成实测|已经?跑完|复盘/`（原文片段「纠正」）—— 标题声明本节是流水/实测纠正的记录，没有要用户选的方向
- 30. 状态对账（2026-09-29 16:2x；上面 0–29 节原文一字未改，现状态只写在这里）
  ｜桶=「已闭或状态对账」｜移出依据：标题命中显式规则 `/状态对账|现状态只写在|已闭|已结案|已销账|已归档/`（原文片段「状态对账」）—— 标题声明本节是状态对账/结案，不是要用户选
- 31. 36 条 CRITERIA_NAMES_NOTHING 的去向已经跑完，顺带纠出一台**假仪器**（2026-09-29 20:4x）
  ｜桶=「流水与自我纠正」｜移出依据：标题命中显式规则 `/流水|收口(?:流水|记录|台账)|自我纠|纠正|纠出|勘误|更正|已量成实测|已经?跑完|复盘/`（原文片段「已经跑完」）—— 标题声明本节是流水/实测纠正的记录，没有要用户选的方向
- 32. 2026-09-29 21:41 用户裁定四项（原文 0–31 节一字未动，裁定只写在本节）
  ｜桶=「已裁定（册内已记录用户裁定）」｜移出依据：标题命中显式规则 `/已裁定|用户裁定|裁定[一二三四五六七八九十\d]+项|裁定只写/`（原文片段「用户裁定」）—— 标题声明该节的裁定已经下过，不是新的选择题
- 33. r9 收口流水（2026-09-30 01:4x；编排亲验，非车道自报）
  ｜桶=「流水与自我纠正」｜移出依据：标题命中显式规则 `/流水|收口(?:流水|记录|台账)|自我纠|纠正|纠出|勘误|更正|已量成实测|已经?跑完|复盘/`（原文片段「收口流水」）—— 标题声明本节是流水/实测纠正的记录，没有要用户选的方向
- 34. 2026-09-30 用户裁定三项（"将所有问题解决"当次）+ 逐项落地（原文各节一字未动）
  ｜桶=「已裁定（册内已记录用户裁定）」｜移出依据：标题命中显式规则 `/已裁定|用户裁定|裁定[一二三四五六七八九十\d]+项|裁定只写/`（原文片段「用户裁定」）—— 标题声明该节的裁定已经下过，不是新的选择题
- 34. r10 收口流水（2026-09-30 12:3x；编排亲验，非车道自报。上面 0–33 节原文一字未动）
  ｜桶=「流水与自我纠正」｜移出依据：标题命中显式规则 `/流水|收口(?:流水|记录|台账)|自我纠|纠正|纠出|勘误|更正|已量成实测|已经?跑完|复盘/`（原文片段「收口流水」）—— 标题声明本节是流水/实测纠正的记录，没有要用户选的方向

全文与每条的可选方向见 `reports/audit/round-7/decisions-v33.md`。判据冲突、令牌值、测试数据去留、证据入库方式都是政策选择，我不替你写。

### 6.3 与册内自述的对账（只印对照，不参与分桶）

- 裁定册第 337 行（属 §30）有一处**声明式**的「仍等你裁定」，它列出的待裁项是 15 条：#1 #2 #3 #4 #6 #8 #9 #12 #13 #14 #23 #24 #25 #28 #29；册内最新的节已到 §34 ⇒ **该声明落后 4 节没重写**（引用它点评旧清单的那些行不算声明，已按措辞排除）。
- 本节（按标题语义分桶）判为待拍板的有 26 条；两者差 11 条：#5 #7 #10 #11 #15 #16 #17 #18 #19 #22 #27。
  - #5 5. 帧像素与清单路径要不要长期可查
    ｜册内另有原文称其已收（照抄，不据此移桶）：「所以原文"干净 clone 一条都打不开"对这 10,457 枚**不成立**。⇒ `#5` 的 A/B/C 要按"一轴已闭 / 一轴仍在 / 一轴分母已变」
  - #7 7. `village-publish-001` 的提示元素与文案缺设计依据
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #10 10. 主包体积超微信上限，需要你定怎么瘦
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #11 11. 五组游客落地对没有裁定，分诊台因此一直 exit 2
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #15 15. verify-openqueue-lanes.mjs：修成真的门，还是归档
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #16 16. run-round7-closeout.mjs：唯一能答"stage-8 过了吗"的载具，现在没人跑
    ｜册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还
  - #17 17. 面板每跑一次就重打一份权威判决件
    ｜册内另有原文称其已收（照抄，不据此移桶）：「- **#17 已闭，但我先前报小了。** `ea3bd785` 只把 `verify-guest-landing --mode book` 的落点改侧车；」
  - #18 18. 分诊台的判据台目录是从结果路径反推的
    ｜册内另有原文称其已收（照抄，不据此移桶）：「- **#18 已闭**：`triage-exec-failures.mjs:507/511/521-524` 有 `OPS_EXPLICIT` 开关与」
  - #19 19. 那 5 组落地对仍是真欠账（与第 11 项同源，这里补一条新证据）
    ｜册内另有原文称其已收（照抄，不据此移桶）：「- **#19 被 #29 取代**：原文写"5 组仍是真欠账"。本轮实测推翻该归因 —— 那 5 组所属语料」
  - #22 22. 一条会删无回滚产物的载具（本轮实测，未修）
    ｜册内另有原文称其已收（照抄，不据此移桶）：「- **#22 已修**（`emit-tapfix-briefs.mjs`：所有权 = 根层 `NN.json` **且**内容也必须是载具形状；外来的保留」
  - #27 27. B7「给 switch 补名字」是必要的，但**不足以**让那 7 条变绿
    ｜册内另有原文称其已收（照抄，不据此移桶）：「- **#21 / #26 / #27**：都已把"传闻"换成实测，并纠了我自己的错引」
- 为什么**不**拿那行声明来分桶：它是编排方手写在册子里的一段汇总文本，会滞后（册内 §30 之后新增/翻转的节它不覆盖）。拿它当事实源就又把「清单靠人记得改」这个病请回来了。这里只印差集，让人一眼看出是「生成器漏了」还是「册内声明滞后」。

## 7. 终局复量读数

```
dryrun-workflow exit=0
emit-round-report exit=0
prove-gates-can-fail exit=0
run-qa-selftests exit=0
verify-backend-fresh exit=0
verify-band-freshness exit=0
verify-carrier-wiring exit=0
verify-case-automatable exit=0
verify-dry-no-lease exit=0
verify-evidence-corpus exit=0
verify-evidence-holes exit=0
verify-lane-report-complete exit=0
verify-ledger-after-panel exit=0
verify-ledger exit=0
verify-ops-stamp exit=0
verify-provenance-all exit=1
verify-queue-reconcile exit=0
verify-real-coverage-disposition exit=0
verify-real-coverage exit=1
verify-source-shape exit=0
verify-state-truth-after-panel exit=0
verify-state-truth exit=0
```
红项：verify-provenance-all、verify-real-coverage

## 8. 本轮把「排在后面做」的账收掉了多少（含纠出的文档错）

- `#51` / `#67`：**本程之前就已落盘入库**（commit `34b6fb3d`，备份 `.pre-ops-cellplan.bak` Sep 27 18:39）。ops 车道干跑实测 `A 组=8｜B 组=22｜已落地=30｜待改=0｜拒绝=0 → OPSCELL_RESULT=PASS exit 0`。`round7-NOTES.md` §104.3 记的 `A=9 / 31 行` 与盘上不符（那是旧态），所以本轮**没有重复 --apply**——拿旧文档重落一遍不是补完，是造假进度。
- 我自己在交接文档里写的「默认吃三份计划」是错的：`:33` 的默认表有**四份**（漏了 `cellplan-round7-recovered.json` 13 行）。已在 `followups-v33.md` 1.1 节逐字纠正。
- 167 行重判里的 `SELECTOR_MISSED=45` 只收进 **10** 条（9 条 add-tapTarget + 1 条 rename `TD07 .say-hello→.reply-say-hello`），守恒 286→286、全目录 1107 不变，幂等复跑 `已落地=10 待改=0`。拒 20 条分类点名：判据无点击步 12、两档静态不命中 2、多命中歧义 3、节点不挂事件 2、有 tap 无点击步 1。**方法论收获：四道闸本身会放行 28/30 —— 过闸是必要条件，不是充分条件。**
- `CH12` 判成 **EXECUTED**：prestate 三样同向实测（`isVerified=false`、目标 btn `present(1)`、两支徽章 absent），tap 回 `{success:true}`，600ms 内路由 `hub|certification`、栈深 1→2、落地页 `.cert-page/.cert-header/.cert-body` present，7 帧哈希且人眼确认不是「模拟器启动失败」页。未量到的写明：500ms 子句、console、身份 B 腿。
- 孤儿门禁接线：`verify-dry-no-lease` 与 `verify-case-automatable` 已接进 `GATE_SUITE`（唯一必然经过的调用点）并实跑为绿；`verify-openqueue-lanes` 判为**不该接**（打印 `OPENQ_RESULT=PARTIAL` 却 `exit=0`、写死 round-7、无条件覆写判决件），已留防再试注释，处置开成第 15 项。
- 仍然存在的红与风险：`verify-ops-corpus-stamp --check` 仍 exit 1（10 个漂移文件里只有 4 个是本程改的，另 6 个先于本程就不符，车道按边界没有越权重打别人的戳）；`tmp/qa/unverifiable-recheck-*.json` 三份已复制进 `reports/audit/round-7/` 脱离不可携状态。

