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

## 7. 我踩到的一处构建链缺陷：`build:mp-weixin:showcase` 会覆盖 mock 共享产物
B7 补名之后 src 比三档产物新，我按 mock → real:isolated → showcase 的顺序重建，
结果**最后一手把 mock 档毒掉了**。实测（`apps/client/dist/build/*/config/env.js`）：

| 目录 | 重建后 MODE | 说明 |
|---|---|---|
| `mp-weixin`（mock 共享产物） | `mp-weixin-showcase` ← **错** | showcase 链没有 `UNI_OUTPUT_DIR`，`uni build` 默认就写这个目录 |
| `mp-weixin-real` | `real` | 隔离脚本守住了（`sharedOutUntouched=yes`） |
| `mp-weixin-showcase` | 9-28 00:49 的旧物 | 我这轮没写进去，它是历史上"建完再拷"留下的 |

也就是说 **mock 与 showcase 共用同一个输出目录，二者不能共存**：谁后手谁毒掉对方。
这正是 WF-RUNTIME-GAPS 里 F1 给 real 档点名的同一族缺陷，只是发生在 showcase 上，
而 real 那一支已经有专用隔离载具（`apps/client/scripts/build-real-isolated.mjs`），showcase 没有。

我这次的恢复动作（顺序敏感，记下来免得重复踩）：showcase 建 → 把共享目录整体拷进
`mp-weixin-showcase` → **无论前一步成败都必须**再跑一次 `build:mp-weixin:mock` 收尾；
终态复量：`mp-weixin=mp-weixin-mock`、`mp-weixin-real=real`、`mp-weixin-showcase=mp-weixin-showcase`。

该修的不是我的顺序，是脚本本身：**给 showcase 一条自己的隔离出口**
（照 build-real-isolated.mjs 用 `UNI_OUTPUT_DIR` 改道，别再靠"建完手工拷"这种没有回滚的载具）。
在这把刀落地之前，任何"按 mock/real/showcase 顺序重建"的编排都必须把 mock 放在最后一步，
并且重建完必须逐档 grep `MODE:` 复核 —— 只看构建退出码看不出土被谁占了。

### §7.1 我这次恢复动作自己造了一次半销毁（如实记，不粉）
为了让 showcase 落进它自己的目录，我写了 `rm -rf dist/build/mp-weixin-showcase && mv _sc.new dist/build/mp-weixin-showcase`。
实际发生的是：
- `rm -rf` 报 **`Device or resource busy`** 而**非零退出** —— 那个目录被开发者工具（模拟器）持有；
  但它在我碰到被占的那一项**之前已经删掉了其余内容**；
- 我的 `mv` 于是没有"替换目录"，而是把 `_sc.new` **搬进了那个半空目录里**，
  而 `SWAP_EXIT=$?` 取的是 `mv` 的 0 ⇒ 日志看着像成功。
- 结果：`mp-weixin-showcase/` 顶层只剩一个套娃的 `_sc.new`，9-28 那版 showcase 产物已没了。

恢复：`_sc.new` 是当轮 showcase 的完整拷贝（28 项、`MODE:"mp-weixin-showcase"`、app.json/app.wxss 齐），
把内容上移一层即复原，且这一版比 9-28 那版更新（含守卫与 B7 命名）。终态逐档 grep 复核：
`mp-weixin=mp-weixin-mock`、`mp-weixin-real=real`、`mp-weixin-showcase=mp-weixin-showcase`。

三条以后必须守的规矩（都是这次用代价换来的）：
1. **模拟器持有的目录不许 `rm -rf`** —— 要换内容就先 `mv` 到临时名再就地覆盖写，或直接往里拷；
   `rm -rf` 在 busy 时是"删了一半 + 退出码非 0"，不是"什么都没做"。
2. 编排里每一步的退出码必须**逐步**取（`cmd; echo $?`），不能让 `rm && mv` 共用一个 `$?` ——
   我这次的 `SWAP_EXIT=0` 就是拿 `mv` 的成功掩盖了 `rm` 的失败。
3. 动 `dist/build/**` 之前先确认没有 UI 腿/模拟器在用：`heldLeases()` 为空**不代表**模拟器没开着项目，
   它只代表租约没人拿；目录能不能删是另一件事。

