#!/usr/bin/env bash
# v3.3 Stage 5 收口终验（提交后跑一次，读数全部留盘）。
# 为什么单独成脚本：本轮实测两次"读数被跑法影响"——
#   1) 裸 node 是 v16，会把 import.meta.dirname 的门崩成假红；
#   2) 边跑边提交会推 HEAD，sha 敏感门的绿只是提交前那一刻的快照。
# 所以这里的门一律 Node22、一律带 --dry（不许覆写别人的判决件），
# 并把 sha 敏感门在提交前后各量一次的口径写死。
set -u
cd /d/6/恋爱小程序 || exit 1
N22="/d/codex-tools/node-v22.17.0-win-x64/node.exe"
OUT=.zcode/tmp/final-verify
mkdir -p "$OUT"
HEAD_BEFORE=$(git rev-parse --short HEAD)
echo "HEAD=$HEAD_BEFORE  node=$("$N22" -v)"

g() { # g <name> <timeoutMs> <args...>
  local n="$1"; shift; local t="$1"; shift
  timeout "$t" "$N22" "$@" > "$OUT/$n.log" 2>&1
  local rc=$?
  echo "$rc" > "$OUT/$n.exit"
  printf '%-28s exit=%-3s %s\n' "$n" "$rc" "$(grep -oE '[A-Z_]+_RESULT=[^|]*' "$OUT/$n.log" | tail -1 | cut -c1-110)"
}

echo "--- 全清单门禁（终验；条数以 GATE_SUITE 为准，不在本脚本里写死数字）---"
g verify-ledger           120 scripts/qa/verify-ledger.mjs reports/audit/round-6
g verify-state-truth      180 scripts/qa/verify-state-truth.mjs reports/audit/round-7
g verify-queue-reconcile  120 scripts/verify-queue-reconcile.mjs reports/audit/round-7
g verify-real-coverage    180 scripts/qa/verify-real-coverage.mjs
g verify-source-shape     180 scripts/qa/verify-source-shape.mjs --dry
g verify-evidence-corpus  600 scripts/qa/verify-evidence-corpus.mjs
g verify-provenance-all   600 scripts/qa/verify-provenance-all.mjs
g verify-band-freshness   420 scripts/qa/verify-band-freshness.mjs
g verify-backend-fresh    120 scripts/qa/verify-backend-fresh.mjs
g verify-evidence-holes   300 scripts/qa/verify-evidence-holes.mjs --mode judge

echo "--- 反 vacuous-green：门禁必须能变红 ---"
g prove-gates-can-fail    300 scripts/qa/prove-gates-can-fail.mjs

# GATE_SUITE 现有 12 条（wiring 车道 2026-09-29 接进两把孤儿门），本清单必须跟着长，
# 否则终验会少量两条门却仍自称全清单 —— 少测的门不在任何总数里。
# （此处曾写成 // —— bash 不认 JS 注释，会把 // 当命令执行并喷两条 No such file，
#   在 set -u 下不致命，但那两行等于没被任何解释器读过。）
g verify-dry-no-lease     180 scripts/qa/verify-dry-no-lease.mjs
g verify-case-automatable 180 scripts/qa/verify-case-automatable.mjs --json .zcode/tmp/case-automatable/final.json

echo "--- QA 自测汇总器（19+ 条离线）---"
g run-qa-selftests        600 scripts/qa/run-qa-selftests.mjs

echo "--- 工作流干跑预检（3 画像）---"
g dryrun-workflow         300 scripts/qa/dryrun-workflow.mjs --profile all

echo "--- 全量面板（不跳实时门，写进 sidecar 不覆写判决件）---"
# 注意：面板内部会自己 spawn 那十条实时门，并且会重写
# reports/audit/round-7/{evidence-holes-verdict,guest-landing-booked,cellplan-source-shape}.json。
# 只在所有车道收工之后跑这一次；跑完必须再复量 verify-ledger / verify-state-truth。
g emit-round-report      1800 scripts/qa/emit-round-report.mjs --round-dir reports/audit/round-7 --sidecar-dir "$OUT/panel" --report "$OUT/panel/round-7-report.md" --metrics "$OUT/panel/round-7-metrics.json"
g verify-ledger-after-panel 120 scripts/qa/verify-ledger.mjs reports/audit/round-6
g verify-state-truth-after-panel 180 scripts/qa/verify-state-truth.mjs reports/audit/round-7

echo "=== 汇总 ==="
FAIL=0
REDS=""
for f in "$OUT"/*.exit; do
  n=$(basename "$f" .exit); e=$(cat "$f")
  [ "$e" = "0" ] || { echo "RED: $n exit=$e"; FAIL=$((FAIL+1)); REDS="$REDS\"$n\","; }
done
HEAD_AFTER=$(git rev-parse --short HEAD)
# 写成 JSON 给 scripts/qa/gen-round8-report.mjs 的 §7 直接读，避免报告与读数脱节
printf '{"headBefore":"%s","headAfter":"%s","gates":{%s},"reds":[%s]}\n' \
  "$HEAD_BEFORE" "$HEAD_AFTER" \
  "$(for f in "$OUT"/*.exit; do n=$(basename "$f" .exit); printf '"%s":%s,' "$n" "$(cat "$f")"; done | sed 's/,$//')" \
  "$(echo "$REDS" | sed 's/,$//')" > "$OUT/summary.json"
echo "GREEN/RED 计数：红=$FAIL  HEAD 前=$HEAD_BEFORE 后=$HEAD_AFTER（相同则 sha 敏感门读数未受提交漂移影响）"
echo "汇总已写 $OUT/summary.json；下一步跑： node22 scripts/qa/gen-round8-report.mjs"
echo "FINAL_VERIFY_DONE reds=$FAIL"
