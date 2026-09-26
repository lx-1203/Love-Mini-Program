#!/usr/bin/env bash
# round-7 各刀的**可重跑清单**。为什么留这个文件：欠的覆盖率必须写成"一条命令能补上"，
# 而不是报告正文里的一句话。也是防"只有我记得怎么跑"——本轮真实刀之所以差点被判成上不去，
# 就是因为带病的调用姿势没人能一眼看穿（见 round7-NOTES.md §23）。
#
# 跑之前确认三件事（每件都本轮踩过）：
#   1. WS 通道在听：node scripts/qa/ws-channel-up.mjs          （退出码 0 才算在）
#   2. 产物不比 HEAD 旧：比较 apps/client/dist/build/mp-weixin/app.json 的 mtime 与 git log -1 的时间
#   3. 真实刀要把 --project 指到 real 产物，且 8080 在跑（先 node scripts/probe-real-env.mjs）
set -euo pipefail
NODE=${NODE:-D:/codex-tools/node-v22.17.0-win-x64/node.exe}
REPO=${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
cd "$REPO"
: "${NODE:?NODE 未解析——PATH 里的 node 可能是 v16，会把这条链跑坏}"

echo "== 刀 0：身份前置自检（先跑这个再谈『真实模式上不去』）=="
# 分别用 broken / fixed 两种调用形态打同一个工程，比 verify 与登录页落点。
# 判读：fixed=logged-in ⇒ 之前的 not-logged-in 是调用姿势错，不是环境 blocker。
"$NODE" scripts/qa/probe-boot-callsite.mjs --project real --forms fixed

echo "== 刀 1：交互（tap）切片，只重跑上一刀记 SKIPPED(交互动词) 的行 =="
# --redo-taps 把"上一刀没跑"的行退回待跑；已 EXECUTED 的行不动（否则等于拿新帧冲掉旧结论）
# 不可逆动作（注销/解绑/清空/登出）由脚本内 DENY_TAP 白名单禁触并显式记 SKIPPED-DENY
"$NODE" scripts/qa/r-exec-ws.mjs --tap --redo-taps

echo "== 刀 2：真实模式切片（结果与帧都另起目录，不与 mock 混）=="
# 2a. real 产物必须先重建到 HEAD（隔离脚本会自证 sharedOutUntouched=yes）
"$NODE" tmp/run-pnpm22.cjs -C apps/client run build:mp-weixin:real:isolated
# 2b. 后端在跑 + 十环/素材复跑（G8 会写库，写下的行按既有裁定保留并披露）
"$NODE" scripts/probe-real-env.mjs
# 2c. 真实模式执行轮：requiresReal 的 236 条只有这一刀能覆盖。
#     用桥版而不是 WS 版：出帧在桥上是 2.6 s/张，WS 实测 61 s/张且 5 次里 2 次超时。
"$NODE" scripts/qa/r-exec-cli.mjs \
  --project apps/client/dist/build/mp-weixin-real \
  --out reports/audit/round-7/interact-real \
  --label round-7-real-exec \
  --real --real-cases-only

echo "== 刀 3：帧债配方（判据台 NEEDS_UI_FRAME → 可判断言 → 定向取景 → 落账）=="
# 3a. 把帧债按"要哪种帧"拆开（分类必须恰好覆盖全部条目，否则 exit 2）
"$NODE" scripts/qa/export-ui-frame-debts.mjs
# 3b. 按源文件切 lane 简报（同一文件不劈开；配方 lane 与修复 lane 都不能撞文件）
"$NODE" scripts/qa/split-frame-debt-lanes.mjs --lanes 5 --max 20
#   → 之后由 5 条 lane 各写 reports/audit/round-7/frameplan-lane-<X>.json（人工/agent 步，不自动跑）
# 3c. 合并 + 逐条重开文件复核依据（--auto-anchor 会把标错位置的锚点搬回真实处并留痕）
"$NODE" scripts/qa/merge-frameplans.mjs --auto-anchor
# 3d. 按配方取景（只有过复核的 SHOOT 条目会拍；拍不到帧就 exit 2，不写"已完成"）
#     --ws-taps：tap/input/longpress/swipe 走 9420 那条腿，同时兼作落点确认的第二通道
#     （CLI 的 routeStack 会把子进程失败原文当值返回，只走它会有行永远停在"落点未确认"）
"$NODE" scripts/qa/shoot-frameplan.mjs --ws-taps --label "round-7-uidebt-ws-$(git rev-parse --short HEAD)" \
  --out reports/audit/round-7/uidebt-shoot-ws
# 落点仍被守卫重定向的行：按身份/前置分流重拍，而不是记成判红
"$NODE" scripts/qa/shoot-frameplan.mjs --ws-taps --label "round-7-uidebt-guest2-$(git rev-parse --short HEAD)" \
  --out reports/audit/round-7/uidebt-shoot-guest2 \
  --only-ids MP-R2VIS-PAGES-LOGIN-INDEX-001,MP-R2VIS-PAGES-LOGIN-INDEX-007
# 3e. 帧 → 台账判决（默认 dry；判红的条目是发现，不许改写成绿）
"$NODE" scripts/qa/verdict-from-frames.mjs \
  --frames reports/audit/round-7/uidebt-shoot-ws/shoot-results.json
# 3f. 判红落账前的可判性闸：target 是散文的、锚点不在被测产物里的、
#     整帧没有正对照的，一律不作判据——并且要撤销上一轮已经写进去的判红（--restore-from）
"$NODE" scripts/qa/audit-frame-verdicts.mjs \
  --frames reports/audit/round-7/uidebt-shoot-ws/shoot-results.json \
  --restore-from reports/audit/round-6/issue-matrix.md.pre-cellpatch.bak
"$NODE" scripts/qa/emit-landing-debt-plan.mjs \
  --frames reports/audit/round-7/uidebt-shoot-wsl2/shoot-results.json
"$NODE" scripts/qa/patch-ledger-cells.mjs --plan reports/audit/round-7/cellplan-round7-frames-admissible.json
"$NODE" scripts/qa/patch-ledger-cells.mjs --plan reports/audit/round-7/cellplan-landing-debt.json
#   核对无误后自己加 --apply（直接上 apply 会跳过逐条 before/after 核对）

echo "== 收尾：帧孤儿体检 + 冷启动守卫归属 + 台账/门禁面板 =="
# 重建之前必须冻结一次：终报的 A/B 两侧分界靠这份快照，round-7 就因为没跑这步而出不来报告
"$NODE" scripts/qa/freeze-exec-snapshot.mjs \
  --src reports/audit/round-7/interact/exec-results.pre-rebuild-1048.json --round 7
# 重建口径（顺序有坑，别倒过来）：
#   build:mp-weixin:real:dev 与 mock 都写到 dist/build/mp-weixin —— 先 real 后 mock 才能让
#   模拟器里那份保持 mock；real 产物由 isolated 脚本经 UNI_OUTPUT_DIR 单独落到 mp-weixin-real。
#   (cd apps/client && npm run build:mp-weixin:real:isolated && npm run build:mp-weixin:mock)
# 后端改了 Java 要先 mvnw -Dtest=... test 编到 target/classes，再跑 apps/api/restart-backend.ps1
#（凭据由脚本运行时自取，绝不上命令行），然后 curl /api/v1/location/ip-city 回读新字段。
"$NODE" scripts/qa/emit-round-report.mjs --round-dir reports/audit/round-7 \
  --report reports/audit/round-7/round7-gatepanel.md \
  --metrics reports/audit/round-7/round7-metrics.json \
  --manifest-detail reports/screenshots/round-7-mock-tour-1a1df78b/manifest-detail.json \
  --sidecar-dir .zcode/tmp/report-emitter-r7
"$NODE" scripts/qa/check-frame-orphanage.mjs \
  --dir reports/screenshots/round-7-exec \
  --results reports/audit/round-7/interact/exec-results.json
"$NODE" scripts/qa/triage-cold-entry.mjs \
  --results reports/audit/round-7/interact-real/exec-results.json \
  --out reports/audit/round-7/cold-entry-triage-real.md
"$NODE" scripts/qa/verify-ledger.mjs reports/audit/round-6
echo "RERUN_DONE 各刀跑完才谈『1107 例已覆盖』；在此之前报告只能写切片口径"