## 8. 四轮终局复量的差值（同一支脚本；每轮 HEAD 前后同值 ⇒ 读数不受提交漂移污染）

| 轮 | HEAD | 绿/红 | 红项成员 | 这一轮为什么变 |
|---|---|---|---|---|
| r3 | `5a9c65ec` | 14 / 4 | panel, corpus, provenance, real-coverage | 基线 |
| r4 | `ea7acbd6` | 14 / 4 | selftests, corpus, provenance, real-coverage | **panel 转绿**（§29(b) 生效，`EMIT_RESULT=OK`）；新红是我接受守卫车道账本时带进的**过期夹具**（第 28 条裁定 vs 9-27 的 triage scratch） |
| r5 | `0e62fa22` | 14 / 4 | dry-no-lease, corpus, provenance, real-coverage | selftests 回绿（测试没隔离父环境那事修好）；**新红 `verify-dry-no-lease`** |
| r6 | `224356b0` | **15 / 3** | corpus, provenance, real-coverage | dry-no-lease 回绿；剩下三条**全是等人裁定，没有一条是工具坏** |
| r7 | `f1e05ebd` | **16 / 2** | provenance, real-coverage | corpus 转绿（§见下：空 gitSha 改按"打戳约定起点"判 legacy，与 provenance 同一口径）；两条剩红各自**只剩一个成因**，见 §10 |
| r8 | `992f0fe8` | **16 / 2** | provenance, real-coverage（成员一字未变） | **红集合没动，这一轮的账也不欠在门禁上**：#10 的 36 条 CNR 全部落去向（7 补命名 / 7 转源码级判点 / 21 拆成"已接通道 · 仍拒发 · 采不到要说清"三种），四条新通道进执行器，另纠出一台一直在打零分的假仪器（decisions §31④）；这些都不在 provenance/real-coverage 的判点上，所以掉绿 0、增绿 0 是**正确的读数**，不是没干活。离线自测 30+1 → **34+1 全绿**（新增的 5 条都配了能变红的负例） |

r5→r6 这条要单独记：它不是回归，而是**我修面板落点时把面板第一次送进了静态门的射程**。
改前该文件 verdict=`no-dry`（门根本不审它），我往 `:620` 加了 `"--dry"` 实参之后它才"自称支持 --dry"，
于是那句 `acquireUi` 第一次被要求有可见守卫 —— 而它确实没有。**这个洞一直都在，只是从没被审过。**
解法是把 `--dry` 做成真语义（不取租约、不跑实时门）+ 把 take 放进 else 分支，
不是给门加 `--allow`（commit `224356b0`；复测 `DRYLEASE_SELFTEST=PASS cases=5`，
"只印不退出"那条负例仍在 ⇒ 识别能力没被削弱，覆盖面是净增）。

r6 的稳定读数：`SRC_SHAPE total=98 成立=98 不成立=0`；
`REALCOV_COVERED=198 / UNCOVERED=10 / UNCOVERED_LIST=10`（点名数与计数守恒）；
`CORPUS_SCANNED=47 PROBLEMS=1 STORE=reachable`；`PROV_FRAMES_CONSISTENT=4154 / PRE_STAMP=4886`；
`verify-band-freshness` PASS（三档 MODE 各自正确，mock 的 env.js 仍是 `f1c7b96b`＝证据里的 `mock@f1c7b96b`）；
`run-qa-selftests` 发现=30 全绿；`dryrun` 3/3；`emit-round-report` OK。

## 9. 我按 #15 重建三档时抓到的两件事（其中一条推翻了我上一条报告的措辞）
先纠正我自己：我在落账 #15 时说"两次 showcase 真构建已验证"——那是**引用车道的自报**。
我这次亲自按 `mock → real:isolated → showcase:isolated` 顺序重跑，结果是：

| 步骤 | 退出码 | 结果 |
|---|---|---|
| `build:mp-weixin:mock` | 0 | ✅ |
| `build:mp-weixin:real:isolated` | 0 | ✅ `MODE:"real"` |
| `build:mp-weixin:showcase:isolated` | **1** | ❌ 但产物侧其实是对的 |

