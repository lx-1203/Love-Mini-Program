# QA 自测基线（v3.3 续作轮，2026-09-29 03:20）

Node22 实跑 `scripts/qa/run-qa-selftests.mjs` 的原文读数（完整日志在采集机 `.zcode/tmp/selftests-mainline.log`，`*.log` 被 `.gitignore` 挡住，故此处只留结论与逐字片段）：

```
SELFTEST_DIR=qa/test-*  发现=20  node=D:\codex-tools\node-v22.17.0-win-x64\node.exe
FAIL  test-guest-landing.mjs  exit=1  断言失败数=4  GL_TEST=FAIL  2s
      | FAIL 真数据覆盖 26 组 / 239 行 :: GUEST_LAND_SOURCES=D:\6\恋爱小程序\.zcode\tmp\triage-r7-guest.json（组=26，行次=239） ⇒ 并集组数=26 并集行数=239
      | FAIL 出例数 = 组数 :: 27
      | FAIL 失效裁定 ⇒ 红 :: exit=0
      | FAIL 空集 ⇒ 红 :: exit=0
      | ok   注册入口不在 = MEASURED-FAIL（产品缺口，不许改判据）
SELFTEST_RAN=19 SKIPPED=1 FAILED=1 NO_SUMMARY_LINE=0 覆盖文件=20/20
SELFTEST_RESULT=FAIL（1/19 个离线测试未过）
SKIP  test-stop-flag.cjs  原因=需要 UI 租约（会连 DevTools/占锁），默认不跑；要跑设 QA_SELFTEST_ALLOW_UI=1
```

## 本轮新增的三条都在这 19 里跑过并绿
- `test-change-verb-spans.cjs` `CVC_TEST=PASS`（分句建模补变更动词）
- `test-fourgrid-domextract.mjs`（observe-only dom 结论计入四格取数）
- `test-triage-dead-selector.mjs` `TDS_TEST=PASS`（分诊认得"选择器已改名"那一型）

## 唯一那条红的归因（不顺手记成本轮成果）
1. 它**早于本轮全部提交**：另一条车道在 02:43 就实测登记"改前就红"，本轮第一条提交在 03:06 之后；`test-guest-landing.mjs` 与它 spawn 的 `verify-guest-landing.mjs` 都不在本轮改动清单里。
2. `26 组 / 239 行` 是本项目在册事实（游客落点实测），而期望值钉在 `27 组` —— 属数据漂移，不是产品回归。
3. 另外两条是**负例断言**（"失效裁定 ⇒ 红""空集 ⇒ 红"却拿到 exit=0），要单独查是不是负例本身没有失败能力；已交面板措辞车道处理，本基线不动它。
4. 结论：本轮没有把任何绿改成红，也没有靠放宽断言把这条红抹掉。

## 顺带纠正我的一次误读
后台任务通知报的是 `exit code 0`，那是命令末尾 `tail` 的退出码，不是汇总器的。汇总器 `run-qa-selftests.mjs:66` 是 `process.exit(failed ? 1 : 0)`，且 `:30`（扫描集为空）、`:63`（有测试既没跑也没记跳过）、`:64`（全被跳过＝接线是空的）都 fail-closed。所以"runner 打 ✗ 却 exit 0"这个在册缺陷形态在这条门上**不成立**——它是好的。
