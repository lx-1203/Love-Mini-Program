# r7 终局复量原始读数（逐行留档）

载具：`scripts/qa/run-final-verify-v33.sh`；机器汇总：同目录 `final-verify-summary-v33.json`。

本文是**可提交的那份副本** —— `.gitignore:37` 写着 `*.log`，所以原始 `final-verify-r7.log`
只能是本地未跟踪文件；逐行读数若只放 `.log` 就等于没归档（本仓 `reports/audit/round-7/` 里
`.log` 的跟踪数实测为 0，约定就是"日志不入库、入库的写成 md/json"）。
下列内容为命令输出逐字，未做任何手工改数。

```
HEAD=f1e05ebd  node=v22.17.0
SWEEP_STORE_MODE=reachable（D:/6/love-mini-evidence 在盘 ⇒ 本轮证据库这一轴参与判定）
--- 全清单门禁（终验；条数以 GATE_SUITE 为准，不在本脚本里写死数字）---
verify-ledger                exit=0   LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法
verify-state-truth           exit=0   STATE_RESULT=PASS（全局极差比的是 2 列同范围源；检查点按 subset-window 已做逐套包含核
verify-queue-reconcile       exit=0   QUEUE_RESULT=PASS
verify-real-coverage         exit=1   REALCOV_RESULT=FAIL（真实模式覆盖守恒：跳过不算量到，单身份不算双身份；免检只免"
verify-source-shape          exit=0   SRC_SHAPE_RESULT=OK
verify-evidence-corpus       exit=0   CORPUS_RESULT=PASS（无不可背书证据；legacy 无戳清单=1 帧=144 因早于打戳约定而不判红�
verify-provenance-all        exit=1   PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论）
verify-band-freshness        exit=0   FRESH_RESULT=PASS bands=3 markers=4 —— 每档产物都不晚于任何未提交改动，且符号级深检�
verify-backend-fresh         exit=0   BACKEND_FRESH_RESULT=PASS（运行中的 8080 就是 HEAD 那份后端，③ 的重启不必再做一次）
verify-evidence-holes        exit=0   EVIDENCE_HOLES_RESULT=PASS 每个洞都有可重跑判据，无一靠重判结案
--- 反 vacuous-green：门禁必须能变红 ---
prove-gates-can-fail         exit=0   PROVE_GATES_CAN_FAIL_RESULT=PASS
verify-dry-no-lease          exit=0   DRYLEASE_RESULT=OK —— 没有 dry 抢设备的路径
verify-case-automatable      exit=0   CA_RESULT=ADVISORY（静态命中 102/1107，占 9.2%；假阳性率未量，默认不判红——要判红加
--- QA 自测汇总器（19+ 条离线）---
run-qa-selftests             exit=0   SELFTEST_RESULT=PASS（30 个离线测试 + 1 条门自检全绿，1 个 UI 绑定测试按策略跳过）
--- 工作流干跑预检（3 画像）---
dryrun-workflow              exit=0   DRYRUN_RESULT=PASS（3/3 画像跑到底并产出总报告）
--- 全量面板（不跳实时门，写进 sidecar 不覆写判决件）---
emit-round-report            exit=0   EMIT_RESULT=OK 全部源可读、全部守恒断言通过
verify-ledger-after-panel    exit=0   LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法
verify-state-truth-after-panel exit=0   STATE_RESULT=PASS（全局极差比的是 2 列同范围源；检查点按 subset-window 已做逐套包含核
=== 汇总 ===
RED: verify-provenance-all exit=1
RED: verify-real-coverage exit=1
GREEN/RED 计数：红=2  HEAD 前=f1e05ebd 后=f1e05ebd（相同则 sha 敏感门读数未受提交漂移影响）
汇总已写 .zcode/tmp/final-verify/summary.json；下一步跑： node22 scripts/qa/gen-round8-report.mjs
FINAL_VERIFY_DONE reds=2
```

> 两处显示异常要说明，别当成转录损坏：正文里有 2 行末尾出现 U+FFFD 替换符，那是**门禁自己
> 按字节截行**留下的半个 UTF-8 码点（受影响的两行是 `verify-evidence-corpus` 与
> `verify-band-freshness`，它们的中文被截在 3 字节序列中间）。判红集合与计数不依赖显示行：
> `REALCOV_* / PROV_FRAMES_* / CORPUS_*` 这些未截断的机器行在
> `.zcode/tmp/final-verify/<gate>.log` 逐条可查，`followups-v33.md` §10 的数字是从那些
> 原始行量的，不是从本文件的显示行读的。
