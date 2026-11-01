#!/bin/sh
# ============================================================
# backup 容器的 ENTRYPOINT（2026-11-01，第六轮修复波 W3：items 2 与 3）
# ============================================================
# 为什么这段代码必须住在 entrypoint 而不是 command：
#   原来 alpine 装 bash/客户端 + 建运行账号 + chown 这套动作写在 docker-compose.yml 的
#   `command:` 里。而 `docker compose run <service> <命令>` 的语义是【用 <命令> 替换
#   service 的 command】（entrypoint 不动）——本仓文档给运维的正是
#   `docker compose --profile backup run --rm backup /backup.sh`，于是那条命令每次都把
#   安装段整个跳过：/backup.sh 的 shebang 是 `#!/usr/bin/env bash`，而 alpine 基础镜像
#   只有 busybox sh ⇒ "not found"，手动备份这条路从来跑不通。
#   同一个文件里 migrate 服务没这个毛病，因为它的 ENTRYPOINT 就是 flyway 可执行文件，
#   `run --rm migrate info` 只换子命令（见 doc/DEPLOYMENT.md「手动运行迁移」）。
#   把安装段搬进 entrypoint 之后，run 传什么参数都绕不过它——这是本文件存在的唯一理由。
#   判点：tests/deployment-config.spec.mjs I 段（文档里每条 `compose run <svc> <args>`
#   与被引用 service 的 entrypoint/command 分工对账）。
#
# 职责（按顺序）：
#   1. 装依赖：bash（脚本本体）、mysql-client/redis/gzip/openssl/tini
#   2. 建非 root 运行账号 backup（uid 固定 10001，见下）并 chown 它的可写目录
#   3. 按 BACKUP_CRON 生成 crontab
#   4. 【BackupNeverCompleted 的写入端前置】确保 textfile 目录存在、对 backup 账号可写，
#      并在第一次真实备份之前播种一份基线指标（last_success=0）
#   5. 降权 exec：有参数就 exec 参数（compose run 的手动触发），没参数就 exec crond
#
# uid 为什么钉死 10001：本容器要 chown 宿主 bind 目录（./backups 与 ./backups/node-textfile）。
#   busybox adduser 的 uid 由"下一个空闲 uid"决定，宿主上恰好存在 uid 1000 用户时，
#   目录属主会随重建镜像/换宿主而漂；钉死一个不与 alpine 基镜像（uid 0 与 1000 起）
#   冲突的号段，让"宿主目录属主 = backup 账号"这件事在任何宿主上都是同一个数。
#   代价：部署机的 ./backups 会被改成 10001:10001（每次启动重新 chown，可自愈）。
# ============================================================
set -eu

BACKUP_UID="${BACKUP_UID:-10001}"
BACKUP_USER="backup"
TEXTFILE_DIR="${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}"

log() { echo "[backup-entrypoint] $*"; }

# ---------- 1. 依赖 ----------
# 包名主版本随 alpine 3.19 仓库（infra #28：不装无上限的 latest）。
# mysql-client~10.11 是 MariaDB 血统这件事 compose 与本仓 scripts/backup-mysql.sh 都已
# 显式记录并做了血统探测，这里不改变那个结论。
apk add --no-cache bash openssl "mysql-client~10.11" "redis~7.2" gzip tini

# ---------- 2. 运行账号 + 可写目录 ----------
if ! id -u "${BACKUP_USER}" >/dev/null 2>&1; then
    adduser -D -H -u "${BACKUP_UID}" -s /sbin/nologin "${BACKUP_USER}"
fi

mkdir -p /etc/crontabs /backup /backups "${TEXTFILE_DIR}"
chown -R "${BACKUP_USER}:${BACKUP_USER}" /etc/crontabs /backup /backups
# textfile 目录单独点名：它虽然物理上在 ./backups 子目录里（上面 -R 顺带覆盖到），
# 但"顺带覆盖"依赖两条挂载的父子关系，一旦有人把 textfile 目录挪出 ./backups、
# 或把 BACKUP_TEXTFILE_DIR 指到别处，就会静默回到"cron 档写不进指标文件 ⇒
# BackupNeverCompleted 无序列 ⇒ 备份失败没人知道"的死告警形态。显式 chown 才判得了。
chown "${BACKUP_USER}:${BACKUP_USER}" "${TEXTFILE_DIR}"
chmod 775 "${TEXTFILE_DIR}"

# ---------- 3. crontab ----------
printf '%s /backup.sh >> /backup/cron.log 2>&1\n' "${BACKUP_CRON:-0 2 * * *}" > /etc/crontabs/backup
chown "${BACKUP_USER}:${BACKUP_USER}" /etc/crontabs/backup

