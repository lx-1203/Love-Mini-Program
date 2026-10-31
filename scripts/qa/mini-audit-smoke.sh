#!/usr/bin/env bash
# 小程序 UI 巡检（2026-10-26 参数化版）
#
# 逐页调用微信开发者工具：打开页面 → 轮询落点稳定 → 截图 → 当前页 → console error。
# 每页完成即落盘，进程被杀也能从 TSV / 原始 JSON 续查。
# 不做点击/提交/支付等破坏性动作；只做只读巡检。
#
# 环境变量：
#   PROJECT    DevTools 项目绝对路径（Windows 形式）
#   OUT        证据目录（默认 reports/audit/mini-audit-2026-10-26）
#   SHOTS      截图目录（默认 reports/screenshots/mini-audit-2026-10-26）
#   SHOTS_WIN  截图目录的 Windows 路径（缺省用 cygpath 转换）
#   LABEL      结果文件名后缀
#   PAGES_FILE 页面清单：每行 `route` 或 `route<TAB>query`
#
# 2026-10-26 修的两处硬编码：PROJECT/OUT/SHOTS/日期前缀原先写死成 2026-10-25 mock 档；
# 另外把固定 sleep 3 换成对 currentPage 的轮询（固定等待会把“还在加载”读成“没数据”）。
set -u

CLI="${WECHATIDE_CLI:-/d/微信开发者/微信web开发者工具/wechatide.cmd}"
PROJECT="${PROJECT:-D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\mp-weixin-real}"
OUT="${OUT:-reports/audit/mini-audit-2026-10-26}"
SHOTS="${SHOTS:-reports/screenshots/mini-audit-2026-10-26}"
LABEL="${LABEL:-}"
PAGES_FILE="${PAGES_FILE:-}"
CLIENT_NAME="${CLIENT_NAME:-Qoder}"
SETTLE_TRIES="${SETTLE_TRIES:-10}"
SETTLE_INTERVAL="${SETTLE_INTERVAL:-0.7}"

if [ -z "${SHOTS_WIN:-}" ]; then
  SHOTS_WIN="$(cygpath -w "$(cd "$(dirname "$SHOTS")" 2>/dev/null && pwd || echo .)/$(basename "$SHOTS")" 2>/dev/null || true)"
fi

mkdir -p "$OUT/raw" "$SHOTS"

PAGES=()
QUERIES=()
if [ -n "$PAGES_FILE" ]; then
  while IFS=$'\t' read -r page query; do
    [ -z "$page" ] && continue
    case "$page" in \#*) continue ;; esac
    PAGES+=("$page")
    QUERIES+=("${query:-}")
  done < "$PAGES_FILE"