**好消息（这才是 #15 真正要证的事）**：showcase 那一步失败时，
`mp-weixin/config/env.js` 的 sha256 前 8 位仍是 `f1c7b96b`、`MODE` 仍是 `mp-weixin-mock`，
`mp-weixin-real` 仍是 `real` —— 也就是说 showcase 再也碰不到 mock 共享档，**隔离成立**。
失败发生在构建自己的前段（`profile-svg-to-png`）：
`src/static/assets/profile/png/profile-hero.png: write error / system error: Invalid argument`，
载具 `:239` 于是如实报 `showcase 构建未成功退出` 并 `SHOWCASE_RESULT=FAIL`。
注意它**没有**把这条误判成"feature-flags 断言不过"——那行 `membershipEnabled:!1` 只是信息打印
（showcase 是运行时由 `config/showcase.js` 翻成 `!0`，编译初值本来就该是 `!1`）。

**新发现的稳定性问题（不是这次改动引入的，是既有设计）**：
`profile-svg-to-png` 把产物**写回 `apps/client/src/static/` 里被 git 跟踪的文件**，
而且编码器不是逐字节确定的 —— 同一份 SVG 重跑得到 28622B，仓库里是 28638B（两端都有完整 IEND，
不是截断，是合法重生）。后果有两条，都不容小看：
1. **任何一次构建都会把工作树弄脏**，于是"跟踪文件脏项=0"不再是"没动过"的凭据；
   我在 #15 之后量到 `tracked_dirty=1` 就是这个，而不是谁改了产品代码。
2. 更危险的方向：这类 16 字节抖动会让**按字节/按 mtime 的判定**漂——本仓的门禁恰恰重度依赖
   mtime（band-freshness）与 sha（provenance/corpus/证据库）。
   我把这次抖动当作 `verify-band-freshness` 未来假红的候选源来登记，而不是当噪声。

处置（我已做的）：先把重生出的 PNG 备份到 `.zcode/tmp/profile-hero.build-output.png`，
再对**单个路径** `git checkout --` 归位（当时所有车道已收工，且要丢的只是构建产物 diff，
不是任何人的编辑）；归位后 `git status --short apps/client/src/static` 为空。
我另有一条自己犯的错要记：重试时把重定向写成 `../..zcode-tmp`，
先差点留下杂散文件、又把构建输出丢掉——已确认仓内没留下该文件（`git status` 干净）。

待办（不在本轮做，需你点头才动）：把 `profile-svg-to-png` 的产物写回源目录改成
写进 `dist`（或加 `--check` 只验不写），并让它确定化输出字节；这条改的是构建链与 src 的关系，
动完必须重建三档 + 全量复量，属于新的授权范围。

## 10. r7 终局复量：16 绿 / 2 红，以及"两条剩红各自只剩一个成因"

读数由机器填（`scripts/qa/run-final-verify-v33.sh` → `.zcode/tmp/final-verify/summary.json` →
`gen-round8-report.mjs`），归档在 `reports/audit/round-7/final-verify-summary-v33.json` 与
`final-verify-r7.md`（逐行读数的可提交副本 —— 原始 `.log` 被 `.gitignore:37` 的 `*.log` 挡在仓外，
本仓 `reports/audit/round-7/` 里跟踪的 `.log` 数实测为 0）。`HEAD 前=f1e05ebd 后=f1e05ebd` ⇒ 这一轮的 sha 敏感门读数不受提交漂移污染。

**r6→r7 的差值只有一条**：`verify-evidence-corpus` 由 `PROBLEMS=1 exit=1` 变 `PROBLEMS=0 exit=0`，
成因是 `0c8175e2` —— 空 gitSha 不再一律索要处置，而是与 provenance 共用同一条"打戳约定起点"
（由 `git log -S gitSha -- scripts/qa` 派生，实测 `conv=2026-09-24T16:31:39Z`），早于它的 144 帧
记 `CORPUS_LEGACY_NO_SHA=1` 而不是记红。掉绿 = 0 条。**这条不是把红藏起来**：undated / 幻影 sha /
晚于约定起点的无戳帧仍然判红，且负例 `test-corpus-legacy-window.cjs cases=36 fail=0` 里
`mutant_bad=2 / live_bad=0` 证明它会红。

两条剩红现在**各只有一个成因**，都等裁定、都不是工具坏：

