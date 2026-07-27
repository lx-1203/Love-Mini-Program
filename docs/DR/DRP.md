# 灾难恢复计划（Disaster Recovery Plan, DRP）

> 对应规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md` Task 9.2.4
> 适用范围：校园恋爱小程序（Campus Love）全栈系统灾难恢复
> 维护者：DevOps Lead & Release Manager
> 最近演练：2026-07-26（首次建立）
> 配套文档：`docs/DR/restore-procedure.md`（数据库恢复详细操作）、`docs/CI-CD.md`、`docs/release-checklist.md`、`docs/TROUBLESHOOTING.md`

---

## 0. 文档目的与范围

### 0.1 目的

本计划定义校园恋爱小程序在遭遇重大故障或灾难时的恢复流程，目标是：

- **RTO（Recovery Time Objective）**：≤ 4 小时（核心服务恢复）
- **RPO（Recovery Point Objective）**：≤ 24 小时（数据丢失上限）
- **MAO（Maximum Allowable Outage）**：≤ 8 小时（最大允许中断时长）

### 0.2 适用范围

| 范围 | 包含 | 不包含 |
|------|------|--------|
| 应用层 | Spring Boot API / Vue 客户端 / Admin 后台 | 第三方 SaaS（微信开放平台、阿里云 OSS） |
| 数据层 | MySQL / Redis / Elasticsearch / RabbitMQ | 用户本地数据（小程序缓存） |
| 基础设施 | Docker / Nginx / Prometheus / Grafana | DNS / CDN（由云厂商保障） |
| 业务场景 | 登录/匹配/聊天/社区/支付核心链路 | 客服系统、营销工具 |

### 0.3 灾难等级定义

| 等级 | 定义 | 影响 | 响应时间 | 决策层级 |
|------|------|------|----------|----------|
| **P0 - S1** | 全站不可用 | 所有用户无法使用 | ≤ 15 分钟 | CTO + DevOps Lead |
| **P0 - S2** | 核心功能不可用 | 登录/匹配/聊天任一不可用 | ≤ 30 分钟 | DevOps Lead + 业务负责人 |
| **P1 - S3** | 部分功能降级 | 非核心功能异常 | ≤ 2 小时 | 值班 SRE |
| **P2 - S4** | 单点故障 | 单个用户/小范围用户受影响 | ≤ 4 小时 | 值班 SRE |

---

## 1. 灾难场景分类与恢复策略

### 1.1 场景矩阵

| 场景 | 触发条件 | 影响 | 恢复策略 | RTO | RPO |
|------|----------|------|----------|-----|-----|
| 数据库损坏 | 磁盘故障/误删 | 全站数据丢失 | 全量备份 + binlog 恢复 | 2h | 1h |
| 数据库误删表 | DBA 误操作 | 单表数据丢失 | 单表恢复 + binlog | 1h | 0 |
| Redis 故障 | 进程崩溃/内存满 | 缓存失效，DB 压力上升 | 重启 + 持久化恢复 | 30min | 0 |
| API 服务崩溃 | OOM/异常退出 | 接口不可用 | 容器重启 + 镜像回滚 | 15min | 0 |
| 微信 API 故障 | 微信侧不可用 | 登录/支付中断 | 等待恢复 + 降级提示 | 依赖微信 | 0 |
| 机房断网 | 网络设备故障 | 全站不可用 | 异地容灾切换 | 4h | 24h |
| 勒索软件攻击 | 数据被加密 | 数据不可用 | 异地备份恢复 + 安全加固 | 4h | 24h |
| DDoS 攻击 | 流量攻击 | 服务不可用 | CDN 防护 + 黑洞路由 | 1h | 0 |
| 数据泄露 | 凭据被盗 | 用户隐私外泄 | 凭据轮换 + 取证 + 通报 | 24h | N/A |
| 配置误改 | 误改配置文件 | 服务异常 | 配置回滚 + 重启 | 30min | 0 |

### 1.2 恢复优先级

按业务关键性排序：

1. **P0 - 关键路径**：数据库 → Redis → API 服务 → 客户端配置
2. **P1 - 核心功能**：登录链路 → 推荐匹配 → 聊天消息 → 帖子社区
3. **P2 - 辅助功能**：签到 → VIP → 通知 → Admin 后台
4. **P3 - 后台任务**：清理任务 → 统计聚合 → 数据同步

---

## 2. RTO/RPO 目标与达成路径

### 2.1 当前能力基线

| 资源 | 备份频率 | 备份保留 | 恢复耗时 | RPO | RTO |
|------|----------|----------|----------|-----|-----|
| MySQL | 每天 02:00 全量 + binlog 实时 | 7 天本地 + 4 周异地 | 45s（12MB 测试） | 1h | 2h |
| Redis | RDB 每 5 分钟 + AOF 实时 | 7 天 | 2 分钟 | 5min | 30min |
| Elasticsearch | 每天 03:00 快照 | 14 天 | 30 分钟 | 24h | 1h |
| RabbitMQ | 队列持久化 | N/A（持久化队列） | 重启即恢复 | 0 | 5min |
| 应用镜像 | 每次 CI 构建 | 10 个版本 | 容器重启 30s | 0 | 15min |
| 静态资源 | 实时同步 CDN | 永久 | CDN 切换 | 0 | 5min |

### 2.2 RTO ≤ 4h 达成路径

```
[故障发生]
    ↓ (≤ 5min) 告警触发
