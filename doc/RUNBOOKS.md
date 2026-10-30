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

`HostDiskHigh`（需 `--profile monitoring` 起 node-exporter，否则该规则无数据源）：

1. `df -h`；本仓最容易占满的位置：`./uploads`（媒体）、`./logs`、`apps/api/target`、
   宿主 `./backups`（mysqldump 产物，含 gzip）。
2. 备份盘满 ⇒ 先扩保留策略而不是直接删：`scripts/backup-mysql.sh` 的保留份数在脚本内，
   删除前确认最新一份可用（见「备份与恢复」）。
3. 日志：确认 logback 的滚动与 `max-history` 生效，容器日志由 compose 的 `logging.options` 限制。

## 备份与恢复

权威步骤见 `doc/DEPLOYMENT.md`「备份与恢复（P3-D.3 + S4-3）」章节。要点：

- `backup` 服务受 `profiles: backup` 门控，`docker compose up -d` **不会**启动它，
  必须 `docker compose --profile backup up -d`（否则等于没有备份）。
- 备份落宿主 `./backups`（单机）。S4-3 后 `scripts/backup-mysql.sh` 已具备：
  可选 AES-256 加密（`BACKUP_ENCRYPT=true` + `BACKUP_ENCRYPTION_KEY`，缺密钥即硬失败不落明文）、
  binlog 归档（`BACKUP_BINLOG_ARCHIVE=true`，MySQL 已在 compose 开 `--log-bin`）⇒ **PITR 可用**、
  保留改为「窗口 `BACKUP_RETENTION_DAYS` + 最少份数 `BACKUP_KEEP_COUNT`」且覆盖 `.enc`/binlog 产物。
- ⚠️ 异地容灾仍非本脚本职责：脚本只清 `./backups`，**不会**过期任何异地副本；若用 rclone/S3
  同步，异地保留须在同步工具/桶策略里单独配置，否则异地副本无限增长。密钥只放部署机环境，绝不入库。
- 恢复前先验证备份可用：明文用 `gunzip -c <file> | mysql ...`、加密先
  `openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in <file>`，
  在影子库演练（含 PITR：先灌全量、再按备份头 `CHANGE MASTER TO` 坐标 `mysqlbinlog` 重放），
  演练记录写回本文件末尾的「演练日志」。

## 演练日志

| 日期 | 场景 | 结果 | 执行人 |
|---|---|---|---|
| — | 尚未做过恢复演练 | 待补 | — |
| 2026-10-30 | 待做：全量 + PITR（加密开启）恢复演练——S4-3 上线备份脚本后首次真实演练，记录耗时/是否成功/发现的问题 | ⬜ 待执行 | （填写执行人） |
