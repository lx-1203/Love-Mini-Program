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
#   BACKUP_MYSQLDUMP_BIN    — 指定 mysqldump 可执行文件（默认 PATH 上的 mysqldump）
#   BACKUP_MYSQLBINLOG_BIN  — 指定 mysqlbinlog 可执行文件（默认 PATH 上的 mysqlbinlog）
#   BACKUP_ALLOW_MARIADB_DUMP — 默认 false：探测到 MariaDB 血统的 mysqldump 即硬失败。
#                               设为 true 才允许在 MariaDB 客户端下继续（能力探测后
#                               自动绕开不支持的开关，并放弃 mysqlbinlog 层的归档校验）。
#   BACKUP_ALERT_URL        — 备份失败时直发的告警入口（如 http://alertmanager:9093/api/v2/alerts）
#   BACKUP_TEXTFILE_DIR     — node-exporter textfile collector 目录（默认 /mnt/node-textfile）
#
# ⚠️ mysqldump 血统问题（2026-10-31 复审，本脚本现在的第 0 步就是查这个）：
#   docker-compose 的 backup 服务是 alpine:3.19.4 + `apk add mysql-client~10.11`，
#   而该包名与 compose 自己的注释都说明它是 **MariaDB 血统**（Alpine 仓库不提供
#   Oracle MySQL 客户端）。MariaDB 的 mysqldump：
#     · 不认识 `--set-gtid-purged`（原脚本无条件带它 ⇒ 第 2 步直接非零退出）；
#     · 其 mysqlbinlog 解析不了 MySQL 8 的 binlog 事件（checksum/事件类型不同）。
#   而服务端是 mysql:8.0.39。原脚本对这一切毫无察觉，失败信息只落 /backup/cron.log
#   ⇒ "每次 cron 备份都死在第 2 步、而没人知道"是完全可能的。现在：
#     1) 探测 mysqldump/mysqlbinlog 血统与开关支持度（各一次，全部写进日志）；
#     2) MySQL 血统：优先 `--source-data=2`（8.0.26+，8.4 起 --master-data 移除），
#        回退 `--master-data=2`，`--set-gtid-purged=OFF` 仅在支持时带上；
#     3) MariaDB 血统：默认 exit 1 并点名 BACKUP_ALLOW_MARIADB_DUMP / 镜像换法；
#        显式允许时绕开不支持的开关 + 明确声明"归档未经 MySQL binlog 解析校验"。
#   本机无 Docker 引擎，上述分支只做了静态推演，未在容器里实测（见 UNPROVEN）。
#
# ⚠️ PITR 归档的"静默空洞"修复（2026-10-31）：
#   原实现 `if [[ -f dest ]]; then skip; fi` 会让一次撕裂的 .gz 归档**永远不被重试**，
#   又直接复制**仍在写入的 active binlog**（撕裂几乎是必然），而校验只证明"能解密、
#   gzip 不报错"，从不证明它是 MySQL 认可的 binlog，更从不比对 dump 记录的坐标是否
#   落在归档区间内。现在按这个顺序做：
#     dump（带 --source-data/--master-data，拿到 FILE/POS）
#     → FLUSH BINARY LOGS（把当时 active 的那个文件封成完整文件）
#     → 只归档"已完整"的文件（active 那个明确跳过并记名）
#     → 逐个校验：gzip -t / 解密 + mysqlbinlog --verify-binlog-checksum（支持时）
#       + 归档解出来的字节数必须等于源文件字节数（撕裂判据）
#     → 已存在的旧归档不再无脑跳过：先校验，校验不过就重归档
#     → 打印覆盖算式（PITR-COVERAGE 行）并写 <artifact>.manifest；
#       dump 坐标所在文件缺失、或区间内有编号缺口 ⇒ 本次备份判为失败（exit 3），
#       绝不把"有洞的归档"报成好备份。
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
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"   # 必填校验挪到 EXIT trap 之后（见「检查必填项」）
MYSQL_DATABASE="${MYSQL_DATABASE:-}"   #   ——原来写在这里的 ${VAR:?} 会让"缺参数而失败"
                                        #   发生在任何上报之前：连 exit 1 都无人知晓。
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
# ---------- 工具血统 / 失败可见性（2026-10-31）----------
BACKUP_MYSQLDUMP_BIN="${BACKUP_MYSQLDUMP_BIN:-mysqldump}"
BACKUP_MYSQLBINLOG_BIN="${BACKUP_MYSQLBINLOG_BIN:-mysqlbinlog}"
BACKUP_ALLOW_MARIADB_DUMP="${BACKUP_ALLOW_MARIADB_DUMP:-false}"
BACKUP_ALERT_URL="${BACKUP_ALERT_URL:-}"
BACKUP_TEXTFILE_DIR="${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}"
LAST_SUCCESS_STATE="${BACKUP_DIR}/.last_success"
# 先置 0：下面的 EXIT trap 可能在参数解析完成之前就被触发（未知参数 / set -e）。
DRY_RUN=0
# 计划性阻断（dry-run 下把"正式运行会失败"打出来但不中止；结束时据此返回非 0）
PLAN_BLOCKED=0

