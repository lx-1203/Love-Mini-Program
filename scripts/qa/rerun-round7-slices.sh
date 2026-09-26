#!/usr/bin/env bash
# round-7 执行轮剩余两刀的**可重跑清单**（观察刀已在跑/已跑完，这里不重复）。
# 为什么单独留这个文件：欠的覆盖率必须写成"一条命令能补上"，而不是写在报告正文里的一句话。
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

echo "== 刀 1：交互（tap）切片，只重跑上一刀记 SKIPPED(交互动词) 的行 =="
# --redo-taps 把"上一刀没跑"的行退回待跑；已 EXECUTED 的行不动（否则等于拿新帧冲掉旧结论）
# 不可逆动作（注销/解绑/清空/登出）由脚本内 DENY_TAP 白名单禁触并显式记 SKIPPED-DENY
"$NODE" scripts/qa/r-exec-ws.mjs --tap --redo-taps

echo "== 刀 2：真实模式切片（结果与帧都另起目录，不与 mock 混）=="
# 2a. real 产物必须先重建到 HEAD（隔离脚本会自证 sharedOutUntouched=yes）
"$NODE" tmp/run-pnpm22.cjs -C apps/client run build:mp-weixin:real:isolated
# 2b. 后端在跑 + 十环/素材复跑（G8 会写库，写下的行按既有裁定保留并披露）
"$NODE" scripts/probe-real-env.mjs
# 2c. 真实模式执行轮：requiresReal 的 223 条只有这一刀能覆盖
"$NODE" scripts/qa/r-exec-ws.mjs \
  --project "apps/client/dist/build/mp-weixin-real" \
  --round round-7-real \
  --out "reports/audit/round-7/interact-real" \
  --shots "reports/screenshots/round-7-real-exec"

echo "== 收尾：帧孤儿体检 + 冷启动守卫归属 + 门禁面板 =="
"$NODE" scripts/qa/check-frame-orphanage.mjs \
  --dir reports/screenshots/round-7-exec \
  --results reports/audit/round-7/interact/exec-results.json
"$NODE" scripts/qa/triage-cold-entry.mjs
echo "RERUN_DONE 两刀跑完后才谈『1107 例已覆盖』；在此之前报告只能写切片口径"
