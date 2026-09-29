# 本轮未收口的账（v3.3 续作轮交接，2026-09-29 03:43）

这份文件只写**还能干的活**，以及为什么它们排在后面。每条都给到能直接执行的程度：命令、参数、判据、验收口径。不写"基本完成"，也不写"待跟进"这种没有主语的句子。

## 1. `#51` 与 `#67`：三份手写计划终于有落盘工具了，还没跑

- 载体已存在：`scripts/qa/apply-ops-cellplans.mjs`（`round7-NOTES.md` §104.3 建成，带四道闸：新名字必须在**两档产物该页 wxml 里逐字命中**、整词比对不做子串；rename 组必须能在正文里找到那个死名字；B 组只打 `automatable:false` 三个标记、一条不删，落盘前后各数一次用例总数不守恒就 exit 1；先在内存里做完再一次性落盘，每个 manifest 自动续号备份）。
- 当时的实测读数（§104.3 留档）：`dry A=9 B=22 拒绝=0，涉及 10 个 manifest 的用例数=581（改前=581）OK`；负例三条（假类名 / 不存在的 id / 无 why 的盖章）全部被点名并 `exit=1`。
- 要落盘的是三份手写计划合计 31 行：`scripts/qa/cellplan-round7-deadselectors.json`、`-login-skips.json`、`-taptarget.json`。
- **为什么现在没跑**：`round7-NOTES.md:1897` 与 `:3503` 写明在跑的腿是逐组读 ops 文件的，中途改会让同一轮前半用旧判据、后半用新判据。本程的交互腿（`.zcode/tmp/lane-ui2/`）03:42 仍在写。
- 命令（腿停干净之后；**本工具没有 `--dry` 旗标**，不给 `--apply` 就是干跑，乱给旗标会被 `KNOWN=["plan","bands","apply"]` 挡下并 `exit 2`）：
  ```
  N=/d/codex-tools/node-v22.17.0-win-x64/node.exe
  "$N" scripts/qa/apply-ops-cellplans.mjs          # 干跑
  "$N" scripts/qa/apply-ops-cellplans.mjs --apply  # 核对无误再落盘
  ```
  **纠正我先前写的一处错**：这里原本写"默认吃三份计划"，看 `:33` 的默认表其实有**四份** ——
  `deadselectors / login-skips / taptarget / recovered.json`（第四份 13 行我原先漏看）。
  单份指定用 `--plan a.json --plan b.json`，两档比对的产物目录用 `--bands p1,p2`（用法原文在 `:13`）。
  验收：看自报行 `OPSCELL 计划=… A 组=… B 组=… 其中已落地=… 待改=… 拒绝=…`；
  拒绝必须逐条有名有因，落盘前后用例总数守恒。

### 1.1 本节的状态已在 03:52 由 ops 车道查实，两条与文档原说法不符（留档）
- **`#51`/`#67` 早在本程之前就落盘入库了**：干跑真实读数 `A 组=8 行｜B 组=22 行｜已落地=30｜待改=0｜拒绝=0 → OPSCELL_RESULT=PASS exit 0`；
  备份 `.pre-ops-cellplan.bak` 时间 Sep 27 18:39，入库提交 `34b6fb3d`。
  `round7-NOTES.md` §104.3 记的 `A=9 / 31 行` 与盘上不符（那是旧态），所以我**没有再 `--apply`**（`applied=false`）——
  重复落同一批计划不是"补完"，是拿旧文档冒充新事实。
- **45 条 `SELECTOR_MISSED` 只收进 10 条**（9 条 add-tapTarget + 1 条 rename `TD07 .say-hello→.reply-say-hello`），
  涉及 4 个 manifest，守恒 286→286、全目录 1107 不变，幂等复跑 `已落地=10 待改=0`。
  拒 20 条并归类：两档静态不命中 2、判据无点击步 12、节点不挂事件 2、多命中歧义 3、有 tap 无点击步 1；另 15 条上一批已落。
  **最要紧的一条方法论**：四道闸本身会放行 28/30 —— 也就是"过了闸"不等于"可落"，
  判据里根本没有点击步的 12 条照样能过名字核对。闸是必要条件，不是充分条件。
