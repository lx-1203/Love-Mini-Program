# ADR-0010: 部署方案 - Docker Compose + 多服务编排

- **Status**: Accepted
- **Date**: 2026-07-26
- **Deciders**: DevOps、架构组、CTO
- **Tags**: deployment, docker, orchestration, operations, infrastructure

---

## Context and Problem Statement

校园恋爱小程序商业化发布涉及 10+ 个服务的部署与编排：

**应用服务**：
1. **API**（Spring Boot 3）：业务后端，JVM 进程
2. **Admin**（Vue 3 静态资源）：管理后台，nginx 托管
3. **Client H5**（uni-app 静态资源）：H5 预览（如需）

**基础设施服务**：
4. **MySQL 8**：主数据库
5. **Redis 7**：缓存与 Token 黑名单
6. **Prometheus**：指标采集
7. **Grafana**：监控面板
8. **Alertmanager**：告警路由
9. **Node Exporter**：主机指标采集
10. **db-backup**（cron sidecar）：MySQL 定时备份

**外部依赖**：
- 微信开放平台 API
- 阿里云 OSS / 腾讯云 COS
- Agnes AI 视频 API
- 短信服务
- 邮件服务

部署方案需考虑：

1. **环境一致性**：开发/测试/预发布/生产环境配置可复用
2. **资源利用率**：单服务器资源（建议 8C 16G）能跑下全部服务
3. **运维简便**：一键启停、日志聚合、健康检查
4. **故障恢复**：服务崩溃自动重启，数据持久化
5. **弹性扩展**：未来可平滑迁移到 K8s
6. **成本控制**：初期单机部署，避免 K8s 集群成本
7. **安全隔离**：数据库不暴露公网，仅内网通信

需在 Docker Compose、Kubernetes、裸机部署等方案间作出选型。

---

## Decision Drivers

- **团队规模**：DevOps 2 人，无专职 K8s 运维
- **初期成本**：单机部署成本 ≤ 800 元/月（云服务器）
- **部署频次**：每周 1-2 次发布，无需高频滚动
- **流量规模**：DAU 预估 5k-50k，单机可承载
- **可观测性**：必须内置监控与告警，无需额外搭建
- **数据安全**：数据库备份与恢复必须自动化
- **未来演进**：架构需可演进到 K8s，但前期不上 K8s
- **微信小程序合规**：服务器域名需 HTTPS，证书管理自动化

---

## Considered Options

### 方案 A：Docker Compose 单机多服务编排（**选定**）

- **编排工具**：Docker Compose v2.24+
- **部署形态**：单台云服务器（建议 8C 16G + 200GB SSD）
- **服务管理**：所有服务通过 `docker-compose.yml` 声明
- **网络**：自定义 bridge 网络（`campus-net`）
- **数据卷**：MySQL/Redis/Prometheus/Grafana 数据持久化到 named volume
- **健康检查**：每个服务配置 healthcheck
- **重启策略**：`unless-stopped` 或 `on-failure:5`

### 方案 B：Kubernetes（K8s）集群部署

- **集群**：自建 K8s 或云托管（ACK/EKS/GKE）
- **优势：**自动伸缩、滚动发布、声明式配置、生态丰富
- **劣势**：学习曲线陡、运维复杂、初期成本高（≥ 2000 元/月）

### 方案 C：裸机部署（systemd + nginx + MySQL 直装）

- **形态**：直接在服务器安装 Java/Node.js/MySQL/Redis/nginx
- **优势**：资源占用最低、性能最优
- **劣势**：环境不一致、扩展困难、运维靠脚本、回滚困难

### 方案 D：Docker Swarm

- **形态**：多机 Docker Swarm 集群
- **优势**：比 K8s 简单，原生 Docker 体验
- **劣势**：社区活跃度下降，生态工具少

### 方案 E：PaaS 平台（Heroku/Render/阿里云 SAE）

- **形态**：托管 PaaS 部署
- **优势**：零运维
- **劣势**：成本高、供应商锁定、自定义配置受限

---

## Pros and Cons of the Options

### 方案 A（Docker Compose）

| 优点 | 缺点 |
|------|------|
| ✅ 单文件声明全部服务，易维护 | ❌ 单机故障即全站不可用 |
| ✅ 一键启停：`docker compose up -d` | ❌ 不支持自动伸缩 |
| ✅ healthcheck + restart 自动恢复 | ❌ 跨机扩展需迁移到 Swarm/K8s |
| ✅ 数据卷持久化，备份简单 | ❌ 网络模型简单，无 service mesh |
| ✅ 与本地开发环境完全一致 | |
| ✅ 学习成本低，文档丰富 | |
| ✅ 可平滑迁移到 K8s（compose → kompose） | |