| 门 | 当前唯一红源 | 已排除的其它成因（本轮实测字段） |
|---|---|---|
| `verify-provenance-all` | `PROV_FRAMES_PRE_STAMP=4886` | `STALE=0 / UNDATED=0 / UNRESOLVABLE=0 / UNKNOWN_BAND=0 / MANIFESTS_BAD_SHA=0 / MANIFESTS_NO_SHA=0`；`CONSISTENT=4154`、`LEGACY=144`、`NO_SHA_LEGACY=1`、`PRODUCERS=11` ⇒ 待 #25 |
| `verify-real-coverage` | `REALCOV_UNCOVERED=10／236` | `CONSERVATION=OK / NEVER_ON_REAL=0 / IDENTITYLESS_ON_REAL=0 / SESSION_CONTRADICT_*=0`；`COVERED=198`、免检 28 ⇒ 待 #17 的设备腿授权 |

三条新轴本轮**第一次有读数**（不再是空白）：`BANDLESS_ROWS=31／SCANNED=145／15363`、
`IDENTITYLESS_ROWS=31／15363`、`SESSION_UNPROVEN_ROWS=1149／15363`（`SESSION_PROVEN=57`）。
它们是 advisory，不进判红集合；登记在此是为了下次有人问"这三条轴是不是空转"时能给数字。

**纠一条我自己落档错的话**（§9 末句）：我写了"已确认仓内没留下该文件（`git status` 干净）"，
这句是**引用车道当时的自报**、不是我的复测。我这次量到 `apps/..zcode-tmp` 确实存在
（4800 字节，mtime 18:48，内容就是那次 showcase 构建的 stdout —— 重定向 `../..zcode-tmp`
从 `apps/client` 解析出来正是这个位置）。处置：不删，移到仓外只读位置
`.zcode/tmp/stray-apps-dotdot-zcode-tmp-r7.log`（它是**未跟踪**杂散项，移走只减掉一条 `??`，
不影响跟踪脏项计数——我不用"脏项变少"来当处置成功的凭据）。
教训与既有那条同族 [[feedback-audit-claims-before-restating]]：**"已确认没有留下"必须由我自己 `ls` 出证**。
杂散文件的命名错误本身也记一次：重定向目标应写成绝对/仓内已知目录，`..` 开头的相对路径会落到上一级目录里。

## 11. #17 的设备腿**没能开拍**：两支架载具对"谁是证人"各执一词（2026-09-29 21:0x，实测非推断）

我先按裁定去拍那 5 组落地对：
`verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real --repeat 3
--only GG-campus-campus-index,GG-discover-extra-discover-matching,GG-village-village-tag-posts,GG-setup-campus-index,GG-setup-recommend-pref-index`
⇒ **exit=2，一条帧都没拍**，租约也没白拿（这正是它该有的样子）：

```
GUEST_LANDING=FAIL 先修这几条再来量（带病出腿 = 白拿租约）：
  policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何被收窄出游客腿的用例 ⇒ 这一组没有任何证人：
  subpackages/setup/recommend-pref/index → pages/login/index
  组 … 一名成员都没有 ⇒ 有裁定却没有账本成员，不能出 GG-* 腿
```

我把"是不是我传错了"逐条排掉，然后量到真正的分歧（每条都有命令与数字）：

1. **不是 `--ops` 传错**：round-6 与 round-7 两份语料里含 `RP01` 的文件各 1 份；换成 round-7 同样 exit 2。
2. **判据行是真的存在**：`reports/audit/round-7/ops/次要21.json` 里 `subpackages/setup/recommend-pref/index`
   有 **11 行**（RP01–RP11），只是它们**全部没有 `identities` 字段**；而同文件的兄弟页
   `setup/campus/index`(SCU 13 行)、`setup/schedule/index`(SCH 12)、`setup/interest/index`(INT 11)
   每行都带 `identities:["A","B"] + identitiesFrom:"tag-ops-identity-scope.mjs" + identitiesWhy`。
   （我第一次扫 RP 行用了 `/^RP\d+/` 去匹配 round-7 全目录，输出为空，差点据此写"RP 行不存在"——
   那是我的匹配口径错，不是语料缺行。）