- 三条门在写盘前后各跑一遍：`verify-source-shape --dry`=0、`verify-ledger`=0、`verify-state-truth`=0，另 `SEL_RESULT=PASS`。
  但 `verify-ops-corpus-stamp --check`=**1**：10 个漂移文件里只有 4 个是 ops 车道改的，
  另 6 个在它动手之前就不符，它按边界**没有越权重打别人的戳**——这条红留给终局复量如实报。
- **`CH12` 已判成 `EXECUTED`**（原判点本体从未验过）：载体 showcase `real@ed1cd82c`，
  prestate 三样同向实测（`isVerified=false`、目标 btn `present(1)`、两支徽章 absent），
  tap 回 `{success:true}`，600ms 内路由 `hub|certification`、栈 1→2、落地页 `.cert-page/.cert-header/.cert-body` present，
  7 帧哈希且人眼复核不是"模拟器启动失败"页。未量的也写明：500ms 子句、console、身份 B 腿未测。

## 2. 167 条"不可核"里，45 条其实可以回收

三刀只读重判的产物在 `tmp/qa/unverifiable-recheck-{1,2,3}.json`（`round7-NOTES.md` §104.2），我现算的分布：

| 去向 | 条数 | 下一步该谁做 |
|---|---|---|
| `SELECTOR_MISSED` | **45** | 可回收：源里有真名，写进 ops 的 `tapTarget` 就能判 —— 用上面第 1 节的工具，四道闸正好为这件事设计 |
| `COMPOSED_OR_SCOPED` | 42 | 元素在但名字查不到，要逐条写清机制（拼接/作用域），属判据正文补写 |
| `CRITERIA_NAMES_NOTHING` | 36 | 判据点了产品没有的东西 ⇒ 收紧判据或改成非帧判 —— **这是政策选择，交人拍板**，不许我批量盖章 |
| `WRONG_BAND` | 19 | 这一档表达不了 ⇒ 要点名哪一档能（mock/real/showcase 三档各答不同问题，见在册规则） |
| `NO_ELEMENT_NO_FIX` | 25 | 无物件且不修，按免检登记并写理由 |

⚠ 这三份产物原本只在 `tmp/`（被 `.gitignore` 挡着、只在采集机存在）——**已处理**：三份复制进
`reports/audit/round-7/unverifiable-recheck-{1,2,3}.json` 并入库，账面不再引用不可携路径。

### 2.1 这 86 行已处理完（06:0x）：净新增 77、暂扣 4，另有两件必须记的事

分配：候选 86 → 进计划 82 → **真正新增盖章 77**；暂扣 4 条（`WRONG_BAND` 但 `bandAxis` 未点名哪一档能表达）：
`H03@pages/home/index`、`N05@pages/nearby/index`、`MT03@subpackages/discover-extra/discover/matching`、`VI09@subpackages/vip/index`。
`CRITERIA_NAMES_NOTHING` 那 36 条不在本批，也不该由我落——那是拍板项。

刻意做的三件事：
1. `why` 逐字抄自 recheck 产物的 `verdict/bandAxis/note/citation`，生成器
   `scripts/qa/emit-round8-unverifiable-plan.mjs` 只拼接与过滤，一个字都不改写；
2. 落盘走 sanctioned 的 `apply-ops-cellplans.mjs`（四道闸、每 manifest 自动续号备份、幂等），没有手改 ops JSON；
3. 可采性逐字段证，不是"看起来没坏"：20 份 manifest 用例条数全等，236 处字段写入全部落在
   `automatable`/`notAutomatable*` 一族，`title/pre/action/expected/evidence/requiresReal/needsIdentity/tapTarget`
   零改动，越界 0。落盘后按该工具自己的 sanctioned 路径 `--selftest`（负例=3 PASS）→`--write`→`--check`
   重打语料戳：`canon=46812907c1b8`、`cases=1107`、零漂移 PASS。

