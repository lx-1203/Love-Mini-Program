#!/usr/bin/env bash
# v3.3 Stage 5 收口终验（提交后跑一次，读数全部留盘）。
# 为什么单独成脚本：本轮实测两次"读数被跑法影响"——
#   1) 裸 node 是 v16，会把 import.meta.dirname 的门崩成假红；
#   2) 边跑边提交会推 HEAD，sha 敏感门的绿只是提交前那一刻的快照。
# 所以这里的门一律 Node22、一律带 --dry（不许覆写别人的判决件），
# 并把 sha 敏感门在提交前后各量一次的口径写死。
set -u
# 仓库根从本脚本位置推导（scripts/qa/ 的上两级），不写盘符死路径。
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || exit 1
# node 解析序：NODE22_EXE 显式 > PATH 上的 node（本项目纪律是 PATH 前置 Node22）。
# 老 node 会让 import.meta.dirname 的门假红（本文件头注释第 1 条）⇒ 版本闸大声失败，不回落盘符死路径。
N22="${NODE22_EXE:-$(command -v node 2>/dev/null || true)}"
N22_MAJOR="$("$N22" -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
case "$N22_MAJOR" in ''|*[!0-9]*) N22_MAJOR=0 ;; esac
[ "$N22_MAJOR" -ge 20 ] || { echo "FINAL_VERIFY=FAIL reason=解析到的 node 太老（$("$N22" -v 2>/dev/null || echo 未知)），设 NODE22_EXE 指一个 >=20 的 node 再跑"; exit 2; }
OUT=.zcode/tmp/final-verify
mkdir -p "$OUT"
HEAD_BEFORE=$(git rev-parse --short HEAD)
echo "HEAD=$HEAD_BEFORE  node=$("$N22" -v)"

# 证据库这一轴必须说清"本轮是在哪种状态下量的"，否则同一道门在两台机器上给出不同结论却没人知道为什么。
# 规则：库目录存在 ⇒ 导出 QA_EVIDENCE_STORE，让 verify-evidence-corpus 真的走 reachable 那一支；
#       不存在 ⇒ 不设变量（门会报 CORPUS_STORE=unconfigured），并在日志里把这一事实印出来。
# 这里**故意**不做"库没了就假装没事"以外的任何事：设置了变量却够不着，是要判红的（那是用户点名的条件）。
# 证据库缺省位置 = 仓库根的仓外兄弟目录（与 evidence-store.mjs:36 的缺省是同一条推导），不写盘符死路径。
# node 消费方要 Windows 形态路径 ⇒ 用 cygpath -m 转；推不出来就如实降级，不硬塞。
STORE_DIR_DEFAULT="$(dirname "$REPO_ROOT")/love-mini-evidence"
if [ -n "${QA_EVIDENCE_STORE:-}" ]; then
  echo "SWEEP_STORE_MODE=configured（沿用外部给的 QA_EVIDENCE_STORE=$QA_EVIDENCE_STORE）"
elif [ -d "$STORE_DIR_DEFAULT" ]; then
  QA_EVIDENCE_STORE="$(cygpath -m "$STORE_DIR_DEFAULT" 2>/dev/null || true)"
  if [ -n "${QA_EVIDENCE_STORE:-}" ]; then
    export QA_EVIDENCE_STORE
    echo "SWEEP_STORE_MODE=reachable（$QA_EVIDENCE_STORE 在盘 ⇒ 本轮证据库这一轴参与判定）"
  else
    echo "SWEEP_STORE_MODE=unresolved（默认库在盘，但此 bash 无 cygpath 推不出 Windows 形态路径 ⇒ 不设变量，门的自身缺省与门输出说了算）"
  fi
else
  echo "SWEEP_STORE_MODE=absent（仓外库不存在 ⇒ 本轴报 unconfigured，不参与判定；这不是豁免，是如实标注）"
fi

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

