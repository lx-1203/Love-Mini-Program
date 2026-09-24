#!/usr/bin/env bash
# R13d: fullMode legible screenshots + prove the chat re-entry fix (enter same chat twice).
set -u
WI="D:/微信开发者/微信web开发者工具/wechatide.cmd"
D="D:/6/恋爱小程序/apps/client/dist/build/mp-weixin"
OUT="D:/6/恋爱小程序/reports/audit/2026-09-22-r13-goal"
SH="$OUT/shots-r13d"
mkdir -p "$SH"
LOG="$OUT/r13d-run.log"; : > "$LOG"
say(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
run(){ local t=$1; shift; timeout "$t" "$WI" -c Qoder "$@" >> "$LOG" 2>&1; }

TOK=$(curl -s -m 15 -X POST http://127.0.0.1:8080/api/v1/auth/guest-login -H "Content-Type: application/json" -d '{}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log('')}})")
printf 'function(){ try { wx.setStorageSync("token", "%s"); var app=getApp(); var vm=app["$vm"]; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm["$pinia"]||gp["$pinia"]; var s=p._s.get("session"); if(s&&s.bootstrap){ s.bootstrap(); } return "boot-ok"; } catch(e){ return "ERR "+e.message; } }' "$TOK" > "$OUT/tmp_boot_d.js"

say "== reopen dist project in fullMode (legible 377x814) =="
run 90 close_project_window --project "$D"
sleep 5
run 240 open_project_window --project "$D" --window-mode fullMode
say "== cold compile wait 170s =="
sleep 170

boot(){ timeout 170 "$WI" -c Qoder automation_evaluate --project "$D" --fn-source "$(cat "$OUT/tmp_boot_d.js")" >> "$LOG" 2>&1; }
for i in 1 2 3 4; do
  boot
  if grep -q "boot-ok" "$LOG"; then say "boot-ok (try $i)"; break; fi
  say "boot try $i failed, wait 45s"; sleep 45
done

shoot(){
  local name="$1" page="$2" wait="${3:-14}"
  say "== $name =="
  run 180 simulator_open_page --project "$D" --page "$page"
  sleep "$wait"
  run 180 simulator_screenshot --project "$D" --path "$SH/$name.png" --optimize false
  run 120 get_simulator_console --project "$D" --command "grep -iE 'error|TypeError|fail|401|409|500' | tail -10"
}

# login page first (evidence gap flagged by design audit)
say "== login page (logged out) =="
run 180 simulator_open_page --project "$D" --page pages/login/index
sleep 12
run 180 simulator_screenshot --project "$D" --path "$SH/40-login.png" --optimize false

shoot "41-home"     "pages/home/index"
shoot "42-messages" "pages/messages/index"

say "=== CHAT RE-ENTRY TEST (the fix) ==="
MARK=$(date +%s)
run 180 simulator_open_page --project "$D" --page "subpackages/chat/chat-session/index" --query "userId=10011"
sleep 16
run 180 simulator_screenshot --project "$D" --path "$SH/43-chat-first-entry.png" --optimize false
say "-- back out and re-enter the SAME chat --"
run 180 simulator_open_page --project "$D" --page pages/messages/index
sleep 10
run 180 simulator_open_page --project "$D" --page "subpackages/chat/chat-session/index" --query "userId=10011"
sleep 16
run 180 simulator_screenshot --project "$D" --path "$SH/44-chat-second-entry.png" --optimize false

say "== backend IDEMPOTENT_CONFLICT total (baseline before this test was 3) =="
grep -c "IDEMPOTENT_CONFLICT" "D:/6/恋爱小程序/apps/api/logs/campus-love-api.log" >> "$LOG" 2>&1
say "compare against baseline 3: any increase means re-entry still collides"

shoot "45-profile"  "pages/profile/index"
shoot "46-nearby"   "pages/nearby/index"
shoot "47-discover" "pages/discover/index"
say "DONE"