两件要记的：
- **落盘工具报数不实**：它自报「已落地=0 待改=82 拒绝=0」，但拿它自己生成的 `.pre-ops-cellplan*.bak`
  逐份比对，82 条里有 **5 条先前就被别的 B-not-automatable 计划盖过章**，净新增是 77。
  它只在单次运行内去重，不把跨计划既有标记算进 `already` —— 这是它一个真实缺陷（建议 `already` 含"落盘前已 false"）。
  我没按它说的 82 记账。
- **别把覆盖度读成进展**：`verify-real-coverage` 从 14/236 收到 10/236，同时**免检从 10 涨到 28**。
  那 4 行的减少是我把行从"欠账"重分类成"免检"的结果，不是多挣到的证据（门自己的措辞：
  免检只免"本门不追"，不降阈值）。本轮不把它当成绩。`band-freshness` 仍 PASS（符号级深检，元数据不影响）。

剩 4 条暂扣行的下一步：缺的是"哪一档能表达"这一句，需逐条核渲染条件（`v-if`/`v-else-if` 静息不渲染、
子组件作用域、`pageWxmlText` 字符串名这些机制在其余 77 条里都点过名，可照着做）——是技术活，不是拍板项。

## 3. `CH12`：命名不等于结案

分诊台新增的桶只证明"本轮读的是改名前的旧目标"，判点本身没验。欠一次带 prestate 的复跑：

- 页 `subpackages/campus/campus/hub`，选择器 `.campus-guide__btn`，身份必须是**未认证**（节点在 `hub.vue:215` 的 `v-if=!isVerified`，认证身份下点空）。
- 载具：`scripts/qa/r-exec-cli.mjs` 的 `--tap` 刀（先 `export PATH=/d/codex-tools/node-v22.17.0-win-x64:$PATH`）。
- 取锁纪律照旧：`cli-automator.mjs` 主入口不自己取租约，裸调必须由调用方包 `acquireUi/releaseUi`；截图回来的字节是 JPEG 挂 `.png`，sniff PNG magic 的判据会误盖。
- 阳性对照先行（本轮新加的硬前置）：先用一个已知 present 的选择器确认 WS 能选中并下发，`wsApplied` 全空时这轮的 `STATE_NOT_APPLIED` 一律记 `UNVERIFIED-INSTRUMENT`，不得记成产品失败。

## 4. 载具口径：两条 `VEHICLE_DENY` 是被误拦的

`r-exec-cli.mjs:60` 与 `r-exec-ws.mjs:391` 的 `DENY_TAP` 把"清空输入框"当账号级动作挡了。本程实测旁证：showcase 腿 `.reply-input=present(1)`，物件在、动作可采，是拦错了。
改它要人授权（载具白名单是安全边界，不该由收口轮顺手放宽）。登记在此，未改。

## 5. 面板还剩一条没人补的读数轴

`emit-round-report.mjs` 目前只印 `CORPUS_EXPIRED_GITSHA` 这个合并数，而语料门已经能分三类（`CORPUS_SHA_CLASS resolvableOlder/unresolvable/empty`）。HEAD 每前进一次，那个合并数就涨一次，读的人分不清"历史轮本应定格"和"真断链"。补法在面板侧，本程面板车道正在改另一句红词，未越界代做。

## 0. 续跑前先做的三件事（2026-09-29 03:52 停点，本轮预算耗尽）

本文件第 1/3 节的命令**不能在车道还在跑的时候执行**，否则拿到的是撕裂读数（本轮实测：同一条命令在重建窗口内会读 dist 0 vs dist 2；边跑边提交会把 corpus 的 resolvableOlder 从 42 抬到 45）。1. 确认三条在途车道都已收工：`ls -lat --time-style=%H:%M .zcode/tmp/lane-wiring/ .zcode/tmp/lane-panelword/ .zcode/tmp/lane-ops/` 全部停止增长；它们未提交的改动分别落在 `run-qa-selftests.mjs`、`run-round7-closeout.mjs`、`emit-round-report.mjs`、`test-guest-landing.mjs`、`verify-guest-landing.mjs`、`.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`（GATE_SUITE 已由 10 条接到 12 条）。
2. 确认 UI 租约没人持有：`node22 --input-type=module -e "import { heldLeases } from './scripts/qa/ui-lease.mjs'; console.log(JSON.stringify(heldLeases()));"` 应打印 `[]`
   （本节原先写的是 `node22 -e "import('./scripts/qa/ui-lease.mjs').then(...)"` 那种形式 —— **实测跑不通**，
   普通 `-e` 里 `import()` 的动态形式在这个入口下会先撞语法，2026-09-29 我在车道还在持租时实跑复现过；
   锁目录是 `tmp/qa/locks/`，不是 `.zcode/tmp`。锁按 **pid** 判活：本轮读到
   `owner=guard-r10-guest-shoot pid=30572 pidState=alive orphan=false`，那是真有人在用，不许接管）。
   端口 9420/9430 与后端 8080 此刻都是活的（零点击冷启配方见第 3 节）。