[值班 SRE 响应]
    ↓ (≤ 15min) 故障分类与升级
[DevOps Lead 决策]
    ↓ (≤ 30min) 启动恢复预案
[执行恢复操作]
    ↓ (≤ 2h) 主备份恢复
[服务验证]
    ↓ (≤ 30min) 业务回归
[流量切回]
    ↓ (≤ 30min) 全量恢复
[复盘]
```

### 2.3 RPO ≤ 24h 达成路径

- **MySQL**：binlog 实时同步 → RPO ≤ 1h
- **Redis**：AOF 实时持久化 → RPO ≤ 5min
- **Elasticsearch**：每日快照 → RPO ≤ 24h（可接受）
- **对象存储**：版本化 + 跨区域复制 → RPO = 0

---

## 3. 备份策略总览

### 3.1 备份矩阵

| 资源 | 类型 | 频率 | 保留期 | 存储 | 验证频率 |
|------|------|------|--------|------|----------|
| MySQL | 全量 | 每天 02:00 | 7 天本地 + 4 周异地 | 本地 + 异地 + OSS | 月度 |
| MySQL | 增量（binlog） | 实时 | 3 天 | 本地 | 季度 PITR 演练 |
| Redis | RDB | 每 5 分钟 | 7 天 | 本地 | 月度 |
| Redis | AOF | 实时 | 7 天 | 本地 | 月度 |
| Elasticsearch | 快照 | 每天 03:00 | 14 天 | OSS | 季度 |
| 应用镜像 | CI 产物 | 每次构建 | 10 个版本 | 镜像仓库 | 每次部署 |
| 配置文件 | Git 版本 | 实时 | 永久 | Git + 异地 | 每次变更 |
| 密钥/凭据 | KMS | 每次轮换 | 90 天 | KMS + 备份柜 | 季度 |

### 3.2 备份存储位置

```
[主数据中心]
    ├── 本地磁盘（/backup）→ 7 天滚动
    ├── 异地服务器（rsync）→ 4 周滚动
    └── 对象存储（OSS/COS）→ 12 个月归档

[异地容灾中心]
    └── 实时复制（MySQL 主从 + Redis 集群）
```

### 3.3 备份完整性校验

每日 06:00 自动执行（cron）：

```bash
# 校验最新备份完整性
gzip -t /backup/campus_love-$(date +%Y%m%d)-*.sql.gz || alert "BACKUP_CORRUPT"

# 校验备份大小（与上日偏差不超过 50%）
TODAY_SIZE=$(stat -c%s /backup/campus_love-$(date +%Y%m%d)-*.sql.gz)
YESTERDAY_SIZE=$(stat -c%s /backup/campus_love-$(date +%Y%m%d -d yesterday)-*.sql.gz)
RATIO=$(echo "scale=2; $TODAY_SIZE / $YESTERDAY_SIZE" | bc)
if (( $(echo "$RATIO > 1.5 || $RATIO < 0.5" | bc -l) )); then
  alert "BACKUP_SIZE_ANOMALY ratio=$RATIO"
fi

# 校验备份可恢复（每月一次完整恢复测试）
if [ "$(date +%d)" = "01" ]; then
  /usr/local/bin/test-restore.sh
fi
```

---

## 4. 灾难恢复流程

### 4.1 通用响应流程（适用于所有场景）

```
[1. 故障检测]  →  [2. 告警通知]  →  [3. 故障分类]  →  [4. 决策升级]
                                                          ↓
