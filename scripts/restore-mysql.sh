#!/usr/bin/env bash
# ============================================================
# MySQL 恢复脚本（2026-10-31，item 7：本仓此前**没有任何恢复代码**）
# ============================================================
# 为什么要有这个文件：
#   doc/DEPLOYMENT.md 与 doc/RUNBOOKS.md 只有手抄命令，而手抄命令里有三处是跑不通的：
#     · `-p"$MYSQL_ROOT_PASSWORD"` / `-a "$REDIS_PASSWORD"`：shell 不会自动 source .env，
#       照抄的人拿到的是空口令；而且把口令写进进程参数违反本仓自己的规矩
#       （docker-compose.yml 的 mysql/redis healthcheck 专门用 MYSQL_PWD / REDISCLI_AUTH
#        就是为了口令不进 /proc/<pid>/cmdline）。
#     · `mysqlbinlog … ./backups/binlogs/mysql-bin.<NNNNNN>`：归档实际是
#       `.gz` / `.gz.enc`，那个裸文件名根本不存在 ⇒ 命令必然失败。
#     · 顺序：加密归档必须 **先解密再 gunzip**（本脚本按 openssl → gunzip → mysqlbinlog）。
#   现在恢复动作有一处可执行的落点，RUNBOOKS 的演练条目也从"描述"变成"能跑的脚本"。
#
# 默认 **DRY-RUN**：只打印计划 + 位置算式 + 前置检查，不连库、不写一行数据。
# 真正执行必须显式 `--apply`。
#
# ⚠️ 本脚本**在本机从未以 --apply 跑过任何库**（本机 Docker 引擎停机，且规则禁止
#   拿生产/开发库 campus_love 做实验）。它证明的是"恢复有一条可执行路径"，
#   不是"恢复已验证可用"。后者只有影子库演练成功才算数，见
#   doc/RUNBOOKS.md#演练日志（截至 2026-10-31 仍是 0 次）。
#
# 用法：
#   scripts/restore-mysql.sh --artifact ./backups/campus_love-20261031-020000.sql.gz \
#       [--point-in-time '2026-10-31 15:30:00'] \
#       [--target-schema campus_love_drill] [--apply]
#
# 凭据（只经 --defaults-extra-file 的临时 0600 文件传给 mysql/mysqlbinlog，不进参数）：
#   MYSQL_HOST (默认 127.0.0.1) / MYSQL_PORT (3306) / MYSQL_USER (root) / MYSQL_PASSWORD (必填)
#   BACKUP_ENCRYPTION_KEY      —— 恢复 .enc 产物时必填，缺失即硬失败
#   BACKUP_LIVE_SCHEMA         —— 被视为"生产库名"的名字（默认 campus_love）
#   RESTORE_BIN                / RESTORE_MYSQLBINLOG_BIN —— 指定二进制（血统自查同备份脚本）
#   RESTORE_ALLOW_MARIADB_BINLOG=true —— 允许用非 MySQL 血统的 mysqlbinlog（默认拒绝）
#
# 它不证明的事（务必读完再决定上线）：
#   1. 不证明备份内容在业务上正确（行数对得上≠钱对得上）；
#   2. 不证明耗时符合 RTO——没有任何计时读数；
#   3. 不证明 GTID/复制拓扑下的重放安全（本编排没配复制，dump 用 --set-gtid-purged=OFF）；
#   4. 不证明 MariaDB 血统 mysqlbinlog 能解析 MySQL 8 binlog（默认直接拒绝这条路径）；
#   5. 不触碰 Redis：RDB 恢复仍是文档里的手抄步骤（见 DEPLOYMENT「Redis 恢复」）；
#   6. 不校验外键顺序/字符集排序规则在服务端版本不一致时的可导入性（跨版本恢复唯一
#      可靠的判据是**真跑一次影子库**）。
# ============================================================

set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin/bin:${PATH}"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
BACKUP_LIVE_SCHEMA="${BACKUP_LIVE_SCHEMA:-campus_love}"
RESTORE_BIN="${RESTORE_BIN:-mysql}"
RESTORE_MYSQLBINLOG_BIN="${RESTORE_MYSQLBINLOG_BIN:-mysqlbinlog}"
RESTORE_ALLOW_MARIADB_BINLOG="${RESTORE_ALLOW_MARIADB_BINLOG:-false}"

