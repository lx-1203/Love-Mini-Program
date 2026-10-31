# 告警处置手册（Runbook）

本文件是 `docker/prometheus/rules/alert-rules.yml` 里所有 `runbook:` 字段的指向目标。

> 历史说明：本仓原先有两份手册，在提交 `aefd8a72`（2026-09-22）随 85 个文档一起被整体删除，
> 需要回看原文时用 `git show aefd8a72^:docs/DR/restore-procedure.md` 与
> `git show aefd8a72^:docs/CI-CD.md` 取回；而告警规则里的引用当时没同步，
> 于是"照着 runbook 做"这句话在三个月里一直指向不存在的文件。现集中到本文件，
> `tests/monitoring-wiring.spec.mjs` 会校验每条 `runbook:` 的目标真实存在。

## 通用第一步

```bash
docker compose ps                       # 哪个容器在重启/不健康
docker compose logs --tail=200 api      # 启动失败/异常栈
docker compose exec api sh -c 'wget -qO- http://localhost:8080/actuator/health'
```

## api-下线

`ApiDown` = `up{job="campuslove-api"} == 0` 持续 5 分钟。

1. 先分清是"进程没了"还是"抓不到"：`docker compose ps api`；`docker compose exec prometheus wget -qO- http://api:8080/actuator/prometheus | head`。
2. 抓取失败但服务正常 ⇒ 检查 `METRICS_SCRAPE_ALLOWLIST`（`SecurityConfig` 对 `/actuator/prometheus` 走来源 IP 白名单，留空即 fail-closed，Prometheus 会被拒）。
3. 进程反复重启 ⇒ 看启动日志里的 profile 校验与 Flyway 报错：
   - `未指定 Spring profile` → 必须显式 `SPRING_PROFILES_ACTIVE=real`（应用拒绝以未定义配置启动，见 `CampusLoveApplication.validateActiveProfile`）。
   - `Attempted to start mock profile` → 生产误用 mock，立即改回 real。
   - Flyway 校验失败（checksum mismatch / missing migration）→ 不要手工改已应用的迁移，按「备份与恢复」回滚到迁移前状态再重放。
4. 数据库/Redis 不可用：`app_health_status{status="DOWN"}` 会同时告警，按 jvm-oom 下一节的组件排查顺序处理连接与凭据。

## admin-下线

`AdminDown`（当前停用）依赖 blackbox-exporter 的 `probe_success`，本编排未部署该 exporter。
恢复办法：部署 blackbox-exporter → 取消 `docker/prometheus/prometheus.yml` 中 `blackbox-http` 抓取任务与规则注释。
在恢复之前，请直接对 admin 容器做 `wget -qO- http://admin:80/healthz` 的黑盒检查。

## 性能退化

`ApiLatencyHigh` / P99 类规则触发时：

1. 看是整体还是单端点：`http_server_requests_seconds_bucket` 按 `uri` 聚合。
2. 常见根因（本仓实测过的）：列表接口 N+1（循环内查库）、`findAll()` 后在内存过滤、
   定时任务与请求争抢连接池（`hikaricp_connections_pending`、`hikaricp_connections_active` 接近 `maximum-pool-size=20`）。
3. 外部调用是否被算进事务：交易/退款/内容安全等外呼必须落在事务之外（见
   `VipOrderTransactionBoundaryTest`、`ContentSecCheckTransactionBoundaryTest` 的事件序列断言）。
4. 处理完补一条回归用例，让同类退化能被测试抓住，而不是等告警。

## 错误率

`ApiHighErrorRate`（5xx 比例）触发时：

1. `sum by (uri, exception) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))` 找集中点。
2. 结合 traceId 查日志；`GlobalExceptionHandler` 在生产不回栈给前端，堆栈只落日志。
3. 若集中在支付/内容安全回调，优先怀疑第三方超时（外呼超时应远小于事务超时，否则连接池会被拖空）。

## jvm-oom

`JvmHeapHigh` / `jvm_gc_pause_seconds_count` 激增时：

1. `docker compose stats` 确认容器内存是否触顶（compose 对 api 设有 memory limit）。
2. 本仓已知的内存放大点：`CaffeineCacheConfig` 历史上只设 `expireAfterWrite` 未设 `maximumSize`；
   列表接口 `findAll()` 全表加载（含 TEXT/JSON 列）。
3. 需要堆转储时：`docker compose exec api jcmd 1 GC.heap_dump /tmp/dump.hprof`，
   转储文件不要提交进仓库（`*.hprof` 已在 .gitignore）。

## 磁盘满

`HostDiskHigh` / `HostMemoryHigh` / `HostCpuHigh` 依赖 node-exporter。2026-11-01 之前
它的抓取 job 在 `docker/prometheus/prometheus.yml` 里是注释状态 ⇒ 三条告警一次都不会响；
现在 job 与容器都常开（`docker compose up -d` 即有数据源），上线后用
`count(node_filesystem_avail_bytes) > 0` 与 `/targets` 里 `up{job="node-exporter"}==1`
自证一次即可（详见 `doc/DEPLOYMENT.md#启动监控告警`）。
告警在位不等于磁盘不会被写满（阈值 80%、`for: 5m`，突发写满仍会先撞到这里）：

1. `df -h`；本仓最容易占满的位置：`./uploads`（媒体）、`./logs`、`apps/api/target`、
   宿主 `./backups`（mysqldump 产物，含 gzip）。
2. 备份盘满 ⇒ 先扩保留策略而不是直接删：`scripts/backup-mysql.sh` 的保留份数在脚本内，
   删除前确认最新一份可用（见「备份与恢复」）。