3. **`tag-ops-identity-scope.mjs` 干跑报 `改写文件=0`，而这不矛盾**：policy 落点表 28 页覆盖 **471 行**，
   其中 **462 行**正文自己提到 游客/未登录/引导/弹回 ⇒ 该载具的第二条规矩（"判据文本自己点名游客的一律不标，
   摘掉它们等于把唯一有效的断言删了"）把它们全保护住了；剩下 9 行早已带标 ⇒ 确实无账可写。
4. 于是矛盾落在**取证口径**上：`verify-guest-landing.mjs` 的组员是**从"被收窄出游客腿"的行反推**的，
   而 recommend-pref 这页恰好**一行都没被收窄**（它的行全是"游客该看到什么"的断言）⇒ 名册为空 ⇒ 预检拦腿。
   但 `guest-landing-booked.json` 里这一组的 `caseIds` 明明写着 `RP01,RP02,RP06,RP10`（nIds=4）——
   **booked 与预检用的是两套成员来源，且互不认账**（booked=28 组、measured=28 行、roster=27 组）。

**为什么我停在这里而不是顺手改**：两种改法都会**改变"游客这条腿该判哪些行"**——
(a) 预检允许"整页都是游客断言"的组用该页游客行当证人（我认为这是对的：这一页恰恰最需要落地腿，
    现在的规则把"最该拍的一页"判成"没有证人"，方向是反的）；
(b) 或按 booked 的成员名册给这 4 行补 `identities:["guest"]`（等于把 RP01/02/06/10 改判成游客档）。
(a) 要配一条能变红的负例（声明了 guest 的语料里留一组无名册落地对 ⇒ 必须照旧 exit 2，不许顺手放行），
(b) 要动语料的身份声明 ⇒ 判据台 canon 变、必须重打戳。两条都不是"修 bug"，是**改判域**，按规矩交回你裁。

现场没有被破坏：`guest-landing-measured.json` 仍是 2026-09-28T10:15:58Z / `real@f0677920` 的 28 行
（我量之前先做了 `.bak-pre17-20260929-205601` 双备份）；scratch measured 未生成；`tmp/qa/locks` 无残留租约；
`git status -uno` 干净。另外两件事顺带确认：守卫在**新产物里活着** ——
`dist/build/mp-weixin-real/subpackages/setup/campus/index.js` 里有
`onLoad(()=>{if(E.guideGuestToLogin())…})`，五个页源码各引用 `guideGuestToLogin` 两次；
所以这一腿一旦解开拦门，落点是可归属的，不用再回到"由 401 兜底"那种解释。

## 12. r9 状态对账（2026-09-30 00:5x；上面 §0–§11 原文一字未动，现状态只写在本节）
按本仓 §30 定下的规矩：旧文不重写（重写会销毁"当时怎么错的"这条记录），现状另立一节。
裁定原文与实测纠偏见 `decisions-v33.md` §32 / §32.1；车道件逐条有名有姓。

| 本节要纠的旧说法 | 现在的事实 | 出处 |
|---|---|---|
| §2.1 "剩 4 条暂扣行待补'哪一档能表达'" | **已闭**：H03/N05/VI09 三行早由 `4727f38b` 落盘（幂等复跑 `已落地=3 待改=0`），MT03 的排除今日重推仍成立 ⇒ 记 `需环境` 并首次给它登记了去向 | L2 `held4-landing-r9.md` |
| §4 "改它要人授权" | **用户 2026-09-30 00:45 已授权**（F-04 修词界，收窄不是放宽），车道 L13 在做，配双向负例 | decisions §32.1 |
| §5 "面板只剩合并数、分不清哪一类会随 HEAD 涨" | **已闭**：面板加了三条具名读数 + `expected_to_grow=resolvableOlder`，门侧一字未改（gate diff 0 行） | L3 `panel-shaclass-r9.md` |
| §6 "四把载具刀等 UI 收工再动" | 三把已落 `b1db6e10`；`#10` 的 36 条 CNR 已全有去向 `992f0fe8` | git log |
| §9 "profile-svg-to-png 待你点头才动" | **用户已授权修**；执行车道 L9 在 150 轮上限中断，遗留未验收改动 ⇒ 派 L12 接手，**不得记为已完成** | decisions §32.1 末段 |
| §10 归因表 "real-coverage 待 #17 的设备腿授权" | **归因作废**：覆盖门根本不读 `guest-landing-*`（`grep -c` = 0），且 10 条在盘上都已有 real 档行、全部 SKIPPED。#13 与 #17 各关 **0/10** | L4 §0.4 + L7 |
| §11 "两支架载具对谁是证人各执一词，两种改法都改判域，交回你裁" | **用户裁定 (a)**；已落地并亲验：`--mode book` exit 0、`GUEST_LAND_ROSTER 组=28 成员行次合计=445`、`GUEST_LANDING_RESULT=OK`，新路子只在"该页每一行都没声明 identities"时启用，负例翻正即红（39 断言） | L6 `guest-membership-r9.md` |