ARTIFACT=""
MANIFEST=""
BINLOG_DIR=""
TARGET_SCHEMA="campus_love_drill"
POINT_IN_TIME=""
START_POS_OVERRIDE=""
APPLY=0
ALLOW_LIVE=0
SKIP_CHECKSUM=0
TMP_FILES=()

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*"; exit 1; }

cleanup() {
    local rc=$?
    local f
    for f in "${TMP_FILES[@]:-}"; do rm -f "${f}" 2>/dev/null || true; done
    [[ -n "${CNF_FILE:-}" ]] && rm -f "${CNF_FILE}" 2>/dev/null || true
    exit "${rc}"
}

usage() {
    cat <<'EOF'
Usage: restore-mysql.sh --artifact FILE [options]
  --artifact PATH              备份产物：.sql.gz 或 .sql.gz.enc（必填）
  --manifest PATH              元数据文件（默认找 <artifact>.manifest）
  --binlog-dir PATH            binlog 归档目录（默认 <artifact 所在目录>/binlogs）
  --target-schema NAME         目标库名（默认 campus_love_drill 影子库）
  --point-in-time 'DATETIME'   恢复到该时刻（需要 PITR 归档；格式 YYYY-MM-DD HH:MM:SS）
  --start-position N           覆盖 dump 记录的起始位置（同一文件内）
  --apply                      真正执行。不给这个开关=只打印计划，什么都不做
  --allow-live-target          允许目标是 BACKUP_LIVE_SCHEMA（默认拒绝，防手滑）
  --skip-checksum              跳过与 manifest 的 sha256 比对（不推荐）
  --help                       本帮助
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --artifact) ARTIFACT="${2:-}"; shift 2 ;;
        --manifest) MANIFEST="${2:-}"; shift 2 ;;
        --binlog-dir) BINLOG_DIR="${2:-}"; shift 2 ;;
        --target-schema) TARGET_SCHEMA="${2:-}"; shift 2 ;;
        --point-in-time) POINT_IN_TIME="${2:-}"; shift 2 ;;
        --start-position) START_POS_OVERRIDE="${2:-}"; shift 2 ;;
        --apply) APPLY=1; shift ;;
        --allow-live-target) ALLOW_LIVE=1; shift ;;
        --skip-checksum) SKIP_CHECKSUM=1; shift ;;
        --help|-h) usage; exit 0 ;;
        *) usage; die "未知参数：$1" ;;
    esac
done

[[ -n "${ARTIFACT}" ]] || { usage; die "--artifact 必填"; }
[[ -f "${ARTIFACT}" ]] || die "备份产物不存在：${ARTIFACT}"
command -v "${RESTORE_BIN}" >/dev/null 2>&1 || die "mysql 客户端不存在（RESTORE_BIN=${RESTORE_BIN}）"
command -v "${RESTORE_MYSQLBINLOG_BIN}" >/dev/null 2>&1 || die "mysqlbinlog 不存在（RESTORE_MYSQLBINLOG_BIN=${RESTORE_MYSQLBINLOG_BIN}）"

ART_DIR=$(cd "$(dirname "${ARTIFACT}")" && pwd)
ART_NAME=$(basename "${ARTIFACT}")
[[ -n "${MANIFEST}" ]] || MANIFEST="${ARTIFACT}.manifest"
[[ -e "${MANIFEST}" ]] || MANIFEST="${ART_DIR}/${ART_NAME%.sql.gz*}.manifest"
[[ -n "${BINLOG_DIR}" ]] || BINLOG_DIR="${ART_DIR}/binlogs"

ENCRYPTED=0
case "${ART_NAME}" in
    *.enc) ENCRYPTED=1 ;;
esac

log "===== RESTORE PLAN (dry-run by default) ====="
log "artifact          : ${ARTIFACT}（encrypted=${ENCRYPTED}）"
log "manifest          : ${MANIFEST}$([[ -f "${MANIFEST}" ]] && echo "" || echo "  ← 不存在，坐标只能从 SQL 头部解析")"
log "binlog archive dir: ${BINLOG_DIR}$([[ -d "${BINLOG_DIR}" ]] && echo "" || echo "  ← 不存在 ⇒ PITR 不可用")"
log "target schema     : ${TARGET_SCHEMA}"
log "point-in-time     : ${POINT_IN_TIME:-（不指定 ⇒ 只回到全量快照点）}"
log "apply             : ${APPLY}（0 = 不执行任何写操作）"

