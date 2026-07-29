#!/usr/bin/env bash
# ============================================================
# MySQL + Redis 定时备份脚本（Task 8.3.1 + P3-D.3）
# ============================================================
# 功能：
#   1. mysqldump 全量备份数据库（--single-transaction 保证一致性）
#   2. gzip 压缩，减小存储体积（典型压缩比 5-10 倍）
#   3. Redis RDB 备份（BGSAVE 后复制 dump.rdb，P3-D.3 新增）
#   4. 滚动保留 7 天（可通过 BACKUP_RETENTION_DAYS 配置，同时清理 .sql.gz 与 .rdb）
#   5. 支持 --dry-run 测试模式（仅打印不实际执行）
#   6. 备份结果日志输出到 stdout（cron 重定向到 /backup/cron.log）
#
# 使用方式：
#   1. 直接执行：./scripts/backup-mysql.sh
#   2. dry-run 测试：./scripts/backup-mysql.sh --dry-run
#   3. 定时执行：通过 docker-compose 中 backup 服务 + crontab 自动调度
#
# 环境变量（与 docker-compose 中 backup 服务对齐）：
#   MYSQL_HOST          — MySQL 主机（默认 mysql）
#   MYSQL_PORT          — MySQL 端口（默认 3306）
#   MYSQL_USER          — 备份用户（默认 root，需 SELECT/LOCK TABLES 权限）
#   MYSQL_PASSWORD      — 备份用户密码
#   MYSQL_DATABASE      — 备份数据库名
#   REDIS_HOST          — Redis 主机（留空则跳过 Redis 备份，P3-D.3）
#   REDIS_PORT          — Redis 端口（默认 6379）
#   REDIS_PASSWORD      — Redis 密码（与 redis 服务 requirepass 一致）
#   REDIS_RDB_PATH      — Redis dump.rdb 路径（默认 /data/redis/dump.rdb，需挂载 redis-data 卷）
#   BACKUP_DIR          — 备份存储目录（默认 /backup）
#   BACKUP_RETENTION_DAYS — 保留天数（默认 7）
#   BACKUP_COMPRESS_LEVEL — gzip 压缩级别 1-9（默认 6）
#
# 退出码：
#   0 - 成功
#   1 - 参数错误 / 环境变量缺失
#   2 - mysqldump 失败
#   3 - 压缩失败 / Redis 备份失败
#   4 - 清理失败
# ============================================================

set -euo pipefail

# ---------- 默认值 ----------
MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
MYSQL_DATABASE="${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
# Redis 备份配置（P3-D.3）：REDIS_HOST 留空则跳过 Redis 备份
REDIS_HOST="${REDIS_HOST:-}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_RDB_PATH="${REDIS_RDB_PATH:-/data/redis/dump.rdb}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_COMPRESS_LEVEL="${BACKUP_COMPRESS_LEVEL:-6}"

# ---------- 解析参数 ----------
DRY_RUN=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--help]"
            echo "  --dry-run  Test mode: print actions without executing"
            echo "  --help     Show this help"
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

# ---------- 初始化 ----------
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DATE=$(date +"%Y-%m-%d")
BACKUP_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${TIMESTAMP}.sql.gz"

# 日志带时间戳
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "===== MySQL Backup Start ====="
log "Host: ${MYSQL_HOST}:${MYSQL_PORT}"
log "Database: ${MYSQL_DATABASE}"
log "User: ${MYSQL_USER}"
log "Output: ${BACKUP_FILE}"
log "Retention: ${BACKUP_RETENTION_DAYS} days"
log "Compress level: ${BACKUP_COMPRESS_LEVEL}"
log "Dry-run: ${DRY_RUN}"

# ---------- 检查环境 ----------
if ! command -v mysqldump >/dev/null 2>&1; then
    log "ERROR: mysqldump not found in PATH. Please install mysql-client."
    exit 1
fi

if ! command -v gzip >/dev/null 2>&1; then
    log "ERROR: gzip not found in PATH. Please install gzip."
    exit 1
