# 执行器三刀（r-exec-cli.mjs）— 实现报告

状态：**进行中**（骨架先行，逐节回填）
车道：executor knives ｜ 拥有文件：`scripts/qa/r-exec-cli.mjs`（独占）
设备：**没有跑任何 UI 腿、没有开页、没有截图、没有下发交互**；但 §0b 记一次我自己的失误——它取过一次租约并在 4 秒内自行释放，现况仍是空闲。

## 0. 前置读数（改动前）
- baseline `run-qa-selftests.mjs` → `SELFTEST_RESULT=PASS（21 个离线测试 + 1 条门自检全绿，1 个 UI 绑定测试按策略跳过）`；`SELFTEST_RAN=21 SKIPPED=1 FAILED=0 NO_SUMMARY_LINE=0 覆盖文件=22/22`；**真实退出码 0**（`.zcode/tmp/knives/selftests-before.txt`）
- baseline `dryrun-workflow.mjs --profile all` → `DRYRUN_RESULT=PASS（3/3 画像跑到底并产出总报告）`；**真实退出码 0**（`.zcode/tmp/knives/dryrun-before.txt`）
- baseline 执行器离线自检 `r-exec-cli.mjs --selftest` → 改前 30 例（见 git 行数），改后 `EXEC_SELFTEST=PASS cases=39 bad=0`
- ui-lease 改动前：`tmp/qa/locks/wechat-automation-cli.lock` = `status:"released"`、owner `emit-round-report-36048`、pid 36048 已死 ⇒ **空闲**（墓碑原样保留）

## 0b. 事故自报：一次误启的真跑（无 UI 动作、权威件未受损）
我把 `node --input-type=module -e 'import("…/r-exec-cli.mjs")'` 当语法检查用了——那是**执行**不是检查。逐条量过的后果：
- 铸了一张 A 档票（`RUNNER_IDENT_PRODUCIBLE=A 铸票端点=phone-login`，即打了一次后端登录接口）、取了一次 UI 租约；
- **没开过任何页**：`--out` 缺省落在 `reports/audit/round-7/interact`（盘上已有 1107 行），resume 把每页都 `todo.length===0` 跳掉 ⇒ 零条 `RUNNER_GROUP_START`、没截图、没点任何东西（`reports/screenshots/round-7-exec/` 最新帧仍是 Sep 26 22:01）；
- 守恒检查按设计判"一行都没产生"，只写旁路件 `reports/audit/round-7/interact/exec-results.rejected.json`（新增未跟踪，`rejected:true rows=1107 gitSha=f08c5eb0`），门禁读不到它；
- 权威件 `exec-results.json` **未受损**：`git status --porcelain` 对它无输出、`git diff --stat` 空、mtime 仍是 Sep 26 16:49；
- 租约由进程 exit 钩子释放：锁文件 `status:"released" releasedAt:"2026-09-29T06:57:14.595Z"` ⇒ **空闲**。此后静态验证一律 `node --check`（`CHECK_EXIT=0`）。
处置：旁路件不删（无回滚的删除是本仓点过名的禁忌），在此登记。

## 1. 刀一：逐行带戳（resume 不再认领没跑过的行）
- 主张 / 复核读数：
- file:line 前 → 后：
- 消费者接线：
- 负例证明：

## 2. 刀二：TAP_RE 认 camelCase 动词
- 主张 / 复核读数：
- file:line 前 → 后：
- 语料影响面（1107 行）：
- 负例证明：

## 3. 刀三：probeMany 保留几何并写进行
- 主张 / 复核读数：
- file:line 前 → 后：
- 负例证明：

## 4. 三个负例的红色证明（退出码）
| 刀 | 测试文件 | 修复后退出码 | 回退后退出码 |
|---|---|---|---|

## 5. 终验
- [ ] run-qa-selftests
- [ ] dryrun-workflow

## 6. 没证到的 / UNKNOWN

## 7. 验收补记（车道在 150 轮上限处中断，状态原为"进行中"；以下全部我本人复跑）
车道中断时三份负例已落盘、报告只写了一半。我逐项复量后才入库（commit 见 git log）：

- `test-exec-row-sha.cjs` → `ROWSHA_TEST=PASS`，exit 0（自己重跑，非引用车道结论）
- `test-exec-tap-verb-camel.cjs` → `TVC_TEST=PASS`，exit 0
- `test-exec-probe-geometry.cjs` → `GEOM_TEST=PASS`，exit 0
- `r-exec-cli.mjs --selftest` → `EXEC_SELFTEST=PASS cases=50 bad=0`，exit 0
- `run-qa-selftests.mjs` → 发现=27 ⇒ 26 个离线测试 + 1 条门自检全绿，1 个 UI 绑定按策略跳过，exit 0
- `dryrun-workflow.mjs --profile all` → `DRYRUN_RESULT=PASS（3/3）`，exit 0（§5 里车道没跑完的那一项由我补跑）
- `verify-ops-corpus-stamp.mjs --check` → `PASS`，canon=`0fef00d141e7` / cases=1107 ⇒ 判据台未被这一刀碰过

**provenance 不因为这一刀变绿，这是事实不是遗漏**：复量仍 `CONSISTENT=4154 / PRE_STAMP=4886 / STALE=0`，
`PROVENANCE_RESULT=FAIL`。逐行 sha 只**止住后续新增**的假归属；那 4886 张的错戳早已写死在历史产物里，
而 decisions 第 25 项实测过两种重打都换不来绿（一种把 324 张推成 stale，一种给 144 张无戳帧造出归属）。

### §7.1 我第一版复量脚本比错了对象（记下来，免得下次拿它当结论）
我最初量"这一刀放行了多少判据"时，比的是**新旧两版的 TAP_RE 本身**，得到 `新增认出=0`。
这句是废话：这一刀**刻意不动 TAP_RE 主表**（`/i` 会把 `[a-z]`/`[A-Z]` 一起折叠，见 §注释 :172），
加的是 `TAP_CAMEL_RE`，派发谓词是 `wantsInteraction = TAP_RE.test || TAP_CAMEL_RE.test`。
按真正的谓词重量（两枚正则都从 git 原文抠出，不手抄）：

```
PRE  有 TAP_RE=true  有 TAP_CAMEL_RE=no（修复前确实没有这一支）
POST 两版 TAP_RE 字面量相同 ⇒ 主表未被放宽
TAP_RE_DELTA 判据=1107 旧判要交互=705 新判要交互=719 新增认出=14 新丢=0
```

新增认出 14 条含 DND08 / TP04 / TK05 / SCU06 / SCU10 / SCH10 / PFI09 / PFI17 / PFI18 / PFI34 / PFI35 等。
**这 14 条要读成代价而不是成绩**：它们过去"没人发交互却记 EXECUTED"，下一轮真跑会第一次真的去点，
可能带出一批新失败 —— 那是被静默吞掉的账第一次露头，不是回归。
census 现值同步：`TAPCENSUS cases=1107 含交互动词=719 点名了=606 没点名=23 已盖章不可自动化=90（守恒：yes）`。

### §7.2 车道自报的一处操作失误（它自己记了，我复核成立）
它取过一次 UI 租约并在 4 秒内自行释放，现况空闲。我复量 `heldLeases()` 为 `[]`，与它的记载一致。
