#!/usr/bin/env bash
# 启动 mock 模式后端 (8080) —— 无需 MySQL/Redis, 但需 JWT_SECRET (来自根目录 .env)
# 用法: bash "D:/6/恋爱小程序/apps/api/start-mock.sh"
# 注意: 本环境 Git Bash 对「变量拼接路径 / .. 组件路径」解析不可靠,
#       因此 .env 与 classpath 一律用字面量绝对路径 (POSIX 形式)。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="/d/6/恋爱小程序/.env"
CP_FILE="/d/6/恋爱小程序/apps/api/target/cp.txt"

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

exec java -cp "/d/6/恋爱小程序/apps/api/target/classes;$(cat "$CP_FILE")" \
  com.campuslove.api.CampusLoveApplication \
  --spring.profiles.active=mock --server.port=8080
