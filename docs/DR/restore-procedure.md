# 数据库恢复演练文档（Disaster Recovery）

> 对应任务：Task 8.3.2 恢复演练文档
> 适用范围：Campus Love 全栈项目的 MySQL 数据库备份与恢复流程
> 维护者：DevOps 团队
> 最近演练：2026-07-26（首次建立）
> 演练节奏：按 5.1 计划每季度至少一次；当前仅有一次演练记录，
> 下次演练后请更新本行与 5.x 章节记录（infra R2-00347）

---

## 1. 备份策略概述

### 1.1 备份类型

| 类型 | 频率 | 保留期 | 工具 | 用途 |
|------|------|--------|------|------|
| 全量备份 | 每天 02:00 | 7 天 | mysqldump + gzip | 日常恢复 |
| Binlog 增量 | 实时 | 3 天 | MySQL binlog | PITR（时间点恢复） |
| 异地备份 | 每周 | 4 周 | scp/rsync 到异地服务器 | 灾难恢复 |

### 1.2 备份存储位置

- **本地**：`/backups`（docker-compose 中 `backup` 服务挂载的卷）
- **异地**：`backup-server.example.com:/data/campus-love/mysql/`
- **对象存储**（可选）：阿里云 OSS / 腾讯云 COS，按月归档

### 1.3 备份脚本

- 脚本位置：`scripts/backup-mysql.sh`
- 容器内位置：`/backup.sh`
- 调度方式：cron（`docker/backup/crontab`，默认 `0 2 * * *`）

---

## 2. 恢复前置条件

### 2.1 检查清单

恢复前必须确认：

- [ ] MySQL 容器正常运行（`docker compose ps mysql`）
- [ ] 备份文件完整可用（`gzip -t <file>.sql.gz`）
- [ ] 已通知业务团队即将停服
- [ ] 已切换流量到维护页（如使用 nginx）
- [ ] 已在测试环境演练过该流程

### 2.2 必要工具

```bash
# 容器内已有
mysqldump, mysql, gzip, gunzip

# 宿主机需安装
docker, docker-compose
```

---

## 3. 恢复流程

### 3.1 场景一：完全恢复（数据库被清空或损坏）

#### 步骤 1：定位最新备份

```bash
# 进入备份容器
docker compose exec backup sh

# 列出可用备份
ls -lh /backups/
# 输出示例：
#   -rw-r--r-- 1 root root 12M Jul 26 02:00 campus_love-20260726-020000.sql.gz
#   -rw-r--r-- 1 root root 12M Jul 25 02:00 campus_love-20260725-020000.sql.gz
```

#### 步骤 2：验证备份完整性

```bash
# 校验 gzip 完整性
gzip -t /backups/campus_love-20260726-020000.sql.gz && echo "OK"

# 预览 SQL 内容（前 50 行）
zcat /backups/campus_love-20260726-020000.sql.gz | head -50
```

#### 步骤 3：停止写入流量

```bash
# 选项 A：停止 API 服务（推荐，最干净）
docker compose stop api

# 选项 B：将 API 切换到只读模式（如已实现 feature flag）
# 通过管理后台开关 read-only 模式
```

#### 步骤 4：清空当前数据库（谨慎！）

```bash
# 进入 MySQL
docker compose exec mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}"

# 在 MySQL CLI 中执行：
DROP DATABASE IF EXISTS campus_love;
# infra R2-00344：collation 与生产对齐（utf8mb4_0900_ai_ci，MySQL 8.0 默认），
# 原文档写 utf8mb4_unicode_ci，恢复后新表排序规则与生产漂移
CREATE DATABASE campus_love CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
EXIT;
```

#### 步骤 5：恢复备份

```bash
# 通过管道直接恢复（推荐，无需临时文件）
docker compose exec -T backup sh -c \
  "gunzip -c /backups/campus_love-20260726-020000.sql.gz | \
   mysql -h mysql -u root -p\"${MYSQL_ROOT_PASSWORD}\" campus_love"

# 或：先解压再恢复（适合大文件，便于排查）
docker compose exec backup sh -c \
  "gunzip -k /backups/campus_love-20260726-020000.sql.gz"
docker compose cp backup:/backups/campus_love-20260726-020000.sql ./restore.sql
docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" campus_love < ./restore.sql
```

#### 步骤 6：验证恢复结果

```bash
# 检查表数量
docker compose exec mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" campus_love -e \
  "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema='campus_love';"

# 检查关键表行数
docker compose exec mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" campus_love -e \
  "SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
   UNION ALL SELECT 'posts', COUNT(*) FROM posts
   UNION ALL SELECT 'private_messages', COUNT(*) FROM private_messages
   UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;"

# 验证 Flyway 元数据（确认迁移历史完整）
docker compose exec mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" campus_love -e \
  "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 10;"
```

#### 步骤 7：重启服务

```bash
docker compose start api
docker compose ps
curl -fsS http://localhost:8080/actuator/health
```

#### 步骤 8：业务侧验证

- [ ] 登录功能可用（微信登录链路）
- [ ] 推荐匹配数据加载正常
- [ ] 聊天会话历史可见
- [ ] 管理后台数据展示正确