**本节新立的两件事**
1. **两条红不是车道造成的**，本轮终验必须按此归属，不许当噪声抹掉：
   `verify-ledger reports/audit/round-6` exit 1 ← `70472d92`（删 260 份一周前报告）；
   `test-evidence-store-axis` ← 用户选择把 3848 帧盘上截图删掉（仓外库背书、盘上无物）。
   成因与可修性由 L15 逐路径量，L12-L15 的读数进 `decisions-v33.md` §33。
2. **`verify-case-automatable` 的自证轴此前从未被任何调用点喂过**（三个调用点都只传 `--json`），
   所以"假阳性率未量"是结构必然。r9 已由编排亲验后接进三处，实测读数
   `FP 83.3%（85/102，硬口径 47.1%）／召回 12.1%／精确率 16.7%`，`CA_AGREE_CONSERVE …=102 校验=ok`。
   接上的代价也写清：它现在**依赖** `reports/audit/round-6/interact/exec-results.json`（今日确认被 HEAD 跟踪），
   该件若被清理，这条门退 2 并指名"给了 --results 读不到"——**正确处置是换一个 title 全等的配对，不是删掉这一行**。

**续跑前必须做的三件事（替 §0 更新，§0 原文保留）**
1. 车道全停再复量：`ls -la --time-style="+%m-%d_%H:%M:%S"` 逐个看车道件 mtime 是否还在长（§0 那三条车道早已收工，此条现在管 L12–L15）。
2. **本仓禁止全仓还原**：`git checkout -- .` / `git restore .` / `git reset --hard` / `git clean` 一律不许——
   那会复活用户 2026-09-30 明确选择删掉的 3848 帧。要还原只按具名路径逐条动。
   同理**提交只走显式路径清单**：`git add -A` 会把这 3848 条 `D` 卷进 QA 提交。
3. 设备腿开拍前只认一条凭据：脚本自己印的 `WS_UP=OK`。端口在 netstat 里听着不算——
   本轮实测 `9420` 在听而会话取页失败 34 次，根因是 IDE 窗口最小化；先恢复窗口再接通道，别只加大 `--wait`。

## 13. r9 停点交接（2026-09-30 12:0x，turn 预算耗尽；§0–§12 原文一字未动）
**已入库且我本人复跑过的**（HEAD `0ba53340`，前一发 `da996f3a`）：
- `verify-case-automatable --results` 三处接线（FP 83.3%／硬口径 47.1%／召回 12.1%，`CA_AGREE_CONSERVE` ok）；
  `verify-ops-corpus-stamp --check` 接进 DSL 与 bash（`canon=0fef00d141e7 / cases=1107 / 零漂移`）。
- 构建确定性：产物移出 `apps/client/src`（三档 MODE 我逐档 grep 复核、`git status --short apps/client/src` 0 行）。
- F-04：`DENY_TAP` 三副本收敛到 `scripts/qa/deny-tap.cjs`；我复跑 `DENYTAP_TEST=PASS checks=33`；
  全语料 `refuse 32→30，released=次要18|TD03,次要20|OT09，newly_denied=(none)`。
- 游客腿：`measured-ledger.mjs` 合并语义（`merge-never-shrink`，缩减需显式 token），我复跑 `GL_TEST=PASS checks=39`；
  **5 组授权落地对全部真跑出读数**（landing=`pages/login/index`、identity=`not-logged-in`、stable=true、
  band=`real@f0677920`、两枚 markers 皆在）。⚠ 如实降级：这些行 `samples=1`，调用却是 `--repeat 3`
  ⇒ "stable"是单样本结论，当三样本稳定引用前必须重跑并核 `samples` 数。
