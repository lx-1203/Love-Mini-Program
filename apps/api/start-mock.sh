#!/usr/bin/env bash
# 启动 mock 模式后端 (8080) —— 无需 MySQL/Redis, 但需 JWT_SECRET (来自根目录 .env)
# 用法: 在仓库根执行 bash apps/api/start-mock.sh
# 注意: 所有路径均由脚本自身位置推导 (SCRIPT_DIR 经 cd+pwd 规范化,
#       不含 .. 组件), 仓库移动或换机后无需改动本文件。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
CP_FILE="$SCRIPT_DIR/target/cp.txt"

echo "[start-mock] SCRIPT_DIR=$SCRIPT_DIR"
if [ ! -f "$ENV_FILE" ]; then
  echo "[start-mock] FATAL: env file not found: $ENV_FILE" >&2
  exit 1
fi
if [ ! -f "$CP_FILE" ]; then
  echo "[start-mock] $CP_FILE not found, running dependency:build-classpath ..."
  (cd "$SCRIPT_DIR" && ./mvnw.cmd dependency:build-classpath -Dmdep.outputFile=target/cp.txt)
fi

# mock 模式也走 WebSocket bean 链, 缺 JWT_SECRET 会在 JwtConfig.validateSecret 崩溃
set -a
source "$ENV_FILE"
set +a

exec java -cp "$SCRIPT_DIR/target/classes;$(cat "$CP_FILE")" \
  com.campuslove.api.CampusLoveApplication \
  --spring.profiles.active=mock --server.port=8080
