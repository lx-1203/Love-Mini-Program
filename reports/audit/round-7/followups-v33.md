# 本轮未收口的账（v3.3 续作轮交接，2026-09-29 03:43）

这份文件只写**还能干的活**，以及为什么它们排在后面。每条都给到能直接执行的程度：命令、参数、判据、验收口径。不写"基本完成"，也不写"待跟进"这种没有主语的句子。

## 1. `#51` 与 `#67`：三份手写计划终于有落盘工具了，还没跑

- 载体已存在：`scripts/qa/apply-ops-cellplans.mjs`（`round7-NOTES.md` §104.3 建成，带四道闸：新名字必须在**两档产物该页 wxml 里逐字命中**、整词比对不做子串；rename 组必须能在正文里找到那个死名字；B 组只打 `automatable:false` 三个标记、一条不删，落盘前后各数一次用例总数不守恒就 exit 1；先在内存里做完再一次性落盘，每个 manifest 自动续号备份）。
- 当时的实测读数（§104.3 留档）：`dry A=9 B=22 拒绝=0，涉及 10 个 manifest 的用例数=581（改前=581）OK`；负例三条（假类名 / 不存在的 id / 无 why 的盖章）全部被点名并 `exit=1`。
- 要落盘的是三份手写计划合计 31 行：`scripts/qa/cellplan-round7-deadselectors.json`、`-login-skips.json`、`-taptarget.json`。
- **为什么现在没跑**：`round7-NOTES.md:1897` 与 `:3503` 写明在跑的腿是逐组读 ops 文件的，中途改会让同一轮前半用旧判据、后半用新判据。本程的交互腿（`.zcode/tmp/lane-ui2/`）03:42 仍在写。
- 命令（腿停干净之后；**本工具没有 `--dry` 旗标**，不给 `--apply` 就是干跑，乱给旗标会被 `KNOWN=["plan","bands","apply"]` 那两道闸挡下并 `exit 2`）：
  ```
  N=/d/codex-tools/node-v22.17.0-win-x64/node.exe
  "$N" scripts/qa/apply-ops-cellplans.mjs          # 干跑（默认吃三份计划，见 :33 的 PLANS 默认表）
  "$N" scripts/qa/apply-ops-cellplans.mjs --apply  # 核对无误再落盘
  ```
  单份指定用 `--plan a.json --plan b.json`，两档比对的产物目录用 `--bands p1,p2`（用法原文在 `:13`）。
  验收：看它自报的那行 `OPSCELL 计划=… A 组=… B 组=… 其中已落地=… 待改=… 拒绝=…`，拒绝必须逐条有名有因；落盘前后用例总数守恒（§104.3 当时是 581→581），落完后 `verify-source-shape --dry` 与 `verify-ledger` 仍 exit 0。

## 2. 167 条"不可核"里，45 条其实可以回收

三刀只读重判的产物在 `tmp/qa/unverifiable-recheck-{1,2,3}.json`（`round7-NOTES.md` §104.2），我现算的分布：

| 去向 | 条数 | 下一步该谁做 |
|---|---|---|
| `SELECTOR_MISSED` | **45** | 可回收：源里有真名，写进 ops 的 `tapTarget` 就能判 —— 用上面第 1 节的工具，四道闸正好为这件事设计 |
| `COMPOSED_OR_SCOPED` | 42 | 元素在但名字查不到，要逐条写清机制（拼接/作用域），属判据正文补写 |
| `CRITERIA_NAMES_NOTHING` | 36 | 判据点了产品没有的东西 ⇒ 收紧判据或改成非帧判 —— **这是政策选择，交人拍板**，不许我批量盖章 |
| `WRONG_BAND` | 19 | 这一档表达不了 ⇒ 要点名哪一档能（mock/real/showcase 三档各答不同问题，见在册规则） |
| `NO_ELEMENT_NO_FIX` | 25 | 无物件且不修，按免检登记并写理由 |

⚠ 这三份产物在 `tmp/` 里，被 `.gitignore` 挡着，**只在采集机存在**。这和 `decisions-v33.md` 第 5 项是同一个病：账面引用了不可携的路径。要么把它们挪进 `reports/audit/round-7/`，要么在报告里写死"仅采集机可查"。

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