# ---------- 口令绝不进进程参数：临时 0600 defaults 文件 ----------
[[ -n "${MYSQL_PASSWORD}" ]] || die "MYSQL_PASSWORD 未设置（本脚本不接受 -p 传参，也不猜 .env）"
CNF_FILE=$(mktemp "${TMPDIR:-/tmp}/restore-my-cnf.XXXXXX")
chmod 600 "${CNF_FILE}"
trap cleanup EXIT
cat > "${CNF_FILE}" <<EOF
[client]
host=${MYSQL_HOST}
port=${MYSQL_PORT}
user=${MYSQL_USER}
password=${MYSQL_PASSWORD}
connect-timeout=10
default-character-set=utf8mb4
EOF
log "credential mode   : --defaults-extra-file=${CNF_FILE}（0600，退出即删；口令不出现在进程参数）"

# ---------- mysqlbinlog 血统自查（与 backup 脚本同一套理由） ----------
binlog_flavour() {
    local v
    v=$("${RESTORE_MYSQLBINLOG_BIN}" --no-defaults --version 2>&1 | head -1) || v=""
    [[ -n "${v}" && "${v}" != *"[ERROR]"* ]] || v=$("${RESTORE_MYSQLBINLOG_BIN}" --version 2>&1 | head -1) || true
    case "$(printf '%s' "${v}" | tr '[:upper:]' '[:lower:]')" in
        *mariadb*) echo "mariadb" ;;
        *mysql*) echo "mysql" ;;
        *) echo "unknown" ;;
    esac
}
BINLOG_FLAVOUR=$(binlog_flavour)
log "mysqlbinlog       : ${RESTORE_MYSQLBINLOG_BIN} flavour=${BINLOG_FLAVOUR}"
if [[ "${BINLOG_FLAVOUR}" != "mysql" && -n "${POINT_IN_TIME}" ]]; then
    if [[ "${RESTORE_ALLOW_MARIADB_BINLOG}" == "true" ]]; then
        log "WARN: 用非 MySQL 血统的 mysqlbinlog 重放 MySQL 8 binlog —— 事件类型/校验和可能解析不了。"
        log "WARN:   已按 RESTORE_ALLOW_MARIADB_BINLOG=true 自担风险继续。"
    else
        log "要么指对二进制（RESTORE_MYSQLBINLOG_BIN=…），要么明确自担风险 RESTORE_ALLOW_MARIADB_BINLOG=true。"
        die "mysqlbinlog 血统=${BINLOG_FLAVOUR} 不可信（MariaDB 的 mysqlbinlog 解析不了 MySQL 8 的 binlog 事件）。"
    fi
fi

# ---------- 解密/gunzip 管道（顺序固定：openssl → gunzip → 消费方） ----------
open_artifact() {
    if [[ ${ENCRYPTED} -eq 1 ]]; then
        [[ -n "${BACKUP_ENCRYPTION_KEY}" ]] || die "产物是 .enc 但 BACKUP_ENCRYPTION_KEY 未设置（绝不静默跳过解密）"
        openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "${ARTIFACT}" 2>/dev/null \
            | gunzip
    else
        gunzip -c "${ARTIFACT}"
    fi
}
open_archive() { # $1=归档文件（.gz / .gz.enc）→ stdout 原始 binlog 字节
    case "$1" in
        *.enc)
            [[ -n "${BACKUP_ENCRYPTION_KEY}" ]] || die "归档 ${1} 是 .enc 但没有 BACKUP_ENCRYPTION_KEY"
            openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "$1" 2>/dev/null | gunzip ;;
        *) gunzip -c "$1" ;;
    esac
}

# ---------- 坐标来源：manifest 优先，其次 SQL 头部注释 ----------
DUMP_FILE=""; DUMP_POS=""; MANIFEST_SHA=""; MANIFEST_ARCHIVED=""; MANIFEST_VERIFIED=""
if [[ -f "${MANIFEST}" ]]; then
    DUMP_FILE=$(grep -E '^dump_binlog_file=' "${MANIFEST}" | cut -d= -f2- || true)
    DUMP_POS=$(grep -E '^dump_binlog_pos=' "${MANIFEST}" | cut -d= -f2- || true)
    MANIFEST_SHA=$(grep -E '^artifact_sha256=' "${MANIFEST}" | cut -d= -f2- || true)
    MANIFEST_ARCHIVED=$(grep -E '^archived_binlogs=' "${MANIFEST}" | cut -d= -f2- || true)
    MANIFEST_VERIFIED=$(grep -E '^mysqlbinlog_verified=' "${MANIFEST}" | cut -d= -f2- || true)
    log "manifest 记录    : pos=${DUMP_FILE:-?}:${DUMP_POS:-?} binlog_verified=${MANIFEST_VERIFIED:-?}"
    log "manifest 归档清单: ${MANIFEST_ARCHIVED:-（空）}"