[8. 复盘改进]  ←  [7. 验证恢复]  ←  [6. 执行恢复]  ←  [5. 启动预案]
```

#### 4.1.1 故障检测

- **主动监控**：Prometheus + Alertmanager（15s 抓取间隔）
- **被动反馈**：用户客服反馈、Admin 后台告警
- **第三方监控**：UptimeRobot 外部探测

#### 4.1.2 告警通知

按等级通知：

| 等级 | 通知方式 | 响应时间 | 升级链 |
|------|----------|----------|--------|
| S1 | 电话 + 短信 + 钉钉 | 5 分钟 | 值班 SRE → DevOps Lead → CTO |
| S2 | 短信 + 钉钉 | 15 分钟 | 值班 SRE → DevOps Lead |
| S3 | 钉钉 | 30 分钟 | 值班 SRE |
| S4 | 邮件 | 4 小时 | 工单系统 |

#### 4.1.3 故障分类与决策

值班 SRE 在 15 分钟内完成故障分类，无法判断时立即升级至 DevOps Lead。

### 4.2 场景 A：数据库完全损坏

详细操作步骤见 `docs/DR/restore-procedure.md` §3.1，本节仅列概要：

1. **停止写入流量**（30s）：`docker compose stop api`
2. **定位最新备份**（1min）：`ls -lh /backup/`
3. **校验备份完整性**（30s）：`gzip -t <file>.sql.gz`
4. **清空当前数据库**（1min）：`DROP DATABASE campus_love; CREATE DATABASE ...`
5. **恢复全量备份**（2-30min，视数据量）：`gunzip -c <file>.sql.gz | mysql ...`
6. **重放 binlog**（PITR 场景，5-30min）：`mysqlbinlog --stop-datetime=... | mysql ...`
7. **重启 API**（30s）：`docker compose start api`
8. **业务验证**（5min）：登录/匹配/聊天核心链路冒烟
9. **恢复流量**（1min）：移除维护页

**预期 RTO**：≤ 2 小时（10GB 数据规模）

### 4.3 场景 B：Redis 故障

#### 4.3.1 现象

- `/actuator/health` 中 redis 状态 DOWN
- 缓存命中率断崖式下跌
- 数据库 QPS 飙升

#### 4.3.2 处理步骤

```bash
# 1. 检查 Redis 容器状态
docker compose ps redis
docker compose logs redis --tail=100

# 2. 如内存满，先清理大 key
docker compose exec redis redis-cli --bigkeys

# 3. 重启 Redis
docker compose restart redis

# 4. 验证健康
docker compose exec redis redis-cli PING
curl http://localhost:8080/actuator/health

# 5. 预热缓存（可选）
curl -X POST http://localhost:8080/api/v1/admin/cache/warmup \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期 RTO**：≤ 30 分钟

### 4.4 场景 C：API 服务崩溃

#### 4.4.1 现象

- `/actuator/health` 返回 5xx 或超时
- 客户端请求大量 5xx

#### 4.4.2 处理步骤

```bash
# 1. 查看容器状态与日志
docker compose ps api
docker compose logs api --tail=200

# 2. 如 OOM，提取 heap dump
docker compose cp api:/app/logs/heap-dump.hprof ./

# 3. 重启 API
docker compose restart api

# 4. 验证健康
curl http://localhost:8080/actuator/health

# 5. 如重启失败，回滚到上一个镜像版本
docker compose pull api:v1.0.0-previous
docker compose up -d api

# 6. 流量观察 5 分钟，确认稳定
watch -n 5 'curl -s http://localhost:8080/actuator/health'
```

**预期 RTO**：≤ 15 分钟

### 4.5 场景 D：微信 API 故障

#### 4.5.1 现象

- 登录接口返回 `WECHAT_API_ERROR`
- 微信支付回调失败
- 微信小程序模板消息推送失败

#### 4.5.2 处理步骤