### 方案 B（K8s）

| 优点 | 缺点 |
|------|------|
| ✅ 自动伸缩与自愈 | ❌ 学习曲线陡，需专职 K8s 运维 |
| ✅ 滚动发布与回滚原生支持 | ❌ 集群成本 ≥ 2000 元/月 |
| ✅ 声明式配置，GitOps 友好 | ❌ 团队规模尚小，过度设计 |
| ✅ 生态丰富（Helm/IstIO/ArgoCD） | ❌ 微信小程序初期流量无需 K8s |

### 方案 C（裸机部署）

| 优点 | 缺点 |
|------|------|
| ✅ 性能最优，无虚拟化开销 | ❌ 环境不一致，"在我机器上能跑" |
| ✅ 资源占用最低 | ❌ 部署脚本复杂，回滚困难 |
| | ❌ 监控告警需从零搭建 |
| | ❌ 扩展到多机需重新设计 |

### 方案 D（Docker Swarm）

| 优点 | 缺点 |
|------|------|
| ✅ 多机扩展能力 | ❌ 社区活跃度下降 |
| ✅ 与 Compose 语法兼容 | ❌ 生态工具少，问题排查困难 |
| | ❌ 单机场景下与 Compose 无差异 |

### 方案 E（PaaS）

| 优点 | 缺点 |
|------|------|
| ✅ 零运维 | ❌ 成本高（按资源计费） |
| ✅ 自动伸缩 | ❌ 供应商锁定 |
| | ❌ 自定义 nginx/Redis 配置受限 |
| | ❌ 国内 PaaS 对微信小程序合规支持有限 |

---

## Decision

**选定方案 A：Docker Compose 单机多服务编排**

具体决策：

### 1. 编排文件

- **主文件**：`docker-compose.yml`（项目根目录）
- **profile**：`monitoring`（Prometheus/Grafana/Alertmanager/Node Exporter）按需启用
- **环境变量**：`.env` 文件注入敏感配置（不提交 Git，仅 `.env.example` 入库）

### 2. 服务清单

| 服务 | 镜像 | 端口暴露 | 数据卷 |
|------|------|----------|--------|
| mysql | mysql:8.0 | 内网 3306 | `mysql-data` |
| redis | redis:7-alpine | 内网 6379 | `redis-data` |
| api | 自构建（多阶段）| 公网 8080 | `api-uploads`、`api-logs` |
| admin | 自构建（nginx）| 公网 5177 | - |
| client | 自构建（nginx）| 公网 5173（可选） | - |
| prometheus | prom/prometheus | 内网 9090 | `prometheus-data` |
| grafana | grafana/grafana | 公网 3001 | `grafana-data` |
| alertmanager | prom/alertmanager | 内网 9093 | `alertmanager-data` |
| node-exporter | prom/node-exporter | 内网 9100 | - |
| backup | 自构建（cron）| - | `backup` |

### 3. 网络架构

```
公网 ── nginx (反向代理) ──┬── api:8080 (HTTPS)
                            ├── admin:5177 (HTTPS)
                            └── grafana:3001 (HTTPS, IP 白名单)

内网 campus-net ──┬── mysql:3306 (仅内网)
                  ├── redis:6379 (仅内网)
                  ├── prometheus:9090 (仅内网)
                  ├── alertmanager:9093 (仅内网)
                  └── node-exporter:9100 (仅内网)
```

### 4. 数据持久化

- **MySQL**：named volume `mysql-data`，每日 02:00 备份至 `backup` 卷并 rsync 至异地
- **Redis**：named volume `redis-data`，AOF 持久化（`appendonly yes`）
- **Prometheus**：named volume `prometheus-data`，保留 30 天
- **Grafana**：named volume `grafana-data`，含 dashboard 配置
- **API uploads**：named volume `api-uploads`，媒体文件分片存储

### 5. 健康检查与重启

- 每个服务配置 `healthcheck`（MySQL 用 `mysqladmin ping`，API 用 `/actuator/health`，Redis 用 `redis-cli ping`）
- 重启策略：`unless-stopped`（手动停止后不重启，崩溃后自动重启）
- 启动顺序：`depends_on` + `condition: service_healthy` 确保依赖就绪

### 6. 镜像构建

- **API**：多阶段构建（Maven build → JRE runtime），基础镜像 `eclipse-temurin:17-jre`
- **Admin**：多阶段构建（Node build → nginx static），基础镜像 `nginx:alpine`
- **Client H5**：多阶段构建（同 Admin）
- **Backup**：基于 `alpine` + `mysql-client` + `cron`

