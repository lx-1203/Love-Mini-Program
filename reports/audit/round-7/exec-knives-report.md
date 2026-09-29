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