fi

# ---------- 创建备份目录 ----------
if [[ ! -d "${BACKUP_DIR}" ]]; then
    if [[ ${DRY_RUN} -eq 1 ]]; then
        log "[DRY-RUN] mkdir -p ${BACKUP_DIR}"
    else
        mkdir -p "${BACKUP_DIR}"
        log "Created backup directory: ${BACKUP_DIR}"
    fi
fi

# ---------- 执行备份 ----------
# mysqldump 参数说明：
#   --single-transaction: InnoDB 一致性快照，不锁表（业务可继续读写）
#   --quick: 大表分批读取，避免 OOM
#   --routines: 包含存储过程/函数
#   --triggers: 包含触发器
#   --events: 包含事件调度
#   --set-gtid-purged=OFF: 不写 GTID 信息（兼容性更好）
#   --hex-blob: BLOB 字段以十六进制导出，避免二进制乱码
mysqldump_args=(
    --host="${MYSQL_HOST}"
    --port="${MYSQL_PORT}"
    --user="${MYSQL_USER}"
    --password="${MYSQL_PASSWORD}"
    --single-transaction
    --quick
    --routines
    --triggers
    --events
    --set-gtid-purged=OFF
    --hex-blob
    --default-character-set=utf8mb4
    "${MYSQL_DATABASE}"
)

if [[ ${DRY_RUN} -eq 1 ]]; then
    log "[DRY-RUN] mysqldump ${mysqldump_args[*]} | gzip -${BACKUP_COMPRESS_LEVEL} > ${BACKUP_FILE}"
    log "[DRY-RUN] Skipping actual execution."
    log "===== Dry-run complete ====="
    exit 0
fi

log "Running mysqldump..."
if ! mysqldump "${mysqldump_args[@]}" 2>/tmp/mysqldump-err.log | gzip -"${BACKUP_COMPRESS_LEVEL}" > "${BACKUP_FILE}"; then
    log "ERROR: mysqldump failed. Error output:"
    cat /tmp/mysqldump-err.log >&2 || true
    rm -f "${BACKUP_FILE}"
    exit 2
fi

# ---------- 验证备份 ----------
if [[ ! -s "${BACKUP_FILE}" ]]; then
    log "ERROR: Backup file is empty: ${BACKUP_FILE}"
    exit 3
fi

BACKUP_SIZE=$(stat -c %s "${BACKUP_FILE}" 2>/dev/null || stat -f %z "${BACKUP_FILE}")
BACKUP_SIZE_HUMAN=$(echo "scale=2; ${BACKUP_SIZE} / 1024 / 1024" | bc 2>/dev/null || echo "${BACKUP_SIZE} bytes")
log "Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE_HUMAN} MB)"

# 校验 gzip 完整性
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    log "ERROR: gzip integrity check failed for ${BACKUP_FILE}"
    exit 3
fi
log "Gzip integrity check passed."

