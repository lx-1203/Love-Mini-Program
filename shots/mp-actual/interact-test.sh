#!/bin/bash
# 交互响应测试：tap → 观察页面/接口响应；输出每个交互的判定
I="/d/微信开发者/微信web开发者工具/wechatide.cmd"
P="D:/6/恋爱小程序"
export MSYS_NO_PATHCONV=1
nav() { "$I" -c ZCode automation_navigate --project "$P" --action "${3:-reLaunch}" --url "$1" --wait 2 >/dev/null 2>&1; sleep 3; }
tap() { # $1=selector $2=名称 $3=期望(可选:页面路径包含)
  T0=$(date +%s%3N)
  R=$("$I" -c ZCode automation_element_action --project "$P" --selector "$1" --action tap 2>&1 | grep -c '"success": true')
  T1=$(date +%s%3N)
  sleep "${4:-4}"
  echo "[$2] tap=$R 耗时=$((T1-T0))ms"
}
cur() { "$I" -c ZCode automation_runtime_info --project "$P" --action currentPage 2>&1 | grep '"path"' | head -1; }