# GATE_SUITE 的条数**不在本注释写死**（此处曾写"现有 12 条"，而 r10 之后两载具各加了三把门 ⇒ 注释自己就腐烂了，
# 与 DSL :635 那句"条数以 GATE_SUITE 为准、不写死中文数字"是同一口径）。本清单必须跟着 DSL 长，
# 否则终验会少量几条门却仍自称全清单 —— 少测的门不在任何总数里。
# 否则终验会少量两条门却仍自称全清单 —— 少测的门不在任何总数里。
# （此处曾写成 // —— bash 不认 JS 注释，会把 // 当命令执行并喷两条 No such file，
#   在 set -u 下不致命，但那两行等于没被任何解释器读过。）
g verify-dry-no-lease     180 scripts/qa/verify-dry-no-lease.mjs
# 接线（L18 工作流改进门车道 2026-09-30）：零消费者导出件检测。
# 这道门补的是本流程从来没有过的一格——"东西建好了没人跑/没人消费"此前不会让任何东西变红。
# 四条同族实测事故与判域/极性论证见 reports/audit/round-7/wiring-gate-r18.md。
# 不带 --advisory：默认极性就是判红，接进来的目的正是让它能红（带旗等于把刚装上的刹车拆掉）。
# 不带 --select：那是负例专用的收窄旋钮，判据逻辑与整跑同一条码路，终验必须走整跑那一支。
# 超时 180 秒＝与同簇静态门 verify-dry-no-lease 齐平；实测本门 3 发 wall=3157/2888/2595 ms
#（Node22、默认参数、写 .zcode/tmp 侧车），最慢一发对 180 秒有 ~57 倍余量，方向上不会被掐。
g verify-carrier-wiring   180 scripts/qa/verify-carrier-wiring.mjs
# r10 接线（L20）：车道报告的「（待填」骨架此前没有任何门看过——上一程三条车道死于轮次上限时
# 盘上留的就是全「待填」空骨架而一切照绿。收件清单具名、豁免须带理由，缺清单该门自己 exit 2。
g verify-lane-report-complete 60 scripts/qa/verify-lane-report-complete.mjs --intake reports/audit/round-7/lane-report-intake-round-7.json --exemptions reports/audit/round-7/lane-report-exemptions-round-7.json
# r10 接线（L19）：10 条真实档覆盖欠账的分流此前只有 50KB 散文（uncovered10-disposition-r14.md），
# 没有任何门在核"条条有去向"。本门只审有没有账，结构上销不掉红（五词表里没有 DONE/CLOSED/EXEMPT）。
g verify-real-coverage-disposition 180 scripts/qa/verify-real-coverage-disposition.mjs
# 登记补漏（本轮）：这道门此前两个载具都不点名，"已裁的裁决有没有进代码"从来没有一发全清单作证。
# 超时取 600，与 DSL 侧 timeoutMs 600000 同值——两侧不一致时门被杀掉会读成红而不是跳过。
g verify-rulings-landed        600 scripts/qa/verify-rulings-landed.mjs
# 本轮登记 12 条孤儿门（此前两个载具都不点名，从未进终验；只读、不取租约、不写库）。
# 超时与 DSL 侧逐条同值。verify-package-size / verify-logged-in-landing / verify-evidence-integrity
# 三条要输入参数，裸跑按设计退 2 或红，留在孤儿基线里，不硬塞进终验造假红。
g verify-backend-restarted     120 scripts/qa/verify-backend-restarted.mjs
g verify-case-selectors-exist  120 scripts/qa/verify-case-selectors-exist.mjs
g verify-criteria-frame-debt   120 scripts/qa/verify-criteria-frame-debt.mjs
g verify-disproof-anchors      120 scripts/qa/verify-disproof-anchors.mjs
g verify-fixes-against-artifact 180 scripts/qa/verify-fixes-against-artifact.cjs
g verify-frame-debt-coverage   120 scripts/qa/verify-frame-debt-coverage.mjs
g verify-frame-debt-triage     120 scripts/qa/verify-frame-debt-triage.mjs
g verify-i18n-orphan           120 scripts/qa/verify-i18n-orphan.mjs
g verify-status-vs-disposition 120 scripts/qa/verify-status-vs-disposition.mjs
g verify-tab-bar-single-source 120 scripts/qa/verify-tab-bar-single-source.mjs
# 再登记：取参已单源、带 undefined 即拒写，且这里显式传 --project（不靠缺省，见台账 FAIL-OPEN 行）
g verify-guest-landing         120 scripts/qa/verify-guest-landing.mjs --project apps/client/dist/build/mp-weixin-real
g verify-case-automatable 180 scripts/qa/verify-case-automatable.mjs --results reports/audit/round-6/interact/exec-results.json --json .zcode/tmp/case-automatable/final.json
# r9 接线：判据台语料戳（--check 只读）。此前只有车道"自己记得跑"，而本轮有车道往 ops 写过行 ⇒ 必须有人必然经过。
g verify-ops-stamp          180 scripts/qa/verify-ops-corpus-stamp.mjs --check
# 裁定 N7：lint 进门禁普查，只计 ERRORS（--quiet 语义）——warning 报数但不染门色。
# 实测 2026-10-16：errors=2 / warnings=14103 / 650 文件（旧台账里的 10358 是过期读数，已按本门实测作废）。
# 300 秒的依据：同一 scope 冷跑 85 s、热跑 24-26 s；比实测需求小的上限会读成假红（本仓口径）。
# 预算 2 的具名欠账与"只能往下改"的纪律写在 scripts/qa/lint-gate.cjs 的头注释里。
g lint-gate                 300 scripts/qa/lint-gate.cjs
# E9 补判点（本轮三族仪表伪红同源：固定 sleep 后单发读下判决）：把措辞纪律变成能红的棘轮门。
# 基线 = 实测 single_read 7 条（点名逐条判读写在脚本头注释），新增一条单发判决即 exit 1；
# 载具缺失/零站点 exit 2（量不到≠达标）。只读两个脚本、不取租约、不写 DB ⇒ 排在并发段。
# 超时 60 秒＝与 DSL timeoutMs:60000 齐平；实测 判定跑 148/138/142 ms、--selftest 375/389/383 ms。
g settle-discipline          60 scripts/qa/verify-settle-discipline.mjs