# ---------- Redis 备份（P3-D.3，可选）----------
# 仅当 REDIS_HOST 配置时执行；未配置则跳过（向后兼容）
if [[ -n "${REDIS_HOST}" ]]; then
    log "===== Redis Backup Start ====="
    log "Redis Host: ${REDIS_HOST}:${REDIS_PORT}"
    log "RDB source: ${REDIS_RDB_PATH}"

    if ! command -v redis-cli >/dev/null 2>&1; then
        log "ERROR: redis-cli not found in PATH. Please install redis-client."
        exit 3
    fi

    REDIS_BACKUP_FILE="${BACKUP_DIR}/redis-${TIMESTAMP}.rdb"

    # 构造 redis-cli 参数（带密码时附加 -a）
    redis_cli_args=(--host "${REDIS_HOST}" --port "${REDIS_PORT}")
    if [[ -n "${REDIS_PASSWORD}" ]]; then
        redis_cli_args+=(--no-auth-warning -a "${REDIS_PASSWORD}")
    fi

    if [[ ${DRY_RUN} -eq 1 ]]; then
        log "[DRY-RUN] redis-cli ${redis_cli_args[*]} BGSAVE"
        log "[DRY-RUN] sleep 10 && cp ${REDIS_RDB_PATH} ${REDIS_BACKUP_FILE}"
    else
        # 触发后台 RDB 持久化（非阻塞）
        log "Triggering Redis BGSAVE..."
        if ! redis-cli "${redis_cli_args[@]}" BGSAVE >/dev/null 2>&1; then
            log "ERROR: redis-cli BGSAVE failed (Redis 不可达或鉴权失败)"
            exit 3
        fi

        # 轮询等待 BGSAVE 完成（最多 60 秒）
        log "Waiting for BGSAVE to complete (max 60s)..."
        WAIT_SEC=0
        while [[ ${WAIT_SEC} -lt 60 ]]; do
            LAST_SAVE=$(redis-cli "${redis_cli_args[@]}" LASTSAVE 2>/dev/null || echo "0")
            NOW_TS=$(date +%s)
            # LASTSAVE 返回 Unix 时间戳；若距当前时间 < 5s 视为刚完成
            if [[ $((NOW_TS - LAST_SAVE)) -lt 5 ]]; then
                break
            fi
            sleep 2
            WAIT_SEC=$((WAIT_SEC + 2))
        done

        # 复制 RDB 文件到备份目录
        if [[ ! -f "${REDIS_RDB_PATH}" ]]; then
            log "ERROR: Redis RDB file not found at ${REDIS_RDB_PATH} (需将 redis-data 卷挂载到容器)"
            exit 3
        fi

        if ! cp "${REDIS_RDB_PATH}" "${REDIS_BACKUP_FILE}"; then
            log "ERROR: Failed to copy Redis RDB to ${REDIS_BACKUP_FILE}"
            exit 3
        fi

        if [[ ! -s "${REDIS_BACKUP_FILE}" ]]; then
            log "ERROR: Redis backup file is empty: ${REDIS_BACKUP_FILE}"
            exit 3
        fi

        REDIS_BACKUP_SIZE=$(stat -c %s "${REDIS_BACKUP_FILE}" 2>/dev/null || stat -f %z "${REDIS_BACKUP_FILE}")
        log "Redis backup completed: ${REDIS_BACKUP_FILE} (${REDIS_BACKUP_SIZE} bytes)"
    fi
    log "===== Redis Backup Complete ====="
else
    log "REDIS_HOST not set, skipping Redis backup."
fi

# ---------- 清理过期备份 ----------
log "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
# -mtime +N：修改时间早于 N 天前
# -type f：仅文件
# 同时清理 MySQL (.sql.gz) 与 Redis (.rdb) 备份
CLEANED_COUNT=0
while IFS= read -r -d '' old_file; do
    log "Removing old backup: ${old_file}"
    rm -f "${old_file}"
    CLEANED_COUNT=$((CLEANED_COUNT + 1))
done < <(find "${BACKUP_DIR}" -type f \( -name '*.sql.gz' -o -name '*.rdb' \) -mtime "+${BACKUP_RETENTION_DAYS}" -print0 2>/dev/null)

log "Cleaned ${CLEANED_COUNT} expired backup(s)."

# ---------- 列出当前备份 ----------
log "Current backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/*.sql.gz "${BACKUP_DIR}"/*.rdb 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || log "  (none)"

# ---------- 备份校验摘要 ----------
BACKUP_COUNT_SQL=$(find "${BACKUP_DIR}" -type f -name '*.sql.gz' 2>/dev/null | wc -l)
BACKUP_COUNT_RDB=$(find "${BACKUP_DIR}" -type f -name '*.rdb' 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "Total backups: ${BACKUP_COUNT_SQL} SQL + ${BACKUP_COUNT_RDB} RDB files, ${TOTAL_SIZE}"

log "===== Backup Complete ====="
exit 0