- 入册：`decisions-v33.md` §32/§32.1/§33（裁定、实测纠偏、亲验流水）。

**两发后台作业在飞，turn 预算内不可能读到结果**（它们各自要 10–20 分钟，我起跑后只过了约 2 分钟）。
会话若断，它们会被孤立；**重跑命令与日志落点如下**（别信"应该跑完了"）：
1. L16 语料门验证 —— **已裁决并入库（2026-09-30 21:0x）**：那发 FAIL **不是缺陷、也不是新信号，是我自己的配置错**。
   分辨过程与结论（照此复核，别重跑）：
   - 同一条命令**带** `QA_EVIDENCE_STORE=D:/6/love-mini-evidence`（终验脚本就是这么导出的）⇒ `CORPUS_STORE=reachable`、
     `CORPUS_PROBLEMS=0`、`CORPUS_RESULT=PASS`，且 `CORPUS_DENOM_BLINDSPOT absentNeverOpenedByGate=3846`
     **在 PASS 里也照样具名** —— 这正是 L16 那一刀要的效果：绿不能再被读成"语料完好"。
   - **不带** store（我先前就这么跑的）⇒ `PROBLEMS=1`、FAIL；而**HEAD 版**同样不带 store 是 `PROBLEMS=2`。
     ⇒ L16 的 +120 行把裸跑的问题数从 2 降到 1（把 5 帧"选定删除集内缺席"归入 advisory），**它是改善不是回归**。
   - 那条被判红的 144 帧：`reports/screenshots/round-1/manifest.json` 的帧，`git status --short` 在该目录只有
     **1** 个 `D`（`blank-check.tsv`）⇒ 这 144 帧既不在你的删除集里、也从未被跟踪，是 2026-09-19 那份
     约定前清单的**幽灵引用**；带库时由仓外库背书 ⇒ 不判红。
   **教训**：语料门的判决随"库可达/不可达"两态而变，比较任何两次读数前必须钉住这一维——
   这正是本仓记过的"环境变量是第二条配置通道"。
2. 提交后 sha 敏感三连（工作流自己的规矩：提交会移 HEAD）：`verify-provenance-all` → `verify-band-freshness`
   → `verify-real-coverage`，日志在 `.zcode/tmp/orch-r9/post-*.log`；`provenance` 已起跑、另两发未起。

**必须接手的四件（按优先级）**
1. **L16 的 +125 行未验收**：`git diff scripts/qa/verify-evidence-corpus.mjs` —— 它在账号每日额度耗尽时中断，
   本次**故意没入库**。跑通并读到 PASS/FAIL 与新的分母读数后再提交；若读不通就按具名路径回滚那一个文件。
2. **r9 终局复量目前是暂定读数**：19 步、红 6，HEAD 前=后=`491210dd`，但它跑在 L13/L16/L17 在途期间
   （我的静默判据把"文件 39 分钟没动"误读成"车道收工"）。三条红已逐条归因（ledger×2 由 `70472d92` 删 118 份佐证文档、
   `prove-gates-can-fail` 是 INCONCLUSIVE 传播、`run-qa-selftests` 2/38 含你的删帧与过期夹具）。
   **接 1 之后在 `0ba53340` 上复跑 `bash scripts/qa/run-final-verify-v33.sh`，再跑 `gen-round8-report.mjs` 让 §7 机器回填。**
3. **两条待你裁定**（我不替你选）：(a) `verify-ledger` 那 71 条孤儿的去处——恢复 7 个文件（实测可 71→0 PASS）／
   重指向（重建 71 行）／加"语料缩水断言"；前两条都隐藏 provenance。(b) real-coverage 10 条去向的**机器件无消费者**——
   扩 `emit-openrow-register.mjs` 的键并加读者，或授权新载具。
4. **非本会话的未提交改动不许顺手带走**（另一会话的 r20 车道）：`.zcode/workflows/…dwf.ts +30`、
   `gen-round8-report.mjs +136`、`run-final-verify-v33.sh +14`、`run-qa-selftests.mjs +3`、`verify-package-size.mjs +8`、
   `evidence-holes-verdict.json`。要动先问归属。

