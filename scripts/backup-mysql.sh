#!/usr/bin/env bash
# ============================================================
# MySQL + Redis 定时备份脚本（Task 8.3.1 + P3-D.3 + S4-3）
# ============================================================
# 功能：
#   1. mysqldump 全量备份数据库（--single-transaction 保证一致性快照）
#   2. gzip 压缩，减小存储体积（典型压缩比 5-10 倍）
#   3. Redis RDB 备份（BGSAVE 后复制 dump.rdb，P3-D.3 新增）
#   4. 滚动保留：同时按「窗口天数」与「最少份数」两条规则清理（S4-3 重写，见下）
#   5. 可选 AES-256 加密（S4-3 新增：请求加密但缺密钥即硬失败，绝不落明文）
#   6. binlog 归档（S4-3 新增：使按时间点恢复 PITR 成为可能）
#   7. 支持 --dry-run 测试模式（打印将要执行的全部动作，不实际执行）
#   8. 备份结果日志输出到 stdout（cron 重定向到 /backup/cron.log）
#
# 使用方式：
#   1. 直接执行：./scripts/backup-mysql.sh
#   2. dry-run 测试：./scripts/backup-mysql.sh --dry-run
#   3. 定时执行：通过 docker-compose 中 backup 服务 + crontab 自动调度
#
# 保留策略（唯一真相源——不要再在别处写死数字）：
#   BACKUP_RETENTION_DAYS  窗口（天）：修改时间早于该天数的产物才可被清理
#   BACKUP_KEEP_COUNT      每类产物至少保留的份数（下限，防止把最近的备份也删光）
#   docker-compose 侧只透传这两个变量、不再自带 `:-7` 默认值，避免两处 magic number。
#   清理覆盖所有落盘产物类型：.sql.gz / .sql.gz.enc / .rdb / .rdb.enc / binlog 归档，
#   否则加密或 binlog 引入后新产物会「永不轮转」。
#   ⚠️ 异地副本不在本脚本管辖：本脚本只清理 BACKUP_DIR（宿主 ./backups）。若你额外
#   用 rclone/aws s3 sync 把 ./backups 同步到对象存储，异地目标的保留必须另行配置
#   （rclone 侧的 --max-age / 生命周期规则），本脚本无法（也不应）代为过期远端副本。
#
# PITR（point-in-time recovery）：
#   - compose 的 mysql 服务已开 binlog（--log-bin=mysql-bin，见 docker-compose.yml），
#     本脚本把归档时刻仍存在的 mysql-bin.*（gzip，必要时再加密）复制到
#     BACKUP_DIR/binlogs 下；mysqldump 用 --master-data=2 在备份头记录快照对应的
#     binlog 坐标（FILE/POS）。恢复时：先灌全量 .sql[.gz][.enc] 回到快照点，
#     再用 mysqlbinlog 从该坐标重放归档 binlog 到目标时间戳。
#   - 若 datadir 里查不到 mysql-bin.*（binlog 未开 / 卷未挂载），本步仅告警、
#     不阻断全量备份；此时 PITR 不可用，需按下述开启：
#       docker-compose mysql command 追加 --log-bin=mysql-bin --binlog-format=ROW
#       --server-id=1（本项目已配），并把 mysql-data 只读挂进 backup（已配），
#       或改走 mysqlbinlog --read-from-remote-server（不挂卷、需 REPLICATION 权限）。
#   - 更工程化的替代：percona-xtrabackup（热备 + 内建 binlog 坐标），本仓未引入，留作演进项。
#
# 环境变量：
#   MYSQL_HOST          — MySQL 主机（默认 mysql）
#   MYSQL_PORT          — MySQL 端口（默认 3306）
#   MYSQL_USER          — 备份用户（默认 root；--master-data/PITR 需 RELOAD 或
#                         REPLICATION CLIENT 权限，非 root 用户若无此权限请把
#                         BACKUP_BINLOG_ARCHIVE=false 关闭 PITR，否则 mysqldump 会失败）
#   MYSQL_PASSWORD      — 备份用户密码
#   MYSQL_DATABASE      — 备份数据库名
#   REDIS_HOST          — Redis 主机（留空则跳过 Redis 备份，P3-D.3）
#   REDIS_PORT          — Redis 端口（默认 6379）
#   REDIS_PASSWORD      — Redis 密码（与 redis 服务 requirepass 一致）
#   REDIS_RDB_PATH      — Redis dump.rdb 路径（默认 /data/redis/dump.rdb，需挂载 redis-data 卷）
#   BACKUP_DIR          — 备份存储目录（默认 /backups，与 compose 注入对齐）
#   BACKUP_RETENTION_DAYS   — 保留窗口天数（默认 7）
#   BACKUP_KEEP_COUNT       — 每类产物最少保留份数（默认 7）
#   BACKUP_COMPRESS_LEVEL   — gzip 压缩级别 1-9（默认 6）
#   BACKUP_ENCRYPT          — 是否加密（默认 false；true/1/yes/on 请求加密）
#   BACKUP_ENCRYPTION_KEY   — 加密密钥（无默认值）。BACKUP_ENCRYPT 为真时若未设置 → 硬失败。
#                             绝不写入任何密钥值到本脚本/仓库；仅在部署机 .env / 密钥管理注入。
#   BACKUP_BINLOG_ARCHIVE   — 是否归档 binlog 以支撑 PITR（默认 true）
#   MYSQL_BINLOG_DIR        — binlog 源目录（默认 /var/lib/mysql，需只读挂载 mysql-data 卷）
#
# 退出码：
#   0 - 成功
#   1 - 参数错误 / 环境变量缺失（含：请求加密但 BACKUP_ENCRYPTION_KEY 未设置）
#   2 - mysqldump 失败
#   3 - 压缩/加密/校验失败 / Redis 备份失败
#   4 - 清理失败
# ============================================================

