#!/usr/bin/env bash
# 启动 real 模式后端 (8080)
# 前置: MySQL 3306 已建 campus_love 库; Redis 6379 已启动; 根目录 .env 已配全
# 用法: 在仓库根执行 bash apps/api/start-real.sh
# 注意: 所有路径均由脚本自身位置推导 (SCRIPT_DIR 经 cd+pwd 规范化,
#       不含 .. 组件), 仓库移动或换机后无需改动本文件。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
CP_FILE="$SCRIPT_DIR/target/cp.txt"

echo "[start-real] SCRIPT_DIR=$SCRIPT_DIR"
if [ ! -f "$ENV_FILE" ]; then
  echo "[start-real] FATAL: env file not found: $ENV_FILE" >&2
  ls -la "$REPO_ROOT" 2>&1 | head -5 >&2 || true
  exit 1
fi
if [ ! -f "$CP_FILE" ]; then
  echo "[start-real] $CP_FILE not found, running dependency:build-classpath ..."
  (cd "$SCRIPT_DIR" && ./mvnw.cmd dependency:build-classpath -Dmdep.outputFile=target/cp.txt)
fi

# 加载 .env (JWT_SECRET / DB_* / REDIS_* / ADMIN_* / DEMO_SEED / AES ...)
set -a
source "$ENV_FILE"
set +a

exec java -cp "$SCRIPT_DIR/target/classes;$(cat "$CP_FILE")" \
  com.campuslove.api.CampusLoveApplication \
  --spring.profiles.active=real --server.port=8080
