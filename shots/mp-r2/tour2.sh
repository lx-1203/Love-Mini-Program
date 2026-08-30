#!/bin/bash
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"
I="/d/微信开发者/微信web开发者工具/wechatide.cmd"
P="D:/6/恋爱小程序"
OUT="D:/6/恋爱小程序/shots/mp-r2"
tour() { # $1=url $2=name $3=navtype
  "$I" -c ZCode automation_navigate --project "$P" --action "${3:-reLaunch}" --url "$1" --wait 2 >/dev/null 2>&1
  sleep 3
  "$I" -c ZCode simulator_screenshot --project "$P" --path "$OUT/$2.png" >/dev/null 2>&1
  [ -f "$OUT/$2.png" ] && echo "shot $2"
  "$I" -c ZCode automation_viewport_action --project "$P" --action pageScrollTo --scroll-top 99999 --wait 2 >/dev/null 2>&1
  sleep 2
  "$I" -c ZCode simulator_screenshot --project "$P" --path "$OUT/$2-bottom.png" >/dev/null 2>&1
  [ -f "$OUT/$2-bottom.png" ] && echo "  $2-bottom"
  "$I" -c ZCode automation_viewport_action --project "$P" --action pageScrollTo --scroll-top 0 --wait 1 >/dev/null 2>&1
}
