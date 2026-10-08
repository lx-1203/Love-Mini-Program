# 自检定位车道报告（SELFTEST-LOCATE）

- 车道：收口车道-自检定位
- 来源：v3.4 终报 SELFTEST-1OF51 选项 (a)（rootorg-closure-2026-10-08/closure-report.md §4.7）
- closureDir：reports/audit/repo-closure-2026-10-09
- 授权夹具区：.zcode/tmp（本车道唯一可写 .zcode/tmp）
- 日期：2026-10-09
- 结论速览：**失败者已定位 = test-guest-landing.mjs 预检夹具派生步；定性 = 裁定内真红 + 环境缺件（同源重跑要设备），不修**。聚合器读数维持 1/51（50 绿 + 1 红 + 1 UI 绑定跳过 + 3 门自检绿），与上轮一致，无新红。

## 任务

1. 用 Node22 跑 `node scripts/qa/run-qa-selftests.mjs`，定位上轮 1/51 失败者身份。
2. 真缺陷（测试/门的 bug）→ 最小修复 → 复跑聚合器到 51/51。
3. 裁定内期望或环境缺件 → 不修，把失败原文与定性写进本报告。
4. 任何代码修复给出 commitPlan；临时产物只落 .zcode/tmp 或本 closureDir。

## 进度

- [x] 骨架落盘
- [x] 跑聚合器，定位失败者
- [x] 定性：裁定内期望 + 环境缺件（非测试/门的 bug）
- [x] 不修（按车道纪律：裁定内/环境缺件不修只定性）
- [x] 结论与 commitPlan（空——无代码修复）

## 一、失败者身份（本轮实测定位）

命令（Node22 前置）：

```
export PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH"   # node v22.17.0 实测
node scripts/qa/run-qa-selftests.mjs
```

输出要点（全文落盘 `.zcode/tmp/selftest-locate-run1.txt`）：

```
SELFTEST_DIR=qa/test-*  发现=49  node=…node.exe
SELFTEST_RAN=48 SKIPPED=1 FAILED=1 NO_SUMMARY_LINE=0 覆盖文件=49/49
GATE_SELFTESTS_RAN=3 GATE_SELFTESTS_FAILED=0
SELFTEST_RESULT=FAIL（1/51 个离线测试与门自检未过）
FAIL  test-guest-landing.mjs  exit=1  断言失败数=1  GL_TEST=FAIL  7s
```

即：**上轮 1/51 的失败者 = `scripts/qa/test-guest-landing.mjs`**（1 个断言失败；48 个 test-* 里其余 47 个绿、test-stop-flag.cjs 按 UI 策略跳过、3 条门自检全绿）。与上轮落盘日志 `.zcode/tmp/final-verify/run-qa-selftests.log` 里的 FAIL 行（同一文件）互证。

单跑该测试拿全量（`.zcode/tmp/selftest-locate-guest-landing-full.txt`）：

```
SUMMARY: checks=45 assertion failures = 1
GL_TEST=FAIL
FAIL 派生第二条游客腿的 triage 没成功 :: exit=2 TRIAGE_INPUTS results=…/exec-guest-real-guard-r10/exec-results.json …
```

唯一失败断言 = 文件顶部**预检步**（test-guest-landing.mjs:29-36）：它调 `scripts/qa/triage-exec-failures.mjs` 从守卫语料 `reports/audit/round-7/exec-guest-real-guard-r10/exec-results.json` 派生第二条游客腿夹具，该子步 exit=2 ⇒ 预检红。其余 44 条断言全部 ok。

## 二、根因链（逐环实证）

1. **预检调用的 triage 工具自身判红**（亲手复跑同命令，exit=2）：
   ```
   TRIAGE_RESULT=FAIL problems=1
   ✗ 复测腿与债不同源（1 组）：
   subpackages/setup/recommend-pref/index → pages/login/index：复测腿账本声称覆盖 11 行，本轮该组实测 4 行且成员不同 ⇒ 这条腿量的不是这笔债
   ```