echo "--- QA 自测汇总器（19+ 条离线）---"
# r10 上调 600→900（只准往大调，方向与 DSL 齐平：DSL 给 900000ms 并写明"留的是负例批量起进程的余量"）。
# 实测依据：编排方 13:15 用 600 秒的临时载具跑出 exit=124（被掐死，不是被测物红），而收件数已从 36 涨到 43。
g run-qa-selftests        900 scripts/qa/run-qa-selftests.mjs

echo "--- 工作流干跑预检（3 画像）---"
g dryrun-workflow         300 scripts/qa/dryrun-workflow.mjs --profile all --file .zcode/workflows/miniprogram-ui-audit-v38.dwf.ts
g tcheck-workflow         300 scripts/qa/tcheck-workflow.cjs --file .zcode/workflows/miniprogram-ui-audit-v38.dwf.ts
g verify-degraded-conclusion 180 scripts/qa/verify-degraded-conclusion.mjs
g verify-gate-list-sync  120 scripts/qa/verify-gate-list-sync.cjs

echo "--- 全量面板（本脚本这一发不跳实时门；DSL 侧同一发带 --dry，差异是有意的，见下）---"
# 为什么两侧不一样：本脚本是"所有车道收工之后"由人跑一次的终局收口，可以取 UI 租约跑实时门；
# DSL 的面板腿在 Promise.all 的门清单里，取租约会与巡检车道抢同一个模拟器 ⇒ 带 --dry。
# 两侧共享的真判据不是"有没有 --dry"，而是**面板不许覆写下游要的权威件**——
# 这一点由 .zcode/tmp 的清单同步检查按属性核对（它判的是 emit-round-report 传给子门的
# --dry/--out 落点，不是本行有没有 --dry）。
# 旧注释在这里写过"面板会重写 round-7/{evidence-holes-verdict,guest-landing-booked,
# cellplan-source-shape}.json"——那句现在已经不成立（三处落点都改了：source-shape 带 --dry、
# guest-landing 与 evidence-holes 的 --out 指到 --sidecar-dir），留着只会让下一程去修一个不存在的问题。
# 跑完仍必须复量 verify-ledger / verify-state-truth（下面两行就是干这个的）。
g emit-round-report      1800 scripts/qa/emit-round-report.mjs --round-dir reports/audit/round-7 --sidecar-dir "$OUT/panel" --report "$OUT/panel/round-7-report.md" --metrics "$OUT/panel/round-7-metrics.json"
g verify-ledger-after-panel 120 scripts/qa/verify-ledger.mjs reports/audit/round-6
g verify-state-truth-after-panel 180 scripts/qa/verify-state-truth.mjs reports/audit/round-7