3. 跑 `bash scripts/qa/run-final-verify-v33.sh`（12 条门禁 + 可变红自检 + 自测汇总 + 工作流干跑 + 不跳实时门的全量面板 + 面板后复量），再跑 `node22 scripts/qa/gen-round8-report.mjs` —— 总报告 §7 会从 summary.json 自动填真实读数。**在那之前 §7 保持"未跑"字样，不要手填。**
   **（2026-09-29 13:05 已照此执行完：18 步全跑、红 4、HEAD 前=后=83fd47a7（同值 ⇒ 这批 sha 敏感读数没被提交漂移污染），§7 已由生成器填真数；红因与可收性逐条落在 decisions 第 25 项与本报告 §7。该脚本的 `:39-40` 两行 JS 注释写在 bash 里会被当命令执行，已修为 `#`。）**

本轮已入库 25 条提交；工作树约 160 项脏，其中绝大多数属于上述三条在途车道，**不属于我、也不该由我代为提交**。

## 6. 终局复量之后欠下的四把载具刀（等 UI 车道收工再动，跑中不改载具）
1. **`verify-real-coverage` 只数不点名**。`scripts/qa/verify-real-coverage.mjs:434` 把欠账算成
   `|neverOnReal ∪ noA ∪ noGuest|` 的集合大小，`:509` 只印一个数 —— 于是本轮"欠账 10/236"这三行里
   没有任何一处能读出**是哪 10 条**。头两行给了线索（`REAL_BAND_BUT_ALL_SKIPPED=10`、
   `JUDGED_MISSING_A=10 JUDGED_MISSING_GUEST=2`），但那是计数不是名册。红必须可归因，
   否则下一条车道只能重新反推。改法：加一条 `REALCOV_UNCOVERED_LIST=`（逐条 suite|id 带缺 A/缺 guest 的哪一侧），
   并且**不改判红阈值**（:514 的 `ok` 仍只看 uncovered 与守恒）。
2. **续跑会把别人那一批的行重新盖成自己这程的 sha**（此项已纠正我先前写错的归因）。
   我原来写的是"leg 的 sha 在写盘时读"——**不对**：`r-exec-cli.mjs:147` 的
   `const GIT_SHA = git("rev-parse --short HEAD")` 是顶层量，进程**启动**就取好了。
   真机制在续跑：`:20` 明写"同一 --out 下已有 exec-results.json 时按 manifest|id 跳过跑过的，合并后整体守恒才写盘"，
   而 `:437` 落盘时给**合并后的全集**写 `gitSha: GIT_SHA` ⇒ 老行被新程的提交背书。
   实测形状：`exec-interact-real-sc-r10/exec-results.json` 的 `gitSha=93650335`（提交 2026-09-28T19:41Z）、
   `updatedAt=19:44Z`，而它转出的 `reports/screenshots/round-8-interact/manifest-detail.json`
   帧 `at` 早至 19:13Z —— 早 28 分钟，19 张因此全判 pre_stamp。
   改法（不改判据）：每行落 `row.sha = GIT_SHA`（该行**实际执行时**那程的启动 sha），
   顶层只留"本程启动 sha"并如实记 `mergedFrom`；或者拒绝给"含未跑过之外来行"的文件整体重盖。
   可照 `:789` 已有的 `fileBands` 那种逐件记账的形状做。

