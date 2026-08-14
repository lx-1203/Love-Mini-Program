#!/bin/bash
set -e

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=campus_love_ci
DB_USER=root
DB_PASS=root

SQL_DIR="/mnt/d/6/恋爱小程序/database/flyway/sql"

# Flyway 占位符默认值（与 flyway.toml / application-db.yml 保持一致）
ADMIN_OPENID="admin-default-openid-change-me"
ADMIN_NICKNAME="系统管理员"
ADMIN_PASSWORD_HASH=".20cQQubK3.HZWzG3YB1tlRy.fqvM/BG"

mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

for f in $(ls -1 "$SQL_DIR"/V*.sql | sort); do
  echo "Running $f"
  # 本地测试时替换 Flyway 双下划线占位符，避免 MySQL 客户端无法解析
  # 使用 # 作为 sed 分隔符，防止 ADMIN_PASSWORD_HASH 中的 / 引起冲突
  sed -e "s#__admin_openid__#'$ADMIN_OPENID'#g" \
      -e "s#__admin_nickname__#'$ADMIN_NICKNAME'#g" \
      -e "s#__admin_password_hash__#'$ADMIN_PASSWORD_HASH'#g" "$f" | \
      mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS $DB_NAME || { echo "FAILED: $f"; exit 1; }
done

echo "All migrations applied successfully"