2. **判据本体**：`scripts/qa/triage-exec-failures.mjs:1141-1143`（coverMismatch ⇒ markProblem ⇒ exit 2）；比对逻辑在 :855-877，切片豁免在 :852-853（`corpusIsPartialSlice` 只认 runner 含 `real-cases-only` 或 failureReason 前缀「真实刀只跑 requiresReal 用例」）。
3. **成员差异实测**（node -e 读两份账）：r10 语料该页 11 行中只有 4 行落 FAILED-landing-guard（RP01/02/06/10），其余 7 行 SKIPPED（5 行「本切片没带 --tap」、RP09/RP11「判据台盖章不可自动化」）；而 `guest-landing-booked.json` 该组按 2026-09-30 裁定 (a) 的「整页未声明 identities ⇒ 全部行计证人」路线记满 11 行（`memberSource.fromOpsEntireGuest=11`，booked caseIds=RP01…RP11）。集合不同 ⇒ 判红。runner=「scripts/qa/r-exec-cli.mjs（real 切片）」不含 `real-cases-only` 字样 ⇒ 切片豁免不生效。
4. **这不是门误报**：账本 11 行与语料 4 行确实不同源——语料 09-29 13:43 入库（mtime 与 git 22c59553 09-29 13:56 一致），账本 10-06 19:07 被 measure 腿按 ops 派生名册重写。判据 09-27（34b6fb3d）就存在，GL 最后一次绿是 09-29 16:40（`.zcode/tmp/_agg.txt`），恰在裁定 (a) 落进账本之前。

## 三、定性：裁定内真红 + 环境缺件 ⇒ 按车道纪律不修

**这条红在 2026-10-01 已被具名定性为「真红、按原样留着」，且修复路径已被裁定为「同源重跑、要设备」**：

- `reports/audit/round-7/followups-v33.md:618-648`（§19(c)，2026-10-01 04:3x）原文要点：「新增的那条红是真的，我按原样留着：`复测腿与债不同源`……机制是 measure 那趟顺带重写了 `guest-landing-booked.json`……而 r10 那份 exec 语料是改名册之前跑的 ⇒ 账本声称的覆盖面与语料实测不再是同一批。⇒ 这不是可以"改判据"糊过去的东西，是欠一次同源重跑。修法（下一发，要设备）：`node22 scripts/qa/r-exec-cli.mjs`……对当前名册重跑该组，使语料与 booked 同源……**我没有**动 triage 的判据、也没有把 `--only` 的结果当成"已闭环"来报。」
- 修复提交 `593f4d2d`（10-01 05:22）提交说明第 3) 条同口径复述，并确认当时唯一测试 bug（预检失败分支的 TDZ，§19(a)）**已修**——本轮 45 checks 正常打满 SUMMARY，即是该修复生效的证据。

按本轮车道纪律逐项对号：

- **不是测试的 bug**：预检如实上报子步失败，45 条断言无一误判；历史 TDZ 已修。
- **不是门的 bug**：triage 判据报的是真实的账本/语料同源性断裂，判据本体、切片豁免边界都是既有裁定形状；§19(c) 明文禁止改判据糊过去。
- **是环境缺件**：修复 = 按当前名册重跑守卫腿（要 UI 租约 + DevTools + 模拟器窗口的设备腿），本车道为离线车道、无设备授权。且实测**在盘全部游客语料均早于 09-30 名册改版**（exec-guest-real-guard-r10 09-29 13:43 为最新，其余 09-27/09-28）——离线拿任何在盘语料重派夹具都会触发同一条同源检查，无离线绕行。
- 故：**不修**。失败原文（§二.1）与定性（本节）照录如上。

## 四、本轮动作清单（全部落在授权区）

- `.zcode/tmp/selftest-locate-run1.txt` —— 聚合器全量输出（定位证据）
- `.zcode/tmp/selftest-locate-guest-landing-full.txt` —— 单跑 test-guest-landing.mjs 全量输出
- `.zcode/tmp/selftest-locate-triage2.json.md/.json` —— 亲手复跑 triage 命令的产物（exit=2，报告照落盘）
- `.zcode/tmp/guest-landing-selftest/*` —— 被测测试自己写的夹具（既有 TMP 机制）
- `reports/audit/repo-closure-2026-10-09/selftest-locate.md` —— 本报告
- 仓库根零散件（`git status` 无本车道新增 untracked；根目录无散件）

## 五、commitPlan

无代码修复 ⇒ **commitPlan 为空**。本报告若需入库，由编排层按惯例决定（evidence(qa) 类）。

## 六、遗留与移交

- 51/51 的达成条件不在本车道：按 §19(c) 裁定完成守卫腿同源重跑（要设备 + 授权）之后，重派夹具、GL 转绿、聚合器自然 51/51。建议挂账名沿用「SELFTEST-1OF51 → 同源重跑守卫腿（设备腿）」。
- 聚合器读数在本轮收口窗口内为：50 绿（47 test-* + 3 门自检）+ 1 红（test-guest-landing.mjs，本报告定性）+ 1 UI 跳过（test-stop-flag.cjs，策略内）。