# ---------- 日志带时间戳 ----------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ---------- 失败可见性（2026-10-31）：脚本退出时把结果推到能被看见的地方 ----------
# 原先只有 stdout（cron 重定向进 /backup/cron.log）。没人盯日志 = 备份从没失败过一样安静。
# 两条出路都可选，都不配时**每次**都会打一条 LOUD WARN，让人至少能在日志里看到"这是哑的"：
#   BACKUP_TEXTFILE_DIR → node-exporter textfile collector（指标名 node_backup_*，
#     抓取 2026-11-01 起随默认栈常开；缺的前置是本 backup 服务自己得起，见
#     alert-rules.yml 里 BackupNeverCompleted 的 REQUIRES-PROFILE=backup 声明）
#   BACKUP_ALERT_URL    → 直接 POST Alertmanager v2 API（不依赖抓取链路）
STATUS_HAS_SINK=0
write_textfile_metric() {
    # $1=本次退出码
    local exit_code="$1" last_success now
    [[ -n "${BACKUP_TEXTFILE_DIR}" ]] || return 0
    [[ -d "${BACKUP_TEXTFILE_DIR}" && -w "${BACKUP_TEXTFILE_DIR}" ]] || return 0
    last_success=$(cat "${LAST_SUCCESS_STATE}" 2>/dev/null || echo 0)
    [[ "${exit_code}" == "0" ]] && { now=$(date +%s); printf '%s\n' "${now}" > "${LAST_SUCCESS_STATE}" 2>/dev/null || true; last_success=$(cat "${LAST_SUCCESS_STATE}" 2>/dev/null || echo 0); }
    local out="${BACKUP_TEXTFILE_DIR}/backup.prom"
    {
        echo "# HELP node_backup_last_success_timestamp_seconds Epoch seconds of the last successful backup run."
        echo "# TYPE node_backup_last_success_timestamp_seconds gauge"
        echo "node_backup_last_success_timestamp_seconds ${last_success:-0}"
        echo "# HELP node_backup_last_exit_code Exit code of the most recent backup run (0 = success)."
        echo "# TYPE node_backup_last_exit_code gauge"
        echo "node_backup_last_exit_code ${exit_code}"
    } > "${out}.tmp" 2>/dev/null && mv "${out}.tmp" "${out}" 2>/dev/null && STATUS_HAS_SINK=1
}
post_alert() {
    # $1=本次退出码；只在非 0 时发。用 curl（有则用），否则探测 busybox wget 是否支持 --post-data。
    local exit_code="$1" payload
    [[ "${exit_code}" != "0" ]] || return 0
    [[ -n "${BACKUP_ALERT_URL}" ]] || return 0
    payload="[{\"labels\":{\"alertname\":\"BackupRunFailed\",\"severity\":\"critical\",\"service\":\"backup\",\"job\":\"backup-mysql.sh\"},\"annotations\":{\"summary\":\"mysqldump 备份脚本退出码 ${exit_code}\",\"description\":\"host=$(hostname) db=${MYSQL_DATABASE} file=${BACKUP_FILE:-n/a} at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}}]"
    if command -v curl >/dev/null 2>&1; then
        curl -fsS --max-time 10 -X POST -H 'Content-Type: application/json' \
            --data "${payload}" "${BACKUP_ALERT_URL}" >/dev/null 2>&1 && STATUS_HAS_SINK=1
    elif wget --help 2>&1 | grep -qi 'post-data' && command -v wget >/dev/null 2>&1; then
        wget -q -O /dev/null --timeout=10 --post-data="${payload}" --header='Content-Type: application/json' \
            "${BACKUP_ALERT_URL}" 2>/dev/null && STATUS_HAS_SINK=1
    fi
}
report_and_exit() {
    local code="${1:-0}"
    if [[ ${DRY_RUN:-0} -eq 1 ]]; then exit "${code}"; fi
    write_textfile_metric "${code}" || true
    post_alert "${code}" || true
    if [[ ${code} -ne 0 ]]; then
        log "BACKUP-STATUS=FAIL exit=${code}"
        if [[ "${STATUS_HAS_SINK}" -eq 0 ]]; then
            log "LOUDD WARN: 本次失败【没有任何可达的信号渠道】——BACKUP_ALERT_URL 未设置、"
            log "LOUDD WARN: BACKUP_TEXTFILE_DIR(${BACKUP_TEXTFILE_DIR}) 不存在或不可写。"
            log "LOUDD WARN: 这条信息只会出现在 cron.log / docker compose logs backup 里。"
            log "LOUDD WARN: 修一个即可开始被看见：BACKUP_ALERT_URL=http://alertmanager:9093/api/v2/alerts"
            log "LOUDD WARN:   或把 BACKUP_TEXTFILE_DIR 指到 node-exporter 也挂载的目录（默认 /mnt/node-textfile；抓取已常开，指标一落就会被采）。"
        fi
    else
        log "BACKUP-STATUS=OK exit=0 signal_sink=${STATUS_HAS_SINK}"
        if [[ "${STATUS_HAS_SINK}" -eq 0 ]]; then
            log "WARN: 备份成功，但'失败会不会被看见'仍未解决（BACKUP_ALERT_URL / BACKUP_TEXTFILE_DIR 都没生效）。"
        fi
    fi
    exit "${code}"
}
# 任何退出路径（含 set -e 触发的意外退出）都要经过上面这套——否则失败就是静默的。
trap 'rc=$?; report_and_exit "${rc}"' EXIT

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
# 必填项校验挪到这里：这里已经在 EXIT trap 之后，失败会走 BACKUP-STATUS=FAIL 上报，
# 而不是像原来的 ${VAR:?} 那样在"任何上报之前"就静默 exit 1。
if [[ -z "${MYSQL_PASSWORD}" ]]; then
    log "ERROR: MYSQL_PASSWORD 未设置（备份用户口令，compose 侧由 MYSQL_ROOT_PASSWORD 注入）。拒绝运行。"
    exit 1
fi
if [[ -z "${MYSQL_DATABASE}" ]]; then
    log "ERROR: MYSQL_DATABASE 未设置（要备份哪个库）。拒绝运行——宁可不出备份，也不要出一个名字错的备份。"
    exit 1
fi
if ! command -v "${BACKUP_MYSQLDUMP_BIN}" >/dev/null 2>&1; then
    log "ERROR: mysqldump 不存在（BACKUP_MYSQLDUMP_BIN=${BACKUP_MYSQLDUMP_BIN}）。Please install mysql-client."
    exit 1
fi