echo "--- 后台/设备侧的实测门（串行段；这一批不进上面的并发口径）---"
# 为什么这几把门排在串行段而不是并发清单（与 DSL 把它们放 PANEL_SUITE 是同一条理由，两边必须同判据）：
#   ① 四把后台门读 SUPER_PASSWORD / ADMIN_LOGIN_* 这类口令（2026-10-14 轮换后脚本内已不内置默认值，
#      scripts/verify-admin-auditor.mjs:25-26 实测：缺变量时门自己走 NOT-EVIDENCED 退 2，不记产品 FAIL）；
#   ② verify-admin-writes 会写库（默认自清理，--keep-post 才留）；
#   ③ verify-admin-post-detail 驱动 Chrome（puppeteer 单实例），且它的缺省 ADMIN_BASE_URL 是 5177（该脚本 :20），
#      本轮 admin dev server 实测在 5173 ⇒ 必须显式导出 ADMIN_BASE_URL，否则 transport 命中、整条腿 NOT-EVIDENCED；
#   ④ verify-device-leg 取全局唯一的 UI 租约（scripts/verify-device-leg.mjs:313 guardUiLease）并写一条真实 post
#      —— 与上面 emit-round-report 那段同一把"取租约的步骤不入并发清单"的口径（见本文件 :103-107）。
# 口令一律从环境读，本脚本不写、不嵌、不回显；没设就让它退 2 大声报，绝不为凑绿造假。
# band 键与覆盖率门的尺同源：readApiMode(config/env.js) 的 mode@sha8（artifact-band.mjs:22），
# 本批只读不自造，出处见 DSL 的 BAND_STAMP_RULE。
export QA_UI_RESOURCE="${QA_UI_RESOURCE:-ui-audit-v38-dsl}"
g verify-admin-auditor    420 scripts/verify-admin-auditor.mjs
g verify-admin-scope      420 scripts/verify-admin-scope.mjs
g verify-admin-writes     600 scripts/verify-admin-writes.mjs
g verify-admin-post-detail 600 scripts/verify-admin-post-detail.mjs
g verify-device-leg      1500 scripts/verify-device-leg.mjs --band real

