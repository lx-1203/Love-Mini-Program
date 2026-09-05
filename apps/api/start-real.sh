#!/usr/bin/env bash
# 启动 real 模式后端 (8080)
# 前置: MySQL 3306 已建 campus_love 库; Redis 6379 已启动; 根目录 .env 已配全
# 用法: bash "D:/6/恋爱小程序/apps/api/start-real.sh"
# 注意: 本环境 Git Bash 对「变量拼接路径 / .. 组件路径」解析不可靠,
#       因此 .env 与 classpath 一律用字面量绝对路径 (POSIX 形式)。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="/d/6/恋爱小程序/.env"
CP_FILE="/d/6/恋爱小程序/apps/api/target/cp.txt"

echo "[start-real] SCRIPT_DIR=$SCRIPT_DIR"
if [ ! -f "$ENV_FILE" ]; then
  echo "[start-real] FATAL: env file not found: $ENV_FILE" >&2
  ls -la /d/6/ 2>&1 | head -5 >&2 || true
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

exec java -cp "/d/6/恋爱小程序/apps/api/target/classes;$(cat "$CP_FILE")" \
  com.campuslove.api.CampusLoveApplication \
  --spring.profiles.active=real --server.port=8080