fi
if [[ -z "${DUMP_FILE}" || -z "${DUMP_POS}" ]]; then
    HEAD=$(open_artifact 2>/dev/null | head -60 || true)
    if [[ "${HEAD}" =~ MASTER_LOG_FILE=\'([^\']+)\' ]]; then DUMP_FILE="${BASH_REMATCH[1]}"; fi
    if [[ "${HEAD}" =~ MASTER_LOG_POS=([0-9]+) ]]; then DUMP_POS="${BASH_REMATCH[1]}"; fi
    [[ -n "${DUMP_FILE}" ]] && log "SQL 头部解析到的坐标: ${DUMP_FILE}:${DUMP_POS:-?}" \
        || log "WARN: SQL 头部没有 CHANGE MASTER TO ⇒ 这个产物不带 PITR 坐标（全量回滚仍然可用）"
fi
[[ -n "${START_POS_OVERRIDE}" ]] && DUMP_POS="${START_POS_OVERRIDE}" && log "起始位置被 --start-position 覆盖为 ${DUMP_POS}"

# ---------- 产物可读性 + 校验和（只读，dry-run 也做：这是"能不能用"的最小组合证据） ----------
if ! open_artifact >/dev/null 2>&1; then
    die "产物读不出来（解密或 gzip 失败）：${ARTIFACT}。这不算备份。"
fi
log "readability check : gunzip$([[ ${ENCRYPTED} -eq 1 ]] && echo '+decrypt') 通过（未落明文盘）"
if [[ ${ENCRYPTED} -eq 0 ]]; then
    gzip -t "${ARTIFACT}" 2>/dev/null || die "gzip -t 失败：${ARTIFACT}"
fi
if [[ -n "${MANIFEST_SHA}" && "${MANIFEST_SHA}" != "unknown" && ${SKIP_CHECKSUM} -eq 0 ]]; then
    GOT_SHA=""
    if command -v sha256sum >/dev/null 2>&1; then
        GOT_SHA=$(sha256sum "${ARTIFACT}" 2>/dev/null | cut -d' ' -f1) || true
    fi
    [[ -n "${GOT_SHA}" ]] || GOT_SHA=$(openssl dgst -sha256 "${ARTIFACT}" 2>/dev/null | awk '{print $NF}') || true
    [[ -n "${GOT_SHA}" ]] || die "算不出产物的 sha256（sha256sum 与 openssl 都没有）——宁可不恢复，也不要在没核对过产物的情况下恢复"
    if [[ "${GOT_SHA}" != "${MANIFEST_SHA}" ]]; then
        die "sha256 与 manifest 不符（manifest=${MANIFEST_SHA} 实际=${GOT_SHA}）⇒ 产物可能被动过/传坏了。"
    fi
    log "checksum          : 与 manifest 一致（${GOT_SHA:0:12}…）"
fi

# ---------- binlog 归档枚举 + 覆盖算式 ----------
ARCHIVES=()
if [[ -d "${BINLOG_DIR}" ]]; then
    shopt -s nullglob
    for f in "${BINLOG_DIR}"/mysql-bin.[0-9]*.gz "${BINLOG_DIR}"/mysql-bin.[0-9]*.gz.enc; do
        ARCHIVES+=( "$(basename "${f}")" )
    done
    shopt -u nullglob
    if [[ ${#ARCHIVES[@]} -gt 1 ]]; then
        mapfile -t ARCHIVES < <(printf '%s\n' "${ARCHIVES[@]}" | sort -t. -k2,2n)
    fi
fi
num_of() { # mysql-bin.000021[.gz][.enc] → 21（认不出就返回空，调用方负责判空）
    local b="${1#mysql-bin.}"
    b="${b%%.gz*}"
    [[ "${b}" =~ ^[0-9]+$ ]] || { printf ''; return; }
    printf '%s' "$((10#${b}))"
}
COVER_FIRST=""; COVER_LAST=""; GAP_LIST=""
if [[ ${#ARCHIVES[@]} -gt 0 ]]; then
    NUMS=()
    for a in "${ARCHIVES[@]}"; do n=$(num_of "${a}"); [[ -n "${n}" ]] && NUMS+=( "${n}" ); done
    [[ ${#NUMS[@]} -gt 0 ]] || die "归档目录里没有一个文件名可解析出编号：${BINLOG_DIR}"
    mapfile -t SORTED < <(printf '%s\n' "${NUMS[@]}" | sort -n)
    COVER_FIRST="${SORTED[0]}"; COVER_LAST="${SORTED[$((${#SORTED[@]} - 1))]}"
    declare -A SEEN=(); for n in "${NUMS[@]}"; do SEEN["$n"]=1; done
    if [[ -n "${DUMP_FILE}" ]]; then
        DUMP_NUM=$(num_of "${DUMP_FILE}")
        [[ -n "${DUMP_NUM}" ]] || die "dump 坐标文件名认不出编号：${DUMP_FILE}"
        [[ -n "${SEEN[$DUMP_NUM]:-}" ]] || GAP_LIST="${GAP_LIST}${DUMP_FILE}(缺失) "
        for (( n=DUMP_NUM; n<=COVER_LAST; n++ )); do [[ -n "${SEEN[$n]:-}" ]] || GAP_LIST="${GAP_LIST}${n} "; done
    fi
fi
log "archived files    : ${#ARCHIVES[@]} 个（${ARCHIVES[*]:-无}）"
# 位置算式：运维要在日志里读到这一行才知道"能恢复到哪"
printf -v COVER_LINE 'PITR-COVERAGE(restore) dump_position=%s:%s archived_first=mysql-bin.%06d archived_last=mysql-bin.%06d gaps=%s point_in_time=%s' \
    "${DUMP_FILE:-?}" "${DUMP_POS:-?}" "${COVER_FIRST:-0}" "${COVER_LAST:-0}" "${GAP_LIST:-none}" "${POINT_IN_TIME:-none}"
log "${COVER_LINE}"
if [[ ${#ARCHIVES[@]} -eq 0 ]]; then
    log "结论：没有 binlog 归档 ⇒ 只能整库回到全量快照点（PITR 不可用）。"
elif [[ -n "${GAP_LIST}" ]]; then
    log "结论：覆盖有缺口（${GAP_LIST}）⇒ **不要**用这套归档做 PITR，换更早/更晚的全量快照重来。"
else
    log "结论：dump 坐标到最后一个归档文件连续 ⇒ PITR 计划可执行$([[ -n "${POINT_IN_TIME}" ]] && echo "（目标时刻 ${POINT_IN_TIME}）" || echo "（未指定目标时刻 ⇒ 重放到归档末尾）")。"
fi

# ---------- 恢复后自检 SQL（--apply 才会跑） ----------
VERIFY_SQL='SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS posts FROM posts; SELECT MAX(id) AS max_user_id FROM users;'

log "steps (执行顺序)"
log "  1. 停写：由运维负责（docker compose stop api），本脚本不动其它服务"
log "  2. 建库：CREATE DATABASE IF NOT EXISTS \`${TARGET_SCHEMA}\`（本脚本**不会 DROP** 目标库里"
log "     的既有对象——往非空库里灌备份会得到一堆主键/建表冲突，那是「看起来恢复了」的假象；"
log "     要清库请运维显式 drop schema 后再跑）"
log "  3. 全量：${ARTIFACT} → [decrypt] → gunzip → ${RESTORE_BIN} --defaults-extra-file=… ${TARGET_SCHEMA}"
log "     （流首插入 SET SESSION sql_log_bin=0，避免恢复动作本身被写进 binlog 造成二次重放；"
log "      该语句需要 SUPER/SESSION_VARIABLES_ADMIN 权限，无权限时会报错——不要静默跳过）"
if [[ ${#ARCHIVES[@]} -gt 0 && -z "${GAP_LIST}" && -n "${DUMP_FILE}" ]]; then
    log "  4. 增量：逐个归档 [decrypt] → gunzip → 落成临时文件 → ${RESTORE_MYSQLBINLOG_BIN} --start-position=${DUMP_POS:-?}（仅第一个文件）$([[ -n "${POINT_IN_TIME}" ]] && echo " --stop-datetime='${POINT_IN_TIME}'") → mysql ${TARGET_SCHEMA}"
    log "     临时明文文件落在 \${TMPDIR:-/tmp}，退出即删；不要把解密后的 binlog 留在 ./backups"
else
    log "  4. 增量：跳过（无可用归档或覆盖不足）"
fi
log "  5. 自检：${VERIFY_SQL//$'\n'/}"
log "  6. 人工判定：行数/余额/订单状态对不对——脚本判不了，见文件头「它不证明的事」"

if [[ ${APPLY} -ne 1 ]]; then
    log "DRY-RUN 结束：以上动作**一件都没做**（没连库、没写数据）。要执行请加 --apply。"
    exit 0
fi

# ---------- 以下才是真执行路径 ----------
if [[ -n "${GAP_LIST}" ]]; then
    die "归档覆盖有缺口（${GAP_LIST}）⇒ 拒绝执行。用更早/更晚的全量快照重做，或只恢复到快照点（不带 --point-in-time）。"
fi
if [[ "${TARGET_SCHEMA}" == "${BACKUP_LIVE_SCHEMA}" && ${ALLOW_LIVE} -ne 1 ]]; then
    log "   换成 --target-schema campus_love_drill；明确知道自己在做什么时才加 --allow-live-target。"
    log "   演练成功后请把耗时/结果写回 doc/RUNBOOKS.md#演练日志。"
    die "目标库是 ${BACKUP_LIVE_SCHEMA}（生产/开发同名库），拒绝写入——本仓库的规矩是先在**影子库**演练。"
fi
if [[ "${TARGET_SCHEMA}" == "${BACKUP_LIVE_SCHEMA}" ]]; then
    log "⚠️⚠️ --allow-live-target：正在向 ${TARGET_SCHEMA} 写入。这一步不可逆。⚠️⚠️"
fi

mysql_do() { # $@ = 附加参数；stdin → 目标库
    "${RESTORE_BIN}" --defaults-extra-file="${CNF_FILE}" "$@"
}

log "===== APPLY: 全量恢复开始 ====="
mysql_do -e "CREATE DATABASE IF NOT EXISTS \`${TARGET_SCHEMA}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;" \
    || die "CREATE DATABASE 失败（连接/权限）"
{
    printf 'SET SESSION sql_log_bin=0;\n'
    open_artifact
} | mysql_do "${TARGET_SCHEMA}" || die "全量导入失败（看上面 mysql 的报错）"
log "全量导入完成：${TARGET_SCHEMA}"

if [[ ${#ARCHIVES[@]} -gt 0 && -z "${GAP_LIST}" && -n "${DUMP_FILE}" ]]; then
    log "===== APPLY: 增量重放开始 ====="
    DUMP_NUM=$(num_of "${DUMP_FILE}")
    first=1
    for a in "${ARCHIVES[@]}"; do
        [[ "$(num_of "${a}")" -ge "${DUMP_NUM}" ]] || continue
        plain="${TMPDIR:-/tmp}/restore-${a%%.gz*}.binlog"
        TMP_FILES+=( "${plain}" )
        open_archive "${BINLOG_DIR}/${a}" > "${plain}" || die "归档 ${a} 解密/gunzip 失败"
        args=( --defaults-extra-file="${CNF_FILE}" )
        [[ ${first} -eq 1 && -n "${DUMP_POS}" ]] && args+=( "--start-position=${DUMP_POS}" )
        [[ -n "${POINT_IN_TIME}" ]] && args+=( "--stop-datetime=${POINT_IN_TIME}" )
        first=0
        "${RESTORE_MYSQLBINLOG_BIN}" "${args[@]}" "${plain}" | mysql_do "${TARGET_SCHEMA}" \
            || die "重放 ${a} 失败（位置/权限/事件解析——别把它当成功）"
        rm -f "${plain}"
        log "已重放 ${a}"
    done
    log "===== APPLY: 增量重放结束 ====="
fi

log "===== APPLY: 恢复后自检 ====="
mysql_do "${TARGET_SCHEMA}" -t -e "${VERIFY_SQL}" || log "WARN: 自检 SQL 失败（表可能不叫 users/posts，人工核对）"
log "恢复动作完成。仍未证明的东西一件都没少：见文件头「它不证明的事」。"
log "把耗时、是否成功、发现的问题写进 doc/RUNBOOKS.md#演练日志。"
exit 0
