#!/usr/bin/env bash
# round-7 B 侧执行轮跑完之后要接的那一刀（顺序有依赖，别并行——设备只有一台）。
#
# 只做"取证与出计划"，不落台账：最后一步打印出需要人工核对后自己加的 --apply 命令。
# 这样做的理由是本轮踩过的两个坑：探针不可判的判红会被自动写进台账（§32），
# 而自动落账的脚本没法区分"产品未修"和"我没测到"（§33/§36 各 14 条、3 条）。
#
# 用法：PATH=/d/codex-tools/node-v22.17.0-win-x64:$PATH bash scripts/qa/round7-post-b-slice.sh
set -uo pipefail
cd "$(dirname "$0")/../.."
NODE="${NODE:-node}"
SHA="$(git rev-parse --short HEAD)"

if grep -q "RUNNER_RESULT" /tmp/exec-b.log 2>/dev/null; then
  echo "== B 侧执行轮已结束，继续接刀"
else
  echo "POSTB_RESULT=FAIL reason=B 侧执行轮还在跑（/tmp/exec-b.log 里没有 RUNNER_RESULT）；两把刀不能同时开设备"
  exit 2
fi

echo "== 1) 前置补齐后的重测（带 URL 参数的路由走 mock 档；游客档必须走 real 档），写到 interact-b2 不动 A 侧权威件"
# 游客档不能跑在 mock 包上：probe-guest-band.mjs 实测 cold/warm 两腿都 AUTOLOGIN_ON_OPEN
# （mock 的 bootstrap 无条件注入 mock 会话），跑出来的"落在别的页"是测量错，执行器现在会直接 exit 2。
"$NODE" scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin-real \
  --out reports/audit/round-7/interact-real-guest --identity guest --manifests PAGES-LOGIN-INDEX \
  --label round-7-real-guest
"$NODE" scripts/qa/supersede-mock-guest-rows.mjs \
  --old reports/audit/round-7/interact-b2/exec-results.json \
  --new reports/audit/round-7/interact-real-guest/exec-results.json
"$NODE" scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin \
  --out reports/audit/round-7/interact-b2 \
  --manifests SUBPACKAGES-CAMPUS-CAMPUS-INDEX,SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING,次要18

echo "== 2) 与冻结快照对账：迁移必须逐条有归因，不许把"未测变已测"报成修好"
"$NODE" scripts/qa/verify-exec-delta.mjs \
  reports/audit/round-7/interact-b/exec-results.json \
  .zcode/tmp/round7-exec/exec-results.snapshot-b89dc4a71654.json
"$NODE" scripts/qa/verify-exec-delta.mjs \
  reports/audit/round-7/interact-b2/exec-results.json \
  .zcode/tmp/round7-exec/exec-results.snapshot-b89dc4a71654.json

echo "== 3) 用第二载具（element.text / element.size）+ 三态探针重拍被扣住的那批"
IDS="$("$NODE" -e 'const j=require("./reports/audit/round-7/uidebt-shoot-ws/shoot-results.json");
  const BAD=/PRESENT_UNEXPECTED|ABSENT_UNEXPECTED|PROBE_NO_ANSWER|TEXT_LEAK|TEXT_MISS|BOX_SMALL|BOX_OFF/;
  console.log(j.rows.filter(r=>(r.checks||[]).some(c=>BAD.test(String(c.check)))||!String(r.landing||"").includes(String(r.route||""))).map(r=>r.id).join(","));')"
echo "   重拍清单：$IDS"
"$NODE" scripts/qa/shoot-frameplan.mjs --ws-taps \
  --label "round-7-uidebt-txt-$SHA" \
  --out reports/audit/round-7/uidebt-shoot-txt \
  --only-ids "$IDS"

echo "== 4) 判决 → 可判性闸（含撤销旧判红的 --restore-from）→ 打印待人工核对的落账命令"
"$NODE" scripts/qa/verdict-from-frames.mjs \
  --frames reports/audit/round-7/uidebt-shoot-ws/shoot-results.json,reports/audit/round-7/uidebt-shoot-txt/shoot-results.json
"$NODE" scripts/qa/audit-frame-verdicts.mjs \
  --frames reports/audit/round-7/uidebt-shoot-txt/shoot-results.json \
  --restore-from reports/audit/round-6/issue-matrix.md.pre-cellpatch.bak
"$NODE" scripts/qa/verify-source-shape.mjs

echo "== 5) 功能开关那一档：VIP 34 条在 mock/real 上必被守卫弹回（membershipEnabled 默认 false），要 showcase 独立产物"
# 构建不能与模拟器并发：prepare-static 要整目录换 src/static，与还在读工程的会话抢锁会 Permission denied
"$NODE" apps/client/scripts/build-showcase-isolated.mjs
"$NODE" scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin-showcase \
  --out reports/audit/round-7/interact-showcase --manifests 次要22 --label round-7-showcase

echo "POSTB_RESULT=OK 取证与计划已产出；核对后自己加 --apply："
echo "  \$NODE scripts/qa/patch-ledger-cells.mjs --plan reports/audit/round-7/cellplan-round7-frames-admissible.json --apply"
echo "  \$NODE scripts/qa/patch-ledger-cells.mjs --plan reports/audit/round-7/cellplan-source-shape.json --apply"
echo "  \$NODE scripts/qa/verify-ledger.mjs reports/audit/round-6"
echo "  \$NODE scripts/qa/verify-state-truth.mjs reports/audit/round-7"
echo "  \$NODE scripts/qa/emit-round-report.mjs --round-dir reports/audit/round-7 --report reports/audit/round-7/round7-gatepanel.md --metrics reports/audit/round-7/round7-metrics.json --manifest-detail reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json --sidecar-dir .zcode/tmp/report-emitter-r7"
