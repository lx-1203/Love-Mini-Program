#!/usr/bin/env bash
# R13 final: wait for build, clear caches, re-shoot the pages changed in the last build,
# then restore the src/static files that prepare-static --real moved out.
set -u
WI="D:/微信开发者/微信web开发者工具/wechatide.cmd"
D="D:/6/恋爱小程序/apps/client/dist/build/mp-weixin"
ROOT="D:/6/恋爱小程序"
OUT="$ROOT/reports/audit/2026-09-22-r13-goal"
SH="$OUT/shots-r13final"; mkdir -p "$SH"
LOG="$OUT/r13final.log"; : > "$LOG"
say(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
run(){ local t=$1; shift; timeout "$t" "$WI" -c Qoder "$@" >> "$LOG" 2>&1; }

say "== wait for build to finish =="
for i in $(seq 1 40); do
  if grep -q "EXIT=" "$ROOT/logs/goal-build-r13-final.log" 2>/dev/null; then break; fi
  sleep 15
done
grep -E "verify-size|EXIT=" "$ROOT/logs/goal-build-r13-final.log" | tail -3 >> "$LOG"
say "build tail: $(grep -E 'EXIT=' "$ROOT/logs/goal-build-r13-final.log" | tail -1)"

TOK=$(curl -s -m 15 -X POST http://127.0.0.1:8080/api/v1/auth/guest-login -H "Content-Type: application/json" -d '{}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log('')}})")
printf 'function(){ try { wx.setStorageSync("token", "%s"); var app=getApp(); var vm=app["$vm"]; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm["$pinia"]||gp["$pinia"]; var s=p._s.get("session"); if(s&&s.bootstrap){ s.bootstrap(); } return "boot-ok"; } catch(e){ return "ERR "+e.message; } }' "$TOK" > "$OUT/tmp_boot_f.js"

say "== clear caches and reopen =="
run 90 close_project_window --project "$D"
sleep 4
run 120 debug_clear_cache --project "$D" --action cleanCompileCache
run 120 debug_clear_cache --project "$D" --action cleanProjectFileListCache
sleep 3
run 240 open_project_window --project "$D" --window-mode fullMode
say "== cold compile wait 200s =="
sleep 200

boot(){ timeout 170 "$WI" -c Qoder automation_evaluate --project "$D" --fn-source "$(cat "$OUT/tmp_boot_f.js")" >> "$LOG" 2>&1; }
for i in 1 2 3; do
  boot
  if grep -q "boot-ok" "$LOG"; then say "boot-ok (try $i)"; break; fi
  say "boot try $i failed"; sleep 50
done

shoot(){
  say "== $1 =="
  run 180 simulator_open_page --project "$D" --page "$2"
  sleep 16
  run 180 simulator_screenshot --project "$D" --path "$SH/$1.png" --optimize false
  run 120 get_simulator_console --project "$D" --command "grep -iE 'error|TypeError|fail|401|409|500' | tail -8"
}

shoot "60-messages"   "pages/messages/index"
shoot "61-circles"    "subpackages/circles/circles/index"
shoot "62-circle-home" "subpackages/circles/circles/circle-home"
shoot "63-home"       "pages/home/index"
shoot "64-chat"       "subpackages/chat/chat-session/index"
say "DONE-SHOOTS"

say "== restore src/static moved out by prepare-static --real =="
cd "$ROOT" && git checkout -- apps/client/src/static/ 2>&1 | tail -3 >> "$LOG"
say "restored; deletions remaining = $(git status --short | grep -c '^ D')"
say "DONE"
