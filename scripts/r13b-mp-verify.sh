#!/usr/bin/env bash
# R13: recover a frozen WeChat DevTools automator, boot the mini-program against the real
# backend with a guest session, then screenshot the pages that exercise data-driven avatars.
set -u
# 路径全部可推导：仓库根 = 本脚本（scripts/）的上一级，转 Windows 形态（要传给 IDE 当 --project）；
# wechatide.cmd 解析序：WECHATIDE_DIR 显式 > PATH 上的同名 cmd；都没有就大声失败，不写盘符死路径。
_rp="$(cd "$(dirname "$0")/.." && pwd)"
P="$(cygpath -m "$_rp" 2>/dev/null || echo "$_rp")"
_wic="${WECHATIDE_DIR:-}"
[ -n "$_wic" ] && _wic="$_wic/wechatide.cmd"
[ -n "$_wic" ] || _wic="$(command -v wechatide.cmd 2>/dev/null || true)"
[ -n "$_wic" ] || { echo "FATAL: 找不到 wechatide.cmd（设 WECHATIDE_DIR 或把它放进 PATH）" >&2; exit 1; }
WI="$_wic"
OUT="$P/reports/audit/2026-09-22-r13-goal"
SHOTS="$OUT/shots-r13b"
mkdir -p "$SHOTS"
LOG="$OUT/r13b-run.log"
: > "$LOG"
say(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
run(){ timeout "${2:-180}" "$WI" -c Qoder $1 >> "$LOG" 2>&1; }

say "== guest login =="
TOK=$(curl -s -m 15 -X POST http://127.0.0.1:8080/api/v1/auth/guest-login -H "Content-Type: application/json" -d '{}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log('')}})")
[ -z "$TOK" ] && { say "FATAL: no guest token"; exit 1; }
say "guest token acquired (${#TOK} chars)"

printf 'function(){ try { wx.setStorageSync("token", "%s"); var app=getApp(); var vm=app["$vm"]; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm["$pinia"]||gp["$pinia"]; var s=p._s.get("session"); if(s&&s.bootstrap){ s.bootstrap(); } return "boot-ok"; } catch(e){ return "ERR "+e.message; } }' "$TOK" > "$OUT/tmp_boot.js"

say "== restart DevTools =="
run "quit" 60
sleep 8
taskkill //F //IM wechatdevtools.exe >> "$LOG" 2>&1 || true
sleep 5
IDE_EXE="$(dirname "$WI")/wechatdevtools.exe"
"$IDE_EXE" >> "$LOG" 2>&1 &
say "relaunching, waiting 45s for IDE server"
sleep 45

say "== open project window =="
run "open_project_window --project \"$P\" --window-mode liteMode" 240
sleep 20

boot(){
  run "automation_evaluate --project \"$P\" --fn-source \"$(cat "$OUT/tmp_boot.js")\"" 150
}

say "== boot attempt 1 =="
boot
say "== open home =="
run "simulator_open_page --project \"$P\" --page pages/home/index" 180
sleep 12

for i in 1 2 3; do
  say "== console probe $i =="
  run "get_simulator_console --project \"$P\" --command \"grep -n . | tail -3\"" 120
  if grep -q '"result": "{\\"' "$LOG"; then say "console has content"; break; fi
  say "console empty; re-booting"
  boot
  sleep 10
done

shoot(){
  say "== shoot $1 =="
  run "simulator_open_page --project \"$P\" --page $2" 180
  sleep 10
  run "simulator_screenshot --project \"$P\" --path \"$SHOTS/$1.png\" --optimize false" 180
  run "get_simulator_console --project \"$P\" --command \"grep -iE 'error|TypeError|fail|undefined' | tail -12\"" 120
}

shoot "20-home"        "pages/home/index"
shoot "21-nearby"      "pages/nearby/index"
shoot "22-messages"    "pages/messages/index"
shoot "23-profile"     "pages/profile/index"
shoot "24-discover"    "pages/discover/index"

say "== full console dump =="
run "get_simulator_console --project \"$P\" --command \"grep -iE 'error|TypeError|fail|401|500' | tail -40\"" 120
say "DONE"