3. **TAP_RE 看不见驼峰动词，已核实造成两条假绿**。`r-exec-cli.mjs:145` 的英文支是
   `(?<![A-Za-z])(?:tap|click|input|scroll|swipe|trigger|press)(?![A-Za-z])` —— 前视断言把
   `rapidTap×5` 里的 `Tap` 挡在外面（前面是字母 d），于是"这条判据要不要点东西"判成**否**，
   执行器根本不走点击分支，却仍被记 `EXECUTED`。
   我按判据原文实跑那条正则：`RE.test(DND08.action)=false`、`RE.test(VI40.action)=false`
   （别被我第一眼的读法骗了——VI40 正文里有"频道 Tab 项"，看着像命中，但 `tab` 与 `tap` 不同形，
   实测就是 false）。两行在 `reports/audit/round-6/interact/exec-results.json` 里现在都是
   `"status": "EXECUTED"`。
   DND08 还叠了**第二条独立的不合格依据**：它自己的 `observed` 写着
   `pre:login A ok userId=user-1001 MISMATCH!`，且 `missingEvidence=2` 两条都是
   "未写出:ERROR:timeout … 盘上存在=false" —— 前置身份核对报了不符、前后帧一张都没落盘，
   却仍是 EXECUTED。VI40 则有证据（`missingEvidence=0`），它的问题是 `probeMany` 把
   `fields({size:true})` 的几何扔了（见第 4 条），不是同一处塌法，别混成一类。
   这不是小瑕疵：它和 `census-tap-targets.mjs:26-37` 想防的是同一个坑（那门甚至会为 `getApp()` 里的
   `tAp` 立负例），却漏了驼峰这一形。
   改法要成对做：① 动词表补驼峰边界（别写成把 `searchTap` 也吞了的无边界版）；
   ② 给 `census-tap-targets.mjs` 加一条**能变红**的负例 —— 拿 `rapidTap×5` 当正对照，
   断言它必须被认成交互动词；再拿 `getApp()` 当反对照，确认没把幽灵入口放进来。
   注意 `r-exec.cjs:1174-1178` 那条防降级守卫只在一处存在，另一条路径没有 ⇒ 别以为已经全局挡住。

4. 车道普查（`.zcode/tmp/c21-capability-matrix.md`，396 行）指出三件"载具已有、只是没接线"的事，
   都不需要新能力：`probeMany` 取了 `fields({size:true})` 却只留 `res.length`（`r-exec-cli.mjs:224`，
   `r-exec-ws.mjs:430` 同抄；正例在 `r1-exec.cjs:1195-1198` 保留了几何）；
   `installToastHook/drainToasts`（`r1-exec.cjs:278-305`，:293 已经包住 showModal）是可整段搬的
   evaluate 载荷，而 `row.toast/console` 现在被钉成空串（`:184`、`r-exec-ws.mjs:132`）；
   `pullDown/stopRefresh`（`r1-exec.cjs:1115-1126`）与 `longpress`（`:1033/:1068`）在派发环
   `r-exec-cli.mjs:605-611` 里没有出口（那儿只发 tap/input，且 `--value` 硬编码 `123456`）。
   真正需要新写的是：逐请求网络计数、网络条件注入、原生 ActionSheet/showModal 选项桩
   （选择器够不到原生层 ⇒ **MSG26 的"真点"腿保持 NOT_SHOOTABLE**）、同名多元素的第 n 个消歧。

这四刀都不涉及判据文本与阈值。其中 1、2、4 属于"把我自己造的假归属/漏量止住"，不需要你裁定；
第 3 刀会**动到台账计数**，但两条不一样：**DND08** 有两个独立的不合格依据（动词没被认出 + 前置身份报 MISMATCH + 前后帧零落盘），
该从 EXECUTED 降级；**VI40** 有帧、`missingEvidence=0`，它不该降级，缺的是那条几何判点从未被量到
（`probeMany` 扔了 `fields({size:true})`），应如实补一个"该 clause 未测"的落点而不是把整行抹掉。
动账必须走单一写者路径、先 `--dry` 再 `--apply`、并留逐文件回滚点，不能顺手把两行改了就算完。
四刀都必须排在车道收工之后，理由见本节开头那条撕裂读数。