if ! command -v gzip >/dev/null 2>&1; then
    log "ERROR: gzip not found in PATH. Please install gzip."
    exit 1
fi

# ---------- mysqldump / mysqlbinlog 血统与开关支持度探测（2026-10-31，全脚本只做一次） ----------
# 注意两个坑（都在本机实测踩过）：
#   · 宿主/镜像里若存在带 [client] 段的 my.cnf（例如 default-character-set=utf8mb4），
#     `mysqlbinlog --version` 会直接 [ERROR] unknown variable 并**非零退出**；
#     在 set -eo pipefail 下 `VAR=$(... | head -1)` 会把这个退出码变成脚本死亡。
#     ⇒ 探测一律先试 --no-defaults、失败再退回裸调用，并且处处 `|| true` 兜住退出码。
#   · 血统判定只是"带子"，真正决定带不带哪个开关的是下面的能力探测（不猜版本号）。
first_line() { # $@ = 命令；取第一行，永远不让非零退出码杀掉脚本
    local out
    out=$("$@" 2>&1 | head -1) || true
    printf '%s' "${out}"
}
probe_version() { # $1=bin → 版本首行（先 --no-defaults，不被 my.cnf 干扰）
    local bin="$1" out
    out=$(first_line "${bin}" --no-defaults --version)
    [[ -n "${out}" && "${out}" != *"[ERROR]"* ]] || out=$(first_line "${bin}" --version)
    printf '%s' "${out}"
}
# 返回 mysql | mariadb | unknown（判据来自 --version 字符串，MariaDB 优先匹配）
probe_flavour() {
    local ver lower
    ver=$(probe_version "$1")
    lower=$(printf '%s' "${ver}" | tr '[:upper:]' '[:lower:]')
    case "${lower}" in
        *mariadb*) echo mariadb ;;
        *mysql*) echo mysql ;;
        *) echo unknown ;;
    esac
}
# mysqldump --help / mysqlbinlog --help 里有没有这个长选项（能力探测，不猜版本号）
# 注意要拿**整份** --help（不是第一行），否则永远匹配不到目标开关。
has_long_flag() {
    local bin="$1" flag="$2" help
    help=$("${bin}" --no-defaults --help 2>&1) || true
    if [[ -z "${help}" || "${help}" == *"[ERROR]"* ]]; then
        help=$("${bin}" --help 2>&1) || true
    fi
    printf '%s' "${help}" | grep -q -- "--${flag}"
}

DUMP_FLAVOUR=$(probe_flavour "${BACKUP_MYSQLDUMP_BIN}")
DUMP_VERSION=$(probe_version "${BACKUP_MYSQLDUMP_BIN}")
log "mysqldump: ${BACKUP_MYSQLDUMP_BIN} → flavour=${DUMP_FLAVOUR} | ${DUMP_VERSION}"
has_long_flag "${BACKUP_MYSQLDUMP_BIN}" "set-gtid-purged" && GTID_PURGED_SUPPORTED=1 || GTID_PURGED_SUPPORTED=0
has_long_flag "${BACKUP_MYSQLDUMP_BIN}" "source-data" && SOURCE_DATA_SUPPORTED=1 || SOURCE_DATA_SUPPORTED=0
has_long_flag "${BACKUP_MYSQLDUMP_BIN}" "master-data" && MASTER_DATA_SUPPORTED=1 || MASTER_DATA_SUPPORTED=0
log "mysqldump 开关支持度: --set-gtid-purged=${GTID_PURGED_SUPPORTED} --source-data=${SOURCE_DATA_SUPPORTED} --master-data=${MASTER_DATA_SUPPORTED}"
if [[ "${DUMP_FLAVOUR}" == "unknown" ]]; then
    log "WARN: mysqldump 血统判不出来（版本串='${DUMP_VERSION}'）⇒ 只按上面的能力探测决定开关。"
fi

if [[ "${DUMP_FLAVOUR}" == "mariadb" ]]; then
    if [[ "${BACKUP_ALLOW_MARIADB_DUMP}" != "true" ]]; then
        log "ERROR: 检测到 MariaDB 血统的 mysqldump（${DUMP_VERSION}），而服务端是 MySQL 8。"
        log "       MariaDB 的 mysqldump 不认识 --set-gtid-purged，mysqlbinlog 也解析不了"
        log "       MySQL 8 的 binlog 事件——原脚本正是无条件带 --set-gtid-purged，"
        log "       结果每次 cron 备份都会在第 2 步非零退出，而且只写在 /backup/cron.log 里。"
        log "       修法（三选一，都在 docker-compose.yml / .env.example 里）："
        log "         1) 把 backup 服务镜像换成与 mysql:8.0.39 同血统的 mysql:8.0.39"
        log "            （自带 mysqldump/mysqlbinlog，需要同时改掉那行 apk add）；"
        log "         2) 挂载 MySQL 8 客户端并指过去：BACKUP_MYSQLDUMP_BIN / BACKUP_MYSQLBINLOG_BIN；"
        log "         3) 明知风险仍要用 MariaDB 客户端导数据：BACKUP_ALLOW_MARIADB_DUMP=true"
        log "            （脚本会绕开不支持的开关，并**放弃** mysqlbinlog 层的归档校验，"
        log "            即 PITR 归档只做到'gzip/解密可读'，不保证是 MySQL 认可的 binlog）。"
        if [[ ${DRY_RUN} -eq 1 ]]; then
            log "[DRY-RUN] PLAN-BLOCKED: 正式运行会在此处 exit 1 中止（不写任何文件）。"
            PLAN_BLOCKED=1
        else
            exit 1
        fi
    fi
    log "WARN: BACKUP_ALLOW_MARIADB_DUMP=true —— 用 MariaDB 客户端导 MySQL 8 库，风险自担："
    log "WARN:   绕开不支持的开关；归档文件的 mysqlbinlog 校验按 mysqlbinlog 血统决定；"
    log "WARN:   恢复出来的 SQL 里可能带 MariaDB 不认识的 utf8mb4_0900_ai_ci 等定义"
    log "WARN:   （回到 MySQL 8 上没问题，但别再拿它去灌 MariaDB 服务器）。"
