#!/usr/bin/env bash
# repo-purge.sh — 把「已被 .gitignore 忽略却仍在版本库里跟踪」的文件移出索引。
#
# 为什么需要它（2026-10-29 全量排查实测）：
#   git ls-files                      → 18,058
#   git ls-files -ci --exclude-standard → 7,875（其中 reports/ 占 7,487）
#   git count-objects -vH             → size-pack 800.55 MiB
#   git ls-files database/backup      → 105 个 .sql（含真实手机号 / openid / BCrypt 哈希）
# .gitignore 只挡新文件，对已跟踪文件无效 —— 所以这 7,875 个文件每次 clone / CI 都要拉，
# 而且任何有仓库读权限的人都能拿到那 105 份生产数据备份。
#
# 安全边界（本脚本刻意做到的）：
#   1) 默认 dry-run，只打印计划，一个字节都不改；
#   2) 只动索引（git rm --cached），绝不删除工作区文件 —— 本地证据/截图仍在盘上；
#   3) 不重写历史、不 force-push、不 commit —— 那三步必须人工单独确认；
#   4) 需显式 --apply 且当场输入确认串才执行。
#
# 用法：
#   bash scripts/repo-purge.sh                 # 看计划
#   bash scripts/repo-purge.sh --apply         # 执行移出索引（之后自行 git commit）
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1
APPLY="${1:-}"

if [ "$APPLY" = "--apply" ] && { ! git diff --quiet || ! git diff --cached --quiet; }; then
  echo "× 要执行索引清理必须先在干净树上：当前有未提交改动。"
  echo "  先提交或 git stash -u（含未跟踪件）后再跑 --apply，避免把别人的改动混进这次清理。"
  git status --porcelain | head -10
  exit 1
fi

echo "== 当前跟踪数 / 已忽略但仍跟踪数 =="
TRACKED=$(git ls-files | wc -l | tr -d ' ')
STALE=$(git ls-files -ci --exclude-standard | wc -l | tr -d ' ')
echo "tracked=$TRACKED tracked_but_ignored=$STALE"

echo
echo "== 将被移出索引的目录分布（前 15）=="
git ls-files -ci --exclude-standard | awk -F/ '{print $1}' | sort | uniq -c | sort -rn | head -15

echo
echo "== 含个人信息（PII）的备份（.sql，节选）=="
git ls-files -- 'database/backup/*.sql' | head -5
echo "  ... database/backup 下 .sql 合计 $(git ls-files -- 'database/backup/*.sql' | wc -l | tr -d ' ') 个"

if [ "$APPLY" != "--apply" ]; then
  echo
  echo "DRY-RUN：以上只是计划，未做任何改动。加 --apply 才会移出索引。"
  exit 0
fi

cat <<'EOF'
本命令将执行：
  git rm -r --cached <上述已忽略文件>        （只动索引，工作区文件保留）
它不会 commit、不会删本地文件、不会重写历史。
下一步需要你自己做（本脚本绝不代劳）：
  1) git commit -m "chore(repo): untrack ignored artifacts and PII backups"
  2) 确认无人正在共享分支上工作后，用 git filter-repo 清除历史中的 PII 备份并 force-push
     （破坏性操作，需团队同意 + 全仓镜像备份）
  3) 按数据泄露流程评估：受影响账号口令重置、备份外泄面收敛
EOF
read -r -p "输入 PURGE-INDEX 以继续（其它任意输入取消）: " CONFIRM
if [ "$CONFIRM" != "PURGE-INDEX" ]; then
  echo "已取消，未改动索引。"
  exit 1
fi

# --cached 的清单走 stdin，避免命令行长度上限；-z/-0 保证含空格与中文的路径不被拆错
git ls-files -z -ci --exclude-standard \
  | xargs -0 -n 200 --no-run-if-empty git rm --cached --quiet --

echo
echo "== 执行后 =="
echo "tracked=$(git ls-files | wc -l | tr -d ' ') tracked_but_ignored=$(git ls-files -ci --exclude-standard | wc -l | tr -d ' ')"
echo "工作区文件仍在盘上；请检查 git status 后自行提交。"
echo "注意：.gitignore 里刻意白名单化的资源（apps/client/src/static/**、素材/理想效果图/** 等）"
echo "不会出现在上面的清单里，因为它们不满足『命中 ignore』这个条件。"
