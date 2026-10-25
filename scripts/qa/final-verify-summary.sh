#!/usr/bin/env bash
# 终验退出码汇总（可独立 source 测试）。
# 汇总目录内全部 *.exit；非零或非法值都计入红数，JSON 永远只写数字。
# 用法：final_verify_summarize <outDir> <headBefore> <headAfter>
# stdout：每条 RED 明细 + 末行 FAIL 数量（调用方取最后一行）。

final_verify_summarize() {
  local dir="$1" head_before="$2" head_after="$3"
  local fail=0 reds="" gates="" f n e
  for f in "$dir"/*.exit; do
    [ -e "$f" ] || continue
    n=$(basename "$f" .exit)
    e=$(cat "$f" 2>/dev/null | tr -d '[:space:]')
    case "$e" in
      ''|*[!0-9]*)
        echo "RED: $n exit=invalid"
        e=2
        fail=$((fail + 1))
        reds="${reds}\"$n\","
        ;;
      *)
        if [ "$e" != "0" ]; then
          echo "RED: $n exit=$e"
          fail=$((fail + 1))
          reds="${reds}\"$n\","
        fi
        ;;
    esac
    gates="${gates}\"$n\":$e,"
  done
  local tmp="$dir/summary.json.tmp"
  printf '{"headBefore":"%s","headAfter":"%s","gates":{%s},"reds":[%s]}\n' \
    "$head_before" "$head_after" \
    "$(printf '%s' "$gates" | sed 's/,$//')" \
    "$(printf '%s' "$reds" | sed 's/,$//')" > "$tmp" || return 1
  mv "$tmp" "$dir/summary.json" || return 1
  echo "GREEN/RED 计数：红=$fail  HEAD 前=$head_before 后=$head_after"
  printf '%s\n' "$fail"
}