fi

# mysqlbinlog 血统：只有 MySQL 血统的才配做 binlog 解析/校验
if command -v "${BACKUP_MYSQLBINLOG_BIN}" >/dev/null 2>&1; then
    BINLOG_FLAVOUR=$(probe_flavour "${BACKUP_MYSQLBINLOG_BIN}")
    BINLOG_VERSION=$(probe_version "${BACKUP_MYSQLBINLOG_BIN}")
    has_long_flag "${BACKUP_MYSQLBINLOG_BIN}" "verify-binlog-checksum" && BINLOG_VERIFY_CHECKSUM=1 || BINLOG_VERIFY_CHECKSUM=0
    log "mysqlbinlog: ${BACKUP_MYSQLBINLOG_BIN} → flavour=${BINLOG_FLAVOUR} | ${BINLOG_VERSION} | --verify-binlog-checksum=${BINLOG_VERIFY_CHECKSUM}"
else
    BINLOG_FLAVOUR="absent"
    BINLOG_VERIFY_CHECKSUM=0
    log "WARN: mysqlbinlog 不在 PATH（BACKUP_MYSQLBINLOG_BIN=${BACKUP_MYSQLBINLOG_BIN}）⇒ 归档无法被 binlog 层校验。"
fi
if [[ "${BINLOG_FLAVOUR}" != "mysql" ]]; then
    log "WARN: mysqlbinlog 非 MySQL 血统/缺失 ⇒ 本次归档只做 gzip/解密级校验，"
    log "WARN: 撕裂与'torn binlog'这类缺陷检不出来（PITR 的可用性因此**未经证明**）。"
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
    --hex-blob
    --default-character-set=utf8mb4
)
# --set-gtid-purged=OFF 只有 MySQL 血统认识（MariaDB 的 mysqldump 会当成未知选项直接失败）
# ⇒ 按探测结果带，不硬写。
if [[ "${GTID_PURGED_SUPPORTED}" -eq 1 ]]; then
    mysqldump_args+=( --set-gtid-purged=OFF )
else
    log "NOTE: 当前 mysqldump 不支持 --set-gtid-purged，已跳过（MariaDB 血统的正常表现）。"
fi
# PITR：让 mysqldump 在头部注释里记录**与快照同一时刻**的 binlog 坐标。
# MySQL 8.0.26+ 用 --source-data=2（--master-data 是它的历史别名，8.4 起移除）；
# MariaDB 客户端只有 --master-data=2。二者都不可用而又开着 PITR ⇒ 硬失败：
# 事后单独 `SHOW MASTER STATUS` 拿到的位置晚于快照点，按它重放会**跳过
# 快照点→查询点之间的事件**（静默丢数据），绝不能拿来代替 dump 记录的坐标。
DUMP_COORD_FLAG=""
if [[ "${BACKUP_BINLOG_ARCHIVE}" == "true" ]]; then
    if [[ "${SOURCE_DATA_SUPPORTED}" -eq 1 ]]; then
        DUMP_COORD_FLAG="--source-data=2"
    elif [[ "${MASTER_DATA_SUPPORTED}" -eq 1 ]]; then
        DUMP_COORD_FLAG="--master-data=2"
    else
        log "ERROR: 开了 PITR（BACKUP_BINLOG_ARCHIVE=true）但当前 mysqldump 既不支持"
        log "       --source-data 也不支持 --master-data ⇒ 拿不到与快照一致的 binlog 坐标。"
        log "       二选一：换 MySQL 8 血统的 mysqldump（BACKUP_MYSQLDUMP_BIN / 换镜像），"
        log "       或显式关掉 PITR：BACKUP_BINLOG_ARCHIVE=false（那就只有全量快照点）。"
        if [[ ${DRY_RUN} -eq 1 ]]; then
            log "[DRY-RUN] PLAN-BLOCKED: 正式运行会在此处 exit 2 中止。"
            PLAN_BLOCKED=1
        else
            exit 2
        fi
    fi
    mysqldump_args+=( "${DUMP_COORD_FLAG}" )
    log "NOTE: 快照坐标来源开关 = ${DUMP_COORD_FLAG}（需 RELOAD 或 REPLICATION CLIENT 权限，且服务器已开 binlog）"
fi
mysqldump_args+=( "${MYSQL_DATABASE}" )

