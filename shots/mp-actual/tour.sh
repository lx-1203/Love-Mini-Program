#!/bin/bash
# 逐页巡检 v2：导航→顶图→滚底→底图→回顶（URL 用 MSYS_NO_PATHCONV，路径用正斜杠）
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"
I="/d/微信开发者/微信web开发者工具/wechatide.cmd"
P="D:/6/恋爱小程序"
OUT="D:/6/恋爱小程序/shots/mp-actual"
tour() { # $1=url $2=name $3=navtype
  "$I" -c ZCode automation_navigate --project "$P" --action "${3:-navigateTo}" --url "$1" --wait 2 >/dev/null 2>&1
  sleep 3
  "$I" -c ZCode simulator_screenshot --project "$P" --path "$OUT/$2.png" 2>&1 | grep -o '"success": true' >/dev/null || echo "SHOT-FAIL $2"
  [ -f "$OUT/$2.png" ] && echo "shot $2 $(date +%H:%M:%S)"
  "$I" -c ZCode automation_viewport_action --project "$P" --action pageScrollTo --scroll-top 99999 --wait 2 >/dev/null 2>&1
  sleep 2
  "$I" -c ZCode simulator_screenshot --project "$P" --path "$OUT/$2-bottom.png" 2>&1 | grep -o '"success": true' >/dev/null || echo "SHOT-FAIL $2-bottom"
  [ -f "$OUT/$2-bottom.png" ] && echo "shot $2-bottom"
  "$I" -c ZCode automation_viewport_action --project "$P" --action pageScrollTo --scroll-top 0 --wait 1 >/dev/null 2>&1
}
