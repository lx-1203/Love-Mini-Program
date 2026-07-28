#!/usr/bin/env bash
# ============================================================
# MySQL 定时备份脚本（Task 8.3.1）
# ============================================================
# 功能：
#   1. mysqldump 全量备份数据库（--single-transaction 保证一致性）
#   2. gzip 压缩，减小存储体积（典型压缩比 5-10 倍）
#   3. 滚动保留 7 天（可通过 BACKUP_RETENTION_DAYS 配置）
#   4. 支持 --dry-run 测试模式（仅打印不实际执行）
#   5. 备份结果日志输出到 stdout（cron 重定向到 /backup/cron.log）
#
# 使用方式：
#   1. 直接执行：./scripts/backup-mysql.sh
#   2. dry-run 测试：./scripts/backup-mysql.sh --dry-run
#   3. 定时执行：通过 docker-compose 中 mysql-backup 服务 + crontab 自动调度
#
# 环境变量（与 docker-compose 中 mysql-backup 服务对齐）：
#   MYSQL_HOST          — MySQL 主机（默认 mysql）
#   MYSQL_PORT          — MySQL 端口（默认 3306）
#   MYSQL_USER          — 备份用户（默认 root，需 SELECT/LOCK TABLES 权限）
#   MYSQL_PASSWORD      — 备份用户密码
#   MYSQL_DATABASE      — 备份数据库名
#   BACKUP_DIR          — 备份存储目录（默认 /backup）
#   BACKUP_RETENTION_DAYS — 保留天数（默认 7）
#   BACKUP_COMPRESS_LEVEL — gzip 压缩级别 1-9（默认 6）
#
# 退出码：
#   0 - 成功
#   1 - 参数错误 / 环境变量缺失
#   2 - mysqldump 失败
#   3 - 压缩失败
#   4 - 清理失败
# ============================================================

set -euo pipefail

# ---------- 默认值 ----------
MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
MYSQL_DATABASE="${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
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

# ---------- 清理过期备份 ----------
log "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
# -mtime +N：修改时间早于 N 天前
# -type f：仅文件
# -name '*.sql.gz'：仅备份文件
# -exec rm -f {} \;：删除
CLEANED_COUNT=0
while IFS= read -r -d '' old_file; do
    log "Removing old backup: ${old_file}"
    rm -f "${old_file}"
    CLEANED_COUNT=$((CLEANED_COUNT + 1))
done < <(find "${BACKUP_DIR}" -type f -name '*.sql.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -print0 2>/dev/null)

log "Cleaned ${CLEANED_COUNT} expired backup(s)."

# ---------- 列出当前备份 ----------
log "Current backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || log "  (none)"

# ---------- 备份校验摘要 ----------
BACKUP_COUNT=$(find "${BACKUP_DIR}" -type f -name '*.sql.gz' | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "Total backups: ${BACKUP_COUNT} files, ${TOTAL_SIZE}"

log "===== MySQL Backup Complete ====="
exit 0