# ---------- dry-run：打印全部计划动作后退出（覆盖 dump/加密/redis/binlog/保留）----------
if [[ ${DRY_RUN} -eq 1 ]]; then
    if [[ ${ENCRYPT_ON} -eq 1 ]]; then
        log "[DRY-RUN] ${BACKUP_MYSQLDUMP_BIN} ${mysqldump_args[*]} | gzip -${BACKUP_COMPRESS_LEVEL} | openssl enc(AES-256) > ${BACKUP_FILE}"
    else
        log "[DRY-RUN] ${BACKUP_MYSQLDUMP_BIN} ${mysqldump_args[*]} | gzip -${BACKUP_COMPRESS_LEVEL} > ${BACKUP_FILE}"
    fi
    if [[ -n "${REDIS_HOST}" ]]; then
        if [[ ${ENCRYPT_ON} -eq 1 ]]; then
            log "[DRY-RUN] redis-cli BGSAVE && openssl enc(AES-256) ${REDIS_RDB_PATH} > ${BACKUP_DIR}/redis-${TIMESTAMP}.rdb.enc"
        else
            log "[DRY-RUN] redis-cli BGSAVE && cp ${REDIS_RDB_PATH} ${BACKUP_DIR}/redis-${TIMESTAMP}.rdb"
        fi
    fi
    if [[ "${BACKUP_BINLOG_ARCHIVE}" == "true" ]]; then
        log "[DRY-RUN] mysql --comments -e 'FLUSH BINARY LOGS'  （把 dump 时的 active binlog 封成完整文件）"
        log "[DRY-RUN] gzip ${MYSQL_BINLOG_DIR}/mysql-bin.[0-9]*（已完成的，跳过当时仍 active 的那个）" \
            "-> ${BACKUP_DIR}/binlogs/[.gz$([[ ${ENCRYPT_ON} -eq 1 ]] && echo '.enc')]"
        log "[DRY-RUN] 逐个校验：gzip -t / 解密 / ${BACKUP_MYSQLBINLOG_BIN} --verify-binlog-checksum（血统允许时）/ 解出字节数==源字节数"
        log "[DRY-RUN] 打印 PITR-COVERAGE（dump 坐标 ↔ 归档首末文件 ↔ 编号缺口）并写 <artifact>.manifest"
        log "[DRY-RUN] 覆盖不到 dump 坐标或存在缺口 ⇒ exit 3，不把有洞的归档报成好备份"
    fi
    log "[DRY-RUN] retention prune: families (*.sql.gz/.enc, *.rdb/.enc, mysql-bin.*.gz/.enc, *.manifest)"
    log "[DRY-RUN]   删除 mtime +${BACKUP_RETENTION_DAYS} 天、且每类超出 keep ${BACKUP_KEEP_COUNT} 的产物"
    log "[DRY-RUN] 信号渠道：BACKUP_ALERT_URL=${BACKUP_ALERT_URL:-（未设置）} textfile=${BACKUP_TEXTFILE_DIR}"
    if [[ ${PLAN_BLOCKED} -eq 1 ]]; then
        log "===== Dry-run complete: PLAN-BLOCKED（正式运行会在上面点名的地方失败）====="
        exit 1
    fi
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
    if ! { "${BACKUP_MYSQLDUMP_BIN}" "${mysqldump_args[@]}" 2>/tmp/mysqldump-err.log | gzip -"${BACKUP_COMPRESS_LEVEL}" | encrypt_stdin_to "${DUMP_PART}"; }; then
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
    if ! { "${BACKUP_MYSQLDUMP_BIN}" "${mysqldump_args[@]}" 2>/tmp/mysqldump-err.log | gzip -"${BACKUP_COMPRESS_LEVEL}" > "${DUMP_PART}"; }; then
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