set -euo pipefail

# infra R2-00383：cron 环境 PATH 保障——cron 默认 PATH 不含 /usr/local/bin 等，
# 直跑/容器内均可能找不到 mysqldump/redis-cli/gzip，这里显式设置最小 PATH。
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH}"

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
# infra R2-00384：默认备份目录与 docker-compose 注入的 /backups 对齐
#（原默认 /backup，直跑脚本与容器行为不一致）
BACKUP_DIR="${BACKUP_DIR:-/backups}"
# ---------- 保留策略：窗口 + 最少份数，二者只在上面这一处定义 ----------
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_KEEP_COUNT="${BACKUP_KEEP_COUNT:-7}"
BACKUP_COMPRESS_LEVEL="${BACKUP_COMPRESS_LEVEL:-6}"
# ---------- 加密开关（S4-3）：BACKUP_ENCRYPT 为真时密钥必填、缺失即硬失败 ----------
BACKUP_ENCRYPT="${BACKUP_ENCRYPT:-false}"
# 注意：BACKUP_ENCRYPTION_KEY 刻意【不给任何默认值】，也不在此读取 :?（否则
# 未开启加密的用户也会被误阻塞）。它的强制校验放在下面的「检查加密前置条件」段，
# 仅在确实请求加密时执行——密钥缺失即在写任何文件之前退出。
# ---------- binlog 归档 / PITR（S4-3）----------
BACKUP_BINLOG_ARCHIVE="${BACKUP_BINLOG_ARCHIVE:-true}"
MYSQL_BINLOG_DIR="${MYSQL_BINLOG_DIR:-/var/lib/mysql}"

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
            echo "  --dry-run  Test mode: print all planned actions without executing"
            echo "  --help     Show this help"
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

# ---------- 归一化加密开关（大小写/布尔串都接受）----------
ENCRYPT_ON=0
case "$(printf '%s' "${BACKUP_ENCRYPT}" | tr '[:upper:]' '[:lower:]')" in
    true|1|yes|on) ENCRYPT_ON=1 ;;
    *) ENCRYPT_ON=0 ;;
esac