else
  PAGES=(
    "pages/home/index" "" "pages/nearby/index" "" "pages/discover/index" ""
    "pages/messages/index" "" "pages/profile/index" ""
    "subpackages/village/village/index" "" "subpackages/village/village/publish" ""
    "subpackages/circles/circles/index" "" "subpackages/circles/circles/topics" ""
    "subpackages/campus/campus/hub" "" "subpackages/setup/campus/index" ""
    "subpackages/setup/showcase/index" ""
    "subpackages/tools/love-center/nearby" "" "subpackages/tools/heart-signals/index" ""
    "subpackages/discover-extra/likes-visitors/index" ""
    "subpackages/market/wallet/index" "" "subpackages/vip/index" ""
    "subpackages/profile-extra/settings/index" "" "subpackages/legal/privacy/index" ""
    "subpackages/discover-extra/discover/match-success" ""
  )
  # 上面是交替的 page/query 对；拆成两个数组
  _P=(); _Q=()
  for ((i=0; i<${#PAGES[@]}; i+=2)); do _P+=("${PAGES[$i]}"); _Q+=("${PAGES[$i+1]:-}"); done
  PAGES=("${_P[@]}"); QUERIES=("${_Q[@]}")
fi

RESULTS="$OUT/results${LABEL:+_$LABEL}.tsv"
printf 'page\tquery\topen_exit\tcurrent_page\tsettle_reads\tshot_exit\tconsole\tbytes\tmagic\tshot\tat\n' > "$RESULTS"

for idx in "${!PAGES[@]}"; do
  page="${PAGES[$idx]}"
  query="${QUERIES[$idx]:-}"
  slug="${page//\//_}"
  name="${LABEL:+${LABEL}_}$slug"
  raw="$OUT/raw/$name"
  shot="$SHOTS/$slug.png"

  echo "[$(date +%H:%M:%S)] open $page${query:+?$query}"
  if [ -n "$query" ]; then
    timeout 120 "$CLI" -c "$CLIENT_NAME" simulator_open_page \
      --project "$PROJECT" --page "$page" --query "$query" > "$raw.open.json" 2>&1
  else
    timeout 120 "$CLI" -c "$CLIENT_NAME" simulator_open_page \
      --project "$PROJECT" --page "$page" > "$raw.open.json" 2>&1
  fi
  open_exit=$?

  # 落点轮询：连续两次读到同一非空 route 才算稳定；固定 sleep 不可信
  current=""; prev=""; stable=0; reads=0; i=0
  while [ "$i" -lt "$SETTLE_TRIES" ]; do
    i=$((i+1)); reads=$i
    timeout 60 "$CLI" -c "$CLIENT_NAME" automation_runtime_info \
      --project "$PROJECT" --action currentPage > "$raw.current.$i.json" 2>&1
    current=$(grep -o '"route": *"[^"]*"' "$raw.current.$i.json" 2>/dev/null | head -1 | sed 's/.*: *"//;s/"//')
    [ -z "$current" ] && current="(unknown)"
    if [ "$current" != "(unknown)" ] && [ "$current" = "$prev" ]; then stable=$((stable+1)); else stable=0; fi
    prev="$current"
    [ "$stable" -ge 1 ] && break
    sleep "$SETTLE_INTERVAL"
  done
  cp -f "$raw.current.$reads.json" "$raw.current.json" 2>/dev/null || true

  shot_win="$SHOTS_WIN\\$slug.png"
  timeout 120 "$CLI" -c "$CLIENT_NAME" simulator_screenshot \
    --project "$PROJECT" --path "$shot_win" --wait 1 --optimize false > "$raw.shot.json" 2>&1
  shot_exit=$?

  bytes=0
  magic=""
  if [ -f "$shot" ]; then
    bytes=$(stat -c %s "$shot" 2>/dev/null || echo 0)
    magic=$(head -c 4 "$shot" 2>/dev/null | od -An -tx1 | tr -d ' \n')
  fi
  # --path 未落盘时，用工具返回的临时路径补拷（2026-10-14 实测两种写法都可能不可信）
  if [ "$bytes" -eq 0 ]; then
    srcpath=$(grep -o '"path": *"[^"]*"' "$raw.shot.json" 2>/dev/null | head -1 | sed 's/.*: *"//;s/"$//' | sed 's#\\\\#\\#g')
    if [ -n "$srcpath" ] && [ -f "$srcpath" ]; then
      cp -f "$srcpath" "$shot" && bytes=$(stat -c %s "$shot") && magic=$(head -c 4 "$shot" | od -An -tx1 | tr -d ' \n')
    fi
  fi

  timeout 60 "$CLI" -c "$CLIENT_NAME" get_simulator_console \
    --project "$PROJECT" --command "grep -in error" > "$raw.console.txt" 2>&1
  console_hit=$(grep -c '"result": *"[^"]' "$raw.console.txt" 2>/dev/null || true)
  [ -z "$console_hit" ] && console_hit=0

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$page" "$query" "$open_exit" "$current" "$reads" "$shot_exit" "$console_hit" "$bytes" "$magic" "$shot" "$(date +%H:%M:%S)" >> "$RESULTS"
  echo "  -> current=$current reads=$reads open_exit=$open_exit shot_exit=$shot_exit bytes=$bytes magic=$magic console_match=$console_hit"
done

echo "[$(date +%H:%M:%S)] done -> $RESULTS"
