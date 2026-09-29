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

本文件第 1/3 节的命令**不能在车道还在跑的时候执行**，否则拿到的是撕裂读数（本轮实测：同一条命令在重建窗口内会读 dist 0 vs dist 2；边跑边提交会把 corpus 的 resolvableOlder 从 42 抬到 45）。
1. 确认三条在途车道都已收工：`ls -lat --time-style=%H:%M .zcode/tmp/lane-wiring/ .zcode/tmp/lane-panelword/ .zcode/tmp/lane-ops/` 全部停止增长；它们未提交的改动分别落在 `run-qa-selftests.mjs`、`run-round7-closeout.mjs`、`emit-round-report.mjs`、`test-guest-landing.mjs`、`verify-guest-landing.mjs`、`.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts`（GATE_SUITE 已由 10 条接到 12 条）。
2. 确认 UI 租约没人持有：`node22 -e "import('./scripts/qa/ui-lease.mjs').then(m=>m.heldLeases().then(h=>console.log(h)))"` 应为空；端口 9420/9430 与后端 8080 此刻都是活的（零点击冷启配方见第 3 节）。
3. 跑 `bash scripts/qa/run-final-verify-v33.sh`（12 条门禁 + 可变红自检 + 自测汇总 + 工作流干跑 + 不跳实时门的全量面板 + 面板后复量），再跑 `node22 scripts/qa/gen-round8-report.mjs` —— 总报告 §7 会从 summary.json 自动填真实读数。**在那之前 §7 保持"未跑"字样，不要手填。**

本轮已入库 25 条提交；工作树约 160 项脏，其中绝大多数属于上述三条在途车道，**不属于我、也不该由我代为提交**。