# ---------- 从备份头部取出快照对应的 binlog 坐标（2026-10-31 新增）----------
# --source-data=2 / --master-data=2 会在 SQL 头部写注释：
#   -- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000021', MASTER_LOG_POS=157;
# 取不到就是"这批归档无从对齐"——绝不带着空坐标继续报成功。
dump_head() {
    # $1=备份文件 → 前 120 行明文到 stdout（加密则先解密，全程不落明文盘）
    if [[ ${ENCRYPT_ON} -eq 1 ]]; then
        openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
            -in "$1" 2>/dev/null | gunzip 2>/dev/null | head -120
    else
        gunzip -c "$1" 2>/dev/null | head -120
    fi
}
DUMP_BINLOG_FILE=""
DUMP_BINLOG_POS=""
HEAD_TEXT=$(dump_head "${BACKUP_FILE}" || true)
if [[ "${HEAD_TEXT}" =~ MASTER_LOG_FILE=\'([^\']+)\' ]]; then
    DUMP_BINLOG_FILE="${BASH_REMATCH[1]}"
fi
if [[ "${HEAD_TEXT}" =~ MASTER_LOG_POS=([0-9]+) ]]; then
    DUMP_BINLOG_POS="${BASH_REMATCH[1]}"
fi
if [[ "${BACKUP_BINLOG_ARCHIVE}" == "true" ]]; then
    if [[ -z "${DUMP_BINLOG_FILE}" || -z "${DUMP_BINLOG_POS}" ]]; then
        log "ERROR: 备份头部里找不到 CHANGE MASTER TO 坐标（flag=${DUMP_COORD_FLAG:-none}）。"
        log "       没有坐标就无法判断归档 binlog 覆没覆盖快照点 ⇒ 这次备份不判为 PITR 可用。"
        log "       排查：mysqldump 用户需要 RELOAD / REPLICATION CLIENT 权限，服务器需开 --log-bin。"
        log "       注意：全量快照文件**保留**在 ${BACKUP_FILE}（不要把已生成的唯一备份删掉），"
        log "       但它只能整库回滚到快照点，不能做时间点恢复。"
        exit 3
    fi
    log "PITR 快照坐标: file=${DUMP_BINLOG_FILE} pos=${DUMP_BINLOG_POS}（来源 ${DUMP_COORD_FLAG}）"
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

# ---------- binlog 归档（S4-3 + 2026-10-31 重写：撕裂/覆盖不足不得报成好备份）----------
# 顺序固定为：dump（拿坐标）→ FLUSH BINARY LOGS（把当时 active 的文件封成完整文件）
# → 只归档"已完整"的文件 → 逐个校验 → 算覆盖 → 写 manifest。任一步不达标准即 exit 3，
# 因为"有洞的 PITR"比"没有 PITR"更危险：运维会以为能恢复到任意时间点。
if [[ "${BACKUP_BINLOG_ARCHIVE}" == "true" ]]; then
    log "===== Binlog Archive (PITR) Start ====="
    MYSQL_CLIENT_BIN="${BACKUP_MYSQL_CLIENT_BIN:-mysql}"
    DUMP_FILE_NUM=""
    if [[ "${DUMP_BINLOG_FILE}" =~ ^mysql-bin\.0*([0-9]+)$ ]]; then
        DUMP_FILE_NUM=$((10#${BASH_REMATCH[1]}))
    fi

    # 凭据走 defaults-extra-file（0600、临时、EXIT 清理），不进进程参数——
    # 与 docker-compose.yml 里 mysql/redis healthcheck 的 MYSQL_PWD/REDISCLI_AUTH 同一规矩。
    MYSQL_DEFAULTS_FILE=$(mktemp "${TMPDIR:-/tmp}/backup-my-cnf.XXXXXX")
    chmod 600 "${MYSQL_DEFAULTS_FILE}"
    trap 'rc=$?; rm -f "${MYSQL_DEFAULTS_FILE:-}" 2>/dev/null; report_and_exit "${rc}"' EXIT
    cat > "${MYSQL_DEFAULTS_FILE}" <<EOF
[client]
host=${MYSQL_HOST}
port=${MYSQL_PORT}
user=${MYSQL_USER}
password=${MYSQL_PASSWORD}
connect-timeout=10
EOF

    if [[ ! -d "${MYSQL_BINLOG_DIR}" ]]; then
        log "ERROR: MYSQL_BINLOG_DIR=${MYSQL_BINLOG_DIR} 不存在（mysql-data 卷没挂进 backup 容器？）。"
        log "ERROR: BACKUP_BINLOG_ARCHIVE=true 却没有 binlog 源 ⇒ 本次 PITR 覆盖为 0，判为失败。"
        log "       修法见 docker-compose.yml 的 backup.volumes（- mysql-data:/var/lib/mysql:ro），"
        log "       或明确不需要 PITR：BACKUP_BINLOG_ARCHIVE=false。"
        exit 3
    fi
    shopt -s nullglob
    DATADIR_BINS=( "${MYSQL_BINLOG_DIR}"/mysql-bin.[0-9]* )
    shopt -u nullglob
    if [[ ${#DATADIR_BINS[@]} -eq 0 ]]; then
        log "ERROR: 在 ${MYSQL_BINLOG_DIR} 找不到任何 mysql-bin.*（binlog 未开 / 卷未只读挂载）。"
        log "ERROR: 全量快照已在 ${BACKUP_FILE}，但按运维要求（BACKUP_BINLOG_ARCHIVE=true）"
        log "ERROR: 本次没有可重放的归档 ⇒ 不判为好备份，exit 3。"
        exit 3
    fi

    BINLOG_OUT_DIR="${BACKUP_DIR}/binlogs"
    if [[ ! -d "${BINLOG_OUT_DIR}" ]]; then
        mkdir -p "${BINLOG_OUT_DIR}"
        log "Created binlog archive directory: ${BINLOG_OUT_DIR}"
    fi

    # ① 封口：把 dump 时仍在写的 active binlog 变成完整文件
    FLUSHED=0
    if command -v "${MYSQL_CLIENT_BIN}" >/dev/null 2>&1; then
        if "${MYSQL_CLIENT_BIN}" --defaults-extra-file="${MYSQL_DEFAULTS_FILE}" -N -B -e "FLUSH BINARY LOGS;" >/dev/null 2>&1; then
            FLUSHED=1
            log "FLUSH BINARY LOGS 成功：${DUMP_BINLOG_FILE:-未知} 已封为完整文件，新的 active 文件开始写入。"
        else
            log "WARN: FLUSH BINARY LOGS 失败（用户需要 RELOAD 权限）。"
        fi
    else
        log "WARN: mysql 客户端不存在（BACKUP_MYSQL_CLIENT_BIN=${MYSQL_CLIENT_BIN}），无法 FLUSH BINARY LOGS。"
    fi

    # ② 服务端视角的文件清单（含每个文件此刻的字节数）：最后一个就是 active 文件
    SERVER_LOG_LIST=$("${MYSQL_CLIENT_BIN}" --defaults-extra-file="${MYSQL_DEFAULTS_FILE}" -N -B \
        -e "SHOW BINARY LOGS;" 2>/dev/null || true)
    ACTIVE_BIN=""
    declare -A SERVER_LOG_SIZE=()
    while IFS=$'\t' read -r lname lsize lenc; do
        [[ "${lname}" =~ ^mysql-bin\.[0-9]+$ ]] || continue
        SERVER_LOG_SIZE["${lname}"]="${lsize}"
        ACTIVE_BIN="${lname}"
    done <<< "${SERVER_LOG_LIST}"
    if [[ -z "${ACTIVE_BIN}" ]]; then
        log "WARN: SHOW BINARY LOGS 拿不到清单（权限/连接问题），改按目录名排序推断 active 文件。"
        ACTIVE_BIN="$(basename "$(printf '%s\n' "${DATADIR_BINS[@]}" | sort | tail -1)")"
    fi
    log "当前 active binlog（不归档，因为它还在被写）：${ACTIVE_BIN}"

    if [[ "${FLUSHED}" -eq 0 && "${BACKUP_ALLOW_ACTIVE_BINLOG_COPY:-false}" != "true" ]]; then
        log "ERROR: 没能 FLUSH BINARY LOGS ⇒ dump 坐标所在文件 ${DUMP_BINLOG_FILE} 可能仍是 active，"
        log "ERROR: 直接复制它就是制造「下次不会被重试的撕裂副本」（本轮修掉的正是这个）。"
        log "ERROR: 要么给备份用户 RELOAD 权限，要么显式自担风险："
        log "ERROR:   BACKUP_ALLOW_ACTIVE_BINLOG_COPY=true（会复制 active 文件，并声明 PITR 上限未经证明）。"
        exit 3
    fi

    # ③ 逐个归档 + 校验（已存在的旧归档不再无脑跳过：先验，验不过就重做）
    verify_archive() {
        # $1=src 文件 $2=dest 归档 $3=期望解出字节数（可空）→ 0 好 / 非 0 坏
        local src="$1" dest="$2" want_size="${3:-}" tmp rc=0
        tmp=$(mktemp "${TMPDIR:-/tmp}/binlog-verify.XXXXXX") || return 1
        if [[ ${ENCRYPT_ON} -eq 1 ]]; then
            openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
                -in "${dest}" 2>/dev/null | gunzip -c > "${tmp}" 2>/dev/null || rc=1
        else
            gunzip -c "${dest}" > "${tmp}" 2>/dev/null || rc=1
        fi
        if [[ ${rc} -eq 0 ]]; then
            local got_size
            got_size=$(stat -c %s "${tmp}" 2>/dev/null || stat -f %z "${tmp}" 2>/dev/null || echo -1)
            local src_size
            src_size=$(stat -c %s "${src}" 2>/dev/null || stat -f %z "${src}" 2>/dev/null || echo -1)
            if [[ "${got_size}" != "${src_size}" ]]; then
                log "  VERIFY-FAIL 字节数不符：归档解出 ${got_size} != 源 ${src_size}（撕裂/截断）"
                rc=2
            elif [[ -n "${want_size}" && "${got_size}" != "${want_size}" ]]; then
                log "  VERIFY-FAIL 与 SHOW BINARY LOGS 报告的 ${want_size} 字节不符（解出 ${got_size}）"
                rc=3
            fi
            # MySQL 血统的 mysqlbinlog 才配做这一层：解析 + 校验 binlog 校验和
            if [[ ${rc} -eq 0 && "${BINLOG_FLAVOUR}" == "mysql" ]]; then
                if [[ "${BINLOG_VERIFY_CHECKSUM}" -eq 1 ]]; then
                    "${BACKUP_MYSQLBINLOG_BIN}" --verify-binlog-checksum "${tmp}" >/dev/null 2>&1 \
                        || { log "  VERIFY-FAIL mysqlbinlog --verify-binlog-checksum 不通过"; rc=4; }
                else
                    "${BACKUP_MYSQLBINLOG_BIN}" "${tmp}" >/dev/null 2>&1 \
                        || { log "  VERIFY-FAIL mysqlbinlog 解析不通过"; rc=5; }
                fi
            fi
        else
            log "  VERIFY-FAIL gzip/解密读不出来"
        fi
        rm -f "${tmp}"
        return "${rc}"
    }

    ARCHIVED_NUMS=()
    ARCHIVED_NAMES=()
    ARCHIVE_VERIFIED=0
    ARCHIVE_REDONE=0
    VERIFY_UNPROVEN=0
    for src in "${DATADIR_BINS[@]}"; do
        base=$(basename "${src}")
        [[ "${base}" =~ ^mysql-bin\.[0-9]+$ ]] || continue
        num=$((10#${base#mysql-bin.}))
        if [[ "${FLUSHED}" -eq 1 && "${base}" == "${ACTIVE_BIN}" ]]; then
            log "Skip active binlog ${base}（flush 之后新开启的那个，仍在写入）"
            continue
        fi
        if [[ "${FLUSHED}" -eq 0 && "${base}" == "${ACTIVE_BIN}" && "${BACKUP_ALLOW_ACTIVE_BINLOG_COPY:-false}" == "true" ]]; then
            log "WARN: 正在复制仍处 active 状态的 ${base}（BACKUP_ALLOW_ACTIVE_BINLOG_COPY=true）"
            log "WARN:   它的尾部可能撕裂，PITR 上限不成立 ⇒ 本条归档计入 VERIFY_UNPROVEN。"
            VERIFY_UNPROVEN=$(( VERIFY_UNPROVEN + 1 ))
        fi
        if [[ ${ENCRYPT_ON} -eq 1 ]]; then
            dest="${BINLOG_OUT_DIR}/${base}.gz.enc"
        else
            dest="${BINLOG_OUT_DIR}/${base}.gz"
        fi
        if [[ -f "${dest}" ]]; then
            if verify_archive "${src}" "${dest}" "${SERVER_LOG_SIZE[$base]:-}"; then
                log "已存在且校验通过：${dest}（跳过，不重复堆叠）"
                ARCHIVED_NUMS+=( "${num}" )
                ARCHIVED_NAMES+=( "${base}" )
                ARCHIVE_VERIFIED=$(( ARCHIVE_VERIFIED + 1 ))
                continue
            fi
            log "WARN: 已存在的归档 ${dest} 校验不过 ⇒ 重新归档（原实现这里会永久跳过坏副本）"
            rm -f "${dest}"
        fi
        part="${dest}.part"
        if [[ ${ENCRYPT_ON} -eq 1 ]]; then
            if ! { gzip -c -"${BACKUP_COMPRESS_LEVEL}" "${src}" | encrypt_stdin_to "${part}"; }; then
                log "ERROR: binlog 归档失败（gzip/openssl）for ${src}"
                rm -f "${part}"
                exit 3
            fi
        else
            if ! gzip -c -"${BACKUP_COMPRESS_LEVEL}" "${src}" > "${part}"; then
                log "ERROR: binlog gzip 失败 for ${src}"
                rm -f "${part}"
                exit 3
            fi
        fi
        mv "${part}" "${dest}"
        if ! verify_archive "${src}" "${dest}" "${SERVER_LOG_SIZE[$base]:-}"; then
            log "ERROR: 刚写出的归档 ${dest} 校验不过 ⇒ 判为失败，不留半成品"
            rm -f "${dest}"
            exit 3
        fi
        ARCHIVED_NUMS+=( "${num}" )
        ARCHIVED_NAMES+=( "${base}" )
        ARCHIVE_REDONE=$(( ARCHIVE_REDONE + 1 ))
    done
    [[ ${ENCRYPT_ON} -eq 1 && "${BINLOG_FLAVOUR}" != "mysql" ]] && VERIFY_UNPROVEN=$(( VERIFY_UNPROVEN + 1 ))
    if [[ "${BINLOG_FLAVOUR}" != "mysql" ]]; then
        log "WARN: 本次归档**未经 MySQL binlog 解析校验**（mysqlbinlog 血统=${BINLOG_FLAVOUR}）。"
        log "WARN:   证据只到「能解密 + gunzip 不报错 + 解出字节数等于源文件」为止。"
    fi

    # ④ 覆盖算式：dump 坐标所在文件必须在归档里，且 [dump_num .. 最大归档号] 无缺口
    COVERAGE_OK=1
    COVER_FIRST=""; COVER_LAST=""; GAPS=""
    if [[ ${#ARCHIVED_NUMS[@]} -gt 0 ]]; then
        SORTED_NUMS=( $(printf '%s\n' "${ARCHIVED_NUMS[@]}" | sort -n) )
        COVER_FIRST="${SORTED_NUMS[0]}"
        COVER_LAST="${SORTED_NUMS[$((${#SORTED_NUMS[@]} - 1))]}"
        declare -A NUM_SEEN=()
        for n in "${ARCHIVED_NUMS[@]}"; do NUM_SEEN["${n}"]=1; done
        if [[ -z "${DUMP_FILE_NUM}" ]]; then
            log "ERROR: 拿不到 dump 文件号（${DUMP_BINLOG_FILE:-空}）⇒ 无法计算覆盖。"
            COVERAGE_OK=0
        else
            [[ -n "${NUM_SEEN[${DUMP_FILE_NUM}]:-}" ]] \
                || { log "ERROR: dump 坐标所在文件 ${DUMP_BINLOG_FILE} 没有被归档 ⇒ 从快照点到第一个归档之间存在空洞。"; COVERAGE_OK=0; }
            for (( n=DUMP_FILE_NUM; n<=COVER_LAST; n++ )); do
                [[ -n "${NUM_SEEN[${n}]:-}" ]] || GAPS="${GAPS}${n} "
            done
            [[ -z "${GAPS}" ]] || { log "ERROR: 归档编号在 ${DUMP_FILE_NUM}..${COVER_LAST} 区间内缺口：${GAPS}（binlog 被过期删掉了？binlog-expire-logs-seconds vs BACKUP_RETENTION_DAYS）"; COVERAGE_OK=0; }
        fi
    else
        log "ERROR: 一个 binlog 都没归档成功 ⇒ PITR 覆盖为空。"
        COVERAGE_OK=0
    fi
    log "PITR-COVERAGE dump_position=${DUMP_BINLOG_FILE:-?}:${DUMP_BINLOG_POS:-?} archived_first=mysql-bin.$(printf '%06d' "${COVER_FIRST:-0}") archived_last=mysql-bin.$(printf '%06d' "${COVER_LAST:-0}") archived_files=${#ARCHIVED_NUMS[@]} gaps=${GAPS:-none} active_skipped=${ACTIVE_BIN:-none} flush=${FLUSHED} verify_unproven=${VERIFY_UNPROVEN}"
    log "PITR-REPLAYABLE-UNTIL: 可重放到 FLUSH 时刻（$(date '+%F %T')）；${ACTIVE_BIN:-active 文件} 里在那之后的事件不在本次归档内，下一次备份才会覆盖。"
    if [[ ${COVERAGE_OK} -ne 1 ]]; then
        log "ERROR: 覆盖不成立 ⇒ 本次备份不判为好备份（exit 3）。全量快照仍在 ${BACKUP_FILE}。"
        exit 3
    fi

    # ⑤ manifest：把坐标/归档/校验和落到运维和 restore 脚本都会读的地方
    MANIFEST_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${TIMESTAMP}.manifest"
    ARTIFACT_SHA=$(sha256sum "${BACKUP_FILE}" 2>/dev/null | cut -d' ' -f1)
    [[ -n "${ARTIFACT_SHA}" ]] || ARTIFACT_SHA=$(openssl dgst -sha256 "${BACKUP_FILE}" 2>/dev/null | awk '{print $NF}')
    {
        echo "artifact=${BACKUP_FILE}"
        echo "artifact_sha256=${ARTIFACT_SHA:-unknown}"
        echo "encrypted=${ENCRYPT_ON}"
        echo "database=${MYSQL_DATABASE}"
        echo "dump_binlog_file=${DUMP_BINLOG_FILE}"
        echo "dump_binlog_pos=${DUMP_BINLOG_POS}"
        echo "coord_flag=${DUMP_COORD_FLAG:-none}"
        echo "flushed=${FLUSHED}"
        echo "active_binlog_skipped=${ACTIVE_BIN:-none}"
        echo "archived_binlogs=${ARCHIVED_NAMES[*]}"
        echo "mysqlbinlog_flavour=${BINLOG_FLAVOUR}"
        echo "mysqldump_flavour=${DUMP_FLAVOUR}"
        echo "mysqlbinlog_verified=$([[ "${BINLOG_FLAVOUR}" == "mysql" ]] && echo yes || echo no)"
        echo "covered_first=mysql-bin.$(printf '%06d' "${COVER_FIRST:-0}")"
        echo "covered_last=mysql-bin.$(printf '%06d' "${COVER_LAST:-0}")"
        echo "backup_finished_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    } > "${MANIFEST_FILE}"
    log "Manifest 写出：${MANIFEST_FILE}（restore 用它核对坐标与覆盖）"
    log "Archived ${#ARCHIVED_NUMS[@]} binlog file(s)（新做 ${ARCHIVE_REDONE}、复用已验证 ${ARCHIVE_VERIFIED}）into ${BINLOG_OUT_DIR}"
    log "===== Binlog Archive Complete (coverage OK) ====="
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
# manifest（2026-10-31 新增产物：不清就会永久堆积；孤儿 manifest 一并清）
prune_family "manifest" '*.manifest'

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