# ---------- 初始化 ----------
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DATE=$(date +"%Y-%m-%d")
# 目标文件名随加密开关变化：加密则直接落 .sql.gz.enc（全程不生成明文 .sql.gz）
if [[ ${ENCRYPT_ON} -eq 1 ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${TIMESTAMP}.sql.gz.enc"
else
    BACKUP_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${TIMESTAMP}.sql.gz"
fi

# 日志带时间戳
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "===== MySQL Backup Start ====="
log "Host: ${MYSQL_HOST}:${MYSQL_PORT}"
log "Database: ${MYSQL_DATABASE}"
log "User: ${MYSQL_USER}"
log "Output: ${BACKUP_FILE}"
log "Retention window: ${BACKUP_RETENTION_DAYS} days; keep at least ${BACKUP_KEEP_COUNT} per family"
log "Compress level: ${BACKUP_COMPRESS_LEVEL}"
log "Encryption: ${ENCRYPT_ON} (requested via BACKUP_ENCRYPT=${BACKUP_ENCRYPT})"
log "Binlog archive (PITR): ${BACKUP_BINLOG_ARCHIVE} (source ${MYSQL_BINLOG_DIR})"
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

# ---------- 加密前置校验（必须在任何写盘之前——S4-3 要杜绝的失败模式：
# 运维请求了加密，脚本却静默落了明文。缺密钥就在生成任何备份文件之前硬失败退出）----------
if [[ ${ENCRYPT_ON} -eq 1 ]]; then
    if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        log "ERROR: BACKUP_ENCRYPT=${BACKUP_ENCRYPT} 要求加密，但 BACKUP_ENCRYPTION_KEY 未设置。"
        log "       拒绝运行——绝不写入未加密备份。请在部署机 .env / 密钥管理里注入密钥后重试"
        log "       （切勿把密钥值写进本脚本或 docker-compose.yml，也不要提交入库）。"
        exit 1
    fi
    if ! command -v openssl >/dev/null 2>&1; then
        log "ERROR: 请求了加密但 openssl 不在 PATH（backup 镜像需 apk add openssl）。"
        exit 1
    fi
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

# ---------- 加密辅助函数 ----------
# 把 stdin 用 AES-256-CBC + PBKDF2 加密写入 $1（密钥经 env: 传入，不进进程参数）。
encrypt_stdin_to() {
    openssl enc -aes-256-cbc -md sha256 -pbkdf2 -salt -pass env:BACKUP_ENCRYPTION_KEY -out "$1"
}
# 校验密文可解密且解出的 gzip 完整（不解明文到磁盘：解密直接喂给 gzip -t 的 stdin）。
verify_encrypted_gz() {
    openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "$1" 2>/dev/null \
        | gzip -t 2>/dev/null
}

# ---------- 执行备份 ----------
# mysqldump 参数说明：
#   --single-transaction: InnoDB 一致性快照，不锁表（业务可继续读写）
#   --quick: 大表分批读取，避免 OOM
#   --routines: 包含存储过程/函数（需 mysql.proc 的 SELECT 权限，见 infra R2-00385）
#   --triggers: 包含触发器
#   --events: 包含事件调度
#   --set-gtid-purged=OFF: 不写 GTID 信息（兼容性更好）
#   --hex-blob: BLOB 字段以十六进制导出，避免二进制乱码
# infra R2-00386：密码改用 MYSQL_PWD 环境变量传递（原 --password 明文进进程参数，
# 同机其他进程可读 /proc/<pid>/cmdline 泄露密码）
export MYSQL_PWD="${MYSQL_PASSWORD}"
mysqldump_args=(
    --host="${MYSQL_HOST}"
    --port="${MYSQL_PORT}"
    --user="${MYSQL_USER}"
    --single-transaction
    --quick
    --routines
    --triggers
    --events
    --set-gtid-purged=OFF
    --hex-blob
    --default-character-set=utf8mb4
)
# PITR：开启 binlog 归档时让 mysqldump 记录快照对应的 binlog 坐标。
# MySQL 8.0.26+ 推荐 --source-data=2；--master-data 为其历史别名（8.0.39 仍可用、
# 8.4 起移除）。需 RELOAD 或 REPLICATION CLIENT 权限，且服务器已开 binlog。
if [[ "${BACKUP_BINLOG_ARCHIVE}" == "true" ]]; then
    mysqldump_args+=( --master-data=2 )
fi
mysqldump_args+=( "${MYSQL_DATABASE}" )

# ---------- dry-run：打印全部计划动作后退出（覆盖 dump/加密/redis/binlog/保留）----------
if [[ ${DRY_RUN} -eq 1 ]]; then
    if [[ ${ENCRYPT_ON} -eq 1 ]]; then
        log "[DRY-RUN] mysqldump ${mysqldump_args[*]} | gzip -${BACKUP_COMPRESS_LEVEL} | openssl enc(AES-256) > ${BACKUP_FILE}"
    else
        log "[DRY-RUN] mysqldump ${mysqldump_args[*]} | gzip -${BACKUP_COMPRESS_LEVEL} > ${BACKUP_FILE}"
    fi
    if [[ -n "${REDIS_HOST}" ]]; then
        if [[ ${ENCRYPT_ON} -eq 1 ]]; then
            log "[DRY-RUN] redis-cli BGSAVE && openssl enc(AES-256) ${REDIS_RDB_PATH} > ${BACKUP_DIR}/redis-${TIMESTAMP}.rdb.enc"
        else
            log "[DRY-RUN] redis-cli BGSAVE && cp ${REDIS_RDB_PATH} ${BACKUP_DIR}/redis-${TIMESTAMP}.rdb"
        fi
    fi
    if [[ "${BACKUP_BINLOG_ARCHIVE}" == "true" ]]; then
        log "[DRY-RUN] gzip ${MYSQL_BINLOG_DIR}/mysql-bin.[0-9]* (retention 窗口内) -> ${BACKUP_DIR}/binlogs/[.gz$([[ ${ENCRYPT_ON} -eq 1 ]] && echo '.enc')]"
    fi
    log "[DRY-RUN] retention prune: families (*.sql.gz/.enc, *.rdb/.enc, mysql-bin.*.gz/.enc)"
    log "[DRY-RUN]   删除 mtime +${BACKUP_RETENTION_DAYS} 天、且每类超出 keep ${BACKUP_KEEP_COUNT} 的产物"
    log "===== Dry-run complete ====="
    exit 0
fi

log "Running mysqldump..."
# infra #21：在 if 条件中执行管道（避免 set -e 直接终止），
# 并用 PIPESTATUS 显式区分 mysqldump 与 gzip（以及 openssl）的退出码——
# 仅靠 if ! pipeline 的布尔判定可能因末段成功而掩盖 mysqldump 失败。
# 全程流式：mysqldump | gzip | [openssl] > .part，成功后再原子重命名——
# 加密路径下明文永不落盘（只经过管道），未加密路径同理避免半成品被误当备份。
DUMP_PART="${BACKUP_FILE}.part"
if [[ ${ENCRYPT_ON} -eq 1 ]]; then
    if ! { mysqldump "${mysqldump_args[@]}" 2>/tmp/mysqldump-err.log | gzip -"${BACKUP_COMPRESS_LEVEL}" | encrypt_stdin_to "${DUMP_PART}"; }; then
        DUMP_STATUS=("${PIPESTATUS[@]}")
        if [[ "${DUMP_STATUS[0]}" -ne 0 ]]; then
            log "ERROR: mysqldump failed (exit ${DUMP_STATUS[0]}).（PITR 开启时 mysqldump 需 RELOAD/REPLICATION CLIENT 权限与已开 binlog；如备份用户无此权限，设 BACKUP_BINLOG_ARCHIVE=false）"
            cat /tmp/mysqldump-err.log >&2 || true
        elif [[ "${DUMP_STATUS[1]}" -ne 0 ]]; then
            log "ERROR: gzip failed (exit ${DUMP_STATUS[1]})."
        else
            log "ERROR: openssl encryption failed (exit ${DUMP_STATUS[2]})."
        fi
        rm -f "${DUMP_PART}"
        exit 2
    fi
    # 校验密文可解密且内层 gzip 完整，再原子落定
    if ! verify_encrypted_gz "${DUMP_PART}"; then
        log "ERROR: encrypted gzip integrity check failed for ${DUMP_PART}"
        rm -f "${DUMP_PART}"
        exit 3
    fi
else
    if ! { mysqldump "${mysqldump_args[@]}" 2>/tmp/mysqldump-err.log | gzip -"${BACKUP_COMPRESS_LEVEL}" > "${DUMP_PART}"; }; then
        DUMP_STATUS=("${PIPESTATUS[@]}")
        if [[ "${DUMP_STATUS[0]}" -ne 0 ]]; then
            log "ERROR: mysqldump failed (exit ${DUMP_STATUS[0]})."
            cat /tmp/mysqldump-err.log >&2 || true
        else
            log "ERROR: gzip compression failed (exit ${DUMP_STATUS[1]})."
        fi
        rm -f "${DUMP_PART}"
        exit 2
    fi
    if [[ ! -s "${DUMP_PART}" ]]; then
        log "ERROR: Backup file is empty: ${DUMP_PART}"
        rm -f "${DUMP_PART}"
        exit 3
    fi
    if ! gzip -t "${DUMP_PART}" 2>/dev/null; then
        log "ERROR: gzip integrity check failed for ${DUMP_PART}"
        rm -f "${DUMP_PART}"
        exit 3
    fi
fi
mv "${DUMP_PART}" "${BACKUP_FILE}"

BACKUP_SIZE=$(stat -c %s "${BACKUP_FILE}" 2>/dev/null || stat -f %z "${BACKUP_FILE}")
BACKUP_SIZE_HUMAN=$(echo "scale=2; ${BACKUP_SIZE} / 1024 / 1024" | bc 2>/dev/null || echo "${BACKUP_SIZE} bytes")
if [[ ${ENCRYPT_ON} -eq 1 ]]; then
    log "Backup completed (encrypted): ${BACKUP_FILE} (${BACKUP_SIZE_HUMAN} MB)"
    log "Encrypted gzip integrity check passed."
else
    log "Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE_HUMAN} MB)"
    log "Gzip integrity check passed."
fi

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

    if [[ ${ENCRYPT_ON} -eq 1 ]]; then
        REDIS_BACKUP_FILE="${BACKUP_DIR}/redis-${TIMESTAMP}.rdb.enc"
    else
        REDIS_BACKUP_FILE="${BACKUP_DIR}/redis-${TIMESTAMP}.rdb"
    fi

    # 构造 redis-cli 参数（带密码时通过 REDISCLI_AUTH 环境变量传递，不进进程参数）
    # infra R2-00387
    redis_cli_args=(--host "${REDIS_HOST}" --port "${REDIS_PORT}" --no-auth-warning)
    if [[ -n "${REDIS_PASSWORD}" ]]; then
        export REDISCLI_AUTH="${REDIS_PASSWORD}"
    fi

    # 触发后台 RDB 持久化（非阻塞）
    log "Triggering Redis BGSAVE..."
    if ! redis-cli "${redis_cli_args[@]}" BGSAVE >/dev/null 2>&1; then
        log "ERROR: redis-cli BGSAVE failed (Redis 不可达或鉴权失败)"
        exit 3
    fi

    # 轮询等待 BGSAVE 完成（最多 60 秒）
    log "Waiting for BGSAVE to complete (max 60s)..."
    WAIT_SEC=0
    BGSAVE_DONE=0
    while [[ ${WAIT_SEC} -lt 60 ]]; do
        LAST_SAVE=$(redis-cli "${redis_cli_args[@]}" LASTSAVE 2>/dev/null || echo "0")
        NOW_TS=$(date +%s)
        # LASTSAVE 返回 Unix 时间戳；若距当前时间 < 5s 视为刚完成
        if [[ $((NOW_TS - LAST_SAVE)) -lt 5 ]]; then
            BGSAVE_DONE=1
            break
        fi
        sleep 2
        WAIT_SEC=$((WAIT_SEC + 2))
    done

    # infra R2-00388：超时后检测失败——原实现超时仍继续复制 RDB，
    # 可能复制到未完成/旧 RDB 静默产生坏备份；超时未完成直接失败退出
    if [[ ${BGSAVE_DONE} -ne 1 ]]; then
        log "ERROR: Redis BGSAVE did not complete within 60s, aborting Redis backup to avoid copying stale RDB."
        exit 3
    fi

    if [[ ! -f "${REDIS_RDB_PATH}" ]]; then
        log "ERROR: Redis RDB file not found at ${REDIS_RDB_PATH} (需将 redis-data 卷挂载到容器)"
        exit 3
    fi

    if [[ ${ENCRYPT_ON} -eq 1 ]]; then
        # 直接从源 RDB 流式加密，明文 .rdb 副本不落盘
        REDIS_PART="${REDIS_BACKUP_FILE}.part"
        if ! openssl enc -aes-256-cbc -md sha256 -pbkdf2 -salt \
                -pass env:BACKUP_ENCRYPTION_KEY \
                -in "${REDIS_RDB_PATH}" -out "${REDIS_PART}"; then
            log "ERROR: Redis RDB encryption failed"
            rm -f "${REDIS_PART}"
            exit 3
        fi
        mv "${REDIS_PART}" "${REDIS_BACKUP_FILE}"
        REDIS_BACKUP_SIZE=$(stat -c %s "${REDIS_BACKUP_FILE}" 2>/dev/null || stat -f %z "${REDIS_BACKUP_FILE}")
        log "Redis backup completed (encrypted): ${REDIS_BACKUP_FILE} (${REDIS_BACKUP_SIZE} bytes)"
    else
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

# ---------- binlog 归档（S4-3：让 PITR 成为可能，非致命步骤）----------
# 复制归档时刻仍存在的 mysql-bin.<n>（跳过 .index）到 BACKUP_DIR/binlogs，gzip（必要
# 时再加密）。恢复时按全量备份头部的 CHANGE MASTER 坐标，用 mysqlbinlog 重放这里的归档。
# binlog 源不可用（未开/未挂载）只告警不中断全量备份。
if [[ "${BACKUP_BINLOG_ARCHIVE}" == "true" ]]; then
    log "===== Binlog Archive (PITR) Start ====="
    shopt -s nullglob
    BINLOG_FILES=( "${MYSQL_BINLOG_DIR}"/mysql-bin.[0-9]* )
    shopt -u nullglob
    if [[ ${#BINLOG_FILES[@]} -gt 0 ]]; then
        BINLOG_OUT_DIR="${BACKUP_DIR}/binlogs"
        if [[ ! -d "${BINLOG_OUT_DIR}" ]]; then
            mkdir -p "${BINLOG_OUT_DIR}"
            log "Created binlog archive directory: ${BINLOG_OUT_DIR}"
        fi
        ARCHIVED=0
        for src in "${BINLOG_FILES[@]}"; do
            base=$(basename "${src}")
            # 只归档已完成/当前的 mysql-bin.数字；显式跳过 .index 等非数据文件
            [[ "${base}" == *.index ]] && continue
            if [[ ${ENCRYPT_ON} -eq 1 ]]; then
                dest="${BINLOG_OUT_DIR}/${base}.gz.enc"
            else
                dest="${BINLOG_OUT_DIR}/${base}.gz"
            fi
            # 幂等：已归档则跳过（每次跑不重复堆叠同一 binlog；活动文件下次轮转后覆盖）
            if [[ -f "${dest}" ]]; then
                log "Binlog already archived: ${dest} (skip)"
                continue
            fi
            part="${dest}.part"
            if [[ ${ENCRYPT_ON} -eq 1 ]]; then
                if ! { gzip -c -"${BACKUP_COMPRESS_LEVEL}" "${src}" | encrypt_stdin_to "${part}"; }; then
                    log "WARN: binlog archive failed for ${src} (gzip/openssl), skipping"
                    rm -f "${part}"
                    continue
                fi
                if ! openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "${part}" 2>/dev/null | gzip -t 2>/dev/null; then
                    log "WARN: binlog archive integrity check failed for ${src}, skipping"
                    rm -f "${part}"
                    continue
                fi
            else
                if ! gzip -c -"${BACKUP_COMPRESS_LEVEL}" "${src}" > "${part}"; then
                    log "WARN: binlog gzip failed for ${src}, skipping"
                    rm -f "${part}"
                    continue
                fi
            fi
            mv "${part}" "${dest}"
            ARCHIVED=$((ARCHIVED + 1))
        done
        log "Archived ${ARCHIVED} binlog file(s) into ${BINLOG_OUT_DIR}"
    else
        log "WARN: 未在 ${MYSQL_BINLOG_DIR} 找到 mysql-bin.* —— binlog 可能未开启或 mysql-data 卷未只读挂载。"
        log "WARN: 本次仅完成全量备份，PITR 不可用（详见脚本头部与 doc/RUNBOOKS.md#备份与恢复 的开启方法）。"
    fi
    log "===== Binlog Archive Complete ====="
else
    log "BACKUP_BINLOG_ARCHIVE=${BACKUP_BINLOG_ARCHIVE}, skipping binlog archive (PITR unavailable)."
fi

# ---------- 清理过期备份（窗口 + 最少份数，一处定义）----------
log "Applying retention (window ${BACKUP_RETENTION_DAYS}d, keep >= ${BACKUP_KEEP_COUNT} per family)..."
CLEANED_COUNT=0

prune_family() {
    # $1=家族标签；其余为 find -name 模式（该家族所有落盘形态都要传入，
    # 否则新产物——如 .enc / binlog 归档——永不轮转）。
    local label="$1"; shift
    local -a name_expr=()
    local pat
    for pat in "$@"; do
        if [[ ${#name_expr[@]} -gt 0 ]]; then
            name_expr+=( -o )
        fi
        name_expr+=( -name "${pat}" )
    done

    # 当前总数（用于「至少保留 N 份」的下限）
    local total
    total=$(find "${BACKUP_DIR}" -type f \( "${name_expr[@]}" \) -print 2>/dev/null | wc -l | tr -d ' ')

    # 过期候选：修改时间早于窗口
    local -a expired=()
    local f
    while IFS= read -r -d '' f; do
        expired+=( "${f}" )
    done < <(find "${BACKUP_DIR}" -type f \( "${name_expr[@]}" \) -mtime "+${BACKUP_RETENTION_DAYS}" -print0 2>/dev/null)

    # 允许删除数 = 总数 - 下限；再封顶到过期数
    local allowed=$(( total - BACKUP_KEEP_COUNT ))
    if [[ "${allowed}" -lt 0 ]]; then allowed=0; fi
    if [[ "${allowed}" -gt "${#expired[@]}" ]]; then allowed="${#expired[@]}"; fi

    local del=0
    for f in "${expired[@]}"; do
        if [[ "${del}" -ge "${allowed}" ]]; then break; fi
        # 删除前校验明文 gzip 完整性：坏备份在过期前不应被静默删除
        case "${f}" in
            *.sql.gz)
                if ! gzip -t "${f}" 2>/dev/null; then
                    log "ERROR: integrity check failed for ${f}, keeping (please investigate)."
                    continue
                fi
                ;;
        esac
        log "Removing expired ${label}: ${f}"
        rm -f "${f}"
        del=$(( del + 1 ))
    done
    CLEANED_COUNT=$(( CLEANED_COUNT + del ))
}

# MySQL 全量（未加密 .sql.gz / 加密 .sql.gz.enc 都要清）
prune_family "mysql dump" '*.sql.gz' '*.sql.gz.enc'
# Redis（未加密 .rdb / 加密 .rdb.enc）
prune_family "redis rdb" '*.rdb' '*.rdb.enc'
# binlog 归档（未加密 .gz / 加密 .gz.enc）
prune_family "binlog" 'mysql-bin.*.gz' 'mysql-bin.*.gz.enc'

log "Cleaned ${CLEANED_COUNT} expired backup(s)."

# ---------- 列出当前备份 ----------
log "Current backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/*.sql.gz "${BACKUP_DIR}"/*.sql.gz.enc "${BACKUP_DIR}"/*.rdb "${BACKUP_DIR}"/*.rdb.enc \
       "${BACKUP_DIR}"/binlogs/mysql-bin.*.gz "${BACKUP_DIR}"/binlogs/mysql-bin.*.gz.enc \
       2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || log "  (none)"

# ---------- 备份校验摘要 ----------
BACKUP_COUNT_SQL=$(find "${BACKUP_DIR}" -type f \( -name '*.sql.gz' -o -name '*.sql.gz.enc' \) 2>/dev/null | wc -l | tr -d ' ')
BACKUP_COUNT_RDB=$(find "${BACKUP_DIR}" -type f \( -name '*.rdb' -o -name '*.rdb.enc' \) 2>/dev/null | wc -l | tr -d ' ')
BACKUP_COUNT_BINLOG=$(find "${BACKUP_DIR}" -type f -name 'mysql-bin.*.gz*' 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "Total backups: ${BACKUP_COUNT_SQL} SQL + ${BACKUP_COUNT_RDB} RDB + ${BACKUP_COUNT_BINLOG} binlog, ${TOTAL_SIZE}"
if [[ ${ENCRYPT_ON} -eq 1 ]]; then
    log "Backups are AES-256 encrypted. To inspect/restore, decrypt with:"
    log "  openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in <file>.enc"
fi

log "===== Backup Complete ====="
exit 0