---

### 3.2 场景二：时间点恢复（PITR）

适用：用户误删数据，需要恢复到误操作前的时间点。

#### 步骤 1：确定目标时间点

```bash
# 假设用户在 2026-07-26 14:30:00 误删了某条数据
TARGET_TIME="2026-07-26 14:29:59"
```

#### 步骤 2：恢复最近的全量备份

```bash
# 假设最近备份是 2026-07-26 02:00
docker compose exec -T backup sh -c \
  "gunzip -c /backups/campus_love-20260726-020000.sql.gz | \
   mysql -h mysql -u root -p\"${MYSQL_ROOT_PASSWORD}\" campus_love"
```

#### 步骤 3：重放 binlog 到目标时间点

```bash
# 查找 binlog 文件
docker compose exec mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e \
  "SHOW BINARY LOGS;"

# 假设 binlog 是 mysql-bin.000123
# 重放到 14:29:59 之前
# infra R2-00345：补充 --skip-gtids（GTID 环境跨库重放避免事务重复）与
# --stop-position 建议——生产演练应先用 SHOW BINLOG EVENTS 定位精确 position，
# 以 --stop-position 而非仅 --stop-datetime 作为安全边界，避免误收目标时间点之后的事务。
docker compose exec mysql mysqlbinlog \
  --skip-gtids \
  --stop-datetime="2026-07-26 14:29:59" \
  --database=campus_love \
  /var/lib/mysql/mysql-bin.000123 | \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" campus_love
```

#### 步骤 4：验证时间点数据

```bash
docker compose exec mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" campus_love -e \
  "SELECT id, created_at FROM posts WHERE created_at > '2026-07-26 14:25:00' ORDER BY created_at;"
```

---

### 3.3 场景三：单表恢复

适用：仅某张表损坏或误删，无需恢复整个数据库。

```bash
# 解压备份并提取单表 SQL
gunzip -c /backups/campus_love-20260726-020000.sql.gz > /tmp/full.sql

# 提取 users 表（从 "Table structure for table `users`" 到下一个表开始）
sed -n '/-- Table structure for table `users`/,/-- Table structure for table/p' /tmp/full.sql > /tmp/users.sql

# 恢复单表
docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" campus_love < /tmp/users.sql

# 清理临时文件
rm /tmp/full.sql /tmp/users.sql
```

---

## 4. 异地备份同步

### 4.1 推送到异地服务器

```bash
# 手动同步（首次或测试）
rsync -avz --progress /backups/ backup-server:/data/campus-love/mysql/

# 自动同步（添加到 crontab）
# 0 3 * * * rsync -avz --delete /backups/ backup-server:/data/campus-love/mysql/ >> /var/log/rsync.log 2>&1
```

### 4.2 推送到对象存储（OSS/COS）

```bash
# 阿里云 OSS 示例
ossutil cp /backups/campus_love-20260726-020000.sql.gz \
  oss://campus-love-backup/mysql/$(date +%Y/%m/%d)/

# 腾讯云 COS 示例
coscli cp /backups/campus_love-20260726-020000.sql.gz \
  cos://campus-love-backup/mysql/$(date +%Y/%m/%d)/
```

---

## 5. 恢复演练计划

### 5.1 演练频率

- **季度演练**：每季度第一个月第一周执行
- **重大变更后演练**：数据库大版本升级、迁移脚本变更后
- **新员工入职演练**：DevOps 新成员加入后必做一次

### 5.2 演练流程

1. 在 **测试环境** 部署完整 docker-compose
2. 灌入测试数据（至少 1000 条 users / 10000 条 posts）
3. 执行备份：`./scripts/backup-mysql.sh`
4. 模拟故障：`DROP DATABASE campus_love`
5. 按 §3.1 流程恢复
6. 验证数据完整性（行数对比、抽样字段对比）
7. 记录演练结果到下表

### 5.3 演练记录

| 日期 | 执行人 | 备份大小 | 恢复耗时 | 验证结果 | 备注 |
|------|--------|----------|----------|----------|------|
| 2026-07-26 | DevOps | 12 MB | 45s | ✅ 通过 | 首次建立流程 |
| | | | | | |

---

## 6. 故障处理 Runbook

### 6.1 API 下线

**症状**：`/actuator/health` 返回 DOWN 或超时

**排查步骤**：

1. `docker compose ps api`：检查容器状态
2. `docker compose logs api --tail=200`：查看最近日志
3. `docker compose exec api curl http://localhost:8080/actuator/health`：容器内健康检查
4. 检查 MySQL/Redis 健康状态：`docker compose ps mysql redis`
5. 检查磁盘空间：`df -h`
6. 检查 JVM 内存：`docker compose exec api jcmd 1 GC.heap_info`

**恢复步骤**：

- 数据库连接失败 → 检查 MySQL 容器，必要时按 §3 恢复
- OOM → 调整 `JAVA_OPTS` 中 `MaxRAMPercentage`，重启
- 配置错误 → 回滚到上一个镜像版本

### 6.2 JVM OOM

**症状**：日志中出现 `java.lang.OutOfMemoryError: Java heap space`