**本轮的外部天花板**：两名车道死于 `You've reached your daily usage limit for Chat`（账号级额度，不是 turn 上限），
所以**当天不可能再派发车道**；上面 1–4 得在下一个预算里做。

**提交后 sha 敏感三连的读数（2026-09-30 20:0x 到点，HEAD 已验为 `0ba53340`）**——把它记下来，省得下一位重跑一遍当未知：
```
POST verify-provenance-all  exit=1  PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论）
POST verify-band-freshness  exit=0  FRESH_RESULT=PASS
POST verify-real-coverage   exit=1  REALCOV_RESULT=FAIL（真实模式覆盖守恒：跳过不算量到，单身份不算双身份；免检只免"本门不追"，不降阈值）
```
两条红与裁定预期一致（provenance=§25 既定历史红；real-coverage=已逐条分流的 10 条，分流**没有**关掉任何红），
**没有新红**。特别记 `band-freshness=PASS`：这正是构建确定性那一刀必须保住的门（src 不再被写脏 ⇒ 它不再把构建产物读成"过期的源码改动"）。
⚠ 注意这是**三连**（sha 敏感子集）而不是十九步全量：全量终验仍须按上面第 2 条在 `0ba53340` 上重跑一遍。

**两条硬规矩（本轮用代价换来的，别重学）**：① 本仓禁止 `git checkout -- .` / `git restore .` / `git reset --hard` / `git clean`
——会复活用户明确选择删掉的 3848 帧；② 提交只走**显式路径清单**，`git add -A` 会把那 3848 条 `D` 卷进 QA 提交。

## 14. §13 那四件的收口（2026-09-30 21:0x；用户裁定"将所有问题解决"当次的落地）
§13 原文不动，这里只写它四件现在的状态与去向；逐项证据在 `decisions-v33.md` §34。

| §13 的待办 | 现状 |
|---|---|
| 1. L16 语料门验证 | **已闭**（`d0b6f0d4`）：那发 FAIL 是**配置错**（我裸跑没带 `QA_EVIDENCE_STORE`），带库 ⇒ `reachable/PROBLEMS=0/PASS`，且盲区行 `absentNeverOpenedByGate=3846` **在 PASS 里也具名**。L16 的改动是改善（裸跑问题数 2→1），已入库。 |
| 2. 十九步终验在 `0ba53340` 上重跑 + §7 回填 | 19:0x 那发**作废**（我在 sweep 中途改了面板 ⇒ 自污染，红 8 不可引用）；随后已在 `6e3420ec` 上重跑，**其读数与 §7 以 `reports/audit/round-7/final-verify-summary-v33.json` + 本轮报告为准**（本节写下时它刚起跑，别引用本节当读数）。 |
| 3a. ledger 71 条孤儿 | **已按你裁定落地**（`6e3420ec`）：退役登记件 + 门读它，`LEDGER_RETIRED=71` 具名，**PASS 行也带退役数**；双向验证过。 |
| 3b. 10 条去向无消费者 | **已按你裁定落地**（`6e3420ec`）：去向件入库 + 面板 `EMIT_DESTINATIONS` 具名行 + 校验（行数/词表/blocker），移开件即红。 |
| 4. 非本会话未提交改动 | **按你裁定保持原样**：仍在树里未提交；其中 `run-final-verify-v33.sh` 的 +14 行新增 `verify-carrier-wiring`、`verify-lane-report-complete` 两条门并都读红 ⇒ 终验里这两条红**归它们**。 |

**顺带修好一处既存缺陷**：`emit-round-report.mjs` 的 `--dry` 原先是"一启动就 TDZ 崩"（`LIVE_SKIP_WHY` 先赋值后声明），
静态门只审守卫形状、审不出运行时崩 ⇒ 这条路径一直坏着没人发现；现已修好并复验。

**仍然挂着（不是遗漏）**：那两条外来门的归属（问过它们的作者再说）；`real-coverage` 的 10 条按去向件推进
（7 条缺载具能力、1 条换档、1 条身份不可造、1 条可下发）；`provenance` 的 §25 既定历史红按裁定每轮如实复量。
