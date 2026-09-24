#!/usr/bin/env bash
# R13c: recover DevTools to a compiled, logged-in state WITHOUT manually launching the exe
# (open_project_window starts the IDE itself; launching it concurrently crashes Electron).
set -u
WI="D:/微信开发者/微信web开发者工具/wechatide.cmd"
P="D:/6/恋爱小程序"
OUT="$P/reports/audit/2026-09-22-r13-goal"
SHOTS="$OUT/shots-r13c"
mkdir -p "$SHOTS"
LOG="$OUT/r13c-run.log"
: > "$LOG"
say(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
run(){ local t=$1; shift; timeout "$t" "$WI" -c Qoder "$@" >> "$LOG" 2>&1; }

TOK=$(curl -s -m 15 -X POST http://127.0.0.1:8080/api/v1/auth/guest-login -H "Content-Type: application/json" -d '{}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log('')}})")
[ -z "$TOK" ] && { say "FATAL no guest token"; exit 1; }
printf 'function(){ try { wx.setStorageSync("token", "%s"); var app=getApp(); var vm=app["$vm"]; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm["$pinia"]||gp["$pinia"]; var s=p._s.get("session"); if(s&&s.bootstrap){ s.bootstrap(); } return "boot-ok"; } catch(e){ return "ERR "+e.message; } }' "$TOK" > "$OUT/tmp_boot_c.js"

say "== close stale window =="
run 90 close_project_window --project "$P"
sleep 5

say "== open project window (IDE auto-starts) =="
run 240 open_project_window --project "$P" --window-mode liteMode
say "== allow 200s for cold compile =="
sleep 200

say "== probe automator (up to 5 tries) =="
OK=0
for i in 1 2 3 4 5; do
  if timeout 150 "$WI" -c Qoder automation_evaluate --project "$P" --fn-source "$(cat "$OUT/tmp_boot_c.js")" >> "$LOG" 2>&1; then
    if grep -q "boot-ok" "$LOG"; then say "boot-ok on try $i"; OK=1; break; fi
  fi
  say "try $i failed; waiting 60s"
  sleep 60
done
[ "$OK" = "0" ] && say "WARN automator never came up; still attempting screenshots"

say "== re-open home after boot =="
run 180 simulator_open_page --project "$P" --page pages/home/index
sleep 15

shoot(){
  say "== shoot $1 ($2) =="
  run 180 simulator_open_page --project "$P" --page "$2"
  sleep 12
  run 180 simulator_screenshot --project "$P" --path "$SHOTS/$1.png" --optimize false
  run 120 get_simulator_console --project "$P" --command "grep -iE 'error|TypeError|fail|401|500' | tail -12"
  echo "--- console after $1 ---" >> "$OUT/r13c-console.log"
  tail -6 "$LOG" >> "$OUT/r13c-console.log"
}

shoot "30-home"     "pages/home/index"
shoot "31-nearby"   "pages/nearby/index"
shoot "32-messages" "pages/messages/index"
shoot "33-profile"  "pages/profile/index"
shoot "34-discover" "pages/discover/index"
say "DONE"