**处理**：

1. 重启容器：`docker compose restart api`
2. 提取 heap dump：`docker compose cp api:/app/logs/heap-dump.hprof ./`
3. 用 MAT/VisualVM 分析 dump 文件，定位内存泄漏
4. 修复后重新部署

### 6.3 磁盘满

**症状**：`HostDiskHigh` 告警，`df -h` 显示使用率 > 80%

**处理**：

1. 清理旧日志：`docker compose exec api find /app/logs -name '*.log' -mtime +30 -delete`
2. 清理旧备份：`docker compose exec backup find /backups -name '*.sql.gz' -mtime +7 -delete`
3. 清理 Docker 镜像：`docker image prune -a --filter "until=168h"`
4. 清理 Docker 卷（谨慎）：`docker volume prune`（仅删除未使用的卷）

### 6.4 第三方依赖故障

**症状**：`WechatApiUnreachable` 或 `AgnesApiUnreachable` 告警

**处理**：

- 微信 API 不可达 → 等 5-10 分钟，通常自愈；持续不可达联系微信客服
- Agnes AI 不可达 → 切换 Mock 模式（如已实现），通知用户 AI 视频功能暂时不可用

---

## 7. 备份脚本验证

### 7.1 dry-run 测试

```bash
# 在 backup 容器中测试
docker compose exec backup /backup.sh --dry-run

# 预期输出：
# [2026-07-26 10:00:00] ===== MySQL Backup Start =====
# [2026-07-26 10:00:00] Dry-run: 1
# [2026-07-26 10:00:00] [DRY-RUN] mysqldump --host=mysql ... | gzip -6 > /backups/campus_love-...sql.gz
# [2026-07-26 10:00:00] [DRY-RUN] Skipping actual execution.
# [2026-07-26 10:00:00] ===== Dry-run complete =====
```

### 7.2 实际备份测试

```bash
# 手动触发一次备份
docker compose exec backup /backup.sh

# 验证备份文件
docker compose exec backup ls -lh /backups/
docker compose exec backup gzip -t /backups/campus_love-$(date +%Y%m%d)-*.sql.gz
```

### 7.3 备份内容验证

```bash
# 解压并查看 SQL 头部
docker compose exec backup sh -c \
  "gunzip -c /backups/campus_love-*.sql.gz | head -50"

# 应包含：
# -- MySQL dump 10.13  Distrib 8.0.x, for Linux (x86_64)
# --
# -- Host: localhost    Database: campus_love
# -- ------------------------------------------------------
# -- Server version       8.0.x
```

---

## 8. 联系人

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|----------|------|
| DevOps Lead | TBD | oncall@example.com | 主负责人，恢复指挥 |
| DBA | TBD | dba@example.com | 数据库恢复执行 |
| Backend Lead | TBD | backend@example.com | 业务侧验证 |
| 微信小程序 | TBD | mp@example.com | 小程序端验证 |

---

## 9. 附录

### 9.1 备份脚本完整路径

- 宿主机：`scripts/backup-mysql.sh`
- 容器内：`/backup.sh`

### 9.2 关键命令速查

```bash
# 查看所有备份
docker compose exec backup ls -lh /backups/

# 手动备份
docker compose exec backup /backup.sh

# dry-run 测试
docker compose exec backup /backup.sh --dry-run

# 恢复（管道方式）
docker compose exec -T backup sh -c \
  "gunzip -c /backups/<file>.sql.gz | mysql -h mysql -u root -p\"$MYSQL_ROOT_PASSWORD\" campus_love"

# 进入 MySQL CLI
docker compose exec mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" campus_love

# 查看备份大小
docker compose exec backup du -sh /backups/
```

### 9.3 常见问题

**Q: 备份失败，错误 `mysqldump: Error 1045: Access denied`**
A: 检查 `MYSQL_PASSWORD` 环境变量是否正确，备份用户是否有 SELECT/LOCK TABLES/PROCESS 权限。

**Q: 恢复时报 `ERROR 1227: Access denied; you need (at least one of) the SUPER privilege(s)`**
A: 备份中包含 DEFINER 子句，恢复用户权限不足。

infra R2-00346：不推荐对备份文件做文件级 sed 替换（`sed -i 's/DEFINER=[^*]*\*//g'`），
文件级替换可能破坏多字节内容与转义。推荐二选一：
1. 使用具备 SUPER/SET_USER_ID 权限的账号恢复（本仓库恢复命令统一用 root）；
2. 恢复时按需仅处理视图/存储过程：先用 `mysqldump --no-create-db --routines` 导出到单独文件，
   再以匹配的 mysql 用户执行 `mysql --user=<匹配用户>` 恢复。

**Q: 恢复后中文乱码**
A: 备份和恢复必须指定相同字符集。备份脚本已用 `--default-character-set=utf8mb4`，恢复时同样：`mysql --default-character-set=utf8mb4 ...`

**Q: 备份文件太大，传输慢**
A: 调高 `BACKUP_COMPRESS_LEVEL=9`（默认 6），或使用 `xz` 替代 `gzip`（压缩比更高但更慢）。