1. **确认微信侧故障**：访问 [微信开放平台状态页](https://mp.weixin.qq.com/cgi-bin/readtemplate?t=resource/openstatus)
2. **启用降级模式**：
   - 登录：返回友好提示「微信登录暂时不可用，请稍后重试」
   - 支付：暂停新订单，已有订单保留 30 分钟
   - 推送：消息进入队列，微信恢复后重试
3. **等待微信恢复**：通常 5-30 分钟自愈
4. **故障后处理**：
   - 重放队列中的待推送消息
   - 通知用户补发重要通知

**预期 RTO**：依赖微信恢复时间（项目侧响应 ≤ 5 分钟）

### 4.6 场景 E：机房断网/硬件故障

#### 4.6.1 现象

- 全站不可达
- 监控告警全红

#### 4.6.2 处理步骤

1. **启动异地容灾**（决策耗时 ≤ 30 分钟）：
   ```bash
   # 在异地容灾中心执行
   docker compose -f docker-compose.dr.yml up -d
   ```
2. **DNS 切换**：将 `api.campuslove.com` 指向异地 IP（TTL 5 分钟）
3. **从异地备份恢复数据**：
   - MySQL：最近一次异地备份（≤ 24h 前）
   - Redis：从 RDB 恢复（≤ 5min 前）
4. **服务验证**：核心链路冒烟
5. **流量切回主中心**（主中心恢复后）：
   - 主中心重新同步数据（异步追赶）
   - 灰度切回（10% → 50% → 100%）

**预期 RTO**：≤ 4 小时
**预期 RPO**：≤ 24 小时

### 4.7 场景 F：数据泄露事件

#### 4.7.1 现象

- 安全监控告警异常访问
- 用户反馈收到钓鱼邮件
- 第三方安全研究员通报

#### 4.7.2 处理步骤

1. **立即隔离**（≤ 30 分钟）：
   - 撤销可能泄露的凭据（JWT Secret、DB 密码、API Key）
   - 封禁可疑 IP 段
   - 关闭未授权访问入口
2. **取证分析**（≤ 4 小时）：
   - 提取访问日志、应用日志
   - 定位泄露范围（哪些用户、哪些字段）
   - 保留证据链
3. **通报合规**（≤ 24 小时）：
   - 按《个人信息保护法》要求通报网信办
   - 通知受影响用户（站内信 + 短信）
   - 发布安全公告
4. **修复加固**（≤ 7 天）：
   - 修复漏洞
   - 增加安全防护（WAF/IDS）
   - 完善审计日志

**预期 RTO**：≤ 24 小时（隔离 + 取证）
**预期 RPO**：N/A（数据已外泄，无法恢复）

---

## 5. 异地容灾方案

### 5.1 容灾架构

```
[主数据中心 - 北京]                    [异地容灾中心 - 上海]
├── API × 3 副本                       ├── API × 3 副本（待命）
├── MySQL Master                       ├── MySQL Slave（只读）
├── Redis Master                       ├── Redis Replica
├── Elasticsearch Cluster              ├── Elasticsearch Replica
├── 对象存储（OSS 北京）                ├── 对象存储（OSS 上海，跨区域复制）
└── 监控告警                           └── 监控告警（独立部署）
```

### 5.2 数据同步策略

| 资源 | 同步方式 | 延迟 | 切换策略 |
|------|----------|------|----------|
| MySQL | 主从异步复制 | ≤ 1s | 提升从库为主库 |
| Redis | 主从同步复制 | ≤ 100ms | 切换至副本 |
| Elasticsearch | 跨集群复制（CCR） | ≤ 5s | 切换至副本索引 |
| 对象存储 | 跨区域复制 | ≤ 1min | CDN 切换至副本桶 |

### 5.3 容灾切换流程

1. **决策**（≤ 30 分钟）：DevOps Lead 决定是否切换
2. **DNS 切换**（≤ 5 分钟）：更新解析至异地 IP
3. **数据库提升**（≤ 5 分钟）：将异地从库提升为主库
4. **应用启动**（≤ 5 分钟）：异地 API 容器拉起
5. **流量验证**（≤ 15 分钟）：核心链路冒烟
6. **公告**（≤ 5 分钟）：通知用户故障恢复

**总切换时间**：≤ 1 小时

### 5.4 容灾演练

- **频率**：每半年一次完整切换演练
- **方式**：在测试环境模拟主中心故障，验证异地切换流程
- **验收标准**：RTO ≤ 4h，RPO ≤ 24h

---

## 6. 故障沟通机制

### 6.1 内部沟通

#### 6.1.1 故障通告模板

```
【故障通告】{故障等级} - {故障简述}
时间：{YYYY-MM-DD HH:mm:ss}
等级：{S1/S2/S3/S4}
影响：{受影响功能/用户范围}
原因：{初步判断}
当前状态：{正在处理/已恢复/待观察}
预计恢复：{预计时间}
负责人：{姓名 + 联系方式}
下次更新：{时间}
```

#### 6.1.2 沟通渠道

- **S1/S2**：电话会议 + 钉钉群 + 状态页
- **S3**：钉钉群 + 状态页
- **S4**：工单系统

### 6.2 外部沟通

#### 6.2.1 用户公告

通过以下渠道发布：
- 小程序内公告（首页 Banner）
- 微信公众号推送
- 官方微博
- 状态页（status.campuslove.com）

#### 6.2.2 公告模板

```
【服务异常公告】

尊敬的用户：

我们注意到 {功能} 在 {时间} 出现异常，影响了 {范围} 的使用。

我们正在紧急修复中，预计将于 {时间} 前恢复。

给您带来的不便，我们深表歉意。如有疑问，请联系客服。

校园恋爱小程序团队
{时间}
```

### 6.3 监管通报

按《网络安全法》《个人信息保护法》要求，重大故障（S1/S2）需在 24 小时内向网信办通报：

- 故障发生时间与持续时长
- 影响范围与用户数
- 原因分析
- 应对措施
- 后续改进计划

---

## 7. 恢复验证清单

### 7.1 技术验证

- [ ] `/actuator/health` 返回 200 + status=UP
- [ ] 所有组件状态 UP（db/redis/elasticsearch/rabbitmq）
- [ ] 关键接口冒烟通过：
  - [ ] `POST /api/v1/auth/wechat`（登录）
  - [ ] `GET /api/v1/recommendations`（推荐）
  - [ ] `GET /api/v1/messages`（消息列表）
  - [ ] `POST /api/v1/matches/swipe`（喜欢）
  - [ ] `GET /api/v1/posts`（帖子列表）
- [ ] Prometheus 指标恢复正常（QPS/P99/错误率）
- [ ] Grafana 面板无红色告警

### 7.2 业务验证

- [ ] 测试账号可正常登录
- [ ] 推荐列表可加载 ≥ 10 条
- [ ] 可发送一条文本消息
- [ ] 可右滑喜欢一个用户
- [ ] 可发帖并查看
- [ ] Admin 后台可登录并查看 Dashboard

### 7.3 数据一致性验证

```sql
-- 关键表行数与故障前对比
SELECT 'users' AS tbl, COUNT(*) FROM users
UNION ALL SELECT 'posts', COUNT(*) FROM posts
UNION ALL SELECT 'private_messages', COUNT(*) FROM private_messages
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;

-- 最新数据时间戳
SELECT MAX(created_at) FROM posts;
SELECT MAX(created_at) FROM private_messages;
```

### 7.4 性能验证

- [ ] 推荐 P99 < 2s
- [ ] 聊天 P99 < 1s
- [ ] 错误率 < 0.5%
- [ ] CPU 使用率 < 70%
- [ ] 内存使用率 < 80%

---

## 8. 灾难恢复演练计划

### 8.1 演练类型

| 类型 | 频率 | 范围 | 参与者 |
|------|------|------|--------|
| 桌面推演 | 每季度 | 流程梳理 | DevOps + 业务 |
| 半实战演练 | 每半年 | 测试环境 | DevOps + SRE |
| 全实战演练 | 每年 | 生产环境（非高峰时段） | 全员 |

### 8.2 演练计划

#### 8.2.1 季度桌面推演

- 选择一个灾难场景（如数据库损坏）
- 团队围读流程文档，模拟执行
- 记录流程中的歧义、缺失、改进点
- 更新 DRP 文档

#### 8.2.2 半年半实战演练

- 在测试环境注入故障（如 `DROP DATABASE`）
- 值班 SRE 按流程恢复
- 记录 RTO/RPO 实际值
- 与目标对比，差距分析

#### 8.2.3 年度全实战演练

- 选择非业务高峰时段（如周日 03:00）
- 在生产环境模拟局部故障（如单节点宕机）
- 验证自动切换与人工干预效果
- 全员复盘，输出改进项

### 8.3 演练记录

| 日期 | 类型 | 场景 | 参与者 | RTO 实际 | RPO 实际 | 是否达标 | 改进项 |
|------|------|------|--------|----------|----------|----------|--------|
| 2026-07-26 | 桌面推演 | 数据库损坏 | DevOps | N/A | N/A | N/A | 首次建立 |
| | | | | | | | |

---

## 9. 应急联系人

### 9.1 内部团队

| 角色 | 姓名 | 主要联系方式 | 备用联系方式 | 职责 |
|------|------|--------------|--------------|------|
| DevOps Lead | TBD | oncall@example.com | 138-xxxx-xxxx | 恢复指挥 |
| DBA | TBD | dba@example.com | 138-xxxx-xxxx | 数据库恢复 |
| Backend Lead | TBD | backend@example.com | 138-xxxx-xxxx | 业务侧验证 |
| Frontend Lead | TBD | frontend@example.com | 138-xxxx-xxxx | 客户端验证 |
| 安全负责人 | TBD | security@example.com | 138-xxxx-xxxx | 安全事件响应 |
| 法务联系人 | TBD | legal@example.com | 138-xxxx-xxxx | 监管通报 |
| 公关联系人 | TBD | pr@example.com | 138-xxxx-xxxx | 外部沟通 |

### 9.2 外部供应商

| 供应商 | 服务 | 联系方式 | SLA |
|--------|------|----------|-----|
| 阿里云/腾讯云 | 云服务器 | 工单 + 95187 | 99.95% |
| 微信开放平台 | 小程序登录/支付 | 工单系统 | 99.9% |
| 阿里云 OSS | 对象存储 | 工单 + 95187 | 99.999% |
| DNSPod | DNS 解析 | 工单 + 400-668-3366 | 99.99% |

### 9.3 监管机构

| 机构 | 通报条件 | 联系方式 |
|------|----------|----------|
| 国家网信办 | 用户数据泄露 | 12377 |
| 公安部网安局 | 重大网络安全事件 | 110 |
| 工信部 | 互联网信息服务重大故障 | 12300 |

---

## 10. 附录

### 10.1 关键命令速查

```bash
# === MySQL ===
docker compose exec mysql-backup ls -lh /backup/    # 查看备份
docker compose exec mysql-backup /usr/local/bin/backup-mysql.sh    # 手动备份
docker compose exec mysql-backup /usr/local/bin/backup-mysql.sh --dry-run    # 测试
docker compose exec -T mysql-backup sh -c \
  "gunzip -c /backup/<file>.sql.gz | mysql -h mysql -u root -p\"$MYSQL_ROOT_PASSWORD\" campus_love"    # 恢复

# === Redis ===
docker compose exec redis redis-cli PING            # 健康检查
docker compose exec redis redis-cli --bigkeys       # 查看大 key
docker compose exec redis redis-cli BGSAVE          # 手动 RDB
docker compose restart redis                        # 重启

# === API ===
docker compose ps api                               # 查看状态
docker compose logs api --tail=200 -f               # 实时日志
docker compose restart api                          # 重启
curl http://localhost:8080/actuator/health          # 健康检查

# === 容灾切换 ===
docker compose -f docker-compose.dr.yml up -d       # 启动异地
./scripts/dns-switch.sh dr                          # DNS 切换
```

### 10.2 备份脚本路径

- 宿主机：`scripts/backup-mysql.sh`
- 容器内：`/usr/local/bin/backup-mysql.sh`
- 调度配置：`docker/backup/crontab`
- 异地同步：`scripts/sync-backup-remote.sh`

### 10.3 监控告警阈值

| 指标 | 阈值 | 告警等级 |
|------|------|----------|
| API 错误率 | > 1% 持续 5min | S2 |
| API P99 | > 2s 持续 5min | S3 |
| 磁盘使用率 | > 80% | S3 |
| 磁盘使用率 | > 95% | S1 |
| 内存使用率 | > 85% 持续 10min | S3 |
| CPU 使用率 | > 90% 持续 10min | S3 |
| MySQL 连接数 | > 80% 持续 5min | S3 |
| Redis 内存 | > 90% | S2 |
| 健康检查失败 | 连续 3 次 | S1 |

### 10.4 相关文档索引

- 数据库恢复详细操作：`docs/DR/restore-procedure.md`
- CI/CD 流程：`docs/CI-CD.md`
- 发布检查清单：`docs/release-checklist.md`
- 灰度发布策略：`docs/GRADUAL-RELEASE.md`
- 故障排查手册：`docs/TROUBLESHOOTING.md`
- Admin 运营手册：`docs/ADMIN-GUIDE.md`
- 监控告警规则：`docker/prometheus/rules/alert-rules.yml`
- 部署配置：`docker-compose.yml`、`DEPLOYMENT.md`

### 10.5 文档维护

- **更新频率**：每次重大架构变更后、每次演练后
- **审核人**：DevOps Lead
- **批准人**：CTO
- **下次审核**：2026-10-26（季度审核）

### 10.6 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-07-26 | v1.0 | 首次建立完整 DRP | DevOps Lead |
| | | | |