### 7. 环境分级

| 环境 | compose 文件 | 用途 |
|------|--------------|------|
| 本地开发 | `docker-compose.yml` | 一键启动全栈 |
| 测试 | `docker-compose.yml + docker-compose.test.yml` | 覆盖测试用配置 |
| 预发布 | `docker-compose.yml + docker-compose.staging.yml` | 生产镜像验证 |
| 生产 | `docker-compose.yml + docker-compose.prod.yml` | 真实流量 |

### 8. 未来演进路径

```
Docker Compose（当前）→ Docker Swarm（多机）→ Kubernetes（规模化）
```

- 当 DAU > 50k 或单机资源吃紧时，迁移到 Docker Swarm（多机）
- 当服务数 > 20 或需多区域部署时，迁移到 Kubernetes
- 迁移工具：`kompose convert` 将 compose 文件转为 K8s manifests

---

## Consequences

### 正面后果

- **环境一致**：开发/测试/生产环境使用相同 compose 文件，仅环境变量差异
- **一键部署**：`docker compose up -d` 启动全栈，新服务器初始化 ≤ 30 分钟
- **自动恢复**：服务崩溃自动重启，healthcheck 失败自动标记 unhealthy
- **监控内置**：Prometheus + Grafana + Alertmanager 开箱即用
- **备份自动化**：cron sidecar 每日备份 MySQL，无需手动操作
- **资源隔离**：每个服务独立容器，资源限制（CPU/memory）可配置
- **平滑迁移**：未来可使用 `kompose` 迁移到 K8s，无需重写部署逻辑

### 负面后果

- **单点故障**：单机宕机全站不可用，需配合异地备份与快速恢复演练
- **资源开销**：Docker 虚拟化开销 ~5-10% CPU/内存
- **存储膨胀**：镜像与数据卷占用磁盘，需定期清理（`docker system prune`）
- **网络复杂度**：跨容器通信需通过 service name，调试需 `docker exec` 进入
- **日志聚合**：默认 `docker logs`，需配合 Loki/ELK 实现集中式日志（后续优化）

### 风险与缓解

| 风险 | 缩解措施 |
|------|----------|
| 单机硬件故障 | 每日 MySQL 备份至异地 + 镜像仓库保存最近 3 个版本 + 文档化恢复流程（`docs/DR/restore-procedure.md`） |
| 数据丢失 | RPO ≤ 1 小时（binlog + 每日全量备份），RTO ≤ 2 小时 |
| Docker daemon 崩溃 | 配置 systemd 自动重启 Docker，监控 daemon 状态 |
| 镜像仓库故障 | 关键镜像同步至阿里云 ACR + Docker Hub 双仓库 |
| 端口冲突 | 严格管理端口分配，仅必要端口暴露公网 |
| 配置泄露 | `.env` 加入 `.gitignore`，CI 通过 secrets 注入 |
| 流量突增 | 配置 nginx 限流（limit_req_zone）+ Prometheus 告警 + 应急扩容脚本 |

---

## Compliance Note

- 本决策符合项目硬约束：所有服务可一键启停，与 monorepo 结构兼容
- `docker-compose.yml` 仅声明服务编排，敏感配置通过 `.env` 注入
- 数据卷持久化路径与项目硬约束 `uploads/{userId}/{yyyyMM}/{uuid}.{ext}` 一致
- 监控告警配置符合 `docs/DR/DRP.md` 灾备要求
- 部署流程符合 `docs/CI-CD.md` 与 `docs/release-checklist.md` 规范

---

## Related Documents

- [ADR-0001: 技术栈选型](./0001-technology-stack-selection.md)
- [ADR-0003: 数据库选型](./0003-database-mysql-utf8mb4.md)
- [ADR-0004: 缓存方案](./0004-cache-redis-cluster.md)
- [ADR-0009: Monorepo](./0009-monorepo-pnpm-workspace.md)
- `docker-compose.yml`、`.env.example`（具体配置）
- `apps/api/Dockerfile`、`apps/admin/Dockerfile`（镜像构建）
- `docs/CI-CD.md`（CI/CD 流水线）
- `docs/DR/DRP.md`、`docs/DR/restore-procedure.md`（灾备与恢复）
- `docs/release-checklist.md`（发布检查清单）
- `DEPLOYMENT.md`（部署手册）

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-07-26 | 首次提议，覆盖 10 个服务 | DevOps |
| 2026-07-26 | 评审通过，正式采纳 | 架构组 |
