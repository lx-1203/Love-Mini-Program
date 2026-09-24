#!/usr/bin/env bash
# R13e: DEFINITIVE verification. Clears the compile cache (which invalidated r13d),
# probes whether the mp runtime can load backend app-assets at all, then re-tests
# chat re-entry and captures legible fullMode screenshots.
set -u
WI="D:/微信开发者/微信web开发者工具/wechatide.cmd"
D="D:/6/恋爱小程序/apps/client/dist/build/mp-weixin"
OUT="D:/6/恋爱小程序/reports/audit/2026-09-22-r13-goal"
SH="$OUT/shots-r13e"; mkdir -p "$SH"
LOG="$OUT/r13e-run.log"; : > "$LOG"
RES="$OUT/r13e-results.json"; : > "$RES"
say(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
run(){ local t=$1; shift; timeout "$t" "$WI" -c Qoder "$@" >> "$LOG" 2>&1; }

TOK=$(curl -s -m 15 -X POST http://127.0.0.1:8080/api/v1/auth/guest-login -H "Content-Type: application/json" -d '{}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log('')}})")
printf 'function(){ try { wx.setStorageSync("token", "%s"); var app=getApp(); var vm=app["$vm"]; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm["$pinia"]||gp["$pinia"]; var s=p._s.get("session"); if(s&&s.bootstrap){ s.bootstrap(); } return "boot-ok"; } catch(e){ return "ERR "+e.message; } }' "$TOK" > "$OUT/tmp_boot_e.js"

say "== close + clear compile & storage cache =="
run 90 close_project_window --project "$D"
sleep 4
run 120 debug_clear_cache --project "$D" --action cleanCompileCache
run 120 debug_clear_cache --project "$D" --action cleanStorageCache
run 120 debug_clear_cache --project "$D" --action cleanProjectFileListCache
sleep 3
run 240 open_project_window --project "$D" --window-mode fullMode
say "== cold compile wait 200s (cache cleared) =="
sleep 200

boot(){ timeout 170 "$WI" -c Qoder automation_evaluate --project "$D" --fn-source "$(cat "$OUT/tmp_boot_e.js")" >> "$LOG" 2>&1; }
for i in 1 2 3 4; do
  boot
  if grep -q "boot-ok" "$LOG"; then say "boot-ok (try $i)"; break; fi
  say "boot try $i failed, wait 50s"; sleep 50
done

# --- DECISIVE: can the mp runtime load a backend app-assets image at all? ---
say "== getImageInfo probe on backend app-assets avatar =="
PROBE='function(){ return new Promise(function(resolve){ wx.getImageInfo({ src: "http://127.0.0.1:8080/api/v1/media/app-assets/assets/images/avatars/avatar-39.jpg", success: function(r){ resolve("OK " + r.width + "x" + r.height + " " + r.path.substring(0,60)); }, fail: function(e){ resolve("FAIL " + (e && e.errMsg)); } }); }); }'
timeout 170 "$WI" -c Qoder automation_evaluate --project "$D" --fn-source "$PROBE" > "$OUT/r13e-imageprobe.txt" 2>&1
grep -oE "(OK|FAIL)[^\"]*" "$OUT/r13e-imageprobe.txt" | head -2 | tee -a "$LOG"

BASE409=$(grep -c "IDEMPOTENT_CONFLICT" "D:/6/恋爱小程序/apps/api/logs/campus-love-api.log")
say "== 409 baseline for this run: $BASE409 =="

shoot(){
  local name="$1" page="$2" wait="${3:-16}"
  say "== $name =="
  run 180 simulator_open_page --project "$D" --page "$page"
  sleep "$wait"
  run 180 simulator_screenshot --project "$D" --path "$SH/$name.png" --optimize false
  run 120 get_simulator_console --project "$D" --command "grep -iE 'error|TypeError|fail|401|409|500' | tail -8"
}

say "== CHAT RE-ENTRY (cache cleared) =="
run 180 simulator_open_page --project "$D" --page "subpackages/chat/chat-session/index" --query "userId=10011"
sleep 18
run 180 simulator_screenshot --project "$D" --path "$SH/50-chat-entry1.png" --optimize false
run 180 simulator_open_page --project "$D" --page pages/messages/index
sleep 10
run 180 simulator_open_page --project "$D" --page "subpackages/chat/chat-session/index" --query "userId=10011"
sleep 18
run 180 simulator_screenshot --project "$D" --path "$SH/51-chat-entry2.png" --optimize false
NEW409=$(grep -c "IDEMPOTENT_CONFLICT" "D:/6/恋爱小程序/apps/api/logs/campus-love-api.log")
echo "chat_reentry_409_before=$BASE409 after=$NEW409 delta=$((NEW409-BASE409))" >> "$RES"
say "== 409 delta across re-entry: $((NEW409-BASE409)) (0 == fix works) =="

shoot "52-home"     "pages/home/index"
shoot "53-messages" "pages/messages/index"
shoot "54-profile"  "pages/profile/index"
shoot "55-nearby"   "pages/nearby/index"
shoot "56-discover" "pages/discover/index"
shoot "57-login"    "pages/login/index"
say "DONE"