# ---------- 4. 指标可见性自检 + 基线播种 ----------
# 写不进去就大声喊：否则 BackupNeverCompleted 会静默地"没有序列"，而 Prometheus
# 对空向量不评估 ⇒ 既不告警也不报错（本仓 2026-10-29/10-31 已因同一形态翻车三次）。
if [ -w "${TEXTFILE_DIR}" ] && [ -d "${TEXTFILE_DIR}" ]; then
    log "textfile 可写：${TEXTFILE_DIR}（node_backup_* 有落点）"
else
    log "LOUD: ${TEXTFILE_DIR} 不存在或不可写 ⇒ BackupNeverCompleted 今天仍然是一条死告警。"
    log "LOUD:   检查 compose 的 backup 挂载、BACKUP_TEXTFILE_DIR 与下面的 BACKUP_TEXTFILE_HINT。"
fi
# 目录必须是**真挂载点**：textfile 只有在 bind 生效时才是"backup 写、node-exporter 读"
# 的同一块宿主目录。写在容器自己的临时层里 = 指标永远没人抓 = 又是一条死告警，
# 而且这一次连"目录不可写"的报错都不会有。
if awk -v d="${TEXTFILE_DIR}" '$2==d{f=1} END{exit !f}' /proc/mounts 2>/dev/null; then
    log "textfile 目录是 bind 挂载点：${TEXTFILE_DIR}（与 node-exporter 共享宿主 ./backups/node-textfile）"
else
    log "LOUD: ${TEXTFILE_DIR} 不是挂载点 ⇒ node-exporter 抓不到这里写的指标。"
    log "LOUD:   检查 docker-compose.yml backup 服务的 volumes 第一项绑定；"
    log "LOUD:   这条链断掉的表现是 BackupNeverCompleted 恒无序列（既不告警也不报错）。"
fi
# 基线播种：第一次真实备份之前也要有序列。last_success=0 ⇒
#   BackupNeverCompleted（time()-node_backup_last_success_timestamp_seconds > 129600）
#   在容器起来 30 分钟后就成立——这正是它该说的："一份可用备份都还没有"。
# 只播种时间戳，不伪造 exit_code（node_backup_last_exit_code 留给脚本首次运行时写）。
if [ ! -f "${TEXTFILE_DIR}/backup.prom" ]; then
    seeded=0
    if [ -f /backups/.last_success ]; then
        seeded=$(cat /backups/.last_success 2>/dev/null || echo 0)
    fi
    {
        echo "# HELP node_backup_last_success_timestamp_seconds Epoch seconds of the last successful backup run."
        echo "# TYPE node_backup_last_success_timestamp_seconds gauge"
        echo "node_backup_last_success_timestamp_seconds ${seeded:-0}"
    } > "${TEXTFILE_DIR}/backup.prom.tmp"
    mv "${TEXTFILE_DIR}/backup.prom.tmp" "${TEXTFILE_DIR}/backup.prom"
    chown "${BACKUP_USER}:${BACKUP_USER}" "${TEXTFILE_DIR}/backup.prom"
    log "已播种基线指标 backup.prom（last_success=${seeded:-0}）：BackupNeverCompleted 从此有序列"
fi

# ---------- 5. 降权移交 ----------
# busybox su 的 -c 只接一条字符串，所以把 argv 逐个单引号包起来再交给它：
# 参数里带空格（`sh -c "…"`）或带 --dry-run 都不会被拆坏。
quote() {
    printf "'"
    printf '%s' "$1" | sed "s/'/'\\\\''/g"
    printf "'"
}
CMD=""
if [ "$#" -gt 0 ]; then
    for arg in "$@"; do
        [ -z "${CMD}" ] || CMD="${CMD} "
        CMD="${CMD}$(quote "${arg}")"
    done
else
    CMD="crond -f -l 8 -c /etc/crontabs"
fi
log "移交（以 ${BACKUP_USER} uid=$(id -u "${BACKUP_USER}") 身份）：${CMD}"
# tini 是 compose 里本来就装的（HEAD 的 command 装了它却没接上信号链，本次顺手接对）：
# 没有它，PID 1 是 su，docker stop 的 SIGTERM 不会转发给 crond/正在跑的备份，
# 只能等 grace period 后的 SIGKILL。找不到 tini 就退回直接 exec，绝不因为少一个
# 包把容器起不来。
TINI_BIN="$(command -v tini || true)"
if [ -n "${TINI_BIN}" ]; then
    # shellcheck disable=SC2086
    exec "${TINI_BIN}" -- su "${BACKUP_USER}" -s /bin/sh -c "exec ${CMD}"
fi
# shellcheck disable=SC2086
exec su "${BACKUP_USER}" -s /bin/sh -c "exec ${CMD}"