echo "--- 暂存区密钥预检（两个载具的判域不同：这里量的是「刚落地的这一发」）---"
# DSL 侧这一把门夹在 git add 与 git commit 之间（读索引，exit!=0 一律不提交，fail-closed）。
# 本脚本按文件头口径是"提交后跑一次"，那时索引必然等于 HEAD ⇒ 裸跑只会得到"索引为空，合法干净"
# 那种毫无信息量的绿。所以这里显式 --against HEAD~1：判的是**刚才那一发提交带进去的字节**
# （索引 vs 上一枚提交 = HEAD 这一发的全部 payload），与门头注 :10-11 给的用法一致。
# 为什么这一发必须存在而不是只在 DSL 里：本仓漏过的形状是 .env.bak-20261014-rot 同时不被
# .gitignore:24（字面 .env）与 :157（字面 *.bak）拦（见该脚本头注 4-8 行），屏蔽规则拦不住 git add -f，
# 只有读索引/读提交内容的门拦得住；而"全清单"有两个载具，少一边就会在另一边自称全清单时漏跑
# —— 这条判据现由 verify-gate-list-sync 的差集盯着，不许再靠人对眼。
# 口令不回显：本门只印 path:line + 掩码值（该脚本 :36-38 的输出纪律），侧车同样只落掩码。
g verify-staged-secrets   120 scripts/qa/verify-staged-secrets.mjs --against HEAD~1 --json "$OUT/staged-secrets-postcommit.json"

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
# 总报告回填：这一步此前**只是一句 echo**（"下一步跑 …"），等于清单里的一条门在 bash 载具没接线——
# 收口者把本脚本当"全清单"跑完就撒手时，reports 里的 §7 还是上一轮的 summary 读数，且没有门能看见这次漏跑
#（DSL :1048 一直在跑它，两载具就此不一致；现由 verify-gate-list-sync 的差集判据盯着）。
# 位置必须在 summary.json 落盘之后：gen-round8-report 的 §7 读的就是这份文件，早一步就是拿旧读数回填。
# 超时 180 秒 = 与 DSL 的 timeoutMs:180000 齐平；本步只读盘与写报告，不起进程、不取租约。
# 本轮账单生产者（§1/§4 的输入件）：必须排在 g gen-round8-report 之前，且与 DSL 载具同一条次序判据。
# 成因实测：gen-round8-report.mjs 的 §1 读 --gapbill(:68)、§4 读 --openrows(:71)，不给就老实印「未跑」；
# 而 `grep -rn gapbill scripts/` 只命中消费方自己 ⇒ 本轮没有任何生产者，两节永远填不上。盘上只有上一程
# v3.3（2026-09）的 reports/audit/round-7/{gapbill-v33,openrows-blockers-v33}.json，把那份指进来比印
# 「未跑」更坏（拿九月的旧账当本轮现状）。账单里一个数都不手填：三门现跑的 stdout 机器行 + 真值源
# real-coverage-disposition.json + 裁定册的 PENDING_RULINGS 具名名册，落盘后自带出处回收。
# exit=2 = 某个源读不到 ⇒ 它自己不写盘，§1/§4 继续停在「未跑」（.exit 会记下这一发是红的）。
# 超时 420 秒：它现跑覆盖门两次（自己一次 + 去向册门内部再 spawn 一次，单发实测约 60–90 s）。
g emit-round-bill        420 scripts/qa/emit-round-bill.mjs --closure reports/audit/ui-audit-2026-10-16 --tag v38 --ledger reports/audit/ui-audit-2026-10-16/decisions-v38.md --dir reports/audit/round-7 --ops reports/audit/round-6/ops
g gen-round8-report      180 scripts/qa/gen-round8-report.mjs --ledger reports/audit/ui-audit-2026-10-16/decisions-v38.md --out reports/audit/ui-audit-2026-10-16/round-final-report-v38.md --round v3.8 --date 2026-10-16 --prose reports/audit/ui-audit-2026-10-16/closing-prose-v38.md --baseline "$HEAD_BEFORE" --summary "$OUT/summary.json" --gapbill reports/audit/ui-audit-2026-10-16/gapbill-v38.json --openrows reports/audit/ui-audit-2026-10-16/openrows-blockers-v38.json
echo "汇总已写 $OUT/summary.json；总报告回填的读数与落点见 $OUT/gen-round8-report.log"
echo "FINAL_VERIFY_DONE reds=$FAIL（注：红数只统计上面那一轮汇总，总报告回填排在其后，单独看它的 .exit）"