3. 日志：确认 logback 的滚动与 `max-history` 生效，容器日志由 compose 的 `logging.options` 限制。
4. 备份失败的告警现在只剩一个前置：抓取已常开，但 `node_backup_*` 要 backup 容器
   真的在跑（`--profile backup`）才有值。没起 backup 时，`/backup/cron.log` 仍是唯一信号。
   `docker compose logs backup` 必须定期人肉看，或配 `BACKUP_ALERT_URL`（脚本直发
   Alertmanager v2 API）/ `BACKUP_TEXTFILE_DIR`（node-exporter 指标 → `BackupNeverCompleted`）。
   2026-10-31 起脚本还会在每次运行结束时把「最近一次成功时间」落进
   `./backups/node-textfile/backup.prom` 并打印 `BACKUP-STATUS` 行，便于 grep。

## 备份与恢复

权威步骤见 `doc/DEPLOYMENT.md`「备份与恢复（P3-D.3 + S4-3）」与「升级与回滚」章节。要点：

- `backup` 服务受 `profiles: backup` 门控，`docker compose up -d` **不会**启动它，
  必须 `docker compose --profile backup up -d`（否则等于没有备份）。
- 备份落宿主 `./backups`（单机）。`scripts/backup-mysql.sh` 具备：可选 AES-256 加密
  （缺密钥即硬失败不落明文）、binlog 归档（PITR）、「窗口 + 最少份数」保留且覆盖
  `.enc`/binlog/manifest 产物。
- ⚠️ **2026-10-31 明确没解决的**：备份镜像里的 `mysql-client~10.11` 是 MariaDB 血统，
  与 `mysql:8.0.39` 服务端不同血统。脚本现在会探测并在默认情况下**硬失败**，
  所以"profile 起来了" ≠ "备份成功了"。判据只有一条：
  `docker compose logs backup` 里出现 `BACKUP-STATUS=OK exit=0` 和
  `PITR-COVERAGE dump_position=… gaps=none`。
- 备份失败的可见性：三条独立出路，一条都没配时脚本每次都会打 `LOUDD WARN` 说明"失败无人知晓"：
  `BACKUP_ALERT_URL`（直发 Alertmanager v2 API）、`BACKUP_TEXTFILE_DIR`（node-exporter
  textfile 指标 `node_backup_*`；抓取 2026-11-01 起已常开，剩下的前置是 `--profile backup`
  本身——backup 不跑就没有写入端，`BackupNeverCompleted` 同样无序列）、
  `/backup/cron.log`（唯一"今天一定存在"的渠道，得有人看）。
- **恢复有代码了**：`scripts/restore-mysql.sh`（默认 dry-run，只打印计划与
  `PITR-COVERAGE(restore)` 位置算式；`--apply` 才写库；口令只走 `--defaults-extra-file`
  的 0600 临时文件；目标库默认影子库 `campus_love_drill`，指向 `campus_love` 直接拒绝）。
  它按 openssl 解密 → gunzip → mysqlbinlog 的正确顺序处理 `.gz.enc` 归档，
  并在覆盖有缺口时拒绝执行 PITR。
- ⚠️ 异地容灾仍非本脚本职责：脚本只清 `./backups`，**不会**过期任何异地副本；若用 rclone/S3
  同步，异地保留须在同步工具/桶策略里单独配置，否则异地副本无限增长。密钥只放部署机环境，绝不入库。

## 恢复演练（可执行版）

以前这里只有"照手抄命令做"的描述，2026-10-31 起换成可执行步骤：

```bash
# 0. .env 不会自动进 shell
set -a; . ./.env; set +a

# 1. 先跑一次带加密的备份（影子产物，不动生产）
docker compose --profile backup run --rm backup /backup.sh --dry-run   # 看计划与血统探测
docker compose --profile backup run --rm backup /backup.sh            # 真跑一次

# 2. 恢复演练到影子库：先 dry-run 看位置算式，再 --apply
scripts/restore-mysql.sh --artifact ./backups/campus_love-<TS>.sql.gz
scripts/restore-mysql.sh --artifact ./backups/campus_love-<TS>.sql.gz \
  --point-in-time "$(date '+%Y-%m-%d %H:%M:%S')" --target-schema campus_love_drill --apply

# 3. 自检 + 清理影子库
docker compose exec mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot campus_love_drill \
  -e "SELECT COUNT(*) FROM users;"'
```

演练必须记录：耗时（RTO 判据）、`PITR-COVERAGE` 那行的 gaps 是否为 none、
重放是否有报错、业务数据抽查结论。缺任何一项，这次演练等于没做。

## 演练日志

| 日期 | 场景 | 结果 | 执行人 |
|---|---|---|---|
| — | 尚未做过恢复演练 | 待补 | — |
| 2026-10-30 | 待做：全量 + PITR（加密开启）恢复演练——S4-3 上线备份脚本后首次真实演练，记录耗时/是否成功/发现的问题 | ⬜ 待执行 | （填写执行人） |
| 2026-10-31 | 恢复代码补上（`scripts/restore-mysql.sh`，dry-run + `--apply`）。**仍未演练**：本机 Docker 引擎停机，脚本的 `--apply` 路径一次都没跑过，只验证过 dry-run、覆盖缺口判定、生产库名拒绝、口令缺失拒绝四条分支（本机 bash 实测）。下一次演练请用上面的「恢复演练（可执行版）」步骤，并把结果写在下面 | ⬜ 待执行 | （填写执行人） |
